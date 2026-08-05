import { z } from "zod";

export const UNVERIFIED_INFORMATION_RESPONSE = "I couldn’t verify that from the available company data.";
export const MAX_ASSISTANT_QUESTION_LENGTH = 500;
const MAX_HISTORY_MESSAGES = 6;
const MAX_CONTEXT_CHARS = 9_000;

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1_200),
});

export const askAnalysisAssistantSchema = z.object({
  question: z.string().trim().min(1, "Please enter a question.").max(MAX_ASSISTANT_QUESTION_LENGTH, "Please keep questions under 500 characters."),
  history: z.array(messageSchema).max(MAX_HISTORY_MESSAGES).default([]),
});

export type AssistantMessage = z.infer<typeof messageSchema>;

type StoredAnalysis = { json_result: unknown };
type AssistantAnswer = { answer: string; verified: boolean };

export interface AssistantRateLimiter {
  consume(userId: string): { allowed: boolean; retryAfterSeconds?: number };
}

export function createInMemoryAssistantRateLimiter(maxRequests = 8, windowMs = 60_000): AssistantRateLimiter {
  const requests = new Map<string, number[]>();

  return {
    consume(userId) {
      const now = Date.now();
      const recent = (requests.get(userId) ?? []).filter((timestamp) => now - timestamp < windowMs);
      if (recent.length >= maxRequests) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1_000)) };
      }
      recent.push(now);
      requests.set(userId, recent);
      return { allowed: true };
    },
  };
}

export const analysisAssistantRateLimiter = createInMemoryAssistantRateLimiter();

export function buildAnalysisAssistantContext(jsonResult: unknown) {
  const result = jsonResult && typeof jsonResult === "object" ? jsonResult as Record<string, unknown> : {};
  const context = {
    companyName: text(result.companyName),
    industry: text(result.industry),
    description: text(result.description),
    companySize: text(result.companySize),
    targetCustomers: textList(result.targetCustomers),
    products: textList(result.products),
    services: textList(result.services),
    painPoints: textList(result.painPoints),
    opportunities: textList(result.opportunities),
    buyingSignals: textList(result.buyingSignals),
    recommendedOffer: text(result.recommendedOffer),
    summary: text(result.summary),
  };

  return truncate(JSON.stringify(context), MAX_CONTEXT_CHARS);
}

export function createAnalysisAssistantService(dependencies: {
  loadOwnedAnalysis: (userId: string, analysisId: string) => Promise<StoredAnalysis | null>;
  generateAnswer: (context: string, history: AssistantMessage[], question: string) => Promise<AssistantAnswer>;
  rateLimiter: AssistantRateLimiter;
}) {
  return async (userId: string, analysisId: string, payload: unknown) => {
    const parsed = askAnalysisAssistantSchema.safeParse(payload);
    if (!parsed.success) {
      return { status: 400, body: { error: parsed.error.issues[0]?.message ?? "Please enter a valid question." } } as const;
    }

    const analysis = await dependencies.loadOwnedAnalysis(userId, analysisId);
    if (!analysis) {
      return { status: 404, body: { error: "Analysis not found." } } as const;
    }

    const limit = dependencies.rateLimiter.consume(userId);
    if (!limit.allowed) {
      return { status: 429, body: { error: "Too many questions. Please try again shortly.", retryAfterSeconds: limit.retryAfterSeconds } } as const;
    }

    try {
      const answer = await dependencies.generateAnswer(
        buildAnalysisAssistantContext(analysis.json_result),
        parsed.data.history.slice(-MAX_HISTORY_MESSAGES),
        parsed.data.question,
      );
      return {
        status: 200,
        body: { answer: answer.verified ? answer.answer : UNVERIFIED_INFORMATION_RESPONSE },
      } as const;
    } catch {
      return { status: 502, body: { error: "The company assistant could not answer right now. Please try again." } } as const;
    }
  };
}

function text(value: unknown) {
  return typeof value === "string" ? truncate(value.trim(), 1_200) : "";
}

function textList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 12).map((item) => truncate(item.trim(), 500))
    : [];
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}
