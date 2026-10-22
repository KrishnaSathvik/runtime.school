// Real browser stabilization regressions. Uses an existing local server; never generates content.
// BASE=http://localhost:3040 node tests/e2e/workspace-stabilization.mjs lifecycle
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const BASE=process.env.BASE??'http://localhost:3040';
const batch=process.argv[2]??'lifecycle';
const OUT=process.env.SHOTS??'docs/research/workspace-stabilization/evidence';
mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),headless:true});
const context=await browser.newContext({viewport:{width:Number(process.env.WIDTH??1440),height:Number(process.env.HEIGHT??1000)}});
const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(60000);
const mod=process.platform==='darwin'?'Meta':'Control';
const results=[];const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const ed=()=>page.locator('.cm-content[contenteditable=true]:visible').first();
async function code(text){await ed().click();await page.keyboard.press(`${mod}+A`);await page.keyboard.insertText(text);await page.waitForTimeout(150);}
async function step(name,fn){try{await fn();results.push({name,status:'pass'});console.log('PASS',name);}catch(e){results.push({name,status:'fail',error:String(e)});await page.screenshot({path:`${OUT}/${batch}-failed.png`});throw e;}finally{writeFileSync(`${OUT}/${batch}.json`,JSON.stringify({at:new Date().toISOString(),browser:browser.version(),viewport:page.viewportSize(),results,errors},null,2));}}
try{
if(batch==='lifecycle'){
 await page.goto(`${BASE}/python/learn/python-execution`);
 await step('Python superseded challenge settles and next run works',async()=>{
  await code('while True:\n    pass');await page.getByRole('button',{name:'Run',exact:true}).click();
  await page.getByRole('button',{name:'Run: Three instructions, three lines',exact:true}).click();
  await page.locator('.p2-py-console').filter({hasText:'Status: delivered'}).waitFor({timeout:45000});
  await page.getByRole('button',{name:'Run',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Check',exact:true}).isEnabled(),true);
  await page.getByRole('status').filter({hasText:/interrupt|another|supersed/i}).first().waitFor();
  await page.screenshot({path:`${OUT}/python-supersession-fixed.png`});
  await code('print("ownership recovered")');await page.getByRole('button',{name:'Run',exact:true}).click();
  await page.locator('.p2-results').getByText('ownership recovered',{exact:true}).waitFor({timeout:30000});
 });
 await step('Python Check can stop without earned credit and retry',async()=>{
  await code('while True:\n    pass');await page.getByRole('button',{name:'Check',exact:true}).click();
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await page.getByRole('button',{name:'Run',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Check',exact:true}).isEnabled(),true);
  assert.doesNotMatch(await page.locator('.p2-results').innerText(),/All \d+ checks pass/);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('runtime-python-v2'))?.state.lessons['PY-L01-01']?.exercises.c1);
  assert.notEqual(saved?.solved,true);
 });
 await step('SQL competing example explains interruption and recovers',async()=>{
  await page.goto(`${BASE}/sql/lesson/meet-your-first-select`);
  await code('WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n) SELECT sum(x) FROM n;');
  await page.getByRole('button',{name:'Run',exact:true}).last().click();
  await page.getByRole('button',{name:'Run',exact:true}).first().click();
  await page.getByRole('button',{name:'Check',exact:true}).waitFor();
  await page.getByText(/interrupt|another.*run|supersed/i).first().waitFor();
  await code('SELECT 19381 AS recovered;');await page.getByRole('button',{name:'Run',exact:true}).last().click();
  await page.getByRole('cell',{name:'19381',exact:true}).waitFor({timeout:30000});
  await page.screenshot({path:`${OUT}/sql-supersession-fixed.png`});
 });
}
if(batch==='editor'){
 await page.goto(`${BASE}/python/learn/python-execution`);
 await step('Reset undo restores source and keeps earned state',async()=>{
  await code('# reset credit probe\nprint("RUNTIME MARKET")\nprint("Order O101217")\nprint("Thank you for shopping with us!")');
  await page.getByRole('button',{name:'Check',exact:true}).click();
  await page.locator('.p2-results').getByText(/The check passes/).waitFor({timeout:30000});
  await page.getByRole('button',{name:/^Hint/}).click();
  const progressBefore=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('runtime-python-v2')).state.lessons['PY-L01-01'].exercises.c1;return {solved:r.solved,assisted:r.assisted,attempt:r.attempt,checks:r.checks};});
  await code('# undo marker\nprint(321)');
  const before=await ed().innerText();
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await ed().click();await page.keyboard.press(`${mod}+z`);
  assert.equal(await ed().innerText(),before);
  const progressAfter=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('runtime-python-v2')).state.lessons['PY-L01-01'].exercises.c1;return {solved:r.solved,assisted:r.assisted,attempt:r.attempt,checks:r.checks};});
  assert.deepEqual(progressAfter,progressBefore);
  await page.screenshot({path:`${OUT}/python-reset-undo-fixed.png`});
 });
 await step('Project file switch preserves undo and error filename',async()=>{
  await page.goto(`${BASE}/python/projects/smart-shopping-cart`);
  await page.getByRole('button',{name:'Start →',exact:true}).click();
  const initial=await ed().innerText();
  await code('# history marker\nanswer = 42');
  await page.getByRole('tab',{name:'main.py',exact:true}).click();
  await page.getByRole('tab',{name:'catalogue.py',exact:true}).click();
  await ed().click();await page.keyboard.press(`${mod}+z`);
  assert.equal(await ed().innerText(),initial);
  await code('def build_catalogue(products):\n    raise ValueError("helper probe")\n\ndef find(catalogue, text):\n    return []\n');
  await page.getByRole('button',{name:'Run',exact:true}).click();
  await page.locator('.p2-results').getByText(/ValueError/).first().waitFor({timeout:30000});
  await page.locator('.p2-results button').filter({hasText:/line 2|catalogue.py:2/}).first().click();
  assert.equal(await page.locator('.p2-files [aria-selected=true]').innerText(),'catalogue.py');
  assert.match(await ed().innerText(),/helper probe/);
  await page.screenshot({path:`${OUT}/python-helper-navigation-fixed.png`});
  const helper=await ed().innerText();
  await page.getByRole('tab',{name:'main.py',exact:true}).click();await code('print("multi reset marker")');
  await page.getByRole('button',{name:'Reset milestone files',exact:true}).click();
  await page.getByRole('button',{name:'Undo Reset',exact:true}).click();
  assert.match(await ed().innerText(),/multi reset marker/);
  await page.getByRole('tab',{name:'catalogue.py',exact:true}).click();assert.equal(await ed().innerText(),helper);
  await page.reload();assert.match(await ed().innerText(),/helper probe/);
 });
}
if(batch==='feedback'){
 await page.goto(`${BASE}/python/practice/fix-the-note`);
 await step('Python edited pass is historical and Answer dialog is perceivable',async()=>{
  await code('# Shipping summary\nprint("Order O108024")\nprint("Items:", 3, "Shipping:", 5.99)\nprint("Total:", 57.34)');
  await page.getByRole('button',{name:'Check',exact:true}).click();
  await page.locator('.p2-results').getByText(/All 2 checks pass/).waitFor({timeout:30000});
  await code('print("changed")');
  await page.getByText('Previous check — code changed',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Answer',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Show the answer?'});await dialog.waitFor();
  assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Answer',exact:true}).click();
  await dialog.getByRole('button',{name:'Show answer',exact:true}).click();
  await page.locator('.p2-help').getByText('Answer',{exact:true}).waitFor();
  assert.equal(await page.locator('.p2-help').evaluate(e=>e.contains(document.activeElement)),true);
  await page.screenshot({path:`${OUT}/python-answer-fixed.png`});
 });
 await step('SQL full result count and Answer focus',async()=>{
  await page.goto(`${BASE}/sql/practice/customer-list`);
  await code('SELECT customer_id, country, region FROM customers;');
  await page.getByRole('button',{name:'Check',exact:true}).click();
  await page.getByText(/Returns 848 rows/).waitFor({timeout:30000});
  await page.getByRole('button',{name:'Answer',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Show the answer?'});await dialog.waitFor();
  assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true);
  await page.screenshot({path:`${OUT}/sql-answer-dialog-fixed.png`});
  await dialog.getByRole('button',{name:'Keep trying',exact:true}).click();
 });
}

