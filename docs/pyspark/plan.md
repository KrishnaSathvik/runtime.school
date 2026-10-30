# PySpark: plan, status and acceptance criteria

Updated 2026-10-23. Source material: `PySpark Docs/` (v4 instructions are authoritative; v3 files and raw notes are
history). Every section says whether it describes something **built** (exists in this repo and is tested) or
**proposed** (not built). Nothing is committed, pushed or deployed.

| Step | What | Status |
|---|---|---|
| 1 | Audit SQL/Python and reuse plan | Done (§2) |
| 2 | Typed, namespaced registry + prerequisite validation | **Built** (§3–§4) |
| 3 | Local real-Spark runner | **Built** (§5) |
| 4 | Hidden PySpark shell | **Built, local only** (§6) |
| 5 | Complete D01 learning path (lesson, practice, Playground, Datasets, P01 steps 1–2) | **Built, local only** (§7) |
| 6 | All 15 datasets; lessons 1–10; the 25-question pilot | **Built, local only** (§10) |

## 1. Owner decisions (2026-10-23)

| | Decision |
|---|---|
| Engine | Real Apache Spark is the only engine. No DuckDB, Polars or browser imitation as runner or grader. A capability that isn't live is shown as unavailable, never as working. |
| IDs | Namespaced: `PS-L001`–`PS-L090`, `PS-Q0001`–`PS-Q0450`, `PS-D01`–`PS-D15`, `PS-P01`–`PS-P10` (plus `PS-M01`–`PS-M15`, `PS-T01`–`PS-T06`). |
| Buttons | Run / Check, as in SQL and Python. |
| Login | None required. Progress and drafts stay in the browser; hidden tests stay with the runner. |
| Content | 90 / 450 / 10 / 15 are planning targets; difficulty and question types follow the concept. v4 project lineup (3 / 4 / 3) is final. D01 is our own synthetic retail data. |
| Datasets | Keep each lesson's own dataset. Don't move lessons to Retail to get around licensing; fix the prerequisite graph instead (§4). |
| Prerequisites | Provisionally approved; editable until the first path is validated. |
| L007 | Moved to PS-D01. |
| Runner | `services/spark-runner/` approved, local only, separate from the SQL and Python engines. Docker Desktop is for development only, not a security boundary. |

## 2. What the repo gives us (audit, done)

| Need | Existing piece | Used as |
|---|---|---|
| Top bar, nav, tools menu, ⌘K | `features/rt/Shell.tsx` | Gained a `"pyspark"` subject (additive; SQL/Python paths unchanged) |
| Lesson / question layout | `features/python/TaskBar.tsx`, `Help.tsx`, `Md.tsx`, `p2` CSS | Reused as is |
| Editor | `features/py/PyEditor.tsx` | Reused as is |
| Run / Check workbench | `features/python/Workbench.tsx` (bound to Pyodide) | **Not reused.** `features/pyspark/PsWorkbench.tsx` is separate |
| Progress | `lib/python-progress-v2.ts` | Same pattern, own store: `lib/pyspark-progress.ts` (`rt-pyspark-v1`) |
| Registry + validation | `content/python-v2/registry.*` | Same pattern: `content/pyspark/registry.*` |
| Server execution | none | `services/spark-runner/` (local only) |

## 3. Registry (built)

`scripts/pyspark/import-catalog.mjs` reads `PySpark Docs/planning/*_v4.csv` and writes `src/content/pyspark/registry.json`;
statuses are edited in place and survive re-imports. `src/content/pyspark/registry.ts` validates it.
Tests: `npx vitest run tests/pyspark-registry.test.ts` (12).

Each lesson, question, milestone, project and tool records the Spark capability it needs. The validator refuses
`published` unless that capability is live, its datasets are built and licence-cleared, and every prerequisite is
published first.

| Tier | Capabilities | Registry items |
|---|---|---|
| — | `none` (read-and-diagnose) | L002, L079–L081 and their questions |
| A | `dataframe`, `sql`, `rdd`, `arrow`, `plans` | M02–M09 core, RDD lessons, M10 plans |
| B | `delta`, `streaming`, `benchmark`, `mllib` | M11–M13, L083, M15, P06–P10 |
| C | `cluster` | none yet |

