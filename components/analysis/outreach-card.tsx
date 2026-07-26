interface OutreachCardProps {
  title: string;
  content: string;
  copyText?: string;
}

export function OutreachCard({ title, content, copyText }: OutreachCardProps) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-50">{title}</h3>
        {copyText ? <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{copyText}</span> : null}
      </div>
      <p className="mt-4 whitespace-pre-line text-sm leading-8 text-slate-400">{content}</p>
    </div>
  );
}
