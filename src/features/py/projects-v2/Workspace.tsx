"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {Shell} from '@/features/rt/Shell';
import {PyEditor} from '../PyEditor';
import {ConsoleView,ChecksView} from '../Output';
import {downloadText} from '../Downloads';
import {usePyProgress,usePyProgressReady} from '@/lib/python-progress';
import type {ProjectV2} from '@/content/python/projects-v2/model';
import {executeProject} from './runner';
import {PROJECT_STORAGE_KEY,freshDraft,readDraft,writeDraft,snapshot,canDeliver,type ProjectDraft} from './state';
import {downloadZip} from './archive';
import './projects.css';

export function ProjectCatalog({projects}:{projects:Pick<ProjectV2,'ref'|'slug'|'title'|'level'|'milestones'|'objective'|'datasets'>[]}){return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects'}]}><main className="py-project-v2 pv-catalog"><p className="rx-label">Python Projects · V2</p><h1>Build something that works.</h1><p>Connected Python files, realistic synthetic inputs, executable tests, and deliverables from your own program.</p><div className="pv-projects">{projects.map(p=><Link key={p.ref} href={`/python/projects/${p.slug}`}><span className="rx-label">{p.level} · {p.milestones.length} milestones</span><h2>{p.title}</h2><p>{p.objective}</p><span>{p.datasets.reduce((n,d)=>n+d.rows,0).toLocaleString()} input records across {p.datasets.length} files →</span></Link>)}</div></main></Shell>;}

export function ProjectWorkspace({project,initialStage}:{project:ProjectV2;initialStage?:string}){
 const [draft,setDraft]=useState<ProjectDraft>(()=>freshDraft(project));const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState('');
 const [busy,setBusy]=useState(false);const running=useRef(false);const [run,setRun]=useState<Awaited<ReturnType<typeof executeProject>>|null>(null);const [runSnapshot,setRunSnapshot]=useState('');const [notice,setNotice]=useState('');
 const legacy=usePyProgress(s=>s.items[project.ref]);const legacyReady=usePyProgressReady();
 useEffect(()=>{try{const raw=localStorage.getItem(PROJECT_STORAGE_KEY);const loaded=readDraft(raw,project);if(initialStage){const i=project.milestones.findIndex(m=>m.id===initialStage);if(i>=0)loaded.milestone=i;}setDraft(loaded);}catch{setStorageError('Browser storage is unavailable. Download your work before leaving.');}setReady(true);},[project,initialStage]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(PROJECT_STORAGE_KEY,writeDraft(localStorage.getItem(PROJECT_STORAGE_KEY),project,draft));setStorageError('');}catch{setStorageError('Work could not be saved in this browser. Download your work before leaving; existing saved data has not been replaced.');}},[draft,ready,project]);
 const current=project.milestones[draft.milestone]??project.milestones[0];const editable=Object.hasOwn(draft.files,draft.selected);const text=editable?draft.files[draft.selected]:project.files[draft.selected]??'';
 const dataset=project.datasets.find(d=>d.path===draft.selected);const complete=canDeliver(project,draft);const stale=runSnapshot!==snapshot(draft.files);
 const artifactList=run&&'files' in run.result?run.result.files??[]:[];
 async function execute(mode:'run'|'milestone'|'acceptance'){
  if(running.current)return;running.current=true;setBusy(true);setNotice('');const source={...draft.files};const sig=snapshot(source);const milestone=draft.milestone;
  try{const result=await executeProject(project,source,mode,milestone);setRun(result);setRunSnapshot(sig);
   if(result.report){const evidence={snapshot:sig,passed:result.report.ok,time:Date.now(),checks:result.report.checks.map(c=>({label:c.label,passed:c.status==='pass'})),artifacts:'files' in result.result?result.result.files??[]:[]};
    setDraft(d=>mode==='acceptance'?{...d,evidence}:{...d,milestones:{...d.milestones,[project.milestones[milestone].id]:{snapshot:sig,passed:result.report!.ok}}});
    setNotice(result.report.summary);
   }else setNotice('Run finished. Run does not award completion.');
  }catch(e){setNotice(e instanceof Error?e.message:String(e));}finally{running.current=false;setBusy(false);}
 }
 function bundle(verified:boolean){
  const files:Record<string,string>={...project.files,...draft.files};
  if(verified&&complete&&draft.evidence){for(const f of draft.evidence.artifacts)if(!f.truncated&&!Object.hasOwn(files,f.path))files[f.path]=f.text;files['verification.json']=JSON.stringify({project:project.ref,revision:project.revision,checkedAt:new Date(draft.evidence.time).toISOString(),checks:draft.evidence.checks},null,2);if(project.analytical)files['interpretation.md']=draft.interpretation;}
  downloadZip(`${project.slug}-${project.revision}-${verified?'verified':'work-in-progress'}.zip`,files);
 }
 if(!ready)return <Shell subject="python" section="projects" path={[{label:'projects'}]}><p className="rx-page" role="status">Loading your project files…</p></Shell>;
 return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects',href:'/python/projects'},{label:project.title}]}>
 <main className="py-project-v2">
  <header className="pv-header"><Link className="rx-link" href="/python/projects">← All projects</Link><span>{project.level} · Revision {project.revision}</span><h1>{project.title}</h1><p>{project.objective}</p><p className="rx-small">{project.scenario}</p></header>
  {storageError&&<p className="pv-warning" role="alert">{storageError}</p>}
  {legacyReady&&legacy&&<details className="pv-history"><summary>V1 history preserved · {Object.values(legacy.challenges).filter(c=>c.passes>0).length} previous milestone passes</summary><p>These drafts and results belong to the original project. They do not count as V2 completion. Nothing has been migrated or reset.</p>{Object.entries(legacy.drafts).filter(([key])=>key.startsWith('stage-')).map(([key,code])=><div key={key}><b>{key}</b><button className="rx-btn" onClick={()=>downloadText(`${project.slug}-v1-${key}.py`,code)}>Download original code</button><pre>{code}</pre></div>)}</details>}
  <div className="pv-layout">
   <article className="pv-brief"><h2>Build plan</h2><nav className="pv-milestones" aria-label="Project milestones">{project.milestones.map((m,i)=><button key={m.id} aria-current={i===draft.milestone?'step':undefined} onClick={()=>setDraft(d=>({...d,milestone:i}))}><span>{i+1}.</span> {m.title}{draft.milestones[m.id]?.passed?' ✓':''}</button>)}</nav>
    <section className="pv-task"><p className="rx-label">Milestone {draft.milestone+1} of {project.milestones.length}</p><h2>{current.title}</h2><p>{current.objective}</p><ul>{current.requirements.map(r=><li key={r}>{r}</li>)}</ul><p className="rx-small">Your files carry across every milestone. Checks include the earlier milestones. Run project executes main.py; Check milestone tests the reusable functions, so unfinished later steps do not block you.</p></section>
    <h2>Input data</h2><p className="rx-small">Synthetic data · seed {project.seed}. Samples below are limited to five records. Full inputs are available from the file explorer.</p>{project.datasets.map(d=><section className="pv-dataset" key={d.path}><h3>{d.path}</h3><span>{d.rows.toLocaleString()} records · {d.format.toUpperCase()}</span><p>{d.purpose}</p><p className="pv-schema">{d.schema}</p><details><summary>View sample</summary><pre>{d.sample}</pre></details></section>)}
    <details><summary>Dataset generation rules</summary><p>{project.generation}</p></details>
    <h2>Deliverables</h2><ul>{project.artifacts.map(f=><li key={f}><code>{f}</code></li>)}</ul>
   </article>
   <section className="pv-work" aria-label="Project workspace">
    <h2>Project files</h2><div className="pv-explorer" role="group" aria-label="File explorer"><div><p className="rx-label">Editable code</p>{Object.keys(draft.files).map(name=><button className="rx-btn" key={name} aria-pressed={draft.selected===name} onClick={()=>setDraft(d=>({...d,selected:name}))}>{name}</button>)}</div><div><p className="rx-label">Inputs & tests · read only</p>{Object.keys(project.files).filter(name=>name!=='_expected.json').map(name=><button className="rx-btn" key={name} aria-pressed={draft.selected===name} onClick={()=>setDraft(d=>({...d,selected:name}))}>{name}</button>)}</div></div>
    <div className="pv-file-head"><b>{draft.selected}</b><span>{editable?'Saved as you type':'Read only'}</span>{!editable&&<button className="rx-btn" onClick={()=>downloadText(draft.selected,text)}>Download full file</button>}</div>
    {editable?<PyEditor key={draft.selected} value={text} onChange={value=>setDraft(d=>({...d,files:{...d.files,[d.selected]:value}}))} onRun={()=>execute('run')} onCheck={()=>execute('milestone')} label={`${draft.selected}, project Python editor`} minHeight="280px"/>:<div className="pv-source"><pre>{dataset?dataset.sample:text.slice(0,16000)}</pre>{(!!dataset||text.length>16000)&&<p>Preview only. Download the full file to inspect all contents.</p>}</div>}
    <div className="pv-actions"><button className="rx-btn" disabled={busy} onClick={()=>execute('run')}>Run project</button><button className="rx-btn" disabled={busy} onClick={()=>execute('milestone')}>Check milestone</button><button className="rx-btn primary" disabled={busy} onClick={()=>execute('acceptance')}>Check complete project</button></div>
    <p role="status">{busy?'Running Python…':notice}{run&&stale?' Code changed since this run. Check again before delivery.':''}</p>
    <section className="pv-output"><h2>Tests & output</h2>{run?.report&&<ChecksView busy={busy} checked={{report:run.report,code:runSnapshot}} edited={stale}/>}{!run?.report&&<ConsoleView busy={busy} live={[]} ran={run?{result:'files' in run.result?{...run.result,files:[]}:run.result,code:runSnapshot}:null} edited={stale}/>}</section>
    <section className="pv-artifacts"><h2>Generated artifacts</h2>{artifactList.length===0?<p>Run your program to create its output files. No example artifacts are substituted.</p>:artifactList.filter(f=>!Object.hasOwn(project.files,f.path)&&!Object.hasOwn(draft.files,f.path)).map(f=><div key={f.path}><span>{f.path} · {f.text.length.toLocaleString()} characters{f.truncated?' · incomplete':''}</span><button className="rx-btn" disabled={!!f.truncated} onClick={()=>downloadText(f.path,f.text)}>Download</button>{f.path.endsWith('.svg')&&!f.truncated&&<img className="pv-chart" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.text)}`} alt={`Generated chart: ${f.path}`} />}</div>)}</section>
    {project.analytical&&<section><h2>Interpret the verified results</h2><p>{project.interpretation}</p><label htmlFor="project-interpretation">Final interpretation (at least 80 characters)</label><textarea id="project-interpretation" value={draft.interpretation} onChange={e=>setDraft(d=>({...d,interpretation:e.target.value}))} rows={6}/><p className="rx-small">Checks verify calculations and files. Your written interpretation is not automatically assessed for factual quality.</p></section>}
    <section className="pv-delivery"><h2>Deliver your project</h2><p>{complete?'Ready: current code passed every acceptance check and all required artifacts were captured.':'Run Check complete project with your current files. Delivery requires passing tests, complete artifacts'+(project.analytical?', and your final interpretation.':'.')}</p><button className="rx-btn" onClick={()=>bundle(false)}>Download work in progress</button><button className="rx-btn primary" disabled={!complete||busy} onClick={()=>bundle(true)}>Download verified project</button></section>
   </section>
  </div>
 </main></Shell>;
}
