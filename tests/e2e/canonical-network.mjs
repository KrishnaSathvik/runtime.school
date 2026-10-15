/**
 * Cold-load time for each canonical dataset over a throttled connection (Chrome network emulation):
 *   BASE=http://127.0.0.1:3200 node tests/e2e/canonical-network.mjs
 * Writes docs/canonical-rebuild/network-results.json.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.env.BASE ?? 'http://127.0.0.1:3200';
const fixtures = JSON.parse(fs.readFileSync('tests/e2e/.canonical-fixtures.json', 'utf8'));
const profiles = [
  { name: 'broadband 50 Mbps / 20 ms', down: 50e6 / 8, latency: 20 },
  { name: 'mobile 10 Mbps / 60 ms', down: 10e6 / 8, latency: 60 },
];
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  for (const profile of profiles) {
    for (const [id, d] of Object.entries(fixtures.datasets)) {
      const context = await browser.newContext();
      const page = await context.newPage();
      // A neutral same-origin page: /sql opens a lesson, which already preloads its dataset.
      await page.goto(base + '/robots.txt');
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latency, downloadThroughput: profile.down, uploadThroughput: profile.down });
      const ms = await page.evaluate(async ({ seed, table }) => {
        const worker = new Worker('/vendor/engine.js');
        await new Promise((r) => { worker.onmessage = (e) => e.data.ready && r(); });
        const started = performance.now();
        const phases = {};
        await new Promise((resolve) => {
          worker.onmessage = (e) => { if (e.data.phase) { phases[e.data.phase] = Math.round(performance.now() - started); return; } resolve(e.data); };
          worker.postMessage({ seed, query: `SELECT COUNT(*) FROM ${table}` });
        });
        worker.terminate();
        return { total: Math.round(performance.now() - started), ...phases };
      }, { seed: d.seed, table: d.fact.name });
      rows.push({ profile: profile.name, dataset: id, gzipBytes: d.asset.gzipBytes, firstQueryMs: ms.total, databaseReadyMs: ms['database-ready'] ?? null });
      console.log(profile.name.padEnd(26), id.padEnd(11), `${(d.asset.gzipBytes / 1e6).toFixed(1)} MB`, `${ms.total} ms`);
      await context.close();
    }
  }
  fs.writeFileSync('docs/canonical-rebuild/network-results.json', JSON.stringify({ method: 'Chrome DevTools network emulation (throughput + latency), fresh browser context per dataset, headless Chromium on a desktop CPU', rows }, null, 2) + '\n');
} finally {
  await browser.close();
}
