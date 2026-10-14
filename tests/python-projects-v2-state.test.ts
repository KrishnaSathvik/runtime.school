import {describe,it,expect} from 'vitest';
import {freshDraft,readDraft,writeDraft,snapshot,canDeliver} from '../src/features/py/projects-v2/state';
import {zipFiles} from '../src/features/py/projects-v2/archive';
import type {ProjectV2} from '../src/content/python/projects-v2/model';
const p={ref:'python:project:customer-data-quality',revision:'2.0.0',starters:{'main.py':'pass','cleaning.py':'pass'},milestones:[{}],artifacts:['clean.json'],analytical:false} as ProjectV2;
describe('Python project revisions and evidence',()=>{
 it('keeps old revisions, code and unrelated projects when saving',()=>{const old=JSON.stringify({version:2,projects:{[p.ref]:{'1.0':{files:{'main.py':'old code'}}},other:{v:{files:{a:'keep'}}}}});const updated=writeDraft(old,p,freshDraft(p));expect(JSON.parse(updated).projects[p.ref]['1.0'].files['main.py']).toBe('old code');expect(JSON.parse(updated).projects.other).toEqual(JSON.parse(old).projects.other);expect(readDraft(updated,p).files).toEqual(p.starters);});
 it('does not accept a different revision or v1 storage as new completion',()=>{expect(readDraft(JSON.stringify({state:{items:{[p.ref]:{challenges:{a:{passes:1}}}}}}),p).evidence).toBeUndefined();});
 it('requires current passing evidence and complete captured artifacts',()=>{const d=freshDraft(p);d.evidence={snapshot:snapshot(d.files),passed:true,time:1,checks:[],artifacts:[{path:'clean.json',text:'[]'}]};expect(canDeliver(p,d)).toBe(true);d.files['cleaning.py']='changed';expect(canDeliver(p,d)).toBe(false);d.evidence.snapshot=snapshot(d.files);d.evidence.artifacts[0].truncated=true;expect(canDeliver(p,d)).toBe(false);});
 it('requires an interpretation only for analytical projects',()=>{const d=freshDraft(p);d.evidence={snapshot:snapshot(d.files),passed:true,time:1,checks:[],artifacts:[{path:'clean.json',text:'[]'}]};expect(canDeliver({...p,analytical:true},d)).toBe(false);d.interpretation='Evidence-backed interpretation. '.repeat(4);expect(canDeliver({...p,analytical:true},d)).toBe(true);});
 it('never overwrites malformed saved storage silently',()=>expect(()=>writeDraft('{broken',p,freshDraft(p))).toThrow());
 it('creates ZIP headers and rejects parent paths',()=>{const zip=zipFiles({'main.py':'print("hello")'});expect(new DataView(zip.buffer).getUint32(0,true)).toBe(0x04034b50);expect(()=>zipFiles({'../oops':'x'})).toThrow();});
});
