/**
 * M32 practice: ten independent problems on iterators and generators (PY-L32-01 … PY-L32-05).
 *
 * Mix: 4 function implementations (day-to-day changes in one pass, the first reading over a limit, flattening nested
 * lists, activity sessions), 1 data transformation (a generator that cleans taxi trips), 2 debugging (a stream that
 * stops at the first bad line and forgets between runs; a file-backed iterator that crashes and can't be reused),
 * 1 refactoring (stream a file instead of loading it, checked with tracemalloc), 1 performance (stop at the first
 * repeat, with a pull count and a comparison budget) and 1 output prediction.
 * Easy: 02, 06, 10. Medium: 12, 13, 16, 19. Hard: 03, 20, 22.
 *
 * Fixtures: NYC taxi trips (D06), NOAA daily maxima (D07) and GitHub-style repository events (D11). Laziness and
 * single passes are graded by feeding generators and counting iterators, not by reading the code.
 * Version 2: every question was replaced; the old set completed one-line yield programs.
 */
import type { PyQuestion } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const pyLit = (s: string) => JSON.stringify(s);

const FEED = [
  "import json as _js",
  "class _Feed:",
  "    def __init__(self, items):",
  "        self.items = list(items)",
  "        self.pulled = 0",
  "    def __iter__(self):",
  "        return self",
  "    def __next__(self):",
  "        if self.pulled >= len(self.items):",
  "            raise StopIteration",
  "        self.pulled += 1",
  "        return self.items[self.pulled - 1]",
].join("\n");
const feed = (items: unknown) => `_Feed(_js.loads(${pyLit(JSON.stringify(items))}))`;

function expr(id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string; raises?: string } = {}): PyCheck {
  return {
    kind: "expr",
    id,
    label,
    ...(o.raises ? { expr: code, raises: o.raises } : { expr: code, expected: pv(expected) }),
    ...(o.show ? { show: o.show } : {}),
    ...(o.hidden ? { hidden: true } : {}),
  };
}

const trip = (id: string, pickup: string, dropoff: string, miles: string, fare: string) => ({ trip_id: id, pickup_at: pickup, dropoff_at: dropoff, trip_distance_miles: miles, fare_amount: fare });
const TRIPS = [
  trip("16126", "2025-01-15 00:12:47", "2025-01-15 00:41:06", "9.2", "40.8"),
  trip("16127", "2025-01-15 00:18:28", "2025-01-15 00:24:31", "0.9", "7.2"),
  trip("16128", "2025-01-15 00:25:55", "2025-01-15 00:41:26", "3.17", "17.2"),
];

const ev = (actor: string, at: string) => ({ actor, created_at: at });

