"use client";

import { mergeStorageWrite } from "./storage-merge";
import { attemptContext, track } from "./analytics";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { courseOrder, lessons } from "@/content";
import { BRAND_NAME } from "@/platform/brand";

const STAGES: Stage[] = ["understand", "practice", "review", "complete"];

/**
 * Hydration runs from a parent effect, after child effects. zustand's persist
 * writes on every set(), so any pre-hydration write would replace saved
 * progress with an empty state. Writes are ignored until hydration finishes.
 */
let hydrated = false;
const hydrationListeners = new Set<() => void>();
let storageSnapshot: unknown = null;
let storageFailed = false;
const saveListeners = new Set<() => void>();
function storageStatus(failed: boolean) {
  storageFailed = failed;
  saveListeners.forEach(cb => cb());
}
export function useDraftSaveFailed() {
  return useSyncExternalStore(cb => { saveListeners.add(cb); return () => { saveListeners.delete(cb); }; }, () => storageFailed, () => false);
}
const guardedStorage: StateStorage = {
  getItem: (name) => {
    try {
      const raw=localStorage.getItem(name);
      storageSnapshot=raw?JSON.parse(raw):null;
      return raw;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (!hydrated) return;
    try {
      const remote=localStorage.getItem(name);
      const merged=mergeStorageWrite(storageSnapshot,JSON.parse(value),remote?JSON.parse(remote):null);
      localStorage.setItem(name,JSON.stringify(merged));
      storageSnapshot=JSON.parse(value);
      storageStatus(false);
    } catch {
      // Keep drafts in memory and expose a persistent retry state.
      storageStatus(true);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
      storageSnapshot=null;
    } catch {
      // ignore
    }
  },
};

function markHydrated() {
  hydrated = true;
  hydrationListeners.forEach((cb) => cb());
}

/** True once saved progress has been loaded from this browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => {
      hydrationListeners.add(cb);
      return () => hydrationListeners.delete(cb);
    },
    () => hydrated,
    () => false,
  );
}

export type Stage = "understand" | "practice" | "review" | "complete";
export type ThemePreference = "system" | "light" | "dark";

export type LessonStats = {
  attempts: number;
  correct: number;
  solved: number[];
  last: number;
  errors: number;
  check: boolean;
  legacy: boolean;
  masteredAt: number;
  categories: Record<string, number>;
  quizAttempts: number;
};

export type AttemptState = {
  guided: boolean;
  hints: number;
  revealed: boolean;
  fresh: boolean;
  epoch: number;
  exposures: Array<{ kind: string; time: number; epoch: number }>;
};

export type MilestoneState = {
  solved: number[];
  check: boolean;
  legacy?: boolean;
  queries: Record<number, string>;
  results: Record<number, unknown>;
  updated: number;
  /** Optional written findings for this milestone (learner's own notes). */
  notes?: string;
};

export type ProjectState = {
  started: number;
  milestones: Record<number, MilestoneState>;
  last: number;
};

export type ReviewOutcome = {
  time: number;
  ok: boolean;
  quiz?: boolean;
  sql?: boolean;
  /** Practised before it was due: recorded, but the schedule is unchanged. */
  early?: boolean;
};

export type ReviewSessionState = {
  version: 1;
  cycle: string;
  variant: number;
  stage: "recall" | "write" | "done";
  choice: number | null;
  attempts: number;
  lastFeedback: string | null;
  confirmReveal: boolean;
  revealed: boolean;
  completion?: { ok: boolean; state: ReviewState; early: boolean; nextCycle: string };
};

export function reviewCycle(review: ReviewState | undefined): string {
  return `${review?.due ?? 0}-${review?.history.length ?? 0}-${review?.history.at(-1)?.time ?? 0}`;
}

export function resumableReview(session: ReviewSessionState | undefined, review: ReviewState | undefined, now = Date.now()): boolean {
  if (!session) return false;
  return session.stage === "done"
    ? session.completion?.nextCycle === reviewCycle(review) && (review?.due ?? 0) > now
    : session.cycle === reviewCycle(review);
}

export type ReviewState = { level: number; due: number; history: ReviewOutcome[] };

export type Placement = {
  index: number;
  answers: Array<{ ok: boolean; time: number }>;
  done: boolean;
};

export type Recommendation = {
  id: number;
  project: number | null;
  reason: string;
  kind: "resume" | "lesson" | "review" | "project" | "placement";
};

/** Days until the next review after reaching each level (original REVIEW_DAYS). */
export const REVIEW_DAYS = [1, 3, 7, 21];
const DAY = 86400000;

/**
 * Optional diagnostic: first challenge of these lessons, in skill-ladder order.
 * Slot indexes are stable for saved placement answers — do not reorder this array.
 * Ratios (32) stay before the join question in the check even though the course
 * now teaches joins before ratios.
 */
export const PLACEMENT_IDS = [0, 3, 5, 10, 32, 14];

/** All-correct start; pinned so a later courseOrder edit cannot move it. */
const PLACEMENT_ALL_PASS_START = 15;
/** Join lesson checked when the ratio slot is the first miss. */
const PLACEMENT_JOIN_LESSON = 14;
/** Index of the ratios lesson inside PLACEMENT_IDS. */
const PLACEMENT_RATIO_SLOT = 4;

