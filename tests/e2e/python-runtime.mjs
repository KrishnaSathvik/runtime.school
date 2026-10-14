// Milestone 1 — Python execution foundation, against real Pyodide 314.0.7 in real browsers.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-runtime.mjs
// Optional: BROWSERS=chromium,firefox,webkit (default all three).
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3041";
const ENGINES = { chromium, firefox, webkit };
const BROWSERS = (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",");
const results = [];

async function open(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`${BASE}/python/runtime`);
  return { page, context, requests };
}

const status = (page) => page.getByTestId("py-status").innerText();
const waitReady = (page, timeout = 60000) =>
  page.waitForFunction(() => /status: ready/.test(document.querySelector('[data-testid="py-status"]')?.textContent ?? ""), null, { timeout });

async function run(page, code, { stop } = {}) {
  await page.getByLabel("main.py").fill(code);
  await page.getByRole("button", { name: "Run code" }).click();
  if (stop) {
    await page.waitForFunction(() => /status: running/.test(document.querySelector('[data-testid="py-status"]')?.textContent ?? ""));
    await page.waitForTimeout(stop);
    await page.getByRole("button", { name: "Stop" }).click();
  }
  await page.waitForFunction(() => document.querySelector('[data-testid="py-result"]')?.textContent, null, { timeout: 30000 });
  const result = JSON.parse(await page.getByTestId("py-result").innerText());
  const consoleText = await page.getByTestId("py-console").innerText();
  return { result, console: consoleText };
}

async function test(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (err) {
    results.push(`✕ ${name}\n    ${String(err?.message ?? err).split("\n").slice(0, 6).join("\n    ")}`);
    process.exitCode = 1;
  }
}

