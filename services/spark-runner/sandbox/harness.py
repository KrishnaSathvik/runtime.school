"""In-sandbox harness: run learner PySpark on real Spark and report what it produced.

Runs inside the container as an unprivileged user with no network, a read-only root filesystem and no writable mount
except a capped /tmp. Reads /job/job.json and /job/solution.py and input tables under /data (all read-only). It never
sees expected results or reference solutions: grading happens outside (runner/grader.py).

It reports on stdout, one tagged line per event, which the host reads with a size cap:
  @@ps state spark-ready     the SparkSession is up
  @@ps case <id>             a case is starting
  @@ps result <json>         the final result (last line)

Modes:
  run      call solve(...) per case; a bounded preview (first `preview_rows` rows) and the row count
  capture  call solve(...) per case; every row up to `max_rows`, for the grader
  script   run the file as a script with the tables predefined; display(df) collects up to five previews (Playground)
  project  call each of a project's functions (`artifacts`, in pipeline order) on one case; a bounded preview of every
           table it returns, so the learner can inspect intermediate outputs as well as the final ones
"""

from __future__ import annotations

import base64
import importlib.util
import io
import json
import math
import re
import sys
import time
import traceback
import ast
import tokenize
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

T0 = time.perf_counter()
JOB = Path("/job/job.json")
SOLUTION = Path("/job/solution.py")
REPORT = sys.__stdout__
MAX_FRAMES = 5


def ms(start: float) -> int:
    return round((time.perf_counter() - start) * 1000)


def emit(kind: str, value: str) -> None:
    REPORT.write(f"\n@@ps {kind} {value}\n")
    REPORT.flush()


class Capped(io.StringIO):
    """stdout/stderr for learner code: keeps the first `limit` characters and notes that the rest was dropped."""

    def __init__(self, limit: int):
        super().__init__()
        self.limit = limit
        self.dropped = False

    def write(self, s: str) -> int:
        room = self.limit - self.tell()
        if room <= 0:
            self.dropped = self.dropped or bool(s)
            return len(s)
        if len(s) > room:
            self.dropped = True
        return super().write(s[:room])

    def text(self) -> str:
        return self.getvalue() + ("\n… output truncated" if self.dropped else "")


def learner_line(tb) -> int | None:
    """The last line of the learner's own file in a traceback."""
    line = None
    for frame in traceback.extract_tb(tb):
        if frame.filename == str(SOLUTION):
            line = frame.lineno
    return line


def describe(e: BaseException) -> dict:
    """A learner-facing error: type, a one-line message, Spark's error condition when there is one, and the learner's line."""
    from pyspark.errors import PySparkException

    condition = None
    message = str(e)
    if isinstance(e, PySparkException):
        condition = e.getCondition() if hasattr(e, "getCondition") else e.getErrorClass()
    else:
        try:
            from py4j.protocol import Py4JJavaError

            if isinstance(e, Py4JJavaError):
                message = str(e.java_exception.toString())
        except Exception:  # noqa: BLE001 - best effort only
            pass
    # Spark appends the analysed plan after the message; the first line is what a learner can act on.
    first = message.strip().split("\n", 1)[0]
    first = first.split("; line ", 1)[0].removesuffix(";")
    tb = "".join(traceback.format_exception(type(e), e, e.__traceback__)).replace(str(SOLUTION), "solution.py")
    return {
        "type": type(e).__name__,
        "message": first[:600],
        "condition": condition,
        "line": learner_line(e.__traceback__),
        "traceback": tb[-4000:] if condition is None else None,
    }


