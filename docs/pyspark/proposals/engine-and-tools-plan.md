# Proposal: remaining PySpark engine and tools work (plan only)

Status: **proposed, nothing here is built.** Written 2026-10-26 from a read of `docs/pyspark/NEXT_SESSION.md`,
`plan.md`, `streaming.md`, the v4 instructions (`ENGINE_AND_SECURITY_v4.md`, `TOOLS_AND_LEARNER_FLOW_v4.md`,
`IMPLEMENTATION_PLAN_AND_GATES.md`), `PySpark Docs/Pysaprk Engine`, `services/spark-runner/` (Dockerfile,
`sandbox/harness.py`, `runner/{sandbox,api,grader}.py`, `dev_server.py`, `tests/`), `src/engine/pyspark/client.ts`,
`src/features/pyspark/`, `src/app/pyspark/tools/`, `.gitignore`, `.vercelignore`. Nothing was run.

Assumed done, by a separate workstream: hidden cases run in a container of their own with sanitized feedback, and
technique checks also inspect the learner's source statically. This plan doesn't redo that work. It does plan for its
cost: **a Check now starts two containers**, and each pays container start plus JVM start (5–6 s idle, 3–13 s under load).

Local only. Effort is in focused agent-days and includes tests. Run the targeted tests only (tsc, eslint on touched
files, the registry test, the relevant `test_runner.py` class or the Spark gate on the ids that changed), never the full
suites after each change.

---

## 0. Ground rules for every item

- Every number, plan and row shown comes from a real Spark run in this session's job. Recorded output is labelled as recorded.
- A tool or mode stays "Not available yet" in `PYSPARK_TOOLS` (`src/features/rt/Shell.tsx`) and `planned` in
  `registry.json` until its acceptance tests pass. A capability joins the `live` set only through its tests.
- New job modes go through one path: `api.py` builds `job.json`, `sandbox.execute` runs it, `harness.py` does the work.
  Never add a second engine.
- Evidence gets a provenance tag (§E8). Anything learner code could have changed is tagged `in-run`.

---

## E1. Container scheduler: count containers, not jobs, and add an exclusive lane

**Goal.** `dev_server.py` allows 2 running jobs and 8 waiting. With two containers per Check, two Checks can start
four 4 GB containers on an 8 GB Docker VM. Benchmarks also need a machine with nothing else running.

**Design.** Move the semaphore into `runner/sandbox.py`: one `CONTAINERS = threading.BoundedSemaphore(2)` (env
`PS_MAX_CONTAINERS`), taken in `execute()` and released in its `finally`. Add `exclusive()`, a context manager that
takes every slot (a writer lock) and is used by benchmark jobs. `dev_server.py` keeps its job queue, but the job
semaphore becomes a waiting limit only. Report a `queued-behind` state so the UI can say "waiting for another run".
Files: `runner/sandbox.py`, `dev_server.py`, `src/engine/pyspark/client.ts` (new state), `PsWorkbench.tsx`
(state label).

**Dependencies.** None. Do it first.
**Risks.** Starvation: a stream of short jobs can block an exclusive benchmark. Use a fair lock in which a waiting
exclusive job blocks new acquires. A deadlock can happen if a job holds one slot while waiting for another. A Check
runs its containers one after another (E0), so it never holds two slots at once.
**Tests.** `test_runner.py` `DevBridge`: 3 concurrent Checks never exceed 2 live `ps-job-*` containers; an exclusive
job waits for running ones and blocks new ones; a cancel releases the slot.
**Effort.** 1 day.

## E0. Time budget for two-container Checks

**Goal.** Make Check latency and timeouts honest now that a Check runs two containers.

**Design.** Run the containers one after another: the visible container first, then the hidden container. Doing them in
parallel would need 8 GB with two 4 GB containers. The budget is now per container:
`limits.run_timeout_s` (visible, default 45) and `check_timeout_s` (hidden, default 90). Streaming items with
`check_timeout_s: 150` need re-measuring. Their old figure covered all cases in one JVM, and each container now
pays its own JVM warm-up (11–42 s for the first case). Add `limits.visible_timeout_s` so streaming items can set it
(about 90 s). Optional fail-fast: if the visible case crashes with a syntax or contract error, skip the hidden
container and report "fix the sample first". This saves a container start on the most common failure. Report
`timings.containers: [{role, wall_ms, spark_start_ms}]` and show "Checking hidden cases…" as a state of its own.
Files: `runner/api.py` (`check`, `_limits`), `client.ts`, `PsWorkbench.tsx`, `docs/pyspark/streaming.md` §3 and
`authoring.md` (budgets).

