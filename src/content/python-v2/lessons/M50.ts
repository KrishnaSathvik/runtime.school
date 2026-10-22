/**
 * M50 Production Readiness Capstone: five lessons (PY-L50-01 … PY-L50-05).
 *
 * One application runs through the module: a nightly fare report over NYC taxi trips (D06), read from a CSV export,
 * validated, summarised per borough and written as JSON. The lessons take it through a production review: design
 * (one job per function and module, a pure core), integrated tests that check pipeline properties, a performance review
 * with cProfile and counted operations, resilience (quarantine, retries, checkpoints) in one run, and a release review
 * that turns all the evidence into a go/no-go report.
 *
 * Multi-file exercises get a real `taxi` package (task files) next to the learner's main.py. Lesson examples are single
 * files because examples can't import neighbouring files. Version 2: rewritten from a placeholder module that returned
 * fixed SKU strings.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, learnerTests, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const lines = (...l: string[]) => l.join("\n");
const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, raises: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const t = (...items: unknown[]) => py.tuple(...items.map(pv));
/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: ReturnType<typeof learnerTests>, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `tests-${n}`) ? { ...c, hidden: true } : c));

/** Eight real D06 trips (January 2025), trimmed to the report's columns. */
export const TRIPS_CSV = [
  "trip_id,pickup_zone_id,dropoff_zone_id,trip_distance_miles,fare_amount,tip_amount,total_amount",
  "16126,186,179,9.2,40.8,10.7,64.19",
  "16127,264,48,0.9,7.2,2.55,15.5",
  "16128,39,89,3.17,17.2,0,18.7",
  "16130,263,236,0.5,5.1,1,11.1",
  "16131,164,142,2.81,16.3,4.41,26.46",
  "16132,70,148,10.43,42.9,11.12,66.71",
  "16133,114,238,5.2,22.6,5.65,34",
  "16134,48,230,1.1,7.9,3.4,17.05",
].join("\n") + "\n";

/** Borough of each zone used by the fixtures (from D06's zones table). */
export const ZONES_PY = `ZONES = {39: "Brooklyn", 48: "Manhattan", 70: "Queens", 89: "Brooklyn", 114: "Manhattan", 132: "Queens", 142: "Manhattan", 148: "Manhattan", 161: "Manhattan", 164: "Manhattan", 179: "Queens", 186: "Manhattan", 230: "Manhattan", 236: "Manhattan", 237: "Manhattan", 238: "Manhattan", 263: "Manhattan", 264: "Unknown"}\n`;

/** The capstone's `taxi` package, given to multi-file exercises as task files. */
export const TAXI_FILES: Record<string, string> = {
  "taxi/__init__.py": '"""Nightly fare report over NYC taxi trips."""\n',
  "taxi/zones.py": `"""Borough of each taxi zone (a slice of the TLC zone table)."""\n\n${ZONES_PY}`,
  "taxi/parse.py": src`
"""Read the trips CSV export into typed trips, quarantining rows that break the schema."""
import csv
import io

FIELDS = {
    "trip_id": int,
    "pickup_zone_id": int,
    "dropoff_zone_id": int,
    "trip_distance_miles": float,
    "fare_amount": float,
    "tip_amount": float,
    "total_amount": float,
}


def parse_trips(text):
    """Return (trips, rejected): typed trip dicts, and the line numbers (header = 1) of rows that don't fit."""
    trips = []
    rejected = []
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            trip = {name: convert(row[name]) for name, convert in FIELDS.items()}
        except (KeyError, TypeError, ValueError):
            rejected.append(number)
            continue
        if trip["fare_amount"] < 0 or trip["total_amount"] < 0:
            rejected.append(number)
            continue
        trips.append(trip)
    return trips, rejected
`,
};

