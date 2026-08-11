import "server-only";

import { z } from "zod";
import OpenAI from "openai";
import { AnalysisPipelineError } from "@/services/analysis-errors";

export const analysisProviderSchema = z.enum(["openai", "deepseek", "kimi"]);
export type AnalysisProvider = z.infer<typeof analysisProviderSchema>;

type ProviderConfig = { label: string; model: string; apiKey: string; baseURL?: string; api: "responses" | "chat-completions" };

export const AI_PROVIDERS: Record<AnalysisProvider, ProviderConfig> = {
  openai: { label: "OpenAI", model: "gpt-5", apiKey: process.env.OPENAI_API_KEY ?? "", api: "responses" },
  deepseek: { label: "DeepSeek", model: "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY ?? "", baseURL: "https://api.deepseek.com", api: "chat-completions" },
  kimi: { label: "Kimi", model: "kimi-k2.5", apiKey: process.env.KIMI_API_KEY ?? "", baseURL: "https://api.moonshot.ai/v1", api: "chat-completions" },
};

export function parseAnalysisProvider(value: unknown): AnalysisProvider | null {
  if (value === undefined || value === null || value === "") return "openai";
  return analysisProviderSchema.safeParse(value).data ?? null;
}

export function providerLabel(provider: AnalysisProvider) { return AI_PROVIDERS[provider].label; }

export async function generateStructuredAnalysis(provider: AnalysisProvider, prompt: string) {
  const config = AI_PROVIDERS[provider];
  if (!config.apiKey) throw new AnalysisPipelineError("ai provider", `${config.label} is temporarily unavailable. Please try again or select another AI model.`, `${provider} API key is not configured.`);
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 180_000, maxRetries: 1 });
  const startedAt = Date.now();
  console.info("[analysis-provider] request started", { provider, model: config.model, api: config.api });
  try {
    if (config.api === "responses") {
      const response = await client.responses.create({ model: config.model, input: [{ role: "system", content: "You are a senior B2B sales intelligence analyst. Respond with valid JSON only." }, { role: "user", content: prompt }] });
      const output = response.output_text ?? "";
      console.info("[analysis-provider] request completed", { provider, model: config.model, durationMs: Date.now() - startedAt, outputLength: output.length, usage: response.usage ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } : undefined });
      return output;
    }
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [{ role: "system", content: "You are a senior B2B sales intelligence analyst. Respond with valid JSON only." }, { role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const output = response.choices[0]?.message.content ?? "";
    console.info("[analysis-provider] request completed", { provider, model: config.model, durationMs: Date.now() - startedAt, outputLength: output.length, usage: response.usage ? { inputTokens: response.usage.prompt_tokens, outputTokens: response.usage.completion_tokens } : undefined });
    return output;
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    console.error("[analysis-provider] request failed", { provider, model: config.model, durationMs: Date.now() - startedAt, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Provider request failed.", status: typeof record.status === "number" ? record.status : undefined });
    throw new AnalysisPipelineError("ai provider", `${config.label} is temporarily unavailable. Please try again or select another AI model.`, error instanceof Error ? error.message : "Provider request failed.");
  }
}
