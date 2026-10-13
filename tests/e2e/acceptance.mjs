// End-to-end product acceptance suite (Playwright, real production build).
// Usage: npm run build && npx next start -p 3217 & BASE=http://localhost:3217 node tests/e2e/acceptance.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const SHOTS = process.env.SHOTS ?? "docs/audit/screens/after";
fs.mkdirSync(SHOTS, { recursive: true });
const pack = JSON.parse(fs.readFileSync("src/content/content-pack.json", "utf8"));
const { lessons, courseOrder, projects } = pack;

const results = [];
async function test(name, fn) {
  if (process.env.TEST_FILTER && !new RegExp(process.env.TEST_FILTER).test(name)) return;
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`  ✗ ${name}\n    ${e.message.split("\n").slice(0, 4).join("\n    ")}`);
  }
}

const browser = await chromium.launch();
async function freshPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  page.errors = [];
  page.consoleIssues = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) page.consoleIssues.push(m.text()); });
  page.on("pageerror", (e) => page.errors.push(e.message));
  return { ctx, page };
}
const saved = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("sql-studio-v1") ?? "null")?.state ?? null);
async function typeSql(page, sql) {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(sql);
}
async function checkAnswer(page) {
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok, .results-panel .explanation").first().waitFor();
  return (await page.locator(".results-panel").innerText()).replace(/\s+/g, " ");
}
const ready = (page) => page.waitForSelector("#main-content h1");

console.log("First-time learner journey");
const { page } = await freshPage();
const first = courseOrder[0];

await test("Root → Learn → first path opens the first lesson at Understand", async () => {
  await page.goto(BASE);
  await ready(page);
  assert.equal(await page.getByRole("link", { name: /Choose my level/ }).count(), 0, "misleading CTA removed");
  await page.locator("#module-0").click();
  await page.locator(".module-start").click();
  await page.waitForURL(/\/(lesson\/0|learn\/sql\/)/);
  await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
  assert.match(await page.locator('[aria-current="step"]').innerText(), /Understand/);
  assert.match(await page.locator("main").innerText(), /Lesson 1 of 88/);
});

await test("Understand → Run example shows real rows; walkthrough explanations visible", async () => {
  await page.getByRole("button", { name: /Run example/ }).click();
  await page.waitForSelector("table.results-table");
  assert.match(await page.locator("table.results-table").innerText(), /Alice/);
  await page.getByText("Build it step by step",{exact:true}).click();
  assert.match(await page.locator("main").innerText(), /Every row is one customer/);
  await page.screenshot({ path: `${SHOTS}/journey-01-understand.png`, fullPage: true });
});

await test("Practice → Run query → wrong answer gives actionable feedback", async () => {
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await page.locator(".cm-content").waitFor();
  await typeSql(page, "SELECT * FROM customers");
  await page.getByRole("button", { name: "Run query" }).click();
  await page.waitForSelector(".results-panel table");
  const fb = await checkAnswer(page);
  assert.match(fb, /Too many columns.*The task needs 2 columns.*Replace SELECT \* with only the columns/);
});

await test("Correct answer → explicit Next challenge action → Challenge 2", async () => {
  await typeSql(page, lessons[first].tasks[0].answer);
  const fb = await checkAnswer(page);
  assert.match(fb, /Exactly right/);
  await page.screenshot({ path: `${SHOTS}/journey-02-correct-next.png`, fullPage: true });
  await page.getByRole("button", { name: /Next: Challenge 2/ }).click();
  assert.match(await page.locator(".task-pane h2").innerText(), new RegExp(lessons[first].tasks[1].prompt.slice(0, 20)));
  await page.waitForFunction(() => !document.querySelector(".results-panel table"), null, { timeout: 2000 });
});

await test("Second correct answer → Continue to concept check → Review", async () => {
  await typeSql(page, lessons[first].tasks[1].answer);
  assert.match(await checkAnswer(page), /Exactly right/);
  await page.locator(".results-panel").getByRole("button", { name: /Continue to concept check/ }).click();
  await page.getByRole("heading", { name: lessons[first].quiz.q }).waitFor();
});

await test("Review: wrong option explains; right option → Complete with accurate checklist", async () => {
  const q = lessons[first].quiz;
  const wrong = (q.correct + 1) % q.options.length;
  await page.getByRole("button", { name: q.options[wrong], exact: true }).click();
  await page.getByText(/^Not quite\./).waitFor();
  await page.getByRole("button", { name: q.options[q.correct], exact: true }).click();
  await page.getByRole("heading", { name: "Lesson mastered" }).waitFor();
  await page.screenshot({ path: `${SHOTS}/journey-03-complete.png`, fullPage: true });
});

await test("Complete → Next lesson follows course order (not id+1)", async () => {
  const nextId = courseOrder[1];
  await page.getByRole("link", { name: new RegExp(`Next lesson: ${lessons[nextId].title}`) }).click();
  await page.waitForURL(new RegExp(`/lesson/${nextId}$`));
  await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
});

await test("Learn path shows mastered progress on the first module", async () => {
  await page.goto(BASE);
  await ready(page);
  await page.goto(`${BASE}/learn`);
  await page.locator("#module-0").waitFor();
  assert.match(await page.locator("#module-0").innerText(), /1 of 2/);
});

