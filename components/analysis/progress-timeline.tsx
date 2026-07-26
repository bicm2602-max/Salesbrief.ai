interface ProgressTimelineProps {
  items: string[];
}

export function ProgressTimeline({ items }: ProgressTimelineProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <h3 className="text-lg font-semibold text-slate-50">Progress timeline</h3>
      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <div key={item} className="flex items-start gap-3">
            <div className="mt-1 flex size-7 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-sm font-semibold text-blue-300">
              {index + 1}
            </div>
            <p className="text-sm leading-7 text-slate-400">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
