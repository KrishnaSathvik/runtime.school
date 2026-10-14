"use client";
import Link from 'next/link';
import { useState } from 'react';
import { pythonJourneys, pythonProjects, journeyHref } from '@/content/python/journeys';
import { projectGuides, projectLevels, projectSkills } from '@/content/python/journeys/catalog';
import { usePyProgress, usePyProgressReady } from '@/lib/python-progress';
import { Shell } from '@/features/rt/Shell';
import { BrowserBar } from './BrowserBar';
import { Exercise } from './Study';
import { Download } from './Downloads';

export function ProjectIndex() {
  const ready = usePyProgressReady();
  const items = usePyProgress(s => s.items);
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [query, setQuery] = useState('');
  const shown = pythonProjects.filter(j => {
    const guide = projectGuides[j.slug];
    return (!level || guide.level === level) && (!skill || guide.skills.includes(skill)) &&
      `${j.title} ${j.overview} ${guide.skills.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase());
  });
  return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects'}]}><div className="rx-page py-catalog">
    <h1 className="rx-title">Python projects</h1><p className="rx-lead">Pick one useful program. Build it a milestone at a time, test your decisions, and keep the code and results.</p>
    <p>Every project here runs in your browser with supplied data. Difficulty describes the programming involved. Session estimates include time to try, debug, and check your work.</p>
    <div className="py-filters">
      <label>Search projects<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="py-filter-control"><label htmlFor="project-level">Difficulty</label><select id="project-level" value={level} onChange={e => setLevel(e.target.value)}><option value="">All difficulties</option>{projectLevels.map(l => <option key={l} value={l}>{l[0].toUpperCase()+l.slice(1)}</option>)}</select></div>
      <div className="py-filter-control"><label htmlFor="project-skill">Skill</label><select id="project-skill" value={skill} onChange={e => setSkill(e.target.value)}><option value="">All skills</option>{projectSkills.map(s => <option key={s}>{s}</option>)}</select></div>
      {(level || skill || query) && <button className="rx-btn" onClick={() => { setLevel(''); setSkill(''); setQuery(''); }}>Clear filters</button>}
    </div>
    <p role="status">{shown.length} {shown.length === 1 ? 'project' : 'projects'}</p>
    <ol className="py-catalog-list py-project-catalog">{shown.map(j => {
      const guide = projectGuides[j.slug];
      const solved = j.stages.filter(s => items[j.ref]?.challenges[s.id]?.solved).length;
      const assisted = j.stages.filter(s => !items[j.ref]?.challenges[s.id]?.solved && items[j.ref]?.challenges[s.id]?.assisted).length;
      return <li key={j.ref}>
        <div className="py-project-meta"><span className="py-level">{guide.level}</span><span>{j.packages.includes('pandas') ? 'pandas' : 'Standard library'} · Browser program</span></div>
        <h2><Link href={journeyHref(j)}>{j.title}</Link></h2><p>{j.overview}</p>
        <p><b>Practice:</b> {guide.skills.join(', ')}</p>
        <p><b>Plan for:</b> {guide.sessions} (estimate)</p>
        <p><b>Take away:</b> Python source, {guide.deliverables.join(', ')}, and a checked summary.</p>
        <p>{ready ? `${solved} of ${j.stages.length} milestones solved independently${assisted ? ` · ${assisted} with help` : ''}` : 'Loading saved progress…'}</p>
      </li>;
    })}</ol>
    {shown.length === 0 && <p>No projects match these filters. Clear a filter to broaden your choice.</p>}
    <section className="py-further" aria-labelledby="further-title"><h2 id="further-title">After a browser project</h2>
      <p>Explain your assumptions, show a failing input you fixed, and document what your program cannot do yet. These make a useful project write-up.</p>
      <p>For a later project on your own computer, explore <a href="https://roadmap.sh/python/projects">roadmap.sh project ideas</a> or <a href="https://github.com/topics/python">Python repositories on GitHub</a>. These are external resources, not graded Runtime projects. Server, desktop, and paid-API projects need their own setup.</p>
      <p>When exploring a repository, read its README, setup requirements, tests, and license before running or reusing its code.</p>
    </section>
  </div></Shell>;
}

export function Journey({ slug, initialStage }: { slug: string; initialStage?: string }) {
  const j = pythonJourneys.find(j => j.slug === slug)!;
  const ready = usePyProgressReady();
  const rec = usePyProgress(s => s.items[j.ref]);
  const [selected, setSelected] = useState<string | null>(initialStage ?? null);
  const selectedId = selected ?? (j.kind === 'case' ? rec?.tab : null);
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
    {j.kind === 'project' && <BrowserBar label="All projects" current={journeyHref(j)} browseHref="/python/projects?browse=1" browseLabel="Project filters" items={pythonProjects.map(p => ({href:journeyHref(p), label:p.title}))} />}
    <section className="rx-page py-journey-intro">
      {stage && j.kind === 'project' && <button className="rx-btn ghost" onClick={() => setSelected(null)}>Project brief</button>}
      {(!stage || j.kind === 'case') && <>
      <h1 className="rx-title">{j.title}</h1><p className="rx-lead">{j.overview}</p>
      <p>{j.packages.length ? 'Uses pandas in your browser.' : 'Uses the Python standard library.'} Run code to inspect outputs and download generated files. Check answer records progress. Earlier milestone checks remain active.</p>
      <details><summary>Explore the source data</summary>{Object.entries(j.files).map(([name,text]) => <div key={name}><h2>{name}</h2><pre>{text}</pre><Download name={name} text={text} /></div>)}</details>
      </>}
      <ol className="py-stage-list" aria-label="Milestones">{j.stages.map((s,n) => <li key={s.id}><button className="rx-btn" disabled={!ready || !available(n)} aria-current={stage?.id === s.id ? 'step' : undefined} onClick={() => open(n)}>{n+1}. {s.title}</button><span>{rec?.challenges[s.id]?.solved ? 'Independent' : rec?.challenges[s.id]?.assisted ? 'With help' : !available(n) ? 'Complete earlier stages first' : 'Ready'}</span></li>)}</ol>
    </section>
    {!ready ? <p role="status">Loading saved progress…</p> : stage && available(index) ? <Exercise key={stage.ref} itemRef={j.ref} id={stage.id} title={stage.title} question={stage} starterOverride={previous ? rec?.drafts[previous.id] ?? '' : stage.starter} inheritedHelp={inheritedHelp} next={index < j.stages.length - 1 ? <button className="rx-btn primary" onClick={() => open(index+1)}>Continue to milestone {index+2}</button> : <span>Case complete. Your checked work is saved in this browser.</span>} /> : <p className="rx-page">Read the overview, inspect the source data, then open the first stage.</p>}
  </Shell>;
}
