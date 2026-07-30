import type { MetadataRoute } from "next";

const SITE_URL = "https://getsalesbrief.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: SITE_URL, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/login`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/register`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