export function placementStart(
  p: Placement | null,
  options?: { joinMastered?: boolean },
): number | null {
  if (!p?.done) return null;
  const firstMiss = p.answers.findIndex((a) => !a?.ok);
  if (firstMiss === -1) return PLACEMENT_ALL_PASS_START;
  if (firstMiss === PLACEMENT_RATIO_SLOT && !options?.joinMastered) {
    return PLACEMENT_JOIN_LESSON;
  }
  return PLACEMENT_IDS[firstMiss];
}

export function isReviewDue(r: ReviewState | undefined, now = Date.now()): boolean {
  return !!r && r.due <= now;
}

/** Progress on an independent question-bank problem (never counts toward lesson mastery). */
export type QuestionCheck = { guided?:boolean; input:string; version:number; epoch:number; message:string; ok:boolean; time:number };
export type QuestionProgress = {
  epoch?: number;
  lastCheck?: QuestionCheck;
  checks?: QuestionCheck[];
  attempts: number;
  /** Solved without hints or a revealed solution. */
  solved: boolean;
  /** Solved at least once with help. */
  guidedSolved: boolean;
  firstSolvedAt: number;
  lastAt: number;
  /** Current attempt state (cleared by a fresh attempt). */
  hints: number;
  revealed: boolean;
};

export type QuestionStatus = "not-attempted" | "attempted" | "guided" | "solved";

export function questionStatus(p: QuestionProgress | undefined): QuestionStatus {
  if (!p) return "not-attempted";
  if (p.solved) return "solved";
  if (p.guidedSolved || p.hints > 0 || p.revealed) return "guided";
  if (p.attempts > 0) return "attempted";
  return "not-attempted";
}

export type LearningState = {
  version: 3;
  stats: Record<string, LessonStats>;
  history: Array<{
    id: number;
    ok: boolean;
    guided?: boolean;
    variant?: number;
    category?: string | null;
    project?: number | null;
    time: number;
  }>;
  drafts: Record<string, string>;
  attempts: Record<string, AttemptState>;
  sessions: Record<string, { stage?: Stage; variant?: number }>;
  projects: Record<number, ProjectState>;
  reviews: Record<number, ReviewState>;
  reviewSessions: Record<number, ReviewSessionState>;
  preferences: { theme: ThemePreference; collapsed: boolean };
  active: {
    id: number;
    variant: number;
    stage: Stage;
    project: number | null;
  } | null;
  lastProject: number | null;
  placement: Placement | null;
  questions: Record<string, QuestionProgress>;
  /** Slug of the last opened question-bank problem. */
  lastQuestion: string | null;
  lastQuestionAt: number;
  lastLessonAt: number;
  /**
   * Practice tracks the learner has started. Only position is stored here:
   * completion always comes from the canonical question records, so solving a
   * question anywhere counts in every track that contains it.
   */
  tracks: Record<string, { startedAt: number; lastQuestionId: string | null; lastAt: number }>;
  lastTrack: string | null;
};

const emptyStats = (): LessonStats => ({
  attempts: 0,
  correct: 0,
  solved: [],
  last: 0,
  errors: 0,
  check: false,
  legacy: false,
  masteredAt: 0,
  categories: {},
  quizAttempts: 0,
});

const emptyLearning = (): LearningState => ({
  version: 3,
  stats: {},
  history: [],
  drafts: {},
  attempts: {},
  sessions: {},
  projects: {},
  reviews: {},
  reviewSessions: {},
  preferences: { theme: "system", collapsed: false },
  active: null,
  lastProject: null,
  placement: null,
  questions: {},
  lastQuestion: null,
  lastQuestionAt: 0,
  lastLessonAt: 0,
  tracks: {},
  lastTrack: null,
});

function latestQuestion(id:string, local:QuestionProgress):QuestionProgress {
  try {
    const remote=JSON.parse(localStorage.getItem("sql-studio-v1")??"null")?.state?.questions?.[id];
    return remote ? mergeStorageWrite(undefined,local,remote) as QuestionProgress : local;
  } catch {return local;}
}

function emptyQuestion(): QuestionProgress {
  return { attempts: 0, solved: false, guidedSolved: false, firstSolvedAt: 0, lastAt: 0, hints: 0, revealed: false };
}

function recordOf(stats: Record<string, LessonStats>, id: number): LessonStats {
  return stats[id] ?? emptyStats();
}

export function isMastered(stats: LessonStats): boolean {
  return stats.solved.length >= 2 && (stats.check || stats.legacy);
}

