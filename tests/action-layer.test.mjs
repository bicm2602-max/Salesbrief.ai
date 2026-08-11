import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function loadSchema() {
  const source = await readFile(new URL("../services/action-layer.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", "require", compiled)(exports, { exports }, require);
  return exports.actionLayerSchema;
}

const validActionLayer = {
  priority: "HIGH",
  priorityReason: "The company explicitly describes a growing revenue team.",
  whyNow: { statement: "The website describes a new enterprise offering.", evidenceLevel: "strong" },
  whoToContact: { primary: { role: "VP Sales", reason: "This role typically owns enterprise sales execution." }, secondary: { role: "Sales Operations leader", reason: "This role can assess research workflow friction." } },
  painToLeadWith: { verifiedFact: "The company serves enterprise revenue teams.", hypothesis: "A larger account set may increase manual prospect research work." },
  recommendedSalesAngle: "Lead with reducing the research effort required to prepare enterprise outreach.",
  bestNextAction: "Identify the VP Sales and verify ownership of enterprise outbound before reaching out.",
  outreachStarter: { coldEmailOpening: "I noticed your enterprise offering is a visible focus in your public positioning.", linkedinOpening: "Your enterprise positioning stood out when I reviewed the site.", coldCallOpener: "I am calling because your public enterprise focus raised a research question." },
};

test("Action Layer validates a structured, evidence-aware recommendation", async () => {
  const schema = await loadSchema();
  assert.deepEqual(schema.parse(validActionLayer), validActionLayer);
});

test("Action Layer permits no verified timing signal without fabricating urgency", async () => {
  const schema = await loadSchema();
  const result = schema.parse({ ...validActionLayer, priority: "LOW", whyNow: { statement: "No strong timing signal identified.", evidenceLevel: "hypothesis" } });
  assert.equal(result.whyNow.statement, "No strong timing signal identified.");
});

test("Action Layer rejects unsupported priority values and incomplete role recommendations", async () => {
  const schema = await loadSchema();
  assert.equal(schema.safeParse({ ...validActionLayer, priority: "URGENT" }).success, false);
  assert.equal(schema.safeParse({ ...validActionLayer, whoToContact: {} }).success, false);
});

test("result UI remains backward compatible when an old analysis has no Action Layer", async () => {
  const source = await readFile(new URL("../components/analysis/action-layer-card.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!actionLayer\) return null/);
  assert.match(source, /Your Next Move/);
});

test("Ask SalesBrief context includes the Action Layer for new analyses", async () => {
  const source = await readFile(new URL("../services/analysis-assistant.ts", import.meta.url), "utf8");
  assert.match(source, /actionLayer: result\.actionLayer/);
});
