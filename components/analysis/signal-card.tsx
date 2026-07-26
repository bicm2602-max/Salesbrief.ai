interface SignalCardProps {
  title: string;
  items: string[];
}

export function SignalCard({ title, items }: SignalCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-400">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 size-1.5 rounded-full bg-blue-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
