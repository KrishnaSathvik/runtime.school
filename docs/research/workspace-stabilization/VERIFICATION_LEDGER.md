# Stabilization verification ledger

Updated 2026-10-21 with accepted sequential batch gates reported by the implementation owner and checked against the linked artifacts. The earlier [investigation matrix](../workspace-quality/ACCEPTANCE_MATRIX.md) remains unchanged. Browser and application test execution belongs to the implementation owner; this author inspected the artifacts and ran read-only freeze verification. Acceptance is bounded to the recorded scenarios, not every device or activity.

## Baseline and freeze completeness

Reference: [BASELINE.json](BASELINE.json), timestamp `2026-10-21T10:23:35.269012-05:00`, HEAD `a0842778ffac594e23a2ca8676c1a0a511bc1633`, with 1,416 file hashes and 430 frozen hashes at inspection. Compare repairs with the snapshotted dirty working tree, not HEAD alone.

**Detected omissions in original freeze inventory:**

| Boundary | Original baseline coverage | Required verification |
| --- | --- | --- |
| `public/datasets/canonical/**` | 12 existing `.sqlite.gz` assets absent from both file hashes and snapshot archive | Supplemental pre-generator hash inventory; freeze bytes and membership |
| `public/datasets/python/**` | 341 existing files absent from both file hashes and archive | Supplemental pre-generator hash inventory; freeze every edition/format/file, not just CSV |
| `src/data/datasets/{generated/canonical.json,learning-map.ts,learning.ts}` | All three snapshotted/hashed, none in original frozen set | Compare baseline bytes; preserve dataset references, metadata and version interpretation |
| `datasets/**` | 97 baseline entries, all frozen | Keep generation inputs and source extracts unchanged; no rebuild needed |
| `public/vendor/{grading.js,plan-validation.js}` and `src/engine/{grading.ts,grading.legacy.js,plan-validation.ts,prediction.ts}` | In baseline, absent original frozen set | Preserve SQL correctness and prediction semantics |
| `src/engine/python/values.ts` | Baseline hash present, not frozen | Preserve typed comparison and serialization policy |
| `tests/fixtures/python-outputs/**` | 15 baseline fixture files, not frozen | Expected-output bytes unchanged; tests must not be weakened to fit repairs |
| `src/lib/learning-state.ts`, `src/lib/storage-merge.ts` | Baseline present, not frozen | Preserve SQL achievement, review, import/export and merge contracts |

Counts describe the original inspected baseline; the supplemental capture below closes these inventory gaps. Do not retroactively claim omitted assets were captured by the original tarball. Existing `src/content/**` and current Python grading/progress freezes must remain intact. Public runtime vendor binaries/packages must not change as an accidental side effect of install/build hooks.

## Supplemental capture completed

[FROZEN_CONTRACTS.json](FROZEN_CONTRACTS.json) now covers **812 files**, including all **353 public dataset artifacts**, original frozen content, dataset metadata, typed graders, progress stores and fixture outputs. Existing candidate files matched original baseline hashes at capture; previously omitted ignored artifacts were hashed from current bytes before any generator, per the session record. Directory membership is frozen as well as bytes for content, datasets, public datasets, dataset metadata and test fixtures.

The original worker was copied from the original tarball to [snapshots/sql-engine-pre-repair.js](snapshots/sql-engine-pre-repair.js). Four named semantic chunk hashes and a whole-worker baseline comparison protect it. The verifier permits only additive `expectedTotal: expected ? expected.values.length : null` (or `undefined`) metadata; changing comparator inputs, `grade`, existing response fields or other worker bytes still fails. Any additional exemption requires review; never recapture baseline hashes to hide a change.

Command actually executed:

```sh
python3 docs/research/workspace-stabilization/verify_frozen.py
```

Result at supplemental capture: **passed**, 812 files checked, worker unchanged, zero failures. This establishes frozen-file preservation at that moment, not application correctness or later-batch status. The [verifier](verify_frozen.py) is read-only and can be rerun after each batch.

Narrow existing progress regression selection for the implementation owner:

```sh
./node_modules/.bin/vitest run tests/learning-state.test.ts tests/practice-state.test.ts tests/python-progress-v2.test.ts tests/projects-contract.test.ts
```

The implementation owner ran this selection: **41 passed**, recorded in [progress-tests.txt](evidence/progress-tests.txt). These tests were not run by this author. Legacy `tests/python-progress.test.ts` and `tests/python-projects-v2-state.test.ts` are additional checks only if their old stores are affected. Current-project browser evidence still matters even when state unit tests pass.

## SQL worker semantic freeze map

`public/vendor/engine.js` matched the baseline hash at inspection. Line numbers below refer to that baseline and can move after edits; compare named blocks against the archived source, not line numbers alone.

| Baseline block | Frozen semantics |
| --- | --- |
| `rows`, `query`, `script`, lines 46–69 | Full result collection, read-only/single-statement restrictions, script statement handling, returned table, plan selection and partial-execution behavior |
| `makeDB`, line 70; `validate`, line 71 | Fixture setup, mutation timing, foreign-key/query-only settings and required object/constraint checks |
| `withMutation`, lines 73–77 | Changed-data savepoint and restoration, including PRAGMAs |
| Shared branch, lines 104–131 | Original answer comparison, ordering policy, required-term filtering, changed-data comparison and outcome |
| `execute`, lines 138–143 | Query/script dispatch and final-query capture used for plans |
| `compareState`, lines 150–156 | Every required state query compared against oracle |
| `inspect`, lines 157–188 | Result, required term, plan, schema, state and repeat/idempotence assessment |
| Oracle/check orchestration, lines 189–203 | Separate original/changed actual+oracle execution, comparison and report composition |
| Response serialization, lines 133–134 and 204–205 | Full comparisons occur before display slicing; `total` is full actual count. Adding full expected-count metadata is allowed only as presentation metadata; never change comparator inputs or grade outcomes. |

Whole-file freeze for imported `grading.js` and `plan-validation.js` is simpler than semantic exemptions. For a transport/ownership patch, any changed grader block requires explicit review, even if tests pass. Preserve hashing/isolation of database bytes and overlay behavior. A row-label repair is not authorization to change expected counts or compare only 200 visible rows.

## Sequential verification gates

The table preserves the original verification obligations. Actual accepted evidence and remaining gaps follow in the gate record; table entries alone do not establish coverage. Detailed procedures remain in the investigation matrix.

