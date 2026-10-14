import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME } from "@/platform/brand";

/** Brand mark + “runtime.” — the period is the only accent. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="rt-wordmark" aria-label={`${BRAND_NAME} home`}>
      <Image
        src="/logo.png"
        alt=""
        width={28}
        height={28}
        className="rt-wordmark-mark"
        priority
      />
      runtime<span className="rt-wordmark-dot" aria-hidden="true">.</span>
    </Link>
  );
}
