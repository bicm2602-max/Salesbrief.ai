"use client";

import { motion } from "framer-motion";
import { BarChart3, Blocks, BriefcaseBusiness, Eye, FileText, ScanSearch, Sparkles, Target } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const features = [
  { title: "AI Company Analysis", description: "Understand the company’s market posture, recent activity, and positioning in seconds.", icon: Sparkles },
  { title: "Buying Signals", description: "Surface hiring momentum, product launches, and expansion signals that matter.", icon: Eye },
  { title: "Tech Stack Detection", description: "Identify the tools and systems the company already uses to personalize the message.", icon: Blocks },
  { title: "ICP Detection", description: "Map the ideal buyer profile against the company’s structure and growth stage.", icon: Target },
  { title: "Personalized Outreach", description: "Turn the brief into tailored email and LinkedIn copy with clear narrative hooks.", icon: BriefcaseBusiness },
  { title: "Lead Score", description: "Prioritize the strongest accounts with a simple, explainable fit score.", icon: BarChart3 },
  { title: "Competitor Snapshot", description: "Summarize adjacent competitors and likely market pressure points.", icon: ScanSearch },
  { title: "Sales Summary PDF", description: "Export a polished snapshot for handoff, follow-up, or leadership review.", icon: FileText },
];

export function Features() {
  return (
    <section id="features" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Built for the speed and clarity modern sales teams need."
          description="Every component of the workflow is designed to turn research into a sharp, usable brief without bloat."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
              >
                <div className="rounded-full bg-blue-500/10 p-2 text-blue-300">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-6 text-lg font-semibold text-slate-50">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