Status today: everything `planned` except **PS-Q0046 `tests-pass`** (the runner's integration fixture: tested on real
Spark, not reviewed, not published).

## 4. Prerequisites (built, provisional)

Each lesson has `prerequisites` (needed to follow it; validated: exist, acyclic, earlier in course order, M01–M06
never pull in tier-B or later modules) and `related` (useful, never a lock). Projects list the lessons they build on;
a project can be opened before them.

**Changes to the v4 mapping** (all in `import-catalog.mjs`; the handoff CSVs stay as supplied, hashes in
`PySpark Docs/MANIFEST.json`):

- `DATASET_OVERRIDES`: L007 and PS-Q0031–Q0035 use PS-D01 instead of PS-D03.
- P01 review (`RELATED`): six links on the P01 path were related reading, not real dependencies, and moved from
  `prerequisites` to `related`. No dataset changed.

| Lesson | Was required | Now required | Now related | Why |
|---|---|---|---|---|
| L014 Casting | L013 | L008 | L013 | Casting needs the column types (L008), not building StructType schemas |
| L015 Strings | L012 | L009 | L012 | String functions apply through select/alias |
| L017 Conditionals | L010, L012 | L009, L010 | L012 | `when/otherwise` works inside select and filter |
| L020 Dedup | L011 | L009 | L011 | `dropDuplicates` is taught in L020 itself |
| L025 Joins | L010, L012 | L009 | L010, L012 | A join needs DataFrames and column selection |
| L031 GroupBy | L010, L012 | L009 | L010, L012 | groupBy/agg with aliases needs select |

**Pathway check after the review.** Creating → exploring → filtering and Joins need no uncleared data. P01's chain
reaches one lesson on data under licence review: **L019 Nulls (PS-D13 NOAA)**. That dependency is real (P01's
cleaning step handles null totals), so it stays; the D13 licence needs review. MovieLens (L011), Employees (L012) and
Synthea (L013) are no longer on the P01 path and keep their datasets.

## 5. Local real-Spark runner (built)

`services/spark-runner/` (Python, outside the Next.js app). Details, contract and measurements: its `README.md`.

- Image `runtime-spark-runner:4.0.1-1`: Python 3.11.17 + Temurin JRE 17.0.20.1 (base images by digest) + PySpark
  4.0.1 / py4j 0.10.9.9 (by hash). 537 MB.
- `sandbox/harness.py` runs inside the container: `local[2]` Spark on loopback; `run`, `capture` (for grading) and
  `script` (Playground) modes; reports on stdout with tagged lines (`@@ps state|case|result`).
- `runner/sandbox.py`: one container per job. `--network none`, read-only root, the **only writable place is a 512 MB
  noexec `/tmp` tmpfs**, user 10001, no capabilities, `no-new-privileges`, 256 pids, 4 GB memory without swap,
  2 CPUs, `--log-driver none`. Read-only `/job` and `/data`. Run 45 s / Check 90 s; kill on timeout or Stop.
