import { pythonRunnerEnabled } from "@/platform/python-runner";
import { track } from "@/lib/analytics";
import { createSandboxWorker } from "./sandbox";
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
/** Loading data libraries (pandas, matplotlib, …) downloads and unpacks several MB the first time. */
export const PY_PACKAGES_BOOT_TIMEOUT_MS = 120000;
export const PY_RUN_TIMEOUT_MS = 5000;
/** Each dataset download/hash check has a separate preparation deadline. */
export const PY_MOUNT_TIMEOUT_MS = 60000;
/** Characters of stdout + stderr kept per run. */
export const PY_OUTPUT_LIMIT = 50000;
/** Loaded inside the sandbox from /runner/ (a rewrite of public/vendor/). Not fetched by the page itself. */
export const PY_WORKER_URL = "/runner/python-worker.mjs";

/**
 * Libraries a lesson can load, all self-hosted and hash-checked (scripts/copy-pyodide.mjs).
 * `pyspark` is DuckDB's PySpark-compatible DataFrame API under the `pyspark` name, not Apache Spark.
 */
export const PY_PACKAGES = ["numpy", "pandas", "matplotlib", "duckdb", "pyspark", "scikit-learn", "polars", "pyarrow", "tzdata"] as const;
export type PyPackage = (typeof PY_PACKAGES)[number];

export type PyStream = "stdout" | "stderr";
/**
 * Printed text, a matplotlib figure (`text` is then a PNG data URL), or a table from display(df)
 * (`text` is then JSON for a PyTable). `stdin` is a line input() read, shown as the typed echo; it is only
 * present when the run asked for `echoInput`, and it is never part of `stdout`.
 */
export type PyOutputChunk = { stream: PyStream | "stdin" | "figure" | "table"; text: string };
/** A DataFrame or Series shown with display(): the first rows, as text cells (null = missing). */
export type PyTable = { columns: string[]; dtypes: string[]; rows: (string | null)[][]; shape: [number, number]; index: string; series: boolean };
/** A file the program created or changed in its working folder. */
export type PyFile = { path: string; text: string; truncated?: boolean; changed?: boolean };
/**
 * A dataset edition file placed in the program's working folder before it runs (`path`, e.g. `data/orders.csv`).
 * Fetched once by the page from `url`, checked against `sha256`, cached by hash, and handed to the worker as bytes:
 * the worker itself never fetches data. Mounted files are never listed as program output.
 */
export type PyMount = { path: string; url: string; sha256: string };
/** Total bytes of dataset files one run may mount. */
export const PY_MOUNT_LIMIT = 64 * 1024 * 1024;

export type PySyntaxError = {
  type: string;
  message: string;
  line: number | null;
  column: number | null;
  endLine?: number | null;
  endColumn?: number | null;
  text: string;
};
export type PyRuntimeError = { type: string; message: string; line: number | null; traceback: string; /** The learner file the error is in, when not the entry file. */ file?: string | null };

/** A binary file in the program's working folder (a Database Lab `.db`), passed in or read back after the run. */
export type PyBlob = { path: string; bytes: ArrayBuffer };

type Output = { stdout: string; stderr: string; output: PyOutputChunk[]; files?: PyFile[]; blobs?: PyBlob[] };

/** What a Check asks the interpreter to report after the program runs. Never contains expected values. */
export type PyProbe = {
  vars?: string[];
  /** Names whose top-level assignments should be described from the parsed source (learning-objective checks). */
  assignments?: string[];
  calls?: { name: string; cases: { args: WireValue[]; kwargs?: Record<string, WireValue> }[] }[];
  /** Python expressions (or short snippets that set `result`) evaluated after the program, in a copy of its namespace. */
  exprs?: { code: string }[];
  /** Re-run the program with these top-level input assignments replaced, and report output and variables. */
  variants?: { set: Record<string, WireValue>; vars: string[] }[];
};
export type PyExprResult = { ok: true; value: PyValue; stdout: string } | { ok: false; error: PyRuntimeError; stdout: string };
export type PyVariantResult =
  | { status: "ok"; stdout: string; vars: Record<string, { value: PyValue } | { missing: true }> }
  | { status: "error"; stdout: string; error: PyRuntimeError; vars: Record<string, { value: PyValue } | { missing: true }> }
  | { status: "missing"; missing: string[] }
  | { status: "skipped" };
export type PyCallCase =
  | { ok: true; value: PyValue; stdout: string }
  | { ok: false; error: PyRuntimeError; stdout: string };
export type PyProbeResult = {
  /** Top-level names the program defined (not modules or dunders), for "did you mean" feedback. */
  names: string[];
  vars: Record<string, { value: PyValue } | { missing: true }>;
  calls: Record<string, { missing: true } | { notCallable: true; type: string } | { cases: PyCallCase[] }>;
  /** Top-level assignments to the requested names, in source order, with the variable names each uses. */
  assignments?: Record<string, PyAssignment[]>;
  exprs?: PyExprResult[];
  variants?: PyVariantResult[];
};
export type PyAssignment = { line: number; uses: string[]; aug: boolean };
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

