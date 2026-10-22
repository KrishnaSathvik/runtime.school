# Python on runtime.school: curriculum and build plan

Version 1.1 · 2026-10-16 · Status: approved for Phase 1 (decisions in §12)

This is the plan for building Python on runtime.school: **Learn** (50 modules, 250 lessons), **Practice** (1,250
questions), **Projects** (10), **Datasets**, and five **Tools**. It's based on the Python Master Agent Pack
(`runtime_school_python_master_agent_pack.zip`, kept private and never committed) and on the Python engine
already in this repository.

---

## 1. Foundation: the Python engine we reuse

Everything below is built on four pieces that already run and are tested. We extend them; we don't replace them.

| Piece | Files | What it gives us |
|---|---|---|
| **Runner** | `public/vendor/python-worker.mjs`, `src/engine/python/client.ts`, `scripts/copy-pyodide.mjs`, `src/platform/python-runner.ts` | Real CPython 3.14 (Pyodide 314.0.7), self-hosted and hash-checked. A fresh interpreter for every run. 5 s run limit, 50k-character output cap, Stop and crash recovery. Streams stdout and stderr; returns tables, PNG figures and the files the program writes; gives errors with line numbers. Optional NumPy, pandas, matplotlib, DuckDB. |
| **Grader** | `src/engine/python/grading.ts`, `values.ts`, `predict.ts` | Run and Check are separate. Results come back as typed values and are judged in TypeScript. Checks on output, variables and functions, each with an explicit comparison policy. Hidden cases. Failure categories for feedback. |
| **Editor** | `src/features/py/PyEditor.tsx` | CodeMirror with Python mode, keyboard shortcuts, error-line marking. |
| **Saved progress** | `src/lib/python-progress.ts` | A local-first zustand store: drafts, help used, independent vs assisted solves, mastery. The new course uses a new key, `runtime-python-v2`, with records built around the IDs in §3. |

Engine tests to keep green throughout: `tests/python-client.test.ts`, `tests/python-grading.test.ts`,
`tests/python-progress.test.ts`.

### 1.1 Engine additions this plan needs

| Addition | Needed by | Design |
|---|---|---|
| **Dataset mounts** | Learn stages 3+, Practice, Projects, all Tools | The runner takes a list of dataset edition files, as `{ path, url, sha256 }`. The worker downloads each one into Pyodide's file system during boot, before the run clock starts, checks the hash, and caches it by hash. Binary files (Parquet, gzip) are supported. Today's fixture-as-text path stays for small inline files. |
| **New check kinds** | Practice formats (§5) | `dataframe`: compares columns, dtypes and rows, with an order policy and a float tolerance. `file`: checks that an output file exists and compares it as parsed CSV/JSON. `tests-vs-mutants`: runs the learner's tests against the reference and against deliberately broken versions; it passes when the reference passes and every mutant fails. `structure`: a rule read from the syntax tree, for example "no explicit loop" or "uses a comprehension". `budget`: counts operations or measures object size. It never relies on wall-clock time alone. |
| **Simulated HTTP** | M31, M39, P07 | Inside the interpreter, `requests`, `httpx`, `aiohttp` and `urllib` are routed to recorded responses taken from a manifest. That covers pagination, 404s, 429s with `Retry-After`, timeouts and malformed JSON. The runner never has network access. |
| **Runner isolation** | Any public Python execution | Designed and validated in **Phase 1**, not left to the end. The worker runs on a separate origin (an opaque `sandbox="allow-scripts"` iframe or a runner subdomain) with a CSP `connect-src` that blocks the network, and gets its runtime files and datasets from the page rather than fetching them. The bridge probe in `tests/e2e/python-runtime.mjs` must show the code can reach no app storage, cookies or network. Design: `docs/python/runner-isolation.md`. Until those tests pass, Python runs only in local development (the gate in `python-runner.ts`). |

Hidden tests run in the browser, so grades are **learning feedback, not certification**. Grading on a server
becomes worth its cost only when accounts or certificates exist. It isn't part of this plan.

### 1.2 What the browser runner can and can't do