def encode(value, dtype):
    """A JSON value for one Spark value, exact for decimals, dates and special floats."""
    from pyspark.sql import types as T

    if value is None:
        return None
    if isinstance(dtype, T.DecimalType):
        return str(value)
    if isinstance(dtype, (T.DateType, T.TimestampType, T.TimestampNTZType)):
        return value.isoformat()
    if isinstance(dtype, (T.FloatType, T.DoubleType)):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        return value
    if isinstance(dtype, T.BinaryType):
        return base64.b64encode(bytes(value)).decode()
    if isinstance(dtype, T.ArrayType):
        return [encode(v, dtype.elementType) for v in value]
    if isinstance(dtype, T.MapType):
        pairs = [[encode(k, dtype.keyType), encode(v, dtype.valueType)] for k, v in value.items()]
        return sorted(pairs, key=lambda p: json.dumps(p, sort_keys=True))
    if isinstance(dtype, T.StructType):
        return {f.name: encode(value[i], f.dataType) for i, f in enumerate(dtype.fields)}
    if isinstance(value, (str, int, bool)):
        return value
    return str(value)


def schema_of(df) -> list[dict]:
    return [{"name": f.name, "type": f.dataType.simpleString(), "nullable": f.nullable} for f in df.schema.fields]


def rows_of(df, limit: int) -> tuple[list, bool]:
    """At most `limit` rows, and whether there were more. Never collects an unbounded result."""
    fields = df.schema.fields
    got = df.limit(limit + 1).collect()
    rows = [[encode(r[i], f.dataType) for i, f in enumerate(fields)] for r in got[:limit]]
    return rows, len(got) > limit


_NODE = re.compile(r"^[\s:+\-|]*(?:\*\(\d+\)\s*)?([A-Z][A-Za-z]+)")


def plan_nodes(df) -> list[str]:
    """The operator names in the plan Spark ran for `df` (after an action, adaptive execution's final plan). Evidence
    that a technique really ran: a pandas UDF shows as ArrowEvalPython, mapInPandas as MapInPandas. Node names start
    each plan line; column names and literals come after them, so learner text can't pose as a node."""
    try:
        text = df._jdf.queryExecution().executedPlan().toString()
    except Exception:  # noqa: BLE001 - no plan means no evidence, never a crash
        return []
    return sorted({m.group(1) for m in map(_NODE.match, text.splitlines()) if m})


class StreamEvidence:
    """Counts streaming queries started, micro-batches they ran and source rows they read, per case: evidence that a
    stream really ran (a memory-sink table's plan doesn't show one). Started events arrive before start() returns;
    progress events are flushed with the listener bus before reading. Rows are counted after filters pushed into the
    scan, so a stream whose filter keeps nothing reads 0 rows; its micro-batches still count."""

    def __init__(self, spark):
        from pyspark.sql.streaming import StreamingQueryListener

        outer = self
        self.spark, self.started, self.batches, self.rows = spark, 0, 0, 0

        class _Listener(StreamingQueryListener):
            def onQueryStarted(self, event):
                outer.started += 1

            def onQueryProgress(self, event):
                outer.batches += 1
                outer.rows += int(event.progress.numInputRows or 0)

            def onQueryIdle(self, event):
                pass

            def onQueryTerminated(self, event):
                pass

        spark.streams.addListener(_Listener())

    def reset(self) -> None:
        self.started, self.batches, self.rows = 0, 0, 0

    def read(self) -> dict:
        try:
            self.spark.sparkContext._jsc.sc().listenerBus().waitUntilEmpty()
        except Exception:  # noqa: BLE001 - counts so far are still evidence
            pass
        return {"started": self.started, "batches": self.batches, "rows": self.rows}


def preview(df, limit: int) -> dict:
    rows, more = rows_of(df, limit)
    return {"schema": schema_of(df), "rows": rows, "truncated": more, "row_count": df.count()}


def load_solution(spark, extra: dict | None = None):
    """A fresh copy of the learner's module, so no state carries from one case to the next. `spark` is predefined."""
    spec = importlib.util.spec_from_file_location("solution", SOLUTION)
    module = importlib.util.module_from_spec(spec)
    module.spark = spark
    for k, v in (extra or {}).items():
        setattr(module, k, v)
    spec.loader.exec_module(module)
    return module


