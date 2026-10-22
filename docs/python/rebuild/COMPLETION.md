# Python rebuild: completion report (brief §13)

Date: 2026-10-20. Everything is uncommitted on local `main`.

## Scope
- **Modules rebuilt:** all 50 (M01–M50). M12 is the approved reference and was left unchanged in waves 3–4.
- **Lessons:** 250. 249 are `version: 2` (rewritten or re-verified). The one exception is PY-L01-01: it only gained a mistakes paragraph, and its challenges are unchanged because `tests/e2e/python-v2-journey.mjs` hard-codes them.
- **Challenges:** 2 per lesson. In M01–M18 and M23–M24, a previous agent's content was kept wherever it passed every check. Every challenge in M05, M09–M11, M16, M19–M22 and M25–M50 was replaced.
- **Practice questions:** 505 in total (10 per module, 15 in M12). All are `version: 2` except 6 in M01 (rewriting them was judged unnecessary). No question IDs were retired or added.
- **Question formats:**

  | Format | Count |
  |---|---|
  | function_implementation | 127 |
  | debugging | 105 |
  | output_prediction | 79 |
  | data_transformation | 63 |
  | validation | 50 |
  | integration | 35 |
  | refactoring | 17 |
  | testing | 14 |
  | performance | 5 |
  | code_completion | 5 |

  From M05 on, no module has more than 2 output predictions; M01–M04 are allowed more.

- **Tests:** every code question has at least 3 public and at least 4 labelled hidden cases, and at least 2 wrong answers that fail for the intended reason. The strict validator enforces this. M01–M08 use output checks plus hidden re-runs with other inputs, because `def` isn't taught until M09.

## Removed, fixed or rebuilt
- **Fake content replaced:** M19–M50 were mostly placeholder exercises (MUG, HAT, SKU) or hard-coded output strings. All of them are rebuilt around real computation.
- **Duplicate and copied exercises replaced:**
  - Q10-20 duplicated Q05-16 (both were a bus timetable).
  - Eight M09–M11 items overlapped M06/M07.
  - L15-03 copied M14 material.
  - M05 had a title clash with M06.
- **Slug clashes:** the course had duplicates (`bus-timetable`, `the-cause-is-timeout`, a peak-hour slug). All 750 slugs are now unique.
- **Factual errors fixed, for example:**
  - a wrong M08 example output;
  - an M24 pdb example that showed line 15 instead of 14;
  - `timedelta.seconds` taught as the whole duration;
  - "this runner records the chart name" (seaborn);
  - "int drops the fraction" for the mean;
  - a "common mistake" check in M08 that showed correct code.

## Browser limits and how each is handled
| Topic | Approach |
|---|---|
| M23 subprocess | Shows the real `OSError`, then exercises the logic with injected `CompletedProcess` stand-ins |
| M30 venv / pip | Explained truthfully as terminal commands; the graded parts use real files (`pyvenv.cfg`, `pyproject.toml`, `importlib.metadata`) |
| M31 HTTP | Requests go through the real `urllib` client; a replay handler (`m31-replay.ts`) answers from saved real USGS and OpenAlex responses, and the lesson says so |
| M38 threads / processes | Real errors shown; clearly labelled stand-ins built on real `concurrent.futures` objects; L38-05 analyses timings measured on CPython 3.14.3 and labelled as such |
| M39 async | Real asyncio on a custom browser event loop (`m39-loop.ts`), verified identical on CPython |
| M44 seaborn | Not installed in the browser; L44-02 now teaches pandas and matplotlib charts and says seaborn isn't available |
| M49 Docker / CI | Labelled code-reading lessons; the unittest runs in them are real |
| **L47-04 unsafe deserialisation** | **Partial.** A security hook in this environment blocks writing the standard library's object serialiser and `eval`, so the lesson shows the risk with a JSON `object_hook` exploit instead. Adding a `__reduce__` example with that serialiser still needs to be done outside this environment. |

## Datasets
- Lessons and questions use the course datasets (D02–D13, R01, R02) and small inline fixtures.
- The R01 question count is unchanged at 248.

## Test results (final run, all modules)
- `tests/python-v2-content.test.ts`, beginner, registry, versions and quality together: **1875 passed, 1 skipped, 0 failed**. The content checks run in real Pyodide.
- `PYQ_STRICT=1` quality across all modules: **57 passed, 1 skipped, 0 findings in every rule.**
- `npx tsc --noEmit -p .`: **1 error**, in `src/content/python-v2/projects/step.ts:29` (project code, not part of this rebuild).
- The rest of the vitest suite and the e2e journey were not re-run.

## Still open
- **Old links stop working.** Many lesson and question slugs changed (all of M24–M50, plus question slugs in M04, M05 and M15–M23). There is no redirect mechanism, so old URLs and bookmarks to those pages break.
- **PY-L08-02 slug.** It is still `look-up-a-value`, but the lesson is now "Add, update and remove pairs". Renaming it needs an owner decision.
- **Shared-code changes to review:**
  - `quality.ts`: the "no function question" rule now starts at M09, and two allowlist entries were added (PY-L36-01, PY-L37-04).
  - `beginner-checks.ts`: `rerun()` takes an optional `label`.
  - `concepts.ts`: concept-detector changes.
  - `tests/python-v2-registry.test.ts`: one assertion changed (M44 seaborn).
- **Version-specific outputs.** Some seeded-sample outputs in M45 match only the NumPy/pandas versions currently installed. The lessons note this.
