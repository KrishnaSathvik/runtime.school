// Lesson 2 — Print, comments and execution order, driven as a learner through the real UI.
// Usage: npm run dev -- -p 3051 & BASE=http://localhost:3051 node tests/e2e/python-lesson-2.mjs
// Optional: BROWSERS=chromium,firefox,webkit (default all three; screenshots, axe and mobile in Chromium).
// Optional: SHOTS=docs/python/screens/lesson-2
import { chromium, firefox, webkit } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3051";
const SHOTS = process.env.SHOTS ?? "docs/python/screens/lesson-2";
const ENGINES = { chromium, firefox, webkit };
const BROWSERS = (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",");
const MOD = process.platform === "darwin" ? "Meta" : "Control";
const LESSON = "/python/lesson/print-comments-and-execution-order";
const REF = "python:print-comments-and-execution-order";
const HEAD = 'item = "notebook"\nprice = 4\nquantity = 3\n';
const PRINTS = 'print("Order summary")\nprint()\nprint("Item:", item)\nprint("Quantity:", quantity)\nprint("Total:", total, "dollars")\n';
const C1 = `${HEAD}\ntotal = price * quantity\n\n${PRINTS}`;
const C2 = '# Parcel cost: weight times rate per kg\nweight_kg = 3\nrate = 4\ncost = weight_kg * rate\nprint("Parcel:", weight_kg, "kg")\nprint("Rate:", rate, "per kg")\nprint("Cost:", cost)\n';
const C2_STARTER = 'Parcel cost: weight times rate per kg\nprint("Cost:", cost)\nrate = 4\nprint("Parcel:", weight_kg, "kg")\ncost = weight_kg * rate\nweight_kg = 3\nprint("Rate:", rate, "per kg")\n';
const results = [];
fs.mkdirSync(SHOTS, { recursive: true });

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
const idle = (p) => p.getByRole("button", { name: "Run code" }).waitFor({ timeout: 30000 });
async function check(p) {
  await idle(p);
  await p.getByRole("button", { name: "Check answer" }).click();
  await p.locator(".py-verdict").waitFor({ timeout: 30000 });
  await idle(p);
}
const lessonRec = (p, ref = REF) => p.evaluate((r) => JSON.parse(localStorage.getItem("runtime-python-v1") ?? "null")?.state?.lessons?.[r], ref);
const tab = (p, name) => p.getByRole("tab", { name: new RegExp(`^${name}`) });
const checks = (p) => p.locator("#py-panel-checks").innerText();

