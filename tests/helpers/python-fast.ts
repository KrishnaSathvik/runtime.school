// Content validation at scale: real Pyodide 314.0.7 in Node, the browser worker's own SETUP and HARNESS,
// and the lesson grader. Unlike python-node.ts (a fresh interpreter per run, ~1 s each), this keeps one
// interpreter per library set and gives every run a fresh namespace and a fresh, empty working folder, so the
// whole Python inventory can be executed in minutes. Modules the program loads from its folder are forgotten
// after each run, open matplotlib figures are closed, and a line-trace deadline stands in for the worker's
// timeout. Parity with the worker is covered by tests/python-content.test.ts, which uses fresh interpreters.
import { readFileSync } from "node:fs";
import { gradePython, probeFor, type PyGradeReport, type PyTask } from "@/engine/python/grading";
import { packageKey, type PyFile, type PyOutputChunk, type PyPackage, type PyRunResult } from "@/engine/python/client";

type Pyodide = Awaited<ReturnType<typeof import("pyodide").loadPyodide>>;

const WORKER = readFileSync("public/vendor/python-worker.mjs", "utf8");
const block = (name: string) => {
  const m = WORKER.match(new RegExp(`const ${name} = String\\.raw\`([\\s\\S]*?)\`;`));
  if (!m) throw new Error(`${name} not found in python-worker.mjs`);
  return m[1];
};
const SETUP = block("SETUP");
const HARNESS = block("HARNESS");
const WARM: Record<string, string[]> = {
  numpy: ["numpy"],
  pandas: ["pandas"],
  matplotlib: ["matplotlib.pyplot"],
  duckdb: ["duckdb"],
  pyspark: ["pyspark.sql"],
  "scikit-learn": ["sklearn"],
};
const LOAD: Record<string, string[]> = {
  numpy: ["numpy"],
  pandas: ["pandas"],
  matplotlib: ["matplotlib"],
  duckdb: ["duckdb"],
  pyspark: ["duckdb", "pandas", "typing-extensions"],
  "scikit-learn": ["scikit-learn"],
};

// Runs before each program: a fresh folder, a deadline on lines of main.py, and nothing left over from the last run.
const RESET = String.raw`
import os, sys, time
_run_no = [0]
_base_modules = set(sys.modules)

def _begin(limit_s):
    _run_no[0] += 1
    d = "/tmp/run-" + str(_run_no[0])
    os.makedirs(d)
    os.chdir(d)
    # Helper modules a previous program imported from its own folder (pricing.py, …).
    for name in list(sys.modules):
        if name not in _base_modules and (getattr(sys.modules.get(name), "__file__", None) or "").startswith("/tmp/run-"):
            del sys.modules[name]
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is not None:
        plt.close("all")
    deadline = time.monotonic() + limit_s
    def local(frame, event, arg):
        if event == "line" and time.monotonic() > deadline:
            raise _Deadline()
        return local
    def tracer(frame, event, arg):
        if frame.f_code.co_filename in ("main.py", "<check>") or frame.f_code.co_filename.startswith("/tmp/run-"):
            return local
        return None
    sys.settrace(tracer)

def _end():
    sys.settrace(None)

class _Deadline(BaseException):
    pass
`;

type Interp = { py: Pyodide; run: (...a: unknown[]) => { toJs: (o: object) => Record<string, unknown>; destroy: () => void }; begin: (s: number) => void; end: () => void; sink: { setSink: (n: number) => void }; out: { stdout: string; stderr: string; output: PyOutputChunk[] } };
const interps = new Map<string, Promise<Interp>>();

