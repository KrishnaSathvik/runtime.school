import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://127.0.0.1:3232";
const lessons = [
  { id: 2, label: "beginner DISTINCT", expect: /duplicate cities|Keep each city/i },
  { id: 11, label: "beginner HAVING", expect: /Form groups|qualifying groups/i },
  { id: 14, label: "intermediate JOIN", expect: /matching keys|Combine matching/i },
  { id: 21, label: "intermediate ROW_NUMBER", expect: /Order a customer's|Number rows/i },
  { id: 35, label: "intermediate CROSS JOIN", expect: /provided three dates|Pair every date|VALUES/i },
  { id: 66, label: "advanced indexes", expect: /Plan a lookup|Add an index/i },
  { id: 71, label: "advanced Gold", expect: /Bronze sales|Assemble a fact/i },
];
const browser = await chromium.launch();
const results = [];
for (const theme of ["light", "dark"]) {
  for (const L of lessons) {
    const page = await browser.newPage();
    try {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(`${BASE}/lesson/${L.id}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.getByRole("button", { name: /Understand/i }).first().click().catch(() => {});
      const walk = page.locator("details", { has: page.locator("summary", { hasText: /Build it step by step/i }) });
      await walk.locator("summary").click();
      await page.waitForTimeout(200);
      const text = await walk.innerText();
      const hasTitle = L.expect.test(text);
      const generic = /Inspect the source|Inspect the starting state/.test(text);
      await walk.getByRole("button", { name: /Run this step/i }).first().click();
      await page.waitForTimeout(900);
      const err = await walk.getByText(/syntax error|no such/i).count();
      const ok = hasTitle && !generic && err === 0;
      results.push({ theme, id: L.id, label: L.label, ok, hasTitle, generic, err });
      console.log(`${theme} ${L.id} ${L.label}: title=${hasTitle} generic=${generic} err=${err}`);
    } catch (e) {
      results.push({ theme, id: L.id, label: L.label, ok: false, error: e.message });
      console.log(`${theme} ${L.id} FAIL ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
}
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} browser walkthrough checks passed`);
if (failed.length) process.exit(1);
