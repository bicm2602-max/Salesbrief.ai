"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, History, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { analyzeWebsiteAction, getAnalysisQuotaState, getRecentAnalysesForRerun, rerunSavedAnalysisAction, type AnalysisQuotaState } from "@/app/dashboard/new-analysis/actions";
import { LoadingAnalysis } from "@/components/analysis/loading-analysis";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { QuotaUpgradePanel } from "@/components/billing/quota-upgrade-panel";
import { z } from "zod";

const examples = ["https://stripe.com", "https://notion.so", "https://linear.app"];
const inputSchema = z.string().trim().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "http:" || url.protocol === "https:";
}, { message: "Please use an http or https website URL." });

export default function NewAnalysisPage() {
  const router = useRouter();
  const [website, setWebsite] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof analyzeWebsiteAction>>["result"] | null>(null);
  const [analysisId, setAnalysisId] = React.useState<string | null>(null);
  const [recentAnalyses, setRecentAnalyses] = React.useState<{ id: string; website: string }[]>([]);
  const [rerunningId, setRerunningId] = React.useState<string | null>(null);
  const [recentError, setRecentError] = React.useState<string | null>(null);
  const [quotaState, setQuotaState] = React.useState<AnalysisQuotaState | null>(null);
  const [quotaLoaded, setQuotaLoaded] = React.useState(false);

  React.useEffect(() => {
    void getRecentAnalysesForRerun().then((response) => {
      if (response.success) setRecentAnalyses(response.analyses);
      else setRecentError(response.error);
    });
    void getAnalysisQuotaState().then((state) => {
      setQuotaState(state);
      setQuotaLoaded(true);
    });
  }, []);

  async function handleAnalyze() {
    if (quotaLoaded && quotaState && !quotaState.allowed) {
      setError(quotaState.message ?? "You've reached your analysis limit.");
      return;
    }

    const parsed = inputSchema.safeParse(website);
    if (!parsed.success) {
      setError("Please enter a valid website URL.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await analyzeWebsiteAction(parsed.data);
    if (response.success && response.result) {
      setResult(response.result);
      setAnalysisId(response.analysisId);
    } else {
      const failureMessage = response.error ?? "Analysis failed.";
      setError(failureMessage);
      if (failureMessage === "You've used all 3 free analyses." || failureMessage.startsWith("You've used all 10 Starter analyses")) {
        const updatedQuotaState = await getAnalysisQuotaState();
        setQuotaState(updatedQuotaState);
        setQuotaLoaded(true);
      }
    }

    setIsLoading(false);
  }

  async function handleRerun(analysisId: string) {
    if (rerunningId) return;

    setRerunningId(analysisId);
    setRecentError(null);
    const response = await rerunSavedAnalysisAction(analysisId);
    if (response.success && response.analysisId) {
      router.push(`/dashboard/history/${response.analysisId}`);
      return;
    }

    setRecentError(response.error ?? "Unable to re-run this analysis.");
    setRerunningId(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="New analysis"
        description="Paste a website URL to generate a polished prospect brief with context, signals, and outreach direction."
        action={
          <Link href="/dashboard/history" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
            <History className="size-4" />
            View history
          </Link>
        }
      />

      {!result ? (
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-8">
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
              <Sparkles className="size-4" />
              Paste company website
            </div>
            <label className="mt-6 block">
              <span className="sr-only">Company website</span>
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                className="w-full rounded-[1.25rem] border border-white/10 bg-slate-900/70 px-4 py-4 text-base text-slate-100 outline-none placeholder:text-slate-500"
                placeholder="https://company.com"
              />
            </label>
            {error ? <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p> : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button key={example} type="button" onClick={() => setWebsite(example)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-white/10">
                    {example}
                  </button>
                ))}
              </div>
              <button onClick={handleAnalyze} disabled={isLoading || (quotaLoaded && quotaState !== null && !quotaState.allowed)} aria-describedby={quotaLoaded && quotaState && !quotaState.allowed ? "quota-upgrade-title" : undefined} className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? "Analyzing…" : "Analyze website"}
                <ArrowRight className="size-4" />
              </button>
            </div>
            {quotaLoaded && quotaState && !quotaState.allowed && (quotaState.plan === "free" || quotaState.plan === "starter") ? <QuotaUpgradePanel plan={quotaState.plan} /> : null}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              <h3 className="text-lg font-semibold text-slate-50">Recent analyses</h3>
              <div className="mt-5 space-y-3">
                {recentAnalyses.map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    <span>{analysis.website}</span>
                    <button type="button" onClick={() => handleRerun(analysis.id)} disabled={rerunningId !== null} className="text-blue-300 transition hover:text-blue-200 disabled:opacity-70">
                      {rerunningId === analysis.id ? "Re-running…" : "Re-run"}
                    </button>
                  </div>
                ))}
                {recentError ? <p className="text-sm text-rose-300">{recentError}</p> : null}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              {isLoading ? <LoadingAnalysis /> : <EmptyState title="Ready to generate a brilliant brief" description="Enter a website URL and the engine will build a polished multi-part analysis for outreach and prioritization." />}
            </div>
          </div>
        </section>
      ) : (
        <AnalysisResults result={result} analysisId={analysisId ?? undefined} />
      )}
    </div>
  );
}
