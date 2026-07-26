import { Container } from "@/components/ui/container";

const logos = ["Northstar", "Hush Studio", "Kite Labs", "OneLine", "Northwind", "Momentum"];

export function TrustedBy() {
  return (
    <section className="border-y border-white/10 bg-slate-900/40 py-8">
      <Container className="flex flex-col items-center gap-4 lg:flex-row lg:justify-between">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
          Trusted by modern revenue teams
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {logos.map((logo) => (
            <div key={logo} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-300">
              {logo}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
