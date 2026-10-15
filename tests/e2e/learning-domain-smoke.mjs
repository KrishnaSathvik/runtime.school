import {chromium} from 'playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.BASE??'http://127.0.0.1:3100',audit=JSON.parse(fs.readFileSync('docs/sql-phase1/audit.json')),bank=audit.questions.filter(q=>q.id.startsWith('qb-'));
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const id of [1,98,53,107,89,84,92,111,113,93,6,114]){
 const q=bank.find(q=>q.id===`qb-${String(id).padStart(4,'0')}`);await page.goto(base+'/sql/practice/'+q.slug);await page.locator('.cm-content').fill(q.solution);const start=Date.now();await page.getByRole('button',{name:q.exerciseType==='debug'?'Check fix':'Check',exact:true}).click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('sql-studio-v1')).state.questions[id]?.solved,q.id);results.push({dataset:q.datasetId,question:q.id,checkMs:Date.now()-start});
 const next=bank[bank.indexOf(q)+1];if(next)await page.waitForURL('**/sql/practice/'+next.slug);
 }
 assert.equal(new Set(results.map(r=>r.dataset)).size,12);
 await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('sql-studio-v1'));data.state.stats={0:{solved:[0,1],check:true,legacy:false}};data.state.reviews={0:{level:0,due:Date.now()-1000,history:[]}};localStorage.setItem('sql-studio-v1',JSON.stringify(data));});
 await page.goto(base+'/review/0');const l=audit.lessons.find(l=>l.id===0);await page.getByRole('button',{name:l.quiz.options[l.quiz.correct],exact:true}).click();await page.getByRole('button',{name:/Next: write/}).click();await page.locator('.cm-content').fill(l.challenges[0].answer);await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.getByText(/Next review in 3 days/).waitFor();
 await page.goto(base+'/placement');await page.getByRole('button',{name:/Start the check/}).click();await page.locator('.cm-content').fill(l.challenges[0].answer);await page.getByRole('button',{name:'Check answer',exact:true}).click();await page.locator('.results-panel .feedback-ok').first().waitFor();
 assert.deepEqual(errors,[]);fs.writeFileSync('docs/sql-phase1/domain-browser-results.json',JSON.stringify({domains:results,review:true,placement:true,pageErrors:errors},null,2)+'\n');console.log('PASS twelve domain checks, canonical review, canonical placement');
}catch(error){console.error('PAGE',page.url(),await page.locator('body').innerText());throw error;}finally{await browser.close();}
