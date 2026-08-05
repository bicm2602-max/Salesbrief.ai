import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAnalysisAssistantService, analysisAssistantRateLimiter } from "@/services/analysis-assistant";
import { generateCompanyAssistantAnswer } from "@/services/openai";

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
    const result = await service(user.id, id, payload);
    return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[analysis-assistant] request failed", { name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error ? error.message : "Unknown error." });
    return NextResponse.json({ error: "The company assistant could not answer right now. Please try again." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
