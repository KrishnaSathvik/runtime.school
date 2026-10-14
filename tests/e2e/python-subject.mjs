import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:3052';
const DIR = 'docs/python/screens/subject';
fs.mkdirSync(DIR,{recursive:true});
const specs = JSON.parse(fs.readFileSync('src/content/python/journeys/specs.json','utf8'));
const browser = await chromium.launch();
const results=[];
const mod=process.platform==='darwin'?'Meta':'Control';
async function code(p,text) { await p.locator('.cm-content').click(); await p.keyboard.press(`${mod}+a`); await p.keyboard.insertText(text); }
async function check(p) { await p.getByRole('button',{name:'Check answer',exact:true}).click(); await p.locator('.py-summary-verdict').waitFor({timeout:120000}); assert.match(await p.locator('.py-summary-verdict').innerText(),/All \d+ checks passed/); }
async function assisted(p) { await p.getByRole('button',{name:'Reveal answer',exact:true}).click(); await p.getByRole('button',{name:'Put answer in editor',exact:true}).click(); await check(p); }
async function audit(p,name) {
  await p.screenshot({path:`${DIR}/${name}.png`,fullPage:true});
  const violations=(await new AxeBuilder({page:p}).analyze()).violations;
  assert.deepEqual(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),[],`${name}: accessibility`);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),`${name}: horizontal overflow`);
  await p.screenshot({path:`${DIR}/${name}.png`,fullPage:true});
  results.push(name); console.log('PASS',name);
}
try {
 for (const mobile of [false,true]) for (const theme of ['light','dark']) {
  const mode=`${mobile?'mobile':'desktop'}-${theme}`;
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},colorScheme:theme,acceptDownloads:true});
  const p=await context.newPage();
  await p.goto(`${BASE}/python`);
  await p.evaluate(()=>localStorage.setItem('sql-studio-v1',JSON.stringify({state:{drafts:{'1:0':'SELECT 7;'}},version:3})));
  const sql=await p.evaluate(()=>localStorage.getItem('sql-studio-v1'));
  assert.equal(await p.locator('.py-lesson-row').count(),79);
  assert.equal(await p.getByRole('navigation',{name:'Main',exact:true}).getByRole('link').count(),3);
  await audit(p,`${mode}-home`);
  await p.goto(`${BASE}/python/practice/py01-01`);
  await p.getByRole('button',{name:'Run code',exact:true}).waitFor();
  await code(p,'unit_price = 2.35\nquantity = 3\ndelivery_fee = 1.5\nfinal_total = round(unit_price * quantity + delivery_fee, 2)\nprint("Total:", final_total)');
  await p.getByRole('button',{name:'Run code',exact:true}).click();
  await p.getByText('Program finished.',{exact:true}).waitFor({timeout:120000});
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('runtime-python-v1')).state.items['python:bank:py01-01'].challenges.answer),undefined);
  await check(p);
  await p.reload(); await p.getByText('Solved independently',{exact:true}).waitFor();
  await audit(p,`${mode}-beginner`);
  await p.goto(`${BASE}/python/practice/py02-02`);
  await p.getByLabel('What does it print?').fill("['ana.lopez', 'mail.example.com']\nmail.example.com\n3 com");
  await p.getByRole('button',{name:'Check prediction'}).click();
  await p.getByText('Correct prediction.',{exact:true}).waitFor();
  await audit(p,`${mode}-prediction`);
  for (const [slug,label] of [['py07-01','intermediate'],['py12-01','advanced'],['py11-01','data']]) {
   await p.goto(`${BASE}/python/practice/${slug}`); await assisted(p); await audit(p,`${mode}-${label}`);
   assert.equal(await p.evaluate(slug=>JSON.parse(localStorage.getItem('runtime-python-v1')).state.items[`python:bank:${slug}`].challenges.answer.assisted,slug),true);
  }
  await p.goto(`${BASE}/python/projects/retail-order-engine`);
  assert.equal(await p.locator('.cm-content').count(),0);
  await p.getByRole('button',{name:'1. Calculate cart totals',exact:true}).click();
  const project=specs.find(j=>j.slug==='retail-order-engine'); let source='';
  for (const [i,step] of project.steps.entries()) {
   if(i>0) {
    await p.getByRole('button',{name:`Continue to milestone ${i+1}`,exact:true}).click();
    assert.equal((await p.locator('.cm-line').allTextContents()).join('\n').trim(),source.trim());
   }
   source+=(source?'\n':'')+step.code;
   await code(p,source); await check(p);
  }
  const summaryPromise=p.waitForEvent('download');
  await p.getByRole('button',{name:'Download verified summary'}).click();
  const summary=await summaryPromise; const path=await summary.path();
  assert.equal(JSON.parse(fs.readFileSync(path,'utf8')).passed,6);
  await p.getByRole('button',{name:'Run code',exact:true}).click();
  await p.getByRole('button',{name:'Download totals.json',exact:true}).waitFor({timeout:120000});
  const dataPromise=p.waitForEvent('download'); await p.getByRole('button',{name:'Download totals.json',exact:true}).click();
  assert.equal(JSON.parse(fs.readFileSync(await (await dataPromise).path(),'utf8')).total,5735);
  await audit(p,`${mode}-project`);
  await p.goto(`${BASE}/python/playground`); await p.getByLabel('Libraries').selectOption('data');
  await code(p,'import pandas as pd\ndisplay(pd.DataFrame({"item": ["Lamp", "Pen"], "qty": [2, 3]}))\ndisplay(pd.DataFrame({"total": [5]}))');
  await p.getByRole('button',{name:'Run code',exact:true}).click();
  await p.getByText('Program finished.',{exact:true}).waitFor({timeout:120000});
  assert.equal(await p.getByRole('table').count(),2);
  assert.deepEqual(await p.getByRole('table').first().getByRole('columnheader').allTextContents(),['index','itemstr','qtyint64']);
  assert.deepEqual(await p.getByRole('table').first().getByRole('cell').allTextContents(),['Lamp','2','Pen','3']);
  assert.equal(await p.getByRole('button',{name:'Check answer',exact:true}).count(),0);
  await audit(p,`${mode}-tables`);
  assert.equal(await p.evaluate(()=>localStorage.getItem('sql-studio-v1')),sql);
  await context.close();
 }
 fs.writeFileSync(`${DIR}/results.json`,JSON.stringify({passed:results},null,2)+'\n');
} finally {await browser.close();}
