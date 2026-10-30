"""Shared writer for PySpark dataset generators (PS-D01 … PS-D15). Standard library only; runs on the host.

A generator builds its editions as plain Python rows (dicts) and calls `write_dataset(...)`, which writes:

  fixtures/<id>/<version>/<edition>/<table>.<csv|jsonl|txt>   what the Spark runner loads
  fixtures/<id>/<version>/manifest.json                         schemas (Spark DDL), keys, rules, rows, SHA-256
  src/content/pyspark/datasets/<id>.json                        what the app shows: columns, notes, a few real rows

Formats, chosen per table:
  csv    flat tables. None → empty field, True/False → true/false, Decimal/date/datetime → text.
  jsonl  one JSON object per line, for nested data (STRUCT, ARRAY, MAP in the DDL). Dates as ISO text.
  text   raw lines read as one `value` column (e.g. log lines, some deliberately malformed). Rows are strings.

Editions: `lesson` (small enough to read whole), `practice`, and optionally `project`. The same seed must always give
the same bytes; tests regenerate and compare hashes.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIXTURES = HERE.parent / "fixtures"
PUBLIC_DIR = HERE.parents[2] / "src" / "content" / "pyspark" / "datasets"
PUBLIC_PREVIEW_ROWS = 20
EXT = {"csv": "csv", "jsonl": "jsonl", "text": "txt"}


def split_top(ddl: str) -> list[str]:
    """Split a DDL list on commas that aren't inside (), <> — DECIMAL(10,2), STRUCT<a: INT, b: STRING>."""
    parts, depth, cur = [], 0, []
    for ch in ddl:
        if ch in "(<":
            depth += 1
        elif ch in ")>":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
    if "".join(cur).strip():
        parts.append("".join(cur).strip())
    return parts


def columns_of(ddl: str) -> list[tuple[str, str]]:
    """(name, type) pairs from a Spark DDL string."""
    out = []
    for part in split_top(ddl):
        name, _, typ = part.partition(" ")
        out.append((name.strip("`"), typ.strip()))
    return out


def text(v) -> str | None:
    """A value as the CSV (and the app) shows it."""
    if v is None:
        return None
    if v is True:
        return "true"
    if v is False:
        return "false"
    if isinstance(v, (dict, list)):
        return json.dumps(v, separators=(",", ":"), default=_json_default, ensure_ascii=False)
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def _json_default(v):
    if isinstance(v, (date, datetime)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    raise TypeError(f"can't write {type(v).__name__} to JSON")


def to_csv(rows: list[dict], columns: list[str]) -> bytes:
    out = io.StringIO()
    w = csv.writer(out, lineterminator="\n")
    w.writerow(columns)
    for r in rows:
        w.writerow(["" if r.get(c) is None else text(r[c]) for c in columns])
    return out.getvalue().encode()


def to_jsonl(rows: list[dict], columns: list[str]) -> bytes:
    lines = [json.dumps({c: r.get(c) for c in columns}, separators=(",", ":"), default=_json_default, ensure_ascii=False) for r in rows]
    return ("\n".join(lines) + "\n").encode() if lines else b""


def to_text(rows: list) -> bytes:
    lines = [r if isinstance(r, str) else r["value"] for r in rows]
    return ("\n".join(lines) + "\n").encode() if lines else b""


def write_dataset(
    *,
    dataset_id: str,
    version: str,
    title: str,
    seed: int,
    schemas: dict[str, str],
    notes: dict[str, str],
    keys: dict,
    rules: list[str],
    editions: dict[str, dict[str, list]],
    generated_by: str,
    formats: dict[str, str] | None = None,
    licence_note: str = "Runtime-owned deterministic synthetic data.",
) -> dict:
    """Write fixtures, manifest and the app's snapshot. Returns the manifest."""
    formats = formats or {}
    root = FIXTURES / dataset_id / version
    manifest = {
        "dataset_id": dataset_id,
        "version": version,
        "title": title,
        "source": "synthetic",
        "licence": {"status": "ours", "note": licence_note},
        "seed": seed,
        "schemas": schemas,
        "keys": keys,
        "rules": rules,
        "editions": {},
    }
    for edition, tables in editions.items():
        folder = root / edition
        folder.mkdir(parents=True, exist_ok=True)
        manifest["editions"][edition] = {}
        for table, rows in tables.items():
            fmt = formats.get(table, "csv")
            cols = [c for c, _ in columns_of(schemas[table])]
            data = to_csv(rows, cols) if fmt == "csv" else to_jsonl(rows, cols) if fmt == "jsonl" else to_text(rows)
            name = f"{table}.{EXT[fmt]}"
            (folder / name).write_bytes(data)
            manifest["editions"][edition][table] = {"file": f"{edition}/{name}", "rows": len(rows), "sha256": hashlib.sha256(data).hexdigest()}
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    _write_public(manifest, editions, schemas, notes, keys, rules, generated_by, formats)
    return manifest


def _rows_text(rows: list, cols: list[str], fmt: str) -> list[list]:
    if fmt == "text":
        return [[r if isinstance(r, str) else r["value"]] for r in rows]
    return [[text(r.get(c)) for c in cols] for r in rows]


def _write_public(manifest, editions, schemas, notes, keys, rules, generated_by, formats) -> None:
    tables = {}
    for table, ddl in schemas.items():
        cols = columns_of(ddl)
        names = [c for c, _ in cols]
        fmt = formats.get(table, "csv")
        entry = {
            "note": notes[table],
            "columns": [{"name": c, "type": t.lower()} for c, t in cols],
            "key": keys["primary"].get(table, []),
            "rows": {e: manifest["editions"][e][table]["rows"] for e in editions if table in editions[e]},
            "lesson": _rows_text(editions["lesson"].get(table, []), names, fmt),
            "practice_head": _rows_text(editions["practice"].get(table, [])[:PUBLIC_PREVIEW_ROWS], names, fmt),
        }
        if "project" in editions:
            entry["project_head"] = _rows_text(editions["project"].get(table, [])[:PUBLIC_PREVIEW_ROWS], names, fmt)
        if fmt != "csv":
            entry["format"] = fmt
        tables[table] = entry
    public = {
        "id": manifest["dataset_id"],
        "version": manifest["version"],
        "title": manifest["title"],
        "generated_by": generated_by,
        "rules": rules,
        "relationships": [{"from": k, "to": v} for k, v in keys.get("foreign", {}).items()],
        "tables": tables,
    }
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    (PUBLIC_DIR / f"{manifest['dataset_id']}.json").write_text(json.dumps(public, indent=1) + "\n")
