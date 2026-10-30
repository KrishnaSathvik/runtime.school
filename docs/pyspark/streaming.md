# Streaming (and benchmark) authoring brief for the PySpark runner

Checked on image `runtime-spark-runner:4.0.1-3` with the real limits (512 pids, 2 CPUs, 4 GB, noexec 512 MB `/tmp`), using
`api.playground` (lesson examples) and a 5-case `capture` job like `check`. The machine was busy the whole time (load
average 14–25, about 5 other job containers running). Evidence scripts and outputs:
`/private/tmp/claude-501/-Users-krishnasathvikmantripragada-runtime-school/addc9b95-2761-43a8-8ea1-cb44ff8f7eec/scratchpad/b6_spike/t/` and `.../b6_spike/out/`.

## 1. What works today (every example below gave the same output on 3 runs)

- File streams: `spark.readStream.schema(...).json(dir)` and `.csv(dir)` with a header, reading files the job writes into `/tmp`.
- Triggers: `trigger(availableNow=True)` + `awaitTermination()`, and `processAllAvailable()` on a query started with the default trigger.
- Sinks: `foreachBatch`, `memory` (`queryName` then `spark.table(name)`), Delta (`format("delta").start(path)`), and Parquet
  file sink with a checkpoint.
- Output modes: append (needs a watermark on aggregations), update and complete.
- Event-time windows, `withWatermark`, `dropDuplicatesWithinWatermark`.
- Joins: stream-static, stream-stream inner, stream-stream left outer with a time bound.
- `applyInPandasWithState`.
- Checkpoints: stop and restart picks up only new files. A failure inside `foreachBatch` stops the query; the restart
  re-runs the failed batch (shown by the committed batch ids).
- The default state store (HDFS-backed) works. You can read state with `spark.read.format("statestore").load(ck)` and
  `spark.read.format("state-metadata").load(ck)`.
- Stable progress fields: `batchId`, `numInputRows`, `eventTime["watermark"]`, `stateOperators[i]["numRowsTotal"]`,
  `["numRowsDroppedByWatermark"]`, `["numRowsUpdated"]`, `sources[0]["description"]`, `sink["description"]`.
  `len(q.recentProgress)` is stable too.
- Analysis errors at `start()` have stable messages, so they suit `error-example` blocks: append without a watermark is
  `AnalysisException` with `STREAMING_OUTPUT_MODE.UNSUPPORTED_OPERATION`; `.show()` on a stream is `AnalysisException`;
  a file sink with no checkpoint is `AnalysisException`.

## 2. What doesn't work, or breaks identical output

- **RocksDB state store**: fails with `UnsatisfiedLinkError ... failed to map segment` (it unpacks its native library into
  noexec `/tmp`). This matters only if a lesson wants RocksDB or `transformWithStateInPandas`. HDFS state covers everything else.