export const m50Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L50-01 design review
  {
    id: "PY-L50-01",
    version: 2,
    slug: "review-the-design",
    title: "Review the design of a small application",
    lede: "The capstone application is a nightly fare report over NYC taxi trips. Its first version works, as one long function. A design review asks of each part: what is its one job, what does it depend on, and can it be tested without the rest? The answer is a pure core of calculations with reading and writing at the edges.",
    focus: "Split an application into parse, compute and output steps with one job each, keep the computing core pure (plain data in, results out), and wire the steps together at the edge.",
    minutes: 24,
    objectives: [
      "Spot the responsibilities tangled in one function: reading, validating, computing, formatting, writing",
      "Separate them so the core takes plain data and returns results, with no files or printing inside",
      "Wire the parts together in a thin `run` function, across modules of a package",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comment", "comment-out", "comparison", "conditional-expr", "continue-statement", "conversion", "csv-read", "defaultdict-call", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "newline-escape", "none-value", "package-import", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "top-level-indent", "tuple-unpack", "unquoted-name", "with-statement"],
    teaches: ["design-review"],
    blocks: [
      {
        kind: "text",
        md: "This module takes one realistic program through a production review, using everything from the course. The program: each night, read the day's taxi trips (an export from the D06 dataset), check them, total the fares per borough, and write a report the dashboard reads.\n\nA **design review** looks at structure before details. The Software Architecture module introduced the principles; here they are applied as questions a reviewer asks about real code. *What is each function's one job?* A function that reads a file, validates rows, adds up money and prints has five reasons to change and no way to test one without the others. *What does the core depend on?* Calculations should take plain data and return plain data: a **pure** core (see Functional & Dynamic Python) can be tested with three hand-written trips, reused by the API and the batch job, and profiled on its own. *Where are the edges?* Reading files, the clock, printing and writing reports belong in a thin outer layer that wires the steps together.",
      },
      {
        kind: "example",
        title: "Version one: everything in one function",
        code: src`
import csv

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_zone_id,dropoff_zone_id,trip_distance_miles,fare_amount,tip_amount,total_amount\n")
    f.write("16126,186,179,9.2,40.8,10.7,64.19\n16127,264,48,0.9,7.2,2.55,15.5\n16128,39,89,3.17,17.2,0,18.7\n")
    f.write("16130,263,236,0.5,5.1,1,11.1\n16131,164,142,2.81,16.3,4.41,26.46\n16132,70,148,10.43,42.9,11.12,66.71\n")
    f.write("16133,114,238,5.2,22.6,5.65,34\n16134,48,230,1.1,7.9,3.4,17.05\n")

ZONES = {39: "Brooklyn", 48: "Manhattan", 70: "Queens", 114: "Manhattan", 164: "Manhattan", 186: "Manhattan", 263: "Manhattan", 264: "Unknown"}

def nightly_report():
    revenue = {}
    with open("trips.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            total = float(row["total_amount"])
            if total < 0:
                continue
            borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
            revenue[borough] = revenue.get(borough, 0) + total
    for borough in sorted(revenue):
        print(f"{borough:10} {revenue[borough]:8.2f}")

nightly_report()
`,
        output: "Brooklyn      18.70\nManhattan    152.80\nQueens        66.71\nUnknown       15.50\n",
        note: "It works, and it is short. But the file name, the CSV format, the validation rule, the money arithmetic and the output format all live in one function. The next example shows the cost.",
      },
      {
        kind: "text",
        md: "Now try to test the arithmetic: does a refund (a negative total) get skipped? With version one, every test must write a file called `trips.csv` into the current folder and read the printed text back. Run it anywhere else and it can't even start:",
      },
      {
        kind: "error-example",
        title: "The calculation can't run without the file",
        code: src`
import csv

ZONES = {186: "Manhattan"}

def nightly_report():
    revenue = {}
    with open("trips.csv", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
            revenue[borough] = revenue.get(borough, 0) + float(row["total_amount"])
    return revenue

# A test of the money rule, in a folder with no trips.csv:
print(nightly_report())
`,
        error: "FileNotFoundError",
        output: "",
        note: "`FileNotFoundError: [Errno 44] No such file or directory: 'trips.csv'`. The question was about adding numbers; the answer depends on the file system. That coupling is what the review removes.",
      },
      {
        kind: "example",
        title: "Version two: parse, compute and report as separate steps",
        code: src`
import csv
import io

ZONES = {39: "Brooklyn", 48: "Manhattan", 70: "Queens", 114: "Manhattan", 164: "Manhattan", 186: "Manhattan", 263: "Manhattan", 264: "Unknown"}

def parse_trips(text):
    """Text of the CSV export -> list of trips with typed fields."""
    return [
        {"pickup_zone_id": int(row["pickup_zone_id"]), "total_amount": float(row["total_amount"])}
        for row in csv.DictReader(io.StringIO(text))
    ]

def borough_revenue(trips, zones):
    """Pure core: trips and a zone table in, revenue per borough out."""
    revenue = {}
    for trip in trips:
        if trip["total_amount"] < 0:
            continue
        borough = zones.get(trip["pickup_zone_id"], "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + trip["total_amount"], 2)
    return revenue

def format_report(revenue):
    return [f"{borough:10} {revenue[borough]:8.2f}" for borough in sorted(revenue)]

def run(path):
    """Edge: read the file, call the core, print the report."""
    with open(path, encoding="utf-8") as f:
        trips = parse_trips(f.read())
    for line in format_report(borough_revenue(trips, ZONES)):
        print(line)

# The core is testable with hand-made data: no file, no printing.
print(borough_revenue([{"pickup_zone_id": 186, "total_amount": 64.19}, {"pickup_zone_id": 186, "total_amount": -12.5}], ZONES))

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16128,39,18.7\n16132,70,66.71\n16133,114,34\n")
run("trips.csv")
`,
        output: "{'Manhattan': 64.19}\nBrooklyn      18.70\nManhattan     98.19\nQueens        66.71\n",
        note: "Each function has one job and one reason to change: the CSV format (`parse_trips`), the money rule (`borough_revenue`), the layout (`format_report`), or where files live (`run`). The core takes the zone table as a parameter, so a test can pass its own. Only `run` touches the file system, and it contains no logic worth testing on its own.",
      },
      {
        kind: "text",
        md: "In a real repository the steps live in modules of a package: `taxi/parse.py`, `taxi/zones.py`, `taxi/summary.py`, and a `main.py` (or a CLI, the CLI & Automation module) that wires them. The second challenge works that way: the package is provided as files next to your program.\n\n**Review checklist:** one job per function; the core takes data, not file names; no `print` or `open` inside calculations; settings and tables passed in, not read from globals; imports point inward (the core imports nothing from the edges). **Mistakes to avoid:** splitting into functions that still share hidden state; a \"utils\" module of unrelated helpers; and moving code around without tests to show the behaviour didn't change (next lesson).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Return, don't print",
      prompt: "`average_fare` prints its result, so no other code (a test, the report, the API) can use the number. Make it return the average fare rounded to 2 decimal places, or `None` when there are no trips.",
      spec: [
        ["Function", "`average_fare(trips)`; trips have a `fare_amount`"],
        ["Returns", "the mean fare rounded to 2 places; `None` for no trips"],
      ],
      starter: src`
def average_fare(trips):
    total = 0
    for trip in trips:
        total += trip["fare_amount"]
    print(round(total / len(trips), 2))

average_fare([{"fare_amount": 40.8}, {"fare_amount": 7.2}, {"fare_amount": 17.2}])
`,
      answer: src`
def average_fare(trips):
    if not trips:
        return None
    total = 0
    for trip in trips:
        total += trip["fare_amount"]
    return round(total / len(trips), 2)

print(average_fare([{"fare_amount": 40.8}, {"fare_amount": 7.2}, {"fare_amount": 17.2}]))
`,
      wrong: [
        {
          code: src`
def average_fare(trips):
    total = 0
    for trip in trips:
        total += trip["fare_amount"]
    return round(total / len(trips), 2)
`,
          fails: ["empty"],
          why: "a night with no trips divides by zero instead of returning `None`",
        },
      ],
      hints: ["The caller should decide whether to print.", "Replace `print(...)` with `return`.", "Check for an empty list before dividing."],
      task: {
        checks: [
          fn("returns", "average_fare", [
            example([[{ fare_amount: 40.8 }, { fare_amount: 7.2 }, { fare_amount: 17.2 }]], 21.73),
            hiddenCase("one trip", [[{ fare_amount: 5.1 }]], 5.1),
          ], { label: "average_fare() returns the rounded mean" }),
          fn("empty", "average_fare", [hiddenCase("no trips", [[]], null)], { label: "no trips gives None" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The report's pure core",
        prompt: "Write the core of the nightly report: `borough_summary(trips, zones)`. Group the trips by the borough of their pickup zone (`zones` maps zone ID to borough; an unknown zone is `\"Unknown\"`) and return, per borough, the number of trips, the revenue (sum of `total_amount`, rounded to 2 places) and the tip rate (sum of `tip_amount` ÷ sum of `fare_amount`, rounded to 3 places; `0.0` when the fares sum to 0). No files, no printing, and the trips are not changed.",
        spec: [
          ["Function", "`borough_summary(trips, zones)`"],
          ["trips", "dictionaries with `pickup_zone_id`, `fare_amount`, `tip_amount` and `total_amount`"],
          ["Returns", "`{borough: {\"trips\": n, \"revenue\": r, \"tip_rate\": t}}` with boroughs in alphabetical order"],
          ["Example", "the eight fixture trips → `Manhattan: {'trips': 5, 'revenue': 152.8, 'tip_rate': 0.271}`, … (see the checks)"],
        ],
        starter: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def borough_summary(trips, zones):
    return {}

with open("trips.csv", encoding="utf-8") as f:
    trips, rejected = parse_trips(f.read())
print(borough_summary(trips, ZONES))
`,
        answer: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def borough_summary(trips, zones):
    totals = {}
    for trip in trips:
        borough = zones.get(trip["pickup_zone_id"], "Unknown")
        entry = totals.setdefault(borough, {"trips": 0, "revenue": 0.0, "tips": 0.0, "fares": 0.0})
        entry["trips"] += 1
        entry["revenue"] += trip["total_amount"]
        entry["tips"] += trip["tip_amount"]
        entry["fares"] += trip["fare_amount"]
    summary = {}
    for borough in sorted(totals):
        entry = totals[borough]
        rate = entry["tips"] / entry["fares"] if entry["fares"] else 0.0
        summary[borough] = {"trips": entry["trips"], "revenue": round(entry["revenue"], 2), "tip_rate": round(rate, 3)}
    return summary

with open("trips.csv", encoding="utf-8") as f:
    trips, rejected = parse_trips(f.read())
print(borough_summary(trips, ZONES))
`,
        alternatives: [
          src`
from collections import defaultdict

def borough_summary(trips, zones):
    groups = defaultdict(list)
    for trip in trips:
        groups[zones.get(trip["pickup_zone_id"], "Unknown")].append(trip)
    result = {}
    for borough in sorted(groups):
        rows = groups[borough]
        fares = sum(r["fare_amount"] for r in rows)
        tips = sum(r["tip_amount"] for r in rows)
        result[borough] = {
            "trips": len(rows),
            "revenue": round(sum(r["total_amount"] for r in rows), 2),
            "tip_rate": round(tips / fares, 3) if fares else 0.0,
        }
    return result
`,
        ],
        wrong: [
          {
            code: src`
def borough_summary(trips, zones):
    summary = {}
    for trip in trips:
        borough = zones[trip["pickup_zone_id"]]
        entry = summary.setdefault(borough, {"trips": 0, "revenue": 0.0, "tip_rate": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total_amount"], 2)
        entry["tip_rate"] = round(trip["tip_amount"] / trip["fare_amount"], 3)
    return dict(sorted(summary.items()))
`,
            fails: ["returns", "unknown-zone", "zero-fares", "keeps-input"],
            why: "the tip rate is the last trip's, not the borough's, and an unknown zone raises KeyError",
          },
          {
            code: src`
def borough_summary(trips, zones):
    summary = {}
    for trip in trips:
        borough = zones.get(trip["pickup_zone_id"], "Unknown")
        trip["borough"] = borough
        entry = summary.setdefault(borough, {"trips": 0, "revenue": 0.0, "tips": 0.0, "fares": 0.0})
        entry["trips"] += 1
        entry["revenue"] += trip["total_amount"]
        entry["tips"] += trip["tip_amount"]
        entry["fares"] += trip["fare_amount"]
    return {b: {"trips": e["trips"], "revenue": round(e["revenue"], 2), "tip_rate": round(e["tips"] / e["fares"], 3) if e["fares"] else 0.0} for b, e in sorted(summary.items())}
`,
            fails: ["keeps-input"],
            why: "it writes a `borough` field into the caller's trips, so the core is no longer pure",
          },
        ],
        hints: [
          "One pass to accumulate per borough (count, revenue, tips, fares), then a second step to build the result in sorted order.",
          "Look boroughs up with `get` and a default, so an unknown zone can't crash the night's report.",
          "Compute the rate from the borough's sums, not trip by trip; guard against fares summing to 0.",
        ],
        task: {
          files: { ...TAXI_FILES, "trips.csv": TRIPS_CSV },
          checks: [
            expr("returns", "the fixture trips per borough", lines("from taxi.parse import parse_trips as _pt", "from taxi.zones import ZONES as _Z", "_trips, _ = _pt(open('trips.csv', encoding='utf-8').read())", "result = borough_summary(_trips, _Z)"), {
              Brooklyn: { trips: 1, revenue: 18.7, tip_rate: py.float(0) },
              Manhattan: { trips: 5, revenue: 152.8, tip_rate: 0.271 },
              Queens: { trips: 1, revenue: 66.71, tip_rate: 0.259 },
              Unknown: { trips: 1, revenue: 15.5, tip_rate: 0.354 },
            }, { show: "borough_summary(trips, ZONES)" }),
            fn("unknown-zone", "borough_summary", [hiddenCase("a zone missing from the table", [[{ pickup_zone_id: 999, fare_amount: 10, tip_amount: 2, total_amount: 14.5 }], {}], { Unknown: { trips: 1, revenue: 14.5, tip_rate: 0.2 } })], { label: "unknown zones are grouped as Unknown" }),
            fn("zero-fares", "borough_summary", [hiddenCase("fares that sum to zero", [[{ pickup_zone_id: 1, fare_amount: 0, tip_amount: 0, total_amount: 2.5 }], py.dict([[py.int(1), py.str("EWR")]])], { EWR: { trips: 1, revenue: 2.5, tip_rate: py.float(0) } }), hiddenCase("no trips", [[], {}], {})], { label: "zero fares and an empty night" }),
            fn("keeps-input", "borough_summary", [keepsInput([[{ pickup_zone_id: 186, fare_amount: 40.8, tip_amount: 10.7, total_amount: 64.19 }], {}], { label: "one trip" })], { label: "borough_summary() leaves the trips unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Wire the application together",
        prompt: "The `taxi` package next to your program has `taxi/parse.py` (`parse_trips(text)` → `(trips, rejected_lines)`) and `taxi/zones.py` (`ZONES`). Write the edge of the application, `run(input_path, output_path)`: read the CSV file, parse it with `parse_trips`, count trips and revenue per pickup borough with `ZONES` (unknown zone → `\"Unknown\"`; revenue rounded to 2 places), and write JSON `{\"boroughs\": {...}, \"rejected_lines\": [...]}` to `output_path`. Return the number of trips loaded.",
        spec: [
          ["Function", "`run(input_path, output_path)`"],
          ["Uses", "`from taxi.parse import parse_trips` and `from taxi.zones import ZONES`; don't copy them into your file"],
          ["Output", "`{\"boroughs\": {borough: {\"trips\": n, \"revenue\": r}}, \"rejected_lines\": [line numbers]}`"],
          ["Returns", "the number of trips that were loaded"],
        ],
        starter: src`
import json
from taxi.parse import parse_trips
from taxi.zones import ZONES

def run(input_path, output_path):
    return 0

print(run("trips.csv", "report.json"))
`,
        answer: src`
import json
from taxi.parse import parse_trips
from taxi.zones import ZONES

def revenue_by_borough(trips, zones):
    boroughs = {}
    for trip in trips:
        borough = zones.get(trip["pickup_zone_id"], "Unknown")
        entry = boroughs.setdefault(borough, {"trips": 0, "revenue": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total_amount"], 2)
    return boroughs

def run(input_path, output_path):
    with open(input_path, encoding="utf-8") as f:
        trips, rejected = parse_trips(f.read())
    report = {"boroughs": revenue_by_borough(trips, ZONES), "rejected_lines": rejected}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, sort_keys=True)
    return len(trips)

print(run("trips.csv", "report.json"))
`,
        alternatives: [
          src`
import json
from pathlib import Path
from taxi import parse, zones

def run(input_path, output_path):
    trips, rejected = parse.parse_trips(Path(input_path).read_text(encoding="utf-8"))
    boroughs = {}
    for trip in trips:
        name = zones.ZONES.get(trip["pickup_zone_id"], "Unknown")
        boroughs.setdefault(name, {"trips": 0, "revenue": 0.0})
        boroughs[name]["trips"] += 1
        boroughs[name]["revenue"] += trip["total_amount"]
    for entry in boroughs.values():
        entry["revenue"] = round(entry["revenue"], 2)
    Path(output_path).write_text(json.dumps({"boroughs": boroughs, "rejected_lines": rejected}), encoding="utf-8")
    return len(trips)
`,
        ],
        wrong: [
          {
            code: src`
import csv
import json

ZONES = {186: "Manhattan", 39: "Brooklyn", 70: "Queens"}

def run(input_path, output_path):
    boroughs = {}
    count = 0
    with open(input_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
            entry = boroughs.setdefault(borough, {"trips": 0, "revenue": 0.0})
            entry["trips"] += 1
            entry["revenue"] = round(entry["revenue"] + float(row["total_amount"]), 2)
            count += 1
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"boroughs": boroughs, "rejected_lines": []}, f)
    return count
`,
            fails: ["returns", "rejects"],
            why: "it re-implements parsing and copies a partial zone table instead of using the package, so zones are wrong and bad rows crash it",
          },
          {
            code: src`
import json
from taxi.parse import parse_trips
from taxi.zones import ZONES

def run(input_path, output_path):
    with open(input_path, encoding="utf-8") as f:
        trips, rejected = parse_trips(f.read())
    boroughs = {}
    for trip in trips:
        borough = ZONES.get(trip["pickup_zone_id"], "Unknown")
        entry = boroughs.setdefault(borough, {"trips": 0, "revenue": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total_amount"], 2)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"boroughs": boroughs}, f)
    return len(trips)
`,
            fails: ["returns", "rejects"],
            why: "the rejected line numbers are dropped, so the report can't show what was quarantined",
          },
        ],
        hints: [
          "`run` is the edge: open the input, call the package's parser, call your summary, write the output.",
          "Import `parse_trips` and `ZONES` from the package instead of writing your own versions.",
          "`json.dump(report, f)` writes the dictionary; the line numbers come straight from the parser.",
        ],
        task: {
          files: { ...TAXI_FILES, "trips.csv": TRIPS_CSV },
          checks: [
            expr("returns", "run() on the fixture export", lines("import json as _j", "_n = run('trips.csv', 'chk-report.json')", "result = (_n, _j.load(open('chk-report.json', encoding='utf-8')))"), py.tuple(py.int(8), pv({ boroughs: { Brooklyn: { trips: 1, revenue: 18.7 }, Manhattan: { trips: 5, revenue: 152.8 }, Queens: { trips: 1, revenue: 66.71 }, Unknown: { trips: 1, revenue: 15.5 } }, rejected_lines: [] })), { show: "run('trips.csv', 'report.json')" }),
            expr("rejects", "an export with broken rows", lines(
              "import json as _j",
              "open('bad.csv', 'w', encoding='utf-8').write('trip_id,pickup_zone_id,dropoff_zone_id,trip_distance_miles,fare_amount,tip_amount,total_amount\\n16126,186,179,9.2,40.8,10.7,64.19\\n16127,264,48,0.9,seven,2.55,15.5\\n16128,39,89,3.17,17.2,0,18.7\\n16129,100,166,4.86,-22.06,0,-26.81\\n')",
              "_n = run('bad.csv', 'chk-bad.json')",
              "result = (_n, _j.load(open('chk-bad.json', encoding='utf-8')))",
            ), py.tuple(py.int(2), pv({ boroughs: { Brooklyn: { trips: 1, revenue: 18.7 }, Manhattan: { trips: 1, revenue: 64.19 } }, rejected_lines: [3, 5] })), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def borough_revenue(trips, zones):
    revenue = {}
    for trip in trips:
        borough = zones.get(trip["zone"], "Unknown")
        revenue[borough] = revenue.get(borough, 0) + trip["total"]
    return revenue

test_zones = {1: "EWR", 132: "Queens"}
print(borough_revenue([{"zone": 132, "total": 70.0}, {"zone": 1, "total": 95.5}, {"zone": 7, "total": 12.0}, {"zone": 132, "total": 30.0}], test_zones))
`,
        choices: ["{'Queens': 100.0, 'EWR': 95.5, 'Unknown': 12.0}", "{'EWR': 95.5, 'Queens': 100.0, 'Unknown': 12.0}", "{'Queens': 70.0, 'EWR': 95.5, 'Unknown': 12.0}", "KeyError: 7"],
        answer: 0,
        why: "The core takes its zone table as a parameter, so a test passes a tiny one. Zone 7 isn't in it and becomes Unknown. A dictionary keeps the order in which boroughs first appeared.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a \"pure\" function that reads a global setting. The test changes the setting between two calls with the same arguments. What does this print?",
        program: src`
TAX_RATE = 0.0

def fare_with_tax(fare):
    return round(fare * (1 + TAX_RATE), 2)

first = fare_with_tax(40.0)
TAX_RATE = 0.05
second = fare_with_tax(40.0)
print(first, second, first == second)
`,
        choices: ["40.0 42.0 False", "40.0 40.0 True", "42.0 42.0 True", "40.0 42.0 True"],
        answer: 0,
        why: "Same argument, different answer: the result depends on hidden state, so the function isn't pure and tests can interfere with each other. Pass the rate in as a parameter (or a frozen config, the Application Delivery module).",
      },
      {
        id: "q3",
        prompt: "In the reviewed design, which function should contain `open(...)`?",
        choices: [
          "`run`, the edge that wires the steps together",
          "`borough_revenue`, because it needs the trips",
          "`format_report`, because it produces text",
          "All of them, so each can be tested with a real file",
        ],
        answer: 0,
        why: "Files are an edge concern. The core and the formatter take and return plain data, which is what makes them fast and easy to test.",
      },
    ],
    review: [
      "Ask of every function: what is its one job, and can it run without files, printing or globals?",
      "A pure core takes plain data (and tables or settings as parameters) and returns results; the edges read, write and wire.",
      "In a package, the edge (`run`/`main`) imports the core modules, never the other way round.",
      "Next: with the parts separated, test the whole pipeline: its outputs and its properties.",
    ],
  },
  // ------------------------------------------------------------------ PY-L50-02 integrated testing
  {
    id: "PY-L50-02",
    version: 2,
    slug: "test-the-whole-pipeline",
    title: "Test the whole pipeline and its properties",
    lede: "Unit tests check each function; an integrated test runs the whole pipeline, files and all, in a temporary folder. The strongest pipeline tests check properties that must hold for any input: every row is accounted for, the totals agree, and running twice changes nothing.",
    focus: "Run the pipeline end to end in a temporary folder and assert its invariants (accounting, consistent totals, identical reruns) on several inputs, not just one expected output.",
    minutes: 24,
    objectives: [
      "Write an end-to-end test that runs the real pipeline on fixture files in `tempfile.TemporaryDirectory`",
      "State a pipeline's invariants and assert them: loaded + rejected = rows read, totals match, reruns are identical",
      "Check invariants on several inputs, including empty and broken ones, so a defect can't hide behind one happy example",
    ],
    requires: ["aggregate-call", "any-call", "arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comp-if", "comparison", "continue-statement", "conversion", "csv-read", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "enumerate-call", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "newline-escape", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-format", "string-index", "string-method", "test-func", "top-level-indent", "try-except", "tuple-unpack", "unittest-case", "with-statement", "zip-call"],
    teaches: ["pipeline-invariant"],
    blocks: [
      {
        kind: "text",
        md: "The Testing & Code Quality module tested functions with known inputs and outputs, and the Software Architecture module introduced integration tests through the public entry point. For a data pipeline, comparing one output file with an expected file is a start, but it only covers the inputs you thought of. Pipelines also have **invariants**: properties that must be true for *any* input.\n\n- **Accounting:** every data row is either loaded or rejected; `loaded + rejected == rows read`. A pipeline that silently drops rows breaks it.\n- **Consistency:** the report's totals equal the sum over the loaded rows. Double-counting or lost rounding breaks it.\n- **Idempotence (see Reliable Data Pipelines):** running twice on the same input produces byte-identical output.\n- **Recovery (see Reliable Data Pipelines):** a crashed-and-resumed run equals a clean one.\n\nAn integrated test runs the real code end to end in a **temporary folder** (`tempfile.TemporaryDirectory()` creates one and deletes it after the `with` block), so tests never depend on files left over from earlier runs, and checks the invariants on several inputs: the normal export, an export with bad rows, an empty one.",
      },
      {
        kind: "example",
        title: "An end-to-end test in a temporary folder",
        code: src`
import csv
import io
import json
import os
import tempfile
import unittest

ZONES = {39: "Brooklyn", 70: "Queens", 186: "Manhattan"}

def run(input_path, output_path):
    with open(input_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    revenue, rejected = {}, []
    for number, row in enumerate(rows, start=2):
        try:
            total = float(row["total_amount"])
            zone = int(row["pickup_zone_id"])
        except ValueError:
            rejected.append(number)
            continue
        borough = ZONES.get(zone, "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"rows": len(rows), "rejected": rejected, "revenue": revenue}, f, sort_keys=True)

EXPORT = "trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16127,186,n/a\n16128,39,18.7\n16132,70,66.71\n"

class PipelineTest(unittest.TestCase):
    def run_pipeline(self, folder, text):
        source = os.path.join(folder, "trips.csv")
        target = os.path.join(folder, "report.json")
        with open(source, "w", encoding="utf-8") as f:
            f.write(text)
        run(source, target)
        with open(target, encoding="utf-8") as f:
            return f.read()

    def test_report_and_invariants(self):
        with tempfile.TemporaryDirectory() as folder:
            first = self.run_pipeline(folder, EXPORT)
            second = self.run_pipeline(folder, EXPORT)
        report = json.loads(first)
        self.assertEqual(report["revenue"], {"Brooklyn": 18.7, "Manhattan": 64.19, "Queens": 66.71})
        loaded = report["rows"] - len(report["rejected"])
        self.assertEqual(loaded + len(report["rejected"]), 4)
        self.assertEqual(round(sum(report["revenue"].values()), 2), 149.6)
        self.assertEqual(first, second)

result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(PipelineTest))
print("ran", result.testsRun, "ok", result.wasSuccessful())
print(os.listdir("."))
`,
        output: "ran 1 ok True\n[]\n",
        note: "The test wrote its input, ran the real `run`, read the real output, and compared two runs byte for byte. The temporary folder is gone afterwards: the current folder is still empty. The consistency check compares the report's revenue with the three good rows (64.19 + 18.7 + 66.71).",
      },
      {
        kind: "text",
        md: "An invariant is only as good as the inputs it is checked on. A pipeline that drops bad rows instead of reporting them passes every test that uses clean data:",
      },
      {
        kind: "error-example",
        title: "The accounting invariant catches a silent drop",
        code: src`
import csv
import io

def summarise(text):
    loaded, rejected = 0, []
    for row in csv.DictReader(io.StringIO(text)):
        try:
            float(row["total_amount"])
        except ValueError:
            continue
        loaded += 1
    return loaded, rejected

text = "trip_id,total_amount\n16126,64.19\n16127,n/a\n16128,18.7\n"
rows = len(text.strip().splitlines()) - 1
loaded, rejected = summarise(text)
assert loaded + len(rejected) == rows, f"{loaded} loaded + {len(rejected)} rejected != {rows} rows"
print("accounted for")
`,
        error: "AssertionError",
        output: "",
        note: "`AssertionError: 2 loaded + 0 rejected != 3 rows`. The bad row vanished: no crash, no quarantine, a smaller total in the report. With a clean export the same assertion would pass, which is why the test feeds it a broken row on purpose.",
      },
      {
        kind: "text",
        md: "Writing the invariants as one reusable function makes it cheap to check them on many inputs at once. Each input below is a small export built to stress one thing: a broken number, an empty file, a repeated trip.",
      },
      {
        kind: "example",
        title: "Invariants over several inputs",
        code: src`
import csv
import io

def summarise(text):
    revenue, rejected, seen = {}, [], set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        revenue[row["zone"]] = round(revenue.get(row["zone"], 0) + total, 2)
    return revenue, rejected

def broken_invariants(text, revenue, rejected):
    rows = list(csv.DictReader(io.StringIO(text)))
    problems = []
    loaded_rows = [row for n, row in enumerate(rows, start=2) if n not in rejected]
    if len(loaded_rows) + len(rejected) != len(rows):
        problems.append("accounting")
    if round(sum(revenue.values()), 2) != round(sum(float(r["total_amount"]) for r in loaded_rows), 2):
        problems.append("consistency")
    return problems

cases = {
    "normal": "trip_id,zone,total_amount\n16126,Manhattan,64.19\n16128,Brooklyn,18.7\n",
    "bad number": "trip_id,zone,total_amount\n16126,Manhattan,64.19\n16127,Manhattan,n/a\n",
    "empty": "trip_id,zone,total_amount\n",
    "repeated trip": "trip_id,zone,total_amount\n16126,Manhattan,64.19\n16126,Manhattan,64.19\n",
}
for name, text in cases.items():
    revenue, rejected = summarise(text)
    print(f"{name:14}", broken_invariants(text, revenue, rejected) or "all hold")
`,
        output: "normal         all hold\nbad number     all hold\nempty          all hold\nrepeated trip  all hold\n",
        note: "The checks don't know the expected totals for each case; they know rules every correct result obeys. Swap in a `summarise` that counts the repeated trip twice and the \"repeated trip\" line reports `['consistency']`.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every pipeline before it ships, and again in CI on every push (see Application Delivery). **Mistakes to avoid:** tests that read or write the real data folder; one happy-path fixture only; asserting exact floating-point sums (round both sides); and tests that pass because they check nothing about rows that were dropped.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Assert that every row is accounted for",
      prompt: "The test below checks the revenue but not the accounting, so a `process` that silently drops broken rows would pass it. Add an assertion that `result[\"loaded\"] + len(result[\"rejected\"])` equals the number of data rows (3). Leave the call to Check.",
      spec: [
        ["Target", "`process(text)` → `{\"loaded\": n, \"rejected\": [line numbers], \"revenue\": total}`"],
        ["Your test", "`test_broken_row_is_accounted_for` should fail for a `process` that drops bad rows without listing them"],
      ],
      starter: src`
import csv
import io

def process(text):
    loaded, rejected, revenue = 0, [], 0.0
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            revenue += float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": round(revenue, 2)}

def test_broken_row_is_accounted_for():
    result = process("trip_id,total_amount\n16126,64.19\n16127,n/a\n16128,18.7\n")
    assert result["revenue"] == 82.89
`,
      answer: src`
import csv
import io

def process(text):
    loaded, rejected, revenue = 0, [], 0.0
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            revenue += float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": round(revenue, 2)}

def test_broken_row_is_accounted_for():
    result = process("trip_id,total_amount\n16126,64.19\n16127,n/a\n16128,18.7\n")
    assert result["revenue"] == 82.89
    assert result["loaded"] + len(result["rejected"]) == 3
`,
      wrong: [
        {
          code: src`
import csv
import io

def process(text):
    loaded, rejected, revenue = 0, [], 0.0
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            revenue += float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": round(revenue, 2)}

def test_broken_row_is_accounted_for():
    result = process("trip_id,total_amount\n16126,64.19\n16127,n/a\n16128,18.7\n")
    assert result["revenue"] == 82.89
    assert result["loaded"] == 2
`,
          fails: ["tests-1"],
          why: "checking only `loaded` passes for a pipeline that drops the bad row without listing it",
        },
      ],
      hints: ["A dropped row changes neither the revenue nor the loaded count.", "Only the rejected list shows whether the bad row was accounted for.", "Assert that loaded plus the number of rejected lines equals the three data rows."],
      task: {
        checks: learnerTests("tests", {
          target: "process",
          correct: "import csv, io\ndef process(text):\n    loaded, rejected, revenue = 0, [], 0.0\n    for n, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):\n        try:\n            revenue += float(row['total_amount'])\n        except ValueError:\n            rejected.append(n)\n            continue\n        loaded += 1\n    return {'loaded': loaded, 'rejected': rejected, 'revenue': round(revenue, 2)}\n",
          defects: [
            { label: "a process that drops bad rows silently", code: "import csv, io\ndef process(text):\n    loaded, revenue = 0, 0.0\n    for row in csv.DictReader(io.StringIO(text)):\n        try:\n            revenue += float(row['total_amount'])\n        except ValueError:\n            continue\n        loaded += 1\n    return {'loaded': loaded, 'rejected': [], 'revenue': round(revenue, 2)}\n" },
          ],
        }),
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Tests that catch a broken pipeline",
        prompt: "`process(text)` is the fare report's core step. Its contract: each data row is loaded or rejected (by its line number, the header being line 1); a row whose `total_amount` isn't a number is rejected; a row repeating an earlier `trip_id` is rejected; revenue is summed per **pickup** borough using `ZONES` (unknown zone → `\"Unknown\"`), rounded to 2 places. Write tests (test functions or a TestCase) that pass for a correct `process` and fail for broken ones. Build your own small exports as text. Leave the calls to Check.",
        spec: [
          ["Target", "`process(text)` → `{\"loaded\": n, \"rejected\": [line numbers], \"revenue\": {borough: total}}`"],
          ["Columns", "`trip_id,pickup_zone_id,dropoff_zone_id,total_amount`"],
          ["Graded", "pass for a correct `process`, fail for each of three broken ones"],
        ],
        starter: src`
import csv
import io

ZONES = {39: "Brooklyn", 70: "Queens", 132: "Queens", 186: "Manhattan"}

def process(text):
    loaded, rejected, revenue, seen = 0, [], {}, set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": revenue}

def test_one_trip():
    result = process("trip_id,pickup_zone_id,dropoff_zone_id,total_amount\n16126,186,179,64.19\n")
    assert result["loaded"] == 1
`,
        answer: src`
import csv
import io

ZONES = {39: "Brooklyn", 70: "Queens", 132: "Queens", 186: "Manhattan"}

def process(text):
    loaded, rejected, revenue, seen = 0, [], {}, set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": revenue}

HEADER = "trip_id,pickup_zone_id,dropoff_zone_id,total_amount\n"

def test_every_row_is_accounted_for():
    text = HEADER + "16126,186,179,64.19\n16127,186,48,n/a\n16128,39,89,18.7\n"
    result = process(text)
    assert result["loaded"] + len(result["rejected"]) == 3
    assert result["rejected"] == [3]

def test_repeated_trip_is_rejected():
    text = HEADER + "16126,186,179,64.19\n16126,186,179,64.19\n"
    result = process(text)
    assert result["rejected"] == [3]
    assert result["revenue"] == {"Manhattan": 64.19}

def test_revenue_uses_pickup_borough():
    text = HEADER + "16132,70,186,66.71\n16133,186,39,34.0\n"
    assert process(text)["revenue"] == {"Queens": 66.71, "Manhattan": 34.0}
`,
        alternatives: [
          src`
import csv
import io
import unittest

ZONES = {39: "Brooklyn", 70: "Queens", 132: "Queens", 186: "Manhattan"}

def process(text):
    loaded, rejected, revenue, seen = 0, [], {}, set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": revenue}

class ProcessTest(unittest.TestCase):
    def setUp(self):
        self.text = (
            "trip_id,pickup_zone_id,dropoff_zone_id,total_amount\n"
            "1,132,186,70.00\n2,186,132,12.50\n2,186,132,12.50\n3,39,186,bad\n"
        )

    def test_invariants(self):
        result = process(self.text)
        self.assertEqual(result["loaded"] + len(result["rejected"]), 4)
        self.assertEqual(round(sum(result["revenue"].values()), 2), 82.5)

    def test_details(self):
        result = process(self.text)
        self.assertEqual(sorted(result["rejected"]), [4, 5])
        self.assertEqual(result["revenue"], {"Queens": 70.0, "Manhattan": 12.5})
`,
        ],
        wrong: [
          {
            code: src`
import csv
import io

ZONES = {39: "Brooklyn", 70: "Queens", 132: "Queens", 186: "Manhattan"}

def process(text):
    loaded, rejected, revenue, seen = 0, [], {}, set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": revenue}

def test_one_trip():
    result = process("trip_id,pickup_zone_id,dropoff_zone_id,total_amount\n16126,186,179,64.19\n")
    assert result["loaded"] == 1
    assert result["revenue"] == {"Manhattan": 64.19}
`,
          fails: ["tests-1", "tests-2"],
          why: "one clean trip has no bad row and no repeat, so the versions that drop bad rows or count repeats pass"
        },
        {
          code: src`
import csv
import io

ZONES = {39: "Brooklyn", 70: "Queens", 132: "Queens", 186: "Manhattan"}

def process(text):
    loaded, rejected, revenue, seen = 0, [], {}, set()
    for number, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):
        try:
            total = float(row["total_amount"])
        except ValueError:
            rejected.append(number)
            continue
        if row["trip_id"] in seen:
            rejected.append(number)
            continue
        seen.add(row["trip_id"])
        borough = ZONES.get(int(row["pickup_zone_id"]), "Unknown")
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
        loaded += 1
    return {"loaded": loaded, "rejected": rejected, "revenue": revenue}

HEADER = "trip_id,pickup_zone_id,dropoff_zone_id,total_amount\n"

def test_accounting():
    result = process(HEADER + "16126,186,179,64.19\n16127,186,48,n/a\n")
    assert result["loaded"] + len(result["rejected"]) == 2

def test_repeat():
    result = process(HEADER + "16126,186,179,64.19\n16126,186,179,64.19\n")
    assert result["loaded"] == 1
`,
          fails: ["tests-3"],
          why: "every test uses the same pickup and dropoff borough, so a version that reads the dropoff zone passes",
        },
      ],
      hints: [
        "Write one test per rule of the contract: accounting, repeated trips, and which zone decides the borough.",
        "Build small exports where a broken version gives a visibly different result: a bad number, a repeated trip ID, a trip whose pickup and dropoff are in different boroughs.",
        "Assert on the exact rejected line numbers and the exact revenue dictionary, not just that something came back.",
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "process",
          correct: "import csv, io\nZONES = {39: 'Brooklyn', 70: 'Queens', 132: 'Queens', 186: 'Manhattan'}\ndef process(text):\n    loaded, rejected, revenue, seen = 0, [], {}, set()\n    for n, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):\n        try:\n            total = float(row['total_amount'])\n        except ValueError:\n            rejected.append(n)\n            continue\n        if row['trip_id'] in seen:\n            rejected.append(n)\n            continue\n        seen.add(row['trip_id'])\n        b = ZONES.get(int(row['pickup_zone_id']), 'Unknown')\n        revenue[b] = round(revenue.get(b, 0) + total, 2)\n        loaded += 1\n    return {'loaded': loaded, 'rejected': rejected, 'revenue': revenue}\n",
          defects: [
            { label: "a process that drops bad rows silently", code: "import csv, io\nZONES = {39: 'Brooklyn', 70: 'Queens', 132: 'Queens', 186: 'Manhattan'}\ndef process(text):\n    loaded, revenue, seen = 0, {}, set()\n    for row in csv.DictReader(io.StringIO(text)):\n        try:\n            total = float(row['total_amount'])\n        except ValueError:\n            continue\n        if row['trip_id'] in seen:\n            continue\n        seen.add(row['trip_id'])\n        b = ZONES.get(int(row['pickup_zone_id']), 'Unknown')\n        revenue[b] = round(revenue.get(b, 0) + total, 2)\n        loaded += 1\n    return {'loaded': loaded, 'rejected': [], 'revenue': revenue}\n" },
            { label: "a process that loads repeated trips again", code: "import csv, io\nZONES = {39: 'Brooklyn', 70: 'Queens', 132: 'Queens', 186: 'Manhattan'}\ndef process(text):\n    loaded, rejected, revenue = 0, [], {}\n    for n, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):\n        try:\n            total = float(row['total_amount'])\n        except ValueError:\n            rejected.append(n)\n            continue\n        b = ZONES.get(int(row['pickup_zone_id']), 'Unknown')\n        revenue[b] = round(revenue.get(b, 0) + total, 2)\n        loaded += 1\n    return {'loaded': loaded, 'rejected': rejected, 'revenue': revenue}\n" },
            { label: "a process that uses the dropoff zone", code: "import csv, io\nZONES = {39: 'Brooklyn', 70: 'Queens', 132: 'Queens', 186: 'Manhattan'}\ndef process(text):\n    loaded, rejected, revenue, seen = 0, [], {}, set()\n    for n, row in enumerate(csv.DictReader(io.StringIO(text)), start=2):\n        try:\n            total = float(row['total_amount'])\n        except ValueError:\n            rejected.append(n)\n            continue\n        if row['trip_id'] in seen:\n            rejected.append(n)\n            continue\n        seen.add(row['trip_id'])\n        b = ZONES.get(int(row['dropoff_zone_id']), 'Unknown')\n        revenue[b] = round(revenue.get(b, 0) + total, 2)\n        loaded += 1\n    return {'loaded': loaded, 'rejected': rejected, 'revenue': revenue}\n" },
          ],
        }), [2, 3]),
      },
      },
      {
        id: "c2",
        title: "A reusable invariant checker",
        prompt: "Write `broken_invariants(text, result)`, which a CI job runs after every pipeline run. `text` is the CSV export (header first) and `result` is the pipeline's `{\"loaded\": n, \"rejected\": [line numbers], \"revenue\": {borough: total}}`. Return the sorted names of the invariants that don't hold: `\"rejected-lines\"` when a rejected line number is repeated or isn't a data line (2 to rows + 1); `\"accounting\"` when `loaded + len(rejected)` isn't the number of data rows; `\"consistency\"` when the revenue's sum (rounded to 2 places) differs from the sum of `total_amount` over the rows whose line isn't rejected (also rounded; a row whose total can't be read counts as 0).",
        spec: [
          ["Function", "`broken_invariants(text, result)`"],
          ["Rows", "data rows of the CSV text (read with `csv.DictReader`); the first data row is line 2"],
          ["Returns", "a sorted list of the broken invariant names; `[]` when all hold"],
          ["Rule", "`result` is not changed"],
        ],
        starter: src`
import csv
import io

def broken_invariants(text, result):
    return []

export = "trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16127,186,n/a\n16128,39,18.7\n"
good = {"loaded": 2, "rejected": [3], "revenue": {"Manhattan": 64.19, "Brooklyn": 18.7}}
dropped = {"loaded": 2, "rejected": [], "revenue": {"Manhattan": 64.19, "Brooklyn": 18.7}}
print(broken_invariants(export, good), broken_invariants(export, dropped))
`,
        answer: src`
import csv
import io

def total_of(row):
    try:
        return float(row["total_amount"])
    except (TypeError, ValueError):
        return 0.0

def broken_invariants(text, result):
    rows = list(csv.DictReader(io.StringIO(text)))
    rejected = result["rejected"]
    broken = []
    valid_lines = range(2, len(rows) + 2)
    if len(set(rejected)) != len(rejected) or any(n not in valid_lines for n in rejected):
        broken.append("rejected-lines")
    if result["loaded"] + len(rejected) != len(rows):
        broken.append("accounting")
    expected = sum(total_of(row) for n, row in enumerate(rows, start=2) if n not in rejected)
    if round(sum(result["revenue"].values()), 2) != round(expected, 2):
        broken.append("consistency")
    return sorted(broken)

export = "trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16127,186,n/a\n16128,39,18.7\n"
good = {"loaded": 2, "rejected": [3], "revenue": {"Manhattan": 64.19, "Brooklyn": 18.7}}
dropped = {"loaded": 2, "rejected": [], "revenue": {"Manhattan": 64.19, "Brooklyn": 18.7}}
print(broken_invariants(export, good), broken_invariants(export, dropped))
`,
        alternatives: [
          src`
import csv
import io

def broken_invariants(text, result):
    rows = list(csv.DictReader(io.StringIO(text)))
    rejected = list(result["rejected"])
    names = set()
    if sorted(set(rejected)) != sorted(rejected) or [n for n in rejected if n < 2 or n > len(rows) + 1]:
        names.add("rejected-lines")
    if result["loaded"] + len(rejected) != len(rows):
        names.add("accounting")
    kept = 0.0
    for line, row in zip(range(2, len(rows) + 2), rows):
        if line in rejected:
            continue
        try:
            kept += float(row["total_amount"])
        except ValueError:
            pass
    if abs(round(sum(result["revenue"].values()), 2) - round(kept, 2)) > 0.001:
        names.add("consistency")
    return sorted(names)
`,
        ],
        wrong: [
          {
            code: src`
import csv
import io

def broken_invariants(text, result):
    rows = list(csv.DictReader(io.StringIO(text)))
    broken = []
    if result["loaded"] + len(result["rejected"]) != len(rows):
        broken.append("accounting")
    total = sum(float(row["total_amount"]) for row in rows if row["total_amount"].replace(".", "").isdigit())
    if round(sum(result["revenue"].values()), 2) != round(total, 2):
        broken.append("consistency")
    return broken
`,
            fails: ["returns", "lines"],
            why: "the expected revenue includes rejected rows that happen to be numbers, and the rejected line numbers are never checked",
          },
          {
            code: src`
import csv
import io

def broken_invariants(text, result):
    rows = list(csv.DictReader(io.StringIO(text)))
    broken = []
    if any(n < 2 or n > len(rows) + 1 for n in result["rejected"]):
        broken.append("rejected-lines")
    if result["loaded"] + len(result["rejected"]) != len(rows):
        broken.append("accounting")
    expected = 0.0
    for n, row in enumerate(rows, start=2):
        if n not in result["rejected"]:
            expected += float(row["total_amount"])
    if round(sum(result["revenue"].values()), 2) != round(expected, 2):
        broken.append("consistency")
    return sorted(broken)
`,
            fails: ["returns", "lines"],
            why: "a row that wasn't rejected but has an unreadable total crashes it, and a repeated rejected line passes",
          },
        ],
        hints: [
          "Read the rows once; data line numbers run from 2 to `len(rows) + 1`.",
          "Three independent checks, each adding its name; sort the names at the end.",
          "For consistency, add the totals of the rows that weren't rejected, treating an unreadable total as 0, and round both sides.",
        ],
        task: {
          checks: [
            fn("returns", "broken_invariants", [
              example(["trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16127,186,n/a\n16128,39,18.7\n", { loaded: 2, rejected: [3], revenue: { Manhattan: 64.19, Brooklyn: 18.7 } }], []),
              example(["trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16127,186,n/a\n16128,39,18.7\n", { loaded: 2, rejected: [], revenue: { Manhattan: 64.19, Brooklyn: 18.7 } }], ["accounting"]),
              example(["trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16126,186,64.19\n", { loaded: 2, rejected: [], revenue: { Manhattan: 128.38 } }], []),
              hiddenCase("a repeated trip counted in the revenue but rejected", [
                "trip_id,pickup_zone_id,total_amount\n16126,186,64.19\n16126,186,64.19\n", { loaded: 1, rejected: [3], revenue: { Manhattan: 128.38 } },
              ], ["consistency"]),
              hiddenCase("an empty export", ["trip_id,pickup_zone_id,total_amount\n", { loaded: 0, rejected: [], revenue: {} }], []),
              hiddenCase("an unreadable total that wasn't rejected", ["trip_id,pickup_zone_id,total_amount\n1,186,64.19\n2,39,oops\n", { loaded: 2, rejected: [], revenue: { Manhattan: 64.19 } }], []),
            ], { label: "broken_invariants() names the invariants that fail" }),
            fn("lines", "broken_invariants", [
              hiddenCase("a rejected line number listed twice", ["trip_id,pickup_zone_id,total_amount\n1,186,n/a\n2,39,18.7\n", { loaded: 1, rejected: [2, 2], revenue: { Brooklyn: 18.7 } }], ["accounting", "rejected-lines"]),
              hiddenCase("a rejected line beyond the data", ["trip_id,pickup_zone_id,total_amount\n1,186,64.19\n", { loaded: 0, rejected: [9], revenue: {} }], ["consistency", "rejected-lines"]),
            ], { label: "rejected line numbers are checked" }),
            fn("keeps-input", "broken_invariants", [keepsInput(["trip_id,pickup_zone_id,total_amount\n1,186,5.0\n", { loaded: 1, rejected: [], revenue: { Manhattan: 5.0 } }], { label: "a one-row result" })], { label: "broken_invariants() leaves the result unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import os
import tempfile

with tempfile.TemporaryDirectory() as folder:
    path = os.path.join(folder, "report.json")
    with open(path, "w", encoding="utf-8") as f:
        f.write("{}")
    inside = os.path.exists(path)
print(inside, os.path.exists(path), os.path.exists(folder))
`,
        choices: ["True False False", "True True True", "True True False", "False False False"],
        answer: 0,
        why: "The folder and everything in it exist inside the `with` block and are deleted when it ends, so each test gets a clean place to write and leaves nothing behind.",
      },
      {
        id: "q2",
        prompt: "A common mistake: comparing money sums exactly. What does this print?",
        program: src`
totals = [10.1, 20.2]
report_revenue = 30.3
print(sum(totals) == report_revenue, round(sum(totals), 2) == round(report_revenue, 2))
`,
        choices: ["False True", "True True", "False False", "True False"],
        answer: 0,
        why: "Adding the floats gives `30.299999999999997`, which isn't exactly 30.3. An invariant check rounds both sides to cents (or uses Decimal, the Dates Numbers & Regex module) before comparing.",
      },
      {
        id: "q3",
        prompt: "Which test would catch a pipeline that silently drops rows it can't parse?",
        choices: [
          "Feed an export with a broken row and assert loaded + rejected equals the number of rows",
          "Feed a clean export and compare the report with the expected one",
          "Run the pipeline twice and compare the outputs",
          "Check that the report file exists",
        ],
        answer: 0,
        why: "Dropping a row only shows when there is a row to drop, and only the accounting invariant notices it is missing. The other tests pass for the broken pipeline.",
      },
    ],
    review: [
      "Integrated tests run the real pipeline end to end, in a temporary folder.",
      "Pipeline invariants: every row accounted for, totals consistent with the loaded rows, reruns identical, resumes equal to clean runs.",
      "Check invariants on many small inputs built to stress one thing each; round money before comparing.",
      "Next: the pipeline is correct; is it fast enough for a full night of trips?",
    ],
  },
  // ------------------------------------------------------------------ PY-L50-03 performance review
  {
    id: "PY-L50-03",
    version: 2,
    slug: "find-the-hot-path",
    title: "Find and fix the hot path",
    lede: "A full night is about forty thousand trips, and the report has started to take minutes. A performance review measures before changing anything, finds the one step that dominates, fixes its algorithm, and proves the output is unchanged.",
    focus: "Profile the whole pipeline, find the step whose calls or work dominate, replace its algorithm (an index instead of a scan, streaming instead of loading), and prove the results are identical.",
    minutes: 24,
    objectives: [
      "Profile the pipeline with cProfile and read call counts to find the hot path",
      "Replace a repeated scan with an index built once, and show the work saved with a counted measure",
      "Check that the optimised pipeline produces exactly the same result, and keep memory flat by streaming",
    ],
    requires: ["arithmetic", "assert-stmt", "assignment", "boolean", "break-statement", "comparison", "continue-statement", "counter-call", "csv-read", "defaultdict-call", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-index", "nested-loop", "newline-escape", "precedence", "print-call", "print-several", "print-text", "profile-call", "range-call", "reassignment", "string-index", "string-slice", "string-split", "top-level-indent", "truthiness", "unquoted-name", "with-statement"],
    teaches: ["hot-path"],
    blocks: [
      {
        kind: "text",
        md: "The Algorithms & Complexity module–the Profiling & Optimization module gave you the tools: counting operations, `timeit`, cProfile, indexes, caches and streaming. A performance review on a real application puts them in order:\n\n1. **Measure the whole run** on realistic input. Guessing is how people spend a day speeding up code that took 2% of the time.\n2. **Find the hot path**: the function with the most calls or the most work. cProfile's call counts are exact and repeatable; times vary by machine.\n3. **Fix the algorithm, not the syntax**: an index built once instead of a search per row; one pass instead of two; streaming instead of loading everything.\n4. **Prove nothing changed**: the new result must equal the old one on the same input (your pipeline tests from L02 do this), and measure again.\n\nThe capstone's zone lookup is the classic case: the zone table is a list of 265 rows, searched from the top for every trip.",
      },
      {
        kind: "example",
        title: "Profile the report",
        code: src`
import cProfile
import pstats

BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
ZONE_ROWS = [{"zone_id": z, "borough": BOROUGHS[z % 5]} for z in range(1, 266)]
TRIPS = [{"pickup_zone_id": (i * 37) % 265 + 1, "total_amount": 10 + i % 7} for i in range(800)]
examined = [0]

def borough_of(zone_id, zone_rows):
    for row in zone_rows:
        examined[0] += 1
        if row["zone_id"] == zone_id:
            return row["borough"]
    return "Unknown"

def summarise(trips, zone_rows):
    revenue = {}
    for trip in trips:
        borough = borough_of(trip["pickup_zone_id"], zone_rows)
        revenue[borough] = revenue.get(borough, 0) + trip["total_amount"]
    return revenue

profiler = cProfile.Profile()
before = profiler.runcall(summarise, TRIPS, ZONE_ROWS)
stats = pstats.Stats(profiler)
calls = sorted(((total, name) for (filename, line, name), (prim, total, own, cum, callers) in stats.stats.items() if filename != "~"), reverse=True)
for total, name in calls:
    print(name, total)
print("zone rows examined:", examined[0])
`,
        output: "borough_of 800\nsummarise 1\nzone rows examined: 106110\n",
        note: "The zone table is a stand-in with the 265 zone IDs from the NYC taxi zone table; the trips cycle through them. `borough_of` runs once per trip and scans on average half the table, so 800 trips examine over a hundred thousand rows. With forty thousand trips that is over five million row checks, all to answer a question with a fixed answer per zone.",
      },
      {
        kind: "text",
        md: "An \"optimisation\" that changes the answer isn't one. A tempting shortcut keys the index by borough name instead of zone ID, then can't look trips up at all:",
      },
      {
        kind: "error-example",
        title: "A faster version with a different answer",
        code: src`
ZONE_ROWS = [{"zone_id": 132, "borough": "Queens"}, {"zone_id": 186, "borough": "Manhattan"}]
TRIPS = [{"pickup_zone_id": 186, "total_amount": 64.19}, {"pickup_zone_id": 132, "total_amount": 70.0}]

def slow(trips, zone_rows):
    revenue = {}
    for trip in trips:
        borough = next((r["borough"] for r in zone_rows if r["zone_id"] == trip["pickup_zone_id"]), "Unknown")
        revenue[borough] = revenue.get(borough, 0) + trip["total_amount"]
    return revenue

def fast(trips, zone_rows):
    index = {row["borough"]: row["zone_id"] for row in zone_rows}
    revenue = {}
    for trip in trips:
        borough = index.get(trip["pickup_zone_id"], "Unknown")
        revenue[borough] = revenue.get(borough, 0) + trip["total_amount"]
    return revenue

assert fast(TRIPS, ZONE_ROWS) == slow(TRIPS, ZONE_ROWS), "the optimised report differs"
print("same result")
`,
        error: "AssertionError",
        output: "",
        note: "`AssertionError: the optimised report differs`. The index maps the wrong way round, so every trip lands in Unknown. Comparing old and new results on the same input catches this before it ships.",
      },
      {
        kind: "example",
        title: "Build the index once, prove the result is the same",
        code: src`
BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
ZONE_ROWS = [{"zone_id": z, "borough": BOROUGHS[z % 5]} for z in range(1, 266)]
TRIPS = [{"pickup_zone_id": (i * 37) % 265 + 1, "total_amount": 10 + i % 7} for i in range(800)]

def summarise_scan(trips, zone_rows):
    revenue = {}
    for trip in trips:
        borough = "Unknown"
        for row in zone_rows:
            if row["zone_id"] == trip["pickup_zone_id"]:
                borough = row["borough"]
                break
        revenue[borough] = revenue.get(borough, 0) + trip["total_amount"]
    return revenue

def summarise_indexed(trips, zone_rows):
    borough_by_zone = {row["zone_id"]: row["borough"] for row in zone_rows}
    revenue = {}
    for trip in trips:
        borough = borough_by_zone.get(trip["pickup_zone_id"], "Unknown")
        revenue[borough] = revenue.get(borough, 0) + trip["total_amount"]
    return revenue

print(summarise_indexed(TRIPS, ZONE_ROWS) == summarise_scan(TRIPS, ZONE_ROWS))
print("lookups:", len(TRIPS), "dictionary lookups instead of", len(TRIPS), "scans of", len(ZONE_ROWS), "rows")
print(summarise_indexed(TRIPS, ZONE_ROWS))
`,
        output: "True\nlookups: 800 dictionary lookups instead of 800 scans of 265 rows\n{'Brooklyn': 2081, 'Bronx': 2080, 'Manhattan': 2079, 'Queens': 2078, 'Staten Island': 2077}\n",
        note: "The index costs one pass over 265 rows; each trip then needs one hash lookup (see Algorithms & Complexity) instead of up to 265 comparisons. The result is checked against the old version on the same trips before anything else.",
      },
      {
        kind: "text",
        md: "The other resource is memory. Reading a night's export with `f.readlines()` or `list(csv.DictReader(f))` holds every row at once; iterating the reader keeps one row at a time (the Iterators & Generators module, the Profiling & Optimization module), so memory stays flat however big the file gets. The second challenge measures that with `tracemalloc`.\n\n**Mistakes to avoid:** optimising without a profile; micro-tweaks (local variable caching, string tricks) before fixing the algorithm; rebuilding the index inside the loop; comparing timings from one noisy run; and skipping the old-versus-new comparison.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Look up, don't scan",
      prompt: "`borough_of` scans the zone list for every trip. The caller now passes `zone_index`, a dictionary from zone ID to borough built once. Use it: return the borough in one lookup, or `\"Unknown\"`.",
      spec: [
        ["Function", "`borough_of(zone_id, zone_index)`"],
        ["Returns", "`zone_index[zone_id]`, or `\"Unknown\"` when the zone isn't there"],
      ],
      starter: src`
def borough_of(zone_id, zone_index):
    for zone, borough in zone_index.items():
        if zone == zone_id:
            return borough
    return "Unknown"

zone_index = {132: "Queens", 186: "Manhattan", 39: "Brooklyn"}
print(borough_of(186, zone_index), borough_of(999, zone_index))
`,
      answer: src`
def borough_of(zone_id, zone_index):
    return zone_index.get(zone_id, "Unknown")

zone_index = {132: "Queens", 186: "Manhattan", 39: "Brooklyn"}
print(borough_of(186, zone_index), borough_of(999, zone_index))
`,
      wrong: [
        {
          code: src`
def borough_of(zone_id, zone_index):
    return zone_index[zone_id]
`,
          fails: ["unknown"],
          why: "a zone missing from the table raises KeyError and stops the night's report",
        },
      ],
      hints: ["A dictionary finds a key without looking at the others.", "`get` takes a default for a missing key.", "The whole function can be one return."],
      task: {
        checks: [
          fn("returns", "borough_of", [example([186, py.dict([[py.int(132), py.str("Queens")], [py.int(186), py.str("Manhattan")]])], "Manhattan")], { label: "borough_of() finds a known zone" }),
          fn("unknown", "borough_of", [hiddenCase("a zone missing from the table", [999, py.dict([[py.int(132), py.str("Queens")]])], "Unknown")], { label: "unknown zones give Unknown" }),
          expr("lookups", "borough_of() checks only one key", lines(
            "_n = [0]",
            "class _Z(int):",
            "    def __eq__(self, other):",
            "        _n[0] += 1",
            "        return int.__eq__(self, other)",
            "    __hash__ = int.__hash__",
            "_index = {_Z(z): 'Manhattan' for z in range(1, 266)}",
            "borough_of(_Z(250), _index)",
            "result = _n[0] <= 2",
          ), true, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Speed up revenue per zone name",
        prompt: "The airport team wants revenue per pickup **zone name**. `revenue_by_zone(trips, zone_rows)` works but scans `zone_rows` for every trip. Rewrite it to give exactly the same result while comparing zone IDs at most a few times per trip. Trips whose zone isn't in the table go under `\"Unknown\"`; revenue is rounded to 2 places at the end; zone names appear in the order they first occur in the trips.",
        spec: [
          ["Function", "`revenue_by_zone(trips, zone_rows)`"],
          ["zone_rows", "a list of `{\"zone_id\": int, \"zone_name\": str}`"],
          ["Returns", "`{zone_name: revenue}` exactly as the current version returns it"],
          ["Constraint", "for 600 trips and 120 zones, at most 1,500 comparisons and hash computations of zone IDs (the scan needs about 36,000 comparisons)"],
        ],
        starter: src`
def revenue_by_zone(trips, zone_rows):
    revenue = {}
    for trip in trips:
        name = "Unknown"
        for row in zone_rows:
            if row["zone_id"] == trip["pickup_zone_id"]:
                name = row["zone_name"]
                break
        revenue[name] = revenue.get(name, 0) + trip["total_amount"]
    return {name: round(total, 2) for name, total in revenue.items()}

zones = [{"zone_id": 132, "zone_name": "JFK Airport"}, {"zone_id": 138, "zone_name": "LaGuardia Airport"}, {"zone_id": 186, "zone_name": "Penn Station/Madison Sq West"}]
trips = [{"pickup_zone_id": 132, "total_amount": 70.0}, {"pickup_zone_id": 186, "total_amount": 64.19}, {"pickup_zone_id": 132, "total_amount": 81.42}, {"pickup_zone_id": 999, "total_amount": 9.5}]
print(revenue_by_zone(trips, zones))
`,
        answer: src`
def revenue_by_zone(trips, zone_rows):
    name_by_zone = {row["zone_id"]: row["zone_name"] for row in zone_rows}
    revenue = {}
    for trip in trips:
        name = name_by_zone.get(trip["pickup_zone_id"], "Unknown")
        revenue[name] = revenue.get(name, 0) + trip["total_amount"]
    return {name: round(total, 2) for name, total in revenue.items()}

zones = [{"zone_id": 132, "zone_name": "JFK Airport"}, {"zone_id": 138, "zone_name": "LaGuardia Airport"}, {"zone_id": 186, "zone_name": "Penn Station/Madison Sq West"}]
trips = [{"pickup_zone_id": 132, "total_amount": 70.0}, {"pickup_zone_id": 186, "total_amount": 64.19}, {"pickup_zone_id": 132, "total_amount": 81.42}, {"pickup_zone_id": 999, "total_amount": 9.5}]
print(revenue_by_zone(trips, zones))
`,
        alternatives: [
          src`
from collections import defaultdict

def revenue_by_zone(trips, zone_rows):
    lookup = dict((row["zone_id"], row["zone_name"]) for row in zone_rows)
    totals = defaultdict(float)
    for trip in trips:
        totals[lookup.get(trip["pickup_zone_id"], "Unknown")] += trip["total_amount"]
    return {k: round(v, 2) for k, v in totals.items()}
`,
        ],
        wrong: [
          {
            code: src`
def revenue_by_zone(trips, zone_rows):
    revenue = {}
    for trip in trips:
        index = {row["zone_id"]: row["zone_name"] for row in zone_rows}
        name = index.get(trip["pickup_zone_id"], "Unknown")
        revenue[name] = revenue.get(name, 0) + trip["total_amount"]
    return {name: round(total, 2) for name, total in revenue.items()}
`,
            fails: ["comparisons"],
            why: "the index is rebuilt inside the loop, so the work per trip is as large as before",
          },
          {
            code: src`
def revenue_by_zone(trips, zone_rows):
    name_by_zone = {row["zone_id"]: row["zone_name"] for row in zone_rows}
    revenue = {}
    for trip in trips:
        name = name_by_zone.get(trip["pickup_zone_id"], "Unknown")
        revenue[name] = round(revenue.get(name, 0) + trip["total_amount"])
    return revenue
`,
            fails: ["returns", "same-as-before"],
            why: "`round(x)` without places rounds to whole dollars, so the faster version changes the report",
          },
        ],
        hints: [
          "Build a dictionary from zone ID to zone name once, before the loop.",
          "Inside the loop, one `get` with a default replaces the inner scan.",
          "Keep the rounding exactly where it was, so the result can't change.",
        ],
        task: {
          checks: [
            fn("returns", "revenue_by_zone", [
              example([[{ pickup_zone_id: 132, total_amount: 70.0 }, { pickup_zone_id: 186, total_amount: 64.19 }, { pickup_zone_id: 132, total_amount: 81.42 }, { pickup_zone_id: 999, total_amount: 9.5 }], [{ zone_id: 132, zone_name: "JFK Airport" }, { zone_id: 138, zone_name: "LaGuardia Airport" }, { zone_id: 186, zone_name: "Penn Station/Madison Sq West" }]], { "JFK Airport": 151.42, "Penn Station/Madison Sq West": 64.19, Unknown: 9.5 }),
              example([[], [{ zone_id: 1, zone_name: "Newark Airport" }]], {}),
              example([[{ pickup_zone_id: 1, total_amount: 95.33 }], [{ zone_id: 1, zone_name: "Newark Airport" }]], { "Newark Airport": 95.33 }),
            ], { label: "revenue_by_zone() gives the same report", compare: { numbers: "int-float-equal" } }),
            expr("same-as-before", "the same result as the scan on 600 trips", lines(
              "_zones = [{'zone_id': z, 'zone_name': 'zone ' + str(z)} for z in range(1, 121)]",
              "_trips = [{'pickup_zone_id': (i * 7) % 130 + 1, 'total_amount': 5 + (i % 13) * 1.25} for i in range(600)]",
              "def _scan(trips, zone_rows):",
              "    revenue = {}",
              "    for trip in trips:",
              "        name = 'Unknown'",
              "        for row in zone_rows:",
              "            if row['zone_id'] == trip['pickup_zone_id']:",
              "                name = row['zone_name']",
              "                break",
              "        revenue[name] = revenue.get(name, 0) + trip['total_amount']",
              "    return {name: round(total, 2) for name, total in revenue.items()}",
              "result = list(revenue_by_zone(_trips, _zones).items()) == list(_scan(_trips, _zones).items())",
            ), true, { hidden: true }),
            expr("comparisons", "at most 1,500 zone-ID comparisons and hashes for 600 trips and 120 zones", lines(
              "_n = [0]",
              "class _Z(int):",
              "    def __eq__(self, other):",
              "        _n[0] += 1",
              "        return int.__eq__(self, other)",
              "    def __hash__(self):",
              "        _n[0] += 1",
              "        return int.__hash__(self)",
              "_zones = [{'zone_id': _Z(z), 'zone_name': 'zone ' + str(z)} for z in range(1, 121)]",
              "_trips = [{'pickup_zone_id': _Z((i * 7) % 120 + 1), 'total_amount': 10.0} for i in range(600)]",
              "revenue_by_zone(_trips, _zones)",
              "result = _n[0] <= 1500",
            ), true),
          ],
        },
      },
      {
        id: "c2",
        title: "Count trips per hour without loading the night",
        prompt: "The hourly chart needs trips per pickup hour from the night's export. Write `trips_per_hour(path)`: read the CSV file (columns include `pickup_at`, like `2025-01-15 00:12:47`) and return a dictionary from hour (`\"00\"` to `\"23\"`, the two characters after the space) to the number of trips, hours in ascending order. Read the file one row at a time: the check measures peak memory with `tracemalloc` on a 20,000-row export and allows at most 400 KB, while loading every row at once needs several megabytes.",
        spec: [
          ["Function", "`trips_per_hour(path)`"],
          ["Hour", "`pickup_at[11:13]`"],
          ["Returns", "`{hour: count}` with hours in ascending order; rows with an empty `pickup_at` are skipped"],
          ["Constraint", "peak memory of the call at most 400 KB for a 20,000-row file (about 1.4 MB on disk)"],
        ],
        starter: src`
import csv

def trips_per_hour(path):
    with open(path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    counts = {}
    for row in rows:
        hour = row["pickup_at"][11:13]
        counts[hour] = counts.get(hour, 0) + 1
    return dict(sorted(counts.items()))

with open("night.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_at,total_amount\n16126,2025-01-15 00:12:47,64.19\n16127,2025-01-15 00:18:28,15.5\n16138,2025-01-15 01:02:11,23.1\n")
print(trips_per_hour("night.csv"))
`,
        answer: src`
import csv

def trips_per_hour(path):
    counts = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if not row["pickup_at"]:
                continue
            hour = row["pickup_at"][11:13]
            counts[hour] = counts.get(hour, 0) + 1
    return dict(sorted(counts.items()))

with open("night.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_at,total_amount\n16126,2025-01-15 00:12:47,64.19\n16127,2025-01-15 00:18:28,15.5\n16138,2025-01-15 01:02:11,23.1\n")
print(trips_per_hour("night.csv"))
`,
        alternatives: [
          src`
from collections import Counter

def trips_per_hour(path):
    hours = Counter()
    with open(path, encoding="utf-8") as f:
        header = next(f).rstrip("\n").split(",")
        column = header.index("pickup_at")
        for line in f:
            value = line.rstrip("\n").split(",")[column]
            if value:
                hours[value[11:13]] += 1
    return {hour: hours[hour] for hour in sorted(hours)}
`,
        ],
        wrong: [
          {
            code: src`
import csv

def trips_per_hour(path):
    with open(path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    counts = {}
    for row in rows:
        if row["pickup_at"]:
            hour = row["pickup_at"][11:13]
            counts[hour] = counts.get(hour, 0) + 1
    return dict(sorted(counts.items()))
`,
            fails: ["memory"],
            why: "the right counts, but every row of the night is held in memory at once",
          },
          {
            code: src`
import csv

def trips_per_hour(path):
    counts = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            hour = row["pickup_at"][11:13]
            counts[hour] = counts.get(hour, 0) + 1
    return counts
`,
            fails: ["returns", "missing-times"],
            why: "hours come out in file order, and rows with no pickup time are counted under an empty hour",
          },
        ],
        hints: [
          "Iterate the `csv.DictReader` directly inside the `with` block instead of making a list of it.",
          "Keep only the counts: one small dictionary of at most 24 entries.",
          "Skip rows with an empty time, and sort the hours when building the result.",
        ],
        task: {
          checks: [
            expr("returns", "a small night", lines(
              "open('n1.csv', 'w', encoding='utf-8').write('trip_id,pickup_at,total_amount\\n16138,2025-01-15 01:02:11,23.1\\n16126,2025-01-15 00:12:47,64.19\\n16127,2025-01-15 00:18:28,15.5\\n')",
              "result = list(trips_per_hour('n1.csv').items())",
            ), [t("00", 2), t("01", 1)], { show: "trips_per_hour('night.csv')" }),
            expr("missing-times", "rows with no pickup time", lines(
              "open('n2.csv', 'w', encoding='utf-8').write('trip_id,pickup_at,total_amount\\n1,,5.0\\n2,2025-01-15 23:59:59,7.5\\n')",
              "result = trips_per_hour('n2.csv')",
            ), { "23": 1 }, { hidden: true }),
            expr("memory", "peak memory for a 20,000-row night is at most 400 KB", lines(
              "import tracemalloc as _tm",
              "with open('n3.csv', 'w', encoding='utf-8') as _f:",
              "    _f.write('trip_id,vendor_id,pickup_at,dropoff_at,trip_distance_miles,total_amount\\n')",
              "    for _i in range(20000):",
              "        _f.write(f'{16126 + _i},2,2025-01-15 {_i % 24:02d}:{_i % 60:02d}:47,2025-01-15 {_i % 24:02d}:59:06,{_i % 17 + 0.4},{10 + _i % 50}.19\\n')",
              "_tm.start()",
              "_counts = trips_per_hour('n3.csv')",
              "_peak = _tm.get_traced_memory()[1]",
              "_tm.stop()",
              "result = (sum(_counts.values()), _peak <= 400_000)",
            ), t(20000, true)),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
zone_rows = [{"zone_id": z, "borough": "Manhattan"} for z in range(1, 101)]
trips = [50, 100, 1, 999]
scan_checks = 0
for zone_id in trips:
    for row in zone_rows:
        scan_checks += 1
        if row["zone_id"] == zone_id:
            break
index = {row["zone_id"]: row["borough"] for row in zone_rows}
print(scan_checks, len(index), [index.get(z, "Unknown") for z in trips][-1])
`,
        choices: ["251 100 Unknown", "400 100 Unknown", "151 100 Unknown", "251 100 Manhattan"],
        answer: 0,
        why: "Zone 50 takes 50 checks, 100 takes 100, 1 takes 1, and the missing 999 scans all 100: 251. The index answers each trip with one lookup after one pass to build it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: \"optimising\" the index by building it inside the loop. How many dictionary entries are built for 1,000 trips?",
        program: src`
zone_rows = [{"zone_id": z, "borough": "Queens"} for z in range(1, 266)]
built = 0
for trip in range(1000):
    index = {}
    for row in zone_rows:
        index[row["zone_id"]] = row["borough"]
        built += 1
print(built)
`,
        choices: ["265000", "265", "1000", "1265"],
        answer: 0,
        why: "Rebuilding the index per trip costs as much as the scan it replaced (more, even). An index pays off only when it is built once and reused.",
      },
      {
        id: "q3",
        prompt: "The nightly report got slow. What should happen first?",
        choices: [
          "Profile a run on realistic data to find which step dominates",
          "Rewrite the parser with faster string methods",
          "Add a cache to every function",
          "Move the job to a bigger server",
        ],
        answer: 0,
        why: "Without a measurement any change is a guess. The profile shows where the time goes; the fix goes there, and the results are compared before and after.",
      },
    ],
    review: [
      "Measure the whole run first; cProfile's call counts show the hot path exactly.",
      "Fix the algorithm: an index built once instead of a scan per row; stream rows instead of loading them all.",
      "Prove the optimised version gives the same result on the same input, then measure again.",
      "Next: make the fast, correct pipeline survive bad rows, flaky storage and crashes, all at once.",
    ],
  },
  // ------------------------------------------------------------------ PY-L50-04 resilience
  {
    id: "PY-L50-04",
    version: 2,
    slug: "survive-a-bad-night",
    title: "Make the pipeline survive a bad night",
    lede: "In production, everything goes wrong at once: a few rows are malformed, the report storage times out now and then, and the job is killed halfway through. A resilient pipeline combines the safeguards from the Reliable Data Pipelines module and the Observability & Operations module, each for the failure it fits, and counts every outcome.",
    focus: "Combine quarantine for bad rows, retries for transient write failures, checkpoints for crashes and isolation for failing batches in one pipeline, and report what happened with counters.",
    minutes: 26,
    objectives: [
      "Match each failure to its safeguard: bad data → quarantine; transient errors → retry; crashes → checkpoint and resume; a poison batch → set aside",
      "Write a batch loop that retries writes, saves progress after each batch and resumes from it",
      "Report the night with counters: loaded, rejected, retries, batches done, batches set aside",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "break-statement", "class-def", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "exc-name", "except-type", "for-loop", "function-def", "function-default", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "lambda", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "nested-loop", "none-value", "partial-call", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "self-name", "string-format", "string-index", "string-slice", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "while-loop"],
    teaches: ["resilient-run"],
    blocks: [
      {
        kind: "text",
        md: "Each earlier lesson handled one kind of failure. A real night brings several, and each needs a different response:\n\n| Failure | Example | Response |\n| --- | --- | --- |\n| Bad data | a total of `n/a` | **quarantine** the row, keep going (see Reliable Data Pipelines) |\n| Transient error | storage times out | **retry** with backoff (see Observability & Operations) |\n| Crash | the job is killed at 02:10 | **checkpoint** after each batch, **resume** (see Reliable Data Pipelines) |\n| Poison batch | one batch always fails | **set it aside** with its error, keep going |\n| Everything else | a bug, a permission error | **stop**, loudly |\n\nThe last row matters as much as the others: a pipeline that catches *every* error hides bugs and writes half a report. And all of it is counted (see Observability & Operations), so the morning report says what happened: rows loaded and rejected, retries used, batches written, batches set aside.\n\nThe examples use a small in-memory **sink** standing in for the report storage. Its writes are idempotent (keyed by trip ID, the Reliable Data Pipelines module), which makes retries and resumed batches safe; its failures are scripted, so you can watch each safeguard act.",
      },
      {
        kind: "example",
        title: "Quarantine, retry and checkpoint in one run",
        code: src`
class FlakySink:
    """Report storage: rows stored by trip_id; the first writes time out."""
    def __init__(self, timeouts):
        self.rows = {}
        self.timeouts = timeouts

    def write(self, batch):
        if self.timeouts:
            self.timeouts -= 1
            raise TimeoutError("storage did not answer")
        for row in batch:
            self.rows[row["trip_id"]] = row

def write_with_retry(sink, batch, sleep, metrics, attempts=3):
    for n in range(attempts):
        try:
            sink.write(batch)
            return
        except TimeoutError:
            if n == attempts - 1:
                raise
            metrics["retries"] += 1
            sleep(2 ** n)

def run(rows, sink, checkpoint, sleep, batch_size=2):
    metrics = {"loaded": 0, "rejected": 0, "retries": 0}
    for start in range(checkpoint["done"], len(rows), batch_size):
        good = []
        for row in rows[start:start + batch_size]:
            try:
                good.append({"trip_id": row["trip_id"], "total": float(row["total_amount"])})
            except ValueError:
                metrics["rejected"] += 1
        write_with_retry(sink, good, sleep, metrics)
        metrics["loaded"] += len(good)
        checkpoint["done"] = start + batch_size
    return metrics

night = [
    {"trip_id": 16126, "total_amount": "64.19"}, {"trip_id": 16127, "total_amount": "n/a"},
    {"trip_id": 16128, "total_amount": "18.7"}, {"trip_id": 16130, "total_amount": "11.1"},
    {"trip_id": 16131, "total_amount": "26.46"},
]
sink, checkpoint, waits = FlakySink(timeouts=2), {"done": 0}, []
print(run(night, sink, checkpoint, waits.append))
print("stored", sorted(sink.rows), "waits", waits, "checkpoint", checkpoint)
`,
        output: "{'loaded': 4, 'rejected': 1, 'retries': 2}\nstored [16126, 16128, 16130, 16131] waits [1, 2] checkpoint {'done': 6}\n",
        note: "The bad row was quarantined (counted, not written), the first batch's two timeouts were retried with waits of 1 and 2 seconds, and the checkpoint moved after each stored batch. The last batch holds one row, so the checkpoint ends past the end of the list, which a resume simply skips.",
      },
      {
        kind: "text",
        md: "Some errors must not be retried or skipped. If the storage refuses writes because of a permission problem, retrying won't help and skipping would publish half a report. The pipeline stops, and the checkpoint shows exactly how far it got:",
      },
      {
        kind: "error-example",
        title: "A permanent error stops the run",
        code: src`
class ReadOnlySink:
    def __init__(self):
        self.rows = {}

    def write(self, batch):
        raise PermissionError("report storage is read-only")

checkpoint = {"done": 2}
rows = [{"trip_id": 16128, "total_amount": "18.7"}]
for start in range(0, len(rows)):
    ReadOnlySink().write(rows)
    checkpoint["done"] += 1
print("finished", checkpoint)
`,
        error: "PermissionError",
        output: "",
        note: "`PermissionError: report storage is read-only`. The retry helper only catches `TimeoutError`, so this reaches the operator at once, with the checkpoint still at the last good batch. Once the permission is fixed, the run resumes from there.",
      },
      {
        kind: "text",
        md: "A **poison batch** is the in-between case: a batch the storage rejects every time (say, a row that breaks one of its constraints) while every other batch is fine. Stopping the whole night for it is too strict, retrying it forever is pointless. Set it aside in a **dead-letter list** with its error, keep going, and report it, so someone fixes those rows in the morning. And when the job is killed and restarted, the checkpoint means finished batches aren't written again.",
      },
      {
        kind: "example",
        title: "Set a poison batch aside, then resume after a crash",
        code: src`
class Killed(Exception):
    """Stands in for the scheduler killing the process."""

class Sink:
    def __init__(self, reject_ids=()):
        self.rows = {}
        self.reject_ids = set(reject_ids)
        self.writes = 0

    def write(self, batch):
        self.writes += 1
        bad = [row["trip_id"] for row in batch if row["trip_id"] in self.reject_ids]
        if bad:
            raise ValueError(f"constraint failed for trips {bad}")
        for row in batch:
            self.rows[row["trip_id"]] = row

def run(batches, sink, checkpoint, stop_after=None):
    dead_letters = []
    for number in range(checkpoint["done"], len(batches)):
        if stop_after is not None and number == stop_after:
            raise Killed("job killed by the scheduler")
        try:
            sink.write(batches[number])
        except ValueError as err:
            dead_letters.append((number, str(err)))
        checkpoint["done"] = number + 1
    return dead_letters

batches = [[{"trip_id": 16126}, {"trip_id": 16127}], [{"trip_id": 16128}, {"trip_id": 16130}], [{"trip_id": 16131}, {"trip_id": 16132}]]
sink, checkpoint = Sink(reject_ids=[16130]), {"done": 0}
try:
    run(batches, sink, checkpoint, stop_after=2)
except Killed as err:
    print("crash:", err, "| checkpoint", checkpoint)
print("resumed, set aside:", run(batches, sink, checkpoint))
print("stored", sorted(sink.rows), "writes", sink.writes)
`,
        output: "crash: job killed by the scheduler | checkpoint {'done': 2}\nresumed, set aside: []\nstored [16126, 16127, 16131, 16132] writes 3\n",
        note: "The first run stored batch 0, set batch 1 aside, and was killed before batch 2. The resumed run started at the checkpoint, so batch 0 wasn't written again: three writes in total for three batches. (The dead-letter list of the first run was lost in the crash; a production pipeline keeps it next to the checkpoint.)",
      },
      {
        kind: "text",
        md: "**When to use it:** any unattended job: nightly reports, imports, backfills. **Mistakes to avoid:** one `except Exception` around everything (bugs become \"bad data\"); retrying data errors; skipping storage errors that aren't the batch's fault; checkpointing before the write succeeds; and a report that says \"done\" without the counts of what was rejected and set aside.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Retry the storage write",
      prompt: "`store_batch` calls `sink.write(batch)` once, so a single timeout fails the whole night. Use the given `with_retry(func, attempts, sleep)` helper to call it with up to 3 attempts.",
      spec: [
        ["Function", "`store_batch(sink, batch, sleep)`"],
        ["Rule", "write through `with_retry` with 3 attempts; return the number of rows written"],
      ],
      starter: src`
def with_retry(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def store_batch(sink, batch, sleep):
    sink.write(batch)
    return len(batch)

class FlakySink:
    def __init__(self, timeouts):
        self.timeouts = timeouts
        self.rows = []

    def write(self, batch):
        if self.timeouts:
            self.timeouts -= 1
            raise TimeoutError("storage did not answer")
        self.rows.extend(batch)

waits = []
print(store_batch(FlakySink(1), [{"trip_id": 16126}, {"trip_id": 16128}], waits.append), waits)
`,
      answer: src`
def with_retry(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def store_batch(sink, batch, sleep):
    with_retry(lambda: sink.write(batch), 3, sleep)
    return len(batch)

class FlakySink:
    def __init__(self, timeouts):
        self.timeouts = timeouts
        self.rows = []

    def write(self, batch):
        if self.timeouts:
            self.timeouts -= 1
            raise TimeoutError("storage did not answer")
        self.rows.extend(batch)

waits = []
print(store_batch(FlakySink(1), [{"trip_id": 16126}, {"trip_id": 16128}], waits.append), waits)
`,
      alternatives: [
        src`
import functools

def with_retry(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def store_batch(sink, batch, sleep):
    with_retry(functools.partial(sink.write, batch), 3, sleep)
    return len(batch)
`,
      ],
      wrong: [
        {
          code: src`
def with_retry(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def store_batch(sink, batch, sleep):
    with_retry(sink.write(batch), 3, sleep)
    return len(batch)
`,
          fails: ["returns"],
          why: "`sink.write(batch)` runs immediately, outside the helper; the helper needs a function to call",
        },
      ],
      hints: ["`with_retry` calls the function it is given; it needs something to call with no arguments.", "Wrap the write in a small function (or `lambda`) that calls `sink.write(batch)`.", "Pass that function, 3 and `sleep` to `with_retry`."],
      task: {
        checks: [
          expr("returns", "a write that times out once", lines(
            "class _Sink:",
            "    def __init__(self, timeouts):",
            "        self.timeouts = timeouts",
            "        self.rows = []",
            "    def write(self, batch):",
            "        if self.timeouts:",
            "            self.timeouts -= 1",
            "            raise TimeoutError('storage did not answer')",
            "        self.rows.extend(batch)",
            "_s, _w = _Sink(2), []",
            "result = (store_batch(_s, [{'trip_id': 16126}, {'trip_id': 16128}], _w.append), _w, len(_s.rows))",
          ), t(2, [1, 2], 2), { show: "store_batch(sink that times out twice, batch, sleep)" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A night that resumes",
        prompt: "Write `run_night(batches, sink, checkpoint, sleep)`. `batches` is a list of lists of rows; `checkpoint` is a dictionary `{\"done\": n}` kept by the scheduler between runs (n batches finished). Starting at batch `checkpoint[\"done\"]`, write each batch with `sink.write(batch)`, retrying a `TimeoutError` up to 3 attempts in total with waits of 1 then 2 seconds through `sleep`; after a successful write set `checkpoint[\"done\"]` to the next batch number. Any other error stops the run (it propagates). Return `{\"written\": batches written by this call, \"retries\": retries used}`.",
        spec: [
          ["Function", "`run_night(batches, sink, checkpoint, sleep)`"],
          ["Retry", "`TimeoutError` only; 3 attempts per batch; waits 1, 2"],
          ["Checkpoint", "updated only after a batch is written"],
          ["Returns", "`{\"written\": n, \"retries\": r}` for this call; a third timeout or any other error propagates"],
        ],
        starter: src`
def run_night(batches, sink, checkpoint, sleep):
    for batch in batches:
        sink.write(batch)
    return {"written": len(batches), "retries": 0}

class Sink:
    def __init__(self, script):
        self.script = list(script)
        self.stored = []

    def write(self, batch):
        outcome = self.script.pop(0) if self.script else "ok"
        if outcome != "ok":
            raise outcome
        self.stored.append(batch)

checkpoint = {"done": 0}
sink = Sink([TimeoutError(), "ok", "ok"])
print(run_night([["16126"], ["16128"], ["16130"]], sink, checkpoint, print), checkpoint)
`,
        answer: src`
def run_night(batches, sink, checkpoint, sleep):
    written = 0
    retries = 0
    for number in range(checkpoint["done"], len(batches)):
        for attempt in range(3):
            try:
                sink.write(batches[number])
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
                sleep(2 ** attempt)
        checkpoint["done"] = number + 1
        written += 1
    return {"written": written, "retries": retries}

class Sink:
    def __init__(self, script):
        self.script = list(script)
        self.stored = []

    def write(self, batch):
        outcome = self.script.pop(0) if self.script else "ok"
        if outcome != "ok":
            raise outcome
        self.stored.append(batch)

checkpoint = {"done": 0}
sink = Sink([TimeoutError(), "ok", "ok"])
print(run_night([["16126"], ["16128"], ["16130"]], sink, checkpoint, print), checkpoint)
`,
        alternatives: [
          src`
def write_batch(sink, batch, sleep):
    for attempt in range(3):
        try:
            sink.write(batch)
            return attempt
        except TimeoutError:
            if attempt == 2:
                raise
            sleep(2 ** attempt)

def run_night(batches, sink, checkpoint, sleep):
    stats = {"written": 0, "retries": 0}
    while checkpoint["done"] < len(batches):
        stats["retries"] += write_batch(sink, batches[checkpoint["done"]], sleep)
        checkpoint["done"] += 1
        stats["written"] += 1
    return stats
`,
        ],
        wrong: [
          {
            code: src`
def run_night(batches, sink, checkpoint, sleep):
    written = 0
    retries = 0
    for number in range(checkpoint["done"], len(batches)):
        checkpoint["done"] = number + 1
        for attempt in range(3):
            try:
                sink.write(batches[number])
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
                sleep(2 ** attempt)
        written += 1
    return {"written": written, "retries": retries}
`,
            fails: ["crash-checkpoint", "permanent"],
            why: "the checkpoint moves before the write, so a batch that fails is marked done and skipped on resume",
          },
          {
            code: src`
def run_night(batches, sink, checkpoint, sleep):
    written = 0
    retries = 0
    for number in range(checkpoint["done"], len(batches)):
        for attempt in range(3):
            try:
                sink.write(batches[number])
                break
            except Exception:
                if attempt == 2:
                    raise
                retries += 1
                sleep(2 ** attempt)
        checkpoint["done"] = number + 1
        written += 1
    return {"written": written, "retries": retries}
`,
            fails: ["permanent"],
            why: "every error is retried, so a permission problem costs two pointless waits before stopping",
          },
          {
            code: src`
def run_night(batches, sink, checkpoint, sleep):
    written = 0
    retries = 0
    for number in range(len(batches)):
        for attempt in range(3):
            try:
                sink.write(batches[number])
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
                sleep(2 ** attempt)
        checkpoint["done"] = number + 1
        written += 1
    return {"written": written, "retries": retries}
`,
            fails: ["resume"],
            why: "it ignores the checkpoint and writes every batch again after a restart",
          },
        ],
        hints: [
          "Loop over batch numbers from the checkpoint; inside, a small retry loop of 3 attempts around the write.",
          "Only `TimeoutError` is retried; count each retry and wait `2 ** attempt` before trying again.",
          "Move the checkpoint (and the written count) after the retry loop, once the write has succeeded.",
        ],
        task: {
          checks: [
            expr("returns", "one timeout, then a clean night", lines(
              "class _Sink:",
              "    def __init__(self, script):",
              "        self.script = list(script)",
              "        self.stored = []",
              "    def write(self, batch):",
              "        outcome = self.script.pop(0) if self.script else 'ok'",
              "        if outcome != 'ok':",
              "            raise outcome",
              "        self.stored.append(batch)",
              "_c, _w, _s = {'done': 0}, [], _Sink([TimeoutError(), 'ok', 'ok'])",
              "result = (run_night([['16126'], ['16128'], ['16130']], _s, _c, _w.append), _c, _w, _s.stored)",
            ), t({ written: 3, retries: 1 }, { done: 3 }, [1], [["16126"], ["16128"], ["16130"]]), { show: "run_night(3 batches, sink with one timeout, checkpoint, sleep)" }),
            expr("resume", "a restart from a checkpoint", lines(
              "class _Sink:",
              "    def __init__(self):",
              "        self.stored = []",
              "    def write(self, batch):",
              "        self.stored.append(batch)",
              "_c, _s = {'done': 2}, _Sink()",
              "result = (run_night([['a'], ['b'], ['c'], ['d']], _s, _c, print), _s.stored, _c)",
            ), t({ written: 2, retries: 0 }, [["c"], ["d"]], { done: 4 }), { hidden: true }),
            expr("crash-checkpoint", "storage that keeps timing out on the second batch", lines(
              "class _Sink:",
              "    def __init__(self):",
              "        self.calls = 0",
              "    def write(self, batch):",
              "        self.calls += 1",
              "        if batch == ['b']:",
              "            raise TimeoutError('down')",
              "_c, _w = {'done': 0}, []",
              "try:",
              "    run_night([['a'], ['b'], ['c']], _Sink(), _c, _w.append)",
              "    _what = 'returned'",
              "except TimeoutError:",
              "    _what = 'TimeoutError'",
              "result = (_what, _c, _w)",
            ), t("TimeoutError", { done: 1 }, [1, 2]), { hidden: true }),
            expr("permanent", "a permission error", lines(
              "class _Sink:",
              "    def write(self, batch):",
              "        raise PermissionError('read-only')",
              "_c, _w = {'done': 0}, []",
              "try:",
              "    run_night([['a']], _Sink(), _c, _w.append)",
              "    _what = 'returned'",
              "except PermissionError:",
              "    _what = 'PermissionError'",
              "result = (_what, _c, _w)",
            ), t("PermissionError", { done: 0 }, []), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Set poison batches aside",
        prompt: "Write `load_all(batches, sink)`: write every batch with `sink.write(batch)`. When a write raises `ValueError` (the storage rejected the batch's data), set the batch aside as `(batch_number, error message)` and continue with the next one; any other exception stops the run. Return `{\"written\": [batch numbers stored], \"dead_letters\": [(number, message), …], \"rows_written\": total rows in stored batches}`.",
        spec: [
          ["Function", "`load_all(batches, sink)`; batch numbers start at 0"],
          ["ValueError", "the batch goes to `dead_letters` with `str(error)`; the run continues"],
          ["Other errors", "propagate"],
          ["Returns", "`{\"written\": [...], \"dead_letters\": [...], \"rows_written\": n}`"],
        ],
        starter: src`
def load_all(batches, sink):
    for batch in batches:
        sink.write(batch)
    return {"written": list(range(len(batches))), "dead_letters": [], "rows_written": 0}

class Sink:
    def __init__(self):
        self.rows = []

    def write(self, batch):
        bad = [row for row in batch if row["total"] < 0]
        if bad:
            raise ValueError(f"negative total for trip {bad[0]['trip_id']}")
        self.rows.extend(batch)

batches = [[{"trip_id": 16126, "total": 64.19}], [{"trip_id": 16129, "total": -26.81}, {"trip_id": 16130, "total": 11.1}], [{"trip_id": 16131, "total": 26.46}]]
print(load_all(batches, Sink()))
`,
        answer: src`
def load_all(batches, sink):
    written = []
    dead_letters = []
    rows_written = 0
    for number, batch in enumerate(batches):
        try:
            sink.write(batch)
        except ValueError as err:
            dead_letters.append((number, str(err)))
            continue
        written.append(number)
        rows_written += len(batch)
    return {"written": written, "dead_letters": dead_letters, "rows_written": rows_written}

class Sink:
    def __init__(self):
        self.rows = []

    def write(self, batch):
        bad = [row for row in batch if row["total"] < 0]
        if bad:
            raise ValueError(f"negative total for trip {bad[0]['trip_id']}")
        self.rows.extend(batch)

batches = [[{"trip_id": 16126, "total": 64.19}], [{"trip_id": 16129, "total": -26.81}, {"trip_id": 16130, "total": 11.1}], [{"trip_id": 16131, "total": 26.46}]]
print(load_all(batches, Sink()))
`,
        alternatives: [
          src`
def load_all(batches, sink):
    report = {"written": [], "dead_letters": [], "rows_written": 0}
    for number in range(len(batches)):
        batch = batches[number]
        try:
            sink.write(batch)
        except ValueError as problem:
            report["dead_letters"].append((number, f"{problem}"))
        else:
            report["written"].append(number)
            report["rows_written"] += len(batch)
    return report
`,
        ],
        wrong: [
          {
            code: src`
def load_all(batches, sink):
    written, dead_letters, rows_written = [], [], 0
    for number, batch in enumerate(batches):
        try:
            sink.write(batch)
        except Exception as err:
            dead_letters.append((number, str(err)))
            continue
        written.append(number)
        rows_written += len(batch)
    return {"written": written, "dead_letters": dead_letters, "rows_written": rows_written}
`,
            fails: ["stops"],
            why: "every error is set aside, so a permission problem or a bug silently skips the whole night",
          },
          {
            code: src`
def load_all(batches, sink):
    written, dead_letters, rows_written = [], [], 0
    for number, batch in enumerate(batches):
        try:
            sink.write(batch)
            written.append(number)
        except ValueError as err:
            dead_letters.append((number, str(err)))
        rows_written += len(batch)
    return {"written": written, "dead_letters": dead_letters, "rows_written": rows_written}
`,
            fails: ["returns", "all-bad"],
            why: "rows of rejected batches are counted as written",
          },
        ],
        hints: [
          "One loop with the batch number; the write goes in `try`.",
          "Only `ValueError` goes to the dead-letter list; anything else leaves the loop by itself.",
          "Update `written` and the row count only when the write succeeded.",
        ],
        task: {
          checks: [
            expr("returns", "one poison batch among good ones", lines(
              "class _Sink:",
              "    def __init__(self):",
              "        self.rows = []",
              "    def write(self, batch):",
              "        bad = [row for row in batch if row['total'] < 0]",
              "        if bad:",
              "            raise ValueError(f\"negative total for trip {bad[0]['trip_id']}\")",
              "        self.rows.extend(batch)",
              "_b = [[{'trip_id': 16126, 'total': 64.19}], [{'trip_id': 16129, 'total': -26.81}, {'trip_id': 16130, 'total': 11.1}], [{'trip_id': 16131, 'total': 26.46}]]",
              "result = load_all(_b, _Sink())",
            ), { written: [0, 2], dead_letters: [t(1, "negative total for trip 16129")], rows_written: 2 }, { show: "load_all(batches, sink)" }),
            expr("all-bad", "every batch rejected", lines(
              "class _Sink:",
              "    def write(self, batch):",
              "        raise ValueError('duplicate key')",
              "result = load_all([[1, 2], [3]], _Sink())",
            ), { written: [], dead_letters: [t(0, "duplicate key"), t(1, "duplicate key")], rows_written: 0 }, { hidden: true }),
            expr("stops", "a permission error stops the run", lines(
              "class _Sink:",
              "    def __init__(self):",
              "        self.calls = 0",
              "    def write(self, batch):",
              "        self.calls += 1",
              "        raise PermissionError('read-only')",
              "_s = _Sink()",
              "try:",
              "    load_all([[1], [2], [3]], _s)",
              "    _what = 'returned'",
              "except PermissionError:",
              "    _what = 'PermissionError'",
              "result = (_what, _s.calls)",
            ), t("PermissionError", 1), { hidden: true }),
            expr("empty", "no batches", "class _Sink:\n    def write(self, batch):\n        pass\nresult = load_all([], _Sink())", { written: [], dead_letters: [], rows_written: 0 }, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "Each failure gets one response. What does this print?",
        program: src`
def response(error):
    if isinstance(error, ValueError):
        return "quarantine or set aside"
    if isinstance(error, TimeoutError):
        return "retry"
    return "stop"

for error in [ValueError("n/a"), TimeoutError(), PermissionError("read-only"), KeyError("total")]:
    print(type(error).__name__, "->", response(error))
`,
        choices: [
          "ValueError -> quarantine or set aside\nTimeoutError -> retry\nPermissionError -> stop\nKeyError -> stop",
          "ValueError -> quarantine or set aside\nTimeoutError -> retry\nPermissionError -> retry\nKeyError -> quarantine or set aside",
          "ValueError -> stop\nTimeoutError -> retry\nPermissionError -> stop\nKeyError -> stop",
          "ValueError -> quarantine or set aside\nTimeoutError -> stop\nPermissionError -> stop\nKeyError -> stop",
        ],
        answer: 0,
        why: "Bad data is set aside, transient failures retried, and everything else (a permission problem, a `KeyError` from a bug) stops the run. `KeyError` is a sibling of `ValueError`, not a subclass, so it isn't treated as bad data.",
      },
      {
        id: "q2",
        prompt: "A common mistake: one `except Exception` around each batch. A bug misspells a field name. What does this print?",
        program: src`
rows_written = 0
set_aside = 0
for batch in [[{"total": 5.0}], [{"total": 7.5}], [{"total": 2.25}]]:
    try:
        rows_written += sum(row["totl"] for row in batch)
    except Exception:
        set_aside += 1
print(rows_written, set_aside)
`,
        choices: ["0 3", "14.75 0", "KeyError: 'totl'", "0 0"],
        answer: 0,
        why: "Every batch raises `KeyError` from the typo, and the broad `except` files them all as bad data. The night \"succeeds\" with nothing written. Catch only the errors that mean bad data.",
      },
      {
        id: "q3",
        prompt: "The storage times out on every write for an hour. With 3 attempts per batch, what should the nightly job do?",
        choices: [
          "Give up on the first batch after its attempts, re-raise, and leave the checkpoint at the last stored batch",
          "Set every batch aside as a poison batch and report success",
          "Retry each batch forever until the storage answers",
          "Skip writing and move the checkpoint to the end",
        ],
        answer: 0,
        why: "Retries cover short blips; an outage must surface. Stopping with an accurate checkpoint lets the job resume once the storage is back, without losing or duplicating batches.",
      },
    ],
    review: [
      "Match each failure to its safeguard: quarantine bad rows, retry transient errors, checkpoint and resume after crashes, set poison batches aside, stop on everything else.",
      "Move the checkpoint only after a successful write; retry only `TimeoutError`-like failures.",
      "Count every outcome so the morning report says exactly what happened.",
      "Next: the last review before release, gathering all of this into one go/no-go decision.",
    ],
  },
  // ------------------------------------------------------------------ PY-L50-05 release review
  {
    id: "PY-L50-05",
    version: 2,
    slug: "go-or-no-go",
    title: "Decide whether to release",
    lede: "The last review before a release gathers the evidence the whole course has taught you to produce: tests pass, dependencies are locked, settings load, the schema is current, and a smoke run on a fixture gives the known answer. A release script turns it into one go/no-go report, with a reason for every blocker.",
    focus: "Collect release evidence (tests, lock, settings, smoke run with a golden hash) into one report, separate blocking failures from warnings, and decide go or no-go with reasons.",
    minutes: 24,
    objectives: [
      "Run each release check and record its result and detail, treating missing evidence as a failure",
      "Smoke-test the pipeline on a fixture: identical output on every run, matching a stored golden hash",
      "Decide go/no-go: required checks must pass, optional ones become warnings, and every blocker has a reason",
    ],
    requires: ["all-call", "any-call", "arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comp-if", "comparison", "conditional-expr", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "hash-in-text", "if-statement", "import-module", "json-dumps", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "newline-escape", "print-call", "print-several", "print-text", "range-call", "reassignment", "repro-run", "set-comp", "set-literal", "string-format", "string-index", "string-method", "test-func", "top-level-indent", "tuple-literal", "tuple-unpack", "unittest-case", "unquoted-name"],
    teaches: ["release-check"],
    blocks: [
      {
        kind: "text",
        md: "Releasing is a decision, and a good decision rests on evidence, not on \"it worked on my machine\". Each module of this stage produced some:\n\n- **Tests** pass (L02, the Application Delivery module's CI gate).\n- **Dependencies** are locked: every package pinned with a hash, no drift (see Application Delivery).\n- **Settings** load and validate for the target environment (see Application Delivery).\n- The **schema** is at the version the code needs (see Application Delivery).\n- A **smoke run** of the real pipeline on a small fixture gives exactly the known answer.\n\nThe smoke run uses a **golden hash**: the SHA-256 of the fixture's report, serialised the same way every time (`json.dumps(..., sort_keys=True)`), stored when the output was last reviewed by a person. If the hash changes, either the code changed behaviour on purpose (review the new output, update the hash) or by accident (don't ship). Running it twice also catches output that isn't deterministic.\n\nA **release report** lists every check with its result and detail, separates **blocking** failures (required checks) from **warnings** (optional ones, such as a slower benchmark), and treats **missing evidence** as a failure: a check that didn't run hasn't passed.",
      },
      {
        kind: "example",
        title: "A release report",
        code: src`
import io
import json
import unittest

def borough_revenue(trips):
    revenue = {}
    for borough, total in trips:
        revenue[borough] = round(revenue.get(borough, 0) + total, 2)
    return revenue

class CoreTest(unittest.TestCase):
    def test_adds_per_borough(self):
        self.assertEqual(borough_revenue([("Queens", 66.71), ("Queens", 70.0)]), {"Queens": 136.71})

def check_tests():
    result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(CoreTest))
    return result.wasSuccessful(), f"{result.testsRun} tests, {len(result.failures) + len(result.errors)} failing"

def check_lock(lock_text):
    unpinned = [line for line in lock_text.splitlines() if line and not line.startswith("#") and "==" not in line]
    return not unpinned, "all pinned" if not unpinned else "unpinned: " + ", ".join(unpinned)

def check_settings(environ):
    missing = [name for name in ("APP_ENV", "DATABASE_URL") if not environ.get(name)]
    return not missing, "settings complete" if not missing else "missing " + ", ".join(missing)

report = {}
for name, check in [
    ("tests", check_tests),
    ("lock", lambda: check_lock("numpy==2.1.3\npandas>=2.2\n")),
    ("settings", lambda: check_settings({"APP_ENV": "prod", "DATABASE_URL": "sqlite:///market.db"})),
]:
    ok, detail = check()
    report[name] = {"ok": ok, "detail": detail}

blocking = sorted(name for name, result in report.items() if not result["ok"])
print(json.dumps(report, indent=2))
print("decision:", "go" if not blocking else "no-go", blocking)
`,
        output: "{\n  \"tests\": {\n    \"ok\": true,\n    \"detail\": \"1 tests, 0 failing\"\n  },\n  \"lock\": {\n    \"ok\": false,\n    \"detail\": \"unpinned: pandas>=2.2\"\n  },\n  \"settings\": {\n    \"ok\": true,\n    \"detail\": \"settings complete\"\n  }\n}\ndecision: no-go ['lock']\n",
        note: "Each check returns `(ok, detail)`, and the report keeps both, so the person reading it knows *why* the release is blocked: one range slipped into the lock file. The tests and settings were fine; fixing the lock and rerunning gives a go.",
      },
      {
        kind: "text",
        md: "A release script must also *act* on the decision: in CI it exits non-zero so the deploy step never runs (see Application Delivery). Here an assertion plays that part, with the blockers in its message:",
      },
      {
        kind: "error-example",
        title: "The release script refuses to continue",
        code: src`
report = {
    "tests": {"ok": True, "detail": "42 tests, 0 failing"},
    "schema": {"ok": False, "detail": "schema at 2, release needs 3"},
    "smoke": {"ok": False, "detail": "report hash changed"},
}
blocking = [f"{name}: {r['detail']}" for name, r in report.items() if not r["ok"]]
assert not blocking, "release blocked by " + "; ".join(blocking)
print("deploying")
`,
        error: "AssertionError",
        output: "",
        note: "`AssertionError: release blocked by schema: schema at 2, release needs 3; smoke: report hash changed`. Nothing after the check runs; the operator sees both reasons at once.",
      },
      {
        kind: "example",
        title: "A smoke test with a golden hash",
        code: src`
import hashlib
import json

def run_report(trips):
    boroughs = {}
    for trip in trips:
        entry = boroughs.setdefault(trip["borough"], {"trips": 0, "revenue": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total"], 2)
    return {"boroughs": boroughs, "rejected_lines": [3]}

def fingerprint(report):
    text = json.dumps(report, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

FIXTURE = [{"borough": "Manhattan", "total": 64.19}, {"borough": "Brooklyn", "total": 18.7}]
GOLDEN = "f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc"

first = fingerprint(run_report(FIXTURE))
second = fingerprint(run_report(FIXTURE))
print("deterministic:", first == second)
print("matches golden:", first == GOLDEN)

def run_report_changed(trips):
    report = run_report(trips)
    for entry in report["boroughs"].values():
        entry["revenue"] = round(entry["revenue"])
    return report

print("after a rounding change:", fingerprint(run_report_changed(FIXTURE)) == GOLDEN)
`,
        output: "deterministic: True\nmatches golden: True\nafter a rounding change: False\n",
        note: "`sort_keys=True` and fixed separators make the same report produce the same text, whatever order the dictionaries were built in. A one-line change to rounding (whole dollars instead of cents) changes the fingerprint, so the smoke check blocks the release until someone looks at the new output.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every release of anything people depend on, automated in the pipeline after the tests. **Mistakes to avoid:** a release decision with no reasons; treating a check that didn't run as passed; golden outputs serialised without `sort_keys` (they change for no reason); updating the golden hash without reviewing the new output; and warnings nobody reads, which are blockers waiting to happen.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Every required check must pass",
      prompt: "`decide` says go when *any* check passed. A release needs *all* of them: return `\"go\"` only when every result is `True`, otherwise `\"no-go\"`.",
      spec: [
        ["Function", "`decide(results)`; `results` maps check name → `True`/`False`"],
        ["Returns", "`\"go\"` when every check passed (an empty report is `\"no-go\"`: no evidence), otherwise `\"no-go\"`"],
      ],
      starter: src`
def decide(results):
    return "go" if any(results.values()) else "no-go"

print(decide({"tests": True, "lock": False, "settings": True}))
`,
      answer: src`
def decide(results):
    if results and all(results.values()):
        return "go"
    return "no-go"

print(decide({"tests": True, "lock": False, "settings": True}))
`,
      wrong: [
        {
          code: src`
def decide(results):
    return "go" if all(results.values()) else "no-go"
`,
          fails: ["no-evidence"],
          why: "`all` of nothing is True, so a report where no check ran says go",
        },
      ],
      hints: ["`any` is true when one value is; you need the function that requires every value.", "Think about a report with no checks in it.", "Go needs evidence: a non-empty report, all true."],
      task: {
        checks: [
          fn("returns", "decide", [
            example([{ tests: true, lock: false, settings: true }], "no-go"),
            example([{ tests: true, lock: true }], "go"),
          ], { label: "decide() needs every check to pass" }),
          fn("no-evidence", "decide", [hiddenCase("a report with no checks", [{}], "no-go")], { label: "no evidence is no-go" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The release decision",
        prompt: "Write `release_decision(results, required)`. `results` maps a check name to `{\"ok\": bool, \"detail\": text}` for the checks that ran; `required` lists the checks that must pass. Return `{\"decision\": \"go\" or \"no-go\", \"blocking\": [...], \"warnings\": [...]}`: a required check that failed blocks with `\"<name>: <detail>\"`; a required check that didn't run blocks with `\"<name>: no result\"`; a failed check that isn't required becomes a warning `\"<name>: <detail>\"`. Both lists are sorted; the decision is go only when nothing blocks.",
        spec: [
          ["Function", "`release_decision(results, required)`"],
          ["Blocking", "failed or missing required checks"],
          ["Warnings", "failed checks that aren't required"],
          ["Returns", "`{\"decision\", \"blocking\", \"warnings\"}`, lists sorted; `results` is not changed"],
        ],
        starter: src`
def release_decision(results, required):
    return {"decision": "go", "blocking": [], "warnings": []}

results = {
    "tests": {"ok": True, "detail": "212 tests, 0 failing"},
    "lock": {"ok": False, "detail": "unpinned: pandas>=2.2"},
    "benchmark": {"ok": False, "detail": "p95 of 1.9 s is above 1.5 s"},
}
print(release_decision(results, ["tests", "lock", "smoke"]))
`,
        answer: src`
def release_decision(results, required):
    blocking = []
    warnings = []
    for name in required:
        if name not in results:
            blocking.append(f"{name}: no result")
        elif not results[name]["ok"]:
            blocking.append(f"{name}: {results[name]['detail']}")
    for name, result in results.items():
        if name not in required and not result["ok"]:
            warnings.append(f"{name}: {result['detail']}")
    return {"decision": "no-go" if blocking else "go", "blocking": sorted(blocking), "warnings": sorted(warnings)}

results = {
    "tests": {"ok": True, "detail": "212 tests, 0 failing"},
    "lock": {"ok": False, "detail": "unpinned: pandas>=2.2"},
    "benchmark": {"ok": False, "detail": "p95 of 1.9 s is above 1.5 s"},
}
print(release_decision(results, ["tests", "lock", "smoke"]))
`,
        alternatives: [
          src`
def release_decision(results, required):
    def line(name):
        return name + ": " + (results[name]["detail"] if name in results else "no result")

    failed = {name for name, r in results.items() if not r["ok"]}
    blocking = sorted(line(n) for n in set(required) if n in failed or n not in results)
    warnings = sorted(line(n) for n in failed - set(required))
    return {"decision": "go" if not blocking else "no-go", "blocking": blocking, "warnings": warnings}
`,
        ],
        wrong: [
          {
            code: src`
def release_decision(results, required):
    blocking = sorted(f"{n}: {r['detail']}" for n, r in results.items() if n in required and not r["ok"])
    warnings = sorted(f"{n}: {r['detail']}" for n, r in results.items() if n not in required and not r["ok"])
    return {"decision": "no-go" if blocking else "go", "blocking": blocking, "warnings": warnings}
`,
            fails: ["returns", "missing"],
            why: "a required check that never ran isn't reported, so missing evidence counts as a pass",
          },
          {
            code: src`
def release_decision(results, required):
    blocking = []
    for name in required:
        if name not in results:
            blocking.append(f"{name}: no result")
    for name, result in results.items():
        if not result["ok"]:
            blocking.append(f"{name}: {result['detail']}")
    return {"decision": "no-go" if blocking else "go", "blocking": sorted(blocking), "warnings": []}
`,
            fails: ["returns", "warnings-only"],
            why: "optional checks block the release instead of becoming warnings",
          },
        ],
        hints: [
          "Walk the required names first: missing or failed means blocking, with the right text.",
          "Then walk the results: a failure of a check that isn't required is a warning.",
          "Sort both lists; go only when there is nothing blocking.",
        ],
        task: {
          checks: [
            fn("returns", "release_decision", [
              example([{ tests: { ok: true, detail: "212 tests, 0 failing" }, lock: { ok: false, detail: "unpinned: pandas>=2.2" }, benchmark: { ok: false, detail: "p95 of 1.9 s is above 1.5 s" } }, ["tests", "lock", "smoke"]], { decision: "no-go", blocking: ["lock: unpinned: pandas>=2.2", "smoke: no result"], warnings: ["benchmark: p95 of 1.9 s is above 1.5 s"] }),
              example([{ tests: { ok: true, detail: "ok" }, smoke: { ok: true, detail: "hash matches" } }, ["tests", "smoke"]], { decision: "go", blocking: [], warnings: [] }),
              example([{}, []], { decision: "go", blocking: [], warnings: [] }),
            ], { label: "release_decision() separates blockers from warnings" }),
            fn("missing", "release_decision", [hiddenCase("every required check missing", [{}, ["tests", "schema"]], { decision: "no-go", blocking: ["schema: no result", "tests: no result"], warnings: [] })], { label: "missing evidence blocks" }),
            fn("warnings-only", "release_decision", [hiddenCase("only optional checks failing", [{ tests: { ok: true, detail: "ok" }, docs: { ok: false, detail: "changelog not updated" }, benchmark: { ok: false, detail: "3% slower" } }, ["tests"]], { decision: "go", blocking: [], warnings: ["benchmark: 3% slower", "docs: changelog not updated"] })], { label: "optional failures only warn" }),
            fn("keeps-input", "release_decision", [keepsInput([{ tests: { ok: false, detail: "1 failing" } }, ["tests"]], { label: "a failing report" })], { label: "release_decision() leaves its inputs unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A smoke test with a golden hash",
        prompt: "Write `smoke_test(run, fixture, golden)`. `run` is the pipeline's core (a function from fixture data to a report dictionary). Call it **twice** on `fixture`, fingerprint each report as the SHA-256 hex digest of `json.dumps(report, sort_keys=True, separators=(\",\", \":\"))`, and return `{\"ok\": bool, \"detail\": text, \"hash\": first fingerprint}`. The detail is `\"not deterministic\"` when the two fingerprints differ, `\"report changed\"` when they agree but differ from `golden`, and `\"matches golden\"` otherwise; `ok` is true only in the last case.",
        spec: [
          ["Function", "`smoke_test(run, fixture, golden)`"],
          ["Fingerprint", "`hashlib.sha256(json.dumps(report, sort_keys=True, separators=(\",\", \":\")).encode()).hexdigest()`"],
          ["Returns", "`{\"ok\": …, \"detail\": …, \"hash\": …}`; non-determinism is reported before a golden mismatch"],
        ],
        starter: src`
import hashlib
import json

def smoke_test(run, fixture, golden):
    return {"ok": True, "detail": "matches golden", "hash": golden}

def run_report(trips):
    boroughs = {}
    for trip in trips:
        entry = boroughs.setdefault(trip["borough"], {"trips": 0, "revenue": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total"], 2)
    return {"boroughs": boroughs, "rejected_lines": [3]}

fixture = [{"borough": "Manhattan", "total": 64.19}, {"borough": "Brooklyn", "total": 18.7}]
print(smoke_test(run_report, fixture, "f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc"))
`,
        answer: src`
import hashlib
import json

def fingerprint(report):
    text = json.dumps(report, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def smoke_test(run, fixture, golden):
    first = fingerprint(run(fixture))
    second = fingerprint(run(fixture))
    if first != second:
        return {"ok": False, "detail": "not deterministic", "hash": first}
    if first != golden:
        return {"ok": False, "detail": "report changed", "hash": first}
    return {"ok": True, "detail": "matches golden", "hash": first}

def run_report(trips):
    boroughs = {}
    for trip in trips:
        entry = boroughs.setdefault(trip["borough"], {"trips": 0, "revenue": 0.0})
        entry["trips"] += 1
        entry["revenue"] = round(entry["revenue"] + trip["total"], 2)
    return {"boroughs": boroughs, "rejected_lines": [3]}

fixture = [{"borough": "Manhattan", "total": 64.19}, {"borough": "Brooklyn", "total": 18.7}]
print(smoke_test(run_report, fixture, "f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc"))
`,
        alternatives: [
          src`
import hashlib
import json

def smoke_test(run, fixture, golden):
    digests = []
    for _ in range(2):
        canonical = json.dumps(run(fixture), separators=(",", ":"), sort_keys=True)
        digests.append(hashlib.sha256(canonical.encode()).hexdigest())
    detail = "not deterministic" if digests[0] != digests[1] else "matches golden" if digests[0] == golden else "report changed"
    return {"ok": detail == "matches golden", "detail": detail, "hash": digests[0]}
`,
        ],
        wrong: [
          {
            code: src`
import hashlib
import json

def smoke_test(run, fixture, golden):
    digest = hashlib.sha256(json.dumps(run(fixture), sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    if digest != golden:
        return {"ok": False, "detail": "report changed", "hash": digest}
    return {"ok": True, "detail": "matches golden", "hash": digest}
`,
            fails: ["flaky"],
            why: "running once can't notice output that changes from run to run",
          },
          {
            code: src`
import hashlib
import json

def smoke_test(run, fixture, golden):
    first = hashlib.sha256(json.dumps(run(fixture)).encode()).hexdigest()
    second = hashlib.sha256(json.dumps(run(fixture)).encode()).hexdigest()
    if first != second:
        return {"ok": False, "detail": "not deterministic", "hash": first}
    if first != golden:
        return {"ok": False, "detail": "report changed", "hash": first}
    return {"ok": True, "detail": "matches golden", "hash": first}
`,
            fails: ["returns", "key-order"],
            why: "without `sort_keys` and fixed separators the text, and so the hash, depends on how the dictionaries were built",
          },
        ],
        hints: [
          "Write a small fingerprint function first: canonical JSON text, then its SHA-256 hex digest.",
          "Run the pipeline twice and compare the two fingerprints before comparing with the golden one.",
          "Return the first fingerprint in every case, so a person can update the golden value after reviewing.",
        ],
        task: {
          checks: [
            expr("returns", "the fixture report matches its golden hash", lines(
              "def _run(trips):",
              "    boroughs = {}",
              "    for trip in trips:",
              "        entry = boroughs.setdefault(trip['borough'], {'trips': 0, 'revenue': 0.0})",
              "        entry['trips'] += 1",
              "        entry['revenue'] = round(entry['revenue'] + trip['total'], 2)",
              "    return {'boroughs': boroughs, 'rejected_lines': [3]}",
              "result = smoke_test(_run, [{'borough': 'Manhattan', 'total': 64.19}, {'borough': 'Brooklyn', 'total': 18.7}], 'f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc')",
            ), { ok: true, detail: "matches golden", hash: "f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc" }, { show: "smoke_test(run_report, fixture, golden)" }),
            expr("changed", "a report that changed", lines(
              "def _run(trips):",
              "    return {'total': round(sum(t['total'] for t in trips))}",
              "_r = smoke_test(_run, [{'total': 64.19}], 'f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc')",
              "result = (_r['ok'], _r['detail'], len(_r['hash']))",
            ), t(false, "report changed", 64), { hidden: true }),
            expr("flaky", "a report that differs between runs", lines(
              "_calls = [0]",
              "def _run(trips):",
              "    _calls[0] += 1",
              "    return {'generated_run': _calls[0]}",
              "_r = smoke_test(_run, [], 'x')",
              "result = (_r['ok'], _r['detail'])",
            ), t(false, "not deterministic"), { hidden: true }),
            expr("key-order", "the same report built in a different key order", lines(
              "def _run(trips):",
              "    return {'rejected_lines': [3], 'boroughs': {'Brooklyn': {'trips': 1, 'revenue': 18.7}, 'Manhattan': {'revenue': 64.19, 'trips': 1}}}",
              "result = smoke_test(_run, [], 'f3e2b2185f8c0794a51b2167db7f26dbfe31a639af1e9804a8a2df6a642fddbc')['ok']",
            ), true, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

a = {"trips": 2, "borough": "Queens"}
b = {"borough": "Queens", "trips": 2}
print(a == b, json.dumps(a) == json.dumps(b), json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True))
`,
        choices: ["True False True", "True True True", "False False True", "True False False"],
        answer: 0,
        why: "The dictionaries are equal, but `json.dumps` writes keys in insertion order, so their text differs. `sort_keys=True` gives one canonical text per value, which is what a golden hash needs.",
      },
      {
        id: "q2",
        prompt: "A common mistake: treating a check that didn't run as a pass. What decision does this script make?",
        program: src`
results = {"tests": True, "lock": True}
required = ["tests", "lock", "schema", "smoke"]
decision = "go" if all(results.get(name, True) for name in required) else "no-go"
print(decision)
`,
        choices: ["go", "no-go", "KeyError", "None"],
        answer: 0,
        why: "`get(name, True)` turns the two missing checks into passes, so the release goes out with no evidence about the schema or the smoke run. Missing evidence must count as a failure.",
      },
      {
        id: "q3",
        prompt: "The smoke test's hash changed after a pull request that rounds revenue differently. What should happen?",
        choices: [
          "Block the release until someone reviews the new report and, if it is right, updates the golden hash",
          "Update the golden hash automatically in CI",
          "Delete the smoke test, since the unit tests pass",
          "Release, because the change was intentional",
        ],
        answer: 0,
        why: "A changed fingerprint means the output changed. Only a person who has looked at the new output can say it is correct; updating the hash without that review makes the check meaningless.",
      },
    ],
    review: [
      "A release decision rests on evidence: tests, lock, settings, schema, and a smoke run with a golden hash.",
      "Report every check with its detail; required failures and missing results block, optional failures warn.",
      "Fingerprint canonical output (`sort_keys=True`), run it twice, and review any change before updating the golden value.",
      "That completes the course: you can now read, write, test, secure, operate and ship real Python programs.",
    ],
  },
];
