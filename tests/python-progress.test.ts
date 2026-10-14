import { beforeEach, describe, expect, it } from "vitest";
import { getPythonLesson, pythonLessons, pythonModules } from "@/content/python";
import { isPyLessonMastered, normalizePyProgress, PY_PROGRESS_KEY, usePyProgress } from "@/lib/python-progress";

const REF = "python:variables-and-values";
const IDS = ["challenge-1", "challenge-2"];
const s = () => usePyProgress.getState();
const rec = () => s().lessons[REF];

beforeEach(() => {
  usePyProgress.setState({ lessons: {}, lastLesson: null });
});

describe("python progress: mastery rules", () => {
  it("needs both challenges solved without help and the concept check", () => {
    s().recordCheck(REF, "challenge-1", true, IDS);
    expect(isPyLessonMastered(rec(), IDS)).toBe(false);
    s().answerQuiz(REF, "predict", 0, true, IDS);
    expect(isPyLessonMastered(rec(), IDS)).toBe(false);
    s().recordCheck(REF, "challenge-2", true, IDS);
    expect(isPyLessonMastered(rec(), IDS)).toBe(true);
    expect(rec().masteredAt).toBeGreaterThan(0);
  });

  it("a passed concept check alone never awards mastery", () => {
    s().answerQuiz(REF, "predict", 0, true, IDS);
    s().answerQuiz(REF, "changes", 2, true, IDS);
    expect(rec().quiz.passed).toBe(true);
    expect(isPyLessonMastered(rec(), IDS)).toBe(false);
    expect(rec().masteredAt).toBe(0);
  });

  it("a correct answer after a hint or the answer is assisted, not independent", () => {
    s().takeHelp(REF, "challenge-1", "hint");
    s().recordCheck(REF, "challenge-1", true, IDS);
    expect(rec().challenges["challenge-1"]).toMatchObject({ solved: false, assisted: true, passes: 1 });
    s().takeHelp(REF, "challenge-2", "answer");
    expect(rec().attempts["challenge-2"]).toMatchObject({ guided: true, revealed: true });
    s().recordCheck(REF, "challenge-2", true, IDS);
    s().answerQuiz(REF, "predict", 0, true, IDS);
    expect(isPyLessonMastered(rec(), IDS)).toBe(false);
  });

  it("a fresh attempt clears help, and an unassisted solve then counts", () => {
    s().takeHelp(REF, "challenge-1", "hint");
    s().freshAttempt(REF, "challenge-1");
    expect(rec().attempts["challenge-1"].guided).toBe(false);
    s().recordCheck(REF, "challenge-1", true, IDS);
    expect(rec().challenges["challenge-1"].solved).toBe(true);
  });

  it("failed checks are counted but never solve; a later failure doesn't undo a solve", () => {
    s().recordCheck(REF, "challenge-1", false, IDS);
    expect(rec().challenges["challenge-1"]).toMatchObject({ solved: false, checks: 1, passes: 0 });
    s().recordCheck(REF, "challenge-1", true, IDS);
    s().recordCheck(REF, "challenge-1", false, IDS);
    expect(rec().challenges["challenge-1"]).toMatchObject({ solved: true, checks: 3, passes: 1 });
  });

  it("drafts are per challenge, and changing one never touches mastery or the other draft", () => {
    s().recordCheck(REF, "challenge-1", true, IDS);
    s().recordCheck(REF, "challenge-2", true, IDS);
    s().answerQuiz(REF, "predict", 0, true, IDS);
    s().setDraft(REF, "challenge-1", "a = 1\n");
    s().setDraft(REF, "challenge-2", "b = 2\n");
    s().setDraft(REF, "challenge-1", "# starter\n");
    expect(rec().drafts).toEqual({ "challenge-1": "# starter\n", "challenge-2": "b = 2\n" });
    expect(isPyLessonMastered(rec(), IDS)).toBe(true);
    expect(s().lastLesson).toBe(REF);
  });
});

describe("python progress: storage", () => {
  it("uses its own key, never the SQL store's", () => {
    expect(PY_PROGRESS_KEY).toBe("runtime-python-v1");
    expect(usePyProgress.persist.getOptions().name).toBe("runtime-python-v1");
  });

  it("normalises corrupt or foreign data instead of crashing", () => {
    expect(normalizePyProgress(null)).toEqual({ version: 1, lessons: {}, lastLesson: null });
    expect(normalizePyProgress({ lessons: { "sql:3": { drafts: { a: "x" } } } }).lessons).toEqual({});
    const n = normalizePyProgress({
      lessons: { [REF]: { drafts: { "challenge-1": "x = 1", bad: 3 }, challenges: { "challenge-1": { solved: "yes", passes: 2 } }, quiz: { passed: true, answers: { predict: 0, x: "a" } }, tab: 5 } },
      lastLesson: "sql:1",
    });
    expect(n.lessons[REF].drafts).toEqual({ "challenge-1": "x = 1" });
    expect(n.lessons[REF].challenges["challenge-1"]).toMatchObject({ solved: false, passes: 2 });
    expect(n.lessons[REF].quiz).toMatchObject({ passed: true, answers: { predict: 0 } });
    expect(n.lessons[REF].tab).toBeNull();
    expect(n.lastLesson).toBeNull();
  });
});

describe("python content: Variables and values", () => {
  const lesson = getPythonLesson("variables-and-values")!;

  it("is the only lesson, listed in Python Foundations, with a stable ref", () => {
    expect(pythonLessons.map((l) => l.slug)).toEqual(["variables-and-values"]);
    expect(pythonModules[0]).toMatchObject({ id: "foundations", title: "Python Foundations", lessons: ["variables-and-values"] });
    expect(lesson.ref).toBe(REF);
  });

  it("has two challenges graded by variables and output only (no functions yet)", () => {
    expect(lesson.challenges.map((c) => c.id)).toEqual(IDS);
    for (const c of lesson.challenges) {
      expect(c.task.checks.every((k) => k.kind === "variable" || k.kind === "output")).toBe(true);
      expect(c.task.checks.some((k) => k.kind === "output")).toBe(true);
      expect(c.hints.length).toBeGreaterThan(0);
      // Starters never contain the solution.
      expect(c.starter).not.toMatch(/=|print/);
      expect(c.answer).not.toMatch(/\bdef\b|\bfor\b|\bwhile\b|\{|\[/);
    }
    // Challenge 2 is about reassignment: two printed totals, final state checked.
    expect(lesson.challenges[1].task.checks.find((k) => k.kind === "output")).toMatchObject({ expected: "30\n75\n" });
  });

  it("every concept-check question has exactly one correct option and explains every option", () => {
    expect(lesson.quiz.length).toBeGreaterThanOrEqual(2);
    for (const q of lesson.quiz) {
      expect(q.options.filter((o) => o.correct)).toHaveLength(1);
      expect(q.options.every((o) => o.why.length > 20)).toBe(true);
    }
  });
});
