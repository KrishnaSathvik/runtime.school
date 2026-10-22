# Workspace quality acceptance matrix

Date: **2026-10-21**. Scope: SQL/Python lessons, independent practice and projects. **Proposed acceptance** below is not a claim of existing behavior. **Source inspected** means a test or implementation was read, not run. Browser results must link to [REA_EVIDENCE.md](REA_EVIDENCE.md); an unexercised scenario is neither a pass nor a confirmed bug. This author ran no tests, builds, generators or application mutations.

## Freeze and evidence rules

Keep lesson text/counts, practice prompts/solutions, project requirements/milestones, dataset bytes/versions and grading expectations frozen. Do not make a failing test pass by changing those inputs. Preserve all existing earned progress and assistance history. Any proposed correction to a proven grading defect is outside this UI/lifecycle pass until separately approved.

Before eventual repairs, retain the starting revision plus dirty-working-tree manifest and hashes of frozen content/fixture/grader inputs. After each approved repair, compare against that same baseline; do not mistake pre-existing changes for this pass. Engine transport and feedback repairs must preserve the current output/state/comparator semantics.

For each exercised cell retain: exact URL/activity and revision, browser/version, viewport/device, runtime/package/fixture, initial draft/progress state, steps and input, expected/actual outcome, screenshot or trace, and result classification. Timing records distinguish cache-empty boot, cached boot, prepared spare, package preparation, dataset download, execution and grading. Record individual measurements/repetitions; do not infer p95 from a handful of runs. Never compare unlike package/device/cache conditions as a performance improvement.

## Six required surfaces

| ID | Current route pattern and inspected entry | Required variant |
| --- | --- | --- |
| SL | `/sql/lesson/[id]`, [`Lesson`](../../../src/features/rt/pages/Lesson.tsx) | Runnable example and assessed challenge on the same page |
| SQ | `/sql/practice/[slug]`, [`PracticeTask`](../../../src/features/rt/pages/Practice.tsx) | Write/debug editor; prediction input separately where applicable |
| SJ | `/sql/projects/[id]`, [`ProjectWorkspace`](../../../src/features/rt/projects/ProjectWorkspace.tsx) | Executable checkpoint/build and non-executable exploration/report stage |
| PL | `/python/learn/[slug]`, [`LessonScreen`](../../../src/features/python/Lesson.tsx) | Example plus challenge; active Python V2 route |
| PQ | `/python/practice/[slug]`, [`QuestionScreen`](../../../src/features/python/Question.tsx) | Write/debug editor and separate prediction flow |
| PJ | `/python/projects/[slug]`, [`ProjectScreen`](../../../src/features/python/Project.tsx) | Editable/read-only files, milestone change and cumulative source |

Resolve actual currently visible activity IDs from navigation/catalog; retain them in evidence. Python route [`page.tsx`](../../../src/app/python/learn/[slug]/page.tsx) enforces `pythonRunnerEnabled` and visible content. A public 404/gate is **blocked for runtime testing**, not a failed Python editor. Never remove that gate to complete this matrix.

## Coverage ledger

`N` = not exercised in the evidence available to this author; `O` = partially observed, with scope below; `P` = observed pass for recorded case only; `F` = reproduced failure; `B` = blocked; `—` = not applicable with explanation. Cell status must not imply an entire browser/device family passed. All six columns require coverage; predictions and non-code project stages use their appropriate input/assessment controls rather than invented editors.

| Scenario | SL | SQ | SJ | PL | PQ | PJ |
| --- | --- | --- | --- | --- | --- | --- |
| A1 Open, locate task/editor and inspect inputs | O | O | O | O | O | O |
| A2 Type/select/indent/complete; preserve focus/caret | N | O | N | N | N | F |
| A3 Run valid code; inspect output without grade | N | O | O | O | N | N |
| A4 Syntax/runtime error then navigate to source | N | O | N | O | O | F |
| A5 Check incorrect then correct; preserve expectations | O | O | O | O | O | O |
| A6 Edit after Run/Check; hints and stale evidence | O | O | N | F | F | N |
| A7 Reset/Undo and rapid subsequent typing | N | N | N | F | N | N |
| A8 Resize/zoom/panels/mobile keyboard | O | O | O | O | O | O |
| A9 Refresh/navigate/reopen with saved progress | N | O | O | O | N | O |
| A10 Slow preparation/Stop/timeout/crash/retry | N | N | N | F | N | F |
| A11 Competing cells/actions and cancellation ownership | F | N | N | F | N | N |
| A12 Long tables/streams/tracebacks and keyboard access | F | F | O | N | N | N |