console.log("Returning learner");
await test("Partial query, run, refresh: progress, stage, challenge, draft, hints survive", async () => {
  const id = courseOrder[1];
  await page.goto(`${BASE}/lesson/${id}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await page.getByRole("button", { name: /Challenge 2/ }).click();
  await page.getByRole("button", { name: /Show a hint/ }).click();
  await typeSql(page, "SELECT name FROM cust");
  await page.getByRole("button", { name: "Run query" }).click();
  await page.locator(".results-panel .explanation").waitFor();
  await page.reload();
  await page.locator(".cm-content").waitFor();
  assert.match(await page.locator('[aria-current="step"]').innerText(), /Practice/, "stage restored");
  assert.equal(await page.getByRole("button", { name: /Challenge 2/ }).getAttribute("aria-pressed"), "true", "challenge restored");
  assert.match(await page.locator(".cm-content").innerText(), /SELECT name FROM cust/, "draft restored");
  assert.match(await page.locator(".task-pane").innerText(), /using help this time/, "hint state restored");
  const s = await saved(page);
  assert.deepEqual(s.stats[first].solved, [0, 1], "earlier mastery NOT wiped by refresh (former P0)");
  assert.equal(s.stats[first].check, true);
});

await test("Deep link + refresh on a lesson never erases saved progress", async () => {
  for (let i = 0; i < 3; i++) {
    await page.goto(`${BASE}/lesson/${courseOrder[5]}`);
    await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
    await page.reload();
    await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
  }
  const s = await saved(page);
  assert.deepEqual(s.stats[first].solved, [0, 1]);
});

await test("Fresh attempt clears guidance; independent solve then counts", async () => {
  const id = courseOrder[1];
  await page.goto(`${BASE}/lesson/${id}`);
  await page.locator(".cm-content").waitFor();
  await page.getByRole("button", { name: /Try again without hints/ }).click();
  assert.doesNotMatch(await page.locator(".task-pane").innerText(), /using help this time/);
  await typeSql(page, lessons[id].tasks[1].answer);
  assert.match(await checkAnswer(page), /Exactly right/);
  const s = await saved(page);
  assert.deepEqual(s.stats[id].solved, [1]);
});

await test("Learn path resumes the active lesson while Practice stays focused on practice", async () => {
  await page.goto(`${BASE}/practice`);
  await page.getByRole("heading", { name: "Practice", exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/practice");
  await page.getByRole("heading", { level: 1 }).waitFor();
  assert.equal(await page.getByRole("link",{name:/Continue your lesson/}).count(),0);
  await page.goto(BASE);
  await page.locator("#module-0").click();
  await page.locator(".module-start").click();
  await page.waitForURL(new RegExp(`/(lesson/${courseOrder[1]}|learn/sql/)`));
});

await test("Learn marks the active path as current", async () => {
  await page.goto(BASE);
  await ready(page);
  assert.ok(await page.locator("#module-0 .up-next-tag").count());
});

await test("Quiz before practice does not claim mastery", async () => {
  const id = courseOrder[3];
  await page.goto(`${BASE}/lesson/${id}`);
  await page.getByRole("button", { name: /^3\s*Review/ }).click();
  await page.getByRole("button", { name: lessons[id].quiz.options[lessons[id].quiz.correct], exact: true }).click();
  await page.getByText(/Concept check passed\. To complete this lesson/).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Lesson mastered" }).count(), 0);
  await page.screenshot({ path: `${SHOTS}/quiz-before-practice.png`, fullPage: true });
});

await test("Theme preference persists across reload without flashing to light", async () => {
  await page.goto(`${BASE}/settings`);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.reload();
  await ready(page);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.goto(`${BASE}/lesson/${courseOrder[1]}`);
  await page.locator(".cm-content").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.screenshot({ path: `${SHOTS}/practice-dark.png` });
  await page.goto(`${BASE}/settings`);
  await page.getByRole("button", { name: "Light", exact: true }).click();
});

await test("Import: malformed file shows an error and keeps progress; valid V1 file imports", async () => {
  await page.goto(`${BASE}/settings`);
  await ready(page);
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"version":3,"stats":{},"drafts":{"a":5}}') });
  await page.getByText(/This backup could not be restored/).waitFor();
  await page.getByText("Technical details", {exact:true}).click();
  await page.getByText("Invalid SQL drafts.").waitFor();
  assert.deepEqual((await saved(page)).stats[first].solved, [0, 1]);
  await input.setInputFiles({ name: "junk.json", mimeType: "application/json", buffer: Buffer.from("not json") });
  await page.getByText(/This file could not be read/).waitFor();
  await input.setInputFiles({
    name: "v1.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ id: 45, stats: { 45: { attempts: 3, solved: [0, 1], last: 1 } } })),
  });
  await page.getByText("Progress restored from your backup.").waitFor();
  const s = await saved(page);
  assert.equal(s.stats[45].legacy, true);
  assert.deepEqual(s.projects[0].milestones[45].solved, [0, 1]);
});
await page.context().close();

console.log("Projects");
for (const p of projects) {
  await test(`Project ${p.id + 1} (${p.title}): brief, data, workflow; Start opens milestone 1`, async () => {
    const { page } = await freshPage();
    await page.goto(`${BASE}/projects/${p.id}`);
    await ready(page);
    const text = await page.locator("main").innerText();
    assert.match(text, /What you’ll build/);
    assert.match(text, /sample tables/);
    assert.match(text, /Your milestones/);
    await page.getByRole("link", { name: /Start project/ }).click();
    await page.waitForURL(new RegExp(`/projects/${p.id}/milestone/${p.milestoneIds[0]}$`));
    assert.match(await page.locator("main").innerText(), new RegExp(`Milestone 1 of ${p.milestoneIds.length}`));
    assert.deepEqual(page.errors, []);
    await page.context().close();
  });
}

await test("Project workflow: solve a milestone, deliverable saved, survives refresh, exports", async () => {
  const { page } = await freshPage();
  const p = projects[0];
  const id = p.milestoneIds[0];
  const l = lessons[id];
  await page.goto(`${BASE}/projects/${p.id}/milestone/${id}`);
  await page.getByRole("navigation",{name:"Project steps"}).getByRole("button",{name:/Write SQL/}).click();
  await typeSql(page, l.tasks[0].answer);
  assert.match(await checkAnswer(page), /Exactly right/);
  await page.getByRole("button", { name: /Next: Challenge 2/ }).click();
  await typeSql(page, l.tasks[1].answer);
  assert.match(await checkAnswer(page), /Exactly right/);
  await page.locator(".results-panel").getByRole("button", { name: /Continue to concept check/ }).click();
  await page.getByRole("button", { name: l.quiz.options[l.quiz.correct], exact: true }).click();
  await page.getByRole("heading", { name: "Milestone completed" }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Milestone completed" }).waitFor();
  await page.getByRole("link", { name: /Next milestone/ }).click();
  await page.waitForURL(new RegExp(`/milestone/${p.milestoneIds[1]}$`));
  await page.goto(`${BASE}/projects/${p.id}`);
  await ready(page);
  assert.match(await page.locator("main").innerText(), /1\/4 milestones completed/);
  assert.match(await page.locator("main").innerText(), new RegExp(`Resume: ${lessons[p.milestoneIds[1]].title}`));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Download project summary/ }).click(),
  ]);
  const md = fs.readFileSync(await download.path(), "utf8");
  assert.match(md, /Milestones completed \(SQL \+ concept check\): 1 of 4/);
  assert.ok(md.includes(l.tasks[0].answer.trim()), "exported SQL matches the checked query");
  assert.match(md, /solved without hints/);
  await page.screenshot({ path: `${SHOTS}/project-deliverables.png`, fullPage: true });
  await page.context().close();
});

console.log("Advanced tools");
await test("Tools are discoverable on mobile via the header Tools menu", async () => {
  const { page } = await freshPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/sql`);
  await ready(page);
  await page.getByRole("button", { name: "SQL tools" }).click();
  for (const name of ["SQL Playground", "Database Lab", "Query Performance", "Compare SQL Syntax"]) {
    await page.locator(".rt-menu-panel").getByRole("link", { name: new RegExp(name) }).waitFor();
  }
  await page.screenshot({ path: `${SHOTS}/mobile-explore.png` });
  await page.context().close();
});