def memory_peak() -> int | None:
    for p in ("/sys/fs/cgroup/memory.peak", "/sys/fs/cgroup/memory/memory.max_usage_in_bytes"):
        try:
            return int(Path(p).read_text().strip())
        except (OSError, ValueError):
            continue
    return None


def finish(result: dict) -> None:
    result["timings"]["total_ms"] = ms(T0)
    result["memory_peak_bytes"] = memory_peak()
    try:
        result["pids_peak"] = int(Path("/sys/fs/cgroup/pids.peak").read_text())
    except (OSError, ValueError):
        result["pids_peak"] = None
    emit("result", json.dumps(result))


def read_table(spark, spec: dict):
    """A trusted fixture with its declared schema: CSV, JSON Lines (nested data) or raw text (one `value` column)."""
    path = spec["path"]
    if path.endswith(".jsonl"):
        return spark.read.json(path, schema=spec["schema"], mode="FAILFAST")
    if path.endswith(".txt"):
        return spark.read.text(path)
    return spark.read.csv(path, header=True, schema=spec["schema"], mode="FAILFAST")


def run_cases(spark, job: dict, result: dict) -> None:
    from pyspark.sql import DataFrame

    entry = job.get("entry", "solve")
    preview_rows = int(job.get("preview_rows", 100))
    max_rows = int(job.get("max_rows", 10000))
    limit = int(job.get("stdout_limit", 20000))
    streams = StreamEvidence(spark) if job.get("streams") else None
    # Each case: fresh learner module, fresh input DataFrames, then materialise the result (Spark is lazy).
    for case in job["cases"]:
        emit("case", case["id"])
        if streams:
            streams.reset()
        t = time.perf_counter()
        out, err = Capped(limit), Capped(limit)
        entry_result: dict = {"id": case["id"], "status": "ok"}
        try:
            tables = [read_table(spark, case["tables"][name]) for name in job["inputs"]]
            with redirect_stdout(out), redirect_stderr(err):
                fn = getattr(load_solution(spark), entry, None)
                if not callable(fn):
                    entry_result.update(status="contract-error", error={"type": "ContractError", "message": f"Define a function named {entry}({', '.join(job['inputs'])}).", "line": None})
                else:
                    returned = fn(*tables)
                    if not isinstance(returned, DataFrame):
                        got = type(returned).__name__
                        entry_result.update(status="contract-error", error={"type": "ContractError", "message": f"{entry}() must return a PySpark DataFrame, but it returned {got}.", "line": None})
                    elif job["mode"] == "run":
                        entry_result.update(preview(returned, preview_rows))
                    else:
                        entry_result["schema"] = schema_of(returned)
                        rows, more = rows_of(returned, max_rows)
                        if more:
                            entry_result.update(status="too-many-rows", error={"type": "OutputLimit", "message": f"The result has more than {max_rows} rows.", "line": None})
                        else:
                            entry_result["rows"] = rows
                    if job.get("plan_nodes") and entry_result["status"] == "ok":
                        entry_result["plan_nodes"] = plan_nodes(returned)
                    if streams and entry_result["status"] == "ok":
                        entry_result["streams"] = streams.read()
        except Exception as e:  # noqa: BLE001 - every learner failure becomes a structured result
            entry_result.update(status="runtime-error", error=describe(e))
        entry_result["stdout"] = out.text()
        entry_result["stderr"] = err.text()
        entry_result["ms"] = ms(t)
        result["cases"].append(entry_result)


