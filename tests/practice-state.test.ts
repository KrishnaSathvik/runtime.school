import { beforeEach, describe, expect, it } from "vitest";
import { allQuestions, bankQuestions } from "@/content/question-bank";
import { migrateLearning, questionStatus, useLearning, validateImport } from "@/lib/learning-state";
import { statusOf } from "@/features/practice/status";
import { bankStarter } from "@/content/question-bank";

const store = () => useLearning.getState();
beforeEach(() => store().resetProgress());

describe("question-bank progress", () => {
  it("an unaided correct check is an independent solve and never touches lesson mastery", () => {
    store().recordQuestionCheck("qb-0001", false);
    expect(questionStatus(store().questions["qb-0001"])).toBe("attempted");
    store().recordQuestionCheck("qb-0001", true);
    const p = store().questions["qb-0001"];
    expect(p.solved).toBe(true);
    expect(p.attempts).toBe(2);
    expect(p.firstSolvedAt).toBeGreaterThan(0);
    expect(store().stats).toEqual({});
    expect(store().history).toEqual([]);
    expect(store().summary()).toMatchObject({mastery:0,independent:1});
  });

  it("hints or a revealed solution make the solve guided, not independent", () => {
    store().questionHint("qb-0002");
    store().recordQuestionCheck("qb-0002", true);
    expect(questionStatus(store().questions["qb-0002"])).toBe("guided");
    store().revealQuestion("qb-0003");
    store().recordQuestionCheck("qb-0003", true);
    expect(store().questions["qb-0003"].solved).toBe(false);
  });

  it("a fresh attempt clears guidance so an independent solve can follow; guided history remains", () => {
    store().revealQuestion("qb-0004");
    store().recordQuestionCheck("qb-0004", true);
    store().freshQuestionAttempt("qb-0004", "sql-qb-qb-0004", "SELECT \nFROM ");
    expect(store().questions["qb-0004"]).toMatchObject({ hints: 0, revealed: false, guidedSolved: true });
    expect(store().drafts["sql-qb-qb-0004"]).toBe("SELECT \nFROM ");
    store().recordQuestionCheck("qb-0004", true);
    expect(questionStatus(store().questions["qb-0004"])).toBe("solved");
  });

  it("survives export → import; malformed records are dropped; bad shapes are rejected", () => {
    store().recordQuestionCheck("qb-0010", true);
    store().openQuestion("items-never-ordered");
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().importProgress(exported);
    expect(store().questions["qb-0010"].solved).toBe(true);
    expect(store().lastQuestion).toBe("items-never-ordered");
    const d = migrateLearning({ version: 3, stats: {}, questions: { "qb-0001": { solved: true }, "evil": { solved: true }, "qb-0002": 5 } });
    expect(Object.keys(d.questions)).toEqual(["qb-0001"]);
    expect(() => validateImport({ version: 3, stats: {}, questions: [] })).toThrow("Invalid questions records.");
  });

  it("lesson challenge status in Practice comes from lesson progress", () => {
    const lc = allQuestions().find((q) => q.id === "lc-0-1")!;
    expect(statusOf(lc, store())).toBe("not-attempted");
    store().recordCheck({ lessonId: 0, variant: 1, project: null, ok: true, guided: false, query: "x" });
    expect(statusOf(lc, store())).toBe("solved");
    expect(statusOf(allQuestions().find((q) => q.id === "lc-0-0")!, store())).toBe("not-attempted");
  });
});

describe("bank starters", () => {
  it("never comment-only; warm-ups name the table; lab starts empty", () => {
    for (const q of bankQuestions) {
      const s = bankStarter(q);
      if (q.exerciseType === "debug") { expect(s.sql).toBe(q.starterSql); expect(s.cursor).toBe(0); }
      else if (q.mode === "lab") expect(s.sql).toBe("");
      else {
        expect(s.sql.startsWith("SELECT \nFROM")).toBe(true);
        expect(s.cursor).toBe(7);
        if (q.difficulty === "warmup") expect(s.sql).toBe(`SELECT \nFROM ${q.tables[0]};`);
        else expect(s.sql).toBe("SELECT \nFROM ");
      }
    }
  });
});