Each row is a checklist group, not one happy-path assertion. Mark a group partially exercised in a note rather than changing its cell to P when only one subcase passed. Desktop resize evidence does not establish actual mobile keyboard behavior.

## Recorded browser observations — bounded scope

The investigating parent agent reported the following actual observations on **2026-10-21**, **Chromium on macOS, 756×469**, `/python/learn/python-execution`. This matrix author did not independently rerun them. `F` means a failing subcase was reproduced; it does not mean every subcase in that group was exercised. `O` carries no release-pass claim.

| Case | Observed result | Acceptance consequence / artifact |
| --- | --- | --- |
| PL-A3 | Valid Run displayed the expected three lines. | Partial success only; no measured focus/caret/award assertion supplied. |
| PL-A4 | `print(` produced a helpful SyntaxError at line 1. | Syntax-error subcase observed; runtime error and explicit source-navigation behavior remain unexercised. [Screenshot](evidence/python-lesson-syntax.png). |
| PL-A5 | Correct Check passed; incorrect Check showed an explicit line mismatch. | Public feedback cases observed; no complete comparator/frozen-corpus regression claim. |
| PL-A6 | After a passing Check, editing source left “All 1 checks pass” visible without a stale label. | **Failed current-result clarity.** Historical earned credit should remain, but current source must not appear verified. [Screenshot](evidence/python-lesson-stale-check.png). |
| PL-A7 | Reset followed by Cmd+Z did not recover the prior draft. | **Failed undo recovery in this session.** Does not establish all reset/caret behaviors or other surfaces. |
| PL-A9 | Draft survived refresh. | Draft persistence subcase observed; activity selection, earned-history preservation and save failure not yet established. |
| PL-A10/A11 | A long challenge Run was followed by a worked-example run. The example completed, while the challenge retained running state, Stop and disabled Check. Stop afterward did not recover the challenge UI. | **Failed supersession settlement/recovery.** Correct-engine output from the example does not imply correct owner UI lifecycle. [Screenshot](evidence/python-lesson-superseded.png). |

Investigator notes: `evidence/records/python-lesson-observations.json` (scratch evidence may be excluded from version control); durable screenshots above plus [REA evidence](REA_EVIDENCE.md) should retain the exact steps and route. No other-surface, mobile keyboard, screen-reader or production-isolation claim follows from these lesson observations; separate follow-ups are below.

### Python project follow-up

Source artifact directly inspected: `evidence/records/07-python-project-actions.js.result.json`, timestamp **2026-10-21T14:31:54.560Z**, URL `http://localhost:3040/python/projects/smart-shopping-cart`. Browser/device provenance follows the parent investigation; this JSON alone does not state viewport/browser version.

| Case | Observed result | Scope / classification |
| --- | --- | --- |
| PJ-A2 | Switch away/back then Undo left `# file switch sentinel\nanswer = 42` rather than restoring the prior edit state. | **Failed per-file undo continuity**, as reported by the investigator. JSON records selected text/offset before and text after; it is not a complete editor-history trace. |
| PJ-A4 | Exception in `catalogue.py` line 2 displayed both `main.py` and helper traceback frames; clicking the line-2 control selected `main.py`. | **Failed source navigation** despite useful traceback. Must select `catalogue.py` and the corresponding line; preserve source. |
| PJ-A5 | Check reported the helper ValueError and individually marked four requirements “Not checked.” | Helpful interrupted-check feedback observed. No valid-project pass or frozen-corpus comparison exercised here. |
| PJ-A9 | Refresh preserved the draft, restored `catalogue.py`, and showed step 1 of 5. | Partial continuity success; no claim about earned milestone history, all files or save failure. |
| PJ-A10 | During Check, Run was disabled and no Stop control was present (`stopCount: 0`). | **Missing Check cancellation affordance** for the proposed lifecycle criterion. This is not proof that the underlying engine cannot cancel. |

