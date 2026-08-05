"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  createCheckoutSessionForPlan,
  createCustomerPortalSession,
  getPricingSubscriptionState,
} from "@/lib/server/billing";

type Plan = "free" | "starter" | "pro" | "business";

export function DashboardUpgradeButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getPricingSubscriptionState().then((state) => setPlan(state.plan));
  }, []);

  async function upgradeToPro() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createCheckoutSessionForPlan("pro");
      if (result.ok && result.action === "checkout" && result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.ok && result.action === "updated") {
        router.replace("/dashboard?upgrade=processing");
        router.refresh();
        return;
      }
      if (!result.ok && result.code === "AUTH_REQUIRED") {
        router.push(`/login?next=${encodeURIComponent("/dashboard")}`);
        return;
      }
      setError("Unable to update your subscription. Please try again.");
    } catch {
      setError("Unable to update your subscription. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const className = compact
    ? "text-sm text-blue-300 transition hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";

  if (plan === "pro" || plan === "business") {
    return <form action={createCustomerPortalSession}><button type="submit" className={className}>Manage subscription</button></form>;
  }

  if (plan === "starter") {
    return <div><button type="button" onClick={upgradeToPro} disabled={loading} className={className}>{loading ? "Updating subscription..." : "Upgrade to Pro"}</button>{error ? <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p> : null}</div>;
  }

  return <button type="button" disabled={plan === null} onClick={() => router.push("/#pricing")} className={className}>{plan === null ? "Loading..." : "Upgrade"}</button>;
}
