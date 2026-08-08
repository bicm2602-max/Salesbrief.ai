"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSalesBrief, normalizeWebsite, validateAnalysisUrl } from "@/services/analysis";
import { AnalysisPipelineError } from "@/services/analysis-errors";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";

type AnalysisSource = "new-analysis" | "rerun";

export type AnalysisQuotaState = {
  plan: "free" | "starter" | "pro" | "business";
  used: number;
  limit: number | null;
  allowed: boolean;
  message?: string;
};

export async function getAnalysisQuotaState(): Promise<AnalysisQuotaState | null> {
  try {
    const state = await getCurrentSubscriptionState();
    if (!state) return null;
    const allowed = state.analysesRemaining === null || state.analysesRemaining > 0;
    return {
      plan: state.plan,
      used: state.analysesUsed,
      limit: state.analysesLimit,
      allowed,
      message: allowed ? undefined : state.plan === "starter"
        ? "You've used all 10 Starter analyses for this billing period."
        : "You've used all 3 free analyses.",
    };
  } catch (error) {
    console.error("[analysis-action] quota state failed", {
      stage: "quota check",
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unable to load quota state.",
    });
    return null;
  }
}

async function runAnalysis(
  rawUrl: string,
  { source, originalAnalysisId, duplicateProtectionEnabled }: {
    source: AnalysisSource;
    originalAnalysisId?: string;
    duplicateProtectionEnabled: boolean;
  },
) {
  let normalizedUrl = "";
  let reservedAnalysisId: string | null = null;

  try {
    const parsedUrl = await validateAnalysisUrl(rawUrl);
    if (!parsedUrl.success) {
      console.warn("[analysis-action] URL validation rejected", { stage: "URL validation", name: "ValidationError", message: parsedUrl.error, status: undefined });
      return { success: false, error: parsedUrl.error };
    }

    normalizedUrl = normalizeWebsite(parsedUrl.data);
    console.info("[analysis-action] URL validation completed", {
      stage: "URL validation",
      source,
      originalAnalysisId,
      website: normalizedUrl,
      duplicateProtectionEnabled,
    });

    const supabase = await createServerSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { success: false, error: "Please sign in before analyzing a website." };
    }
    const userId = userData.user.id;

    const quotaState = await getAnalysisQuotaState();
    if (!quotaState) return { success: false, error: "Unable to check your analysis quota. Please try again." };

    if (duplicateProtectionEnabled) {
      const { data: existing } = await supabase
        .from("analyses")
        .select("id")
        .eq("user_id", userId)
        .eq("website", normalizedUrl)
        .limit(1)
        .maybeSingle();

      if (existing) {
        return { success: false, error: "This website has already been analyzed." };
      }
    }

    if (!quotaState.allowed) {
      console.info("[analysis-action] quota rejected", { userId, source, plan: quotaState.plan, used: quotaState.used, limit: quotaState.limit });
      return { success: false, error: quotaState.message ?? "You've reached your analysis limit." };
    }

    // The database trigger atomically reserves capacity before OpenAI work.
    // This is the final authority; the state check above only improves UX.
    const { data: reservation, error: reservationError } = await supabase
      .from("analyses")
      .insert({ user_id: userId, website: normalizedUrl, json_result: {}, score: 0, status: "processing" })
      .select("id")
      .single();
    if (reservationError) {
      console.info("[analysis-action] quota reservation rejected", { userId, source, code: reservationError.code, message: reservationError.message });
      if (reservationError.message === "free_analysis_quota_exceeded") return { success: false, error: "You've used all 3 free analyses." };
      if (reservationError.message === "starter_analysis_quota_exceeded") return { success: false, error: "You've used all 10 Starter analyses for this billing period." };
      throw new Error("Unable to reserve analysis capacity.");
    }
    reservedAnalysisId = reservation.id;

    console.log({
      OPENAI_API_KEY_EXISTS: !!process.env.OPENAI_API_KEY,
      OPENAI_API_KEY_LENGTH: process.env.OPENAI_API_KEY?.length ?? 0,
    });

    const result = await generateSalesBrief(normalizedUrl);
    console.info("[analysis-action] analysis generation completed", { stage: "OpenAI response parsing", url: normalizedUrl });
    const payload = {
      json_result: result,
      score: result.salesScore,
      status: "completed",
    };

    console.info("[analysis-action] persistence started", { stage: "Supabase persistence", url: normalizedUrl });
    const { data: savedAnalysis, error: insertError } = await supabase
      .from("analyses")
      .update(payload)
      .eq("id", reservedAnalysisId)
      .eq("user_id", userId)
      .select("id")
      .single();
    if (insertError) {
      console.error("[analysis-action] persistence failed", {
        stage: "Supabase persistence",
        source,
        originalAnalysisId,
        website: normalizedUrl,
        duplicateProtectionEnabled,
        code: insertError.code,
        message: insertError.message,
      });
      if (insertError.code === "23505") {
        if (source === "rerun") {
          return { success: false, error: "The re-run could not be saved because the database still enforces unique website records." };
        }
        return { success: false, error: "This website has already been analyzed." };
      }
      if (insertError.message === "free_analysis_quota_exceeded") {
        return { success: false, error: "You've used all 3 free analyses." };
      }
      if (insertError.message === "starter_analysis_quota_exceeded") {
        return { success: false, error: "You've used all 10 Starter analyses for this billing period." };
      }
      throw new Error("Unable to save this analysis.");
    }
    console.info("[analysis-action] persistence completed", { stage: "Supabase persistence", url: normalizedUrl });

    revalidatePath("/dashboard/history");
    revalidatePath("/dashboard");

    console.info("[analysis-action] returning success", { stage: "final response", url: normalizedUrl });
    const serializableResult = JSON.parse(JSON.stringify(result)) as typeof result;
    return { success: true, result: serializableResult, analysisId: savedAnalysis.id };
  } catch (error) {
    if (reservedAnalysisId) {
      const supabase = await createServerSupabaseClient();
      await supabase.from("analyses").delete().eq("id", reservedAnalysisId).eq("status", "processing");
    }
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const stage = error instanceof AnalysisPipelineError ? error.stage : "server action";
    const name = error instanceof Error ? error.name : "UnknownError";
    const safeErrorMessage = error instanceof Error ? error.message : "Unknown error.";
    const status = typeof record.status === "number" ? record.status : undefined;
    console.error("[analysis-action] failed", { stage, name, message: safeErrorMessage, status });
    const message = error instanceof AnalysisPipelineError
      ? error.userMessage
      : error instanceof Error && (error.message.startsWith("The website") || error.message === "Unable to save this analysis.")
        ? error.message
        : "We couldn't complete the analysis. Please try again.";
    console.info("[analysis-action] returning failure", { stage: "final response", name, message, status });
    return { success: false, error: message } as const;
  }
}

