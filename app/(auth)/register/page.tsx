import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { signUpWithEmail } from "@/lib/server/auth";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
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
    return signUpWithEmail(formData);
  }

  return (
    <AuthShell title="Create your account" description="Launch your workspace with secure access for your team.">
      <AuthForm mode="register" submitLabel="Create account" onSubmit={handleSubmit} nextPath={next} />
    </AuthShell>
  );
}
