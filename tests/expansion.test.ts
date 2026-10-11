import { beforeAll, describe, expect, it } from 'vitest';
import { allQuestions, bankById, bankCheckRequest, bankRunRequest, bankQuestions } from '@/content/question-bank';
import { optimizationQuestions } from '@/content/question-bank/expansion';
import { funnelQuestions } from '@/content/question-bank/funnel-questions';
import { engineeringQuestions } from '@/content/question-bank/engineering-questions';
import { relationshipQuestions } from '@/content/question-bank/relationship-questions';
import { textQuestions } from '@/content/question-bank/text-questions';
import { caseStudyQuestions } from '@/content/question-bank/case-study-questions';
import { tracks } from '@/content/question-bank/tracks';
import { bootWorker, type WorkerResponse } from './helpers/original';
let send: (request: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => { send = await bootWorker(); });
const q = (id: number) => bankById.get(`qb-${String(id).padStart(4,'0')}`)!;
async function answer(id: number) {
 const problem=q(id); const r=await send(bankCheckRequest(problem,problem.solution));
 expect(r.error).toBeUndefined(); expect(r.grade?.ok,r.grade?.message).toBe(true); return r;
}

describe('Phase B inventory and fixtures',()=>{
 it('adds exactly six focused batches while preserving the six track compositions',()=>{
  expect([optimizationQuestions,funnelQuestions,engineeringQuestions,relationshipQuestions,textQuestions,caseStudyQuestions].map(b=>b.length)).toEqual([4,5,3,3,3,5]);
  expect(allQuestions().filter(q=>!q.id.startsWith("qb-") || Number(q.id.slice(3))<=71)).toHaveLength(247);
  expect(allQuestions().filter(q=>q.practiceEligible && (!q.id.startsWith("qb-") || Number(q.id.slice(3))<=71))).toHaveLength(232);
  expect(bankQuestions.filter(q=>Number(q.id.slice(3))<=71)).toHaveLength(71);
  expect(tracks).toHaveLength(6);
  expect(tracks.flatMap(t=>t.questionIds).every(id=>!/^qb-00(4[9]|[5-7][0-9])$/.test(id))).toBe(true);
 });
 it('declares special plan restrictions only where the task expressly teaches them',()=>{
  expect(optimizationQuestions.every(q=>!q.planValidation?.noFullScans)).toBe(true);
  expect(optimizationQuestions.filter(q=>q.planValidation?.noTempSort).map(q=>q.id)).toEqual(['qb-0052']);
  expect(q(52).task).toMatch(/no temporary sorting/);
 });
 it.each(bankQuestions.slice(48).flatMap(problem=>problem.wrong.map(w=>[problem.id,w.mistake,problem,w.sql] as const)))('%s wrong approach executes valid SQL: %s',async (_id,_why,problem,sql)=>{
  const r=await send(bankCheckRequest(problem,sql)); expect(r.error).toBeUndefined(); expect(r.grade?.ok).toBe(false);
 });
 it('Run and Check use the same per-question fixture without leaking it into unrelated questions',async()=>{
  for (const id of [49,62]) {
   expect(bankRunRequest(q(id),'SELECT 1').seed).toBe(bankCheckRequest(q(id),'SELECT 1').seed);
  }
  const rows=await send(bankRunRequest(q(49),'SELECT COUNT(*) AS n FROM market_query_log'));
  expect(rows.result.values).toEqual([[12005]]);
  const empty=await send(bankRunRequest(q(53),'SELECT COUNT(*) AS n FROM market_query_log'));
  expect(empty.result.values).toEqual([[0]]);
 });
});

