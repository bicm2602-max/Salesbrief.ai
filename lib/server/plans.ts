import "server-only";
import { env } from "@/lib/env";
export type PlanId = "starter" | "pro" | "business";
export const plans = { starter: { priceId: env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID, limit: 10 }, pro: { priceId: env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID, limit: null }, business: { priceId: env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID, limit: null } } as const;
export function planFromPrice(priceId: string): PlanId | "free" { return (Object.entries(plans).find(([, plan]) => plan.priceId === priceId)?.[0] as PlanId | undefined) ?? "free"; }
