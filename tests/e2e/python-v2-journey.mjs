// Phase 1 acceptance (docs/python/curriculum-plan.md §10): a learner opens a lesson, writes and runs Python,
// gets feedback, solves a practice question, explores a dataset, opens it in the Playground, and starts P01 —
// in the isolated runner, with progress saved, SQL untouched, and no axe violations.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-v2-journey.mjs
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE ?? "http://localhost:3041";
const SHOTS = "docs/python/screens/phase-1b";
mkdirSync(SHOTS, { recursive: true });
const SQL_SEED = JSON.stringify({ state: { probe: "sql progress must not change" }, version: 0 });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)`);
  } catch (err) {
    results.push(`✗ ${name}: ${err.message.split("\n")[0]}`);
    await page.screenshot({ path: `${SHOTS}/FAILED-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
    throw err;
  }
}
async function axe(label) {
  const r = await new AxeBuilder({ page }).analyze();
  const serious = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target}`);
  assert.deepEqual(serious, [], `${label}: axe violations`);
}
/** Replace the whole editor content (CodeMirror) the way a learner would: select all, then type. */
async function setCode(text, editorIndex = 0) {
  const ed = page.locator("main .cm-content").nth(editorIndex);
  await ed.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(text);
}
const verdict = () => page.locator(".p2-verdict b").first();

await page.goto(`${BASE}/sql`);
await page.evaluate((seed) => localStorage.setItem("sql-studio-v1", seed), SQL_SEED);

await step("SQL pages never load the Python runner", async () => {
  const loaded = [];
  page.on("request", (r) => loaded.push(r.url()));
  await page.goto(`${BASE}/sql/lesson/1`, { waitUntil: "networkidle" });
  assert.ok(!loaded.some((u) => /python-sandbox|pyodide|python-worker/.test(u)), "SQL page requested Python files");
});
// The SQL app normalises its own saved state when its pages load; snapshot it after that, before any Python page.
const sqlBefore = await page.evaluate(() => localStorage.getItem("sql-studio-v1"));

await step("Learn opens the next lesson directly, like SQL, with an All lessons drawer", async () => {
  await page.goto(`${BASE}/python`);
  await page.waitForURL(/\/python\/learn\/python-execution$/);
  await page.getByRole("button", { name: "All lessons" }).click();
  const drawer = page.getByRole("dialog", { name: "All lessons" });
  await drawer.getByRole("link", { name: /When a program stops/ }).waitFor();
  assert.equal(await drawer.getByRole("link").count(), 250);
  await axe("lesson with drawer");
  await page.keyboard.press("Escape");
  await page.screenshot({ path: `${SHOTS}/lesson-desktop-light.png` });
});

await step("Lesson: an example runs for real in the sandbox", async () => {
  await page.goto(`${BASE}/python/learn/python-execution`);
  // Before Run the console is empty. The printed lines appear only after Run.
  assert.equal(await page.locator(".p2-py-console").count(), 0);
  assert.equal(await page.locator(".p2-py-console").getByText("Status: delivered").count(), 0);
  await page.getByRole("button", { name: "Run: Three instructions, three lines" }).click();
  await page.locator(".p2-py-console").first().getByText("Status: delivered").waitFor({ timeout: 60000 });
  await axe("lesson");
});

await step("Lesson: both challenges, wrong then right", async () => {
  await page.getByRole("tab", { name: "Challenge 1" }).click();
  await page.getByLabel("Expected output").getByText("Thank you for shopping with us!").waitFor();
  await setCode('print("RUNTIME MARKET")\nprint("Order O101217")\n');
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await verdict().getByText(/Not yet/).waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${SHOTS}/lesson-failed-check-desktop-light.png` });
  await setCode('print("RUNTIME MARKET")\nprint("Order O101217")\nprint("Thank you for shopping with us!")\n');
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("✓ Solved on your own.").waitFor({ timeout: 30000 });

  await page.getByRole("tab", { name: "Challenge 2" }).click();
  await setCode('print("Checkout steps")\nprint()\nprint("1. Add to cart")\nprint("2. Check out")\nprint("3. Pay")\nprint("4. Get receipt")\n');
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await page.getByText("✓ Solved on your own.").waitFor({ timeout: 30000 });
});

