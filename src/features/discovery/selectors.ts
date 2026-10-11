import {courseOrder, lessons, projects} from "@/content";
import {allQuestions, bankBySlug, bankQuestions, topicLabel} from "@/content/question-bank";
import {trackById} from "@/content/question-bank/tracks";
import {isMastered, isReviewDue, milestoneDone, placementStart, sessionKey, type LearningState, type Recommendation} from "@/lib/learning-state";
import {statusOf} from "@/features/practice/status";
import {resumeInTrack, trackHref} from "@/features/practice/tracks";
import {hrefFor} from "@/lib/routes";
export const practiceQuestions = [...new Map(allQuestions().filter(q=>q.practiceEligible).map(q=>[q.id,q])).values()];
export const mastered = (s:LearningState,id:number)=>!!s.stats[id]&&isMastered(s.stats[id]);
export function practiceProgress(s:LearningState) {return {solved:practiceQuestions.filter(q=>statusOf(q,s)==="solved").length,total:practiceQuestions.length};}
export function dueLessons(s:LearningState,now=Date.now()) {return lessons.filter(l=>mastered(s,l.id)&&isReviewDue(s.reviews[l.id],now)).sort((a,b)=>s.reviews[a.id].due-s.reviews[b.id].due);}
export function nextCourse(s:LearningState) {return courseOrder.find(id=>!mastered(s,id));}
export type Continuation = {href:string;title:string;kind:string;reason:string;at:number};
export function practiceContinuation(s:LearningState):Continuation|null {
 const t=s.lastTrack?trackById.get(s.lastTrack):undefined;
 const next=t?resumeInTrack(t,s,s.tracks[t.id]?.lastQuestionId):null;
 const q=s.lastQuestion?bankBySlug.get(s.lastQuestion):undefined;
 const qi=bankQuestions.findIndex(x=>x.id===q?.id);
 const candidate=q&&!s.questions[q.id]?.solved?q:q?[...bankQuestions.slice(qi+1),...bankQuestions.slice(0,qi)].find(x=>!s.questions[x.id]?.solved):undefined;
 if(t&&next&&(s.tracks[t.id]?.lastAt??0)>=s.lastQuestionAt) return {href:trackHref(next.q,t.id),title:t.title,kind:"Practice track",reason:next.q.title,at:s.tracks[t.id]?.lastAt??0};
 return candidate?{href:`/practice/${candidate.slug}`,title:candidate.title,kind:"Practice question",reason:"Continue with your saved SQL and progress.",at:s.lastQuestionAt}:null;
}
export function continuation(s:LearningState,rec:Recommendation):Continuation {
 const practice=practiceContinuation(s);const a=s.active;
 const activeValid=a&&lessons[a.id]&&(a.project===null?!mastered(s,a.id):projects.some(p=>p.id===a.project&&p.milestoneIds.includes(a.id))&&!milestoneDone(s.projects[a.project]?.milestones[a.id]));
 const inTrack=!!a&&a.project===null&&!!s.lastTrack&&s.tracks[s.lastTrack]?.lastQuestionId===`lc-${a.id}-${a.variant}`;
 if(practice&&(!activeValid||practice.at>s.lastLessonAt||inTrack))return practice;
 if(a&&activeValid)return {href:a.project===null?`/lesson/${a.id}`:`/projects/${a.project}/milestone/${a.id}`,title:lessons[a.id].title,kind:a.project===null?"Lesson":"Project milestone",reason:a.project===null?(a.stage==="practice"?`Practice · Challenge ${a.variant+1} of 2`:a.stage==="review"?"Concept check":"Reading the concept"):projects.find(p=>p.id===a.project)!.title,at:s.lastLessonAt};
 if(courseOrder.every(id=>mastered(s,id))&&rec.kind==="lesson")return {href:"/practice/questions",title:"Every lesson mastered",kind:"Practice",reason:"Keep your skills sharp with a new problem or project.",at:0};
 return {href:hrefFor(rec),title:lessons[rec.id].title,kind:rec.kind==="review"?"Review":rec.project!==null?"Project milestone":"Lesson",reason:rec.reason,at:0};
}
export function skillEvidence(s:LearningState) {
 const topics=new Map<string,{title:string;solved:number;attempted:number;last:number}>();
 for(const q of practiceQuestions){const status=statusOf(q,s);if(status==="not-attempted")continue;const item=topics.get(q.primaryTopic)??{title:topicLabel[q.primaryTopic],solved:0,attempted:0,last:0};item.attempted++;if(status==="solved")item.solved++;item.last=Math.max(item.last,q.sourceType==="bank"?s.questions[q.id]?.lastAt??0:s.stats[q.sourceLessonId!]?.last??0);topics.set(q.primaryTopic,item);}
 const revisit=lessons.filter(l=>{const events=s.history.filter(h=>h.id===l.id&&h.project==null).sort((a,b)=>a.time-b.time);const lastSuccess=Math.max(0,...events.filter(h=>h.ok&&!h.guided).map(h=>h.time));return !mastered(s,l.id)&&events.filter(h=>!h.ok&&h.time>lastSuccess).length>=2;});
 const practiceRevisit=bankQuestions.filter(q=>{const p=s.questions[q.id];if(!p||p.solved)return false;const events=p.checks??[];const lastSuccess=Math.max(0,...events.filter(e=>e.ok&&!e.guided).map(e=>e.time));return events.filter(e=>!e.ok&&e.time>lastSuccess).length>=2;}).slice(0,5);
 return {topics:[...topics.values()].sort((a,b)=>b.last-a.last).slice(0,3),revisit:revisit.slice(0,5),practiceRevisit};
}

/** Course-only continuation; the workspace restores its existing stage and variant. */
export function courseContinuation(s: LearningState) {
 const unfinished = (id: number) => courseOrder.includes(id) && !mastered(s, id);
 const active = s.active?.project === null && unfinished(s.active.id) ? s.active.id : undefined;
 const recent = [...s.history].filter(h => h.project == null && unfinished(h.id)).sort((a,b) => b.time-a.time)[0]?.id;
 const saved = courseOrder.filter(id => unfinished(id) && s.sessions[sessionKey(id,null)]).sort((a,b) => (s.stats[b]?.last ?? 0)-(s.stats[a]?.last ?? 0))[0];
 const started = courseOrder.some(id => s.sessions[sessionKey(id,null)] || s.stats[id]?.attempts || mastered(s,id));
 const placed = !started ? placementStart(s.placement) : null;
 const id = active ?? recent ?? saved ?? (placed !== null && unfinished(placed) ? placed : nextCourse(s));
 if (id === undefined) return null;
 const session = active === id ? s.active : s.sessions[sessionKey(id,null)];
 return {id, href:`/lesson/${id}`, returning:started || active !== undefined, stage:session?.stage ?? "understand", variant:session?.variant ?? 0};
}
