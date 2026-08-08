import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../supabase/migrations/20260809000000_harden_plan_quotas_and_assistant_limits.sql", import.meta.url);
const recoveryMigrationUrl = new URL("../supabase/migrations/20260809000001_clear_stale_quota_reservations.sql", import.meta.url);
const actionsUrl = new URL("../app/dashboard/new-analysis/actions.ts", import.meta.url);
const assistantRouteUrl = new URL("../app/api/analyses/[id]/ask/route.ts", import.meta.url);

async function sources() {
  return {
    migration: await readFile(migrationUrl, "utf8"),
    recoveryMigration: await readFile(recoveryMigrationUrl, "utf8"),
    actions: await readFile(actionsUrl, "utf8"),
    assistantRoute: await readFile(assistantRouteUrl, "utf8"),
  };
}

test("Free analysis quota is server-side, atomic, and counts processing reservations", async () => {
  const { migration, actions } = await sources();
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\(new\.user_id::text\)\)/);
  assert.match(migration, /new\.status not in \('processing', 'completed'\)/);
  assert.match(migration, /a\.status in \('processing', 'completed'\)/);
  assert.match(migration, /if v_analysis_count >= 3 then/);
  assert.match(actions, /status: "processing"/);
  assert.ok(actions.indexOf('status: "processing"') < actions.indexOf("const result = await generateSalesBrief"), "capacity must be reserved before OpenAI");
});

test("Starter quota is bound to Stripe's current billing period and blocks the eleventh request", async () => {
  const { migration } = await sources();
  assert.match(migration, /v_plan = 'starter'/);
  assert.match(migration, /a\.created_at >= coalesce\(v_period_start, now\(\)\)/);
  assert.match(migration, /a\.created_at <= v_period_end/);
  assert.match(migration, /if v_analysis_count >= 10 then/);
  assert.match(migration, /starter_analysis_quota_exceeded/);
});

test("Pro remains unlimited only while Stripe-backed entitlement is active", async () => {
  const { migration } = await sources();
  assert.match(migration, /v_subscription_status in \('active', 'trialing'\) and v_period_end > now\(\)/);
  assert.match(migration, /v_plan in \('pro', 'business'\)/);
});

test("reruns use the same analysis reservation path", async () => {
  const { actions } = await sources();
  assert.match(actions, /return runAnalysis\(analysis\.website, \{/);
  assert.match(actions, /source: "rerun"/);
  assert.match(actions, /status: "processing"/);
});

test("Ask SalesBrief denies Free access and atomically limits Starter to ten questions per brief", async () => {
  const { migration, assistantRoute } = await sources();
  assert.match(assistantRoute, /subscription\.plan === "free"/);
  assert.match(assistantRoute, /getCurrentSubscriptionState\(\)/);
  assert.match(assistantRoute, /analysis_assistant_usage/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\(new\.user_id::text \|\| ':' \|\| new\.analysis_id::text\)\)/);
  assert.match(migration, /v_question_count >= 10/);
  assert.match(migration, /starter_ask_salesbrief_quota_exceeded/);
  assert.match(migration, /ask_salesbrief_not_available/);
});

test("question reservations are completed only after success and released after failures", async () => {
  const { assistantRoute } = await sources();
  assert.match(assistantRoute, /status: "completed"/);
  assert.match(assistantRoute, /\.delete\(\).*status", "reserved"/s);
});

test("interrupted requests cannot retain quota indefinitely", async () => {
  const { recoveryMigration } = await sources();
  assert.match(recoveryMigration, /stale\.status = 'processing'.*interval '15 minutes'/);
  assert.match(recoveryMigration, /stale\.status = 'reserved'.*interval '15 minutes'/);
});
