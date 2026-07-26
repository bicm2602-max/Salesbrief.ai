export interface SalesOpportunity {
  opportunity: string;
  reason: string;
  recommendedPitch: string;
  urgency: string;
  potentialImpact: string;
}

export function buildSalesOpportunities(signals: string[], painPoints: string[]): SalesOpportunity[] {
  return [
    {
      opportunity: "Value-led onboarding acceleration",
      reason: `The company shows signs of growth and likely needs help with ${painPoints[0] ?? "rapid adoption"}.`,
      recommendedPitch: "Position your solution as a fast path to value that reduces time-to-impact and improves activation quality.",
      urgency: "High",
      potentialImpact: "Improves ramp speed and increases early-stage conversion.",
    },
    {
      opportunity: "Message refinement for expansion",
      reason: `Recent product activity and commercial signals suggest a window to improve positioning around ${signals.join(", ") || "growth"}.`,
      recommendedPitch: "Frame the offer around sharper messaging and better conversion performance in the current growth phase.",
      urgency: "Medium",
      potentialImpact: "Helps the team convert more interest into pipeline with less friction.",
    },
    {
      opportunity: "Workflow automation enablement",
      reason: "Teams that are growing often need better orchestration between data, outreach, and CRM work.",
      recommendedPitch: "Position the solution as a way to remove manual effort and create more consistent execution.",
      urgency: "Medium",
      potentialImpact: "Creates efficiency gains across revenue operations and sales execution.",
    },
    {
      opportunity: "Enterprise readiness narrative",
      reason: "If the company is targeting larger accounts, the buying committee will likely need a more structured value story.",
      recommendedPitch: "Offer a tailored proof of value and executive-friendly ROI narrative.",
      urgency: "Medium",
      potentialImpact: "Raises win probability in larger, multi-stakeholder deals.",
    },
    {
      opportunity: "Integration-centered adoption play",
      reason: "Modern growth teams often value solutions that fit naturally into existing workflows and tools.",
      recommendedPitch: "Lead with implementation ease and ecosystem fit to lower perceived risk.",
      urgency: "Low",
      potentialImpact: "Improves adoption and reduces onboarding friction.",
    },
  ];
}