type Store = LearningState & {
  setTheme: (theme: ThemePreference) => void;
  setCollapsed: (collapsed: boolean) => void;
  setActive: (active: LearningState["active"]) => void;
  setDraft: (key: string, sql: string) => void;
  setMilestoneNotes: (project: number, lessonId: number, notes: string) => void;
  getDraft: (key: string) => string | undefined;
  markGuided: (
    key: string,
    kind: "hint" | "reveal",
  ) => void;
  recordCheck: (args: {
    lessonId: number;
    variant: number;
    project: number | null;
    ok: boolean;
    guided: boolean;
    query: string;
    result?: { columns: string[]; values: unknown[][] } | null;
    category?: string | null;
  }) => void;
  completeQuiz: (
    lessonId: number,
    project: number | null,
    choice: number,
  ) => { ok: boolean; complete: boolean };
  freshAttempt: (key: string, draft: string, starter: string) => void;
  setSession: (
    lessonId: number,
    project: number | null,
    stage: Stage,
    variant: number,
  ) => void;
  exportProgress: () => LearningState & { exported_at: string };
  importProgress: (data: unknown) => void;
  resetProgress: () => void;
  recommendation: () => Recommendation;
  beginReview: (lessonId: number) => ReviewSessionState;
  updateReviewSession: (lessonId: number, cycle: string, patch: Partial<Pick<ReviewSessionState, "stage" | "choice" | "attempts" | "lastFeedback" | "confirmReveal">>) => void;
  completeReview: (lessonId: number, result: { quiz: boolean; sql: boolean }, cycle?: string, revealed?: boolean) => ReviewState | null;
  answerPlacement: (index: number, ok: boolean) => void;
  advancePlacement: () => void;
  restartPlacement: () => void;
  openQuestion: (slug: string) => void;
  touchTrack: (trackId: string, questionId: string | null) => void;
  recordQuestionCheck: (id: string, ok: boolean, detail?: Omit<QuestionCheck, "ok" | "time">) => void;
  questionHint: (id: string) => void;
  revealQuestion: (id: string) => void;
  freshQuestionAttempt: (id: string, draftKey: string, starter: string) => void;
  summary: () => {
    mastery: number;
    independent: number;
    due: number;
  };
};

function attemptKey(lessonId: number, variant: number, project: number | null) {
  return `${project === null ? "lesson" : `project-${project}`}:${lessonId}:${variant}`;
}

function draftKey(lessonId: number, variant: number, project: number | null) {
  return project === null
    ? `sql-lesson-${lessonId}-${variant}`
    : `sql-project-${project}-${lessonId}-${variant}`;
}

function sessionKey(lessonId: number, project: number | null) {
  return `activity:${project}:${lessonId}`;
}

export { attemptKey, draftKey, sessionKey };

export function milestoneDone(m: MilestoneState | undefined): boolean {
  return !!m && (m.solved?.length ?? 0) >= 2 && (m.check === true || m.legacy === true);
}

/** Mirrors the original classifyFailure() so weak-area tracking survives migration. */
export function classifyFailure(response: {
  error?: string;
  grade?: { message: string; variationFailed?: boolean } | null;
}): string {
  if (response.error) {
    return /no such|ambiguous|syntax/i.test(response.error)
      ? "SQL syntax or schema"
      : "Execution";
  }
  const m = response.grade?.message ?? "";
  if (/column/i.test(m)) return "Output columns";
  if (/rows; got/i.test(m)) return "Row count";
  if (/order/i.test(m)) return "Ordering";
  if (/constraint|object|CREATE|INSERT|UPDATE/i.test(m)) return "Database contract";
  if (response.grade?.variationFailed) return "Changed data";
  return "Values or relationships";
}

function scheduleMastery(
  r: LessonStats,
  id: number,
  reviews: LearningState["reviews"],
): LearningState["reviews"] {
  if (isMastered(r) && !r.masteredAt) {
    r.masteredAt = Date.now();
    return { ...reviews, [id]: { level: 0, due: Date.now() + 86400000, history: [] } };
  }
  return reviews;
}

