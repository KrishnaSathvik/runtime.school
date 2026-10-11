import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { content, courseOrder, isBlankSql, lessons, projects, starterFor } from "@/content";
import { projectPhases } from "@/content/project-phases";
import { projectReport } from "@/features/projects/deliverables";
import {
  isMastered,
  isReviewDue,
  migrateLearning,
  PLACEMENT_IDS,
  placementStart,
  REVIEW_DAYS,
  useLearning,
} from "@/lib/learning-state";
import { bootWorker, type WorkerResponse } from "./helpers/original";

const DAY = 86400000;
const store = () => useLearning.getState();
let send: (d: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});
beforeEach(() => store().resetProgress());
afterEach(() => vi.useRealTimers());

function master(id: number) {
  for (const v of [0, 1])
    store().recordCheck({ lessonId: id, variant: v, project: null, ok: true, guided: false, query: "x" });
  store().completeQuiz(id, null, lessons[id].quiz.correct);
}

describe("starter SQL", () => {
  it("every query challenge starts with a SELECT/FROM scaffold, cursor after SELECT", () => {
    for (const l of lessons.filter((x) => x.mode !== "lab")) {
      for (const v of [0, 1]) {
        const s = starterFor(l, v);
        expect(s.sql.startsWith("SELECT \nFROM"), l.title).toBe(true);
        expect(s.cursor).toBe("SELECT ".length);
        expect(isBlankSql(s.sql)).toBe(false);
      }
    }
  });

  it("beginner lessons name their table; others don't hint at it", () => {
    expect(starterFor(lessons[0], 0).sql).toBe("SELECT \nFROM customers;");
    expect(starterFor(lessons[0], 1).sql).toBe("SELECT \nFROM products;");
    const adv = lessons.find((l) => l.difficulty === "Advanced" && l.mode !== "lab")!;
    expect(starterFor(adv, 0).sql).toBe("SELECT \nFROM ");
  });

  it("lab challenges start empty (placeholder shown instead)", () => {
    for (const l of lessons.filter((x) => x.mode === "lab")) expect(starterFor(l, 0).sql).toBe("");
  });

  it("no starter ever passes a check (all 176 challenges, through the shipped worker)", async () => {
    for (const l of lessons)
      for (const v of [0, 1]) {
        const t = l.tasks[v];
        const r = await send({
          seed: content.seed, query: starterFor(l, v).sql, answer: t.answer, ordered: t.ordered,
          mutation: content.fixtureMutation, allowWrites: l.mode === "lab", validate: t.validate, required: t.required,
        });
        expect(r.grade?.ok === true, `${l.id}/${v}`).toBe(false);
      }
  }, 60_000);

  it("old comment-only drafts count as blank; real SQL drafts don't", () => {
    expect(isBlankSql("-- Meet your first SELECT\n-- Challenge 1: …\n\n")).toBe(true);
    expect(isBlankSql("/* a */\n")).toBe(true);
    expect(isBlankSql("-- note\nSELECT 1")).toBe(false);
  });
});

describe("spaced review", () => {
  it("mastery schedules level 0, due in 1 day", () => {
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    master(0);
    const r = store().reviews[0];
    expect(r.level).toBe(0);
    expect(r.due).toBe(Date.now() + DAY);
    expect(isReviewDue(r)).toBe(false);
  });

  it("successes climb the ladder 1→3→7→21 days and stay at the top", () => {
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    master(0);
    const levels: number[] = [];
    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(store().reviews[0].due + 1000);
      const r = store().completeReview(0, { quiz: true, sql: true })!;
      levels.push(r.level);
      expect(r.due).toBe(Date.now() + REVIEW_DAYS[r.level] * DAY);
    }
    expect(levels).toEqual([1, 2, 3, 3, 3]);
    expect(store().reviews[0].history).toHaveLength(5);
  });

  it("a miss (quiz or SQL) resets to level 0, due tomorrow, and keeps mastery", () => {
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    master(0);
    vi.setSystemTime(store().reviews[0].due);
    store().completeReview(0, { quiz: true, sql: true });
    vi.setSystemTime(store().reviews[0].due + 5 * DAY); // overdue
    const r = store().completeReview(0, { quiz: true, sql: false })!;
    expect(r.level).toBe(0);
    expect(r.due).toBe(Date.now() + DAY);
    expect(isMastered(store().stats[0])).toBe(true);
    vi.setSystemTime(r.due);
    expect(store().completeReview(0, { quiz: false, sql: true })!.level).toBe(0);
  });

  it("practising before it's due is recorded but doesn't move the schedule", () => {
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    master(0);
    const before = store().reviews[0];
    const r = store().completeReview(0, { quiz: true, sql: true })!;
    expect(r.level).toBe(before.level);
    expect(r.due).toBe(before.due);
    expect(r.history.at(-1)?.early).toBe(true);
  });

  it("unmastered lessons can't be reviewed", () => {
    expect(store().completeReview(5, { quiz: true, sql: true })).toBeNull();
  });

  it("due reviews drive the recommendation and summary; persisted level survives import", () => {
    vi.useFakeTimers({ now: 1_000_000_000_000 });
    master(0);
    store().setSession(0, null, "complete", 1);
    vi.setSystemTime(store().reviews[0].due + 1);
    expect(store().summary().due).toBe(1);
    expect(store().recommendation()).toMatchObject({ id: 0, kind: "review" });
    store().completeReview(0, { quiz: true, sql: true });
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().importProgress(exported);
    expect(store().reviews[0].level).toBe(1);
    expect(store().reviews[0].history[0].ok).toBe(true);
    expect(store().summary().due).toBe(0);
  });

  it("original-format reviews (step) migrate to levels", () => {
    const d = migrateLearning({ version: 3, stats: { 0: { solved: [0, 1], check: true } }, reviews: { 0: { step: 2, due: 5, history: [{ ok: true, time: 1 }, "junk"] } } });
    expect(d.reviews[0]).toEqual({ level: 2, due: 5, history: [{ ok: true, time: 1 }] });
  });
});