Checked against the pinned build: `sqlite3` (3.39), `asyncio`, `cProfile`, `tracemalloc`, `timeit`, `zoneinfo`,
`decimal`, `argparse`, `pytest` 9, `pyarrow` 22, `polars`, `pydantic`, `requests`, `httpx`, `aiohttp`, DuckDB 1.5
all work. **Threads can't start** (`RuntimeError`). `multiprocessing` and `subprocess` import but can't run.
There's no `venv`, no Seaborn and no Docker. The module table (§4) records how each affected lesson is taught.

**We never quietly swap a concept for a different one.** When the browser can't execute something, the lesson still
teaches the real concept, using one of three clearly labelled modes:

| Mode | Label shown to the learner | What the learner does |
|---|---|---|
| `interactive` | (default, no label) | Writes and runs the real code; the grader checks it |
| `simulated` | "Simulated: runs against recorded results" | Runs code whose effect is replayed from recordings made on real CPython (for example HTTP responses or benchmark timings) |
| `read-and-diagnose` | "Read and diagnose: this can't run in the browser" | Reads real code, logs or config; predicts behaviour, finds the bug, or picks the fix; graded on the answers |

Every lesson, question and milestone records its mode in the registry (§3).

---

## 2. Datasets

Data drives most of the content, so it's built first.

### 2.1 Catalogue

| ID | Dataset | Source | Licence status | Used by |
|---|---|---|---|---|
| F00 | Inline fixtures | Written by us | Ours | M01–M03, M15, M35; small cases everywhere |
| **R01** | **Runtime Market**: relational e-commerce (customers, orders, order items, payments, products, reviews, sellers) | Generated by us; shape and messiness modelled on D02's real transactions | Ours | 15 modules, about 250 questions, P01 (replaces D01 Olist, whose licence is non-commercial) |
| **R02** | **Runtime Films**: movies, genres, ratings, tags, users | Generated by us | Ours | M05, M07, M13, M14, M44, about 105 questions, P02 (replaces D04 MovieLens, which has redistribution limits) |
| D02 | UCI Online Retail II | Already pinned in `datasets/acquire/sources.mjs` | CC BY 4.0, cleared | M18–M20, M23, P04 |
| D06 | NYC Taxi trips (Parquet) | Already pinned | NYC Open Data terms, cleared | M32, M36–M38, M45, M50, P09 |
| D07 | NOAA GHCN weather | Already pinned | Public domain, cleared | M28, M31, M41, P03 |
| D13 | BTS airline on-time | Already pinned | Public domain, cleared | about 100 questions, P10 |
| D03 | CFPB complaints | To acquire | US government; check narrative terms | M06, M11, P06 |
| D08 | USGS earthquakes | To acquire | US government; check | M17, M33, M39 |
| D05 | Inside Airbnb | To acquire | Check terms per city | M27, P05 |
| D09 | Open Food Facts | To acquire | ODbL, share-alike review | M24, M34 |
| D10 | OpenAlex | Recorded API responses | CC0; check API terms | P07 |
| D11 | GH Archive | To acquire | Personal-data review; minimise | M16, M46, M48, P08 |
| D12 | Stack Exchange | To acquire | CC BY-SA, attribution | Practice |
| D15 | NASA | Choose one collection first | Per collection | Practice |

**R01 and R02 must read like real data, not random records.** That means:
- Believable distributions: long-tailed prices and order sizes, seasonality, weekday patterns, repeat customers, popular and niche items.
- Connected entities with real keys, and a history over time: customers sign up, order, pay, get refunds and write reviews in that order.
- Deliberate, documented quality problems: missing values, duplicate rows, inconsistent text, bad dates, orphan references, currency text in number columns.

Each problem is listed in the manifest with its count, so lessons can say exactly what learners will find.

**Licence gate** (from `DATASET_OPERATIONS.md`): before a source is downloaded or shipped, record its owner, licence
URL and date, commercial-use, redistribution and attribution terms, PII, and schema. If anything is unclear,
content uses a labelled generated stand-in with the same schema, so authoring is never blocked.

### 2.2 Editions

