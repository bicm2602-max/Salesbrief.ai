import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";
import { validateStripePlanConfiguration } from "@/lib/server/plans";

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured.");
  }
  validateStripePlanConfiguration();
  return new Stripe(env.STRIPE_SECRET_KEY);
}

export function getSiteUrl() {
  if (!env.NEXT_PUBLIC_SITE_URL) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
  }
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
}
