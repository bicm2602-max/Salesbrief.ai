import { motion } from "framer-motion";

const steps = ["Researching website...", "Extracting content...", "Thinking...", "Generating report...", "Saving..."];

export function LoadingAnalysis() {
  return (
    <div className="space-y-6 rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-blue-300">
        <motion.div initial={{ scale: 0.9, opacity: 0.7 }} animate={{ scale: [0.95, 1, 0.95], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} className="size-2 rounded-full bg-blue-400" />
        Generating sales intelligence report
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step} className="flex items-center justify-between rounded-[1.1rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            <span>{step}</span>
            <span className="text-slate-500">In progress</span>
          </div>
        ))}
      </div>
    </div>
  );
}
