"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, RotateCcw, X } from "lucide-react";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { datasetName, isToolDataset, toolDataset } from "@/content/tools/datasets";
import { comparisonCases, comparisonsFor, type Approach, type PerformanceComparison } from "@/content/tools/performance";
import { executeSql, isEngineBootError, type ExecuteResponse } from "@/engine/sql-client";
import { prettySql as formatSql } from "@/components/editor/pretty-sql";
import { Shell } from "../Shell";
import { Editor } from "../Editor";
import { Output } from "../Output";
import { Select } from "../Select";
import { SqlCode } from "../SqlCode";
import { DatasetPicker, TablesInvolved } from "../DatasetBrowser";
import { Keys, MacOnly } from "../Keys";

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
type Side = (typeof APPROACH)[number];
/** A slow engine start is retried after an explicit Run, not while the page is just showing the SQL. */
const BOOT_RETRIES = 3;
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

function runnable(sql: string) {
  return sql.trim().replace(/;+\s*$/, "");
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage blocked: the value lasts for this visit */
  }
}

/** A SQL draft saved in this browser, the same way Python performance drafts are. */
function useSqlDraft(key: string, initial: string) {
  const [state, setState] = useState<{ key: string; value: string }>({ key, value: initial });
  useEffect(() => {
    setState({ key, value: read(key) ?? initial });
  }, [key, initial]);
  const value = state.key === key ? state.value : initial;
  const set = useCallback((v: string) => {
    setState({ key, value: v });
    write(key, v === initial ? null : v);
  }, [key, initial]);
  const reset = useCallback(() => set(initial), [set, initial]);
  return { value, set, reset, edited: value !== initial };
}

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

  const a = useSqlDraft(`sql-perf-${c.id}-a`, formatSql(c.a.query));
  const b = useSqlDraft(`sql-perf-${c.id}-b`, formatSql(c.b.query));
  const drafts = { A: a, B: b };
  const [stored, setStored] = useState<Partial<Record<Side, { key: string; observed?: Observed; error?: string }>>>({});
  const [hidden, setHidden] = useState<Partial<Record<Side, boolean>>>({});
  const [plansOpen, setPlansOpen] = useState(false);
  const [plansNote, setPlansNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<Side | null>(null);
  const openFor = useRef<{ id: string; title: string } | null>(null);
  const seenComparison = useRef(c.id);
  const run = useRef(0);
  const busyRef = useRef<Side | null>(null);

  const runSide = useCallback(async (side: Side, sql: string) => {
    if (busyRef.current) return;
    const id = ++run.current;
    busyRef.current = side;
    setBusy(side);
    setHidden((prev) => ({ ...prev, [side]: false }));
    const approach: Approach = side === "A" ? { ...c.a, query: runnable(sql) } : { ...c.b, query: runnable(sql) };
    const edited: PerformanceComparison = side === "A" ? { ...c, a: approach } : { ...c, b: approach };
    const key = `${c.id}|${sql}`;
    try {
      let boots = 0;
      for (let attempt = 0; attempt < 3 + BOOT_RETRIES; attempt++) {
        const spec = comparisonCases(edited)[side === "A" ? 0 : 1];
        // The engine always compares two cases. Repeat this approach so only its SQL runs, then keep the first result.
        const r = await executeSql({
          seed: toolDataset(c.datasetId).seed,
          query: "SELECT 1",
          allowWrites: true,
          compare: [spec, spec],
        });
        if (id !== run.current) return;
        if (r.superseded) continue;
        if (isEngineBootError(r.error) && boots < BOOT_RETRIES) { boots++; await pause(1000 * boots); if (id !== run.current) return; continue; }
        const observed = r.comparison?.[0];
        setStored((prev) => ({ ...prev, [side]: { key, observed, error: r.error } }));
        if (observed && seenComparison.current === c.id) {
          openFor.current = { id: c.id, title: c.title };
          setPlansOpen(true);
          setPlansNote(null);
        }
        return;
      }
    } catch (error) {
      if (id === run.current) setStored((prev) => ({ ...prev, [side]: { key, error: error instanceof Error ? error.message : "Could not run this query." } }));
    } finally {
      if (id === run.current) { busyRef.current = null; setBusy(null); }
    }
  }, [c]);

  useEffect(() => {
    if (seenComparison.current === c.id) return;
    const from = openFor.current;
    seenComparison.current = c.id;
    if (!from || from.id === c.id) {
      setPlansNote(null);
      return;
    }
    openFor.current = null;
    setPlansOpen(false);
    setPlansNote(`Closed the plans for ${from.title}. This comparison is different.`);
  }, [c.id]);

  const closeSide = (side: Side) => {
    setStored((prev) => {
      if (!prev[side]) return prev;
      const next = { ...prev };
      delete next[side];
      return next;
    });
    setHidden((prev) => ({ ...prev, [side]: false }));
  };

  const approaches = [c.a, c.b];
  const tables = toolDataset(dataset).metadata.tables.map((t) => t.name);
  const shown = (side: Side) => {
    const hit = stored[side];
    return hit?.key === `${c.id}|${drafts[side].value}` ? hit : undefined;
  };
  const plans = APPROACH.map((side) => {
    const hit = shown(side);
    return hit?.observed ? readPlan(hit.observed) : null;
  });
  const left = shown("A")?.observed;
  const right = shown("B")?.observed;
  const count = (o: Observed) => o.total ?? o.result.values.length;
  const equivalent = left && right
    ? count(left) === count(right)
      && JSON.stringify(left.result.columns) === JSON.stringify(right.result.columns)
      && JSON.stringify(left.result.values) === JSON.stringify(right.result.values)
    : undefined;

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

            <section className="pl-where" aria-labelledby="qp-plans">
              <div className="pl-where-bar">
                <p id="qp-plans" className="rx-label sec">what the plans show</p>
                {plans.some(Boolean) && (plansOpen ? (
                  <button type="button" className="rx-btn line" aria-expanded="true" aria-controls="qp-plan-panel" onClick={() => setPlansOpen(false)}><X size={13} aria-hidden="true" /> Hide plans</button>
                ) : (
                  <button type="button" className="rx-btn line" aria-expanded="false" onClick={() => { setPlansOpen(true); setPlansNote(null); }}>Show the plans</button>
                ))}
              </div>
              <div aria-live="polite" aria-busy={busy !== null}>
                {busy && !plans.some(Boolean) && <p className="rx-prompt-line">running {busy} on the full dataset…</p>}
                {plansOpen && (plans.some(Boolean) || busy) && (
                  <div id="qp-plan-panel" className="pl-where-open">
                    <div className="rx-table-wrap" style={{ padding: 0 }}>
                      <table className="rx-table rx-compare">
                        <thead><tr><th></th>{approaches.map((k, i) => <th key={k.label}>{APPROACH[i]} · {k.label}</th>)}</tr></thead>
                        <tbody>
                          <tr><td>access</td>{plans.map((p, i) => <td key={i} className={p && (p.access === "SEARCH" || p.multi) ? "ok" : p?.access === "SCAN" ? "bad" : ""}>{p ? (p.multi ? "SEARCH ×2" : p.access) : busy === APPROACH[i] ? "running…" : "not run"}</td>)}</tr>
                          <tr><td>index</td>{plans.map((p, i) => <td key={i}>{p ? (p.multi ? "two indexes (MULTI-INDEX OR)" : p.index ?? "none") : "—"}</td>)}</tr>
                          <tr><td>covering index</td>{plans.map((p, i) => <td key={i} className={p?.covering ? "ok" : ""}>{p ? (p.covering ? "yes · table not read" : "no") : "—"}</td>)}</tr>
                          <tr><td>temp sort</td>{plans.map((p, i) => <td key={i} className={p?.tempTree ? "bad" : ""}>{p ? (p.tempTree ? `yes · ${p.tempTree}` : "no") : "—"}</td>)}</tr>
                          <tr><td>rows returned</td>{plans.map((p, i) => <td key={i}>{p ? p.rows.toLocaleString("en-US") : "—"}</td>)}</tr>
                          <tr><td>same output</td><td colSpan={2}>{equivalent === undefined ? "not checked" : equivalent ? "yes · only the plan differs" : "no · the queries answer different questions"}</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="pl-split">
                      {APPROACH.map((side, i) => (
                        <div key={side}>
                          <p className="pl-split-head"><b>{side}</b> {approaches[i].label}</p>
                          {plans[i] ? (
                            <ol className="rx-plan mono">{plans[i].steps.map((s, j) => <li key={j} className={stepTone(s)}>{s}</li>)}</ol>
                          ) : (
                            <p className="rx-small">{busy === side ? "Running…" : "Not run yet."}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!plansOpen && !plans.some(Boolean) && !busy && <p className="rx-small">Run A and B, then the plans open here.</p>}
                {!plansOpen && plansNote && <p className="rx-small" role="status">{plansNote}</p>}
              </div>
            </section>
            <p className="rx-note" style={{ fontSize: 15 }}><strong>What to notice:</strong> {c.takeaway}</p>

            <p className="rx-label sec">tables involved</p>
            <TablesInvolved id={dataset} sql={`${c.a.query} ${c.b.query}`} />
            <p className="rx-small">Both approaches run on a fresh copy of the full {datasetName(dataset)} dataset. Browser timings are noisy, so the plan is the evidence, not the milliseconds.</p>

            <p className="rx-label sec">how to read a query plan</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>SCAN reads every row, or every entry of an index. SEARCH jumps to just the matching entries of an index; the terms in brackets show which columns the jump used. COVERING INDEX means the index alone answers the query and the table is not read. USE TEMP B-TREE is an extra step where SQLite sorts or groups rows itself. An index does not make every query faster: it helps when it lets SQLite skip work, and it costs space and slower writes.</p>
          </article>
          <section className="rx-work rx-lesson-work rx-stack-work" aria-label="Approaches A and B">
            {/* A and B get the same height, so the two plans and their rows line up for comparison. */}
            <div className="rx-equal-rows" style={{ marginTop: 0 }}>
              {approaches.map((k, i) => {
                const label = APPROACH[i];
                const draft = drafts[label];
                const hit = shown(label);
                const o = hit?.observed;
                const running = busy === label;
                const saved = stored[label];
                const stale = !!saved && saved.key.startsWith(`${c.id}|`) && saved.key !== `${c.id}|${draft.value}`;
                return (
                  <div key={`${c.id}-${label}`} className="rx-approach" aria-label={`Approach ${label}`}>
                    <section className="rx-cell">
                      <div className="rx-cell-head">
                        <span className="name">{label} · {k.label}</span>
                        <span className="acts" aria-hidden="true">
                          <MacOnly><Keys keys={["mod", "enter"]} /> <span>run</span></MacOnly>
                        </span>
                      </div>
                      {k.setup && <div className="rx-cell-in" style={{ paddingBottom: 0 }}><span className="p">setup›</span><SqlCode source={`${formatSql(k.setup)};`} label="Setup SQL" /></div>}
                      <Editor
                        value={draft.value}
                        onChange={draft.set}
                        onRun={() => void runSide(label, draft.value)}
                        label={`${label} · ${k.label}`}
                        minHeight="120px"
                        tables={tables}
                      />
                      <div className="rx-cell-foot">
                        <span className="hint">{stale ? "edited since the last run" : "\u00a0"}</span>
                        {draft.edited && (
                          <button type="button" className="rx-btn ghost" onClick={draft.reset}><RotateCcw size={13} /> Reset</button>
                        )}
                        <button type="button" className="rx-btn" disabled={busy !== null} onClick={() => void runSide(label, draft.value)}>
                          <Play size={13} /> {running ? "Running…" : "Run"}
                        </button>
                      </div>
                    </section>
                    <div className="rx-results">
                      <div className="rx-results-tabs" role="tablist" aria-label="Output">
                        <span role="tab" aria-selected="true">Output</span>
                        {hit && !running && (
                          <span className="acts">
                            <button type="button" className="rx-btn ghost" onClick={() => setHidden((prev) => ({ ...prev, [label]: !prev[label] }))}>{hidden[label] ? "Show" : "Hide"}</button>
                            <button type="button" className="rx-btn ghost" onClick={() => closeSide(label)} aria-label={`Close ${label} output`}><X size={13} /> Close</button>
                          </span>
                        )}
                      </div>
                      {(running || hit) && (
                        <div className="rx-results-pane" role="tabpanel">
                          {hit && hidden[label] && !running ? (
                            <p className="rx-results-empty">Output hidden.</p>
                          ) : o ? (
                            <>
                              <div className="rx-out">
                                <div className="rx-out-meta"><span>explain query plan</span></div>
                                <ol className="rx-plan mono">
                                  {readPlan(o).steps.map((s, j) => <li key={j} className={stepTone(s)}>{s}</li>)}
                                </ol>
                              </div>
                              <Output res={{ result: { ...o.result, values: o.result.values.slice(0, 5) }, total: o.total ?? o.result.values.length }} query={draft.value} echo={false} />
                            </>
                          ) : hit?.error ? (
                            <Output res={{ error: hit.error }} query={draft.value} echo={false} />
                          ) : (
                            <p className="rx-results-empty">Running…</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
