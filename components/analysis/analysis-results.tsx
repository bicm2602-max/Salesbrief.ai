"use client";

import * as React from "react";
import { Copy, Download, Share2, Sparkles } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import { OverviewCard } from "@/components/analysis/overview-card";
import { OutreachCard } from "@/components/analysis/outreach-card";
import { ScoreCard } from "@/components/analysis/score-card";
import { SignalCard } from "@/components/analysis/signal-card";
import { FavoriteButton } from "@/components/analysis/favorite-button";
import { AskSalesBrief } from "@/components/analysis/ask-salesbrief";
import { ActionLayerCard } from "@/components/analysis/action-layer-card";

interface AnalysisResultsProps {
  result: AnalysisResult;
  analysisId?: string;
  isFavorite?: boolean;
}

export function AnalysisResults({ result, analysisId, isFavorite }: AnalysisResultsProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyValue = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
              <Sparkles className="size-4" />
              Sales intelligence report ready
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-50">{result.companyName}</h2>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-400">{result.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {analysisId ? <FavoriteButton analysisId={analysisId} initialFavorite={Boolean(isFavorite)} /> : null}
            <button onClick={() => copyValue(result.email, "email")} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Copy className="size-4" /> {copied === "email" ? "Copied" : "Copy Email"}</span>
            </button>
            <button onClick={() => copyValue(result.linkedin, "linkedin")} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Copy className="size-4" /> {copied === "linkedin" ? "Copied" : "Copy LinkedIn"}</span>
            </button>
            <button onClick={() => copyValue(result.coldCall, "call")} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Copy className="size-4" /> {copied === "call" ? "Copied" : "Copy Call"}</span>
            </button>
            <button onClick={() => copyValue(result.summary, "summary")} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Copy className="size-4" /> {copied === "summary" ? "Copied" : "Copy Summary"}</span>
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Download className="size-4" /> Export PDF</span>
            </button>
            <button className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 transition hover:bg-white/10">
              <span className="inline-flex items-center gap-2"><Share2 className="size-4" /> Share</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <ScoreCard score={result.salesScore} label="Sales Score" description="Measures the strength of the outreach fit for this account." />
          <ScoreCard score={result.confidenceScore} label="Confidence Score" description="Reflects how much evidence the model found in the website content." />
          <div className="grid gap-4 sm:grid-cols-2">
            <OverviewCard title="Industry" value={result.industry} />
            <OverviewCard title="Company size" value={result.companySize} />
            <OverviewCard title="Recommended offer" value={result.recommendedOffer} />
            <OverviewCard title="Website" value={result.website} />
          </div>
        </div>

        <div className="space-y-6">
          <SignalCard title="Target customers" items={result.targetCustomers} />
          <SignalCard title="Pain points" items={result.painPoints} />
          <SignalCard title="Opportunities" items={result.opportunities} />
          <SignalCard title="Buying signals" items={result.buyingSignals} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SignalCard title="Products" items={result.products} />
        <SignalCard title="Services" items={result.services} />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold text-slate-50">Buying signals</h3>
            <div className="mt-4 space-y-3">
              {result.buyingSignalsDetailed.map((signal) => (
                <div key={signal.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-100">{signal.title}</p>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-300">
                      {signal.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{signal.explanation}</p>
                  <p className="mt-2 text-sm text-slate-300">{signal.salesOpportunity}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-slate-50">Tech stack & lead score</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">Lead score</p>
                  <p className="text-xl font-semibold text-slate-50">{result.leadScore.score}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${Math.min(100, result.leadScore.score)}%` }} />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-100">Detected stack</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {result.techStack.map((tech) => (
                    <span key={tech.name} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-sm text-slate-300">
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <h3 className="text-xl font-semibold text-slate-50">Sales opportunities</h3>
          <div className="mt-4 space-y-3">
            {result.salesOpportunities.map((opportunity) => (
              <div key={opportunity.opportunity} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-100">{opportunity.opportunity}</p>
                <p className="mt-2 text-sm leading-7 text-slate-400">{opportunity.reason}</p>
                <p className="mt-2 text-sm text-slate-300">{opportunity.recommendedPitch}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
          <h3 className="text-xl font-semibold text-slate-50">Recommended next steps</h3>
          <div className="mt-4 space-y-3">
            {result.recommendations.map((recommendation) => (
              <div key={recommendation.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-100">{recommendation.title}</p>
                  <span className="text-sm text-slate-400">{recommendation.confidence}%</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{recommendation.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ActionLayerCard actionLayer={result.actionLayer} />

      {analysisId ? <AskSalesBrief analysisId={analysisId} /> : null}

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <h3 className="text-xl font-semibold text-slate-50">Summary</h3>
        <p className="mt-4 text-sm leading-8 text-slate-400">{result.summary}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <OutreachCard title="Cold email" content={result.email} copyText="Email" />
        <OutreachCard title="LinkedIn message" content={result.linkedin} copyText="Social" />
        {result.outreachVariants ? <>
          <OutreachCard title="Consultative email" content={result.outreachVariants.emailConsultative} copyText="Consultative email" />
          <OutreachCard title="Conversational LinkedIn message" content={result.outreachVariants.linkedinConversational} copyText="Conversational social" />
        </> : null}
        <OutreachCard title="Cold call script" content={result.coldCall} copyText="Call" />
        <OutreachCard title="Follow-up email" content={result.followUp} copyText="Follow-up" />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        <h3 className="text-xl font-semibold text-slate-50">Objections</h3>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-400">
          {result.objections.map((objection) => (
            <li key={objection} className="flex items-start gap-2">
              <span className="mt-2 size-1.5 rounded-full bg-amber-400" />
              <span>{objection}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
