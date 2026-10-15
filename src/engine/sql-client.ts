import type { PlanValidation } from "@/engine/plan-validation";
import type { GradeResult, SqlResult } from "./grading";

export type ExecuteRequest = {
  seed: string;
  query: string;
  answer?: string | null;
  ordered?: boolean;
  explain?: boolean;
  mutation?: string | null;
  allowWrites?: boolean;
  stateQueries?: string[];
  repeatCheck?: boolean;
  planValidation?: PlanValidation | null;
  validate?: Array<{ sql: string; value?: unknown; mustSucceed?: boolean; mustFail?: boolean }> | null;
  required?: string[] | null;
  compare?: Array<{ label: string; query: string; plan: string }> | null;
};

export type ExecuteResponse = {
  result?: SqlResult & { total?: number };
  total?: number;
  grade?: GradeResult | null;
  expected?: SqlResult | null;
  error?: string;
  /** Lab scripts only: where a multi-statement script stopped and what had already run. */
  failure?: { statement: number; sql: string; completed: number; later: boolean; openTransaction: boolean };
  /** Set when a newer execution replaced this one before it finished. */
  superseded?: boolean;
  comparison?: Array<{
    label: string;
    /** First 200 rows; `total` is the full count. */
    result: SqlResult;
    total?: number;
    plan: SqlResult;
  }>;
  equivalent?: boolean;
};

export const TIMEOUT_MS = 3000;
/** Grading runs the learner query and the reference on original and changed data. */
export const CHECK_TIMEOUT_MS = 8000;
/** Downloading and verifying a canonical dataset (a few MB) has its own budget, before any query timer. */
export const DATASET_TIMEOUT_MS = 60000;

/** A canonical SQLite dataset served as an immutable, hash-named asset. */
export type DatabaseRef = { url: string; sha256: string };
const DIRECTIVE = /^-- runtime:database (\S+) ([0-9a-f]{64})[^\n]*(?:\n|$)/;
/**
 * Seeds stay plain SQL strings throughout the UI. A seed for a canonical dataset starts with a
 * directive line naming the database file; the worker loads that file and applies the rest of the
 * seed (a small lesson or question overlay) on top of it.
 */
export function databaseSeed(db: DatabaseRef, overlay = ""): string {
  return `-- runtime:database ${db.url} ${db.sha256}\n${overlay}`;
}
export function databaseOf(seed: string | null | undefined): DatabaseRef | null {
  const m = DIRECTIVE.exec(seed ?? "");
  return m ? { url: m[1], sha256: m[2] } : null;
}
/** Overlay SQL without the directive line. */
export function seedOverlay(seed: string): string {
  return seed.replace(DIRECTIVE, "");
}
/** Warm the browser cache for a dataset while the learner reads the lesson. */
export function preloadDatabase(seed: string | null | undefined): void {
  const db = databaseOf(seed);
  if (db && typeof window !== "undefined") void fetch(db.url).then(r => r.arrayBuffer()).catch(() => undefined);
}
/**
 * Loading sql.js and its wasm on a cold page can take longer than a query is
 * allowed to run. Booting gets its own, longer limit so a first run is not
 * reported as a slow query (Query Performance and auto-run tools hit this).
 * Each attempt uses this budget; failed boots retry a few times with backoff.
 */
export const BOOT_TIMEOUT_MS = 12000;
/** How many times to create a fresh worker before surfacing a boot failure. */
export const BOOT_ATTEMPTS = 3;
const BOOT_BACKOFF_MS = 400;

const BOOT_FAIL_MESSAGE =
  "The SQL engine timed out while starting. Press Retry to try again.";

type WorkerLike = Pick<
  Worker,
  "postMessage" | "terminate" | "addEventListener" | "removeEventListener"
>;

let createWorker: () => WorkerLike = () => new Worker("/vendor/engine.js");

/** Test hook: swap the Worker factory. */
export function __setWorkerFactory(factory: () => WorkerLike): void {
  cancelSql();
  createWorker = factory;
}

let worker: WorkerLike | null = null;
let ready: Promise<void> | null = null;
/** The one execution allowed to resolve with real data. */
let pending: { settle: (r: ExecuteResponse) => void } | null = null;

function terminateWorker() {
  worker?.terminate();
  worker = null;
}