| Gate | Focused existing assets / browser scenario | Required evidence |
| --- | --- | --- |
| V1 Ownership and lifecycle | `tests/sql-client.test.ts`, `tests/python-client.test.ts`; Python lesson long challenge → example → retry, SQL equivalent | Old owner settles; late result/cleanup cannot stop newer run; no wrong-cell grade; controls recover; no shared-operation rewrite without need |
| V2 Stop during Check/preparation | Same client assets; active Python Workbench Check, injected delayed WASM then Stop/retry | User can stop owned check; incomplete evaluation creates no failure/mastery; meaningful preparation state; working existing Stop/retry retained |
| V3 Result freshness and feedback | SQL lesson/practice 848-row example; Python lesson/practice pass → edit; failures after pass | Current result marked previous/stale; earned success survives; full actual/expected count labels accurate; no changed rubric |
| V4 Editor identity/reset | Python `PyEditor`, Workbench; Reset→Undo, immediate typing after Reset, switch files→Undo | Draft, selection and per-file history preserved in live session; no delayed prop overwrite; old assisted/earned history intact |
| V5 Source navigation | Python project `catalogue.py` exception line 2, click diagnostic | Correct file and line selected; no helper error jump into main.py; draft unchanged |
| V6 SQL progress | `tests/learning-state.test.ts`, `tests/practice-state.test.ts`, `tests/projects-contract.test.ts` | Guided/independent distinction, two-challenge+concept mastery, bank solve separate from lesson mastery, round-trip drafts/session/history, stage-specific project rules |
| V7 Python progress | `tests/python-progress-v2.test.ts`, legacy store tests if impacted; browser record before/after checks/reset/refresh | Existing independent/assisted solves, lesson concept completion, milestone files and saved selection retained. No schema migration or historical policy rewrite in repair pass |
| V8 Grading invariance | `tests/grading.test.ts`, `tests/python-grading.test.ts`, relevant canonical/project tests | Valid alternatives and known incorrect fixtures retain outcomes; SQL duplicate/order/null/state/plan and Python typed checks unchanged |
| V9 Six-surface regression | SQL lesson/practice/project analysis; Python lesson/practice/project at 1440/768/390 | Actual Run/Check/error/refresh on each relevant surface; desktop geometry is not mobile keyboard proof |
| V10 Frozen inputs and patch audit | Baseline + supplementary artifact inventory; snapshot diff | No content/solution/project/dataset/grading expectation changes; no unrelated pre-existing changes reverted; all new changes attributable to sequential batch |

SQL earned/current separation: retain historical independent lesson variants, concept checks, bank solves, review state, stage position and draft-key project findings. Python: retain current V2 activity IDs, concept records, `solved`/`assisted`, milestone `passedAt`/assistance and files. A stale current result is a UI/snapshot fact, not permission to set historical solved fields false. A cancelled check is not an evaluated incorrect answer. No store migration is needed for these repairs.

## Execution precautions and reporting

Use explicit test selection after relevant source changes; do not invoke generating predev/prebuild hooks just to obtain a server. Existing tests with legacy routes/selectors must be reconciled with active surfaces without changing curriculum to satisfy them. In particular `python-workspace.mjs` and `python-project-cumulative.mjs` target older surfaces/stores; `python-v2-journey.mjs` targets active V2 but writes screenshots into prior docs and asserts content counts. Do not edit frozen research evidence as an implementation artifact.

Browser state setup uses isolated contexts, never a learner's normal profile. Capture before/after progress for the specific test context and confirm unrelated subject storage is unchanged. Do not display learner secrets or dump personal storage in reports. Production Python isolation remains gated; local UI recovery does not certify isolation and no deployment is implied.

Report each batch with changed files, targeted tests and real-browser cases, freeze comparison, known gaps and rollback scope. No claims of all-device accessibility, cold-start improvement or completed isolation from the limited desktop evidence. The investigation's 42 ms SQL sample was invalid; the later six click-to-output samples allow preload/prewarm and are not a performance regression baseline.

## Accepted sequential gates

| Batch | Recorded result | Evidence and bounded scope |
| --- | --- | --- |
| 1 — Lifecycle | Accepted:43 targeted unit/component tests;3 Chromium scenarios; visual inspection and independent source review clear | [Checkpoint](evidence/lifecycle-checkpoint.json), [browser results](evidence/lifecycle.json). Python superseded challenge settles/retries, owned Check stops without credit/retries, SQL competing example explains interruption and recovers. Frozen812 passed. |
| 2 — Editor | Accepted:15 targeted tests;2 Chromium scenarios; independent review clear | [Checkpoint](evidence/editor-checkpoint.json), [browser results](evidence/editor.json). Reset→Undo restores source and preserves earned state; project file switching preserves undo and diagnostic filename; checkpoint records all milestone files and refresh persistence. [Before reproduction](evidence/editor-before.json) remains historical failure evidence. |
| 3 — Feedback/help | Accepted:2 feedback scenarios +4 desktop help scenarios; owner reports SQL162/Python18 targeted tests, modal axe zero and independent review clear | [Feedback](evidence/feedback.json), [desktop help](evidence/help.json). Edited checks become historical, SQL full result counts display correctly; Answer/Hint visibility, cancellation, focus restoration and saved-help hydration exercised on SQL/Python lesson/practice. Frozen812 passed with only allowed SQL response metadata. |
| 4 — Layout | Accepted:36 layout/accessibility cases +7 navigation/tool cases +4 mobile help cases; screenshots inspected; independent source review clear | [Layout](evidence/layout.json), [navigation](evidence/navigation.json), [mobile help](evidence/mobile-help/help.json). Six editable surfaces ×5 viewport sizes plus6 automated accessibility checks; navigation includes4 drawers and3 tool-layout exclusions. Focused editor visibility, held Run pointer, default equal split and short-height fallback checked by owner. Frozen812 passed. |
| 5 — Conditional recovery and local journeys | **Accepted locally; release gates remain** | Six preparation unit cases independently reviewed; [journeys](evidence/journeys.json) 6/6; [final ownership browser](evidence/final-lifecycle/lifecycle.json) 3/3; [final preparation browser](evidence/final-preparation/preparation.json) 2/2. Visual recovery screenshot inspected; frozen812 pass. Physical-device and production gates remain below. |

The latest cross-batch regression run passed **285 tests across 17 files**, recorded in [regression-tests.txt](evidence/regression-tests.txt). Counts from earlier batches overlap this run and must not be added into a unique-test total. The dedicated SQL/Python progress baseline passed41 tests across learning-state, practice-state, python-progress-v2 and projects-contract, as recorded above. Frozen verification at the layout gate passed812 files; this protects byte-level contracts and directory membership, not complete application behavior.

The full typecheck remains **blocked by the pre-existing error** in frozen `src/content/python-v2/projects/step.ts:29`: string is not assignable to the project milestone template-literal type. See [typecheck.txt](evidence/typecheck.txt). The implementation owner confirmed the file is byte-identical to baseline. Content must not be altered to silence this error; no clean full-typecheck claim is made.

## Evidence limits and remaining work

The accepted layout scenarios use desktop Chromium155.0.8059.85 with viewport sizes1440×1000,768×900,390×844,320×640 and390×440. Smaller desktop viewports simulate geometry, not actual iOS/Android keyboards, IME or screen-reader behavior. Automated accessibility passes do not certify all accessibility requirements. Source review and scoped tool checks reduce collateral risk but do not prove every Tools/Labs route unchanged in all states.

The original failure screenshots and earlier geometry artifacts are retained as history. The accepted `layout.json` supersedes the failed layout captures; `editor.json` supersedes the initial reset/undo reproduction for its tested cases. [LAYOUT_PLAN.md](LAYOUT_PLAN.md) now documents the implemented scoped layout and focus exception, rather than a pending implementation proposal. Focus-based expansion persists across Run/Check focus and clears on leaving the work pane; short viewports use safe page scrolling.

Local batch5 repair and regression are complete. Actual mobile-device keyboard/IME validation, comprehensive assistive-technology testing, production Python isolation, and any performance claim remain outside the completed evidence. No deployment, generator run or curriculum/grading-policy change is implied by these accepted local gates. Rollback must use the original dirty-tree snapshot and scoped batch changes; never revert unrelated user work wholesale.

## Final conditional gate and combined regression

The [conditional engine report](CONDITIONAL_ENGINE_REPORT.md) records three reproduced failures before repair, the narrow changes, and six passing regression cases. Independent review reran all six and approved the patch. Package timeout/retry already passed and was not redesigned. The mount deadline is separate from learner execution time; no performance optimization or engine replacement was introduced.

