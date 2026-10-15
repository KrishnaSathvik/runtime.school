/**
 * Browser verification for the canonical datasets, against a running build:
 *   npx vitest run --config vitest.scripts.config.ts scripts/canonical-e2e-fixtures.gen.ts
 *   BASE=http://127.0.0.1:3200 node tests/e2e/canonical.mjs
 * Part 1 benchmarks every dataset through the shipped worker (cold load, warm reload, query classes,
 * every Learn and Practice check). Part 2 drives real Learn and Practice flows in the UI.
 * Results: docs/canonical-rebuild/browser-results.json
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.BASE ?? 'http://127.0.0.1:3200';
const fixtures = JSON.parse(fs.readFileSync('tests/e2e/.canonical-fixtures.json', 'utf8'));
const out = 'docs/canonical-rebuild';
fs.mkdirSync(`${out}/screens`, { recursive: true });
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const browser = await chromium.launch({ headless: true });
const results = { browser: `Headless Chromium ${browser.version()}, desktop CPU (not physical mobile hardware)`, base, benchmarks: [], flows: [], pageErrors: [] };

/** Runs requests through a fresh copy of the shipped worker inside the page; returns timings and outcomes. */
async function inWorker(page, requests) {
  return page.evaluate(async (requests) => {
    const worker = new Worker('/vendor/engine.js');
    await new Promise((resolve, reject) => { worker.onmessage = (e) => (e.data.ready ? resolve() : e.data.error && reject(new Error(e.data.error))); worker.onerror = reject; });
    const outcomes = [];
    try {
      for (const request of requests) {
        const started = performance.now();
        const data = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error(`timeout: ${request.label}`)), 60000);
          worker.onmessage = (e) => { if (e.data.phase) return; clearTimeout(timer); resolve(e.data); };
          worker.postMessage(request.body);
        });
        outcomes.push({ label: request.label, ms: Math.round(performance.now() - started), rows: data.total ?? null, error: data.error ?? null, ok: data.grade ? data.grade.ok : null });
      }
    } finally { worker.terminate(); }
    return { outcomes, pageHeapBytes: performance.memory?.usedJSHeapSize ?? null };
  }, requests);
}