- **Output cap (fixed in this round).** There is no writable output mount any more: the result comes back on stdout,
  and the host keeps at most 8 MB of the result line and 64 KB of other output in memory, dropping the rest. Tested
  with a 50 MB flood. (A size-capped tmpfs volume was tried first: its contents vanish when the container stops, so
  the host can't read the result afterwards.)
- **Endless output is killed (step 5).** A job that keeps producing output past 16 MB of dropped bytes is stopped
  with status `output-limit`, well before its wall clock; host memory stays bounded either way.
- `runner/grader.py` and `runner/api.py` run on the host: grading never happens where learner code runs.
- Public item specs: `src/content/pyspark/items/<id>.json` (the same file the app renders). Private material:
  `services/spark-runner/private/<id>/` (reference, plain-Python oracle, hidden cases, expected results), never mounted.
- `dev_server.py`: localhost-only bridge for the app (§6).
- Tests: `npm run test:pyspark-runner`.

**Isolation limits, not production-grade:** all cases of one Check share one SparkSession. Each case gets a fresh
learner module and fresh DataFrames, but learner code can still change process-wide state (Spark config, the JVM,
Python builtins) that a later case sees. Hidden **inputs** are mounted for Check (the code must run on them); expected
results and the reference never are. Docker Desktop is not a public security boundary.

## 6. Hidden PySpark shell (built, local only)

- **Flag:** `NEXT_PUBLIC_PYSPARK=1` turns it on; off by default. Off: every `/pyspark*` route 404s (layout and each
  page check), nothing is in the sitemap, the landing card stays "planned". Verified on a production build.
  Every PySpark page is `noindex` even when on.
- **Visibility:** local development shows planned and in-review items, tagged; a production build shows `published`
  only (none today). If the flag were set on a production build, lesson, question and project pages would 404, the
  outline and project list would be empty, and Datasets and the Playground would render with nothing runnable (no
  runner URL). That combination isn't tested; the flag stays off in production.
- **Routes:** `/pyspark` (course outline), `/pyspark/learn/[slug]`, `/pyspark/practice` (→ first written question),
  `/pyspark/practice/[slug]`, `/pyspark/projects`, `/pyspark/projects/[slug]`, `/pyspark/tools/playground`,
  `/pyspark/tools/datasets`, `/pyspark/tools/datasets/[id]`.
- **Runner connection:** `src/engine/pyspark/client.ts` (submit → poll → cancel). It talks only to
  `NEXT_PUBLIC_PYSPARK_RUNNER_URL`, and a production build never has one (`platform/pyspark-flag.ts`). The bridge
  binds to 127.0.0.1, accepts only allowed Origins and localhost Hosts, requires JSON bodies, caps code at 64 KB and
  the queue at 2 running + 8 waiting. No public execution endpoint exists.
- **What works:** PS-Q0046 end to end (Run, Check with 7 hidden cases, Stop, hints, saved draft and progress), the
  Playground on PS-D01, Datasets (PS-D01 tables, rules, relationships, lesson and practice rows; 14 planned datasets),
  the course outline, lesson pages, project pages.
- **Honest states:** planned lessons, questions, projects and datasets say so and have nothing to run; four tools
  are listed as "Not available yet" without links; with no runner, Run and Check are disabled and the page says Spark
  isn't connected.
- **Reused vs new:** Shell, TaskBar, PyEditor, Help, Md and the p2 styles are reused. New: `PsWorkbench`, data/
  schema/expected tables, the "Your data" panel, Spark error view with learner line, job states (queued, starting
  Spark, running, checking, done, stopped).

Run it locally:

```
docker build -t runtime-spark-runner:4.0.1-1 services/spark-runner
npm run pyspark:runner        # 127.0.0.1:8787
npm run dev:pyspark           # http://localhost:3000/pyspark
```

## 7. Step 5 — first D01 learning path (built, local only)

Everything below is `tests-pass` (local, "in review"); nothing is published.

- **Dataset PS-D01 v1.1.0.** Adds a `project` edition (3,012 orders with real export problems: bad statuses, negative
  and missing totals, missing and out-of-year dates, duplicates). Lesson and practice editions are byte-identical to
  1.0.0. Lesson, question, project steps and Playground all name the same version.
- **PS-L010 Filtering with Conditions** (`src/content/pyspark/lessons/PS-L010.json`): intro, four objectives, the
  `orders` lesson table (12 rows; other tables fold away), five examples on real Spark (one shows the parentheses
  error), two graded challenges (PS-L010-C1 *Big web orders*, PS-L010-C2 *Orders to chase*, each with hidden cases),
  a three-question concept check, review, practice and project links. Teaches only `filter`/`where`, `F.col`,
  comparisons, `isin`, `&`, `|`, `~` and how missing values behave in a comparison, plus `select`, `show` and `count`
  from earlier lessons. Example output is recorded from real Spark (`PS-L010.recorded.json`) and shown, labelled, only
  when Spark isn't connected.
- **PS-Q0046 reviewed.** Rules, input, expected output, starter, three hints, an explanation (shown once solved),
  reference, oracle, 7 hidden cases and 5 known-wrong answers. It uses only what L010 teaches.
- **P01 steps 1–2.** Step 1 *Explore the orders and pick the report's columns* (`order_view`: select and rename, every
  row kept). Step 2 *Filter, validate and clean the orders* (`clean_orders`: status list, total ≥ 0, date in 2026,
  built on `order_view`). One `pipeline.py` carries across steps. Steps 3–5 are planned and not clickable.
