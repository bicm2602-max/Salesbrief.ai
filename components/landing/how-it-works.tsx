import { ArrowDown } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const steps = [
  { title: "Paste Website", description: "Drop in a URL and let the system ingest the company narrative." },
  { title: "AI Analysis", description: "Pull out market context, signals, and likely buyer priorities." },
  { title: "Get Sales Brief", description: "Receive a polished summary with positioning and outreach direction." },
  { title: "Contact Prospect", description: "Move straight into email, LinkedIn, and call-ready messaging." },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="The path from URL to outreach is simple and deliberate."
          description="No complex setup. Just a premium workflow that compresses discovery into a usable brief."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 space-y-4">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-[1.5rem] border border-white/10 bg-slate-900/60 p-6 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-sm font-semibold text-blue-300">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-50">{step.title}</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-400">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 ? <ArrowDown className="mt-4 size-5 text-slate-500 sm:mt-0" /> : null}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
