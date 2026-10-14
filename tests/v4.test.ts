import fs from 'node:fs';
import { mergeStorageWrite } from '@/lib/storage-merge';
import crypto from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { allQuestions,bankCheckRequest,bankRunRequest,bankQuestions,bankById,practiceDatasets } from '@/content/question-bank';
import { v4Exercises } from '@/content/question-bank/v4-questions';
import { capacityQuestions } from '@/content/question-bank/capacity-questions';
import { gradePrediction,parsePrediction } from '@/engine/prediction';
import { migrateLearning,useLearning } from '@/lib/learning-state';
import { bootWorker } from './helpers/original';
let send:Awaited<ReturnType<typeof bootWorker>>;
beforeAll(async()=>{send=await bootWorker();});
const anchors:Record<string,unknown[][]>={
 'qb-0072':[[1,20],[1,30],[2,null],[3,null],[4,null]],'qb-0073':[[3]],'qb-0074':[['Blue',2,1],['Red',2,2]],
 'qb-0075':[[1,1,1,1],[2,2,1,1],[3,3,3,2]],'qb-0076':[[3,50,50,50],[1,80,210,130],[2,80,210,210]],'qb-0077':[[1,null],[2,80],[3,null],[4,50]],
 'qb-0078':[[4]],'qb-0079':[[1,30],[2,null],[3,null],[4,null]],'qb-0080':[[1,2],[2,1],[3,0],[4,0]],'qb-0081':[[50]],'qb-0082':[[11],[12],[14]],'qb-0083':[[1,80],[2,80],[3,null],[4,null]],
 'qb-0084':[[1,80],[2,0],[3,0]],'qb-0085':[[1,'North',40],[2,'North',40],[3,'South',0],[4,null,10]],'qb-0086':[[1,'2026-04-10',15],[2,'2026-04-30',5],[3,'2026-04-01',12],[4,null,0]],'qb-0087':[[1,40,15],[2,40,5],[3,0,12],[4,10,0]],'qb-0088':[[1,100],[2,12],[3,0]],
};
it('preserves the legacy inventory and adds exactly the authored modalities and stages',()=>{
 expect(allQuestions()).toHaveLength(264);expect(allQuestions().filter(q=>q.practiceEligible)).toHaveLength(249);
 expect(v4Exercises.filter(q=>q.exerciseType==='predict')).toHaveLength(6);expect(v4Exercises.filter(q=>q.exerciseType==='debug')).toHaveLength(6);
 expect(capacityQuestions).toHaveLength(5);expect(Object.keys(practiceDatasets)).toHaveLength(11);
 expect(bankQuestions.slice(0,71).map(q=>q.id)).toEqual(Array.from({length:71},(_,i)=>`qb-${String(i+1).padStart(4,'0')}`));
});
it.each([...v4Exercises,...capacityQuestions])('$id has independently calculated semantic anchors',async q=>{
 const r=await send(bankRunRequest(q,q.solution));expect(r.error).toBeUndefined();expect(r.result.values).toEqual(anchors[q.id]);
});
it.each(v4Exercises.filter(q=>q.exerciseType==='debug'))('$id broken starter fails both visible and changed fixtures',async q=>{
 const request=bankCheckRequest(q,q.starterSql!);
 for(const seed of [request.seed,request.seed+'\n'+request.mutation]) {
 const r=await send({...request,seed,mutation:null});expect(r.error).toBeUndefined();expect(r.grade?.ok).toBe(false);
 }
});
it('second distinct balance handles no second value, NULL and extra ties',async()=>{
 const q=bankById.get('qb-0081')!;
 for(const change of ['DELETE FROM studio_members;','UPDATE studio_members SET credits=80;','UPDATE studio_members SET credits=NULL;']) {
  for(const query of [q.solution,...q.equivalent!]){const r=await send({...bankCheckRequest(q,query),seed:bankRunRequest(q,query).seed+change,mutation:null});expect(r.grade?.ok).toBe(true);expect(r.result.values).toEqual([]);}
 }
});
describe('typed prediction grading',()=>{
 const expected={columns:['v'],values:[[null],[1],[1],['1'],['']]};
 it('preserves NULL, empty text, numeric types and multiplicity',()=>{
  expect(gradePrediction(parsePrediction('[[null],[1],[1],["1"],[""]]',1),['v'],expected,true).ok).toBe(true);
  expect(gradePrediction([[null],[1],[1],[1],['']],['v'],expected,true).ok).toBe(false);
  expect(gradePrediction([[null],[1],['1'],['']],['v'],expected,false).ok).toBe(false);
 });
 it('ignores row order only when the task allows it',()=>{
  const rows=parsePrediction('[[""],["1"],[1],[1],[null]]',1);
  expect(gradePrediction(rows,['v'],expected,false).ok).toBe(true);expect(gradePrediction(rows,['v'],expected,true).ok).toBe(false);
  expect(gradePrediction(rows,['wrong'],expected,false).ok).toBe(false);
 });
 it.each(['null','{}','[[true]]','[[{}]]','[[1,2]]','[[1e999]]','NaN'])('rejects malformed or non-SQL cells: %s',text=>expect(()=>parsePrediction(text,1)).toThrow());
 it('accepts zero rows',()=>expect(gradePrediction(parsePrediction('[]',1),['v'],{columns:['v'],values:[]},true).ok).toBe(true));
});
it('prediction history migrates, assistance stays guided and fresh attempts preserve lesson mastery',()=>{
 useLearning.getState().resetProgress();let s=useLearning.getState();s.revealQuestion('qb-0072');s.setDraft('sql-qb-qb-0072','[[1,20]]');s.recordQuestionCheck('qb-0072',true,{input:'[[1,20]]',version:1,epoch:0,message:'test'});
 s=useLearning.getState();expect(s.questions['qb-0072'].solved).toBe(false);expect(s.questions['qb-0072'].guidedSolved).toBe(true);
 const restored=migrateLearning(s);expect(restored.questions['qb-0072'].lastCheck?.input).toBe('[[1,20]]');expect(restored.drafts['sql-qb-qb-0072']).toBe('[[1,20]]');
 s.freshQuestionAttempt('qb-0072','sql-qb-qb-0072','');s=useLearning.getState();expect(s.questions['qb-0072'].epoch).toBe(1);expect(s.questions['qb-0072'].lastCheck).toBeUndefined();
 s.recordQuestionCheck('qb-0072',true);expect(useLearning.getState().questions['qb-0072'].solved).toBe(true);expect(useLearning.getState().stats).toEqual({});
});
it('source inventory is private and all 29 original hashes still match',()=>{
 const root='reference/sql-documents-v4';const rows=fs.readFileSync(root+'/SOURCE_MANIFEST.csv','utf8').trim().split(/\r?\n/).slice(1);
 expect(rows).toHaveLength(29);const hashes=[];
 for(const row of rows){const [file,,size,sha]=row.split(',');const bytes=fs.readFileSync(`${root}/source-documents/${file}`);expect(bytes.length).toBe(Number(size));expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(sha);hashes.push(sha);}
 expect(new Set(hashes).size).toBe(28);
 // Only exception: the pinned Pyodide stdlib archive, verified byte-for-byte against the official release.
 const pyodideStdlib=(f:string)=>f.replace(/\\/g,'/')==='vendor/pyodide/314.0.7/python_stdlib.zip'&&crypto.createHash('sha256').update(fs.readFileSync('public/'+f)).digest('hex')==='fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a';
 const files=fs.readdirSync('public',{recursive:true}).map(String);expect(files.filter(f=>/\.(pdf|docx|zip)$/i.test(f)&&!pyodideStdlib(f))).toEqual([]);
},20000);