export const m32Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q32-02 function implementation, easy
  {
    id: "PY-Q32-02",
    version: 2,
    slug: "day-to-day-changes",
    title: "Day-to-day temperature changes",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "reassignment", "string-index", "top-level-indent"],
    prompt: "A weather page shows how much each day's maximum temperature rose or fell compared with the day before. Write `daily_changes(readings)`: return the list of differences between consecutive readings (today minus yesterday). `readings` may be a list or a generator reading a file, so use a single pass and no indexing.",
    spec: [
      ["Function", "`daily_changes(readings)`"],
      ["readings", "any iterable of numbers, in date order"],
      ["Returns", "a list with one difference per pair of neighbours; `[]` for fewer than two readings"],
    ],
    hiddenKinds: ["a single reading", "no readings", "falling temperatures", "a generator instead of a list"],
    hints: [
      "Remember the previous reading in a variable as you loop.",
      "The first reading has nothing before it: take it with `next(it, None)`, or skip the subtraction while the previous value is None.",
      "Each later reading adds `reading - previous` and then becomes the new previous.",
    ],
    explanation: "One loop with a `previous` variable handles any iterable, including a generator that can only be read once and can't be indexed. `itertools.pairwise` (Python 3.10+) does the pairing for you. Indexing (`readings[i + 1]`) fails on a generator, and subtracting the wrong way round flips every sign.",
    code: {
      starter: src`
def daily_changes(readings):
    return []

print(daily_changes([31.7, 33.9, 30.6, 30.6]))
`,
      answer: src`
def daily_changes(readings):
    changes = []
    previous = None
    for reading in readings:
        if previous is not None:
            changes.append(reading - previous)
        previous = reading
    return changes

print(daily_changes([31.7, 33.9, 30.6, 30.6]))
`,
      alternatives: [
        src`
from itertools import pairwise

def daily_changes(readings):
    return [today - yesterday for yesterday, today in pairwise(readings)]
`,
        src`
def daily_changes(readings):
    it = iter(readings)
    previous = next(it, None)
    out = []
    for value in it:
        out.append(value - previous)
        previous = value
    return out
`,
      ],
      wrong: [
        {
          code: src`
def daily_changes(readings):
    return [readings[i + 1] - readings[i] for i in range(len(readings) - 1)]
`,
          fails: ["generator"],
          why: "indexing works on a list but not on a generator",
        },
        {
          code: src`
def daily_changes(readings):
    changes = []
    previous = None
    for reading in readings:
        if previous is not None:
            changes.append(previous - reading)
        previous = reading
    return changes
`,
          fails: ["returns", "generator"],
          why: "it subtracts today from yesterday, so every sign is flipped",
        },
        {
          code: src`
def daily_changes(readings):
    changes = []
    previous = 0
    for reading in readings:
        changes.append(reading - previous)
        previous = reading
    return changes
`,
          fails: ["returns", "generator"],
          why: "starting from 0 adds a made-up change for the first day",
        },
      ],
      task: {
        checks: [
          fn("returns", "daily_changes", [
            example([[31.7, 33.9, 30.6, 30.6]], [2.2, -3.3, py.float(0)]),
            example([[18.3, 19.4]], [1.1]),
            example([[-4.4, -12.2, -0.6]], [-7.8, 11.6]),
            hiddenCase("a single reading", [[25.6]], []),
            hiddenCase("no readings", [[]], []),
            hiddenCase("falling temperatures", [[10, 8, 5, 1]], [-2, -3, -4]),
          ], { label: "daily_changes() of a list" }),
          expr("generator", "a generator instead of a list", "result = daily_changes(float(t) for t in ['12.5', '15.0', '11.5'])", [2.5, -3.5], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-03 debugging, hard
  {
    id: "PY-Q32-03",
    version: 2,
    slug: "stream-stops-and-forgets",
    title: "The event stream that stops and forgets",
    format: "debugging",
    difficulty: "hard",
    minutes: 18,
    requires: ["assignment", "boolean", "continue-statement", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "list-index", "list-literal", "logical", "membership", "none-value", "print-call", "reassignment", "string-index", "top-level-indent", "try-except", "yield-expr"],
    prompt: "`clean_events(lines)` turns raw JSON lines into small event records, dropping repeated event ids. Two bugs were reported: the stream ends at the first corrupted line instead of skipping it, and when the import job runs a second time in the same process, the second run returns almost nothing. Fix both.",
    spec: [
      ["Generator", "`clean_events(lines)`"],
      ["Yields", "`{\"id\", \"type\", \"repo\"}` for each valid line whose id hasn't been seen **in this call**"],
      ["Skips", "lines that aren't valid JSON, and repeated ids"],
    ],
    hiddenKinds: ["a second run over the same lines", "several corrupted lines", "a repeat right after a corrupted line"],
    hints: [
      "Run it twice on the same lines and print both results. Then put a corrupted line in the middle.",
      "Inside a generator, `return` ends the whole stream; to skip one line you need a different statement.",
      "A default value like `seen={}` is created once, when `def` runs, and shared by every call: make a fresh one inside the function.",
    ],
    explanation: "`return` in a generator stops it for good, so every line after the first bad one was lost; `continue` skips just that line. The second bug is the classic mutable default: `seen={}` is evaluated once when the function is defined, so the ids from the first run were still there in the second and every event looked like a repeat. Creating the dictionary inside the function gives each call its own memory.",
    code: {
      starter: src`
import json

def clean_events(lines, seen={}):
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            return
        if event["id"] in seen:
            continue
        seen[event["id"]] = True
        yield {"id": event["id"], "type": event["type"], "repo": event["repo"]["name"]}

lines = [
    '{"id": "48000002730", "type": "WatchEvent", "repo": {"name": "tidewater/smartqueue"}}',
    '{"id": "4800000',
    '{"id": "48000003301", "type": "WatchEvent", "repo": {"name": "cobalt-tools/deeplint"}}',
]
print(list(clean_events(lines)))
print(list(clean_events(lines)))
`,
      answer: src`
import json

def clean_events(lines):
    seen = {}
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event["id"] in seen:
            continue
        seen[event["id"]] = True
        yield {"id": event["id"], "type": event["type"], "repo": event["repo"]["name"]}

lines = [
    '{"id": "48000002730", "type": "WatchEvent", "repo": {"name": "tidewater/smartqueue"}}',
    '{"id": "4800000',
    '{"id": "48000003301", "type": "WatchEvent", "repo": {"name": "cobalt-tools/deeplint"}}',
]
print(list(clean_events(lines)))
print(list(clean_events(lines)))
`,
      alternatives: [
        src`
import json

def clean_events(lines, seen=None):
    if seen is None:
        seen = {}
    for line in lines:
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event["id"] not in seen:
            seen[event["id"]] = True
            yield {"id": event["id"], "type": event["type"], "repo": event["repo"]["name"]}
`,
      ],
      wrong: [
        {
          code: src`
import json

def clean_events(lines, seen={}):
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event["id"] in seen:
            continue
        seen[event["id"]] = True
        yield {"id": event["id"], "type": event["type"], "repo": event["repo"]["name"]}
`,
          fails: ["second-run"],
          why: "bad lines are skipped now, but ids from earlier calls still count as seen",
        },
        {
          code: src`
import json

def clean_events(lines):
    seen = {}
    for line in lines:
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            return
        if event["id"] in seen:
            continue
        seen[event["id"]] = True
        yield {"id": event["id"], "type": event["type"], "repo": event["repo"]["name"]}
`,
          fails: ["returns", "several-bad", "after-bad"],
          why: "each call has its own memory now, but a corrupted line still ends the stream",
        },
      ],
      task: {
        checks: [
          expr("returns", "a corrupted line in the middle is skipped", `import json as _j\n_lines = _j.loads(${pyLit(JSON.stringify(['{"id": "48000002730", "type": "WatchEvent", "repo": {"name": "tidewater/smartqueue"}}', '{"id": "4800000', '{"id": "48000003301", "type": "WatchEvent", "repo": {"name": "cobalt-tools/deeplint"}}']))})\nresult = [e['id'] for e in clean_events(_lines)]`, ["48000002730", "48000003301"], { show: "[e['id'] for e in clean_events(lines)]" }),
          expr("repeats", "repeated ids within one run are dropped", "import json as _j\n_lines = [_j.dumps({'id': i, 'type': 'PushEvent', 'repo': {'name': 'tidewater/smartqueue'}}) for i in ['7', '8', '7', '9', '8']]\nresult = [e['id'] for e in clean_events(_lines)]", ["7", "8", "9"], { show: "ids 7, 8, 7, 9, 8 → [e['id'] for e in clean_events(lines)]" }),
          expr("second-run", "a second run over the same lines", "import json as _j\n_lines = [_j.dumps({'id': i, 'type': 'ForkEvent', 'repo': {'name': 'cobalt-tools/deeplint'}}) for i in ['a1', 'a2']]\n_first = [e['id'] for e in clean_events(_lines)]\n_second = [e['id'] for e in clean_events(_lines)]\nresult = (_first, _second)", py.tuple(pv(["a1", "a2"]), pv(["a1", "a2"])), { hidden: true }),
          expr("several-bad", "several corrupted lines", "import json as _j\n_lines = ['', 'null nonsense', _j.dumps({'id': 'b1', 'type': 'IssuesEvent', 'repo': {'name': 'tidewater/smartqueue'}}), '{', _j.dumps({'id': 'b2', 'type': 'IssuesEvent', 'repo': {'name': 'tidewater/smartqueue'}})]\nresult = [e['id'] for e in clean_events(_lines)]", ["b1", "b2"], { hidden: true }),
          expr("after-bad", "a repeat right after a corrupted line", "import json as _j\n_lines = [_j.dumps({'id': 'c1', 'type': 'WatchEvent', 'repo': {'name': 'x/y'}}), '{oops', _j.dumps({'id': 'c1', 'type': 'WatchEvent', 'repo': {'name': 'x/y'}}), _j.dumps({'id': 'c2', 'type': 'WatchEvent', 'repo': {'name': 'x/y'}})]\nresult = [e['id'] for e in clean_events(_lines)]", ["c1", "c2"], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-06 function implementation, easy
  {
    id: "PY-Q32-06",
    version: 2,
    slug: "first-reading-over-limit",
    title: "The first reading over the limit",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["comparison", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-literal", "membership", "none-value", "print-call", "print-several", "top-level-indent"],
    prompt: "A heat alert needs the first daily maximum above a limit, from a station file that may cover decades. Write `first_above(readings, limit)`: return the first reading strictly greater than `limit`, or `None` if there is none, and stop reading as soon as it is found.",
    spec: [
      ["Function", "`first_above(readings, limit)`"],
      ["Returns", "the first reading `> limit`, or `None`"],
      ["Lazy", "take no more readings than needed"],
    ],
    hiddenKinds: ["a reading exactly at the limit", "no readings", "the first reading already over", "a long input that must not be read to the end"],
    hints: [
      "This is a search that stops at the first match.",
      "A generator expression with an `if`, passed to `next`, stops as soon as one value comes out.",
      "`next(...)` takes a default for the case where nothing matches.",
    ],
    explanation: "`next((r for r in readings if r > limit), None)` stops at the first match, and the default covers \"none found\". A plain loop with `return` inside does the same. Building the list of all matches first reads the whole input, and `[...][0]` crashes when there's no match.",
    code: {
      starter: src`
def first_above(readings, limit):
    return None

print(first_above([31.7, 33.9, 36.1, 30.6, 38.3], 35))
`,
      answer: src`
def first_above(readings, limit):
    return next((r for r in readings if r > limit), None)

print(first_above([31.7, 33.9, 36.1, 30.6, 38.3], 35))
`,
      alternatives: [
        src`
def first_above(readings, limit):
    for reading in readings:
        if reading > limit:
            return reading
    return None
`,
      ],
      wrong: [
        {
          code: src`
def first_above(readings, limit):
    hot = [r for r in readings if r > limit]
    return hot[0] if hot else None
`,
          fails: ["lazy"],
          why: "the right answer, but it reads every reading first",
        },
        {
          code: src`
def first_above(readings, limit):
    return next((r for r in readings if r >= limit), None)
`,
          fails: ["returns"],
          why: "`>=` accepts a reading exactly at the limit",
        },
        {
          code: src`
def first_above(readings, limit):
    hot = [r for r in readings if r > limit]
    return max(hot) if hot else None
`,
          fails: ["returns", "lazy"],
          why: "it returns the hottest reading, not the first one over the limit",
        },
      ],
      task: {
        checks: [
          fn("returns", "first_above", [
            example([[31.7, 33.9, 36.1, 30.6, 38.3], 35], 36.1),
            example([[18.3, 19.4], 25], null),
            example([[40.2, 12.0], 35], 40.2),
            hiddenCase("a reading exactly at the limit", [[35, 35.5], 35], 35.5),
            hiddenCase("no readings", [[], 0], null),
          ], { label: "first_above() finds the first reading over the limit" }),
          expr("lazy", "a long input that must not be read to the end", `${FEED}\n_f = ${feed([20, 21, 40, ...Array.from({ length: 500 }, () => 50)])}\nresult = (first_above(_f, 30), _f.pulled)`, py.tuple(py.int(40), py.int(3)), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-10 refactoring, easy
  {
    id: "PY-Q32-10",
    version: 2,
    slug: "stream-the-trip-file",
    title: "Stream the trip file instead of loading it",
    format: "refactoring",
    difficulty: "easy",
    minutes: 12,
    requires: ["aggregate-call", "assignment", "comparison", "conversion", "csv-read", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "logical", "membership", "newline-escape", "none-value", "print-call", "print-text", "reassignment", "string-index", "top-level-indent", "tuple-literal", "with-statement"],
    prompt: "`longest_trip(path)` finds the trip with the greatest distance in a TLC trip CSV. It works, but it loads every row into a list first, and the full January file has millions of rows. Refactor it to read the file one row at a time, keeping exactly the same results: the first trip wins a tie, and a file with no trips gives `None`.",
    spec: [
      ["Function", "`longest_trip(path)`"],
      ["Returns", "`(trip_id, miles)` of the longest trip, as text and float; `None` for no trips"],
      ["Memory", "don't hold all rows: the check compares peak memory on a 60,000-row file with the file's size"],
    ],
    hiddenKinds: ["a tie for the longest trip", "a file with only the header", "60,000 trips measured with tracemalloc"],
    hints: [
      "`csv.DictReader` over the open file already hands out one row at a time.",
      "Keep only the best trip so far while you loop, instead of a list of every trip.",
      "Replace the best only when a trip is strictly longer, so the first of equal trips stays.",
    ],
    explanation: "`csv.DictReader(f)` is an iterator over the file, so looping over it and keeping a running best holds one row at a time: memory no longer grows with the file. `max(rows, key=...)` over a list also returns the first of equal values, so the refactor keeps that behaviour by replacing the best only on a strictly greater distance.",
    code: {
      starter: src`
import csv

def longest_trip(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        return None
    best = max(rows, key=lambda row: float(row["trip_distance_miles"]))
    return (best["trip_id"], float(best["trip_distance_miles"]))

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,trip_distance_miles,fare_amount\n16126,9.2,40.8\n16127,0.9,7.2\n16128,3.17,17.2\n")
print(longest_trip("trips.csv"))
`,
      answer: src`
import csv

def longest_trip(path):
    best = None
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            miles = float(row["trip_distance_miles"])
            if best is None or miles > best[1]:
                best = (row["trip_id"], miles)
    return best

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,trip_distance_miles,fare_amount\n16126,9.2,40.8\n16127,0.9,7.2\n16128,3.17,17.2\n")
print(longest_trip("trips.csv"))
`,
      alternatives: [
        src`
import csv

def longest_trip(path):
    with open(path, newline="", encoding="utf-8") as f:
        pairs = ((row["trip_id"], float(row["trip_distance_miles"])) for row in csv.DictReader(f))
        return max(pairs, key=lambda pair: pair[1], default=None)
`,
      ],
      wrong: [
        {
          code: src`
import csv

def longest_trip(path):
    best = None
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            miles = float(row["trip_distance_miles"])
            if best is None or miles >= best[1]:
                best = (row["trip_id"], miles)
    return best
`,
          fails: ["tie"],
          why: "`>=` lets a later trip of the same length replace the first",
        },
        {
          code: src`
import csv

def longest_trip(path):
    with open(path, newline="", encoding="utf-8") as f:
        lines = f.read().splitlines()
    best = None
    for row in csv.DictReader(lines):
        miles = float(row["trip_distance_miles"])
        if best is None or miles > best[1]:
            best = (row["trip_id"], miles)
    return best
`,
          fails: ["memory"],
          why: "`read().splitlines()` still loads the whole file before the loop",
        },
      ],
      task: {
        checks: [
          expr("returns", "the longest of three trips", "with open('t1.csv', 'w', encoding='utf-8') as _w:\n    _w.write('trip_id,trip_distance_miles,fare_amount\\n16126,9.2,40.8\\n16127,0.9,7.2\\n16128,3.17,17.2\\n')\nresult = longest_trip('t1.csv')", py.tuple(py.str("16126"), py.float(9.2)), { show: "longest_trip('trips.csv')" }),
          expr("tie", "a tie for the longest trip", "with open('t2.csv', 'w', encoding='utf-8') as _w:\n    _w.write('trip_id,trip_distance_miles,fare_amount\\n16201,18.4,70.0\\n16202,2.0,9.5\\n16203,18.4,64.0\\n')\nresult = longest_trip('t2.csv')", py.tuple(py.str("16201"), py.float(18.4)), { hidden: true }),
          expr("header-only", "a file with only the header", "with open('t3.csv', 'w', encoding='utf-8') as _w:\n    _w.write('trip_id,trip_distance_miles,fare_amount\\n')\nresult = longest_trip('t3.csv')", null, { hidden: true }),
          expr("memory", "60,000 trips measured with tracemalloc", "with open('t4.csv', 'w', encoding='utf-8') as _w:\n    _w.write('trip_id,trip_distance_miles,fare_amount\\n')\n    for _i in range(60000):\n        _w.write(f'{20000 + _i},{(_i * 37) % 300 / 10},{(_i * 13) % 900 / 10}\\n')\nimport tracemalloc as _tm, os as _os\n_tm.stop()\n_tm.start()\ntry:\n    _best = longest_trip('t4.csv')\n    _peak = _tm.get_traced_memory()[1]\nfinally:\n    _tm.stop()\nresult = (_best is not None, _peak < _os.path.getsize('t4.csv') / 2)", py.tuple(py.bool(true), py.bool(true)), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-12 data transformation, medium
  {
    id: "PY-Q32-12",
    version: 2,
    slug: "clean-taxi-trips",
    title: "A generator that cleans taxi trips",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 16,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "end", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-index", "list-literal", "logical", "membership", "none-value", "precedence", "print-call", "string-index", "strptime-call", "top-level-indent", "try-except", "tuple-unpack", "yield-expr"],
    prompt: "TLC trip records arrive as CSV rows of text with real-world problems: blank distances, zero-mile trips, negative fares and clocks that put the drop-off before the pick-up. Write a generator `clean_trips(rows)` that yields one typed record per usable row and skips the rest, processing rows as they come.",
    spec: [
      ["Generator", "`clean_trips(rows)`; rows are dictionaries of text with `trip_id`, `pickup_at`, `dropoff_at` (`YYYY-MM-DD HH:MM:SS`), `trip_distance_miles`, `fare_amount`"],
      ["Yields", "`{\"trip_id\": int, \"minutes\": float, \"miles\": float, \"fare\": float}`"],
      ["Skip", "a row whose numbers or times can't be read, whose miles or fare is 0 or less, or whose drop-off isn't after the pick-up"],
      ["Lazy", "it must be a generator that takes rows only as it needs them"],
    ],
    hiddenKinds: ["a blank distance", "a negative fare", "a drop-off before the pick-up", "a time that can't be read", "a long input read only as far as needed"],
    hints: [
      "Convert inside a `try`: `int`, `float` and `datetime.strptime` all raise ValueError on bad text.",
      "After converting, apply the three rules; skip with `continue`.",
      "Minutes are `(dropoff - pickup).total_seconds() / 60`; yield a new dictionary for each good row.",
    ],
    explanation: "Each row is converted inside one `try`, so a blank or garbled field skips the row instead of crashing the stream. The business rules come after conversion: positive miles and fare, and a positive duration. As a generator, `clean_trips` holds one row at a time and can sit between a CSV reader and an aggregation in a pipeline. Common bugs: checking the rules on the text (`\"-7.2\" > \"0\"` is true), and accepting a zero-length trip.",
    code: {
      starter: src`
from datetime import datetime

def clean_trips(rows):
    return []

rows = [
    {"trip_id": "16126", "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "trip_distance_miles": "9.2", "fare_amount": "40.8"},
    {"trip_id": "16131", "pickup_at": "2025-01-15 00:30:00", "dropoff_at": "2025-01-15 00:35:00", "trip_distance_miles": "", "fare_amount": "9.3"},
]
print(list(clean_trips(rows)))
`,
      answer: src`
from datetime import datetime

FORMAT = "%Y-%m-%d %H:%M:%S"

def clean_trips(rows):
    for row in rows:
        try:
            trip_id = int(row["trip_id"])
            miles = float(row["trip_distance_miles"])
            fare = float(row["fare_amount"])
            pickup = datetime.strptime(row["pickup_at"], FORMAT)
            dropoff = datetime.strptime(row["dropoff_at"], FORMAT)
        except ValueError:
            continue
        if miles <= 0 or fare <= 0 or dropoff <= pickup:
            continue
        minutes = (dropoff - pickup).total_seconds() / 60
        yield {"trip_id": trip_id, "minutes": minutes, "miles": miles, "fare": fare}

rows = [
    {"trip_id": "16126", "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "trip_distance_miles": "9.2", "fare_amount": "40.8"},
    {"trip_id": "16131", "pickup_at": "2025-01-15 00:30:00", "dropoff_at": "2025-01-15 00:35:00", "trip_distance_miles": "", "fare_amount": "9.3"},
]
print(list(clean_trips(rows)))
`,
      alternatives: [
        src`
from datetime import datetime

def parse(row):
    try:
        start = datetime.fromisoformat(row["pickup_at"])
        end = datetime.fromisoformat(row["dropoff_at"])
        return int(row["trip_id"]), start, end, float(row["trip_distance_miles"]), float(row["fare_amount"])
    except ValueError:
        return None

def clean_trips(rows):
    parsed = (parse(row) for row in rows)
    for item in parsed:
        if item is None:
            continue
        trip_id, start, end, miles, fare = item
        if miles > 0 and fare > 0 and end > start:
            yield {"trip_id": trip_id, "minutes": (end - start).total_seconds() / 60, "miles": miles, "fare": fare}
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime

def clean_trips(rows):
    cleaned = []
    for row in rows:
        try:
            pickup = datetime.strptime(row["pickup_at"], "%Y-%m-%d %H:%M:%S")
            dropoff = datetime.strptime(row["dropoff_at"], "%Y-%m-%d %H:%M:%S")
            miles = float(row["trip_distance_miles"])
            fare = float(row["fare_amount"])
        except ValueError:
            continue
        if miles > 0 and fare > 0 and dropoff > pickup:
            cleaned.append({"trip_id": int(row["trip_id"]), "minutes": (dropoff - pickup).total_seconds() / 60, "miles": miles, "fare": fare})
    return cleaned
`,
          fails: ["lazy"],
          why: "the records are right, but it builds a list of all of them before returning",
        },
        {
          code: src`
from datetime import datetime

def clean_trips(rows):
    for row in rows:
        try:
            pickup = datetime.strptime(row["pickup_at"], "%Y-%m-%d %H:%M:%S")
            dropoff = datetime.strptime(row["dropoff_at"], "%Y-%m-%d %H:%M:%S")
            miles = float(row["trip_distance_miles"])
            fare = float(row["fare_amount"])
        except ValueError:
            continue
        if miles >= 0 and fare >= 0:
            yield {"trip_id": int(row["trip_id"]), "minutes": (dropoff - pickup).total_seconds() / 60, "miles": miles, "fare": fare}
`,
          fails: ["rules"],
          why: "zero-mile trips and drop-offs before pick-ups get through",
        },
        {
          code: src`
from datetime import datetime

def clean_trips(rows):
    for row in rows:
        if row["trip_distance_miles"] > "0" and row["fare_amount"] > "0":
            pickup = datetime.strptime(row["pickup_at"], "%Y-%m-%d %H:%M:%S")
            dropoff = datetime.strptime(row["dropoff_at"], "%Y-%m-%d %H:%M:%S")
            if dropoff > pickup:
                yield {"trip_id": int(row["trip_id"]), "minutes": (dropoff - pickup).total_seconds() / 60, "miles": float(row["trip_distance_miles"]), "fare": float(row["fare_amount"])}
`,
          fails: ["rules", "bad-time"],
          why: "the rules compare text, so `\"-7.2\" > \"0\"` passes, and a garbled time crashes",
        },
      ],
      task: {
        checks: [
          expr("returns", "the first trip is kept and the blank distance skipped", `import json as _j\nresult = list(clean_trips(_j.loads(${pyLit(JSON.stringify([TRIPS[0], trip("16131", "2025-01-15 00:30:00", "2025-01-15 00:35:00", "", "9.3")]))})))`, [{ trip_id: 16126, minutes: 28.316666666666666, miles: 9.2, fare: 40.8 }], { show: "list(clean_trips(rows))" }),
          expr("three", "three good trips", `import json as _j\nresult = [t['trip_id'] for t in clean_trips(_j.loads(${pyLit(JSON.stringify(TRIPS))}))]`, [16126, 16127, 16128], { show: "[t['trip_id'] for t in clean_trips(three_good_rows)]" }),
          expr("rules", "a negative fare, a zero-mile trip and a drop-off before the pick-up", `import json as _j\nresult = list(clean_trips(_j.loads(${pyLit(JSON.stringify([trip("1", "2025-01-15 01:00:00", "2025-01-15 01:10:00", "2.0", "-7.2"), trip("2", "2025-01-15 01:00:00", "2025-01-15 01:10:00", "0.0", "3.0"), trip("3", "2025-01-15 01:10:00", "2025-01-15 01:00:00", "2.0", "9.0"), trip("4", "2025-01-15 02:00:00", "2025-01-15 02:30:00", "4.5", "21.0")]))})))`, [{ trip_id: 4, minutes: py.float(30), miles: 4.5, fare: py.float(21) }], { hidden: true }),
          expr("bad-time", "a time that can't be read", `import json as _j\nresult = list(clean_trips(_j.loads(${pyLit(JSON.stringify([trip("5", "2025-01-15 25:61:00", "2025-01-15 02:30:00", "4.5", "21.0"), trip("6", "2025-01-15 02:00:00", "2025-01-15 02:06:00", "1.1", "8.6")]))})))`, [{ trip_id: 6, minutes: py.float(6), miles: 1.1, fare: 8.6 }], { hidden: true }),
          expr("lazy", "a long input read only as far as needed", `${FEED}\n_f = ${feed([trip("9", "2025-01-15 02:00:00", "2025-01-15 02:06:00", "", "8.6"), trip("10", "2025-01-15 02:00:00", "2025-01-15 02:06:00", "1.1", "8.6"), ...Array.from({ length: 300 }, (_, i) => trip(String(100 + i), "2025-01-15 03:00:00", "2025-01-15 03:20:00", "5.0", "25.0"))])}\n_first = next(iter(clean_trips(_f)))\nresult = (_first['trip_id'], _f.pulled)`, py.tuple(py.int(10), py.int(2)), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-13 debugging, medium
  {
    id: "PY-Q32-13",
    version: 2,
    slug: "station-file-iterator",
    title: "A station file you can only read once",
    format: "debugging",
    difficulty: "medium",
    minutes: 14,
    requires: ["assignment", "attr-assign", "class-def", "conversion", "csv-read", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "iter-method", "membership", "method-def", "newline-escape", "plain-class", "print-call", "print-several", "reassignment", "self-name", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "tuple-unpack", "with-statement", "yield-expr"],
    prompt: "`StationFile(path)` lets reports loop over a station's daily readings: `for day, tmax in StationFile(\"chicago.csv\")`. Two problems: a loop crashes with `ValueError: not enough values to unpack` at the end of the file instead of stopping, and a second loop over the same object gets nothing. It also never closes the file. Fix the class so every loop reads the whole file, from the line after the header, and closes it.",
    spec: [
      ["Class", "`StationFile(path)`; the file has a header line `date,tmax_c` and then `YYYY-MM-DD,number` lines, perhaps with blank lines"],
      ["Each loop", "yields `(date, tmax)` with tmax a float, for every non-blank line after the header"],
    ],
    hiddenKinds: ["two loops over the same object", "a blank line at the end", "a header only"],
    hints: [
      "What does `readline()` return at the end of the file, and what does the unpacking do with it?",
      "The file is opened once, in `__init__`, so the position is shared by every loop. Where should each loop start reading?",
      "Make `__iter__` a generator: open the file with `with`, skip the header, and yield a pair for each non-blank line. `__next__` is then not needed.",
    ],
    explanation: "The class was an iterator over one open file: `__iter__` returned `self`, so every loop shared one file position, and at the end `readline()` returns `\"\"`, which can't be unpacked into two values. Writing `__iter__` as a generator that opens the file in a `with` block makes the class an iterable: each loop gets its own generator, reads from the start, and the file is closed when the loop finishes.",
    code: {
      starter: src`
class StationFile:
    def __init__(self, path):
        self.file = open(path, encoding="utf-8")
        self.file.readline()

    def __iter__(self):
        return self

    def __next__(self):
        line = self.file.readline()
        day, tmax = line.strip().split(",")
        return day, float(tmax)

with open("chicago.csv", "w", encoding="utf-8") as f:
    f.write("date,tmax_c\n2024-07-01,31.7\n2024-07-02,33.9\n")
readings = StationFile("chicago.csv")
for day, tmax in readings:
    print(day, tmax)
`,
      answer: src`
class StationFile:
    def __init__(self, path):
        self.path = path

    def __iter__(self):
        with open(self.path, encoding="utf-8") as f:
            f.readline()
            for line in f:
                if line.strip():
                    day, tmax = line.strip().split(",")
                    yield day, float(tmax)

with open("chicago.csv", "w", encoding="utf-8") as f:
    f.write("date,tmax_c\n2024-07-01,31.7\n2024-07-02,33.9\n")
readings = StationFile("chicago.csv")
for day, tmax in readings:
    print(day, tmax)
`,
      alternatives: [
        src`
import csv

class StationFile:
    def __init__(self, path):
        self.path = path

    def __iter__(self):
        with open(self.path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                if row["date"]:
                    yield row["date"], float(row["tmax_c"])
`,
      ],
      wrong: [
        {
          code: src`
class StationFile:
    def __init__(self, path):
        self.file = open(path, encoding="utf-8")
        self.file.readline()

    def __iter__(self):
        return self

    def __next__(self):
        line = self.file.readline()
        while line and not line.strip():
            line = self.file.readline()
        if not line:
            raise StopIteration
        day, tmax = line.strip().split(",")
        return day, float(tmax)
`,
          fails: ["twice"],
          why: "it stops cleanly now, but the object is still single-use: the second loop finds the file at its end",
        },
        {
          code: src`
class StationFile:
    def __init__(self, path):
        self.path = path

    def __iter__(self):
        with open(self.path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    day, tmax = line.strip().split(",")
                    yield day, float(tmax)
`,
          fails: ["returns", "twice", "blank-end", "header-only"],
          why: "it is reusable now, but it reads the header as data and `float(\"tmax_c\")` fails",
        },
      ],
      task: {
        checks: [
          expr("returns", "one loop over the file", "with open('s1.csv', 'w', encoding='utf-8') as _w:\n    _w.write('date,tmax_c\\n2024-07-01,31.7\\n2024-07-02,33.9\\n')\nresult = list(StationFile('s1.csv'))", py.list(py.tuple(py.str("2024-07-01"), py.float(31.7)), py.tuple(py.str("2024-07-02"), py.float(33.9))), { show: "list(StationFile('chicago.csv'))" }),
          expr("twice", "two loops over the same object", "with open('s2.csv', 'w', encoding='utf-8') as _w:\n    _w.write('date,tmax_c\\n2024-01-01,-4.4\\n')\n_s = StationFile('s2.csv')\nresult = (list(_s), list(_s))", py.tuple(py.list(py.tuple(py.str("2024-01-01"), py.float(-4.4))), py.list(py.tuple(py.str("2024-01-01"), py.float(-4.4)))), { hidden: true }),
          expr("blank-end", "a blank line at the end", "with open('s3.csv', 'w', encoding='utf-8') as _w:\n    _w.write('date,tmax_c\\n2024-02-29,8.9\\n\\n')\nresult = list(StationFile('s3.csv'))", py.list(py.tuple(py.str("2024-02-29"), py.float(8.9))), { hidden: true }),
          expr("header-only", "a header only", "with open('s4.csv', 'w', encoding='utf-8') as _w:\n    _w.write('date,tmax_c\\n')\nresult = list(StationFile('s4.csv'))", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-16 function implementation, medium
  {
    id: "PY-Q32-16",
    version: 2,
    slug: "flatten-nested-lists",
    title: "Flatten nested lists",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["arithmetic", "assignment", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-index", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "type-call", "while-loop", "yield-expr", "yield-from"],
    prompt: "Tag lists from different sources arrive nested to different depths: `[\"python\", [\"data\", [\"pandas\", \"numpy\"]], (\"web\",)]`. Write `flatten(value)`: return a flat list of every item that isn't a list or tuple, in order, however deep the nesting. Strings and dictionaries are items, not containers.",
    spec: [
      ["Function", "`flatten(value)`"],
      ["value", "a list or tuple whose items may be lists or tuples again"],
      ["Returns", "a new list of the non-container items, depth first, in order"],
    ],
    hiddenKinds: ["deep nesting", "empty inner lists", "strings that must not be split", "dictionaries kept whole", "tuples mixed with lists"],
    hints: [
      "Recursion: an item that is a list or tuple is flattened the same way; anything else is kept as it is.",
      "Test with `isinstance(item, (list, tuple))`, so that strings, which are iterable too, stay whole.",
      "A recursive generator with `yield from`, wrapped in `list(...)`, is a short way to write it.",
    ],
    explanation: "Each item either is a container (list or tuple) or is kept. For containers, the same function is applied again, which handles any depth. The usual traps are treating strings as containers (they are iterable, so a naive version splits `\"python\"` into letters, and a one-letter string recurses forever) and testing for `list` only, which leaves tuples nested.",
    code: {
      starter: src`
def flatten(value):
    return []

print(flatten(["python", ["data", ["pandas", "numpy"]], ("web",)]))
`,
      answer: src`
def leaves(value):
    for item in value:
        if isinstance(item, (list, tuple)):
            yield from leaves(item)
        else:
            yield item

def flatten(value):
    return list(leaves(value))

print(flatten(["python", ["data", ["pandas", "numpy"]], ("web",)]))
`,
      alternatives: [
        src`
def flatten(value):
    flat = []
    stack = [iter(value)]
    while stack:
        item = next(stack[-1], StopIteration)
        if item is StopIteration:
            stack.pop()
        elif isinstance(item, (list, tuple)):
            stack.append(iter(item))
        else:
            flat.append(item)
    return flat
`,
        src`
def flatten(value):
    result = []
    for item in value:
        if type(item) in (list, tuple):
            result += flatten(item)
        else:
            result.append(item)
    return result
`,
      ],
      wrong: [
        {
          code: src`
def flatten(value):
    result = []
    for item in value:
        if isinstance(item, list):
            result += flatten(item)
        else:
            result.append(item)
    return result
`,
          fails: ["returns"],
          why: "tuples aren't treated as containers, so `(\"web\",)` stays nested",
        },
        {
          code: src`
def flatten(value):
    result = []
    for item in value:
        if isinstance(item, (list, tuple)):
            result += item
        else:
            result.append(item)
    return result
`,
          fails: ["returns"],
          why: "only one level is flattened",
        },
        {
          code: src`
def flatten(value):
    result = []
    for item in value:
        if isinstance(item, (list, tuple, dict)):
            result += flatten(list(item))
        else:
            result.append(item)
    return result
`,
          fails: ["returns"],
          why: "a dictionary is an item, but here it is replaced by its keys",
        },
      ],
      task: {
        checks: [
          fn("returns", "flatten", [
            example([["python", ["data", ["pandas", "numpy"]], ["web"]]], ["python", "data", "pandas", "numpy", "web"]),
            example([[1, [2, [3, [4, [5]]]]]], [1, 2, 3, 4, 5]),
            example([[]], []),
            hiddenCase("deep nesting", [[[[[["deep"]]]], "shallow"]], ["deep", "shallow"]),
            hiddenCase("empty inner lists", [[[], ["a", []], [[]], "b"]], ["a", "b"]),
            hiddenCase("strings that must not be split", [["x", ["yz"]]], ["x", "yz"]),
            hiddenCase("dictionaries kept whole", [[{ repo: "tidewater/smartqueue" }, [{ repo: "cobalt-tools/deeplint" }]]], [{ repo: "tidewater/smartqueue" }, { repo: "cobalt-tools/deeplint" }]),
            hiddenCase("tuples mixed with lists", [py.list(py.str("a"), py.tuple(py.str("b"), py.list(py.str("c"), py.tuple(py.str("d")))))], ["a", "b", "c", "d"]),
          ], { label: "flatten() returns every item, however deep" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-19 performance, medium
  {
    id: "PY-Q32-19",
    version: 2,
    slug: "first-repeated-event-id",
    title: "Stop at the first repeated id",
    format: "performance",
    difficulty: "medium",
    minutes: 14,
    requires: ["assignment", "bitwise", "boolean", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "membership", "none-value", "print-call", "print-several", "print-text", "set-literal", "string-index", "top-level-indent"],
    prompt: "An event feed must never deliver the same id twice; a monitor reads the feed and reports the first id it sees again. Write `first_repeat(ids)`: return the first id that has already appeared, or `None`. The feed is long, so the check counts two things: how many ids you take (stop at the first repeat), and how many `==` comparisons you make (remember ids in a dictionary, not by scanning a list).",
    spec: [
      ["Function", "`first_repeat(ids)`"],
      ["ids", "any iterable of ids (text)"],
      ["Returns", "the first id that repeats an earlier one, or `None`"],
      ["Budget", "no ids taken after the first repeat; on 600 distinct ids, at most 2,000 comparisons"],
    ],
    hiddenKinds: ["no repeats", "a repeat right away", "the feed must not be read past the first repeat", "600 distinct ids within the comparison budget"],
    hints: [
      "Remember each id as you see it, and check before remembering.",
      "Checking `id in some_list` compares with every earlier id; a dictionary (or set) finds it by its hash instead.",
      "Return as soon as you meet an id you've already remembered.",
    ],
    explanation: "A dictionary of seen ids answers \"seen before?\" by hashing, with a comparison only when hashes match, so the work grows with the number of ids. Keeping the seen ids in a list makes every check scan the list: 600 distinct ids cost about 180,000 comparisons. Returning inside the loop also means the rest of the feed is never read.",
    code: {
      starter: src`
def first_repeat(ids):
    return None

print(first_repeat(["48000002730", "48000004214", "48000002730", "48000001239"]))
`,
      answer: src`
def first_repeat(ids):
    seen = {}
    for event_id in ids:
        if event_id in seen:
            return event_id
        seen[event_id] = True
    return None

print(first_repeat(["48000002730", "48000004214", "48000002730", "48000001239"]))
`,
      alternatives: [
        src`
def first_repeat(ids):
    seen = set()
    for event_id in ids:
        if event_id in seen:
            return event_id
        seen |= {event_id}
    return None
`,
      ],
      wrong: [
        {
          code: src`
def first_repeat(ids):
    seen = []
    for event_id in ids:
        if event_id in seen:
            return event_id
        seen.append(event_id)
    return None
`,
          fails: ["comparisons"],
          why: "the answers are right, but each check scans the list of every earlier id",
        },
        {
          code: src`
def first_repeat(ids):
    ids = list(ids)
    seen = {}
    for event_id in ids:
        if event_id in seen:
            return event_id
        seen[event_id] = True
    return None
`,
          fails: ["lazy"],
          why: "`list(ids)` reads the whole feed before looking for the repeat",
        },
        {
          code: src`
def first_repeat(ids):
    counts = {}
    for event_id in ids:
        counts[event_id] = counts.get(event_id, 0) + 1
    for event_id, count in counts.items():
        if count > 1:
            return event_id
    return None
`,
          fails: ["returns", "lazy"],
          why: "it reports the repeated id that appeared first, not the first id to be repeated, and reads everything",
        },
      ],
      task: {
        checks: [
          fn("returns", "first_repeat", [
            example([["48000002730", "48000004214", "48000002730", "48000001239"]], "48000002730"),
            example([["a", "b", "c"]], null),
            example([["x", "y", "y", "x"]], "y"),
            hiddenCase("a repeat right away", [["z", "z"]], "z"),
            hiddenCase("the first id to repeat is not the first id", [["p", "q", "r", "q", "p"]], "q"),
            hiddenCase("no ids", [[]], null),
          ], { label: "first_repeat() finds the first repeated id" }),
          expr("lazy", "the feed must not be read past the first repeat", `${FEED}\n_f = ${feed(["e1", "e2", "e3", "e2", ...Array.from({ length: 400 }, (_, i) => `f${i}`)])}\nresult = (first_repeat(_f), _f.pulled)`, py.tuple(py.str("e2"), py.int(4)), { hidden: true }),
          expr("comparisons", "600 distinct ids within the comparison budget", ["_n = [0]", "class _Id(str):", "    def __eq__(self, other):", "        _n[0] += 1", "        return str.__eq__(self, other)", "    __hash__ = str.__hash__", "_ids = [_Id('id' + str(_i)) for _i in range(600)]", "first_repeat(_ids)", "result = _n[0] <= 2000"].join("\n"), true, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-20 function implementation, hard
  {
    id: "PY-Q32-20",
    version: 2,
    slug: "activity-sessions",
    title: "Activity sessions per contributor",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assignment", "comparison", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "end", "for-loop", "function-def", "function-param", "function-return", "groupby-call", "if-statement", "import-module", "lambda", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "none-value", "precedence", "print-call", "print-several", "reassignment", "sort-key", "string-index", "string-method", "string-slice", "strptime-call", "timedelta-call", "top-level-indent", "truthiness"],
    prompt: "A contributor's events belong to one **session** while they come no more than `gap_minutes` apart; a longer gap starts a new session. Write `sessions(events, gap_minutes)`: return one `(actor, start, end, count)` tuple per session, ordered by start time and then actor. Events arrive in no particular order.",
    spec: [
      ["Function", "`sessions(events, gap_minutes)`"],
      ["events", "dictionaries with `actor` and `created_at` (`\"2025-03-03T12:04:14Z\"`)"],
      ["Returns", "a list of `(actor, start, end, count)`, start and end as the original timestamps; a gap of exactly `gap_minutes` stays in the same session"],
    ],
    hiddenKinds: ["events out of order", "a gap exactly at the limit", "two actors interleaved", "a single event", "no events", "sessions that start at the same time"],
    hints: [
      "Group the events by actor (a dictionary of lists), then sort each actor's events by time.",
      "Walk one actor's sorted events, keeping the current session's start, end and count; a gap longer than the limit closes it and opens a new one.",
      "Compare datetimes, not text: `datetime.strptime(text, \"%Y-%m-%dT%H:%M:%SZ\")`. Collect all sessions, then sort by (start, actor).",
    ],
    explanation: "Sessions are per actor, so the events are grouped first and each group sorted by time; ISO timestamps in one zone also sort correctly as text, but the gap has to be computed with datetimes. Walking the sorted events with a running session, a gap greater than the limit closes the session, and equal-to-the-limit continues it. Common bugs: sessionising all actors together, splitting on `>=` instead of `>`, and forgetting to emit the last open session.",
    code: {
      starter: src`
from datetime import datetime, timedelta

def sessions(events, gap_minutes):
    return []

events = [
    {"actor": "data_fox514", "created_at": "2025-03-03T12:04:14Z"},
    {"actor": "data_fox514", "created_at": "2025-03-03T12:20:00Z"},
    {"actor": "data_fox514", "created_at": "2025-03-03T14:00:00Z"},
]
print(sessions(events, 30))
`,
      answer: src`
from datetime import datetime, timedelta

def parse(stamp):
    return datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")

def sessions(events, gap_minutes):
    by_actor = {}
    for event in events:
        if event["actor"] not in by_actor:
            by_actor[event["actor"]] = []
        by_actor[event["actor"]].append(event["created_at"])
    gap = timedelta(minutes=gap_minutes)
    found = []
    for actor, stamps in by_actor.items():
        stamps = sorted(stamps, key=parse)
        start = end = stamps[0]
        count = 1
        for stamp in stamps[1:]:
            if parse(stamp) - parse(end) > gap:
                found.append((actor, start, end, count))
                start = stamp
                count = 0
            end = stamp
            count += 1
        found.append((actor, start, end, count))
    return sorted(found, key=lambda s: (parse(s[1]), s[0]))

events = [
    {"actor": "data_fox514", "created_at": "2025-03-03T12:04:14Z"},
    {"actor": "data_fox514", "created_at": "2025-03-03T12:20:00Z"},
    {"actor": "data_fox514", "created_at": "2025-03-03T14:00:00Z"},
]
print(sessions(events, 30))
`,
      alternatives: [
        src`
from datetime import datetime
from itertools import groupby

def sessions(events, gap_minutes):
    def when(e):
        return datetime.fromisoformat(e["created_at"].replace("Z", "+00:00"))
    ordered = sorted(events, key=lambda e: (e["actor"], when(e)))
    out = []
    for actor, group in groupby(ordered, key=lambda e: e["actor"]):
        current = None
        for e in group:
            if current and (when(e) - when(current[-1])).total_seconds() <= gap_minutes * 60:
                current.append(e)
            else:
                if current:
                    out.append((actor, current[0]["created_at"], current[-1]["created_at"], len(current)))
                current = [e]
        out.append((actor, current[0]["created_at"], current[-1]["created_at"], len(current)))
    out.sort(key=lambda s: (s[1], s[0]))
    return out
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime, timedelta

def sessions(events, gap_minutes):
    ordered = sorted(events, key=lambda e: e["created_at"])
    found = []
    current = None
    for event in ordered:
        t = datetime.strptime(event["created_at"], "%Y-%m-%dT%H:%M:%SZ")
        if current and current[0] == event["actor"] and t - current[3] <= timedelta(minutes=gap_minutes):
            current[2] = event["created_at"]
            current[3] = t
            current[4] += 1
        else:
            if current:
                found.append((current[0], current[1], current[2], current[4]))
            current = [event["actor"], event["created_at"], event["created_at"], t, 1]
    if current:
        found.append((current[0], current[1], current[2], current[4]))
    return found
`,
          fails: ["returns"],
          why: "it sessionises all actors in one timeline, so interleaved actors break each other's sessions",
        },
        {
          code: src`
from datetime import datetime, timedelta

def parse(stamp):
    return datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")

def sessions(events, gap_minutes):
    by_actor = {}
    for event in events:
        by_actor[event["actor"]] = by_actor.get(event["actor"], []) + [event["created_at"]]
    found = []
    for actor, stamps in by_actor.items():
        stamps = sorted(stamps)
        start = end = stamps[0]
        count = 1
        for stamp in stamps[1:]:
            if parse(stamp) - parse(end) >= timedelta(minutes=gap_minutes):
                found.append((actor, start, end, count))
                start = stamp
                count = 0
            end = stamp
            count += 1
        found.append((actor, start, end, count))
    return sorted(found, key=lambda s: (s[1], s[0]))
`,
          fails: ["returns"],
          why: "`>=` splits a session at a gap exactly equal to the limit",
        },
        {
          code: src`
from datetime import datetime, timedelta

def parse(stamp):
    return datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")

def sessions(events, gap_minutes):
    by_actor = {}
    for event in events:
        by_actor[event["actor"]] = by_actor.get(event["actor"], []) + [event["created_at"]]
    found = []
    for actor, stamps in by_actor.items():
        stamps = sorted(stamps)
        start = end = stamps[0]
        count = 1
        for stamp in stamps[1:]:
            if parse(stamp) - parse(end) > timedelta(minutes=gap_minutes):
                found.append((actor, start, end, count))
                start = stamp
                count = 0
            end = stamp
            count += 1
    return sorted(found, key=lambda s: (s[1], s[0]))
`,
          fails: ["returns"],
          why: "the last session of each actor is never added",
        },
      ],
      task: {
        checks: [
          fn("returns", "sessions", [
            example([[ev("data_fox514", "2025-03-03T12:04:14Z"), ev("data_fox514", "2025-03-03T12:20:00Z"), ev("data_fox514", "2025-03-03T14:00:00Z")], 30], [py.tuple(py.str("data_fox514"), py.str("2025-03-03T12:04:14Z"), py.str("2025-03-03T12:20:00Z"), py.int(2)), py.tuple(py.str("data_fox514"), py.str("2025-03-03T14:00:00Z"), py.str("2025-03-03T14:00:00Z"), py.int(1))]),
            example([[ev("stackkoi785", "2025-03-03T12:06:10Z"), ev("data_fox514", "2025-03-03T12:04:14Z"), ev("stackkoi785", "2025-03-03T12:10:00Z"), ev("data_fox514", "2025-03-03T12:08:00Z")], 15], [py.tuple(py.str("data_fox514"), py.str("2025-03-03T12:04:14Z"), py.str("2025-03-03T12:08:00Z"), py.int(2)), py.tuple(py.str("stackkoi785"), py.str("2025-03-03T12:06:10Z"), py.str("2025-03-03T12:10:00Z"), py.int(2))]),
            example([[], 30], []),
            hiddenCase("events out of order", [[ev("a", "2025-03-03T13:00:00Z"), ev("a", "2025-03-03T12:00:00Z"), ev("a", "2025-03-03T12:10:00Z")], 20], [py.tuple(py.str("a"), py.str("2025-03-03T12:00:00Z"), py.str("2025-03-03T12:10:00Z"), py.int(2)), py.tuple(py.str("a"), py.str("2025-03-03T13:00:00Z"), py.str("2025-03-03T13:00:00Z"), py.int(1))]),
            hiddenCase("a gap exactly at the limit", [[ev("b", "2025-03-03T12:00:00Z"), ev("b", "2025-03-03T12:30:00Z")], 30], [py.tuple(py.str("b"), py.str("2025-03-03T12:00:00Z"), py.str("2025-03-03T12:30:00Z"), py.int(2))]),
            hiddenCase("two actors interleaved", [[ev("c", "2025-03-03T09:00:00Z"), ev("d", "2025-03-03T09:05:00Z"), ev("c", "2025-03-03T09:20:00Z"), ev("d", "2025-03-03T11:00:00Z")], 30], [py.tuple(py.str("c"), py.str("2025-03-03T09:00:00Z"), py.str("2025-03-03T09:20:00Z"), py.int(2)), py.tuple(py.str("d"), py.str("2025-03-03T09:05:00Z"), py.str("2025-03-03T09:05:00Z"), py.int(1)), py.tuple(py.str("d"), py.str("2025-03-03T11:00:00Z"), py.str("2025-03-03T11:00:00Z"), py.int(1))]),
            hiddenCase("a single event", [[ev("e", "2025-03-04T00:00:00Z")], 5], [py.tuple(py.str("e"), py.str("2025-03-04T00:00:00Z"), py.str("2025-03-04T00:00:00Z"), py.int(1))]),
            hiddenCase("sessions that start at the same time", [[ev("zed", "2025-03-03T10:00:00Z"), ev("amy", "2025-03-03T10:00:00Z")], 10], [py.tuple(py.str("amy"), py.str("2025-03-03T10:00:00Z"), py.str("2025-03-03T10:00:00Z"), py.int(1)), py.tuple(py.str("zed"), py.str("2025-03-03T10:00:00Z"), py.str("2025-03-03T10:00:00Z"), py.int(1))]),
          ], { label: "sessions() splits each actor's events at long gaps" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q32-22 output prediction, hard
  {
    id: "PY-Q32-22",
    version: 2,
    slug: "predict-pipeline-order",
    title: "Predict: who runs when in a pipeline",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "for-loop", "function-def", "function-param", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "membership", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "yield-expr"],
    prompt: "Three generator steps and one list comprehension are chained, and `islice` takes two results. Predict exactly what this prints, line by line.",
    spec: [
      ["Watch", "which steps are lazy, which one builds a whole list, and when `islice` stops asking"],
    ],
    hiddenKinds: [],
    hints: [
      "Calling the generator functions runs none of their bodies; the list comprehension runs completely, right away.",
      "The list comprehension pulls every value through `source` and `double` before anything else happens.",
      "After that, `islice` asks `keep` for values only until it has two.",
    ],
    explanation: "`source` and `double` are lazy, but the list comprehension `[...]` consumes `double(source())` immediately, so all three source and double lines print first, interleaved one value at a time. `keep` is lazy again: `islice` asks it for values, and it checks the list's items until two pass (2 fails, 4 and 6 pass), and nothing more is checked.",
    predict: {
      program: src`
from itertools import islice

def source():
    for n in [1, 2, 3]:
        print("source", n)
        yield n

def double(values):
    for v in values:
        print("double", v)
        yield v * 2

def keep(values):
    for v in values:
        print("check", v)
        if v > 2:
            yield v

doubled = [v for v in double(source())]
print("list built")
print(list(islice(keep(doubled), 2)))
`,
      output: "source 1\ndouble 1\nsource 2\ndouble 2\nsource 3\ndouble 3\nlist built\ncheck 2\ncheck 4\ncheck 6\n[4, 6]\n",
      wrongPredictions: [
        "list built\nsource 1\ndouble 1\ncheck 2\nsource 2\ndouble 2\ncheck 4\nsource 3\ndouble 3\ncheck 6\n[4, 6]\n",
        "source 1\nsource 2\nsource 3\ndouble 1\ndouble 2\ndouble 3\nlist built\ncheck 2\ncheck 4\ncheck 6\n[4, 6]\n",
        "source 1\ndouble 1\nsource 2\ndouble 2\nsource 3\ndouble 3\nlist built\ncheck 4\ncheck 6\n[4, 6]\n",
      ],
    },
  },
];
