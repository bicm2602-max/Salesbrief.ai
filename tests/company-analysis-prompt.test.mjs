import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadPromptBuilder() {
  const source = await readFile(new URL("../services/prompts/company-analysis.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", compiled)(exports, { exports });
  return exports.buildCompanyAnalysisPrompt;
}

test("outreach prompt enforces grounded, variant-based messaging", async () => {
  const buildPrompt = await loadPromptBuilder();
  const prompt = buildPrompt('{"title":"Workflow platform for SaaS sales teams"}');

  assert.match(prompt, /Never invent news, launches, hiring, metrics/i);
  assert.match(prompt, /emailShort, emailConsultative, linkedinShort, linkedinConversational/);
  assert.match(prompt, /80-110 words/);
  assert.match(prompt, /No prospect information was provided/);
});

test("outreach prompt includes only supplied prospect context", async () => {
  const buildPrompt = await loadPromptBuilder();
  const prompt = buildPrompt('{"title":"Nonprofit education program"}', {
    role: "Head of Sales",
    seniority: "Director",
    outreachObjective: "Book a discovery call",
  });

  assert.match(prompt, /Head of Sales/);
  assert.match(prompt, /Book a discovery call/);
  assert.doesNotMatch(prompt, /No prospect information was provided/);
});

test("outreach prompt preserves the available context for requested company and prospect profiles", async () => {
  const buildPrompt = await loadPromptBuilder();
  const scenarios = [
    ["known SaaS", '{"title":"SaaS platform for revenue teams"}', undefined],
    ["limited-information SME", '{"title":"Local engineering company"}', undefined],
    ["nonprofit", '{"title":"Nonprofit supporting community health"}', undefined],
    ["content-rich website", '{"headings":["Platform","Customer stories","Resources"],"paragraphs":["Detailed company context"]}', undefined],
    ["SDR prospect", '{"title":"B2B software company"}', { role: "SDR", seniority: "Individual contributor" }],
    ["Head of Sales prospect", '{"title":"Revenue operations platform"}', { role: "Head of Sales", seniority: "Leadership" }],
  ];

  for (const [label, content, prospect] of scenarios) {
    const prompt = buildPrompt(content, prospect);
    assert.match(prompt, /Evidence rule:/, label);
    assert.match(prompt, /Website content:/, label);
    if (prospect) assert.match(prompt, new RegExp(prospect.role), label);
  }
});
