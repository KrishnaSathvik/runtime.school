import { allQuestions } from "./index";
import { DIFFICULTIES } from "./types";
import type { Track } from "./tracks";

const byId = () => new Map(allQuestions().map((q) => [q.id, q]));

/**
 * Track rules: known, practice-eligible, no repeats, documented consolidation steps,
 * difficulty rises at most one level per step, and neighbours don't share a reasoning pattern.
 */
export function trackProblems(t: Track): string[] {
  const map = byId();
  const level = (id: string) => DIFFICULTIES.indexOf(map.get(id)!.difficulty);
  const problems: string[] = [];
  const seen = new Set<string>();
  t.questionIds.forEach((id, i) => {
    const q = map.get(id);
    if (!q) return problems.push(`${id}: unknown question`);
    if (!q.practiceEligible) problems.push(`${id}: lesson-only question`);
    if (seen.has(id)) problems.push(`${id}: repeated`);
    seen.add(id);
    if (i > 0) {
      const prevId = t.questionIds[i - 1];
      const prev = map.get(prevId);
      if (prev) {
        const step = level(id) - level(prevId);
        if (step < 0 && !t.consolidation?.[id]?.trim()) problems.push(`${id}: easier than ${prevId}`);
        if (step > 1) problems.push(`${id}: jumps ${step} levels after ${prevId}`);
        if (prev.pattern === q.pattern) problems.push(`${id}: same pattern as ${prevId}`);
      }
    }
  });
  return problems;
}

