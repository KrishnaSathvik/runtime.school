# Runtime Python subject: consolidated report

2026-10-14. Local `main`; no push or deployment. This report distinguishes executable inventory, runtime tests, and browser evidence.

## Inventory

79 lessons, 158 graded lesson challenges, 158 concept questions, and 567 lesson grading checks.

| Module | Lessons |
|---|---:|
| Python Foundations | 5 |
| Strings and Text | 6 |
| Conditions and Logic | 6 |
| Loops and Iteration | 7 |
| Collections and Records | 8 |
| Functions and Modules | 8 |
| Debugging and Testing | 6 |
| Files and Structured Data | 8 |
| Practical Python Patterns | 6 |
| NumPy Fundamentals | 5 |
| pandas for Data Work | 8 |
| Reliable Data Pipelines | 6 |

The bank contains 120 questions: 78 write, 24 debug, and 18 predict. Code questions have 437 grading checks. Every module has ten questions and includes all three kinds. Prediction outputs were compared with actual Pyodide stdout.

| Track | Questions |
|---|---:|
| Python from Zero | 24 |
| Collections and Everyday Logic | 20 |
| Debug Python | 20 |
| Python Interview Essentials | 28 |
| Python for Data Analysis | 24 |
| Python for Data Engineers | 26 |

Tracks share canonical `python:bank:*` identities. Their 142 placements do not create extra questions or achievements.

| Case | Stages | Final cumulative checks |
|---|---:|---:|
| Broken Customer Feed | 4 | 5 |
| Subscription Event Health | 4 | 4 |

| Project | Milestones | Final cumulative checks |
|---|---:|---:|
| Retail Order Engine | 4 | 6 |
| Customer Data Quality Toolkit | 5 | 5 |
| Product Event Investigation | 5 | 5 |
| CSV Sales Analyst | 5 | 5 |
| Marketplace EDA Lab | 5 | 5 |
| Reliable Mini ETL Pipeline | 6 | 7 |

All 38 case/project stages have inspectable fixture data, prompts, executable solutions, hints, failing starters and a deliberately wrong answer. The 42 distinct stage checks accumulate across stages. Reference starters equal the preceding solution; the browser carries forward the learner’s draft. A project’s final check reruns every preceding milestone check.

## Deliverables and tools

- Each project downloads `main.py` and a verified summary tied to the exact source that most recently passed checks. Editing that source hides the summary until a fresh passing check.
- Running the program exposes its complete CSV/JSON/text outputs as downloads. Source fixtures can also be downloaded. Incomplete/truncated file previews do not offer a misleading complete-file download.
- Retail exports receipt, totals and validation; customer quality exports clean/rejected records and reconciliation; product events exports funnel/action/anomaly evidence; CSV sales exports clean rows, metrics and quality; EDA exports cleaned rows, cohorts and findings; ETL exports target CSV, rejections and manifest.
- Playground offers standard library, NumPy/pandas/matplotlib, and DuckDB. It saves a draft, renders figures/tables and exports files, but awards no credit.
- Learn, Practice and Projects navigation, question/module filtering, six tracks, two cases, and command-palette search are available in Python routes.

## Grading and saved progress

`runtime-python-v1` and version 1 remain unchanged. Lesson IDs remain intact; new `items` records hold questions, cases, projects and playground drafts. Tests cover loading lesson-only saves, corrupt partial item data, separate assisted/independent credit, and canonical question identity. Run does not grade. Hints and revealed answers mark an attempt assisted. Fresh attempts reset the editor; assistance inherited from earlier project stages remains assisted.

The production gate in `src/platform/python-runner.ts` and the runtime.school hostname guard in the client are unchanged. SQL routes, grading, projects and storage implementation are unchanged. Browser checks preserve a seeded `sql-studio-v1` value byte-for-byte.

## Verification