**Dependencies.** E1 and the grading workstream.
**Risks.** The full Spark gate (`test_items.py`, about 95 min) grows by one container start per item, so expect about
120–130 min. Under load, streaming items can time out in the hidden container.
**Tests.** Re-gate the streaming items (L067–L072, L087 challenges and their practice) and the 5 slowest items. Check
that no item comes within 20% of its timeout at a load average above 10.
**Effort.** 1 day, plus a gate run.

## E2. Strict Delta trigger

**Goal.** A variable named `delta` (common in lag/lead code) shouldn't switch on Delta's session settings.

**Design.** Replace `DELTA_WORD` in `harness.py` with a token scan using Python's `tokenize` on the source. Delta is
on when any of these holds: a `NAME` sequence `import delta` or `from delta`; a `STRING` token whose value, lowercased
and stripped, is `delta`; a string containing `using delta` or `delta.\`` (SQL); a `NAME` `DeltaTable`. Comments
and plain identifiers never count. Trusted job flags still win: `"delta": true` from an item spec or lesson. Items and
lessons that use Delta should set the flag explicitly. Add a Delta switch to the Playground UI only if the scan proves
insufficient.
Files: `sandbox/harness.py`. Add a pure function `uses_delta(job, source)` with unit tests that need no Docker.
**Dependencies.** None. This needs an image bump, so ship it with E4.
**Risks.** False negatives, such as `fmt = "del" + "ta"`. These are harmless: Delta calls then fail with a clear error,
and the learner can set the format literally.
**Tests.** New `tests/test_harness_unit.py`. `delta = F.col("x") - F.lag("x")`, `# delta` and `deltas` → off.
`format("delta")`, `USING DELTA`, `from delta.tables import DeltaTable` and `` delta.`/tmp/t` `` → on. Then
`Extensions.test_delta_*` and the Delta lessons (L073–L078 range) still record identically.
**Effort.** 0.5 day.

## E3. Per-case isolation inside a container

**Goal.** Cases in a container share one SparkSession, so a case can change the Spark conf, temp views, cache, UDF
registrations or active streams that a later case sees.

**Design.** At the start of each case in `run_cases`, give the case `spark.newSession()`. A new session isolates SQL
conf, temp views and registered functions, and shares the SparkContext. Bind it as `module.spark`. After each case:
- stop `spark.streams.active`;
- `spark.catalog.clearCache()`;
- unpersist RDDs from `sc.getPersistentRDDs()`;
- reset `sparkContext` local properties (job group, description);
- remove `/tmp/work`, a per-case scratch directory handed to the learner as `WORK`. Leave `/tmp/spark`, the
  checkpoints of other cases and Ivy alone.

Snapshot `builtins.__dict__` keys and restore them; drop `sys.modules` entries added by the learner's module. Things
that stay shared are documented, not hidden: the JVM, static Java state and anything done through `_jvm`. For
stateful items (Delta, streaming), the hidden container already separates hidden from visible. Full one-container-per-case
stays an opt-in item flag `"isolate_cases": true`, for items whose wrong answers exploit shared state. It costs one
JVM start per case.
Files: `sandbox/harness.py`, `runner/api.py` (flag), `authoring.md` (the "clear your paths" rule becomes a
recommendation).

**Dependencies.** None. Bundle it with the E4 image.
**Risks.** `newSession()` doesn't carry runtime conf set by the harness (the Delta extension is a static conf, which is
fine). `spark.sql.shuffle.partitions` must be re-set per session. Streaming checkpoints created with one session's
partition count stay valid because each case clears its checkpoint. Some recorded lesson outputs print
`spark.conf.get(...)` values, so re-record and compare.
**Tests.** `test_runner.py` gets a new class `CaseIsolation`. Case 1 sets a conf, creates a temp view, caches a table
and leaves a stream running; case 2 sees none of it. Then a full `test_items.py` gate, because every item passes
through this path.
**Effort.** 2 days, plus a full gate.

