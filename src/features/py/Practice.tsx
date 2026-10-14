"use client";

import Link from 'next/link';
import { useState } from 'react';
import { pythonQuestions, pythonTracks, getPythonQuestion, getPythonQuestionByRef, getPythonTrack, pythonQuestionHref, pythonTrackHref, type PyQuestion } from '@/content/python/practice';
import { pythonCases, journeyHref } from '@/content/python/journeys';
import { pythonModules } from '@/content/python';
import { usePyProgress, usePyProgressReady } from '@/lib/python-progress';
import { Shell } from '@/features/rt/Shell';
import { Exercise } from './Study';

export function PracticeIndex({ trackSlug, initialModule = '' }: { trackSlug?: string; initialModule?: string }) {
  const ready = usePyProgressReady();
  const items = usePyProgress(s => s.items);
  const [query, setQuery] = useState('');
  const [module, setModule] = useState(initialModule);
  const track = trackSlug ? getPythonTrack(trackSlug) : undefined;
  const questions = track ? track.questions.map(getPythonQuestionByRef).filter((q): q is PyQuestion => !!q) : pythonQuestions;
  const shown = questions.filter(q => (!module || q.module === module) && `${q.title} ${q.topics.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <Shell subject="python" section="practice" path={[{ label:'python', href:'/python' },{ label:'practice', href:'/python/practice' },...(track ? [{label:track.title}] : [])]}>
    <div className="rx-page py-catalog">
      <h1 className="rx-title">{track?.title ?? 'Python practice'}</h1>
      <p className="rx-lead">{track?.summary ?? 'Write, debug, and predict. Choose a question or follow a track; each question keeps the same progress wherever you open it.'}</p>
      {!track && <>
        <h2>Learning tracks</h2><ul className="py-catalog-list">{pythonTracks.map(t => <li key={t.id}><Link href={pythonTrackHref(t.slug)}>{t.title}</Link><p>{t.goal} · {t.questions.length} questions</p></li>)}</ul>
        <h2>Case studies</h2><ul className="py-catalog-list">{pythonCases.map(j => <li key={j.ref}><Link href={journeyHref(j)}>{j.title}</Link><p>{j.stages.length} investigation stages · standard library</p></li>)}</ul>
      </>}
      <h2 id="questions">{track ? 'Your route through practice' : 'Question bank'}</h2>
      <div className="py-filters"><label>Search questions<input value={query} onChange={e => setQuery(e.target.value)} type="search" /></label><div className="py-filter-control"><label htmlFor="practice-module">Module</label><select id="practice-module" value={module} onChange={e => setModule(e.target.value)}><option value="">All modules</option>{pythonModules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div></div>
      <p role="status">{shown.length} questions{!ready ? ' · Loading saved progress…' : ''}</p>
      <ol className="py-catalog-list">{shown.map(q => {
        const rec = items[q.ref]?.challenges.answer;
        return <li key={q.ref}><Link href={pythonQuestionHref(q.slug)}>{q.title}</Link><p>{q.kind} · {q.difficulty} · {q.minutes} min · {ready && rec?.solved ? 'Solved independently' : ready && rec?.assisted ? 'Solved with help' : 'Not solved'}</p></li>;
      })}</ol>
      {shown.length === 0 && <p>No questions match. Try another search or module.</p>}
      <p><Link href="/python/playground">Experiment in the Python playground</Link></p>
    </div>
  </Shell>;
}

export function PracticeQuestion({ slug }: { slug: string }) {
  const ready = usePyProgressReady();
  const q = getPythonQuestion(slug)!;
  const index = pythonQuestions.indexOf(q);
  const next = pythonQuestions[index + 1];
  return <Shell subject="python" section="practice" path={[{label:'python',href:'/python'},{label:'practice',href:'/python/practice'},{label:q.slug}]}>
    {ready ? <Exercise key={q.ref} itemRef={q.ref} id="answer" title={q.title} question={q} next={next && <Link href={pythonQuestionHref(next.slug)}>Next question: {next.title}</Link>} /> : <p role="status" className="rx-page">Loading saved progress…</p>}
  </Shell>;
}
