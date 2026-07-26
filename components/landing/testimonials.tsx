import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/landing/section-heading";

const testimonials = [
  {
    quote: "We replaced a two-hour research ritual with a brief that felt sharper than anything our team had manually assembled.",
    author: "Maya Chen",
    role: "Account Director, Northstar Studio",
  },
  {
    quote: "The messaging felt custom enough to use immediately. Our reply rate improved within the first week.",
    author: "Darius Patel",
    role: "Founder, Hush Labs",
  },
  {
    quote: "It gave us a calmer start to outreach and a much stronger first impression with every new prospect.",
    author: "Elena Ruiz",
    role: "Principal SDR, Relay Growth",
  },
];

export function Testimonials() {
  return (
    <section className="py-24 sm:py-28">
      <Container>
        <SectionHeading
          eyebrow="Testimonials"
          title="Used by teams that care about quality, not noise."
          description="The experience is built to feel clear and polished from the first interaction onward."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <blockquote key={testimonial.author} className="rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-8">
              <p className="text-lg leading-8 text-slate-200">“{testimonial.quote}”</p>
              <footer className="mt-8">
                <p className="font-semibold text-slate-50">{testimonial.author}</p>
                <p className="mt-1 text-sm text-slate-400">{testimonial.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </Container>
    </section>
  );
}
