# Practice organization report

Branch: `implement-learning-sequence` (local).  
Learn curriculum frozen. No Case Studies / Projects changes, no new tracks or questions, no storage migration, push, or deployment.

## Summary

Practice now has clearer roles: independent problems by default, skill tracks with prerequisite-aware order, and explicit **From Learn · review** labels for reused lesson challenges. Shared question IDs and solve history are unchanged.

| Check | Result |
| --- | --- |
| Unit | **1032 / 1032** |
| Acceptance | **54 / 54** |
| Shortcuts | **3 / 3** |
| Layout | **756** measurements, **0** failures |
| Sweep | **368** screens, **0** issues |
| Accessibility | **132** axe scans, **0** violations |
| Learner | **34 / 34** |
| Learning | **5 / 5** |
| V4 | **23 / 23** |
| Language | **10 / 10** |
| V5 | **12 / 12** |
| Workspace UX | **4 / 4** |

Screenshots: `docs/practice/screens/`.

## Practice hub hierarchy

| Entry | Purpose |
| --- | --- |
| Solve a new question | Independent bank problems (`/practice/questions`) |
| Practice by skill | Six existing tracks |
| Predict or debug SQL | Typed practice (`?type=predict`; switch to debug in filters) |
| Case studies | Unchanged case list (not redesigned this pass) |

Hub copy states that track completion does not master Learn lessons.

## Practice browser defaults

| Behavior | Detail |
| --- | --- |
| Default inventory | Independent bank problems only (**88**) |
| From Learn filter | `source=lessons` — lesson challenges labeled **From Learn · review** |
| All questions | `source=all` — **249** eligible questions; bank rows sort first |
| Status | Existing text labels via `StatusMark` (not unlabeled dots alone) |
| Search / difficulty / topic / type / pagination | Preserved |

Grading rules and question identities unchanged.

## Six tracks — before / after order

No questions added or removed. Same IDs; order and section framing updated.

### 1. SQL from Zero

**Issue fixed:** DISTINCT (`lc-2-0`) appeared before WHERE.

| | Order |
| --- | --- |
| Before | `qb-0001, lc-1-0, lc-2-0, qb-0002, lc-5-1, lc-6-0, qb-0004, lc-7-1, qb-0003, qb-0005, qb-0008, qb-0017, qb-0018` |
| After | `qb-0001, lc-1-0, qb-0002, lc-5-1, lc-6-0, qb-0004, lc-7-1, qb-0003, qb-0005, qb-0008, lc-2-0, qb-0017, qb-0018` |

Sections: Read and shape rows → Filter → Missing values → Sort and limit → Unique values → Richer filters.  
Shape: 13 questions · 8 independent · 5 From Learn.

### 2. Master SQL Joins

Order kept (already INNER → LEFT/anti → self/set → multi-grain → fan-out). Added skill sections.

| After (unchanged IDs/order) |
| --- |
| `lc-14-0, qb-0015, qb-0016, lc-15-1, qb-0010, lc-34-0, lc-38-1, lc-15-0, lc-37-0, lc-16-0, qb-0029, qb-0032, lc-49-0, qb-0048` |

Shape: 14 · 6 independent · 8 From Learn.

### 3. SQL Interview Essentials

Moved join aggregation (`qb-0012`) and monthly distinct (`qb-0021`) earlier, before subqueries/CTEs/ranking.

| | Order |
| --- | --- |
| Before | `qb-0009, qb-0011, lc-17-0, qb-0014, lc-18-1, qb-0021, qb-0012, lc-20-0, qb-0025, qb-0034, qb-0033, qb-0027, qb-0040, lc-25-0, qb-0037` |
| After | `qb-0009, qb-0011, qb-0012, qb-0021, lc-17-0, qb-0014, lc-18-1, lc-20-0, qb-0025, qb-0034, qb-0033, qb-0027, qb-0040, lc-25-0, qb-0037` |

Shape: 15 · 11 independent · 4 From Learn.

### 4. Advanced SQL Challenges

