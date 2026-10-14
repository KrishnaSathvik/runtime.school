// Real Pyodide 314.0.7 in Node, running the browser worker's own harness, for content validation:
// every example, walkthrough step, mistake and reference answer is executed for real, and graded
// with the same probe + gradePython the lesson uses. One fresh interpreter per run, like the worker.
import { readFileSync } from "node:fs";
import { gradePython, probeFor, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import type { PyOutputChunk, PyRunResult } from "@/engine/python/client";

type Pyodide = Awaited<ReturnType<typeof import("pyodide").loadPyodide>>;

const HARNESS = (() => {
  const worker = readFileSync("public/vendor/python-worker.mjs", "utf8");
  const m = worker.match(/const HARNESS = String\.raw`([\s\S]*?)`;/);
  if (!m) throw new Error("harness not found in python-worker.mjs");
  return m[1];
})();

async function fresh(): Promise<{ py: Pyodide; out: { stdout: string; stderr: string; output: PyOutputChunk[] } }> {
  const { loadPyodide } = await import("pyodide");
  const py = await loadPyodide({ indexURL: "node_modules/pyodide/" });
  const out = { stdout: "", stderr: "", output: [] as PyOutputChunk[] };
  for (const stream of ["stdout", "stderr"] as const) {
    const decoder = new TextDecoder();
    (stream === "stdout" ? py.setStdout.bind(py) : py.setStderr.bind(py))({
      write(buf: Uint8Array) {
        const text = decoder.decode(buf, { stream: true });
        out[stream] += text;
        const last = out.output.at(-1);
        if (last && last.stream === stream) last.text += text;
        else out.output.push({ stream, text });
        return buf.length;
      },
    });
  }
  return { py, out };
}

/** Run a program once in a fresh interpreter; the result has the same shape the browser client returns. */
export async function runNode(code: string, opts: { task?: PyTask; stdin?: string } = {}): Promise<PyRunResult> {
  const { py, out } = await fresh();
  const lines = opts.stdin ? opts.stdin.split(/(?<=\n)/) : [];
  py.setStdin({ stdin: () => lines.shift(), isatty: false });
  const ns = py.globals.get("dict")();
  py.runPython(HARNESS, { globals: ns });
  const run = ns.get("run");
  const probe = opts.task ? JSON.stringify(probeFor(opts.task)) : undefined;
  const proxy = run(code, probe, () => {}, () => {});
  const r = proxy.toJs({ dict_converter: Object.fromEntries });
  proxy.destroy();
  const durationMs = 0;
  if (r.status === "ok") return { ...out, status: "ok", durationMs, ...(r.probe ? { probe: r.probe } : {}) };
  if (r.status === "syntax-error")
    return { ...out, status: "syntax-error", durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, column: r.column ?? null, endLine: r.endLine ?? null, endColumn: r.endColumn ?? null, text: r.text ?? "" } };
  if (r.status === "runtime-error") return { ...out, status: "runtime-error", durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, traceback: r.traceback ?? "" } };
  return { ...out, status: "crashed", message: String(r.message) };
}

/** Check Answer, as the lesson does it: run once with the task's probe, then judge in TypeScript. */
export async function checkNode(task: PyTask, code: string): Promise<PyGradeReport> {
  return gradePython(task, await runNode(code, { task, stdin: task.stdin }));
}
