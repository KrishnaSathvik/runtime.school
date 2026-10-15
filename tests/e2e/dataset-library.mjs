import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.BASE_URL || 'http://127.0.0.1:3100';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const evidence = [];
try {
  await page.goto(`${base}/sql/playground`);
  await page.getByRole('heading', { name: 'SQL Playground' }).waitFor();
  await page.locator('#pg-database').selectOption('saas');
  await page.locator('.cm-editor').waitFor();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.getByText('Workspace 1', { exact: true }).last().waitFor();
  for (const edition of ['learn', 'practice', 'project']) {
    await page.locator('#pg-edition').selectOption(edition);
    await page.locator('.cm-editor').waitFor();
    const metrics = await page.evaluate(async edition => {
      const started = performance.now();
      const asset = await (await fetch(`/datasets/saas/1.0.0/${edition}.json`)).json();
      const loadMs = performance.now() - started;
      const worker = new Worker('/vendor/engine.js');
      await new Promise((resolve, reject) => { worker.onmessage = e => e.data.ready ? resolve() : reject(new Error(e.data.error)); worker.onerror = reject; });
      const results = [];
      for (const query of [
        'SELECT * FROM accounts LIMIT 20',
        'SELECT event_type, COUNT(*) AS deliveries FROM events GROUP BY event_type',
        'SELECT a.plan, COUNT(*) AS deliveries FROM accounts a JOIN events e ON e.account_id=a.id GROUP BY a.plan',
        'SELECT delivery_id, ROW_NUMBER() OVER (PARTITION BY event_key ORDER BY ingested_at DESC, delivery_id DESC) AS version_rank FROM events LIMIT 200',
      ]) {
        const start = performance.now();
        const response = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Worker exceeded 3-second query budget')), 3000);
          worker.onmessage = e => { clearTimeout(timer); resolve(e.data); };
          worker.postMessage({ seed: asset.seed, query });
        });
        if (response.error) throw new Error(response.error);
        results.push({ query, ms: Math.round(performance.now() - start), rows: response.total });
      }
      worker.terminate();
      return { edition, loadMs: Math.round(loadMs), results };
    }, edition);
    evidence.push(metrics);
  }
  fs.mkdirSync('docs/sql-rebuild/screens', { recursive: true });
  await page.screenshot({ path: 'docs/sql-rebuild/screens/playground-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'page must not overflow horizontally');
  await page.screenshot({ path: 'docs/sql-rebuild/screens/playground-mobile.png', fullPage: true });
  await page.route('**/datasets/saas/1.0.0/learn.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.locator('#pg-edition').selectOption('learn');
  await page.getByRole('alert').filter({ hasText: 'could not load' }).waitFor();
  await page.unroute('**/datasets/saas/1.0.0/learn.json');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.locator('.cm-editor').waitFor();
  fs.writeFileSync('docs/sql-rebuild/browser-performance.json', JSON.stringify({ browser: 'Playwright Chromium', viewport: '1440x1000', measurements: evidence, mobileOverflow: false, loadingRecovery: true }, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
