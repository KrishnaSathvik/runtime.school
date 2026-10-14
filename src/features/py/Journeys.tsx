"use client";
import Link from 'next/link';
import { useState } from 'react';
import { pythonJourneys, pythonProjects, journeyHref } from '@/content/python/journeys';
import { usePyProgress, usePyProgressReady } from '@/lib/python-progress';
import { Shell } from '@/features/rt/Shell';
import { Exercise } from './Study';
import { Download } from './Downloads';

export function ProjectIndex() {
  const ready = usePyProgressReady();
  const items = usePyProgress(s => s.items);
  return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects'}]}><div className="rx-page py-catalog">
    <h1 className="rx-title">Python projects</h1><p className="rx-lead">Build a program across milestones. Keep your code, investigate real outputs, and download the evidence.</p>
    <ol className="py-catalog-list">{pythonProjects.map(j => <li key={j.ref}><h2><Link href={journeyHref(j)}>{j.title}</Link></h2><p>{j.overview}</p><p>{ready ? `${j.stages.filter(s => items[j.ref]?.challenges[s.id]?.solved).length} of ${j.stages.length} milestones solved independently` : 'Loading saved progress…'}</p></li>)}</ol>
  </div></Shell>;
}

export function Journey({ slug }: { slug: string }) {
  const j = pythonJourneys.find(j => j.slug === slug)!;
  const ready = usePyProgressReady();
  const rec = usePyProgress(s => s.items[j.ref]);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedId = selected ?? rec?.tab;
  const index = j.stages.findIndex(s => s.id === selectedId);
  const stage = index >= 0 ? j.stages[index] : null;
  const previous = index > 0 ? j.stages[index - 1] : null;
  const available = (n: number) => n === 0 || j.stages.slice(0,n).every(s => !!rec?.challenges[s.id]?.passes);
  const open = (n: number) => {
    if (!available(n)) return;
    const s = j.stages[n];
    const actions = usePyProgress.getState();
    if (rec?.drafts[s.id] === undefined) actions.setDraft(j.ref, s.id, n > 0 ? rec?.drafts[j.stages[n-1].id] ?? '' : s.starter);
    actions.setTab(j.ref, s.id); setSelected(s.id);
  };
  const inheritedHelp = j.stages.slice(0,index).some(s => !!rec?.attempts[s.id]?.guided);
  return <Shell subject="python" section={j.kind === 'case' ? 'practice' : 'projects'} path={[{label:'python',href:'/python'},{label:j.kind === 'case' ? 'practice' : 'projects',href:j.kind === 'case' ? '/python/practice' : '/python/projects'},{label:j.title}]}>
    <section className="rx-page py-journey-intro">
      <h1 className="rx-title">{j.title}</h1><p className="rx-lead">{j.overview}</p>
      <p>{j.packages.length ? 'Uses pandas in your browser.' : 'Uses the Python standard library.'} Run code to inspect outputs and download generated files. Check answer records progress. Earlier milestone checks remain active.</p>
      <details><summary>Explore the source data</summary>{Object.entries(j.files).map(([name,text]) => <div key={name}><h2>{name}</h2><pre>{text}</pre><Download name={name} text={text} /></div>)}</details>
      <ol className="py-stage-list" aria-label="Milestones">{j.stages.map((s,n) => <li key={s.id}><button className="rx-btn" disabled={!ready || !available(n)} aria-current={stage?.id === s.id ? 'step' : undefined} onClick={() => open(n)}>{n+1}. {s.title}</button><span>{rec?.challenges[s.id]?.solved ? 'Independent' : rec?.challenges[s.id]?.assisted ? 'With help' : !available(n) ? 'Complete earlier stages first' : 'Ready'}</span></li>)}</ol>
    </section>
    {!ready ? <p role="status">Loading saved progress…</p> : stage && available(index) ? <Exercise key={stage.ref} itemRef={j.ref} id={stage.id} title={stage.title} question={stage} starterOverride={previous ? rec?.drafts[previous.id] ?? '' : stage.starter} inheritedHelp={inheritedHelp} next={index < j.stages.length - 1 ? <button className="rx-btn primary" onClick={() => open(index+1)}>Continue to milestone {index+2}</button> : <span>All stages passed. Run your final program to download its outputs, and download your source and verified summary.</span>} /> : <p className="rx-page">Read the overview, inspect the source data, then open the first stage.</p>}
  </Shell>;
}