Order kept (window compare → top-N → calendars → streaks/recursion → sessions/history). Sections added.

| After (unchanged IDs/order) |
| --- |
| `lc-24-0, lc-23-1, qb-0031, lc-53-1, qb-0028, qb-0030, lc-42-1, qb-0042, qb-0045, qb-0046, lc-48-0, qb-0047` |

Shape: 12 · 7 independent · 5 From Learn.

### 5. Real-World Data Analytics

Order already progressed from rates/revenue → reporting → funnels/cohorts → margin/reconciliation. Sections added; IDs unchanged.

| After (unchanged IDs/order) |
| --- |
| `lc-32-0, qb-0035, qb-0026, lc-43-0, qb-0036, lc-73-0, lc-29-0, lc-46-0, lc-52-0, lc-47-0, qb-0041, lc-51-1, lc-50-0` |

Shape: 13 · 4 independent · 9 From Learn.

### 6. SQL for Data Engineers

**Issue fixed:** Transactions (`lc-61-1`) before constraints (`lc-60-0`); history reporting interleaved early.

| | Order |
| --- | --- |
| Before | `lc-58-0, qb-0023, lc-59-0, qb-0024, lc-61-1, lc-83-0, lc-60-0, qb-0039, lc-64-0, qb-0038, lc-84-0, lc-85-0, lc-78-0, qb-0044, qb-0043, lc-70-0, lc-81-0` |
| After | `lc-58-0, qb-0023, lc-59-0, qb-0024, lc-60-0, lc-61-1, qb-0039, lc-64-0, qb-0038, lc-84-0, lc-85-0, lc-83-0, lc-78-0, qb-0044, qb-0043, lc-70-0, lc-81-0` |

Consolidation notes document the intentional easier steps for `lc-61-1` and `lc-83-0`.  
Shape: 17 · 6 independent · 11 From Learn.

## Progress compatibility

| Rule | Evidence |
| --- | --- |
| Shared question ID → one solve record | Existing `statusOf` / track progress tests still pass |
| Guided ≠ independent | Track progress ignores guided solves |
| Track complete ≠ lesson mastery | `completing a track never awards lesson mastery` |
| Track resume survives refresh | `touchTrack` + export/import test |
| Drafts unchanged | No persistence schema edits |

## Track detail UX

Opening a track shows objective, prerequisites (`startingPoint`), question counts (independent vs From Learn), progress, next recommended question, and an ordered list with section headers, difficulty, and text status.

## Test changes (why)

| Test | Change |
| --- | --- |
| `tests/tracks.test.ts` | WHERE-before-DISTINCT; DE ops order; sections; resume uses a bank id |
| `tests/practice-organization.test.ts` | New — browser default + inventory guards |
| `tests/v5-discovery.test.ts` | Default pagination is 88 bank / 4 pages; `source=all` still covers 249 |
| `tests/e2e/acceptance.mjs` | Hub link names; browse expects independent default then All |
| `tests/e2e/v5.mjs` | Hub link name; clamp page for bank default + all inventory |

Generated `docs/question-bank/PRACTICE_TRACKS.md` regenerated via `npm run qb:report`.

## Remaining issues (later Case Studies phase)

1. Harbor Market and other case studies still jump into advanced sessionization without enough runway.
2. Practice hub still lists Case studies without changing their internal sequencing.
3. Projects still need meaningful downloadable findings (deferred).
4. Track/browser overlap with the same IDs is intentional; further UX polish on “why this route” can wait until Case Studies.

## Files touched

- `src/content/question-bank/tracks.ts` — reorder, sections, consolidation
- `src/features/practice/browser.ts` — default independent inventory; `source=all`
- `src/features/practice/PracticeHub.tsx` — practice hierarchy + progress copy
- `src/features/practice/QuestionBrowser.tsx` — Source filter + labels
- `src/features/practice/TrackPage.tsx` — prerequisites, sections, next-up, progress copy
- `src/app/practice/tracks/page.tsx` — skill-track hub copy
- Tests listed above; screenshots under `docs/practice/screens/`
