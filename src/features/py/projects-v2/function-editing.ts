export type FunctionRange={file:string;start:number;length:number};
export type FunctionRanges=Record<string,FunctionRange>;
export function functionRange(source:string,file:string,id:string,name:string,knownNames:string[],ranges:FunctionRanges={}):FunctionRange|null {
 const saved=ranges[id];
 if(saved?.file===file&&Number.isInteger(saved.start)&&Number.isInteger(saved.length)&&saved.start>=0&&saved.length>=0&&saved.start+saved.length<=source.length)return saved;
 const definitions=[...source.matchAll(/^def\s+(\w+)\s*\(/gm)];
 const current=definitions.find(match=>match[1]===name);
 if(!current)return null;
 const start=current.index!;
 const next=definitions.find(match=>match.index!>start&&knownNames.includes(match[1]));
 const code=source.slice(start,next?.index??source.length).trimEnd();
 return {file,start,length:code.length};
}
export function replaceFunction(source:string,id:string,range:FunctionRange,code:string,ranges:FunctionRanges={}){
 const delta=code.length-range.length;
 const updated:FunctionRanges={};
 for(const [key,value] of Object.entries(ranges))updated[key]=value.file===range.file&&value.start>=range.start+range.length&&key!==id?{...value,start:value.start+delta}:value;
 updated[id]={...range,length:code.length};
 return {source:source.slice(0,range.start)+code+source.slice(range.start+range.length),ranges:updated};
}
