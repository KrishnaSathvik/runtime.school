import type { ReactNode } from "react";

/** Output columns as chips, in the order the grader expects. */
export function Cols({ names }: { names: string[] }) {
  return (
    <span className="rx-cols">
      {names.map((n) => <code key={n}>{n}</code>)}
    </span>
  );
}

/** What a task asks for, as labelled rows: return, rows, watch for, … */
export function Spec({ rows, label = "What to return" }: { rows: [string, ReactNode][]; label?: string }) {
  return (
    <dl className="rx-spec" aria-label={label}>
      {rows.map(([k, v], i) => (
        <div key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
