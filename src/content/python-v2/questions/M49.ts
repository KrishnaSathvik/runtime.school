/**
 * M49 practice: ten independent problems on delivering an application (Runtime Market's API and worker).
 * Lock-file reviews, Dockerfile checks, reading test summaries, environment files and settings, readiness checks and
 * migrations against real SQLite databases. Docker and CI themselves can't run here; those questions analyse real
 * Dockerfile and log text with Python, and say so. Version 2: replaces ten placeholder questions about fixed strings.
 */
import type { PyQuestion } from "../model";
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
const t = (...items: unknown[]) => py.tuple(...items.map(pv));
/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: ReturnType<typeof learnerTests>, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `tests-${n}`) ? { ...c, hidden: true } : c));

export const m49Questions: PyQuestion[] = [
  {
    id: "PY-Q49-02",
    version: 2,
    slug: "check-the-cmd-line",
    title: "Check a Dockerfile's CMD",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["all-call", "assignment", "comparison", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "len-call", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "string-index", "string-method", "top-level-indent", "try-except", "type-call"],
    prompt: "A Dockerfile review bot checks the argument of the `CMD` instruction (the text after `CMD `). Exec form, a JSON array of strings, lets the program receive stop signals directly; shell form doesn't. Report what is wrong with the argument, or `None` when it is fine. (Docker itself can't run here; this checks Dockerfile text.)",
    spec: [
      ["Function", "`cmd_problem(args)`; `args` is the text after `CMD `"],
      ["Returns", "`\"use exec form\"` when the text isn't valid JSON; `\"CMD must be a list of strings\"` when it is JSON but not a non-empty list of strings; otherwise `None`"],
    ],
    hiddenKinds: ["an empty JSON list", "a list containing a number", "single quotes instead of double quotes", "a JSON string instead of a list"],
    hints: [
      "Try `json.loads` and catch `json.JSONDecodeError` for the first message.",
      "Then check the parsed value: a list, not empty, and every item a `str`.",
      "Single quotes are not JSON, so `['python', 'app.py']` is shell form as far as Docker is concerned.",
    ],
    explanation: "Docker treats the argument as exec form only when it parses as a JSON array; anything else is run through `/bin/sh -c`. So the check is: parse as JSON (refuse otherwise), then require a non-empty list of strings. `['python', 'app.py']` with single quotes looks like a list but isn't JSON, which is exactly the mistake Docker silently accepts as shell form.",
    code: {
      starter: src`
import json

def cmd_problem(args):
    return None

for args in ['["python", "-m", "market.server"]', "python -m market.server", '["python", 8000]']:
    print(args, "->", cmd_problem(args))
`,
      answer: src`
import json

def cmd_problem(args):
    try:
        value = json.loads(args)
    except json.JSONDecodeError:
        return "use exec form"
    if not isinstance(value, list) or not value or not all(isinstance(item, str) for item in value):
        return "CMD must be a list of strings"
    return None

for args in ['["python", "-m", "market.server"]', "python -m market.server", '["python", 8000]']:
    print(args, "->", cmd_problem(args))
`,
      alternatives: [
        src`
import json

def cmd_problem(args):
    try:
        parts = json.loads(args.strip())
    except ValueError:
        return "use exec form"
    if type(parts) is list and len(parts) > 0 and all(type(p) is str for p in parts):
        return None
    return "CMD must be a list of strings"
`,
      ],
      wrong: [
        {
          code: src`
def cmd_problem(args):
    if args.startswith("[") and args.endswith("]"):
        return None
    return "use exec form"
`,
          fails: ["returns"],
          why: "anything in brackets passes, including single-quoted lists Docker runs through a shell",
        },
        {
          code: src`
import json

def cmd_problem(args):
    try:
        json.loads(args)
    except json.JSONDecodeError:
        return "use exec form"
    return None
`,
          fails: ["returns"],
          why: "any JSON passes: a string, a number or an empty list is not a command",
        },
      ],
      task: {
        checks: [
          fn("returns", "cmd_problem", [
            example(['["python", "-m", "market.server"]'], null),
            example(["python -m market.server"], "use exec form"),
            example(['["python", 8000]'], "CMD must be a list of strings"),
            hiddenCase("an empty JSON list", ["[]"], "CMD must be a list of strings"),
            hiddenCase("a list containing a number", ['["gunicorn", "-w", 4]'], "CMD must be a list of strings"),
            hiddenCase("single quotes instead of double quotes", ["['python', 'app.py']"], "use exec form"),
            hiddenCase("a JSON string instead of a list", ['"python app.py"'], "CMD must be a list of strings"),
          ], { label: "cmd_problem() reports what is wrong with CMD" }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-03",
    version: 2,
    slug: "read-the-test-summary",
    title: "Read unittest's summary line",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "conversion", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-mutate", "membership", "print-call", "print-text", "regex-call", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "The CI dashboard reads the last line of each test run, such as `FAILED (failures=1, errors=2)` or `OK (skipped=3)`, and shows the counts. It shows 0 errors for every red build and crashes on runs with skipped tests. Fix `summary_counts` so it returns the right counts for every form of the line.",
    spec: [
      ["Function", "`summary_counts(line)`"],
      ["Line", "`OK`, `OK (skipped=1)`, `FAILED (failures=2)`, `FAILED (failures=1, errors=2, skipped=3)` …"],
      ["Returns", "`{\"ok\": bool, \"failures\": n, \"errors\": n, \"skipped\": n}`, zero for any count the line doesn't mention"],
    ],
    hiddenKinds: ["only errors", "every count at once", "OK with skipped tests", "a plain OK"],
    hints: [
      "Run the starter on `FAILED (failures=1, errors=2)`: which part of the bracket does it read?",
      "Take everything between the brackets, split it at `, `, and read every `name=number` pair.",
      "A line with no brackets at all has no counts to read.",
    ],
    explanation: "The starter split the whole line at `=` and only ever read the number after the first one, and a line without `failures` crashed. Reading the text between the parentheses, splitting the pairs, and updating a dictionary that starts with zeros handles every form unittest prints.",
    code: {
      starter: src`
def summary_counts(line):
    ok = line.startswith("OK")
    counts = {"ok": ok, "failures": 0, "errors": 0, "skipped": 0}
    if "(" in line:
        counts["failures"] = int(line.split("=")[1].split(",")[0].rstrip(")"))
    return counts

print(summary_counts("FAILED (failures=1, errors=2)"))
`,
      answer: src`
def summary_counts(line):
    counts = {"ok": line.startswith("OK"), "failures": 0, "errors": 0, "skipped": 0}
    if "(" in line:
        inside = line[line.index("(") + 1:line.rindex(")")]
        for pair in inside.split(", "):
            name, value = pair.split("=")
            counts[name] = int(value)
    return counts

print(summary_counts("FAILED (failures=1, errors=2)"))
`,
      alternatives: [
        src`
import re

def summary_counts(line):
    counts = {"ok": line.startswith("OK"), "failures": 0, "errors": 0, "skipped": 0}
    for name, value in re.findall(r"(\w+)=(\d+)", line):
        counts[name] = int(value)
    return counts
`,
      ],
      wrong: [
        {
          code: src`
def summary_counts(line):
    counts = {"ok": line.startswith("OK"), "failures": 0, "errors": 0, "skipped": 0}
    if "(" in line:
        for pair in line.split("(")[1].split(", "):
            name, value = pair.split("=")
            counts[name] = int(value)
    return counts
`,
          fails: ["returns", "skipped"],
          why: "the closing bracket stays on the last number, so `int(\"2)\")` crashes",
        },
        {
          code: src`
def summary_counts(line):
    counts = {"ok": line.startswith("OK"), "failures": 0, "errors": 0, "skipped": 0}
    if line.startswith("FAILED ("):
        inside = line[line.index("(") + 1:line.rindex(")")]
        for pair in inside.split(", "):
            name, value = pair.split("=")
            counts[name] = int(value)
    return counts
`,
          fails: ["skipped"],
          why: "the counts inside `OK (skipped=3)` are ignored",
        },
      ],
      task: {
        checks: [
          fn("returns", "summary_counts", [
            example(["FAILED (failures=1, errors=2)"], { ok: false, failures: 1, errors: 2, skipped: 0 }),
            example(["OK"], { ok: true, failures: 0, errors: 0, skipped: 0 }),
            example(["FAILED (failures=3)"], { ok: false, failures: 3, errors: 0, skipped: 0 }),
            hiddenCase("only errors", ["FAILED (errors=4)"], { ok: false, failures: 0, errors: 4, skipped: 0 }),
            hiddenCase("every count at once", ["FAILED (failures=1, errors=2, skipped=3)"], { ok: false, failures: 1, errors: 2, skipped: 3 }),
          ], { label: "summary_counts() reads every count" }),
          fn("skipped", "summary_counts", [hiddenCase("OK with skipped tests", ["OK (skipped=12)"], { ok: true, failures: 0, errors: 0, skipped: 12 })], { label: "a passing run with skipped tests" }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-06",
    version: 2,
    slug: "review-a-lock-upgrade",
    title: "Review a lock file upgrade",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 15,
    requires: ["arithmetic", "assignment", "bitwise", "comparison", "conditional-expr", "conversion", "dict-get", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "print-call", "print-several", "string-format", "string-index", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "A pull request regenerates `requirements.lock`. Reviewers want a short list of what changed, with downgrades called out, because a downgrade is often an accident. Compare the old and new pins.",
    spec: [
      ["Function", "`lock_changes(old, new)`; both map package name to a version like `\"2.10.0\"` (whole numbers separated by dots)"],
      ["Returns", "sorted lines: `\"added <name> <v>\"`, `\"removed <name> <v>\"`, `\"upgraded <name> <a> -> <b>\"`, `\"downgraded <name> <a> -> <b>\"`; unchanged packages are left out"],
      ["Comparing", "versions compare as numbers, part by part: `2.10.0` is newer than `2.9.4`"],
    ],
    hiddenKinds: ["a two-digit minor version", "a removed package", "a version with fewer parts", "nothing changed"],
    hints: [
      "Turn a version into a tuple of ints (`\"2.10.0\"` → `(2, 10, 0)`); tuples compare part by part.",
      "Three groups of names: only in old, only in new, in both with different versions.",
      "Collect the lines and sort them at the end.",
    ],
    explanation: "Comparing version texts as strings gets `2.10.0` vs `2.9.4` backwards, because `\"1\" < \"9\"`. Tuples of ints compare numerically part by part, and `(2, 2)` vs `(2, 2, 1)` also works: the shorter tuple is smaller when it is a prefix. Sorting the final lines gives a stable review list.",
    code: {
      starter: src`
def lock_changes(old, new):
    return []

old = {"numpy": "2.1.3", "pandas": "2.2.3", "six": "1.17.0"}
new = {"numpy": "2.1.2", "pandas": "2.2.10", "tzdata": "2025.1"}
print(lock_changes(old, new))
`,
      answer: src`
def as_tuple(version):
    return tuple(int(part) for part in version.split("."))

def lock_changes(old, new):
    changes = []
    for name in old:
        if name not in new:
            changes.append(f"removed {name} {old[name]}")
        elif old[name] != new[name]:
            kind = "upgraded" if as_tuple(new[name]) > as_tuple(old[name]) else "downgraded"
            changes.append(f"{kind} {name} {old[name]} -> {new[name]}")
    for name in new:
        if name not in old:
            changes.append(f"added {name} {new[name]}")
    return sorted(changes)

old = {"numpy": "2.1.3", "pandas": "2.2.3", "six": "1.17.0"}
new = {"numpy": "2.1.2", "pandas": "2.2.10", "tzdata": "2025.1"}
print(lock_changes(old, new))
`,
      alternatives: [
        src`
def key(version):
    return [int(x) for x in version.split(".")]

def lock_changes(old, new):
    out = []
    for name in sorted(set(old) | set(new)):
        a, b = old.get(name), new.get(name)
        if a is None:
            out.append("added " + name + " " + b)
        elif b is None:
            out.append("removed " + name + " " + a)
        elif key(b) > key(a):
            out.append(f"upgraded {name} {a} -> {b}")
        elif key(b) < key(a):
            out.append(f"downgraded {name} {a} -> {b}")
    return sorted(out)
`,
      ],
      wrong: [
        {
          code: src`
def lock_changes(old, new):
    changes = []
    for name in old:
        if name not in new:
            changes.append(f"removed {name} {old[name]}")
        elif old[name] != new[name]:
            kind = "upgraded" if new[name] > old[name] else "downgraded"
            changes.append(f"{kind} {name} {old[name]} -> {new[name]}")
    for name in new:
        if name not in old:
            changes.append(f"added {name} {new[name]}")
    return sorted(changes)
`,
          fails: ["returns"],
          why: "comparing version texts says `2.2.10` is older than `2.2.3`",
        },
        {
          code: src`
def lock_changes(old, new):
    changes = []
    for name in old:
        if name in new and old[name] != new[name]:
            changes.append(f"upgraded {name} {old[name]} -> {new[name]}")
    for name in new:
        if name not in old:
            changes.append(f"added {name} {new[name]}")
    return sorted(changes)
`,
            fails: ["returns"],
            why: "every change is called an upgrade, and removed packages are never mentioned",
          },
      ],
      task: {
        checks: [
          fn("returns", "lock_changes", [
            example([{ numpy: "2.1.3", pandas: "2.2.3", six: "1.17.0" }, { numpy: "2.1.2", pandas: "2.2.10", tzdata: "2025.1" }], ["added tzdata 2025.1", "downgraded numpy 2.1.3 -> 2.1.2", "removed six 1.17.0", "upgraded pandas 2.2.3 -> 2.2.10"]),
            example([{ attrs: "24.2.0" }, { attrs: "24.2.0" }], []),
            example([{}, { rich: "13.9.4" }], ["added rich 13.9.4"]),
            hiddenCase("a two-digit minor version", [{ requests: "2.9.4" }, { requests: "2.10.0" }], ["upgraded requests 2.9.4 -> 2.10.0"]),
            hiddenCase("a removed package", [{ "python-dateutil": "2.9.0" }, {}], ["removed python-dateutil 2.9.0"]),
            hiddenCase("a version with fewer parts", [{ tzdata: "2025.1.1" }, { tzdata: "2025.1" }], ["downgraded tzdata 2025.1.1 -> 2025.1"]),
          ], { label: "lock_changes() lists added, removed, upgraded and downgraded packages" }),
          fn("keeps-input", "lock_changes", [keepsInput([{ a: "1.0" }, { a: "2.0" }], { label: "two small locks" })], { label: "lock_changes() leaves both locks unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-10",
    version: 2,
    slug: "read-a-dotenv-file",
    title: "Read a .env file",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 20,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "conversion", "dict-literal", "enumerate-call", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "identity", "if-statement", "import-module", "len-call", "list-mutate", "logical", "membership", "newline-escape", "none-value", "print-call", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "In development, settings live in a `.env` file instead of the real environment. Read one into a dictionary the settings loader (L04) can use, rejecting lines that would silently set the wrong thing.",
    spec: [
      ["Function", "`read_dotenv(text)`"],
      ["Lines", "`KEY=value`; blank lines and lines starting with `#` are skipped; spaces around the key and the value are removed"],
      ["Keys", "must fully match `[A-Z_][A-Z0-9_]*`"],
      ["Quotes", "a value wrapped in matching `\"…\"` or `'…'` has them removed (the inside is kept as-is); otherwise the value is used as written"],
      ["Repeats", "a key set twice keeps the later value"],
      ["Raises", "`ValueError` naming the line number (from 1) for a line without `=` or with an invalid key"],
    ],
    hiddenKinds: ["a value containing =", "a quoted value with spaces", "a lower-case key", "a line without =", "a repeated key", "an empty value"],
    hints: [
      "Split each line at the **first** `=` only; values such as database URLs can contain more.",
      "Check the key with a full-match pattern before storing anything.",
      "Remove quotes only when the value starts and ends with the same quote character and is at least two characters long.",
    ],
    explanation: "`partition(\"=\")` splits at the first `=`, keeping values like `postgres://u:p@h/db?sslmode=require` whole. A full-match pattern rejects lower-case or dashed keys that the real environment would treat differently. Removing only matching outer quotes keeps an apostrophe inside a value. Raising with the line number turns a typo into an actionable message.",
    code: {
      starter: src`
import re

def read_dotenv(text):
    settings = {}
    for line in text.splitlines():
        key, value = line.split("=")
        settings[key] = value
    return settings

env = """# local development
APP_ENV=dev
DATABASE_URL=sqlite:///market.db?mode=rwc
GREETING="Welcome to Runtime Market"
"""
print(read_dotenv(env))
`,
      answer: src`
import re

def read_dotenv(text):
    settings = {}
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, sep, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if not sep or not re.fullmatch(r"[A-Z_][A-Z0-9_]*", key):
            raise ValueError(f"line {number}: expected KEY=value")
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        settings[key] = value
    return settings

env = """# local development
APP_ENV=dev
DATABASE_URL=sqlite:///market.db?mode=rwc
GREETING="Welcome to Runtime Market"
"""
print(read_dotenv(env))
`,
      alternatives: [
        src`
import re

LINE = re.compile(r"\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*")

def unquote(value):
    for q in ('"', "'"):
        if len(value) >= 2 and value.startswith(q) and value.endswith(q):
            return value[1:-1]
    return value

def read_dotenv(text):
    out = {}
    for n, line in enumerate(text.split("\n"), 1):
        if line.strip() == "" or line.strip()[0] == "#":
            continue
        m = LINE.fullmatch(line)
        if m is None:
            raise ValueError("bad line " + str(n))
        out[m.group(1)] = unquote(m.group(2))
    return out
`,
      ],
      wrong: [
        {
          code: src`
import re

def read_dotenv(text):
    settings = {}
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("=")
        if len(parts) != 2 or not re.fullmatch(r"[A-Z_][A-Z0-9_]*", parts[0].strip()):
            raise ValueError(f"line {number}: expected KEY=value")
        settings[parts[0].strip()] = parts[1].strip().strip("\"'")
    return settings
`,
            fails: ["returns"],
            why: "splitting at every `=` rejects values that contain one, and `strip(\"\\\"'\")` also eats quotes that belong to the value",
          },
          {
            code: src`
def read_dotenv(text):
    settings = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        settings[key.strip()] = value
    return settings
`,
            fails: ["rejects", "line-number"],
            why: "bad lines are skipped silently and any key is accepted, so a typo just leaves a setting unset",
          },
      ],
      task: {
        checks: [
          fn("returns", "read_dotenv", [
            example(['# local development\nAPP_ENV=dev\nDATABASE_URL=sqlite:///market.db?mode=rwc\nGREETING="Welcome to Runtime Market"\n'], { APP_ENV: "dev", DATABASE_URL: "sqlite:///market.db?mode=rwc", GREETING: "Welcome to Runtime Market" }),
            example(["PORT = 8000\n\n"], { PORT: "8000" }),
            example(["NOTE='it''s fine'\n"], { NOTE: "it''s fine" }),
            hiddenCase("a value containing =", ["DATABASE_URL=postgres://u:p@db/shop?sslmode=require\n"], { DATABASE_URL: "postgres://u:p@db/shop?sslmode=require" }),
            hiddenCase("a quoted value with spaces", ['MOTD="  spaced  "\n'], { MOTD: "  spaced  " }),
            hiddenCase("a repeated key", ["WORKERS=2\nWORKERS=4\n"], { WORKERS: "4" }),
            hiddenCase("an empty value", ["FEATURE_FLAGS=\n"], { FEATURE_FLAGS: "" }),
          ], { label: "read_dotenv() reads the settings" }),
          fn("rejects", "read_dotenv", [
            raisesCase(["APP_ENV=dev\ndebug=true\n"], "ValueError", { label: "a lower-case key" }),
            raisesCase(["APP_ENV dev\n"], "ValueError", { label: "a line without =" }),
          ], { label: "bad lines raise ValueError" }),
          expr("line-number", "the error names the line", "try:\n    read_dotenv('# header\\nA=1\\n\\nNOT-VALID=2\\n')\n    result = None\nexcept ValueError as _e:\n    result = '4' in str(_e)", true, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-12",
    version: 2,
    slug: "predict-the-settings",
    title: "Predict the settings",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "conversion", "dataclass-dec", "dict-literal", "dict-lookup", "except-type", "field-ann", "import-module", "plain-class", "print-call", "print-text", "string-index", "top-level-indent", "try-except", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Every value in `env` is text; `bool` only asks whether the text is empty.",
      "`int()` ignores spaces around the digits.",
      "Assigning to a field of a frozen dataclass raises before anything changes.",
    ],
    explanation: "`bool(\"0\")` is True because the text isn't empty, so `debug` is True even though the operator meant off. `int(\" 8080 \")` is 8080. The frozen dataclass refuses the assignment with `FrozenInstanceError`, which the program catches; the object still holds the original port.",
    predict: {
      program: src`
from dataclasses import FrozenInstanceError, dataclass

@dataclass(frozen=True)
class Settings:
    debug: bool
    port: int

env = {"DEBUG": "0", "PORT": " 8080 "}
settings = Settings(debug=bool(env["DEBUG"]), port=int(env["PORT"]))
print(settings)
try:
    settings.port = 9090
except FrozenInstanceError:
    print("frozen")
print(settings.port + 1)
`,
      output: "Settings(debug=True, port=8080)\nfrozen\n8081\n",
      wrongPredictions: ["Settings(debug=False, port=8080)\nfrozen\n8081", "Settings(debug=True, port=8080)\n9091", "Settings(debug=True, port=' 8080 ')\nfrozen\n8081", "Settings(debug=True, port=8080)\nfrozen\n9091"],
    },
  },
  {
    id: "PY-Q49-13",
    version: 2,
    slug: "migration-claims-too-much",
    title: "The migration that claims too much",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "except-type", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-loop", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "sqlite-call", "string-format", "string-index", "top-level-indent", "try-except"],
    prompt: "After a failed deploy, the database reports schema version 3, yet the `payments` table that migration 3 creates doesn't exist, and the readiness check passes because the version looks right. Fix `migrate` so a migration that fails leaves the database exactly as it was before that migration, version included, and the error still reaches the caller.",
    spec: [
      ["Function", "`migrate(conn, migrations)`; `conn` uses `isolation_level=None`"],
      ["Rule", "each pending version runs in its own transaction with its `PRAGMA user_version`; a failing statement rolls the whole version back and the error is re-raised"],
      ["Returns", "the versions applied by this call"],
    ],
    hiddenKinds: ["a migration that fails on its second statement", "a database already up to date", "several pending migrations"],
    hints: [
      "Look at the order: when is the version number written, and is any of it inside a transaction?",
      "Group the statements and the version update between `BEGIN` and `COMMIT`.",
      "On `sqlite3.Error`, roll back first, then `raise` so the deploy fails loudly.",
    ],
    explanation: "The starter wrote the new version number before running the statements and used no transaction, so a failing statement left the version claiming work that never happened. Putting the statements and the version update in one `BEGIN … COMMIT` and rolling back on error makes each migration all-or-nothing. Swallowing the error after rolling back would hide the failed deploy.",
    code: {
      starter: src`
import sqlite3

def migrate(conn, migrations):
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    applied = []
    for version in sorted(migrations):
        if version <= current:
            continue
        conn.execute(f"PRAGMA user_version = {int(version)}")
        for statement in migrations[version]:
            conn.execute(statement)
        applied.append(version)
    return applied

conn = sqlite3.connect(":memory:", isolation_level=None)
conn.execute("CREATE TABLE orders (order_id TEXT)")
conn.execute("PRAGMA user_version = 2")
broken = {3: ["CREATE TABLE payments (payment_id TEXT)", "CREATE INDEX x ON refunds (id)"]}
try:
    migrate(conn, broken)
except sqlite3.OperationalError as err:
    print("migration failed:", err)
print(conn.execute("PRAGMA user_version").fetchone()[0])
`,
      answer: src`
import sqlite3

def migrate(conn, migrations):
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    applied = []
    for version in sorted(migrations):
        if version <= current:
            continue
        conn.execute("BEGIN")
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {int(version)}")
            conn.execute("COMMIT")
        except sqlite3.Error:
            conn.execute("ROLLBACK")
            raise
        applied.append(version)
    return applied

conn = sqlite3.connect(":memory:", isolation_level=None)
conn.execute("CREATE TABLE orders (order_id TEXT)")
conn.execute("PRAGMA user_version = 2")
broken = {3: ["CREATE TABLE payments (payment_id TEXT)", "CREATE INDEX x ON refunds (id)"]}
try:
    migrate(conn, broken)
except sqlite3.OperationalError as err:
    print("migration failed:", err)
print(conn.execute("PRAGMA user_version").fetchone()[0])
`,
      alternatives: [
        src`
import sqlite3

def migrate(conn, migrations):
    (current,) = conn.execute("PRAGMA user_version").fetchone()
    applied = []
    for version in sorted(v for v in migrations if v > current):
        conn.execute("BEGIN")
        ok = False
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute("PRAGMA user_version = " + str(int(version)))
            ok = True
        finally:
            conn.execute("COMMIT" if ok else "ROLLBACK")
        applied.append(version)
    return applied
`,
      ],
      wrong: [
        {
          code: src`
import sqlite3

def migrate(conn, migrations):
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    applied = []
    for version in sorted(migrations):
        if version <= current:
            continue
        for statement in migrations[version]:
            conn.execute(statement)
        conn.execute(f"PRAGMA user_version = {int(version)}")
        applied.append(version)
    return applied
`,
          fails: ["half-applied"],
          why: "the version is now written last, but without a transaction the statements that did run stay applied",
        },
        {
          code: src`
import sqlite3

def migrate(conn, migrations):
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    applied = []
    for version in sorted(migrations):
        if version <= current:
            continue
        conn.execute("BEGIN")
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {int(version)}")
            conn.execute("COMMIT")
        except sqlite3.Error:
            conn.execute("ROLLBACK")
            return applied
        applied.append(version)
    return applied
`,
          fails: ["raises"],
          why: "the failure is rolled back but swallowed, so the deploy carries on as if the schema were ready",
        },
      ],
      task: {
        checks: [
          expr("returns", "pending migrations are applied in order", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "_m = {3: ['CREATE TABLE payments (payment_id TEXT)'], 1: ['CREATE TABLE orders (order_id TEXT)'], 2: ['ALTER TABLE orders ADD COLUMN status TEXT']}",
            "result = (migrate(_c, _m), migrate(_c, _m), _c.execute('PRAGMA user_version').fetchone()[0])",
          ), t([1, 2, 3], [], 3), { show: "migrate(conn, migrations) twice on a new database" }),
          expr("half-applied", "a migration that fails on its second statement", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "_c.execute('CREATE TABLE orders (order_id TEXT)')",
            "_c.execute('PRAGMA user_version = 2')",
            "try:",
            "    migrate(_c, {3: ['CREATE TABLE payments (payment_id TEXT)', 'CREATE INDEX x ON refunds (id)']})",
            "except _sq.OperationalError:",
            "    pass",
            "result = (_c.execute('PRAGMA user_version').fetchone()[0], sorted(_r[0] for _r in _c.execute(\"SELECT name FROM sqlite_master WHERE type = 'table'\")))",
          ), t(2, ["orders"]), { hidden: true }),
          expr("raises", "the failure reaches the caller", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "try:",
            "    migrate(_c, {1: ['CREATE TABLE a (x)'], 2: ['ALTER TABLE missing ADD COLUMN y TEXT']})",
            "    result = 'no error'",
            "except _sq.OperationalError:",
            "    result = _c.execute('PRAGMA user_version').fetchone()[0]",
          ), 1, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-16",
    version: 2,
    slug: "why-is-this-installed",
    title: "Why is this package installed?",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 20,
    requires: ["assignment", "boolean", "comparison", "conditional-expr", "continue-statement", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "newline-escape", "none-value", "print-call", "reassignment", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness"],
    prompt: "pip-compile writes, under each pinned package, which packages required it: `# via pandas` on one line, or `# via` followed by one name per comment line. `-r requirements.in` means you asked for it directly. Turn a lock file into a dictionary that answers \"why is this installed?\"",
    spec: [
      ["Function", "`why_installed(lock_text)`"],
      ["Pin line", "`name==version`, possibly followed by `\\` and indented `--hash=…` lines (ignore those)"],
      ["Via comments", "after a pin: `    # via a` (one reason), or `    # via` then lines `    #   a` (one reason each)"],
      ["Reasons", "`-r requirements.in` becomes `\"direct\"`; other reasons are package names"],
      ["Returns", "`{package: sorted list of reasons}` for every pinned package, in the order the pins appear; a pin with no via comment gets `[]`"],
    ],
    hiddenKinds: ["a package required by two others", "a package that is both direct and required", "a pin with no via comment", "a lock with header comments"],
    hints: [
      "Remember the package of the last pin line you saw; via comments belong to it.",
      "A `# via something` line gives one reason; a bare `# via` line means the reasons come on the following `#   name` lines.",
      "Header comments before the first pin belong to nothing; skip them.",
    ],
    explanation: "The parser walks the lines with one piece of state: the current package. Pin lines start a new entry; `--hash` continuation lines are ignored; a `# via x` line or the `#   x` lines after a bare `# via` add reasons to the current package. Sorting each list makes the result independent of pip-compile's ordering.",
    code: {
      starter: src`
def why_installed(lock_text):
    return {}

lock = """# This file is autogenerated by pip-compile
numpy==2.1.3 \\
    --hash=sha256:2f10e1910e389422d852df6d9860305296fb716610ca6d234c5ca410b550b12b
    # via pandas
pandas==2.2.3 \\
    --hash=sha256:53b4e41aa9e92b1cdec11db92d9d0f33db738f6ad4e4a942bbb11ec32886fdcd
    # via -r requirements.in
six==1.17.0
    # via
    #   python-dateutil
    #   rfc3339-validator
"""
print(why_installed(lock))
`,
      answer: src`
def why_installed(lock_text):
    reasons = {}
    current = None
    in_via_list = False
    for raw in lock_text.splitlines():
        line = raw.strip()
        if not line or line.startswith("--hash"):
            continue
        if not raw.startswith((" ", "#")):
            current = line.split("==")[0]
            reasons[current] = []
            in_via_list = False
        elif current is None:
            continue
        elif line == "# via":
            in_via_list = True
        elif line.startswith("# via "):
            reasons[current].append(line.removeprefix("# via ").strip())
            in_via_list = False
        elif in_via_list and line.startswith("#"):
            reasons[current].append(line.lstrip("# ").strip())
    return {name: sorted("direct" if r == "-r requirements.in" else r for r in rs) for name, rs in reasons.items()}

lock = """# This file is autogenerated by pip-compile
numpy==2.1.3 \\
    --hash=sha256:2f10e1910e389422d852df6d9860305296fb716610ca6d234c5ca410b550b12b
    # via pandas
pandas==2.2.3 \\
    --hash=sha256:53b4e41aa9e92b1cdec11db92d9d0f33db738f6ad4e4a942bbb11ec32886fdcd
    # via -r requirements.in
six==1.17.0
    # via
    #   python-dateutil
    #   rfc3339-validator
"""
print(why_installed(lock))
`,
      alternatives: [
        src`
import re

def why_installed(lock_text):
    result = {}
    package = None
    collecting = False
    for line in lock_text.split("\n"):
        pin = re.match(r"([A-Za-z0-9._-]+)==", line)
        if pin:
            package = pin.group(1)
            result[package] = []
            collecting = False
            continue
        if package is None:
            continue
        text = line.strip()
        single = re.fullmatch(r"# via (.+)", text)
        if single:
            result[package].append(single.group(1))
        elif text == "# via":
            collecting = True
        elif collecting and re.fullmatch(r"#\s+(\S.*)", text):
            result[package].append(text[1:].strip())
    for name, items in result.items():
        result[name] = sorted("direct" if x == "-r requirements.in" else x for x in items)
    return result
`,
      ],
      wrong: [
        {
          code: src`
def why_installed(lock_text):
    reasons = {}
    current = None
    for raw in lock_text.splitlines():
        line = raw.strip()
        if "==" in line and not line.startswith("#"):
            current = line.split("==")[0]
            reasons[current] = []
        elif line.startswith("# via ") and current:
            reasons[current].append(line.removeprefix("# via ").replace("-r requirements.in", "direct"))
    return reasons
`,
          fails: ["returns", "many", "direct"],
          why: "the multi-line `# via` form is ignored, so packages required by several others get no reasons",
        },
        {
          code: src`
def why_installed(lock_text):
    reasons = {}
    current = None
    listing = False
    for raw in lock_text.splitlines():
        line = raw.strip()
        if not line or line.startswith("--hash"):
            continue
        if not raw.startswith((" ", "#")):
            current = line.split("==")[0]
            reasons[current] = []
            listing = False
        elif line == "# via":
            listing = True
        elif line.startswith("# via "):
            reasons[current].append(line[6:])
        elif listing:
            reasons[current].append(line.lstrip("# "))
    return reasons
`,
          fails: ["returns", "direct", "many"],
          why: "`-r requirements.in` isn't turned into `direct`, and the reasons aren't sorted",
        },
      ],
      task: {
        checks: [
          fn("returns", "why_installed", [
            example(["# This file is autogenerated by pip-compile\nnumpy==2.1.3 \\\n    --hash=sha256:2f10e1910e389422d852df6d9860305296fb716610ca6d234c5ca410b550b12b\n    # via pandas\npandas==2.2.3 \\\n    --hash=sha256:53b4e41aa9e92b1cdec11db92d9d0f33db738f6ad4e4a942bbb11ec32886fdcd\n    # via -r requirements.in\nsix==1.17.0\n    # via\n    #   python-dateutil\n    #   rfc3339-validator\n"], { numpy: ["pandas"], pandas: ["direct"], six: ["python-dateutil", "rfc3339-validator"] }),
            example(["rich==13.9.4\n"], { rich: [] }),
            example(["tzdata==2025.1\n    # via pandas\n"], { tzdata: ["pandas"] }),
          ], { label: "why_installed() lists the reasons for every package" }),
          fn("many", "why_installed", [hiddenCase("a package required by two others", ["urllib3==2.2.3\n    # via\n    #   requests\n    #   botocore\n"], { urllib3: ["botocore", "requests"] })], { label: "multi-line via lists are read" }),
          fn("direct", "why_installed", [hiddenCase("a package that is both direct and required", ["attrs==24.2.0\n    # via\n    #   -r requirements.in\n    #   jsonschema\n"], { attrs: ["direct", "jsonschema"] })], { label: "-r requirements.in becomes direct" }),
          fn("header", "why_installed", [hiddenCase("a lock with header comments", ["#\n# This file is autogenerated by pip-compile with Python 3.12\n# by the following command:\n#\n#    pip-compile --generate-hashes\n#\nsix==1.17.0\n    # via python-dateutil\n"], { six: ["python-dateutil"] })], { label: "comments before the first pin are ignored" }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-19",
    version: 2,
    slug: "test-the-duration-parser",
    title: "Test the duration parser",
    format: "testing",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comparison", "conversion", "dict-literal", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "logical", "match-case", "membership", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "test-func", "top-level-indent", "try-except", "unittest-case", "with-statement"],
    prompt: "Timeouts and schedules in the worker's settings use `parse_duration(text)`: a whole number of 1 or more directly followed by `s`, `m`, `h` or `d` (spaces around the whole text ignored), returning seconds; anything else raises `ValueError`. Write tests that pass for a correct parser and catch broken ones. Leave the calls to Check.",
    spec: [
      ["Target", "`parse_duration(text)`: `\"30s\"` → 30, `\"5m\"` → 300, `\"2h\"` → 7200, `\"1d\"` → 86400"],
      ["Your tests", "`test_` functions or a `unittest.TestCase` class in your file"],
      ["Graded", "pass for a correct parser; fail for each of three broken parsers"],
    ],
    hiddenKinds: ["a parser that accepts decimals", "a parser that allows zero", "a parser with the wrong factor for hours"],
    hints: [
      "Test each unit's factor with a value, not just one example.",
      "Test the inputs that must be refused: zero, decimals, unknown units, extra text.",
      "`assertRaises(ValueError)` (or a try/except in a test function) checks refusals.",
    ],
    explanation: "A correct parser has two halves, conversion and refusal, and each defect breaks one: checking `\"2h\"` against 7200 catches a wrong factor; `\"0s\"` catches a parser that allows zero; `\"1.5h\"` catches one that converts with `float`. Tests that only try `\"30s\"` pass for all three broken versions.",
    code: {
      starter: src`
import re
import unittest

UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

def parse_duration(text):
    match = re.fullmatch(r"([0-9]+)([smhd])", text.strip())
    if not match or int(match.group(1)) < 1:
        raise ValueError(f"not a duration: {text!r}")
    return int(match.group(1)) * UNITS[match.group(2)]

class DurationTest(unittest.TestCase):
    def test_seconds(self):
        self.assertEqual(parse_duration("30s"), 30)
`,
      answer: src`
import re
import unittest

UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

def parse_duration(text):
    match = re.fullmatch(r"([0-9]+)([smhd])", text.strip())
    if not match or int(match.group(1)) < 1:
        raise ValueError(f"not a duration: {text!r}")
    return int(match.group(1)) * UNITS[match.group(2)]

class DurationTest(unittest.TestCase):
    def test_each_unit(self):
        cases = [("30s", 30), ("5m", 300), ("2h", 7200), ("1d", 86400), (" 10m ", 600)]
        for text, seconds in cases:
            with self.subTest(text=text):
                self.assertEqual(parse_duration(text), seconds)

    def test_refuses_bad_text(self):
        for text in ["0s", "1.5h", "5", "10w", "-5m", "timeout=30s"]:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    parse_duration(text)
`,
      alternatives: [
        src`
import re

def parse_duration(text):
    match = re.fullmatch(r"([0-9]+)([smhd])", text.strip())
    if not match or int(match.group(1)) < 1:
        raise ValueError("bad")
    return int(match.group(1)) * {"s": 1, "m": 60, "h": 3600, "d": 86400}[match.group(2)]

def refused(text):
    try:
        parse_duration(text)
    except ValueError:
        return True
    return False

def test_values():
    assert parse_duration("2h") == 7200
    assert parse_duration("1d") == 86400
    assert parse_duration("45s") == 45

def test_refusals():
    assert refused("0m")
    assert refused("2.5s")
    assert refused("3x")
`,
      ],
      wrong: [
        {
          code: src`
import re
import unittest

UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

def parse_duration(text):
    match = re.fullmatch(r"([0-9]+)([smhd])", text.strip())
    if not match or int(match.group(1)) < 1:
        raise ValueError(f"not a duration: {text!r}")
    return int(match.group(1)) * UNITS[match.group(2)]

class DurationTest(unittest.TestCase):
    def test_seconds(self):
        self.assertEqual(parse_duration("30s"), 30)

    def test_minutes(self):
        self.assertEqual(parse_duration("5m"), 300)
`,
          fails: ["tests-1", "tests-2", "tests-3"],
          why: "only two valid examples are tested; nothing checks hours or any input that must be refused",
        },
        {
          code: src`
import re
import unittest

UNITS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

def parse_duration(text):
    match = re.fullmatch(r"([0-9]+)([smhd])", text.strip())
    if not match or int(match.group(1)) < 1:
        raise ValueError(f"not a duration: {text!r}")
    return int(match.group(1)) * UNITS[match.group(2)]

class DurationTest(unittest.TestCase):
    def test_units(self):
        self.assertEqual(parse_duration("2h"), 7200)
        self.assertEqual(parse_duration("1d"), 86400)

    def test_decimal(self):
        with self.assertRaises(ValueError):
            parse_duration("1.5h")
`,
          fails: ["tests-2"],
          why: "no test tries a zero duration",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "parse_duration",
          correct: "import re\nUNITS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}\ndef parse_duration(text):\n    m = re.fullmatch(r'([0-9]+)([smhd])', text.strip())\n    if not m or int(m.group(1)) < 1:\n        raise ValueError(text)\n    return int(m.group(1)) * UNITS[m.group(2)]\n",
          defects: [
            { label: "a parser that accepts decimals", code: "import re\nUNITS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}\ndef parse_duration(text):\n    m = re.fullmatch(r'([0-9]+(?:\\.[0-9]+)?)([smhd])', text.strip())\n    if not m or float(m.group(1)) <= 0:\n        raise ValueError(text)\n    return int(float(m.group(1)) * UNITS[m.group(2)])\n" },
            { label: "a parser that allows zero", code: "import re\nUNITS = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}\ndef parse_duration(text):\n    m = re.fullmatch(r'([0-9]+)([smhd])', text.strip())\n    if not m:\n        raise ValueError(text)\n    return int(m.group(1)) * UNITS[m.group(2)]\n" },
            { label: "a parser with the wrong factor for hours", code: "import re\nUNITS = {'s': 1, 'm': 60, 'h': 360, 'd': 86400}\ndef parse_duration(text):\n    m = re.fullmatch(r'([0-9]+)([smhd])', text.strip())\n    if not m or int(m.group(1)) < 1:\n        raise ValueError(text)\n    return int(m.group(1)) * UNITS[m.group(2)]\n" },
          ],
        }), [2, 3]),
      },
    },
  },
  {
    id: "PY-Q49-20",
    version: 2,
    slug: "pre-deploy-gate",
    title: "The pre-deploy gate",
    format: "integration",
    difficulty: "hard",
    minutes: 30,
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "break-statement", "comp-if", "comparison", "conditional-expr", "continue-statement", "dict-get", "dict-literal", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "none-value", "print-call", "print-several", "print-text", "sqlite-call", "string-format", "string-index", "top-level-indent", "try-except", "tuple-unpack"],
    prompt: "Combine the lesson's pieces into the gate the release script calls before switching traffic: migrate the database, then check the settings and the schema, and decide. Write `predeploy(conn, environ, migrations, required_env)`.",
    spec: [
      ["Function", "`predeploy(conn, environ, migrations, required_env)`; `conn` uses `isolation_level=None`"],
      ["Step 1", "apply pending migrations (each version in its own transaction with its `PRAGMA user_version`); if one fails, roll it back and record `\"migration <v> failed: <error message>\"`, and apply nothing after it"],
      ["Step 2", "for each name in `required_env` that is missing or empty in `environ`, record `\"missing setting <NAME>\"`"],
      ["Step 3", "if the schema version isn't the highest version in `migrations`, record `\"schema at <v>, release needs <n>\"`"],
      ["Returns", "`{\"applied\": [...], \"problems\": [...], \"ready\": bool}` (problems in step order; ready when there are none); nothing is raised"],
    ],
    hiddenKinds: ["a failing migration", "missing settings", "a database already up to date", "an empty setting"],
    hints: [
      "Reuse the migration loop from the lesson, but instead of re-raising, record the problem and stop applying.",
      "The settings check and the schema check run whatever happened before, so the report is complete.",
      "Read the version again at the end: it tells you where the failed migration left the schema.",
    ],
    explanation: "The gate never raises: it turns every failure into a problem line, so the release script gets one complete report. Migrations still run one transaction per version, so a failure leaves the schema at the last good version, which the final schema check reports. Wrong answers keep applying later migrations after a failure, or skip the remaining checks once something fails.",
    code: {
      starter: src`
import sqlite3

def predeploy(conn, environ, migrations, required_env):
    return {"applied": [], "problems": [], "ready": True}

MIGRATIONS = {
    1: ["CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL)"],
    2: ["ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'processing'"],
}
conn = sqlite3.connect(":memory:", isolation_level=None)
print(predeploy(conn, {"DATABASE_URL": "sqlite:///market.db", "APP_ENV": "prod"}, MIGRATIONS, ["DATABASE_URL", "APP_ENV"]))
`,
      answer: src`
import sqlite3

def predeploy(conn, environ, migrations, required_env):
    applied = []
    problems = []
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for version in sorted(v for v in migrations if v > current):
        conn.execute("BEGIN")
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {int(version)}")
            conn.execute("COMMIT")
        except sqlite3.Error as err:
            conn.execute("ROLLBACK")
            problems.append(f"migration {version} failed: {err}")
            break
        applied.append(version)
    for name in required_env:
        if not environ.get(name):
            problems.append(f"missing setting {name}")
    needed = max(migrations) if migrations else 0
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version != needed:
        problems.append(f"schema at {version}, release needs {needed}")
    return {"applied": applied, "problems": problems, "ready": not problems}

MIGRATIONS = {
    1: ["CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL)"],
    2: ["ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'processing'"],
}
conn = sqlite3.connect(":memory:", isolation_level=None)
print(predeploy(conn, {"DATABASE_URL": "sqlite:///market.db", "APP_ENV": "prod"}, MIGRATIONS, ["DATABASE_URL", "APP_ENV"]))
`,
      alternatives: [
        src`
import sqlite3

def run_migrations(conn, migrations):
    applied = []
    (start,) = conn.execute("PRAGMA user_version").fetchone()
    for version in sorted(migrations):
        if version <= start:
            continue
        try:
            conn.execute("BEGIN")
            for sql in migrations[version]:
                conn.execute(sql)
            conn.execute("PRAGMA user_version = %d" % version)
            conn.execute("COMMIT")
        except sqlite3.Error as error:
            conn.execute("ROLLBACK")
            return applied, "migration %d failed: %s" % (version, error)
        applied.append(version)
    return applied, None

def predeploy(conn, environ, migrations, required_env):
    applied, failure = run_migrations(conn, migrations)
    problems = [failure] if failure else []
    problems += ["missing setting " + n for n in required_env if not environ.get(n)]
    (now,) = conn.execute("PRAGMA user_version").fetchone()
    target = max(migrations, default=0)
    if now != target:
        problems.append(f"schema at {now}, release needs {target}")
    return {"applied": applied, "problems": problems, "ready": len(problems) == 0}
`,
      ],
      wrong: [
        {
          code: src`
import sqlite3

def predeploy(conn, environ, migrations, required_env):
    applied = []
    problems = []
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for version in sorted(v for v in migrations if v > current):
        conn.execute("BEGIN")
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {int(version)}")
            conn.execute("COMMIT")
        except sqlite3.Error as err:
            conn.execute("ROLLBACK")
            problems.append(f"migration {version} failed: {err}")
            return {"applied": applied, "problems": problems, "ready": False}
        applied.append(version)
    for name in required_env:
        if not environ.get(name):
            problems.append(f"missing setting {name}")
    return {"applied": applied, "problems": problems, "ready": not problems}
`,
          fails: ["failing-migration"],
          why: "after a failed migration it stops checking, so the report misses the settings and the schema state",
        },
        {
          code: src`
import sqlite3

def predeploy(conn, environ, migrations, required_env):
    applied = []
    problems = []
    current = conn.execute("PRAGMA user_version").fetchone()[0]
    for version in sorted(v for v in migrations if v > current):
        conn.execute("BEGIN")
        try:
            for statement in migrations[version]:
                conn.execute(statement)
            conn.execute(f"PRAGMA user_version = {int(version)}")
            conn.execute("COMMIT")
            applied.append(version)
        except sqlite3.Error as err:
            conn.execute("ROLLBACK")
            problems.append(f"migration {version} failed: {err}")
    for name in required_env:
        if name not in environ:
            problems.append(f"missing setting {name}")
    needed = max(migrations) if migrations else 0
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version != needed:
        problems.append(f"schema at {version}, release needs {needed}")
    return {"applied": applied, "problems": problems, "ready": not problems}
`,
          fails: ["failing-migration", "empty-setting"],
          why: "later migrations are still applied after one fails, and an empty setting counts as present",
        },
      ],
      task: {
        checks: [
          expr("returns", "a fresh database and complete settings", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "_m = {1: ['CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL)'], 2: [\"ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'processing'\"]}",
            "result = predeploy(_c, {'DATABASE_URL': 'sqlite:///market.db', 'APP_ENV': 'prod'}, _m, ['DATABASE_URL', 'APP_ENV'])",
          ), { applied: [1, 2], problems: [], ready: true }, { show: "predeploy(conn, environ, MIGRATIONS, ['DATABASE_URL', 'APP_ENV'])" }),
          expr("missing-settings", "missing settings on an up-to-date database", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "_c.execute('CREATE TABLE orders (order_id TEXT)')",
            "_c.execute('PRAGMA user_version = 1')",
            "result = predeploy(_c, {'APP_ENV': 'staging'}, {1: ['CREATE TABLE orders (order_id TEXT)']}, ['DATABASE_URL', 'APP_ENV', 'SECRET_KEY'])",
          ), { applied: [], problems: ["missing setting DATABASE_URL", "missing setting SECRET_KEY"], ready: false }, { show: "predeploy(...) with two settings missing" }),
          expr("failing-migration", "a failing migration with more after it", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "_m = {1: ['CREATE TABLE orders (order_id TEXT)'], 2: ['ALTER TABLE refunds ADD COLUMN reason TEXT'], 3: ['CREATE TABLE payments (payment_id TEXT)']}",
            "_r = predeploy(_c, {}, _m, ['DATABASE_URL'])",
            "result = (_r, sorted(_x[0] for _x in _c.execute(\"SELECT name FROM sqlite_master WHERE type = 'table'\")))",
          ), py.tuple(pv({ applied: [1], problems: ["migration 2 failed: no such table: refunds", "missing setting DATABASE_URL", "schema at 1, release needs 3"], ready: false }), pv(["orders"])), { hidden: true }),
          expr("empty-setting", "an empty setting", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:', isolation_level=None)",
            "result = predeploy(_c, {'DATABASE_URL': ''}, {1: ['CREATE TABLE a (x)']}, ['DATABASE_URL'])",
          ), { applied: [1], problems: ["missing setting DATABASE_URL"], ready: false }, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q49-22",
    version: 2,
    slug: "secrets-in-a-dockerfile",
    title: "Find secrets baked into a Dockerfile",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["any-call", "arithmetic", "assignment", "comparison", "continue-statement", "else-clause", "enumerate-call", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "nested-loop", "newline-escape", "none-value", "precedence", "print-call", "reassignment", "regex-call", "set-literal", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-literal", "tuple-unpack"],
    prompt: "Every instruction's text is stored in the image's layers, so a secret written into a Dockerfile (see Secure Python) can be read by anyone who pulls the image. Write a check that finds them, reporting each by the line number where its instruction starts. (This reads Dockerfile text; Docker itself doesn't run here.)",
    spec: [
      ["Function", "`baked_secrets(text)`"],
      ["Instructions", "skip blank and `#` lines; a line ending in `\\` continues on the next line; report the **first** line number (from 1) of each instruction"],
      ["Secret setting", "`ENV` or `ARG` with a `NAME=value` pair (several pairs allowed in one ENV) whose name contains `SECRET`, `TOKEN`, `PASSWORD` or `KEY` (any case) and whose value is not empty → `\"line <n>: <NAME> set in the image\"`"],
      ["Copied file", "`COPY` or `ADD` whose sources include `.env` or a file ending in `.pem` → `\"line <n>: copies <file>\"`"],
      ["Returns", "the findings in instruction order (pairs and files in the order written)"],
    ],
    hiddenKinds: ["an ENV with several pairs", "an ARG with no default", "a secret split over continuation lines", "a key file copied", "a harmless ENV"],
    hints: [
      "First turn the text into instructions with their starting line numbers, joining continuation lines.",
      "For ENV/ARG, split the arguments into words and look at each `NAME=value`; for COPY/ADD, every word but the last is a source.",
      "Compare names in upper case against the four secret words; an `ARG NAME` without `=` has no value to leak.",
    ],
    explanation: "Parsing first (with the starting line of each instruction) keeps the rules simple: ENV/ARG words that look like `NAME=value` are checked by name and non-empty value, and COPY/ADD sources are checked by name. Reporting the instruction's first line works even when the secret is on a continuation line. Line-by-line checks miss continued instructions and report the wrong line.",
    code: {
      starter: src`
def baked_secrets(text):
    return []

dockerfile = """FROM python:3.12.7-slim
WORKDIR /app
ARG PIP_INDEX_TOKEN=ghp_5x8Kd9f2aQ
ENV APP_ENV=prod \\
    STRIPE_SECRET_KEY=sk_live_51HxQe2Kd9f2a
COPY .env requirements.lock ./
USER market
"""
print(baked_secrets(dockerfile))
`,
      answer: src`
SECRET_WORDS = ("SECRET", "TOKEN", "PASSWORD", "KEY")

def instructions(text):
    found = []
    pending = ""
    start = None
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not pending and (not line or line.startswith("#")):
            continue
        if not pending:
            start = number
        if line.endswith("\\"):
            pending += line[:-1] + " "
            continue
        found.append((start, (pending + line).split()))
        pending = ""
    return found

def baked_secrets(text):
    findings = []
    for number, words in instructions(text):
        keyword = words[0].upper()
        if keyword in ("ENV", "ARG"):
            for word in words[1:]:
                name, sep, value = word.partition("=")
                if sep and value and any(secret in name.upper() for secret in SECRET_WORDS):
                    findings.append(f"line {number}: {name} set in the image")
        elif keyword in ("COPY", "ADD"):
            for source in words[1:-1]:
                if source.startswith("--"):
                    continue
                if source.endswith(".env") or source.endswith(".pem"):
                    findings.append(f"line {number}: copies {source}")
    return findings

dockerfile = """FROM python:3.12.7-slim
WORKDIR /app
ARG PIP_INDEX_TOKEN=ghp_5x8Kd9f2aQ
ENV APP_ENV=prod \\
    STRIPE_SECRET_KEY=sk_live_51HxQe2Kd9f2a
COPY .env requirements.lock ./
USER market
"""
print(baked_secrets(dockerfile))
`,
      alternatives: [
        src`
import re

def baked_secrets(text):
    out = []
    buffer, first = [], None
    for n, raw in enumerate(text.split("\n"), 1):
        s = raw.strip()
        if not buffer and (s == "" or s.startswith("#")):
            continue
        if not buffer:
            first = n
        buffer.append(s.rstrip("\\"))
        if s.endswith("\\"):
            continue
        words = " ".join(buffer).split()
        buffer = []
        kind = words[0].upper()
        if kind in {"ENV", "ARG"}:
            for name, value in re.findall(r"([A-Za-z_][A-Za-z0-9_]*)=(\S*)", " ".join(words[1:])):
                if value and re.search(r"SECRET|TOKEN|PASSWORD|KEY", name, re.IGNORECASE):
                    out.append("line %d: %s set in the image" % (first, name))
        if kind in {"COPY", "ADD"}:
            for src_file in words[1:-1]:
                if not src_file.startswith("--") and (src_file.endswith(".env") or src_file.endswith(".pem")):
                    out.append("line %d: copies %s" % (first, src_file))
    return out
`,
      ],
      wrong: [
        {
          code: src`
def baked_secrets(text):
    findings = []
    for number, raw in enumerate(text.splitlines(), start=1):
        words = raw.split()
        if not words:
            continue
        if words[0] in ("ENV", "ARG"):
            for word in words[1:]:
                name, sep, value = word.partition("=")
                if value and any(s in name.upper() for s in ("SECRET", "TOKEN", "PASSWORD", "KEY")):
                    findings.append(f"line {number}: {name} set in the image")
        elif words[0] in ("COPY", "ADD"):
            for source in words[1:-1]:
                if source.endswith((".env", ".pem")):
                    findings.append(f"line {number}: copies {source}")
    return findings
`,
          fails: ["returns", "continued"],
          why: "it reads physical lines, so a secret on a continuation line of an ENV is never seen",
        },
        {
          code: src`
def baked_secrets(text):
    findings = []
    pending, start = "", None
    for number, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not pending and (not line or line.startswith("#")):
            continue
        if not pending:
            start = number
        if line.endswith("\\"):
            pending += line[:-1] + " "
            continue
        words = (pending + line).split()
        pending = ""
        if words[0].upper() in ("ENV", "ARG"):
            for word in words[1:]:
                name = word.split("=")[0]
                if any(s in name.upper() for s in ("SECRET", "TOKEN", "PASSWORD", "KEY")):
                    findings.append(f"line {start}: {name} set in the image")
    return findings
`,
          fails: ["returns", "no-default", "key-file"],
          why: "an `ARG` with no value is reported (it is passed at build time, not baked in), and copied secret files are never checked",
        },
      ],
      task: {
        checks: [
          fn("returns", "baked_secrets", [
            example(["FROM python:3.12.7-slim\nWORKDIR /app\nARG PIP_INDEX_TOKEN=ghp_5x8Kd9f2aQ\nENV APP_ENV=prod \\\n    STRIPE_SECRET_KEY=sk_live_51HxQe2Kd9f2a\nCOPY .env requirements.lock ./\nUSER market\n"], ["line 3: PIP_INDEX_TOKEN set in the image", "line 4: STRIPE_SECRET_KEY set in the image", "line 6: copies .env"]),
            example(["FROM python:3.12.7-slim\nENV APP_ENV=prod PORT=8000\nCOPY requirements.lock .\n"], []),
            example(["# build\n\nFROM python:3.12.7-slim\nENV DB_PASSWORD=hunter2\n"], ["line 4: DB_PASSWORD set in the image"]),
            hiddenCase("an ENV with several pairs", ["FROM python:3.12.7-slim\nENV A_TOKEN=t1 PORT=80 b_secret=s2\n"], ["line 2: A_TOKEN set in the image", "line 2: b_secret set in the image"]),
          ], { label: "baked_secrets() reports secrets written into the image" }),
          fn("continued", "baked_secrets", [hiddenCase("a secret split over continuation lines", ["FROM python:3.12.7-slim\nRUN echo building\nENV APP_ENV=prod \\\n    WORKERS=4 \\\n    API_KEY=k-123\n"], ["line 3: API_KEY set in the image"])], { label: "continued instructions are read whole" }),
          fn("no-default", "baked_secrets", [hiddenCase("an ARG with no default", ["FROM python:3.12.7-slim\nARG PIP_INDEX_TOKEN\nARG GITHUB_TOKEN=\n"], [])], { label: "an ARG without a value bakes nothing in" }),
          fn("key-file", "baked_secrets", [hiddenCase("a key file copied", ["FROM python:3.12.7-slim\nCOPY --chown=market certs/signing.pem config/app.env /etc/market/\n"], ["line 2: copies certs/signing.pem", "line 2: copies config/app.env"])], { label: "copied key and .env files are reported" }),
        ],
      },
    },
  },
];
