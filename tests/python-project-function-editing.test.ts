import {describe,it,expect} from 'vitest';
import {functionRange,replaceFunction} from '../src/features/py/projects-v2/function-editing';
const source='import json\n\ndef first(x):\n    return x\n\ndef second(x):\n    return first(x)\n';
const names=['first','second'];
describe('milestone function editing',()=>{
 it('exposes only the current function and preserves connected code',()=>{
  const range=functionRange(source,'work.py','one','first',names)!;
  expect(source.slice(range.start,range.start+range.length)).toBe('def first(x):\n    return x');
  const updated=replaceFunction(source,'one',range,'def first(x):\n    return x + 1');
  expect(updated.source).toBe(source.replace('return x\n','return x + 1\n'));
 });
 it('keeps later saved ranges valid when an earlier function grows',()=>{
  const second=functionRange(source,'work.py','two','second',names)!;
  const saved=replaceFunction(source,'two',second,'def second(x):\n    return first(x) * 2');
  const first=functionRange(saved.source,'work.py','one','first',names,saved.ranges)!;
  const updated=replaceFunction(saved.source,'one',first,'def first(x):\n    # extra explanation\n    return x + 1',saved.ranges);
  const restored=functionRange(updated.source,'work.py','two','second',names,updated.ranges)!;
  expect(updated.source.slice(restored.start,restored.start+restored.length)).toBe('def second(x):\n    return first(x) * 2');
 });
 it('preserves empty and temporarily invalid edits after saving and reopening',()=>{
  const first=functionRange(source,'work.py','one','first',names)!;
  for(const code of ['', 'def fir']){
   const updated=replaceFunction(source,'one',first,code);
   const ranges=JSON.parse(JSON.stringify(updated.ranges));
   const restored=functionRange(updated.source,'work.py','one','first',names,ranges)!;
   expect(updated.source.slice(restored.start,restored.start+restored.length)).toBe(code);
   expect(updated.source).toContain('def second(x):\n    return first(x)');
  }
 });
 it('leaves other files ranges unchanged',()=>{
  const first=functionRange(source,'work.py','one','first',names)!;
  const updated=replaceFunction(source,'one',first,'pass',{chart:{file:'charts.py',start:0,length:10}});
  expect(updated.ranges.chart).toEqual({file:'charts.py',start:0,length:10});
 });
});

it('assembles every project from its milestone functions without altering the entry point',async()=>{
 const {projectsV2}=await import('../src/content/python/projects-v2');
 for(const project of projectsV2){
  const files={...project.starters};let ranges:import('../src/features/py/projects-v2/function-editing').FunctionRanges={};
  const known=Object.values(files).flatMap(text=>[...text.matchAll(/^def\s+(\w+)\s*\(/gm)].map(match=>match[1]));
  for(const step of project.milestones){
   const name=step.objective.match(/Implement (\w+)/)![1];
   const file=Object.keys(files).find(path=>project.starters[path].includes(`def ${name}(`))!;
   const sourceRange=functionRange(project.reference[file],file,step.id,name,known)!;
   const solution=project.reference[file].slice(sourceRange.start,sourceRange.start+sourceRange.length);
   const target=functionRange(files[file],file,step.id,name,known,ranges)!;
   expect(target).not.toBeNull();const updated=replaceFunction(files[file],step.id,target,solution,ranges);
   files[file]=updated.source;ranges=updated.ranges;
  }
  expect(files['main.py']).toBe(project.starters['main.py']);
  for(const [path,text] of Object.entries(files))if(path!=='main.py')expect(text).not.toContain('raise NotImplementedError');
 }
});
