"""Acceptance tests for the local real-Spark runner (docs/pyspark/plan.md §6). Needs Docker and the built image.

    docker build -t runtime-spark-runner:4.0.1-2 services/spark-runner
    python3 -I -m unittest discover -s services/spark-runner/tests -v

PS_RUNNER_IMAGE=<tag> runs everything against another image. `Extensions` needs 4.0.1-2 or later and skips otherwise.

Every submission here runs in its own real Spark container. Independent jobs run three at a time.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import subprocess
import sys
import textwrap
import threading
import time
import unittest
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from runner import api, sandbox  # noqa: E402
from runner.grader import grade_case  # noqa: E402

ITEM = "PS-Q0046"
PRIVATE = ROOT / "private" / ITEM
D01 = ROOT / "fixtures" / "PS-D01" / "1.1.0"


def src(s: str) -> str:
    return textwrap.dedent(s).lstrip("\n")


HEAD = "from pyspark.sql import functions as F\n\n"
CORRECT = {
    "reference": (PRIVATE / "reference.py").read_text(),
    "sql_string": HEAD + "def solve(orders):\n    return orders.where(\"status = 'paid' AND total >= 100\")\n",
    "chained": HEAD + "def solve(orders):\n    return orders.filter(F.col('status').isin('paid')).filter(F.col('total') >= F.lit(100.00))\n",
}
WRONG = {
    # A wrong comparison: 100.00 itself is dropped.
    "boundary": (HEAD + "def solve(orders):\n    return orders.filter((F.col('status') == 'paid') & (F.col('total') > 100))\n", {"threshold"}),
    # Missing columns.
    "columns": (HEAD + "def solve(orders):\n    return orders.filter((F.col('status') == 'paid') & (F.col('total') >= 100)).select('order_id', 'total')\n", None),
    # Duplicate mistake: removes the twice-delivered row.
    "dedupe": (HEAD + "def solve(orders):\n    return orders.filter((F.col('status') == 'paid') & (F.col('total') >= 100)).dropDuplicates()\n", {"duplicates"}),
    # Ignores the total rule.
    "status_only": (HEAD + "def solve(orders):\n    return orders.filter(F.col('status') == 'paid')\n", None),
    # A type change: total becomes double.
    "retyped": (HEAD + "def solve(orders):\n    out = orders.filter((F.col('status') == 'paid') & (F.col('total') >= 100))\n    return out.withColumn('total', F.col('total').cast('double'))\n", None),
}

pool = ThreadPoolExecutor(max_workers=3)
_futures: dict = {}


def check(name: str, code: str):
    if name not in _futures:
        _futures[name] = pool.submit(api.check, ITEM, code)
    return _futures[name].result()


def run(name: str, code: str):
    if name not in _futures:
        _futures[name] = pool.submit(api.run, ITEM, code)
    return _futures[name].result()


def setUpModule():
    # Start the independent jobs now; each test waits for the one it needs.
    for name, code in CORRECT.items():
        _futures.setdefault(f"ok:{name}", pool.submit(api.check, ITEM, code))
    for name, (code, _) in WRONG.items():
        _futures.setdefault(f"bad:{name}", pool.submit(api.check, ITEM, code))


class Reproducibility(unittest.TestCase):
    def test_image_is_pinned(self):
        dockerfile = (ROOT / "Dockerfile").read_text()
        froms = [line for line in dockerfile.splitlines() if line.startswith("FROM ")]
        self.assertEqual(len(froms), 2)
        self.assertTrue(all("@sha256:" in line for line in froms), froms)
        reqs = (ROOT / "requirements.txt").read_text()
        self.assertIn("pyspark==4.0.1", reqs)
        self.assertEqual(reqs.count("--hash=sha256:"), 2)
        # Image 4.0.1-2 additions: every package pinned with == and hashed, every downloaded jar checked by SHA-256.
        extras = [line for line in (ROOT / "requirements-extras.txt").read_text().splitlines() if line and not line.startswith(("#", " "))]
        self.assertTrue(extras and all("==" in line and line.endswith("\\") for line in extras), extras)
        adds = [line for line in dockerfile.splitlines() if line.startswith("ADD ")]
        self.assertTrue(all("--checksum=sha256:" in line for line in adds), adds)

    def test_dataset_is_deterministic(self):
        manifest = json.loads((D01 / "manifest.json").read_text())
        subprocess.run([sys.executable, "-I", str(ROOT / "datasets" / "d01_retail.py")], check=True, capture_output=True)
        self.assertEqual(json.loads((D01 / "manifest.json").read_text()), manifest)
        for edition, tables in manifest["editions"].items():
            for table, meta in tables.items():
                self.assertEqual(hashlib.sha256((D01 / meta["file"]).read_bytes()).hexdigest(), meta["sha256"], f"{edition}/{table}")

    def test_reference_matches_independent_oracle(self):
        """The expected results recorded from real Spark equal a plain-Python implementation of the rules."""
        sys.path.insert(0, str(PRIVATE))
        from oracle import expected_rows

        cases = {"sample": D01 / "lesson" / "orders.csv", "practice": D01 / "practice" / "orders.csv"}
        for c in json.loads((PRIVATE / "hidden.json").read_text()):
            cases.setdefault(c["id"], PRIVATE / "hidden" / c["id"] / "orders.csv")
        for case, path in cases.items():
            recorded = json.loads((PRIVATE / "expected" / f"{case}.json").read_text())
            self.assertEqual(Counter(map(json.dumps, recorded["rows"])), Counter(map(json.dumps, expected_rows({"orders": path}))), case)
            self.assertEqual([c["type"] for c in recorded["schema"]], ["string", "string", "date", "string", "string", "decimal(10,2)"])
        # The hidden cases really exercise their edges.
        with (D01 / "practice" / "orders.csv").open() as f:
            practice = list(csv.DictReader(f))
        self.assertGreater(len(practice) - len({tuple(r.values()) for r in practice}), 0, "practice edition has duplicates")


class Grading(unittest.TestCase):
    def test_correct_solutions_pass_every_case(self):
        for name in CORRECT:
            r = check(f"ok:{name}", CORRECT[name])
            with self.subTest(name):
                self.assertEqual(r["status"], "ok", r.get("error"))
                self.assertTrue(r["passed"], [c for c in r["checks"] if not c["passed"]])
                self.assertEqual(r["score"], "8/8")
                self.assertEqual(r["engine"]["spark"], "4.0.1")

    def test_wrong_solutions_fail_on_the_intended_cases(self):
        for name, (code, failing) in WRONG.items():
            r = check(f"bad:{name}", code)
            with self.subTest(name):
                self.assertFalse(r["passed"])
                failed = {c["id"] for c in r["checks"] if not c["passed"]}
                if failing is not None:
                    self.assertEqual(failed, failing)

    def test_feedback_names_the_mistake(self):
        msg = lambda name, case: next(c["message"] for c in check(f"bad:{name}", WRONG[name][0])["checks"] if c["id"] == case)  # noqa: E731
        self.assertIn("missing columns customer_id, order_date, status, channel", msg("columns", "sample"))
        self.assertIn("different number of times", msg("dedupe", "duplicates"))
        self.assertIn("should be decimal(10,2), but it is double", msg("retyped", "sample"))
        self.assertIn("should be dropped are included", msg("status_only", "missing"))

    def test_hidden_cases_never_reveal_data(self):
        r = check("bad:status_only", WRONG["status_only"][0])
        for c in r["checks"]:
            if not c["visible"]:
                self.assertNotIn("missing", c)
                self.assertNotIn("unexpected", c)
                self.assertNotIn("stdout", c)
        sample = next(c for c in r["checks"] if c["id"] == "sample")
        self.assertEqual(sample["unexpected"], [["O00008", "C0001", "2026-04-03", "paid", "web", "59.50"]])

    def test_grader_order_sensitivity(self):
        schema = [{"name": "a", "type": "int", "nullable": True}]
        e = {"schema": schema, "rows": [[1], [2]]}
        a = {"status": "ok", "schema": schema, "rows": [[2], [1]]}
        self.assertTrue(grade_case(e, a, order_sensitive=False, reveal=False)["passed"])
        self.assertIn("wrong order", grade_case(e, a, order_sensitive=True, reveal=False)["message"])


class Diagnostics(unittest.TestCase):
    def test_run_shows_a_real_preview(self):
        r = run("run:reference", CORRECT["reference"])
        case = r["cases"][0]
        self.assertEqual(r["status"], "ok")
        self.assertEqual(case["row_count"], 3)
        self.assertEqual([c["name"] for c in case["schema"]], ["order_id", "customer_id", "order_date", "status", "channel", "total"])
        self.assertEqual(case["rows"][0], ["O00001", "C0001", "2026-06-11", "paid", "store", "117.99"])
        self.assertGreater(r["timings"]["spark_start_ms"], 0)

    def test_syntax_error(self):
        r = run("syntax", "def solve(orders)\n    return orders\n")
        self.assertEqual(r["status"], "syntax-error")
        self.assertEqual(r["error"]["line"], 1)
        self.assertNotIn("spark_start_ms", r["timings"], "Spark should not start for a syntax error")

    def test_spark_analysis_error_points_at_the_learners_line(self):
        r = run("typo", HEAD + "def solve(orders):\n    return orders.filter(F.col('stauts') == 'paid')\n")
        e = r["cases"][0]["error"]
        self.assertEqual(r["status"], "runtime-error")
        self.assertEqual(e["type"], "AnalysisException")
        self.assertTrue(e["condition"].startswith("UNRESOLVED_COLUMN"), e)
        self.assertEqual(e["line"], 4)
        self.assertIn("stauts", e["message"])

    def test_python_error_and_contract_errors(self):
        r = run("zerodiv", "def solve(orders):\n    return 1 / 0\n")
        self.assertEqual((r["status"], r["cases"][0]["error"]["type"], r["cases"][0]["error"]["line"]), ("runtime-error", "ZeroDivisionError", 2))
        r = run("not-df", "def solve(orders):\n    return orders.collect()\n")
        self.assertEqual(r["status"], "contract-error")
        self.assertIn("must return a PySpark DataFrame, but it returned list", r["cases"][0]["error"]["message"])
        r = run("no-solve", "x = 1\n")
        self.assertIn("Define a function named solve(orders)", r["cases"][0]["error"]["message"])


def hidden_only_values() -> set[str]:
    """Cell values in PS-Q0046's own hidden fixtures that appear nowhere in the public lesson edition: if any comes back
    in a check result, hidden input data leaked."""
    public = {cell for row in csv.reader((D01 / "lesson" / "orders.csv").read_text().splitlines()) for cell in row}
    cells = {cell for f in (PRIVATE / "hidden").glob("*/orders.csv") for row in list(csv.reader(f.read_text().splitlines()))[1:] for cell in row}
    return {c for c in cells - public if re.fullmatch(r"[A-Z]\d{4}", c)}


# Report as the harness does and exit before it can: the container's report is then whatever the learner wrote.
FORGE = HEAD + """import json, os, sys
job = json.load(open("/job/job.json"))
def forged(case):
    return {CASE}