## E4. Image `4.0.1-4`: RocksDB native library and protobuf

**Goal.** RocksDB state store and `transformWithStateInPandas` work under a noexec `/tmp` (streaming.md §2, §7).

**Design.** In the `Dockerfile`, extend the `/opt/native` extraction step:
- take `librocksdbjni-linux-aarch64.so` (arm64) or `librocksdbjni-linux64.so` (x86_64), chosen by `platform.machine()`,
  from `pyspark/jars/rocksdbjni-9.8.4.jar`;
- add `-Djava.library.path=/opt/native` to `JAVA_TOOL_OPTIONS`;
- add `protobuf==5.29.5` (pure-Python wheel, pinned by hash) to `requirements-extras.txt`, and let `pip check` prove
  the set.

Bump `IMAGE` in `runner/sandbox.py` and the tag in the Dockerfile comment and README. Ship E2 and E3 in the same
image. Optionally, add `limits.example_timeout_s` read by `build_lesson` and the lesson Run (streaming.md §7.3).

**Dependencies.** None. It blocks E5's RocksDB scenarios and any lesson that teaches transformWithState.
**Risks.** The RocksDB loader picks its library by name. Verify that it loads from `java.library.path` and doesn't
extract to `/tmp`. The spike proved this only with a mount. The x86 build is untested. The image grows by about 10 MB.
**Tests.** `Extensions`: a RocksDB stateful `groupBy` stream (`spark.sql.streaming.stateStore.providerClass` =
RocksDB provider) and a `transformWithStateInPandas` example. Both must give the same rows as the HDFS-state/
`applyInPandasWithState` version and peak under 300 pids. `test_image_is_pinned` must still pass, and `test_runner.py`
must pass whole.
**Effort.** 1 day.

## E5. Streaming scenario harness

**Goal.** Lessons now use file streams with `availableNow`, and the only trusted streaming evidence is
`StreamEvidence`, which counts queries, batches and rows. P09, P10, L087's projects and the Pipeline & Streaming Lab
need more: trusted micro-batch feeding, replay, checkpoint stop/restart, failure injection and state inspection,
graded step by step.

**Design.** Add a new harness mode, `stream`, and a learner contract:
`def build(spark, source, schema) -> DataStreamWriter`. The learner returns the writer without starting it. The
harness owns the paths and passes them in: `/tmp/s/<case>/in`, `/ck` and `/out`. `job.json` carries a scenario that
lists steps:
- `feed <batch values>`: the harness writes files with the dot-name-then-rename pattern and sets their mtimes;
- `run`: the harness calls `build()`, forces `option("checkpointLocation", ck)` and `trigger(availableNow=True)`,
  starts the query, waits for it to finish, and with `maxFilesPerTrigger=1` gets one micro-batch per file;
- `restart`: the same as run, against the same checkpoint;
- `fail-once`: wrap a `foreachBatch` sink and raise on batch k.

Batch values come from the dataset's `batch` column, or from a derived one (streaming.md §3).

After each step, trusted code records a snapshot:
- sink rows (a memory table or Delta path, read by the harness and sorted);
- committed batch ids, listed from `ck/commits`;
- the stable progress fields from streaming.md §1;
- state rows, from `spark.read.format("state-metadata")` and `format("statestore")`.

The grader compares the snapshots with expected snapshots recorded from the reference by `build-expected`. That
gives replay checks: a restart with no new data changes nothing; after a failure, the restart re-runs the failed batch
and the sink holds no duplicates, or says that the sink is at-least-once. Feedback names the step, never the hidden
rows.

Files: `sandbox/harness.py` (`run_stream`), `runner/api.py` (`_job` with `scenario`, `check`), a new
`runner/grader.py` function `grade_stream`, item schema notes in `authoring.md`, and `test_items.py` (scenario items).

**Dependencies.** E0, E3, E9. E4 for RocksDB scenarios only.
**Risks.**
- Budget: a 5-step scenario costs about 4–12 s per run step. Keep each hidden container to 3 scenarios or fewer, and
  measure.
- Learner code still runs in the same process, so snapshots are tagged `in-run`. Grading compares against expected
  data the learner never sees, so forging buys nothing.
- `processingTime` triggers stay banned.
- `current_timestamp` must not be used.

