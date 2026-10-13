import { SITE_URL } from "@/platform/brand";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/settings", "/placement", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
