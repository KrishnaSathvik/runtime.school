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
export async function runNode(code: string, opts: { task?: PyTask; stdin?: string; mounts?: { path: string; bytes: Uint8Array }[]; blobs?: { path: string; bytes: Uint8Array }[]; collect?: string[] } = {}): Promise<PyRunResult> {
  const { py, out } = await fresh();
  // Same as the worker: dataset bytes (and learner blobs) are written before the harness runs, and their paths are passed so they're never listed as output.
  opts = { ...opts, mounts: [...(opts.mounts ?? []), ...(opts.blobs ?? [])] };
  for (const m of opts.mounts ?? []) {
    const dir = m.path.split("/").slice(0, -1);
    for (let i = 1; i <= dir.length; i++) if (!py.FS.analyzePath(dir.slice(0, i).join("/")).exists) py.FS.mkdir(dir.slice(0, i).join("/"));
    py.FS.writeFile(m.path, m.bytes);
  }
  const mounted = opts.mounts?.length ? JSON.stringify(opts.mounts.map((m) => m.path)) : undefined;
  const lines = opts.stdin ? opts.stdin.split(/(?<=\n)/) : [];
  py.setStdin({ stdin: () => lines.shift(), isatty: false });
  const ns = py.globals.get("dict")();
  py.runPython(HARNESS, { globals: ns });
  const run = ns.get("run");
  const probe = opts.task ? JSON.stringify(probeFor(opts.task)) : undefined;
  const proxy = run(code, probe, () => {}, () => {}, undefined, undefined, mounted);
  const r = proxy.toJs({ dict_converter: Object.fromEntries });
  proxy.destroy();
  const durationMs = 0;
  if (Array.isArray(r.files)) (out as { files?: unknown }).files = r.files;
  // Same as the worker: read back top-level files with the requested suffixes.
  if (opts.collect?.length) {
    (out as { blobs?: unknown }).blobs = (py.FS.readdir(".") as string[])
      .filter((name) => opts.collect!.some((x) => name.endsWith(x)) && py.FS.isFile(py.FS.stat(name).mode))
      .map((name) => ({ path: name, bytes: (py.FS.readFile(name) as Uint8Array).slice().buffer }));
  }
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
