// Milestone 3 — Python workspace, driven through the real UI against real Pyodide.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-workspace.mjs
// Optional: BROWSERS=chromium,firefox,webkit (default all three; extended checks run in Chromium).
// Optional: BASELINE=http://localhost:3044 — a server running the previous commit, to prove the SQL shell is unchanged.
// Optional: SHOTS=docs/python/screens/m3 — where screenshots are written.
import { chromium, firefox, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3041";
const BASELINE = process.env.BASELINE;
const SHOTS = process.env.SHOTS ?? "docs/python/screens/m3";
const ENGINES = { chromium, firefox, webkit };
const BROWSERS = (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",");
const results = [];
fs.mkdirSync(SHOTS, { recursive: true });

const MOD = process.platform === "darwin" ? "Meta" : "Control";
const CORRECT = "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\n";

async function test(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (err) {
    results.push(`✕ ${name}\n    ${String(err?.message ?? err).split("\n").slice(0, 8).join("\n    ")}`);
    process.exitCode = 1;
  }
}

const editor = (p) => p.locator(".py-editor .cm-content");
const code = (p) => p.evaluate(() => [...document.querySelectorAll(".py-editor .cm-line")].map((l) => l.textContent).join("\n"));
async function setCode(p, text) {
  await editor(p).click();
  await p.keyboard.press(`${MOD}+a`);
  await p.keyboard.press("Delete");
  if (text) await p.keyboard.insertText(text);
}
const waitReady = (p) => p.waitForFunction(() => /Python ready/.test(document.querySelector(".py-state")?.textContent ?? ""), null, { timeout: 60000 });
const idle = (p) => p.waitForFunction(() => !document.querySelector(".py-state.busy") || /Preparing|Loading/.test(document.querySelector(".py-state")?.textContent ?? ""), null, { timeout: 30000 })
  .then(() => p.getByRole("button", { name: "Run code" }).waitFor({ timeout: 30000 }));
const consoleText = (p) => p.locator("#py-panel-console .py-stream").innerText().catch(() => "");
async function runCode(p) {
  await p.getByRole("button", { name: "Run code" }).click();
  await p.locator("#py-panel-console .py-meta:not(:text('running…')), #py-panel-console .py-err").first().waitFor({ timeout: 30000 });
}
async function checkAnswer(p) {
  await p.getByRole("button", { name: "Check answer" }).click();
  await p.locator(".py-verdict").waitFor({ timeout: 30000 });
  await idle(p);
}
async function openWorkspace(browser, opts = {}) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`${BASE}/python/workspace`);
  return { context, page, requests };
}

