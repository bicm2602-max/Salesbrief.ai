"use client";

import { motion } from "framer-motion";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useDemoModal } from "@/components/marketing/demo-provider";
import { SectionHeading } from "@/components/landing/section-heading";

const bullets = [
  "Instant company context",
  "Signal-driven positioning",
  "Outreach-ready brief",
];

export function Demo() {
  const openDemo = useDemoModal();
  return (
    <section id="demo" className="py-24 sm:py-28">
      <Container className="rounded-[2.25rem] border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:p-10 lg:p-12">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }}>
            <SectionHeading
              eyebrow="Interactive demo"
              title="See how a single workflow becomes a complete sales brief."
              description="The experience feels calm and polished because the intelligence is structured around what a rep actually needs next."
            />
            <div className="mt-8 space-y-3">
              {bullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 className="size-5 text-blue-400" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <button type="button" onClick={openDemo} className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <PlayCircle className="size-4" />
              Preview the workflow
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-slate-950/30">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
              <div className="rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Live brief</p>
                    <p className="text-lg font-semibold text-slate-50">Acme Studio</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Ready</div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Focus</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">AI-first design partner with recent product launch.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Angle</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">Position around conversion-focused product storytelling.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
