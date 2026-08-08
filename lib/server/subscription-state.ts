import "server-only";

import type Stripe from "stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { revokeStripeEntitlementForMissingSubscription, syncStripeSubscription } from "@/lib/server/stripe-subscription-sync";
import { resolvePlanFromStripePriceId } from "@/lib/server/plans";
import { hasActiveStripeEntitlement, isStripeCancellationScheduled, selectAuthoritativeActiveSubscription } from "@/lib/server/stripe-plan-mapping";

export type SubscriptionPlan = "free" | "starter" | "pro" | "business";

export type SubscriptionState = {
  userId: string;
  plan: SubscriptionPlan;
  status: string | null;
  isActive: boolean;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
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
  let authoritativeSubscription: Stripe.Subscription | null = null;
  if (profile?.stripe_customer_id) {
    try {
      const subscriptions = (await getStripe().subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 100 })).data;
      console.info("[subscription-presentation-debug] Stripe subscriptions queried", { customerId: profile.stripe_customer_id, subscriptions: subscriptions.map((subscription) => ({ subscriptionId: subscription.id, status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end, cancelAt: subscription.cancel_at, canceledAt: subscription.canceled_at, currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null, priceId: subscription.items.data[0]?.price.id ?? null, customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id })) });
      const activeSubscription = selectAuthoritativeActiveSubscription(subscriptions);
      if (activeSubscription) {
        authoritativeSubscription = activeSubscription;
        console.info("[subscription-presentation-debug] Stripe subscription authoritative", { subscriptionId: activeSubscription.id, status: activeSubscription.status, cancelAtPeriodEnd: activeSubscription.cancel_at_period_end, cancelAt: activeSubscription.cancel_at, canceledAt: activeSubscription.canceled_at, currentPeriodEnd: activeSubscription.items.data[0]?.current_period_end ? new Date(activeSubscription.items.data[0].current_period_end * 1000).toISOString() : null, priceId: activeSubscription.items.data[0]?.price.id ?? null, customerId: typeof activeSubscription.customer === "string" ? activeSubscription.customer : activeSubscription.customer.id, plan: resolvePlanFromStripePriceId(activeSubscription.items.data[0]?.price.id ?? null) });
        await syncStripeSubscription(activeSubscription, { verifiedUserId: user.id });
      } else {
        const endedSubscription = profile.stripe_subscription_id
          ? await getStripe().subscriptions.retrieve(profile.stripe_subscription_id)
          : subscriptions.sort((left, right) => right.created - left.created)[0];
        if (endedSubscription) {
          authoritativeSubscription = endedSubscription;
          console.info("[subscription-presentation-debug] Stripe subscription authoritative", { subscriptionId: endedSubscription.id, status: endedSubscription.status, cancelAtPeriodEnd: endedSubscription.cancel_at_period_end, cancelAt: endedSubscription.cancel_at, canceledAt: endedSubscription.canceled_at, currentPeriodEnd: endedSubscription.items.data[0]?.current_period_end ? new Date(endedSubscription.items.data[0].current_period_end * 1000).toISOString() : null, priceId: endedSubscription.items.data[0]?.price.id ?? null, customerId: typeof endedSubscription.customer === "string" ? endedSubscription.customer : endedSubscription.customer.id, plan: resolvePlanFromStripePriceId(endedSubscription.items.data[0]?.price.id ?? null) });
          await syncStripeSubscription(endedSubscription, { verifiedUserId: user.id });
        }
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

  const authoritativeItem = authoritativeSubscription?.items.data[0];
  const status = authoritativeSubscription?.status ?? reconciledProfile?.stripe_subscription_status ?? null;
  const periodEnd = authoritativeItem?.current_period_end ? new Date(authoritativeItem.current_period_end * 1000).toISOString() : reconciledProfile?.stripe_current_period_end ?? null;
  const hasStripeCustomer = Boolean(authoritativeSubscription || reconciledProfile?.stripe_customer_id);
  const stripePriceId = authoritativeItem?.price.id ?? reconciledProfile?.stripe_price_id ?? null;
  const stripeDerivedPlan = hasStripeCustomer ? resolvePlanFromStripePriceId(stripePriceId) : null;
  const plan: SubscriptionPlan = hasStripeCustomer && !stripeVerificationFailed && hasActiveStripeEntitlement(status, periodEnd) && stripeDerivedPlan ? stripeDerivedPlan : "free";
  const { count: totalAnalyses, error: countError } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed");
  if (countError) throw new Error(`Analysis usage query failed: ${countError.message}`);

  const periodStart = authoritativeItem?.current_period_start ? new Date(authoritativeItem.current_period_start * 1000).toISOString() : reconciledProfile?.stripe_current_period_start ?? null;
  let analysesUsed = totalAnalyses ?? 0;
  if (plan === "starter") {
    const { count, error } = await supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").gte("created_at", periodStart ?? new Date(0).toISOString()).lte("created_at", periodEnd!);
    if (error) throw new Error(`Billing-period usage query failed: ${error.message}`);
    analysesUsed = count ?? 0;
  }

  const analysesLimit = plan === "free" ? 3 : plan === "starter" ? 10 : null;
  const analysesRemaining = analysesLimit === null ? null : Math.max(0, analysesLimit - analysesUsed);
  const stripeCustomerId = authoritativeSubscription ? (typeof authoritativeSubscription.customer === "string" ? authoritativeSubscription.customer : authoritativeSubscription.customer.id) : reconciledProfile?.stripe_customer_id ?? null;
  const cancelAtPeriodEnd = authoritativeSubscription ? isStripeCancellationScheduled({ status: authoritativeSubscription.status, cancelAtPeriodEnd: authoritativeSubscription.cancel_at_period_end, cancelAt: authoritativeSubscription.cancel_at }) : Boolean(reconciledProfile?.stripe_cancel_at_period_end);
  const state = { userId: user.id, plan, status, isActive: plan !== "free", currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, cancelAtPeriodEnd, stripeSubscriptionId: authoritativeSubscription?.id ?? reconciledProfile?.stripe_subscription_id ?? null, stripeCustomerId, stripePriceId, analysesUsed, analysesLimit, analysesRemaining, totalAnalyses: totalAnalyses ?? 0 };
  console.info("[subscription-presentation-debug] Final SubscriptionState", { subscriptionId: state.stripeSubscriptionId, stripeCustomerId: state.stripeCustomerId, status: state.status, cancelAtPeriodEnd: state.cancelAtPeriodEnd, currentPeriodEnd: state.currentPeriodEnd, plan: state.plan });
  console.info("[subscription-state] profile loaded", { authenticatedUserId: state.userId, profilePlan: reconciledProfile?.plan ?? null, stripeDerivedPlan, subscriptionStatus: status, stripePriceId: state.stripePriceId, currentPeriodStart: periodStart, currentPeriodEnd: periodEnd, normalizedPlan: state.plan, stripeVerificationFailed });
  return state;
}
