"use client";

export default function HistoryError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/10 p-6 text-rose-100">
      <h2 className="text-lg font-semibold">Unable to load analysis history</h2>
      <p className="mt-2 text-sm text-rose-200">Please try again.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-full border border-rose-300/20 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10">
        Try again
      </button>
    </div>
  );
}
