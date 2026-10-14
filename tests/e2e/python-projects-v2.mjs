import {chromium,firefox,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('src/content/python/projects-v2/catalog.json','utf8')).filter(p=>!process.env.PROJECTS||process.env.PROJECTS.split(',').includes(p.slug));
const base=process.env.BASE??'http://127.0.0.1:3052';const browsers=(process.env.BROWSERS??'chromium').split(',');
const dir='docs/python/projects-v2/screens';fs.mkdirSync(dir,{recursive:true});
for(const engine of browsers){const b=await ({chromium,firefox,webkit}[engine]).launch();try{for(const project of catalog){
 const context=await b.newContext({viewport:{width:1365,height:1000},acceptDownloads:true});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const legacy=JSON.stringify({state:{version:1,lessons:{},items:{[project.ref]:{drafts:{'stage-1':'# Original learner code'},challenges:{'stage-1':{passes:1,solved:true}},attempts:{},quiz:{passed:false,answers:{},attempts:0,passedAt:0},tab:null,masteredAt:0,updatedAt:1}},lastLesson:null},version:0});
 await context.addInitScript(({project,legacy})=>{
 if(!localStorage.getItem('runtime-python-projects-v2'))localStorage.setItem('runtime-python-projects-v2',JSON.stringify({version:2,projects:{[project.ref]:{[project.revision]:{files:project.reference,selected:Object.keys(project.reference).find(x=>x!=='main.py'),milestone:0,interpretation:'',milestones:{}}}}}));
 if(!localStorage.getItem('runtime-python-v1'))localStorage.setItem('runtime-python-v1',legacy);
 },{project,legacy});
 await p.goto(`${base}/python/projects/${project.slug}`);await p.getByRole('button',{name:'Check complete project',exact:true}).waitFor();
 assert.equal(await p.getByText(/V1 history|Revision 2\.0|Projects · V2/).count(),0,'internal versioning stays out of product UI');
 assert.equal(await p.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),false);
 if(project.slug==='customer-data-quality'){
  for(let i=0;i<project.milestones.length;i++){
   await p.getByRole('navigation',{name:'Project milestones'}).getByRole('button').nth(i).click();
   await p.getByRole('button',{name:'Check milestone',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.pv-actions button')?.disabled,{},{timeout:120000});
   const passed=await p.evaluate(({ref,id})=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].milestones[id]?.passed,{ref:project.ref,id:project.milestones[i].id});assert.equal(passed,true,'cumulative milestone check');
  }
 }

 await p.getByRole('button',{name:'Check complete project',exact:true}).click();
 await p.waitForFunction(()=>!document.querySelector('.pv-actions button')?.disabled,{},{timeout:120000});
 await p.waitForFunction(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].evidence!==undefined,project.ref);
 const evidence=await p.evaluate(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].evidence,project.ref);
 assert.ok(evidence?.passed,JSON.stringify({project:project.slug,evidence,body:(await p.locator('.pv-output').innerText()).slice(-3000)}));
 for(const path of project.artifacts)assert.ok(evidence.artifacts.some(f=>f.path===path&&!f.truncated&&f.text.length>0),path);
 if(project.analytical){assert.equal(await p.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),false);await p.getByLabel('Final interpretation (at least 80 characters)').fill('The generated metrics reconcile to the accepted source records. The synthetic sample and excluded invalid records limit any claims about real customer behavior.');}
 await p.getByRole('button',{name:'Download verified project',exact:true}).click({trial:true});const download=p.waitForEvent('download');await p.getByRole('button',{name:'Download verified project',exact:true}).click();const file=await download;await file.saveAs(`${dir}/${engine}-${project.slug}.zip`);
 assert.equal(await p.evaluate(()=>localStorage.getItem('runtime-python-v1')),legacy,'legacy work unchanged');
 await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:`${dir}/${engine}-${project.slug}-desktop.png`});
 await p.reload();await p.getByRole('button',{name:'Check complete project',exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),true,'completion and files persist');
 await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:`${dir}/${engine}-${project.slug}-mobile.png`});
 const editor=p.locator('.cm-content');await editor.click();await p.keyboard.press(`${process.platform==='darwin'?'Meta':'Control'}+a`);await p.keyboard.insertText('# unfinished implementation\n');assert.equal(await p.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),false,'editing invalidates delivery');
 await p.getByRole('button',{name:'Check complete project',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.pv-actions button')?.disabled,{},{timeout:120000});
 await p.waitForFunction(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].evidence?.passed===false,project.ref);
 const failed=await p.evaluate(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].evidence,project.ref);assert.equal(failed.passed,false,'incorrect solution fails');
 assert.deepEqual(errors,[]);console.log('PASS',engine,project.slug,'reference, artifacts, archive, history, persistence, mobile, stale evidence, incorrect solution');await context.close();
}}finally{await b.close();}}
