"""Content gate for every authored PySpark item and lesson (docs/pyspark/plan.md §7). Needs Docker and the image.

    python3 -I -m unittest discover -s services/spark-runner/tests -v

For each item in private/: the reference passes every case on real Spark; every known-wrong answer fails at least the
cases it's meant to fail; the recorded expected results equal an independent plain-Python oracle. For each lesson: each
example prints exactly what was recorded, and each error example raises the recorded error.
"""

from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from runner import api  # noqa: E402

ITEMS = sorted(p.name for p in (ROOT / "private").iterdir() if (p / "reference.py").is_file())
# Predict-the-output items: a program whose real output is the answer (no reference, no hidden cases).
PREDICT = sorted(p.stem for p in api.PUBLIC_ITEMS.glob("*.json") if not p.stem.endswith(".expected") and json.loads(p.read_text()).get("kind") == "predict")
LESSONS = sorted(p.stem for p in api.PUBLIC_LESSONS.glob("PS-L*.json") if not p.stem.endswith(".recorded"))

pool = ThreadPoolExecutor(max_workers=3)
jobs: dict = {}


def setUpModule():
    for item in ITEMS:
        private = ROOT / "private" / item
        jobs[(item, "reference")] = pool.submit(api.check, item, (private / "reference.py").read_text())
        for w in json.loads((private / "wrong.json").read_text()):
            jobs[(item, w["name"])] = pool.submit(api.check, item, w["code"])
    for item in PREDICT:
        spec = json.loads((api.PUBLIC_ITEMS / f"{item}.json").read_text())
        jobs[(item, "program")] = pool.submit(api.playground, spec["dataset"]["id"], spec["program"], None, None, spec.get("edition", "lesson"))
    for lesson in LESSONS:
        spec = json.loads((api.PUBLIC_LESSONS / f"{lesson}.json").read_text())
        for b in spec["blocks"]:
            if b["kind"] in ("example", "error-example"):
                jobs[(lesson, b["id"])] = pool.submit(api.playground, spec["dataset"]["id"], b["code"], None, None, spec["dataset"]["edition"])


