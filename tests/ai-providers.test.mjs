import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
async function loadProviders() {
  const source = (await readFile(new URL("../services/ai-providers.ts", import.meta.url), "utf8"))
    .replace('import "server-only";\n', "")
    .replace('import { AnalysisPipelineError } from "@/services/analysis-errors";', 'class AnalysisPipelineError extends Error {}');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {}; Function("exports", "module", "require", compiled)(exports, { exports }, require); return exports;
}

test("provider selection accepts only supported values and defaults to OpenAI", async () => {
  const { parseAnalysisProvider } = await loadProviders();
  assert.equal(parseAnalysisProvider(), "openai");
  assert.equal(parseAnalysisProvider("openai"), "openai");
  assert.equal(parseAnalysisProvider("deepseek"), "deepseek");
  assert.equal(parseAnalysisProvider("kimi"), "kimi");
  assert.equal(parseAnalysisProvider("arbitrary-model"), null);
});

test("provider configuration is centralized with current server-side model IDs", async () => {
  const { AI_PROVIDERS } = await loadProviders();
  assert.equal(AI_PROVIDERS.openai.model, "gpt-5");
  assert.equal(AI_PROVIDERS.deepseek.model, "deepseek-v4-pro");
  assert.equal(AI_PROVIDERS.kimi.model, "kimi-k2.5");
  assert.equal(AI_PROVIDERS.deepseek.baseURL, "https://api.deepseek.com");
  assert.equal(AI_PROVIDERS.kimi.baseURL, "https://api.moonshot.ai/v1");
});

test("provider selection is validated before analysis work and remains inside the shared quota path", async () => {
  const source = await readFile(new URL("../app/dashboard/new-analysis/actions.ts", import.meta.url), "utf8");
  assert.match(source, /parseAnalysisProvider\(requestedProvider\)/);
  assert.match(source, /status: "processing", ai_provider: provider/);
  assert.ok(source.indexOf('status: "processing", ai_provider: provider') < source.indexOf("const result = await generateSalesBrief"));
});

test("historical analyses remain supported and provider is only displayed when present", async () => {
  const source = await readFile(new URL("../components/analysis/analysis-results.tsx", import.meta.url), "utf8");
  assert.match(source, /provider\?: AnalysisProvider \| null/);
  assert.match(source, /provider \? <p/);
});

test("provider keys remain server-side only", async () => {
  const env = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(env, /^DEEPSEEK_API_KEY=$/m);
  assert.match(env, /^KIMI_API_KEY=$/m);
  assert.doesNotMatch(env, /NEXT_PUBLIC_(OPENAI|DEEPSEEK|KIMI)_API_KEY/);
});