- **`transformWithStateInPandas`** (Spark 4.0's new stateful API) fails twice over: it needs RocksDB, and its Python
  driver worker needs the `protobuf` package (`ImportError: cannot import name 'descriptor' from 'google.protobuf'`).
  A test with the `.so` and protobuf mounted ran it correctly (section 7). Until the image has those fixes, teach
  `applyInPandasWithState` and mention transformWithState in text only.
- **Console sink**: Spark prints it on the JVM's stdout, which the harness doesn't capture. The learner sees nothing.
  Use `foreachBatch` + `print` instead.
- **Processing-time triggers with timed feeding** (`trigger(processingTime=...)` + `time.sleep`): 3 runs gave 3
  different batch splits. Never use them in recorded or graded code.
- `current_timestamp()` gets a new value in every micro-batch. Never print it.
- Progress `id`, `runId`, `timestamp`, `durationMs`, `*RowsPerSecond` and `batchDuration` change every run. So does
  `str(StreamingQueryException)`, which contains the query id and runId UUIDs. Print `type(e).__name__` and
  `e.getCondition()` (`STREAM_FAILED`), or check for a phrase (`"sink down" in str(e)`), never the message.
- Rows inside a micro-batch, and rows read back from a Delta/Parquet sink, come in no fixed order. Delta read-backs
  changed order between runs with the same sorted content. Always `sorted(...)` or `orderBy` before printing.
- Restarting with a changed query on the same checkpoint is only detected when a batch actually runs. With no new
  files it gives no error, so don't build an example on that error.
- `toJSON()` writes timestamps to millisecond precision. Every table in D06/D09/D12/D15 round-trips exactly (proven on
  lesson and practice), but don't use the helper on data with microseconds.
- Kafka, sockets: there's no network. Don't use them.

## 3. Time and thread budget

- **Playground and lesson examples have a fixed 45 s budget** (`api.playground`), and Spark start alone took 3–13 s
  under load. Measured whole-job wall times:
  - one stateful query: 10 s idle, 35–37 s under load;
  - four queries (s2): 16–36 s of user time, 36–48 s of wall time;
  - `processAllAvailable` with 5 feeds plus a stateful query: up to 52 s, which would time out.

  Rule: **one streaming query per example (two at most), ≤ 6 micro-batches, memory or foreachBatch sink**, and
  `spark.conf.set("spark.sql.shuffle.partitions", "1")` before the first `start()` (stateful queries 1.3–3× faster).
- **Delta sink is 3–5× slower** (7–15 s for one 6-batch stream against 2–3 s for memory or foreachBatch). Use it in at
  most one example, and never in graded items. A 5-case Delta grading job took 82–125 s; with memory it took 35–65 s.
- **Grading**: set `"limits": {"run_timeout_s": 90, "check_timeout_s": 150}` in streaming items. Use ≤ 5 cases, each one
  stream with ≤ 6 micro-batches. Per case: 4–12 s, and the first case 11–42 s because the JVM is still warming up.
- **Threads (pids)**:
  - a plain job sits at 57–75;
  - the first stateful streaming query lifts it to about 200–270;
  - it then levels off at **275–315 however many streams follow** (12 stateful queries in one job peaked at 285).

  The growth is two cached thread pools in Spark's block manager (`block-manager-storage-async`,
  `block-manager-ask`). Each is capped at 100 threads, and both were seen at exactly 100. Measured peaks:
  - lesson examples: 65–313;
  - 5-case grading jobs: 291–306 (memory sink 291–295, Delta 306–313 with the cap lifted);
  - `applyInPandasWithState`: 140–164;
  - transformWithState (mounted fix): 254.

  All are under 430. The risk is mixing streams with many batch queries or Python UDF workers (the benchmark scripts
  reached 320–368).
- Practice editions: D09 practice has 49 batch values (hourly), so 49 micro-batches took 25 s. Regroup first, e.g.
  `df.withColumn("batch", F.floor(F.col("batch") / 10))`, to get ≤ 5 micro-batches. D06 and D12 practice have 5.
  D15 has no `batch` column: derive one (`F.floor(F.minute("requested_at") / 10)` gives 6 for practice requests,
  `F.floor(F.second("logged_at") / 20)` gives 3 for logs).

## 4. The helper (show it visibly in the lesson; proven on D06, D09, D12, D15, lesson and practice)

Proven means:
- micro-batch k holds exactly the rows of the k-th value of `by`;
- the rows read back equal the table exactly (sorted `toJSON` compare), including nested structs, arrays, maps and nulls.

```python
import os, shutil
from pyspark.sql import functions as F

def make_batches(df, folder, by="batch"):
    """Write df as one JSON file per value of `by`, oldest first.
    A stream that reads `folder` with maxFilesPerTrigger=1 then sees one file per micro-batch."""
    shutil.rmtree(folder, ignore_errors=True)
    os.makedirs(folder)
    keys = [r[0] for r in df.select(by).distinct().orderBy(by).collect()]
    for i, key in enumerate(keys):
        rows = df.filter(F.col(by) == key).toJSON().collect()
        path = f"{folder}/part-{i:03d}.json"
        with open(path, "w") as f:
            f.write("\n".join(rows) + "\n")
        os.utime(path, (1_700_000_000 + i, 1_700_000_000 + i))  # file times set the reading order
    return len(keys)

def run_stream(writer):
    """Start a query, process every file waiting in its folder, and stop. Returns the finished query."""
    q = writer.trigger(availableNow=True).start()
    q.awaitTermination()
    return q
```

