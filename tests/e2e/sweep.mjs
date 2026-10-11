// Screenshot + accessibility sweep across every route, viewport and theme.
// Usage: BASE=http://localhost:3217 OUT=docs/audit/screens/before node tests/e2e/sweep.mjs [--quick]
import { chromium } from "playwright";
import fs from "fs";

const BASE = process.env.BASE ?? "http://localhost:3217";
const OUT = process.env.OUT ?? "docs/audit/screens/sweep";
const QUICK = process.argv.includes("--quick");
fs.mkdirSync(OUT, { recursive: true });

const routes = [
  ["home", "/"],
  ["questions", "/practice/questions"],
  ["track-list", "/practice/tracks"],
  ["case-list", "/practice/cases"],
  ["learn", "/learn"],
  ["module", "/learn/3"],
  ["lesson-understand", "/lesson/0"],
  ["projects", "/projects"],
  ["project", "/projects/0"],
  ["project-warehouse", "/projects/3"],
  ["milestone", "/projects/0/milestone/45"],
  ["progress", "/progress"],
  ["playground", "/playground"],
  ["database-lab", "/database-lab"],
  ["query-performance", "/query-performance"],
  ["sql-syntax", "/sql-syntax"],
  ["settings", "/settings"],
  ["explore", "/explore"],
  ["reviews", "/review"],
  ["placement", "/placement"],
  ["project-crm-erp", "/projects/4"],
  ["practice-hub", "/practice"],
  ["practice-question", "/practice/three-way-payment-reconciliation"],
  ["practice-track", "/practice/tracks/data-engineering"],
];
const viewports = QUICK
  ? [["desktop", 1440, 900], ["mobile", 390, 844]]
  : [
      ["desktop", 1440, 900],
      ["laptop", 1280, 800],
      ["tablet", 820, 1180],
      ["mobile", 390, 844],
      ["phone-375", 375, 812],
      ["phone-430", 430, 932],
      ["tablet-768", 768, 1024],
      ["narrow", 320, 640],
    ];
const themes = ["light", "dark"];

const browser = await chromium.launch();
const report = [];
for (const theme of themes) {
  for (const [vp, width, height] of viewports) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [name, path] of routes) {
      await page.goto(BASE + path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(150);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const unlabeled = [...document.querySelectorAll("button, a[href], input, select, textarea")]
          .filter((el) => {
            const visible = el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
            if (!visible || el.type === "hidden") return false;
            const name =
              el.getAttribute("aria-label") ||
              el.getAttribute("aria-labelledby") ||
              el.textContent?.trim() ||
              el.getAttribute("title") ||
              (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) ||
              el.closest("label")?.textContent?.trim();
            return !name;
          })
          .map((el) => el.outerHTML.slice(0, 120));
        const small = [...document.querySelectorAll("button, a[href]")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && (r.height < 24 || r.width < 24);
          }).length;
        const h1 = document.querySelectorAll("h1").length;
        return {
          theme: doc.dataset.theme,
          hScroll: doc.scrollWidth > doc.clientWidth + 1,
          scrollWidth: doc.scrollWidth,
          unlabeled,
          smallTargets: small,
          h1,
        };
      });
      report.push({ expectedTheme: theme, vp, name, ...metrics, errors: [...errors] });
      errors.length = 0;
      await page.screenshot({ path: `${OUT}/${vp}-${theme}-${name}.png`, fullPage: false });
    }
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
const issues = report.filter(
  (r) => r.hScroll || r.unlabeled.length || r.errors.length || r.h1 !== 1 || r.theme !== r.expectedTheme,
);
for (const r of issues) {
  console.log(
    `${r.theme}/${r.vp}/${r.name}: hScroll=${r.hScroll}(${r.scrollWidth}) h1=${r.h1} unlabeled=${r.unlabeled.length} errors=${r.errors.length}`,
    r.unlabeled.slice(0, 2),
  );
}
console.log(`checked ${report.length} screens; ${issues.length} with issues`);
await browser.close();
process.exitCode = issues.length ? 1 : 0;
