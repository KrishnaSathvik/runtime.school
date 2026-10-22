/**
 * The isolated Python runner (docs/python/runner-isolation.md), presented to the client as a Worker.
 *
 * One hidden `<iframe sandbox="allow-scripts">` per interpreter: an opaque origin with a strict CSP, whose
 * bootstrap (/vendor/python-sandbox.mjs) starts the real worker and relays messages. Removing the iframe ends
 * its worker, so terminate() stops even a busy program. Only messages from this iframe are accepted; the run
 * nonce still guards against anything learner code forges inside it.
 */
export const PY_SANDBOX_URL = "/python-sandbox";

type Listener = (event: Event) => void;
type Envelope = { __pyRunner: true; data: unknown };

export type SandboxWorker = Pick<Worker, "postMessage" | "terminate" | "addEventListener" | "removeEventListener">;

export function createSandboxWorker(packages: string, doc: Document = document): SandboxWorker {
  const win = doc.defaultView!;
  const frame = doc.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("title", "Python runner");
  frame.tabIndex = -1;
  frame.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
  frame.src = `${PY_SANDBOX_URL}${packages ? `?packages=${encodeURIComponent(packages)}` : ""}`;

  const listeners: Record<"message" | "error", Set<Listener>> = { message: new Set(), error: new Set() };
  const queue: Envelope[] = [];
  let ready = false;
  let dead = false;

  const send = (env: Envelope) => frame.contentWindow?.postMessage(env, "*");
  const onWindowMessage = (e: MessageEvent) => {
    if (dead || !frame.contentWindow || e.source !== frame.contentWindow) return;
    const env = e.data as Partial<Envelope> | null;
    if (!env || env.__pyRunner !== true) return;
    const d = env.data as Record<string, unknown> | null;
    if (d && d.__runnerReady === true) {
      ready = true;
      queue.splice(0).forEach(send);
      return;
    }
    if (d && typeof d.__runnerError === "string") {
      const ev = new win.ErrorEvent("error", { message: d.__runnerError });
      listeners.error.forEach((f) => f(ev));
      return;
    }
    const ev = new win.MessageEvent("message", { data: d });
    listeners.message.forEach((f) => f(ev));
  };
  win.addEventListener("message", onWindowMessage);
  doc.body.appendChild(frame);

  const worker = {
    postMessage(message: unknown) {
      if (dead) return;
      const env: Envelope = { __pyRunner: true, data: message };
      if (ready) send(env);
      else queue.push(env);
    },
    terminate() {
      if (dead) return;
      dead = true;
      win.removeEventListener("message", onWindowMessage);
      frame.remove();
    },
    addEventListener(type: string, fn: Listener) {
      if (type === "message" || type === "error") listeners[type].add(fn);
    },
    removeEventListener(type: string, fn: Listener) {
      if (type === "message" || type === "error") listeners[type].delete(fn);
    },
  };
  return worker as unknown as SandboxWorker;
}
