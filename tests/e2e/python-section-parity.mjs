import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
const base = process.env.BASE ?? 'http://127.0.0.1:3052';
const browser = await chromium.launch();
try {
 for (const mobile of [false,true]) {
  const context = await browser.newContext({viewport:mobile ? {width:390,height:844} : {width:1440,height:1000}});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/python`);
  await page.waitForURL('**/python/lesson/**');
  await page.getByRole('button',{name:'All lessons',exact:true}).click();
  const drawer=page.getByRole('dialog',{name:'All lessons',exact:true});
  assert.equal(await drawer.locator('ol a').count(),79);
  await drawer.getByRole('link',{name:'Course overview',exact:false}).click();
  await page.waitForURL('**/python?browse=1');
  assert.equal(await page.locator('.py-lesson-row').count(),79);
  await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Practice',exact:true}).click();
  await page.waitForURL('**/python/practice/*');
  await page.getByRole('button',{name:'All questions',exact:true}).click();
  const questions=page.getByRole('dialog',{name:'All questions',exact:true});
  assert.equal(await questions.locator('ol a').count(),120);
  const second=await questions.locator('ol a').nth(1).getAttribute('href');
  await questions.locator('ol a').nth(1).click();
  await page.waitForURL(`${base}${second}`);
  await page.goto(`${base}/python/practice`); await page.waitForURL(`${base}${second}`);
  await page.getByRole('navigation',{name:'Main',exact:true}).getByRole('link',{name:'Projects',exact:true}).click();
  await page.waitForURL('**/python/projects/*');
  await page.getByRole('link',{name:'Start the first milestone',exact:false}).waitFor();
  await page.getByRole('button',{name:'All projects',exact:true}).click();
  const projects=page.getByRole('dialog',{name:'All projects',exact:true});
  assert.equal(await projects.locator('.rx-drawer-group').count(),6);
  await page.keyboard.press('Escape');
  assert.equal(await projects.count(),0);
  await page.getByRole('link',{name:'Start the first milestone',exact:false}).click();
  await page.getByRole('tab',{name:'Program',exact:false}).waitFor();
  await page.goto(`${base}/python/projects`); await page.waitForURL(/\/python\/projects\/.+\?stage=/);
  await page.getByRole('tab',{name:'Program',exact:false}).waitFor();
  await page.getByRole('navigation',{name:'Previous',exact:true}).getByRole('link').click();
  await page.getByRole('link',{name:'Continue with the next milestone',exact:false}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual((await new AxeBuilder({page}).analyze()).violations.map(v=>v.id),[]);
  assert.deepEqual(errors,[]);
  console.log('PASS',mobile?'mobile':'desktop','section entries, drawers, resume, overview, accessibility');
  await context.close();
 }
} finally {await browser.close();}