/** Where a run happened, from the page address: learn, practice, project or the tool's name. Analytics only. */
function surfaceHere(): string {
  const m = typeof location === "undefined" ? null : /^\/python\/(?:tools\/)?([a-z-]+)/.exec(location.pathname);
  return m ? (m[1] === "projects" ? "project" : m[1]) : "other";
}

/** One coarse event per finished run (never the code): run or check, how it ended, and the error type if any. */
function trackRun(r: PyRunResult, check: boolean): void {
  if (r.status === "superseded" || r.status === "unavailable") return;
  const props = { subject: "python", surface: surfaceHere(), check, ok: r.status === "ok" };
  track("code_run", props);
  if (r.status === "runtime-error" || r.status === "syntax-error") track("code_error", { ...props, kind: r.error.type });
  else if (r.status !== "ok") track("code_error", { ...props, kind: r.status });
}

/** Learner code runs only in the isolated sandbox, so the build's switch (platform/python-runner.ts) is the only gate. */
function allowedHere(): boolean {
  return pythonRunnerEnabled();
}

/** Stable key for a package set: sorted, unique, comma-separated ("" for core Python). */
export function packageKey(packages: readonly PyPackage[] = []): string {
  return [...new Set(packages)].sort().join(",");
}

/**
 * Every interpreter runs in the isolated sandbox runner (an opaque-origin iframe; docs/python/runner-isolation.md).
 * The same-origin worker at PY_WORKER_URL is loaded only inside that sandbox, never directly by the page.
 */
let createWorker: (packages: string) => WorkerLike = (packages) => createSandboxWorker(packages);
let allowed: () => boolean = allowedHere;

/** Test hooks. */
export function __setPythonWorkerFactory(factory: (packages: string) => WorkerLike, allow: () => boolean = () => true): void {
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

/** The next interpreter, already booted with one package set (`key`). */
type Spare = {
  worker: WorkerLike;
  key: string;
  ready: Promise<void>;
  settled: boolean;
  failed: string | null;
  /** Throw this interpreter away unused: its boot timer stops, so it can never report a late failure. */
  discard: () => void;
};
let spare: Spare | null = null;

function boot(key: string): Spare {
  const worker = createWorker(key);
  const s: Spare = { worker, key, ready: Promise.resolve(), settled: false, failed: null, discard: () => worker.terminate() };
  s.ready = new Promise<void>((resolve, reject) => {
    const limit = key ? PY_PACKAGES_BOOT_TIMEOUT_MS : PY_BOOT_TIMEOUT_MS;
    const timer = setTimeout(() => done(new Error("Python took too long to load. Check your connection and try again.")), limit);
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
    s.discard = () => {
      if (!s.settled) {
        s.settled = true;
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
      }
      worker.terminate();
    };
  });
  s.ready.catch(() => {
    worker.terminate();
    if (spare === s) spare = null;
  });
  return s;
}

/** Start loading Python (with these libraries) ahead of the first Run, e.g. when a Python activity mounts. */
export function preloadPython(packages: readonly PyPackage[] = []): void {
  if (typeof window === "undefined" || !allowed() || active) return;
  const key = packageKey(packages);
  if (spare?.key === key) return;
  spare?.discard();
  spare = boot(key);
  const s = spare;
  setStatus("loading");
  s.ready.then(
    () => { if (spare === s && !active) setStatus("ready"); },
    (err: Error) => { if (!active) setStatus("failed", err.message); },
  );
}

/** Free the warm interpreter (e.g. when leaving Python pages). */
export function releasePython(): void {
  spare?.discard();
  spare = null;
  if (!active) setStatus("idle");
}

// ---- dataset mounts ----

let fetchBytes: (url: string, signal?: AbortSignal) => Promise<ArrayBuffer> = async (url, signal) => {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.arrayBuffer();
};
const mountCache = new Map<string, Promise<ArrayBuffer>>();

/** Test hook. */
export function __setMountFetcher(fetcher: (url: string, signal?: AbortSignal) => Promise<ArrayBuffer>): void {
  fetchBytes = fetcher;
  mountCache.clear();
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** One verified copy per hash. A failed or mismatched download isn't cached, so a retry fetches again. */
function loadMount(m: PyMount): Promise<ArrayBuffer> {
  const key = m.sha256.toLowerCase();
  let p = mountCache.get(key);
  if (!p) {
    const controller = new AbortController();
    const download = Promise.resolve().then(() => fetchBytes(m.url, controller.signal)).then(async (bytes) => {
      if ((await sha256Hex(bytes)) !== key) throw new Error(`${m.path} didn't match its published checksum`);
      return bytes;
    });
    p = new Promise<ArrayBuffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`the dataset download timed out after ${PY_MOUNT_TIMEOUT_MS / 1000} seconds`));
        controller.abort();
      }, PY_MOUNT_TIMEOUT_MS);
      download.then(bytes => { clearTimeout(timer); resolve(bytes); }, error => { clearTimeout(timer); reject(error); });
    });
    const pending = p;
    p.catch(() => { if (mountCache.get(key) === pending) mountCache.delete(key); });
    mountCache.set(key, p);
  }
  return p;
}

