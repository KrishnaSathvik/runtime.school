"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { LAB_ACTIVITIES, LAB_ENVIRONMENTS, LAB_GROUPS, LAB_SCRATCH, activitiesFor, activityCode, activitySql, labEnv, type LabActivity } from "@/content/python-v2/tools/lab";
import { preloadPython, runPython, stopPython, type PyRunResult } from "@/engine/python/client";
import { LAB_DB_SUFFIXES, deleteLabDb, importProgram, isLabDbName, labSql, listLabDbs, saveLabDb, type LabReply, type LabSchema, type LabStatement } from "@/engine/python/lab-db";
import { Editor } from "@/features/rt/Editor";
import { Keys, MacOnly } from "@/features/rt/Keys";
import { Select } from "@/features/rt/Select";
import { Shell } from "@/features/rt/Shell";
import { LAB_EDITOR_HEIGHT } from "@/features/rt/editor-height";
import type { PyEditorHandle } from "@/features/py/PyEditor";
import { packagesFor, takeHandoff } from "./handoff";
import { ConfirmDialog } from "./Dialogs";
import { PyCell, pyStatus } from "./ToolParts";
import { Inline, useDraft, useStored } from "./ToolKit";

type Db = { name: string; bytes: ArrayBuffer };
type Dialog = null | "reset";

