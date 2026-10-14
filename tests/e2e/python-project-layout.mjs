import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const projects=JSON.parse(fs.readFileSync('src/content/python/projects-v2/catalog.json'));
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1365,height:1000}});
 const page=await context.newPage();
 for(const project of projects){
  await page.goto(`http://127.0.0.1:3052/python/projects/${project.slug}`);
  await page.locator('.cm-content').waitFor();
  const left=page.locator('.pv-brief'),right=page.locator('.pv-work');
  assert.ok(await left.getByRole('heading',{name:'Start here',exact:true}).isVisible());
  assert.equal(await left.getByRole('group',{name:'File explorer'}).count(),1);
  assert.equal(await right.locator('.pv-explorer,.pv-dataset,.pv-delivery').count(),0);
  assert.equal(await page.getByText(/View sample|Dataset generation rules|V1 history|Revision 2\.0/).count(),0);
  assert.equal(await left.locator('.pv-dataset').count(),project.datasets.length);
  const original=await right.locator('.cm-content').innerText();
  await left.getByRole('button',{name:project.datasets[0].path,exact:true}).click();
  assert.equal(await right.locator('.cm-content').innerText(),original);
  assert.ok(await left.locator('.pv-inspected').isVisible());
  await left.getByRole('button',{name:'Close preview',exact:true}).click();
  for(const width of [1365,600,390,360]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${project.slug}: ${width}`);
  }
  if(project.slug==='customer-data-quality'){
   await page.setViewportSize({width:1365,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/python/projects-v2/screens/current-project-desktop.png'});
   await page.locator('.pv-inputs').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/python/projects-v2/screens/current-inputs-desktop.png'});
   await page.setViewportSize({width:390,height:844});await page.locator('.pv-inputs').scrollIntoViewIfNeeded();await page.screenshot({path:'docs/python/projects-v2/screens/current-project-mobile.png'});
   const a11y=await new AxeBuilder({page}).include('.py-project-v2').analyze();
   assert.deepEqual(a11y.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
  }
  console.log('PASS',project.slug,'visible inputs, left file navigation, persistent editor, responsive layout');
 }
}finally{await browser.close();}
