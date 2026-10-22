# Common instructions for every module-rebuild agent

Repo: /Users/krishnasathvikmantripragada/sqlstudio (Next.js + Pyodide). Work directly on local `main`: no branches, no worktrees, no commits, no push, no deploy. Several other agents are rebuilding OTHER modules in the same working tree right now.

## Read first
1. Owner's brief: docs/python/rebuild/brief.md — binding.
2. docs/python/module-standard.md — the pattern derived from M12, the approved reference module. Then read src/content/python-v2/lessons/M12.ts and questions/M12.ts in full: match that depth and style.
3. docs/python/content-rules.md, docs/python/grading-capabilities.md (check kinds, fn-checks.ts helpers, Pyodide support matrix), docs/python/content-inventory.md (your modules' findings).
4. model.ts, types.ts, concepts.ts, registry.json entries for your modules, versions.ts, and the lessons of all EARLIER modules so you know exactly what learners have been taught (prerequisites are enforced by tests/python-v2-beginner.test.ts).

## What to do per module
- Rewrite all 5 lessons to the brief §1 standard (what/why/how/when/mistakes; Example A understand + Example B apply in a genuinely different realistic context; guided try-it; Challenge 1 independent; Challenge 2 transfer; concept checks incl. one real output prediction and one common-mistake item; 3 progressive hints never containing the answer's unfinished lines; review linking forward). Keep lesson IDs; keep slugs unless the slug would lie about the new content (report any change). A lesson must teach what its title promises; you may retitle a lesson to match a better-scoped topic within the module title. Realistic data (course datasets / small fixtures), no MUG/HAT/CUP. Challenges graded by function checks with hidden cases where the learner can write a function (from M09 on); earlier modules use output/variant checks with varied hidden inputs instead.
- Rewrite the module's existing practice question IDs (see registry.json; status tests-pass) into genuine independent problems per brief §4 and the M12 pattern: mostly function_implementation / data_transformation / validation / debugging (genuinely broken code) / refactoring / file-processing / OOP / testing as fits the module, at most 2 output_prediction per module (early beginner modules M01–M04 may use more prediction/completion but must still include independent problems with varied hidden inputs). Each code question: exact contract, ≥3 public examples, ≥4 labelled hidden cases (empty/single/duplicates/ordering/missing/boundaries), keepsInput where mutation matters, ≥2 wrong implementations failing for the intended reason, ≥1 alternative valid style, progressive hints, explanation. No copying lesson examples/challenges or other questions. You may retire a question ID only if it cannot be made genuine (report it); never invent new IDs beyond the module's existing written ones without reporting.
- Set `version: 2` on every lesson/question you substantially change and add them to src/content/python-v2/versions.ts (see how M12 did it) so stale progress isn't treated as mastery.
- Fix the pre-existing TypeScript errors in your modules' files (e.g. `requires` arrays typed as string[] — follow how M12 types them).

## Shared files — edit with care
registry.json, concepts.ts, versions.ts, scripts/python-v2/quality-baseline.json, checks.ts/fn-checks.ts are shared. Make only small targeted Edits to the entries for YOUR modules; never rewrite or reformat a whole shared file; if an Edit fails because the file changed, re-read and retry. Do not edit other modules' lesson/question files, the engine, or the UI. If you truly need an engine/helper change, append-only and report it.

## Gates — run and report actual output
- Content gate in real Pyodide for your modules (tests/python-v2-content.test.ts; see module-standard.md for the filter). Every example output exact, references + alternatives pass, starters fail, wrongs fail the intended checks.
- tests/python-v2-beginner.test.ts, tests/python-v2-registry.test.ts, tests/python-v2-versions.test.ts.
- PYQ_MODULES=<yours> PYQ_STRICT=1 npx vitest run tests/python-v2-quality.test.ts → 0 findings for your modules; then PYQ_MODULES=<yours> PYQ_BASELINE=prune (re-run it if another agent pruned concurrently and your entries reappear).
- The validator misses some fakes (hardcoded measurements like `fast = 1`, trivially true checks like `seconds >= 0`): look for these by hand too.
- npx tsc --noEmit -p . — zero errors in your files (others' files may have errors; ignore them).
- Failures in other modules caused by concurrent agents: note them, don't fix them.
- Finally read each module once as a learner who has only finished the earlier modules; fix anything unclear.

## Report (actual counts)
Per module: lessons rewritten, challenges replaced, questions rewritten (by format/difficulty), function questions, public/hidden case counts, retired IDs, slug/registry/concept changes, factual errors fixed, anything withheld or unresolved, and actual gate output.