await test("Playground starter question loads a working query that runs", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/playground`);
  await ready(page);
  await page.getByRole("button", { name: /Paid revenue/ }).click();
  await page.getByRole("button", { name: "Run query" }).click();
  await page.waitForSelector(".results-panel table");
  assert.match(await page.locator(".results-panel").innerText(), /revenue/);
  await page.screenshot({ path: `${SHOTS}/playground.png` });
  await page.context().close();
});

await test("Database Lab: all experiments listed; running one returns rows", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/database-lab`);
  await ready(page);
  for (const e of pack.labExperiments) assert.equal(await page.getByRole("group", { name: "Choose an experiment" }).getByRole("button", { name: e.title, exact: true }).count(),1);
  await page.getByRole("button", { name: "Run query" }).click();
  await page.waitForSelector(".results-panel table");
  await page.context().close();
});

await test("Query Performance explains strategies and shows real SCAN vs SEARCH plans", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/query-performance`);
  await ready(page);
  await page.getByText("How to read a query plan",{exact:true}).click();
  assert.match(await page.locator("main").innerText(), /SCAN reads rows/);
  // Plans run on open; the summary reports the observed equivalence.
  await page.getByText("Both return identical rows", { exact: false }).waitFor();
  assert.match(await page.locator("main").innerText(), /SEARCH/);
  await page.context().close();
});

console.log("Mobile practice");
await test("Mobile: challenge prompt, tables, editor, run and results usable at 320px", async () => {
  const { page } = await freshPage({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/lesson/${first}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await page.locator(".cm-content").waitFor();
  assert.ok(await page.locator(".task-pane h2").isVisible());
  await typeSql(page, lessons[first].tasks[0].answer);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(overflow, false, "no horizontal page scroll");
  await page.locator(".results-panel").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/mobile-320-practice-result.png` });
  const nav = await page.locator(".rt-header").boundingBox();
  const btn = await page.getByRole("button", { name: "Check answer" }).boundingBox();
  assert.ok(nav && btn, "bounding boxes");
  await page.context().close();
});

await test("Keyboard: skip link, search dialog traps focus and Escape restores focus", async () => {
  const { page } = await freshPage();
  await page.goto(BASE);
  await ready(page);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), "Skip to content");
  await page.getByRole("button", { name: "Open search" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog", { name: "Search SQL Studio" }).waitFor();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), "focus stays in dialog");
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Open search");
  await page.context().close();
});

console.log("Beta-readiness sprint features");
await test("Beginner starter: click anywhere in the editor and type — the SQL runs (not commented out)", async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { page } = await freshPage({ viewport: vp, hasTouch: vp.width < 500 });
    await page.goto(`${BASE}/lesson/${first}`);
    await page.getByRole("button", { name: /Try it yourself/ }).click();
    const editor = page.locator(".cm-content");
    await editor.waitFor();
    assert.equal(await editor.innerText(), "SELECT \nFROM customers;");
    await editor.focus();
    await page.keyboard.type("name, city");
    assert.equal(await editor.innerText(), "SELECT name, city\nFROM customers;", "cursor starts after SELECT");
    await page.getByRole("button", { name: "Check answer" }).click();
    await page.locator(".results-panel .feedback-ok").waitFor();
    await page.screenshot({ path: `${SHOTS}/starter-${vp.width}.png` });
    await page.context().close();
  }
});

await test("Old comment-only drafts are replaced by the scaffold; real drafts are kept", async () => {
  const { page } = await freshPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("s")) return;
    sessionStorage.setItem("s", "1");
    localStorage.setItem("sql-studio-v1", JSON.stringify({ version: 3, state: { version: 3, stats: {}, history: [], drafts: { "sql-lesson-0-0": "-- Meet your first SELECT\n-- Challenge 1: x\n\n", "sql-lesson-0-1": "SELECT name FROM products" }, attempts: {}, sessions: {}, projects: {}, reviews: {}, preferences: { theme: "system", collapsed: false }, active: null, lastProject: null, placement: null } }));
  });
  await page.goto(`${BASE}/lesson/0`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  assert.equal(await page.locator(".cm-content").innerText(), "SELECT \nFROM customers;");
  await page.getByRole("button", { name: /^Challenge 2/ }).click();
  await page.waitForFunction(() => document.querySelector(".cm-content")?.textContent === "SELECT name FROM products");
  await page.context().close();
});

await test("Errors are explained in plain language with the technical message available", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/lesson/${first}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await typeSql(page, "SELECT nme FROM customers");
  await page.getByRole("button", { name: "Run query" }).click();
  const box = page.locator(".explanation");
  await box.waitFor();
  assert.match((await box.innerText()).replace(/\s+/g, " "), /There is no column called nme .*Did you mean name\?/);
  await box.getByText("Technical details").click();
  assert.match((await box.innerText()).replace(/\s+/g, " "), /no such column: nme/);
  await page.screenshot({ path: `${SHOTS}/error-explanation.png` });
  await typeSql(page, "SELECT * FROM customers");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".explanation.result").waitFor();
  assert.match((await page.locator(".explanation").innerText()).replace(/\s+/g, " "), /Too many columns.*SELECT \*/);
  await page.screenshot({ path: `${SHOTS}/result-explanation.png` });
  await page.context().close();
});

