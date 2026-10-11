import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { lessons, projects } from "@/content";
import { bankCheckRequest, bankQuestions, practiceDatasets } from "@/content/question-bank";
import { formatSql } from "@/components/editor/format-sql";
import { teachingDemos } from "@/features/teaching/demos";
import { lessonNextSteps } from "@/features/lesson/next-steps";
import { reviewReason, reviewWhen } from "@/lib/review-copy";
import { useLearning } from "@/lib/learning-state";
import { bootWorker } from "./helpers/original";
let send: Awaited<ReturnType<typeof bootWorker>>;
beforeAll(async () => { send = await bootWorker(); });
beforeEach(() => useLearning.getState().resetProgress());
const master = (id: number) => {
  for (const variant of [0,1]) useLearning.getState().recordCheck({ lessonId: id, variant, project: null, ok: true, guided: false, query: "x" });
  useLearning.getState().completeQuiz(id, null, lessons[id].quiz.correct);
};

describe("SQL formatting preserves executable behavior", () => {
  it("preserves literals, comments, blobs, quoted identifiers and comment boundaries", async () => {
    const query = `-- select from\nSELECT 'a  b'' from' AS "with space", X'ABCD' AS bytes, 1 /* from */ + 2 AS n; -- keep this\nSELECT ' WHERE  ' AS [from], 2 AS n;`;
    const formatted = formatSql(query);
    expect(formatted).toContain("'a  b'' from'");
    expect(formatted).toContain("' WHERE  '");
    expect(formatted).toContain("-- keep this\nSELECT");
    const before = await send({seed:"", query, allowWrites:true});
    const after = await send({seed:"", query:formatted, allowWrites:true});
    expect(after.error).toBeUndefined();
    expect(after.result).toEqual(before.result);
    expect(formatSql(formatted)).toBe(formatted);
  });
  it.each(bankQuestions)("formatted $id solution passes actual grading", async (q) => {
    const result = await send(bankCheckRequest(q, formatSql(q.solution)));
    expect(result.error).toBeUndefined();
    expect(result.grade?.ok, result.grade?.message).toBe(true);
  });
});

describe("interactive teaching", () => {
  const expected: Record<string, number[]> = { join:[3,4,3,1,1], group:[1,2,2,1,2], window:[4,4,4,4,4,4] };
  for (const [kind, demo] of Object.entries(teachingDemos)) {
    it.each(demo.choices.map((choice, i) => ({...choice, count:expected[kind][i]})))(`${kind}: $label produces the explained result`, async ({sql, count}) => {
      const r = await send({seed:"", query:sql});
      expect(r.error).toBeUndefined();
      expect(r.result.values).toHaveLength(count);
      if (kind === "join" && count === 4) expect(r.result.values.at(-1)).toEqual(["Cy",null,null]);
      if (kind === "group" && count === 1) expect(r.result.values[0].at(-1)).toBe(sql.includes("HAVING") ? 60 : 110);
      if (sql.includes("dense_rank")) expect(r.result.values.map((row: unknown[])=>row.slice(2))).toEqual([[1,1,1],[2,1,1],[3,3,2],[4,4,3]]);
      if (sql.includes("running_total")) expect(r.result.values.map((row: unknown[])=>row.at(-1))).toEqual([20,60,100,110]);
    });
  }
});

it("placement retake clears only placement drafts and grants no mastery", () => {
  const s = useLearning.getState();
  s.setDraft("sql-placement-0", "SELECT name FROM customers");
  s.setDraft("sql-lesson-0-0", "SELECT id FROM customers");
  s.restartPlacement();
  expect(useLearning.getState().drafts["sql-placement-0"]).toBeUndefined();
  expect(useLearning.getState().drafts["sql-lesson-0-0"]).toBeDefined();
  expect(useLearning.getState().stats).toEqual({});
});

it("lesson recommendations require prerequisites, skip solved work and link existing tracks", () => {
  master(0);
  let s = useLearning.getState();
  const next = lessonNextSteps(0,s);
  expect(next.practice.length).toBeGreaterThan(0);
  expect(next.track?.id).toBe("sql-from-zero");
  expect(next.practice.every(q=>q.prerequisites.every(id=>!!s.stats[id]?.check))).toBe(true);
  s.recordQuestionCheck(next.practice[0].id,true);
  s = useLearning.getState();
  expect(lessonNextSteps(0,s).practice.some(q=>q.id===next.practice[0].id)).toBe(false);
});

it("project recommendations only appear after opening prerequisites are mastered", () => {
  for (const p of projects) {
    const ids = [...new Set(p.milestoneIds.slice(0,2).flatMap(id=>lessons[id].prereq))];
    if (!ids.length) continue;
    useLearning.getState().resetProgress();
    expect(lessonNextSteps(ids.at(-1)!,useLearning.getState()).project).toBeUndefined();
    ids.forEach(master);
    const next = lessonNextSteps(ids.at(-1)!,useLearning.getState());
    expect(next.project).toBeDefined();
  }
});

it("review copy explains outcomes, ignores early practice and avoids false tomorrow labels", () => {
  const review = {level:1,due:100,history:[{time:0,ok:true,quiz:true,sql:true},{time:1,ok:false,quiz:false,sql:false,early:true}]};
  expect(reviewReason(review)).toContain("3 days");
  expect(reviewReason({...review,history:[{time:1,ok:false,quiz:false,sql:false}]})).toContain("needed another try");
  expect(reviewWhen(100,100)).toBe("Ready to review");
  expect(reviewWhen(100+3600000,100)).not.toContain("tomorrow");
});

it("keeps the original nine datasets alongside the V4 fixtures", () => expect(Object.keys(practiceDatasets).filter(id=>!["reasoning","capacity"].includes(id))).toHaveLength(9));
