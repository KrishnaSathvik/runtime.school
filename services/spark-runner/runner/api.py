"""The runner's interface: what an execution API (dev_server.py today) and the PySpark workbench call. Trusted, host-side.

  run(item_id, code)          the visible sample only; a bounded preview of what solve() returned
  check(item_id, code)        visible + hidden cases (separate containers), graded here; hidden cases report pass/fail
                              and fixed wording, never data or anything the learner's code printed
  playground(dataset, code)   the file as a script, with the dataset's tables predefined; nothing is graded
  run_project(project, code)  every function of a project's pipeline, in order, on its project export; a bounded
                              preview of each table (nothing is graded)
  check_project(project, code) check(...) for every written step of the project, in order, on the same file
  build_expected(item_id)     runs the private reference solution on real Spark and records the expected results

Public item specs live in src/content/pyspark/items/<id>.json (the app renders the same file). Private material lives
in services/spark-runner/private/<id>/: reference, oracle, hidden cases and expected results. Only input tables are ever
copied into the sandbox; expected results and the reference stay on this side.
"""

from __future__ import annotations

import csv
import json
import threading
from pathlib import Path
from typing import Callable

from . import sandbox
from .grader import grade_case, hidden_run_message

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parent.parent
PUBLIC_ITEMS = REPO / "src" / "content" / "pyspark" / "items"
PUBLIC_LESSONS = REPO / "src" / "content" / "pyspark" / "lessons"
PUBLIC_PROJECTS = REPO / "src" / "content" / "pyspark" / "projects"
# Expected rows a question page may show for a visible case; the rest is a count.
PUBLIC_ROWS = 20
PRIVATE = ROOT / "private"
FIXTURES = ROOT / "fixtures"
# An item's own visible sample tables (public: build-expected copies them into <id>.expected.json for the page). Used
# when no dataset edition shows the behaviour a question tests: the lesson rows plus the few rows that do.
SAMPLES = ROOT / "samples"
SAMPLE_ROWS = 12
def _built() -> dict[str, tuple[str, tuple[str, ...]]]:
    """Every built dataset: its newest version and editions (practice first). Resolved here, never from the caller."""
    out = {}
    for d in sorted(FIXTURES.glob("PS-D*")):
        versions = sorted((m.parent for m in d.glob("*/manifest.json")), key=lambda p: tuple(int(x) for x in p.name.split(".")))
        if versions:
            editions = list(json.loads((versions[-1] / "manifest.json").read_text())["editions"])
            out[d.name] = (versions[-1].name, tuple(sorted(editions, key=lambda e: (e != "practice", e))))
    return out


# Datasets the Playground may open: version and allowed editions (first is the default).
PLAYGROUND = _built()

OnEvent = Callable[[str, str], None] | None


class ItemError(ValueError):
    """The item ID or its files are wrong. A content problem, never a learner one."""


def _safe(id_: str) -> str:
    if not id_.replace("-", "").isalnum():
        raise ItemError(f"unknown id {id_}")
    return id_


def _manifest(dataset_id: str, version: str) -> dict:
    return json.loads((FIXTURES / _safe(dataset_id) / version / "manifest.json").read_text())


def _with_also(spec: dict) -> dict:
    """The spec's dataset manifest, plus the tables it takes from other datasets (`"also": [{id, version, tables}]`, for
    projects that join two domains). Those tables keep their names and point at their own dataset's files."""
    manifest = _manifest(spec["dataset"]["id"], spec["dataset"]["version"])
    for extra in spec.get("also", []):
        other = _manifest(extra["id"], extra["version"])
        for t in extra["tables"]:
            if t in manifest["schemas"]:
                raise ItemError(f"{spec['id']}: table {t} is in two datasets")
            manifest["schemas"][t] = other["schemas"][t]
            for edition, tables in other["editions"].items():
                if t in tables:
                    manifest["editions"].setdefault(edition, {})[t] = {**tables[t], "file": str(FIXTURES / _safe(extra["id"]) / extra["version"] / tables[t]["file"])}
    return manifest


def load_item(item_id: str) -> dict:
    spec = PUBLIC_ITEMS / f"{_safe(item_id)}.json"
    if not spec.is_file() or not (PRIVATE / item_id).is_dir():
        raise ItemError(f"unknown item {item_id}")
    item = json.loads(spec.read_text())
    item["_private"] = PRIVATE / item_id
    item["_manifest"] = _with_also(item)
    return item