**Tests.** `test_runner.py` `Streaming`: a 3-feed, restart, no-op-restart scenario gives identical snapshots on 3 runs;
`fail-once` shows the re-run batch; a wrong answer (no watermark, or a checkpoint ignored) fails the intended step;
peak pids under 350. Pilot one P09 step end to end.
**Effort.** 4–5 days.

## E6. Benchmark dataset editions (100K → 1M → 10M rows)

**Goal.** Give data enough volume that timing differences are real for D07 (taxi trips), D08 (shipment events), D15
(api_requests) and later D06 (page_views), with engineered skew.

**Design.**
- **Generation.** Generate inside Spark, not with `dslib`'s Python rows, which are too slow at 10M. Build each table
  from `spark.range(n)` with columns derived from `xxhash64(id, seed)`, so a given row's values depend only on its id
  and the seed.
- **Skew** (deterministic):
  - D15: about 55% of requests hit `GET /v1/catalog/items`, matching the practice edition's rule;
  - D07: about 35% of pickups are in the airport zones;
  - D08: one hot warehouse;
  - D06: one hot session.
- **Dimension tables** (zones, warehouses) stay the small lesson or practice ones, so broadcast-vs-shuffle comparisons
  are meaningful.
- **Format.** Parquet with snappy, which works since `4.0.1-2`.
- **Storage.** Generate on demand, never commit. Run `python3 services/spark-runner/run.py build-bench PS-D07 1m`
  inside the runner image with a writable output mount, a trusted build step that runs no learner code. Output goes
  to a git-ignored cache, `services/spark-runner/.bench/<id>/<version>/<size>/`. The manifest records the seed, row
  counts, a per-column `sum(xxhash64)` checksum and the generator's Spark version. These are small and committed in
  the dataset manifest as `benchmark` editions with `"generated": true`.
- **Use.** `api.py` refuses a benchmark edition whose cache is missing or fails its checksum.

**Size budget** (estimates to measure, not promises):

| Rows | Parquet size | Notes |
|---|---|---|
| 100K | ~5–10 MB | Fits the 45 s limit |
| 1M | ~50–80 MB | |
| 10M | ~0.5–0.8 GB | See below |

10M on `local[2]` with 4 GB and no swap is risky. Shuffle spill goes to `/tmp`, a 512 MB tmpfs that counts against the
memory limit. Ship 100K and 1M first. Treat 10M as a separate decision: it needs a measured run and probably a
benchmark tier (more `/tmp`, longer timeout, the exclusive lane), on an 8 GB Docker VM that can't hold anything else
alongside it.

Files: `datasets/bench.py` (new), `run.py` (command), the four dataset manifests, `src/content/pyspark/datasets/*.json`
(an edition listed as generated, with rows), `.gitignore` (the `.bench/` cache, recommendation only),
`tests/test_datasets.py`.

**Dependencies.** None for generation. E1 for building under the exclusive lane.
**Risks.** `xxhash64` output must be stable across Spark versions, so pin the checksum to the generator version and
regenerate on image change. Generation needs a writable mount, which is a trusted path only. Never offer it to learner
jobs.
**Tests.** Generate twice and get identical checksums. The declared skew share is within ±1%. Real Spark reads each
size with the declared schema.
**Effort.** 3 days (100K and 1M), plus a 10M spike of 1 day.

## E7. Benchmark mode

**Goal.** Give L085, P06, Compare Approaches and the Performance lab honest measured timings: repeated runs on the same
data with environment details, and never a promised speedup.

**Design.** Add job mode `benchmark`, run under `sandbox.exclusive()`. The job carries 1–2 approaches, each a function
`approach(tables) -> DataFrame`, plus `reps` (default 5, max 7) and the edition.

1. **Correctness first.** Each approach's result gets a canonical fingerprint: schema, count, and the sum of
   `xxhash64` over all columns. Different fingerprints stop the run with "the approaches return different results",
   and no timings are shown.
2. **Warm-up.** One untimed run per approach.
3. **Timed runs.** Runs alternate A, B, A, B. Each one materializes with `df.write.format("noop").mode("overwrite").save()`,
   so the full plan executes and nothing is collected. `clearCache` and unpersist run between reps.
