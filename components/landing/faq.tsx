import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const faqs = [
  {
    question: "What makes SalesBrief AI different from other prospecting tools?",
    answer: "It focuses on one premium outcome: turning a prospect website into a useful, ready-to-use sales brief that helps your team move faster with better context.",
  },
  {
    question: "Who is it best for?",
    answer: "It is designed for agencies, freelancers, SDRs, closers, and modern B2B sales teams that want sharper outreach without extra manual work.",
  },
  {
    question: "Do I need to connect any external tools?",
    answer: "No. The core experience starts with a URL and produces a polished brief right away, with future integrations planned for later workflows.",
  },
  {
    question: "Can I export the results?",
    answer: "Yes. Future plans include exportable summaries and handoff-friendly formats to keep collaboration simple and consistent.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="FAQ"
          title="Questions teams usually ask before they try it."
          description="The product experience is meant to be clear, lightweight, and useful from day one."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 grid gap-4">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-[1.25rem] border border-white/10 bg-slate-900/60 p-6">
              <summary className="cursor-pointer list-none text-lg font-medium text-slate-50">
                {faq.question}
              </summary>
              <p className="mt-4 text-sm leading-7 text-slate-400">{faq.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