export async function analyzeWebsiteAction(rawUrl: string) {
  return runAnalysis(rawUrl, { source: "new-analysis", duplicateProtectionEnabled: true });
}

export async function getRecentAnalysesForRerun() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in to view recent analyses.", analyses: [] } as const;

    const { data, error } = await supabase
      .from("analyses")
      .select("id, website")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(3);

    if (error) throw error;
    return { success: true, analyses: data ?? [] } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load recent analyses.";
    console.error("[analysis-action] recent analyses failed", { stage: "recent analyses", message });
    return { success: false, error: "Unable to load recent analyses.", analyses: [] } as const;
  }
}

export async function rerunSavedAnalysisAction(analysisId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in before re-running an analysis." } as const;

    const { data: analysis, error } = await supabase
      .from("analyses")
      .select("website")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .eq("status", "completed")
      .maybeSingle();

    if (error) throw error;
    if (!analysis) return { success: false, error: "The saved analysis could not be found." } as const;

    console.info("[analysis-action] re-run started", {
      stage: "re-run",
      source: "rerun",
      originalAnalysisId: analysisId,
      website: analysis.website,
      duplicateProtectionEnabled: false,
    });
    return runAnalysis(analysis.website, {
      source: "rerun",
      originalAnalysisId: analysisId,
      duplicateProtectionEnabled: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to re-run this analysis.";
    console.error("[analysis-action] re-run failed", { stage: "re-run", message });
    return { success: false, error: "Unable to re-run this analysis." } as const;
  }
}