def run_project(spark, job: dict, result: dict) -> None:
    """A whole project run: every function in `artifacts`, in order, on the one case. Each artifact gets a fresh learner
    module (as cases do), so one function can't leave state for the next; a missing or failing function is reported
    for that artifact and the rest still run."""
    from pyspark.sql import DataFrame

    case = job["cases"][0]
    emit("case", case["id"])
    t = time.perf_counter()
    preview_rows = int(job.get("preview_rows", 100))
    limit = int(job.get("stdout_limit", 20000))
    out, err = Capped(limit), Capped(limit)
    artifacts: list[dict] = []
    entry_result: dict = {"id": case["id"], "status": "ok", "artifacts": artifacts}
    try:
        tables = {name: read_table(spark, spec) for name, spec in case["tables"].items()}
    except Exception as e:  # noqa: BLE001
        entry_result.update(status="runtime-error", error=describe(e))
        tables = None
    for a in job["artifacts"] if tables is not None else []:
        emit("case", f"artifact {a['name']}")
        ta = time.perf_counter()
        got: dict = {"name": a["name"], "status": "ok"}
        try:
            with redirect_stdout(out), redirect_stderr(err):
                fn = getattr(load_solution(spark), a["entry"], None)
                if not callable(fn):
                    got["status"] = "missing"
                else:
                    returned = fn(*(tables[n] for n in a["inputs"]))
                    if not isinstance(returned, DataFrame):
                        got.update(status="contract-error", error={"type": "ContractError", "message": f"{a['entry']}() must return a PySpark DataFrame, but it returned {type(returned).__name__}.", "line": None})
                    else:
                        got.update(preview(returned, preview_rows))
        except Exception as e:  # noqa: BLE001 - one failing stage is reported, the others still run
            got.update(status="runtime-error", error=describe(e))
        got["ms"] = ms(ta)
        artifacts.append(got)
    entry_result["stdout"] = out.text()
    entry_result["stderr"] = err.text()
    entry_result["ms"] = ms(t)
    result["cases"].append(entry_result)


def run_script(spark, job: dict, result: dict) -> None:
    """The Playground: the file runs top to bottom with the dataset's tables already loaded."""
    from pyspark.sql import DataFrame

    case = job["cases"][0]
    emit("case", case["id"])
    t = time.perf_counter()
    limit = int(job.get("stdout_limit", 20000))
    preview_rows = int(job.get("preview_rows", 100))
    out, err = Capped(limit), Capped(limit)
    frames: list[dict] = []
    entry_result: dict = {"id": case["id"], "status": "ok", "frames": frames}

    def display(df, name: str | None = None):
        """Show a DataFrame's schema and first rows in the results panel (up to five per run)."""
        if not isinstance(df, DataFrame):
            raise TypeError(f"display() takes a PySpark DataFrame, not {type(df).__name__}")
        if len(frames) >= MAX_FRAMES:
            print(f"display(): only the first {MAX_FRAMES} DataFrames are shown.")
            return
        frames.append({"name": name or f"DataFrame {len(frames) + 1}", **preview(df, preview_rows)})

    try:
        tables = {name: read_table(spark, spec) for name, spec in case["tables"].items()}
        with redirect_stdout(out), redirect_stderr(err):
            load_solution(spark, {**tables, "display": display})
    except Exception as e:  # noqa: BLE001
        entry_result.update(status="runtime-error", error=describe(e))
    entry_result["stdout"] = out.text()
    entry_result["stderr"] = err.text()
    entry_result["ms"] = ms(t)
    result["cases"].append(entry_result)


# Delta Lake's SQL extension and catalog are switched on only for jobs that use Delta: an explicit `"delta": true` in
# job.json, or the word "delta" anywhere in the learner's file (format("delta"), `from delta.tables import ...`,
# USING DELTA). Every other job builds exactly the session it always did. Each job has its own container and /tmp, so
# Delta tables a job writes under /tmp are private to it and gone when it ends.
DELTA_WORD = re.compile(r"\bdelta\b", re.IGNORECASE)
DELTA_CONF = {
    "spark.sql.extensions": "io.delta.sql.DeltaSparkSessionExtension",
    "spark.sql.catalog.spark_catalog": "org.apache.spark.sql.delta.catalog.DeltaCatalog",
    # Delta rebuilds a table's state with 50 partitions by default; on local[2] with tiny tables that is pure overhead.
    "spark.databricks.delta.snapshotPartitions": "2",
}


