import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),base='http://127.0.0.1:3100',errors=[];
page.on('pageerror',e=>errors.push(e.message));
const edit=async sql=>{const e=page.locator('.cm-content').first();await e.fill(sql);};
const run=async()=>{await page.getByRole('button',{name:'Run',exact:true}).click();};
try{
 for(const id of [13,24,27]){await page.goto(`${base}/sql/lesson/${id}`);await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.locator('body').innerText().then(t=>/Application error/.test(t)),false);}
 await page.goto(`${base}/sql/practice/library-reasoning-101`);await page.locator('#prediction-rows').waitFor();assert.equal(await page.getByText('Expected result',{exact:true}).count(),0);await page.locator('#prediction-rows').fill('[]');await page.getByRole('button',{name:'Check prediction',exact:true}).click();await page.locator('[aria-label="Predict the result"] [aria-live="polite"] .explanation').waitFor();
 await page.goto(`${base}/sql/lab?dataset=retail&experiment=scratch`);await page.locator('.cm-content').waitFor();await edit('DELETE FROM order_items; SELECT COUNT(*) AS remaining FROM order_items;');await run();await page.getByText('remaining',{exact:true}).waitFor();
 await edit('SELECT COUNT(*) AS restored_lines FROM order_items;');await run();await page.getByText('restored_lines',{exact:true}).waitFor();
 await page.goto(`${base}/sql/projects/library/retail-revenue-review`);
 await page.waitForURL(/\/sql\/projects\/retail-performance-review$/);
 await page.getByRole('button',{name:'Save & continue →'}).click();
 await page.getByRole('heading',{name:/Understand/}).waitFor();
 await page.getByRole('button',{name:'Save & continue →'}).click();
 await page.locator('.cm-content').waitFor();
 await edit('SELECT COUNT(*) AS headers FROM orders;');await run();
 await page.getByText(/Last run saved|Press Check/).waitFor();
 await page.getByPlaceholder(/Optional/).fill('Invoice headers are not payment receipts.');
 await page.reload();
 await page.getByRole('button',{name:'Save & continue →'}).click();
 await page.getByRole('button',{name:'Save & continue →'}).click();
 await page.locator('.cm-content').waitFor();
 assert.match(await page.getByPlaceholder(/Optional/).inputValue(),/payment receipts/);
 await page.getByRole('button',{name:'Hint'}).click();
 await page.getByText(/hint ›/).waitFor();
 await edit('SELECT 1 AS changed;');await page.getByText(/SQL changed|Write a query/).waitFor();
 await page.screenshot({path:'docs/sql-rebuild/screens/investigation-desktop.png',fullPage:true});
 const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();fs.writeFileSync('docs/sql-rebuild/accessibility.json',JSON.stringify(a11y.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)})),null,2)+'\n');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'docs/sql-rebuild/screens/investigation-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Switch to dark theme'}).click();await page.screenshot({path:'docs/sql-rebuild/screens/investigation-dark-mobile.png',fullPage:true});
 const darkA11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();assert.deepEqual(darkA11y.violations.map(v=>v.id),[]);
 await page.goto(`${base}/sql/query-performance?dataset=retail&comparison=retail-month-range`);await page.locator('#qp-choice').waitFor();await page.getByText(/idx_orders_ordered_at/).first().waitFor();
 assert.deepEqual(errors,[]);console.log('PASS: lessons, prediction, disposable Lab, project persistence/stale evidence/export, responsive project, real query plans');
}finally{await browser.close();}
