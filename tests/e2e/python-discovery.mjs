import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE??'http://127.0.0.1:3052';
const DIR='docs/python/screens/discovery';
fs.mkdirSync(DIR,{recursive:true});
const browser=await chromium.launch();
const results=[];
try {
for(const mobile of [false,true]) for(const colorScheme of ['light','dark']) {
 const name=`${mobile?'mobile':'desktop'}-${colorScheme}`;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},colorScheme});
 const p=await context.newPage();
 const count=()=>p.locator('.py-project-catalog > li').count();
 await p.goto(`${BASE}/python/projects?browse=1`);
 assert.equal(await count(),6);
 await p.getByLabel('Difficulty',{exact:true}).selectOption('beginner'); assert.equal(await count(),1);
 await p.getByRole('link',{name:'Retail Order Engine',exact:true}).waitFor();
 await p.getByLabel('Difficulty',{exact:true}).selectOption('intermediate'); assert.equal(await count(),3);
 await p.getByLabel('Difficulty',{exact:true}).selectOption('advanced'); assert.equal(await count(),2);
 await p.getByLabel('Skill',{exact:true}).selectOption('pandas'); assert.equal(await count(),1);
 await p.getByLabel('Search projects').fill('no-project-like-this'); assert.equal(await count(),0);
 await p.getByText('No projects match these filters.',{exact:false}).waitFor();
 await p.getByRole('button',{name:'Clear filters',exact:true}).click(); assert.equal(await count(),6);
 assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({path:`${DIR}/${name}-projects.png`,fullPage:true});
 await p.getByRole('link',{name:'Retail Order Engine',exact:true}).click();
 assert.equal(await p.getByText('Preparation lessons',{exact:true}).count(),0);
 assert.equal(await p.locator('.py-task-cell').count(),0);
 assert.equal(await p.locator('.py-file-data table').count(),2);
 assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
 await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({path:`${DIR}/${name}-preparation.png`,fullPage:true});
 await p.goto(`${BASE}/python?browse=1`);
 await p.getByRole('link',{name:'Practice strings and text',exact:true}).click();
 await p.waitForURL('**/python/practice?module=strings#questions');
 assert.equal(await p.getByLabel('Module',{exact:true}).inputValue(),'strings');
 assert.equal(await p.locator('.py-catalog-list').last().getByRole('link').count(),10);
 await p.reload(); assert.equal(await p.getByLabel('Module',{exact:true}).inputValue(),'strings');
 await p.goto(`${BASE}/python/practice?module=unknown`);
 assert.equal(await p.getByLabel('Module',{exact:true}).inputValue(),'');
 assert.equal(await p.locator('.py-catalog-list').last().getByRole('link').count(),120);
 results.push(name); console.log('PASS',name,'filters, preparation, source data, module practice, accessibility');
 await context.close();
}
fs.writeFileSync(`${DIR}/results.json`,JSON.stringify({passed:results},null,2)+'\n');
} finally {await browser.close();}
