import { describe, expect, it } from "vitest";
import { courseOrder, projects } from "@/content";
import { bankQuestions } from "@/content/question-bank";
import { projectsEntryHref, rtSectionHrefs } from "@/features/rt/entry";
import { useLearning } from "@/lib/learning-state";

const fresh = () => {
  useLearning.getState().resetProgress();
  return useLearning.getState();
};

describe("rt section entry hrefs", () => {
  it("points a fresh learner at the first lesson, question, and project brief", () => {
    const s = fresh();
    const hrefs = rtSectionHrefs(s);
    expect(hrefs.learn).toBe(`/sql/lesson/${courseOrder[0]}`);
    expect(hrefs.practice).toBe(`/sql/practice/${bankQuestions[0].slug}`);
    expect(hrefs.projects).toBe("/sql/projects/video-product-analytics");
  });

  it("resumes practice on the last unsolved question", () => {
    const s = fresh();
    s.lastQuestion = bankQuestions[2].slug;
    expect(rtSectionHrefs(s).practice).toBe(`/sql/practice/${bankQuestions[2].slug}`);
  });

  it("opens the next unfinished milestone for a started project", () => {
    const s = fresh();
    const p = projects[0];
    const first = p.milestoneIds[0];
    s.projects[p.id] = {
      started: 1,
      last: first,
      milestones: {
        [first]: {
          solved: [0, 1],
          check: true,
          queries: {},
          results: {},
          updated: 2,
          notes: "done",
        },
      },
    };
    expect(projectsEntryHref(s)).toBe(`/sql/projects/video-product-analytics/m/${p.milestoneIds[1]}`);
  });
});
