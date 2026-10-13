import Link from "next/link";
import { BRAND_NAME } from "@/platform/brand";

/** "runtime." — the brand is typographic; the period is the only accent. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="rt-wordmark" aria-label={`${BRAND_NAME} home`}>
      runtime<span className="rt-wordmark-dot" aria-hidden="true">.</span>
    </Link>
  );
}
