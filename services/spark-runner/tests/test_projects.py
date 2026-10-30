"""Whole-project runs on real Spark (api.run_project, api.check_project). Needs Docker and image 4.0.1-4 or later.

    python3 -I -m unittest discover -s services/spark-runner/tests -p test_projects.py -v     # ~3 min

Every project with a definition in src/content/pyspark/projects/ is covered: its last step's private reference is the
whole pipeline, so it must produce every artifact, agree with each step's recorded expected result, and pass every step.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from runner import api  # noqa: E402

PROJECTS = sorted(p.stem for p in api.PUBLIC_PROJECTS.glob("PS-P*.json"))


def reference(project: dict) -> str:
    return (api.PRIVATE / project["_steps"][-1] / "reference.py").read_text()


class RunProject(unittest.TestCase):
    def test_reference_produces_every_artifact_and_matches_each_step(self):
        for pid in PROJECTS:
            with self.subTest(project=pid):
                project = api.load_project(pid)
                r = api.run_project(pid, reference(project))
                self.assertEqual(r["status"], "ok", r.get("error"))
                self.assertEqual([a["name"] for a in r["artifacts"]], [a["name"] for a in project["artifacts"]])
                by_name = {a["name"]: a for a in r["artifacts"]}
                for a in r["artifacts"]:
                    self.assertEqual(a["status"], "ok", (a["name"], a.get("error")))
                # A step's entry artifact must equal what that step's Check expects on the project export.
                for step_id in project["_steps"]:
                    spec = json.loads((api.PUBLIC_ITEMS / f"{step_id}.json").read_text())
                    expected = json.loads((api.PUBLIC_ITEMS / f"{step_id}.expected.json").read_text())["visible"]["project"]
                    got = by_name[spec["entry"]]
                    self.assertEqual(got["row_count"], expected["row_count"], step_id)
                    self.assertEqual([f["name"] for f in got["schema"]], [f["name"] for f in expected["schema"]], step_id)
                    # The public file keeps only the first rows; the private record has them all.
                    if expected["row_count"] <= len(got["rows"]):
                        full = json.loads((api.PRIVATE / step_id / "expected" / "project.json").read_text())["rows"]
                        self.assertCountEqual(map(json.dumps, got["rows"]), map(json.dumps, full), step_id)

    def test_a_missing_or_failing_stage_is_reported_and_the_rest_still_run(self):
        pid = PROJECTS[0]
        project = api.load_project(pid)
        first, second = project["artifacts"][0]["name"], project["artifacts"][1]["name"]
        code = reference(project).replace(f"def {second}(", f"def _{second}_renamed(")
        r = api.run_project(pid, code)
        status = {a["name"]: a["status"] for a in r["artifacts"]}
        self.assertEqual(status[first], "ok")
        self.assertEqual(status[second], "missing")
        self.assertTrue(any(s == "runtime-error" for s in status.values()), status)

    def test_a_syntax_error_reports_no_artifacts(self):
        r = api.run_project(PROJECTS[0], "def order_view(orders)\n    return orders\n")
        self.assertEqual(r["status"], "syntax-error")
        self.assertEqual(r["artifacts"], [])
        self.assertEqual(r["error"]["line"], 1)

    def test_unknown_project_is_refused(self):
        with self.assertRaises(api.ItemError):
            api.run_project("PS-P99", "")
        with self.assertRaises(api.ItemError):
            api.run_project("../PS-P01", "")


class CheckProject(unittest.TestCase):
    def test_reference_passes_every_step(self):
        for pid in PROJECTS:
            with self.subTest(project=pid):
                project = api.load_project(pid)
                r = api.check_project(pid, reference(project))
                self.assertTrue(r["passed"], [(s["item"], s["score"]) for s in r["steps"]])
                self.assertEqual([s["item"] for s in r["steps"]], project["_steps"])

    def test_hidden_cases_report_no_data(self):
        r = api.check_project(PROJECTS[0], "def order_view(orders):\n    return orders\n")
        self.assertFalse(r["passed"])
        for s in r["steps"]:
            for c in s["checks"]:
                if not c["visible"]:
                    self.assertNotIn("missing", c)
                    self.assertNotIn("unexpected", c)
                    self.assertNotIn("stdout", c)
                    self.assertNotIn("error", c)


if __name__ == "__main__":
    unittest.main()
