# Sequence implementation report

Branch: `implement-learning-sequence` (local sqlstudio repository).  
Status: applied and verified on production build `http://127.0.0.1:3232`.  
No deployment, GitHub push, storage migration, new lessons, or grading rewrite.

This implements the approved limited Option B from [SEQUENCE_IMPLEMENTATION_PLAN.md](SEQUENCE_IMPLEMENTATION_PLAN.md).

## Changed files

| File | Change |
| --- | --- |
| `src/content/content-pack.json` | New `courseOrder`; `group` on lessons 2, 19, 30, 31, 32, 54, 55; six `prereq` arrays; rename modules 1 and 3; rewrite `moduleDescriptions` 0–3. |
| `src/content/ux-summaries.ts` | `moduleObjectives` 0–3 match the new module jobs. |
| `src/lib/learning-state.ts` | `placementStart` returns pinned lesson `15` on all-pass; ratio-slot miss without join mastery returns `14`. `PLACEMENT_IDS` unchanged. |
| `src/features/discovery/selectors.ts` | Passes `joinMastered` into `placementStart`. |
| `src/app/placement/page.tsx` | Passes `joinMastered` from saved stats. |
| `src/content/reviewed-quizzes.ts` | Allowlist updated so parity accepts prior concept-check and walkthrough rewrites (not a sequence change). |
| `tests/learning-sequence.test.ts` | New: approved order, modules, prereqs, placement pins. |
| `tests/sprint.test.ts` | Placement tests match pinned starts and stable slot ids. |
| `tests/parity.test.ts` | Course order / relocated groups no longer required to match the original site; grading parity still enforced. |
| `docs/curriculum/*` | Prior audit docs plus this report. |

Not changed: lesson ids, challenge answers/validators, concept-check quiz text (except prior uniqueness pass already in the pack), project milestones, tracks, persist key `sql-studio-v1`, persist version 3, import/export shape.

## Seven relocations

| ID | Title | Old position | New position | Old module | New module |
| ---: | --- | ---: | ---: | --- | --- |
| 2 | Unique values with DISTINCT | 3 | 9 | 0 foundations | 2 calculations |
| 30 | MIN, MAX & the grain of a result | 4 | 12 | 0 foundations | 2 calculations |
| 54 | Databases, schemas, tables & keys | 5 | 17 | 0 foundations | 3 joins & sets |
| 31 | NOT IN and the NULL trap | 12 | 30 | 1 filtering | 4 dates/subqueries |
| 32 | Ratios, ROUND & NULLIF | 18 | 20 | 2 calculations | 3 joins & sets |
| 55 | Logical query processing & row grain | 19 | 38 | 2 calculations | 5 windows |
| 19 | Combine sets with UNION | 46 | 26 | 6 product | 3 joins & sets |

Applied `courseOrder`:

```
0, 1, 3, 4, 5, 6, 7, 8, 2, 9, 10, 30, 11, 12, 13, 56, 54, 14, 15, 32, 16, 34, 35, 36, 37, 19, 38, 17, 18, 31, 20, 26, 33, 39, 21, 22, 23, 55, 24, 25, 40, 41, 42, 43, 53, 57, 27, 28, 29, 44, 45, 46, 47, 48, 49, 50, 51, 52, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 75, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87
```

Verified: permutation of 0..87; lesson 15 immediately follows 14; slice from 58 through 87 matches the previous tail.

## Six prerequisite corrections

| Lesson | Array now |
| ---: | --- |
| 3 | `[1]` |
| 19 | `[3]` |
| 20 | `[10]` |
| 26 | `[10]` |
| 30 | `[9, 10]` |
| 35 | `[14]` |

Automated check: no declared prerequisite has a later `courseOrder` index than its lesson.

## Module membership

| Module | Name | Lessons now |
| ---: | --- | --- |
| 0 | SQL foundations | 0, 1 (2) |
| 1 | Filtering & sorting | 3, 4, 5, 6, 7, 8 (6) |
| 2 | Calculations & data quality | 2, 9, 10, 30, 11, 12, 13, 56 (8) |
| 3 | Joins & sets | 54, 14, 15, 32, 16, 34, 35, 36, 37, 19, 38 (11) |
| 4 | Dates, strings & subqueries | 17, 18, 31, 20, 26, 33, 39 (7) |
| 5 | Window functions | 21, 22, 23, 55, 24, 25, 40, 41, 42, 43, 53, 57 (12) |
| 6 | Advanced product analysis | 27, 28, 29, 44–52 (12) |
| 7–9 | unchanged membership | engineering / performance / warehouse |

