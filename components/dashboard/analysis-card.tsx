import { ArrowUpRight, Sparkles } from "lucide-react";

interface AnalysisCardProps {
  company: string;
  score: string;
  date: string;
  summary: string;
}

export function AnalysisCard({ company, score, date, summary }: AnalysisCardProps) {
  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-300">{company}</p>
          <p className="mt-2 text-sm leading-7 text-slate-400">{summary}</p>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
          {score}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-slate-500">
        <span>{date}</span>
        <button className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-slate-300 transition hover:bg-white/10">
          <Sparkles className="size-4" />
          Open
          <ArrowUpRight className="size-4" />
        </button>
      </div>
    </article>
  );
}