Datasets are published as fixed, versioned editions, and graded content always names exactly one edition. A dataset
only builds the editions its content actually uses. Not every dataset needs all five as physical files.

| Edition | Size | Stored as | Used for |
|---|---|---|---|
| `preview` | 10–25 rows | Files | Stages 1–2 lessons; Datasets sample |
| `starter` | 100–500 rows | Files | Stages 3–5; most Practice |
| `standard` | 5k–25k rows | Files | Stages 6–9; projects |
| `full` | Source size, within browser limits | Files for generated datasets; for real sources, a **reference** to the pinned original (URL and sha256) plus the extraction recipe | Stage 9–10 analysis, Performance Lab |
| `stress` | Any size | **Generated on demand** from the seeded generator (seed and size recorded), and clearly labelled | Performance and memory lessons |

Hidden-test fixtures are separate, independent extracts and never part of a learner-visible edition.

### 2.3 Pipeline

1. **Generate or acquire.** Generators are seeded and deterministic: `datasets/python/<id>/generate.mjs`.
   Real sources reuse `datasets/acquire/` (pinned URL and sha256).
2. **Profile.** Types, nulls, duplicates, keys, relationships, encoding. Generated data has deliberate quality
   problems (stray whitespace, mixed case, currency text, duplicates, orphan keys, bad dates), each recorded in the
   manifest so lessons can refer to them.
3. **Build editions.** Each edition is written as CSV, JSON or JSONL, and Parquet where useful, named by content hash.
4. **Manifest** (`datasets/python/<id>/manifest.json`): id, edition, version, files with sha256 and size, schema
   and data dictionary, row counts, keys and relationships, known quality problems, licence, attribution, source.
5. **Validate** (`tests/python-datasets.test.ts`): hashes, row counts, foreign-key integrity, known problems still
   present, generation is reproducible.
6. **Publish.** Files are served under `/datasets/python/` with immutable caching, and the runner mounts them.

---

## 3. Content model

All content is typed data in `src/content/python-v2/` (lessons, questions, projects) with stable IDs:

| Item | ID pattern | Example |
|---|---|---|
| Module | `M01`–`M50` | `M04` |
| Lesson | `PY-L<module>-<n>` | `PY-L04-02` |
| Question | `PY-Q<module>-<n>` | `PY-Q04-17` |
| Project / milestone | `P01`–`P10` / `P01.m3` | `P01.m1` |
| Dataset edition | `<id>@<edition>.<version>` | `R01@starter.1` |

Every item has a **status**: `planned → drafted → tests-pass → reviewed → published`. Only `published` items appear
in the app.

**One canonical registry** (`src/content/python-v2/registry.json`, typed in `types.ts`) lists every module, lesson,
question, project and milestone, dataset and tool. Each entry has its stable ID, status, mode (§1.2), explicit
prerequisite IDs, and the dataset editions it uses. Authored content files must match their registry entry. A
validation test (`tests/python-v2-registry.test.ts`) checks: IDs are unique; every prerequisite exists and comes
earlier; every dataset reference resolves; nothing is published unless what it depends on is published.

**Coverage report** (`npm run py:coverage` writes `docs/python/coverage.md`), generated from the registry:
- which lessons, questions and projects use each dataset
- datasets nothing uses
- content that points at a dataset that's unavailable or whose licence isn't cleared
- counts by status, mode, stage and format

So planned work is never confused with finished work.

---

## 4. Learn: 50 modules, 250 lessons

### 4.1 Lesson structure

Each lesson has, in order:

1. **Objectives** (2–3) and **prerequisites** (lesson IDs).
2. **Concept**: short and specific, with one idea per section.
3. **Two annotated, runnable examples** on the lesson's dataset edition.
4. **Guided try-it**: a small edit with instant feedback.
5. **Two independent challenges**, graded by the grader. Solving them without help earns mastery.
6. **Concept check**: 2–3 questions, at least one asking learners to predict output.
7. **Hints** (3 levels) and a **review** summary. The third hint names the missing idea. It does not contain the finished program. Only the Answer control shows that.
8. **Data note**: dataset, edition and attribution.

