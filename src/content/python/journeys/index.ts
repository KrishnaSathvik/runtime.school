import specs from './specs.json';
import type { PyPackage } from '@/engine/python/client';
import type { PyCheck } from '@/engine/python/grading';
import { py } from '@/engine/python/values';
import type { PyGraded } from '../types';

export type PyStage = PyGraded & { id: string; ref: string };
export type PyJourney = {
  ref: string; slug: string; title: string; kind: 'case' | 'project'; overview: string;
  files: Record<string, string>; packages: PyPackage[]; stages: PyStage[];
};

/** Stages extend the previous solution and retain its checks: later work cannot silently regress earlier work. */
export const pythonJourneys: PyJourney[] = specs.map((spec) => {
  const files: Record<string, string> = Object.fromEntries(Object.entries(spec.files).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  let answer = '';
  const checks: PyCheck[] = [];
  const stages = spec.steps.map((step, i): PyStage => {
    const starter = answer;
    answer += (answer ? '\n' : '') + step.code;
    const newChecks: PyCheck[] = step.checks.map((c, n) => ({ kind: 'expr', id: `stage-${i + 1}-${n + 1}`, label: c.label, expr: c.expr, expected: py.bool(true) }));
    checks.push(...newChecks);
    return {
      id: `stage-${i + 1}`, ref: `${spec.ref}:stage-${i + 1}`, title: step.title,
      prompt: step.prompt, looksFor: step.checks.map(c => c.label), starter,
      answer, hints: step.hints,
      task: { checks: [...checks], files: files, packages: spec.packages as PyPackage[] },
      wrong: [{ code: `${answer}\n${step.wrong}\n`, fails: [newChecks[0].id!] }],
    };
  });
  return { ...spec, kind: spec.kind as 'case' | 'project', packages: spec.packages as PyPackage[], files: files, stages };
});
export const pythonCases = pythonJourneys.filter(j => j.kind === 'case');
export const pythonProjects = pythonJourneys.filter(j => j.kind === 'project');
export const journeyHref = (j: PyJourney) => `/python/${j.kind === 'case' ? 'practice/cases' : 'projects'}/${j.slug}`;
