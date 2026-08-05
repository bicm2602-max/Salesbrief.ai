export interface BuyingSignalInsight {
  title: string;
  explanation: string;
  salesOpportunity: string;
  priority: "Low" | "Medium" | "High";
}

export interface TechStackInsight {
  name: string;
  confidence: number;
}

export interface SalesOpportunityInsight {
  opportunity: string;
  reason: string;
  recommendedPitch: string;
  urgency: string;
  potentialImpact: string;
}

export interface RecommendationInsight {
  title: string;
  explanation: string;
  confidence: number;
}

export interface MeetingPlanInsight {
  openingSentence: string;
  discoveryQuestions: string[];
  painExploration: string[];
  demoAngle: string;
  closingQuestion: string;
}

export interface LeadScoreBreakdown {
  budgetFit: number;
  companySize: number;
  urgency: number;
  growth: number;
  digitalMaturity: number;
  websiteQuality: number;
  technologyFit: number;
}

export interface LeadScoreInsight {
  score: number;
  breakdown: LeadScoreBreakdown;
}

export interface OutreachVariants {
  emailShort: string;
  emailConsultative: string;
  linkedinShort: string;
  linkedinConversational: string;
}

export interface AnalysisReport {
  companyName: string;
  industry: string;
  description: string;
  companySize: string;
  targetCustomers: string[];
  products: string[];
  services: string[];
  painPoints: string[];
  opportunities: string[];
  buyingSignals: string[];
  buyingSignalsDetailed: BuyingSignalInsight[];
  techStack: TechStackInsight[];
  salesOpportunities: SalesOpportunityInsight[];
  recommendations: RecommendationInsight[];
  meetingPlan: MeetingPlanInsight;
  leadScore: LeadScoreInsight;
  salesScore: number;
  confidenceScore: number;
  recommendedOffer: string;
  email: string;
  linkedin: string;
  outreachVariants?: OutreachVariants;
  coldCall: string;
  followUp: string;
  objections: string[];
  summary: string;
}

export interface AnalysisResult extends AnalysisReport {
  website: string;
  generatedAt: string;
  status: "completed" | "draft";
}

export interface PersistedAnalysis extends AnalysisResult {
  id: string;
  createdAt: string;
}
