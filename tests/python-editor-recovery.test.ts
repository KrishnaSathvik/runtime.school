// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { undo } from "@codemirror/commands";
import { Workbench } from "@/features/python/Workbench";
import { ConsoleView, errorFileOf } from "@/features/python/Results";
import type { PyRunResult } from "@/engine/python/client";
vi.mock("@/engine/python/client", () => ({ getPythonStatus: () => "idle", subscribePythonStatus: () => () => {}, preloadPython: () => {}, preloadMounts: () => {}, stopPython: () => {}, runPython: vi.fn() }));
let host: HTMLDivElement, root: Root;
const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!;
const view = (name: string) => EditorView.findFromDOM(host.querySelector(`[aria-label="test: ${name}"]`) as HTMLElement)!;
function Harness() {
  const [files, setFiles] = useState({ "main.py": "print('main')", "helper.py": "first\nsecond" });
  const [reset, setReset] = useState(0);
  return createElement(Workbench, { label: "test", files: Object.entries(files).map(([name, value]) => ({ name, value, onChange: (text: string) => setFiles(prev => ({ ...prev, [name]: text })) })), resetFiles: { "main.py": "", "helper.py": "" }, resetVersion: reset, onReset: () => setReset(n => n + 1) });
}
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
describe("active editor recovery", () => {
  it("Reset is undoable, preserving previous selection and file-switch history", async () => {
    await act(async () => root.render(createElement(Harness)));
    const main = view("main.py");
    await act(async () => { main.dispatch({ changes: { from: 0, to: main.state.doc.length, insert: "unique draft" }, selection: { anchor: 2, head: 6 } }); });
    await act(async () => button("Reset").click());
    expect(main.state.doc.toString()).toBe("");
    await act(async () => { undo(main); });
    expect(main.state.doc.toString()).toBe("unique draft");
    expect(main.state.selection.main.anchor).toBe(2);
    expect(main.state.selection.main.head).toBe(6);
    await act(async () => button("helper.py").click());
    const helper = view("helper.py");
    await act(async () => { helper.dispatch({ changes: { from: 0, to: helper.state.doc.length, insert: "changed helper" }, selection: { anchor: 3 } }); });
    await act(async () => button("main.py").click());
    await act(async () => button("helper.py").click());
    expect(view("helper.py")).toBe(helper);
    expect(helper.state.selection.main.head).toBe(3);
    await act(async () => { undo(helper); });
    expect(helper.state.doc.toString()).toBe("");
  });
  it("Undo Reset restores every editable file", async () => {
    await act(async () => root.render(createElement(Harness)));
    await act(async () => button("Reset").click());
    await act(async () => button("Undo Reset").click());
    expect(view("main.py").state.doc.toString()).toBe("print('main')");
    expect(view("helper.py").state.doc.toString()).toBe("first\nsecond");
  });
  it("runtime error line links carry the actual helper filename", async () => {
    const onLine = vi.fn();
    const result: PyRunResult = { status: "runtime-error", stdout: "", stderr: "", output: [], durationMs: 1, error: { type: "ValueError", message: "bad", line: 2, file: "helper.py", traceback: 'File "main.py", line 1\nFile "helper.py", line 2' } };
    await act(async () => root.render(createElement(ConsoleView, { live: [], result, busy: false, onLine })));
    await act(async () => button("line 2").click());
    expect(onLine).toHaveBeenCalledWith(2, "helper.py");
    expect(errorFileOf(result)).toBe("helper.py");
  });
});