for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  const full = name === "chromium";
  results.push(`\n[${name}]`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  let sqlBefore = null;
  try {
    await test("Python home lists both Foundations lessons in order; Lesson 2 opens from it", async () => {
      await page.goto(`${BASE}/sql/lesson/1`);
      await page.waitForLoadState("networkidle");
      sqlBefore = await page.evaluate(() => localStorage.getItem("sql-studio-v1"));
      await page.goto(`${BASE}/python`);
      await page.getByRole("heading", { name: "Python Foundations" }).waitFor();
      await page.locator(".py-lesson-row .s", { hasText: "not started" }).first().waitFor({ timeout: 10000 });
      const rows = await page.locator(".py-lesson-row").allInnerTexts();
      assert.equal(rows.length, 2);
      assert.match(rows[0], /01[\s\S]*Variables and values/);
      assert.match(rows[1], /02[\s\S]*Print, comments and execution order[\s\S]*not started[\s\S]*Start/);
      await page.locator(".py-lesson-row").nth(1).click();
      await page.waitForURL(`**${LESSON}`);
      assert.equal(await page.getByRole("heading", { level: 1 }).innerText(), "Print, comments and execution order");
      assert.match(await page.locator(".rx-status").innerText(), /lesson 2\/2/);
    });

    await test("Understand: the three sections and all three mistakes are visible without expanding", async () => {
      const brief = await page.locator(".rx-brief").innerText();
      for (const s of [/SEVERAL VALUES IN ONE PRINT\(\)/i, /COMMENTS/i, /ONE LINE AT A TIME/i, /syntax error/, /commenting it out/, /Writing a note without #/, /Using a name before the line that assigns it/, /Joining a label and a number with \+/]) assert.match(brief, s);
      assert.equal(await page.locator(".rx-brief details").count(), 0);
    });

    await test("examples run real Python: labelled output, an error partway, and a syntax error that prints nothing", async () => {
      await page.getByRole("button", { name: "Run: example.py" }).click();
      const ex = page.locator(".py-run-cell").first().locator(".py-cell-out");
      await ex.locator(".py-meta.ok").waitFor({ timeout: 30000 });
      assert.equal(await ex.locator(".py-stream").innerText(), "Order summary\n\nItem: notebook\nTotal: 12 dollars\n");
      await page.getByRole("button", { name: "Run: step-4.py" }).click();
      const s4 = page.locator(".py-run-cell").nth(4).locator(".py-cell-out");
      await s4.locator(".py-err").waitFor({ timeout: 30000 });
      assert.equal((await s4.locator(".py-stream").innerText()).trim(), "Starting");
      assert.match(await s4.innerText(), /NameError: name 'price' is not defined/);
      await page.getByRole("button", { name: "Run: mistake-1.py" }).click();
      const m1 = page.locator(".py-run-cell").nth(5).locator(".py-cell-out");
      await m1.locator(".py-err").waitFor({ timeout: 30000 });
      assert.equal(await m1.locator(".py-stream").count(), 0, "nothing printed: Python never started running");
      assert.match(await m1.innerText(), /SyntaxError: invalid syntax[\s\S]*Check the delivery address[\s\S]*none of it ran/);
      assert.equal(await lessonRec(page), undefined, "running examples never touches progress");
    });

    await test("Challenge 1 shows the exact expected output; layout mistakes get specific feedback", async () => {
      await tab(page, "Challenge 1").click();
      assert.equal(await page.locator(".py-expected").innerText(), "Order summary\n\nItem: notebook\nQuantity: 3\nTotal: 12 dollars\n");
      assert.equal(await code(page), `${HEAD}\n# Calculate total, then print the summary.\n`);
      // An extra space inside the quotes.
      await setCode(page, `${HEAD}total = price * quantity\n${PRINTS.replace('"Item:", item', '"Item: ", item')}`);
      await check(page);
      let t = await checks(page);
      assert.match(t, /2 of 3 checks passed/);
      // The double space stays visible, and the message says that only the spacing differs.
      assert.match(t, /Line 3: expected "Item: notebook", but your program printed "Item:  notebook"\. The words match; only the spaces differ\./);
      assert.match(t, /Tip: Compare your Console with the expected output line by line/);
      // Printing total before it exists.
      await setCode(page, `${HEAD}print("Total:", total, "dollars")\ntotal = price * quantity\n`);
      await check(page);
      assert.match(await page.locator(".py-summary").innerText(), /NameError on line 4: name 'total' is not defined/);
      // Typing the number instead of calculating it.
      await setCode(page, `${HEAD}total = 12\n${PRINTS}`);
      await check(page);
      t = await checks(page);
      assert.match(t, /2 of 3 checks passed/);
      assert.match(t, /total is set to a fixed value on line 4\. Calculate it from price and quantity/);
      assert.equal((await lessonRec(page)).challenges["challenge-1"].solved, false);
    });

    await test("Challenge 1 passes independently", async () => {
      await setCode(page, C1);
      await check(page);
      assert.match(await page.locator(".py-verdict").innerText(), /All 3 checks passed/);
      assert.match(await page.locator(".py-banner.ok").innerText(), /Solved without help/);
      assert.equal((await lessonRec(page)).challenges["challenge-1"].solved, true);
      await page.getByRole("button", { name: /Continue to Challenge 2/ }).click();
    });

    await test("Challenge 2: the starter's syntax error, then its NameError, then a pass", async () => {
      assert.equal(await code(page), C2_STARTER.replace(/\n$/, "\n"));
      await check(page);
      assert.match(await page.locator(".py-summary").innerText(), /SyntaxError[\s\S]*line 1/i);
      await setCode(page, `# ${C2_STARTER}`);
      await check(page);
      assert.match(await page.locator(".py-summary").innerText(), /NameError on line 2: name 'cost' is not defined/);
      await setCode(page, '# note\nweight_kg = 3\nrate = 4\ncost = weight_kg * rate\nprint("Cost:", cost)\nprint("Parcel:", weight_kg, "kg")\nprint("Rate:", rate, "per kg")\n');
      await check(page);
      const t = await checks(page);
      assert.match(t, /Line 1: expected "Parcel: 3 kg", but your program printed "Cost: 12"/);
      assert.match(t, /Tip: Each line can only use names assigned above it/);
      await setCode(page, C2);
      await check(page);
      assert.match(await page.locator(".py-verdict").innerText(), /All 3 checks passed/);
      assert.equal((await lessonRec(page)).challenges["challenge-2"].solved, true);
      await page.getByRole("button", { name: /Continue to the concept check/ }).click();
    });

    await test("concept check: wrong answers explain the misconception; both right passes", async () => {
      const q1 = page.getByRole("group", { name: "Answers for question 1" });
      await q1.getByRole("button", { name: /Only the error, nothing printed/ }).click();
      assert.match(await page.locator(".py-quiz-q").first().locator(".rx-feedback").innerText(), /That happens with a syntax error/);
      await q1.getByRole("button", { name: /A, then a NameError on line 2/ }).click();
      assert.match(await page.locator(".py-quiz-q").first().locator(".rx-feedback").innerText(), /Correct/);
      const q2 = page.getByRole("group", { name: "Answers for question 2" });
      await q2.getByRole("button", { name: /^b Total:12$/ }).click();
      assert.match(await page.locator(".py-quiz-q").nth(1).locator(".rx-feedback").innerText(), /one space between them/);
      await q2.getByRole("button", { name: /^a Total: 12$/ }).click();
      await page.locator(".py-quiz .py-banner.ok").waitFor();
    });

    await test("mastery: Complete lists the outcomes and says this is the latest lesson", async () => {
      await page.getByRole("button", { name: /See your completed lesson/ }).click();
      const panel = page.locator(".py-complete");
      await panel.waitFor();
      const t = await panel.innerText();
      assert.match(t, /Print, comments and execution order: mastered/);
      assert.match(t, /Tell a syntax error \(nothing runs\) from an error partway through/);
      assert.match(t, /Back to Python Foundations/);
      assert.match(t, /This is the latest Python lesson/);
      assert.ok((await lessonRec(page)).masteredAt > 0);
    });

    await test("reload: mastery and both drafts survive; Lesson 1 progress is untouched", async () => {
      await page.reload();
      await page.locator(".py-complete").waitFor({ timeout: 15000 });
      await tab(page, "Challenge 1").click();
      assert.equal(await code(page), C1);
      await tab(page, "Challenge 2").click();
      assert.equal(await code(page), C2);
      assert.equal(await lessonRec(page, "python:variables-and-values"), undefined);
      await page.goto(`${BASE}/python`);
      await page.locator(".py-lesson-row .s.ok").waitFor({ timeout: 10000 });
      const rows = await page.locator(".py-lesson-row").allInnerTexts();
      assert.match(rows[0], /not started/);
      assert.match(rows[1], /✓ mastered[\s\S]*Review/);
    });

    await test("SQL progress is byte-identical after the Lesson 2 journey", async () => {
      assert.equal(await page.evaluate(() => localStorage.getItem("sql-studio-v1")), sqlBefore);
    });

    if (full) {
      await test("axe: Lesson 2 has no serious or critical issues, light and dark", async () => {
        await page.goto(`${BASE}${LESSON}`);
        await tab(page, "Challenge 1").click();
        await page.locator(".py-expected").waitFor();
        for (const theme of ["light", "dark"]) {
          await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          // The code editor is excluded: its line-number and comment colours are shared, deliberately muted SQL/Python
          // editor tokens (src/app/sql/rt.css), reported separately rather than changed in a lesson.
          const r = await new AxeBuilder({ page }).include(".rx").exclude(".cm-editor").analyze();
          const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
          assert.deepEqual(bad.map((v) => `${v.id}: ${v.nodes.map((n) => `${n.target}`).join(" | ")}`), [], theme);
        }
      });
    }
  } finally {
    await context.close();
  }

  await test("assisted: a hint or the answer counts as solved with help; a fresh attempt can still earn credit", async () => {
    const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await c.newPage();
    try {
      await p.goto(`${BASE}${LESSON}`);
      await tab(p, "Challenge 1").click();
      await p.getByRole("button", { name: "Hint" }).click();
      await p.getByRole("button", { name: "Show hint" }).click();
      assert.match(await p.locator(".rx-hints").innerText(), /total = price \* quantity/);
      await setCode(p, C1);
      await check(p);
      assert.match(await p.locator(".py-banner.assisted").innerText(), /Correct, with help/);
      let rec = await lessonRec(p);
      assert.deepEqual([rec.challenges["challenge-1"].solved, rec.challenges["challenge-1"].assisted], [false, true]);
      await p.getByRole("button", { name: "Try again without help" }).click();
      assert.equal(await code(p), `${HEAD}\n# Calculate total, then print the summary.\n`);
      await setCode(p, C1);
      await check(p);
      assert.match(await p.locator(".py-banner.ok").innerText(), /Solved without help/);
      // The revealed answer for Challenge 2 passes the real grader, and counts as assisted.
      await tab(p, "Challenge 2").click();
      await p.getByRole("button", { name: "Show answer" }).click();
      await p.getByRole("button", { name: "Show answer" }).last().click();
      await p.getByRole("button", { name: "Put in editor" }).click();
      await check(p);
      assert.match(await p.locator(".py-verdict").innerText(), /All 3 checks passed/);
      rec = await lessonRec(p);
      assert.deepEqual([rec.challenges["challenge-2"].solved, rec.challenges["challenge-2"].assisted], [false, true]);
      assert.ok(!rec.masteredAt, "help never masters a lesson");
    } finally {
      await c.close();
    }
  });

  if (full) {
    await test("mobile: one column, expected output readable, Check works, no horizontal scroll", async () => {
      const c = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const m = await c.newPage();
      try {
        await m.goto(`${BASE}${LESSON}`);
        await tab(m, "Challenge 1").waitFor();
        assert.ok((await m.evaluate(() => document.documentElement.scrollWidth)) <= 390, "no horizontal scroll on Understand");
        for (const theme of ["light", "dark"]) {
          await m.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await m.evaluate(() => window.scrollTo(0, 0));
          await m.screenshot({ path: `${SHOTS}/mobile-${theme}-understand.png` });
        }
        await tab(m, "Challenge 1").click();
        await setCode(m, C1);
        await m.getByRole("button", { name: "Check answer" }).scrollIntoViewIfNeeded();
        await m.getByRole("button", { name: "Check answer" }).click();
        await m.locator(".py-verdict").waitFor({ timeout: 30000 });
        assert.ok((await m.evaluate(() => document.documentElement.scrollWidth)) <= 390, "no horizontal scroll on the challenge");
        assert.match(await m.locator(".py-verdict").innerText(), /All 3 checks passed/);
        for (const theme of ["light", "dark"]) {
          await m.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
          await m.locator(".py-expected").scrollIntoViewIfNeeded();
          await m.screenshot({ path: `${SHOTS}/mobile-${theme}-challenge.png` });
          await m.locator(".py-banner.ok").scrollIntoViewIfNeeded();
          await m.screenshot({ path: `${SHOTS}/mobile-${theme}-checks.png` });
        }
      } finally {
        await c.close();
      }
    });

    await test("screenshots: Understand, both challenges, Checks, Concept check and Complete in light and dark", async () => {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p = await c.newPage();
      try {
        await p.goto(`${BASE}${LESSON}`);
        await tab(p, "Challenge 1").waitFor();
        const shot = async (n) => {
          for (const theme of ["light", "dark"]) {
            await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
            await p.screenshot({ path: `${SHOTS}/desktop-${theme}-${n}.png` });
          }
        };
        await p.getByRole("button", { name: "Run: mistake-1.py" }).click();
        await p.locator(".py-run-cell").nth(5).locator(".py-err").waitFor({ timeout: 30000 });
        await p.locator(".py-run-cell").nth(4).scrollIntoViewIfNeeded();
        await p.getByRole("button", { name: "Run: step-4.py" }).click();
        await p.locator(".py-run-cell").nth(4).locator(".py-err").waitFor({ timeout: 30000 });
        await shot("1-understand-errors");
        await tab(p, "Challenge 1").click();
        await setCode(p, `${HEAD}total = price * quantity\n${PRINTS.replace("print()\n", "")}`);
        await check(p);
        await shot("2-challenge-1-failed");
        await setCode(p, C1);
        await check(p);
        await shot("3-challenge-1-solved");
        await p.getByRole("button", { name: /Continue to Challenge 2/ }).click();
        await check(p);
        await shot("4-challenge-2-syntax-error");
        await setCode(p, C2);
        await check(p);
        await p.getByRole("button", { name: /Continue to the concept check/ }).click();
        await p.getByRole("group", { name: "Answers for question 1" }).getByRole("button", { name: /Only the error, nothing printed/ }).click();
        await shot("5-concept-check");
        await p.getByRole("group", { name: "Answers for question 1" }).getByRole("button", { name: /A, then a NameError on line 2/ }).click();
        await p.getByRole("group", { name: "Answers for question 2" }).getByRole("button", { name: /^a Total: 12$/ }).click();
        await p.getByRole("button", { name: /See your completed lesson/ }).click();
        await shot("6-complete");
        await p.goto(`${BASE}/python`);
        await p.locator(".py-lesson-row").first().waitFor();
        await shot("0-python-home");
      } finally {
        await c.close();
      }
    });
  }

  await browser.close();
}

console.log(results.join("\n"));
