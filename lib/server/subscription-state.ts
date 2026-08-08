import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { revokeStripeEntitlementForMissingSubscription, syncStripeSubscription } from "@/lib/server/stripe-subscription-sync";
import { resolvePlanFromStripePriceId } from "@/lib/server/plans";
import { hasActiveStripeEntitlement } from "@/lib/server/stripe-plan-mapping";

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
    .select("plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id, stripe_current_period_start, stripe_current_period_end, stripe_cancel_at_period_end")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Subscription profile query failed: ${profileError.message}`);

  let reconciledProfile = profile;
  let stripeVerificationFailed = false;
  if (profile?.stripe_customer_id) {
    try {
      const subscriptions = (await getStripe().subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 100 })).data;
      const activeSubscription = subscriptions
        .filter((subscription) => subscription.status === "active" || subscription.status === "trialing")
        .sort((left, right) => right.created - left.created)[0];
      if (activeSubscription) {
        await syncStripeSubscription(activeSubscription, { verifiedUserId: user.id });
      } else {
        const endedSubscription = profile.stripe_subscription_id
          ? await getStripe().subscriptions.retrieve(profile.stripe_subscription_id)
          : subscriptions.sort((left, right) => right.created - left.created)[0];
        if (endedSubscription) await syncStripeSubscription(endedSubscription, { verifiedUserId: user.id });
        else await revokeStripeEntitlementForMissingSubscription(user.id, profile.stripe_customer_id);
      }
      const { data: refreshedProfile, error: refreshError } = await supabase
        .from("profiles")
        .select("plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id, stripe_current_period_start, stripe_current_period_end, stripe_cancel_at_period_end")
        .eq("id", user.id)
        .maybeSingle();
      if (refreshError) throw new Error(`Subscription profile refresh failed: ${refreshError.message}`);
      reconciledProfile = refreshedProfile ?? profile;
    } catch (error) {
      stripeVerificationFailed = true;
      console.error("[billing-sync] Stripe reconciliation failed", { userId: user.id, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unable to verify Stripe subscription." });
    }
  }

  const status = reconciledProfile?.stripe_subscription_status ?? null;
  const periodEnd = reconciledProfile?.stripe_current_period_end ?? null;
  const hasStripeCustomer = Boolean(reconciledProfile?.stripe_customer_id);
  const stripeDerivedPlan = hasStripeCustomer ? resolvePlanFromStripePriceId(reconciledProfile?.stripe_price_id ?? null) : null;
  const plan: SubscriptionPlan = hasStripeCustomer && !stripeVerificationFailed && hasActiveStripeEntitlement(status, periodEnd) && stripeDerivedPlan ? stripeDerivedPlan : "free";
  const { count: totalAnalyses, error: countError } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed");
  if (countError) throw new Error(`Analysis usage query failed: ${countError.message}`);

  const periodStart = reconciledProfile?.stripe_current_period_start ?? null;
  let analysesUsed = totalAnalyses ?? 0;
  if (plan === "starter") {
    const { count, error } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").gte("created_at", periodStart ?? new Date(0).toISOString()).lte("created_at", periodEnd!);
    if (error) throw new Error(`Billing-period usage query failed: ${error.message}`);
    analysesUsed = count ?? 0;
  }

  const analysesLimit = plan === "free" ? 3 : plan === "starter" ? 10 : null;
  const analysesRemaining = analysesLimit === null ? null : Math.max(0, analysesLimit - analysesUsed);
  const state = { userId: user.id, plan, status, isActive: plan !== "free", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: Boolean(reconciledProfile?.stripe_cancel_at_period_end), stripePriceId: reconciledProfile?.stripe_price_id ?? null, analysesUsed, analysesLimit, analysesRemaining, totalAnalyses: totalAnalyses ?? 0 };
  console.info("[subscription-state] profile loaded", { authenticatedUserId: state.userId, profilePlan: reconciledProfile?.plan ?? null, stripeDerivedPlan, subscriptionStatus: status, stripePriceId: state.stripePriceId, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, normalizedPlan: state.plan, stripeVerificationFailed });
  return state;
}
