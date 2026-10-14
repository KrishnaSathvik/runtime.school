import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.BASE??'http://127.0.0.1:3052';
const dir='docs/python/screens/editor-balance';fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch();const results=[];
try {for(const width of [1440,1024]){
 const c=await b.newContext({viewport:{width,height:900}});const p=await c.newPage();
 for(const [section,path] of [['learn','/python/lesson/variables-and-values'],['practice','/python/practice/py01-01'],['project','/python/projects/retail-order-engine?stage=stage-1']]){
  await p.goto(base+path);await p.locator('.py-task-cell .cm-content').waitFor();
  await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).click();
  await p.locator('.py-cell-output').waitFor();await p.locator('.py-task-cell').getByRole('button',{name:'Run',exact:true}).waitFor({timeout:60000});
  const geometry=await p.evaluate(()=>{
   const cell=document.querySelector('.py-task-cell');const box=e=>e.getBoundingClientRect();
   return {columns:[...document.querySelector('.rx-task-split').children].map(e=>box(e).width),code:box(cell.querySelector('.py-editor')).height,output:box(cell.querySelector('.py-cell-output')).height,footer:box(cell.querySelector('.rx-cell-foot')).bottom,bottom:box(cell).bottom,viewport:innerHeight};
  });
  assert.ok(Math.abs(geometry.columns[0]-geometry.columns[1])<1);
  assert.ok(Math.abs(geometry.code-geometry.output)<1);
  assert.ok(geometry.footer<=geometry.viewport-26 && geometry.bottom<=geometry.viewport-26,JSON.stringify(geometry));
  assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
  await p.screenshot({path:`${dir}/${width}-${section}.png`});
  await p.getByRole('button',{name:'Hide',exact:true}).click();await p.getByRole('button',{name:'Show',exact:true}).click();
  results.push({width,section,...geometry});console.log('PASS',width,section,'50/50 columns and editor/results; controls visible');
 }
 await p.goto(base+'/python/projects');await p.getByRole('heading',{level:1}).waitFor();assert.equal(await p.getByText('Preparation lessons',{exact:true}).count(),0);await c.close();
}fs.writeFileSync(`${dir}/results.json`,JSON.stringify(results,null,2)+'\n');}finally{await b.close();}