Final combined command selected the preparation, operation ownership, SQL cell ownership, editor recovery, feedback snapshot, SQL count, Python/SQL client, SQL grading/canonical features, learning/practice/Python progress/project contracts, sandbox, real Python mounts and real Python grading-function suites. [regression-tests.txt](evidence/regression-tests.txt): **17 test files, 285 tests passed**. Counts supersede the earlier 279-test run; do not add overlapping per-batch totals. [final-freeze.json](evidence/final-freeze.json): **812 unchanged files**, only allowlisted SQL expected-count metadata, zero failures.

[journeys.json](evidence/journeys.json): six successful browser scenarios covering SQL lesson/practice syntax failures, wrong/correct checks, stale feedback and draft reload; Python lesson/practice syntax/runtime failures, streamed output, recovery and reload; SQL project checkpoint and edited evidence; Python checked milestone progression and cumulative files. [preparation.json](evidence/preparation.json): Stop during deliberately delayed sandbox loading then retry, and client navigation away from running Python followed by a usable workspace.

Source snapshots and [REPAIR_MANIFEST.json](REPAIR_MANIFEST.json) distinguish repair changes from the pre-existing dirty application work. No packages, lockfiles, configuration, content, datasets, grading rules or progress-store files changed relative to the captured baseline. SQL learning surfaces have no Reset control; no new SQL Reset interaction was invented. Python Reset/Undo and milestone Undo Reset are covered explicitly.

### Remaining release gates

- Real phone/tablet hardware, actual virtual keyboards, IME/composition and manual screen-reader verification were not available in this desktop browser session. Viewport, keyboard focus and Axe evidence are local automated checks only.
- Python production isolation remains a separate mandatory launch gate. Existing production guards and deployment configuration are untouched.
- Full TypeScript validation still reports only the pre-existing frozen `src/content/python-v2/projects/step.ts:29` TS2322 mismatch. This is not presented as a clean typecheck.
- No cold-start/performance improvement is claimed: functional preparation bounds and ownership fixes are not a benchmark.

Final reviewed-source reruns: [ownership3/3](evidence/final-lifecycle/lifecycle.json) and [preparation2/2](evidence/final-preparation/preparation.json), zero captured page errors. The preparation recovery screenshot was visually inspected. Targeted new/shared UI and engine lint checks passed; `git diff --check` passed.

## Approved exception: step.ts type fix (2026-10-21)

The owner approved one type-only change to frozen `src/content/python-v2/projects/step.ts`: the `milestone()` parameter `id: string` became `id: PyMilestone["id"]`. Content, milestone IDs, solutions and grading did not change. In `FROZEN_CONTRACTS.json` only that record changed: `sha256` is the new hash, and `original_sha256` keeps `228406df…a04e`. `BASELINE.json` was not touched.

- `tsc --noEmit`: clean, with no errors.
- `verify_frozen.py`: 812 files passed (811 unchanged and `step.ts` at the approved hash). The worker still differs only by the allowlisted change.
- Project and content regression (`python-projects-v2-state`, `python-project-function-editing`, `projects-contract`, `python-v2-content`, `-registry`, `-quality`, `-versions`, `-beginner`): 8 files, 1,891 passed, 1 skipped.
- `next build` was run directly, without the `prebuild` hook, which rewrites canonical datasets and fetches Pyodide. It used `NEXT_DIST_DIR=.next-rc`. Hashes of `public/datasets`, `public/vendor` and `src/data/datasets/generated` were identical before and after. **The build still fails** at the lint step:
  - Frozen `src/content/python-v2/questions/M15.ts`: 15 `react-hooks/rules-of-hooks` false positives, because a local data helper is named `use`.
  - `src/features/python/Project.tsx:138`: `react/no-unescaped-entities` on "You've finished this project."
  Neither was changed. Each needs its own approval: M15 is curriculum and frozen, and Project.tsx is UI.
- Full-suite flakiness is tracked separately and was not changed. In two full `vitest run` passes, one load-related timeout appeared each time in a different place (an unnamed test in one run; the `python-datasets.test.ts` setup hook at 10 s in the other). That file passes in isolation, 11/11.

## Approved exceptions: build-blocking lint fixes (2026-10-21)

The owner approved two changes, each limited to one fix:

- Frozen `src/content/python-v2/questions/M15.ts`: the local data helper `use` became `component` (the declaration and its 15 calls), which clears the `react-hooks/rules-of-hooks` false positives. A diff against the pre-repair snapshot shows nothing else changed. A JSON dump of the exported `m15Questions`, taken before and after, is byte-identical. In `FROZEN_CONTRACTS.json` only that record changed: `sha256` is `54ef23e7…e0a3`, and `original_sha256` keeps `b0f8ccc5…65b9`.
- `src/features/python/Project.tsx:138`: `You've` became `You&apos;ve`. Learners still see "You've finished this project."

Verification:

- ESLint on M15, Project.tsx and step.ts: 0 errors. The one warning, Project.tsx:56 `exhaustive-deps`, was already there.
- `tsc --noEmit`: clean, with no errors.
- `verify_frozen.py`: 812 files passed (810 unchanged and two at approved hashes). The worker still differs only by the allowlisted change.
- `next build` (`NEXT_DIST_DIR=.next-rc`, without the `prebuild` hook): **passed**. It compiled and generated all 365 static pages. Hashes of `public/datasets`, `public/vendor` and `src/data/datasets/generated`, and the git status, were identical before and after.
- Python content, grading and project tests (10 files): 1,973 passed, 1 skipped, **1 failed**, in `PY-L38-02` exercise c2. That exercise is not touched by these fixes.

### Pre-existing flaky gate: PY-L38-02 c2 (not fixed, needs approval)

A known-wrong answer (`return future.result()` on whatever `as_completed` yields first) is supposed to fail `skips-failures`. Under `INLINE_EXECUTOR` every future is already done, and `as_completed` returns finished futures in set order, which depends on memory addresses and changes between runs. When the successful `eu` mirror comes first, the wrong answer passes that check. Run alone, the test failed 2 out of 3 times; it had passed in an earlier run. This is a content-check gap, not just a flaky test: a learner's wrong solution can sometimes earn the pass. M38 is frozen and was not changed. Tracked together with the full-suite timeouts.

## Approved exception: PY-L38-02 c2 deterministic grading (2026-10-21)

**Defect.** The `skips-failures` check passed every future to `as_completed()` already finished. `as_completed` yields finished futures in set order, which depends on memory addresses, so the known-wrong answer (`return future.result()` on the first future) sometimes saw the working mirror first and passed. Over 100 runs of the old check, the wrong answer passed `skips-failures` in **36 of 100 warm-interpreter runs and 37 of 100 fresh-interpreter runs**.

**Fix.** Frozen `src/content/python-v2/lessons/M38.ts` gains `MIRROR_EXECUTOR`, which only this check uses:
- A down mirror's future has already failed when `submit` returns.
- An up mirror's future finishes as soon as anything waits on it (a waiter is installed) or reads it (`done`/`result`/`exception`).
- In Pyodide's Python 3.14.2, `as_completed` snapshots the already-finished futures before it installs its waiter, so every failure is yielded before the success.
- Nothing depends on sleeps, threads or set order.
- `INLINE_EXECUTOR` and every other check are unchanged.

A field-by-field comparison of the exported `m38Lessons` JSON, before and after, finds exactly one difference: `m38Lessons[1].challenges[1].task.checks[0].expr`. Wording, spec, answer, alternatives, wrong answers, `fails` lists, hints, labels and display text are byte-identical. In `FROZEN_CONTRACTS.json`, `sha256` is `3a2b9bd1…b5d7` and `original_sha256` keeps `e214cc3b…c2ea`.

