// Shared checks for the whole authored Python inventory (lessons, practice, cases, projects).
// Every runnable block is executed in real Pyodide and compared with a reviewed snapshot of what it really
// does; every graded task's reference answer must pass the real grader, its starter must not, other correct
// programs must pass, and realistic wrong programs must fail on the check that teaches the point.
//
//   PY_SNAPSHOT=update  record what each block does now (review the diff before committing)
//   PY_DUMP=1           also write a readable code + output dump per group to PY_DUMP_DIR (default .py-dump/)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { expect } from "vitest";
import type { PyPackage, PyRunResult } from "@/engine/python/client";
import type { PyTask } from "@/engine/python/grading";
import type { PyGraded } from "@/content/python/types";
import { checkFast, runFast } from "./python-fast";

export type RunRecord = { status: string; stdout: string; error?: { type: string; line: number | null }; figures?: number; tables?: number; files?: string[] };

const SNAP_DIR = "tests/fixtures/python-outputs";
const UPDATE = process.env.PY_SNAPSHOT === "update";
const DUMP = !!process.env.PY_DUMP;
const DUMP_DIR = process.env.PY_DUMP_DIR ?? ".py-dump";

export function record(r: PyRunResult): RunRecord {
  if (!("stdout" in r)) return { status: r.status, stdout: "" };
  // How much a never-ending program prints before it's stopped depends on timing, so it isn't recorded.
  const stdout = r.status === "timeout" ? "" : r.stdout;
  const rec: RunRecord = { status: r.status, stdout: stdout.length > 6000 ? stdout.slice(0, 6000) + "…[truncated]" : stdout };
  if (r.status === "syntax-error" || r.status === "runtime-error") rec.error = { type: r.error.type, line: r.error.line };
  const figures = r.output.filter((c) => c.stream === "figure").length;
  const tables = r.output.filter((c) => c.stream === "table").length;
  if (figures) rec.figures = figures;
  if (tables) rec.tables = tables;
  if (r.files?.length) rec.files = r.files.map((f) => f.path);
  return rec;
}

/** One group's snapshot of real outputs (a module, the practice bank, …). */
export class Snapshot {
  private saved: Record<string, RunRecord>;
  private now: Record<string, RunRecord> = {};
  private dump: string[] = [];
  constructor(private group: string) {
    const file = `${SNAP_DIR}/${group}.json`;
    this.saved = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
  }
  /** Run `code`, compare with the reviewed record (or record it in update mode), and return the result. */
  async run(key: string, code: string, opts: { packages?: readonly PyPackage[]; files?: Record<string, string> } = {}): Promise<PyRunResult> {
    // The browser stops a run after 5 seconds; content never needs longer.
    const r = await runFast(code, { ...opts, timeoutS: 5 });
    const rec = record(r);
    this.now[key] = rec;
    if (DUMP) this.dump.push(`### ${key}\n\n\`\`\`python\n${code}\n\`\`\`\n\n\`\`\`text\n${rec.stdout}${rec.error ? `!! ${rec.status} ${rec.error.type} line ${rec.error.line}` : rec.status !== "ok" ? `!! ${rec.status}` : ""}${rec.figures ? `\n[${rec.figures} figure(s)]` : ""}${rec.tables ? `\n[${rec.tables} table(s)]` : ""}${rec.files ? `\n[files: ${rec.files.join(", ")}]` : ""}\n\`\`\`\n`);
    if (!UPDATE) {
      expect(this.saved[key], `${key}: no reviewed output recorded. Run with PY_SNAPSHOT=update and review the diff.`).toBeDefined();
      expect(rec, `${key}: output changed`).toEqual(this.saved[key]);
    }
    return r;
  }
  finish() {
    if (UPDATE) {
      mkdirSync(SNAP_DIR, { recursive: true });
      const sorted = Object.fromEntries(Object.entries(this.now).sort(([a], [b]) => a.localeCompare(b)));
      writeFileSync(`${SNAP_DIR}/${this.group}.json`, JSON.stringify(sorted, null, 1) + "\n");
    } else {
      const stale = Object.keys(this.saved).filter((k) => !(k in this.now));
      expect(stale, `recorded outputs for blocks that no longer exist in ${this.group}; run PY_SNAPSHOT=update`).toEqual([]);
    }
    if (DUMP) {
      mkdirSync(DUMP_DIR, { recursive: true });
      writeFileSync(`${DUMP_DIR}/${this.group}.md`, this.dump.join("\n"));
    }
  }
}

/** Everything a graded task promises, proven with the real grader. */
export async function validateGraded(label: string, g: PyGraded, ctx: { packages?: readonly PyPackage[]; files?: Record<string, string> } = {}) {
  const task: PyTask = {
    ...g.task,
    ...(ctx.packages && !g.task.packages ? { packages: ctx.packages } : {}),
    ...(ctx.files || g.task.files ? { files: { ...ctx.files, ...g.task.files } } : {}),
  };
  expect(g.hints.length, `${label}: at least two hints`).toBeGreaterThanOrEqual(2);
  expect(g.looksFor.length, `${label}: says what Check looks for`).toBeGreaterThanOrEqual(1);
  expect(task.checks.length, `${label}: has checks`).toBeGreaterThanOrEqual(1);
  const ids = task.checks.map((c, i) => c.id ?? `${c.kind}-${i + 1}`);
  expect(new Set(ids).size, `${label}: check ids are unique`).toBe(ids.length);
  if (g.expectedOutput !== undefined) {
    const out = task.checks.find((k) => k.kind === "output");
    expect(out && "expected" in out ? out.expected : null, `${label}: expectedOutput matches the output check`).toBe(g.expectedOutput);
  }

  const pass = await checkFast(task, g.answer);
  expect(pass.ok, `${label} answer fails: ${pass.summary} ${JSON.stringify(pass.checks.filter((k) => k.status !== "pass"))}\n${pass.stdout}`).toBe(true);
  const starter = await checkFast(task, g.starter);
  expect(starter.ok, `${label}: the starter already passes`).toBe(false);
  for (const [i, alt] of (g.alternatives ?? []).entries()) {
    const r = await checkFast(task, alt);
    expect(r.ok, `${label} alternative ${i + 1} fails: ${r.summary} ${JSON.stringify(r.checks.filter((k) => k.status !== "pass"))}`).toBe(true);
  }
  for (const [i, w] of (g.wrong ?? []).entries()) {
    const r = await checkFast(task, w.code);
    expect(r.ok, `${label} wrong ${i + 1} passes:\n${w.code}`).toBe(false);
    if (w.fails === "program") expect(r.checks.every((k) => k.status === "not-run"), `${label} wrong ${i + 1} should stop before checks: ${r.summary}`).toBe(true);
    else expect(r.checks.filter((k) => k.status === "fail").map((k) => k.id).sort(), `${label} wrong ${i + 1} fails on: ${r.summary}`).toEqual([...w.fails].sort());
  }
}