/** Split a SQL script into statements (quotes and comments respected), to find the one to explain. */
export function splitSql(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "-" && text[i + 1] === "-") {
      const end = text.indexOf("\n", i);
      i = end < 0 ? text.length : end;
      cur += "\n";
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`" || ch === "[") {
      const close = ch === "[" ? "]" : ch;
      let j = i + 1;
      while (j < text.length && !(text[j] === close && text[j + 1] !== close)) j += text[j] === close ? 2 : 1;
      cur += text.slice(i, j + 1);
      i = j;
      continue;
    }
    if (ch === ";") {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function sameBytes(x: ArrayBuffer, y: ArrayBuffer) {
  if (x.byteLength !== y.byteLength) return false;
  const a = new Uint8Array(x);
  const b = new Uint8Array(y);
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** "orders: 3,397 → 3,398 rows", "new table wallets (2 rows)": what a run changed, from two schemas. */
function describeChanges(before: LabSchema | null, after: LabSchema | null): string[] {
  if (!before || !after) return [];
  const was = new Map(before.tables.map((t) => [t.name, t.rows]));
  const now = new Map(after.tables.map((t) => [t.name, t.rows]));
  const out: string[] = [];
  for (const [name, rows] of now) {
    if (!was.has(name)) out.push(`new table ${name} (${(rows ?? 0).toLocaleString("en-US")} rows)`);
    else if (was.get(name) !== rows) out.push(`${name}: ${(was.get(name) ?? 0).toLocaleString("en-US")} → ${(rows ?? 0).toLocaleString("en-US")} rows`);
  }
  for (const name of was.keys()) if (!now.has(name)) out.push(`dropped table ${name}`);
  const idxWas = new Set(before.indexes.map((i) => i.name));
  for (const i of after.indexes) if (!idxWas.has(i.name)) out.push(`new index ${i.name}`);
  return out;
}

const ENVS = [...LAB_ENVIRONMENTS.map((e) => ({ id: e.id, name: e.name, db: e.db, start: e.start as string | undefined, blurb: e.blurb })), { id: LAB_SCRATCH.id, name: LAB_SCRATCH.name, db: LAB_SCRATCH.db, start: undefined, blurb: LAB_SCRATCH.blurb }];
const SCRATCH_SQL = `CREATE TABLE IF NOT EXISTS notes (\n    id INTEGER PRIMARY KEY,\n    body TEXT NOT NULL,\n    created TEXT DEFAULT CURRENT_TIMESTAMP\n);\n\nINSERT INTO notes (body) VALUES ('first note');\n\nSELECT * FROM notes;\n`;

/**
 * T03 Database Lab, laid out like the SQL Database Lab: pick a database and an activity on the left, read what you'll
 * try and what you should see, then run the Python (sqlite3) or SQL on the right. The database is built from its
 * dataset the first time it's opened and kept in this browser; Reset rebuilds it.
 */
export function DatabaseLab() {
  const [dbs, setDbs] = useState<Db[] | null>(null);
  const [envId, setEnvId] = useStored("py-lab-env", "store");
  const env = ENVS.find((e) => e.id === envId) ?? ENVS[0];
  const prepared = labEnv(env.id);
  const activities = useMemo(() => activitiesFor(env.id), [env.id]);
  const [activityId, setActivityId] = useStored(`py-lab-activity-${env.id}`, activities[0]?.id ?? "");
  const activity: LabActivity | undefined = activities.find((a) => a.id === activityId) ?? activities[0];
  const [mode, setMode] = useStored("py-lab-lang", "python");
  const initialPy = activity ? activityCode(activity, env) : `import sqlite3\n\nconn = sqlite3.connect("${env.db}")\n`;
  const py = useDraft(`py-lab-py-${env.id}-${activity?.id ?? "own"}`, initialPy);
  const initialSql = (activity && activitySql(activity, env)) ?? (env.start ? `SELECT *\nFROM ${env.start}\nLIMIT 20;\n` : SCRATCH_SQL);
  const sql = useDraft(`py-lab-sql-${env.id}-${activity?.id ?? "own"}`, initialSql);

  const [schema, setSchema] = useState<LabSchema | null>(null);
  const [pyRun, setPyRun] = useState<{ result: PyRunResult; changes: string[] } | null>(null);
  const [sqlRun, setSqlRun] = useState<LabReply | null>(null);
  const [plan, setPlan] = useState<{ sql: string; reply: LabReply } | null>(null);
  const [rows, setRows] = useState<{ table: string; reply: LabReply } | null>(null);
  const [busy, setBusy] = useState<null | "run" | "prepare" | "plan">(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const pyEditor = useRef<PyEditorHandle>(null);

  const db = dbs?.find((d) => d.name === env.db) ?? null;

  const refresh = useCallback(async (bytes: ArrayBuffer) => {
    const r = await labSql({ op: "schema", bytes });
    setSchema(r.schema ?? null);
    return r.schema ?? null;
  }, []);

  const store = useCallback(async (changed: Db[], removed: string[] = []) => {
    for (const d of changed) await saveLabDb(d.name, d.bytes);
    for (const n of removed) await deleteLabDb(n).catch(() => {});
    setDbs((prev) => {
      const map = new Map((prev ?? []).map((d) => [d.name, d]));
      for (const n of removed) map.delete(n);
      for (const d of changed) map.set(d.name, d);
      return [...map.values()].sort((x, y) => x.name.localeCompare(y.name));
    });
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      let list: Db[] = [];
      try {
        list = (await listLabDbs()).map(({ name, bytes }) => ({ name, bytes }));
      } catch {
        setProblem("This browser won't let the lab save databases (private browsing?). Your work lasts until you leave the page.");
      }
      if (!live) return;
      setDbs(list);
      const h = takeHandoff("lab");
      const wanted = LAB_ENVIRONMENTS.find((e) => e.dataset === h?.dataset);
      if (wanted) setEnvId(wanted.id);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);

  const prepare = useCallback(async (id: string) => {
    const e = labEnv(id);
    if (!e) {
      await store([{ name: LAB_SCRATCH.db, bytes: new ArrayBuffer(0) }]);
      return;
    }
    const m = pyManifests[e.dataset];
    setBusy("prepare");
    setProblem(null);
    const result = await runPython(importProgram(e.db, Object.entries(m.tables).map(([name, t]) => ({ name, ...t }))), { mounts: mountsFor(m.editions[e.size].ref), collect: LAB_DB_SUFFIXES, timeoutMs: 90000 });
    setBusy(null);
    if (result.status === "superseded") return;
    const made = "blobs" in result ? result.blobs?.find((b) => b.path === e.db) : undefined;
    if (result.status === "ok" && made) await store([{ name: e.db, bytes: made.bytes }]).catch((err) => setProblem((err as Error).message));
    else setProblem(`Couldn't prepare ${e.name}: ${result.status === "crashed" ? result.message : "the import program failed"}. Check your connection and choose it again.`);
  }, [store]);

  useEffect(() => {
    if (!dbs || busy === "prepare") return;
    if (!db) void prepare(env.id);
    else void refresh(db.bytes);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- when the database or its bytes change
  }, [dbs, env.id, db?.bytes]);

  useEffect(() => {
    if (mode === "python") preloadPython(packagesFor(py.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- warm up for the current program
  }, [mode, activity?.id]);

  const clearRuns = () => { setPyRun(null); setSqlRun(null); setPlan(null); setRows(null); };

  async function runSql() {
    if (!db || busy) return;
    setBusy("run");
    setPlan(null);
    const reply = await labSql({ op: "script", bytes: db.bytes, sql: sql.value });
    if (reply.bytes && !sameBytes(reply.bytes, db.bytes)) await store([{ name: db.name, bytes: reply.bytes }]).catch((e) => setProblem((e as Error).message));
    if (reply.schema) setSchema(reply.schema);
    setSqlRun(reply);
    setBusy(null);
  }

  async function runPy() {
    if (!dbs || !db || busy) return;
    setBusy("run");
    const before = dbs;
    const schemaBefore = schema;
    const data = activity?.data ? mountsFor(pyManifests[activity.data.dataset].editions[activity.data.size].ref, activity.data.files) : [];
    const result = await runPython(py.value, { packages: packagesFor(py.value), blobs: before.map((d) => ({ path: d.name, bytes: d.bytes })), mounts: data, collect: LAB_DB_SUFFIXES, timeoutMs: 60000 });
    if (result.status === "superseded") return;
    const changes: string[] = [];
    if ("blobs" in result && result.blobs) {
      const changed: Db[] = [];
      for (const b of result.blobs) {
        if (!isLabDbName(b.path)) continue;
        const old = before.find((d) => d.name === b.path);
        if (!old || !sameBytes(old.bytes, b.bytes)) {
          changed.push({ name: b.path, bytes: b.bytes });
          if (!old) changes.push(`created ${b.path}`);
        }
      }
      try { await store(changed); } catch (e) { changes.push((e as Error).message); }
      const now = changed.find((d) => d.name === env.db);
      if (now) changes.unshift(...describeChanges(schemaBefore, await refresh(now.bytes)));
    }
    setPyRun({ result, changes });
    setBusy(null);
  }

  async function explain() {
    const last = splitSql(sql.value).at(-1);
    if (!db || !last || busy) return;
    setBusy("plan");
    setPlan({ sql: last, reply: await labSql({ op: "plan", bytes: db.bytes, sql: last.replace(/^EXPLAIN\s+QUERY\s+PLAN\s+/i, "") }) });
    setBusy(null);
  }

  async function browse(table: string) {
    if (!db || busy) return;
    setRows({ table, reply: await labSql({ op: "browse", bytes: db.bytes, table }) });
  }

  async function reset() {
    clearRuns();
    await store([], [env.db]);
    await prepare(env.id);
  }

  const tableNames = useMemo(() => schema?.tables.map((t) => t.name) ?? [], [schema]);
  const seed = useMemo(() => schema?.tables.map((t) => `${t.sql};`).join("\n") ?? "", [schema]);
  const code = mode === "sql" ? sql.value : py.value;
  const involved = (schema?.tables ?? []).filter((t) => new RegExp(`\\b${t.name}\\b`, "i").test(code));
  const preparing = busy === "prepare";

  return (
    <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "database lab" }, { label: env.db }]} status={pyStatus("database lab", prepared?.dataset)}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="lab-title">
            <p className="rx-prompt-line"><b>database lab</b> program SQLite from Python · changes are saved</p>
            <h1 id="lab-title" className="rx-task-title">Database Lab</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Query and change a real database from Python, with sqlite3, transactions and indexes. Reset puts the data back.</p>
            <Select
              id="lab-db"
              label="database"
              value={env.id}
              onChange={(id) => { if (id === env.id) return; setEnvId(id); clearRuns(); setSchema(null); }}
              groups={[{ label: "Ready to use", options: LAB_ENVIRONMENTS.map((e) => ({ value: e.id, label: e.name })) }, { label: "Build your own", options: [{ value: LAB_SCRATCH.id, label: LAB_SCRATCH.name }] }]}
            />
            <Select
              id="lab-activity"
              label="activity"
              value={activity?.id ?? ""}
              onChange={(id) => { setActivityId(id); clearRuns(); if (!LAB_ACTIVITIES.find((a) => a.id === id)?.sql) setMode("python"); }}
              groups={LAB_GROUPS.map((g) => ({ label: g, options: activities.filter((a) => a.group === g).map((a) => ({ value: a.id, label: a.title })) })).filter((g) => g.options.length)}
            />
            <p className="rx-small">Pick another database to see different activities.</p>

            {activity && (
              <>
                <h2 className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>{activity.title}</h2>
                <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}><Inline text={activity.goal} /></p>
                <dl className="rx-dl">
                  <dt>what you&apos;ll try</dt><dd>Run the Python code{activity.sql ? ", then the SQL version in the SQL tab" : ""}. Change it and run it again: the database keeps your changes.</dd>
                  <dt>what you should see</dt><dd><Inline text={activity.notice} /></dd>
                </dl>
              </>
            )}

            {involved.length > 0 && (
              <>
                <p className="rx-label sec">tables involved</p>
                <ul className="rx-ds-involved mono">{involved.map((t) => <li key={t.name}><b>{t.name}</b> <span>{(t.rows ?? 0).toLocaleString("en-US")} rows</span></li>)}</ul>
              </>
            )}

            <p className="rx-label sec">tables in {env.db}</p>
            {problem && <p className="rx-note" role="alert">{problem}</p>}
            {preparing || !schema ? (
              <p className="rx-small" role="status">{preparing ? `Loading ${env.name} into a database you can change (first time only)…` : "…"}</p>
            ) : schema.tables.length === 0 ? (
              <p className="rx-small">No tables yet. Create one with SQL or Python.</p>
            ) : (
              <div className="rx-schema rx-ds-tables">
                {schema.tables.map((t) => <SchemaCard key={t.name} t={t} indexes={schema.indexes.filter((i) => i.table === t.name)} onBrowse={() => browse(t.name)} />)}
              </div>
            )}

            <p className="rx-label sec">how the lab works</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              {prepared ? `${env.name} is loaded into ${env.db}, a SQLite file kept in this browser.` : `${env.db} starts empty.`} Python opens it with <code>sqlite3.connect(&quot;{env.db}&quot;)</code>; the SQL tab runs on the same file. Whatever you commit stays until you reset it.
            </p>
          </article>

          <section className="rx-work rx-lesson-work rx-tool-work" aria-label="Code">
            <div className="rx-tabs" role="tablist" aria-label="Language">
              <button type="button" role="tab" aria-selected={mode === "python"} onClick={() => setMode("python")}>Python</button>
              <button type="button" role="tab" aria-selected={mode === "sql"} onClick={() => setMode("sql")}>SQL</button>
            </div>
            {mode === "python" ? (
              <PyCell
                key={`py-${env.id}-${activity?.id}`}
                ref={pyEditor}
                name={`${activity?.id ?? "lab"}.py`}
                value={py.value}
                onChange={py.set}
                onRun={runPy}
                onStop={stopPython}
                busy={busy === "run"}
                result={pyRun?.result ?? null}
                minHeight={LAB_EDITOR_HEIGHT}
                onCloseOutput={() => setPyRun(null)}
                after={
                  <>
                    {pyRun && pyRun.changes.length > 0 && <p className="rx-observe"><span className="mono">database changed ›</span> {pyRun.changes.join(" · ")}</p>}
                    {pyRun && "files" in pyRun.result && (pyRun.result.files ?? []).map((f) => (
                      <details key={f.path} className="py-made"><summary className="mono">your code wrote {f.path}</summary><pre>{f.text.slice(0, 4000)}</pre></details>
                    ))}
                  </>
                }
              />
            ) : (
              <div className="rx-cell">
                <div className="rx-cell-head">
                  <span className="name">{activity?.id ?? "lab"}.sql</span>
                  <span className="acts" aria-hidden="true"><MacOnly><Keys keys={["mod", "enter"]} /> <span>run</span></MacOnly></span>
                </div>
                <Editor key={`sql-${env.id}-${activity?.id}`} value={sql.value} onChange={sql.set} onRun={runSql} onCheck={runSql} label="SQL" minHeight={LAB_EDITOR_HEIGHT} tables={tableNames} seedSql={seed || undefined} />
                <div className="rx-cell-foot">
                  <span className="hint"> </span>
                  <button type="button" className="rx-btn ghost" onClick={explain} disabled={!!busy || !db}>Explain plan</button>
                  <button type="button" className="rx-btn" onClick={runSql} disabled={!!busy || !db}><Play size={13} /> {busy === "run" ? "Running…" : "Run"}</button>
                </div>
                {plan && <PlanOut plan={plan} />}
                {sqlRun && <SqlOut reply={sqlRun} onClose={() => setSqlRun(null)} />}
              </div>
            )}
            {/* Two different undos, side by side: the code goes back to the example; the database goes back to the dataset. */}
            <p className="py-row py-resets">
              <button type="button" className="rx-btn" disabled={mode === "sql" ? !sql.edited : !py.edited} onClick={() => { if (mode === "sql") sql.reset(); else { py.reset(); pyEditor.current?.replaceAll(initialPy); } }}>
                Reset code
              </button>
              <button type="button" className="rx-btn" onClick={() => setDialog("reset")} disabled={!db || preparing}>{prepared ? `Reset ${env.db} data` : `Empty ${env.db}`}</button>
            </p>
            {rows && (
              <div className="rx-cell">
                <div className="rx-cell-head"><span className="name">rows of {rows.table}</span><span className="acts"><button type="button" className="rx-btn ghost" onClick={() => setRows(null)}>Close</button></span></div>
                <SqlOut reply={rows.reply} />
              </div>
            )}
          </section>
        </div>

        <ConfirmDialog open={dialog === "reset"} title={prepared ? `Reset ${env.db}?` : `Empty ${env.db}?`} onClose={() => setDialog(null)} actions={[{ label: prepared ? "Reset" : "Empty it", danger: true, onClick: () => void reset() }]}>
          <p>{prepared ? `Every change you made to ${env.db} is undone: it's rebuilt from the original ${env.name} data.` : "Every table and row in it is removed."} Your code is kept.</p>
        </ConfirmDialog>
      </div>
    </Shell>
  );
}

