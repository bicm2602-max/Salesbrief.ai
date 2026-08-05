"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { getSiteUrl, getStripe } from "@/lib/stripe";
import { plans, type PlanId } from "@/lib/server/plans";
import { syncStripeSubscription } from "@/lib/server/stripe-subscription-sync";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";

async function getBillingUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createCheckoutSessionForPlan(plan: PlanId) {
  let userId: string | undefined;
  let databaseQuerySucceeded = false;
  const selectedPlan = plans[plan];
  if (plan !== "starter" && plan !== "pro" && plan !== "business") return { ok: false, code: "INVALID_PLAN", message: "This plan is unavailable." } as const;
  if (!selectedPlan.priceId || !selectedPlan.priceId.startsWith("price_")) return { ok: false, code: "PRICE_NOT_CONFIGURED", message: "Stripe Checkout is temporarily unavailable." } as const;
  let siteUrl = "";
  try { siteUrl = getSiteUrl(); new URL(siteUrl); } catch { return { ok: false, code: "INVALID_APP_URL", message: "Stripe Checkout is temporarily unavailable." } as const; }
  try {
    const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, code: "AUTH_REQUIRED", message: "Please sign in before choosing a plan." } as const;
    userId = user.id;
    const { data: profile, error } = await supabase.from("profiles").select("plan, stripe_customer_id, stripe_subscription_id, stripe_subscription_status").eq("id", user.id).maybeSingle();
    databaseQuerySucceeded = !error;
    if (error) return { ok: false, code: "DATABASE_ERROR", message: "Billing is temporarily unavailable." } as const;
    const stripe = getStripe();
    const customerId = profile?.stripe_customer_id ?? null;
    const activeSubscriptions = customerId
      ? (await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 })).data
        .filter((subscription) => subscription.status === "active" || subscription.status === "trialing")
        .sort((left, right) => right.created - left.created)
      : [];

    if (activeSubscriptions.length) {
      const [existing, ...duplicates] = activeSubscriptions;
      for (const duplicate of duplicates) {
        await stripe.subscriptions.cancel(duplicate.id, { invoice_now: false, prorate: false });
        console.warn("[billing] duplicate active subscription canceled", { userId: user.id, customerId, canceledSubscriptionId: duplicate.id, retainedSubscriptionId: existing.id });
      }

      const existingPlan = plans.starter.priceId === existing.items.data[0]?.price.id ? "starter"
        : plans.pro.priceId === existing.items.data[0]?.price.id ? "pro"
          : plans.business.priceId === existing.items.data[0]?.price.id ? "business"
            : "free";
      if (existingPlan === plan) return { ok: false, code: "CURRENT_PLAN", message: "This is already your current plan." } as const;
      const item = existing.items.data[0];
      if (!item) return { ok: false, code: "STRIPE_ERROR", message: "Your active subscription could not be updated." } as const;

      const updated = await stripe.subscriptions.update(existing.id, {
        items: [{ id: item.id, price: selectedPlan.priceId }],
        proration_behavior: "always_invoice",
        metadata: { ...existing.metadata, user_id: user.id, plan },
      });
      // The verified Stripe webhook is the billing source of truth for Supabase.
      // Do not persist a client-triggered plan change before that webhook arrives.
      console.info("[billing] subscription updated in Stripe", { userId: user.id, customerId, subscriptionId: updated.id, selectedPlan: plan });
      revalidatePath("/");
      revalidatePath("/dashboard");
      return { ok: true, action: "updated", plan } as const;
    }
    if (plan === "business") return { ok: false, code: "INVALID_PLAN", message: "Business plans are not available yet." } as const;
    const session = await getStripe().checkout.sessions.create({ mode: "subscription", line_items: [{ price: selectedPlan.priceId, quantity: 1 }], success_url: `${siteUrl}/dashboard?checkout=success`, cancel_url: `${siteUrl}/dashboard?checkout=canceled`, client_reference_id: user.id, metadata: { user_id: user.id, plan }, subscription_data: { metadata: { user_id: user.id, plan } }, ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }) });
    if (!session.url) return { ok: false, code: "STRIPE_ERROR", message: "Stripe Checkout is temporarily unavailable." } as const;
    return { ok: true, action: "checkout", url: session.url } as const;
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    console.error("[billing] plan checkout failed", { name: error instanceof Error ? error.name : "UnknownError", type: typeof error, code: typeof record.code === "string" ? record.code : undefined, message: error instanceof Error ? error.message : "Checkout failed.", plan, userId, stripeSecretKeyExists: Boolean(env.STRIPE_SECRET_KEY), selectedPriceIdExists: Boolean(selectedPlan?.priceId), applicationUrl: siteUrl, databaseQuerySucceeded });
    return { ok: false, code: "STRIPE_ERROR", message: "Stripe Checkout is temporarily unavailable." } as const;
  }
}

export async function getPricingSubscriptionState() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authenticated: false, plan: "free" as const };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error) return { authenticated: true, plan: "free" as const };
  const active = profile?.stripe_subscription_status === "active" || profile?.stripe_subscription_status === "trialing";
  const plan = active && (profile?.plan === "starter" || profile?.plan === "pro" || profile?.plan === "business") ? profile.plan : "free";
  return { authenticated: true, plan } as const;
}

export async function createCustomerPortalSession() {
  const { supabase, user } = await getBillingUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    redirect("/dashboard");
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getSiteUrl()}/dashboard`,
  });
  redirect(session.url);
}

export async function resyncSubscriptionForCurrentUser() {
  try {
    const { supabase, user } = await getBillingUser();
    const { data: profile, error } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    if (error) return { ok: false, code: "DATABASE_ERROR", message: "Unable to check your billing profile." } as const;

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id ?? null;
    let recoveredFromEmail = false;
    if (!customerId && user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 10 });
      for (const customer of customers.data) {
        const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 10 });
        if (subscriptions.data.some((subscription) => subscription.metadata.user_id === user.id)) {
          customerId = customer.id;
          recoveredFromEmail = true;
          break;
        }
      }
    }
    if (!customerId) return { ok: false, code: "NO_CUSTOMER", message: "No Stripe customer is available to synchronize." } as const;

    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const subscription = subscriptions.data.find((item) => item.status === "active" || item.status === "trialing") ?? subscriptions.data[0];
    if (!subscription) return { ok: false, code: "NO_SUBSCRIPTION", message: "No Stripe subscription is available to synchronize." } as const;
    if (recoveredFromEmail && subscription.metadata.user_id !== user.id) return { ok: false, code: "OWNERSHIP_UNVERIFIED", message: "Your Stripe subscription could not be verified." } as const;

    const synced = await syncStripeSubscription(subscription, { verifiedUserId: user.id });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/new-analysis");
    revalidatePath("/dashboard/settings");
    const state = await getCurrentSubscriptionState();
    console.info("[billing] authenticated subscription resynchronized", { userId: user.id, stripeCustomerId: synced.customerId, stripeSubscriptionId: synced.subscriptionId, stripePriceId: synced.priceId, resolvedPlan: synced.plan, subscriptionStatus: synced.status, recoveredFromEmail });
    return { ok: true, state } as const;
  } catch (error) {
    console.error("[billing] subscription resync failed", { name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Subscription synchronization failed." });
    return { ok: false, code: "SYNC_FAILED", message: "Unable to refresh your subscription. Please try again." } as const;
  }
}