await test("Reveal answer: warns first, marks attempt guided, fresh attempt restores independence", async () => {
  const { page } = await freshPage();
  const id = courseOrder[2];
  await page.goto(`${BASE}/lesson/${id}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await page.getByRole("button", { name: /Show the answer/ }).click();
  assert.match(await page.locator(".task-pane").innerText(), /will count as solved with help/);
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  assert.ok((await page.locator(".task-pane pre").innerText()).includes(lessons[id].tasks[0].answer));
  await page.screenshot({ path: `${SHOTS}/reveal-answer.png`, fullPage: true });
  await page.getByRole("button", { name: /Put it in the editor/ }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel").getByText(/solved with help/).waitFor();
  assert.deepEqual((await saved(page)).stats[id].solved, [], "guided solve doesn't count");
  await page.reload();
  await page.locator(".cm-content").waitFor();
  assert.ok(await page.locator(".task-pane pre").isVisible(), "revealed state persists");
  await page.getByRole("button", { name: /Try again without hints/ }).click();
  assert.equal(await page.locator(".task-pane pre").count(), 0);
  await typeSql(page, lessons[id].tasks[0].answer);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  assert.deepEqual((await saved(page)).stats[id].solved, [0]);
  await page.context().close();
});

await test("Spaced review: due review → recall + query → level and next date advance; persists", async () => {
  const { page } = await freshPage();
  await page.addInitScript(() => {
    if (sessionStorage.getItem("s")) return;
    sessionStorage.setItem("s", "1");
    const s = { attempts: 2, correct: 2, solved: [0, 1], last: 1, errors: 0, check: true, legacy: false, masteredAt: 1, categories: {}, quizAttempts: 1 };
    localStorage.setItem("sql-studio-v1", JSON.stringify({ version: 3, state: { version: 3, stats: { 0: s, 1: s }, history: [{ id: 0, ok: true, time: 1 }], drafts: {}, attempts: {}, sessions: {}, projects: {}, reviews: { 0: { level: 0, due: Date.now() - 3 * 86400000, history: [] }, 1: { level: 0, due: Date.now() - 1000, history: [] } }, preferences: { theme: "system", collapsed: false }, active: null, lastProject: null, placement: null } }));
  });
  await page.goto(BASE);
  await ready(page);
  assert.match(await page.locator("main").innerText(), /2\s*Reviews ready/);
  await page.getByRole("link", { name: /2\s*Reviews ready/ }).click();
  await page.waitForURL(/\/review$/);
  assert.match(await page.locator("main").innerText(), /Ready for 3 days/);
  await page.screenshot({ path: `${SHOTS}/reviews-due.png`, fullPage: true });
  await page.getByRole("link", { name: new RegExp(lessons[0].title) }).first().click();
  await page.waitForURL(/\/review\/0$/);
  await page.getByRole("button", { name: lessons[0].quiz.options[lessons[0].quiz.correct], exact: true }).click();
  await page.getByRole("button", { name: /Next: write the query/ }).click();
  await typeSql(page, lessons[0].tasks[0].answer);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.getByRole("heading", { name: "Still remembered." }).waitFor();
  assert.match(await page.locator("main").innerText(), /Next review in 3 days/);
  await page.screenshot({ path: `${SHOTS}/review-complete.png`, fullPage: true });
  let s = await saved(page);
  assert.equal(s.reviews[0].level, 1);
  assert.ok(s.reviews[0].due > Date.now() + 2.9 * 86400000);
  // Second review: give up → back to level 0, due tomorrow; mastery kept.
  await page.getByRole("link", { name: /Next review/ }).click();
  await page.waitForURL(/\/review\/1$/);
  await page.getByRole("button", { name: lessons[1].quiz.options[lessons[1].quiz.correct], exact: true }).click();
  await page.getByRole("button", { name: /Next: write the query/ }).click();
  await page.getByRole("button", { name: /I’m stuck/ }).click();
  await page.getByRole("button", { name: "Show answer", exact: true }).click();
  await page.getByRole("heading", { name: "Worth another look." }).waitFor();
  s = await saved(page);
  assert.equal(s.reviews[1].level, 0);
  assert.ok(s.reviews[1].due > Date.now() + 0.9 * 86400000 && s.reviews[1].due < Date.now() + 1.1 * 86400000);
  assert.deepEqual(s.stats[1].solved, [0, 1], "mastery untouched");
  await page.reload();
  await page.goto(`${BASE}/review`);
  await ready(page);
  assert.match(await page.locator("main").innerText(), /No reviews are ready yet/);
  await page.context().close();
});

await test("Placement: answer, skip, result recommends the right lesson; nothing mastered", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/placement`);
  await page.waitForURL(/\/placement$/);
  await page.getByRole("button", { name: /Start the check/ }).click();
  await typeSql(page, lessons[0].tasks[0].answer);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel").getByRole("button", { name: /Next question/ }).click();
  await page.screenshot({ path: `${SHOTS}/placement-question.png` });
  for (let i = 1; i < 6; i++) await page.getByRole("button", { name: /skip|Skip and finish/ }).click();
  await page.getByRole("heading", { name: new RegExp(`Start with “${lessons[3].title}”`) }).waitFor();
  await page.screenshot({ path: `${SHOTS}/placement-result.png`, fullPage: true });
  const s = await saved(page);
  assert.equal(Object.keys(s.stats).length, 0);
  await page.goto(BASE);
  await ready(page);
  const path = `#module-${lessons[3].group}`;
  assert.match(await page.locator(path).getAttribute("href") ?? "", /\/(lesson\/3|learn\/sql\/filter-with-where)$/);
  await page.context().close();
});

