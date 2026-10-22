/**
 * M32 Iterators & Generators: five lessons (PY-L32-01 … PY-L32-05).
 *
 * The iterator protocol by hand (iter, next, StopIteration, a class with __iter__/__next__), generator functions,
 * yield from for chaining and recursion, lazy pipelines (generator expressions, islice, takewhile, any), then what
 * laziness saves (peak memory measured with tracemalloc) and costs (a generator can be consumed once).
 * Fixtures are NYC taxi trips (D06), GitHub-style repository events (D11) and NOAA readings (D07).
 *
 * Laziness is graded, not just described: checks feed the learner's code from a counting iterator and compare how
 * many items were pulled, and memory checks compare tracemalloc peaks, which differ by orders of magnitude between a
 * streaming and a list-building solution (measured: 256 B against 4.6 MB for 200,000 squares).
 * Version 2: rewritten from "print a SKU" exercises; saved progress from version 1 doesn't count.
 */
import type { PyLesson } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const pyLit = (s: string) => JSON.stringify(s);

/** A counting iterator for checks: `_Feed(items)` hands out items one by one and records how many were pulled. */
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

/** Python lines that write a JSONL file of `n` events with a repeating pattern of types. */
const eventsFile = (path: string, n: number) =>
  [
    "import json as _js",
    `with open(${pyLit(path)}, "w", encoding="utf-8") as _f:`,
    `    for _i in range(${n}):`,
    "        _t = ['PushEvent', 'WatchEvent', 'PushEvent', 'IssuesEvent', 'ForkEvent'][_i % 5]",
    "        _f.write(_js.dumps({'id': str(48000000000 + _i), 'type': _t, 'repo': {'name': 'tidewater/smartqueue'}}) + '\\n')",
  ].join("\n");