4. **Report.** Every timing, plus median, min and max per approach. Also report environment facts:
   - image tag, Spark, Java and Python versions;
   - `local[2]`, cpus, memory, shuffle partitions, AQE on or off;
   - edition and rows;
   - `/proc/loadavg` from inside the VM at start and end;
   - the number of other `ps-job-*` containers (always 0 under the exclusive lane, reported anyway);
   - pids peak (`/sys/fs/cgroup/pids.peak`) and memory peak.
5. **Plan facts per approach** (from E8): Exchange count, join strategy, numOutputRows and spill.

The verdict is rule-based and conservative:

| Condition | Wording |
|---|---|
| Every rep of A is slower than every rep of B, and the median ratio is ≥ 1.5 | "B was faster in every run here (median ×N)" |
| Anything else | "No reliable difference on this run" |

Never say "will be faster", and never extrapolate to clusters. Learner `print` timings are just stdout.

For trusted timing boundaries, the harness emits `@@ps rep <approach> <i> start|end` markers and the host stamps them
on receipt. Host stamps, not in-process timers, are what the UI reports for learner-supplied code (E8 provenance).

Files: `sandbox/harness.py` (`run_benchmark`), `runner/api.py` (`benchmark()`), `dev_server.py` (mode, exclusive lane,
both slots), `client.ts` (types), and later the tool UI.

**Dependencies.** E1, E6, E8, E9.
**Risks.**
- Noise on a shared Mac. Mitigate with the exclusive lane, alternation, and the "no reliable difference" default.
- Threads: about 13 threads per query that idle for 60 s, and 2 approaches × (1 + 5) reps is 12+ queries. That lands
  near streaming.md's measured 320–368 and below 512, but measure it.
- Time: at 1M rows a rep may take 2–10 s, so the budget is about 120 s with its own `benchmark` limit.

**Tests.**
- A UDF-vs-built-in pair on the D07 1M edition shows "faster" on 5 of 5 invocations.
- A cached-vs-uncached ~1.2× pair shows "no reliable difference".
- Unequal approaches are refused.
- An exclusive job never overlaps another container.

**Effort.** 3–4 days.

## E8. Plan and metrics capture with honest provenance

**Goal.** Query-plan evidence is now operator names from `plan_nodes()`, which runs in the same Python process as
learner code. Learner code can monkeypatch `__main__.plan_nodes`, wrap `DataFrame`, or print a fake `@@ps result`
line, so in-process evidence is forgeable. The plan tool needs output the page can stand behind.

**Design.** There are three levels, and each result carries `provenance`:
1. **`trusted`: no learner Python ran in the container.**
   - SQL Lab and the plan tool's SQL mode run in a container where the harness executes only SQL text:
     `EXPLAIN FORMATTED|COST|EXTENDED <stmt>`, and after an action the executed plan with SQL metrics.
   - Authored comparisons and lesson profiling examples run our reference code only.
   - SQL text can call `reflect`/`java_method` on static Java methods, but it can't reach the Python harness. Disable
     both through `spark.sql.legacy...` and a function deny-list checked on the analyzed plan, and test that.
2. **`in-run`: computed by the harness in a process where learner Python ran.**
   - The plan of a DataFrame the learner built goes in a panel labelled "Spark's plan for your code, from this run".
     It's honest to the learner, who can only fool themselves.
   - It's never used to rank, publish or claim anything.
3. **`graded`: in-run evidence used only against data the learner can't see.**
   - Expected hidden results, plus the grading workstream's static source check.
   - The plan check stays as corroboration only.

Capture walks `executedPlan` through `AdaptiveSparkPlan.executedPlan()` and `QueryStage.plan()`, as in streaming.md §8.
It produces a tree of `{name, metrics: {numOutputRows, dataSize, spillSize, shuffle bytes}}`, an Exchange count,
the join strategy, and the AQE initial→final plans. Plans get normalized before display (`#123` ids removed,
`/data/<case>/x.csv` → `x`, `/tmp/...` → `<scratch>`) and are shown only when a normalized plan is stable across
runs.

