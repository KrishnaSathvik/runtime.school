import { datasetCatalog, fixtureMutation, seed } from "@/content";
import type { ExecuteRequest } from "@/engine/sql-client";
import { questionBankDatasets, questionBankMutation, questionBankSeed } from "./datasets";
import { existingQuestions } from "./existing";
import { bankQuestions } from "./questions";
import type { BankQuestion, QuestionRecord } from "./types";

export * from "./types";
export { bankQuestions } from "./questions";
export { topicFamilies, topicLabel, familyOf, familyLabel } from "./topics";

/** Curriculum seed + question-bank seed: one SQLite database for practice. */
export const practiceSeed = `${seed}\n${questionBankSeed}`;

/** Shared changed-data fixture: curriculum mutation + question-bank mutation. */
export const practiceMutation = `${fixtureMutation} ${questionBankMutation}`;

/** Every dataset learners can practise on (curriculum + new). */
export const practiceDatasets = { ...datasetCatalog, ...questionBankDatasets };

export const bankById = new Map(bankQuestions.map((q) => [q.id, q]));
export const bankBySlug = new Map(bankQuestions.map((q) => [q.slug, q]));

export const bankSeed = (q: BankQuestion) => `${practiceSeed}\n${q.setupSql ?? ""}`;

/** The exact request the Practice workspace sends for "Check answer". */
export function bankCheckRequest(q: BankQuestion, query: string): ExecuteRequest {
  return {
    seed: bankSeed(q),
    query,
    answer: q.solution,
    ordered: q.ordered,
    mutation: `${practiceMutation} ${q.extraMutation ?? ""}`.trim(),
    allowWrites: q.mode === "lab",
    planValidation: q.planValidation,
    repeatCheck: q.repeatCheck,
    stateQueries: q.stateQueries,
    validate: q.validate ?? null,
    required: q.required ?? null,
  };
}

export function bankRunRequest(q: BankQuestion, query: string): ExecuteRequest {
  return { seed: bankSeed(q), query, allowWrites: q.mode === "lab" };
}

function bankRecord(q: BankQuestion): QuestionRecord {
  return {
    id: q.id,
    slug: q.slug,
    title: q.title,
    difficulty: q.difficulty,
    difficultyWhy: q.difficultyWhy,
    primaryTopic: q.primaryTopic,
    topicTags: q.topicTags,
    datasetId: q.datasetId,
    sourceType: "bank",
    exerciseType: q.exerciseType ?? "write",
    prompt: q.task,
    ordered: q.ordered,
    pattern: `qb-${q.slug}`,
    practiceEligible: true,
    href: `/practice/${q.slug}`,
  };
}

let cached: QuestionRecord[] | null = null;
/** Canonical unified inventory: 176 lesson/project challenges + new bank questions. */
export function allQuestions(): QuestionRecord[] {
  return (cached ??= [...existingQuestions(), ...bankQuestions.map(bankRecord)]);
}
