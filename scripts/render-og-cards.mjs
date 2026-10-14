import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (name) => `file://${join(root, "public/fonts", name)}`;
const logo = `file://${join(root, "public/logo.png")}`;

const cards = [
  {
    file: "og-sql-learn.png",
    title: "Learn SQL",
    sub: "Read it. Run it.",
    line: "Lessons, two challenges, a concept check.",
    url: "runtime.school/sql",
    panel: `<p class="kicker">one lesson</p>
<ol class="steps">
  <li><span>1</span><div><b>The idea</b><em>What this query is for</em></div></li>
  <li><span>2</span><div><b>Run it</b><em>See the rows it returns</em></div></li>
  <li><span>3</span><div><b>Prove it</b><em>Two challenges, then a check</em></div></li>
</ol>`,
  },
  {
    file: "og-sql-practice.png",
    title: "SQL Practice",
    sub: "Write the query. Check it.",
    line: "Real data, graded the moment you run it.",
    url: "runtime.school/sql/practice",
    panel: `<p class="kicker">question</p>
<p class="pname">Shoppers who ordered twice</p>
<p class="ask">Count each shopper’s orders. Keep the ones with two or more.</p>
<p class="verdict">Matches the expected result</p>`,
  },
  {
    file: "og-sql-projects.png",
    title: "SQL Projects",
    sub: "A brief. Then the work.",
    line: "Milestones, evidence, and a report.",
    url: "runtime.school/sql/projects",
    panel: `<p class="kicker">project 01</p>
<p class="pname">Video Product Analytics</p>
<ol class="steps">
  <li><span>1</span><div><b>Brief</b><em>The question and the data</em></div></li>
  <li><span>2</span><div><b>Milestones</b><em>Checked work and findings</em></div></li>
  <li><span>3</span><div><b>Report</b><em>Evidence you can keep</em></div></li>
</ol>`,
  },
  {
    file: "og-sql-playground.png",
    title: "SQL Playground",
    sub: "Explore. Nothing is graded.",
    line: "Any SELECT, on a sample database.",
    url: "runtime.school/sql/playground",
    panel: `<p class="kicker">not graded</p>
<p class="pname">Pick a database</p>
<div class="picks">
  <span class="on">Shop</span>
  <span>Stream</span>
  <span>Warehouse</span>
</div>
<p class="note">Ask your own question. Nothing is scored.</p>`,
  },
  {
    file: "og-sql-lab.png",
    title: "Database Lab",
    sub: "Create, change, roll back.",
    line: "A temporary database you can reset.",
    url: "runtime.school/sql/lab",
    panel: `<p class="kicker">temporary tables</p>
<div class="schema">
  <div><b>products</b><span>id · name · price</span></div>
  <div><b>orders</b><span>id · shopper · product</span></div>
</div>
<p class="note">Change the rows, then reset the database.</p>`,
  },
  {
    file: "og-sql-query-plans.png",
    title: "Query Performance",
    sub: "See why a query is faster.",
    line: "Real plans for indexes, sorts, and joins.",
    url: "runtime.school/sql/query-plans",
    panel: `<div class="pair">
  <div><p class="kicker">no index</p><p class="big">Reads every row</p></div>
  <div><p class="kicker">with an index</p><p class="big">Finds the row</p></div>
</div>
<p class="note">Same question. Two ways the database looks.</p>`,
  },
  {
    file: "og-sql-syntax.png",
    title: "SQL Syntax",
    sub: "One idea. Three dialects.",
    line: "SQLite, PostgreSQL, and SQL Server.",
    url: "runtime.school/sql/syntax",
    panel: `<p class="kicker">same idea</p>
<p class="pname">Today’s date</p>
<div class="engines">
  <div><b>SQLite</b></div>
  <div><b>PostgreSQL</b></div>
  <div><b>SQL Server</b></div>
</div>`,
  },
];

