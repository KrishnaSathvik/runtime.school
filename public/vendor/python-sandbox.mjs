// Runs inside the opaque-origin runner iframe (/python-sandbox). Starts one Python worker and relays
// messages between it and the page that embeds this frame. Only the embedding page can talk to it.
// See docs/python/runner-isolation.md.
const params = new URL(location.href).searchParams;
const packages = params.get("packages") ?? "";
const parentWindow = window.parent;
const send = (data, transfer) => parentWindow.postMessage({ __pyRunner: true, data }, "*", transfer);

// Workers can't be created from another origin's URL, and Chrome refuses blob:null worker URLs from an
// opaque origin, so a data: URL module imports the worker from the site.
// Relative to this file, so the worker (and Pyodide, relative to the worker) load from the same /runner/ path.
const workerUrl = new URL(`./python-worker.mjs${packages ? `?packages=${encodeURIComponent(packages)}` : ""}`, import.meta.url).href;
// A dynamic import, so a load failure comes back as a readable boot error instead of a bare worker error.
const loader = `import(${JSON.stringify(workerUrl)}).catch((e) => postMessage({ type: "boot-error", message: "could not load the Python worker: " + e }));`;
const worker = new Worker(`data:text/javascript,${encodeURIComponent(loader)}`, { type: "module", name: "runtime-python" });
worker.addEventListener("message", (e) => send(e.data));
worker.addEventListener("error", (e) => {
  e.preventDefault();
  send({ __runnerError: String(e.message ?? "worker error") });
});

addEventListener("message", (e) => {
  if (e.source !== parentWindow || !e.data || e.data.__pyRunner !== true) return;
  const msg = e.data.data;
  const transfer = [...(Array.isArray(msg?.mounts) ? msg.mounts : []), ...(Array.isArray(msg?.blobs) ? msg.blobs : [])].map((m) => m.bytes).filter((b) => b instanceof ArrayBuffer);
  worker.postMessage(msg, transfer);
});

send({ __runnerReady: true });
