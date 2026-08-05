import "server-only";

import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { planFromPrice, type PlanId } from "@/lib/server/plans";

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
  const plan = subscription.status === "active" || subscription.status === "trialing" ? planFromPrice(priceId ?? "") : "free";
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

  const incomingIsInactive = subscription.status !== "active" && subscription.status !== "trialing";
  const storedIsActive = existingProfile?.stripe_subscription_status === "active" || existingProfile?.stripe_subscription_status === "trialing";
  if (incomingIsInactive && storedIsActive && existingProfile?.stripe_subscription_id && existingProfile.stripe_subscription_id !== subscription.id) {
    console.info("[stripe-sync] ignored stale inactive subscription event", { incomingSubscriptionId: subscription.id, retainedSubscriptionId: existingProfile.stripe_subscription_id, userId });
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
      stripe_cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (updateError) throw new Error(`Supabase subscription update failed: ${updateError.message}`);
  if (!updatedProfile) throw new Error("Supabase profile was not found for the resolved user.");

  return { customerId, subscriptionId: subscription.id, priceId, plan, userId, status: subscription.status, periodStart, periodEnd };
}
