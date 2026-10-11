// Local learner simulations; never reads or resets the user's browser profile.
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE??'http://localhost:3217';
const OUT=process.env.OUT??'docs/audit/learner-evidence';
fs.mkdirSync(OUT,{recursive:true});
const pack=JSON.parse(fs.readFileSync('src/content/content-pack.json','utf8'));
const bank=[{id:'qb-0001',slug:'shopper-contact-list',solution:'SELECT name, email FROM shoppers'},{id:'qb-0002',slug:'shoppers-in-the-west',solution:"SELECT name, region FROM shoppers WHERE region='West'"}];
const browser=await chromium.launch();
const results=[];
let lastPage;
async function test(name,fn){if(process.env.TEST_FILTER&&!new RegExp(process.env.TEST_FILTER).test(name))return;try{await fn();results.push({name,ok:true});console.log(`✓ ${name}`);}catch(e){results.push({name,ok:false,error:e.message});console.log(`✗ ${name}: ${e.message}`);if(lastPage&&!lastPage.isClosed()){await lastPage.screenshot({path:OUT+'/failure.png',fullPage:true});fs.writeFileSync(OUT+'/failure.txt',await lastPage.locator('main').innerText());}}}
async function fresh(opts={}){const ctx=await browser.newContext({viewport:{width:1440,height:900},...opts});const p=await ctx.newPage();p.setDefaultTimeout(20000);lastPage=p;return p;}
async function type(p,sql){await p.locator('.cm-content').click();await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText(sql);}
async function check(p){await p.getByRole('button',{name:'Check answer',exact:true}).click();await p.waitForTimeout(150);await p.locator('.results-panel[aria-busy="false"] .feedback-ok,.results-panel[aria-busy="false"] .explanation,article[aria-live="polite"] h2').first().waitFor();}
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('sql-studio-v1')).state);
const stat={attempts:2,correct:2,solved:[0,1],check:true,last:1,masteredAt:1,errors:0,legacy:false,categories:{},quizAttempts:1};
async function seed(p,s){await p.goto(BASE+'/progress');await p.locator('main h1').waitFor();await p.evaluate(s=>localStorage.setItem('sql-studio-v1',JSON.stringify({version:3,state:{version:3,...s}})),s);}
await test('Interrupted review restores write stage, recall, failed checks, draft and reveal confirmation',async()=>{
 const p=await fresh();await seed(p,{stats:{0:stat},reviews:{0:{level:0,due:Date.now()-1000,history:[]}}});await p.goto(BASE+'/review/0');
 await p.getByRole('button',{name:pack.lessons[0].quiz.options[pack.lessons[0].quiz.correct],exact:true}).click();await p.getByRole('button',{name:/Next: write/}).click();
 await type(p,'SELECT name FROM customers');await check(p);await p.getByRole('button',{name:/I’m stuck/}).click();
 await p.screenshot({path:OUT+'/review-before-refresh.png'});await p.reload();await p.screenshot({path:OUT+'/review-after-refresh.png'});
 await p.locator('.cm-content').waitFor();assert.match(await p.locator('.cm-content').innerText(),/SELECT name FROM customers/);await p.getByRole('button',{name:'Keep trying',exact:true}).waitFor();
 let s=await saved(p);assert.equal(s.reviewSessions[0].choice,pack.lessons[0].quiz.correct);assert.equal(s.reviewSessions[0].attempts,1);assert.equal(s.reviews[0].history.length,0);
 await p.getByRole('button',{name:'Keep trying',exact:true}).click();await type(p,pack.lessons[0].tasks[0].answer);await check(p);await p.getByText('Still remembered.').waitFor();
 s=await saved(p);assert.equal(s.reviews[0].history.length,1);await p.reload();await p.getByText('Still remembered.').waitFor();assert.equal((await saved(p)).reviews[0].history.length,1);await p.context().close();
});
await test('Progress resumes a practice-only learner',async()=>{
 const p=await fresh();await p.goto(BASE+'/practice/'+bank[0].slug);await type(p,'SELECT name');await p.goto(BASE+'/progress');await p.screenshot({path:OUT+'/home-practice.png'});
 assert.match(await p.locator('main h1').innerText(),/Your SQL progress/);const resume=p.locator('main').getByRole('link',{name:/Continue/}).first();assert.equal(await resume.getAttribute('href'),'/practice/'+bank[0].slug);await resume.click();assert.match(await p.locator('.cm-content').innerText(),/SELECT name/);await p.context().close();
});
await test('Separate tabs preserve both question drafts and shared solves',async()=>{
 const p=await fresh();await p.goto(BASE+'/practice/'+bank[0].slug);await p.locator('.cm-content').waitFor();const second=await p.context().newPage();await second.goto(BASE+'/practice/'+bank[1].slug);await second.locator('.cm-content').waitFor();
 await type(p,bank[0].solution);await check(p);await type(second,'SELECT name');
 const s=await saved(second);assert.equal(s.questions[bank[0].id]?.solved,true);assert.equal(s.drafts['sql-qb-'+bank[0].id],bank[0].solution);assert.equal(s.drafts['sql-qb-'+bank[1].id],'SELECT name');await p.context().close();
});
await test('Editing checked SQL marks displayed results as belonging to the previous query',async()=>{
 const p=await fresh();await p.goto(BASE+'/practice/'+bank[0].slug);await type(p,bank[0].solution);await check(p);await type(p,'SELECT 1');assert.match(await p.locator('.results-panel').innerText(),/previous query|draft has changed/i);await p.context().close();
});
await test('Project brief explains independent fresh databases',async()=>{
 const p=await fresh();for(const project of pack.projects){await p.goto(BASE+'/projects/'+project.id);assert.match(await p.locator('main').innerText(),/original sample data/);assert.match(await p.locator('main').innerText(),/not carried|do not carry/);}await p.context().close();
});
await test('Tracks resume the actual interrupted position even when earlier questions are unfinished',async()=>{
 const p=await fresh();for(const [track,id,href] of [
  ['sql-from-zero','lc-1-0','/lesson/1?challenge=1'],
  ['master-joins','qb-0015','/practice/employees-and-departments'],
  ['interview-essentials','qb-0011','/practice/repeat-shoppers'],
  ['advanced-challenges','lc-23-1','/lesson/23?challenge=2'],
  ['real-world-analytics','qb-0035','/practice/monthly-average-order-value'],
  ['data-engineering','qb-0023','/practice/create-a-wishlist-table']]){
  const manifest=JSON.parse(fs.readFileSync('docs/question-bank/question-manifest.json','utf8'));
  const canonical=manifest.questions.find(q=>q.id===id);const url=canonical?.href??href;
  await p.goto(BASE+url+(url.includes('?')?'&':'?')+'track='+track);await p.locator('.cm-content').waitFor();await type(p,'SELECT name -- interrupted track draft');
  await p.goto(BASE+'/practice/tracks/'+track);const resume=p.locator('main').getByRole('link',{name:/^Continue:/});await resume.waitFor();assert.equal(await resume.getAttribute('href'),url+(url.includes('?')?'&':'?')+'track='+track);await resume.click();await p.locator('.cm-content').waitFor();assert.match(await p.locator('.cm-content').innerText(),/interrupted track draft/);
 }await p.context().close();
});
await test('Progress prioritizes the most recent activity and skips solved questions',async()=>{
 const p=await fresh();await p.goto(BASE+'/lesson/0?challenge=1');await type(p,'SELECT name');await p.goto(BASE+'/practice/shopper-contact-list');await type(p,'SELECT email');await p.goto(BASE+'/progress');assert.equal(await p.locator('main').getByRole('link',{name:'Continue practice',exact:true}).getAttribute('href'),'/practice/shopper-contact-list');
 await p.goto(BASE+'/lesson/0');await p.locator('.cm-content').waitFor();await p.goto(BASE+'/progress');assert.equal(await p.locator('main').getByRole('link',{name:'Continue',exact:true}).getAttribute('href'),'/lesson/0');
 await p.goto(BASE+'/practice/shopper-contact-list');await type(p,bank[0].solution);await check(p);await p.goto(BASE+'/progress');assert.equal((await saved(p)).questions[bank[0].id].solved,true);const link=p.locator('main').getByRole('link',{name:'Continue practice',exact:true});assert.notEqual(await link.getAttribute('href'),'/practice/shopper-contact-list');await p.context().close();
});
// Every module and requested concept: read visible teaching, run examples, make an
// incorrect attempt, solve both tasks, pass recall and verify actual mastery.
for(const id of [0,3,7,9,10,11,14,15,17,20,21,26,45,58,60,66,69,77])await test(`Lesson ${id}: ${pack.lessons[id].title} full journey`,async()=>{
 const l=pack.lessons[id],p=await fresh();await p.goto(BASE+'/lesson/'+id+'?stage=understand');
 await p.getByRole('heading',{name:/^Understand:/}).waitFor();const copy=await p.locator('main').innerText();fs.writeFileSync(`${OUT}/lesson-${id}-content.txt`,copy);assert.match(copy,/Understand:/);
 await p.getByRole('button',{name:'Run example',exact:true}).click();await p.locator('table.results-table').last().waitFor();
 fs.writeFileSync(`${OUT}/lesson-${id}-example.txt`,await p.locator('table.results-table').last().innerText());
 await p.getByRole('button',{name:/Try it yourself/}).click();await type(p,'SELECT 1');await check(p);await p.locator('.results-panel .explanation').waitFor();
 for(const variant of [0,1]){if(variant===1)await p.getByRole('button',{name:/Next: Challenge 2/}).click();await type(p,l.tasks[variant].answer);await check(p);await p.locator('.results-panel .feedback-ok').first().waitFor();}
 await p.locator('.results-panel').getByRole('button',{name:/Continue to concept check/}).click();await p.getByRole('button',{name:l.quiz.options[l.quiz.correct],exact:true}).click();await p.getByRole('heading',{name:'Lesson mastered',exact:true}).waitFor();assert.deepEqual((await saved(p)).stats[id].solved,[0,1]);await p.context().close();
});
await test('Beginner real SQL errors, semicolon tolerance, hints and fresh independent attempt',async()=>{
 const p=await fresh();await p.goto(BASE+'/lesson/0?challenge=1');
 for(const sql of ['SELECT name, FROM customers','SELECT name FROM custmers','SELECT nme FROM customers','SELECT name, city customers','SELECT','']){await type(p,sql);await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.results-panel .explanation').waitFor();assert.match(await p.locator('.explanation').innerText(),/Try this/);}
 for(const sql of ['SELECT name, city FROM customers','SELECT name, city FROM customers;']){await type(p,sql);await check(p);await p.locator('.results-panel .feedback-ok').first().waitFor();}
 await p.getByRole('button',{name:/Challenge 2/}).first().click();await p.getByRole('button',{name:/Show a hint/}).click();await type(p,pack.lessons[0].tasks[1].answer);await check(p);assert.deepEqual((await saved(p)).stats[0].solved,[0]);await p.getByRole('button',{name:/Try again without hints/}).click();await p.waitForFunction(()=>document.querySelector('.cm-content')?.textContent==='SELECT FROM products;');await type(p,pack.lessons[0].tasks[1].answer);await check(p);await p.screenshot({path:OUT+'/fresh-attempt.png'});fs.writeFileSync(OUT+'/fresh-state.json',JSON.stringify(await saved(p),null,2));assert.deepEqual((await saved(p)).stats[0].solved,[0,1]);await p.context().close();
});

for(const project of pack.projects)await test(`Project ${project.id}: two milestones, findings, resume and actual Markdown export`,async()=>{
 const p=await fresh();await p.goto(BASE+'/projects/'+project.id);await p.getByRole('link',{name:'Start project',exact:true}).click();
 for(const [idx,id] of project.milestoneIds.slice(0,2).entries()){
  if(idx)await p.goto(`${BASE}/projects/${project.id}/milestone/${id}`);
  const l=pack.lessons[id];await p.getByRole('navigation',{name:'Project steps'}).getByRole('button',{name:/Write and check SQL/}).click();
  await p.getByLabel('Your findings (optional)').fill('Validated the business result against the sample and changed data.');
  for(const v of [0,1]){if(v)await p.getByRole('button',{name:/Next: Challenge 2/}).click();await type(p,l.tasks[v].answer);await check(p);await p.locator('.results-panel .feedback-ok').first().waitFor();}
  await p.locator('.results-panel').getByRole('button',{name:/Continue to concept check/}).click();await p.getByRole('button',{name:l.quiz.options[l.quiz.correct],exact:true}).click();await p.getByRole('heading',{name:/Milestone complete/}).waitFor();
  await p.reload();assert.equal((await saved(p)).projects[project.id].milestones[id].check,true);
 }
 await p.goto(BASE+'/projects/'+project.id);const download=p.waitForEvent('download');await p.getByRole('button',{name:'Download project summary',exact:true}).click();const d=await download;const path=await d.path();const report=fs.readFileSync(path,'utf8');assert.match(report,/Validated the business result/);for(const id of project.milestoneIds.slice(0,2))assert.ok(report.includes(pack.lessons[id].tasks[0].answer));fs.writeFileSync(`${OUT}/project-${project.id}-export.md`,report);await p.context().close();
});
await test('Unknown routes, actual worker failure, recovery and timeout preserve draft',async()=>{
 const p=await fresh();for(const url of ['/lesson/999','/practice/unknown-question','/practice/tracks/unknown-track','/projects/999','/review/999','/not-a-real-route']){await p.goto(BASE+url);await p.locator('main h1').waitFor();assert.match(await p.locator('main').innerText(),/not found|doesn.t exist|404/i);}
 await p.route('**/vendor/engine.js',route=>route.abort());await p.goto(BASE+'/lesson/0?challenge=1');await type(p,'SELECT name,city FROM customers');await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.results-panel .explanation').waitFor();assert.match(await p.locator('.explanation').innerText(),/SQL is temporarily unavailable/i);await p.unroute('**/vendor/engine.js');await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.results-panel table').waitFor();
 const slow='WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n) SELECT SUM(x) FROM n';await type(p,slow);await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.results-panel .explanation').waitFor();assert.match(await p.locator('.explanation').innerText(),/timed out|3 seconds/i);assert.equal((await saved(p)).drafts['sql-lesson-0-0'],slow);await type(p,pack.lessons[0].tasks[0].answer);await check(p);await p.locator('.feedback-ok').first().waitFor();await p.context().close();
});
await test('Mobile: the first Run and Check tap after typing works at every requested width',async()=>{
 for(const width of [320,375,390,430,768,820]){
 const p=await fresh({viewport:{width,height:900}});await p.goto(BASE+'/lesson/0?challenge=1');await type(p,pack.lessons[0].tasks[0].answer);
 await p.getByRole('button',{name:'Run query',exact:true}).click();await p.locator('.results-panel table').waitFor();
 await type(p,'SELECT name FROM customers');await check(p);assert.equal((await saved(p)).stats[0].attempts,1);
 await type(p,pack.lessons[0].tasks[0].answer);await check(p);assert.equal((await saved(p)).stats[0].attempts,2);assert.deepEqual((await saved(p)).stats[0].solved,[0]);await p.context().close();}
});
await test('Changed screens: Light/Dark, mobile/desktop, axe and honest stage feedback',async()=>{
 const scans=[];for(const theme of ['light','dark'])for(const width of [1440,390]){
 const p=await fresh({viewport:{width,height:900},colorScheme:theme});
 await seed(p,{stats:{0:stat},reviews:{0:{level:0,due:Date.now()-1000,history:[]}}});await p.goto(BASE+'/review/0');await p.getByRole('button',{name:pack.lessons[0].quiz.options[0],exact:true}).click();await p.getByRole('button',{name:/Next: write/}).click();await type(p,'SELECT name FROM customers');await check(p);await p.reload();await p.locator('.cm-content').waitFor();
 for(const [name,url]of [['review',null],['home',BASE],['project',BASE+'/projects/4'],['quiz',BASE+'/lesson/10?stage=understand'],['results',BASE+'/practice/shopper-contact-list']]){
  if(name==='home'){await p.goto(BASE+'/practice/shopper-contact-list');await type(p,'SELECT name');}if(url)await p.goto(url);if(name==='results'){await type(p,bank[0].solution);await check(p);await type(p,'SELECT 1');}
  await p.locator('main h1').waitFor();if(name==='results')await p.locator('.results-panel').scrollIntoViewIfNeeded();await p.screenshot({path:`${OUT}/${name}-${theme}-${width}.png`,fullPage:false});
  const scan=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();scans.push({name,theme,width,violations:scan.violations.map(v=>({id:v.id,impact:v.impact}))});assert.deepEqual(scan.violations.map(v=>v.id),[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }await p.context().close();}
 fs.writeFileSync(OUT+'/changed-axe.json',JSON.stringify(scans,null,2));
});
await browser.close();fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,2));console.log(`${results.filter(r=>r.ok).length}/${results.length} passed`);process.exitCode=results.some(r=>!r.ok)?1:0;
