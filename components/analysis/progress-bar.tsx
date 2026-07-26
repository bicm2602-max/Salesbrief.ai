interface ProgressBarProps {
  label: string;
  value: number;
}

export function ProgressBar({ label, value }: ProgressBarProps) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{label}</span>
        <span className="text-slate-100">{value}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
