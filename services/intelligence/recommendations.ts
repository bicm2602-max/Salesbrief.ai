export interface Recommendation {
  title: string;
  explanation: string;
  confidence: number;
}

export function buildRecommendations(signals: string[], score: number): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (score >= 80) {
    recommendations.push({ title: "Call immediately", explanation: "The account shows strong urgency and commercial fit.", confidence: 94 });
  } else {
    recommendations.push({ title: "Wait before contacting", explanation: "The account may need more evidence before a high-friction outreach motion is worth it.", confidence: 76 });
  }

  if (signals.some((signal) => signal.toLowerCase().includes("hiring"))) {
    recommendations.push({ title: "Mention hiring", explanation: "Use hiring growth as a proxy for expansion and team scaling pressure.", confidence: 89 });
  }

  if (signals.some((signal) => signal.toLowerCase().includes("integrat"))) {
    recommendations.push({ title: "Mention integrations", explanation: "The product ecosystem and workflow fit are likely important here.", confidence: 87 });
  }

  if (score < 70) {
    recommendations.push({ title: "Use LinkedIn first", explanation: "A softer social-first approach may work better before a more direct ask.", confidence: 74 });
  }

  recommendations.push({ title: "Avoid generic outreach", explanation: "Tailor the messaging around the company’s current growth signals and specific value story.", confidence: 91 });

  return recommendations;
}
