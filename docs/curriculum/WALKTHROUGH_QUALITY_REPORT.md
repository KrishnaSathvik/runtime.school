# Walkthrough quality report (Pass B)

Branch: `implement-learning-sequence` (local).  
No curriculum reorder, grading identity changes (except lesson 35 date-source SQL, result-equivalent), storage migration, push, or deployment.

## Inventory

| Metric | Count |
| --- | --- |
| Lessons reviewed | **88** |
| Generic walkthroughs found at start of Pass B | **44** (`Inspect the source` / `Inspect the starting state` + `SELECT *`) |
| Walkthroughs rewritten in Pass B | **45** (44 generics + lesson 35 date-setup fix) |
| Remaining generic openers | **0** |
| Walkthrough stages preserved | **204** (parity contract) |

Pass A had already improved walkthroughs for lessons including 1, 4, 5, 6, 16, 23, 26, 35, 54, 62, 67, 70, 72, 73, 75. Pass B recalculated the remainder and rewrote every remaining generic opener.

## Lesson 35 prerequisite leak (closed)

CROSS JOIN is course position 23; UNION is position 26. Pass A used `UNION ALL` for the three dates.

| | Before Pass B | After Pass B |
| --- | --- | --- |
| Date source | `UNION ALL` of three literals | `VALUES ('2025-01-01'), …` aliased as `day` |
| Concept | Mentions UNION ALL | Frames dates as **setup data** via VALUES; learner focus is CROSS JOIN |
| Result sets | 24 / 8 rows | Identical to recursive and UNION ALL versions |
| Challenge ids / validators | Unchanged | Unchanged |

Prior recursive or `UNION ALL` solutions still grade correct (result-set grading). No progress migration.

## Teaching sequence improvements (by module)

Pattern for each rewritten lesson (still **two** stages):

1. **Demonstrate the problem or intermediate observation** on real data.
2. **Apply the lesson technique** (usually the example SQL) with an explanation tied to what changed.

### SQL Foundations / Filtering / Calculations (examples)

| Lesson | Before (step 0) | After (teaching intent) |
| --- | --- | --- |
| 2 DISTINCT | `SELECT * FROM customers` | Duplicate cities → `DISTINCT` |
| 7 NULL | Inspect source | `IS NULL` rows → `COALESCE` |
| 8 Sort & limit | Inspect source | Full sort → `LIMIT` top |
| 9 COUNT/SUM/AVG | Inspect source | Row list → single aggregate |
| 11 HAVING | Inspect source | Groups → filter groups |
| 12 CASE | Inspect source | Prices → tier labels |
| 13 Conditional agg | Inspect source | Status mix → `SUM(CASE…)` |
| 56 CAST | Inspect source | Numeric price → `CAST` to text |

### Joins & set logic

| Lesson | Walkthrough demonstrates |
| --- | --- |
| 14 JOIN | Foreign keys, then `JOIN … ON` |
| 32 Ratios | Success/attempt counts → `ROUND` / `NULLIF` percent |
| 34 Self-join | `referrer_id` roles → self `LEFT JOIN` |
| 35 CROSS JOIN | VALUES date setup → full grid |
| 36 FULL OUTER | Left-side gaps → both-side retention |
| 19 UNION | Compatible city lists → `UNION` |
| 38 INTERSECT | Video-1 viewers → intersection |

### Subqueries, windows, advanced analytics

Examples: scalar subquery vs average (17); `EXISTS` without fan-out (18); CTE naming (20); `ROW_NUMBER` / `RANK` / `LAG` / latest-row / `LEAD` / frames / share-of-total / top-N / NTILE / DAU / experiment denominators — each step 0 shows the ordered or grouped intermediate the window needs.

### Database engineering, performance, warehouse

DDL/DML/constraints/transactions/triggers/indexes/partition windows/Gold fact assembly: step 0 shows the before state or plan; step 1 runs the lesson script. Titles no longer say “Inspect the starting state” without a teaching reason.

## Grading and saved work

Unchanged across Pass B:

- Lesson IDs and `courseOrder`
- Challenge prompts, ordered/required/validate
- Concept-check mastery rules
- Drafts and independent solve credit
- Project milestone identities
- Practice question IDs
- Persistence schema (`sql-studio-v1` v3)

Parity still enforces challenge validators for all 176 challenges. Lesson 35 remains on `reviewedChallengeLessonIds` solely for date-source SQL equivalence.

`reviewedWalkthroughIds` expanded to cover every rewritten walkthrough so content may diverge from original-site text without weakening grading checks.

## Verification

### Automated

| Check | Result |
| --- | --- |
| Unit (Vitest) | **1025 / 1025** (`docs/acceptance/logs/pass-b-unit-full.log`) |
| All examples + walkthrough stages execute | Pass (`parity` grading suite) |
| Grading parity 176 challenges | Pass |
| Concept checks unique (88) | Pass |
| `tests/walkthrough-quality.test.ts` | Pass (0 generic openers; 204 stages) |
| `tests/teaching-correctness.test.ts` | Pass (incl. VALUES / no `UNION ALL` on lesson 35) |

### Full 12-suite gate (final Pass B production build on `:3232`)

| Suite | Result |
| --- | --- |
| Unit | **1025 / 1025** |
| Acceptance | **54 / 54** |
| Shortcuts | **3 / 3** (Mac / Win / Linux) |
| Layout | **756** measurements, **0** failures |
| Sweep | **368** screens, **0** issues |
| Accessibility | **132** axe scans, **0** violations |
| Learner quality | **34 / 34** |
| Learning experience | **5 / 5** |
| V4 | **23 / 23** |
| Content language | **10 / 10** |
| V5 | **12 / 12** |
| Workspace UX | **4 / 4** |

Logs: `docs/acceptance/logs/pass-b-*.log`.

### Browser (light + dark)

Representative lessons 2, 11, 14, 21, 35, 66, 71: expanded “Build it step by step”, confirmed concept-specific titles, ran first walkthrough step without SQL errors — **14 / 14** (`docs/acceptance/logs/pass-b-browser.log`).

## Remaining content issues (out of Pass B)

1. **Practice Tracks** still have inconsistent question order and overlap with lessons / the question browser (next recommended phase).
2. **Case Studies / Projects / SQL tools** — separate product problems; not changed here.
3. Walkthroughs remain **two steps** by parity contract; depth is pedagogical, not step-count inflation.
4. A few advanced lessons still reuse the full example as step 1 (appropriate for labs); step 0 now carries the teaching contrast.

## Files touched

| File | Role |
| --- | --- |
| `src/content/content-pack.json` | Walkthrough (and lesson 35 concept/example/answers/hints) updates |
| `src/content/reviewed-quizzes.ts` | Expanded walkthrough allowlist |
| `src/content/question-bank/existing.ts` | Lesson 35 difficulty why (VALUES) |
| `tests/concept-checks.test.ts` | Expanded rewritten-lesson title guards |
| `tests/teaching-correctness.test.ts` | Lesson 35 VALUES / no UNION ALL |
| `tests/walkthrough-quality.test.ts` | New inventory guards |
| `scripts/pass-b-walkthroughs.mjs` | Authoring script used for the bulk rewrite |
| `scripts/pass-b-browser-verify.mjs` | Representative browser checks |

## Recommended next phase

Stop modifying Learn for a while. Focus on **Practice Tracks**: question order, duplication vs lessons, and clearer distinction from the general question browser.
