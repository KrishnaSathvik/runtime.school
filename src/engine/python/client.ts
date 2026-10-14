import { pythonRunnerEnabled } from "@/platform/python-runner";
import type { PyValue, WireValue } from "./values";

/**
 * Python execution client. Separate from the SQL engine: nothing here imports SQL code.
 *
 * Every execution gets a brand-new worker and interpreter, then that worker is discarded.
 * That is what isolates attempts from each other — a fresh globals dict alone would leave
 * imported modules, patched builtins, sys state and virtual files behind. To keep Run fast,
 * the next interpreter boots in the background as soon as the previous run settles.
 *
 * Stop, timeouts and output overflow all terminate the worker: production has no
 * cross-origin isolation, so there is no SharedArrayBuffer interrupt to use instead.
 */

export const PY_BOOT_TIMEOUT_MS = 30000;
export const PY_RUN_TIMEOUT_MS = 5000;
/** Characters of stdout + stderr kept per run. */
export const PY_OUTPUT_LIMIT = 50000;
export const PY_WORKER_URL = "/vendor/python-worker.mjs";

export type PyStream = "stdout" | "stderr";
export type PyOutputChunk = { stream: PyStream; text: string };

export type PySyntaxError = {
  type: string;
  message: string;
  line: number | null;
  column: number | null;
  endLine?: number | null;
  endColumn?: number | null;
  text: string;
};
export type PyRuntimeError = { type: string; message: string; line: number | null; traceback: string };

type Output = { stdout: string; stderr: string; output: PyOutputChunk[] };

/** What a Check asks the interpreter to report after the program runs. Never contains expected values. */
export type PyProbe = {
  vars?: string[];
  calls?: { name: string; cases: { args: WireValue[]; kwargs?: Record<string, WireValue> }[] }[];
};
export type PyCallCase =
  | { ok: true; value: PyValue; stdout: string }
  | { ok: false; error: PyRuntimeError; stdout: string };
export type PyProbeResult = {
  /** Top-level names the program defined (not modules or dunders), for "did you mean" feedback. */
  names: string[];
  vars: Record<string, { value: PyValue } | { missing: true }>;
  calls: Record<string, { missing: true } | { notCallable: true; type: string } | { cases: PyCallCase[] }>;
};
/** The test input being evaluated when a check was cut short. */
export type PyCaseRef = { call: string; index: number };

export type PyRunResult =
  | (Output & { status: "ok"; durationMs: number; probe?: PyProbeResult })
  | (Output & { status: "syntax-error"; error: PySyntaxError; durationMs: number })
  | (Output & { status: "runtime-error"; error: PyRuntimeError; durationMs: number })
  | (Output & { status: "timeout"; limitMs: number; case?: PyCaseRef })
  | (Output & { status: "output-limit"; limit: number; case?: PyCaseRef })
  | (Output & { status: "stopped"; case?: PyCaseRef })
  | (Output & { status: "crashed"; message: string })
  | { status: "superseded" }
  | { status: "unavailable"; message: string };

export type PyStatus = "idle" | "loading" | "ready" | "running" | "failed";

type WorkerLike = Pick<Worker, "postMessage" | "terminate" | "addEventListener" | "removeEventListener">;

const PRODUCTION_HOSTS = new Set(["runtime.school", "www.runtime.school"]);

function allowedHere(): boolean {
  if (!pythonRunnerEnabled()) return false;
  // Second guard: never execute on the public site, even if a build was misconfigured.
  return !(typeof location !== "undefined" && PRODUCTION_HOSTS.has(location.hostname));
}

let createWorker: () => WorkerLike = () => new Worker(PY_WORKER_URL, { type: "module", name: "runtime-python" });
let allowed: () => boolean = allowedHere;

/** Test hooks. */
export function __setPythonWorkerFactory(factory: () => WorkerLike, allow: () => boolean = () => true): void {
  stopPython();
  releasePython();
  createWorker = factory;
  allowed = allow;
}

// ---- status (for useSyncExternalStore) ----

let status: PyStatus = "idle";
let failure: string | null = null;
let version: string | null = null;
const listeners = new Set<() => void>();
function setStatus(next: PyStatus, message: string | null = null) {
  status = next;
  failure = message;
  listeners.forEach((l) => l());
}
export const getPythonStatus = (): PyStatus => status;
export const getPythonFailure = (): string | null => failure;
export const getPythonVersion = (): string | null => version;
export function subscribePythonStatus(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---- warm spare interpreter ----

type Spare = { worker: WorkerLike; ready: Promise<void>; settled: boolean; failed: string | null };
let spare: Spare | null = null;

function boot(): Spare {
  const worker = createWorker();
  const s: Spare = { worker, ready: Promise.resolve(), settled: false, failed: null };
  s.ready = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => done(new Error("Python took too long to load. Check your connection and try again.")), PY_BOOT_TIMEOUT_MS);
    const done = (err?: Error) => {
      if (s.settled) return;
      s.settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (err) {
        s.failed = err.message;
        reject(err);
      } else resolve();
    };
    const onMessage = (event: MessageEvent) => {
      const d = event.data;
      if (d?.type === "ready") {
        version = d.version ?? null;
        done();
      } else if (d?.type === "boot-error") done(new Error(`Python could not load: ${d.message}`));
    };
    const onError = () => done(new Error("Python could not load. Refresh the page and try again."));
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  });
  s.ready.catch(() => {
    worker.terminate();
    if (spare === s) spare = null;
  });
  return s;
}

