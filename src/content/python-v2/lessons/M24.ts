/**
 * M24 Debugging & Logging: five lessons (PY-L24-01 … PY-L24-05).
 *
 * Reading a real traceback from the bottom up and using the traceback module to keep where an error happened (L01);
 * a diagnosis method on genuinely broken programs: reproduce with a small input, isolate the function, inspect values
 * with labelled prints and a real pdb session (L02); the logging module instead of print: a logger per module,
 * levels and a format (L03); logging exceptions with their traceback and summarising them by type (L04); and deciding
 * per problem whether to warn and skip, or stop (L05).
 *
 * Every program here runs. Tracebacks are produced by Python itself (`traceback.format_exc`, `logger.exception`),
 * and the pdb session is real pdb reading its commands from text, because the page's console doesn't accept typed
 * debugger commands. Logging output is sent to stdout with `stream=sys.stdout` so the examples can show it; the
 * checks capture log records with their own handler. Version 2: rewritten from a lesson set that printed a stored
 * "breakpoint()" string instead of debugging anything.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
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

/**
 * Python that captures every log record produced while `call` runs, formatted as "LEVEL name: message", with the
 * root logger opened to DEBUG for the duration (logger-level settings in the learner's code still apply).
 */
const captureLogs = (call: string, resultExpr = "_buf.getvalue()") =>
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