Files: `sandbox/harness.py` (`plan_facts`, a `sql` mode), `runner/api.py`, the `PsPlan` type in `client.ts`.
**Dependencies.** None. It feeds E7, T3, T4 and T5.
**Risks.** Normalization that misses a run-varying token breaks stability. Test each plan on 3 runs. SQL-only mode has
to refuse Python-only paths cleanly.
**Tests.**
- Plans for 5 canonical queries on D01/D07 are identical across 3 runs after normalization.
- A learner script that patches `plan_nodes` still gets `in-run` provenance and never `trusted`.
- `reflect()` is refused in SQL mode.

**Effort.** 2–3 days.

## E9. The 512-pid ceiling

**Goal.** Know each mode's thread peak and stay within 512, which the owner hasn't approved raising.

**Design.**
- Add `pids_peak` to every result from `/sys/fs/cgroup/pids.peak`, alongside `memory_peak_bytes`.
- Try harness confs that shrink idle pools: `spark.rpc.netty.dispatcher.numThreads=2`,
  `spark.shuffle.io.serverThreads=2`, `spark.shuffle.io.clientThreads=2` and `spark.rpc.io.serverThreads=2`. Measure
  each with `peak.py`, and keep a setting only if outputs and timings are unchanged.
- Give mode budgets in `authoring.md`:

  | Mode | Peak pids |
  |---|---|
  | Plain | ≤ 150 |
  | Streaming | ≤ 350 |
  | Benchmark | ≤ 400 |

- Turn `peak.py` into `run.py peak <id>`.
- If benchmark or streaming can't fit, write up a per-mode limit (e.g. 768 for `benchmark` only) as an owner
  decision. Don't apply it.

**Dependencies.** None. Do it before E5 and E7.
**Tests.** `test_runner.py` `test_process_limit` still passes. A 30-query job no longer hits "unable to create native
thread" if the tuning works; otherwise the documented budget holds.
**Effort.** 1–1.5 days.

---

## T-tools

All four new tools reuse `PsWorkbench`, `PyEditor`, SQL's `Tables` and `ExpectedResult` styling, and the Playground's
dataset/edition picker. Each gets a route under `src/app/pyspark/tools/<name>/page.tsx` behind the existing flag, a
screen in `src/features/pyspark/`, a mode in `client.ts` and `dev_server.py`, a `PYSPARK_TOOLS` entry flip in
`Shell.tsx`, and a registry status change. The registry still says `planned` for PS-T01 Playground and PS-T02
Datasets, which work. Set both to `tests-pass` now (`registry.json`, update the expectations in
`tests/pyspark-registry.test.ts`), 0.25 day.

### T3. Spark SQL Lab (PS-T03, capability `sql`)

- **Goal.** Write Spark SQL against the dataset's tables as temp views, see results, and see the equivalent DataFrame
  code side by side.
- **Design.**
  - Mode `sql`: the harness registers every table of the chosen edition as a temp view. It splits the editor text into
    statements with a quote-aware splitter, runs each with `spark.sql`, and returns up to 5 bounded frames, the same
    shape as Playground `frames`.
  - No learner Python runs, so `EXPLAIN` here is `trusted` (E8).
  - A second tab, "As DataFrame code", is a Playground editor on the same dataset and edition (script mode). It doesn't
    auto-translate SQL, because a translation can't be guaranteed correct.
  - Files: `harness.py`, `api.py` (`sql_lab()`), `dev_server.py`, `client.ts`, `SqlLab.tsx`, the route,
    `Shell.tsx`, `registry.json`.
- **Dependencies.** E8 (SQL mode and function deny-list).
- **Risks.** DDL that writes tables goes to `/tmp/spark-warehouse` and is private to the job. Results from multiple
  statements must stay bounded.
- **Acceptance.**
  - A join plus aggregate on D01 equals the Playground DataFrame result.
  - A syntax error points at the statement and line.
  - `reflect` is refused.
  - Screenshot at 1440 and 390 px next to the SQL track.
- **Effort.** 3 days.

### T4. Query Plans & Performance (PS-T04, capability `plans`, `benchmark` for the second half)

- **Goal.** Show Spark's real plan (logical, optimized, physical, AQE final) with metrics, and reason about shuffles and
  joins. Optionally run a controlled benchmark.
- **Design.**
  - **Phase A (plans).** Two inputs, SQL (`trusted`) and DataFrame code (`in-run`, labelled). The output is the raw
    `explain` text plus a tree from E8 with stage and Exchange markers and per-operator rows.
  - **Phase B (performance).** A "Measure" button runs E7 on the benchmark edition (D07, D08, D15) and shows reps,
    medians, environment and the conservative verdict.
  - Copy says local mode on 2 cores, not a cluster.
