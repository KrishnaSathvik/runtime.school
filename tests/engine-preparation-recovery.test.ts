import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import * as sql from "@/engine/sql-client";
import * as py from "@/engine/python/client";
class DeferredWorker {
  static all: DeferredWorker[] = [];
  listeners = new Map<string, Set<(e: MessageEvent) => void>>();
  requests: Record<string, unknown>[] = [];
  dead = false;
  constructor() { DeferredWorker.all.push(this); }
  addEventListener(t: string, f: (e: MessageEvent) => void) { if (!this.listeners.has(t)) this.listeners.set(t, new Set()); this.listeners.get(t)!.add(f); }
  removeEventListener(t: string, f: (e: MessageEvent) => void) { this.listeners.get(t)?.delete(f); }
  emit(data: unknown) { if (!this.dead) for (const f of this.listeners.get("message") ?? []) f({ data } as MessageEvent); }
  postMessage(r: Record<string, unknown>) { this.requests.push(r); }
  terminate() { this.dead = true; }
  pythonDone() { this.emit({ ...this.requests[0], type: "done", result: { status: "ok", durationMs: 1 } }); }
}
const latest = () => DeferredWorker.all.at(-1)!;
const tick = async () => { await vi.advanceTimersByTimeAsync(0); };
beforeEach(() => {
  vi.stubGlobal("window", globalThis); vi.useFakeTimers(); DeferredWorker.all = [];
  sql.__setWorkerFactory(() => new DeferredWorker() as unknown as Worker);
  py.__setPythonWorkerFactory(() => new DeferredWorker() as unknown as Worker);
});
afterEach(() => { sql.cancelSql(); py.stopPython(); py.releasePython(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("cancelled SQL preparation", () => {
  it("never resurrects a cancelled boot after a newer successful run", async () => {
    const a = sql.executeSql({ seed: "", query: "A" }); sql.cancelSql();
    expect(await a).toEqual({ superseded: true });
    const b = sql.executeSql({ seed: "", query: "B" }); const workerB = latest();
    workerB.emit({ ready: true }); await tick();
    workerB.emit({ result: { columns: ["x"], values: [["B"]] } }); expect((await b).result?.values).toEqual([["B"]]);
    await vi.advanceTimersByTimeAsync(sql.BOOT_TIMEOUT_MS + 401);
    expect(DeferredWorker.all).toHaveLength(2);
    const c = sql.executeSql({ seed: "", query: "C" }); await tick();
    expect(workerB.requests.at(-1)?.query).toBe("C");
    workerB.emit({ result: { columns: ["x"], values: [["C"]] } }); expect((await c).result?.values).toEqual([["C"]]);
  });
  it("cancelling during retry backoff prevents another worker", async () => {
    const a = sql.executeSql({ seed: "", query: "A" }); latest().emit({ error: "boot failed" }); await tick();
    sql.cancelSql(); expect(await a).toEqual({ superseded: true });
    await vi.advanceTimersByTimeAsync(401);
    expect(DeferredWorker.all).toHaveLength(1);
  });
});

const csv = "id\n1\n";
const bytes = () => new TextEncoder().encode(csv).buffer as ArrayBuffer;
const mount = { path: "data/a.csv", url: "/a.csv", sha256: createHash("sha256").update(csv).digest("hex") };
describe("Python preparation recovery", () => {
  it("bounds stalled mounts separately from execution and retries the same hash", async () => {
    let calls = 0;
    py.__setMountFetcher(async () => { calls++; return calls === 1 ? new Promise<ArrayBuffer>(() => {}) : bytes(); });
    const a = py.runPython("A", { mounts: [mount] }); latest().emit({ type: "ready" }); await tick();
    let result: Awaited<typeof a> | undefined;
    void a.then(r => { result = r; });
    await vi.advanceTimersByTimeAsync(60001);
    expect(result?.status).toBe("crashed");
    expect(result && "message" in result ? result.message : "").toMatch(/dataset.*too long|dataset.*timed out/i);
    const b = py.runPython("B", { mounts: [mount] }); const wb = latest(); wb.emit({ type: "ready" });
    vi.useRealTimers();
    for (let i = 0; i < 100 && !wb.requests.length; i++) await new Promise(r => setTimeout(r, 5));
    expect(calls).toBe(2); expect(wb.requests).toHaveLength(1);
    wb.pythonDone(); expect((await b).status).toBe("ok");
  });
  it("Stop immediately retries the same hash; a late old failure cannot evict its replacement", async () => {
    let calls = 0;
    let rejectOld!: (error: Error) => void;
    let finishNew!: (bytes: ArrayBuffer) => void;
    const signals: (AbortSignal | undefined)[] = [];
    py.__setMountFetcher((_url, signal) => {
      signals.push(signal);
      calls++;
      return calls === 1 ? new Promise((_resolve, reject) => { rejectOld = reject; }) : new Promise(resolve => { finishNew = resolve; });
    });
    const a = py.runPython("A", { mounts: [mount] }); latest().emit({ type: "ready" }); await tick();
    py.stopPython(); expect((await a).status).toBe("stopped");
    expect(signals[0]?.aborted).toBe(false); // shared preloads must not be aborted by an operation's Stop
    const b = py.runPython("B", { mounts: [mount] }); const wb = latest(); wb.emit({ type: "ready" }); await tick();
    expect(calls).toBe(2);
    rejectOld(new Error("old network failure")); await tick();
    py.preloadMounts([mount]); await tick();
    expect(calls).toBe(2); // replacement remains cached, including while still pending
    expect(signals[1]?.aborted).toBe(false);
    vi.useRealTimers(); finishNew(bytes());
    for (let i = 0; i < 100 && !wb.requests.length; i++) await new Promise(r => setTimeout(r, 5));
    expect(wb.requests).toHaveLength(1);
    wb.pythonDone(); expect((await b).status).toBe("ok");
  });
  it("package startup times out at its own budget and a later run recovers", async () => {
    const a = py.runPython("A", { packages: ["pandas"] });
    await vi.advanceTimersByTimeAsync(py.PY_PACKAGES_BOOT_TIMEOUT_MS + 1);
    expect((await a).status).toBe("crashed");
    const b = py.runPython("B", { packages: ["pandas"] }); const wb = latest(); wb.emit({ type: "ready" }); await tick(); wb.pythonDone();
    expect((await b).status).toBe("ok");
  });
  it("a cancelled package boot cannot fail a newer completed operation", async () => {
    const a = py.runPython("A", { packages: ["pandas"] }); py.stopPython(); expect((await a).status).toBe("stopped");
    const b = py.runPython("B", { packages: ["pandas"] }); const wb = latest(); wb.emit({ type: "ready" }); await tick(); wb.pythonDone(); expect((await b).status).toBe("ok");
    latest().emit({ type: "ready" }); await tick();
    await vi.advanceTimersByTimeAsync(py.PY_PACKAGES_BOOT_TIMEOUT_MS + 1);
    expect(py.getPythonStatus()).toBe("ready");
  });
});
