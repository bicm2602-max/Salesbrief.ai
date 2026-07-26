import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardTable } from "@/components/dashboard/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/types/analysis";

export default async function HistoryPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: analyses, error } = await supabase
    .from("analyses")
    .select("id, website, json_result, score, status, created_at, is_favorite")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load analysis history.");
  }

  const rows = (analyses ?? []).map((analysis) => {
    const result = analysis.json_result as unknown as AnalysisResult;
    return {
      id: analysis.id,
      company: result.companyName || new URL(analysis.website).hostname,
      date: new Date(analysis.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      score: `${analysis.score}/100`,
      status: "Completed",
      href: `/dashboard/history/${analysis.id}`,
      isFavorite: analysis.is_favorite,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analysis history"
        description="Review prior briefs, track progress, and keep an eye on the highest-performing prospects."
      />

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
        {rows.length > 0 ? (
          <DashboardTable rows={rows} />
        ) : (
          <EmptyState title="No analyses yet" description="Completed company analyses will appear here." />
        )}
      </div>
    </div>
  );
}
