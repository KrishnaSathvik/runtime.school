# Case Studies experience report

Branch: `implement-learning-sequence` (local).  
Learn and Practice organization frozen. No new cases or questions, no Projects findings, no storage migration, push, or deployment.

## Summary

Case Studies now open on editorial landing pages that explain the business scenario, data, skills, and investigation order before SQL. Harbor Market adds ungraded preparation demos for duplicates, gaps, and midnight boundaries. Stages remain independently graded bank questions with unchanged IDs. Workspace navigation links back to the case overview and surfaces stage purpose, next stage, and completion skills.

| Check | Result |
| --- | --- |
| Unit | **1036 / 1036** |
| Acceptance | **54 / 54** |
| Shortcuts | **3 / 3** |
| Layout | **756** measurements, **0** failures |
| Sweep | **400** screens, **0** issues |
| Accessibility | **140** axe scans, **0** violations |
| Learner | **34 / 34** |
| Learning | **5 / 5** |
| V4 | **23 / 23** |
| Language | **10 / 10** |
| V5 | **12 / 12** |
| Workspace UX | **4 / 4** |

Screenshots: `docs/practice/screens/case-studies/`.  
Logs: `docs/acceptance/logs/case-exp-*.log`.

## Audit — both existing cases

| | Harbor Market checkout reliability | Infrastructure Capacity Planning |
| --- | --- | --- |
| Case id | `harbor-checkout-review` | `regional-capacity` |
| Stage question IDs | `qb-0067` … `qb-0071` | `qb-0084` … `qb-0088` |
| Dataset | `market` → `market_web_events` | capacity tables (`capacity_regions`, `capacity_sites`, `current_capacity`, `future_supply`) |
| Difficulty | Medium → Hard (stage 1 medium; later hard) | Medium → Hard |
| Grading | Existing bank graders / session rules | Existing bank graders |
| Progress | Shared question progress (`solved` / drafts) | Same |
| Stage dependency | **Independent** — fresh DB each stage | **Independent** — fresh DB each stage |
| Carry-over | None (recompute sessions / aggregates each stage) | None |

### Before / after stage flows

**Before (both cases):** Case list → click title → dropped into stage 1 workspace with little scenario context. Stages felt like advanced Practice questions behind a title.

**After:**

```
Case list (/practice/cases)
  → Case landing (/practice/cases/{caseId})
       scenario · data · skills · prep demos · stage list · Start/Continue
  → Stage workspace (/practice/{slug})
       Case overview · stage nav · business why · SQL workspace
  → Next stage or Case complete → overview
```

Stage order and question IDs unchanged. No artificial locks between stages.

### Harbor Market stages (unchanged order)

| Stage | ID | Brief | Business why |
| --- | --- | --- | --- |
| 1 | `qb-0067` | Establish the daily session baseline | Correct session denominator for later rates |
| 2 | `qb-0068` | Locate ordered funnel drop-off | Where sessions stall under ordered rules |
| 3 | `qb-0069` | Measure the checkout delay tail | Typical vs slow checkout latency by channel |
| 4 | `qb-0070` | Find later same-cart recoveries | Permanent abandonment vs later purchase |
| 5 | `qb-0071` | Prioritize channels by unrecovered loss | Triage unresolved abandoned sessions |

### Infrastructure Capacity stages (unchanged order)

| Stage | ID | Brief | Business why |
| --- | --- | --- | --- |
| 1 | `qb-0084` | Current regional totals on the snapshot | Active capacity by region (empty = 0) |
| 2 | `qb-0085` | Retain missing and unmapped sites | Every site visible even without region/capacity |
| 3 | `qb-0086` | Next delivery date and tied units | Earliest delivery + full tied quantity |
| 4 | `qb-0087` | Reconcile capacity and April supply | Fan-out-safe comparison columns |
| 5 | `qb-0088` | Project regional capacity at month end | April 30 projection under stated cutoff |

## Scenario and preparation improvements

### Landing pages (`/practice/cases/[caseId]`)

Editorial page (not a coding dashboard) includes:

- Title, difficulty, short summary
- Scenario, investigation goals, available data and relationships
- SQL skills with links to existing Learn lessons
- Honest independent-stage note (fresh database; no carry-over)
- Progress (`N of 5 investigations solved without hints`) and Start / Continue
- Ordered stage list with briefs and status

Index (`/practice/cases`) now links to landings with Open / Continue / Review case.

### Harbor Market — abrupt stage 1 corrected

Stage 1 remains the graded sessionization exercise (`qb-0067`). Graded requirements were not simplified.

Ungraded preparation (does not change progress):

1. Find retry duplicates  
2. Inspect one shopper’s timeline  
3. Spot events around midnight (`2025-05-01` / `2025-05-02` fixture window)

Copy explains why duplicates, 30-minute gaps, and day attribution matter before writing graded SQL.

