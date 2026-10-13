/**
 * Documented lesson-topic corrections that may diverge from the original-site
 * pack. Challenge answers, validators, and required constructs stay compared
 * to the original unless a lesson is also listed in reviewedChallengeLessonIds.
 *
 * See docs/audit/LEARNING_CONTENT_REVIEW.md and
 * docs/curriculum/TEACHING_CORRECTNESS_REPORT.md.
 */

/** Concept-check (quiz) text may differ from the original site. */
export const reviewedQuizIds = [
  1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 30, 32, 33, 34, 35, 36, 37, 38, 40, 43, 44, 45, 49, 50, 53, 54, 55, 56, 57, 59, 62, 64, 67, 69,
  70, 72, 73, 74, 75,
] as const;

/** Walkthrough steps rewritten for teaching alignment (not a grading change). */
export const reviewedWalkthroughIds = [
  1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  32, 33, 34, 35, 36, 38, 39, 40, 41, 43, 45, 52, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
  67, 68, 70, 71, 72, 73, 75,
] as const;

/** Concept and/or example text rewritten for teaching alignment. */
export const reviewedConceptIds = [35, 54] as const;

/**
 * Reference challenge SQL may differ while preserving result-set semantics.
 * Parity still requires ordered/required/validate to match the original unless
 * those fields are intentionally updated in the same documented change.
 */
export const reviewedChallengeLessonIds = [35] as const;
