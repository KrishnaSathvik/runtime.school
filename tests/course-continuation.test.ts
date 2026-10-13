import {describe, expect, it} from "vitest";
import {courseContinuation, learnEntry, otherLessonInProgress} from "@/features/discovery/selectors";
import {useLearning, sessionKey, type LearningState} from "@/lib/learning-state";
import {courseOrder} from "@/content";
const fresh = (): LearningState => ({...useLearning.getState(), active:null, sessions:{}, stats:{}, history:[], placement:null});
describe("course-only Learn continuation", () => {
 it("starts a new learner directly in the first lesson", () => {
  expect(courseContinuation(fresh())).toMatchObject({id:courseOrder[0],href:"/learn/sql/meet-your-first-select",returning:false});
 });
 it("preserves the active course stage and challenge", () => {
  const s=fresh();s.active={id:3,project:null,stage:"practice",variant:1};
  expect(courseContinuation(s)).toMatchObject({id:3,stage:"practice",variant:1,returning:true});
 });
 it("keeps a course session when a project becomes active", () => {
  const s=fresh();s.active={id:45,project:0,stage:"practice",variant:0};s.sessions[sessionKey(3,null)]={stage:"review",variant:1};
  s.history=[{id:45,project:0,time:200,ok:false},{id:3,time:100,ok:false}];
  expect(courseContinuation(s)).toMatchObject({id:3,href:"/learn/sql/filter-with-where",stage:"review",variant:1});
 });
 it("does not turn practice-only activity into a course continuation", () => {
  const s=fresh();s.lastQuestion="shopper-contact-list";s.lastTrack="sql-from-zero";
  expect(courseContinuation(s)).toMatchObject({id:courseOrder[0],returning:false});
 });
 it("respects a completed placement recommendation", () => {
  const s=fresh();s.placement={done:true,index:6,answers:[{ok:true},{ok:false}]} as LearningState["placement"];
  expect(courseContinuation(s)).toMatchObject({id:3,returning:false});
 });
 it("does not offer a mastered lesson as unfinished", () => {
  const s=fresh();for(const id of courseOrder)s.stats[id]={attempts:2,correct:2,solved:[0,1],last:1,errors:0,check:true,legacy:false,masteredAt:1,categories:{},quizAttempts:1};
  s.active={id:0,project:null,stage:"complete",variant:1};
  expect(courseContinuation(s)).toBeNull();
 });
});

describe("Learn entry point", () => {
 it("starts at the first unfinished lesson even after a later lesson was opened from Practice", () => {
  const s=fresh();s.active={id:courseOrder[4],project:null,stage:"practice",variant:1};
  s.history=[{id:courseOrder[4],time:100,ok:false}];
  expect(learnEntry(s)).toMatchObject({id:courseOrder[0],href:"/learn/sql/meet-your-first-select"});
  expect(otherLessonInProgress(s)).toMatchObject({id:courseOrder[4]});
 });
 it("moves on once the first lesson is mastered and resumes its saved stage", () => {
  const s=fresh();s.stats[courseOrder[0]]={attempts:2,correct:2,solved:[0,1],last:1,errors:0,check:true,legacy:false,masteredAt:1,categories:{},quizAttempts:1};
  s.sessions[sessionKey(courseOrder[1],null)]={stage:"practice",variant:1};
  expect(learnEntry(s)).toMatchObject({id:courseOrder[1],returning:true,stage:"practice",variant:1});
  expect(otherLessonInProgress(s)).toBeNull();
 });
});