**Repeated verification** (each run a fresh namespace in a warm interpreter, or a fresh interpreter):

| Program | Warm interpreter, 100 runs | Fresh interpreter, 100 runs |
|---|---|---|
| Reference answer | 100 passed | 100 passed |
| Listed alternative | 100 passed | (not run) |
| Wrong: returns first result | 100 failed `all-fail, skips-failures`, as expected | 100 failed as expected |
| Wrong: returns None when all fail | 100 failed `all-fail, none`, as expected | (not run) |

Unusual but valid solutions pass and none hang: `wait()` with ALL_COMPLETED, a FIRST_COMPLETED `wait()` loop, submission-order inspection, and `as_completed(timeout=2)`.

## Full-suite reliability (2026-10-21)

**What was measured.** A temporary setup file, passed through a temporary config and deleted afterwards, recorded the longest event-loop stall in each test file during full parallel runs (12 cores, Vitest forks pool).

Two different causes:

1. **`Timeout calling "onTaskUpdate"`.** Vitest's worker-to-main messages time out after 60 s. `tests/helpers/python-fast.ts` `runFast` runs Pyodide synchronously, and its only `await` is already resolved, so back-to-back runs never let the worker's event loop turn. `python-performance.test.ts` stalled its worker for **66.6 s** (and `python-v2-content` for 41 s). When the loop resumed, the timer fired before the reply was read. Every test still passed, but Vitest exited with code 1.
   - **Fix:** `runFast` now yields one turn (`setImmediate`) before each run, as the browser worker gets one per message. No timeout was raised.
2. **`python-datasets.test.ts` `beforeAll` timed out at 10 s.** The hook boots Pyodide and builds a whole dataset: about 5 s alone, and more than 10 s when CPU is shared. The config already sets `testTimeout` to 30 s for this reason, but hooks kept the 10 s default.
   - **Fix:** that hook and the D07 build hook in the same file each get an explicit 30 s, with a comment. No global setting changed.

**Gate.** Three consecutive full runs: each **88/88 files, 4,636 passed, 42 skipped, 0 failed, 0 errors, exit code 0**. Longest stalls afterwards: `pretty-sql` 25–27 s, `canonical/learn` 19–20 s, `python-performance` 11–13 s (was 66.6 s). The SQL suites use the same synchronous pattern (`tests/helpers/original.ts` `send`) and stay below half the 60 s limit, so they were left unchanged.

**Final checks after these changes:**
- `tsc --noEmit`: clean.
- ESLint on the changed files: clean.
- `verify_frozen.py`: 812 files passed.
- `next build` (`.next-rc`, without the prebuild hook): passed, 365/365 pages. Dataset, vendor and generated hashes and git status were unchanged by the build.
- The browser journey and Axe scripts need a running dev server and were not rerun in this pass.

## Mobile layout: one page scroll (2026-10-21)

See the last section of [LAYOUT_PLAN.md](LAYOUT_PLAN.md). The browser check covered the six activity screens at 390×844, 320×640, 768×900, 844×390 and 1440×1000 on `next dev`. All 24 phone and tablet cases had no scrolling container outside the code editor, one page scroll, no horizontal overflow and a reachable Run. Desktop is still side by side. `tests/e2e/workspace-stabilization.mjs` layout assertions were updated to match: desktop assertions are unchanged, and stacked panes must not scroll on their own. Results: layout 36/36 on two consecutive runs (including six Axe scans), navigation 7/7, editor 2/2. One layout run before `SHOTS` was redirected rewrote the layout screenshots, geometry and Axe files in `evidence/`; they now show the current layout.

## Approved exception: SQL-Q81-01 prompt names the graded columns (2026-10-21)

**Defect.** Practice qb-0081 (`/sql/practice/debug-the-second-best-win-total`) said "Return team_id and wins", but its columns, solution and expected result are `season, team_id, wins`. The result is per season, so `season` is needed. A learner who followed the sentence failed "Returns columns season, team_id, wins".

**Fix.** Frozen `src/content/question-bank/canonical/practice-reasoning.ts`: the prompt now says "Return season, team_id and wins." The grader was not changed or loosened. The exported objects were compared field by field before and after, and exactly one field differs: `reasoningQuestions[9].task` (which is `bankQuestions[80].task`). Columns, starter, solution, hints, wrong answers and `extraMutation` are byte-identical. In `FROZEN_CONTRACTS.json`, `sha256` is `c8552cb0…7997` and `original_sha256` keeps `8b1dc84d…f861`.

**Verification** (browser, `next dev` :3040). The reference answer and an independently written CTE (MAX below the season maximum) both passed 5/5. A two-column answer (no season) still failed the column check. RANK failed the changed-data check (4/5). The ROW_NUMBER starter failed the row count (10 rows instead of 11). `tests/v4.test.ts` passed, including the qb-0081 tie test and "broken starter fails".

## Approved exception: SQL-L03-01 double quotes taught accurately (2026-10-21)

**Defect.** Lesson 3 (`/sql/lesson/filter-with-where`) said `WHERE order_type = "sale"` "compares with a column named sale". Its concept check marked `= "sale"` as a wrong way to keep sale orders. That is false in the shipped engine. In `public/vendor/sql-wasm.js` (SQLite 3.49.1), a double-quoted name that matches no column falls back to a string literal: `= "cancellation"` returned the same rows as `= 'cancellation'`, while `= "order_type"` returned every row. So `WHERE order_type = "cancellation"` correctly passed every check on challenge 1. The grader was left as it is: this is valid SQLite behaviour.

**Fix.** Frozen `src/content/canonical/lessons-foundations.ts`, lesson 3 only:
- The trap now says: use single quotes for text; standard SQL uses double quotes for names; SQLite reads `"sale"` as text only because no column has that name; and `"order_type"` would compare the column with itself.
- The concept check now asks why to prefer `'sale'`. The correct option is "'sale' is always text; \"sale\" is read as a column name first".

The exported objects were compared field by field before and after. Exactly these fields differ: `lessons[3].trap`, `quiz.q`, `quiz.options[0..2]` and `quiz.why`, the same fields in `foundationLessons[3]`. Tasks, answers, hints, walkthrough, concept and grading are byte-identical. `quiz.correct` is still 0, and the question still mentions "sale orders", as `tests/concept-checks.test.ts` requires. In `FROZEN_CONTRACTS.json`, `sha256` is `8e36d620…91f7` and `original_sha256` keeps `cbc3b980…7a8f`.

**Other occurrences.** The same claim was searched for in `src/content` (lessons, question bank, syntax notes, tools, previews), `src/engine/explain.ts`, `src/features/rt` and `original-site/dist`. Only lesson 3 made it. `explain.ts` ("wrap it in single quotes") and the lesson 6 hint ("each in single quotes") are accurate.

**Verification** (browser, `next dev` :3040, challenge 1):
- Pass all checks: the reference answer and an independent answer (`'cancellation' = o.order_type` with an alias and ORDER BY). `"cancellation"` also passes, which is valid in SQLite and now explained.
- Rejected (2 of 5 checks): the wrong value `'sale'`, the wrong case `'Cancellation'`, the wrong column `country = 'cancellation'`, and `= "order_type"`.
- Concept check: option b shows "Not quite"; option a shows "Correct".

**Tests and freeze.** `npx vitest run tests/v4.test.ts tests/concept-checks.test.ts tests/canonical/practice.test.ts tests/question-bank.test.ts tests/canonical/learn.test.ts tests/teaching-correctness.test.ts`: 6 files, 1,110 passed, 41 skipped, 0 failed. `verify_frozen.py`: 812 files passed. Among files that differ from their original baseline hash, these two are the only SQL ones; the others are the earlier approved Python exceptions.

