import { pysparkRunnerUrl } from "@/platform/pyspark-flag";

/**
 * The PySpark execution client: the browser side of the runner contract (services/spark-runner/README.md).
 * Separate from the SQL and Python engines; nothing here imports them.
 *
 * A job is submitted, then polled: queued → starting (container launched) → running | checking (Spark is up) → done.
 * Every result comes from real Spark. With no runner connected the client says so; it never fabricates a result.
 * Production builds have no runner URL (platform/pyspark-flag.ts), so they can never reach a development bridge.
 */

export type PsJobState = "queued" | "starting" | "running" | "checking" | "done" | "error" | "cancelled";
export type PsField = { name: string; type: string; nullable: boolean };
export type PsError = { type: string; message: string; line?: number | null; column?: number | null; text?: string; condition?: string | null; traceback?: string | null };
export type PsFrame = { name: string; schema: PsField[]; rows: unknown[][]; row_count: number; truncated: boolean };
export type PsCase = {
  id: string;
  status: string;
  schema?: PsField[];
  rows?: unknown[][];
  row_count?: number;
  truncated?: boolean;
  frames?: PsFrame[];
  stdout?: string;
  stderr?: string;
  error?: PsError;
  ms?: number;
};
export type PsTimings = { spark_start_ms?: number; total_ms?: number; container_wall_ms?: number };
export type PsEngine = { spark: string; python: string; java: string } | null;
export type PsRunResult = { mode: "run" | "playground"; status: string; error?: PsError | null; cases: PsCase[]; timings: PsTimings; engine: PsEngine };
export type PsCheckRow = { id: string; visible: boolean; label: string; passed: boolean; message: string; missing?: unknown[][]; unexpected?: unknown[][]; stdout?: string; error?: PsError };
export type PsCheckResult = { mode: "check"; status: string; error?: PsError | null; passed: boolean; score: string; checks: PsCheckRow[]; timings: PsTimings; engine: PsEngine };

/** One table of a whole-project run: what that pipeline function returned, or why it couldn't. */
export type PsArtifactResult = { name: string; status: "ok" | "missing" | "runtime-error" | "contract-error"; schema?: PsField[]; rows?: unknown[][]; row_count?: number; truncated?: boolean; error?: PsError; ms?: number };
export type PsProjectRunResult = { mode: "project-run"; status: string; error?: PsError | null; artifacts: PsArtifactResult[]; stdout: string; stderr: string; timings: PsTimings; engine: PsEngine };
export type PsProjectStepCheck = { step: number; item: string; passed: boolean; score: string; status: string; error?: PsError | null; checks: PsCheckRow[] };
export type PsProjectCheckResult = { mode: "project-check"; status: string; passed: boolean; steps: PsProjectStepCheck[] };

export type PsEdition = "lesson" | "practice" | "project";
export type PsJobRequest =
  | { mode: "run" | "check"; item: string; code: string }
  | { mode: "playground"; dataset: string; edition?: PsEdition; code: string }
  | { mode: "project-run" | "project-check"; project: string; code: string }
  | PsToolRequest;

export type PsToolRequest = { mode: "tool"; action: "sql" | "plan" | "compare" | "pipeline" | "stream" | "benchmark"; dataset: string; version: string; edition: PsEdition; code: string; code_b?: string; language?: "python" | "sql"; language_b?: "python" | "sql"; identity: string; ordered?: boolean; scenario?: string; step?: number; size?: number };
export type PsPlanNode = { name: string; children: PsPlanNode[] };
export type PsPlan = { logical: string; optimized: string; initial: string; executed: string; tree: PsPlanNode; metrics_available: boolean };
export type PsToolFrame = PsFrame & { plan?: PsPlan; complete?: boolean };
export type PsToolSide = { status: string; error?: PsError; cases?: (Omit<PsCase, "frames"> & { frames?: PsToolFrame[] })[]; timings?: PsTimings; pids_peak?: number; memory_peak_bytes?: number };
export type PsToolResult = { mode: "tool"; status: string; identity: string; sides: PsToolSide[]; comparison?: { verdict: string; message: string; only_a?: unknown[][]; only_b?: unknown[][]; task_correctness: string } | null; snapshots?: { step: number; label: string; frames: PsToolFrame[]; progress?: { batchId: number; numInputRows: number; watermark?: string }; commits?: string[]; event?: string }[]; benchmark?: { repetitions: { a: number; b: number }[]; median_a: number; median_b: number; verdict: string; startup_ms: number; preparation_ms: number; action: string; rows: number; cores: number; collection_ms: number; correctness: string }; error?: PsError };
export type PsJobOutcome<R> =
  | { state: "done"; result: R }
  | { state: "cancelled" }
  | { state: "unavailable"; message: string }
  | { state: "error"; message: string };

const POLL_MS = 350;

export const runnerUrl = () => pysparkRunnerUrl();

/** Whether a runner is reachable and its Spark image is built. */
export async function runnerHealth(): Promise<boolean> {
  const url = runnerUrl();
  if (!url) return false;
  try {
    const r = await fetch(`${url}/health`, { cache: "no-store" });
    return r.ok && (await r.json()).ok === true;
  } catch {
    return false;
  }
}

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { cache: "no-store", ...init });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

/**
 * Run one job to the end. `onState` hears every state change; aborting `signal` cancels the job on the runner (the
 * container is killed) and resolves `cancelled` once the runner confirms.
 */
export async function sparkJob<R = PsRunResult | PsCheckResult>(
  req: PsJobRequest,
  { onState, signal }: { onState?: (s: PsJobState, detail?: { case?: string }) => void; signal?: AbortSignal } = {},
): Promise<PsJobOutcome<R>> {
  const url = runnerUrl();
  if (!url) return { state: "unavailable", message: "Spark isn't connected in this build." };
  let id: string;
  try {
    const r = await json(`${url}/jobs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
    if (r.status === 429) return { state: "error", message: "Spark is busy with other runs. Try again in a moment." };
    if (!r.ok) return { state: "error", message: r.body.error ?? `The runner refused the job (${r.status}).` };
    id = r.body.id;
    onState?.(r.body.state);
  } catch {
    return { state: "unavailable", message: `Can't reach the Spark runner at ${url}.` };
  }
  let cancelSent = false;
  let last = "";
  for (;;) {
    if (signal?.aborted && !cancelSent) {
      cancelSent = await fetch(`${url}/jobs/${id}`, { method: "DELETE" }).then((r) => r.ok).catch(() => false);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
    let job;
    try {
      const response = await json(`${url}/jobs/${id}`);
      if (!response.ok) return { state: "error", message: "This Spark run is no longer available. Run again." };
      job = response.body;
    } catch {
      return { state: "unavailable", message: `Lost contact with the Spark runner at ${url}.` };
    }
    const key = `${job.state}:${job.case ?? ""}`;
    if (key !== last) {
      last = key;
      onState?.(job.state, { case: job.case });
    }
    if (job.state === "done") return { state: "done", result: job.result as R };
    if (job.state === "cancelled") return { state: "cancelled" };
    if (job.state === "error") return { state: "error", message: job.error ?? "The runner couldn't run this job." };
  }
}
