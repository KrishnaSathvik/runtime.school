import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1440,height:900}});
for (const [name,path] of [['learn','/learn'],['lesson','/lesson/0'],['practice','/practice/shopper-contact-list'],['project','/projects/0']]) {
 await page.goto((process.env.BASE || 'http://localhost:3040')+path); await page.locator('main h1').waitFor(); await page.waitForTimeout(1800);
 await page.screenshot({path:`docs/acceptance/structural-ux/${process.env.PHASE || 'after'}-${name}.png`}); console.log(name,await page.locator('h1').allTextContents());
}
await browser.close();
