/**
 * M48 Observability & Operations: five lessons (PY-L48-01 … PY-L48-05).
 *
 * Structured logs written as one JSON object per line by a logging.Formatter (L01); metrics: counters, durations and
 * percentiles from a clock (L02); tracing: trace and span ids, parents and durations, with the trace id carried into
 * log records (L03); retries with exponential backoff, capped and jittered, through the M31 replay handler (L04); and
 * investigating a failure from JSON logs: following a trace, grouping errors, finding the first failure (L05).
 *
 * Everything runs: log records are captured from real handlers and parsed back as JSON, clocks and sleeps are passed
 * in so durations and waits are exact, and retried requests go through urllib with saved responses. Version 2:
 * rewritten from a placeholder module that printed fixed event names.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";
import { REPLAY_PY, replaySetup } from "../m31-replay";

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

/**
 * Python that sends the log calls in `calls` (using `_l`) through a fresh logger whose only handler formats with the
 * learner's `formatter` expression, and leaves the formatted lines in `_lines`.
 */
const formatted = (name: string, formatter: string, calls: string) =>
  lines(
    "import io as _io, logging as _lg",
    "_buf = _io.StringIO()",
    "_h = _lg.StreamHandler(_buf)",
    `_h.setFormatter(${formatter})`,
    `_l = _lg.getLogger(${JSON.stringify(name)})`,
    "_l.handlers.clear()",
    "_l.addHandler(_h)",
    "_l.setLevel(_lg.DEBUG)",
    "_l.propagate = False",
    calls,
    "_lines = _buf.getvalue().splitlines()",
  );

/** Python that collects every record the code in `call` logs to logger `name` into `_recs`. */
const records = (name: string, call: string) =>
  lines(
    "import logging as _lg",
    "class _Keep(_lg.Handler):",
    "    def __init__(self):",
    "        super().__init__()",
    "        self.records = []",
    "    def emit(self, record):",
    "        self.records.append(record)",
    "_k = _Keep()",
    `_l = _lg.getLogger(${JSON.stringify(name)})`,
    "_l.handlers.clear()",
    "_l.addHandler(_k)",
    "_l.setLevel(_lg.DEBUG)",
    "_l.propagate = False",
    call,
    "_recs = _k.records",
  );

