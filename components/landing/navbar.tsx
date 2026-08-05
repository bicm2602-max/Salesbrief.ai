import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Container } from "@/components/ui/container";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar({ user }: { user: { email: string } | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <Container className="flex items-center justify-between py-4">
        <Link href="#" className="flex items-center gap-3 text-sm font-semibold tracking-[0.2em] text-slate-100 uppercase">
          <span className="flex size-9 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
            SB
          </span>
          SalesBrief AI
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-slate-400 transition hover:text-slate-100">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user ? <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20">Dashboard<ArrowRight className="size-4" /></Link> : <><Link href="/login" className="hidden text-sm text-slate-400 transition hover:text-slate-100 sm:inline-flex">Login</Link><Link href="/register" className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20">Create account<ArrowRight className="size-4" /></Link></>}
          <button className="rounded-full border border-white/10 p-2 text-slate-300 md:hidden">
            <Menu className="size-4" />
          </button>
        </div>
      </Container>
    </header>
  );
}
