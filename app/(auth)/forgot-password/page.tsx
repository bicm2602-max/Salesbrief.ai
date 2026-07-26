import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPassword } from "@/lib/server/auth";

export default async function ForgotPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  async function handleSubmit(values: Record<string, string>) {
    "use server";

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));

    return forgotPassword(formData);
  }

  return (
    <AuthShell title="Reset your password" description="Enter your email and we’ll send you a secure reset link.">
      <AuthForm mode="forgot-password" submitLabel="Send reset link" onSubmit={handleSubmit} />
    </AuthShell>
  );
}