try {
  /* ---------------- Part 1: benchmarks ---------------- */
  for (const [id, d] of Object.entries(fixtures.datasets)) {
    const context = await browser.newContext(); // empty HTTP cache: a true cold load
    const page = await context.newPage();
    page.on('pageerror', (e) => results.pageErrors.push(`${id}: ${e.message}`));
    await page.goto(base + '/sql');
    const f = d.fact, fk = f.foreignKeys[0], pk = f.primaryKey.join(', ');
    const q = (label, query) => ({ label, body: { seed: d.seed, query } });
    const classes = [
      q('cold load + count', `SELECT COUNT(*) AS n FROM ${f.name}`),
      q('preview (12 rows)', `SELECT * FROM ${f.name} LIMIT 12`),
      q('filter', fk ? `SELECT COUNT(*) AS n FROM ${f.name} WHERE ${fk.columns[0]} = (SELECT ${fk.columns[0]} FROM ${f.name} LIMIT 1)` : `SELECT COUNT(*) FROM ${f.name} WHERE ${f.columns[1]} IS NOT NULL`),
      q('group by', fk ? `SELECT ${fk.columns[0]}, COUNT(*) AS n FROM ${f.name} GROUP BY ${fk.columns[0]} ORDER BY n DESC LIMIT 20` : `SELECT ${f.columns[1]}, COUNT(*) FROM ${f.name} GROUP BY 1 LIMIT 20`),
      q('join', fk ? `SELECT COUNT(*) AS matched FROM ${f.name} f JOIN ${fk.table} d ON ${fk.columns.map((c, i) => `f.${c} = d.${fk.references[i]}`).join(' AND ')}` : `SELECT COUNT(*) FROM ${f.name}`),
      q('window (full partition sort)', `SELECT * FROM (SELECT ${pk}, ROW_NUMBER() OVER (PARTITION BY ${fk ? fk.columns[0] : f.columns[1]} ORDER BY ${pk}) AS position FROM ${f.name}) WHERE position = 1 LIMIT 200`),
    ];
    const lessonChecks = fixtures.lessons.filter((l) => l.dataset === id).flatMap((l) => l.checks.map((c, i) => ({ label: `lesson ${l.id}/${i + 1}`, body: c })));
    const practiceChecks = fixtures.questions.filter((x) => x.dataset === id).map((x) => ({ label: `${x.id} ${x.exerciseType}`, body: x.check }));
    const first = await inWorker(page, [...classes, ...lessonChecks, ...practiceChecks]);
    // A second worker in the same tab: the asset now comes from the HTTP cache.
    const warm = await inWorker(page, [q('warm reload + count', `SELECT COUNT(*) AS n FROM ${f.name}`)]);
    await context.close();
    const all = first.outcomes;
    const errors = all.filter((o) => o.error);
    const lessons = all.filter((o) => o.label.startsWith('lesson '));
    const practice = all.filter((o) => o.label.startsWith('qb-'));
    const failedChecks = [...lessons, ...practice].filter((o) => o.ok !== true).map((o) => `${o.label}: ${o.error ?? 'not ok'}`);
    const record = {
      dataset: id, name: d.name, gzipBytes: d.asset.gzipBytes, databaseBytes: d.asset.bytes, factTable: f.name, factRows: f.rows,
      coldLoadMs: all[0].ms, warmReloadMs: warm.outcomes[0].ms,
      queries: Object.fromEntries(all.slice(1, classes.length).map((o) => [o.label, o.ms])),
      lessonChecks: { count: lessons.length, medianMs: median(lessons.map((o) => o.ms)), maxMs: Math.max(0, ...lessons.map((o) => o.ms)) },
      practiceChecks: { count: practice.length, medianMs: median(practice.map((o) => o.ms)), maxMs: Math.max(0, ...practice.map((o) => o.ms)), slowest: practice.sort((a, b) => b.ms - a.ms)[0]?.label ?? null },
      pageHeapBytes: first.pageHeapBytes, errors: errors.map((o) => `${o.label}: ${o.error}`), failedChecks,
    };
    results.benchmarks.push(record);
    console.log(`${id.padEnd(11)} cold ${record.coldLoadMs}ms warm ${record.warmReloadMs}ms | ${Object.entries(record.queries).map(([k, v]) => `${k.split(' ')[0]} ${v}`).join(', ')} | lessons ${record.lessonChecks.count} max ${record.lessonChecks.maxMs}ms | practice ${record.practiceChecks.count} max ${record.practiceChecks.maxMs}ms${failedChecks.length ? ' | FAILED ' + failedChecks.join('; ') : ''}`);
    assert.deepEqual(errors, [], `${id} query errors`);
    assert.deepEqual(failedChecks, [], `${id} checks`);
  }
  assert.equal(results.benchmarks.length, 12);

  /* ---------------- Part 2: Learn and Practice flows ---------------- */
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    const p = await context.newPage();
    p.setDefaultTimeout(60000);
    p.on('pageerror', (e) => results.pageErrors.push(`flow ${width}: ${e.message}`));
    const stored = () => p.evaluate(() => JSON.parse(localStorage.getItem('sql-studio-v1') ?? '{}').state ?? {});
    const fill = (sql) => p.locator('.cm-content[contenteditable="true"]').last().fill(sql);
    const noOverflow = async (where) => assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${where} overflows at ${width}px`);

    // Saved progress and drafts from before the rebuild survive.
    await p.goto(base + '/sql');
    await p.evaluate(() => localStorage.setItem('sql-studio-v1', JSON.stringify({ version: 3, state: { version: 3, drafts: { 'sql-qb-qb-0087': 'SELECT older_saved_work;' }, stats: { 0: { solved: [0], check: false } }, questions: { 'qb-0001': { solved: true, attempts: 1 } } } })));

    // Learn: lesson 0 end to end (both challenges and the concept check).
    const l0 = fixtures.lessons[0];
    await p.goto(base + '/sql/lesson/0');
    await p.getByRole('heading', { level: 1 }).waitFor();
    await p.getByRole('button', { name: 'Run', exact: true }).first().click();
    await p.getByRole('region', { name: 'customers sample rows' }).first().waitFor();
    await fill(l0.answers[0]);
    await p.getByRole('button', { name: 'Check', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('sql-studio-v1')).state.stats['0']?.solved?.includes(0));
    await p.getByRole('tab', { name: /^Challenge 2/ }).click();
    await fill(l0.answers[1]);
    await p.getByRole('button', { name: 'Check', exact: true }).click();
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('sql-studio-v1')).state.stats['0']?.solved?.includes(1));
    await p.getByRole('tab', { name: /^Concept check/ }).click();
    await p.locator('.rx-quiz button').nth(l0.quizCorrect).click();
    await p.waitForURL((url) => url.pathname.startsWith('/sql/lesson/') && !url.pathname.endsWith('/0'));
    await noOverflow('lesson 0');
    results.flows.push({ width, flow: 'lesson 0: run example, two checks, concept check, advance' });

    // Learn: the first lesson on each dataset loads its tables and grades challenge 1 in the UI.
    for (const id of Object.keys(fixtures.datasets)) {
      const lesson = fixtures.lessons.find((l) => l.dataset === id && l.mode !== 'lab');
      const started = Date.now();
      await p.goto(base + `/sql/lesson/${lesson.id}`);
      await p.getByRole('heading', { level: 1 }).waitFor();
      await p.getByRole('tab', { name: /^Challenge 1/ }).click().catch(() => {});
      await fill(lesson.answers[0]);
      await p.getByRole('button', { name: 'Check', exact: true }).click();
      await p.waitForFunction((lid) => JSON.parse(localStorage.getItem('sql-studio-v1')).state.stats[String(lid)]?.solved?.includes(0), lesson.id);
      await noOverflow(`lesson ${lesson.id}`);
      results.flows.push({ width, flow: `lesson ${lesson.id} (${id}) challenge 1 checked in the UI`, ms: Date.now() - started });
    }
    // Warehouse lessons show their scenario tables with sample rows.
    await p.goto(base + '/sql/lesson/71');
    const bronze = p.getByRole('region', { name: 'bronze_sales sample rows' }).first();
    await bronze.waitFor();
    assert.ok((await bronze.locator('tbody tr').count()) > 0);
    results.flows.push({ width, flow: 'lesson 71 shows its scenario table bronze_sales with sample rows' });
    if (width === 1440) await p.screenshot({ path: `${out}/screens/lesson-${width}.png` });

    // Practice: one Write question per dataset, plus a Debug and a Predict item, through the UI.
    const picks = [
      ...Object.keys(fixtures.datasets).map((id) => fixtures.questions.find((x) => x.dataset === id && x.exerciseType === 'write' && x.mode !== 'lab')),
      fixtures.questions.find((x) => x.exerciseType === 'debug'),
    ];
    for (const x of picks) {
      const started = Date.now();
      await p.goto(base + '/sql/practice/' + x.slug);
      await p.locator('.cm-content').first().waitFor();
      // Only the question's own tables are offered, each with a small preview.
      for (const t of x.tables) {
        const region = p.getByRole('region', { name: `${t} sample rows` }).first();
        if (await region.count()) assert.ok((await region.locator('tbody tr').count()) <= 20, `${x.id} ${t} preview is small`);
      }
      await fill(x.solution);
      await p.getByRole('button', { name: x.exerciseType === 'debug' ? 'Check fix' : 'Check', exact: true }).click();
      await p.waitForFunction((qid) => JSON.parse(localStorage.getItem('sql-studio-v1')).state.questions[qid]?.solved, x.id);
      await noOverflow(x.slug);
      results.flows.push({ width, flow: `${x.id} (${x.dataset}, ${x.exerciseType}) solved in the UI`, ms: Date.now() - started });
    }
    const predict = fixtures.questions.find((x) => x.id === 'qb-0074');
    await p.goto(base + '/sql/practice/' + predict.slug);
    const expected = await p.evaluate(async (check) => {
      const worker = new Worker('/vendor/engine.js');
      await new Promise((r) => { worker.onmessage = (e) => e.data.ready && r(); });
      const data = await new Promise((r) => { worker.onmessage = (e) => !e.data.phase && r(e.data); worker.postMessage({ seed: check.seed, query: check.answer }); });
      worker.terminate();
      return data.result.values;
    }, predict.check);
    await p.getByRole('region', { name: 'product_sample sample rows' }).first().waitFor();
    await p.locator('#prediction-rows').fill(JSON.stringify(expected));
    await p.getByRole('button', { name: 'Check prediction', exact: true }).click();
    await p.waitForFunction((qid) => JSON.parse(localStorage.getItem('sql-studio-v1')).state.questions[qid]?.solved, predict.id);
    results.flows.push({ width, flow: `${predict.id} predict: typed rows graded correct` });

    // Earlier slugs open the same question; earlier drafts and progress are still there.
    const aliased = fixtures.questions.find((x) => x.id === 'qb-0087');
    await p.goto(base + '/sql/practice/' + aliased.aliases[0]);
    await p.getByText(aliased.title, { exact: false }).first().waitFor();
    await p.getByText('Previous drafts preserved').first().waitFor();
    const state = await stored();
    assert.equal(state.questions['qb-0001']?.solved, true);
    assert.equal(state.drafts['sql-qb-qb-0087'], 'SELECT older_saved_work;');
    results.flows.push({ width, flow: `alias ${aliased.aliases[0]} opens ${aliased.id}; prior draft offered; prior progress kept` });
    if (width === 390) await p.screenshot({ path: `${out}/screens/practice-${width}.png`, fullPage: true });
    await context.close();
  }
  assert.deepEqual(results.pageErrors, []);
  fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(`PASS benchmarks for ${results.benchmarks.length} datasets, ${results.flows.length} UI flows, no page errors`);
} catch (error) {
  fs.writeFileSync(`${out}/browser-results.json`, JSON.stringify({ ...results, failure: String(error) }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