for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  const full = name === "chromium";
  results.push(`\n[${name}]`);
  const { context, page } = await openWorkspace(browser, { viewport: { width: 1440, height: 900 } });
  try {
    await test("loading state, then ready", async () => {
      assert.match(await page.locator(".py-state").innerText(), /Loading Python|Python ready/);
      await waitReady(page);
      assert.equal(await page.getByRole("button", { name: "Check answer" }).isEnabled(), true);
    });

    await test("Run executes the editor's Python and shows real stdout", async () => {
      await setCode(page, CORRECT);
      await runCode(page);
      assert.equal((await consoleText(page)).trim(), "48");
      assert.match(await page.locator("#py-panel-console").innerText(), /Program finished\./);
      assert.equal(await page.getByRole("tab", { name: /Console/ }).getAttribute("aria-selected"), "true");
    });

    await test("stdout and stderr are shown apart", async () => {
      await idle(page);
      await setCode(page, "import sys\nprint('to stdout')\nprint('to stderr', file=sys.stderr)\n");
      await runCode(page);
      assert.equal((await page.locator("#py-panel-console .py-stream .stdout").innerText()).trim(), "to stdout");
      assert.equal((await page.locator("#py-panel-console .py-stream .stderr").innerText()).trim(), "to stderr");
    });

    await test("syntax error: message, caret, line link, highlighted line; code kept", async () => {
      await idle(page);
      const broken = "price = 12\nprint(price\n";
      await setCode(page, broken);
      await runCode(page);
      const err = page.locator("#py-panel-console .py-err");
      assert.match(await err.innerText(), /SyntaxError: '\(' was never closed/);
      assert.match(await err.innerText(), /print\(price\n\s*\^/);
      assert.equal(await page.locator(".cm-py-error-line").count(), 1);
      assert.match(await page.locator(".cm-py-error-line").innerText(), /print\(price/);
      await err.getByRole("button", { name: "line 2" }).click();
      assert.equal(await page.locator(".cm-activeLineGutter").innerText(), "2");
      assert.equal(await code(page), broken);
    });

    await test("runtime error: traceback limited to main.py, output before it kept", async () => {
      await idle(page);
      await setCode(page, "print('start')\ndef share(total, people):\n    return total / people\nshare(48, 0)\n");
      await runCode(page);
      const text = await page.locator("#py-panel-console").innerText();
      assert.match(text, /start/);
      assert.match(text, /ZeroDivisionError: division by zero/);
      assert.match(text, /File "main\.py", line 4, in <module>/);
      assert.match(await page.locator(".cm-py-error-line").innerText(), /return total \/ people/);
    });

    await test("editing clears the error highlight", async () => {
      await editor(page).click();
      await page.keyboard.press("End");
      await page.keyboard.type(" ");
      assert.equal(await page.locator(".cm-py-error-line").count(), 0);
      assert.match(await page.locator("#py-panel-console").innerText(), /edited the code since this run/);
    });

    await test("Check shows real grading in the Checks tab, separate from the Console", async () => {
      await idle(page);
      await setCode(page, "price = 12\nquantity = 3\nTotal = price * quantity\nprint(Total)\n");
      await checkAnswer(page);
      assert.equal(await page.getByRole("tab", { name: /Checks/ }).getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#py-panel-console").isHidden(), true);
      const checks = await page.locator("#py-panel-checks").innerText();
      assert.match(checks, /1 of 4 checks passed/);
      assert.match(checks, /quantity is 3, but it should be 4/);
      assert.match(checks, /There is no variable named total\. You defined Total/);
      assert.match(checks, /Line 1: expected "48", but your program printed "36"/);
      assert.match(await page.getByRole("tab", { name: /Checks/ }).innerText(), /1\/4/);
      await setCode(page, CORRECT);
      await checkAnswer(page);
      assert.match(await page.locator(".py-verdict").innerText(), /✓ All 4 checks passed/);
      assert.match(await page.getByRole("tab", { name: /Checks/ }).innerText(), /4\/4/);
    });

    await test("Console keeps the last Run; Checks keeps the last Check", async () => {
      await page.getByRole("tab", { name: /Console/ }).click();
      assert.match(await page.locator("#py-panel-console").innerText(), /ZeroDivisionError|edited/);
      await page.getByRole("tab", { name: /Checks/ }).click();
      assert.match(await page.locator("#py-panel-checks").innerText(), /All 4 checks passed/);
    });

    await test("keyboard: Mod+Enter runs, Shift+Mod+Enter checks", async () => {
      await idle(page);
      await setCode(page, "print('via keyboard')\n");
      await page.keyboard.press(`${MOD}+Enter`);
      await page.locator("#py-panel-console .py-meta.ok").waitFor({ timeout: 30000 });
      assert.equal((await consoleText(page)).trim(), "via keyboard");
      await idle(page);
      await setCode(page, CORRECT);
      await page.keyboard.press(`Shift+${MOD}+Enter`);
      await page.locator(".py-verdict").waitFor({ timeout: 30000 });
      assert.match(await page.locator(".py-verdict").innerText(), /All 4 checks passed/);
    });

    await test("infinite loop: Stop ends it, then Run works again", async () => {
      await idle(page);
      await setCode(page, "n = 0\nwhile True:\n    n += 1\n");
      await page.getByRole("button", { name: "Run code" }).click();
      await page.getByRole("button", { name: "Stop" }).waitFor();
      assert.equal(await page.getByRole("button", { name: /Check/ }).isDisabled(), true);
      await page.waitForTimeout(800);
      await page.getByRole("button", { name: "Stop" }).click();
      await page.locator("#py-panel-console", { hasText: "You stopped the program" }).waitFor({ timeout: 10000 });
      assert.equal(await code(page), "n = 0\nwhile True:\n    n += 1\n", "the code is untouched");
      await idle(page);
      await setCode(page, "print('after stop')\n");
      await runCode(page);
      assert.equal((await consoleText(page)).trim(), "after stop");
    });

    await test("timeout after 5 s is explained, and Python recovers", async () => {
      await idle(page);
      await waitReady(page);
      await setCode(page, "while True:\n    pass\n");
      await page.getByRole("button", { name: "Run code" }).click();
      await page.locator("#py-panel-console", { hasText: "Stopped after 5 seconds" }).waitFor({ timeout: 20000 });
      await idle(page);
      await setCode(page, "print('recovered')\n");
      await runCode(page);
      assert.equal((await consoleText(page)).trim(), "recovered");
    });

    await test("Stop during Check never shows a pass", async () => {
      await idle(page);
      await waitReady(page);
      await setCode(page, CORRECT + "while True:\n    pass\n");
      await page.getByRole("button", { name: "Check answer" }).click();
      await page.getByRole("button", { name: "Stop" }).waitFor();
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: "Stop" }).click();
      await page.locator(".py-verdict").waitFor({ timeout: 10000 });
      assert.doesNotMatch(await page.locator(".py-verdict").innerText(), /All .* checks passed/);
      assert.match(await page.locator("#py-panel-checks").innerText(), /stopped before it finished/);
    });

    await test("Reset restores the starter with Undo; other exercise's draft untouched", async () => {
      await idle(page);
      await page.getByRole("button", { name: /2\. A reusable total/ }).click();
      await setCode(page, "def calculate_total(price, quantity):\n    return price * quantity\n");
      const second = await code(page);
      await page.getByRole("button", { name: /1\. Notebook order total/ }).click();
      await setCode(page, "x = 'my work'\n");
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      assert.equal(await code(page), "# Notebooks cost 12 dollars each.\nprice = \n");
      assert.equal(await page.getByRole("button", { name: "Undo reset" }).isVisible(), true);
      await page.getByRole("button", { name: "Undo reset" }).click();
      assert.equal(await code(page), "x = 'my work'\n");
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      assert.equal(await page.getByRole("button", { name: "Reset", exact: true }).isVisible(), false, "Undo replaces Reset until the next edit");
      await page.getByRole("button", { name: /2\. A reusable total/ }).click();
      assert.equal(await code(page), second);
      await page.getByRole("button", { name: /1\. Notebook order total/ }).click();
      assert.equal(await page.getByRole("button", { name: "Reset", exact: true }).isDisabled(), true, "nothing to reset at the starter");
    });

    await test("function exercise: hidden inputs never shown", async () => {
      await page.getByRole("button", { name: /2\. A reusable total/ }).click();
      await waitReady(page).catch(() => {});
      await setCode(page, "def calculate_total(price, quantity):\n    return 48\n");
      await checkAnswer(page);
      const text = await page.locator("#py-panel-checks").innerText();
      assert.match(text, /Works for the examples, but not for 3 of 3 other inputs/);
      assert.match(text, /calculate_total\(12, 4\) → 48/);
      assert.equal(await page.locator(".py-cases li", { hasText: "hidden test input" }).count(), 3);
      assert.doesNotMatch(text, /\(5, 3\)|\(7, 2\)|\(0, 9\)|\b15\b|\b14\b/);
      await setCode(page, "def calculate_total(price, quantity):\n    return price * quantity\n");
      await checkAnswer(page);
      assert.match(await page.locator(".py-verdict").innerText(), /All 1 checks passed/);
      await page.getByRole("button", { name: /1\. Notebook order total/ }).click();
    });

    await test("editor: 4-space auto-indent after a colon, Tab indents, Esc then Tab leaves", async () => {
      await setCode(page, "");
      await page.keyboard.type("if True:");
      await page.keyboard.press("Enter");
      await page.keyboard.type("x = 1");
      assert.equal(await code(page), "if True:\n    x = 1");
      await page.keyboard.press("Home");
      await page.keyboard.press("Tab");
      assert.match(await code(page), /\n {8}x = 1|\n {4}x = 1/);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.closest(".cm-editor") ? "editor" : document.activeElement?.textContent?.trim());
      assert.notEqual(focused, "editor", "focus left the editor");
    });

    if (full) {
      await test("dividers resize with the keyboard and expose their value", async () => {
        const sep = page.getByRole("separator", { name: "Resize task and code" });
        const before = Number(await sep.getAttribute("aria-valuenow"));
        await sep.focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        const after = Number(await sep.getAttribute("aria-valuenow"));
        assert.ok(after > before, `${before} → ${after}`);
        await page.keyboard.press("Enter");
        assert.equal(Number(await sep.getAttribute("aria-valuenow")), 38);
        const rows = page.getByRole("separator", { name: "Resize code and output" });
        await rows.focus();
        await page.keyboard.press("ArrowUp");
        assert.ok(Number(await rows.getAttribute("aria-valuenow")) < 58);
        await page.keyboard.press("Enter");
      });

      await test("Python shell: Learn only, no Tools menu, Python-only search", async () => {
        const nav = page.getByRole("navigation", { name: "Main" });
        assert.deepEqual(await nav.getByRole("link").allInnerTexts(), ["Learn"]);
        assert.equal(await page.getByRole("button", { name: "Tools", exact: true }).count(), 0);
        await page.keyboard.press(`${MOD}+k`);
        const list = page.getByRole("listbox", { name: "Results" });
        const items = await list.getByRole("option").allInnerTexts();
        assert.ok(items.some((t) => /Python · Learn/.test(t)), items.join(" | "));
        assert.ok(!items.some((t) => /Playground|Database Lab|Query Performance|Compare SQL Syntax/.test(t)), items.join(" | "));
        await page.keyboard.press("Escape");
      });

      await test("axe: no serious or critical issues, light and dark", async () => {
        for (const theme of ["light", "dark"]) {
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          const r = await new AxeBuilder({ page }).include(".rx").analyze();
          const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
          assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target} ${n.any?.[0]?.message ?? ""}`).join(" | ")}`), [], theme);
        }
        await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
      });

      await test("screenshots: desktop light and dark", async () => {
        for (const theme of ["light", "dark"]) {
          await page.getByRole("button", { name: /1\. Notebook order total/ }).click();
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; try { localStorage.setItem("theme", t); } catch {} }, theme);
          await setCode(page, "price = 12\nquantity = 4\ntotal = price * quantity\nprint(total)\n");
          await idle(page);
          await runCode(page);
          await page.screenshot({ path: `${SHOTS}/desktop-${theme}-run.png` });
          await idle(page);
          await setCode(page, "price = 12\nquantity = 3\ntotal = price * quantity\nprint(total)\n");
          await checkAnswer(page);
          await page.screenshot({ path: `${SHOTS}/desktop-${theme}-check.png` });
        }
        await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });
      });
    }
  } finally {
    await context.close();
  }

  if (full) {
    await test("mobile: task, editor, actions and console in one column, nothing overlapping", async () => {
      const { context: c, page: m } = await openWorkspace(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      try {
        await waitReady(m);
        const box = async (loc) => (await loc.boundingBox());
        const run = await box(m.getByRole("button", { name: "Run code" }));
        const chk = await box(m.getByRole("button", { name: "Check answer" }));
        const reset = await box(m.getByRole("button", { name: "Reset", exact: true }));
        for (const b of [run, chk, reset]) assert.ok(b.x >= 0 && b.x + b.width <= 390, JSON.stringify(b));
        const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        assert.ok(!overlap(run, chk) && !overlap(run, reset) && !overlap(chk, reset));
        const scrollW = await m.evaluate(() => document.documentElement.scrollWidth);
        assert.ok(scrollW <= 390, `horizontal scroll ${scrollW}`);
        // Only the header may be sticky or fixed: nothing can sit over the editor while the keyboard is open.
        const pinned = await m.evaluate(() => [...document.querySelectorAll(".rx *")].filter((el) => ["fixed", "sticky"].includes(getComputedStyle(el).position) && getComputedStyle(el).display !== "none").map((el) => el.className));
        // CodeMirror's own sticky gutter and off-screen screen-reader region stay inside the editor.
        assert.deepEqual(pinned.filter((c) => !/rx-bar|^cm-/.test(String(c))), []);
        await setCode(m, CORRECT);
        // Simulate the software keyboard taking half the screen: the editor and Run stay reachable.
        await m.setViewportSize({ width: 390, height: 420 });
        await m.getByRole("button", { name: "Run code" }).scrollIntoViewIfNeeded();
        await m.getByRole("button", { name: "Run code" }).click();
        await m.locator("#py-panel-console .py-meta.ok").waitFor({ timeout: 30000 });
        await m.locator("#py-panel-console").scrollIntoViewIfNeeded();
        assert.equal((await m.locator("#py-panel-console .py-stream").innerText()).trim(), "48");
        await m.setViewportSize({ width: 390, height: 844 });
        for (const theme of ["light", "dark"]) {
          await m.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await m.evaluate(() => window.scrollTo(0, 0));
          await m.screenshot({ path: `${SHOTS}/mobile-${theme}-top.png` });
          await m.locator(".py-out").scrollIntoViewIfNeeded();
          await m.screenshot({ path: `${SHOTS}/mobile-${theme}-console.png` });
        }
      } finally {
        await c.close();
      }
    });

    await test("Python fails to load: understandable error, code kept, Retry works", async () => {
      const c = await browser.newContext();
      const p = await c.newPage();
      await p.route("**/pyodide.asm.wasm", (r) => r.abort());
      await p.goto(`${BASE}/python/workspace`);
      await p.locator(".py-state.bad").waitFor({ timeout: 60000 });
      assert.match(await p.locator(".py-fail").innerText(), /(Python could not load|Python took too long to load).*Your code is safe; press Retry/s);
      assert.equal(await p.getByRole("button", { name: "Check answer" }).isDisabled(), true);
      await p.unroute("**/pyodide.asm.wasm");
      await p.getByRole("button", { name: "Retry" }).click();
      await waitReady(p);
      await setCode(p, "print('after retry')\n");
      await runCode(p);
      assert.equal((await p.locator("#py-panel-console .py-stream").innerText()).trim(), "after retry");
      await c.close();
    });

    await test("SQL pages never download Python, and the SQL shell keeps its tools", async () => {
      const c = await browser.newContext();
      const p = await c.newPage();
      const urls = [];
      p.on("request", (r) => urls.push(r.url()));
      for (const path of ["/", "/sql", "/sql/lesson/1", "/sql/practice", "/sql/playground"]) {
        await p.goto(`${BASE}${path}`);
        await p.waitForLoadState("networkidle");
      }
      assert.deepEqual(urls.filter((u) => /pyodide|python-worker/.test(new URL(u).pathname)), []);
      await p.goto(`${BASE}/sql/lesson/1`);
      assert.deepEqual(await p.getByRole("navigation", { name: "Main" }).getByRole("link").allInnerTexts(), ["Learn", "Practice", "Projects"]);
      await p.getByRole("button", { name: "Tools", exact: true }).click();
      assert.equal(await p.locator(".rx-tools-menu li").count(), 4);
      await c.close();
    });

    if (BASELINE) {
      await test("SQL shell is identical to the previous commit (header, status, tools, search)", async () => {
        const capture = async (origin, path) => {
          const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
          const p = await c.newPage();
          await p.goto(`${origin}${path}`);
          await p.locator("header.rx-bar").waitFor();
          await p.waitForLoadState("networkidle");
          const strip = (h) => h.replace(/\s(id|aria-controls|aria-labelledby)="[^"]*"/g, "");
          const header = strip(await p.locator("header.rx-bar").evaluate((e) => e.outerHTML));
          const status = await p.locator("footer.rx-status").evaluate((e) => e.outerHTML).catch(() => "");
          let tools = "";
          if (await p.getByRole("button", { name: "Tools", exact: true }).count()) {
            await p.getByRole("button", { name: "Tools", exact: true }).click();
            tools = await p.locator(".rx-tools-menu").evaluate((e) => e.outerHTML);
            await p.keyboard.press("Escape");
          }
          await p.keyboard.press(`${MOD}+k`);
          const search = strip(await p.locator(".rx-palette").evaluate((e) => e.outerHTML));
          await c.close();
          return { header, status, tools, search };
        };
        for (const path of ["/", "/sql", "/sql/lesson/1", "/sql/practice", "/sql/projects", "/sql/playground"]) {
          const [now, before] = [await capture(BASE, path), await capture(BASELINE, path)];
          for (const k of Object.keys(now)) assert.equal(now[k], before[k], `${path} ${k} differs`);
        }
      });
    }
  }

  await browser.close();
}

console.log(results.join("\n"));
