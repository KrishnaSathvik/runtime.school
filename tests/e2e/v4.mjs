import {chromium} from 'playwright';
import {AxeBuilder} from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE??'http://127.0.0.1:3230';
const OUT=process.env.OUT??'docs/v4/screens/after';fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch();const results=[];
async function test(name,fn){if(process.env.TEST_FILTER&&!new RegExp(process.env.TEST_FILTER).test(name))return;try{await fn();results.push({name,ok:true});console.log('PASS',name);}catch(e){results.push({name,ok:false,error:e.stack});console.log('FAIL',name,e.message);}}
const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:'light'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const go=async path=>{await page.goto(BASE+path);await page.locator('main h1').waitFor();};
const saved=async(p=page)=>p.evaluate(()=>JSON.parse(localStorage.getItem('sql-studio-v1')).state);
const predict=async text=>{await page.getByLabel('Your predicted rows').fill(text);await page.getByRole('button',{name:'Check prediction',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('section[aria-label="Predict the result"] [aria-busy="true"]'));};
const typeSql=async(sql)=>{await page.locator('.cm-content').click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText(sql);};
await test('type filter, direct link, filter restoration and independent prediction',async()=>{
 await go('/practice?type=predict');await page.getByLabel('Difficulty',{exact:true}).waitFor();await page.getByRole('navigation',{name:'Question pages'}).waitFor();
 assert.equal(await page.locator('section[aria-label="Questions"] .index-row, section[aria-label="Questions"] li').count(),6);
 await page.getByRole('link',{name:/Predict: members with and without bookings/}).click();
 await page.getByLabel('Your predicted rows').waitFor();await page.getByRole('region',{name:'Result table: id, name, team, credits',exact:true}).waitFor();
 assert.equal(await page.getByText('Expected output (example)',{exact:true}).count(),0);
 await predict('[[1,20],[1,30],[2,null],[3,null],[4,null]]');await page.getByText('Correct prediction.',{exact:false}).waitFor();
 assert.equal((await saved()).questions['qb-0072'].solved,true);assert.deepEqual((await saved()).stats,{});
 await page.reload();await page.getByText('Correct prediction.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Your predicted rows').inputValue(),'[[1,20],[1,30],[2,null],[3,null],[4,null]]');
 await page.getByRole('link',{name:'Back to questions',exact:false}).first().click();await page.waitForURL('**/practice/questions?type=predict');assert.match(page.url(),/type=predict/);
 await go('/practice/questions?type=debug');await page.waitForURL(/type=debug/);assert.equal(await page.locator('section[aria-label="Questions"] .index-row, section[aria-label="Questions"] li').count(),6);
});
await test('prediction malformed input, mismatch, reveal, guided solve and fresh independent solve',async()=>{
 await go('/practice/predict-null-comparison');await page.getByLabel('Your predicted rows').fill('[[true]]');await page.getByRole('button',{name:'Check prediction',exact:true}).click();await page.locator('.feedback-err').filter({hasText:'Use numbers'}).waitFor();
 await predict('[["3"]]');await page.getByText('Row 1 differs.',{exact:false}).waitFor();assert.equal((await saved()).questions['qb-0073'].solved,false);
 await page.getByRole('button',{name:'Show the result (with help)'}).click();await page.getByRole('heading',{name:'Actual result · shown with help'}).waitFor();
 await page.reload();await predict('[[3]]');await page.locator('.feedback-ok').filter({hasText:'Solved with help.'}).waitFor();assert.equal((await saved()).questions['qb-0073'].solved,false);
 await page.getByRole('button',{name:'Try again without hints'}).click();assert.equal(await page.getByLabel('Your predicted rows').inputValue(),'');
 assert.equal(await page.getByText('Correct prediction.',{exact:false}).count(),0);await predict('[[3]]');await page.getByText('Solved without hints.',{exact:false}).waitFor();assert.equal((await saved()).questions['qb-0073'].solved,true);
});
await test('debug starter fails; draft survives reload; alternate correction earns credit',async()=>{
 await go('/practice/debug-null-filter');await page.locator('.cm-content').waitFor();assert.match(await page.locator('.cm-content').innerText(),/credits = NULL/);
 await page.getByRole('button',{name:'Check your fix',exact:true}).click();await page.locator('.results-panel .explanation').first().waitFor();assert.equal((await saved()).questions['qb-0078'].solved,false);
 await typeSql('SELECT id FROM studio_members WHERE NOT (credits IS NOT NULL) ORDER BY id');await page.reload();await page.locator('.cm-content').waitFor();assert.match(await page.locator('.cm-content').innerText(),/NOT \(credits IS NOT NULL\)/);
 await page.getByRole('button',{name:'Check your fix',exact:true}).click();await page.locator('.results-panel .feedback-ok').first().waitFor();assert.equal((await saved()).questions['qb-0078'].solved,true);
});
await test('two tabs retain separate prediction drafts and guidance',async()=>{
 const other=await context.newPage();await other.goto(BASE+'/practice/predict-count-grain');await other.getByLabel('Your predicted rows').fill('[["Blue",2,1],["Red",2,2]]');
 await go('/practice/predict-rank-ties');await page.getByLabel('Your predicted rows').fill('[[1,1,1,1]]');
 await other.getByRole('button',{name:'Show a hint'}).click();await page.reload();assert.equal(await page.getByLabel('Your predicted rows').inputValue(),'[[1,1,1,1]]');
 const state=await saved();assert.equal(state.drafts['sql-qb-qb-0074'],'[["Blue",2,1],["Red",2,2]]');assert.equal(state.questions['qb-0074'].hints,1);await other.close();
});
await test('case stage navigation and fixed-date contracts',async()=>{
 await go('/practice/capacity-regional-snapshot');await page.getByRole('navigation',{name:'Case study navigation'}).waitFor();assert.equal(await page.getByRole('navigation',{name:'Case study navigation'}).getByRole('link').count(),5);
 await page.getByRole('link',{name:'Stage 5',exact:true}).click();await page.getByRole('heading',{name:'Capacity 5: project regional capacity at month end'}).waitFor();assert.match(await page.locator('main').innerText(),/original sample data/);assert.match(await page.locator('main').innerText(),/April 30, 2026/);
});
await test('engineering reasoning check leaves mastery unchanged',async()=>{
 await go('/projects/4/milestone/84');await page.getByText('Optional question · does not affect lesson progress').click();await page.getByLabel('Keep the newer target version and advance the checkpoint only with the successful batch').check();await page.getByText('Correct. Arrival order',{exact:false}).waitFor();assert.deepEqual((await saved()).stats,{});
});
await test('system theme changes follow the device setting',async()=>{
 await context.clearCookies();await page.emulateMedia({colorScheme:'dark'});await go('/practice/predict-peer-frames');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');await page.emulateMedia({colorScheme:'light'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');assert.equal(await page.locator('html').getAttribute('data-theme'),'light');
});
// Verify populated result states at every requested width in both themes.
const routes=[['practice','/practice?type=predict'],['predict','/practice/predict-unmatched-bookings'],['debug','/practice/debug-null-filter'],['demo','/lesson/41'],['capacity','/practice/capacity-next-deliveries']];
for(const theme of ['light','dark'])for(const width of [320,390,768,1024,1280,1440,1600]){
 await test(`${theme} ${width}px: populated V4 screens, axe and overflow`,async()=>{
  const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});const p=await ctx.newPage();
  try{for(const [name,path] of routes){
   await p.goto(BASE+path);await p.locator('main h1').waitFor();await p.waitForLoadState('networkidle');await p.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);await p.evaluate(()=>document.fonts.ready);
   if(name==='predict'){await p.getByLabel('Your predicted rows').fill('[[1,20],[1,30],[2,null],[3,null],[4,null]]');await p.getByRole('button',{name:'Check prediction',exact:true}).click();await p.getByText('Correct prediction.',{exact:false}).waitFor();}
   if(name==='debug'){await p.locator('.cm-content').waitFor();await p.getByRole('button',{name:'Check your fix',exact:true}).click();await p.locator('.results-panel .explanation').first().waitFor();}
   if(name==='demo'){await p.getByRole('button',{name:'RANGE includes ties',exact:true}).click();await p.getByText('Totals are 10, 30, 110, 110:',{exact:false}).waitFor();}
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} horizontal overflow`);
   const scan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   const serious=scan.violations.filter(v=>['serious','critical'].includes(v.impact));assert.deepEqual(serious.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,details:n.failureSummary}))})),[],`${name} accessibility`);
   if([390,1440].includes(width))await p.screenshot({path:`${OUT}/${name}-${theme}-${width}.png`,fullPage:true});
  }}finally{await ctx.close();}
 });
}
await test('private reference files are not served',async()=>{for(const path of ['/reference/sql-documents-v4/source-documents/Amazon%20Code(1).txt','/docs/audit/SQL_Studio_29_Source_Documents_V4.zip'])assert.equal((await context.request.get(BASE+path)).status(),404);});
await test('no runtime errors in learner journeys',async()=>assert.deepEqual(errors,[]));
await browser.close();fs.writeFileSync(`${OUT}/v4-results.json`,JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.ok).length}/${results.length} V4 checks passed`);if(results.some(r=>!r.ok))process.exitCode=1;
