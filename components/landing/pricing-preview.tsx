"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";
import { createCheckoutSessionForPlan, getPricingSubscriptionState } from "@/lib/server/billing";

const plans = [
  { id: "starter", name: "Starter", price: "$29", description: "For freelancers and solo operators building momentum.", features: ["10 briefs per month", "Company analysis", "Email and LinkedIn drafts", "Ask SalesBrief: up to 10 questions per brief"], featured: false },
  { id: "pro", name: "Pro", price: "$79", description: "For agencies and lean sales teams that need consistency.", features: ["Unlimited briefs", "Full company analysis", "Structured buying signals", "Detailed ideal-customer context", "Unlimited Ask SalesBrief", "Advanced outreach variants"], featured: true },
  { id: "business", name: "Business", price: "$199", description: "For scaling teams that need collaboration and workflow depth.", features: ["Team seats", "Shared workspaces", "API access", "Priority support"], featured: false },
] as const;

export function PricingPreview() {
  const router = useRouter(); const searchParams = useSearchParams(); const selected = searchParams.get("plan"); const selectedPlan = selected === "starter" || selected === "pro" ? selected : null; const [loading, setLoading] = React.useState<string | null>(null); const [error, setError] = React.useState<string | null>(null); const [subscription, setSubscription] = React.useState<{ authenticated: boolean; plan: "free" | "starter" | "pro" | "business" } | null>(null);
  const refreshSubscription = React.useCallback(() => { void getPricingSubscriptionState().then(setSubscription); }, []);
  React.useEffect(() => { refreshSubscription(); }, [refreshSubscription]);
  async function choose(plan: "starter" | "pro" | "business") {
    if (loading) return; setLoading(plan); setError(null);
    try {
      const result = await createCheckoutSessionForPlan(plan);
      if (result.ok && result.action === "checkout" && result.url) { window.location.assign(result.url); return; }
      if (result.ok && result.action === "updated") { router.replace("/dashboard?upgrade=processing"); router.refresh(); return; }
      if (!result.ok && result.code === "AUTH_REQUIRED") { router.push(`/login?next=${encodeURIComponent(`/?plan=${plan}#pricing`)}`); return; }
      setError("code" in result && process.env.NODE_ENV === "development" ? `Checkout failed: ${result.code}` : "Stripe Checkout is temporarily unavailable.");
    } catch { setError("Unable to open checkout. Please try again."); }
    finally { setLoading(null); }
  }
  return <section id="pricing" className="py-24 sm:py-28"><Container><SectionHeading eyebrow="Pricing preview" title="Simple plans designed for serious outreach teams." description="Start small, scale fast, and keep a premium experience as your workflow grows." align="center" className="mx-auto" />
    <div className="mt-12 grid gap-6 lg:grid-cols-3">{plans.map((plan) => { const isCurrent = subscription?.plan === plan.id; const businessUnavailable = plan.id === "business"; const isLoading = loading === plan.id; const label = isCurrent ? "Current plan" : businessUnavailable ? "Coming soon" : subscription?.plan === "starter" && plan.id === "pro" ? "Upgrade to Pro" : isLoading ? "Opening checkout..." : `Choose ${plan.name}`; return <div key={plan.id} className={`flex flex-col rounded-[1.75rem] border p-8 ${selectedPlan === plan.id ? "border-blue-400 bg-blue-500/10" : plan.featured ? "border-blue-500/40 bg-blue-500/10 shadow-[0_0_0_1px_rgba(37,99,235,0.2)]" : "border-white/10 bg-slate-900/60"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-slate-50">{plan.name}</h3>{isCurrent ? <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm text-emerald-200">Current plan</span> : selectedPlan === plan.id ? <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-200">Selected plan</span> : plan.featured ? <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">Most popular</span> : null}</div><p className="mt-4 text-sm leading-7 text-slate-400">{plan.description}</p><div className="mt-6 flex items-end gap-2"><span className="text-4xl font-semibold text-slate-50">{plan.price}</span><span className="pb-1 text-sm text-slate-500">/ month</span></div><ul className="mt-8 space-y-3 text-sm text-slate-300">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-3"><Check className="mt-0.5 size-4 text-blue-400" /><span>{feature}</span></li>)}</ul><div className="mt-auto pt-8"><button type="button" disabled={subscription === null || isCurrent || businessUnavailable || loading !== null} onClick={() => choose(plan.id)} className="w-full rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-60">{label}</button></div></div>})}</div>{error ? <p className="mt-5 text-center text-sm text-rose-300" role="alert">{error}</p> : null}</Container></section>;
}
