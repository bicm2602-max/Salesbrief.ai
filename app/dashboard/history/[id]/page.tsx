import { notFound, redirect } from "next/navigation";
import { AnalysisResults } from "@/components/analysis/analysis-results";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/types/analysis";
import { parseAnalysisProvider } from "@/services/ai-providers";

export default async function SavedAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("json_result, is_favorite, ai_provider")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load this analysis.");
  }
  if (!analysis || !analysis.json_result || typeof analysis.json_result !== "object") {
    notFound();
  }

  return <AnalysisResults result={analysis.json_result as unknown as AnalysisResult} analysisId={id} isFavorite={analysis.is_favorite} provider={parseAnalysisProvider(analysis.ai_provider)} />;
}
