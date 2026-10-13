import type { Metadata } from "next";
import { Landing } from "@/features/rt/pages/Landing";
import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_TAGLINE } from "@/platform/brand";
import { siteJsonLd } from "@/platform/seo";
import "./sql/rt.css";

export const metadata: Metadata = {
  title: {
    absolute: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
  },
  description: BRAND_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND_NAME} — Learn by doing.` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    images: ["/og.png"],
  },
};

/** Subject picker; SQL learning starts at /sql. */
export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd()) }} />
      <Landing />
    </>
  );
}
