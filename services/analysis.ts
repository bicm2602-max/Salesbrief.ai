import { z } from "zod";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { buildCompanyAnalysisPrompt } from "@/services/prompts/company-analysis";
import { generateAnalysisJson } from "@/services/openai";
import { AnalysisPipelineError } from "@/services/analysis-errors";
import { fetchWebsiteContent } from "@/services/website";
import { buildMeetingPlan } from "@/services/intelligence/meeting-plan";
import { buildRecommendations } from "@/services/intelligence/recommendations";
import { buildSalesOpportunities } from "@/services/intelligence/opportunities";
import { calculateLeadScore } from "@/services/intelligence/lead-score";
import { detectTechStack } from "@/services/intelligence/tech-stack";
import { extractBuyingSignals } from "@/services/intelligence/buying-signals";
import type { AnalysisReport, AnalysisResult } from "@/types/analysis";

const objectionSchema = z.union([
  z.string(),
  z.object({ objection: z.string() }),
]);

const analysisSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  description: z.string().min(1),
  companySize: z.string().min(1),
  targetCustomers: z.array(z.string()),
  products: z.array(z.string()),
  services: z.array(z.string()),
  painPoints: z.array(z.string()),
  opportunities: z.array(z.string()),
  buyingSignals: z.array(z.string()),
  salesScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  recommendedOffer: z.string().min(1),
  email: z.string().min(1),
  linkedin: z.string().min(1),
  coldCall: z.string().min(1),
  followUp: z.string().min(1),
  objections: z.array(objectionSchema).transform((objections) =>
    objections.map((objection) => typeof objection === "string" ? objection : objection.objection),
  ),
  summary: z.string().min(1),
});

const urlSchema = z.string().trim().url();

export async function validateAnalysisUrl(rawUrl: string): Promise<{ success: true; data: string } | { success: false; error: string }> {
  const parsed = urlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { success: false, error: "Enter a valid public website URL." };
  }

  const url = new URL(parsed.data);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { success: false, error: "Only http and https website URLs are supported." };
  }

  if (url.username || url.password || isPrivateHostname(url.hostname)) {
    return { success: false, error: "Enter a public website URL." };
  }

  try {
    const addresses = await lookup(url.hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
      return { success: false, error: "Enter a public website URL." };
    }
  } catch {
    return { success: false, error: "That website address could not be resolved." };
  }

  return { success: true, data: url.toString() };
}

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local") || isPrivateAddress(normalized);
}

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIP(normalized) === 4) {
    const [first, second] = normalized.split(".").map(Number);
    return first === 0 || first === 10 || first === 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168 || first >= 224;
  }

  if (isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }

    const mappedAddress = normalized.replace(/^::ffff:/, "");
    if (mappedAddress !== normalized) {
      if (isIP(mappedAddress) === 4) return isPrivateAddress(mappedAddress);
      const segments = mappedAddress.split(":");
      if (segments.length === 2 && segments.every((segment) => /^[0-9a-f]{1,4}$/.test(segment))) {
        const high = Number.parseInt(segments[0], 16);
        const low = Number.parseInt(segments[1], 16);
        return isPrivateAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
      }
    }
  }

  return false;
}