await test("CRM + ERP project shows 5 phases in milestone order; findings saved and exported", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/projects/4`);
  await ready(page);
  for (const t of ["1 · Land the sources", "2 · Integrate and validate", "3 · Quality gates and stable keys", "4 · History and safe loading", "5 · Trusted reporting"])
    await page.getByRole("heading", { name: t }).waitFor();
  const nums = await page.locator(".index-row .module-id").allInnerTexts();
  assert.deepEqual(nums, Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")));
  await page.screenshot({ path: `${SHOTS}/project-phases.png`, fullPage: true });
  await page.goto(`${BASE}/projects/4/milestone/76`);
  await page.getByRole("navigation",{name:"Project steps"}).getByRole("button",{name:/Write SQL/}).click();
  await page.getByLabel(/What did you find/).fill("CRM landed all rows; ERP is short by one.");
  await page.reload();
  await page.locator(".cm-content").waitFor();
  assert.equal(await page.getByLabel(/What did you find/).inputValue(), "CRM landed all rows; ERP is short by one.");
  await page.goto(`${BASE}/projects/4`);
  await ready(page);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download project summary/ }).click()]);
  assert.match(fs.readFileSync(await download.path(), "utf8"), /\*\*Findings\*\*\n\nCRM landed all rows; ERP is short by one\./);
  await page.context().close();
});

await test("Mobile practice: task bar appears when the prompt scrolls away; header stays available while typing; actions stay on screen", async () => {
  const { page } = await freshPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/lesson/${courseOrder[4]}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  await page.locator(".cm-content").waitFor();
  const bar = page.locator(".mobile-task-bar");
  assert.equal(await bar.isVisible(), false, "hidden while the full prompt is on screen");
  await page.locator(".cm-content").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 500));
  await bar.waitFor({ state: "visible" });
  assert.ok((await bar.innerText()).includes(lessons[courseOrder[4]].tasks[0].prompt.slice(0, 15)));
  await bar.getByRole("button").click();
  assert.equal(await bar.getByRole("button").getAttribute("aria-expanded"), "true");
  await page.screenshot({ path: `${SHOTS}/mobile-taskbar.png` });
  await page.locator(".cm-content").focus();
  assert.equal(await page.locator(".rt-header").count(), 1, "header remains available while editing");
  // Simulate the keyboard taking half the screen: actions must still be inside the visible area.
  await page.setViewportSize({ width: 375, height: 360 });
  await page.locator(".cm-content").scrollIntoViewIfNeeded();
  const btn = await page.getByRole("button", { name: "Check answer" }).boundingBox();
  assert.ok(btn && btn.y >= 0 && btn.y + btn.height <= 360, `Check answer visible (y=${btn?.y})`);
  await page.screenshot({ path: `${SHOTS}/mobile-keyboard-sim.png` });
  await page.locator(".cm-content").blur();
  await page.mouse.click(5, 5);
  await page.context().close();
});

await test("Editor suggestions appear only on request and list this exercise's columns", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/lesson/${first}`);
  await page.getByRole("button", { name: /Try it yourself/ }).click();
  const editor = page.locator(".cm-content");
  await editor.waitFor();
  await editor.focus();
  await page.keyboard.type("na");
  await page.waitForTimeout(400);
  assert.equal(await page.locator(".cm-tooltip-autocomplete").count(), 0, "no pop-up while typing");
  await page.keyboard.press("Control+Space");
  const box = page.locator(".cm-tooltip-autocomplete");
  await box.waitFor();
  assert.match(await box.innerText(), /\bname\b/);
  await page.screenshot({ path: `${SHOTS}/editor-suggestions.png` });
  await page.keyboard.press("Escape");
  await page.context().close();
});

console.log("Practice question bank");
await test("Browse: difficulty and topic filters, URL state", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/questions`);
  await ready(page);
  const countText = async () => Number((await page.getByRole("status").filter({ hasText: /questions?$/ }).innerText()).match(/of (\d+) questions/)[1]);
  const independent = await countText();
  assert.ok(independent >= 80 && independent < 120, `independent default listed ${independent}`);
  assert.equal(await page.getByLabel("Source", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Type", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Search questions").count(), 0);
  const total = await countText();
  await page.getByLabel("Difficulty",{exact:true}).selectOption("hard");
  await page.waitForURL(/difficulty=hard/);
  const hard = await countText();
  assert.ok(hard > 0 && hard < total);
  assert.equal(await page.locator(".index-row .difficulty").filter({ hasNotText: "Hard" }).count(), 0);
  await page.getByLabel("Topic",{exact:true}).selectOption("windows");
  await page.waitForURL(/topic=windows/);
  await page.getByRole("link", { name: /Longest login streak/ }).waitFor();
  await page.screenshot({ path: `${SHOTS}/qb-hub-filtered.png`, fullPage: true });
  await page.goto(`${BASE}/practice/questions?topic=analytics`);
  await page.getByRole("link", { name: /Median order value by region/ }).waitFor();
  await page.context().close();
});

await test("Question: task, columns, example and tables visible; preview rows; wrong answer explained; solve recorded; next question", async () => {
  const { page } = await freshPage();
  const q = { slug: "repeat-shoppers", title: "Repeat shoppers", solution: "SELECT shopper_id, COUNT(*) AS order_count FROM sales_orders GROUP BY shopper_id HAVING COUNT(*) >= 2" };
  await page.goto(`${BASE}/practice/questions?q=repeat`);
  await page.getByRole("link", { name: /Repeat shoppers/ }).click();
  await page.waitForURL(new RegExp(`/practice/${q.slug}(?:\\?|$)`));
  await page.getByRole("heading", { level: 1, name: q.title }).waitFor();
  const pane = page.locator(".task-pane");
  for (const t of ["Task", "Return", "Expected output (example)", "Tables"]) assert.ok((await pane.innerText()).toUpperCase().includes(t.toUpperCase()), t);
  assert.match(await pane.innerText(), /shopper_id[\s\S]*order_count/);
  // Sample rows are shown without a reveal control.
  assert.equal(await pane.getByRole("button", { name: /View sample data/ }).count(), 0);
  await pane.locator("table.results-table").nth(1).waitFor();
  const editor = page.locator(".cm-content");
  assert.equal(await editor.innerText(), "SELECT \nFROM ");
  await typeSql(page, "SELECT shopper_id, COUNT(*) AS order_count FROM sales_orders GROUP BY shopper_id HAVING COUNT(*) > 2");
  await page.getByRole("button", { name: "Run query" }).click();
  await page.waitForSelector(".results-panel table");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".explanation.result").waitFor();
  assert.match((await page.locator(".explanation").innerText()).replace(/\s+/g, " "), /Too few rows/);
  await typeSql(page, q.solution);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  await page.screenshot({ path: `${SHOTS}/qb-solved.png`, fullPage: true });
  const s = await saved(page);
  assert.equal(s.questions["qb-0011"].solved, true);
  assert.deepEqual(s.stats, {}, "lesson mastery untouched");
  await page.reload();
  await page.locator(".cm-content").waitFor();
  assert.match(await page.locator("main").innerText(), /Solved/);
  assert.ok((await page.locator(".cm-content").innerText()).includes("HAVING COUNT(*) >= 2"), "draft kept");
  await page.goto(`${BASE}/practice/${q.slug}`);
  await page.locator(".cm-content").waitFor();
  await typeSql(page, q.solution);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel").getByRole("link", { name: /Next question:/ }).click();
  await page.waitForURL(/\/practice\/(?!repeat-shoppers)/);
  await page.goto(`${BASE}/practice`);
  await page.getByRole("link", { name: "Continue practice",exact:true }).waitFor();
  assert.match(await page.locator('[aria-label="Practice summary"]').innerText(), /1 \/ 249/);
  await page.context().close();
});

await test("Question guidance: hint → guided solve doesn't count; solution needs confirmation; fresh attempt restores", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/office-locations`);
  await page.locator(".cm-content").waitFor();
  await page.getByRole("button", { name: /Show a hint/ }).click();
  await typeSql(page, "SELECT DISTINCT location FROM departments");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel").getByText(/solved with help/).waitFor();
  let s = await saved(page);
  assert.equal(s.questions["qb-0007"].solved, false);
  assert.equal(s.questions["qb-0007"].guidedSolved, true);
  await page.getByRole("button", { name: /Show the solution/ }).click();
  assert.match(await page.locator(".task-pane").innerText(), /will count as solved with help/);
  await page.getByRole("button", { name: "Show solution", exact: true }).click();
  await page.locator(".task-pane pre").waitFor();
  await page.getByRole("button", { name: /Try again without hints/ }).click();
  assert.equal(await page.locator(".task-pane pre").count(), 0);
  await typeSql(page, "SELECT DISTINCT location FROM departments");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  s = await saved(page);
  assert.equal(s.questions["qb-0007"].solved, true);
  await page.context().close();
});

