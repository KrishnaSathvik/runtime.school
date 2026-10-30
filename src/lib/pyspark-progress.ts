"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/**
 * PySpark progress and drafts, kept in this browser only (no account), like SQL and Python. Separate key and store:
 * nothing here reads or writes SQL or Python progress.
 */
export const PS_PROGRESS_KEY = "rt-pyspark-v1";

/** One gradable item: a practice question, a lesson challenge or a project step (keyed by item ID). */
export type PsQuestionRecord = { draft?: string; hints: number; solved?: boolean; assisted?: boolean; checkedAt?: number };
export type PsLessonRecord = { tab?: string; concept?: { answers: Record<string, number>; passed: boolean } };
export type PsProjectRecord = { code?: string; current?: string; passed: Record<string, number> };
type State = {
  questions: Record<string, PsQuestionRecord>;
  lessons: Record<string, PsLessonRecord>;
  projects: Record<string, PsProjectRecord>;
  playground: Record<string, string>;
  setDraft: (id: string, code: string) => void;
  takeHint: (id: string) => void;
  recordCheck: (id: string, passed: boolean) => void;
  setPlayground: (dataset: string, code: string) => void;
  setLessonTab: (lesson: string, tab: string) => void;
  answerConcept: (lesson: string, answers: Record<string, number>, passed: boolean) => void;
  setProjectCode: (project: string, code: string) => void;
  setCurrentStep: (project: string, step: string) => void;
  passStep: (project: string, step: string) => void;
  /** Start a project over: its starter file, no passed steps. Asked for explicitly, never a side effect. */
  resetProject: (project: string, starter: string, firstStep: string) => void;
};

/** Mastered: every challenge solved without hints, and the concept check passed (as in Python). */
export function isLessonMastered(questions: Record<string, PsQuestionRecord>, lesson: PsLessonRecord | undefined, challenges: string[]): boolean {
  return challenges.every((c) => questions[c]?.solved) && !!lesson?.concept?.passed;
}

let hydrated = false;
let started = false;
const listeners = new Set<() => void>();

const guarded: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  // Writes wait until saved progress has loaded, so an early write can't replace it.
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
    } catch {
      /* blocked */
    }
  },
};

const blank = (): PsQuestionRecord => ({ hints: 0 });

export const usePs = create<State>()(
  persist(
    (set) => ({
      questions: {},
      lessons: {},
      projects: {},
      playground: {},
      setDraft: (id, code) => set((s) => ({ questions: { ...s.questions, [id]: { ...(s.questions[id] ?? blank()), draft: code } } })),
      takeHint: (id) => set((s) => {
        const r = s.questions[id] ?? blank();
        return { questions: { ...s.questions, [id]: { ...r, hints: r.hints + 1 } } };
      }),
      recordCheck: (id, passed) => set((s) => {
        const r = s.questions[id] ?? blank();
        if (!passed) return { questions: { ...s.questions, [id]: { ...r, checkedAt: Date.now() } } };
        // Solved on your own only without hints, like Python practice.
        const own = r.hints === 0;
        return { questions: { ...s.questions, [id]: { ...r, checkedAt: Date.now(), solved: r.solved || own, assisted: r.assisted || !own } } };
      }),
      setPlayground: (dataset, code) => set((s) => ({ playground: { ...s.playground, [dataset]: code } })),
      setLessonTab: (lesson, tab) => set((s) => ({ lessons: { ...s.lessons, [lesson]: { ...s.lessons[lesson], tab } } })),
      answerConcept: (lesson, answers, passed) => set((s) => {
        const was = s.lessons[lesson]?.concept?.passed ?? false;
        return { lessons: { ...s.lessons, [lesson]: { ...s.lessons[lesson], concept: { answers, passed: was || passed } } } };
      }),
      setProjectCode: (project, code) => set((s) => ({ projects: { ...s.projects, [project]: { ...(s.projects[project] ?? { passed: {} }), code } } })),
      setCurrentStep: (project, step) => set((s) => ({ projects: { ...s.projects, [project]: { ...(s.projects[project] ?? { passed: {} }), current: step } } })),
      passStep: (project, step) => set((s) => {
        const r = s.projects[project] ?? { passed: {} };
        return { projects: { ...s.projects, [project]: { ...r, passed: { ...r.passed, [step]: r.passed[step] ?? Date.now() } } } };
      }),
      resetProject: (project, starter, firstStep) => set((s) => ({ projects: { ...s.projects, [project]: { code: starter, current: firstStep, passed: {} } } })),
    }),
    {
      name: PS_PROGRESS_KEY,
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => guarded),
      partialize: (s) => ({ questions: s.questions, lessons: s.lessons, projects: s.projects, playground: s.playground }),
    },
  ),
);

async function hydrate() {
  await usePs.persist.rehydrate();
  hydrated = true;
  listeners.forEach((l) => l());
}

/** True once this browser's saved PySpark progress has loaded. */
export function usePsReady(): boolean {
  useEffect(() => {
    if (started) return;
    started = true;
    void hydrate();
    window.addEventListener("storage", (e) => {
      if (e.key === PS_PROGRESS_KEY && e.storageArea === localStorage) void usePs.persist.rehydrate();
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
