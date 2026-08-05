"use client";

import Link from "next/link";

export function DashboardUpgradeButton({ compact = false }: { compact?: boolean }) {
  const className = compact
    ? "text-sm text-blue-300 transition hover:text-blue-200"
    : "rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10";

  return <Link href="/dashboard/plans" className={className}>Upgrade</Link>;
}