/** Start loading Python ahead of the first Run (e.g. when a Python activity mounts). */
export function preloadPython(): void {
  if (typeof window === "undefined" || !allowed() || spare || active) return;
  spare = boot();
  const s = spare;
  setStatus("loading");
  s.ready.then(
    () => { if (spare === s && !active) setStatus("ready"); },
    (err: Error) => { if (!active) setStatus("failed", err.message); },
  );
}

/** Free the warm interpreter (e.g. when leaving Python pages). */
export function releasePython(): void {
  if (spare) {
    spare.worker.terminate();
    spare = null;
  }
  if (!active) setStatus("idle");
}

// ---- execution ----

type Active = { id: number; out: Output; current?: PyCaseRef; settle: (r: PyRunResult) => void };
let active: Active | null = null;
let nextId = 1;

/** Per-run secret: Python can call js.postMessage, but cannot read this, so forged messages are ignored. */
function makeNonce(): string {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(8, "0")).join("");
}

export async function runPython(
  code: string,
  opts: { timeoutMs?: number; outputLimit?: number; stdin?: string; probe?: PyProbe; onOutput?: (chunk: PyOutputChunk) => void } = {},
): Promise<PyRunResult> {
  if (typeof window === "undefined" || !allowed()) {
    return { status: "unavailable", message: "Python execution isn't available on this site yet." };
  }
  if (active) active.settle({ status: "superseded" });

  const id = nextId++;
  const nonce = makeNonce();
  const out: Output = { stdout: "", stderr: "", output: [] };
  let settle!: (r: PyRunResult) => void;
  const result = new Promise<PyRunResult>((resolve) => (settle = resolve));
  const clock: { timer?: ReturnType<typeof setTimeout> } = {};
  let w: WorkerLike | null = null;
  const me: Active = {
    id,
    out,
    settle: (r) => {
      if (active !== me) return;
      active = null;
      clearTimeout(clock.timer);
      if (w) {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        w.terminate(); // single use, always
      }
      settle(r);
      // Warm the next interpreter so the next Run starts quickly.
      if (r.status !== "superseded") {
        setStatus("idle");
        preloadPython();
      }
    },
  };
  active = me;

  const s = spare ?? boot();
  spare = null;
  w = s.worker;
  setStatus(s.settled && !s.failed ? "running" : "loading");

  const onMessage = (event: MessageEvent) => {
    const d = event.data;
    if (d?.id !== id || d?.nonce !== nonce) return;
    if (d.type === "case") {
      me.current = { call: String(d.call), index: Number(d.index) };
    } else if (d.type === "output") {
      const chunk: PyOutputChunk = { stream: d.stream, text: d.text };
      out[chunk.stream] += chunk.text;
      const last = out.output.at(-1);
      if (last && last.stream === chunk.stream) last.text += chunk.text;
      else out.output.push({ ...chunk });
      opts.onOutput?.(chunk);
    } else if (d.type === "overflow") {
      me.settle({ ...out, status: "output-limit", limit: opts.outputLimit ?? PY_OUTPUT_LIMIT, case: me.current });
    } else if (d.type === "done") {
      const r = d.result ?? {};
      if (r.status === "ok") me.settle({ ...out, status: "ok", durationMs: r.durationMs, ...(r.probe ? { probe: r.probe } : {}) });
      else if (r.status === "syntax-error")
        me.settle({ ...out, status: "syntax-error", durationMs: r.durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, column: r.column ?? null, endLine: r.endLine ?? null, endColumn: r.endColumn ?? null, text: r.text ?? "" } });
      else if (r.status === "runtime-error")
        me.settle({ ...out, status: "runtime-error", durationMs: r.durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, traceback: r.traceback ?? "" } });
      else me.settle({ ...out, status: "crashed", message: r.message ?? "Python stopped unexpectedly." });
    }
  };
  const onError = () => me.settle({ ...out, status: "crashed", message: "Python stopped unexpectedly. Run your code again." });

  try {
    // Stop/supersede must return immediately, even while the interpreter is still loading.
    const started = await Promise.race([s.ready.then(() => true), result.then(() => false)]);
    if (!started) return result;
  } catch (err) {
    if (active === me) {
      active = null;
      setStatus("failed", (err as Error).message);
      settle({ ...out, status: "crashed", message: (err as Error).message });
    }
    return result;
  }
  if (active !== me) return result; // stopped or superseded while loading

  setStatus("running");
  w.addEventListener("message", onMessage);
  w.addEventListener("error", onError);
  const limitMs = opts.timeoutMs ?? PY_RUN_TIMEOUT_MS;
  clock.timer = setTimeout(() => me.settle({ ...out, status: "timeout", limitMs, case: me.current }), limitMs);
  w.postMessage({ type: "run", id, nonce, code, stdin: opts.stdin ?? "", outputLimit: opts.outputLimit ?? PY_OUTPUT_LIMIT, ...(opts.probe ? { probe: opts.probe } : {}) });
  return result;
}

/** Stop the current run (if any). The interpreter is discarded and a fresh one warms up. */
export function stopPython(): void {
  if (!active) return;
  active.settle({ ...active.out, status: "stopped", case: active.current });
}

export const pythonBusy = (): boolean => active !== null;
