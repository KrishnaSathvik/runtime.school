/**
 * M18 practice: ten independent problems on exceptions and validation (PY-L18-01 … PY-L18-05).
 *
 * Mix: 3 function implementations (one with your own error types), 1 integration (a retry wrapper around a flaky call), 2 debugging (a bare except
 * hiding a typo; a broad clause placed before the specific ones), 2 validation, 1 data transformation, 1 output
 * prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures come from D02 (Online Retail II text values), R01 (Runtime Market payments and coupons) and weather
 * station readings. Functions are graded by calling them on public and hidden inputs, by the exact exception type a
 * call raises, and by message text where the message is the point. The only bare `except:` in this module is the
 * broken starter of PY-Q18-03, which the learner removes.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expr check that calls `call` and returns the message of the `kind` error it raises (None if it doesn't raise). */
const message = (id: string, label: string, call: string, kind: string, expected: string, hidden = false) => ({
  kind: "expr" as const,
  id,
  label,
  ...(hidden ? { hidden: true } : {}),
  expr: `try:\n    ${call}\n    result = None\nexcept ${kind} as _e:\n    result = str(_e)`,
  expected: py.str(expected),
});

const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "if-statement", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent", "try-except", "except-type"] as const;

const coupons = () => ({
  SPRING10: { uses_left: 2, expires: "2025-05-31" },
  WELCOME: { uses_left: 1, expires: "2026-12-31" },
  VIP: { uses_left: 0, expires: "2026-12-31" },
});