Canonical lesson example (PS-D06 lesson). Same output on 3 runs; peak 147–168 pids; 35–37 s wall under heavy load:

```python
spark.conf.set("spark.sql.shuffle.partitions", "1")
shutil.rmtree("/tmp/ck", ignore_errors=True)
make_batches(page_views, "/tmp/in")
views = spark.readStream.schema(page_views.schema).option("maxFilesPerTrigger", 1).json("/tmp/in")
counts = (views.withWatermark("event_time", "10 minutes")
          .groupBy(F.window("event_time", "10 minutes"), "page_type").count())

def show(batch_df, batch_id):
    rows = sorted((r.window.start.strftime("%H:%M"), r.page_type, r["count"]) for r in batch_df.collect())
    print("micro-batch", batch_id, rows)

q = run_stream(counts.writeStream.outputMode("append").foreachBatch(show).option("checkpointLocation", "/tmp/ck"))
p = q.lastProgress
print("last batch", p["batchId"], "watermark", p["eventTime"]["watermark"], "rows in state", p["stateOperators"][0]["numRowsTotal"])
```
prints
```
micro-batch 0 []
micro-batch 1 []
micro-batch 2 []
micro-batch 3 [('10:00', 'category', 2), ('10:00', 'home', 1), ('10:00', 'product', 2)]
micro-batch 4 [('10:10', 'cart', 1), ('10:10', 'category', 1), ('10:10', 'product', 1)]
micro-batch 5 [('10:20', 'home', 1), ('10:20', 'product', 1)]
last batch 5 watermark 2026-03-14T10:31:40.000Z rows in state 2
```
Note the last micro-batch, which has no data. availableNow runs one more batch to move the watermark on, so append
mode emits the last closed window there. Update mode does too; complete mode doesn't. Explain it rather than hide it.

