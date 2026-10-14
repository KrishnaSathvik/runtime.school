import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch();
const BASE=process.env.BASE??'http://127.0.0.1:3052';
const mod=process.platform==='darwin'?'Meta':'Control';
const results=[];
try {
for (const mobile of [false,true]) for (const colorScheme of ['light','dark']) {
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},colorScheme});
 const p=await context.newPage();
 await p.goto(`${BASE}/python/playground`);
 await p.getByLabel('Libraries').selectOption('data');
 await p.locator('.cm-content').click(); await p.keyboard.press(`${mod}+a`);
 await p.keyboard.insertText('import pandas as pd\ndisplay(pd.DataFrame({"item": ["Lamp", "Pen"], "qty": [2, 3]}))\ndisplay(pd.DataFrame({"total": [5]}))');
 await p.getByRole('button',{name:'Run code',exact:true}).click();
 await p.getByText('Program finished.',{exact:true}).waitFor({timeout:120000});
 assert.equal(await p.getByRole('table').count(),2);
 assert.deepEqual(await p.getByRole('table').first().getByRole('columnheader').allTextContents(),['index','itemstr','qtyint64']);
 assert.deepEqual(await p.getByRole('table').first().getByRole('rowheader').allTextContents(),['0','1']);
 assert.deepEqual(await p.getByRole('table').first().getByRole('cell').allTextContents(),['Lamp','2','Pen','3']);
 assert.deepEqual((await new AxeBuilder({page:p}).analyze()).violations.map(v=>v.id),[]);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const name=`${mobile?'mobile':'desktop'}-${colorScheme}-tables`;
 await p.screenshot({path:`docs/python/screens/subject/${name}.png`,fullPage:true});
 results.push(name);console.log('PASS',name);
 await context.close();
}
fs.writeFileSync('docs/python/screens/subject/table-results.json',JSON.stringify({passed:results},null,2)+'\n');
} finally {await browser.close();}
