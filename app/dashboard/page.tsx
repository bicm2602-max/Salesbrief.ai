import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { CheckoutStatus } from "@/components/dashboard/checkout-status";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCustomerPortalSession } from "@/lib/server/billing";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";
import type { AnalysisResult } from "@/types/analysis";

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default async function DashboardHomePage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [subscription, { data: profile }, { count: favoritesCount }, { data: recentAnalyses }] = await Promise.all([
    getCurrentSubscriptionState(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("analyses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").eq("is_favorite", true),
    supabase.from("analyses").select("id, website, json_result, score, created_at").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(3),
  ]);
  if (!subscription) redirect("/login");
  const activePlan = subscription.plan;
  const used = subscription.analysesUsed;
  const limit = subscription.analysesLimit;
  const remaining = subscription.analysesRemaining;
  const renewalDate = formatDate(subscription.currentPeriodEnd);
  const name = profile?.full_name || (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "") || user.email?.split("@")[0] || "";
  const checkout = (await searchParams).checkout === "success";
  const paidPlan = activePlan === "free" ? null : activePlan;

  const planCopy = activePlan === "starter"
    ? { welcome: "Welcome to Starter", summary: "Your Starter plan is active. You can generate up to 10 sales briefs during each billing period.", rules: ["10 analyses per billing period", "Reruns count toward your limit", "History and favorites included"] }
    : activePlan === "pro"
      ? { welcome: "Welcome to Pro", summary: "Your Pro plan is active. Generate unlimited sales briefs without a monthly analysis limit.", rules: ["Unlimited analyses while active", "Reruns included", "History and favorites included"] }
      : activePlan === "business"
        ? { welcome: "Welcome to Business", summary: "Your Business plan is active.", rules: ["Website analysis", "Sales brief generation", "History and favorites included"] }
        : { welcome: "Welcome to SalesBrief AI", summary: "You have 3 free analyses to explore the platform.", rules: ["3 total free analyses", "Website analysis", "Sales brief generation", "History and favorites"] };

  const stats = [
    { title: "Total analyses", value: String(subscription.totalAnalyses), detail: "Completed sales briefs", accent: "blue" as const },
    activePlan === "pro" || activePlan === "business"
      ? { title: "Plan usage", value: "Unlimited", detail: "While your plan is active", accent: "emerald" as const }
      : { title: activePlan === "starter" ? "Billing-period usage" : "Free plan usage", value: `${used} of ${limit}`, detail: activePlan === "starter" ? `${remaining} analyses remaining` : "Free analyses used", accent: "emerald" as const },
    { title: "Favorites", value: String(favoritesCount ?? 0), detail: "Saved analyses", accent: "violet" as const },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={name ? `${planCopy.welcome}, ${name}` : planCopy.welcome}
        description={planCopy.summary}
        action={<Link href="/dashboard/new-analysis" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"><Sparkles className="size-4" />New analysis<ArrowRight className="size-4" /></Link>}
      />

      <CheckoutStatus checkoutReturned={checkout} activePlan={paidPlan} />

      {subscription.cancelAtPeriodEnd && subscription.isActive && renewalDate ? <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Your plan will remain active until {renewalDate}.</p> : null}
      {!subscription.isActive && subscription.status && subscription.status !== "active" && subscription.status !== "trialing" ? <p className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Your paid subscription is not active. Free access is currently available.</p> : null}

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-blue-300"><Zap className="size-4" />Your plan</div>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-50">{activePlan.charAt(0).toUpperCase() + activePlan.slice(1)} plan</h2>
          <ul className="mt-5 space-y-2 text-sm leading-7 text-slate-300">{planCopy.rules.map((rule) => <li key={rule}>• {rule}</li>)}{renewalDate && activePlan !== "free" ? <li>• Renews on {renewalDate}</li> : null}</ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard/new-analysis" className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500">Analyze website</Link>
            {activePlan === "free" ? <Link href="/#pricing" className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">Upgrade your plan</Link> : <form action={createCustomerPortalSession}><button type="submit" className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10">Manage subscription</button></form>}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <p className="text-sm text-slate-400">Current access</p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{activePlan === "pro" || activePlan === "business" ? "Unlimited analyses" : `${used} of ${limit} analyses used`}</p>
          <p className="mt-4 text-sm leading-7 text-slate-400">{activePlan === "starter" ? `${remaining} analyses remaining this billing period.` : activePlan === "free" ? `${remaining} free analyses remaining.` : "Your plan includes unlimited analyses while active."}</p>
          {renewalDate && activePlan !== "free" ? <p className="mt-5 text-sm text-blue-200">Renewal date: {renewalDate}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-slate-50">Recent analyses</h3><Link href="/dashboard/history" className="text-sm text-blue-300 transition hover:text-blue-200">View all</Link></div>
          <div className="mt-6 space-y-3">
            {(recentAnalyses ?? []).map((analysis) => { const brief = analysis.json_result as Partial<AnalysisResult>; return <Link key={analysis.id} href={`/dashboard/history/${analysis.id}`} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:bg-white/10"><div className="flex items-start justify-between gap-4"><div><p className="font-medium text-slate-100">{brief.companyName || new URL(analysis.website).hostname}</p><p className="mt-1 line-clamp-2 text-sm text-slate-400">{brief.summary || analysis.website}</p></div><span className="shrink-0 text-sm text-emerald-300">{analysis.score}/100</span></div><p className="mt-3 text-xs text-slate-500">{formatDate(analysis.created_at)}</p></Link>; })}
            {!recentAnalyses?.length ? <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-400">Your recent analyses will appear here. <Link href="/dashboard/new-analysis" className="text-blue-300">Create your first sales brief.</Link></p> : null}
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"><h3 className="text-xl font-semibold text-slate-50">Quick actions</h3><div className="mt-6 space-y-3">{[{ label: "New analysis", href: "/dashboard/new-analysis" }, { label: "Review favorites", href: "/dashboard/favorites" }, { label: "View history", href: "/dashboard/history" }].map((action) => <Link key={action.label} href={action.href} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"><span>{action.label}</span><ArrowRight className="size-4" /></Link>)}</div></div>
      </section>
    </div>
  );
}