These cases extend only PJ cells shown above. Other surfaces have separately bounded observations below. Project findings do not justify modifying requirements, expected values, file contents or milestone counts.

### Practice, SQL lesson and responsive geometry follow-up

Directly inspected investigator records: `evidence/records/practice-observations.json`, `evidence/records/sql-layout-observations.json`; successful REA capture records `evidence/records/sql-practice-rea.json` (evidence ID `ev_fcb1bbb8bc011d18a0a173c252fbddd4f2adc71b4cd09017b9975031049bb97e`) and `evidence/records/python-supersession-rea.json` (`ev_8bd1304da120acadda64999830505fba6a527f24bca47222ae2c3b164a2e186d`). These are browser captures, not regression suite runs. See [REA evidence](REA_EVIDENCE.md) for durable artifacts and reproduction details.

**Route correction:** observed SQL practice route is `/sql/practice/customer-list`; `/sql/practice/shopper-contact-list` returned 404. An underlying canonical record's older slug did not establish the live URL. Future acceptance uses resolved catalog/routes, not legacy source literals.

| Case | Bounded observation | Classification |
| --- | --- | --- |
| PQ-A4/A5, `/python/practice/fix-the-note` | Starter produced helpful SyntaxError; corrected source passed output and comment checks. | Partial error/correction evidence, not full grader-corpus coverage. |
| PQ-A6 | Editing after pass left “All 2 checks pass” visible without stale context. | **Failed current-result clarity.** |
| SQ-A3/A5 | Correct source ultimately checked successfully, displaying 848 rows and three columns; incorrect source reported column mismatch. | Partial run/check evidence. **Discard the 42 ms “sql valid run” timing**: its locator matched before completion; recorded text still says Running. Not a valid performance measurement. |
| SQ-A4/A2/A9 | `SELEC` received useful SELECT guidance; completion included `customer_id`/`customers`; refresh preserved draft. | Partial syntax/completion/persistence evidence, not complete keyboard/durability passes. |
| SQ/SL-A6 | Edited SQL displayed “edited since the last run” while old passing check/output remained. | Existing stale marker verified. O retains the need to assess badge clarity; do not claim SQL entirely lacks stale detection. |
| SQ/SL-A12 | Check labels said “Returns 200 rows” while task/results identified 848 rows. | **Failed feedback consistency.** This proves misleading text, not that grading used only 200 rows. Preserve grader expectations. |
| SL-A5 | `/sql/lesson/meet-your-first-select` challenge Check passed. | Partial correct-check evidence; full lesson mastery not established. |
| SL-A11 | Worked example superseded a long challenge; challenge controls recovered, but no supersession explanation replaced old output. | **Failed ownership communication**, distinct from Python stuck-running recovery. |
| SJ-A1 | Retail project orientation showed tables/relationships and Continue to analysis. | Orientation only; no SQL project execution inferred. |
| All six A1/A8 | At widths 1440, 768 and 390, document width equaled viewport width. No accessible separator observed. SQL project was orientation with no editor. | Partial geometry evidence; no real mobile keyboard, touch, zoom or accessibility pass. No requirement to add resizable panes merely because separators are absent. |

At 390px, measured editor top positions were approximately 1785px for SQL lesson and 2178px for Python lesson, versus 972px/813px for SQL/Python practice; Python project editor began around 947px. Python editors were 180px high in this sample. These measurements support investigating reading/editing transitions; they do not establish a universal ideal height or a demonstrated usability defect.

### Final SQL project, preparation and timing observations

