import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";

export const metadata: Metadata = createMetadata({
  title: "Authentication",
  description: "Secure access to SalesBrief AI.",
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
