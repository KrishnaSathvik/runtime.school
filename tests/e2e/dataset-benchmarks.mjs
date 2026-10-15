import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});
const catalog=JSON.parse(fs.readFileSync('src/data/datasets/generated/catalog.json','utf8')),measurements=[];
try{
 await page.goto('http://127.0.0.1:3100/sql/playground');
 for(const dataset of catalog) for(const edition of ['learn','practice','project']) {
 const fact=[...dataset.tables].sort((a,b)=>dataset.editions[edition].rows[b.name]-dataset.editions[edition].rows[a.name])[0];
 const fk=fact.foreignKeys[0],key=fact.columns[0].name;
 const queries=[`SELECT * FROM ${fact.name} LIMIT 20`,`SELECT ${key},COUNT(*) AS n FROM ${fact.name} GROUP BY ${key} LIMIT 20`,`SELECT ${key},ROW_NUMBER() OVER(ORDER BY ${fact.primaryKey.join(',')}) AS position FROM ${fact.name} LIMIT 200`];
 if(fk)queries.push(`SELECT COUNT(*) AS matched FROM ${fact.name} f JOIN ${fk.table} d ON ${fk.columns.map((c,i)=>`f.${c}=d.${fk.references[i]}`).join(' AND ')}`);
 const metrics=await page.evaluate(async({id,edition,queries})=>{
 const start=performance.now(),response=await fetch(`/datasets/${id}/1.0.0/${edition}.json`),raw=await response.text(),asset=JSON.parse(raw),loadMs=performance.now()-start;
 const worker=new Worker('/vendor/engine.js');await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.ready?resolve():reject(Error(e.data.error));worker.onerror=reject;});
 const results=[];try{for(const query of queries){const started=performance.now();const res=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error(`${id}/${edition} exceeded 3s`)),3000);worker.onmessage=e=>{clearTimeout(timeout);resolve(e.data)};worker.postMessage({seed:asset.seed,query});});if(res.error)throw Error(res.error);results.push({query,ms:Math.round(performance.now()-started),rows:res.total});}}finally{worker.terminate();}
 return {id,edition,bytes:new TextEncoder().encode(raw).length,loadMs:Math.round(loadMs),pageHeapBytes:performance.memory?.usedJSHeapSize??null,results};
 },{id:dataset.id,edition,queries});measurements.push(metrics);console.log(dataset.id,edition,Math.max(...metrics.results.map(r=>r.ms)));
 }
 assert.equal(measurements.length,33);
 fs.writeFileSync('docs/sql-rebuild/edition-benchmarks.json',JSON.stringify({browser:'Headless Chromium desktop CPU, 390px viewport; not physical mobile hardware',workerMemory:'Worker WASM heap is not exposed by performance.memory; pageHeapBytes excludes worker memory.',budgetMs:3000,measurements},null,2)+'\n');
}finally{await browser.close();}
