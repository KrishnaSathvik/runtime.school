"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { contentVersion } from "@/content/python-v2/versions";
import { track } from "@/lib/analytics";

/**
 * Progress for the Python course (docs/python/curriculum-plan.md), keyed by registry IDs: lessons (PY-L…),
 * questions (PY-Q…), projects (P01…) and tools. Its own localStorage key; it never reads or writes SQL progress
 * (sql-studio-v1) or the earlier Python store (runtime-python-v1).
 *
 * Only Check records results; Run never does. Hints or a revealed answer make an attempt assisted: a correct
 * Check then counts as "solved with help", which doesn't count toward mastery.
 *
 * Lesson and question records carry the content version they were earned on (src/content/python-v2/versions.ts).
 * On load, a record older than its item's current version is retired: a completion of the old exercise is not
 * mastery of the rebuilt one.
 */
export const PY2_PROGRESS_KEY = "runtime-python-v2";

export type Py2Attempt = { hints: number; revealed: boolean };
export type Py2Exercise = {
  draft: string | null;
  attempt: Py2Attempt;
  /** Solved at least once without help. */
  solved: boolean;
  solvedAt: number;
  /** Solved at least once with help. */
  assisted: boolean;
  checks: number;
  lastCheckAt: number;
  /** Content version of the question this record was earned on (lesson exercises use the lesson's version). */
  version: number;
};
export type Py2Lesson = {
  exercises: Record<string, Py2Exercise>;
  concept: { answers: Record<string, number>; passed: boolean; attempts: number };
  tab: string | null;
  masteredAt: number;
  updatedAt: number;
  /** Content version of the lesson this record was earned on. */
  version: number;
};
export type Py2Project = {
  /** The learner's files, carried from milestone to milestone. */
  files: Record<string, string>;
  /** Milestones passed, with whether help was used. */
  milestones: Record<string, { passedAt: number; assisted: boolean; checks: number }>;
  attempt: Py2Attempt;
  current: string | null;
  updatedAt: number;
};
/** `files`: extra modules next to main.py (helpers.py, …), importable by name. */
export type Py2Playground = { code: string | null; dataset: string; libraries: string; files: Record<string, string> };
export type Py2Progress = {
  version: 2;
  lessons: Record<string, Py2Lesson>;
  questions: Record<string, Py2Exercise>;
  projects: Record<string, Py2Project>;
  playground: Py2Playground;
  last: { learn: string | null; practice: string | null; project: string | null };
};

const MAX_DRAFT = 100_000;
const emptyAttempt = (): Py2Attempt => ({ hints: 0, revealed: false });
export const emptyExercise = (version = 1): Py2Exercise => ({ draft: null, attempt: emptyAttempt(), solved: false, solvedAt: 0, assisted: false, checks: 0, lastCheckAt: 0, version });
export const emptyLesson = (version = 1): Py2Lesson => ({ exercises: {}, concept: { answers: {}, passed: false, attempts: 0 }, tab: null, masteredAt: 0, updatedAt: 0, version });
export const emptyProject = (): Py2Project => ({ files: {}, milestones: {}, attempt: emptyAttempt(), current: null, updatedAt: 0 });
export const emptyProgress = (): Py2Progress => ({
  version: 2,
  lessons: {},
  questions: {},
  projects: {},
  playground: { code: null, dataset: "R01@starter.1", libraries: "stdlib", files: {} },
  last: { learn: null, practice: null, project: null },
});

export const isGuided = (a: Py2Attempt) => a.hints > 0 || a.revealed;

/** Mastery: both challenges solved without help, and the concept check passed. The try-it never counts. */
export function isLessonMastered(rec: Py2Lesson | undefined, challengeIds: string[]): boolean {
  return !!rec && challengeIds.length > 0 && challengeIds.every((id) => rec.exercises[id]?.solved) && rec.concept.passed;
}

// ---- normalising saved data: a corrupt or partial record never crashes the app ----

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const str = (v: unknown, max = MAX_DRAFT) => (typeof v === "string" ? v.slice(0, max) : null);
const ID = { lesson: /^PY-L\d\d-\d\d$/, question: /^PY-Q\d\d-\d\d$/, project: /^P\d\d$/, milestone: /^P\d\d\.m\d+$/ };

