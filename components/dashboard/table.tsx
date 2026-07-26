import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "@/components/analysis/favorite-button";

interface TableRow {
  id: string;
  company: string;
  date: string;
  score: string;
  status: string;
  href: string;
  isFavorite: boolean;
}

interface DashboardTableProps {
  rows: TableRow[];
}

export function DashboardTable({ rows }: DashboardTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-900/70">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-400">
            <tr>
              <th className="px-5 py-4 font-medium">Company</th>
              <th className="px-5 py-4 font-medium">Date</th>
              <th className="px-5 py-4 font-medium">Score</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10 text-slate-300">
                <td className="px-5 py-4 font-medium text-slate-100">{row.company}</td>
                <td className="px-5 py-4">{row.date}</td>
                <td className="px-5 py-4">{row.score}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    {row.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <FavoriteButton analysisId={row.id} initialFavorite={row.isFavorite} />
                  <Link href={row.href} aria-label={`Open ${row.company} analysis`} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10">
                    <MoreHorizontal className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
