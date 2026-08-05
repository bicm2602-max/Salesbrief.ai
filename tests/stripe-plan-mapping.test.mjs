import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadResolver() {
  const source = await readFile(new URL("../lib/server/stripe-plan-mapping.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", compiled)(exports, { exports });
  return exports;
}

const valid = { starter: "price_starter", pro: "price_pro", business: "price_business" };

for (const [name, target] of [["Free to Starter", "starter"], ["Free to Pro", "pro"], ["Starter to Pro", "pro"], ["Pro to Starter", "starter"]]) {
  test(name, async () => { const { resolveStripePlanPriceIds } = await loadResolver(); assert.equal(resolveStripePlanPriceIds(valid)[target], `price_${target}`); });
}
test("rejects identical Price IDs", async () => { const { resolveStripePlanPriceIds } = await loadResolver(); assert.throws(() => resolveStripePlanPriceIds({ ...valid, pro: valid.starter }), /must all be different/); });
test("rejects missing Price IDs", async () => { const { resolveStripePlanPriceIds } = await loadResolver(); assert.throws(() => resolveStripePlanPriceIds({ ...valid, pro: "" }), /PRO_PRICE_ID is required/); });
test("rejects an invalid requested plan", async () => { const { isStripePlanId } = await loadResolver(); assert.equal(isStripePlanId("invalid"), false); });