- `npx vitest run tests/python-*.test.ts`: 731 tests passed in 23 files before the added output regression. All 12 lesson suites execute examples, walkthroughs, mistakes and concept programs in real Pyodide; all bank answers/starters/wrong programs and all 38 case/project stages execute against the actual grader. Counts alone were not treated as verification.
- Two added output regressions passed: consecutive tables/figures stay separate while text merges, and table indices render separately from data columns with unique accessible names. Together with the original run, 733 distinct tests passed across 24 Python test files. The 14 progress tests were also rerun successfully.
- Application TypeScript check passed using the repository compiler options with `src` and `next-env.d.ts` included. Changed Python UI/content/progress files and shared shell passed ESLint; `git diff --check` passed.
- Full repository `tsc --noEmit` has an existing error at `tests/project-entry.test.ts:39` (`startedAt` is not a `ProjectState` field). That SQL test was not modified. The full SQL regression suite was not run.

### Browser and accessibility evidence

`tests/e2e/python-subject.mjs` passed 32 checkpoints: home, beginner, prediction, intermediate,
advanced, pandas/data, complete project, and playground tables in each of desktop light, desktop dark,
mobile light and mobile dark. Desktop was 1440 × 1000; mobile emulation was 390 × 844.

The journeys verify independent beginner credit, Run giving no credit, reload persistence, assisted
intermediate/advanced/data credit, all four retail milestones with exact draft carry-forward, a downloaded
verified summary with six passing checks, and downloaded totals of 5,735 cents. They also verify two
separate displayed DataFrames, the absence of playground grading, and unchanged SQL storage.

`tests/e2e/python-navigation.mjs` passed question filtering, canonical track identity, palette navigation,
case overview before code, locked stage ordering, all four customer-feed stages, inherited assisted
credit, saved drafts/stage after reload, Escape then Tab leaving the editor, and axe checks.

Visual review caught the pandas index/header mismatch; `tests/e2e/python-tables.mjs` then passed all
four viewport/theme combinations with explicit index, header and cell assertions. The two output
regressions protect this fix. Python-scoped editor line-number and string colors were adjusted after
contrast findings; scrollable code and tables are keyboard-focusable. Final checked pages had **zero
axe violations** and no document-level horizontal overflow.

Evidence: [32 checkpoint results](screens/subject/results.json),
[navigation results](screens/subject/navigation-results.json),
[table alignment results](screens/subject/table-results.json).

There are 33 screenshots in [screens/subject](screens/subject/), including:

| View | Screenshot |
|---|---|
| Desktop light, beginner | [Independent solve](screens/subject/desktop-light-beginner.png) |
| Desktop light, prediction | [Prediction UI](screens/subject/desktop-light-prediction.png) |
| Desktop dark, advanced | [Pipeline practice](screens/subject/desktop-dark-advanced.png) |
| Desktop light, data | [pandas practice](screens/subject/desktop-light-data.png) |
| Desktop light, project | [Completed retail project](screens/subject/desktop-light-project.png) |
| Mobile dark, project | [Milestones and downloads](screens/subject/mobile-dark-project.png) |
| Desktop dark, tables | [Aligned table output](screens/subject/desktop-dark-tables.png) |
| Mobile light, tables | [Responsive tables](screens/subject/mobile-light-tables.png) |
| Case study | [Completed investigation](screens/subject/case-navigation.png) |

Screenshots were visually inspected for editor, table and mobile project layout. Long full-page captures
include scrollable panels and sticky navigation; the executable browser assertions provide the underlying
progress and download evidence.

## Limits

- Execution remains local/development or explicitly enabled controlled preview only. No production enablement, deployment or push was performed.
- Chromium desktop/mobile emulation is the browser matrix for this batch; it is not a physical-device or Firefox/WebKit certification. Automated axe checks and keyboard journeys complement screenshots, but do not constitute a complete assistive-technology audit.
- The browser grader provides learning feedback, not tamper-proof certification. Evidence/caveat checks verify specified outputs and required terms, not the quality of arbitrary written analysis.
- Fixtures are synthetic bounded extracts. Email validation implements the exercise’s explicit shape rule, not deliverability. Session funnels and cohort summaries do not establish causation or population trends.
- Pyodide uses Python 3.14, NumPy and pandas 3.0.2. Browser execution limits, file capture limits and package download costs remain. Use UTC/fixed offsets; tzdata is unavailable.
- scikit-learn remains reserved for the future ML subject. DuckDB’s Spark-style compatibility API is not presented as real Apache Spark.

