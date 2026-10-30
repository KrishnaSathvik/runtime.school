# Spark runner (local proof)

Runs learner PySpark on **real Apache Spark** in a locked-down Docker container and grades the result outside it.
Local development only: not deployed, not a public security boundary. The app reaches it only through
`dev_server.py` on 127.0.0.1 in development.
Plan and acceptance criteria: `docs/pyspark/plan.md` §6.

```
docker build -t runtime-spark-runner:4.0.1-2 services/spark-runner
python3 services/spark-runner/run.py run   PS-Q0046 my_solution.py
python3 services/spark-runner/run.py check PS-Q0046 my_solution.py
python3 services/spark-runner/run.py playground PS-D01 script.py
python3 services/spark-runner/run.py build-expected PS-Q0046      # after changing an item's reference or cases
npm run pyspark:runner                                             # dev bridge for the app on 127.0.0.1:8787
npm run test:pyspark-runner                                        # acceptance suite, ~2 min
python3 services/spark-runner/datasets/d01_retail.py               # regenerate PS-D01 (deterministic)
```

## Layout

| Path | Trust | What |
|---|---|---|
| `Dockerfile`, `requirements.txt` | build | Python 3.11.17 + Temurin JRE 17.0.20.1 (both by image digest) + PySpark 4.0.1 / py4j 0.10.9.9 (by hash) |
| `sandbox/harness.py` | runs **inside** the container | Starts `local[2]` Spark on loopback, loads input tables with their declared schemas, runs `solve(...)` in a fresh module per case (or the file as a script for the Playground), reports bounded, type-tagged rows + schema as tagged stdout lines |
| `runner/sandbox.py` | host | One container per job: limits, wall clock, kill on timeout/cancel, always removed |
| `runner/grader.py` | host | Columns, order, Spark types, rows as a multiset; hidden cases never quote data |
| `runner/api.py` | host | `run`, `check`, `playground`, `build_expected`: the interface an execution API calls |
| `dev_server.py` | host, 127.0.0.1 only | Job API for the app in development: submit, poll states, cancel |
| `datasets/d01_retail.py` → `fixtures/PS-D01/1.1.0/` | host | Our own synthetic retail data: `lesson`, `practice` and `project` editions, manifest with DDL, keys, rules, SHA-256; also writes the app's snapshot `src/content/pyspark/datasets/PS-D01.json` |
| `src/content/pyspark/items/<id>.json` | public | Items: PS-Q0046, PS-L010-C1, PS-L010-C2, PS-P01-M1, PS-P01-M2. Prompt, rules, hints, starter, inputs, output, visible case: the app renders it, the runner reads it |
| `src/content/pyspark/items/<id>.expected.json` | public | Written by `build-expected`: up to 20 expected rows and the row count for the visible case, and the hidden cases' labels (no hidden data) |
| `src/content/pyspark/lessons/PS-L010.json`, `.recorded.json` | public | The lesson, and its examples' output recorded by `build-lesson` |
| `private/<id>/` | host only | `reference.py`, `oracle.py` (plain-Python rules), `hidden.json`, `hidden/*`, `wrong.json` (known-wrong answers), `expected/*` |

## Contract

`run(item, code)` → `{status, cases: [{id, status, schema: [{name, type, nullable}], rows, row_count, truncated, stdout, stderr, error, ms}], timings, memory_peak_bytes, engine}`

`run_project(project, code)` → `{status, error, artifacts: [{name, status: ok|missing|runtime-error|contract-error, schema, rows, row_count, truncated, error, ms}], stdout, stderr, …}`:
every function of `src/content/pyspark/projects/<id>.json` `artifacts`, in order, on the project export (public, so
rows may be shown). `check_project(project, code)` → `{status, passed, steps: [{step, item, passed, score, status,
error, checks}]}`: `check` of every written step on the same file.

`check(item, code)` → `{status, passed, score: "8/8", checks: [{id, visible, label, passed, message, missing?, unexpected?, stdout?}], …}`.
`missing` / `unexpected` example rows, the learner's `error` and `stdout` appear for visible cases only. Visible and
hidden cases run in **separate containers**: the visible run has no hidden inputs mounted, and a hidden case reports
only pass/fail and fixed wording (`grader.HIDDEN_STATUS`, `HIDDEN_RUN`), plus names taken from the expected result.
Timings and memory in the response come from the visible run.

