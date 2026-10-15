import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pythonRunnerEnabled } from "@/platform/python-runner";

type Listener = (e: MessageEvent) => void;
type Run = { type: "run"; id: number; nonce: string; code: string; stdin: string; outputLimit: number; probe?: unknown };

/** Fake python-worker.mjs: boots, accepts one run, answers when told to. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  listeners: Record<string, Listener[]> = { message: [], error: [] };
  runs: Run[] = [];
  terminated = false;
  constructor(
    public behaviour: { bootFail?: boolean; bootDelay?: number; never?: boolean } = {},
    public packages = "",
  ) {
    FakeWorker.instances.push(this);
    if (!behaviour.never) {
      setTimeout(
        () => this.emit(behaviour.bootFail ? { type: "boot-error", message: "wasm failed" } : { type: "ready", version: "314.0.7" }),
        behaviour.bootDelay ?? 0,
      );
    }
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
  postMessage(req: Run) {
    this.runs.push(req);
  }
  get tag() {
    return { id: this.runs[0].id, nonce: this.runs[0].nonce };
  }
  print(text: string, stream = "stdout") {
    this.emit({ type: "output", ...this.tag, stream, text });
  }
  finish(result: Record<string, unknown> = { status: "ok", durationMs: 1 }) {
    this.emit({ type: "done", ...this.tag, result });
  }
  crash() {
    [...this.listeners.error].forEach((f) => f({} as MessageEvent));
  }
  terminate() {
    this.terminated = true;
  }
}

let client: typeof import("@/engine/python/client");
const flush = () => new Promise((r) => setTimeout(r, 0));
const latest = () => FakeWorker.instances.at(-1)!;
let behaviour: ConstructorParameters<typeof FakeWorker>[0] = {};

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = globalThis;
  client = await import("@/engine/python/client");
});

function useFake(allow = true) {
  client.__setPythonWorkerFactory((packages) => new FakeWorker(behaviour, packages) as unknown as Worker, () => allow);
}

afterEach(() => {
  vi.useRealTimers();
  behaviour = {};
  client.stopPython();
  client.releasePython();
  FakeWorker.instances = [];
});

describe("python-client execution", () => {
  it("boots workers with the run's package set and reuses a spare only for the same set", async () => {
    useFake();
    expect(client.packageKey(["pandas", "matplotlib", "pandas"])).toBe("matplotlib,pandas");
    client.preloadPython(["pandas"]);
    const warm = latest();
    expect(warm.packages).toBe("pandas");
    // A different set replaces the spare instead of running on it.
    const p1 = client.runPython("import numpy", { packages: ["numpy"] });
    await flush();
    expect(warm.terminated).toBe(true);
    const w1 = latest();
    expect(w1.packages).toBe("numpy");
    expect(w1.runs).toHaveLength(1);
    w1.finish();
    await p1;
    // The next spare keeps the same set, so the following numpy run starts on it.
    const spare = latest();
    expect(spare.packages).toBe("numpy");
    const p2 = client.runPython("import numpy", { packages: ["numpy"] });
    await flush();
    expect(latest()).toBe(spare);
    expect(spare.runs).toHaveLength(1);
    spare.finish();
    await p2;
    // Core Python runs never load packages.
    const p3 = client.runPython("print(1)");
    await flush();
    expect(latest().packages).toBe("");
    latest().finish();
    await p3;
  });

  it("a spare that is replaced or released never reports a late boot failure", async () => {
    vi.useFakeTimers();
    useFake();
    behaviour = { never: true };
    client.preloadPython(["pandas"]);
    client.preloadPython(["numpy"]); // replaces the pandas spare before it booted
    client.releasePython(); // and the numpy one
    expect(client.getPythonStatus()).toBe("idle");
    await vi.advanceTimersByTimeAsync(client.PY_PACKAGES_BOOT_TIMEOUT_MS + 1000);
    expect(client.getPythonStatus()).toBe("idle");
    expect(client.getPythonFailure()).toBeNull();
  });

  it("keeps matplotlib figures in order with printed output", async () => {
    useFake();
    const seen: string[] = [];
    const p = client.runPython("plot", { packages: ["matplotlib"], onOutput: (c) => seen.push(c.stream) });
    await flush();
    const w = latest();
    w.print("before\n");
    w.emit({ type: "figure", ...w.tag, src: "data:image/png;base64,AAAA" });
    w.emit({ type: "figure", ...w.tag, src: "javascript:alert(1)" });
    w.print("after\n");
    w.finish();
    const r = await p;
    expect(r).toMatchObject({
      status: "ok",
      stdout: "before\nafter\n",
      output: [
        { stream: "stdout", text: "before\n" },
        { stream: "figure", text: "data:image/png;base64,AAAA" },
        { stream: "stdout", text: "after\n" },
      ],
    });
    expect(seen).toEqual(["stdout", "figure", "stdout"]);
  });

  it("returns stdout and the ok status for the run that was sent", async () => {
    useFake();
    const p = client.runPython("print(48)");
    await flush();
    const w = latest();
    expect(w.runs[0]).toMatchObject({ type: "run", code: "print(48)" });
    w.print("48\n");
    w.finish();
    const r = await p;
    expect(r).toMatchObject({ status: "ok", stdout: "48\n", output: [{ stream: "stdout", text: "48\n" }] });
  });

  it("uses every worker for one run only, then warms a new one", async () => {
    useFake();
    const p1 = client.runPython("a = 1");
    await flush();
    const first = latest();
    first.finish();
    await p1;
    expect(first.terminated).toBe(true);
    // A spare is already booting for the next run.
    expect(FakeWorker.instances).toHaveLength(2);
    const p2 = client.runPython("print(a)");
    await flush();
    const second = latest();
    expect(second).not.toBe(first);
    expect(FakeWorker.instances).toHaveLength(2);
    second.finish({ status: "runtime-error", type: "NameError", message: "name 'a' is not defined", line: 1, traceback: "t", durationMs: 1 });
    expect(await p2).toMatchObject({ status: "runtime-error", error: { type: "NameError", line: 1 } });
  });

  it("passes supplied stdin to the worker (empty by default)", async () => {
    useFake();
    const p1 = client.runPython("input()", { stdin: "Ada\n" });
    await flush();
    expect(latest().runs[0].stdin).toBe("Ada\n");
    latest().finish();
    await p1;
    const p2 = client.runPython("input()");
    await flush();
    expect(latest().runs[0].stdin).toBe("");
    latest().finish();
    await p2;
  });

  it("ignores messages that belong to another run id", async () => {
    useFake();
    const p = client.runPython("x");
    await flush();
    const w = latest();
    w.emit({ type: "done", id: 999, result: { status: "ok" } });
    w.print("real\n");
    w.finish();
    expect(await p).toMatchObject({ status: "ok", stdout: "real\n" });
  });

  it("ignores messages without this run's nonce (forged from Python via js.postMessage)", async () => {
    useFake();
    const p = client.runPython("x");
    await flush();
    const w = latest();
    expect(w.runs[0].nonce).toMatch(/^[0-9a-f]{32}$/);
    w.emit({ type: "done", id: w.runs[0].id, result: { status: "ok", durationMs: 0, probe: { names: [], vars: {}, calls: {} } } });
    w.emit({ type: "done", id: w.runs[0].id, nonce: "0".repeat(32), result: { status: "ok", durationMs: 0 } });
    w.emit({ type: "overflow", id: w.runs[0].id, nonce: "forged" });
    w.finish({ status: "runtime-error", type: "NameError", message: "x", line: 1, traceback: "", durationMs: 0 });
    expect(await p).toMatchObject({ status: "runtime-error" });
  });

  it("every run gets a different nonce", async () => {
    useFake();
    const p1 = client.runPython("a");
    await flush();
    const n1 = latest().runs[0].nonce;
    latest().finish();
    await p1;
    const p2 = client.runPython("b");
    await flush();
    expect(latest().runs[0].nonce).not.toBe(n1);
    latest().finish();
    await p2;
  });

  it("passes the probe through and returns the probe result", async () => {
    useFake();
    const probe = { vars: ["total"], calls: [] };
    const p = client.runPython("total = 48", { probe });
    await flush();
    expect(latest().runs[0].probe).toEqual(probe);
    latest().finish({ status: "ok", durationMs: 1, probe: { names: ["total"], vars: { total: { value: { t: "int", v: "48" } } }, calls: {} } });
    expect(await p).toMatchObject({ status: "ok", probe: { vars: { total: { value: { t: "int", v: "48" } } } } });
  });

  it("a timeout reports which test input was running", async () => {
    vi.useFakeTimers();
    useFake();
    const p = client.runPython("def f(n):\n  while True: pass", { timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1);
    const w = latest();
    w.emit({ type: "case", ...w.tag, call: "f", index: 0 });
    w.emit({ type: "case", ...w.tag, call: "f", index: 2 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await p).toMatchObject({ status: "timeout", case: { call: "f", index: 2 } });
  });

  it("maps syntax errors with line and column", async () => {
    useFake();
    const p = client.runPython("print(");
    await flush();
    latest().finish({ status: "syntax-error", type: "SyntaxError", message: "'(' was never closed", line: 1, column: 6, text: "print(", durationMs: 0 });
    expect(await p).toMatchObject({ status: "syntax-error", error: { line: 1, column: 6, text: "print(" } });
  });

  it("times out a hung program, terminates its worker, keeps partial output", async () => {
    vi.useFakeTimers();
    useFake();
    const p = client.runPython("while True: pass", { timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(1);
    const w = latest();
    w.print("started\n");
    await vi.advanceTimersByTimeAsync(5000);
    const r = await p;
    expect(r).toMatchObject({ status: "timeout", limitMs: 5000, stdout: "started\n" });
    expect(w.terminated).toBe(true);
  });

  it("the run limit starts after boot, not before", async () => {
    vi.useFakeTimers();
    behaviour = { bootDelay: 8000 };
    useFake();
    const p = client.runPython("print(1)", { timeoutMs: 5000 });
    await vi.advanceTimersByTimeAsync(8001);
    const w = latest();
    expect(w.runs).toHaveLength(1);
    w.finish();
    expect(await p).toMatchObject({ status: "ok" });
  });

  it("Stop settles the run, terminates the worker and recovers", async () => {
    useFake();
    const p = client.runPython("while True: print(1)");
    await flush();
    const w = latest();
    w.print("1\n1\n");
    client.stopPython();
    expect(await p).toMatchObject({ status: "stopped", stdout: "1\n1\n" });
    expect(w.terminated).toBe(true);
    expect(client.pythonBusy()).toBe(false);
    const p2 = client.runPython("print(2)");
    await flush();
    latest().finish();
    expect(await p2).toMatchObject({ status: "ok" });
  });

  it("Stop works while Python is still loading", async () => {
    behaviour = { never: true };
    useFake();
    const p = client.runPython("print(1)");
    client.stopPython();
    expect(await p).toMatchObject({ status: "stopped" });
    expect(FakeWorker.instances[0].terminated).toBe(true);
  });

  it("output overflow terminates the run", async () => {
    useFake();
    const p = client.runPython("while True: print('x')", { outputLimit: 10 });
    await flush();
    const w = latest();
    expect(w.runs[0].outputLimit).toBe(10);
    w.print("xxxxxxxxxx");
    w.emit({ type: "overflow", ...w.tag });
    expect(await p).toMatchObject({ status: "output-limit", limit: 10, stdout: "xxxxxxxxxx" });
    expect(w.terminated).toBe(true);
  });

  it("a worker crash is reported and the next run uses a fresh worker", async () => {
    useFake();
    const p = client.runPython("boom");
    await flush();
    const w = latest();
    w.crash();
    expect(await p).toMatchObject({ status: "crashed" });
    const p2 = client.runPython("print(1)");
    await flush();
    expect(latest()).not.toBe(w);
    latest().finish();
    expect(await p2).toMatchObject({ status: "ok" });
  });

  it("a boot failure fails the run and a later run retries", async () => {
    behaviour = { bootFail: true };
    useFake();
    const r = await client.runPython("print(1)");
    expect(r).toMatchObject({ status: "crashed" });
    expect(client.getPythonStatus()).toBe("failed");
    behaviour = {};
    const p2 = client.runPython("print(1)");
    await flush();
    latest().finish();
    expect(await p2).toMatchObject({ status: "ok" });
  });

  it("a new run supersedes one still in flight", async () => {
    useFake();
    const p1 = client.runPython("slow");
    await flush();
    const w1 = latest();
    const p2 = client.runPython("fast");
    expect(await p1).toEqual({ status: "superseded" });
    expect(w1.terminated).toBe(true);
    await flush();
    latest().finish();
    expect(await p2).toMatchObject({ status: "ok" });
  });

  it("does nothing where the runner is not allowed", async () => {
    useFake(false);
    expect(await client.runPython("print(1)")).toMatchObject({ status: "unavailable" });
    client.preloadPython();
    expect(FakeWorker.instances).toHaveLength(0);
  });
});

describe("python runner gate", () => {
  it("is on in local development only; off on every Vercel deploy and production build", () => {
    expect(pythonRunnerEnabled({ nodeEnv: "development" })).toBe(true);
    expect(pythonRunnerEnabled({ nodeEnv: "production" })).toBe(false);
    expect(pythonRunnerEnabled({ nodeEnv: "production", flag: "1" })).toBe(false);
    expect(pythonRunnerEnabled({ nodeEnv: "production", vercelEnv: "production", flag: "1" })).toBe(false);
    expect(pythonRunnerEnabled({ nodeEnv: "development", vercelEnv: "production" })).toBe(false);
    expect(pythonRunnerEnabled({ nodeEnv: "development", vercelEnv: "preview", flag: "1" })).toBe(false);
  });
});

describe("pinned pyodide", () => {
  it("package, worker and copy script all name 314.0.7, and hashes match node_modules", async () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.dependencies.pyodide).toBe("314.0.7");
    const worker = readFileSync("public/vendor/python-worker.mjs", "utf8");
    expect(worker).toContain("./pyodide/314.0.7/pyodide.mjs");
    expect(worker).not.toMatch(/micropip/);
    // Packages load only from the same-origin indexURL, by name, from an allowlist that matches the copy script.
    const { PYODIDE_PACKAGES, resolvePackages } = await import("../scripts/copy-pyodide.mjs");
    const { PY_PACKAGES } = await import("@/engine/python/client");
    const sets = worker.match(/const PACKAGE_SETS = \{([\s\S]*?)\n\};/)![1];
    const named = [...sets.matchAll(/^ {2}"?([\w-]+)"?: \{ load: \[([^\]]*)\]/gm)];
    expect(named.map((m) => m[1]).sort()).toEqual([...PY_PACKAGES].sort());
    const loads = new Set(named.flatMap((m) => [...m[2].matchAll(/"([\w-]+)"/g)].map((x) => x[1])));
    expect([...loads].every((n) => (PYODIDE_PACKAGES as string[]).includes(n))).toBe(true);
    const lock = JSON.parse(readFileSync("node_modules/pyodide/pyodide-lock.json", "utf8"));
    for (const pkg of resolvePackages(lock) as { file_name: string; sha256: string }[]) {
      expect(createHash("sha256").update(readFileSync(`public/vendor/pyodide/314.0.7/${pkg.file_name}`)).digest("hex")).toBe(pkg.sha256);
    }
    const { PYODIDE_VERSION, PYODIDE_FILES } = await import("../scripts/copy-pyodide.mjs");
    expect(PYODIDE_VERSION).toBe("314.0.7");
    for (const [name, hash] of Object.entries(PYODIDE_FILES as Record<string, string>)) {
      expect(createHash("sha256").update(readFileSync(`node_modules/pyodide/${name}`)).digest("hex")).toBe(hash);
    }
  });
});
