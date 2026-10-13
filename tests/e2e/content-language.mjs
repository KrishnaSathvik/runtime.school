// Content clarity regression checks, using disposable browser contexts.
import {chromium} from 'playwright';
import {AxeBuilder} from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE??'http://127.0.0.1:3232';
const OUT=process.env.OUT??'docs/ux/screens/after';fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch();const results=[],rendered=[],errors=[];let scans=0;
async function test(name,fn){try{await fn();results.push({name,ok:true});console.log('PASS',name);}catch(e){results.push({name,ok:false,error:e.stack});console.log('FAIL',name,e.message);}}
const routes=[['home','/'],['questions','/practice/questions'],['track-list','/practice/tracks'],['case-list','/practice/cases'],['learn','/learn'],['module','/learn/0'],['lesson','/lesson/0'],['database-concepts','/lesson/54'],['practice','/practice'],['write','/practice/three-way-payment-reconciliation'],['predict','/practice/predict-unmatched-bookings'],['debug','/practice/debug-null-filter'],['track','/practice/tracks/sql-from-zero'],['projects','/projects'],['project','/projects/0'],['milestone','/projects/0/milestone/45'],['playground','/playground'],['lab','/database-lab'],['performance','/query-performance'],['syntax','/sql-syntax'],['placement','/placement'],['review','/review'],['review-session','/review/0'],['settings','/settings'],['explore','/explore'],['capacity','/practice/capacity-next-deliveries']];
const go=async(p,path)=>{await p.goto(BASE+path);await p.locator('main h1').waitFor();await p.waitForLoadState('networkidle');await p.evaluate(()=>document.fonts.ready);};
const type=async(p,text)=>{await p.locator('.cm-content').click();await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText(text);};
const saved=async p=>p.evaluate(()=>JSON.parse(localStorage.getItem('sql-studio-v1')??'null')?.state??null);
for(const theme of ['light','dark'])for(const width of [390,1440]){
 await test(`${theme} ${width}px: all screens, search, clear copy and accessible labels`,async()=>{
  const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'});const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));
  try{for(const [name,path]of routes){await go(p,path);const text=await p.locator('body').innerText();rendered.push({name,path,theme,width,text});
   assert.doesNotMatch(text,/\bworkspace\b|\bfixtures?\b|independent solves?|guided attempt|plan validation|schema preserved|\bworker\b/i,`${name}: implementation language`);
   assert.equal(await p.locator('header.topbar a[href="/settings"]').count(),0);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${name}: horizontal overflow`);
   if(['home','predict','debug','project','progress','performance','practice','lesson'].includes(name))await p.screenshot({path:`${OUT}/${name}-${theme}-${width}.png`,fullPage:true});
   if(['predict','debug','project','performance','settings'].includes(name)){const axe=await new AxeBuilder({page:p}).analyze();scans++;assert.deepEqual(axe.violations.map(v=>({id:v.id,impact:v.impact})),[],name);}
  }
  await p.getByRole('button',{name:'Open search',exact:true}).click();const dialog=p.getByRole('dialog');assert.doesNotMatch(await dialog.innerText(),/Workspace/);await p.getByRole('textbox',{name:'Search',exact:true}).fill('no-such-learning-topic');await dialog.getByText(/No matches. Try a SQL keyword/).waitFor();rendered.push({name:'search-empty',theme,width,text:await dialog.innerText()});
  }finally{await ctx.close();}
 });
}
await test('help exposure and successful prediction have different, accurate labels after reload',async()=>{
 const ctx=await browser.newContext();const p=await ctx.newPage();try{
 await go(p,'/practice/predict-null-comparison');await p.getByRole('button',{name:'Show a hint',exact:true}).click();await p.getByText('Practicing with help',{exact:true}).waitFor();assert.equal((await saved(p)).questions['qb-0073'].guidedSolved,false);
 await p.getByLabel('Your predicted rows').fill('[[3]]');await p.getByRole('button',{name:'Check prediction',exact:true}).click();await p.locator('section[aria-label="Predict the result"] .feedback-ok').waitFor();await p.reload();await p.getByText('Solved with help',{exact:true}).waitFor();assert.equal((await saved(p)).questions['qb-0073'].solved,false);
 await p.getByRole('button',{name:'Try again without hints',exact:true}).click();await p.getByLabel('Your predicted rows').fill('[[3]]');await p.getByRole('button',{name:'Check prediction',exact:true}).click();await p.getByText('Solved without hints.',{exact:false}).waitFor();assert.equal((await saved(p)).questions['qb-0073'].solved,true);
 }finally{await ctx.close();}
});
await test('debug instructions and Check your fix remain usable at 320px',async()=>{
 const ctx=await browser.newContext({viewport:{width:320,height:844}});const p=await ctx.newPage();try{
 await go(p,'/practice/debug-null-filter');await p.getByText('The query in the editor has a mistake.',{exact:false}).waitFor();await p.getByRole('button',{name:'Check your fix',exact:true}).click();await p.locator('.results-panel .explanation').waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await type(p,'SELECT id FROM studio_members WHERE credits IS NULL ORDER BY id');await p.getByRole('button',{name:'Check your fix',exact:true}).click();await p.locator('.results-panel .feedback-ok').first().waitFor();assert.equal((await saved(p)).questions['qb-0078'].solved,true);
 }finally{await ctx.close();}
});
await test('SQLite errors retain the exact diagnostic in a closed disclosure',async()=>{
 const ctx=await browser.newContext();const p=await ctx.newPage();try{
 await go(p,'/playground');await type(p,'SELECT * FROM definitely_missing_table');await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.explanation-title').waitFor();const detail=p.locator('.explanation details');assert.equal(await detail.getAttribute('open'),null);await detail.locator('summary').click();assert.match(await detail.locator('pre').innerText(),/no such table: definitely_missing_table/i);
 await type(p,'SELECT id FROM customers WHERE 1=0');await p.getByRole('button',{name:'Run query',exact:true}).click();await p.getByText('No rows returned. The column names are shown above.').waitFor();
 }finally{await ctx.close();}
});
await test('backup failure explains recovery, hides diagnostics, and preserves saved progress',async()=>{
 const ctx=await browser.newContext();const p=await ctx.newPage();try{
 await go(p,'/settings');const before=await saved(p);await p.locator('input[type="file"]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":3,"stats":{},"drafts":{"x":5}}')});await p.getByText(/This backup could not be restored/).waitFor();assert.deepEqual(await saved(p),before);const detail=p.locator('details').filter({has:p.getByText('Technical details',{exact:true})});assert.equal(await detail.getAttribute('open'),null);await detail.locator('summary').click();await p.getByText('Invalid SQL drafts.',{exact:true}).waitFor();
 }finally{await ctx.close();}
});
await test('project download is clearly named and disabled until work is saved',async()=>{
 const ctx=await browser.newContext();const p=await ctx.newPage();try{await go(p,'/projects/0');await p.getByRole('heading',{name:'Project report',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Download project summary',exact:true}).isDisabled(),true);assert.match(await p.locator('main').innerText(),/No report yet|Check at least one SQL|Changes to tables do not carry over/);}finally{await ctx.close();}
});
await test('no runtime errors in content walkthroughs',async()=>assert.deepEqual(errors,[]));
await browser.close();fs.writeFileSync(`${OUT}/language-results.json`,JSON.stringify({results,scans,renderedScreens:rendered.length,errors},null,2));fs.writeFileSync(`${OUT}/rendered-copy.json`,JSON.stringify(rendered,null,2));console.log(`${results.filter(r=>r.ok).length}/${results.length} checks; ${scans} axe scans; ${rendered.length} rendered screens`);process.exitCode=results.some(r=>!r.ok)?1:0;
