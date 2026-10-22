/**
 * M50 practice: ten independent problems on the production-readiness capstone (NYC taxi trips, D06).
 * A pure core, validation and quarantine, indexes and performance budgets, resilient batch runs, tests and release
 * decisions, and one multi-file integration over the provided `taxi` package. Version 2: replaces ten placeholder
 * questions that returned fixed SKU strings.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, learnerTests, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";
import { TAXI_FILES, TRIPS_CSV } from "../lessons/M50";

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
const t = (...items: unknown[]) => py.tuple(...items.map(pv));
/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: ReturnType<typeof learnerTests>, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `tests-${n}`) ? { ...c, hidden: true } : c));
const trip = (trip_id: number, fare_amount: number, tip_amount: number) => ({ trip_id, fare_amount, tip_amount });

export const m50Questions: PyQuestion[] = [
  {
    id: "PY-Q50-02",
    version: 2,
    slug: "tip-percentage",
    title: "The tip percentage of a trip",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "if-statement", "none-value", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "The report's core needs one small, pure calculation: the tip as a percentage of the fare. TLC data includes zero and negative fares (refunds and adjustments), which must not produce a percentage.",
    spec: [
      ["Function", "`tip_percentage(trip)`; `trip` has `fare_amount` and `tip_amount`"],
      ["Returns", "`tip_amount / fare_amount * 100` rounded to 1 decimal place; `None` when the fare is 0 or less"],
      ["Rule", "the trip is not changed"],
    ],
    hiddenKinds: ["a zero fare", "a negative fare", "no tip", "a tip larger than the fare"],
    hints: [
      "Check the fare first; there is no percentage of nothing.",
      "Divide, multiply by 100, then round to 1 place.",
      "Return the number; the caller decides how to show it.",
    ],
    explanation: "Guarding against fares of 0 or less first avoids both a ZeroDivisionError and meaningless negative percentages from refund rows; the rest is one expression. The function reads only its argument, so it is trivially testable.",
    code: {
      starter: src`
def tip_percentage(trip):
    return 0

print(tip_percentage({"trip_id": 16126, "fare_amount": 40.8, "tip_amount": 10.7}))
`,
      answer: src`
def tip_percentage(trip):
    if trip["fare_amount"] <= 0:
        return None
    return round(trip["tip_amount"] / trip["fare_amount"] * 100, 1)

print(tip_percentage({"trip_id": 16126, "fare_amount": 40.8, "tip_amount": 10.7}))
`,
      alternatives: [
        src`
def tip_percentage(trip):
    fare = trip["fare_amount"]
    return round(100 * trip["tip_amount"] / fare, 1) if fare > 0 else None
`,
      ],
      wrong: [
        {
          code: src`
def tip_percentage(trip):
    if trip["fare_amount"] == 0:
        return None
    return round(trip["tip_amount"] / trip["fare_amount"] * 100, 1)
`,
          fails: ["returns"],
          why: "a negative fare (a refund row) gives a negative percentage",
        },
        {
          code: src`
def tip_percentage(trip):
    if trip["fare_amount"] <= 0:
        return None
    return round(trip["tip_amount"] / trip["fare_amount"], 1)
`,
          fails: ["returns"],
          why: "it returns a fraction (0.3) instead of a percentage (26.2)",
        },
      ],
      task: {
        checks: [
          fn("returns", "tip_percentage", [
            example([trip(16126, 40.8, 10.7)], 26.2),
            example([trip(16128, 17.2, 0)], py.float(0)),
            example([trip(16130, 5.1, 1)], 19.6),
            hiddenCase("a zero fare", [trip(1, 0, 0)], null),
            hiddenCase("a negative fare", [trip(2, -22.06, 0)], null),
            hiddenCase("a tip larger than the fare", [trip(3, 3.0, 5.0)], 166.7),
          ], { label: "tip_percentage() returns the rounded percentage" }),
          fn("keeps-input", "tip_percentage", [keepsInput([trip(16131, 16.3, 4.41)], { label: "a normal trip" })], { label: "tip_percentage() leaves the trip unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-03",
    version: 2,
    slug: "core-that-changes-its-input",
    title: "The core that changes its input",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "list-index", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "star-kwargs", "string-index", "string-slice", "top-level-indent"],
    prompt: "`with_boroughs` adds pickup boroughs to trips for the report. Two problems surfaced in review: it writes into the caller's trip dictionaries (the API's cached trips suddenly have a `borough` field), and it ignores the zone table it is given, reading a global one instead, so tests with their own table fail. Make it pure: return new dictionaries and use only its arguments.",
    spec: [
      ["Function", "`with_boroughs(trips, zones)`"],
      ["Returns", "a new list of new dictionaries: each trip's fields plus `borough` (`zones` lookup of `pickup_zone_id`, `\"Unknown\"` if missing)"],
      ["Rule", "the trips are not changed; only the `zones` argument is used"],
    ],
    hiddenKinds: ["a test zone table", "a zone missing from the table", "no trips"],
    hints: [
      "Two separate fixes: the lookup and the place the result is written.",
      "Use the `zones` parameter, not the module-level `ZONES`.",
      "Build each output row as a copy of the trip with the extra key (`{**trip, \"borough\": …}` or `dict(trip)`).",
    ],
    explanation: "Assigning `trip[\"borough\"]` changed objects the caller still uses, and the global table made the result depend on something the caller can't pass in. Copying each trip and reading the `zones` argument makes the function pure: same arguments, same result, nothing else touched.",
    code: {
      starter: src`
ZONES = {186: "Manhattan", 39: "Brooklyn"}

def with_boroughs(trips, zones):
    for trip in trips:
        trip["borough"] = ZONES.get(trip["pickup_zone_id"], "Unknown")
    return trips

trips = [{"trip_id": 16126, "pickup_zone_id": 186}, {"trip_id": 16128, "pickup_zone_id": 39}]
print(with_boroughs(trips, {186: "Manhattan", 39: "Brooklyn"}))
print(trips[0])
`,
      answer: src`
ZONES = {186: "Manhattan", 39: "Brooklyn"}

def with_boroughs(trips, zones):
    result = []
    for trip in trips:
        row = dict(trip)
        row["borough"] = zones.get(trip["pickup_zone_id"], "Unknown")
        result.append(row)
    return result

trips = [{"trip_id": 16126, "pickup_zone_id": 186}, {"trip_id": 16128, "pickup_zone_id": 39}]
print(with_boroughs(trips, {186: "Manhattan", 39: "Brooklyn"}))
print(trips[0])
`,
      alternatives: [
        src`
def with_boroughs(trips, zones):
    return [{**trip, "borough": zones.get(trip["pickup_zone_id"], "Unknown")} for trip in trips]
`,
      ],
      wrong: [
        {
          code: src`
ZONES = {186: "Manhattan", 39: "Brooklyn"}

def with_boroughs(trips, zones):
    result = []
    for trip in trips:
        row = dict(trip)
        row["borough"] = ZONES.get(trip["pickup_zone_id"], "Unknown")
        result.append(row)
    return result
`,
          fails: ["test-table"],
          why: "the input is safe now, but the global table is still used, so a test's own table is ignored",
        },
        {
          code: src`
def with_boroughs(trips, zones):
    for trip in trips:
        trip["borough"] = zones.get(trip["pickup_zone_id"], "Unknown")
    return list(trips)
`,
          fails: ["keeps-input"],
          why: "`list(trips)` copies the list, but the dictionaries inside are the caller's, and they still get a `borough` key",
        },
      ],
      task: {
        checks: [
          fn("returns", "with_boroughs", [
            example([[{ trip_id: 16126, pickup_zone_id: 186 }, { trip_id: 16128, pickup_zone_id: 39 }], py.dict([[py.int(186), py.str("Manhattan")], [py.int(39), py.str("Brooklyn")]])], [{ trip_id: 16126, pickup_zone_id: 186, borough: "Manhattan" }, { trip_id: 16128, pickup_zone_id: 39, borough: "Brooklyn" }]),
            hiddenCase("a zone missing from the table", [[{ trip_id: 1, pickup_zone_id: 999 }], py.dict([[py.int(186), py.str("Manhattan")]])], [{ trip_id: 1, pickup_zone_id: 999, borough: "Unknown" }]),
            hiddenCase("no trips", [[], py.dict([])], []),
          ], { label: "with_boroughs() adds the pickup borough" }),
          fn("test-table", "with_boroughs", [hiddenCase("a test zone table", [[{ trip_id: 2, pickup_zone_id: 132 }], py.dict([[py.int(132), py.str("Queens")]])], [{ trip_id: 2, pickup_zone_id: 132, borough: "Queens" }])], { label: "only the zones argument is used" }),
          fn("keeps-input", "with_boroughs", [keepsInput([[{ trip_id: 3, pickup_zone_id: 186 }], py.dict([[py.int(186), py.str("Manhattan")]])], { label: "one trip" })], { label: "with_boroughs() leaves the trips unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-06",
    version: 2,
    slug: "index-the-zone-table",
    title: "Index the zone table, refusing repeats",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "counter-call", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "map-call", "membership", "print-call", "print-several", "print-text", "raise-stmt", "string-format", "string-index", "top-level-indent", "truthiness"],
    prompt: "The performance fix needs the zone table as a dictionary built once. A table with the same zone ID twice is a data error: silently keeping one of the two would put trips in the wrong borough. Build the index and refuse repeats.",
    spec: [
      ["Function", "`index_by(rows, key)`"],
      ["Returns", "a dictionary from each row's `row[key]` to the row itself"],
      ["Raises", "`ValueError` mentioning the repeated value when two rows share a key"],
      ["Rule", "the rows are not changed"],
    ],
    hiddenKinds: ["a repeated zone ID", "a different key column", "a single row", "no rows"],
    hints: [
      "Loop once over the rows, adding each under its key.",
      "Before adding, check whether the key is already in the dictionary.",
      "Raise with the repeated value in the message so the data team can find it.",
    ],
    explanation: "A dictionary comprehension would build the index in one line but silently keep the last of two repeated rows. Checking membership before inserting turns that silent overwrite into a clear error. The index stores the same row objects (no copies needed), and the input list is untouched.",
    code: {
      starter: src`
def index_by(rows, key):
    return {}

zones = [{"zone_id": 132, "zone": "JFK Airport", "borough": "Queens"}, {"zone_id": 186, "zone": "Penn Station/Madison Sq West", "borough": "Manhattan"}]
print(index_by(zones, "zone_id")[186]["borough"])
`,
      answer: src`
def index_by(rows, key):
    index = {}
    for row in rows:
        value = row[key]
        if value in index:
            raise ValueError(f"repeated {key}: {value}")
        index[value] = row
    return index

zones = [{"zone_id": 132, "zone": "JFK Airport", "borough": "Queens"}, {"zone_id": 186, "zone": "Penn Station/Madison Sq West", "borough": "Manhattan"}]
print(index_by(zones, "zone_id")[186]["borough"])
`,
      alternatives: [
        src`
from collections import Counter

def index_by(rows, key):
    counts = Counter(row[key] for row in rows)
    repeated = [value for value, n in counts.items() if n > 1]
    if repeated:
        raise ValueError("repeated values: " + ", ".join(map(str, repeated)))
    return {row[key]: row for row in rows}
`,
      ],
      wrong: [
        {
          code: src`
def index_by(rows, key):
    return {row[key]: row for row in rows}
`,
          fails: ["repeats"],
          why: "a repeated key silently keeps the last row",
        },
        {
          code: src`
def index_by(rows, key):
    index = {}
    for row in rows:
        if row["zone_id"] in index:
            raise ValueError("repeated zone")
        index[row["zone_id"]] = row
    return index
`,
          fails: ["returns"],
          why: "the key column is hard-coded, so indexing by any other column fails",
        },
      ],
      task: {
        checks: [
          fn("returns", "index_by", [
            example([[{ zone_id: 132, borough: "Queens" }, { zone_id: 186, borough: "Manhattan" }], "zone_id"], py.dict([[py.int(132), pv({ zone_id: 132, borough: "Queens" })], [py.int(186), pv({ zone_id: 186, borough: "Manhattan" })]])),
            example([[], "zone_id"], {}),
            example([[{ code: "CRD", description: "Credit card" }], "code"], { CRD: { code: "CRD", description: "Credit card" } }),
            hiddenCase("a different key column", [[{ payment_type_id: 1, description: "Credit card" }, { payment_type_id: 2, description: "Cash" }], "payment_type_id"], py.dict([[py.int(1), pv({ payment_type_id: 1, description: "Credit card" })], [py.int(2), pv({ payment_type_id: 2, description: "Cash" })]])),
          ], { label: "index_by() maps each key to its row" }),
          fn("repeats", "index_by", [raisesCase([[{ zone_id: 7, borough: "Queens" }, { zone_id: 7, borough: "Brooklyn" }], "zone_id"], "ValueError", { label: "a repeated zone ID" })], { label: "repeated keys raise ValueError" }),
          fn("keeps-input", "index_by", [keepsInput([[{ zone_id: 1, borough: "EWR" }], "zone_id"], { label: "a one-row table" })], { label: "index_by() leaves the rows unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-10",
    version: 2,
    slug: "quarantine-impossible-trips",
    title: "Quarantine impossible trips",
    format: "validation",
    difficulty: "medium",
    minutes: 20,
    requires: ["assignment", "comp-if", "comparison", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "truthiness", "tuple-unpack"],
    prompt: "The TLC export contains trips that can't be real: negative totals, a dropoff before the pickup, a thousand-mile ride across town. Split a night's trips into good ones and quarantined ones, each quarantined trip with the first rule it breaks.",
    spec: [
      ["Function", "`split_trips(trips)` → `(good, quarantined)`"],
      ["Rules, in order", "`total_amount` is not negative (`\"negative total\"`); `trip_distance_miles` is from 0 to 200 (`\"impossible distance\"`); `dropoff_at` is not before `pickup_at` (`\"dropoff before pickup\"`)"],
      ["Times", "texts like `2025-01-15 00:12:47`; this format compares correctly as text"],
      ["Returns", "`good`: the trips that break no rule, in order; `quarantined`: `(trip_id, reason)` tuples, in order"],
      ["Rule", "the trips are not changed"],
    ],
    hiddenKinds: ["a trip breaking two rules", "a zero-distance trip", "a dropoff at the same second as pickup", "a distance of exactly 200", "no trips"],
    hints: [
      "Check the rules in the given order and stop at the first one a trip breaks.",
      "A helper that returns the reason (or `None`) keeps the loop simple.",
      "Equal pickup and dropoff times are allowed; only an earlier dropoff is impossible.",
    ],
    explanation: "Each rule is a single comparison, and the first one that fails names the reason, so a trip breaking two rules is reported once, with the more basic problem. Text comparison works for these zero-padded timestamps, the same reason ISO times sorted correctly in the Observability & Operations module. Wrong answers report every broken rule (duplicating the trip in quarantine) or use `<=` and reject zero-length rides.",
    code: {
      starter: src`
def split_trips(trips):
    return trips, []

night = [
    {"trip_id": 16126, "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "trip_distance_miles": 9.2, "total_amount": 64.19},
    {"trip_id": 16129, "pickup_at": "2025-01-15 00:27:23", "dropoff_at": "2025-01-15 00:44:12", "trip_distance_miles": 4.86, "total_amount": -26.81},
    {"trip_id": 16140, "pickup_at": "2025-01-15 01:05:00", "dropoff_at": "2025-01-15 00:58:10", "trip_distance_miles": 1.2, "total_amount": 12.5},
]
good, quarantined = split_trips(night)
print([t["trip_id"] for t in good], quarantined)
`,
      answer: src`
def problem(trip):
    if trip["total_amount"] < 0:
        return "negative total"
    if not 0 <= trip["trip_distance_miles"] <= 200:
        return "impossible distance"
    if trip["dropoff_at"] < trip["pickup_at"]:
        return "dropoff before pickup"
    return None

def split_trips(trips):
    good, quarantined = [], []
    for trip in trips:
        reason = problem(trip)
        if reason is None:
            good.append(trip)
        else:
            quarantined.append((trip["trip_id"], reason))
    return good, quarantined

night = [
    {"trip_id": 16126, "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "trip_distance_miles": 9.2, "total_amount": 64.19},
    {"trip_id": 16129, "pickup_at": "2025-01-15 00:27:23", "dropoff_at": "2025-01-15 00:44:12", "trip_distance_miles": 4.86, "total_amount": -26.81},
    {"trip_id": 16140, "pickup_at": "2025-01-15 01:05:00", "dropoff_at": "2025-01-15 00:58:10", "trip_distance_miles": 1.2, "total_amount": 12.5},
]
good, quarantined = split_trips(night)
print([t["trip_id"] for t in good], quarantined)
`,
      alternatives: [
        src`
RULES = [
    ("negative total", lambda t: t["total_amount"] >= 0),
    ("impossible distance", lambda t: 0 <= t["trip_distance_miles"] <= 200),
    ("dropoff before pickup", lambda t: t["dropoff_at"] >= t["pickup_at"]),
]

def split_trips(trips):
    good, quarantined = [], []
    for trip in trips:
        broken = [name for name, ok in RULES if not ok(trip)]
        if broken:
            quarantined.append((trip["trip_id"], broken[0]))
        else:
            good.append(trip)
    return good, quarantined
`,
      ],
      wrong: [
        {
          code: src`
def split_trips(trips):
    good, quarantined = [], []
    for trip in trips:
        reasons = []
        if trip["total_amount"] < 0:
            reasons.append("negative total")
        if not 0 <= trip["trip_distance_miles"] <= 200:
            reasons.append("impossible distance")
        if trip["dropoff_at"] < trip["pickup_at"]:
            reasons.append("dropoff before pickup")
        for reason in reasons:
            quarantined.append((trip["trip_id"], reason))
        if not reasons:
            good.append(trip)
    return good, quarantined
`,
          fails: ["two-rules"],
          why: "a trip breaking two rules appears twice in quarantine",
        },
        {
          code: src`
def split_trips(trips):
    good, quarantined = [], []
    for trip in trips:
        if trip["total_amount"] < 0:
            quarantined.append((trip["trip_id"], "negative total"))
        elif not 0 < trip["trip_distance_miles"] <= 200:
            quarantined.append((trip["trip_id"], "impossible distance"))
        elif trip["dropoff_at"] <= trip["pickup_at"]:
            quarantined.append((trip["trip_id"], "dropoff before pickup"))
        else:
            good.append(trip)
    return good, quarantined
`,
          fails: ["boundaries"],
          why: "a zero-distance trip and a trip that ends in the same second are rejected, though both happen in the data",
        },
      ],
      task: {
        checks: [
          expr("returns", "the starter's night", lines(
            "_n = [",
            "    {'trip_id': 16126, 'pickup_at': '2025-01-15 00:12:47', 'dropoff_at': '2025-01-15 00:41:06', 'trip_distance_miles': 9.2, 'total_amount': 64.19},",
            "    {'trip_id': 16129, 'pickup_at': '2025-01-15 00:27:23', 'dropoff_at': '2025-01-15 00:44:12', 'trip_distance_miles': 4.86, 'total_amount': -26.81},",
            "    {'trip_id': 16140, 'pickup_at': '2025-01-15 01:05:00', 'dropoff_at': '2025-01-15 00:58:10', 'trip_distance_miles': 1.2, 'total_amount': 12.5},",
            "    {'trip_id': 16150, 'pickup_at': '2025-01-15 02:00:00', 'dropoff_at': '2025-01-15 02:30:00', 'trip_distance_miles': 1210.4, 'total_amount': 30.0},",
            "]",
            "_g, _q = split_trips(_n)",
            "result = ([_t['trip_id'] for _t in _g], _q)",
          ), t([16126], [t(16129, "negative total"), t(16140, "dropoff before pickup"), t(16150, "impossible distance")]), { show: "split_trips(night)" }),
          expr("two-rules", "a trip breaking two rules", "_g, _q = split_trips([{'trip_id': 1, 'pickup_at': '2025-01-15 03:00:00', 'dropoff_at': '2025-01-15 02:00:00', 'trip_distance_miles': -3.0, 'total_amount': 8.0}])\nresult = _q", [t(1, "impossible distance")], { hidden: true }),
          expr("boundaries", "zero distance, the same second, and exactly 200 miles", "_g, _q = split_trips([{'trip_id': 2, 'pickup_at': '2025-01-15 04:00:00', 'dropoff_at': '2025-01-15 04:00:00', 'trip_distance_miles': 0.0, 'total_amount': 3.0}, {'trip_id': 3, 'pickup_at': '2025-01-15 05:00:00', 'dropoff_at': '2025-01-15 09:00:00', 'trip_distance_miles': 200.0, 'total_amount': 400.0}])\nresult = ([_t['trip_id'] for _t in _g], _q)", t([2, 3], []), { hidden: true }),
          expr("empty", "no trips", "result = split_trips([])", t([], []), { hidden: true }),
          expr("keeps-input", "split_trips() leaves the trips unchanged", "_n = [{'trip_id': 9, 'pickup_at': '2025-01-15 00:00:00', 'dropoff_at': '2025-01-15 00:10:00', 'trip_distance_miles': 2.0, 'total_amount': -1.0}]\nsplit_trips(_n)\nresult = _n", [{ trip_id: 9, pickup_at: "2025-01-15 00:00:00", dropoff_at: "2025-01-15 00:10:00", trip_distance_miles: py.float(2), total_amount: py.float(-1) }]),
        ],
      },
    },
  },
  {
    id: "PY-Q50-12",
    version: 2,
    slug: "predict-a-resumed-night",
    title: "Predict a resumed night",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 8,
    requires: ["arithmetic", "assignment", "boolean", "break-statement", "comparison", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "string-index", "top-level-indent", "try-except"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Follow the checkpoint: it moves only after a write succeeds.",
      "The first run stops when batch 2's write fails for good; the second run starts from the checkpoint.",
      "The sink stores rows by trip ID, so writing a row again doesn't add a copy.",
    ],
    explanation: "Run 1 writes batch 0 (one timeout retried), writes batch 1, then batch 2 times out on all its attempts and the error ends the run with the checkpoint at 2. Run 2 starts at batch 2, which now succeeds. The sink holds five distinct trips, and only three retries happened in total: one in batch 0 and two before batch 2 gave up.",
    predict: {
      program: src`
outcomes = ["timeout", "ok", "ok", "timeout", "timeout", "timeout"]
stored = {}
retries = 0

def write(batch):
    if outcomes and outcomes.pop(0) == "timeout":
        raise TimeoutError
    for trip_id in batch:
        stored[trip_id] = True

def run(batches, checkpoint):
    global retries
    for number in range(checkpoint["done"], len(batches)):
        for attempt in range(3):
            try:
                write(batches[number])
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
        checkpoint["done"] = number + 1

batches = [[16126, 16127], [16128], [16130, 16131]]
checkpoint = {"done": 0}
try:
    run(batches, checkpoint)
except TimeoutError:
    print("stopped at", checkpoint)
run(batches, checkpoint)
print(checkpoint, len(stored), retries)
`,
      output: "stopped at {'done': 2}\n{'done': 3} 5 3\n",
      wrongPredictions: ["stopped at {'done': 3}\n{'done': 3} 5 3", "stopped at {'done': 2}\n{'done': 3} 5 4", "stopped at {'done': 2}\n{'done': 3} 3 3", "{'done': 3} 5 1"],
    },
  },
  {
    id: "PY-Q50-13",
    version: 2,
    slug: "batch-missing-after-restart",
    title: "One batch missing after every restart",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-literal", "dict-lookup", "enumerate-call", "for-loop", "function-def", "function-param", "function-return", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "membership", "method-def", "plain-class", "print-call", "print-several", "print-text", "range-call", "reassignment", "self-name", "string-index", "string-slice", "top-level-indent"],
    prompt: "Operations noticed that whenever the nightly job is restarted after a crash, exactly one batch of trips never reaches the report, and the `written` count in the morning summary is one too high. Find and fix the bugs in `resume_night`.",
    spec: [
      ["Function", "`resume_night(batches, sink, state)`; `state` is `{\"done\": n}` (batches already written)"],
      ["Behaviour", "write batches `state[\"done\"]` onward with `sink.write(batch)`, setting `state[\"done\"]` to `number + 1` after each write"],
      ["Returns", "the number of batches written by this call"],
    ],
    hiddenKinds: ["a fresh start", "a restart near the end", "a restart with nothing left"],
    hints: [
      "Run the demo: which batch does a run with `{\"done\": 1}` write first?",
      "`state[\"done\"]` is a count of finished batches, which is also the index of the next one.",
      "Count only the writes this call made.",
    ],
    explanation: "The loop began at `state[\"done\"] + 1`, treating the count as the index of the last finished batch, so one batch was skipped on every restart; and the return value added the earlier batches to this call's count. Starting at `state[\"done\"]` and counting writes as they happen fixes both.",
    code: {
      starter: src`
def resume_night(batches, sink, state):
    for number in range(state["done"] + 1, len(batches)):
        sink.write(batches[number])
        state["done"] = number + 1
    return state["done"]

class Sink:
    def __init__(self):
        self.stored = []

    def write(self, batch):
        self.stored.append(batch)

sink = Sink()
print(resume_night([["16126"], ["16128"], ["16130"], ["16131"]], sink, {"done": 1}), sink.stored)
`,
      answer: src`
def resume_night(batches, sink, state):
    written = 0
    for number in range(state["done"], len(batches)):
        sink.write(batches[number])
        state["done"] = number + 1
        written += 1
    return written

class Sink:
    def __init__(self):
        self.stored = []

    def write(self, batch):
        self.stored.append(batch)

sink = Sink()
print(resume_night([["16126"], ["16128"], ["16130"], ["16131"]], sink, {"done": 1}), sink.stored)
`,
      alternatives: [
        src`
def resume_night(batches, sink, state):
    start = state["done"]
    for number, batch in enumerate(batches[start:], start=start):
        sink.write(batch)
        state["done"] = number + 1
    return len(batches) - start if start < len(batches) else 0
`,
      ],
      wrong: [
        {
          code: src`
def resume_night(batches, sink, state):
    for number in range(state["done"], len(batches)):
        sink.write(batches[number])
        state["done"] = number + 1
    return state["done"]
`,
          fails: ["returns", "near-end", "nothing-left"],
          why: "no batch is skipped now, but the count still includes batches written before the restart",
        },
        {
          code: src`
def resume_night(batches, sink, state):
    written = 0
    for number in range(state["done"] + 1, len(batches)):
        sink.write(batches[number])
        state["done"] = number + 1
        written += 1
    return written
`,
          fails: ["returns", "fresh", "near-end"],
          why: "the count is right, but the batch at the checkpoint is still skipped",
        },
      ],
      task: {
        checks: [
          expr("returns", "a restart after one batch", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.stored = []",
            "    def write(self, batch):",
            "        self.stored.append(batch)",
            "_s, _st = _Sink(), {'done': 1}",
            "result = (resume_night([['16126'], ['16128'], ['16130'], ['16131']], _s, _st), _s.stored, _st)",
          ), t(3, [["16128"], ["16130"], ["16131"]], { done: 4 }), { show: "resume_night(batches, sink, {'done': 1})" }),
          expr("fresh", "a fresh start", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.stored = []",
            "    def write(self, batch):",
            "        self.stored.append(batch)",
            "_s = _Sink()",
            "result = (resume_night([['a'], ['b']], _s, {'done': 0}), _s.stored)",
          ), t(2, [["a"], ["b"]]), { hidden: true }),
          expr("near-end", "a restart near the end", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.stored = []",
            "    def write(self, batch):",
            "        self.stored.append(batch)",
            "_s = _Sink()",
            "result = (resume_night([['a'], ['b'], ['c']], _s, {'done': 2}), _s.stored)",
          ), t(1, [["c"]]), { hidden: true }),
          expr("nothing-left", "a restart with nothing left", "class _Sink:\n    def write(self, batch):\n        raise AssertionError('nothing should be written')\nresult = resume_night([['a']], _Sink(), {'done': 1})", 0, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-16",
    version: 2,
    slug: "trips-to-report-rows",
    title: "Turn trips into report rows",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 20,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "conversion", "dict-get", "dict-literal", "dict-lookup", "end", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-index", "list-literal", "list-mutate", "membership", "none-value", "precedence", "print-call", "print-several", "string-format", "string-index", "strptime-call", "top-level-indent", "unicode-text"],
    prompt: "The dashboard's trip table needs one row per trip with readable, derived fields instead of raw TLC columns. Transform the trips without touching the originals.",
    spec: [
      ["Function", "`report_rows(trips, zones)`"],
      ["trips", "dicts with `trip_id`, `pickup_at`, `dropoff_at` (`YYYY-MM-DD HH:MM:SS`), `pickup_zone_id`, `dropoff_zone_id`, `trip_distance_miles`, `fare_amount`"],
      ["Row", "`{\"trip_id\", \"route\": \"<pickup borough> → <dropoff borough>\", \"minutes\": whole minutes (rounded down), \"fare_per_mile\": fare / distance rounded to 2, or None when the distance is 0}`"],
      ["Boroughs", "from `zones` (zone ID → borough); a missing zone is `Unknown`"],
      ["Returns", "the rows in the same order; the trips are not changed"],
    ],
    hiddenKinds: ["a zero-distance trip", "a trip past midnight", "an unknown zone", "no trips"],
    hints: [
      "Parse both timestamps with `datetime.strptime` and subtract them; the timedelta's `total_seconds()` gives the duration.",
      "Whole minutes rounded down: integer division of the seconds by 60.",
      "Build a new dictionary per trip; guard the division when the distance is 0.",
    ],
    explanation: "Subtracting two datetimes gives a timedelta (see Dates Numbers & Regex), which handles trips across midnight that string slicing would get wrong. Fare per mile needs a guard for zero-distance trips, which do appear in TLC data. Building new dictionaries leaves the caller's trips intact for the other reports.",
    code: {
      starter: src`
from datetime import datetime

def report_rows(trips, zones):
    return []

zones = {186: "Manhattan", 179: "Queens", 70: "Queens", 148: "Manhattan"}
trips = [{"trip_id": 16126, "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "pickup_zone_id": 186, "dropoff_zone_id": 179, "trip_distance_miles": 9.2, "fare_amount": 40.8}]
print(report_rows(trips, zones))
`,
      answer: src`
from datetime import datetime

FORMAT = "%Y-%m-%d %H:%M:%S"

def report_rows(trips, zones):
    rows = []
    for trip in trips:
        start = datetime.strptime(trip["pickup_at"], FORMAT)
        end = datetime.strptime(trip["dropoff_at"], FORMAT)
        distance = trip["trip_distance_miles"]
        rows.append({
            "trip_id": trip["trip_id"],
            "route": f"{zones.get(trip['pickup_zone_id'], 'Unknown')} → {zones.get(trip['dropoff_zone_id'], 'Unknown')}",
            "minutes": int((end - start).total_seconds() // 60),
            "fare_per_mile": round(trip["fare_amount"] / distance, 2) if distance else None,
        })
    return rows

zones = {186: "Manhattan", 179: "Queens", 70: "Queens", 148: "Manhattan"}
trips = [{"trip_id": 16126, "pickup_at": "2025-01-15 00:12:47", "dropoff_at": "2025-01-15 00:41:06", "pickup_zone_id": 186, "dropoff_zone_id": 179, "trip_distance_miles": 9.2, "fare_amount": 40.8}]
print(report_rows(trips, zones))
`,
      alternatives: [
        src`
from datetime import datetime

def borough(zones, zone_id):
    return zones.get(zone_id, "Unknown")

def report_rows(trips, zones):
    out = []
    for t in trips:
        seconds = (datetime.fromisoformat(t["dropoff_at"]) - datetime.fromisoformat(t["pickup_at"])).total_seconds()
        out.append({
            "trip_id": t["trip_id"],
            "route": borough(zones, t["pickup_zone_id"]) + " → " + borough(zones, t["dropoff_zone_id"]),
            "minutes": int(seconds) // 60,
            "fare_per_mile": None if t["trip_distance_miles"] == 0 else round(t["fare_amount"] / t["trip_distance_miles"], 2),
        })
    return out
`,
      ],
      wrong: [
        {
          code: src`
def report_rows(trips, zones):
    rows = []
    for trip in trips:
        start = int(trip["pickup_at"][11:13]) * 60 + int(trip["pickup_at"][14:16])
        end = int(trip["dropoff_at"][11:13]) * 60 + int(trip["dropoff_at"][14:16])
        distance = trip["trip_distance_miles"]
        rows.append({
            "trip_id": trip["trip_id"],
            "route": f"{zones.get(trip['pickup_zone_id'], 'Unknown')} → {zones.get(trip['dropoff_zone_id'], 'Unknown')}",
            "minutes": end - start,
            "fare_per_mile": round(trip["fare_amount"] / distance, 2) if distance else None,
        })
    return rows
`,
          fails: ["returns", "midnight"],
          why: "minutes from the clock digits ignore the seconds and go negative for a trip past midnight",
        },
        {
          code: src`
from datetime import datetime

def report_rows(trips, zones):
    for trip in trips:
        start = datetime.strptime(trip["pickup_at"], "%Y-%m-%d %H:%M:%S")
        end = datetime.strptime(trip["dropoff_at"], "%Y-%m-%d %H:%M:%S")
        trip["route"] = f"{zones.get(trip['pickup_zone_id'], 'Unknown')} → {zones.get(trip['dropoff_zone_id'], 'Unknown')}"
        trip["minutes"] = int((end - start).total_seconds() // 60)
        trip["fare_per_mile"] = round(trip["fare_amount"] / trip["trip_distance_miles"], 2) if trip["trip_distance_miles"] else None
    return [{k: trip[k] for k in ("trip_id", "route", "minutes", "fare_per_mile")} for trip in trips]
`,
          fails: ["keeps-input"],
          why: "the derived fields are written into the caller's trips",
        },
      ],
      task: {
        checks: [
          fn("returns", "report_rows", [
            example([[{ trip_id: 16126, pickup_at: "2025-01-15 00:12:47", dropoff_at: "2025-01-15 00:41:06", pickup_zone_id: 186, dropoff_zone_id: 179, trip_distance_miles: 9.2, fare_amount: 40.8 }], py.dict([[py.int(186), py.str("Manhattan")], [py.int(179), py.str("Queens")]])], [{ trip_id: 16126, route: "Manhattan → Queens", minutes: 28, fare_per_mile: 4.43 }]),
            example([[{ trip_id: 16132, pickup_at: "2025-01-15 00:39:15", dropoff_at: "2025-01-15 01:03:54", pickup_zone_id: 70, dropoff_zone_id: 148, trip_distance_miles: 10.43, fare_amount: 42.9 }], py.dict([[py.int(70), py.str("Queens")], [py.int(148), py.str("Manhattan")]])], [{ trip_id: 16132, route: "Queens → Manhattan", minutes: 24, fare_per_mile: 4.11 }]),
            example([[], py.dict([])], []),
            hiddenCase("a zero-distance trip with an unknown zone", [[{ trip_id: 1, pickup_at: "2025-01-15 09:00:00", dropoff_at: "2025-01-15 09:00:59", pickup_zone_id: 264, dropoff_zone_id: 264, trip_distance_miles: 0, fare_amount: 3.0 }], py.dict([])], [{ trip_id: 1, route: "Unknown → Unknown", minutes: 0, fare_per_mile: null }]),
          ], { label: "report_rows() derives the dashboard fields" }),
          fn("midnight", "report_rows", [hiddenCase("a trip past midnight", [[{ trip_id: 2, pickup_at: "2025-01-15 23:50:30", dropoff_at: "2025-01-16 00:05:10", pickup_zone_id: 132, dropoff_zone_id: 186, trip_distance_miles: 17.0, fare_amount: 70.0 }], py.dict([[py.int(132), py.str("Queens")], [py.int(186), py.str("Manhattan")]])], [{ trip_id: 2, route: "Queens → Manhattan", minutes: 14, fare_per_mile: 4.12 }])], { label: "durations across midnight" }),
          fn("keeps-input", "report_rows", [keepsInput([[{ trip_id: 3, pickup_at: "2025-01-15 01:00:00", dropoff_at: "2025-01-15 01:10:00", pickup_zone_id: 1, dropoff_zone_id: 1, trip_distance_miles: 2.0, fare_amount: 10.0 }], py.dict([])], { label: "one trip" })], { label: "report_rows() leaves the trips unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-19",
    version: 2,
    slug: "test-the-release-gate",
    title: "Test the release gate",
    format: "testing",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comparison", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "star-args", "string-format", "string-index", "test-func", "top-level-indent", "tuple-literal", "unittest-case", "with-statement"],
    prompt: "`can_release(results, required)` is the last line of defence before production. Its contract: `results` maps check name → `True`/`False` for the checks that ran; it returns `(True, [])` only when every required check ran and passed; otherwise `(False, reasons)`, where reasons are sorted texts `\"<name>: failed\"` or `\"<name>: missing\"` for required checks only (failures of checks that aren't required don't block). Write tests that pass for a correct gate and catch broken ones. Leave the calls to Check.",
    spec: [
      ["Target", "`can_release(results, required)` → `(ok, reasons)`"],
      ["Your tests", "`test_` functions or a TestCase in your file"],
      ["Graded", "pass for a correct gate, fail for each of three broken gates"],
    ],
    hiddenKinds: ["a gate that treats missing checks as passed", "a gate where optional failures block", "a gate that returns unsorted reasons"],
    hints: [
      "One test per promise: all pass; a required check fails; a required check is missing; an optional check fails.",
      "Compare the whole returned tuple, reasons included, with the exact value you expect.",
      "Give the gate more than one reason at a time, so an unsorted list shows up.",
    ],
    explanation: "The three defects break three different promises, so each needs its own test: a missing required check (the dangerous one), an optional failure that must not block, and two reasons that must come out sorted. Testing only the all-green case passes every broken gate.",
    code: {
      starter: src`
def can_release(results, required):
    reasons = []
    for name in required:
        if name not in results:
            reasons.append(f"{name}: missing")
        elif not results[name]:
            reasons.append(f"{name}: failed")
    return not reasons, sorted(reasons)

def test_all_green():
    assert can_release({"tests": True, "lock": True}, ["tests", "lock"]) == (True, [])
`,
      answer: src`
def can_release(results, required):
    reasons = []
    for name in required:
        if name not in results:
            reasons.append(f"{name}: missing")
        elif not results[name]:
            reasons.append(f"{name}: failed")
    return not reasons, sorted(reasons)

def test_all_green():
    assert can_release({"tests": True, "lock": True}, ["tests", "lock"]) == (True, [])

def test_missing_check_blocks():
    assert can_release({"tests": True}, ["tests", "smoke"]) == (False, ["smoke: missing"])

def test_optional_failure_does_not_block():
    assert can_release({"tests": True, "benchmark": False}, ["tests"]) == (True, [])

def test_reasons_are_sorted():
    assert can_release({"tests": False}, ["tests", "lock"]) == (False, ["lock: missing", "tests: failed"])
`,
      alternatives: [
        src`
import unittest

def can_release(results, required):
    reasons = []
    for name in required:
        if name not in results:
            reasons.append(f"{name}: missing")
        elif not results[name]:
            reasons.append(f"{name}: failed")
    return not reasons, sorted(reasons)

class GateTest(unittest.TestCase):
    def test_cases(self):
        cases = [
            (({"tests": True}, ["tests"]), (True, [])),
            (({}, ["schema"]), (False, ["schema: missing"])),
            (({"tests": True, "docs": False}, ["tests"]), (True, [])),
            (({"smoke": False, "tests": False}, ["tests", "smoke"]), (False, ["smoke: failed", "tests: failed"])),
        ]
        for args, expected in cases:
            with self.subTest(args=args):
                self.assertEqual(can_release(*args), expected)
`,
      ],
      wrong: [
        {
          code: src`
def can_release(results, required):
    reasons = []
    for name in required:
        if name not in results:
            reasons.append(f"{name}: missing")
        elif not results[name]:
            reasons.append(f"{name}: failed")
    return not reasons, sorted(reasons)

def test_all_green():
    assert can_release({"tests": True, "lock": True}, ["tests", "lock"]) == (True, [])

def test_failure_blocks():
    ok, reasons = can_release({"tests": False}, ["tests"])
    assert not ok
`,
          fails: ["tests-1", "tests-2", "tests-3"],
          why: "nothing tests a missing check, an optional failure or the order of reasons",
        },
        {
          code: src`
def can_release(results, required):
    reasons = []
    for name in required:
        if name not in results:
            reasons.append(f"{name}: missing")
        elif not results[name]:
            reasons.append(f"{name}: failed")
    return not reasons, sorted(reasons)

def test_missing_check_blocks():
    assert can_release({"tests": True}, ["tests", "smoke"]) == (False, ["smoke: missing"])

def test_optional_failure_does_not_block():
    assert can_release({"tests": True, "benchmark": False}, ["tests"]) == (True, [])
`,
          fails: ["tests-3"],
          why: "every test produces at most one reason, so unsorted reasons go unnoticed",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "can_release",
          correct: "def can_release(results, required):\n    reasons = []\n    for name in required:\n        if name not in results:\n            reasons.append(name + ': missing')\n        elif not results[name]:\n            reasons.append(name + ': failed')\n    return not reasons, sorted(reasons)\n",
          defects: [
            { label: "a gate that treats missing checks as passed", code: "def can_release(results, required):\n    reasons = sorted(name + ': failed' for name in required if not results.get(name, True))\n    return not reasons, reasons\n" },
            { label: "a gate where optional failures block", code: "def can_release(results, required):\n    reasons = [name + ': missing' for name in required if name not in results]\n    reasons += [name + ': failed' for name, ok in results.items() if not ok]\n    return not reasons, sorted(reasons)\n" },
            { label: "a gate that returns unsorted reasons", code: "def can_release(results, required):\n    reasons = []\n    for name in required:\n        if name not in results:\n            reasons.append(name + ': missing')\n        elif not results[name]:\n            reasons.append(name + ': failed')\n    return not reasons, reasons\n" },
          ],
        }), [2, 3]),
      },
    },
  },
  {
    id: "PY-Q50-20",
    version: 2,
    slug: "the-nightly-job",
    title: "The nightly job, end to end",
    format: "integration",
    difficulty: "hard",
    minutes: 35,
    requires: ["arithmetic", "assignment", "attr-assign", "break-statement", "class-def", "comparison", "dict-get", "dict-literal", "dict-lookup", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "membership", "method-def", "nested-loop", "package-import", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "self-name", "string-index", "string-slice", "top-level-indent", "try-except", "tuple-unpack", "while-loop", "with-statement"],
    prompt: "Assemble the capstone. The `taxi` package next to your program provides `parse_trips(text)` (→ `(trips, rejected_lines)`) and `ZONES`. Write `nightly(csv_text, sink, state, batch_size)`: parse the export, split the trips into batches of `batch_size` in order, and for each batch from `state[\"done\"]` on, build rows `{\"trip_id\", \"borough\", \"total\"}` (borough of the pickup zone, `Unknown` if missing) and call `sink.write(rows)`, retrying a `TimeoutError` up to 3 attempts in total (no sleeping needed); after each successful write set `state[\"done\"]`. Any other error propagates. Return `{\"loaded\": trips parsed, \"rejected\": rejected line numbers, \"batches_written\": by this call, \"retries\": retries used}`. Provided files sit next to your program (they aren't editor tabs): `taxi/parse.py`, `taxi/zones.py` and the export `trips.csv`; `print(Path(\"taxi/parse.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
    spec: [
      ["Function", "`nightly(csv_text, sink, state, batch_size)`"],
      ["Uses", "`from taxi.parse import parse_trips` and `from taxi.zones import ZONES`"],
      ["Trip fields", "each parsed trip is a dictionary with `trip_id`, `pickup_zone_id`, `dropoff_zone_id`, `trip_distance_miles`, `fare_amount`, `tip_amount` and `total_amount`; `ZONES` maps a zone id to its borough"],
      ["Rows", "`{\"trip_id\": int, \"borough\": str, \"total\": float}` per trip, in the trips' order: `borough` from the trip's `pickup_zone_id`, `total` is its `total_amount`"],
      ["Resume", "batches before `state[\"done\"]` are skipped; `state[\"done\"]` moves only after a write succeeds"],
      ["Returns", "`{\"loaded\", \"rejected\", \"batches_written\", \"retries\"}`"],
    ],
    hiddenKinds: ["a crash and a resume", "storage that times out once", "rows that fail to parse", "an export with only a header"],
    hints: [
      "Parse first; the batches are slices of the parsed trips: `trips[i:i + batch_size]`.",
      "Loop over batch numbers from `state[\"done\"]`; inside, a 3-attempt retry loop around `sink.write`.",
      "Count retries and written batches as you go; `loaded` and `rejected` come straight from the parser.",
    ],
    explanation: "This is the course in one function: parsing with quarantine from the package (the Reliable Data Pipelines module, the Production Readiness Capstone module), a pure transformation into rows, idempotent batched writes with retries (see Observability & Operations), and a checkpoint that only moves after a write succeeds, so a crashed night resumes exactly where it stopped (see Reliable Data Pipelines). The checks crash a real run with a scripted sink, resume it, and compare the stored rows with a clean run.",
    code: {
      starter: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def nightly(csv_text, sink, state, batch_size):
    return {"loaded": 0, "rejected": [], "batches_written": 0, "retries": 0}

class Sink:
    def __init__(self):
        self.rows = {}

    def write(self, rows):
        for row in rows:
            self.rows[row["trip_id"]] = row

with open("trips.csv", encoding="utf-8") as f:
    text = f.read()
sink = Sink()
print(nightly(text, sink, {"done": 0}, 3), len(sink.rows))
`,
      answer: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def to_rows(trips):
    return [{"trip_id": t["trip_id"], "borough": ZONES.get(t["pickup_zone_id"], "Unknown"), "total": t["total_amount"]} for t in trips]

def nightly(csv_text, sink, state, batch_size):
    trips, rejected = parse_trips(csv_text)
    batches = [trips[i:i + batch_size] for i in range(0, len(trips), batch_size)]
    written = 0
    retries = 0
    for number in range(state["done"], len(batches)):
        rows = to_rows(batches[number])
        for attempt in range(3):
            try:
                sink.write(rows)
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
        state["done"] = number + 1
        written += 1
    return {"loaded": len(trips), "rejected": rejected, "batches_written": written, "retries": retries}

class Sink:
    def __init__(self):
        self.rows = {}

    def write(self, rows):
        for row in rows:
            self.rows[row["trip_id"]] = row

with open("trips.csv", encoding="utf-8") as f:
    text = f.read()
sink = Sink()
print(nightly(text, sink, {"done": 0}, 3), len(sink.rows))
`,
      alternatives: [
        src`
from taxi import parse, zones

def write_with_retry(sink, rows):
    for attempt in range(3):
        try:
            sink.write(rows)
            return attempt
        except TimeoutError:
            if attempt == 2:
                raise
    return 0

def nightly(csv_text, sink, state, batch_size):
    trips, rejected = parse.parse_trips(csv_text)
    summary = {"loaded": len(trips), "rejected": rejected, "batches_written": 0, "retries": 0}
    while state["done"] * batch_size < len(trips):
        start = state["done"] * batch_size
        rows = [
            {"trip_id": t["trip_id"], "borough": zones.ZONES.get(t["pickup_zone_id"], "Unknown"), "total": t["total_amount"]}
            for t in trips[start:start + batch_size]
        ]
        summary["retries"] += write_with_retry(sink, rows)
        state["done"] += 1
        summary["batches_written"] += 1
    return summary
`,
      ],
      wrong: [
        {
          code: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def nightly(csv_text, sink, state, batch_size):
    trips, rejected = parse_trips(csv_text)
    batches = [trips[i:i + batch_size] for i in range(0, len(trips), batch_size)]
    written = 0
    for number in range(state["done"], len(batches)):
        rows = [{"trip_id": t["trip_id"], "borough": ZONES.get(t["pickup_zone_id"], "Unknown"), "total": t["total_amount"]} for t in batches[number]]
        sink.write(rows)
        state["done"] = number + 1
        written += 1
    return {"loaded": len(trips), "rejected": rejected, "batches_written": written, "retries": 0}
`,
          fails: ["timeout"],
          why: "a single timeout from the storage stops the whole night",
        },
        {
          code: src`
from taxi.parse import parse_trips
from taxi.zones import ZONES

def nightly(csv_text, sink, state, batch_size):
    trips, rejected = parse_trips(csv_text)
    batches = [trips[i:i + batch_size] for i in range(0, len(trips), batch_size)]
    written = 0
    retries = 0
    for number in range(len(batches)):
        rows = [{"trip_id": t["trip_id"], "borough": ZONES.get(t["pickup_zone_id"], "Unknown"), "total": t["total_amount"]} for t in batches[number]]
        for attempt in range(3):
            try:
                sink.write(rows)
                break
            except TimeoutError:
                if attempt == 2:
                    raise
                retries += 1
        state["done"] = number + 1
        written += 1
    return {"loaded": len(trips), "rejected": rejected, "batches_written": written, "retries": retries}
`,
          fails: ["resume"],
          why: "it ignores the saved state, so a restart writes every batch again",
        },
      ],
      task: {
        files: { ...TAXI_FILES, "trips.csv": TRIPS_CSV },
        checks: [
          expr("returns", "a clean night over the fixture export", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.rows = {}",
            "    def write(self, rows):",
            "        for row in rows:",
            "            self.rows[row['trip_id']] = row",
            "_s, _st = _Sink(), {'done': 0}",
            "_r = nightly(open('trips.csv', encoding='utf-8').read(), _s, _st, 3)",
            "result = (_r, _st, round(sum(_x['total'] for _x in _s.rows.values()), 2), _s.rows[16127]['borough'])",
          ), t({ loaded: 8, rejected: [], batches_written: 3, retries: 0 }, { done: 3 }, 253.71, "Unknown"), { show: "nightly(trips.csv text, sink, {'done': 0}, 3)" }),
          expr("timeout", "storage that times out once", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.rows = {}",
            "        self.calls = 0",
            "    def write(self, rows):",
            "        self.calls += 1",
            "        if self.calls == 2:",
            "            raise TimeoutError('storage did not answer')",
            "        for row in rows:",
            "            self.rows[row['trip_id']] = row",
            "_s = _Sink()",
            "_r = nightly(open('trips.csv', encoding='utf-8').read(), _s, {'done': 0}, 4)",
            "result = (_r['batches_written'], _r['retries'], len(_s.rows))",
          ), t(2, 1, 8), { hidden: true }),
          expr("resume", "a crash and a resume", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.rows = {}",
            "        self.batches = 0",
            "        self.broken = True",
            "    def write(self, rows):",
            "        if self.broken and self.batches == 1:",
            "            raise PermissionError('read-only')",
            "        self.batches += 1",
            "        for row in rows:",
            "            self.rows[row['trip_id']] = row",
            "_s, _st = _Sink(), {'done': 0}",
            "_text = open('trips.csv', encoding='utf-8').read()",
            "try:",
            "    nightly(_text, _s, _st, 3)",
            "except PermissionError:",
            "    pass",
            "_after_crash = dict(_st)",
            "_s.broken = False",
            "_r = nightly(_text, _s, _st, 3)",
            "result = (_after_crash, _r['batches_written'], _s.batches, sorted(_s.rows))",
          ), t({ done: 1 }, 2, 3, [16126, 16127, 16128, 16130, 16131, 16132, 16133, 16134]), { hidden: true }),
          expr("bad-rows", "rows that fail to parse", lines(
            "class _Sink:",
            "    def __init__(self):",
            "        self.rows = {}",
            "    def write(self, rows):",
            "        for row in rows:",
            "            self.rows[row['trip_id']] = row",
            "_text = 'trip_id,pickup_zone_id,dropoff_zone_id,trip_distance_miles,fare_amount,tip_amount,total_amount\\n1,186,179,1.0,5.0,1.0,8.5\\n2,39,89,x,5.0,0,6.5\\n3,70,148,2.0,9.0,0,11.0\\n'",
            "_r = nightly(_text, _Sink(), {'done': 0}, 10)",
            "result = (_r['loaded'], _r['rejected'], _r['batches_written'])",
          ), t(2, [3], 1), { hidden: true }),
          expr("header-only", "an export with only a header", lines(
            "class _Sink:",
            "    def write(self, rows):",
            "        raise AssertionError('nothing to write')",
            "result = nightly('trip_id,pickup_zone_id,dropoff_zone_id,trip_distance_miles,fare_amount,tip_amount,total_amount\\n', _Sink(), {'done': 0}, 5)",
          ), { loaded: 0, rejected: [], batches_written: 0, retries: 0 }, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q50-22",
    version: 2,
    slug: "trips-in-the-last-hour",
    title: "Trips in the last hour, quickly",
    format: "performance",
    difficulty: "hard",
    minutes: 25,
    requires: ["aggregate-call", "arithmetic", "assignment", "bisect-call", "comparison", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "print-call", "print-several", "range-call", "reassignment", "string-index", "top-level-indent", "while-loop"],
    prompt: "The dispatch dashboard shows, for each trip, how many trips started in the 60 minutes before it (including itself). The current version compares every trip with every earlier trip, which is fine for ten trips and hopeless for a night. Pickup times are given as minutes after midnight, already sorted. Make it fast without changing the answers.",
    spec: [
      ["Function", "`recent_counts(minutes)`; `minutes` is a sorted list of pickup times in minutes"],
      ["Returns", "a list: for each trip, the number of trips whose time is greater than `its time - 60` and not later than its own (equal times count; those later in the list too)"],
      ["Constraint", "for 600 trips, at most 15,000 comparisons of times (the current version needs about 400,000)"],
    ],
    hiddenKinds: ["several trips at the same minute", "a gap longer than an hour", "exactly 60 minutes apart", "no trips"],
    hints: [
      "Because the times are sorted, the trips inside the window form one contiguous stretch of the list.",
      "Keep a left index that only moves forward: while the time at it is 60 or more minutes older than the current one, advance it.",
      "Trips with the same time as the current one but later in the list also count: handle equal times by moving a right index too, or count them in a group.",
    ],
    explanation: "With sorted times, the window of the last 60 minutes is a contiguous slice whose left edge only moves forward, so two indexes (or `bisect`, the Algorithms & Complexity module) find each window's size with a constant amount of work per trip instead of rescanning the list. Equal times are the subtle case: every trip at a minute sees all the others at that minute, so the right edge must move past them. The comparison budget is counted with an instrumented number type.",
    code: {
      starter: src`
def recent_counts(minutes):
    counts = []
    for now in minutes:
        counts.append(sum(1 for other in minutes if now - 60 < other <= now))
    return counts

print(recent_counts([5, 20, 20, 64, 70, 200]))
`,
      answer: src`
def recent_counts(minutes):
    counts = []
    left = 0
    right = 0
    n = len(minutes)
    for i in range(n):
        now = minutes[i]
        while minutes[left] <= now - 60:
            left += 1
        if right < i:
            right = i
        while right + 1 < n and minutes[right + 1] <= now:
            right += 1
        counts.append(right - left + 1)
    return counts

print(recent_counts([5, 20, 20, 64, 70, 200]))
`,
      alternatives: [
        src`
import bisect

def recent_counts(minutes):
    return [bisect.bisect_right(minutes, now) - bisect.bisect_right(minutes, now - 60) for now in minutes]
`,
      ],
      wrong: [
        {
          code: src`
def recent_counts(minutes):
    counts = []
    left = 0
    for i, now in enumerate(minutes):
        while minutes[left] <= now - 60:
            left += 1
        counts.append(i - left + 1)
    return counts
`,
          fails: ["returns", "same-minute"],
          why: "trips later in the list at the same minute aren't counted, so tied trips get different answers",
        },
        {
          code: src`
def recent_counts(minutes):
    counts = []
    for i, now in enumerate(minutes):
        count = 0
        for other in minutes[:i + 1][::-1]:
            if other <= now - 60:
                break
            count += 1
        for other in minutes[i + 1:]:
            if other != now:
                break
            count += 1
        counts.append(count)
    return counts
`,
          fails: ["comparisons"],
          why: "the answers are right, but each trip still walks back through its whole window, which is quadratic on a busy night",
        },
      ],
      task: {
        checks: [
          fn("returns", "recent_counts", [
            example([[5, 20, 20, 64, 70, 200]], [1, 3, 3, 4, 4, 1]),
            example([[]], []),
            example([[0, 30, 59, 60, 61]], [1, 2, 3, 3, 4]),
            hiddenCase("a gap longer than an hour", [[10, 300, 301]], [1, 1, 2]),
          ], { label: "recent_counts() counts trips in the last hour" }),
          fn("same-minute", "recent_counts", [hiddenCase("several trips at the same minute", [[100, 100, 100, 159, 160]], [3, 3, 3, 4, 2])], { label: "trips at the same minute all count" }),
          expr("comparisons", "at most 15,000 time comparisons for 600 trips", lines(
            "_n = [0]",
            "class _T(int):",
            "    def _count(self):",
            "        _n[0] += 1",
            "    def __lt__(self, other):",
            "        self._count()",
            "        return int.__lt__(self, other)",
            "    def __le__(self, other):",
            "        self._count()",
            "        return int.__le__(self, other)",
            "    def __gt__(self, other):",
            "        self._count()",
            "        return int.__gt__(self, other)",
            "    def __ge__(self, other):",
            "        self._count()",
            "        return int.__ge__(self, other)",
            "    def __eq__(self, other):",
            "        self._count()",
            "        return int.__eq__(self, other)",
            "    def __ne__(self, other):",
            "        self._count()",
            "        return int.__ne__(self, other)",
            "    def __sub__(self, other):",
            "        return _T(int(self) - int(other))",
            "    __hash__ = int.__hash__",
            "_times = [_T(i * 2 // 3) for i in range(600)]",
            "_counts = recent_counts(_times)",
            "result = (_counts[-1], _n[0] <= 15000)",
          ), t(90, true)),
        ],
      },
    },
  },
];