const htmlFor = (card) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: "Source Serif 4"; src: url("${font("source-serif-4-latin.woff2")}") format("woff2"); font-weight: 200 900; font-style: normal; }
  @font-face { font-family: "Geist Sans"; src: url("${font("geist-sans.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; }
  @font-face { font-family: "Geist Mono"; src: url("${font("geist-mono.woff2")}") format("woff2"); font-weight: 100 900; font-style: normal; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; background: #fcfbf7; color: #1c1a16; }
  .frame {
    width: 1200px; height: 630px;
    padding: 52px 60px 44px;
    display: grid;
    grid-template-columns: 1fr 500px;
    column-gap: 36px;
  }
  .copy { display: flex; flex-direction: column; min-width: 0; }
  .logo { width: 76px; height: 76px; border-radius: 18px; }
  h1 {
    margin-top: auto;
    font-family: "Source Serif 4", serif;
    font-weight: 560;
    font-size: 76px;
    letter-spacing: -0.035em;
    line-height: 0.92;
    max-width: 520px;
  }
  .sub {
    margin-top: 22px;
    font-family: "Geist Sans", sans-serif;
    font-weight: 640;
    font-size: 30px;
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .line {
    margin-top: 12px;
    font-family: "Geist Sans", sans-serif;
    font-weight: 430;
    font-size: 24px;
    letter-spacing: -0.015em;
    line-height: 1.3;
    max-width: 460px;
  }
  .url {
    margin-top: auto;
    padding-top: 36px;
    font-family: "Geist Mono", monospace;
    font-weight: 430;
    font-size: 18px;
    color: #9a958c;
  }
  .panel {
    align-self: center;
    background: #fff;
    border: 1.5px solid #e5e0d6;
    border-radius: 22px;
    padding: 32px 34px 30px;
    color: #1c1a16;
  }
  .kicker { font-family: "Geist Mono", monospace; font-size: 15px; font-weight: 480; color: #8a847a; }
  .pname { font-family: "Source Serif 4", serif; font-size: 34px; font-weight: 560; letter-spacing: -0.03em; line-height: 1.05; margin: 12px 0 18px; }
  .steps { list-style: none; margin-top: 18px; }
  .steps li { display: flex; gap: 16px; align-items: flex-start; padding: 11px 0; border-top: 1px solid #efece6; }
  .steps li:first-child { border-top: 0; padding-top: 4px; }
  .steps span { font-family: "Geist Mono", monospace; color: #9a5f1a; font-size: 16px; width: 16px; padding-top: 3px; }
  .steps b { display: block; font-family: "Geist Sans", sans-serif; font-size: 22px; font-weight: 620; letter-spacing: -0.02em; }
  .steps em { display: block; margin-top: 2px; font-style: normal; font-family: "Geist Sans", sans-serif; font-size: 17px; color: #6f6a62; }
  .ask { font-family: "Geist Sans", sans-serif; font-size: 20px; line-height: 1.35; color: #3c3934; }
  .verdict { margin-top: 22px; font-family: "Geist Sans", sans-serif; font-size: 18px; font-weight: 600; color: #2f7a45; }
  .verdict::before { content: "✓  "; }
  .picks { display: flex; gap: 10px; margin-top: 6px; }
  .picks span { font-family: "Geist Sans", sans-serif; font-size: 18px; font-weight: 560; padding: 10px 14px; border-radius: 999px; border: 1.5px solid #e5e0d6; color: #6f6a62; }
  .picks .on { background: #1c1a16; color: #fcfbf7; border-color: #1c1a16; }
  .note { margin-top: 22px; font-family: "Geist Sans", sans-serif; font-size: 18px; line-height: 1.35; color: #6f6a62; }
  .schema { margin-top: 16px; display: grid; gap: 14px; }
  .schema div { padding: 14px 16px; border-radius: 14px; background: #fcfbf7; }
  .schema b { display: block; font-family: "Geist Sans", sans-serif; font-size: 22px; font-weight: 620; }
  .schema span { display: block; margin-top: 4px; font-family: "Geist Mono", monospace; font-size: 15px; color: #6f6a62; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .pair div { padding: 18px 16px 16px; border-radius: 14px; background: #fcfbf7; min-height: 148px; }
  .big { margin-top: 14px; font-family: "Source Serif 4", serif; font-size: 32px; font-weight: 560; letter-spacing: -0.03em; line-height: 1.05; }
  .engines { margin-top: 8px; display: grid; gap: 0; }
  .engines div { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; padding: 14px 0; border-top: 1px solid #efece6; }
  .engines div:first-child { border-top: 0; }
  .engines b { font-family: "Geist Sans", sans-serif; font-size: 22px; font-weight: 620; }
  .engines span { font-family: "Geist Sans", sans-serif; font-size: 17px; color: #6f6a62; }
</style>
</head>
<body>
  <div class="frame">
    <div class="copy">
      <img class="logo" src="${logo}" alt="" />
      <h1>${card.title}</h1>
      <p class="sub">${card.sub}</p>
      <p class="line">${card.line}</p>
      <p class="url">${card.url}</p>
    </div>
    <div class="panel">${card.panel}</div>
  </div>
</body>
</html>`;

const outDir = join(root, "public");
await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const card of cards) {
  const file = join(outDir, `.og-preview-${card.file}.html`);
  await writeFile(file, htmlFor(card));
  await page.goto(`file://${file}`);
  await page.screenshot({ path: join(outDir, card.file), type: "png" });
  console.log(card.file);
}
await browser.close();
