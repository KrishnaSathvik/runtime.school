import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const project=JSON.parse(fs.readFileSync('src/content/python/projects-v2/catalog.json')).find(p=>p.slug==='customer-data-quality');
const code=project.reference['cleaning.py'];
const snippet=name=>{const start=code.indexOf(`def ${name}(`),next=code.indexOf('\ndef ',start+1);return code.slice(start,next<0?code.length:next).trimEnd();};
const browser=await chromium.launch();
try{
 const context=await browser.newContext();const page=await context.newPage();
 await page.goto('http://127.0.0.1:3052/python/projects/customer-data-quality');
 await page.getByRole('button',{name:'Start building',exact:true}).click();
 const check=async(i,expected)=>{
  await page.getByRole('button',{name:'Check milestone',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('.pv-actions button')?.disabled,{},{timeout:120000});
  await page.waitForFunction(({ref,id,expected})=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].milestones[id]?.passed===expected,{ref:project.ref,id:project.milestones[i].id,expected});
 };
 for(let i=0;i<project.milestones.length;i++){
  const name=project.milestones[i].objective.match(/Implement (\w+)/)[1];
  assert.match(await page.locator('.pv-current-step').innerText(),new RegExp(`${i+1} of 4`));
  const editor=page.locator('.cm-content');
  const visible=await editor.innerText();assert.ok(visible.includes(`def ${name}(`));
  assert.equal((visible.match(/^def /gm)??[]).length,1,'only current function appears');
  assert.equal(await page.getByRole('navigation',{name:'Milestone progress'}).count(),0);
  assert.equal(await page.getByRole('button',{name:/Continue to/}).count(),0);
  await editor.fill(snippet(name));await check(i,true);
  if(i<3)await page.waitForFunction(expected=>document.querySelector('.pv-current-step')?.textContent.includes(expected),`${i+2} of 4`);
  else await page.getByRole('button',{name:'Check complete project',exact:true}).waitFor();
  const saved=await page.evaluate(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].files['cleaning.py'],project.ref);
  for(let earlier=0;earlier<=i;earlier++)assert.ok(saved.includes(snippet(project.milestones[earlier].objective.match(/Implement (\w+)/)[1])));
  if(i===1){await page.reload();await page.getByRole('button',{name:'Check milestone',exact:true}).waitFor();assert.match(await page.locator('.pv-current-step').innerText(),/3 of 4/);}
 }
 await page.getByRole('button',{name:'Check complete project',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('.pv-actions button')?.disabled,{},{timeout:120000}).catch(()=>{});
 await page.waitForFunction(ref=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].evidence?.passed===true,project.ref,{timeout:120000});
 assert.equal(await page.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),true);
 await context.close();
 // Deliberately broken earlier code with a previously saved pass cannot earn milestone 2 credit.
 const broken=code.replace(/def normalize_customer\(record\):[\s\S]*?(?=\ndef )/,"def normalize_customer(record):\n    raise NotImplementedError('Implement normalize_customer')\n");
 const negative=await browser.newContext();await negative.addInitScript(({project,broken})=>{if(localStorage.getItem('runtime-python-projects-v2'))return;localStorage.setItem('runtime-python-projects-v2',JSON.stringify({version:2,projects:{[project.ref]:{[project.revision]:{files:{...project.reference,'cleaning.py':broken},selected:'cleaning.py',milestone:1,interpretation:'',milestones:{[project.milestones[0].id]:{passed:true,snapshot:'older code'}}}}}}));},{project,broken});
 const bad=await negative.newPage();await bad.goto('http://127.0.0.1:3052/python/projects/customer-data-quality#build');await bad.getByRole('button',{name:'Check milestone',exact:true}).click();
 await bad.waitForFunction(({ref,id})=>JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].milestones[id]?.passed===false,{ref:project.ref,id:project.milestones[1].id},{timeout:120000});
 assert.match(await bad.locator('.pv-current-step').innerText(),/2 of 4/,'failed check stays on current milestone');
 assert.match(await bad.locator('.pv-results').innerText(),/NotImplementedError|Implement normalize_customer/);
 console.log('PASS guided four-step build, only-current-function editing, continuation gates, earlier code preservation, reload, full acceptance and missing-prerequisite rejection');
 await negative.close();
}finally{await browser.close();}
