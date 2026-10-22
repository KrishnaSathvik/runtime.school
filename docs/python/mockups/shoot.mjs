// Renders every mockup at desktop and phone width, light and dark, into screens/.
//   node docs/python/mockups/shoot.mjs [page ...]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ["lesson", "practice", "project", "explorer", "playground"];
mkdirSync(path.join(dir, "screens"), { recursive: true });
const browser = await chromium.launch();
for (const [label, viewport, full] of [["desktop", { width: 1440, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: label === "mobile" ? 2 : 1 });
  for (const name of pages) for (const theme of ["light", "dark"]) {
    await page.goto(`file://${path.join(dir, name + ".html")}?theme=${theme}`);
    await page.evaluate(() => document.fonts.ready);
    // Review controls aren't part of the design; full-page phone captures show the status bar at the end.
    await page.addStyleTag({ content: `.review-bar{display:none}${full ? ".status,.hdr{position:static}" : ""}` });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) console.log(`overflow ${name} ${label} ${theme}: ${overflow}px`);
    await page.screenshot({ path: path.join(dir, "screens", `${name}-${label}-${theme}.png`), fullPage: full });
  }
  await page.close();
}
await browser.close();
console.log("ok");
