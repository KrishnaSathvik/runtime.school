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
  const measure=()=>p.evaluate(()=>{const split=document.querySelector('.rx-task-split');const cells=[...split.children].map(e=>e.getBoundingClientRect());const work=document.querySelector('.rx-work');const nested=[work,...work.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+2&&['auto','scroll','hidden'].includes(getComputedStyle(e).overflowY)&&e.clientHeight>0).map(e=>e.className);return {widths:cells.map(r=>r.width),positions:cells.map(r=>r.x),tops:cells.map(r=>r.y),heights:cells.map(r=>r.height),nested,overflow:document.documentElement.scrollWidth>innerWidth+1,editorHeight:work.querySelector('.cm-editor').getBoundingClientRect().height};});
  let m=await measure();assert.ok(Math.abs(m.widths[0]-m.widths[1])<1,JSON.stringify(m));if(width<=700){assert.equal(m.positions[0],m.positions[1]);assert.ok(m.tops[1]>m.tops[0]);assert.ok(Math.abs(m.tops[1]-(m.tops[0]+m.heights[0]))<1,'stacked sections have no stretched gap');}else{assert.ok(m.positions[1]>m.positions[0]);}assert.equal(m.overflow,false,`${width} ${subject} ${section}`);
  const briefScroll=await p.locator('.rx-brief').evaluate(e=>{e.scrollTop=100;return e.scrollTop;});assert.equal(briefScroll,0,'brief must not scroll independently');
  if(width>700) {
   // A long brief must not stretch the editor; scrolling keeps it beside the question.
   const work=p.locator('.rx-lesson-work').first();const originalHeight=(await work.boundingBox()).height;
   await p.locator('.rx-brief').evaluate((e,h)=>e.style.minHeight=`${h+1000}px`,originalHeight);
   await p.evaluate(()=>window.scrollTo(0,document.querySelector('.rx-task-split').getBoundingClientRect().top+scrollY+200));
   await p.waitForTimeout(200);
   const pinned=await work.boundingBox();assert.ok(Math.abs(pinned.y-48)<1,'editor stays pinned beside long question');
   assert.ok(Math.abs(pinned.height-originalHeight)<1,'long question must not stretch editor');
   await p.locator('.rx-brief').evaluate(e=>e.style.removeProperty('min-height'));await p.evaluate(()=>window.scrollTo(0,0));
  }
  await p.screenshot({path:`${dir}/${width}-${subject}-${section}.png`});
  await editor.click();await p.keyboard.press(`${mod}+a`);await p.keyboard.insertText(Array.from({length:80},(_,i)=>`${subject==='python'?'#':'--'} line ${i+1} — editing should grow the page`).join('\n'));
  await p.waitForTimeout(150);m=await measure();assert.ok(m.editorHeight>1000,JSON.stringify(m));assert.deepEqual(m.nested,[],`${width} ${subject} ${section} nested scroll`);assert.equal(m.overflow,false);
  // Wheel input over either pane moves the page; mobile panes both move, desktop editor sticks.
  for(const selector of ['.rx-brief','.rx-work']) {
   const target=p.locator(selector).first();
   await target.evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-150));
   await p.waitForTimeout(350); // Let CodeMirror measure wrapped lines after entering view.
   const before=await measure();const beforeY=await p.evaluate(()=>scrollY);
   const box=await target.boundingBox();await p.mouse.move(box.x+box.width/2,Math.max(160,box.y+20));
   await p.mouse.wheel(0,180);await p.waitForTimeout(150);
   const after=await measure();const delta=await p.evaluate(()=>scrollY)-beforeY;
   assert.ok(delta>0,`${selector}: wheel must scroll page`);
   for(let i=0;i<(width<=700?2:1);i++)assert.ok(Math.abs((before.tops[i]-after.tops[i])-delta)<1,JSON.stringify({selector,width,subject,section,before:before.tops,after:after.tops,delta}));
  }
  const scroll=await p.evaluate(()=>{window.scrollTo(0,document.documentElement.scrollHeight);return {y:scrollY,max:document.documentElement.scrollHeight-innerHeight};});assert.ok(scroll.y>0&&scroll.max>0);
  if(width===390&&subject==='python'){
   await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).click();await p.locator('.py-cell-output').waitFor();await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).waitFor({timeout:60000});
   const heights=await p.evaluate(()=>[document.querySelector('.py-task-cell .py-editor'),document.querySelector('.py-cell-output')].map(e=>e.getBoundingClientRect().height));assert.ok(Math.abs(heights[0]-heights[1])<1,JSON.stringify(heights));assert.deepEqual((await measure()).nested,[]);
  }
  results.push({width,subject,section,...m});console.log('PASS',width,subject,section,width<=700?'content-sized stacked sections, page scroll':'equal columns, page scroll');
 }
 await c.close();
}fs.writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2)+'\n');}finally{await b.close();}