if(batch==='help'){
 for(const path of ['/sql/lesson/meet-your-first-select','/sql/practice/customer-list','/python/learn/python-execution','/python/practice/fix-the-note']){
  await step(`${path} Answer/Hint visibility, cancellation, hydration`,async()=>{
   await page.goto(BASE+path);
   const python=path.includes('/python/');
   await code(python?'print("wrong")':'SELECT 1 AS wrong;');
   await page.getByRole('button',{name:'Check',exact:true}).click();
   await page.getByText(python?/Not yet:/:/of \d+ checks passed/).first().waitFor({timeout:30000});
   const feedback=python?page.locator('.p2-results'):page.locator('.rx-checks');
   const old=await feedback.innerText();
   const answer=page.getByRole('button',{name:'Answer',exact:true});await answer.click();
   const d=page.getByRole('dialog',{name:'Show the answer?'});await d.waitFor();
   assert.equal(await d.evaluate(e=>e.contains(document.activeElement)),true);
   const a=await new AxeBuilder({page}).include('dialog[open]').analyze();assert.deepEqual(a.violations.map(v=>v.id),[]);
   await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});
   assert.equal(await answer.evaluate(e=>e===document.activeElement),true);
   await answer.click();await d.getByRole('button',{name:'Show answer',exact:true}).click();
   const reveal=python?page.locator('.p2-help'):page.getByRole('region',{name:'Revealed answer'});
   await reveal.waitFor();await page.waitForTimeout(100);
   assert.equal(await reveal.evaluate(e=>e.contains(document.activeElement)),true);
   assert.equal(await feedback.innerText(),old,'revealing answer discarded feedback');
   await page.getByRole('button',{name:/^Hint/}).first().click();
   const hintDialog=page.getByRole('dialog',{name:'Show a hint?'});
   if(await hintDialog.isVisible())await hintDialog.getByRole('button',{name:'Show hint',exact:true}).click();
   const hints=python?page.locator('.p2-help'):page.getByLabel('Requested hints');
   await hints.waitFor();await page.waitForTimeout(100);assert.equal(await hints.evaluate(e=>e.contains(document.activeElement)),true);
   await page.reload();await ed().waitFor();await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>!!document.activeElement?.closest('.p2-help,.rx-hints,[aria-label="Revealed answer"]')),false,'saved help stole focus');
  });
 }
}