def _hidden(item: dict) -> list[dict]:
    return json.loads((item["_private"] / "hidden.json").read_text())


def _table_files(base: Path, tables: list[str]) -> dict[str, Path]:
    return {t: next((base / f"{t}.{ext}" for ext in ("csv", "jsonl", "txt") if (base / f"{t}.{ext}").is_file()), base / f"{t}.csv") for t in tables}


def _inputs(item: dict, case: dict, private: bool) -> dict[str, Path]:
    """Input table files for one case: a dataset edition, the item's own visible sample, or its own hidden fixture."""
    ds = item["dataset"]
    if "edition" in case:
        root = FIXTURES / ds["id"] / ds["version"]
        own = item.get("own_tables", {})
        files = {t: root / item["_manifest"]["editions"][case["edition"]][t]["file"] for t in item["inputs"] if t not in own}
        # An item's own tables travel beside the edition: from its sample folder or its hidden fixture for this case.
        base = item["_private"] / "hidden" / case["id"] if private else SAMPLES / item["id"] / case["id"]
        files.update(_table_files(base, [t for t in item["inputs"] if t in own]))
    elif case.get("sample"):
        files = _table_files(SAMPLES / item["id"] / case["id"], item["inputs"])
    elif private:
        files = _table_files(item["_private"] / "hidden" / case["id"], item["inputs"])
    else:
        raise ItemError(f"{item['id']}: visible case {case['id']} must use a dataset edition or its own sample")
    for t, f in files.items():
        if not f.is_file():
            raise ItemError(f"{item['id']}: case {case['id']} has no {t} table")
    return files


def _schema(item: dict, table: str) -> str:
    """A table's DDL: the dataset's, or the item's own (`"own_tables": {name: ddl}`) for a small table no dataset has,
    e.g. config overrides or size targets that hidden cases vary. Own tables come only from the item's sample and
    hidden fixtures, never from a dataset edition."""
    own = item.get("own_tables", {})
    if table in own:
        return own[table]
    return item["_manifest"]["schemas"][table]


def _job(item: dict, mode: str) -> dict:
    lim = item.get("limits", {})
    return {
        "mode": mode,
        "entry": item.get("entry", "solve"),
        "inputs": item["inputs"],
        "schemas": {t: _schema(item, t) for t in item["inputs"]},
        "preview_rows": lim.get("preview_rows", 100),
        "max_rows": lim.get("max_rows", 10000),
        # An item that teaches an API asks for the plan's operator names, so the grader can see the API really ran.
        "plan_nodes": "technique" in item,
        "streams": bool(item.get("technique", {}).get("streams")),
    }


def _limits(item: dict, mode: str) -> sandbox.Limits:
    lim = item.get("limits", {})
    return sandbox.Limits(timeout_s=float(lim.get("run_timeout_s" if mode == "run" else "check_timeout_s", 45 if mode == "run" else 90)))


def _summary(result: dict) -> dict:
    return {
        "timings": {**result.get("timings", {}), "container_wall_ms": result.get("container", {}).get("wall_ms")},
        "memory_peak_bytes": result.get("memory_peak_bytes"),
        "engine": result.get("engine"),
    }


def run(item_id: str, code: str, cancel: threading.Event | None = None, on_event: OnEvent = None) -> dict:
    item = load_item(item_id)
    inputs = {c["id"]: _inputs(item, c, private=False) for c in item["visible"]}
    result = sandbox.execute(_job(item, "run"), code, inputs, _limits(item, "run"), cancel, on_event=on_event)
    return {"item": item_id, "mode": "run", "status": result["status"], "error": result.get("error"), "cases": result.get("cases", []), **_summary(result)}


