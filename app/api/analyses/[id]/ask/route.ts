import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { askAnalysisAssistantSchema, createAnalysisAssistantService, analysisAssistantRateLimiter } from "@/services/analysis-assistant";
import { generateCompanyAssistantAnswer } from "@/services/openai";
import { getCurrentSubscriptionState } from "@/lib/server/subscription-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to ask about an analysis." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  const parsedPayload = askAnalysisAssistantSchema.safeParse(payload);
  if (!parsedPayload.success) return NextResponse.json({ error: parsedPayload.error.issues[0]?.message ?? "Please enter a valid question." }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const { data: ownedAnalysis, error: ownedAnalysisError } = await supabase
    .from("analyses")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();
  if (ownedAnalysisError) return NextResponse.json({ error: "Unable to verify the analysis." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  if (!ownedAnalysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const subscription = await getCurrentSubscriptionState();
  if (!subscription || subscription.userId !== user.id || subscription.plan === "free" || subscription.plan === "business") {
    console.info("[analysis-assistant] entitlement rejected", { userId: user.id, analysisId: id, plan: subscription?.plan ?? "unknown" });
    return NextResponse.json({ error: "Ask SalesBrief is available with an active Starter or Pro plan." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  let usageId: string | null = null;
  if (subscription.plan === "starter") {
    const { data: usage, error: usageError } = await supabase
      .from("analysis_assistant_usage")
      .insert({ user_id: user.id, analysis_id: id, status: "reserved" })
      .select("id")
      .single();
    if (usageError) {
      console.info("[analysis-assistant] quota rejected", { userId: user.id, analysisId: id, code: usageError.code, message: usageError.message });
      if (usageError.message === "starter_ask_salesbrief_quota_exceeded") return NextResponse.json({ error: "You've used all 10 Ask SalesBrief questions for this brief." }, { status: 429, headers: { "Cache-Control": "no-store" } });
      if (usageError.message === "ask_salesbrief_not_available") return NextResponse.json({ error: "Ask SalesBrief requires an active Starter or Pro subscription." }, { status: 403, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json({ error: "Unable to reserve an Ask SalesBrief question. Please try again." }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    usageId = usage.id;
  }
  const service = createAnalysisAssistantService({
    rateLimiter: analysisAssistantRateLimiter,
    loadOwnedAnalysis: async (userId, analysisId) => {
      const { data, error } = await supabase
        .from("analyses")
        .select("json_result")
        .eq("id", analysisId)
        .eq("user_id", userId)
        .eq("status", "completed")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    generateAnswer: generateCompanyAssistantAnswer,
  });

  try {
    const result = await service(user.id, id, parsedPayload.data);
    if (usageId) {
      if (result.status === 200) await supabase.from("analysis_assistant_usage").update({ status: "completed" }).eq("id", usageId).eq("user_id", user.id);
      else await supabase.from("analysis_assistant_usage").delete().eq("id", usageId).eq("user_id", user.id).eq("status", "reserved");
    }
    return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (usageId) await supabase.from("analysis_assistant_usage").delete().eq("id", usageId).eq("user_id", user.id).eq("status", "reserved");
    console.error("[analysis-assistant] request failed", { name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unknown error." });
    return NextResponse.json({ error: "The company assistant could not answer right now. Please try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