Variants (each proven, scripts in `t/`):
- **Restart from a checkpoint** (s3):
  1. write only the first k batch files, using `make_batches`' loop body for those keys and keeping each file's own
     index `i` for its file time (don't call `make_batches` again, because it clears the folder);
  2. `run_stream(...)`;
  3. write the remaining files and `run_stream(...)` again with the same checkpoint.

  The second run processes only the new files. A third run with nothing new does nothing and prints the same every time.
- **Feeding one file at a time** (s1, s10): start once with the default trigger, then per batch write the file under a
  dot-name, `os.rename` it in, and call `q.processAllAvailable()`. It was the same on 3/3 runs, including the extra
  no-data batch after each feed, but it's slower and in principle racy. Prefer availableNow + `maxFilesPerTrigger`;
  write the dot-name + rename (never a half-written visible file) if you do feed.
- **Two sources** (stream-stream join, s4): give both `maxFilesPerTrigger=1`. Micro-batch k then reads file k of each
  source, so line up batch values or say which files pair up.
- **CSV source**: write the file with Python's `csv` module, header row first; `isoformat()` for timestamps, `""` for null.

## 5. Graded items around a stream (DataFrame-graded works; proven in a 5-case capture job)

`solve(table)` writes the batches, runs the stream into a memory sink and returns `spark.table(name)`. The grader
collects it like any DataFrame. Rows were the same on every case and run; the same sorted rows came out for memory and
Delta sinks.

```python
def solve(page_views):
    make_batches(page_views, "/tmp/in")              # clears the folder: cases share one container
    shutil.rmtree("/tmp/ck", ignore_errors=True)     # a fresh checkpoint per case, or the stream skips everything
    stream = spark.readStream.schema(page_views.schema).option("maxFilesPerTrigger", 1).json("/tmp/in")
    counts = (stream.withWatermark("event_time", "10 minutes")
              .groupBy(F.window("event_time", "10 minutes"), "page_type").count())
    run_stream(counts.writeStream.outputMode("append").format("memory").queryName("page_counts")
               .option("checkpointLocation", "/tmp/ck"))
    return spark.table("page_counts").select(F.col("window.start").alias("window_start"), "page_type", "count")
```
- Give the helper in the starter as setup code ("this writes each batch as a file so the stream can read it").
- Reusing the same `queryName` across cases is fine once the earlier query has stopped.
- Grade on the final table. Batch-by-batch output can't be graded unless `solve` builds it into a DataFrame
  (e.g. `foreachBatch` appends `(batch_id, ...)` rows to a Python list, then `spark.createDataFrame(list, schema)`).
- Hidden cases: build the "late" or "duplicate" behaviour into the `batch` column of the hidden fixture. Keep each case
  to ≤ 6 batch values.
- If several approaches give the same rows and the item teaches a specific API, a technique check could use plan
  operators. That is unproven for streams (the returned DataFrame is the memory table, not the stream), so don't promise it.
- Measure each reference with `peak.py`. Expect 290–310; anything near 400 means too many queries.

## 6. Semantics to record, not predict

- Late rows: with `withWatermark("event_time", "0 minutes")` on D09, late reading R0006 (09:15, file 4) was *not*
  dropped (`numRowsDroppedByWatermark` 0), and its window was emitted in that batch. Spark filters late rows using the
  previous batch's watermark. Get every "dropped/kept" claim from a real run.
- D12 lesson: with a 1-day watermark the left outer join emitted only matched pairs, because the watermark never passed
  the unmatched impressions inside the data. To show unmatched rows coming out, use a shorter watermark and check by running it.
- `spark.sql.shuffle.partitions` for a stateful query is fixed when its checkpoint is first created. Set it before the
  first `start()` and clear the checkpoint when you change it.

## 7. Engine changes (not needed for L067–L072/L087 as written above)

1. RocksDB: add `librocksdbjni-linux-aarch64.so` (and `librocksdbjni-linux64.so` for x86) from
   `pyspark/jars/rocksdbjni-9.8.4.jar` into `/opt/native`, and add `-Djava.library.path=/opt/native` to
   `JAVA_TOOL_OPTIONS`. Proven: with the `.so` mounted and `java.library.path` pointed at it, a RocksDB groupBy ran.
2. `pip install protobuf==5.29.5` (pure-Python wheel works) for `transformWithStateInPandas`. Proven together with 1:
   the same output as `applyInPandasWithState`, peak 254 pids.
3. Optional: let a lesson set its own example timeout (e.g. `"limits": {"example_timeout_s": 90}` read by
   `build_lesson` and the lesson Run button). 45 s is tight for streaming under load.

## 8. L085 benchmarking: what is safe today (PS-D07 practice, 6 runs)

Identical on 6/6 runs (print these):
- `len(df.inputFiles())`, `df.rdd.getNumPartitions()`, `spark.conf.get("spark.sql.shuffle.partitions")`;
- `explain("cost")` sizes (`Statistics(sizeInBytes=40.2 KiB)` …);
- operator names from `explain("formatted")` (count of `Exchange` = shuffles, `BroadcastHashJoin` present);
- after an action, plan metrics from the executed plan: per operator `numOutputRows`, and for scans `numFiles`/`filesSize`
  (walk `df._jdf.queryExecution().executedPlan()`, stepping into `AdaptiveSparkPlan.executedPlan()` and `QueryStage.plan()`);
- jobs/stages for a job group via `sc.statusTracker()` (1 job, 2 stages for the zone-revenue join).

Timing relations (median of 5 alternating runs after a warm-up; each case below ran 5–6 times):
- Stable: "Python UDF slower than built-in" on 300k rows, 6/6 (ratios 2.2–3.6). "UDF at least 3× slower" on 1M rows, 5/5
  (ratios 5.5–7.9). "3000×300 cross join slower than a group by", 5/5 (1.7–3.6).
- Not stable: "ratio > 3" on 300k rows (2/6). "Cached faster" for a ~1.2× gap (5/6, flipped once).

  Pitfall: `df.cache()` marks `df` itself, so "df vs df.cache()" compares cached with cached.
- Only print a relation whose expected gap is ≥ 5× and whose threshold is ≤ half the smallest observed ratio. Never print numbers.
- Timing examples cost 20–105 s of wall time under load and peak at 320–368 pids. Keep to one timing example per lesson,
  with small N, or you hit the 45 s limit.