export const m32Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L32-01 iterator protocol
  {
    id: "PY-L32-01",
    version: 2,
    slug: "iterator-protocol",
    title: "Iterators: iter(), next() and StopIteration",
    lede: "A for loop asks an object for an iterator with iter(), then calls next() on it until StopIteration says there is nothing left. Knowing that protocol lets you pull values by hand and write classes that work in a for loop.",
    focus: "Use iter() and next() by hand, and write a class that follows the iterator protocol.",
    minutes: 20,
    objectives: [
      "Explain what `for` does: `iter()` once, then `next()` until `StopIteration`",
      "Tell an iterable (can give many iterators) from an iterator (used up after one pass)",
      "Write a class with `__iter__` and `__next__`, and an iterable whose `__iter__` returns a fresh iterator",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "continue-statement", "dict-comp", "dict-literal", "else-clause", "end", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "newline-escape", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-index", "string-method", "string-slice", "string-split", "strptime-call", "timedelta-call", "top-level-indent", "truthiness", "unquoted-name", "while-loop", "zip-call"],
    teaches: ["iter-method"],
    blocks: [
      {
        kind: "text",
        md: "`for fare in fares:` works on lists, strings, dictionaries, files and ranges because they all speak the same small **protocol**. The loop first calls `iter(fares)` to get an **iterator**, an object that remembers where it is. Then it calls `next()` on that iterator, once per pass. When there are no values left, `next()` raises **`StopIteration`**, and the loop ends quietly.\n\nA list is **iterable**: every `iter()` call gives a new iterator starting at the beginning. An iterator itself is used up after one pass. You can drive the protocol by hand, which is useful for taking just the first value or for treating the first line of a file differently.",
      },
      {
        kind: "example",
        title: "Pulling values by hand",
        code: src`
fares = [12.8, 7.2, 31.0]
it = iter(fares)
print(next(it))
print(next(it))
print(next(it))
print(next(it, "no more fares"))
print(list(it))
print(list(fares))
`,
        output: "12.8\n7.2\n31.0\nno more fares\n[]\n[12.8, 7.2, 31.0]\n",
        note: "`next(it, default)` returns the default instead of raising when the iterator is finished. The iterator `it` is now used up, so `list(it)` is empty; the list `fares` can still give a fresh iterator.",
      },
      {
        kind: "error-example",
        title: "next() past the end",
        code: src`
days = iter(["2025-01-15", "2025-01-16"])
next(days)
next(days)
print(next(days))
`,
        error: "StopIteration",
        output: "",
        note: "Outside a `for` loop nobody catches `StopIteration` for you. Use `next(days, None)` when running out is a normal outcome.",
      },
      {
        kind: "text",
        md: "Your own class works in a `for` loop once it follows the protocol: **`__iter__`** returns the iterator (for an iterator, that's `self`), and **`__next__`** returns the next value or raises `StopIteration`. This one hands out rows in batches, the way an upload to an API that accepts at most 100 rows per call would need them.",
      },
      {
        kind: "example",
        title: "A class that hands out batches",
        code: src`
class Batches:
    """Hands out rows in groups of size, one group per next()."""

    def __init__(self, rows, size):
        self.rows = rows
        self.size = size
        self.position = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.position >= len(self.rows):
            raise StopIteration
        batch = self.rows[self.position:self.position + self.size]
        self.position += self.size
        return batch

trip_ids = [16126, 16127, 16128, 16129, 16130]
for batch in Batches(trip_ids, 2):
    print(batch)
batches = Batches(trip_ids, 2)
print(len(list(batches)), len(list(batches)))
`,
        output: "[16126, 16127]\n[16128, 16129]\n[16130]\n3 0\n",
        note: "`Batches` is an iterator: it returns itself from `__iter__` and keeps its position, so the second `list(batches)` finds nothing left. That's the same behaviour as a file object: one pass per object.",
      },
      {
        kind: "text",
        md: "**When to use it:** call `next()` yourself when you want just the first item, or want to treat the first item (a header) differently from the rest; write `__iter__`/`__next__` when an object produces a sequence of values on demand. **Mistakes to avoid:** calling `next()` without a default where the end is possible; looping over the same iterator twice and expecting the values again; and making a class that should be reusable (a route, a playlist) return `self` from `__iter__`, so a second loop gets nothing.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A route you can loop over twice",
      prompt: "`Route` is written as an iterator, so it can be walked only once: the second `list(route)` is empty. Make it a reusable iterable: let `__iter__` return a fresh iterator over the stops, `iter(self.stops)`, every time it is called. `__next__` and `position` are no longer needed.",
      spec: [
        ["Class", "`Route(stops)`"],
        ["Behaviour", "every `for` loop or `list()` over the same Route gives all the stops again"],
      ],
      starter: src`
class Route:
    def __init__(self, stops):
        self.stops = stops
        self.position = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.position == len(self.stops):
            raise StopIteration
        stop = self.stops[self.position]
        self.position += 1
        return stop

route = Route(["Penn Station", "Times Sq", "Columbus Circle"])
print(list(route))
print(list(route))
`,
      answer: src`
class Route:
    def __init__(self, stops):
        self.stops = stops

    def __iter__(self):
        return iter(self.stops)

route = Route(["Penn Station", "Times Sq", "Columbus Circle"])
print(list(route))
print(list(route))
`,
      wrong: [
        {
          code: src`
class Route:
    def __init__(self, stops):
        self.stops = stops
        self.position = 0

    def __iter__(self):
        self.position = 0
        return self

    def __next__(self):
        if self.position == len(self.stops):
            raise StopIteration
        stop = self.stops[self.position]
        self.position += 1
        return stop
`,
          fails: ["nested"],
          why: "resetting the position works for one loop at a time, but two loops over the same route share one position",
        },
      ],
      hints: ["The list of stops can already hand out as many iterators as you like.", "`__iter__` should return a new iterator each time instead of `self`.", "Return `iter(self.stops)` from `__iter__` and delete `__next__`."],
      task: {
        checks: [
          expr("returns", "a Route can be listed twice", "_r = Route(['Penn Station', 'Times Sq', 'Columbus Circle'])\nresult = (list(_r), list(_r))", py.tuple(pv(["Penn Station", "Times Sq", "Columbus Circle"]), pv(["Penn Station", "Times Sq", "Columbus Circle"])), { show: "list(route), list(route)" }),
          expr("nested", "two loops over the same route at once", "_r = Route(['A', 'B'])\nresult = [a + b for a in _r for b in _r]", ["AA", "AB", "BA", "BB"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An iterator over dates",
        prompt: "Reports often need every day in a range, including the last. Write a class `DateRange(start, end)` that is an **iterator**: `next()` returns the next day as ISO text (`\"2025-02-01\"`), starting with `start` and ending with `end`, then raises `StopIteration`. When `start` is after `end` there are no days.",
        spec: [
          ["Class", "`DateRange(start, end)`; both are ISO dates such as `\"2025-01-30\"`"],
          ["Protocol", "`iter(r)` returns `r` itself; `next(r)` returns the next day as text"],
          ["Example", "`list(DateRange(\"2025-01-30\", \"2025-02-02\"))` → `['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']`"],
        ],
        starter: src`
from datetime import date, timedelta

class DateRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

print(list(DateRange("2025-01-30", "2025-02-02")))
`,
        answer: src`
from datetime import date, timedelta

class DateRange:
    def __init__(self, start, end):
        self.current = date.fromisoformat(start)
        self.end = date.fromisoformat(end)

    def __iter__(self):
        return self

    def __next__(self):
        if self.current > self.end:
            raise StopIteration
        day = self.current
        self.current += timedelta(days=1)
        return day.isoformat()

print(list(DateRange("2025-01-30", "2025-02-02")))
`,
        alternatives: [
          src`
from datetime import datetime, timedelta

class DateRange:
    def __init__(self, start, end):
        self.day = datetime.strptime(start, "%Y-%m-%d")
        self.last = datetime.strptime(end, "%Y-%m-%d")

    def __iter__(self):
        return self

    def __next__(self):
        if self.day <= self.last:
            text = self.day.strftime("%Y-%m-%d")
            self.day = self.day + timedelta(days=1)
            return text
        raise StopIteration
`,
        ],
        wrong: [
          {
            code: src`
from datetime import date, timedelta

class DateRange:
    def __init__(self, start, end):
        self.current = date.fromisoformat(start)
        self.end = date.fromisoformat(end)

    def __iter__(self):
        return self

    def __next__(self):
        if self.current >= self.end:
            raise StopIteration
        day = self.current
        self.current += timedelta(days=1)
        return day.isoformat()
`,
            fails: ["returns", "single", "leap"],
            why: "`>=` stops before the end date, which the range should include",
          },
          {
            code: src`
from datetime import date, timedelta

class DateRange:
    def __init__(self, start, end):
        self.days = []
        day = date.fromisoformat(start)
        while day <= date.fromisoformat(end):
            self.days.append(day.isoformat())
            day += timedelta(days=1)

    def __iter__(self):
        return iter(self.days)
`,
            fails: ["protocol", "exhausted"],
            why: "it works in a for loop, but it isn't an iterator: `next()` on it fails",
          },
          {
            code: src`
from datetime import date, timedelta

class DateRange:
    def __init__(self, start, end):
        self.current = date.fromisoformat(start)
        self.end = date.fromisoformat(end)

    def __iter__(self):
        return self

    def __next__(self):
        if self.current > self.end:
            raise StopIteration
        day = self.current
        self.current += timedelta(days=1)
        return day
`,
            fails: ["returns", "protocol", "single", "leap"],
            why: "it returns date objects, not ISO text",
          },
        ],
        hints: [
          "Convert both texts to dates in `__init__` (`date.fromisoformat`, the Dates Numbers & Regex module) and keep the current day as state.",
          "`__iter__` returns `self`; `__next__` checks whether the current day is past the end before doing anything else.",
          "Remember the day to return, move the current day on with `timedelta(days=1)`, then return the remembered day as text.",
        ],
        task: {
          checks: [
            expr("returns", "every day from start to end, inclusive", "result = list(DateRange('2025-01-30', '2025-02-02'))", ["2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02"], { show: "list(DateRange('2025-01-30', '2025-02-02'))" }),
            expr("protocol", "DateRange is its own iterator, and next() gives text", "_d = DateRange('2025-03-01', '2025-03-05')\nresult = (iter(_d) is _d, next(_d), next(_d))", py.tuple(py.bool(true), py.str("2025-03-01"), py.str("2025-03-02")), { show: "iter(d) is d, next(d), next(d)" }),
            expr("single", "a range of one day", "result = list(DateRange('2025-01-15', '2025-01-15'))", ["2025-01-15"], { hidden: true }),
            expr("leap", "a leap day inside the range", "result = list(DateRange('2024-02-28', '2024-03-01'))", ["2024-02-28", "2024-02-29", "2024-03-01"], { hidden: true }),
            expr("backwards", "a start after the end", "result = list(DateRange('2025-02-02', '2025-01-30'))", [], { hidden: true }),
            expr("exhausted", "next() after the last day raises StopIteration", "_d = DateRange('2025-01-01', '2025-01-02')\nlist(_d)\nnext(_d)", null, { hidden: true, raises: "StopIteration" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A header, then the rows",
        prompt: "Write `read_table(lines)`: `lines` is any iterable of text lines, which may be a list, but may also be an open file or another iterator that can't be indexed. Skip blank lines before the header, use the first non-blank line as the comma-separated header, and return the remaining non-blank lines as dictionaries. Return `[]` when there is no header.",
        spec: [
          ["Function", "`read_table(lines)`"],
          ["lines", "any iterable of lines, each possibly ending in `\\n`"],
          ["Returns", "a list of dictionaries from header field to value (all text); blank lines are skipped"],
          ["Example", "`read_table([\"station,tmax_c\\n\", \"USW00094846,31.7\\n\"])` → `[{'station': 'USW00094846', 'tmax_c': '31.7'}]`"],
        ],
        starter: src`
def read_table(lines):
    return []

print(read_table(["station,tmax_c\n", "USW00094846,31.7\n", "\n", "USW00023174,24.4\n"]))
`,
        answer: src`
def read_table(lines):
    rows = iter(lines)
    header = next(rows, None)
    while header is not None and not header.strip():
        header = next(rows, None)
    if header is None:
        return []
    fields = header.strip().split(",")
    table = []
    for line in rows:
        if line.strip():
            table.append(dict(zip(fields, line.strip().split(","))))
    return table

print(read_table(["station,tmax_c\n", "USW00094846,31.7\n", "\n", "USW00023174,24.4\n"]))
`,
        alternatives: [
          src`
def read_table(lines):
    fields = None
    table = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        values = line.split(",")
        if fields is None:
            fields = values
        else:
            table.append({field: value for field, value in zip(fields, values)})
    return table
`,
        ],
        wrong: [
          {
            code: src`
def read_table(lines):
    if not lines:
        return []
    fields = lines[0].strip().split(",")
    table = []
    for line in lines[1:]:
        if line.strip():
            table.append(dict(zip(fields, line.strip().split(","))))
    return table
`,
            fails: ["returns", "file", "iterator", "empty", "blank-first"],
            why: "indexing works for a list but not for a file or an iterator, and a blank first line becomes the header",
          },
          {
            code: src`
def read_table(lines):
    rows = iter(lines)
    fields = next(rows).strip().split(",")
    table = []
    for line in rows:
        if line.strip():
            table.append(dict(zip(fields, line.strip().split(","))))
    return table
`,
            fails: ["returns", "empty", "blank-first"],
            why: "an empty input raises StopIteration, and a blank first line is taken as the header",
          },
        ],
        hints: [
          "Get an iterator with `iter(lines)`: it works the same for a list, a file or a generator.",
          "Pull lines with `next(rows, None)` until one isn't blank: that's the header. None means there wasn't one.",
          "The `for` loop over the same iterator continues after the header; `zip` pairs each field with a value.",
        ],
        task: {
          checks: [
            fn("returns", "read_table", [
              example([["station,tmax_c\n", "USW00094846,31.7\n", "\n", "USW00023174,24.4\n"]], [{ station: "USW00094846", tmax_c: "31.7" }, { station: "USW00023174", tmax_c: "24.4" }]),
              example([["trip_id,fare\n"]], []),
              hiddenCase("blank lines before the header", [["\n", "  \n", "trip_id,fare\n", "16126,40.8\n"]], [{ trip_id: "16126", fare: "40.8" }]),
              hiddenCase("no lines at all", [[]], []),
            ], { label: "read_table() reads a header and rows from a list" }),
            expr("file", "an open file", "with open('t.csv', 'w', encoding='utf-8') as _w:\n    _w.write('date,precip_mm\\n2024-07-01,0.0\\n\\n2024-07-02,12.4\\n')\nwith open('t.csv', encoding='utf-8') as _r:\n    result = read_table(_r)", [{ date: "2024-07-01", precip_mm: "0.0" }, { date: "2024-07-02", precip_mm: "12.4" }], { hidden: true }),
            expr("iterator", "an iterator that can't be indexed", "result = read_table(iter(['type,repo\\n', 'WatchEvent,tidewater/smartqueue\\n']))", [{ type: "WatchEvent", repo: "tidewater/smartqueue" }], { hidden: true }),
            expr("empty", "an empty iterator", "result = read_table(iter([]))", [], { hidden: true }),
            expr("blank-first", "a blank line before the header", "result = read_table(['\\n', 'a,b\\n', '1,2\\n'])", [{ a: "1", b: "2" }], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
types = iter(["PushEvent", "WatchEvent", "ForkEvent", "IssuesEvent"])
print(next(types), next(types))
print(list(types))
`,
        choices: ["PushEvent WatchEvent\n['ForkEvent', 'IssuesEvent']", "PushEvent WatchEvent\n['PushEvent', 'WatchEvent', 'ForkEvent', 'IssuesEvent']", "PushEvent PushEvent\n['WatchEvent', 'ForkEvent', 'IssuesEvent']", "PushEvent WatchEvent\n[]"],
        answer: 0,
        why: "Each `next` moves the iterator on by one, and `list` collects whatever is left, starting where the iterator stopped.",
      },
      {
        id: "q2",
        prompt: "A common mistake: one iterator, two passes. What does this print?",
        program: src`
fares = iter([40.8, 7.2, 17.5])
total = sum(fares)
count = len(list(fares))
print(total, count)
`,
        choices: ["65.5 0", "65.5 3", "0 3", "TypeError"],
        answer: 0,
        why: "`sum` used the iterator up, so `list(fares)` is empty and the count is 0. Keep the values in a list if you need two passes, or count and total in one loop.",
      },
      {
        id: "q3",
        prompt: "Which of these can be looped over only once?",
        choices: ["A file opened for reading", "A list of trips", "A dictionary of station names", "`range(10)`"],
        answer: 0,
        why: "A file object is its own iterator: after one pass it is at the end. Lists, dictionaries and ranges are iterables that hand out a fresh iterator for every loop.",
      },
    ],
    review: [
      "`for` calls `iter()` once, then `next()` until `StopIteration`; `next(it, default)` avoids the exception.",
      "An iterable gives a fresh iterator each time; an iterator (a file, a `Batches`) is used up after one pass.",
      "A class with `__iter__` and `__next__` works in any for loop, `list()` or `sum()`.",
      "Next: generator functions, which write iterators like these with `yield` instead of a class.",
    ],
  },

  // ------------------------------------------------------------------ PY-L32-02 generators
  {
    id: "PY-L32-02",
    version: 2,
    slug: "generator-functions",
    title: "Generator functions: yield one value at a time",
    lede: "A function that contains yield doesn't run when you call it. It returns a generator, an iterator whose body runs only when the next value is asked for, pausing at each yield. That makes reading a large file record by record as easy as writing a loop.",
    focus: "Write generator functions with yield and understand when their body runs.",
    minutes: 20,
    objectives: [
      "Explain what calling a generator function returns, and when its body runs",
      "Write generators that read, convert and filter records one at a time",
      "Stop early and know which work was never done",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "encoding-arg", "enumerate-call", "exc-name", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "newline-escape", "none-value", "path-call", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "string-format", "string-index", "string-method", "top-level-indent", "truthiness", "try-except", "type-call", "unquoted-name", "while-loop", "with-statement"],
    teaches: ["yield-expr"],
    blocks: [
      {
        kind: "text",
        md: "Writing a class with `__next__` and a position for every sequence is a lot of ceremony. A **generator function** does the same job: any function whose body contains `yield` returns a **generator** when called. Nothing in the body runs yet. Each `next()` runs the body until the next `yield`, hands out that value and **pauses** right there, local variables and all. When the body finishes, the generator raises `StopIteration` for you.",
      },
      {
        kind: "example",
        title: "When a generator's body runs",
        code: src`
def numbered(lines):
    print("generator starts")
    for number, line in enumerate(lines, start=1):
        print("  reading line", number)
        yield number, line.strip()
    print("generator finished")

events = numbered(["PushEvent\n", "WatchEvent\n", "ForkEvent\n"])
print(type(events).__name__)
print(next(events))
for item in events:
    print(item)
`,
        output: "generator\ngenerator starts\n  reading line 1\n(1, 'PushEvent')\n  reading line 2\n(2, 'WatchEvent')\n  reading line 3\n(3, 'ForkEvent')\ngenerator finished\n",
        note: "Calling `numbered(...)` printed nothing: it only created the generator. The first `next` ran the body up to the first `yield`; the `for` loop then resumed it from there for each remaining value.",
      },
      {
        kind: "text",
        md: "The pattern shines on files. A generator can open a file, walk it line by line, and yield only the records you asked for. The caller sees a plain iterator and never deals with the file. Because the body runs on demand, a caller that stops early never reads the rest of the file.",
      },
      {
        kind: "example",
        title: "Events of one type from a JSONL file",
        code: src`
import json
from pathlib import Path

events = [
    {"id": "48000004214", "type": "CreateEvent", "repo": {"name": "cobalt-tools/deeplint"}},
    {"id": "48000002730", "type": "WatchEvent", "repo": {"name": "tidewater/smartqueue"}},
    {"id": "48000001239", "type": "PullRequestReviewEvent", "repo": {"name": "tidewater/smartqueue"}},
    {"id": "48000003301", "type": "WatchEvent", "repo": {"name": "cobalt-tools/deeplint"}},
]
Path("events.jsonl").write_text("\n".join([json.dumps(e) for e in events]) + "\n", encoding="utf-8")

def events_of_type(path, wanted):
    with open(path, encoding="utf-8") as f:
        for line in f:
            event = json.loads(line)
            if event["type"] == wanted:
                yield event

stars = events_of_type("events.jsonl", "WatchEvent")
first = next(stars)
print(first["repo"]["name"])
print([event["id"] for event in stars])
`,
        output: "tidewater/smartqueue\n['48000003301']\n",
        note: "The `with` block stays open while the generator is paused and closes when the generator finishes (or is thrown away). The caller asked for one star, then for the rest; the generator read the file only as far as each request needed.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a function would build a list only so that someone can loop over it once: reading records, converting rows, walking pages. **Mistakes to avoid:** writing `return value` inside the loop (the function returns once, it is not a generator unless it contains `yield`); expecting the body to run when the function is called; and forgetting that, like any iterator, a generator is used up after one pass.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Skip voided trips",
      prompt: "Taxi trip records include voided and refunded trips with a fare of 0 or less. `fares` yields every fare as a number. Change it to yield only fares above 0.",
      spec: [
        ["Generator", "`fares(rows)`; each row is a dictionary with text `fare_amount`"],
        ["Yields", "`float(row[\"fare_amount\"])` for rows whose fare is above 0"],
      ],
      starter: src`
def fares(rows):
    for row in rows:
        yield float(row["fare_amount"])

rows = [{"fare_amount": "40.8"}, {"fare_amount": "-7.2"}, {"fare_amount": "0"}, {"fare_amount": "17.2"}]
print(list(fares(rows)))
`,
      answer: src`
def fares(rows):
    for row in rows:
        fare = float(row["fare_amount"])
        if fare > 0:
            yield fare

rows = [{"fare_amount": "40.8"}, {"fare_amount": "-7.2"}, {"fare_amount": "0"}, {"fare_amount": "17.2"}]
print(list(fares(rows)))
`,
      wrong: [
        {
          code: src`
def fares(rows):
    for row in rows:
        fare = float(row["fare_amount"])
        if fare >= 0:
            yield fare
`,
          fails: ["returns", "none"],
          why: "`>= 0` keeps the voided zero-fare trips",
        },
      ],
      hints: ["Convert the fare first, then decide whether to yield it.", "Only some fares should reach the `yield`.", "Indent the `yield` under a test that the fare is above zero."],
      task: {
        checks: [
          expr("returns", "fares() yields only positive fares", "result = list(fares([{'fare_amount': '40.8'}, {'fare_amount': '-7.2'}, {'fare_amount': '0'}, {'fare_amount': '17.2'}]))", [40.8, 17.2], { show: "list(fares(rows))" }),
          expr("none", "only voided trips", "result = list(fares([{'fare_amount': '-3.5'}, {'fare_amount': '0.00'}]))", [], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Chunks for a bulk upload",
        prompt: "An API accepts at most `size` records per upload. Write a generator `chunks(items, size)` that yields lists of up to `size` items, in order, the last one possibly shorter. `items` can be any iterable, including a generator that is still reading a file, so take items as you go: don't turn the whole input into a list first.",
        spec: [
          ["Generator", "`chunks(items, size)`"],
          ["Yields", "lists of `size` items; a shorter last list if items are left over; nothing for no items"],
          ["Lazy", "to produce the first chunk, take no more than `size` items from `items`"],
          ["Example", "`list(chunks([16126, 16127, 16128, 16129, 16130], 2))` → `[[16126, 16127], [16128, 16129], [16130]]`"],
        ],
        starter: src`
def chunks(items, size):
    return []

print(list(chunks([16126, 16127, 16128, 16129, 16130], 2)))
`,
        answer: src`
def chunks(items, size):
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk

print(list(chunks([16126, 16127, 16128, 16129, 16130], 2)))
`,
        alternatives: [
          src`
from itertools import islice

def chunks(items, size):
    it = iter(items)
    while True:
        chunk = list(islice(it, size))
        if not chunk:
            return
        yield chunk
`,
        ],
        wrong: [
          {
            code: src`
def chunks(items, size):
    items = list(items)
    for start in range(0, len(items), size):
        yield items[start:start + size]
`,
            fails: ["lazy"],
            why: "`list(items)` reads the whole input before the first chunk can be uploaded",
          },
          {
            code: src`
def chunks(items, size):
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = []
`,
            fails: ["returns", "short"],
            why: "the leftover items at the end are never yielded",
          },
          {
            code: src`
def chunks(items, size):
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk.clear()
    if chunk:
        yield chunk
`,
            fails: ["returns", "exact"],
            why: "`clear()` empties the very list that was just yielded, so every chunk the caller kept turns out empty",
          },
        ],
        hints: [
          "Collect items into a list as you loop, and yield it when it reaches `size`.",
          "After yielding, start a *new* list for the next chunk; changing the yielded one would change what the caller holds.",
          "When the loop ends, some items may still be waiting: yield them if there are any.",
        ],
        task: {
          checks: [
            expr("returns", "five trips in chunks of two", "result = list(chunks([16126, 16127, 16128, 16129, 16130], 2))", [[16126, 16127], [16128, 16129], [16130]], { show: "list(chunks([16126, 16127, 16128, 16129, 16130], 2))" }),
            expr("exact", "an exact number of chunks", "result = list(chunks(['a', 'b', 'c', 'd', 'e', 'f'], 3))", [["a", "b", "c"], ["d", "e", "f"]], { show: "list(chunks(['a', 'b', 'c', 'd', 'e', 'f'], 3))" }),
            expr("lazy", "the first chunk takes only `size` items from a long input", `${FEED}\n_f = ${feed(Array.from({ length: 1000 }, (_, i) => i))}\n_first = next(iter(chunks(_f, 3)))\nresult = (_first, _f.pulled)`, py.tuple(pv([0, 1, 2]), py.int(3)), { hidden: true }),
            expr("short", "fewer items than one chunk", "result = list(chunks(iter([7.2, 40.8]), 5))", [[7.2, 40.8]], { hidden: true }),
            expr("empty", "no items", "result = list(chunks([], 4))", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Read JSON Lines, lazily and loudly",
        prompt: "Write a generator `read_jsonl(path)` that yields one dictionary per line of a JSON Lines file, skipping blank lines. A line that isn't valid JSON must raise `ValueError(\"line N: invalid JSON\")` (N counting from 1) when the reader **reaches** it, so the records before it can still be processed.",
        spec: [
          ["Generator", "`read_jsonl(path)`"],
          ["Yields", "`json.loads(line)` for every non-blank line, in order"],
          ["Raises", "`ValueError(\"line 3: invalid JSON\")` for a bad line 3, only when that line is reached"],
          ["Tip", "`json.JSONDecodeError` is what `json.loads` raises for bad text (see CSV JSON & JSONL)"],
        ],
        starter: src`
import json

def read_jsonl(path):
    return []

with open("events.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000002730", "type": "WatchEvent"}\n\n{"id": "48000001239", "type": "PullRequestReviewEvent"}\n')
for event in read_jsonl("events.jsonl"):
    print(event["type"])
`,
        answer: src`
import json

def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        for number, line in enumerate(f, start=1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                raise ValueError(f"line {number}: invalid JSON") from None

with open("events.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000002730", "type": "WatchEvent"}\n\n{"id": "48000001239", "type": "PullRequestReviewEvent"}\n')
for event in read_jsonl("events.jsonl"):
    print(event["type"])
`,
        alternatives: [
          src`
import json

def read_jsonl(path):
    number = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            number += 1
            text = line.strip()
            if text == "":
                continue
            try:
                record = json.loads(text)
            except ValueError as err:
                raise ValueError("line " + str(number) + ": invalid JSON") from err
            yield record
`,
        ],
        wrong: [
          {
            code: src`
import json

def read_jsonl(path):
    records = []
    with open(path, encoding="utf-8") as f:
        for number, line in enumerate(f, start=1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                raise ValueError(f"line {number}: invalid JSON") from None
    return records
`,
            fails: ["lazy-error"],
            why: "it reads the whole file before returning anything, so a bad last line stops every record from being processed",
          },
          {
            code: src`
import json

def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)
`,
            fails: ["lazy-error", "message"],
            why: "a bad line raises JSONDecodeError without saying which line it was",
          },
          {
            code: src`
import json

def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        lines = [line for line in f if line.strip()]
    for number, line in enumerate(lines, start=1):
        try:
            yield json.loads(line)
        except json.JSONDecodeError:
            raise ValueError(f"line {number}: invalid JSON") from None
`,
            fails: ["message"],
            why: "blank lines are dropped before counting, so the reported line number is wrong",
          },
        ],
        hints: [
          "Open the file inside the generator and loop over it with `enumerate(..., start=1)` to know each line's number.",
          "Skip blank lines with `continue`; yield the parsed record for every other line.",
          "Wrap the parsing in `try`, catch `json.JSONDecodeError`, and raise a ValueError naming the line instead.",
        ],
        task: {
          checks: [
            expr("returns", "read_jsonl() yields each record and skips blank lines", "with open('a.jsonl', 'w', encoding='utf-8') as _w:\n    _w.write('{\"id\": \"48000002730\", \"type\": \"WatchEvent\"}\\n\\n{\"id\": \"48000001239\", \"type\": \"PullRequestReviewEvent\"}\\n')\nresult = [e['id'] for e in read_jsonl('a.jsonl')]", ["48000002730", "48000001239"], { show: "[e['id'] for e in read_jsonl('events.jsonl')]" }),
            expr("lazy-error", "the records before a bad line are delivered before the error", "with open('b.jsonl', 'w', encoding='utf-8') as _w:\n    _w.write('{\"id\": 1}\\n{\"id\": 2}\\n{\"id\": 3\\n{\"id\": 4}\\n')\n_g = iter(read_jsonl('b.jsonl'))\n_got = [next(_g)['id'], next(_g)['id']]\ntry:\n    next(_g)\n    result = (_got, 'no error')\nexcept ValueError as _e:\n    result = (_got, str(_e))", py.tuple(pv([1, 2]), py.str("line 3: invalid JSON")), { show: "two records from a file whose third line is broken, then the error" }),
            expr("message", "a bad line after blank lines keeps its real line number", "with open('c.jsonl', 'w', encoding='utf-8') as _w:\n    _w.write('\\n\\n{\"id\": 1}\\nnot json\\n')\ntry:\n    list(read_jsonl('c.jsonl'))\n    result = 'no error'\nexcept ValueError as _e:\n    result = str(_e)", "line 4: invalid JSON", { hidden: true }),
            expr("empty", "an empty file", "open('d.jsonl', 'w').close()\nresult = list(read_jsonl('d.jsonl'))", [], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def countdown(n):
    print("start")
    while n > 0:
        yield n
        n -= 1

c = countdown(3)
print("made")
print(list(c))
`,
        choices: ["made\nstart\n[3, 2, 1]", "start\nmade\n[3, 2, 1]", "made\n[3, 2, 1]", "start\nmade\n[3, 2, 1, 0]"],
        answer: 0,
        why: "Calling `countdown(3)` only creates the generator, so `made` is printed first. `list` then runs the body: `start`, and the three yields.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `return` where `yield` was meant. What does this print?",
        program: src`
def big_fares(fares):
    for fare in fares:
        if fare > 30:
            return fare

print(big_fares([12.8, 40.8, 52.0]))
`,
        choices: ["40.8", "[40.8, 52.0]", "<generator object big_fares>", "None"],
        answer: 0,
        why: "Without `yield` this is an ordinary function: `return` ends it at the first big fare. With `yield fare` it would produce 40.8 and then 52.0.",
      },
      {
        id: "q3",
        prompt: "Which job suits a generator function best?",
        choices: [
          "Reading a 2 GB log file and handing out one parsed record at a time",
          "Sorting 50 records by date",
          "Looking up a customer by ID several times",
          "Returning the total of three numbers",
        ],
        answer: 0,
        why: "A generator produces values on demand, so it never holds the whole file. Sorting needs every record at once, repeated lookups need a dictionary, and a total is a single value.",
      },
    ],
    review: [
      "A function with `yield` returns a generator; its body runs only when values are asked for, pausing at each `yield`.",
      "Generators turn \"read, convert, filter\" loops into iterators that callers can consume one record at a time.",
      "Stopping early means the rest of the work is never done; a generator is still used up after one pass.",
      "Next: `yield from`, which hands on every value of another iterable, for chaining and recursion.",
    ],
  },

  // ------------------------------------------------------------------ PY-L32-03 yield from
  {
    id: "PY-L32-03",
    version: 2,
    slug: "yield-from",
    title: "yield from: chain and recurse",
    lede: "yield from hands on every value of another iterable as if the generator had yielded them itself. It chains several sources into one stream and makes recursive generators, such as walking a tree of folders or comments, short and clear.",
    focus: "Use yield from to delegate to another iterable, including a recursive call of the same generator.",
    minutes: 18,
    objectives: [
      "Replace a `for x in other: yield x` loop with `yield from other`",
      "Chain several sources into one stream",
      "Write recursive generators that walk nested data",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "conditional-expr", "conversion", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "for-loop", "function-def", "function-default", "function-param", "function-return", "hash-in-text", "identity", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "membership", "module-file", "nested-dict", "precedence", "print-call", "print-several", "print-text", "pyproject-file", "range-call", "reassignment", "spaces-in-text", "star-args", "string-format", "string-index", "top-level-indent", "truthiness", "type-call", "unquoted-name", "yield-expr"],
    teaches: ["yield-from"],
    blocks: [
      {
        kind: "text",
        md: "Often a generator's job is to pass on what another iterable produces: all trips from several days, all files in several folders. `yield from other` does that in one line: it yields each value of `other` in turn, then carries on with the next line. It is equivalent to `for value in other: yield value` (and also passes through some generator details that matter in advanced code).",
      },
      {
        kind: "example",
        title: "One stream from several days",
        code: src`
def trips_from(*days):
    for day in days:
        yield from day

monday = [16126, 16127]
tuesday = [17001]
wednesday = []
thursday = [18210, 18211]
print(list(trips_from(monday, tuesday, wednesday, thursday)))
`,
        output: "[16126, 16127, 17001, 18210, 18211]\n",
        note: "`days` is a tuple of the lists passed in. An empty day simply contributes nothing. `itertools.chain(monday, tuesday, …)` does the same job; `yield from` lets you add your own logic around it.",
      },
      {
        kind: "text",
        md: "The bigger win is **recursion** (see Advanced Functions & Recursion). Nested data, such as an issue thread where every comment can have replies, is naturally walked by a generator that yields the current item and then *delegates* to itself for each child. Without `yield from`, the recursive call would create a generator and throw it away.",
      },
      {
        kind: "example",
        title: "Walk a comment thread",
        code: src`
thread = {"author": "data_fox514", "text": "Parser drops trailing zeros", "replies": [
    {"author": "stackkoi785", "text": "Can reproduce on 2.1", "replies": [
        {"author": "data_fox514", "text": "Same on main", "replies": []},
    ]},
    {"author": "hack_lynx150", "text": "Fix in #415", "replies": []},
]}

def walk(comment, depth=0):
    yield depth, comment["author"], comment["text"]
    for reply in comment["replies"]:
        yield from walk(reply, depth + 1)

for depth, author, text in walk(thread):
    print("  " * depth + f"{author}: {text}")
print(sum([1 for _ in walk(thread)]), "comments")
`,
        output: "data_fox514: Parser drops trailing zeros\n  stackkoi785: Can reproduce on 2.1\n    data_fox514: Same on main\n  hack_lynx150: Fix in #415\n4 comments\n",
        note: "Each call yields its own comment, then everything its replies yield, depth first. The caller sees one flat stream and doesn't need to know the thread was nested.",
      },
      {
        kind: "text",
        md: "**When to use it:** to combine several iterables into one stream, and in recursive generators over trees (folders, comments, nested JSON). **Mistakes to avoid:** calling the recursive generator without `yield from` (its values are lost); writing `yield walk(child)`, which yields the generator object itself instead of its values; and recursing on text: a string is iterable too, one character at a time.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The replies are missing",
      prompt: "`authors` should yield the author of every comment in a thread, but it only yields the top one: the recursive call creates a generator and throws it away. Fix it with `yield from`.",
      spec: [
        ["Generator", "`authors(comment)`"],
        ["Yields", "the comment's author, then the authors of all its replies, depth first"],
      ],
      starter: src`
def authors(comment):
    yield comment["author"]
    for reply in comment["replies"]:
        authors(reply)

thread = {"author": "data_fox514", "replies": [
    {"author": "stackkoi785", "replies": [{"author": "data_fox514", "replies": []}]},
    {"author": "hack_lynx150", "replies": []},
]}
print(list(authors(thread)))
`,
      answer: src`
def authors(comment):
    yield comment["author"]
    for reply in comment["replies"]:
        yield from authors(reply)

thread = {"author": "data_fox514", "replies": [
    {"author": "stackkoi785", "replies": [{"author": "data_fox514", "replies": []}]},
    {"author": "hack_lynx150", "replies": []},
]}
print(list(authors(thread)))
`,
      wrong: [
        {
          code: src`
def authors(comment):
    yield comment["author"]
    for reply in comment["replies"]:
        yield authors(reply)
`,
          fails: ["returns", "deep"],
          why: "`yield authors(reply)` hands out the generator object, not the authors inside it",
        },
      ],
      hints: ["The recursive call makes a generator, but nothing takes values from it.", "The values of that generator should become this generator's values.", "Put `yield from` in front of the recursive call."],
      task: {
        checks: [
          expr("returns", "every author, depth first", "result = list(authors({'author': 'data_fox514', 'replies': [{'author': 'stackkoi785', 'replies': [{'author': 'data_fox514', 'replies': []}]}, {'author': 'hack_lynx150', 'replies': []}]}))", ["data_fox514", "stackkoi785", "data_fox514", "hack_lynx150"], { show: "list(authors(thread))" }),
          expr("deep", "a thread four levels deep", "result = list(authors({'author': 'a', 'replies': [{'author': 'b', 'replies': [{'author': 'c', 'replies': [{'author': 'd', 'replies': []}]}]}]}))", ["a", "b", "c", "d"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Every file in a project tree",
        prompt: "A project's folders are described as nested dictionaries: each folder has a `name`, a list of `files` and a list of sub-`folders`. Write a generator `walk_files(folder, prefix=\"\")` that yields the path of every file, built from the folder names joined with `/`: a folder's own files first, in order, then each sub-folder's files.",
        spec: [
          ["Generator", "`walk_files(folder, prefix=\"\")`"],
          ["folder", "`{\"name\": \"smartqueue\", \"files\": [\"README.md\"], \"folders\": [ … ]}`"],
          ["Yields", "paths like `\"smartqueue/README.md\"`, `\"smartqueue/src/queue.py\"`"],
        ],
        starter: src`
def walk_files(folder, prefix=""):
    return []

project = {"name": "smartqueue", "files": ["README.md", "pyproject.toml"], "folders": [
    {"name": "src", "files": ["queue.py"], "folders": [
        {"name": "backends", "files": ["redis.py", "sqlite.py"], "folders": []},
    ]},
    {"name": "tests", "files": ["test_queue.py"], "folders": []},
]}
for path in walk_files(project):
    print(path)
`,
        answer: src`
def walk_files(folder, prefix=""):
    here = prefix + folder["name"] + "/"
    for name in folder["files"]:
        yield here + name
    for sub in folder["folders"]:
        yield from walk_files(sub, here)

project = {"name": "smartqueue", "files": ["README.md", "pyproject.toml"], "folders": [
    {"name": "src", "files": ["queue.py"], "folders": [
        {"name": "backends", "files": ["redis.py", "sqlite.py"], "folders": []},
    ]},
    {"name": "tests", "files": ["test_queue.py"], "folders": []},
]}
for path in walk_files(project):
    print(path)
`,
        alternatives: [
          src`
from pathlib import PurePosixPath

def walk_files(folder, prefix=""):
    base = PurePosixPath(prefix) / folder["name"] if prefix else PurePosixPath(folder["name"])
    yield from [str(base / f) for f in folder["files"]]
    for child in folder["folders"]:
        yield from walk_files(child, str(base))
`,
        ],
        wrong: [
          {
            code: src`
def walk_files(folder, prefix=""):
    here = prefix + folder["name"] + "/"
    for name in folder["files"]:
        yield here + name
    for sub in folder["folders"]:
        yield from walk_files(sub)
`,
            fails: ["returns", "deep"],
            why: "the prefix isn't passed down, so files in sub-folders lose the outer folder names",
          },
          {
            code: src`
def walk_files(folder, prefix=""):
    here = prefix + folder["name"] + "/"
    for sub in folder["folders"]:
        yield from walk_files(sub, here)
    for name in folder["files"]:
        yield here + name
`,
            fails: ["returns"],
            why: "sub-folders come before the folder's own files",
          },
          {
            code: src`
def walk_files(folder, prefix=""):
    here = prefix + folder["name"] + "/"
    for name in folder["files"]:
        yield here + name
    for sub in folder["folders"]:
        for name in sub["files"]:
            yield here + sub["name"] + "/" + name
`,
            fails: ["returns", "deep"],
            why: "only one level of sub-folders is walked",
          },
        ],
        hints: [
          "Build this folder's path once: the prefix, its name and a `/`.",
          "Yield this folder's files first, each joined to that path.",
          "For each sub-folder, `yield from` the same generator with this folder's path as the new prefix.",
        ],
        task: {
          checks: [
            expr("returns", "every file of the project, own files first", "_p = {'name': 'smartqueue', 'files': ['README.md', 'pyproject.toml'], 'folders': [{'name': 'src', 'files': ['queue.py'], 'folders': [{'name': 'backends', 'files': ['redis.py', 'sqlite.py'], 'folders': []}]}, {'name': 'tests', 'files': ['test_queue.py'], 'folders': []}]}\nresult = list(walk_files(_p))", ["smartqueue/README.md", "smartqueue/pyproject.toml", "smartqueue/src/queue.py", "smartqueue/src/backends/redis.py", "smartqueue/src/backends/sqlite.py", "smartqueue/tests/test_queue.py"], { show: "list(walk_files(project))" }),
            expr("empty", "an empty folder", "result = list(walk_files({'name': 'docs', 'files': [], 'folders': []}))", [], { hidden: true }),
            expr("deep", "files only at the bottom of deep folders", "result = list(walk_files({'name': 'a', 'files': [], 'folders': [{'name': 'b', 'files': [], 'folders': [{'name': 'c', 'files': ['x.txt'], 'folders': []}]}, {'name': 'd', 'files': ['y.txt'], 'folders': []}]}))", ["a/b/c/x.txt", "a/d/y.txt"], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Every path in a JSON document",
        prompt: "To compare two API responses field by field, a tool lists every leaf value with its path. Write a generator `json_paths(value, prefix=\"\")`: for a dictionary, walk each key in order (path `prefix.key`, or just `key` at the top); for a list, each item (path `prefix[0]`, `prefix[1]`, …); anything else is a leaf and is yielded as `(path, value)`. Empty dictionaries and lists yield nothing.",
        spec: [
          ["Generator", "`json_paths(value, prefix=\"\")`"],
          ["Yields", "`(path, leaf)` tuples, depth first, in document order"],
          ["Example", "`{\"properties\": {\"mag\": 5.5}, \"geometry\": {\"coordinates\": [169.38, -20.93]}}` → `('properties.mag', 5.5)`, `('geometry.coordinates[0]', 169.38)`, `('geometry.coordinates[1]', -20.93)`"],
        ],
        starter: src`
def json_paths(value, prefix=""):
    return []

feature = {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu"}, "geometry": {"coordinates": [169.3819, -20.9273, 22]}}
for path, leaf in json_paths(feature):
    print(path, leaf)
`,
        answer: src`
def json_paths(value, prefix=""):
    if isinstance(value, dict):
        for key, item in value.items():
            path = f"{prefix}.{key}" if prefix else key
            yield from json_paths(item, path)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from json_paths(item, f"{prefix}[{index}]")
    else:
        yield prefix, value

feature = {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu"}, "geometry": {"coordinates": [169.3819, -20.9273, 22]}}
for path, leaf in json_paths(feature):
    print(path, leaf)
`,
        alternatives: [
          src`
def json_paths(value, prefix=""):
    if type(value) is dict:
        children = [((prefix + "." + str(k)) if prefix else str(k), v) for k, v in value.items()]
    elif type(value) is list:
        children = [(prefix + "[" + str(i) + "]", v) for i, v in enumerate(value)]
    else:
        yield (prefix, value)
        return
    for path, child in children:
        yield from json_paths(child, path)
`,
        ],
        wrong: [
          {
            code: src`
def json_paths(value, prefix=""):
    if isinstance(value, dict):
        for key, item in value.items():
            yield from json_paths(item, prefix + "." + key)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from json_paths(item, f"{prefix}[{index}]")
    else:
        yield prefix, value
`,
            fails: ["returns", "nested-lists", "empty"],
            why: "top-level keys get a leading dot: `.id` instead of `id`",
          },
          {
            code: src`
def json_paths(value, prefix=""):
    if isinstance(value, dict):
        for key, item in value.items():
            path = f"{prefix}.{key}" if prefix else key
            yield from json_paths(item, path)
    else:
        yield prefix, value
`,
            fails: ["returns", "list-top", "nested-lists", "empty"],
            why: "lists are treated as leaves, so their items get no paths of their own",
          },
          {
            code: src`
def json_paths(value, prefix=""):
    if isinstance(value, dict):
        for key, item in value.items():
            path = f"{prefix}.{key}" if prefix else key
            yield from json_paths(item, path)
    elif isinstance(value, (list, str)):
        for index, item in enumerate(value):
            yield from json_paths(item, f"{prefix}[{index}]")
    else:
        yield prefix, value
`,
            fails: ["returns", "list-top"],
            why: "a string is iterable too, so text is split into characters, and a one-character string recurses forever",
          },
        ],
        hints: [
          "Three cases: a dictionary, a list, anything else. Only the last one yields a pair itself.",
          "For a dictionary, build the child's path from the prefix and the key, without a leading dot at the top; for a list, add `[index]`.",
          "Hand each child to `json_paths` again with its new path, using `yield from`.",
        ],
        task: {
          checks: [
            expr("returns", "every leaf of a GeoJSON feature", "result = list(json_paths({'id': 'us6000pgsd', 'properties': {'mag': 5.5, 'place': '153 km S of Isangel, Vanuatu'}, 'geometry': {'coordinates': [169.3819, -20.9273, 22]}}))", py.list(py.tuple(py.str("id"), py.str("us6000pgsd")), py.tuple(py.str("properties.mag"), py.float(5.5)), py.tuple(py.str("properties.place"), py.str("153 km S of Isangel, Vanuatu")), py.tuple(py.str("geometry.coordinates[0]"), py.float(169.3819)), py.tuple(py.str("geometry.coordinates[1]"), py.float(-20.9273)), py.tuple(py.str("geometry.coordinates[2]"), py.int(22))), { show: "list(json_paths(feature))" }),
            expr("list-top", "a list at the top", "result = list(json_paths([{'login': 'data_fox514'}, {'login': 'stackkoi785'}]))", py.list(py.tuple(py.str("[0].login"), py.str("data_fox514")), py.tuple(py.str("[1].login"), py.str("stackkoi785"))), { hidden: true }),
            expr("nested-lists", "lists inside lists, with None and booleans", "result = list(json_paths({'grid': [[1, None], [True]]}))", py.list(py.tuple(py.str("grid[0][0]"), py.int(1)), py.tuple(py.str("grid[0][1]"), py.none), py.tuple(py.str("grid[1][0]"), py.bool(true))), { hidden: true }),
            expr("empty", "empty containers", "result = list(json_paths({'tags': [], 'meta': {}, 'ok': False}))", py.list(py.tuple(py.str("ok"), py.bool(false))), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def numbers():
    yield 1
    yield from [2, 3]
    yield from range(4, 6)
    yield from "ab"

print(list(numbers()))
`,
        choices: ["[1, 2, 3, 4, 5, 'a', 'b']", "[1, [2, 3], range(4, 6), 'ab']", "[1, 2, 3, 4, 5, 6, 'ab']", "[1, 2, 3, 4, 5, 'ab']"],
        answer: 0,
        why: "`yield from` hands on every value of any iterable: the list's items, the range's numbers (6 is excluded) and the string's characters.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the recursive call isn't delegated. What does this print?",
        program: src`
def leaves(node):
    if isinstance(node, list):
        for child in node:
            leaves(child)
    else:
        yield node

print(list(leaves([1, [2, 3]])))
`,
        choices: ["[]", "[1, 2, 3]", "[1, [2, 3]]", "RecursionError"],
        answer: 0,
        why: "The top call gets a list, so it only calls `leaves(child)` for each child, creating generators that nobody iterates. It yields nothing itself. `yield from leaves(child)` would produce `[1, 2, 3]`.",
      },
      {
        id: "q3",
        prompt: "Where is `yield from` the clearest tool?",
        choices: [
          "A generator that walks every file in nested folders",
          "Adding up a list of fares",
          "Looking up one key in a dictionary",
          "Sorting events by time",
        ],
        answer: 0,
        why: "Walking nested folders is recursion over a tree, and `yield from` passes each sub-folder's files up through every level. The others don't produce a stream from nested sources.",
      },
    ],
    review: [
      "`yield from other` yields every value of `other`, then carries on.",
      "It chains sources into one stream and lets a recursive generator pass on everything its children yield.",
      "Without it, a recursive call is a generator nobody iterates; `yield child_gen` yields the generator object itself.",
      "Next: building whole pipelines of lazy steps, with generator expressions and itertools.",
    ],
  },

  // ------------------------------------------------------------------ PY-L32-04 lazy pipelines
  {
    id: "PY-L32-04",
    version: 2,
    slug: "lazy-pipelines",
    title: "Lazy pipelines: generator expressions, islice and takewhile",
    lede: "Chained generators form a pipeline: read, parse, filter, transform, each step pulling one item at a time from the one before. Generator expressions write a step in one line, and itertools.islice and takewhile stop the whole pipeline as soon as you have enough.",
    focus: "Build pipelines from generator expressions and generator functions that process one item at a time and can stop early.",
    minutes: 22,
    objectives: [
      "Write a generator expression and pass one straight to `sum`, `max`, `any` or `all`",
      "Chain generator steps and predict the order in which their code runs",
      "Stop early with `islice`, `takewhile` or `next`",
    ],
    requires: ["aggregate-call", "any-call", "arithmetic", "assignment", "boolean", "break-statement", "comp-if", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "exc-name", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "newline-escape", "none-value", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack", "type-call", "while-loop", "yield-expr"],
    teaches: ["lazy-pipe"],
    blocks: [
      {
        kind: "text",
        md: "A **generator expression** looks like a list comprehension in round brackets: `(t[\"fare\"] for t in trips if t[\"miles\"] > 0)`. It makes a generator instead of a list, so nothing is computed until someone asks. Passed directly to a function, it doesn't even need its own brackets: `sum(t[\"fare\"] for t in trips)`.\n\nChain several generator steps and you get a **pipeline**. When the consumer asks for one value, the request travels back up the chain, and a single item flows down through every step before the next item is even read. So a pipeline over a 10 GB file holds one record at a time, and stops reading the moment you stop asking.",
      },
      {
        kind: "example",
        title: "One item through every step",
        code: src`
def read(lines):
    for line in lines:
        print("read ", line)
        yield line

def parse(lines):
    for line in lines:
        trip_id, fare = line.split(",")
        yield int(trip_id), float(fare)

def expensive(trips, minimum):
    for trip_id, fare in trips:
        if fare >= minimum:
            print("keep ", trip_id)
            yield trip_id

source = ["16126,40.8", "16127,7.2", "16128,17.2", "16129,52.0"]
pipeline = expensive(parse(read(source)), 30)
print(next(pipeline))
print(next(pipeline))
`,
        output: "read  16126,40.8\nkeep  16126\n16126\nread  16127,7.2\nread  16128,17.2\nread  16129,52.0\nkeep  16129\n16129\n",
        note: "The first `next` read one line and stopped. The second read lines until the next expensive trip turned up. Building lists at each step would have read all four lines, parsed all four and filtered all four before printing anything.",
      },
      {
        kind: "text",
        md: "`itertools` has the tools to stop a pipeline: **`islice(it, n)`** takes at most `n` items; **`takewhile(test, it)`** takes items while the test holds and stops at the first that fails. `any` and `all` (the Built-ins & Sorting module) stop as soon as they know the answer, and `next(gen, default)` takes just the first item.",
      },
      {
        kind: "example",
        title: "Generator expressions and early stops",
        code: src`
from itertools import islice, takewhile

trips = [
    {"trip_id": 16126, "miles": 9.2, "fare": 40.8},
    {"trip_id": 16127, "miles": 0.9, "fare": 7.2},
    {"trip_id": 16128, "miles": 3.17, "fare": 17.2},
    {"trip_id": 16129, "miles": 0.0, "fare": 3.0},
    {"trip_id": 16130, "miles": 18.4, "fare": 70.0},
]
per_mile = (t["fare"] / t["miles"] for t in trips if t["miles"] > 0)
print(type(per_mile).__name__)
print([f"{x:.2f}" for x in islice(per_mile, 2)])
print(sum(t["fare"] for t in trips if t["miles"] > 5))
print([t["trip_id"] for t in takewhile(lambda t: t["fare"] < 50, trips)])
print(any(t["miles"] == 0 for t in trips))
print(next((t["trip_id"] for t in trips if t["fare"] > 60), None))
`,
        output: "generator\n['4.43', '8.00']\n110.8\n[16126, 16127, 16128, 16129]\nTrue\n16130\n",
        note: "`islice` took two values from `per_mile` and the rest were never computed. `takewhile` stopped at 16130, the first fare of 50 or more. `next(…, None)` finds the first match or gives None.",
      },
      {
        kind: "text",
        md: "**When to use it:** reading and filtering large inputs, searching for the first match, totals that don't need the values kept. **Mistakes to avoid:** writing `[...]` inside `sum(...)` or `any(...)` out of habit, which builds the whole list first and loses the early stop; using `takewhile` where you meant a filter (it stops at the first failure instead of skipping it); and expecting a generator expression to keep its values for a second pass.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Stop at n long trips",
      prompt: "`first_long_trips` filters the whole list and then keeps the first `n`. Make it stop as soon as it has `n` long trips: use a generator expression for the filter and `islice` to take `n` of them.",
      spec: [
        ["Function", "`first_long_trips(trips, n)`"],
        ["Returns", "a list of the first `n` trip ids whose `miles` is over 10, taking no more trips than needed"],
      ],
      starter: src`
from itertools import islice

def first_long_trips(trips, n):
    long_trips = [t["trip_id"] for t in trips if t["miles"] > 10]
    return long_trips[:n]

trips = [{"trip_id": 16126, "miles": 9.2}, {"trip_id": 16130, "miles": 18.4}, {"trip_id": 16131, "miles": 12.1}, {"trip_id": 16132, "miles": 22.0}]
print(first_long_trips(trips, 2))
`,
      answer: src`
from itertools import islice

def first_long_trips(trips, n):
    long_trips = (t["trip_id"] for t in trips if t["miles"] > 10)
    return list(islice(long_trips, n))

trips = [{"trip_id": 16126, "miles": 9.2}, {"trip_id": 16130, "miles": 18.4}, {"trip_id": 16131, "miles": 12.1}, {"trip_id": 16132, "miles": 22.0}]
print(first_long_trips(trips, 2))
`,
      wrong: [
        {
          code: src`
from itertools import islice

def first_long_trips(trips, n):
    return list(islice([t["trip_id"] for t in trips if t["miles"] > 10], n))
`,
          fails: ["lazy"],
          why: "the square brackets still build the full list before `islice` gets to stop",
        },
      ],
      hints: ["The list comprehension reads every trip before slicing.", "Round brackets make the same expression lazy.", "Take `n` items from the generator with `islice` and turn them into a list."],
      task: {
        checks: [
          expr("returns", "the first two long trips", "result = first_long_trips([{'trip_id': 16126, 'miles': 9.2}, {'trip_id': 16130, 'miles': 18.4}, {'trip_id': 16131, 'miles': 12.1}, {'trip_id': 16132, 'miles': 22.0}], 2)", [16130, 16131], { show: "first_long_trips(trips, 2)" }),
          expr("lazy", "no more trips are read than needed", `${FEED}\n_f = ${feed([{ trip_id: 1, miles: 11 }, { trip_id: 2, miles: 1 }, { trip_id: 3, miles: 15 }, ...Array.from({ length: 50 }, (_, i) => ({ trip_id: 10 + i, miles: 20 }))])}\nresult = (first_long_trips(_f, 2), _f.pulled)`, py.tuple(pv([1, 3]), py.int(3)), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The first readings that are there",
        prompt: "NOAA daily data marks a missing measurement with an empty field. Write `first_temperatures(lines, n)`: `lines` is CSV text lines (header `station,date,tmax_c` first) from a file that may be huge. Return the first `n` maximum temperatures that are present, as floats, reading no further than needed.",
        spec: [
          ["Function", "`first_temperatures(lines, n)`"],
          ["lines", "an iterable of lines like `\"USW00094846,2024-07-01,31.7\\n\"`, the first one the header"],
          ["Returns", "a list of up to `n` floats, skipping lines whose `tmax_c` is empty"],
          ["Lazy", "stop taking lines as soon as `n` temperatures are found"],
        ],
        starter: src`
from itertools import islice

def first_temperatures(lines, n):
    return []

lines = ["station,date,tmax_c\n", "USW00094846,2024-07-01,31.7\n", "USW00094846,2024-07-02,\n", "USW00094846,2024-07-03,33.9\n", "USW00094846,2024-07-04,30.6\n"]
print(first_temperatures(lines, 2))
`,
        answer: src`
from itertools import islice

def first_temperatures(lines, n):
    rows = iter(lines)
    next(rows, None)
    fields = (line.rstrip("\n").split(",") for line in rows)
    temperatures = (float(row[2]) for row in fields if row[2] != "")
    return list(islice(temperatures, n))

lines = ["station,date,tmax_c\n", "USW00094846,2024-07-01,31.7\n", "USW00094846,2024-07-02,\n", "USW00094846,2024-07-03,33.9\n", "USW00094846,2024-07-04,30.6\n"]
print(first_temperatures(lines, 2))
`,
        alternatives: [
          src`
def first_temperatures(lines, n):
    found = []
    header_seen = False
    if n == 0:
        return found
    for line in lines:
        if not header_seen:
            header_seen = True
            continue
        value = line.strip().split(",")[2]
        if value:
            found.append(float(value))
            if len(found) == n:
                break
    return found
`,
        ],
        wrong: [
          {
            code: src`
def first_temperatures(lines, n):
    rows = list(lines)[1:]
    temps = [float(r.strip().split(",")[2]) for r in rows if r.strip().split(",")[2]]
    return temps[:n]
`,
            fails: ["lazy"],
            why: "the whole input is read and converted before the first n are picked",
          },
          {
            code: src`
from itertools import islice, takewhile

def first_temperatures(lines, n):
    rows = iter(lines)
    next(rows, None)
    present = takewhile(lambda line: line.rstrip("\n").split(",")[2] != "", rows)
    return list(islice((float(line.rstrip("\n").split(",")[2]) for line in present), n))
`,
            fails: ["returns", "lazy", "gaps"],
            why: "`takewhile` stops at the first missing value instead of skipping it",
          },
          {
            code: src`
from itertools import islice

def first_temperatures(lines, n):
    fields = (line.rstrip("\n").split(",") for line in lines)
    temperatures = (float(row[2]) for row in fields if row[2] != "")
    return list(islice(temperatures, n))
`,
            fails: ["returns", "lazy", "gaps", "short"],
            why: "the header line is treated as data, and `float(\"tmax_c\")` fails",
          },
        ],
        hints: [
          "Get an iterator and take the header off it with `next`.",
          "Chain two generator expressions: split each line, then convert the third field of the rows where it isn't empty.",
          "`islice(…, n)` takes the first n temperatures and stops the whole chain.",
        ],
        task: {
          checks: [
            expr("returns", "the first two temperatures that are present", "result = first_temperatures(['station,date,tmax_c\\n', 'USW00094846,2024-07-01,31.7\\n', 'USW00094846,2024-07-02,\\n', 'USW00094846,2024-07-03,33.9\\n', 'USW00094846,2024-07-04,30.6\\n'], 2)", [31.7, 33.9], { show: "first_temperatures(lines, 2)" }),
            expr("lazy", "no more lines are read than needed", `${FEED}\n_f = ${feed(["station,date,tmax_c\n", "USW00023174,2024-01-01,18.3\n", "USW00023174,2024-01-02,\n", "USW00023174,2024-01-03,19.4\n", ...Array.from({ length: 200 }, (_, i) => `USW00023174,2024-02-${String((i % 28) + 1).padStart(2, "0")},20.0\n`)])}\nresult = (first_temperatures(_f, 2), _f.pulled)`, py.tuple(pv([18.3, 19.4]), py.int(4)), { hidden: true }),
            expr("gaps", "several gaps in a row", "result = first_temperatures(iter(['station,date,tmax_c\\n', 'S,d1,\\n', 'S,d2,\\n', 'S,d3,-4.4\\n', 'S,d4,\\n', 'S,d5,0.0\\n']), 5)", [-4.4, py.float(0)], { hidden: true }),
            expr("short", "only the header", "result = first_temperatures(['station,date,tmax_c\\n'], 3)", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "What the budget buys",
        prompt: "A purchasing list is in priority order. Write `within_budget(items, budget)`: go through the items in order, keeping a running total of prices, and return the names bought before the first item that would take the total over the budget. Stop there: later, cheaper items are not considered (the list is in priority order). Take no more items than needed.",
        spec: [
          ["Function", "`within_budget(items, budget)`"],
          ["items", "an iterable of `(name, price)` pairs, in priority order"],
          ["Returns", "the names bought, in order; a total exactly equal to the budget is allowed"],
          ["Example", "`[(\"router\", 89.0), (\"switch\", 45.5), (\"cables\", 30.0), (\"label maker\", 12.0)]` with budget 150 → `['router', 'switch']`"],
        ],
        starter: src`
from itertools import accumulate, takewhile

def within_budget(items, budget):
    return []

items = [("router", 89.0), ("switch", 45.5), ("cables", 30.0), ("label maker", 12.0)]
print(within_budget(items, 150))
`,
        answer: src`
from itertools import accumulate, takewhile

def within_budget(items, budget):
    bought = []
    total = 0
    for name, price in items:
        total += price
        if total > budget:
            break
        bought.append(name)
    return bought

items = [("router", 89.0), ("switch", 45.5), ("cables", 30.0), ("label maker", 12.0)]
print(within_budget(items, 150))
`,
        alternatives: [
          src`
from itertools import accumulate, takewhile

def within_budget(items, budget):
    names = []
    def track(pair):
        names.append(pair[0])
        return pair[1]
    totals = accumulate(track(pair) for pair in items)
    affordable = list(takewhile(lambda total: total <= budget, totals))
    return names[:len(affordable)]
`,
        ],
        wrong: [
          {
            code: src`
def within_budget(items, budget):
    bought = []
    total = 0
    for name, price in items:
        if total + price <= budget:
            total += price
            bought.append(name)
    return bought
`,
            fails: ["returns", "priority", "lazy"],
            why: "it skips an item that doesn't fit and carries on with cheaper ones, which ignores the priority order",
          },
          {
            code: src`
def within_budget(items, budget):
    bought = []
    total = 0
    for name, price in items:
        total += price
        if total >= budget:
            break
        bought.append(name)
    return bought
`,
            fails: ["exact"],
            why: "`>=` refuses an item that makes the total exactly the budget",
          },
          {
            code: src`
def within_budget(items, budget):
    items = list(items)
    bought = []
    total = 0
    for name, price in items:
        total += price
        if total > budget:
            break
        bought.append(name)
    return bought
`,
            fails: ["lazy"],
            why: "`list(items)` reads every item, even the ones after the budget ran out",
          },
        ],
        hints: [
          "Keep a running total as you go through the items in order.",
          "Add the price first, then check whether the total is now over the budget; if it is, that item isn't bought and nothing after it either.",
          "Leave the loop with `break` at that point (or use `itertools.accumulate` with `takewhile`).",
        ],
        task: {
          checks: [
            expr("returns", "the router and the switch fit in 150", "result = within_budget([('router', 89.0), ('switch', 45.5), ('cables', 30.0), ('label maker', 12.0)], 150)", ["router", "switch"], { show: "within_budget(items, 150)" }),
            expr("exact", "a total exactly equal to the budget", "result = within_budget([('desk', 120.0), ('chair', 80.0), ('lamp', 25.0)], 200)", ["desk", "chair"], { show: "within_budget([('desk', 120.0), ('chair', 80.0), ('lamp', 25.0)], 200)" }),
            expr("priority", "a cheaper item after one that doesn't fit", "result = within_budget([('laptop', 900.0), ('mouse', 25.0)], 500)", [], { hidden: true }),
            expr("lazy", "no items are taken after the one that doesn't fit", `${FEED}\n_f = ${feed([["a", 10], ["b", 10], ["c", 100], ...Array.from({ length: 40 }, (_, i) => [`x${i}`, 1])])}\nresult = (within_budget(_f, 50), _f.pulled)`, py.tuple(pv(["a", "b"]), py.int(3)), { hidden: true }),
            expr("everything", "everything fits", "result = within_budget(iter([('pens', 4.5), ('paper', 9.0)]), 100)", ["pens", "paper"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from itertools import islice

def numbers():
    n = 0
    while True:
        n += 1
        print("make", n)
        yield n

squares = (x * x for x in numbers())
print(list(islice(squares, 2)))
`,
        choices: ["make 1\nmake 2\n[1, 4]", "make 1\nmake 2\nmake 3\n[1, 4]", "[1, 4]", "the program never finishes"],
        answer: 0,
        why: "`numbers()` would run forever, but nothing asks for more than two values: `islice` stops after the second square, so only 1 and 2 are ever made.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `takewhile` used as a filter. What does this print?",
        program: src`
from itertools import takewhile

readings = [31.7, 33.9, None, 30.6, 29.4]
print(list(takewhile(lambda r: r is not None, readings)))
print([r for r in readings if r is not None])
`,
        choices: ["[31.7, 33.9]\n[31.7, 33.9, 30.6, 29.4]", "[31.7, 33.9, 30.6, 29.4]\n[31.7, 33.9, 30.6, 29.4]", "[31.7, 33.9]\n[31.7, 33.9]", "[]\n[31.7, 33.9, 30.6, 29.4]"],
        answer: 0,
        why: "`takewhile` stops for good at the first item that fails the test. To skip the missing readings and keep going, filter with `if` instead.",
      },
      {
        id: "q3",
        prompt: "Which line keeps the early stop of `any`?",
        choices: [
          "`any(t[\"fare\"] > 100 for t in trips)`",
          "`any([t[\"fare\"] > 100 for t in trips])`",
          "`any(list(t[\"fare\"] > 100 for t in trips))`",
          "`len([t for t in trips if t[\"fare\"] > 100]) > 0`",
        ],
        answer: 0,
        why: "With a generator expression, `any` stops at the first fare over 100. The other three build the complete list of results first, checking every trip.",
      },
    ],
    review: [
      "A generator expression is a lazy comprehension in round brackets; pass it straight to `sum`, `any`, `all`, `max`.",
      "Chained generators move one item through every step before reading the next.",
      "`islice`, `takewhile`, `next(gen, default)`, `any` and `all` stop the pipeline as soon as they can.",
      "Next: measuring what this saves in memory, and the one thing a generator can't do.",
    ],
  },

  // ------------------------------------------------------------------ PY-L32-05 memory behaviour
  {
    id: "PY-L32-05",
    version: 2,
    slug: "generator-memory",
    title: "Memory: what laziness saves and what it costs",
    lede: "A list holds every value at once; a generator holds one. tracemalloc measures the difference, which grows with the data. The price is that a generator can be read only once, so a computation needing two passes has to be written as one.",
    focus: "Measure the memory a list and a generator need, and write single-pass code for data that can be read only once.",
    minutes: 20,
    objectives: [
      "Measure peak memory with `tracemalloc` and compare a list-based and a generator-based computation",
      "Explain why a generator's peak memory doesn't grow with the input",
      "Compute several results (count, total, minimum, maximum) in one pass over an iterator",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "continue-statement", "conversion", "counter-call", "dict-get", "dict-literal", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "newline-escape", "none-value", "print-call", "print-number", "print-several", "print-text", "range-call", "reassignment", "string-index", "string-method", "top-level-indent", "tuple-unpack", "with-statement", "yield-expr"],
    teaches: ["lazy-one"],
    blocks: [
      {
        kind: "text",
        md: "How much memory does a computation need? `tracemalloc`, in Python's standard library, traces the memory Python allocates: `start()` begins tracing, `get_traced_memory()` returns `(current, peak)` in bytes, and `stop()` ends it. Measuring the **peak** of two versions of the same computation shows what building a list really costs. Exact byte counts depend on the Python version and the machine, so compare them rather than memorising them.",
      },
      {
        kind: "example",
        title: "A list against a generator",
        code: src`
import tracemalloc

def peak_bytes(work):
    tracemalloc.start()
    work()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return peak

def with_list():
    return sum([n * n for n in range(200_000)])

def with_generator():
    return sum(n * n for n in range(200_000))

list_peak = peak_bytes(with_list)
generator_peak = peak_bytes(with_generator)
print(with_list() == with_generator())
print(list_peak > 1_000_000, generator_peak < 10_000)
print(list_peak > 100 * generator_peak)
`,
        output: "True\nTrue True\nTrue\n",
        note: "Same answer, very different cost. The list held 200,000 numbers at once (several megabytes here); the generator held one at a time (a few hundred bytes). Double the input and the list's peak doubles, while the generator's stays the same.",
      },
      {
        kind: "text",
        md: "The price of laziness: a generator is an iterator, so once something has read it, it's empty. Code that needs two passes, such as an average (total, then count) or a maximum followed by a sum, silently gets wrong answers from a generator. Either keep the values in a list (paying the memory), create a fresh generator for each pass, or compute everything in **one pass**.",
      },
      {
        kind: "example",
        title: "Read once",
        code: src`
def fares(rows):
    for row in rows:
        yield float(row["fare_amount"])

rows = [{"fare_amount": "40.8"}, {"fare_amount": "7.2"}, {"fare_amount": "17.5"}]
stream = fares(rows)
print(max(stream))
print(sum(stream))

count = 0
total = 0.0
highest = None
for fare in fares(rows):
    count += 1
    total += fare
    if highest is None or fare > highest:
        highest = fare
print(count, total, highest)
`,
        output: "40.8\n0\n3 65.5 40.8\n",
        note: "`max` used the stream up, so `sum` got nothing and returned 0, with no error to warn you. The loop computes all three results in one pass over a fresh generator.",
      },
      {
        kind: "text",
        md: "**When to use what:** a generator when the data is large or endless and one pass is enough; a list when you need `len`, indexing, sorting or several passes and the data fits comfortably in memory. **Mistakes to avoid:** calling `len()` on a generator (TypeError); passing the same generator to two functions; `readlines()` or `read()` on a big file when you only loop over it once; and trusting measured bytes as universal: compare versions on the same machine.",
      },
    ],
    tryIt: {
      id: "try",
      title: "An average in one pass",
      prompt: "`average` works for lists but fails for a generator: `len()` doesn't work on one, and `sum` would use it up anyway. Rewrite it to count and total in a single loop. Return `None` when there are no values.",
      spec: [
        ["Function", "`average(values)`"],
        ["values", "any iterable of numbers, including a generator"],
        ["Returns", "the mean, or `None` for no values"],
      ],
      starter: src`
def average(values):
    return sum(values) / len(values)

print(average([3.5, 4.0, 4.5]))
print(average(x for x in [3.5, 4.0, 4.5]))
`,
      answer: src`
def average(values):
    count = 0
    total = 0
    for value in values:
        count += 1
        total += value
    if count == 0:
        return None
    return total / count

print(average([3.5, 4.0, 4.5]))
print(average(x for x in [3.5, 4.0, 4.5]))
`,
      wrong: [
        {
          code: src`
def average(values):
    values = list(values)
    return sum(values) / len(values)
`,
          fails: ["empty"],
          why: "turning the input into a list works, but an empty input divides by zero",
        },
      ],
      hints: ["One loop can keep two running values.", "Count the items and add them up in the same loop.", "After the loop, a count of 0 means there was nothing to average."],
      task: {
        checks: [
          fn("returns", "average", [
            example([[3.5, 4.0, 4.5]], py.float(4)),
            hiddenCase("one value", [[40.8]], 40.8),
          ], { label: "average() of a list" }),
          expr("generator", "the average of a generator", "result = average(x for x in [7.2, 17.5, 40.8, 52.0])", 29.375, { show: "average(x for x in [7.2, 17.5, 40.8, 52.0])" }),
          expr("empty", "no values at all", "result = average(x for x in [])", null, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A one-pass summary",
        prompt: "Write `summary(values)`: return `{\"count\": …, \"min\": …, \"max\": …, \"mean\": …}` for any iterable of numbers, reading it **once**, or `None` when it is empty. It must work on a generator of millions of readings without keeping them: the check measures its peak memory on 300,000 values.",
        spec: [
          ["Function", "`summary(values)`"],
          ["Returns", "`{\"count\": 3, \"min\": 7.2, \"max\": 40.8, \"mean\": 21.833…}`, or `None` for no values"],
          ["Memory", "don't store the values: peak memory must stay far below that of a list of them"],
        ],
        starter: src`
def summary(values):
    return None

print(summary([40.8, 7.2, 17.5]))
print(summary(float(x) for x in ["31.7", "33.9", "30.6"]))
`,
        answer: src`
def summary(values):
    count = 0
    total = 0
    low = None
    high = None
    for value in values:
        count += 1
        total += value
        if low is None or value < low:
            low = value
        if high is None or value > high:
            high = value
    if count == 0:
        return None
    return {"count": count, "min": low, "max": high, "mean": total / count}

print(summary([40.8, 7.2, 17.5]))
print(summary(float(x) for x in ["31.7", "33.9", "30.6"]))
`,
        alternatives: [
          src`
def summary(values):
    it = iter(values)
    first = next(it, None)
    if first is None:
        return None
    stats = {"count": 1, "min": first, "max": first, "total": first}
    for value in it:
        stats["count"] += 1
        stats["min"] = min(stats["min"], value)
        stats["max"] = max(stats["max"], value)
        stats["total"] += value
    return {"count": stats["count"], "min": stats["min"], "max": stats["max"], "mean": stats["total"] / stats["count"]}
`,
        ],
        wrong: [
          {
            code: src`
def summary(values):
    values = list(values)
    if not values:
        return None
    return {"count": len(values), "min": min(values), "max": max(values), "mean": sum(values) / len(values)}
`,
            fails: ["memory"],
            why: "the answers are right, but all the values are kept in a list",
          },
          {
            code: src`
def summary(values):
    if not values:
        return None
    return {"count": len(list(values)), "min": min(values), "max": max(values), "mean": sum(values) / len(list(values))}
`,
            fails: ["generator", "memory", "negative", "empty-gen"],
            why: "it reads its input several times, which a generator allows only once",
          },
          {
            code: src`
def summary(values):
    count = 0
    total = 0
    low = 0
    high = 0
    for value in values:
        count += 1
        total += value
        low = min(low, value)
        high = max(high, value)
    if count == 0:
        return None
    return {"count": count, "min": low, "max": high, "mean": total / count}
`,
            fails: ["returns", "generator", "negative"],
            why: "starting min and max at 0 is wrong whenever all values are above (or below) zero",
          },
        ],
        hints: [
          "Keep four running values in one loop: a count, a total, the lowest and the highest seen so far.",
          "Start the lowest and highest at None (or at the first value), not at 0.",
          "After the loop, a count of 0 means the input was empty; otherwise the mean is total divided by count.",
        ],
        task: {
          checks: [
            fn("returns", "summary", [
              example([[40.8, 7.2, 17.5]], { count: 3, min: 7.2, max: 40.8, mean: 21.833333333333332 }),
              example([[]], null),
            ], { label: "summary() of a list" }),
            expr("generator", "the summary of a generator", "result = summary(float(x) for x in ['31.7', '33.9', '30.6'])", { count: 3, min: 30.6, max: 33.9, mean: 32.06666666666667 }, { show: "summary(float(x) for x in ['31.7', '33.9', '30.6'])" }),
            expr("memory", "300,000 values without storing them", "import tracemalloc as _tm\n_tm.stop()\n_tm.start()\ntry:\n    _s = summary(n * 0.5 for n in range(300_000))\n    _peak = _tm.get_traced_memory()[1]\nfinally:\n    _tm.stop()\nresult = (_s['count'], _peak < 200_000)", py.tuple(py.int(300000), py.bool(true)), { hidden: true }),
            expr("negative", "only negative temperatures", "result = summary(iter([-4.4, -12.2, -0.6]))", { count: 3, min: -12.2, max: -0.6, mean: -5.733333333333333 }, { hidden: true }),
            expr("empty-gen", "an empty generator", "result = summary(x for x in [])", null, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Count event types without loading the file",
        prompt: "An hour of repository events can be millions of lines. Write `type_counts(path)`: read the JSON Lines file at `path` one line at a time and return a dictionary from event `type` to how many times it occurs. Skip blank lines. The check runs it on a 20,000-line file and compares its peak memory with reading the whole file at once.",
        spec: [
          ["Function", "`type_counts(path)`"],
          ["Returns", "`{type: count}` in the order types are first seen"],
          ["Memory", "stream the file: no `read()`, `readlines()` or list of all lines"],
        ],
        starter: src`
import json

def type_counts(path):
    return {}

with open("hour.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000002730", "type": "WatchEvent"}\n{"id": "48000004214", "type": "CreateEvent"}\n\n{"id": "48000003301", "type": "WatchEvent"}\n')
print(type_counts("hour.jsonl"))
`,
        answer: src`
import json

def type_counts(path):
    counts = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            kind = json.loads(line)["type"]
            counts[kind] = counts.get(kind, 0) + 1
    return counts

with open("hour.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000002730", "type": "WatchEvent"}\n{"id": "48000004214", "type": "CreateEvent"}\n\n{"id": "48000003301", "type": "WatchEvent"}\n')
print(type_counts("hour.jsonl"))
`,
        alternatives: [
          src`
import json
from collections import Counter

def type_counts(path):
    with open(path, encoding="utf-8") as f:
        kinds = (json.loads(line)["type"] for line in f if line.strip())
        return dict(Counter(kinds))
`,
        ],
        wrong: [
          {
            code: src`
import json

def type_counts(path):
    counts = {}
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()
    for line in lines:
        if line.strip():
            kind = json.loads(line)["type"]
            counts[kind] = counts.get(kind, 0) + 1
    return counts
`,
            fails: ["memory"],
            why: "`readlines()` holds the whole file in memory before counting",
          },
          {
            code: src`
import json

def type_counts(path):
    counts = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            kind = json.loads(line)["type"]
            counts[kind] = counts.get(kind, 0) + 1
    return counts
`,
            fails: ["returns"],
            why: "a blank line makes `json.loads` fail",
          },
        ],
        hints: [
          "Loop over the open file itself: it hands out one line at a time.",
          "Skip blank lines, parse each other line and read its `type`.",
          "Count with a dictionary and `get(kind, 0) + 1`, or feed a generator expression to `Counter`.",
        ],
        task: {
          checks: [
            expr("returns", "counts for a small file with a blank line", "with open('h1.jsonl', 'w', encoding='utf-8') as _w:\n    _w.write('{\"id\": \"48000002730\", \"type\": \"WatchEvent\"}\\n{\"id\": \"48000004214\", \"type\": \"CreateEvent\"}\\n\\n{\"id\": \"48000003301\", \"type\": \"WatchEvent\"}\\n')\nresult = type_counts('h1.jsonl')", { WatchEvent: 2, CreateEvent: 1 }, { show: "type_counts('hour.jsonl')" }),
            expr("big", "counts for 20,000 events", `${eventsFile("h2.jsonl", 20000)}\nresult = type_counts('h2.jsonl')`, { PushEvent: 8000, WatchEvent: 4000, IssuesEvent: 4000, ForkEvent: 4000 }, { hidden: true }),
            expr("memory", "peak memory on 20,000 events stays far below the file's size", `${eventsFile("h3.jsonl", 20000)}\nimport tracemalloc as _tm\n_tm.stop()\n_tm.start()\ntry:\n    type_counts('h3.jsonl')\n    _peak = _tm.get_traced_memory()[1]\nfinally:\n    _tm.stop()\nimport os as _os\nresult = _peak < _os.path.getsize('h3.jsonl') / 3`, true, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
squares = (n * n for n in range(5))
print(4 in squares)
print(list(squares))
`,
        choices: ["True\n[9, 16]", "True\n[0, 1, 4, 9, 16]", "False\n[]", "True\n[]"],
        answer: 0,
        why: "`in` reads the generator until it finds 4 (after 0 and 1), and stops there. `list` gets what is left: 9 and 16.",
      },
      {
        id: "q2",
        prompt: "A common mistake: one generator handed to two functions. What does this print?",
        program: src`
temps = (float(t) for t in ["31.7", "33.9", "30.6"])
hottest = max(temps)
coolest = min(temps, default=None)
print(hottest, coolest)
`,
        choices: ["33.9 None", "33.9 30.6", "33.9 31.7", "ValueError"],
        answer: 0,
        why: "`max` read every value, so `min` found the generator empty and returned its default. Compute both in one pass, or keep the values in a list when they are few.",
      },
      {
        id: "q3",
        prompt: "When is a list the better choice than a generator?",
        choices: [
          "You need to sort the values and then look at the first and last ones",
          "You add up the fares of a 5 GB file once",
          "You look for the first event of a certain type",
          "You copy matching lines from one file to another",
        ],
        answer: 0,
        why: "Sorting needs every value at once, and looking at both ends needs indexing. The others read the data once, front to back, which a generator does with almost no memory.",
      },
    ],
    review: [
      "`tracemalloc` measures peak memory: a list's grows with the data, a generator's doesn't.",
      "A generator can be read once; a second consumer gets nothing, often without an error.",
      "Compute several results in one pass, or use a list when you need `len`, indexing, sorting or several passes.",
      "Next (see Decorators & Context Managers): decorators and context managers, which wrap functions and blocks of code with extra behaviour.",
    ],
  },
];