Directly inspected `evidence/records/15-sql-project-actions.js.result.json` (14:38:50Z), `evidence/records/13-preparation.js.result.json` (14:37:53Z) and `evidence/records/16-cold-timing.js.result.json` (14:38:58Z), all **2026-10-21**. Also read the latter two scripts to resolve actual tested pages: their outer JSON `url` identifies the harness page, not the separate page `p` used inside the probe.

- **SJ-A3/A5/A9/A12, analysis stage:** `/sql/projects/retail-performance-review?stage=baseline` displayed “Size sales and cancellations,” stage 3 of 8. Starter Run returned 20 rows; Check correctly reported missing required aliases/order. A subsequent `SELECT 44 AS project_probe;` Run produced 44, and refresh retained that draft. This establishes bounded execution/failed-check/retry/refresh coverage, **not** a passing milestone, final project completion, full dataset-grader regression or source-navigation coverage.
- **SJ-A8:** analysis editor heights were 320px at widths 1440/768/390; widths approximately 759/389/356px, with no document overflow. At 390px its top was around 1266px. These extend the earlier orientation-only geometry but remain desktop viewport simulations, not actual phone keyboard evidence.
- **PL-A10:** the probe delayed `pyodide.asm.wasm` by 12 seconds on `/python/learn/python-execution`; after one second results said only “running…”. This reproduces **preparation-state ambiguity**, not a spontaneous production slowdown. Stop settled the operation, re-enabled Run and showed a stopped message; after removing interception, retry printed `recovered`. Preserve this working Stop/retry subcase while repairing the separate supersession failure. [Screenshot](evidence/python-slow-preparation.png).
- **Timing context:** `/sql/practice/customer-list` click-to-output samples were **380, 80, 61 ms**; `/python/learn/python-execution` samples were **1363, 1845, 1838 ms**. First samples used fresh browser contexts with route preloading allowed; repeats permitted prewarming. These are local browser automation samples, **not pure cold boot**, guaranteed warm-interpreter latency, CPU runtime, real-device benchmarks or evidence of a regression. No before/after optimization comparison, percentile target or cross-engine speed verdict is warranted.

The ledger remains deliberately partial: six surfaces were visited, but no surface completed every core scenario on every device. Frozen content/grading requirements were not altered by these observations. This document is frozen for the investigation handoff after these updates; subsequent changes should name new evidence or an explicitly approved implementation acceptance result.

## Exact behavioral oracles