## SQL failure feedback wording (2026-10-21, no frozen change)

Failed-check text in SQL Learn, Practice, Projects, Playground and Lab is now worded from the grader's verdict plus the result previews and the query text, in non-frozen files only: new `src/features/rt/feedback.ts`; `checks.ts`, `Cells.tsx`, `Output.tsx`, `Challenge.tsx`, `pages/Practice.tsx`, `pages/Lab.tsx`, `projects/ProjectWorkspace.tsx`, `src/engine/explain.ts`. `grading.ts`, `public/vendor/grading.js`, the worker and `learning-state.ts` (`classifyFailure` still reads the raw grade message) are untouched, so no verdict can change. Browser check on `next dev` :3040: 31 before/after cases kept the same pass/fail; 3 more alternative correct answers pass. Tests: `tests/sql-feedback.test.ts` (new), `sql-check-counts`, `explain`, `content-language`, `grading`, `plan-validation`. `verify_frozen.py` reports no SQL or worker failure; its remaining failures are Python content files edited by another agent.

## Python hidden-requirements sweep (2026-10-21)

A script loaded all 250 lessons (750 exercises), 500 practice questions and 50 project steps and compared what each check needs (function names, keys and columns the reference reads, keys in expected values, files, a file's final newline, rounding, order, exception types, built text formats) with what the learner sees before checking: prompt, spec, examples, expected output, starter and editor files, read-only tabs and lesson text. 1,301 items were scanned. After noise filters, 82 items were flagged. A second pass flagged 69 items whose built text never appears word for word on the screen. All 51 project steps were also read by hand. Every flag was checked by hand: 13 items had a real hidden requirement, in 8 frozen files, and were fixed by adding words to a prompt, spec or brief. No check, starter, solution, wrong answer, hint, task or data changed. For each file, the exported objects were compared field by field before and after: only `prompt`, `spec` or `brief` fields differ. Evidence: `/private/tmp/claude-501/-Users-krishnasathvikmantripragada-sqlstudio/d7c31e9e-ff6b-4cf6-b70a-304c3045681f/scratchpad/sweep-py/REPORT.md`, `fielddiff.txt`, `before-results.json`, `after-results.json` and `shots/` in the same folder.

Verification for all eight files:
- `npx vitest run tests/python-v2-content.test.ts -t "<the 13 item ids>"`: 13 passed.
- `tests/python-v2-quality.test.ts`, `python-v2-registry` and `python-v2-versions`: passed.
- Browser on `next dev` :3040 for #499, P03 steps 3–5 and P04 step 4, before and after. The new text is visible. The reference and an answer written only from the stated text pass. Wrong answers still fail: total from `fare_amount`, every station's highs, rows instead of dates, and no final newline.
- `verify_frozen.py` passes.

### Approved exception: PY-Q50-20 names the trip fields (2026-10-21)
Frozen `src/content/python-v2/questions/M50.ts`. #499 `the-nightly-job`: the rows need `pickup_zone_id` and `total_amount`, but the screen never named them, and the `taxi` package and `trips.csv` are not editor tabs. The prompt now has the #211 provided-files note. The spec has a "Trip fields" row, and "Rows" says `borough` comes from `pickup_zone_id` and `total` is `total_amount`. Changed fields: `m50Questions[8].prompt` and `.spec` (one row added). `sha256` `003d8c58…14f3`; `original_sha256` keeps `bcb7d28e…1dc6`.

### Approved exception: P01 receipt format, `name` field, add_sale result (2026-10-21)
Frozen `src/content/python-v2/projects/P01.ts`.
- P01.m1: the mounted data's `name` field is named.
- P01.m4: the brief gives the line formats (`<name> x<quantity> <price>`, `subtotal <amount>` …), says dollars have two decimals, and says every line ends with a newline.
- P01.m5: `add_sale` returns True when it adds and False when it refuses. The check reads that value.

Changed fields: `p01.milestones[0,3,4].brief`. `sha256` `0a413433…7bb4`; `original_sha256` keeps `7043a359…1e0e`.

### Approved exception: P02 report newline (2026-10-21)
Frozen `src/content/python-v2/projects/P02.ts`. P02.m5: every line, the last one too, ends with a newline. Changed: `p02.milestones[4].brief`. `sha256` `2f4434b6…420a`; `original_sha256` keeps `6f114c2f…222c`.

### Approved exception: P03 weather columns and return value (2026-10-21)
Frozen `src/content/python-v2/projects/P03.ts`. The mounted CSV shows no header.
- P03.m3 names `station_id`.
- P03.m4 names `tmax_c` and `tmin_c`, and says `alert_days` returns the alert days' `observation_date` values, in file order.
- P03.m5 says the line ends with a newline.

Changed: `p03.milestones[2,3,4].brief`. `sha256` `3bdd696d…8ac6`; `original_sha256` keeps `259068d4…3453`.

### Approved exception: P04 report newline (2026-10-21)
Frozen `src/content/python-v2/projects/P04.ts`. P04.m4: every line, the last one too, ends with a newline. Changed: `p04.milestones[3].brief`. `sha256` `c7d52819…38f0`; `original_sha256` keeps `fe119cae…cc97`.

### Approved exception: P08 report newline (2026-10-21)
Frozen `src/content/python-v2/projects/P08.ts`. P08.m5: the counts go on two lines, each ending with a newline. Changed: `p08.milestones[4].brief`. `sha256` `542e44b9…2161`; `original_sha256` keeps `b409fdf2…7584`.

### Approved exception: P09 report newline (2026-10-21)
Frozen `src/content/python-v2/projects/P09.ts`. P09.m5: the line ends with a newline. Changed: `p09.milestones[4].brief`. `sha256` `fbd59fa3…2c57`; `original_sha256` keeps `88465140…f263`.

### Approved exception: P10 accepted ids, ship newline (2026-10-21)
Frozen `src/content/python-v2/projects/P10.ts`.
- P10.m1: `accepted` returns the kept flight ids (the `flight` values), in file order. The stub's docstring says "Rows…", but the check expects `['F1']`.
- P10.m6: every line ends with a newline.

Changed: `p10.milestones[0,5].brief`. `sha256` `05d7970e…857d`; `original_sha256` keeps `33652259…bc49`.

## SQL hidden-requirements sweep (2026-10-21)

A script ran every reference answer on its dataset: 139 practice questions, 176 lesson challenges and 50 project checkpoints (365 items). It compared what each checker needs with what the learner sees on that screen:
- Needs: graded columns, ROUND precision, ORDER BY and tie-breaks (when ties exist), date boundaries, DISTINCT, output labels.
- Sees: prompt; practice rules, column list and expected preview; project Task tab (the Metrics tab counts as hidden).

It raised 523 flags on 160 items, and every one was triaged by hand. Uncertain conventions were run through the production worker and grader. A requirement counted as hidden only when a natural reading of the task failed.

51 items had a real hidden requirement, in 7 frozen files. Each was fixed by adding words to the task text. No grader, reference answer, expected result, dataset, hint, definition, column list or ordering flag changed. For each file, the exported objects were compared field by field before and after: only `task`, a lesson `prompt`, or a checkpoint `grain` differs. The grain is the "What to return" line, held in both `validation.grain` and `expectedEvidence.grain`.

Left for the owner, not changed:
- qb-0083 does not enforce its stated tie-break.
- Lesson 20 (readable-queries-with-ctes) says "Using a CTE", but nothing requires one.
- qb-0086 uses the hour-ending window, but the calendar window grades the same.

Evidence: `/private/tmp/claude-501/-Users-krishnasathvikmantripragada-sqlstudio/d7c31e9e-ff6b-4cf6-b70a-304c3045681f/scratchpad/sweep-sql/REPORT.md`, `FIELD_DIFF.md`, `snap-before/`, `snap-after/`, `out/` and `browser/{before,after}/` in the same folder.

Verification for all seven files:
- `npx vitest run tests/question-bank.test.ts tests/canonical/practice.test.ts tests/canonical/learn.test.ts tests/concept-checks.test.ts tests/teaching-correctness.test.ts tests/projects-canonical.test.ts tests/projects-contract.test.ts tests/v4.test.ts tests/content-language.test.ts`: 9 files, 1,175 passed, 41 skipped, 0 failed.
- Browser on `next dev` :3040, before and after, 11 samples: Q1, Q85, Q87, Q97, Q114, Q135, lesson 57 challenge 2, and the Healthcare outcomes, Ballpark standings, Payment settlement and Airline baseline checkpoints. The new text is visible. Reference answers pass, and so do independent answers written from the stated text. Wrong answers still fail: calendar window, director left out, swapped host counts, unrounded values, 1-decimal share, ordering by wins alone, paraphrased labels, on-time `<= 15`.
- `verify_frozen.py` passes (812 files).

### Approved exception: SQL-HR-01 qb-0001 has no phantom filter (2026-10-21)
Frozen `src/content/question-bank/canonical/practice-core.ts`. qb-0001 (`customer-list`) said "Find every Retail customer". customers has no segment column; "Retail" is the dataset's name. It now says "Find every customer." Changed: `coreQuestions[0].task` (`bankQuestions[0].task`). `sha256` `6d868350…15e1`; `original_sha256` keeps `0316f946…f977`.

### Approved exception: SQL-HR-01 grid windows, director, host counts (2026-10-21)
Frozen `src/content/question-bank/canonical/practice-reasoning.ts`, which already had the SQL-Q81-01 exception.
- qb-0085: the hour-ending Q1 window was only in a hint. The task now says "hours ending after 2024-01-01 00:00, up to and including 2024-04-01 00:00".
- qb-0087: the May window was not stated anywhere. The task now gives the same kind of window. For both, the natural `>= / <` range failed "Values match".
- qb-0097: the task now says the director is included with levels_down 0 (25 rows). Leaving the director out (24 rows) failed.
- qb-0114: the task now returns and defines games_at_a and games_at_b (games each team hosted against the other). Before, the graded columns were never defined and were missing from "Return".

Changed: `reasoningQuestions[13,15,25,42].task` (`bankQuestions[84,86,96,113].task`). `sha256` `9813cf50…52b8`; `original_sha256` keeps `8b1dc84d…3861`.

### Approved exception: SQL-HR-01 qb-0135 whole minutes (2026-10-21)
Frozen `src/content/question-bank/canonical/practice-patterns.ts`. qb-0135 (`encounters-that-overlap-in-time`): overlap_minutes is now "rounded to whole minutes". An unrounded answer failed "Values match". Changed: `patternQuestions[20].task` (`bankQuestions[134].task`). `sha256` `710fe2db…1c5e`; `original_sha256` keeps `a28c9304…9980`.

### Approved exception: SQL-HR-01 lesson 57 batting_avg rounding (2026-10-21)
Frozen `src/content/canonical/lessons-windows.ts`. Lesson 57 (`ntile-and-balanced-ranking-buckets`), challenge 2, now says "batting_avg (hits ÷ at bats, rounded to 3 decimals)". Before, only challenge 1 and the hints said so, and an unrounded answer failed. Changed: `windowLessons[57].tasks[1].prompt`. `sha256` `64336d4d…bdc8`; `original_sha256` keeps `8fc153fc…ede6`.

### Approved exception: SQL-HR-01 beginner project Task tab (2026-10-21)
Frozen `src/content/projects/beginner.ts`. Rounding, tie-breaks, exact labels and key definitions were only on the Metrics tab. They are now added to each checkpoint's "What to return" line (`grain`):
- retail-performance-review: baseline (money to 2 decimals; cancellation_rate as a fraction, to 4 decimals), months, departments, customers
- airline-reliability-review: baseline (on time means arrival_delay under 15 minutes on completed flights; `<= 15` failed), airlines, causes (the five labels), airports
- urban-mobility-demand: demand-time, demand-location, airports
- city-climate-risk: coverage, hottest-cities, heavy-rain
- ballpark-fan-experience: home-advantage, attendance-length, standings-2025 (then run_differential, then team_id; ordering by wins alone failed), hitters-2025 (tie-breaks, player_name format, 3 decimals)

Changed: `stages[].validation.grain` and `stages[].expectedEvidence.grain` of those 18 checkpoints. `sha256` `e594b06f…a066`; `original_sha256` keeps `517129a8…7d99`.

### Approved exception: SQL-HR-01 intermediate project Task tab (2026-10-21)
Frozen `src/content/projects/intermediate.ts`. The "What to return" line (`grain`) now gives the rounding and tie-breaks that were only on the Metrics tab:
- healthcare-operations: appointment-outcomes, no-shows, payer-mix, emergency-returns
- grid-demand-generation: forecast-error (also: only hours with demand_mw above 0; NOT NULL alone failed), renewables, imports
- engineering-delivery-performance: pr-outcomes, cycle-time, review-coverage, change-failure
- cold-chain-monitoring: alerts-by-sensor, alerts-by-site, maintenance

Changed: `stages[].validation.grain` and `stages[].expectedEvidence.grain` of those 14 checkpoints. `sha256` `f8d06067…cab1`; `original_sha256` keeps `bb12b98b…9b49`.

### Approved exception: SQL-HR-01 advanced project Task tab (2026-10-21)
Frozen `src/content/projects/advanced.ts`. The "What to return" line (`grain`) now gives the rounding, tie-breaks, exact labels and definitions that were only on the Metrics tab:
- saas-activation-retention: activation, retention, channels
- payment-reconciliation: authorizations, duplicates (extra_settled_amount defined, in dollars), settlement (the three labels; compare in whole cents, because `amount * 100 =` failed), ledger (the three labels), refunds
- delivery-network-reliability: service-levels, carriers, first-attempts
- trusted-retail-warehouse: profile

Changed: `stages[].validation.grain` and `stages[].expectedEvidence.grain` of those 12 checkpoints. `sha256` `7b8efb02…6927`; `original_sha256` keeps `04f95554…2e09`.

### Approved exception: SQL-L20-01 lesson 20 recommends a CTE (2026-10-21)
Frozen `src/content/canonical/lessons-joins.ts`. Lesson 20 (`readable-queries-with-ctes`), challenge 1, said "Using a CTE, find routes …", but the checker accepts any correct query. It now says "Try writing this with a CTE. Find routes …". No syntax requirement was added and the checker is unchanged. Changed: `joinLessons[20].tasks[0].prompt` only. `sha256` `54a1e0f8…469a`; `original_sha256` keeps `19a01973…9d2a`.

Verification: browser on `next dev` :3040 shows the new text and not the old one. The CTE answer passes, and so does a non-CTE `GROUP BY … HAVING` answer. Counting all flights instead of operated ones still fails (75 rows).

### Approved exception: SQL-Q83-01 qb-0083 tie-break is graded (2026-10-21)
Frozen `src/content/question-bank/canonical/practice-reasoning.ts`. qb-0083 (`debug-each-account-s-last-posted-amount`) states the order "by posted_at, transaction_id", but no account had a tie at its last posted_at, so a wrong tie-break still passed. It now uses the existing per-question `extraMutation` hook, which runs only in the changed-data check. That fixture gives each account's lowest-id and highest-id posted entry (accounts 1–30) the account's latest posted_at. The tie-break then decides last_amount. A wrong answer with a reversed tie-break (`transaction_id DESC`) was also added. Changed: `reasoningQuestions[11].extraMutation` (new) and `reasoningQuestions[11].wrong[1]` (new), which is `bankQuestions[82]`. The task, columns, starter, solution, equivalents, hints, the first wrong answer, the canonical dataset and its shared mutation are byte-identical. No grader or worker change. `sha256` `f453fb48…10f0`; `original_sha256` keeps `8b1dc84d…3861`.

Verification:
- Production worker (`bankCheckRequest`):
  - Pass: the reference answer, the authored FIRST_VALUE equivalent, and two answers written separately with the stated tie-break (a correlated `ORDER BY posted_at DESC, transaction_id DESC LIMIT 1`, and ROW_NUMBER + join).
  - Now fail on changed data (all passed before): reversed tie-break, FIRST_VALUE `ORDER BY posted_at DESC` with no tie-break, FIRST_VALUE with an ascending id tie-break, ROW_NUMBER with no tie-break, and a join on MAX(posted_at).
  - Still fail on visible data: the starter and the existing default-frame wrong answer.
- Known limit: LAST_VALUE `ORDER BY posted_at` with no tie-break, and the correlated `ORDER BY posted_at DESC LIMIT 1`, still pass. SQLite orders the tied rows by rowid through `idx_transactions_account_id_posted_at`, and here rowid is transaction_id (INTEGER PRIMARY KEY). That order is the stated tie-break, so no data fixture can tell these queries apart. Catching them would need a grader or plan-level change, which is out of scope.
- `npx vitest run tests/question-bank.test.ts tests/canonical/practice.test.ts tests/canonical/learn.test.ts`: 3 files, 1,070 passed, 41 skipped, 0 failed. There was 1 unhandled vitest RPC timeout (`onTaskUpdate`) under machine load, not a test failure. qb-0083: the solution passes, the wrong answers fail, and the answer changes on the changed-data fixture.
- Browser on :3040 (Q83): the reference answer and the separately written correct answer pass. The reversed tie-break shows "4 of 5 checks passed" and fails "Still correct on different data". FIRST_VALUE with no tie-break fails, and the starter fails "Values match".

### Approved exception: PY-Q01-09 packing-slip comment wording (D2, 2026-10-21)
Frozen `src/content/python-v2/questions/M01.ts`. Practice #4 (`/python/practice/packing-slip`) said "start the file with a comment", and its check label said "Starts with a comment". But the check (`hasComments`, at least one full-line `#` comment) accepts a comment on any line. The prompt now ends "Include a comment explaining what the program does.", and the label reads "Include a comment explaining what the program does". The check was not changed. In a field-by-field comparison of the exported `m01Questions`, exactly two fields differ: `m01Questions[9].prompt` and `m01Questions[9].code.task.checks[2].label`. The check expr, answer, wrong answers, hints, spec and expected output are byte-identical. `sha256` `0f8a8967…d7ec`; `original_sha256` keeps `62f27d24…5cd0`.

Verification: browser on :3040. The new wording shows in the prompt and on the check row. The reference answer passes 3/3, and so does an answer whose comment line sits between two prints. The answer with no comment fails only the comment check. A trailing inline comment (`print(...)  # …`) also fails, as it did before, because the check counts only full-line comments. `tests/python-v2-content.test.ts -t PY-Q01-09`: the gate passes.

### Approved exception: P05.m4 booked_days docstring says date order (D4, 2026-10-21)
Frozen `src/content/python-v2/projects/P05.ts`. The stub docstring for `booked_days` said "in the order they were inserted". Everything else uses date order: the brief ("read those days back in date order"), doneWhen, hint 3, the reference solution (`ORDER BY day`) and the `saved` check (inserts 2024-06-02 then 2024-06-01 and expects them in date order). The docstring now reads "in date order." The algorithm and grader are unchanged. In a field-by-field comparison of the exported `p05`, exactly 8 fields differ, all in the `desk.py` text derived from `SHOW`: `milestones[3]` and `[4]` `starters`, `solution`, `wrong[0].files` and `wrong[1].files`. Each differs only on that docstring line. Checks, briefs, `main.py` and data are byte-identical. `sha256` `f63b8995…8955`; `original_sha256` keeps `7e875322…bf3d`.

Verification: browser on :3040. After passing m1–m3 with their reference solutions, the `desk.py` stub on arrival at m4 shows `"""The days stored in the SQLite file, in date order."""`. The reference answer passes 2/2. An insertion-order answer (`ORDER BY rowid`) fails `saved` with `['2024-06-02', '2024-06-01']`. `tests/python-project-steps.test.ts` passed 123/123. `tests/python-v2-content.test.ts -t "P05.m4|P05.m5"`: the gates pass.

### Approved exception: PY-Q47-20 `sets` deterministic grading (2026-10-21)
**Defect.** Found by full-suite run 2 of 3 after Batch 5. The hidden `sets` check converted only `{'gift', 'express', 'b2b'}`. String hashes are randomised per interpreter, so set iteration order varies between runs. The known-wrong answer (`list(value)` for sets) came out in sorted order by chance about 1 run in 6 and passed `sets`, so a learner whose only mistake was leaving sets unsorted could occasionally earn the check. The gate test failed for the same reason.

**Fix.** Frozen `src/content/python-v2/questions/M47.ts`: the `sets` check now converts `{'tags': {'gift', 'express', 'b2b'}, 'ids': {8, 1}}` and expects `{'tags': ['b2b', 'express', 'gift'], 'ids': [1, 8]}`. Small int hashes are not randomised, and `{8, 1}` always iterates as `[8, 1]`, so an unsorted conversion always fails. Exactly one source line changed: that check's expr and expected value. Its label, the prompt, spec, answer, alternatives, wrong answers, `fails` lists, hints and every other check are byte-identical. `sha256` `5e1459d2…fac1`; `original_sha256` keeps `bfdcbc5c…38cf`.

**Verification.** `npx vitest run tests/python-v2-content.test.ts -t "PY-Q47-20"` passed 15 of 15 consecutive runs (reference, both alternatives and the wrong answer's exact `fails` list). Full suite re-run three consecutive times afterwards (see below).

### Owner decision: SQL-Q83-01 residual gap accepted (2026-10-21)
After the tie fixture, queries with **no** tie-break (`LAST_VALUE … ORDER BY posted_at`, or a correlated `ORDER BY posted_at DESC LIMIT 1`) still pass qb-0083. SQLite returns tied rows in rowid order, and rowid is `transaction_id`, the stated tie-break, so no data fixture can separate them. Catching them would need SQL-text inspection in the grader. The owner accepted the gap: these queries return correct results on this engine, and every wrong tie-break is rejected. No grader change.

### Approved exception: Python Database Lab usability, dataset coverage and index timing (2026-10-21)
Frozen `src/content/python-v2/tools/lab.ts`, plus the new frozen file `src/content/python-v2/tools/lab-duckdb.ts`, which is added to `directory_membership`. The owner approved this change.

- **Beginner start.** New first activity `first-query` ("Start here: read rows from a table", `envs: "any"`). It is the default activity for every environment. Its Python connects, runs `SELECT * … LIMIT 5`, reads `cur.description`, calls `fetchall()`, prints the rows and counts them. Its SQL version fills in `__TABLE__` through the new `activitySql()`.
- **Dataset coverage.** 11 new environments: `retail` D02, `complaints` D03, `rentals` D05, `taxi` D06, `quakes` D08, `food` D09, `papers` D10, `repos` D11, `forum` D12, `places` D14 and `planets` D15. Each is built by the existing `importProgram` from the existing standard-edition clean CSVs, so there is no new data and no generator run. All 15 Python datasets now have an environment.
- **Activities.** Each new environment gets one Connect-and-query activity written for its data. `transactions`, `upsert` and `bulk-insert` use the new `envs: "all"` value, which means every environment plus scratch. There is also a new `activityEnvs()` helper.
- **Index timing.** `index-experiment` now times with `time.perf_counter_ns()`. It repeats the query for at least 0.2 s, then reports the time per query in ms, µs or ns, the number of runs and the measured clock step.
- **DuckDB.** `lab.ts` imports `DUCKDB_ACTIVITIES` from `lab-duckdb.ts` and appends them to `LAB_ACTIVITIES`.

The four original environments and the code of the other existing activities are byte-identical. `lab.ts`: `sha256` `6ae536dd…2484`; `original_sha256` keeps `4b7d4057…cba3`. `lab-duckdb.ts`: recorded at `b78a81a9…ccb9`. The DuckDB change owns that file's content and updates its `sha256` when it edits the file.

Verification:
- `npx vitest run tests/python-lab.test.ts tests/python-tools.test.ts`: 150 passed. This covers building every environment and running every activity on every environment it lists, in Pyodide.
- Browser on `next dev` :3040 at 1440×900:
  - A first visit opens Online Store with "Start here: read rows from a table", and it runs.
  - 16 databases × their activities: 125 runs, 125 pass.
  - Datasets shows "Open in Database Lab" for all 15 datasets, and each opens the matching database with its tables.
  - `index-experiment` printed "1.33 ms per query (151 runs)" without the index and "24.6 µs per query (8,143 runs)" with it, with a clock step of 100.0 µs.
  - Reset removed a table that `upsert` had created.
- Browser at 390×844: the beginner activity runs and the page has no horizontal scroll.
- `npx tsc --noEmit` and ESLint on the changed files are clean.

### Approved exception: Performance Lab database experiments (2026-10-21)
Frozen `src/content/python-v2/tools/performance.ts`, owner-approved. New category `Databases` in `PerfCategory` / `PERF_CATEGORIES` (between Files and I/O and Real-world optimization), and 5 experiments appended to `EXPERIMENTS`: `sqlite-index-lookup`, `sqlite-transaction-batching`, `sqlite-filter-in-sql`, `sqlite-vs-duckdb-aggregation`, `pandas-vs-duckdb-join`. Execute-per-row vs executemany is not duplicated (it stays `sqlite-batch-insert`). The 49 existing experiments are byte-identical: a field-level diff of the exported `EXPERIMENTS` before/after compared 1,302 leaf fields with 0 differences, same order and ids; `paramLines` and `experimentById` unchanged. No UI, engine or dataset change; no new file. `sha256` `c18d1690…c897`; `original_sha256` keeps `f5c3f70a…b4a3`.

Verification: `npx vitest run tests/python-performance.test.ts` 110/110 (every experiment at default and smallest inputs in real Pyodide, results equal). `tests/python-compare.test.ts -t catalogue` passed (the join's `compare` link resolves). Browser on :3040: every option of each new experiment run with "Run comparison", each showed "Both give the same answer", and "Break down the time" ran once per new experiment; `loop-vs-comprehension`, `sqlite-batch-insert` and `pandas-vs-duckdb` re-run unchanged. eslint clean; `verify_frozen.py` passed.

### Approved exception: Database Lab DuckDB activities (2026-10-21)
Frozen new file `src/content/python-v2/tools/lab-duckdb.ts` (already in `directory_membership` from the Database Lab change), owner-approved. `DUCKDB_ACTIVITIES` holds 6 activities, appended to `LAB_ACTIVITIES` by `lab.ts`; `lab.ts` itself is not touched by this change. Every activity reads real dataset files mounted under `data/` through the existing `data` field (no new data, no generator run):
- `duckdb-query-files` "DuckDB: query CSV and Parquet files directly" (Data work, flights; D13 standard `flights.csv`, `flights.parquet`): `duckdb.read_csv()` with the guessed column types, then the same question on `read_parquet()`, answers compared.
- `duckdb-joins` "DuckDB: joins and aggregations across files" (Data work, flights; D13 standard `flights.parquet`, `airlines.csv`, `airports.csv`): views over files, airline scorecard, routes with a double join to airports, `QUALIFY` window ranking.
- `duckdb-python-api` "DuckDB from Python: connect, parameters, results" (Connect and query, weather; D07 standard `daily_weather.parquet`, `stations.csv`, `cities.csv`): `duckdb.connect()`, `?` and `$name` parameters, `fetchone`/`fetchall`, relation chaining, `.df()` to pandas and querying a DataFrame by name.
- `duckdb-vs-sqlite` "DuckDB vs SQLite: same answer, measured" (Speed and indexes, flights; D13 standard `flights.parquet`, the edition `flights.db` is built from): same 17,661 rows; answers checked row by row, then 7 `perf_counter` timings each. Has a SQL-tab version.
- `duckdb-big-file` "DuckDB on a bigger file: three months of flights" (Speed and indexes, flights; D13 full `flights.csv` 16.8 MB, `flights.parquet` 3.6 MB, `airlines.csv`; 124,460 rows): CSV vs Parquet scans, DuckDB vs in-memory SQLite report with equality check, PIVOT by month.
- `duckdb-glob-partitions` "DuckDB: write Parquet by year, read it back with a glob" (Data work, weather; D07 full `daily_weather.parquet`, `stations.csv`, `cities.csv`; 109,214 rows): `COPY … PARTITION_BY (year)`, `glob()`, `read_parquet('…/*/*.parquet', hive_partitioning)`.

No timing is written into the content: each program measures and prints its own. `sha256` `e8987e1f…4946`.

Verification: `npx vitest run tests/python-lab.test.ts -t duckdb` passed 7/7 in Node Pyodide (all 6 new activities and the existing `duckdb-analytics`). In the browser on `next dev` :3040, every DuckDB activity ran with no error and no page errors. Wall-clock times from clicking Run to output: query-files 3.6 s, joins 2.0 s, vs-sqlite 1.6 s, big-file 13.2 s, analytics 4.3 s, python-api 4.3 s, glob-partitions 2.2 s. A learner edit (scorecard grouped by `carrier_group` instead of `airline_name`) ran. "Reset to the original code" restored the program. "Reset flights.db" followed by `duckdb-vs-sqlite` ran with 17,661 rows. The SQL tab version ran (14 rows). `npx tsc --noEmit` and ESLint on the file are clean.

### Approved exception: sqlite-index-lookup default size (2026-10-21)
Frozen `src/content/python-v2/tools/performance.ts`: one field changed, `sqlite-index-lookup` `dataset.start` 2 → 1, so the experiment opens on the Medium flights edition (17,661 rows) instead of Large (124,460). The no-index side with 500 lookups on Large took about 27 s per comparison; the default (Medium, 100 lookups) takes well under a second per run. Large and 500 lookups stay selectable. Code, setup, labels, params and every other experiment are byte-identical (`diff` shows the single line). `sha256` `d96dda25…2bb2`; `original_sha256` keeps `f5c3f70a…b4a3`. The Performance Lab also now says when a comparison runs past 6 s that it can take up to a minute and that Stop ends it, and says when slow runs cut the repeats.
