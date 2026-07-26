import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-white/10 bg-slate-900/60 px-8 py-16 text-center">
      <div className="rounded-full border border-white/10 bg-white/5 p-4 text-slate-400">
        <Inbox className="size-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-slate-400">{description}</p>
    </div>
  );
}
