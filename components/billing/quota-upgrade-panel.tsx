"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createCheckoutSessionForPlan } from "@/lib/server/billing";

type QuotaUpgradePanelProps = {
  plan: "free" | "starter";
};

const offers = {
  starter: { name: "Starter", price: "$29/month", detail: "10 analyses per billing period" },
  pro: { name: "Pro", price: "$79/month", detail: "Unlimited analyses" },
} as const;

export function QuotaUpgradePanel({ plan }: QuotaUpgradePanelProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"starter" | "pro" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const availableOffers = plan === "starter" ? ["pro"] as const : ["starter", "pro"] as const;

  async function openCheckout(selectedPlan: "starter" | "pro") {
    if (loading) return;
    setLoading(selectedPlan);
    setError(null);
    try {
      const result = await createCheckoutSessionForPlan(selectedPlan);
      if (result.ok && result.action === "checkout" && result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.ok && result.action === "updated") {
        router.refresh();
        return;
      }
      setError("code" in result && process.env.NODE_ENV === "development"
        ? `Checkout failed: ${result.code}`
        : "Stripe Checkout is temporarily unavailable. Please try again.");
    } catch {
      setError("Unable to start Stripe Checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="mt-6 rounded-[1.5rem] border border-blue-400/30 bg-blue-500/10 p-5 sm:p-6" aria-labelledby="quota-upgrade-title">
      <h2 id="quota-upgrade-title" className="text-xl font-semibold text-slate-50">
        {plan === "starter" ? "You’ve used your 10 Starter analyses" : "You’ve used your 3 free analyses"}
      </h2>
      <p className="mt-2 text-sm text-slate-300">
        {plan === "starter" ? "Upgrade to Pro for unlimited sales briefs." : "Choose a plan to keep generating sales briefs."}
      </p>
      <div className={`mt-5 grid gap-4 ${availableOffers.length === 2 ? "md:grid-cols-2" : "max-w-md"}`}>
        {availableOffers.map((offerId) => {
          const offer = offers[offerId];
          return (
            <article key={offerId} className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <h3 className="text-lg font-semibold text-slate-50">{offer.name}</h3>
              <p className="mt-3 text-2xl font-semibold text-slate-50">{offer.price}</p>
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-300"><Check className="size-4 text-blue-300" />{offer.detail}</p>
              <button
                type="button"
                onClick={() => openCheckout(offerId)}
                disabled={loading !== null}
                className="mt-5 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading === offerId ? "Opening checkout..." : `Choose ${offer.name}`}
              </button>
            </article>
          );
        })}
      </div>
      {error ? <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p> : null}
    </section>
  );
}