def check(item_id: str, code: str, cancel: threading.Event | None = None, on_event: OnEvent = None) -> dict:
    """Grade `code` on the visible and hidden cases. The two kinds run in separate containers: the visible run never has
    hidden inputs mounted, and nothing the learner's code produces in the hidden run (prints, error text, exception
    names, line numbers, timings) is passed back; hidden feedback is chosen here from fixed wording (grader.hidden_*).
    Everything the container reports is the learner's claim: rows are graded against private expected results, case
    ids must be exactly the ones asked for, and a technique must also be visible in the learner's source."""
    item = load_item(item_id)
    visible, hidden = item["visible"], _hidden(item)
    job, limits = _job(item, "capture"), _limits(item, "check")
    shown = sandbox.execute(job, code, {c["id"]: _inputs(item, c, private=False) for c in visible}, limits, cancel, on_event=on_event)
    secret = None
    if hidden and shown["status"] not in ("syntax-error", "cancelled"):
        secret = sandbox.execute(job, code, {f"hidden-{c['id']}": _inputs(item, c, private=True) for c in hidden}, limits, cancel, on_event=on_event)
    expected_dir = item["_private"] / "expected"
    order = item["output"].get("order_sensitive", False)
    by_id = {**_reported(shown, [c["id"] for c in visible]), **_reported(secret, [f"hidden-{c['id']}" for c in hidden])}

    checks = []
    for c in visible:
        expected = json.loads((expected_dir / f"{c['id']}.json").read_text())
        actual = by_id.get(c["id"])
        if actual is None:
            graded = {"passed": False, "message": (shown.get("error") or {}).get("message", "This case didn't run.")}
        else:
            graded = grade_case(expected, actual, order_sensitive=order, reveal=True)
        entry = {"id": c["id"], "visible": True, "label": c.get("label", "the sample shown in the question"), **graded}
        if actual is not None and actual.get("error"):
            # Learner line numbers help on the sample; its inputs are public, so its error text may be shown too.
            entry["error"] = {k: actual["error"].get(k) for k in ("type", "message", "condition", "line")}
        if actual is not None:
            entry["stdout"] = actual.get("stdout", "")
        checks.append(entry)
    for c in hidden:
        expected = json.loads((expected_dir / f"{c['id']}.json").read_text())
        actual = by_id.get(f"hidden-{c['id']}")
        if actual is None:
            graded = {"passed": False, "message": hidden_run_message(secret)}
        else:
            graded = grade_case(expected, actual, order_sensitive=order, reveal=False)
        checks.append({"id": c["id"], "visible": False, "label": c["label"], **graded})
    if "technique" in item:
        checks.append(_technique_check(item, code, visible + hidden, by_id, expected_dir))
    passed = sum(1 for c in checks if c["passed"])
    status, error = "ok", None
    if shown["status"] in ("syntax-error", "timeout", "cancelled", "memory-limit", "output-limit", "crashed"):
        status, error = shown["status"], shown.get("error")
    elif secret is not None and secret["status"] == "cancelled":
        status, error = "cancelled", {"type": "Cancelled", "message": "Stopped."}
    return {
        "item": item_id,
        "mode": "check",
        "status": status,
        "error": error,
        "passed": status == "ok" and passed == len(checks),
        "score": f"{passed}/{len(checks)}",
        "checks": checks,
        # Timings and memory come from the visible run only: the hidden run's would be a channel out for hidden data.
        **_summary(shown),
    }


def _reported(result: dict | None, wanted: list[str]) -> dict:
    """The cases a run reported, by id, if they are exactly the cases it was given (each once, well formed). Anything
    else (missing, repeated or extra cases, a malformed entry) means the run's report can't be trusted: no cases."""
    if result is None:
        return {}
    cases = result.get("cases")
    if not isinstance(cases, list) or not all(isinstance(c, dict) for c in cases):
        return {}
    ids = [c.get("id") for c in cases]
    if sorted(map(str, ids)) != sorted(wanted) or len(set(ids)) != len(ids):
        return {}
    return {c["id"]: c for c in cases}


