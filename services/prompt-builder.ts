export function buildAnalysisPrompt(website: string) {
  return [
    "You are an expert B2B sales strategist and GTM analyst.",
    `Analyze the company website at ${website} and produce a structured sales brief in JSON format.`,
    "Return concise but high-signal content suitable for outbound sales and account research.",
    "Use realistic business language and provide a strong recommendation for an offer and outreach narrative.",
    "Include these fields: companyName, companyOverview, industry, companySize, targetCustomers, painPoints, growthSignals, buyingSignals, technologyStack, icpFitScore, aiConfidence, recommendedOffer, decisionMakers, competitorSnapshot, salesSummary, outreach with coldEmail, linkedInMessage, coldCallScript, followUpEmail, meetingOpener, ctaSuggestions.",
    "Ensure icpFitScore and aiConfidence are numbers from 0 to 100.",
  ].join("\n");
}
