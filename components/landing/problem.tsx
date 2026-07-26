"use client";

import { motion } from "framer-motion";
import { Clock3, Search, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const painPoints = [
  "Prospect research takes hours before every outreach attempt.",
  "Teams lose momentum juggling browser tabs, notes, and CRM context.",
  "Generic messaging feels disconnected from what the buyer actually cares about.",
];

export function Problem() {
  return (
    <section className="py-24 sm:py-28">
      <Container className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}>
          <SectionHeading
            eyebrow="The problem"
            title="Manual prospect research burns time your team cannot afford to lose."
            description="Reps spend too much time piecing together context from a website, LinkedIn, and scattered notes before they can send anything useful."
          />
          <div className="mt-8 space-y-4">
            {painPoints.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="rounded-full bg-blue-500/10 p-2 text-blue-300">
                  <Search className="size-4" />
                </div>
                <p className="text-slate-300">{point}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.2 }} className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center gap-3 text-blue-300">
            <div className="rounded-full bg-blue-500/10 p-2">
              <Clock3 className="size-5" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.2em]">Before SalesBrief AI</p>
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-6">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Research cycle</span>
              <span>2.4 hours</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
            </div>
            <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
              <Sparkles className="mt-0.5 size-4" />
              <p className="text-sm leading-7">The result is inconsistent outreach and a lot of manual context-switching before the first message is sent.</p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