export function normalizeWebsite(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

type WebsiteContent = Awaited<ReturnType<typeof fetchWebsiteContent>>;
const MAX_PROMPT_WEBSITE_CONTENT_CHARS = 12_000;

function serializePromptWebsiteContent(content: WebsiteContent) {
  const compactContent = {
    title: content.title?.slice(0, 300),
    metaDescription: content.metaDescription?.slice(0, 500),
    headings: content.headings.slice(0, 12).map((heading) => heading.slice(0, 300)),
    paragraphs: content.paragraphs.slice(0, 6).map((paragraph) => paragraph.slice(0, 1_200)),
    links: [],
    homePage: "",
  };
  const availableHomePageChars = Math.max(0, MAX_PROMPT_WEBSITE_CONTENT_CHARS - JSON.stringify(compactContent).length);
  const serialized = JSON.stringify({
    ...compactContent,
    homePage: content.homePage.slice(0, availableHomePageChars),
  });

  console.info("[analysis] prompt website content limited", {
    stage: "prompt preparation",
    beforeLength: JSON.stringify(content).length,
    afterLength: serialized.length,
    maxLength: MAX_PROMPT_WEBSITE_CONTENT_CHARS,
  });

  return serialized;
}

function enrichAnalysisReport(baseReport: AnalysisReport, content: WebsiteContent): AnalysisReport {
  const combinedText = [
    content.title,
    content.metaDescription,
    content.headings.join(" "),
    content.paragraphs.join(" "),
    content.homePage,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...baseReport,
    buyingSignalsDetailed: extractBuyingSignals(combinedText),
    techStack: detectTechStack(combinedText),
    salesOpportunities: buildSalesOpportunities(baseReport.buyingSignals, baseReport.painPoints),
    recommendations: buildRecommendations(baseReport.buyingSignals, baseReport.salesScore),
    meetingPlan: buildMeetingPlan(baseReport.industry, baseReport.companySize),
    leadScore: calculateLeadScore(combinedText, Math.min(100, baseReport.confidenceScore + 8)),
  };
}

// Retained for potential future recovery tooling; generation failures do not return this data.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function deriveFallbackReport(website: string, content: WebsiteContent): AnalysisReport {
  const host = new URL(normalizeWebsite(website)).hostname.replace("www.", "");
  const companyName = host
    .split(".")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const baseReport: AnalysisReport = {
    companyName,
    industry: "Software",
    description: `${companyName} appears to be a growing technology company with a clear need for sharper positioning and more efficient outbound messaging.`,
    companySize: "11-50 employees",
    targetCustomers: ["Revenue leaders", "Growth teams", "VPs of Sales"],
    products: ["Product-led growth platform"],
    services: ["Consulting", "Implementation support"],
    painPoints: ["Weak outbound signal capture", "Inconsistent qualification"],
    opportunities: ["Message refinement", "Targeted offer positioning"],
    buyingSignals: ["Growing content footprint", "Recent product launches"],
    buyingSignalsDetailed: [],
    techStack: [],
    salesOpportunities: [],
    recommendations: [],
    meetingPlan: {
      openingSentence: "I’d love to understand how your team is thinking about growth and efficiency right now.",
      discoveryQuestions: ["What is slowing your current revenue motion the most?"],
      painExploration: ["Where do your best opportunities seem to be getting stuck?"],
      demoAngle: "Focus the demo on measurable impact, faster activation, and lower friction in the funnel.",
      closingQuestion: "Would it be useful if we reviewed the top opportunities and picked a practical next step?",
    },
    leadScore: {
      score: 78,
      breakdown: {
        budgetFit: 74,
        companySize: 76,
        urgency: 80,
        growth: 78,
        digitalMaturity: 74,
        websiteQuality: 78,
        technologyFit: 76,
      },
    },
    salesScore: 84,
    confidenceScore: 78,
    recommendedOffer: "A tailored outreach sprint with a diagnostic and implementation plan.",
    email: `Hi ${companyName} team, I noticed your recent positioning and wanted to share a sharper way to improve outbound conversion and deal quality.`,
    linkedin: `Hi ${companyName} team — your growth signals suggest a strong need for a more focused revenue narrative. I’d be happy to share a few ideas.`,
    coldCall: `Hi, I work with growth teams that want sharper messaging and faster deal momentum. I noticed your team is investing in outbound and thought I could share a few quick ideas.`,
    followUp: `Just circling back with the brief I shared earlier. I’d be happy to walk through it if it’s relevant for your team.`,
    objections: ["Budget constraints", "Need for internal alignment"],
    summary: `${companyName} appears to be a strong fit for a concise, insight-led outreach motion that speaks directly to their growth and positioning priorities.`,
  };

  return enrichAnalysisReport(baseReport, content);
}

export async function generateSalesBrief(website: string): Promise<AnalysisResult> {
  const normalizedWebsite = normalizeWebsite(website);
  console.info("[analysis] website fetch started", { stage: "website fetch", url: normalizedWebsite });
  const siteContent = await fetchWebsiteContent(normalizedWebsite);
  console.info("[analysis] content extraction completed", {
    stage: "content extraction",
    titlePresent: Boolean(siteContent.title),
    headingCount: siteContent.headings.length,
    paragraphCount: siteContent.paragraphs.length,
    textLength: siteContent.homePage.length,
  });
  const analysisPayload = await generateAnalysisJson(buildCompanyAnalysisPrompt(serializePromptWebsiteContent(siteContent)));

  try {
    const parsed = JSON.parse(analysisPayload);
    console.info("[analysis] OpenAI response parsing completed", { stage: "openai response parsing" });
    console.info("[analysis] objections before validation", {
      stage: "Zod/schema validation",
      objections: parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>).objections : undefined,
    });
    const validation = analysisSchema.safeParse(parsed);
    if (!validation.success) {
      console.error("[analysis] schema validation failed", {
        stage: "Zod/schema validation",
        issueCount: validation.error.issues.length,
        fields: validation.error.issues.map((issue) => issue.path.join(".")).slice(0, 10),
      });
      throw new AnalysisPipelineError(
        "Zod/schema validation",
        "The analysis service returned an incomplete result. Please try again.",
        "OpenAI response did not match the analysis schema.",
      );
    }
    const result = validation.data;
    const enriched = enrichAnalysisReport(
      {
        ...result,
        buyingSignalsDetailed: [],
        techStack: [],
        salesOpportunities: [],
        recommendations: [],
        meetingPlan: {
          openingSentence: "",
          discoveryQuestions: [],
          painExploration: [],
          demoAngle: "",
          closingQuestion: "",
        },
        leadScore: {
          score: 0,
          breakdown: {
            budgetFit: 0,
            companySize: 0,
            urgency: 0,
            growth: 0,
            digitalMaturity: 0,
            websiteQuality: 0,
            technologyFit: 0,
          },
        },
      },
      siteContent,
    );

    return {
      website: normalizedWebsite,
      ...enriched,
      generatedAt: new Date().toISOString(),
      status: "completed",
    } satisfies AnalysisResult;
  } catch (error) {
    if (error instanceof AnalysisPipelineError) throw error;
    console.error("[analysis] response parsing failed", {
      stage: "OpenAI response parsing",
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Invalid JSON response.",
      responseLength: analysisPayload.length,
    });
    throw new AnalysisPipelineError(
      "OpenAI response parsing",
      "The analysis service returned an invalid result. Please try again.",
      "OpenAI response was not valid JSON.",
    );
  }
}
