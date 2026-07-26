export function buildCompanyAnalysisPrompt(content: string) {
  return [
    "You are a senior B2B sales intelligence analyst.",
    "Analyze the supplied website content and return strict JSON only.",
    "Use the schema: { companyName, industry, description, companySize, targetCustomers, products, services, painPoints, opportunities, buyingSignals, salesScore, confidenceScore, recommendedOffer, email, linkedin, coldCall, followUp, objections, summary }. objections must be an array of plain strings, never objects.",
    "Do not include markdown, commentary, or extra keys.",
    "Use the website content to infer the company and market context.",
    `Website content:\n${content}`,
  ].join("\n");
}