await step("Lesson: concept check passes and the lesson is mastered", async () => {
  await page.getByRole("tab", { name: "Concept check" }).click();
  const qs = page.locator(".p2-q");
  for (const [q, choice] of [[0, 1], [1, 0], [2, 0]]) await qs.nth(q).locator("input[type=radio]").nth(choice).check();
  await page.getByRole("button", { name: "Check answers" }).click();
  await page.getByText("✓ Lesson mastered.").waitFor();
  await axe("lesson concept");
});

await step("Progress survives a reload", async () => {
  await page.reload();
  await page.getByText("✓ Lesson mastered.").waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("runtime-python-v2")).state.lessons["PY-L01-01"]);
  assert.ok(saved.masteredAt > 0);
  assert.equal(saved.exercises.c1.solved, true);
});

await step("Practice opens the next question directly, with an All questions drawer", async () => {
  await page.goto(`${BASE}/python/practice`);
  await page.waitForURL(/\/python\/practice\/sep-and-end-basics$/);
  await page.getByRole("button", { name: "All questions" }).click();
  assert.equal(await page.getByRole("dialog", { name: "All questions" }).getByRole("link").count(), 500);
  await page.keyboard.press("Escape");
});

await step("Practice: a prediction is graded against real output", async () => {
  await page.goto(`${BASE}/python/practice/sep-and-end-basics`);
  const box = page.getByLabel("Your prediction");
  await box.fill("Runtime Market\nRuntime Market\nOrder: O100043");
  await page.getByRole("button", { name: "Check prediction" }).click();
  await page.getByText("Not quite").waitFor();
  await box.fill("Runtime Market\nRuntimeMarket\nOrder: O100043");
  await page.getByRole("button", { name: "Check prediction" }).click();
  await page.getByText("Correct", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Run the program" }).click();
  await page.locator(".p2-console").getByText("RuntimeMarket").waitFor({ timeout: 60000 });
  await axe("prediction");
});

await step("Practice: a hint makes a correct code answer 'solved with help'", async () => {
  await page.goto(`${BASE}/python/practice/one-print-header`);
  await page.getByRole("button", { name: /^Hint/ }).click();
  await setCode('print("RUNTIME MARKET", "Order O101217", "Thank you!", sep="\\n")\n');
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await verdict().getByText("All 2 checks pass").waitFor({ timeout: 60000 });
  await page.getByText("This attempt used help").waitFor();
  const q = await page.evaluate(() => JSON.parse(localStorage.getItem("runtime-python-v2")).state.questions["PY-Q01-06"]);
  assert.equal(q.solved, false);
  assert.equal(q.assisted, true);
  await page.screenshot({ path: `${SHOTS}/practice-desktop-light.png` });
});

await step("Datasets: pick a dataset, open a file and its preview, run the explore code", async () => {
  await page.goto(`${BASE}/python/tools/datasets`);
  await page.getByRole("heading", { name: "Datasets", level: 1 }).waitFor();
  assert.ok(!/coming later|R01|sha256|download/i.test(await page.locator("main").innerText()));
  await page.getByRole("combobox", { name: "dataset" }).selectOption({ label: "Online Store" });
  // Choosing a dataset re-renders the file list; let it settle before opening a file.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  const orders = page.locator("details.rx-ds-table").filter({ has: page.locator("summary b", { hasText: /^orders$/ }) });
  await orders.locator("summary").click();
  await orders.getByText("In your code: data/").waitFor();
  await orders.getByRole("button", { name: "Preview" }).click();
  await orders.locator("td").first().waitFor({ timeout: 20000 });
  await orders.getByRole("button", { name: "Explore" }).click();
  const explore = page.getByRole("region", { name: "Explore" });
  await explore.getByRole("button", { name: "Run", exact: true }).click();
  await explore.getByText("(300, 15)").waitFor({ timeout: 90000 });
  await axe("datasets");
  await page.screenshot({ path: `${SHOTS}/explorer-desktop-light.png` });
});

await step("Open in Playground carries the code and dataset, runs pandas, and Python can't reach the network", async () => {
  await page.getByRole("region", { name: "Explore" }).getByRole("button", { name: "Open in Playground" }).click();
  await page.waitForURL(/tools\/playground/);
  await page.getByText("Opened the code from the Online Store dataset").waitFor();
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.locator(".p2-console").getByText("(300, 15)").waitFor({ timeout: 90000 });
  await setCode('import pandas as pd\n\ndf = pd.read_csv("data/orders.csv")\nprint(len(df), "rows")\n');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.locator(".p2-console").getByText("300 rows").waitFor({ timeout: 90000 });
  await setCode('import js\nprint("origin", js.location.origin)\nprint("fetch", getattr(js, "fetch", None))\n');
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.locator(".p2-console").getByText("origin null").waitFor({ timeout: 60000 });
  await page.locator(".p2-console").getByText("fetch None").waitFor();
  await axe("playground");
  await page.screenshot({ path: `${SHOTS}/playground-desktop-light.png` });
});

await step("Projects library lists all 10 projects and opens P01", async () => {
  await page.goto(`${BASE}/python/projects`);
  await page.getByRole("heading", { name: "Projects", level: 1 }).waitFor();
  assert.equal(await page.locator("a.rx-project-card").count(), 10);
  await axe("projects library");
  await page.screenshot({ path: `${SHOTS}/projects-desktop-light.png` });
  await page.getByRole("link", { name: /Smart Shopping Cart/ }).click();
  await page.waitForURL(/projects\/smart-shopping-cart$/);
});

await step("P01 step 1: Start, the starter fails, the learner's code passes, and it stays passed after a reload", async () => {
  await page.getByRole("button", { name: /Start/ }).click();
  await page.getByRole("heading", { name: "Browse products" }).waitFor();
  await page.getByRole("button", { name: "Check step" }).click();
  await verdict().getByText(/Not yet/).waitFor({ timeout: 60000 });
  const solution = readFileSync("src/content/python-v2/projects/P01.ts", "utf8").match(/const CATALOGUE_M1 = `([\s\S]*?)`;/)[1];
  await page.getByRole("tab", { name: "catalogue.py" }).click();
  await setCode(solution);
  await page.getByRole("button", { name: "Check step" }).click();
  await verdict().getByText(/All \d+ checks pass/).waitFor({ timeout: 60000 });
  await page.getByText(/Step passed/).waitFor();
  await axe("project");
  await page.screenshot({ path: `${SHOTS}/project-desktop-light.png` });
  await page.reload();
  await page.locator(".p2-step.done").first().waitFor();
});

await step("SQL progress is byte-for-byte unchanged", async () => {
  assert.equal(await page.evaluate(() => localStorage.getItem("sql-studio-v1")), sqlBefore);
});

await step("Phone and dark screens have no horizontal overflow or axe violations", async () => {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
  const p = await phone.newPage();
  for (const [name, url] of [["projects", "/python/projects"], ["lesson", "/python/learn/print-and-input"], ["practice", "/python/practice/packing-slip"], ["project", "/python/projects/smart-shopping-cart"], ["explorer", "/python/tools/datasets/R01"], ["playground", "/python/tools/playground"]]) {
    await p.goto(`${BASE}${url}`);
    await p.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await p.waitForTimeout(800);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `${name}: ${overflow}px horizontal overflow on a phone`);
    const r = await new AxeBuilder({ page: p }).analyze();
    assert.deepEqual(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`), [], `${name} (phone, dark): axe`);
    await p.screenshot({ path: `${SHOTS}/${name}-mobile-dark.png`, fullPage: true });
  }
  await phone.close();
});

await browser.close();
console.log(results.join("\n"));
assert.deepEqual(errors, [], "page errors");
