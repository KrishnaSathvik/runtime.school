import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();
const dir='docs/acceptance/structural-ux';
async function go(path){await page.goto('http://localhost:3040'+path);await page.locator('main h1').waitFor();await page.getByText('Loading your saved work…',{exact:true}).waitFor({state:'hidden'});}
async function shot(name){await page.screenshot({path:`${dir}/${name}.png`});}
try {
 for(const [name,path] of [['learn','/learn'],['project','/projects/0']]){await go(path);await shot(`after-${name}`);}
 await go('/practice/shopper-contact-list');await page.locator('.cm-content').click();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.insertText('SELECT name, email FROM shoppers;');
 for(const theme of ['light','dark']){
  await go('/settings');await page.getByRole('button',{name:theme==='light'?'Light':'Dark',exact:true}).click();
  for(const [name,width,height] of [['desktop',1440,900],['short',1440,560],['mobile',390,844]]){
   await page.setViewportSize({width,height});await go('/practice/shopper-contact-list');await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.locator('.outcome-ok').waitFor();
   if(name==='mobile')await page.locator('.results-panel').scrollIntoViewIfNeeded();
   await shot(`after-practice-${theme}-${name}`);
   if(name==='desktop'){
    assert.ok((await page.getByRole('region',{name:'Query output: name, email'}).locator('tbody tr').first().boundingBox()).y<height,'Actual result rows appear alongside feedback');
    if(theme==='light')await shot('after-practice');
    const before=await page.locator('.sql-editor-surface').boundingBox();await page.getByRole('separator',{name:'Resize editor and results'}).focus();await page.keyboard.press('ArrowDown');
    assert.ok((await page.locator('.sql-editor-surface').boundingBox()).height>before.height,'Editor/results resizing preserved');
    await page.getByRole('separator',{name:'Resize editor and results'}).dblclick();
   }
  }
  await page.setViewportSize({width:1440,height:900});
 }
 console.log('PASS final desktop result rows visible, editor/results resizing, short/mobile light/dark screenshots');
}finally{await browser.close();}
