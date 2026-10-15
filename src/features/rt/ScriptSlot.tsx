"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useHydrated, useLearning } from "@/lib/learning-state";

/**
 * The SQL draft behind a tool's editor. Loading new SQL (a preset, a table, a deep link) replaces
 * the draft directly while it is untouched, and asks first once it holds the learner's own edits.
 */
export function useScriptSlot(key: string, fallback: string, untouched: (sql: string) => boolean) {
  const drafts = useLearning((s) => s.drafts);
  const setDraft = useLearning((s) => s.setDraft);
  const [pending, setPending] = useState<{ key: string; sql: string } | null>(null);
  const value = drafts[key] ?? fallback;
  const load = (sql: string) => {
    if (value.trim() && !untouched(value) && sql !== value) setPending({ key, sql });
    else { setDraft(key, sql); setPending(null); }
  };
  return {
    value,
    set: (sql: string) => setDraft(key, sql),
    load,
    pending: pending?.key === key ? pending.sql : null,
    confirm: () => { if (pending) setDraft(pending.key, pending.sql); setPending(null); },
    cancel: () => setPending(null),
  };
}

/** Loads `?sql=` once saved drafts are available, then removes it from the address. */
export function useSqlParam(load: (sql: string) => void) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ready = useHydrated();
  const handled = useRef<string | null>(null);
  const sql = params.get("sql");
  useEffect(() => {
    if (!ready || !sql || handled.current === sql) return;
    handled.current = sql;
    load(sql);
    const rest = new URLSearchParams(params.toString());
    rest.delete("sql");
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [ready, sql, load, params, pathname, router]);
}

export function ReplaceConfirm({ sql, onConfirm, onCancel, what = "query" }: { sql: string | null; onConfirm: () => void; onCancel: () => void; what?: string }) {
  if (sql === null) return null;
  return (
    <div className="rx-confirm" role="group" aria-label="Replace your SQL">
      <p>Replace your current SQL with this {what}? Your edits will be lost.</p>
      <div className="rx-confirm-acts">
        <button type="button" className="rx-btn primary" onClick={onConfirm}>Replace my SQL</button>
        <button type="button" className="rx-btn" onClick={onCancel}>Keep my SQL</button>
      </div>
    </div>
  );
}
