/**
 * M46 practice: ten independent problems on reliable pipelines (D11 repository events, D13 flights).
 * Ingestion with line accounting, schema validation, idempotent loads, checkpoints and resumable runs. Every code
 * question is graded by calling the learner's functions on public and hidden inputs, crashing runs on purpose and
 * reading the files they leave. Version 2: replaces ten placeholder questions that printed fixed SKU strings.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, learnerTests } from "../checks";
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
/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: ReturnType<typeof learnerTests>, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `tests-${n}`) ? { ...c, hidden: true } : c));
const writeFile = (path: string, text: string) => `__import__("pathlib").Path(${JSON.stringify(path)}).write_text(${JSON.stringify(text)}, encoding="utf-8")`;

const repo = (repo_id: unknown, name: unknown, language: unknown, stars_before: unknown) => ({ repo_id, name, language, stars_before });

export const m46Questions: PyQuestion[] = [
  {
    id: "PY-Q46-02",
    version: 2,
    slug: "validate-a-repository-record",
    title: "Validate a repository record",
    format: "validation",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "comparison", "conditional-expr", "dict-get", "dict-literal", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "none-value", "print-call", "print-several", "print-text", "string-index", "string-method", "string-split", "top-level-indent", "type-call", "value-count"],
    prompt: "Repository records arrive from an export before they are joined with events. Check each one against its contract and report every problem, so a bad export is caught at the door.",
    spec: [
      ["Function", "`repo_problems(repo)`"],
      ["repo_id", "a whole number greater than 0 (`True`/`False` don't count) → otherwise `\"repo_id: expected a positive int\"`"],
      ["name", "text of the form `owner/name`: exactly one `/` with text on both sides → otherwise `\"name: expected owner/name\"`"],
      ["language", "text or `None` → otherwise `\"language: expected text or None\"`"],
      ["stars_before", "a whole number ≥ 0 (not a bool) → otherwise `\"stars_before: expected a count\"`"],
      ["Returns", "the problems in the order of the fields above; a missing field counts as `None`; `[]` for a good record"],
    ],
    hiddenKinds: ["a bool in a number field", "a name with two slashes", "a name with nothing before the slash", "a zero repo_id", "a record with every field missing", "a float star count"],
    hints: [
      "Treat each field separately and append a message when its rule fails; never return early.",
      "Read each field with `get`, so a missing field is `None`. Remember that `isinstance(True, int)` is True.",
      "For the name, splitting on `/` must give exactly two pieces, and neither piece may be empty.",
    ],
    explanation: "Each rule is checked independently and the messages are collected in field order, so one call reports everything that is wrong. The bool test comes before the int test because bool is a subclass of int. Splitting the name on `/` and requiring two non-empty parts rejects `a/b/c`, `/x` and `owner`. Typical wrong answers return after the first problem, accept `True` as a repo_id, or only check `\"/\" in name`.",
    code: {
      starter: src`
def repo_problems(repo):
    problems = []
    return problems

print(repo_problems({"repo_id": 600000997, "name": "quill-data/quickstore", "language": "Python", "stars_before": 37}))
print(repo_problems({"repo_id": "600002991", "name": "cloudstore", "language": None, "stars_before": -1}))
`,
      answer: src`
def is_count(value):
    return isinstance(value, int) and not isinstance(value, bool)

def repo_problems(repo):
    problems = []
    repo_id = repo.get("repo_id")
    if not is_count(repo_id) or repo_id <= 0:
        problems.append("repo_id: expected a positive int")
    name = repo.get("name")
    parts = name.split("/") if isinstance(name, str) else []
    if len(parts) != 2 or not parts[0] or not parts[1]:
        problems.append("name: expected owner/name")
    language = repo.get("language")
    if language is not None and not isinstance(language, str):
        problems.append("language: expected text or None")
    stars = repo.get("stars_before")
    if not is_count(stars) or stars < 0:
        problems.append("stars_before: expected a count")
    return problems

print(repo_problems({"repo_id": 600000997, "name": "quill-data/quickstore", "language": "Python", "stars_before": 37}))
print(repo_problems({"repo_id": "600002991", "name": "cloudstore", "language": None, "stars_before": -1}))
`,
      alternatives: [
        src`
def repo_problems(repo):
    out = []
    rid = repo.get("repo_id")
    if type(rid) is not int or rid < 1:
        out.append("repo_id: expected a positive int")
    name = repo.get("name")
    if not (type(name) is str and name.count("/") == 1 and not name.startswith("/") and not name.endswith("/")):
        out.append("name: expected owner/name")
    if repo.get("language") is not None and type(repo.get("language")) is not str:
        out.append("language: expected text or None")
    stars = repo.get("stars_before")
    if type(stars) is not int or stars < 0:
        out.append("stars_before: expected a count")
    return out
`,
      ],
      wrong: [
        {
          code: src`
def repo_problems(repo):
    problems = []
    if not isinstance(repo.get("repo_id"), int) or repo.get("repo_id") <= 0:
        problems.append("repo_id: expected a positive int")
    name = repo.get("name")
    if not isinstance(name, str) or "/" not in name:
        problems.append("name: expected owner/name")
    language = repo.get("language")
    if language is not None and not isinstance(language, str):
        problems.append("language: expected text or None")
    stars = repo.get("stars_before")
    if not isinstance(stars, int) or stars < 0:
        problems.append("stars_before: expected a count")
    return problems
`,
          fails: ["returns"],
          why: "`True` passes as an int and any name containing a slash is accepted",
        },
        {
          code: src`
def repo_problems(repo):
    rid = repo.get("repo_id")
    if type(rid) is not int or rid <= 0:
        return ["repo_id: expected a positive int"]
    name = repo.get("name")
    if type(name) is not str or len(name.split("/")) != 2 or "" in name.split("/"):
        return ["name: expected owner/name"]
    if repo.get("language") is not None and type(repo.get("language")) is not str:
        return ["language: expected text or None"]
    stars = repo.get("stars_before")
    if type(stars) is not int or stars < 0:
        return ["stars_before: expected a count"]
    return []
`,
          fails: ["returns"],
          why: "it returns at the first problem, so a record with several problems reports only one",
        },
      ],
      task: {
        checks: [
          fn("returns", "repo_problems", [
            example([repo(600000997, "quill-data/quickstore", "Python", 37)], []),
            example([repo("600002991", "cloudstore", null, -1)], ["repo_id: expected a positive int", "name: expected owner/name", "stars_before: expected a count"]),
            example([repo(600001994, "nimbus-io/stream-router", 3, 46)], ["language: expected text or None"]),
            hiddenCase("a bool in a number field", [repo(true, "a/b", "Go", false)], ["repo_id: expected a positive int", "stars_before: expected a count"]),
            hiddenCase("a name with two slashes", [repo(5, "a/b/c", null, 0)], ["name: expected owner/name"]),
            hiddenCase("a name with nothing before the slash", [repo(5, "/tool", null, 0)], ["name: expected owner/name"]),
            hiddenCase("a zero repo_id", [repo(0, "x/y", "Rust", 12)], ["repo_id: expected a positive int"]),
            hiddenCase("a record with every field missing", [{}], ["repo_id: expected a positive int", "name: expected owner/name", "stars_before: expected a count"]),
            hiddenCase("a float star count", [repo(7, "o/n", "Python", py.float(3))], ["stars_before: expected a count"]),
          ], { label: "repo_problems() reports every broken rule, in field order" }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-03",
    version: 2,
    slug: "fix-the-reject-report",
    title: "Fix the reject report",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-loads", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "reassignment", "string-method", "top-level-indent", "truthiness", "try-except", "tuple-unpack"],
    prompt: "The ingest step reports which lines of an event file were rejected. Support has two complaints: every reported line number is one lower than the line they find in their editor, and the blank line at the end of every file is reported as broken. Fix `read_events` so the report is right; the events it returns are already correct.",
    spec: [
      ["Function", "`read_events(lines)`"],
      ["Returns", "`(events, rejected)`: JSON objects in order, and the line numbers (counting from 1) of non-blank lines that aren't JSON objects"],
      ["Blank", "a line that is empty or only spaces is neither an event nor rejected"],
    ],
    hiddenKinds: ["a file with blank lines in the middle", "a line of spaces", "every line broken", "an empty file"],
    hints: [
      "There are two separate bugs; the symptoms tell you which line of code each one lives on.",
      "Line numbers come from `enumerate`. What number does it start counting at by default?",
      "A blank line has to be recognised before it is parsed, and then skipped without being reported.",
    ],
    explanation: "`enumerate` counts from 0 unless told `start=1`, which made every number one too low. A blank line is not valid JSON, so the parser rejected it; testing `line.strip()` first and skipping blank lines fixes the second complaint without hiding real problems. Moving the blank test after the parse, or using `if not line` (which misses a line of spaces), are the usual half-fixes.",
    code: {
      starter: src`
import json

def read_events(lines):
    events = []
    rejected = []
    for number, line in enumerate(lines):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rejected.append(number)
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            rejected.append(number)
    return events, rejected

hour = ['{"id": "48000000581", "type": "PushEvent"}', '{"id": "4800', '{"id": "48000007504", "type": "WatchEvent"}', '']
print(read_events(hour))
`,
      answer: src`
import json

def read_events(lines):
    events = []
    rejected = []
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rejected.append(number)
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            rejected.append(number)
    return events, rejected

hour = ['{"id": "48000000581", "type": "PushEvent"}', '{"id": "4800', '{"id": "48000007504", "type": "WatchEvent"}', '']
print(read_events(hour))
`,
      alternatives: [
        src`
import json

def read_events(lines):
    events, rejected = [], []
    number = 0
    for line in lines:
        number += 1
        if line.strip() == "":
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            record = None
        if isinstance(record, dict):
            events.append(record)
        else:
            rejected.append(number)
    return events, rejected
`,
      ],
      wrong: [
        {
          code: src`
import json

def read_events(lines):
    events = []
    rejected = []
    for number, line in enumerate(lines, start=1):
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rejected.append(number)
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            rejected.append(number)
    return events, rejected
`,
          fails: ["returns"],
          why: "the numbers are fixed but blank lines are still rejected",
        },
        {
          code: src`
import json

def read_events(lines):
    events = []
    rejected = []
    for number, line in enumerate(lines, start=1):
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rejected.append(number)
            continue
        if isinstance(record, dict):
            events.append(record)
        else:
            rejected.append(number)
    return events, rejected
`,
          fails: ["returns"],
          why: "`if not line` skips an empty line but still rejects a line of spaces",
        },
      ],
      task: {
        checks: [
          fn("returns", "read_events", [
            example([['{"id": "48000000581", "type": "PushEvent"}', '{"id": "4800', '{"id": "48000007504", "type": "WatchEvent"}', ""]], py.tuple(pv([{ id: "48000000581", type: "PushEvent" }, { id: "48000007504", type: "WatchEvent" }]), pv([2]))),
            example([['{"id": "1"}', "[1, 2]"]], py.tuple(pv([{ id: "1" }]), pv([2]))),
            example([["bad", '{"id": "2"}']], py.tuple(pv([{ id: "2" }]), pv([1]))),
            hiddenCase("a file with blank lines in the middle", [['{"id": "a"}', "", "", "oops", '{"id": "b"}']], py.tuple(pv([{ id: "a" }, { id: "b" }]), pv([4]))),
            hiddenCase("a line of spaces", [["   ", '{"id": "c"}']], py.tuple(pv([{ id: "c" }]), pv([]))),
            hiddenCase("every line broken", [["{", "}", "nope"]], py.tuple(pv([]), pv([1, 2, 3]))),
            hiddenCase("an empty file", [[]], py.tuple(pv([]), pv([]))),
          ], { label: "read_events() numbers lines from 1 and ignores blank lines" }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-06",
    version: 2,
    slug: "parse-arrival-delays",
    title: "Parse arrival delays without losing a row",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "range-call", "string-check", "string-index", "string-method", "string-split", "top-level-indent", "try-except", "tuple-unpack"],
    prompt: "An airline sends its daily delays as text lines: a header, then `flight_id,arrival_delay` per flight. Cancelled flights have an empty delay. Load every good row and report the line numbers of the rows you couldn't read, instead of crashing or skipping them silently.",
    spec: [
      ["Function", "`parse_delays(lines)`"],
      ["lines", "line 1 is the header `flight_id,arrival_delay`; the rest are data rows"],
      ["Good row", "exactly two fields; the flight ID is a whole number; the delay is a whole number (it may be negative) or empty, which becomes `None`"],
      ["Returns", "`(delays, rejected)`: a dictionary from flight ID (int) to delay, and the line numbers (counting the header as line 1) of rows that aren't good"],
      ["Rules", "blank lines are skipped without a report; spaces around a field are ignored"],
    ],
    hiddenKinds: ["a row with three fields", "a delay that isn't a number", "a negative delay", "only the header", "a blank line and padded fields", "a flight ID with letters"],
    hints: [
      "Skip the header by starting from the second line, but keep counting line numbers from 1 for the whole file.",
      "Split each row on commas, check the number of fields, then convert inside `try`/`except ValueError`.",
      "An empty delay is allowed and becomes `None`; only text that isn't a number is a reject.",
    ],
    explanation: "The reference walks the lines with `enumerate(lines, start=1)`, skips line 1 and blank lines, and treats each row on its own: the field count first, then conversions inside `try`. An empty delay maps to `None` because a cancelled flight has no arrival. Wrong answers usually number data rows from 1 (forgetting the header), reject cancelled flights, or crash on `int(\"\")`.",
    code: {
      starter: src`
def parse_delays(lines):
    return {}, []

export = ["flight_id,arrival_delay", "12207,-4", "12208,12", "12209,", "12210,n/a", "12211,-3,x"]
print(parse_delays(export))
`,
      answer: src`
def parse_delays(lines):
    delays = {}
    rejected = []
    for number, line in enumerate(lines, start=1):
        if number == 1 or not line.strip():
            continue
        fields = [field.strip() for field in line.split(",")]
        if len(fields) != 2:
            rejected.append(number)
            continue
        try:
            flight_id = int(fields[0])
            delay = int(fields[1]) if fields[1] else None
        except ValueError:
            rejected.append(number)
            continue
        delays[flight_id] = delay
    return delays, rejected

export = ["flight_id,arrival_delay", "12207,-4", "12208,12", "12209,", "12210,n/a", "12211,-3,x"]
print(parse_delays(export))
`,
      alternatives: [
        src`
def read_row(line):
    parts = line.split(",")
    if len(parts) != 2:
        return None
    flight, delay = parts[0].strip(), parts[1].strip()
    if not flight.lstrip("-").isdigit():
        return None
    if delay == "":
        return int(flight), None
    if not delay.lstrip("-").isdigit():
        return None
    return int(flight), int(delay)

def parse_delays(lines):
    delays, rejected = {}, []
    for number in range(2, len(lines) + 1):
        line = lines[number - 1]
        if line.strip() == "":
            continue
        row = read_row(line)
        if row is None:
            rejected.append(number)
        else:
            delays[row[0]] = row[1]
    return delays, rejected
`,
      ],
      wrong: [
        {
          code: src`
def parse_delays(lines):
    delays = {}
    rejected = []
    for number, line in enumerate(lines[1:], start=1):
        if not line.strip():
            continue
        fields = [field.strip() for field in line.split(",")]
        if len(fields) != 2:
            rejected.append(number)
            continue
        try:
            delays[int(fields[0])] = int(fields[1]) if fields[1] else None
        except ValueError:
            rejected.append(number)
    return delays, rejected
`,
          fails: ["returns"],
          why: "numbering the data rows from 1 forgets the header, so every reported line is one too low",
        },
        {
          code: src`
def parse_delays(lines):
    delays = {}
    rejected = []
    for number, line in enumerate(lines, start=1):
        if number == 1 or not line.strip():
            continue
        fields = [field.strip() for field in line.split(",")]
        if len(fields) != 2:
            rejected.append(number)
            continue
        try:
            delays[int(fields[0])] = int(fields[1])
        except ValueError:
            rejected.append(number)
    return delays, rejected
`,
          fails: ["returns"],
          why: "a cancelled flight's empty delay is rejected instead of loaded as `None`",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_delays", [
            example([["flight_id,arrival_delay", "12207,-4", "12208,12", "12209,", "12210,n/a", "12211,-3,x"]], py.tuple(pv(py.dict([[py.int(12207), py.int(-4)], [py.int(12208), py.int(12)], [py.int(12209), py.none]])), pv([5, 6]))),
            example([["flight_id,arrival_delay", "1,0"]], py.tuple(py.dict([[py.int(1), py.int(0)]]), pv([]))),
            example([["flight_id,arrival_delay", "x,5", "2,7"]], py.tuple(py.dict([[py.int(2), py.int(7)]]), pv([2]))),
            hiddenCase("a row with three fields", [["flight_id,arrival_delay", "3,1,1"]], py.tuple(py.dict([]), pv([2]))),
            hiddenCase("a delay that isn't a number", [["flight_id,arrival_delay", "4,late", "5,9"]], py.tuple(py.dict([[py.int(5), py.int(9)]]), pv([2]))),
            hiddenCase("a negative delay", [["flight_id,arrival_delay", "6,-25"]], py.tuple(py.dict([[py.int(6), py.int(-25)]]), pv([]))),
            hiddenCase("only the header", [["flight_id,arrival_delay"]], py.tuple(py.dict([]), pv([]))),
            hiddenCase("a blank line and padded fields", [["flight_id,arrival_delay", "", " 8 , 3 ", "9,  "]], py.tuple(py.dict([[py.int(8), py.int(3)], [py.int(9), py.none]]), pv([]))),
            hiddenCase("a flight ID with letters", [["flight_id,arrival_delay", "UA2017,5"]], py.tuple(py.dict([]), pv([2]))),
          ], { label: "parse_delays() loads good rows and reports the rest by line number" }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-10",
    version: 2,
    slug: "files-left-to-process",
    title: "Which hourly files are left?",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "comp-if", "comparison", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-index", "list-literal", "list-sort", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "set-comp", "set-literal", "string-index", "string-method", "top-level-indent"],
    prompt: "A backfill saves the name of the last hourly file it finished. Hour files are named `YYYY-MM-DD-HH.jsonl`, so name order is time order. Given the folder listing (in whatever order the system returns it) and the checkpoint, work out which files the restart still has to process.",
    spec: [
      ["Function", "`files_left(names, checkpoint)`"],
      ["names", "file names in any order; may include other files (`README.md`, `x.jsonl.counts.json`) and repeats"],
      ["checkpoint", "`{\"last_done\": name}`, or `{\"last_done\": None}` before anything is finished"],
      ["Returns", "the `.jsonl` names that sort after `last_done` (all of them when it is `None`), sorted, each once"],
      ["Rule", "`last_done` might not be in the listing any more (the file was archived); compare by name anyway"],
    ],
    hiddenKinds: ["nothing finished yet", "the last file already finished", "repeated names in the listing", "a checkpoint naming an archived file", "only non-event files", "an hour from the next day"],
    hints: [
      "Keep only names ending in `.jsonl`; a summary like `x.jsonl.counts.json` doesn't count.",
      "Names compare as text, and for this format text order is time order, so `name > last_done` is the test.",
      "A set removes repeats; sort at the end.",
    ],
    explanation: "Because the names are zero-padded dates and hours, comparing the strings compares the times, which also works when the checkpoint's file has since been archived. Filtering on `.endswith(\".jsonl\")` excludes summaries and notes, a set removes repeats, and sorting gives the processing order. Wrong answers find the checkpoint's index in the listing (which fails when it is missing or the listing is unsorted) or use `>=` and redo the last finished file.",
    code: {
      starter: src`
def files_left(names, checkpoint):
    return []

listing = ["2025-03-03-02.jsonl", "README.md", "2025-03-03-00.jsonl", "2025-03-03-03.jsonl", "2025-03-03-01.jsonl"]
print(files_left(listing, {"last_done": "2025-03-03-01.jsonl"}))
`,
      answer: src`
def files_left(names, checkpoint):
    last = checkpoint["last_done"]
    left = set()
    for name in names:
        if not name.endswith(".jsonl"):
            continue
        if last is None or name > last:
            left.add(name)
    return sorted(left)

listing = ["2025-03-03-02.jsonl", "README.md", "2025-03-03-00.jsonl", "2025-03-03-03.jsonl", "2025-03-03-01.jsonl"]
print(files_left(listing, {"last_done": "2025-03-03-01.jsonl"}))
`,
      alternatives: [
        src`
def files_left(names, checkpoint):
    last = checkpoint.get("last_done") or ""
    return sorted({n for n in names if n.endswith(".jsonl") and n > last})
`,
      ],
      wrong: [
        {
          code: src`
def files_left(names, checkpoint):
    events = sorted(n for n in names if n.endswith(".jsonl"))
    last = checkpoint["last_done"]
    if last is None:
        return events
    return events[events.index(last) + 1:]
`,
          fails: ["returns"],
          why: "it looks the checkpoint up in the listing, which crashes when that file was archived and keeps repeats",
        },
        {
          code: src`
def files_left(names, checkpoint):
    last = checkpoint["last_done"]
    return sorted({n for n in names if n.endswith(".jsonl") and (last is None or n >= last)})
`,
          fails: ["returns"],
          why: "`>=` processes the last finished file a second time",
        },
      ],
      task: {
        checks: [
          fn("returns", "files_left", [
            example([["2025-03-03-02.jsonl", "README.md", "2025-03-03-00.jsonl", "2025-03-03-03.jsonl", "2025-03-03-01.jsonl"], { last_done: "2025-03-03-01.jsonl" }], ["2025-03-03-02.jsonl", "2025-03-03-03.jsonl"]),
            example([["2025-03-03-05.jsonl", "2025-03-03-04.jsonl"], { last_done: "2025-03-03-04.jsonl" }], ["2025-03-03-05.jsonl"]),
            example([["2025-03-03-00.jsonl", "2025-03-03-00.jsonl.counts.json"], { last_done: null }], ["2025-03-03-00.jsonl"]),
            hiddenCase("nothing finished yet", [["2025-03-04-01.jsonl", "2025-03-04-00.jsonl"], { last_done: null }], ["2025-03-04-00.jsonl", "2025-03-04-01.jsonl"]),
            hiddenCase("the last file already finished", [["2025-03-03-22.jsonl", "2025-03-03-23.jsonl"], { last_done: "2025-03-03-23.jsonl" }], []),
            hiddenCase("repeated names in the listing", [["2025-03-03-09.jsonl", "2025-03-03-09.jsonl", "2025-03-03-08.jsonl"], { last_done: "2025-03-03-07.jsonl" }], ["2025-03-03-08.jsonl", "2025-03-03-09.jsonl"]),
            hiddenCase("a checkpoint naming an archived file", [["2025-03-03-12.jsonl", "2025-03-03-14.jsonl"], { last_done: "2025-03-03-13.jsonl" }], ["2025-03-03-14.jsonl"]),
            hiddenCase("only non-event files", [["notes.txt", "a.jsonl.counts.json"], { last_done: null }], []),
            hiddenCase("an hour from the next day", [["2025-03-04-00.jsonl", "2025-03-03-23.jsonl"], { last_done: "2025-03-03-23.jsonl" }], ["2025-03-04-00.jsonl"]),
          ], { label: "files_left() lists the unfinished hour files in order" }),
          fn("keeps-input", "files_left", [keepsInput([["2025-03-03-02.jsonl", "2025-03-03-01.jsonl"], { last_done: null }], { label: "a listing that must stay in its own order" })], { label: "files_left() doesn't reorder the listing it is given" }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-12",
    version: 2,
    slug: "replace-or-ignore",
    title: "Replace or ignore?",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "for-loop", "import-module", "list-index", "list-literal", "membership", "nested-loop", "print-call", "print-several", "sqlite-call", "string-index", "top-level-indent"],
    prompt: "Two tables receive the same batch twice; the second delivery carries a corrected star count for one repository. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Both tables have a primary key, so neither can hold the same repo twice.",
      "`DO NOTHING` keeps the row already stored; `DO UPDATE` writes the new values over it.",
      "The plain counter outside the database counts every attempt, not every row.",
    ],
    explanation: "Each table ends with two rows because the primary key stops duplicates. `ON CONFLICT DO NOTHING` keeps the first value it saw (37), while `DO UPDATE SET stars = excluded.stars` takes the corrected 38. The Python counter `attempts` is not idempotent: it counts all four inserts.",
    predict: {
      program: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE keep_first (repo TEXT PRIMARY KEY, stars INTEGER)")
conn.execute("CREATE TABLE keep_last (repo TEXT PRIMARY KEY, stars INTEGER)")
deliveries = [
    [("quill-data/quickstore", 37), ("nimbus-io/cloudplot", 1264)],
    [("quill-data/quickstore", 38), ("nimbus-io/cloudplot", 1264)],
]
attempts = 0
for batch in deliveries:
    for repo, stars in batch:
        conn.execute("INSERT INTO keep_first VALUES (?, ?) ON CONFLICT(repo) DO NOTHING", (repo, stars))
        conn.execute("INSERT INTO keep_last VALUES (?, ?) ON CONFLICT(repo) DO UPDATE SET stars = excluded.stars", (repo, stars))
        attempts += 1
first = conn.execute("SELECT stars FROM keep_first WHERE repo = 'quill-data/quickstore'").fetchone()[0]
last = conn.execute("SELECT stars FROM keep_last WHERE repo = 'quill-data/quickstore'").fetchone()[0]
rows = conn.execute("SELECT COUNT(*) FROM keep_last").fetchone()[0]
print(first, last, rows, attempts)
`,
      output: "37 38 2 4\n",
      wrongPredictions: ["38 38 2 4", "37 37 2 4", "37 38 4 4", "37 38 2 2"],
    },
  },
  {
    id: "PY-Q46-13",
    version: 2,
    slug: "retried-batch-doubles-totals",
    title: "A retried batch doubles the totals",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "`apply_batch` adds a batch of push events to the running commit totals per repository and remembers the batch ID in `applied`, so the scheduler can safely retry. Yet after a retry the dashboard shows double the commits. Find the bug and fix it, so applying a batch that was already applied changes nothing and returns `False`, and applying a new batch updates the totals and returns `True`.",
    spec: [
      ["Function", "`apply_batch(totals, applied, batch_id, events)`; updates `totals` (repo → commits) and the list `applied` in place"],
      ["Returns", "`True` when the batch was applied by this call, `False` when it had been applied before"],
      ["Rule", "the ID of an applied batch appears in `applied` exactly once"],
    ],
    hiddenKinds: ["the same batch three times", "two different batches", "a batch applied in an earlier run", "an empty batch"],
    hints: [
      "Run the starter's demo and look at `applied` after each call: is the batch ID really there when the retry arrives?",
      "The check and the record have to be about the same thing, and the check has to happen before any total changes.",
      "Record the batch ID when the batch is applied, and look for it before adding anything.",
    ],
    explanation: "The starter compared the batch ID with `applied` but stored the event IDs there instead, so the retry never matched and was added again. The fix tests `batch_id in applied` first, returns `False` when found, and otherwise adds the commits and appends `batch_id`. A tempting half-fix adds the commits before checking, which still doubles the totals.",
    code: {
      starter: src`
def apply_batch(totals, applied, batch_id, events):
    if batch_id in applied:
        return False
    for event in events:
        totals[event["repo"]] = totals.get(event["repo"], 0) + event["commits"]
        applied.append(event["id"])
    return True

totals = {}
applied = []
batch = [{"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2}, {"id": "48000003143", "repo": "nimbus-io/graphqueue", "commits": 3}]
print(apply_batch(totals, applied, "2025-03-03T00", batch))
print(apply_batch(totals, applied, "2025-03-03T00", batch))
print(totals, applied)
`,
      answer: src`
def apply_batch(totals, applied, batch_id, events):
    if batch_id in applied:
        return False
    for event in events:
        totals[event["repo"]] = totals.get(event["repo"], 0) + event["commits"]
    applied.append(batch_id)
    return True

totals = {}
applied = []
batch = [{"id": "48000000581", "repo": "tidewater/smartqueue", "commits": 2}, {"id": "48000003143", "repo": "nimbus-io/graphqueue", "commits": 3}]
print(apply_batch(totals, applied, "2025-03-03T00", batch))
print(apply_batch(totals, applied, "2025-03-03T00", batch))
print(totals, applied)
`,
      alternatives: [
        src`
def apply_batch(totals, applied, batch_id, events):
    if batch_id not in applied:
        for event in events:
            repo = event["repo"]
            if repo not in totals:
                totals[repo] = 0
            totals[repo] += event["commits"]
        applied.append(batch_id)
        return True
    return False
`,
      ],
      wrong: [
        {
          code: src`
def apply_batch(totals, applied, batch_id, events):
    for event in events:
        totals[event["repo"]] = totals.get(event["repo"], 0) + event["commits"]
    if batch_id in applied:
        return False
    applied.append(batch_id)
    return True
`,
          fails: ["retry", "earlier-run", "three-times"],
          why: "the totals are updated before the check, so a retry still adds its commits",
        },
        {
          code: src`
def apply_batch(totals, applied, batch_id, events):
    if batch_id in applied:
        return False
    for event in events:
        totals[event["repo"]] = totals.get(event["repo"], 0) + event["commits"]
        applied.append(batch_id)
    return True
`,
          fails: ["recorded-once", "empty"],
          why: "the batch ID is appended once per event, so `applied` grows with every event of the batch",
        },
      ],
      task: {
        checks: [
          expr("retry", "a retried batch changes nothing", lines(
            "_t, _a = {}, []",
            "_b = [{'id': '48000000581', 'repo': 'tidewater/smartqueue', 'commits': 2}, {'id': '48000003143', 'repo': 'nimbus-io/graphqueue', 'commits': 3}]",
            "_r1 = apply_batch(_t, _a, '2025-03-03T00', _b)",
            "_r2 = apply_batch(_t, _a, '2025-03-03T00', _b)",
            "result = (_r1, _r2, _t)",
          ), py.tuple(py.bool(true), py.bool(false), pv({ "tidewater/smartqueue": 2, "nimbus-io/graphqueue": 3 })), { show: "apply_batch(totals, applied, '2025-03-03T00', batch) twice" }),
          expr("recorded-once", "the batch ID is recorded once", "_a = []\napply_batch({}, _a, 'B1', [{'id': 'x', 'repo': 'r', 'commits': 1}, {'id': 'y', 'repo': 'r', 'commits': 1}])\nresult = _a", ["B1"], { show: "applied after one batch of two events" }),
          expr("three-times", "the same batch three times", "_t, _a = {}, []\n_b = [{'id': 'e', 'repo': 'o/r', 'commits': 4}]\nfor _i in range(3):\n    apply_batch(_t, _a, 'B7', _b)\nresult = (_t, _a)", py.tuple(pv({ "o/r": 4 }), pv(["B7"])), { hidden: true }),
          expr("two-batches", "two different batches", "_t, _a = {}, []\napply_batch(_t, _a, 'H1', [{'id': 'a', 'repo': 'o/r', 'commits': 1}])\napply_batch(_t, _a, 'H2', [{'id': 'b', 'repo': 'o/r', 'commits': 2}])\nresult = (_t, _a)", py.tuple(pv({ "o/r": 3 }), pv(["H1", "H2"])), { hidden: true }),
          expr("earlier-run", "a batch applied in an earlier run", "_t, _a = {'o/r': 9}, ['H0']\nresult = (apply_batch(_t, _a, 'H0', [{'id': 'z', 'repo': 'o/r', 'commits': 9}]), _t)", py.tuple(py.bool(false), pv({ "o/r": 9 })), { hidden: true }),
          expr("empty", "an empty batch", "_t, _a = {}, []\nresult = (apply_batch(_t, _a, 'E', []), _t, _a)", py.tuple(py.bool(true), pv({}), pv(["E"])), { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-16",
    version: 2,
    slug: "flatten-archive-events",
    title: "Flatten archive events into rows",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 20,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "none-value", "print-call", "reassignment", "string-format", "string-index", "top-level-indent", "truthiness", "tuple-unpack", "unquoted-name"],
    prompt: "Archive events are nested: the account is under `actor.login`, the repository under `repo.name`, and a push's commit count under `payload.size`. Turn a list of raw events into flat rows a table can hold, and report the events that can't be flattened instead of guessing.",
    spec: [
      ["Function", "`flatten(raw_events)`"],
      ["Row", "`{\"id\", \"type\", \"actor\", \"repo\", \"created_at\", \"commits\"}`; `commits` is `payload[\"size\"]` for a `PushEvent` and `None` for every other type"],
      ["Problem", "an event with no `actor.login` or no `repo.name` (missing, `None` or empty) is not turned into a row; report `\"<id>: missing actor\"` or `\"<id>: missing repo\"` (actor is checked first; one problem per event)"],
      ["Returns", "`(rows, problems)` in input order; the input events are not changed"],
    ],
    hiddenKinds: ["a push with no payload size", "an event with an empty login", "an event missing its repo", "an event with no actor at all", "no events"],
    hints: [
      "Read nested values one level at a time with `get`, using `{}` as the default for a missing inner dictionary.",
      "Decide whether the event is usable before building its row; a problem means no row.",
      "Only a PushEvent has commits; build a new dictionary for each row instead of editing the event.",
    ],
    explanation: "`event.get(\"actor\") or {}` copes with a missing or `None` actor, and a second `get` reads the login; an empty login fails the truthiness test too. Problems are reported once per event with actor first, matching the contract. Each row is a new dictionary, so the raw events stay intact for the quarantine. Wrong answers index `event[\"actor\"][\"login\"]` directly (crashing on the first damaged event) or give every event the payload size.",
    code: {
      starter: src`
def flatten(raw_events):
    return [], []

raw = [
    {"id": "48000000581", "type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"size": 2}, "created_at": "2025-03-03T00:02:37Z"},
    {"id": "48000007504", "type": "WatchEvent", "actor": {"login": "stack_yak150"}, "repo": {"name": "lumen-labs/pyauth"}, "payload": {"action": "started"}, "created_at": "2025-03-03T00:09:20Z"},
    {"id": "48000002968", "type": "ForkEvent", "actor": None, "repo": {"name": "lumen-labs/tinykit"}, "payload": {}, "created_at": "2025-03-03T00:19:28Z"},
]
rows, problems = flatten(raw)
for row in rows:
    print(row)
print(problems)
`,
      answer: src`
def flatten(raw_events):
    rows = []
    problems = []
    for event in raw_events:
        login = (event.get("actor") or {}).get("login")
        repo = (event.get("repo") or {}).get("name")
        if not login:
            problems.append(f"{event['id']}: missing actor")
            continue
        if not repo:
            problems.append(f"{event['id']}: missing repo")
            continue
        commits = None
        if event["type"] == "PushEvent":
            commits = (event.get("payload") or {}).get("size")
        rows.append({
            "id": event["id"],
            "type": event["type"],
            "actor": login,
            "repo": repo,
            "created_at": event["created_at"],
            "commits": commits,
        })
    return rows, problems

raw = [
    {"id": "48000000581", "type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"size": 2}, "created_at": "2025-03-03T00:02:37Z"},
    {"id": "48000007504", "type": "WatchEvent", "actor": {"login": "stack_yak150"}, "repo": {"name": "lumen-labs/pyauth"}, "payload": {"action": "started"}, "created_at": "2025-03-03T00:09:20Z"},
    {"id": "48000002968", "type": "ForkEvent", "actor": None, "repo": {"name": "lumen-labs/tinykit"}, "payload": {}, "created_at": "2025-03-03T00:19:28Z"},
]
rows, problems = flatten(raw)
for row in rows:
    print(row)
print(problems)
`,
      alternatives: [
        src`
def nested(event, outer, inner):
    part = event.get(outer)
    if not isinstance(part, dict):
        return None
    return part.get(inner)

def flatten(raw_events):
    rows, problems = [], []
    for e in raw_events:
        actor, repo = nested(e, "actor", "login"), nested(e, "repo", "name")
        problem = "missing actor" if not actor else "missing repo" if not repo else None
        if problem:
            problems.append(e["id"] + ": " + problem)
            continue
        size = nested(e, "payload", "size") if e["type"] == "PushEvent" else None
        rows.append({"id": e["id"], "type": e["type"], "actor": actor, "repo": repo, "created_at": e["created_at"], "commits": size})
    return rows, problems
`,
      ],
      wrong: [
        {
          code: src`
def flatten(raw_events):
    rows = []
    problems = []
    for event in raw_events:
        try:
            login = event["actor"]["login"]
            repo = event["repo"]["name"]
        except (KeyError, TypeError):
            problems.append(f"{event['id']}: missing actor")
            continue
        rows.append({"id": event["id"], "type": event["type"], "actor": login, "repo": repo, "created_at": event["created_at"], "commits": event.get("payload", {}).get("size")})
    return rows, problems
`,
          fails: ["returns"],
          why: "every problem is reported as a missing actor, an empty login is accepted, and non-push events get a commit count",
        },
        {
          code: src`
def flatten(raw_events):
    rows = []
    problems = []
    for event in raw_events:
        login = (event.get("actor") or {}).get("login")
        repo = (event.get("repo") or {}).get("name")
        if not login or not repo:
            problems.append(f"{event['id']}: missing {'actor' if not login else 'repo'}")
            continue
        event["actor"] = login
        event["repo"] = repo
        event["commits"] = (event.get("payload") or {}).get("size") if event["type"] == "PushEvent" else None
        del event["payload"]
        rows.append(event)
    return rows, problems
`,
          fails: ["keeps-input"],
          why: "it rewrites the raw events in place, destroying the originals",
        },
      ],
      task: {
        checks: [
          fn("returns", "flatten", [
            example([[
              { id: "48000000581", type: "PushEvent", actor: { login: "ml-koi418" }, repo: { name: "tidewater/smartqueue" }, payload: { size: 2 }, created_at: "2025-03-03T00:02:37Z" },
              { id: "48000007504", type: "WatchEvent", actor: { login: "stack_yak150" }, repo: { name: "lumen-labs/pyauth" }, payload: { action: "started" }, created_at: "2025-03-03T00:09:20Z" },
              { id: "48000002968", type: "ForkEvent", actor: null, repo: { name: "lumen-labs/tinykit" }, payload: {}, created_at: "2025-03-03T00:19:28Z" },
            ]], py.tuple(pv([
              { id: "48000000581", type: "PushEvent", actor: "ml-koi418", repo: "tidewater/smartqueue", created_at: "2025-03-03T00:02:37Z", commits: 2 },
              { id: "48000007504", type: "WatchEvent", actor: "stack_yak150", repo: "lumen-labs/pyauth", created_at: "2025-03-03T00:09:20Z", commits: null },
            ]), pv(["48000002968: missing actor"]))),
            example([[{ id: "e1", type: "IssuesEvent", actor: { login: "dev_bee483" }, repo: {}, payload: {}, created_at: "t" }]], py.tuple(pv([]), pv(["e1: missing repo"]))),
            example([[{ id: "e2", type: "PushEvent", actor: { login: "a" }, repo: { name: "o/r" }, payload: { size: 3 }, created_at: "t2" }]], py.tuple(pv([{ id: "e2", type: "PushEvent", actor: "a", repo: "o/r", created_at: "t2", commits: 3 }]), pv([]))),
            hiddenCase("a push with no payload size", [[{ id: "p", type: "PushEvent", actor: { login: "a" }, repo: { name: "o/r" }, payload: {}, created_at: "t" }]], py.tuple(pv([{ id: "p", type: "PushEvent", actor: "a", repo: "o/r", created_at: "t", commits: null }]), pv([]))),
            hiddenCase("an event with an empty login", [[{ id: "q", type: "WatchEvent", actor: { login: "" }, repo: { name: "o/r" }, payload: {}, created_at: "t" }]], py.tuple(pv([]), pv(["q: missing actor"]))),
            hiddenCase("an event missing its repo", [[{ id: "r", type: "ForkEvent", actor: { login: "b" }, payload: {}, created_at: "t" }]], py.tuple(pv([]), pv(["r: missing repo"]))),
            hiddenCase("an event with no actor at all", [[{ id: "s", type: "ForkEvent", repo: null, payload: {}, created_at: "t" }]], py.tuple(pv([]), pv(["s: missing actor"]))),
            hiddenCase("no events", [[]], py.tuple(pv([]), pv([]))),
          ], { label: "flatten() builds flat rows and reports unusable events" }),
          fn("keeps-input", "flatten", [keepsInput([[{ id: "k", type: "PushEvent", actor: { login: "a" }, repo: { name: "o/r" }, payload: { size: 1 }, created_at: "t" }]], { label: "a push event that must stay nested" })], { label: "flatten() leaves the raw events unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-19",
    version: 2,
    slug: "test-the-checkpoint-loader",
    title: "Test the checkpoint loader",
    format: "testing",
    difficulty: "hard",
    minutes: 25,
    requires: ["assert-stmt", "assignment", "boolean", "class-def", "comparison", "conditional-expr", "dict-get", "dict-literal", "dict-lookup", "encoding-arg", "except-type", "file-open", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "logical", "nested-dict", "none-value", "raise-stmt", "reassignment", "string-format", "string-index", "test-func", "top-level-indent", "truthiness", "try-except", "type-call", "unittest-case", "with-statement"],
    prompt: "A teammate wrote `load_checkpoint(path)` for the nightly job. Its contract: no file → `{\"offset\": 0, \"totals\": {}}`; a valid checkpoint → the saved dictionary; a file that isn't valid JSON, or has an `offset` that isn't a whole number ≥ 0 → `ValueError`. Write unittest tests (or `test_` functions) that pass for a correct loader and catch broken ones. Your tests create their own files in the current folder. Leave the calls to Check: don't run the tests yourself.",
    spec: [
      ["Target", "`load_checkpoint(path)`, defined in your file (the starter has a correct version to try your tests on)"],
      ["Your tests", "a `unittest.TestCase` class or `test_` functions; each writes the file it needs (use a different name per test)"],
      ["Graded", "your tests must pass for a correct loader and fail for each of three broken loaders"],
    ],
    hiddenKinds: ["a loader that restarts from zero on a damaged file", "a loader that crashes when there is no file", "a loader that accepts a negative offset"],
    hints: [
      "Cover each line of the contract with its own test: missing file, valid file, damaged file, bad offset.",
      "`assertRaises(ValueError)` as a context manager checks that a call raises; write the damaged file first.",
      "A broken loader can be wrong in only one case, so a test per case is what catches it.",
    ],
    explanation: "Four tests, one per rule of the contract, catch all three defects: the damaged-file test catches the loader that restarts from zero, the missing-file test catches the one that raises FileNotFoundError, and the negative-offset test catches the one that only checks the type. Tests that only try the happy path pass for every broken loader.",
    code: {
      starter: src`
import json
import os
import unittest

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            raise ValueError(f"{path} is damaged")
    offset = state.get("offset") if isinstance(state, dict) else None
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        raise ValueError(f"{path} has a bad offset")
    return state

class LoadCheckpointTest(unittest.TestCase):
    def test_valid_file(self):
        with open("valid.json", "w", encoding="utf-8") as f:
            f.write('{"offset": 3, "totals": {"PushEvent": 2}}')
        self.assertEqual(load_checkpoint("valid.json"), {"offset": 3, "totals": {"PushEvent": 2}})
`,
      answer: src`
import json
import os
import unittest

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            raise ValueError(f"{path} is damaged")
    offset = state.get("offset") if isinstance(state, dict) else None
    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:
        raise ValueError(f"{path} has a bad offset")
    return state

def write(name, text):
    with open(name, "w", encoding="utf-8") as f:
        f.write(text)

class LoadCheckpointTest(unittest.TestCase):
    def test_valid_file(self):
        write("valid.json", '{"offset": 3, "totals": {"PushEvent": 2}}')
        self.assertEqual(load_checkpoint("valid.json"), {"offset": 3, "totals": {"PushEvent": 2}})

    def test_missing_file_is_a_fresh_start(self):
        if os.path.exists("absent.json"):
            os.remove("absent.json")
        self.assertEqual(load_checkpoint("absent.json"), {"offset": 0, "totals": {}})

    def test_damaged_file_raises(self):
        write("damaged.json", '{"offset": 3, "tot')
        with self.assertRaises(ValueError):
            load_checkpoint("damaged.json")

    def test_negative_offset_raises(self):
        write("negative.json", '{"offset": -1, "totals": {}}')
        with self.assertRaises(ValueError):
            load_checkpoint("negative.json")
`,
      alternatives: [
        src`
import json
import os

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        try:
            state = json.load(f)
        except json.JSONDecodeError:
            raise ValueError("damaged")
    if type(state.get("offset")) is not int or state["offset"] < 0:
        raise ValueError("bad offset")
    return state

def raises_value_error(path):
    try:
        load_checkpoint(path)
    except ValueError:
        return True
    return False

def test_all_cases():
    with open("t_ok.json", "w", encoding="utf-8") as f:
        f.write('{"offset": 5, "totals": {}}')
    with open("t_cut.json", "w", encoding="utf-8") as f:
        f.write('{"off')
    with open("t_neg.json", "w", encoding="utf-8") as f:
        f.write('{"offset": -4, "totals": {}}')
    assert load_checkpoint("t_ok.json") == {"offset": 5, "totals": {}}
    assert load_checkpoint("t_none.json") == {"offset": 0, "totals": {}}
    assert raises_value_error("t_cut.json")
    assert raises_value_error("t_neg.json")
`,
      ],
      wrong: [
        {
          code: src`
import json
import os
import unittest

def load_checkpoint(path):
    if not os.path.exists(path):
        return {"offset": 0, "totals": {}}
    with open(path, encoding="utf-8") as f:
        return json.load(f)

class LoadCheckpointTest(unittest.TestCase):
    def test_valid_file(self):
        with open("valid.json", "w", encoding="utf-8") as f:
            f.write('{"offset": 3, "totals": {"PushEvent": 2}}')
        self.assertEqual(load_checkpoint("valid.json"), {"offset": 3, "totals": {"PushEvent": 2}})

    def test_missing_file(self):
        self.assertEqual(load_checkpoint("nope.json"), {"offset": 0, "totals": {}})
`,
          fails: ["tests-1", "tests-3"],
          why: "no test writes a damaged file or a negative offset, so those defects slip through",
        },
        {
          code: src`
import json
import os
import unittest

def load_checkpoint(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

class LoadCheckpointTest(unittest.TestCase):
    def test_damaged(self):
        with open("bad.json", "w", encoding="utf-8") as f:
            f.write("{")
        with self.assertRaises(ValueError):
            load_checkpoint("bad.json")

    def test_negative(self):
        with open("neg.json", "w", encoding="utf-8") as f:
            f.write('{"offset": -2, "totals": {}}')
        with self.assertRaises(ValueError):
            load_checkpoint("neg.json")
`,
          fails: ["tests-2"],
          why: "nothing tests a missing file, so a loader that crashes on a first run passes",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "load_checkpoint",
          correct: "import json, os\ndef load_checkpoint(path):\n    if not os.path.exists(path):\n        return {'offset': 0, 'totals': {}}\n    with open(path, encoding='utf-8') as f:\n        try:\n            state = json.load(f)\n        except json.JSONDecodeError:\n            raise ValueError('damaged')\n    offset = state.get('offset') if isinstance(state, dict) else None\n    if isinstance(offset, bool) or not isinstance(offset, int) or offset < 0:\n        raise ValueError('bad offset')\n    return state\n",
          defects: [
            { label: "a loader that restarts from zero on a damaged file", code: "import json, os\ndef load_checkpoint(path):\n    try:\n        with open(path, encoding='utf-8') as f:\n            state = json.load(f)\n    except (OSError, json.JSONDecodeError):\n        return {'offset': 0, 'totals': {}}\n    if not isinstance(state.get('offset'), int) or state['offset'] < 0:\n        raise ValueError('bad offset')\n    return state\n" },
            { label: "a loader that crashes when there is no file", code: "import json\ndef load_checkpoint(path):\n    with open(path, encoding='utf-8') as f:\n        try:\n            state = json.load(f)\n        except json.JSONDecodeError:\n            raise ValueError('damaged')\n    if not isinstance(state.get('offset'), int) or state['offset'] < 0:\n        raise ValueError('bad offset')\n    return state\n" },
            { label: "a loader that accepts a negative offset", code: "import json, os\ndef load_checkpoint(path):\n    if not os.path.exists(path):\n        return {'offset': 0, 'totals': {}}\n    with open(path, encoding='utf-8') as f:\n        try:\n            state = json.load(f)\n        except json.JSONDecodeError:\n            raise ValueError('damaged')\n    if not isinstance(state.get('offset'), int):\n        raise ValueError('bad offset')\n    return state\n" },
          ],
        }), [2, 3]),
      },
    },
  },
  {
    id: "PY-Q46-20",
    version: 2,
    slug: "resumable-event-loader",
    title: "A loader that survives a crash",
    format: "integration",
    difficulty: "hard",
    minutes: 30,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "dict-literal", "dict-lookup", "else-clause", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-mutate", "logical", "membership", "nested-condition", "newline-escape", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "sql-tx", "sqlite-call", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "with-statement"],
    prompt: "Put the module together: load a JSON Lines event file into SQLite so that bad lines are counted rather than fatal, a rerun never duplicates a row, and a crash part way through resumes from a checkpoint. Write `load_file(path, conn, ckpt_path)`.",
    spec: [
      ["Function", "`load_file(path, conn, ckpt_path)`; the table `events (event_id TEXT PRIMARY KEY, type TEXT)` already exists"],
      ["Per line", "skip blank lines; a line that isn't a JSON object with `id` and `type` is counted as rejected; otherwise insert it, ignoring an ID that is already stored"],
      ["Checkpoint", "`{\"line\": n}` = lines finished (blank and rejected lines count as finished); after every 2 lines, `conn.commit()` and then save the checkpoint atomically; at the end commit, then delete the checkpoint"],
      ["Resume", "with a checkpoint, start after line `n`"],
      ["Returns", "`(loaded, rejected)` counted by **this** call (an ID already stored still counts as loaded)"],
      ["Crash", "an error from the database is not caught: it stops the run"],
    ],
    hiddenKinds: ["a database that fails part way, then a rerun", "a file loaded twice", "a file of only bad lines", "an existing checkpoint from an earlier crash"],
    hints: [
      "Read all lines, pick the starting line from the checkpoint, then loop with the real line numbers.",
      "Use `ON CONFLICT(event_id) DO NOTHING` so a line replayed after a crash, or a second run, can't duplicate a row.",
      "Commit before saving the checkpoint, so the checkpoint never claims rows the database hasn't kept; delete it only after the final commit.",
    ],
    explanation: "The checkpoint counts finished lines, so resuming skips exactly those. Committing before each checkpoint save means a crash loses at most the uncommitted lines after the last checkpoint, and those are replayed; the primary key with `DO NOTHING` makes the replay harmless. Wrong answers save the checkpoint before committing (rows claimed but rolled back are never loaded) or ignore the checkpoint and rely only on the key, which works but reprocesses the whole file after every crash and fails the progress check.",
    code: {
      starter: src`
import json
import os
import sqlite3

def load_file(path, conn, ckpt_path):
    return 0, 0

with open("hour.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000000581", "type": "PushEvent"}\n')
    f.write('{"id": "48000001631", "type": "CreateEv\n')
    f.write('\n')
    f.write('{"id": "48000007504", "type": "WatchEvent"}\n')
    f.write('{"id": "48000002275", "type": "IssuesEvent"}\n')
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)")
print(load_file("hour.jsonl", conn, "hour.ckpt"))
print(load_file("hour.jsonl", conn, "hour.ckpt"))
print(conn.execute("SELECT COUNT(*) FROM events").fetchone())
`,
      answer: src`
import json
import os
import sqlite3

def save(path, state):
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(path + ".tmp", path)

def parse(line):
    try:
        record = json.loads(line)
    except json.JSONDecodeError:
        return None
    if isinstance(record, dict) and "id" in record and "type" in record:
        return record
    return None

def load_file(path, conn, ckpt_path):
    start = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            start = json.load(f)["line"]
    with open(path, encoding="utf-8") as f:
        all_lines = f.readlines()
    loaded = rejected = 0
    for number in range(start + 1, len(all_lines) + 1):
        line = all_lines[number - 1]
        if line.strip():
            record = parse(line)
            if record is None:
                rejected += 1
            else:
                conn.execute(
                    "INSERT INTO events VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING",
                    (record["id"], record["type"]),
                )
                loaded += 1
        if number % 2 == 0:
            conn.commit()
            save(ckpt_path, {"line": number})
    conn.commit()
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
    return loaded, rejected

with open("hour.jsonl", "w", encoding="utf-8") as f:
    f.write('{"id": "48000000581", "type": "PushEvent"}\n')
    f.write('{"id": "48000001631", "type": "CreateEv\n')
    f.write('\n')
    f.write('{"id": "48000007504", "type": "WatchEvent"}\n')
    f.write('{"id": "48000002275", "type": "IssuesEvent"}\n')
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)")
print(load_file("hour.jsonl", conn, "hour.ckpt"))
print(load_file("hour.jsonl", conn, "hour.ckpt"))
print(conn.execute("SELECT COUNT(*) FROM events").fetchone())
`,
      alternatives: [
        src`
import json
import os
from pathlib import Path

def load_file(path, conn, ckpt_path):
    ckpt = Path(ckpt_path)
    done = json.loads(ckpt.read_text(encoding="utf-8"))["line"] if ckpt.exists() else 0
    lines = Path(path).read_text(encoding="utf-8").split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    loaded, rejected = 0, 0
    for index in range(done, len(lines)):
        text = lines[index]
        if text.strip():
            try:
                record = json.loads(text)
                ok = isinstance(record, dict) and "id" in record and "type" in record
            except json.JSONDecodeError:
                ok = False
            if ok:
                conn.execute("INSERT INTO events (event_id, type) VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING", (record["id"], record["type"]))
                loaded += 1
            else:
                rejected += 1
        if (index + 1) % 2 == 0:
            conn.commit()
            Path(ckpt_path + ".tmp").write_text(json.dumps({"line": index + 1}), encoding="utf-8")
            os.replace(ckpt_path + ".tmp", ckpt_path)
    conn.commit()
    if ckpt.exists():
        ckpt.unlink()
    return loaded, rejected
`,
      ],
      wrong: [
        {
          code: src`
import json
import os

def load_file(path, conn, ckpt_path):
    loaded = rejected = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                rejected += 1
                continue
            if not isinstance(record, dict) or "id" not in record or "type" not in record:
                rejected += 1
                continue
            conn.execute("INSERT INTO events VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING", (record["id"], record["type"]))
            loaded += 1
    conn.commit()
    return loaded, rejected
`,
          fails: ["progress", "resume"],
          why: "there is no checkpoint, so after a crash the whole file is processed again",
        },
        {
          code: src`
import json
import os

def load_file(path, conn, ckpt_path):
    start = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            start = json.load(f)["line"]
    with open(path, encoding="utf-8") as f:
        all_lines = f.readlines()
    loaded = rejected = 0
    for number in range(start + 1, len(all_lines) + 1):
        line = all_lines[number - 1]
        if number % 2 == 0:
            with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
                json.dump({"line": number}, f)
            os.replace(ckpt_path + ".tmp", ckpt_path)
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            rejected += 1
            continue
        if not isinstance(record, dict) or "id" not in record or "type" not in record:
            rejected += 1
            continue
        conn.execute("INSERT INTO events VALUES (?, ?) ON CONFLICT(event_id) DO NOTHING", (record["id"], record["type"]))
        loaded += 1
        if number % 2 == 0:
            conn.commit()
    conn.commit()
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
    return loaded, rejected
`,
          fails: ["progress", "resume"],
          why: "the checkpoint is saved before the line's row is committed, so rows lost in the crash are skipped on resume",
        },
        {
          code: src`
import json
import os

def load_file(path, conn, ckpt_path):
    start = 0
    if os.path.exists(ckpt_path):
        with open(ckpt_path, encoding="utf-8") as f:
            start = json.load(f)["line"]
    with open(path, encoding="utf-8") as f:
        all_lines = f.readlines()
    loaded = rejected = 0
    for number in range(start + 1, len(all_lines) + 1):
        line = all_lines[number - 1]
        if line.strip():
            try:
                record = json.loads(line)
                conn.execute("INSERT INTO events VALUES (?, ?)", (record["id"], record["type"]))
                loaded += 1
            except (json.JSONDecodeError, KeyError, TypeError):
                rejected += 1
        if number % 2 == 0:
            conn.commit()
            with open(ckpt_path + ".tmp", "w", encoding="utf-8") as f:
                json.dump({"line": number}, f)
            os.replace(ckpt_path + ".tmp", ckpt_path)
    conn.commit()
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
    return loaded, rejected
`,
          fails: ["twice"],
          why: "without `ON CONFLICT` a second run raises `IntegrityError` on the first row it already stored",
        },
      ],
      task: {
        checks: [
          expr("returns", "load_file() loads the starter's file", lines(
            "import sqlite3 as _sq",
            writeFile("q20a.jsonl", '{"id": "48000000581", "type": "PushEvent"}\n{"id": "48000001631", "type": "CreateEv\n\n{"id": "48000007504", "type": "WatchEvent"}\n{"id": "48000002275", "type": "IssuesEvent"}\n'),
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)')",
            "result = (load_file('q20a.jsonl', _c, 'q20a.ckpt'), _c.execute('SELECT COUNT(*) FROM events').fetchone()[0])",
          ), py.tuple(py.tuple(py.int(3), py.int(1)), py.int(3)), { show: "load_file('hour.jsonl', conn, 'hour.ckpt')" }),
          expr("twice", "a file loaded twice", lines(
            "import sqlite3 as _sq, os as _os",
            writeFile("q20b.jsonl", '{"id": "a", "type": "PushEvent"}\n{"id": "b", "type": "PushEvent"}\n{"id": "c", "type": "ForkEvent"}\n'),
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)')",
            "load_file('q20b.jsonl', _c, 'q20b.ckpt')",
            "_second = load_file('q20b.jsonl', _c, 'q20b.ckpt')",
            "result = (_second, _c.execute('SELECT COUNT(*) FROM events').fetchone()[0], _os.path.exists('q20b.ckpt'))",
          ), py.tuple(py.tuple(py.int(3), py.int(0)), py.int(3), py.bool(false)), { hidden: true }),
          expr("progress", "a crash part way leaves a checkpoint", lines(
            "import sqlite3 as _sq, json as _j",
            writeFile("q20c.jsonl", '{"id": "1", "type": "PushEvent"}\n{"id": "2", "type": "PushEvent"}\n{"id": "3", "type": "PushEvent"}\n{"id": "4", "type": "PushEvent"}\n{"id": "5", "type": "PushEvent"}\n'),
            "_real = _sq.connect(':memory:')",
            "_real.execute('CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)')",
            "class _Flaky:",
            "    def __init__(self, conn):",
            "        self.conn = conn",
            "    def execute(self, sql, params=()):",
            "        if params and params[0] == '4':",
            "            raise _sq.OperationalError('database is locked')",
            "        return self.conn.execute(sql, params)",
            "    def commit(self):",
            "        self.conn.commit()",
            "try:",
            "    load_file('q20c.jsonl', _Flaky(_real), 'q20c.ckpt')",
            "except _sq.OperationalError:",
            "    pass",
            "result = _j.load(open('q20c.ckpt', encoding='utf-8'))",
          ), { line: 2 }, { hidden: true }),
          expr("resume", "a database that fails part way, then a rerun", lines(
            "import sqlite3 as _sq",
            writeFile("q20d.jsonl", '{"id": "1", "type": "PushEvent"}\n{"id": "2", "type": "PushEvent"}\n{"id": "3", "type": "WatchEvent"}\n{"id": "4", "type": "PushEvent"}\nbroken\n{"id": "6", "type": "ForkEvent"}\n'),
            "_real = _sq.connect(':memory:')",
            "_real.execute('CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)')",
            "class _Flaky:",
            "    def __init__(self, conn):",
            "        self.conn = conn",
            "    def execute(self, sql, params=()):",
            "        if params and params[0] == '4':",
            "            raise _sq.OperationalError('database is locked')",
            "        return self.conn.execute(sql, params)",
            "    def commit(self):",
            "        self.conn.commit()",
            "try:",
            "    load_file('q20d.jsonl', _Flaky(_real), 'q20d.ckpt')",
            "except _sq.OperationalError:",
            "    _real.rollback()",
            "_rerun = load_file('q20d.jsonl', _real, 'q20d.ckpt')",
            "result = (_rerun, [_r[0] for _r in _real.execute('SELECT event_id FROM events ORDER BY event_id')])",
          ), py.tuple(py.tuple(py.int(3), py.int(1)), pv(["1", "2", "3", "4", "6"])), { hidden: true }),
          expr("all-bad", "a file of only bad lines", lines(
            "import sqlite3 as _sq",
            writeFile("q20e.jsonl", "[1]\n{\n\"text\"\n"),
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE events (event_id TEXT PRIMARY KEY, type TEXT)')",
            "result = load_file('q20e.jsonl', _c, 'q20e.ckpt')",
          ), py.tuple(py.int(0), py.int(3)), { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q46-22",
    version: 2,
    slug: "deduplicate-events-quickly",
    title: "Deduplicate a day of events quickly",
    format: "performance",
    difficulty: "hard",
    minutes: 20,
    requires: ["assignment", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "string-index", "top-level-indent"],
    prompt: "The feed redelivers events, so the loader keeps only the first copy of each event ID. The current `first_copies` compares every event's ID with every ID kept so far, which takes minutes on a full day. Make it fast without changing what it returns.",
    spec: [
      ["Function", "`first_copies(events)`"],
      ["Returns", "a new list with the first event for each `id`, in the order those first copies appear; the input is not changed"],
      ["Constraint", "for 800 events with 400 different IDs, the function may compare IDs with `==` at most 1,600 times (the current version needs 160,000; on a full day of events the gap is minutes against milliseconds)"],
    ],
    hiddenKinds: ["all IDs different", "every event a repeat of one", "repeats far apart", "no events"],
    hints: [
      "The slow part is `in` on a list: it compares with every element in turn.",
      "A set answers `in` by hashing, which needs about one comparison however big it is.",
      "Keep the result list for order and a separate set of IDs seen so far.",
    ],
    explanation: "Membership in a list scans it, so the original does about n²/4 comparisons. A set of seen IDs makes each check constant time on average while the result list keeps the order of first copies. The operation budget counts real `==` calls on the IDs, so any set- or dict-based answer passes and any list scan fails. A `dict` keyed by ID that keeps the first event also works; keeping the last copy (plain `d[id] = event`) changes the result.",
    code: {
      starter: src`
def first_copies(events):
    kept = []
    kept_ids = []
    for event in events:
        if event["id"] not in kept_ids:
            kept_ids.append(event["id"])
            kept.append(event)
    return kept

day = [
    {"id": "48000000581", "type": "PushEvent", "delivery": 1},
    {"id": "48000007504", "type": "WatchEvent", "delivery": 1},
    {"id": "48000000581", "type": "PushEvent", "delivery": 2},
]
print(first_copies(day))
`,
      answer: src`
def first_copies(events):
    kept = []
    seen = set()
    for event in events:
        if event["id"] not in seen:
            seen.add(event["id"])
            kept.append(event)
    return kept

day = [
    {"id": "48000000581", "type": "PushEvent", "delivery": 1},
    {"id": "48000007504", "type": "WatchEvent", "delivery": 1},
    {"id": "48000000581", "type": "PushEvent", "delivery": 2},
]
print(first_copies(day))
`,
      alternatives: [
        src`
def first_copies(events):
    firsts = {}
    for event in events:
        if event["id"] not in firsts:
            firsts[event["id"]] = event
    return list(firsts.values())
`,
      ],
      wrong: [
        {
          code: src`
def first_copies(events):
    by_id = {}
    for event in events:
        by_id[event["id"]] = event
    return list(by_id.values())
`,
          fails: ["returns"],
          why: "plain assignment keeps the last copy of each event, not the first",
        },
        {
          code: src`
def first_copies(events):
    kept = []
    for event in events:
        if all(event["id"] != other["id"] for other in kept):
            kept.append(event)
    return kept
`,
          fails: ["comparisons"],
          why: "it still compares each ID with every kept event",
        },
      ],
      task: {
        checks: [
          fn("returns", "first_copies", [
            example([[{ id: "48000000581", type: "PushEvent", delivery: 1 }, { id: "48000007504", type: "WatchEvent", delivery: 1 }, { id: "48000000581", type: "PushEvent", delivery: 2 }]], [{ id: "48000000581", type: "PushEvent", delivery: 1 }, { id: "48000007504", type: "WatchEvent", delivery: 1 }]),
            example([[{ id: "a", delivery: 1 }, { id: "b", delivery: 1 }]], [{ id: "a", delivery: 1 }, { id: "b", delivery: 1 }]),
            example([[{ id: "c", delivery: 1 }, { id: "c", delivery: 2 }, { id: "c", delivery: 3 }]], [{ id: "c", delivery: 1 }]),
            hiddenCase("all IDs different", [[{ id: "x" }, { id: "y" }, { id: "z" }]], [{ id: "x" }, { id: "y" }, { id: "z" }]),
            hiddenCase("every event a repeat of one", [[{ id: "r", n: 1 }, { id: "r", n: 2 }]], [{ id: "r", n: 1 }]),
            hiddenCase("repeats far apart", [[{ id: "1", n: 1 }, { id: "2", n: 1 }, { id: "3", n: 1 }, { id: "2", n: 2 }, { id: "1", n: 2 }, { id: "4", n: 1 }]], [{ id: "1", n: 1 }, { id: "2", n: 1 }, { id: "3", n: 1 }, { id: "4", n: 1 }]),
            hiddenCase("no events", [[]], []),
          ], { label: "first_copies() keeps the first copy of each event, in order" }),
          fn("keeps-input", "first_copies", [keepsInput([[{ id: "a" }, { id: "a" }]], { label: "a list with a repeat" })], { label: "first_copies() leaves its input unchanged" }),
          expr("comparisons", "first_copies() compares IDs at most 1,600 times for 800 events", lines(
            "_n = [0]",
            "class _Id(str):",
            "    def __eq__(self, other):",
            "        _n[0] += 1",
            "        return str.__eq__(self, other)",
            "    def __ne__(self, other):",
            "        _n[0] += 1",
            "        return str.__ne__(self, other)",
            "    __hash__ = str.__hash__",
            "first_copies([{'id': _Id(str(_i % 400))} for _i in range(800)])",
            "result = _n[0] <= 1600",
          ), true),
        ],
      },
    },
  },
];
