/** Runtime — public brand. Domain: runtime.school, served from www.runtime.school. */
export const BRAND_NAME = "Runtime";
export const BRAND_DOMAIN = "runtime.school";
export const BRAND_TAGLINE = "Learn it. Run it. Understand it.";
export const BRAND_DESCRIPTION =
  "Learn technical skills by actually using them: structured lessons, real code running in your browser, and practical projects. Start with SQL.";
/** Canonical site origin (the www host); override with NEXT_PUBLIC_SITE_URL for previews. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://www.${BRAND_DOMAIN}`;
