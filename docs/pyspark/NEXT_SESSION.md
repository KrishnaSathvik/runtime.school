# PySpark: start here (handoff for the next session)

Updated 2026-10-25 (sixth batch: L066–L090 and Q0326–Q0450 — every lesson and practice question written). Read this file first, then `docs/pyspark/authoring.md` (how to write content) and
`docs/pyspark/plan.md` (history and decisions). The owner's original material is in `PySpark Docs/` (v4 instructions win).

## 1. Rules from the owner (don't relitigate)

- **Local only.** No launch, no public execution, no deploy, no hosting talk, no commits or pushes, until all of PySpark
  is built and tested. Don't ask about it.
- **Real Apache Spark only.** Every output, expected result and example comes from the local runner. Nothing simulated.
  A feature that doesn't work yet is shown as unavailable, never faked.
- **The UI must match SQL and Python.** PySpark reuses their components (SQL's `Spec`, `Tables`, `ExpectedResult`;
  Python's TaskBar, Help, Md, `p2` styles). No status pills, versions, internal IDs or dataset codes on learner
  screens. Before saying UI work is done, screenshot SQL, Python and PySpark at 1440×900 and 390 px side by side.
- **Change only what's asked.** Offer extra changes in one line; don't do them.
- **Use multiple agents** for bulk content and report once when everything is verified.
- **Don't run the full test suites after every change.** Run the checks that cover what changed (tsc, eslint on touched
  files, the registry test, and the Spark gate on the new ids only — §7). Full suites only when asked.
- **Don't move lessons to other datasets to dodge licences.** All 15 datasets are our own synthetic data now.

## 2. What exists (all `tests-pass`, nothing `published`)

