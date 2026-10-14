import {runPython,type PyRunResult} from '@/engine/python/client';
import {gradePython,probeFor,type PyTask,type PyGradeReport} from '@/engine/python/grading';
import {py} from '@/engine/python/values';
import type {ProjectV2,ProjectCheck} from '@/content/python/projects-v2/model';
export async function executeProject(project:ProjectV2,files:Record<string,string>,mode:'run'|'milestone'|'acceptance',milestone:number):Promise<{result:PyRunResult;report?:PyGradeReport}>{
 const checks:ProjectCheck[]=mode==='acceptance'?project.acceptance:project.milestones.slice(0,milestone+1).flatMap(m=>m.checks);
 const task:PyTask={packages:project.packages,files:{...files,...project.files},timeoutMs:60000,checks:checks.map(c=>({kind:'expr',id:c.id,label:c.label,expr:`__import__('_acceptance').${c.function}()`,expected:py.bool(true)}))};
 const code=mode==='milestone'&&milestone<project.milestones.length-1?'# Test reusable modules without running unfinished later pipeline steps.\npass\n':files['main.py'];
 const result=await runPython(code,{...task,probe:mode==='run'?undefined:probeFor(task)});
 return {result,report:mode==='run'?undefined:gradePython(task,result)};
}
