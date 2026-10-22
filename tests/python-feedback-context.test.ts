// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Workbench } from "@/features/python/Workbench";
import { HelpButtons, HelpPanel } from "@/features/python/Help";
import type { PyRunResult } from "@/engine/python/client";
const mocks = vi.hoisted(() => ({ run: vi.fn(), editors: new Map<string, { errorLine?: unknown }>() }));
vi.mock("@/engine/python/client", () => ({ getPythonStatus: () => "idle", subscribePythonStatus: () => () => {}, preloadPython: () => {}, preloadMounts: () => {}, stopPython: () => {}, runPython: mocks.run }));
vi.mock("@/features/py/PyEditor", () => ({ PyEditor: (props: { label: string; errorLine?: unknown }) => { mocks.editors.set(props.label, props); return null; } }));
vi.mock("@/features/rt/HelpDialog", () => ({ HelpDialog: () => null }));
let host: HTMLDivElement, root: Root;
const button = (name: string) => [...host.querySelectorAll("button")].find(b => b.textContent?.trim() === name)!;
const task = { checks: [{ kind: "output" as const, expected: "ok\n" }] };
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.run.mockReset(); mocks.editors.clear();
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const ok: PyRunResult = { status: "ok", stdout: "ok\n", stderr: "", output: [], durationMs: 1 };
async function render(helper = "x = 1", stdin = "", checked = vi.fn()) {
  await act(async () => root.render(createElement(Workbench, { label: "test", task, stdin, onChecked: checked, files: [{ name: "main.py", value: "print('ok')" }, { name: "helper.py", value: helper }] })));
}
describe("Python result provenance", () => {
  it("helper and input edits label prior checks without deleting a successful report", async () => {
    const checked = vi.fn(); mocks.run.mockResolvedValue(ok);
    await render("x = 1", "", checked);
    await act(async () => button("Check").click());
    expect(checked).toHaveBeenCalledOnce();
    await render("x = 2", "", checked);
    expect(host.textContent).toContain("Previous check — code changed");
    expect(host.textContent).toMatch(/The check passes/);
    await render("x = 1", "input changed", checked);
    expect(host.textContent).toContain("Previous check — code changed");
    await render("x = 1", "", checked);
    expect(host.textContent).not.toContain("Previous check — code changed");
    expect(checked).toHaveBeenCalledOnce();
  });
  it("late error from older files has no navigation or editor mark on current source", async () => {
    let finish!: (r: PyRunResult) => void;
    mocks.run.mockReturnValue(new Promise<PyRunResult>(resolve => { finish = resolve; }));
    await render(); await act(async () => button("Run").click());
    await render("x = 2");
    await act(async () => finish({ status: "runtime-error", stdout: "", stderr: "", output: [], durationMs: 1, error: { type: "ValueError", message: "old error", line: 1, file: "helper.py", traceback: "old traceback" } }));
    expect(host.textContent).toContain("Previous run — code changed");
    expect(host.querySelector('button[aria-label="Go to line 1"]')).toBeNull();
    expect(mocks.editors.get("test: helper.py")?.errorLine).toBeNull();
  });
  it("new help receives focus, but restored help does not steal focus", async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(cb => { frames.push(cb); return frames.length; });
    Element.prototype.scrollIntoView = vi.fn();
    const panel = (shown: number) => createElement(HelpPanel, { hints: ["Try this"], shown, revealed: false, answer: "answer", assisted: true });
    await act(async () => root.render(panel(0)));
    await act(async () => root.render(panel(1))); // hydration/cross-tab update has no user intent
    expect(frames).toHaveLength(0);
    function HelpHarness() {
      const [shown, setShown] = useState(0);
      return createElement("section", { className: "p2-work" }, createElement(HelpButtons, { hintsShown: shown, hintCount: 1, revealed: false, onHint: () => setShown(1) }), panel(shown));
    }
    await act(async () => root.render(createElement(HelpHarness)));
    await act(async () => button("Hint").click());
    expect(frames).toHaveLength(1);
    await act(async () => frames.pop()!(0));
    expect(host.querySelector('.p2-help')).toBe(document.activeElement);
  });
});
