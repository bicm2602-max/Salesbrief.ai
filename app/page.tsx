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
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("plan, stripe_subscription_status").eq("id", user.id).maybeSingle()
    : { data: null };
  const isActive = profile?.stripe_subscription_status === "active" || profile?.stripe_subscription_status === "trialing";
  const plan = isActive && (profile?.plan === "starter" || profile?.plan === "pro" || profile?.plan === "business")
    ? profile.plan
    : "free";
  const authState = { authenticated: Boolean(user), plan };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.15),transparent_35%),#020617] text-slate-100">
      <Navbar user={user ? { email: user.email ?? "" } : null} />
      <DemoProvider><main>
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Demo />
        <HowItWorks />
        <PricingPreview initialSubscription={authState} />
        <FAQ />
        <CTA />
      </main></DemoProvider>
      <Footer />
    </div>
  );
}