describe('independent semantic anchors, beyond comparing a solution with itself',()=>{
 it('ordered carts respect equal timestamps, wrong-order events, wrong carts and the inclusive boundary',async()=>{
  expect((await answer(53)).result.values).toEqual([[1,'A'],[2,'C'],[4,'E'],[8,'I'],[9,'J']]);
 });
 it('retry payload comes from the earliest ingestion row',async()=>{
  expect((await answer(55)).result.values).toEqual([['a3',3,'purchase',1],['i3',28,'purchase',1]]);
 });
 it('exactly thirty minutes stays in a session; thirty minutes plus one second starts another',async()=>{
  const rows=(await answer(56)).result.values;
  expect(rows.filter((r:number[])=>r[0]===1)).toEqual([[1,1,1],[1,2,1],[1,3,1],[1,5,2],[1,6,2],[1,7,2],[1,8,3],[1,30,4]]);
  expect(rows.filter((r:number[])=>r[0]===4)).toEqual([[4,15,1],[4,16,1],[4,17,1]]);
 });
 it('version conflicts and stale target updates have explicit expected final state',async()=>{
  expect((await answer(58)).result.values).toEqual([['X',2,25],['Y',1,5],['Z',9,90]]);
 });
 it('validates before deduplication and rejects fractional and text quantities',async()=>{
  expect((await answer(59)).result.values).toEqual([[1,1,4],[2,4,1],[7,4,5]]);
 });
 it('recovery leaves only accepted reservations in stock',async()=>{
  expect((await answer(60)).result.values).toEqual([[1,4,1],[2,1,1],[3,9,0]]);
 });
 it('relational division has a real qualifying shopper and excludes cancelled category membership',async()=>{
  expect((await answer(62)).result.values).toEqual([[1,'Ana Ruiz']]);
 });
 it('money parsing uses exact cents and marks malformed input invalid',async()=>{
  const rows=(await answer(66)).result.values;
  expect(rows.slice(0,8)).toEqual([[1,1999,'valid'],[2,29,'valid'],[3,-1250,'valid'],[4,1200,'valid'],[5,null,'invalid'],[6,null,'invalid'],[7,null,'invalid'],[8,null,'invalid']]);
  expect(rows.slice(13)).toEqual([[14,99999999,'valid'],[15,null,'invalid'],[16,-1,'valid'],[17,1230,'valid'],[18,0,'valid'],[19,0,'valid']]);
 });
 it('the case study works from a fresh database in reverse stage order',async()=>{
  for (const problem of [...caseStudyQuestions].reverse()) {
   expect(problem.rules.join(' ')).toMatch(/fresh database/);
   const r=await send(bankCheckRequest(problem,problem.solution));
   expect(r.grade?.ok,r.error??r.grade?.message).toBe(true);
  }
  expect((await answer(70)).result.values).toEqual([[1,2,4,1375],[5,1,2,45]]);
 });
});

describe('stateful grading and educational feedback',()=>{
 it('a one-shot load passes its first execution but is rejected on replay',async()=>{
  const problem=q(58), sql='CREATE TABLE load_once(x);'+problem.solution;
  const first=await send({...bankCheckRequest(problem,sql),repeatCheck:false});
  expect(first.grade.ok).toBe(true);
  const repeat=await send(bankCheckRequest(problem,sql));
  expect(repeat.grade.ok).toBe(false);
  expect(repeat.grade.message).toMatch(/repeating the load/);
 });
 it('detects hidden state corruption on replay even when both displayed outputs match',async()=>{
  const r=await send({seed:'CREATE TABLE counter(n); INSERT INTO counter VALUES(0);',query:'UPDATE counter SET n=n+1; SELECT 1 AS visible;',answer:'UPDATE counter SET n=1; SELECT 1 AS visible;',allowWrites:true,repeatCheck:true,stateQueries:['SELECT * FROM counter']});
  expect(r.grade.ok).toBe(false); expect(r.grade.message).toMatch(/Repeated execution/);
 });
 it('valid-write probes reject an overly restrictive schema and roll probes back',async()=>{
  const problem=q(59), sql=problem.solution.replace("quantity BETWEEN 1 AND 5)","quantity BETWEEN 1 AND 5 AND quantity<>3)");
  const r=await send(bankCheckRequest(problem,sql));
  expect(r.grade.ok).toBe(false); expect(r.grade.message).toMatch(/valid write was rejected/);
  expect((await answer(59)).result.values).toHaveLength(3);
 });
 it('distinguishes correct output and index structure from a failed access strategy',async()=>{
  const problem=q(49);
  const r=await send(bankCheckRequest(problem,problem.solution.replace('FROM market_query_log','FROM market_query_log NOT INDEXED')));
  expect(r.grade.checks.map((c:{ok:boolean})=>c.ok)).toEqual([true,true,false]);
  expect(r.grade.checks.map((c:{label:string})=>c.label)).toEqual(['Query output','Required index: purchase lookup','Access strategy: search']);
 });
 it('does not claim an index or plan passed when output is wrong',async()=>{
  const problem=q(49),r=await send(bankCheckRequest(problem,'SELECT 1 AS wrong'));
  expect(r.grade.checks).toHaveLength(1); expect(r.grade.checks[0].ok).toBe(false);
 });
 it('reports both original and changed-fixture checks after success',async()=>{
  const r=await answer(49);
  expect(r.grade.checks).toHaveLength(6);
  expect(r.grade.checks.every((c:{ok:boolean})=>c.ok)).toBe(true);
  expect(new Set(r.grade.checks.map((c:{fixture:string})=>c.fixture))).toEqual(new Set(['original','changed']));
 });
});
