"""Every PySpark dataset (PS-D01 … PS-D15) is deterministic, matches its manifest, and loads on real Spark.

    python3 -I -m unittest discover -s services/spark-runner/tests -p test_datasets.py -v

For each generator in datasets/d??_*.py: running it again gives byte-identical files; every file's SHA-256 matches the
manifest; the app's snapshot matches the manifest; and real Spark reads every table of every edition with its declared
schema (FAILFAST, so a value that doesn't fit its type fails) and counts exactly the manifest's rows.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from runner import api  # noqa: E402

GENERATORS = sorted((ROOT / "datasets").glob("d[0-9][0-9]_*.py"))
PUBLIC = ROOT.parents[1] / "src" / "content" / "pyspark" / "datasets"


def manifest_of(dataset_id: str) -> tuple[Path, dict]:
    version, _ = api.PLAYGROUND[dataset_id]
    folder = ROOT / "fixtures" / dataset_id / version
    return folder, json.loads((folder / "manifest.json").read_text())


pool = ThreadPoolExecutor(max_workers=3)
counts: dict = {}


def setUpModule():
    # One Spark job per dataset edition: count every table, so FAILFAST parsing reads every row.
    for dataset_id, (_, editions) in api.PLAYGROUND.items():
        _, manifest = manifest_of(dataset_id)
        for edition in editions:
            tables = list(manifest["editions"][edition])
            code = "import json\nprint(json.dumps({t: globals()[t].count() for t in %r}))\n" % tables
            counts[(dataset_id, edition)] = pool.submit(api.playground, dataset_id, code, None, None, edition)


class Datasets(unittest.TestCase):
    def test_every_registry_dataset_is_built(self):
        registry = json.loads((ROOT.parents[1] / "src" / "content" / "pyspark" / "registry.json").read_text())
        self.assertEqual(sorted(api.PLAYGROUND), sorted(d["id"] for d in registry["datasets"]))

    def test_generators_are_deterministic(self):
        # Regenerating rewrites the files in place: let every Spark read finish first.
        for job in counts.values():
            job.result()
        for gen in GENERATORS:
            dataset_id = "PS-D" + gen.name[1:3]
            folder, before = manifest_of(dataset_id)
            snapshot = (PUBLIC / f"{dataset_id}.json").read_bytes()
            subprocess.run([sys.executable, "-I", str(gen)], check=True, capture_output=True)
            with self.subTest(dataset_id):
                self.assertEqual(json.loads((folder / "manifest.json").read_text()), before)
                self.assertEqual((PUBLIC / f"{dataset_id}.json").read_bytes(), snapshot)

    def test_files_match_their_manifest(self):
        for dataset_id in api.PLAYGROUND:
            folder, manifest = manifest_of(dataset_id)
            for edition, tables in manifest["editions"].items():
                for table, meta in tables.items():
                    with self.subTest(f"{dataset_id}/{edition}/{table}"):
                        self.assertEqual(hashlib.sha256((folder / meta["file"]).read_bytes()).hexdigest(), meta["sha256"])
                        self.assertIn(table, manifest["schemas"])
            self.assertIn("lesson", manifest["editions"])
            self.assertIn("practice", manifest["editions"])

    def test_snapshot_agrees_with_manifest(self):
        for dataset_id in api.PLAYGROUND:
            _, manifest = manifest_of(dataset_id)
            snap = json.loads((PUBLIC / f"{dataset_id}.json").read_text())
            with self.subTest(dataset_id):
                self.assertEqual(snap["version"], manifest["version"])
                self.assertEqual(set(snap["tables"]), set(manifest["schemas"]))
                for table, t in snap["tables"].items():
                    self.assertTrue(t["note"])
                    self.assertEqual(t["rows"]["lesson"], manifest["editions"]["lesson"][table]["rows"])
                    self.assertLessEqual(len(t["lesson"]), 60, "lesson tables are small enough to read whole")

    def test_real_spark_reads_every_table(self):
        for (dataset_id, edition), job in counts.items():
            r = job.result()
            _, manifest = manifest_of(dataset_id)
            with self.subTest(f"{dataset_id}/{edition}"):
                case = r["cases"][0]
                self.assertEqual(r["status"], "ok", case.get("error") or r.get("error"))
                got = json.loads(case["stdout"].strip().splitlines()[-1])
                want = {t: m["rows"] for t, m in manifest["editions"][edition].items()}
                self.assertEqual(got, want)


if __name__ == "__main__":
    unittest.main()
