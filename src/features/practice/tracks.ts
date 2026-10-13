import { allQuestions, DIFFICULTIES, DIFFICULTY_LABEL, type QuestionRecord } from "@/content/question-bank";
import type { Track } from "@/content/question-bank/tracks";
import type { LearningState, QuestionStatus } from "@/lib/learning-state";
import { statusOf } from "./status";

const byId = new Map(allQuestions().map((q) => [q.id, q]));

export type TrackItem = { q: QuestionRecord; status: QuestionStatus; position: number };

type ProgressState = Pick<LearningState, "questions" | "stats" | "attempts" | "history">;

/** Still to do in sequence. A solve with help counts as done for the pointer, not for the without-hints total. */
function stillOpen(item: TrackItem, s: ProgressState): boolean {
  if (item.status === "solved") return false;
  if (item.q.sourceType === "bank") return !s.questions[item.q.id]?.guidedSolved;
  return item.status !== "guided";
}

/** Link to a question that keeps the track context. */
export function trackHref(q: QuestionRecord, trackId: string): string {
  return `${q.href}${q.href.includes("?") ? "&" : "?"}track=${trackId}`;
}

export function trackProgress(track: Track, s: ProgressState) {
  const items: TrackItem[] = track.questionIds.map((id, i) => {
    const q = byId.get(id)!;
    return { q, status: statusOf(q, s), position: i + 1 };
  });
  const solved = items.filter((x) => x.status === "solved").length;
  return {
    items,
    solved,
    total: items.length,
    /** First question still open in track order. Helped solves are skipped; they do not increase `solved`. */
    next: items.find((x) => stillOpen(x, s)) ?? null,
    complete: solved === items.length,
  };
}

/** Resume a learner's unfinished position; completion still uses shared records. */
export function resumeInTrack(track: Track, s: ProgressState, lastQuestionId: string | null | undefined): TrackItem | null {
  const progress = trackProgress(track, s);
  const saved = progress.items.find((item) => item.q.id === lastQuestionId);
  if (saved && stillOpen(saved, s)) return saved;
  return progress.next;
}

/** The next unsolved question after `currentId` (wrapping), or null when the track is complete. */
export function nextInTrack(track: Track, currentId: string, s: ProgressState): TrackItem | null {
  const { items } = trackProgress(track, s);
  const i = items.findIndex((x) => x.q.id === currentId);
  const ordered = i < 0 ? items : [...items.slice(i + 1), ...items.slice(0, i)];
  return ordered.find((x) => stillOpen(x, s)) ?? null;
}

export function trackRange(track: Track): string {
  const levels = track.questionIds.map((id) => DIFFICULTIES.indexOf(byId.get(id)!.difficulty));
  const first = DIFFICULTIES[Math.min(...levels)];
  const last = DIFFICULTIES[Math.max(...levels)];
  return first === last ? DIFFICULTY_LABEL[first] : `${DIFFICULTY_LABEL[first]} → ${DIFFICULTY_LABEL[last]}`;
}

/** Short label for a track item (canonical titles for both bank and lesson questions). */
export function itemLabel(q: QuestionRecord, max = 48): string {
  const text = q.title;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