print("\\n@@ps result " + json.dumps({{"status": "ok", "mode": "capture", "cases": {CASES}, "timings": {{}}}}), file=sys.__stdout__, flush=True)
os._exit(0)
def solve(orders):
    return orders
"""
SAMPLE = json.loads((api.PUBLIC_ITEMS / f"{ITEM}.expected.json").read_text())["visible"]["sample"]
ATTACKS = {
    # Every case claims the sample's public expected rows, so a run whose cases were all "ok" would pass.
    "forge_public_rows": FORGE.format(CASE=repr({"status": "ok", "schema": SAMPLE["schema"], "rows": SAMPLE["rows"], "stdout": "", "stderr": ""}) + " | {'id': case['id']}", CASES="[forged(c) for c in job['cases']]"),
    # The right cases plus one it wasn't given, and one twice.
    "forge_extra_cases": FORGE.format(CASE="{'id': case['id'], 'status': 'ok', 'schema': [], 'rows': []}", CASES="[forged(c) for c in job['cases']] + [forged({'id': 'sample'}), forged({'id': 'extra'})]"),
    # Exit before any report.
    "early_exit": HEAD + "import os\nos._exit(0)\ndef solve(orders):\n    return orders\n",
    # Put hidden input rows in an error message, an exception's name, a column name and a struct type.
    "leak_message": HEAD + "def solve(orders):\n    raise ValueError('LEAK ' + repr([tuple(r) for r in orders.collect()]))\n",
    "leak_exception_name": HEAD + "def solve(orders):\n    ids = '_'.join(r['order_id'] for r in orders.collect())\n    raise type('Leak_' + ids, (Exception,), {})('x')\n",
    "leak_column": HEAD + "def solve(orders):\n    ids = '_'.join(r['order_id'] for r in orders.collect()) or 'none'\n    return orders.withColumn('total', F.struct(F.col('total').alias(ids))).withColumn(ids, F.lit(1))\n",
    # Print what /data holds in the visible run.
    "list_data": HEAD + "import os\ndef solve(orders):\n    print(sorted(os.listdir('/data')))\n    return orders\n",
}
# A technique item answered without the technique, forging the plan evidence the harness would report.
TECHNIQUE_ITEM = "PS-Q0399"
FORGE_PLAN = """import json, os, sys
sys.path.insert(0, "/opt/runner")
import harness as H
job = json.load(open("/job/job.json"))
cases = []
for c in job["cases"]:
    counts = {}
    for row in H.read_table(spark, c["tables"]["trips"]).collect():
        counts[row["payment_type"]] = counts.get(row["payment_type"], 0) + 1
    df = spark.createDataFrame(list(counts.items()), "payment_type STRING, count BIGINT")
    rows, _ = H.rows_of(df, 10000)
    cases.append({"id": c["id"], "status": "ok", "schema": H.schema_of(df), "rows": rows, "plan_nodes": ["HashAggregate"], "stdout": "", "stderr": ""})
