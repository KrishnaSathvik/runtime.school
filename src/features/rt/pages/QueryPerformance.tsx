"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { datasetName, isToolDataset, toolDataset } from "@/content/tools/datasets";
import { comparisonCases, comparisonsFor, type PerformanceComparison } from "@/content/tools/performance";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { prettySql as formatSql } from "@/components/editor/pretty-sql";
import { Shell } from "../Shell";
import { Output } from "../Output";
import { Select } from "../Select";
import { SqlCode } from "../SqlCode";
import { DatasetPicker, TablesInvolved } from "../DatasetBrowser";

type Observed = NonNullable<ExecuteResponse["comparison"]>[number];

/** Reads the real EXPLAIN QUERY PLAN rows. */
function readPlan(o: Observed) {
  const steps = o.plan.values.map((row) => String(row.at(-1)));
  const text = steps.join("; ");
  const index = text.match(/USING (?:COVERING )?INDEX (\w+)/)?.[1] ?? (/USING (?:INTEGER )?PRIMARY KEY/.test(text) ? "primary key" : null);
  const access: "SEARCH" | "SCAN" | "OTHER" = /\bSEARCH\b/.test(text) ? "SEARCH" : /\bSCAN\b/.test(text) ? "SCAN" : "OTHER";
  const covering = /COVERING INDEX/.test(text);
  const tempTree = text.match(/USE TEMP B-TREE FOR (?:LAST TERM OF )?(ORDER BY|GROUP BY|DISTINCT)/)?.[1] ?? null;
  const multi = /MULTI-INDEX OR/.test(text);
  return { steps, index, access, covering, tempTree, multi, rows: o.total ?? o.result.values.length };
}
/** Access paths describe work; scans and sorts are not inherently bad. */
const stepTone = (s: string) => (/\bSEARCH\b|MULTI-INDEX/.test(s) ? "ok" : "");

const APPROACH = ["A", "B"] as const;

