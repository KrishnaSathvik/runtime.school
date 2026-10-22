"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, Pencil, Trash2 } from "lucide-react";
import { STARTERS, STARTER_GROUPS, BLANK_MAIN, type PyStarter } from "@/content/python-v2/tools/starters";
import { allFiles, loadSnippet, sizeFor, toolDataset } from "@/content/python-v2/tools/friendly";
import type { PyEditionFile } from "@/content/python-v2/datasets";
import { PY_MOUNT_LIMIT, preloadMounts, preloadPython, runPython, stopPython, type PyFile, type PyOutputChunk, type PyRunResult } from "@/engine/python/client";
import type { PyEditorHandle } from "@/features/py/PyEditor";
import { Shell } from "@/features/rt/Shell";
import { Select } from "@/features/rt/Select";
import { PLAYGROUND_EDITOR_HEIGHT } from "@/features/rt/editor-height";
import { usePy2, usePy2Ready } from "@/lib/python-progress-v2";
import { AVAILABLE_LIBRARIES, downloadFile, missingModule, packagesFor, takeHandoff, zipFiles } from "./handoff";
import { ConfirmDialog, NameDialog } from "./Dialogs";
import { PyCell, PyDatasetPicker, PyDatasetSummary, PySizePicker, PyTableList, pyStatus } from "./ToolParts";
import { WS_MAX_CHARS, WS_NAME, blankWorkspace, filesNeeded, freshName, nameProblem, programCode, readWorkspace, readsInput, stdinFor, writeWorkspace, type Workspace, type WsFile } from "./workspace";

type Dialog = null | { kind: "new" } | { kind: "rename"; name: string } | { kind: "delete"; name: string } | { kind: "reset" } | { kind: "starter"; starter: PyStarter };
const isPy = (name: string) => name.endsWith(".py");

/**
 * T01 Playground, laid out like the SQL Playground: what you're working with on the left (a starter, a dataset and
 * its files, your files), the code on the right. Several files, any of them runnable; dataset files under data/;
 * libraries load from your imports; everything is saved in this browser as you type.
 */
