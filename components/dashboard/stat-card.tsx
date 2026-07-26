import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  accent?: "blue" | "emerald" | "violet" | "amber";
  className?: string;
}

export function StatCard({ title, value, detail, accent = "blue", className }: StatCardProps) {
  const accentClass = {
    blue: "from-blue-500/20 to-cyan-400/10 text-blue-300",
    emerald: "from-emerald-500/20 to-lime-400/10 text-emerald-300",
    violet: "from-violet-500/20 to-fuchsia-400/10 text-violet-300",
    amber: "from-amber-500/20 to-orange-400/10 text-amber-300",
  }[accent];

  return (
    <div className={cn("rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]", className)}>
      <div className={cn("inline-flex rounded-full bg-gradient-to-br p-2", accentClass)}>
        <div className="size-2 rounded-full bg-current" />
      </div>
      <p className="mt-5 text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-50">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