export const m24Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L24-01 tracebacks
  {
    id: "PY-L24-01",
    version: 2,
    slug: "the-error-name",
    title: "Read a traceback",
    lede: "When a program crashes, Python prints a traceback: the error's name and message, and the chain of calls that led there. Read from the bottom up and it tells you what went wrong and where.",
    focus: "Read a traceback from the bottom up, and use the traceback module to keep where an error happened.",
    minutes: 18,
    objectives: [
      "Find the error type, the message and the line that failed in a real traceback",
      "Follow the frames from the program's top level down to the function that failed",
      "Use `traceback.format_exc` and `traceback.extract_tb` to record where a caught error came from",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comp-if", "conversion", "dict-literal", "dict-lookup", "enumerate-call", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "module-file", "newline-escape", "none-value", "print-call", "print-text", "reassignment", "regex-call", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unquoted-name"],
    teaches: ["traceback-call"],
    blocks: [
      {
        kind: "text",
        md: "A crash ends with a block of text that starts `Traceback (most recent call last):`. It is a list of **frames**: one per function call that was in progress, oldest first. Each frame names the file, the line number and the function, then repeats the line of code (newer Pythons underline the exact part that failed with `~~~^^^`). The **last line** is the error type and its message.\n\nSo read it bottom up: the last line says *what* (ZeroDivisionError: division by zero); the frame just above it says *where* (the line that divided); the frames above that say *how the program got there*. The cause of the bug is often in a caller, not on the line that failed: a zero quantity was passed in from somewhere.\n\nThe `traceback` module gives you the same text inside a program. `traceback.format_exc()`, called in an `except` block, returns the traceback of the error being handled. The example uses it so the traceback appears in the output you can read.",
      },
      {
        kind: "example",
        title: "A unit price that divides by zero",
        code: src`
import traceback

def unit_price(line):
    return line["total"] / line["quantity"]

def price_report(lines):
    prices = []
    for line in lines:
        prices.append(unit_price(line))
    return prices

lines = [{"sku": "21329", "total": 23.4, "quantity": 12}, {"sku": "85048", "total": 0.0, "quantity": 0}]
try:
    price_report(lines)
except ZeroDivisionError:
    print(traceback.format_exc())
`,
        output: "Traceback (most recent call last):\n  File \"main.py\", line 14, in <module>\n    price_report(lines)\n    ~~~~~~~~~~~~^^^^^^^\n  File \"main.py\", line 9, in price_report\n    prices.append(unit_price(line))\n                  ~~~~~~~~~~^^^^^^\n  File \"main.py\", line 4, in unit_price\n    return line[\"total\"] / line[\"quantity\"]\n           ~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~\nZeroDivisionError: division by zero\n\n",
        note: "Bottom up: division by zero, on line 4 in `unit_price`, called from line 9 in `price_report` (for the second line, SKU 85048), called from line 14 at the top level (`<module>`). The fix belongs where a zero quantity should be refused or skipped, not in the arithmetic.",
      },
      {
        kind: "text",
        md: "The message on the last line is worth reading word for word. For a `KeyError` it is the key that was missing, quotes and all, which often reveals a spelling or capitalisation mistake.",
      },
      {
        kind: "error-example",
        title: "A key with the wrong capital",
        code: src`
def total_quantity(rows):
    total = 0
    for row in rows:
        total += row["Quantity"]
    return total

rows = [{"invoice": "489434", "quantity": 12}, {"invoice": "489435", "quantity": 4}]
print(total_quantity(rows))
`,
        error: "KeyError",
        output: "",
        note: "The console shows the traceback ending in `KeyError: 'Quantity'`, from line 4 in `total_quantity`. The rows have `quantity` in lower case.",
      },
      {
        kind: "text",
        md: "A long-running job usually shouldn't stop at the first bad record. It catches the error, keeps going, and records each failure. Keeping only `str(err)` loses where it happened. `traceback.extract_tb(err.__traceback__)` returns the frames as objects; the last one is where the error was raised, with `.name` (the function) and `.lineno` (the line).",
      },
      {
        kind: "example",
        title: "Where each bad line failed",
        code: src`
import traceback

def parse_line(text):
    invoice, quantity, price = text.split(",")
    return {"invoice": invoice, "quantity": int(quantity), "price": float(price)}

def load(lines):
    good = []
    failures = []
    for number, text in enumerate(lines, start=1):
        try:
            good.append(parse_line(text))
        except ValueError as err:
            frame = traceback.extract_tb(err.__traceback__)[-1]
            failures.append((number, frame.name, frame.lineno, str(err)))
    return good, failures

good, failures = load(["489434,12,2.55", "489435,six,1.25", "489436,4", "C489449,-1,4.95"])
print(len(good), "lines loaded")
for failure in failures:
    print(failure)
`,
        output: "2 lines loaded\n(2, 'parse_line', 5, \"invalid literal for int() with base 10: 'six'\")\n(3, 'parse_line', 4, 'not enough values to unpack (expected 3, got 2)')\n",
        note: "Both failures are ValueErrors in `parse_line`, but on different lines: line 5 is the number conversion, line 4 the unpacking of the split. That difference is the clue to two different problems in the input.",
      },
      {
        kind: "text",
        md: "**When to use it:** every crash. Read the last line, then the lowest frame in *your* code, then walk up to find where the bad value came from. Use the `traceback` module when a program handles an error but someone still needs to know where it came from.\n\n**Mistakes to avoid:** reading only the first frame (that's just where the program started); fixing the line that failed when the bad value came from a caller; and `except Exception: pass` or printing only \"something went wrong\", which throws the traceback away.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The frame that failed",
      prompt: "`failure_location` should report the function and line where an error was raised, but it reports the first frame instead, which is always the caller at the top. Make it use the frame where the error happened.",
      spec: [
        ["Function", "`failure_location(err)`"],
        ["err", "an exception that was caught"],
        ["Returns", "a tuple `(function name, line number)` of the frame where the error was raised"],
      ],
      starter: src`
import traceback

def failure_location(err):
    frame = traceback.extract_tb(err.__traceback__)[0]
    return (frame.name, frame.lineno)

def average(values):
    return sum(values) / len(values)

try:
    average([])
except ZeroDivisionError as err:
    print(failure_location(err))
`,
      answer: src`
import traceback

def failure_location(err):
    frame = traceback.extract_tb(err.__traceback__)[-1]
    return (frame.name, frame.lineno)

def average(values):
    return sum(values) / len(values)

try:
    average([])
except ZeroDivisionError as err:
    print(failure_location(err))
`,
      wrong: [
        {
          code: src`
import traceback

def failure_location(err):
    frames = traceback.extract_tb(err.__traceback__)
    return (frames[0].name, frames[-1].lineno)
`,
          fails: ["returns", "deeper"],
          why: "it mixes the first frame's function with the last frame's line",
        },
      ],
      hints: [
        "`extract_tb` returns the frames oldest first.",
        "The frame where the error was raised is the newest one.",
        "Index the list from the end instead of the start.",
      ],
      task: {
        checks: [
          expr("returns", "failure_location() names the function that divided", "def _avg(values):\n    return sum(values) / len(values)\ntry:\n    _avg([])\nexcept ZeroDivisionError as _e:\n    result = failure_location(_e)", py.tuple(py.str("_avg"), py.int(2)), { show: "failure_location(<the error from average([])>)" }),
          expr("deeper", "An error three calls deep", "def _c(row):\n    return int(row['qty'])\ndef _b(rows):\n    return [_c(r) for r in rows]\ndef _a(rows):\n    total = 0\n    for v in _b(rows):\n        total += v\n    return total\ntry:\n    _a([{'qty': '3'}, {'qty': 'x'}])\nexcept ValueError as _e:\n    result = failure_location(_e)", py.tuple(py.str("_c"), py.int(2)), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A one-line error summary",
        prompt: "A nightly job's report has room for one line per failure. Write `error_summary(err)` for a caught exception: the error's own last line (type and message, as the traceback would print it), then where it was raised, in the form `ValueError: invalid literal for int() with base 10: 'six' (in parse_line, line 5)`.",
        spec: [
          ["Function", "`error_summary(err)`"],
          ["Returns", "`\"<Type>: <message> (in <function>, line <n>)\"` using the frame where the error was raised"],
          ["Useful", "`traceback.format_exception_only(err)` returns the traceback's last line(s) as a list of texts ending in `\\n`"],
          ["Example", "the KeyError from `{}[\"amount\"]` raised on line 2 of `charge` → `\"KeyError: 'amount' (in charge, line 2)\"`"],
        ],
        starter: src`
import traceback

def error_summary(err):
    return str(err)

def parse_line(text):
    invoice, quantity = text.split(",")
    return int(quantity)

try:
    parse_line("489435,six")
except ValueError as err:
    print(error_summary(err))
`,
        answer: src`
import traceback

def error_summary(err):
    last_line = traceback.format_exception_only(err)[-1].strip()
    frame = traceback.extract_tb(err.__traceback__)[-1]
    return f"{last_line} (in {frame.name}, line {frame.lineno})"

def parse_line(text):
    invoice, quantity = text.split(",")
    return int(quantity)

try:
    parse_line("489435,six")
except ValueError as err:
    print(error_summary(err))
`,
        alternatives: [
          src`
import traceback

def error_summary(err):
    what = "".join(traceback.format_exception_only(err)).strip().split("\n")[-1]
    where = traceback.extract_tb(err.__traceback__)
    name = where[len(where) - 1].name
    line = where[len(where) - 1].lineno
    return what + " (in " + name + ", line " + str(line) + ")"
`,
        ],
        wrong: [
          {
            code: src`
import traceback

def error_summary(err):
    frame = traceback.extract_tb(err.__traceback__)[-1]
    return f"{err} (in {frame.name}, line {frame.lineno})"
`,
            fails: ["returns", "key-error", "raised"],
            why: "`str(err)` is only the message, so the error type is missing",
          },
          {
            code: src`
import traceback

def error_summary(err):
    last_line = traceback.format_exception_only(err)[-1].strip()
    frame = traceback.extract_tb(err.__traceback__)[0]
    return f"{last_line} (in {frame.name}, line {frame.lineno})"
`,
            fails: ["returns", "key-error", "raised"],
            why: "the first frame is the caller at the top, not where the error was raised",
          },
        ],
        hints: [
          "Two parts: *what* (the traceback's last line) and *where* (the newest frame).",
          "`format_exception_only` gives a list of texts; take its last item and strip the newline.",
          "Put the frame's `.name` and `.lineno` into the text with an f-string.",
        ],
        task: {
          checks: [
            expr("returns", "A ValueError raised in parse_line", "def _parse(text):\n    invoice, quantity = text.split(',')\n    return int(quantity)\ntry:\n    _parse('489435,six')\nexcept ValueError as _e:\n    result = error_summary(_e)", "ValueError: invalid literal for int() with base 10: 'six' (in _parse, line 3)", { show: "error_summary(<the ValueError from parse_line(\"489435,six\")>)" }),
            expr("key-error", "A KeyError two calls deep", "def _charge(payment):\n    return payment['amount'] * 100\ndef _run(payments):\n    return [_charge(p) for p in payments]\ntry:\n    _run([{'amount': 2}, {'id': 'PAY7'}])\nexcept KeyError as _e:\n    result = error_summary(_e)", "KeyError: 'amount' (in _charge, line 2)", { hidden: true }),
            expr("raised", "An error the code raised itself", "class _QuantityError(Exception):\n    pass\ndef _check(q):\n    if q < 0:\n        raise _QuantityError(f'negative quantity {q}')\n    return q\ndef _run(q):\n    return _check(q)\ntry:\n    _run(-4)\nexcept _QuantityError as _e:\n    result = error_summary(_e)", "_QuantityError: negative quantity -4 (in _check, line 5)", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Read a pasted traceback",
        prompt: "Users paste tracebacks into bug reports. Write `crash_site(text)`: given the full traceback text, return a dictionary with the error line (the last non-empty line) and the file, line number and function of the **innermost** frame, the last `File \"…\", line …, in …` line.",
        spec: [
          ["Function", "`crash_site(text)`"],
          ["text", "a traceback as text, from `Traceback (most recent call last):` to the error line"],
          ["Returns", "`{\"error\": …, \"file\": …, \"line\": <int>, \"function\": …}`"],
          ["Rules", "frame lines look like `  File \"main.py\", line 9, in price_report`; the code lines and `~~~^^^` lines between them are ignored"],
          ["Example", "the starter's traceback → `{'error': 'ZeroDivisionError: division by zero', 'file': 'main.py', 'line': 4, 'function': 'unit_price'}`"],
        ],
        starter: src`
import re

def crash_site(text):
    return {}

report = """Traceback (most recent call last):
  File "main.py", line 14, in <module>
    price_report(lines)
  File "main.py", line 9, in price_report
    prices.append(unit_price(line))
  File "main.py", line 4, in unit_price
    return line["total"] / line["quantity"]
           ~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~
ZeroDivisionError: division by zero
"""
print(crash_site(report))
`,
        answer: src`
import re

def crash_site(text):
    lines = [line for line in text.splitlines() if line.strip()]
    site = {"error": lines[-1].strip(), "file": None, "line": None, "function": None}
    for line in lines:
        found = re.search(r'File "(.+)", line (\d+), in (.+)', line)
        if found:
            site["file"] = found.group(1)
            site["line"] = int(found.group(2))
            site["function"] = found.group(3).strip()
    return site

report = """Traceback (most recent call last):
  File "main.py", line 14, in <module>
    price_report(lines)
  File "main.py", line 9, in price_report
    prices.append(unit_price(line))
  File "main.py", line 4, in unit_price
    return line["total"] / line["quantity"]
           ~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~
ZeroDivisionError: division by zero
"""
print(crash_site(report))
`,
        alternatives: [
          src`
def crash_site(text):
    rows = text.strip().split("\n")
    frame_lines = [row.strip() for row in rows if row.strip().startswith("File ")]
    last = frame_lines[-1]
    name_part, line_part, func_part = last.split(", ", 2)
    return {
        "error": rows[-1].strip(),
        "file": name_part[len('File "'):-1],
        "line": int(line_part.split()[1]),
        "function": func_part[len("in "):],
    }
`,
        ],
        wrong: [
          {
            code: src`
import re

def crash_site(text):
    lines = text.strip().splitlines()
    found = re.search(r'File "(.+)", line (\d+), in (.+)', text)
    return {"error": lines[-1], "file": found.group(1), "line": int(found.group(2)), "function": found.group(3)}
`,
            fails: ["returns", "library"],
            why: "`re.search` finds the first frame, the top of the program, not where it crashed",
          },
          {
            code: src`
import re

def crash_site(text):
    lines = text.splitlines()
    site = {"error": lines[-1], "file": None, "line": None, "function": None}
    for line in lines:
        found = re.search(r'File "(.+)", line (\d+), in (.+)', line)
        if found:
            site["file"] = found.group(1)
            site["line"] = found.group(2)
            site["function"] = found.group(3)
    return site
`,
            fails: ["returns", "library", "blank-end"],
            why: "the line number stays text, and a trailing blank line becomes the error",
          },
        ],
        hints: [
          "Two separate jobs: the error is the last line that isn't blank; the location comes from the frame lines.",
          "A regular expression (see Dates Numbers & Regex) with three groups can pull the file, line and function out of one `File …` line.",
          "Walk every line and overwrite the location each time a frame line matches, so the innermost one wins. Convert the line number with `int`.",
        ],
        task: {
          checks: [
            fn("returns", "crash_site", [
              example(["Traceback (most recent call last):\n  File \"main.py\", line 14, in <module>\n    price_report(lines)\n  File \"main.py\", line 9, in price_report\n    prices.append(unit_price(line))\n  File \"main.py\", line 4, in unit_price\n    return line[\"total\"] / line[\"quantity\"]\n           ~~~~~~~~~~~~~~^~~~~~~~~~~~~~~~~~\nZeroDivisionError: division by zero\n"], { error: "ZeroDivisionError: division by zero", file: "main.py", line: 4, function: "unit_price" }),
              example(["Traceback (most recent call last):\n  File \"report.py\", line 3, in <module>\n    load()\nKeyError: 'Quantity'"], { error: "KeyError: 'Quantity'", file: "report.py", line: 3, function: "<module>" }),
            ], { label: "crash_site() finds the error and the innermost frame" }),
            fn("library", "crash_site", [
              hiddenCase("a frame inside a library file", ["Traceback (most recent call last):\n  File \"/srv/app/jobs.py\", line 40, in nightly\n    rows = list(csv.DictReader(f))\n  File \"/usr/lib/python3.12/csv.py\", line 116, in __next__\n    row = next(self.reader)\n_csv.Error: line contains NUL\n"], { error: "_csv.Error: line contains NUL", file: "/usr/lib/python3.12/csv.py", line: 116, function: "__next__" }),
            ], { label: "crash_site() works for library frames" }),
            fn("blank-end", "crash_site", [
              hiddenCase("blank lines after the error", ["Traceback (most recent call last):\n  File \"a.py\", line 1, in <module>\n    1/0\nZeroDivisionError: division by zero\n\n\n"], { error: "ZeroDivisionError: division by zero", file: "a.py", line: 1, function: "<module>" }),
            ], { label: "crash_site() ignores trailing blank lines" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import traceback

def a(x):
    return b(x) + 1

def b(x):
    return 10 // x

try:
    a(0)
except ZeroDivisionError as err:
    frames = traceback.extract_tb(err.__traceback__)
    print(len(frames), frames[-1].name, frames[0].name)
`,
        choices: ["3 b <module>", "2 b a", "3 a b", "1 b b"],
        answer: 0,
        why: "Three calls were in progress: the top level (`<module>`), `a`, and `b`, which divided. The list is oldest first, so `[-1]` is `b` and `[0]` is the top level.",
      },
      {
        id: "q2",
        prompt: "A common mistake is to guess the cause instead of reading the message. Which call fails, and what does this print?",
        program: src`
try:
    print(int(" 12 "))
    print(int("1,200"))
except ValueError as err:
    print(err)
`,
        choices: ["12\ninvalid literal for int() with base 10: '1,200'", "invalid literal for int() with base 10: ' 12 '", "12\n1200", "12"],
        answer: 0,
        why: "`int` ignores spaces at the ends, so `\" 12 \"` is fine. The message quotes the exact text that failed: the comma is the problem.",
      },
      {
        id: "q3",
        prompt: "A traceback has seven frames. Where do you look first?",
        choices: [
          "The last line (the error and message), then the lowest frame that is in your own code",
          "The first frame, because that's where the program started",
          "The middle frame",
          "Whichever frame mentions a library file",
        ],
        answer: 0,
        why: "The last line says what happened and the frames just above it say where. Library frames often come last; the lowest frame in your code is usually where a bad value was passed in.",
      },
    ],
    review: [
      "Read a traceback bottom up: error and message, the line that failed, then the callers above it.",
      "The message names the exact value or key involved; the cause is often in a caller.",
      "`traceback.format_exc()` returns the text; `traceback.extract_tb(err.__traceback__)[-1]` is the frame where it was raised.",
      "Next: a method for finding a bug when there is no crash at all, only a wrong answer.",
    ],
  },

  // ------------------------------------------------------------------ PY-L24-02 diagnosis and pdb
  {
    id: "PY-L24-02",
    version: 2,
    slug: "reproduce-and-isolate",
    title: "Find a bug: reproduce, isolate, inspect",
    lede: "A wrong answer gives no traceback. Make the bug happen on a small input, narrow it down to one function, then look at the values while it runs, with labelled prints or with the pdb debugger.",
    focus: "Diagnose a wrong result by reproducing it, isolating the function, and inspecting values with prints or pdb.",
    minutes: 20,
    objectives: [
      "Shrink a failing case to the smallest input that still shows the bug",
      "Inspect values with labelled prints and `repr`, so text and numbers can't be confused",
      "Read a pdb session: where it stopped, `p` to print a value, `n` for the next line, `c` to continue",
    ],
    requires: ["arithmetic", "assignment", "comparison", "conversion", "dict-get", "dict-literal", "dict-lookup", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "newline-escape", "none-value", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "while-loop"],
    teaches: ["breakpoint-call"],
    blocks: [
      {
        kind: "text",
        md: "An invoice total comes out too low and nothing crashes. Staring at the code rarely finds this kind of bug; a method does:\n\n1. **Reproduce**: find an input that shows the bug every time, and make it as small as you can. Three lines whose right total you can work out by hand beat a file of ten thousand.\n2. **Isolate**: check the pieces separately. If each line's total is right, the bug is in how they're combined.\n3. **Inspect**: print the values the code is actually working with, with labels, at the step you suspect.\n\nThe program below is genuinely broken. Run it before reading the note.",
      },
      {
        kind: "example",
        title: "An order total that is too low",
        code: src`
def line_total(line):
    price = line["unit_price"] * line["quantity"]
    if line["discount"]:
        price = price - price * line["discount"]
    return price

def order_total(lines):
    total = 0
    for line in lines:
        total = line_total(line)
    return total

lines = [
    {"sku": "21329", "unit_price": 2.5, "quantity": 4, "discount": 0},
    {"sku": "85048", "unit_price": 10.0, "quantity": 1, "discount": 0.5},
    {"sku": "21252", "unit_price": 1.0, "quantity": 3, "discount": 0},
]
print("order total:", order_total(lines), "expected:", 10 + 5 + 3)
for line in lines:
    print("isolate:", line["sku"], line_total(line))
total = 0
for line in lines:
    total = line_total(line)
    print("inspect: after", line["sku"], "total is", total)
`,
        output: "order total: 3.0 expected: 18\nisolate: 21329 10.0\nisolate: 85048 5.0\nisolate: 21252 3.0\ninspect: after 21329 total is 10.0\ninspect: after 85048 total is 5.0\ninspect: after 21252 total is 3.0\n",
        note: "Reproduce: three lines whose answer (18) we know. Isolate: every `line_total` is right, so the bug is in `order_total`. Inspect: the running total never grows, it is replaced. The fix is `total += line_total(line)`. Labels on each print matter: unlabelled numbers are easy to misread.",
      },
      {
        kind: "text",
        md: "Prints have to be added and removed by hand. A **debugger** lets you pause a running program and ask questions. Python's is **pdb**. Put `breakpoint()` on a line (or `import pdb; pdb.set_trace()`, which is the same) and run the script in a terminal: it stops there and shows a `(Pdb)` prompt. The most used commands are `p name` (print a value), `n` (run the next line), `s` (step into a call), `l` (list the code around you) and `c` (continue running).\n\nThis page's console can't take typed debugger commands, so the next example gives pdb its commands as text instead: a real pdb session, with the commands `p total, count`, `p ratings` and `c` already written down. In a terminal you would type them at the prompt.",
      },
      {
        kind: "example",
        title: "A real pdb session on an average that is too high",
        code: src`
import io
import os
import pdb

commands = io.StringIO("p total, count\np ratings\nc\n")
session = io.StringIO()
debugger = pdb.Pdb(stdin=commands, stdout=session)

def average_rating(ratings):
    total = 0
    for rating in ratings:
        total += rating
    count = len(ratings) - 1
    debugger.set_trace()
    return total / count

print("average:", average_rating([4, 5, 3]))
print(session.getvalue().replace(os.getcwd() + "/", ""))
`,
        output: "average: 6.0\n> main.py(14)average_rating()\n(Pdb) (12, 2)\n(Pdb) [4, 5, 3]\n(Pdb) \n",
        note: "pdb stopped at line 14, the `set_trace()` call, before the division ran. `p total, count` showed `(12, 2)`: three ratings but a count of 2, so `len(ratings) - 1` is the bug. `c` let the program finish. (`(Pdb)` is the prompt; in a terminal your typed command would appear after it. The `replace` only shortens the file path.)",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the result is wrong but nothing crashes, or a crash's cause is far from where it happened. Prints are quick for a loop you suspect; pdb is better when you don't yet know which value to look at.\n\n**Mistakes to avoid:** debugging on the full data set (shrink it first); changing several things at once and not knowing which one fixed it; printing values without labels; and plain `print(value)` when the type matters: `print(\"12\")` and `print(12)` look the same, `print(repr(value))` doesn't. Remove debugging prints and breakpoints once the bug is fixed.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Why nothing counts as returned",
      prompt: "`count_returned` always returns 0. The starter prints each status with `repr` so you can see exactly what the code compares. Run it, spot the mismatch, and fix the comparison.",
      spec: [
        ["Function", "`count_returned(orders)`"],
        ["Returns", "how many orders have the status `returned` (stored in lower case)"],
      ],
      starter: src`
def count_returned(orders):
    count = 0
    for order in orders:
        print("inspect:", repr(order["status"]), repr("Returned"))
        if order["status"] == "Returned":
            count += 1
    return count

orders = [{"id": "O100376", "status": "returned"}, {"id": "O100282", "status": "delivered"}, {"id": "O100918", "status": "returned"}]
print(count_returned(orders))
`,
      answer: src`
def count_returned(orders):
    count = 0
    for order in orders:
        if order["status"] == "returned":
            count += 1
    return count

orders = [{"id": "O100376", "status": "returned"}, {"id": "O100282", "status": "delivered"}, {"id": "O100918", "status": "returned"}]
print(count_returned(orders))
`,
      wrong: [
        {
          code: src`
def count_returned(orders):
    count = 0
    for order in orders:
        if "return" in order["status"].lower():
            count += 1
    return count
`,
          fails: ["returns"],
          why: "`in` also counts statuses such as `return_requested`",
        },
      ],
      hints: [
        "Run it and compare the two texts printed on each inspect line, letter by letter.",
        "The stored statuses are all lower case.",
        "Compare with the lower-case word; then delete the inspect print.",
      ],
      task: {
        checks: [
          fn("returns", "count_returned", [
            example([[{ id: "O100376", status: "returned" }, { id: "O100282", status: "delivered" }, { id: "O100918", status: "returned" }]], 2),
            hiddenCase("a status that only contains the word", [[{ id: "O1", status: "return_requested" }, { id: "O2", status: "returned" }]], 1),
            hiddenCase("no orders", [[]], 0),
          ], { label: "count_returned() counts the returned orders" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Daily totals that lose days",
        prompt: "`daily_totals` should add up payment amounts per day, but finance reports that some days are missing and others are too small. Reproduce the problem with a few rows you can check by hand, isolate it, and fix the function. Its contract is below; the code you're given is genuinely broken in more than one place.",
        spec: [
          ["Function", "`daily_totals(payments)`"],
          ["payments", "a list of dictionaries with `paid_at` like `\"2011-03-14 09:30\"` and `amount` (a number)"],
          ["Returns", "a dictionary from day (`\"2011-03-14\"`) to the total of that day's amounts; `{}` for no payments"],
        ],
        starter: src`
def daily_totals(payments):
    totals = {}
    for payment in payments:
        day = payment["paid_at"][:9]
        totals[day] = 0
        totals[day] += payment["amount"]
    return totals

payments = [
    {"paid_at": "2011-03-14 09:30", "amount": 20},
    {"paid_at": "2011-03-14 17:05", "amount": 15},
    {"paid_at": "2011-03-15 08:00", "amount": 40},
]
print(daily_totals(payments))
`,
        answer: src`
def daily_totals(payments):
    totals = {}
    for payment in payments:
        day = payment["paid_at"][:10]
        if day not in totals:
            totals[day] = 0
        totals[day] += payment["amount"]
    return totals

payments = [
    {"paid_at": "2011-03-14 09:30", "amount": 20},
    {"paid_at": "2011-03-14 17:05", "amount": 15},
    {"paid_at": "2011-03-15 08:00", "amount": 40},
]
print(daily_totals(payments))
`,
        alternatives: [
          src`
def daily_totals(payments):
    totals = {}
    for payment in payments:
        day = payment["paid_at"].split(" ")[0]
        totals[day] = totals.get(day, 0) + payment["amount"]
    return totals
`,
        ],
        wrong: [
          {
            code: src`
def daily_totals(payments):
    totals = {}
    for payment in payments:
        day = payment["paid_at"][:10]
        totals[day] = 0
        totals[day] += payment["amount"]
    return totals
`,
            fails: ["returns"],
            why: "only the slice was fixed: each payment still resets its day's total to 0",
          },
          {
            code: src`
def daily_totals(payments):
    totals = {}
    for payment in payments:
        day = payment["paid_at"][:9]
        if day not in totals:
            totals[day] = 0
        totals[day] += payment["amount"]
    return totals
`,
            fails: ["returns"],
            why: "only the reset was fixed: `[:9]` still cuts the last digit of the day, merging the 14th and 15th",
          },
        ],
        hints: [
          "Reproduce with the three starter rows: work out the right answer by hand (two days, 35 and 40) and compare with what it prints.",
          "Inspect the keys: print `repr(day)` for each payment. Count the characters a date like `2011-03-14` needs.",
          "There is a second problem in the two lines that update the total: what happens to the 20 when the second payment for the same day arrives?",
        ],
        task: {
          checks: [
            fn("returns", "daily_totals", [
              example([[{ paid_at: "2011-03-14 09:30", amount: 20 }, { paid_at: "2011-03-14 17:05", amount: 15 }, { paid_at: "2011-03-15 08:00", amount: 40 }]], { "2011-03-14": 35, "2011-03-15": 40 }),
              example([[]], {}),
              example([[{ paid_at: "2011-03-31 23:59", amount: 9.5 }]], { "2011-03-31": 9.5 }),
              hiddenCase("days that differ only in the last digit", [[{ paid_at: "2011-04-01 10:00", amount: 1 }, { paid_at: "2011-04-02 10:00", amount: 2 }, { paid_at: "2011-04-01 11:00", amount: 3 }]], { "2011-04-01": 4, "2011-04-02": 2 }),
              hiddenCase("three payments on one day", [[{ paid_at: "2011-05-05 01:00", amount: 5 }, { paid_at: "2011-05-05 02:00", amount: 5 }, { paid_at: "2011-05-05 03:00", amount: 5 }]], { "2011-05-05": 15 }),
            ], { label: "daily_totals() totals every payment under its day" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Find the first row that breaks",
        prompt: "Reproducing a crash in a 50,000-row import starts with finding the row that causes it. Write `first_failing_row(rows, process)`: call `process(row)` on each row in order and return `(row_number, message)` for the first row where it raises an exception, where `row_number` counts from 1 and `message` is `str(err)`. Return `None` if every row is processed. Don't call `process` on any row after the first failure.",
        spec: [
          ["Function", "`first_failing_row(rows, process)`"],
          ["process", "a function that takes one row; it may raise any exception"],
          ["Returns", "`(row_number, message)` for the first failure, or `None`"],
          ["Rules", "row numbers start at 1; stop at the first failure"],
        ],
        starter: src`
def first_failing_row(rows, process):
    return None

def to_quantity(row):
    return int(row["Quantity"])

rows = [{"Quantity": "12"}, {"Quantity": "4"}, {"Quantity": "six"}, {"Quantity": ""}]
print(first_failing_row(rows, to_quantity))
`,
        answer: src`
def first_failing_row(rows, process):
    for number, row in enumerate(rows, start=1):
        try:
            process(row)
        except Exception as err:
            return (number, str(err))
    return None

def to_quantity(row):
    return int(row["Quantity"])

rows = [{"Quantity": "12"}, {"Quantity": "4"}, {"Quantity": "six"}, {"Quantity": ""}]
print(first_failing_row(rows, to_quantity))
`,
        alternatives: [
          src`
def first_failing_row(rows, process):
    number = 0
    while number < len(rows):
        try:
            process(rows[number])
        except Exception as problem:
            return number + 1, f"{problem}"
        number += 1
    return None
`,
        ],
        wrong: [
          {
            code: src`
def first_failing_row(rows, process):
    for number, row in enumerate(rows):
        try:
            process(row)
        except Exception as err:
            return (number, str(err))
    return None
`,
            fails: ["returns", "other-errors"],
            why: "`enumerate` starts at 0, so every row number is one too small",
          },
          {
            code: src`
def first_failing_row(rows, process):
    first = None
    for number, row in enumerate(rows, start=1):
        try:
            process(row)
        except ValueError as err:
            if first is None:
                first = (number, str(err))
    return first
`,
            fails: ["other-errors", "stops"],
            why: "it catches only ValueError and keeps calling `process` after the first failure",
          },
        ],
        hints: [
          "`enumerate(rows, start=1)` gives row numbers that start at 1.",
          "Wrap only the call to `process` in `try`. A diagnostic tool wants every kind of failure, so catch `Exception`, not one type.",
          "Return from inside the `except` block: that both reports the first failure and stops the loop.",
        ],
        task: {
          checks: [
            expr("returns", "first_failing_row() finds row 3 in the starter", "def _q(row):\n    return int(row['Quantity'])\nresult = first_failing_row([{'Quantity': '12'}, {'Quantity': '4'}, {'Quantity': 'six'}, {'Quantity': ''}], _q)", py.tuple(py.int(3), py.str("invalid literal for int() with base 10: 'six'")), { show: "first_failing_row(rows, to_quantity)" }),
            expr("none", "Every row is fine", "def _q(row):\n    return int(row['Quantity'])\nresult = first_failing_row([{'Quantity': '1'}], _q)", null, { show: "first_failing_row([{\"Quantity\": \"1\"}], to_quantity)" }),
            expr("other-errors", "A KeyError rather than a ValueError", "def _q(row):\n    return int(row['Quantity'])\nresult = first_failing_row([{'Quantity': '2'}, {'Qty': '3'}], _q)", py.tuple(py.int(2), py.str("'Quantity'")), { hidden: true }),
            expr("stops", "No rows are processed after the failure", "_seen = []\ndef _q(row):\n    _seen.append(row)\n    return 10 / row\nfirst_failing_row([5, 0, 2, 0], _q)\nresult = _seen", [5, 0], { hidden: true }),
            expr("empty", "No rows at all", "result = first_failing_row([], len)", null, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "This loop is meant to collect every product's SKU. What does it print?",
        program: src`
def skus(products):
    found = []
    for product in products:
        found = [product["sku"]]
    return found

print(skus([{"sku": "21329"}, {"sku": "85048"}, {"sku": "21252"}]))
`,
        choices: ["['21252']", "['21329', '85048', '21252']", "['21329']", "[]"],
        answer: 0,
        why: "Each pass replaces `found` with a new one-item list, so only the last SKU survives: the same \"replace instead of add\" bug as the order total.",
      },
      {
        id: "q2",
        prompt: "A common mistake: inspecting with plain `print`. What does this print?",
        program: src`
from_csv = "12"
from_code = 12
print(from_csv, from_code)
print(repr(from_csv), repr(from_code), from_csv == from_code)
`,
        choices: ["12 12\n'12' 12 False", "12 12\n12 12 True", "'12' 12\n'12' 12 False", "12 12\n'12' '12' False"],
        answer: 0,
        why: "`print` shows text without quotes, so the two look identical. `repr` shows the quotes, which explains why the comparison is False.",
      },
      {
        id: "q3",
        prompt: "A pdb session has stopped at `(Pdb)` inside a loop. You want to see the value of `total`, then run just the next line. What do you type?",
        choices: ["`p total`, then `n`", "`c`, then `p total`", "`print total`, then `s`", "`n total`"],
        answer: 0,
        why: "`p` prints an expression and `n` runs the next line in the current function. `c` continues until the next breakpoint (or the end), and `s` steps into a function call.",
      },
    ],
    review: [
      "Reproduce on a small input with a known answer, isolate the function, then inspect the values.",
      "Label your prints, and use `repr` when the type matters.",
      "`breakpoint()` stops in pdb: `p` prints, `n` runs the next line, `s` steps in, `c` continues.",
      "Next: replacing debugging prints with logging that can stay in the program.",
    ],
  },

  // ------------------------------------------------------------------ PY-L24-03 logging
  {
    id: "PY-L24-03",
    version: 2,
    slug: "a-log-line",
    title: "Log with the logging module",
    lede: "Prints are for the person running a script; logs are for whoever has to find out later what it did. The logging module adds levels, names and a consistent format, and lets you turn detail up or down without editing code.",
    focus: "Replace prints with a named logger, choose a level for each message, and configure the format once.",
    minutes: 18,
    objectives: [
      "Get a logger per module with `logging.getLogger(__name__)`",
      "Pick DEBUG, INFO, WARNING or ERROR for a message, and filter by level",
      "Configure the output once, in the program's entry point, with `basicConfig`",
    ],
    requires: ["argparse-call", "arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "module-file", "path-call", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack"],
    teaches: ["log-call", "log-warning"],
    blocks: [
      {
        kind: "text",
        md: "A nightly import runs with nobody watching. When finance asks why yesterday's numbers are low, the program's output is all you have. **Logging** writes messages that carry a **level** (how serious), the **name** of the part of the program that wrote them, and a consistent format, often with a time stamp.\n\nThe five levels, from least to most serious: `DEBUG` (detail for diagnosing), `INFO` (normal progress), `WARNING` (something odd, but the program carries on), `ERROR` (an operation failed), `CRITICAL` (the program can't go on). The configured level is a threshold: at `INFO`, DEBUG messages are dropped and everything else is shown.\n\n`logging.basicConfig` sets this up once. Real programs leave logs on the error stream (the default); the examples pass `stream=sys.stdout` only so the lines appear in the output shown here, and `force=True` replaces any setup from an earlier run of the page.",
      },
      {
        kind: "example",
        title: "Levels, names and a format",
        code: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("invoices")

log.debug("raw line: %s", "489434,12,2.55")
log.info("loaded %d lines from %s", 3, "march.csv")
log.warning("line %d has no customer id", 2)
log.error("could not parse quantity %r", "six")
`,
        output: "INFO invoices: loaded 3 lines from march.csv\nWARNING invoices: line 2 has no customer id\nERROR invoices: could not parse quantity 'six'\n",
        note: "The DEBUG line is below the INFO threshold, so it isn't shown. The values go in as extra arguments (`%s` text, `%d` whole number, `%r` repr) and are only formatted when the line is actually written. `%(name)s` in the format is the logger's name.",
      },
      {
        kind: "text",
        md: "Each module gets its own logger with `logging.getLogger(__name__)`. `__name__` is the module's import name (see Modules & Packages), so log lines say which file they came from, and you can turn detail up for one module only. Modules only *get* loggers; the program you run configures logging, once.",
      },
      {
        kind: "example",
        title: "A logger per module",
        code: src`
import logging
import sys
from pathlib import Path

Path("pricing.py").write_text('''import logging

log = logging.getLogger(__name__)

def line_total(quantity, unit_price):
    log.debug("pricing %s x %s", quantity, unit_price)
    if quantity < 0:
        log.warning("negative quantity %s treated as a return", quantity)
    return quantity * unit_price
''')

import pricing

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger(__name__)

log.info("pricing two lines")
print(pricing.line_total(12, 2.5), pricing.line_total(-1, 4.95))
logging.getLogger("pricing").setLevel(logging.DEBUG)
log.info("detail switched on for pricing only")
print(pricing.line_total(2, 3.0))
`,
        output: "INFO __main__: pricing two lines\nWARNING pricing: negative quantity -1 treated as a return\n30.0 -4.95\nINFO __main__: detail switched on for pricing only\nDEBUG pricing: pricing 2 x 3.0\n6.0\n",
        note: "The script's own logger is called `__main__`; the module's is `pricing`. Setting the `pricing` logger to DEBUG shows its detail without flooding the output with every other module's debug lines.",
      },
      {
        kind: "text",
        md: "**When to use it:** anything that runs unattended, or long enough that you'd want a record. Keep `print` for output that *is* the program's result (a report on screen).\n\n**Mistakes to avoid:** calling `basicConfig` inside a module that others import (only the entry point configures); calling it a second time and expecting a change (without `force=True` the second call does nothing); logging everything at INFO so warnings drown; and building the message with an f-string when the arguments form is available, which formats text even for lines that are filtered out.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Blank lines are a warning",
      prompt: "`load_quantities` logs skipped blank lines at INFO, so they disappear when the job runs at WARNING. Log them as warnings instead.",
      spec: [
        ["Function", "`load_quantities(lines)`"],
        ["Logs", "`WARNING loader: skipping blank line <n>` for each blank line (n from 1)"],
        ["Returns", "the quantities as `int`s"],
      ],
      starter: src`
import logging
import sys

log = logging.getLogger("loader")

def load_quantities(lines):
    quantities = []
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            log.info("skipping blank line %d", number)
            continue
        quantities.append(int(line))
    return quantities

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(load_quantities(["12", "", "4"]))
`,
      answer: src`
import logging
import sys

log = logging.getLogger("loader")

def load_quantities(lines):
    quantities = []
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            log.warning("skipping blank line %d", number)
            continue
        quantities.append(int(line))
    return quantities

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(load_quantities(["12", "", "4"]))
`,
      wrong: [
        {
          code: src`
import logging

log = logging.getLogger("loader")

def load_quantities(lines):
    quantities = []
    for number, line in enumerate(lines, start=1):
        if not line.strip():
            print("WARNING loader: skipping blank line", number)
            continue
        quantities.append(int(line))
    return quantities
`,
          fails: ["logs", "other-lines"],
          why: "a print looks the same on screen but isn't a log record, so no logging setup can filter or keep it",
        },
      ],
      hints: [
        "Only the level of one call needs to change.",
        "Each level has its own method on the logger.",
        "Use `log.warning` with the same message and argument.",
      ],
      task: {
        checks: [
          expr("logs", "A blank line is logged as a warning", captureLogs("_ret = load_quantities(['12', '', '4'])"), "WARNING loader: skipping blank line 2\n", { show: "the log lines of load_quantities([\"12\", \"\", \"4\"])" }),
          expr("returns", "load_quantities() still returns the numbers", "result = load_quantities(['7', ' ', '3'])", [7, 3], { show: "load_quantities([\"7\", \" \", \"3\"])" }),
          expr("other-lines", "Several blank lines", captureLogs("_ret = load_quantities(['', '5', '', ''])"), "WARNING loader: skipping blank line 1\nWARNING loader: skipping blank line 3\nWARNING loader: skipping blank line 4\n", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Log what a price import did",
        prompt: "Write `parse_prices(lines)` using the module logger `log = logging.getLogger(\"prices\")`. Each line is `SKU,price`. Return a dictionary from SKU to price (a float). A line that doesn't split into exactly two parts, or whose price isn't a number, is skipped with a WARNING `line <n>: <reason>`, where reason is `expected 2 fields` or `bad price '<text>'`. At the end, log one INFO line: `parsed <k> prices, skipped <m> lines`.",
        spec: [
          ["Function", "`parse_prices(lines)`"],
          ["Logger", "named `prices`"],
          ["Logs", "`WARNING prices: line 2: bad price 'n/a'`, `WARNING prices: line 3: expected 2 fields`, then `INFO prices: parsed 2 prices, skipped 2 lines`"],
          ["Returns", "`{sku: price}`"],
          ["Rules", "line numbers start at 1; the summary is logged even when every line is fine"],
        ],
        starter: src`
import logging
import sys

log = logging.getLogger("prices")

def parse_prices(lines):
    prices = {}
    return prices

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(parse_prices(["21329,2.55", "85048,n/a", "21252", "84031A,3.75"]))
`,
        answer: src`
import logging
import sys

log = logging.getLogger("prices")

def parse_prices(lines):
    prices = {}
    skipped = 0
    for number, line in enumerate(lines, start=1):
        parts = line.split(",")
        if len(parts) != 2:
            log.warning("line %d: expected 2 fields", number)
            skipped += 1
            continue
        sku, text = parts
        try:
            prices[sku] = float(text)
        except ValueError:
            log.warning("line %d: bad price %r", number, text)
            skipped += 1
    log.info("parsed %d prices, skipped %d lines", len(prices), skipped)
    return prices

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(parse_prices(["21329,2.55", "85048,n/a", "21252", "84031A,3.75"]))
`,
        alternatives: [
          src`
import logging

log = logging.getLogger("prices")

def parse_prices(lines):
    good = {}
    bad = 0
    number = 0
    for line in lines:
        number += 1
        fields = line.split(",")
        if len(fields) == 2:
            try:
                good[fields[0]] = float(fields[1])
                continue
            except ValueError:
                log.warning(f"line {number}: bad price {fields[1]!r}")
        else:
            log.warning(f"line {number}: expected 2 fields")
        bad += 1
    log.info(f"parsed {len(good)} prices, skipped {bad} lines")
    return good
`,
        ],
        wrong: [
          {
            code: src`
import logging

log = logging.getLogger("prices")

def parse_prices(lines):
    prices = {}
    skipped = 0
    for number, line in enumerate(lines, start=1):
        parts = line.split(",")
        try:
            prices[parts[0]] = float(parts[1])
        except (ValueError, IndexError):
            log.warning("line %d: bad price %r", number, line)
            skipped += 1
    log.info("parsed %d prices, skipped %d lines", len(prices), skipped)
    return prices
`,
            fails: ["logs", "too-many"],
            why: "every problem is reported as a bad price, so the reason in the log is wrong for a short line, and a line with three fields is accepted",
          },
          {
            code: src`
import logging

log = logging.getLogger("prices")

def parse_prices(lines):
    prices = {}
    skipped = 0
    for number, line in enumerate(lines, start=1):
        parts = line.split(",")
        if len(parts) != 2:
            log.error("line %d: expected 2 fields", number)
            skipped += 1
            continue
        try:
            prices[parts[0]] = float(parts[1])
        except ValueError:
            log.error("line %d: bad price %r", number, parts[1])
            skipped += 1
    log.info("parsed %d prices, skipped %d lines", len(prices), skipped)
    return prices
`,
            fails: ["logs", "too-many"],
            why: "a skipped line is logged at ERROR; the job carries on, so it is a warning",
          },
        ],
        hints: [
          "Count the skipped lines yourself; `len(prices)` gives the parsed ones.",
          "Check the number of fields first, then try the float conversion; each failure has its own warning text.",
          "Pass values as extra arguments (`%d`, `%r`) so the message is exactly `bad price 'n/a'`. Log the summary after the loop.",
        ],
        task: {
          checks: [
            expr("returns", "parse_prices() returns the good prices", "result = parse_prices(['21329,2.55', '85048,n/a', '21252', '84031A,3.75'])", { "21329": 2.55, "84031A": 3.75 }, { show: "parse_prices([\"21329,2.55\", \"85048,n/a\", \"21252\", \"84031A,3.75\"])" }),
            expr("logs", "parse_prices() logs each skip and a summary", captureLogs("_ret = parse_prices(['21329,2.55', '85048,n/a', '21252', '84031A,3.75'])"), "WARNING prices: line 2: bad price 'n/a'\nWARNING prices: line 3: expected 2 fields\nINFO prices: parsed 2 prices, skipped 2 lines\n", { show: "the log lines of the same call" }),
            expr("clean", "Every line is fine", captureLogs("_ret = parse_prices(['A,1', 'B,2.5'])", "(_buf.getvalue(), _ret)"), py.tuple(py.str("INFO prices: parsed 2 prices, skipped 0 lines\n"), pv({ A: py.float(1), B: 2.5 })), { hidden: true }),
            expr("too-many", "A line with three fields", captureLogs("_ret = parse_prices(['A,1,2', 'B,x'])", "(_buf.getvalue(), _ret)"), py.tuple(py.str("WARNING prices: line 1: expected 2 fields\nWARNING prices: line 2: bad price 'x'\nINFO prices: parsed 0 prices, skipped 2 lines\n"), pv({})), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A --log-level option",
        prompt: "Give a command-line script control over its logging. Write `setup_logging(argv)`: parse `--log-level` (one of `DEBUG`, `INFO`, `WARNING`, `ERROR`, default `WARNING`) and a flag `--quiet`, which overrides the level to `ERROR`. Then configure logging once with `basicConfig(level=…, format=\"%(levelname)s %(name)s: %(message)s\", force=True)` and return the level number that was applied (e.g. `logging.INFO`, which is 20).",
        spec: [
          ["Function", "`setup_logging(argv)`"],
          ["Returns", "the level number applied: DEBUG 10, INFO 20, WARNING 30, ERROR 40"],
          ["Effect", "the root logger's level is that level afterwards"],
          ["Refuses", "any other level name, with SystemExit (argparse)"],
          ["Tip", "`getattr(logging, \"INFO\")` is `logging.INFO`; or keep a small dictionary from name to number"],
        ],
        starter: src`
import argparse
import logging

def setup_logging(argv):
    return logging.WARNING

level = setup_logging(["--log-level", "INFO"])
print(level, logging.getLogger().level)
`,
        answer: src`
import argparse
import logging

LEVELS = {"DEBUG": logging.DEBUG, "INFO": logging.INFO, "WARNING": logging.WARNING, "ERROR": logging.ERROR}

def setup_logging(argv):
    parser = argparse.ArgumentParser(prog="import_job")
    parser.add_argument("--log-level", choices=list(LEVELS), default="WARNING")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)
    level = LEVELS[args.log_level]
    if args.quiet:
        level = logging.ERROR
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s", force=True)
    return level

level = setup_logging(["--log-level", "INFO"])
print(level, logging.getLogger().level)
`,
        alternatives: [
          src`
import argparse
import logging

def setup_logging(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-level", default="WARNING", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)
    name = "ERROR" if args.quiet else args.log_level
    level = getattr(logging, name)
    logging.basicConfig(format="%(levelname)s %(name)s: %(message)s", level=level, force=True)
    return level
`,
        ],
        wrong: [
          {
            code: src`
import argparse
import logging

def setup_logging(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-level", choices=["DEBUG", "INFO", "WARNING", "ERROR"], default="WARNING")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)
    level = getattr(logging, args.log_level)
    if args.quiet:
        level = logging.ERROR
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s")
    return level
`,
            fails: ["applied"],
            why: "without `force=True` a second call does nothing, so the level reported is not the level in effect",
          },
          {
            code: src`
import argparse
import logging

def setup_logging(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--log-level", default="WARNING")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args(argv)
    level = getattr(logging, args.log_level.upper(), logging.WARNING)
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s", force=True)
    return level
`,
            fails: ["returns", "refuses"],
            why: "`--quiet` is ignored and an unknown level silently becomes WARNING",
          },
        ],
        hints: [
          "Parse first (see CLI & Automation): `choices=` refuses unknown names for you, and a `store_true` flag gives `args.quiet`.",
          "Turn the chosen name into a number with a small dictionary or `getattr(logging, name)`, then let `--quiet` replace it.",
          "Configure with `force=True` so the setup takes effect even when logging was configured before.",
        ],
        task: {
          checks: [
            fn("returns", "setup_logging", [
              example([["--log-level", "INFO"]], 20),
              example([[]], 30),
              example([["--log-level", "DEBUG", "--quiet"]], 40),
              hiddenCase("--quiet on its own", [["--quiet"]], 40),
              hiddenCase("the most detailed level", [["--log-level", "DEBUG"]], 10),
            ], { label: "setup_logging() returns the level it applied" }),
            expr("applied", "The root logger really has that level", "import logging as _lg\n_lg.basicConfig(level=_lg.CRITICAL, force=True)\nsetup_logging(['--log-level', 'DEBUG'])\nresult = _lg.getLogger().level", 10, { hidden: true }),
            fn("refuses", "setup_logging", [
              raisesCase([["--log-level", "VERBOSE"]], "SystemExit", { label: "an unknown level name" }),
            ], { label: "setup_logging() refuses unknown levels" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s:%(message)s", force=True)
log = logging.getLogger("sync")
log.info("starting")
log.warning("3 files skipped")
log.debug("file list: a, b, c")
log.error("upload failed")
`,
        choices: ["WARNING:3 files skipped\nERROR:upload failed", "INFO:starting\nWARNING:3 files skipped\nERROR:upload failed", "WARNING:3 files skipped", "ERROR:upload failed"],
        answer: 0,
        why: "At WARNING, INFO and DEBUG are below the threshold and dropped; WARNING and ERROR are shown.",
      },
      {
        id: "q2",
        prompt: "A common mistake: configuring logging twice. What does this print?",
        program: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s:%(message)s", force=True)
logging.basicConfig(stream=sys.stdout, level=logging.DEBUG, format="%(message)s")
logging.info("loaded 3 files")
logging.warning("slow disk")
`,
        choices: ["WARNING:slow disk", "loaded 3 files\nslow disk", "INFO:loaded 3 files\nWARNING:slow disk", "slow disk"],
        answer: 0,
        why: "The second `basicConfig` does nothing because logging is already configured (it would need `force=True`). The first setup's level and format stay in effect.",
      },
      {
        id: "q3",
        prompt: "A command-line tool prints the report the user asked for, and also notes that two input rows were skipped. Which should be a log message?",
        choices: [
          "The note about skipped rows, as a WARNING",
          "The report",
          "Both, at INFO",
          "Neither: use print for everything a script says",
        ],
        answer: 0,
        why: "The report is the program's result, so it goes to standard output with print. The skipped rows are information about the run, which belongs in the log at a level that matches how serious it is.",
      },
    ],
    review: [
      "`log = logging.getLogger(__name__)` in every module; configure once in the entry point with `basicConfig`.",
      "Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL; the configured level is a threshold, per logger if needed.",
      "Pass values as arguments (`log.info(\"loaded %d\", n)`); keep `print` for the program's actual output.",
      "Next: logging an exception together with its traceback.",
    ],
  },

  // ------------------------------------------------------------------ PY-L24-04 logging exceptions
  {
    id: "PY-L24-04",
    version: 2,
    slug: "the-type-of-the-error",
    title: "Log exceptions with their traceback",
    lede: "When a program handles an error and carries on, the log must still say what failed and where. logger.exception writes the message and the full traceback; the error's type name makes a compact summary.",
    focus: "Log a caught exception with its traceback, and summarise failures by error type.",
    minutes: 18,
    objectives: [
      "Use `log.exception(...)` inside `except` to keep the traceback in the log",
      "Read an error's type name with `type(err).__name__` for summaries",
      "Decide between logging and carrying on, and logging then re-raising",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "continue-statement", "conversion", "counter-call", "dict-get", "dict-literal", "dict-lookup", "enumerate-call", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "log-call", "log-warning", "logical", "membership", "module-file", "nested-condition", "nested-dict", "nested-loop", "newline-escape", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "try-except", "type-call", "unquoted-name", "while-loop"],
    teaches: ["exc-name"],
    blocks: [
      {
        kind: "text",
        md: "`log.error(\"payment failed: %s\", err)` records the message (`'amount'`) and nothing else: no type, no line. When the job carries on after an error, the log is the only place the traceback can survive.\n\n`log.exception(\"...\")`, called inside an `except` block, logs at ERROR level and appends the traceback of the error being handled. At other levels, pass `exc_info=True` to get the same traceback. For a one-line summary or a count, `type(err).__name__` is the error's type as text, such as `\"KeyError\"`.",
      },
      {
        kind: "example",
        title: "One failed payment, with its traceback",
        code: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("payments")

def charge(payment):
    return round(payment["amount"] * 100)

for payment in [{"id": "PAY0000416", "amount": 35.84}, {"id": "PAY0000417"}]:
    try:
        cents = charge(payment)
        log.info("charged %s: %d cents", payment["id"], cents)
    except KeyError:
        log.exception("could not charge %s", payment["id"])
log.info("run finished")
`,
        output: "INFO payments: charged PAY0000416: 3584 cents\nERROR payments: could not charge PAY0000417\nTraceback (most recent call last):\n  File \"main.py\", line 12, in <module>\n    cents = charge(payment)\n  File \"main.py\", line 8, in charge\n    return round(payment[\"amount\"] * 100)\n                 ~~~~~~~^^^^^^^^^^\nKeyError: 'amount'\nINFO payments: run finished\n",
        note: "The run carried on, and the log still shows exactly what failed: a missing `amount` key, on line 8 in `charge`. With `log.error(...)` instead, only the first line would be there.",
      },
      {
        kind: "text",
        md: "A traceback per failure is right for the detail; for the end-of-run summary you want counts. Counting by `type(err).__name__` (with `Counter` from the Collections & Itertools module) turns hundreds of failures into a few lines that point at the causes.\n\nNot every error should be swallowed. If the failure means the whole run's result would be wrong, log it and **re-raise** with a bare `raise` inside the `except` block: the traceback is kept and the program stops.",
      },
      {
        kind: "example",
        title: "Failures counted by type",
        code: src`
import logging
import sys
from collections import Counter

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s", force=True)
log = logging.getLogger("import")

def to_row(record):
    return {"sku": record["sku"], "price": float(record["price"]), "stock": int(record["stock"])}

records = [
    {"sku": "21329", "price": "2.55", "stock": "40"},
    {"sku": "85048", "price": "n/a", "stock": "3"},
    {"sku": "21252", "price": "1.25"},
    {"sku": "84031A", "price": "3.75", "stock": "4.5"},
]
rows = []
failures = Counter()
for record in records:
    try:
        rows.append(to_row(record))
    except (KeyError, ValueError) as err:
        failures[type(err).__name__] += 1
        log.warning("skipped %s: %s: %s", record["sku"], type(err).__name__, err)
print(len(rows), "rows imported")
print(dict(failures))
`,
        output: "WARNING import: skipped 85048: ValueError: could not convert string to float: 'n/a'\nWARNING import: skipped 21252: KeyError: 'stock'\nWARNING import: skipped 84031A: ValueError: invalid literal for int() with base 10: '4.5'\n1 rows imported\n{'ValueError': 2, 'KeyError': 1}\n",
        note: "Each warning carries the type name, which `str(err)` alone would lose (a KeyError's message is just `'stock'`). The summary shows two kinds of bad value and one missing column.",
      },
      {
        kind: "text",
        md: "**When to use it:** `log.exception` in any `except` block that handles an error without re-raising it. Type names for summaries, dashboards and counts.\n\n**Mistakes to avoid:** `except Exception as err: log.error(err)`, which keeps only the message; calling `log.exception` outside an `except` block (there is no traceback to attach); and catching an error, logging it, and carrying on when the rest of the run depends on that step. Log and `raise` instead.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Keep the traceback",
      prompt: "`sync_all` logs failures with `log.error`, so the log says which store failed but not why. Make it log the traceback too.",
      spec: [
        ["Function", "`sync_all(stores, sync)`"],
        ["Logs", "for each failure: `could not sync <name>` **and** the traceback"],
        ["Returns", "the names that synced"],
      ],
      starter: src`
import logging
import sys

log = logging.getLogger("sync")

def sync_all(stores, sync):
    done = []
    for name in stores:
        try:
            sync(name)
            done.append(name)
        except OSError:
            log.error("could not sync %s", name)
    return done

def sync(name):
    if name == "lyon":
        raise OSError("connection reset")

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(sync_all(["paris", "lyon", "nice"], sync))
`,
      answer: src`
import logging
import sys

log = logging.getLogger("sync")

def sync_all(stores, sync):
    done = []
    for name in stores:
        try:
            sync(name)
            done.append(name)
        except OSError:
            log.exception("could not sync %s", name)
    return done

def sync(name):
    if name == "lyon":
        raise OSError("connection reset")

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", force=True)
print(sync_all(["paris", "lyon", "nice"], sync))
`,
      wrong: [
        {
          code: src`
import logging

log = logging.getLogger("sync")

def sync_all(stores, sync):
    done = []
    for name in stores:
        try:
            sync(name)
            done.append(name)
        except OSError as err:
            log.error("could not sync %s", name)
            log.error("%s", err)
    return done
`,
          fails: ["traceback"],
          why: "the error text is logged on a second line, but there is still no traceback",
        },
        {
          code: src`
import logging

log = logging.getLogger("sync")

def sync_all(stores, sync):
    done = []
    for name in stores:
        try:
            sync(name)
            done.append(name)
        except OSError:
            log.info("could not sync %s", name, exc_info=True)
    return done
`,
          fails: ["level"],
          why: "the traceback is kept, but a failed store is logged at INFO, so a job running at WARNING never shows it",
        },
      ],
      hints: [
        "There is a logger method made for `except` blocks.",
        "It logs at ERROR level and adds the traceback of the error being handled.",
        "Replace `log.error` with `log.exception`, keeping the message.",
      ],
      task: {
        checks: [
          expr("traceback", "The log has the message and a traceback", captureLogs("def _sync(name):\n    if name == 'lyon':\n        raise OSError('connection reset')\n_ret = sync_all(['paris', 'lyon'], _sync)", "'could not sync lyon' in _buf.getvalue() and 'Traceback (most recent call last)' in _buf.getvalue() and 'OSError: connection reset' in _buf.getvalue()"), true, { show: "the log of sync_all([\"paris\", \"lyon\"], sync)" }),
          expr("returns", "sync_all() returns the stores that synced", "def _sync(name):\n    if name == 'b':\n        raise OSError('down')\nresult = sync_all(['a', 'b', 'c'], _sync)", ["a", "c"], { show: "sync_all([\"a\", \"b\", \"c\"], <b fails>)" }),
          expr("level", "The failure is logged at ERROR", captureLogs("def _sync(name):\n    raise OSError('down')\n_ret = sync_all(['x'], _sync)", "_buf.getvalue().startswith('ERROR sync: could not sync x\\n')"), true, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Charge what can be charged",
        prompt: "Write `charge_all(payments, charge)`. Call `charge(payment)` for each payment. Collect the `id`s that were charged. When `charge` raises `ValueError` or `KeyError`, log it with its traceback as `payment <id> failed` (logger name `payments`), count the failure under its error type's name, and carry on. Any other exception means something is badly wrong: log it the same way and let it propagate. Return `{\"charged\": [...], \"failed\": {type name: count}}`.",
        spec: [
          ["Function", "`charge_all(payments, charge)`"],
          ["Logger", "`logging.getLogger(\"payments\")`; failures logged at ERROR with the traceback"],
          ["Returns", "`{\"charged\": [ids in order], \"failed\": {\"KeyError\": 1, …}}`"],
          ["Re-raises", "any exception other than ValueError and KeyError, after logging it"],
        ],
        starter: src`
import logging

log = logging.getLogger("payments")

def charge_all(payments, charge):
    return {"charged": [], "failed": {}}

def charge(payment):
    if payment["amount"] <= 0:
        raise ValueError("amount must be positive")
    return payment["amount"]

payments = [{"id": "PAY1", "amount": 35.84}, {"id": "PAY2", "amount": 0}, {"id": "PAY3"}, {"id": "PAY4", "amount": 12}]
print(charge_all(payments, charge))
`,
        answer: src`
import logging

log = logging.getLogger("payments")

def charge_all(payments, charge):
    charged = []
    failed = {}
    for payment in payments:
        try:
            charge(payment)
        except (ValueError, KeyError) as err:
            log.exception("payment %s failed", payment["id"])
            name = type(err).__name__
            failed[name] = failed.get(name, 0) + 1
            continue
        except Exception:
            log.exception("payment %s failed", payment["id"])
            raise
        charged.append(payment["id"])
    return {"charged": charged, "failed": failed}

def charge(payment):
    if payment["amount"] <= 0:
        raise ValueError("amount must be positive")
    return payment["amount"]

payments = [{"id": "PAY1", "amount": 35.84}, {"id": "PAY2", "amount": 0}, {"id": "PAY3"}, {"id": "PAY4", "amount": 12}]
print(charge_all(payments, charge))
`,
        alternatives: [
          src`
import logging
from collections import Counter

log = logging.getLogger("payments")

def charge_all(payments, charge):
    charged = []
    failed = Counter()
    for payment in payments:
        try:
            charge(payment)
            charged.append(payment["id"])
        except Exception as err:
            log.error("payment %s failed", payment["id"], exc_info=True)
            if not isinstance(err, (ValueError, KeyError)):
                raise
            failed[type(err).__name__] += 1
    return {"charged": charged, "failed": dict(failed)}
`,
        ],
        wrong: [
          {
            code: src`
import logging

log = logging.getLogger("payments")

def charge_all(payments, charge):
    charged = []
    failed = {}
    for payment in payments:
        try:
            charge(payment)
            charged.append(payment["id"])
        except Exception as err:
            log.exception("payment %s failed", payment["id"])
            name = type(err).__name__
            failed[name] = failed.get(name, 0) + 1
    return {"charged": charged, "failed": failed}
`,
            fails: ["reraises"],
            why: "every error is swallowed, including ones that mean the charging code itself is broken",
          },
          {
            code: src`
import logging

log = logging.getLogger("payments")

def charge_all(payments, charge):
    charged = []
    failed = {}
    for payment in payments:
        try:
            charge(payment)
            charged.append(payment["id"])
        except (ValueError, KeyError) as err:
            log.error("payment %s failed: %s", payment["id"], err)
            failed[str(err)] = failed.get(str(err), 0) + 1
    return {"charged": charged, "failed": failed}
`,
            fails: ["returns", "logs", "reraises"],
            why: "failures are counted by message instead of type, and the traceback is not logged",
          },
        ],
        hints: [
          "Two `except` clauses: one for the expected errors (log, count, continue) and one for everything else (log, then a bare `raise`).",
          "`type(err).__name__` gives `\"KeyError\"`; count with a dictionary (or Counter) under that name.",
          "Append to `charged` only when `charge` didn't raise, and use `log.exception` so the traceback is kept.",
        ],
        task: {
          checks: [
            expr("returns", "charge_all() charges, counts and carries on", "def _charge(p):\n    if p['amount'] <= 0:\n        raise ValueError('amount must be positive')\n    return p['amount']\nresult = charge_all([{'id': 'PAY1', 'amount': 35.84}, {'id': 'PAY2', 'amount': 0}, {'id': 'PAY3'}, {'id': 'PAY4', 'amount': 12}], _charge)", { charged: ["PAY1", "PAY4"], failed: { ValueError: 1, KeyError: 1 } }, { show: "charge_all(payments, charge)" }),
            expr("logs", "Each failure is logged with its traceback", captureLogs("def _charge(p):\n    return p['amount']\n_ret = charge_all([{'id': 'PAY9'}], _charge)", "_buf.getvalue().startswith('ERROR payments: payment PAY9 failed\\nTraceback (most recent call last)') and \"KeyError: 'amount'\" in _buf.getvalue()"), true, { show: "the log of charge_all([{\"id\": \"PAY9\"}], charge)" }),
            expr("all-good", "Every payment succeeds", "def _ok(p):\n    return 1\nresult = charge_all([{'id': 'A'}, {'id': 'B'}], _ok)", { charged: ["A", "B"], failed: {} }, { hidden: true }),
            expr("reraises", "An unexpected error is logged and re-raised", captureLogs("def _charge(p):\n    raise ZeroDivisionError('rate table empty')\ntry:\n    charge_all([{'id': 'PAY5'}], _charge)\n    _ret = 'no error'\nexcept ZeroDivisionError:\n    _ret = 'raised'", "(_ret, 'payment PAY5 failed' in _buf.getvalue())"), py.tuple(py.str("raised"), py.bool(true)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Error counts from a log file",
        prompt: "An on-call engineer wants to know which errors dominate last night's log. Write `error_counts(log_text)`: the log mixes ordinary lines (`LEVEL name: message`) with tracebacks that `log.exception` wrote. Each traceback ends with a line `<ErrorType>: <message>` (or just `<ErrorType>`). Return a dictionary from error type to how many tracebacks ended with it.",
        spec: [
          ["Function", "`error_counts(log_text)`"],
          ["Returns", "`{\"KeyError\": 2, \"ValueError\": 1}`; `{}` when there are no tracebacks"],
          ["Rules", "a traceback starts at a line `Traceback (most recent call last):`; its error line is the first line after it that doesn't start with a space; the type is the text before the first `:` on that line"],
        ],
        starter: src`
def error_counts(log_text):
    return {}

log_text = """INFO payments: charged PAY1
ERROR payments: payment PAY3 failed
Traceback (most recent call last):
  File "jobs.py", line 12, in charge_all
    charge(payment)
KeyError: 'amount'
WARNING payments: retrying PAY4
ERROR payments: payment PAY4 failed
Traceback (most recent call last):
  File "jobs.py", line 12, in charge_all
    charge(payment)
ValueError: amount must be positive
"""
print(error_counts(log_text))
`,
        answer: src`
def error_counts(log_text):
    counts = {}
    in_traceback = False
    for line in log_text.splitlines():
        if line.startswith("Traceback (most recent call last):"):
            in_traceback = True
            continue
        if in_traceback and line and not line.startswith(" "):
            error_type = line.split(":")[0]
            counts[error_type] = counts.get(error_type, 0) + 1
            in_traceback = False
    return counts

log_text = """INFO payments: charged PAY1
ERROR payments: payment PAY3 failed
Traceback (most recent call last):
  File "jobs.py", line 12, in charge_all
    charge(payment)
KeyError: 'amount'
WARNING payments: retrying PAY4
ERROR payments: payment PAY4 failed
Traceback (most recent call last):
  File "jobs.py", line 12, in charge_all
    charge(payment)
ValueError: amount must be positive
"""
print(error_counts(log_text))
`,
        alternatives: [
          src`
from collections import Counter

def error_counts(log_text):
    lines = log_text.split("\n")
    found = Counter()
    for i, line in enumerate(lines):
        if line.startswith("Traceback"):
            j = i + 1
            while j < len(lines) and (lines[j].startswith(" ") or not lines[j]):
                j += 1
            if j < len(lines):
                found[lines[j].partition(":")[0]] += 1
    return dict(found)
`,
        ],
        wrong: [
          {
            code: src`
def error_counts(log_text):
    counts = {}
    for line in log_text.splitlines():
        if line.startswith("ERROR"):
            name = line.split()[1].rstrip(":")
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
            fails: ["returns"],
            why: "it counts ERROR log lines by logger name, not tracebacks by error type",
          },
          {
            code: src`
def error_counts(log_text):
    counts = {}
    for line in log_text.splitlines():
        if "Error" in line and not line.startswith(" ") and ":" in line and not line.startswith("ERROR"):
            name = line.split(":")[0]
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
            fails: ["returns"],
            why: "it relies on the word `Error` in the name, so `KeyboardInterrupt` and exceptions named differently are missed",
          },
        ],
        hints: [
          "Walk the lines and remember whether you are inside a traceback.",
          "Inside one, the frame lines start with spaces; the first line that doesn't is the error line.",
          "Take the text before the first `:` as the type, count it, and leave the traceback state so ordinary lines aren't counted.",
        ],
        task: {
          checks: [
            fn("returns", "error_counts", [
              example(["INFO payments: charged PAY1\nERROR payments: payment PAY3 failed\nTraceback (most recent call last):\n  File \"jobs.py\", line 12, in charge_all\n    charge(payment)\nKeyError: 'amount'\nWARNING payments: retrying PAY4\nERROR payments: payment PAY4 failed\nTraceback (most recent call last):\n  File \"jobs.py\", line 12, in charge_all\n    charge(payment)\nValueError: amount must be positive\n"], { KeyError: 1, ValueError: 1 }),
              example(["INFO sync: done\n"], {}),
              example(["ERROR a: x\nTraceback (most recent call last):\n  File \"a.py\", line 1, in <module>\nKeyError: 'id'\nERROR a: y\nTraceback (most recent call last):\n  File \"a.py\", line 1, in <module>\nKeyError: 'sku'\n"], { KeyError: 2 }),
              hiddenCase("an error line with no message", ["ERROR job: stopped\nTraceback (most recent call last):\n  File \"job.py\", line 9, in run\n    wait()\nKeyboardInterrupt\n"], { KeyboardInterrupt: 1 }),
              hiddenCase("a dotted error type", ["Traceback (most recent call last):\n  File \"db.py\", line 3, in save\n    conn.commit()\nsqlite3.OperationalError: database is locked\n"], { "sqlite3.OperationalError": 1 }),
              hiddenCase("an ERROR line with a colon after a traceback", ["Traceback (most recent call last):\n  File \"a.py\", line 2, in f\nValueError: bad\nERROR a: retry: giving up\n"], { ValueError: 1 }),
              hiddenCase("an empty log", [""], {}),
            ], { label: "error_counts() counts tracebacks by their error type" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def missing_key():
    return {}["sku"]

def bad_number():
    return int("4.5")

def no_rate():
    return 1 / 0

names = []
for step in [missing_key, bad_number, no_rate]:
    try:
        step()
    except Exception as err:
        names.append(type(err).__name__)
print(names)
`,
        choices: ["['KeyError', 'ValueError', 'ZeroDivisionError']", "['KeyError', 'TypeError', 'ZeroDivisionError']", "['Exception', 'Exception', 'Exception']", "['missing_key', 'bad_number', 'no_rate']"],
        answer: 0,
        why: "`type(err).__name__` is the class name of the error actually raised. `int(\"4.5\")` is a ValueError: the text isn't a whole number.",
      },
      {
        id: "q2",
        prompt: "A common mistake: logging only `err`. What does the warning line say?",
        program: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
record = {"sku": "21329", "price": "2.55"}
try:
    stock = int(record["stock"])
except KeyError as err:
    logging.warning(err)
`,
        choices: ["WARNING: 'stock'", "WARNING: KeyError: 'stock'", "WARNING: Traceback (most recent call last):", "KeyError: 'stock'"],
        answer: 0,
        why: "A KeyError's message is just the key, so the log loses the type and the location. `log.exception` (or the type name in the message) keeps them.",
      },
      {
        id: "q3",
        prompt: "An import job fails to open its database connection at the very start. What should the `except` block do?",
        choices: [
          "Log the exception and re-raise it, so the run stops with a non-zero status",
          "Log a warning and continue with the next record",
          "Pass silently and retry tomorrow",
          "Print \"error\" and return an empty result",
        ],
        answer: 0,
        why: "Nothing after this step can succeed, so carrying on would only produce an empty or wrong result that looks successful. Log it for the record, then `raise`.",
      },
    ],
    review: [
      "`log.exception(\"...\")` inside `except` logs at ERROR with the traceback; `exc_info=True` does the same at other levels.",
      "`type(err).__name__` names the error for summaries and counts.",
      "Handle and continue only when the rest of the run is still meaningful; otherwise log and `raise`.",
      "Next: choosing between a warning, a skip and a stop for each kind of bad input.",
    ],
  },

  // ------------------------------------------------------------------ PY-L24-05 warn, skip or stop
  {
    id: "PY-L24-05",
    version: 2,
    slug: "a-warning-or-a-value",
    title: "Warn, skip or stop",
    lede: "Real data has bad records. For each problem a program decides: fix it and note it, skip the record with a warning, or stop. A clear policy, logged, is what makes a long run trustworthy.",
    focus: "Choose per problem whether to correct with a warning, skip with a warning, or stop, and enforce a limit on bad records.",
    minutes: 18,
    objectives: [
      "Use `logging.warning` for problems the program can survive, and say what it did about them",
      "Raise instead when the input as a whole can't be trusted",
      "Stop a run when too many records are bad (an error budget)",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "log-call", "log-warning", "logical", "membership", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-check", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unquoted-name", "value-count"],
    teaches: ["error-policy"],
    blocks: [
      {
        kind: "text",
        md: "A product feed has 40,000 rows. One has `\"12,5\"` as a weight, one has no weight, one says the product weighs -3 kg. Stopping at the first problem means nothing gets imported; ignoring them silently means wrong numbers nobody can explain. A good program has a **policy** per problem:\n\n- **Correct and warn**: the fix is certain (`\"12,5\"` is clearly 12.5). Apply it and log a warning that says so.\n- **Skip and warn**: the record is unusable but the rest are fine. Leave it out, warn with the record's identity, and count it.\n- **Stop**: the input as a whole is wrong (a missing column, an empty file, a configuration error). Raise, because every result would be wrong.\n\nA WARNING says *something unexpected happened and here is what the program did about it*; it should never be a mystery.",
      },
      {
        kind: "example",
        title: "One policy per problem",
        code: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)

def clean_weights(rows):
    if rows and "weight_kg" not in rows[0]:
        raise ValueError("feed has no weight_kg column")
    cleaned = {}
    for row in rows:
        text = row["weight_kg"].strip()
        if text == "":
            logging.warning("%s: no weight, skipped", row["code"])
            continue
        if "," in text:
            logging.warning("%s: read %r as %s", row["code"], text, text.replace(",", "."))
            text = text.replace(",", ".")
        weight = float(text)
        if weight <= 0:
            logging.warning("%s: weight %s is not positive, skipped", row["code"], weight)
            continue
        cleaned[row["code"]] = weight
    logging.info("%d of %d products kept", len(cleaned), len(rows))
    return cleaned

feed = [
    {"code": "3017620422003", "weight_kg": "0.4"},
    {"code": "5449000000996", "weight_kg": " 12,5 "},
    {"code": "7622210449283", "weight_kg": ""},
    {"code": "8000500310427", "weight_kg": "-3"},
]
print(clean_weights(feed))
`,
        output: "WARNING: 5449000000996: read '12,5' as 12.5\nWARNING: 7622210449283: no weight, skipped\nWARNING: 8000500310427: weight -3.0 is not positive, skipped\nINFO: 2 of 4 products kept\n{'3017620422003': 0.4, '5449000000996': 12.5}\n",
        note: "Every warning names the product and the action taken. A feed without the column at all raises immediately: there is nothing sensible to import from it.",
      },
      {
        kind: "text",
        md: "Skipping has a limit. If half the rows are bad, the file is probably broken (a wrong delimiter, a shifted column) and importing the good-looking half is worse than stopping. An **error budget** makes that explicit: process everything, count the bad records, and raise if they exceed an agreed share.",
      },
      {
        kind: "example",
        title: "An error budget",
        code: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)

def import_quantities(rows, max_bad_share):
    good = []
    bad = 0
    for number, text in enumerate(rows, start=1):
        try:
            good.append(int(text))
        except ValueError:
            bad += 1
            logging.warning("row %d: %r is not a whole number, skipped", number, text)
    if rows and bad / len(rows) > max_bad_share:
        raise ValueError(f"{bad} of {len(rows)} rows are bad (limit {max_bad_share:.0%}); check the file")
    return good

print(import_quantities(["12", "4", "x", "30"], 0.25))
try:
    import_quantities(["12", "4;6", "7;1", "x"], 0.25)
except ValueError as err:
    logging.error("import stopped: %s", err)
`,
        output: "WARNING: row 3: 'x' is not a whole number, skipped\n[12, 4, 30]\nWARNING: row 2: '4;6' is not a whole number, skipped\nWARNING: row 3: '7;1' is not a whole number, skipped\nWARNING: row 4: 'x' is not a whole number, skipped\nERROR: import stopped: 3 of 4 rows are bad (limit 25%); check the file\n",
        note: "One bad row in four is exactly at the 25% limit, so the first import succeeds. In the second, the semicolons suggest the file uses a different separator: three bad rows out of four stop the run instead of importing one number. (`:.0%` formats 0.25 as `25%`.)",
      },
      {
        kind: "text",
        md: "**When to use it:** any program that reads data it didn't create. Write the policy down (even as a comment) and make every warning say what was done.\n\n**Mistakes to avoid:** a warning without the record's identity (`bad value`: which one?); skipping silently, so totals drift with no explanation; correcting values you are guessing about; and warning about a problem that should stop the run, such as a missing column.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Skip a bad row instead of stopping",
      prompt: "`total_sugar` stops at the first sugar value that isn't a number. Change it to skip that row with a warning `<code>: bad sugar value '<text>', skipped` and carry on.",
      spec: [
        ["Function", "`total_sugar(products)`"],
        ["Returns", "the total of the `sugars_100g` values that are numbers"],
        ["Logs", "one WARNING per skipped product, e.g. `5449000000996: bad sugar value 'trace', skipped`"],
      ],
      starter: src`
import logging
import sys

def total_sugar(products):
    total = 0
    for product in products:
        total += float(product["sugars_100g"])
    return total

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
products = [{"code": "3017620422003", "sugars_100g": "56.3"}, {"code": "5449000000996", "sugars_100g": "trace"}, {"code": "7622210449283", "sugars_100g": "10.6"}]
print(total_sugar(products))
`,
      answer: src`
import logging
import sys

def total_sugar(products):
    total = 0
    for product in products:
        try:
            total += float(product["sugars_100g"])
        except ValueError:
            logging.warning("%s: bad sugar value %r, skipped", product["code"], product["sugars_100g"])
    return total

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
products = [{"code": "3017620422003", "sugars_100g": "56.3"}, {"code": "5449000000996", "sugars_100g": "trace"}, {"code": "7622210449283", "sugars_100g": "10.6"}]
print(total_sugar(products))
`,
      wrong: [
        {
          code: src`
def total_sugar(products):
    total = 0
    for product in products:
        try:
            total += float(product["sugars_100g"])
        except ValueError:
            pass
    return total
`,
          fails: ["logs"],
          why: "the row is skipped silently, so nobody can tell why the total is low",
        },
      ],
      hints: [
        "Only the conversion can fail, so only it goes inside `try`.",
        "Catch the specific error `float` raises for text like `trace`.",
        "In the `except` block, log a warning with the product's code and the bad text, then let the loop carry on.",
      ],
      task: {
        checks: [
          expr("returns", "total_sugar() skips the bad row", "result = total_sugar([{'code': '3017620422003', 'sugars_100g': '56.3'}, {'code': '5449000000996', 'sugars_100g': 'trace'}, {'code': '7622210449283', 'sugars_100g': '10.6'}])", 66.9, { show: "total_sugar(products)" }),
          expr("logs", "The skipped row is logged as a warning", captureLogs("_ret = total_sugar([{'code': 'A1', 'sugars_100g': '5'}, {'code': 'B2', 'sugars_100g': 'n/a'}])", "[(_l.split(' ')[0], _l.split(': ', 1)[1]) for _l in _buf.getvalue().splitlines()]"), [py.tuple(py.str("WARNING"), py.str("B2: bad sugar value 'n/a', skipped"))], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Temperatures with a policy",
        prompt: "A weather station sends lines `station,value`. Write `parse_readings(lines)` returning a list of `(station, celsius)` tuples with this policy. A value ending in `F` is Fahrenheit: convert it with `(f - 32) * 5 / 9` and log WARNING `<station>: converted <text> to Celsius`. A value that isn't a number is skipped with WARNING `<station>: unreadable value <text>`. A value outside -90 to 60 °C (after conversion) is skipped with WARNING `<station>: <value> out of range`. A line without exactly one comma means the feed format changed: raise `ValueError`.",
        spec: [
          ["Function", "`parse_readings(lines)`"],
          ["Returns", "`[(\"USW00094728\", 21.5), …]` in input order, celsius as floats"],
          ["Logs", "the three WARNING texts above, via `logging.warning`"],
          ["Raises", "`ValueError` for a line that doesn't have exactly one comma"],
        ],
        starter: src`
import logging
import sys

def parse_readings(lines):
    readings = []
    return readings

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
print(parse_readings(["USW00094728,21.5", "USW00023174,77F", "USC00045721,--", "USW00014739,75.2"]))
`,
        answer: src`
import logging
import sys

def parse_readings(lines):
    readings = []
    for line in lines:
        parts = line.split(",")
        if len(parts) != 2:
            raise ValueError(f"expected station,value but got {line!r}")
        station, text = parts[0], parts[1].strip()
        try:
            if text.upper().endswith("F"):
                celsius = (float(text[:-1]) - 32) * 5 / 9
                logging.warning("%s: converted %s to Celsius", station, text)
            else:
                celsius = float(text)
        except ValueError:
            logging.warning("%s: unreadable value %s", station, text)
            continue
        if celsius < -90 or celsius > 60:
            logging.warning("%s: %s out of range", station, celsius)
            continue
        readings.append((station, celsius))
    return readings

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
print(parse_readings(["USW00094728,21.5", "USW00023174,77F", "USC00045721,--", "USW00014739,75.2"]))
`,
        alternatives: [
          src`
import logging

def to_celsius(station, text):
    if text.endswith("F") or text.endswith("f"):
        value = (float(text[:-1]) - 32) * 5 / 9
        logging.warning(f"{station}: converted {text} to Celsius")
        return value
    return float(text)

def parse_readings(lines):
    out = []
    for line in lines:
        if line.count(",") != 1:
            raise ValueError("bad line " + line)
        station, text = line.split(",")
        text = text.strip()
        try:
            value = to_celsius(station, text)
        except ValueError:
            logging.warning(f"{station}: unreadable value {text}")
            continue
        if not -90 <= value <= 60:
            logging.warning(f"{station}: {value} out of range")
            continue
        out.append((station, value))
    return out
`,
        ],
        wrong: [
          {
            code: src`
import logging

def parse_readings(lines):
    readings = []
    for line in lines:
        station, text = line.split(",")
        try:
            celsius = float(text)
        except ValueError:
            logging.warning("%s: unreadable value %s", station, text)
            continue
        if celsius < -90 or celsius > 60:
            logging.warning("%s: %s out of range", station, celsius)
            continue
        readings.append((station, celsius))
    return readings
`,
            fails: ["returns", "logs", "fahrenheit"],
            why: "Fahrenheit values are treated as unreadable and dropped instead of converted",
          },
          {
            code: src`
import logging

def parse_readings(lines):
    readings = []
    for line in lines:
        parts = line.split(",")
        if len(parts) != 2:
            logging.warning("bad line %s", line)
            continue
        station, text = parts
        try:
            if text.endswith("F"):
                celsius = (float(text[:-1]) - 32) * 5 / 9
                logging.warning("%s: converted %s to Celsius", station, text)
            else:
                celsius = float(text)
        except ValueError:
            logging.warning("%s: unreadable value %s", station, text)
            continue
        if celsius < -90 or celsius > 60:
            logging.warning("%s: %s out of range", station, celsius)
            continue
        readings.append((station, celsius))
    return readings
`,
            fails: ["format-change"],
            why: "a line in a different format is skipped with a warning, when the whole feed can't be trusted",
          },
        ],
        hints: [
          "Check the line's shape first: a wrong number of commas is the one problem that raises.",
          "Inside `try`, handle the two readable forms (ending in F, or a plain number); the `except ValueError` branch is the unreadable case.",
          "Check the range after converting, and `continue` after each skip warning so the reading isn't appended.",
        ],
        task: {
          checks: [
            expr("returns", "parse_readings() keeps, converts and skips", "result = parse_readings(['USW00094728,21.5', 'USW00023174,77F', 'USC00045721,--', 'USW00014739,75.2'])", [py.tuple(py.str("USW00094728"), py.float(21.5)), py.tuple(py.str("USW00023174"), py.float(25))], { show: "parse_readings(lines)" }),
            expr("logs", "Each decision is logged", captureLogs("_ret = parse_readings(['USW00094728,21.5', 'USW00023174,77F', 'USC00045721,--', 'USW00014739,75.2'])"), "WARNING root: USW00023174: converted 77F to Celsius\nWARNING root: USC00045721: unreadable value --\nWARNING root: USW00014739: 75.2 out of range\n", { show: "the log of the same call" }),
            expr("fahrenheit", "A cold Fahrenheit value", "result = parse_readings(['A,14F', 'B,-40F'])", [py.tuple(py.str("A"), py.float(-10)), py.tuple(py.str("B"), py.float(-40))], { hidden: true }),
            { kind: "expr" as const, id: "format-change", label: "A line in a different format stops the run", hidden: true, expr: "parse_readings(['A,1', 'B;2;3'])", raises: "ValueError" },
            expr("bounds", "Values exactly at the limits are kept", "result = parse_readings(['A,-90', 'B,60', 'C,60.1'])", [py.tuple(py.str("A"), py.float(-90)), py.tuple(py.str("B"), py.float(60))], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Import orders within an error budget",
        prompt: "Write `import_orders(rows, max_bad)` for order rows (dictionaries with `order_id`, `quantity`, `unit_price`, all text). A row is good when quantity is a whole number above 0 and unit_price a number of at least 0; good rows become `{\"order_id\": …, \"total\": quantity × unit_price}`. Skip each bad row with a WARNING naming its `order_id`. After the loop, if the number of bad rows is greater than `max_bad`, raise `ValueError`; otherwise log INFO `imported <g> orders, skipped <b>` and return the good rows.",
        spec: [
          ["Function", "`import_orders(rows, max_bad)`"],
          ["max_bad", "how many bad rows are tolerated (a whole number)"],
          ["Returns", "a list of `{\"order_id\": …, \"total\": …}` in input order"],
          ["Logs", "one WARNING per bad row containing its order_id; INFO `imported 2 orders, skipped 1` on success"],
          ["Raises", "`ValueError` when bad rows > `max_bad` (exactly `max_bad` is fine)"],
        ],
        starter: src`
import logging
import sys

def import_orders(rows, max_bad):
    return []

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
rows = [
    {"order_id": "O100282", "quantity": "2", "unit_price": "17.92"},
    {"order_id": "O100376", "quantity": "0", "unit_price": "91.47"},
    {"order_id": "O100918", "quantity": "1", "unit_price": "55.72"},
]
print(import_orders(rows, 1))
`,
        answer: src`
import logging
import sys

def parse_order(row):
    quantity = int(row["quantity"])
    price = float(row["unit_price"])
    if quantity <= 0 or price < 0:
        raise ValueError("quantity must be above 0 and price at least 0")
    return {"order_id": row["order_id"], "total": quantity * price}

def import_orders(rows, max_bad):
    good = []
    bad = 0
    for row in rows:
        try:
            good.append(parse_order(row))
        except ValueError as err:
            bad += 1
            logging.warning("order %s skipped: %s", row["order_id"], err)
    if bad > max_bad:
        raise ValueError(f"{bad} bad rows, more than the {max_bad} allowed")
    logging.info("imported %d orders, skipped %d", len(good), bad)
    return good

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s", force=True)
rows = [
    {"order_id": "O100282", "quantity": "2", "unit_price": "17.92"},
    {"order_id": "O100376", "quantity": "0", "unit_price": "91.47"},
    {"order_id": "O100918", "quantity": "1", "unit_price": "55.72"},
]
print(import_orders(rows, 1))
`,
        alternatives: [
          src`
import logging

def import_orders(rows, max_bad):
    kept, skipped = [], []
    for row in rows:
        q, p = row["quantity"].strip(), row["unit_price"].strip()
        ok = q.isdigit() and int(q) > 0
        if ok:
            try:
                ok = float(p) >= 0
            except ValueError:
                ok = False
        if not ok:
            skipped.append(row["order_id"])
            logging.warning("bad order " + row["order_id"])
            continue
        kept.append({"order_id": row["order_id"], "total": int(q) * float(p)})
    if len(skipped) > max_bad:
        raise ValueError(f"too many bad rows: {skipped}")
    logging.info(f"imported {len(kept)} orders, skipped {len(skipped)}")
    return kept
`,
        ],
        wrong: [
          {
            code: src`
import logging

def import_orders(rows, max_bad):
    good = []
    bad = 0
    for row in rows:
        try:
            quantity = int(row["quantity"])
            price = float(row["unit_price"])
        except ValueError:
            bad += 1
            logging.warning("order %s skipped", row["order_id"])
            continue
        if bad > max_bad:
            raise ValueError("too many bad rows")
        good.append({"order_id": row["order_id"], "total": quantity * price})
    logging.info("imported %d orders, skipped %d", len(good), bad)
    return good
`,
            fails: ["at-budget", "budget", "logs", "returns"],
            why: "a quantity of 0 or a negative price is imported instead of counted as bad, and the budget is checked inside the loop, so a bad final row never stops the import",
          },
          {
            code: src`
import logging

def import_orders(rows, max_bad):
    good = []
    bad = 0
    for row in rows:
        try:
            quantity = int(row["quantity"])
            price = float(row["unit_price"])
            if quantity <= 0 or price < 0:
                raise ValueError("bad")
        except ValueError:
            bad += 1
            logging.warning("order %s skipped", row["order_id"])
            continue
        good.append({"order_id": row["order_id"], "total": quantity * price})
    if bad >= max_bad:
        raise ValueError("too many bad rows")
    logging.info("imported %d orders, skipped %d", len(good), bad)
    return good
`,
            fails: ["at-budget", "empty", "returns"],
            why: "`>=` stops an import that has exactly the tolerated number of bad rows, even an empty file with a budget of 0",
          },
        ],
        hints: [
          "A small helper that turns one row into a result or raises ValueError keeps the loop simple.",
          "Count bad rows in the loop and warn with the order_id each time; don't decide about the budget until every row is processed.",
          "After the loop: more than `max_bad` raises; otherwise log the INFO summary and return.",
        ],
        task: {
          checks: [
            expr("returns", "import_orders() skips the zero-quantity order", "result = import_orders([{'order_id': 'O100282', 'quantity': '2', 'unit_price': '17.92'}, {'order_id': 'O100376', 'quantity': '0', 'unit_price': '91.47'}, {'order_id': 'O100918', 'quantity': '1', 'unit_price': '55.72'}], 1)", [{ order_id: "O100282", total: 35.84 }, { order_id: "O100918", total: 55.72 }], { show: "import_orders(rows, 1)" }),
            expr("logs", "Warnings name the order, and a summary follows", captureLogs("_ret = import_orders([{'order_id': 'O1', 'quantity': 'two', 'unit_price': '1'}, {'order_id': 'O2', 'quantity': '1', 'unit_price': '-4'}, {'order_id': 'O3', 'quantity': '3', 'unit_price': '2'}], 5)", "[(_l.split(' ')[0], ('O1' in _l) or ('O2' in _l) or _l.endswith('imported 1 orders, skipped 2')) for _l in _buf.getvalue().splitlines()]"), [py.tuple(py.str("WARNING"), py.bool(true)), py.tuple(py.str("WARNING"), py.bool(true)), py.tuple(py.str("INFO"), py.bool(true))], { show: "the log of an import with two bad rows" }),
            { kind: "expr" as const, id: "budget", label: "Too many bad rows stop the import", hidden: true, expr: "import_orders([{'order_id': 'A', 'quantity': '1', 'unit_price': '1'}, {'order_id': 'B', 'quantity': 'x', 'unit_price': '1'}, {'order_id': 'C', 'quantity': '0', 'unit_price': '1'}], 1)", raises: "ValueError" },
            expr("at-budget", "Exactly the tolerated number of bad rows", "result = len(import_orders([{'order_id': 'A', 'quantity': '1', 'unit_price': '2.5'}, {'order_id': 'B', 'quantity': '-1', 'unit_price': '1'}], 1))", 1, { hidden: true }),
            expr("empty", "No rows", "result = import_orders([], 0)", [], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s: %(message)s", force=True)
kept = []
for text in ["4", "", "x", "7"]:
    if text == "":
        logging.info("blank value skipped")
        continue
    if not text.isdigit():
        logging.warning("%r skipped", text)
        continue
    kept.append(int(text))
print(kept)
`,
        choices: ["WARNING: 'x' skipped\n[4, 7]", "INFO: blank value skipped\nWARNING: 'x' skipped\n[4, 7]", "[4, 7]", "WARNING: 'x' skipped\n[4, 0, 7]"],
        answer: 0,
        why: "Both odd values are skipped, but the blank one is logged at INFO, which is below the WARNING threshold, so only the `x` warning appears.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a warning with no identity. A log says `WARNING: bad price, skipped` 214 times. What is wrong with it?",
        choices: [
          "Nobody can find the 214 records: the warning should name each record (its ID) and the value",
          "It should have been logged with print",
          "Warnings should never be logged more than once",
          "Nothing; the count is all that matters",
        ],
        answer: 0,
        why: "A warning is for someone who has to act on it. Without the record's identity and the bad value, they have to re-run the import with extra prints to find out.",
      },
      {
        id: "q3",
        prompt: "Which problem should stop an import of a 40,000-row product feed instead of being skipped with a warning?",
        choices: [
          "The file has no `weight_kg` column at all",
          "One product's weight is blank",
          "Three weights are written with a comma decimal",
          "One product's name has extra spaces",
        ],
        answer: 0,
        why: "A missing column means every row is affected: the file is not what the program expects. The others are per-record problems that can be corrected or skipped with a warning.",
      },
    ],
    review: [
      "Per problem, decide: correct and warn, skip and warn, or stop.",
      "`logging.warning` messages name the record and the action taken.",
      "Raise when the whole input is wrong, or when bad records exceed an agreed budget.",
      "Next module: writing tests, so bugs like these are caught before the program runs on real data.",
    ],
  },
];
