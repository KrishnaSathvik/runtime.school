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
  /** Set when a newer execution replaced this one before it finished. */
  superseded?: boolean;
  comparison?: Array<{
    label: string;
    result: SqlResult;
    plan: SqlResult;
  }>;
  equivalent?: boolean;
};

export const TIMEOUT_MS = 3000;

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

function discardWorker() {
  worker?.terminate();
  worker = null;
  ready = null;
}

function ensureWorker(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SQL engine runs in the browser only."));
  }
  if (ready) return ready;
  const w = createWorker();
  worker = w;
  ready = new Promise<void>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.ready) {
        w.removeEventListener("message", onMessage);
        resolve();
      } else if (event.data?.error && !event.data.result) {
        w.removeEventListener("message", onMessage);
        reject(new Error(event.data.error));
      }
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", () =>
      reject(new Error("The SQL engine worker failed to start.")),
    );
  }).catch((err) => {
    // Allow the next run to retry instead of caching a dead worker forever.
    if (worker === w) discardWorker();
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

  const timer = setTimeout(() => {
    if (pending !== token) return;
    discardWorker();
    finish({ error: "Query timed out after 3 seconds. Simplify the query or add a LIMIT." });
  }, TIMEOUT_MS);
  try {
    // Cancellation must settle even when a terminated worker never announces ready.
    const started = await Promise.race([ensureWorker().then(() => true), result.then(() => false)]);
    if (!started) return result;
  } catch (err) {
    finish({ error: err instanceof Error ? err.message : String(err) });
    return result;
  }
  if (pending !== token) return result; // superseded while booting

  const w = worker!;

  const cleanup = () => {
    clearTimeout(timer);
    w.removeEventListener("message", onMessage);
    w.removeEventListener("error", onError);
  };
  const onMessage = (event: MessageEvent) => {
    if (event.data?.ready) return;
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
