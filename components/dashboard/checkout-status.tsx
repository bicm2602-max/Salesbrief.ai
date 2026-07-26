"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { resyncSubscriptionForCurrentUser } from "@/lib/server/billing";

export function CheckoutStatus({ checkoutReturned, activePlan }: { checkoutReturned: boolean; activePlan: "starter" | "pro" | "business" | null }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!checkoutReturned || activePlan) return;
    const refreshes = [1500, 4000, 8000].map((delay) => window.setTimeout(() => router.refresh(), delay));
    return () => refreshes.forEach((timeout) => window.clearTimeout(timeout));
  }, [activePlan, checkoutReturned, router]);

  React.useEffect(() => {
    if (checkoutReturned) router.refresh();
  }, [checkoutReturned, router]);

  if (!checkoutReturned) return null;
  if (activePlan) return <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Welcome to {activePlan.charAt(0).toUpperCase() + activePlan.slice(1)} — your subscription is active.</p>;
  async function refreshSubscription() {
    if (refreshing) return;
    setRefreshing(true);
    setError(null);
    const result = await resyncSubscriptionForCurrentUser();
    if (!result.ok) setError(result.message);
    router.refresh();
    setRefreshing(false);
  }

  return <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100"><p>Payment received. We’re activating your plan now.</p><button type="button" onClick={refreshSubscription} disabled={refreshing} className="mt-3 rounded-full border border-blue-300/30 px-3 py-1.5 text-sm font-medium text-blue-100 transition hover:bg-blue-300/10 disabled:cursor-not-allowed disabled:opacity-60">{refreshing ? "Refreshing..." : "Refresh subscription"}</button>{error ? <p className="mt-2 text-rose-200" role="alert">{error}</p> : null}</div>;
}
