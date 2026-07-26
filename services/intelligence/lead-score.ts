export interface LeadScoreBreakdown {
  budgetFit: number;
  companySize: number;
  urgency: number;
  growth: number;
  digitalMaturity: number;
  websiteQuality: number;
  technologyFit: number;
}

export interface LeadScoreResult {
  score: number;
  breakdown: LeadScoreBreakdown;
}

export function calculateLeadScore(text: string, siteQuality: number): LeadScoreResult {
  const hasHiring = text.toLowerCase().includes("career") || text.toLowerCase().includes("hiring");
  const hasLaunch = text.toLowerCase().includes("launch") || text.toLowerCase().includes("new") ;
  const hasApi = text.toLowerCase().includes("api");
  const hasContactSales = text.toLowerCase().includes("contact sales");

  const breakdown: LeadScoreBreakdown = {
    budgetFit: 70,
    companySize: 78,
    urgency: hasHiring || hasLaunch || hasContactSales ? 88 : 68,
    growth: hasHiring || hasLaunch ? 84 : 72,
    digitalMaturity: hasApi ? 82 : 70,
    websiteQuality: Math.min(100, Math.round(siteQuality)),
    technologyFit: hasApi ? 80 : 72,
  };

  const score = Math.round((breakdown.budgetFit + breakdown.companySize + breakdown.urgency + breakdown.growth + breakdown.digitalMaturity + breakdown.websiteQuality + breakdown.technologyFit) / 7);

  return { score, breakdown };
}