def _technique_check(item: dict, code: str, cases: list[dict], by_id: dict, expected_dir: Path) -> dict:
    """Did the technique the item teaches actually run? Two kinds of evidence, both required. Spark's executed plan, case
    by case: an unused or commented-out UDF never appears there. But the plan is reported from inside the learner's
    process, so it is a claim; the learner's source must also call the API (read here, outside the sandbox). Cases whose
    expected result is empty are skipped, since Spark may drop the whole computation for empty input. A case that didn't
    run gives no evidence, so it can't pass this check."""
    t = item["technique"]
    missing, errored = [], []
    for c in cases:
        if not json.loads((expected_dir / f"{c['id']}.json").read_text())["rows"]:
            continue
        actual = by_id.get(c["id"] if c in item["visible"] else f"hidden-{c['id']}")
        if actual is None or actual.get("status") != "ok":
            errored.append(c["id"])
            continue
        # A technique asks for stream evidence, plan evidence, both, or neither (source only).
        if t.get("streams"):
            ran = actual.get("streams") if isinstance(actual.get("streams"), dict) else {}
            if not (_count(ran.get("started")) >= 1 and (_count(ran.get("batches")) >= 1 or _count(ran.get("rows")) >= 1)):
                missing.append(c["id"])
                continue
        if t.get("plan") and not set(t["plan"]) & set(n for n in (actual.get("plan_nodes") or []) if isinstance(n, str)):
            missing.append(c["id"])
    calls = technique_calls(t)
    in_source = uses_any(code, calls)
    ok = in_source and not missing and not errored
    if ok:
        message = ""
    elif not in_source:
        message = f"Your code doesn't call {' or '.join(f'`{c}`' for c in calls)}. This question is about {t['name']}, so use it to compute the result."
    elif missing:
        how = "No streaming query ran a micro-batch" if t.get("streams") and not t.get("plan") else "Spark's plan shows the result was computed without " + t["name"]
        message = f"{how}. This question is about {t['name']}, so use it to compute the result."
    else:
        message = f"Your code didn't run on every case, so Spark's plan couldn't confirm it uses {t['name']}."
    return {"id": "technique", "visible": True, "label": f"uses {t['name']}", "passed": ok, "message": message}


def _count(v) -> int:
    return v if isinstance(v, int) and not isinstance(v, bool) else 0


# The API a technique's plan operator comes from, for the source check. An item can name its own with
# technique["source"] (e.g. RDD functions, a broadcast hint, a Delta merge).
TECHNIQUE_CALLS = {
    "ArrowEvalPython": ["pandas_udf"],
    "MapInPandas": ["mapInPandas"],
    "HashAggregate": ["groupBy", "groupby", "agg"],
}


def technique_calls(t: dict) -> list[str]:
    if t.get("source"):
        return list(t["source"])
    if t.get("streams"):
        return ["writeStream"]
    return sorted({c for node in t.get("plan", []) for c in TECHNIQUE_CALLS.get(node, [])})


def uses_any(code: str, names: list[str]) -> bool:
    """Whether the learner's file names any of `names` as code (a name, attribute or import), not in a comment or
    string. Code that doesn't parse can't have run, so it doesn't count."""
    import ast

    try:
        tree = ast.parse(code)
    except (SyntaxError, ValueError):
        return False
    wanted = set(names)
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and node.id in wanted:
            return True
        if isinstance(node, ast.Attribute) and node.attr in wanted:
            return True
        if isinstance(node, ast.alias) and node.name.rsplit(".", 1)[-1] in wanted:
            return True
    return False


def playground(dataset_id: str, code: str, cancel: threading.Event | None = None, on_event: OnEvent = None, edition: str | None = None) -> dict:
    if dataset_id not in PLAYGROUND:
        raise ItemError(f"the Playground can't open {dataset_id}")
    version, editions = PLAYGROUND[dataset_id]
    edition = edition or editions[0]
    if edition not in editions:
        raise ItemError(f"{dataset_id} has no {edition} edition")
    manifest = _manifest(dataset_id, version)
    tables = {t: FIXTURES / dataset_id / version / meta["file"] for t, meta in manifest["editions"][edition].items()}
    job = {"mode": "script", "inputs": list(tables), "schemas": manifest["schemas"], "preview_rows": 100}
    result = sandbox.execute(job, code, {"playground": tables}, sandbox.Limits(timeout_s=45), cancel, on_event=on_event)
    return {"dataset": dataset_id, "edition": edition, "version": version, "mode": "playground", "status": result["status"], "error": result.get("error"), "cases": result.get("cases", []), **_summary(result)}


def load_project(project_id: str) -> dict:
    """A project's public definition (src/content/pyspark/projects/<id>.json) and its written steps, in order."""
    spec = PUBLIC_PROJECTS / f"{_safe(project_id)}.json"
    if not spec.is_file():
        raise ItemError(f"unknown project {project_id}")
    project = json.loads(spec.read_text())
    steps = []
    for n in range(1, 100):
        step_id = f"{project_id}-M{n}"
        if not (PUBLIC_ITEMS / f"{step_id}.json").is_file():
            break
        steps.append(step_id)
    project["_steps"] = steps
    project["_manifest"] = _with_also(project)
    return project


