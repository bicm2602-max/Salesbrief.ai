export interface TechMatch {
  name: string;
  confidence: number;
}

const techProviders = [
  { name: "Shopify", patterns: ["shopify"] },
  { name: "WordPress", patterns: ["wordpress"] },
  { name: "Next.js", patterns: ["next.js", "nextjs"] },
  { name: "React", patterns: ["react"] },
  { name: "HubSpot", patterns: ["hubspot"] },
  { name: "Intercom", patterns: ["intercom"] },
  { name: "Stripe", patterns: ["stripe"] },
  { name: "Cloudflare", patterns: ["cloudflare"] },
  { name: "Google Analytics", patterns: ["google analytics", "gtag", "analytics"] },
  { name: "Segment", patterns: ["segment"] },
];

export function detectTechStack(text: string): TechMatch[] {
  const lower = text.toLowerCase();
  return techProviders
    .filter((provider) => provider.patterns.some((pattern) => lower.includes(pattern)))
    .map((provider) => ({
      name: provider.name,
      confidence: 88,
    }));
}
