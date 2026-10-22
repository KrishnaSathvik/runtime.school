// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createSandboxWorker, PY_SANDBOX_URL } from "@/engine/python/sandbox";
import { sandboxPolicy } from "@/platform/python-sandbox";

/** Deliver a message to the page as if the runner iframe (or another window) sent it. */
function fromWindow(source: Window | null, data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data, source }));
}

describe("sandbox runner adapter", () => {
  it("starts an opaque-origin iframe for the package set", () => {
    const w = createSandboxWorker("numpy,pandas");
    const frame = document.querySelector("iframe")!;
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    expect(frame.getAttribute("src")).toBe(`${PY_SANDBOX_URL}?packages=numpy%2Cpandas`);
    w.terminate();
  });

  it("queues messages until the runner is ready, then relays both ways", () => {
    const w = createSandboxWorker("");
    const frame = document.querySelectorAll("iframe")[0];
    const sent: unknown[] = [];
    frame.contentWindow!.postMessage = ((m: unknown) => sent.push(m)) as Window["postMessage"];
    w.postMessage({ type: "run", id: 1 });
    expect(sent).toEqual([]);
    fromWindow(frame.contentWindow, { __pyRunner: true, data: { __runnerReady: true } });
    expect(sent).toEqual([{ __pyRunner: true, data: { type: "run", id: 1 } }]);

    const got: unknown[] = [];
    w.addEventListener("message", (e: Event) => got.push((e as MessageEvent).data));
    fromWindow(frame.contentWindow, { __pyRunner: true, data: { type: "ready", version: "314.0.7" } });
    expect(got).toEqual([{ type: "ready", version: "314.0.7" }]);
    w.terminate();
  });

  it("ignores messages from any other window and unwrapped messages", () => {
    const w = createSandboxWorker("");
    const frame = document.querySelectorAll("iframe")[0];
    const got: unknown[] = [];
    w.addEventListener("message", (e: Event) => got.push((e as MessageEvent).data));
    fromWindow(window, { __pyRunner: true, data: { type: "done", forged: true } });
    fromWindow(frame.contentWindow, { type: "done", unwrapped: true });
    expect(got).toEqual([]);
    w.terminate();
  });

  it("reports runner errors as error events and stops for good on terminate", () => {
    const w = createSandboxWorker("");
    const frame = document.querySelectorAll("iframe")[0];
    const errors: string[] = [];
    const got: unknown[] = [];
    w.addEventListener("error", (e: Event) => errors.push((e as ErrorEvent).message));
    w.addEventListener("message", (e: Event) => got.push((e as MessageEvent).data));
    const source = frame.contentWindow;
    fromWindow(source, { __pyRunner: true, data: { __runnerError: "worker error" } });
    expect(errors).toEqual(["worker error"]);
    w.terminate();
    expect(document.querySelectorAll("iframe")).toHaveLength(0);
    fromWindow(source, { __pyRunner: true, data: { type: "done" } });
    expect(got).toEqual([]);
  });
});

describe("sandbox CSP", () => {
  const policy = sandboxPolicy("https://example.test");
  it("is an opaque origin with no string-to-code and network only to the Pyodide folder", () => {
    expect(policy).toContain("sandbox allow-scripts");
    expect(policy).not.toContain("allow-same-origin");
    expect(policy).toContain("default-src 'none'");
    expect(policy).toContain("connect-src https://example.test/runner/pyodide/314.0.7/;");
    expect(policy).not.toMatch(/'unsafe-eval'|'unsafe-inline'/);
  });
});
