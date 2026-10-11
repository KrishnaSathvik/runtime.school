import {chromium} from 'playwright';
import {AxeBuilder} from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const BASE=process.env.BASE??'http://127.0.0.1:3232';
const OUT=process.env.OUT??'docs/v5/learn-main';fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch();const results=[];
for(const theme of ['light','dark'])for(const width of [390,1440]){
 const ctx=await browser.newContext({viewport:{width,height:1000},colorScheme:theme});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(BASE);await p.waitForURL('**/learn');await p.getByRole('link',{name:'Start learning',exact:true}).waitFor();
  assert.equal(await p.locator('.sidebar').getByRole('link',{name:'Home',exact:true}).count(),0);
  assert.equal(await p.locator('.sidebar-brand').getAttribute('href'),'/learn');
  assert.equal(await p.locator('.topbar').innerText().then(t=>t.includes('Learn')),false);
  assert.equal(await p.locator('.learning-path .index-row').count(),10);
  assert.equal(await p.locator('main .btn.primary').count(),1);
  assert.equal(await p.getByRole('heading',{name:'Explore SQL Studio'}).count(),0);
  await p.screenshot({path:`${OUT}/learn-${theme}-${width}.png`,fullPage:true});
  const scan=await new AxeBuilder({page:p}).analyze();assert.deepEqual(scan.violations.map(v=>v.id),[]);
  await p.getByRole('link',{name:'Start learning',exact:true}).click();await p.waitForURL('**/lesson/0');
  await p.getByRole('button',{name:/Try it yourself/}).click();await p.getByRole('button',{name:/^Challenge 2/}).first().click();
  await p.locator('.cm-content').click();await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText('SELECT name FROM products');
  await p.goto(BASE+'/projects/0/milestone/45');await p.getByRole('navigation',{name:'Project steps'}).waitFor();
  await p.goto(BASE+'/practice/shopper-contact-list');await p.locator('.cm-content').waitFor();
  await p.goto(BASE+'/learn');await p.getByRole('link',{name:'Continue lesson',exact:true}).click();await p.waitForURL('**/lesson/0');
  await p.locator('.cm-content').waitFor();assert.equal(await p.locator('.cm-content').innerText(),'SELECT name FROM products');
  assert.match(await p.locator('[aria-current="step"]').innerText(),/Practice/);
  await p.reload();assert.equal(await p.locator('.cm-content').innerText(),'SELECT name FROM products');
  await p.goto(BASE+'/progress');assert.equal(await p.locator('main h1').innerText(),'Your SQL progress');
  if(width<640)await p.getByRole('button',{name:'Expand sidebar',exact:true}).click();
  await p.getByRole('link',{name:'SQL Studio',exact:true}).click();await p.waitForURL('**/learn');
  assert.deepEqual(errors,[]);results.push({theme,width,ok:true});console.log('PASS',theme,width,'redirect, navigation, real course resume, isolation and accessibility');
 }catch(e){results.push({theme,width,ok:false,error:e.stack});console.error(e);}finally{await ctx.close();}
}
await browser.close();fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,2));process.exitCode=results.some(r=>!r.ok)?1:0;
