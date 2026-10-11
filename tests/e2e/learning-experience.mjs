import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
const BASE = process.env.BASE ?? "http://127.0.0.1:3217";
const SHOTS = process.env.SHOTS ?? "/tmp/sqlstudio-learning-qa";
fs.mkdirSync(SHOTS,{recursive:true});
const {lessons} = JSON.parse(fs.readFileSync("src/content/content-pack.json","utf8"));
const browser = await chromium.launch();
const results=[];
async function test(name,fn){try{await fn();results.push({name,ok:true});console.log(`✓ ${name}`);}catch(e){results.push({name,ok:false,error:e.message});console.error(`✗ ${name}: ${e.message}`);}}
async function fresh(options={}){
 const context = await browser.newContext({viewport:{width:1440,height:900},...options});
 const page=await context.newPage();page.issues=[];
 page.on('pageerror',e=>page.issues.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))page.issues.push(m.text());});
 return page;
}
async function type(page,sql){const editor=page.locator('.cm-content');await editor.click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(sql);}
async function seed(page,state){await page.goto(BASE);await page.locator('main h1').waitFor();await page.evaluate(s=>localStorage.setItem('sql-studio-v1',JSON.stringify({version:3,state:{version:3,...s}})),state);}
const stats={attempts:2,correct:2,solved:[0,1],check:true,legacy:false,last:1,errors:0,masteredAt:1,categories:{},quizAttempts:1};
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sql-studio-v1')).state);
async function healthy(page){assert.match(await page.title(),/SQL Studio/);assert.ok((await page.locator('main').innerText()).length>100);assert.equal(await page.locator('nextjs-portal').count(),0);assert.deepEqual(page.issues,[]);}

