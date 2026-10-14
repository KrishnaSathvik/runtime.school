"use client";
import Link from 'next/link';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Shell} from '@/features/rt/Shell';
import {PyEditor,type PyEditorHandle} from '../PyEditor';
import {ConsoleView,ChecksView} from '../Output';
import {downloadText} from '../Downloads';
import {usePyProgress} from '@/lib/python-progress';
import type {ProjectV2} from '@/content/python/projects-v2/model';
import {executeProject} from './runner';
import {PROJECT_STORAGE_KEY,freshDraft,readDraft,writeDraft,snapshot,canDeliver,type ProjectDraft} from './state';
import {downloadZip} from './archive';
import './projects.css';
import {DataPreview} from './DataPreview';
import {projectGuidance} from '@/content/python/projects-v2/guidance';

export function ProjectCatalog({projects}:{projects:Pick<ProjectV2,'ref'|'slug'|'title'|'level'|'milestones'|'objective'|'datasets'>[]}){return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects'}]}><div className="py-project-v2 pv-catalog"><p className="rx-label">Python Projects</p><h1>Build something that works.</h1><p>Connected Python files, realistic synthetic inputs, executable tests, and deliverables from your own program.</p><div className="pv-projects">{projects.map(p=><Link key={p.ref} href={`/python/projects/${p.slug}`}><span className="rx-label">{p.level} · {p.milestones.length} milestones</span><h2>{p.title}</h2><p>{p.objective}</p><span>{p.datasets.reduce((n,d)=>n+d.rows,0).toLocaleString()} input records across {p.datasets.length} files →</span></Link>)}</div></div></Shell>;}

export function ProjectWorkspace({project,initialStage}:{project:ProjectV2;initialStage?:string}){
 const [draft,setDraft]=useState<ProjectDraft>(()=>freshDraft(project));const [ready,setReady]=useState(false);const [storageError,setStorageError]=useState('');
 const [busy,setBusy]=useState(false);const running=useRef(false);const editor=useRef<PyEditorHandle>(null);const layout=useRef<HTMLDivElement>(null);const [run,setRun]=useState<Awaited<ReturnType<typeof executeProject>>|null>(null);const [runSnapshot,setRunSnapshot]=useState('');const [notice,setNotice]=useState('');
 const [stage,setStage]=useState<'overview'|'build'|'finish'>('overview');
 const [reference,setReference]=useState<'task'|'data'>('task');
 const [runMode,setRunMode]=useState<'run'|'milestone'|'acceptance'>('run');
 const [output,setOutput]=useState<'console'|'tests'|'files'>('console');
 const [dataPath,setDataPath]=useState(project.datasets[0]?.path??'');
 const [paneWidth,setPaneWidth]=useState(50);
 const [focusRequest,setFocusRequest]=useState(0);
 function navigate(next:'overview'|'build'|'finish'){setStage(next);window.history.replaceState(null,'',`#${next}`);window.scrollTo(0,0);}
 useEffect(()=>{const hash=window.location.hash.slice(1);if(hash==='build'||hash==='finish')setStage(hash);else if(initialStage)setStage('build');},[initialStage]);

 const legacy=usePyProgress(s=>s.items[project.ref]);
 useEffect(()=>{try{const raw=localStorage.getItem(PROJECT_STORAGE_KEY);const loaded=readDraft(raw,project);if(initialStage){const i=project.milestones.findIndex(m=>m.id===initialStage);if(i>=0)loaded.milestone=i;}if(!Object.hasOwn(loaded.files,loaded.selected))loaded.selected=Object.keys(loaded.files).find(name=>name!=='main.py')??'main.py';setDraft(loaded);}catch{setStorageError('Browser storage is unavailable. Download your work before leaving.');}setReady(true);},[project,initialStage]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(PROJECT_STORAGE_KEY,writeDraft(localStorage.getItem(PROJECT_STORAGE_KEY),project,draft));setStorageError('');}catch{setStorageError('Work could not be saved in this browser. Download your work before leaving; existing saved data has not been replaced.');}},[draft,ready,project]);
 const guidance=projectGuidance[project.slug];
 const current=project.milestones[draft.milestone]??project.milestones[0];const editable=Object.hasOwn(draft.files,draft.selected);const text=editable?draft.files[draft.selected]:project.files[draft.selected]??'';
 const targetFunction=current.objective.match(/Implement (\w+)/)?.[1];
 const targetFile=targetFunction?Object.keys(draft.files).find(name=>draft.files[name].includes(`def ${targetFunction}(`)):undefined;
 useEffect(()=>{if(focusRequest&&targetFunction){const line=(draft.files[draft.selected]??'').split('\n').findIndex(l=>l.includes(`def ${targetFunction}(`));if(line>=0)editor.current?.goToLine(line+1);}},[focusRequest,draft.selected]);
 function openFunction(){if(targetFile){setDraft(d=>({...d,selected:targetFile}));setFocusRequest(n=>n+1);}}
 const complete=canDeliver(project,draft);const stale=runSnapshot!==snapshot(draft.files);
 const artifactList=stage==='finish'&&draft.evidence?draft.evidence.artifacts:run&&'files' in run.result?run.result.files??[]:draft.evidence?.artifacts??[];
 async function execute(mode:'run'|'milestone'|'acceptance'){
  if(running.current)return;running.current=true;setBusy(true);setNotice('');setOutput(mode==='run'?'console':'tests');const source={...draft.files};const sig=snapshot(source);const milestone=draft.milestone;
  try{const result=await executeProject(project,source,mode,milestone);setRun(result);setRunMode(mode);setRunSnapshot(sig);
   if(result.report){const evidence={snapshot:sig,passed:result.report.ok,time:Date.now(),checks:result.report.checks.map(c=>({label:c.label,passed:c.status==='pass'})),artifacts:'files' in result.result?result.result.files??[]:[]};
    setDraft(d=>mode==='acceptance'?{...d,evidence}:{...d,milestones:{...d.milestones,[project.milestones[milestone].id]:{snapshot:sig,passed:result.report!.ok}}});
    setNotice(result.report.summary);
   }else setNotice('Run finished. Run does not award completion.');
  }catch(e){setNotice(e instanceof Error?e.message:String(e));}finally{running.current=false;setBusy(false);}
 }
 function bundle(verified:boolean){
  const files:Record<string,string>={...project.files,...draft.files};
  if(!verified&&legacy)for(const [name,code] of Object.entries(legacy.drafts))if(name.startsWith('stage-'))files[`saved-drafts/${name}.py`]=code;
  if(verified&&complete&&draft.evidence){for(const f of draft.evidence.artifacts)if(!f.truncated&&!Object.hasOwn(files,f.path))files[f.path]=f.text;files['verification.json']=JSON.stringify({project:project.ref,revision:project.revision,checkedAt:new Date(draft.evidence.time).toISOString(),checks:draft.evidence.checks},null,2);if(project.analytical)files['interpretation.md']=draft.interpretation;}
  downloadZip(`${project.slug}-${verified?'verified':'work-in-progress'}.zip`,files);
 }
 const selectedData=project.datasets.find(d=>d.path===dataPath)??project.datasets[0];
 const missing=project.artifacts.filter(path=>!draft.evidence?.artifacts.some(f=>f.path===path&&!f.truncated&&f.text.length>0));
 const blockers=[...(!draft.evidence?['Run the complete project check.']:!draft.evidence.passed?['Fix the failing project checks.']:[]),...(draft.evidence&&draft.evidence.snapshot!==snapshot(draft.files)?['Code changed after the last project check. Check it again.']:[]),...(missing.length?[`Generate complete output files: ${missing.join(', ')}.`]:[]),...(project.analytical&&draft.interpretation.trim().length<80?['Add your final interpretation (at least 80 characters).']:[])];
 const artifacts=<div className="pv-artifacts">{artifactList.length===0?<p>No files generated yet. Run the completed program to create its outputs.</p>:artifactList.filter(f=>!Object.hasOwn(project.files,f.path)&&!Object.hasOwn(draft.files,f.path)).map(f=><div key={f.path}><span>{f.path}{f.truncated?' · incomplete':''}</span><button className="rx-btn" disabled={!!f.truncated} onClick={()=>downloadText(f.path,f.text)}>Download {f.path}</button>{f.path.endsWith('.svg')&&!f.truncated&&<img className="pv-chart" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(f.text)}`} alt={`Generated chart: ${f.path}`} />}</div>)}</div>;
 const checks=run?.report&&(stage!=='finish'||runMode==='acceptance')?<ChecksView busy={busy} checked={{report:run.report,code:runSnapshot}} edited={stale}/>:draft.evidence?<><p>Last complete-project check{draft.evidence.snapshot!==snapshot(draft.files)?' — code has changed':''}.</p><ul>{draft.evidence.checks.map(c=><li key={c.label}>{c.passed?'Passed':'Failed'}: {c.label}</li>)}</ul></>:<p>{stage==='finish'?'No acceptance results yet. Use Check complete project to test the entire program.':'No checks run yet. Check milestone tests the current step and earlier steps.'}</p>;
 if(!ready)return <Shell subject="python" section="projects" path={[{label:'projects'}]}><p className="rx-page" role="status">Loading your project files…</p></Shell>;
 return <Shell subject="python" section="projects" path={[{label:'python',href:'/python'},{label:'projects',href:'/python/projects'},{label:project.title}]}>
 <div className="py-project-v2 pv-project-page">
  <header className="pv-header"><Link className="rx-link" href="/python/projects">← All projects</Link><span>{project.level}</span><h1>{project.title}</h1><p>{project.objective}</p></header>
  <nav className="pv-stage-nav" aria-label="Project stages">{(['overview','build','finish'] as const).map(value=><button key={value} aria-current={stage===value?'page':undefined} onClick={()=>navigate(value)}>{value==='overview'?'Overview':value==='build'?'Build':'Test & deliver'}</button>)}{stage==='build'&&<span>Milestone {draft.milestone+1} of {project.milestones.length}</span>}</nav>
  {storageError&&<p className="pv-warning" role="alert">{storageError}</p>}
  {stage==='overview'&&<section className="pv-overview">
   <div className="pv-overview-context"><h2>The project</h2><p>{project.scenario}</p>
   {guidance&&<><h2>Before you start</h2><p>{guidance.skills}</p><h2>How the files connect</h2><p>{guidance.flow}</p><h2>A concrete example</h2><p>{guidance.example}</p></>}
   </div><div className="pv-overview-plan"><h2>Your milestones</h2><ol>{project.milestones.map(m=><li key={m.id}><strong>{m.title}</strong><p>{m.objective}</p></li>)}</ol>
   <h2>Available data</h2><ul>{project.datasets.map(d=><li key={d.path}><strong>{d.path}</strong> · {d.rows.toLocaleString()} {d.rows===1?'record':'records'}<p>{d.purpose}</p></li>)}</ul>
   <h2>What you will deliver</h2><p>Your Python files and {project.artifacts.join(', ')}.</p>
   <p>The starter is intentionally unfinished. Replace each function’s <code>raise NotImplementedError(...)</code> as you work through the milestones. Check each milestone before running the full program. main.py already loads the inputs and calls your code.</p>
   </div>
  </section>}
  {stage==='build'&&<nav className="pv-mobile-nav" aria-label="Workspace shortcuts"><button onClick={()=>{setReference('task');document.querySelector('.pv-brief')?.scrollIntoView({block:'start'});}}>Task</button><button onClick={()=>document.querySelector('.pv-files')?.scrollIntoView({block:'start'})}>Files</button><button onClick={()=>document.querySelector('.pv-work')?.scrollIntoView({block:'start'})}>Editor</button><button onClick={()=>{setOutput('tests');document.querySelector('.pv-output')?.scrollIntoView({block:'start'});}}>Tests</button></nav>}
  {stage==='build'&&<div ref={layout} className="pv-build" style={{'--pv-task-width':`${paneWidth}%`} as CSSProperties}>
   <aside className="pv-brief">
    <label className="pv-milestone-label" htmlFor="project-milestone">Current milestone</label><select id="project-milestone" value={draft.milestone} onChange={e=>{setDraft(d=>({...d,milestone:Number(e.target.value)}));setReference('task');}}>{project.milestones.map((m,i)=><option key={m.id} value={i}>{i+1}. {m.title}{draft.milestones[m.id]?.passed?' ✓':''}</option>)}</select>
    <div className="pv-tab-bar" role="group" aria-label="Task and data"><button aria-pressed={reference==='task'} onClick={()=>setReference('task')}>Task</button><button aria-pressed={reference==='data'} onClick={()=>setReference('data')}>Data</button></div>
    {reference==='task'?<section className="pv-task"><h2>{current.title}</h2><p>{current.objective}</p>{targetFile&&<button className="rx-btn" onClick={openFunction}>Open {targetFunction}() in {targetFile}</button>}<h3>Requirements</h3><ul>{current.requirements.map(r=><li key={r}>{r}</li>)}</ul><p className="rx-small">Implement this step first. Check milestone also checks earlier steps; later unfinished functions can wait.</p></section>:<section className="pv-inputs"><label htmlFor="project-data">Input file</label><select id="project-data" value={dataPath} onChange={e=>setDataPath(e.target.value)}>{project.datasets.map(d=><option key={d.path} value={d.path}>{d.path}</option>)}</select>{selectedData&&<><h2>{selectedData.path}</h2><p>{selectedData.purpose}</p><p className="rx-small">{selectedData.rows.toLocaleString()} records · {selectedData.format.toUpperCase()} · Fields: {selectedData.schema}</p><DataPreview dataset={selectedData}/><p className="rx-small">{selectedData.rows>5?'First 5 records shown.':'All records shown.'} Inputs are already available to your code.</p><button className="rx-btn" onClick={()=>setDraft(d=>({...d,selected:selectedData.path}))}>Open full input</button><button className="rx-btn" onClick={()=>downloadText(selectedData.path,project.files[selectedData.path])}>Download input</button></>}</section>}
    <section className="pv-files"><h2>Project files</h2><div className="pv-explorer" role="group" aria-label="File explorer"><div><p>Editable code</p>{Object.keys(draft.files).map(name=><button key={name} aria-pressed={draft.selected===name} onClick={()=>setDraft(d=>({...d,selected:name}))}>{name}</button>)}</div><div><p>Inputs & tests · read only</p>{Object.keys(project.files).filter(name=>name!=='_expected.json').map(name=><button key={name} aria-pressed={draft.selected===name} onClick={()=>setDraft(d=>({...d,selected:name}))}>{name}</button>)}</div></div></section>
   </aside>
   <div className="pv-divider" role="separator" aria-label="Resize task and editor columns" aria-orientation="vertical" aria-valuenow={paneWidth} aria-valuemin={25} aria-valuemax={55} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setPaneWidth(v=>Math.max(25,Math.min(55,v+(e.key==='ArrowRight'?2:-2))));}}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId)||!layout.current)return;const box=layout.current.getBoundingClientRect();setPaneWidth(Math.max(25,Math.min(55,Math.round((e.clientX-box.left)/box.width*100))));}} onPointerUp={e=>e.currentTarget.releasePointerCapture(e.pointerId)}/>
   <section className="pv-work" aria-label="Project workspace">
    <div className="pv-file-head"><b>{draft.selected}</b><span>{editable?'Python · Saved as you type':'Read only · full file'}</span>{!editable&&<button className="rx-btn" onClick={()=>downloadText(draft.selected,text)}>Download full file</button>}</div>
    {editable?<PyEditor ref={editor} key={draft.selected} value={text} onChange={value=>setDraft(d=>({...d,files:{...d.files,[d.selected]:value}}))} onRun={()=>execute('run')} onCheck={()=>execute('milestone')} label={`${draft.selected}, project Python editor`} minHeight="320px"/>:<pre className="pv-full-source" role="textbox" aria-label={`${draft.selected}, read-only file`} aria-readonly="true" tabIndex={0}>{text}</pre>}
    <div className="pv-actions"><button className="rx-btn" disabled={busy} onClick={()=>execute('run')}>Run project</button><button className="rx-btn primary" disabled={busy} onClick={()=>execute('milestone')}>Check milestone</button></div>
    <p className="pv-status" role="status">{busy?'Running Python…':notice}{run&&stale?' Code changed since this run. Check again.':''}</p>
    <section className="pv-output"><div className="pv-tab-bar" role="group" aria-label="Output views">{(['console','tests','files'] as const).map(value=><button key={value} aria-pressed={output===value} onClick={()=>setOutput(value)}>{value==='console'?'Console':value==='tests'?'Tests':'Generated files'}</button>)}</div><div className="pv-results">{output==='tests'?checks:output==='files'?artifacts:!run&&!busy?<p>Run project executes main.py. While later functions are unfinished, use Check milestone to test the current step.</p>:<ConsoleView busy={busy} live={[]} ran={run?{result:'files' in run.result?{...run.result,files:[]}:run.result,code:runSnapshot}:null} edited={stale}/>}</div></section>
   </section>
  </div>}
  {stage==='finish'&&<section className="pv-finish"><h2>Test & deliver</h2><p>Run every acceptance check against your current files, then download the program with its generated outputs.</p><div className="pv-actions"><button className="rx-btn primary" disabled={busy} onClick={()=>execute('acceptance')}>Check complete project</button><button className="rx-btn" onClick={()=>navigate('build')}>Return to Build</button></div><p role="status">{busy?'Running Python…':notice}</p><h3>{complete?'Ready to deliver':'Still to do'}</h3>{complete?<p>Current code passed every check and all required files are available.</p>:<ul>{blockers.map(message=><li key={message}>{message}</li>)}</ul>}<section className="pv-output"><h2>Acceptance results</h2>{checks}</section><h2>Generated files</h2>{draft.evidence&&<p className="rx-small">Captured by the last complete-project check{draft.evidence.snapshot!==snapshot(draft.files)?"; your code has changed since then":""}.</p>}{artifacts}
   {project.analytical&&<section><h2>Interpret the verified results</h2><p>{project.interpretation}</p><label htmlFor="project-interpretation">Final interpretation (at least 80 characters)</label><textarea id="project-interpretation" value={draft.interpretation} onChange={e=>setDraft(d=>({...d,interpretation:e.target.value}))} rows={6}/><p className="rx-small">Checks verify calculations and files. Your interpretation is not automatically assessed for factual quality.</p></section>}
   <div className="pv-delivery"><button className="rx-btn" onClick={()=>bundle(false)}>Download work in progress</button><button className="rx-btn primary" disabled={!complete||busy} onClick={()=>bundle(true)}>Download verified project</button></div>
  </section>}
 </div></Shell>;
}
