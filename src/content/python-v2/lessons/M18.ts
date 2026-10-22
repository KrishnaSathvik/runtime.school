/**
 * M18 Exceptions & Validation: five lessons (PY-L18-01 … PY-L18-05).
 *
 * Data from outside a program is wrong some of the time: quantities typed as words, prices with commas, missing
 * columns. This module handles that on purpose. It catches one specific error first (`except ValueError`), reads the
 * error and handles several kinds differently (`as err`, several `except` clauses), separates the success path and
 * the clean-up (`else`, `finally`), raises errors with messages that say what was wrong (`raise`), and names its own
 * kinds of error with a minimal `class Name(Exception): pass` (classes in full are M26).
 *
 * Fixtures are small slices of D02 (Online Retail II invoice lines, typed as text the way a CSV delivers them) and
 * R01 (Runtime Market reviews, payments and stock). Challenges are graded by calling the learner's function with
 * public and hidden inputs, by checking which exception type a call raises and, where the message is the point, the
 * message text. Bare `except:` never appears as a pattern to copy.
 * Version 2: rewritten from a print-"Error" module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expr check that calls `call` and returns the message of the `kind` error it raises (None if it doesn't raise). */
const message = (id: string, label: string, call: string, kind: string, expected: string | null, hidden = false) => ({
  kind: "expr" as const,
  id,
  label,
  ...(hidden ? { hidden: true } : {}),
  expr: `try:\n    ${call}\n    result = None\nexcept ${kind} as _e:\n    result = str(_e)`,
  expected: expected === null ? py.none : py.str(expected),
});