## Commits

- Earlier lesson work: `907193f` through `fb54963` (see repository history).
- Earlier practice batches: `5761367`, `a67eaea`, `27dd587`, `281eaa2`, `6fd5a5a`.
- `6e6322d`: PY12, six canonical tracks, duplicate-exercise repair and inventory validation.
- `0e16c8c`: two executable cases and six cumulative projects.
- `5cac835`: Python routes, practice/prediction/project/playground UI, persistence, output rendering, accessibility fixes and browser checks.
- This report, generated inventory, screenshots and evidence are committed together in the following documentation batch (see `git log` for its SHA).

## Full lesson inventory

Stable references and titles below come from the implemented source. [`inventory.json`](inventory.json) also includes per-lesson counts.

### Python Foundations

| Stable reference | Lesson |
|---|---|
| `python:variables-and-values` | Variables and values |
| `python:print-comments-and-execution-order` | Print, comments and execution order |
| `python:numbers-and-arithmetic` | Numbers and arithmetic |
| `python:types-and-type-conversion` | Types and type conversion |
| `python:expressions-and-a-first-program` | Expressions and a first program |

### Strings and Text

| Stable reference | Lesson |
|---|---|
| `python:creating-and-combining-strings` | Creating and combining strings |
| `python:string-indexing-and-slicing` | String indexing and slicing |
| `python:string-methods-for-cleaning-text` | String methods for cleaning text |
| `python:splitting-and-joining-text` | Splitting and joining text |
| `python:f-strings-and-formatting` | f-strings and formatting |
| `python:text-validation-and-unicode-basics` | Text validation and Unicode basics |

### Conditions and Logic

| Stable reference | Lesson |
|---|---|
| `python:comparisons-and-boolean-values` | Comparisons and boolean values |
| `python:if-else-and-indentation` | if, else and indentation |
| `python:elif-and-multiway-decisions` | elif and multiway decisions |
| `python:and-or-not-and-truthiness` | and, or, not and truthiness |
| `python:membership-and-none-checks` | Membership and None checks |
| `python:nested-decisions-and-guard-conditions` | Nested decisions and guard conditions |

### Loops and Iteration

| Stable reference | Lesson |
|---|---|
| `python:for-loops-and-range` | for loops and range |
| `python:counting-and-running-totals` | Counting and running totals |
| `python:iterating-over-strings-and-lists` | Iterating over strings and lists |
| `python:while-loops-and-state` | while loops and state |
| `python:break-continue-and-loop-else` | break, continue and loop else |
| `python:enumerate-and-zip` | enumerate and zip |
| `python:nested-loops-and-simple-patterns` | Nested loops and simple patterns |

### Collections and Records

| Stable reference | Lesson |
|---|---|
| `python:lists-create-read-and-update` | Lists: create, read and update |
| `python:list-slicing-copying-and-sorting` | List slicing, copying and sorting |
| `python:tuples-and-unpacking` | Tuples and unpacking |
| `python:sets-membership-and-deduplication` | Sets, membership and deduplication |
| `python:dictionaries-keys-and-values` | Dictionaries: keys and values |
| `python:dictionary-iteration-and-safe-lookup` | Dictionary iteration and safe lookup |
| `python:nested-records-and-collections` | Nested records and collections |
| `python:comprehensions-without-mystery` | Comprehensions without mystery |

### Functions and Modules

