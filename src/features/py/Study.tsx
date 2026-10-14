"use client";

import { useState, useRef, type ReactNode } from 'react';
import type { PyGraded } from '@/content/python/types';
import type { PyQuestion } from '@/content/python/practice';
import type { PyGradeReport } from '@/engine/python/grading';
import { gradePrediction } from '@/engine/python/predict';
import { usePyProgress } from '@/lib/python-progress';
import { CodePane, type CodePaneHandle } from './CodePane';
import { Rich } from './Rich';
import { Download } from './Downloads';

export function Exercise({ itemRef, id, title, question, starterOverride, next, inheritedHelp = false }: {
  itemRef: string; id: string; title: string; question: PyQuestion | PyGraded;
  starterOverride?: string; next?: ReactNode; inheritedHelp?: boolean;
}) {
  const pane = useRef<CodePaneHandle>(null);
  const rec = usePyProgress(s => s.items[itemRef]);
  const predict = 'kind' in question && question.kind === 'predict' ? question : null;
  const graded = predict ? null : question as PyGraded;
  const starter = starterOverride ?? graded?.starter ?? '';
  const code = rec?.drafts[id] ?? starter;
  const help = rec?.attempts[id];
  const result = rec?.challenges[id];
  const [predictionResult, setPredictionResult] = useState<{ ok: boolean; code: string } | null>(null);
  const [verified, setVerified] = useState<{ code: string; report: PyGradeReport } | null>(null);
  const [generation, setGeneration] = useState(0);
  const actions = usePyProgress.getState();
  const setCode = (v: string) => actions.setDraft(itemRef, id, v);
  const mark = (ok: boolean) => {
    if (inheritedHelp && !usePyProgress.getState().items[itemRef]?.attempts[id]?.guided) actions.takeHelp(itemRef, id, 'answer');
    actions.recordCheck(itemRef, id, ok, [id]);
  };
  const files = { ...('files' in question ? question.files : {}), ...graded?.task.files };
  const answer = predict?.output ?? graded?.answer ?? '';
  return <div className="py-study">
    <section className="py-brief" aria-labelledby="study-title">
      <h1 id="study-title">{title}</h1>
      <p><Rich text={question.prompt} /></p>
      {graded && <><h2>What to build</h2><ul>{graded.looksFor.map(t => <li key={t}><Rich text={t} /></li>)}</ul>{graded.expectedOutput && <><h2>Expected output</h2><pre>{graded.expectedOutput}</pre></>}</>}
      {Object.keys(files).length > 0 && <details><summary>Input files ({Object.keys(files).length})</summary>{Object.entries(files).map(([name, text]) => <div key={name}><h3>{name}</h3><pre>{text}</pre><Download name={name} text={text} /></div>)}</details>}
      <p role="status">{result?.solved ? 'Solved independently' : result?.assisted ? 'Solved with help' : 'Not solved'}{help?.guided || inheritedHelp ? ' · This attempt uses help.' : ''}</p>
      <div className="py-links">
        <button className="rx-btn" disabled={(help?.hints ?? 0) >= question.hints.length} onClick={() => actions.takeHelp(itemRef, id, 'hint')}>Show hint</button>
        <button className="rx-btn" onClick={() => actions.takeHelp(itemRef, id, 'answer')}>Reveal answer</button>
        <button className="rx-btn" onClick={() => { actions.freshAttempt(itemRef, id); setCode(starter); setVerified(null); setPredictionResult(null); setGeneration(n => n + 1); }}>Start fresh attempt</button>
      </div>
      {question.hints.slice(0, help?.hints ?? 0).map((h, i) => <p key={i}><Rich text={h} /></p>)}
      {help?.revealed && <div><h2>Reference answer</h2><pre>{answer}</pre>{predict ? <p>{predict.explanation}</p> : <button className="rx-btn" onClick={() => pane.current?.setCode(answer)}>Put answer in editor</button>}</div>}
      {graded && <div className="py-links"><Download name="main.py" text={code} />{verified?.report.ok && verified.code === code && <Download name="verified-summary.json" text={JSON.stringify({ item: itemRef, stage:id, passed:verified.report.passed, total:verified.report.total, assisted:!!help?.guided || inheritedHelp, source:verified.code, scope:'Browser learning checks; not certification' },null,2)} label="Download verified summary" />}</div>}
      {result && (result.solved || result.assisted) && next && <p className="py-next">{next}</p>}
    </section>
    <section className="py-study-code" aria-label={predict ? 'Predict output' : 'Your program'}>
      {predict ? <div className="py-prediction">
        <h2>Read the program</h2><pre>{predict.code}</pre>
        <label htmlFor="prediction">What does it print?</label><textarea id="prediction" value={code} onChange={e => { setCode(e.target.value); }} spellCheck={false} rows={8} />
        <button className="rx-btn primary" onClick={() => { const r = gradePrediction(predict.output, code); setPredictionResult({ok:r.ok,code}); mark(r.ok); }}>Check prediction</button>
        {predictionResult && <div role="status"><p>{predictionResult.ok ? 'Correct prediction.' : 'Not quite. Check each line, including spaces and punctuation.'}{predictionResult.code !== code ? ' Edited since this check.' : ''}</p>{predictionResult.ok && <p>{predict.explanation}</p>}</div>}
      </div> : <CodePane ref={pane} key={`${id}-${generation}`} task={{ ...graded!.task, files, packages: graded!.task.packages ?? ('packages' in question ? question.packages : undefined) }} starter={starter} value={code} onChange={setCode} onGraded={r => { if (r.outcome === 'unavailable' || r.outcome === 'stopped' || r.outcome === 'crashed') return; mark(r.ok); setVerified({code,report:r}); }} />}
    </section>
  </div>;
}