await test("Lab question: write-enabled script with object checks", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/create-a-wishlist-table`);
  await page.locator(".cm-content").waitFor();
  await typeSql(page, "CREATE TABLE wishlist(shopper_id INTEGER, item_id INTEGER, added_on TEXT); INSERT INTO wishlist VALUES (1, 12, '2025-03-01'), (2, 4, '2025-03-02'); SELECT * FROM wishlist ORDER BY shopper_id;");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".explanation.result").waitFor();
  assert.match((await page.locator(".explanation").innerText()).replace(/\s+/g, " "), /database object/);
  await typeSql(page, "CREATE TABLE wishlist(shopper_id INTEGER NOT NULL, item_id INTEGER NOT NULL, added_on TEXT, PRIMARY KEY(shopper_id, item_id)); INSERT INTO wishlist VALUES (1, 12, '2025-03-01'), (2, 4, '2025-03-02'); SELECT * FROM wishlist ORDER BY shopper_id;");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  await page.context().close();
});

await test("Lesson challenges in Practice open the lesson on that challenge", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice?source=lessons&q=price%20*%202`);
  await page.getByRole("link", { name: new RegExp(`${lessons[1].title} · Challenge 1`) }).click();
  await page.waitForURL(/\/lesson\/1\?challenge=1&return=/);
  await page.locator(".cm-content").waitFor();
  assert.match(await page.locator('[aria-current="step"]').innerText(), /Practice/);
  assert.equal(await page.getByRole("button", { name: /^Challenge 1/ }).getAttribute("aria-pressed"), "true");
  await page.context().close();
});

await test("Mobile question: task reminder while editing, actions reachable, no overflow", async () => {
  const { page } = await freshPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/practice/longest-login-streak`);
  await page.locator(".cm-content").waitFor();
  await page.locator(".cm-content").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 400));
  await page.locator(".mobile-task-bar").waitFor({ state: "visible" });
  await page.locator(".cm-content").focus();
  assert.equal(await page.locator(".mobile-nav").count(), 0);
  const btn = await page.getByRole("button", { name: "Check answer" }).boundingBox();
  assert.ok(btn && btn.y + btn.height <= 667);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await page.screenshot({ path: `${SHOTS}/qb-mobile-editing.png` });
  await page.context().close();
});

console.log("Practice tracks");
await test("Tracks: hub lists six tracks; start a track; banner + next in track; progress shared with browser; resume after refresh", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/tracks`);
  await ready(page);
  const trackRows = page.locator(".discovery-row");
  assert.equal(await trackRows.count(), 6);
  for (const t of ["SQL from Zero", "Master SQL Joins", "SQL Interview Essentials", "Advanced SQL Challenges", "Real-World Data Analytics", "SQL for Data Engineers"])
    await page.getByRole("link", { name: new RegExp(t) }).first().waitFor();
  await page.getByRole("link", { name: /SQL from Zero/ }).click();
  await page.waitForURL(/\/practice\/tracks\/sql-from-zero$/);
  await page.getByRole("heading", { level: 1, name: "SQL from Zero" }).waitFor();
  assert.match(await page.locator("main").innerText(), /0 of 13 solved/);
  await page.screenshot({ path: `${SHOTS}/track-light.png`, fullPage: true });
  await page.getByRole("link", { name: /Start track: 1\. Shopper contact list/ }).click();
  await page.waitForURL(/\/practice\/shopper-contact-list\?track=sql-from-zero$/);
  assert.match(await page.locator("main").innerText(), /SQL from Zero[\s\S]*Question 1 of 13/);
  await typeSql(page, "SELECT name, email FROM shoppers");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  await page.locator(".results-panel").getByRole("link", { name: /Next in track: 2\./ }).click();
  await page.waitForURL(/\/lesson\/1\?challenge=1&track=sql-from-zero$/);
  await page.locator(".cm-content").waitFor();
  assert.match(await page.locator("main").innerText(), /SQL from Zero[\s\S]*Question 2 of 13/);
  await typeSql(page, lessons[1].tasks[0].answer);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel").getByRole("link", { name: /Next in track: 3\./ }).waitFor();
  await page.reload();
  await page.goto(`${BASE}/practice`);
  await page.getByRole("link", { name: "Continue practice",exact:true }).waitFor();
  assert.match(await page.locator(".continuation").innerText(), /SQL from Zero/);
  await page.goto(`${BASE}/practice/tracks/sql-from-zero`);
  assert.match(await page.locator("main").innerText(), /2 of 13 solved/);
  await page.getByRole("link", { name: /Continue: 3\./ }).waitFor();
  // Shared completion: the same question shows solved in the browser.
  await page.goto(`${BASE}/practice?q=shopper%20contact`);
  assert.match(await page.locator("ul .question-row", { hasText: "Shopper contact list" }).innerText(), /Solved/);
  const s = await saved(page);
  assert.equal(s.questions["qb-0001"].solved, true);
  assert.deepEqual(s.stats[1].solved, [0]);
  assert.equal(s.stats[1].check, false, "no lesson mastery from tracks");
  await page.context().close();
});