| ID | Procedure and required result |
| --- | --- |
| A1 | Open a fresh and resumed activity. Task, relevant data/files, requirements, editor and primary actions are discoverable without repeated avoidable backtracking. Record scroll distance, pane geometry and task-to-editor transitions rather than declaring an arbitrary pixel height ideal. No empty starter overwrites a saved draft during hydration. |
| A2 | Insert text at start/middle/end; select across lines; indent/outdent; paste; undo/redo; invoke/dismiss completion. Resulting text and selection match the action, with no lost/duplicated characters or unexpected caret jump on result/status changes. SQL suggestions use relevant schema/dialect. Python suggestion UI must not claim unavailable packages. Escape/Tab allows focus exit where Tab indents. IME/native selection needs real-device evidence. |
| A3 | Run valid code from the intended cell/file/entry point. Correct fixture and source execute once; output belongs to that operation. No focus theft, scroll jump or lesson/practice completion solely from Run. Empty output is distinct from still loading. Preserve active file and caret. |
| A4 | Introduce syntax error and a distinct runtime error. Show diagnostic type/message and location if available, not a wrong-answer badge. Explicit source navigation goes to the correct file/line. Preserve draft and partial output; label retained prior output with its original run, never as output of the failed program. |
| A5 | Submit known incorrect then known correct source against frozen public/reference cases. Feedback updates for the submitted snapshot, accepts the same valid alternatives, and respects order/duplicates/null/type/state expectations. No answer reveal through ordinary failure feedback. Only settled evaluated checks award credit; infrastructure errors/cancelled runs do not create incorrect-solve penalties. |
| A6 | After Run and after passing Check, edit source, switch a file, change task context, show a hint and rerun. Current output/check freshness follows the actual submitted source and fixture; prior pass remains historical. Hint exposure changes assistance for the relevant attempt without deleting an earned independent solve. A pass arriving for older submitted source may be recorded for that snapshot, but cannot certify newer editor text. |
| A7 | From a distinctive draft/selection, Reset then Undo, and Reset followed immediately by typing. Reset scope is explicit; undo recovers prior draft and selection within the live editor session. Later prop hydration cannot overwrite newer typing. Reset does not revoke earned progress or erase assistance history. If current controls intentionally start a fresh attempt, expose that separately from text restoration. Whole-project reset needs clear scope and recoverable prior work. Persisting undo history across browser restart is not required by this pass. |
| A8 | Resize window and existing panes, collapse/reopen reference/results, zoom, then type. Preserve text, caret, file and command access. Keyboard alternative required for existing drag resizing. No requirement to add draggable panes everywhere. No page-wide overflow from normal instructions; wide tables/code may use labeled local scrolling. Actual mobile keyboard must leave caret/actions reachable without overlay obstruction or forced focus changes. |
| A9 | Save distinctive work, navigate between activities/files/milestones and refresh. Restore the correct draft and activity context without mixing IDs or auto-running code. Earned outcomes and assistance remain; old outputs cannot masquerade as current verification. In-session file switching restores selection/view position; cross-refresh exact caret restoration is an optional target unless an existing contract promises it. Save failure is explicit and offers recoverable copy/export; never announce durability when storage failed. |
| A10 | Exercise cold boot, package/data preparation, interrupted download, Stop during preparation/Run/Check where available, timeout and worker crash. Preparation remains distinguishable from running. Stop settles the owned operation; retry remains possible; partial output is labeled. Draft stays editable/recoverable. Capture actual timeout/budget, not invented thresholds. Production Python isolation is independently gated; a recovered worker is not security proof. |
| A11 | While cell A runs, request B, then exercise A's Stop/unmount/late completion. One active interpreter/worker operation is permitted: queuing, prevention or explicit supersession can be valid if explained. B must not silently cancel A without status; A's delayed cleanup must not stop B; no result/grade attaches to the wrong cell. A repeated click/shortcut does not duplicate checks. A run started on one activity cannot overwrite another activity's draft or progress. |
| A12 | Show large table, empty result, multiple output streams/figures, long traceback and many test outcomes within supported capabilities. Display truncation is disclosed and never changes grading over full expected data. Keep output ordering, labeled table headers, reachable scrolling/copy, bounded announcements and visible controls. Tabs/panels do not hide the only error indication. No untrusted output becomes executable app HTML. |

**Project exception:** preserve current stage requirements. SQL `stageIsComplete` in [`evidence.ts`](../../../src/features/rt/projects/evidence.ts) treats orientation, exploration findings, synthesis and reports differently from query validation. Do not add code tests or rewrite milestone requirements merely to satisfy a common matrix. For Python, changing a shared file must distinguish historical milestone passes from current-file verification without deleting either work or history. Read-only provided files remain read-only.

## Existing regression assets: inspected candidates, not passing coverage

