import { describe, expect, it } from "vitest";
import { statusText, questionStatusText } from "@/features/practice/status";
import { allQuestions } from "@/content/question-bank";
import { useLearning } from "@/lib/learning-state";
import { checkLabel, importFailureMessage } from "@/lib/feedback-copy";
import { learnerExplanation } from "@/lib/content-copy";
import { explainError, explainGrade } from "@/engine/explain";

describe("learner-facing progress descriptions", () => {
  it("does not call help exposure a completed problem", () => {
    expect(statusText("guided", false)).toBe("Practicing with help");
    expect(statusText("guided", true)).toBe("Solved with help");
    expect(statusText("solved", true)).toBe("Solved without hints");
  });
  it("uses saved evidence for both bank and lesson question labels", () => {
    useLearning.getState().resetProgress();
    const q = allQuestions().find(q => q.id === "qb-0072")!;
    useLearning.getState().questionHint(q.id);
    expect(questionStatusText(q, useLearning.getState())).toBe("Practicing with help");
    useLearning.getState().recordQuestionCheck(q.id, true);
    expect(questionStatusText(q, useLearning.getState())).toBe("Solved with help");
    expect(useLearning.getState().questions[q.id].solved).toBe(false);
    const lesson = allQuestions().find(q => q.id === "lc-0-0")!;
    useLearning.getState().recordCheck({lessonId:0,variant:0,project:null,ok:true,guided:true,query:"SELECT 1"});
    expect(questionStatusText(lesson, useLearning.getState())).toBe("Solved with help");
    expect(useLearning.getState().stats[0].solved).toEqual([]);
  });
});

describe("plain feedback with precise diagnostics", () => {
  it("distinguishes a correct result from an unmet index requirement", () => {
    const technical = "The output is correct, but this task requires covering-search using the index for lookup. Observed plan: SCAN events";
    const e = explainGrade({message:technical,planFailed:true,variationFailed:true,query:"SELECT 1"});
    expect(e.title).toContain("result is correct");
    expect(e.detail).toContain("different sample data");
    expect(e.detail).toContain("query plan");
    expect(e.detail).not.toMatch(/fixture|access strategy/);
    expect(e.technical).toBe(technical);
  });
  it("does not claim that every changed-data failure is hardcoding", () => {
    const e = explainGrade({message:"changed-data check failed",query:"SELECT 1"});
    expect(e.detail).toContain("may");
    expect(e.detail).toContain("ties");
  });
  it("keeps unknown database errors intact without inventing a cause", () => {
    const e=explainError("unexpected engine detail", "SELECT 1");
    expect(e.title).toBe("Your SQL couldn't run");
    expect(e.technical).toBe("unexpected engine detail");
  });
  it("describes a timeout without assuming the database had finished starting", () => {
    expect(explainError("Query timed out", "SELECT 1").detail).toContain("stopped waiting");
  });
  it("explains each index strategy while leaving other check labels intact", () => {
    expect(checkLabel("Required index: internal-id")).toBe("Required index");
    expect(checkLabel("Access strategy: search")).toBe("Find matching rows with an index");
    expect(checkLabel("Access strategy: covering-search")).toBe("Read matching rows directly from the index");
    expect(checkLabel("Access strategy: index-scan")).toBe("Read rows in index order");
    expect(checkLabel("Avoid temporary sorts")).toBe("Avoid temporary sorts");
  });
  it("explains backup failure and preservation of existing work", () => {
    expect(importFailureMessage()).toContain("Your existing progress was not changed");
    expect(importFailureMessage()).toContain("backup (.json)");
  });
  it("clarifies the known implementation sentence without altering SQL terminology", () => {
    expect(learnerExplanation("In this app each worker creates an in-memory SQLite database.")).toBe("In SQL Studio, each run starts with the original sample data.");
    const sqlConcept="JOIN, GROUP BY, HAVING, CTE, window functions, indexes, transactions, query plans and database schemas.";
    expect(learnerExplanation(sqlConcept)).toBe(sqlConcept);
  });
});
