import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function loadAssistant() {
  const source = await readFile(new URL("../services/analysis-assistant.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", "require", compiled)(exports, { exports }, require);
  return exports;
}

const analysis = { json_result: { companyName: "Acme", description: "Acme provides workflow software for revenue teams.", targetCustomers: ["Revenue teams"], products: ["Workflow software"], buyingSignals: ["Published a new product page"], recommendedOffer: "Research-led outreach" } };

function serviceWith(overrides = {}) {
  return overrides.createAnalysisAssistantService({
    loadOwnedAnalysis: async () => analysis,
    generateAnswer: async () => ({ answer: "Acme provides workflow software for revenue teams.", verified: true }),
    rateLimiter: { consume: () => ({ allowed: true }) },
    ...overrides.dependencies,
  });
}

test("accepts a valid grounded question", async () => {
  const mod = await loadAssistant();
  const result = await serviceWith({ ...mod, createAnalysisAssistantService: mod.createAnalysisAssistantService })("user-1", "analysis-1", { question: "Who is their ideal customer?" });
  assert.equal(result.status, 200);
  assert.match(result.body.answer, /workflow software/);
});

test("rejects empty and excessive questions", async () => {
  const mod = await loadAssistant();
  const service = serviceWith({ ...mod, createAnalysisAssistantService: mod.createAnalysisAssistantService });
  assert.equal((await service("user-1", "analysis-1", { question: " " })).status, 400);
  assert.equal((await service("user-1", "analysis-1", { question: "a".repeat(501) })).status, 400);
});

test("does not disclose another user's analysis", async () => {
  const mod = await loadAssistant();
  const service = mod.createAnalysisAssistantService({ loadOwnedAnalysis: async () => null, generateAnswer: async () => ({ answer: "unused", verified: true }), rateLimiter: { consume: () => ({ allowed: true }) } });
  assert.equal((await service("user-1", "other-user-analysis", { question: "Tell me about it" })).status, 404);
});

test("uses the fixed response for unavailable information", async () => {
  const mod = await loadAssistant();
  const service = mod.createAnalysisAssistantService({ loadOwnedAnalysis: async () => analysis, generateAnswer: async () => ({ answer: "unsupported", verified: false }), rateLimiter: { consume: () => ({ allowed: true }) } });
  assert.equal((await service("user-1", "analysis-1", { question: "What was their latest funding?" })).body.answer, mod.UNVERIFIED_INFORMATION_RESPONSE);
});

test("handles OpenAI failures and enforces the per-user rate limit", async () => {
  const mod = await loadAssistant();
  const failing = mod.createAnalysisAssistantService({ loadOwnedAnalysis: async () => analysis, generateAnswer: async () => { throw new Error("OpenAI failure"); }, rateLimiter: { consume: () => ({ allowed: true }) } });
  assert.equal((await failing("user-1", "analysis-1", { question: "What do they sell?" })).status, 502);

  const limited = mod.createAnalysisAssistantService({ loadOwnedAnalysis: async () => analysis, generateAnswer: async () => ({ answer: "unused", verified: true }), rateLimiter: { consume: () => ({ allowed: false, retryAfterSeconds: 30 }) } });
  assert.equal((await limited("user-1", "analysis-1", { question: "What do they sell?" })).status, 429);
});