`status` is one of `ok`, `syntax-error`, `runtime-error`, `contract-error`, `timeout`, `cancelled`, `memory-limit`,
`output-limit`, `crashed`. Errors carry `{type, message, line, condition}`: `line` is the learner's line, `condition`
is Spark's error condition (e.g. `UNRESOLVED_COLUMN.WITH_SUGGESTION`). Values are JSON with decimals, dates and
timestamps as text so nothing is rounded. The server picks fixtures from the trusted item ID, never from the caller.

## Container restrictions (every job)

`--network none` (loopback only; Spark's driver, JVM and py4j traffic all stay on 127.0.0.1) · `--read-only` root ·
`/tmp` tmpfs 512 MB `noexec,nosuid,nodev` (Spark local dirs, JVM and Python temp) · user 10001, `--cap-drop ALL`,
`no-new-privileges` · `--pids-limit 512` (JVM threads count too) · `--memory 4g` with no swap · `--cpus 2` · `/job` and `/data` read-only,
no writable mount except `/tmp` · `--log-driver none` · wall clock 45 s (run) / 90 s (check).

Output: the harness reports on stdout. The host keeps at most 8 MB of the result line and 64 KB of other output, in
memory, and drops the rest; nothing is written to host disk. A job that keeps producing past 16 MB of dropped output
is killed (`output-limit`).

## Measured (2026-10-23, Docker Desktop 29.6.1, arm64 Mac, 8 GB VM, no other load)

| | Value |
|---|---|
| Image size | 537 MB |
| Spark session start | 7.4 s first run after build (cold); 2.6–2.9 s after |
| Run, 1 case, wall clock incl. container start | median 5.6 s (5.2–5.6 s) |
| Check, 8 cases, wall clock | median 6.0 s (5.6–6.1 s) |
| First query in a session | ~2.0 s (later cases ~0.1–0.4 s) |
| Peak container memory | 410–520 MiB |
| Acceptance suites | `test_runner.py` 25 tests, `test_items.py` 8 tests (every item and lesson); ~4 min together |
| Through the app (dev bridge) | Run 5.2–6.7 s, Check 5.4–5.9 s end to end |

## Limitations

- Every job pays for container + JVM start (~5–6 s warm). A warm pool would need a per-learner reset story first.
- **Test isolation is incomplete, not production-grade.** All cases of one Check share one Spark session. Each case
  gets a fresh learner module and fresh DataFrames, but learner code can change process-wide state (Spark config, the
  JVM, Python builtins) that later cases see. Fixing it means a container per case (~5 s each) or a reset story.
- Hidden **inputs** are mounted for Check (the code has to run on them). Expected results and the reference never are,
  and the learner's prints from hidden cases are not returned.
- CSV fixtures only. Parquet/Delta, streaming checkpoints, RDD lessons and benchmarks are not exercised yet.
- Five items, one lesson, one dataset. Authoring is manual: public spec, reference, oracle, hidden cases, known-wrong
  answers, then `build-expected` (and `build-lesson` for a lesson).

## Security assumptions

- **Docker Desktop is not a security boundary for public, multi-tenant code.** Containers share the Docker VM kernel.
  Public execution needs stronger isolation (gVisor or microVMs), quotas, abuse limits and a security review
  (`PySpark Docs/instructions/ENGINE_AND_SECURITY_v4.md`).
- The host side trusts the image and the item files. Learner code is only ever in `/job/solution.py` inside a container.
- The dev bridge trusts the local machine: it binds to 127.0.0.1, checks Origin and Host (so other sites open in the
  browser can't submit jobs), requires JSON bodies, and caps code size and the queue. It has no authentication.
- **Everything a container reports is the learner's claim.** Learner code runs in the same Python process as the
  harness, so it can write its own `@@ps result` line, exit early, or patch the harness. That is why grading never
  trusts the container's verdict, only its rows: the host compares them with private expected results the container
  never sees, so a forged report passes only if it holds the right rows, which is computing the answer. The host
  also rejects a report whose cases aren't exactly the ones it asked for (missing, repeated or extra).
- **Technique evidence (plan operators, stream counts) is a claim too.** It catches honest mistakes (a UDF defined but
  not used), not deliberate forgery. So a technique check also requires the learner's source, parsed on the host, to
  call the API (`api.technique_calls`). Remaining gap: a call in dead code plus a forged plan still passes. Closing it
  needs evidence gathered outside the learner's process (Spark Connect with a separate server, or a second process
  under another user), which this engine doesn't have.
  Two techniques have weak plan evidence today, so their check rests mostly on the source: RDD items (the harness
  reports `Scan`, and `createDataFrame(list)` also plans as `Scan ExistingRDD`) and the Delta MERGE item L064-C1 (a
  merge runs as a command, not in the result's plan; the check sees the Delta read back). Fixing both needs a harness
  change in a new image: report `Scan ExistingRDD` whole, and record command nodes (`MergeIntoCommand`) with a query
  listener. A technique may also be source-only (no `plan`, no `streams`).
- **Hidden inputs stay inside the hidden run.** Its output channels are cut to: pass/fail per case, fixed messages,
  the run's end state (timeout, memory, output limit), and whether a technique was seen. A determined learner can
  still learn a few bits per submission from those (e.g. by choosing to time out), but not rows or text.
- Cases within one run share a SparkSession and a process (plan.md §5). A case can affect a later case in the same
  run; it can't reach the other run, other jobs, or private files.
- Adversarial regression tests: `tests/test_runner.py` `Adversarial` (forged reports, early exit, forged plan, hidden
  rows via error messages, exception names, column names and types, and listing `/data`).

## Local tools v2

The default image is `runtime-spark-runner:4.0.1-5`. Build it from this directory's Dockerfile after changing `sandbox/`:

```sh
docker build -t runtime-spark-runner:4.0.1-5 services/spark-runner
```

The same `/jobs` endpoint accepts `mode: "tool"`, with `action` SQL, plan, compare, pipeline, stream or benchmark
(lowercase), a known dataset/version/edition and an opaque UI input revision. No hidden assessment files are used by
tools. New tool requests cannot choose image tags, fixture paths, schemas, process limits or trusted scenario flags.

- SQL scripts share state within one run only. The lab conservatively allows supported query/table operations and
  local file providers. Shared inputs are read-only; allowed writes use the private warehouse or `/tmp/work/`.
- Plan capture reports actual logical/optimized/physical text and an operator tree. It does not claim runtime
  operator metrics, a Spark UI stage graph, or independently trusted evidence from learner-controlled Python.
- Compare runs A and B in separate containers, then compares complete bounded results on the host. Names, column
  order and Spark types must match. Row order is optional; duplicates, nulls and exact values count. Nullability is
  shown separately. No numeric tolerance is applied. The complete-result cap is 10,000 rows / 2 MB per side; larger
  outputs are **not fully verified**. Only bounded previews leave the API. The authored order-count task has a
  separately executed reference; scratch comparisons have no independent task oracle and explicitly say so.
- Batch scenarios run upstream functions before the selected stage. The Delta scenario writes real versions and
  reads their history. It is an introductory history experiment, not a complete CDC/SCD2 lab.
- Streaming replays real fixture event batches from the beginning through the selected step in one fresh container.
  File input, foreachBatch output, checkpoint commits, intentional failure and recovery are real. The sink overwrites
  by batch ID for this scenario's idempotency; this does not promise exactly-once behavior for arbitrary sinks.
  Window/state-store inspection and RocksDB are not enabled by these scenarios.
- Benchmarks generate 100K or 1M deterministic domain fixtures in Spark, verify the complete small aggregate,
  warm up, then run five alternating A/B materializations through the no-op sink. Startup, generation and verification
  collection are reported separately. Timings cover the materialization action, not result transfer. The runner's
  FIFO container scheduler reserves all slots for the benchmark; this cannot exclude unrelated applications or
  independent runner processes on the development machine. There is no 10M mode.

Resource limits remain 2 CPUs, 4 GB, 512 processes/threads, bounded scratch/output and wall-clock cancellation.
Container hostnames resolve to localhost even with networking disabled. Thread and memory peaks accompany results.
The scheduler controls actual container lifetimes; visible and hidden assessment containers still run sequentially.

Focused gates:

```sh
python3 -I -m unittest discover -s services/spark-runner/tests -p test_tools.py -k Policy -v
SPARK_TOOLS_LIVE=1 python3 -I -m unittest discover -s services/spark-runner/tests -p test_tools.py -v
npx vitest run tests/pyspark-tools.test.ts tests/pyspark-registry.test.ts
```

A second development bridge can set `PYSPARK_RUNNER_PORT`, `PYSPARK_RUNNER_ORIGINS` and
`PS_RUNNER_SKIP_SWEEP=1` to avoid deleting other sessions' active test containers at startup. Bridge shutdown cancels its own jobs and removes only containers owned by that process. Public execution remains
unsupported and the production feature flag remains off. Private references/hidden fixtures are git-ignored and the
entire service is excluded from Vercel uploads. Nothing in this implementation provisions a private encrypted store.
