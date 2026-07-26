import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <Skeleton className="h-56 w-full" />
      </div>
    </div>
  );
}
