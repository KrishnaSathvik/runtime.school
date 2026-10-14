"use client";

import { useState, useRef, type ReactNode } from 'react';
import { Eye, Lightbulb, RotateCcw, Check } from 'lucide-react';
import type { PyGraded } from '@/content/python/types';
import type { PyQuestion } from '@/content/python/practice';
import { gradePrediction } from '@/engine/python/predict';
import { usePyProgress } from '@/lib/python-progress';
import { Spec } from '@/features/rt/Spec';
import { CodePane, type CodePaneHandle } from './CodePane';
import { filePreview } from './file-preview';
import { Rich } from './Rich';

/** Source fixtures use the same card treatment as SQL's data tables. */
export function FileData({ files, full = false }: { files: Record<string,string>; full?: boolean }) {
  return <div className={`py-file-data${full ? " py-file-data-full" : ""}`}>{Object.entries(files).map(([name,text]) => {
    const preview = filePreview(name,text);
    return <details key={name} className="rx-schema-table" open><summary className="mono">{name}{preview && <span>{preview.columns.length} columns · {preview.rows.length} rows</span>}</summary>
      {preview ? <><div className="rx-table-wrap" tabIndex={0} role="region" aria-label={`${name} preview`}><table className="rx-table rx-data"><thead><tr>{preview.columns.map((c,i)=><th key={i}>{c}</th>)}</tr></thead><tbody>{(full ? preview.rows : preview.rows.slice(0,5)).map((row,i)=><tr key={i}>{preview.columns.map((_,c)=><td key={c}>{row[c] == null ? <span className="rx-dim">—</span> : typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}</td>)}</tr>)}</tbody></table></div><p className="rx-table-foot">{!full && preview.rows.length>5?`showing 5 of ${preview.rows.length} rows`:`all ${preview.rows.length} rows`}</p></> : <pre tabIndex={0} aria-label={name}>{text}</pre>}
    </details>;
  })}</div>;
}

