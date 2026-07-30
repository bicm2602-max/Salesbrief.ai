import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/settings/", "/history/", "/favorites/", "/api/"],
    },
    sitemap: "https://getsalesbrief.com/sitemap.xml",
  };
}
