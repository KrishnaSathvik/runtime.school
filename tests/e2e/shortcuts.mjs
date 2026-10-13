// Verify native modifier labels and real editor commands across OS platforms.
// BASE=http://127.0.0.1:3217 npm run test:shortcuts
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3217';
const browser = await chromium.launch();
try {
  for (const [platform, modifier, key] of [
    ['MacIntel', '⌘', 'Meta'],
    ['Win32', 'Ctrl', 'Control'],
    ['Linux x86_64', 'Ctrl', 'Control'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(value => {
      Object.defineProperty(navigator, 'platform', { get: () => value });
    }, platform);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
    await page.goto(BASE + '/sql');
    await page.waitForFunction(t => document.querySelector('button[aria-label="Open search"]')?.title === t, `Search (${modifier} + K)`);
    assert.equal(await page.getByRole('heading', { name: 'Explore on your own' }).count(), 0);
    assert.equal(await page.locator('main a[href="/playground"]').count(), 0);
    assert.equal(await page.locator('.rt-header a[href="/playground"]').count(), 0, 'tools live inside the Tools menu');
    await page.keyboard.press(`${key}+k`);
    await page.getByRole('dialog', { name: 'Search Runtime' }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);

    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState('networkidle');
    assert((await page.locator('main').innerText()).includes(`${modifier} + Enter`));
    await page.goto(`${BASE}/practice/shopper-contact-list`);
    await page.locator('.cm-content').waitFor();
    await page.getByRole('button', { name: 'Editor shortcuts', exact: true }).click();
    const help = await page.locator('[aria-label="Keyboard shortcuts"]').innerText();
    assert(help.includes(`${modifier} + Shift + Enter`));
    assert(help.includes(`${modifier} + Z`));
    assert(help.includes('Ctrl + Space'));

    await page.locator('.cm-content').click();
    await page.keyboard.press(`${key}+a`);
    await page.keyboard.insertText('select name, email from shoppers');
    await page.keyboard.press(`${key}+Shift+f`);
    await page.waitForFunction(() => document.querySelectorAll('.cm-line').length > 1);
    await page.keyboard.press(`${key}+z`);
    await page.waitForFunction(() => document.querySelectorAll('.cm-line').length === 1);
    await page.keyboard.press(`${key}+Enter`);
    // The task also contains an example table; wait specifically for execution.
    await page.locator('.results-panel .results-table').first().waitFor();
    await page.keyboard.press(`${key}+Shift+Enter`);
    await page.locator('.results-panel .feedback-ok').first().waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`PASS ${platform}: labels, search, format, undo, run, check and Learn navigation`);
  }
} finally {
  await browser.close();
}
