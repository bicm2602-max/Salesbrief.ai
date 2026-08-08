"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/types/analysis";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";
import { getSubscriptionDatePresentation } from "@/lib/billing/subscription-presentation";

function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }, profile?: { full_name?: string | null }) {
  const fullName = profile?.full_name || (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "");
  return fullName.trim() || user.email?.split("@")[0] || "";
}

export async function getDashboardIdentity() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in." } as const;
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  return { success: true, name: displayName(user, profile ?? undefined), email: user.email ?? profile?.email ?? "" } as const;
}

export async function getSubscriptionDisplay() {
  try {
  const state = await getCurrentSubscriptionState();
  if (!state) return { success: false, plan: "free", displayName: "Free plan", detail: "3 total free analyses", remaining: null, canManage: false, schedule: null } as const;
  const plan = state.plan;
  console.info("[subscription-presentation-debug]", { subscriptionId: state.stripeSubscriptionId, status: state.status, cancelAtPeriodEnd: state.cancelAtPeriodEnd, currentPeriodEnd: state.currentPeriodEnd, plan: state.plan });
  const detail = plan === "starter" ? "10 analyses per billing period" : plan === "pro" ? "Unlimited analyses" : plan === "business" ? "Active subscription" : "3 total free analyses";
  const schedule = getSubscriptionDatePresentation(state)?.planDate ?? null;
  return { success: true, plan, displayName: `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`, detail, remaining: plan === "starter" ? state.analysesRemaining : null, canManage: plan !== "free", schedule } as const;
  } catch (error) {
    console.error("[dashboard] subscription display failed", { name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unable to load subscription." });
    return { success: false, plan: "free", displayName: "Billing unavailable", detail: "Unable to load subscription", remaining: null, canManage: false, schedule: null } as const;
  }
}

export async function searchAnalyses(query: string) {
  const term = query.trim();
  if (!term) return { success: true, results: [] } as const;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in.", results: [] } as const;
  const { data, error } = await supabase.from("analyses").select("id, website, json_result").eq("user_id", user.id).eq("status", "completed").order("created_at", { ascending: false }).limit(100);
  if (error) return { success: false, error: "Unable to search analyses.", results: [] } as const;
  const results = (data ?? []).filter((analysis) => {
    const result = analysis.json_result as Partial<AnalysisResult>;
    return analysis.website.toLowerCase().includes(term.toLowerCase()) || result.companyName?.toLowerCase().includes(term.toLowerCase()) || result.summary?.toLowerCase().includes(term.toLowerCase());
  }).slice(0, 8).map((analysis) => ({ id: analysis.id, website: analysis.website, companyName: (analysis.json_result as Partial<AnalysisResult>).companyName || analysis.website }));
  return { success: true, results } as const;
}

export async function updateProfileName(fullName: string) {
  const name = fullName.trim();
  if (!name) return { success: false, error: "Enter your name." } as const;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in." } as const;
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
  if (error) return { success: false, error: "Unable to save your name." } as const;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { success: true, name } as const;
}

export async function toggleAnalysisFavorite(analysisId: string, isFavorite: boolean) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Please sign in." } as const;
  const { error } = await supabase.from("analyses").update({ is_favorite: isFavorite }).eq("id", analysisId).eq("user_id", user.id);
  if (error) return { success: false, error: "Unable to update favorite." } as const;
  revalidatePath("/dashboard/favorites");
  revalidatePath(`/dashboard/history/${analysisId}`);
  return { success: true, isFavorite } as const;
}
