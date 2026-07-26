export interface BuyingSignal {
  title: string;
  explanation: string;
  salesOpportunity: string;
  priority: "Low" | "Medium" | "High";
}

const signalKeywords: Array<{ keyword: string; title: string; explanation: string; salesOpportunity: string; priority: "Low" | "Medium" | "High" }> = [
  {
    keyword: "career",
    title: "Hiring momentum",
    explanation: "The company is actively recruiting, which often indicates growth and a need for revenue enablement support.",
    salesOpportunity: "Position a solution that helps new teams ramp faster and convert more efficiently.",
    priority: "High",
  },
  {
    keyword: "launch",
    title: "Recent product launch",
    explanation: "A new product or feature launch often creates urgency around positioning and adoption messaging.",
    salesOpportunity: "Tie the offer to onboarding, expansion, or activation support.",
    priority: "High",
  },
  {
    keyword: "pricing",
    title: "Pricing update",
    explanation: "Pricing changes suggest the company is refining its commercial motion and may need stronger value articulation.",
    salesOpportunity: "Introduce a targeted offer focused on value communication and conversion effectiveness.",
    priority: "High",
  },
  {
    keyword: "integrat",
    title: "Technology integrations",
    explanation: "A growing integrations strategy usually points to ecosystem expansion and cross-functional complexity.",
    salesOpportunity: "Frame the offer around workflow-fit, implementation ease, and operational leverage.",
    priority: "Medium",
  },
  {
    keyword: "enterprise",
    title: "Enterprise positioning",
    explanation: "Enterprise messaging often signals a larger buying committee and more formal evaluation criteria.",
    salesOpportunity: "Prepare a more structured demo and ROI-centric narrative.",
    priority: "Medium",
  },
  {
    keyword: "api",
    title: "API availability",
    explanation: "An API indicates platform extensibility and likely demand for technical integration support.",
    salesOpportunity: "Offer a technical enablement angle tied to adoption and implementation readiness.",
    priority: "Medium",
  },
  {
    keyword: "free trial",
    title: "Free trial offer",
    explanation: "A trial offer can indicate a strong demand for conversion optimization and onboarding support.",
    salesOpportunity: "Introduce a value-based follow-up strategy for expanding trial users into revenue.",
    priority: "Medium",
  },
  {
    keyword: "contact sales",
    title: "Direct sales CTA",
    explanation: "A clear contact-sales call to action suggests near-term commercial intent.",
    salesOpportunity: "Use a personalized, outcome-led outreach message to spark a conversation.",
    priority: "High",
  },
];

export function extractBuyingSignals(text: string): BuyingSignal[] {
  const lower = text.toLowerCase();
  return signalKeywords
    .filter((signal) => lower.includes(signal.keyword))
    .map((signal) => ({
      title: signal.title,
      explanation: signal.explanation,
      salesOpportunity: signal.salesOpportunity,
      priority: signal.priority,
    }));
}
