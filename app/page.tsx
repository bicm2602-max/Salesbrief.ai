import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { Solution } from "@/components/landing/solution";
import { Features } from "@/components/landing/features";
import { Demo } from "@/components/landing/demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PricingPreview } from "@/components/landing/pricing-preview";
import { FAQ } from "@/components/landing/faq";
import { CTA } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { DemoProvider } from "@/components/marketing/demo-provider";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.15),transparent_35%),#020617] text-slate-100">
      <Navbar />
      <DemoProvider><main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Demo />
        <HowItWorks />
        <PricingPreview />
        <FAQ />
        <CTA />
      </main></DemoProvider>
      <Footer />
    </div>
  );
}
