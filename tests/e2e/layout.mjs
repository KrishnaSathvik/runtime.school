// Actual rendered dimensions across routes. 125% cases emulate browser zoom's
// reduced CSS viewport + increased pixel density, not pinch zoom or CSS scaling.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE = process.env.BASE ?? 'http://127.0.0.1:3217';
const OUT = process.env.OUT ?? '/tmp/sqlstudio-layout/regression';
fs.mkdirSync(OUT, { recursive: true });
const routes = [
 ['home','/'],['questions','/practice/questions'],['track-list','/practice/tracks'],['case-list','/practice/cases'], ['learn','/learn'], ['module','/learn/3'],
 ['practice-hub','/practice'], ['practice','/practice/three-way-payment-reconciliation'],
 ['track','/practice/tracks/data-engineering'], ['understand','/lesson/0'],
 ['projects','/projects'], ['project','/projects/0'], ['milestone','/projects/0/milestone/45'],
 ['playground','/playground'], ['database-lab','/database-lab'],
 ['performance','/query-performance'], ['syntax','/sql-syntax'], ['settings','/settings'],
 ['explore','/explore'], ['review','/review'], ['placement','/placement'],
];
const browser = await chromium.launch();
const report = [];
const errors = [];
const jobs = ['light','dark'].flatMap(theme => [320,390,768,1024,1280,1440,1600,1920].flatMap(width =>
 (width >= 1024 ? [1,1.25,2] : [1]).map(zoom => ({theme,width,zoom}))));
async function check({theme,width,zoom}) {
 const cssWidth = Math.round(width / zoom);
 const ctx = await browser.newContext({viewport:{width:cssWidth,height:Math.round(1000 / zoom)},deviceScaleFactor:zoom,colorScheme:theme,reducedMotion:'reduce'});
 const page = await ctx.newPage();
 const issues=[];
 page.on('pageerror', e=>issues.push(e.message));
 page.on('console', m=>{if(m.type()==='error') issues.push(m.text());});
 for(const [name,path] of routes) {
  try {
   issues.length=0;
   await page.goto(BASE+path);
   await page.locator('main h1').waitFor();
   await page.waitForLoadState('networkidle');
   await page.evaluate(()=>document.fonts.ready);
   const m=await page.evaluate(()=>{
    const box=s=>{const e=document.querySelector(s); if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,inner:r.width-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight),font:parseFloat(c.fontSize)}};
    return {title:document.title,theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth>innerWidth+1,
     header:box('.rt-header'),work:box('main#main-content'),canvas:box('.canvas'),learning:box('.learn-page .learning-path'),
     practice:box('.practice-layout'),task:box('.task-pane'),editor:box('.editor-pane'),code:box('.cm-editor'),heading:box('h1'),metadata:box('.metadata'),nav:box('.nav-item'),
     overlay:!!document.querySelector('nextjs-error-overlay'),body:box('body')};
   });
   report.push({theme,width,zoom,cssWidth,name,...m});
   assert(m.title.includes('Runtime'),'page identity');
   assert.equal(m.theme,theme,'system theme resolves');
   assert(!m.overflow,'document horizontal overflow');
   assert(!m.overlay,'framework error overlay');
   assert.equal(issues.length,0,issues.join('\n')); issues.length=0;
   assert(Math.abs(m.work.w-cssWidth)<2,'content uses the full viewport width under the header');
   assert(m.header && Math.abs(m.header.w-cssWidth)<2,'header spans the viewport');
   if(name==='home' && cssWidth>=1280) {
    assert(m.canvas.inner>=Math.min(1120,cssWidth-96)-1,'Learn uses the hub content width');
    assert(Math.abs(m.learning.w-m.canvas.inner)<2,'Learn module rows use available width');
    assert.equal(await page.locator('main a[href="/playground"]').count(),0,'tools are not duplicated on Learn');
   }
   if(m.practice && cssWidth>900 && m.work.w>=800) {
    assert.equal(m.practice.w,m.work.w,'coding surface fills workspace');
    assert(m.editor.w>=m.work.w*0.55,'editor gets useful workspace share');
    assert(m.task.w>=280,'task remains readable');
    assert(Math.abs(m.editor.y-m.task.y)<2,'panes side by side');
   }
   if(m.code) assert.equal(m.code.font,cssWidth<=900?16:14,'editor font size');
   if(name==='settings') {
    // Same grid as other overview pages; individual controls and prose are not stretched.
    assert(m.canvas.inner>=Math.min(1100,m.work.w-96)-1,'settings shares the primary content grid');
    const widest=await page.evaluate(()=>Math.max(...[...document.querySelectorAll('.canvas.settings > section > *')].map(e=>e.getBoundingClientRect().width)));
    assert(widest<=761,'settings controls and text keep a readable width');
   }
   await page.screenshot({path:`${OUT}/${theme}-${width}-${zoom}-${name}.png`});
  } catch(e) {errors.push({theme,width,zoom,name,error:e.message}); console.error(theme,width,zoom,name,e.message);}
 }
 fs.writeFileSync(OUT+'/report.json',JSON.stringify({report,errors},null,2));
 await ctx.close();
 console.log(`${theme} ${width}px ${zoom*100}% complete`);
}
// Independent contexts, bounded concurrency to keep the local server responsive.
for(let i=0;i<jobs.length;i+=3) await Promise.all(jobs.slice(i,i+3).map(check));
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto(BASE+'/settings');
for(const theme of ['dark','light']) {await page.getByRole('button',{name:theme[0].toUpperCase()+theme.slice(1),exact:true}).click();await page.waitForFunction(t=>document.documentElement.dataset.theme===t,theme);}
await page.getByRole('button',{name:'System',exact:true}).click();
await page.emulateMedia({colorScheme:'dark'}); await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
await page.setViewportSize({width:390,height:844}); await page.goto(BASE+'/sql');
await page.getByRole('button',{name:'SQL tools'}).click();
await page.locator('.rt-menu-panel').getByRole('link',{name:/SQL Playground/}).click();
await page.waitForURL('**/playground');
await page.locator('.cm-content').click();
assert.equal(await page.locator('.rt-header').isVisible(),true);
assert.equal(await page.locator('.mobile-nav').count(),0);
await page.getByRole('button',{name:'Run query',exact:true}).click();
await page.locator('.results-panel .results-table').first().waitFor();
await page.screenshot({path:OUT+'/mobile-results.png'});
await browser.close();
fs.writeFileSync(OUT+'/report.json',JSON.stringify({report,errors,interactions:'collapse/expand, explicit and system themes, mobile editor focus and query results passed'},null,2));
console.log(`${report.length} route/viewport/theme measurements; ${errors.length} failures`);
for(const error of errors)console.error(error);
assert.equal(errors.length,0,'responsive layout failures');
