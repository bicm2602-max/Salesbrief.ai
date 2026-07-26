import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { PageWrapper } from "@/components/ui/page-wrapper";

export const metadata: Metadata = createMetadata({
  title: "Dashboard",
  description: "Protected workspace for SalesBrief AI.",
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PageWrapper>{children}</PageWrapper>;
}
