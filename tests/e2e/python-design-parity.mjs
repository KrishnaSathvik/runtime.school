import {chromium} from 'playwright';
import {AxeBuilder} from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.BASE??'http://127.0.0.1:3052';
const shots='docs/python/screens/sql-parity';fs.mkdirSync(shots,{recursive:true});
const specs=JSON.parse(fs.readFileSync('src/content/python/journeys/specs.json','utf8'));
const project=specs.find(p=>p.kind==='project');
const mod=process.platform==='darwin'?'Meta':'Control';
const browser=await chromium.launch();
const results=[];
async function setCode(p,code){const e=p.locator('.py-task-cell .cm-content');await e.click();await p.keyboard.press(`${mod}+a`);await p.keyboard.insertText(code);}
async function saved(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('runtime-python-v1')).state);}
try {
 for(const mobile of [false,true])for(const colorScheme of ['light','dark']){
  const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},colorScheme});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const label=`${mobile?'mobile':'desktop'}-${colorScheme}`;
  for(const [route,name] of [['/python','learn'],['/python/practice','practice'],['/python/projects','projects']]){
   await p.goto(base+route);await p.locator('.rx-task-split').waitFor();
   if(name!=='projects')await p.locator('.py-task-cell .cm-content').waitFor();
   assert.equal(await p.locator('.rx-task-split > .rx-brief').count(),1);assert.equal(await p.locator('.rx-task-split > .rx-work').count(),1);
   if(!mobile){const widths=await p.locator('.rx-task-split').evaluate(e=>[...e.children].map(c=>c.getBoundingClientRect().width));assert.ok(Math.abs(widths[0]-widths[1])<2);}
   assert.equal(await p.getByRole('button',{name:'Download main.py',exact:true}).count(),0);
   assert.equal(await p.getByRole('button',{name:'Start fresh attempt',exact:true}).count(),0);
   if(name==='learn')assert.equal(await p.getByRole('tab',{name:'Complete',exact:true}).count(),0);
   if(name==='practice'){assert.equal(await p.locator('.rx-brief').getByRole('button').count(),0);assert.equal(await p.getByText('Not solved',{exact:true}).count(),0);assert.equal(await p.locator('.py-cell-output').count(),0);}
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const violations=(await new AxeBuilder({page:p}).analyze()).violations;assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
   await p.screenshot({path:`${shots}/${label}-${name}.png`});
  }
  assert.equal(await p.locator('.py-file-data table').count(),2);
  await p.getByRole('link',{name:'Start the first milestone',exact:false}).click();await p.locator('.py-task-cell').waitFor();
  assert.equal(await p.getByRole('tab',{name:'Program',exact:false}).count(),1);assert.equal(await p.getByRole('tab',{name:'Finding',exact:false}).count(),1);
  await p.getByRole('tab',{name:'Finding',exact:false}).click();await p.getByLabel('Your finding').fill('My finding persists.');await p.reload();await p.getByRole('tab',{name:'Finding',exact:false}).click();assert.equal(await p.getByLabel('Your finding').inputValue(),'My finding persists.');
  assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
  await p.getByRole('tab',{name:'Program',exact:false}).click();await p.screenshot({path:`${shots}/${label}-milestone.png`});
  await p.goto(`${base}/python/projects/${project.slug}?stage=export`);await p.getByRole('heading',{name:'Your project report'}).waitFor();assert.equal(await p.getByRole('button',{name:'Download draft report',exact:true}).count(),1);assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);await p.screenshot({path:`${shots}/${label}-export.png`});
  assert.deepEqual(errors,[]);results.push(label+' layout, tabs, saved finding, draft export, accessibility');console.log('PASS',results.at(-1));await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});const p=await ctx.newPage();
 await p.goto(base+'/python/lesson/variables-and-values');await p.locator('.py-task-cell').waitFor();
 const sqlBefore=await p.evaluate(()=>localStorage.getItem('sql-studio-v1'));
 await setCode(p,'price = 3\nquantity = 7\ntotal = price * quantity\nprint(total)\n');
 await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).click();await p.locator('.py-cell-results .py-meta.ok').waitFor({timeout:60000});
 assert.ok(!(await saved(p)).lessons['python:variables-and-values']?.challenges['challenge-1']?.solved);
 await p.locator('.py-task-cell').getByRole('button',{name:'Check',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('#tab-challenge-2')?.getAttribute('aria-selected')==='true',{},{timeout:60000});
 assert.equal((await saved(p)).lessons['python:variables-and-values'].challenges['challenge-1'].solved,true);
 await setCode(p,'price = 15\nquantity = 2\ntotal = price * quantity\nprint(total)\nquantity = quantity + 3\ntotal = price * quantity\nprint(total)\n');await p.locator('.py-task-cell').getByRole('button',{name:'Check',exact:true}).click();await p.waitForFunction(()=>document.querySelector('#tab-check')?.getAttribute('aria-selected')==='true',{},{timeout:60000});
 await p.getByRole('group',{name:'Answers for question 1'}).getByRole('button').nth(0).click();
 await p.getByRole('group',{name:'Answers for question 2'}).getByRole('button').nth(2).click();
 await p.waitForURL('**/python/lesson/print-comments-and-execution-order');
 results.push('real Python Run does not grade; passing lesson checks advance tabs');console.log('PASS',results.at(-1));
 await p.goto(base+'/python/practice/py01-01');await p.locator('.py-task-cell').waitFor();await p.getByRole('button',{name:'Hint',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Try without help',exact:true}).count(),1);await p.getByRole('button',{name:'Try without help',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Try without help',exact:true}).count(),0);
 await p.getByRole('button',{name:'Answer',exact:true}).click();await p.getByRole('button',{name:'Put in editor',exact:true}).click();await p.getByRole('button',{name:'Check',exact:true}).click();await p.waitForURL('**/python/practice/py01-02',{timeout:60000});
 assert.equal((await saved(p)).items['python:bank:py01-01'].challenges.answer.assisted,true);results.push('practice help/reset, assisted grading, automatic next question');console.log('PASS',results.at(-1));
 await p.goto(base+'/python/practice/py01-05');await p.getByLabel('What does it print?').fill('Tax: 3.2\nTip: 6.0\nTotal: 49.2\n');await p.getByRole('button',{name:'Check',exact:true}).click();await p.waitForURL('**/python/practice/py01-06');
 results.push('prediction grading advances to the next question');console.log('PASS',results.at(-1));
 let code='';for(let i=0;i<project.steps.length;i++){
  code+=(code?'\n':'')+project.steps[i].code;
  await p.goto(`${base}/python/projects/${project.slug}?stage=stage-${i+1}`);await p.locator('.py-task-cell .cm-content').waitFor();await setCode(p,code);await p.getByRole('button',{name:'Check',exact:true}).click();await p.getByLabel('Your finding').waitFor({timeout:60000});await p.getByLabel('Your finding').fill(`Milestone ${i+1}: verified the supplied fixture and the checks.`);
 }
 await p.getByRole('button',{name:'Open the report',exact:false}).click();await p.getByRole('button',{name:'Download report',exact:true}).waitFor();const download= p.waitForEvent('download');await p.getByRole('button',{name:'Download report',exact:true}).click();assert.equal((await download).suggestedFilename(),`${project.slug}.md`);
 await p.goto(`${base}/python/projects/${project.slug}?stage=stage-1`);await setCode(p,'# changed since check');await p.goto(`${base}/python/projects/${project.slug}?stage=export`);await p.getByRole('button',{name:'Download draft report',exact:true}).waitFor();
 assert.equal(await p.evaluate(()=>localStorage.getItem('sql-studio-v1')),sqlBefore);results.push('full project graded in real Python, findings, report download, stale evidence downgraded, SQL storage unchanged');console.log('PASS',results.at(-1));await ctx.close();
 fs.writeFileSync(`${shots}/results.json`,JSON.stringify({passed:results},null,2)+'\n');
} finally {await browser.close();}