export const useLearning = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyLearning(),
      setTheme: (theme) =>
        set((s) => ({ preferences: { ...s.preferences, theme } })),
      setCollapsed: (collapsed) =>
        set((s) => ({ preferences: { ...s.preferences, collapsed } })),
      setActive: (active) => set({ active }),
      setDraft: (key, sql) =>
        set((s) => ({ drafts: { ...s.drafts, [key]: sql } })),
      getDraft: (key) => get().drafts[key],
      setMilestoneNotes: (project, lessonId, notes) =>
        set((s) => {
          const p = s.projects[project] ?? { started: Date.now(), milestones: {}, last: lessonId };
          const m = p.milestones[lessonId] ?? { solved: [], check: false, queries: {}, results: {}, updated: 0 };
          return {
            projects: {
              ...s.projects,
              [project]: {
                ...p,
                milestones: { ...p.milestones, [lessonId]: { ...m, notes: notes.slice(0, 20000), updated: Date.now() } },
              },
            },
          };
        }),
      markGuided: (key, kind) => {
        set((s) => {
          const current = s.attempts[key] ?? {
            guided: false,
            hints: 0,
            revealed: false,
            fresh: false,
            epoch: 0,
            exposures: [],
          };
          const next = {
            ...current,
            guided: true,
            hints: kind === "hint" ? Math.min(3, current.hints + 1) : current.hints,
            revealed: kind === "reveal" ? true : current.revealed,
            exposures: [
              ...current.exposures,
              { kind, time: Date.now(), epoch: current.epoch },
            ],
          };
          return { attempts: { ...s.attempts, [key]: next } };
        });
        if (kind === "hint") {
          const ctx = attemptContext(key);
          if (ctx) {
            track("hint_used", {
              subject: ctx.subject,
              lesson: ctx.lessonId,
              challenge: ctx.challenge,
              project: ctx.projectId,
            });
          }
        }
      },
      recordCheck: ({ lessonId, variant, project, ok, guided, query, result, category }) => {
        const prior = get().stats[lessonId];
        const wasMastered = prior ? isMastered(prior) : false;
        set((s) => {
          const stats = { ...s.stats };
          const r = { ...recordOf(stats, lessonId), solved: [...recordOf(stats, lessonId).solved] };
          r.attempts += 1;
          r.last = Date.now();
          if (ok) {
            r.correct += 1;
            // Original rule: a success clears the consecutive-error streak.
            r.errors = 0;
            if (!guided && !r.solved.includes(variant)) r.solved.push(variant);
          } else {
            r.errors += 1;
            if (category) {
              r.categories = {
                ...r.categories,
                [category]: (r.categories?.[category] ?? 0) + 1,
              };
            }
          }
          stats[lessonId] = r;
          const reviews = scheduleMastery(r, lessonId, s.reviews);

          const projectsState = { ...s.projects };
          if (project !== null) {
            const p = projectsState[project] ?? {
              started: Date.now(),
              milestones: {},
              last: lessonId,
            };
            const m = {
              ...(p.milestones[lessonId] ?? {
                solved: [],
                check: false,
                queries: {},
                results: {},
                updated: 0,
              }),
            };
            // Always record the last checked SQL draft. Verified evidence is only
            // replaced when Check answer succeeds — a later failed check must not
            // erase a previously verified result for the report.
            m.queries = { ...m.queries, [variant]: query };
            const prev = m.results[variant] as
              | { ok?: boolean; sql?: string; columns?: string[]; values?: unknown[][]; guided?: boolean; time?: number; truncated?: boolean; rowCount?: number }
              | undefined;
            if (ok) {
              const values = result?.values ?? [];
              const cap = 100;
              const truncated = values.length > cap;
              m.results = {
                ...m.results,
                [variant]: {
                  ok: true,
                  guided,
                  columns: result?.columns ?? [],
                  values: truncated ? values.slice(0, cap) : values,
                  time: Date.now(),
                  sql: query,
                  rowCount: values.length,
                  ...(truncated ? { truncated: true } : {}),
                },
              };
            } else if (!prev?.ok) {
              m.results = {
                ...m.results,
                [variant]: {
                  ok: false,
                  guided,
                  columns: result?.columns ?? [],
                  values: (result?.values ?? []).slice(0, 20),
                  time: Date.now(),
                  sql: query,
                },
              };
            }
            if (ok && !guided && !m.solved.includes(variant)) {
              m.solved = [...m.solved, variant];
            }
            m.updated = Date.now();
            p.milestones = { ...p.milestones, [lessonId]: m };
            p.last = lessonId;
            projectsState[project] = p;
          }

          const history = [
            ...s.history,
            {
              id: lessonId,
              variant,
              ok,
              guided,
              category: ok ? null : (category ?? null),
              project,
              time: Date.now(),
            },
          ].slice(-300);

          return {
            stats,
            reviews,
            history,
            projects: projectsState,
            lastProject: project ?? s.lastProject,
          };
        });
        if (ok) {
          track("challenge_passed", {
            subject: "sql",
            lesson: lessonId,
            challenge: variant + 1,
            project,
            guided,
          });
        }
        const after = get().stats[lessonId];
        if (after && isMastered(after) && !wasMastered) {
          track("lesson_completed", {
            subject: "sql",
            lesson: lessonId,
            project,
          });
        }
      },
      freshAttempt: (key, draft, starter) =>
        set((s) => {
          const current = s.attempts[key];
          const next: AttemptState = current
            ? {
                ...current,
                epoch: current.guided || current.revealed ? current.epoch + 1 : current.epoch,
                fresh: current.guided || current.revealed ? true : current.fresh,
                guided: false,
                hints: 0,
                revealed: false,
              }
            : { guided: false, hints: 0, revealed: false, fresh: false, epoch: 0, exposures: [] };
          return {
            attempts: { ...s.attempts, [key]: next },
            drafts: { ...s.drafts, [draft]: starter },
          };
        }),
      setSession: (lessonId, project, stage, variant) =>
        set((s) => ({
          active: { id: lessonId, variant, stage, project },
          lastLessonAt: Date.now(),
          sessions: {
            ...s.sessions,
            [sessionKey(lessonId, project)]: { stage, variant },
          },
          lastProject: project ?? s.lastProject,
        })),
      completeQuiz: (lessonId, project, choice) => {
        const quiz = lessons[lessonId]?.quiz;
        if (!quiz) return { ok: false, complete: false };
        const ok = choice === quiz.correct;
        const wasMastered = isMastered(recordOf(get().stats, lessonId));
        let complete = false;
        set((s) => {
          const stats = { ...s.stats };
          const r = { ...recordOf(stats, lessonId) };
          r.quizAttempts += 1;
          r.last = Date.now();
          if (ok) r.check = true;
          else r.errors += 1;
          stats[lessonId] = r;
          const reviews = scheduleMastery(r, lessonId, s.reviews);
          const projectsState = { ...s.projects };
          complete = ok && project === null && isMastered(r);
          if (project !== null && ok) {
            const p = projectsState[project] ?? {
              started: Date.now(),
              milestones: {},
              last: lessonId,
            };
            const m = {
              ...(p.milestones[lessonId] ?? {
                solved: [],
                check: false,
                queries: {},
                results: {},
                updated: 0,
              }),
            };
            m.check = true;
            p.milestones = { ...p.milestones, [lessonId]: m };
            projectsState[project] = p;
            complete = milestoneDone(m);
          }
          return { stats, reviews, projects: projectsState };
        });
        if (complete && !wasMastered) {
          track("lesson_completed", {
            subject: "sql",
            lesson: lessonId,
            project,
          });
        }
        return { ok, complete };
      },
      exportProgress: () => ({
        ...get(),
        exported_at: new Date().toISOString(),
      }),
      importProgress: (data) => {
        set(migrateLearning(validateImport(data)));
      },
      resetProgress: () => {
        const theme = get().preferences.theme;
        const collapsed = get().preferences.collapsed;
        set({ ...emptyLearning(), preferences: { theme, collapsed } });
      },
      beginReview: (lessonId) => {
        const s = get();
        const previous = s.reviewSessions[lessonId];
        if (resumableReview(previous, s.reviews[lessonId])) return previous;
        const session: ReviewSessionState = {
          version: 1, cycle: reviewCycle(s.reviews[lessonId]),
          variant: (s.reviews[lessonId]?.history.filter((h) => !h.early).length ?? 0) % 2,
          stage: "recall", choice: null, attempts: 0, lastFeedback: null, confirmReveal: false, revealed: false,
        };
        set({ reviewSessions: { ...s.reviewSessions, [lessonId]: session } });
        return session;
      },
      updateReviewSession: (lessonId, cycle, patch) => set((s) => {
        const current = s.reviewSessions[lessonId];
        if (!current || current.cycle !== cycle || current.stage === "done" || !resumableReview(current, s.reviews[lessonId])) return {};
        return { reviewSessions: { ...s.reviewSessions, [lessonId]: { ...current, ...patch } } };
      }),
      completeReview: (lessonId, result, cycle, revealed = false) => {
        const s = get();
        if (!isMastered(recordOf(s.stats, lessonId))) return null;
        const session = s.reviewSessions[lessonId];
        if (cycle !== undefined && (!session || session.stage !== "write" || session.cycle !== cycle || reviewCycle(s.reviews[lessonId]) !== cycle)) return null;
        const now = Date.now();
        const current: ReviewState = s.reviews[lessonId] ?? { level: 0, due: now, history: [] };
        const ok = result.quiz && result.sql;
        const early = current.due > now;
        // Lesson mastery is never changed by a review outcome.
        const next: ReviewState = early
          ? {
              ...current,
              history: [...current.history, { time: now, ok, ...result, early: true }].slice(-30),
            }
          : (() => {
              const level = ok ? Math.min(REVIEW_DAYS.length - 1, current.level + 1) : 0;
              return {
                level,
                due: now + REVIEW_DAYS[level] * DAY,
                history: [...current.history, { time: now, ok, ...result }].slice(-30),
              };
            })();
        set({ reviews: { ...s.reviews, [lessonId]: next },
          ...(cycle !== undefined && session ? { reviewSessions: { ...s.reviewSessions, [lessonId]: {
            ...session, stage: "done" as const, confirmReveal: false, revealed,
            completion: { ok, state: next, early, nextCycle: reviewCycle(next) },
          } } } : {}),
        });
        return next;
      },
      answerPlacement: (index, ok) =>
        set((s) => {
          const p: Placement = s.placement ?? { index: 0, answers: [], done: false };
          const answers = [...p.answers];
          // Keep the first success: re-checking a solved question can't undo it.
          answers[index] = { ok: ok || answers[index]?.ok === true, time: Date.now() };
          return { placement: { ...p, answers } };
        }),
      advancePlacement: () =>
        set((s) => {
          const p: Placement = s.placement ?? { index: 0, answers: [], done: false };
          const answers = [...p.answers];
          if (!answers[p.index]) answers[p.index] = { ok: false, time: Date.now() };
          const index = Math.min(PLACEMENT_IDS.length, p.index + 1);
          return { placement: { index, answers, done: index >= PLACEMENT_IDS.length } };
        }),
      restartPlacement: () => set((s) => ({
        placement: { index: 0, answers: [], done: false },
        drafts: Object.fromEntries(Object.entries(s.drafts).filter(([key]) => !key.startsWith("sql-placement-"))),
      })),
      openQuestion: (slug) => set({ lastQuestion: slug, lastQuestionAt: Date.now() }),
      touchTrack: (trackId, questionId) =>
        set((s) => {
          const now = Date.now();
          const t = s.tracks[trackId] ?? { startedAt: now, lastQuestionId: null, lastAt: now };
          return {
            tracks: { ...s.tracks, [trackId]: { ...t, lastQuestionId: questionId ?? t.lastQuestionId, lastAt: now } },
            lastTrack: trackId,
          };
        }),
      recordQuestionCheck: (id, ok, detail) => {
        const prior = get().questions[id];
        const guided = !!(prior && (prior.hints > 0 || prior.revealed));
        set((s) => {
          const p = latestQuestion(id,s.questions[id] ?? emptyQuestion());
          if(detail && detail.epoch !== (p.epoch??0)) return {};
          const wasGuided = p.hints > 0 || p.revealed;
          const now = Date.now();
          const next: QuestionProgress = {
            ...p,
            ...(detail ? { lastCheck: {...detail,ok,time:now,guided:wasGuided}, checks:[...(p.checks??[]),{...detail,ok,time:now,guided:wasGuided}].slice(-50) } : {}),
            attempts: p.attempts + 1,
            lastAt: now,
            solved: p.solved || (ok && !wasGuided),
            guidedSolved: p.guidedSolved || (ok && wasGuided),
            firstSolvedAt: p.firstSolvedAt || (ok && !wasGuided ? now : 0),
          };
          return { questions: { ...s.questions, [id]: next } };
        });
        if (ok) {
          track("challenge_passed", {
            subject: "sql",
            surface: "practice",
            question: id,
            guided,
          });
        }
      },
      questionHint: (id) => {
        set((s) => {
          const p = latestQuestion(id,s.questions[id] ?? emptyQuestion());
          return { questions: { ...s.questions, [id]: { ...p, hints: p.hints + 1, lastAt: Date.now() } } };
        });
        track("hint_used", { subject: "sql", surface: "practice", question: id });
      },
      revealQuestion: (id) =>
        set((s) => {
          const p = latestQuestion(id,s.questions[id] ?? emptyQuestion());
          return { questions: { ...s.questions, [id]: { ...p, revealed: true, lastAt: Date.now() } } };
        }),
      freshQuestionAttempt: (id, draftKey, starter) =>
        set((s) => {
          const p = latestQuestion(id,s.questions[id] ?? emptyQuestion());
          return {
            questions: { ...s.questions, [id]: { ...p, hints: 0, revealed: false, epoch:(p.epoch??0)+1, lastCheck:undefined, lastAt:Date.now() } },
            drafts: { ...s.drafts, [draftKey]: starter },
          };
        }),
      recommendation: () => {
        const s = get();
        const a = s.active;
        if (a && a.stage !== "complete") {
          const finished =
            a.project !== null
              ? milestoneDone(s.projects[a.project]?.milestones[a.id])
              : isMastered(recordOf(s.stats, a.id));
          if (!finished) {
            return {
              id: a.id,
              project: a.project,
              reason: "Continue where you left off.",
              kind: "resume",
            };
          }
        }
        const weak = lessons
          .filter((l) => recordOf(s.stats, l.id).errors >= 2 && !isMastered(recordOf(s.stats, l.id)))
          .sort((x, y) => recordOf(s.stats, y.id).errors - recordOf(s.stats, x.id).errors);
        if (weak[0]) {
          const prereq = weak[0].prereq?.find((id) => !isMastered(recordOf(s.stats, id)));
          return {
            id: prereq ?? weak[0].id,
            project: null,
            reason:
              prereq !== undefined
                ? "Review a related lesson to help with the problem you’re working on."
                : "Revisit this lesson, then try the challenge again.",
            kind: "lesson",
          };
        }
        const due = lessons
          .filter((l) => isMastered(recordOf(s.stats, l.id)) && isReviewDue(s.reviews[l.id]))
          .sort((x, y) => s.reviews[x.id].due - s.reviews[y.id].due);
        if (due[0]) {
          return {
            id: due[0].id,
            project: null,
            reason: "A lesson is ready to review. Try its question and query from memory.",
            kind: "review",
          };
        }
        const unfinished = courseOrder.find(
          (id) => recordOf(s.stats, id).attempts > 0 && !isMastered(recordOf(s.stats, id)),
        );
        if (unfinished !== undefined) {
          return { id: unfinished, project: null, reason: "Finish a concept you already started.", kind: "lesson" };
        }
        const start = placementStart(s.placement, {
          joinMastered: isMastered(recordOf(s.stats, PLACEMENT_JOIN_LESSON)),
        });
        const anyProgress = Object.values(s.stats).some((r) => r.attempts > 0);
        if (start !== null && !anyProgress) {
          return {
            id: start,
            project: null,
            reason: "Your suggested starting point from the placement check.",
            kind: "placement",
          };
        }
        const next = courseOrder.find((id) => !isMastered(recordOf(s.stats, id)));
        return {
          id: next ?? courseOrder[0],
          project: null,
          reason: next === undefined ? "Every lesson is mastered — revisit any concept or explore a project." : "Start the next concept on your learning path.",
          kind: "lesson",
        };
      },
      summary: () => {
        const s = get();
        const mastery = lessons.filter((l) =>
          isMastered(recordOf(s.stats, l.id)),
        ).length;
        const independent = Object.values(s.stats).reduce(
          (n, r) => n + (r?.solved?.length ?? 0),
          0,
        ) + Object.values(s.questions).filter((q) => q.solved).length;
        const due = lessons.filter(
          (l) => isMastered(recordOf(s.stats, l.id)) && isReviewDue(s.reviews[l.id]),
        ).length;
        return { mastery, independent, due };
      },
    }),
    {
      name: "sql-studio-v1",
      version: 3,
      skipHydration: true,
      storage: createJSONStorage(() => guardedStorage),
      // Saved data is normalised the same way imports are, so a corrupt or
      // older record never crashes the app.
      merge: (persisted, current) => {
        try {
          return { ...current, ...migrateLearning(persisted ?? {}) };
        } catch {
          return current;
        }
      },
      onRehydrateStorage: () => () => markHydrated(),
      partialize: (s) => ({
        version: 3 as const,
        stats: s.stats,
        history: s.history,
        drafts: s.drafts,
        attempts: s.attempts,
        sessions: s.sessions,
        projects: s.projects,
        reviews: s.reviews,
        reviewSessions: s.reviewSessions,
        preferences: s.preferences,
        active: s.active,
        lastProject: s.lastProject,
        placement: s.placement,
        questions: s.questions,
        lastQuestion: s.lastQuestion,
        lastQuestionAt: s.lastQuestionAt,
        lastLessonAt: s.lastLessonAt,
        tracks: s.tracks,
        lastTrack: s.lastTrack,
      }),
    },
  ),
);

