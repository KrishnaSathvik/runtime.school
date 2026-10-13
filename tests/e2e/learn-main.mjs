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
  await p.goto(BASE);
  await p.getByRole('heading',{name:'What would you like to learn?'}).waitFor();
  await p.getByRole('link',{name:'Start SQL'}).click();
  await p.waitForURL(url=>new URL(url).pathname==='/sql');
  await p.getByRole('heading',{name:'Learn SQL by doing.'}).waitFor();
  assert.equal(await p.locator('.rt-wordmark').getAttribute('href'),'/');
  assert.ok(await p.getByRole('navigation',{name:width<=640?'Primary mobile':'Main'}).getByRole('link',{name:'Learn',exact:true}).count()>0);
  assert.ok(await p.getByRole('navigation',{name:width<=640?'Primary mobile':'Main'}).getByRole('link',{name:'Practice',exact:true}).count()>0);
  assert.ok(await p.getByRole('navigation',{name:width<=640?'Primary mobile':'Main'}).getByRole('link',{name:'Projects',exact:true}).count()>0);
  assert.equal(await p.getByRole('navigation',{name:width<=640?'Primary mobile':'Main'}).getByRole('link',{name:'My Learning',exact:true}).count(),0);
  assert.equal(await p.getByRole('navigation',{name:width<=640?'Primary mobile':'Main'}).getByRole('link',{name:'Explore',exact:true}).count(),0);
  await p.screenshot({path:`${OUT}/learn-${theme}-${width}.png`,fullPage:true});
  const scan=await new AxeBuilder({page:p}).analyze();assert.deepEqual(scan.violations.map(v=>v.id),[]);

  await p.goto(BASE+'/skills/sql');
  await p.waitForURL(url=>new URL(url).pathname==='/sql');
  await p.locator('#module-0').click();
  await p.locator('.module-start').click();
  await p.waitForURL(/\/(lesson\/0|learn\/sql\/)/);
  await p.getByRole('button',{name:/Try it yourself/}).click();
  await p.getByRole('button',{name:/^Challenge 2/}).first().click();
  await p.locator('.cm-content').click();await p.keyboard.press('ControlOrMeta+A');await p.keyboard.insertText('SELECT name FROM products');

  await p.goto(BASE+'/projects/0/milestone/45');await p.getByRole('navigation',{name:'Project steps'}).waitFor();
  await p.goto(BASE+'/practice/shopper-contact-list');await p.locator('.cm-content').waitFor();

  await p.goto(BASE+'/practice');
  await p.waitForURL('**/practice/questions');
  await p.getByRole('heading',{name:'Sharpen your SQL.'}).waitFor();
  await p.getByRole('heading',{level:1}).waitFor();
  await p.goto(BASE+'/projects');
  await p.waitForURL('**/projects/sql');
  await p.getByRole('heading',{level:1}).waitFor();

  await p.goto(BASE+'/learn');
  await p.getByRole('heading',{name:'Learn SQL by doing.'}).waitFor();
  await p.locator('#module-0').click();
  await p.locator('.module-start').click();
  await p.waitForURL(/\/(lesson\/\d+|learn\/sql\/)/);
  await p.locator('.cm-content').waitFor();
  assert.equal(await p.locator('.cm-content').innerText(),'SELECT name FROM products');
  assert.match(await p.locator('[aria-current="step"]').innerText(),/Practice/);
  await p.reload();assert.equal(await p.locator('.cm-content').innerText(),'SELECT name FROM products');

  await p.goto(BASE+'/my-learning');
  await p.waitForURL(url=>new URL(url).pathname==='/sql');
  await p.getByRole('heading',{name:'Learn SQL by doing.'}).waitFor();
  await p.goto(BASE+'/progress');
  await p.waitForURL(url=>new URL(url).pathname==='/sql');

  await p.goto(BASE+'/subjects');
  await p.waitForURL(url=>new URL(url).pathname==='/');
  await p.getByRole('heading',{name:'What would you like to learn?'}).waitFor();

  await p.goto(BASE+'/sql');
  if(width<=640){
    const mobile=p.getByRole('navigation',{name:'Primary mobile'});
    assert.equal(await mobile.getByRole('link').count(),3);
    assert.ok(await mobile.getByRole('link',{name:'Learn'}).count()>0);
  }

  await p.getByRole('banner').getByRole('link',{name:'Runtime home',exact:true}).click();
  await p.getByRole('heading',{name:'What would you like to learn?'}).waitFor();
  assert.equal(await p.getByRole('link',{name:'Progress',exact:true}).count(),0);
  assert.deepEqual(errors,[]);results.push({theme,width,ok:true});console.log('PASS',theme,width,'Learn home, Practice/Projects redirect, no My Learning');
 }catch(e){results.push({theme,width,ok:false,error:e.stack});console.error(e);}finally{await ctx.close();}
}
await browser.close();fs.writeFileSync(OUT+'/results.json',JSON.stringify(results,null,2));process.exitCode=results.some(r=>!r.ok)?1:0;
