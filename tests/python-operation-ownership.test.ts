// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as client from "@/engine/python/client";
import { Workbench } from "@/features/python/Workbench";

const editorHooks = vi.hoisted(() => ({ onRun: undefined as undefined | (() => void), onCheck: undefined as undefined | (() => void) }));
vi.mock("@/features/py/PyEditor", () => ({ PyEditor: (props: typeof editorHooks) => { Object.assign(editorHooks, props); return null; } }));
class WorkerStub {
  static all: WorkerStub[] = [];
  request?: { id: number; nonce: string };
  constructor() { WorkerStub.all.push(this); }
  emit(data: unknown) { for (const fn of this.listeners.get("message") ?? []) fn({ data } as MessageEvent); }
  listeners = new Map<string, Set<(e: MessageEvent) => void>>();
  terminated = false;
  postMessage(request: { id: number; nonce: string }) { this.request = request; }
  terminate() { this.terminated = true; }
  addEventListener(type: string, fn: (e: MessageEvent) => void) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type)!.add(fn); }
  removeEventListener(type: string, fn: (e: MessageEvent) => void) { this.listeners.get(type)?.delete(fn); }
}
let root: Root | undefined;
let host: HTMLDivElement;
const task = { checks: [{ kind: "output" as const, expected: "1\n" }] };
const button = (text: string) => [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === text)!;
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  WorkerStub.all = [];
  client.__setPythonWorkerFactory(() => new WorkerStub() as unknown as Worker);
  host = document.createElement("div"); document.body.append(host);
});
afterEach(async () => {
  await act(async () => { root?.unmount(); }); root = undefined;
  client.stopPython(); client.releasePython(); host.remove(); vi.clearAllTimers(); vi.useRealTimers();
});
async function mount(onChecked = vi.fn()) {
  await act(async () => { root = createRoot(host); root.render(createElement(Workbench, { label: "test", files: [{ name: "main.py", value: "print(1)" }], task, onChecked })); });
  return onChecked;
}

describe("owned Python operations", () => {
  it("an old owner's stop cannot cancel the newer operation", async () => {
    const a = Symbol("a"), b = Symbol("b");
    const run = client.runPython as (code: string, options: { operation: symbol }) => ReturnType<typeof client.runPython>;
    const stop = client.stopPython as (operation?: symbol) => void;
    const first = run("a", { operation: a });
    const second = run("b", { operation: b });
    expect(await first).toEqual({ status: "superseded" });
    stop(a);
    expect(client.pythonBusy()).toBe(true);
    stop(b);
    expect((await second).status).toBe("stopped");
  });
  it("a superseded Workbench recovers controls and explains interruption", async () => {
    const checked = await mount();
    await act(async () => { button("Run").click(); });
    let other!: ReturnType<typeof client.runPython>;
    await act(async () => { other = client.runPython("example"); });
    expect(button("Run")?.disabled).toBe(false);
    expect(button("Check").disabled).toBe(false);
    expect(host.textContent).toMatch(/another program.*stopped/i);
    expect(checked).not.toHaveBeenCalled();
    await act(async () => { client.stopPython(); await other; });
  });
  it("Check offers Stop during preparation and never awards interrupted credit", async () => {
    const checked = await mount();
    await act(async () => { button("Check").click(); });
    expect(button("Stop")).toBeDefined();
    await act(async () => { button("Stop").click(); });
    expect(button("Run")?.disabled).toBe(false);
    expect(checked).not.toHaveBeenCalled();
  });
  it("guards repeated same-tick keyboard commands and accepts a genuine passing check", async () => {
    const checked = await mount();
    const worker = WorkerStub.all[0];
    await act(async () => { worker.emit({ type: "ready", version: "test" }); });
    await act(async () => { editorHooks.onCheck!(); editorHooks.onCheck!(); editorHooks.onRun!(); });
    expect(WorkerStub.all).toHaveLength(1);
    expect(worker.request).toBeDefined();
    await act(async () => {
      worker.emit({ ...worker.request, type: "output", stream: "stdout", text: "1\n" });
      worker.emit({ ...worker.request, type: "done", result: { status: "ok", durationMs: 1 } });
    });
    expect(checked).toHaveBeenCalledOnce();
    expect(checked.mock.calls[0][0].ok).toBe(true);
    expect(button("Run").disabled).toBe(false);
  });
  it("unmount stops its preparation but does not stop another owner's run", async () => {
    await mount();
    await act(async () => { button("Run").click(); root!.unmount(); }); root = undefined;
    expect(client.pythonBusy()).toBe(false);
    await mount();
    await act(async () => { button("Run").click(); });
    let other!: ReturnType<typeof client.runPython>;
    await act(async () => { other = client.runPython("other"); root!.unmount(); }); root = undefined;
    expect(client.pythonBusy()).toBe(true);
    await act(async () => { client.stopPython(); await other; });
  });
});
