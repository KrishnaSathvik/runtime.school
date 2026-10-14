"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, List, X } from 'lucide-react';
import { pythonProjects, journeyHref, type PyJourney } from '@/content/python/journeys';
import { projectGuides } from '@/content/python/journeys/catalog';
import { usePyProgress, usePyProgressReady, type PyLessonRecord } from '@/lib/python-progress';
import { Shell } from '@/features/rt/Shell';
import { Exercise, FileData } from './Study';
import { downloadText } from './Downloads';

const pad = (n:number) => String(n).padStart(2,'0');
const href = (p:PyJourney, stop:string) => `${journeyHref(p)}${stop === 'brief' ? '' : `?stage=${stop}`}`;

export function ProjectJourney({ slug, initialStage = 'brief' }: { slug:string; initialStage?:string }) {
  const project = pythonProjects.find(p => p.slug === slug)!;
  const ready = usePyProgressReady();
  const rec = usePyProgress(s => s.items[project.ref]);
  const router = useRouter();
  const index = project.stages.findIndex(s => s.id === initialStage);
  const stage = project.stages[index];
  const allowed = (i:number) => project.stages.slice(0,i).every(s => !!rec?.challenges[s.id]?.passes);
  const solved = project.stages.filter(s => rec?.challenges[s.id]?.passes).length;
  const findings = project.stages.filter(s => rec?.drafts[`finding:${s.id}`]?.trim()).length;
  const stop = stage ? stage.id : initialStage === 'export' ? 'export' : 'brief';
  // Copy the learner's own previous program only when a stage is first opened.
  useEffect(() => {
    if (!ready || !stage || !allowed(index)) return;
    const actions = usePyProgress.getState();
    if (rec?.drafts[stage.id] === undefined) actions.setDraft(project.ref, stage.id, index > 0 ? rec?.drafts[project.stages[index-1].id] ?? '' : stage.starter);
    if (rec?.tab !== stage.id) actions.setTab(project.ref, stage.id);
  // Record arrival once; editor changes must not reinitialize a stage.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, project.ref, stage?.id]);
  const go = (destination:string) => router.push(href(project,destination));
  return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects',href:'/python/projects'},{label:project.title,href:journeyHref(project)},{label:stop}]} status={['Python',project.title,`${solved}/${project.stages.length} milestones`,`${findings} findings`,'drafts save as you type']}>
    <ProjectBar project={project} stop={stop} />
    {!ready ? <div className="rx-page" role="status">Loading saved progress…</div> : stop === 'brief' ? <ProjectBrief project={project} rec={rec} /> : stop === 'export' ? <ProjectReport project={project} rec={rec} /> : stage && allowed(index) ? <Exercise key={stage.ref} itemRef={project.ref} id={stage.id} title={stage.title} question={stage} project context={`${index+1}/${project.stages.length} · ${project.title}`} starterOverride={index > 0 ? rec?.drafts[project.stages[index-1].id] ?? '' : stage.starter} inheritedHelp={project.stages.slice(0,index).some(s => !!rec?.attempts[s.id]?.guided)} next={<button className="rx-btn amber" onClick={() => go(project.stages[index+1]?.id ?? 'export')}>{index+1 < project.stages.length ? 'Continue to the next milestone' : 'Open the report'}<ArrowRight size={15} /></button>} /> : <div className="rx-page"><h1 className="rx-title">Finish the earlier milestones first</h1><p><Link className="rx-btn" href={journeyHref(project)}>Back to the brief</Link></p></div>}
  </Shell>;
}

function ProjectBar({project,stop}:{project:PyJourney;stop:string}) {
  const [open,setOpen] = useState(false);
  const items = usePyProgress(s => s.items);
  const button = useRef<HTMLButtonElement>(null);
  const stops = ['brief',...project.stages.map(s=>s.id),'export'];
  const position = stops.indexOf(stop);
  const close = () => {setOpen(false);button.current?.focus();};
  useEffect(() => {if(!open)return; const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);button.current?.focus();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[open]);
  return <div className="rx-task rx-lesson"><div className="rx-task-bar"><button ref={button} className="rx-btn ghost" aria-expanded={open} onClick={()=>setOpen(!open)}><List size={14} />All projects</button><span className="mono rx-small" style={{margin:0}}>{project.title} · {stop.startsWith('stage-') ? `milestone ${pad(position)} / ${pad(project.stages.length)}` : stop}</span><span className="push" /></div>
    {open && <div className="rx-drawer" role="dialog" aria-label="All projects"><div className="rx-drawer-head"><span className="rx-small" style={{flex:1}}>6 projects</span><button className="rx-btn ghost" aria-label="Close list" onClick={close}><X size={14} /></button></div><p><Link className="rx-link" style={{display:"block"}} href="/python/projects?browse=1">Browse project filters</Link></p><ol>{pythonProjects.map(p=><li key={p.ref}><p className="rx-drawer-group mono">{pad(pythonProjects.indexOf(p)+1)} {p.title}</p>{[{id:'brief',title:'Brief'},...p.stages,{id:'export',title:'Export'}].map(s=><Link key={s.id} href={href(p,s.id)} aria-current={p.ref===project.ref&&s.id===stop?'page':undefined} onClick={()=>setOpen(false)}><span className="mono g">{items[p.ref]?.challenges[s.id]?.passes?'✓':''}</span><span>{s.title}</span></Link>)}</li>)}</ol></div>}
  </div>;
}

function ProjectBrief({project,rec}:{project:PyJourney;rec:PyLessonRecord|undefined}) {
  const guide=projectGuides[project.slug];
  const next=project.stages.find(s=>!rec?.challenges[s.id]?.passes)?.id ?? 'export';
  return <div className="rx-task rx-lesson"><div className="rx-task-split"><article className="rx-brief" aria-labelledby="brief-title">
    <p className="rx-prompt-line"><b>project {pad(pythonProjects.indexOf(project)+1)}</b> {project.title}</p><h1 id="brief-title" className="rx-task-title">{project.title}</h1><p className="rx-lead" style={{fontSize:'1.05rem'}}>{project.overview}</p>
    <dl className="rx-dl"><dt>you deliver</dt><dd>{guide.deliverables.join(', ')}. Export a report with your checked Python and written findings.</dd><dt>skills</dt><dd>{guide.skills.join(' · ')}</dd><dt>scope</dt><dd>{project.stages.length} milestones · {Object.keys(project.files).length} input files · {guide.level}</dd></dl>
    <div className="py-project-actions"><Link className="rx-btn amber" href={href(project,next)}>{next==='export'?'Review the completed project':rec?'Continue with the next milestone':'Start the first milestone'}<ArrowRight size={15} /></Link><Link className="rx-btn ghost" href={href(project,'export')}>Open the report<ArrowRight size={15} /></Link></div>
    <p className="rx-label">milestones</p><ol className="rx-ms-list">{project.stages.map((s,i)=><li key={s.id}><Link href={href(project,s.id)}><span className={`mono g ${rec?.challenges[s.id]?.passes?'ok':''}`}>{rec?.challenges[s.id]?.passes?'✓':pad(i+1)}</span><span className="t">{s.title}<span className="d">{s.prompt}</span></span></Link></li>)}</ol>
  </article><section className="rx-work rx-lesson-work" aria-label="Project data"><p className="rx-prompt-line" style={{marginTop:0}}><b>data</b> {Object.keys(project.files).length} input files</p><p className="rx-prose" style={{margin:'0 0 10px',fontSize:15}}>Use these files throughout the project. Each milestone builds on your previous program.</p><FileData files={project.files} /></section></div></div>;
}

function ProjectReport({project,rec}:{project:PyJourney;rec:PyLessonRecord|undefined}) {
  const rows=project.stages.map(s=>{
    let evidence: {source?:string;ok?:boolean;passed?:number;total?:number;assisted?:boolean} = {};
    try {evidence=JSON.parse(rec?.drafts[`checked:${s.id}`] ?? '{}');} catch {}
    const source=rec?.drafts[s.id] ?? '';
    return {title:s.title,id:s.id,source,finding:rec?.drafts[`finding:${s.id}`] ?? '',verified:!!evidence?.ok && evidence.source===source,evidence};
  });
  const complete=rows.every(r=>r.verified&&r.finding.trim());
  const report=['# '+project.title,project.overview,...rows.flatMap(r=>['\n## '+r.title,r.verified ? `Checked: ${r.evidence.passed}/${r.evidence.total}${r.evidence.assisted?' (with help)':''}`:'Draft — check the current program before exporting.',r.finding || 'No finding recorded.','```python',r.source,'```'])].join('\n\n');
  return <div className="rx-task rx-lesson"><div className="rx-task-split"><article className="rx-brief"><p className="rx-prompt-line"><b>export</b> {project.title}</p><h1 className="rx-task-title">Your project report</h1><p className="rx-lead">Review your checked programs and explain what you found.</p><p className="rx-label">readiness</p><ol className="rx-ms-list">{rows.map(r=><li key={r.id}><Link href={href(project,r.id)}><span className="mono g">{r.verified&&r.finding.trim()?'✓':'·'}</span><span className="t">{r.title}<span className="d">{r.verified?'Current program checked':'Check the current program'} · {r.finding.trim()?'Finding saved':'Add a finding'}</span></span></Link></li>)}</ol><div className="py-project-actions"><button className="rx-btn amber" onClick={()=>downloadText(`${project.slug}${complete?'':'-draft'}.md`,report)}>{complete?'Download report':'Download draft report'}</button><button className="rx-btn" onClick={()=>downloadText(`${project.slug}.py`,rows.at(-1)?.source ?? '')} disabled={!rows.at(-1)?.source}>Download Python source</button></div><p className="rx-small">A finished report needs a current passing check and a finding for every milestone. Editing a program requires checking it again.</p></article><section className="rx-work rx-lesson-work" aria-label="Report preview"><p className="rx-label">report preview</p><pre className="py-report-preview" tabIndex={0}>{report}</pre></section></div></div>;
}