export function Playground() {
  const ready = usePy2Ready();
  const legacy = usePy2((s) => s.playground.code);
  const [ws, setWsState] = useState<Workspace | null>(null);
  const [token, setToken] = useState(0);
  const editor = useRef<PyEditorHandle>(null);

  useEffect(() => {
    if (ready && !ws) setWsState(readWorkspace(legacy));
  }, [ready, ws, legacy]);
  useEffect(() => {
    if (!ws) return;
    const t = setTimeout(() => writeWorkspace(ws), 250);
    return () => clearTimeout(t);
  }, [ws]);
  const setWs = useCallback((f: (w: Workspace) => Workspace, remount = false) => {
    setWsState((w) => (w ? f(w) : w));
    if (remount) setToken((x) => x + 1);
  }, []);

  const ds = toolDataset(ws?.dataset ?? null);
  const size = ds && ws ? sizeFor(ds, ws.size) : "starter";
  const dataFiles = useMemo(() => (ds ? allFiles(ds, size) : []), [ds, size]);
  const active = ws?.files.find((f) => f.name === ws.active) ?? ws?.files[0];
  const entry = active && isPy(active.name) ? active : ws?.files.find((f) => isPy(f.name));
  const program = useMemo(() => (ws && entry ? programCode(ws, entry.name) : ""), [ws, entry]);
  const packages = useMemo(() => packagesFor(program), [program]);
  const pkgKey = packages.join(",");
  const needed = useMemo(() => filesNeeded(program, dataFiles), [program, dataFiles]);
  const mounts = useMemo(() => needed.map((f) => ({ path: `data/${f.path}`, url: f.url, sha256: f.sha256 })), [needed]);
  const mountBytes = needed.reduce((s, f) => s + f.bytes, 0);

  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [ranFile, setRanFile] = useState("main.py");
  const [busy, setBusy] = useState(false);
  const [errorMark, setErrorMark] = useState<{ file: string; line: number; token: number } | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => preloadPython(packages), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by the package list
  }, [pkgKey]);
  useEffect(() => {
    if (mountBytes <= 8e6) preloadMounts(mounts);
  }, [mounts, mountBytes]);

  // Code sent from another tool opens as a new file; nothing of the learner's is replaced.
  useEffect(() => {
    if (!ws) return;
    const h = takeHandoff("playground");
    if (!h) return;
    setWs((w) => {
      const name = h.name && !w.files.some((f) => f.name === h.name) ? h.name : freshName(w, (h.name ?? "from_tool.py").replace(/\d*\.py$/, ""));
      const files = w.files.length >= 20 ? w.files.slice(1) : w.files;
      return { ...w, files: [...files, { name, code: h.code }], active: name, dataset: h.dataset ?? w.dataset, size: h.size ?? w.size };
    }, true);
    setNotice(`Opened the code from ${h.from} as a new file.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the workspace loads
  }, [!!ws]);

  const status = pyStatus("playground", ds?.id);
  if (!ws || !active) {
    return (
      <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "playground" }]} status={status}>
        <div className="rx-task rx-lesson"><p className="rx-small" role="status" style={{ padding: 28 }}>Loading your workspace…</p></div>
      </Shell>
    );
  }

  const setCode = (name: string, code: string) => setWs((w) => ({ ...w, files: w.files.map((f) => (f.name === name ? { ...f, code: code.slice(0, WS_MAX_CHARS) } : f)) }));
  const open = (name: string) => setWs((w) => ({ ...w, active: name }));

  async function run() {
    if (busy || !entry) return;
    if (mountBytes > PY_MOUNT_LIMIT) {
      setResult({ status: "crashed", message: `Your code names ${Math.round(mountBytes / 1e6)} MB of data files; one run can load up to ${PY_MOUNT_LIMIT / 1e6} MB. Pick a smaller size.`, stdout: "", stderr: "", output: [] });
      return;
    }
    setBusy(true);
    setLive([]);
    setResult(null);
    setRanFile(entry.name);
    setNotice(null);
    const others = Object.fromEntries(ws!.files.filter((f) => f.name !== entry.name).map((f) => [f.name, f.code]));
    const r = await runPython(entry.code, {
      packages, mounts, files: others, entry: entry.name, timeoutMs: 30000, stdin: stdinFor(ws!.stdin), echoInput: true,
      onOutput: (c) => setLive((l) => {
        const last = l.at(-1);
        return last && last.stream === c.stream && (c.stream === "stdout" || c.stream === "stderr") ? [...l.slice(0, -1), { ...last, text: last.text + c.text }] : [...l, c];
      }),
    });
    if (r.status === "superseded") return;
    setResult(r);
    setBusy(false);
    const err = r.status === "runtime-error" || r.status === "syntax-error" ? r.error : null;
    setErrorMark(err?.line ? { file: ("file" in err && err.file) || entry.name, line: err.line, token: Date.now() } : null);
  }

  const goTo = (line: number) => {
    const file = errorMark?.file ?? ranFile;
    setWs((w) => ({ ...w, active: w.files.some((f) => f.name === file) ? file : w.active }));
    setTimeout(() => editor.current?.goToLine(line), 30);
  };

  const insertLoader = (f: PyEditionFile) => {
    const code = loadSnippet(f);
    const target = isPy(active.name) ? active : entry;
    if (!target) return;
    if (target.name !== active.name) open(target.name);
    if (target.code.trim() === "" || target.code === BLANK_MAIN) {
      setCode(target.name, code);
      setToken((x) => x + 1);
    } else setTimeout(() => editor.current?.insert(code), 30);
    setNotice(`Added code that loads data/${f.path} to ${target.name}. Press Run.`);
  };

  const applyStarter = (s: PyStarter, mode: "replace" | "add") => {
    setResult(null);
    setLive([]);
    setWs((w) => {
      if (mode === "replace") return { ...w, files: s.files.map((f) => ({ ...f })), active: "main.py", dataset: s.dataset ?? null, size: "starter" };
      const added: WsFile[] = [];
      const taken = new Set(w.files.map((f) => f.name));
      const map: Record<string, string> = {};
      for (const f of s.files) {
        let name = f.name;
        for (let i = 2; taken.has(name); i++) name = f.name.replace(/\.py$/, `${i}.py`);
        taken.add(name);
        map[f.name] = name;
        added.push({ name, code: f.code });
      }
      for (const a of added) for (const [from, to] of Object.entries(map)) if (from !== to) a.code = a.code.replace(new RegExp(`\\b(from|import) ${from.slice(0, -3)}\\b`, "g"), `$1 ${to.slice(0, -3)}`);
      return { ...w, files: [...w.files, ...added].slice(-20), active: map["main.py"] ?? added[0].name, dataset: s.dataset ?? w.dataset, size: s.dataset ? "starter" : w.size };
    }, true);
  };
  const pickStarter = (id: string) => {
    const s = STARTERS.find((x) => x.id === id);
    if (!s) return;
    const pristine = ws.files.length === 1 && (ws.files[0].code === BLANK_MAIN || !ws.files[0].code.trim());
    if (pristine) applyStarter(s, "replace");
    else setDialog({ kind: "starter", starter: s });
  };

  const made: PyFile[] = result && "files" in result ? result.files ?? [] : [];
  const missing = result ? missingModule(result as never) : null;
  const asyncNote = result?.status === "runtime-error" && /stack switching/i.test(result.error.message);
  const eofNote = result?.status === "runtime-error" && result.error.type === "EOFError";
  const showInput = readsInput(program) || !!ws.stdin || eofNote;

  const after = (
    <>
      {missing && <p className="rx-observe"><span className="mono">note ›</span> <b>{missing}</b> isn&apos;t available here. Python in your browser can use {AVAILABLE_LIBRARIES.join(", ")}. It can&apos;t install packages or reach the internet.</p>}
      {eofNote && <p className="rx-observe"><span className="mono">note ›</span> input() had no line left to read. Type one line for each input() call in <b>Program input</b> below, then Run again.</p>}
      {asyncNote && <p className="rx-observe"><span className="mono">note ›</span> asyncio.run() doesn&apos;t work in the browser. async/await itself works: see Compare → “Sequential calls vs coroutines”.</p>}
      {made.length > 0 && (
        <div className="py-made">
          <div className="rx-out-meta"><span className="ok">{made.length} file{made.length === 1 ? "" : "s"} written</span></div>
          {made.map((f) => {
            const keepable = !f.truncated && WS_NAME.test(f.path) && f.text.length <= WS_MAX_CHARS;
            return (
              <details key={f.path}>
                <summary className="mono">{f.path}{f.truncated ? " · too large to show" : ""}
                  {keepable && <button type="button" className="rx-btn ghost" onClick={(e) => { e.preventDefault(); setWs((w) => ({ ...w, files: [...w.files.filter((x) => x.name !== f.path), { name: f.path, code: f.text }], active: f.path }), true); }}>Keep in my files</button>}
                </summary>
                {!f.truncated && <pre>{f.text.slice(0, 6000)}</pre>}
              </details>
            );
          })}
        </div>
      )}
    </>
  );

  const tabs = (
    <div className="py-filetabs">
      <div role="tablist" aria-label="Your files" style={{ display: "contents" }}>
        {ws.files.map((f) => (
          <button key={f.name} type="button" role="tab" aria-selected={f.name === active.name} onClick={() => open(f.name)}>{f.name}</button>
        ))}
      </div>
      <button type="button" onClick={() => setDialog({ kind: "new" })} aria-label="New file"><FilePlus2 size={13} aria-hidden="true" /></button>
    </div>
  );

  return (
    <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "playground" }, { label: active.name }]} status={status}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="pg-title">
            <p className="rx-prompt-line"><b>playground</b> write any Python · no grades</p>
            <h1 id="pg-title" className="rx-task-title">Python Playground</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>Write and run Python with real datasets and libraries. Nothing here affects course progress.</p>

            <Select
              id="pg-starter"
              label="start from"
              value=""
              onChange={pickStarter}
              groups={[{ label: "", options: [{ value: "", label: "Choose a ready-made program…" }] }, ...STARTER_GROUPS.map((g) => ({ label: g, options: STARTERS.filter((s) => s.group === g).map((s) => ({ value: s.id, label: `${s.title}${s.dataset ? ` · ${toolDataset(s.dataset)?.name}` : ""}` })) }))]}
            />
            <p className="rx-small">Short programs that run as they are. Open one to learn from it or build on it.</p>

            <PyDatasetPicker allowNone value={ds?.id ?? ""} onChange={(id) => setWs((w) => ({ ...w, dataset: id || null }))} />
            {ds && <PySizePicker d={ds} value={size} onChange={(s) => setWs((w) => ({ ...w, size: s }))} />}
            {ds ? (
              <>
                <PyDatasetSummary d={ds} size={size} />
                <p className="rx-label sec">files</p>
                <p className="rx-cap">Open a file to see its columns and a preview. <b>Load in code</b> adds code that reads it.</p>
                <PyTableList d={ds} size={size} action={insertLoader} />
              </>
            ) : (
              <p className="rx-small">Choose a dataset to read its files from your code under <code>data/</code>. Plain Python works without one.</p>
            )}

            <p className="rx-label sec">your files</p>
            <p className="rx-cap">Any <code>.py</code> file can run, and files can import each other (<code>from helpers import total</code>). Saved in this browser as you type.</p>
            <ul className="py-myfiles">
              {ws.files.map((f) => (
                <li key={f.name} className={f.name === active.name ? "on" : undefined}>
                  <button type="button" className="n mono" onClick={() => open(f.name)}>{f.name}</button>
                  <span className="mono">{f.code.split("\n").length} lines</span>
                  <button type="button" className="rx-btn ghost" aria-label={`Rename ${f.name}`} onClick={() => setDialog({ kind: "rename", name: f.name })}><Pencil size={13} /></button>
                  <button type="button" className="rx-btn ghost" aria-label={`Delete ${f.name}`} disabled={ws.files.length <= 1} onClick={() => setDialog({ kind: "delete", name: f.name })}><Trash2 size={13} /></button>
                </li>
              ))}
            </ul>
            <p className="py-row">
              <button type="button" className="rx-btn" onClick={() => setDialog({ kind: "new" })}><FilePlus2 size={13} /> New file</button>
              <button type="button" className="rx-btn ghost" onClick={() => downloadFile("playground.zip", zipFiles(ws.files.map((f) => ({ name: f.name, data: f.code }))) as BlobPart, "application/zip")}>Download my files</button>
              <button type="button" className="rx-btn ghost" onClick={() => setDialog({ kind: "reset" })}>Start over</button>
            </p>

            <p className="rx-label sec">libraries</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              Imports load automatically: {AVAILABLE_LIBRARIES.join(", ")}. Each run starts a fresh Python, so nothing carries over between runs.
              It can&apos;t install packages, reach the internet, or start threads or processes.
            </p>
          </article>

          <section className="rx-work rx-lesson-work rx-tool-work" aria-label="Code editor">
            {notice && <p className="rx-note" role="status" style={{ margin: "0 0 12px" }}>{notice}</p>}
            <PyCell
              key={`${active.name}-${token}`}
              ref={editor}
              name={active.name}
              value={active.code}
              onChange={(v) => setCode(active.name, v)}
              onRun={run}
              onStop={stopPython}
              busy={busy}
              result={result}
              live={live}
              minHeight={PLAYGROUND_EDITOR_HEIGHT}
              errorLine={errorMark && errorMark.file === active.name ? errorMark : null}
              runLabel={entry && entry.name !== active.name ? `Run ${entry.name}` : "Run"}
              onLine={goTo}
              onCloseOutput={() => { setResult(null); setLive([]); }}
              top={ws.files.length > 1 ? tabs : undefined}
              after={after}
            />
            {showInput && (
              <div className="py-stdin">
                <label className="rx-label" htmlFor="pg-stdin">program input</label>
                <p className="rx-cap">One line for each <code>input()</code> call, read in order when you press Run.</p>
                <textarea
                  id="pg-stdin"
                  rows={3}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  value={ws.stdin ?? ""}
                  onChange={(e) => { const v = e.target.value.slice(0, WS_MAX_CHARS); setWs((w) => ({ ...w, stdin: v })); }}
                />
              </div>
            )}
            <p className="rx-small">
              Run starts {entry?.name ?? "your .py file"}.
            </p>
          </section>
        </div>

        <NameDialog
          open={dialog?.kind === "new" || dialog?.kind === "rename"}
          title={dialog?.kind === "rename" ? `Rename ${dialog.name}` : "New file"}
          label="File name"
          initial={dialog?.kind === "rename" ? dialog.name : freshName(ws, "helpers")}
          confirm={dialog?.kind === "rename" ? "Rename" : "Create"}
          problem={(n) => nameProblem(n, ws, dialog?.kind === "rename" ? dialog.name : undefined)}
          onClose={() => setDialog(null)}
          onConfirm={(name) => {
            if (dialog?.kind === "rename") {
              const from = dialog.name;
              setWs((w) => ({ ...w, files: w.files.map((f) => (f.name === from ? { ...f, name } : f)), active: w.active === from ? name : w.active }), true);
            } else setWs((w) => ({ ...w, files: [...w.files, { name, code: isPy(name) ? `"""${name}"""\n\n` : "" }], active: name }), true);
            setDialog(null);
          }}
        />
        <ConfirmDialog open={dialog?.kind === "delete"} title={dialog?.kind === "delete" ? `Delete ${dialog.name}?` : ""} onClose={() => setDialog(null)}
          actions={[{ label: "Delete", danger: true, onClick: () => { const n = dialog?.kind === "delete" ? dialog.name : ""; setWs((w) => { const files = w.files.filter((f) => f.name !== n); return { ...w, files, active: w.active === n ? files[0].name : w.active }; }, true); } }]}>
          <p>The file and its code are deleted. This can&apos;t be undone.</p>
        </ConfirmDialog>
        <ConfirmDialog open={dialog?.kind === "reset"} title="Start over?" onClose={() => setDialog(null)}
          actions={[{ label: "Reset", danger: true, onClick: () => { setWs(() => blankWorkspace(), true); setResult(null); setLive([]); } }]}>
          <p>Every file goes back to a single main.py, and no dataset is selected.</p>
        </ConfirmDialog>
        <ConfirmDialog open={dialog?.kind === "starter"} title={dialog?.kind === "starter" ? `Open “${dialog.starter.title}”` : ""} onClose={() => setDialog(null)}
          actions={dialog?.kind === "starter" ? [{ label: "Add next to my files", onClick: () => applyStarter(dialog.starter, "add") }, { label: "Replace my files", primary: true, onClick: () => applyStarter(dialog.starter, "replace") }] : []}>
          <p>{dialog?.kind === "starter" ? dialog.starter.summary : ""} You already have your own files here: add the starter next to them, or replace them?</p>
        </ConfirmDialog>
      </div>
    </Shell>
  );
}