export const m48Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L48-01 structured logs
  {
    id: "PY-L48-01",
    version: 2,
    slug: "structured-json-logs",
    title: "Write logs a program can read",
    lede: "A log line like `loaded 2025-03-03-00.jsonl: 41 events, 1 rejected` is easy for a person and hard for a program. Structured logs write each record as one JSON object with fixed fields plus context, so the logs themselves can be searched, filtered and counted.",
    focus: "Write a `logging.Formatter` that turns each record into one JSON object with fixed fields plus the `extra=` context, and read those logs back with `json.loads`.",
    minutes: 22,
    objectives: [
      "Explain what structured logging gives you that text log messages don't",
      "Subclass `logging.Formatter` to emit one JSON object per record, including fields passed with `extra=`",
      "Record an exception's type in the JSON, and parse log lines back to filter them",
    ],
    requires: ["all-call", "arithmetic", "assignment", "attr-assign", "bitwise", "boolean", "class-def", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "print-call", "print-several", "print-text", "reassignment", "self-name", "set-literal", "string-format", "string-index", "string-method", "subclass", "top-level-indent", "truthiness", "try-except", "type-call"],
    teaches: ["json-log"],
    blocks: [
      {
        kind: "text",
        md: "In the Debugging & Logging module you logged messages with a level and a logger name, formatted as text. Text works while a person reads the log. In production, logs from every server and job land in one place, and the questions are asked by programs: *how many lines were rejected per file today? which errors happened for repository X?* Answering that from sentences means fragile pattern matching that breaks when someone rewords a message.\n\n**Structured logging** keeps the message short and fixed (`\"hour loaded\"`) and puts the variable details in named fields (`file`, `events`, `rejected`). Each record is written as **one JSON object per line** (the same JSON Lines you read in the CSV JSON & JSONL module), so any tool can parse it.\n\nIn Python, the shape of a log line is decided by a **formatter**. Subclass `logging.Formatter` and override `format(record)` to return the JSON text. Context goes in with `extra={...}`: logging copies each key onto the record as an attribute, and the formatter picks up every attribute a plain record doesn't have.",
      },
      {
        kind: "example",
        title: "A JSON formatter",
        code: src`
import json
import logging
import sys

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        for key, value in vars(record).items():
            if key not in STANDARD:
                entry[key] = value
        return json.dumps(entry)

log = logging.getLogger("ingest")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.setLevel(logging.INFO)
log.propagate = False

log.info("hour loaded", extra={"file": "2025-03-03-00.jsonl", "events": 41, "rejected": 1})
log.warning("line rejected", extra={"file": "2025-03-03-00.jsonl", "line": 3, "reason": "Expecting ',' delimiter"})
log.debug("not shown: below the logger's level")
`,
        output: "{\"level\": \"INFO\", \"logger\": \"ingest\", \"message\": \"hour loaded\", \"file\": \"2025-03-03-00.jsonl\", \"events\": 41, \"rejected\": 1}\n{\"level\": \"WARNING\", \"logger\": \"ingest\", \"message\": \"line rejected\", \"file\": \"2025-03-03-00.jsonl\", \"line\": 3, \"reason\": \"Expecting ',' delimiter\"}\n",
        note: "`STANDARD` is every attribute a record has before any `extra`, so whatever is left over is context. Numbers stay numbers in the JSON. The handler goes to `sys.stdout` only so the lines appear here, and `handlers.clear()` keeps a second run of this page from adding a second handler. A production formatter also writes the time (`record.created`), left out here so the output is the same every run.",
      },
      {
        kind: "text",
        md: "`extra` keys become record attributes, so they must not collide with the names logging already uses:",
      },
      {
        kind: "error-example",
        title: "An extra field that clashes with the record",
        code: src`
import logging

log = logging.getLogger("ingest")
log.warning("line rejected", extra={"message": "bad JSON", "line": 3})
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: \"Attempt to overwrite 'message' in LogRecord\"`. Names like `message`, `args`, `name` and `msg` belong to the record; choose field names such as `reason` or `detail`.",
      },
      {
        kind: "text",
        md: "Failures need structure most. When a record carries an exception (from `log.exception(...)` inside `except`, or `exc_info=True`), put the exception's type in its own field, so errors can be counted by kind. Then the log is data: read it back line by line with `json.loads` and filter.",
      },
      {
        kind: "example",
        title: "Errors as fields, and logs read back as data",
        code: src`
import io
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "message": record.getMessage()}
        entry["file"] = getattr(record, "file", None)
        if record.exc_info:
            entry["error"] = type(record.exc_info[1]).__name__
        return json.dumps(entry)

stream = io.StringIO()
handler = logging.StreamHandler(stream)
handler.setFormatter(JsonFormatter())
log = logging.getLogger("backfill")
log.handlers.clear()
log.addHandler(handler)
log.propagate = False

for name, text in [("00.jsonl", "[]"), ("01.jsonl", "{bad"), ("02.jsonl", "[]"), ("03.jsonl", "")]:
    try:
        json.loads(text)
        log.warning("file read", extra={"file": name})
    except json.JSONDecodeError:
        log.exception("file unreadable", extra={"file": name})

entries = [json.loads(line) for line in stream.getvalue().splitlines()]
failed = [e["file"] for e in entries if e["level"] == "ERROR"]
print(len(entries), "records;", "failed files:", failed)
print(entries[1])
`,
        output: "4 records; failed files: ['01.jsonl', '03.jsonl']\n{'level': 'ERROR', 'message': 'file unreadable', 'file': '01.jsonl', 'error': 'JSONDecodeError'}\n",
        note: "`log.exception` logs at ERROR and attaches the exception being handled; the formatter turns it into an `error` field. The program then answers \"which files failed?\" from the log itself, with no text matching.",
      },
      {
        kind: "text",
        md: "**When to use it:** for any program whose logs are read by tools: services, scheduled jobs, pipelines. **Mistakes to avoid:** variable details baked into the message (`f\"loaded {file}\"`) instead of fields; building JSON by gluing strings (a quote in a value breaks it; use `json.dumps`); extra keys that clash with record attributes; and logging secrets in a field (see Secure Python).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Include the context fields",
      prompt: "`JsonFormatter` writes only the level, logger and message, so the `extra=` details are lost. Add every attribute of the record that isn't in `STANDARD` to the JSON object.",
      spec: [
        ["Class", "`JsonFormatter`, a `logging.Formatter` whose `format(record)` returns one JSON object"],
        ["Fields", "`level`, `logger`, `message`, then every `extra=` field"],
      ],
      starter: src`
import json
import logging
import sys

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        return json.dumps(entry)

log = logging.getLogger("stars")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("star counted", extra={"repo": "lumen-labs/pyauth", "stars": 2})
`,
      answer: src`
import json
import logging
import sys

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        for key, value in vars(record).items():
            if key not in STANDARD:
                entry[key] = value
        return json.dumps(entry)

log = logging.getLogger("stars")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("star counted", extra={"repo": "lumen-labs/pyauth", "stars": 2})
`,
      wrong: [
        {
          code: src`
import json
import logging

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "logger": record.name, "message": record.getMessage()}
        entry.update(vars(record))
        return json.dumps(entry, default=str)
`,
          fails: ["returns", "no-extra"],
          why: "copying every attribute adds twenty internal fields (`pathname`, `thread`, …) to each line",
        },
      ],
      hints: ["`vars(record)` is a dictionary of everything stored on the record.", "Skip the names in `STANDARD`; what is left came from `extra=`.", "Add each remaining name and value to `entry` before dumping it."],
      task: {
        checks: [
          expr("returns", "a record's extra fields appear in the JSON", lines(formatted("chk.try", "JsonFormatter()", "_l.warning('star counted', extra={'repo': 'lumen-labs/pyauth', 'stars': 2})"), "import json as _j", "result = _j.loads(_lines[0])"), { level: "WARNING", logger: "chk.try", message: "star counted", repo: "lumen-labs/pyauth", stars: 2 }, { show: "log.warning('star counted', extra={'repo': 'lumen-labs/pyauth', 'stars': 2})" }),
          expr("no-extra", "a record with no extra fields", lines(formatted("chk.try2", "JsonFormatter()", "_l.info('started')"), "import json as _j", "result = _j.loads(_lines[0])"), { level: "INFO", logger: "chk.try2", message: "started" }, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A logfmt formatter",
        prompt: "Some log tools expect **logfmt** instead of JSON: one line of `key=value` pairs. Write `LogfmtFormatter`, a `logging.Formatter` whose `format(record)` returns `level=<LEVEL> logger=<name> msg=<message>` followed by ` key=value` for each `extra=` field in the order given. A value is written as-is when it is a number or a text made only of letters, digits and `._-/:`; any other text (spaces, quotes, `=`, empty) is written in double quotes using `json.dumps`, so quotes inside are escaped.",
        spec: [
          ["Class", "`LogfmtFormatter(logging.Formatter)` with `format(record)`"],
          ["Order", "`level`, `logger`, `msg`, then the extra fields in the order they were passed"],
          ["Quoting", "bare when the text fully matches `[A-Za-z0-9._\\-/:]+` (or the value is an `int`/`float`); otherwise `json.dumps(str(value))`"],
          ["Example", "`log.info(\"hour loaded\", extra={\"file\": \"00.jsonl\", \"events\": 41})` → `level=INFO logger=ingest msg=\"hour loaded\" file=00.jsonl events=41`"],
        ],
        starter: src`
import json
import logging
import re
import sys

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class LogfmtFormatter(logging.Formatter):
    def format(self, record):
        return record.getMessage()

log = logging.getLogger("ingest")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(LogfmtFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("hour loaded", extra={"file": "00.jsonl", "events": 41})
`,
        answer: src`
import json
import logging
import re
import sys

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

def show(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    text = str(value)
    if re.fullmatch(r"[A-Za-z0-9._\-/:]+", text):
        return text
    return json.dumps(text)

class LogfmtFormatter(logging.Formatter):
    def format(self, record):
        pairs = [("level", record.levelname), ("logger", record.name), ("msg", record.getMessage())]
        for key, value in vars(record).items():
            if key not in STANDARD:
                pairs.append((key, value))
        return " ".join(f"{key}={show(value)}" for key, value in pairs)

log = logging.getLogger("ingest")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(LogfmtFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("hour loaded", extra={"file": "00.jsonl", "events": 41})
`,
        alternatives: [
          src`
import json
import logging

BARE = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-/:")
PLAIN = set(vars(logging.makeLogRecord({}))) | {"message"}

class LogfmtFormatter(logging.Formatter):
    def format(self, record):
        out = "level=" + record.levelname + " logger=" + record.name + " msg=" + self.value(record.getMessage())
        for key in vars(record):
            if key not in PLAIN:
                out += " " + key + "=" + self.value(getattr(record, key))
        return out

    def value(self, v):
        if type(v) in (int, float):
            return str(v)
        s = str(v)
        return s if s and all(c in BARE for c in s) else json.dumps(s)
`,
        ],
        wrong: [
          {
            code: src`
import logging

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class LogfmtFormatter(logging.Formatter):
    def format(self, record):
        parts = [f"level={record.levelname}", f"logger={record.name}", f"msg={record.getMessage()}"]
        for key, value in vars(record).items():
            if key not in STANDARD:
                parts.append(f"{key}={value}")
        return " ".join(parts)
`,
            fails: ["returns", "quotes", "empty"],
            why: "nothing is quoted, so `msg=hour loaded` splits into two pairs and a value with a quote can't be read back",
          },
          {
            code: src`
import json
import logging

STANDARD = set(vars(logging.LogRecord("x", logging.INFO, "x", 1, "x", None, None))) | {"message"}

class LogfmtFormatter(logging.Formatter):
    def format(self, record):
        parts = [f"level={record.levelname}", f"logger={record.name}", f"msg={json.dumps(record.getMessage())}"]
        for key, value in vars(record).items():
            if key not in STANDARD:
                parts.append(f"{key}={json.dumps(value)}")
        return " ".join(parts)
`,
            fails: ["returns", "bare", "quotes", "empty"],
            why: "every text is quoted, even simple ones like file names, which logfmt writes bare",
          },
        ],
        hints: [
          "Build a list of (key, value) pairs: the three fixed ones, then the record's extra attributes.",
          "Write one small function that decides how a single value is shown: number, bare word, or quoted.",
          "`json.dumps(text)` adds the double quotes and escapes any quote inside; join the pairs with single spaces.",
        ],
        task: {
          checks: [
            expr("returns", "the example record in logfmt", lines(formatted("ingest", "LogfmtFormatter()", "_l.info('hour loaded', extra={'file': '00.jsonl', 'events': 41})"), "result = _lines"), ['level=INFO logger=ingest msg="hour loaded" file=00.jsonl events=41'], { show: "log.info('hour loaded', extra={'file': '00.jsonl', 'events': 41})" }),
            expr("bare", "simple values are written bare", lines(formatted("stars", "LogfmtFormatter()", "_l.warning('slow', extra={'repo': 'lumen-labs/pyauth', 'ms': 812.5, 'at': '2025-03-03T00:09:20Z'})"), "result = _lines"), ["level=WARNING logger=stars msg=slow repo=lumen-labs/pyauth ms=812.5 at=2025-03-03T00:09:20Z"], { show: "log.warning('slow', extra={'repo': 'lumen-labs/pyauth', 'ms': 812.5, 'at': '2025-03-03T00:09:20Z'})" }),
            expr("quotes", "a value with quotes and an equals sign", lines(formatted("q", "LogfmtFormatter()", "_l.error('rejected', extra={'reason': 'Expecting \"x\" at a=1'})"), "result = _lines"), ['level=ERROR logger=q msg=rejected reason="Expecting \\"x\\" at a=1"'], { hidden: true }),
            expr("empty", "an empty text value", lines(formatted("e", "LogfmtFormatter()", "_l.info('x', extra={'note': ''})"), "result = _lines"), ['level=INFO logger=e msg=x note=""'], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Log an ingest run as structured records",
        prompt: "Add structured logging to an ingest step (see Reliable Data Pipelines). Write `ingest(lines, log)`: parse each non-blank line as JSON; for a line that isn't valid JSON, log a WARNING with message `\"line rejected\"` and the fields `line` (its number, from 1) and `reason` (the parser's `msg`); keep the valid values. At the end log one INFO `\"batch loaded\"` with the fields `loaded` and `rejected`. Return the list of loaded values. Messages stay fixed: all the details go in `extra=` fields.",
        spec: [
          ["Function", "`ingest(lines, log)`; `log` is a `logging.Logger`"],
          ["Per bad line", "`log.warning(\"line rejected\", extra={\"line\": n, \"reason\": err.msg})`"],
          ["At the end", "`log.info(\"batch loaded\", extra={\"loaded\": k, \"rejected\": m})`"],
          ["Returns", "the loaded values, in order; blank lines are skipped without a record"],
        ],
        starter: src`
import json
import logging

def ingest(lines, log):
    return []

log = logging.getLogger("ingest")
print(ingest(['{"id": "48000000581"}', "", '{"id": "4800'], log))
`,
        answer: src`
import json
import logging

def ingest(lines, log):
    loaded = []
    rejected = 0
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            loaded.append(json.loads(line))
        except json.JSONDecodeError as err:
            rejected += 1
            log.warning("line rejected", extra={"line": number, "reason": err.msg})
    log.info("batch loaded", extra={"loaded": len(loaded), "rejected": rejected})
    return loaded

log = logging.getLogger("ingest")
print(ingest(['{"id": "48000000581"}', "", '{"id": "4800'], log))
`,
        alternatives: [
          src`
import json

def ingest(lines, log):
    good = []
    bad = 0
    number = 0
    for line in lines:
        number += 1
        if line.strip() == "":
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as problem:
            log.warning("line rejected", extra=dict(line=number, reason=problem.msg))
            bad += 1
        else:
            good.append(value)
    log.info("batch loaded", extra=dict(loaded=len(good), rejected=bad))
    return good
`,
        ],
        wrong: [
          {
            code: src`
import json

def ingest(lines, log):
    loaded = []
    rejected = 0
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            loaded.append(json.loads(line))
        except json.JSONDecodeError as err:
            rejected += 1
            log.warning(f"line {number} rejected: {err.msg}")
    log.info(f"batch loaded: {len(loaded)} loaded, {rejected} rejected")
    return loaded
`,
            fails: ["records", "summary", "all-good"],
            why: "the details are baked into the message text, so the records have no `line`, `reason`, `loaded` or `rejected` fields",
          },
          {
            code: src`
import json

def ingest(lines, log):
    loaded = []
    rejected = 0
    for number, line in enumerate(lines, start=1):
        try:
            loaded.append(json.loads(line))
        except json.JSONDecodeError as err:
            rejected += 1
            log.warning("line rejected", extra={"line": number, "reason": err.msg})
    log.info("batch loaded", extra={"loaded": len(loaded), "rejected": rejected})
    return loaded
`,
            fails: ["records", "summary", "all-good"],
            why: "blank lines are logged as rejected lines",
          },
        ],
        hints: [
          "Keep the the Reliable Data Pipelines module ingest loop; add one log call in the `except` branch and one after the loop.",
          "The message is the same fixed text every time; the line number and reason go in the `extra` dictionary.",
          "Count the rejected lines as you go, so the summary record can report both numbers.",
        ],
        task: {
          checks: [
            expr("returns", "ingest() returns the loaded values", lines(records("chk.ingest1", "_out = ingest([\"{\\\"id\\\": \\\"48000000581\\\"}\", \"\", \"{\\\"id\\\": \\\"4800\", \"[1, 2]\", \"nope\"], _l)"), "result = _out"), [{ id: "48000000581" }, [1, 2]], { show: "ingest(lines, log)" }),
            expr("records", "each bad line is a WARNING with line and reason fields", lines(records("chk.ingest2", "ingest([\"{\\\"id\\\": \\\"48000000581\\\"}\", \"\", \"{\\\"id\\\": \\\"4800\", \"[1, 2]\", \"nope\"], _l)"), "result = [(_r.levelname, _r.getMessage(), getattr(_r, 'line', None), getattr(_r, 'reason', None)) for _r in _recs if _r.levelno == _lg.WARNING]"), [py.tuple(py.str("WARNING"), py.str("line rejected"), py.int(3), py.str("Unterminated string starting at")), py.tuple(py.str("WARNING"), py.str("line rejected"), py.int(5), py.str("Expecting value"))], { show: "the WARNING records from ingest(lines, log)" }),
            expr("summary", "one INFO summary with loaded and rejected fields", lines(records("chk.ingest3", "ingest([\"{\\\"id\\\": \\\"48000000581\\\"}\", \"\", \"{\\\"id\\\": \\\"4800\", \"[1, 2]\", \"nope\"], _l)"), "_last = _recs[-1]", "result = (_last.levelname, _last.getMessage(), getattr(_last, 'loaded', None), getattr(_last, 'rejected', None))"), py.tuple(py.str("INFO"), py.str("batch loaded"), py.int(2), py.int(2)), { show: "the last record from ingest(lines, log)" }),
            expr("all-good", "a batch with no bad lines", lines(records("chk.ingest4", "_out = ingest(['1', '', '{\"a\": 2}'], _l)"), "result = (_out, [(_r.getMessage(), getattr(_r, 'rejected', None)) for _r in _recs])"), py.tuple(pv([1, { a: 2 }]), pv([py.tuple(py.str("batch loaded"), py.int(0))])), { hidden: true }),
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
import logging
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({"level": record.levelname, "message": record.getMessage(), "repo": getattr(record, "repo", None)})

log = logging.getLogger("q1")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.setLevel(logging.WARNING)
log.propagate = False

log.info("star counted", extra={"repo": "tidewater/easystore"})
log.error("push failed", extra={"repo": "nimbus-io/cloudplot"})
log.warning("slow request")
`,
        choices: [
          "{\"level\": \"ERROR\", \"message\": \"push failed\", \"repo\": \"nimbus-io/cloudplot\"}\n{\"level\": \"WARNING\", \"message\": \"slow request\", \"repo\": null}",
          "{\"level\": \"INFO\", \"message\": \"star counted\", \"repo\": \"tidewater/easystore\"}\n{\"level\": \"ERROR\", \"message\": \"push failed\", \"repo\": \"nimbus-io/cloudplot\"}\n{\"level\": \"WARNING\", \"message\": \"slow request\", \"repo\": null}",
          "{\"level\": \"ERROR\", \"message\": \"push failed\", \"repo\": \"nimbus-io/cloudplot\"}\n{\"level\": \"WARNING\", \"message\": \"slow request\", \"repo\": None}",
          "{\"level\": \"ERROR\", \"message\": \"push failed\", \"repo\": \"nimbus-io/cloudplot\"}",
        ],
        answer: 0,
        why: "The logger's level is WARNING, so the INFO record is dropped. The last record has no `repo`, so `getattr` gives `None`, which JSON writes as `null`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: building the JSON by hand. A rejected line's reason contains a double quote. What happens when the log line is read back?",
        program: src`
import json

def to_json(level, reason):
    return '{"level": "' + level + '", "reason": "' + reason + '"}'

line = to_json("WARNING", 'Expecting "," delimiter')
try:
    print(json.loads(line))
except json.JSONDecodeError:
    print("unreadable log line")
`,
        choices: ["unreadable log line", "{'level': 'WARNING', 'reason': 'Expecting \",\" delimiter'}", "{'level': 'WARNING', 'reason': 'Expecting '}", "KeyError"],
        answer: 0,
        why: "The quote inside the reason ends the JSON string early, so the line isn't valid JSON. `json.dumps` escapes it (`\\\"`), which is why the formatter builds a dictionary and dumps it.",
      },
      {
        id: "q3",
        prompt: "Which log call follows structured-logging practice?",
        choices: [
          "`log.warning(\"line rejected\", extra={\"file\": name, \"line\": n})`",
          "`log.warning(f\"line {n} of {name} was rejected\")`",
          "`print(\"WARNING line rejected\", name, n)`",
          "`log.warning(\"line rejected \" + name + \" \" + str(n))`",
        ],
        answer: 0,
        why: "A fixed message plus named fields can be filtered and counted by any tool. Details baked into the text have to be dug out again with patterns.",
      },
    ],
    review: [
      "Structured logs: a fixed message plus named fields, one JSON object per line.",
      "A `logging.Formatter` subclass decides the line's shape; `extra=` adds fields (not named like record attributes).",
      "Put an exception's type in its own field, and read logs back with `json.loads` to answer questions.",
      "Next: logs record events one by one. Metrics summarise them: counts, rates and percentiles.",
    ],
  },
  // ------------------------------------------------------------------ PY-L48-02 metrics
  {
    id: "PY-L48-02",
    version: 2,
    slug: "count-and-time",
    title: "Count and time what the program does",
    lede: "Logs answer \"what happened to this request?\". Metrics answer \"how is the whole system doing?\": how many requests, how many failed, how long they took. Durations are summarised with percentiles, because an average hides the slow requests users actually notice.",
    focus: "Record counters and durations from a clock, and summarise durations as count, mean and percentiles (p50, p95) instead of an average alone.",
    minutes: 22,
    objectives: [
      "Count outcomes with counters and measure durations with a monotonic clock passed in as a function",
      "Compute a nearest-rank percentile and explain why p95 tells you more than the mean",
      "Group measurements per operation or endpoint and report them",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "conversion", "counter-call", "defaultdict-call", "dict-get", "dict-literal", "dict-lookup", "dict-update", "except-type", "finally-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "init-method", "iter-method", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "np-reduce", "plain-class", "precedence", "print-call", "print-several", "print-text", "reassignment", "self-name", "star-args", "string-index", "top-level-indent", "truthiness", "try-except", "unquoted-name"],
    teaches: ["metric-count"],
    blocks: [
      {
        kind: "text",
        md: "A **metric** is a number measured over time: requests served, errors, items in a queue, how long each call took. Two kinds cover most needs. A **counter** only goes up (requests, errors, rejected lines). A **distribution** collects measurements (durations, sizes) and is summarised.\n\nThe summary matters. Response times are skewed: most requests are fast and a few are very slow. The **mean** mixes them into a number that describes nobody. A **percentile** says *p% of measurements were at or below this*: p50 (the median) is the typical case, p95 is what the slowest one in twenty users waits. The simplest definition is **nearest rank**: sort the values, and p is the value at position `ceil(p / 100 × n)` (counting from 1).\n\nDurations come from a clock. `time.perf_counter()` is monotonic (it never jumps when the wall clock is corrected), so subtracting two readings gives an elapsed time. Passing the clock in as a function (the Advanced OOP & Design module's dependency injection) lets tests and these examples use exact, repeatable times.",
      },
      {
        kind: "example",
        title: "Why p95, not just the mean",
        code: src`
import math
import statistics

def percentile(values, p):
    ordered = sorted(values)
    rank = math.ceil(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]

api_ms = [112, 98, 105, 120, 101, 97, 110, 2350, 103, 99, 108, 115, 102, 96, 104, 1890, 107, 100, 111, 109]

print("requests", len(api_ms))
print("mean", statistics.mean(api_ms))
print("p50", percentile(api_ms, 50), "p95", percentile(api_ms, 95), "max", max(api_ms))
`,
        output: "requests 20\nmean 306.85\np50 105 p95 1890 max 2350\n",
        note: "No request took about 300 ms: eighteen took around 100 and two took about two seconds. The mean describes none of them. p50 says the typical request is fast; p95 says one user in twenty waits almost two seconds, which is the number to fix.",
      },
      {
        kind: "text",
        md: "Summaries need data. With no measurements at all, a mean doesn't exist, and `statistics` says so instead of returning 0:",
      },
      {
        kind: "error-example",
        title: "The mean of nothing",
        code: src`
import statistics

timings = []
print(statistics.mean(timings))
`,
        error: "StatisticsError",
        output: "",
        note: "`statistics.StatisticsError: mean requires at least one data point`. A report must handle an operation that never ran, for example by reporting a count of 0 and no percentiles.",
      },
      {
        kind: "text",
        md: "In a program, metrics live in one small object: counters in a `Counter`, measurements in lists per name, and a helper that times a call with the injected clock. A `try`/`finally` records the duration even when the call fails, because slow failures are exactly what you want to see.",
      },
      {
        kind: "example",
        title: "A metrics object with a timer",
        code: src`
import json
import time
from collections import Counter, defaultdict

class Metrics:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.counts = Counter()
        self.timings = defaultdict(list)

    def inc(self, name):
        self.counts[name] += 1

    def timed(self, name, func, *args):
        start = self.clock()
        try:
            return func(*args)
        finally:
            self.timings[name].append(self.clock() - start)

readings = iter([0.0, 0.25, 1.0, 1.5, 2.0, 2.75])
metrics = Metrics(clock=readings.__next__)

for text in ['{"type": "PushEvent"}', '{"type": "WatchEv', '{"type": "ForkEvent"}']:
    try:
        metrics.timed("parse", json.loads, text)
        metrics.inc("parsed")
    except json.JSONDecodeError:
        metrics.inc("rejected")

print(dict(metrics.counts))
print(metrics.timings["parse"])
`,
        output: "{'parsed': 2, 'rejected': 1}\n[0.25, 0.5, 0.75]\n",
        note: "The fake clock returns the next reading on each call, so the three durations are exact. The failed parse still got its 0.5 seconds stored by `finally`. In production the default clock, `time.perf_counter`, is used.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every operation whose speed or failure rate matters: requests, queries, pipeline steps. **Mistakes to avoid:** reporting only the mean; `time.time()` for durations (it can jump); timing only successful calls; and sorting the caller's list in place to compute a percentile, which reorders their data.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Round the rank up",
      prompt: "`percentile` uses `int(...)`, which rounds the rank down, so whenever `p / 100 × n` isn't a whole number it picks a value one position too low. Use `math.ceil` for the nearest rank.",
      spec: [
        ["Function", "`percentile(values, p)` for `p` from 1 to 100"],
        ["Returns", "the value at rank `ceil(p / 100 × n)` (from 1) of the sorted values"],
      ],
      starter: src`
import math

def percentile(values, p):
    ordered = sorted(values)
    rank = int(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]

print(percentile([120, 98, 105, 2350, 101, 97, 110], 90))
`,
      answer: src`
import math

def percentile(values, p):
    ordered = sorted(values)
    rank = math.ceil(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]

print(percentile([120, 98, 105, 2350, 101, 97, 110], 90))
`,
      wrong: [
        {
          code: src`
import math

def percentile(values, p):
    ordered = sorted(values)
    rank = round(p / 100 * len(ordered))
    return ordered[max(rank, 1) - 1]
`,
          fails: ["returns"],
          why: "`round` goes down for fractions below .5, so 90% of 7 values (6.3) picks the 6th instead of the 7th",
        },
      ],
      hints: ["Nearest rank always rounds the position up.", "`math` is already imported.", "Replace `int(...)` with the function that rounds up."],
      task: {
        checks: [
          fn("returns", "percentile", [
            example([[120, 98, 105, 2350, 101, 97, 110], 90], 2350),
            hiddenCase("the median of an even count", [[4, 1, 3, 2], 50], 2),
            hiddenCase("p95 of twenty values", [[96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 107, 108, 109, 110, 111, 112, 115, 120, 1890, 2350], 95], 1890),
          ], { label: "percentile() uses the nearest rank" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Summarise request latencies",
        prompt: "Write `latency_summary(samples)` for a dashboard: given request durations in milliseconds, return `{\"count\", \"mean\", \"p50\", \"p95\", \"max\"}` using nearest-rank percentiles. With no samples, return `{\"count\": 0}` and nothing else. Don't reorder the caller's list.",
        spec: [
          ["Function", "`latency_summary(samples)`; `samples` is a list of numbers"],
          ["Returns", "`{\"count\": n, \"mean\": m, \"p50\": a, \"p95\": b, \"max\": c}`; `{\"count\": 0}` for an empty list"],
          ["Percentile", "nearest rank: the value at position `ceil(p / 100 × n)` of the sorted samples"],
          ["Example", "`[120, 80, 100]` → `{'count': 3, 'mean': 100, 'p50': 100, 'p95': 120, 'max': 120}` (the mean may be a float)"],
        ],
        starter: src`
import math

def latency_summary(samples):
    return {"count": len(samples)}

print(latency_summary([120, 80, 100]))
`,
        answer: src`
import math

def latency_summary(samples):
    if not samples:
        return {"count": 0}
    ordered = sorted(samples)
    n = len(ordered)

    def nearest(p):
        return ordered[max(math.ceil(p / 100 * n), 1) - 1]

    return {
        "count": n,
        "mean": sum(ordered) / n,
        "p50": nearest(50),
        "p95": nearest(95),
        "max": ordered[-1],
    }

print(latency_summary([120, 80, 100]))
`,
        alternatives: [
          src`
import math
import statistics

def latency_summary(samples):
    summary = {"count": len(samples)}
    if samples:
        ordered = sorted(samples)
        def pick(p):
            return ordered[math.ceil(p * len(ordered) / 100) - 1]
        summary.update(mean=statistics.fmean(ordered), p50=pick(50), p95=pick(95), max=max(ordered))
    return summary
`,
        ],
        wrong: [
          {
            code: src`
import math

def latency_summary(samples):
    if not samples:
        return {"count": 0}
    samples.sort()
    n = len(samples)
    return {
        "count": n,
        "mean": sum(samples) / n,
        "p50": samples[math.ceil(n / 2) - 1],
        "p95": samples[math.ceil(0.95 * n) - 1],
        "max": samples[-1],
    }
`,
            fails: ["keeps-input"],
            why: "`samples.sort()` reorders the caller's list, which the dashboard also uses in time order",
          },
          {
            code: src`
def latency_summary(samples):
    if not samples:
        return {"count": 0}
    ordered = sorted(samples)
    n = len(ordered)
    return {"count": n, "mean": sum(ordered) / n, "p50": ordered[n // 2], "p95": ordered[int(0.95 * n)], "max": ordered[-1]}
`,
            fails: ["returns"],
            why: "indexing with `n // 2` and `int(0.95 * n)` is one position too high for even counts, and past the end for a single sample",
          },
          {
            code: src`
import math
import statistics

def latency_summary(samples):
    ordered = sorted(samples)
    n = len(ordered)
    return {"count": n, "mean": statistics.mean(ordered), "p50": ordered[math.ceil(n / 2) - 1], "p95": ordered[math.ceil(0.95 * n) - 1], "max": ordered[-1]}
`,
            fails: ["empty"],
            why: "an empty list raises `StatisticsError` instead of reporting a count of 0",
          },
        ],
        hints: [
          "Handle the empty list first; then sort a copy (`sorted`), never the caller's list.",
          "Write one small helper for the nearest rank so p50 and p95 use the same rule.",
          "The rank is a position counted from 1, so subtract 1 before indexing.",
        ],
        task: {
          checks: [
            fn("returns", "latency_summary", [
              example([[120, 80, 100]], { count: 3, mean: 100, p50: 100, p95: 120, max: 120 }),
              example([[112, 98, 105, 120, 101, 97, 110, 2350, 103, 99, 108, 115, 102, 96, 104, 1890, 107, 100, 111, 109]], { count: 20, mean: 306.85, p50: 105, p95: 1890, max: 2350 }),
              example([[40]], { count: 1, mean: 40, p50: 40, p95: 40, max: 40 }),
              hiddenCase("an even number of samples", [[10, 40, 20, 30]], { count: 4, mean: 25, p50: 20, p95: 40, max: 40 }),
              hiddenCase("repeated values", [[5, 5, 5, 9]], { count: 4, mean: 6, p50: 5, p95: 9, max: 9 }),
            ], { label: "latency_summary() reports count, mean, p50, p95 and max", compare: { numbers: "int-float-equal" } }),
            fn("empty", "latency_summary", [hiddenCase("no samples", [[]], { count: 0 })], { label: "no samples gives just a count of 0" }),
            fn("keeps-input", "latency_summary", [keepsInput([[300, 100, 200]], { label: "samples in time order" })], { label: "latency_summary() doesn't reorder the samples" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Errors and slow requests per endpoint",
        prompt: "The API's request log gives one dictionary per request: `endpoint`, `status` and `ms`. Write `endpoint_report(requests)`: for each endpoint, return the number of requests, the number of server errors (status 500 or above), the error rate (errors ÷ requests) and the nearest-rank p95 of `ms`. Endpoints appear as keys in alphabetical order.",
        spec: [
          ["Function", "`endpoint_report(requests)`"],
          ["Returns", "`{endpoint: {\"requests\": n, \"errors\": e, \"error_rate\": e / n, \"p95\": ms}}`, endpoints sorted"],
          ["Errors", "status ≥ 500 only; a 404 is the client's mistake, not an error of the service"],
          ["Example", "the starter's log → `{'/orders': {'requests': 3, 'errors': 1, 'error_rate': 0.333…, 'p95': 2100}, '/products': {...}}`"],
        ],
        starter: src`
import math

def endpoint_report(requests):
    return {}

log = [
    {"endpoint": "/products", "status": 200, "ms": 95},
    {"endpoint": "/orders", "status": 200, "ms": 140},
    {"endpoint": "/orders", "status": 503, "ms": 2100},
    {"endpoint": "/products", "status": 404, "ms": 30},
    {"endpoint": "/orders", "status": 201, "ms": 180},
]
print(endpoint_report(log))
`,
        answer: src`
import math

def endpoint_report(requests):
    timings = {}
    errors = {}
    for request in requests:
        endpoint = request["endpoint"]
        timings.setdefault(endpoint, []).append(request["ms"])
        errors[endpoint] = errors.get(endpoint, 0) + (1 if request["status"] >= 500 else 0)
    report = {}
    for endpoint in sorted(timings):
        ordered = sorted(timings[endpoint])
        n = len(ordered)
        report[endpoint] = {
            "requests": n,
            "errors": errors[endpoint],
            "error_rate": errors[endpoint] / n,
            "p95": ordered[math.ceil(0.95 * n) - 1],
        }
    return report

log = [
    {"endpoint": "/products", "status": 200, "ms": 95},
    {"endpoint": "/orders", "status": 200, "ms": 140},
    {"endpoint": "/orders", "status": 503, "ms": 2100},
    {"endpoint": "/products", "status": 404, "ms": 30},
    {"endpoint": "/orders", "status": 201, "ms": 180},
]
print(endpoint_report(log))
`,
        alternatives: [
          src`
import math
from collections import defaultdict

def endpoint_report(requests):
    groups = defaultdict(list)
    for r in requests:
        groups[r["endpoint"]].append(r)
    out = {}
    for name in sorted(groups):
        rows = groups[name]
        ms = sorted(r["ms"] for r in rows)
        bad = sum(1 for r in rows if r["status"] >= 500)
        out[name] = {"requests": len(rows), "errors": bad, "error_rate": bad / len(rows), "p95": ms[math.ceil(len(ms) * 95 / 100) - 1]}
    return out
`,
        ],
        wrong: [
          {
            code: src`
import math

def endpoint_report(requests):
    report = {}
    for endpoint in sorted({r["endpoint"] for r in requests}):
        rows = [r for r in requests if r["endpoint"] == endpoint]
        ms = sorted(r["ms"] for r in rows)
        errors = sum(1 for r in rows if r["status"] >= 400)
        report[endpoint] = {"requests": len(rows), "errors": errors, "error_rate": errors / len(rows), "p95": ms[math.ceil(0.95 * len(ms)) - 1]}
    return report
`,
            fails: ["returns"],
            why: "a 404 is counted as a service error",
          },
          {
            code: src`
def endpoint_report(requests):
    report = {}
    for endpoint in sorted({r["endpoint"] for r in requests}):
        rows = [r for r in requests if r["endpoint"] == endpoint]
        errors = sum(1 for r in rows if r["status"] >= 500)
        report[endpoint] = {"requests": len(rows), "errors": errors, "error_rate": errors / len(rows), "p95": sum(r["ms"] for r in rows) / len(rows)}
    return report
`,
            fails: ["returns"],
            why: "the mean is reported as p95, which hides the slow request",
          },
        ],
        hints: [
          "First group the requests by endpoint (durations in a list, errors counted).",
          "Then build the report with the endpoints sorted, computing each one's rate and nearest-rank p95.",
          "Only statuses of 500 and above are errors of the service.",
        ],
        task: {
          checks: [
            fn("returns", "endpoint_report", [
              example([[{ endpoint: "/products", status: 200, ms: 95 }, { endpoint: "/orders", status: 200, ms: 140 }, { endpoint: "/orders", status: 503, ms: 2100 }, { endpoint: "/products", status: 404, ms: 30 }, { endpoint: "/orders", status: 201, ms: 180 }]], { "/orders": { requests: 3, errors: 1, error_rate: 1 / 3, p95: 2100 }, "/products": { requests: 2, errors: 0, error_rate: py.float(0), p95: 95 } }),
              example([[{ endpoint: "/health", status: 200, ms: 3 }]], { "/health": { requests: 1, errors: 0, error_rate: py.float(0), p95: 3 } }),
              example([[]], {}),
              hiddenCase("an endpoint that always fails", [[{ endpoint: "/pay", status: 502, ms: 900 }, { endpoint: "/pay", status: 500, ms: 30 }]], { "/pay": { requests: 2, errors: 2, error_rate: py.float(1), p95: 900 } }),
              hiddenCase("twenty requests with one slow outlier", [[...Array.from({ length: 19 }, (_, i) => ({ endpoint: "/search", status: 200, ms: 50 + i })), { endpoint: "/search", status: 200, ms: 4000 }]], { "/search": { requests: 20, errors: 0, error_rate: py.float(0), p95: 68 } }),
            ], { label: "endpoint_report() reports requests, errors, rate and p95 per endpoint" }),
            fn("keeps-input", "endpoint_report", [keepsInput([[{ endpoint: "/b", status: 200, ms: 9 }, { endpoint: "/a", status: 500, ms: 1 }]], { label: "a request log" })], { label: "endpoint_report() leaves the log unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import math

def percentile(values, p):
    ordered = sorted(values)
    return ordered[max(math.ceil(p / 100 * len(ordered)), 1) - 1]

ms = [30, 10, 20, 1000, 40]
print(sum(ms) / len(ms), percentile(ms, 50), percentile(ms, 80), percentile(ms, 100))
`,
        choices: ["220.0 30 40 1000", "220.0 20 40 1000", "220 30 1000 1000", "220.0 30 30 1000"],
        answer: 0,
        why: "Sorted: 10, 20, 30, 40, 1000. p50 is rank ceil(2.5) = 3 → 30; p80 is rank 4 → 40; p100 is the maximum. The mean, 220.0, is larger than four of the five values.",
      },
      {
        id: "q2",
        prompt: "A common mistake: timing only the calls that succeed. What does this print?",
        program: src`
readings = iter([0.0, 0.1, 1.0, 4.0, 5.0, 5.2])
durations = []

def timed(func, text):
    start = readings.__next__()
    result = func(text)
    durations.append(readings.__next__() - start)
    return result

for text in ["12", "slow-and-bad", "7"]:
    try:
        timed(int, text)
    except ValueError:
        readings.__next__()
print(durations)
`,
        choices: ["[0.1, 0.20000000000000018]", "[0.1, 3.0, 0.20000000000000018]", "[0.1, 0.2]", "[0.1, 3.0]"],
        answer: 0,
        why: "The failing call raised before its duration was stored, so the 3-second failure vanishes from the metrics. A `try`/`finally` records it too. (And 5.2 − 5.0 isn't exactly 0.2 in floating point.)",
      },
      {
        id: "q3",
        prompt: "Which of these should be a counter rather than a distribution?",
        choices: [
          "The number of lines rejected by ingestion",
          "How long each database query took",
          "The size in bytes of each uploaded file",
          "How many items each order contained",
        ],
        answer: 0,
        why: "A counter only goes up by one event at a time. The other three are measurements per event, summarised with count, percentiles and max.",
      },
    ],
    review: [
      "Counters count events; distributions collect measurements and are summarised.",
      "Report count, p50, p95 and max: the mean hides the slow tail. Nearest rank: position `ceil(p/100 × n)` of the sorted values.",
      "Measure with a monotonic clock passed in as a function, and record durations of failures too.",
      "Next: one request crosses many steps. Tracing follows it with a trace id and spans.",
    ],
  },
  // ------------------------------------------------------------------ PY-L48-03 tracing
  {
    id: "PY-L48-03",
    version: 2,
    slug: "trace-a-request",
    title: "Follow one request with a trace",
    lede: "A slow or failed request passes through many steps: checking the user, querying the database, rendering. Tracing gives the request one trace id and records each step as a span with its parent and duration, so you can see where the time went and where it broke.",
    focus: "Record spans (id, parent, name, duration, error) under one trace id, nest them with a context manager, and carry the trace id into every log record.",
    minutes: 24,
    objectives: [
      "Explain traces and spans: one trace id per request, one span per step, each span pointing at its parent",
      "Record nested spans with a context manager that measures time with an injected clock and notes errors",
      "Carry the current trace id into log records with a `contextvars.ContextVar` and a logging filter",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conditional-expr", "context-dec", "conversion", "decorator-at", "defaultdict-call", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "exc-name", "except-type", "filter-call", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "iter-method", "lambda", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "nested-loop", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "sort-key", "spaces-in-text", "string-format", "string-index", "subclass", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "unquoted-name", "while-loop", "with-statement", "yield-expr"],
    teaches: ["trace-span"],
    blocks: [
      {
        kind: "text",
        md: "Metrics tell you that p95 latency doubled; logs tell you about individual events. Neither tells you *which step of which request* was slow. **Tracing** does. Each incoming request gets a **trace id**. Every step it goes through (authentication, a database query, a call to another service) is a **span**: a name, its own id, the id of the span it ran inside (its **parent**), a start and a duration, and an error if it failed. The spans of one trace form a tree, and the slow branch stands out.\n\nIn real systems the ids are random (`secrets.token_hex(8)`, the Secure Python module) and spans are sent to a tracing service. The idea fits in a few lines of Python: a context manager (see Decorators & Context Managers) opens a span, a stack remembers which span is open so the next one knows its parent, and `finally` records the duration even when the step fails.",
      },
      {
        kind: "example",
        title: "Spans for one request",
        code: src`
from contextlib import contextmanager

class Tracer:
    def __init__(self, clock):
        self.clock = clock
        self.finished = []
        self.open = []
        self.count = 0

    @contextmanager
    def span(self, trace_id, name):
        self.count += 1
        record = {"trace": trace_id, "span": f"s{self.count}", "name": name,
                  "parent": self.open[-1]["span"] if self.open else None, "error": None}
        start = self.clock()
        self.open.append(record)
        try:
            yield record
        except Exception as err:
            record["error"] = type(err).__name__
            raise
        finally:
            self.open.pop()
            record["ms"] = round((self.clock() - start) * 1000)
            self.finished.append(record)

readings = iter([0.000, 0.002, 0.010, 0.011, 0.241, 0.242, 0.250, 0.252])
tracer = Tracer(clock=readings.__next__)

with tracer.span("t-7f3a", "GET /repos/lumen-labs/pyauth/stars"):
    with tracer.span("t-7f3a", "check token"):
        pass
    with tracer.span("t-7f3a", "query stars"):
        pass
    with tracer.span("t-7f3a", "render json"):
        pass

for s in tracer.finished:
    print(s["span"], "parent", s["parent"], s["name"], s["ms"], "ms")
`,
        output: "s2 parent s1 check token 8 ms\ns3 parent s1 query stars 230 ms\ns4 parent s1 render json 8 ms\ns1 parent None GET /repos/lumen-labs/pyauth/stars 252 ms\n",
        note: "The request span `s1` is open while the three steps run, so each of them records `s1` as its parent. Spans are finished innermost first. The tree shows at once that the database query took 230 of the 252 ms.",
      },
      {
        kind: "text",
        md: "Spans explain the timing; logs explain the details. Joining them needs the trace id on every log record, but passing it as a parameter through every function is impractical. A **`contextvars.ContextVar`** holds a value for the current request: `set` it when the request starts, `reset` it when it ends, and a **logging filter** copies it onto every record. Reading a context variable that was never set, and has no default, is an error:",
      },
      {
        kind: "error-example",
        title: "A context variable with no value",
        code: src`
import contextvars

current_trace = contextvars.ContextVar("current_trace")
print(current_trace.get())
`,
        error: "LookupError",
        output: "",
        note: "`LookupError: <ContextVar name='current_trace' at 0x…>`. Give it a default (`ContextVar(\"current_trace\", default=\"-\")`) so log lines outside any request still work.",
      },
      {
        kind: "example",
        title: "Every log record carries the trace id",
        code: src`
import contextvars
import logging
import sys

current_trace = contextvars.ContextVar("current_trace", default="-")

class TraceFilter(logging.Filter):
    def filter(self, record):
        record.trace_id = current_trace.get()
        return True

log = logging.getLogger("api")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(trace_id)s %(levelname)s %(message)s"))
handler.addFilter(TraceFilter())
log.addHandler(handler)
log.setLevel(logging.INFO)
log.propagate = False

def load_stars(repo):
    log.info("querying stars for %s", repo)
    return 2

def handle(trace_id, repo):
    token = current_trace.set(trace_id)
    try:
        log.info("request started")
        stars = load_stars(repo)
        log.info("responded with %d stars", stars)
    finally:
        current_trace.reset(token)

handle("t-7f3a", "lumen-labs/pyauth")
handle("t-91c0", "tidewater/easystore")
log.info("worker idle")
`,
        output: "t-7f3a INFO request started\nt-7f3a INFO querying stars for lumen-labs/pyauth\nt-7f3a INFO responded with 2 stars\nt-91c0 INFO request started\nt-91c0 INFO querying stars for tidewater/easystore\nt-91c0 INFO responded with 2 stars\n- INFO worker idle\n",
        note: "`load_stars` knows nothing about traces, yet its log line has the right id. `reset` in `finally` restores the previous value, so the idle message outside any request shows the default `-` instead of the last request's id.",
      },
      {
        kind: "text",
        md: "**When to use it:** anywhere one user action passes through several steps or services, which is most web and pipeline work. **Mistakes to avoid:** spans that record only successful steps (time and errors go in `finally`/`except`); forgetting `reset`, so a trace id leaks into the next request's logs; and ids that aren't unique (a counter per process is fine for a demo, not across servers).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Record each span's parent",
      prompt: "`Tracer.span` sets every span's parent to `None`, so the tree is flat. Set it to the id of the span that is open when this one starts (the last one on `self.open`), or `None` when no span is open.",
      spec: [
        ["Method", "`Tracer.span(name)`, a context manager"],
        ["Records", "`{\"span\": id, \"parent\": id or None, \"name\": name}` in `self.finished`"],
      ],
      starter: src`
from contextlib import contextmanager

class Tracer:
    def __init__(self):
        self.finished = []
        self.open = []
        self.count = 0

    @contextmanager
    def span(self, name):
        self.count += 1
        record = {"span": f"s{self.count}", "parent": None, "name": name}
        self.open.append(record)
        try:
            yield record
        finally:
            self.open.pop()
            self.finished.append(record)

tracer = Tracer()
with tracer.span("load hour"):
    with tracer.span("parse"):
        pass
print(tracer.finished)
`,
      answer: src`
from contextlib import contextmanager

class Tracer:
    def __init__(self):
        self.finished = []
        self.open = []
        self.count = 0

    @contextmanager
    def span(self, name):
        self.count += 1
        parent = self.open[-1]["span"] if self.open else None
        record = {"span": f"s{self.count}", "parent": parent, "name": name}
        self.open.append(record)
        try:
            yield record
        finally:
            self.open.pop()
            self.finished.append(record)

tracer = Tracer()
with tracer.span("load hour"):
    with tracer.span("parse"):
        pass
print(tracer.finished)
`,
      wrong: [
        {
          code: src`
from contextlib import contextmanager

class Tracer:
    def __init__(self):
        self.finished = []
        self.open = []
        self.count = 0

    @contextmanager
    def span(self, name):
        self.count += 1
        parent = self.finished[-1]["span"] if self.finished else None
        record = {"span": f"s{self.count}", "parent": parent, "name": name}
        self.open.append(record)
        try:
            yield record
        finally:
            self.open.pop()
            self.finished.append(record)
`,
          fails: ["returns"],
          why: "the last *finished* span is a sibling, not the span this one runs inside",
        },
      ],
      hints: ["`self.open` is a stack of the spans that have started and not yet finished.", "The parent is whatever span is on top of that stack when this one starts.", "Read the parent before appending the new record to the stack."],
      task: {
        checks: [
          expr("returns", "nested spans record their parents", lines(
            "_t = Tracer()",
            "with _t.span('load hour'):",
            "    with _t.span('parse'):",
            "        pass",
            "    with _t.span('load'):",
            "        with _t.span('insert'):",
            "            pass",
            "result = [(_s['span'], _s['parent'], _s['name']) for _s in _t.finished]",
          ), [py.tuple(py.str("s2"), py.str("s1"), py.str("parse")), py.tuple(py.str("s4"), py.str("s3"), py.str("insert")), py.tuple(py.str("s3"), py.str("s1"), py.str("load")), py.tuple(py.str("s1"), py.none, py.str("load hour"))], { show: "spans for load hour → parse, load → insert" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Draw the span tree",
        prompt: "A tracing backend stores finished spans as a flat list. Write `span_tree(spans)`: return the lines of an indented tree, one per span, each written as two spaces per level of depth followed by `<name> (<ms> ms)`. Roots (parent `None`) come first, then each span's children directly under it; spans with the same parent are ordered by `start`.",
        spec: [
          ["Function", "`span_tree(spans)`"],
          ["spans", "a list of dictionaries with `span`, `parent` (an id or `None`), `name`, `start` and `ms`, in any order"],
          ["Returns", "a list of strings like `\"  query stars (230 ms)\"`; an empty list for no spans"],
          ["Order", "depth-first: a span, then its children (by `start`), then its next sibling; several roots are ordered by `start` too"],
        ],
        starter: src`
def span_tree(spans):
    return []

spans = [
    {"span": "s3", "parent": "s1", "name": "query stars", "start": 11, "ms": 230},
    {"span": "s1", "parent": None, "name": "GET /repos/lumen-labs/pyauth/stars", "start": 0, "ms": 252},
    {"span": "s4", "parent": "s1", "name": "render json", "start": 242, "ms": 8},
    {"span": "s2", "parent": "s1", "name": "check token", "start": 2, "ms": 8},
    {"span": "s5", "parent": "s3", "name": "sqlite execute", "start": 12, "ms": 225},
]
for line in span_tree(spans):
    print(line)
`,
        answer: src`
def span_tree(spans):
    children = {}
    for span in spans:
        children.setdefault(span["parent"], []).append(span)
    for group in children.values():
        group.sort(key=lambda s: s["start"])
    lines = []
    pending = [(span, 0) for span in reversed(children.get(None, []))]
    while pending:
        span, depth = pending.pop()
        lines.append("  " * depth + f"{span['name']} ({span['ms']} ms)")
        for child in reversed(children.get(span["span"], [])):
            pending.append((child, depth + 1))
    return lines

spans = [
    {"span": "s3", "parent": "s1", "name": "query stars", "start": 11, "ms": 230},
    {"span": "s1", "parent": None, "name": "GET /repos/lumen-labs/pyauth/stars", "start": 0, "ms": 252},
    {"span": "s4", "parent": "s1", "name": "render json", "start": 242, "ms": 8},
    {"span": "s2", "parent": "s1", "name": "check token", "start": 2, "ms": 8},
    {"span": "s5", "parent": "s3", "name": "sqlite execute", "start": 12, "ms": 225},
]
for line in span_tree(spans):
    print(line)
`,
        alternatives: [
          src`
def span_tree(spans):
    by_start = sorted(spans, key=lambda s: s["start"])
    out = []

    def walk(parent, depth):
        for span in by_start:
            if span["parent"] == parent:
                out.append("  " * depth + span["name"] + " (" + str(span["ms"]) + " ms)")
                walk(span["span"], depth + 1)

    walk(None, 0)
    return out
`,
        ],
        wrong: [
          {
            code: src`
def span_tree(spans):
    depth = {}
    lines = []
    for span in sorted(spans, key=lambda s: s["start"]):
        level = 0 if span["parent"] is None else depth[span["parent"]] + 1
        depth[span["span"]] = level
        lines.append("  " * level + f"{span['name']} ({span['ms']} ms)")
    return lines
`,
            fails: ["siblings"],
            why: "ordering every span by start interleaves branches: a child that starts late appears under the wrong sibling's subtree",
          },
          {
            code: src`
def span_tree(spans):
    lines = []
    for span in spans:
        level = 0 if span["parent"] is None else 1
        lines.append("  " * level + f"{span['name']} ({span['ms']} ms)")
    return lines
`,
            fails: ["returns", "siblings", "roots"],
            why: "it keeps the input order and only knows two depths",
          },
        ],
        hints: [
          "Group the spans by parent first: a dictionary from parent id to its children, each list sorted by start.",
          "Then walk from the roots (parent `None`), writing a span and then its children one level deeper.",
          "A stack of (span, depth) pairs, or a small function that calls itself for the children, both give depth-first order.",
        ],
        task: {
          checks: [
            fn("returns", "span_tree", [
              example([[
                { span: "s3", parent: "s1", name: "query stars", start: 11, ms: 230 },
                { span: "s1", parent: null, name: "GET /repos/lumen-labs/pyauth/stars", start: 0, ms: 252 },
                { span: "s4", parent: "s1", name: "render json", start: 242, ms: 8 },
                { span: "s2", parent: "s1", name: "check token", start: 2, ms: 8 },
                { span: "s5", parent: "s3", name: "sqlite execute", start: 12, ms: 225 },
              ]], ["GET /repos/lumen-labs/pyauth/stars (252 ms)", "  check token (8 ms)", "  query stars (230 ms)", "    sqlite execute (225 ms)", "  render json (8 ms)"]),
              example([[{ span: "a", parent: null, name: "nightly backfill", start: 0, ms: 9000 }]], ["nightly backfill (9000 ms)"]),
              example([[]], []),
              hiddenCase("a deep chain", [[{ span: "c", parent: "b", name: "c", start: 2, ms: 1 }, { span: "a", parent: null, name: "a", start: 0, ms: 3 }, { span: "b", parent: "a", name: "b", start: 1, ms: 2 }]], ["a (3 ms)", "  b (2 ms)", "    c (1 ms)"]),
            ], { label: "span_tree() writes the spans as an indented tree" }),
            fn("siblings", "span_tree", [hiddenCase("a child that starts after its parent's next sibling began", [[{ span: "r", parent: null, name: "root", start: 0, ms: 50 }, { span: "x", parent: "r", name: "first", start: 1, ms: 40 }, { span: "y", parent: "r", name: "second", start: 5, ms: 3 }, { span: "z", parent: "x", name: "first-child", start: 9, ms: 30 }]], ["root (50 ms)", "  first (40 ms)", "    first-child (30 ms)", "  second (3 ms)"])], { label: "each span's children come directly under it" }),
            fn("roots", "span_tree", [hiddenCase("two traces' roots out of order", [[{ span: "q", parent: null, name: "later request", start: 30, ms: 4 }, { span: "p", parent: null, name: "early request", start: 10, ms: 2 }]], ["early request (2 ms)", "later request (4 ms)"])], { label: "several roots are ordered by start" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Which step really took the time?",
        prompt: "A span's duration includes its children, so the request span is always the longest. What you want to fix is the step whose **own** time (its `ms` minus the `ms` of its direct children) is largest. Write `self_times(spans)`: return `(name, self_ms)` pairs for every span, largest self time first, ties by name.",
        spec: [
          ["Function", "`self_times(spans)`"],
          ["spans", "dictionaries with `span`, `parent`, `name` and `ms`, in any order"],
          ["Self time", "the span's `ms` minus the sum of its direct children's `ms`"],
          ["Returns", "a list of `(name, self_ms)` tuples, sorted by self time (largest first), then by name"],
        ],
        starter: src`
def self_times(spans):
    return []

spans = [
    {"span": "s1", "parent": None, "name": "GET /stars", "ms": 252},
    {"span": "s2", "parent": "s1", "name": "check token", "ms": 8},
    {"span": "s3", "parent": "s1", "name": "query stars", "ms": 230},
    {"span": "s4", "parent": "s3", "name": "sqlite execute", "ms": 225},
    {"span": "s5", "parent": "s1", "name": "render json", "ms": 8},
]
print(self_times(spans))
`,
        answer: src`
def self_times(spans):
    child_total = {}
    for span in spans:
        if span["parent"] is not None:
            child_total[span["parent"]] = child_total.get(span["parent"], 0) + span["ms"]
    pairs = [(span["name"], span["ms"] - child_total.get(span["span"], 0)) for span in spans]
    return sorted(pairs, key=lambda pair: (-pair[1], pair[0]))

spans = [
    {"span": "s1", "parent": None, "name": "GET /stars", "ms": 252},
    {"span": "s2", "parent": "s1", "name": "check token", "ms": 8},
    {"span": "s3", "parent": "s1", "name": "query stars", "ms": 230},
    {"span": "s4", "parent": "s3", "name": "sqlite execute", "ms": 225},
    {"span": "s5", "parent": "s1", "name": "render json", "ms": 8},
]
print(self_times(spans))
`,
        alternatives: [
          src`
from collections import defaultdict

def self_times(spans):
    under = defaultdict(int)
    for s in spans:
        if s["parent"]:
            under[s["parent"]] += s["ms"]
    result = []
    for s in spans:
        result.append((s["name"], s["ms"] - under[s["span"]]))
    result.sort(key=lambda p: p[0])
    result.sort(key=lambda p: p[1], reverse=True)
    return result
`,
        ],
        wrong: [
          {
            code: src`
def self_times(spans):
    return sorted([(s["name"], s["ms"]) for s in spans], key=lambda p: (-p[1], p[0]))
`,
            fails: ["returns", "deep"],
            why: "total time is not self time: the request span always comes first even though it does almost nothing itself",
          },
          {
            code: src`
def self_times(spans):
    by_id = {s["span"]: s for s in spans}
    below = {}
    for s in spans:
        parent = s["parent"]
        while parent is not None:
            below[parent] = below.get(parent, 0) + s["ms"]
            parent = by_id[parent]["parent"]
    return sorted([(s["name"], s["ms"] - below.get(s["span"], 0)) for s in spans], key=lambda p: (-p[1], p[0]))
`,
            fails: ["returns", "deep"],
            why: "it subtracts every descendant, not just the direct children, so grandchildren are subtracted twice",
          },
        ],
        hints: [
          "First add up, for each span id, the `ms` of the spans whose parent it is.",
          "Only direct children count: a grandchild's time is already inside its parent's `ms`.",
          "Sort with a key that puts larger self times first and breaks ties by name.",
        ],
        task: {
          checks: [
            fn("returns", "self_times", [
              example([[{ span: "s1", parent: null, name: "GET /stars", ms: 252 }, { span: "s2", parent: "s1", name: "check token", ms: 8 }, { span: "s3", parent: "s1", name: "query stars", ms: 230 }, { span: "s4", parent: "s3", name: "sqlite execute", ms: 225 }, { span: "s5", parent: "s1", name: "render json", ms: 8 }]],
                [py.tuple(py.str("sqlite execute"), py.int(225)), py.tuple(py.str("check token"), py.int(8)), py.tuple(py.str("render json"), py.int(8)), py.tuple(py.str("GET /stars"), py.int(6)), py.tuple(py.str("query stars"), py.int(5))]),
              example([[{ span: "a", parent: null, name: "job", ms: 40 }]], [py.tuple(py.str("job"), py.int(40))]),
              example([[]], []),
              hiddenCase("spans listed children first", [[{ span: "k", parent: "j", name: "child", ms: 3 }, { span: "j", parent: null, name: "parent", ms: 10 }]], [py.tuple(py.str("parent"), py.int(7)), py.tuple(py.str("child"), py.int(3))]),
            ], { label: "self_times() subtracts direct children and sorts by self time" }),
            fn("deep", "self_times", [hiddenCase("three levels of nesting", [[{ span: "1", parent: null, name: "request", ms: 100 }, { span: "2", parent: "1", name: "load", ms: 90 }, { span: "3", parent: "2", name: "fetch", ms: 60 }, { span: "4", parent: "3", name: "decode", ms: 50 }]], [py.tuple(py.str("decode"), py.int(50)), py.tuple(py.str("load"), py.int(30)), py.tuple(py.str("fetch"), py.int(10)), py.tuple(py.str("request"), py.int(10))])], { label: "only direct children are subtracted" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import contextvars

request_id = contextvars.ContextVar("request_id", default="none")

def tag():
    return request_id.get()

print(tag())
token = request_id.set("t-7f3a")
inner = request_id.set("t-91c0")
print(tag())
request_id.reset(inner)
print(tag())
request_id.reset(token)
print(tag())
`,
        choices: ["none\nt-91c0\nt-7f3a\nnone", "none\nt-7f3a\nt-91c0\nnone", "none\nt-91c0\nnone\nnone", "t-7f3a\nt-91c0\nt-7f3a\nnone"],
        answer: 0,
        why: "Each `set` returns a token that remembers the previous value; `reset(token)` restores it. So the values unwind in reverse order back to the default.",
      },
      {
        id: "q2",
        prompt: "A common mistake: setting the trace id without resetting it. What does the last line print?",
        program: src`
import contextvars

current_trace = contextvars.ContextVar("current_trace", default="-")
lines = []

def handle(trace_id, fail):
    current_trace.set(trace_id)
    lines.append(current_trace.get() + " request started")
    if fail:
        raise TimeoutError

try:
    handle("t-7f3a", True)
except TimeoutError:
    pass
lines.append(current_trace.get() + " worker idle")
print(lines[-1])
`,
        choices: ["t-7f3a worker idle", "- worker idle", "worker idle", "LookupError"],
        answer: 0,
        why: "Nothing restored the previous value, so the failed request's id stays current and is stamped on unrelated log lines. Keep the token from `set` and `reset` it in `finally`.",
      },
      {
        id: "q3",
        prompt: "A request's trace shows: request 900 ms; its children: auth 20 ms, search 850 ms (whose child, the database call, is 840 ms), render 25 ms. Where should optimisation start?",
        choices: ["The database call inside search", "The request span, because it is the longest", "Render, because it ran last", "Auth, because it ran first"],
        answer: 0,
        why: "The request and search spans are long only because of what runs inside them. The database call has the largest self time: 840 of the 900 ms.",
      },
    ],
    review: [
      "A trace follows one request; each step is a span with its own id, its parent's id, a duration and any error.",
      "A context manager opens spans, a stack provides the parent, and `finally` records the duration even on failure.",
      "A `ContextVar` plus a logging filter puts the trace id on every log record; always `reset` it.",
      "Next: some failures are temporary. Retrying them well, with backoff.",
    ],
  },
  // ------------------------------------------------------------------ PY-L48-04 retries
  {
    id: "PY-L48-04",
    version: 2,
    slug: "retry-with-backoff",
    title: "Retry temporary failures with backoff",
    lede: "A locked database, a timed-out request or a busy server usually works a moment later. Retrying is right for those, and wrong for everything else. Good retries wait longer each time, add randomness, stop after a limit and re-raise the last error.",
    focus: "Retry only transient errors, waiting `base × 2**attempt` (capped, with jitter) between attempts, and re-raise when the attempts run out.",
    minutes: 22,
    objectives: [
      "Tell transient failures (timeouts, locks, 503) from permanent ones (bad input, 404) and retry only the first",
      "Compute exponential backoff with a cap and full jitter, using an injected `sleep` and a seeded random generator",
      "Give up after the last attempt and re-raise, and retry only operations that are safe to repeat",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "break-statement", "cancel-call", "comparison", "conditional-expr", "continue-statement", "conversion", "decorator-at", "decorator-call", "dict-get", "dict-literal", "else-clause", "except-type", "file-open", "for-loop", "function-def", "function-default", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "json-loads", "lambda", "len-call", "list-comp", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "none-value", "package-import", "part-attr", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "response-body", "sql-tx", "sqlite-call", "star-args", "star-kwargs", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "tuple-literal", "while-loop", "with-statement", "wraps-dec"],
    teaches: ["backoff-retry"],
    blocks: [
      {
        kind: "text",
        md: "In the HTTP & API Clients module you retried HTTP requests. The same need appears everywhere a program talks to something it doesn't control: a database file locked by another writer, a queue that is momentarily full, an API answering 503 during a deploy. These **transient** failures go away by themselves. A **permanent** failure (invalid data, a missing table, a 404) will fail exactly the same way every time; retrying it only delays the error and adds load.\n\nThe policy has four parts. **Which errors** to retry: a specific list of exception types (and sometimes messages or status codes). **How long to wait**: exponential backoff, `base × 2**attempt` (0.5, 1, 2, 4 s…), so a struggling service gets more room each time, with a **cap** so waits don't grow without limit. **Jitter**: a random part of the wait, so a thousand clients that failed together don't all retry at the same instant. **When to stop**: after a fixed number of attempts, re-raise the last error so the caller knows.\n\nPassing `sleep` in as a parameter keeps tests fast and exact: the examples record the waits instead of waiting.",
      },
      {
        kind: "example",
        title: "Exponential backoff around a flaky call",
        code: src`
def call_with_retry(operation, attempts, base, sleep):
    for attempt in range(attempts):
        try:
            return operation()
        except TimeoutError:
            if attempt == attempts - 1:
                raise
            delay = base * 2 ** attempt
            print(f"attempt {attempt + 1} timed out; waiting {delay} s")
            sleep(delay)

calls = []

def fetch_stars():
    calls.append("call")
    if len(calls) < 3:
        raise TimeoutError("star service did not answer")
    return {"lumen-labs/pyauth": 2}

waits = []
print(call_with_retry(fetch_stars, attempts=4, base=0.5, sleep=waits.append))
print("waited", waits, "after", len(calls), "calls")
`,
        output: "attempt 1 timed out; waiting 0.5 s\nattempt 2 timed out; waiting 1.0 s\n{'lumen-labs/pyauth': 2}\nwaited [0.5, 1.0] after 3 calls\n",
        note: "The third call succeeds, so only two waits happen. `waits.append` stands in for `time.sleep`: same call shape, but it records the delay instead of blocking.",
      },
      {
        kind: "text",
        md: "When the attempts run out, the last error must reach the caller. Swallowing it (returning `None`) turns an outage into wrong data downstream:",
      },
      {
        kind: "error-example",
        title: "Giving up re-raises the last error",
        code: src`
def call_with_retry(operation, attempts, base, sleep):
    for attempt in range(attempts):
        try:
            return operation()
        except TimeoutError:
            if attempt == attempts - 1:
                raise
            print(f"attempt {attempt + 1} timed out; waiting {base * 2 ** attempt} s")
            sleep(base * 2 ** attempt)

def always_down():
    raise TimeoutError("star service did not answer")

call_with_retry(always_down, attempts=3, base=0.5, sleep=lambda seconds: None)
`,
        error: "TimeoutError",
        output: "attempt 1 timed out; waiting 0.5 s\nattempt 2 timed out; waiting 1.0 s\n",
        note: "Three attempts, two waits, then `TimeoutError: star service did not answer` from the last attempt. The caller can decide what an outage means; it is never told a made-up answer.",
      },
      {
        kind: "text",
        md: "A reusable version is a decorator factory (see Decorators & Context Managers): the policy is set once, at the function's definition. This one retries only the exception types it is given, caps the wait, and uses **full jitter**: a random wait between 0 and the backoff value. A seeded `random.Random` makes the example repeatable; production code would use an unseeded one.",
      },
      {
        kind: "example",
        title: "A retry decorator with a cap and jitter",
        code: src`
import functools
import random
import sqlite3

def retry(attempts, base, cap, retry_on, sleep, rng):
    def decorate(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(attempts):
                try:
                    return func(*args, **kwargs)
                except retry_on:
                    if attempt == attempts - 1:
                        raise
                    sleep(rng.uniform(0, min(cap, base * 2 ** attempt)))
        return wrapper
    return decorate

waits = []
locks = [sqlite3.OperationalError("database is locked")] * 3

@retry(attempts=5, base=1, cap=3, retry_on=(sqlite3.OperationalError,), sleep=waits.append, rng=random.Random(42))
def save_star(repo):
    if locks:
        raise locks.pop()
    return f"saved star for {repo}"

print(save_star("tidewater/easystore"))
print([round(w, 2) for w in waits])

@retry(attempts=5, base=1, cap=3, retry_on=(sqlite3.OperationalError,), sleep=waits.append, rng=random.Random(42))
def parse_count(text):
    return int(text)

try:
    parse_count("two")
except ValueError:
    print("ValueError raised at once; waits still", len(waits))
`,
        output: "saved star for tidewater/easystore\n[0.64, 0.05, 0.83]\nValueError raised at once; waits still 3\n",
        note: "The waits are random but bounded: below 1, 2 and then the cap of 3. A `ValueError` is not in `retry_on`, so it passes straight through without a single retry: bad input won't get better by waiting.",
      },
      {
        kind: "text",
        md: "One more rule: **retry only what is safe to repeat.** If a payment request timed out *after* the provider charged the card, a blind retry charges it twice. Reads and idempotent writes (the Reliable Data Pipelines module: upserts, writes with an idempotency key) are safe; anything else needs a key the server can use to recognise the repeat.\n\n**Mistakes to avoid:** `except Exception` in a retry loop; constant or immediate retries; no cap and no limit; returning `None` when attempts run out; and retrying non-idempotent operations.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Back off exponentially",
      prompt: "`retry_waits` returns the waits a retry policy would use before attempts 2, 3, …, but every wait is just `base`. Make wait number `n` (from 0) equal `base * 2 ** n`.",
      spec: [
        ["Function", "`retry_waits(attempts, base)`"],
        ["Returns", "a list of `attempts - 1` waits: `base`, `2 × base`, `4 × base`, …"],
      ],
      starter: src`
def retry_waits(attempts, base):
    waits = []
    for n in range(attempts - 1):
        waits.append(base)
    return waits

print(retry_waits(5, 0.5))
`,
      answer: src`
def retry_waits(attempts, base):
    waits = []
    for n in range(attempts - 1):
        waits.append(base * 2 ** n)
    return waits

print(retry_waits(5, 0.5))
`,
      wrong: [
        {
          code: src`
def retry_waits(attempts, base):
    waits = []
    for n in range(attempts - 1):
        waits.append(base * 2 * n)
    return waits
`,
          fails: ["returns"],
          why: "`2 * n` grows linearly (and starts at 0), not exponentially",
        },
      ],
      hints: ["Each wait should double the previous one.", "`**` is the power operator.", "Wait `n` is the base times two to the power `n`."],
      task: {
        checks: [
          fn("returns", "retry_waits", [
            example([5, 0.5], [0.5, py.float(1), py.float(2), py.float(4)]),
            hiddenCase("one attempt means no waits", [1, 3], []),
            hiddenCase("a whole-second base", [4, 1], [1, 2, 4]),
          ], { label: "retry_waits() doubles each wait", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Retry a locked database, and nothing else",
        prompt: "SQLite raises `sqlite3.OperationalError` both for a temporary lock (`database is locked`) and for real mistakes (`no such table: stars`). Write `insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1)`: run `conn.execute(sql, params)` and `conn.commit()`; when the error's message is exactly `database is locked`, wait `base * 2**n` (n = 0, 1, …) with `sleep` and try again, up to `attempts` tries in total, then re-raise. Any other error is raised immediately. Return the number of tries it took.",
        spec: [
          ["Function", "`insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1)`"],
          ["Retry", "only `sqlite3.OperationalError` whose `str(err)` is `\"database is locked\"`"],
          ["Waits", "`base * 2**n` before try `n + 2`, through `sleep`"],
          ["Returns", "the number of tries used (1 when the first one works)"],
          ["Raises", "the last error after `attempts` locked tries; any other error at once, without waiting"],
        ],
        starter: src`
import sqlite3

def insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1):
    conn.execute(sql, params)
    conn.commit()
    return 1

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stars (event_id TEXT PRIMARY KEY, repo TEXT)")
print(insert_with_retry(conn, "INSERT INTO stars VALUES (?, ?)", ("48000007504", "lumen-labs/pyauth"), sleep=print))
`,
        answer: src`
import sqlite3

def insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1):
    for n in range(attempts):
        try:
            conn.execute(sql, params)
            conn.commit()
            return n + 1
        except sqlite3.OperationalError as err:
            if str(err) != "database is locked" or n == attempts - 1:
                raise
            sleep(base * 2 ** n)

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stars (event_id TEXT PRIMARY KEY, repo TEXT)")
print(insert_with_retry(conn, "INSERT INTO stars VALUES (?, ?)", ("48000007504", "lumen-labs/pyauth"), sleep=print))
`,
        alternatives: [
          src`
import sqlite3

def insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1):
    tries = 0
    while True:
        tries += 1
        try:
            conn.execute(sql, params)
            conn.commit()
        except sqlite3.OperationalError as err:
            locked = "database is locked" == str(err)
            if not locked or tries >= attempts:
                raise
            sleep(base * 2 ** (tries - 1))
        else:
            return tries
`,
        ],
        wrong: [
          {
            code: src`
import sqlite3

def insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1):
    for n in range(attempts):
        try:
            conn.execute(sql, params)
            conn.commit()
            return n + 1
        except sqlite3.OperationalError:
            if n == attempts - 1:
                raise
            sleep(base * 2 ** n)
`,
            fails: ["permanent"],
            why: "every OperationalError is retried, so a missing table costs three pointless waits before failing",
          },
          {
            code: src`
import sqlite3

def insert_with_retry(conn, sql, params, sleep, attempts=4, base=0.1):
    for n in range(attempts):
        try:
            conn.execute(sql, params)
            conn.commit()
            return n + 1
        except sqlite3.OperationalError as err:
            if str(err) != "database is locked":
                raise
            sleep(base * 2 ** n)
    return attempts
`,
            fails: ["gives-up"],
            why: "after the last locked try it returns as if the row had been saved, instead of re-raising",
          },
        ],
        hints: [
          "A loop over the tries, with the insert and commit inside `try`; return as soon as they work.",
          "In the `except`, decide: is this a lock, and is there a try left? If not, `raise` re-raises the same error.",
          "Only after deciding to retry, call `sleep` with the backoff for this try.",
        ],
        task: {
          checks: [
            expr("returns", "a lock that clears after two tries", lines(
              "import sqlite3 as _sq",
              "class _Locked:",
              "    def __init__(self, fails):",
              "        self.fails = fails",
              "        self.rows = []",
              "    def execute(self, sql, params):",
              "        if self.fails:",
              "            self.fails -= 1",
              "            raise _sq.OperationalError('database is locked')",
              "        self.rows.append(params)",
              "    def commit(self):",
              "        pass",
              "_c = _Locked(2)",
              "_w = []",
              "_n = insert_with_retry(_c, 'INSERT INTO stars VALUES (?, ?)', ('48000007504', 'lumen-labs/pyauth'), _w.append)",
              "result = (_n, [round(_x, 3) for _x in _w], _c.rows)",
            ), py.tuple(py.int(3), pv([0.1, 0.2]), pv([py.tuple(py.str("48000007504"), py.str("lumen-labs/pyauth"))])), { show: "insert_with_retry(conn, sql, params, sleep) with a lock that clears after 2 tries" }),
            expr("first-try", "no lock at all", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_c.execute('CREATE TABLE stars (event_id TEXT PRIMARY KEY, repo TEXT)')",
              "_w = []",
              "result = (insert_with_retry(_c, 'INSERT INTO stars VALUES (?, ?)', ('e1', 'r'), _w.append), _w, _c.execute('SELECT COUNT(*) FROM stars').fetchone()[0])",
            ), py.tuple(py.int(1), pv([]), py.int(1)), { show: "insert_with_retry(real sqlite connection, ...)" }),
            expr("permanent", "a real mistake is raised at once", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_w = []",
              "try:",
              "    insert_with_retry(_c, 'INSERT INTO stars VALUES (?, ?)', ('e1', 'r'), _w.append)",
              "    _what = 'no error'",
              "except _sq.OperationalError as _e:",
              "    _what = str(_e)",
              "result = (_what, _w)",
            ), py.tuple(py.str("no such table: stars"), pv([])), { hidden: true }),
            expr("gives-up", "a lock that never clears", lines(
              "import sqlite3 as _sq",
              "class _Locked:",
              "    def execute(self, sql, params):",
              "        raise _sq.OperationalError('database is locked')",
              "    def commit(self):",
              "        pass",
              "_w = []",
              "try:",
              "    insert_with_retry(_Locked(), 'x', (), _w.append, attempts=3, base=0.5)",
              "    _what = 'returned'",
              "except _sq.OperationalError:",
              "    _what = 'raised'",
              "result = (_what, _w)",
            ), py.tuple(py.str("raised"), pv([0.5, py.float(1)])), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Fetch JSON through a busy API",
        prompt: "The repository API answers `503 Service Unavailable` or `429 Too Many Requests` when it is busy, often with a `Retry-After` header giving the seconds to wait. Write `get_json(opener, url, sleep, attempts=4)`: open the URL with `opener.open(url, timeout=10)` and return the parsed JSON body. On a 503 or 429, wait the `Retry-After` seconds if the header is present (an integer), otherwise `2**n` seconds (1, 2, 4…), then try again; a timeout (`urllib.error.URLError`) is retried the same way. Any other HTTP error is raised at once. After `attempts` tries, re-raise the last error.",
        spec: [
          ["Function", "`get_json(opener, url, sleep, attempts=4)`"],
          ["Retry", "`HTTPError` with code 503 or 429, and `URLError` (timeouts, refused connections)"],
          ["Wait", "`int(err.headers[\"Retry-After\"])` when an HTTP error has that header, otherwise `2**n` for try `n` (from 0)"],
          ["Raises", "other HTTP errors (404, 400…) immediately; the last error when the attempts run out"],
          ["Files", "`replay.py` (the the HTTP & API Clients module replay handler) is next to your program; the checks pass in an opener built with it"],
        ],
        starter: src`
import json
import urllib.error
from urllib.request import build_opener
from replay import Replay

def get_json(opener, url, sleep, attempts=4):
    with opener.open(url, timeout=10) as response:
        return json.loads(response.read())

url = "https://api.example.com/repos/lumen-labs/pyauth/stars"
opener = build_opener(Replay({url: [{"status": 503, "headers": {"Retry-After": "3"}}, {"status": 200, "body": {"stars": 2}}]}))
waits = []
print(get_json(opener, url, waits.append), waits)
`,
        answer: src`
import json
import urllib.error
from urllib.request import build_opener
from replay import Replay

def get_json(opener, url, sleep, attempts=4):
    for n in range(attempts):
        try:
            with opener.open(url, timeout=10) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as err:
            if err.code not in (429, 503) or n == attempts - 1:
                raise
            retry_after = err.headers.get("Retry-After")
            sleep(int(retry_after) if retry_after is not None else 2 ** n)
        except urllib.error.URLError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

url = "https://api.example.com/repos/lumen-labs/pyauth/stars"
opener = build_opener(Replay({url: [{"status": 503, "headers": {"Retry-After": "3"}}, {"status": 200, "body": {"stars": 2}}]}))
waits = []
print(get_json(opener, url, waits.append), waits)
`,
        alternatives: [
          src`
import json
from urllib.error import HTTPError, URLError

def wait_for(err, n):
    header = err.headers.get("Retry-After") if isinstance(err, HTTPError) else None
    return int(header) if header else 2 ** n

def get_json(opener, url, sleep, attempts=4):
    last = None
    for n in range(attempts):
        try:
            response = opener.open(url, timeout=10)
            with response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as err:
            if err.code != 429 and err.code != 503:
                raise
            last = err
        except URLError as err:
            last = err
        if n < attempts - 1:
            sleep(wait_for(last, n))
    raise last
`,
        ],
        wrong: [
          {
            code: src`
import json
import urllib.error

def get_json(opener, url, sleep, attempts=4):
    for n in range(attempts):
        try:
            with opener.open(url, timeout=10) as response:
                return json.loads(response.read())
        except urllib.error.URLError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)
`,
            fails: ["returns", "not-found", "retry-after"],
            why: "`HTTPError` is a kind of `URLError`, so every HTTP error, a 404 included, is retried and `Retry-After` is ignored",
          },
          {
            code: src`
import json
import urllib.error

def get_json(opener, url, sleep, attempts=4):
    for n in range(attempts):
        try:
            with opener.open(url, timeout=10) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as err:
            if err.code not in (429, 503) or n == attempts - 1:
                raise
            sleep(2 ** n)
        except urllib.error.URLError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)
`,
            fails: ["returns", "retry-after"],
            why: "the server's `Retry-After` is ignored, so the client comes back sooner than it was asked to",
          },
        ],
        hints: [
          "Catch `HTTPError` before `URLError`: an HTTP error is a special kind of URL error.",
          "For an HTTP error, first decide whether the code is retryable at all; then pick the wait from the header or the backoff.",
          "Re-raise when the code isn't 429/503 or when this was the last try.",
        ],
        task: {
          files: { "replay.py": REPLAY_PY },
          checks: [
            expr("returns", "a 503 with Retry-After, then success", lines(
              replaySetup({ "https://api.example.com/repos/lumen-labs/pyauth/stars": [{ status: 503, headers: { "Retry-After": "3" } }, { status: 200, body: { stars: 2 } }] }),
              "_w = []",
              "result = (get_json(_op, 'https://api.example.com/repos/lumen-labs/pyauth/stars', _w.append), _w)",
            ), py.tuple(pv({ stars: 2 }), pv([3])), { show: "get_json(opener, url, sleep) after a 503 with Retry-After: 3" }),
            expr("backoff", "busy answers without Retry-After, then a timeout, then success", lines(
              replaySetup({ "https://api.example.com/repos/x/y": [{ status: 429 }, { status: 503 }, { status: 200, body: [], seconds: 30 }, { status: 200, body: ["ok"] }] }),
              "_w = []",
              "result = (get_json(_op, 'https://api.example.com/repos/x/y', _w.append), _w)",
            ), py.tuple(pv(["ok"]), pv([1, 2, 4])), { hidden: true }),
            expr("not-found", "a 404 is raised at once", lines(
              replaySetup({}),
              "import urllib.error as _ue",
              "_w = []",
              "try:",
              "    get_json(_op, 'https://api.example.com/repos/missing/repo', _w.append)",
              "    _what = None",
              "except _ue.HTTPError as _e:",
              "    _what = _e.code",
              "result = (_what, _w)",
            ), py.tuple(py.int(404), pv([])), { hidden: true }),
            expr("gives-up", "a service that stays down", lines(
              replaySetup({ "https://api.example.com/down": { status: 503 } }),
              "import urllib.error as _ue",
              "_w = []",
              "try:",
              "    get_json(_op, 'https://api.example.com/down', _w.append, attempts=3)",
              "    _what = 'returned'",
              "except _ue.HTTPError as _e:",
              "    _what = _e.code",
              "result = (_what, _w, len(_rp.requests))",
            ), py.tuple(py.int(503), pv([1, 2]), py.int(3)), { hidden: true }),
            expr("retry-after", "a Retry-After longer than the backoff", lines(
              replaySetup({ "https://api.example.com/slow": [{ status: 429, headers: { "Retry-After": "20" } }, { status: 200, body: { ok: true } }] }),
              "_w = []",
              "result = (get_json(_op, 'https://api.example.com/slow', _w.append), _w)",
            ), py.tuple(pv({ ok: true }), pv([20])), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def schedule(attempts, base, cap):
    return [min(cap, base * 2 ** n) for n in range(attempts - 1)]

print(schedule(6, 0.25, 3))
print(schedule(1, 5, 60))
`,
        choices: ["[0.25, 0.5, 1.0, 2.0, 3]\n[]", "[0.25, 0.5, 1.0, 2.0, 4.0]\n[]", "[0.25, 0.5, 0.75, 1.0, 1.25]\n[5]", "[0.5, 1.0, 2.0, 3, 3]\n[]"],
        answer: 0,
        why: "Five waits for six attempts: 0.25 doubles to 2.0, then 4.0 is capped at 3 (the cap is an int, so `min` returns 3). One attempt needs no waits.",
      },
      {
        id: "q2",
        prompt: "A common mistake: retrying something that isn't safe to repeat. The provider charged the card, but its reply timed out. What does this print?",
        program: src`
charges = []

def charge(order_id, amount):
    charges.append((order_id, amount))
    if len(charges) == 1:
        raise TimeoutError("no reply")
    return "ok"

for attempt in range(3):
    try:
        charge("O100282", 35.84)
        break
    except TimeoutError:
        continue
print(len(charges))
`,
        choices: ["2", "1", "3", "0"],
        answer: 0,
        why: "The first charge happened; only the reply was lost. The retry charged again. Retry only idempotent operations, or send an idempotency key so the provider can recognise the repeat (see Reliable Data Pipelines).",
      },
      {
        id: "q3",
        prompt: "Which failure should a retry policy retry?",
        choices: [
          "`sqlite3.OperationalError: database is locked`",
          "`ValueError: invalid literal for int() with base 10: 'two'`",
          "HTTP 404 Not Found",
          "`sqlite3.OperationalError: no such table: stars`",
        ],
        answer: 0,
        why: "A lock is held by another writer and is released shortly. Bad input, a missing resource and a missing table fail the same way every time.",
      },
    ],
    review: [
      "Retry only transient failures (timeouts, locks, 429/503), and only operations that are safe to repeat.",
      "Wait `base × 2**attempt`, capped, with jitter; honour a server's `Retry-After`.",
      "Stop after a fixed number of attempts and re-raise the last error.",
      "Next: when something does fail, the logs, metrics and traces are your evidence. Investigating a failure.",
    ],
  },
  // ------------------------------------------------------------------ PY-L48-05 failure investigation
  {
    id: "PY-L48-05",
    version: 2,
    slug: "investigate-a-failure",
    title: "Investigate a failure from the logs",
    lede: "When the alert fires, the evidence is already in the logs. Because they are structured, a short program can follow one request's trace, group the errors by kind and find the first failure, which is usually the cause, rather than the loudest one.",
    focus: "Answer incident questions from JSON log lines: follow one trace in time order, count errors by type, and find the first failure in each trace.",
    minutes: 22,
    objectives: [
      "Parse JSON log lines defensively, skipping lines that aren't JSON",
      "Reconstruct one request's timeline by trace id and time",
      "Separate cause from symptoms: the first error in a trace, and error counts by type",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comparison", "continue-statement", "counter-call", "defaultdict-call", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-index", "precedence", "print-call", "print-several", "print-text", "reassignment", "sort-key", "string-index", "string-slice", "top-level-indent", "truthiness", "try-except", "type-call"],
    teaches: ["log-query"],
    blocks: [
      {
        kind: "text",
        md: "An alert says the star API's error rate jumped at 09:00. The logs from the API and the database worker hold the story, but thousands of lines of it. Because each line is a JSON object (L01) with a `trace` id (L03), three small questions get you most of the way:\n\n1. **What happened to one failing request?** Filter by its trace id and sort by time.\n2. **What kinds of errors are there, and how many?** Group the ERROR lines by their `error` field.\n3. **What failed first?** In each failing trace, the earliest error is the likely cause; later errors (a 500 returned to the user, a retry giving up) are symptoms.\n\nISO timestamps like `2025-03-03T09:00:02.150Z` sort correctly as text, so no date parsing is needed to order them.",
      },
      {
        kind: "example",
        title: "One request's timeline",
        code: src`
import json

log = [
    '{"time": "2025-03-03T09:00:01.020Z", "level": "INFO", "service": "api", "trace": "t-7f3a", "message": "request started"}',
    '{"time": "2025-03-03T09:00:01.030Z", "level": "INFO", "service": "api", "trace": "t-91c0", "message": "request started"}',
    '{"time": "2025-03-03T09:00:03.045Z", "level": "ERROR", "service": "api", "trace": "t-7f3a", "message": "responded 500", "error": "TimeoutError"}',
    '{"time": "2025-03-03T09:00:01.050Z", "level": "INFO", "service": "db", "trace": "t-7f3a", "message": "query started"}',
    '{"time": "2025-03-03T09:00:03.040Z", "level": "ERROR", "service": "db", "trace": "t-7f3a", "message": "query failed", "error": "OperationalError"}',
    '{"time": "2025-03-03T09:00:01.090Z", "level": "INFO", "service": "api", "trace": "t-91c0", "message": "responded 200"}',
]

entries = [json.loads(line) for line in log]
timeline = sorted((e for e in entries if e["trace"] == "t-7f3a"), key=lambda e: e["time"])
for e in timeline:
    print(e["time"][11:23], e["level"], e["service"], e["message"], e.get("error", ""))
`,
        output: "09:00:01.020 INFO api request started \n09:00:01.050 INFO db query started \n09:00:03.040 ERROR db query failed OperationalError\n09:00:03.045 ERROR api responded 500 TimeoutError\n",
        note: "Lines arrive out of order (two services write them), so sort by time. Read in order, the story is clear: the database query failed after two seconds, and five milliseconds later the API gave up and returned 500. The database error came first.",
      },
      {
        kind: "text",
        md: "Real log files are never perfectly clean: a library prints a plain warning, a line is cut off when a process dies. A one-line comprehension that parses everything stops at the first such line:",
      },
      {
        kind: "error-example",
        title: "One stray line stops the investigation",
        code: src`
import json

log = [
    '{"time": "2025-03-03T09:00:01.020Z", "level": "INFO", "trace": "t-7f3a", "message": "request started"}',
    'WARNING: connection pool is almost full',
    '{"time": "2025-03-03T09:00:03.045Z", "level": "ERROR", "trace": "t-7f3a", "message": "responded 500"}',
]
entries = [json.loads(line) for line in log]
print(len(entries))
`,
        error: "JSONDecodeError",
        output: "",
        note: "Parse line by line and skip (and count) what isn't JSON, exactly as ingestion did in the Reliable Data Pipelines module. The stray line may even be a clue worth reading.",
      },
      {
        kind: "text",
        md: "With entries parsed safely, counting errors by type shows what is common, and the first error of each trace shows what *starts* failures. They can disagree: here every failing request ends in a `TimeoutError` at the API, but each one started with a database error.",
      },
      {
        kind: "example",
        title: "Symptoms and causes",
        code: src`
import json
from collections import Counter

def read_entries(lines):
    entries = []
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(entry, dict):
            entries.append(entry)
    return entries

log = [
    '{"time": "09:00:03.040", "level": "ERROR", "service": "db", "trace": "t-7f3a", "error": "OperationalError"}',
    '{"time": "09:00:03.045", "level": "ERROR", "service": "api", "trace": "t-7f3a", "error": "TimeoutError"}',
    'WARNING: connection pool is almost full',
    '{"time": "09:00:04.100", "level": "ERROR", "service": "db", "trace": "t-2b55", "error": "OperationalError"}',
    '{"time": "09:00:04.110", "level": "ERROR", "service": "api", "trace": "t-2b55", "error": "TimeoutError"}',
    '{"time": "09:00:04.200", "level": "ERROR", "service": "api", "trace": "t-c41d", "error": "TimeoutError"}',
    '{"time": "09:00:04.150", "level": "ERROR", "service": "db", "trace": "t-c41d", "error": "OperationalError"}',
    '{"time": "09:00:05.000", "level": "INFO", "service": "api", "trace": "t-e9a2", "message": "responded 200"}',
]

errors = [e for e in read_entries(log) if e["level"] == "ERROR"]
print(Counter(e["error"] for e in errors).most_common())

first = {}
for e in sorted(errors, key=lambda e: e["time"]):
    first.setdefault(e["trace"], (e["service"], e["error"]))
print(Counter(first.values()))
`,
        output: "[('OperationalError', 3), ('TimeoutError', 3)]\nCounter({('db', 'OperationalError'): 3})\n",
        note: "Counting alone says there are as many timeouts as database errors. The first error of every failing trace is the database's, so the timeouts are symptoms: fix the database problem and the timeouts go away.",
      },
      {
        kind: "text",
        md: "**When to use it:** during and after any incident, and to check that a fix worked (the first-failure counts drop to zero). **Mistakes to avoid:** parsing logs with an all-or-nothing comprehension; reading lines in file order instead of time order; treating the most frequent or last error as the cause; and investigating without a trace id, which is why L03 puts one on every record.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the lines of one trace",
      prompt: "`trace_timeline` returns every entry in time order. Keep only the entries whose `trace` is the one asked for.",
      spec: [
        ["Function", "`trace_timeline(entries, trace_id)`; `entries` are parsed log dictionaries"],
        ["Returns", "the entries of that trace, sorted by `time`"],
      ],
      starter: src`
def trace_timeline(entries, trace_id):
    return sorted(entries, key=lambda e: e["time"])

entries = [
    {"time": "09:00:03.045", "trace": "t-7f3a", "message": "responded 500"},
    {"time": "09:00:01.030", "trace": "t-91c0", "message": "request started"},
    {"time": "09:00:01.020", "trace": "t-7f3a", "message": "request started"},
]
for e in trace_timeline(entries, "t-7f3a"):
    print(e["time"], e["message"])
`,
      answer: src`
def trace_timeline(entries, trace_id):
    mine = [e for e in entries if e["trace"] == trace_id]
    return sorted(mine, key=lambda e: e["time"])

entries = [
    {"time": "09:00:03.045", "trace": "t-7f3a", "message": "responded 500"},
    {"time": "09:00:01.030", "trace": "t-91c0", "message": "request started"},
    {"time": "09:00:01.020", "trace": "t-7f3a", "message": "request started"},
]
for e in trace_timeline(entries, "t-7f3a"):
    print(e["time"], e["message"])
`,
      wrong: [
        {
          code: src`
def trace_timeline(entries, trace_id):
    return [e for e in entries if e["trace"] == trace_id]
`,
          fails: ["returns"],
          why: "the right lines, but in file order instead of time order",
        },
      ],
      hints: ["Filter first, then sort.", "A list comprehension with an `if` keeps the entries of one trace.", "Sort what you kept by `time`, as the starter already does."],
      task: {
        checks: [
          fn("returns", "trace_timeline", [
            example([[{ time: "09:00:03.045", trace: "t-7f3a", message: "responded 500" }, { time: "09:00:01.030", trace: "t-91c0", message: "request started" }, { time: "09:00:01.020", trace: "t-7f3a", message: "request started" }], "t-7f3a"], [{ time: "09:00:01.020", trace: "t-7f3a", message: "request started" }, { time: "09:00:03.045", trace: "t-7f3a", message: "responded 500" }]),
            hiddenCase("a trace that isn't in the log", [[{ time: "1", trace: "a", message: "x" }], "b"], []),
          ], { label: "trace_timeline() keeps one trace, in time order" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An error summary for the incident report",
        prompt: "Write `error_summary(lines)`: from raw log lines, return one tuple `(error_type, count, first_time)` per kind of error among the ERROR entries, most frequent first and ties by error type. `first_time` is the earliest `time` of that error. Lines that aren't JSON objects are skipped; an ERROR entry with no `error` field counts as `\"unknown\"`.",
        spec: [
          ["Function", "`error_summary(lines)`; `lines` are texts, mostly JSON objects with `time` and `level`"],
          ["Returns", "a list of `(error_type, count, first_time)` tuples, sorted by count (largest first), then by error type"],
          ["Rules", "only `level == \"ERROR\"`; non-JSON lines and JSON that isn't an object are skipped"],
        ],
        starter: src`
import json

def error_summary(lines):
    return []

log = [
    '{"time": "2025-03-03T09:00:03.045Z", "level": "ERROR", "error": "TimeoutError"}',
    '{"time": "2025-03-03T09:00:03.040Z", "level": "ERROR", "error": "OperationalError"}',
    'WARNING: connection pool is almost full',
    '{"time": "2025-03-03T09:00:04.110Z", "level": "ERROR", "error": "TimeoutError"}',
    '{"time": "2025-03-03T09:00:04.500Z", "level": "INFO", "message": "responded 200"}',
]
print(error_summary(log))
`,
        answer: src`
import json

def error_summary(lines):
    counts = {}
    first = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict) or entry.get("level") != "ERROR":
            continue
        kind = entry.get("error", "unknown")
        counts[kind] = counts.get(kind, 0) + 1
        if kind not in first or entry["time"] < first[kind]:
            first[kind] = entry["time"]
    rows = [(kind, counts[kind], first[kind]) for kind in counts]
    return sorted(rows, key=lambda row: (-row[1], row[0]))

log = [
    '{"time": "2025-03-03T09:00:03.045Z", "level": "ERROR", "error": "TimeoutError"}',
    '{"time": "2025-03-03T09:00:03.040Z", "level": "ERROR", "error": "OperationalError"}',
    'WARNING: connection pool is almost full',
    '{"time": "2025-03-03T09:00:04.110Z", "level": "ERROR", "error": "TimeoutError"}',
    '{"time": "2025-03-03T09:00:04.500Z", "level": "INFO", "message": "responded 200"}',
]
print(error_summary(log))
`,
        alternatives: [
          src`
import json
from collections import defaultdict

def error_summary(lines):
    times = defaultdict(list)
    for line in lines:
        try:
            entry = json.loads(line)
        except ValueError:
            continue
        if type(entry) is dict and entry.get("level") == "ERROR":
            times[entry.get("error", "unknown")].append(entry["time"])
    summary = [(kind, len(ts), min(ts)) for kind, ts in times.items()]
    summary.sort(key=lambda r: r[0])
    summary.sort(key=lambda r: r[1], reverse=True)
    return summary
`,
        ],
        wrong: [
          {
            code: src`
import json

def error_summary(lines):
    counts = {}
    first = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("level") != "ERROR":
            continue
        kind = entry.get("error", "unknown")
        counts[kind] = counts.get(kind, 0) + 1
        first.setdefault(kind, entry["time"])
    return sorted([(k, counts[k], first[k]) for k in counts], key=lambda r: (-r[1], r[0]))
`,
            fails: ["returns", "not-object"],
            why: "`first_time` is the first one *in the file*, not the earliest, and a JSON line that isn't an object crashes it",
          },
          {
            code: src`
import json

def error_summary(lines):
    counts = {}
    first = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict) or entry.get("level") != "ERROR":
            continue
        kind = entry.get("error", "unknown")
        counts[kind] = counts.get(kind, 0) + 1
        if kind not in first or entry["time"] < first[kind]:
            first[kind] = entry["time"]
    return sorted([(k, counts[k], first[k]) for k in counts])
`,
            fails: ["returns", "ties"],
            why: "sorting the tuples as they are orders by error name, not by how often each error happened",
          },
        ],
        hints: [
          "Two dictionaries keyed by error type: one counts, one keeps the earliest time seen.",
          "Compare times as text (ISO times sort correctly) and keep the smaller one; skip anything that isn't an ERROR object.",
          "Sort with a key of (negative count, error type).",
        ],
        task: {
          checks: [
            fn("returns", "error_summary", [
              example([[
                '{"time": "2025-03-03T09:00:03.045Z", "level": "ERROR", "error": "TimeoutError"}',
                '{"time": "2025-03-03T09:00:03.040Z", "level": "ERROR", "error": "OperationalError"}',
                "WARNING: connection pool is almost full",
                '{"time": "2025-03-03T09:00:04.110Z", "level": "ERROR", "error": "TimeoutError"}',
                '{"time": "2025-03-03T09:00:04.500Z", "level": "INFO", "message": "responded 200"}',
              ]], [py.tuple(py.str("TimeoutError"), py.int(2), py.str("2025-03-03T09:00:03.045Z")), py.tuple(py.str("OperationalError"), py.int(1), py.str("2025-03-03T09:00:03.040Z"))]),
              example([['{"time": "t1", "level": "INFO"}']], []),
              example([['{"time": "t5", "level": "ERROR"}']], [py.tuple(py.str("unknown"), py.int(1), py.str("t5"))]),
              hiddenCase("an earlier error later in the file", [['{"time": "09:05", "level": "ERROR", "error": "KeyError"}', '{"time": "09:01", "level": "ERROR", "error": "KeyError"}']], [py.tuple(py.str("KeyError"), py.int(2), py.str("09:01"))]),
            ], { label: "error_summary() counts each error type with its first time" }),
            fn("not-object", "error_summary", [hiddenCase("JSON lines that aren't objects", [["[1, 2]", '"ERROR"', '{"time": "09:00", "level": "ERROR", "error": "ValueError"}']], [py.tuple(py.str("ValueError"), py.int(1), py.str("09:00"))])], { label: "lines that aren't JSON objects are skipped" }),
            fn("ties", "error_summary", [hiddenCase("several error types with different counts", [['{"time": "1", "level": "ERROR", "error": "A"}', '{"time": "2", "level": "ERROR", "error": "Z"}', '{"time": "3", "level": "ERROR", "error": "Z"}', '{"time": "4", "level": "ERROR", "error": "M"}']], [py.tuple(py.str("Z"), py.int(2), py.str("2")), py.tuple(py.str("A"), py.int(1), py.str("1")), py.tuple(py.str("M"), py.int(1), py.str("4"))])], { label: "most frequent first, ties by name" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Where do failures start?",
        prompt: "Write `first_failures(lines)`: for every trace that has at least one ERROR entry, take its **earliest** ERROR (by `time`), and count how many traces' first error came from each `service`. Return a dictionary from service to that count, with services in alphabetical order. Non-JSON lines are skipped.",
        spec: [
          ["Function", "`first_failures(lines)`"],
          ["Entries", "JSON objects with `time`, `level`, `service` and `trace`"],
          ["Returns", "`{service: number of traces whose first error came from it}`, keys sorted; `{}` when nothing failed"],
        ],
        starter: src`
import json

def first_failures(lines):
    return {}

log = [
    '{"time": "09:00:03.045", "level": "ERROR", "service": "api", "trace": "t-7f3a"}',
    '{"time": "09:00:03.040", "level": "ERROR", "service": "db", "trace": "t-7f3a"}',
    '{"time": "09:00:04.110", "level": "ERROR", "service": "api", "trace": "t-2b55"}',
    '{"time": "09:00:04.100", "level": "ERROR", "service": "db", "trace": "t-2b55"}',
    '{"time": "09:00:06.300", "level": "ERROR", "service": "api", "trace": "t-77aa"}',
    '{"time": "09:00:05.000", "level": "INFO", "service": "api", "trace": "t-e9a2"}',
]
print(first_failures(log))
`,
        answer: src`
import json

def first_failures(lines):
    first = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict) or entry.get("level") != "ERROR":
            continue
        trace = entry["trace"]
        if trace not in first or entry["time"] < first[trace]["time"]:
            first[trace] = entry
    counts = {}
    for entry in first.values():
        counts[entry["service"]] = counts.get(entry["service"], 0) + 1
    return {service: counts[service] for service in sorted(counts)}

log = [
    '{"time": "09:00:03.045", "level": "ERROR", "service": "api", "trace": "t-7f3a"}',
    '{"time": "09:00:03.040", "level": "ERROR", "service": "db", "trace": "t-7f3a"}',
    '{"time": "09:00:04.110", "level": "ERROR", "service": "api", "trace": "t-2b55"}',
    '{"time": "09:00:04.100", "level": "ERROR", "service": "db", "trace": "t-2b55"}',
    '{"time": "09:00:06.300", "level": "ERROR", "service": "api", "trace": "t-77aa"}',
    '{"time": "09:00:05.000", "level": "INFO", "service": "api", "trace": "t-e9a2"}',
]
print(first_failures(log))
`,
        alternatives: [
          src`
import json
from collections import Counter

def first_failures(lines):
    errors = []
    for line in lines:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if isinstance(e, dict) and e.get("level") == "ERROR":
            errors.append(e)
    starts = {}
    for e in sorted(errors, key=lambda e: e["time"]):
        starts.setdefault(e["trace"], e["service"])
    return dict(sorted(Counter(starts.values()).items()))
`,
        ],
        wrong: [
          {
            code: src`
import json

def first_failures(lines):
    counts = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("level") == "ERROR":
            counts[entry["service"]] = counts.get(entry["service"], 0) + 1
    return dict(sorted(counts.items()))
`,
            fails: ["returns", "single"],
            why: "it counts every error, so symptoms are counted as well as causes",
          },
          {
            code: src`
import json

def first_failures(lines):
    first = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("level") == "ERROR":
            first.setdefault(entry["trace"], entry["service"])
    counts = {}
    for service in first.values():
        counts[service] = counts.get(service, 0) + 1
    return dict(sorted(counts.items()))
`,
            fails: ["returns", "single"],
            why: "it takes the first error *in the file*; lines from two services arrive out of time order",
          },
        ],
        hints: [
          "Keep, for each trace, the ERROR entry with the smallest time seen so far.",
          "Only after reading every line do you know each trace's first error; then count by service.",
          "Build the result with the services in sorted order.",
        ],
        task: {
          checks: [
            fn("returns", "first_failures", [
              example([[
                '{"time": "09:00:03.045", "level": "ERROR", "service": "api", "trace": "t-7f3a"}',
                '{"time": "09:00:03.040", "level": "ERROR", "service": "db", "trace": "t-7f3a"}',
                '{"time": "09:00:04.110", "level": "ERROR", "service": "api", "trace": "t-2b55"}',
                '{"time": "09:00:04.100", "level": "ERROR", "service": "db", "trace": "t-2b55"}',
                '{"time": "09:00:06.300", "level": "ERROR", "service": "api", "trace": "t-77aa"}',
                '{"time": "09:00:05.000", "level": "INFO", "service": "api", "trace": "t-e9a2"}',
              ]], { api: 1, db: 2 }),
              example([['{"time": "1", "level": "INFO", "service": "api", "trace": "a"}']], {}),
              example([["not json", '{"time": "2", "level": "ERROR", "service": "worker", "trace": "b"}']], { worker: 1 }),
            ], { label: "first_failures() counts each trace's first error by service" }),
            fn("single", "first_failures", [hiddenCase("one trace with three errors", [['{"time": "3", "level": "ERROR", "service": "api", "trace": "x"}', '{"time": "1", "level": "ERROR", "service": "queue", "trace": "x"}', '{"time": "2", "level": "ERROR", "service": "db", "trace": "x"}']], { queue: 1 })], { label: "one count per trace" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
times = ["2025-03-03T09:00:10Z", "2025-03-03T09:00:09Z", "2025-03-03T10:00:00Z", "2025-03-03T08:59:59Z"]
print(sorted(times)[0][11:19], max(times)[11:19])
print("9:00" < "10:00", "09:00" < "10:00")
`,
        choices: ["08:59:59 10:00:00\nFalse True", "09:00:09 10:00:00\nTrue True", "08:59:59 09:00:10\nFalse True", "08:59:59 10:00:00\nTrue True"],
        answer: 0,
        why: "Zero-padded ISO times compare correctly as text, so `sorted` and `max` work. Without padding, text comparison breaks: `\"9\"` is greater than `\"1\"`, so `\"9:00\" < \"10:00\"` is False.",
      },
      {
        id: "q2",
        prompt: "A common mistake: blaming the most frequent error. What does this print?",
        program: src`
from collections import Counter

errors = [
    ("t1", "09:00:01", "db", "OperationalError"),
    ("t1", "09:00:02", "api", "TimeoutError"),
    ("t1", "09:00:03", "api", "RetryGaveUp"),
    ("t2", "09:00:04", "db", "OperationalError"),
    ("t2", "09:00:05", "api", "TimeoutError"),
    ("t2", "09:00:06", "api", "RetryGaveUp"),
]
by_service = Counter(service for _, _, service, _ in errors)
print(by_service.most_common(1)[0][0])
first = {}
for trace, time, service, error in sorted(errors, key=lambda e: e[1]):
    first.setdefault(trace, service)
print(set(first.values()))
`,
        choices: ["api\n{'db'}", "db\n{'db'}", "api\n{'api'}", "api\n{'api', 'db'}"],
        answer: 0,
        why: "The API logs twice as many errors, but every one of them follows a database error in the same trace. Counting points at the noisy service; the first failure points at the cause.",
      },
      {
        id: "q3",
        prompt: "Error rates jumped after a deploy. Which question do the logs answer best to find the cause?",
        choices: [
          "In each failing trace, which error happened first?",
          "Which error message is the longest?",
          "Which service writes the most log lines in total?",
          "What was the last line written before the alert?",
        ],
        answer: 0,
        why: "Failures cascade: one cause produces many downstream errors. The earliest error in each trace is where the cascade starts.",
      },
    ],
    review: [
      "Parse log lines one at a time and skip what isn't a JSON object.",
      "Follow a trace by id in time order; ISO times sort as text.",
      "Count errors by type to see what is common, and find each trace's first error to see what starts failures.",
      "Next module: delivering the program itself. The Application Delivery module: dependency locking, containers, CI and deployment checks.",
    ],
  },
];
