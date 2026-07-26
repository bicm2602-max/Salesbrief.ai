import Link from "next/link";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AnalysisResult } from "@/types/analysis";

export default async function FavoritesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: analyses } = user ? await supabase.from("analyses").select("id, website, json_result, score").eq("user_id", user.id).eq("status", "completed").eq("is_favorite", true).order("created_at", { ascending: false }) : { data: [] };
  return <div className="space-y-8"><PageHeader title="Favorites" description="Your saved analyses for quick follow-up and review." />
    {analyses?.length ? <div className="grid gap-6 lg:grid-cols-3">{analyses.map((analysis) => { const result = analysis.json_result as AnalysisResult; return <article key={analysis.id} className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"><Heart className="size-4 text-rose-300" fill="currentColor" /><h3 className="mt-6 text-xl font-semibold text-slate-50">{result.companyName}</h3><p className="mt-3 text-sm leading-7 text-slate-400">{result.summary}</p><Link href={`/dashboard/history/${analysis.id}`} className="mt-6 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm text-white">Open brief</Link></article>; })}</div> : <div className="space-y-4"><EmptyState title="You have no favorite analyses yet." description="Favorite an analysis to keep it here." /><div className="text-center"><Link href="/dashboard/history" className="rounded-full bg-blue-600 px-4 py-2 text-sm text-white">View history</Link></div></div>}
  </div>;
}
