import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SubscriptionPlan = "free" | "starter" | "pro" | "business";

export type SubscriptionState = {
  userId: string;
  plan: SubscriptionPlan;
  status: string | null;
  isActive: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripePriceId: string | null;
  analysesUsed: number;
  analysesLimit: number | null;
  analysesRemaining: number | null;
  totalAnalyses: number;
};

export async function getCurrentSubscriptionState(): Promise<SubscriptionState | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_status, stripe_price_id, stripe_current_period_start, stripe_current_period_end, stripe_cancel_at_period_end")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Subscription profile query failed: ${profileError.message}`);

  const status = profile?.stripe_subscription_status ?? null;
  const configuredPlan = profile?.plan;
  const periodEnd = profile?.stripe_current_period_end ?? null;
  const activeStatus = status === "active" || status === "trialing";
  const validPeriod = !!periodEnd && new Date(periodEnd).getTime() > Date.now();
  const plan: SubscriptionPlan = activeStatus && validPeriod && (configuredPlan === "starter" || configuredPlan === "pro" || configuredPlan === "business") ? configuredPlan : "free";
  const { count: totalAnalyses, error: countError } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed");
  if (countError) throw new Error(`Analysis usage query failed: ${countError.message}`);

  const periodStart = profile?.stripe_current_period_start ?? null;
  let analysesUsed = totalAnalyses ?? 0;
  if (plan === "starter") {
    const { count, error } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").gte("created_at", periodStart ?? new Date(0).toISOString()).lte("created_at", periodEnd!);
    if (error) throw new Error(`Billing-period usage query failed: ${error.message}`);
    analysesUsed = count ?? 0;
  }

  const analysesLimit = plan === "free" ? 3 : plan === "starter" ? 10 : null;
  const analysesRemaining = analysesLimit === null ? null : Math.max(0, analysesLimit - analysesUsed);
  const state = { userId: user.id, plan, status, isActive: plan !== "free", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: Boolean(profile?.stripe_cancel_at_period_end), stripePriceId: profile?.stripe_price_id ?? null, analysesUsed, analysesLimit, analysesRemaining, totalAnalyses: totalAnalyses ?? 0 };
  console.info("[subscription-state] profile loaded", { authenticatedUserId: state.userId, plan: configuredPlan ?? null, subscriptionStatus: status, stripePriceId: state.stripePriceId, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, normalizedPlan: state.plan });
  return state;
}
