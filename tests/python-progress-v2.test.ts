import { beforeEach, describe, expect, it } from "vitest";
import { emptyProgress, isLessonMastered, normalizePy2, usePy2 } from "@/lib/python-progress-v2";

beforeEach(() => usePy2.setState({ ...emptyProgress() }));
const L = { kind: "lesson" as const, id: "PY-L01-01", exercise: "c1" };
const Q = { kind: "question" as const, id: "PY-Q01-02" };
const s = () => usePy2.getState();

describe("python progress v2", () => {
  it("records an independent solve, and mastery needs both challenges plus the concept check", () => {
    s().recordCheck(L, true, ["c1", "c2"]);
    expect(s().lessons["PY-L01-01"].exercises.c1.solved).toBe(true);
    expect(s().lessons["PY-L01-01"].masteredAt).toBe(0);
    s().recordCheck({ ...L, exercise: "c2" }, true, ["c1", "c2"]);
    expect(s().lessons["PY-L01-01"].masteredAt).toBe(0);
    s().answerConcept("PY-L01-01", "q1", 1, true, ["c1", "c2"]);
    expect(s().lessons["PY-L01-01"].masteredAt).toBeGreaterThan(0);
    expect(isLessonMastered(s().lessons["PY-L01-01"], ["c1", "c2"])).toBe(true);
  });

  it("a hint or the answer makes a correct check assisted, and a fresh attempt clears that", () => {
    s().takeHelp(Q, "hint");
    s().recordCheck(Q, true);
    expect(s().questions[Q.id]).toMatchObject({ solved: false, assisted: true });
    s().freshAttempt(Q);
    s().recordCheck(Q, true);
    expect(s().questions[Q.id]).toMatchObject({ solved: true, assisted: true, checks: 2 });
    expect(s().last.practice).toBe(Q.id);
  });

  it("a failed check never counts as solved", () => {
    s().recordCheck(Q, false);
    expect(s().questions[Q.id]).toMatchObject({ solved: false, assisted: false, checks: 1 });
  });

  it("keeps project files across milestones and ties help to the milestone it was used on", () => {
    s().setProjectFiles("P01", { "catalogue.py": "x = 1\n", "main.py": "print(1)\n" });
    s().takeProjectHelp("P01");
    s().recordMilestone("P01", "P01.m1", true);
    expect(s().projects.P01.milestones["P01.m1"]).toMatchObject({ assisted: true, checks: 1 });
    expect(s().projects.P01.attempt.hints).toBe(0);
    s().setProjectFile("P01", "catalogue.py", "x = 2\n");
    expect(s().projects.P01.files).toEqual({ "catalogue.py": "x = 2\n", "main.py": "print(1)\n" });
  });

  it("normalises corrupt or hostile saved data instead of crashing", () => {
    const n = normalizePy2({
      lessons: { "PY-L01-01": { exercises: { c1: { solved: "yes", checks: -4, draft: 7 } }, concept: { answers: { q1: "1" }, passed: 1 } }, "../evil": {} },
      questions: { "PY-Q01-02": null, nope: { solved: true } },
      projects: { P01: { files: { "../../x": "bad", "main.py": "ok" }, milestones: { "P01.m1": { passedAt: 5 }, junk: {} }, current: "P01.m1" } },
      playground: { dataset: "javascript:alert(1)", libraries: "data", files: { "helpers.py": "x = 1\n", "../evil.py": "bad", "main.py": "no", "notes.exe": "no" } },
      last: { learn: "PY-L01-02", practice: 5 },
    });
    expect(n.lessons["PY-L01-01"].exercises.c1).toMatchObject({ solved: false, checks: 0, draft: null });
    expect(n.lessons["PY-L01-01"].concept).toMatchObject({ passed: false, answers: {} });
    expect(Object.keys(n.lessons)).toEqual(["PY-L01-01"]);
    expect(Object.keys(n.questions)).toEqual(["PY-Q01-02"]);
    expect(n.projects.P01.files).toEqual({ "main.py": "ok" });
    expect(Object.keys(n.projects.P01.milestones)).toEqual(["P01.m1"]);
    expect(n.playground).toEqual({ code: null, dataset: "R01@starter.1", libraries: "data", files: { "helpers.py": "x = 1\n" } });
    expect(n.last).toEqual({ learn: "PY-L01-02", practice: null, project: null });
    expect(normalizePy2("garbage")).toEqual(emptyProgress());
  });
});

describe("content versions", () => {
  it("retires progress earned on an older version of a rebuilt lesson or question", () => {
    const solved = { solved: true, solvedAt: 5, checks: 1 };
    const n = normalizePy2({
      lessons: {
        // M12 was rebuilt (version 2): a version-1 record (no version field) is not mastery any more.
        "PY-L12-01": { exercises: { c1: solved, c2: solved }, concept: { passed: true }, masteredAt: 9 },
        "PY-L12-02": { exercises: { c1: solved }, concept: { passed: true }, version: 2 },
        "PY-L01-01": { exercises: { c1: solved }, concept: { passed: true } },
      },
      questions: { "PY-Q12-02": solved, "PY-Q12-06": { ...solved, version: 2 }, "PY-Q01-02": solved },
    });
    expect(n.lessons["PY-L12-01"]).toBeUndefined();
    expect(n.lessons["PY-L12-02"]).toMatchObject({ version: 2, concept: { passed: true } });
    expect(n.lessons["PY-L12-02"].exercises.c1).toMatchObject({ solved: true, version: 2 });
    expect(n.lessons["PY-L01-01"]).toMatchObject({ version: 1 });
    expect(n.questions["PY-Q12-02"]).toBeUndefined();
    expect(n.questions["PY-Q12-06"]).toMatchObject({ solved: true, version: 2 });
    expect(n.questions["PY-Q01-02"]).toMatchObject({ solved: true, version: 1 });
  });

  it("stamps new records with the current content version", () => {
    s().recordCheck({ kind: "lesson", id: "PY-L12-03", exercise: "c1" }, true, ["c1", "c2"]);
    s().recordCheck({ kind: "question", id: "PY-Q12-19" }, true);
    s().recordCheck(Q, true);
    expect(s().lessons["PY-L12-03"].version).toBe(2);
    expect(s().lessons["PY-L12-03"].exercises.c1.version).toBe(2);
    expect(s().questions["PY-Q12-19"].version).toBe(2);
    expect(s().questions[Q.id].version).toBe(1);
  });
});