function normAttempt(a: unknown): Py2Attempt {
  return obj(a) ? { hints: Math.min(3, num(a.hints)), revealed: a.revealed === true } : emptyAttempt();
}
function normExercise(e: unknown): Py2Exercise {
  if (!obj(e)) return emptyExercise();
  return { draft: str(e.draft), attempt: normAttempt(e.attempt), solved: e.solved === true, solvedAt: num(e.solvedAt), assisted: e.assisted === true, checks: num(e.checks), lastCheckAt: num(e.lastCheckAt), version: savedVersion(e.version) };
}
/** Records saved before versions existed are version 1. */
const savedVersion = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : 1);

export function normalizePy2(raw: unknown): Py2Progress {
  const out = emptyProgress();
  if (!obj(raw)) return out;
  if (obj(raw.lessons))
    for (const [id, r] of Object.entries(raw.lessons)) {
      if (!ID.lesson.test(id) || !obj(r)) continue;
      // Earned on an older version of this lesson: retired, so it neither shows as done nor counts as mastery.
      if (savedVersion(r.version) < contentVersion(id)) continue;
      const rec = emptyLesson(contentVersion(id));
      if (obj(r.exercises)) for (const [k, e] of Object.entries(r.exercises)) if (/^[\w-]{1,20}$/.test(k)) rec.exercises[k] = { ...normExercise(e), version: rec.version };
      if (obj(r.concept)) {
        rec.concept.passed = r.concept.passed === true;
        rec.concept.attempts = num(r.concept.attempts);
        if (obj(r.concept.answers)) for (const [k, v] of Object.entries(r.concept.answers)) if (typeof v === "number" && Number.isInteger(v)) rec.concept.answers[k] = v;
      }
      rec.tab = str(r.tab, 20);
      rec.masteredAt = num(r.masteredAt);
      rec.updatedAt = num(r.updatedAt);
      out.lessons[id] = rec;
    }
  if (obj(raw.questions))
    for (const [id, q] of Object.entries(raw.questions)) {
      if (!ID.question.test(id)) continue;
      const rec = normExercise(q);
      if (rec.version < contentVersion(id)) continue; // earned on an older version of this question: retired
      out.questions[id] = { ...rec, version: contentVersion(id) };
    }
  if (obj(raw.projects))
    for (const [id, p] of Object.entries(raw.projects)) {
      if (!ID.project.test(id) || !obj(p)) continue;
      const rec = emptyProject();
      if (obj(p.files)) for (const [name, text] of Object.entries(p.files)) if (/^[\w.-]{1,40}$/.test(name) && typeof text === "string") rec.files[name] = text.slice(0, MAX_DRAFT);
      if (obj(p.milestones))
        for (const [m, v] of Object.entries(p.milestones)) if (ID.milestone.test(m) && obj(v)) rec.milestones[m] = { passedAt: num(v.passedAt), assisted: v.assisted === true, checks: num(v.checks) };
      rec.attempt = normAttempt(p.attempt);
      rec.current = typeof p.current === "string" && ID.milestone.test(p.current) ? p.current : null;
      rec.updatedAt = num(p.updatedAt);
      out.projects[id] = rec;
    }
  if (obj(raw.playground)) {
    out.playground.code = str(raw.playground.code);
    if (typeof raw.playground.dataset === "string" && /^[A-Z]\d\d@\w+\.\d+$/.test(raw.playground.dataset)) out.playground.dataset = raw.playground.dataset;
    if (raw.playground.libraries === "data" || raw.playground.libraries === "duckdb") out.playground.libraries = raw.playground.libraries;
    if (obj(raw.playground.files))
      for (const [name, text] of Object.entries(raw.playground.files).slice(0, 8))
        if (/^[\w-]{1,40}\.(py|txt|csv|json)$/.test(name) && name !== "main.py" && typeof text === "string") out.playground.files[name] = text.slice(0, MAX_DRAFT);
  }
  if (obj(raw.last)) {
    if (typeof raw.last.learn === "string" && ID.lesson.test(raw.last.learn)) out.last.learn = raw.last.learn;
    if (typeof raw.last.practice === "string" && ID.question.test(raw.last.practice)) out.last.practice = raw.last.practice;
    if (typeof raw.last.project === "string" && ID.project.test(raw.last.project)) out.last.project = raw.last.project;
  }
  return out;
}

