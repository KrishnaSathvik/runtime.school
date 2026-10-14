import type { ProjectV2 } from '@/content/python/projects-v2/model';
import type {FunctionRanges} from './function-editing';
import type { PyFile } from '@/engine/python/client';
export const PROJECT_STORAGE_KEY='runtime-python-projects-v2';
export type ProjectEvidence={snapshot:string;passed:boolean;time:number;checks:{label:string;passed:boolean}[];artifacts:PyFile[]};
export type ProjectDraft={files:Record<string,string>;functionRanges?:FunctionRanges;selected:string;milestone:number;interpretation:string;evidence?:ProjectEvidence;milestones:Record<string,{snapshot:string;passed:boolean}>};
export type ProjectStorage={version:2;projects:Record<string,Record<string,ProjectDraft>>};
export const snapshot=(files:Record<string,string>)=>JSON.stringify(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
export function freshDraft(project:ProjectV2):ProjectDraft{return {files:{...project.starters},selected:Object.keys(project.starters).find(name=>name!=='main.py'&&name!=='charts.py')??'main.py',milestone:0,interpretation:'',milestones:{}};}
export function readDraft(raw:string|null,project:ProjectV2):ProjectDraft {
 try{const parsed=JSON.parse(raw??'null');const saved=parsed?.projects?.[project.ref]?.[project.revision];if(!saved||typeof saved.files!=='object')return freshDraft(project);
 const files={...project.starters};for(const name of Object.keys(files))if(typeof saved.files[name]==='string')files[name]=saved.files[name];
 return {...freshDraft(project),files,functionRanges:saved.functionRanges&&typeof saved.functionRanges==='object'?saved.functionRanges:undefined,selected:typeof saved.selected==='string'?saved.selected:'main.py',milestone:Math.max(0,Math.min(project.milestones.length-1,Number(saved.milestone)||0)),interpretation:typeof saved.interpretation==='string'?saved.interpretation:'',evidence:saved.evidence,milestones:saved.milestones??{}};
 }catch{return freshDraft(project);}
}
export function writeDraft(raw:string|null,project:ProjectV2,draft:ProjectDraft):string{
 let store:ProjectStorage={version:2,projects:{}};
 if(raw){const previous=JSON.parse(raw);if(previous?.version!==2||!previous.projects||typeof previous.projects!=='object')throw new Error('Saved project data could not be read. Export your work before replacing it.');store=previous;}
 store.projects[project.ref]={...store.projects[project.ref],[project.revision]:draft};return JSON.stringify(store);
}
export function canDeliver(project:ProjectV2,draft:ProjectDraft):boolean{
 const e=draft.evidence;return !!e?.passed&&e.snapshot===snapshot(draft.files)&&project.artifacts.every(path=>e.artifacts.some(f=>f.path===path&&!f.truncated&&f.text.length>0))&&(!project.analytical||draft.interpretation.trim().length>=80);
}
