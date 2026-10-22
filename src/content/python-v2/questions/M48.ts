/**
 * M48 practice: ten independent problems on observability (repository-event services and the star API).
 * Structured log formatting and parsing, metrics and histograms, retries tested with injected sleeps, span reports and
 * incident queries over JSON log lines. Checks capture real log records and call functions with hidden inputs.
 * Version 2: replaces ten placeholder questions that printed fixed event names.
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
/** Formats log calls (using `_l`) with the learner's formatter and leaves the lines in `_lines`. */
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
const j = (o: Record<string, unknown>) => JSON.stringify(o);

export const m48Questions: PyQuestion[] = [
  {
    id: "PY-Q48-02",
    version: 2,
    slug: "server-error-rate",
    title: "The server error rate",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-literal", "logical", "membership", "none-value", "print-call", "print-several", "top-level-indent"],
    prompt: "The on-call dashboard shows the share of requests the service failed. Client mistakes (4xx) don't count as failures of the service; server errors (5xx) do. Compute the rate from a list of HTTP status codes.",
    spec: [
      ["Function", "`error_rate(statuses)`"],
      ["Returns", "the number of statuses from 500 to 599, divided by the number of statuses; `None` when there are no statuses"],
    ],
    hiddenKinds: ["only client errors", "every request failed", "a single request", "no requests", "a status of 499"],
    hints: [
      "Two counts: all statuses, and the ones in the 500s.",
      "A chained comparison `500 <= s <= 599` tests the range in one go.",
      "With no statuses there is no rate, and dividing by zero would crash: return `None` first.",
    ],
    explanation: "Counting statuses in 500–599 and dividing by the total gives the rate; an empty list has no rate, so `None` is returned before any division. Wrong answers count every status from 400 (blaming the service for bad requests) or return 0 for no traffic, which a dashboard would show as \"healthy\".",
    code: {
      starter: src`
def error_rate(statuses):
    return 0

print(error_rate([200, 200, 503, 404, 200, 500, 201, 200]))
`,
      answer: src`
def error_rate(statuses):
    if not statuses:
        return None
    errors = 0
    for status in statuses:
        if 500 <= status <= 599:
            errors += 1
    return errors / len(statuses)

print(error_rate([200, 200, 503, 404, 200, 500, 201, 200]))
`,
      alternatives: [
        src`
def error_rate(statuses):
    return sum(1 for s in statuses if s // 100 == 5) / len(statuses) if statuses else None
`,
      ],
      wrong: [
        {
          code: src`
def error_rate(statuses):
    if not statuses:
        return None
    return sum(1 for s in statuses if s >= 400) / len(statuses)
`,
          fails: ["returns"],
          why: "client errors such as 404 are counted as failures of the service",
        },
        {
          code: src`
def error_rate(statuses):
    if not statuses:
        return 0
    return sum(1 for s in statuses if s >= 500) / len(statuses)
`,
          fails: ["returns"],
          why: "no traffic is reported as a 0% error rate, which looks healthy when the service may be down",
        },
      ],
      task: {
        checks: [
          fn("returns", "error_rate", [
            example([[200, 200, 503, 404, 200, 500, 201, 200]], 0.25),
            example([[200, 201]], py.float(0)),
            example([[502, 200]], 0.5),
            hiddenCase("only client errors", [[400, 404, 429]], py.float(0)),
            hiddenCase("every request failed", [[500, 503]], py.float(1)),
            hiddenCase("a single request", [[504]], py.float(1)),
            hiddenCase("no requests", [[]], null),
            hiddenCase("a status of 499", [[499, 200]], py.float(0)),
          ], { label: "error_rate() is the share of 5xx statuses" }),
        ],
      },
    },
  },
  {
    id: "PY-Q48-03",
    version: 2,
    slug: "formatter-breaks-on-quotes",
    title: "The formatter that breaks on quotes",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "json-log", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "self-name", "string-index", "subclass", "top-level-indent", "truthiness"],
    prompt: "The log shipper rejects some lines from the ingest service as invalid JSON. It turns out to be every line whose message or field contains a double quote or a backslash, such as reasons like `Expecting \",\" delimiter`. Fix `JsonFormatter` so every line it writes is valid JSON with the same fields.",
    spec: [
      ["Class", "`JsonFormatter(logging.Formatter)`"],
      ["Each line", "a JSON object with `level`, `message` and, when present, `reason`"],
    ],
    hiddenKinds: ["a message with a backslash", "a record without a reason", "a message with a newline"],
    hints: [
      "Look at how the line is built: by gluing pieces of text together.",
      "A quote inside a value ends the JSON string early; JSON needs it escaped.",
      "Build a dictionary and let `json.dumps` do the quoting and escaping.",
    ],
    explanation: "Gluing text with `'\"' + value + '\"'` copies quotes, backslashes and newlines into the line unescaped, so the JSON is broken. `json.dumps` on a dictionary escapes them (`\\\"`, `\\\\`, `\\n`) and always produces one valid line. Replacing just `\"` with `'` is a half-fix that still fails on backslashes and newlines.",
    code: {
      starter: src`
import logging
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        line = '{"level": "' + record.levelname + '", "message": "' + record.getMessage() + '"'
        reason = getattr(record, "reason", None)
        if reason is not None:
            line += ', "reason": "' + reason + '"'
        return line + "}"

log = logging.getLogger("ingest")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("line rejected", extra={"reason": 'Expecting "," delimiter'})
`,
      answer: src`
import json
import logging
import sys

class JsonFormatter(logging.Formatter):
    def format(self, record):
        entry = {"level": record.levelname, "message": record.getMessage()}
        reason = getattr(record, "reason", None)
        if reason is not None:
            entry["reason"] = reason
        return json.dumps(entry)

log = logging.getLogger("ingest")
log.handlers.clear()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
log.addHandler(handler)
log.propagate = False
log.warning("line rejected", extra={"reason": 'Expecting "," delimiter'})
`,
      alternatives: [
        src`
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        fields = [("level", record.levelname), ("message", record.getMessage())]
        if hasattr(record, "reason"):
            fields.append(("reason", record.reason))
        return "{" + ", ".join(json.dumps(k) + ": " + json.dumps(v) for k, v in fields) + "}"
`,
      ],
      wrong: [
        {
          code: src`
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        message = record.getMessage().replace('"', "'")
        line = '{"level": "' + record.levelname + '", "message": "' + message + '"'
        reason = getattr(record, "reason", None)
        if reason is not None:
            line += ', "reason": "' + reason.replace('"', "'") + '"'
        return line + "}"
`,
          fails: ["returns", "backslash", "newline"],
          why: "swapping quotes changes the logged text and still breaks on backslashes and newlines",
        },
        {
          code: src`
import json
import logging

class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({"level": record.levelname, "message": record.getMessage(), "reason": getattr(record, "reason", None)})
`,
          fails: ["no-reason", "backslash", "newline"],
          why: "every line now has a `reason`, `null` when there is none, which isn't the line format the shipper expects",
        },
      ],
      task: {
        checks: [
          expr("returns", "a reason with double quotes", lines(formatted("q03a", "JsonFormatter()", "_l.warning('line rejected', extra={'reason': 'Expecting \",\" delimiter'})"), "import json as _j", "result = _j.loads(_lines[0])"), { level: "WARNING", message: "line rejected", reason: 'Expecting "," delimiter' }, { show: "log.warning('line rejected', extra={'reason': 'Expecting \",\" delimiter'})" }),
          expr("backslash", "a message with a backslash", lines(formatted("q03b", "JsonFormatter()", "_l.error('cannot open C:\\\\data\\\\hour.jsonl')"), "import json as _j", "result = _j.loads(_lines[0])"), { level: "ERROR", message: "cannot open C:\\data\\hour.jsonl" }, { hidden: true }),
          expr("no-reason", "a record without a reason", lines(formatted("q03c", "JsonFormatter()", "_l.info('hour loaded')"), "import json as _j", "result = _j.loads(_lines[0])"), { level: "INFO", message: "hour loaded" }, { hidden: true }),
          expr("newline", "a message with a newline", lines(formatted("q03d", "JsonFormatter()", "_l.warning('two\\nlines')"), "import json as _j", "result = (len(_lines), _j.loads(_lines[0]))"), py.tuple(py.int(1), pv({ level: "WARNING", message: "two\nlines" })), { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q48-06",
    version: 2,
    slug: "read-a-log-line",
    title: "Read one structured log line",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "conditional-expr", "dict-get", "except-type", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "logical", "membership", "none-value", "print-call", "print-text", "set-literal", "string-method", "top-level-indent", "try-except", "type-call"],
    prompt: "Log tools read logs one line at a time, and must never crash on a line they can't use. Turn one line of text into a log entry, or `None` if it isn't a usable entry.",
    spec: [
      ["Function", "`parse_log_line(line)`"],
      ["Usable", "the line (ignoring spaces at either end) is a JSON object whose `level` is one of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` and whose `message` is text"],
      ["Returns", "the parsed dictionary for a usable line; `None` for anything else (not JSON, not an object, missing or unknown level, missing message)"],
    ],
    hiddenKinds: ["a JSON list", "an unknown level", "a message that isn't text", "a line with a trailing newline", "an empty line"],
    hints: [
      "Parse inside `try` and return `None` when `json.JSONDecodeError` is raised.",
      "Then check the shape: a dictionary, a level from the allowed set, a message that is a `str`.",
      "Spaces and a newline at either end don't matter to `json.loads`, but an empty line does: it isn't JSON.",
    ],
    explanation: "Parsing in `try` turns any non-JSON line into `None`, and the shape checks reject JSON that isn't an entry. Checking `isinstance(entry, dict)` first matters: `[1]` or `\"ERROR\"` are valid JSON but calling `.get` on them would crash. Typical wrong answers catch `Exception` around everything (hiding bugs) or accept any level text.",
    code: {
      starter: src`
import json

def parse_log_line(line):
    return json.loads(line)

print(parse_log_line('{"level": "ERROR", "message": "query failed", "trace": "t-7f3a"}'))
print(parse_log_line("WARNING: connection pool is almost full"))
`,
      answer: src`
import json

LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}

def parse_log_line(line):
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        return None
    if not isinstance(entry, dict):
        return None
    if entry.get("level") not in LEVELS or not isinstance(entry.get("message"), str):
        return None
    return entry

print(parse_log_line('{"level": "ERROR", "message": "query failed", "trace": "t-7f3a"}'))
print(parse_log_line("WARNING: connection pool is almost full"))
`,
      alternatives: [
        src`
import json

def parse_log_line(line):
    text = line.strip()
    if not text.startswith("{"):
        return None
    try:
        entry = json.loads(text)
    except ValueError:
        return None
    ok = type(entry) is dict and entry.get("level") in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL") and type(entry.get("message")) is str
    return entry if ok else None
`,
      ],
      wrong: [
        {
          code: src`
import json

def parse_log_line(line):
    try:
        entry = json.loads(line)
    except json.JSONDecodeError:
        return None
    if "level" in entry and "message" in entry:
        return entry
    return None
`,
          fails: ["returns"],
          why: "any level text and any message value are accepted, and a JSON string line is searched like text",
        },
        {
          code: src`
import json

def parse_log_line(line):
    try:
        entry = json.loads(line)
        if entry["level"] in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL") and isinstance(entry["message"], str):
            return entry
    except json.JSONDecodeError:
        return None
    return None
`,
          fails: ["returns"],
          why: "a JSON list, or an object missing a field, crashes instead of giving `None`",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_log_line", [
            example([j({ level: "ERROR", message: "query failed", trace: "t-7f3a" })], { level: "ERROR", message: "query failed", trace: "t-7f3a" }),
            example(["WARNING: connection pool is almost full"], null),
            example([j({ level: "INFO" })], null),
            hiddenCase("a JSON list", ["[\"ERROR\", \"query failed\"]"], null),
            hiddenCase("an unknown level", [j({ level: "FATAL", message: "x" })], null),
            hiddenCase("a message that isn't text", [j({ level: "INFO", message: 42 })], null),
            hiddenCase("a line with a trailing newline", [j({ level: "DEBUG", message: "tick" }) + "\n"], { level: "DEBUG", message: "tick" }),
            hiddenCase("an empty line", [""], null),
          ], { label: "parse_log_line() returns usable entries and None for the rest" }),
        ],
      },
    },
  },
  {
    id: "PY-Q48-10",
    version: 2,
    slug: "slowest-requests",
    title: "The slowest requests in the log",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "comparison", "continue-statement", "dict-get", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "lambda", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "precedence", "print-call", "print-several", "string-index", "string-slice", "top-level-indent", "try-except", "type-call"],
    prompt: "During a latency incident you want the slowest requests first, with their trace ids, so you can open their traces. Read the API's JSON log lines and list the `n` slowest completed requests.",
    spec: [
      ["Function", "`slowest(lines, n)`"],
      ["Request", "a JSON object line with `message == \"request finished\"` and numeric `ms`, `trace` and `path` fields; other lines (other messages, non-JSON text) are ignored"],
      ["Returns", "up to `n` tuples `(trace, path, ms)`, slowest first; equal times by trace id"],
    ],
    hiddenKinds: ["fewer requests than n", "equal durations", "lines that aren't requests", "n of zero"],
    hints: [
      "Collect `(trace, path, ms)` for each line that is a finished request; skip the rest without crashing.",
      "Sort with a key of `(-ms, trace)`, then keep the first `n`.",
      "A slice past the end of a list is fine: it just returns what there is.",
    ],
    explanation: "Filtering on the fixed message (structured logging's payoff) and sorting by negative duration then trace gives a stable, repeatable order. Wrong answers sort by trace descending along with the time (`reverse=True` on the whole tuple) or crash on non-JSON lines.",
    code: {
      starter: src`
import json

def slowest(lines, n):
    return []

log = [
    '{"message": "request finished", "trace": "t-7f3a", "path": "/repos/lumen-labs/pyauth/stars", "ms": 2105}',
    '{"message": "request started", "trace": "t-91c0", "path": "/repos/tidewater/easystore"}',
    '{"message": "request finished", "trace": "t-91c0", "path": "/repos/tidewater/easystore", "ms": 88}',
    'WARNING: connection pool is almost full',
    '{"message": "request finished", "trace": "t-2b55", "path": "/repos/nimbus-io/cloudplot", "ms": 1840}',
]
print(slowest(log, 2))
`,
      answer: src`
import json

def slowest(lines, n):
    requests = []
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(entry, dict) and entry.get("message") == "request finished":
            requests.append((entry["trace"], entry["path"], entry["ms"]))
    requests.sort(key=lambda r: (-r[2], r[0]))
    return requests[:n]

log = [
    '{"message": "request finished", "trace": "t-7f3a", "path": "/repos/lumen-labs/pyauth/stars", "ms": 2105}',
    '{"message": "request started", "trace": "t-91c0", "path": "/repos/tidewater/easystore"}',
    '{"message": "request finished", "trace": "t-91c0", "path": "/repos/tidewater/easystore", "ms": 88}',
    'WARNING: connection pool is almost full',
    '{"message": "request finished", "trace": "t-2b55", "path": "/repos/nimbus-io/cloudplot", "ms": 1840}',
]
print(slowest(log, 2))
`,
      alternatives: [
        src`
import heapq
import json

def slowest(lines, n):
    finished = []
    for line in lines:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if type(e) is dict and e.get("message") == "request finished":
            finished.append((e["trace"], e["path"], e["ms"]))
    return heapq.nsmallest(n, finished, key=lambda r: (-r[2], r[0]))
`,
      ],
      wrong: [
        {
          code: src`
import json

def slowest(lines, n):
    requests = []
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("message") == "request finished":
            requests.append((entry["trace"], entry["path"], entry["ms"]))
    return sorted(requests, key=lambda r: (r[2], r[0]), reverse=True)[:n]
`,
            fails: ["returns"],
            why: "reversing the whole key also reverses the tie-break, so equal times come out by trace id descending",
          },
          {
            code: src`
import json

def slowest(lines, n):
    entries = [json.loads(line) for line in lines]
    done = [(e["trace"], e["path"], e["ms"]) for e in entries if e.get("message") == "request finished"]
    return sorted(done, key=lambda r: (-r[2], r[0]))[:n]
`,
            fails: ["returns"],
            why: "a single non-JSON line in the log crashes it",
          },
        ],
        task: {
          checks: [
            fn("returns", "slowest", [
              example([[
                j({ message: "request finished", trace: "t-7f3a", path: "/repos/lumen-labs/pyauth/stars", ms: 2105 }),
                j({ message: "request started", trace: "t-91c0", path: "/repos/tidewater/easystore" }),
                j({ message: "request finished", trace: "t-91c0", path: "/repos/tidewater/easystore", ms: 88 }),
                "WARNING: connection pool is almost full",
                j({ message: "request finished", trace: "t-2b55", path: "/repos/nimbus-io/cloudplot", ms: 1840 }),
              ], 2], [py.tuple(py.str("t-7f3a"), py.str("/repos/lumen-labs/pyauth/stars"), py.int(2105)), py.tuple(py.str("t-2b55"), py.str("/repos/nimbus-io/cloudplot"), py.int(1840))]),
              example([[j({ message: "request finished", trace: "a", path: "/x", ms: 5 })], 3], [py.tuple(py.str("a"), py.str("/x"), py.int(5))]),
              example([[], 1], []),
              hiddenCase("equal durations", [[j({ message: "request finished", trace: "t-b", path: "/p", ms: 300 }), j({ message: "request finished", trace: "t-a", path: "/q", ms: 300 }), j({ message: "request finished", trace: "t-c", path: "/r", ms: 10 })], 2], [py.tuple(py.str("t-a"), py.str("/q"), py.int(300)), py.tuple(py.str("t-b"), py.str("/p"), py.int(300))]),
              hiddenCase("lines that aren't requests", [["{oops", "[1]", j({ message: "request started", trace: "z", path: "/z" }), j({ message: "request finished", trace: "y", path: "/y", ms: 12.5 })], 5], [py.tuple(py.str("y"), py.str("/y"), py.float(12.5))]),
              hiddenCase("n of zero", [[j({ message: "request finished", trace: "a", path: "/x", ms: 5 })], 0], []),
            ], { label: "slowest() lists the slowest finished requests" }),
          ],
        },
      },
    },
  {
    id: "PY-Q48-12",
    version: 2,
    slug: "predict-the-retries",
    title: "Predict the retries",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "comparison", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "top-level-indent", "truthiness", "try-except", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Follow the list of planned outcomes: each call takes the next one.",
      "Only `TimeoutError` is retried; anything else leaves the loop at once.",
      "A wait happens only when another attempt is going to follow.",
    ],
    explanation: "The first call times out (wait 1), the second times out (wait 2), the third returns 'ok'. The second job meets a `KeyError` on its first try: it isn't retried, so no wait is added and the error is caught outside. The waits list is shared, so it shows the two waits of the first job only.",
    predict: {
      program: src`
outcomes = [TimeoutError(), TimeoutError(), "ok", KeyError("type")]
waits = []

def call():
    outcome = outcomes.pop(0)
    if isinstance(outcome, Exception):
        raise outcome
    return outcome

def with_retry(attempts):
    for n in range(attempts):
        try:
            return call()
        except TimeoutError:
            if n == attempts - 1:
                raise
            waits.append(2 ** n)

print(with_retry(4))
try:
    with_retry(4)
except KeyError as err:
    print("gave up on", err)
print(waits)
`,
      output: "ok\ngave up on 'type'\n[1, 2]\n",
      wrongPredictions: ["ok\ngave up on 'type'\n[1, 2, 1]", "ok\ngave up on type\n[1, 2]", "ok\n[1, 2, 4]", "ok\ngave up on 'type'\n[1, 2, 4]"],
    },
  },
  {
    id: "PY-Q48-13",
    version: 2,
    slug: "retry-that-hides-failures",
    title: "The retry that hides failures",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "list-literal", "membership", "none-value", "precedence", "print-call", "raise-stmt", "range-call", "string-format", "top-level-indent", "truthiness", "try-except", "unquoted-name", "while-loop"],
    prompt: "Two complaints about `fetch_with_retry`: a request with a malformed repository name takes seven seconds of waiting before anything happens, and when the star service is completely down, callers get `None` and show \"0 stars\" instead of an error. Fix it: retry only `TimeoutError`, wait `2**n` seconds through `sleep` between tries, and re-raise when the tries run out.",
    spec: [
      ["Function", "`fetch_with_retry(fetch, repo, sleep, attempts=4)`"],
      ["Retry", "only `TimeoutError`; any other exception is raised at once, without waiting"],
      ["Waits", "`sleep(2**n)` before the next try (1, 2, 4 …)"],
      ["Returns", "`fetch(repo)`'s result; raises the last `TimeoutError` after `attempts` tries"],
    ],
    hiddenKinds: ["a fetch that never answers", "a fetch that fails once", "a different number of attempts"],
    hints: [
      "Run the demo with a fetch that raises `ValueError`: how many sleeps happen?",
      "`except Exception` decides which errors are retried; narrow it.",
      "After the last try, the error must leave the function instead of the loop ending quietly.",
    ],
    explanation: "Catching `Exception` retried bad input that can never succeed, which produced the seven seconds of waits (1 + 2 + 4). Letting the loop finish returned `None`, which callers read as data. The fix catches only `TimeoutError` and re-raises on the last try, so a permanent error surfaces at once and an outage surfaces as an error.",
    code: {
      starter: src`
def fetch_with_retry(fetch, repo, sleep, attempts=4):
    for n in range(attempts):
        try:
            return fetch(repo)
        except Exception:
            if n < attempts - 1:
                sleep(2 ** n)
    return None

def bad_name(repo):
    raise ValueError(f"not a repository name: {repo!r}")

waits = []
try:
    fetch_with_retry(bad_name, "pyauth", waits.append)
except ValueError as err:
    print(err)
print(waits)
`,
      answer: src`
def fetch_with_retry(fetch, repo, sleep, attempts=4):
    for n in range(attempts):
        try:
            return fetch(repo)
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def bad_name(repo):
    raise ValueError(f"not a repository name: {repo!r}")

waits = []
try:
    fetch_with_retry(bad_name, "pyauth", waits.append)
except ValueError as err:
    print(err)
print(waits)
`,
      alternatives: [
        src`
def fetch_with_retry(fetch, repo, sleep, attempts=4):
    n = 0
    while True:
        try:
            return fetch(repo)
        except TimeoutError:
            n += 1
            if n >= attempts:
                raise
            sleep(2 ** (n - 1))
`,
      ],
      wrong: [
        {
          code: src`
def fetch_with_retry(fetch, repo, sleep, attempts=4):
    for n in range(attempts):
        try:
            return fetch(repo)
        except TimeoutError:
            if n < attempts - 1:
                sleep(2 ** n)
    return None
`,
          fails: ["down", "attempts"],
          why: "permanent errors now pass through, but an outage still ends in `None` instead of an error",
        },
        {
          code: src`
def fetch_with_retry(fetch, repo, sleep, attempts=4):
    for n in range(attempts):
        try:
            return fetch(repo)
        except Exception:
            if n == attempts - 1:
                raise
            sleep(2 ** n)
`,
          fails: ["permanent"],
          why: "outages now raise, but bad input is still retried with three pointless waits",
        },
      ],
      task: {
        checks: [
          expr("permanent", "bad input fails at once", lines(
            "_w = []",
            "def _bad(repo):",
            "    raise ValueError('not a repository name')",
            "try:",
            "    fetch_with_retry(_bad, 'pyauth', _w.append)",
            "    _what = 'returned'",
            "except ValueError:",
            "    _what = 'ValueError'",
            "result = (_what, _w)",
          ), py.tuple(py.str("ValueError"), pv([])), { show: "fetch_with_retry(fetch that raises ValueError, 'pyauth', sleep)" }),
          expr("down", "a fetch that never answers", lines(
            "_w = []",
            "def _down(repo):",
            "    raise TimeoutError('star service did not answer')",
            "try:",
            "    fetch_with_retry(_down, 'lumen-labs/pyauth', _w.append)",
            "    _what = 'returned'",
            "except TimeoutError:",
            "    _what = 'TimeoutError'",
            "result = (_what, _w)",
          ), py.tuple(py.str("TimeoutError"), pv([1, 2, 4])), { hidden: true }),
          expr("recovers", "a fetch that fails once", lines(
            "_w = []",
            "_calls = []",
            "def _once(repo):",
            "    _calls.append(repo)",
            "    if len(_calls) == 1:",
            "        raise TimeoutError()",
            "    return 2",
            "result = (fetch_with_retry(_once, 'tidewater/easystore', _w.append), _w)",
          ), py.tuple(py.int(2), pv([1])), { hidden: true }),
          expr("attempts", "a different number of attempts", lines(
            "_w = []",
            "def _down(repo):",
            "    raise TimeoutError()",
            "try:",
            "    fetch_with_retry(_down, 'x/y', _w.append, attempts=2)",
            "    _what = 'returned'",
            "except TimeoutError:",
            "    _what = 'TimeoutError'",
            "result = (_what, _w)",
          ), py.tuple(py.str("TimeoutError"), pv([1])), { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q48-16",
    version: 2,
    slug: "latency-histogram",
    title: "Turn durations into histogram buckets",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "bisect-call", "comparison", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-loop", "print-call", "print-several", "string-index", "top-level-indent"],
    prompt: "Monitoring systems store durations as histograms with cumulative buckets: for each upper bound, how many requests took at most that long, plus a final bucket counting everything. From those counts any percentile can be estimated later. Build the buckets from raw durations.",
    spec: [
      ["Function", "`histogram(durations, bounds)`"],
      ["bounds", "upper bounds in milliseconds, in increasing order (e.g. `[50, 100, 250, 1000]`)"],
      ["Returns", "a list of `(bound, count)` tuples, one per bound, where `count` is the number of durations **≤ bound**, followed by `(\"+Inf\", total)`"],
      ["Rule", "the inputs are not changed"],
    ],
    hiddenKinds: ["a duration exactly on a bound", "durations above every bound", "no durations", "a single bound"],
    hints: [
      "Each bucket counts every duration up to its bound, so a fast request is counted in every bucket.",
      "For each bound, count the durations `<=` it; the last bucket is simply the number of durations.",
      "Build new tuples; don't sort or change the lists you were given.",
    ],
    explanation: "Cumulative buckets make the last bucket equal to the total and every count at least the previous one, which is what lets monitoring systems estimate percentiles and merge histograms from many servers. Wrong answers count each duration only in its own bucket (not cumulative) or use `<`, which drops values that sit exactly on a bound.",
    code: {
      starter: src`
def histogram(durations, bounds):
    return []

print(histogram([12, 48, 50, 95, 180, 640, 2400], [50, 100, 250, 1000]))
`,
      answer: src`
def histogram(durations, bounds):
    buckets = []
    for bound in bounds:
        count = 0
        for ms in durations:
            if ms <= bound:
                count += 1
        buckets.append((bound, count))
    buckets.append(("+Inf", len(durations)))
    return buckets

print(histogram([12, 48, 50, 95, 180, 640, 2400], [50, 100, 250, 1000]))
`,
      alternatives: [
        src`
import bisect

def histogram(durations, bounds):
    ordered = sorted(durations)
    rows = [(b, bisect.bisect_right(ordered, b)) for b in bounds]
    return rows + [("+Inf", len(ordered))]
`,
      ],
      wrong: [
        {
          code: src`
def histogram(durations, bounds):
    counts = [0] * len(bounds)
    for ms in durations:
        for i, bound in enumerate(bounds):
            if ms <= bound:
                counts[i] += 1
                break
    return [(b, c) for b, c in zip(bounds, counts)] + [("+Inf", len(durations))]
`,
            fails: ["returns"],
            why: "each duration is counted only in its own bucket, so the buckets aren't cumulative",
          },
          {
            code: src`
def histogram(durations, bounds):
    return [(b, sum(1 for ms in durations if ms < b)) for b in bounds] + [("+Inf", len(durations))]
`,
            fails: ["returns"],
            why: "`<` leaves out durations exactly on a bound, which belong in that bucket",
          },
        ],
        task: {
          checks: [
            fn("returns", "histogram", [
              example([[12, 48, 50, 95, 180, 640, 2400], [50, 100, 250, 1000]], [py.tuple(py.int(50), py.int(3)), py.tuple(py.int(100), py.int(4)), py.tuple(py.int(250), py.int(5)), py.tuple(py.int(1000), py.int(6)), py.tuple(py.str("+Inf"), py.int(7))]),
              example([[5, 5], [10]], [py.tuple(py.int(10), py.int(2)), py.tuple(py.str("+Inf"), py.int(2))]),
              example([[], [100, 200]], [py.tuple(py.int(100), py.int(0)), py.tuple(py.int(200), py.int(0)), py.tuple(py.str("+Inf"), py.int(0))]),
              hiddenCase("a duration exactly on a bound", [[100], [100, 500]], [py.tuple(py.int(100), py.int(1)), py.tuple(py.int(500), py.int(1)), py.tuple(py.str("+Inf"), py.int(1))]),
              hiddenCase("durations above every bound", [[3000, 4500], [50, 100]], [py.tuple(py.int(50), py.int(0)), py.tuple(py.int(100), py.int(0)), py.tuple(py.str("+Inf"), py.int(2))]),
              hiddenCase("fractional milliseconds", [[0.4, 99.9, 100.1], [100]], [py.tuple(py.int(100), py.int(2)), py.tuple(py.str("+Inf"), py.int(3))]),
            ], { label: "histogram() builds cumulative buckets" }),
            fn("keeps-input", "histogram", [keepsInput([[300, 20, 90], [50, 100]], { label: "durations in arrival order" })], { label: "histogram() leaves its inputs unchanged" }),
          ],
        },
      },
    },
  {
    id: "PY-Q48-19",
    version: 2,
    slug: "test-the-retry-helper",
    title: "Test the retry helper",
    format: "testing",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comparison", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-literal", "list-mutate", "membership", "raise-stmt", "range-call", "reassignment", "test-func", "top-level-indent", "truthiness", "try-except", "unittest-case", "with-statement"],
    prompt: "`retry_call(func, attempts, sleep)` is shared by every service, so its contract must be pinned by tests: it returns `func()`'s result; it retries only `TimeoutError`, calling `sleep(2**n)` between tries (1, 2, 4 …); it re-raises the last `TimeoutError` after `attempts` tries; any other exception is raised immediately without sleeping. Write tests (unittest or `test_` functions) that pass for a correct helper and fail for broken ones. Fake `func` and `sleep` with small functions or `unittest.mock.Mock`; nothing should really sleep. Leave the calls to Check.",
    spec: [
      ["Target", "`retry_call(func, attempts, sleep)`"],
      ["Your tests", "test functions or a TestCase in your file; the starter's helper is correct"],
      ["Graded", "pass for a correct helper, fail for each of three broken helpers"],
    ],
    hiddenKinds: ["a helper that retries every exception", "a helper that returns None when it gives up", "a helper that always waits one second"],
    hints: [
      "Record what the helper does: a list for the sleeps, a counter (or a Mock) for the calls.",
      "One test per promise: success after timeouts (check the waits), giving up (check the exception), a permanent error (check no waits).",
      "`assertRaises(TimeoutError)` checks the give-up case; compare the collected waits with `[1, 2]` exactly.",
    ],
    explanation: "Each defect breaks one promise, so each needs a test of that promise: a ValueError test with no waits catches the helper that retries everything; a give-up test with `assertRaises` catches the one that returns `None`; checking the exact list of waits catches the constant delay. Recording calls instead of sleeping keeps the tests instant.",
    code: {
      starter: src`
import unittest
from unittest import mock

def retry_call(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

class RetryCallTest(unittest.TestCase):
    def test_returns_the_result(self):
        self.assertEqual(retry_call(lambda: 2, 3, mock.Mock()), 2)
`,
      answer: src`
import unittest
from unittest import mock

def retry_call(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

class RetryCallTest(unittest.TestCase):
    def test_returns_the_result(self):
        self.assertEqual(retry_call(lambda: 2, 3, mock.Mock()), 2)

    def test_backs_off_then_succeeds(self):
        func = mock.Mock(side_effect=[TimeoutError(), TimeoutError(), "ok"])
        waits = []
        self.assertEqual(retry_call(func, 4, waits.append), "ok")
        self.assertEqual(waits, [1, 2])

    def test_gives_up_with_the_error(self):
        func = mock.Mock(side_effect=TimeoutError("down"))
        waits = []
        with self.assertRaises(TimeoutError):
            retry_call(func, 3, waits.append)
        self.assertEqual(func.call_count, 3)

    def test_permanent_error_is_not_retried(self):
        func = mock.Mock(side_effect=ValueError("bad repo"))
        sleep = mock.Mock()
        with self.assertRaises(ValueError):
            retry_call(func, 4, sleep)
        sleep.assert_not_called()
`,
      alternatives: [
        src`
def retry_call(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

def flaky(outcomes):
    def func():
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome
    return func

def test_contract():
    waits = []
    assert retry_call(flaky([TimeoutError(), TimeoutError(), 7]), 5, waits.append) == 7
    assert waits == [1, 2]
    try:
        retry_call(flaky([TimeoutError()] * 2), 2, waits.append)
        assert False, "should give up with TimeoutError"
    except TimeoutError:
        pass
    waits.clear()
    try:
        retry_call(flaky([KeyError("x")]), 3, waits.append)
        assert False, "should raise KeyError"
    except KeyError:
        pass
    assert waits == []
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from unittest import mock

def retry_call(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

class RetryCallTest(unittest.TestCase):
    def test_returns_the_result(self):
        self.assertEqual(retry_call(lambda: 2, 3, mock.Mock()), 2)

    def test_eventually_succeeds(self):
        func = mock.Mock(side_effect=[TimeoutError(), "ok"])
        self.assertEqual(retry_call(func, 3, mock.Mock()), "ok")
`,
          fails: ["tests-1", "tests-2", "tests-3"],
          why: "only the happy paths are tested, and the waits are never checked",
        },
        {
          code: src`
import unittest
from unittest import mock

def retry_call(func, attempts, sleep):
    for n in range(attempts):
        try:
            return func()
        except TimeoutError:
            if n == attempts - 1:
                raise
            sleep(2 ** n)

class RetryCallTest(unittest.TestCase):
    def test_backs_off_then_succeeds(self):
        func = mock.Mock(side_effect=[TimeoutError(), TimeoutError(), "ok"])
        waits = []
        self.assertEqual(retry_call(func, 4, waits.append), "ok")
        self.assertEqual(waits, [1, 2])

    def test_permanent_error_is_not_retried(self):
        sleep = mock.Mock()
        with self.assertRaises(ValueError):
            retry_call(mock.Mock(side_effect=ValueError()), 4, sleep)
        sleep.assert_not_called()
`,
          fails: ["tests-2"],
          why: "nothing tests what happens when every try times out",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "retry_call",
          correct: "def retry_call(func, attempts, sleep):\n    for n in range(attempts):\n        try:\n            return func()\n        except TimeoutError:\n            if n == attempts - 1:\n                raise\n            sleep(2 ** n)\n",
          defects: [
            { label: "a helper that retries every exception", code: "def retry_call(func, attempts, sleep):\n    for n in range(attempts):\n        try:\n            return func()\n        except Exception:\n            if n == attempts - 1:\n                raise\n            sleep(2 ** n)\n" },
            { label: "a helper that returns None when it gives up", code: "def retry_call(func, attempts, sleep):\n    for n in range(attempts):\n        try:\n            return func()\n        except TimeoutError:\n            if n < attempts - 1:\n                sleep(2 ** n)\n    return None\n" },
            { label: "a helper that always waits one second", code: "def retry_call(func, attempts, sleep):\n    for n in range(attempts):\n        try:\n            return func()\n        except TimeoutError:\n            if n == attempts - 1:\n                raise\n            sleep(1)\n" },
          ],
        }), [2, 3]),
      },
    },
  },
  {
    id: "PY-Q48-20",
    version: 2,
    slug: "trace-report-from-span-logs",
    title: "A trace report from span logs",
    format: "integration",
    difficulty: "hard",
    minutes: 30,
    requires: ["aggregate-call", "any-call", "arithmetic", "assignment", "continue-statement", "defaultdict-call", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "lambda", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-index", "nested-loop", "none-value", "precedence", "print-call", "string-index", "top-level-indent", "truthiness", "try-except", "type-call", "yield-expr"],
    prompt: "The services log one JSON line per finished span. Combine parsing (L01), spans (L03) and investigation (L05) into one report: for each trace, how many spans it had, how long its root span took, whether anything failed, and which step had the largest self time.",
    spec: [
      ["Function", "`trace_report(lines)`"],
      ["Span line", "a JSON object with `trace`, `span`, `parent` (`null` for the root), `name`, `ms` and `error` (`null` or an error type); other lines are skipped"],
      ["Returns", "`{trace: {\"spans\": n, \"ms\": root ms, \"failed\": True/False, \"hotspot\": name}}` with traces in sorted order"],
      ["hotspot", "the span with the largest self time (`ms` minus its direct children's `ms`); ties by name"],
      ["failed", "`True` when any span of the trace has a non-null `error`"],
    ],
    hiddenKinds: ["a trace whose only span failed", "two traces interleaved", "a hotspot tie", "non-JSON lines between spans", "no spans"],
    hints: [
      "Parse safely and group the span dictionaries by trace first.",
      "Within one trace: total the children's `ms` per parent id, then compute each span's self time.",
      "The root is the span whose parent is `None`; `failed` is whether any span has an error.",
    ],
    explanation: "Grouping by trace, then reusing the self-time idea from L03 within each group, gives a hotspot that ignores time spent in children. Using the root span's own `ms` as the trace duration avoids adding up nested spans twice. Wrong answers pick the span with the largest total `ms` (always the root) or sum every span's `ms` as the duration.",
    code: {
      starter: src`
import json

def trace_report(lines):
    return {}

log = [
    '{"trace": "t-7f3a", "span": "s2", "parent": "s1", "name": "check token", "ms": 8, "error": null}',
    '{"trace": "t-7f3a", "span": "s4", "parent": "s3", "name": "sqlite execute", "ms": 2000, "error": "OperationalError"}',
    '{"trace": "t-7f3a", "span": "s3", "parent": "s1", "name": "query stars", "ms": 2010, "error": "OperationalError"}',
    '{"trace": "t-7f3a", "span": "s1", "parent": null, "name": "GET /stars", "ms": 2025, "error": "TimeoutError"}',
    'WARNING: connection pool is almost full',
    '{"trace": "t-91c0", "span": "s1", "parent": null, "name": "GET /stars", "ms": 88, "error": null}',
    '{"trace": "t-91c0", "span": "s2", "parent": "s1", "name": "render json", "ms": 20, "error": null}',
]
print(trace_report(log))
`,
      answer: src`
import json

def trace_report(lines):
    traces = {}
    for line in lines:
        try:
            span = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(span, dict) and "trace" in span:
            traces.setdefault(span["trace"], []).append(span)
    report = {}
    for trace in sorted(traces):
        spans = traces[trace]
        below = {}
        for span in spans:
            if span["parent"] is not None:
                below[span["parent"]] = below.get(span["parent"], 0) + span["ms"]
        own = sorted(((-(s["ms"] - below.get(s["span"], 0)), s["name"]) for s in spans))
        root = [s for s in spans if s["parent"] is None][0]
        report[trace] = {
            "spans": len(spans),
            "ms": root["ms"],
            "failed": any(s["error"] is not None for s in spans),
            "hotspot": own[0][1],
        }
    return report

log = [
    '{"trace": "t-7f3a", "span": "s2", "parent": "s1", "name": "check token", "ms": 8, "error": null}',
    '{"trace": "t-7f3a", "span": "s4", "parent": "s3", "name": "sqlite execute", "ms": 2000, "error": "OperationalError"}',
    '{"trace": "t-7f3a", "span": "s3", "parent": "s1", "name": "query stars", "ms": 2010, "error": "OperationalError"}',
    '{"trace": "t-7f3a", "span": "s1", "parent": null, "name": "GET /stars", "ms": 2025, "error": "TimeoutError"}',
    'WARNING: connection pool is almost full',
    '{"trace": "t-91c0", "span": "s1", "parent": null, "name": "GET /stars", "ms": 88, "error": null}',
    '{"trace": "t-91c0", "span": "s2", "parent": "s1", "name": "render json", "ms": 20, "error": null}',
]
print(trace_report(log))
`,
      alternatives: [
        src`
import json
from collections import defaultdict

def parse(lines):
    for line in lines:
        try:
            value = json.loads(line)
        except ValueError:
            continue
        if type(value) is dict:
            yield value

def summarise(spans):
    children = defaultdict(int)
    for s in spans:
        if s["parent"]:
            children[s["parent"]] += s["ms"]
    best = min(spans, key=lambda s: (children[s["span"]] - s["ms"], s["name"]))
    root = next(s for s in spans if s["parent"] is None)
    return {"spans": len(spans), "ms": root["ms"], "failed": any(s["error"] for s in spans), "hotspot": best["name"]}

def trace_report(lines):
    groups = defaultdict(list)
    for span in parse(lines):
        groups[span["trace"]].append(span)
    return {trace: summarise(groups[trace]) for trace in sorted(groups)}
`,
      ],
      wrong: [
        {
          code: src`
import json

def trace_report(lines):
    traces = {}
    for line in lines:
        try:
            span = json.loads(line)
        except json.JSONDecodeError:
            continue
        traces.setdefault(span["trace"], []).append(span)
    report = {}
    for trace in sorted(traces):
        spans = traces[trace]
        slowest = max(spans, key=lambda s: s["ms"])
        report[trace] = {"spans": len(spans), "ms": sum(s["ms"] for s in spans), "failed": any(s["error"] for s in spans), "hotspot": slowest["name"]}
    return report
`,
            fails: ["returns", "interleaved", "failed-inside", "tie"],
            why: "the duration adds nested spans twice and the hotspot is always the root, which spends almost no time itself",
          },
          {
            code: src`
import json

def trace_report(lines):
    traces = {}
    for line in lines:
        try:
            span = json.loads(line)
        except json.JSONDecodeError:
            continue
        traces.setdefault(span["trace"], []).append(span)
    report = {}
    for trace in sorted(traces):
        spans = traces[trace]
        below = {}
        for s in spans:
            if s["parent"] is not None:
                below[s["parent"]] = below.get(s["parent"], 0) + s["ms"]
        best = max(spans, key=lambda s: s["ms"] - below.get(s["span"], 0))
        root = [s for s in spans if s["parent"] is None][0]
        report[trace] = {"spans": len(spans), "ms": root["ms"], "failed": root["error"] is not None, "hotspot": best["name"]}
    return report
`,
            fails: ["failed-inside", "tie"],
            why: "only the root's error is checked, so a failure handled lower down is missed, and ties take the first span listed",
          },
        ],
        task: {
          checks: [
            fn("returns", "trace_report", [
              example([[
                '{"trace": "t-7f3a", "span": "s2", "parent": "s1", "name": "check token", "ms": 8, "error": null}',
                '{"trace": "t-7f3a", "span": "s4", "parent": "s3", "name": "sqlite execute", "ms": 2000, "error": "OperationalError"}',
                '{"trace": "t-7f3a", "span": "s3", "parent": "s1", "name": "query stars", "ms": 2010, "error": "OperationalError"}',
                '{"trace": "t-7f3a", "span": "s1", "parent": null, "name": "GET /stars", "ms": 2025, "error": "TimeoutError"}',
                "WARNING: connection pool is almost full",
                '{"trace": "t-91c0", "span": "s1", "parent": null, "name": "GET /stars", "ms": 88, "error": null}',
                '{"trace": "t-91c0", "span": "s2", "parent": "s1", "name": "render json", "ms": 20, "error": null}',
              ]], { "t-7f3a": { spans: 4, ms: 2025, failed: true, hotspot: "sqlite execute" }, "t-91c0": { spans: 2, ms: 88, failed: false, hotspot: "GET /stars" } }),
              example([['{"trace": "a", "span": "1", "parent": null, "name": "job", "ms": 5, "error": "KeyError"}']], { a: { spans: 1, ms: 5, failed: true, hotspot: "job" } }),
              example([[]], {}),
            ], { label: "trace_report() summarises each trace" }),
            fn("interleaved", "trace_report", [hiddenCase("two traces interleaved", [[
              '{"trace": "z", "span": "1", "parent": null, "name": "req", "ms": 100, "error": null}',
              '{"trace": "y", "span": "1", "parent": null, "name": "req", "ms": 50, "error": null}',
              '{"trace": "z", "span": "2", "parent": "1", "name": "db", "ms": 90, "error": null}',
              '{"trace": "y", "span": "2", "parent": "1", "name": "cache", "ms": 10, "error": null}',
            ]], { y: { spans: 2, ms: 50, failed: false, hotspot: "req" }, z: { spans: 2, ms: 100, failed: false, hotspot: "db" } })], { label: "traces are grouped correctly" }),
            fn("failed-inside", "trace_report", [hiddenCase("an error caught below the root", [['{"trace": "t", "span": "1", "parent": null, "name": "req", "ms": 30, "error": null}', '{"trace": "t", "span": "2", "parent": "1", "name": "retry fetch", "ms": 25, "error": "TimeoutError"}']], { t: { spans: 2, ms: 30, failed: true, hotspot: "retry fetch" } })], { label: "any failing span marks the trace failed" }),
            fn("tie", "trace_report", [hiddenCase("a hotspot tie", [['{"trace": "q", "span": "1", "parent": null, "name": "root", "ms": 20, "error": null}', '{"trace": "q", "span": "3", "parent": "1", "name": "zip", "ms": 10, "error": null}', '{"trace": "q", "span": "2", "parent": "1", "name": "load", "ms": 10, "error": null}']], { q: { spans: 3, ms: 20, failed: false, hotspot: "load" } })], { label: "hotspot ties are broken by name" }),
          ],
        },
      },
    },
  {
    id: "PY-Q48-22",
    version: 2,
    slug: "minutes-to-alert-on",
    title: "Which minutes should have alerted?",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "counter-call", "dict-get", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "precedence", "print-call", "print-several", "string-index", "top-level-indent", "try-except", "tuple-unpack", "type-call"],
    prompt: "After an incident, the team wants to tune the alert rule: *alert when, in any one minute, at least `min_requests` requests finished and at least `threshold` of them were server errors.* Replay the rule over the request log and list the minutes that would have alerted.",
    spec: [
      ["Function", "`alert_minutes(lines, threshold, min_requests)`"],
      ["Request", "a JSON object line with `message == \"request finished\"`, an ISO `time` like `2025-03-03T09:00:12Z` and an integer `status`; other lines are skipped"],
      ["Minute", "the first 16 characters of `time` (`2025-03-03T09:00`)"],
      ["Alert", "requests in the minute ≥ `min_requests` **and** (statuses 500–599) ÷ requests ≥ `threshold`"],
      ["Returns", "the alerting minutes, sorted"],
    ],
    hiddenKinds: ["a quiet minute full of errors", "a rate exactly at the threshold", "lines out of time order", "client errors only", "no requests"],
    hints: [
      "Group by minute: for each minute keep two counts, requests and server errors.",
      "The minute is a slice of the time text, and ISO minutes sort correctly as text.",
      "Both conditions must hold: enough traffic to matter, and a high enough error share (`>=` for both).",
    ],
    explanation: "Per-minute counters (a metric) are derived from structured log lines (an event record) and then the rule is applied to each minute. The `min_requests` condition keeps one failed request at 3 a.m. from paging someone. Wrong answers compute one overall rate, count 4xx as errors, or use `>` and miss a minute exactly at the threshold.",
    code: {
      starter: src`
import json

def alert_minutes(lines, threshold, min_requests):
    return []

log = [
    '{"time": "2025-03-03T09:00:05Z", "message": "request finished", "status": 200}',
    '{"time": "2025-03-03T09:00:41Z", "message": "request finished", "status": 503}',
    '{"time": "2025-03-03T09:01:02Z", "message": "request finished", "status": 503}',
    '{"time": "2025-03-03T09:01:15Z", "message": "request finished", "status": 500}',
    '{"time": "2025-03-03T09:01:30Z", "message": "request finished", "status": 200}',
    '{"time": "2025-03-03T09:01:59Z", "message": "request started"}',
]
print(alert_minutes(log, 0.5, 3))
`,
      answer: src`
import json

def alert_minutes(lines, threshold, min_requests):
    totals = {}
    errors = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(entry, dict) or entry.get("message") != "request finished":
            continue
        minute = entry["time"][:16]
        totals[minute] = totals.get(minute, 0) + 1
        if 500 <= entry["status"] <= 599:
            errors[minute] = errors.get(minute, 0) + 1
    alerting = []
    for minute in sorted(totals):
        count = totals[minute]
        if count >= min_requests and errors.get(minute, 0) / count >= threshold:
            alerting.append(minute)
    return alerting

log = [
    '{"time": "2025-03-03T09:00:05Z", "message": "request finished", "status": 200}',
    '{"time": "2025-03-03T09:00:41Z", "message": "request finished", "status": 503}',
    '{"time": "2025-03-03T09:01:02Z", "message": "request finished", "status": 503}',
    '{"time": "2025-03-03T09:01:15Z", "message": "request finished", "status": 500}',
    '{"time": "2025-03-03T09:01:30Z", "message": "request finished", "status": 200}',
    '{"time": "2025-03-03T09:01:59Z", "message": "request started"}',
]
print(alert_minutes(log, 0.5, 3))
`,
      alternatives: [
        src`
import json
from collections import Counter

def alert_minutes(lines, threshold, min_requests):
    seen, bad = Counter(), Counter()
    for line in lines:
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if type(e) is dict and e.get("message") == "request finished":
            seen[e["time"][:16]] += 1
            bad[e["time"][:16]] += e["status"] // 100 == 5
    return sorted(m for m in seen if seen[m] >= min_requests and bad[m] >= threshold * seen[m])
`,
      ],
      wrong: [
        {
          code: src`
import json

def alert_minutes(lines, threshold, min_requests):
    totals = {}
    errors = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("message") != "request finished":
            continue
        minute = entry["time"][:16]
        totals[minute] = totals.get(minute, 0) + 1
        if entry["status"] >= 400:
            errors[minute] = errors.get(minute, 0) + 1
    return sorted(m for m in totals if totals[m] >= min_requests and errors.get(m, 0) / totals[m] >= threshold)
`,
            fails: ["returns"],
            why: "client errors (4xx) are counted as failures of the service",
          },
          {
            code: src`
import json

def alert_minutes(lines, threshold, min_requests):
    totals = {}
    errors = {}
    for line in lines:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("message") != "request finished":
            continue
        minute = entry["time"][:16]
        totals[minute] = totals.get(minute, 0) + 1
        if 500 <= entry["status"] <= 599:
            errors[minute] = errors.get(minute, 0) + 1
    return sorted(m for m in totals if totals[m] >= min_requests and errors.get(m, 0) / totals[m] > threshold)
`,
            fails: ["returns"],
            why: "`>` misses a minute whose error share is exactly the threshold",
          },
        ],
        task: {
          checks: [
            fn("returns", "alert_minutes", [
              example([[
                '{"time": "2025-03-03T09:00:05Z", "message": "request finished", "status": 200}',
                '{"time": "2025-03-03T09:00:41Z", "message": "request finished", "status": 503}',
                '{"time": "2025-03-03T09:01:02Z", "message": "request finished", "status": 503}',
                '{"time": "2025-03-03T09:01:15Z", "message": "request finished", "status": 500}',
                '{"time": "2025-03-03T09:01:30Z", "message": "request finished", "status": 200}',
                '{"time": "2025-03-03T09:01:59Z", "message": "request started"}',
              ], 0.5, 3], ["2025-03-03T09:01"]),
              example([[], 0.1, 1], []),
              example([['{"time": "2025-03-03T10:00:00Z", "message": "request finished", "status": 502}'], 0.5, 1], ["2025-03-03T10:00"]),
              hiddenCase("a quiet minute full of errors", [['{"time": "2025-03-03T03:12:00Z", "message": "request finished", "status": 500}'], 0.5, 5], []),
              hiddenCase("a rate exactly at the threshold", [['{"time": "2025-03-03T09:05:01Z", "message": "request finished", "status": 500}', '{"time": "2025-03-03T09:05:02Z", "message": "request finished", "status": 200}', '{"time": "2025-03-03T09:05:03Z", "message": "request finished", "status": 200}', '{"time": "2025-03-03T09:05:04Z", "message": "request finished", "status": 200}'], 0.25, 4], ["2025-03-03T09:05"]),
              hiddenCase("lines out of time order", [['{"time": "2025-03-03T09:07:10Z", "message": "request finished", "status": 503}', '{"time": "2025-03-03T09:06:10Z", "message": "request finished", "status": 503}', "not json", '{"time": "2025-03-03T09:07:50Z", "message": "request finished", "status": 503}'], 0.9, 1], ["2025-03-03T09:06", "2025-03-03T09:07"]),
              hiddenCase("client errors only", [['{"time": "2025-03-03T09:08:00Z", "message": "request finished", "status": 404}', '{"time": "2025-03-03T09:08:01Z", "message": "request finished", "status": 429}'], 0.1, 1], []),
            ], { label: "alert_minutes() replays the alert rule minute by minute" }),
          ],
        },
      },
    },
];