// ---- store ----

let hydrated = false;
const listeners = new Set<() => void>();
const guarded: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  // Writes are ignored until saved progress has loaded, so an early write can't replace it.
  setItem: (name, value) => {
    if (!hydrated) return;
    try {
      localStorage.setItem(name, value);
    } catch {
      // Storage full or blocked: keep working in memory.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

type Where = { kind: "lesson"; id: string; exercise: string } | { kind: "question"; id: string };

type Actions = {
  setDraft: (where: Where, code: string) => void;
  takeHelp: (where: Where, kind: "hint" | "answer") => void;
  /** A fresh, unassisted attempt. The editor resets the draft itself. */
  freshAttempt: (where: Where) => void;
  /** Record a finished Check. `counts` is false for a lesson's try-it (guided practice earns no credit). */
  recordCheck: (where: Where, ok: boolean, lessonChallenges?: string[]) => void;
  answerConcept: (lesson: string, question: string, choice: number, allCorrect: boolean, challenges: string[]) => void;
  setTab: (lesson: string, tab: string) => void;
  setProjectFile: (project: string, file: string, text: string) => void;
  setProjectFiles: (project: string, files: Record<string, string>) => void;
  takeProjectHelp: (project: string) => void;
  recordMilestone: (project: string, milestone: string, ok: boolean) => void;
  setCurrentMilestone: (project: string, milestone: string) => void;
  setPlayground: (patch: Partial<Py2Playground>) => void;
  touch: (section: keyof Py2Progress["last"], id: string) => void;
};

const now = () => Date.now();
function withExercise(s: Py2Progress, where: Where, change: (e: Py2Exercise) => Py2Exercise): Partial<Py2Progress> {
  if (where.kind === "question") {
    return { questions: { ...s.questions, [where.id]: change(structuredClone(s.questions[where.id] ?? emptyExercise(contentVersion(where.id)))) }, last: { ...s.last, practice: where.id } };
  }
  const rec = structuredClone(s.lessons[where.id] ?? emptyLesson(contentVersion(where.id)));
  rec.exercises[where.exercise] = change(rec.exercises[where.exercise] ?? emptyExercise(rec.version));
  rec.updatedAt = now();
  return { lessons: { ...s.lessons, [where.id]: rec }, last: { ...s.last, learn: where.id } };
}
function withProject(s: Py2Progress, id: string, change: (p: Py2Project) => void): Partial<Py2Progress> {
  const p = structuredClone(s.projects[id] ?? emptyProject());
  change(p);
  p.updatedAt = now();
  return { projects: { ...s.projects, [id]: p }, last: { ...s.last, project: id } };
}
function settle(rec: Py2Lesson, challenges: string[], lesson: string) {
  if (!rec.masteredAt && isLessonMastered(rec, challenges)) {
    rec.masteredAt = now();
    track("lesson_completed", { subject: "python", lesson });
  }
}
/** Coarse ids for analytics, matching SQL's event shapes. */
const whereProps = (where: Where) =>
  where.kind === "question" ? { subject: "python", surface: "practice", question: where.id } : { subject: "python", lesson: where.id, challenge: where.exercise };

export const usePy2 = create<Py2Progress & Actions>()(
  persist(
    (set) => ({
      ...emptyProgress(),
      setDraft: (where, code) => set((s) => withExercise(s, where, (e) => ({ ...e, draft: code.slice(0, MAX_DRAFT) }))),
      takeHelp: (where, kind) =>
        set((s) => withExercise(s, where, (e) => {
          if (kind === "hint") track("hint_used", whereProps(where));
          return { ...e, attempt: { hints: kind === "hint" ? Math.min(3, e.attempt.hints + 1) : e.attempt.hints, revealed: e.attempt.revealed || kind === "answer" } };
        })),
      freshAttempt: (where) => set((s) => withExercise(s, where, (e) => ({ ...e, attempt: emptyAttempt() }))),
      recordCheck: (where, ok, lessonChallenges) =>
        set((s) => {
          const patch = withExercise(s, where, (e) => {
            e.checks += 1;
            e.lastCheckAt = now();
            if (ok) {
              if (!e.solved) track("challenge_passed", { ...whereProps(where), guided: isGuided(e.attempt) });
              if (isGuided(e.attempt)) e.assisted = true;
              else if (!e.solved) {
                e.solved = true;
                e.solvedAt = now();
              }
            }
            return e;
          });
          if (where.kind === "lesson" && lessonChallenges) settle(patch.lessons![where.id], lessonChallenges, where.id);
          return patch;
        }),
      answerConcept: (lesson, question, choice, allCorrect, challenges) =>
        set((s) => {
          const rec = structuredClone(s.lessons[lesson] ?? emptyLesson(contentVersion(lesson)));
          rec.concept.answers[question] = choice;
          rec.concept.attempts += 1;
          if (allCorrect) rec.concept.passed = true;
          rec.updatedAt = now();
          settle(rec, challenges, lesson);
          return { lessons: { ...s.lessons, [lesson]: rec }, last: { ...s.last, learn: lesson } };
        }),
      setTab: (lesson, tab) =>
        set((s) => {
          const rec = structuredClone(s.lessons[lesson] ?? emptyLesson(contentVersion(lesson)));
          rec.tab = tab;
          return { lessons: { ...s.lessons, [lesson]: rec } };
        }),
      setProjectFile: (project, file, text) => set((s) => withProject(s, project, (p) => void (p.files[file] = text.slice(0, MAX_DRAFT)))),
      setProjectFiles: (project, files) => set((s) => withProject(s, project, (p) => void (p.files = { ...files }))),
      takeProjectHelp: (project) => {
        track("hint_used", { subject: "python", surface: "project", project });
        set((s) => withProject(s, project, (p) => void (p.attempt = { ...p.attempt, hints: Math.min(3, p.attempt.hints + 1) })));
      },
      recordMilestone: (project, milestone, ok) =>
        set((s) =>
          withProject(s, project, (p) => {
            const m = p.milestones[milestone] ?? { passedAt: 0, assisted: false, checks: 0 };
            m.checks += 1;
            if (ok && !m.passedAt) {
              m.passedAt = now();
              track("milestone_passed", { subject: "python", project, milestone, guided: isGuided(p.attempt) });
              // Help taken while working on this milestone stays with it.
              m.assisted = isGuided(p.attempt);
              p.attempt = emptyAttempt();
            }
            p.milestones[milestone] = m;
          }),
        ),
      setCurrentMilestone: (project, milestone) => set((s) => withProject(s, project, (p) => void (p.current = milestone))),
      setPlayground: (patch) => set((s) => ({ playground: { ...s.playground, ...patch } })),
      touch: (section, id) => set((s) => ({ last: { ...s.last, [section]: id } })),
    }),
    {
      name: PY2_PROGRESS_KEY,
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => guarded),
      partialize: (s): Py2Progress => ({ version: 2, lessons: s.lessons, questions: s.questions, projects: s.projects, playground: s.playground, last: s.last }),
      merge: (persisted, current) => ({ ...current, ...normalizePy2(persisted) }),
    },
  ),
);

async function hydrate() {
  await usePy2.persist.rehydrate();
  hydrated = true;
  listeners.forEach((l) => l());
}

let started = false;
/** Load saved progress once and follow changes from other tabs. True once loaded. */
export function usePy2Ready(): boolean {
  useEffect(() => {
    if (started) return;
    started = true;
    void hydrate();
    window.addEventListener("storage", (e) => {
      if (e.key === PY2_PROGRESS_KEY && e.storageArea === localStorage) void usePy2.persist.rehydrate();
    });
  }, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => hydrated,
    () => false,
  );
}

/** Test hook: mark storage as loaded without React. */
export function __markPy2Hydrated() {
  hydrated = true;
}
