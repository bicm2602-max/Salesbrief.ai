import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { getStripe } from "@/lib/stripe";
import { syncStripeSubscription } from "@/lib/server/stripe-subscription-sync";
import { planFromPrice } from "@/lib/server/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncAndLog(event: Stripe.Event, subscription: Stripe.Subscription, clientReferenceId?: string | null) {
  const item = subscription.items.data[0];
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = item?.price.id ?? null;
  console.info("[stripe-webhook] subscription sync started", { eventType: event.type, eventId: event.id, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, stripePriceId: priceId, resolvedPlan: planFromPrice(priceId ?? ""), metadataUserId: subscription.metadata.user_id || null, clientReferenceId: clientReferenceId ?? null, subscriptionStatus: subscription.status, periodStart: item?.current_period_start ? new Date(item.current_period_start * 1000).toISOString() : null, periodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null });
  const result = await syncStripeSubscription(subscription, { clientReferenceId });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/new-analysis");
  console.info("[stripe-webhook] subscription synchronized", { eventType: event.type, eventId: event.id, stripeCustomerId: result.customerId, stripeSubscriptionId: result.subscriptionId, stripePriceId: result.priceId, resolvedPlan: result.plan, resolvedUserId: result.userId, subscriptionStatus: result.status, periodStart: result.periodStart, periodEnd: result.periodEnd, supabaseUpdateSuccess: true });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Webhook secret is not configured.", { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  console.info("[stripe-webhook] verification started", { signatureHeaderPresent: Boolean(signature), bodyLength: rawBody.length });
  if (!signature) return new Response("Missing Stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.info("[stripe-webhook] verification succeeded", { verifiedEventType: event.type });
  } catch (error) {
    console.error("[stripe-webhook] verification failed", { signatureHeaderPresent: true, bodyLength: rawBody.length, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Invalid Stripe signature." });
    return new Response("Invalid Stripe signature.", { status: 400 });
  }

  try {
    console.info("[stripe-webhook] event received", { eventType: event.type, eventId: event.id });
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        const subscription = await getStripe().subscriptions.retrieve(session.subscription);
        await syncAndLog(event, subscription, session.metadata?.user_id ?? session.client_reference_id);
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      await syncAndLog(event, event.data.object as Stripe.Subscription);
    }
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = (invoice as unknown as { parent?: { subscription_details?: { subscription?: string } } }).parent?.subscription_details?.subscription;
      if (typeof subscriptionId === "string") await syncAndLog(event, await getStripe().subscriptions.retrieve(subscriptionId));
    }
  } catch (error) {
    console.error("[stripe-webhook] synchronization failed", { eventType: event.type, eventId: event.id, name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Webhook processing failed." });
    return new Response("Webhook processing failed.", { status: 500 });
  }

  return Response.json({ received: true });
}
