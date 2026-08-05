import "server-only";
import { env } from "@/lib/env";
import { resolveStripePlanPriceIds } from "@/lib/server/stripe-plan-mapping";
export type PlanId = "starter" | "pro" | "business";

export function getStripePlans() {
  const priceIds = resolveStripePlanPriceIds({ starter: env.STRIPE_STARTER_PRICE_ID, pro: env.STRIPE_PRO_PRICE_ID, business: env.STRIPE_BUSINESS_PRICE_ID });
  return { starter: { priceId: priceIds.starter, limit: 10 }, pro: { priceId: priceIds.pro, limit: null }, business: { priceId: priceIds.business, limit: null } } as const;
}

export function validateStripePlanConfiguration() {
  getStripePlans();
}

export function planFromPrice(priceId: string): PlanId | "free" {
  const plans = getStripePlans();
  return (Object.entries(plans).find(([, plan]) => plan.priceId === priceId)?.[0] as PlanId | undefined) ?? "free";
}
