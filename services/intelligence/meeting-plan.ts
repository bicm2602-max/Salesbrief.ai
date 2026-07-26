export interface MeetingPlan {
  openingSentence: string;
  discoveryQuestions: string[];
  painExploration: string[];
  demoAngle: string;
  closingQuestion: string;
}

export function buildMeetingPlan(industry: string, companySize: string): MeetingPlan {
  return {
    openingSentence: `I’d love to understand how ${industry.toLowerCase()} teams like yours are thinking about growth, efficiency, and client conversion right now.`,
    discoveryQuestions: [
      "What are the biggest bottlenecks in your current revenue motion?",
      "Where do you feel the handoff between outreach and conversion breaks down?",
      "How do you currently evaluate sales enablement or growth tooling?",
    ],
    painExploration: [
      "What happens when the team lacks a clear, repeatable outreach motion?",
      `How does ${companySize.toLowerCase()} size affect your current operating model?`,
    ],
    demoAngle: "Focus the demo on measurable impact, lower friction in handoffs, and faster time to value.",
    closingQuestion: "Would it be useful if we reviewed the top friction points and mapped a practical next step together?",
  };
}
