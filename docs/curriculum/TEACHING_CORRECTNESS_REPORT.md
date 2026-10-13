# Teaching correctness report

Branch: `implement-learning-sequence` (local).  
No curriculum reorder in this pass. No deployment, GitHub push, or storage migration.

## A. Sequence verification gate (before content edits)

Full regression against the sequence production build on `http://127.0.0.1:3232`.

### Initial gate (12 suites)

| Suite | Result | Notes |
| --- | --- | --- |
| Unit (vitest) | **Fail** — 1015/1017 | Stale `question-manifest.json` order after `courseOrder` change; hard-coded `reviewedQuizIds` length 42 |
| Acceptance | **Fail** — 53/54 | Spaced-review copy expected `2 lessons ready to review`; UI is `2 Reviews ready` (Learn metrics) |
| Shortcuts | Pass | Mac / Win / Linux |
| Layout | Pass | 756 measurements, 0 failures |
| Sweep | Pass | 368 screens, 0 issues |
| Accessibility | Pass | 132 axe scans, 0 violations |
| Learner quality | Pass | 34/34 |
| Learning experience | Pass | 5/5 |
| V4 | Pass | 23/23 |
| Content language | Pass | 10/10 |
| V5 | Pass | 12/12 |
| Workspace UX | Pass | 4/4 |

Logs: `docs/acceptance/logs/sequence-gate-*.log`.

### Gate follow-ups applied

1. Regenerated `docs/question-bank/question-manifest.json` via `npm run qb:report` so lesson-challenge order matches the approved `courseOrder`.
2. Updated acceptance spaced-review assertions to `/2\s*Reviews ready/`.
3. Relaxed `quiz-refinements` length check to “≥ 42 and unique,” and added objective asserts for lessons 16 and 70 after their quiz fixes.

### Gate after follow-ups + teaching fixes

| Suite | Result |
| --- | --- |
| Unit | **1022/1022** (`docs/acceptance/logs/sequence-gate-unit-rerun.log`) |
| Acceptance | **54/54** (`docs/acceptance/logs/sequence-gate-acceptance-rerun.log`) |
| Other 10 suites | Unchanged passes from the initial gate run |

## B. Parity / `reviewed-quizzes.ts` review

**What the allowlists permit**

| Allowlist | May diverge from original-site | Still protected |
| --- | --- | --- |
| `reviewedQuizIds` | Concept-check question, options, correct index, why | — |
| `reviewedWalkthroughIds` | Walkthrough step titles/queries/descriptions | Stage count stays 204 |
| `reviewedConceptIds` | Concept text and example SQL | Dataset, mode |
| `reviewedChallengeLessonIds` | Reference `answer` SQL only | **Prompt, ordered, required, validate** |

**What still fails the build if grading changes**

- Parity still compares every non-reviewed challenge’s `answer`, and **all** challenges’ `prompt`, `ordered`, `required`, and `validate`.
- Grading parity still runs all **176** reference answers through the shipped worker on visible and changed data.
- Lesson 35 is the only lesson on `reviewedChallengeLessonIds` in this pass. Its new answers were proven result-identical to the old recursive ones (24 and 8 rows).

Conclusion: expanding `reviewedQuizIds` for prior uniqueness work and for lessons 16/70 does **not** weaken challenge grading. Challenge identity and validators remain enforced except where lesson 35’s date-source SQL was intentionally replaced with an equivalent result set.

## C. Teaching corrections (Pass A)

### Lesson 16 — Revenue across tables

| | Before | After |
| --- | --- | --- |
| Concept check | Fan-out of 2 requests × 3 invoices (lesson 49’s idea) | What `quantity * price` computes for one paid order line |
| Correct option | Six | That line’s revenue before aggregation |
| Explanation | Aggregate both sides first | Line revenue then SUM/GROUP BY at the chosen grain |
| Walkthrough step 0 | Generic `SELECT * FROM customers` | Join an order line to its product price |

Challenges, answers, validators: unchanged.  
Identity: quiz text only; saved `check` flags stay. Fresh learners see the revenue question.

### Lesson 70 — Silver: clean, map & deduplicate

