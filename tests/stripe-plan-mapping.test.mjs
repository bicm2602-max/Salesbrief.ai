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
test("corrects a Supabase Starter profile from an authoritative Stripe Pro price", async () => {
  const { resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(resolvePlanFromStripePriceId("price_pro", valid), "pro");
});
test("corrects a Supabase Pro profile from an authoritative Stripe Starter price", async () => {
  const { resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(resolvePlanFromStripePriceId("price_starter", valid), "starter");
});
test("treats an active target price as a synchronization success", async () => {
  const { resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(resolvePlanFromStripePriceId("price_pro", valid), "pro");
});
test("customer.subscription.updated resolves a Starter to Pro change from the Stripe Price ID", async () => {
  const { resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(resolvePlanFromStripePriceId("price_pro", valid), "pro");
});
test("fails safely for an unknown Stripe Price ID", async () => {
  const { resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(resolvePlanFromStripePriceId("price_unknown", valid), null);
});
test("does not allow a stale canceled subscription to overwrite an active subscription", async () => {
  const { shouldIgnoreStaleInactiveSubscription } = await loadResolver();
  assert.equal(shouldIgnoreStaleInactiveSubscription({ storedSubscriptionId: "sub_active", storedStatus: "active", incomingSubscriptionId: "sub_canceled", incomingStatus: "canceled" }), true);
});
test("active Pro scheduled for cancellation remains entitled until the period end", async () => {
  const { hasActiveStripeEntitlement, isStripeCancellationScheduled, resolvePlanFromStripePriceId } = await loadResolver();
  assert.equal(hasActiveStripeEntitlement("active", "2030-01-01T00:00:00.000Z", Date.parse("2029-01-01T00:00:00.000Z")), true);
  assert.equal(resolvePlanFromStripePriceId("price_pro", valid), "pro");
  assert.equal(isStripeCancellationScheduled({ status: "active", cancelAtPeriodEnd: true, cancelAt: null, now: Date.parse("2026-08-09T00:00:00.000Z") }), true);
});
test("an active subscription with a future Stripe cancel_at is scheduled to cancel", async () => {
  const { isStripeCancellationScheduled } = await loadResolver();
  assert.equal(isStripeCancellationScheduled({ status: "active", cancelAtPeriodEnd: false, cancelAt: Math.floor(Date.parse("2026-09-08T00:00:00.000Z") / 1000), now: Date.parse("2026-08-09T00:00:00.000Z") }), true);
});
test("an ordinary active subscription is presented as renewing", async () => {
  const { isStripeCancellationScheduled } = await loadResolver();
  assert.equal(isStripeCancellationScheduled({ status: "active", cancelAtPeriodEnd: false, cancelAt: null, now: Date.parse("2026-08-09T00:00:00.000Z") }), false);
});
test("a canceled subscription is not presented as a scheduled cancellation", async () => {
  const { isStripeCancellationScheduled } = await loadResolver();
  assert.equal(isStripeCancellationScheduled({ status: "canceled", cancelAtPeriodEnd: true, cancelAt: Math.floor(Date.parse("2026-09-08T00:00:00.000Z") / 1000), now: Date.parse("2026-08-09T00:00:00.000Z") }), false);
});
test("selects the newest active subscription instead of a stale active subscription", async () => {
  const { selectAuthoritativeActiveSubscription } = await loadResolver();
  const selected = selectAuthoritativeActiveSubscription([
    { id: "sub_old", status: "active", created: 100 },
    { id: "sub_canceled", status: "canceled", created: 300 },
    { id: "sub_new", status: "active", created: 200 },
  ]);
  assert.equal(selected.id, "sub_new");
});
test("an immediately canceled Pro subscription has no entitlement", async () => {
  const { hasActiveStripeEntitlement } = await loadResolver();
  assert.equal(hasActiveStripeEntitlement("canceled", "2030-01-01T00:00:00.000Z", Date.parse("2029-01-01T00:00:00.000Z")), false);
});
test("a stale Supabase Pro record without a valid active Stripe subscription has no entitlement", async () => {
  const { hasActiveStripeEntitlement } = await loadResolver();
  assert.equal(hasActiveStripeEntitlement("canceled", null), false);
});
