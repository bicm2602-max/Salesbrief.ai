import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { signInWithEmail } from "@/lib/server/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
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
    return signInWithEmail(formData);
  }

  return (
    <AuthShell title="Welcome back" description="Log in to continue reviewing your deal insights and briefs.">
      <AuthForm mode="login" submitLabel="Sign in" onSubmit={handleSubmit} nextPath={next} />
    </AuthShell>
  );
}