Rules: no concept is used before the lesson that teaches it. The check is per concept, not per module
(`src/content/python-v2/concepts.ts`, `tests/python-v2-beginner.test.ts`). The authoring rules for that
check, including how M01 is the benchmark for later modules, are in `docs/python/content-rules.md`.
Beginners (stages 1–2) see real field names on tiny `preview` data, and data grows with each stage (§2.2).
Every lesson ends in something the learner wrote and the grader checked.

### 4.2 Module map

R01 and R02 replace D01 and D04 (§2.1). Lesson topics come from the pack's `catalog/lessons.csv`. Lessons are
`interactive` unless the note says otherwise (modes: §1.2).

### Stage 1: Foundations

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M01 Python Setup & First Programs | Run a first program; printing and formatting; comments; indentation; runtime errors | F00 | `input()` is not taught here |
| M02 Variables & Data Types | assignment, then `name = input(...)`; numbers; strings and booleans; conversion; None and type inspection | F00 | `input()` is the second half of the assignment lesson, on its own line, after a name exists |
| M03 Operators & Expressions | arithmetic; comparison; logical operators; membership and identity; precedence and bitwise | F00 |  |
| M04 Conditional Logic | if; elif and else; nested conditions; truthiness; conditional expressions and match | R01 |  |
| M05 Loops & Iteration | for; while; range and enumerate; break and continue; nested loops | R02 |  |

### Stage 2: Collections

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M06 Strings & Text | indexing; slicing; string methods; formatting; Unicode | D03 |  |
| M07 Lists & Tuples | creation; indexing and slicing; mutation; sorting and copying; tuple unpacking | R02 |  |
| M08 Dictionaries & Sets | dictionary creation; lookup and updates; iteration; set operations; nested dictionaries | R01 |  |
| M09 Functions | def and invocation; parameters; return values; defaults and scope; docstrings and reuse | R01 |  |
| M10 Fundamentals Integration | order calculations; movie summaries; weather reports; text categorization; mixed review | R01 |  |

### Stage 3: Problem Solving

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M11 String Algorithms | normalization; tokenization; search and replacement; frequency counting; validation | D03 |  |
| M12 Collection Algorithms | filtering; mapping; grouping; merging; deduplication | R01 |  |
| M13 Comprehensions | list; dictionary; set; nested; conditional | R02 |  |
| M14 Built-ins & Sorting | enumerate and zip; sorted with keys; any and all; map and filter; aggregations | R02 |  |
| M15 Advanced Functions & Recursion | args and kwargs; keyword-only parameters; lambda; closures; recursion | F00 |  |

### Stage 4: Standard Library

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M16 Collections & Itertools | Counter; defaultdict; deque; groupby; combinatorial iterators | D11 |  |
| M17 Nested Data Structures | nested lists; nested dictionaries; traversal; flattening; missing fields | D08 |  |
| M18 Exceptions & Validation | try and except; exception types; finally; raise; custom exceptions | D02 |  |
| M19 Files & Directories | text I/O; writing files; context managers; pathlib; encodings | D02 |  |
| M20 CSV JSON & JSONL | CSV reading; CSV writing; JSON parsing; JSON serialization; JSONL streams | D02 |  |

### Stage 5: Practical Development

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M21 Dates Numbers & Regex | datetime parsing; time zones; durations; Decimal; regular expressions | R01 |  |
| M22 Modules & Packages | imports; reusable modules; package structure; __main__; import troubleshooting | R01 |  |
| M23 CLI & Automation | argparse; file automation; environment variables; subprocess; reporting | D02 | *subprocess* is **read-and-diagnose**: real `subprocess.run` code, return codes, captured output and failure cases, with recorded results. The other lessons are interactive |
| M24 Debugging & Logging | tracebacks; breakpoints; logging; diagnosing failures; workflow troubleshooting | D09 | *breakpoints* teaches real `breakpoint()` / `pdb` commands as **simulated**, with a recorded debugger session the learner steps through and answers questions about. Post-mortem inspection (`traceback`, `sys.exc_info`) is interactive |
| M25 Testing & Code Quality | assertions; pytest; parametrization; fixtures and mocking; edge-case coverage | R01 |  |