export function lessonStatus(
  id: number,
  stats: LessonStats,
  reviews: LearningState["reviews"],
  guidedHistory: boolean,
): string {
  if (isMastered(stats) && (reviews[id]?.due ?? Infinity) <= Date.now()) {
    return "Ready to review";
  }
  if (isMastered(stats)) return "Mastered";
  if (!stats.solved.length && guidedHistory) return "Practicing with help";
  if (stats.solved.length || stats.attempts) return "In progress";
  return "Not started";
}

/* ------------------------------------------------------------------ */
/* Progress import + migration — ported from original learning-state.js */
/* ------------------------------------------------------------------ */

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Rejects files the original app rejected, with the same messages. */
export function validateImport(data: unknown): Raw {
  if (!isObj(data)) throw new Error(`This is not a ${BRAND_NAME} progress file.`);
  if (data.version !== undefined && ![1, 2, 3].includes(data.version as number)) {
    throw new Error("Unsupported progress version.");
  }
  if (!isObj(data.stats)) throw new Error(`This is not a ${BRAND_NAME} progress file.`);
  if (data.version === 3) {
    for (const key of ["drafts", "attempts", "sessions", "projects", "reviews", "reviewSessions", "questions", "tracks"]) {
      if (data[key] !== undefined && !isObj(data[key])) {
        throw new Error(`Invalid ${key} records.`);
      }
    }
    if (Object.values((data.attempts as Raw) ?? {}).some((a) => !isObj(a) || !Array.isArray(a.exposures))) {
      throw new Error("Invalid guidance history.");
    }
    if (Object.values((data.sessions as Raw) ?? {}).some((x) => !isObj(x))) {
      throw new Error("Invalid lesson sessions.");
    }
    if (Object.values((data.reviews as Raw) ?? {}).some((r) => !isObj(r) || !Number.isFinite(Number(r.due)))) {
      throw new Error("Invalid review schedule.");
    }
    if (Object.values((data.drafts as Raw) ?? {}).some((v) => typeof v !== "string" || v.length > 200000)) {
      throw new Error("Invalid SQL drafts.");
    }
  }
  return data;
}

