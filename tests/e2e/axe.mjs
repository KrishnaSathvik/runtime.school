// axe-core WCAG 2.2 AA scan of every screen and key interactive states, light + dark, desktop + mobile.
// Fails on critical/serious violations. Usage: BASE=http://localhost:3217 node tests/e2e/axe.mjs
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const OUT = process.env.OUT ?? "docs/audit/screens/after";
fs.mkdirSync(OUT, { recursive: true });
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

// Seeded progress so stateful screens (reviews due, project work) have content.
const day = 86400000;
const seeded = {
  state: {
    version: 3,
    stats: { 0: { attempts: 2, correct: 2, solved: [0, 1], last: 1, errors: 0, check: true, legacy: false, masteredAt: 1, categories: {}, quizAttempts: 1 } },
    history: [{ id: 0, ok: true, time: 1 }],
    drafts: {}, attempts: {}, sessions: {},
    projects: { 4: { started: 1, last: 76, milestones: { 76: { solved: [0], check: false, queries: { 0: "SELECT 1" }, results: {}, updated: 1, notes: "Rows reconcile." } } } },
    reviews: { 0: { level: 0, due: Date.now() - day, history: [] } },
    preferences: { theme: "system", collapsed: false },
    active: { id: 0, variant: 0, stage: "complete", project: null }, lastProject: 4, placement: null,
  },
  version: 3,
};

const states = [
  ["home", "/", null],
  ["questions", "/practice/questions", null],
  ["track-list", "/practice/tracks", null],
  ["case-list", "/practice/cases", null],
  ["learn", "/learn", null],
  ["module", "/learn/3", null],
  ["lesson-understand", "/lesson/2", null],
  ["lesson-practice-error", "/lesson/2", async (p) => {
    await p.getByRole("button", { name: /Try it yourself/ }).click();
    await p.locator(".cm-content").click();
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.insertText("SELECT nme FROM customers");
    await p.getByRole("button", { name: "Run query" }).click();
    await p.locator(".explanation").waitFor();
  }],
  ["lesson-practice-wrong", "/lesson/2", async (p) => {
    await p.getByRole("button", { name: /Try it yourself/ }).click();
    await p.locator(".cm-content").click();
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.insertText("SELECT * FROM customers");
    await p.getByRole("button", { name: "Check answer" }).click();
    await p.locator(".explanation").waitFor();
  }],
  ["lesson-reveal", "/lesson/2", async (p) => {
    await p.getByRole("button", { name: /Try it yourself/ }).click();
    await p.getByRole("button", { name: /Show the answer/ }).click();
  }],
  ["lesson-review", "/lesson/2", async (p) => p.getByRole("button", { name: /^3\s*Review/ }).click()],
  ["projects", "/projects", null],
  ["project-phases", "/projects/4", null],
  ["milestone", "/projects/4/milestone/76", async (p) => p.getByRole("navigation",{name:"Project steps"}).getByRole("button", { name: /Write and check SQL/ }).click()],
  ["progress", "/progress", null],
  ["reviews", "/review", null],
  ["review-session", "/review/0", null],
  ["placement-intro", "/placement", null],
  ["placement-question", "/placement", async (p) => p.getByRole("button", { name: /Start the check/ }).click()],
  ["practice-hub", "/practice", null],
  ["practice-hub-filtered", "/practice?difficulty=hard&topic=windows&source=new", null],
  ["practice-question", "/practice/salary-at-review-time", null],
  ["practice-question-solution", "/practice/median-order-value", async (p) => {
    await p.getByRole("button", { name: /Show a hint/ }).click();
    await p.getByRole("button", { name: /Show the solution/ }).click();
    await p.getByRole("button", { name: "Show solution", exact: true }).click();
    await p.waitForTimeout(300);
  }],
  ["practice-question-wrong", "/practice/repeat-shoppers", async (p) => {
    await p.locator(".cm-content").click();
    await p.keyboard.press("ControlOrMeta+A");
    await p.keyboard.insertText("SELECT * FROM sales_orders");
    await p.getByRole("button", { name: "Check answer" }).click();
    await p.locator(".explanation").waitFor();
  }],
  ["practice-track", "/practice/tracks/master-joins", null],
  ["practice-track-question", "/practice/employees-and-departments?track=master-joins", null],
  ["lesson-in-track", "/lesson/14?challenge=1&track=master-joins", null],
  ["explore", "/explore", null],
  ["playground", "/playground", null],
  ["database-lab", "/database-lab", null],
  ["query-performance", "/query-performance", null],
  ["sql-syntax", "/sql-syntax", null],
  ["settings", "/settings", null],
  ["search-dialog", "/", async (p) => {
    await p.getByRole("button", { name: "Open search" }).click();
    await p.getByRole("dialog").waitFor();
  }],
];

const browser = await chromium.launch();
const findings = [];
let scans = 0;
for (const theme of ["light", "dark"]) {
  for (const [vp, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
    for (const [name, path, action] of states) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
      await ctx.addInitScript((data) => {
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("sql-studio-v1", JSON.stringify(data));
          sessionStorage.setItem("seeded", "1");
        }
      }, seeded);
      const page = await ctx.newPage();
      await page.goto(BASE + path);
      await page.waitForSelector("#main-content h1");
      if (action) await action(page);
      await page.waitForTimeout(250);
      const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      scans++;
      for (const v of result.violations) {
        findings.push({
          theme, vp, name, id: v.id, impact: v.impact, help: v.help,
          nodes: v.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`.trim()),
        });
      }
      await ctx.close();
    }
  }
}
await browser.close();

const blocking = findings.filter((f) => f.impact === "critical" || f.impact === "serious");
fs.writeFileSync(`${OUT}/axe-results.json`, JSON.stringify({ scans, findings }, null, 2));
const byRule = {};
for (const f of findings) (byRule[`${f.impact} ${f.id}`] ??= []).push(`${f.theme}/${f.vp}/${f.name}`);
for (const [rule, where] of Object.entries(byRule)) console.log(`${rule}: ${where.length} — ${where.slice(0, 6).join(", ")}`);
for (const f of blocking.slice(0, 12)) console.log("  ", f.name, f.theme, f.id, f.nodes[0]);
console.log(`${scans} axe scans · ${findings.length} violations · ${blocking.length} critical/serious`);
process.exit(blocking.length ? 1 : 0);
