"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Play, RotateCcw, Square, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/features/rt/Shell";
import { Select } from "@/features/rt/Select";
import { Code } from "@/features/python/Code";
import { ConfirmDialog } from "@/features/python/Dialogs";
import { datasetEditions, EDITION_LABEL, psDatasets, psPlaygroundHref, type PsEdition } from "@/content/pyspark/content";
import { DOMAIN_EXAMPLES, domainProgram } from "@/content/pyspark/tool-examples";
import catalog from "@/content/pyspark/tool-catalog.json";
import { usePs, usePsReady } from "@/lib/pyspark-progress";
import { sparkJob, type PsJobState, type PsToolRequest, type PsToolResult, type PsPlan, type PsPlanNode, type PsToolFrame } from "@/engine/pyspark/client";
import { DataTable, SparkError, JobLine, useSparkConnection } from "./parts";
import { ToolData, ToolRelated } from "./ToolContext";
import { ToolEditor } from "./ToolEditor";

type Tool = "sql" | "plan" | "compare" | "pipeline";
type Experiment = { id: string; title: string; dataset: string; about: string; sql?: string; python?: string; a?: string; b?: string; code?: string; stages?: string[] };
const TITLES = { sql: "Spark SQL Lab", plan: "Query Plans & Performance", compare: "Compare Approaches", pipeline: "Pipeline & Streaming Lab" };
const PROMPTS: Record<Tool, [string, string]> = { sql: ["spark sql lab", "query the data in SQL or DataFrame code"], plan: ["query plans", "see what Spark really runs"], compare: ["compare approaches", "one result · two ways"], pipeline: ["pipelines", "batch stages and streaming replays"] };
const INTROS: Record<Tool, string> = {
  sql: "Write Spark SQL or DataFrame code against real tables and see what Apache Spark returns.",
  plan: "Run a query and read the plans Spark builds for it, or measure two approaches side by side.",
  compare: "Solve the same problem two ways and let Spark check whether the results match.",
  pipeline: "Run a pipeline one stage at a time, or replay a stream event by event, on real Spark.",
};
const RULES: Record<Tool, (benchmark: boolean) => string> = {
  sql: () => "The DataFrame version of an example is written separately, so SQL edits aren't translated into it. Each run starts with a clean workspace: temporary views and tables last only for that run. Up to 12 statements and five result tables. File writes stay under /tmp/work/.",
  plan: (benchmark) => benchmark ? "Fixed benchmark data, local Spark on two cores. Five alternating repetitions after a warm-up. Other jobs wait while it measures." : "Spark plans are captured during the run. A preview can plan differently from a full write. Per-operator timings aren't collected.",
  compare: () => "Results must match exactly: values, column names, order and types, and duplicate counts. Nullability is shown separately. No numeric tolerance. Up to 10,000 rows and 2 MB per side; each side must produce one DataFrame.",
  pipeline: () => "Each run starts a fresh Spark container, so nothing is left over from a previous run.",
};
const ROUTES = { sql: "spark-sql", plan: "query-plans", compare: "compare", pipeline: "pipeline-streaming" };
const domainEntries: Experiment[] = Object.entries(DOMAIN_EXAMPLES).map(([dataset, e]) => {
  const sql = `SELECT ${e.group}, COUNT(*) AS count FROM ${e.table} GROUP BY ${e.group} ORDER BY ${e.group};`;
  const python = `result = ${e.table}.groupBy("${e.group}").count().orderBy("${e.group}")`;
  return { id: `explore-${dataset}`, title: e.title, dataset, about: e.about, sql, python, a: python, b: `result = spark.sql(${JSON.stringify(sql)})` };
});
const list = (tool: Tool, area: string): Experiment[] => tool === "sql" ? [...catalog.sql, ...domainEntries] : tool === "compare" ? [...catalog.compare, ...domainEntries] : tool === "plan" ? area === "benchmark" ? catalog.benchmark : [...catalog.sql, ...domainEntries] : area === "stream" ? catalog.stream : catalog.pipeline;