### Stage 6: OOP & Professional

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M26 Classes & Objects | class definitions; attributes; constructors; methods; instance and class state | R01 |  |
| M27 Inheritance & Composition | inheritance; overriding; polymorphism; composition; relationships | D05 |  |
| M28 Data Models & Typing | dataclasses; properties; special methods; type hints; TypedDict and Protocol | D07 |  |
| M29 Advanced OOP & Design | abstract classes; protocols; mixins; descriptors; dependency injection | R01 |  |
| M30 Packaging & Databases | virtual environments; pyproject; dependencies; SQLite; transactions | R01 | venv, pyproject and dependencies are **read-and-diagnose** (real files, real error output, choose the fix). SQLite and transactions are interactive |

### Stage 7: APIs & Advanced

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M31 HTTP & API Clients | HTTP requests; JSON responses; pagination; retries and timeouts; client architecture | D07 |  |
| M32 Iterators & Generators | iterator protocol; generators; yield from; lazy pipelines; memory behavior | D06 |  |
| M33 Decorators & Context Managers | decorators; parameterized decorators; wraps; custom context managers; contextlib | D08 |  |
| M34 Functional & Dynamic Python | pure functions; partial; composition; introspection; dynamic registration | D09 |  |
| M35 Algorithms & Complexity | Big O; searching and sorting; hash-based problems; stacks and queues; recursion trade-offs | F00 |  |

### Stage 8: Performance & Concurrency

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M36 Memory & Python Internals | references; shallow and deep copy; garbage collection; memory profiling; GIL and interpreter | D06 |  |
| M37 Profiling & Optimization | timeit; cProfile; caching; efficient I/O; algorithmic optimization | D06 |  |
| M38 Threading & Multiprocessing | threads; executors; shared state; processes; benchmark comparisons | D06 | Real `threading`, `concurrent.futures` and `multiprocessing` are taught as **read-and-diagnose** and **simulated**: read real code, predict interleavings, find races and deadlocks, and compare benchmarks recorded on real CPython (GIL vs I/O-bound vs CPU-bound). `asyncio` is **not** presented as a substitute; it's taught in M39 |
| M39 Async Python | async and await; tasks; cancellation; semaphores; async HTTP workflows | D08 |  |
| M40 Software Architecture | separation of concerns; configuration; dependency boundaries; refactoring; integration tests | R01 |  |

### Stage 9: Data Analysis

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M41 NumPy Foundations | arrays and dtypes; indexing; broadcasting; vectorization; numerical statistics | D07 |  |
| M42 pandas Foundations | Series and DataFrames; selection; filtering; missing values; data types | R01 |  |
| M43 pandas Transformations | groupby; merge and join; pivot; datetime operations; data quality | R01 |  |
| M44 Visualization & EDA | Matplotlib; Seaborn; chart selection; distributions; storytelling | R02 | matplotlib is interactive. Seaborn is still taught: its API and when to use it, with code shown next to figures rendered on real CPython (**read-and-diagnose**). The runner can't import it |
| M45 Data Formats & Analytical Workflows | Parquet and Arrow; chunking; SQLite and DuckDB; reproducible analysis; exports | D06 |  |

### Stage 10: Production

| Module | Lessons | Data | Browser note |
|---|---|---|---|
| M46 Reliable Data Pipelines | ingestion; schema checks; idempotency; checkpoints; recovery | D11 |  |
| M47 Secure Python | input safety; secrets; SQL injection; safe serialization; path security | R01 |  |
| M48 Observability & Operations | structured logs; metrics; tracing concepts; retries; failure investigation | D11 |  |
| M49 Application Delivery | dependency locking; Docker; CI; configuration; deployment checks | R01 | Docker and CI are **read-and-diagnose** (real Dockerfiles, CI configs and failing logs; find and fix the problem). Dependency locking and configuration checks are interactive |
| M50 Production Readiness Capstone | design review; integrated testing; performance; resilience; delivery review | D06 |  |