| Area | Built |
|---|---|
| Registry | 15 modules, 90 lessons, 450 question slots, 10 projects, 15 datasets, 6 tools (`src/content/pyspark/registry.json`) |
| Datasets | All 15, synthetic and deterministic (§5) |
| Lessons | 90: L001–L090 (all 15 modules), two challenges each |
| Practice | 450: Q0001–Q0450, five for every lesson. Q0001–Q0030 and a few per concept lesson in Modules 10–11 are predict items. Each lesson lists its practice ids |
| Projects | All 10 in the project workspace (§9, §10): 59 steps (5/5/5/6/5/6/6/7/7/7), every one `tests-pass` |
| Tools | All six have a tested local first version; exact scope and remaining experiment coverage in §11 |
| Engine | Local Docker runner, image `runtime-spark-runner:4.0.1-5` (default; tools v2 on the existing engine; `4.0.1-3` + the harness's `project` mode; `4.0.1-3` = `4.0.1-2` + plan evidence): Spark 4.0.1 / Python 3.11 / Java 17, `local[2]`, plus pandas/pyarrow/numpy, spark-avro, H2 + SQLite JDBC, delta-spark |

## 3. Run it

```
docker build -t runtime-spark-runner:4.0.1-5 services/spark-runner   # once, or after changing sandbox/ or requirements
PS_RUNNER_IMAGE=runtime-spark-runner:4.0.1-2 <any runner/test command>  # run against another image without changing code
npm run pyspark:runner        # dev bridge on 127.0.0.1:8787 (restart it after adding a dataset)
npm run dev:pyspark           # http://localhost:3000/pyspark
```

Tests (run them sequentially; Docker's VM is shared):

```
npx vitest run tests/pyspark-registry.test.ts                               # registry, prerequisites, statuses
python3 -I -m unittest discover -s services/spark-runner/tests -p test_items.py     # every item and lesson on Spark (~15 min)
python3 -I -m unittest discover -s services/spark-runner/tests -p test_datasets.py  # all datasets on Spark (~3 min)
python3 -I -m unittest discover -s services/spark-runner/tests -p test_runner.py    # sandbox, limits, bridge (~4 min)
python3 -I -m unittest discover -s services/spark-runner/tests -p test_projects.py  # Run/Check project on every defined project (~3 min)
npx tsc --noEmit -p tsconfig.json && npx vitest run                        # whole app (PY-L35-02 can time out under load; rerun alone)
```

## 4. How content is made (details in `authoring.md`)

**A lesson** = `src/content/pyspark/lessons/PS-Lnnn.json` (lede, objectives, dataset tables, text and runnable
examples, two challenges, 3-question concept check, review, practice links) + `PS-Lnnn.recorded.json` written by
`python3 services/spark-runner/run.py build-lesson PS-Lnnn`. Reference: `PS-L010.json`.

**A challenge or practice question** = an item:
- DataFrame item: public `src/content/pyspark/items/<id>.json` (prompt, rules, hints, starter, inputs, output columns,
  visible sample) + private `services/spark-runner/private/<id>/` (reference.py, oracle.py in plain Python,
  hidden.json + `hidden/<case>/<table>.csv|jsonl`, wrong.json with 3–5 wrong answers and the cases each must fail).
  `run.py build-expected <id>` records expected results and writes the public `<id>.expected.json`.
  Reference: `PS-Q0046`.
- Predict item (`"kind": "predict"`): a short program; the learner types what it prints. `build-expected` records the
  real output. Private folder holds only `wrong.json` (wrong predictions). Used for concept lessons (L001–L006).
  Works in lessons and on the practice page (`Prediction` in `features/pyspark/Practice.tsx`, modelled on Python's).

**Rules that matter:** use only concepts from the lesson's prerequisite closure (command in `authoring.md` §1); the five
practice roles (foundation, business, edge, debugging, integration) are five different problems; hidden cases cover
boundaries, NULLs, duplicates, empty tables and the practice edition; never print run-varying values (timings, app ids).

**After agents finish:** `node scripts/pyspark/build-index.mjs` (registers files with the app), set the new ids to
`tests-pass` in `registry.json` (statuses are edited in place; `node scripts/pyspark/import-catalog.mjs` keeps them),
add the lesson's practice ids to its `practice` list, then run the tests in §3 and a browser sweep.

**Prerequisites** live in `scripts/pyspark/import-catalog.mjs` (`PREREQS`, `RELATED`); re-run it after editing. If a
question needs a concept its lesson's closure lacks and the dependency is genuine, add the prerequisite there (it was
done for L033 ← L010, L037 ← L009, L013/L014 ← L009 (select/alias) and L025 ← L011 (orderBy for stable join output)).

## 5. Datasets (newest: v1.0.0, except PS-D01, PS-D06, PS-D12, PS-D13, PS-D15 v1.1.0; rows = lesson / practice / project)

Cross-dataset projects (P06 = D07+D13, P09 = D06+D12, P10 = D09+D15) follow `docs/pyspark/dataset-contracts.md`: shared
keys, time zones and overlapping windows. Only **project** editions join across datasets. The v1.1.0 versions of
D06/D12/D13/D15 (2026-10-26) changed only the project edition (lesson and practice files are byte-identical to 1.0.0,
and every lesson/item still pins 1.0.0); project steps for P06/P09/P10 should pin the versions the contract names.
Verified in plain Python: P10 — all 25 D15 device error events name a D09 project device and fall within 15 min of one of
its readings or inside its maintenance visit (4 HeartbeatMissed = D09's 4 visits that day, 10 OutOfRangeReading = its 10
glitches, covering all 13 false alerts); P06 — 5043 of 5200 project trips get an NYC-01 reading by the UTC rule, 157
fall in its 12 gap hours, NYC-01 equals D07 weather_enrichment on all 454 undamaged hours; P09 — 238/238 signed-in
campaign sessions match exactly one D12 landing click, all 32 of their orders attribute within the window and equal a
D12 conversion. Generators read each other's project editions in memory (d13 ← d07, d15 ← d09, d06 ↔ d12), so any run
order gives the same bytes; after changing d07/d09/d06/d12's project edition, rerun its partner too.

Registry `datasets[].tables` come from each dataset's newest manifest (`import-catalog.mjs` `builtTables`; 89 tables).
Generators: `services/spark-runner/datasets/dNN_*.py` on the shared writer `dslib.py`. Fixtures in
`services/spark-runner/fixtures/<id>/<version>/`; app snapshots in `src/content/pyspark/datasets/<id>.json`. Each
manifest's `rules` lists every deliberate data problem and which edition has it — read them before writing content.

| ID | Domain | Tables (rows) | Built for |
|---|---|---|---|
| PS-D01 | Retail Commerce | customers 6/300/400, products 8/20/20, orders 12/2006/3012, order_items 32/4961/7477 | L004, L007, L008, L010, L015, L020, L025, L030, L031, L039, L051, L056, P01. Project edition: bad statuses, negative/missing totals, missing/out-of-year dates, duplicates |
| PS-D02 | Banking & Payments | customers, accounts, merchants, transactions 14/2417/4637, transfers, ledger_entries, disputes | L014 (mcc_code text, "0742"), L017, L022, L026 (orphan + NULL account ids), L035, L062, L076, L083, P04 (balanced ledger, reversals, duplicate transfers) |
| PS-D03 | Employee & HR | departments, employees 9/104/221, salary_history, promotions, attendance, managers, employees_raw (text, `;` CSV) | L012, L021 (messy text), L027 (manager self-join, one cycle in project), L033 (salary ties), L043, P02 |
| PS-D04 | Healthcare Operations | patients, providers, pharmacies, encounters (jsonl: vitals struct, diagnosis_codes array), claims, medications, observations | L013, L023, L038, L065 (column added 2026-01-01), L073, L078, P07 |
| PS-D05 | Movies & Streaming | movies, users, ratings 15/2477/4704, tags, watch_sessions, subscriptions | L011 (ties), L036 (session gaps), L054, L060, L088, P05 (cold start, re-ratings) |
| PS-D06 | E-commerce Clickstream | page_views, searches, cart_events, checkout_events (all jsonl, nested), sessions | L037, L041, L067, L071, P09. event_time/arrival_time/batch for streaming; late events and duplicate deliveries. v1.1.0 project: 2026-03-05, users = D12 ids U00001–U00480, campaigns running that day, each campaign session has a D12 landing click |
| PS-D07 | Transportation & Taxi | trips 12/3000/5200, taxi_zones, fare_rules, drivers, weather_enrichment | L006, L016 (rounding cases), L045, L055, L057, L066, L080, L085, P06. Trip times are New York local time; every zone's weather is D13 NYC-01 (project, May 2026) |
| PS-D08 | Logistics & Supply Chain | warehouses, suppliers, inventory (warehouse_id+sku), purchase_orders (po_id+version), shipments, shipment_events (load_date, sequence), deliveries | L024, L028, L058, L063, L074, L077, L082, P08 (CDC: out of order, duplicates, late corrections) |
| PS-D09 | IoT & Sensors | devices, device_locations, sensor_readings (jsonl: payload struct, firmware struct), alerts, maintenance_events | L042, L053, L068, L070, L087, P10 (late, duplicate, glitch readings). Project devices DEV-001…018, 2026-05-11–05-13 UTC = D15 project's devices |
| PS-D10 | Financial Markets | securities, daily_prices 14/2515, trades, corporate_actions (splits), market_calendar | L034 (missing days, a split), L052, L089. No project edition |
| PS-D11 | Education & Learning | learners, courses, lessons, attempts 13/2347/5063, completions, assessments | L001, L003, L009, P03 |
| PS-D12 | Advertising & Marketing | campaigns (CMP-0001…0040), impressions, clicks, conversions, budgets, attribution_events | L032, L069, P09. v1.1.0 project adds the landing click (and order conversion) behind every D06 project campaign session |
| PS-D13 | Weather & Climate | stations (timezones), observations (NULL, NaN, -9999), forecasts, weather_alerts | L018 (DST, midnight), L019, L047, P06. v1.1.0 project: 2026-05-03–05-25; NYC-01 hourly = D07 project weather_enrichment (UTC, hour-ending), 12 gap hours inside the taxi period |
| PS-D14 | Enterprise CRM & ERP | accounts, contacts, invoices, invoice_lines, purchase_orders, suppliers, customer_cdc, product_cdc (op I/U/D, sequence) | L029, L046, L048, L061, L064, L075, L086, L090, P08 |
| PS-D15 | Application Logs | api_requests (skewed), application_logs (jsonl, MAP attributes), application_logs_raw (text, malformed lines), traces, deployments, service_metrics, error_events (device_id) | L002, L005, L040, L044, L049, L050, L059, L072, L079, L081, L084, P10. v1.1.0 project: 2026-05-12, device_id = D09 project devices (DEV-001…), HeartbeatMissed per D09 maintenance, OutOfRangeReading per D09 glitch; lesson/practice DEV-0001… are stand-alone |

In examples and Playground code, every table of the dataset's edition is a predefined variable with its own name,
`spark` is the session and `display(df, name)` shows a DataFrame. The runner reads CSV, JSON Lines (with the manifest's
nested DDL) and text (one `value` column).

## 6. What's next, in order

1. ~~Practice page support for predict items~~ — done.
2. ~~Lessons L001–L051~~ — done (L045–L048 recorded on `4.0.1-2`; L048 uses SQLite file databases — H2 upper-cases
   unquoted names unless the URL adds `;DATABASE_TO_LOWER=TRUE`).
3. ~~Practice for every lesson 1–65~~ — done (Q0236–Q0240 for L048 written in the fifth batch).
4. ~~Re-run all content on `4.0.1-2`~~ — done: full `test_items.py` (354 items, 51 lessons, ~95 min) and
   `test_datasets.py` pass on the default image.
   **Fifth batch (done):** L052–L065 + practice Q0256–Q0325, P01 steps 3–5, and a quality pass (below).
   **Sixth batch (done):** L066–L090 + practice Q0326–Q0450. Streaming (L067–L072, L087) runs on the existing runner
   with file streams and `availableNow` triggers — rules, helpers and budgets in `docs/pyspark/streaming.md` (verified
   by a spike). L085 teaches profiling with deterministic plan facts and prints no timings (no benchmark mode yet).
   **Next:** projects P02–P10, then tools (Spark SQL Lab, Query Plans, Compare Approaches; Pipeline/Streaming Lab).
   The fifth batch's new content was gated on its own ids only; run the full `test_items.py` before the next batch.
5. **Engine work before the rest** (each is a runner/image change, then tests):
   - ~~pandas, pyarrow, numpy~~ — in image `4.0.1-2` (numpy 2.2.6, pandas 2.2.3, pyarrow 19.0.1): pandas UDFs,
     mapInPandas/applyInPandas, Arrow `toPandas()`, `pyspark.ml` all run in the sandbox;
   - ~~delta-spark~~ — in `4.0.1-2` (delta-spark 4.0.1 + jars). The harness adds Delta's extension and catalog only when
     the learner's file contains the word "delta" (or job.json has `"delta": true`); other jobs get the same session as
     before. Each job's container has its own `/tmp`, so Delta paths under `/tmp` are private to the job;
   - ~~Avro and JDBC for L046/L048~~ — in `4.0.1-2`: spark-avro_2.13 4.0.1; H2 2.3.232 and SQLite JDBC 3.50.3.0 for
     file databases under `/tmp` (create one with Python's `sqlite3`, read/write with `spark.read.jdbc`; write to SQLite
     from one partition, `coalesce(1)`, or it can hit "database is locked");
   - also fixed in `4.0.1-2`: on `4.0.1-1` every **snappy** write (Parquet's default codec) fails, because snappy-java
     unpacks its native library into noexec `/tmp`. The image now ships snappy, zstd and sqlite native libraries in
     `/opt/native`. RocksDB (streaming state store) has the same issue; handle it with the streaming harness.
   - ~~make `4.0.1-2` the default~~ — done (`runner/sandbox.py` `IMAGE`); `test_runner.py` passes 28/28 on it.
   - The Delta switch is the whole word "delta" in the learner's code, so a variable named `delta` (likely in lag/lead
     code) also loads Delta's session settings. Output is the same; a stricter trigger would be cleaner.
   - a streaming harness (feed the `batch` column as micro-batches, checkpoints in `/tmp`, stop/restart) for Module 12,
     L087, P09, P10;
   - a benchmark mode (repeat runs, same data, report timings honestly) for L085 and P06.
   L079–L081 run spark-submit/subprocess jobs on the local runner and are interactive (L080/L081 `plans`).
6. **Modules 9–15** once their engine pieces exist.
7. **Projects:** ~~P01 steps 3–5~~ — done; P02–P10 as their modules
   are written. One project step = one item (`PS-Pnn-Mk`) on the project edition, like `PS-P01-M1`/`M2`.
8. **Tools:** Spark SQL Lab, Query Plans and Compare Approaches after Modules 5–6 and 10; Pipeline/Streaming Lab after
   the streaming harness.

## 7. Agent workflow that worked

- Give each agent a self-contained brief: point it at `authoring.md`, the reference files, the exact ids, the dataset
  snapshot/manifest to read, the closure command, "files you own", "one Spark job at a time", "don't run build-index or
  the full suites", and the report format. Examples of the briefs used are in this session's history; copy their shape.
- 3 lessons per agent, or 5–10 questions per agent. Up to ~6 agents at once is fine on this Mac. Batches two and three
  ran 4 content agents (10 lessons, 10 lessons, 25 questions, 25 questions), the third plus an engine agent; it worked.
  Lesson agents take ~1 hour, question agents ~30–40 min. Gating 110 new items/lessons takes ~45 min.
- Agents share the scratchpad: tell each to use its own subfolder.
- After agents finish, the coordinator runs build-index, statuses, practice links, the registry test (update its
  "written" list), tsc, the Spark gate on the new ids only, and a browser sweep at 1440 and 390 px (all new pages render,
  no overflow, no console errors). The gate-on-new-ids script narrows `test_items.py`'s `ITEMS`/`PREDICT`/`LESSONS` lists
  before `setUpModule()`; a headless Playwright script (repo's `node_modules/playwright`) does the sweep. Both were
  scratch files last time — recreate them (about 30 lines each).

## 8. Known pitfalls

- Spark jobs time out under heavy parallel load; rerun once before debugging.
- Restarting `npm run pyspark:runner` removes every running `ps-job-*` container ("removed N stale job containers"),
  including test and agent jobs. Don't restart it while a gate or agents are running.
- `test_runner.py` must run whole (its `setUpModule` starts 3 grading jobs; running only `Termination` sees their
  containers and fails). Don't run it while other agents run Spark jobs: `Termination` compares all `ps-job-*` containers, and
  `test_container_stops_itself_if_the_host_dies` calls `sandbox.sweep()`, which removes **every** job container,
  including other agents' running jobs.
- Plans (`explain`) can include internal file paths and `#n` ids; keep them only if identical across runs.
- Adaptive execution changes job and partition counts after shuffles; don't build predictions on them.
- `show()` output in predict items is too fiddly to type; predict short printed values instead.
- Fenced code inside lesson text renders as a read-only snippet (`Prose` in `features/pyspark/Lesson.tsx`).
- After adding a dataset, restart `npm run pyspark:runner` (the Playground list is read at start).
- `tests/python-v2-content.test.ts` PY-L35-02 is load-sensitive; it passes alone.
- Spark 4 runs with ANSI mode on: bad casts, divide by zero, bad dates and out-of-range array indexes raise; use
  `try_cast`, `try_divide`, `try_to_timestamp`. Content relies on this.
- Lesson markdown (`Md`) has no tables; use lists.
- SQL's `.rx-link` is `nowrap`; long PySpark lesson titles overflowed at 390 px until `pyspark.css` let it wrap in briefs.
- Prerequisites added this session (in `import-catalog.mjs`): L013/L014 ← L009, L025 ← L011, L031 ← L011,
  L033 ← L012, L036 ← L035; fifth batch: L064 ← L033 (latest change per key needs row_number), L037 ← L010, L043 ← L011. Remaining known gaps were designed around (see agents' notes: `F.lit` introduced where used;
  L039/L040 have no grouping or filtering; L043–L047 rely on file order of single-file reads instead of `orderBy`).
- **Visible samples must show the tested behaviour.** An item can have its own sample tables
  (`"visible": [{"id": "sample", "sample": true}]`, files in `services/spark-runner/samples/<id>/sample/`, ≤12 rows per
  table; authoring.md §3). The fifth batch audited every item whose wrong answers didn't list `sample` and gave 25 of
  them own samples (L020-C2, L023-C1, L025-C2, L030-C1, L048-C1, L051-C1, Q0053, Q0073, Q0102–Q0104, Q0108–Q0111,
  Q0113, Q0118, Q0120–Q0123, Q0148, Q0207, Q0247, Q0252). Shared dataset fixtures were not changed. The project page
  doesn't show own samples (project steps use the project edition). Audit script: run each item's wrong.json and see
  which pass `sample` (the fifth batch's was a scratch file, ~20 lines).
- Every stated rule must be graded. Q0229's root-element rule wasn't (fixed: the given partner import rejects a wrong
  root). The pandas-UDF/mapInPandas items (L052/L053 challenges, Q0256–Q0265) say "use a pandas UDF" but grade only
  rows; built-in solutions pass.
- `--pids-limit` stays 512 (processes + threads per job container; owner hasn't approved a raise). Spark creates
  thread pools per query whose idle threads live 60 s, ~13 threads a query (measured: 57 at start, 430 after 30
  queries), so a job with ~35+ queries in a minute hits "unable to create native thread". Keep items' query counts low.
- Technique items: `"technique": {"name": ..., "plan": [...]}` in an item spec makes `check` verify, from Spark's
  executed plan, that the API really ran (pandas UDF → `ArrowEvalPython`, mapInPandas → `MapInPandas`); image
  `4.0.1-3` reports plan operator names. Use it when the item teaches an API; for business results allow any approach.
- Project steps can have a small example: `"visible": [{"id": "example", "sample": true}, {"id": "project", ...}]`;
  the step page shows both, Run and Check name them.
- Grading cases share one container and one Spark session: Delta/JDBC/file items clear or overwrite their paths first
  (`shutil.rmtree(path, ignore_errors=True)` or `mode("overwrite")`), job-group helpers use unique names.
- A Delta write that changes nothing (no-op delete/update/merge, empty append) makes no version — design empty cases
  around it. Delta errors can include a per-run table id: compare error types only.
- Without joins in a lesson's closure, per-key lookups need `collect()` (L024) or a simpler design (L018 converts to one
  time zone). Check the closure before designing a challenge.

## 9. Project workspace (2026-10-26, PySpark Projects v2 phase 1: P01)

- **Definition:** `src/content/pyspark/projects/<id>.json` (public; `build-index.mjs` registers it as `PROJECT_FILES`,
  `content.ts` exposes it as `project.def`). It holds the task, skills, known data problems, a one-line summary per
  milestone, and `artifacts`: every function of the pipeline in order (`name`, `inputs`, the `step` that adds it,
  `about`, `deliverable`). The registry test checks it against the steps (every entry is an artifact, every artifact
  is a `def` in its step's starter/append, deliverables = registry deliverables). Steps stay items `PS-Pnn-Mk`.
- **Engine:** harness mode `project` (image `4.0.1-4`) calls each artifact's function in a fresh module on the project
  export and previews every table (50 rows + count); a missing or failing function is reported for that artifact
  only. `api.run_project` / `api.check_project` (= `check` of every written step, in order, on the same file; stops
  after a syntax error) and dev-bridge modes `project-run` / `project-check` (`{project, code}`); CLI
  `run.py project-run|project-check PS-P01 file.py`. P01: Run project ~20 s, Check project ~90 s.
- **UI** (`features/pyspark/Projects.tsx`, `ProjectResults.tsx`, `PsWorkbench` `project`/`panes`/`resetControl`):
  library cards (data, what you build, skills, progress); overview (task, outputs, steps with summaries, input tables
  + relationships + known problems, preparation as links, not gates); workspace = vertical milestones + task (34%) and
  the file (66%) with Run / Check step, Run project / Check project, tabs Result · Checks · Output · Artifacts ·
  Project checks, Clear (results only) and Reset project (asks first, restores the step 1 starter, clears passes);
  "Project data" sheet; after a failed check, links to the step's lesson and a smaller practice question; after a
  pass, the step's explanation. Phones: Task / Code / Results tabs and a step picker. Review page: the five questions
  (data in, transforms, problems, outputs, how it was checked), reference approach when complete, download the file.
  Entering a step adds the stubs of every earlier step missing from the file, so jumping ahead still runs.
- **Next (paste's build order, now done; see §10):** P04 Banking (several files, reconciliation grading), then a narrow P08 prototype
  (Delta state, replay); then P02, P03, P05–P07; then P09/P10 (streaming harness). A new project needs its
  definition file plus its step items; the workspace needs no per-project code unless it adds a view (pipeline
  graph, CDC timeline, event batches).


## 10. All ten projects (2026-10-27)

- Written by one agent per project from the brief in this session's scratchpad (`projects-brief.md`, P01 as the model);
  each step self-checked (reference passes, every wrong answer fails its must_fail cases, plain-Python oracle agrees).
  Coordinator gate: `test_projects.py` (Run project + Check project of every project's final reference) passes;
  registry test 15/15; tsc and eslint clean; page sweep of every project page at 1440/390 px (no overflow, no console
  errors); live Run project in the browser for P08 and P10.
- **Second dataset:** item and project `"also": [{id, version, tables}]` (runner `api._with_also`; UI `DatasetCards also`).
  P06 = D07 1.0.0 + D13 1.1.0 `observations`; P08 = D08 + D14 `accounts`, `customer_cdc`; P09 = D06 1.1.0 + D12 1.1.0
  `clicks`, `campaigns`, `conversions`; P10 = D09 1.0.0 + D15 1.1.0 `error_events`.
- **Renamed deliverables** (registry edited; `import-catalog.mjs` now keeps a written project's deliverables):
  P02 + `workforce_summary`; P07 `bronze_claims, rejected_claims, silver_claims, gold_payer_summary, quality_report`;
  P08 `historical_dimensions` → `account_history`.
- **Design decisions worth knowing:** P06's benchmark compares three strategies by plan facts only (join type, shuffle
  count, Parquet files/rows read), never timings. P08/P09/P10 recovery and replay are real Spark: P09/P10 crash a
  foreachBatch sink on a chosen micro-batch and restart from the checkpoint (a graceful stop + availableNow restart
  moves the watermark and changes results). P08's starter turns AQE off and broadcast to -1 (otherwise Run project
  hits the 512-thread limit). P07 has one Gold table (a second one exceeded threads/memory).
- **Machine limit:** with 4–6 Spark jobs at once the 7.75 GiB Docker VM OOM-kills job containers (`global_oom` in
  dmesg) and the runner reports it as the learner's MemoryLimit. Check project on P04/P07/P08/P10 needs a quiet
  machine. Check project takes 2–10 min per project.
- Steps' prerequisites list the lessons each step really uses; several projects' registry `prerequisites` (from the
  canonical CSV) miss lessons the steps need (joins L025/L026 in P05, P10; L035 unused by P03, L036 by P05).
- Not built: bespoke project views from the paste (pipeline graph, CDC timeline, batch timeline). Their evidence is
  in artifacts instead (P07 layer order, P08 before/after tables + `cdc_audit`, P09 `batch_timeline`, P10 `recovery_run`).


## 11. Tools v2 — local first version (2026-10-27)

All six tool registry entries are `tests-pass`, not published. The four new routes are `spark-sql`, `query-plans`,
`compare`, and `pipeline-streaming` under `/pyspark/tools/`; menu and command palette link them. Playground retains
old dataset draft keys, adds separate saved example tabs, sample context and edition-aware result identity. Datasets
searches all domains/tables, preserves native Spark types and shows only actual editions. Manifest nullability remains
unknown where it is not recorded; execution schemas report real Spark nullability. Nested values can be expanded.

Execution contracts and commands: `services/spark-runner/README.md`, “Local tools v2”. Runner code is the existing
sandbox plus `runner/tools.py`, `runner/tool_compare.py`, `runner/tool_scenarios.py` and sandbox tool modules. SQL has
fresh run-local catalog/warehouse state and a conservative command/function policy. Compare uses separate A/B
containers, complete bounded host-side multiset comparison and separately labeled task correctness. Plan capture is
real text/operator structure, without claiming runtime operator metrics or a stage/task graph. Benchmarks use generated
100K/1M fixtures, five alternating no-op-sink materializations, conservative verdicts and a FIFO exclusive runner lane.

Scenario catalog is public `src/content/pyspark/tool-catalog.json`. Initial batch scenarios: retail validation, banking
reporting, healthcare layers and Delta version history. Streaming: clickstream and IoT, each with two source feeds,
a no-op restart, a third-feed failure and checkpoint recovery. These use real Spark file streams, a batch-ID keyed
Parquet sink, real checkpoint commits and disposable replay. Editing an upstream stage invalidates the displayed
answer; running a later stage executes its upstream functions too. Lesson/practice/project/data links preserve context
and keep tool drafts separate from course/project progress. Project return links include the selected step.

Not the entire v2 experiment backlog: advanced CDC/MERGE/SCD2 packs, event-time window/state-store/RocksDB panels,
full Spark operator runtime metrics and additional benchmark topics remain follow-up work. No 10M mode or persistent
session pool. Unseeded randomness and wall-clock operations in edited code can change replay results. Nothing is a
production/public execution security boundary. No commits, pushes, deployment or account/service provisioning.

Focused evidence: SQL/Python tool+client regression tests, tool contracts/registry, TypeScript and touched-file ESLint;
`test_tools.py` policy and real-Spark cases (SQL scripts, every domain example, comparison semantics/task oracle,
all curated comparisons, pipelines/Delta, both stream recoveries and 100K/1M benchmarks). Browser reference captures
at 1440×900 and 390×900 use installed Playwright, approved after Browser reported no connected browser. Screenshots
and temporary browser scripts live in `/private/tmp/pyspark-tools-evidence` and `/private/tmp`, not the repo.

The isolated review server uses `http://127.0.0.1:3101` and runner `http://127.0.0.1:8788` with matching allowed
origins. Existing development servers were not restarted. Restart a bridge after host-side Python changes when it is
quiet. `PS_RUNNER_SKIP_SWEEP=1` avoids sweeping other sessions at startup; shutdown now removes only that process's
active containers. Default networking, CPU/memory/thread/output/scratch limits stay in place. Private references are
explicitly git-ignored and `/services/` remains excluded from Vercel uploads. No encrypted private store was provisioned.
