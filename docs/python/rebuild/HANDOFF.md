# Python rebuild — handoff (state at 2026-10-20)

Start here in a new session. Everything is uncommitted on local `main` (no branches/worktrees, nothing pushed).

## Files to read
- `docs/python/rebuild/brief.md` — the owner's binding brief.
- `docs/python/rebuild/module-agent-common.md` — the shared instructions every module agent gets.
- `docs/python/module-standard.md` — the pattern derived from M12 (the approved reference module).
- `docs/python/grading-capabilities.md` — check kinds, `src/content/python-v2/fn-checks.ts` helpers, Pyodide support matrix.
- `docs/python/content-inventory.md` — per-module and per-question quality findings (regenerate with `PYQ_REPORT=1`).

## Done
- **Wave 1a (grader):** function checks verified; added `unchanged`/`argsAfter`/`ignoreReturn`/hidden labels, fn-checks.ts helpers, `tests/python-grading-functions.test.ts`. Practice page (`src/features/python/Question.tsx`) now shows the spec and public examples.
- **Wave 1b (validators):** `tests/python-v2-quality.test.ts` + `scripts/python-v2/quality.ts` + baseline. Use `PYQ_MODULES`, `PYQ_STRICT=1`, `PYQ_BASELINE=prune`.
- **Wave 1c (correctness sweep):** factual and bad-habit fixes across all modules.
- **Wave 2 (M12):** rebuilt end to end; strict quality check clean. Content versions added (`versions.ts`, `version: 2`, `python-progress-v2.ts` drops stale records).

Pyodide limits that matter: no threads, processes, subprocess, network, pytest or seaborn. `asyncio.run` fails in every browser, though driving a coroutine by hand works.

## Update (session 2, 2026-10-20)
- **Wave 3 is COMPLETE.** M01–M29 all rebuilt and gated: content gate, strict quality 0, beginner 0 problems, versions entries, tsc clean in their files.
- Shared-rule changes made in wave 3: `quality.ts` "no function_implementation question" warning now starts at M09; `beginner-checks.ts` `rerun()` takes an optional `label`; `concepts.ts` detector tweaks (`field-ann`, `decorator-at`, `decorator-call`, new `classmethod-dec`, `super-call`, `unittest-case`).
- Many question slugs changed (M04, M05, M15, M16, M19–M29) and 8 M26–M29 lesson slugs changed — old practice URLs break.
- Wave 4 started out of order: M30–M34, M35–M40, M41–M45 agents launched. M46–M50 not started.
- Pending small fixes: Q10-20 duplicates Q05-16 (both "bus timetable") — replace Q10-20 with a different problem; hint leaks reported in L22-03 and L22-04; M48 lesson and question share slug `the-cause-is-timeout` (give to the M46–M50 agent); PY-L08-02 slug `look-up-a-value` is misleading (owner decision pending).
- Owner hasn't yet answered on the PY-L08-02 slug.
- **M30–M34 COMPLETE** (all gates clean; all 25 lesson slugs renamed; M31 uses a urllib replay handler in `m31-replay.ts`; new concept `sql-param`). M46–M50 agent launched (told to fix the M48 slug clash). M35–M40 and M41–M45 still in progress.
- **M41–M45 COMPLETE** (all gates clean; seaborn lesson L44-02 now "Charts from DataFrames" via matplotlib; all lesson slugs renamed; one line changed in tests/python-v2-registry.test.ts). Q10-20 replaced ("meeting-room-free-slots"); L22-03/04 hint leaks no longer occur. Only M35–M40 and M46–M50 remain in wave 4.
- **M35–M40 COMPLETE** (all 30 lesson slugs renamed; M38 uses honest labelled stand-ins + CPython-measured timings; M39 runs real asyncio via `m39-loop.ts`). Last small edits to M35, M36, M39 were NOT re-run through the content gate — wave 5 must re-run them. `once-add` detector blocks `set.add` before M46 (passed to M46 agent). Nested dicts >~1,500 deep crash Pyodide.
- Wave 5 cleanup: agents left helper scripts in the REPO at `scratchpad/m4145/` and `scratchpad/m4650/` (the latter causes tsc errors) — delete them before committing.
- Wave 5 must re-run the beginner test across ALL modules: concept changes by later agents caused prerequisite failures in M27/M29 after their agent had finished.

