import type { BankQuestion, Difficulty, ExerciseType, TopicId, WrongAnswer } from "../types";
import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CANONICAL_VERSION } from "@/data/datasets/learning";

/** Audit decision for a Practice question. */
export type PracticeDecision = "MIGRATE" | "REWRITE" | "NEW";

export type QSpec = Omit<BankQuestion, "datasetId" | "datasetRef" | "version" | "mode" | "ordered" | "topicTags" | "rules" | "exerciseType" | "wrong"> & {
  dataset: CanonicalDatasetId;
  decision: PracticeDecision;
  mode?: BankQuestion["mode"];
  ordered?: boolean;
  topicTags?: TopicId[];
  rules?: string[];
  exerciseType?: ExerciseType;
  wrong?: WrongAnswer[];
};

/** Content version for every question re-authored against the canonical datasets. */
export const CANONICAL_QUESTION_VERSION = 3;

/** URL segment from the question title so `/sql/practice/…` matches what learners read. */
export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function q({ dataset, decision, slug: _authoredSlug, title, ...spec }: QSpec): BankQuestion & { decision: PracticeDecision } {
  void _authoredSlug;
  const fromTitle = slugFromTitle(title);
  return {
    mode: "query",
    ordered: false,
    topicTags: [],
    rules: [],
    exerciseType: "write",
    wrong: [],
    ...spec,
    title,
    slug: fromTitle,
    datasetId: dataset,
    datasetRef: { datasetId: dataset, datasetVersion: CANONICAL_VERSION },
    version: CANONICAL_QUESTION_VERSION,
    decision,
  };
}

export const d = (difficulty: Difficulty) => difficulty;