it('merges two tabs without clobbering unrelated drafts or earned achievements',()=>{
 const base={drafts:{a:'old'},questions:{x:{solved:false,guidedSolved:false,epoch:0,hints:0,revealed:false}}};
 const local={drafts:{a:'new'},questions:{x:{...base.questions.x,solved:true}}};
 const remote={drafts:{a:'old',b:'other tab'},questions:{x:{...base.questions.x,hints:1},y:{solved:true}}};
 const merged=mergeStorageWrite(base,local,remote) as typeof remote;
 expect(merged.drafts).toEqual({a:'new',b:'other tab'});expect(merged.questions.x.solved).toBe(true);expect(merged.questions.x.hints).toBe(1);expect(merged.questions.y.solved).toBe(true);
});
it('new attempt epochs dominate stale guidance from an earlier attempt',()=>{
 const base={solved:false,guidedSolved:true,epoch:0,hints:1,revealed:true};
 expect(mergeStorageWrite(base,{...base,hints:2},{...base,epoch:1,hints:0,revealed:false})).toMatchObject({epoch:1,hints:0,revealed:false});
});
it('checks SQLite source-risk counterexamples on the shipped engine',async()=>{
 const cases=[
 ["SELECT sqlite_version() AS version",[['3.49.1']]],
 ["WITH a(x) AS (VALUES(1)), b(x) AS (VALUES(2)) SELECT a.x,b.x FROM a FULL OUTER JOIN b ON a.x=b.x ORDER BY a.x",[[null,2],[1,null]]],
 ["SELECT 3 NOT IN (1,NULL) AS value",[[null]]],
 ["WITH n(x) AS (VALUES(1),(4)) SELECT x+1 FROM n WHERE x+1 NOT IN (SELECT x FROM n) AND x<(SELECT MAX(x) FROM n)",[[2]]],
 ];
 for(const [query,rows] of cases){const r=await send({seed:'',query});expect(r.error).toBeUndefined();expect(r.result.values).toEqual(rows);}
});
it('changed capacity projection independently excludes expired units and includes cutoff deliveries',async()=>{
 const q=bankById.get('qb-0088')!, request=bankCheckRequest(q,q.solution);
 const r=await send({...request,seed:request.seed+request.mutation,mutation:null});
 expect(r.error).toBeUndefined();expect(r.result.values).toEqual([[1,102],[2,12],[3,24]]);
});
it('source register and coverage decisions address every filename',()=>{
 const register=fs.readFileSync('docs/v4/SOURCE_REGISTER.md','utf8');
 const manifest=JSON.parse(fs.readFileSync('reference/sql-documents-v4/extraction-report.json','utf8'));
 for(const r of manifest)expect(register).toContain(r.file_name);
 for(const file of ['SOURCE_TO_CURRICULUM_MAP','SOURCE_QUALITY_AUDIT','V4_IMPLEMENTATION_DECISIONS'])expect(fs.readFileSync(`docs/v4/${file}.md`,'utf8').length).toBeGreaterThan(500);
});

it('generated full input previews exactly match visible SQLite fixtures',async()=>{
 const {computeInputPreviews}=await import('../scripts/lib/qb-data');
 expect(JSON.parse(fs.readFileSync('src/content/question-bank/input-previews.json','utf8'))).toEqual(await computeInputPreviews());
});
