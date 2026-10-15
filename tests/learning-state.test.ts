import { beforeEach, describe, expect, it } from "vitest";
import {
  isMastered,
  migrateLearning,
  useLearning,
  validateImport,
} from "@/lib/learning-state";
import { lessons } from "@/content";

const store = () => useLearning.getState();
const check = (lessonId: number, variant: number, ok: boolean, guided = false, project: number | null = null) =>
  store().recordCheck({ lessonId, variant, project, ok, guided, query: "SELECT 1", result: { columns: ["a"], values: [[1]] } });

beforeEach(() => {
  store().resetProgress();
});

describe("independent vs guided mastery", () => {
  it("guided solves never count toward mastery", () => {
    check(0, 0, true, true);
    check(0, 1, true, true);
    expect(store().stats[0].solved).toEqual([]);
    expect(store().stats[0].correct).toBe(2);
  });

  it("mastery needs two independent solves AND the concept check", () => {
    check(0, 0, true);
    check(0, 1, true);
    expect(isMastered(store().stats[0])).toBe(false);
    const r = store().completeQuiz(0, null, lessons[0].quiz.correct);
    expect(r).toEqual({ ok: true, complete: true });
    expect(isMastered(store().stats[0])).toBe(true);
    expect(store().reviews[0]?.due).toBeGreaterThan(Date.now());
  });

  it("passing the quiz first does NOT report completion (former false-mastery bug)", () => {
    const r = store().completeQuiz(1, null, lessons[1].quiz.correct);
    expect(r).toEqual({ ok: true, complete: false });
    expect(isMastered(store().stats[1])).toBe(false);
    // Mastery is scheduled when the last challenge is later solved.
    check(1, 0, true);
    check(1, 1, true);
    expect(isMastered(store().stats[1])).toBe(true);
    expect(store().stats[1].masteredAt).toBeGreaterThan(0);
    expect(store().reviews[1]).toBeTruthy();
  });

  it("wrong quiz answer records an error and does not complete", () => {
    const wrong = (lessons[0].quiz.correct + 1) % lessons[0].quiz.options.length;
    expect(store().completeQuiz(0, null, wrong)).toEqual({ ok: false, complete: false });
    expect(store().stats[0].errors).toBe(1);
  });

  it("a success resets the error streak and failures are categorised (original parity)", () => {
    store().recordCheck({ lessonId: 3, variant: 0, project: null, ok: false, guided: false, query: "x", category: "Row count" });
    store().recordCheck({ lessonId: 3, variant: 0, project: null, ok: false, guided: false, query: "x", category: "Row count" });
    expect(store().stats[3].errors).toBe(2);
    expect(store().stats[3].categories).toEqual({ "Row count": 2 });
    // Original rule: struggle on a lesson first sends you to its unmastered prerequisite.
    expect(store().recommendation()).toMatchObject({
      id: lessons[3].prereq[0],
      reason: "Review a related lesson to help with the problem you’re working on.",
    });
    check(3, 0, true);
    expect(store().stats[3].errors).toBe(0);
  });

  it("fresh attempt clears guidance so the challenge can be earned independently", () => {
    const key = "lesson:2:0";
    store().markGuided(key, "hint");
    expect(store().attempts[key].guided).toBe(true);
    store().freshAttempt(key, "sql-lesson-2-0", "-- start");
    const a = store().attempts[key];
    expect(a.guided).toBe(false);
    expect(a.hints).toBe(0);
    expect(a.epoch).toBe(1);
    expect(a.exposures).toHaveLength(1); // history retained
    expect(store().drafts["sql-lesson-2-0"]).toBe("-- start");
  });
});

describe("returning-user state", () => {
  it("persists stage and variant per activity", () => {
    store().setSession(5, null, "review", 1);
    expect(store().active).toEqual({ id: 5, variant: 1, stage: "review", project: null });
    expect(store().sessions["activity:null:5"]).toEqual({ stage: "review", variant: 1 });
  });

  it("export → import round-trips drafts, attempts, sessions and theme", () => {
    store().setDraft("sql-lesson-4-1", "SELECT name FROM customers");
    store().markGuided("lesson:4:1", "hint");
    store().setSession(4, null, "practice", 1);
    store().setTheme("dark");
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().setTheme("light");
    store().importProgress(exported);
    const s = store();
    expect(s.drafts["sql-lesson-4-1"]).toBe("SELECT name FROM customers");
    expect(s.attempts["lesson:4:1"].guided).toBe(true);
    expect(s.active).toEqual({ id: 4, variant: 1, stage: "practice", project: null });
    expect(s.preferences.theme).toBe("dark");
  });
});

describe("progress import compatibility", () => {
  it("V1 files keep mastery via the legacy flag and gain a review schedule", () => {
    const v1 = { id: 45, stats: { 45: { attempts: 4, correct: 2, solved: [0, 1], last: 1700000000000 }, 0: { attempts: 1, solved: [0] } } };
    store().importProgress(v1);
    const s = store();
    expect(s.stats[45].legacy).toBe(true);
    expect(isMastered(s.stats[45])).toBe(true);
    expect(isMastered(s.stats[0])).toBe(false);
    expect(s.reviews[45]).toBeTruthy();
    expect(s.active?.id).toBe(45);
  });

  it("V2 files without concept checks are NOT treated as mastered", () => {
    store().importProgress({ version: 2, stats: { 0: { solved: [0, 1], check: false } } });
    expect(isMastered(store().stats[0])).toBe(false);
  });

  it("drops unknown lessons, invalid variants and duplicate solves", () => {
    const d = migrateLearning({ version: 2, stats: { 0: { solved: [0, 0, 1, 7, "x"] }, 999: { solved: [0, 1] }, foo: 3 } });
    expect(Object.keys(d.stats)).toEqual(["0"]);
    expect(d.stats[0].solved).toEqual([0, 1]);
  });

  it.each([
    [null, "not a Runtime progress file"],
    ["text", "not a Runtime progress file"],
    [[], "not a Runtime progress file"],
    [{ version: 9, stats: {} }, "Unsupported progress version"],
    [{ version: 3 }, "not a Runtime progress file"],
    [{ version: 3, stats: [] }, "not a Runtime progress file"],
    [{ version: 3, stats: {}, drafts: [] }, "Invalid drafts records"],
    [{ version: 3, stats: {}, drafts: { a: 5 } }, "Invalid SQL drafts"],
    [{ version: 3, stats: {}, attempts: { a: {} } }, "Invalid guidance history"],
    [{ version: 3, stats: {}, reviews: { 0: { due: "soon" } } }, "Invalid review schedule"],
  ])("rejects malformed import %#", (input, message) => {
    expect(() => validateImport(input)).toThrow(message as string);
  });

  it("a rejected import leaves existing progress untouched", () => {
    check(0, 0, true);
    expect(() => store().importProgress({ version: 3, stats: {}, drafts: { a: 5 } })).toThrow();
    expect(store().stats[0].solved).toEqual([0]);
  });

  it("corrupt saved state is normalised instead of crashing", () => {
    const d = migrateLearning({ version: 3, stats: { 0: null }, active: { id: 999, stage: "x" }, projects: "bad" });
    expect(d.stats).toEqual({});
    expect(d.active).toBeNull();
  });
});

