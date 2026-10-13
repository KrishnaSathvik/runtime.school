"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { planComparisons, seed } from "@/content";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { prettySql as formatSql } from "@/components/editor/pretty-sql";
import { Shell } from "../Shell";
import { Output } from "../Output";
import { Select } from "../Select";

type Observed = NonNullable<ExecuteResponse["comparison"]>[number];

/** Reads the real EXPLAIN QUERY PLAN rows. */
function readPlan(o: Observed) {
  const steps = o.plan.values.map((row) => String(row.at(-1)));
  const text = steps.join("; ");
  const index = text.match(/USING (?:COVERING )?INDEX (\w+)/)?.[1] ?? null;
  const access: "SEARCH" | "SCAN" | "OTHER" = /\bSEARCH\b/.test(text) ? "SEARCH" : /\bSCAN\b/.test(text) ? "SCAN" : "OTHER";
  const covering = /COVERING INDEX/.test(text);
  const tempTree = text.match(/USE TEMP B-TREE FOR (ORDER BY|GROUP BY|DISTINCT)/)?.[1] ?? null;
  const multi = /MULTI-INDEX OR/.test(text);
  return { steps, index, access, covering, tempTree, multi, rows: o.result.values.length };
}
/** Green for index searches, red for full table scans and extra sort steps; a full index scan stays neutral. */
const stepTone = (s: string) =>
  /USE TEMP B-TREE/.test(s) || /^SCAN \w+$/.test(s.trim()) ? "bad" : /\bSEARCH\b|MULTI-INDEX/.test(s) ? "ok" : "";

const split = (sql: string) => {
  const parts = sql.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
  return { setup: parts.slice(0, -1), query: parts.at(-1) ?? "" };
};

/** Two versions of one query, their real plans and output side by side. */
export function QueryPlans() {
  const [choice, setChoice] = useState(0);
  const [res, setRes] = useState<{ choice: number; value: ExecuteResponse } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const compare = useCallback(async (i: number) => {
    const id = ++run.current;
    setBusy(true);
    setRes(null);
    try {
      // Retry if another query on the page interrupted this one.
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await executeSql({ seed, query: "SELECT 1", allowWrites: true, compare: planComparisons[i].cases });
        if (id !== run.current) return;
        if (!r.superseded) { setRes({ choice: i, value: r }); return; }
      }
    } finally {
      if (id === run.current) setBusy(false);
    }
  }, []);
  useEffect(() => { void compare(choice); }, [choice, compare]);

  const c = planComparisons[choice];
  const r = res?.choice === choice ? res.value : null;
  const plans = r?.comparison?.map(readPlan);

  return (
    <Shell path={[{ label: "sql" }, { label: "query-plans" }]} section="tools" status={["SQL", "query performance", "real EXPLAIN QUERY PLAN output", "sqlite"]}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="qp-title">
            <p className="rx-prompt-line"><b>query plans</b> explain query plan · {planComparisons.length} comparisons · real output</p>
            <Select
              id="qp-choice"
              label="comparison"
              value={String(choice)}
              onChange={(v) => setChoice(Number(v))}
              options={planComparisons.map((p, i) => ({ value: String(i), label: `${String(i + 1).padStart(2, "0")} · ${p.title}` }))}
            />
            <h1 id="qp-title" className="rx-task-title" style={{ marginTop: 22 }}>{c.title}</h1>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{c.question}</p>

            {c.explain && (
              <>
                <p className="rx-label">how it works</p>
                <p className="rx-prose" style={{ marginTop: 0 }}>{c.explain}</p>
              </>
            )}

            <p className="rx-label">what the plans show</p>
            <div aria-live="polite" aria-busy={busy}>
              {busy && <p className="rx-prompt-line">running both queries…</p>}
              {r?.error && <Output res={r} query={c.cases[0].query} />}
              {plans && (
                <div className="rx-table-wrap" style={{ padding: 0 }}>
                  <table className="rx-table rx-compare">
                    <thead><tr><th></th>{c.cases.map((k, i) => <th key={k.label}>{i === 0 ? "A" : "B"} · {k.label}</th>)}</tr></thead>
                    <tbody>
                      <tr><td>access</td>{plans.map((p, i) => <td key={i} className={p.access === "SEARCH" ? "ok" : p.access === "SCAN" ? "bad" : ""}>{p.access}</td>)}</tr>
                      <tr><td>index</td>{plans.map((p, i) => <td key={i}>{p.multi ? "two indexes (MULTI-INDEX OR)" : p.index ?? "none"}</td>)}</tr>
                      <tr><td>covering index</td>{plans.map((p, i) => <td key={i} className={p.covering ? "ok" : ""}>{p.covering ? "yes · table not read" : "no"}</td>)}</tr>
                      <tr><td>extra sort step</td>{plans.map((p, i) => <td key={i} className={p.tempTree ? "bad" : ""}>{p.tempTree ? `yes · temp b-tree for ${p.tempTree}` : "no"}</td>)}</tr>
                      <tr><td>rows</td>{plans.map((p, i) => <td key={i}>{p.rows}</td>)}</tr>
                      <tr><td>same output</td><td colSpan={2}>{r?.equivalent === undefined ? "not checked" : r.equivalent ? "yes · only the plan differs" : "no · the queries answer different questions"}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {c.takeaway && <p className="rx-note" style={{ fontSize: 15 }}><strong>What to notice:</strong> {c.takeaway}</p>}
            <p className="rx-small">On this small sample both versions finish instantly, so the plan is the evidence, not the timing. With millions of rows these differences decide how fast a query runs.</p>

            <details className="rx-plain">
              <summary>How to read a query plan</summary>
              <p className="rx-prose" style={{ fontSize: 15 }}>SCAN reads every row (or every index entry). SEARCH jumps to just the matching rows through an index. COVERING INDEX means the index alone answers the query. USE TEMP B-TREE is an extra step where SQLite sorts or groups rows itself. An index does not make every query faster; it helps when it lets SQLite skip work.</p>
            </details>
          </article>
          <section className="rx-work rx-lesson-work" aria-label="Approaches A and B">
            {c.cases.map((k, i) => {
              const o = r?.comparison?.[i];
              const { setup, query } = split(k.query);
              return (
                <section key={k.label} className="rx-cell" aria-label={`Approach ${i === 0 ? "A" : "B"}`} style={i === 0 ? { marginTop: 0 } : undefined}>
                  <div className="rx-cell-head"><span className="name">{i === 0 ? "a" : "b"}.sql · {k.label}</span></div>
                  {setup.length > 0 && <div className="rx-cell-in" style={{ paddingBottom: 0 }}><span className="p">setup›</span><pre>{setup.map((s) => formatSql(s) + ";").join("\n")}</pre></div>}
                  <div className="rx-cell-in"><span className="p">sql›</span><pre>{formatSql(query)};</pre></div>
                  {o ? (
                    <>
                      <div className="rx-out">
                        <div className="rx-out-meta"><span>explain query plan</span></div>
                        <ol className="rx-plan mono">
                          {readPlan(o).steps.map((s, j) => <li key={j} className={stepTone(s)}>{s}</li>)}
                        </ol>
                      </div>
                      <Output res={{ result: { ...o.result, values: o.result.values.slice(0, 5) }, total: o.result.values.length }} query={query} />
                    </>
                  ) : (
                    <p className="rx-out-meta">{busy ? "running…" : "waiting for the comparison"}</p>
                  )}
                </section>
              );
            })}
          </section>
        </div>
      </div>
    </Shell>
  );
}
