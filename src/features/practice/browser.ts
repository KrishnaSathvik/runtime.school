import {courseOrder} from "@/content";
import {bankById,bankBySlug,bankQuestions,DIFFICULTIES,familyOf,practiceDatasets,topicFamilies,topicLabel,type QuestionRecord} from "@/content/question-bank";
import type {LearningState} from "@/lib/learning-state";
import {practiceQuestions} from "@/features/discovery/selectors";
import {statusOf} from "./status";
export const PAGE_SIZE=25;
export const FILTER_KEYS=["q","difficulty","topic","type","dataset","status","source","sort","page"] as const;
/** Default Practice browser inventory: full practice-eligible set (bank + From Learn). */
export const DEFAULT_SOURCE="all" as const;

function practiceFinished(s: Pick<LearningState, "questions">, id: string): boolean {
  const progress = s.questions[id];
  return Boolean(progress?.solved || progress?.guidedSolved);
}

/** Slug for the practice hub continue link — resume, else the next question not yet solved. */
export function practiceEntrySlug(
  s: Pick<LearningState, "lastQuestion" | "questions">,
): string {
  const current = s.lastQuestion ? bankBySlug.get(s.lastQuestion) : undefined;
  if (current && !practiceFinished(s, current.id)) return current.slug;
  if (current) {
    const i = bankQuestions.findIndex((q) => q.id === current.id);
    const next = [...bankQuestions.slice(i + 1), ...bankQuestions.slice(0, i)].find(
      (q) => !practiceFinished(s, q.id),
    );
    if (next) return next.slug;
  }
  const unsolved = bankQuestions.find((q) => !practiceFinished(s, q.id));
  return (unsolved ?? bankQuestions[0]).slug;
}
export function browserParams(input:URLSearchParams){
 const p=new URLSearchParams();const choices:Record<string,readonly string[]>={difficulty:DIFFICULTIES,type:["write","predict","debug"],dataset:Object.keys(practiceDatasets),status:["unsolved","not-attempted","attempted","guided","solved"],source:["new","lessons","all"],sort:["difficulty","recent"],topic:topicFamilies.flatMap(f=>[f.id,...f.topics.map(t=>t.id)])};
 for(const key of FILTER_KEYS){const v=input.get(key);if(!v)continue;if(key==="q"){if(v.trim())p.set(key,v.trim().slice(0,200));}else if(key==="page"){if(/^\d+$/.test(v)&&Number(v)>1&&Number.isSafeInteger(Number(v)))p.set(key,String(Number(v)));}else if(choices[key]?.includes(v))p.set(key,v);}
 return p;
}
export function browserUrl(params:URLSearchParams){const q=browserParams(params).toString();return `/practice/questions${q?`?${q}`:""}`;}
export function safeBrowserReturn(raw:string|null){if(!raw)return "/practice/questions";try{const u=new URL(raw,"http://sql.local");if(!raw.startsWith("/")||raw.startsWith("//")||u.origin!=="http://sql.local"||!["/practice","/practice/questions"].includes(u.pathname))return "/practice/questions";return browserUrl(u.searchParams);}catch{return "/practice/questions";}}
export function questionLink(q:QuestionRecord,back:string){return `${q.href}${q.href.includes("?")?"&":"?"}return=${encodeURIComponent(safeBrowserReturn(back))}`;}
export function filteredQuestions(params:URLSearchParams,s:LearningState){const p=browserParams(params);const needle=(p.get("q")??"").toLowerCase();const topic=p.get("topic");const status=p.get("status");const source=p.get("source")??DEFAULT_SOURCE;
 const bankPosition=(q:QuestionRecord)=>Math.max(-1,...(bankById.get(q.id)?.prerequisites??[]).map(id=>courseOrder.indexOf(id)))+0.5+DIFFICULTIES.indexOf(q.difficulty)*0.01;
 const lessonPosition=(q:QuestionRecord)=>courseOrder.indexOf(q.sourceLessonId!)+q.sourceVariant!*0.01;
 // Independent problems sort ahead of From Learn reviews when both are visible.
 const position=(q:QuestionRecord)=>q.sourceType==="bank"?bankPosition(q):1000+lessonPosition(q);
 const last=(q:QuestionRecord)=>q.sourceType==="bank"?s.questions[q.id]?.lastAt??0:s.stats[q.sourceLessonId!]?.last??0;
 return practiceQuestions.filter(q=>{
 if(p.has("type")&&(q.exerciseType??"write")!==p.get("type"))return false;
 if(p.has("difficulty")&&q.difficulty!==p.get("difficulty"))return false;
 if(topic&&(topic.includes(".")?q.primaryTopic!==topic&&!q.topicTags.includes(topic):familyOf(q.primaryTopic)!==topic))return false;
 if(p.has("dataset")&&q.datasetId!==p.get("dataset"))return false;
 if(source==="new"&&q.sourceType!=="bank")return false;
 if(source==="lessons"&&q.sourceType==="bank")return false;
 if(status&&(status==="unsolved"?statusOf(q,s)==="solved":statusOf(q,s)!==status))return false;
 return !needle||`${q.title} ${q.prompt} ${topicLabel[q.primaryTopic]}`.toLowerCase().includes(needle);
 }).sort((a,b)=>(p.get("sort")==="difficulty"?DIFFICULTIES.indexOf(a.difficulty)-DIFFICULTIES.indexOf(b.difficulty):p.get("sort")==="recent"?last(b)-last(a):position(a)-position(b))||a.id.localeCompare(b.id));
}
export function questionPage(params:URLSearchParams,s:LearningState){const rows=filteredQuestions(params,s);const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));const page=Math.min(pages,Number(browserParams(params).get("page")??1));return {rows,page,pages,visible:rows.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)};}
