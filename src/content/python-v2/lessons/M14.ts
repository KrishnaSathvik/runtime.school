/**
 * M14 Built-ins & Sorting: five lessons (PY-L14-01 … PY-L14-05).
 *
 * Python's built-in functions replace loops learners have been writing by hand since M05: `zip` and `enumerate` walk
 * lists side by side (01), `sorted` with a key orders records by any field, stably and by several fields (02), `any`
 * and `all` answer yes/no questions about a whole collection (03), `map` and `filter` apply a function you already have
 * (04), and `sum`, `min` and `max` reduce a collection, with `key` and `default` for records and empty inputs (05).
 * Fixtures: NOAA readings (D07), BTS flights (D13), Runtime Market orders and invoices (R01-shaped), leaderboards.
 *
 * Challenges are graded by calling the learner's function with the public example and with hidden inputs (empty
 * lists, ties, boundaries, mismatched lengths). `apply_pipeline` takes functions as arguments, so it is graded with
 * expression checks that call it. Any correct style passes; nothing requires a particular built-in.
 * Version 2: rewritten from a print-the-list module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const t = (...xs: unknown[]) => py.tuple(...xs.map((x) => (typeof x === "string" ? py.str(x) : Number.isInteger(x) ? py.int(x as number) : py.float(x as number))));

// ---------------------------------------------------------------- shared fixtures

const meetings = [
  { title: "Budget review", start: "10:00", room: "B2" },
  { title: "Stand-up", start: "09:30", room: "A1" },
  { title: "Hiring sync", start: "10:00", room: "A4" },
  { title: "Design crit", start: "13:15", room: "B2" },
];

const racers = [
  { name: "Ana", points: 42, seconds: 610 },
  { name: "Ben", points: 57, seconds: 655 },
  { name: "Chen", points: 42, seconds: 598 },
  { name: "Dara", points: 61, seconds: 702 },
];

const invoiceLines = [
  { sku: "SPO-11681", qty: 2, price: 7.5 },
  { sku: "HOM-22847", qty: 1, price: 31.0 },
  { sku: "ELE-24781", qty: 1, price: 171.25 },
];

const routes = [
  { name: "Express", minutes: 95, price: 42 },
  { name: "Saver", minutes: 140, price: 18 },
  { name: "Direct", minutes: 95, price: 36 },
  { name: "Night", minutes: 300, price: 12 },
];

const team = [
  { name: "Ana", skills: ["forklift", "first aid"], available: true },
  { name: "Ben", skills: ["forklift"], available: false },
  { name: "Chen", skills: ["till", "first aid"], available: true },
];

const pipe = (id: string, label: string, call: string, expected: unknown, hidden = false) =>
  ({ kind: "expr" as const, id, label, expr: `result = ${call}`, expected: pv(expected), show: call, ...(hidden ? { hidden: true } : {}) });

export const m14Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L14-01 zip and enumerate
  {
    id: "PY-L14-01",
    version: 2,
    slug: "zip-pairs",
    title: "Walk lists side by side with zip",
    lede: "`zip` walks two or more lists in step, handing you one item from each. It stops at the shortest list, which is either convenient or a bug.",
    focus: "Pair up items from parallel lists with zip, number them with enumerate, and guard against lists of different lengths.",
    minutes: 16,
    objectives: [
      "Walk parallel lists with `for a, b in zip(xs, ys)` instead of indexing with `range(len(…))`",
      "Number items from 1 with `enumerate(items, start=1)`",
      "Know that `zip` silently stops at the shortest list, and use `strict=True` or a length check when that would hide a bug",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "comp-if", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-format", "arithmetic", "comparison", "len-call", "for-loop", "enumerate-call", "range-call", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "if-statement", "list-mutate", "conversion", "logical", "print-text", "continue-statement", "nested-loop"],
    teaches: ["zip-call"],
    blocks: [
      {
        kind: "text",
        md: "Data often arrives as **parallel lists**: one list of station names and another of the day's highs, where position 0 of one belongs with position 0 of the other. You could loop over `range(len(stations))` and index both lists, but the index is only plumbing.\n\n`zip(a, b)` hands you the pairs directly: `(a[0], b[0])`, then `(a[1], b[1])`, and so on. Unpack each pair in the `for` line. `enumerate` (see Loops & Iteration) works on any list too, and `start=1` numbers from 1, the way people count.",
      },
      {
        kind: "example",
        title: "Today's highs, numbered",
        code: src`
stations = ["Great Falls Airport", "Boston Logan", "Atlanta Hartsfield"]
highs = [6.7, 2.2, 15.6]
for rank, (station, high) in enumerate(zip(stations, highs), start=1):
    print(f"{rank}. {station}: {high} C")
`,
        output: "1. Great Falls Airport: 6.7 C\n2. Boston Logan: 2.2 C\n3. Atlanta Hartsfield: 15.6 C\n",
        note: "`zip` gives `(station, high)` pairs and `enumerate` wraps each pair with a number, so the `for` line unpacks a number and a pair: `rank, (station, high)`.",
      },
      {
        kind: "text",
        md: "A spreadsheet export is the classic parallel case: one header row of column names, then rows of values in the same order. `zip(header, row)` pairs every name with its value, and `dict(...)` turns those pairs into a dictionary.",
      },
      {
        kind: "example",
        title: "CSV rows as dictionaries",
        code: src`
def rows_as_dicts(header, rows):
    return [dict(zip(header, row)) for row in rows]

header = ["flight", "origin", "destination"]
rows = [["UA2017", "LAS", "IAH"], ["MQ3443", "MCI", "MIA"]]
for record in rows_as_dicts(header, rows):
    print(record)
`,
        output: "{'flight': 'UA2017', 'origin': 'LAS', 'destination': 'IAH'}\n{'flight': 'MQ3443', 'origin': 'MCI', 'destination': 'MIA'}\n",
        note: "Each row becomes a record you can read by name (`record[\"origin\"]`) instead of by position.",
      },
      {
        kind: "text",
        md: "`zip` stops as soon as **any** list runs out, without a word. If one list is shorter because data went missing, the extra items are silently dropped and every later result can be wrong. When the lists must match, pass `strict=True`: `zip` then raises ValueError the moment the lengths turn out to differ.",
      },
      {
        kind: "error-example",
        title: "strict=True catches a missing arrival time",
        code: src`
scheduled = [300, 305, 313]
actual = [296, 312]
for planned, arrived in zip(scheduled, actual, strict=True):
    print(arrived - planned)
`,
        error: "ValueError",
        output: "-4\n7\n",
        note: "The first two delays print, then `ValueError: zip() argument 2 is shorter than argument 1`. Without `strict=True` the loop would just stop after two flights, and the third would never be reported.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time two lists are matched by position: names and scores, a header and a row, scheduled and actual times. **Mistakes to avoid:** indexing with `range(len(…))` when `zip` says it directly; and trusting `zip` with lists that might differ in length. Check `len` yourself, or use `strict=True` and let the error stop the program.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Names beside scores",
      prompt: "`score_lines` only uses the names. Walk the names and scores together with `zip`, and build a line like `\"Ana: 72\"` for each student.",
      spec: [
        ["Function", "`score_lines(names, scores)`"],
        ["Returns", "a list of texts `\"name: score\"`, in order"],
      ],
      starter: src`
def score_lines(names, scores):
    return [name for name in names]

print(score_lines(["Ana", "Ben"], [72, 58]))
`,
      answer: src`
def score_lines(names, scores):
    return [f"{name}: {score}" for name, score in zip(names, scores)]

print(score_lines(["Ana", "Ben"], [72, 58]))
`,
      wrong: [
        {
          code: src`
def score_lines(names, scores):
    return ["Ana: 72", "Ben: 58"]
`,
          fails: ["returns"],
          why: "the lines are typed in, so other students get the wrong lines",
        },
      ],
      hints: ["`zip(names, scores)` gives one `(name, score)` pair at a time.", "Unpack the pair in the `for` part of the comprehension.", "Build the line with an f-string."],
      task: {
        checks: [
          fn("returns", "score_lines", [
            example([["Ana", "Ben"], [72, 58]], ["Ana: 72", "Ben: 58"]),
            hiddenCase("no students", [[], []], []),
            hiddenCase("one student", [["Chen"], [91]], ["Chen: 91"]),
          ], { label: "score_lines() pairs each name with its score" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Prices that changed",
        prompt: "A shop exports its price list twice, before and after a price update, as three parallel lists: SKUs, old prices and new prices, in the same order. Write `price_changes(skus, old, new)`: return a tuple `(sku, old_price, new_price)` for every SKU whose price changed, in list order.",
        spec: [
          ["Function", "`price_changes(skus, old, new)`"],
          ["skus, old, new", "three lists of the same length; position `i` of each describes the same product"],
          ["Returns", "a list of tuples `(sku, old_price, new_price)` for the changed prices only; `[]` when nothing changed"],
          ["Example", "`price_changes([\"A\", \"B\", \"C\"], [5, 9.5, 12], [5, 10, 11])` → `[('B', 9.5, 10), ('C', 12, 11)]`"],
        ],
        starter: src`
def price_changes(skus, old, new):
    return []

print(price_changes(["A", "B", "C"], [5, 9.5, 12], [5, 10, 11]))
`,
        answer: src`
def price_changes(skus, old, new):
    return [(sku, before, after) for sku, before, after in zip(skus, old, new) if before != after]

print(price_changes(["A", "B", "C"], [5, 9.5, 12], [5, 10, 11]))
`,
        alternatives: [
          src`
def price_changes(skus, old, new):
    changed = []
    for i in range(len(skus)):
        if old[i] != new[i]:
            changed.append((skus[i], old[i], new[i]))
    return changed
`,
        ],
        wrong: [
          {
            code: src`
def price_changes(skus, old, new):
    return [(sku, after) for sku, before, after in zip(skus, old, new) if before != after]
`,
            fails: ["returns"],
            why: "the old price is left out of each tuple",
          },
          {
            code: src`
def price_changes(skus, old, new):
    return [(sku, before, after) for sku, before, after in zip(skus, old, new)]
`,
            fails: ["returns"],
            why: "every product is reported, including the ones whose price stayed the same",
          },
          {
            code: src`
def price_changes(skus, old, new):
    return [(sku, before, after) for sku, before, after in zip(skus, old, new) if before < after]
`,
            fails: ["returns"],
            why: "only price rises are reported; a price cut is a change too",
          },
        ],
        hints: [
          "`zip` accepts three lists as easily as two, and hands you three values each time.",
          "Unpack all three in the `for` part, then keep only the products whose two prices differ.",
          "Each kept item is a tuple of three values, built with parentheses.",
        ],
        task: {
          checks: [
            fn("returns", "price_changes", [
              example([["A", "B", "C"], [5, 9.5, 12], [5, 10, 11]], [t("B", 9.5, 10), t("C", 12, 11)]),
              example([["SPO-11681"], [7.49], [7.49]], []),
              example([[], [], []], []),
              hiddenCase("every price changed", [["X", "Y"], [1, 2], [2, 1]], [t("X", 1, 2), t("Y", 2, 1)]),
              hiddenCase("a price cut to zero", [["Z"], [3.5], [0]], [t("Z", 3.5, 0)]),
              hiddenCase("changes separated by unchanged products", [["P1", "P2", "P3", "P4"], [10, 20, 30, 40], [11, 20, 30, 39]], [t("P1", 10, 11), t("P4", 40, 39)]),
            ], { label: "price_changes() reports each changed price with both values" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Records from a ragged export",
        prompt: "A CSV export was damaged: some rows lost a cell, and one gained an extra. Write `to_records(header, rows)`: turn each row into a dictionary from column name to value, but **skip** any row whose number of cells differs from the header's. `zip` alone would quietly build a half-filled record from a short row, so check the lengths yourself.",
        spec: [
          ["Function", "`to_records(header, rows)`"],
          ["header", "a list of column names"],
          ["rows", "a list of rows, each a list of cell texts"],
          ["Returns", "a list of dictionaries, one per row with exactly as many cells as the header, in order"],
          ["Example", "header `[\"code\", \"city\"]` with rows `[[\"ATL\", \"Atlanta\"], [\"BOS\"], [\"CLT\", \"Charlotte\"]]` → two records (BOS is skipped)"],
        ],
        starter: src`
def to_records(header, rows):
    return []

header = ["code", "city"]
rows = [["ATL", "Atlanta"], ["BOS"], ["CLT", "Charlotte"]]
print(to_records(header, rows))
`,
        answer: src`
def to_records(header, rows):
    return [dict(zip(header, row)) for row in rows if len(row) == len(header)]

header = ["code", "city"]
rows = [["ATL", "Atlanta"], ["BOS"], ["CLT", "Charlotte"]]
print(to_records(header, rows))
`,
        alternatives: [
          src`
def to_records(header, rows):
    records = []
    for row in rows:
        if len(row) != len(header):
            continue
        record = {}
        for name, value in zip(header, row):
            record[name] = value
        records.append(record)
    return records
`,
        ],
        wrong: [
          {
            code: src`
def to_records(header, rows):
    return [dict(zip(header, row)) for row in rows]
`,
            fails: ["returns"],
            why: "damaged rows are not skipped: a short row becomes a record with a missing column",
          },
          {
            code: src`
def to_records(header, rows):
    return [dict(zip(header, row, strict=True)) for row in rows]
`,
            fails: ["returns"],
            why: "`strict=True` stops the whole import with ValueError at the first damaged row instead of skipping it",
          },
          {
            code: src`
def to_records(header, rows):
    return [dict(zip(header, row)) for row in rows if len(row) >= len(header)]
`,
            fails: ["returns"],
            why: "a row with an extra cell is kept, and its extra value is silently thrown away",
          },
        ],
        hints: [
          "The record itself is `dict(zip(header, row))`, as in the example. What's new is the decision about which rows to keep.",
          "A row is usable only when it has exactly as many cells as there are column names.",
          "A filter at the end of the comprehension can compare the two lengths with `len`.",
        ],
        task: {
          checks: [
            fn("returns", "to_records", [
              example([["code", "city"], [["ATL", "Atlanta"], ["BOS"], ["CLT", "Charlotte"]]], [{ code: "ATL", city: "Atlanta" }, { code: "CLT", city: "Charlotte" }]),
              example([["flight"], [["UA2017"]]], [{ flight: "UA2017" }]),
              example([["a", "b"], []], []),
              hiddenCase("a row with an extra cell", [["code", "city"], [["DFW", "Dallas", "TX"], ["DTW", "Detroit"]]], [{ code: "DTW", city: "Detroit" }]),
              hiddenCase("every row damaged", [["x", "y", "z"], [["1"], ["1", "2"]]], []),
              hiddenCase("an empty row", [["id"], [[], ["7"]]], [{ id: "7" }]),
            ], { label: "to_records() turns only complete rows into records" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
names = ["Ana", "Ben", "Chen"]
for place, name in enumerate(names, start=1):
    print(place, name)
`,
        choices: ["1 Ana\n2 Ben\n3 Chen", "0 Ana\n1 Ben\n2 Chen", "1 Ben\n2 Chen", "Ana 1\nBen 2\nChen 3"],
        answer: 0,
        why: "`start=1` makes the count begin at 1; without it, `enumerate` starts at 0.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the lists have different lengths. What does this print?",
        program: src`
flights = ["UA2017", "MQ3443", "DL1270"]
delays = [-4, 12]
print(list(zip(flights, delays)))
`,
        choices: ["[('UA2017', -4), ('MQ3443', 12)]", "[('UA2017', -4), ('MQ3443', 12), ('DL1270', None)]", "ValueError", "[('UA2017', 'MQ3443', 'DL1270'), (-4, 12)]"],
        answer: 0,
        why: "Plain `zip` stops at the shorter list without any error, so DL1270 simply disappears. Only `strict=True` turns this into a ValueError.",
      },
      {
        id: "q3",
        prompt: "Which job is `zip` made for?",
        choices: ["Pairing each column name in a header with the value in the same position of a row", "Finding the largest delay", "Keeping only the late flights", "Sorting flights by departure time"],
        answer: 0,
        why: "`zip` matches items by position across lists. The others are `max`, a filter and `sorted`.",
      },
    ],
    review: [
      "`for a, b in zip(xs, ys)` walks parallel lists without an index; `dict(zip(header, row))` builds a record.",
      "`enumerate(items, start=1)` numbers from 1.",
      "`zip` stops silently at the shortest list. Use `strict=True` or check lengths when a mismatch means bad data.",
      "Next: `sorted` with a key, to order records by any field.",
    ],
  },

  // ------------------------------------------------------------------ PY-L14-02 sorted with a key
  {
    id: "PY-L14-02",
    version: 2,
    slug: "sort-by-a-key",
    title: "Sort records by a key",
    lede: "`sorted` can't compare two dictionaries, but it can compare a value you pick out of each one. That value is the key, and a tuple key sorts by several fields at once.",
    focus: "Sort records with key=function and reverse=True, by several fields with a tuple key, relying on a stable sort.",
    minutes: 18,
    objectives: [
      "Pass a function as `key=` so `sorted` orders records by one of their fields",
      "Sort by several fields with a key that returns a tuple, and reverse one field by negating a number",
      "Rely on stability: records with equal keys keep their original order",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-sort", "list-comp", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-format", "arithmetic", "comparison", "for-loop", "enumerate-call", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "zip-call", "list-mutate", "conversion", "len-call", "precedence", "print-text", "range-call", "reassignment"],
    teaches: ["sort-key"],
    blocks: [
      {
        kind: "text",
        md: "`sorted` (see Lists & Tuples) orders numbers and texts because Python knows how to compare them. A dictionary is different: is `{\"name\": \"Ana\", \"points\": 42}` smaller than Ben's record? Python refuses to guess.",
      },
      {
        kind: "error-example",
        title: "Sorting dictionaries directly",
        code: src`
players = [{"name": "Ana", "points": 42}, {"name": "Ben", "points": 57}]
print(sorted(players))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: '<' not supported between instances of 'dict' and 'dict'`.",
      },
      {
        kind: "text",
        md: "The fix is a **key function**: a function that takes one record and returns the value to sort by. Pass the function itself, without calling it: `key=points_of`, not `key=points_of()`. `sorted` calls it once per record, sorts by the results, and returns the records. `reverse=True` puts the largest first.\n\nPython's sort is **stable**: records whose keys are equal stay in the order they arrived, even with `reverse=True`.",
      },
      {
        kind: "example",
        title: "A leaderboard, highest first",
        code: src`
def points_of(player):
    return player["points"]

players = [
    {"name": "Ana", "points": 42},
    {"name": "Ben", "points": 57},
    {"name": "Chen", "points": 42},
    {"name": "Dara", "points": 61},
]
for player in sorted(players, key=points_of, reverse=True):
    print(player["name"], player["points"])
print(players[0]["name"])
`,
        output: "Dara 61\nBen 57\nAna 42\nChen 42\n" + "Ana\n",
        note: "Ana and Chen tie on 42 and stay in their original order. `sorted` returns a new list; `players` still starts with Ana.",
      },
      {
        kind: "text",
        md: "To sort by **several fields**, return a tuple. Tuples compare item by item: the first items decide, and only on a tie do the second items matter. To make one numeric field run the other way, negate it in the tuple. Dates written as `YYYY-MM-DD` text sort correctly as text, because the most significant part comes first.",
      },
      {
        kind: "example",
        title: "Invoices to pay: soonest first, then the largest",
        code: src`
def payment_order(invoice):
    return (invoice["due"], -invoice["amount"])

invoices = [
    {"id": "INV-104", "due": "2025-03-01", "amount": 120.0},
    {"id": "INV-101", "due": "2025-02-15", "amount": 89.5},
    {"id": "INV-103", "due": "2025-03-01", "amount": 640.0},
    {"id": "INV-102", "due": "2025-02-15", "amount": 89.5},
]
for invoice in sorted(invoices, key=payment_order):
    print(invoice["id"], invoice["due"], invoice["amount"])
`,
        output: "INV-101 2025-02-15 89.5\nINV-102 2025-02-15 89.5\nINV-103 2025-03-01 640.0\nINV-104 2025-03-01 120.0\n",
        note: "Same date: the larger amount first, because `-640.0` is smaller than `-120.0`. INV-101 and INV-102 tie on both fields and keep their input order.",
      },
      {
        kind: "text",
        md: "**When to use it:** leaderboards, schedules, invoices: any time records need an order. `items.sort(key=…)` does the same thing in place and returns `None`; `sorted` returns a new list and leaves the original alone. **Mistakes to avoid:** calling the key function (`key=points_of()`); and `reverse=True` with a tuple key, which reverses **every** field, so names on a tie come out Z to A.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Pay the earliest due first",
      prompt: "`by_amount` sorts invoices by amount. The finance team wants them in due-date order instead: change the key function to return the `due` date.",
      spec: [
        ["Function", "`pay_order(invoices)`"],
        ["Returns", "the invoice IDs, earliest due date first"],
      ],
      starter: src`
def by_amount(invoice):
    return invoice["amount"]

def pay_order(invoices):
    return [inv["id"] for inv in sorted(invoices, key=by_amount)]

invoices = [
    {"id": "INV-7", "due": "2025-04-30", "amount": 15.0},
    {"id": "INV-8", "due": "2025-04-02", "amount": 300.0},
]
print(pay_order(invoices))
`,
      answer: src`
def by_amount(invoice):
    return invoice["due"]

def pay_order(invoices):
    return [inv["id"] for inv in sorted(invoices, key=by_amount)]

invoices = [
    {"id": "INV-7", "due": "2025-04-30", "amount": 15.0},
    {"id": "INV-8", "due": "2025-04-02", "amount": 300.0},
]
print(pay_order(invoices))
`,
      wrong: [
        {
          code: src`
def pay_order(invoices):
    return ["INV-8", "INV-7"]
`,
          fails: ["returns"],
          why: "the order is typed in instead of sorted",
        },
      ],
      hints: ["Only the value the key function returns needs to change.", "The due date is stored as `YYYY-MM-DD` text.", "Text in that shape sorts in date order."],
      task: {
        checks: [
          fn("returns", "pay_order", [
            example([[{ id: "INV-7", due: "2025-04-30", amount: 15.0 }, { id: "INV-8", due: "2025-04-02", amount: 300.0 }]], ["INV-8", "INV-7"]),
            hiddenCase("dates in different months", [[{ id: "A", due: "2025-12-01", amount: 1 }, { id: "B", due: "2025-02-28", amount: 2 }, { id: "C", due: "2025-11-30", amount: 3 }]], ["B", "C", "A"]),
            hiddenCase("no invoices", [[]], []),
          ], { label: "pay_order() lists invoices by due date" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Today's meeting schedule",
        prompt: "A room-booking screen lists the day's meetings by start time. Two meetings can start at the same time in different rooms; then the room code decides, alphabetically. Write `schedule(meetings)`: return the meeting titles in that order.",
        spec: [
          ["Function", "`schedule(meetings)`"],
          ["meetings", "dictionaries with `title`, `start` (24-hour `\"HH:MM\"` text, always two digits each) and `room`"],
          ["Returns", "the titles, by start time, then by room code"],
          ["Example", "the starter's meetings → `['Stand-up', 'Hiring sync', 'Budget review', 'Design crit']`"],
        ],
        starter: src`
def schedule(meetings):
    return []

meetings = [
    {"title": "Budget review", "start": "10:00", "room": "B2"},
    {"title": "Stand-up", "start": "09:30", "room": "A1"},
    {"title": "Hiring sync", "start": "10:00", "room": "A4"},
    {"title": "Design crit", "start": "13:15", "room": "B2"},
]
print(schedule(meetings))
`,
        answer: src`
def start_then_room(meeting):
    return (meeting["start"], meeting["room"])

def schedule(meetings):
    return [m["title"] for m in sorted(meetings, key=start_then_room)]

meetings = [
    {"title": "Budget review", "start": "10:00", "room": "B2"},
    {"title": "Stand-up", "start": "09:30", "room": "A1"},
    {"title": "Hiring sync", "start": "10:00", "room": "A4"},
    {"title": "Design crit", "start": "13:15", "room": "B2"},
]
print(schedule(meetings))
`,
        alternatives: [
          src`
def by_room(meeting):
    return meeting["room"]

def by_start(meeting):
    return meeting["start"]

def schedule(meetings):
    by_room_first = sorted(meetings, key=by_room)
    ordered = sorted(by_room_first, key=by_start)
    return [m["title"] for m in ordered]
`,
        ],
        wrong: [
          {
            code: src`
def by_start(meeting):
    return meeting["start"]

def schedule(meetings):
    return [m["title"] for m in sorted(meetings, key=by_start)]
`,
            fails: ["returns"],
            why: "meetings at the same time stay in input order instead of room order",
          },
          {
            code: src`
def room_then_start(meeting):
    return (meeting["room"], meeting["start"])

def schedule(meetings):
    return [m["title"] for m in sorted(meetings, key=room_then_start)]
`,
            fails: ["returns"],
            why: "the tuple has the fields the wrong way round, so the room decides first",
          },
        ],
        hints: [
          "Two fields decide the order, and the first one matters most.",
          "A key function that returns a tuple sorts by its first item, then by the second on a tie.",
          "Sort the records, then pull out the titles.",
        ],
        task: {
          checks: [
            fn("returns", "schedule", [
              example([meetings], ["Stand-up", "Hiring sync", "Budget review", "Design crit"]),
              example([[{ title: "1:1", start: "16:00", room: "C3" }]], ["1:1"]),
              example([[]], []),
              hiddenCase("three meetings at the same time", [[{ title: "x", start: "11:00", room: "C1" }, { title: "y", start: "11:00", room: "A9" }, { title: "z", start: "11:00", room: "B5" }]], ["y", "z", "x"]),
              hiddenCase("early and late meetings in reverse order", [[{ title: "late", start: "17:45", room: "A1" }, { title: "early", start: "07:05", room: "B1" }]], ["early", "late"]),
              hiddenCase("the same room at different times", [[{ title: "p", start: "15:00", room: "A1" }, { title: "q", start: "09:00", room: "A1" }, { title: "r", start: "09:00", room: "A0" }]], ["r", "q", "p"]),
            ], { label: "schedule() orders meetings by start time, then room" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Race results with ranks",
        prompt: "A coding race ranks players by points, highest first. Players with equal points are separated by time: fewer seconds is better. Write `results(players)`: return lines like `\"1. Dara (61)\"`, one per player, in finishing order, numbered from 1.",
        spec: [
          ["Function", "`results(players)`"],
          ["players", "dictionaries with `name`, `points` and `seconds` (whole numbers)"],
          ["Returns", "a list of texts `\"rank. name (points)\"`; on equal points, the faster player ranks higher"],
          ["Example", "the starter's players → `['1. Dara (61)', '2. Ben (57)', '3. Chen (42)', '4. Ana (42)']`"],
        ],
        starter: src`
def results(players):
    return []

players = [
    {"name": "Ana", "points": 42, "seconds": 610},
    {"name": "Ben", "points": 57, "seconds": 655},
    {"name": "Chen", "points": 42, "seconds": 598},
    {"name": "Dara", "points": 61, "seconds": 702},
]
print(results(players))
`,
        answer: src`
def race_order(player):
    return (-player["points"], player["seconds"])

def results(players):
    ranked = sorted(players, key=race_order)
    return [f"{rank}. {p['name']} ({p['points']})" for rank, p in enumerate(ranked, start=1)]

players = [
    {"name": "Ana", "points": 42, "seconds": 610},
    {"name": "Ben", "points": 57, "seconds": 655},
    {"name": "Chen", "points": 42, "seconds": 598},
    {"name": "Dara", "points": 61, "seconds": 702},
]
print(results(players))
`,
        alternatives: [
          src`
def seconds_of(player):
    return player["seconds"]

def points_of(player):
    return player["points"]

def results(players):
    fastest_first = sorted(players, key=seconds_of)
    ranked = sorted(fastest_first, key=points_of, reverse=True)
    lines = []
    for i in range(len(ranked)):
        lines.append(str(i + 1) + ". " + ranked[i]["name"] + " (" + str(ranked[i]["points"]) + ")")
    return lines
`,
        ],
        wrong: [
          {
            code: src`
def race_order(player):
    return (player["points"], player["seconds"])

def results(players):
    ranked = sorted(players, key=race_order, reverse=True)
    return [f"{rank}. {p['name']} ({p['points']})" for rank, p in enumerate(ranked, start=1)]
`,
            fails: ["returns"],
            why: "`reverse=True` also reverses the time, so the slower player wins a tie",
          },
          {
            code: src`
def race_order(player):
    return (-player["points"], player["seconds"])

def results(players):
    ranked = sorted(players, key=race_order)
    return [f"{rank}. {p['name']} ({p['points']})" for rank, p in enumerate(ranked)]
`,
            fails: ["returns"],
            why: "`enumerate` starts at 0, so the winner is ranked 0",
          },
          {
            code: src`
def points_of(player):
    return player["points"]

def results(players):
    ranked = sorted(players, key=points_of, reverse=True)
    return [f"{rank}. {p['name']} ({p['points']})" for rank, p in enumerate(ranked, start=1)]
`,
            fails: ["returns"],
            why: "time is ignored, so tied players stay in input order",
          },
        ],
        hints: [
          "Two fields run in opposite directions: points high to low, seconds low to high.",
          "In a tuple key, negating the points makes the highest points sort first while seconds still sort smallest first.",
          "Number the sorted players with `enumerate`, starting at 1, and build each line with an f-string.",
        ],
        task: {
          checks: [
            fn("returns", "results", [
              example([racers], ["1. Dara (61)", "2. Ben (57)", "3. Chen (42)", "4. Ana (42)"]),
              example([[{ name: "Solo", points: 10, seconds: 99 }]], ["1. Solo (10)"]),
              example([[]], []),
              hiddenCase("a tie broken by time", [[{ name: "Slow", points: 30, seconds: 500 }, { name: "Fast", points: 30, seconds: 420 }]], ["1. Fast (30)", "2. Slow (30)"]),
              hiddenCase("players listed lowest first", [[{ name: "C", points: 1, seconds: 5 }, { name: "B", points: 2, seconds: 5 }, { name: "A", points: 3, seconds: 5 }]], ["1. A (3)", "2. B (2)", "3. C (1)"]),
              hiddenCase("equal points and equal time", [[{ name: "First", points: 8, seconds: 60 }, { name: "Second", points: 8, seconds: 60 }]], ["1. First (8)", "2. Second (8)"]),
            ], { label: "results() ranks by points, then by time" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def length(word):
    return len(word)

words = ["fig", "kiwi", "pear", "date"]
print(sorted(words, key=length))
`,
        choices: ["['fig', 'kiwi', 'pear', 'date']", "['fig', 'date', 'kiwi', 'pear']", "['date', 'fig', 'kiwi', 'pear']", "[3, 4, 4, 4]"],
        answer: 0,
        why: "Sorted by length, fig (3) comes first; kiwi, pear and date all have 4 letters and keep their original order because the sort is stable. The words themselves are returned, not the lengths.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `reverse=True` with a tuple key. What does this print?",
        program: src`
def score_then_name(row):
    return (row[1], row[0])

rows = [("Ana", 42), ("Ben", 57), ("Abe", 42)]
ranked = sorted(rows, key=score_then_name, reverse=True)
print([row[0] for row in ranked])
`,
        choices: ["['Ben', 'Ana', 'Abe']", "['Ben', 'Abe', 'Ana']", "['Abe', 'Ana', 'Ben']", "['Ana', 'Abe', 'Ben']"],
        answer: 0,
        why: "`reverse=True` reverses the whole comparison, so on 42 the names also run backwards: Ana before Abe. To keep names A to Z, negate the score instead of reversing.",
      },
      {
        id: "q3",
        prompt: "Which call sorts `flights` by their `delay` field?",
        choices: ["sorted(flights, key=delay_of), where delay_of returns flight[\"delay\"]", "sorted(flights, key=delay_of())", "sorted(flights[\"delay\"])", "sorted(flights)"],
        answer: 0,
        why: "`key` takes the function itself. Calling it with `()` passes its result instead, and the last two either index a list with text or compare dictionaries.",
      },
    ],
    review: [
      "`sorted(items, key=fn)` calls `fn` on each item and orders by the results; pass the function, don't call it.",
      "A tuple key sorts by several fields; negate a number to reverse just that field.",
      "The sort is stable, so equal keys keep their input order, even with `reverse=True`.",
      "Next: `any` and `all`, for yes-or-no questions about a whole collection.",
    ],
  },

  // ------------------------------------------------------------------ PY-L14-03 any and all
  {
    id: "PY-L14-03",
    version: 2,
    slug: "any-and-all",
    title: "Ask about the whole collection with any and all",
    lede: "`any` is True when at least one item passes a test; `all` is True when every item does. Together they replace the flag-and-break loop.",
    focus: "Answer is-there-one and are-they-all questions with any and all over a generator expression, including the empty case.",
    minutes: 15,
    objectives: [
      "Write `any(test for item in items)` and `all(test for item in items)`",
      "Know the empty case: `any([])` is False, `all([])` is True, and guard against it when that would be wrong",
      "Combine `any` inside `all` for questions like *is every skill covered by someone?*",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "comp-if", "dict-literal", "dict-lookup", "string-index", "string-method", "string-check", "len-call", "comparison", "logical", "if-statement", "truthiness", "boolean", "for-loop", "break-statement", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "else-clause", "list-mutate", "nested-dict", "nested-loop", "print-text", "reassignment"],
    teaches: ["any-call", "all-call"],
    blocks: [
      {
        kind: "text",
        md: "*Did any reading drop below freezing? Is every line of this order in stock?* With a loop you set a flag, test each item, and `break` once you know. `any` and `all` do exactly that.\n\nInside the call you can write a comprehension **without square brackets**: `any(t < 0 for t in temps)`. That is a **generator expression**: it produces the test results one at a time, so `any` can stop at the first True, and `all` at the first False, without building a list.",
      },
      {
        kind: "example",
        title: "Freezing, and the empty case",
        code: src`
temps = [6.7, 7.2, -2.1, 3.9]
print(any(t < 0 for t in temps))
print(all(t < 10 for t in temps))
print(any([]), all([]))
`,
        output: "True\nTrue\nFalse True\n",
        note: "With nothing to check, `any` finds no passing item (False) and `all` finds no failing one (True). The second matters: *every line of an empty order is in stock* is True.",
      },
      {
        kind: "text",
        md: "That empty case is a real trap. An order with no lines would pass *every line is in stock* and get shipped as an empty box. Decide what an empty collection should mean, and check for it first.",
      },
      {
        kind: "example",
        title: "Ready to ship?",
        code: src`
def ready_to_ship(order):
    if not order["lines"]:
        return False
    return all(line["qty"] > 0 and line["in_stock"] for line in order["lines"])

full = {"lines": [{"qty": 2, "in_stock": True}, {"qty": 1, "in_stock": True}]}
waiting = {"lines": [{"qty": 2, "in_stock": True}, {"qty": 1, "in_stock": False}]}
empty = {"lines": []}
print(ready_to_ship(full), ready_to_ship(waiting), ready_to_ship(empty))
`,
        output: "True False False\n",
        note: "Without the `if not` guard, the empty order would print True.",
      },
      {
        kind: "text",
        md: "`any` and `all` take **one** collection. Two separate values are a different question, answered with `or` and `and`.",
      },
      {
        kind: "error-example",
        title: "Two arguments to any",
        code: src`
order = {"paid": True, "shipped": False}
print(any(order["paid"], order["shipped"]))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: any() takes exactly one argument (2 given)`. For two values, write `order[\"paid\"] or order[\"shipped\"]`.",
      },
      {
        kind: "text",
        md: "**When to use it:** validation (every field filled, any value negative), checks before an action, and coverage questions. **Mistakes to avoid:** forgetting that `all` of nothing is True; passing several values instead of one collection; and writing `== True` after the call: `any(…)` already is True or False.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Was any flight cancelled?",
      prompt: "`any_cancelled` asks whether **every** flight was cancelled. Change it to report whether **at least one** was.",
      spec: [
        ["Function", "`any_cancelled(flights)`"],
        ["Returns", "True when at least one flight has `cancelled` True"],
      ],
      starter: src`
def any_cancelled(flights):
    return all(f["cancelled"] for f in flights)

flights = [{"flight": "AA2929", "cancelled": True}, {"flight": "DL1270", "cancelled": False}]
print(any_cancelled(flights))
`,
      answer: src`
def any_cancelled(flights):
    return any(f["cancelled"] for f in flights)

flights = [{"flight": "AA2929", "cancelled": True}, {"flight": "DL1270", "cancelled": False}]
print(any_cancelled(flights))
`,
      wrong: [
        {
          code: src`
def any_cancelled(flights):
    return True
`,
          fails: ["returns"],
          why: "it always says yes, whatever the flights",
        },
      ],
      hints: ["Only one word needs to change.", "*At least one* is `any`; *every* is `all`.", "Swap the function name; the generator expression stays."],
      task: {
        checks: [
          fn("returns", "any_cancelled", [
            example([[{ flight: "AA2929", cancelled: true }, { flight: "DL1270", cancelled: false }]], true),
            hiddenCase("no cancelled flights", [[{ flight: "UA1", cancelled: false }]], false),
            hiddenCase("no flights", [[]], false),
          ], { label: "any_cancelled() reports whether one flight was cancelled" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Password policy check",
        prompt: "A sign-up form enforces a password policy. Write `meets_policy(password)`: return True only when the password is at least 12 characters long, contains at least one digit, at least one capital letter and at least one lower-case letter, and contains no spaces.",
        spec: [
          ["Function", "`meets_policy(password)`"],
          ["Character tests", "`ch.isdigit()` (see String Algorithms); `ch.isupper()` and `ch.islower()` are True for a capital and a lower-case letter"],
          ["Returns", "True or False"],
          ["Example", "`meets_policy(\"Summer2025Trip\")` → True; `meets_policy(\"summer2025trip\")` → False (no capital)"],
        ],
        starter: src`
def meets_policy(password):
    return False

print(meets_policy("Summer2025Trip"))
print(meets_policy("summer2025trip"))
`,
        answer: src`
def meets_policy(password):
    long_enough = len(password) >= 12
    has_digit = any(ch.isdigit() for ch in password)
    has_upper = any(ch.isupper() for ch in password)
    has_lower = any(ch.islower() for ch in password)
    no_spaces = all(ch != " " for ch in password)
    return long_enough and has_digit and has_upper and has_lower and no_spaces

print(meets_policy("Summer2025Trip"))
print(meets_policy("summer2025trip"))
`,
        alternatives: [
          src`
def meets_policy(password):
    if len(password) < 12 or " " in password:
        return False
    return any(c.isdigit() for c in password) and any(c.isupper() for c in password) and any(c.islower() for c in password)
`,
        ],
        wrong: [
          {
            code: src`
def meets_policy(password):
    return len(password) >= 12 and all(ch.isdigit() for ch in password) and any(ch.isupper() for ch in password)
`,
            fails: ["returns"],
            why: "`all` demands that every character is a digit, which no valid password can meet",
          },
          {
            code: src`
def meets_policy(password):
    return len(password) > 12 and any(c.isdigit() for c in password) and any(c.isupper() for c in password) and any(c.islower() for c in password) and " " not in password
`,
            fails: ["returns"],
            why: "`>` rejects a password of exactly 12 characters",
          },
          {
            code: src`
def meets_policy(password):
    return len(password) >= 12 and any(c.isdigit() for c in password) and any(c.isupper() for c in password) and any(c.islower() for c in password)
`,
            fails: ["returns"],
            why: "a password with a space in it is accepted",
          },
        ],
        hints: [
          "Each rule is its own yes-or-no question; the password passes when all of them are yes.",
          "*At least one digit* is `any` over the characters. *No spaces* is `all` characters not being a space, or a plain `in` test.",
          "*At least 12* includes 12 itself.",
        ],
        task: {
          checks: [
            fn("returns", "meets_policy", [
              example(["Summer2025Trip"], true),
              example(["summer2025trip"], false),
              example(["Short1a"], false),
              hiddenCase("exactly twelve characters", ["Abcdefghij12"], true),
              hiddenCase("no digit", ["NoDigitsHereAtAll"], false),
              hiddenCase("no lower-case letter", ["ALLCAPS123456"], false),
              hiddenCase("a space inside", ["Long Pass 2025x"], false),
              hiddenCase("an empty password", [""], false),
            ], { label: "meets_policy() applies every rule" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Can this team cover the shift?",
        prompt: "A warehouse shift needs certain skills on site: a forklift driver, a first-aider, and so on. Write `can_cover(staff, required)`: return True when **every** required skill is held by **at least one available** person. A shift that requires nothing can always be covered.",
        spec: [
          ["Function", "`can_cover(staff, required)`"],
          ["staff", "dictionaries with `name`, `skills` (a list of texts) and `available` (True or False)"],
          ["required", "a list of skill names"],
          ["Returns", "True or False; unavailable people don't count"],
          ["Example", "the starter's team with `[\"forklift\", \"first aid\"]` → True; with `[\"till\", \"driving\"]` → False"],
        ],
        starter: src`
def can_cover(staff, required):
    return False

team = [
    {"name": "Ana", "skills": ["forklift", "first aid"], "available": True},
    {"name": "Ben", "skills": ["forklift"], "available": False},
    {"name": "Chen", "skills": ["till", "first aid"], "available": True},
]
print(can_cover(team, ["forklift", "first aid"]))
print(can_cover(team, ["till", "driving"]))
`,
        answer: src`
def can_cover(staff, required):
    on_site = [person for person in staff if person["available"]]
    return all(any(skill in person["skills"] for person in on_site) for skill in required)

team = [
    {"name": "Ana", "skills": ["forklift", "first aid"], "available": True},
    {"name": "Ben", "skills": ["forklift"], "available": False},
    {"name": "Chen", "skills": ["till", "first aid"], "available": True},
]
print(can_cover(team, ["forklift", "first aid"]))
print(can_cover(team, ["till", "driving"]))
`,
        alternatives: [
          src`
def can_cover(staff, required):
    for skill in required:
        covered = False
        for person in staff:
            if person["available"] and skill in person["skills"]:
                covered = True
                break
        if not covered:
            return False
    return True
`,
        ],
        wrong: [
          {
            code: src`
def can_cover(staff, required):
    return all(any(skill in p["skills"] for p in staff) for skill in required)
`,
            fails: ["returns"],
            why: "unavailable people are counted, so a skill only Ben has looks covered",
          },
          {
            code: src`
def can_cover(staff, required):
    on_site = [p for p in staff if p["available"]]
    return any(all(skill in p["skills"] for p in on_site) for skill in required)
`,
            fails: ["returns"],
            why: "`any` and `all` are swapped: it asks whether some skill is held by everyone",
          },
          {
            code: src`
def can_cover(staff, required):
    on_site = [p for p in staff if p["available"]]
    if not required:
        return False
    return all(any(skill in p["skills"] for p in on_site) for skill in required)
`,
            fails: ["returns"],
            why: "a shift that needs no skills is reported as impossible",
          },
        ],
        hints: [
          "Read the rule out loud: for **all** required skills, **any** available person has it.",
          "First keep only the available people; then nest an `any` inside an `all`.",
          "`all` of an empty list is already True, which is what *requires nothing* should give.",
        ],
        task: {
          checks: [
            fn("returns", "can_cover", [
              example([team, ["forklift", "first aid"]], true),
              example([team, ["till", "driving"]], false),
              example([team, []], true),
              hiddenCase("a skill only an unavailable person has", [[{ name: "X", skills: ["crane"], available: false }, { name: "Y", skills: ["till"], available: true }], ["crane"]], false),
              hiddenCase("one person covering every skill", [[{ name: "Z", skills: ["a", "b", "c"], available: true }], ["c", "a"]], true),
              hiddenCase("nobody available", [[{ name: "Q", skills: ["a"], available: false }], ["a"]], false),
              hiddenCase("no staff and nothing required", [[], []], true),
            ], { label: "can_cover() checks every skill against available staff" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
scores = [72, 58, 91]
print(all(s >= 60 for s in scores), any(s >= 90 for s in scores))
`,
        choices: ["False True", "True True", "False False", "True False"],
        answer: 0,
        why: "58 fails *at least 60*, so `all` is False. 91 passes *at least 90*, so `any` is True.",
      },
      {
        id: "q2",
        prompt: "A common mistake: checking an empty list. What does this print?",
        program: src`
lines = []
print(all(line["in_stock"] for line in lines))
`,
        choices: ["True", "False", "KeyError", "None"],
        answer: 0,
        why: "There is no line that fails, so `all` is True, and the generator never even reads a line. Guard against the empty case when True would be the wrong answer.",
      },
      {
        id: "q3",
        prompt: "Which question is `any` built for?",
        choices: ["Did any temperature reading fall below 0?", "What was the lowest temperature?", "How many readings were below 0?", "Which readings were below 0?"],
        answer: 0,
        why: "`any` answers yes or no. The lowest value is `min`, the count is a sum or a filtered list's length, and *which* is a filter.",
      },
    ],
    review: [
      "`any(test for x in xs)`: at least one passes. `all(...)`: every one passes. Both stop as soon as the answer is known.",
      "`any([])` is False and `all([])` is True; guard the empty case when that is wrong for your problem.",
      "Nest them for coverage questions: `all(any(...) for ...)`.",
      "Next: `map` and `filter`, and when a comprehension says the same thing more clearly.",
    ],
  },

  // ------------------------------------------------------------------ PY-L14-04 map and filter
  {
    id: "PY-L14-04",
    version: 2,
    slug: "map-and-filter",
    title: "map and filter, or a comprehension?",
    lede: "`map` applies a function to every item and `filter` keeps the items a function accepts. They shine when the function already exists; otherwise a comprehension usually reads better.",
    focus: "Use map and filter with existing functions, remember they are one-pass iterators, and choose between them and a comprehension.",
    minutes: 15,
    objectives: [
      "Apply an existing function to every item with `list(map(func, items))`",
      "Keep items with `list(filter(func, items))`, including `filter(None, …)` to drop empty values",
      "Know that a `map` or `filter` object can be walked only once, and has no positions",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-comp", "comp-if", "dict-literal", "dict-lookup", "string-index", "string-method", "string-check", "conversion", "len-call", "comparison", "logical", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "list-mutate", "print-text", "spaces-in-text", "nested-loop", "none-value"],
    teaches: ["map-call", "filter-call"],
    blocks: [
      {
        kind: "text",
        md: "Functions are values: you passed one to `sorted` as a key. `map(func, items)` calls `func` on every item; `filter(func, items)` keeps the items for which `func` returns something true. Both hand back a lazy **iterator** that produces values only when asked, so wrap it in `list(...)` to get a list.\n\nThey read best when the function already exists: a built-in like `float`, a method like `str.upper`, or a function you wrote and named.",
      },
      {
        kind: "example",
        title: "Convert a column, tidy some codes",
        code: src`
cells = ["7.49", " 31", "171.99 "]
prices = list(map(float, cells))
print(prices)
codes = list(map(str.upper, ["las", "iah", "mci"]))
print(codes)
`,
        output: "[7.49, 31.0, 171.99]\n['LAS', 'IAH', 'MCI']\n",
        note: "`float` and `str.upper` are passed without brackets, exactly like a sort key. `float` accepts the spaces around the digits.",
      },
      {
        kind: "text",
        md: "`filter` needs a function that answers yes or no. A named function documents the rule in one place, and the filter line reads like a sentence. One catch: the iterator is used up as it is walked. A second `list(...)` of the same object is empty.",
      },
      {
        kind: "example",
        title: "Valid airport codes, walked twice",
        code: src`
def is_airport_code(code):
    return len(code) == 3 and code.isalpha() and code.isupper()

entries = ["LAS", "iah", "MCI", "DFW1", "BOS"]
valid = filter(is_airport_code, entries)
print(list(valid))
print(list(valid))
`,
        output: "['LAS', 'MCI', 'BOS']\n[]\n",
        note: "`isupper` is True when every letter is a capital. The second `list(valid)` is empty because the filter object was already used up. Store `list(...)` in a variable if you need the values twice.",
      },
      {
        kind: "error-example",
        title: "A map object has no positions",
        code: src`
prices = map(float, ["7.49", "31"])
print(prices[0])
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: 'map' object is not subscriptable`. Turn it into a list first if you need positions.",
      },
      {
        kind: "text",
        md: "`filter(None, items)` keeps the items that are truthy themselves, which is a quick way to drop empty texts and zeros.\n\n**Which to choose:** if you would have to write a new one-off function just to call `map` or `filter`, a comprehension says it more directly: `[p * 1.2 for p in prices]` beats defining `add_tax` for one use. If the function already exists, `map(float, cells)` is short and clear. **Mistakes to avoid:** printing a `map` object (you see `<map object at …>`, not values), indexing it, and walking it twice.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Quantities as numbers",
      prompt: "`quantities` maps each cell through `str.strip`, so the result is still text. Map the cells through `int` instead, so they become whole numbers.",
      spec: [
        ["Function", "`quantities(cells)`"],
        ["Returns", "a list of `int`s, one per cell"],
      ],
      starter: src`
def quantities(cells):
    return list(map(str.strip, cells))

print(quantities(["28", " 30", "6 "]))
`,
      answer: src`
def quantities(cells):
    return list(map(int, cells))

print(quantities(["28", " 30", "6 "]))
`,
      wrong: [
        {
          code: src`
def quantities(cells):
    return [28, 30, 6]
`,
          fails: ["returns"],
          why: "the numbers are typed in instead of converted",
        },
      ],
      hints: ["Only the function passed to `map` changes.", "`int` turns digit text into a whole number.", "Pass `int` without brackets; `int` already ignores spaces at the ends."],
      task: {
        checks: [
          fn("returns", "quantities", [
            example([["28", " 30", "6 "]], [28, 30, 6]),
            hiddenCase("a negative quantity", [["-1", "4"]], [-1, 4]),
            hiddenCase("no cells", [[]], []),
          ], { label: "quantities() turns every cell into a whole number" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A numeric column with gaps",
        prompt: "A column of precipitation readings came out of a spreadsheet as text, and days with no reading are empty cells (sometimes only spaces). Write `readings(cells)`: drop the empty cells and return the others as floats, in order.",
        spec: [
          ["Function", "`readings(cells)`"],
          ["cells", "a list of texts: numbers such as `\"2.5\"` or `\" 0\"`, or blank cells"],
          ["Returns", "a list of floats for the non-blank cells; a real `\"0\"` reading is kept as `0.0`"],
          ["Example", "`readings([\"2.5\", \"\", \" 0\", \"  \", \"61\"])` → `[2.5, 0.0, 61.0]`"],
        ],
        starter: src`
def readings(cells):
    return []

print(readings(["2.5", "", " 0", "  ", "61"]))
`,
        answer: src`
def readings(cells):
    filled = filter(str.strip, cells)
    return list(map(float, filled))

print(readings(["2.5", "", " 0", "  ", "61"]))
`,
        alternatives: [
          src`
def readings(cells):
    return [float(cell) for cell in cells if cell.strip() != ""]
`,
        ],
        wrong: [
          {
            code: src`
def readings(cells):
    return list(map(float, filter(None, cells)))
`,
            fails: ["returns"],
            why: "a cell of only spaces is truthy, so it reaches `float` and raises ValueError",
          },
          {
            code: src`
def readings(cells):
    return list(map(float, filter(None, map(float, filter(str.strip, cells)))))
`,
            fails: ["returns"],
            why: "filtering after converting also drops real readings of 0.0",
          },
        ],
        hints: [
          "Two steps in order: drop the blank cells, then convert the rest.",
          "`str.strip` returns an empty (falsy) text for a blank cell and a non-empty one otherwise, so it can be the yes-or-no function for `filter`.",
          "Filter on the text, not on the number, or a reading of 0 disappears too.",
        ],
        task: {
          checks: [
            fn("returns", "readings", [
              example([["2.5", "", " 0", "  ", "61"]], [2.5, py.float(0), py.float(61)]),
              example([["7"]], [py.float(7)]),
              example([[]], []),
              hiddenCase("every cell blank", [["", " ", "   "]], []),
              hiddenCase("several zero readings", [["0", "0.0", ""]], [py.float(0), py.float(0)]),
              hiddenCase("negative values", [["-1.5", " ", "-3"]], [-1.5, py.float(-3)]),
            ], { label: "readings() drops blanks and converts the rest" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A cleaning pipeline",
        prompt: "A data-cleaning tool lets people choose cleaning steps from a menu, such as strip, lower-case, or remove hyphens, each one a function that takes a text and returns a new text. Write `apply_pipeline(values, steps)`: apply every step, in order, to every value, and return the cleaned values. With no steps, return the values unchanged (as a new list).",
        spec: [
          ["Function", "`apply_pipeline(values, steps)`"],
          ["values", "a list of values"],
          ["steps", "a list of functions, each taking one value and returning one value (e.g. `str.strip`, `str.lower`)"],
          ["Returns", "a new list: each value after all steps, first step first"],
          ["Example", "`apply_pipeline([\" LAS\", \"iah \"], [str.strip, str.lower])` → `['las', 'iah']`"],
        ],
        starter: src`
def apply_pipeline(values, steps):
    return values

print(apply_pipeline([" LAS", "iah "], [str.strip, str.lower]))
`,
        answer: src`
def apply_pipeline(values, steps):
    result = list(values)
    for step in steps:
        result = list(map(step, result))
    return result

print(apply_pipeline([" LAS", "iah "], [str.strip, str.lower]))
`,
        alternatives: [
          src`
def apply_pipeline(values, steps):
    cleaned = []
    for value in values:
        for step in steps:
            value = step(value)
        cleaned.append(value)
    return cleaned
`,
        ],
        wrong: [
          {
            code: src`
def apply_pipeline(values, steps):
    result = list(values)
    for step in steps:
        result = list(map(step, values))
    return result
`,
            fails: ["two-steps", "order"],
            why: "each step starts again from the original values, so only the last step has any effect",
          },
          {
            code: src`
def apply_pipeline(values, steps):
    result = values
    for step in steps:
        result = map(step, result)
    return result
`,
            fails: ["two-steps", "order", "empty"],
            why: "it returns a map object instead of a list",
          },
        ],
        hints: [
          "A step is a function, so `step(value)` or `map(step, …)` applies it.",
          "Each step must work on the output of the step before it, so keep updating one variable.",
          "Convert to a list at each step, so the final answer is a list and nothing is left half-used.",
        ],
        task: {
          checks: [
            pipe("two-steps", "apply_pipeline() applies both steps", 'apply_pipeline([" LAS", "iah "], [str.strip, str.lower])', ["las", "iah"]),
            pipe("no-steps", "apply_pipeline() with no steps returns the values as a list", "apply_pipeline(['a', 'b'], [])", ["a", "b"], true),
            pipe("order", "apply_pipeline() applies the steps in order", "apply_pipeline(['  7 ', 'ab'], [str.strip, len])", [1, 2], true),
            pipe("empty", "apply_pipeline() with no values returns an empty list", "apply_pipeline([], [str.upper])", [], true),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
codes = ["las", "", "mci", ""]
print(list(filter(None, codes)), list(map(len, codes)))
`,
        choices: ["['las', 'mci'] [3, 0, 3, 0]", "['las', '', 'mci', ''] [3, 3]", "['las', 'mci'] [3, 3]", "[] [3, 0, 3, 0]"],
        answer: 0,
        why: "`filter(None, …)` drops falsy values such as empty texts. `map(len, …)` keeps one result per item, including the zeros.",
      },
      {
        id: "q2",
        prompt: "A common mistake: walking a map object twice. What does this print?",
        program: src`
upper = map(str.upper, ["las", "iah"])
print(list(upper))
print(len(list(upper)))
`,
        choices: ["['LAS', 'IAH']\n0", "['LAS', 'IAH']\n2", "['LAS', 'IAH']\n['LAS', 'IAH']", "TypeError"],
        answer: 0,
        why: "The first `list` uses up the iterator, so the second one is empty and its length is 0.",
      },
      {
        id: "q3",
        prompt: "You need every price with 20% tax added. Which is the clearest?",
        choices: ["[p * 1.2 for p in prices]", "list(map(add_tax, prices)), after writing a def add_tax used nowhere else", "list(filter(add_tax, prices))", "map(prices, add_tax)"],
        answer: 0,
        why: "There is no ready-made function for this, so the comprehension states the expression directly. `filter` would keep items rather than change them, and `map` takes the function first.",
      },
    ],
    review: [
      "`list(map(func, items))` applies an existing function to every item; `list(filter(func, items))` keeps the accepted ones.",
      "They return one-pass iterators: no positions, and empty the second time.",
      "Write a comprehension when you would otherwise invent a one-off function just to pass it.",
      "Next: `sum`, `min` and `max`, with a key for records and a default for empty inputs.",
    ],
  },

  // ------------------------------------------------------------------ PY-L14-05 sum, min, max
  {
    id: "PY-L14-05",
    version: 2,
    slug: "sum-min-max",
    title: "Totals and extremes with sum, min and max",
    lede: "`sum` adds a collection up; `min` and `max` find its extremes. With `key` they return the whole winning record, and with `default` they survive an empty input.",
    focus: "Reduce a collection to one value with sum, min and max, using key= to compare records and default= for empty inputs.",
    minutes: 16,
    objectives: [
      "Total a field with `sum(x[\"field\"] for x in items)`",
      "Find the record with the smallest or largest field using `min(items, key=…)` and `max(items, key=…)`",
      "Handle an empty input with `default=` instead of letting ValueError stop the program",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "comp-if", "dict-literal", "dict-lookup", "string-index", "arithmetic", "comparison", "logical", "none-value", "identity", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "sort-key", "tuple-literal", "print-text", "else-clause", "conditional-expr", "len-call", "continue-statement", "reassignment"],
    teaches: ["aggregate-call"],
    blocks: [
      {
        kind: "text",
        md: "Totals and extremes are the most common questions in reporting: the invoice subtotal, the cheapest product, the fastest lap. `sum`, `min` and `max` each take a collection, often a generator expression, and return one value.",
      },
      {
        kind: "example",
        title: "An invoice summary",
        code: src`
lines = [
    {"sku": "SPO-11681", "qty": 2, "price": 7.5},
    {"sku": "HOM-22847", "qty": 1, "price": 31.0},
    {"sku": "ELE-24781", "qty": 1, "price": 171.25},
]
units = sum(line["qty"] for line in lines)
subtotal = sum(line["qty"] * line["price"] for line in lines)
print(units, subtotal)
print(min(line["price"] for line in lines), max(line["price"] for line in lines))
`,
        output: "4 217.25\n7.5 171.25\n",
        note: "Each call walks the lines once. `min` and `max` here return a price, not the line it came from.",
      },
      {
        kind: "text",
        md: "`min` and `max` of nothing has no answer, so Python stops with an error rather than inventing one.",
      },
      {
        kind: "error-example",
        title: "The largest of nothing",
        code: src`
delays = []
print(max(delays))
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: max() iterable argument is empty`. `sum([])` is fine: it is 0.",
      },
      {
        kind: "text",
        md: "To get the **record** rather than the number, pass the records and a `key`, exactly as with `sorted`. On a tie, the first record wins. `default=` is returned when the input is empty, which turns *no data* into a value you can test, such as `None`.",
      },
      {
        kind: "example",
        title: "Fastest lap, slowest driver, no laps",
        code: src`
def lap_seconds(lap):
    return lap["seconds"]

laps = [
    {"driver": "Ana", "seconds": 92.4},
    {"driver": "Ben", "seconds": 91.8},
    {"driver": "Chen", "seconds": 91.8},
]
best = min(laps, key=lap_seconds)
print(best["driver"], best["seconds"])
print(max(laps, key=lap_seconds)["driver"])
print(min([], key=lap_seconds, default=None))
`,
        output: "Ben 91.8\nAna\nNone\n",
        note: "Ben and Chen tie, and Ben comes first in the list, so Ben is returned. The empty call returns the default instead of raising ValueError.",
      },
      {
        kind: "text",
        md: "**When to use it:** any total, smallest or largest. **Mistakes to avoid:** expecting `max(x[\"price\"] for x in items)` to give you the product (it gives the price; use `key` for the product); `min`/`max` on something that may be empty without `default`; and `sum` of texts, which raises TypeError. A tuple key settles ties on purpose: `min(routes, key=minutes_then_price)`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The slowest lap",
      prompt: "`slowest` returns the driver with the fastest lap. Change it so it returns the driver with the **slowest** lap.",
      spec: [
        ["Function", "`slowest(laps)`"],
        ["Returns", "the `driver` of the lap with the most seconds"],
      ],
      starter: src`
def lap_seconds(lap):
    return lap["seconds"]

def slowest(laps):
    return min(laps, key=lap_seconds)["driver"]

print(slowest([{"driver": "Ana", "seconds": 92.4}, {"driver": "Ben", "seconds": 91.8}]))
`,
      answer: src`
def lap_seconds(lap):
    return lap["seconds"]

def slowest(laps):
    return max(laps, key=lap_seconds)["driver"]

print(slowest([{"driver": "Ana", "seconds": 92.4}, {"driver": "Ben", "seconds": 91.8}]))
`,
      wrong: [
        {
          code: src`
def slowest(laps):
    return "Ana"
`,
          fails: ["returns"],
          why: "the driver is typed in instead of found",
        },
      ],
      hints: ["The key function stays the same.", "Slowest means the largest number of seconds.", "Swap `min` for `max`."],
      task: {
        checks: [
          fn("returns", "slowest", [
            example([[{ driver: "Ana", seconds: 92.4 }, { driver: "Ben", seconds: 91.8 }]], "Ana"),
            hiddenCase("the slowest lap last", [[{ driver: "X", seconds: 80 }, { driver: "Y", seconds: 99.9 }]], "Y"),
            hiddenCase("a single lap", [[{ driver: "Solo", seconds: 101 }]], "Solo"),
          ], { label: "slowest() finds the driver with the most seconds" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Invoice summary",
        prompt: "An invoice page shows three numbers at the top. Write `invoice_summary(lines)`: return a dictionary with `\"units\"` (the total quantity), `\"subtotal\"` (the total of quantity × price) and `\"largest\"` (the SKU of the line with the biggest quantity × price, or `None` when there are no lines).",
        spec: [
          ["Function", "`invoice_summary(lines)`"],
          ["lines", "dictionaries with `sku`, `qty` and `price`"],
          ["Returns", "`{\"units\": …, \"subtotal\": …, \"largest\": …}`; for no lines `{\"units\": 0, \"subtotal\": 0, \"largest\": None}`"],
          ["Ties", "when two lines have the same total, the earlier line is the largest"],
          ["Example", "the starter's lines → `{'units': 4, 'subtotal': 217.25, 'largest': 'ELE-24781'}`"],
        ],
        starter: src`
def invoice_summary(lines):
    return {}

lines = [
    {"sku": "SPO-11681", "qty": 2, "price": 7.5},
    {"sku": "HOM-22847", "qty": 1, "price": 31.0},
    {"sku": "ELE-24781", "qty": 1, "price": 171.25},
]
print(invoice_summary(lines))
`,
        answer: src`
def line_total(line):
    return line["qty"] * line["price"]

def invoice_summary(lines):
    biggest = max(lines, key=line_total, default=None)
    return {
        "units": sum(line["qty"] for line in lines),
        "subtotal": sum(line_total(line) for line in lines),
        "largest": biggest["sku"] if biggest is not None else None,
    }

lines = [
    {"sku": "SPO-11681", "qty": 2, "price": 7.5},
    {"sku": "HOM-22847", "qty": 1, "price": 31.0},
    {"sku": "ELE-24781", "qty": 1, "price": 171.25},
]
print(invoice_summary(lines))
`,
        alternatives: [
          src`
def invoice_summary(lines):
    units = 0
    subtotal = 0
    largest = None
    best = 0
    for line in lines:
        amount = line["qty"] * line["price"]
        units += line["qty"]
        subtotal += amount
        if largest is None or amount > best:
            largest = line["sku"]
            best = amount
    return {"units": units, "subtotal": subtotal, "largest": largest}
`,
        ],
        wrong: [
          {
            code: src`
def line_total(line):
    return line["qty"] * line["price"]

def invoice_summary(lines):
    return {
        "units": sum(line["qty"] for line in lines),
        "subtotal": sum(line_total(line) for line in lines),
        "largest": max(lines, key=line_total)["sku"],
    }
`,
            fails: ["returns"],
            why: "an empty invoice makes `max` raise ValueError instead of giving None",
          },
          {
            code: src`
def price_of(line):
    return line["price"]

def invoice_summary(lines):
    biggest = max(lines, key=price_of, default=None)
    return {
        "units": sum(line["qty"] for line in lines),
        "subtotal": sum(line["qty"] * line["price"] for line in lines),
        "largest": biggest["sku"] if biggest is not None else None,
    }
`,
            fails: ["returns"],
            why: "the largest line is judged by unit price, ignoring the quantity",
          },
          {
            code: src`
def line_total(line):
    return line["qty"] * line["price"]

def invoice_summary(lines):
    biggest = max(lines, key=line_total, default=None)
    return {
        "units": len(lines),
        "subtotal": sum(line_total(line) for line in lines),
        "largest": biggest["sku"] if biggest is not None else None,
    }
`,
            fails: ["returns"],
            why: "`len(lines)` counts lines, not units: a line of 2 counts once",
          },
        ],
        hints: [
          "Three separate reductions: two sums and one `max`.",
          "The largest line is a record chosen by its quantity × price, so `max` needs a key function that computes that.",
          "With no lines, `max` needs `default=`, and you can only read `[\"sku\"]` when it found a line.",
        ],
        task: {
          checks: [
            fn("returns", "invoice_summary", [
              example([invoiceLines], { units: 4, subtotal: 217.25, largest: "ELE-24781" }),
              example([[{ sku: "TOY-1", qty: 3, price: 2 }]], { units: 3, subtotal: 6, largest: "TOY-1" }),
              example([[]], { units: 0, subtotal: 0, largest: null }),
              hiddenCase("many cheap items beat one expensive item", [[{ sku: "A", qty: 1, price: 50 }, { sku: "B", qty: 40, price: 1.5 }]], { units: 41, subtotal: 110, largest: "B" }),
              hiddenCase("two lines with the same total", [[{ sku: "P", qty: 2, price: 5 }, { sku: "Q", qty: 1, price: 10 }]], { units: 3, subtotal: 20, largest: "P" }),
              hiddenCase("a free line", [[{ sku: "GIFT", qty: 1, price: 0 }]], { units: 1, subtotal: 0, largest: "GIFT" }),
            ], { label: "invoice_summary() totals the invoice and finds the largest line", compare: { numbers: "int-float-equal" } }),
          ],
        },
      },
      {
        id: "c2",
        title: "The fastest route within budget",
        prompt: "A travel app shows the fastest route a traveller can afford. Write `fastest_affordable(routes, budget)`: among routes whose price is at most `budget`, return the **name** of the one with the fewest minutes. If two are equally fast, the cheaper wins. If none is affordable, return `None`.",
        spec: [
          ["Function", "`fastest_affordable(routes, budget)`"],
          ["routes", "dictionaries with `name`, `minutes` and `price`"],
          ["Returns", "a route name, or `None`; equal minutes and equal price → the earlier route"],
          ["Example", "the starter's routes with budget 40 → `'Direct'` (95 minutes for 36)"],
        ],
        starter: src`
def fastest_affordable(routes, budget):
    return None

routes = [
    {"name": "Express", "minutes": 95, "price": 42},
    {"name": "Saver", "minutes": 140, "price": 18},
    {"name": "Direct", "minutes": 95, "price": 36},
    {"name": "Night", "minutes": 300, "price": 12},
]
print(fastest_affordable(routes, 40))
print(fastest_affordable(routes, 10))
`,
        answer: src`
def minutes_then_price(route):
    return (route["minutes"], route["price"])

def fastest_affordable(routes, budget):
    affordable = [r for r in routes if r["price"] <= budget]
    best = min(affordable, key=minutes_then_price, default=None)
    return best["name"] if best is not None else None

routes = [
    {"name": "Express", "minutes": 95, "price": 42},
    {"name": "Saver", "minutes": 140, "price": 18},
    {"name": "Direct", "minutes": 95, "price": 36},
    {"name": "Night", "minutes": 300, "price": 12},
]
print(fastest_affordable(routes, 40))
print(fastest_affordable(routes, 10))
`,
        alternatives: [
          src`
def fastest_affordable(routes, budget):
    best = None
    for route in routes:
        if route["price"] > budget:
            continue
        if best is None or (route["minutes"], route["price"]) < (best["minutes"], best["price"]):
            best = route
    if best is None:
        return None
    return best["name"]
`,
        ],
        wrong: [
          {
            code: src`
def minutes_of(route):
    return route["minutes"]

def fastest_affordable(routes, budget):
    best = min(routes, key=minutes_of)
    return best["name"]
`,
            fails: ["returns"],
            why: "the budget is ignored, so an unaffordable route can win",
          },
          {
            code: src`
def minutes_of(route):
    return route["minutes"]

def fastest_affordable(routes, budget):
    affordable = [r for r in routes if r["price"] <= budget]
    best = min(affordable, key=minutes_of, default=None)
    return best["name"] if best is not None else None
`,
            fails: ["returns"],
            why: "on equal minutes the first route wins even when a later one is cheaper",
          },
          {
            code: src`
def minutes_then_price(route):
    return (route["minutes"], route["price"])

def fastest_affordable(routes, budget):
    affordable = [r for r in routes if r["price"] < budget]
    best = min(affordable, key=minutes_then_price, default=None)
    return best["name"] if best is not None else None
`,
            fails: ["returns"],
            why: "`<` excludes a route priced exactly at the budget",
          },
        ],
        hints: [
          "First narrow the routes to the affordable ones, then pick the best of those.",
          "The best route has the fewest minutes and, on a tie, the lowest price: a tuple key for `min`.",
          "`default=None` covers the case where nothing is affordable.",
        ],
        task: {
          checks: [
            fn("returns", "fastest_affordable", [
              example([routes, 40], "Direct"),
              example([routes, 10], null),
              example([routes, 1000], "Direct"),
              hiddenCase("a route priced exactly at the budget", [[{ name: "A", minutes: 60, price: 25 }, { name: "B", minutes: 90, price: 10 }], 25], "A"),
              hiddenCase("no routes", [[], 50], null),
              hiddenCase("equally fast and equally priced", [[{ name: "First", minutes: 30, price: 9 }, { name: "Second", minutes: 30, price: 9 }], 9], "First"),
              hiddenCase("only the slow route is affordable", [[{ name: "Jet", minutes: 45, price: 300 }, { name: "Bus", minutes: 420, price: 30 }], 50], "Bus"),
            ], { label: "fastest_affordable() picks the fastest route within budget" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
temps = [6.7, -2.1, 3.9]
print(min(temps), max(temps), sum([]))
`,
        choices: ["-2.1 6.7 0", "6.7 -2.1 0", "-2.1 6.7 None", "ValueError"],
        answer: 0,
        why: "`min` and `max` return the extreme values; `sum` of an empty list is 0. Only `min`/`max` of an empty list raise ValueError.",
      },
      {
        id: "q2",
        prompt: "A common mistake: wanting the product but getting a number. What does this print?",
        program: src`
products = [{"name": "Vase", "price": 31.0}, {"name": "Light", "price": 7.5}]
print(max(p["price"] for p in products))
`,
        choices: ["31.0", "Vase", "{'name': 'Vase', 'price': 31.0}", "7.5"],
        answer: 0,
        why: "`max` of the prices returns a price. To get the product, pass the products and a key: `max(products, key=price_of)`.",
      },
      {
        id: "q3",
        prompt: "You want the earliest flight of the day, but the list might be empty. Which call fits?",
        choices: ["min(flights, key=departure_of, default=None)", "min(flights)", "max(flights, key=departure_of)", "sum(flights, key=departure_of)"],
        answer: 0,
        why: "`key` compares by departure time and returns the flight; `default` handles the empty day. `min(flights)` would compare dictionaries.",
      },
    ],
    review: [
      "`sum(...)` totals; `min`/`max` return the extreme value, or the extreme record with `key=`.",
      "On a tie, `min` and `max` return the first item; a tuple key settles ties on purpose.",
      "`min`/`max` of nothing raise ValueError unless you pass `default=`.",
      "Next module: functions that take any number of arguments, keyword-only options, small inline functions, closures and recursion.",
    ],
  },
];
