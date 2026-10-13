import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, List } from "lucide-react";

type PagerTarget = {
  href?: string;
  onClick?: () => void;
  label: string;
} | null | undefined;

function PagerControl({
  target,
  direction,
}: {
  target: PagerTarget;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  if (!target) {
    return (
      <span className="problem-pager-btn is-disabled" aria-disabled="true">
        <Icon size={18} aria-hidden />
      </span>
    );
  }
  if (target.href) {
    return (
      <Link href={target.href} className="problem-pager-btn" aria-label={target.label}>
        <Icon size={18} aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" className="problem-pager-btn" aria-label={target.label} onClick={target.onClick}>
      <Icon size={18} aria-hidden />
    </button>
  );
}

/** Shared top row for Learn / Practice / Projects / Placement workspaces. */
export function WorkspaceToolbar({
  listHref,
  listLabel,
  indexLabel,
  prev,
  next,
  trailing,
  ariaLabel = "Workspace navigation",
}: {
  listHref: string;
  listLabel: string;
  indexLabel?: string | null;
  prev?: PagerTarget;
  next?: PagerTarget;
  /** Extra actions on the right (e.g. skip), before the pager. */
  trailing?: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="problem-toolbar">
      <Link href={listHref} className="problem-toolbar-list">
        <List size={16} aria-hidden />
        <span>{listLabel}</span>
      </Link>
      <div className="problem-toolbar-pager">
        {trailing}
        {indexLabel ? <span className="problem-toolbar-index">{indexLabel}</span> : null}
        <PagerControl target={prev} direction="prev" />
        <PagerControl target={next} direction="next" />
      </div>
    </nav>
  );
}

/** Shared title + meta under the toolbar — same shape as Practice problems. */
export function WorkspaceHeading({
  title,
  badge,
  leading,
  meta,
  children,
}: {
  title: ReactNode;
  badge?: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode[];
  children?: ReactNode;
}) {
  const items = (meta ?? []).filter((item) => item !== null && item !== undefined && item !== false && item !== "");
  return (
    <div className="problem-heading">
      <div className="problem-heading-row">
        {leading}
        <h1>{title}</h1>
        {badge}
      </div>
      {items.length > 0 && (
        <p className="problem-meta">
          {items.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </p>
      )}
      {children}
    </div>
  );
}