---

## 5. Practice: 1,250 questions

The pack's `catalog/practice_blueprint_slots.csv` gives 25 idea slots per module. Each slot becomes an **original**
question.

### 5.1 Formats

| Format | Count | Graded by |
|---|---|---|
| Function implementation | 150 | `function` checks with public and hidden cases |
| Output prediction | 150 | Predict grader, compared with real stdout |
| Debugging | 150 | Function and output checks on a broken starter |
| Data transformation | 150 | `dataframe` / `file` checks |
| Validation | 150 | `function` checks, including expected exceptions |
| Refactoring | 100 | Same behaviour plus a `structure` rule |
| Testing | 100 | `tests-vs-mutants` |
| Performance | 100 | Same output plus a `budget` |
| Integration | 100 | Several functions and files together |
| Code completion | 100 | Function checks on a partial starter |

Difficulty: 500 easy, 500 medium, 250 hard. This gets rebalanced after the pilot.

### 5.2 What each question must include

An original statement; exact inputs, outputs and constraints; a starter; primary and secondary concepts;
prerequisite lesson IDs; the dataset edition; **at least 3 public tests**; **hidden tests** covering normal, empty,
boundary, duplicate, mutation and large cases as relevant; a reference solution; **at least 2 deliberately wrong
solutions that must fail on the intended check**; 3 levels of hints; an explanation; reviewer sign-off.
Correctness never depends on matching the reference code.

### 5.3 Organisation

Questions are grouped by module, then by topic. There are also **tracks**: curated sequences such as *Python from
Zero*, *Data Analysis*, *Data Engineering* and *Interview Essentials*. A track only references question IDs; it
never copies a question. Each lesson links to its questions, and each question links back to its lesson.

---

## 6. Projects: 10

Each project has: a story and role; a starter file tree with several editable files plus read-only data; **5–7
milestones**, each with testable acceptance criteria and locked tests that keep running on every later milestone;
feedback; a saved draft per file; export (a source archive, plus a summary tied to the exact code that passed); and
an optional stretch goal.

| ID | Project | Level | Unlocks after | Data | Milestones (outline) | Acceptance |
|---|---|---|---|---|---|---|
| P01 | Smart Shopping Cart & Receipt Generator | Beginner | M09 | R01 | Browse products → cart add/update → totals and discounts → receipt file → edge cases | Total calculations, edge cases, receipt file |
| P02 | Movie Discovery & Rating Explorer | Beginner | M14 | R02 | Search → genre filters → rating aggregates → rankings → report | Filter and rank tests |
| P03 | Weather Insights & Alert Reporter | Beginner+ | M20 | D07 | Parse observations → missing values → summaries → threshold alerts → report | Missing data, thresholds |
| P04 | Retail Data Quality Toolkit | Intermediate | M25 | D02 | Ingest CSV → reject and clean → reconcile → report → CLI | Quality rules; a rerun gives the same result |
| P05 | Travel Listing & Booking Simulator *(simulated)* | Intermediate | M30 | D05 or generated | Models → availability → reservations → persistence (SQLite) → reports | Overlapping and invalid dates |
| P06 | Financial Complaint Case Manager *(simulated assignments)* | Intermediate | M30 | D03 | Import → assign → state transitions → audit log → reports | Transitions, audit trail |
| P07 | Research Publications API Explorer | Intermediate+ | M31 | D10 (recorded) | Client → pagination → retries and caching → SQLite store → summaries | Mock HTTP, pagination |
| P08 | GitHub Event Streaming Analyzer | Advanced | M37 | D11 (minimised) | JSONL streaming → aggregates → checkpoints → duplicates → report | Memory limit, duplicate events |
| P09 | High-Performance Taxi Trip Processor | Advanced | M45 | D06 | Parquet read → batch stats → pandas vs DuckDB → benchmark → report | Matching results, performance budget |
| P10 | Resilient Flight Data Pipeline | Advanced | M50 | D13 | Validate → transform → checkpoint → retry and replay → metrics → package | Recovery and replay |