export const m18Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q18-02",
    version: 2,
    slug: "read-a-money-amount",
    title: "Read a money amount from a spreadsheet",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "string-method", "conversion", "none-value", "print-several", "print-text", "reassignment", "string-slice", "truthiness"],
    prompt: "A finance spreadsheet exports amounts as text such as `\"$1,234.50\"`. Before totals can be added up, each one must become a number, and the ones that can't be read must be marked rather than guessed.",
    spec: [
      ["Function", "`parse_money(text)`"],
      ["Cleaning", "remove spaces at the ends, then one leading `$` if present, then every comma"],
      ["Returns", "the amount as a float, or `None` when the cleaned text isn't a number"],
    ],
    hiddenKinds: ["an amount with spaces around it", "two decimal points", "a dollar sign on its own", "an empty cell", "a negative amount"],
    hints: [
      "Clean the text first with string methods, then try the conversion.",
      "`float` raises ValueError when the text isn't a number; that is the one error to catch.",
      "When the conversion fails, the handler for ValueError returns None.",
    ],
    explanation: "Strip, drop a leading `$` (`removeprefix` or a `startswith` test and a slice), drop commas with `replace`, then `float` inside `try`. Catching ValueError and returning None marks the bad cell without inventing a value; returning 0 would silently undercount the total.",
    code: {
      starter: src`
def parse_money(text):
    return float(text)

for cell in ["$1,234.50", "12.93", "N/A"]:
    print(parse_money(cell))
`,
      answer: src`
def parse_money(text):
    cleaned = text.strip().removeprefix("$").replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None

for cell in ["$1,234.50", "12.93", "N/A"]:
    print(parse_money(cell))
`,
      alternatives: [
        src`
def parse_money(text):
    text = text.strip()
    if text.startswith("$"):
        text = text[1:]
    try:
        amount = float(text.replace(",", ""))
    except ValueError:
        amount = None
    return amount
`,
      ],
      wrong: [
        {
          code: src`
def parse_money(text):
    try:
        return float(text.replace(",", ""))
    except ValueError:
        return None
`,
          fails: ["returns"],
          why: "the dollar sign is never removed, so `$12.00` can't be read",
        },
        {
          code: src`
def parse_money(text):
    cleaned = text.strip().removeprefix("$").replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0
`,
          fails: ["returns"],
          why: "an unreadable cell becomes 0.0, which looks like a real amount",
        },
        {
          code: src`
def parse_money(text):
    cleaned = text.strip().removeprefix("$").replace(",", "")
    if cleaned.isdigit():
        return float(cleaned)
    return None
`,
          fails: ["returns"],
          why: "`isdigit` is False for any amount with cents, so most amounts are rejected",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_money", [
            example(["$1,234.50"], 1234.5),
            example(["12.93"], 12.93),
            example(["N/A"], null),
            hiddenCase("an amount with spaces around it", ["  $0.99 "], 0.99),
            hiddenCase("two decimal points", ["1.2.3"], null),
            hiddenCase("a dollar sign on its own", ["$"], null),
            hiddenCase("an empty cell", [""], null),
            hiddenCase("a negative amount", ["-35.40"], -35.4),
          ], { label: "parse_money() reads an amount or returns None" }),
        ],
      },
    },
  },
  {
    id: "PY-Q18-03",
    version: 2,
    slug: "delay-always-zero",
    title: "The delay that is always zero",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "arithmetic", "len-call", "print-several", "print-text", "reassignment", "aggregate-call", "comparison"],
    prompt: "The flights dashboard shows an average departure delay of 0 minutes for every airport, even on stormy days. `average_delay` should return the mean of the delays, and 0 only when there are no flights. Fix it, and make sure the next typo can't hide the same way.",
    spec: [
      ["Function", "`average_delay(delays)`"],
      ["delays", "a list of departure delays in minutes (negative means early)"],
      ["Returns", "the mean delay, or `0` for an empty list"],
      ["Rule", "handle only the error an empty list really causes"],
    ],
    hiddenKinds: ["early departures", "a single flight", "no flights"],
    hints: [
      "Remove the `try` for a moment and run it: what error does Python report?",
      "A bare `except:` catches every error, including a misspelt name, and turns it into 0.",
      "Fix the name, then catch only the error that dividing by an empty list's length raises.",
    ],
    explanation: "`totl` is a typo, so every call raised `NameError`, and the bare `except:` turned that into 0. Fixing the name makes the mean correct; replacing `except:` with `except ZeroDivisionError:` keeps the empty-list rule while letting any future bug surface instead of being reported as \"no delay\".",
    code: {
      starter: src`
def average_delay(delays):
    total = 0
    for delay in delays:
        total += delay
    try:
        return totl / len(delays)
    except:
        return 0

print(average_delay([-4, 12, -1, 35]))
print(average_delay([]))
`,
      answer: src`
def average_delay(delays):
    total = 0
    for delay in delays:
        total += delay
    try:
        return total / len(delays)
    except ZeroDivisionError:
        return 0

print(average_delay([-4, 12, -1, 35]))
print(average_delay([]))
`,
      alternatives: [
        src`
def average_delay(delays):
    if len(delays) == 0:
        return 0
    return sum(delays) / len(delays)
`,
      ],
      wrong: [
        {
          code: src`
def average_delay(delays):
    total = 0
    for delay in delays:
        total += delay
    try:
        return total / len(delays)
    except:
        return 0
`,
          fails: ["specific"],
          why: "the answer is right now, but the bare `except:` would hide the next typo just the same",
        },
        {
          code: src`
def average_delay(delays):
    total = 0
    for delay in delays:
        total += delay
    try:
        return total / len(delays)
    except ValueError:
        return 0
`,
          fails: ["returns"],
          why: "an empty list raises ZeroDivisionError, not ValueError, so it crashes",
        },
      ],
      task: {
        checks: [
          fn("returns", "average_delay", [
            example([[-4, 12, -1, 35]], 10.5),
            example([[0, 30]], py.float(15)),
            example([[]], 0),
            hiddenCase("early departures", [[-4, -1, -7]], -4),
            hiddenCase("a single flight", [[49]], py.float(49)),
          ], { label: "average_delay() returns the mean delay", compare: { numbers: "int-float-equal" } }),
          {
            kind: "expr",
            id: "specific",
            label: "Every except clause names the error it handles",
            expr: "import ast as _ast\nresult = all(_n.type is not None for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.ExceptHandler))",
            expected: py.bool(true),
            tip: "A bare `except:` catches typos too. Name the error an empty list causes.",
          },
        ],
      },
    },
  },
  {
    id: "PY-Q18-06",
    version: 2,
    slug: "payments-that-dont-add-up",
    title: "Payments that can't be booked",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "conversion", "comparison", "else-clause", "print-several", "dict-iterate", "tuple-unpack", "continue-statement", "identity", "logical", "none-value"],
    prompt: "Runtime Market's payment export has an `amount` column typed as text. Before booking, finance wants every payment that can't be booked, with the reason.",
    spec: [
      ["Function", "`invalid_amounts(payments)`"],
      ["payments", "dictionaries with `payment_id` and a text `amount`"],
      ["Returns", "`{payment_id: reason}` for each bad payment, in order: `\"not a number\"` when `float` can't read the amount, `\"not positive\"` when it is 0 or less"],
      ["Rules", "good payments don't appear; refunds are a separate export, so a negative amount here is a mistake"],
    ],
    hiddenKinds: ["a zero amount", "an amount with spaces", "only good payments", "no payments"],
    hints: [
      "Two different failures: the text isn't a number (an exception), or the number breaks a rule (an `if`).",
      "Only test the size of the amount after the conversion worked.",
      "Store the reason under the payment's ID in a dictionary.",
    ],
    explanation: "Convert inside `try`; on ValueError record \"not a number\" and move on. Only a successful conversion reaches the `<= 0` test. Recording both reasons from one test (or skipping the range test) gives the wrong reason, and `isdigit` would reject every amount with cents.",
    code: {
      starter: src`
def invalid_amounts(payments):
    problems = {}
    return problems

payments = [
    {"payment_id": "PAY0000045", "amount": "12.93"},
    {"payment_id": "PAY0000416", "amount": "ninety"},
    {"payment_id": "PAY0001357", "amount": "-71.14"},
    {"payment_id": "PAY0001503", "amount": "1,234.00"},
]
print(invalid_amounts(payments))
`,
      answer: src`
def invalid_amounts(payments):
    problems = {}
    for payment in payments:
        try:
            amount = float(payment["amount"])
        except ValueError:
            problems[payment["payment_id"]] = "not a number"
            continue
        if amount <= 0:
            problems[payment["payment_id"]] = "not positive"
    return problems

payments = [
    {"payment_id": "PAY0000045", "amount": "12.93"},
    {"payment_id": "PAY0000416", "amount": "ninety"},
    {"payment_id": "PAY0001357", "amount": "-71.14"},
    {"payment_id": "PAY0001503", "amount": "1,234.00"},
]
print(invalid_amounts(payments))
`,
      alternatives: [
        src`
def reason(text):
    try:
        value = float(text)
    except ValueError:
        return "not a number"
    if value > 0:
        return None
    return "not positive"

def invalid_amounts(payments):
    problems = {}
    for payment in payments:
        why = reason(payment["amount"])
        if why is not None:
            problems[payment["payment_id"]] = why
    return problems
`,
      ],
      wrong: [
        {
          code: src`
def invalid_amounts(payments):
    problems = {}
    for payment in payments:
        try:
            amount = float(payment["amount"])
        except ValueError:
            problems[payment["payment_id"]] = "not a number"
            continue
        if amount < 0:
            problems[payment["payment_id"]] = "not positive"
    return problems
`,
          fails: ["returns"],
          why: "a payment of exactly 0 is let through",
        },
        {
          code: src`
def invalid_amounts(payments):
    problems = {}
    for payment in payments:
        try:
            if float(payment["amount"]) <= 0:
                problems[payment["payment_id"]] = "not a number"
        except ValueError:
            problems[payment["payment_id"]] = "not a number"
    return problems
`,
          fails: ["returns"],
          why: "every problem is reported as \"not a number\", so a negative amount gets the wrong reason",
        },
      ],
      task: {
        checks: [
          fn("returns", "invalid_amounts", [
            example([[
              { payment_id: "PAY0000045", amount: "12.93" },
              { payment_id: "PAY0000416", amount: "ninety" },
              { payment_id: "PAY0001357", amount: "-71.14" },
              { payment_id: "PAY0001503", amount: "1,234.00" },
            ]], { PAY0000416: "not a number", PAY0001357: "not positive", PAY0001503: "not a number" }),
            example([[{ payment_id: "P1", amount: "5" }]], {}),
            example([[{ payment_id: "P2", amount: "" }]], { P2: "not a number" }),
            hiddenCase("a zero amount", [[{ payment_id: "P3", amount: "0.00" }]], { P3: "not positive" }),
            hiddenCase("an amount with spaces", [[{ payment_id: "P4", amount: " 66.49 " }]], {}),
            hiddenCase("only good payments", [[{ payment_id: "A", amount: "1" }, { payment_id: "B", amount: "0.01" }]], {}),
            hiddenCase("no payments", [[]], {}),
          ], { label: "invalid_amounts() gives the reason for each bad payment" }),
        ],
      },
    },
  },
  {
    id: "PY-Q18-10",
    version: 2,
    slug: "opening-hours",
    title: "Opening hours that make sense",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: [...fnBase, "except-as", "raise-stmt", "string-split", "string-format", "conversion", "comparison", "logical", "arithmetic", "len-call", "else-clause", "print-several", "print-text", "tuple-unpack", "precedence"],
    prompt: "Store managers type opening times into a form as `HH:MM`. Convert a time to minutes after midnight, and refuse anything that isn't a real time with a message the manager can act on.",
    spec: [
      ["Function", "`to_minutes(text)`"],
      ["Returns", "hours × 60 + minutes, e.g. `\"09:35\"` → `575`"],
      ["Raises ValueError", "`time must look like HH:MM, got '<text>'` when there isn't exactly one `:` or either side isn't a whole number; `hour must be 0-23, got <h>`; `minute must be 0-59, got <m>`"],
      ["Order", "check the shape first, then the hour, then the minute"],
    ],
    hiddenKinds: ["midnight", "one minute before midnight", "a minute of 60", "a dot instead of a colon", "two colons", "words instead of numbers"],
    hints: [
      "`split(\":\")` must give exactly two pieces, and both must convert with `int`.",
      "If `int` fails, catch its ValueError and raise your own with the shape message.",
      "Check the hour range, then the minute range, each with its own message.",
    ],
    explanation: "Split on `:` and check there are two parts; convert both inside `try` and turn any ValueError into the shape message. Then range-check the hour (0-23) and the minute (0-59) separately so the message names what is wrong. Letting `int`'s own message through would say `invalid literal for int()`, which a store manager can't act on.",
    code: {
      starter: src`
def to_minutes(text):
    return 0

print(to_minutes("09:35"))
for bad in ["9.35", "24:00", "07:75"]:
    try:
        to_minutes(bad)
    except ValueError as err:
        print(err)
`,
      answer: src`
def to_minutes(text):
    parts = text.split(":")
    if len(parts) != 2:
        raise ValueError(f"time must look like HH:MM, got {text!r}")
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        raise ValueError(f"time must look like HH:MM, got {text!r}")
    if not 0 <= hour <= 23:
        raise ValueError(f"hour must be 0-23, got {hour}")
    if not 0 <= minute <= 59:
        raise ValueError(f"minute must be 0-59, got {minute}")
    return hour * 60 + minute

print(to_minutes("09:35"))
for bad in ["9.35", "24:00", "07:75"]:
    try:
        to_minutes(bad)
    except ValueError as err:
        print(err)
`,
      alternatives: [
        src`
def to_minutes(text):
    shape = "time must look like HH:MM, got " + repr(text)
    try:
        hour_text, minute_text = text.split(":")
        hour, minute = int(hour_text), int(minute_text)
    except ValueError:
        raise ValueError(shape)
    if hour < 0 or hour > 23:
        raise ValueError("hour must be 0-23, got " + str(hour))
    if minute < 0 or minute > 59:
        raise ValueError("minute must be 0-59, got " + str(minute))
    return hour * 60 + minute
`,
      ],
      wrong: [
        {
          code: src`
def to_minutes(text):
    hour, minute = text.split(":")
    hour = int(hour)
    minute = int(minute)
    if not 0 <= hour <= 23:
        raise ValueError(f"hour must be 0-23, got {hour}")
    if not 0 <= minute <= 59:
        raise ValueError(f"minute must be 0-59, got {minute}")
    return hour * 60 + minute
`,
          fails: ["shape", "shape-hidden", "words-hidden"],
          why: "a badly shaped time gets Python's own message about unpacking or int(), not the form's",
        },
        {
          code: src`
def to_minutes(text):
    parts = text.split(":")
    if len(parts) != 2:
        raise ValueError(f"time must look like HH:MM, got {text!r}")
    try:
        hour = int(parts[0])
        minute = int(parts[1])
    except ValueError:
        raise ValueError(f"time must look like HH:MM, got {text!r}")
    if not 0 <= hour <= 24:
        raise ValueError(f"hour must be 0-23, got {hour}")
    if not 0 <= minute <= 60:
        raise ValueError(f"minute must be 0-59, got {minute}")
    return hour * 60 + minute
`,
          fails: ["minutes", "hour"],
          why: "the ranges are one too wide, so 24:00 and 07:60 are accepted",
        },
      ],
      task: {
        checks: [
          fn("minutes", "to_minutes", [
            example(["09:35"], 575),
            example(["17:00"], 1020),
            raisesCase(["24:00"], "ValueError"),
            hiddenCase("midnight", ["00:00"], 0),
            hiddenCase("one minute before midnight", ["23:59"], 1439),
            raisesCase(["07:60"], "ValueError", { label: "a minute of 60" }),
          ], { label: "to_minutes() converts real times and refuses others" }),
          message("shape", "A dot instead of a colon gets the shape message", "to_minutes('9.35')", "ValueError", "time must look like HH:MM, got '9.35'"),
          message("hour", "An impossible hour is named", "to_minutes('24:00')", "ValueError", "hour must be 0-23, got 24"),
          message("minute", "An impossible minute is named", "to_minutes('07:75')", "ValueError", "minute must be 0-59, got 75"),
          message("shape-hidden", "Two colons get the shape message", "to_minutes('1:2:3')", "ValueError", "time must look like HH:MM, got '1:2:3'", true),
          message("words-hidden", "Words get the shape message", "to_minutes('noon:00')", "ValueError", "time must look like HH:MM, got 'noon:00'", true),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q18-12",
    version: 2,
    slug: "finally-counts-every-call",
    title: "Every call counted",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["function-def", "function-param", "function-return", "assignment", "dict-literal", "dict-lookup", "string-index", "string-format", "arithmetic", "comparison", "if-statement", "try-except", "except-type", "except-as", "raise-stmt", "finally-clause", "print-call", "print-several", "unquoted-name", "top-level-indent", "reassignment"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Work through the three calls in order, keeping track of `left` and `calls` after each.",
      "When `raise` runs, the rest of the `try` block is skipped and the `except` block returns its message.",
      "`finally` runs on the way out of every call, even one that returns from `try` or `except`.",
    ],
    explanation: "Call 1 takes 3 (left 2) and returns \"ok\". Call 2 asks for 3 with only 2 left, so the raise jumps to `except`, which returns the message. Call 3 takes 2 (left 0). `finally` adds 1 to `calls` on each of the three exits, so `calls` is 3.",
    predict: {
      program: src`
def take(stock, n):
    try:
        if n > stock["left"]:
            raise ValueError(f"only {stock['left']} left")
        stock["left"] -= n
        return "ok"
    except ValueError as err:
        return f"no ({err})"
    finally:
        stock["calls"] += 1

stock = {"left": 5, "calls": 0}
print(take(stock, 3), take(stock, 3), take(stock, 2))
print(stock)
`,
      output: "ok no (only 2 left) ok\n{'left': 0, 'calls': 3}\n",
      wrongPredictions: [
        "ok no (only 2 left) ok\n{'left': 0, 'calls': 2}",
        "ok no (only 5 left) ok\n{'left': 0, 'calls': 3}",
        "ok no (only 2 left) no (only 2 left)\n{'left': 2, 'calls': 3}",
        "ok ok ok\n{'left': -3, 'calls': 3}",
      ],
    },
  },
  {
    id: "PY-Q18-13",
    version: 2,
    slug: "every-problem-unexpected",
    title: "Every problem is \"unexpected\"",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "except-as", "except-many", "conversion", "string-format", "enumerate-call", "tuple-literal", "tuple-unpack", "print-several", "dict-iterate", "arithmetic", "else-clause"],
    prompt: "`load_prices` should say *why* each bad row was skipped, but the report says `unexpected problem` for every one of them, so nobody can fix the feed. Fix the handlers so missing columns and bad numbers get their own messages, while anything else is still reported as unexpected.",
    spec: [
      ["Function", "`load_prices(rows)`"],
      ["Returns", "`(prices, problems)`: `{stock_code: float price}` for good rows, and a list of `\"row <n>: …\"` texts numbered from 1"],
      ["Messages", "`missing <column>` for a KeyError, `bad number <message>` for a ValueError, `unexpected problem` for anything else"],
      ["Keep", "the function name, the messages and what it returns; only the bug should change"],
    ],
    hiddenKinds: ["a missing price column", "a price that is None", "a row with no stock code", "only good rows"],
    hints: [
      "Which `except` clause runs for a ValueError? Python tries them top to bottom.",
      "`Exception` matches KeyError and ValueError too, so a clause naming it catches them first.",
      "Keep the broad clause as the last resort, after the specific ones.",
    ],
    explanation: "Handlers are tried in order and the first match wins. `except Exception` came first, and every error is an Exception, so the specific clauses never ran. Moving it to the end restores the specific messages while still catching surprises such as `float(None)` (a TypeError). Deleting the broad clause instead would let that TypeError crash the whole import.",
    code: {
      starter: src`
def load_prices(rows):
    prices = {}
    problems = []
    for number, row in enumerate(rows, start=1):
        try:
            prices[row["StockCode"]] = float(row["Price"])
        except Exception:
            problems.append(f"row {number}: unexpected problem")
        except KeyError as err:
            problems.append(f"row {number}: missing {err.args[0]}")
        except ValueError as err:
            problems.append(f"row {number}: bad number {err}")
    return (prices, problems)

rows = [
    {"StockCode": "85048", "Price": "6.95"},
    {"StockCode": "22350", "Price": "2,55"},
    {"StockCode": "22087"},
]
print(load_prices(rows))
`,
      answer: src`
def load_prices(rows):
    prices = {}
    problems = []
    for number, row in enumerate(rows, start=1):
        try:
            prices[row["StockCode"]] = float(row["Price"])
        except KeyError as err:
            problems.append(f"row {number}: missing {err.args[0]}")
        except ValueError as err:
            problems.append(f"row {number}: bad number {err}")
        except Exception:
            problems.append(f"row {number}: unexpected problem")
    return (prices, problems)

rows = [
    {"StockCode": "85048", "Price": "6.95"},
    {"StockCode": "22350", "Price": "2,55"},
    {"StockCode": "22087"},
]
print(load_prices(rows))
`,
      alternatives: [
        src`
def load_prices(rows):
    prices = {}
    problems = []
    number = 0
    for row in rows:
        number += 1
        try:
            code = row["StockCode"]
            price = float(row["Price"])
        except KeyError as err:
            problems.append("row " + str(number) + ": missing " + err.args[0])
        except ValueError as err:
            problems.append("row " + str(number) + ": bad number " + str(err))
        except Exception:
            problems.append("row " + str(number) + ": unexpected problem")
        else:
            prices[code] = price
    return prices, problems
`,
      ],
      wrong: [
        {
          code: src`
def load_prices(rows):
    prices = {}
    problems = []
    for number, row in enumerate(rows, start=1):
        try:
            prices[row["StockCode"]] = float(row["Price"])
        except KeyError as err:
            problems.append(f"row {number}: missing {err.args[0]}")
        except ValueError as err:
            problems.append(f"row {number}: bad number {err}")
    return (prices, problems)
`,
          fails: ["returns"],
          why: "without the last-resort clause, a price of None crashes the whole import",
        },
        {
          code: src`
def load_prices(rows):
    prices = {}
    problems = []
    for number, row in enumerate(rows, start=1):
        try:
            prices[row["StockCode"]] = float(row["Price"])
        except KeyError as err:
            problems.append(f"row {number}: missing {err.args[0]}")
        except Exception:
            problems.append(f"row {number}: unexpected problem")
        except ValueError as err:
            problems.append(f"row {number}: bad number {err}")
    return (prices, problems)
`,
          fails: ["returns"],
          why: "the broad clause still sits above the ValueError clause, so bad numbers are still \"unexpected\"",
        },
      ],
      task: {
        checks: [
          fn("returns", "load_prices", [
            example([[{ StockCode: "85048", Price: "6.95" }, { StockCode: "22350", Price: "2,55" }, { StockCode: "22087" }]],
              py.tuple(py.dict([[py.str("85048"), py.float(6.95)]]), py.list(py.str("row 2: bad number could not convert string to float: '2,55'"), py.str("row 3: missing Price")))),
            example([[{ StockCode: "21329", Price: "0.98" }]], py.tuple(py.dict([[py.str("21329"), py.float(0.98)]]), py.list())),
            example([[]], py.tuple(py.dict([]), py.list())),
            hiddenCase("a price that is None", [[{ StockCode: "A", Price: null }, { StockCode: "B", Price: "1.5" }]], py.tuple(py.dict([[py.str("B"), py.float(1.5)]]), py.list(py.str("row 1: unexpected problem")))),
            hiddenCase("a row with no stock code", [[{ Price: "2.00" }]], py.tuple(py.dict([]), py.list(py.str("row 1: missing StockCode")))),
            hiddenCase("only good rows", [[{ StockCode: "A", Price: "1" }, { StockCode: "B", Price: "2.5" }]], py.tuple(py.dict([[py.str("A"), py.float(1)], [py.str("B"), py.float(2.5)]]), py.list())),
          ], { label: "load_prices() names each problem" }),
        ],
      },
    },
  },
  {
    id: "PY-Q18-16",
    version: 2,
    slug: "station-readings",
    title: "Weather station readings with an error log",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "except-as", "string-split", "string-method", "string-format", "conversion", "tuple-unpack", "enumerate-call", "else-clause", "print-several", "dict-iterate", "dict-group", "try-else", "arithmetic", "continue-statement", "dict-get", "logical"],
    prompt: "Weather stations upload one reading per line: `date,station,temperature`. Group the temperatures by station, and keep a log of the lines that couldn't be read, with Python's own message, so the station operator can see what was wrong.",
    spec: [
      ["Function", "`readings_by_station(lines)`"],
      ["lines", "texts like `\"2025-01-10,KSEA,7.5\"`; spaces around fields should be ignored"],
      ["Returns", "`(by_station, log)`: `{station: [temperatures as floats]}` in first-seen order, and `[\"line <n>: <error message>\"]` numbered from 1"],
      ["Bad lines", "a line that doesn't split into exactly three fields, or whose temperature isn't a number: both raise ValueError somewhere"],
    ],
    hiddenKinds: ["a line with too few fields", "a temperature with spaces", "a station with several readings", "no lines"],
    hints: [
      "Unpacking a split line into three names raises ValueError when the count is wrong; so does `float`.",
      "Put both risky steps in one `try`, and keep the error with `as err` for the log.",
      "Group only in the success path: the `else` block, or after a `continue` in the `except`.",
    ],
    explanation: "Two different mistakes, a missing field and a non-number, both raise ValueError, so one `except ValueError as err` logs either with Python's message (`not enough values to unpack (expected 3, got 2)` or `could not convert string to float: …`). Grouping in `else` keeps a half-read line out of the result.",
    code: {
      starter: src`
def readings_by_station(lines):
    by_station = {}
    log = []
    return (by_station, log)

lines = [
    "2025-01-10,KSEA,7.5",
    "2025-01-10,KORD,-3.0",
    "2025-01-10,KSEA",
    "2025-01-11,KSEA, 8.25",
    "2025-01-11,KORD,n/a",
]
print(readings_by_station(lines))
`,
      answer: src`
def readings_by_station(lines):
    by_station = {}
    log = []
    for number, line in enumerate(lines, start=1):
        try:
            date, station, temp = line.split(",")
            value = float(temp)
        except ValueError as err:
            log.append(f"line {number}: {err}")
        else:
            station = station.strip()
            if station not in by_station:
                by_station[station] = []
            by_station[station].append(value)
    return (by_station, log)

lines = [
    "2025-01-10,KSEA,7.5",
    "2025-01-10,KORD,-3.0",
    "2025-01-10,KSEA",
    "2025-01-11,KSEA, 8.25",
    "2025-01-11,KORD,n/a",
]
print(readings_by_station(lines))
`,
      alternatives: [
        src`
def readings_by_station(lines):
    by_station = {}
    log = []
    number = 0
    for line in lines:
        number += 1
        parts = line.split(",")
        try:
            date, station, temp = parts
            value = float(temp)
        except ValueError as err:
            log.append("line " + str(number) + ": " + str(err))
            continue
        by_station[station.strip()] = by_station.get(station.strip(), []) + [value]
    return by_station, log
`,
      ],
      wrong: [
        {
          code: src`
def readings_by_station(lines):
    by_station = {}
    log = []
    for number, line in enumerate(lines, start=1):
        parts = line.split(",")
        try:
            value = float(parts[2])
        except ValueError as err:
            log.append(f"line {number}: {err}")
            continue
        station = parts[1].strip()
        if station not in by_station:
            by_station[station] = []
        by_station[station].append(value)
    return (by_station, log)
`,
          fails: ["returns"],
          why: "a line with too few fields raises IndexError, which nothing catches",
        },
        {
          code: src`
def readings_by_station(lines):
    by_station = {}
    log = []
    for number, line in enumerate(lines, start=1):
        try:
            date, station, temp = line.split(",")
            value = float(temp)
        except ValueError:
            log.append(f"line {number}: bad line")
        else:
            if station not in by_station:
                by_station[station] = []
            by_station[station].append(value)
    return (by_station, log)
`,
          fails: ["returns"],
          why: "the log loses Python's message, so the operator can't tell what was wrong",
        },
      ],
      task: {
        checks: [
          fn("returns", "readings_by_station", [
            example([["2025-01-10,KSEA,7.5", "2025-01-10,KORD,-3.0", "2025-01-10,KSEA", "2025-01-11,KSEA, 8.25", "2025-01-11,KORD,n/a"]],
              py.tuple(py.dict([[py.str("KSEA"), py.list(py.float(7.5), py.float(8.25))], [py.str("KORD"), py.list(py.float(-3))]]),
                py.list(py.str("line 3: not enough values to unpack (expected 3, got 2)"), py.str("line 5: could not convert string to float: 'n/a'")))),
            example([["2025-02-01,KJFK,0"]], py.tuple(py.dict([[py.str("KJFK"), py.list(py.float(0))]]), py.list())),
            example([[]], py.tuple(py.dict([]), py.list())),
            hiddenCase("a line with too few fields", [["KSEA"]], py.tuple(py.dict([]), py.list(py.str("line 1: not enough values to unpack (expected 3, got 1)")))),
            hiddenCase("a station name with spaces", [["2025-01-10, KDEN ,-12.5"]], py.tuple(py.dict([[py.str("KDEN"), py.list(py.float(-12.5))]]), py.list())),
            hiddenCase("a station with several readings", [["d,A,1", "d,B,2", "d,A,3"]], py.tuple(py.dict([[py.str("A"), py.list(py.float(1), py.float(3))], [py.str("B"), py.list(py.float(2))]]), py.list())),
          ], { label: "readings_by_station() groups readings and logs bad lines" }),
        ],
      },
    },
  },
  {
    id: "PY-Q18-19",
    version: 2,
    slug: "redeem-a-coupon",
    title: "Redeem a coupon, or say exactly why not",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: [...fnBase, "except-as", "raise-stmt", "class-def", "comparison", "string-format", "arithmetic", "print-several", "print-text", "tuple-unpack", "dict-get", "none-value", "identity", "logical", "nested-dict"],
    prompt: "The checkout shows a different message for each reason a coupon fails, so `redeem` must say which reason it was by raising a different error type. Define three error types and write `redeem`.",
    spec: [
      ["Error types", "`UnknownCoupon`, `CouponExpired` and `CouponUsedUp`, each a kind of `Exception`"],
      ["Function", "`redeem(coupons, code, today)`; `coupons` maps a code to `{\"uses_left\": int, \"expires\": \"YYYY-MM-DD\"}`; `today` is a `\"YYYY-MM-DD\"` text"],
      ["Checks, in order", "unknown code → `UnknownCoupon`; `today` after `expires` → `CouponExpired` (the expiry day itself is still valid); no uses left → `CouponUsedUp`"],
      ["On success", "subtract one use in place and return the uses left"],
    ],
    hiddenKinds: ["the expiry day itself", "the day after expiry", "a coupon with no uses left", "an expired coupon that also has no uses left", "a failed redemption leaves the uses alone"],
    hints: [
      "Each error type is the two-line `class Name(Exception): pass` pattern.",
      "Dates written as YYYY-MM-DD compare correctly as plain text: `\"2025-06-01\" > \"2025-05-31\"`.",
      "Check in the order given and only change `uses_left` after every check has passed.",
    ],
    explanation: "Three tiny error classes give the checkout three names to catch. The checks run in order (unknown, expired, used up) and raise as soon as one fails; ISO dates compare correctly as text, and `>` keeps the expiry day itself valid. Changing `uses_left` before the checks would spend a use on a failed redemption.",
    code: {
      starter: src`
def redeem(coupons, code, today):
    coupons[code]["uses_left"] -= 1
    return coupons[code]["uses_left"]

coupons = {
    "SPRING10": {"uses_left": 2, "expires": "2025-05-31"},
    "WELCOME": {"uses_left": 1, "expires": "2026-12-31"},
}
print(redeem(coupons, "WELCOME", "2025-06-01"))
`,
      answer: src`
class UnknownCoupon(Exception):
    pass

class CouponExpired(Exception):
    pass

class CouponUsedUp(Exception):
    pass

def redeem(coupons, code, today):
    if code not in coupons:
        raise UnknownCoupon(code)
    coupon = coupons[code]
    if today > coupon["expires"]:
        raise CouponExpired(f"{code} expired on {coupon['expires']}")
    if coupon["uses_left"] <= 0:
        raise CouponUsedUp(code)
    coupon["uses_left"] -= 1
    return coupon["uses_left"]

coupons = {
    "SPRING10": {"uses_left": 2, "expires": "2025-05-31"},
    "WELCOME": {"uses_left": 1, "expires": "2026-12-31"},
}
print(redeem(coupons, "WELCOME", "2025-06-01"))
`,
      alternatives: [
        src`
class UnknownCoupon(Exception):
    pass

class CouponExpired(Exception):
    pass

class CouponUsedUp(Exception):
    pass

def redeem(coupons, code, today):
    coupon = coupons.get(code)
    if coupon is None:
        raise UnknownCoupon("no such coupon: " + code)
    if coupon["expires"] < today:
        raise CouponExpired(code)
    if coupon["uses_left"] < 1:
        raise CouponUsedUp(code)
    coupons[code]["uses_left"] = coupon["uses_left"] - 1
    return coupons[code]["uses_left"]
`,
      ],
      wrong: [
        {
          code: src`
class UnknownCoupon(Exception):
    pass

class CouponExpired(Exception):
    pass

class CouponUsedUp(Exception):
    pass

def redeem(coupons, code, today):
    if code not in coupons:
        raise UnknownCoupon(code)
    coupon = coupons[code]
    if today >= coupon["expires"]:
        raise CouponExpired(code)
    if coupon["uses_left"] <= 0:
        raise CouponUsedUp(code)
    coupon["uses_left"] -= 1
    return coupon["uses_left"]
`,
          fails: ["redeems"],
          why: "`>=` refuses the coupon on its last valid day",
        },
        {
          code: src`
class UnknownCoupon(Exception):
    pass

class CouponExpired(Exception):
    pass

class CouponUsedUp(Exception):
    pass

def redeem(coupons, code, today):
    if code not in coupons:
        raise UnknownCoupon(code)
    coupon = coupons[code]
    coupon["uses_left"] -= 1
    if today > coupon["expires"]:
        raise CouponExpired(code)
    if coupon["uses_left"] < 0:
        raise CouponUsedUp(code)
    return coupon["uses_left"]
`,
          fails: ["unchanged"],
          why: "a use is spent before the checks, so a refused coupon still loses a use",
        },
        {
          code: src`
def redeem(coupons, code, today):
    if code not in coupons or today > coupons[code]["expires"] or coupons[code]["uses_left"] <= 0:
        raise ValueError(code)
    coupons[code]["uses_left"] -= 1
    return coupons[code]["uses_left"]
`,
          fails: ["redeems"],
          why: "one ValueError for every reason leaves the checkout unable to tell them apart",
        },
      ],
      task: {
        checks: [
          fn("redeems", "redeem", [
            example([coupons(), "WELCOME", "2025-06-01"], 0),
            example([coupons(), "SPRING10", "2025-04-02"], 1),
            raisesCase([coupons(), "FREESHIP", "2025-04-02"], "UnknownCoupon"),
            raisesCase([coupons(), "SPRING10", "2025-06-01"], "CouponExpired"),
            raisesCase([coupons(), "VIP", "2025-06-01"], "CouponUsedUp"),
            hiddenCase("the expiry day itself", [coupons(), "SPRING10", "2025-05-31"], 1),
            raisesCase([coupons(), "SPRING10", "2025-12-01"], "CouponExpired", { label: "months later" }),
            raisesCase([{ OLD: { uses_left: 0, expires: "2024-01-01" } }, "OLD", "2025-01-01"], "CouponExpired", { label: "an expired coupon that also has no uses left" }),
          ], { label: "redeem() returns the uses left or raises the right error" }),
          fn("spends", "redeem", [
            example([coupons(), "SPRING10", "2025-04-02"], 1, { argsAfter: [{ ...coupons(), SPRING10: { uses_left: 1, expires: "2025-05-31" } }, "SPRING10", "2025-04-02"] }),
          ], { label: "redeem() spends one use when it succeeds" }),
          {
            kind: "expr",
            id: "unchanged",
            label: "A failed redemption leaves the coupon's uses alone",
            hidden: true,
            expr: "_c = {'SPRING10': {'uses_left': 2, 'expires': '2025-05-31'}}\ntry:\n    redeem(_c, 'SPRING10', '2025-06-01')\nexcept Exception:\n    pass\nresult = _c['SPRING10']['uses_left']",
            expected: py.int(2),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q18-20",
    version: 2,
    slug: "validate-a-signup-form",
    title: "Validate a sign-up form, every field at once",
    format: "validation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "except-as", "raise-stmt", "string-method", "string-find", "string-check", "string-format", "string-slice", "value-count", "conversion", "comparison", "logical", "len-call", "else-clause", "dict-iterate", "tuple-unpack", "print-several", "dict-get", "none-value", "boolean", "print-text", "reassignment", "string-split"],
    prompt: "A sign-up form must show every problem at once, next to the field it belongs to. Write one checker per field that raises `ValueError` with the field's message, then `validate_signup(form)` that runs them all and collects the messages.",
    spec: [
      ["Function", "`validate_signup(form)` returns `{field: message}` for every invalid field, in the order `username`, `email`, `age`; `{}` when all are valid"],
      ["username", "3–20 characters, only letters, digits and `_`: message `username must be 3-20 letters, digits or _`"],
      ["email", "exactly one `@`, with at least one `.` after it and something before it: message `email address is not valid`"],
      ["age", "a whole number from 13 to 120 (text from the form): message `age must be a whole number`, or `age must be 13-120`"],
      ["Missing", "a field missing from `form` counts as the empty text `\"\"`"],
    ],
    hiddenKinds: ["all three fields wrong", "a username with a space", "two @ signs", "an age just under the limit", "a missing field", "a dot only before the @"],
    hints: [
      "Write `check_username`, `check_email` and `check_age`, each raising ValueError with its own message.",
      "In `validate_signup`, call each checker in its own `try`, so one failure doesn't stop the others; store `str(err)` under the field.",
      "For the username, remove the underscores and test what's left with `isalnum()`. For the age, `int` can raise its own ValueError: replace its message with yours.",
    ],
    explanation: "Each field gets a small checker that raises ValueError with the field's message, which keeps the rules readable and testable. The collector calls each checker in its own `try` and records `str(err)` under the field name, so every problem is reported, not just the first. Note the two age messages: a failed `int` is caught and re-raised with the form's wording, and the range is checked separately. `form.get(field, \"\")` treats a missing field as empty.",
    code: {
      starter: src`
def validate_signup(form):
    errors = {}
    return errors

print(validate_signup({"username": "ana_dev", "email": "ana@runtime.school", "age": "34"}))
print(validate_signup({"username": "a!", "email": "ana.runtime.school", "age": "twelve"}))
`,
      answer: src`
def check_username(name):
    if not 3 <= len(name) <= 20 or not name.replace("_", "").isalnum():
        raise ValueError("username must be 3-20 letters, digits or _")

def check_email(email):
    if email.count("@") != 1:
        raise ValueError("email address is not valid")
    local, domain = email.split("@")
    if local == "" or "." not in domain:
        raise ValueError("email address is not valid")

def check_age(text):
    try:
        age = int(text)
    except ValueError:
        raise ValueError("age must be a whole number")
    if not 13 <= age <= 120:
        raise ValueError("age must be 13-120")

def validate_signup(form):
    checkers = [("username", check_username), ("email", check_email), ("age", check_age)]
    errors = {}
    for field, check in checkers:
        try:
            check(form.get(field, ""))
        except ValueError as err:
            errors[field] = str(err)
    return errors

print(validate_signup({"username": "ana_dev", "email": "ana@runtime.school", "age": "34"}))
print(validate_signup({"username": "a!", "email": "ana.runtime.school", "age": "twelve"}))
`,
      alternatives: [
        src`
def check_username(name):
    ok = 3 <= len(name) <= 20
    for ch in name:
        if not (ch.isalnum() or ch == "_"):
            ok = False
    if not ok:
        raise ValueError("username must be 3-20 letters, digits or _")

def check_email(email):
    at = email.find("@")
    if at < 1 or email.count("@") > 1 or email.find(".", at) == -1:
        raise ValueError("email address is not valid")

def check_age(text):
    try:
        age = int(text)
    except ValueError:
        raise ValueError("age must be a whole number")
    if age < 13 or age > 120:
        raise ValueError("age must be 13-120")

def validate_signup(form):
    errors = {}
    try:
        check_username(form.get("username", ""))
    except ValueError as err:
        errors["username"] = str(err)
    try:
        check_email(form.get("email", ""))
    except ValueError as err:
        errors["email"] = str(err)
    try:
        check_age(form.get("age", ""))
    except ValueError as err:
        errors["age"] = str(err)
    return errors
`,
      ],
      wrong: [
        {
          code: src`
def validate_signup(form):
    errors = {}
    try:
        name = form.get("username", "")
        if not 3 <= len(name) <= 20 or not name.replace("_", "").isalnum():
            raise ValueError("username must be 3-20 letters, digits or _")
        email = form.get("email", "")
        if email.count("@") != 1 or email.startswith("@") or "." not in email.split("@")[1]:
            raise ValueError("email address is not valid")
        age = int(form.get("age", ""))
        if not 13 <= age <= 120:
            raise ValueError("age must be 13-120")
    except ValueError as err:
        errors["form"] = str(err)
    return errors
`,
          fails: ["returns"],
          why: "one `try` around everything stops at the first problem and loses which field it was",
        },
        {
          code: src`
def check_age(text):
    age = int(text)
    if not 13 <= age <= 120:
        raise ValueError("age must be 13-120")

def check_username(name):
    if not 3 <= len(name) <= 20 or not name.replace("_", "").isalnum():
        raise ValueError("username must be 3-20 letters, digits or _")

def check_email(email):
    if email.count("@") != 1 or email.startswith("@") or "." not in email.split("@")[1]:
        raise ValueError("email address is not valid")

def validate_signup(form):
    errors = {}
    for field, check in [("username", check_username), ("email", check_email), ("age", check_age)]:
        try:
            check(form.get(field, ""))
        except ValueError as err:
            errors[field] = str(err)
    return errors
`,
          fails: ["returns"],
          why: "a non-number age shows Python's `invalid literal for int()` instead of the form's message",
        },
        {
          code: src`
def check_username(name):
    if not 3 <= len(name) <= 20 or not name.isalnum():
        raise ValueError("username must be 3-20 letters, digits or _")

def check_email(email):
    if "@" not in email or "." not in email:
        raise ValueError("email address is not valid")

def check_age(text):
    try:
        age = int(text)
    except ValueError:
        raise ValueError("age must be a whole number")
    if not 13 <= age <= 120:
        raise ValueError("age must be 13-120")

def validate_signup(form):
    errors = {}
    for field, check in [("username", check_username), ("email", check_email), ("age", check_age)]:
        try:
            check(form.get(field, ""))
        except ValueError as err:
            errors[field] = str(err)
    return errors
`,
          fails: ["returns"],
          why: "underscores are refused and an email with two @ signs or a dot only before the @ is accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "validate_signup", [
            example([{ username: "ana_dev", email: "ana@runtime.school", age: "34" }], {}),
            example([{ username: "a!", email: "ana.runtime.school", age: "twelve" }], { username: "username must be 3-20 letters, digits or _", email: "email address is not valid", age: "age must be a whole number" }),
            example([{ username: "theo99", email: "theo@mail.com", age: "130" }], { age: "age must be 13-120" }),
            hiddenCase("a username with a space", [{ username: "nora garcia", email: "n@g.co", age: "20" }], { username: "username must be 3-20 letters, digits or _" }),
            hiddenCase("two @ signs", [{ username: "nora", email: "n@@g.co", age: "20" }], { email: "email address is not valid" }),
            hiddenCase("a dot only before the @", [{ username: "nora", email: "nora.g@localhost", age: "20" }], { email: "email address is not valid" }),
            hiddenCase("an age just under the limit", [{ username: "kid_01", email: "k@school.org", age: "12" }], { age: "age must be 13-120" }),
            hiddenCase("a missing field", [{ username: "nora", email: "n@g.co" }], { age: "age must be a whole number" }),
            hiddenCase("nothing before the @", [{ username: "abc", email: "@runtime.school", age: "13" }], { email: "email address is not valid" }),
          ], { label: "validate_signup() reports every invalid field" }),
        ],
      },
    },
  },
  {
    id: "PY-Q18-22",
    version: 2,
    slug: "retry-a-flaky-call",
    title: "Retry a flaky call, but only when it's worth it",
    format: "integration",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "except-as", "raise-stmt", "class-def", "range-call", "comparison", "none-value", "else-clause", "print-several", "print-text", "lambda", "closure", "arithmetic", "nested-condition", "boolean", "len-call", "reassignment", "truthiness", "while-loop"],
    prompt: "A price service sometimes times out and works on the next try; other failures (a bad request) will fail every time. Write a helper that retries only the temporary kind. Define `TemporaryFailure`, then `with_retries(action, attempts)`.",
    spec: [
      ["Error type", "`TemporaryFailure`, a kind of `Exception`"],
      ["Function", "`with_retries(action, attempts)`: call `action()` (no arguments) up to `attempts` times"],
      ["Returns", "the result of the first call that succeeds"],
      ["Retries", "only after `TemporaryFailure`; when every attempt raises it, raise the **last** one again"],
      ["Other errors", "escape at once, without another attempt"],
      ["Bad input", "`attempts` below 1 raises `ValueError(\"attempts must be at least 1\")` without calling `action`"],
    ],
    hiddenKinds: ["success on the last attempt", "a permanent error on the first attempt", "attempts of 1", "attempts of 0", "every attempt fails"],
    hints: [
      "Loop `attempts` times with a `try` inside; `return` the moment a call succeeds.",
      "Catch only `TemporaryFailure`, and remember the error (`as err` names it only inside the block, so store it in another name).",
      "After the loop, every attempt failed: `raise` the stored error. Check `attempts` before the loop starts.",
    ],
    explanation: "A loop with a `try` per attempt returns on the first success. Only `TemporaryFailure` is caught, so a permanent error escapes immediately instead of being retried pointlessly. Python deletes the `as err` name at the end of the `except` block, so the last error is kept in another variable and raised after the loop. Catching every Exception, retrying one time too many, or raising a new generic error instead of the real one are the usual mistakes.",
    code: {
      starter: src`
def with_retries(action, attempts):
    return action()

calls = []

def flaky():
    calls.append(1)
    return 19.99

print(with_retries(flaky, 3), len(calls))
`,
      answer: src`
class TemporaryFailure(Exception):
    pass

def with_retries(action, attempts):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    last_error = None
    for attempt in range(attempts):
        try:
            return action()
        except TemporaryFailure as err:
            last_error = err
    raise last_error

calls = []

def flaky():
    calls.append(1)
    if len(calls) < 3:
        raise TemporaryFailure("price service timed out")
    return 19.99

print(with_retries(flaky, 3), len(calls))
`,
      alternatives: [
        src`
class TemporaryFailure(Exception):
    pass

def with_retries(action, attempts):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    tries = 0
    while True:
        tries += 1
        try:
            result = action()
        except TemporaryFailure:
            if tries == attempts:
                raise
        else:
            return result
`,
      ],
      wrong: [
        {
          code: src`
class TemporaryFailure(Exception):
    pass

def with_retries(action, attempts):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    last_error = None
    for attempt in range(attempts):
        try:
            return action()
        except Exception as err:
            last_error = err
    raise last_error
`,
          fails: ["permanent"],
          why: "a permanent error is retried as if it might go away",
        },
        {
          code: src`
class TemporaryFailure(Exception):
    pass

def with_retries(action, attempts):
    if attempts < 1:
        raise ValueError("attempts must be at least 1")
    for attempt in range(attempts):
        try:
            return action()
        except TemporaryFailure:
            pass
    return None
`,
          fails: ["gives-up"],
          why: "after the last failure it returns None, so the caller never learns the call failed",
        },
        {
          code: src`
class TemporaryFailure(Exception):
    pass

def with_retries(action, attempts):
    last_error = None
    for attempt in range(attempts + 1):
        try:
            return action()
        except TemporaryFailure as err:
            last_error = err
    raise last_error
`,
          fails: ["gives-up", "bad-attempts"],
          why: "it makes one attempt more than allowed, and accepts 0 attempts",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "first-try",
            label: "A call that works at once is made once",
            show: "with_retries(lambda: 42, 3)",
            expr: "_n = [0]\ndef _ok():\n    _n[0] += 1\n    return 42\nresult = [with_retries(_ok, 3), _n[0]]",
            expected: py.list(py.int(42), py.int(1)),
          },
          {
            kind: "expr",
            id: "eventually",
            label: "Temporary failures are retried until a call succeeds on the last attempt",
            hidden: true,
            expr: "_n = [0]\ndef _flaky():\n    _n[0] += 1\n    if _n[0] < 4:\n        raise TemporaryFailure('timeout')\n    return 'price'\nresult = [with_retries(_flaky, 4), _n[0]]",
            expected: py.list(py.str("price"), py.int(4)),
          },
          {
            kind: "expr",
            id: "gives-up",
            label: "When every attempt fails, the last TemporaryFailure is raised again",
            hidden: true,
            expr: "_n = [0]\ndef _down():\n    _n[0] += 1\n    raise TemporaryFailure(f'timeout {_n[0]}')\ntry:\n    with_retries(_down, 3)\n    result = 'returned'\nexcept TemporaryFailure as _e:\n    result = [str(_e), _n[0]]",
            expected: py.list(py.str("timeout 3"), py.int(3)),
          },
          {
            kind: "expr",
            id: "permanent",
            label: "Any other error escapes at once, without a retry",
            hidden: true,
            expr: "_n = [0]\ndef _bad():\n    _n[0] += 1\n    raise KeyError('sku')\ntry:\n    with_retries(_bad, 5)\n    result = 'returned'\nexcept KeyError:\n    result = _n[0]",
            expected: py.int(1),
          },
          {
            kind: "expr",
            id: "bad-attempts",
            label: "Fewer than 1 attempt is refused before calling the action",
            hidden: true,
            expr: "_n = [0]\ndef _ok():\n    _n[0] += 1\n    return 1\ntry:\n    with_retries(_ok, 0)\n    result = 'returned'\nexcept ValueError as _e:\n    result = [str(_e), _n[0]]",
            expected: py.list(py.str("attempts must be at least 1"), py.int(0)),
          },
        ],
      },
    },
  },
];
