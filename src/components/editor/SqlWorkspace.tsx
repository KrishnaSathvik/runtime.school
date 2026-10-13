"use client";
import { checkLabel as readableCheckLabel } from "@/lib/feedback-copy";

import { useShortcutModifier } from "@/lib/keyboard-shortcuts";
import type { PlanValidation } from "@/engine/plan-validation";

import { Play, Check, Copy, RotateCcw, IndentIncrease, Keyboard, CircleCheck, CircleX, CircleAlert, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { SQLite, sql } from "@codemirror/lang-sql";
import { isolateHistory } from "@codemirror/commands";
import { autocompletion } from "@codemirror/autocomplete";
import { formatSql } from "./format-sql";
import { EditorView } from "@codemirror/view";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { ResultsTable } from "@/components/editor/ResultsTable";
import { fixtureMutation, seed } from "@/content";
import { editorTheme } from "@/components/editor/editor-theme";
import { explainError, explainGrade, teachingSchema } from "@/engine/explain";
import { ExplanationView } from "@/components/editor/Explanation";

type Props = {
  help?: React.ReactNode;
  checkLabel?: string;
  value: string;
  onChange: (sql: string) => void;
  graded?: boolean;
  allowWrites?: boolean;
  answer?: string | null;
  learningExplanation?: string;
  ordered?: boolean;
  required?: string[] | null;
  stateQueries?: string[];
  repeatCheck?: boolean;
  planValidation?: PlanValidation | null;
  validate?: Array<{ sql: string; value?: unknown; mustSucceed?: boolean; mustFail?: boolean }> | null;
  observation?: (response: ExecuteResponse, sql: string) => string;
  onGraded?: (response: ExecuteResponse, guided: boolean) => void;
  guided?: boolean;
  starter?: string;
  /** Shown under graded feedback, e.g. "Next challenge". */
  nextAction?: React.ReactNode;
  /** Identity of the active task; results are cleared when it changes. */
  taskKey?: string;
  editorLabel?: string;
  /** Caret offset applied while the editor still holds the untouched starter. */
  starterCursor?: number;
  placeholder?: string;
  /** Rendered at the top of the editor column (used for the mobile task bar). */
  header?: React.ReactNode;
  /** Tables of the active dataset, used to explain missing-table errors. */
  tables?: string[];
  /** Replaces the default “saves your progress” sentence. */
  progressNote?: string;
  /** Graded work that should not be described as saved lesson progress. */
  savesProgress?: boolean;
  /** Database for this workspace (defaults to the curriculum seed). */
  seedSql?: string;
  /** Changed-data fixture for checks (defaults to the curriculum fixture). */
  mutationSql?: string;
  /** Run the current SQL (ungraded) when the workspace opens or the task changes. */
  autoRun?: boolean;
};

type Outcome = { tone: "ok" | "err" | "warn" | "info"; label: string };

/** One visible verdict per run, so errors, wrong rows, unmet requirements and success never look alike. */
export function resultOutcome(response: ExecuteResponse | null, guided: boolean, savesProgress = true): Outcome | null {
  if (!response) return null;
  const f = response.failure;
  if (response.error && f && f.completed > 0) return { tone: "err", label: `Stopped at statement ${f.statement} · ${f.completed} earlier statement${f.completed === 1 ? "" : "s"} ran` };
  if (response.error) return { tone: "err", label: "SQL error · the query did not run" };
  const g = response.grade;
  if (!g) {
    const n = response.total ?? response.result?.values.length;
    return { tone: "info", label: n === undefined ? "Ran · not graded" : `Ran · ${n} row${n === 1 ? "" : "s"} · not graded` };
  }
  if (g.ok) return { tone: "ok", label: guided ? "Correct · hints or answer used" : savesProgress ? "Correct · progress saved" : "Correct" };
  if (g.planFailed || /requires you to use/i.test(g.message)) return { tone: "warn", label: "Right rows · a requirement is not met" };
  if (/changed-data check failed/i.test(g.message) || g.variationFailed) return { tone: "warn", label: "Correct on sample data only" };
  return { tone: "err", label: "Not correct yet" };
}

/** States what a partly-run lab script actually did, instead of implying nothing ran. */
function ScriptFailure({ failure: f }: { failure: NonNullable<ExecuteResponse["failure"]> }) {
  const plain = !/\bOR\s+(FAIL|ROLLBACK|IGNORE|REPLACE)\b/i.test(f.sql);
  return (
    <section className="script-failure mb-3" aria-label="What ran">
      <ol className="text-sm">
        <li><span className="feedback-ok">Ran</span><span>Statement{f.completed === 1 ? " 1" : `s 1–${f.completed}`}</span></li>
        <li><span className="feedback-err">Failed</span><span>Statement {f.statement}</span>{f.sql && <code className="sql-mono">{f.sql}</code>}</li>
        {f.later && <li><span className="metadata">Not run</span><span>Every statement after {f.statement}</span></li>}
      </ol>
      <p className="metadata mt-2">
        {plain ? `SQLite undid statement ${f.statement}'s own changes. ` : ""}
        {f.openTransaction
          ? "A transaction was still open, so none of its changes were committed."
          : `Changes made by statement${f.completed === 1 ? " 1" : `s 1–${f.completed}`} were kept; nothing was rolled back.`}
        {" "}Each run starts again from the original sample data.
      </p>
    </section>
  );
}

const OUTCOME_ICON = { ok: CircleCheck, err: CircleX, warn: CircleAlert, info: Info } as const;

const SPLIT_KEY = "sqlstudio:editor-share";
const MIN_EDITOR = 160;
const MIN_RESULTS = 140;
/** Height kept for the Results heading and hint before anything has run. */
const EMPTY_RESULTS = 96;

export function SqlWorkspace({
  help,
  checkLabel = "Check answer",
  value,
  onChange,
  graded = false,
  allowWrites = false,
  answer = null,
  learningExplanation,
  ordered = false,
  required = null,
  validate = null,
  planValidation = null,
  repeatCheck = false,
  stateQueries,
  onGraded,
  observation,
  guided = false,
  starter = "",
  nextAction = null,
  taskKey = "",
  editorLabel = "SQL editor",
  starterCursor,
  placeholder = "Write your SQL here",
  header = null,
  tables = [],
  seedSql = seed,
  mutationSql = fixtureMutation,
  autoRun = false,
  progressNote,
  savesProgress = true,
}: Props) {
  const modifier = useShortcutModifier();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  // The SQL that produced `response` (the editor may have changed since).
  const [ranSql, setRanSql] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const runId = useRef(0);
  const [editorNotice, setEditorNotice] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Desktop split between editor and results. null = follow the default proportion.
  const workRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [framed, setFramed] = useState(false);
  const [space, setSpace] = useState(0);
  const [share, setShare] = useState<number | null>(() => {
    try { const v = Number(localStorage.getItem(SPLIT_KEY)); return v > 0 && v < 1 ? v : null; } catch { return null; }
  });
  useEffect(() => {
    const el = workRef.current;
    if (!el) return;
    const measure = () => {
      // Framed = the workspace page gives this column a fixed height (desktop IDE layout).
      const isFramed = getComputedStyle(el).getPropertyValue("--framed").trim() === "1";
      setFramed(isFramed);
      setSpace(isFramed ? el.clientHeight - (actionsRef.current?.offsetHeight ?? 52) - 8 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (actionsRef.current) ro.observe(actionsRef.current);
    return () => ro.disconnect();
  }, []);
  const maxEditor = Math.max(MIN_EDITOR, space - MIN_RESULTS);
  // Before the first run the editor takes the room; Results expand once there is output.
  const resultsEmpty = !busy && !response;
  const editorHeight = framed
    ? resultsEmpty && share === null
      ? Math.round(Math.max(MIN_EDITOR, space - EMPTY_RESULTS))
      : Math.round(Math.min(maxEditor, Math.max(MIN_EDITOR, share !== null ? space * share : Math.min(360, Math.max(300, Math.min(380, space * 0.4))))))
    : undefined;
  const setEditorHeight = useCallback((h: number) => {
    if (!space) return;
    const next = Math.min(maxEditor, Math.max(MIN_EDITOR, h)) / space;
    setShare(next);
    try { localStorage.setItem(SPLIT_KEY, String(next)); } catch {}
  }, [space, maxEditor]);
  const startDrag = (e: React.PointerEvent) => {
    if (editorHeight === undefined) return;
    e.preventDefault();
    const startY = e.clientY, startH = editorHeight;
    const move = (ev: PointerEvent) => setEditorHeight(startH + ev.clientY - startY);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; };
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  // Completion offers this exercise's tables/columns. Typing opens the list on
  // pointer devices; on phones only Ctrl/Cmd-Space (popups cover the keyboard).
  const tableKey = tables.join(",");
  const [activateOnTyping, setActivateOnTyping] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: none) and (pointer: coarse)");
    const apply = () => setActivateOnTyping(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const sqlLanguage = useMemo(() => {
    const all = teachingSchema();
    const schema = Object.fromEntries(
      tableKey
        .split(",")
        .filter(Boolean)
        .map((t) => [t, all[t.toLowerCase()] ?? []] as const)
        .filter(([, cols]) => cols.length),
    );
    const names = Object.keys(schema);
    return sql({
      dialect: SQLite,
      schema,
      // Unqualified columns complete from the exercise's main table; others via "table.".
      defaultTable: names[0],
      upperCaseKeywords: true,
    });
  }, [tableKey]);
  const viewRef = useRef<EditorView | null>(null);

  const format = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    const formatted = formatSql(view.state.doc.toString());
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: formatted }, annotations: isolateHistory.of("full") });
    view.focus();
    setEditorNotice("SQL formatted. Undo restores your previous draft.");
  }, []);

  // A fresh starter puts the caret where the learner should type (after SELECT).
  const placeCaret = useCallback(
    (view: EditorView) => {
      if (starterCursor === undefined) return;
      if (view.state.doc.toString() !== starter) return;
      const anchor = Math.min(starterCursor, view.state.doc.length);
      view.dispatch({ selection: { anchor } });
    },
    [starter, starterCursor],
  );
  useEffect(() => {
    if (viewRef.current) placeCaret(viewRef.current);
  }, [taskKey, starter, placeCaret]);

  // A different challenge or dataset must not show the previous task's result.
  useEffect(() => {
    runId.current += 1;
    setResponse(null);
    setHelpOpen(false);
    setBusy(false);
    return () => { runId.current += 1; };
  }, [taskKey]);

  const run = useCallback(
    async (check: boolean) => {
      const id = ++runId.current;
      setBusy(true);
      setResponse(null);
      try {
        const res = await executeSql({
          seed: seedSql,
          query: value,
          answer: check ? answer : null,
          ordered,
          mutation: check ? mutationSql : null,
          allowWrites,
          repeatCheck: check && repeatCheck,
          stateQueries: check ? stateQueries : undefined,
          planValidation: check ? planValidation : null,
          validate: check ? validate : null,
          required: check ? required : null,
        });
        // Ignore results from runs that a newer run or task switch replaced.
        if (res.superseded || id !== runId.current) return;
        setRanSql(value);
        setResponse(res);
        if (check && onGraded) onGraded(res, guided);
      } finally {
        if (id === runId.current) setBusy(false);
      }
    },
    [
      value,
      answer,
      ordered,
      allowWrites,
      validate,
      planValidation,
      repeatCheck,
      stateQueries,
      required,
      onGraded,
      guided,
      seedSql,
      mutationSql,
    ],
  );

  // Exploration tools open with real output instead of an empty Results area.
  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (autoRun) void runRef.current(false);
  }, [autoRun, taskKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!viewRef.current?.hasFocus) return;
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
        format();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) void run(e.shiftKey && graded);
      }
    };
    // Handle app commands before CodeMirror can interpret Ctrl+Shift+F as Find
    // and move focus away from the editor on Windows/Linux.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [run, busy, graded, format]);

  const outcome = resultOutcome(response, guided, savesProgress);

  return (
    <div className="editor-pane">
      {header}
      <div className="ide-toolbar flex min-h-11 shrink-0 flex-wrap items-end justify-between gap-2 border-b border-[var(--border)] bg-[var(--main)] px-3">
        <span className="editor-tab">query.sql</span>
        <div className="ide-actions mb-1.5 flex flex-wrap items-center gap-1 text-[var(--muted)]">
          <span className="metadata">
            SQLite{allowWrites ? " · sample data resets each run" : ""}
          </span>
          <button type="button" className="btn ghost" aria-label="Format SQL" title={`Format SQL (${modifier} + Shift + F)`} onClick={format}>
            <IndentIncrease size={15} />
          </button>
          <button type="button" className="btn ghost" aria-label="Editor shortcuts" title="Editor shortcuts" aria-expanded={showShortcuts} onClick={() => setShowShortcuts(!showShortcuts)}>
            <Keyboard size={15} />
          </button>
          <button
            type="button"
            className="btn ghost"
            aria-label="Copy SQL"
            title="Copy SQL"
            onClick={() => navigator.clipboard.writeText(value)}
          >
            <Copy size={15} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="btn ghost"
            aria-label="Reset query"
            title="Reset query"
            onClick={() => setResetConfirm(true)}
          >
            <RotateCcw size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      {showShortcuts && <div className="border-b border-[var(--border)] px-4 py-3 text-sm" aria-label="Keyboard shortcuts">
        <p>With the editor focused:</p>
        <ul className="mt-2 space-y-1">
          <li>{modifier} + Enter — run query</li>
          {graded && <li>{modifier} + Shift + Enter — check answer</li>}
          <li>{modifier} + Shift + F — format SQL</li>
          <li>Ctrl + Space — suggest tables, columns and keywords</li>
          <li>{modifier} + Z — undo · Escape — close suggestions</li>
        </ul>
      </div>}
      <span className="sr-only" role="status">{editorNotice}</span>
      {resetConfirm && (
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm">
          <span>Replace this draft with the starter query?</span>
          <button
            type="button"
            className="btn ghost feedback-err"
            onClick={() => {
              onChange(starter);
              setResetConfirm(false);
              // Wait for the new document before moving the caret.
              requestAnimationFrame(() => viewRef.current && placeCaret(viewRef.current));
            }}
          >
            Reset draft
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setResetConfirm(false)}
          >
            Keep draft
          </button>
        </div>
      )}
      <div ref={workRef} className="editor-work-area flex min-w-0 flex-1 flex-col">
      <div className="sql-editor-surface" role="region" aria-label="SQL editor" tabIndex={0} style={editorHeight !== undefined ? { height: editorHeight } : undefined}>
        <CodeMirror
          value={value}
          height="100%"
          minHeight="180px"
          theme="none"
          extensions={[
            sqlLanguage,
            autocompletion({ activateOnTyping }),
            EditorView.lineWrapping,
            editorTheme,
            EditorView.contentAttributes.of({ "aria-label": editorLabel }),
          ]}
          onChange={onChange}
          placeholder={placeholder}
          onCreateEditor={(view) => {
            viewRef.current = view;
            placeCaret(view);
          }}
          basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false }}
        />
      </div>
      {framed && editorHeight !== undefined && (
        <div
          className="split-handle"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize editor and results"
          aria-valuemin={MIN_EDITOR}
          aria-valuemax={maxEditor}
          aria-valuenow={editorHeight}
          tabIndex={0}
          title="Drag to resize the editor and results"
          onPointerDown={startDrag}
          onDoubleClick={() => { setShare(null); try { localStorage.removeItem(SPLIT_KEY); } catch {} }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              setEditorHeight(editorHeight + (e.key === "ArrowDown" ? 32 : -32));
            }
          }}
        />
      )}
      <div ref={actionsRef} className="editor-actions border-y border-[var(--border)] bg-[var(--main)]">
        {helpOpen && help && (
          <section
            id="workspace-help"
            className="help-panel"
            aria-label="Help and hints"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setHelpOpen(false);
                helpButtonRef.current?.focus();
              }
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3>Help and hints</h3>
              <button className="btn" onClick={() => { setHelpOpen(false); helpButtonRef.current?.focus(); }}>Close help</button>
            </div>
            {help}
          </section>
        )}
        <div className="editor-actions-row flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        {help && (
          <button ref={helpButtonRef} type="button" className="btn" aria-expanded={helpOpen} aria-controls="workspace-help" onClick={() => setHelpOpen(!helpOpen)}>
            Help / hints
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${graded ? "" : "primary"}`}
            disabled={busy}
            onClick={() => void run(false)}
            title={`See the output without grading (${modifier} + Enter)`}
          >
            <Play size={15} strokeWidth={1.75} /> Run query
          </button>
          {graded && (
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void run(true)}
              title={`Grade against the task and save progress (${modifier} + Shift + Enter)`}
            >
              <Check size={15} strokeWidth={1.75} /> {checkLabel}
            </button>
          )}
        </div>
        </div>
      </div>
      <div className={`results-panel${resultsEmpty ? " is-empty" : ""}`} role="region" aria-label="Query results" tabIndex={0} aria-live="polite" aria-busy={busy}>
        <div className="results-heading">
          <h2>Results</h2>
          {!busy && outcome && (() => { const Icon = OUTCOME_ICON[outcome.tone]; return (
            <span className={`outcome outcome-${outcome.tone}`} data-outcome={outcome.tone}>
              <Icon size={14} strokeWidth={2} aria-hidden /> {outcome.label}
            </span>
          ); })()}
        </div>
        {!busy && response && value !== ranSql && <p className="metadata border-b border-[var(--border)] px-4 py-3" role="status">
          Your draft has changed. These results are from the previous query. Run or check again to update them.
        </p>}
        {busy && <p className="metadata px-4 py-3">Running your query…</p>}
        {!busy && response && observation && <p className="metadata px-4 py-3"><strong>Observed result:</strong> {observation(response,ranSql)}</p>}
        {!busy && response?.error && (
          <div className="px-4 py-3">
            {response.failure && response.failure.completed > 0 && <ScriptFailure failure={response.failure} />}
            <ExplanationView explanation={explainError(response.error, ranSql, tables)} />
          </div>
        )}
        {!busy && response?.grade?.checks && (
          <section className="border-b border-[var(--border)] px-4 py-3" aria-label="Optimization learning feedback">
            <h3 className="text-sm font-semibold">Understand this result</h3>
            <p className="metadata mt-1">These checks show whether your query returns the right rows and uses the required indexes. They do not measure speed.</p>
            <ul className="mt-3 space-y-2 text-sm">
              {response.grade.checks.map((c, i) => (
                <li key={i}>
                  <strong className={c.ok ? "feedback-ok" : "feedback-err"}>{c.ok ? "Passed" : "Needs attention"}: {readableCheckLabel(c.label)}</strong>
                  <span className="metadata"> · {c.fixture === "original" ? "Sample data" : "Different data"}</span>
                  <p className="text-[var(--text-secondary)]">{c.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {!busy && response?.grade && !response.grade.ok && (
          <div className="px-4 py-3">
            <ExplanationView
              explanation={explainGrade({
                message: response.grade.message,
                variationFailed: response.grade.variationFailed,
                planFailed: response.grade.planFailed,
                query: ranSql,
                actual: response.result,
                expected: response.expected,
                ordered,
              })}
            />
            {response.expected && response.expected.values.length > 0 && !response.grade.planFailed && !response.grade.variationFailed && (
              <div className="mt-4">
                <p className="metadata mb-2">Expected output</p>
                <div className="table-scroll" tabIndex={0} role="region" aria-label="Expected output">
                  <ResultsTable
                    compact
                    result={{ ...response.expected, values: response.expected.values.slice(0, 8) }}
                  />
                </div>
                {response.expected.values.length > 8 && (
                  <p className="metadata mt-2">Showing 8 of {response.expected.values.length} expected rows.</p>
                )}
              </div>
            )}
          </div>
        )}
        {!busy && response?.grade?.ok && (
          <div className="px-4 py-3">
            <p className="text-sm feedback-ok">
              {guided
                ? "Correct—solved with help. Choose “Try again without hints” to solve it on your own."
                : response.grade.message}
            </p>
            {learningExplanation && <div className="mt-3 text-sm"><strong>Why this works</strong><p className="mt-1 text-[var(--text-secondary)]">{learningExplanation}</p></div>}
            {nextAction && <div className="mt-3 flex flex-wrap gap-2">{nextAction}</div>}
          </div>
        )}
        {!busy && response?.result && (
          <ResultsTable result={response.result} total={response.total} label="Query output" />
        )}
        {!busy && !response && (
          <p className="metadata px-4 py-3">
            {progressNote
              ? progressNote
              : graded
                ? "Output appears here after you run a query."
                : "Output appears here after you run a query. Nothing here is graded."}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
