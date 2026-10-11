/** Three-way merge of independent tab edits. Unchanged local fields retain remote writes.
 * Conflicting edits to the same draft use the latest writer; different drafts/progress survive.
 */
const object=(x:unknown):x is Record<string,unknown>=>!!x && typeof x==='object' && !Array.isArray(x);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function mergeStorageWrite(base:unknown,local:unknown,remote:unknown):unknown {
 if(same(local,base))return remote;
 if(same(remote,base))return local;
 if(object(local)&&object(remote)) {
  const before=object(base)?base:{};const out:Record<string,unknown>={};
  for(const key of new Set([...Object.keys(before),...Object.keys(local),...Object.keys(remote)])) {
   const value=mergeStorageWrite(before[key],local[key],remote[key]);
   if(value!==undefined)out[key]=value;
  }
  // Independent achievements cannot be downgraded by another tab's stale check.
  if('solved' in local && typeof local.solved==='boolean' && typeof remote.solved==='boolean') {
   out.attempts=Math.max(Number(local.attempts??0),Number(remote.attempts??0));
   out.lastAt=Math.max(Number(local.lastAt??0),Number(remote.lastAt??0));
   out.solved=local.solved||remote.solved;out.guidedSolved=!!local.guidedSolved||!!remote.guidedSolved;
   if(Number(remote.epoch??0)>Number(local.epoch??0)) {
    for(const key of ['epoch','hints','revealed','lastCheck'])out[key]=remote[key];
   } else if(Number(remote.epoch??0)===Number(local.epoch??0)) {
    out.hints=Math.max(Number(local.hints??0),Number(remote.hints??0));out.revealed=!!local.revealed||!!remote.revealed;
   }
   if(Array.isArray(local.checks)&&Array.isArray(remote.checks)) {
    out.checks=[...new Map([...remote.checks,...local.checks].map(x=>[JSON.stringify(x),x])).values()].sort((a,b)=>Number(a.time)-Number(b.time)).slice(-50);
   }
  }
  return out;
 }
 return local;
}
