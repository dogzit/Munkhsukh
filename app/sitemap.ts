import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/auth/login`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/auth/signup`, changeFrequency: "monthly", priority: 0.8 },
  ];
}
