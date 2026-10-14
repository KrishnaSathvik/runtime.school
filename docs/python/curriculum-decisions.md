# Python curriculum: decision log

Review of `research/Runtime_Python_Agent_Starter_Complete/research/` (80-lesson outline, 120 practice briefs,
6 projects) against the shipped lesson `python:variables-and-values`. 2026-10-14.

Status key: **Decided** = applied in this change. **Proposed** = needs owner review before the lesson is written.

## 1. The outline is titles, not lesson scopes

Every PY01 lesson in `curriculum.json` carries the same module-level skills (`variables, types, expressions,
print`) and a generic goal. Scope per lesson therefore has to be set here, against what Lesson 1 already teaches:

- **Lesson 1 already covers:** assignment, int/float/str (introduced), naming rules and case sensitivity,
  `+ - * /`, `print()` of one value, reassignment and recalculation, `=` vs `==`, `NameError` from unquoted text.

## 2. Foundations: six lessons, order and scope

| # | ID (stable) | Title | New learning (no repeats of Lesson 1) | Prerequisite | Status |
|---|---|---|---|---|---|
| 1 | `python:variables-and-values` | Variables and values | Shipped; unchanged | — | Shipped |
| 2 | `python:print-comments-and-execution-order` | Print, comments and execution order | Several values in one `print()` (labels, spacing), blank lines, comments and commenting out, top-to-bottom execution, using a name before it exists, runtime error stops partway (earlier output stays) vs syntax error (nothing runs) | 1 | **Decided**, built here |
| 3 | `python:numbers-and-arithmetic` | Numbers and arithmetic | `//`, `%`, `**`, precedence and parentheses, `/` always gives a float, negative floor division, float imprecision (`0.1 + 0.2`), `round()`, `ZeroDivisionError`; **plus augmented assignment** (`+=`, `-=`, `*=`) | 2 | Proposed |
| 4 | `python:types-and-type-conversion` | Types and type conversion | `type()`, `int()`, `float()`, `str()`, `int("3.5")` → `ValueError`, `"12" + 3` → `TypeError`, truncation by `int()`, `bool` as a type | 3 | Proposed |
| 5 | `python:names-reassignment-and-augmented-assignment` | (see below) | — | 4 | **Proposed: merge** |
| 6 | `python:expressions-and-a-first-program` | Expressions and a first program | Plan a multi-step calculation, intermediate variables, readable names and comments, check against a worked example; integrates 1–4 | 5 (or 4) | Proposed |

**Lesson 2 has enough new material.** Lesson 1 prints one value at a time and never shows a program failing
partway. Lesson 2's core skills (labelled multi-value output, comments, and predicting which lines run and what was
printed before an error) are new and are what learners need to read their own Console. Its challenges are graded
by output and by the variables the program ends with, so they don't repeat Lesson 1's calculation exercises.

**Lesson 5 duplicates Lesson 1.** Reassignment, naming rules and `=` vs `==` are already taught and checked in
Lesson 1, and "mutation vs rebinding" (from `IMPLEMENTATION_ORDER.md`) needs lists, which arrive in PY05. What
remains (augmented assignment, swapping two values) is about one section. **Proposal:** fold augmented assignment
into Lesson 3 and swapping into Lesson 6, and drop Lesson 5, so Foundations has five lessons. Keep the ID
`python:names-reassignment-and-augmented-assignment` reserved (never reused). Decide before Lesson 3 is written.

**Deliberately deferred from Lesson 2:** `print(..., sep=..., end=...)` and string concatenation/f-strings go to
PY02 (`creating-and-combining-strings`, `f-strings-and-formatting`), where output formatting is the topic. Lesson 2
mentions only that `+` can't join text and a number, and shows the comma instead.

## 3. Practice bank (PY01) — prerequisite problems to fix before use

| Brief | Problem | Fix |
|---|---|---|
| `py01-04` Battery percentage ("empty capacity is invalid") | Needs a condition (PY03) | Drop the invalid case in PY01, or move to PY03 |
| `py01-09` Discount with a lower bound of zero | Needs `max()` or `if` | Move to PY03, or give inputs that never go below zero |
| `py01-02` Celsius → Fahrenheit, "round only the displayed result" | Needs `round()` (Lesson 3) or f-strings (PY02) | Place after Lesson 3 |
| `py01-06` Distance between points | `math.sqrt` needs imports (PY06) | Use `** 0.5` (Lesson 3) |
| `py01-08` Debug: swap two labels | Fine after Lesson 6 (swap moves there) | Place after Lesson 6 |

Project `retail-order-engine` lists functions, conditions and JSON fixtures: it is a PY03–PY06 project, not a
Foundations one. None of the 120 briefs is a ready question (no full prompt, tests or validated solution).

## 4. Data libraries and Spark

- **NumPy (PY10) and pandas (PY11)** stay where the outline puts them, after PY09. Their runtime now exists
  (`docs/python/runtime.md`, Data libraries), so they are no longer blocked on engineering, only on content.
- **matplotlib:** no module of its own. Introduce plotting inside PY11 (a lesson's `.plot()` / `plt.show()`
  step) and use it in the Marketplace EDA project. **Proposed.**
- **DuckDB:** one optional PY11 lesson or project step ("SQL over a DataFrame"), linking the Python and SQL
  subjects. **Proposed.**
- **scikit-learn:** not in the Python course. It belongs to a future ML subject, as the research report already
  says. Runtime support exists if that subject is built.
