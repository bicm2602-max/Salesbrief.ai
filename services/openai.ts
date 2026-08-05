import OpenAI from "openai";
import { z } from "zod";
import { AnalysisPipelineError } from "@/services/analysis-errors";
import type { AssistantMessage } from "@/services/analysis-assistant";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[analysis] OpenAI configuration missing", { stage: "openai request" });
    throw new AnalysisPipelineError(
      "openai request",
      "The analysis service is not configured. Please contact support.",
      "OPENAI_API_KEY is not configured.",
    );
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 180_000, maxRetries: 1 });
}

export async function generateAnalysisJson(prompt: string) {
  const startedAt = Date.now();
  console.info("[analysis] OpenAI request started", { stage: "openai request", promptLength: prompt.length, timeoutMs: 180_000, streaming: false });

  try {
    const response = await getClient().responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: "You are a senior B2B sales intelligence analyst. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const output = response.output_text ?? "";
    console.info("[analysis] OpenAI response received", { stage: "openai response", hasOutput: output.length > 0, outputLength: output.length, elapsedMs: Date.now() - startedAt });
    return output;
  } catch (error) {
    if (error instanceof AnalysisPipelineError) throw error;

    const details = getOpenAiErrorDetails(error);
    console.error("[analysis] OpenAI request failed", { stage: "openai request", ...details, elapsedMs: Date.now() - startedAt, timeoutReached: details.name.includes("Timeout") });
    throw new AnalysisPipelineError("openai request", getOpenAiUserMessage(details), details.message);
  }
}

const assistantAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(1_200),
  verified: z.boolean(),
});

export async function generateCompanyAssistantAnswer(context: string, history: AssistantMessage[], question: string) {
  const startedAt = Date.now();
  console.info("[analysis-assistant] OpenAI request started", { contextLength: context.length, historyCount: history.length, questionLength: question.length });

  try {
    const response = await getClient().responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: "You answer only questions about the analyzed company using the supplied structured context and conversation. Do not use outside knowledge. Never invent facts. Return JSON only: { answer: string, verified: boolean }. Set verified to false and use the exact answer 'I couldn’t verify that from the available company data.' whenever the context does not support the answer. Keep verified answers concise, factual, and commercially useful.",
        },
        {
          role: "user",
          content: JSON.stringify({ companyContext: context, conversation: history, question }),
        },
      ],
    });
    const parsed = assistantAnswerSchema.safeParse(JSON.parse(response.output_text ?? ""));
    if (!parsed.success) throw new Error("Assistant response did not match the expected schema.");

    console.info("[analysis-assistant] OpenAI response received", { verified: parsed.data.verified, answerLength: parsed.data.answer.length, elapsedMs: Date.now() - startedAt });
    return parsed.data;
  } catch (error) {
    const details = getOpenAiErrorDetails(error);
    console.error("[analysis-assistant] OpenAI request failed", { ...details, elapsedMs: Date.now() - startedAt });
    throw new AnalysisPipelineError("company assistant", "The company assistant could not answer right now. Please try again.", details.message);
  }
}

function getOpenAiErrorDetails(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "OpenAI request failed.",
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  };
}

function getOpenAiUserMessage(details: ReturnType<typeof getOpenAiErrorDetails>) {
  if (details.status === 401) return "The analysis service could not authenticate. Please contact support.";
  if (details.status === 429 && details.code === "insufficient_quota") return "The analysis service is currently unavailable due to quota limits. Please try again later.";
  if (details.status === 429) return "The analysis service is busy. Please try again shortly.";
  if (details.name.includes("Timeout")) return "The analysis service timed out. Please try again.";
  return "The analysis service failed. Please try again.";
}