- **Dependencies.** E8 (A). E6, E7, E9 (B). T3's SQL mode.
- **Risks.** Plans can be long, so collapse subtrees. Learners may read "faster here" as a general rule, so the copy
  must say this run, this machine.
- **Acceptance.**
  - Broadcast vs shuffle join on D07 shows `BroadcastHashJoin` vs `SortMergeJoin` and the Exchange counts.
  - The 3-run plan is stable.
  - Phase B passes E7's tests through the UI.
- **Effort.** A: 3 days. B: 2 days.

### T5. Compare Approaches (PS-T05)

- **Goal.** Two valid strategies on the same data. Correctness is checked first, then repeated measurements.
- **Design.**
  - Two editors, each defining `approach(<tables>)`. One `benchmark` job runs both, alternating in one container under
    the exclusive lane. Alternating gives a fairer comparison than two containers competing for 2 CPUs, and E3's
    per-rep reset limits carry-over.
  - Curated pairs (UDF vs built-in, broadcast vs shuffle, cache vs none, repartition vs coalesce) are authored
    reference code, so their numbers are `trusted`. A learner's own pairs are `in-run`.
  - Results that don't match block timing.
- **Dependencies.** E7 (and so E1, E6, E8, E9).
- **Risks.** Most learner pairs will show "no reliable difference". That is the honest answer and the copy should say so.
- **Acceptance.**
  - Curated UDF vs built-in on D07 1M gives "faster in every run" on 5 of 5 tool runs.
  - Non-equal results are refused.
  - Cancel kills the job.
- **Effort.** 3 days.

### T6. Pipeline & Streaming Lab (PS-T06, capabilities `streaming`, `delta`)

- **Goal.** Step through a stream or CDC pipeline: feed batch k, stop, restart, inject a failure. See sink tables,
  committed batches, watermark and state rows at every step. For Delta CDC, see MERGE results, `DESCRIBE HISTORY` and
  versions.
- **Design.**
  - The lab is stateless on the server. Each click replays the scenario from step 0 to step k in one fresh container
    (E5), which keeps "only `/tmp` is writable" and needs no persisted per-learner volume. Scenarios are capped at
    about 6 steps, so replay cost stays bounded.
  - Datasets: D06, D09, D12, D15 (stream), and D08, D14 (CDC).
- **Dependencies.** E5. E4 for RocksDB/transformWithState scenarios. E0 budgets.
- **Risks.** Replay latency grows with k, at about 35–50 s for 6 steps under load. Show the "replaying steps 1–k"
  state. A persistent session container would be faster but needs an idle-timeout design and owner sign-off. Leave it
  out.
- **Acceptance.**
  - A D06 scenario gives identical snapshots on 3 replays.
  - Restart without new data is a no-op.
  - `fail-once` shows the re-run batch.
  - A Delta MERGE pipeline shows versions 0..n.
  - 1440 and 390 px sweep.
- **Effort.** 5 days.

---

## Dependency graph and order

```
E1 scheduler ──► E0 check budgets ──► (re-gate streaming items)
E2 delta trigger ─┐
E3 case isolation ┼─► E4 image 4.0.1-4 ──► E5 streaming harness ──► T6 Pipeline & Streaming Lab
                  │                          ▲
E9 pids budget ───┴──────────────────────────┤
                                             ▼
E8 plan capture + provenance ──► T3 SQL Lab ──► T4-A plans
E6 benchmark editions ──► E7 benchmark mode ──► T4-B performance, T5 Compare Approaches
         (E7 also needs E1, E8, E9)
Registry fix for T01/T02: any time.
```

Suggested sessions:
1. E1, E0, E9, and the registry fix.
2. E2 + E3 + E4 as one image, then a full gate.
3. E8, then T3.
4. E6, E7, then T4 (both phases) and T5.
5. E5, then T6, then P09/P10 steps on it.

About 40–45 agent-days in total. The streaming and benchmark tracks can run in parallel only if they don't share the
Docker VM during measurement: benchmark measurements need the exclusive lane, and `test_runner.py` must not run
alongside other Spark work (NEXT_SESSION §8).

