"use client";

import Link from "next/link";
import * as React from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Compass, FileText, Heart, HelpCircle, LayoutGrid, PanelsTopLeft, Settings, Sparkles, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSubscriptionDisplay } from "@/app/dashboard/actions";
import { createCustomerPortalSession } from "@/lib/server/billing";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/dashboard/new-analysis", label: "New Analysis", icon: Sparkles },
  { href: "/dashboard/history", label: "History", icon: FileText },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [billing, setBilling] = React.useState<{ plan: "free" | "starter" | "pro" | "business"; displayName: string; detail: string; remaining: number | null; canManage: boolean } | null>(null);
  React.useEffect(() => { void getSubscriptionDisplay().then((result) => setBilling({ plan: result.plan, displayName: result.displayName, detail: result.detail, remaining: result.remaining, canManage: result.canManage })); }, []);

  const content = (
    <div className="flex h-full flex-col border-r border-white/10 bg-slate-950/80 px-4 py-5 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-2 py-2">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-300">
          <PanelsTopLeft className="size-5" />
        </div>
        {!collapsed ? (
          <div>
            <p className="text-sm font-semibold text-slate-100">SalesBrief AI</p>
            <p className="text-xs text-slate-400">Workspace</p>
          </div>
        ) : null}
      </div>

      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active ? "bg-blue-600/20 text-blue-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              <Icon className="size-4" />
              {!collapsed ? <span>{link.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-500/10 p-2 text-amber-300">
            <WalletCards className="size-4" />
          </div>
          {!collapsed ? <div>
            <p className="text-sm font-semibold text-slate-100">Billing</p>
            <p className="text-xs text-slate-400">{billing?.displayName ?? "Loading plan…"}</p>
          </div> : null}
        </div>
        {!collapsed ? <>
          <p className="mt-3 text-sm leading-7 text-slate-400">{billing?.detail ?? "Loading billing details…"}</p>
          {billing?.plan === "starter" && billing.remaining !== null ? <p className="mt-1 text-xs text-slate-500">{billing.remaining} analyses remaining</p> : null}
          {billing?.canManage ? <><form action={createCustomerPortalSession} className="mt-3"><button type="submit" className="text-sm text-blue-300 transition hover:text-blue-200">Manage subscription</button></form>{billing.plan === "starter" ? <Link href="/#pricing" className="mt-2 inline-block text-xs text-slate-400 transition hover:text-slate-200">Upgrade to Pro</Link> : null}</> : <Link href="/#pricing" className="mt-3 inline-block text-sm text-blue-300 transition hover:text-blue-200">Upgrade</Link>}
        </> : null}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">
        <HelpCircle className="size-4" />
        {!collapsed ? <span>Help</span> : null}
      </div>
    </div>
  );

  return (
    <>
      <aside className={cn("hidden h-screen shrink-0 md:block", collapsed ? "w-20" : "w-72")}>{content}</aside>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-950/70 md:hidden" onClick={onMobileClose}>
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} className="h-full w-72" onClick={(event) => event.stopPropagation()}>
              {content}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
