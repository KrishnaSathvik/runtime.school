"use client";

import { useState } from "react";
import type { PsArtifact } from "@/content/pyspark/content";
import type { PsArtifactResult, PsProjectCheckResult, PsProjectRunResult } from "@/engine/pyspark/client";
import { CheckRows, DataTable, Schema, SparkError } from "./parts";

/**
 * What a whole-project run produced: every table of the pipeline, in order, as real Spark returned it. The list says
 * which tables are the project's outputs and which step writes each; picking one shows its schema and first rows.
 */
export function ArtifactsView({ result, busy, artifacts, onLine }: { result: PsProjectRunResult | null; busy: boolean; artifacts: PsArtifact[]; onLine: (n: number) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  if (busy) return <p className="p2-empty" role="status">Running every step of your pipeline on the project export…</p>;
  if (!result) return <p className="p2-empty">Press <b>Run project</b> to run every function in your file, in order, on the project export, and see each table it builds. Nothing is graded.</p>;
  if (!result.artifacts.length) return <div className="ps-run">{result.error ? <SparkError error={result.error} onLine={onLine} /> : <p className="p2-empty">The run ended without results.</p>}</div>;
  const got = Object.fromEntries(result.artifacts.map((a) => [a.name, a]));
  const shown = got[pick ?? ""] ?? result.artifacts.find((a) => a.status === "ok") ?? result.artifacts[0];
  const def = artifacts.find((a) => a.name === shown.name);
  return (
    <div className="ps-artifacts" aria-live="polite">
      <ol className="ps-artifact-list" aria-label="Tables your pipeline built">
        {artifacts.map((a) => {
          const r = got[a.name];
          return (
            <li key={a.name}>
              <button type="button" aria-pressed={shown.name === a.name} onClick={() => setPick(a.name)}>
                <span className={`p2-mark ${r?.status === "ok" ? "pass" : r?.status === "missing" ? "not-run" : "fail"}`} aria-hidden="true">{r?.status === "ok" ? "✓" : r?.status === "missing" ? "◌" : "✗"}</span>
                <code>{a.name}</code>
                <span className="ps-artifact-meta">{r?.status === "ok" ? `${r.row_count?.toLocaleString("en-US")} ${r.row_count === 1 ? "row" : "rows"}` : r?.status === "missing" ? `step ${a.step}` : "error"}{a.deliverable ? " · output" : ""}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="ps-artifact-detail">
        <div className="p2-data-head"><b>{shown.name}</b><span>{def?.about}</span></div>
        <ArtifactBody a={shown} before={result.artifacts.slice(0, result.artifacts.indexOf(shown))} step={def?.step} onLine={onLine} />
      </div>
    </div>
  );
}

function ArtifactBody({ a, before, step, onLine }: { a: PsArtifactResult; before: PsArtifactResult[]; step?: number; onLine: (n: number) => void }) {
  if (a.status === "missing") return <p className="p2-empty">Not in your file yet. Step {step} adds <code>{a.name}()</code>.</p>;
  if (a.error) {
    // A stage that calls a failing earlier stage fails with the same error; say where it starts.
    const cause = before.find((b) => b.error && b.error.message === a.error!.message && b.error.line === a.error!.line);
    return (
      <>
        {cause && <p className="p2-note ps-artifact-cause">Fails because <code>{cause.name}</code> fails: fix that one first.</p>}
        <SparkError error={a.error} onLine={onLine} />
      </>
    );
  }
  if (!a.schema || !a.rows) return null;
  return (
    <>
      <Schema fields={a.schema} />
      <DataTable columns={a.schema} rows={a.rows} label={`${a.name}: ${a.row_count} rows`} foot={a.truncated ? `First ${a.rows.length} of ${a.row_count?.toLocaleString("en-US")} rows` : undefined} />
    </>
  );
}

/** Every step's checks on the same file: which parts of the project are done and which still fail, and why. */
export function ProjectChecksView({ result, busy, steps, onLine }: { result: PsProjectCheckResult | null; busy?: string; steps: Record<number, { title: string; columns: string[] }>; onLine: (n: number) => void }) {
  const total = Object.keys(steps).length;
  if (busy !== undefined) return <p className="p2-empty" role="status">Checking every step of your project on Spark{busy ? `: ${busy}` : ""}. This runs each step&apos;s checks, hidden cases included, so it takes a few minutes.</p>;
  if (!result) return <p className="p2-empty">Press <b>Check project</b> to check every step on the code in your file, hidden cases included. Your file is checked as it is now, so a later change can break an earlier step.</p>;
  const ok = result.steps.filter((s) => s.passed).length;
  return (
    <div aria-live="polite">
      <div className={`p2-verdict ${result.passed ? "pass" : "fail"}`}>
        <span className={`p2-mark ${result.passed ? "pass" : "fail"}`} aria-hidden="true">{result.passed ? "✓" : "✗"}</span>
        <div><b>{result.passed ? "Every step passes" : `${ok} of ${total} steps pass`}</b></div>
      </div>
      <ul className="ps-project-checks" aria-label="Steps">
        {result.steps.map((s) => (
          <li key={s.item}>
            <details open={!s.passed && s.step === result.steps.find((x) => !x.passed)?.step}>
              <summary>
                <span className={`p2-mark ${s.passed ? "pass" : "fail"}`} aria-hidden="true">{s.passed ? "✓" : "✗"}</span>
                <span className="p2-sr">{s.passed ? "Passed" : "Failed"}: </span>
                <span>Step {s.step} · {steps[s.step]?.title}</span>
                <span className="ps-artifact-meta">{s.score}</span>
              </summary>
              {s.error ? <SparkError error={s.error} onLine={onLine} /> : <CheckRows checks={s.checks} onLine={onLine} columns={steps[s.step]?.columns} />}
            </details>
          </li>
        ))}
        {result.steps.length < total && <li className="p2-note ps-project-stopped">Later steps weren&apos;t checked: the file has to run first.</li>}
      </ul>
    </div>
  );
}