print("\\n@@ps result " + json.dumps({"status": "ok", "mode": "capture", "cases": cases, "timings": {}}), file=sys.__stdout__, flush=True)
os._exit(0)
def solve(trips):
    return trips
"""


class Adversarial(unittest.TestCase):
    """Learner code controls everything inside its container, including what the container reports. These are the
    attacks an audit reproduced (a forged report, hidden rows in an error message) and variations on them."""

    @classmethod
    def setUpClass(cls):
        for name, code in ATTACKS.items():
            _futures.setdefault(f"attack:{name}", pool.submit(api.check, ITEM, code))
        _futures.setdefault("attack:forge_plan", pool.submit(api.check, TECHNIQUE_ITEM, FORGE_PLAN))

    def attack(self, name: str) -> dict:
        return _futures[f"attack:{name}"].result()

    def test_forged_reports_never_pass(self):
        for name in ("forge_public_rows", "forge_extra_cases", "early_exit"):
            r = self.attack(name)
            with self.subTest(name):
                self.assertFalse(r["passed"])
                hidden = [c for c in r["checks"] if not c["visible"]]
                self.assertTrue(hidden and all(not c["passed"] for c in hidden), r["checks"])

    def test_a_forged_plan_does_not_prove_a_technique(self):
        r = self.attack("forge_plan")
        technique = next(c for c in r["checks"] if c["id"] == "technique")
        self.assertFalse(r["passed"])
        self.assertFalse(technique["passed"])
        self.assertIn("doesn't call", technique["message"])
        # The rows themselves were right: only the technique is missing.
        self.assertTrue(all(c["passed"] for c in r["checks"] if c["id"] != "technique"), r["checks"])

    def test_hidden_inputs_never_come_back(self):
        secrets = hidden_only_values()
        self.assertIn("D0001", secrets)
        for name in ("leak_message", "leak_exception_name", "leak_column", "list_data"):
            r = self.attack(name)
            text = json.dumps(r)
            with self.subTest(name):
                self.assertFalse(r["passed"])
                self.assertEqual([s for s in secrets if s in text], [])
                for c in r["checks"]:
                    if not c["visible"]:
                        self.assertEqual(set(c) - {"id", "visible", "label", "passed", "message"}, set(), c)

    def test_the_visible_run_has_no_hidden_inputs(self):
        sample = next(c for c in self.attack("list_data")["checks"] if c["id"] == "sample")
        self.assertEqual(sample["stdout"].strip(), "['sample']")

    def test_visible_feedback_still_explains(self):
        sample = next(c for c in self.attack("leak_message")["checks"] if c["id"] == "sample")
        self.assertEqual(sample["error"]["type"], "ValueError")
        self.assertIn("LEAK", sample["message"])


class Containment(unittest.TestCase):
    def probe(self, name: str, body: str) -> dict:
        """Run learner code that reports what it found through print(), and return the parsed report."""
        code = "import json, os\nreport = {}\n" + src(body) + "\nprint(json.dumps(report))\ndef solve(orders):\n    return orders\n"
        r = run(f"probe:{name}", code)
        self.assertEqual(r["status"], "ok", r)
        return json.loads(r["cases"][0]["stdout"].strip().splitlines()[-1])

    def test_private_files_are_not_reachable(self):
        found = self.probe("files", """
            hits = []
            for top in ("/", ):
                for d, dirs, files in os.walk(top):
                    if d.startswith(("/proc", "/sys", "/dev", "/usr", "/opt/java")):
                        dirs[:] = []
                        continue
                    for f in files:
                        if f in ("reference.py", "hidden.json", "oracle.py") or "/expected" in d:
                            hits.append(os.path.join(d, f))
            report["hits"] = hits
            report["data"] = sorted(os.listdir("/data"))
            report["job"] = sorted(os.listdir("/job"))
            report["has_out"] = os.path.exists("/out")
            # Every mount the learner could write to (rw), apart from the kernel's own pseudo-filesystems.
            pseudo = ("proc", "sysfs", "cgroup", "cgroup2", "devpts", "mqueue", "devtmpfs")
            mounts = [line.split() for line in open("/proc/mounts")]
            report["writable"] = sorted({m[1] for m in mounts if "rw" in m[3].split(",") and m[2] not in pseudo and not m[1].startswith(("/proc", "/sys", "/dev"))})
        """)
        self.assertEqual(found["hits"], [])
        self.assertEqual(found["data"], ["sample"])
        self.assertEqual(found["job"], ["job.json", "solution.py"])
        self.assertFalse(found["has_out"], "there is no writable output mount")
        self.assertEqual(found["writable"], ["/tmp"])

    def test_no_network(self):
        found = self.probe("net", """
            import socket
            for name, target in {"ip": ("1.1.1.1", 53), "dns": ("pypi.org", 443)}.items():
                try:
                    socket.create_connection(target, timeout=3).close()
                    report[name] = "connected"
                except OSError as e:
                    report[name] = type(e).__name__
            # The kernel lists placeholder tunnel devices in every namespace; only interfaces that are up can carry traffic.
            up = lambda i: int(open(f"/sys/class/net/{i}/flags").read(), 16) & 1
            report["interfaces_up"] = sorted(i for i in os.listdir("/sys/class/net") if os.path.isdir(f"/sys/class/net/{i}") and up(i))
        """)
        self.assertNotEqual(found["ip"], "connected")
        self.assertNotEqual(found["dns"], "connected")
        self.assertEqual(found["interfaces_up"], ["lo"])

    def test_filesystem_user_and_capabilities(self):
        found = self.probe("fs", """
            def attempt(fn):
                try:
                    fn()
                    return "allowed"
                except OSError as e:
                    return e.strerror
            report["root"] = attempt(lambda: open("/opt/runner/x", "w").write("x"))
            report["job"] = attempt(lambda: open("/job/x", "w").write("x"))
            report["data"] = attempt(lambda: open("/data/x", "w").write("x"))
            report["etc"] = attempt(lambda: open("/etc/passwd", "a").write("x"))
            def fill():
                with open("/tmp/fill", "wb") as f:
                    for _ in range(700):
                        f.write(b"\\0" * (1 << 20))
            report["tmp_cap"] = attempt(fill)
            os.remove("/tmp/fill")
            with open("/tmp/run.sh", "w") as f:
                f.write("#!/bin/sh\\necho hi\\n")
            os.chmod("/tmp/run.sh", 0o755)
            import subprocess
            report["tmp_exec"] = attempt(lambda: subprocess.run(["/tmp/run.sh"], check=True))
            report["uid"] = os.getuid()
            report["cap_eff"] = next(l.split()[1] for l in open("/proc/self/status") if l.startswith("CapEff"))
        """)
        self.assertEqual(found["root"], "Read-only file system")
        self.assertEqual(found["job"], "Read-only file system")
        self.assertEqual(found["data"], "Read-only file system")
        # A non-root user is refused by file permissions before the read-only mount is reached; either is a denial.
        self.assertIn(found["etc"], ("Read-only file system", "Permission denied"))
        self.assertEqual(found["tmp_cap"], "No space left on device")
        self.assertEqual(found["tmp_exec"], "Permission denied")
        self.assertEqual(found["uid"], 10001)
        self.assertEqual(found["cap_eff"], "0000000000000000")

    def test_process_limit(self):
        found = self.probe("pids", """
            import subprocess
            procs = []
            try:
                for _ in range(700):
                    procs.append(subprocess.Popen(["sleep", "30"]))
                report["stopped_at"] = None
            except OSError as e:
                report["stopped_at"] = len(procs)
            for p in procs:
                p.kill()
                p.wait()
        """)
        self.assertIsNotNone(found["stopped_at"])
        self.assertLess(found["stopped_at"], sandbox.Limits().pids)

    def test_memory_limit(self):
        r = run("oom", "chunks = []\nfor _ in range(80):\n    chunks.append(bytearray(100 * 1024 * 1024))\ndef solve(orders):\n    return orders\n")
        self.assertEqual(r["status"], "memory-limit", r.get("error"))


class OutputLimits(unittest.TestCase):
    def test_some_extra_output_is_dropped_not_stored(self):
        """8 MB written straight to stdout: dropped (not stored), and the real result still comes back."""
        noisy = "import os\nfor _ in range(8):\n    os.write(1, b'x' * (1 << 20))\n" + CORRECT["reference"]
        r = sandbox.execute(Termination.JOB, noisy, Termination.INPUTS, sandbox.Limits(timeout_s=60))
        self.assertEqual(r["status"], "ok", r.get("error"))
        self.assertEqual(r["cases"][0]["row_count"], 3)
        self.assertGreater(r["container"]["output_dropped_bytes"], 7 * (1 << 20))
        self.assertLessEqual(len(r["container"]["log_tail"]), 4000)

    def test_endless_output_is_killed(self):
        """A producer that never stops is killed once it passes the flood limit, well before its wall clock."""
        t = time.perf_counter()
        flood = "import os\nwhile True:\n    os.write(1, b'x' * (1 << 20))\n"
        r = sandbox.execute(Termination.JOB, flood, Termination.INPUTS, sandbox.Limits(timeout_s=60))
        self.assertEqual(r["status"], "output-limit")
        self.assertLess(time.perf_counter() - t, 30)
        self.assertLessEqual(r["container"]["output_dropped_bytes"], sandbox.FLOOD_LIMIT + 4 * sandbox.RESULT_LIMIT)


class Playground(unittest.TestCase):
    def test_script_with_tables_and_display(self):
        r = api.playground("PS-D01", "display(orders.groupBy('status').count().orderBy('status'), 'by status')\nprint(customers.count())\n")
        case = r["cases"][0]
        self.assertEqual(r["status"], "ok")
        self.assertEqual(case["stdout"].strip(), "300")
        self.assertEqual(case["frames"][0]["name"], "by status")
        self.assertIn(["paid", 422], case["frames"][0]["rows"])
        with self.assertRaises(api.ItemError):
            api.playground("PS-D99", "print(1)")


def _image_has_extensions() -> bool:
    """Image 4.0.1-2 and later: pandas/pyarrow/numpy, delta-spark, spark-avro and the H2/SQLite JDBC drivers."""
    probe = "import pandas, pyarrow, numpy, delta, glob; assert glob.glob('/usr/local/lib/python3.11/site-packages/pyspark/jars/spark-avro_*.jar')"
    return subprocess.run(["docker", "run", "--rm", "--network", "none", "--entrypoint", "python3", sandbox.IMAGE, "-c", probe], capture_output=True).returncode == 0


class Extensions(unittest.TestCase):
    """pandas UDFs and MLlib, Avro, JDBC on file databases and Delta, all inside the same locked-down sandbox.
    Skipped unless the image provides them (PS_RUNNER_IMAGE=runtime-spark-runner:4.0.1-2 to test before it's the default)."""

    @classmethod
    def setUpClass(cls):
        if not _image_has_extensions():
            raise unittest.SkipTest(f"{sandbox.IMAGE} has no pandas/Delta/Avro/JDBC extensions")

    def script(self, code: str) -> list:
        """Run a Playground script that prints one JSON report per line; return the reports."""
        r = api.playground("PS-D01", "import json\n" + src(code))
        case = r["cases"][0]
        self.assertEqual((r["status"], case.get("error")), ("ok", None), case.get("stdout"))
        return [json.loads(line) for line in case["stdout"].splitlines() if line.startswith(("{", "["))]

    def test_pandas_udfs_arrow_and_mllib(self):
        (report,) = self.script("""
            import pandas as pd
            from pyspark.sql.functions import pandas_udf
            from pyspark.ml import Pipeline
            from pyspark.ml.feature import VectorAssembler
            from pyspark.ml.regression import LinearRegression
            spark.conf.set("spark.sql.execution.arrow.pyspark.enabled", "true")
            df = spark.createDataFrame([(1, 2.0, 1.0), (2, 4.0, 3.0), (3, 6.0, 5.0)], "id int, x double, y double")
            plus_one = pandas_udf(lambda s: s + 1, "double")
            def double_x(batches):
                for b in batches:
                    yield b.assign(x=b.x * 2)
            lr = Pipeline(stages=[VectorAssembler(inputCols=["x"], outputCol="f"), LinearRegression(featuresCol="f", labelCol="y")]).fit(df).stages[-1]
            print(json.dumps({
                "udf": sorted(r[0] for r in df.select(plus_one("x")).collect()),
                "map": sorted(r.x for r in df.mapInPandas(double_x, df.schema).collect()),
                "pandas": list(df.orderBy("id").toPandas().x),
                "lr": [round(lr.coefficients[0], 6), round(lr.intercept, 6)],
            }))
        """)
        self.assertEqual(report, {"udf": [3.0, 5.0, 7.0], "map": [4.0, 8.0, 12.0], "pandas": [2.0, 4.0, 6.0], "lr": [1.0, -1.0]})

    def test_file_formats_and_jdbc_round_trip(self):
        (report,) = self.script("""
            import sqlite3
            out = {}
            # Parquet's default codec (snappy) needs the native library the image unpacks outside noexec /tmp.
            for fmt in ("parquet", "orc", "avro"):
                orders.write.format(fmt).save(f"/tmp/out/{fmt}")
                out[fmt] = spark.read.format(fmt).load(f"/tmp/out/{fmt}").exceptAll(orders).count()
            con = sqlite3.connect("/tmp/shop.db")
            con.execute("CREATE TABLE stores (store_id INTEGER, city TEXT)")
            con.executemany("INSERT INTO stores VALUES (?, ?)", [(1, "Austin"), (2, "Boston")])
            con.commit()
            out["sqlite_read"] = sorted(tuple(r) for r in spark.read.jdbc("jdbc:sqlite:/tmp/shop.db", "stores").collect())
            orders.coalesce(1).write.jdbc("jdbc:sqlite:/tmp/shop.db", "orders")
            out["sqlite_written"] = con.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
            orders.write.jdbc("jdbc:h2:/tmp/h2/shop", "orders")
            back = spark.read.jdbc("jdbc:h2:/tmp/h2/shop", "orders")
            out["h2"] = [back.count(), back.exceptAll(orders).count(), back.schema.simpleString() == orders.schema.simpleString()]
            out["delta_conf"] = spark.conf.get("spark.sql.extensions", "unset")
            print(json.dumps(out))
        """)
        self.assertEqual(report, {"parquet": 0, "orc": 0, "avro": 0, "sqlite_read": [[1, "Austin"], [2, "Boston"]], "sqlite_written": 2006, "h2": [2006, 0, True], "delta_conf": "unset"})

    def test_delta_write_update_merge_time_travel_history(self):
        (report,) = self.script("""
            from delta.tables import DeltaTable
            from pyspark.sql import functions as F
            path = "/tmp/delta/paid"
            orders.where("status = 'paid'").select("order_id", "status").write.format("delta").save(path)
            t = DeltaTable.forPath(spark, path)
            t.update(F.col("order_id") == "O00003", {"status": F.lit("refunded")})
            new = spark.createDataFrame([("O00003", "paid"), ("ZNEW1", "paid")], "order_id string, status string")
            t.alias("t").merge(new.alias("s"), "t.order_id = s.order_id").whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()
            v = lambda n: spark.read.format("delta").option("versionAsOf", n).load(path)
            status = lambda df: df.where("order_id = 'O00003'").first().status
            print(json.dumps({
                "counts": [v(0).count(), v(1).count(), v(2).count()],
                "O00003": [status(v(0)), status(v(1)), status(v(2))],
                "history": [list(r) for r in spark.sql(f"DESCRIBE HISTORY delta.`{path}`").orderBy("version").select("version", "operation").collect()],
            }))
        """)
        self.assertEqual(report, {"counts": [422, 422, 423], "O00003": ["paid", "refunded", "paid"], "history": [[0, "WRITE"], [1, "UPDATE"], [2, "MERGE"]]})


class DevBridge(unittest.TestCase):
    """The localhost bridge refuses other origins, hosts and non-JSON bodies, and reports real job states."""

    @classmethod
    def setUpClass(cls):
        import http.client
        import os
        import socket

        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            cls.port = s.getsockname()[1]
        env = {**os.environ, "PYSPARK_RUNNER_PORT": str(cls.port)}
        cls.proc = subprocess.Popen([sys.executable, "-I", str(ROOT / "dev_server.py")], env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        cls.proc.stdout.readline()
        cls.http = http.client

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait()
        cls.proc.stdout.close()

    def call(self, method, path, body=None, origin="http://localhost:3000", ctype="application/json", host=None):
        c = self.http.HTTPConnection("127.0.0.1", self.port, timeout=30)
        headers = {"Content-Type": ctype, "Host": host or f"127.0.0.1:{self.port}"}
        if origin:
            headers["Origin"] = origin
        c.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        r = c.getresponse()
        data = json.loads(r.read() or b"{}")
        return r.status, data, r.getheader("Access-Control-Allow-Origin")

    def test_refuses_other_origins_hosts_and_simple_posts(self):
        job = {"mode": "run", "item": ITEM, "code": "x"}
        self.assertEqual(self.call("POST", "/jobs", job, origin="https://evil.example")[0], 403)
        self.assertEqual(self.call("POST", "/jobs", job, origin=None)[0], 403)
        self.assertEqual(self.call("POST", "/jobs", job, ctype="text/plain")[0], 415)
        self.assertEqual(self.call("GET", "/health", host="attacker.example:80")[0], 403)
        self.assertEqual(self.call("POST", "/jobs", {"mode": "shell", "code": "x"})[0], 400)
        status, body, allow = self.call("GET", "/health")
        self.assertEqual((status, body["ok"], allow), (200, True, "http://localhost:3000"))

    def test_job_reports_its_states(self):
        status, job, _ = self.call("POST", "/jobs", {"mode": "check", "item": ITEM, "code": CORRECT["reference"]})
        self.assertEqual((status, job["state"]), (202, "queued"))
        seen, deadline = [], time.time() + 60
        while time.time() < deadline:
            state = self.call("GET", f"/jobs/{job['id']}")[1]
            if not seen or seen[-1] != state["state"]:
                seen.append(state["state"])
            if state["state"] in ("done", "error", "cancelled"):
                break
            time.sleep(0.1)
        self.assertEqual(seen[-1], "done")
        self.assertIn("checking", seen)
        self.assertTrue(state["result"]["passed"])


class Termination(unittest.TestCase):
    JOB = {"mode": "run", "entry": "solve", "inputs": ["orders"], "schemas": {"orders": json.loads((D01 / "manifest.json").read_text())["schemas"]["orders"]}, "preview_rows": 10, "max_rows": 10}
    INPUTS = {"sample": {"orders": D01 / "lesson" / "orders.csv"}}
    LOOP = "def solve(orders):\n    while True:\n        pass\n"

    def containers(self) -> set[str]:
        return set(subprocess.run(["docker", "ps", "-a", "--filter", "name=ps-job-", "--format", "{{.Names}}"], capture_output=True, text=True).stdout.split())

    def test_timeout_kills_everything(self):
        before = self.containers()
        t = time.perf_counter()
        r = sandbox.execute(self.JOB, self.LOOP, self.INPUTS, sandbox.Limits(timeout_s=15))
        self.assertEqual(r["status"], "timeout")
        self.assertLess(time.perf_counter() - t, 25)
        self.assertEqual(self.containers() - before, set())

    def test_container_stops_itself_if_the_host_dies(self):
        """Start a looping job, then abandon it as a dead host would: the container still ends on its own clock."""
        import tempfile

        job = {**self.JOB, "cases": [{"id": "sample", "tables": {"orders": {"path": "/data/sample/orders.csv", "schema": self.JOB["schemas"]["orders"]}}}]}
        with tempfile.TemporaryDirectory() as tmp:
            jobdir, data = Path(tmp, "job"), Path(tmp, "data", "sample")
            jobdir.mkdir()
            data.mkdir(parents=True)
            (jobdir / "job.json").write_text(json.dumps({k: v for k, v in job.items() if k != "schemas"}))
            (jobdir / "solution.py").write_text(self.LOOP)
            (data / "orders.csv").write_bytes((D01 / "lesson" / "orders.csv").read_bytes())
            name = "ps-job-abandoned-test"
            args = sandbox.docker_args(name, jobdir, data.parent, sandbox.Limits(timeout_s=5), sandbox.IMAGE)
            t = time.perf_counter()
            subprocess.run(args[:2] + ["-d"] + args[2:], check=True, capture_output=True)
            state = ""
            while time.perf_counter() - t < 45:
                state = subprocess.run(["docker", "inspect", "-f", "{{.State.Status}}", name], capture_output=True, text=True).stdout.strip()
                if state == "exited":
                    break
                time.sleep(1)
            elapsed = time.perf_counter() - t
            self.assertEqual(state, "exited")
            self.assertLess(elapsed, 5 + sandbox.SELF_KILL_GRACE_S + 10)
            self.assertEqual(sandbox.sweep(), 1)
            self.assertFalse(sandbox.container_exists(name))

    def test_cancel_kills_everything(self):
        before = self.containers()
        stop = threading.Event()
        threading.Timer(12, stop.set).start()
        t = time.perf_counter()
        r = sandbox.execute(self.JOB, self.LOOP, self.INPUTS, sandbox.Limits(timeout_s=60), cancel=stop)
        self.assertEqual(r["status"], "cancelled")
        self.assertLess(time.perf_counter() - t, 20)
        self.assertEqual(self.containers() - before, set())


if __name__ == "__main__":
    unittest.main()