function cleanStats(stats: unknown, version: unknown): Record<string, LessonStats> {
  const out: Record<string, LessonStats> = {};
  if (!isObj(stats)) return out;
  for (const [id, r] of Object.entries(stats)) {
    if (!lessons[Number(id)] || !isObj(r)) continue;
    const solved = [
      ...new Set((Array.isArray(r.solved) ? r.solved : []).filter((x) => x === 0 || x === 1)),
    ] as number[];
    out[id] = {
      attempts: Math.max(0, Number(r.attempts) || 0),
      correct: Math.max(0, Number(r.correct) || 0),
      solved,
      last: Number(r.last) || 0,
      errors: Math.max(0, Number(r.errors) || 0),
      check: r.check === true,
      // V1 had no concept checks: two solves there keeps mastery.
      legacy:
        r.legacy === true ||
        (version !== 2 && version !== 3 && Array.isArray(r.solved) && r.solved.length >= 2),
      masteredAt: Number(r.masteredAt) || 0,
      categories: isObj(r.categories) ? (r.categories as Record<string, number>) : {},
      quizAttempts: Math.max(0, Number(r.quizAttempts) || 0),
    };
  }
  return out;
}

function cleanQuestionChecks(input:unknown):QuestionCheck[] {
  return (Array.isArray(input)?input:[]).filter((x):x is QuestionCheck=>isObj(x) && typeof x.input==="string" && x.input.length<=200000 && typeof x.message==="string" && typeof x.ok==="boolean" && Number.isFinite(x.version) && Number.isFinite(x.epoch) && Number.isFinite(x.time)).slice(-50);
}

