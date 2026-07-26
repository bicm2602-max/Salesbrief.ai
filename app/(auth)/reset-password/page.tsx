import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPassword } from "@/lib/server/auth";

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  async function handleSubmit(values: Record<string, string>) {
    "use server";

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));

    return resetPassword(formData);
  }

  return (
    <AuthShell title="Choose a new password" description="Set a strong password to keep your account secure.">
      <AuthForm mode="reset-password" submitLabel="Update password" onSubmit={handleSubmit} />
    </AuthShell>
  );
}
