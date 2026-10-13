import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
const checks=[];
try {
 for(const path of ['/lesson/14?stage=understand','/practice/shopper-contact-list','/projects/0/milestone/45','/settings','/sql-syntax']) {
  await page.goto('http://localhost:3040'+path);await page.locator('main h1').waitFor();
  if(path.startsWith('/lesson/14')) {
   await page.getByRole('heading',{name:'Example',exact:true}).locator('..').locator('table').waitFor();
   await page.getByRole('region',{name:'Watch a JOIN change the rows'}).locator('[aria-live] table').waitFor();
  }
  if(path.startsWith('/practice/')) await page.getByRole('button',{name:'Help / hints',exact:true}).click();
  const results=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  checks.push({path,violations:results.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>n.target)}))});
 }
 fs.writeFileSync('docs/acceptance/structural-ux/accessibility.json',JSON.stringify(checks,null,2));
 console.log(JSON.stringify(checks,null,2));assert.ok(checks.every(c=>!c.violations.some(v=>['serious','critical'].includes(v.impact))));
} finally {await browser.close();}