export const m18Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L18-01 try / except ValueError
  {
    id: "PY-L18-01",
    version: 2,
    slug: "catch-the-error",
    title: "Catch one specific error",
    lede: "`int(\"twelve\")` stops a program with ValueError. `try` and `except ValueError` let you decide what a bad value means, without hiding any other mistake.",
    focus: "Handle a ValueError from a conversion with try and except ValueError, and nothing broader.",
    minutes: 16,
    objectives: [
      "Put only the line that can fail inside `try`, and handle its error in `except ValueError:`",
      "Explain why naming the error type matters: other errors still stop the program",
      "Parse a list of texts, keep the good values and count the rejected ones",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "conversion", "none-value", "identity", "comparison", "if-statement", "for-loop", "arithmetic", "len-call", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "string-method", "tuple-literal", "tuple-unpack", "logical", "membership", "aggregate-call", "continue-statement", "dict-literal", "dict-lookup", "spaces-in-text", "string-index"],
    teaches: ["try-except", "except-type"],
    blocks: [
      {
        kind: "text",
        md: "A CSV of invoice lines delivers every value as text, and people type what they like: `\"12\"`, `\" 6 \"`, `\"twelve\"`, `\"\"`. `int(\"12\")` works. `int(\"twelve\")` can't, so Python **raises** a `ValueError`, and an error nobody handles stops the program.",
      },
      {
        kind: "error-example",
        title: "One bad quantity stops everything",
        code: src`
quantities = ["12", "6", "twelve", "24"]
for text in quantities:
    print(int(text))
`,
        error: "ValueError",
        output: "12\n6\n",
        note: "`ValueError: invalid literal for int() with base 10: 'twelve'`. The 24 is never reached.",
      },
      {
        kind: "text",
        md: "`try:` marks lines that might fail. If one of them raises a `ValueError`, Python jumps straight to the matching `except ValueError:` block and then carries on after it; if nothing fails, the `except` block is skipped.\n\nAlways name the error. `except ValueError:` handles exactly the problem you expect (text that isn't a number). Every other error, such as a typo that raises `NameError`, still stops the program and shows you where. A bare `except:` would swallow those too, and the bug would hide behind your fallback value.",
      },
      {
        kind: "example",
        title: "Skip what can't be read",
        code: src`
quantities = ["12", " 6 ", "twelve", "", "24"]
total = 0
for text in quantities:
    try:
        total += int(text)
    except ValueError:
        print("skipped", repr(text))
print("total:", total)
`,
        output: "skipped 'twelve'\nskipped ''\ntotal: 42\n",
        note: "`int` ignores spaces at the ends, so `\" 6 \"` is fine. An empty text is not a number either. `repr` shows the quotes, so an empty value is visible.",
      },
      {
        kind: "text",
        md: "Inside a function, the `except` block decides what a bad value **means**: here, `None` for \"no usable price\". The specific type also protects you: `float(None)` raises `TypeError`, not `ValueError`, so a missing value is not silently treated like a typo.",
      },
      {
        kind: "example",
        title: "A price, or None",
        code: src`
def to_price(text):
    try:
        return float(text)
    except ValueError:
        return None

for raw in ["6.95", "1,234.50", "  2.55", "N/A"]:
    print(repr(raw), "->", to_price(raw))
`,
        output: "'6.95' -> 6.95\n'1,234.50' -> None\n'  2.55' -> 2.55\n'N/A' -> None\n",
        note: "`return` inside `try` hands the number back when the conversion works. A thousands comma makes the text unreadable to `float`, which is worth knowing before you trust a spreadsheet export.",
      },
      {
        kind: "text",
        md: "**When to use it:** when a failure is expected and you know what to do about it (skip the value, count it, use a default). **Mistakes to avoid:** wrapping many lines in one `try`, so you can't tell which one failed; a bare `except:`, which also hides real bugs; and catching an error you can't do anything useful about.",
      },
    ],
    tryIt: {
      id: "try",
      title: "An age that might not be a number",
      prompt: "`parse_age` crashes on text like `\"abc\"`. Wrap the conversion so a ValueError returns `None` instead.",
      spec: [
        ["Function", "`parse_age(text)`"],
        ["Returns", "the whole number in `text`, or `None` when it isn't one"],
      ],
      starter: src`
def parse_age(text):
    return int(text)

print(parse_age("34"))
print(parse_age("abc"))
`,
      answer: src`
def parse_age(text):
    try:
        return int(text)
    except ValueError:
        return None

print(parse_age("34"))
print(parse_age("abc"))
`,
      wrong: [
        {
          code: src`
def parse_age(text):
    try:
        return int(text)
    except ValueError:
        return 0
`,
          fails: ["returns"],
          why: "0 is a real age, so it hides the bad input instead of marking it",
        },
      ],
      hints: ["The line that can fail is the `int(...)` conversion.", "Put it in a `try` block, followed by an except clause that names ValueError.", "In the `except` block, return None."],
      task: {
        checks: [
          fn("returns", "parse_age", [
            example(["34"], 34),
            example(["abc"], null),
            hiddenCase("an empty text", [""], null),
            hiddenCase("a number with spaces around it", [" 7 "], 7),
          ], { label: "parse_age() returns a number or None" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Good quantities and a reject count",
        prompt: "An import report needs both the usable quantities and how many values were thrown away. Write `parse_quantities(texts)`: return a tuple `(quantities, rejected)` where `quantities` is a list of the whole numbers that could be read, in order, and `rejected` is how many texts could not. Catch `ValueError` only.",
        spec: [
          ["Function", "`parse_quantities(texts)`"],
          ["texts", "a list of text values from a CSV column"],
          ["Returns", "`(list of ints, number of rejected texts)`"],
          ["Example", "`[\"12\", \"twelve\", \" 6\", \"\", \"-3\"]` → `([12, 6, -3], 2)`"],
        ],
        starter: src`
def parse_quantities(texts):
    quantities = []
    rejected = 0
    return (quantities, rejected)

print(parse_quantities(["12", "twelve", " 6", "", "-3"]))
`,
        answer: src`
def parse_quantities(texts):
    quantities = []
    rejected = 0
    for text in texts:
        try:
            quantities.append(int(text))
        except ValueError:
            rejected += 1
    return (quantities, rejected)

print(parse_quantities(["12", "twelve", " 6", "", "-3"]))
`,
        alternatives: [
          src`
def parse_quantities(texts):
    good = []
    for text in texts:
        try:
            value = int(text)
        except ValueError:
            continue
        good.append(value)
    return good, len(texts) - len(good)
`,
        ],
        wrong: [
          {
            code: src`
def parse_quantities(texts):
    quantities = []
    rejected = 0
    for text in texts:
        if text.isdigit():
            quantities.append(int(text))
        else:
            rejected += 1
    return (quantities, rejected)
`,
            fails: ["returns"],
            why: "`isdigit` says no to `-3` and to `\" 6\"`, which `int` reads perfectly well",
          },
          {
            code: src`
def parse_quantities(texts):
    quantities = []
    rejected = 0
    try:
        for text in texts:
            quantities.append(int(text))
    except ValueError:
        rejected += 1
    return (quantities, rejected)
`,
            fails: ["returns"],
            why: "the whole loop is inside `try`, so the first bad value ends the loop",
          },
          {
            code: src`
def parse_quantities(texts):
    quantities = []
    for text in texts:
        try:
            quantities.append(int(text))
        except ValueError:
            quantities.append(0)
    return (quantities, 0)
`,
            fails: ["returns"],
            why: "bad values become 0 and are counted as quantities",
          },
        ],
        hints: [
          "Each text gets its own attempt, so the `try` goes inside the loop.",
          "Append in the `try` block; count in the block that handles ValueError.",
          "Return both results together as a tuple.",
        ],
        task: {
          checks: [
            fn("returns", "parse_quantities", [
              example([["12", "twelve", " 6", "", "-3"]], py.tuple(py.list(py.int(12), py.int(6), py.int(-3)), py.int(2))),
              example([["28", "30"]], py.tuple(py.list(py.int(28), py.int(30)), py.int(0))),
              example([[]], py.tuple(py.list(), py.int(0))),
              hiddenCase("every value is bad", [["N/A", "1.5", "x"]], py.tuple(py.list(), py.int(3))),
              hiddenCase("a decimal quantity", [["2.0", "2"]], py.tuple(py.list(py.int(2)), py.int(1))),
              hiddenCase("negative cancellations", [["-1", "-24"]], py.tuple(py.list(py.int(-1), py.int(-24)), py.int(0))),
            ], { label: "parse_quantities() keeps good values and counts the rest" }),
          ],
        },
      },
      {
        id: "c2",
        title: "An average rating from messy input",
        prompt: "Review ratings arrive as text from an old form. Write `average_rating(texts)`: read each as a whole number; ignore texts that aren't whole numbers, **and** numbers outside 1–5 (a typo such as `44` is not a rating). Return the average of the ratings that remain, or `None` if none do.",
        spec: [
          ["Function", "`average_rating(texts)`"],
          ["Valid", "a text `int` can read whose value is from 1 to 5"],
          ["Returns", "the average of the valid ratings as a float, or `None`"],
          ["Example", "`[\"5\", \"4\", \"five\", \"44\", \" 3 \"]` → `4.0`"],
        ],
        starter: src`
def average_rating(texts):
    return None

print(average_rating(["5", "4", "five", "44", " 3 "]))
`,
        answer: src`
def average_rating(texts):
    ratings = []
    for text in texts:
        try:
            rating = int(text)
        except ValueError:
            continue
        if 1 <= rating <= 5:
            ratings.append(rating)
    if len(ratings) == 0:
        return None
    return sum(ratings) / len(ratings)

print(average_rating(["5", "4", "five", "44", " 3 "]))
`,
        alternatives: [
          src`
def average_rating(texts):
    total = 0
    count = 0
    for text in texts:
        try:
            value = int(text)
            if value >= 1 and value <= 5:
                total += value
                count += 1
        except ValueError:
            pass
    if count == 0:
        return None
    return total / count
`,
        ],
        wrong: [
          {
            code: src`
def average_rating(texts):
    ratings = []
    for text in texts:
        try:
            ratings.append(int(text))
        except ValueError:
            continue
    if len(ratings) == 0:
        return None
    return sum(ratings) / len(ratings)
`,
            fails: ["returns"],
            why: "a rating of 44 is a number, so it is averaged in",
          },
          {
            code: src`
def average_rating(texts):
    ratings = []
    for text in texts:
        try:
            rating = int(text)
        except ValueError:
            continue
        if 1 <= rating <= 5:
            ratings.append(rating)
    return sum(ratings) / len(ratings)
`,
            fails: ["returns"],
            why: "with no valid ratings it divides by zero",
          },
          {
            code: src`
def average_rating(texts):
    ratings = []
    for text in texts:
        try:
            rating = int(text)
        except ValueError:
            rating = 0
        if 1 <= rating <= 5:
            ratings.append(rating)
    if len(ratings) == 0:
        return None
    return sum(ratings) // len(ratings)
`,
            fails: ["returns"],
            why: "`//` throws away the fraction of the average",
          },
        ],
        hints: [
          "Two different reasons to drop a value: it isn't a number (an exception) and it's out of range (an `if`).",
          "After a failed conversion, `continue` skips to the next text; only a successful one reaches the range test.",
          "Guard the division: with nothing left, return None.",
        ],
        task: {
          checks: [
            fn("returns", "average_rating", [
              example([["5", "4", "five", "44", " 3 "]], py.float(4)),
              example([["2", "3"]], 2.5),
              example([["n/a", ""]], null),
              hiddenCase("only out-of-range numbers", [["0", "6", "10"]], null),
              hiddenCase("a decimal rating", [["4.5", "4"]], py.float(4)),
              hiddenCase("the boundaries 1 and 5", [["1", "5"]], py.float(3)),
              hiddenCase("no ratings at all", [[]], null),
            ], { label: "average_rating() averages the valid ratings" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
for text in ["8", "eight", "16"]:
    try:
        value = int(text)
        print("read", value)
    except ValueError:
        print("bad", text)
print("done")
`,
        choices: ["read 8\nbad eight\nread 16\ndone", "read 8\nbad eight\ndone", "read 8\nread 16\ndone", "bad eight\ndone"],
        answer: 0,
        why: "For \"eight\", `int` raises before the `print` in the `try` runs, so only the `except` line prints. The loop then carries on with \"16\".",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting `except ValueError` to catch everything. What happens here?",
        program: src`
prices = {"85048": "6.95"}
try:
    print(float(prices["21329"]))
except ValueError:
    print("bad price")
print("after")
`,
        choices: ["(nothing)", "bad price\nafter", "after", "6.95\nafter"],
        answer: 0,
        why: "The missing key raises `KeyError`, not `ValueError`, so the `except` doesn't match and the program stops before printing anything. That's what you want: a missing product is a different problem from a badly typed price.",
      },
      {
        id: "q3",
        prompt: "Which lines belong inside the `try` block?",
        choices: ["Only the line that can raise the error you are handling", "Every line of the function", "Every line in the loop", "The print statements"],
        answer: 0,
        why: "A small `try` makes it clear which operation can fail, and stops the `except` from covering errors in lines you didn't mean to protect.",
      },
    ],
    review: [
      "`try:` runs code that may fail; `except ValueError:` handles that one error and carries on.",
      "Name the error. Other errors still stop the program, which is how you find real bugs.",
      "Keep `try` blocks small: one risky operation, one decision about what failure means.",
      "Next: read the error itself, and handle different errors in different ways.",
    ],
  },

  // ------------------------------------------------------------------ PY-L18-02 as err, several handlers
  {
    id: "PY-L18-02",
    version: 2,
    slug: "name-the-error",
    title: "Read the error and handle each kind",
    lede: "`except ValueError as err` keeps the error so you can report its message. Several `except` clauses let each kind of failure get its own response.",
    focus: "Keep the error with `as`, and give different errors different handlers.",
    minutes: 18,
    objectives: [
      "Use `except ValueError as err:` and `str(err)` to report what went wrong",
      "Write several `except` clauses, or one with a tuple of types, and know which runs",
      "Turn failures into a validation report: which rows failed, and why",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "conversion", "none-value", "try-except", "except-type", "for-loop", "if-statement", "else-clause", "arithmetic", "enumerate-call", "tuple-unpack", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "comparison", "membership", "dict-iterate", "len-call", "continue-statement", "logical"],
    teaches: ["except-as", "except-many"],
    blocks: [
      {
        kind: "text",
        md: "Skipping a bad value is sometimes enough. A data team usually wants more: **which** row, and **what** was wrong with it. Write `except ValueError as err:` and the error object is stored in `err`. `str(err)` (or printing `err`) gives its message, the same text you'd see at the bottom of a traceback.",
      },
      {
        kind: "example",
        title: "Report the message",
        code: src`
for text in ["6.95", "1,234.50", "N/A"]:
    try:
        print(float(text))
    except ValueError as err:
        print("rejected:", err)
`,
        output: "6.95\nrejected: could not convert string to float: '1,234.50'\nrejected: could not convert string to float: 'N/A'\n",
        note: "The message names the offending text, so a report built from it points straight at the problem.",
      },
      {
        kind: "text",
        md: "One line can fail in more than one way. Reading `row[\"Quantity\"]` raises `KeyError` when the column is missing; converting it raises `ValueError` when the text is wrong. Add one `except` clause per kind. Python checks them top to bottom and runs **the first that matches**. When two kinds need the same response, list them in one clause as a tuple: `except (KeyError, ValueError) as err:`.\n\nAn error you didn't list still stops the program, as it should.",
      },
      {
        kind: "error-example",
        title: "An error nobody listed",
        code: src`
row = {"Quantity": "12", "Price": None}
try:
    total = int(row["Quantity"]) * float(row["Price"])
except KeyError as err:
    print("missing column", err)
except ValueError as err:
    print("bad number:", err)
`,
        error: "TypeError",
        output: "",
        note: "`float(None)` raises `TypeError`, which neither clause names. That's a different bug (a value that should never be None), and it surfaces instead of being reported as a typo.",
      },
      {
        kind: "example",
        title: "A validation report for invoice lines",
        code: src`
def check_lines(rows):
    problems = []
    for number, row in enumerate(rows, start=2):
        try:
            quantity = int(row["Quantity"])
            price = float(row["Price"])
        except KeyError as err:
            problems.append(f"line {number}: missing column {err}")
        except ValueError as err:
            problems.append(f"line {number}: {err}")
    return problems

rows = [
    {"StockCode": "85048", "Quantity": "12", "Price": "6.95"},
    {"StockCode": "22350", "Quantity": "twelve", "Price": "2.55"},
    {"StockCode": "22087", "Price": "2.95"},
]
for problem in check_lines(rows):
    print(problem)
`,
        output: "line 3: invalid literal for int() with base 10: 'twelve'\nline 4: missing column 'Quantity'\n",
        note: "`enumerate(rows, start=2)` numbers the rows as a spreadsheet would (line 1 is the header). A `KeyError`'s message is the missing key **with quotes**, because it shows the key's `repr`.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a failure should be reported, logged or counted rather than just skipped. **Mistakes to avoid:** putting a broad clause such as `except Exception:` first, so the specific clauses below it never run; reporting a fixed text like \"error\" that throws away the message; and catching an error type that this code can't actually raise, which only misleads the reader.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Say why it was rejected",
      prompt: "`explain` reports every bad price as `\"rejected\"`. Keep the error with `as` and return `\"rejected: \"` followed by its message.",
      spec: [
        ["Function", "`explain(text)`"],
        ["Returns", "`\"ok\"` for a readable price, otherwise `\"rejected: <message>\"`"],
      ],
      starter: src`
def explain(text):
    try:
        float(text)
        return "ok"
    except ValueError:
        return "rejected"

print(explain("6.95"))
print(explain("N/A"))
`,
      answer: src`
def explain(text):
    try:
        float(text)
        return "ok"
    except ValueError as err:
        return "rejected: " + str(err)

print(explain("6.95"))
print(explain("N/A"))
`,
      wrong: [
        {
          code: src`
def explain(text):
    try:
        float(text)
        return "ok"
    except ValueError as err:
        return "rejected: " + text
`,
          fails: ["returns"],
          why: "it repeats the input instead of the error's message",
        },
      ],
      hints: ["Add `as err` to the `except` line.", "`str(err)` is the error's message.", "Join the label and the message with `+`."],
      task: {
        checks: [
          fn("returns", "explain", [
            example(["6.95"], "ok"),
            example(["N/A"], "rejected: could not convert string to float: 'N/A'"),
            hiddenCase("an empty text", [""], "rejected: could not convert string to float: ''"),
          ], { label: "explain() includes the error's message" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "What is wrong with this line?",
        prompt: "Write `line_problem(row)` for one invoice line (a dictionary of text values). Try to read `int(row[\"Quantity\"])` and `float(row[\"Price\"])`. Return `None` if both work; `\"missing <column>\"` if a column is missing; `\"bad number: <message>\"` if a value can't be converted. Use the error to fill in the column or the message.",
        spec: [
          ["Function", "`line_problem(row)`"],
          ["Returns", "`None`, `\"missing Price\"` (no quotes around the column name), or e.g. `\"bad number: could not convert string to float: 'N/A'\"`"],
          ["Order", "the quantity is read first, so a line with two problems reports the quantity's"],
          ["Hint", "a KeyError's `err.args[0]` is the missing key without quotes"],
        ],
        starter: src`
def line_problem(row):
    return None

print(line_problem({"StockCode": "85048", "Quantity": "12", "Price": "6.95"}))
print(line_problem({"StockCode": "22087", "Quantity": "12"}))
print(line_problem({"StockCode": "22350", "Quantity": "12", "Price": "N/A"}))
`,
        answer: src`
def line_problem(row):
    try:
        quantity = int(row["Quantity"])
        float(row["Price"])
    except KeyError as err:
        return "missing " + err.args[0]
    except ValueError as err:
        return "bad number: " + str(err)
    return None

print(line_problem({"StockCode": "85048", "Quantity": "12", "Price": "6.95"}))
print(line_problem({"StockCode": "22087", "Quantity": "12"}))
print(line_problem({"StockCode": "22350", "Quantity": "12", "Price": "N/A"}))
`,
        alternatives: [
          src`
def line_problem(row):
    if "Quantity" not in row:
        return "missing Quantity"
    try:
        quantity = int(row["Quantity"])
    except ValueError as err:
        return f"bad number: {err}"
    if "Price" not in row:
        return "missing Price"
    try:
        float(row["Price"])
    except ValueError as err:
        return f"bad number: {err}"
    return None
`,
        ],
        wrong: [
          {
            code: src`
def line_problem(row):
    try:
        quantity = int(row["Quantity"])
        float(row["Price"])
    except (KeyError, ValueError) as err:
        return "bad number: " + str(err)
    return None
`,
            fails: ["returns"],
            why: "a missing column is reported as a bad number",
          },
          {
            code: src`
def line_problem(row):
    try:
        quantity = int(row["Quantity"])
        float(row["Price"])
    except KeyError as err:
        return "missing " + str(err)
    except ValueError as err:
        return "bad number: " + str(err)
    return None
`,
            fails: ["returns"],
            why: "`str()` of a KeyError keeps the quotes: `missing 'Price'`",
          },
          {
            code: src`
def line_problem(row):
    try:
        quantity = int(row["Quantity"])
        float(row["Price"])
    except KeyError:
        return "missing column"
    except ValueError:
        return "bad number"
    return None
`,
            fails: ["returns"],
            why: "fixed texts lose which column is missing and what the bad value was",
          },
        ],
        hints: [
          "Two kinds of failure need two different answers, so write two `except` clauses.",
          "Keep each error with `as err`. A ValueError's message is `str(err)`.",
          "For the KeyError, the key on its own (no quotes) is the first item of `err.args`.",
        ],
        task: {
          checks: [
            fn("returns", "line_problem", [
              example([{ StockCode: "85048", Quantity: "12", Price: "6.95" }], null),
              example([{ StockCode: "22087", Quantity: "12" }], "missing Price"),
              example([{ StockCode: "22350", Quantity: "12", Price: "N/A" }], "bad number: could not convert string to float: 'N/A'"),
              hiddenCase("a bad quantity", [{ StockCode: "1", Quantity: "twelve", Price: "1" }], "bad number: invalid literal for int() with base 10: 'twelve'"),
              hiddenCase("a missing quantity", [{ StockCode: "2", Price: "1.5" }], "missing Quantity"),
              hiddenCase("two problems at once", [{ StockCode: "3", Quantity: "x" }], "bad number: invalid literal for int() with base 10: 'x'"),
              hiddenCase("a negative cancellation line", [{ StockCode: "4", Quantity: "-6", Price: "2.10" }], null),
            ], { label: "line_problem() names the first problem in a line" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Import what you can, count the rest",
        prompt: "Write `import_lines(rows)` for a batch of invoice lines (text values). Convert each good row to `{\"stock_code\": text, \"quantity\": int, \"price\": float}`. Count the bad ones by kind. Return `{\"loaded\": [converted rows], \"missing\": n, \"bad_number\": n}`.",
        spec: [
          ["Function", "`import_lines(rows)`"],
          ["rows", "dictionaries with text `StockCode`, `Quantity` and `Price` (some columns may be missing)"],
          ["Returns", "`{\"loaded\": [...], \"missing\": count of KeyError rows, \"bad_number\": count of ValueError rows}`"],
          ["Rules", "a row with a missing `StockCode` counts as missing; a failing row adds nothing to `loaded`"],
        ],
        starter: src`
def import_lines(rows):
    report = {"loaded": [], "missing": 0, "bad_number": 0}
    return report

rows = [
    {"StockCode": "85048", "Quantity": "12", "Price": "6.95"},
    {"StockCode": "22350", "Quantity": "twelve", "Price": "2.55"},
    {"StockCode": "22087", "Price": "2.95"},
    {"StockCode": "79323P", "Quantity": "12", "Price": "6.75"},
]
print(import_lines(rows))
`,
        answer: src`
def import_lines(rows):
    report = {"loaded": [], "missing": 0, "bad_number": 0}
    for row in rows:
        try:
            line = {"stock_code": row["StockCode"]}
            line["quantity"] = int(row["Quantity"])
            line["price"] = float(row["Price"])
        except KeyError:
            report["missing"] += 1
        except ValueError:
            report["bad_number"] += 1
        else:
            report["loaded"].append(line)
    return report

rows = [
    {"StockCode": "85048", "Quantity": "12", "Price": "6.95"},
    {"StockCode": "22350", "Quantity": "twelve", "Price": "2.55"},
    {"StockCode": "22087", "Price": "2.95"},
    {"StockCode": "79323P", "Quantity": "12", "Price": "6.75"},
]
print(import_lines(rows))
`,
        alternatives: [
          src`
def import_lines(rows):
    loaded = []
    missing = 0
    bad = 0
    for row in rows:
        try:
            code = row["StockCode"]
            quantity = int(row["Quantity"])
            price = float(row["Price"])
        except KeyError:
            missing += 1
            continue
        except ValueError:
            bad += 1
            continue
        loaded.append({"stock_code": code, "quantity": quantity, "price": price})
    return {"loaded": loaded, "missing": missing, "bad_number": bad}
`,
        ],
        wrong: [
          {
            code: src`
def import_lines(rows):
    report = {"loaded": [], "missing": 0, "bad_number": 0}
    for row in rows:
        line = {"stock_code": row.get("StockCode")}
        try:
            line["quantity"] = int(row["Quantity"])
            line["price"] = float(row["Price"])
        except KeyError:
            report["missing"] += 1
        except ValueError:
            report["bad_number"] += 1
        report["loaded"].append(line)
    return report
`,
            fails: ["returns"],
            why: "failing rows are still appended, half-built",
          },
          {
            code: src`
def import_lines(rows):
    report = {"loaded": [], "missing": 0, "bad_number": 0}
    for row in rows:
        try:
            report["loaded"].append({"stock_code": row["StockCode"], "quantity": int(row["Quantity"]), "price": float(row["Price"])})
        except (KeyError, ValueError):
            report["bad_number"] += 1
    return report
`,
            fails: ["returns"],
            why: "missing columns are counted as bad numbers",
          },
        ],
        hints: [
          "Build the whole converted row inside the `try`, so nothing is kept from a row that fails halfway.",
          "One `except` per kind of failure, each adding 1 to its own count.",
          "Append only when the conversion worked: after the `try` statement, or in a block that runs only on success.",
        ],
        task: {
          checks: [
            fn("returns", "import_lines", [
              example([[
                { StockCode: "85048", Quantity: "12", Price: "6.95" },
                { StockCode: "22350", Quantity: "twelve", Price: "2.55" },
                { StockCode: "22087", Price: "2.95" },
                { StockCode: "79323P", Quantity: "12", Price: "6.75" },
              ]], { loaded: [{ stock_code: "85048", quantity: 12, price: 6.95 }, { stock_code: "79323P", quantity: 12, price: 6.75 }], missing: 1, bad_number: 1 }),
              example([[]], { loaded: [], missing: 0, bad_number: 0 }),
              example([[{ StockCode: "21329", Quantity: "-2", Price: "0.98" }]], { loaded: [{ stock_code: "21329", quantity: -2, price: 0.98 }], missing: 0, bad_number: 0 }),
              hiddenCase("a row with no stock code", [[{ Quantity: "1", Price: "1.0" }]], { loaded: [], missing: 1, bad_number: 0 }),
              hiddenCase("a bad price after a good quantity", [[{ StockCode: "A", Quantity: "3", Price: "free" }]], { loaded: [], missing: 0, bad_number: 1 }),
              hiddenCase("several failures of each kind", [[{ StockCode: "A" }, { StockCode: "B", Quantity: "x", Price: "1" }, { Price: "2" }, { StockCode: "C", Quantity: "1", Price: "1,5" }]], { loaded: [], missing: 2, bad_number: 2 }),
            ], { label: "import_lines() loads good rows and counts each kind of failure", compare: { numbers: "int-float-equal" } }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
stock = {"85048": "12"}
for code in ["85048", "22350"]:
    try:
        print(int(stock[code]) * 2)
    except KeyError as err:
        print("no stock record for", err)
    except ValueError:
        print("bad count")
`,
        choices: ["24\nno stock record for '22350'", "24\nbad count", "24\nno stock record for 22350", "1212\nno stock record for '22350'"],
        answer: 0,
        why: "The first code doubles 12. The second is missing, so `KeyError` matches its clause; a KeyError's message is the key's repr, with quotes.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a broad clause first. What does this print?",
        program: src`
try:
    count = int("twelve")
except Exception:
    print("something went wrong")
except ValueError:
    print("not a number")
`,
        choices: ["something went wrong", "not a number", "something went wrong\nnot a number", "(nothing)"],
        answer: 0,
        why: "Clauses are tried top to bottom and only the first match runs. `ValueError` is a kind of `Exception`, so the broad clause takes it and the specific one is dead code.",
      },
      {
        id: "q3",
        prompt: "Two kinds of error need exactly the same handling. What is the tidiest way to write it?",
        choices: ["except (KeyError, ValueError) as err:", "except KeyError or ValueError:", "Two try statements, one per error", "A bare except:"],
        answer: 0,
        why: "A tuple of types catches either. `KeyError or ValueError` is just `KeyError`, because `or` returns its first true operand, so the ValueError would escape.",
      },
    ],
    review: [
      "`except SomeError as err:` keeps the error; `str(err)` is its message (a KeyError's shows the key with quotes).",
      "Several clauses: the first match runs, so put specific types before general ones.",
      "A tuple of types shares one handler; unlisted errors still stop the program.",
      "Next: `else` for code that should run only on success, and `finally` for code that must always run.",
    ],
  },

  // ------------------------------------------------------------------ PY-L18-03 else and finally
  {
    id: "PY-L18-03",
    version: 2,
    slug: "the-finally-line",
    title: "Success-only and always: else and finally",
    lede: "`else` holds code that should run only when the `try` succeeded. `finally` holds code that must run no matter what, even when an error is on its way out.",
    focus: "Separate the success path (else) and the clean-up (finally) from the code that may fail.",
    minutes: 18,
    objectives: [
      "Trace the order in which `try`, `except`, `else` and `finally` blocks run",
      "Move success-only work into `else`, so `try` covers only the risky line",
      "Use `finally` for bookkeeping that must happen on every path, including an unhandled error",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "conversion", "none-value", "boolean", "try-except", "except-type", "except-as", "for-loop", "if-statement", "arithmetic", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "comparison", "len-call", "lambda", "else-clause", "end", "membership", "nested-dict", "print-blank", "truthiness"],
    teaches: ["try-else", "finally-clause"],
    blocks: [
      {
        kind: "text",
        md: "A `try` statement can have two more blocks. **`else`** runs only if the `try` block finished without an error: put the code that depends on success there, so it isn't accidentally protected by the `except`. **`finally`** runs last, on every path: success, a handled error, or an error that nobody catches. It exists for clean-up and bookkeeping that must not be skipped.",
      },
      {
        kind: "example",
        title: "Which blocks run",
        code: src`
def attempt(text):
    try:
        amount = float(text)
    except ValueError:
        print(" except: not a number")
    else:
        print(" else: charged", amount)
    finally:
        print(" finally: attempt logged")

print("A")
attempt("19.99")
print("B")
attempt("free")
`,
        output: "A\n else: charged 19.99\n finally: attempt logged\nB\n except: not a number\n finally: attempt logged\n",
        note: "Exactly one of `except` and `else` runs. `finally` runs both times, last.",
      },
      {
        kind: "text",
        md: "`finally` even runs when the error isn't handled at all. Its block runs first, then the error carries on and stops the program as before.",
      },
      {
        kind: "error-example",
        title: "finally runs, then the error continues",
        code: src`
status = {"running": True}
try:
    print(int(None))
except ValueError:
    print("bad text")
finally:
    status["running"] = False
    print("status:", status)
`,
        error: "TypeError",
        output: "status: {'running': False}\n",
        note: "`int(None)` raises `TypeError`, which the `except` doesn't name. The `finally` block still resets the status before the program stops.",
      },
      {
        kind: "text",
        md: "In real code `finally` releases whatever the work was holding: a \"busy\" flag, a counter of attempts, and in the Files & Directories module an open file. Here a payment processor counts every attempt, even ones that crash, so the dashboard's attempt total is never short.",
      },
      {
        kind: "example",
        title: "Every attempt is counted",
        code: src`
def charge(stats, text):
    stats["attempts"] += 1
    try:
        amount = float(text)
    except ValueError:
        stats["rejected"] += 1
        return None
    else:
        stats["charged"] += amount
        return amount
    finally:
        print(f"after {text!r}: {stats}")

stats = {"attempts": 0, "rejected": 0, "charged": 0}
charge(stats, "12.93")
charge(stats, "twelve")
`,
        output: "after '12.93': {'attempts': 1, 'rejected': 0, 'charged': 12.93}\nafter 'twelve': {'attempts': 2, 'rejected': 1, 'charged': 12.93}\n",
        note: "Even when a `return` leaves the function from `except` or `else`, `finally` runs on the way out. `{text!r}` in an f-string shows the value with quotes, like `repr`.",
      },
      {
        kind: "text",
        md: "**When to use it:** `else` when work should happen only after the risky step succeeded; `finally` for anything that must happen whatever the outcome. **Mistakes to avoid:** putting success-only work inside `try`, where an unrelated error in it would be caught by the wrong handler; and returning a value from `finally`, which silently replaces the function's real result and swallows errors.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count only real readings",
      prompt: "`add_reading` counts a reading even when it couldn't be read, because the count is in the wrong block. Move the counting line into an `else` block so it runs only on success.",
      spec: [
        ["Function", "`add_reading(totals, text)`"],
        ["Changes", "`totals[\"sum\"]` and `totals[\"count\"]` only when `text` is a number"],
      ],
      starter: src`
def add_reading(totals, text):
    try:
        value = float(text)
    except ValueError:
        value = 0
    totals["sum"] += value
    totals["count"] += 1

totals = {"sum": 0, "count": 0}
add_reading(totals, "21.5")
add_reading(totals, "--")
print(totals)
`,
      answer: src`
def add_reading(totals, text):
    try:
        value = float(text)
    except ValueError:
        pass
    else:
        totals["sum"] += value
        totals["count"] += 1

totals = {"sum": 0, "count": 0}
add_reading(totals, "21.5")
add_reading(totals, "--")
print(totals)
`,
      wrong: [
        {
          code: src`
def add_reading(totals, text):
    try:
        value = float(text)
    except ValueError:
        value = 0
    finally:
        totals["sum"] += value
        totals["count"] += 1
`,
          fails: ["updates"],
          why: "`finally` runs on every path, so a bad reading is still counted",
        },
      ],
      hints: ["The count should change only when `float` worked.", "An `else` block after `except` runs only when the `try` succeeded.", "Move both update lines into `else`; the `except` block then has nothing to do but `pass`."],
      task: {
        checks: [
          fn("updates", "add_reading", [
            example([{ sum: 0, count: 0 }, "21.5"], null, { argsAfter: [{ sum: 21.5, count: 1 }, "21.5"] }),
            hiddenCase("a reading that isn't a number", [{ sum: 10, count: 1 }, "--"], null, { argsAfter: [{ sum: 10, count: 1 }, "--"] }),
          ], { label: "add_reading() counts only readable values", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A stock count that always records the attempt",
        prompt: "Warehouse staff type counts into a handheld scanner. Write `record_count(log, sku, text)`: always append `sku` to `log[\"attempts\"]`; if `text` is a whole number, set `log[\"counts\"][sku]` to it and return it; if not, append `sku` to `log[\"failed\"]` and return `None`. Use `except ValueError`, `else` and `finally`.",
        spec: [
          ["Function", "`record_count(log, sku, text)`"],
          ["log", "`{\"attempts\": [...], \"failed\": [...], \"counts\": {...}}`, changed in place"],
          ["Returns", "the count, or `None`"],
          ["Example", "an empty log, then `(\"85048\", \"40\")` and `(\"22350\", \"forty\")` → attempts `['85048', '22350']`, failed `['22350']`, counts `{'85048': 40}`"],
        ],
        starter: src`
def record_count(log, sku, text):
    return None

log = {"attempts": [], "failed": [], "counts": {}}
print(record_count(log, "85048", "40"))
print(record_count(log, "22350", "forty"))
print(log)
`,
        answer: src`
def record_count(log, sku, text):
    try:
        count = int(text)
    except ValueError:
        log["failed"].append(sku)
        return None
    else:
        log["counts"][sku] = count
        return count
    finally:
        log["attempts"].append(sku)

log = {"attempts": [], "failed": [], "counts": {}}
print(record_count(log, "85048", "40"))
print(record_count(log, "22350", "forty"))
print(log)
`,
        alternatives: [
          src`
def record_count(log, sku, text):
    log["attempts"].append(sku)
    try:
        count = int(text)
    except ValueError:
        log["failed"].append(sku)
        count = None
    else:
        log["counts"][sku] = count
    return count
`,
        ],
        wrong: [
          {
            code: src`
def record_count(log, sku, text):
    try:
        count = int(text)
        log["attempts"].append(sku)
    except ValueError:
        log["failed"].append(sku)
        return None
    log["counts"][sku] = count
    return count
`,
            fails: ["log"],
            why: "a failed count is never recorded as an attempt",
          },
          {
            code: src`
def record_count(log, sku, text):
    log["attempts"].append(sku)
    try:
        count = int(text)
    except ValueError:
        log["failed"].append(sku)
        count = 0
    log["counts"][sku] = count
    return count
`,
            fails: ["returns", "log"],
            why: "a bad entry is stored as a count of 0, which looks like an empty shelf",
          },
        ],
        hints: [
          "Three outcomes: always (attempts), only on success (counts), only on failure (failed).",
          "Those match `finally`, `else` and `except ValueError` blocks.",
          "Only the conversion needs to be in the `try` block.",
        ],
        task: {
          checks: [
            fn("returns", "record_count", [
              example([{ attempts: [], failed: [], counts: {} }, "85048", "40"], 40),
              example([{ attempts: [], failed: [], counts: {} }, "22350", "forty"], null),
              example([{ attempts: [], failed: [], counts: {} }, "21329", " 0 "], 0),
              hiddenCase("a decimal count", [{ attempts: [], failed: [], counts: {} }, "A", "2.5"], null),
            ], { label: "record_count() returns the count or None" }),
            fn("log", "record_count", [
              example([{ attempts: [], failed: [], counts: {} }, "85048", "40"], 40, { argsAfter: [{ attempts: ["85048"], failed: [], counts: { "85048": 40 } }, "85048", "40"] }),
              example([{ attempts: ["85048"], failed: [], counts: { "85048": 40 } }, "22350", "forty"], null, { argsAfter: [{ attempts: ["85048", "22350"], failed: ["22350"], counts: { "85048": 40 } }, "22350", "forty"] }),
              hiddenCase("a recount replaces the old count", [{ attempts: ["A"], failed: [], counts: { A: 5 } }, "A", "7"], 7, { argsAfter: [{ attempts: ["A", "A"], failed: [], counts: { A: 7 } }, "A", "7"] }),
              hiddenCase("an empty entry", [{ attempts: [], failed: [], counts: {} }, "B", ""], null, { argsAfter: [{ attempts: ["B"], failed: ["B"], counts: {} }, "B", ""] }),
            ], { label: "record_count() updates the log on every path" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A step that always clears its busy flag",
        prompt: "A data pipeline runs steps that are functions. Write `run_step(step, value, state)`: set `state[\"busy\"]` to True, call `step(value)`, and set `state[\"busy\"]` back to False **however the call ends**. If the step raises `ValueError`, append its message to `state[\"errors\"]` and return `None`. If it succeeds, add 1 to `state[\"done\"]` and return its result. Any other error must still escape (after the flag is cleared).",
        spec: [
          ["Function", "`run_step(step, value, state)`"],
          ["state", "`{\"busy\": False, \"done\": 0, \"errors\": []}`, changed in place"],
          ["Returns", "the step's result, or `None` after a ValueError"],
          ["Example", "`run_step(float, \"2.5\", state)` → `2.5`; `run_step(float, \"x\", state)` → `None`, and the message is added to `state[\"errors\"]`"],
        ],
        starter: src`
def run_step(step, value, state):
    return step(value)

state = {"busy": False, "done": 0, "errors": []}
print(run_step(float, "2.5", state))
print(run_step(float, "x", state))
print(state)
`,
        answer: src`
def run_step(step, value, state):
    state["busy"] = True
    try:
        result = step(value)
    except ValueError as err:
        state["errors"].append(str(err))
        return None
    else:
        state["done"] += 1
        return result
    finally:
        state["busy"] = False

state = {"busy": False, "done": 0, "errors": []}
print(run_step(float, "2.5", state))
print(run_step(float, "x", state))
print(state)
`,
        alternatives: [
          src`
def run_step(step, value, state):
    state["busy"] = True
    result = None
    try:
        result = step(value)
        succeeded = True
    except ValueError as err:
        state["errors"].append(str(err))
        succeeded = False
    finally:
        state["busy"] = False
    if succeeded:
        state["done"] += 1
    return result
`,
        ],
        wrong: [
          {
            code: src`
def run_step(step, value, state):
    state["busy"] = True
    try:
        result = step(value)
    except ValueError as err:
        state["errors"].append(str(err))
        state["busy"] = False
        return None
    state["done"] += 1
    state["busy"] = False
    return result
`,
            fails: ["escapes"],
            why: "when another error escapes, the busy flag is left on",
          },
          {
            code: src`
def run_step(step, value, state):
    state["busy"] = True
    try:
        result = step(value)
        state["done"] += 1
        return result
    except Exception as err:
        state["errors"].append(str(err))
        return None
    finally:
        state["busy"] = False
`,
            fails: ["escapes"],
            why: "catching every Exception hides errors that should escape",
          },
        ],
        hints: [
          "The flag must be cleared on every path, including an error you don't handle: that is `finally`'s job.",
          "Handle only ValueError, keeping it with `as err` to record its message.",
          "Count the step as done only when the call succeeded.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "succeeds",
              label: "run_step() returns the result, counts it and clears the flag",
              show: "run_step(float, \"2.5\", state)",
              expr: "_s = {'busy': False, 'done': 0, 'errors': []}\n_r = run_step(float, '2.5', _s)\nresult = [_r, _s]",
              expected: py.list(py.float(2.5), py.dict([[py.str("busy"), py.bool(false)], [py.str("done"), py.int(1)], [py.str("errors"), py.list()]])),
            },
            {
              kind: "expr",
              id: "value-error",
              label: "run_step() records a ValueError's message and returns None",
              show: "run_step(float, \"x\", state)",
              expr: "_s = {'busy': False, 'done': 0, 'errors': []}\n_r = run_step(float, 'x', _s)\nresult = [_r, _s]",
              expected: py.list(py.none, py.dict([[py.str("busy"), py.bool(false)], [py.str("done"), py.int(0)], [py.str("errors"), py.list(py.str("could not convert string to float: 'x'"))]])),
            },
            {
              kind: "expr",
              id: "escapes",
              label: "Any other error escapes, and the busy flag is still cleared",
              hidden: true,
              expr: "_s = {'busy': False, 'done': 0, 'errors': []}\ntry:\n    run_step(lambda v: v['missing'], {}, _s)\n    result = 'no error escaped'\nexcept KeyError:\n    result = _s",
              expected: py.dict([[py.str("busy"), py.bool(false)], [py.str("done"), py.int(0)], [py.str("errors"), py.list()]]),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
for text in ["4", "four"]:
    try:
        n = int(text)
    except ValueError:
        print("E", end=" ")
    else:
        print("ok", n, end=" ")
    finally:
        print("F", end=" ")
print()
`,
        choices: ["ok 4 F E F ", "ok 4 E F ", "ok 4 F E ", "ok 4 F E F ok F "],
        answer: 0,
        why: "For \"4\" the `else` and `finally` blocks run; for \"four\" the `except` and `finally` blocks run. `finally` runs every time.",
      },
      {
        id: "q2",
        prompt: "A common mistake: success-only work inside `try`. `report[\"rows\"]` doesn't exist. What does this print?",
        program: src`
report = {}
try:
    price = float("6.95")
    report["rows"] += 1
except KeyError:
    print("no such column")
print("done")
`,
        choices: ["no such column\ndone", "done", "(nothing)", "6.95\ndone"],
        answer: 0,
        why: "The conversion worked; the bookkeeping line raised KeyError, and the handler meant for something else reported it misleadingly. In an `else` block, the bug would have surfaced as itself.",
      },
      {
        id: "q3",
        prompt: "An unhandled `TypeError` is raised inside `try`. What happens to the `finally` block?",
        choices: ["It runs, then the TypeError continues and stops the program", "It is skipped because the error wasn't handled", "It runs and the TypeError disappears", "It runs only if there is an else block"],
        answer: 0,
        why: "`finally` runs on every way out of the `try` statement, then the error continues unless something else catches it.",
      },
    ],
    review: [
      "`try` for the risky line, `except` for the failure, `else` for success-only work, `finally` for always.",
      "`finally` runs even when the error isn't handled, and even after a `return`.",
      "Keep success-only work out of `try`, or the wrong handler may catch its bugs.",
      "Next: raising your own errors, with messages that say exactly what was wrong.",
    ],
  },

  // ------------------------------------------------------------------ PY-L18-04 raise
  {
    id: "PY-L18-04",
    version: 2,
    slug: "raise-a-bad-price",
    title: "Raise errors with useful messages",
    lede: "A validation function that finds bad data should refuse it loudly: `raise ValueError(\"…\")` stops the caller with a message that says exactly what was wrong.",
    focus: "Raise ValueError with a message naming the bad value and the rule it broke.",
    minutes: 18,
    objectives: [
      "Raise `ValueError(message)` when a value breaks a rule, and catch it in the caller",
      "Write messages that name the value and the rule: `rating must be 1-5, got 7`",
      "Replace a library's vague error with your own clearer one",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "string-method", "string-format", "conversion", "none-value", "try-except", "except-type", "except-as", "for-loop", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "len-call", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "membership", "truthiness", "aggregate-call", "nested-dict", "string-check", "string-slice"],
    teaches: ["raise-stmt"],
    blocks: [
      {
        kind: "text",
        md: "So far errors came from Python itself. Your own functions can raise them too. A function that checks a quantity has two choices when the quantity is wrong: return something odd (`None`, `-1`) and hope the caller checks, or **raise** an error the caller can't ignore. `raise ValueError(\"quantity must be positive, got -4\")` stops the function on that line, exactly like `int(\"twelve\")` does.\n\nRaise `ValueError` when the **type** is right but the **value** is not acceptable. The message is for the person reading the report later: name the value and the rule.",
      },
      {
        kind: "example",
        title: "Refuse a bad quantity",
        code: src`
def checked_quantity(quantity):
    if quantity <= 0:
        raise ValueError(f"quantity must be positive, got {quantity}")
    return quantity

for q in [12, -4, 3]:
    try:
        print("ok", checked_quantity(q))
    except ValueError as err:
        print("refused:", err)
`,
        output: "ok 12\nrefused: quantity must be positive, got -4\nok 3\n",
        note: "The caller decides what refusal means (here, a report line), using the same `try`/`except` as for Python's own errors.",
      },
      {
        kind: "error-example",
        title: "Nobody catches it",
        code: src`
def checked_quantity(quantity):
    if quantity <= 0:
        raise ValueError(f"quantity must be positive, got {quantity}")
    return quantity

print(checked_quantity(5))
print(checked_quantity(0))
`,
        error: "ValueError",
        output: "5\n",
        note: "Uncaught, your error stops the program with your message: `ValueError: quantity must be positive, got 0`. That's often right for a value that should never happen.",
      },
      {
        kind: "text",
        md: "A function can also catch a library's error and raise a clearer one in its place. `float(\"15 %\")` says *could not convert string to float*; a discount parser can say what it expected instead.",
      },
      {
        kind: "example",
        title: "A discount code's percentage",
        code: src`
def parse_discount(text):
    cleaned = text.strip().removesuffix("%")
    try:
        percent = float(cleaned)
    except ValueError:
        raise ValueError(f"discount must look like '15%', got {text!r}")
    if not 0 <= percent <= 100:
        raise ValueError(f"discount must be 0-100%, got {percent}")
    return percent / 100

for code in ["15%", " 7.5% ", "half", "120%"]:
    try:
        print(code, "->", parse_discount(code))
    except ValueError as err:
        print(code, "->", err)
`,
        output: "15% -> 0.15\n 7.5%  -> 0.075\nhalf -> discount must look like '15%', got 'half'\n120% -> discount must be 0-100%, got 120.0\n",
        note: "`removesuffix` drops a `%` at the end if there is one. Each rule has its own message, so a support agent can tell a typo from a mistaken amount.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a function receives a value it can't sensibly work with. **Mistakes to avoid:** returning a magic value (`-1`, `\"\"`) that the caller forgets to check; a message such as `\"invalid\"` that says nothing; and `raise ValueError` without a message at all.",
      },
    ],
    tryIt: {
      id: "try",
      title: "No negative prices",
      prompt: "`checked_price` lets a negative price through. Make it raise `ValueError` with the message `price can't be negative, got <price>` instead.",
      spec: [
        ["Function", "`checked_price(price)`"],
        ["Returns", "the price when it is 0 or more; otherwise raises ValueError"],
      ],
      starter: src`
def checked_price(price):
    return price

print(checked_price(6.95))
try:
    print(checked_price(-2.5))
except ValueError as err:
    print("refused:", err)
`,
      answer: src`
def checked_price(price):
    if price < 0:
        raise ValueError(f"price can't be negative, got {price}")
    return price

print(checked_price(6.95))
try:
    print(checked_price(-2.5))
except ValueError as err:
    print("refused:", err)
`,
      wrong: [
        {
          code: src`
def checked_price(price):
    if price < 0:
        return None
    return price
`,
          fails: ["refuses", "message"],
          why: "it returns None instead of raising, so a caller can miss it",
        },
      ],
      hints: ["Test the price before returning it.", "`raise ValueError(...)` stops the function with an error.", "Build the message with an f-string that includes the price."],
      task: {
        checks: [
          fn("refuses", "checked_price", [
            example([6.95], 6.95),
            raisesCase([-2.5], "ValueError"),
            hiddenCase("a free item", [0], 0),
            raisesCase([-0.01], "ValueError", { label: "a tiny negative price" }),
          ], { label: "checked_price() refuses negative prices" }),
          message("message", "The message names the price", "checked_price(-2.5)", "ValueError", "price can't be negative, got -2.5"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A rating, or a precise refusal",
        prompt: "Write `parse_rating(text)` for a review form. Return the rating as an int. Raise `ValueError` with exactly one of these messages: `rating is empty` (the text is empty or only spaces), `rating must be a whole number, got '<text>'` (int can't read it), or `rating must be 1-5, got <n>`.",
        spec: [
          ["Function", "`parse_rating(text)`"],
          ["Returns", "an int from 1 to 5"],
          ["Raises", "ValueError with one of the three messages, checked in that order"],
          ["Example", "`parse_rating(\" 4 \")` → `4`; `parse_rating(\"4.5\")` raises `rating must be a whole number, got '4.5'`"],
        ],
        starter: src`
def parse_rating(text):
    return int(text)

print(parse_rating(" 4 "))
for bad in ["", "4.5", "7"]:
    try:
        parse_rating(bad)
    except ValueError as err:
        print(err)
`,
        answer: src`
def parse_rating(text):
    if text.strip() == "":
        raise ValueError("rating is empty")
    try:
        rating = int(text)
    except ValueError:
        raise ValueError(f"rating must be a whole number, got {text!r}")
    if rating < 1 or rating > 5:
        raise ValueError(f"rating must be 1-5, got {rating}")
    return rating

print(parse_rating(" 4 "))
for bad in ["", "4.5", "7"]:
    try:
        parse_rating(bad)
    except ValueError as err:
        print(err)
`,
        alternatives: [
          src`
def parse_rating(text):
    cleaned = text.strip()
    if not cleaned:
        raise ValueError("rating is empty")
    if not cleaned.lstrip("-").isdigit():
        raise ValueError("rating must be a whole number, got " + repr(text))
    rating = int(cleaned)
    if not 1 <= rating <= 5:
        raise ValueError("rating must be 1-5, got " + str(rating))
    return rating
`,
        ],
        wrong: [
          {
            code: src`
def parse_rating(text):
    rating = int(text)
    if rating < 1 or rating > 5:
        raise ValueError(f"rating must be 1-5, got {rating}")
    return rating
`,
            fails: ["empty", "not-whole"],
            why: "an empty or decimal text gets Python's own message, not the form's",
          },
          {
            code: src`
def parse_rating(text):
    if text.strip() == "":
        raise ValueError("rating is empty")
    try:
        rating = int(text)
    except ValueError:
        raise ValueError(f"rating must be a whole number, got {text!r}")
    if rating < 1 or rating > 5:
        return None
    return rating
`,
            fails: ["values", "range", "range-hidden"],
            why: "an out-of-range rating returns None instead of being refused",
          },
          {
            code: src`
def parse_rating(text):
    if text.strip() == "":
        raise ValueError("rating is empty")
    try:
        rating = int(text)
    except ValueError:
        raise ValueError(f"rating must be a whole number, got {text}")
    if rating < 1 or rating > 5:
        raise ValueError(f"rating must be 1-5, got {rating}")
    return rating
`,
            fails: ["not-whole"],
            why: "without `!r` the bad text loses its quotes, so the message doesn't match",
          },
        ],
        hints: [
          "Three rules, three `raise` lines, checked in the order the spec gives.",
          "Catch the ValueError from `int` and raise your own clearer one in its place.",
          "`{text!r}` inside an f-string shows the text with quotes; the range check uses the converted number.",
        ],
        task: {
          checks: [
            fn("values", "parse_rating", [
              example([" 4 "], 4),
              example(["1"], 1),
              raisesCase(["4.5"], "ValueError"),
              raisesCase(["0"], "ValueError", { label: "zero" }),
              hiddenCase("the top of the range", ["5"], 5),
              raisesCase(["  "], "ValueError", { label: "only spaces" }),
            ], { label: "parse_rating() returns 1-5 or raises ValueError" }),
            message("empty", "An empty rating says so", "parse_rating('')", "ValueError", "rating is empty"),
            message("not-whole", "A decimal rating names the text", "parse_rating('4.5')", "ValueError", "rating must be a whole number, got '4.5'"),
            message("range", "An out-of-range rating names the number", "parse_rating('7')", "ValueError", "rating must be 1-5, got 7"),
            message("range-hidden", "A negative rating names the number", "parse_rating('-2')", "ValueError", "rating must be 1-5, got -2", true),
          ],
        },
      },
      {
        id: "c2",
        title: "Validate an order before shipping",
        prompt: "Write `validate_order(order)`: return the total number of units in the order, or raise `ValueError` for the **first** problem found: `order <id> has no items` when the items list is empty, or `<sku>: quantity must be positive, got <q>` for the first item whose quantity is 0 or less.",
        spec: [
          ["Function", "`validate_order(order)`"],
          ["order", "`{\"order_id\": …, \"items\": [{\"sku\": …, \"qty\": int}, …]}`"],
          ["Returns", "the sum of the quantities"],
          ["Raises", "ValueError with one of the two messages"],
        ],
        starter: src`
def validate_order(order):
    return 0

print(validate_order({"order_id": "O100282", "items": [{"sku": "P0164", "qty": 2}, {"sku": "P0594", "qty": 1}]}))
for bad in [{"order_id": "O100918", "items": []}, {"order_id": "O101219", "items": [{"sku": "P0209", "qty": 3}, {"sku": "P0708", "qty": 0}]}]:
    try:
        validate_order(bad)
    except ValueError as err:
        print(err)
`,
        answer: src`
def validate_order(order):
    if len(order["items"]) == 0:
        raise ValueError(f"order {order['order_id']} has no items")
    units = 0
    for item in order["items"]:
        if item["qty"] <= 0:
            raise ValueError(f"{item['sku']}: quantity must be positive, got {item['qty']}")
        units += item["qty"]
    return units

print(validate_order({"order_id": "O100282", "items": [{"sku": "P0164", "qty": 2}, {"sku": "P0594", "qty": 1}]}))
for bad in [{"order_id": "O100918", "items": []}, {"order_id": "O101219", "items": [{"sku": "P0209", "qty": 3}, {"sku": "P0708", "qty": 0}]}]:
    try:
        validate_order(bad)
    except ValueError as err:
        print(err)
`,
        alternatives: [
          src`
def validate_order(order):
    items = order["items"]
    if not items:
        raise ValueError("order " + order["order_id"] + " has no items")
    for item in items:
        if item["qty"] < 1:
            raise ValueError(item["sku"] + ": quantity must be positive, got " + str(item["qty"]))
    return sum(item["qty"] for item in items)
`,
        ],
        wrong: [
          {
            code: src`
def validate_order(order):
    units = 0
    for item in order["items"]:
        if item["qty"] <= 0:
            raise ValueError(f"{item['sku']}: quantity must be positive, got {item['qty']}")
        units += item["qty"]
    return units
`,
            fails: ["units", "empty"],
            why: "an order with no items returns 0 units instead of being refused",
          },
          {
            code: src`
def validate_order(order):
    if len(order["items"]) == 0:
        raise ValueError(f"order {order['order_id']} has no items")
    units = 0
    for item in order["items"]:
        if item["qty"] < 0:
            raise ValueError(f"{item['sku']}: quantity must be positive, got {item['qty']}")
        units += item["qty"]
    return units
`,
            fails: ["bad-qty", "units"],
            why: "a quantity of 0 is let through",
          },
        ],
        hints: [
          "Check the empty list before the loop; check each item inside it.",
          "Raise as soon as you find a bad item: the first problem is the one reported.",
          "Build each message with an f-string; inside double quotes, use single quotes for the keys.",
        ],
        task: {
          checks: [
            fn("units", "validate_order", [
              example([{ order_id: "O100282", items: [{ sku: "P0164", qty: 2 }, { sku: "P0594", qty: 1 }] }], 3),
              example([{ order_id: "O1", items: [{ sku: "A", qty: 10 }] }], 10),
              raisesCase([{ order_id: "O100918", items: [] }], "ValueError"),
              raisesCase([{ order_id: "O2", items: [{ sku: "B", qty: 1 }, { sku: "C", qty: 0 }] }], "ValueError", { label: "a zero quantity after a good one" }),
            ], { label: "validate_order() totals units or raises ValueError" }),
            message("empty", "An empty order names its ID", "validate_order({'order_id': 'O100918', 'items': []})", "ValueError", "order O100918 has no items"),
            message("bad-qty", "A bad item names its SKU and quantity", "validate_order({'order_id': 'O101219', 'items': [{'sku': 'P0209', 'qty': 3}, {'sku': 'P0708', 'qty': 0}]})", "ValueError", "P0708: quantity must be positive, got 0"),
            message("first-problem", "Only the first bad item is reported", "validate_order({'order_id': 'O9', 'items': [{'sku': 'X1', 'qty': -2}, {'sku': 'X2', 'qty': 0}]})", "ValueError", "X1: quantity must be positive, got -2", true),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def check(age):
    if age < 0:
        raise ValueError(f"age can't be negative: {age}")
    print("checked", age)
    return age

try:
    check(30)
    check(-1)
    check(40)
except ValueError as err:
    print("stopped:", err)
`,
        choices: ["checked 30\nstopped: age can't be negative: -1", "checked 30\nstopped: age can't be negative: -1\nchecked 40", "stopped: age can't be negative: -1", "checked 30\nchecked 40\nstopped: age can't be negative: -1"],
        answer: 0,
        why: "`raise` stops `check(-1)` before its print, and the error jumps out of the `try` block, so `check(40)` is never called.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a function returns -1 for a bad quantity instead of raising. Why is that risky?",
        choices: ["A caller that forgets to check will use -1 as a real quantity", "Python doesn't allow negative return values", "It makes the function slower", "-1 can't be printed"],
        answer: 0,
        why: "A magic return value has to be checked everywhere the function is used. An exception can't be silently ignored: it stops the caller until someone handles it.",
      },
      {
        id: "q3",
        prompt: "Which message helps someone fix a bad CSV the most?",
        choices: ["Price must be a number, got '6,95' (row 14)", "Invalid input", "Error", "ValueError"],
        answer: 0,
        why: "It names the rule, the value and where it was. The others say only that something went wrong.",
      },
    ],
    review: [
      "`raise ValueError(\"…\")` stops the function; the caller handles it like any other error.",
      "A good message names the value and the rule it broke.",
      "Catching a vague error and raising a clearer one is a normal pattern.",
      "Next: your own error types, so callers can tell your problems apart.",
    ],
  },

  // ------------------------------------------------------------------ PY-L18-05 custom exceptions
  {
    id: "PY-L18-05",
    version: 2,
    slug: "your-own-error",
    title: "Your own kinds of error",
    lede: "`class OutOfStock(Exception): pass` makes a new error type. Callers can catch exactly that problem, and nothing else.",
    focus: "Define a minimal error type with class Name(Exception): pass, raise it, and catch it by name.",
    minutes: 18,
    objectives: [
      "Define an error type with `class Name(Exception): pass` and raise it with a message",
      "Catch your own error by name while other errors still escape",
      "Use different error types to choose different responses in a caller",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "string-format", "none-value", "try-except", "except-type", "except-as", "except-many", "raise-stmt", "for-loop", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "tuple-literal", "tuple-unpack", "dict-get", "try-else", "conditional-expr", "conversion", "string-method", "string-slice"],
    teaches: ["class-def"],
    blocks: [
      {
        kind: "text",
        md: "`ValueError` is shared by every library you use. If your stock function raises `ValueError` when an item is sold out, a caller can't tell \"sold out\" from \"someone typed `twelve`\". A **custom error type** gives your problem its own name.\n\nThe pattern is two lines: `class OutOfStock(Exception):` and an indented `pass`. `class` makes a new type; `(Exception)` says it is a kind of error, so it can be raised and caught; `pass` means it needs nothing else. Classes can do much more, and the Classes & Objects module teaches them properly. For errors, this pattern is all you need.",
      },
      {
        kind: "example",
        title: "Sold out has its own name",
        code: src`
class OutOfStock(Exception):
    pass

stock = {"P0164": 3, "P0594": 0}

def reserve(sku, qty):
    if stock[sku] < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, only {stock[sku]} left")
    stock[sku] -= qty

for sku, qty in [("P0164", 2), ("P0594", 1), ("P0164", 5)]:
    try:
        reserve(sku, qty)
        print("reserved", qty, sku)
    except OutOfStock as err:
        print("backorder:", err)
print(stock)
`,
        output: "reserved 2 P0164\nbackorder: P0594: wanted 1, only 0 left\nbackorder: P0164: wanted 5, only 1 left\n{'P0164': 1, 'P0594': 0}\n",
        note: "Raised and caught exactly like a built-in error, with a message, but `except OutOfStock` catches nothing else.",
      },
      {
        kind: "error-example",
        title: "Other errors still escape",
        code: src`
class OutOfStock(Exception):
    pass

stock = {"P0164": 3}

def reserve(sku, qty):
    if stock[sku] < qty:
        raise OutOfStock(f"{sku}: only {stock[sku]} left")
    stock[sku] -= qty

try:
    reserve("P9999", 1)
except OutOfStock as err:
    print("backorder:", err)
`,
        error: "KeyError",
        output: "",
        note: "An unknown SKU raises `KeyError`, not `OutOfStock`, so it isn't mistaken for a backorder: it's a different problem and it stops the program.",
      },
      {
        kind: "text",
        md: "Different error types let one caller respond differently. A feed importer can **skip** a row that is bad, but must **stop** if the file itself is the wrong one. Two error types make that decision readable.",
      },
      {
        kind: "example",
        title: "Skip a row, or stop the import",
        code: src`
class BadRow(Exception):
    pass

class WrongFeed(Exception):
    pass

def read_row(row):
    if "sku" not in row:
        raise WrongFeed("no sku column: is this the price feed?")
    if row["price"] < 0:
        raise BadRow(f"{row['sku']}: negative price {row['price']}")
    return (row["sku"], row["price"])

def import_feed(rows):
    prices = {}
    skipped = []
    for row in rows:
        try:
            sku, price = read_row(row)
        except BadRow as err:
            skipped.append(str(err))
        else:
            prices[sku] = price
    return prices, skipped

print(import_feed([{"sku": "SPO-11681", "price": 7.49}, {"sku": "HOM-22847", "price": -31.0}]))
try:
    import_feed([{"product": "x", "price": 1.0}])
except WrongFeed as err:
    print("import stopped:", err)
`,
        output: "({'SPO-11681': 7.49}, ['HOM-22847: negative price -31.0'])\nimport stopped: no sku column: is this the price feed?\n",
        note: "`import_feed` handles only `BadRow`. `WrongFeed` passes through it to the code that started the import, which is the right place to stop.",
      },
      {
        kind: "text",
        md: "**When to use it:** when callers need to tell your failure apart from Python's own, or from each other. **Mistakes to avoid:** forgetting `(Exception)` (then it can't be raised: `TypeError: exceptions must derive from BaseException`); raising the class with no message; and defining many error types nobody catches separately: one per decision a caller makes is enough.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Declare the error first",
      prompt: "`pay` raises `PaymentDeclined`, but that error type was never defined, so the program stops with NameError. Define it above the function with the two-line pattern.",
      spec: [
        ["Error type", "`PaymentDeclined`, a kind of `Exception`"],
        ["Function", "`pay(balance, amount)` returns the new balance or raises `PaymentDeclined`"],
      ],
      starter: src`
def pay(balance, amount):
    if amount > balance:
        raise PaymentDeclined(f"need {amount}, have {balance}")
    return balance - amount

try:
    print(pay(50, 20))
    print(pay(50, 80))
except PaymentDeclined as err:
    print("declined:", err)
`,
      answer: src`
class PaymentDeclined(Exception):
    pass

def pay(balance, amount):
    if amount > balance:
        raise PaymentDeclined(f"need {amount}, have {balance}")
    return balance - amount

try:
    print(pay(50, 20))
    print(pay(50, 80))
except PaymentDeclined as err:
    print("declined:", err)
`,
      wrong: [
        {
          code: src`
def pay(balance, amount):
    if amount > balance:
        raise ValueError(f"need {amount}, have {balance}")
    return balance - amount
`,
          fails: ["declines"],
          why: "a generic ValueError can't be told apart from a typo in the amount",
        },
      ],
      hints: ["Python has no `PaymentDeclined` until you make one.", "Start the definition with `class`, the new name, and `Exception` in parentheses.", "The body only needs `pass`."],
      task: {
        checks: [
          fn("declines", "pay", [
            example([50, 20], 30),
            raisesCase([50, 80], "PaymentDeclined"),
            hiddenCase("paying the whole balance", [50, 50], 0),
          ], { label: "pay() raises PaymentDeclined when the balance is too low" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Reserve stock, or say it's out",
        prompt: "Define `OutOfStock` (a kind of Exception) and write `reserve(stock, sku, qty)`: if `stock` has at least `qty` of `sku`, subtract it in place and return what is left; otherwise raise `OutOfStock` with the message `<sku>: wanted <qty>, have <n>`. A SKU that isn't in `stock` has 0.",
        spec: [
          ["Error type", "`OutOfStock(Exception)`"],
          ["Function", "`reserve(stock, sku, qty)`, changing `stock` only when the reservation succeeds"],
          ["Returns", "the quantity left"],
          ["Example", "`reserve({\"P0164\": 3}, \"P0164\", 2)` → `1`; `reserve({\"P0164\": 3}, \"P0594\", 1)` raises `P0594: wanted 1, have 0`"],
        ],
        starter: src`
def reserve(stock, sku, qty):
    stock[sku] -= qty
    return stock[sku]

stock = {"P0164": 3}
print(reserve(stock, "P0164", 2))
print(stock)
`,
        answer: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

stock = {"P0164": 3}
print(reserve(stock, "P0164", 2))
print(stock)
`,
        alternatives: [
          src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    if sku not in stock or stock[sku] < qty:
        have = stock[sku] if sku in stock else 0
        raise OutOfStock(sku + ": wanted " + str(qty) + ", have " + str(have))
    stock[sku] -= qty
    return stock[sku]
`,
        ],
        wrong: [
          {
            code: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    stock[sku] = stock.get(sku, 0) - qty
    if stock[sku] < 0:
        raise OutOfStock(f"{sku}: wanted {qty}, have {stock[sku] + qty}")
    return stock[sku]
`,
            fails: ["refused"],
            why: "it subtracts before checking, so a refused reservation still leaves the stock negative",
          },
          {
            code: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    if stock[sku] < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {stock[sku]}")
    stock[sku] -= qty
    return stock[sku]
`,
            fails: ["reserves", "unknown"],
            why: "an unknown SKU raises KeyError instead of OutOfStock",
          },
        ],
        hints: [
          "Define the error type with the two-line pattern before the function.",
          "Read the current quantity with a default of 0, check it, and only then change the dictionary.",
          "Raise with an f-string message built from the SKU, the wanted quantity and what you have.",
        ],
        task: {
          checks: [
            fn("reserves", "reserve", [
              example([{ P0164: 3 }, "P0164", 2], 1),
              example([{ P0164: 3 }, "P0164", 3], 0),
              raisesCase([{ P0164: 3 }, "P0164", 4], "OutOfStock"),
              raisesCase([{ P0164: 3 }, "P0594", 1], "OutOfStock", { label: "a SKU that isn't stocked" }),
            ], { label: "reserve() returns what's left or raises OutOfStock" }),
            fn("stock", "reserve", [
              example([{ P0164: 3, P0594: 1 }, "P0164", 2], 1, { argsAfter: [{ P0164: 1, P0594: 1 }, "P0164", 2] }),
            ], { label: "reserve() takes the quantity out of the stock" }),
            {
              kind: "expr",
              id: "refused",
              label: "A refused reservation leaves the stock as it was",
              hidden: true,
              expr: "_s = {'P0164': 3}\ntry:\n    reserve(_s, 'P0164', 5)\nexcept OutOfStock:\n    pass\nresult = _s",
              expected: py.dict([[py.str("P0164"), py.int(3)]]),
            },
            message("unknown", "The message says how much there is", "reserve({'P0164': 3}, 'P0594', 1)", "OutOfStock", "P0594: wanted 1, have 0"),
          ],
        },
      },
      {
        id: "c2",
        title: "Ship what you can, backorder the rest",
        prompt: "Using your `reserve` and `OutOfStock` from challenge 1 (copy them in), write `fulfil(orders, stock)`: try to reserve each order's `qty` of its `sku`, in order. Return `(shipped, backordered)`: two lists of order IDs. Only `OutOfStock` means backorder; any other error (for example an order with no `qty`) must escape.",
        spec: [
          ["Function", "`fulfil(orders, stock)`"],
          ["orders", "dictionaries with `order_id`, `sku` and `qty`"],
          ["Returns", "a tuple `(shipped order IDs, backordered order IDs)`; `stock` is reduced for every shipped order"],
        ],
        starter: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

def fulfil(orders, stock):
    return ([], [])

stock = {"P0164": 3, "P0594": 1}
orders = [
    {"order_id": "O100282", "sku": "P0164", "qty": 2},
    {"order_id": "O100918", "sku": "P0594", "qty": 2},
    {"order_id": "O101219", "sku": "P0164", "qty": 1},
    {"order_id": "O101723", "sku": "P0164", "qty": 1},
]
print(fulfil(orders, stock))
print(stock)
`,
        answer: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

def fulfil(orders, stock):
    shipped = []
    backordered = []
    for order in orders:
        try:
            reserve(stock, order["sku"], order["qty"])
        except OutOfStock:
            backordered.append(order["order_id"])
        else:
            shipped.append(order["order_id"])
    return (shipped, backordered)

stock = {"P0164": 3, "P0594": 1}
orders = [
    {"order_id": "O100282", "sku": "P0164", "qty": 2},
    {"order_id": "O100918", "sku": "P0594", "qty": 2},
    {"order_id": "O101219", "sku": "P0164", "qty": 1},
    {"order_id": "O101723", "sku": "P0164", "qty": 1},
]
print(fulfil(orders, stock))
print(stock)
`,
        alternatives: [
          src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

def fulfil(orders, stock):
    shipped, backordered = [], []
    for order in orders:
        target = shipped
        try:
            reserve(stock, order["sku"], order["qty"])
        except OutOfStock:
            target = backordered
        target.append(order["order_id"])
    return shipped, backordered
`,
        ],
        wrong: [
          {
            code: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

def fulfil(orders, stock):
    shipped = []
    backordered = []
    for order in orders:
        try:
            reserve(stock, order["sku"], order["qty"])
            shipped.append(order["order_id"])
        except Exception:
            backordered.append(order["order_id"])
    return (shipped, backordered)
`,
            fails: ["escapes"],
            why: "catching every Exception turns a broken order into a backorder",
          },
          {
            code: src`
class OutOfStock(Exception):
    pass

def reserve(stock, sku, qty):
    have = stock.get(sku, 0)
    if have < qty:
        raise OutOfStock(f"{sku}: wanted {qty}, have {have}")
    stock[sku] = have - qty
    return stock[sku]

def fulfil(orders, stock):
    shipped = []
    backordered = []
    try:
        for order in orders:
            reserve(stock, order["sku"], order["qty"])
            shipped.append(order["order_id"])
    except OutOfStock:
        backordered.append(order["order_id"])
    return (shipped, backordered)
`,
            fails: ["returns"],
            why: "the first backorder ends the whole loop, so later orders are never tried",
          },
        ],
        hints: [
          "One `try` per order, inside the loop, so one shortage doesn't stop the rest.",
          "Catch only `OutOfStock`; anything else should keep going up to the caller.",
          "Append the ID to the shipped list only when the reservation succeeded.",
        ],
        task: {
          checks: [
            fn("returns", "fulfil", [
              example([[
                { order_id: "O100282", sku: "P0164", qty: 2 },
                { order_id: "O100918", sku: "P0594", qty: 2 },
                { order_id: "O101219", sku: "P0164", qty: 1 },
                { order_id: "O101723", sku: "P0164", qty: 1 },
              ], { P0164: 3, P0594: 1 }], py.tuple(py.list(py.str("O100282"), py.str("O101219")), py.list(py.str("O100918"), py.str("O101723")))),
              example([[], { A: 1 }], py.tuple(py.list(), py.list())),
              hiddenCase("an order for a SKU with no stock record", [[{ order_id: "O1", sku: "Z", qty: 1 }], { A: 5 }], py.tuple(py.list(), py.list(py.str("O1")))),
              hiddenCase("a big order refused, a small one shipped", [[{ order_id: "O1", sku: "A", qty: 9 }, { order_id: "O2", sku: "A", qty: 2 }], { A: 5 }], py.tuple(py.list(py.str("O2")), py.list(py.str("O1")))),
            ], { label: "fulfil() ships what it can and backorders the rest" }),
            {
              kind: "expr",
              id: "escapes",
              label: "An order with a missing field is not treated as a backorder",
              hidden: true,
              expr: "try:\n    fulfil([{'order_id': 'O9', 'sku': 'A'}], {'A': 3})\n    result = 'no error'\nexcept KeyError:\n    result = 'KeyError escaped'",
              expected: py.str("KeyError escaped"),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class InvalidCoupon(Exception):
    pass

def apply(code):
    if not code.startswith("SAVE"):
        raise InvalidCoupon(f"unknown coupon {code}")
    return int(code[4:])

for code in ["SAVE10", "FREE", "SAVEX"]:
    try:
        print(apply(code))
    except InvalidCoupon as err:
        print(err)
    except ValueError:
        print("bad amount")
`,
        choices: ["10\nunknown coupon FREE\nbad amount", "10\nunknown coupon FREE\nunknown coupon SAVEX", "10\nbad amount\nbad amount", "10\nunknown coupon FREE"],
        answer: 0,
        why: "\"FREE\" fails your own check. \"SAVEX\" passes it, then `int(\"X\")` raises a ValueError, which the second clause handles.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `class OutOfStock: pass` without `(Exception)`. What happens at `raise OutOfStock(\"sold out\")`?",
        choices: ["TypeError: exceptions must derive from BaseException", "It raises OutOfStock as usual", "It prints sold out", "Nothing: raise is ignored"],
        answer: 0,
        why: "Only error types can be raised. `(Exception)` is what makes the new class an error type.",
      },
      {
        id: "q3",
        prompt: "When is a custom error type worth adding?",
        choices: ["When a caller needs to react to your failure differently from other errors", "Whenever a function has an if statement", "To make error messages longer", "Instead of ever using ValueError"],
        answer: 0,
        why: "Its value is the name a caller can catch. If nobody would catch it separately, a ValueError with a clear message is enough.",
      },
    ],
    review: [
      "`class Name(Exception): pass` makes an error type; raise it with a message like any other.",
      "`except Name:` catches exactly your problem; everything else still escapes.",
      "Separate types let callers choose: skip a bad row, stop on a wrong file.",
      "Next module: files. Opening, reading and writing them is where these errors meet real data.",
    ],
  },
];
