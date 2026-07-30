import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";

export const siteMetadata: Metadata = {
  title: "SalesBrief AI | AI Sales Research & Personalized Outreach",
  description: SITE_DESCRIPTION,
  metadataBase: new URL(SITE_URL),
  keywords: [
    "sales briefing",
    "revenue intelligence",
    "AI sales assistant",
    "enterprise SaaS",
  ],
  openGraph: {
    title: "SalesBrief AI | AI Sales Research & Personalized Outreach",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SalesBrief AI dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SalesBrief AI | AI Sales Research & Personalized Outreach",
    description: SITE_DESCRIPTION,
    creator: "@salesbriefai",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export function createMetadata(overrides: Metadata): Metadata {
  return {
    ...siteMetadata,
    ...overrides,
  };
}
