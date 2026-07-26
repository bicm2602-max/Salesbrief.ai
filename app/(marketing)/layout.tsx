import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { PageWrapper } from "@/components/ui/page-wrapper";

export const metadata: Metadata = createMetadata({
  title: "Marketing",
  description: "SalesBrief AI marketing experience.",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <PageWrapper>{children}</PageWrapper>;
}