export function migrateLearning(input: unknown): LearningState {
  const src: Raw = isObj(input) ? input : {};
  const v3 = src.version === 3;
  const data = emptyLearning();
  data.stats = cleanStats(src.stats, src.version);
  data.history = (Array.isArray(src.history) ? src.history : [])
    .filter((h) => isObj(h) && lessons[Number(h.id)] && typeof h.ok === "boolean")
    .slice(-300) as LearningState["history"];

  if (v3) {
    for (const [k, v] of Object.entries(isObj(src.drafts) ? src.drafts : {})) {
      if (typeof v === "string" && v.length <= 200000) data.drafts[k] = v;
    }
    for (const [k, a] of Object.entries(isObj(src.attempts) ? src.attempts : {})) {
      if (!isObj(a) || !Array.isArray(a.exposures)) continue;
      data.attempts[k] = {
        guided: a.guided === true,
        hints: Math.min(3, Math.max(0, Number(a.hints) || 0)),
        revealed: a.revealed === true,
        fresh: a.fresh === true,
        epoch: Math.max(0, Number(a.epoch) || 0),
        exposures: (a.exposures as AttemptState["exposures"]).slice(-100),
      };
    }
    for (const [k, x] of Object.entries(isObj(src.sessions) ? src.sessions : {})) {
      if (!isObj(x)) continue;
      if (!k.startsWith("activity:") && !STAGES.includes(x.stage as Stage)) continue;
      data.sessions[k] = {
        stage: STAGES.includes(x.stage as Stage) ? (x.stage as Stage) : undefined,
        variant: x.variant === 1 ? 1 : 0,
      };
    }
    for (const [id, r] of Object.entries(isObj(src.reviews) ? src.reviews : {})) {
      if (!lessons[Number(id)] || !isObj(r) || !Number.isFinite(Number(r.due))) continue;
      data.reviews[Number(id)] = {
        level: Math.max(0, Math.min(3, Number(r.level ?? r.step) || 0)),
        due: Number(r.due),
        history: (Array.isArray(r.history) ? r.history : [])
          .filter((h): h is Raw => isObj(h) && typeof h.ok === "boolean")
          .map((h) => ({ time: Number(h.time) || 0, ok: h.ok as boolean, ...(h.early === true ? { early: true } : {}) }))
          .slice(-30),
      };
    }
    for (const [id, r] of Object.entries(isObj(src.reviewSessions) ? src.reviewSessions : {})) {
      const lesson = lessons[Number(id)];
      if (!lesson || !isObj(r) || r.version !== 1 || typeof r.cycle !== "string" || !["recall", "write", "done"].includes(r.stage as string) || ![0, 1].includes(r.variant as number)) continue;
      const choice = r.choice === null ? null : Number.isInteger(r.choice) && Number(r.choice) >= 0 && Number(r.choice) < lesson.quiz.options.length ? Number(r.choice) : null;
      if (r.stage === "write" && choice === null) continue;
      const completion = r.completion;
      if (r.stage === "done" && (!isObj(completion) || !isObj(completion.state) || typeof completion.ok !== "boolean" || typeof completion.nextCycle !== "string" || completion.nextCycle !== reviewCycle(data.reviews[Number(id)]))) continue;
      const session: ReviewSessionState = {
        version: 1, cycle: r.cycle, variant: r.variant as number, stage: r.stage as ReviewSessionState["stage"], choice,
        attempts: Math.max(0, Math.floor(Number(r.attempts) || 0)),
        lastFeedback: typeof r.lastFeedback === "string" ? r.lastFeedback.slice(0, 2000) : null,
        confirmReveal: r.confirmReveal === true, revealed: r.revealed === true,
        ...(r.stage === "done" && isObj(completion) ? { completion: {
          ok: completion.ok === true, early: completion.early === true,
          state: data.reviews[Number(id)], nextCycle: completion.nextCycle as string,
        } } : {}),
      };
      if (resumableReview(session, data.reviews[Number(id)])) data.reviewSessions[Number(id)] = session;
    }
    const a = src.active;
    if (isObj(a) && lessons[Number(a.id)] && STAGES.includes(a.stage as Stage)) {
      data.active = { id: Number(a.id), variant: a.variant === 1 ? 1 : 0, stage: a.stage as Stage, project: null };
    }
    const p = src.placement;
    if (isObj(p) && Array.isArray(p.answers)) {
      const index = Math.max(0, Math.min(PLACEMENT_IDS.length, Number(p.index) || 0));
      data.placement = {
        answers: p.answers.slice(0, PLACEMENT_IDS.length).map((a) => ({
          ok: isObj(a) && a.ok === true,
          time: isObj(a) ? Number(a.time) || 0 : 0,
        })),
        index,
        done: p.done === true && index === PLACEMENT_IDS.length,
      };
    }
    for (const [qid, x] of Object.entries(isObj(src.questions) ? src.questions : {})) {
      if (!/^qb-\d{4}$/.test(qid) || !isObj(x)) continue;
      data.questions[qid] = {
        epoch: Math.max(0, Number(x.epoch) || 0),
        checks: cleanQuestionChecks(x.checks),
        lastCheck: cleanQuestionChecks([x.lastCheck])[0],
        attempts: Math.max(0, Number(x.attempts) || 0),
        solved: x.solved === true,
        guidedSolved: x.guidedSolved === true,
        firstSolvedAt: Number(x.firstSolvedAt) || 0,
        lastAt: Number(x.lastAt) || 0,
        hints: Math.max(0, Number(x.hints) || 0),
        revealed: x.revealed === true,
      };
    }
    data.lastQuestionAt = Number(src.lastQuestionAt) || 0;
    data.lastLessonAt = Number(src.lastLessonAt) || 0;
    if (typeof src.lastQuestion === "string" && /^[a-z0-9-]+$/.test(src.lastQuestion)) data.lastQuestion = src.lastQuestion;
    for (const [tid, t] of Object.entries(isObj(src.tracks) ? src.tracks : {})) {
      if (!/^[a-z0-9-]+$/.test(tid) || !isObj(t)) continue;
      data.tracks[tid] = {
        startedAt: Number(t.startedAt) || 0,
        lastQuestionId: typeof t.lastQuestionId === "string" && /^(qb-\d{4}|lc-\d+-[01])$/.test(t.lastQuestionId) ? t.lastQuestionId : null,
        lastAt: Number(t.lastAt) || 0,
      };
    }
    if (typeof src.lastTrack === "string" && data.tracks[src.lastTrack]) data.lastTrack = src.lastTrack;
  } else if (Number.isInteger(src.id) && lessons[src.id as number]) {
    const id = src.id as number;
    data.active = {
      id,
      variant: data.stats[id]?.solved.includes(0) ? 1 : 0,
      stage: "understand",
      project: null,
    };
  }

  if (isObj(src.preferences) && ["system", "light", "dark"].includes(src.preferences.theme as string)) {
    data.preferences = {
      theme: src.preferences.theme as ThemePreference,
      collapsed: src.preferences.collapsed === true,
    };
  }

  // Mastered lessons always get a review schedule.
  for (const [id, r] of Object.entries(data.stats)) {
    if (isMastered(r) && !data.reviews[Number(id)]) {
      data.reviews[Number(id)] = { level: 0, due: (r.last || Date.now()) + 86400000, history: [] };
    }
  }
  return data;
}
