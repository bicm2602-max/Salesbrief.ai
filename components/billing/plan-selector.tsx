"use client";

import * as React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { createCheckoutSessionForPlan, createCustomerPortalSession } from "@/lib/server/billing";

type Plan = "free" | "starter" | "pro" | "business";
type PurchasablePlan = "starter" | "pro" | "business";

const offers = [
  { id: "starter", name: "Starter", price: "$29", features: ["10 briefs per month", "Company analysis", "Email and LinkedIn drafts", "Ask SalesBrief: up to 10 questions per brief"], featured: false },
  { id: "pro", name: "Pro", price: "$79", features: ["Unlimited briefs", "Full company analysis", "Structured buying signals", "Detailed ideal-customer context", "Unlimited Ask SalesBrief", "Advanced outreach variants"], featured: true },
  { id: "business", name: "Business", price: "$199", features: ["Team seats", "Shared workspaces", "API access", "Priority support", "Coming soon"], featured: false },
] as const;

function buttonLabel(currentPlan: Plan, offer: PurchasablePlan) {
  if (currentPlan === offer) return "Current plan";
  if (offer === "business") return "Coming soon";
  if (currentPlan === "starter" && offer === "pro") return "Upgrade to Pro";
  if (currentPlan === "pro" && offer === "starter") return "Downgrade to Starter";
  if (currentPlan === "business") return `Downgrade to ${offer === "starter" ? "Starter" : "Pro"}`;
  return `Choose ${offer === "starter" ? "Starter" : "Pro"}`;
}

export function PlanSelector({ currentPlan }: { currentPlan: Plan }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<PurchasablePlan | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function selectPlan(plan: PurchasablePlan) {
    if (loading || plan === "business" || plan === currentPlan) return;
    setLoading(plan);
    setError(null);
    try {
      const result = await createCheckoutSessionForPlan(plan);
      if (result.ok && result.action === "checkout" && result.url) {
        window.location.assign(result.url);
        return;
      }
      if (result.ok && result.action === "updated") {
        router.replace("/dashboard?upgrade=processing");
        router.refresh();
        return;
      }
      setError("Unable to update your subscription. Please try again.");
    } catch {
      setError("Unable to update your subscription. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight text-slate-50">Choose your plan</h1><p className="mt-2 text-sm leading-7 text-slate-400">Select the plan that fits your sales research workflow.</p></div>
        <Link href="/dashboard" className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">Back to dashboard</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {offers.map((offer) => {
          const isCurrent = currentPlan === offer.id;
          const unavailable = offer.id === "business" && !isCurrent;
          const isLoading = loading === offer.id;
          return <section key={offer.id} className={`flex min-w-0 flex-col rounded-[1.75rem] border p-6 sm:p-8 ${offer.featured ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_0_1px_rgba(37,99,235,0.2)]" : "border-white/10 bg-slate-900/70"}`}>
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-50">{offer.name}</h2>{isCurrent ? <span className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-200">Current plan</span> : offer.featured ? <span className="shrink-0 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200">Most popular</span> : null}</div>
            <p className="mt-5 text-4xl font-semibold text-slate-50">{offer.price}<span className="ml-2 text-sm font-normal text-slate-500">/ month</span></p>
            <ul className="mt-7 space-y-3 text-sm text-slate-300">{offer.features.map((feature) => <li key={feature} className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-blue-300" />{feature}</li>)}</ul>
            <div className="mt-auto pt-8">
              <button type="button" disabled={loading !== null || isCurrent || unavailable} onClick={() => void selectPlan(offer.id)} className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? "Updating subscription..." : buttonLabel(currentPlan, offer.id)}</button>
              {isCurrent && (currentPlan === "pro" || currentPlan === "business") ? <form action={createCustomerPortalSession} className="mt-3"><button type="submit" className="w-full text-sm text-blue-300 transition hover:text-blue-200">Manage subscription</button></form> : null}
            </div>
          </section>;
        })}
      </div>
      {error ? <p className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">{error}</p> : null}
    </div>
  );
}
