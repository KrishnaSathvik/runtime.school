"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Gauge, Play, Square } from "lucide-react";
import { EXPERIMENTS, PERF_CATEGORIES, experimentById, paramLines, type PyExperiment } from "@/content/python-v2/tools/performance";
import { mountsFor } from "@/content/python-v2/datasets";
import { PY_COMPARE_HREF, PY_PERF_HREF } from "@/content/python-v2/paths";
import { SIZES, toolDataset } from "@/content/python-v2/tools/friendly";
import { preloadMounts, preloadPython, runPython, stopPython, type PyRunResult } from "@/engine/python/client";
import { BENCH_TIMEOUT_MS, benchProgram, formatBytes, formatSeconds, ownLines, profileProgram, readBench, stats, type BenchReport, type ProfileReport } from "@/engine/python/bench";
import { Select } from "@/features/rt/Select";
import { Shell } from "@/features/rt/Shell";
import { Code } from "./Code";
import { PyOut, PyCell, pyStatus } from "./ToolParts";
import { Inline, useDraft } from "./ToolKit";

const SIDES = ["a", "b"] as const;
const REPEATS = 7;
type Chosen = Record<string, number>;
type HistoryRow = { inputs: string; a: number; b: number; peakA: number | null; peakB: number | null };

function readChosen(e: PyExperiment, params: URLSearchParams): Chosen {
  const out: Chosen = {};
  for (const p of e.params) {
    const v = Number(params.get(p.name));
    out[p.name] = params.has(p.name) && Number.isInteger(v) && v >= 0 && v < p.options.length ? v : p.start;
  }
  if (e.dataset) {
    const v = Number(params.get("data"));
    out.data = params.has("data") && Number.isInteger(v) && v >= 0 && v < e.dataset.sizes.length ? v : e.dataset.start;
  }
  return out;
}

function describeInputs(e: PyExperiment, chosen: Chosen): string {
  const parts = e.params.map((p) => p.options[chosen[p.name]].label);
  if (e.dataset) {
    const d = toolDataset(e.dataset.id)!;
    const s = e.dataset.sizes[chosen.data];
    const f = mainFile(e, s);
    parts.unshift(`${d.name} ${SIZES[s]}${f ? ` (${f.rows.toLocaleString("en-US")} rows)` : ""}`);
  }
  return parts.join(" · ");
}

/** The file an experiment is about: the first it lists (order lines for a join, not the customers table). */
function mainFile(e: PyExperiment, size: string) {
  const files = toolDataset(e.dataset!.id)!.manifest.editions[size].files!;
  return e.dataset!.files.map((path) => files.find((x) => x.path === path)).find(Boolean);
}

/**
 * T04 Performance Lab, laid out like SQL Query Performance: choose a topic, an experiment and its inputs on the left,
 * read how it works, run the comparison and read the measured results there; the two implementations sit on the
 * right, each editable and runnable on its own.
 */
