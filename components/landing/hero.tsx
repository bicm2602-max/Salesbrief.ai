"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useDemoModal } from "@/components/marketing/demo-provider";

const metrics = [
  { label: "Research", value: "Structured" },
  { label: "Outreach", value: "Ready" },
  { label: "Workflow", value: "Focused" },
];

export function Hero() {
  const openDemo = useDemoModal();
  return (
    <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 lg:pt-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.16),transparent_24%)]" />
      <Container className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300">
            <Sparkles className="size-4" />
            AI Sales Intelligence for Agencies
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
            One URL. One click. One complete sales brief.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl">
            Turn a prospect website into a tailored outreach brief with research, buying signals, messaging, and next-step suggestions in minutes.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500">
              Start free
              <ArrowRight className="size-4" />
            </Link>
            <button type="button" onClick={openDemo} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <Play className="size-4" />
              Watch demo
            </button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <p className="text-2xl font-semibold text-slate-50">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="relative">
          <div className="absolute -left-6 top-8 h-40 w-40 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute -right-4 bottom-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/85 p-4 shadow-2xl shadow-blue-950/30">
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">Prospect brief</p>
                  <p className="text-lg font-semibold text-slate-100">Northstar Labs</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                  High intent
                </div>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                  <p className="text-sm text-slate-400">AI summary</p>
                  <p className="mt-2 text-base leading-7 text-slate-200">
                    Growth-stage B2B SaaS, active hiring, recent funding, uses HubSpot and Clay.
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Buying signals", value: "4" },
                    { label: "Tech stack", value: "HubSpot" },
                    { label: "ICP fit", value: "92%" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-100">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-5 left-5 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-sm text-blue-200">Outreach ready</p>
            <p className="text-lg font-semibold text-slate-50">Email + LinkedIn + call script</p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
