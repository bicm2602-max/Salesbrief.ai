import { ArrowUpRight } from "lucide-react";

interface OverviewCardProps {
  title: string;
  value: string;
  accent?: string;
}

export function OverviewCard({ title, value, accent = "text-slate-100" }: OverviewCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        <ArrowUpRight className="size-4 text-slate-500" />
      </div>
      <p className={`mt-4 text-lg font-semibold leading-8 ${accent}`}>{value}</p>
    </div>
  );
}
