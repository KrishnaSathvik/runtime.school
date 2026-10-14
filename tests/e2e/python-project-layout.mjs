import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
const projects=JSON.parse(fs.readFileSync('src/content/python/projects-v2/catalog.json'));
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1365,height:1000}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:3052/python/projects');
 await page.getByRole('heading',{name:'Before you start',exact:true}).waitFor();
 assert.equal(new URL(page.url()).pathname,`/python/projects/${projects[0].slug}`);
 assert.equal(new URL(page.url()).hash,'#overview');
 for(const project of projects){
  await page.setViewportSize({width:1365,height:1000});
  await page.locator('.pv-project-picker summary').click();
  assert.equal(await page.getByRole('navigation',{name:'Python projects',exact:true}).getByRole('link').count(),projects.length);
  await page.getByRole('navigation',{name:'Python projects',exact:true}).getByRole('link',{name:project.title,exact:true}).click();
  await page.waitForURL(url=>url.pathname===`/python/projects/${project.slug}`);
  await page.getByRole('heading',{name:project.title,exact:true}).waitFor();
  await page.getByRole('heading',{name:'Before you start',exact:true}).waitFor();
  assert.equal(await page.locator('.pv-stage-nav > span').count(),0);
  assert.equal(await page.getByRole('button',{name:'Start project',exact:true}).count(),0);
  const overview=await page.locator('.pv-overview').boundingBox();const container=await page.locator('.pv-stage-nav').boundingBox();assert.ok(Math.abs(overview.width-container.width)<2);
  await page.getByRole('navigation',{name:'Project stages'}).getByRole('button',{name:'Build',exact:true}).click();
  const left=page.locator('.pv-brief'),right=page.locator('.pv-work');
  await right.locator('.cm-content').waitFor();
  assert.equal(await page.locator('.pv-stage-nav > span').count(),1);
  assert.equal(await page.getByLabel('Results height').count(),0);
  assert.equal(await page.getByRole('button',{name:'Go to Test & deliver',exact:true}).count(),0);
  assert.ok(await right.locator('.cm-scroller').evaluate(el=>getComputedStyle(el).overflowY==='visible'&&el.scrollHeight<=el.clientHeight+2));
  assert.ok(await right.locator('.pv-results').evaluate(el=>getComputedStyle(el).overflowY==='visible'&&el.clientHeight<140));
  const taskBox=await left.boundingBox(),editorBox=await right.boundingBox();assert.ok(Math.abs(taskBox.width-editorBox.width)<2,'default equal columns');
  assert.equal(await left.getByRole('group',{name:'File explorer'}).count(),1);
  const filesBox=await left.locator('.pv-files').boundingBox(),milestoneBox=await left.locator('.pv-current-step').boundingBox();assert.ok(filesBox.y+filesBox.height<=milestoneBox.y,'files above milestone');
  assert.equal(await page.getByRole('button',{name:'Check complete project',exact:true}).count(),0);
  assert.equal(await right.locator('.pv-explorer,.pv-delivery').count(),0);
  assert.equal(await page.getByText(/Dataset generation rules|V1 history|Revision 2\.0/).count(),0);
  assert.equal(await page.locator('#project-milestone').count(),0);
  assert.equal(await page.getByRole('button',{name:'Continue to next milestone',exact:true}).isEnabled(),false);
  await left.getByRole('button',{name:/^Open .*\(\) in /}).click();
  const original=await page.evaluate(ref=>JSON.stringify(JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].files),project.ref);
  const codeFile=await right.locator('.pv-file-head b').innerText();
  await left.getByRole('button',{name:'Data',exact:true}).click();
  assert.ok(await left.locator('.pv-inputs').isVisible());
  await left.getByRole('button',{name:'Open full input',exact:true}).click();
  assert.equal(await right.getByRole('textbox').textContent(),project.files[project.datasets[0].path]);
  assert.ok(await right.getByRole('textbox').getAttribute('aria-readonly')==='true');
  await left.getByRole('button',{name:codeFile,exact:true}).click();
  assert.equal(await page.evaluate(ref=>JSON.stringify(JSON.parse(localStorage.getItem('runtime-python-projects-v2')).projects[ref]['2.0.0'].files),project.ref),original);
  assert.equal(await right.locator('.pv-file-head b').innerText(),codeFile);
  await left.getByRole('button',{name:'Task',exact:true}).click();
  const separator=page.getByRole('separator',{name:'Resize task and editor columns'});await separator.focus();await page.keyboard.press('ArrowRight');assert.equal(await separator.getAttribute('aria-valuenow'),'52');await page.keyboard.press('ArrowLeft');
  for(const width of [1365,600,390,360]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${project.slug}: ${width}`);
  }
  if(project.slug==='customer-data-quality'){
   await page.setViewportSize({width:1365,height:1000});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/python/projects-v2/screens/current-project-desktop.png'});
   await left.getByRole('button',{name:'Data',exact:true}).click();await page.screenshot({path:'docs/python/projects-v2/screens/current-inputs-desktop.png'});
   await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'docs/python/projects-v2/screens/current-project-mobile.png'});
   await page.getByRole('navigation',{name:'Workspace shortcuts'}).getByRole('button',{name:'Editor',exact:true}).click();assert.ok(await right.locator('.cm-content').isVisible());
   await page.getByRole('navigation',{name:'Workspace shortcuts'}).getByRole('button',{name:'Tests',exact:true}).click();assert.equal(await page.getByRole('group',{name:'Output views'}).getByRole('button',{name:'Tests',exact:true}).getAttribute('aria-pressed'),'true');
   const a11y=await new AxeBuilder({page}).include('.py-project-v2').analyze();
   assert.deepEqual(a11y.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id),[]);
  }
  await page.getByRole('navigation',{name:'Project stages'}).getByRole('button',{name:'Test & deliver',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Check complete project',exact:true}).isVisible());
  assert.equal(await page.getByRole('button',{name:'Download verified project',exact:true}).isEnabled(),false);
  assert.ok(await page.getByRole('heading',{name:'Still to do',exact:true}).isVisible());
  assert.equal(await page.locator('.pv-stage-nav > span').count(),0);
  if(project.slug==='customer-data-quality'){await page.setViewportSize({width:1365,height:1000});await page.screenshot({path:'docs/python/projects-v2/screens/current-delivery-desktop.png'});}
  const finish=await page.locator('.pv-finish').boundingBox();const stageNav=await page.locator('.pv-stage-nav').boundingBox();assert.ok(Math.abs(finish.width-stageNav.width)<2);
  console.log('PASS',project.slug,'stage flow, task/data, full files, editor, resize, responsive layout');
 }
}finally{await browser.close();}
