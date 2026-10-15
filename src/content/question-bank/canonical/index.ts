import { coreQuestions } from "./practice-core";
import { advancedQuestions } from "./practice-advanced";
import { reasoningQuestions } from "./practice-reasoning";
import { patternQuestions } from "./practice-patterns";

/** The complete Practice bank, authored against the canonical datasets. */
export const canonicalQuestions = [
  ...coreQuestions,
  ...advancedQuestions,
  ...reasoningQuestions,
  ...patternQuestions,
];
