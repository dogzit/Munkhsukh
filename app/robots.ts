import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

// Google зөвхөн нэвтрэх хуудсыг индексжүүлнэ. Нэвтэрсний дараах
// мэдээлэл (утас, имэйл, нийтлэл) нь хайлтад гарахгүй.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: { userAgent: "*", allow: ["/", "/auth/login", "/auth/signup"], disallow: ["/api/"] },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
