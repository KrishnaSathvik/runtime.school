"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
/** The return URL is optional UI context, never executable navigation from another origin. */
export function ToolReturn() {
  const [href, setHref] = useState<string | null>(null);
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    if (from?.startsWith('/pyspark/tools/')) setHref(from);
  }, []);
  return href ? <div className="ps-return"><Link href={href}>← Return to your tool experiment</Link></div> : null;
}