/** Two ways of writing one query on a canonical dataset, their real plans and output side by side. */
export function QueryPerformance() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("dataset");
  const dataset: CanonicalDatasetId = isToolDataset(requested) ? requested : "retail";
  const options = comparisonsFor(dataset);
  const c = options.find((p) => p.id === params.get("comparison")) ?? options[0];
  const go = (ds: CanonicalDatasetId, id?: string) =>
    router.replace(`/sql/query-performance?dataset=${ds}&comparison=${id ?? comparisonsFor(ds)[0].id}`, { scroll: false });

  const [res, setRes] = useState<{ id: string; value: ExecuteResponse } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const compare = useCallback(async (p: PerformanceComparison) => {
    const id = ++run.current;
    setBusy(true);
    try {
      // Retry if another query on the page interrupted this one.
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await executeSql({ seed: toolDataset(p.datasetId).seed, query: "SELECT 1", allowWrites: true, compare: comparisonCases(p) });
        if (id !== run.current) return;
        if (!r.superseded) { setRes({ id: p.id, value: r }); return; }
      }
    } catch (error) {
      if (id === run.current) setRes({ id: p.id, value: { error: error instanceof Error ? error.message : "Could not run this comparison." } });
    } finally {
      if (id === run.current) setBusy(false);
    }
  }, []);
  useEffect(() => { void compare(c); }, [c, compare]);

  const r = res?.id === c.id ? res.value : null;
  const plans = r?.comparison?.map(readPlan);
  const approaches = [c.a, c.b];

  return (
    <Shell path={[{ label: "sql" }, { label: "query-performance" }, { label: dataset }]} section="tools" status={["SQL", "query performance", `sqlite · ${datasetName(dataset)}`, "real EXPLAIN QUERY PLAN output"]}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="qp-title">
            <p className="rx-prompt-line"><b>query performance</b> compare approaches · real SQLite plans</p>
            <h1 id="qp-title" className="rx-task-title">Query Performance</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Compare two ways of writing the same query and inspect the real SQLite execution plan for each.</p>
            <DatasetPicker value={dataset} onChange={(id) => go(id)} />
            <Select
              id="qp-choice"
              label="comparison"
              value={c.id}
              onChange={(id) => go(dataset, id)}
              options={options.map((p) => ({ value: p.id, label: p.title }))}
            />

            <h2 className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>{c.title}</h2>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{c.question}</p>

            <p className="rx-label">how it works</p>
            <p className="rx-prose" style={{ marginTop: 0 }}>{c.explain}</p>

            <p className="rx-label">what the plans show</p>
            <div aria-live="polite" aria-busy={busy}>
              {busy && !plans && <p className="rx-prompt-line">running both approaches on the full dataset…</p>}
              {r?.error && <Output res={r} query={c.a.query} />}
              {plans && (
                <div className="rx-table-wrap" style={{ padding: 0 }}>
                  <table className="rx-table rx-compare">
                    <thead><tr><th></th>{approaches.map((k, i) => <th key={k.label}>{APPROACH[i]} · {k.label}</th>)}</tr></thead>
                    <tbody>
                      <tr><td>access</td>{plans.map((p, i) => <td key={i} className={p.access === "SEARCH" || p.multi ? "ok" : p.access === "SCAN" ? "bad" : ""}>{p.multi ? "SEARCH ×2" : p.access}</td>)}</tr>
                      <tr><td>index</td>{plans.map((p, i) => <td key={i}>{p.multi ? "two indexes (MULTI-INDEX OR)" : p.index ?? "none"}</td>)}</tr>
                      <tr><td>covering index</td>{plans.map((p, i) => <td key={i} className={p.covering ? "ok" : ""}>{p.covering ? "yes · table not read" : "no"}</td>)}</tr>
                      <tr><td>temp sort</td>{plans.map((p, i) => <td key={i} className={p.tempTree ? "bad" : ""}>{p.tempTree ? `yes · ${p.tempTree}` : "no"}</td>)}</tr>
                      <tr><td>rows returned</td>{plans.map((p, i) => <td key={i}>{p.rows.toLocaleString("en-US")}</td>)}</tr>
                      <tr><td>same output</td><td colSpan={2}>{r?.equivalent === undefined ? "not checked" : r.equivalent ? "yes · only the plan differs" : "no · the queries answer different questions"}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <p className="rx-note" style={{ fontSize: 15 }}><strong>What to notice:</strong> {c.takeaway}</p>

            <p className="rx-label sec">tables involved</p>
            <TablesInvolved id={dataset} sql={`${c.a.query} ${c.b.query}`} />
            <p className="rx-small">Both approaches run on a fresh copy of the full {datasetName(dataset)} dataset. Browser timings are noisy, so the plan is the evidence, not the milliseconds.</p>

            <p className="rx-label sec">how to read a query plan</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>SCAN reads every row, or every entry of an index. SEARCH jumps to just the matching entries of an index; the terms in brackets show which columns the jump used. COVERING INDEX means the index alone answers the query and the table is not read. USE TEMP B-TREE is an extra step where SQLite sorts or groups rows itself. An index does not make every query faster: it helps when it lets SQLite skip work, and it costs space and slower writes.</p>
          </article>
          <section className="rx-work rx-lesson-work" aria-label="Approaches A and B">
            {approaches.map((k, i) => {
              const o = r?.comparison?.[i];
              const label = APPROACH[i];
              return (
                <section key={`${c.id}-${label}`} className="rx-cell" aria-label={`Approach ${label}`} style={i === 0 ? { marginTop: 0 } : undefined}>
                  <div className="rx-cell-head"><span className="name">{label.toLowerCase()}.sql · {k.label}</span></div>
                  {k.setup && <div className="rx-cell-in" style={{ paddingBottom: 0 }}><span className="p">setup›</span><SqlCode source={`${formatSql(k.setup)};`} label="Setup SQL" /></div>}
                  <div className="rx-cell-in"><span className="p">sql›</span><SqlCode source={`${formatSql(k.query)};`} label="Query" /></div>
                  {o ? (
                    <>
                      <div className="rx-out">
                        <div className="rx-out-meta"><span>explain query plan</span></div>
                        <ol className="rx-plan mono">
                          {readPlan(o).steps.map((s, j) => <li key={j} className={stepTone(s)}>{s}</li>)}
                        </ol>
                      </div>
                      <Output res={{ result: { ...o.result, values: o.result.values.slice(0, 5) }, total: o.total ?? o.result.values.length }} query={k.query} />
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