Module route indexes remain 0–9.

## Placement handling

`PLACEMENT_IDS` stays `[0, 3, 5, 10, 32, 14]`. Saved answers are still slot indexes.

| Result | Start lesson |
| --- | --- |
| All six correct | 15 (LEFT JOIN), pinned constant |
| First miss at ratio slot, join not mastered | 14 (INNER JOIN) |
| First miss at any other slot | that slot’s `PLACEMENT_IDS` lesson |
| Learner already started any lesson | placement ignored by Continue / recommendation (unchanged) |

Browser evidence (fresh placement records written into `sql-studio-v1`):

- All-correct → heading “Start with “Keep unmatched rows”.”
- Ratio miss only → heading “Start with “Connect tables with JOIN”.”; answers array left as `[true,true,true,true,false,true]`.

## Saved-progress compatibility

No persist version bump. Progress remains keyed by lesson id, question id, project id, and placement slot.

Evidence from the production build:

| Scenario | Result |
| --- | --- |
| Master lessons 0 and 1 | `/learn/0` shows “2 lessons · 2 mastered”; no Continue on that module. |
| Next after aliases | Complete screen link “Next lesson: Filter with WHERE”. |
| Draft `sql-lesson-1-0` | Editor restored `SELECT name, price*2 AS double_price FROM products`. |
| Relocated mastered lesson 30 | Still “Lesson mastered”; position label “Lesson 12 of 88”; Next = HAVING. |
| Draft `sql-lesson-30-0` | Still `"-- kept after move"` in storage after reload. |
| Project 4 milestone 76 notes | Still `"CRM landed"` in storage. |
| Due review on lesson 0 | Foundations list showed “Ready to review” while mastery stayed. |
| Search “Filter with WHERE” | Navigated to `/lesson/3`. |

Storage migration: not required and not performed.

## Automated tests

```
npx vitest run tests/learning-sequence.test.ts tests/sprint.test.ts \
  tests/parity.test.ts tests/course-continuation.test.ts
```

65 passed, including grading parity on all 176 reference answers and walkthrough execution.

## Browser walkthrough evidence

Production server: `npx next start -p 3232` after `npm run build`.

| Check | Observed |
| --- | --- |
| Learn hub modules | “Filtering & sorting” 6 lessons; “Joins & sets” 11; foundations 2. |
| `/learn/0` | SELECT, aliases only. |
| `/learn/1` | WHERE → comparisons → AND/OR → LIKE → NULL → sort. |
| `/learn/2` | DISTINCT → COUNT → GROUP BY → MIN/MAX → HAVING → CASE → conditional agg → CAST. |
| `/learn/3` | Keys → INNER → LEFT → ratios → … → UNION → INTERSECT. |
| `/learn/4` | Subqueries → EXISTS → NOT IN → CTEs → dates. |
| `/learn/5` | ROW_NUMBER → RANK → running totals → logical processing → LAG…. |
| Lesson 0 | “Lesson 1 of 88”. |
| Mastered lesson 1 Next | Filter with WHERE. |
| Placement all-pass / ratio miss | Lessons 15 and 14 as above. |
| Search | `/lesson/3`. |

## Remaining known content problems

These are **not** fixed by this reorder. They stay open for the teaching-content phase:

1. **Lesson 16** concept check still tests join fan-out (lesson 49’s objective), not paid revenue.
2. **Lesson 70** concept check still tests durable surrogate keys (lessons 71 / 82), not Silver cleaning.
3. **Lesson 54** challenge 2 still requires an INNER JOIN; the lesson now sits immediately before JOIN instruction, but the challenge itself still needs a teaching-content fix.
4. **Lesson 35** example and challenges still use a recursive date spine before recursive CTEs; the prerequisite array now points at INNER JOIN so recommendations do not send learners forward, but the example is still ahead of the recursion lesson.
5. **Forty-nine walkthroughs** still open on a generic `SELECT *` inspection.
6. **Practice Tracks** still have their own ordering issues (SQL from Zero still practices DISTINCT before WHERE). Tracks were not reordered.

## Local git

Work lives on branch `implement-learning-sequence` in `/Users/krishnasathvikmantripragada/sqlstudio`. Working tree also contains prior UX-trust changes from the previous phase; this sequence change is isolated on that branch relative to `main` commits. No commit was created unless requested separately. No remote push.