def run_project(project_id: str, code: str, cancel: threading.Event | None = None, on_event: OnEvent = None) -> dict:
    """Run every function of the project's pipeline, in order, on the project export, and preview what each returned.
    The export is public, so every row the learner's code produces from it may be shown."""
    project = load_project(project_id)
    ds, manifest = project["dataset"], project["_manifest"]
    edition = manifest["editions"][ds["edition"]]
    tables = {t: FIXTURES / ds["id"] / ds["version"] / edition[t]["file"] for t in project["inputs"]}
    job = {
        "mode": "project",
        "inputs": project["inputs"],
        "schemas": {t: manifest["schemas"][t] for t in project["inputs"]},
        "artifacts": [{"name": a["name"], "entry": a.get("entry", a["name"]), "inputs": a["inputs"]} for a in project["artifacts"]],
        "preview_rows": 50,
    }
    result = sandbox.execute(job, code, {"project": tables}, sandbox.Limits(timeout_s=float(project.get("run_timeout_s", 90))), cancel, on_event=on_event)
    case = next(iter(result.get("cases") or []), {})
    names = [a["name"] for a in project["artifacts"]]
    reported = case.get("artifacts") if isinstance(case.get("artifacts"), list) else []
    # The report is the learner's claim: keep exactly the artifacts asked for, in pipeline order.
    by_name = {a["name"]: a for a in reported if isinstance(a, dict) and isinstance(a.get("name"), str)}
    artifacts = [by_name[n] for n in names if n in by_name] if sorted(by_name) == sorted(names) and len(reported) == len(names) else []
    return {
        "project": project_id,
        "mode": "project-run",
        "status": result["status"],
        "error": result.get("error") or case.get("error"),
        "artifacts": artifacts,
        "stdout": case.get("stdout", ""),
        "stderr": case.get("stderr", ""),
        **_summary(result),
    }


def check_project(project_id: str, code: str, cancel: threading.Event | None = None, on_event: OnEvent = None) -> dict:
    """Check the file against every written step, in order: each step is graded exactly as its own Check grades it,
    hidden cases included. A syntax error stops after the first step, since no step can pass."""
    project = load_project(project_id)
    steps = []
    for n, step_id in enumerate(project["_steps"], 1):
        if cancel is not None and cancel.is_set():
            break
        if on_event:
            on_event("case", f"step {n} of {len(project['_steps'])}")
        r = check(step_id, code, cancel, on_event=lambda kind, value: on_event(kind, value) if on_event and kind == "state" else None)
        steps.append({"step": n, "item": step_id, "passed": r["passed"], "score": r["score"], "status": r["status"], "error": r.get("error"), "checks": r["checks"]})
        if r["status"] in ("syntax-error", "cancelled"):
            break
    cancelled = cancel is not None and cancel.is_set()
    return {
        "project": project_id,
        "mode": "project-check",
        "status": "cancelled" if cancelled else "ok",
        "passed": not cancelled and len(steps) == len(project["_steps"]) and all(s["passed"] for s in steps),
        "steps": steps,
    }


def _build_prediction(item_id: str) -> dict:
    """A predict-the-output item: run its program on real Spark and record exactly what it printed."""
    spec = json.loads((PUBLIC_ITEMS / f"{_safe(item_id)}.json").read_text())
    r = playground(spec["dataset"]["id"], spec["program"], edition=spec.get("edition", "lesson"))
    case = (r.get("cases") or [{}])[0]
    if r["status"] != "ok" or case.get("error"):
        raise ItemError(f"{item_id}: the program failed: {case.get('error') or r.get('error')}")
    public = {"generated_by": "services/spark-runner/run.py build-expected", "engine": r.get("engine"), "output": case.get("stdout", "")}
    (PUBLIC_ITEMS / f"{item_id}.expected.json").write_text(json.dumps(public, indent=1) + "\n")
    return {"item": item_id, "output_lines": len(public["output"].splitlines())}


def _sample_rows(path: Path, ddl: str) -> list[list]:
    """A sample table as the dataset snapshots hold rows: text values in schema order, NULL as None, nested as JSON."""
    names = [col.strip().split(" ", 1)[0] for col in _split_ddl(ddl)]
    if path.suffix == ".jsonl":
        rows = []
        for line in path.read_text().splitlines():
            if line.strip():
                r = json.loads(line)
                rows.append([None if r.get(n) is None else r[n] if isinstance(r[n], str) else json.dumps(r[n], separators=(",", ":")) for n in names])
    elif path.suffix == ".txt":
        rows = [[line] for line in path.read_text().splitlines()]
    else:
        with path.open(newline="") as f:
            reader = csv.reader(f)
            header = next(reader, [])
            rows = [[(dict(zip(header, r)).get(n) or None) for n in names] for r in reader]
    if len(rows) > SAMPLE_ROWS:
        raise ItemError(f"{path}: a sample table has at most {SAMPLE_ROWS} rows, so the page can show all of it")
    return rows


