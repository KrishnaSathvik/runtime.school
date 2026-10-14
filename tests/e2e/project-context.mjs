import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const base=process.env.BASE??'http://127.0.0.1:3052';
const specs=JSON.parse(fs.readFileSync('src/content/python/journeys/specs.json','utf8')).filter(p=>p.kind==='project');
const js=ts.transpileModule(fs.readFileSync('src/content/python/journeys/guidance.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {milestoneGuidance}=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
for(const project of specs)assert.equal(milestoneGuidance[project.slug].approaches.length,project.steps.length);
const dir='docs/python/screens/project-context';fs.mkdirSync(dir,{recursive:true});
const browser=await chromium.launch();
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}});const p=await context.newPage();
  for(const project of specs) {
   await p.goto(`${base}/python/projects/${project.slug}?stage=stage-1`);
   await p.locator('.py-task-cell .cm-content').waitFor();
   await p.getByRole('heading',{name:'approach',exact:true}).waitFor();
   assert.ok((await p.locator('.rx-brief').innerText()).includes(milestoneGuidance[project.slug].approaches[0]));
   assert.equal(await p.locator('.py-file-data > details').count(),Object.keys(project.files).length);
   assert.ok((await p.locator('.rx-work').innerText()).includes(project.steps[0].prompt));
   assert.equal(await p.getByText('Source file',{exact:true}).count(),0);
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),project.slug);
   await p.getByRole('tab',{name:'Finding',exact:true}).click();await p.getByLabel('Your finding').fill('I checked the inputs and the result.');
   await p.getByRole('tab',{name:'Program',exact:true}).click();
   if(project===specs[0])assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
   await p.screenshot({path:`${dir}/${width}-${project.slug}.png`});
   console.log('PASS',width,project.slug,'guidance, data, task, finding and layout');
  }
  await p.goto(`${base}/sql/lesson/0`);await p.locator('.rx-learn-tables .rx-schema-table .rx-table').first().waitFor();
  const tables=await p.locator('.rx-learn-tables .rx-schema-table .rx-table-wrap').evaluateAll(es=>es.map(e=>({overflow:getComputedStyle(e).overflowX,scroll:e.scrollWidth,client:e.clientWidth,cells:[...e.querySelectorAll('th,td')].every(c=>c.scrollWidth<=c.clientWidth+1)})));
  assert.ok(tables.length);for(const t of tables){assert.equal(t.overflow,'visible');assert.ok(t.scroll<=t.client+1);assert.ok(t.cells);}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await p.screenshot({path:`${dir}/${width}-sql-tables.png`});console.log('PASS',width,'SQL Learn table values wrap without scroll or clipping');
  await context.close();
 }
 const p=await browser.newPage();await p.goto(`${base}/python/projects/${specs[0].slug}?stage=stage-1`);
 const editor=p.locator('.py-task-cell .cm-content');await editor.click();await p.keyboard.press(`${process.platform==='darwin'?'Meta':'Control'}+a`);await p.keyboard.insertText(specs[0].steps[0].code);
 await p.getByRole('button',{name:'Check',exact:true}).click();await p.getByLabel('Your finding').waitFor({timeout:60000});console.log('PASS real Python milestone grading still opens Finding');
}finally{await browser.close();}
