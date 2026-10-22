import { chromium } from '../../../../../node_modules/playwright/index.mjs';
import fs from 'node:fs';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9347');
const context=browser.contexts()[0];
const page=context.pages()[0] ?? await context.newPage();
page.setDefaultTimeout(8000); page.setDefaultNavigationTimeout(30000);
const file=process.argv[2];
try {
 const run=new (Object.getPrototypeOf(async function(){}).constructor)('page','context','browser','fs',fs.readFileSync(file,'utf8'));
 const result=await run(page,context,browser,fs);
 const receipt={at:new Date().toISOString(),script:file,url:page.url(),result};
 fs.writeFileSync(file+'.result.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
} catch(e){const receipt={at:new Date().toISOString(),script:file,url:page.url(),error:String(e)};fs.writeFileSync(file+'.result.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));}
process.exit(0);