def _split_ddl(ddl: str) -> list[str]:
    """Top-level columns of a DDL string (commas inside struct<...>, array<...> or DECIMAL(p,s) don't split)."""
    out, depth, cur = [], 0, ""
    for ch in ddl:
        depth += ch in "<("
        depth -= ch in ">)"
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    return [c for c in out + [cur] if c.strip()]


def build_expected(item_id: str) -> dict:
    """Record the expected result of every case from the private reference, run on real Spark. Refuses on any error."""
    if json.loads((PUBLIC_ITEMS / f"{_safe(item_id)}.json").read_text()).get("kind") == "predict":
        return _build_prediction(item_id)
    item = load_item(item_id)
    reference = (item["_private"] / "reference.py").read_text()
    cases = item["visible"] + _hidden(item)
    inputs = {c["id"]: _inputs(item, c, private=c not in item["visible"]) for c in cases}
    result = sandbox.execute(_job(item, "capture"), reference, inputs, _limits(item, "check"))
    bad = [c for c in result.get("cases", []) if c["status"] != "ok"]
    if result["status"] != "ok" or bad or len(result.get("cases", [])) != len(cases):
        raise ItemError(f"{item_id}: the reference failed: {json.dumps(result.get('error') or [c.get('error') for c in bad])}")
    out = item["_private"] / "expected"
    out.mkdir(exist_ok=True)
    for c in result["cases"]:
        (out / f"{c['id']}.json").write_text(json.dumps({"schema": c["schema"], "rows": c["rows"]}, indent=1) + "\n")
    # What the question page may show: the visible cases' expected output (and an item's own sample tables, which the
    # page shows in place of the edition's), and the kinds of hidden case, never their data.
    visible = {c["id"]: {"schema": r["schema"], "rows": r["rows"][:PUBLIC_ROWS], "row_count": len(r["rows"])} for c in item["visible"] for r in result["cases"] if r["id"] == c["id"]}
    for c in item["visible"]:
        if c.get("sample"):
            visible[c["id"]]["inputs"] = {t: _sample_rows(f, _schema(item, t)) for t, f in inputs[c["id"]].items()}
    public = {
        "generated_by": "services/spark-runner/run.py build-expected",
        "engine": result.get("engine"),
        "visible": visible,
        "hidden": [c["label"] for c in _hidden(item)],
    }
    (PUBLIC_ITEMS / f"{item_id}.expected.json").write_text(json.dumps(public, indent=1) + "\n")
    return {"item": item_id, "cases": {c["id"]: len(c["rows"]) for c in result["cases"]}, **_summary(result)}


def build_lesson(lesson_id: str) -> dict:
    """Run every example of a lesson on real Spark and record what it printed (or the error it raised, for an
    error example). The lesson page shows these records when Spark isn't connected; tests re-run and compare them."""
    spec = json.loads((PUBLIC_LESSONS / f"{_safe(lesson_id)}.json").read_text())
    ds = spec["dataset"]
    recorded = {}
    engine = None
    for b in spec["blocks"]:
        if b["kind"] not in ("example", "error-example"):
            continue
        r = playground(ds["id"], b["code"], edition=ds["edition"])
        case = (r.get("cases") or [{}])[0]
        error = case.get("error") or r.get("error")
        if b["kind"] == "example" and r["status"] != "ok":
            raise ItemError(f"{lesson_id} {b['id']}: the example failed: {error}")
        if b["kind"] == "error-example" and (not error or error.get("type") != b["error"]):
            raise ItemError(f"{lesson_id} {b['id']}: expected {b['error']}, got {error}")
        recorded[b["id"]] = {"stdout": case.get("stdout", ""), "error": {k: error.get(k) for k in ("type", "message", "line", "condition")} if error else None}
        engine = r.get("engine") or engine
    out = {"generated_by": "services/spark-runner/run.py build-lesson", "dataset": ds, "engine": engine, "examples": recorded}
    (PUBLIC_LESSONS / f"{lesson_id}.recorded.json").write_text(json.dumps(out, indent=1) + "\n")
    return {"lesson": lesson_id, "examples": list(recorded)}
