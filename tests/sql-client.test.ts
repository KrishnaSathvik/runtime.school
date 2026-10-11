import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type Listener = (e: MessageEvent) => void;

/** Fake worker that answers in FIFO order with no request ids, like engine.js. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  listeners: Record<string, Listener[]> = { message: [], error: [] };
  queue: Array<{ query: string }> = [];
  terminated = false;
  constructor(public behaviour: { bootFail?: boolean } = {}) {
    FakeWorker.instances.push(this);
    setTimeout(() =>
      this.emit(this.behaviour.bootFail ? { error: "The SQL engine could not load." } : { ready: true }),
    );
  }
  addEventListener(type: string, fn: Listener) {
    (this.listeners[type] ??= []).push(fn);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn);
  }
  emit(data: unknown) {
    if (this.terminated) return;
    [...this.listeners.message].forEach((f) => f({ data } as MessageEvent));
  }
  postMessage(req: { query: string }) {
    this.queue.push(req);
  }
  /** Answer the oldest request. */
  respond() {
    const req = this.queue.shift()!;
    if (req.query === "HANG") return;
    this.emit({ result: { columns: ["q"], values: [[req.query]] } });
  }
  crash() {
    [...this.listeners.error].forEach((f) => f({} as MessageEvent));
  }
  terminate() {
    this.terminated = true;
  }
}

let client: typeof import("@/engine/sql-client");
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = globalThis;
  client = await import("@/engine/sql-client");
});

afterEach(() => {
  vi.useRealTimers();
  client.cancelSql();
  FakeWorker.instances = [];
});

describe("sql-client execution safety", () => {
  it("returns the result for the request that was sent", async () => {
    client.__setWorkerFactory(() => new FakeWorker() as unknown as Worker);
    const p = client.executeSql({ seed: "", query: "A" });
    await flush();
    await flush();
    FakeWorker.instances[0].respond();
    expect((await p).result?.values).toEqual([["A"]]);
  });

  it("a newer run supersedes an in-flight run — the stale result is never delivered to it", async () => {
    client.__setWorkerFactory(() => new FakeWorker() as unknown as Worker);
    const first = client.executeSql({ seed: "", query: "FIRST" });
    await flush();
    await flush();
    const second = client.executeSql({ seed: "", query: "SECOND" });
    expect(await first).toEqual({ superseded: true });
    await flush();
    await flush();
    // The first worker is terminated; the second runs on a fresh worker.
    expect(FakeWorker.instances[0].terminated).toBe(true);
    FakeWorker.instances[1].respond();
    expect((await second).result?.values).toEqual([["SECOND"]]);
  });

  it("times out after 3s, then recovers with a fresh worker", async () => {
    vi.useFakeTimers();
    client.__setWorkerFactory(() => new FakeWorker() as unknown as Worker);
    const p = client.executeSql({ seed: "", query: "HANG" });
    await vi.advanceTimersByTimeAsync(5);
    FakeWorker.instances[0].respond();
    await vi.advanceTimersByTimeAsync(client.TIMEOUT_MS + 10);
    expect((await p).error).toMatch(/timed out/);
    expect(FakeWorker.instances[0].terminated).toBe(true);
    const next = client.executeSql({ seed: "", query: "AFTER" });
    await vi.advanceTimersByTimeAsync(5);
    FakeWorker.instances[1].respond();
    expect((await next).result?.values).toEqual([["AFTER"]]);
  });

  it("a worker crash mid-query resolves with an error and the next run recovers", async () => {
    client.__setWorkerFactory(() => new FakeWorker() as unknown as Worker);
    const p = client.executeSql({ seed: "", query: "X" });
    await flush();
    await flush();
    FakeWorker.instances[0].crash();
    expect((await p).error).toMatch(/stopped unexpectedly/);
    const next = client.executeSql({ seed: "", query: "Y" });
    await flush();
    await flush();
    FakeWorker.instances[1].respond();
    expect((await next).result?.values).toEqual([["Y"]]);
  });

  it("a failed engine boot is reported and retried on the next run (not cached forever)", async () => {
    let n = 0;
    client.__setWorkerFactory(() => new FakeWorker({ bootFail: n++ === 0 }) as unknown as Worker);
    expect((await client.executeSql({ seed: "", query: "X" })).error).toMatch(/could not load/);
    const next = client.executeSql({ seed: "", query: "Y" });
    await flush();
    await flush();
    FakeWorker.instances[1].respond();
    expect((await next).result?.values).toEqual([["Y"]]);
  });
});

it("cancellation before worker readiness settles immediately", async () => {
  client.__setWorkerFactory(() => ({addEventListener(){},removeEventListener(){},postMessage(){},terminate(){}}) as unknown as Worker);
  const pending=client.executeSql({seed:"",query:"SELECT 1"});
  client.cancelSql();
  expect(await pending).toEqual({superseded:true});
});
it("a worker that never announces readiness times out", async () => {
  vi.useFakeTimers();
  client.__setWorkerFactory(() => ({addEventListener(){},removeEventListener(){},postMessage(){},terminate(){}}) as unknown as Worker);
  const pending=client.executeSql({seed:"",query:"SELECT 1"});
  await vi.advanceTimersByTimeAsync(client.TIMEOUT_MS+1);
  expect((await pending).error).toMatch(/timed out/);
});
