"use client";

import { motion } from "framer-motion";
import { ArrowRight, BrainCircuit, Mail, MessageCircle, PenTool, Phone } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const workflow = [
  { title: "Website", description: "Paste a prospect URL and let the system ingest the site context.", icon: PenTool },
  { title: "Analysis", description: "AI extracts business context, signals, and likely buying triggers.", icon: BrainCircuit },
  { title: "Prospect Brief", description: "Compose a concise brief with messaging, objections, and positioning.", icon: MessageCircle },
  { title: "Email", description: "Generate a tailored first-touch email with the right angle.", icon: Mail },
  { title: "LinkedIn", description: "Create a personalized note and connection prompt for social outreach.", icon: MessageCircle },
  { title: "Call Script", description: "Prepare a concise call flow for your first discovery conversation.", icon: Phone },
];

export function Solution() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="The solution"
          title="A focused AI workflow that turns research into outreach." 
          description="SalesBrief AI compresses the workflow into a single, premium experience that moves from source URL to ready-to-send materials."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {workflow.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
              >
                <div className="flex items-center justify-between">
                  <div className="rounded-full bg-blue-500/10 p-2 text-blue-300">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-sm text-slate-500">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-50">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </motion.article>
            );
          })}
        </div>
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <span className="text-slate-500">From review to outreach</span>
            <ArrowRight className="size-4 text-blue-400" />
            <span className="font-medium text-slate-100">Ready in minutes</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
