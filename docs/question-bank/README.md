# Practice question bank

A structured SQL practice bank inside **Practice** (`/practice`), separate from lesson mastery. Current inventory: 264 unique exercises (252 Write SQL, 6 Predict Output, 6 Debug Query), 249 practice-ready, 88 independent bank problems, and six unchanged tracks.

| File | Contents | How produced |
| --- | --- | --- |
| [QUESTION_INVENTORY.md](QUESTION_INVENTORY.md) | Totals by difficulty, topic family, dataset and source | generated |
| [DIFFICULTY_MATRIX.md](DIFFICULTY_MATRIX.md) | Topic family × difficulty counts (all / existing / new) | generated |
| [TOPIC_COVERAGE.md](TOPIC_COVERAGE.md) | Every canonical topic with primary and tagged counts | generated |
| [EXISTING_QUESTIONS.md](EXISTING_QUESTIONS.md) | All 176 original challenges classified | generated |
| [QUESTION_COVERAGE.md](QUESTION_COVERAGE.md) | Existing coverage, weak topics, duplicate patterns, eligibility | generated |
| [DIFFICULTY_AUDIT.md](DIFFICULTY_AUDIT.md) | Rubric, reviewer overrides, calibration of new questions | generated + `_rubric.md` |
| [DATASET_INVENTORY.md](DATASET_INVENTORY.md) | Every table, column, key, row count, edge cases | generated + `_dataset-notes.md` |
| [NEW_QUESTIONS.md](NEW_QUESTIONS.md) | Full spec of each new problem, with solution, example and rejected approaches | generated |
| [QUESTION_GAPS.md](QUESTION_GAPS.md) | Gaps found, what this batch fills, what remains | generated + `_gaps.md` |
| [PRACTICE_PLATFORM_RESEARCH.md](PRACTICE_PLATFORM_RESEARCH.md) | Structural research and design decisions | hand-written |
| `question-manifest.json` | Machine-readable inventory (every question, rubric, columns, grading) | generated |

Regenerate after changing questions: `npm run qb:report`. `npm test` fails if `examples.json` or the manifest are stale.

## Where things live

- `src/content/question-bank/types.ts` — typed model (`BankQuestion`, `QuestionRecord`, difficulty, source type)
- `topics.ts` — canonical topic ids · `rubric.ts` — difficulty rubric and feature extraction
- `existing.ts` — classification of the 176 lesson challenges (ids `lc-<lesson>-<variant>`)
- `expansion.ts` and the batch-specific `*-questions.ts` files — the 23 Phase B questions; `expansion-data.ts` — event, engineering, import and opt-in optimization fixtures
- `questions.ts` — the new problems (`qb-0001` …) · `datasets.ts` — new seed + changed-data fixture
- `scripts/author-question-bank-seed.py`, `scripts/author-question-bank-module.py` — historical author-time generators for the initial batch; current Phase B sources are maintained directly
- UI: `src/features/practice/` (hub, workspace, status) · routes `/practice` and `/practice/[slug]`