await test("Tracks render in dark theme and on mobile without overflow", async () => {
  const { page } = await freshPage({ colorScheme: "dark" });
  await page.goto(`${BASE}/practice`);
  await ready(page);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), "dark");
  await page.screenshot({ path: `${SHOTS}/practice-tracks-dark.png`, fullPage: true });
  await page.goto(`${BASE}/practice/tracks/advanced-challenges`);
  await ready(page);
  await page.screenshot({ path: `${SHOTS}/track-dark.png`, fullPage: true });
  await page.context().close();
  const m = await freshPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, colorScheme: "dark" });
  await m.page.goto(`${BASE}/practice/tracks/master-joins`);
  await ready(m.page);
  assert.equal(await m.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  await m.page.getByRole("link", { name: /Start track/ }).click();
  await m.page.waitForURL(/track=master-joins/);
  await m.page.locator(".cm-content").waitFor();
  assert.match(await m.page.locator("main").innerText(), /Master SQL Joins/);
  await m.page.screenshot({ path: `${SHOTS}/track-mobile-dark.png` });
  await m.page.goto(`${BASE}/practice`);
  await ready(m.page);
  await m.page.screenshot({ path: `${SHOTS}/practice-tracks-mobile.png`, fullPage: true });
  await m.ctx.close();
});

await test("Track and browser lists use concise lesson titles, retaining full tasks in workspaces", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/tracks/sql-from-zero`);
  const row = page.locator('ol[aria-label="Questions in this track"] a[href="/lesson/1?challenge=1&track=sql-from-zero"]');
  await row.waitFor();
  assert.ok((await row.innerText()).includes(`${lessons[1].title} · Challenge 1`));
  assert.ok(!(await row.innerText()).includes(lessons[1].tasks[0].prompt));
  await row.click();
  await page.locator("#challenge-prompt").waitFor();
  assert.equal(await page.locator("#challenge-prompt").innerText(), lessons[1].tasks[0].prompt);
  await page.getByRole("link", { name: `Learn this concept: ${lessons[1].title}`, exact: true }).click();
  await page.waitForURL(/lesson\/1\?stage=understand$/);
  await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

await test("Learn this concept opens Understand and Back preserves the draft, track, and independent attempt", async () => {
  const { page } = await freshPage();
  // Save the prerequisite in Practice first: the contextual link must override resume.
  await page.goto(`${BASE}/lesson/0?challenge=1`);
  await page.locator(".cm-content").waitFor();
  await page.goto(`${BASE}/practice/shopper-contact-list?track=sql-from-zero`);
  await page.locator(".cm-content").waitFor();
  await typeSql(page, "SELECT name, email FROM shoppers");
  await page.getByRole("link", { name: `Learn this concept: ${lessons[0].title}`, exact: true }).click();
  await page.waitForURL(/lesson\/0\?stage=understand$/);
  await page.getByRole("heading", { name: /^Understand:/ }).waitFor();
  await page.goBack();
  await page.locator(".cm-content").waitFor();
  assert.match(page.url(), /track=sql-from-zero/);
  assert.match(await page.locator(".cm-content").innerText(), /SELECT name, email FROM shoppers/);
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.locator(".results-panel .feedback-ok").waitFor();
  const s = await saved(page);
  assert.equal(s.questions["qb-0001"].solved, true);
  assert.equal(s.stats[0]?.check ?? false, false);
  assert.deepEqual(page.errors, []);
  await page.screenshot({ path: `${SHOTS}/prerequisite-return.png`, fullPage: true });
  await page.context().close();
});

await test("Concept links disappear after a passed concept check, including migrated mastery", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/shopper-contact-list`);
  await page.getByRole("link", { name: /^Learn this concept:/ }).waitFor();
  for (const mode of ["check", "legacy"]) {
    await page.evaluate((mode) => {
      const data = JSON.parse(localStorage.getItem("sql-studio-v1"));
      data.state.stats[0] = { attempts: 0, correct: 0, solved: [], last: 0, errors: 0,
        check: mode === "check", legacy: mode === "legacy", masteredAt: 0, categories: {}, quizAttempts: 0 };
      localStorage.setItem("sql-studio-v1", JSON.stringify(data));
    }, mode);
    await page.reload();
    await page.locator(".cm-content").waitFor();
    assert.equal(await page.getByRole("link", { name: /^Learn this concept:/ }).count(), 0);
  }
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

await test("Browser SQL worker loads plan validation and rejects an unused required index", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice`);
  await ready(page);
  const grades = await page.evaluate(async () => {
    const worker = new Worker("/vendor/engine.js");
    await new Promise((resolve, reject) => {
      worker.onmessage = e => e.data.ready ? resolve() : reject(new Error(e.data.error));
      worker.onerror = reject;
    });
    const seed = `CREATE TABLE lookup(id INTEGER PRIMARY KEY, account INTEGER, amount INTEGER);
      WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<12000)
      INSERT INTO lookup SELECT x,x%1000,x*3 FROM n;`;
    const index = "CREATE INDEX chosen ON lookup(account);";
    const query = "SELECT id,amount FROM lookup WHERE account=42 ORDER BY id";
    const run = sql => new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("worker timeout")), 3000);
      worker.onmessage = e => { clearTimeout(timer); resolve(e.data); };
      worker.postMessage({ seed, query: sql, answer: index + query, allowWrites: true, ordered: true,
        mutation: "INSERT INTO lookup VALUES(12042,42,999);",
        planValidation: { indexes: [{ id: "lookup", table: "lookup", columns: ["account"] }],
          access: [{ index: "lookup", strategy: "search" }] } });
    });
    try {
      return [await run(index + query), await run(index + query.replace("FROM lookup", "FROM lookup NOT INDEXED"))];
    } finally { worker.terminate(); }
  });
  assert.equal(grades[0].error, undefined);
  assert.equal(grades[0].grade.ok, true);
  assert.equal(grades[1].grade.ok, false);
  assert.equal(grades[1].grade.planFailed, true);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

await test("Refined practice screens: accessible links, healthy console, desktop and mobile layouts", async () => {
  for (const width of [1440, 375]) for (const colorScheme of ["light", "dark"]) {
    const { page } = await freshPage({ viewport: { width, height: 900 }, colorScheme });
    for (const route of ["/practice/tracks/sql-from-zero", "/practice/shopper-contact-list?track=sql-from-zero", "/lesson/1?challenge=1&track=sql-from-zero"]) {
      await page.goto(BASE + route);
      await ready(page);
      if (!route.includes("/tracks/")) await page.locator(".cm-content").waitFor();
      assert.equal(new URL(page.url()).pathname, new URL(BASE + route).pathname);
      assert.match(await page.title(), /SQL Studio/);
      assert.ok((await page.locator("main").innerText()).length > 100);
      assert.equal(await page.locator("nextjs-portal").count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      assert.deepEqual(axe.violations.map(v => ({ id: v.id, impact: v.impact })), []);
    }
    assert.deepEqual(page.errors, []);
    assert.deepEqual(page.consoleIssues, []);
    await page.screenshot({ path: `${SHOTS}/concept-links-${width}-${colorScheme}.png` });
    await page.context().close();
  }
});

function bankReference(id) {
  const docs = fs.readFileSync("docs/question-bank/NEW_QUESTIONS.md", "utf8");
  const section = docs.split(`### ${id} ·`)[1];
  const match = section?.match(/```sql\n([\s\S]*?)\n```/);
  assert.ok(match, `reference SQL exists for ${id}`);
  return match[1];
}

