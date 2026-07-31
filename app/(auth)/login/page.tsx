import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { signInWithEmail } from "@/lib/server/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmed?: string; error?: string }> }) {
  const { next, confirmed, error } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  async function handleSubmit(values: Record<string, string>) {
    "use server";

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));

    if (next) formData.append("next", next);
    return signInWithEmail(formData);
  }

  return (
    <AuthShell title="Welcome back" description="Log in to continue reviewing your deal insights and briefs.">
      {confirmed === "true" ? <p role="status" className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">Email confirmed successfully. You can now sign in.</p> : null}
      {error === "confirmation_failed" ? <p role="alert" className="mb-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">This confirmation link is invalid or has expired. Please request a new confirmation email.</p> : null}
      <AuthForm mode="login" submitLabel="Sign in" onSubmit={handleSubmit} nextPath={next} />
    </AuthShell>
  );
}
