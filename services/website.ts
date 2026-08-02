import { z } from "zod";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const websiteContentSchema = z.object({
  title: z.string().optional(),
  metaDescription: z.string().optional(),
  headings: z.array(z.string()),
  paragraphs: z.array(z.string()),
  links: z.array(z.string()),
  homePage: z.string(),
});

const FETCH_TIMEOUT_MS = 20_000;
// Keep a firm resource bound, but never fail an analysis just because a public
// document is large. The useful, semantic content is extracted from the
// available portion of the stream below.
const MAX_DOWNLOAD_BYTES = 5_000_000;
const MAX_REDIRECTS = 5;
const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; SalesBriefAI/1.0; +https://salesbrief.ai)",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchWebsiteContent(website: string) {
  const normalized = website.startsWith("http") ? website : `https://${website}`;
  console.info("[website-fetch] request", { url: normalized });
  const response = await fetchWithRedirects(normalized);
  const contentType = response.headers.get("content-type");
  console.info("[website-fetch] response", { url: response.url, status: response.status, contentType });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("The website blocked automated access (HTTP 403).");
    }
    throw new Error(`The website returned HTTP ${response.status}.`);
  }
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    throw new Error("The website did not return an HTML page.");
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_DOWNLOAD_BYTES) {
    console.info("[website-fetch] large response announced", { url: response.url, contentLength, downloadLimit: MAX_DOWNLOAD_BYTES });
  }

  const { html, bytesRead, truncated } = await readLimitedResponse(response);
  const semanticHtml = removeNonContentBlocks(html);
  const contentHtml = removePageChrome(semanticHtml);
  const titleMatch = semanticHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaDescriptionMatch = semanticHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || semanticHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);

  const headingMatches = Array.from(contentHtml.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi)).map((match) => stripHtml(match[2]));
  const paragraphMatches = Array.from(contentHtml.matchAll(/<p[^>]*>(.*?)<\/p>/gi)).map((match) => stripHtml(match[1]));
  const linkMatches = Array.from(contentHtml.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
  const headings = uniqueText(headingMatches, 24, 300);
  const paragraphs = uniqueText(paragraphMatches, 24, 1_200);

  const content = {
    title: titleMatch ? stripHtml(titleMatch[1]).slice(0, 300) : undefined,
    metaDescription: metaDescriptionMatch ? stripHtml(metaDescriptionMatch[1]).slice(0, 500) : undefined,
    headings,
    paragraphs,
    links: linkMatches.filter(Boolean).slice(0, 12),
    homePage: buildPrioritizedText(contentHtml, headings, paragraphs),
  };

  console.info("[website-fetch] content extracted", {
    titlePresent: Boolean(content.title),
    headingCount: content.headings.length,
    paragraphCount: content.paragraphs.length,
    linkCount: content.links.length,
    textLength: content.homePage.length,
    bytesRead,
    truncated,
  });

  return websiteContentSchema.parse(content);
}

async function fetchWithRedirects(initialUrl: string) {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    let response: Response;
    try {
      response = await fetch(currentUrl, {
        headers: FETCH_HEADERS,
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      const details = error instanceof Error ? { name: error.name, message: error.message, causeCode: getErrorCauseCode(error) } : { errorType: typeof error };
      console.error("[website-fetch] network failure", { url: currentUrl, ...details });
      if (error instanceof DOMException && error.name === "TimeoutError") {
        console.warn("[website-fetch] timeout", { url: currentUrl, timeoutMs: FETCH_TIMEOUT_MS });
        throw new Error("The website took too long to respond.");
      }
      throw new Error("The website could not be reached. Please try again later.");
    }

    const redirectDestination = response.headers.get("location");
    console.info("[website-fetch] fetch response", {
      url: currentUrl,
      status: response.status,
      redirectDestination,
      contentType: response.headers.get("content-type"),
    });

    if (response.status < 300 || response.status >= 400) {
      return response;
    }

    if (redirectCount === MAX_REDIRECTS) {
      throw new Error("The website redirected too many times.");
    }

    const location = redirectDestination;
    if (!location) {
      throw new Error("The website returned an invalid redirect.");
    }

    const redirectUrl = new URL(location, currentUrl).toString();
    const safety = await getPublicWebsiteUrlSafety(redirectUrl);
    if (!safety.allowed) {
      console.warn("[website-fetch] blocked redirect", { from: currentUrl, to: redirectUrl, reason: safety.reason });
      throw new Error("The website redirected to an unsupported address.");
    }
    console.info("[website-fetch] follow redirect", { from: currentUrl, to: redirectUrl, redirectCount: redirectCount + 1 });
    currentUrl = redirectUrl;
  }

  console.error("[website-fetch] exhausted redirect loop", { url: initialUrl, maxRedirects: MAX_REDIRECTS });
  throw new Error("The website could not be fetched.");
}

async function getPublicWebsiteUrlSafety(value: string): Promise<{ allowed: boolean; reason?: string }> {
  const url = new URL(value);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || isPrivateAddress(url.hostname)) {
    return { allowed: false, reason: "unsupported protocol, credentials, or private IP" };
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    return { allowed: false, reason: "local hostname" };
  }

  try {
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return { allowed: false, reason: "private or missing DNS address" };
    }
    return { allowed: true };
  } catch (error) {
    console.error("[website-fetch] redirect DNS lookup failed", { hostname, error: error instanceof Error ? error.message : "unknown error" });
    return { allowed: false, reason: "DNS lookup failed" };
  }
}

function getErrorCauseCode(error: Error) {
  const cause = error.cause;
  return cause && typeof cause === "object" && "code" in cause ? String(cause.code) : undefined;
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return first === 0 || first === 10 || first === 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168 || first >= 224;
  }

  if (isIP(normalized) === 6) {
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd");
  }

  return false;
}

async function readLimitedResponse(response: Response) {
  if (!response.body) {
    throw new Error("The website returned an empty response.");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remainingBytes = MAX_DOWNLOAD_BYTES - size;
      if (value.byteLength > remainingBytes) {
        if (remainingBytes > 0) {
          chunks.push(value.slice(0, remainingBytes));
          size += remainingBytes;
        }
        console.info("[website-fetch] streamed response truncated", { downloadLimit: MAX_DOWNLOAD_BYTES });
        await reader.cancel();
        return { html: decodeChunks(chunks, size), bytesRead: size, truncated: true };
      }
      size += value.byteLength;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return { html: decodeChunks(chunks, size), bytesRead: size, truncated: false };
}

function decodeChunks(chunks: Uint8Array[], size: number) {
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function uniqueText(values: string[], maxItems: number, maxItemChars: number) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized.slice(0, maxItemChars));
    if (result.length === maxItems) break;
  }

  return result;
}

function removeNonContentBlocks(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    // A stream may end inside a script or style tag after reaching the safe
    // download bound. Discard that unfinished block rather than treating code
    // as website copy.
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*$/i, " ");
}

function removePageChrome(value: string) {
  return value.replace(/<(nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
}

function buildPrioritizedText(contentHtml: string, headings: string[], paragraphs: string[]) {
  const semanticText = [...headings, ...paragraphs].join("\n");
  const remainingText = stripHtml(contentHtml);
  return `${semanticText}\n${remainingText}`.trim().slice(0, 12_000);
}

function stripHtml(value: string) {
  return value
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
