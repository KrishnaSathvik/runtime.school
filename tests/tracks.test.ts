import { describe, expect, it } from "vitest";
import { allQuestions } from "@/content/question-bank";
import { familyOf } from "@/content/question-bank/topics";
import { tracks, type Track } from "@/content/question-bank/tracks";
import { trackProblems } from "@/content/question-bank/track-rules";

const byId = new Map(allQuestions().map((q) => [q.id, q]));

describe("practice track definitions", () => {
  it("six tracks with unique ids, titles and complete descriptions", () => {
    expect(tracks.map((t) => t.id)).toEqual([
      "sql-from-zero",
      "master-joins",
      "interview-essentials",
      "advanced-challenges",
      "real-world-analytics",
      "data-engineering",
    ]);
    expect(new Set(tracks.map((t) => t.title)).size).toBe(6);
    for (const t of tracks) {
      expect(t.summary && t.objective && t.startingPoint).toBeTruthy();
      expect(t.skills.length).toBeGreaterThan(2);
      expect(t.questionIds.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("promises no joins on SQL from Zero, not that SQL is unnecessary", () => {
    const track = tracks.find((t) => t.id === "sql-from-zero");
    expect(track?.startingPoint).toBe("No joins required. Every question uses one table.");
    expect(track?.startingPoint).not.toMatch(/No SQL needed/);
  });

  it("SQL from Zero teaches WHERE before DISTINCT", () => {
    const ids = tracks.find((t) => t.id === "sql-from-zero")!.questionIds;
    expect(ids.indexOf("qb-0002")).toBeLessThan(ids.indexOf("lc-2-0"));
    expect(ids.indexOf("qb-0003")).toBeLessThan(ids.indexOf("lc-2-0"));
    expect(ids.slice(0, 3)).toEqual(["qb-0001", "lc-1-0", "qb-0002"]);
  });

  it("Data Engineers practice constraints before savepoints and history after loads", () => {
    const ids = tracks.find((t) => t.id === "data-engineering")!.questionIds;
    expect(ids.indexOf("lc-60-0")).toBeLessThan(ids.indexOf("lc-61-1"));
    expect(ids.indexOf("lc-84-0")).toBeLessThan(ids.indexOf("lc-78-0"));
    expect(ids.indexOf("lc-58-0")).toBeLessThan(ids.indexOf("lc-84-0"));
  });

  it("gives every track editorial sections that point at real question ids", () => {
    for (const t of tracks) {
      expect(t.sections && Object.keys(t.sections).length).toBeGreaterThan(1);
      for (const id of Object.keys(t.sections ?? {})) {
        expect(t.questionIds).toContain(id);
      }
    }
  });

  it.each(tracks.map((t) => [t.id, t] as const))("%s: valid references, ordering and variety", (_id, t) => {
    expect(trackProblems(t)).toEqual([]);
    const topics = new Set(t.questionIds.map((id) => byId.get(id)!.primaryTopic));
    expect(topics.size).toBeGreaterThanOrEqual(3);
  });

  it("difficulty ranges match each track's promise", () => {
    const range = (t: Track) => [byId.get(t.questionIds[0])!.difficulty, byId.get(t.questionIds.at(-1)!)!.difficulty];
    expect(tracks.map(range)).toEqual([
      ["warmup", "easy"],
      ["easy", "hard"],
      ["easy", "medium"],
      ["medium", "hard"],
      ["medium", "hard"],
      ["easy", "hard"],
    ]);
  });

  it("topic focus fits each track", () => {
    const share = (t: Track, fams: string[]) =>
      t.questionIds.filter((id) => fams.includes(familyOf(byId.get(id)!.primaryTopic))).length / t.questionIds.length;
    const [zero, joins, , adv, analytics, eng] = tracks;
    expect(share(zero, ["basics", "filtering"])).toBe(1);
    expect(share(joins, ["joins"])).toBeGreaterThanOrEqual(0.7);
    expect(share(adv, ["windows", "dates", "subqueries", "warehousing", "analytics"])).toBe(1);
    expect(share(analytics, ["analytics", "aggregation", "warehousing"])).toBeGreaterThanOrEqual(0.8);
    expect(share(eng, ["engineering", "warehousing", "optimization", "cleaning"])).toBe(1);
  });

  it("the validator catches bad tracks", () => {
    const bad: Track = { ...tracks[0], questionIds: ["qb-9999", "lc-35-1", "qb-0046", "qb-0001", "qb-0001", "lc-0-0", "lc-0-1"] };
    const problems = trackProblems(bad).join("\n");
    expect(problems).toMatch(/qb-9999: unknown/);
    expect(problems).toMatch(/lc-35-1: lesson-only/);
    expect(problems).toMatch(/qb-0001: easier than qb-0046/);
    expect(problems).toMatch(/qb-0001: repeated/);
    expect(problems).toMatch(/lc-0-1: same pattern as lc-0-0/);
    expect(trackProblems({ ...tracks[0], questionIds: ["qb-0001", "qb-0046"] })).toEqual(["qb-0046: jumps 3 levels after qb-0001"]);
  });

  it("allows a documented easier consolidation step but keeps the jump guard", () => {
    const t: Track = { ...tracks[0], questionIds: ["qb-0046", "qb-0001"],
      consolidation: { "qb-0001": "Revisit column selection after the advanced exercise." } };
    expect(trackProblems(t)).toEqual([]);
    expect(trackProblems({ ...t, consolidation: { "qb-0001": " " } })).toHaveLength(1);
    expect(trackProblems({ ...t, questionIds: [...t.questionIds, "qb-0046"] }).join("\n")).toMatch(/jumps 3 levels/);
  });
});

describe("track progress", async () => {
  const { useLearning, isMastered } = await import("@/lib/learning-state");
  const { trackProgress, nextInTrack, trackHref } = await import("@/features/practice/tracks");
  const { trackById } = await import("@/content/question-bank/tracks");
  const store = () => useLearning.getState();
  const joins = trackById.get("master-joins")!;

  it("starts empty; the first question is next", () => {
    store().resetProgress();
    const p = trackProgress(joins, store());
    expect(p).toMatchObject({ solved: 0, total: 14, complete: false });
    expect(p.next?.q.id).toBe("lc-14-0");
  });

  it("shares completion with the browser and lessons (no separate track solves)", () => {
    store().resetProgress();
    store().recordQuestionCheck("qb-0010", true); // solved from the Practice browser
    store().recordCheck({ lessonId: 14, variant: 0, project: null, ok: true, guided: false, query: "x" }); // solved in its lesson
    const p = trackProgress(joins, store());
    expect(p.solved).toBe(2);
    expect(p.items.find((x) => x.q.id === "qb-0010")!.status).toBe("solved");
    expect(p.next?.q.id).toBe("qb-0015");
    // Same question counts in every track that contains it.
    const eng = trackById.get("interview-essentials")!;
    store().recordQuestionCheck("qb-0011", true);
    expect(trackProgress(eng, store()).items.find((x) => x.q.id === "qb-0011")!.status).toBe("solved");
  });

  it("guided solves don't complete a track question", () => {
    store().resetProgress();
    store().questionHint("qb-0015");
    store().recordQuestionCheck("qb-0015", true);
    expect(trackProgress(joins, store()).items.find((x) => x.q.id === "qb-0015")!.status).toBe("guided");
    expect(trackProgress(joins, store()).solved).toBe(0);
  });

  it("allows reuse across tracks with a single shared completion record", () => {
    store().resetProgress();
    const shared: Track = { ...joins, id: "another-joins-track" };
    expect(trackProblems(shared)).toEqual([]);
    store().recordQuestionCheck("qb-0015", true);
    expect(trackProgress(joins, store()).solved).toBe(1);
    expect(trackProgress(shared, store()).solved).toBe(1);
  });

  it("next in track skips solved questions and wraps; null when complete", () => {
    store().resetProgress();
    store().recordQuestionCheck("qb-0016", true);
    expect(nextInTrack(joins, "qb-0015", store())?.q.id).toBe("lc-15-1");
    expect(nextInTrack(joins, "qb-0048", store())?.q.id).toBe("lc-14-0");
    for (const id of joins.questionIds) {
      if (id.startsWith("qb-")) store().recordQuestionCheck(id, true);
      else {
        const [, l, v] = id.split("-").map(Number);
        store().recordCheck({ lessonId: l, variant: v, project: null, ok: true, guided: false, query: "x" });
      }
    }
    expect(trackProgress(joins, store()).complete).toBe(true);
    expect(nextInTrack(joins, "lc-14-0", store())).toBeNull();
  });

  it("completing a track never awards lesson mastery or project milestones", () => {
    // Every lesson challenge above was recorded as one independent solve; no concept checks were taken.
    for (const id of joins.questionIds.filter((x) => x.startsWith("lc-"))) {
      const l = Number(id.split("-")[1]);
      expect(isMastered(store().stats[l])).toBe(false);
    }
    expect(store().projects).toEqual({});
  });

  it("remembers the started track and position; survives export/import (resume after refresh)", () => {
    store().resetProgress();
    store().touchTrack("master-joins", "qb-0029");
    const exported = JSON.parse(JSON.stringify(store().exportProgress()));
    store().resetProgress();
    store().importProgress(exported);
    expect(store().lastTrack).toBe("master-joins");
    expect(store().tracks["master-joins"].lastQuestionId).toBe("qb-0029");
  });

  it("links keep the track context", () => {
    const items = trackProgress(joins, store()).items;
    expect(trackHref(items[0].q, "master-joins")).toBe("/lesson/14?challenge=1&track=master-joins");
    expect(trackHref(items[1].q, "master-joins")).toBe("/practice/employees-and-departments?track=master-joins");
  });
});

// Resuming must not silently replace a later interrupted question with the first gap.
it("resumes an unfinished saved track position and falls back after an independent solve", async () => {
  const { resumeInTrack } = await import("@/features/practice/tracks");
  const { useLearning } = await import("@/lib/learning-state");
  useLearning.getState().resetProgress();
  const track = tracks[0];
  const state = useLearning.getState();
  // Prefer a later bank question so shared practice progress can clear the resume pin.
  const later = track.questionIds.find((id) => id.startsWith("qb-") && id !== track.questionIds[0])!;
  expect(resumeInTrack(track, state, later)?.q.id).toBe(later);
  state.recordQuestionCheck(later, true);
  expect(resumeInTrack(track, useLearning.getState(), later)?.q.id).toBe(track.questionIds[0]);
});

it("moves the track pointer past a question solved with help", async () => {
  const { resumeInTrack, trackProgress } = await import("@/features/practice/tracks");
  const { useLearning } = await import("@/lib/learning-state");
  useLearning.getState().resetProgress();
  const track = tracks[0];
  const helped = track.questionIds.find((id) => id.startsWith("qb-"))!;
  const store = useLearning.getState();
  store.questionHint(helped);
  store.recordQuestionCheck(helped, true);
  const state = useLearning.getState();
  expect(trackProgress(track, state).solved).toBe(0);
  expect(trackProgress(track, state).next?.q.id).not.toBe(helped);
  expect(resumeInTrack(track, state, helped)?.q.id).not.toBe(helped);
});