function SchemaCard({ t, indexes, onBrowse }: { t: LabSchema["tables"][number]; indexes: LabSchema["indexes"]; onBrowse: () => void }) {
  const fk = new Map(t.foreignKeys.map((k) => [k.column, k.table]));
  return (
    <details className="rx-schema-table rx-ds-table">
      <summary><b>{t.name}</b><span>{(t.rows ?? 0).toLocaleString("en-US")} rows · {t.columns.length} columns</span></summary>
      <ul className="rx-ds-cols" aria-label={`Columns of ${t.name}`}>
        {t.columns.map((c) => (
          <li key={c.name}>
            <div className="rx-ds-col">
              <span className="n">{c.name}</span>
              <span className="meta">
                <span className="ty">{(c.type || "any").toLowerCase()}{c.notnull ? " · required" : ""}</span>
                {c.pk > 0 && <span className="rx-tag amber">key</span>}
                {fk.has(c.name) && <span className="rx-tag">→ {fk.get(c.name)}</span>}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {indexes.length > 0 && <p className="rx-ds-grain mono">indexes: {indexes.map((i) => i.name).join(", ")}</p>}
      <div className="rx-ds-acts"><button type="button" className="rx-btn" onClick={onBrowse}>Show rows</button></div>
    </details>
  );
}

function Rows({ s }: { s: LabStatement }) {
  return (
    <div className="rx-table-wrap" tabIndex={0} role="region" aria-label="Rows">
      <table className="rx-table">
        <thead><tr><th className="rn">#</th>{s.columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>{s.rows.length === 0 ? <tr><td colSpan={s.columns.length + 1} className="null">no rows</td></tr> : s.rows.map((r, i) => <tr key={i}><td className="rn">{i + 1}</td>{r.map((v, j) => (v === null ? <td key={j} className="null">NULL</td> : <td key={j}>{String(v)}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** SQL results in SQL's rx-out style. */
function SqlOut({ reply, onClose }: { reply: LabReply; onClose?: () => void }) {
  const { results = [], error, rolledBack } = reply;
  const shown = [...results].reverse().find((s) => s.columns.length);
  const writes = results.filter((s) => s.changes !== null);
  return (
    <div className="rx-out" aria-live="polite">
      <div className="rx-out-meta">
        {error ? <span className="bad">statement {error.index + 1} failed</span> : shown ? <span className="ok">{shown.rows.length.toLocaleString("en-US")} row{shown.rows.length === 1 ? "" : "s"}{shown.more ? " (first 500)" : ""} · {shown.columns.length} columns</span> : <span className="ok">ok · {results.length} statement{results.length === 1 ? "" : "s"} ran</span>}
        {writes.length > 0 && <span>{writes.map((s) => `${s.sql.split(/\s+/)[0].toUpperCase()} ${s.changes}`).join(" · ")}</span>}
        {onClose && <span className="acts"><button type="button" className="rx-btn ghost" onClick={onClose}>Close</button></span>}
      </div>
      {error && <div className="rx-error"><span className="why">{error.message}{error.index > 0 ? ` The ${error.index} statement${error.index === 1 ? "" : "s"} before it ran and were saved.` : ""}</span></div>}
      {rolledBack && <p className="rx-observe">A transaction was still open at the end, so it was rolled back. Add COMMIT; to keep it.</p>}
      {shown && <Rows s={shown} />}
    </div>
  );
}

function PlanOut({ plan }: { plan: { sql: string; reply: LabReply } }) {
  if (plan.reply.error) return <div className="rx-out"><div className="rx-out-meta"><span className="bad">{plan.reply.error.message}</span></div></div>;
  const rows = plan.reply.plan ?? [];
  const depth = (p: { parent: number }) => { let d = 0, cur = p; while (cur.parent && d < 10) { const up = rows.find((x) => x.id === cur.parent); if (!up) break; cur = up; d++; } return d; };
  return (
    <div className="rx-out">
      <div className="rx-out-meta"><span>explain query plan</span></div>
      <ol className="rx-plan mono">{rows.map((p) => <li key={p.id} style={{ paddingLeft: depth(p) * 18 }} className={/\bSEARCH\b/.test(p.detail) ? "ok" : ""}>{p.detail}</li>)}</ol>
      <p className="rx-observe">SCAN reads every row; SEARCH jumps to matching rows through an index or key; USE TEMP B-TREE means SQLite sorts or groups by itself.</p>
    </div>
  );
}