| Existing source | Relevant protection / limitation |
| --- | --- |
| [`tests/sql-client.test.ts`](../../../tests/sql-client.test.ts) | Worker lifecycle, cancellation, loading and supersession candidates for A10/A11. Mock/controller evidence is not UI clarity evidence. |
| [`tests/python-client.test.ts`](../../../tests/python-client.test.ts) | Fresh workers, package-specific spare, output ordering, nonce/run-ID rejection, timeout, Stop while loading, recovery, supersession and mount integrity. Some assertions inspect pinned package/vendor assets; preserve installed environment. |
| [`tests/python-progress-v2.test.ts`](../../../tests/python-progress-v2.test.ts) | Independent/assisted outcomes, failed checks, project files and versions. Current old-version retirement tests are existing semantics, not permission to delete history in this pass. |
| [`tests/projects-contract.test.ts`](../../../tests/projects-contract.test.ts), [`tests/projects-canonical.test.ts`](../../../tests/projects-canonical.test.ts) | SQL stage-specific completion, evidence/fixtures and project preservation. Do not reduce these to a universal pass flag. |
| [`tests/e2e/python-v2-journey.mjs`](../../../tests/e2e/python-v2-journey.mjs) | Active V2 `/python/learn/...`, `runtime-python-v2`, actual Run/Check/progress and SQL isolation. Hardcoded content counts and screenshots under `docs/python/screens/phase-1b`; route/content assertions must be reconciled, never curriculum changed to match a stale test. |
| [`tests/e2e/workspace-ux.mjs`](../../../tests/e2e/workspace-ux.mjs), [`shortcuts.mjs`](../../../tests/e2e/shortcuts.mjs) | Historical SQL geometry/keyboard intent; old `/lesson/0` routes, selectors and header expectations. Verify current route/selector compatibility before treating as regression gates. |
| [`tests/e2e/python-workspace.mjs`](../../../tests/e2e/python-workspace.mjs) | Historical real-runtime and three-browser journeys use `/python/workspace` and `.py-state`; not proof of current V2 surface coverage. Supports `BASE`, `BROWSERS`, `SHOTS` for a future reconciled run. |
| [`tests/e2e/python-project-cumulative.mjs`](../../../tests/e2e/python-project-cumulative.mjs) | Uses old project catalog/store and hardcoded port 3052. Useful cumulative-work invariants; not the active ProjectScreen acceptance suite without reconciliation. |
| [`tests/e2e/python-editor-balance.mjs`](../../../tests/e2e/python-editor-balance.mjs), [`learning-page-scroll.mjs`](../../../tests/e2e/learning-page-scroll.mjs) | Legacy route/selectors and strict 50/50 pane/scroll geometry. Those visual assertions are not universal requirements; preserve usable behavior, not obsolete layout ratios. Write screenshots/results into existing docs directories. |
| [`tests/e2e/python-isolation.mjs`](../../../tests/e2e/python-isolation.mjs) | Dedicated safety validation; launches local port 3043 listener, seeds browser cookies/storage and attempts endpoint/network access. Requires controlled local environment, route/security review and all supported browsers; no production probing implied. |

**Later commands, not run here:** direct installed `./node_modules/.bin/vitest run tests/sql-client.test.ts tests/python-client.test.ts` selects lifecycle assets; analogous explicit file selection applies to progress/project checks. Review test setup/output effects first. Browser candidates run as `BASE=http://localhost:<approved-port> node tests/e2e/<reviewed-script>.mjs` against an already approved server; placeholders are deliberately not executable commands. Inspect each script's actual `BASE`/output handling because some hardcode them.

[`package.json`](../../../package.json) `predev` generates SQL/Python datasets and copies Pyodide; `prebuild` generates SQL datasets and copies runtime files; `postinstall` copies Pyodide. Do not run `npm run dev`, builds, installation, dataset generators or broad report scripts as passive investigation. Browser scripts mutate test-browser storage and often write screenshots outside this research directory. Run only during separately approved implementation validation with isolated browser contexts and reviewed output locations. Never use a learner's ordinary profile for destructive state setup.

## Release decision

P0 blockers: lost/cross-activity drafts, incorrect ownership/grade attribution, changed frozen expectations, unsafe Python boundary, unrecoverable engine or save failure. P1: unusable editor/keyboard layout, unclear stale output, broken Run/Check/Stop, inaccessible feedback. P2: cosmetic polish after core journeys pass. These classify severity, not proof that such defects currently exist.

A repair is accepted only when its reproduced case passes, relevant adjacent matrix scenarios remain sound, frozen inputs are unchanged and evidence identifies the actual tested environment. A screenshot alone does not prove caret preservation, reload durability, a grade, or isolation. Unexercised devices/scenarios remain explicit gaps. For broader architectural background only, see [V2 workspace states](../runtime-v2/05_EDITOR_WORKSPACE_UX.md); this pass does not authorize that roadmap or a new architecture.