export function Exercise({ itemRef, id, title, question, starterOverride, next, inheritedHelp = false, onPassed, context, project = false, guidance }: {
  itemRef: string; id: string; title: string; question: PyQuestion | PyGraded;
  starterOverride?: string; next?: ReactNode; inheritedHelp?: boolean; onPassed?: () => void; context?: string; project?: boolean;
  guidance?: { overview: string; approach: string; data: string; example: string; output: string; reflection: string };
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
  const [tab, setTab] = useState('program');
  const actions = usePyProgress.getState();
  const setCode = (v: string) => actions.setDraft(itemRef, id, v);
  const mark = (ok: boolean) => {
    if (inheritedHelp && !usePyProgress.getState().items[itemRef]?.attempts[id]?.guided) actions.takeHelp(itemRef, id, 'answer');
    actions.recordCheck(itemRef, id, ok, [id]);
    if (ok) { if (project) setTab("finding"); onPassed?.(); }
  };
  const files = { ...('files' in question ? question.files : {}), ...graded?.task.files };
  const answer = predict?.output ?? graded?.answer ?? '';
  const footer = <>
    {(help?.hints ?? 0) < question.hints.length && <button className="rx-btn ghost" onClick={() => actions.takeHelp(itemRef, id, 'hint')}><Lightbulb size={13} />Hint</button>}
    {!help?.revealed && <button className="rx-btn ghost" onClick={() => actions.takeHelp(itemRef, id, 'answer')}><Eye size={13} />Answer</button>}
    {help?.guided && <button className="rx-btn ghost" onClick={() => { actions.freshAttempt(itemRef, id); pane.current?.setCode(starter); setCode(starter); setPredictionResult(null); }}><RotateCcw size={13} />Try without help</button>}
  </>;
  return <div className="rx-task rx-lesson"><div className="rx-task-split">
    <article className="rx-brief" aria-labelledby="study-title">
      <p className="rx-prompt-line"><b>{project ? 'milestone' : 'task'}</b> {context ?? ('module' in question ? `${question.module} · ${question.difficulty}` : '')}</p>
      <h1 id="study-title" className="rx-task-title">{title}</h1>
      {guidance && <><p className="rx-small">{guidance.overview}</p><h2 className="rx-h"><b>approach</b></h2><p className="rx-prose">{guidance.approach}</p><h2 className="rx-h"><b>worked example</b></h2><p className="rx-cap">A small example of the technique, using separate data.</p><div className="rx-cell"><div className="rx-cell-head"><span className="name">worked-example.py</span></div><div className="rx-cell-in"><pre>{guidance.example}</pre></div><div className="rx-out"><div className="rx-out-meta">Expected output</div><pre className="py-stream" style={{padding:14}}>{guidance.output}</pre></div></div></>}
      {!project && <p className="rx-lead rx-ask"><Rich text={question.prompt} /></p>}
      {!project && graded && <><p className="rx-label">what to return</p><Spec rows={graded.looksFor.map((t,i) => [i === 0 ? 'Result' : 'Watch for', <Rich key={t} text={t} />])} />{graded.expectedOutput && <><p className="rx-label sec">expected output</p><div className="rx-expected"><pre className="py-static-code">{graded.expectedOutput}</pre></div></>}</>}
      {predict && <><p className="rx-label sec">read the program</p><div className="rx-cell"><div className="rx-cell-head"><span className="name">example.py</span></div><div className="rx-cell-in"><pre>{predict.code}</pre></div></div></>}
      {Object.keys(files).length > 0 && <><p className="rx-label sec">data for this {project ? 'milestone' : 'question'}</p>{guidance && <p className="rx-cap">{guidance.data}</p>}<FileData files={files} full={project} /></>}
    </article>
    <section className="rx-work rx-lesson-work py-task-work" aria-label="Your solution">
      {project && <div className="rx-tabs" role="tablist" aria-label="Milestone steps"><button role="tab" id="program-tab" aria-controls="program-panel" aria-selected={tab === 'program'} onClick={() => setTab('program')}>Program{result?.passes ? ' ✓' : ''}</button><button role="tab" id="finding-tab" aria-controls="finding-panel" aria-selected={tab === 'finding'} onClick={() => setTab('finding')}>Finding{rec?.drafts[`finding:${id}`]?.trim() ? ' ✓' : ''}</button></div>}
      <div className="py-task-panel" id={tab === 'program' ? 'program-panel' : 'finding-panel'} role={project ? 'tabpanel' : undefined} aria-labelledby={project ? `${tab}-tab` : undefined}>
      {tab === 'finding' ? <><section className="rx-question"><p className="rx-question-text">What did you find?</p><p className="rx-cap">{guidance?.reflection ?? 'Explain the result, the assumptions you made, and one input you checked.'}</p></section><label className="sr-only" htmlFor="finding">Your finding</label><textarea id="finding" className="py-finding" rows={8} value={rec?.drafts[`finding:${id}`] ?? ''} onChange={e => actions.setDraft(itemRef, `finding:${id}`, e.target.value)} /><p className="rx-small">Saved in this browser. Included in your project report.</p></> : <>
      {project && graded && <section className="rx-question"><p className="rx-question-text"><Rich text={question.prompt} /></p><p className="rx-label">what to return</p><Spec rows={graded.looksFor.map((t,i) => [i === 0 ? 'Result' : 'Watch for', <Rich key={t} text={t} />])} /><p className="rx-cap">{id === 'stage-1' ? 'Start with the supplied input data. Check verifies this milestone’s requirements.' : 'Build on your previous program. Check runs this milestone’s requirements and the earlier milestones’ checks.'}</p></section>}
      {predict ? <div className="rx-cell"><div className="rx-cell-head"><span className="name">your prediction</span></div><label className="sr-only" htmlFor="prediction">What does it print?</label><textarea className="py-prediction-input" id="prediction" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={12} /><div className="rx-cell-foot"><span className="hint" />{footer}<button className="rx-btn primary" onClick={() => { const r = gradePrediction(predict.output, code); setPredictionResult({ok:r.ok,code}); mark(r.ok); }}><Check size={14} />Check</button></div>{predictionResult && <p role="status" className={`rx-feedback ${predictionResult.ok ? 'ok' : 'bad'}`}>{predictionResult.ok ? '✓ Correct prediction.' : 'Not quite. Check each line, including spaces and punctuation.'}{predictionResult.code !== code ? ' Edited since this check.' : ''}</p>}</div> : <CodePane layout="cell" ref={pane} task={{ ...graded!.task, files, packages: graded!.task.packages ?? ('packages' in question ? question.packages : undefined) }} starter={starter} value={code} onChange={setCode} footer={footer} onGraded={r => {
        if (['unavailable','stopped','crashed','superseded'].includes(r.outcome)) return;
        mark(r.ok);
        if (project) actions.setDraft(itemRef, `checked:${id}`, JSON.stringify({source:code,ok:r.ok,passed:r.passed,total:r.total,assisted:!!help?.guided || inheritedHelp}));
      }} />}
      {(help?.hints ?? 0) > 0 && <ul className="rx-hints">{question.hints.slice(0, help?.hints).map(h => <li key={h}><span className="mono">hint ›</span><Rich text={h} /></li>)}</ul>}
      {help?.revealed && <div className="rx-cell"><div className="rx-cell-head"><span className="name">one correct answer</span>{!predict && <span className="acts"><button className="rx-btn ghost" onClick={() => pane.current?.setCode(answer)}>Put in editor</button></span>}</div><div className="rx-cell-in"><span className="p">py›</span><pre>{answer}</pre></div></div>}
      {predict && predictionResult?.ok && <div className="rx-why"><p className="rx-label">why it works</p><p>{predict.explanation}</p></div>}
      {!help?.guided && <p className="rx-small">Hints and the answer are always available. Using them counts the {project ? 'milestone' : 'question'} as solved with help.</p>}
      </>}
      {result && (result.solved || result.assisted) && next && <div className="rx-feedback ok">{next}</div>}
      </div>
    </section>
  </div></div>;
}
