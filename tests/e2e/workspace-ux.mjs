import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:3232';
const OUT = process.env.OUT ?? '/tmp/sqlstudio-workspace-ux';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const go = async path => {
  await page.goto(BASE + path);
  await page.locator('main h1').waitFor();
  await page.waitForLoadState('networkidle');
};
try {
  await go('/lesson/0?challenge=1');
  assert.match(await page.title(), /SQL Studio/);
  assert.match(await page.locator('[aria-label="Answer requirements"]').innerText(), /name, city/);
  assert.equal(await page.locator('.table-preview code').first().innerText(), 'customers');
  await page.getByRole('button', { name: 'Challenge 2', exact: true }).click();
  assert.equal(await page.locator('.table-preview code').first().innerText(), 'products');
  assert.match(await page.locator('[aria-label="Answer requirements"]').innerText(), /name, price/);
  const size = await page.locator('.sql-editor-surface').boundingBox();
  assert.ok(size.height >= 350 && size.height <= 450);
  const editorSize = await page.locator('.cm-editor').boundingBox();
  assert.ok(Math.abs(editorSize.height - size.height) < 2, 'typing surface fills the resized container');
  // Drag the editor/results divider and verify the editor grows while Run, Check and Results stay on screen.
  const before = await page.locator('.sql-editor-surface').boundingBox();
  const handle = await page.locator('.split-handle').boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + 60, { steps: 8 });
  await page.mouse.up();
  const after = await page.locator('.sql-editor-surface').boundingBox();
  assert.ok(after.height > before.height + 30, 'editor grows when dragged');
  const actions = await page.locator('.editor-actions').boundingBox();
  const results = await page.locator('.results-panel').boundingBox();
  assert.ok(actions.y + actions.height <= 1000, 'Run and Check stay visible after resizing');
  assert.ok(results.y + 120 <= 1000, 'Results stay visible after resizing');
  await page.locator('.split-handle').focus();
  await page.keyboard.press('ArrowUp');
  assert.ok((await page.locator('.sql-editor-surface').boundingBox()).height < after.height, 'divider resizes with the keyboard');
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText('SELECT name, price FROM products;');
  await page.getByRole('button', { name: 'Check answer', exact: true }).click();
  await page.locator('.results-panel .feedback-ok').waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: OUT + '/workspace-desktop.png' });
  console.log('PASS visible task context, relevant table switching, real editor resizing and SQL grading');

  await go('/database-lab');
  await page.getByRole('button', { name: 'Add constraints', exact: true }).click();
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await page.locator('.results-panel table').waitFor();
  await page.getByRole('button', { name: 'Try a duplicate tag', exact: true }).click();
  await page.getByRole('button', { name: 'Run query', exact: true }).click();
  await page.getByText('The script reached a constraint violation.', { exact: false }).waitFor();
  assert.match(await page.locator('.results-panel').innerText(), /UNIQUE|unique/);
  // A partly-run script reports what ran instead of "the query did not run".
  assert.match(await page.locator('.results-panel [data-outcome]').innerText(), /Stopped at statement \d+ · \d+ earlier statements? ran/);
  assert.match(await page.locator('[aria-label="What ran"]').innerText(), /Ran[\s\S]*Failed[\s\S]*INSERT/);
  console.log('PASS valid constraint insert followed by explained duplicate rejection');

  await go('/settings');
  const settings = await page.locator('.canvas.settings').boundingBox();
  assert.ok(settings.width > 900);
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Dark', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Open search', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  console.log('PASS wider settings, theme selection and compact header search');

  await page.setViewportSize({ width: 390, height: 850 });
  await go('/lesson/0?challenge=1');
  await page.locator('.sql-editor-surface').scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + '/workspace-mobile-dark.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  assert.deepEqual(errors, []);
  console.log('PASS mobile layout and browser console');
} finally { await browser.close(); }