## Wave 3 (M01–M29): interrupted mid-work by usage limits (historical)
Count of `version: 2` items on disk (lessons / questions) when it stopped:

| Agent | Modules | State |
|---|---|---|
| 3a | M01–M05 | M01 partial (3/5 lessons, 3 questions), M02 done, M03 lessons done + 7/10 questions, M04 lessons done, M05 not started |
| 3b | M06–M11 | M06, M07 done; M08 lessons done, questions not; M09–M11 not started |
| 3c | M13–M16 | M13, M14 done; M15 lessons done, questions not; M16 not started |
| 3d | M17–M22 | M17, M18 done (except-type concept move: verify); M19–M22 not started |
| 3e | M23–M29 | M23 done; M24 lessons done, questions not; M25–M29 not started |

"Done" here means the agent wrote the content. The gates were NOT yet run for any wave-3 module. Re-verify each one.

## Known red tests (expected while mid-work)
- `tests/python-v2-versions.test.ts`: the version map doesn't yet match the content's `version: 2` fields.
- `tests/python-v2-beginner.test.ts`: prerequisite walk fails on partially rebuilt modules.
- `tsc`: about 146 type errors from before this work, in untracked `questions/M2x–M3x.ts` (`requires` typed as `string[]`). Each module agent fixes its own.

## How to continue
1. Spawn fresh module agents. The old agents can't be resumed from a new session. Give each one `docs/python/rebuild/module-agent-common.md`, plus: "This module group was partially rebuilt by a previous agent; finish the unfinished modules, then run every gate on ALL your modules and fix what fails." Use the wave-3 module notes below.
2. Run at most 2–3 agents at once. Five in parallel hit the session usage limit twice.
3. After wave 3, start wave 4: M30–M34, M35–M40, M41–M45, M46–M50 (§7 of the brief; no faked execution; withhold a lesson if no honest option exists).
4. Wave 5: full validation and the §13 completion report, with actual counts.

## Wave 3 module notes (condensed)
- **M01–M05:** keep the clear prose; replace trivial or copied exercises; no `def` yet, so grade with output + hidden `variant` re-runs.
- **M06–M11:** function practice from M09; M10 must integrate M01–M09; M11 becomes real string algorithms (normalise, tokenise/frequency, palindrome, anagram by counting, run-length encoding, simple validation). Don't edit M12.
- **M13–M16:** when a comprehension is clearer than a loop and when it isn't; sorted `key=` with stability and multiple keys; any/all; `*args` is a tuple; lambda only inline; closures with a real use; recursion over nested data; Counter/defaultdict/deque/itertools, each with a reason to exist. No try/except yet.
- **M17–M22:**
  - M17: nested data access with defaults.
  - M18: teach `except ValueError` first (move the `except-type` concept to L18-01); fix the `tuple-literal` concept title.
  - M19: real file processing.
  - M20: csv (`newline=""`), json and JSONL using course datasets; grade the files the learner writes.
  - M21: datetime and zoneinfo (needs `packages: ["tzdata"]`), Decimal quantize, regex groups/sub.
  - M22: real multi-file packages, honestly framed.
- **M23–M29:**
  - M23: real argparse and pathlib automation; subprocess only as labelled code reading or injected stand-ins.
  - M24: real tracebacks, logging with exc_info; no fake breakpoint.
  - M25: unittest; testing practice graded against defective implementations with `learnerTests`; fix the `fixture-fn` concept title.
  - M26–M29: real object models, properties with validation, inheritance vs composition, dataclasses, typing/Protocol, ABCs, descriptors.