---

## Must never be shown as working until built

- Spark SQL Lab, Query Plans & Performance, Compare Approaches, Pipeline & Streaming Lab: they stay "Not available
  yet", unlinked, in `PYSPARK_TOOLS`, and `planned` in the registry until each one's acceptance tests pass.
- Any timing, speedup, "faster" or "slower" claim, or performance number, outside a live E7 run in that session. That
  includes L085 and P06 text, which keep to deterministic plan facts.
- RocksDB state store and `transformWithStateInPandas`. They stay text-only until `4.0.1-4` passes E4.
- Stop/restart, replay, exactly-once and failure-recovery grading, until E5 grades them. Today only "a stream ran"
  (`StreamEvidence`) is evidence.
- Plans or metrics from learner code presented as `trusted`, or used for grading on their own.
- 10M-row editions, until a measured run fits the limits.
- Per-case isolation. Until E3, docs and UI must keep saying cases in a container share one session.
- Anything "multi-node", "cluster" or "production-like". This is `local[2]` in one container. Tier C doesn't exist.

---

## Production prerequisites (not planned here, local-only for now)

Before any public execution (`plan.md` §8, `ENGINE_AND_SECURITY_v4.md`):

- **API.** An authenticated execution API (FastAPI or similar) replacing `dev_server.py`. The trusted
  question/dataset/policy resolver stays server-side. Add per-user rate limits, one active job per learner, and quotas
  on Check, benchmark and streaming time.
- **Queue and storage.** A durable queue and scheduler (Redis or Postgres-backed) with cancellation, TTL, retries and
  dead-letter. Postgres for jobs and progress, and an object store for fixtures and benchmark editions, pinned by hash.
- **Isolation.** gVisor or microVM (e.g. Firecracker) isolation in place of Docker Desktop, with seccomp/AppArmor, no
  Docker socket, no metadata or credentials, and no egress. Separate pools for interactive, stateful and benchmark
  work, with dedicated benchmark hosts so timings mean something.
- **Assurance.** A threat model, isolation fuzzing, a pen test, and a security review.
- **Operations.** Observability (queue depth, start latency p50/p95, timeouts, $/job), audit logs, cost controls and
  warm capacity planning.
- **Licensing.** Licence reviews still open for some datasets (plan.md §9).

---

## Source control for `services/spark-runner/` (recommendation only, nothing changed)

**Today:**
- `services/` is untracked.
- `.gitignore` ignores only `/services/**/__pycache__/`.
- `.vercelignore` already lists `/services/` (and `/PySpark Docs/references/uploaded_pdfs/`).
- **The GitHub repo is public.**
- `services/spark-runner/private/` is 75 MB across 635 items of reference solutions, oracles, hidden cases and expected
  results. Committing it would publish every answer and hidden test.

**Recommendation:**
1. **Track** `services/spark-runner/` code and public material in this repo:
   - `Dockerfile` and `requirements*.txt`;
   - `sandbox/` and `runner/`;
   - `dev_server.py` and `run.py`;
   - `datasets/` generators;
   - `tests/`;
   - `samples/` (visible samples, already public through `*.expected.json`);
   - README.

   Fixtures (17 MB, deterministic, hash-checked by `test_datasets.py`) can be committed, or regenerated by a
   `run.py build-datasets` step. Committing keeps the gate reproducible, and that's the better default at this size.
2. **Never commit** `services/spark-runner/private/`. Add `/services/spark-runner/private/` to `.gitignore` and keep it
   in a separate private repository. A private git submodule mounted at that path works; so does a path set by env
   `PS_PRIVATE_DIR`, read by `runner/api.py`, which is cleaner. Back it up encrypted.
3. **Ignore generated material:** `/services/spark-runner/.bench/` (E6) and `__pycache__`.
4. **Keep `/services/` in `.vercelignore`** so the runner, fixtures and generators never upload with the web app.
   Nothing under `src/` imports from `services/`; only `api.py` reads `src/content/`, the other way round. Before the
   first push, confirm that no `*.expected.json` or lesson JSON under `src/content/pyspark/` contains hidden data.
   `test_items.py` already asserts this, and it should run as a pre-commit check.
5. Commit only when the owner authorizes it (NEXT_SESSION §1).
