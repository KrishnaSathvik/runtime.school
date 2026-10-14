import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.BASE??'http://127.0.0.1:3052';
const dir='docs/python/screens/page-scroll';fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch();const results=[];const mod=process.platform==='darwin'?'Meta':'Control';
try{for(const width of (process.env.WIDTHS??"1440,768,600,390,360").split(",").map(Number)){
 const c=await b.newContext({viewport:{width,height:900}});const p=await c.newPage();
 for(const subject of ['sql','python'])for(const section of ['learn','practice','projects']){
  const route=section==='learn'?`/${subject}`:section==='practice'?`/${subject}/practice`:subject==='python'?'/python/projects/retail-order-engine?stage=stage-1':'/sql/projects';
  await p.goto(base+route);await p.locator('.rx-task-split').waitFor();
  if(subject==='sql'&&section==='projects'){await p.getByRole('link',{name:'Start the first milestone',exact:false}).click();}
  const editor=p.locator('.rx-work .cm-content').first();await editor.waitFor();
  const measure=()=>p.evaluate(()=>{const split=document.querySelector('.rx-task-split');const cells=[...split.children].map(e=>e.getBoundingClientRect());const work=document.querySelector('.rx-work');const nested=[work,...work.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+2&&['auto','scroll','hidden'].includes(getComputedStyle(e).overflowY)&&e.clientHeight>0).map(e=>e.className);return {widths:cells.map(r=>r.width),positions:cells.map(r=>r.x),nested,overflow:document.documentElement.scrollWidth>innerWidth+1,editorHeight:work.querySelector('.cm-editor').getBoundingClientRect().height};});
  let m=await measure();assert.ok(Math.abs(m.widths[0]-m.widths[1])<1,JSON.stringify(m));assert.ok(m.positions[1]>m.positions[0]);assert.equal(m.overflow,false,`${width} ${subject} ${section}`);
  if(section==='learn') {const moved=await p.locator('.rx-brief').evaluate(e=>{e.scrollTop=100;const y=e.scrollTop;e.scrollTop=0;return y;});assert.ok(moved>0,'left brief remains independently scrollable');}
  await p.screenshot({path:`${dir}/${width}-${subject}-${section}.png`});
  await editor.click();await p.keyboard.press(`${mod}+a`);await p.keyboard.insertText(Array.from({length:80},(_,i)=>`${subject==='python'?'#':'--'} line ${i+1} — editing should grow the page`).join('\n'));
  await p.waitForTimeout(150);m=await measure();assert.ok(m.editorHeight>1000,JSON.stringify(m));assert.deepEqual(m.nested,[],`${width} ${subject} ${section} nested scroll`);assert.equal(m.overflow,false);
  const scroll=await p.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);return {y:scrollY,max:document.documentElement.scrollHeight-innerHeight};});assert.ok(scroll.y>0&&scroll.max>0);
  if(width===390&&subject==='python'){
   await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).click();await p.locator('.py-cell-output').waitFor();await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).waitFor({timeout:60000});
   const heights=await p.evaluate(()=>[document.querySelector('.py-task-cell .py-editor'),document.querySelector('.py-cell-output')].map(e=>e.getBoundingClientRect().height));assert.ok(Math.abs(heights[0]-heights[1])<1,JSON.stringify(heights));assert.deepEqual((await measure()).nested,[]);
  }
  results.push({width,subject,section,...m});console.log('PASS',width,subject,section,'equal columns, long code grows page, no nested editor scroll');
 }
 await c.close();
}fs.writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2)+'\n');}finally{await b.close();}