async function boot(packages: readonly PyPackage[]): Promise<Interp> {
  const { loadPyodide } = await import("pyodide");
  const py = await loadPyodide({ indexURL: "public/vendor/pyodide/314.0.7/", lockFileURL: "public/vendor/pyodide/314.0.7/pyodide-lock.json" } as Parameters<typeof loadPyodide>[0]);
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
  py.setStdin({ stdin: () => undefined, isatty: false });
  const ns = py.globals.get("dict")();
  const requested = [...new Set(packages)];
  if (requested.length) {
    await py.loadPackage([...new Set(requested.flatMap((p) => LOAD[p]))], { messageCallback: () => {}, errorCallback: () => {} });
    py.runPython(SETUP, { globals: ns });
    ns.get("_setup")(py.toPy(requested), py.toPy(requested.flatMap((p) => WARM[p])));
  }
  py.runPython(HARNESS, { globals: ns });
  py.runPython(RESET, { globals: ns });
  const fig = ns.get("_figure_sink");
  return {
    py,
    out,
    run: ns.get("run"),
    begin: ns.get("_begin"),
    end: ns.get("_end"),
    sink: { setSink: (n: number) => fig.set(1, n) },
  };
}

function interp(packages: readonly PyPackage[] = []): Promise<Interp> {
  const key = packageKey(packages);
  if (!interps.has(key)) interps.set(key, boot(packages));
  return interps.get(key)!;
}

export type FastRunOptions = { task?: PyTask; packages?: readonly PyPackage[]; files?: Record<string, string>; timeoutS?: number };

/** Run a program; the result has the shape the browser client returns (figures and tables included). */
export async function runFast(code: string, opts: FastRunOptions = {}): Promise<PyRunResult> {
  const packages = opts.packages ?? opts.task?.packages ?? [];
  const files = opts.files ?? opts.task?.files;
  const it = await interp(packages);
  it.out.stdout = "";
  it.out.stderr = "";
  it.out.output = [];
  it.sink.setSink(0);
  const probe = opts.task ? JSON.stringify(probeFor(opts.task)) : undefined;
  const figure = (png: string) => it.out.output.push({ stream: "figure", text: "data:image/png;base64," + String(png).slice(0, 32) });
  const emit = (kind: string, json: string) => {
    if (kind === "table") it.out.output.push({ stream: "table", text: String(json) });
  };
  it.begin(opts.timeoutS ?? 10);
  let r: Record<string, unknown>;
  try {
    const proxy = it.run(code, probe, () => {}, figure, files ? JSON.stringify(files) : undefined, emit);
    r = proxy.toJs({ dict_converter: Object.fromEntries });
    proxy.destroy();
  } finally {
    it.end();
  }
  const out = { stdout: it.out.stdout, stderr: it.out.stderr, output: it.out.output.map((c) => ({ ...c })), ...(r.files ? { files: r.files as PyFile[] } : {}) };
  const durationMs = 0;
  if (r.status === "runtime-error" && r.type === "_Deadline") return { ...out, status: "timeout", limitMs: (opts.timeoutS ?? 10) * 1000 };
  if (r.status === "ok") {
    const probeResult = r.probe as Record<string, unknown> | undefined;
    // A deadline inside a variant or expression check also means the program didn't finish.
    const stuck = JSON.stringify(probeResult ?? {}).includes('"_Deadline"');
    if (stuck) return { ...out, status: "timeout", limitMs: (opts.timeoutS ?? 10) * 1000 };
    return { ...out, status: "ok", durationMs, ...(probeResult ? { probe: probeResult as never } : {}) };
  }
  if (r.status === "syntax-error")
    return { ...out, status: "syntax-error", durationMs, error: { type: String(r.type), message: String(r.message), line: (r.line as number) ?? null, column: (r.column as number) ?? null, endLine: (r.endLine as number) ?? null, endColumn: (r.endColumn as number) ?? null, text: String(r.text ?? "") } };
  if (r.status === "runtime-error") return { ...out, status: "runtime-error", durationMs, error: { type: String(r.type), message: String(r.message), line: (r.line as number) ?? null, traceback: String(r.traceback ?? "") } };
  return { ...out, status: "crashed", message: String(r.message) };
}

/** Check Answer, as the page does it: one run with the task's probe and files, judged in TypeScript. */
export async function checkFast(task: PyTask, code: string, packages?: readonly PyPackage[]): Promise<PyGradeReport> {
  const t = packages && !task.packages ? { ...task, packages } : task;
  return gradePython(t, await runFast(code, { task: t }));
}
