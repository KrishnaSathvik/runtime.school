/**
 * M24 practice: ten independent problems on debugging and logging (PY-L24-01 … PY-L24-05).
 *
 * Mix: 3 function implementations (a compact call stack, log levels by logger, a chained traceback), 3 debugging
 * (genuinely broken programs: a counter that skips and overwrites, warnings that never reach the log, an error
 * swallowed by `except Exception`), 1 validation, 1 data transformation with a warn/skip/stop policy, 1 integration
 * (shrinking a failing input with a caller's test), 1 output prediction.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are shaped like the course datasets: D09 (Open Food Facts products: barcodes, names, sugars per 100 g)
 * and D11 (GH Archive events: ids, types, repositories). Tracebacks are real CPython output. Log checks capture the
 * records with their own handler, so the learner's own logging setup can't hide or fake them.
 * Version 2: every question was replaced; the old set printed a stored "breakpoint()" string and recorded steps.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, exception: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises: exception,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});

/** Captures every log record produced while `call` runs as "LEVEL name: message" lines, root opened to DEBUG. */
const captureLogs = (call: string, resultExpr = "_buf.getvalue().splitlines()") =>
  [
    "import io as _io, logging as _lg",
    "_buf = _io.StringIO()",
    "_h = _lg.StreamHandler(_buf)",
    "_h.setFormatter(_lg.Formatter('%(levelname)s %(name)s: %(message)s'))",
    "_root = _lg.getLogger()",
    "_old = _root.level",
    "_root.addHandler(_h)",
    "_root.setLevel(_lg.DEBUG)",
    "try:",
    ...call.split("\n").map((l) => "    " + l),
    "finally:",
    "    _root.removeHandler(_h)",
    "    _root.setLevel(_old)",
    `result = ${resultExpr}`,
  ].join("\n");

// ---------------------------------------------------------------- fixtures

const pushEvents = [
  { id: "2489651045", type: "PushEvent", repo: "octo/api" },
  { id: "2489651051", type: "WatchEvent", repo: "octo/api" },
  { id: "2489651057", type: "PushEvent", repo: "rails/rails" },
  { id: "2489651064", type: "PushEvent", repo: "octo/api" },
];

const barcodeProducts = [
  { code: "3017620422003", name: "Nutella" },
  { code: "30176", name: "Hazelnut spread" },
  { code: "5449000000996", name: "Coca-Cola" },
  { code: "87157239", name: "Gouda slices" },
];

const shortTrace: unknown[] = [["main.py", 14, "<module>"], ["main.py", 9, "price_report"], ["main.py", 4, "unit_price"]];
const deepTrace: unknown[] = [["tree.py", 30, "<module>"], ["tree.py", 12, "depth"], ["tree.py", 12, "depth"], ["tree.py", 12, "depth"], ["tree.py", 9, "depth"]];

const nightlyLog = [
  "INFO prices: loaded 3 lines",
  "WARNING prices: line 2: bad price 'x'",
  "ERROR sync: could not sync lyon",
  "Traceback (most recent call last):",
  '  File "main.py", line 9, in sync_all',
  "OSError: connection reset",
  "WARNING prices: line 7: expected 2 fields",
];

const causeTrace = [
  "Traceback (most recent call last):",
  '  File "main.py", line 6, in load',
  "    return sugar(row)",
  '  File "main.py", line 3, in sugar',
  '    return float(row["sugars_100g"])',
  "                 ~~~^^^^^^^^^^^^^^^",
  "KeyError: 'sugars_100g'",
  "",
  "The above exception was the direct cause of the following exception:",
  "",
  "Traceback (most recent call last):",
  '  File "main.py", line 10, in <module>',
  '    load({"code": "3017620422003"})',
  '  File "main.py", line 8, in load',
  "    raise ValueError(f\"product {row['code']} has no sugar value\") from err",
  "ValueError: product 3017620422003 has no sugar value",
  "",
].join("\n");

const contextTrace = [
  "Traceback (most recent call last):",
  '  File "main.py", line 15, in save',
  '    return rows[0]["code"]',
  "           ~~~~^^^",
  "IndexError: list index out of range",
  "",
  "During handling of the above exception, another exception occurred:",
  "",
  "Traceback (most recent call last):",
  '  File "main.py", line 19, in <module>',
  "    save([])",
  '  File "main.py", line 17, in save',
  "    return undefined_name",
  "           ^^^^^^^^^^^^^^",
  "NameError: name 'undefined_name' is not defined",
  "",
].join("\n");

const plainTrace = "Traceback (most recent call last):\n  File \"a.py\", line 1, in <module>\n    1 / 0\nZeroDivisionError: division by zero\n";

const threeTrace = [
  "Traceback (most recent call last):",
  '  File "db.py", line 4, in connect',
  "ConnectionRefusedError: [Errno 111] Connection refused",
  "",
  "During handling of the above exception, another exception occurred:",
  "",
  "Traceback (most recent call last):",
  '  File "db.py", line 9, in connect',
  "TimeoutError: no answer after 3 tries",
  "",
  "The above exception was the direct cause of the following exception:",
  "",
  "Traceback (most recent call last):",
  '  File "job.py", line 2, in <module>',
  "RuntimeError: nightly import aborted",
].join("\n");

const events = [
  { id: "2489651045", type: "PushEvent", repo: "octo/api" },
  { id: "2489651051", type: "WatchEvent", repo: "octo/api" },
  { id: "2489651045", type: "PushEvent", repo: "octo/api" },
  { id: "2489651057", type: "PushEvent", repo: "rails/rails" },
  { id: "2489651051", type: "ForkEvent", repo: "octo/api" },
];