Simulated workflows are labelled as simulated in the project brief.

---

## 7. Tools

All five tools live in Python's secondary **Tools** menu and use the same runner and dataset mounts.

| Tool | Phase | Features | Acceptance |
|---|---|---|---|
| **T01 Python Playground** | 1 | Editor, run / stop / reset, console and tracebacks, tables and figures, saved draft, starter templates, choose dataset and edition, CSV/JSON upload with size limits, `.py` export, no grading | Canonical data never changes; an uploaded file lasts only for that session |
| **T02 Datasets** | 1 (v1), 2 (full) | Browse the catalogue; schema and data dictionary; licence, attribution and source; versions; sample rows; nulls, keys and relationships; known quality problems; download; "Open in Playground" and "Open in Database Lab" | Every number shown comes from the manifest or from a real query of the edition |
| **T03 Database Lab** | 3 | Fresh SQLite database per session (stdlib `sqlite3`), schema tree, CREATE / INSERT / UPDATE / DELETE, transactions, import a dataset edition, reset, `EXPLAIN QUERY PLAN`. Later DuckDB with `EXPLAIN ANALYZE`, labelled by engine | Source data mounted read-only; writable copies only |
| **T04 Performance Lab** | 4 | Compare equivalent variants: loop vs comprehension, list vs generator, pure Python vs pandas, pandas vs DuckDB, eager vs chunked. Checks outputs match, warmup, repeated runs, median and spread, memory (`tracemalloc`), environment and edition shown | Never claims a definitive speedup; always labelled as "this browser, this run" |
| **T05 Compare Approaches** | 4 | Curated side-by-side pairs: loop vs comprehension; Counter vs manual dict; csv vs pandas; pandas groupby vs SQL GROUP BY; merge vs JOIN; SQLite vs DuckDB. Both sides run on the same data, and their outputs are shown to match, with caveats and complexity notes | Not an automatic converter; every pair is authored and tested |

---

## 8. User interface

The UI for Learn, Practice, Projects and Tools is designed and built new, on the site's shared shell and design tokens.

- **Navigation:** Learn / Practice / Projects as the main menu, Tools as a secondary menu inside Python, and
  command-palette search over all published items. There's no separate progress page; progress shows where the
  work is.
- **Workbench component**, shared by every screen: the editor; a results panel (console, tables, figures, files,
  errors linked to lines); a checks panel (public cases with call, expected and actual; hidden cases shown only as
  pass/fail); Run / Check / Stop / Reset; dataset chips that open the Explorer.
- **Screens:** Python home; module and lesson; Practice list (filters by module, topic, format, difficulty and
  status); question; project overview and milestone (file tree, milestone rail, deliverables); the five tools.
- **Accessibility and layout:** keyboard-only paths, zero axe violations, desktop and mobile, light and dark, no
  horizontal page scroll.
- **Process:** mockups of the five main screens (lesson, question, project milestone, Datasets,
  Playground) get approved before they're built.

---

## 9. Quality gates

Every item must pass its gate before its status can move to `published`.

| Item | Automated gate | Human gate |
|---|---|---|
| Lesson | Every example, try-it and concept-check program runs in real Pyodide with the stated result; reference answers pass; starters fail; listed mistakes fail on the intended check; prerequisite linter | Review for accuracy, clarity and originality |
| Question | ≥3 public tests; hidden tests; reference passes; ≥2 wrong solutions fail on the intended check; prediction matches real stdout; near-duplicate detector | Review sign-off |
| Project milestone | Reference passes this milestone and all earlier ones; starter fails; exported files match the manifest | Review |
| Dataset edition | Manifest valid; hashes; row counts; key integrity; reproducible; licence recorded | Licence sign-off |
| Tool | Unit plus e2e journey; numbers come from real runs | UX review |

Across the whole app: the engine tests, SQL tests and `npm run build` stay green; SQL pages never load Pyodide.

Originality: no prose, exercises or solutions copied from the reference PDFs or GitHub repositories. Those are
background reading only.

---

## 10. Phases