def oracle(item: str):
    spec = importlib.util.spec_from_file_location(f"oracle_{item.replace('-', '_')}", ROOT / "private" / item / "oracle.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.expected_rows


class Items(unittest.TestCase):
    def test_there_is_content(self):
        # Every public item has private material and the other way round.
        public = sorted(p.stem for p in api.PUBLIC_ITEMS.glob("*.json") if not p.stem.endswith(".expected"))
        self.assertEqual(sorted(ITEMS + PREDICT), public)
        self.assertIn("PS-L010", LESSONS)

    def test_references_pass_every_case(self):
        for item in ITEMS:
            r = jobs[(item, "reference")].result()
            with self.subTest(item):
                self.assertTrue(r["passed"], [c for c in r["checks"] if not c["passed"]])
                self.assertEqual(r["engine"]["spark"], "4.0.1")

    def test_wrong_answers_fail_where_intended(self):
        for item in ITEMS:
            for w in json.loads((ROOT / "private" / item / "wrong.json").read_text()):
                r = jobs[(item, w["name"])].result()
                failed = {c["id"] for c in r["checks"] if not c["passed"]}
                with self.subTest(f"{item}: {w['name']}"):
                    self.assertFalse(r["passed"])
                    self.assertTrue(set(w["must_fail"]) <= failed, f"expected {w['must_fail']} to fail, failed: {sorted(failed)}")

    def test_expected_results_equal_an_independent_oracle(self):
        for item in ITEMS:
            spec = json.loads((api.PUBLIC_ITEMS / f"{item}.json").read_text())
            expected_rows = oracle(item)
            loaded = api.load_item(item)
            cases = [*spec["visible"], *json.loads((ROOT / "private" / item / "hidden.json").read_text())]
            for c in cases:
                # The same files the runner mounts: CSV, JSON Lines or text, from an edition or a hidden fixture.
                tables = api._inputs(loaded, c, private=c not in spec["visible"])
                recorded = json.loads((ROOT / "private" / item / "expected" / f"{c['id']}.json").read_text())
                with self.subTest(f"{item}/{c['id']}"):
                    self.assertEqual(Counter(map(json.dumps, recorded["rows"])), Counter(map(json.dumps, expected_rows(tables))))
                    self.assertEqual([f["name"] for f in recorded["schema"]], spec["output"]["columns"])

    def test_predictions_match_real_output(self):
        """Each predict item's program prints exactly what was recorded; listed wrong predictions don't match it."""
        norm = lambda t: "\n".join(line.rstrip() for line in t.replace("\r", "").split("\n")).rstrip("\n")  # noqa: E731
        for item in PREDICT:
            r = jobs[(item, "program")].result()
            recorded = json.loads((api.PUBLIC_ITEMS / f"{item}.expected.json").read_text())["output"]
            with self.subTest(item):
                self.assertEqual(r["status"], "ok", r["cases"][0].get("error"))
                self.assertEqual(r["cases"][0]["stdout"], recorded)
                wrong = ROOT / "private" / item / "wrong.json"
                self.assertTrue(wrong.is_file(), "predict items list plausible wrong predictions")
                for w in json.loads(wrong.read_text()):
                    self.assertNotEqual(norm(w), norm(recorded), w)

    def test_public_files_never_hold_hidden_data(self):
        for item in ITEMS:
            public = json.loads((api.PUBLIC_ITEMS / f"{item}.expected.json").read_text())
            hidden = [c["id"] for c in json.loads((ROOT / "private" / item / "hidden.json").read_text())]
            with self.subTest(item):
                self.assertEqual(set(public["visible"]), {c["id"] for c in json.loads((api.PUBLIC_ITEMS / f"{item}.json").read_text())["visible"]})
                self.assertFalse(set(hidden) & set(public["visible"]))
                self.assertTrue(all(isinstance(label, str) for label in public["hidden"]))
                self.assertLessEqual(max(len(v["rows"]) for v in public["visible"].values()), api.PUBLIC_ROWS)


class Lessons(unittest.TestCase):
    def test_examples_print_what_was_recorded(self):
        for lesson in LESSONS:
            spec = json.loads((api.PUBLIC_LESSONS / f"{lesson}.json").read_text())
            recorded = json.loads((api.PUBLIC_LESSONS / f"{lesson}.recorded.json").read_text())["examples"]
            for b in spec["blocks"]:
                if b["kind"] not in ("example", "error-example"):
                    continue
                r = jobs[(lesson, b["id"])].result()
                case = r["cases"][0]
                with self.subTest(f"{lesson} {b['id']}"):
                    self.assertEqual(case.get("stdout", ""), recorded[b["id"]]["stdout"])
                    if b["kind"] == "error-example":
                        self.assertEqual(case["error"]["type"], b["error"])
                    else:
                        self.assertEqual(r["status"], "ok", case.get("error"))

    def test_lesson_points_at_real_items(self):
        for lesson in LESSONS:
            spec = json.loads((api.PUBLIC_LESSONS / f"{lesson}.json").read_text())
            for item in [*spec["challenges"], *spec["practice"]]:
                self.assertTrue((api.PUBLIC_ITEMS / f"{item}.json").is_file(), item)
            for q in spec["concept"]:
                self.assertIn(q["answer"], range(len(q["choices"])))

    def test_concept_check_answers_hold_on_spark(self):
        """PS-L010's concept check, proved on Spark: Python's `and` and missing parentheses raise; a null total is dropped."""
        code = (
            "from pyspark.sql import functions as F\n"
            "for name, make in [('and', lambda: orders.filter((F.col('status') == 'paid') and (F.col('total') >= 100))),\n"
            "                   ('no parens', lambda: orders.filter(F.col('status') == 'paid' & F.col('total') >= 100))]:\n"
            "    try:\n        make()\n        print(name, 'ok')\n    except Exception as e:\n        print(name, type(e).__name__)\n"
            "nul = spark.createDataFrame([('A', None), ('B', 150.0)], 'order_id string, total double')\n"
            "print('kept', [r.order_id for r in nul.filter(F.col('total') >= 100).collect()])\n"
            "print('same', orders.filter(F.col('channel') == 'web').columns == orders.columns)\n"
        )
        r = api.playground("PS-D01", code, edition="lesson")
        self.assertEqual(r["cases"][0]["stdout"].split("\n")[:4], ["and PySparkValueError", "no parens PySparkValueError", "kept ['B']", "same True"])


if __name__ == "__main__":
    unittest.main()
