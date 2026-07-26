"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toggleAnalysisFavorite } from "@/app/dashboard/actions";

export function FavoriteButton({ analysisId, initialFavorite }: { analysisId: string; initialFavorite: boolean }) {
  const [favorite, setFavorite] = React.useState(initialFavorite);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  async function toggle() {
    if (saving) return;
    setSaving(true); setError(null);
    const result = await toggleAnalysisFavorite(analysisId, !favorite);
    if (result.success) setFavorite(result.isFavorite); else setError(result.error);
    setSaving(false);
  }
  return <div><button type="button" onClick={toggle} disabled={saving} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-slate-200 disabled:opacity-70"><span className="inline-flex items-center gap-2"><Heart className="size-4" fill={favorite ? "currentColor" : "none"} />{saving ? "Saving…" : favorite ? "Favorited" : "Favorite"}</span></button>{error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}</div>;
}