| Phase | Builds | Done when |
|---|---|---|
| **1. Foundations and vertical slice** | **1a, foundation:** content registry and coverage report; dataset pipeline, R01 generator and editions; dataset mounts in the runner; runner isolation design and validation spike; UI mockups. **Stop for review.** **1b, slice:** workbench; Python home, lesson, question and project screens; Playground; Datasets v1; **M01 (5 lessons), 10 questions across at least 4 formats, P01 milestone 1**; D07 editions | A learner can open a lesson, write and run Python, get feedback, solve a practice question on their own, explore a dataset, and start P01. All gates green. Isolation tests pass before Python runs anywhere public |
| **2. Stage 1–4 content** (M01–M20) | 100 lessons, about 500 questions, P01–P04; R02, D02 editions; `dataframe`/`file` checks; Datasets complete | Every item published through its gates |
| **3. Stage 5–8 content** (M21–M40) | 100 lessons, about 500 questions, P05–P08; simulated HTTP; `tests-vs-mutants`, `structure`, `budget` checks; **Database Lab**; licence decisions for D03, D05, D08, D10, D11 | Same |
| **4. Stage 9–10 content** (M41–M50) | 50 lessons, about 250 questions, P09–P10; D06 Parquet and D13 editions; **Performance Lab**; **Comparator** | Same |
| **5. Release readiness** | Runner isolation re-verified on the production origin; full security probe; accessibility, load and licence audits; feature flag; rollback plan | Approval to deploy |

Each phase ends with a report: changed files, test evidence, unfinished items, rollback steps. No pushes or
deployments without approval.

### 10.1 Phase 1 task list

**1a: foundation (stop for review after this)**
1. `src/content/python-v2/` types and the canonical registry, generated from the pack catalogue, with a validation test.
2. Coverage report (`npm run py:coverage`).
3. Dataset pipeline: R01 generator, profile, editions, manifest and validation test.
4. Runner: dataset mounts (hash-checked, cached, outside the run clock), with engine tests.
5. Runner isolation: design doc plus a validation spike showing the opaque-origin runner can't reach app storage, cookies or network.
6. UI mockups for the 5 main screens, for approval.

**1b: vertical slice (built 2026-10-16; items are `tests-pass`, waiting for owner review)**
7. Progress store records for the new IDs (`runtime-python-v2`).
8. Workbench component, then lesson, question, project and Python home screens.
9. Playground and Datasets v1.
10. M01: 5 lessons through every gate.
11. 10 questions (M01–M02) across at least 4 formats through every gate.
12. P01 milestone 1; D07 editions.
13. E2e journey from lesson to practice to dataset to project; accessibility; SQL regression.

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Authoring volume (250 lessons, 1,250 questions) is the bottleneck | Template-driven drafting, automated gates first, human review per batch, publish only validated items |
| Licence surprises | Gate before download; generated stand-ins with the same schema keep authoring moving |
| Browser limits (memory, threads, cold start, about 50 MB of libraries) | Editions sized for the browser; libraries loaded only when a lesson asks; affected modules taught as in §1.2 |
| Grading can be bypassed in the browser | Treated as learning feedback; server grading only if certification is added |
| Questions repeating each other at scale | Near-duplicate detection on reasoning pattern, not just wording |
| Runner security before deploy | Phase 5 isolation is a hard gate; Python stays local-only until then |

## 12. Decisions (approved 2026-10-16)

1. **R01 Runtime Market and R02 Runtime Films replace D01 and D04.** Both are deterministic, realistic, relational
   and documented, with deliberate data-quality problems (§2.1).
2. **Browser-limited lessons keep the real concept** and are labelled `interactive`, `simulated` or
   `read-and-diagnose` (§1.2, §4.2). `asyncio` is never presented as a substitute for threads or processes.
3. **Phase 1 starts with foundations and UI mockups** (§10.1, 1a). Mockups are approved before screens are built.
4. **Runner isolation is designed and validated in Phase 1.** Python stays local-only until the isolation tests pass.
5. **One canonical registry, plus a dataset-to-content coverage report** (§3).
6. The pack ZIP and reference PDFs are never committed (`.gitignore`).
