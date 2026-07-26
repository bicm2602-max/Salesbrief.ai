import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";

export function CTA() {
  return (
    <section className="pb-24 sm:pb-28">
      <Container>
        <div className="rounded-[2.25rem] border border-blue-500/30 bg-gradient-to-br from-blue-600/25 to-slate-900 p-10 text-center shadow-[0_0_0_1px_rgba(255,255,255,0.03)] sm:p-14">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-blue-300">Ready to work smarter?</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
            Turn every prospect URL into a sharp sales brief in minutes.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Give your team the clarity, speed, and polish they need to start conversations with confidence.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500">
              Create account
              <ArrowRight className="size-4" />
            </Link>
            <Link href="#demo" className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/15">
              View the workflow
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
