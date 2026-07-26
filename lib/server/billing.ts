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

export async function createCheckoutSession() {
  const { supabase, user } = await getBillingUser();
  if (!env.STRIPE_PRICE_ID) {
    throw new Error("Stripe price is not configured.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${getSiteUrl()}/dashboard?checkout=success`,
    cancel_url: `${getSiteUrl()}/dashboard?checkout=canceled`,
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id } },
    ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
  });

  if (!session.url) {
    throw new Error("Unable to create a Checkout session.");
  }
  redirect(session.url);
}

export async function createCheckoutSessionUrl() {
  console.info("[billing] checkout action started", { stage: "checkout" });
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    console.info("[billing] authenticated user checked", { stage: "checkout", userExists: Boolean(user) });
    if (!user) return { success: false, error: "Please sign in before upgrading." } as const;
    console.info("[billing] Stripe configuration checked", { stage: "checkout", stripePriceIdExists: Boolean(env.STRIPE_PRICE_ID), stripeSecretKeyExists: Boolean(env.STRIPE_SECRET_KEY), siteUrlExists: Boolean(env.NEXT_PUBLIC_SITE_URL) });
    if (!env.STRIPE_PRICE_ID) return { success: false, error: "Upgrade is not configured yet." } as const;
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const session = await getStripe().checkout.sessions.create({ mode: "subscription", line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }], success_url: `${getSiteUrl()}/dashboard?checkout=success`, cancel_url: `${getSiteUrl()}/dashboard?checkout=canceled`, client_reference_id: user.id, subscription_data: { metadata: { user_id: user.id } }, ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }) });
    console.info("[billing] checkout session created", { stage: "checkout", sessionCreated: Boolean(session.id), sessionUrlExists: Boolean(session.url) });
    if (!session.url) return { success: false, error: "Unable to open Stripe Checkout." } as const;
    return { success: true, url: session.url } as const;
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    console.error("[billing] checkout failed", { stage: "checkout", name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Checkout failed.", status: typeof record.statusCode === "number" ? record.statusCode : undefined, code: typeof record.code === "string" ? record.code : undefined });
    return { success: false, error: "Unable to start Stripe Checkout. Please try again." } as const;
  }
}

export async function createCheckoutSessionForPlan(plan: PlanId) {
  let userId: string | undefined;
  let databaseQuerySucceeded = false;
  const selectedPlan = plans[plan];
  if (plan !== "starter" && plan !== "pro") return { ok: false, code: "INVALID_PLAN", message: "This plan is unavailable." } as const;
  if (!selectedPlan.priceId || !selectedPlan.priceId.startsWith("price_")) return { ok: false, code: "PRICE_NOT_CONFIGURED", message: "Stripe Checkout is temporarily unavailable." } as const;
  let siteUrl = "";
  try { siteUrl = getSiteUrl(); new URL(siteUrl); } catch { return { ok: false, code: "INVALID_APP_URL", message: "Stripe Checkout is temporarily unavailable." } as const; }
  try {
    const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, code: "AUTH_REQUIRED", message: "Please sign in before choosing a plan." } as const;
    userId = user.id;
    const { data: profile, error } = await supabase.from("profiles").select("stripe_customer_id, stripe_subscription_status").eq("id", user.id).maybeSingle();
    databaseQuerySucceeded = !error;
    if (error) return { ok: false, code: "DATABASE_ERROR", message: "Billing is temporarily unavailable." } as const;
    if (profile?.stripe_subscription_status === "active" || profile?.stripe_subscription_status === "trialing") return { ok: false, code: "EXISTING_SUBSCRIPTION", message: "You already have an active subscription." } as const;
    const session = await getStripe().checkout.sessions.create({ mode: "subscription", line_items: [{ price: selectedPlan.priceId, quantity: 1 }], success_url: `${siteUrl}/dashboard?checkout=success`, cancel_url: `${siteUrl}/#pricing`, client_reference_id: user.id, metadata: { user_id: user.id, plan }, subscription_data: { metadata: { user_id: user.id, plan } }, ...(profile?.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }) });
    if (!session.url) return { ok: false, code: "STRIPE_ERROR", message: "Stripe Checkout is temporarily unavailable." } as const;
    return { ok: true, url: session.url } as const;
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    console.error("[billing] plan checkout failed", { name: error instanceof Error ? error.name : "UnknownError", type: typeof error, code: typeof record.code === "string" ? record.code : undefined, message: error instanceof Error ? error.message : "Checkout failed.", plan, userId, stripeSecretKeyExists: Boolean(env.STRIPE_SECRET_KEY), selectedPriceIdExists: Boolean(selectedPlan?.priceId), applicationUrl: siteUrl, databaseQuerySucceeded });
    return { ok: false, code: "STRIPE_ERROR", message: "Stripe Checkout is temporarily unavailable." } as const;
  }
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
