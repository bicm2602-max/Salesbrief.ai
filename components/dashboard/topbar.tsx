"use client";

import * as React from "react";
import { Search, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/server/auth";
import { getDashboardIdentity, searchAnalyses } from "@/app/dashboard/actions";
import { DashboardUpgradeButton } from "@/components/billing/dashboard-upgrade-button";

export function Topbar() {
  const router = useRouter();
  const [identity, setIdentity] = React.useState<{ name: string; email: string } | null>(null);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ id: string; website: string; companyName: string }[]>([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  React.useEffect(() => { void getDashboardIdentity().then((response) => { if (response.success) setIdentity({ name: response.name, email: response.email }); }); }, []);
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      void searchAnalyses(query).then((response) => {
        if (response.success) { setResults([...response.results]); setSearchError(null); }
        else setSearchError(response.error);
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);
  const initials = identity?.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "";

  return (
    <div className="flex flex-1 items-center justify-end gap-3">
      <div className="relative hidden sm:block">
      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
        <Search className="size-4" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-44 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" placeholder="Search analyses" />
      </label>
      {query ? <div className="absolute right-0 top-11 z-20 w-80 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">{searchError ? <p className="p-3 text-sm text-rose-300">{searchError}</p> : results.length ? results.map((result) => <button key={result.id} type="button" onClick={() => router.push(`/dashboard/history/${result.id}`)} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5"><span className="block text-slate-100">{result.companyName}</span><span className="block truncate text-slate-400">{result.website}</span></button>) : <p className="p-3 text-sm text-slate-400">No analyses found</p>}</div> : null}
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
        <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 font-semibold text-slate-950">{initials}</div>
        <span className="hidden sm:inline">{identity?.name}</span>
        <ChevronDown className="size-4" />
        <span className="hidden text-xs text-slate-400 lg:inline">{identity?.email}</span>
        <Link href="/dashboard/settings" className="text-xs text-blue-300">Settings</Link>
      </div>
      <form action={signOut}>
        <button type="submit" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10">
          Sign out
        </button>
      </form>
      <DashboardUpgradeButton />
    </div>
  );
}
