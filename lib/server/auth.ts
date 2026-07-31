"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  fullName: z.string().min(2),
  companyName: z.string().min(2),
});
function safeNext(value: string) { return value.startsWith("/") && !value.startsWith("//") && !value.includes("://") ? value : "/dashboard"; }

function getSiteUrl() {
  return (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function signUpWithEmail(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString() ?? "");
  const data = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    fullName: formData.get("fullName")?.toString() ?? "",
    companyName: formData.get("companyName")?.toString() ?? "",
  };

  const parsed = signUpSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Please fill out the form correctly." };
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm`,
      data: {
        full_name: parsed.data.fullName,
        company_name: parsed.data.companyName,
      },
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Unable to create account." };
  }

  const admin = createAdminSupabaseClient();
  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    company_name: parsed.data.companyName,
    plan: "free",
    credits: 100,
  });

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  if (!authData.session) {
    return { success: true, message: "Check your email to confirm your account before signing in.", email: parsed.data.email };
  }

  revalidatePath("/dashboard");
  redirect(next);
}

export async function signInWithEmail(formData: FormData) {
  const next = safeNext(formData.get("next")?.toString() ?? "");
  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  redirect(next);
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email")?.toString() ?? "";
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Check your email for the password reset link." };
}

export async function resetPassword(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  const confirmPassword = formData.get("confirmPassword")?.toString() ?? "";

  if (password.length < 8 || password !== confirmPassword) {
    return { success: false, error: "Passwords must match and be at least 8 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: "Password updated successfully." };
}

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}
