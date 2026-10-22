/**
 * M46 Reliable Data Pipelines: five lessons (PY-L46-01 … PY-L46-05).
 *
 * The data is the D11 repository event stream (GitHub-archive-shaped JSON lines) and D13 flight rows, trimmed to
 * the fields each example needs. Ingestion that quarantines bad lines instead of crashing or dropping them (L01);
 * schema contracts that report every problem in a record (L02); idempotent loads that can run twice (L03);
 * checkpoints written after the work and atomically (L04); and recovery that resumes and finishes with exactly the
 * result of one clean run (L05).
 *
 * Everything runs for real: files are written and read in the run's own folder, crashes are real exceptions, and
 * the checks rerun functions, break them halfway and inspect the files they leave behind. Version 2: rewritten from
 * a placeholder module that printed fixed SKU strings.
 */
import type { PyLesson } from "../model";
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
const raisesExpr = (id: string, label: string, code: string, raises: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const lines = (...l: string[]) => l.join("\n");
/** Python that writes `files` (name → text) into `folder`, creating it. */
const writeFiles = (folder: string, files: Record<string, string>) =>
  lines(
    "from pathlib import Path as _P",
    `_d = _P(${JSON.stringify(folder)})`,
    "_d.mkdir(parents=True, exist_ok=True)",
    ...Object.entries(files).map(([n, t]) => `(_d / ${JSON.stringify(n)}).write_text(${JSON.stringify(t)}, encoding="utf-8")`),
  );
const writeFile = (path: string, text: string) => `__import__("pathlib").Path(${JSON.stringify(path)}).write_text(${JSON.stringify(text)}, encoding="utf-8")`;
const ev = (id: string, type: string, extra: Record<string, unknown> = {}) => JSON.stringify({ id, type, ...extra });

export const m46Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L46-01 ingestion
  {
    id: "PY-L46-01",
    version: 2,
    slug: "ingest-and-quarantine",
    title: "Ingest every line, quarantine the bad ones",
    lede: "External data arrives broken in small ways: a line cut off mid-transfer, a blank line, a value that isn't a record. Ingestion keeps every good record and sets each bad line aside with its line number and the reason, so nothing is lost and nothing crashes the run.",
    focus: "Read every line of a JSON Lines file, keep the records that parse and quarantine each bad line with its line number and reason.",
    minutes: 20,
    objectives: [
      "Explain why ingestion must neither crash on one bad line nor drop bad lines silently",
      "Parse JSON Lines with line numbers, catching only `json.JSONDecodeError`, and reject values that aren't objects",
      "Account for every line: loaded + quarantined + blank equals the lines read",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comp-if", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "dict-lookup", "dir-list", "else-clause", "encoding-arg", "end", "enumerate-call", "except-type", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "newline-escape", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unquoted-name", "with-statement"],
    teaches: ["ingest-quarantine"],
    blocks: [
      {
        kind: "text",
        md: "**Ingestion** is the first step of a pipeline: it moves raw data from outside (an hourly event file, a supplier export) into records your program can trust. Outside data is never perfect. A download is cut off halfway through a line, an editor adds a blank line, a producer sends a list where a record should be.\n\nThere are two bad ways to react. Crash on the first bad line, and one broken character in line 9,000 loses the whole hour. Skip bad lines silently, and data disappears with nobody knowing. The reliable pattern does neither: parse each line on its own, keep what parses, and **quarantine** what doesn't, with its line number and a reason, so someone can look at it, fix the cause and reload it.",
      },
      {
        kind: "example",
        title: "Sort an hour of events into loaded and rejected",
        code: src`
import json

lines = [
    '{"id": "48000000581", "type": "PushEvent", "repo": "tidewater/smartqueue"}',
    '{"id": "48000001631", "type": "CreateEvent", "repo": "lumen-labs/fastshell"',
    '',
    '["48000002275", "IssuesEvent"]',
    '{"id": "48000007504", "type": "WatchEvent", "repo": "lumen-labs/pyauth"}',
]

events = []
rejected = []
for number, line in enumerate(lines, start=1):
    if not line.strip():
        continue
    try:
        record = json.loads(line)
    except json.JSONDecodeError as err:
        rejected.append((number, "not valid JSON: " + err.msg))
        continue
    if not isinstance(record, dict):
        rejected.append((number, "not a JSON object"))
        continue
    events.append(record)

print(len(events), "events loaded")
for number, reason in rejected:
    print("line", number, "rejected:", reason)
`,
        output: "2 events loaded\nline 2 rejected: not valid JSON: Expecting ',' delimiter\nline 4 rejected: not a JSON object\n",
        note: "`enumerate(lines, start=1)` numbers lines the way an editor does. Line 2 was cut off before its closing brace; line 4 is valid JSON but a list, not an event. The blank line 3 is neither data nor an error, so it is skipped without a report. `err.msg` is the parser's own explanation.",
      },
      {
        kind: "text",
        md: "Compare that with the shortcut most first versions take: parse everything in one comprehension. It works on clean test data and fails on the first real file.",
      },
      {
        kind: "error-example",
        title: "One bad line stops the whole load",
        code: src`
import json

lines = [
    '{"id": "48000000581", "type": "PushEvent"}',
    '{"id": "48000001631", "type": "CreateEv',
    '{"id": "48000007504", "type": "WatchEvent"}',
]
events = [json.loads(line) for line in lines]
print(len(events), "events loaded")
`,
        error: "JSONDecodeError",
        output: "",
        note: "`json.decoder.JSONDecodeError: Unterminated string starting at: line 1 column 35 (char 34)`. Nothing is loaded, not even the two good events, and the error doesn't say which line of the file was bad.",
      },
      {
        kind: "text",
        md: "In a real pipeline the lines come from a file and the quarantine is a file too, one JSON object per rejected line. The parsing goes in its own small function that returns either a record or a reason, so the loop only decides where each line goes. Reading the file with `for line in f` keeps one line in memory at a time (see Files & Directories).",
      },
      {
        kind: "example",
        title: "An ingest function with a quarantine file",
        code: src`
import json

def parse_line(line):
    """Return (record, None) for a JSON object, or (None, reason) for anything else."""
    try:
        record = json.loads(line)
    except json.JSONDecodeError as err:
        return None, err.msg
    if not isinstance(record, dict):
        return None, "not a JSON object"
    return record, None

def ingest(path, quarantine_path):
    events = []
    with open(path, encoding="utf-8") as source, open(quarantine_path, "w", encoding="utf-8") as bad:
        for number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            record, reason = parse_line(line)
            if reason is None:
                events.append(record)
            else:
                bad.write(json.dumps({"line": number, "reason": reason}) + "\n")
    return events

with open("2025-03-03-00.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000000581", "type": "PushEvent"}\n')
    f.write('{"id": "48000001631", "type": "CreateEvent"}\n')
    f.write('{"id": "48000007504", "type": "WatchEv"\n')
    f.write('\n')
    f.write('"48000002275"\n')
    f.write('{"id": "48000006895", "type": "IssueCommentEvent"}\n')

events = ingest("2025-03-03-00.jsonl", "quarantine.jsonl")
print([event["type"] for event in events])
with open("quarantine.jsonl", encoding="utf-8") as f:
    print(f.read(), end="")
`,
        output: "['PushEvent', 'CreateEvent', 'IssueCommentEvent']\n{\"line\": 3, \"reason\": \"Expecting ',' delimiter\"}\n{\"line\": 5, \"reason\": \"not a JSON object\"}\n",
        note: "Three events loaded, two lines quarantined, one blank line skipped: 3 + 2 + 1 = 6 lines, every one accounted for. The quarantine file can be read back with the same code, which matters when someone wants to reload it after a fix.",
      },
      {
        kind: "text",
        md: "**When to use it:** every time data comes from outside your program: files, exports, message queues, API dumps. **Mistakes to avoid:** `except Exception` around the whole loop body, which also hides bugs in your own code (a typo becomes \"bad data\"); numbering lines from 0; reporting blank lines as broken; and quarantining without the line number, so nobody can find the line again. Check that loaded + rejected + blank adds up to the lines you read.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Report the bad lines instead of crashing",
      prompt: "`load_lines` crashes on the first line that isn't valid JSON. Wrap the parsing in `try`/`except json.JSONDecodeError` so a bad line's number goes into `bad_lines` and the loop carries on.",
      spec: [
        ["Function", "`load_lines(lines)`"],
        ["Returns", "a tuple `(events, bad_lines)`: the parsed events, and the line numbers (from 1) that weren't valid JSON"],
      ],
      starter: src`
import json

def load_lines(lines):
    events = []
    bad_lines = []
    for number, line in enumerate(lines, start=1):
        events.append(json.loads(line))
    return events, bad_lines

lines = ['{"id": "1", "type": "PushEvent"}', '{"id": "2", "type": "Fork', '{"id": "3", "type": "WatchEvent"}']
print(load_lines(lines))
`,
      answer: src`
import json

def load_lines(lines):
    events = []
    bad_lines = []
    for number, line in enumerate(lines, start=1):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            bad_lines.append(number)
    return events, bad_lines

lines = ['{"id": "1", "type": "PushEvent"}', '{"id": "2", "type": "Fork', '{"id": "3", "type": "WatchEvent"}']
print(load_lines(lines))
`,
      wrong: [
        {
          code: src`
import json

def load_lines(lines):
    events = []
    bad_lines = []
    for number, line in enumerate(lines):
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            bad_lines.append(number)
    return events, bad_lines
`,
          fails: ["returns"],
          why: "without `start=1` every reported line number is one too low",
        },
      ],
      hints: ["Only the `json.loads` call can fail, so that is what goes inside `try`.", "In the `except` branch, record where the problem was instead of stopping.", "The number to record is the one `enumerate` already gives you."],
      task: {
        checks: [
          fn("returns", "load_lines", [
            example([['{"id": "1", "type": "PushEvent"}', '{"id": "2", "type": "Fork', '{"id": "3", "type": "WatchEvent"}']], py.tuple(pv([{ id: "1", type: "PushEvent" }, { id: "3", type: "WatchEvent" }]), pv([2]))),
            hiddenCase("only good lines", [['{"id": "9"}']], py.tuple(pv([{ id: "9" }]), pv([]))),
            hiddenCase("several bad lines", [["{", '{"id": "4"}', "nope", "]"]], py.tuple(pv([{ id: "4" }]), pv([1, 3, 4]))),
          ], { label: "load_lines() keeps the good events and reports bad line numbers" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Load a day of hourly files",
        prompt: "The event archive keeps one file per hour, named like `2025-03-03-01.jsonl`. Write `load_day(folder)`: read every `.jsonl` file in the folder in name order (names sort by time) and return `(events, rejected)`. Blank lines are skipped. A line that isn't valid JSON, or is valid JSON but not an object, is rejected as the text `\"<file name>:<line number>\"`. Other files in the folder are ignored.",
        spec: [
          ["Function", "`load_day(folder)`, where `folder` is a path (text or `Path`)"],
          ["Returns", "a tuple `(events, rejected)`: event dictionaries in file-then-line order, and rejected positions like `\"2025-03-03-01.jsonl:2\"`"],
          ["Example", "the starter's folder → events `48000000581`, `48000007504`, `48000004550`; rejected `['2025-03-03-01.jsonl:1']`"],
        ],
        starter: src`
import json
from pathlib import Path

def load_day(folder):
    return [], []

day = Path("day")
day.mkdir(exist_ok=True)
(day / "2025-03-03-00.jsonl").write_text('{"id": "48000000581", "type": "PushEvent"}\n\n{"id": "48000007504", "type": "WatchEvent"}\n', encoding="utf-8")
(day / "2025-03-03-01.jsonl").write_text('{"id": "4800000\n{"id": "48000004550", "type": "WatchEvent"}\n', encoding="utf-8")
events, rejected = load_day("day")
print([event["id"] for event in events], rejected)
`,
        answer: src`
import json
from pathlib import Path

def load_day(folder):
    events = []
    rejected = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        with open(path, encoding="utf-8") as f:
            for number, line in enumerate(f, start=1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    rejected.append(f"{path.name}:{number}")
                    continue
                if isinstance(record, dict):
                    events.append(record)
                else:
                    rejected.append(f"{path.name}:{number}")
    return events, rejected

day = Path("day")
day.mkdir(exist_ok=True)
(day / "2025-03-03-00.jsonl").write_text('{"id": "48000000581", "type": "PushEvent"}\n\n{"id": "48000007504", "type": "WatchEvent"}\n', encoding="utf-8")
(day / "2025-03-03-01.jsonl").write_text('{"id": "4800000\n{"id": "48000004550", "type": "WatchEvent"}\n', encoding="utf-8")
events, rejected = load_day("day")
print([event["id"] for event in events], rejected)
`,
        alternatives: [
          src`
import json
from pathlib import Path

def parse(line):
    try:
        value = json.loads(line)
    except json.JSONDecodeError:
        return None
    return value if isinstance(value, dict) else None

def load_day(folder):
    events, rejected = [], []
    names = sorted(p.name for p in Path(folder).iterdir() if p.suffix == ".jsonl")
    for name in names:
        text = (Path(folder) / name).read_text(encoding="utf-8")
        for number, line in enumerate(text.split("\n"), start=1):
            if line.strip() == "":
                continue
            record = parse(line)
            if record is None:
                rejected.append(name + ":" + str(number))
            else:
                events.append(record)
    return events, rejected
`,
        ],
        wrong: [
          {
            code: src`
import json
from pathlib import Path

def load_day(folder):
    events = []
    rejected = []
    for path in Path(folder).glob("*.jsonl"):
        with open(path, encoding="utf-8") as f:
            for number, line in enumerate(f, start=1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    rejected.append(f"{path.name}:{number}")
                    continue
                if isinstance(record, dict):
                    events.append(record)
                else:
                    rejected.append(f"{path.name}:{number}")
    return events, rejected
`,
            fails: ["order"],
            why: "`glob` returns files in whatever order the folder lists them, not in time order",
          },
          {
            code: src`
import json
from pathlib import Path

def load_day(folder):
    events = []
    rejected = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        with open(path, encoding="utf-8") as f:
            for number, line in enumerate(f, start=1):
                if not line.strip():
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    rejected.append(f"{path.name}:{number}")
    return events, rejected
`,
            fails: ["not-object"],
            why: "a line holding a JSON list or text parses, so it is loaded as if it were an event",
          },
          {
            code: src`
import json
from pathlib import Path

def load_day(folder):
    events = []
    rejected = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        with open(path, encoding="utf-8") as f:
            for number, line in enumerate(f, start=1):
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    rejected.append(f"{path.name}:{number}")
                    continue
                if isinstance(record, dict):
                    events.append(record)
                else:
                    rejected.append(f"{path.name}:{number}")
    return events, rejected
`,
            fails: ["returns"],
            why: "blank lines are reported as broken lines",
          },
        ],
        hints: [
          "Two loops: one over the hour files in name order, one over the lines of each file.",
          "`sorted` on the paths `glob(\"*.jsonl\")` finds gives name order; a `.txt` file never matches the pattern.",
          "A line is rejected in two situations: the parser raises, or it returns something that isn't a dictionary. Blank lines are neither.",
        ],
        task: {
          checks: [
            expr("returns", "load_day() loads the starter's folder", lines(
              writeFiles("chk_a", { "2025-03-03-00.jsonl": `${ev("48000000581", "PushEvent")}\n\n${ev("48000007504", "WatchEvent")}\n`, "2025-03-03-01.jsonl": `{"id": "4800000\n${ev("48000004550", "WatchEvent")}\n` }),
              "_e, _r = load_day('chk_a')",
              "result = ([_x['id'] for _x in _e], _r)",
            ), py.tuple(pv(["48000000581", "48000007504", "48000004550"]), pv(["2025-03-03-01.jsonl:1"])), { show: "load_day(\"day\")" }),
            expr("order", "load_day() reads the hours in name order", lines(
              writeFiles("chk_b", { "2025-03-03-09.jsonl": `${ev("9a", "PushEvent")}\n`, "2025-03-03-02.jsonl": `${ev("2a", "PushEvent")}\nbroken\n`, "2025-03-03-05.jsonl": `${ev("5a", "ForkEvent")}\n` }),
              "_e, _r = load_day('chk_b')",
              "result = ([_x['id'] for _x in _e], _r)",
            ), py.tuple(pv(["2a", "5a", "9a"]), pv(["2025-03-03-02.jsonl:2"])), { hidden: true }),
            expr("not-object", "a line that is JSON but not an object", lines(
              writeFiles("chk_c", { "2025-03-04-00.jsonl": `[1, 2]\n"text"\n${ev("e1", "WatchEvent")}\n`, "notes.txt": "not an hour file\n" }),
              "_e, _r = load_day('chk_c')",
              "result = ([_x['id'] for _x in _e], _r)",
            ), py.tuple(pv(["e1"]), pv(["2025-03-04-00.jsonl:1", "2025-03-04-00.jsonl:2"])), { hidden: true }),
            expr("empty", "a folder with no hour files", lines(writeFiles("chk_d", { "README.txt": "empty day\n" }), "result = load_day('chk_d')"), py.tuple(pv([]), pv([])), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Stop when a file is mostly broken",
        prompt: "Quarantining a few bad lines is normal. A file where most lines are bad is something else: probably the wrong format, and loading the few lines that happen to parse would mislead every report. Write `ingest_lines(lines, max_bad)`: return the events (JSON objects) from the non-blank lines, but raise `ValueError` with the message `\"too many bad lines: <bad> of <total>\"` when the share of bad lines among the non-blank lines is **more than** `max_bad` (a fraction like `0.2`).",
        spec: [
          ["Function", "`ingest_lines(lines, max_bad)`"],
          ["Bad line", "not valid JSON, or valid JSON that isn't an object; blank lines don't count at all"],
          ["Returns", "the list of events when bad / non-blank ≤ `max_bad`; no lines at all gives `[]`"],
          ["Raises", "`ValueError(\"too many bad lines: 3 of 4\")` when the share is above `max_bad`"],
          ["Example", "the starter's 4 lines (1 bad) with `max_bad` 0.25 → two events; with 0.2 → `ValueError: too many bad lines: 1 of 4`"],
        ],
        starter: src`
import json

def ingest_lines(lines, max_bad):
    return []

hour = [
    '{"id": "48000000581", "type": "PushEvent"}',
    '',
    '{"id": "48000001631", "type": "CreateEv',
    '{"id": "48000007504", "type": "WatchEvent"}',
    '{"id": "48000002275", "type": "IssuesEvent"}',
]
print(len(ingest_lines(hour, 0.25)))
`,
        answer: src`
import json

def ingest_lines(lines, max_bad):
    events = []
    bad = 0
    total = 0
    for line in lines:
        if not line.strip():
            continue
        total += 1
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            bad += 1
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            bad += 1
    if total and bad / total > max_bad:
        raise ValueError(f"too many bad lines: {bad} of {total}")
    return events

hour = [
    '{"id": "48000000581", "type": "PushEvent"}',
    '',
    '{"id": "48000001631", "type": "CreateEv',
    '{"id": "48000007504", "type": "WatchEvent"}',
    '{"id": "48000002275", "type": "IssuesEvent"}',
]
print(len(ingest_lines(hour, 0.25)))
`,
        alternatives: [
          src`
import json

def ingest_lines(lines, max_bad):
    filled = [line for line in lines if line.strip()]
    events = []
    for line in filled:
        try:
            value = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            events.append(value)
    bad = len(filled) - len(events)
    if filled and bad > max_bad * len(filled):
        raise ValueError("too many bad lines: " + str(bad) + " of " + str(len(filled)))
    return events
`,
        ],
        wrong: [
          {
            code: src`
import json

def ingest_lines(lines, max_bad):
    events = []
    bad = 0
    for line in lines:
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            bad += 1
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            bad += 1
    if lines and bad / len(lines) > max_bad:
        raise ValueError(f"too many bad lines: {bad} of {len(lines)}")
    return events
`,
            fails: ["returns", "message", "empty"],
            why: "blank lines are counted, both as lines and as bad lines (an empty line isn't valid JSON), so a normal hour is rejected",
          },
          {
            code: src`
import json

def ingest_lines(lines, max_bad):
    events = []
    bad = 0
    total = 0
    for line in lines:
        if not line.strip():
            continue
        total += 1
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            bad += 1
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            bad += 1
    if total and bad / total >= max_bad:
        raise ValueError(f"too many bad lines: {bad} of {total}")
    return events
`,
            fails: ["returns", "boundary"],
            why: "`>=` stops a file whose share of bad lines is exactly the budget",
          },
          {
            code: src`
import json

def ingest_lines(lines, max_bad):
    events = []
    bad = 0
    total = 0
    for line in lines:
        if not line.strip():
            continue
        total += 1
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            bad += 1
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            bad += 1
    if bad / total > max_bad:
        raise ValueError(f"too many bad lines: {bad} of {total}")
    return events
`,
            fails: ["empty"],
            why: "an empty or all-blank file divides by zero",
          },
        ],
        hints: [
          "Count two things while you load: the non-blank lines, and how many of them were bad.",
          "The decision comes after the loop, when the counts are complete. Compare the share of bad lines with the budget using `>`.",
          "Think about a file with no non-blank lines at all before you divide.",
        ],
        task: {
          checks: [
            expr("returns", "ingest_lines() loads a file within its budget", "result = [_e['id'] for _e in ingest_lines(" + JSON.stringify([ev("48000000581", "PushEvent"), "", '{"id": "48000001631", "type": "CreateEv', ev("48000007504", "WatchEvent"), ev("48000002275", "IssuesEvent")]) + ", 0.25)]", ["48000000581", "48000007504", "48000002275"], { show: "ingest_lines(hour, 0.25)" }),
            raisesExpr("budget", "ingest_lines() stops a file over its budget", "ingest_lines(" + JSON.stringify([ev("48000000581", "PushEvent"), "", '{"id": "48000001631", "type": "CreateEv', ev("48000007504", "WatchEvent"), ev("48000002275", "IssuesEvent")]) + ", 0.2)", "ValueError", { show: "ingest_lines(hour, 0.2)" }),
            expr("message", "the error says how many lines were bad", lines(
              "try:",
              "    ingest_lines(" + JSON.stringify(["[1]", "", "oops", ev("a", "PushEvent"), "", "{"]) + ", 0.5)",
              "    result = None",
              "except ValueError as _err:",
              "    result = str(_err)",
            ), "too many bad lines: 3 of 4", { hidden: true }),
            expr("boundary", "a share of bad lines exactly equal to the budget", "result = len(ingest_lines(" + JSON.stringify([ev("a", "PushEvent"), "broken", ev("b", "PushEvent"), ev("c", "PushEvent")]) + ", 0.25))", 3, { hidden: true }),
            expr("empty", "a file with only blank lines", "result = ingest_lines(['', '   ', ''], 0.1)", [], { hidden: true }),
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

lines = ['{"n": 1}', '', '[2]', '{"n": 3', '{"n": 4}']
kept = 0
bad = []
for number, line in enumerate(lines, start=1):
    if not line:
        continue
    try:
        value = json.loads(line)
    except json.JSONDecodeError:
        bad.append(number)
        continue
    if isinstance(value, dict):
        kept += 1
    else:
        bad.append(number)
print(kept, bad)
`,
        choices: ["2 [3, 4]", "2 [4]", "3 [4]", "2 [2, 3, 4]"],
        answer: 0,
        why: "Line 2 is blank and skipped. `[2]` parses but is a list, so line 3 is bad; line 4 is cut off. Lines 1 and 5 are kept.",
      },
      {
        id: "q2",
        prompt: "A common mistake: catching every exception around the parsing. The field name has a typo. What does this print?",
        program: src`
import json

lines = ['{"id": "1", "type": "PushEvent"}', '{"id": "2", "type": "WatchEvent"}']
types = []
for line in lines:
    try:
        record = json.loads(line)
        types.append(record["kind"])
    except Exception:
        continue
print(types)
`,
        choices: ["[]", "['PushEvent', 'WatchEvent']", "[None, None]", "KeyError: 'kind'"],
        answer: 0,
        why: "Both lines are valid, but `record[\"kind\"]` raises KeyError, and `except Exception` treats that bug as bad data. Every event vanishes without a word. Catch only `json.JSONDecodeError` around `json.loads`.",
      },
      {
        id: "q3",
        prompt: "Why write rejected lines to a quarantine file instead of just skipping them?",
        choices: [
          "So someone can see what was lost, fix the cause and reload those lines",
          "Because skipping a line raises an error",
          "So the good events load faster",
          "Because JSON files can only be read once",
        ],
        answer: 0,
        why: "Skipping hides the loss. A quarantine with line numbers and reasons turns it into a list of work someone can do.",
      },
    ],
    review: [
      "Parse each line on its own; catch only the parser's error, and reject values that aren't records.",
      "Skip blank lines, number lines from 1, and quarantine bad ones with their position and reason.",
      "Loaded + quarantined + blank = lines read. A file that is mostly bad should stop the run instead.",
      "Next: a line can parse and still be wrong. A schema contract says what a good record looks like.",
    ],
  },
  // ------------------------------------------------------------------ PY-L46-02 schema checks
  {
    id: "PY-L46-02",
    version: 2,
    slug: "schema-contracts",
    title: "Check records against a schema contract",
    lede: "A line can be valid JSON and still be wrong: a delay sent as text, a missing airport, a flag that should be true or false. A schema contract says what every field must be, and validation reports every way a record breaks it.",
    focus: "Validate each record against a schema that names every field's type and whether it may be missing, and report every problem.",
    minutes: 20,
    objectives: [
      "Write a schema as a dictionary from field name to type (and whether the field may be empty)",
      "Return every problem in a record, not just the first, and never change the record while checking it",
      "Avoid the `bool` trap: `isinstance(True, int)` is `True`",
    ],
    requires: ["arithmetic", "assignment", "bitwise", "boolean", "comparison", "continue-statement", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "except-type", "field-ann", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-condition", "none-value", "print-call", "print-several", "print-text", "string-format", "string-index", "string-method", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "unquoted-name"],
    teaches: ["schema-contract"],
    blocks: [
      {
        kind: "text",
        md: "Code downstream of ingestion makes assumptions: `departure_delay` is a number, `origin` is there, `cancelled` is true or false. When an upstream system changes (a new export sends delays as text), those assumptions break somewhere far away, in a sum or a chart, with an error that says nothing about the data.\n\nA **schema contract** writes the assumptions down: the fields a record must have and the type of each. Checking every record against it at the door turns a confusing crash later into a clear report now: *flight 12208: departure_delay should be int, got str*. A validator returns a list of problems; an empty list means the record keeps the contract.",
      },
      {
        kind: "example",
        title: "A schema for flight rows",
        code: src`
SCHEMA = {
    "flight_id": int,
    "airline_code": str,
    "origin": str,
    "departure_delay": int,
}

def problems(record):
    found = []
    for field, kind in SCHEMA.items():
        if field not in record:
            found.append(f"missing {field}")
        elif not isinstance(record[field], kind):
            found.append(f"{field}: expected {kind.__name__}, got {type(record[field]).__name__}")
    return found

flights = [
    {"flight_id": 12207, "airline_code": "UA", "origin": "LAS", "departure_delay": -4},
    {"flight_id": 12208, "airline_code": "MQ", "origin": "MCI", "departure_delay": "12"},
    {"flight_id": 12209, "airline_code": "AA", "departure_delay": None},
]
for flight in flights:
    print(flight["flight_id"], problems(flight))
`,
        output: "12207 []\n12208 ['departure_delay: expected int, got str']\n12209 ['missing origin', 'departure_delay: expected int, got NoneType']\n",
        note: "The schema is plain data, so one loop checks every field. Types are values in Python: `int.__name__` is `\"int\"`. The loop keeps going after a problem, so flight 12209 gets both of its problems in one report.",
      },
      {
        kind: "text",
        md: "Why bother, when the bad value would fail anyway? Because of *where* it fails. Without a check, the text `\"3\"` travels on until arithmetic meets it:",
      },
      {
        kind: "error-example",
        title: "An unchecked type fails far from its cause",
        code: src`
events = [
    {"repo": "tidewater/smartqueue", "commits": 2},
    {"repo": "lumen-labs/tinykit", "commits": "3"},
]
total = 0
for event in events:
    total += event["commits"]
print(total)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for +=: 'int' and 'str'`. The message names the operation, not the record or the field that broke the contract.",
      },
      {
        kind: "text",
        md: "Real contracts need two more rules. Some fields may legitimately be empty: a cancelled flight has no delay, a WatchEvent has no commits. So each field records whether `None` is allowed. And `bool` is a subclass of `int` in Python, so `isinstance(True, int)` is `True`: a contract that says *int* must reject `True` explicitly, or a flag sent in the wrong field passes.",
      },
      {
        kind: "example",
        title: "Optional fields and the bool trap",
        code: src`
EVENT_SCHEMA = {
    "id": (str, False),
    "type": (str, False),
    "commits": (int, True),
    "public": (bool, False),
}

def has_type(value, kind):
    if kind is int and isinstance(value, bool):
        return False
    return isinstance(value, kind)

def validate(record, schema):
    errors = []
    for field, (kind, nullable) in schema.items():
        value = record.get(field)
        if value is None:
            if not nullable:
                errors.append(f"{field} is required")
        elif not has_type(value, kind):
            errors.append(f"{field} should be {kind.__name__}")
    return errors

events = [
    {"id": "48000000581", "type": "PushEvent", "commits": 2, "public": True},
    {"id": "48000007504", "type": "WatchEvent", "commits": None, "public": True},
    {"id": "48000002968", "type": "ForkEvent", "commits": True, "public": "yes"},
    {"type": "IssuesEvent", "public": False},
]
for event in events:
    print(validate(event, EVENT_SCHEMA))
print(isinstance(True, int))
`,
        output: "[]\n[]\n['commits should be int', 'public should be bool']\n['id is required']\nTrue\n",
        note: "`get` treats a missing field and an explicit `None` the same way, which is what this contract wants. Without `has_type`, `commits: True` would pass as an int.",
      },
      {
        kind: "text",
        md: "**When to use it:** at every boundary where data enters: after parsing a file, after receiving an API response, before writing to a database. Split the stream into valid records and invalid ones with their problems, like the quarantine in L01. **Mistakes to avoid:** returning as soon as one problem is found (the sender fixes one field, resends, and fails again); fixing values while validating (a validator reports, it doesn't change the record); and forgetting that `True` is an `int`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Check the types too",
      prompt: "`record_problems` only reports missing fields. Add the type check: when a field is present but its value isn't the schema's type, add `\"<field>: wrong type\"`.",
      spec: [
        ["Function", "`record_problems(record)` using the given `SCHEMA`"],
        ["Returns", "a list of problems in schema order: `\"missing <field>\"` or `\"<field>: wrong type\"`"],
      ],
      starter: src`
SCHEMA = {"repo_id": int, "name": str, "language": str}

def record_problems(record):
    found = []
    for field, kind in SCHEMA.items():
        if field not in record:
            found.append(f"missing {field}")
    return found

print(record_problems({"repo_id": "600000997", "name": "quill-data/quickstore", "language": "Python"}))
`,
      answer: src`
SCHEMA = {"repo_id": int, "name": str, "language": str}

def record_problems(record):
    found = []
    for field, kind in SCHEMA.items():
        if field not in record:
            found.append(f"missing {field}")
        elif not isinstance(record[field], kind):
            found.append(f"{field}: wrong type")
    return found

print(record_problems({"repo_id": "600000997", "name": "quill-data/quickstore", "language": "Python"}))
`,
      wrong: [
        {
          code: src`
SCHEMA = {"repo_id": int, "name": str, "language": str}

def record_problems(record):
    found = []
    for field, kind in SCHEMA.items():
        if field not in record:
            found.append(f"missing {field}")
        elif not isinstance(record[field], kind):
            return [f"{field}: wrong type"]
    return found
`,
          fails: ["returns"],
          why: "it returns at the first wrong type, dropping every other problem",
        },
      ],
      hints: ["A present field still needs a second test.", "`isinstance(value, kind)` tells you whether the value has the schema's type.", "Use `elif`, so a missing field isn't also reported as a wrong type."],
      task: {
        checks: [
          fn("returns", "record_problems", [
            example([{ repo_id: "600000997", name: "quill-data/quickstore", language: "Python" }], ["repo_id: wrong type"]),
            hiddenCase("a record that keeps the contract", [{ repo_id: 600000000, name: "nimbus-io/cloudplot", language: "Python" }], []),
            hiddenCase("a missing field and two wrong types", [{ repo_id: 6.5, language: 3 }], ["repo_id: wrong type", "missing name", "language: wrong type"]),
          ], { label: "record_problems() reports missing fields and wrong types" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "What changed upstream?",
        prompt: "When a producer renames a field (`repo_name` becomes `repository`), every record is missing one field and has one field nobody expected. Write `field_report(record, schema)`: return a dictionary with three sorted lists: `\"missing\"` (schema fields not in the record), `\"unexpected\"` (record fields not in the schema) and `\"wrong_type\"` (fields present in both whose value isn't the schema's type; `True`/`False` never count as `int` or `float`).",
        spec: [
          ["Function", "`field_report(record, schema)`; `schema` maps field name → type (`int`, `float`, `str`, `bool`)"],
          ["Returns", "`{\"missing\": [...], \"unexpected\": [...], \"wrong_type\": [...]}`, each list sorted"],
          ["Rules", "the record is not changed; a bool is not accepted where `int` or `float` is expected"],
          ["Example", "the starter's renamed event → `{'missing': ['repo_name'], 'unexpected': ['repository'], 'wrong_type': []}`"],
        ],
        starter: src`
def field_report(record, schema):
    return {"missing": [], "unexpected": [], "wrong_type": []}

schema = {"id": str, "type": str, "repo_name": str, "commits": int}
event = {"id": "48000000581", "type": "PushEvent", "repository": "tidewater/smartqueue", "commits": 2}
print(field_report(event, schema))
`,
        answer: src`
def field_report(record, schema):
    missing = sorted(field for field in schema if field not in record)
    unexpected = sorted(field for field in record if field not in schema)
    wrong_type = []
    for field, kind in schema.items():
        if field not in record:
            continue
        value = record[field]
        if isinstance(value, bool) and kind is not bool:
            wrong_type.append(field)
        elif not isinstance(value, kind):
            wrong_type.append(field)
    return {"missing": missing, "unexpected": unexpected, "wrong_type": sorted(wrong_type)}

schema = {"id": str, "type": str, "repo_name": str, "commits": int}
event = {"id": "48000000581", "type": "PushEvent", "repository": "tidewater/smartqueue", "commits": 2}
print(field_report(event, schema))
`,
        alternatives: [
          src`
def field_report(record, schema):
    report = {"missing": [], "unexpected": [], "wrong_type": []}
    for field in sorted(set(schema) | set(record)):
        if field not in record:
            report["missing"].append(field)
        elif field not in schema:
            report["unexpected"].append(field)
        elif type(record[field]) is bool and schema[field] is not bool:
            report["wrong_type"].append(field)
        elif not isinstance(record[field], schema[field]):
            report["wrong_type"].append(field)
    return report
`,
        ],
        wrong: [
          {
            code: src`
def field_report(record, schema):
    missing = sorted(field for field in schema if field not in record)
    unexpected = sorted(field for field in record if field not in schema)
    wrong_type = sorted(field for field, kind in schema.items() if field in record and not isinstance(record[field], kind))
    return {"missing": missing, "unexpected": unexpected, "wrong_type": wrong_type}
`,
            fails: ["bool"],
            why: "`isinstance(True, int)` is True, so a flag in a count field passes",
          },
          {
            code: src`
def field_report(record, schema):
    missing = [field for field in schema if field not in record]
    unexpected = [field for field in record if field not in schema]
    wrong_type = []
    for field, kind in schema.items():
        if field in record and (not isinstance(record[field], kind) or (isinstance(record[field], bool) and kind is not bool)):
            wrong_type.append(field)
    return {"missing": missing, "unexpected": unexpected, "wrong_type": wrong_type}
`,
            fails: ["sorted", "types"],
            why: "the lists come out in dictionary order instead of sorted",
          },
          {
            code: src`
def field_report(record, schema):
    missing = sorted(field for field in schema if field not in record)
    for field in missing:
        record[field] = None
    unexpected = sorted(field for field in record if field not in schema)
    wrong_type = []
    for field, kind in schema.items():
        value = record[field]
        if value is None:
            continue
        if isinstance(value, bool) and kind is not bool:
            wrong_type.append(field)
        elif not isinstance(value, kind):
            wrong_type.append(field)
    return {"missing": missing, "unexpected": unexpected, "wrong_type": sorted(wrong_type)}
`,
            fails: ["keeps-input"],
            why: "it adds the missing fields to the caller's record while checking it",
          },
        ],
        hints: [
          "Missing and unexpected are both about names: which names are in one dictionary and not the other.",
          "Only a field in both can have a wrong type. Test `bool` first, before the general type test.",
          "Build new lists and sort them at the end; don't write anything into the record.",
        ],
        task: {
          checks: [
expr("returns", "field_report() finds a renamed field", "result = field_report(" + JSON.stringify({ id: "48000000581", type: "PushEvent", repository: "tidewater/smartqueue", commits: 2 }) + ", {'id': str, 'type': str, 'repo_name': str, 'commits': int})", { missing: ["repo_name"], unexpected: ["repository"], wrong_type: [] }, { show: "field_report(event, schema)" }),
            expr("types", "field_report() lists wrong types, sorted", "result = field_report({'rate': '0.1', 'count': 2.5, 'name': 7}, {'name': str, 'count': int, 'rate': float})", { missing: [], unexpected: [], wrong_type: ["count", "name", "rate"] }, { show: "field_report({'rate': '0.1', 'count': 2.5, 'name': 7}, {'name': str, 'count': int, 'rate': float})" }),
            expr("bool", "a true/false flag in a number field", "result = field_report({'commits': True, 'size': False, 'public': True}, {'commits': int, 'size': float, 'public': bool})", { missing: [], unexpected: [], wrong_type: ["commits", "size"] }, { hidden: true }),
            expr("sorted", "several missing and unexpected fields", "result = field_report({'z_extra': 1, 'b_extra': 2, 'id': 'x'}, {'type': str, 'id': str, 'actor': str})", { missing: ["actor", "type"], unexpected: ["b_extra", "z_extra"], wrong_type: [] }, { hidden: true }),
            expr("empty", "an empty record", "result = field_report({}, {'id': str})", { missing: ["id"], unexpected: [], wrong_type: [] }, { hidden: true }),
            expr("keeps-input", "field_report() leaves the record unchanged", "_r = {'id': 'e1', 'extra': 1}\nfield_report(_r, {'id': str, 'type': str})\nresult = _r", { id: "e1", extra: 1 }),
          ],
        },
      },
      {
        id: "c2",
        title: "Type the fields of a CSV row",
        prompt: "CSV gives every value as text, so for CSV the contract includes conversion. Write `typed_row(row, schema)`: `schema` maps each field to `(convert, nullable)`, where `convert` is `int`, `float` or `str`. Return `(typed, problems)`: a new dictionary with every schema field converted, and a list of problems in schema order. An empty text becomes `None` when the field is nullable and is the problem `\"<field> is empty\"` when it isn't. Text that `convert` can't read is the problem `\"<field>: cannot read '<text>'\"` and that field becomes `None`.",
        spec: [
          ["Function", "`typed_row(row, schema)`"],
          ["row", "a dictionary of texts, as `csv.DictReader` produces (spaces around a value are ignored)"],
          ["Returns", "`(typed, problems)`; `typed` has exactly the schema's fields; a field missing from the row counts as empty"],
          ["Example", "the starter's cancelled flight → `({'flight_id': 12209, 'origin': 'DFW', 'departure_delay': None, 'distance_miles': 1121.0}, [])`"],
        ],
        starter: src`
FLIGHT = {
    "flight_id": (int, False),
    "origin": (str, False),
    "departure_delay": (int, True),
    "distance_miles": (float, False),
}

def typed_row(row, schema):
    return {}, []

row = {"flight_id": "12209", "origin": "DFW", "departure_delay": "", "distance_miles": "1121"}
print(typed_row(row, FLIGHT))
`,
        answer: src`
FLIGHT = {
    "flight_id": (int, False),
    "origin": (str, False),
    "departure_delay": (int, True),
    "distance_miles": (float, False),
}

def typed_row(row, schema):
    typed = {}
    problems = []
    for field, (convert, nullable) in schema.items():
        text = row.get(field, "").strip()
        typed[field] = None
        if text == "":
            if not nullable:
                problems.append(f"{field} is empty")
            continue
        try:
            typed[field] = convert(text)
        except ValueError:
            problems.append(f"{field}: cannot read '{text}'")
    return typed, problems

row = {"flight_id": "12209", "origin": "DFW", "departure_delay": "", "distance_miles": "1121"}
print(typed_row(row, FLIGHT))
`,
        alternatives: [
          src`
def read_value(text, convert):
    try:
        return convert(text), None
    except ValueError:
        return None, f"cannot read '{text}'"

def typed_row(row, schema):
    typed, problems = {}, []
    for field in schema:
        convert, nullable = schema[field]
        text = (row.get(field) or "").strip()
        if not text:
            typed[field] = None
            if not nullable:
                problems.append(field + " is empty")
        else:
            typed[field], error = read_value(text, convert)
            if error:
                problems.append(field + ": " + error)
    return typed, problems
`,
        ],
        wrong: [
          {
            code: src`
def typed_row(row, schema):
    typed = {}
    problems = []
    for field, (convert, nullable) in schema.items():
        text = row.get(field, "").strip()
        if text == "" and nullable:
            typed[field] = None
            continue
        try:
            typed[field] = convert(text)
        except ValueError:
            typed[field] = None
            problems.append(f"{field}: cannot read '{text}'")
    return typed, problems
`,
            fails: ["required", "several"],
            why: "an empty required field is reported as unreadable text instead of as empty",
          },
          {
            code: src`
def typed_row(row, schema):
    typed = {}
    problems = []
    for field, (convert, nullable) in schema.items():
        text = row.get(field, "").strip()
        if text == "":
            typed[field] = None
            if not nullable:
                problems.append(f"{field} is empty")
            continue
        try:
            typed[field] = convert(text)
        except ValueError:
            problems.append(f"{field}: cannot read '{text}'")
            return typed, problems
    return typed, problems
`,
            fails: ["several", "unreadable"],
            why: "it stops at the first unreadable value, so later fields are neither converted nor reported",
          },
          {
            code: src`
def typed_row(row, schema):
    problems = []
    for field, (convert, nullable) in schema.items():
        text = row.get(field, "").strip()
        if text == "":
            row[field] = None
            if not nullable:
                problems.append(f"{field} is empty")
            continue
        try:
            row[field] = convert(text)
        except ValueError:
            row[field] = None
            problems.append(f"{field}: cannot read '{text}'")
    return row, problems
`,
            fails: ["keeps-input", "extra"],
            why: "it converts the caller's row in place and keeps fields the schema doesn't name",
          },
        ],
        hints: [
          "Loop over the schema, not the row: the result has exactly the schema's fields.",
          "Decide in order: empty text (allowed or a problem), then conversion inside `try`.",
          "Catch only `ValueError`, record the problem, and carry on with the next field.",
        ],
        task: {
          checks: [
            expr("returns", "typed_row() types the starter's cancelled flight", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\nresult = typed_row(" + JSON.stringify({ flight_id: "12209", origin: "DFW", departure_delay: "", distance_miles: "1121" }) + ", _F)", py.tuple(pv({ flight_id: 12209, origin: "DFW", departure_delay: null, distance_miles: py.float(1121) }), pv([])), { show: "typed_row(row, FLIGHT)" }),
            expr("unreadable", "typed_row() reports text it can't convert", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\nresult = typed_row({'flight_id': '12208', 'origin': ' MCI ', 'departure_delay': 'n/a', 'distance_miles': '1251'}, _F)", py.tuple(pv({ flight_id: 12208, origin: "MCI", departure_delay: null, distance_miles: py.float(1251) }), pv(["departure_delay: cannot read 'n/a'"])), { show: "typed_row({..., 'departure_delay': 'n/a', ...}, FLIGHT)" }),
            expr("required", "an empty required field", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\nresult = typed_row({'flight_id': '12210', 'origin': '', 'departure_delay': '-7', 'distance_miles': '630'}, _F)", py.tuple(pv({ flight_id: 12210, origin: null, departure_delay: -7, distance_miles: py.float(630) }), pv(["origin is empty"])), { hidden: true }),
            expr("several", "several problems in one row, in schema order", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\nresult = typed_row({'flight_id': 'x1', 'origin': 'SLC', 'departure_delay': '5.5', 'distance_miles': ''}, _F)", py.tuple(pv({ flight_id: null, origin: "SLC", departure_delay: null, distance_miles: null }), pv(["flight_id: cannot read 'x1'", "departure_delay: cannot read '5.5'", "distance_miles is empty"])), { hidden: true }),
            expr("extra", "a row with a field the schema doesn't name, and one missing", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\nresult = typed_row({'flight_id': '7', 'origin': 'PDX', 'tail_number': 'N822DN', 'distance_miles': '989'}, _F)", py.tuple(pv({ flight_id: 7, origin: "PDX", departure_delay: null, distance_miles: py.float(989) }), pv([])), { hidden: true }),
            expr("keeps-input", "typed_row() leaves the row unchanged", "_F = {'flight_id': (int, False), 'origin': (str, False), 'departure_delay': (int, True), 'distance_miles': (float, False)}\n_r = {'flight_id': '1', 'origin': 'LAS', 'departure_delay': '', 'distance_miles': '2'}\ntyped_row(_r, _F)\nresult = _r", { flight_id: "1", origin: "LAS", departure_delay: "", distance_miles: "2" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def ok(value, kind):
    return isinstance(value, kind)

print(ok(True, int), ok(3, float), ok(3.0, float), ok(None, str))
`,
        choices: ["True False True False", "False False True False", "True True True False", "False True True False"],
        answer: 0,
        why: "`bool` is a subclass of `int`, so `True` passes as an int. `3` is an int, not a float, even though it could be converted to one.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the validator returns too early. What does this print?",
        program: src`
SCHEMA = {"flight_id": int, "origin": str, "departure_delay": int}

def problems(record):
    for field, kind in SCHEMA.items():
        if not isinstance(record.get(field), kind):
            return [field]
    return []

print(problems({"flight_id": "12208", "departure_delay": "12"}))
`,
        choices: ["['flight_id']", "['flight_id', 'origin', 'departure_delay']", "[]", "['origin']"],
        answer: 0,
        why: "All three fields break the contract, but `return` inside the loop stops at the first. The sender fixes `flight_id`, resends and fails again on `origin`. Collect problems in a list and return after the loop.",
      },
      {
        id: "q3",
        prompt: "Where does a schema check belong in a pipeline?",
        choices: [
          "Where data enters: right after parsing, before anything else uses the records",
          "At the end, just before the report is printed",
          "Only in the tests, never while the pipeline runs",
          "Inside every function that reads a field",
        ],
        answer: 0,
        why: "Checking at the boundary means every later step can trust the records, and a broken record is reported next to its cause.",
      },
    ],
    review: [
      "A schema contract is data: field → type, and whether the field may be empty.",
      "Validate every field and return every problem; never change the record while checking it.",
      "`True` is an `int` to `isinstance`: reject bools explicitly in number fields. CSV values are text, so convert by the schema.",
      "Next: valid records can still be loaded twice. Idempotent loads make that harmless.",
    ],
  },
  // ------------------------------------------------------------------ PY-L46-03 idempotency
  {
    id: "PY-L46-03",
    version: 2,
    slug: "idempotent-loads",
    title: "Make a load safe to run twice",
    lede: "Pipelines get rerun: a retry after a timeout, a scheduler that fires twice, someone pressing Run again. An idempotent step has the same effect whether it runs once or five times, so a rerun can never double a total.",
    focus: "Make a processing step idempotent: key records by a natural ID and upsert, remember what was already applied, and rewrite outputs instead of appending.",
    minutes: 20,
    objectives: [
      "Explain idempotency and why reruns make it necessary",
      "Load records keyed by their ID (a dictionary or a primary key with `ON CONFLICT`) instead of appending",
      "Apply each change once by remembering the IDs already applied, and write outputs in full, sorted",
    ],
    requires: ["arithmetic", "assignment", "comment", "comp-if", "comparison", "continue-statement", "counter-call", "csv-write", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "end", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "newline-escape", "print-call", "print-several", "reassignment", "sql-tx", "sqlite-call", "string-format", "string-index", "top-level-indent", "unquoted-name", "with-statement"],
    teaches: ["once-add"],
    blocks: [
      {
        kind: "text",
        md: "An operation is **idempotent** when doing it twice has the same effect as doing it once. *Set order O100282's status to shipped* is idempotent; *add 1 to the shipped count* is not.\n\nPipelines need this because they are rerun all the time. A job times out after it wrote its data but before it said so, and the scheduler retries it. A message queue delivers the same event twice. A backfill is started again after a fix. If loading appends rows, every rerun adds them again and the star counts double.\n\nThe tools: give each record its **natural key** (an event ID, an order ID) and *upsert* by that key instead of appending; remember which keys or batches were already applied; and write output files in full each run (sorted, so the same input gives the same bytes) instead of appending to them.",
      },
      {
        kind: "example",
        title: "Loading the same batch twice",
        code: src`
batch = [
    {"id": "48000007504", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000004550", "type": "WatchEvent", "repo": "tidewater/easystore"},
    {"id": "48000006650", "type": "WatchEvent", "repo": "quill-data/opencache"},
]

appended = []
by_id = {}
for attempt in [1, 2]:          # the job is retried after a timeout
    for event in batch:
        appended.append(event)
        by_id[event["id"]] = event

print(len(appended), "rows after appending twice")
print(len(by_id), "rows after upserting twice")
`,
        output: "6 rows after appending twice\n3 rows after upserting twice\n",
        note: "Storing under the event's ID replaces the copy from the first attempt instead of adding a second one. A dictionary keyed by ID is the in-memory version of a table with a primary key.",
      },
      {
        kind: "text",
        md: "A database does the same with a **primary key** and an upsert clause. `INSERT ... ON CONFLICT(event_id) DO NOTHING` skips a row whose key is already stored (`DO UPDATE SET ...` would replace it instead). The load function can then be run as often as the scheduler likes.",
      },
      {
        kind: "example",
        title: "A table that ignores replays",
        code: src`
import sqlite3

def load_stars(conn, events):
    rows = [(e["id"], e["repo"]) for e in events if e["type"] == "WatchEvent"]
    conn.executemany(
        "INSERT INTO stars (event_id, repo) VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING",
        rows,
    )
    conn.commit()

def stars_per_repo(conn):
    return conn.execute("SELECT repo, COUNT(*) FROM stars GROUP BY repo ORDER BY repo").fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stars (event_id TEXT PRIMARY KEY, repo TEXT)")
hour = [
    {"id": "48000007504", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000000581", "type": "PushEvent", "repo": "tidewater/smartqueue"},
    {"id": "48000004550", "type": "WatchEvent", "repo": "tidewater/easystore"},
    {"id": "48000009120", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
]
load_stars(conn, hour)
print(stars_per_repo(conn))
load_stars(conn, hour)          # the scheduler ran the job again
print(stars_per_repo(conn))
`,
        output: "[('lumen-labs/pyauth', 2), ('tidewater/easystore', 1)]\n[('lumen-labs/pyauth', 2), ('tidewater/easystore', 1)]\n",
        note: "The second load tries to insert the same three event IDs and the primary key turns each one into a no-op. Without `ON CONFLICT`, the second `executemany` would raise `sqlite3.IntegrityError`; with a plain table and no key, it would double every count.",
      },
      {
        kind: "text",
        md: "Not every step has a natural place to store a key. Adding money to a balance, for example: running it twice pays twice. There, keep the IDs of the changes already applied and skip those. And for files: open outputs with `\"w\"` and write the whole result, sorted, so a rerun replaces the file with the same bytes. A file opened with `\"a\"` gains a second copy of every line.\n\n**When to use it:** every step of a pipeline that might be retried, which is every step. **Mistakes to avoid:** `+=` on a running total without remembering what was already added; append-mode outputs; and recording the key *before* the change is made, so a crash in between marks it as done when it wasn't.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count each commit once",
      prompt: "The event queue sometimes delivers the same push twice. `commits_per_repo` adds every delivery. Keep a set of the event IDs already counted and skip an event whose ID is in it.",
      spec: [
        ["Function", "`commits_per_repo(events)`"],
        ["Returns", "a dictionary from repo to total commits, counting each event ID once"],
      ],
      starter: src`
def commits_per_repo(events):
    totals = {}
    for event in events:
        repo = event["repo"]
        totals[repo] = totals.get(repo, 0) + event["commits"]
    return totals

events = [
    {"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2},
    {"id": "48000003143", "repo": "nimbus-io/graphqueue", "commits": 3},
    {"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2},
]
print(commits_per_repo(events))
`,
      answer: src`
def commits_per_repo(events):
    totals = {}
    counted = set()
    for event in events:
        if event["id"] in counted:
            continue
        counted.add(event["id"])
        repo = event["repo"]
        totals[repo] = totals.get(repo, 0) + event["commits"]
    return totals

events = [
    {"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2},
    {"id": "48000003143", "repo": "nimbus-io/graphqueue", "commits": 3},
    {"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2},
]
print(commits_per_repo(events))
`,
      wrong: [
        {
          code: src`
def commits_per_repo(events):
    totals = {}
    counted = set()
    for event in events:
        if event["repo"] in counted:
            continue
        counted.add(event["repo"])
        totals[event["repo"]] = totals.get(event["repo"], 0) + event["commits"]
    return totals
`,
          fails: ["returns"],
          why: "it remembers repos instead of event IDs, so a second, different push to the same repo is lost",
        },
      ],
      hints: ["The thing that makes two deliveries \"the same\" is the event ID.", "Create an empty set before the loop and check it at the top of each pass.", "Add the ID to the set when you count the event, so the next copy is skipped."],
      task: {
        checks: [
          fn("returns", "commits_per_repo", [
            example([[{ id: "48000000581", repo: "tidewater/smartqueue", commits: 2 }, { id: "48000003143", repo: "nimbus-io/graphqueue", commits: 3 }, { id: "48000000581", repo: "tidewater/smartqueue", commits: 2 }]], { "tidewater/smartqueue": 2, "nimbus-io/graphqueue": 3 }),
            hiddenCase("two different pushes to one repo", [[{ id: "a", repo: "r/x", commits: 1 }, { id: "b", repo: "r/x", commits: 4 }]], { "r/x": 5 }),
            hiddenCase("an event delivered three times", [[{ id: "c", repo: "r/y", commits: 2 }, { id: "c", repo: "r/y", commits: 2 }, { id: "c", repo: "r/y", commits: 2 }]], { "r/y": 2 }),
          ], { label: "commits_per_repo() counts each event once" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Apply payments exactly once",
        prompt: "Runtime Market's payment provider retries its callbacks, so the same payment can arrive in several batches. Write `apply_payments(balances, payments, applied)`: for each payment whose `payment_id` is not yet in the set `applied`, subtract its `amount` from `balances[order_id]` and add the ID to `applied`. Return how many payments were applied by this call. Running the same batch again must change nothing.",
        spec: [
          ["Function", "`apply_payments(balances, payments, applied)`; changes `balances` and `applied` in place"],
          ["balances", "a dictionary from order ID to the amount still owed"],
          ["payments", "a list of dictionaries with `payment_id`, `order_id` and `amount`"],
          ["Returns", "the number of payments applied by this call"],
          ["Example", "the starter's batch applied twice → `2`, then `0`; balances `{'O100282': 0.0, 'O100376': 41.47}`"],
        ],
        starter: src`
def apply_payments(balances, payments, applied):
    return 0

balances = {"O100282": 35.84, "O100376": 91.47}
applied = set()
batch = [
    {"payment_id": "PAY0000313", "order_id": "O100282", "amount": 35.84},
    {"payment_id": "PAY0000416", "order_id": "O100376", "amount": 50.0},
]
print(apply_payments(balances, batch, applied))
print(apply_payments(balances, batch, applied))
print(balances)
`,
        answer: src`
def apply_payments(balances, payments, applied):
    count = 0
    for payment in payments:
        payment_id = payment["payment_id"]
        if payment_id in applied:
            continue
        balances[payment["order_id"]] -= payment["amount"]
        applied.add(payment_id)
        count += 1
    return count

balances = {"O100282": 35.84, "O100376": 91.47}
applied = set()
batch = [
    {"payment_id": "PAY0000313", "order_id": "O100282", "amount": 35.84},
    {"payment_id": "PAY0000416", "order_id": "O100376", "amount": 50.0},
]
print(apply_payments(balances, batch, applied))
print(apply_payments(balances, batch, applied))
print(balances)
`,
        alternatives: [
          src`
def apply_payments(balances, payments, applied):
    new = [p for p in payments if p["payment_id"] not in applied]
    done = 0
    for p in new:
        if p["payment_id"] in applied:
            continue
        balances[p["order_id"]] = balances[p["order_id"]] - p["amount"]
        applied.add(p["payment_id"])
        done += 1
    return done
`,
        ],
        wrong: [
          {
            code: src`
def apply_payments(balances, payments, applied):
    count = 0
    for payment in payments:
        balances[payment["order_id"]] -= payment["amount"]
        applied.add(payment["payment_id"])
        count += 1
    return count
`,
            fails: ["rerun", "duplicate", "known"],
            why: "it records the IDs but never checks them, so a retried batch pays twice",
          },
          {
            code: src`
def apply_payments(balances, payments, applied):
    count = 0
    for payment in payments:
        if payment["payment_id"] in applied:
            continue
        balances[payment["order_id"]] -= payment["amount"]
        count += 1
    applied.update(p["payment_id"] for p in payments)
    return count
`,
            fails: ["duplicate"],
            why: "the IDs are recorded only after the loop, so a payment repeated inside one batch is applied twice",
          },
          {
            code: src`
def apply_payments(balances, payments, applied):
    count = 0
    for payment in payments:
        if payment["order_id"] in applied:
            continue
        balances[payment["order_id"]] -= payment["amount"]
        applied.add(payment["order_id"])
        count += 1
    return count
`,
            fails: ["instalments", "known", "rerun"],
            why: "it keys on the order instead of the payment, so a second instalment for the same order is refused",
          },
        ],
        hints: [
          "The set `applied` is the memory between calls: test it before changing a balance.",
          "Record a payment's ID as soon as it is applied, inside the loop, so a copy later in the same batch is caught too.",
          "The key that identifies a payment is `payment_id`; one order can have several payments.",
        ],
        task: {
          checks: [
            expr("returns", "the first call applies both payments", lines(
              "_b = {'O100282': 35.84, 'O100376': 91.47}",
              "_a = set()",
              "_p = [{'payment_id': 'PAY0000313', 'order_id': 'O100282', 'amount': 35.84}, {'payment_id': 'PAY0000416', 'order_id': 'O100376', 'amount': 50.0}]",
              "result = (apply_payments(_b, _p, _a), _b)",
            ), py.tuple(py.int(2), pv({ O100282: py.float(0), O100376: 41.47 })), { show: "apply_payments(balances, batch, applied)" }),
            expr("rerun", "a second call with the same batch changes nothing", lines(
              "_b = {'O100282': 35.84, 'O100376': 91.47}",
              "_a = set()",
              "_p = [{'payment_id': 'PAY0000313', 'order_id': 'O100282', 'amount': 35.84}, {'payment_id': 'PAY0000416', 'order_id': 'O100376', 'amount': 50.0}]",
              "apply_payments(_b, _p, _a)",
              "result = (apply_payments(_b, _p, _a), _b, sorted(_a))",
            ), py.tuple(py.int(0), pv({ O100282: py.float(0), O100376: 41.47 }), pv(["PAY0000313", "PAY0000416"])), { show: "apply_payments(balances, batch, applied) run twice" }),
            expr("duplicate", "a payment repeated inside one batch", "_b = {'O1': 30.0}\n_a = set()\nresult = (apply_payments(_b, [{'payment_id': 'P1', 'order_id': 'O1', 'amount': 10.0}, {'payment_id': 'P1', 'order_id': 'O1', 'amount': 10.0}], _a), _b)", py.tuple(py.int(1), pv({ O1: py.float(20) })), { hidden: true }),
            expr("instalments", "two payments for the same order", "_b = {'O2': 100.0}\n_a = set()\nresult = (apply_payments(_b, [{'payment_id': 'P7', 'order_id': 'O2', 'amount': 60.0}, {'payment_id': 'P8', 'order_id': 'O2', 'amount': 40.0}], _a), _b)", py.tuple(py.int(2), pv({ O2: py.float(0) })), { hidden: true }),
            expr("known", "a payment applied by an earlier run", "_b = {'O3': 25.0}\n_a = {'P9'}\nresult = (apply_payments(_b, [{'payment_id': 'P9', 'order_id': 'O3', 'amount': 25.0}], _a), _b)", py.tuple(py.int(0), pv({ O3: py.float(25) })), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Rewrite the daily star report",
        prompt: "Each night a job writes `stars.csv` with the number of stars (WatchEvents) per repository for the day. The job is sometimes run twice, and the event feed sometimes repeats an event. Write `write_star_report(events, path)`: count WatchEvents per repo, each event ID once, and write the CSV with a header `repo,stars` and one row per repo sorted by repo name, replacing whatever the file held. Running it again with the same events must leave exactly the same file.",
        spec: [
          ["Function", "`write_star_report(events, path)`; returns nothing"],
          ["events", "a list of dictionaries with `id`, `type` and `repo`"],
          ["File", "header `repo,stars`, then one row per repo with at least one star, sorted by repo"],
          ["Example", "the starter's events → `repo,stars`, `lumen-labs/pyauth,2`, `tidewater/easystore,1`"],
        ],
        starter: src`
import csv

def write_star_report(events, path):
    pass

events = [
    {"id": "48000007504", "type": "WatchEvent", "repo": "tidewater/easystore"},
    {"id": "48000009120", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000000581", "type": "PushEvent", "repo": "tidewater/smartqueue"},
    {"id": "48000009120", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000006650", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
]
write_star_report(events, "stars.csv")
write_star_report(events, "stars.csv")
with open("stars.csv", encoding="utf-8") as f:
    print(f.read(), end="")
`,
        answer: src`
import csv

def write_star_report(events, path):
    seen = set()
    stars = {}
    for event in events:
        if event["type"] != "WatchEvent" or event["id"] in seen:
            continue
        seen.add(event["id"])
        stars[event["repo"]] = stars.get(event["repo"], 0) + 1
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["repo", "stars"])
        for repo in sorted(stars):
            writer.writerow([repo, stars[repo]])

events = [
    {"id": "48000007504", "type": "WatchEvent", "repo": "tidewater/easystore"},
    {"id": "48000009120", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000000581", "type": "PushEvent", "repo": "tidewater/smartqueue"},
    {"id": "48000009120", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
    {"id": "48000006650", "type": "WatchEvent", "repo": "lumen-labs/pyauth"},
]
write_star_report(events, "stars.csv")
write_star_report(events, "stars.csv")
with open("stars.csv", encoding="utf-8") as f:
    print(f.read(), end="")
`,
        alternatives: [
          src`
from collections import Counter

def write_star_report(events, path):
    unique = {e["id"]: e for e in events if e["type"] == "WatchEvent"}
    stars = Counter(e["repo"] for e in unique.values())
    text = "repo,stars\n"
    for repo, count in sorted(stars.items()):
        text += f"{repo},{count}\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
`,
        ],
        wrong: [
          {
            code: src`
import csv

def write_star_report(events, path):
    seen = set()
    stars = {}
    for event in events:
        if event["type"] != "WatchEvent" or event["id"] in seen:
            continue
        seen.add(event["id"])
        stars[event["repo"]] = stars.get(event["repo"], 0) + 1
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["repo", "stars"])
        for repo in sorted(stars):
            writer.writerow([repo, stars[repo]])
`,
            fails: ["rerun", "stale"],
            why: "append mode adds a second copy of the report on every run",
          },
          {
            code: src`
import csv

def write_star_report(events, path):
    stars = {}
    for event in events:
        if event["type"] == "WatchEvent":
            stars[event["repo"]] = stars.get(event["repo"], 0) + 1
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["repo", "stars"])
        for repo in sorted(stars):
            writer.writerow([repo, stars[repo]])
`,
            fails: ["returns", "rerun", "stale"],
            why: "a repeated event is counted twice",
          },
          {
            code: src`
import csv

def write_star_report(events, path):
    seen = set()
    stars = {}
    for event in events:
        if event["type"] != "WatchEvent" or event["id"] in seen:
            continue
        seen.add(event["id"])
        stars[event["repo"]] = stars.get(event["repo"], 0) + 1
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["repo", "stars"])
        for repo in stars:
            writer.writerow([repo, stars[repo]])
`,
            fails: ["returns", "rerun", "order"],
            why: "rows come out in the order repos were first seen, so the same day can produce different files",
          },
        ],
        hints: [
          "Two separate jobs: count (each ID once, only WatchEvents), then write.",
          "Write the whole file each run: the mode that replaces the file's contents, not the one that adds to it.",
          "Sort the repo names before writing, so the same counts always give the same bytes.",
        ],
        task: {
          checks: [
            expr("returns", "the starter's events give the right report", lines(
              "_ev = " + JSON.stringify([{ id: "48000007504", type: "WatchEvent", repo: "tidewater/easystore" }, { id: "48000009120", type: "WatchEvent", repo: "lumen-labs/pyauth" }, { id: "48000000581", type: "PushEvent", repo: "tidewater/smartqueue" }, { id: "48000009120", type: "WatchEvent", repo: "lumen-labs/pyauth" }, { id: "48000006650", type: "WatchEvent", repo: "lumen-labs/pyauth" }]),
              "write_star_report(_ev, 'chk1.csv')",
              "import csv as _csv",
              "with open('chk1.csv', newline='', encoding='utf-8') as _f:",
              "    result = list(_csv.reader(_f))",
            ), [["repo", "stars"], ["lumen-labs/pyauth", "2"], ["tidewater/easystore", "1"]], { show: "write_star_report(events, 'stars.csv')" }),
            expr("rerun", "a second run leaves exactly the same file", lines(
              "_ev = " + JSON.stringify([{ id: "e1", type: "WatchEvent", repo: "z/last" }, { id: "e2", type: "WatchEvent", repo: "a/first" }, { id: "e2", type: "WatchEvent", repo: "a/first" }, { id: "e3", type: "WatchEvent", repo: "z/last" }]),
              "write_star_report(_ev, 'chk2.csv')",
              "_first = open('chk2.csv', 'rb').read()",
              "write_star_report(_ev, 'chk2.csv')",
              "import csv as _csv",
              "with open('chk2.csv', newline='', encoding='utf-8') as _f:",
              "    result = (open('chk2.csv', 'rb').read() == _first, list(_csv.reader(_f)))",
            ), py.tuple(py.bool(true), pv([["repo", "stars"], ["a/first", "1"], ["z/last", "2"]])), { hidden: true }),
            expr("stale", "an old report already in the file", lines(
              writeFile("chk3.csv", "repo,stars\nold/repo,9\n"),
              "write_star_report([{'id': 'w1', 'type': 'WatchEvent', 'repo': 'r/new'}, {'id': 'w1', 'type': 'WatchEvent', 'repo': 'r/new'}], 'chk3.csv')",
              "import csv as _csv",
              "with open('chk3.csv', newline='', encoding='utf-8') as _f:",
              "    result = list(_csv.reader(_f))",
            ), [["repo", "stars"], ["r/new", "1"]], { hidden: true }),
            expr("order", "repos first seen in reverse name order", lines(
              "write_star_report([{'id': 'b', 'type': 'WatchEvent', 'repo': 'm/mid'}, {'id': 'c', 'type': 'WatchEvent', 'repo': 'b/early'}], 'chk4.csv')",
              "import csv as _csv",
              "with open('chk4.csv', newline='', encoding='utf-8') as _f:",
              "    result = list(_csv.reader(_f))",
            ), [["repo", "stars"], ["b/early", "1"], ["m/mid", "1"]], { hidden: true }),
            expr("no-stars", "a day with no stars", lines(
              "write_star_report([{'id': 'p', 'type': 'PushEvent', 'repo': 'x/y'}], 'chk5.csv')",
              "import csv as _csv",
              "with open('chk5.csv', newline='', encoding='utf-8') as _f:",
              "    result = list(_csv.reader(_f))",
            ), [["repo", "stars"]], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "The same two updates arrive twice. What does this print?",
        program: src`
updates = [("O100282", "shipped"), ("O100376", "returned")]
status = {}
changes = 0
for attempt in [1, 2]:
    for order_id, new_status in updates:
        status[order_id] = new_status
        changes += 1
print(len(status), changes)
`,
        choices: ["2 4", "4 4", "2 2", "4 2"],
        answer: 0,
        why: "Setting a status by key is idempotent: the dictionary still has two orders. The counter is not: it counted every attempt, so it says 4.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the report is opened in append mode. The job runs twice. What does this print?",
        program: src`
def write_report(path, counts):
    with open(path, "a", encoding="utf-8") as f:
        for repo in sorted(counts):
            f.write(f"{repo},{counts[repo]}\n")

counts = {"lumen-labs/pyauth": 2, "tidewater/easystore": 1}
write_report("report.csv", counts)
write_report("report.csv", counts)
with open("report.csv", encoding="utf-8") as f:
    print(len(f.readlines()))
`,
        choices: ["4", "2", "1", "0"],
        answer: 0,
        why: "`\"a\"` adds to the end of the file, so the second run writes both lines again. With `\"w\"` the file is replaced and stays at 2 lines however often the job runs.",
      },
      {
        id: "q3",
        prompt: "Which of these steps is idempotent as written?",
        choices: [
          "Set order O100282's status to \"shipped\"",
          "Add 1 to the count of shipped orders",
          "Append a row to the shipments log",
          "Send the customer a \"your order shipped\" email",
        ],
        answer: 0,
        why: "Setting a value to a fixed result has the same effect however often it happens. The other three change something every time; each needs a remembered key to become safe.",
      },
    ],
    review: [
      "Idempotent: running a step again has no further effect. Pipelines are rerun, so every step should be.",
      "Store by natural key (dictionary, primary key with `ON CONFLICT`) instead of appending.",
      "Remember the IDs of changes already applied, adding each one as it is made; write output files in full and sorted.",
      "Next: a long run that crashes halfway shouldn't start from zero. A checkpoint records how far it got.",
    ],
  },
  // ------------------------------------------------------------------ PY-L46-04 checkpoints
  {
    id: "PY-L46-04",
    version: 2,
    slug: "save-a-checkpoint",
    title: "Save progress with a checkpoint",
    lede: "A backfill that crashes after two hours shouldn't start again from zero. A checkpoint is a small file saying how far the run got, written after the work it describes and replaced in one step, so it is never half written.",
    focus: "Save a checkpoint (position and partial results) after each unit of work, atomically, and load it safely.",
    minutes: 20,
    objectives: [
      "Decide what a checkpoint must hold: the position to continue from and the partial results",
      "Write it atomically: a temporary file, then `os.replace`",
      "Save the checkpoint only after the work it describes is done, and refuse to trust a damaged one",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comment", "comparison", "conversion", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "end", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-loop", "newline-escape", "path-call", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "try-except", "type-call", "unquoted-name", "while-loop", "with-statement"],
    teaches: ["checkpoint-file"],
    blocks: [
      {
        kind: "text",
        md: "Long jobs fail partway: a machine restarts, a deploy kills the process, one file is unreadable. A **checkpoint** is a small record of progress, saved as the job goes, so a restart can continue instead of repeating hours of work.\n\nIt holds two kinds of thing: **where to continue** (the files already done, or an offset into a list) and **the partial results** that can't be recomputed cheaply (running totals). Not the data itself: the input still exists and can be read again.\n\nTwo rules make it trustworthy. First, save it **after** the work it describes, never before; otherwise a crash in between skips work on restart. Second, write it **atomically**: write a temporary file, then `os.replace(temporary, path)`. Replacing swaps the name in one step, so anyone reading the checkpoint sees either the old complete file or the new complete file, never half of one (you wrote `atomic_write` this way in the Decorators & Context Managers module).",
      },
      {
        kind: "example",
        title: "Save and load a checkpoint",
        code: src`
import json
import os

def save_checkpoint(path, state):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(temporary, path)

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"done": [], "pushes": 0}
    with open(path, encoding="utf-8") as f:
        return json.load(f)

pushes_per_hour = {"2025-03-03-00.jsonl": 41, "2025-03-03-01.jsonl": 38, "2025-03-03-02.jsonl": 35}

state = load_checkpoint("backfill.json")
for name, pushes in pushes_per_hour.items():
    state["pushes"] += pushes
    state["done"].append(name)
    save_checkpoint("backfill.json", state)
    print("saved after", name)

print(load_checkpoint("backfill.json"))
print(os.path.exists("backfill.json.tmp"))
`,
        output: "saved after 2025-03-03-00.jsonl\nsaved after 2025-03-03-01.jsonl\nsaved after 2025-03-03-02.jsonl\n{'done': ['2025-03-03-00.jsonl', '2025-03-03-01.jsonl', '2025-03-03-02.jsonl'], 'pushes': 114}\nFalse\n",
        note: "The state is saved after each hour has been added in, so the file always describes finished work. `os.replace` renames the temporary file over the old checkpoint, so no `.tmp` file is left behind. With no checkpoint yet, the run starts from an empty state.",
      },
      {
        kind: "text",
        md: "Why the detour through a temporary file? A process can be killed in the middle of a write. Writing straight into the checkpoint with `open(path, \"w\")` first empties the file, then fills it; stop in between and the only record of two hours' progress is a fragment:",
      },
      {
        kind: "error-example",
        title: "A checkpoint cut off mid-write",
        code: src`
import json

state = {"done": ["2025-03-03-00.jsonl", "2025-03-03-01.jsonl"], "pushes": 79}
text = json.dumps(state)
with open("backfill.json", "w", encoding="utf-8") as f:
    f.write(text[:30])          # the process was killed here, part way through the write

with open("backfill.json", encoding="utf-8") as f:
    print(json.load(f))
`,
        error: "JSONDecodeError",
        output: "",
        note: "The restart can't read its own progress. Worse, a loader that \"helpfully\" starts from zero when the checkpoint is unreadable would redo two hours and, if outputs aren't idempotent (L03), double them. A damaged checkpoint should stop the run with a clear error.",
      },
      {
        kind: "text",
        md: "When the work is a long list rather than a set of files, the position is an **offset**: how many items are finished. Work in batches and save after each batch; saving after every single item is safe but slow, and saving rarely means more repeated work after a crash.",
      },
      {
        kind: "example",
        title: "Batches with an offset",
        code: src`
import json
import os

def save_checkpoint(path, state):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(temporary, path)

pushes = [
    {"id": "48000000581", "commits": 2},
    {"id": "48000003472", "commits": 2},
    {"id": "48000000105", "commits": 3},
    {"id": "48000003143", "commits": 3},
    {"id": "48000005159", "commits": 1},
]
BATCH = 2
state = {"offset": 0, "commits": 0}
for start in range(state["offset"], len(pushes), BATCH):
    batch = pushes[start:start + BATCH]
    for push in batch:
        state["commits"] += push["commits"]
    state["offset"] = start + len(batch)
    save_checkpoint("commits.json", state)
    print("checkpoint", state)
`,
        output: "checkpoint {'offset': 2, 'commits': 4}\ncheckpoint {'offset': 4, 'commits': 10}\ncheckpoint {'offset': 5, 'commits': 11}\n",
        note: "The offset counts finished items, so it is also the index of the next one to do. The last batch is shorter, and `start + len(batch)` handles that. A restart would begin the `range` at the saved offset (L05).",
      },
      {
        kind: "text",
        md: "**When to use it:** any run long enough that starting over hurts: backfills, migrations, big exports. **Mistakes to avoid:** saving before the work is done; writing the checkpoint in place instead of replacing it; storing the whole dataset instead of a position; and treating an unreadable checkpoint as \"no checkpoint\".",
      },
    ],
    tryIt: {
      id: "try",
      title: "Replace the checkpoint in one step",
      prompt: "`save_checkpoint` writes straight into the checkpoint file, so a failure while writing destroys the previous one. Write the JSON to `path + \".tmp\"` first, then `os.replace` it over `path`.",
      spec: [
        ["Function", "`save_checkpoint(path, state)`"],
        ["Result", "`path` holds `state` as JSON; no `.tmp` file is left; if writing fails, the old checkpoint is still intact"],
      ],
      starter: src`
import json
import os

def save_checkpoint(path, state):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f)

save_checkpoint("progress.json", {"offset": 4, "commits": 10})
with open("progress.json", encoding="utf-8") as f:
    print(f.read())
`,
      answer: src`
import json
import os

def save_checkpoint(path, state):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(temporary, path)

save_checkpoint("progress.json", {"offset": 4, "commits": 10})
with open("progress.json", encoding="utf-8") as f:
    print(f.read())
`,
      wrong: [
        {
          code: src`
import json
import os

def save_checkpoint(path, state):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(state, f)
`,
          fails: ["saves", "no-tmp", "survives-crash"],
          why: "the temporary file is written but never moved into place",
        },
      ],
      hints: ["Two steps: write somewhere else, then move it into place.", "The temporary name can be the checkpoint's name plus `.tmp`.", "After the `with` block has closed the temporary file, one call from the `os` module renames it over the real checkpoint."],
      task: {
        checks: [
          expr("saves", "save_checkpoint() writes the state", "save_checkpoint('t1.json', {'offset': 6, 'commits': 13})\nimport json as _j\nresult = _j.load(open('t1.json', encoding='utf-8'))", { offset: 6, commits: 13 }, { show: "save_checkpoint('progress.json', {'offset': 6, 'commits': 13})" }),
          expr("no-tmp", "no temporary file is left behind", "import os as _os\nsave_checkpoint('t2.json', {'offset': 1})\nresult = _os.path.exists('t2.json.tmp')", false),
          expr("survives-crash", "a failed save leaves the old checkpoint intact", lines(
            "import json as _j",
            "save_checkpoint('t3.json', {'offset': 4})",
            "try:",
            "    save_checkpoint('t3.json', {'offset': 6, 'seen': {'a', 'b'}})",
            "except TypeError:",
            "    pass",
            "result = _j.load(open('t3.json', encoding='utf-8'))",
          ), { offset: 4 }, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Load a checkpoint you can trust",
        prompt: "Write `load_checkpoint(path)` for a batch job whose checkpoint looks like `{\"offset\": 4, \"totals\": {...}}`. No file means a fresh start: return `{\"offset\": 0, \"totals\": {}}`. A readable file is returned as it is. But a damaged checkpoint must not be mistaken for a fresh start: raise `ValueError` when the file isn't valid JSON, isn't an object, has an `offset` that isn't a whole number ≥ 0 (`True` doesn't count), or has `totals` that isn't an object.",
        spec: [
          ["Function", "`load_checkpoint(path)`"],
          ["Returns", "the saved dictionary, or `{\"offset\": 0, \"totals\": {}}` when the file doesn't exist"],
          ["Raises", "`ValueError` for an unreadable or malformed checkpoint (the message should name the file)"],
          ["Example", "the starter's file → `{'offset': 4, 'totals': {'PushEvent': 3}}`; a missing file → `{'offset': 0, 'totals': {}}`"],
        ],
        starter: src`
import json
import os

def load_checkpoint(path):
    return {"offset": 0, "totals": {}}

with open("job.json", "w", encoding="utf-8") as f:
    f.write('{"offset": 4, "totals": {"PushEvent": 3}}')
print(load_checkpoint("job.json"))
print(load_checkpoint("missing.json"))
`,
        answer: src`
import json
import os

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            raise ValueError(f"checkpoint {path} is not valid JSON")
    if not isinstance(state, dict):
        raise ValueError(f"checkpoint {path} is not an object")
    offset = state.get("offset")
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        raise ValueError(f"checkpoint {path} has a bad offset")
    if not isinstance(state.get("totals"), dict):
        raise ValueError(f"checkpoint {path} has bad totals")
    return state

with open("job.json", "w", encoding="utf-8") as f:
    f.write('{"offset": 4, "totals": {"PushEvent": 3}}')
print(load_checkpoint("job.json"))
print(load_checkpoint("missing.json"))
`,
        alternatives: [
          src`
import json
from pathlib import Path

def valid(state):
    if not isinstance(state, dict):
        return False
    offset = state.get("offset")
    return type(offset) is int and offset >= 0 and isinstance(state.get("totals"), dict)

def load_checkpoint(path):
    file = Path(path)
    if not file.exists():
        return {"offset": 0, "totals": {}}
    try:
        state = json.loads(file.read_text(encoding="utf-8"))
    except ValueError:
        raise ValueError("unreadable checkpoint: " + str(path))
    if not valid(state):
        raise ValueError("malformed checkpoint: " + str(path))
    return state
`,
        ],
        wrong: [
          {
            code: src`
import json
import os

def load_checkpoint(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"offset": 0, "totals": {}}
`,
            fails: ["corrupt", "shape", "bool", "negative"],
            why: "a damaged checkpoint silently becomes a fresh start, so the job redoes and double-counts its work",
          },
          {
            code: src`
import json
import os

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            raise ValueError(f"checkpoint {path} is not valid JSON")
    if not isinstance(state, dict) or not isinstance(state.get("offset"), int) or not isinstance(state.get("totals"), dict):
        raise ValueError(f"checkpoint {path} is malformed")
    return state
`,
            fails: ["bool", "negative"],
            why: "`True` passes as an int offset and a negative offset is accepted",
          },
          {
            code: src`
import json

def load_checkpoint(path):
    with open(path, encoding="utf-8") as f:
        state = json.load(f)
    if not isinstance(state, dict) or type(state.get("offset")) is not int or state["offset"] < 0 or not isinstance(state.get("totals"), dict):
        raise ValueError("bad checkpoint " + path)
    return state
`,
            fails: ["missing", "corrupt"],
            why: "a missing file raises `FileNotFoundError` instead of starting fresh, and bad JSON leaks `JSONDecodeError`",
          },
        ],
        hints: [
          "Three outcomes: no file (fresh start), a good file (return it), anything else (`ValueError`).",
          "Check the parsed value step by step: is it a dictionary, is `offset` a non-negative whole number, is `totals` a dictionary?",
          "A bool is an int to `isinstance`; test for it first. Catch the JSON error and raise `ValueError` in its place.",
        ],
        task: {
          checks: [
            expr("returns", "load_checkpoint() reads a good checkpoint", lines(writeFile("k1.json", '{"offset": 4, "totals": {"PushEvent": 3}}'), "result = load_checkpoint('k1.json')"), { offset: 4, totals: { PushEvent: 3 } }, { show: "load_checkpoint('job.json')" }),
            expr("missing", "no checkpoint file means a fresh start", "result = load_checkpoint('nothing-here.json')", { offset: 0, totals: {} }, { show: "load_checkpoint('missing.json')" }),
            raisesExpr("corrupt", "a checkpoint cut off mid-write", lines(writeFile("k2.json", '{"offset": 4, "tot'), "load_checkpoint('k2.json')"), "ValueError", { hidden: true }),
            raisesExpr("shape", "a checkpoint that is valid JSON but not an object", lines(writeFile("k3.json", "[4, {}]"), "load_checkpoint('k3.json')"), "ValueError", { hidden: true }),
            raisesExpr("bool", "an offset that is true/false", lines(writeFile("k4.json", '{"offset": true, "totals": {}}'), "load_checkpoint('k4.json')"), "ValueError", { hidden: true }),
            raisesExpr("negative", "a negative offset", lines(writeFile("k5.json", '{"offset": -2, "totals": {}}'), "load_checkpoint('k5.json')"), "ValueError", { hidden: true }),
            expr("zero", "a checkpoint at offset 0 with empty totals", lines(writeFile("k6.json", '{"offset": 0, "totals": {}}'), "result = load_checkpoint('k6.json')"), { offset: 0, totals: {} }, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Never let the checkpoint get ahead of the output",
        prompt: "`export_batches(events, out_path, ckpt_path, size)` copies events to a text file, one line `\"<id> <type>\"` per event, `size` events at a time, and saves the checkpoint `{\"offset\": <events written>}` after each batch. Write it so the checkpoint and the file always agree, even when the run crashes: build a batch's lines first (an event without `type` raises `KeyError` there), then append them to the file, then save the checkpoint with `json` through a temporary file and `os.replace`. Don't catch the error: let it stop the run.",
        spec: [
          ["Function", "`export_batches(events, out_path, ckpt_path, size)`; starts from offset 0 and returns nothing"],
          ["Order per batch", "build every line of the batch → append them to `out_path` → save the checkpoint"],
          ["Guarantee", "after a crash, the checkpoint's offset equals the number of lines in the output file"],
          ["Example", "the starter's 5 events, size 2 → 5 lines and checkpoint `{'offset': 5}`"],
        ],
        starter: src`
import json
import os

def export_batches(events, out_path, ckpt_path, size):
    pass

events = [
    {"id": "48000000581", "type": "PushEvent"},
    {"id": "48000001631", "type": "CreateEvent"},
    {"id": "48000007504", "type": "WatchEvent"},
    {"id": "48000002275", "type": "IssuesEvent"},
    {"id": "48000006895", "type": "IssueCommentEvent"},
]
export_batches(events, "export.txt", "export.ckpt", 2)
with open("export.txt", encoding="utf-8") as f:
    print(f.read(), end="")
with open("export.ckpt", encoding="utf-8") as f:
    print(f.read())
`,
        answer: src`
import json
import os

def save_checkpoint(path, state):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(temporary, path)

def export_batches(events, out_path, ckpt_path, size):
    for start in range(0, len(events), size):
        batch = events[start:start + size]
        lines = [f"{event['id']} {event['type']}\n" for event in batch]
        with open(out_path, "a", encoding="utf-8") as out:
            out.writelines(lines)
        save_checkpoint(ckpt_path, {"offset": start + len(batch)})

events = [
    {"id": "48000000581", "type": "PushEvent"},
    {"id": "48000001631", "type": "CreateEvent"},
    {"id": "48000007504", "type": "WatchEvent"},
    {"id": "48000002275", "type": "IssuesEvent"},
    {"id": "48000006895", "type": "IssueCommentEvent"},
]
export_batches(events, "export.txt", "export.ckpt", 2)
with open("export.txt", encoding="utf-8") as f:
    print(f.read(), end="")
with open("export.ckpt", encoding="utf-8") as f:
    print(f.read())
`,
        alternatives: [
          src`
import json
import os

def export_batches(events, out_path, ckpt_path, size):
    written = 0
    while written < len(events):
        batch = events[written:written + size]
        text = ""
        for event in batch:
            text += event["id"] + " " + event["type"] + "\n"
        with open(out_path, "a", encoding="utf-8") as out:
            out.write(text)
        written += len(batch)
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            f.write(json.dumps({"offset": written}))
        os.replace(ckpt_path + ".tmp", ckpt_path)
`,
        ],
        wrong: [
          {
            code: src`
import json
import os

def export_batches(events, out_path, ckpt_path, size):
    for start in range(0, len(events), size):
        batch = events[start:start + size]
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"offset": start + len(batch)}, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
        lines = [f"{event['id']} {event['type']}\n" for event in batch]
        with open(out_path, "a", encoding="utf-8") as out:
            out.writelines(lines)
`,
            fails: ["crash"],
            why: "the checkpoint is saved before the batch is written, so after a crash it claims work that never reached the file",
          },
          {
            code: src`
import json
import os

def export_batches(events, out_path, ckpt_path, size):
    for start in range(0, len(events), size):
        batch = events[start:start + size]
        with open(out_path, "a", encoding="utf-8") as out:
            for event in batch:
                out.write(f"{event['id']} {event['type']}\n")
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"offset": start + len(batch)}, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
`,
            fails: ["crash"],
            why: "lines are written one at a time, so a crash halfway through a batch leaves lines the checkpoint doesn't cover",
          },
          {
            code: src`
import json
import os

def export_batches(events, out_path, ckpt_path, size):
    for start in range(0, len(events), size):
        batch = events[start:start + size]
        lines = [f"{event['id']} {event['type']}\n" for event in batch]
        with open(out_path, "a", encoding="utf-8") as out:
            out.writelines(lines)
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"offset": start + size}, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
`,
            fails: ["returns", "odd"],
            why: "`start + size` overshoots on the last, shorter batch",
          },
        ],
        hints: [
          "One loop over batches; each pass does three things, in an order that matters.",
          "Make every line of the batch before opening the output: if an event is broken, nothing of that batch is written.",
          "The offset is how many events are now in the file: the batch's start plus the batch's real length.",
        ],
        task: {
          checks: [
            expr("returns", "export_batches() writes every event and the final checkpoint", lines(
              "import json as _j",
              "_ev = " + JSON.stringify([{ id: "48000000581", type: "PushEvent" }, { id: "48000001631", type: "CreateEvent" }, { id: "48000007504", type: "WatchEvent" }, { id: "48000002275", type: "IssuesEvent" }, { id: "48000006895", type: "IssueCommentEvent" }]),
              "export_batches(_ev, 'x1.txt', 'x1.ckpt', 2)",
              "result = (open('x1.txt', encoding='utf-8').read().splitlines(), _j.load(open('x1.ckpt', encoding='utf-8')))",
            ), py.tuple(pv(["48000000581 PushEvent", "48000001631 CreateEvent", "48000007504 WatchEvent", "48000002275 IssuesEvent", "48000006895 IssueCommentEvent"]), pv({ offset: 5 })), { show: "export_batches(events, 'export.txt', 'export.ckpt', 2)" }),
            expr("crash", "a crash part way through a batch leaves file and checkpoint in agreement", lines(
              "import json as _j",
              "_ev = [{'id': 'a', 'type': 'PushEvent'}, {'id': 'b', 'type': 'PushEvent'}, {'id': 'c', 'type': 'WatchEvent'}, {'id': 'd'}, {'id': 'e', 'type': 'PushEvent'}]",
              "try:",
              "    export_batches(_ev, 'x2.txt', 'x2.ckpt', 2)",
              "except KeyError:",
              "    pass",
              "_lines = open('x2.txt', encoding='utf-8').read().splitlines()",
              "result = (len(_lines), _j.load(open('x2.ckpt', encoding='utf-8'))['offset'])",
            ), py.tuple(py.int(2), py.int(2)), { hidden: true }),
            expr("odd", "a size that doesn't divide the events evenly", lines(
              "import json as _j",
              "export_batches([{'id': str(_i), 'type': 'ForkEvent'} for _i in range(7)], 'x3.txt', 'x3.ckpt', 3)",
              "result = (len(open('x3.txt', encoding='utf-8').read().splitlines()), _j.load(open('x3.ckpt', encoding='utf-8')))",
            ), py.tuple(py.int(7), pv({ offset: 7 })), { hidden: true }),
            expr("no-tmp", "no temporary checkpoint file is left", lines(
              "import os as _os",
              "export_batches([{'id': 'z', 'type': 'PushEvent'}], 'x4.txt', 'x4.ckpt', 5)",
              "result = sorted(_n for _n in _os.listdir('.') if _n.startswith('x4'))",
            ), ["x4.ckpt", "x4.txt"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
items = ["e1", "e2", "e3", "e4", "e5", "e6", "e7"]
saved = []
for start in range(0, len(items), 3):
    batch = items[start:start + 3]
    saved.append(start + len(batch))
print(saved)
`,
        choices: ["[3, 6, 7]", "[3, 6, 9]", "[0, 3, 6]", "[3, 6]"],
        answer: 0,
        why: "Batches start at 0, 3 and 6. The last one holds a single item, so the offset saved after it is 6 + 1 = 7, the number of items finished.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the checkpoint is saved before the work. The process is killed during the second batch. Where will the restart continue?",
        program: src`
def run(items, checkpoint):
    for start in range(checkpoint["offset"], len(items), 2):
        checkpoint["offset"] = start + 2
        if start == 2:
            return "killed"
    return "finished"

checkpoint = {"offset": 0}
run(["a", "b", "c", "d", "e", "f"], checkpoint)
print(checkpoint["offset"])
`,
        choices: ["4", "2", "0", "6"],
        answer: 0,
        why: "The offset was set to 4 before items c and d were processed. The restart begins at e: c and d are never done. Save the position only after the work it describes.",
      },
      {
        id: "q3",
        prompt: "Why write the checkpoint to a temporary file and then `os.replace` it?",
        choices: [
          "A reader then sees the old complete checkpoint or the new complete one, never a half-written file",
          "Temporary files are faster to write",
          "`os.replace` compresses the JSON",
          "So two checkpoints are kept, the old one and the new one",
        ],
        answer: 0,
        why: "Replacing a name happens in one step. Writing in place empties the file first, so a crash during the write leaves a fragment.",
      },
    ],
    review: [
      "A checkpoint holds where to continue and the partial results, not the data.",
      "Save it after the work it describes; write it to a temporary file and `os.replace` it.",
      "No checkpoint means a fresh start; a damaged one must stop the run, not restart it.",
      "Next: use the checkpoint to recover from a real crash and finish with the same result as a clean run.",
    ],
  },
  // ------------------------------------------------------------------ PY-L46-05 recovery
  {
    id: "PY-L46-05",
    version: 2,
    slug: "resume-after-a-crash",
    title: "Resume after a crash",
    lede: "Recovery is the payoff of checkpoints and idempotent writes: after a crash the run continues from its checkpoint, cleans up anything written after it, and ends with exactly the result a clean run would have produced.",
    focus: "Resume a crashed run from its checkpoint so that the final result equals one clean run: no work lost, none done twice.",
    minutes: 22,
    objectives: [
      "Resume a loop from a saved offset or a list of finished units, and clear the checkpoint when the run completes",
      "Handle output written after the last checkpoint: make it idempotent, or cut it back to the checkpoint",
      "Test recovery the honest way: crash a run for real, resume it, and compare with a clean run",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comment", "comment-out", "conditional-expr", "continue-statement", "conversion", "counter-call", "dict-get", "dict-literal", "dict-lookup", "dir-list", "else-clause", "encoding-arg", "end", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "nested-loop", "newline-escape", "path-call", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "sql-tx", "sqlite-call", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "with-statement"],
    teaches: ["resume-run"],
    blocks: [
      {
        kind: "text",
        md: "A checkpoint is only useful if the restart uses it correctly. **Recovery** means three things. Continue from the saved position instead of the beginning. Deal with work done *after* the last checkpoint, because a crash can land between writing output and saving the checkpoint. And when the run finishes, remove the checkpoint, or tomorrow's run will think today's is still in progress.\n\nThe test of a recovery design is simple to state: **crash it, resume it, and the result must equal one clean run**. The examples do exactly that, with a real exception standing in for the crash.",
      },
      {
        kind: "example",
        title: "Crash, then resume",
        code: src`
import json
import os

def save(path, state):
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(path + ".tmp", path)

def load(path):
    if not os.path.exists(path):
        return {"offset": 0, "counts": {}}
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def count_types(events, path):
    state = load(path)
    for position in range(state["offset"], len(events)):
        kind = events[position]["type"]
        state["counts"][kind] = state["counts"].get(kind, 0) + 1
        state["offset"] = position + 1
        save(path, state)
    os.remove(path)
    return state["counts"]

events = [
    {"id": "48000000581", "type": "PushEvent"},
    {"id": "48000001631", "type": "CreateEvent"},
    {"id": "48000007504", "type": "WatchEvent"},
    {"id": "48000002275"},
    {"id": "48000006895", "type": "PushEvent"},
]
try:
    count_types(events, "types.ckpt")
except KeyError as err:
    print("run 1 crashed on", err, "with checkpoint", load("types.ckpt"))

events[3]["type"] = "IssuesEvent"      # the damaged event is repaired upstream
print("run 2:", count_types(events, "types.ckpt"))
print("clean:", count_types(events, "fresh.ckpt"))
print(os.path.exists("types.ckpt"))
`,
        output: "run 1 crashed on 'type' with checkpoint {'offset': 3, 'counts': {'PushEvent': 1, 'CreateEvent': 1, 'WatchEvent': 1}}\nrun 2: {'PushEvent': 2, 'CreateEvent': 1, 'WatchEvent': 1, 'IssuesEvent': 1}\nclean: {'PushEvent': 2, 'CreateEvent': 1, 'WatchEvent': 1, 'IssuesEvent': 1}\nFalse\n",
        note: "Run 1 really crashed, at position 3; its checkpoint holds the first three counts. Run 2 started its `range` at offset 3, so nothing was counted twice, and it matches a clean run exactly. `os.remove` at the end clears the checkpoint once the work is complete.",
      },
      {
        kind: "text",
        md: "Counting in memory is the easy case: everything after the checkpoint was lost with the process. Output written to a database or a file is harder, because it survives the crash. If the process writes a batch and dies before saving the checkpoint, the restart will write that batch again.\n\nThere are two ways out. The first is the one from L03: make the write idempotent, so writing a batch twice is harmless (*at-least-once* delivery plus idempotent writes gives *exactly-once* results). The second, for plain files, is to cut the output back to what the checkpoint describes before continuing (the challenges use that one).",
      },
      {
        kind: "example",
        title: "Replay is harmless when writes are idempotent",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)")

def load_from(conn, events, offset):
    for event in events[offset:]:
        conn.execute(
            "INSERT INTO events VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING",
            (event["id"], event["type"]),
        )
    conn.commit()

events = [
    {"id": "48000000581", "type": "PushEvent"},
    {"id": "48000001631", "type": "CreateEvent"},
    {"id": "48000007504", "type": "WatchEvent"},
    {"id": "48000002275", "type": "IssuesEvent"},
    {"id": "48000006895", "type": "IssueCommentEvent"},
]

# What the disk holds after the crash: three rows were committed,
# but the process died before the checkpoint moved past the second.
load_from(conn, events[:3], 0)
checkpoint_offset = 2

load_from(conn, events, checkpoint_offset)     # the restart replays event 3
print(conn.execute("SELECT COUNT(*) FROM events").fetchone()[0])
print(conn.execute("SELECT COUNT(DISTINCT event_id) FROM events").fetchone()[0])
`,
        output: "5\n5\n",
        note: "The restart sends event 48000007504 a second time. The primary key turns that into a no-op, so the table ends with each of the five events exactly once, the same as a clean run.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a job keeps a checkpoint; recovery is the part that has to be right. **Mistakes to avoid:** starting the loop at 0 instead of the saved offset; appending to an output file without first cutting it back to the checkpoint; never deleting the checkpoint, so the next run skips everything; and testing recovery only by reading the code. Crash it on purpose and compare with a clean run.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Start where the checkpoint says",
      prompt: "`total_commits` loads its checkpoint but then starts the loop at 0, so a resumed run counts the first events twice. Start the loop at the saved offset.",
      spec: [
        ["Function", "`total_commits(pushes, state)`; `state` is the loaded checkpoint `{\"offset\": n, \"total\": t}`"],
        ["Returns", "the total commits for all pushes, continuing from the checkpoint"],
      ],
      starter: src`
def total_commits(pushes, state):
    total = state["total"]
    for position in range(0, len(pushes)):
        total += pushes[position]["commits"]
    return total

pushes = [{"commits": 2}, {"commits": 2}, {"commits": 3}, {"commits": 3}]
print(total_commits(pushes, {"offset": 2, "total": 4}))
`,
      answer: src`
def total_commits(pushes, state):
    total = state["total"]
    for position in range(state["offset"], len(pushes)):
        total += pushes[position]["commits"]
    return total

pushes = [{"commits": 2}, {"commits": 2}, {"commits": 3}, {"commits": 3}]
print(total_commits(pushes, {"offset": 2, "total": 4}))
`,
      wrong: [
        {
          code: src`
def total_commits(pushes, state):
    total = 0
    for position in range(state["offset"], len(pushes)):
        total += pushes[position]["commits"]
    return total
`,
          fails: ["returns"],
          why: "it skips the finished pushes but also throws away the total the checkpoint saved for them",
        },
      ],
      hints: ["The checkpoint has two parts, and the function already uses one of them.", "The `range` decides where counting begins.", "The first position still to do is the saved offset."],
      task: {
        checks: [
          fn("returns", "total_commits", [
            example([[{ commits: 2 }, { commits: 2 }, { commits: 3 }, { commits: 3 }], { offset: 2, total: 4 }], 10),
            hiddenCase("a fresh start", [[{ commits: 1 }, { commits: 5 }], { offset: 0, total: 0 }], 6),
            hiddenCase("a checkpoint at the very end", [[{ commits: 4 }, { commits: 4 }], { offset: 2, total: 8 }], 8),
          ], { label: "total_commits() continues from the checkpoint" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Resume a backfill file by file",
        prompt: "A backfill summarises each hourly file of a folder into its own output, `<name>.counts.json` (a dictionary from event type to count), written next to it. Write `backfill(folder, ckpt_path)`: process the folder's `.jsonl` files in name order, skipping the files listed under `\"done\"` in the checkpoint; after each file's output is written, add its name to `\"done\"` and save the checkpoint atomically. A file with a line that isn't valid JSON stops the run with the `json.JSONDecodeError` (don't catch it). When every file is done, delete the checkpoint. Return the names processed by **this** call, in order.",
        spec: [
          ["Function", "`backfill(folder, ckpt_path)`"],
          ["Checkpoint", "`{\"done\": [file names]}`; no file means nothing is done yet"],
          ["Output", "for `2025-03-03-00.jsonl`, the file `2025-03-03-00.jsonl.counts.json` in the same folder"],
          ["Returns", "the list of file names this call processed"],
          ["Example", "a crash on the second of three files, a fix, then a rerun → the rerun returns only the last two names"],
        ],
        starter: src`
import json
import os
from pathlib import Path

def backfill(folder, ckpt_path):
    return []

day = Path("hours")
day.mkdir(exist_ok=True)
(day / "2025-03-03-00.jsonl").write_text('{"type": "PushEvent"}\n{"type": "WatchEvent"}\n', encoding="utf-8")
(day / "2025-03-03-01.jsonl").write_text('{"type": "PushEvent"}\n{"type": "Push\n', encoding="utf-8")
(day / "2025-03-03-02.jsonl").write_text('{"type": "ForkEvent"}\n', encoding="utf-8")
try:
    backfill("hours", "backfill.ckpt")
except json.JSONDecodeError:
    print("crashed; checkpoint:", Path("backfill.ckpt").read_text(encoding="utf-8"))
(day / "2025-03-03-01.jsonl").write_text('{"type": "PushEvent"}\n{"type": "PushEvent"}\n', encoding="utf-8")
print(backfill("hours", "backfill.ckpt"))
`,
        answer: src`
import json
import os
from pathlib import Path

def save(path, state):
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(path + ".tmp", path)

def backfill(folder, ckpt_path):
    state = {"done": []}
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            state = json.load(f)
    processed = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        if path.name in state["done"]:
            continue
        counts = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    kind = json.loads(line)["type"]
                    counts[kind] = counts.get(kind, 0) + 1
        with open(str(path) + ".counts.json", "w", encoding="utf-8") as out:
            json.dump(counts, out)
        state["done"].append(path.name)
        save(ckpt_path, state)
        processed.append(path.name)
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
    return processed

day = Path("hours")
day.mkdir(exist_ok=True)
(day / "2025-03-03-00.jsonl").write_text('{"type": "PushEvent"}\n{"type": "WatchEvent"}\n', encoding="utf-8")
(day / "2025-03-03-01.jsonl").write_text('{"type": "PushEvent"}\n{"type": "Push\n', encoding="utf-8")
(day / "2025-03-03-02.jsonl").write_text('{"type": "ForkEvent"}\n', encoding="utf-8")
try:
    backfill("hours", "backfill.ckpt")
except json.JSONDecodeError:
    print("crashed; checkpoint:", Path("backfill.ckpt").read_text(encoding="utf-8"))
(day / "2025-03-03-01.jsonl").write_text('{"type": "PushEvent"}\n{"type": "PushEvent"}\n', encoding="utf-8")
print(backfill("hours", "backfill.ckpt"))
`,
        alternatives: [
          src`
import json
import os
from collections import Counter
from pathlib import Path

def backfill(folder, ckpt_path):
    ckpt = Path(ckpt_path)
    done = json.loads(ckpt.read_text(encoding="utf-8"))["done"] if ckpt.exists() else []
    names = sorted(p.name for p in Path(folder).iterdir() if p.name.endswith(".jsonl"))
    processed = []
    for name in names:
        if name in done:
            continue
        text = (Path(folder) / name).read_text(encoding="utf-8")
        counts = Counter(json.loads(line)["type"] for line in text.splitlines() if line.strip())
        (Path(folder) / (name + ".counts.json")).write_text(json.dumps(dict(counts)), encoding="utf-8")
        done.append(name)
        tmp = Path(ckpt_path + ".tmp")
        tmp.write_text(json.dumps({"done": done}), encoding="utf-8")
        os.replace(tmp, ckpt)
        processed.append(name)
    if ckpt.exists():
        ckpt.unlink()
    return processed
`,
        ],
        wrong: [
          {
            code: src`
import json
import os
from pathlib import Path

def backfill(folder, ckpt_path):
    processed = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        counts = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    kind = json.loads(line)["type"]
                    counts[kind] = counts.get(kind, 0) + 1
        with open(str(path) + ".counts.json", "w", encoding="utf-8") as out:
            json.dump(counts, out)
        processed.append(path.name)
    return processed
`,
            fails: ["resume", "checkpoint-saved"],
            why: "there is no checkpoint, so a rerun starts again from the first file",
          },
          {
            code: src`
import json
import os
from pathlib import Path

def backfill(folder, ckpt_path):
    state = {"done": []}
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            state = json.load(f)
    processed = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        if path.name in state["done"]:
            continue
        state["done"].append(path.name)
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump(state, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
        counts = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    kind = json.loads(line)["type"]
                    counts[kind] = counts.get(kind, 0) + 1
        with open(str(path) + ".counts.json", "w", encoding="utf-8") as out:
            json.dump(counts, out)
        processed.append(path.name)
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
    return processed
`,
            fails: ["resume", "checkpoint-saved", "outputs"],
            why: "the file is marked done before it is processed, so the file that crashed is skipped on resume and never summarised",
          },
          {
            code: src`
import json
import os
from pathlib import Path

def backfill(folder, ckpt_path):
    state = {"done": []}
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            state = json.load(f)
    processed = []
    for path in sorted(Path(folder).glob("*.jsonl")):
        if path.name in state["done"]:
            continue
        counts = {}
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    kind = json.loads(line)["type"]
                    counts[kind] = counts.get(kind, 0) + 1
        with open(str(path) + ".counts.json", "w", encoding="utf-8") as out:
            json.dump(counts, out)
        state["done"].append(path.name)
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump(state, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
        processed.append(path.name)
    return processed
`,
            fails: ["cleared"],
            why: "the checkpoint is never deleted, so the next run with new files of the same names would skip them all",
          },
        ],
        hints: [
          "Load the list of finished files (or an empty list), then loop over the folder's files in name order, skipping finished ones.",
          "For each file: count, write its output, then record it as done and save the checkpoint. That order is what makes a crash safe.",
          "When the loop completes without a crash, remove the checkpoint file.",
        ],
        task: {
          checks: [
            expr("resume", "after a crash and a fix, the rerun processes only the unfinished files", lines(
              writeFiles("bf1", { "2025-03-03-00.jsonl": '{"type": "PushEvent"}\n{"type": "WatchEvent"}\n', "2025-03-03-01.jsonl": '{"type": "PushEvent"}\n{"type": "Push\n', "2025-03-03-02.jsonl": '{"type": "ForkEvent"}\n' }),
              "import json as _j",
              "try:",
              "    backfill('bf1', 'bf1.ckpt')",
              "except _j.JSONDecodeError:",
              "    pass",
              "_P('bf1/2025-03-03-01.jsonl').write_text('{\"type\": \"PushEvent\"}\\n{\"type\": \"PushEvent\"}\\n', encoding='utf-8')",
              "result = backfill('bf1', 'bf1.ckpt')",
            ), ["2025-03-03-01.jsonl", "2025-03-03-02.jsonl"], { show: "backfill('hours', 'backfill.ckpt') after a crash and a fix" }),
            expr("checkpoint-saved", "the checkpoint left by a crash lists the finished file", lines(
              writeFiles("bf2", { "2025-03-03-00.jsonl": '{"type": "PushEvent"}\n', "2025-03-03-01.jsonl": "not json\n" }),
              "import json as _j",
              "try:",
              "    backfill('bf2', 'bf2.ckpt')",
              "except _j.JSONDecodeError:",
              "    pass",
              "result = _j.load(open('bf2.ckpt', encoding='utf-8'))",
            ), { done: ["2025-03-03-00.jsonl"] }, { hidden: true }),
            expr("outputs", "every file has its summary after the resumed run", lines(
              writeFiles("bf3", { "2025-03-03-05.jsonl": '{"type": "WatchEvent"}\n\n{"type": "WatchEvent"}\n', "2025-03-03-06.jsonl": "{oops\n" }),
              "import json as _j",
              "try:",
              "    backfill('bf3', 'bf3.ckpt')",
              "except _j.JSONDecodeError:",
              "    pass",
              "_P('bf3/2025-03-03-06.jsonl').write_text('{\"type\": \"ForkEvent\"}\\n', encoding='utf-8')",
              "backfill('bf3', 'bf3.ckpt')",
              "result = (_j.load(open('bf3/2025-03-03-05.jsonl.counts.json', encoding='utf-8')), _j.load(open('bf3/2025-03-03-06.jsonl.counts.json', encoding='utf-8')))",
            ), py.tuple(pv({ WatchEvent: 2 }), pv({ ForkEvent: 1 })), { hidden: true }),
            expr("cleared", "a finished run removes its checkpoint", lines(
              writeFiles("bf4", { "2025-03-04-00.jsonl": '{"type": "PushEvent"}\n' }),
              "import os as _os",
              "_first = backfill('bf4', 'bf4.ckpt')",
              "result = (_first, _os.path.exists('bf4.ckpt'))",
            ), py.tuple(pv(["2025-03-04-00.jsonl"]), py.bool(false)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Resume an export without duplicate lines",
        prompt: "`export_ids(events, out_path, ckpt_path)` writes each event's ID as one line of `out_path`, saving the checkpoint `{\"lines\": n}` (atomically) after each line. A crash can land after a line is written but before the checkpoint is saved, so on a restart the file may hold **more** lines than the checkpoint says. Write `export_ids` so that a restart first cuts the file back to the checkpoint's `lines`, then continues from event number `lines`. With no checkpoint, start a new file. When finished, delete the checkpoint.",
        spec: [
          ["Function", "`export_ids(events, out_path, ckpt_path)`; returns nothing"],
          ["Restart", "keep only the first `lines` lines of `out_path`, then continue from `events[lines]`"],
          ["Fresh start", "no checkpoint file: create or empty `out_path` and start at 0"],
          ["Example", "file with 3 lines and checkpoint `{'lines': 2}` → final file has each of the 5 IDs exactly once"],
        ],
        starter: src`
import json
import os

def export_ids(events, out_path, ckpt_path):
    pass

events = [{"id": "48000000581"}, {"id": "48000001631"}, {"id": "48000007504"}, {"id": "48000002275"}, {"id": "48000006895"}]
# What the crash left behind: three lines written, the checkpoint saved after two.
with open("ids.txt", "w", encoding="utf-8") as f:
    f.write("48000000581\n48000001631\n48000007504\n")
with open("ids.ckpt", "w", encoding="utf-8") as f:
    json.dump({"lines": 2}, f)
export_ids(events, "ids.txt", "ids.ckpt")
with open("ids.txt", encoding="utf-8") as f:
    print(f.read(), end="")
`,
        answer: src`
import json
import os

def save(path, state):
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(path + ".tmp", path)

def export_ids(events, out_path, ckpt_path):
    done = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            done = json.load(f)["lines"]
        with open(out_path, encoding="utf-8") as f:
            kept = f.readlines()[:done]
    else:
        kept = []
    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(kept)
    for position in range(done, len(events)):
        with open(out_path, "a", encoding="utf-8") as f:
            f.write(events[position]["id"] + "\n")
        save(ckpt_path, {"lines": position + 1})
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)

events = [{"id": "48000000581"}, {"id": "48000001631"}, {"id": "48000007504"}, {"id": "48000002275"}, {"id": "48000006895"}]
# What the crash left behind: three lines written, the checkpoint saved after two.
with open("ids.txt", "w", encoding="utf-8") as f:
    f.write("48000000581\n48000001631\n48000007504\n")
with open("ids.ckpt", "w", encoding="utf-8") as f:
    json.dump({"lines": 2}, f)
export_ids(events, "ids.txt", "ids.ckpt")
with open("ids.txt", encoding="utf-8") as f:
    print(f.read(), end="")
`,
        alternatives: [
          src`
import json
import os
from pathlib import Path

def export_ids(events, out_path, ckpt_path):
    out = Path(out_path)
    ckpt = Path(ckpt_path)
    start = json.loads(ckpt.read_text(encoding="utf-8"))["lines"] if ckpt.exists() else 0
    old = out.read_text(encoding="utf-8").splitlines() if out.exists() else []
    out.write_text("".join(line + "\n" for line in old[:start]), encoding="utf-8")
    for n in range(start, len(events)):
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"{events[n]['id']}\n")
        tmp = Path(ckpt_path + ".tmp")
        tmp.write_text(json.dumps({"lines": n + 1}), encoding="utf-8")
        os.replace(tmp, ckpt)
    if ckpt.exists():
        ckpt.unlink()
`,
        ],
        wrong: [
          {
            code: src`
import json
import os

def export_ids(events, out_path, ckpt_path):
    done = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            done = json.load(f)["lines"]
    for position in range(done, len(events)):
        with open(out_path, "a", encoding="utf-8") as f:
            f.write(events[position]["id"] + "\n")
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"lines": position + 1}, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
`,
            fails: ["returns", "stale-file"],
            why: "it appends after the extra line the crash left, so one ID appears twice (and a fresh run keeps an old file's lines)",
          },
          {
            code: src`
import json
import os

def export_ids(events, out_path, ckpt_path):
    with open(out_path, "w", encoding="utf-8") as f:
        for event in events:
            f.write(event["id"] + "\n")
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
`,
            fails: ["progress"],
            why: "it ignores the checkpoint and saves none, so a crash part way loses all progress",
          },
          {
            code: src`
import json
import os

def export_ids(events, out_path, ckpt_path):
    done = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            done = json.load(f)["lines"]
        with open(out_path, encoding="utf-8") as f:
            kept = f.readlines()[:done]
    else:
        kept = []
    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(kept)
    for position in range(done, len(events)):
        with open(out_path, "a", encoding="utf-8") as f:
            f.write(events[position]["id"] + "\n")
        with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
            json.dump({"lines": position + 1}, f)
        os.replace(ckpt_path + ".tmp", ckpt_path)
`,
            fails: ["cleared"],
            why: "the checkpoint is left behind, so the next export would start at the end and write nothing",
          },
        ],
        hints: [
          "Begin by working out where to continue: the checkpoint's `lines`, or 0 without one.",
          "Before writing anything new, make the file hold exactly the lines the checkpoint vouches for (none on a fresh start).",
          "Then write one line and save the checkpoint, line after line; remove the checkpoint at the end.",
        ],
        task: {
          checks: [
            expr("returns", "a restart after a crash leaves each ID exactly once", lines(
              "import json as _j",
              writeFile("e1.txt", "48000000581\n48000001631\n48000007504\n"),
              writeFile("e1.ckpt", '{"lines": 2}'),
              "_ev = [{'id': '48000000581'}, {'id': '48000001631'}, {'id': '48000007504'}, {'id': '48000002275'}, {'id': '48000006895'}]",
              "export_ids(_ev, 'e1.txt', 'e1.ckpt')",
              "result = open('e1.txt', encoding='utf-8').read().splitlines()",
            ), ["48000000581", "48000001631", "48000007504", "48000002275", "48000006895"], { show: "export_ids(events, 'ids.txt', 'ids.ckpt')" }),
            expr("stale-file", "a fresh run over an old output file", lines(
              writeFile("e2.txt", "old-1\nold-2\n"),
              "export_ids([{'id': 'n1'}, {'id': 'n2'}], 'e2.txt', 'e2.ckpt')",
              "result = open('e2.txt', encoding='utf-8').read().splitlines()",
            ), ["n1", "n2"], { hidden: true }),
            expr("progress", "a crash part way leaves a checkpoint matching the file", lines(
              "import json as _j",
              "try:",
              "    export_ids([{'id': 'a'}, {'id': 'b'}, {}, {'id': 'd'}], 'e3.txt', 'e3.ckpt')",
              "except KeyError:",
              "    pass",
              "result = (open('e3.txt', encoding='utf-8').read().splitlines(), _j.load(open('e3.ckpt', encoding='utf-8')))",
            ), py.tuple(pv(["a", "b"]), pv({ lines: 2 })), { hidden: true }),
            expr("cleared", "a finished export removes its checkpoint", lines(
              "import os as _os",
              writeFile("e4.ckpt", '{"lines": 1}'),
              writeFile("e4.txt", "x\n"),
              "export_ids([{'id': 'x'}, {'id': 'y'}], 'e4.txt', 'e4.ckpt')",
              "result = (open('e4.txt', encoding='utf-8').read().splitlines(), _os.path.exists('e4.ckpt'))",
            ), py.tuple(pv(["x", "y"]), py.bool(false)), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "The checkpoint says `{\"offset\": 3, \"total\": 9}`. What does the resumed run print?",
        program: src`
values = [4, 2, 3, 5, 1]
state = {"offset": 3, "total": 9}
total = state["total"]
for position in range(state["offset"], len(values)):
    total += values[position]
print(total, sum(values))
`,
        choices: ["15 15", "24 15", "6 15", "15 9"],
        answer: 0,
        why: "The checkpoint already holds 4 + 2 + 3 = 9 for the first three values; the run adds 5 and 1. The resumed total equals a clean run's sum.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the job never deletes its checkpoint. Yesterday's run finished all 3 files. Today's files have the same names. What does today's run process?",
        program: src`
checkpoint = {"done": ["00.jsonl", "01.jsonl", "02.jsonl"]}   # left over from yesterday

def run(files, checkpoint):
    processed = []
    for name in files:
        if name not in checkpoint["done"]:
            processed.append(name)
            checkpoint["done"].append(name)
    return processed

print(run(["00.jsonl", "01.jsonl", "02.jsonl"], checkpoint))
`,
        choices: ["[]", "['00.jsonl', '01.jsonl', '02.jsonl']", "['02.jsonl']", "['00.jsonl']"],
        answer: 0,
        why: "A checkpoint describes a run in progress. Left behind after success, it tells the next run that everything is already done, and nothing is processed.",
      },
      {
        id: "q3",
        prompt: "A job writes rows to a table and saves a checkpoint after each batch. Which design makes a replayed batch harmless after a crash?",
        choices: [
          "A primary key on the event ID with `ON CONFLICT DO NOTHING`",
          "Saving the checkpoint before writing each batch",
          "Catching every exception so the job never crashes",
          "Restarting from the first batch every time",
        ],
        answer: 0,
        why: "A crash between the write and the checkpoint means the batch will be written again. Idempotent writes turn that replay into a no-op.",
      },
    ],
    review: [
      "Recovery: continue from the checkpoint, deal with output written after it, delete the checkpoint when done.",
      "Output that outlives a crash is replayed on restart: make the write idempotent, or cut the output back to the checkpoint.",
      "Test it for real: crash a run, resume it, and compare with a clean run.",
      "Next module: pipelines read outside data, and outside data can attack. The Secure Python module makes Python code secure against it.",
    ],
  },
];
