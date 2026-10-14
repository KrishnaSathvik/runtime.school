"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/**
 * Python learning progress, kept apart from SQL: its own localStorage key, its own schema,
 * no reads or writes of sql-studio-v1. Lessons are keyed by stable refs ("python:<slug>").
 *
 * Mastery follows the SQL rule: every challenge solved without help, plus the concept check.
 * Only Check answer records results; Run never does.
 */

export const PY_PROGRESS_KEY = "runtime-python-v1";

export type PyHelpKind = "hint" | "answer";
export type PyAttempt = { guided: boolean; hints: number; revealed: boolean; exposures: { kind: PyHelpKind; time: number }[] };
export type PyChallengeRecord = {
  /** Solved at least once without hints or the answer. */
  solved: boolean;
  solvedAt: number;
  /** Solved at least once with help (does not count toward mastery). */
  assisted: boolean;
  checks: number;
  passes: number;
  lastCheckAt: number;
};
export type PyQuizRecord = { passed: boolean; passedAt: number; attempts: number; answers: Record<string, number> };
export type PyLessonRecord = {
  drafts: Record<string, string>;
  attempts: Record<string, PyAttempt>;
  challenges: Record<string, PyChallengeRecord>;
  quiz: PyQuizRecord;
  tab: string | null;
  masteredAt: number;
  updatedAt: number;
};
export type PyProgress = { version: 1; lessons: Record<string, PyLessonRecord>; lastLesson: string | null };

export const emptyAttempt = (): PyAttempt => ({ guided: false, hints: 0, revealed: false, exposures: [] });
const emptyChallenge = (): PyChallengeRecord => ({ solved: false, solvedAt: 0, assisted: false, checks: 0, passes: 0, lastCheckAt: 0 });
export const emptyLesson = (): PyLessonRecord => ({
  drafts: {},
  attempts: {},
  challenges: {},
  quiz: { passed: false, passedAt: 0, attempts: 0, answers: {} },
  tab: null,
  masteredAt: 0,
  updatedAt: 0,
});
const emptyProgress = (): PyProgress => ({ version: 1, lessons: {}, lastLesson: null });

/** Mastery: every listed challenge solved without help, and the concept check passed. */
export function isPyLessonMastered(rec: PyLessonRecord | undefined, challengeIds: string[]): boolean {
  if (!rec) return false;
  return challengeIds.length > 0 && challengeIds.every((id) => rec.challenges[id]?.solved) && rec.quiz.passed;
}

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Normalise saved data so a corrupt or partial record never crashes the app. */
export function normalizePyProgress(raw: unknown): PyProgress {
  const out = emptyProgress();
  if (!obj(raw) || !obj(raw.lessons)) return out;
  for (const [ref, r] of Object.entries(raw.lessons)) {
    if (!ref.startsWith("python:") || !obj(r)) continue;
    const rec = emptyLesson();
    if (obj(r.drafts)) for (const [k, v] of Object.entries(r.drafts)) if (typeof v === "string") rec.drafts[k] = v.slice(0, 100_000);
    if (obj(r.attempts))
      for (const [k, a] of Object.entries(r.attempts))
        if (obj(a))
          rec.attempts[k] = {
            guided: a.guided === true,
            hints: Math.min(10, num(a.hints)),
            revealed: a.revealed === true,
            exposures: Array.isArray(a.exposures) ? a.exposures.filter(obj).map((e) => ({ kind: e.kind === "answer" ? "answer" : "hint", time: num(e.time) })) : [],
          };
    if (obj(r.challenges))
      for (const [k, c] of Object.entries(r.challenges))
        if (obj(c))
          rec.challenges[k] = { solved: c.solved === true, solvedAt: num(c.solvedAt), assisted: c.assisted === true, checks: num(c.checks), passes: num(c.passes), lastCheckAt: num(c.lastCheckAt) };
    if (obj(r.quiz)) {
      rec.quiz = { passed: r.quiz.passed === true, passedAt: num(r.quiz.passedAt), attempts: num(r.quiz.attempts), answers: {} };
      if (obj(r.quiz.answers)) for (const [k, v] of Object.entries(r.quiz.answers)) if (typeof v === "number") rec.quiz.answers[k] = v;
    }
    rec.tab = typeof r.tab === "string" ? r.tab : null;
    rec.masteredAt = num(r.masteredAt);
    rec.updatedAt = num(r.updatedAt);
    out.lessons[ref] = rec;
  }
  out.lastLesson = typeof raw.lastLesson === "string" && raw.lastLesson.startsWith("python:") ? raw.lastLesson : null;
  return out;
}