export function ToolsScreen({ tool }: { tool: Tool }) {
  const params = useSearchParams();
  const from = params.get("from");
  const ready = usePsReady();
  const [area, setArea] = useState(tool === "pipeline" ? params.get("area") === "stream" ? "stream" : "batch" : params.get("area") === "benchmark" ? "benchmark" : "plans");
  const experiments = list(tool, area);
  const requestedDataset = params.get("dataset")?.toUpperCase().replace(/^(?!PS-)/, "PS-");
  const [experiment, setExperiment] = useState(params.get("experiment") ?? experiments.find((x) => x.dataset === requestedDataset)?.id ?? experiments[0].id);
  const e = experiments.find((x) => x.id === experiment) ?? experiments[0];
  const [dataset, setDataset] = useState(params.get("dataset")?.toUpperCase().replace(/^(?!PS-)/, "PS-") ?? e.dataset);
  const d = psDatasets.find((x) => x.id === (tool === "pipeline" || (tool === "plan" && area === "benchmark") ? e.dataset : dataset) && x.built) ?? psDatasets.find((x) => x.id === e.dataset)!;
  const [edition, setEdition] = useState<PsEdition>((params.get("edition") as PsEdition) ?? "practice");
  const actualEdition = datasetEditions(d).includes(edition) ? edition : "lesson";
  const [language, setLanguage] = useState<"sql" | "python">(params.get("language") === "python" ? "python" : params.get("language") === "sql" ? "sql" : tool === "sql" ? "sql" : "python");
  const [languageB, setLanguageB] = useState<"sql" | "python">(params.get("language_b") === "sql" ? "sql" : "python");
  const [side, setSide] = useState(params.get("side") === "b" ? "b" : "a");
  const [step, setStep] = useState(() => Math.max(0, Math.min(Number(params.get("step")) || 0, (e.stages?.length ?? 1)-1)));
  const [size, setSize] = useState(params.get("size") === "1000000" ? 1000000 : 100000);
  const [ordered, setOrdered] = useState(params.get("ordered") === "1");
  const [reset, setReset] = useState(false);
  const key = `tool:${tool}:${area}:${e.id}:${d.id}:${language}`;
  const saved = usePs((s) => s.playground[key]);
  const savedB = usePs((s) => s.playground[`${key}:b:${languageB}`]);
  const starter = tool === "sql" || tool === "plan" ? language === "sql" ? d.id === e.dataset ? e.sql ?? "SELECT 1" : `SELECT * FROM ${Object.keys(d.built!.tables)[0]} LIMIT 10;` : d.id === e.dataset ? e.python ?? domainProgram(d.id).replace(/display\(result[^\n]*\n/, "") : domainProgram(d.id).replace(/display\(result[^\n]*\n/, "") : tool === "compare" ? e.a! : e.code ?? "";
  const code = saved ?? starter;
  const codeB = savedB ?? (languageB === "sql" ? "SELECT status, COUNT(*) AS count FROM orders GROUP BY status" : e.b ?? "result = orders");
  const inputs = JSON.stringify([tool, area, e.id, d.id, d.built!.version, actualEdition, language, languageB, code, codeB, step, size, ordered]);
  const revision = useRef({ inputs: "", number: 0 });
  if (revision.current.inputs !== inputs) revision.current = { inputs, number: revision.current.number + 1 };
  const identity = `${tool}:${revision.current.number}`;
  const latest = useRef(identity); latest.current = identity;
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState<{ state: PsJobState; since: number; detail?: string } | null>(null);
  const [answer, setAnswer] = useState<PsToolResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [connection] = useSparkConnection();
  useEffect(() => () => controller.current?.abort(), []);
  const run = useCallback(async () => {
    if (controller.current || connection !== "connected") return;
    const ctl = new AbortController(); controller.current = ctl;
    const submitted = identity;
    setProblem(null); setBusy({ state: "queued", since: Date.now() });
    const action = tool === "pipeline" ? area === "stream" ? "stream" : "pipeline" : tool === "plan" && area === "benchmark" ? "benchmark" : tool;
    const req: PsToolRequest = { mode: "tool", action, dataset: d.id, version: d.built!.version, edition: actualEdition, code, code_b: codeB, language, language_b: languageB, identity: submitted, scenario: e.id, step, size, ordered };
    const result = await sparkJob<PsToolResult>(req, { signal: ctl.signal, onState: (state, detail) => setBusy((b) => b && ({ ...b, state, detail: detail?.case })) });
    controller.current = null; setBusy(null);
    if (submitted !== latest.current) return;
    if (result.state === "done") setAnswer(result.result);
    else setProblem(result.state === "cancelled" ? "Stopped. This operation and its Spark container were cancelled." : result.message);
  }, [connection, identity, tool, area, d, actualEdition, code, codeB, language, languageB, e.id, step, size, ordered]);
  const write = (s: string) => usePs.getState().setPlayground(side === "b" && tool === "compare" ? `${key}:b:${languageB}` : key, s);
  const go = (id: string) => { const next = experiments.find((x) => x.id === id)!; setExperiment(id); setDataset(next.dataset); setStep(0); };
  const returnTo = `/pyspark/tools/${ROUTES[tool]}?experiment=${e.id}&dataset=${d.id}&edition=${actualEdition}&area=${area}&step=${step}&language=${language}&language_b=${languageB}&side=${side}&size=${size}&ordered=${ordered ? 1 : 0}`;
  const phaseB = tool === "plan" && area === "benchmark";
  const chooseDataset = (id: string) => (experiments.some((x) => x.id === `explore-${id}`) ? go(`explore-${id}`) : setDataset(id));
  const chooseArea = (value: string) => { setArea(value); const next = list(tool, value)[0]; setExperiment(next.id); setDataset(next.dataset); setStep(0); };
  const languageOptions = [{ value: "python", label: tool === "sql" ? "As DataFrame code" : "PySpark" }, { value: "sql", label: "Spark SQL" }];
  const runLabel = tool === "compare" ? "Run both" : phaseB ? "Run benchmark" : tool === "pipeline" ? area === "stream" ? "Replay to this step" : "Run stage" : "Run";
  const offline = !ready || connection !== "connected";
  const runButton = busy
    ? <button type="button" className="rx-btn" onClick={() => controller.current?.abort()}><Square size={12} aria-hidden="true" /> Stop</button>
    : <button type="button" className="rx-btn" disabled={offline} onClick={() => void run()}><Play size={13} aria-hidden="true" /> {runLabel}</button>;
  const footer = (extra?: ReactNode) => <>
    <span className="hint">{busy ? <JobLine state={busy.state} since={busy.since} detail={busy.detail} /> : " "}</span>
    <button type="button" className="rx-btn ghost" onClick={() => setReset(true)} disabled={!!busy}><RotateCcw size={13} aria-hidden="true" /> Reset</button>
    {extra}
    {runButton}
  </>;
  const playgroundLink = !phaseB && <Link className="rx-btn ghost" href={`${psPlaygroundHref(d.id, actualEdition)}&code=${encodeURIComponent(tool === "compare" && side === "b" ? codeB : code)}&from=${encodeURIComponent(returnTo)}`}>Open in Playground</Link>;
  const hasResult = !!(answer || problem);
  const failed = !!answer && failedRun(answer);
  return <Shell subject="pyspark" section="tools" path={[{ label: "pyspark", href: "/pyspark" }, { label: "tools" }, { label: TITLES[tool] }]} status={["PySpark", `${TITLES[tool].toLowerCase()} · not graded`, d.title, "runs on Apache Spark"]}>
    <div className="rx-task rx-lesson ps-tool">
      <div className="rx-task-split">
        <article className="rx-brief" aria-labelledby="ps-tool-title">
          <p className="rx-prompt-line"><b>{PROMPTS[tool][0]}</b> {PROMPTS[tool][1]} · not graded</p>
          <h1 id="ps-tool-title" className="rx-task-title">{TITLES[tool]}</h1>
          <p className="rx-prose ps-intro">{INTROS[tool]}</p>
          {from?.startsWith("/pyspark/") && <p className="rx-small"><Link href={from}>← Return to where you were</Link></p>}
          {(tool === "plan" || tool === "pipeline") && <div className="rx-tabs ps-areas" role="tablist" aria-label="Lab area">{(tool === "plan" ? ["plans", "benchmark"] : ["batch", "stream"]).map((a) => <button key={a} type="button" role="tab" disabled={!ready} aria-selected={area === a} onClick={() => chooseArea(a)}>{a === "plans" ? "Plan Inspector" : a === "benchmark" ? "Performance" : a === "batch" ? "Batch / Delta" : "Streaming"}</button>)}</div>}
          <Select id="ps-experiment" label="experiment" disabled={!ready} value={e.id} onChange={go} options={experiments.map((x) => ({ value: x.id, label: x.title }))} />
          <h2 className="rx-task-title ps-exp-title">{e.title}</h2>
          <p className="rx-lead ps-exp-lead">{e.about}</p>
          {tool === "pipeline" || phaseB
            ? <p className="rx-small">Uses the <b>{d.title}</b> dataset.</p>
            : <Select id="ps-dataset" label="dataset" value={d.id} onChange={chooseDataset} options={psDatasets.filter((x) => x.built).map((x) => ({ value: x.id, label: x.title }))} />}
          {!phaseB && datasetEditions(d).length > 1 && <Select id="ps-rows" label="rows" disabled={!!busy} value={actualEdition} onChange={(v) => setEdition(v as PsEdition)} options={datasetEditions(d).map((ed) => ({ value: ed, label: EDITION_LABEL[ed] }))} />}
          {phaseB && <Select id="ps-size" label="benchmark size" value={String(size)} onChange={(v) => setSize(Number(v))} options={[{ value: "100000", label: "100,000 rows" }, { value: "1000000", label: "1,000,000 rows" }]} />}
          {tool === "compare" && <label className="ps-check"><input type="checkbox" checked={ordered} onChange={(ev) => setOrdered(ev.target.checked)} /> Row order is part of the contract</label>}
          {e.stages && <>
            <p className="rx-label sec">{area === "stream" ? "event timeline" : "pipeline stages"}</p>
            <ol className="ps-stage-list" aria-label={area === "stream" ? "Event timeline" : "Pipeline stages"}>{e.stages.map((s, i) => <li key={s}><button type="button" aria-pressed={step === i} onClick={() => setStep(i)}><span className="n mono">{i + 1}</span>{s}</button></li>)}</ol>
            <p className="rx-cap">{area === "stream" ? `Run replays steps 1–${step + 1} in a fresh container, including real checkpoints and sink writes. Later steps take longer. Window and state-store inspection isn't available in these scenarios.` : "Running a stage runs the stages it needs first. Editing the code makes earlier results stale."}</p>
          </>}
          {phaseB ? <p className="rx-cap ps-bench-note">The benchmark generates its own {size.toLocaleString("en-US")}-row data shaped like the {d.title} tables, so the dataset&apos;s tables and row choice don&apos;t apply.</p> : <>
            <p className="rx-label sec">input tables</p>
            <p className="rx-cap">Open a table to see its columns and a few sample rows. A run uses every selected row.</p>
            <ToolData dataset={d} edition={actualEdition} />
          </>}
          <p className="rx-label sec">how this runs</p>
          <p className="rx-cap">{RULES[tool](phaseB)}</p>
          <ToolRelated dataset={d.id} returnTo={returnTo} />
        </article>
        <section className="rx-work rx-lesson-work rx-tool-work p2 ps-tool-work" aria-label="Tool workspace">
          {!ready ? <p className="rx-small" role="status">Loading your draft…</p> : <>
            {!phaseB && tool !== "compare" && <>
              {tool !== "pipeline" && <Select id="ps-language" label={tool === "sql" ? "write it as" : "language"} value={language} onChange={(v) => setLanguage(v as "sql" | "python")} options={languageOptions} />}
              <ToolEditor language={language} code={code} onChange={write} onRun={() => void run()} label={TITLES[tool]} footer={footer(playgroundLink)} />
            </>}
            {tool === "compare" && <>
              {(["a", "b"] as const).map((s) => <section key={s} className="ps-approach-editor" aria-label={`Approach ${s.toUpperCase()}`}>
                <Select id={`ps-language-${s}`} label={`approach ${s} · language`} value={s === "a" ? language : languageB} onChange={(v) => (s === "a" ? setLanguage : setLanguageB)(v as "sql" | "python")} options={[{ value: "python", label: "PySpark" }, { value: "sql", label: "Spark SQL" }]} />
                <ToolEditor name={`${s.toUpperCase()} · ${(s === "a" ? language : languageB) === "sql" ? "approach.sql" : "approach.py"}`} language={s === "a" ? language : languageB} code={s === "a" ? code : codeB} onChange={(text) => usePs.getState().setPlayground(s === "a" ? key : `${key}:b:${languageB}`, text)} onRun={() => void run()} label={`Approach ${s.toUpperCase()}`} footer={<>
                  <span className="hint"> </span>
                  <button type="button" className="rx-btn ghost" disabled={!!busy} onClick={() => { setSide(s); setReset(true); }}><RotateCcw size={13} aria-hidden="true" /> Reset</button>
                  <Link className="rx-btn ghost" href={`${psPlaygroundHref(d.id, actualEdition)}&code=${encodeURIComponent(s === "b" ? codeB : code)}&from=${encodeURIComponent(returnTo)}`}>Open in Playground</Link>
                </>} />
              </section>)}
              <div className="rx-cell ps-run-bar"><div className="rx-cell-foot"><span className="hint">{busy ? <JobLine state={busy.state} since={busy.since} detail={busy.detail} /> : "Runs A and B on the same data, then compares them."}</span>{runButton}</div></div>
            </>}
            {phaseB && <>
              <p className="rx-cap">The measured implementations on the generated benchmark data. Generating the input and verifying the results happen outside the timed part.</p>
              <div className="rx-cell ps-cell"><div className="rx-cell-head"><span className="name">A · {e.id === "broadcast" ? "Broadcast join" : "Built-in expression"}</span></div><Code code={e.a ?? ""} label="Benchmark approach A" /></div>
              <div className="rx-cell ps-cell"><div className="rx-cell-head"><span className="name">B · {e.id === "broadcast" ? "Shuffle join" : "Python UDF"}</span></div><Code code={e.b ?? ""} label="Benchmark approach B" /><div className="rx-cell-foot"><span className="hint">{busy ? <JobLine state={busy.state} since={busy.since} detail={busy.detail} /> : " "}</span>{runButton}</div></div>
            </>}
            {connection !== "connected" && <p className="ps-offline" role="status">{connection === "checking" ? "Connecting to Spark…" : <><b>Spark isn&apos;t connected.</b> Start the local runner and reload to run this experiment. Nothing here is simulated.</>}</p>}
            <div className="rx-cell ps-results" aria-live="polite">
              <div className="rx-out-meta">
                <span className={problem || failed ? "bad" : answer ? "ok" : undefined}>{busy ? tool === "pipeline" ? `replaying stages 1–${step + 1} on Spark…` : "running on Apache Spark…" : problem ? "stopped" : answer ? failed ? "Spark reported an error" : "ok · ran on Apache Spark" : "results"}</span>
                {hasResult && !busy && <span className="acts"><button type="button" className="rx-btn ghost" onClick={() => { setAnswer(null); setProblem(null); }} aria-label="Clear results (your code stays)"><X size={13} aria-hidden="true" /> Clear</button></span>}
              </div>
              {problem && <p role="status" className="ps-problem">{problem}</p>}
              {answer && answer.identity !== identity && <p className="ps-stale rx-small">Previous run. The code, data or experiment changed since; run again.</p>}
              {answer ? <ToolAnswer result={answer} planFirst={tool === "plan"} /> : !busy && !problem && <p className="ps-empty">{runLabel === "Run" ? "Run the experiment" : `Press ${runLabel}`} to see real Spark results here.</p>}
            </div>
          </>}
        </section>
      </div>
      <ConfirmDialog open={reset} title="Restore the example code?" onClose={() => setReset(false)} actions={[{ label: "Restore example", onClick: () => write(side === "b" ? e.b ?? "result = orders" : starter) }]}><p>This replaces the selected editor’s draft. Results and project progress are separate.</p></ConfirmDialog>
    </div>
  </Shell>;
}

function PlanTree({ node }: { node: PsPlanNode }) { return <li><details open><summary>{node.name}</summary>{node.children.length > 0 && <ul>{node.children.map((n, i) => <PlanTree key={i} node={n} />)}</ul>}</details></li>; }
const ms = (n: number) => `${n.toLocaleString("en-US")} ms`;

/** True when Spark reported an error anywhere in the answer: the run, a side, a statement or a step. */
function failedRun(r: PsToolResult) {
  return !!r.error || r.sides.some((x) => x.error || x.cases?.some((c) => c.error));
}

function Plan({ plan }: { plan: PsPlan }) {
  return <div className="ps-plan"><p className="p2-note">Spark plans captured in this run. A preview can plan differently from a full write. Per-operator timings aren&apos;t collected.</p><ul><PlanTree node={plan.tree} /></ul>{(["logical", "optimized", "initial", "executed"] as const).map((p) => <details key={p}><summary>{p === "initial" ? "Physical plan before preview" : p === "executed" ? "Physical plan after preview" : `${p[0].toUpperCase()}${p.slice(1)} plan`}</summary><pre>{plan[p]}</pre></details>)}</div>;
}

function Frame({ frame: f, planFirst = false }: { frame: PsToolFrame; planFirst?: boolean }) {
  return (
    <section className="ps-frame">
      <div className="p2-data-head"><b>{f.name}</b><span>{f.truncated ? `first ${f.rows.length} of ${f.row_count.toLocaleString("en-US")} rows` : `${f.row_count.toLocaleString("en-US")} rows`}</span></div>
      {planFirst && f.plan && <Plan plan={f.plan} />}
      <DataTable columns={f.schema.map((c) => ({ name: c.name, type: c.nullable === false ? `${c.type} · not null` : c.type }))} rows={f.rows} label={f.name} />
      {!planFirst && f.plan && <Plan plan={f.plan} />}
    </section>
  );
}

function ToolAnswer({ result: r, planFirst }: { result: PsToolResult; planFirst: boolean }) {
  const last = (r.snapshots?.length ?? 0) - 1;
  return <>
    {r.error && <SparkError error={r.error} />}
    {r.comparison && <section className="ps-comparison">
      <h3>{r.comparison.verdict === "equivalent" ? "Equivalent to each other" : r.comparison.verdict === "different" ? "Different results" : "Not fully verified"}</h3>
      <p>{r.comparison.message}</p><p>{r.comparison.task_correctness}</p>
      {(["only_a", "only_b"] as const).map((k) => r.comparison![k]?.length ? <details key={k}><summary>Rows only in {k === "only_a" ? "A" : "B"} (up to 10)</summary><Code code={JSON.stringify(r.comparison![k], null, 2)} label="Row differences" /></details> : null)}
    </section>}
    {r.benchmark && <section className="ps-comparison">
      <h3>{r.benchmark.verdict}</h3><p>{r.benchmark.correctness}</p>
      <p>Median A: {ms(r.benchmark.median_a)} · B: {ms(r.benchmark.median_b)}</p>
      <p>Startup {ms(r.benchmark.startup_ms)} · preparation {ms(r.benchmark.preparation_ms)} · verification and collection {ms(r.benchmark.collection_ms)}.</p>
      <p>{r.benchmark.rows.toLocaleString("en-US")} rows · {r.benchmark.cores} cores · {r.benchmark.action}</p>
      <DataTable columns={[{ name: "Repetition" }, { name: "A (ms)" }, { name: "B (ms)" }]} rows={r.benchmark.repetitions.map((x, i) => [i + 1, x.a, x.b])} label="Measured repetitions" />
    </section>}
    {r.snapshots?.map((s, i) => {
      const body = <>
        {s.event && <p className="p2-note">{s.event}</p>}
        {s.progress && <p className="p2-note">Spark micro-batch {s.progress.batchId}: {s.progress.numInputRows.toLocaleString("en-US")} input rows{s.progress.watermark ? ` · watermark ${s.progress.watermark}` : ""}</p>}
        {s.commits && <p className="p2-note">Checkpoint commits (micro-batch IDs): {s.commits.join(", ") || "none"}</p>}
        {s.frames.map((f, j) => <Frame key={j} frame={f} />)}
      </>;
      // Earlier steps fold away, so the step you chose is the one in view.
      return i === last ? <section key={s.step} className="ps-step"><h3>{s.step + 1}. {s.label}</h3>{body}</section> : <details key={s.step} className="ps-step"><summary>{s.step + 1}. {s.label}</summary>{body}</details>;
    })}
    {r.sides.map((side, i) => <section key={i}>
      {r.sides.length > 1 && <h3>Approach {i === 0 ? "A" : "B"}</h3>}
      {side.error && <SparkError error={side.error} />}
      {side.cases?.map((c) => <div key={c.id}>
        {c.error && <SparkError error={c.error} />}
        {c.frames?.map((f, j) => <Frame key={j} frame={f} planFirst={planFirst} />)}
        {(c.stdout || c.stderr) && <details><summary>Output</summary><pre className="ps-console">{c.stdout}{c.stderr}</pre></details>}
      </div>)}
    </section>)}
  </>;
}
