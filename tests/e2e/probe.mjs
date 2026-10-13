// Exploratory probe used during the post-migration audit (before fixes).
// Usage: BASE=http://localhost:3217 OUT=docs/audit/screens/before node tests/e2e/probe.mjs
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const OUT = process.env.OUT ?? "docs/audit/screens/before";
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

const store = () => page.evaluate(() => JSON.parse(localStorage.getItem("sql-studio-v1") ?? "null"));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });

// --- First-time journey -------------------------------------------------
await page.goto(BASE);
await page.waitForLoadState("networkidle");
await shot("01-home-first-visit");
await page.locator("#module-0").click();
await page.locator(".module-start").click();
await page.waitForURL(/lesson\/0/);
await page.getByRole("button", { name: /Run example/ }).click();
await page.waitForSelector("table.results-table");
await shot("02-understand-example");
await page.getByRole("button", { name: /Try it yourself/ }).click();
await page.waitForSelector(".cm-content");
await shot("03-practice-starter");
log("starter SQL:", JSON.stringify(await page.locator(".cm-content").innerText()));

const typeSql = async (sql) => {
  await page.locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText(sql);
};
await typeSql("SELECT name, city FROM customers");
await page.getByRole("button", { name: /Check answer/ }).click();
await page.waitForSelector(".feedback-ok, .feedback-err");
await shot("04-practice-check-correct");
log("after check 1:", await page.locator(".results-panel p").first().innerText());
const nextChallengeVisible = await page.getByRole("button", { name: /Next challenge/ }).count();
log("Next challenge button present:", nextChallengeVisible);

await page.getByRole("button", { name: /^Challenge 2/ }).click();
await typeSql("SELECT name, price FROM products");
await page.getByRole("button", { name: /Check answer/ }).click();
await page.waitForSelector(".feedback-ok, .feedback-err");
await shot("05-practice-both-solved");
let s = await store();
log("stats[0] after 2 solves:", JSON.stringify(s?.state?.stats?.["0"]));

// --- Refresh on the lesson page: does progress survive? ----------------
await page.reload();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);
s = await store();
log("stats[0] after reload on lesson page:", JSON.stringify(s?.state?.stats?.["0"]));
log("active after reload:", JSON.stringify(s?.state?.active));
await shot("06-after-reload");
const stageAfterReload = await page.locator(".stage.active").innerText();
log("stage after reload:", stageAfterReload);

// --- Quiz before mastery ------------------------------------------------
await page.goto(`${BASE}/lesson/1`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /review/i }).click();
const opts = page.locator("article button");
// pick correct answer by reading content pack
const quiz = await page.evaluate(async () => null);
void quiz;
await page.waitForTimeout(200);
await shot("07-review-before-practice");
const n = await opts.count();
for (let i = 0; i < n; i++) {
  await opts.nth(i).click();
  await page.waitForTimeout(100);
  if (await page.getByText(/Lesson mastered/).count()) {
    log(`Quiz option ${i} jumped to "Lesson mastered" with 0 challenges solved`);
    await shot("08-false-mastery");
    break;
  }
}
s = await store();
log("stats[1]:", JSON.stringify(s?.state?.stats?.["1"]));

// --- Hint locks attempt as guided forever --------------------------------
await page.goto(`${BASE}/lesson/2`);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: /Try it yourself/ }).click();
await page.getByRole("button", { name: /Show a hint/ }).click();
log("fresh attempt control present:", await page.getByRole("button", { name: /fresh|try again|independent/i }).count());
await shot("09-hint-guided");

// --- Next lesson link ----------------------------------------------------
log("next lesson after id 2 should be course order next (30); link target computed as id+1 in source");

log("page errors:", errors);
await browser.close();