describe("placement", () => {
  it("questions follow course order", () => {
    const pos = PLACEMENT_IDS.map((id) => courseOrder.indexOf(id));
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it("start = first missed question; all solved = lesson after the last; one advanced success can't skip basics", () => {
    const run = (oks: boolean[]) => {
      store().restartPlacement();
      oks.forEach((ok, i) => {
        store().answerPlacement(i, ok);
        store().advancePlacement();
      });
      return placementStart(store().placement);
    };
    expect(run([false, true, true, true, true, true])).toBe(PLACEMENT_IDS[0]);
    expect(run([true, true, false, true, true, true])).toBe(PLACEMENT_IDS[2]);
    const all = run([true, true, true, true, true, true])!;
    expect(courseOrder.indexOf(all)).toBe(courseOrder.indexOf(PLACEMENT_IDS[5]) + 1);
    expect(store().placement?.done).toBe(true);
  });

  it("skipping records a miss; a later failed re-check can't undo a success; nothing is mastered", () => {
    store().restartPlacement();
    store().answerPlacement(0, true);
    store().answerPlacement(0, false);
    expect(store().placement?.answers[0].ok).toBe(true);
    store().advancePlacement();
    store().advancePlacement(); // skip q2
    expect(store().placement?.answers[1].ok).toBe(false);
    expect(Object.keys(store().stats)).toHaveLength(0);
  });

  it("drives the first recommendation for a new learner only", () => {
    store().restartPlacement();
    for (let i = 0; i < 6; i++) {
      store().answerPlacement(i, i < 3);
      store().advancePlacement();
    }
    expect(store().recommendation()).toMatchObject({ id: PLACEMENT_IDS[3], kind: "placement" });
    store().recordCheck({ lessonId: 0, variant: 0, project: null, ok: false, guided: false, query: "x" });
    expect(store().recommendation().kind).not.toBe("placement");
  });

  it("placement progress round-trips and malformed placement is dropped", () => {
    store().restartPlacement();
    store().answerPlacement(0, true);
    store().advancePlacement();
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().importProgress(exported);
    expect(store().placement).toMatchObject({ index: 1, done: false });
    expect(migrateLearning({ version: 3, stats: {}, placement: { answers: "x" } }).placement).toBeNull();
  });
});

describe("project phases and findings", () => {
  it.each(Object.entries(projectPhases))("project %s phases cover every milestone once, in order", (pid, phases) => {
    expect(phases.flatMap((p) => p.milestoneIds)).toEqual(projects[Number(pid)].milestoneIds);
  });

  it("findings persist, survive import, and appear in the export", () => {
    const p = projects[4];
    const id = p.milestoneIds[0];
    store().setMilestoneNotes(4, id, "Landed CRM rows match the manifest.");
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().importProgress(exported);
    const m = store().projects[4].milestones[id];
    expect(m.notes).toBe("Landed CRM rows match the manifest.");
    expect(m.solved).toEqual([]);
    expect(projectReport(p, store().projects[4])).toContain("**Findings**\n\nLanded CRM rows match the manifest.");
  });
});