### Infrastructure Capacity — clarity

Same landing + prep pattern. Prep demos:

1. List sites and region mappings (including unmapped Drift)  
2. See capacity validity windows  
3. Scan upcoming deliveries  

Snapshot date stated as **2026-04-01** (matches fixtures). No fabricated operational outcomes.

### Prerequisite mapping

| Case | Skill labels | Learn lesson IDs |
| --- | --- | --- |
| Harbor | CTEs, ROW_NUMBER, LAG/LEAD, Ordered funnels, Sessionization | 20, 21, 24, 46, 48 |
| Capacity | LEFT JOIN, CTEs, Date boundaries, Multi-grain joins | 15, 20, 39, 49 |

## Workspace navigation and feedback

Preserved shared SQL workspace. Case-specific additions only:

- **Case overview** link to landing
- Stage strip (1–5) with solved marks
- Stage **business why** under the title
- After correct check: **Next stage** + Case overview; on full solve: completion summary + skills used
- Independent-stage disclaimer kept in task context

## Identity and grading contracts preserved

| Contract | Status |
| --- | --- |
| Question IDs `qb-0067`…`71`, `qb-0084`…`88` | Unchanged |
| Graders / session rules / challenge requirements | Unchanged |
| Slugs / stage URLs | Unchanged (landing is additive `/practice/cases/{id}`) |
| Saved SQL drafts | Unchanged (acceptance: drafts survive navigation) |
| Shared question progress / independent solve credit | Unchanged |
| Persistence schema | Unchanged |
| Case completion ≠ Learn mastery / Project findings | Stated on landing |

## Saved-progress compatibility

- Resume uses first unsolved stage (or stage 1 if all complete for review).
- Direct stage URLs still work; overview is optional entry.
- No stage-position migration; identifiers unchanged.
- Acceptance: case discoverable → landing → Start investigation → stages independent → drafts survive.

## Screenshots

| File | View |
| --- | --- |
| `01-cases-index-dark-1440.png` | Case list |
| `02-harbor-landing-dark-1440.png` | Harbor landing (scenario + prep + stages) |
| `03-harbor-prep-demo-dark-1440.png` | Harbor prep inspections |
| `04-harbor-stage1-workspace-dark-1440.png` | Stage 1 workspace with Case overview |
| `05-capacity-landing-dark-1440.png` | Capacity landing |
| `06-harbor-landing-light-1440.png` | Harbor light |
| `07-capacity-landing-light-1440.png` | Capacity light |
| `08-harbor-landing-mobile-390.png` | Harbor mobile |
| `09-capacity-landing-mobile-390.png` | Capacity mobile |

## Changed test assertions

| Suite / area | Change | Why |
| --- | --- | --- |
| `tests/case-studies.test.ts` (new) | Metadata coverage, Harbor prep demos execute non-empty, stage briefs | Guard case experience without touching graders |
| Acceptance — case study Phase B | Hub link **Case studies**; wait for landing; assert prep/scenario copy; click **Start investigation** | Landing is now required before stage 1 |
| Acceptance — browse / hub / progress copy | Practice hub & source defaults; Learn/Practice summary selectors | Carried from Practice organization (still pass on this build) |
| `axe.mjs` / `sweep.mjs` | Added `case-harbor`, `case-capacity` routes; removed obsolete `/progress` route | Cover new landings; progress page already retired earlier |

No grading or case-completion definitions weakened.

## Source files (this phase)

| Path | Role |
| --- | --- |
| `src/content/question-bank/case-studies.ts` | Editorial metadata, prep demos, stage briefs |
| `src/features/practice/case-studies.ts` | Progress / resume / href helpers |
| `src/features/practice/CaseLanding.tsx` | Landing UI |
| `src/features/practice/CasePrepDemo.tsx` | Ungraded inspection runner |
| `src/app/practice/cases/[caseId]/page.tsx` | Landing route |
| `src/app/practice/cases/page.tsx` | Index → landings |
| `src/features/practice/QuestionWorkspace.tsx` | Case nav, business why, completion |
| `tests/case-studies.test.ts` | Unit coverage |
| `tests/e2e/acceptance.mjs` (+ axe/sweep) | Journey + coverage routes |

## Remaining issues

- Prep demos are inspect-only; they do not teach a full sessionization recipe (intentional — avoid giving away graded answers).
- Stages stay independently reproducible; learners who expect a single pipeline must rely on the landing disclaimer.
- Projects still do not produce a downloadable business finding — deferred to the Projects phase.
- Learn / Practice / shared editor intentionally untouched beyond case workspace chrome.

## Success check

A learner can read why Harbor or Capacity exists, run preparation against real fixtures, start stage 1 knowing it is hard sessionization or capacity grain work, move stage-to-stage without confusing the case for a Practice Track, and finish with a skills summary — without new questions or changed graders.