/** Start downloading a lesson's dataset files ahead of the first Run. */
export function preloadMounts(mounts: readonly PyMount[]): void {
  if (typeof window === "undefined" || !allowed()) return;
  for (const m of mounts) loadMount(m).catch(() => {});
}

async function resolveMounts(mounts: readonly PyMount[], pending?: Map<string, Promise<ArrayBuffer>>): Promise<{ path: string; bytes: ArrayBuffer }[]> {
  const all = await Promise.all(mounts.map(async (m) => {
    const key = m.sha256.toLowerCase();
    const request = loadMount(m);
    pending?.set(key, request);
    try { return { path: m.path, bytes: await request }; }
    finally { if (pending?.get(key) === request) pending.delete(key); }
  }));
  const total = all.reduce((s, m) => s + m.bytes.byteLength, 0);
  if (total > PY_MOUNT_LIMIT) throw new Error(`the dataset files are too large to load (${Math.round(total / 1e6)} MB)`);
  return all;
}

// ---- execution ----

type Active = { id: number; operation?: symbol; out: Output; current?: PyCaseRef; settle: (r: PyRunResult) => void };
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
  opts: {
    /** Optional caller identity: scoped Stop never interrupts a different caller. */
    operation?: symbol;
    timeoutMs?: number;
    outputLimit?: number;
    stdin?: string;
    probe?: PyProbe;
    /** Libraries this program may import; loaded before the run clock starts. */
    packages?: readonly PyPackage[];
    /** Text files written to the program's working folder before it runs (CSV, JSON, helper modules). */
    files?: Record<string, string>;
    /** Dataset edition files, fetched and verified before the run clock starts. */
    mounts?: readonly PyMount[];
    /** Learner-owned binary files written to the working folder before the run (copied; the caller keeps its own). */
    blobs?: readonly PyBlob[];
    /** Read back every top-level file with one of these suffixes when the program ends (e.g. [".db"]). */
    collect?: readonly string[];
    /** The name the program runs as (default main.py), so a multi-file workspace can run any of its files. */
    entry?: string;
    /** Add each line input() reads to `output` as a `stdin` chunk, after its prompt, for a console transcript. */
    echoInput?: boolean;
    onOutput?: (chunk: PyOutputChunk) => void;
  } = {},
): Promise<PyRunResult> {
  if (typeof window === "undefined" || !allowed()) {
    return { status: "unavailable", message: "Python execution isn't available on this site yet." };
  }
  if (active) active.settle({ status: "superseded" });

  const key = packageKey(opts.packages);
  const id = nextId++;
  const nonce = makeNonce();
  const out: Output = { stdout: "", stderr: "", output: [] };
  let settle!: (r: PyRunResult) => void;
  const result = new Promise<PyRunResult>((resolve) => (settle = resolve));
  const clock: { timer?: ReturnType<typeof setTimeout> } = {};
  let w: WorkerLike | null = null;
  const pendingMounts = new Map<string, Promise<ArrayBuffer>>();
  const me: Active = {
    id,
    operation: opts.operation,
    out,
    settle: (r) => {
      if (active !== me) return;
      active = null;
      // A retry must not inherit a download abandoned by Stop/supersession. Do not abort
      // shared fetches here: a preload/other consumer may still await them. Their own
      // deadline aborts transport; identity checks protect a newer same-hash entry.
      if (r.status === "stopped" || r.status === "superseded") {
        for (const [key, request] of pendingMounts) {
          if (mountCache.get(key) === request) mountCache.delete(key);
        }
      }
      clearTimeout(clock.timer);
      if (w) {
        w.removeEventListener("message", onMessage);
        w.removeEventListener("error", onError);
        w.terminate(); // single use, always
      }
      settle(r);
      trackRun(r, !!opts.probe);
      // Warm the next interpreter so the next Run starts quickly.
      if (r.status !== "superseded") {
        setStatus("idle");
        preloadPython(opts.packages);
      }
    },
  };
  active = me;

  if (spare && spare.key !== key) spare.discard();
  const s = spare?.key === key ? spare : boot(key);
  spare = null;
  w = s.worker;
  setStatus(s.settled && !s.failed ? "running" : "loading");

  const onMessage = (event: MessageEvent) => {
    const d = event.data;
    if (d?.id !== id || d?.nonce !== nonce) return;
    if (d.type === "case") {
      me.current = { call: String(d.call), index: Number(d.index) };
    } else if (d.type === "figure") {
      const src = String(d.src);
      if (!src.startsWith("data:image/png;base64,")) return;
      out.output.push({ stream: "figure", text: src });
      opts.onOutput?.({ stream: "figure", text: src });
    } else if (d.type === "rich") {
      if (d.kind !== "table") return;
      const text = String(d.json);
      out.output.push({ stream: "table", text });
      opts.onOutput?.({ stream: "table", text });
    } else if (d.type === "stdin") {
      // What was typed, for the transcript only: stdout and stderr (and so grading) never see it.
      if (!opts.echoInput) return;
      const chunk: PyOutputChunk = { stream: "stdin", text: String(d.text) };
      out.output.push(chunk);
      opts.onOutput?.({ ...chunk });
    } else if (d.type === "output") {
      const stream: PyStream = d.stream === "stderr" ? "stderr" : "stdout";
      const chunk: PyOutputChunk = { stream, text: d.text };
      out[stream] += chunk.text;
      const last = out.output.at(-1);
      if (last && last.stream === chunk.stream) last.text += chunk.text;
      else out.output.push({ ...chunk });
      opts.onOutput?.(chunk);
    } else if (d.type === "overflow") {
      me.settle({ ...out, status: "output-limit", limit: opts.outputLimit ?? PY_OUTPUT_LIMIT, case: me.current });
    } else if (d.type === "done") {
      const r = d.result ?? {};
      if (Array.isArray(r.files)) out.files = r.files.filter((f: PyFile) => f && typeof f.path === "string" && typeof f.text === "string");
      if (Array.isArray(r.blobs)) out.blobs = r.blobs.filter((b: PyBlob) => b && typeof b.path === "string" && b.bytes instanceof ArrayBuffer);
      if (r.status === "ok") me.settle({ ...out, status: "ok", durationMs: r.durationMs, ...(r.probe ? { probe: r.probe } : {}) });
      else if (r.status === "syntax-error")
        me.settle({ ...out, status: "syntax-error", durationMs: r.durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, column: r.column ?? null, endLine: r.endLine ?? null, endColumn: r.endColumn ?? null, text: r.text ?? "" } });
      else if (r.status === "runtime-error")
        me.settle({ ...out, status: "runtime-error", durationMs: r.durationMs, error: { type: r.type, message: r.message, line: r.line ?? null, traceback: r.traceback ?? "", file: r.file ?? null } });
      else me.settle({ ...out, status: "crashed", message: r.message ?? "Python stopped unexpectedly." });
    }
  };
  const onError = () => me.settle({ ...out, status: "crashed", message: "Python stopped unexpectedly. Run your code again." });

  // Datasets download while the interpreter boots; neither counts against the run clock.
  const mounting = opts.mounts?.length ? resolveMounts(opts.mounts, pendingMounts) : Promise.resolve(undefined);
  mounting.catch(() => {});
  let mounts: { path: string; bytes: ArrayBuffer }[] | undefined;
  try {
    // Stop/supersede must return immediately, even while the interpreter is still loading.
    const started = await Promise.race([s.ready.then(() => true), result.then(() => false)]);
    if (!started) return result;
    try {
      const got = await Promise.race([mounting.then((m) => ({ m })), result.then(() => null)]);
      if (!got) return result;
      mounts = got.m;
    } catch (err) {
      if (active === me) me.settle({ ...out, status: "crashed", message: `Couldn't load the dataset: ${(err as Error).message}. Check your connection and run again.` });
      return result;
    }
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
  w.postMessage({ type: "run", id, nonce, code, stdin: opts.stdin ?? "", outputLimit: opts.outputLimit ?? PY_OUTPUT_LIMIT, ...(opts.probe ? { probe: opts.probe } : {}), ...(opts.files ? { files: opts.files } : {}), ...(mounts ? { mounts } : {}), ...(opts.blobs?.length ? { blobs: opts.blobs.map((b) => ({ path: b.path, bytes: b.bytes.slice(0) })) } : {}), ...(opts.collect?.length ? { collect: [...opts.collect] } : {}), ...(opts.entry ? { entry: opts.entry } : {}) });
  return result;
}

/** Stop the current run (if any). The interpreter is discarded and a fresh one warms up. */
export function stopPython(): void;
export function stopPython(operation: symbol): void;
export function stopPython(operation?: symbol): void {
  if (!active || (typeof operation === "symbol" && active.operation !== operation)) return;
  active.settle({ ...active.out, status: "stopped", case: active.current });
}

export const pythonBusy = (): boolean => active !== null;