for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  results.push(`\n[${name}]`);
  const { page, context, requests } = await open(browser);
  try {
    await test("cold load reaches ready with pinned 314.0.7, all files self-hosted", async () => {
      const t = Date.now();
      await waitReady(page);
      results.push(`    cold boot ${Date.now() - t} ms`);
      assert.match(await status(page), /pyodide 314\.0\.7/);
      const py = requests.filter((u) => /pyodide|python/i.test(new URL(u).pathname));
      assert.ok(py.length >= 4, py.join("\n"));
      for (const u of py) assert.ok(u.startsWith(BASE), `not self-hosted: ${u}`);
      assert.ok(py.some((u) => u.endsWith("/vendor/pyodide/314.0.7/pyodide.asm.wasm")));
      assert.ok(!py.some((u) => /\.whl|micropip|cdn\.jsdelivr/.test(u)), "no packages are loaded");
    });

    await test("print produces real stdout", async () => {
      const { result, console } = await run(page, "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\n");
      assert.equal(result.status, "ok");
      assert.equal(console.trim(), "48");
    });

    await test("warm run after a run is fast (spare interpreter)", async () => {
      await waitReady(page);
      const t = Date.now();
      const { result } = await run(page, "print('again')");
      assert.equal(result.status, "ok");
      results.push(`    warm run round-trip ${Date.now() - t} ms`);
    });

    await test("stdout and stderr are kept apart", async () => {
      const { result } = await run(page, "import sys\nprint('out')\nprint('err', file=sys.stderr)\n");
      assert.equal(result.status, "ok");
      assert.equal(await page.locator('[data-stream="stderr"]').innerText(), "err\n");
      assert.equal(await page.locator('[data-stream="stdout"]').innerText(), "out\n");
    });

    await test("syntax error reports Python's message, line and column", async () => {
      const { result } = await run(page, "x = 1\nprint(x\n");
      assert.equal(result.status, "syntax-error");
      assert.equal(result.error.type, "SyntaxError");
      assert.equal(result.error.line, 2);
      assert.match(result.error.message, /never closed/);
      assert.equal(result.error.text, "print(x");
    });

    await test("indentation error is a syntax error with its own type", async () => {
      const { result } = await run(page, "if True:\nprint(1)\n");
      assert.equal(result.status, "syntax-error");
      assert.equal(result.error.type, "IndentationError");
      assert.equal(result.error.line, 2);
    });

    await test("runtime exception: type, message, user line, traceback without harness frames", async () => {
      const { result, console } = await run(page, "print('before')\ndef f(n):\n    return 10 / n\nf(0)\n");
      assert.equal(result.status, "runtime-error");
      assert.equal(result.error.type, "ZeroDivisionError");
      assert.equal(result.error.message, "division by zero");
      assert.equal(result.error.line, 3);
      assert.match(result.error.traceback, /File "main\.py", line 4, in <module>/);
      assert.match(result.error.traceback, /return 10 \/ n/);
      assert.doesNotMatch(result.error.traceback, /<exec>|harness|_pyodide|pyodide\//);
      assert.equal(console.trim(), "before", "output before the error is kept");
    });

    await test("NameError explains the missing name", async () => {
      const { result } = await run(page, "print(totl)\n");
      assert.equal(result.error.type, "NameError");
      assert.match(result.error.message, /totl/);
    });

    await test("deep recursion is a RecursionError, not a crash", async () => {
      const { result } = await run(page, "def f():\n    return f()\nf()\n");
      assert.equal(result.status, "runtime-error");
      assert.equal(result.error.type, "RecursionError");
    });

    await test("input() with no stdin raises EOFError instead of hanging", async () => {
      const { result } = await run(page, "name = input('name? ')\n");
      assert.equal(result.status, "runtime-error");
      assert.equal(result.error.type, "EOFError");
      assert.equal(result.error.line, 1);
    });

    await test("exit() ends the program normally", async () => {
      const { result, console } = await run(page, "print('a')\nexit()\nprint('b')\n");
      assert.equal(result.status, "ok");
      assert.equal(console.trim(), "a");
    });

    await test("infinite loop hits the 5 s limit, then Python runs again", async () => {
      await waitReady(page);
      const t = Date.now();
      const { result } = await run(page, "while True:\n    pass\n");
      assert.equal(result.status, "timeout");
      assert.equal(result.limitMs, 5000);
      assert.ok(Date.now() - t < 9000);
      const after = await run(page, "print('recovered')");
      assert.equal(after.result.status, "ok");
      assert.equal(after.console.trim(), "recovered");
    });

    await test("Stop ends a running loop, keeps its output, and Python runs again", async () => {
      const { result, console } = await run(page, "import time\nfor i in range(100):\n    print(i)\n    time.sleep(0.2)\n", { stop: 900 });
      assert.equal(result.status, "stopped");
      assert.match(console, /^0\n/);
      const after = await run(page, "print('after stop')");
      assert.equal(after.console.trim(), "after stop");
    });

    await test("output flood is cut at the limit and the run ends", async () => {
      await waitReady(page);
      const t = Date.now();
      const { result, console } = await run(page, "while True:\n    print('x' * 100)\n");
      assert.equal(result.status, "output-limit");
      assert.ok(console.length <= 50000, String(console.length));
      assert.ok(Date.now() - t < 5000, "ends before the time limit");
    });

    await test("the UI stays responsive while Python is busy", async () => {
      await page.getByLabel("main.py").fill("while True:\n    pass\n");
      await page.getByRole("button", { name: "Run code" }).click();
      await page.waitForFunction(() => /status: running/.test(document.querySelector('[data-testid="py-status"]')?.textContent ?? ""));
      const t = Date.now();
      const ticks = await page.evaluate(() => new Promise((r) => { let n = 0; const id = setInterval(() => n++, 50); setTimeout(() => { clearInterval(id); r(n); }, 1000); }));
      assert.ok(ticks >= 12, `main thread blocked: ${ticks} ticks`);
      await page.getByRole("button", { name: "Stop" }).click();
      results.push(`    main-thread timer ticks during busy loop: ${ticks}/20 in ${Date.now() - t} ms`);
    });

    await test("attempts are isolated: modules, builtins, sys, files, env, globals", async () => {
      const contaminate = [
        "import math, builtins, sys, os, types",
        "math.pi = 3",
        "builtins.len = lambda x: -1",
        "builtins.print_was_here = True",
        "sys.modules['planted'] = types.ModuleType('planted')",
        "sys.path.append('/planted')",
        "sys.setrecursionlimit(77)",
        "os.environ['PLANTED'] = '1'",
        "open('/home/pyodide/planted.txt', 'w').write('x')",
        "os.makedirs('/tmp/planted', exist_ok=True)",
        "secret = 42",
        "import json; json.dumps = lambda *a, **k: 'patched'",
        "print('contaminated')",
      ].join("\n");
      const a = await run(page, contaminate);
      assert.equal(a.result.status, "ok", JSON.stringify(a.result));
      const check = [
        "import math, builtins, sys, os, json",
        "problems = []",
        "if math.pi == 3: problems.append('math.pi')",
        "if len([1, 2]) != 2: problems.append('builtins.len')",
        "if hasattr(builtins, 'print_was_here'): problems.append('builtins attr')",
        "if 'planted' in sys.modules: problems.append('sys.modules')",
        "if '/planted' in sys.path: problems.append('sys.path')",
        "if sys.getrecursionlimit() == 77: problems.append('recursionlimit')",
        "if 'PLANTED' in os.environ: problems.append('environ')",
        "if os.path.exists('/home/pyodide/planted.txt'): problems.append('file')",
        "if os.path.exists('/tmp/planted'): problems.append('dir')",
        "if 'secret' in globals(): problems.append('globals')",
        "if json.dumps(1) != '1': problems.append('json')",
        "print('clean' if not problems else 'DIRTY ' + ','.join(problems))",
      ].join("\n");
      const b = await run(page, check);
      assert.equal(b.result.status, "ok", JSON.stringify(b.result));
      assert.equal(b.console.trim(), "clean");
    });

    await test("unicode output survives the stream decoder", async () => {
      const { console } = await run(page, "print('héllo — ✓ 你好 🐍')");
      assert.equal(console.trim(), "héllo — ✓ 你好 🐍");
    });

    await test("record what learner code can reach through the JS bridge (security note)", async () => {
      const { result, console } = await run(page, [
        "import js",
        "print('fetch', hasattr(js, 'fetch'))",
        "print('indexedDB', hasattr(js, 'indexedDB'))",
        "print('localStorage', hasattr(js, 'localStorage'))",
        "print('document', hasattr(js, 'document'))",
        "print('origin', js.location.origin)",
      ].join("\n"));
      assert.equal(result.status, "ok");
      results.push("    bridge: " + console.trim().split("\n").join(" · "));
    });

    await test("Python pages never touch sql-studio-v1", async () => {
      const page2 = await context.newPage();
      await page2.goto(`${BASE}/python/runtime`);
      const before = await page2.evaluate(() => localStorage.getItem("sql-studio-v1"));
      await page2.waitForFunction(() => /status: ready/.test(document.querySelector('[data-testid="py-status"]')?.textContent ?? ""), null, { timeout: 60000 });
      await run(page2, "print(1)");
      const after = await page2.evaluate(() => localStorage.getItem("sql-studio-v1"));
      assert.equal(after, before);
      await page2.close();
    });
  } finally {
    await context.close();
  }

  await test("SQL pages never download Python", async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    const urls = [];
    p.on("request", (r) => urls.push(r.url()));
    for (const path of ["/", "/sql", "/sql/lesson/1", "/sql/playground"]) {
      await p.goto(`${BASE}${path}`);
      await p.waitForLoadState("networkidle");
    }
    const py = urls.filter((u) => /pyodide|python-worker/.test(u));
    assert.deepEqual(py, []);
    await ctx.close();
  });

  await browser.close();
}

console.log(results.join("\n"));