| Stable reference | Lesson |
|---|---|
| `python:defining-and-calling-functions` | Defining and calling functions |
| `python:parameters-and-return-values` | Parameters and return values |
| `python:function-contracts-and-edge-cases` | Function contracts and edge cases |
| `python:defaults-and-keyword-arguments` | Defaults and keyword arguments |
| `python:scope-and-mutable-arguments` | Scope and mutable arguments |
| `python:importing-and-using-modules` | Importing and using modules |
| `python:writing-small-reusable-modules` | Writing small reusable modules |
| `python:lambda-sorting-keys-and-useful-built-ins` | Lambda, sorting keys and useful built-ins |

### Debugging and Testing

| Stable reference | Lesson |
|---|---|
| `python:reading-tracebacks-and-locating-errors` | Reading tracebacks and locating errors |
| `python:common-exceptions-and-defensive-checks` | Common exceptions and defensive checks |
| `python:try-except-else-and-finally` | try, except, else and finally |
| `python:raising-useful-errors` | Raising useful errors |
| `python:assertions-and-unit-test-thinking` | Assertions and unit-test thinking |
| `python:testing-edge-cases-and-avoiding-brittle-code` | Testing edge cases and avoiding brittle code |

### Files and Structured Data

| Stable reference | Lesson |
|---|---|
| `python:working-with-text-files-safely` | Working with text files safely |
| `python:csv-rows-and-headers` | CSV rows and headers |
| `python:json-data-and-nested-objects` | JSON data and nested objects |
| `python:dates-times-and-time-zones` | Dates, times and time zones |
| `python:regular-expressions-for-validation` | Regular expressions for validation |
| `python:working-with-file-paths-and-multiple-files` | Working with file paths and multiple files |
| `python:writing-data-exports` | Writing data exports |
| `python:consuming-api-shaped-responses-offline` | Consuming API-shaped responses offline |

### Practical Python Patterns

| Stable reference | Lesson |
|---|---|
| `python:classes-and-data-models` | Classes and data models |
| `python:methods-and-object-state` | Methods and object state |
| `python:dataclasses-and-type-hints` | Dataclasses and type hints |
| `python:iterators-and-generators` | Iterators and generators |
| `python:context-managers-and-resource-safety` | Context managers and resource safety |
| `python:logging-configuration-and-project-structure` | Logging, configuration and project structure |

### NumPy Fundamentals

| Stable reference | Lesson |
|---|---|
| `python:arrays-shapes-and-dtypes` | Arrays, shapes and dtypes |
| `python:vectorized-arithmetic-and-broadcasting` | Vectorized arithmetic and broadcasting |
| `python:indexing-masks-and-views` | Indexing, masks and views |
| `python:reshaping-and-aggregating` | Reshaping and aggregating |
| `python:nans-and-numerical-reliability` | NaNs and numerical reliability |

### pandas for Data Work

| Stable reference | Lesson |
|---|---|
| `python:series-and-dataframes` | Series and DataFrames |
| `python:reading-and-inspecting-data` | Reading and inspecting data |
| `python:selecting-and-filtering-rows` | Selecting and filtering rows |
| `python:missing-values-and-data-types` | Missing values and data types |
| `python:cleaning-strings-dates-and-duplicates` | Cleaning strings, dates and duplicates |
| `python:groupby-and-aggregation` | GroupBy and aggregation |
| `python:merging-and-reshaping-data` | Merging and reshaping data |
| `python:exploratory-data-analysis-and-exports` | Exploratory data analysis and exports |

### Reliable Data Pipelines

| Stable reference | Lesson |
|---|---|
| `python:define-input-and-output-contracts` | Define input and output contracts |
| `python:parse-and-normalize-raw-records` | Parse and normalize raw records |
| `python:data-quality-rules-and-rejections` | Data quality rules and rejections |
| `python:incremental-processing-and-idempotence` | Incremental processing and idempotence |
| `python:pipeline-tests-and-observability` | Pipeline tests and observability |
| `python:build-a-reproducible-data-deliverable` | Build a reproducible data deliverable |
