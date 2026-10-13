import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND_NAME, BRAND_TAGLINE } from "@/platform/brand";

export const alt = `${BRAND_NAME} — ${BRAND_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share card for the public site. SQL pages set their own via seo.ts. */
export default async function Image() {
  const data = await readFile(join(process.cwd(), "public/og.png"));
  return new Response(data, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