if(batch==='layout'){
 const geometries=[];
 for(const path of ['/sql/lesson/meet-your-first-select','/sql/practice/customer-list','/sql/projects/retail-performance-review?stage=baseline','/python/learn/python-execution','/python/practice/fix-the-note','/python/projects/smart-shopping-cart']){
  await page.setViewportSize({width:1440,height:1000});await page.goto(BASE+path);
  if(path.includes('smart-shopping'))await page.getByRole('button',{name:'Start →',exact:true}).click();
  await ed().waitFor();
  const split=page.locator(path.includes('/python/')?'.p2-split':'.rx-task-split').first();
  for(const viewport of [{width:1440,height:1000},{width:768,height:900},{width:390,height:844},{width:320,height:640},{width:390,height:440}]){
   await step(`${path} ${viewport.width}x${viewport.height}`,async()=>{
    await page.setViewportSize(viewport);await split.evaluate(e=>e.children[0].focus());await page.waitForTimeout(150);
    const geometry=await split.evaluate(e=>({panes:[...e.children].map(p=>{const r=p.getBoundingClientRect();const c=getComputedStyle(p);return{x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,overflow:c.overflowY,client:p.clientHeight,scroll:p.scrollHeight};}),pageWidth:document.documentElement.scrollWidth,view:innerWidth}));
    geometries.push({path,viewport,geometry});writeFileSync(`${OUT}/geometry.json`,JSON.stringify(geometries,null,2));
    const[a,b]=geometry.panes;
    assert.ok(geometry.pageWidth<=viewport.width+1,'horizontal page overflow');
    // Desktop: two equal, independently scrolling panes. Phones, tablets and short screens: one page scroll.
    const twoPanes=viewport.width>=900&&viewport.height>600;
    if(twoPanes){assert.ok(Math.abs(a.w-b.w)<=2,'unequal columns');assert.ok(Math.abs(a.y-b.y)<=2,'desktop pane tops');assert.ok(a.h>100&&b.h>100,'collapsed pane');assert.ok(b.bottom<=viewport.height+2,'workspace extends below viewport');}
    else {assert.ok(Math.abs(a.x-b.x)<=2,'stacked pane x');assert.ok(b.y>=a.bottom-2,'overlapping stacked panes');assert.deepEqual([a.overflow,b.overflow],['visible','visible'],'stacked panes scroll on their own');}
    if(twoPanes){
     const prior=await split.evaluate(e=>({right:e.children[1].scrollTop,rect:e.children[1].getBoundingClientRect().y}));
     await split.evaluate(e=>{e.children[0].scrollTop=100;});
     const after=await split.evaluate(e=>({right:e.children[1].scrollTop,rect:e.children[1].getBoundingClientRect().y}));assert.deepEqual(after,prior,'content scroll moved workspace');
    }
    await split.evaluate(e=>e.children[0].focus());
    await ed().click();await page.waitForTimeout(100);await page.keyboard.press('End');
    if(!twoPanes&&viewport.height>=640){
     const visible=await ed().evaluate(e=>{const editor=e.closest('.cm-editor').getBoundingClientRect();const action=e.closest('.p2-work,.rx-work').querySelector('.p2-actions,.rx-cell-foot')?.getBoundingClientRect();return Math.min(editor.bottom,innerHeight,action?.top??innerHeight)-Math.max(editor.top,0);});
     assert.ok(visible>=119,`only ${visible}px of focused code visible`);
    }
    if(viewport.width===320){
     const run=page.getByRole('button',{name:'Run',exact:true}).last();await run.scrollIntoViewIfNeeded();const rect=await run.boundingBox();
     await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.waitForTimeout(120);
     const held=await run.boundingBox();assert.ok(Math.abs(held.y-rect.y)<2,'Run moved while pointer held');await page.mouse.up();
     await page.waitForTimeout(150);
    }
    await page.getByRole('button',{name:'Run',exact:true}).last().scrollIntoViewIfNeeded();
    assert.equal(await page.getByRole('button',{name:'Run',exact:true}).last().isVisible(),true);
    if(viewport.width===390&&viewport.height===844)await page.screenshot({path:`${OUT}/${path.split('?')[0].split('/').slice(1,3).join('-')}-mobile.png`});
   });
  }
  await page.setViewportSize({width:1440,height:1000});
  const a=await new AxeBuilder({page}).analyze();writeFileSync(`${OUT}/axe-${path.split('?')[0].split('/').slice(1,3).join('-')}.json`,JSON.stringify(a.violations,null,2));
  await step(`${path} automated accessibility`,async()=>assert.deepEqual(a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[]));
 }
}