await test('Editor: format, undo, shortcuts and actual answer checking',async()=>{
 const p=await fresh();await p.goto(`${BASE}/lesson/0?challenge=1`);await p.locator('.cm-content').waitFor();
 const query=lessons[0].tasks[0].answer.replace(/\s+/g,' ');await type(p,query);
 await p.getByRole('button',{name:'Format SQL',exact:true}).click();
 assert.match(await p.locator('.cm-content').innerText(),/\nFROM/i);
 await p.keyboard.press('ControlOrMeta+z');assert.equal((await p.locator('.cm-content').innerText()).trim(),query.trim());
 await p.keyboard.press('ControlOrMeta+Shift+f');assert.match(await p.locator('.cm-content').innerText(),/\nFROM/i);
 await p.getByRole('button',{name:'Editor shortcuts',exact:true}).click();assert.match(await p.getByLabel('Keyboard shortcuts').innerText(),/check answer/);
 await p.locator('.cm-content').click();await p.keyboard.press('ControlOrMeta+Shift+Enter');await p.locator('.results-panel .feedback-ok').first().waitFor();
 assert.equal((await saved(p)).stats[0].solved.includes(0),true);
 await p.screenshot({path:`${SHOTS}/editor-shortcuts.png`});await healthy(p);await p.context().close();
});
await test('Placement: six answers, honest result, clean retake with no mastery',async()=>{
 const p=await fresh();await p.goto(`${BASE}/placement`);await p.getByRole('button',{name:/Start the check/}).click();
 for(const id of [0,3,5,10,32,14]){
  await type(p,lessons[id].tasks[0].answer);await p.getByRole('button',{name:'Check answer'}).click();
  await p.locator('.results-panel .feedback-ok').first().waitFor();
  await p.locator('.results-panel').getByRole('button',{name:/Next question|See my starting point/}).click();
 }
 await p.getByText(/You solved 6 of 6/).waitFor();assert.match(await p.locator('main').innerText(),/does not assess every advanced skill or complete any lessons/);
 assert.equal(Object.keys((await saved(p)).stats).length,0);
 await p.getByRole('button',{name:'Retake the check'}).click();await p.locator('.cm-content').waitFor();assert.notEqual((await p.locator('.cm-content').innerText()).trim(),lessons[0].tasks[0].answer);
 assert.equal((await saved(p)).drafts['sql-placement-0'],undefined);await healthy(p);await p.context().close();
});
await test('Review: explains due reason, preserves unfinished work, starts fresh next cycle and reveals correct variant',async()=>{
 const p=await fresh();const old=Date.now()-1000;
 await seed(p,{stats:{0:stats},reviews:{0:{level:0,due:old,history:[]}},drafts:{'sql-review-0-0':lessons[0].tasks[0].answer}});
 await p.goto(`${BASE}/review`);await p.getByText(/Your first review/).waitFor();
 await p.goto(`${BASE}/review/0`);await p.getByRole('button',{name:lessons[0].quiz.options[lessons[0].quiz.correct],exact:true}).click();await p.getByRole('button',{name:/Next: write/}).click();
 assert.notEqual((await p.locator('.cm-content').innerText()).trim(),lessons[0].tasks[0].answer);
 await type(p,'SELECT name FROM customers');await p.reload();await p.locator('.cm-content').waitFor();assert.match(await p.locator('.cm-content').innerText(),/SELECT name FROM customers/);
 await type(p,lessons[0].tasks[0].answer);await p.getByRole('button',{name:'Check answer'}).click();await p.getByText(/Next review in 3 days/).waitFor();
 const state=await saved(p);assert.equal(state.reviews[0].level,1);
 // Revisit the same variant on a later due cycle. Old query must not leak in.
 state.reviews[0]={level:1,due:Date.now()-1000,history:[{time:1,ok:true,quiz:true,sql:true},{time:2,ok:true,quiz:true,sql:true}]};
 await p.evaluate(s=>localStorage.setItem('sql-studio-v1',JSON.stringify({version:3,state:s})),state);await p.reload();
 await p.getByRole('button',{name:lessons[0].quiz.options[lessons[0].quiz.correct],exact:true}).click();await p.getByRole('button',{name:/Next: write/}).click();assert.notEqual((await p.locator('.cm-content').innerText()).trim(),lessons[0].tasks[0].answer);
 await p.getByRole('button',{name:/I’m stuck/}).click();await p.getByRole('button',{name:'Show answer',exact:true}).click();await p.getByText('Worth another look.').waitFor();
 assert.equal((await p.locator('article pre').innerText()).trim(),lessons[0].tasks[0].answer.trim());assert.equal((await saved(p)).reviews[0].level,0);
 await p.screenshot({path:`${SHOTS}/review-next-date.png`});await healthy(p);await p.context().close();
});
await test('Lesson completion links ready practice and a related track; repeated failures restore concept help',async()=>{
 const p=await fresh();await seed(p,{stats:{0:stats}});await p.goto(`${BASE}/lesson/0`);const next=p.getByRole('region',{name:'Keep learning'});await next.waitFor();
 await next.getByRole('link',{name:'SQL from Zero',exact:true}).waitFor();const practice=next.locator('a[href^="/practice/"]').filter({hasNotText:'SQL from Zero'}).first();await practice.click();await p.locator('.cm-content').waitFor();
 await type(p,'SELECT 1');for(let i=0;i<2;i++){await p.getByRole('button',{name:'Check answer'}).click();await p.locator('.results-panel .explanation').waitFor();}
 await p.getByText(/A concept refresher may help/).waitFor();await p.getByRole('link',{name:/Learn this concept/}).first().click();await p.getByRole('heading',{name:/^Understand:/}).waitFor();await healthy(p);await p.context().close();
});
await test('Teaching demos: all controls change real results on desktop/mobile in light/dark; accessibility',async()=>{
 for(const width of [1440,375])for(const colorScheme of ['light','dark']){
  const p=await fresh({viewport:{width,height:900},colorScheme});
  for(const [id,title,choices] of [
   [14,'Watch a JOIN change the rows',[['INNER JOIN',3],['LEFT JOIN',4],['Filter in ON',3],['Filter in WHERE',1]]],
   [10,'Watch GROUP BY change the grain',[['All sales',1],['By region',2],['WHERE amount > 20',2],['HAVING total > 50',1]]],
   [21,'Watch a window keep the detail',[['Partition totals',4],['Rank ties',4],['Running total',4]]]
  ]){
   await p.goto(`${BASE}/lesson/${id}?stage=understand`);const demo=p.getByRole('region',{name:title});await demo.waitFor();
   for(const [label,count]of choices){await demo.getByRole('button',{name:label,exact:true}).click();await p.waitForFunction(({title,count}) => document.querySelector(`[aria-label="${title}"] [aria-live] tbody`)?.rows.length === count,{title,count});await demo.getByText(/Why it changed:/).waitFor();assert.equal(await demo.locator('[aria-live] tbody tr').count(),count);}
   const bounds=await demo.boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width, `Demo must fit viewport: ${JSON.stringify(bounds)}`);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(axe.violations.map(v=>({id:v.id,impact:v.impact})),[]);
   await demo.scrollIntoViewIfNeeded();await p.screenshot({path:`${SHOTS}/demo-${id}-${width}-${colorScheme}.png`});await healthy(p);
  }
  await p.goto(`${BASE}/lesson/0?challenge=1`);await p.locator('.cm-content').waitFor();await p.getByRole('button',{name:'Editor shortcuts',exact:true}).click();
  const scan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(scan.violations.map(v=>v.id),[]);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await healthy(p);await p.context().close();
 }
});
await browser.close();fs.writeFileSync(`${SHOTS}/results.json`,JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.ok).length}/${results.length} passed`);process.exit(results.some(r=>!r.ok)?1:0);