def uses_delta(job: dict, source: str) -> bool:
    if job.get("delta") is True:
        return True
    if job.get("tool_mode") == "sql":
        return bool(re.search(r"\busing\s+delta\b|\bdelta\s*\.", source, re.IGNORECASE))
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(source).readline))
        names = [t.string for t in tokens if t.type == tokenize.NAME]
        if any(names[i] in ("from", "import") and names[i+1] == "delta" for i in range(len(names)-1)):
            return True
        for t in tokens:
            if t.type == tokenize.NAME and t.string == "DeltaTable":
                return True
            if t.type == tokenize.STRING:
                try: value = ast.literal_eval(t.string)
                except (ValueError, SyntaxError): continue
                if isinstance(value, str) and (value.strip().lower() == "delta" or re.search(r"\busing\s+delta\b|\bdelta\s*\.", value, re.IGNORECASE)): return True
    except tokenize.TokenError:
        pass
    return False


def main() -> None:
    job = json.loads(JOB.read_text())
    result: dict = {"status": "ok", "mode": job["mode"], "cases": [], "timings": {}}

    # 1. Syntax, before paying for Spark.
    try:
        if job.get("tool_mode") != "sql":
            compile(SOLUTION.read_text(), "solution.py", "exec")
    except SyntaxError as e:
        result["status"] = "syntax-error"
        result["error"] = {"type": type(e).__name__, "message": e.msg, "line": e.lineno, "column": e.offset, "text": (e.text or "").rstrip("\n")}
        return finish(result)

    # 2. Real Spark, loopback only.
    t = time.perf_counter()
    from pyspark.sql import SparkSession

    builder = (
        SparkSession.builder.master("local[2]")
        .appName("runtime-school")
        .config("spark.driver.host", "127.0.0.1")
        .config("spark.driver.bindAddress", "127.0.0.1")
        .config("spark.driver.memory", job.get("driver_memory", "2g"))
        .config("spark.ui.enabled", "false")
        .config("spark.ui.showConsoleProgress", "false")
        .config("spark.sql.shuffle.partitions", str(job.get("shuffle_partitions", 4)))
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.local.dir", "/tmp/spark")
        .config("spark.sql.warehouse.dir", "/tmp/work/warehouse")
    )
    delta = uses_delta(job, SOLUTION.read_text())
    if delta:
        for key, value in DELTA_CONF.items():
            builder = builder.config(key, value)
    spark = builder.getOrCreate()
    spark.sparkContext.setLogLevel("ERROR")
    result["timings"]["spark_start_ms"] = ms(t)
    result["engine"] = {
        "spark": spark.version,
        "python": sys.version.split()[0],
        "java": spark.sparkContext._jvm.java.lang.System.getProperty("java.version"),
    }
    if delta:
        result["features"] = ["delta"]
    emit("state", "spark-ready")

    if job["mode"] == "scenario":
        from tool_scenarios import run as run_scenario
        run_scenario(spark, job, result)
    elif job["mode"] == "tool":
        from tool_runtime import run as run_tool
        run_tool(spark, job, result)
    else:
        {"script": run_script, "project": run_project}.get(job["mode"], run_cases)(spark, job, result)

    failed = [c["status"] for c in result["cases"] if c["status"] not in ("ok", "too-many-rows")]
    if failed:
        result["status"] = failed[0]
    try:
        spark.stop()
    except Exception:  # noqa: BLE001 - the learner may have stopped it already
        pass
    finish(result)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001 - a harness failure is still a structured result
        emit("result", json.dumps({"status": "crashed", "error": {"type": type(e).__name__, "message": str(e)[:600]}, "cases": [], "timings": {"total_ms": ms(T0)}}))
        raise