export function PerformanceLab() {
  const params = useSearchParams();
  const router = useRouter();
  const e = experimentById(params.get("experiment")) ?? EXPERIMENTS[0];
  const chosen = useMemo(() => readChosen(e, new URLSearchParams(params.toString())), [e, params]);
  const setup = `${paramLines(e, chosen)}\n${e.setup}`;
  const mounts = useMemo(() => (e.dataset ? mountsFor(toolDataset(e.dataset.id)!.manifest.editions[e.dataset.sizes[chosen.data]].ref, e.dataset.files) : []), [e, chosen]);
  const a = useDraft(`py-perf-${e.id}-a`, e.a.code);
  const b = useDraft(`py-perf-${e.id}-b`, e.b.code);
  const drafts = { a, b };
  const inputLabel = describeInputs(e, chosen);
  const key = `${e.id}|${JSON.stringify(chosen)}|${a.value}|${b.value}`;

  const [run, setRun] = useState<{ key: string; result?: PyRunResult; report?: BenchReport | null } | null>(null);
  const [profile, setProfile] = useState<{ key: string; report?: ProfileReport | null; error?: string } | null>(null);
  // Each side keeps its own "Try it" answer, tied to its own code and the inputs, so running B leaves A's in place.
  const [single, setSingle] = useState<Partial<Record<"a" | "b", { key: string; result: PyRunResult | null }>>>({});
  const sideKey = (side: "a" | "b") => `${e.id}|${JSON.stringify(chosen)}|${drafts[side].value}`;
  const [busy, setBusy] = useState<null | "bench" | "profile" | "a" | "b">(null);
  const [history, setHistory] = useState<Record<string, HistoryRow[]>>({});

  const go = (id: string, next?: Chosen) => {
    const q = new URLSearchParams({ experiment: id });
    for (const [k, v] of Object.entries(next ?? {})) q.set(k, String(v));
    router.replace(`${PY_PERF_HREF}?${q}`, { scroll: false });
  };
  const setInput = (name: string, v: number) => go(e.id, { ...chosen, [name]: v });

  useEffect(() => {
    preloadPython(e.packages);
    preloadMounts(mounts);
  }, [e, mounts]);

  // A long comparison says so, and that Stop ends it, instead of sitting silent.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (busy !== "bench") { setSlow(false); return; }
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [busy]);

  const r = run?.key === key ? run : null;
  const prof = profile?.key === key ? profile : null;

  async function compare() {
    if (busy) return;
    setBusy("bench");
    setRun({ key });
    const res = await runPython(benchProgram(setup, a.value, b.value, REPEATS), { packages: e.packages, mounts, timeoutMs: BENCH_TIMEOUT_MS, outputLimit: 100000 });
    if (res.status === "superseded") return;
    const report = res.status === "ok" ? readBench<BenchReport>(res.stdout).report : null;
    setRun({ key, result: res, report });
    setBusy(null);
    // A run whose answers differed is timed but not compared, so it isn't a speed result to keep.
    if (report?.a.times?.length && report.b.times?.length && report.same !== false) {
      const row: HistoryRow = { inputs: inputLabel + (a.edited || b.edited ? " · edited code" : ""), a: stats(report.a.times).median, b: stats(report.b.times).median, peakA: report.a.peak ?? null, peakB: report.b.peak ?? null };
      setHistory((h) => ({ ...h, [e.id]: [row, ...(h[e.id] ?? [])].slice(0, 8) }));
    }
  }

  async function runOne(side: "a" | "b") {
    if (busy) return;
    setBusy(side);
    const k = sideKey(side);
    setSingle((prev) => ({ ...prev, [side]: { key: k, result: null } }));
    const code = `${setup}\n# ---- ${side.toUpperCase()} ----\n${drafts[side].value}\nprint("result:", repr(result)[:400])\n`;
    const res = await runPython(code, { packages: e.packages, mounts, timeoutMs: 30000 });
    if (res.status === "superseded") return;
    setSingle((prev) => ({ ...prev, [side]: { key: k, result: ownLines(res, setup, drafts[side].value, side) } }));
    setBusy(null);
  }

  async function runProfile() {
    if (busy) return;
    setBusy("profile");
    setProfile({ key });
    const res = await runPython(profileProgram(setup, a.value, b.value), { packages: e.packages, mounts, timeoutMs: BENCH_TIMEOUT_MS, outputLimit: 100000 });
    if (res.status === "superseded") return;
    setProfile({ key, report: res.status === "ok" ? readBench<ProfileReport>(res.stdout).report : null, error: res.status !== "ok" ? "The profile run didn't finish." : undefined });
    setBusy(null);
  }


  const rep = r?.report;
  const timed = rep?.a.times?.length && rep.b.times?.length ? { a: stats(rep.a.times), b: stats(rep.b.times) } : null;
  const ratio = timed ? timed.a.median / timed.b.median : 1;
  const faster = ratio >= 1 ? "b" : "a";
  const factor = ratio >= 1 ? ratio : 1 / ratio;
  const noise = timed ? Math.max(timed.a.spread, timed.b.spread) : 0;
  const close = timed ? factor < 1 + noise * 2 + 0.08 : true;
  const hist = history[e.id] ?? [];
  const sameCat = EXPERIMENTS.filter((x) => x.category === e.category);

  return (
    <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "performance lab" }, { label: e.title }]} status={pyStatus("performance lab", e.dataset?.id)}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="perf-title">
            <p className="rx-prompt-line"><b>performance lab</b> two ways to do one job · timed</p>
            <h1 className="rx-task-title">Performance Lab</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Run two ways of doing the same job on the same input. The lab checks they give the same result, then times both and measures their memory.</p>
            <Select id="perf-topic" label="topic" value={e.category} onChange={(c) => go(EXPERIMENTS.find((x) => x.category === c)!.id)} options={PERF_CATEGORIES.map((c) => ({ value: c, label: `${c} (${EXPERIMENTS.filter((x) => x.category === c).length})` }))} />
            <Select id="perf-exp" label="experiment" value={e.id} onChange={(id) => go(id)} options={sameCat.map((x) => ({ value: x.id, label: x.title }))} />

            <h2 id="perf-title" className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>{e.title}</h2>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{e.question}</p>
            <p className="rx-small"><Inline text={e.task} /></p>

            <p className="rx-label">how it works</p>
            <p className="rx-prose" style={{ marginTop: 0 }}><Inline text={e.explain} /></p>

            {(e.dataset || e.params.length > 0) && (
              <div className="pl-inputs">
                {e.dataset && (
                  <Select id="perf-data" label={`data · ${toolDataset(e.dataset.id)!.name}`} value={String(chosen.data)} onChange={(v) => setInput("data", Number(v))}
                    options={e.dataset.sizes.map((s, i) => { const f = mainFile(e, s); return { value: String(i), label: `${SIZES[s]}${f ? ` · ${f.rows.toLocaleString("en-US")} rows` : ""}` }; })} />
                )}
                {e.params.map((p) => (
                  <Select key={p.name} id={`perf-${p.name}`} label={p.label.toLowerCase()} value={String(chosen[p.name])} onChange={(v) => setInput(p.name, Number(v))} options={p.options.map((o, i) => ({ value: String(i), label: o.label }))} />
                ))}
              </div>
            )}
            <div aria-live="polite" aria-busy={busy === "bench"}>
              <p className="py-row">
                {busy === "bench" ? (
                  <button type="button" className="rx-btn" onClick={stopPython}><Square size={12} /> Stop</button>
                ) : (
                  <button type="button" className="rx-btn primary" onClick={compare} disabled={!!busy}><Play size={13} /> {timed ? "Run again" : "Run comparison"}</button>
                )}
              </p>
              {busy === "bench" && <p className="rx-prompt-line">checking both give the same answer, then timing each one…</p>}
              {busy === "bench" && slow && <p className="rx-small" role="status">This input is big, so the comparison can take up to a minute. Stop ends it at any time.</p>}
              {r?.result && r.result.status !== "ok" && <PyOut result={r.result} live={[]} busy={false} />}
              {rep && SIDES.filter((s) => rep[s].error).map((s) => {
                const err = rep[s].error!;
                return (
                  <p key={s} className="rx-note" role="alert">
                    <strong>{s.toUpperCase()} stopped with an error</strong>, so nothing was timed: {err.type}{err.message ? `: ${err.message}` : ""}{err.line ? ` (line ${err.line} of ${s.toUpperCase()})` : ""}. Fix the code in {s.toUpperCase()}, then run the comparison again.
                  </p>
                );
              })}
              {rep && rep.same === false && <p className="rx-note"><strong>A and B give different results</strong> ({rep.diff}), so their times aren&apos;t compared. Make them compute the same thing.</p>}
              {timed && rep && rep.same !== false && (
                <section className="pl-result" aria-label="Result">
                  <p className="pl-verdict">
                    {close ? <>No clear winner</> : <><b>{faster.toUpperCase()} · {e[faster].label}</b> is {factor >= 1.95 ? `${factor.toFixed(factor < 10 ? 1 : 0)}× faster` : `${Math.round((1 - 1 / factor) * 100)}% faster`}</>}
                  </p>
                  <p className="rx-small" style={{ marginTop: 2 }}>{close ? "The gap is smaller than how much the times jump around between runs." : `On ${inputLabel}. Change the input and run again to see how the gap moves.`}</p>
                  <div className="pl-bars">
                    {SIDES.map((s) => (
                      <div key={s} className={`pl-bar${!close && faster === s ? " win" : ""}`}>
                        <span className="pl-bar-name"><b>{s.toUpperCase()}</b> {e[s].label}</span>
                        <span className="pl-bar-track"><span style={{ width: `${Math.max(2, (timed[s].median / Math.max(timed.a.median, timed.b.median)) * 100)}%` }} /></span>
                        <span className="pl-bar-time mono">{formatSeconds(timed[s].median)}</span>
                        <span className="pl-bar-meta">runs {formatSeconds(timed[s].min)} – {formatSeconds(timed[s].max)} · memory {formatBytes(rep[s].peak ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="pl-same">✓ Both give the same answer: {rep.a.summary}</p>
                  {rep.budgetCut && <p className="rx-small" style={{ marginBottom: 0 }}>Each run was slow, so each version ran {rep.repeats} times instead of {REPEATS}.</p>}
                </section>
              )}
            </div>

            {timed && rep && rep.same !== false && (
              <>
                <p className="rx-label sec">where the time goes</p>
                {prof ? <ProfileView p={prof.report ?? null} error={prof.error} busy={busy === "profile"} labels={{ a: e.a.label, b: e.b.label }} /> : (
                  <>
                    <p className="rx-small" style={{ marginTop: 0 }}>See which steps each version spends its time in, and how often they run.</p>
                    <p className="py-row"><button type="button" className="rx-btn" onClick={runProfile} disabled={!!busy}><Gauge size={13} /> Break down the time</button></p>
                  </>
                )}
              </>
            )}

            <p className="rx-note" style={{ fontSize: 15 }}><strong>What to notice:</strong> <Inline text={e.takeaway} /></p>
            <p className="rx-small"><Inline text={e.caveat} />{e.compare && <> · <a href={`${PY_COMPARE_HREF}?c=${e.compare}`}>See it in Compare Approaches</a></>}</p>

            {hist.length > 0 && (
              <>
                <p className="rx-label sec">your runs</p>
                <div className="rx-table-wrap" style={{ padding: 0 }}>
                  <table className="rx-table rx-compare">
                    <thead><tr><th>input</th><th>A</th><th>B</th><th>faster</th><th>memory A / B</th></tr></thead>
                    <tbody>{hist.map((h, i) => <tr key={i}><td>{h.inputs}</td><td>{formatSeconds(h.a)}</td><td>{formatSeconds(h.b)}</td><td>{h.a === h.b ? "same" : h.a < h.b ? `A, ${(h.b / h.a).toFixed(1)}×` : `B, ${(h.a / h.b).toFixed(1)}×`}</td><td>{h.peakA != null && h.peakB != null ? `${formatBytes(h.peakA)} / ${formatBytes(h.peakB)}` : "—"}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}

            <p className="rx-label sec">how it&apos;s measured</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              The input is built once and isn&apos;t timed. Each version runs {REPEATS} times, taking turns, after a warm-up run. The time shown is the middle of those runs. Times come from your browser, so they vary between computers: run again before trusting a small difference.
            </p>
            <Code code={setup.replace(/^\n+/, "")} label="The input" className="p2-readonly" />
          </article>

          <section className="rx-work rx-lesson-work py-stack" aria-label="Implementations A and B">
            {SIDES.map((s) => {
              const err = rep?.[s].error;
              const own = single[s]?.key === sideKey(s) ? single[s] : null;
              return (
                <PyCell
                  key={`${e.id}-${s}`}
                  name={`${s.toUpperCase()} · ${e[s].label}`}
                  value={drafts[s].value}
                  onChange={drafts[s].set}
                  onRun={() => runOne(s)}
                  busy={busy === s}
                  result={own?.result ?? null}
                  minHeight="140px"
                  runLabel="Try it"
                  errorLine={ownErrorLine(own?.result ?? null) ?? (err?.line ? { line: err.line, token: 1 } : null)}
                  onCloseOutput={() => setSingle((prev) => ({ ...prev, [s]: undefined }))}
                  footer={drafts[s].edited ? <button type="button" className="rx-btn ghost" onClick={drafts[s].reset}>Reset</button> : undefined}
                />
              );
            })}
            <p className="rx-small">Try it runs one version and shows its answer. Run comparison times both. Each version keeps its answer in <code>result</code>, so the lab can check they agree.</p>
          </section>
        </div>
      </div>
    </Shell>
  );
}

function ownErrorLine(r: PyRunResult | null): { line: number; token: number } | null {
  if (!r || (r.status !== "runtime-error" && r.status !== "syntax-error") || !r.error.line) return null;
  return { line: r.error.line, token: 2 };
}

/** cProfile's names in plain words: "<method 'append' of 'list' objects>" is list.append(). */
function stepName(func: string, labels: { a: string; b: string }): string {
  const at = func.match(/^(.*) \((a|b|setup)\.py:(\d+)\)$/);
  const name = at ? at[1] : func;
  const own = at && at[2] !== "setup" ? labels[at[2] as "a" | "b"] : null;
  if (name === "<module>") return own ? `the ${own} itself` : "building the input";
  if (name === "<listcomp>") return "the list comprehension";
  if (name === "<dictcomp>") return "the dict comprehension";
  if (name === "<setcomp>") return "the set comprehension";
  if (name === "<genexpr>") return "the generator expression";
  if (name === "<lambda>") return "a lambda";
  const method = name.match(/^<method '(.+)' of '(.+)' objects>$/);
  if (method) return `${method[2]}.${method[1]}()`;
  const builtin = name.match(/^<built-in method (?:builtins\.)?(.+)>$/);
  if (builtin) return `${builtin[1]}()`;
  const fn = name.match(/^<function (.+?) at /);
  if (fn) return `${fn[1]}()`;
  return at ? `${name}() · line ${at[3]}` : name;
}

function ProfileView({ p, error, busy, labels }: { p: ProfileReport | null; error?: string; busy: boolean; labels: { a: string; b: string } }) {
  if (busy) return <p className="rx-prompt-line">running each version once and counting its function calls…</p>;
  if (error || !p) return <p className="rx-note">{error ?? "The breakdown couldn't be read."}</p>;
  const side = (s: "a" | "b") => {
    const rows = p[s];
    if ("error" in rows) return <p className="rx-note">{rows.error}</p>;
    const total = rows.reduce((n, r) => n + r.total, 0) || 1;
    return (
      <ul className="pl-steps">
        {rows.slice(0, 5).map((r, i) => (
          <li key={i}>
            <span className="pl-step-name">{stepName(r.func, labels)}</span>
            <span className="pl-step-share mono">{Math.round((r.total / total) * 100)}%</span>
            <span className="pl-bar-track"><span style={{ width: `${Math.max(2, (r.total / total) * 100)}%` }} /></span>
            <span className="pl-step-calls">{r.calls === 1 ? "runs once" : `called ${r.calls.toLocaleString("en-US")} times`}</span>
          </li>
        ))}
      </ul>
    );
  };
  return (
    <>
      <div className="pl-split">
        {SIDES.map((s) => (
          <div key={s}>
            <p className="pl-split-head"><b>{s.toUpperCase()}</b> {labels[s]}</p>
            {side(s)}
          </div>
        ))}
      </div>
      <p className="rx-small">Shares of each version&apos;s own time. Counting calls slows them down, so compare the shares and call counts, not exact times.</p>
    </>
  );
}
