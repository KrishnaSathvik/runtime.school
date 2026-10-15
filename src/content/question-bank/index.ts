import { learningDataset, learningDatasetInfo } from "@/data/datasets/learning";
import type { ExecuteRequest } from "@/engine/sql-client";
import { existingQuestions } from "./existing";
import { bankQuestions } from "./questions";
import type { BankQuestion, QuestionRecord } from "./types";

export * from "./types";
export { bankQuestions } from "./questions";
export { topicFamilies, topicLabel, familyOf, familyLabel } from "./topics";

export const practiceDatasets = learningDatasetInfo;

export const bankById = new Map(bankQuestions.map((q) => [q.id, q]));
export const bankBySlug = new Map<string, BankQuestion>(bankQuestions.map((q) => [q.slug, q]));

/** A question's database: its canonical dataset plus any small setup tables the question declares. */
export const bankSeed = (q: BankQuestion) => `${learningDataset(q.datasetRef).seed}\n${q.setupSql ?? ""}`;
export const bankMutation = (q: BankQuestion) => `${learningDataset(q.datasetRef).mutation} ${q.extraMutation ?? ""}`.trim();

/** The exact request the Practice workspace sends for "Check answer". */
export function bankCheckRequest(q: BankQuestion, query: string): ExecuteRequest {
  return {
    seed: bankSeed(q),
    query,
    answer: q.solution,
    ordered: q.ordered,
    mutation: bankMutation(q),
    allowWrites: q.mode === "lab",
    planValidation: q.planValidation,
    repeatCheck: q.repeatCheck,
    stateQueries: q.stateQueries,
    validate: q.validate ?? null,
    required: q.required ?? null,
  };
}

/** Starting SQL for a question: an incomplete scaffold that can never pass a check. */
export function bankStarter(q: BankQuestion): { sql: string; cursor: number } {
  if (q.exerciseType === "debug") return { sql: q.starterSql!, cursor: 0 };
  if (q.mode === "lab") return { sql: "", cursor: 0 };
  return {
    sql: q.difficulty === "warmup" ? `SELECT \nFROM ${q.tables[0]};` : "SELECT \nFROM ",
    cursor: "SELECT ".length,
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
