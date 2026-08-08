import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function loadPresentation() {
  const source = await readFile(new URL("../lib/billing/subscription-presentation.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  Function("exports", "module", compiled)(exports, { exports });
  return exports.getSubscriptionDatePresentation;
}

const periodEnd = "2026-09-08T00:00:00.000Z";
const reconciledProCancellationState = {
  userId: "user_123",
  plan: "pro",
  status: "active",
  isActive: true,
  currentPeriodStart: "2026-08-08T00:00:00.000Z",
  currentPeriodEnd: periodEnd,
  cancelAtPeriodEnd: true,
  stripeSubscriptionId: "sub_123",
  stripePriceId: "price_pro",
  analysesUsed: 0,
  analysesLimit: null,
  analysesRemaining: null,
  totalAnalyses: 4,
};
test("active Pro that renews displays renewal wording", async () => { const present = await loadPresentation(); const result = present({ isActive: true, cancelAtPeriodEnd: false, currentPeriodEnd: periodEnd }); assert.equal(result.planDate, "Renews on Sep 8, 2026"); assert.equal(result.accessDate, "Renewal date: Sep 8, 2026"); });
test("scheduled cancellation displays cancellation and access wording", async () => { const present = await loadPresentation(); const result = present({ isActive: true, cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd }); assert.equal(result.planDate, "Cancels on Sep 8, 2026"); assert.equal(result.accessDate, "Access until Sep 8, 2026"); assert.match(result.notice, /scheduled to cancel/); });
test("reconciled Stripe SubscriptionState propagates cancellation to dashboard presentation", async () => { const present = await loadPresentation(); const result = present(reconciledProCancellationState); assert.equal(result.planDate, "Cancels on Sep 8, 2026"); assert.equal(result.accessDate, "Access until Sep 8, 2026"); assert.match(result.notice, /keep access until Sep 8, 2026/); });
test("canceled or expired subscriptions display no schedule", async () => { const present = await loadPresentation(); assert.equal(present({ isActive: false, cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd }), null); });