- **Prerequisites per step.** Step 1 needs L007–L009, step 2 needs L009–L010. Null handling (L019, PS-D13 NOAA) is
  only needed by step 5, which stays planned. L019 keeps its weather dataset.
- **Links both ways.** Lesson ↔ practice, lesson example → Playground (with a link back), lesson/practice/project →
  dataset → lesson/project, lesson → the P01 step that uses it, project step → lessons, dataset and Playground.
- **Content gate** (`services/spark-runner/tests/test_items.py`, 8 tests): every item's reference passes every case;
  22 known-wrong answers fail where intended; recorded expected results equal independent plain-Python oracles; public
  files hold no hidden data; lesson examples reproduce their recorded output; concept-check answers proved on Spark.

Remaining gaps: L001–L009 aren't written, so L010 can't be published (its prerequisites must be first); P01 steps 3–5
aren't written; PS-D13's licence still needs review before P01 step 5.

## 8. Before expanding (proposed)

Owner review of the slice; then a 25-question pilot on D01, D02, D03, D06. Before any public execution: hardened
isolation (gVisor or microVMs), per-case isolation for Check, quotas and abuse limits, and a security review
(`PySpark Docs/instructions/ENGINE_AND_SECURITY_v4.md`).

## 9. Known issues

- **PY-L35-02 c2 (Python, existing):** its deliberately slow wrong answer can hit the 5 s run limit when the full
  vitest suite runs under heavy load; it passes on its own. No PySpark change touches Python content or the Python
  engine. Track as a load-sensitive test.
- Every Spark job pays container + JVM start (~5–6 s warm). The UI shows the state while it waits.
- Open licence reviews: PS-D03, PS-D04, PS-D05, PS-D07, PS-D09, PS-D10, PS-D13, PS-D14. Only PS-D13 blocks P01
  (step 5 only).
- The P01 step rail scrolls sideways when five long step titles don't fit, as Python's rail does.

## 10. Datasets, lessons 1–10 and the pilot (built 2026-10-23, local only)

- **All 15 datasets** (`services/spark-runner/datasets/d01…d15_*.py`, shared writer `dslib.py`): Runtime's own
  deterministic synthetic data, one per domain, lesson/practice editions (and a project edition except PS-D10), CSV,
  JSON Lines for nested data (clickstream events, IoT readings, encounters, application logs) and raw text for
  malformed-record lessons. 17 MB in total. Each keeps its domain; the handoff's real source is recorded as a later
  option after licence review. `tests/test_datasets.py`: deterministic, manifest hashes, snapshots, and real Spark reads
  every table of every edition with its declared schema and exact row counts.
- **Lessons 1–10** written and recorded on real Spark: 9 new lessons (L001–L009), 18 challenges (predict-the-output
  for concept lessons, DataFrame functions elsewhere), concept checks, review. L002 now runs (local-mode partitions and
  tasks), so its registry mode is interactive.
- **25-question pilot:** Q0046–Q0050 (filtering), Q0091–Q0095 (missing values), Q0126–Q0130 (semi/anti joins),
  Q0161–Q0165 (ranking windows), Q0181–Q0185 (nested JSON). Each has a reference, an independent oracle, 5–8 hidden
  cases and 3–5 known-wrong answers; `tests/test_items.py` runs them all on real Spark.
- **Prerequisite changes:** L037 now builds on L009 (selecting nested fields), L033 on L010 (top-N needs a filter).
- **Runner changes:** JSON Lines and text inputs; predict-the-output items; process limit 512 (JVM threads count);
  the Playground opens every built dataset.
- Authoring guide for further content: `docs/pyspark/authoring.md`.
