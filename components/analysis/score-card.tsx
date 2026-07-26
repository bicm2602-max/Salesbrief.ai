import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  score: number;
  label: string;
  description?: string;
}

export function ScoreCard({ score, label, description }: ScoreCardProps) {
  const hue = score >= 80 ? "from-emerald-400 to-cyan-400" : score >= 60 ? "from-amber-400 to-orange-400" : "from-rose-400 to-red-500";
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-3 text-4xl font-semibold text-slate-50">{score}</p>
        </div>
        <div className="relative flex h-24 w-24 items-center justify-center">
          <svg viewBox="0 0 140 140" className="h-24 w-24 -rotate-90">
            <circle cx="70" cy="70" r="54" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
            <motion.circle
              cx="70"
              cy="70"
              r="54"
              stroke="url(#scoreGradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8 }}
              strokeDasharray={circumference}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-sm font-semibold text-slate-100">{score}/100</span>
        </div>
      </div>
      {description ? <p className="mt-4 text-sm leading-7 text-slate-400">{description}</p> : null}
    </div>
  );
}
