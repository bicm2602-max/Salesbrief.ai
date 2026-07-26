"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface AuthShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.2),transparent_35%),#020617] px-4 py-12 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="hidden bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
              <div>
                <div className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.25em] text-blue-300">
                  <Sparkles className="size-4" />
                  SalesBrief AI
                </div>
                <h2 className="mt-8 text-3xl font-semibold tracking-tight text-slate-50">Secure access to your revenue workspace.</h2>
                <p className="mt-4 max-w-md text-base leading-8 text-slate-400">Sign in to manage your analyses, briefs, and customer research with a polished, production-grade experience.</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
                Protected by Supabase Auth with server-side session validation.
              </div>
            </div>
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50">{title}</h1>
                <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
              </div>
              {children}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
