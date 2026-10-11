"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { bankSeed, type BankQuestion } from '@/content/question-bank';
import { executeSql, type ExecuteResponse } from '@/engine/sql-client';
import { gradePrediction, parsePrediction } from '@/engine/prediction';
import { useLearning } from '@/lib/learning-state';
import { MobileTaskBar } from "@/features/lesson/MobileTaskBar";
import { ResultsTable } from '@/components/editor/ResultsTable';
import { ExplanationView } from '@/components/editor/Explanation';
import { explainError } from '@/engine/explain';

export function PredictionWorkspace({q,nextAction}:{q:BankQuestion;nextAction:React.ReactNode}) {
  const state=useLearning();
  const key=`sql-qb-${q.id}`;
  const value=state.drafts[key]??'';
  const progress=state.questions[q.id];
  const epoch=progress?.epoch??0;
  const saved=progress?.lastCheck;
  const feedback=saved?.version===q.version && saved.input===value && saved.epoch===epoch ? saved : null;
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [sqlError,setSqlError]=useState('');
  const [actual,setActual]=useState<ExecuteResponse|null>(null);
  const token=useRef(0);
  const invalidate=useCallback(()=>{token.current++;},[]);
  useEffect(()=>{invalidate();setActual(null);setError('');setSqlError('');setBusy(false);return invalidate;},[q.id,epoch,invalidate]);
  const run=async(reveal:boolean)=>{
    setSqlError('');
    let rows;
    if(!reveal) {
      try {rows=parsePrediction(value,q.columns.length);}catch(e){setError((e as Error).message);return;}
    }
    const request=++token.current;
    setError('');setBusy(true);
    // Record exposure before execution, even if the worker fails or navigation interrupts it.
    if(reveal) useLearning.getState().revealQuestion(q.id);
    const result=await executeSql({seed:bankSeed(q),query:q.solution});
    if(request!==token.current) return;
    setBusy(false);
    if(result.superseded){setError('Another query interrupted this check. Try again.');return;}
    if(result.error){setSqlError(result.error);return;}
    if(!result.result){setError('The result could not be checked. Try again.');return;}
    if(reveal){setActual(result);return;}
    // Never associate an in-flight result with a newer draft or a fresh attempt.
    const current=useLearning.getState();
    if((current.drafts[key]??'')!==value || (current.questions[q.id]?.epoch??0)!==epoch) return;
    const grade=gradePrediction(rows!,q.columns,result.result,q.ordered);
    current.recordQuestionCheck(q.id,grade.ok,{input:value,version:q.version,epoch,message:grade.message});
  };
  return <section className="min-w-0 p-4 sm:p-6" aria-label="Predict the result">
    <MobileTaskBar watchId="challenge-prompt" label="Your task" prompt={q.task} tables={q.tables}/>
    <div className="eyebrow">Read the query · predict its result</div>
    <pre className="sql-mono mt-3 overflow-x-auto border-y border-[var(--border)] py-4 text-sm" tabIndex={0} aria-label="Fixed SQL query">{q.solution}</pre>
    <p id="prediction-help" className="mt-4 text-sm">Look at the sample tables and SQL. Enter the rows you think the query returns, in this column order: <strong>{q.columns.join(', ')}</strong>. Put each row in square brackets, then wrap all rows in another pair of brackets (JSON format). For example, <code>{JSON.stringify([q.columns.map((_,i)=>i===0?1:null)])}</code> is one row with {q.columns.length} value{q.columns.length===1?'':'s'}. Replace these with your predicted values. Use numbers without quotes, text in double quotes, and <code>null</code> for SQL NULL. Keep repeated rows. Use <code>[]</code> for no rows. {q.ordered?'Keep rows in the order specified by ORDER BY.':'Rows can be in any order.'}</p>
    <label className="mt-4 block text-sm font-medium" htmlFor="prediction-rows">Your predicted rows</label>
    <textarea id="prediction-rows" aria-describedby="prediction-help" className="sql-mono mt-2 min-h-48 w-full resize-y rounded-sm border border-[var(--border)] bg-[var(--main)] p-3 text-sm text-[var(--text)]" value={value} placeholder={JSON.stringify([q.columns.map(()=>null)],null,2)} spellCheck={false} onChange={e=>{state.setDraft(key,e.target.value);setError('');setSqlError('');}} />
    <div className="mt-3 flex flex-wrap gap-2">
      <button className="btn primary" disabled={busy || !value.trim()} onClick={()=>void run(false)}>Check prediction</button>
      <button className="btn" disabled={busy} onClick={()=>void run(true)}>Show the result (with help)</button>
    </div>
    <p className="metadata mt-2">Showing the result or using a hint means a correct prediction counts as solved with help. Check prediction tests your answer without showing the result.</p>
    <div aria-live="polite" aria-busy={busy} className="mt-5">
      {busy && <p className="metadata">Checking with SQLite…</p>}
      {error && <p className="feedback-err">{error}</p>}
      {sqlError && <ExplanationView explanation={explainError(sqlError,q.solution,q.tables)} />}
      {feedback && <div className={feedback.ok?'feedback-ok':'explanation'}><p>{feedback.message}</p>{feedback.ok && <><p className="mt-2">{feedback.guided?'Solved with help.':'Solved without hints.'} {q.explanation}</p><div className="mt-4 flex flex-wrap gap-2">{nextAction}</div></>}</div>}
      {actual?.result && <div className="mt-4"><h2 className="mb-3">Actual result · shown with help</h2><ResultsTable result={actual.result} total={actual.total}/><p className="mt-3 text-sm">{q.explanation}</p></div>}
    </div>
  </section>;
}
