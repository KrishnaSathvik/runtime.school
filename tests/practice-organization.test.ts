import { describe, expect, it } from "vitest";
import { practiceQuestions } from "@/features/discovery/selectors";
import {
  browserParams,
  browserUrl,
  DEFAULT_SOURCE,
  filteredQuestions,
  practiceEntrySlug,
} from "@/features/practice/browser";
import { bankQuestions } from "@/content/question-bank";
import { tracks } from "@/content/question-bank/tracks";
import { useLearning } from "@/lib/learning-state";

const fresh = () => {
  useLearning.getState().resetProgress();
  return useLearning.getState();
};

describe("Practice entry opens a question", () => {
  it("starts on the first bank question for a fresh learner", () => {
    const s = fresh();
    expect(practiceEntrySlug(s)).toBe(bankQuestions[0].slug);
  });

  it("resumes an unsolved last question", () => {
    const s = fresh();
    s.lastQuestion = bankQuestions[2].slug;
    expect(practiceEntrySlug(s)).toBe(bankQuestions[2].slug);
  });
});

describe("Practice browser defaults to the full question set", () => {
  it("treats a missing source as all practice-eligible questions", () => {
    const s = fresh();
    const rows = filteredQuestions(new URLSearchParams(), s);
    expect(rows.length).toBe(practiceQuestions.length);
    expect(browserParams(new URLSearchParams()).get("source")).toBeNull();
    expect(DEFAULT_SOURCE).toBe("all");
  });

  it("keeps Independent and From Learn as explicit inventories", () => {
    const s = fresh();
    const independent = filteredQuestions(new URLSearchParams("source=new"), s);
    const lessons = filteredQuestions(new URLSearchParams("source=lessons"), s);
    const all = filteredQuestions(new URLSearchParams("source=all"), s);
    expect(independent.every((q) => q.sourceType === "bank")).toBe(true);
    expect(independent.length).toBeGreaterThan(0);
    expect(lessons.every((q) => q.sourceType !== "bank")).toBe(true);
    expect(lessons.length).toBeGreaterThan(0);
    expect(all.length).toBe(practiceQuestions.length);
    expect(all[0].sourceType).toBe("bank");
  });

  it("omits the default source from clean question URLs", () => {
    expect(browserUrl(new URLSearchParams())).toBe("/practice/questions");
    expect(browserUrl(new URLSearchParams("source=lessons"))).toBe(
      "/practice/questions?source=lessons",
    );
    expect(browserUrl(new URLSearchParams("type=predict"))).toBe(
      "/practice/questions?type=predict",
    );
  });
});

describe("Practice tracks preserve identities while fixing progression", () => {
  it("still references only the original six tracks and existing question ids", () => {
    expect(tracks.map((t) => t.id)).toEqual([
      "sql-from-zero",
      "master-joins",
      "interview-essentials",
      "advanced-challenges",
      "real-world-analytics",
      "data-engineering",
    ]);
    const known = new Set(practiceQuestions.map((q) => q.id));
    for (const t of tracks) {
      for (const id of t.questionIds) expect(known.has(id)).toBe(true);
    }
  });
});
