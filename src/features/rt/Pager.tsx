import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Stop = { href: string; label: string } | null;

/** Previous and next as one joined control; an end of the list shows a disabled half. */
export function Pager({ prev, next }: { prev: Stop; next: Stop }) {
  return (
    <nav className="rx-pager" aria-label="Previous and next">
      {prev ? (
        <Link href={prev.href} aria-label={`Previous: ${prev.label}`} title={prev.label}><ArrowLeft size={14} aria-hidden="true" /> Prev</Link>
      ) : (
        <span aria-disabled="true"><ArrowLeft size={14} aria-hidden="true" /> Prev</span>
      )}
      {next ? (
        <Link href={next.href} aria-label={`Next: ${next.label}`} title={next.label}>Next <ArrowRight size={14} aria-hidden="true" /></Link>
      ) : (
        <span aria-disabled="true">Next <ArrowRight size={14} aria-hidden="true" /></span>
      )}
    </nav>
  );
}