export const m24Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q24-02 debugging, easy
  {
    id: "PY-Q24-02",
    version: 2,
    slug: "pushes-per-repository",
    title: "Pushes per repository are wrong",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "counter-call", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "range-call", "string-index", "top-level-indent"],
    prompt: "A dashboard counts pushes per repository from a day of GitHub events. It says `octo/api` had one push when the event log shows two, and a repository whose only push was the first event of the day is missing entirely. Reproduce it with the small list in the starter (work out the right answer by hand first), find both bugs and fix `push_counts`.",
    spec: [
      ["Function", "`push_counts(events)`"],
      ["events", "a list of dictionaries with `id`, `type` and `repo`, in the order they happened"],
      ["Returns", "a dictionary from repository to its number of `PushEvent`s; repositories with no pushes don't appear"],
    ],
    hiddenKinds: ["the day's first event is the only push for its repository", "many pushes to one repository", "no push events at all", "no events"],
    hints: [
      "By hand, the starter's events give `octo/api` 2 and `rails/rails` 1. Add a labelled print inside the loop to see which events are visited and what is stored.",
      "One bug decides which events the loop visits; the other decides what happens to a count that already exists.",
      "Visit every event from the first one, and add to an existing count instead of replacing it.",
    ],
    explanation: "`range(1, len(events))` starts at the second event, so the first event of the day is never counted. `counts[repo] = 1` replaces the count instead of adding to it, so every repository tops out at 1. Looping over the events directly removes the first bug, and `+= 1` after creating the key with 0 fixes the second. Fixing only one of them still gives wrong totals on some inputs, which is why reproducing with a list you can check by hand matters.",
    code: {
      starter: src`
def push_counts(events):
    counts = {}
    for i in range(1, len(events)):
        event = events[i]
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]
        if repo not in counts:
            counts[repo] = 0
        counts[repo] = 1
    return counts

events = [
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651051", "type": "WatchEvent", "repo": "octo/api"},
    {"id": "2489651057", "type": "PushEvent", "repo": "rails/rails"},
    {"id": "2489651064", "type": "PushEvent", "repo": "octo/api"},
]
print(push_counts(events))
`,
      answer: src`
def push_counts(events):
    counts = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]
        if repo not in counts:
            counts[repo] = 0
        counts[repo] += 1
    return counts

events = [
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651051", "type": "WatchEvent", "repo": "octo/api"},
    {"id": "2489651057", "type": "PushEvent", "repo": "rails/rails"},
    {"id": "2489651064", "type": "PushEvent", "repo": "octo/api"},
]
print(push_counts(events))
`,
      alternatives: [
        src`
from collections import Counter

def push_counts(events):
    counts = Counter()
    for event in events:
        if event["type"] == "PushEvent":
            counts[event["repo"]] += 1
    return dict(counts)
`,
      ],
      wrong: [
        {
          code: src`
def push_counts(events):
    counts = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]
        if repo not in counts:
            counts[repo] = 0
        counts[repo] = 1
    return counts
`,
          fails: ["returns"],
          why: "the first event is visited now, but a second push still replaces the count with 1",
        },
        {
          code: src`
def push_counts(events):
    counts = {}
    for i in range(1, len(events)):
        event = events[i]
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]
        if repo not in counts:
            counts[repo] = 0
        counts[repo] += 1
    return counts
`,
          fails: ["returns"],
          why: "counts add up now, but the day's first event is still skipped",
        },
      ],
      task: {
        checks: [
          fn("returns", "push_counts", [
            example([pushEvents], { "octo/api": 2, "rails/rails": 1 }),
            example([[{ id: "1", type: "PushEvent", repo: "pallets/flask" }]], { "pallets/flask": 1 }),
            example([[{ id: "1", type: "WatchEvent", repo: "octo/api" }, { id: "2", type: "PushEvent", repo: "octo/api" }]], { "octo/api": 1 }),
            hiddenCase("the day's first event is the only push for its repository", [[{ id: "1", type: "PushEvent", repo: "a/first" }, { id: "2", type: "PushEvent", repo: "b/second" }, { id: "3", type: "IssuesEvent", repo: "a/first" }]], { "a/first": 1, "b/second": 1 }),
            hiddenCase("many pushes to one repository", [[{ id: "1", type: "PushEvent", repo: "r/x" }, { id: "2", type: "PushEvent", repo: "r/x" }, { id: "3", type: "PushEvent", repo: "r/x" }, { id: "4", type: "PushEvent", repo: "r/x" }]], { "r/x": 4 }),
            hiddenCase("no push events at all", [[{ id: "1", type: "WatchEvent", repo: "r/x" }, { id: "2", type: "ForkEvent", repo: "r/y" }]], {}),
            hiddenCase("no events", [[]], {}),
          ], { label: "push_counts() counts every PushEvent per repository" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-03 debugging, easy
  {
    id: "PY-Q24-03",
    version: 2,
    slug: "warnings-that-never-arrive",
    title: "Warnings that never reach the log",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "boolean", "continue-statement", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "log-call", "log-warning", "logical", "membership", "print-call", "string-check", "string-format", "string-index", "top-level-indent"],
    prompt: "`invalid_codes` returns the barcodes that aren't 8 or 13 digits, and is meant to log a WARNING naming each bad product. The nightly job runs at WARNING level and its log has never shown one, although the returned list is right. Run the starter (it sets the level to DEBUG and prints the log to the console), read what logging itself reports, and fix the logging call.",
    spec: [
      ["Function", "`invalid_codes(products)`, using the logger `log = logging.getLogger(\"barcodes\")`"],
      ["Returns", "the codes that are not all digits with length 8 or 13, in order"],
      ["Logs", "one WARNING per bad product: `product <name> has invalid code <code>`"],
    ],
    hiddenKinds: ["two bad products", "a code with letters in it", "every code valid"],
    hints: [
      "There are two problems. Running the starter shows one of them: logging prints `--- Logging error ---` and a traceback instead of your message. Read its last line.",
      "`%d` asks for a whole number. What type is a barcode here? And at which level does the message go out?",
      "Use the placeholder for any value, and the logger method for the WARNING level.",
    ],
    explanation: "The call had two independent faults. `%d` needs a number, but the code is text, so formatting the record raises `TypeError`; logging catches that, prints `--- Logging error ---` to the error stream and drops the message. And `log.debug` is below WARNING, so even a correctly formatted message would be filtered out in production. `log.warning(\"product %s has invalid code %s\", name, code)` fixes both. Logging formats lazily (only when a record is emitted), which is why the formatting bug never crashed the program and went unnoticed.",
    code: {
      starter: src`
import logging
import sys

log = logging.getLogger("barcodes")

def invalid_codes(products):
    bad = []
    for product in products:
        code = product["code"]
        if not (code.isdigit() and len(code) in [8, 13]):
            bad.append(code)
            log.debug("product %s has invalid code %d", product["name"], code)
    return bad

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s", force=True)
products = [
    {"code": "3017620422003", "name": "Nutella"},
    {"code": "30176", "name": "Hazelnut spread"},
    {"code": "5449000000996", "name": "Coca-Cola"},
    {"code": "87157239", "name": "Gouda slices"},
]
print(invalid_codes(products))
`,
      answer: src`
import logging
import sys

log = logging.getLogger("barcodes")

def invalid_codes(products):
    bad = []
    for product in products:
        code = product["code"]
        if not (code.isdigit() and len(code) in [8, 13]):
            bad.append(code)
            log.warning("product %s has invalid code %s", product["name"], code)
    return bad

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s", force=True)
products = [
    {"code": "3017620422003", "name": "Nutella"},
    {"code": "30176", "name": "Hazelnut spread"},
    {"code": "5449000000996", "name": "Coca-Cola"},
    {"code": "87157239", "name": "Gouda slices"},
]
print(invalid_codes(products))
`,
      alternatives: [
        src`
import logging

log = logging.getLogger("barcodes")

def invalid_codes(products):
    bad = []
    for product in products:
        code = product["code"]
        if code.isdigit() and len(code) in [8, 13]:
            continue
        bad.append(code)
        log.warning(f"product {product['name']} has invalid code {code}")
    return bad
`,
      ],
      wrong: [
        {
          code: src`
import logging

log = logging.getLogger("barcodes")

def invalid_codes(products):
    bad = []
    for product in products:
        code = product["code"]
        if not (code.isdigit() and len(code) in [8, 13]):
            bad.append(code)
            log.warning("product %s has invalid code %d", product["name"], code)
    return bad
`,
          fails: ["logs", "logs-two"],
          why: "the level is right now, but `%d` still can't format a text code, so logging drops every message",
        },
        {
          code: src`
import logging

log = logging.getLogger("barcodes")

def invalid_codes(products):
    bad = []
    for product in products:
        code = product["code"]
        if not (code.isdigit() and len(code) in [8, 13]):
            bad.append(code)
            log.debug("product %s has invalid code %s", product["name"], code)
    return bad
`,
          fails: ["logs", "logs-two"],
          why: "the message formats now, but at DEBUG it is filtered out by a job running at WARNING",
        },
      ],
      task: {
        checks: [
          fn("returns", "invalid_codes", [
            example([barcodeProducts], ["30176"]),
            hiddenCase("a code with letters in it", [[{ code: "50000B5940", name: "Tea" }, { code: "87157239", name: "Gouda" }]], ["50000B5940"]),
            hiddenCase("every code valid", [[{ code: "87157239", name: "Gouda" }]], []),
          ], { label: "invalid_codes() returns the bad codes" }),
          expr("logs", "A WARNING names the bad product", captureLogs("_ret = invalid_codes([{'code': '3017620422003', 'name': 'Nutella'}, {'code': '30176', 'name': 'Hazelnut spread'}])"), ["WARNING barcodes: product Hazelnut spread has invalid code 30176"], { show: "the log of invalid_codes(<Nutella and a 5-digit code>)" }),
          expr("logs-two", "One WARNING per bad product", captureLogs("_ret = invalid_codes([{'code': 'ABC', 'name': 'Tea'}, {'code': '12', 'name': 'Jam'}])"), ["WARNING barcodes: product Tea has invalid code ABC", "WARNING barcodes: product Jam has invalid code 12"], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-06 function implementation, easy
  {
    id: "PY-Q24-06",
    version: 2,
    slug: "compact-call-stack",
    title: "A compact call stack",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "continue-statement", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "module-file", "nested-index", "none-value", "print-call", "reassignment", "string-format", "string-index", "top-level-indent", "tuple-unpack", "unquoted-name"],
    prompt: "An error dashboard shows each crash's call stack on one screen. A deep recursion can produce hundreds of identical frames, so Python's own tracebacks collapse them (`[Previous line repeated 996 more times]`). Write `compact_stack(frames)` that does the same for the dashboard: one entry per frame, oldest first, with each run of identical **consecutive** frames shown once with a count.",
    spec: [
      ["Function", "`compact_stack(frames)`"],
      ["frames", "a list of `[file, line, function]` lists, oldest call first, like `traceback.extract_tb` gives"],
      ["Returns", "a list of texts `\"function (file:line)\"`; a run of 2 or more identical consecutive frames becomes one text ending in ` x<count>`"],
      ["Identical", "same file, same line and same function; the same function on another line is a different frame"],
    ],
    hiddenKinds: ["one function on two different lines", "a frame that repeats, but not next to itself", "a run of repeats at the very end", "a single frame", "the same function name in two files"],
    hints: [
      "Walk the frames while remembering the previous frame and how many times in a row it has appeared.",
      "When the frame changes, the run that just ended can be written out; don't forget the last run after the loop.",
      "Only add the ` x<count>` suffix when the count is more than 1, and compare whole frames, not just the function name.",
    ],
    explanation: "This is run-length encoding over frames. Keep the previous frame and a counter; when a different frame arrives, emit the previous one (with ` xN` when N > 1) and start a new run. The last run is still open when the loop ends, so it has to be emitted afterwards. Comparing only the function name merges a recursive call with the line that finally failed; counting every occurrence with a dictionary merges frames that weren't consecutive, which hides the real order of calls.",
    code: {
      starter: src`
def compact_stack(frames):
    return []

frames = [
    ["tree.py", 30, "<module>"],
    ["tree.py", 12, "depth"],
    ["tree.py", 12, "depth"],
    ["tree.py", 12, "depth"],
    ["tree.py", 9, "depth"],
]
for entry in compact_stack(frames):
    print(entry)
`,
      answer: src`
def compact_stack(frames):
    compact = []
    previous = None
    count = 0
    for frame in frames:
        if frame == previous:
            count += 1
            continue
        if previous is not None:
            compact.append(describe(previous, count))
        previous = frame
        count = 1
    if previous is not None:
        compact.append(describe(previous, count))
    return compact

def describe(frame, count):
    file, line, function = frame
    text = f"{function} ({file}:{line})"
    if count > 1:
        text += f" x{count}"
    return text

frames = [
    ["tree.py", 30, "<module>"],
    ["tree.py", 12, "depth"],
    ["tree.py", 12, "depth"],
    ["tree.py", 12, "depth"],
    ["tree.py", 9, "depth"],
]
for entry in compact_stack(frames):
    print(entry)
`,
      alternatives: [
        src`
def compact_stack(frames):
    runs = []
    for frame in frames:
        if runs and runs[-1][0] == frame:
            runs[-1][1] += 1
        else:
            runs.append([frame, 1])
    result = []
    for frame, count in runs:
        suffix = f" x{count}" if count > 1 else ""
        result.append(f"{frame[2]} ({frame[0]}:{frame[1]}){suffix}")
    return result
`,
      ],
      wrong: [
        {
          code: src`
def compact_stack(frames):
    runs = []
    for file, line, function in frames:
        if runs and runs[-1][0] == function:
            runs[-1][3] += 1
        else:
            runs.append([function, file, line, 1])
    result = []
    for function, file, line, count in runs:
        suffix = f" x{count}" if count > 1 else ""
        result.append(f"{function} ({file}:{line}){suffix}")
    return result
`,
          fails: ["returns"],
          why: "it compares only function names, so the recursive calls and the line that failed are merged into one entry",
        },
        {
          code: src`
def compact_stack(frames):
    counts = {}
    for file, line, function in frames:
        key = f"{function} ({file}:{line})"
        if key not in counts:
            counts[key] = 0
        counts[key] += 1
    result = []
    for key, count in counts.items():
        result.append(key + (f" x{count}" if count > 1 else ""))
    return result
`,
          fails: ["returns"],
          why: "a dictionary counts every repeat, even ones that weren't next to each other, so the order of calls is lost",
        },
        {
          code: src`
def compact_stack(frames):
    compact = []
    count = 0
    for i in range(len(frames)):
        if i > 0 and frames[i] == frames[i - 1]:
            count += 1
            continue
        file, line, function = frames[i]
        compact.append(f"{function} ({file}:{line})")
        count = 0
    return compact
`,
          fails: ["returns"],
          why: "repeats are dropped without ever writing their count",
        },
      ],
      task: {
        checks: [
          fn("returns", "compact_stack", [
            example([deepTrace], ["<module> (tree.py:30)", "depth (tree.py:12) x3", "depth (tree.py:9)"]),
            example([shortTrace], ["<module> (main.py:14)", "price_report (main.py:9)", "unit_price (main.py:4)"]),
            example([[]], []),
            hiddenCase("one function on two different lines", [[["a.py", 3, "walk"], ["a.py", 5, "walk"]]], ["walk (a.py:3)", "walk (a.py:5)"]),
            hiddenCase("a frame that repeats, but not next to itself", [[["m.py", 1, "a"], ["m.py", 2, "b"], ["m.py", 1, "a"]]], ["a (m.py:1)", "b (m.py:2)", "a (m.py:1)"]),
            hiddenCase("a run of repeats at the very end", [[["m.py", 1, "<module>"], ["m.py", 7, "f"], ["m.py", 7, "f"]]], ["<module> (m.py:1)", "f (m.py:7) x2"]),
            hiddenCase("a single frame", [[["solo.py", 1, "<module>"]]], ["<module> (solo.py:1)"]),
            hiddenCase("the same function name in two files", [[["a.py", 4, "load"], ["b.py", 4, "load"]]], ["load (a.py:4)", "load (b.py:4)"]),
          ], { label: "compact_stack() collapses consecutive identical frames" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-10 validation, easy
  {
    id: "PY-Q24-10",
    version: 2,
    slug: "product-record-problems",
    title: "What's wrong with this product record",
    format: "validation",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "comparison", "conversion", "dict-get", "dict-literal", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "string-check", "string-index", "string-method", "top-level-indent", "truthiness", "try-except"],
    prompt: "Before an import decides whether to fix, skip or stop, it needs to know exactly what is wrong with each Open Food Facts record. Write `product_problems(product)`: return the list of problems found, in a fixed order, or `[]` for a clean record. Missing keys are possible, and nothing should crash.",
    spec: [
      ["Function", "`product_problems(product)`"],
      ["product", "a dictionary that may have `code`, `product_name` and `sugars_100g` (all text, or `None`)"],
      ["Code", "missing, `None` or blank → `\"missing code\"`; otherwise not all digits, or not 8 or 13 long → `\"bad code\"`"],
      ["Name", "missing, `None` or blank (spaces only count as blank) → `\"missing name\"`"],
      ["Sugars", "missing, `None` or blank → `\"missing sugars\"`; not a number → `\"bad sugars\"`; below 0 or above 100 → `\"sugars out of range\"` (0 and 100 are fine)"],
      ["Order", "code, then name, then sugars; at most one problem for each"],
    ],
    hiddenKinds: ["an 8-digit barcode", "keys missing altogether", "sugars exactly 0 and exactly 100", "a name made of spaces", "sugars written with a comma", "every field wrong"],
    hints: [
      "Read each field with `get`, so a missing key gives `None` instead of a KeyError, and treat `None` and blank text the same way.",
      "For the sugars, try the conversion and catch only the error a bad number raises; the range check needs the converted number.",
      "Each field contributes at most one problem: decide missing first, then format, then range.",
    ],
    explanation: "`get` makes missing keys behave like `None`, and `(value or \"\").strip()` turns both `None` and spaces into an empty text, so one test covers missing and blank. The barcode check needs both conditions: digits only and a length of 8 (EAN-8) or 13 (EAN-13). Sugars go through `float` inside `try`/`except ValueError`, so `\"12,5\"` becomes `\"bad sugars\"` rather than a crash; the range test uses `< 0` and `> 100` so the boundaries themselves are valid.",
    code: {
      starter: src`
def product_problems(product):
    problems = []
    return problems

print(product_problems({"code": "3017620422003", "product_name": "Nutella", "sugars_100g": "56.3"}))
print(product_problems({"code": "30176", "product_name": " ", "sugars_100g": "-2"}))
`,
      answer: src`
def product_problems(product):
    problems = []
    code = (product.get("code") or "").strip()
    if not code:
        problems.append("missing code")
    elif not code.isdigit() or len(code) not in [8, 13]:
        problems.append("bad code")
    if not (product.get("product_name") or "").strip():
        problems.append("missing name")
    sugars = (product.get("sugars_100g") or "").strip()
    if not sugars:
        problems.append("missing sugars")
    else:
        try:
            grams = float(sugars)
        except ValueError:
            problems.append("bad sugars")
        else:
            if grams < 0 or grams > 100:
                problems.append("sugars out of range")
    return problems

print(product_problems({"code": "3017620422003", "product_name": "Nutella", "sugars_100g": "56.3"}))
print(product_problems({"code": "30176", "product_name": " ", "sugars_100g": "-2"}))
`,
      alternatives: [
        src`
def sugar_problem(text):
    if text is None or text.strip() == "":
        return "missing sugars"
    try:
        grams = float(text)
    except ValueError:
        return "bad sugars"
    if 0 <= grams <= 100:
        return None
    return "sugars out of range"

def product_problems(product):
    found = []
    code = product.get("code")
    if code is None or code.strip() == "":
        found.append("missing code")
    elif not (code.isdigit() and len(code) in [8, 13]):
        found.append("bad code")
    name = product.get("product_name")
    if name is None or name.strip() == "":
        found.append("missing name")
    sugar = sugar_problem(product.get("sugars_100g"))
    if sugar is not None:
        found.append(sugar)
    return found
`,
      ],
      wrong: [
        {
          code: src`
def product_problems(product):
    problems = []
    code = product["code"]
    if not code:
        problems.append("missing code")
    elif not code.isdigit() or len(code) not in [8, 13]:
        problems.append("bad code")
    if not product["product_name"].strip():
        problems.append("missing name")
    sugars = product["sugars_100g"]
    if not sugars:
        problems.append("missing sugars")
    else:
        try:
            grams = float(sugars)
            if grams < 0 or grams > 100:
                problems.append("sugars out of range")
        except ValueError:
            problems.append("bad sugars")
    return problems
`,
          fails: ["returns"],
          why: "square brackets crash with KeyError when a field is missing from the record",
        },
        {
          code: src`
def product_problems(product):
    problems = []
    code = (product.get("code") or "").strip()
    if not code:
        problems.append("missing code")
    elif not code.isdigit() or len(code) != 13:
        problems.append("bad code")
    if not (product.get("product_name") or "").strip():
        problems.append("missing name")
    sugars = (product.get("sugars_100g") or "").strip()
    if not sugars:
        problems.append("missing sugars")
    else:
        try:
            grams = float(sugars)
        except ValueError:
            problems.append("bad sugars")
        else:
            if grams <= 0 or grams >= 100:
                problems.append("sugars out of range")
    return problems
`,
          fails: ["returns"],
          why: "8-digit barcodes are rejected, and sugars of exactly 0 or 100 are called out of range",
        },
      ],
      task: {
        checks: [
          fn("returns", "product_problems", [
            example([{ code: "3017620422003", product_name: "Nutella", sugars_100g: "56.3" }], []),
            example([{ code: "30176", product_name: " ", sugars_100g: "-2" }], ["bad code", "missing name", "sugars out of range"]),
            example([{ code: "", product_name: "Water", sugars_100g: null }], ["missing code", "missing sugars"]),
            hiddenCase("an 8-digit barcode", [{ code: "87157239", product_name: "Gouda slices", sugars_100g: "0.1" }], []),
            hiddenCase("keys missing altogether", [{ product_name: "Mystery" }], ["missing code", "missing sugars"]),
            hiddenCase("sugars exactly 0 and exactly 100", [{ code: "5449000000996", product_name: "Sugar", sugars_100g: "100" }], []),
            hiddenCase("a name made of spaces", [{ code: "5449000000996", product_name: "   ", sugars_100g: "0" }], ["missing name"]),
            hiddenCase("sugars written with a comma", [{ code: "5449000000996", product_name: "Cola", sugars_100g: "10,6" }], ["bad sugars"]),
            hiddenCase("every field wrong", [{ code: "12AB", product_name: null, sugars_100g: "250" }], ["bad code", "missing name", "sugars out of range"]),
          ], { label: "product_problems() lists every problem in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-12 integration, medium
  {
    id: "PY-Q24-12",
    version: 2,
    slug: "shrink-a-failing-input",
    title: "Shrink a failing input",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "reassignment", "string-index", "string-slice", "top-level-indent", "truthiness", "while-loop"],
    prompt: "The first step of debugging is a small input that still shows the bug. Doing that by hand on a 500-row file is slow, so automate it. Write `shrink_failure(items, fails)`: `fails(some_list)` is the caller's own test and returns `True` when the bug shows up for that list. Starting from `items` (for which `fails` is True), remove items one at a time, keeping each removal only if the bug still shows, and return what is left.",
    spec: [
      ["Function", "`shrink_failure(items, fails)`"],
      ["Method", "start at position 0. Try the list without the item at the current position: if `fails` is still True, keep that shorter list and stay at the same position; otherwise move to the next position. Stop at the end of the list"],
      ["Returns", "a new list; the items left keep their original order"],
      ["Must not", "change `items`"],
    ],
    hiddenKinds: ["two needed items next to each other", "more candidates than the bug needs", "every item is needed", "nothing is needed at all", "the bug needs two equal items", "a crash caused by one blank row"],
    hints: [
      "Keep a current list (a copy of `items`) and a position. Use a `while` loop, because the list gets shorter as you go.",
      "The candidate is the current list without one item: a slice before the position joined with a slice after it.",
      "After a successful removal, the next item has moved into the same position, so don't advance; advance only when the removal made the bug disappear.",
    ],
    explanation: "This is a simple form of delta debugging. Each step asks the caller's test whether one item can go. Staying at the same position after a removal is the subtle part: the list shifted left, so the item now at that position hasn't been tried yet. Advancing anyway skips it. Deciding removals one at a time also matters: two items may each be removable alone but not together (\"at least two negative numbers\"), so collecting every removable item first and dropping them all at once can lose the bug entirely. Working on a copy leaves the caller's list intact for the bug report.",
    code: {
      starter: src`
def shrink_failure(items, fails):
    return items

def has_two_negatives(prices):
    negatives = 0
    for price in prices:
        if price < 0:
            negatives += 1
    return negatives >= 2

print(shrink_failure([12.5, 3.0, -1.0, 7.25, -4.0, 9.99], has_two_negatives))
`,
      answer: src`
def shrink_failure(items, fails):
    current = list(items)
    position = 0
    while position < len(current):
        candidate = current[:position] + current[position + 1:]
        if fails(candidate):
            current = candidate
        else:
            position += 1
    return current

def has_two_negatives(prices):
    negatives = 0
    for price in prices:
        if price < 0:
            negatives += 1
    return negatives >= 2

print(shrink_failure([12.5, 3.0, -1.0, 7.25, -4.0, 9.99], has_two_negatives))
`,
      alternatives: [
        src`
def shrink_failure(items, fails):
    current = items.copy()
    i = 0
    while i < len(current):
        removed = current.pop(i)
        if not fails(current):
            current.insert(i, removed)
            i += 1
    return current
`,
      ],
      wrong: [
        {
          code: src`
def shrink_failure(items, fails):
    current = list(items)
    position = 0
    while position < len(current):
        candidate = current[:position] + current[position + 1:]
        if fails(candidate):
            current = candidate
        position += 1
    return current
`,
          fails: ["adjacent", "blank", "none-needed", "pairs", "returns"],
          why: "it moves on after a removal, so the item that slid into that position is never tried and unneeded items survive",
        },
        {
          code: src`
def shrink_failure(items, fails):
    keep = []
    for i in range(len(items)):
        if not fails(items[:i] + items[i + 1:]):
            keep.append(items[i])
    return keep
`,
          fails: ["pairs", "spare"],
          why: "it decides every removal against the original list and drops them all at once, which can remove the bug itself",
        },
        {
          code: src`
def shrink_failure(items, fails):
    position = 0
    while position < len(items):
        removed = items.pop(position)
        if not fails(items):
            items.insert(position, removed)
            position += 1
    return items
`,
          fails: ["keeps-input"],
          why: "the result is right, but it shrinks the caller's own list, so the original failing input is lost",
        },
      ],
      task: {
        checks: [
          expr("returns", "Two negative prices are all that's needed", "def _two_neg(xs):\n    return sum(1 for x in xs if x < 0) >= 2\nresult = shrink_failure([12.5, 3.0, -1.0, 7.25, -4.0, 9.99], _two_neg)", [py.float(-1), py.float(-4)], { show: "shrink_failure([12.5, 3.0, -1.0, 7.25, -4.0, 9.99], has_two_negatives)" }),
          expr("blank", "One blank row causes a crash", "def _crashes(rows):\n    return '' in rows\nresult = shrink_failure(['489434,12', '', '489435,4', '489436,1'], _crashes)", [""], { show: "shrink_failure(['489434,12', '', '489435,4', '489436,1'], crashes_on_blank)" }),
          expr("adjacent", "Two needed items next to each other", "def _two_neg(xs):\n    return sum(1 for x in xs if x < 0) >= 2\nresult = shrink_failure([5, 6, -1, -2], _two_neg)", [-1, -2], { hidden: true }),
          expr("pairs", "The bug needs two equal items", "def _dup(xs):\n    return any(xs.count(x) > 1 for x in xs)\nresult = shrink_failure(['O1', 'O2', 'O1', 'O3', 'O2'], _dup)", ["O2", "O2"], { hidden: true }),
          expr("spare", "More candidates than the bug needs", "def _two_neg(xs):\n    return sum(1 for x in xs if x < 0) >= 2\nresult = shrink_failure([-1, -2, -3], _two_neg)", [-2, -3], { hidden: true }),
          expr("all-needed", "Every item is needed", "def _three(xs):\n    return len(xs) == 3\nresult = shrink_failure(['a', 'b', 'c'], _three)", ["a", "b", "c"], { hidden: true }),
          expr("none-needed", "Nothing is needed at all", "def _always(xs):\n    return True\nresult = shrink_failure([1, 2, 3], _always)", [], { hidden: true }),
          expr("keeps-input", "The caller's list is unchanged", "def _two_neg(xs):\n    return sum(1 for x in xs if x < 0) >= 2\n_rows = [5, -1, 6, -2]\n_out = shrink_failure(_rows, _two_neg)\nresult = _rows", [5, -1, 6, -2], { show: "items after shrink_failure(items, has_two_negatives)" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-13 function implementation, medium
  {
    id: "PY-Q24-13",
    version: 2,
    slug: "problems-per-logger",
    title: "Problems per logger",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "module-file", "nested-condition", "print-call", "print-several", "print-text", "raise-stmt", "spaces-in-text", "string-format", "string-index", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack"],
    prompt: "An on-call engineer wants to know which part of a program is producing problems. The log was written with the format `LEVEL name: message`, and tracebacks are mixed in. Write `level_counts(lines, min_level)`: count, per logger name, the records at `min_level` or more serious.",
    spec: [
      ["Function", "`level_counts(lines, min_level)`"],
      ["Levels", "`DEBUG` < `INFO` < `WARNING` < `ERROR` < `CRITICAL`, by severity (not alphabetically)"],
      ["Record", "a line whose first word is one of those five level names, followed by the logger name, `: ` and the message; the message itself may contain `: `"],
      ["Other lines", "traceback lines and anything else are not records and are ignored"],
      ["Returns", "a dictionary from logger name to count; loggers with no qualifying records don't appear"],
      ["Raises", "`ValueError` if `min_level` is not one of the five names"],
    ],
    hiddenKinds: ["a traceback whose last line looks like a record", "min_level DEBUG counts everything", "dotted logger names", "a level that sorts differently as text", "an unknown min_level", "no lines"],
    hints: [
      "Give each level name a number so severities can be compared: a dictionary from name to number is enough.",
      "For each line, split off the first word; if it isn't a level name, skip the line. The logger name ends at the first `: ` after it.",
      "Compare the line's number with `min_level`'s number using `>=`. Check `min_level` before the loop and raise if it is unknown.",
    ],
    explanation: "Log levels are ordered by severity, which has nothing to do with alphabetical order (`\"INFO\" > \"ERROR\"` as text), so the comparison needs numbers: logging itself uses DEBUG=10 up to CRITICAL=50. A traceback's last line such as `OSError: connection reset` starts with an error name, not a level, so checking the first word against the five level names filters it out. `partition(\": \")` splits at the first separator, which keeps colons inside messages intact.",
    code: {
      starter: src`
def level_counts(lines, min_level):
    return {}

log = [
    "INFO prices: loaded 3 lines",
    "WARNING prices: line 2: bad price 'x'",
    "ERROR sync: could not sync lyon",
    "Traceback (most recent call last):",
    '  File "main.py", line 9, in sync_all',
    "OSError: connection reset",
    "WARNING prices: line 7: expected 2 fields",
]
print(level_counts(log, "WARNING"))
`,
      answer: src`
SEVERITY = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}

def level_counts(lines, min_level):
    if min_level not in SEVERITY:
        raise ValueError(f"unknown level {min_level}")
    counts = {}
    for line in lines:
        level, _, rest = line.partition(" ")
        name, separator, _ = rest.partition(": ")
        if level not in SEVERITY or not separator:
            continue
        if SEVERITY[level] >= SEVERITY[min_level]:
            counts[name] = counts.get(name, 0) + 1
    return counts

log = [
    "INFO prices: loaded 3 lines",
    "WARNING prices: line 2: bad price 'x'",
    "ERROR sync: could not sync lyon",
    "Traceback (most recent call last):",
    '  File "main.py", line 9, in sync_all',
    "OSError: connection reset",
    "WARNING prices: line 7: expected 2 fields",
]
print(level_counts(log, "WARNING"))
`,
      alternatives: [
        src`
ORDER = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

def level_counts(lines, min_level):
    if min_level not in ORDER:
        raise ValueError("unknown level")
    wanted = ORDER[ORDER.index(min_level):]
    result = {}
    for line in lines:
        words = line.split(" ", 1)
        if len(words) < 2 or words[0] not in ORDER or ": " not in words[1]:
            continue
        name = words[1].split(": ")[0]
        if words[0] in wanted:
            if name not in result:
                result[name] = 0
            result[name] += 1
    return result
`,
      ],
      wrong: [
        {
          code: src`
def level_counts(lines, min_level):
    if min_level not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
        raise ValueError(min_level)
    counts = {}
    for line in lines:
        level, _, rest = line.partition(" ")
        name, separator, _ = rest.partition(": ")
        if level not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] or not separator:
            continue
        if level >= min_level:
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
          fails: ["returns"],
          why: "level names are compared as text, so INFO counts as more serious than ERROR",
        },
        {
          code: src`
SEVERITY = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}

def level_counts(lines, min_level):
    counts = {}
    for line in lines:
        level, rest = line.split(" ", 1)
        name = rest.split(":")[0]
        if SEVERITY[level] >= SEVERITY[min_level]:
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
          fails: ["returns", "unknown"],
          why: "every line is treated as a record, so the first traceback line crashes it, and an unknown level raises KeyError instead of ValueError",
        },
        {
          code: src`
SEVERITY = {"DEBUG": 10, "INFO": 20, "WARNING": 30, "ERROR": 40, "CRITICAL": 50}

def level_counts(lines, min_level):
    if min_level not in SEVERITY:
        raise ValueError(min_level)
    counts = {}
    for line in lines:
        level, _, rest = line.partition(" ")
        name, separator, _ = rest.partition(": ")
        if level in SEVERITY and separator and SEVERITY[level] > SEVERITY[min_level]:
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
          fails: ["returns"],
          why: "`>` leaves out the records at exactly `min_level`",
        },
      ],
      task: {
        checks: [
          fn("returns", "level_counts", [
            example([nightlyLog, "WARNING"], { prices: 2, sync: 1 }),
            example([nightlyLog, "ERROR"], { sync: 1 }),
            example([nightlyLog, "INFO"], { prices: 3, sync: 1 }),
            hiddenCase("a traceback whose last line looks like a record", [["ERROR jobs: import failed", "Traceback (most recent call last):", "ValueError: bad: really bad", "CRITICAL jobs: giving up"], "ERROR"], { jobs: 2 }),
            hiddenCase("min_level DEBUG counts everything", [["DEBUG a: x", "INFO a: y", "CRITICAL b: z"], "DEBUG"], { a: 2, b: 1 }),
            hiddenCase("dotted logger names", [["WARNING app.prices: x", "WARNING app.sync: y", "WARNING app.prices: z"], "WARNING"], { "app.prices": 2, "app.sync": 1 }),
            hiddenCase("a level that sorts differently as text", [["INFO a: started", "ERROR a: failed", "DEBUG b: detail"], "ERROR"], { a: 1 }),
            hiddenCase("no lines", [[], "INFO"], {}),
          ], { label: "level_counts() counts records at or above the level, per logger" }),
          fn("unknown", "level_counts", [
            raisesCase([["INFO a: x"], "LOUD"], "ValueError", { label: "an unknown min_level" }),
          ], { label: "level_counts() refuses an unknown level" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-16 function implementation, medium
  {
    id: "PY-Q24-16",
    version: 2,
    slug: "chained-tracebacks",
    title: "Follow a chained traceback",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "comp-if", "comparison", "conditional-expr", "dict-literal", "else-clause", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "module-file", "newline-escape", "none-value", "precedence", "print-call", "reassignment", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "unquoted-name", "zip-call"],
    prompt: "When an error happens while another one is being handled, Python prints **both** tracebacks, joined by a sentence: `The above exception was the direct cause of the following exception:` when the code used `raise … from err`, or `During handling of the above exception, another exception occurred:` when a second error happened inside an `except` block. Write `error_chain(text)` that reads such a pasted report and returns every error in it, from the original one to the last, with how each is linked to the one before.",
    spec: [
      ["Function", "`error_chain(text)`"],
      ["text", "a full traceback as text; a chain has two or more parts separated by one of the two sentences"],
      ["Returns", "a list of `(error_line, link)` tuples in the order printed; `error_line` is the last non-blank line of that part, stripped"],
      ["link", "`None` for the first error, `\"cause\"` after the *direct cause* sentence, `\"context\"` after the *During handling* sentence"],
    ],
    hiddenKinds: ["a chain of three with both kinds of link", "a traceback that isn't chained", "blank lines and spaces at the ends"],
    hints: [
      "Walk the lines once. Remember the last non-blank line you've seen: when a separator sentence appears, that line is the error of the part that just ended.",
      "A small dictionary from each separator sentence to its link word makes recognising them simple.",
      "The last part has no separator after it, so add its error after the loop.",
    ],
    explanation: "Each part of a chained traceback ends with its own error line, and the separator sentence tells you how the next part relates to it. Reading the separators is the point: `cause` means someone deliberately translated one error into another (`raise ValueError(...) from err`), so the first error is the root cause; `context` usually means a bug in the error handling itself, like the `NameError` raised inside an `except IndexError` block. Taking only the last line of the whole text reports the final symptom and loses the cause.",
    code: {
      starter: src`
def error_chain(text):
    return []

report = """Traceback (most recent call last):
  File "main.py", line 6, in load
    return sugar(row)
  File "main.py", line 3, in sugar
    return float(row["sugars_100g"])
KeyError: 'sugars_100g'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "main.py", line 10, in <module>
    load({"code": "3017620422003"})
  File "main.py", line 8, in load
    raise ValueError(f"product {row['code']} has no sugar value") from err
ValueError: product 3017620422003 has no sugar value
"""
for error in error_chain(report):
    print(error)
`,
      answer: src`
LINKS = {
    "The above exception was the direct cause of the following exception:": "cause",
    "During handling of the above exception, another exception occurred:": "context",
}

def error_chain(text):
    chain = []
    link = None
    last = None
    for line in text.splitlines():
        line = line.strip()
        if line in LINKS:
            chain.append((last, link))
            link = LINKS[line]
        elif line:
            last = line
    if last is not None:
        chain.append((last, link))
    return chain

report = """Traceback (most recent call last):
  File "main.py", line 6, in load
    return sugar(row)
  File "main.py", line 3, in sugar
    return float(row["sugars_100g"])
KeyError: 'sugars_100g'

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "main.py", line 10, in <module>
    load({"code": "3017620422003"})
  File "main.py", line 8, in load
    raise ValueError(f"product {row['code']} has no sugar value") from err
ValueError: product 3017620422003 has no sugar value
"""
for error in error_chain(report):
    print(error)
`,
      alternatives: [
        src`
CAUSE = "The above exception was the direct cause of the following exception:"
CONTEXT = "During handling of the above exception, another exception occurred:"

def error_chain(text):
    parts = []
    links = [None]
    current = []
    for line in text.split("\n"):
        if line.strip() == CAUSE or line.strip() == CONTEXT:
            parts.append(current)
            current = []
            links.append("cause" if line.strip() == CAUSE else "context")
        else:
            current.append(line)
    parts.append(current)
    result = []
    for part, link in zip(parts, links):
        filled = [line.strip() for line in part if line.strip()]
        result.append((filled[-1], link))
    return result
`,
      ],
      wrong: [
        {
          code: src`
def error_chain(text):
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return [(lines[-1], None)]
`,
          fails: ["returns"],
          why: "only the final error is reported, so the root cause disappears",
        },
        {
          code: src`
def error_chain(text):
    chain = []
    link = None
    last = None
    for line in text.splitlines():
        line = line.strip()
        if line.endswith("exception:") or line.endswith("occurred:"):
            chain.append((last, link))
            link = "cause"
        elif line:
            last = line
    chain.append((last, link))
    return chain
`,
          fails: ["returns"],
          why: "both sentences are read as a direct cause, so an error inside an `except` block looks deliberate",
        },
        {
          code: src`
LINKS = {
    "The above exception was the direct cause of the following exception:": "cause",
    "During handling of the above exception, another exception occurred:": "context",
}

def error_chain(text):
    chain = []
    link = None
    last = None
    for line in text.splitlines():
        if line in LINKS:
            chain.append((last, link))
            link = LINKS[line]
        elif line:
            last = line
    chain.append((last, link))
    return chain
`,
          fails: ["returns"],
          why: "lines aren't stripped, so a line of spaces counts as the error and indented text is kept with its spaces",
        },
      ],
      task: {
        checks: [
          fn("returns", "error_chain", [
            example([causeTrace], [py.tuple(py.str("KeyError: 'sugars_100g'"), py.none), py.tuple(py.str("ValueError: product 3017620422003 has no sugar value"), py.str("cause"))]),
            example([contextTrace], [py.tuple(py.str("IndexError: list index out of range"), py.none), py.tuple(py.str("NameError: name 'undefined_name' is not defined"), py.str("context"))]),
            example([plainTrace], [py.tuple(py.str("ZeroDivisionError: division by zero"), py.none)]),
            hiddenCase("a chain of three with both kinds of link", [threeTrace], [py.tuple(py.str("ConnectionRefusedError: [Errno 111] Connection refused"), py.none), py.tuple(py.str("TimeoutError: no answer after 3 tries"), py.str("context")), py.tuple(py.str("RuntimeError: nightly import aborted"), py.str("cause"))]),
            hiddenCase("a traceback that isn't chained", ["Traceback (most recent call last):\n  File \"r.py\", line 2, in <module>\nKeyError: 'Quantity'"], [py.tuple(py.str("KeyError: 'Quantity'"), py.none)]),
            hiddenCase("blank lines and spaces at the ends", ["\n\nTraceback (most recent call last):\n  File \"x.py\", line 1, in <module>\n  OSError: disk full   \n   \n\n  During handling of the above exception, another exception occurred:  \n\nTraceback (most recent call last):\n  File \"x.py\", line 3, in <module>\nPermissionError: read-only\n   \n"], [py.tuple(py.str("OSError: disk full"), py.none), py.tuple(py.str("PermissionError: read-only"), py.str("context"))]),
          ], { label: "error_chain() lists every error with its link" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-19 debugging, medium
  {
    id: "PY-Q24-19",
    version: 2,
    slug: "a-swallowed-error",
    title: "The error that was swallowed",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "continue-statement", "conversion", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-index", "list-literal", "log-call", "log-warning", "membership", "print-call", "string-format", "string-index", "top-level-indent", "try-except"],
    prompt: "`total_weight` should add up the `weight_kg` of a shipment's rows, skipping rows whose weight isn't a number. It returns 0 for every shipment, and nothing in the log explains why. The `except Exception: pass` is hiding the real error. Make the error visible (narrow the `except`), find the actual bug, and fix it so the function meets its contract.",
    spec: [
      ["Function", "`total_weight(rows)`, using the logger `log = logging.getLogger(\"weights\")`"],
      ["Returns", "the sum of the rows' `weight_kg` values as numbers"],
      ["Bad value", "a `weight_kg` that isn't a number is skipped with WARNING `row <n>: bad weight '<text>'` (rows counted from 1)"],
      ["Missing column", "a row with no `weight_kg` key means the file's format changed: the `KeyError` must reach the caller"],
    ],
    hiddenKinds: ["two bad values", "a row without the weight column", "no rows"],
    hints: [
      "Replace `except Exception: pass` with an `except` for the one error a bad number raises, and run the starter again: a different error now stops the program. Read its last line.",
      "The traceback's KeyError names the key the code asked for. Compare it with the keys the rows really have.",
      "Inside the narrowed `except`, log the warning with the row number and the text, quoted with `repr` or `!r`.",
    ],
    explanation: "`except Exception: pass` turned a typo (`weigth_kg`) into a silent wrong answer: every row raised `KeyError`, every error was discarded, and the total stayed 0. Catching only `ValueError`, the error `float(\"n/a\")` raises, lets the `KeyError` surface with a traceback that points straight at the misspelt key. It also keeps the contract for a genuinely missing column: the job stops instead of reporting a weight of 0. Skipped values are logged with their row number and text, so the total can be explained later.",
    code: {
      starter: src`
import logging
import sys

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    for row in rows:
        try:
            total += float(row["weigth_kg"])
        except Exception:
            pass
    return total

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
rows = [{"sku": "21329", "weight_kg": "1.5"}, {"sku": "85048", "weight_kg": "n/a"}, {"sku": "22139", "weight_kg": "0.25"}]
print(total_weight(rows))
`,
      answer: src`
import logging
import sys

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    for number, row in enumerate(rows, start=1):
        text = row["weight_kg"]
        try:
            total += float(text)
        except ValueError:
            log.warning("row %d: bad weight %r", number, text)
    return total

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
rows = [{"sku": "21329", "weight_kg": "1.5"}, {"sku": "85048", "weight_kg": "n/a"}, {"sku": "22139", "weight_kg": "0.25"}]
print(total_weight(rows))
`,
      alternatives: [
        src`
import logging

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    number = 0
    for row in rows:
        number += 1
        try:
            weight = float(row["weight_kg"])
        except ValueError:
            log.warning(f"row {number}: bad weight {row['weight_kg']!r}")
            continue
        total += weight
    return total
`,
      ],
      wrong: [
        {
          code: src`
import logging

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    for row in rows:
        try:
            total += float(row["weight_kg"])
        except Exception:
            pass
    return total
`,
          fails: ["logs", "missing"],
          why: "the typo is fixed, but bad values still vanish without a warning and a missing column is still swallowed",
        },
        {
          code: src`
import logging

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    for number, row in enumerate(rows, start=1):
        try:
            total += float(row["weight_kg"])
        except (ValueError, KeyError):
            log.warning("row %d: bad weight %r", number, row.get("weight_kg"))
    return total
`,
          fails: ["missing"],
          why: "catching KeyError too hides a missing column behind a warning, so a changed file format still gives a wrong total",
        },
        {
          code: src`
import logging

log = logging.getLogger("weights")

def total_weight(rows):
    total = 0
    for number, row in enumerate(rows, start=1):
        try:
            total += float(row["weigth_kg"])
        except ValueError:
            log.warning("row %d: bad weight %r", number, row["weigth_kg"])
    return total
`,
          fails: ["logs", "returns"],
          why: "the `except` is narrowed, but the misspelt key is still there, so every row now raises KeyError",
        },
      ],
      task: {
        checks: [
          fn("returns", "total_weight", [
            example([[{ sku: "21329", weight_kg: "1.5" }, { sku: "85048", weight_kg: "n/a" }, { sku: "22139", weight_kg: "0.25" }]], 1.75),
            hiddenCase("no rows", [[]], 0, {}),
            hiddenCase("two bad values", [[{ sku: "A", weight_kg: "" }, { sku: "B", weight_kg: "2" }, { sku: "C", weight_kg: "heavy" }]], py.float(2)),
          ], { label: "total_weight() adds the numeric weights", compare: { numbers: "int-float-equal" } }),
          expr("logs", "A bad value is logged with its row and text", captureLogs("_ret = total_weight([{'sku': 'A', 'weight_kg': '1'}, {'sku': 'B', 'weight_kg': 'n/a'}])"), ["WARNING weights: row 2: bad weight 'n/a'"], { show: "the log of total_weight(<row 2 has 'n/a'>)" }),
          raisesExpr("missing", "A row without the weight column stops the job", "total_weight([{'sku': 'A', 'weight_kg': '1'}, {'sku': 'B', 'weight': '2'}])", "KeyError", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-20 data transformation, medium
  {
    id: "PY-Q24-20",
    version: 2,
    slug: "duplicate-events-policy",
    title: "Duplicate events: drop, warn or stop",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 18,
    requires: ["assignment", "boolean", "comparison", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "dict-store", "else-clause", "error-policy", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "log-call", "log-warning", "logical", "membership", "nested-loop", "none-value", "print-call", "raise-stmt", "reassignment", "string-format", "string-index", "top-level-indent", "truthiness", "unquoted-name"],
    prompt: "The GitHub event feed is delivered at least once, so the same event can arrive twice. Write `dedupe_events(events)` with this policy. An exact re-delivery (same `id`, identical event) is dropped silently. The same `id` with **different** content means the feed is inconsistent: keep the first, drop the later one and log a WARNING. An event with no `id` at all means the feed format has changed: raise `ValueError`.",
    spec: [
      ["Function", "`dedupe_events(events)`, logging with `log = logging.getLogger(\"events\")`"],
      ["events", "a list of dictionaries, each normally with `id`, `type` and `repo`"],
      ["Returns", "a new list with the first event for each `id`, in the original order"],
      ["Logs", "WARNING `event <id>: conflicting duplicate dropped` for each later event whose content differs from the kept one; nothing for exact repeats"],
      ["Raises", "`ValueError` when an event has no `id`, or an empty one"],
      ["Must not", "change the list it is given"],
    ],
    hiddenKinds: ["an event delivered three times", "an event with an empty id", "no duplicates at all", "no events"],
    hints: [
      "Keep a dictionary from id to the first event seen with it; the output list is built in the same loop.",
      "For a repeated id, compare the whole event with the kept one: `==` on two dictionaries compares every key and value.",
      "Check the id before anything else. `get` with a falsy test covers both a missing and an empty id.",
    ],
    explanation: "One dictionary answers both questions for a repeated id: *have I seen it?* and *was it the same?* Dictionaries compare equal when they have the same keys and values, so an exact re-delivery is recognised without listing fields. Keeping the first occurrence and appending to a new list preserves the feed's order and leaves the caller's list untouched. The three outcomes follow the policy of the lesson: harmless repeats are dropped silently, inconsistent data is dropped with a warning that names the event, and a structural change stops the run because every later decision would be built on a broken assumption.",
    code: {
      starter: src`
import logging
import sys

log = logging.getLogger("events")

def dedupe_events(events):
    return events

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
events = [
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651051", "type": "WatchEvent", "repo": "octo/api"},
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651057", "type": "PushEvent", "repo": "rails/rails"},
    {"id": "2489651051", "type": "ForkEvent", "repo": "octo/api"},
]
for event in dedupe_events(events):
    print(event)
`,
      answer: src`
import logging
import sys

log = logging.getLogger("events")

def dedupe_events(events):
    first = {}
    kept = []
    for event in events:
        event_id = event.get("id")
        if not event_id:
            raise ValueError(f"event without an id: {event}")
        if event_id not in first:
            first[event_id] = event
            kept.append(event)
        elif event != first[event_id]:
            log.warning("event %s: conflicting duplicate dropped", event_id)
    return kept

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
events = [
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651051", "type": "WatchEvent", "repo": "octo/api"},
    {"id": "2489651045", "type": "PushEvent", "repo": "octo/api"},
    {"id": "2489651057", "type": "PushEvent", "repo": "rails/rails"},
    {"id": "2489651051", "type": "ForkEvent", "repo": "octo/api"},
]
for event in dedupe_events(events):
    print(event)
`,
      alternatives: [
        src`
import logging

log = logging.getLogger("events")

def dedupe_events(events):
    result = []
    for event in events:
        if "id" not in event or event["id"] == "":
            raise ValueError("missing id")
        earlier = None
        for kept in result:
            if kept["id"] == event["id"]:
                earlier = kept
        if earlier is None:
            result.append(event)
            continue
        if earlier != event:
            log.warning(f"event {event['id']}: conflicting duplicate dropped")
    return result
`,
      ],
      wrong: [
        {
          code: src`
import logging

log = logging.getLogger("events")

def dedupe_events(events):
    by_id = {}
    for event in events:
        if not event.get("id"):
            raise ValueError("missing id")
        if event["id"] in by_id and by_id[event["id"]] != event:
            log.warning("event %s: conflicting duplicate dropped", event["id"])
        by_id[event["id"]] = event
    return list(by_id.values())
`,
          fails: ["returns"],
          why: "each later event overwrites the earlier one, so the conflicting duplicate is kept instead of the first",
        },
        {
          code: src`
import logging

log = logging.getLogger("events")

def dedupe_events(events):
    seen = {}
    kept = []
    for event in events:
        if not event.get("id"):
            raise ValueError("missing id")
        if event["id"] in seen:
            log.warning("event %s: conflicting duplicate dropped", event["id"])
            continue
        seen[event["id"]] = True
        kept.append(event)
    return kept
`,
          fails: ["logs"],
          why: "an exact re-delivery is harmless, but it is warned about as if it were a conflict",
        },
        {
          code: src`
import logging

log = logging.getLogger("events")

def dedupe_events(events):
    first = {}
    kept = []
    for event in events:
        event_id = event.get("id")
        if not event_id:
            log.warning("event without id skipped")
            continue
        if event_id not in first:
            first[event_id] = event
            kept.append(event)
        elif event != first[event_id]:
            log.warning("event %s: conflicting duplicate dropped", event_id)
    return kept
`,
          fails: ["no-id", "empty-id"],
          why: "an event without an id is skipped, but it signals a changed feed format, which must stop the run",
        },
      ],
      task: {
        checks: [
          fn("returns", "dedupe_events", [
            example([events], [events[0], events[1], events[3]]),
            example([[]], []),
            hiddenCase("an event delivered three times", [[{ id: "7", type: "PushEvent", repo: "a/b" }, { id: "7", type: "PushEvent", repo: "a/b" }, { id: "7", type: "PushEvent", repo: "a/b" }]], [{ id: "7", type: "PushEvent", repo: "a/b" }]),
            hiddenCase("no duplicates at all", [[{ id: "2", type: "ForkEvent", repo: "x/y" }, { id: "1", type: "PushEvent", repo: "x/y" }]], [{ id: "2", type: "ForkEvent", repo: "x/y" }, { id: "1", type: "PushEvent", repo: "x/y" }]),
          ], { label: "dedupe_events() keeps the first event per id, in order" }),
          fn("keeps-input", "dedupe_events", [keepsInput([events])], { label: "dedupe_events() leaves the feed list unchanged" }),
          expr("logs", "Only conflicting duplicates are warned about", captureLogs("_ret = dedupe_events([{'id': '1', 'type': 'PushEvent', 'repo': 'a/b'}, {'id': '1', 'type': 'PushEvent', 'repo': 'a/b'}, {'id': '2', 'type': 'WatchEvent', 'repo': 'a/b'}, {'id': '2', 'type': 'ForkEvent', 'repo': 'a/b'}])"), ["WARNING events: event 2: conflicting duplicate dropped"], { show: "the log of dedupe_events(<one exact repeat, one conflict>)" }),
          raisesExpr("no-id", "An event without an id stops the run", "dedupe_events([{'id': '1', 'type': 'PushEvent', 'repo': 'a/b'}, {'type': 'PushEvent', 'repo': 'a/b'}])", "ValueError", { show: "dedupe_events(<an event without an id>)" }),
          raisesExpr("empty-id", "An event with an empty id stops the run", "dedupe_events([{'id': '', 'type': 'PushEvent', 'repo': 'a/b'}])", "ValueError", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q24-22 output prediction, hard
  {
    id: "PY-Q24-22",
    version: 2,
    slug: "inspect-the-records",
    title: "What the inspect lines reveal",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["assignment", "conversion", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "string-index", "string-method", "top-level-indent"],
    prompt: "Someone added labelled `repr` prints to find out why every cleaned product ends up with the same barcode. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Follow `record`: how many dictionaries does this program create with braces?",
      "The inspect line runs right after each change, so it shows the value at that moment. The last two prints run after the loop has finished.",
      "`is` asks whether two names refer to the very same object.",
    ],
    explanation: "`record = template` doesn't copy anything: every pass changes the one dictionary `template` refers to, and appends that same dictionary again. The inspect lines look right because each prints the value just after it was set, which is exactly why inspecting inside the loop can mislead: the bug shows only after the loop, when both list entries turn out to be one object holding the last values (`5449000000996` and `0.0` from the blank sugar). Building a new dictionary on each pass fixes it.",
    predict: {
      program: src`
def normalise(rows):
    clean = []
    template = {"code": "", "sugars": 0.0}
    for row in rows:
        record = template
        record["code"] = row["code"].strip()
        record["sugars"] = float(row["sugars"] or 0)
        clean.append(record)
        print("inspect:", repr(record["code"]), len(clean))
    return clean

rows = [{"code": " 3017620422003", "sugars": "56.3"}, {"code": "5449000000996 ", "sugars": ""}]
result = normalise(rows)
print(result[0]["code"], result[0] is result[1])
print(result[0]["sugars"])
`,
      output: "inspect: '3017620422003' 1\ninspect: '5449000000996' 2\n5449000000996 True\n0.0\n",
      wrongPredictions: [
        "inspect: '3017620422003' 1\ninspect: '5449000000996' 2\n3017620422003 False\n56.3",
        "inspect: ' 3017620422003' 1\ninspect: '5449000000996 ' 2\n5449000000996 True\n0.0",
        "inspect: '3017620422003' 1\ninspect: '5449000000996' 2\n5449000000996 False\n0",
      ],
    },
  },
];