await test("Phase B: optimization feedback separates output, index definition and access, then explains success", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/purchase-lookup-index`);
  await page.locator(".cm-content").waitFor();
  // Sample rows are shown without a disclosure.
  await page.locator("aside table.results-table").last().waitFor();
  assert.match(await page.locator(".task-pane").innerText(), /market_query_log/);
  const solution = bankReference("qb-0049");
  await typeSql(page, solution.replace("FROM market_query_log", "FROM market_query_log NOT INDEXED"));
  await checkAnswer(page);
  const feedback = page.getByRole("region", { name: "Optimization learning feedback" });
  await feedback.waitFor();
  assert.match(await feedback.innerText(), /Passed: Query output/);
  assert.match(await feedback.innerText(), /Passed: Required index/);
  assert.match(await feedback.innerText(), /Needs attention: Find matching rows with an index/);
  assert.match(await feedback.innerText(), /do not measure speed/);
  await page.screenshot({ path: `${SHOTS}/phase-b-plan-failure.png`, fullPage: true });
  await typeSql(page, solution);
  await checkAnswer(page);
  await page.locator(".results-panel > div .feedback-ok").last().waitFor();
  assert.match(await feedback.innerText(), /Different data/);
  assert.equal(await feedback.getByText(/Needs attention/).count(), 0);
  assert.match(await page.locator(".results-panel").innerText(), /Why this works/);
  const progress = await saved(page);
  assert.equal(progress.questions["qb-0049"].solved, true);
  assert.deepEqual(progress.stats, {});
  assert.deepEqual(page.errors, []);
  assert.deepEqual(page.consoleIssues, []);
  await page.screenshot({ path: `${SHOTS}/phase-b-plan-success.png`, fullPage: true });
  await page.context().close();
});

await test("Phase B: replay-safe engineering is checked through the real workspace", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice/replay-safe-ledger-load`);
  await page.locator(".cm-content").waitFor();
  const solution = bankReference("qb-0058");
  await typeSql(page, "CREATE TABLE one_shot(x);" + solution);
  await checkAnswer(page);
  assert.match(await page.locator(".results-panel").innerText(), /repeating the load/);
  await typeSql(page, solution);
  await checkAnswer(page);
  await page.locator(".results-panel .feedback-ok").waitFor();
  assert.equal((await saved(page)).questions["qb-0058"].solved, true);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

await test("Phase B: case study is discoverable, stages work independently, and drafts survive navigation", async () => {
  const { page } = await freshPage();
  await page.goto(`${BASE}/practice`);
  await page.getByRole("link", { name: /Case studies/ }).click();
  await page.getByRole("link", { name: /Harbor Market/ }).click();
  await page.waitForURL(/\/practice\/cases\/harbor-checkout-review$/);
  assert.match(await page.locator("main").innerText(), /Before you write graded SQL|session baseline/i);
  await page.getByRole("link", { name: /Start investigation/ }).click();
  await page.waitForURL(/checkout-case-session-baseline$/);
  const nav = page.getByRole("navigation", { name: "Case study navigation" });
  assert.equal(await nav.getByRole("link").count(), 5);
  assert.match(await page.getByRole("region", { name: "Case study stages" }).innerText(), /not carried forward/);
  await nav.getByRole("link", { name: "Stage 3", exact: true }).click();
  await page.waitForURL(/checkout-case-delay-tail$/);
  await page.locator(".cm-content").waitFor();
  await typeSql(page, bankReference("qb-0069"));
  await checkAnswer(page);
  await page.locator(".results-panel .feedback-ok").waitFor();
  const progress = await saved(page);
  assert.equal(progress.questions["qb-0069"].solved, true);
  assert.match(progress.drafts["sql-qb-qb-0069"], /funnel_pairs/);
  assert.equal(progress.questions["qb-0067"]?.solved ?? false, false);
  assert.deepEqual(progress.stats, {});
  assert.deepEqual(progress.projects, {});
  await nav.getByRole("link", { name: /^Stage 5/ }).click();
  await page.waitForURL(/checkout-case-channel-priorities$/);
  await page.locator(".cm-content").waitFor();
  assert.doesNotMatch(await page.locator(".cm-content").innerText(), /funnel_pairs/);
  await nav.getByRole("link", { name: /^Stage 3/ }).click();
  await page.waitForURL(/checkout-case-delay-tail$/);
  await page.locator(".cm-content").filter({ hasText: "funnel_pairs" }).waitFor();
  assert.match(await page.locator(".cm-content").innerText(), /funnel_pairs/);
  assert.deepEqual(page.errors, []);
  await page.screenshot({ path: `${SHOTS}/phase-b-case-study.png`, fullPage: true });
  await page.context().close();
});

await test("Phase B: mobile/light/dark feedback and case study pass accessibility scans", async () => {
  for (const width of [1440, 375]) for (const colorScheme of ["light", "dark"]) {
    const { page } = await freshPage({ viewport: { width, height: 900 }, colorScheme });
    for (const slug of ["purchase-lookup-index", "checkout-case-session-baseline"]) {
      await page.goto(`${BASE}/practice/${slug}`);
      await page.locator(".cm-content").waitFor();
      assert.equal(new URL(page.url()).pathname, `/practice/${slug}`);
      assert.match(await page.title(), /SQL Studio/);
      assert.equal(await page.locator("nextjs-portal").count(), 0);
      if (slug === "purchase-lookup-index") {
        await typeSql(page, bankReference("qb-0049").replace("FROM market_query_log", "FROM market_query_log NOT INDEXED"));
        await checkAnswer(page);
        await page.getByRole("region", { name: "Optimization learning feedback" }).scrollIntoViewIfNeeded();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      assert.deepEqual(scan.violations.map(v => ({ id: v.id, impact: v.impact })), []);
      await page.screenshot({ path: `${SHOTS}/phase-b-${slug}-${width}-${colorScheme}.png` });
    }
    assert.deepEqual(page.errors, []);
    assert.deepEqual(page.consoleIssues, []);
    await page.context().close();
  }
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} acceptance checks passed`);
fs.writeFileSync(`${SHOTS}/acceptance-results.json`, JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
