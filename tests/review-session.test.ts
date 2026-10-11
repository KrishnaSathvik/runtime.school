import { beforeEach, describe, expect, it } from "vitest";
import { lessons } from "@/content";
import { migrateLearning, reviewCycle, useLearning } from "@/lib/learning-state";

beforeEach(() => {
  useLearning.getState().resetProgress();
  for (const variant of [0, 1]) useLearning.getState().recordCheck({lessonId:0,variant,project:null,ok:true,guided:false,query:"SELECT 1"});
  useLearning.getState().completeQuiz(0,null,lessons[0].quiz.correct);
  useLearning.setState({reviews:{0:{level:0,due:Date.now()-1000,history:[]}}});
});
const roundTrip = () => useLearning.setState(migrateLearning(JSON.parse(JSON.stringify(useLearning.getState().exportProgress()))));
describe("interrupted review sessions", () => {
  it("restores recall selection, write stage, variant, failed checks, assistance and SQL without rescheduling", () => {
    const s=useLearning.getState(),session=s.beginReview(0),review=s.reviews[0];
    const key=`sql-review-0-${session.variant}-${session.cycle}`;
    s.updateReviewSession(0,session.cycle,{choice:lessons[0].quiz.correct,stage:"write",attempts:2,lastFeedback:"Expected 2 columns",confirmReveal:true});
    s.setDraft(key,"SELECT name FROM customers");roundTrip();
    const restored=useLearning.getState().beginReview(0);
    expect(restored).toMatchObject({version:1,stage:"write",choice:lessons[0].quiz.correct,variant:0,attempts:2,confirmReveal:true});
    expect(useLearning.getState().drafts[key]).toBe("SELECT name FROM customers");
    expect(useLearning.getState().reviews[0]).toEqual(review);
  });
  it("completion is atomic, survives reload and refuses duplicate or obsolete credit", () => {
    const s=useLearning.getState(),session=s.beginReview(0);
    s.updateReviewSession(0,session.cycle,{choice:lessons[0].quiz.correct,stage:"write"});
    expect(s.completeReview(0,{quiz:true,sql:true},session.cycle)?.level).toBe(1);
    roundTrip();expect(useLearning.getState().beginReview(0).stage).toBe("done");
    expect(useLearning.getState().completeReview(0,{quiz:true,sql:true},session.cycle)).toBeNull();
    expect(useLearning.getState().reviews[0].history).toHaveLength(1);
    expect(useLearning.getState().stats[0].solved).toEqual([0,1]);
  });
  it("a new due cycle discards obsolete sessions and uses a different draft identity", () => {
    const s=useLearning.getState(),first=s.beginReview(0);
    s.updateReviewSession(0,first.cycle,{choice:0,stage:"write"});
    s.setDraft(`sql-review-0-0-${first.cycle}`,"old draft");
    s.completeReview(0,{quiz:true,sql:true},first.cycle);
    const r=useLearning.getState().reviews[0];
    useLearning.setState({reviews:{0:{...r,due:Date.now()-1000}}});roundTrip();
    const next=useLearning.getState().beginReview(0);
    expect(next).toMatchObject({stage:"recall",choice:null,attempts:0,variant:1});
    expect(next.cycle).not.toBe(first.cycle);
    expect(useLearning.getState().drafts[`sql-review-0-1-${next.cycle}`]).toBeUndefined();
  });
  it("reveal records a miss once; an early review preserves its due date", () => {
    const s=useLearning.getState(),first=s.beginReview(0);
    s.updateReviewSession(0,first.cycle,{choice:0,stage:"write"});
    s.completeReview(0,{quiz:false,sql:false},first.cycle,true);roundTrip();
    expect(useLearning.getState().beginReview(0)).toMatchObject({stage:"done",revealed:true,completion:{ok:false}});
    const due=Date.now()+86400000;useLearning.setState({reviewSessions:{},reviews:{0:{level:2,due,history:[]}}});
    const early=useLearning.getState().beginReview(0);s.updateReviewSession(0,early.cycle,{choice:0,stage:"write"});
    expect(s.completeReview(0,{quiz:true,sql:true},early.cycle)?.due).toBe(due);
    expect(useLearning.getState().reviews[0].history[0].early).toBe(true);
  });
  it("normalizes malformed, unsupported and mismatched sessions without losing valid progress", () => {
    const s=useLearning.getState(),session=s.beginReview(0),exported=s.exportProgress();
    for(const bad of [{...session,version:99},{...session,variant:8},{...session,stage:"write",choice:99},{...session,cycle:"obsolete"},{...session,stage:"done",completion:{ok:true}}]){
      const imported=migrateLearning({...exported,reviewSessions:{0:bad}});
      expect(imported.reviewSessions).toEqual({});expect(imported.stats[0].solved).toEqual([0,1]);
    }
    expect(reviewCycle(exported.reviews[0])).toBe(session.cycle);
  });
});
