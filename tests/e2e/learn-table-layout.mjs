import {chromium} from 'playwright';
import {AxeBuilder} from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const dir='docs/python/screens/learn-table-layout';fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch();
try{const context=await b.newContext();const p=await context.newPage();for(const width of (process.env.WIDTHS??'1440,768,600,390,360').split(',').map(Number))for(const lesson of [0,32]){
 await p.setViewportSize({width,height:1000});await p.goto(`http://127.0.0.1:3052/sql/lesson/${lesson}`);
 const cards=p.locator('.rx-learn-tables .rx-brief .rx-schema-table');await cards.first().waitFor();
 const result=await cards.evaluateAll(es=>es.map(e=>{const table=e.querySelector('.rx-table-wrap'),records=e.querySelector('.rx-table-records');const visible=getComputedStyle(table).display!=='none'?table:records;return {x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width,records:visible===records,overflow:visible.scrollWidth>visible.clientWidth+1,clipped:[...visible.querySelectorAll('th,td,dt,dd')].some(c=>c.scrollWidth>c.clientWidth+1)};}));
 assert.ok(result.every(r=>r.x===result[0].x&&Math.abs(r.width-result[0].width)<1),'cards span full column');
 assert.ok(result.every(r=>!r.overflow&&!r.clipped),JSON.stringify(result));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width<=390)assert.ok(result.every(r=>r.records));
 if(width===1440&&lesson===0)assert.ok(result.every(r=>!r.records));
 if(width===390&&lesson===0)assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
 await p.locator('.rx-learn-tables .rx-brief .rx-schema').screenshot({path:`${dir}/${width}-lesson-${lesson}.png`});
 console.log('PASS',width,lesson,'full-width cards, readable values, no overflow');
}}finally{await b.close();}
