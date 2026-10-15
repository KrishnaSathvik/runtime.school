import { describe, expect, it } from "vitest";
import { courseOrder } from "@/content";
import { bankQuestions } from "@/content/question-bank";
import { projectsEntryHref, rtSectionHrefs } from "@/features/rt/entry";
import { useLearning } from "@/lib/learning-state";
import { sqlLessonHref } from "@/platform/sql-lesson-href";

const fresh = () => {
  useLearning.getState().resetProgress();
  return useLearning.getState();
};

describe("rt section entry hrefs", () => {
  it("points a fresh learner at the first lesson, question, and projects library", () => {
    const s = fresh();
    const hrefs = rtSectionHrefs(s);
    expect(hrefs.learn).toBe(sqlLessonHref(courseOrder[0]));
    expect(hrefs.practice).toBe(`/sql/practice/${bankQuestions[0].slug}`);
    expect(hrefs.projects).toBe("/sql/projects");
  });

  it("resumes practice on the last unsolved question", () => {
    const s = fresh();
    s.lastQuestion = bankQuestions[2].slug;
    expect(rtSectionHrefs(s).practice).toBe(`/sql/practice/${bankQuestions[2].slug}`);
  });

  it("resumes a started catalog project from local drafts", () => {
    const s = fresh();
    s.setDraft("sql-project-airline-reliability-review-v1-baseline-sql", "SELECT 1");
    s.setDraft("sql-project-airline-reliability-review-v1-baseline-seen", "1");
    expect(projectsEntryHref(useLearning.getState())).toBe("/sql/projects/airline-reliability-review");
  });
});
