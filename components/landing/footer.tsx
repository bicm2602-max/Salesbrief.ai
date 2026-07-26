import Link from "next/link";
import { Globe2Icon, MessageCircleIcon, SendIcon } from "lucide-react";
import { Container } from "@/components/ui/container";

const footerLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
  { label: "Contact", href: "#" },
];

const socials = [
  { label: "Twitter", href: "#", icon: Globe2Icon },
  { label: "LinkedIn", href: "#", icon: MessageCircleIcon },
  { label: "GitHub", href: "#", icon: SendIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80 py-10">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-50">SalesBrief AI</p>
          <p className="mt-2 text-sm text-slate-400">AI Sales Intelligence for Agencies.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          {footerLinks.map((link) => (
            <Link key={link.label} href={link.href} className="transition hover:text-slate-100">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {socials.map((social) => {
            const Icon = social.icon;
            return (
              <Link key={social.label} href={social.href} className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:text-slate-100">
                <Icon className="size-4" />
              </Link>
            );
          })}
        </div>
      </Container>
    </footer>
  );
}