if(batch==='journeys'){
 for(const [path,answer]of [['/sql/lesson/meet-your-first-select','SELECT customer_id, country FROM customers;'],['/sql/practice/customer-list','SELECT customer_id, country, region FROM customers;']]){
  await step(`${path} error, wrong check, corrected check, draft recovery`,async()=>{
   await page.goto(BASE+path);await code('SELEC * FROM customers;');await page.getByRole('button',{name:'Run',exact:true}).last().click();
   await page.getByText(/SQL syntax error/).first().waitFor({timeout:30000});
   await code('SELECT 1 AS wrong;');await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText(/of \d+ checks passed/).waitFor();
   await code(answer);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText(/all checks passed/).first().waitFor();
   await code('SELECT 927 AS saved_draft;');await page.getByText('edited since the last run',{exact:true}).waitFor();
   await page.reload();assert.equal(await ed().innerText(),'SELECT 927 AS saved_draft;');
   await page.getByRole('button',{name:'Run',exact:true}).last().click();await page.getByRole('cell',{name:'927',exact:true}).waitFor();
  });
 }
 for(const path of ['/python/learn/python-execution','/python/practice/fix-the-note']){
  await step(`${path} syntax error, streaming, runtime recovery`,async()=>{
   await page.goto(BASE+path);await code('print(');await page.getByRole('button',{name:'Run',exact:true}).click();await page.locator('.p2-results').getByText(/SyntaxError/).first().waitFor({timeout:30000});
   await code('print("before error")\nraise ValueError("expected probe")');await page.getByRole('button',{name:'Run',exact:true}).click();await page.locator('.p2-results').getByText(/ValueError/).first().waitFor({timeout:30000});
   assert.match(await page.locator('.p2-results').innerText(),/before error/);
   await code('print("fresh recovery")');await page.getByRole('button',{name:'Run',exact:true}).click();await page.locator('.p2-results').getByText('fresh recovery',{exact:true}).waitFor({timeout:30000});
   await page.reload();assert.equal(await ed().innerText(),'print("fresh recovery")');
  });
 }
 await step('SQL project valid checkpoint then edited evidence',async()=>{
  await page.goto(`${BASE}/sql/projects/retail-performance-review?stage=baseline`);
  const source=readFileSync('src/content/projects/beginner.ts','utf8');const answer=source.match(/sql: `([\s\S]*?)`/)[1].replace('${SALE_LINES}','orders AS o JOIN order_items AS i ON i.order_id = o.order_id');
  await code(answer);await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByText('✓ Check passed',{exact:true}).waitFor({timeout:30000});
  await code('SELECT 44 AS project_probe;');assert.equal(await page.getByText('✓ Check passed',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Run',exact:true}).click();await page.getByRole('cell',{name:'44',exact:true}).waitFor();
  await page.reload();assert.equal(await ed().innerText(),'SELECT 44 AS project_probe;');assert.match(page.url(),/stage=baseline/);
 });
 await step('Python project checks, next milestone and cumulative files',async()=>{
  await page.goto(`${BASE}/python/projects/smart-shopping-cart`);await page.getByRole('button',{name:'Start →',exact:true}).click();
  const source=readFileSync('src/content/python-v2/projects/P01.ts','utf8');const answer=source.match(/const CATALOGUE_M1 = `([\s\S]*?)`;/)[1];
  await code(answer);await page.getByRole('button',{name:'Check step',exact:true}).click();await page.locator('.p2-results').getByText(/All 4 checks pass/).waitFor({timeout:45000});
  await page.getByRole('button',{name:/^Next: Cart add/}).click();await page.getByRole('tab',{name:'catalogue.py',exact:true}).click();
  assert.match(await ed().innerText(),/def build_catalogue/);assert.match(await ed().innerText(),/wanted = text.lower/);
  await page.reload();assert.match(await ed().innerText(),/wanted = text.lower/);
 });
}

if(batch==='preparation'){
 await step('Python Stop during delayed preparation then retry',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});let started;const requested=new Promise(resolve=>{started=resolve;});
  const hold=async route=>{started();await gate;await route.continue().catch(()=>{});};
  await context.route('**/python-sandbox',hold);
  await page.goto(`${BASE}/python/practice/fix-the-note`,{waitUntil:'domcontentloaded'});await requested;
  await code('print("preparation recovered")');await page.getByRole('button',{name:'Check',exact:true}).click();
  await page.getByRole('button',{name:'Stop',exact:true}).click();await page.getByRole('button',{name:'Run',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Check',exact:true}).isEnabled(),true);
  assert.doesNotMatch(await page.locator('.p2-results').innerText(),/All \d+ checks pass/);
  await context.unroute('**/python-sandbox',hold);release();
  await page.getByRole('button',{name:'Run',exact:true}).click();await page.locator('.p2-results').getByText('preparation recovered',{exact:true}).waitFor({timeout:45000});
  await page.screenshot({path:`${OUT}/preparation-recovered.png`});
 });
 await step('Python unmount during Run leaves next workspace usable',async()=>{
  await code('while True:\n    pass');await page.getByRole('button',{name:'Run',exact:true}).click();
  // Click client navigation so cleanup, rather than document teardown, owns cancellation.
  await page.locator('header').getByRole('link',{name:'Learn',exact:true}).click();
  await page.goto(`${BASE}/python/learn/python-execution`);
  await code('print("next workspace")');await page.getByRole('button',{name:'Run',exact:true}).click();
  await page.locator('.p2-results').getByText('next workspace',{exact:true}).waitFor({timeout:45000});
 });
}

if(batch==='navigation'){
 for(const path of ['/sql/lesson/meet-your-first-select','/sql/practice/customer-list','/python/learn/python-execution','/python/practice/fix-the-note']){
  await step(`${path} mobile navigation drawer`,async()=>{
   await page.goto(BASE+path);await page.setViewportSize({width:390,height:844});
   const name=path.includes('practice')?'All questions':'All lessons';
   await page.getByRole('button',{name,exact:true}).click();const d=page.getByRole('dialog',{name,exact:true});await d.waitFor();
   const b=await d.boundingBox();assert.ok(b.x>=-1&&b.x+b.width<=391);assert.ok(b.y>=0&&b.y+b.height<=845);
   await page.keyboard.press('Escape');await d.waitFor({state:'hidden'});
  });
 }
 for(const path of ['/python/tools/playground','/sql/playground','/python/tools/database-lab']){
  await step(`${path} retains tool layout`,async()=>{await page.goto(BASE+path);assert.equal(await page.locator('.workspace-bounded').count(),0);assert.ok(await page.locator('main').innerText());});
 }
}

assert.equal(errors.length,0,errors.join('\n'));
}finally{await browser.close();}