function discardWorker() {
  terminateWorker();
  ready = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logBoot(event: "ok" | "fail", attempt: number, ms: number, detail?: string) {
  // Keep this free of analytics imports so unit tests can load the client in Node.
  // Boot failures that reach the UI are still classified as engine_boot via errorKind().
  if (typeof console === "undefined") return;
  if (event === "fail") {
    console.warn(`[sql-engine] boot attempt ${attempt}/${BOOT_ATTEMPTS} failed after ${ms}ms`, detail ?? "");
  } else if (attempt > 1) {
    console.info(`[sql-engine] boot succeeded on attempt ${attempt} after ${ms}ms`);
  }
}

/** One worker create + ready handshake, or reject on error / per-attempt timeout. */
function bootOnce(attempt: number): Promise<void> {
  const w = createWorker();
  worker = w;
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      const ms = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - started);
      if (err) {
        logBoot("fail", attempt, ms, err.message);
        // Tear down this attempt only — keep `ready` so concurrent callers
        // share the outer retry loop instead of spawning parallel boots.
        if (worker === w) terminateWorker();
        reject(err);
      } else {
        logBoot("ok", attempt, ms);
        resolve();
      }
    };
    const timer = setTimeout(
      () => finish(new Error(BOOT_FAIL_MESSAGE)),
      BOOT_TIMEOUT_MS,
    );
    const onMessage = (event: MessageEvent) => {
      if (event.data?.ready) {
        finish();
      } else if (event.data?.error && !event.data.result) {
        finish(new Error(String(event.data.error)));
      }
    };
    const onError = () => finish(new Error("The SQL engine worker failed to start."));
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
  });
}

function ensureWorker(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SQL engine runs in the browser only."));
  }
  if (ready) return ready;
  ready = (async () => {
    let last: Error = new Error(BOOT_FAIL_MESSAGE);
    for (let attempt = 1; attempt <= BOOT_ATTEMPTS; attempt++) {
      try {
        await bootOnce(attempt);
        return;
      } catch (err) {
        last = err instanceof Error ? err : new Error(String(err));
        if (attempt < BOOT_ATTEMPTS) await sleep(BOOT_BACKOFF_MS * attempt);
      }
    }
    throw last;
  })().catch((err) => {
    // Allow the next run to retry instead of caching a dead promise forever.
    ready = null;
    throw err;
  });
  return ready;
}

/**
 * The worker answers in order but carries no request ids, so overlapping runs
 * could hand one run's result to another. A new run therefore supersedes any
 * run still in flight: the old worker is terminated and the old caller gets
 * `{ superseded: true }` instead of someone else's result.
 */
export async function executeSql(
  request: ExecuteRequest,
): Promise<ExecuteResponse> {
  if (pending) {
    pending.settle({ superseded: true });
    discardWorker();
  }
  let settle!: (r: ExecuteResponse) => void;
  const result = new Promise<ExecuteResponse>((resolve) => {
    settle = resolve;
  });
  const token = { settle: (r: ExecuteResponse) => settle(r) };
  pending = token;

  const finish = (r: ExecuteResponse) => {
    clearTimeout(timer);
    if (pending !== token) return;
    pending = null;
    settle(r);
  };
  token.settle = (r) => {
    clearTimeout(timer);
    if (pending === token) pending = null;
    settle(r);
  };

  // Outer ceiling covers all boot attempts + backoffs, then the query itself.
  const bootBudget = BOOT_TIMEOUT_MS * BOOT_ATTEMPTS + BOOT_BACKOFF_MS * (BOOT_ATTEMPTS - 1) * BOOT_ATTEMPTS;
  let timer = setTimeout(() => {
    if (pending !== token) return;
    discardWorker();
    finish({ error: BOOT_FAIL_MESSAGE });
  }, bootBudget);
  try {
    // Cancellation must settle even when a terminated worker never announces ready.
    const started = await Promise.race([ensureWorker().then(() => true), result.then(() => false)]);
    if (!started) return result;
  } catch (err) {
    finish({ error: err instanceof Error ? err.message : String(err) });
    return result;
  }
  if (pending !== token) return result; // superseded while booting

  // The query limit starts once the engine (and any dataset) is ready.
  const limit = request.answer ? CHECK_TIMEOUT_MS : TIMEOUT_MS;
  const startQueryTimer = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (pending !== token) return;
      discardWorker();
      finish({ error: `Query timed out after ${limit / 1000} seconds. Simplify the query or add a LIMIT.` });
    }, limit);
  };
  clearTimeout(timer);
  if (databaseOf(request.seed)) {
    timer = setTimeout(() => {
      if (pending !== token) return;
      discardWorker();
      finish({ error: "The dataset took too long to load. Check your connection and press Run again." });
    }, DATASET_TIMEOUT_MS);
  } else startQueryTimer();

  const w = worker!;

  const cleanup = () => {
    clearTimeout(timer);
    w.removeEventListener("message", onMessage);
    w.removeEventListener("error", onError);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.ready) return;
    if (event.data?.phase === "database-ready") { startQueryTimer(); return; }
    cleanup();
    const data = event.data as ExecuteResponse;
    if (data.result && data.total === undefined) {
      data.total = data.result.values.length;
    }
    finish(data);
  };
  const onError = () => {
    cleanup();
    discardWorker();
    finish({ error: "The SQL engine stopped unexpectedly. Run the query again." });
  };
  w.addEventListener("message", onMessage);
  w.addEventListener("error", onError);
  w.postMessage(request);
  return result;
}

export function cancelSql(): void {
  if (pending) pending.settle({ superseded: true });
  pending = null;
  discardWorker();
}

/** True when the error is an engine boot / worker failure (Retry may recover). */
export function isEngineBootError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /timed out while starting|engine (could not load|stopped|worker failed)|SQL engine worker failed/i.test(
    message,
  );
}