| | Before | After |
| --- | --- | --- |
| Concept check | Durable surrogate keys / fresh `ROW_NUMBER` on every load | Why keep `rn = 1` after newest-first numbering per trimmed key |
| Correct option | Persist stable keys / dimension lookup | Keep the latest cleaned version of each natural key |
| Explanation | Gold/key durability | Silver normalize + dedupe; surrogate keys are later |
| Walkthrough step 0 | Generic bronze inspect | Profile duplicate natural keys |

Challenges, answers, validators: unchanged.

### Lesson 54 — Databases, schemas, tables & keys

**Decision:** Keep challenge 2 and its validator. Do not change what mastery of `lc-54-1` means.

| | Change |
| --- | --- |
| Concept | Adds a short, concrete JOIN preview that uses `orders.customer_id` → `customers.id` and shows the challenge’s column aliases |
| Hints | Challenge 2 hint names the JOIN and aliases |
| Walkthrough | (1) Find tables/keys in `sqlite_schema` (2) Match related rows with JOIN |
| Challenge 2 | **Unchanged** answer and prompt |

Progress impact: none for drafts, solved flags, or mastery. Learners who already mastered the JOIN challenge keep credit. Fresh learners see the JOIN pattern before they attempt it.

### Lesson 35 — CROSS JOIN & a complete date grid

**Decision:** Replace the recursive date spine with a three-row `UNION ALL` date list. Same outputs.

| | Before | After |
| --- | --- | --- |
| Date source | `WITH RECURSIVE days …` | `UNION ALL` of `2025-01-01` … `03` |
| Concept / example / answers / walkthrough | Recursive CTE | Fixed date list + CROSS JOIN |
| Result sets | 24 / 8 rows | Identical 24 / 8 rows |

Progress impact:

- Challenge ids `lc-35-0` / `lc-35-1` unchanged.
- Prior recursive solutions still grade correct (result-set grading).
- Saved drafts with recursive SQL remain valid.
- Mastery is not erased or re-awarded.
- Difficulty override text updated in `existing.ts` (no score change).

Prerequisite array stays `[14]` (INNER JOIN). Recursion is no longer required to complete the lesson.

## D. Verification of instruction quality

Automated: `tests/teaching-correctness.test.ts` (quiz objectives, JOIN preview, result equivalence, worker grading for all eight challenges).

Browser (production build after rebuild):

| Check | Result |
| --- | --- |
| Lesson 16 quiz, both challenges, wrong then right check → mastered | Pass |
| Lesson 70 quiz, both challenges, wrong then right check → mastered | Pass |
| Lesson 54 concept mentions JOIN; prior mastery + draft restored | Pass |
| Lesson 35 Understand has no RECURSIVE; both challenges; quiz; recursive SQL still grades | Pass |

## E. Remaining content issues (not this pass)

1. **~49 generic walkthroughs** still open on `SELECT *` inspection (Pass B).
2. **Practice Tracks** still have their own ordering problems (e.g. DISTINCT before WHERE in SQL from Zero).
3. **Case Studies / Projects / SQL tools** — deferred as separate phases.
4. Lesson 54’s JOIN preview is intentional scaffolding, not a substitute for lesson 14. Learners still meet a full JOIN lesson next.

## F. Files touched in this pass

| File | Why |
| --- | --- |
| `src/content/content-pack.json` | Quizzes 16/70; concept/hints/walkthrough 54; concept/example/tasks/walkthrough/hints 35 |
| `src/content/reviewed-quizzes.ts` | Documented allowlists including challenge/concept scopes |
| `src/content/question-bank/existing.ts` | Difficulty why for 35 |
| `docs/question-bank/question-manifest.json` (+ related qb docs from generator) | Sync with new `courseOrder` |
| `tests/e2e/acceptance.mjs` | Reviews-ready copy |
| `tests/parity.test.ts` | Scoped exemptions; validators still enforced |
| `tests/quiz-refinements.test.ts` | Length + 16/70 objective asserts |
| `tests/concept-checks.test.ts` | Walkthrough/quiz guards for corrected lessons |
| `tests/teaching-correctness.test.ts` | New |

## G. Recommended next phase

Pass B: improve the remaining generic walkthroughs, without reopening course order or the four corrected lessons unless a walkthrough rewrite discovers a new objective mismatch.
