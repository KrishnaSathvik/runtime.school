import {courseOrder, lessons} from "@/content";
import {allQuestions, bankBySlug, bankQuestions, topicLabel} from "@/content/question-bank";
import {isMastered, isReviewDue, placementStart, sessionKey, type LearningState, type Recommendation} from "@/lib/learning-state";
import {statusOf} from "@/features/practice/status";
import {hrefFor} from "@/lib/routes";
import {sqlLessonHref} from "@/platform/sql-lesson-href";
export const practiceQuestions = [...new Map(allQuestions().filter(q=>q.practiceEligible).map(q=>[q.id,q])).values()];
export const mastered = (s:LearningState,id:number)=>!!s.stats[id]&&isMastered(s.stats[id]);

/** Opening a lesson writes a session before any graded attempt. That is already in progress. */
export function lessonTouched(s: Pick<LearningState, "stats" | "sessions" | "active">, id: number) {
  const record = s.stats[id];
  return (record?.attempts ?? 0) > 0
    || (record?.solved.length ?? 0) > 0
    || (record?.quizAttempts ?? 0) > 0
    || !!s.sessions[sessionKey(id, null)]
    || (s.active?.project === null && s.active.id === id);
}

export function moduleStatusLabel(
  s: Pick<LearningState, "stats" | "sessions" | "active">,
  ids: number[],
): "Mastered" | "In progress" | "Not started" {
  const done = ids.filter((id) => s.stats[id] && isMastered(s.stats[id])).length;
  if (ids.length > 0 && done === ids.length) return "Mastered";
  if (done > 0 || ids.some((id) => lessonTouched(s, id))) return "In progress";
  return "Not started";
}
export function practiceProgress(s:LearningState) {return {solved:practiceQuestions.filter(q=>statusOf(q,s)==="solved").length,total:practiceQuestions.length};}
export function dueLessons(s:LearningState,now=Date.now()) {return lessons.filter(l=>mastered(s,l.id)&&isReviewDue(s.reviews[l.id],now)).sort((a,b)=>s.reviews[a.id].due-s.reviews[b.id].due);}
export function nextCourse(s:LearningState) {return courseOrder.find(id=>!mastered(s,id));}
export type Continuation = {href:string;title:string;kind:string;reason:string;at:number};
export function practiceContinuation(s:LearningState):Continuation|null {
 const q=s.lastQuestion?bankBySlug.get(s.lastQuestion):undefined;
 const qi=bankQuestions.findIndex(x=>x.id===q?.id);
 const open=(id:string)=>{const p=s.questions[id];return !p?.solved&&!p?.guidedSolved;};
 const candidate=q&&open(q.id)?q:q?[...bankQuestions.slice(qi+1),...bankQuestions.slice(0,qi)].find(x=>open(x.id)):undefined;
 return candidate?{href:`/sql/practice/${candidate.slug}`,title:candidate.title,kind:"Practice question",reason:"Continue with your saved SQL and progress.",at:s.lastQuestionAt}:null;
}
export function continuation(s:LearningState,rec:Recommendation):Continuation {
 const practice=practiceContinuation(s);const a=s.active;
 const activeValid=a&&lessons[a.id]&&a.project===null&&!mastered(s,a.id);
 if(practice&&(!activeValid||practice.at>s.lastLessonAt))return practice;
 if(a&&activeValid)return {href:sqlLessonHref(a.id),title:lessons[a.id].title,kind:"Lesson",reason:a.stage==="practice"?`Practice · Challenge ${a.variant+1} of 2`:a.stage==="review"?"Concept check":"Reading the concept",at:s.lastLessonAt};
 if(courseOrder.every(id=>mastered(s,id))&&rec.kind==="lesson")return {href:"/sql/practice",title:"Every lesson mastered",kind:"Practice",reason:"Keep your skills sharp with a new problem or project.",at:0};
 return {href:hrefFor(rec),title:lessons[rec.id].title,kind:rec.kind==="review"?"Review":"Lesson",reason:rec.reason,at:0};
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
 const placed = !started ? placementStart(s.placement, {joinMastered: mastered(s, 14)}) : null;
 const id = active ?? recent ?? saved ?? (placed !== null && unfinished(placed) ? placed : nextCourse(s));
 if (id === undefined) return null;
 const session = active === id ? s.active : s.sessions[sessionKey(id,null)];
 return {id, href:sqlLessonHref(id), returning:started || active !== undefined, stage:session?.stage ?? "understand", variant:session?.variant ?? 0};
}

/**
 * Where Learn starts: the first unfinished lesson in course order (or the placement result before
 * anything is started). Unlike courseContinuation, opening a lesson challenge from Practice does not
 * move it, so Learn never skips ahead to a lesson you only visited.
 */
export function learnEntry(s: LearningState) {
 const started = courseOrder.some(id => s.sessions[sessionKey(id,null)] || s.stats[id]?.attempts || mastered(s,id));
 const placed = !started ? placementStart(s.placement, {joinMastered: mastered(s, 14)}) : null;
 const id = placed !== null && !mastered(s, placed) ? placed : nextCourse(s);
 if (id === undefined) return null;
 const session = s.sessions[sessionKey(id,null)];
 const touched = !!session || !!s.stats[id]?.attempts;
 return {id, href:sqlLessonHref(id), returning:touched, stage:session?.stage ?? "understand", variant:session?.variant ?? 0};
}

/** A different unfinished lesson the learner was last working in, shown beside learnEntry. */
export function otherLessonInProgress(s: LearningState) {
 const entry = learnEntry(s);
 const recent = courseContinuation(s);
 const worked = (id: number) => !!s.stats[id]?.attempts || !!s.sessions[sessionKey(id,null)] || s.history.some(h => h.id === id && h.project == null);
 return recent && recent.returning && recent.id !== entry?.id && worked(recent.id) ? recent : null;
}