- **PySpark: a separate later subject (or a final optional module), never presented as Apache Spark.** In the
  browser, `pyspark` is DuckDB's experimental PySpark-compatible DataFrame API: `SparkSession`, DataFrame
  transformations, `functions`, `groupBy`/`agg`, `collect`. It has **no** cluster, executors, partitions in the
  Spark sense, RDDs, streaming, Spark UI, or Spark's lazy-evaluation and performance behaviour, and not every
  function. Lessons on those topics need real Spark on a server. Every PySpark page must say this in its intro.
  **Proposed.**

## 5. Reference PDFs: do not use

- **pandas 0.17 "10 minutes" PDF:** `.ix` and `DataFrame.append()` were removed from pandas (both fail in the
  pandas 3.0.2 we ship). Use current docs (`loc`/`iloc`, `pd.concat`).
- **Deep-learning book:** Theano-era code. Not Python-course material.
- **Interview-questions PDF:** an outdated scikit-learn import (flagged in the source audit) and garbled code.
- **InterviewBit cheat sheet:** wrong naming rule (claims digits are not allowed after the first character).
- **200+ exercises:** several expected outputs disagree with the code (e.g. Ex. 22); re-specify from scratch.
- **One-liners book:** compact tricks with inconsistent outputs; not a model for beginners.
- **Projects PDF:** Selenium/ChromeDriver, PyGame, microphones, IMAP credentials: not browser-runnable.
- Any source using `input()`: rewrite with fixed values or function parameters (no interactive stdin).
- All 19 PDFs: reference only. No copied prose, exercises, solutions, datasets or figures.

## 6. Authoring process (from Lesson 2)

1. Scope the lesson in this log: new skills, what's deferred, prerequisites.
2. Write content in `src/content/python/<slug>.ts` (same `PyLesson` shape as Lesson 1).
3. Run `tests/python-content.test.ts`: every example, walkthrough step and mistake runs in real Pyodide with the
   expected outcome; every reference answer passes the real grader; every listed wrong answer fails on the
   intended check.
4. Browser journey (`tests/e2e/python-lesson-2.mjs` pattern): wrong answers, independent and assisted solves,
   reload persistence, desktop/mobile, light/dark screenshots.
5. Owner review before the next lesson.

## 7. Completed subject build — 2026-10-14

This section supersedes the earlier planning statuses. The implemented inventory is in
[`inventory.json`](inventory.json); the final verification report is in [`subject-report.md`](subject-report.md).

- Foundations has five lessons. Augmented assignment and swapping were folded into the relevant lessons;
  the omitted identity remains reserved. The course now has 79 lessons across all 12 modules, 158 graded
  challenges and 158 concept questions.
- The 120 practice briefs became executable questions: 78 write, 24 debug and 18 predict. PY02-03 now
  combines slicing, fixed-width alignment and thousands separators, rather than repeating the lesson's
  receipt exercise. The file-log exercise explicitly audits malformed lines and retains zero-count keys.
- Six tracks reference canonical bank IDs. Opening a question through another track does not create a
  new progress record or achievement.
- Two cases have four ordered investigation stages each. Six projects have 4/5/5/5/5/6 cumulative
  milestones. Each later reference starter is the preceding solution; in the UI the learner's own saved
  code carries forward. Earlier checks remain active. Inherited help keeps later attempts assisted.
- Cases and projects open with context and inspectable fixture data. Fixtures are synthetic, small and
  deterministic. Findings are deliberately bounded to those extracts. Automatic checks verify specified
  evidence and caveat keywords, not the quality of arbitrary prose or production readiness.
- `runtime-python-v1` remains version 1. A separate `items` map holds bank, case, project and playground
  drafts and progress. Old lesson-only saves normalize to an empty item map. SQL storage is unchanged.
- Tables from `display()` render as semantic tables; consecutive table messages remain separate. The
  console downloads complete text output files. Truncated file previews cannot be downloaded as if complete.
  Projects also export source and a summary tied to the exact code that passed the latest checks.
- Python navigation now exposes Learn, Practice and Projects. Search includes all Python lessons,
  questions, tracks, cases, projects and the playground. The playground offers standard library,
  NumPy/pandas/matplotlib and DuckDB, with no grading or learning credit.
- scikit-learn stays reserved for ML. DuckDB remains DuckDB; its Spark-style compatibility API is not
  represented as Apache Spark. The runtime.school production execution gate remains intact.

### UI decisions

The Python pages extend Runtime's existing visual system: white `#ffffff` and ink `#1b1913` in light
mode, black `#000000` and white in dark mode, with amber `#e3a03a` / `#f0b44c` for controls. Geist Sans
carries prose; Geist Mono carries code. Practice uses searchable lists. Projects place the investigation
brief and ordered milestone controls before the editor, then pair task and code in two columns that
stack on mobile. Editor string and line-number contrast adjustments are scoped to Python.

### Verification workflow

Use `npx vitest run tests/python-*.test.ts` for the Python-only runtime and progress checks. It includes
all lesson blocks, practice predictions, graded reference answers, failing starters and deliberate
mistakes in real Pyodide. Use `node tests/e2e/python-subject.mjs` against a local development server for
browser journeys and accessibility; `python-navigation.mjs` covers cases/tracks, and `python-tables.mjs`
checks table index alignment in all four modes. Do not run the full SQL regression suite for this work. The user
has authorized verified local batches; no push or deployment is part of this build.
