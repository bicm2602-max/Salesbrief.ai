import "server-only";

import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { resolvePlanFromStripePriceId, type PlanId } from "@/lib/server/plans";
import { isStripeCancellationScheduled, shouldIgnoreStaleInactiveSubscription } from "@/lib/server/stripe-plan-mapping";

type SyncOptions = {
  clientReferenceId?: string | null;
  verifiedUserId?: string;
};

export type SubscriptionSyncResult = {
  customerId: string;
  subscriptionId: string;
  priceId: string | null;
  plan: PlanId | "free";
  userId: string;
  status: string;
  periodStart: string | null;
  periodEnd: string | null;
};

export async function syncStripeSubscription(subscription: Stripe.Subscription, options: SyncOptions = {}): Promise<SubscriptionSyncResult> {
  const admin = createAdminSupabaseClient();
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? null;
  const periodStart = item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null;
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const isStripeActive = subscription.status === "active" || subscription.status === "trialing";
  const cancellationScheduled = isStripeCancellationScheduled({ status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end, cancelAt: subscription.cancel_at });
  const stripePlan = resolvePlanFromStripePriceId(priceId);
  let plan: PlanId | "free";
  if (isStripeActive) {
    if (!stripePlan) throw new Error(`Unknown active Stripe Price ID: ${priceId ?? "missing"}.`);
    plan = stripePlan;
  } else {
    plan = "free";
    console.info("[billing-sync] subscription canceled", { subscriptionId: subscription.id, priceId, stripeStatus: subscription.status });
  }
  const metadataUserId = subscription.metadata.user_id;
  let userId = metadataUserId || options.clientReferenceId || options.verifiedUserId;

  if (!userId) {
    const { data: profile, error } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    if (error) throw new Error(`Supabase customer lookup failed: ${error.message}`);
    if (!profile) throw new Error("No Supabase profile matches this Stripe customer.");
    userId = profile.id;
  }

  if (options.verifiedUserId && userId !== options.verifiedUserId) {
    throw new Error("Stripe subscription ownership could not be verified.");
  }
  if (!userId) throw new Error("No Supabase user could be resolved for this subscription.");

  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id, plan, stripe_subscription_id, stripe_subscription_status, stripe_price_id, stripe_current_period_start, stripe_current_period_end")
    .eq("id", userId)
    .maybeSingle();
  if (existingProfileError) throw new Error(`Supabase subscription lookup failed: ${existingProfileError.message}`);

  if (existingProfile && shouldIgnoreStaleInactiveSubscription({ storedSubscriptionId: existingProfile.stripe_subscription_id ?? null, storedStatus: existingProfile.stripe_subscription_status ?? null, incomingSubscriptionId: subscription.id, incomingStatus: subscription.status })) {
    console.info("[stripe-sync] ignored stale inactive subscription event", { incomingSubscriptionId: subscription.id, retainedSubscriptionId: existingProfile?.stripe_subscription_id ?? null, userId });
    return {
      customerId,
      subscriptionId: existingProfile.stripe_subscription_id,
      priceId: existingProfile.stripe_price_id,
      plan: existingProfile.plan === "starter" || existingProfile.plan === "pro" || existingProfile.plan === "business" ? existingProfile.plan : "free",
      userId,
      status: existingProfile.stripe_subscription_status,
      periodStart: existingProfile.stripe_current_period_start,
      periodEnd: existingProfile.stripe_current_period_end,
    };
  }

  console.info("[billing-sync] stripe subscription authoritative", { userId, subscriptionId: subscription.id, priceId, oldSupabasePlan: existingProfile?.plan ?? null, stripeDerivedPlan: plan });
  if (existingProfile?.plan !== plan) console.info("[billing-sync] correcting Supabase plan", { userId, subscriptionId: subscription.id, priceId, oldSupabasePlan: existingProfile?.plan ?? null, stripeDerivedPlan: plan });
  if (cancellationScheduled) console.info("[billing-sync] cancellation scheduled", { userId, subscriptionId: subscription.id, priceId, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: subscription.cancel_at_period_end, cancelAt: subscription.cancel_at });
  if (!isStripeActive && existingProfile?.plan !== "free") console.info("[billing-sync] entitlement revoked", { userId, subscriptionId: subscription.id, priceId, oldSupabasePlan: existingProfile?.plan ?? null });

  const { data: updatedProfile, error: updateError } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_subscription_status: subscription.status,
      stripe_price_id: priceId,
      plan,
      stripe_current_period_start: periodStart,
      stripe_current_period_end: periodEnd,
      stripe_cancel_at_period_end: cancellationScheduled,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(`Supabase subscription update failed: ${updateError.message}`);
  if (!updatedProfile) throw new Error("Supabase profile was not found for the resolved user.");
  console.info("[billing-sync] profile synchronized", { userId, subscriptionId: subscription.id, priceId, oldSupabasePlan: existingProfile?.plan ?? null, stripeDerivedPlan: plan });

  return { customerId, subscriptionId: subscription.id, priceId, plan, userId, status: subscription.status, periodStart, periodEnd };
}

export async function revokeStripeEntitlementForMissingSubscription(userId: string, customerId: string) {
  const admin = createAdminSupabaseClient();
  const { data: existingProfile, error: lookupError } = await admin
    .from("profiles")
    .select("plan, stripe_subscription_id, stripe_price_id")
    .eq("id", userId)
    .maybeSingle();
  if (lookupError) throw new Error(`Supabase subscription lookup failed: ${lookupError.message}`);
  const { error: updateError } = await admin
    .from("profiles")
    .update({ plan: "free", stripe_customer_id: customerId, stripe_subscription_id: null, stripe_subscription_status: "canceled", stripe_price_id: null, stripe_current_period_start: null, stripe_current_period_end: null, stripe_cancel_at_period_end: false })
    .eq("id", userId);
  if (updateError) throw new Error(`Supabase subscription revocation failed: ${updateError.message}`);
  console.info("[billing-sync] subscription canceled", { userId, subscriptionId: existingProfile?.stripe_subscription_id ?? null, priceId: existingProfile?.stripe_price_id ?? null, stripeStatus: "missing" });
  if (existingProfile?.plan !== "free") console.info("[billing-sync] entitlement revoked", { userId, subscriptionId: existingProfile?.stripe_subscription_id ?? null, priceId: existingProfile?.stripe_price_id ?? null, oldSupabasePlan: existingProfile?.plan ?? null });
  console.info("[billing-sync] profile synchronized", { userId, subscriptionId: null, priceId: null, oldSupabasePlan: existingProfile?.plan ?? null, stripeDerivedPlan: "free" });
}
