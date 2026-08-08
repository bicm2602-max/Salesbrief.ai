export type StripePlanPriceIds = {
  starter: string;
  pro: string;
  business: string;
};

export function isStripePlanId(value: string): value is keyof StripePlanPriceIds {
  return value === "starter" || value === "pro" || value === "business";
}

export function resolvePlanFromStripePriceId(priceId: string | null, priceIds: StripePlanPriceIds): keyof StripePlanPriceIds | null {
  if (!priceId) return null;
  return (Object.entries(priceIds).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0] as keyof StripePlanPriceIds | undefined) ?? null;
}

export function shouldIgnoreStaleInactiveSubscription(input: { storedSubscriptionId: string | null; storedStatus: string | null; incomingSubscriptionId: string; incomingStatus: string }) {
  const storedIsActive = input.storedStatus === "active" || input.storedStatus === "trialing";
  const incomingIsInactive = input.incomingStatus !== "active" && input.incomingStatus !== "trialing";
  return incomingIsInactive && storedIsActive && Boolean(input.storedSubscriptionId) && input.storedSubscriptionId !== input.incomingSubscriptionId;
}

export function hasActiveStripeEntitlement(status: string | null, currentPeriodEnd: string | null, now = Date.now()) {
  return (status === "active" || status === "trialing") && Boolean(currentPeriodEnd) && new Date(currentPeriodEnd!).getTime() > now;
}

export function isStripeCancellationScheduled(input: { status: string; cancelAtPeriodEnd: boolean; cancelAt: number | null; now?: number }) {
  const isActive = input.status === "active" || input.status === "trialing";
  const cancelAtIsFuture = input.cancelAt !== null && input.cancelAt * 1000 > (input.now ?? Date.now());
  return isActive && (input.cancelAtPeriodEnd || cancelAtIsFuture);
}

type ActiveStripeSubscription = {
  status: string;
  created: number;
};

/**
 * Stripe can retain historical subscriptions for a customer. Entitlements must
 * always be based on the most recently created active or trialing subscription,
 * never a stale canceled record or an arbitrary list position.
 */
export function selectAuthoritativeActiveSubscription<T extends ActiveStripeSubscription>(subscriptions: T[]): T | null {
  return subscriptions
    .filter((subscription) => subscription.status === "active" || subscription.status === "trialing")
    .sort((left, right) => right.created - left.created)[0] ?? null;
}

export function resolveStripePlanPriceIds(priceIds: StripePlanPriceIds): StripePlanPriceIds {
  const entries = Object.entries(priceIds) as Array<[keyof StripePlanPriceIds, string]>;
  for (const [plan, priceId] of entries) {
    if (!priceId) throw new Error(`Stripe configuration error: STRIPE_${plan.toUpperCase()}_PRICE_ID is required.`);
    if (!priceId.startsWith("price_")) throw new Error(`Stripe configuration error: STRIPE_${plan.toUpperCase()}_PRICE_ID must be a Stripe Price ID.`);
  }
  if (new Set(entries.map(([, priceId]) => priceId)).size !== entries.length) {
    throw new Error("Stripe configuration error: Starter, Pro, and Business Price IDs must all be different.");
  }
  return priceIds;
}