// Writes are ignored until saved progress has loaded, so an early write can't replace it.
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

type Actions = {
  setDraft: (ref: string, challenge: string, code: string) => void;
  setTab: (ref: string, tab: string) => void;
  takeHelp: (ref: string, challenge: string, kind: PyHelpKind) => void;
  /** Start a fresh, unassisted attempt. The draft is reset separately, through the editor. */
  freshAttempt: (ref: string, challenge: string) => void;
  /** Record a finished Check answer. Never call for Run. */
  recordCheck: (ref: string, challenge: string, ok: boolean, challengeIds: string[]) => void;
  answerQuiz: (ref: string, question: string, choice: number, allCorrect: boolean, challengeIds: string[]) => void;
};

function withLesson(s: PyProgress, ref: string, change: (rec: PyLessonRecord) => PyLessonRecord): Partial<PyProgress> {
  const rec = change(structuredClone(s.lessons[ref] ?? emptyLesson()));
  rec.updatedAt = Date.now();
  return { lessons: { ...s.lessons, [ref]: rec }, lastLesson: ref };
}

function settleMastery(rec: PyLessonRecord, challengeIds: string[]): PyLessonRecord {
  if (!rec.masteredAt && isPyLessonMastered(rec, challengeIds)) rec.masteredAt = Date.now();
  return rec;
}

export const usePyProgress = create<PyProgress & Actions>()(
  persist(
    (set) => ({
      ...emptyProgress(),
      setDraft: (ref, challenge, code) =>
        set((s) => withLesson(s, ref, (rec) => ({ ...rec, drafts: { ...rec.drafts, [challenge]: code.slice(0, 100_000) } }))),
      setTab: (ref, tab) => set((s) => withLesson(s, ref, (rec) => ({ ...rec, tab }))),
      takeHelp: (ref, challenge, kind) =>
        set((s) =>
          withLesson(s, ref, (rec) => {
            const a = rec.attempts[challenge] ?? emptyAttempt();
            rec.attempts[challenge] = {
              guided: true,
              hints: kind === "hint" ? a.hints + 1 : a.hints,
              revealed: a.revealed || kind === "answer",
              exposures: [...a.exposures, { kind, time: Date.now() }],
            };
            return rec;
          }),
        ),
      freshAttempt: (ref, challenge) =>
        set((s) => withLesson(s, ref, (rec) => ({ ...rec, attempts: { ...rec.attempts, [challenge]: emptyAttempt() } }))),
      recordCheck: (ref, challenge, ok, challengeIds) =>
        set((s) =>
          withLesson(s, ref, (rec) => {
            const c = rec.challenges[challenge] ?? emptyChallenge();
            const guided = !!rec.attempts[challenge]?.guided;
            const now = Date.now();
            c.checks += 1;
            c.lastCheckAt = now;
            if (ok) {
              c.passes += 1;
              if (guided) c.assisted = true;
              else if (!c.solved) {
                c.solved = true;
                c.solvedAt = now;
              }
            }
            rec.challenges[challenge] = c;
            return settleMastery(rec, challengeIds);
          }),
        ),
      answerQuiz: (ref, question, choice, allCorrect, challengeIds) =>
        set((s) =>
          withLesson(s, ref, (rec) => {
            rec.quiz.attempts += 1;
            rec.quiz.answers[question] = choice;
            if (allCorrect && !rec.quiz.passed) {
              rec.quiz.passed = true;
              rec.quiz.passedAt = Date.now();
            }
            return settleMastery(rec, challengeIds);
          }),
        ),
    }),
    {
      name: PY_PROGRESS_KEY,
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => guarded),
      partialize: (s): PyProgress => ({ version: 1, lessons: s.lessons, lastLesson: s.lastLesson }),
      merge: (persisted, current) => ({ ...current, ...normalizePyProgress(persisted) }),
    },
  ),
);

async function hydrate() {
  await usePyProgress.persist.rehydrate();
  hydrated = true;
  listeners.forEach((l) => l());
}

let started = false;
/** Load saved Python progress once, and follow changes made in other tabs. Returns true once loaded. */
export function usePyProgressReady(): boolean {
  useEffect(() => {
    if (!started) {
      started = true;
      void hydrate();
      window.addEventListener("storage", (e) => {
        if (e.key === PY_PROGRESS_KEY && e.storageArea === localStorage) void usePyProgress.persist.rehydrate();
      });
    }
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
