/**
 * M23 CLI & Automation: five lessons (PY-L23-01 … PY-L23-05).
 *
 * Scripts that people run from a terminal: argparse turns the typed words into named, typed values and rejects bad
 * input (L01); pathlib finds the files a script works on (L02); environment variables carry settings that differ per
 * machine (L03); subprocess.run starts other programs, and automation code keeps that call behind a parameter so it can
 * be exercised with a stand-in (L04); and a folder tool plans its changes, shows them as a dry run, applies them and
 * reports (L05).
 *
 * Everything runs for real in the browser: argparse is given the argument list directly (exactly what it reads from
 * sys.argv in a terminal), files are created in the run's own folder, and environment lookups take a mapping so a
 * plain dictionary can stand in for os.environ. The browser has no operating-system processes, so subprocess.run
 * itself raises OSError here; L04 shows that error for real, works with the CompletedProcess objects run() returns,
 * and grades automation code through an injected `run` function. Nothing prints a pretend result.
 * Version 2: rewritten from a lesson set whose subprocess lesson printed hardcoded results.
 */
import type { PyLesson } from "../model";
import { csvRows, example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
import { py } from "@/engine/python/values";
import { pv as toPy } from "../fn-checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expr check whose Python ends by setting `result`. */
const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: toPy(expected),
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

/** Python lines that build a folder of files for a check: makeFolder("t1", {"a.csv": "x"}). Sub-paths are allowed. */
const makeFolder = (folder: string, files: Record<string, string>, dirs: string[] = []) =>
  [
    "from pathlib import Path as _P",
    `_P(${JSON.stringify(folder)}).mkdir(parents=True, exist_ok=True)`,
    ...dirs.map((d) => `_P(${JSON.stringify(folder)}, ${JSON.stringify(d)}).mkdir(parents=True, exist_ok=True)`),
    ...Object.entries(files).flatMap(([name, text]) => [
      `_P(${JSON.stringify(folder)}, ${JSON.stringify(name)}).parent.mkdir(parents=True, exist_ok=True)`,
      `_P(${JSON.stringify(folder)}, ${JSON.stringify(name)}).write_text(${JSON.stringify(text)})`,
    ]),
  ].join("\n");

// ---------------------------------------------------------------- shared fixtures

const invoices = [
  { Invoice: "489434", Country: "United Kingdom", Quantity: 12 },
  { Invoice: "489435", Country: "France", Quantity: 4 },
  { Invoice: "C489449", Country: "France", Quantity: -6 },
  { Invoice: "489436", Country: "France", Quantity: 24 },
  { Invoice: "489436", Country: "France", Quantity: 2 },
  { Invoice: "489437", Country: "Germany", Quantity: 10 },
];

export const m23Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L23-01 argparse
  {
    id: "PY-L23-01",
    version: 2,
    slug: "a-named-argument",
    title: "Read command-line arguments with argparse",
    lede: "A script run from a terminal gets its options as words. argparse turns them into named, typed values, fills in defaults, and stops with a clear message when the input is wrong.",
    focus: "Describe a script's arguments with argparse and read the parsed values.",
    minutes: 20,
    objectives: [
      "Add a positional argument, an option with a default, and an option with `type=int`",
      "Use `choices` and `action=\"store_true\"` for fixed values and on/off flags",
      "Explain what happens on bad input: a usage message and exit status 2",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "continue-statement", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-index", "string-method", "top-level-indent", "type-call"],
    teaches: ["argparse-call"],
    blocks: [
      {
        kind: "text",
        md: "A shop's finance team runs `python export_invoices.py invoices.csv --country France --limit 5` every morning. Python hands the script those words as a list of text: `[\"invoices.csv\", \"--country\", \"France\", \"--limit\", \"5\"]`. Picking that list apart by position is fragile: options can come in any order, some are optional, and `\"5\"` is text, not a number.\n\n**argparse** (standard library) does the work. You describe each argument once with `add_argument`, then `parse_args` reads the list and gives back an object with one attribute per argument. A name without dashes (`\"path\"`) is a **positional** argument and is required. A name with two dashes (`\"--limit\"`) is an **option**: it may be left out, and then it gets its `default`. `type=int` converts the text and rejects anything that isn't a whole number.\n\nIn a terminal you call `parser.parse_args()` with no list, and it reads the words typed after the script name. Passing the list yourself, as below, runs the very same parsing, which is also how you test a command-line script.",
      },
      {
        kind: "example",
        title: "A path, a country and a limit",
        code: src`
import argparse

parser = argparse.ArgumentParser(prog="export_invoices")
parser.add_argument("path")
parser.add_argument("--country", default="United Kingdom")
parser.add_argument("--limit", type=int, default=10)

args = parser.parse_args(["invoices.csv", "--limit", "5"])
print(args.path)
print(args.country)
print(args.limit, type(args.limit))
`,
        output: "invoices.csv\nUnited Kingdom\n5 <class 'int'>\n",
        note: "`--country` was not given, so it has its default. `--limit` arrived as the text `\"5\"` and `type=int` turned it into the number 5. `prog=` names the script in messages; without it argparse uses the file name.",
      },
      {
        kind: "text",
        md: "When the input breaks the rules, argparse doesn't return at all. It writes a usage line and the reason to the error stream and ends the program with **exit status 2**, the convention for \"you called me wrong\". It does this by raising `SystemExit`, which is how any Python program stops early.",
      },
      {
        kind: "error-example",
        title: "A limit that isn't a number",
        code: src`
import argparse

parser = argparse.ArgumentParser(prog="export_invoices")
parser.add_argument("path")
parser.add_argument("--limit", type=int, default=10)

args = parser.parse_args(["invoices.csv", "--limit", "five"])
print("exporting", args.limit, "invoices")
`,
        error: "SystemExit",
        output: "",
        note: "Nothing is printed by the script. The error stream shows `usage: export_invoices [-h] [--limit LIMIT] path` and `export_invoices: error: argument --limit: invalid int value: 'five'`, and the program stops with status 2. A missing `path` stops it the same way: `the following arguments are required: path`.",
      },
      {
        kind: "text",
        md: "Two more kinds of argument cover most scripts. `choices=[...]` accepts only the listed values. `action=\"store_true\"` makes an on/off **flag**: it takes no value, and is `True` when present and `False` when absent. A dash in an option name becomes an underscore in the attribute: `--dry-run` is read as `args.dry_run`.\n\nKeeping the parser inside a function that takes the argument list makes it easy to call with several lists. The built-in `vars(args)` turns the parsed result into an ordinary dictionary.",
      },
      {
        kind: "example",
        title: "A format choice and a dry-run flag",
        code: src`
import argparse

def read_options(argv):
    parser = argparse.ArgumentParser(prog="export_invoices")
    parser.add_argument("path")
    parser.add_argument("--format", choices=["csv", "json"], default="csv")
    parser.add_argument("--dry-run", action="store_true")
    return vars(parser.parse_args(argv))

print(read_options(["march.csv"]))
print(read_options(["march.csv", "--format", "json", "--dry-run"]))
print(read_options(["--dry-run", "april.csv"]))
`,
        output: "{'path': 'march.csv', 'format': 'csv', 'dry_run': False}\n{'path': 'march.csv', 'format': 'json', 'dry_run': True}\n{'path': 'april.csv', 'format': 'csv', 'dry_run': True}\n",
        note: "Options can come before or after the positional argument. `--format xml` would stop with `invalid choice: 'xml' (choose from csv, json)`.",
      },
      {
        kind: "text",
        md: "**When to use it:** any script someone runs with options. argparse also writes `--help` for free from the same descriptions.\n\n**Mistakes to avoid:** forgetting `type=int`, so `args.limit * 2` repeats text instead of doubling a number; writing `args.dry-run` (Python reads that as `args.dry - run`); and checking a rule by printing a message and carrying on. For a rule that `type` and `choices` can't express, such as *the amount must be positive*, call `parser.error(\"amount must be positive\")` after parsing: it prints the usage and your message and exits with status 2, exactly like argparse's own errors.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Make --top a number",
      prompt: "`read_limits` parses `--top`, but the value comes back as text, so the demo prints `33` instead of `6`. Make argparse convert it to a whole number, then run it.",
      spec: [
        ["Function", "`read_limits(argv)`"],
        ["Returns", "a dictionary like `{'top': 3}`, where the value is an `int`; 5 when `--top` is not given"],
      ],
      starter: src`
import argparse

def read_limits(argv):
    parser = argparse.ArgumentParser(prog="top_customers")
    parser.add_argument("--top", default=5)
    return vars(parser.parse_args(argv))

options = read_limits(["--top", "3"])
print(options, options["top"] * 2)
`,
      answer: src`
import argparse

def read_limits(argv):
    parser = argparse.ArgumentParser(prog="top_customers")
    parser.add_argument("--top", type=int, default=5)
    return vars(parser.parse_args(argv))

options = read_limits(["--top", "3"])
print(options, options["top"] * 2)
`,
      wrong: [
        {
          code: src`
import argparse

def read_limits(argv):
    parser = argparse.ArgumentParser(prog="top_customers")
    parser.add_argument("--top", type=float, default=5)
    return vars(parser.parse_args(argv))
`,
          fails: ["returns"],
          why: "`type=float` turns 3 into 3.0, which is not a whole number",
        },
      ],
      hints: [
        "The value is text because argparse keeps what was typed unless you tell it otherwise.",
        "`add_argument` takes a keyword that names the conversion.",
        "Give `--top` the conversion for whole numbers; the default 5 is already a number.",
      ],
      task: {
        checks: [
          fn("returns", "read_limits", [
            example([["--top", "3"]], { top: 3 }),
            hiddenCase("no --top at all", [[]], { top: 5 }),
            hiddenCase("a two-digit value", [["--top", "12"]], { top: 12 }),
          ], { label: "read_limits() returns --top as a whole number" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A refund command",
        prompt: "Support staff issue refunds with `refund C489449 --amount 12.50 --reason late`. Write `refund_args(argv)`: parse a positional `invoice`, a **required** `--amount` that is a decimal number, and `--reason`, one of `damaged`, `late` or `wrong-item` (default `damaged`). An amount of zero or less must be refused the way argparse refuses bad input. Return the parsed values as a dictionary.",
        spec: [
          ["Function", "`refund_args(argv)`"],
          ["argv", "a list of words, e.g. `[\"C489449\", \"--amount\", \"12.50\"]`"],
          ["Returns", "`{'invoice': ..., 'amount': <float>, 'reason': ...}`"],
          ["Refuses", "a missing `--amount`, an amount that isn't a number, an unknown reason, and an amount ≤ 0: each stops with `SystemExit` (status 2)"],
          ["Example", "`refund_args([\"C489449\", \"--amount\", \"12.50\"])` → `{'invoice': 'C489449', 'amount': 12.5, 'reason': 'damaged'}`"],
        ],
        starter: src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    return vars(parser.parse_args(argv))

print(refund_args(["C489449", "--amount", "12.50"]))
`,
        answer: src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    parser.add_argument("invoice")
    parser.add_argument("--amount", type=float, required=True)
    parser.add_argument("--reason", choices=["damaged", "late", "wrong-item"], default="damaged")
    args = parser.parse_args(argv)
    if args.amount <= 0:
        parser.error("amount must be more than zero")
    return vars(args)

print(refund_args(["C489449", "--amount", "12.50"]))
`,
        alternatives: [
          src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    parser.add_argument("--reason", default="damaged", choices=["damaged", "late", "wrong-item"])
    parser.add_argument("--amount", required=True, type=float)
    parser.add_argument("invoice")
    args = parser.parse_args(argv)
    if not args.amount > 0:
        raise SystemExit(2)
    return {"invoice": args.invoice, "amount": args.amount, "reason": args.reason}
`,
        ],
        wrong: [
          {
            code: src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    parser.add_argument("invoice")
    parser.add_argument("--amount", type=float)
    parser.add_argument("--reason", choices=["damaged", "late", "wrong-item"], default="damaged")
    args = parser.parse_args(argv)
    if args.amount <= 0:
        parser.error("amount must be more than zero")
    return vars(args)
`,
            fails: ["refuses"],
            why: "without `required=True` a missing amount is None, and comparing None with 0 crashes with TypeError instead of a usage error",
          },
          {
            code: src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    parser.add_argument("invoice")
    parser.add_argument("--amount", type=float, required=True)
    parser.add_argument("--reason", choices=["damaged", "late", "wrong-item"], default="damaged")
    args = parser.parse_args(argv)
    if args.amount < 0:
        parser.error("amount must not be negative")
    return vars(args)
`,
            fails: ["refuses"],
            why: "`< 0` lets a refund of exactly zero through",
          },
          {
            code: src`
import argparse

def refund_args(argv):
    parser = argparse.ArgumentParser(prog="refund")
    parser.add_argument("invoice")
    parser.add_argument("--amount", required=True)
    parser.add_argument("--reason", choices=["damaged", "late", "wrong-item"], default="damaged")
    return vars(parser.parse_args(argv))
`,
            fails: ["returns", "refuses"],
            why: "the amount stays text, and nothing refuses zero or a word like `ten`",
          },
        ],
        hints: [
          "Three `add_argument` calls describe the input: one positional, two options. Look back at which keywords give a type, a fixed list of values, and a default.",
          "An option that must always be given takes `required=True`.",
          "Whether the amount is positive can only be checked after `parse_args`; the parser has a method that reports an error and exits with status 2.",
        ],
        task: {
          checks: [
            fn("returns", "refund_args", [
              example([["C489449", "--amount", "12.50"]], { invoice: "C489449", amount: 12.5, reason: "damaged" }),
              example([["C489449", "--amount", "3", "--reason", "late"]], { invoice: "C489449", amount: py.float(3), reason: "late" }),
              example([["--reason", "wrong-item", "C490120", "--amount", "40.1"]], { invoice: "C490120", amount: 40.1, reason: "wrong-item" }),
              hiddenCase("the --amount=value spelling", [["C1", "--amount=7.25"]], { invoice: "C1", amount: 7.25, reason: "damaged" }),
              hiddenCase("a very small positive amount", [["C2", "--amount", "0.01"]], { invoice: "C2", amount: 0.01, reason: "damaged" }),
            ], { label: "refund_args() returns the invoice, a float amount and a reason" }),
            fn("refuses", "refund_args", [
              raisesCase([["C489449", "--amount", "0"]], "SystemExit"),
              raisesCase([["C489449", "--amount", "-5"]], "SystemExit", { label: "a negative amount" }),
              raisesCase([["C489449"]], "SystemExit", { label: "no amount at all" }),
              raisesCase([["C489449", "--amount", "ten"]], "SystemExit", { label: "an amount that is a word" }),
              raisesCase([["C489449", "--amount", "5", "--reason", "lost"]], "SystemExit", { label: "a reason that isn't allowed" }),
            ], { label: "refund_args() stops with SystemExit on bad input" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Invoices for one country",
        prompt: "Put a command-line front end on a real job. Write `main(argv, invoices)`: parse a required `--country`, an optional `--min-quantity` (whole number, default 1) and a flag `--include-cancelled`. Return the invoice numbers for that country whose line quantity is at least the minimum, each number once, sorted. Cancellation invoices start with `C` and are left out unless the flag is given; their quantities are negative, so for them compare the size of the quantity (`abs`) with the minimum.",
        spec: [
          ["Function", "`main(argv, invoices)`"],
          ["invoices", "a list of invoice lines: dictionaries with `Invoice`, `Country`, `Quantity` (one invoice can have several lines)"],
          ["Returns", "a sorted list of invoice numbers, each once; `[]` when nothing matches"],
          ["Rules", "country must match exactly; a line counts when its quantity (its size, for a cancellation) is at least `--min-quantity`; `C…` invoices only with `--include-cancelled`"],
          ["Example", "the starter's lines with `[\"--country\", \"France\", \"--min-quantity\", \"4\"]` → `['489435', '489436']`"],
        ],
        starter: src`
import argparse

def main(argv, invoices):
    return []

invoices = [
    {"Invoice": "489434", "Country": "United Kingdom", "Quantity": 12},
    {"Invoice": "489435", "Country": "France", "Quantity": 4},
    {"Invoice": "C489449", "Country": "France", "Quantity": -6},
    {"Invoice": "489436", "Country": "France", "Quantity": 24},
    {"Invoice": "489436", "Country": "France", "Quantity": 2},
    {"Invoice": "489437", "Country": "Germany", "Quantity": 10},
]
print(main(["--country", "France", "--min-quantity", "4"], invoices))
print(main(["--country", "France", "--include-cancelled"], invoices))
`,
        answer: src`
import argparse

def main(argv, invoices):
    parser = argparse.ArgumentParser(prog="country_invoices")
    parser.add_argument("--country", required=True)
    parser.add_argument("--min-quantity", type=int, default=1)
    parser.add_argument("--include-cancelled", action="store_true")
    args = parser.parse_args(argv)
    found = []
    for line in invoices:
        number = line["Invoice"]
        if line["Country"] != args.country:
            continue
        if number.startswith("C") and not args.include_cancelled:
            continue
        if abs(line["Quantity"]) < args.min_quantity:
            continue
        if number not in found:
            found.append(number)
    return sorted(found)

invoices = [
    {"Invoice": "489434", "Country": "United Kingdom", "Quantity": 12},
    {"Invoice": "489435", "Country": "France", "Quantity": 4},
    {"Invoice": "C489449", "Country": "France", "Quantity": -6},
    {"Invoice": "489436", "Country": "France", "Quantity": 24},
    {"Invoice": "489436", "Country": "France", "Quantity": 2},
    {"Invoice": "489437", "Country": "Germany", "Quantity": 10},
]
print(main(["--country", "France", "--min-quantity", "4"], invoices))
print(main(["--country", "France", "--include-cancelled"], invoices))
`,
        alternatives: [
          src`
import argparse

def matching(invoices, country, minimum, cancelled):
    numbers = {}
    for line in invoices:
        is_cancel = line["Invoice"].startswith("C")
        if line["Country"] == country and (cancelled or not is_cancel) and abs(line["Quantity"]) >= minimum:
            numbers[line["Invoice"]] = True
    return sorted(numbers)

def main(argv, invoices):
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True)
    parser.add_argument("--min-quantity", type=int, default=1)
    parser.add_argument("--include-cancelled", action="store_true")
    args = parser.parse_args(argv)
    return matching(invoices, args.country, args.min_quantity, args.include_cancelled)
`,
        ],
        wrong: [
          {
            code: src`
import argparse

def main(argv, invoices):
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True)
    parser.add_argument("--min-quantity", type=int, default=1)
    parser.add_argument("--include-cancelled", action="store_true")
    args = parser.parse_args(argv)
    found = []
    for line in invoices:
        if line["Country"] == args.country and line["Quantity"] >= args.min_quantity:
            if line["Invoice"] not in found:
                found.append(line["Invoice"])
    return sorted(found)
`,
            fails: ["returns"],
            why: "a cancellation's quantity is negative, so it never reaches the minimum even with --include-cancelled",
          },
          {
            code: src`
import argparse

def main(argv, invoices):
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True)
    parser.add_argument("--min-quantity", type=int, default=1)
    parser.add_argument("--include-cancelled", action="store_true")
    args = parser.parse_args(argv)
    found = []
    for line in invoices:
        if line["Invoice"].startswith("C") and not args.include_cancelled:
            continue
        if line["Country"] == args.country and abs(line["Quantity"]) >= args.min_quantity:
            found.append(line["Invoice"])
    return sorted(found)
`,
            fails: ["returns"],
            why: "an invoice with two matching lines is listed twice",
          },
          {
            code: src`
import argparse

def main(argv, invoices):
    parser = argparse.ArgumentParser()
    parser.add_argument("--country", required=True)
    parser.add_argument("--min-quantity", default=1)
    parser.add_argument("--include-cancelled", action="store_true")
    args = parser.parse_args(argv)
    found = []
    for line in invoices:
        if line["Invoice"].startswith("C") and not args.include_cancelled:
            continue
        if line["Country"] == args.country and abs(line["Quantity"]) >= int(args.min_quantity[0]):
            if line["Invoice"] not in found:
                found.append(line["Invoice"])
    return sorted(found)
`,
            fails: ["returns"],
            why: "without `type=int` it converts only the first character, so a minimum of 12 becomes 1",
          },
        ],
        hints: [
          "Split the work: describe and parse the three arguments first, then loop over the lines using the parsed values.",
          "`--min-quantity` is read as `args.min_quantity` and `--include-cancelled` as `args.include_cancelled`. A flag is True or False, so it can go straight into an `if`.",
          "Skip a line as soon as one rule fails. Keep each invoice number once (check before appending) and sort at the end.",
        ],
        task: {
          checks: [
            fn("returns", "main", [
              example([["--country", "France", "--min-quantity", "4"], invoices], ["489435", "489436"]),
              example([["--country", "France", "--include-cancelled"], invoices], ["489435", "489436", "C489449"]),
              example([["--country", "Spain"], invoices], []),
              hiddenCase("a cancellation above the minimum", [["--include-cancelled", "--min-quantity", "6", "--country", "France"], invoices], ["489436", "C489449"]),
              hiddenCase("a two-digit minimum", [["--country", "United Kingdom", "--min-quantity", "12"], invoices], ["489434"]),
              hiddenCase("a quantity exactly at the minimum", [["--country", "Germany", "--min-quantity", "10"], invoices], ["489437"]),
              hiddenCase("no invoice lines", [["--country", "France"], []], []),
            ], { label: "main() lists the matching invoice numbers once, sorted" }),
            fn("refuses", "main", [
              raisesCase([["--min-quantity", "3"], invoices], "SystemExit", { label: "no --country" }),
            ], { label: "main() requires --country" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--copies", default=1)
args = parser.parse_args(["--copies", "3"])
print(args.copies * 2)
`,
        choices: ["33", "6", "2", "TypeError"],
        answer: 0,
        why: "Without `type=int`, `--copies` keeps the typed text `\"3\"`, and text times 2 repeats it. The default 1 would have been a number, which is why this bug hides until someone passes the option.",
      },
      {
        id: "q2",
        prompt: "A common mistake is to read `--dry-run` as `args.dry-run`. What is the attribute really called? What does this print?",
        program: src`
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--dry-run", action="store_true")
print(vars(parser.parse_args([])))
`,
        choices: ["{'dry_run': False}", "{'dry-run': False}", "{'dry_run': None}", "{}"],
        answer: 0,
        why: "Dashes become underscores so the name works as an attribute. A `store_true` flag that wasn't given is `False`, not `None`.",
      },
      {
        id: "q3",
        prompt: "`--limit` has `type=int`, but a limit of 0 or less makes no sense. What should the script do when someone passes `--limit 0`?",
        choices: [
          "Call `parser.error(...)` after parsing, so the user sees the usage and the program exits with status 2",
          "Print a warning and use 0 anyway",
          "Let a ZeroDivisionError happen later in the report",
          "Nothing: `type=int` already refuses 0",
        ],
        answer: 0,
        why: "`type=int` only checks that the text is a whole number; 0 is one. A rule about the value goes after parsing, and `parser.error` reports it the same way argparse reports its own errors.",
      },
    ],
    review: [
      "`add_argument(\"path\")` is a required positional; `add_argument(\"--name\", default=...)` is an option.",
      "`type=` converts and validates, `choices=` limits the values, `action=\"store_true\"` makes a flag; dashes become underscores.",
      "Bad input ends the program with a usage message and status 2; use `parser.error` for your own rules.",
      "Next: finding the files a script should work on, with pathlib.",
    ],
  },

  // ------------------------------------------------------------------ PY-L23-02 pathlib listing
  {
    id: "PY-L23-02",
    version: 2,
    slug: "list-the-files",
    title: "Find files with pathlib",
    lede: "Automation starts by finding its input: every CSV in a folder, every export under a tree of subfolders. pathlib lists folders, matches patterns and tells you each file's name, suffix and size.",
    focus: "List a folder's files with iterdir and glob, and read each path's name, stem, suffix and size.",
    minutes: 18,
    objectives: [
      "List a folder with `iterdir()` and tell files from folders",
      "Match files with `glob(\"*.csv\")` and search subfolders with `rglob`",
      "Sort the results so the script behaves the same on every computer",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comparison", "continue-statement", "dict-get", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "newline-escape", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-check", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness"],
    teaches: ["dir-list"],
    blocks: [
      {
        kind: "text",
        md: "A nightly job has to process whatever exports landed in a folder. It can't know the names in advance, so it asks the folder. A `Path` (see Files & Directories) can do that: `folder.iterdir()` gives one `Path` for each entry in the folder, files and subfolders alike.\n\nEach path can describe itself. `.name` is the last part (`invoices-2010-12.csv`), `.stem` is the name without its suffix (`invoices-2010-12`), `.suffix` is the final dot-part (`.csv`), and `.is_file()` tells a file from a folder. The `/` operator joins path parts: `Path(\"exports\") / \"notes.txt\"` is `exports/notes.txt`.\n\nThe operating system returns folder entries in no particular order, and the order differs between computers. Always wrap the listing in `sorted(...)` before you print it or act on it.",
      },
      {
        kind: "example",
        title: "What's in the exports folder",
        code: src`
from pathlib import Path

exports = Path("exports")
exports.mkdir()
(exports / "invoices-2010-12.csv").write_text("Invoice,Quantity\n489434,12\n")
(exports / "invoices-2011-01.csv").write_text("Invoice,Quantity\n")
(exports / "notes.txt").write_text("sent to finance")
(exports / "archive").mkdir()

for path in sorted(exports.iterdir()):
    if path.is_file():
        print("file:", path.name, "| stem:", path.stem, "| suffix:", path.suffix)
    else:
        print("folder:", path.name)
`,
        output: "folder: archive\nfile: invoices-2010-12.csv | stem: invoices-2010-12 | suffix: .csv\nfile: invoices-2011-01.csv | stem: invoices-2011-01 | suffix: .csv\nfile: notes.txt | stem: notes | suffix: .txt\n",
        note: "The first lines only build a small folder to look at, because every run starts in an empty working folder. `iterdir` lists the subfolder `archive` too, which is why the loop asks `is_file()`.",
      },
      {
        kind: "text",
        md: "Usually you want only some files. `folder.glob(\"*.csv\")` returns the paths in that folder whose names match the pattern: `*` stands for any run of characters. It looks in that one folder only. `folder.rglob(\"*.csv\")` searches the folder **and every subfolder** below it. `path.stat().st_size` is the file's size in bytes.",
      },
      {
        kind: "example",
        title: "Monthly exports spread over year folders",
        code: src`
from pathlib import Path

root = Path("shared")
(root / "2010").mkdir(parents=True)
(root / "2011").mkdir()
(root / "2010" / "december.csv").write_text("Invoice,Quantity\n489434,12\n489435,4\n")
(root / "2011" / "january.csv").write_text("Invoice,Quantity\n539993,10\n")
(root / "2011" / "january.csv.bak").write_text("old copy")
(root / "readme.txt").write_text("monthly exports")

print("top level:", [path.name for path in sorted(root.glob("*.csv"))])
total = 0
for path in sorted(root.rglob("*.csv")):
    size = path.stat().st_size
    total += size
    print(path, size)
print("bytes in all exports:", total)
`,
        output: "top level: []\nshared/2010/december.csv 36\nshared/2011/january.csv 27\nbytes in all exports: 63\n",
        note: "`glob` finds nothing because no CSV sits directly in `shared`. `rglob` walks into `2010` and `2011`. `january.csv.bak` ends in `.bak`, so `*.csv` doesn't match it. `mkdir(parents=True)` also creates `shared` itself.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a script works on \"all the files that…\": every CSV in an inbox, every log under a tree, the newest export.\n\n**Mistakes to avoid:** acting on `iterdir()` or `glob()` results without sorting them, so the order changes from one machine to the next; forgetting that `iterdir()` includes folders; and comparing suffixes without `.lower()`, so `REPORT.CSV` (suffix `.CSV`) is missed. `.suffix` is only the last dot-part: `archive.tar.gz` has suffix `.gz` and stem `archive.tar`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the CSV files",
      prompt: "`csv_names` returns the name of every entry in the folder. Change it so it keeps only names whose suffix is `.csv`, then run it: `orders.json` should disappear.",
      spec: [
        ["Function", "`csv_names(folder)`"],
        ["Returns", "the sorted names of the files in `folder` whose suffix is `.csv`"],
      ],
      starter: src`
from pathlib import Path

def csv_names(folder):
    names = []
    for path in sorted(Path(folder).iterdir()):
        names.append(path.name)
    return names

Path("drop").mkdir()
Path("drop/orders.csv").write_text("id\n1\n")
Path("drop/orders.json").write_text("[]")
Path("drop/returns.csv").write_text("id\n")
print(csv_names("drop"))
`,
      answer: src`
from pathlib import Path

def csv_names(folder):
    names = []
    for path in sorted(Path(folder).iterdir()):
        if path.suffix == ".csv":
            names.append(path.name)
    return names

Path("drop").mkdir()
Path("drop/orders.csv").write_text("id\n1\n")
Path("drop/orders.json").write_text("[]")
Path("drop/returns.csv").write_text("id\n")
print(csv_names("drop"))
`,
      wrong: [
        {
          code: src`
def csv_names(folder):
    return ["orders.csv", "returns.csv"]
`,
          fails: ["other-folder"],
          why: "the names are typed in, so a different folder gets the wrong answer",
        },
      ],
      hints: [
        "The loop already visits every entry; only some names should be appended.",
        "Each `path` knows its own suffix.",
        "Put an `if` around the `append` that compares the path's suffix with `\".csv\"`.",
      ],
      task: {
        checks: [
          expr("returns", "csv_names() keeps the CSV files of the demo folder", `${makeFolder("t_try1", { "orders.csv": "id\n", "orders.json": "[]", "returns.csv": "id\n" })}\nresult = csv_names("t_try1")`, ["orders.csv", "returns.csv"], { show: "csv_names(\"drop\")" }),
          expr("other-folder", "csv_names() works for another folder", `${makeFolder("t_try2", { "b.csv": "x", "a.csv": "y", "c.txt": "z", "d.csv.bak": "w" })}\nresult = csv_names("t_try2")`, ["a.csv", "b.csv"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The largest export",
        prompt: "Before uploading, a script checks the biggest file of one type. Write `largest_file(folder, suffix)`: return the **name** of the largest file in `folder` (not in subfolders) whose suffix matches `suffix`, ignoring capital letters on both. On a tie in size, return the name that sorts first. Return `None` when no file matches.",
        spec: [
          ["Function", "`largest_file(folder, suffix)`"],
          ["suffix", "a suffix with its dot, e.g. `\".csv\"` or `\".CSV\"`"],
          ["Returns", "one file name, or `None`"],
          ["Rules", "files only (a folder named `old.csv` doesn't count); size is `stat().st_size`; ties go to the alphabetically first name"],
          ["Example", "a folder with `small.csv` (10 bytes), `big.CSV` (50 bytes) and `huge.json` (900 bytes): `largest_file(folder, \".csv\")` → `'big.CSV'`"],
        ],
        starter: src`
from pathlib import Path

def largest_file(folder, suffix):
    return None

Path("uploads").mkdir()
Path("uploads/small.csv").write_text("x" * 10)
Path("uploads/big.CSV").write_text("x" * 50)
Path("uploads/huge.json").write_text("x" * 900)
print(largest_file("uploads", ".csv"))
`,
        answer: src`
from pathlib import Path

def largest_file(folder, suffix):
    best = None
    best_size = -1
    for path in sorted(Path(folder).iterdir()):
        if not path.is_file() or path.suffix.lower() != suffix.lower():
            continue
        size = path.stat().st_size
        if size > best_size:
            best = path.name
            best_size = size
    return best

Path("uploads").mkdir()
Path("uploads/small.csv").write_text("x" * 10)
Path("uploads/big.CSV").write_text("x" * 50)
Path("uploads/huge.json").write_text("x" * 900)
print(largest_file("uploads", ".csv"))
`,
        alternatives: [
          src`
from pathlib import Path

def largest_file(folder, suffix):
    sizes = {}
    for path in Path(folder).iterdir():
        if path.is_file() and path.suffix.lower() == suffix.lower():
            sizes[path.name] = path.stat().st_size
    if not sizes:
        return None
    biggest = max(sizes.values())
    return sorted(name for name in sizes if sizes[name] == biggest)[0]
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def largest_file(folder, suffix):
    best = None
    best_size = -1
    for path in sorted(Path(folder).iterdir()):
        if path.is_file() and path.suffix == suffix:
            if path.stat().st_size > best_size:
                best = path.name
                best_size = path.stat().st_size
    return best
`,
            fails: ["demo", "capitals"],
            why: "the suffix is compared exactly, so `big.CSV` is missed when asked for `.csv`",
          },
          {
            code: src`
from pathlib import Path

def largest_file(folder, suffix):
    best = None
    best_size = -1
    for path in sorted(Path(folder).iterdir()):
        if path.suffix.lower() == suffix.lower() and path.stat().st_size >= best_size:
            best = path.name
            best_size = path.stat().st_size
    return best
`,
            fails: ["tie", "folders"],
            why: "`>=` hands a tie to the later name, and a folder named `….csv` is treated as a file",
          },
        ],
        hints: [
          "Keep a running best: the best name so far and its size, starting from `None` and a size no file can have.",
          "Skip entries that aren't files, and compare `path.suffix.lower()` with `suffix.lower()`.",
          "Walk the paths in sorted order and replace the best only when a size is strictly larger; then the first name wins a tie.",
        ],
        task: {
          checks: [
            expr("demo", "largest_file() finds big.CSV in the starter's folder", `${makeFolder("t_c1a", { "small.csv": "x".repeat(10), "big.CSV": "x".repeat(50), "huge.json": "x".repeat(900) })}\nresult = largest_file("t_c1a", ".csv")`, "big.CSV", { show: "largest_file(\"uploads\", \".csv\")" }),
            expr("no-match", "largest_file() returns None when nothing matches", `${makeFolder("t_c1b", { "a.txt": "abc" })}\nresult = largest_file("t_c1b", ".csv")`, null, { show: "largest_file(<a folder with only a.txt>, \".csv\")" }),
            expr("capitals", "Capital letters in the requested suffix", `${makeFolder("t_c1c", { "jan.csv": "x".repeat(5), "feb.csv": "x".repeat(8) })}\nresult = largest_file("t_c1c", ".CSV")`, "feb.csv", { hidden: true }),
            expr("tie", "Two files of the same size", `${makeFolder("t_c1d", { "west.csv": "x".repeat(20), "east.csv": "x".repeat(20), "north.csv": "x".repeat(3) })}\nresult = largest_file("t_c1d", ".csv")`, "east.csv", { hidden: true }),
            expr("folders", "A subfolder whose name ends in the suffix", `${makeFolder("t_c1e", { "real.csv": "x".repeat(4), "old.csv/inner.csv": "x".repeat(400) })}\nresult = largest_file("t_c1e", ".csv")`, "real.csv", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Exports grouped by month",
        prompt: "Monthly exports are named `<kind>-<year>-<month>.csv` (`invoices-2010-12.csv`, `returns-2010-12.csv`) and are spread over subfolders. Write `files_by_month(folder)`: search `folder` and all its subfolders for `.csv` files and return a dictionary from `\"YYYY-MM\"` to the sorted list of file names for that month. Ignore CSV files whose name doesn't end in a 4-digit year and a 2-digit month.",
        spec: [
          ["Function", "`files_by_month(folder)`"],
          ["Returns", "`{\"2010-12\": [\"invoices-2010-12.csv\", \"returns-2010-12.csv\"], …}`; `{}` when there are none"],
          ["Name rule", "split the stem on `-`: it needs at least three parts, the second-to-last is 4 digits and the last is 2 digits"],
          ["Example", "a tree with `2010/invoices-2010-12.csv`, `2010/returns-2010-12.csv`, `2011/invoices-2011-01.csv` and `summary.csv` → `{'2010-12': ['invoices-2010-12.csv', 'returns-2010-12.csv'], '2011-01': ['invoices-2011-01.csv']}`"],
        ],
        starter: src`
from pathlib import Path

def files_by_month(folder):
    months = {}
    return months

for name in ["2010/invoices-2010-12.csv", "2010/returns-2010-12.csv", "2011/invoices-2011-01.csv", "summary.csv"]:
    path = Path("monthly") / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("Invoice,Quantity\n")
print(files_by_month("monthly"))
`,
        answer: src`
from pathlib import Path

def month_of(stem):
    parts = stem.split("-")
    if len(parts) < 3:
        return None
    year = parts[-2]
    month = parts[-1]
    if len(year) == 4 and year.isdigit() and len(month) == 2 and month.isdigit():
        return year + "-" + month
    return None

def files_by_month(folder):
    months = {}
    for path in sorted(Path(folder).rglob("*.csv")):
        month = month_of(path.stem)
        if month is None:
            continue
        if month not in months:
            months[month] = []
        months[month].append(path.name)
    for month in months:
        months[month] = sorted(months[month])
    return months

for name in ["2010/invoices-2010-12.csv", "2010/returns-2010-12.csv", "2011/invoices-2011-01.csv", "summary.csv"]:
    path = Path("monthly") / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("Invoice,Quantity\n")
print(files_by_month("monthly"))
`,
        alternatives: [
          src`
from pathlib import Path

def files_by_month(folder):
    months = {}
    for path in Path(folder).rglob("*.csv"):
        parts = path.stem.split("-")
        if len(parts) >= 3 and len(parts[-2]) == 4 and parts[-2].isdigit() and len(parts[-1]) == 2 and parts[-1].isdigit():
            key = f"{parts[-2]}-{parts[-1]}"
            months[key] = sorted(months.get(key, []) + [path.name])
    return months
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def files_by_month(folder):
    months = {}
    for path in sorted(Path(folder).glob("*.csv")):
        parts = path.stem.split("-")
        if len(parts) >= 3 and parts[-2].isdigit() and parts[-1].isdigit():
            key = parts[-2] + "-" + parts[-1]
            if key not in months:
                months[key] = []
            months[key].append(path.name)
    return months
`,
            fails: ["demo", "nested", "other-names"],
            why: "`glob` looks only in the top folder, so the exports in the year folders are never found",
          },
          {
            code: src`
from pathlib import Path

def files_by_month(folder):
    months = {}
    for path in sorted(Path(folder).rglob("*.csv")):
        parts = path.stem.split("-")
        key = parts[-2] + "-" + parts[-1]
        if key not in months:
            months[key] = []
        months[key].append(path.name)
    return months
`,
            fails: ["demo", "other-names"],
            why: "names that don't follow the pattern crash with IndexError or are filed under a made-up month",
          },
        ],
        hints: [
          "This is grouping (see Collection Algorithms) over a file search: one dictionary, a list per month, appended to as files are found.",
          "`rglob(\"*.csv\")` finds CSVs in subfolders too. Work out the month from `path.stem`, not the whole name, so the `.csv` isn't in the way.",
          "Write a small helper that returns the `\"YYYY-MM\"` text or `None`, checking the number of parts, their lengths and `isdigit()`. Sort each month's list before returning.",
        ],
        task: {
          checks: [
            expr("demo", "files_by_month() groups the starter's tree", `${makeFolder("t_c2a", { "2010/invoices-2010-12.csv": "a", "2010/returns-2010-12.csv": "b", "2011/invoices-2011-01.csv": "c", "summary.csv": "d" })}\nresult = files_by_month("t_c2a")`, { "2010-12": ["invoices-2010-12.csv", "returns-2010-12.csv"], "2011-01": ["invoices-2011-01.csv"] }, { show: "files_by_month(\"monthly\")" }),
            expr("empty", "files_by_month() returns {} for an empty folder", `${makeFolder("t_c2b", {})}\nresult = files_by_month("t_c2b")`, {}, { show: "files_by_month(<an empty folder>)" }),
            expr("nested", "Exports several folders deep", `${makeFolder("t_c2c", { "eu/fr/2011/sales-2011-03.csv": "a", "eu/de/sales-2011-03.csv": "b", "us/sales-2011-02.csv": "c" })}\nresult = files_by_month("t_c2c")`, { "2011-03": ["sales-2011-03.csv", "sales-2011-03.csv"], "2011-02": ["sales-2011-02.csv"] }, { hidden: true }),
            expr("other-names", "CSV and other files that don't follow the pattern", `${makeFolder("t_c2d", { "notes.csv": "a", "q-4.csv": "b", "report-2010-1.csv": "c", "credit-notes-2010-12.csv": "d", "invoices-2010-12.txt": "e" })}\nresult = files_by_month("t_c2d")`, { "2010-12": ["credit-notes-2010-12.csv"] }, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import Path

backup = Path("archive.tar.gz")
print(backup.suffix, backup.stem)
`,
        choices: [".gz archive.tar", ".tar.gz archive", "gz archive.tar", ".gz archive"],
        answer: 0,
        why: "`.suffix` is only the last dot-part, and `.stem` is everything before it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting `glob` to search subfolders. What does this print?",
        program: src`
from pathlib import Path

Path("data/2011").mkdir(parents=True)
Path("data/2011/january.csv").write_text("Invoice\n")
Path("data/totals.csv").write_text("total\n")
print(len(list(Path("data").glob("*.csv"))), len(list(Path("data").rglob("*.csv"))))
`,
        choices: ["1 2", "2 2", "1 1", "0 2"],
        answer: 0,
        why: "`glob(\"*.csv\")` matches entries directly inside `data` (only `totals.csv`). `rglob` also walks into `2011`.",
      },
      {
        id: "q3",
        prompt: "Why do the examples wrap `iterdir()` and `glob()` in `sorted(...)`?",
        choices: [
          "The operating system returns entries in no fixed order, so the same folder can list differently on another computer",
          "`iterdir()` returns the newest file first",
          "Without sorting, `glob` skips hidden files",
          "`sorted` removes the folders from the listing",
        ],
        answer: 0,
        why: "Sorting makes the output and the order of any changes the same everywhere, which also makes the script testable.",
      },
    ],
    review: [
      "`iterdir()` lists a folder (files and subfolders); `glob(pattern)` matches in one folder; `rglob(pattern)` searches below it too.",
      "`.name`, `.stem`, `.suffix`, `.is_file()` and `.stat().st_size` describe each path.",
      "Sort listings before using them, and compare suffixes in lower case.",
      "Next: settings that come from the environment instead of the command line.",
    ],
  },

  // ------------------------------------------------------------------ PY-L23-03 environment variables
  {
    id: "PY-L23-03",
    version: 2,
    slug: "a-setting-in-the-environment",
    title: "Settings from environment variables",
    lede: "Some settings belong to the machine, not to one run: where reports go, an API key, whether to send emails. Environment variables carry them, always as text, and a script reads them with a default.",
    focus: "Read settings from environment variables with defaults, convert them from text, and decide which source wins.",
    minutes: 18,
    objectives: [
      "Read a variable with `os.environ.get(name, default)` and explain why `os.environ[name]` can fail",
      "Convert the text to the type the program needs, and treat \"0\" and \"no\" as off",
      "Combine sources in a clear order: command line, then environment, then a default",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conversion", "dict-get", "dict-literal", "dict-lookup", "else-clause", "except-type", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-check", "string-format", "string-index", "string-method", "top-level-indent", "truthiness", "try-except"],
    teaches: ["env-read"],
    blocks: [
      {
        kind: "text",
        md: "Every running program receives a set of named text values from whatever started it: the **environment**. A shell sets one for a single run with `REPORT_LIMIT=50 python report.py`, or for the whole session with `export REPORT_LIMIT=50`. Servers and schedulers set them in their configuration. They suit settings that differ per machine (a folder, a database address) and secrets that shouldn't be typed on a command line where they end up in the shell's history.\n\nPython shows the environment as `os.environ`, which behaves like a dictionary from text to text. Assigning to it, as the first line below does, sets a variable for this program (and any program it starts), just as the shell would have.",
      },
      {
        kind: "example",
        title: "Reading with and without a default",
        code: src`
import os

os.environ["EXPORT_FOLDER"] = "exports/daily"
print(os.environ["EXPORT_FOLDER"])
print(os.environ.get("EXPORT_BATCH_LIMIT"))
print(os.environ.get("EXPORT_BATCH_LIMIT", "25"))
limit = int(os.environ.get("EXPORT_BATCH_LIMIT", "25"))
print(limit + 5)
`,
        output: "exports/daily\nNone\n25\n30\n",
        note: "`get` returns `None`, or the default you give, when the variable isn't set. Every value is text, so a number has to go through `int` before arithmetic. Giving the default as text (`\"25\"`) means one `int(...)` handles both cases.",
      },
      {
        kind: "error-example",
        title: "Square brackets on a missing variable",
        code: src`
import os

folder = os.environ["EXPORT_ARCHIVE_FOLDER"]
print("archiving to", folder)
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: 'EXPORT_ARCHIVE_FOLDER'`. Brackets are right only for a variable the program can't run without, and then a clear message is kinder: catch the KeyError and raise an error that says which variable to set.",
      },
      {
        kind: "text",
        md: "A function that reads settings is easier to test when it takes the environment as a parameter. The program passes `os.environ`; a test passes an ordinary dictionary, so it doesn't depend on what happens to be set on the machine running it.\n\nOn/off settings need care. Every non-empty text is true in an `if`, including `\"0\"` and `\"no\"`, so compare against the words that mean *on* after `strip()` and `lower()`.",
      },
      {
        kind: "example",
        title: "All of a report's settings in one place",
        code: src`
def load_settings(env):
    limit = int(env.get("REPORT_LIMIT", "25"))
    send = env.get("SEND_EMAIL", "no").strip().lower()
    return {
        "folder": env.get("REPORT_FOLDER", "reports"),
        "limit": limit,
        "send_email": send in ["1", "true", "yes", "on"],
    }

print(load_settings({}))
print(load_settings({"REPORT_LIMIT": "100", "SEND_EMAIL": " Yes ", "REPORT_FOLDER": "/srv/reports"}))
print(load_settings({"SEND_EMAIL": "0"}))
`,
        output: "{'folder': 'reports', 'limit': 25, 'send_email': False}\n{'folder': '/srv/reports', 'limit': 100, 'send_email': True}\n{'folder': 'reports', 'limit': 25, 'send_email': False}\n",
        note: "In the real script this is `load_settings(os.environ)`. `\"0\"` gives `False` because it isn't one of the *on* words, even though `\"0\"` on its own is a true value in an `if`.",
      },
      {
        kind: "text",
        md: "**When to use it:** for settings that belong to the machine or the deployment, and for secrets. A value someone chooses per run belongs on the command line instead. When both exist, the usual order is: an explicit command-line value wins, then the environment, then the default in the code.\n\n**Mistakes to avoid:** `os.environ[name]` for an optional setting (KeyError when it's missing); using the text without converting it (`\"10\" > \"9\"` is False, because text compares letter by letter); and `if env.get(\"DEBUG\"):`, which is true for `\"0\"`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A batch size that is a number",
      prompt: "`batch_size` returns the default 500 when `BATCH_SIZE` isn't set, but the text when it is, so `batch_size(env) * 2` repeats the text. Make it always return a whole number.",
      spec: [
        ["Function", "`batch_size(env)`"],
        ["Returns", "`BATCH_SIZE` as an `int`, or 500 when it isn't set"],
      ],
      starter: src`
def batch_size(env):
    return env.get("BATCH_SIZE", 500)

print(batch_size({}) * 2)
print(batch_size({"BATCH_SIZE": "200"}) * 2)
`,
      answer: src`
def batch_size(env):
    return int(env.get("BATCH_SIZE", "500"))

print(batch_size({}) * 2)
print(batch_size({"BATCH_SIZE": "200"}) * 2)
`,
      wrong: [
        {
          code: src`
def batch_size(env):
    return int(env["BATCH_SIZE"])
`,
          fails: ["returns"],
          why: "square brackets raise KeyError when the variable isn't set",
        },
      ],
      hints: [
        "The value from the environment is always text; only the default is a number.",
        "One conversion can cover both cases if the default is given the same way the environment gives values.",
        "Wrap the whole `get(...)` in `int(...)`.",
      ],
      task: {
        checks: [
          fn("returns", "batch_size", [
            example([{ BATCH_SIZE: "200" }], 200),
            hiddenCase("the variable is not set", [{}], 500),
            hiddenCase("other variables are set", [{ BATCH_DELAY: "3", BATCH_SIZE: "75" }], 75),
          ], { label: "batch_size() returns a whole number" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An on/off switch",
        prompt: "Write `read_flag(env, name)` for on/off settings such as `DRY_RUN` or `SEND_EMAIL`. After removing spaces at the ends and ignoring capital letters: `1`, `true`, `yes` and `on` mean on; `0`, `false`, `no`, `off`, an empty value, or the variable not being set at all mean off. Anything else is a mistake in the configuration: raise `ValueError`, naming the variable in the message.",
        spec: [
          ["Function", "`read_flag(env, name)`"],
          ["env", "a dictionary of text values (the program passes `os.environ`)"],
          ["Returns", "`True` or `False`"],
          ["Raises", "`ValueError` for any other value, e.g. `DRY_RUN='maybe'`"],
          ["Example", "`read_flag({\"DRY_RUN\": \" Yes\"}, \"DRY_RUN\")` → `True`; `read_flag({}, \"DRY_RUN\")` → `False`"],
        ],
        starter: src`
def read_flag(env, name):
    return False

print(read_flag({"DRY_RUN": " Yes"}, "DRY_RUN"))
print(read_flag({"DRY_RUN": "0"}, "DRY_RUN"))
print(read_flag({}, "DRY_RUN"))
`,
        answer: src`
def read_flag(env, name):
    value = env.get(name, "").strip().lower()
    if value in ["1", "true", "yes", "on"]:
        return True
    if value in ["", "0", "false", "no", "off"]:
        return False
    raise ValueError(f"{name} must be on or off, got {env[name]!r}")

print(read_flag({"DRY_RUN": " Yes"}, "DRY_RUN"))
print(read_flag({"DRY_RUN": "0"}, "DRY_RUN"))
print(read_flag({}, "DRY_RUN"))
`,
        alternatives: [
          src`
ON = ["1", "true", "yes", "on"]
OFF = ["0", "false", "no", "off"]

def read_flag(env, name):
    if name not in env:
        return False
    value = env[name].lower().strip()
    if value == "" or value in OFF:
        return False
    if value in ON:
        return True
    raise ValueError("bad value for " + name)
`,
        ],
        wrong: [
          {
            code: src`
def read_flag(env, name):
    if env.get(name):
        return True
    return False
`,
            fails: ["returns", "refuses", "message"],
            why: "any non-empty text is true, so `\"0\"` and `\"no\"` switch the setting on",
          },
          {
            code: src`
def read_flag(env, name):
    value = env.get(name, "").strip().lower()
    return value in ["1", "true", "yes", "on"]
`,
            fails: ["refuses", "message"],
            why: "a typo such as `ture` silently means off instead of being reported",
          },
          {
            code: src`
def read_flag(env, name):
    value = env.get(name, "")
    if value in ["1", "true", "yes", "on"]:
        return True
    if value in ["", "0", "false", "no", "off"]:
        return False
    raise ValueError(name)
`,
            fails: ["returns"],
            why: "` Yes` and `TRUE` are refused because spaces and capitals are not removed first",
          },
        ],
        hints: [
          "Read the value with a default that counts as off, then tidy it with `strip` and `lower`.",
          "Two lists of accepted words, one for on and one for off; check membership in each.",
          "If the value is in neither list, it is a configuration mistake: `raise ValueError(...)` with the variable's name in the message.",
        ],
        task: {
          checks: [
            fn("returns", "read_flag", [
              example([{ DRY_RUN: " Yes" }, "DRY_RUN"], true),
              example([{ DRY_RUN: "0" }, "DRY_RUN"], false),
              example([{}, "DRY_RUN"], false),
              hiddenCase("capital letters for on", [{ SEND_EMAIL: "TRUE" }, "SEND_EMAIL"], true),
              hiddenCase("an empty value", [{ SEND_EMAIL: "" }, "SEND_EMAIL"], false),
              hiddenCase("off written as a word", [{ SEND_EMAIL: "Off " }, "SEND_EMAIL"], false),
              hiddenCase("another variable is on", [{ DRY_RUN: "1" }, "SEND_EMAIL"], false),
            ], { label: "read_flag() reads on and off words" }),
            fn("refuses", "read_flag", [
              raisesCase([{ DRY_RUN: "maybe" }, "DRY_RUN"], "ValueError"),
              raisesCase([{ DRY_RUN: "ture" }, "DRY_RUN"], "ValueError", { label: "a misspelled word" }),
            ], { label: "read_flag() refuses values that are neither on nor off" }),
            {
              kind: "expr",
              id: "message",
              label: "The ValueError message names the variable",
              hidden: true,
              expr: "try:\n    read_flag({'SEND_EMAIL': 'later'}, 'SEND_EMAIL')\n    result = None\nexcept ValueError as _e:\n    result = 'SEND_EMAIL' in str(_e)",
              expected: py.bool(true),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Which limit wins",
        prompt: "A report takes its row limit from three places. Write `choose_limit(cli_limit, env)`: if `cli_limit` is not `None` (the user passed `--limit`), use it. Otherwise use `REPORT_LIMIT` from `env` if it is set and not blank. Otherwise use 25. A value from the environment that isn't a whole number must raise `ValueError` with a message naming `REPORT_LIMIT`; so must any chosen limit below 1.",
        spec: [
          ["Function", "`choose_limit(cli_limit, env)`"],
          ["cli_limit", "an `int` from argparse, or `None` when `--limit` wasn't given"],
          ["Returns", "the limit as an `int`"],
          ["Raises", "`ValueError` for `REPORT_LIMIT=\"ten\"` and for a limit of 0 or less, from either source"],
          ["Example", "`choose_limit(None, {\"REPORT_LIMIT\": \" 40 \"})` → `40`; `choose_limit(10, {\"REPORT_LIMIT\": \"40\"})` → `10`"],
        ],
        starter: src`
def choose_limit(cli_limit, env):
    return 25

print(choose_limit(None, {"REPORT_LIMIT": " 40 "}))
print(choose_limit(10, {"REPORT_LIMIT": "40"}))
print(choose_limit(None, {}))
`,
        answer: src`
def choose_limit(cli_limit, env):
    if cli_limit is not None:
        limit = cli_limit
    else:
        text = env.get("REPORT_LIMIT", "").strip()
        if text == "":
            limit = 25
        else:
            try:
                limit = int(text)
            except ValueError:
                raise ValueError(f"REPORT_LIMIT must be a whole number, got {text!r}")
    if limit < 1:
        raise ValueError(f"the limit must be at least 1 (REPORT_LIMIT or --limit), got {limit}")
    return limit

print(choose_limit(None, {"REPORT_LIMIT": " 40 "}))
print(choose_limit(10, {"REPORT_LIMIT": "40"}))
print(choose_limit(None, {}))
`,
        alternatives: [
          src`
def from_env(env):
    text = env.get("REPORT_LIMIT", "").strip()
    if not text:
        return None
    if not text.lstrip("-").isdigit():
        raise ValueError("REPORT_LIMIT is not a whole number: " + text)
    return int(text)

def choose_limit(cli_limit, env):
    limit = cli_limit
    if limit is None:
        limit = from_env(env)
    if limit is None:
        limit = 25
    if limit <= 0:
        raise ValueError("REPORT_LIMIT / --limit must be positive")
    return limit
`,
        ],
        wrong: [
          {
            code: src`
def choose_limit(cli_limit, env):
    if cli_limit:
        return cli_limit
    return int(env.get("REPORT_LIMIT", "25"))
`,
            fails: ["returns", "refuses", "message"],
            why: "`if cli_limit:` ignores `--limit 0` instead of refusing it, and a blank variable crashes in `int(\"\")` with a message that doesn't say which setting is wrong",
          },
          {
            code: src`
def choose_limit(cli_limit, env):
    text = env.get("REPORT_LIMIT", "").strip()
    if text:
        limit = int(text)
    elif cli_limit is not None:
        limit = cli_limit
    else:
        limit = 25
    if limit < 1:
        raise ValueError("REPORT_LIMIT too small")
    return limit
`,
            fails: ["returns", "refuses", "message"],
            why: "the environment beats the command line, so a user's `--limit` is ignored on a machine that sets REPORT_LIMIT",
          },
        ],
        hints: [
          "Decide the source first (command line, then environment, then 25), and only then check that the result is at least 1.",
          "`None` means \"not given\", but 0 is a real value someone typed, so test `is not None` rather than truthiness.",
          "Turn the environment text into a number inside `try`, and in the `except ValueError` raise a new ValueError whose message names REPORT_LIMIT.",
        ],
        task: {
          checks: [
            fn("returns", "choose_limit", [
              example([null, { REPORT_LIMIT: " 40 " }], 40),
              example([10, { REPORT_LIMIT: "40" }], 10),
              example([null, {}], 25),
              hiddenCase("a blank environment value", [null, { REPORT_LIMIT: "   " }], 25),
              hiddenCase("a command-line value with no environment", [3, {}], 3),
              hiddenCase("a limit of exactly 1", [null, { REPORT_LIMIT: "1" }], 1),
            ], { label: "choose_limit() picks command line, then environment, then 25" }),
            fn("refuses", "choose_limit", [
              raisesCase([null, { REPORT_LIMIT: "ten" }], "ValueError"),
              raisesCase([0, { REPORT_LIMIT: "40" }], "ValueError", { label: "--limit 0" }),
              raisesCase([null, { REPORT_LIMIT: "-5" }], "ValueError", { label: "a negative environment value" }),
              raisesCase([null, { REPORT_LIMIT: "12.5" }], "ValueError", { label: "a decimal in the environment" }),
            ], { label: "choose_limit() refuses limits that aren't whole numbers of at least 1" }),
            {
              kind: "expr",
              id: "message",
              label: "The message for a bad environment value names REPORT_LIMIT",
              hidden: true,
              expr: "try:\n    choose_limit(None, {'REPORT_LIMIT': 'lots'})\n    result = None\nexcept ValueError as _e:\n    result = 'REPORT_LIMIT' in str(_e)",
              expected: py.bool(true),
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
env = {"RETRIES": "3"}
print(env.get("RETRIES", 5) * 2, env.get("TIMEOUT", 5) * 2)
`,
        choices: ["33 10", "6 10", "33 55", "6 55"],
        answer: 0,
        why: "`RETRIES` is set, so `get` returns its text `\"3\"`, and text times 2 repeats it. `TIMEOUT` is missing, so `get` returns the default, the number 5.",
      },
      {
        id: "q2",
        prompt: "A common mistake: testing an on/off variable with a bare `if`. What does this print?",
        program: src`
env = {"DEBUG": "0"}
if env.get("DEBUG"):
    print("debug on")
else:
    print("debug off")
`,
        choices: ["debug on", "debug off", "KeyError", "nothing"],
        answer: 0,
        why: "`\"0\"` is a non-empty text, and every non-empty text is true. Compare the tidied value with the words that mean on instead.",
      },
      {
        id: "q3",
        prompt: "Which value belongs in an environment variable rather than a command-line option?",
        choices: [
          "The database password the nightly job uses on the server",
          "Which month's report to build this time",
          "Whether this one run should skip sending emails",
          "The input file to read",
        ],
        answer: 0,
        why: "A secret that belongs to the machine shouldn't be typed into a command, where it is saved in the shell history and visible to other users. Per-run choices are what options are for.",
      },
    ],
    review: [
      "`os.environ.get(name, default)` reads a setting; brackets raise KeyError when it's missing.",
      "Environment values are always text: convert numbers, and compare on/off words after `strip` and `lower`.",
      "Take the environment as a parameter, and use a clear order: command line, environment, default.",
      "Next: starting other programs from Python, and keeping that call replaceable.",
    ],
  },

  // ------------------------------------------------------------------ PY-L23-04 subprocess
  {
    id: "PY-L23-04",
    version: 2,
    slug: "run-another-program",
    title: "Run other programs with subprocess",
    lede: "Automation often means running tools that already exist, such as git, a backup command or a test runner, and acting on how they finished. subprocess.run does that and returns a CompletedProcess you can inspect.",
    focus: "Call other programs with subprocess.run, read the CompletedProcess it returns, and keep the call replaceable.",
    minutes: 20,
    objectives: [
      "Read a `CompletedProcess`: `returncode`, `stdout`, `stderr`, and `check_returncode()`",
      "Explain why the command is a list of words and what `capture_output`, `text` and `check` change",
      "Pass the runner in as a parameter so the logic around it can be exercised with a stand-in",
    ],
    requires: ["arithmetic", "assignment", "boolean", "break-statement", "comparison", "continue-statement", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "membership", "module-file", "newline-escape", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "star-kwargs", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "try-except", "unquoted-name"],
    teaches: ["subprocess-run"],
    blocks: [
      {
        kind: "text",
        md: "On a computer, `subprocess.run` starts another program, waits for it to finish, and returns a **CompletedProcess**. A typical call:\n\n`subprocess.run([\"git\", \"status\", \"--porcelain\"], capture_output=True, text=True)`\n\nThe command is a **list of words**: the program, then each argument. Python passes them to the program exactly as they are, so a file name with spaces or a `;` in user input can't turn into a second command. `capture_output=True` keeps what the program printed instead of letting it go to the terminal, and `text=True` gives it back as text rather than bytes.\n\nThe result has four parts: `args` (the command), `returncode` (0 means success; anything else is the program's way of saying it failed), `stdout` and `stderr`. `run` does **not** raise when the program fails: you check `returncode`, or pass `check=True` to get a `CalledProcessError` instead. A CompletedProcess is an ordinary object you can also build yourself, which is what this example does to show what a successful and a failed git call give back.",
      },
      {
        kind: "example",
        title: "Two results: success and failure",
        code: src`
import subprocess

ok = subprocess.CompletedProcess(["git", "status", "--porcelain"], 0, stdout=" M report.py\n?? notes.txt\n", stderr="")
failed = subprocess.CompletedProcess(["git", "status"], 128, stdout="", stderr="fatal: not a git repository\n")

print(ok.returncode, ok.stdout.splitlines())
print(failed.returncode, failed.stderr.strip())
try:
    failed.check_returncode()
except subprocess.CalledProcessError as err:
    print("check failed with code", err.returncode, "for", err.cmd)
`,
        output: "0 [' M report.py', '?? notes.txt']\n128 fatal: not a git repository\ncheck failed with code 128 for ['git', 'status']\n",
        note: "`check_returncode()` does nothing for code 0 and raises `CalledProcessError` otherwise; `run(..., check=True)` makes the same check for you. git's own output format is documented by git: each `--porcelain` line is two status letters, a space and the path.",
      },
      {
        kind: "text",
        md: "Starting a program needs an operating system that can start processes. A web page has none, so in this browser the call itself fails with `OSError` before any program runs. On your own computer the same line prints git's version.",
      },
      {
        kind: "error-example",
        title: "Calling git from the browser",
        code: src`
import subprocess

result = subprocess.run(["git", "--version"], capture_output=True, text=True)
print(result.stdout)
`,
        error: "OSError",
        output: "",
        note: "Here: `OSError: [Errno 138] emscripten does not support processes.` On a machine with git installed, `result.stdout` is something like `git version 2.43.0`. Either way, the lesson for automation code is the same: keep the call to the other program in one place you can replace.",
      },
      {
        kind: "text",
        md: "So write the logic around the call as a function that **receives** the runner: `def current_branch(run=subprocess.run)`. In real use nothing changes, because the default is the real `subprocess.run`. In a test (and in this browser) you pass a **stand-in**: a small function that accepts the same arguments and returns a `CompletedProcess` with the answer you want to try. The code under test can't tell the difference, so its decisions (parsing the output, reacting to a failure) are exercised for real.",
      },
      {
        kind: "example",
        title: "The current git branch, with a stand-in",
        code: src`
import subprocess

def current_branch(run=subprocess.run):
    result = run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("git failed: " + result.stderr.strip())
    return result.stdout.strip()

def git_on_main(args, **options):
    print("asked to run:", args, options)
    return subprocess.CompletedProcess(args, 0, stdout="main\n", stderr="")

def git_outside_repo(args, **options):
    return subprocess.CompletedProcess(args, 128, stdout="", stderr="fatal: not a git repository\n")

print(current_branch(run=git_on_main))
try:
    current_branch(run=git_outside_repo)
except RuntimeError as err:
    print(err)
`,
        output: "asked to run: ['git', 'rev-parse', '--abbrev-ref', 'HEAD'] {'capture_output': True, 'text': True}\nmain\ngit failed: fatal: not a git repository\n",
        note: "`**options` collects the keyword arguments (see Advanced Functions & Recursion), so the stand-in accepts whatever `run` would. On your machine `current_branch()` runs the real git. Both outcomes of the function were exercised without starting a program.",
      },
      {
        kind: "text",
        md: "**When to use it:** calling tools that already do the job (git, a compressor, a database dump) from a Python script that decides what to run and what to do with the result.\n\n**Mistakes to avoid:** building one command string from user input and passing `shell=True` (a name like `x; rm -rf ~` becomes a second command); forgetting `capture_output=True` and then finding `result.stdout` is `None`; and ignoring `returncode`, so a failed backup looks like a successful one.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Did it succeed?",
      prompt: "`succeeded` decides whether a command worked by looking for output, but many tools print nothing when they succeed and print plenty when they fail. Make it look at the return code instead.",
      spec: [
        ["Function", "`succeeded(result)`"],
        ["result", "a `subprocess.CompletedProcess`"],
        ["Returns", "`True` exactly when the program finished with return code 0"],
      ],
      starter: src`
import subprocess

def succeeded(result):
    return result.stdout != ""

quiet_ok = subprocess.CompletedProcess(["gzip", "orders.csv"], 0, stdout="", stderr="")
loud_failure = subprocess.CompletedProcess(["gzip", "missing.csv"], 1, stdout="", stderr="gzip: missing.csv: No such file or directory\n")
print(succeeded(quiet_ok), succeeded(loud_failure))
`,
      answer: src`
import subprocess

def succeeded(result):
    return result.returncode == 0

quiet_ok = subprocess.CompletedProcess(["gzip", "orders.csv"], 0, stdout="", stderr="")
loud_failure = subprocess.CompletedProcess(["gzip", "missing.csv"], 1, stdout="", stderr="gzip: missing.csv: No such file or directory\n")
print(succeeded(quiet_ok), succeeded(loud_failure))
`,
      wrong: [
        {
          code: src`
def succeeded(result):
    return result.stderr == ""
`,
          fails: ["warning-ok"],
          why: "a tool can print a warning on stderr and still succeed",
        },
      ],
      hints: [
        "Output is not a reliable signal: look at the part of the result that exists for exactly this question.",
        "Every CompletedProcess has a `returncode`.",
        "Return whether `returncode` equals 0.",
      ],
      task: {
        checks: [
          expr("quiet", "A silent success counts as success", "import subprocess as _sp\nresult = succeeded(_sp.CompletedProcess(['gzip', 'orders.csv'], 0, stdout='', stderr=''))", true, { show: "succeeded(<code 0, no output>)" }),
          expr("failure", "A failure with output counts as failure", "import subprocess as _sp\nresult = succeeded(_sp.CompletedProcess(['gzip', 'x'], 1, stdout='trying x\\n', stderr='gzip: x: No such file\\n'))", false, { show: "succeeded(<code 1, some output>)" }),
          expr("warning-ok", "A success that printed a warning", "import subprocess as _sp\nresult = succeeded(_sp.CompletedProcess(['tar', 'cf', 'a.tar', 'a'], 0, stdout='', stderr='tar: removing leading /\\n'))", true, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Files git says have changed",
        prompt: "Write `changed_files(run)`: call `run([\"git\", \"status\", \"--porcelain\"], capture_output=True, text=True)` and return the paths it lists, in order. Each line of the output is two status characters, one space, then the path (which may contain spaces). If git's return code isn't 0, raise `RuntimeError` with git's error text (stripped) as the message.",
        spec: [
          ["Function", "`changed_files(run)`"],
          ["run", "`subprocess.run`, or a stand-in that takes the same arguments and returns a `CompletedProcess`"],
          ["Returns", "a list of paths, e.g. `[' M report.py', '?? notes.txt']` gives `['report.py', 'notes.txt']`; `[]` when nothing changed"],
          ["Raises", "`RuntimeError(stderr.strip())` when the return code isn't 0"],
          ["Must call", "the command as a list, with `capture_output=True` and `text=True`"],
        ],
        starter: src`
import subprocess

def changed_files(run=subprocess.run):
    return []

def fake_git(args, **options):
    return subprocess.CompletedProcess(args, 0, stdout=" M report.py\n?? notes.txt\nA  src/app.py\n", stderr="")

print(changed_files(fake_git))
`,
        answer: src`
import subprocess

def changed_files(run=subprocess.run):
    result = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    paths = []
    for line in result.stdout.splitlines():
        if line.strip():
            paths.append(line[3:])
    return paths

def fake_git(args, **options):
    return subprocess.CompletedProcess(args, 0, stdout=" M report.py\n?? notes.txt\nA  src/app.py\n", stderr="")

print(changed_files(fake_git))
`,
        alternatives: [
          src`
import subprocess

def changed_files(run=subprocess.run):
    result = run(["git", "status", "--porcelain"], text=True, capture_output=True)
    try:
        result.check_returncode()
    except subprocess.CalledProcessError:
        raise RuntimeError(result.stderr.strip())
    return [line[3:] for line in result.stdout.split("\n") if line != ""]
`,
        ],
        wrong: [
          {
            code: src`
import subprocess

def changed_files(run=subprocess.run):
    result = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    paths = []
    for line in result.stdout.splitlines():
        paths.append(line.split()[1])
    return paths
`,
            fails: ["spaces"],
            why: "`split()` cuts a path with a space in it, so `quarterly report.csv` becomes `quarterly`",
          },
          {
            code: src`
import subprocess

def changed_files(run=subprocess.run):
    result = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    paths = []
    for line in result.stdout.splitlines():
        paths.append(line[3:])
    return paths
`,
            fails: ["failure", "message"],
            why: "a failed git call returns `[]`, which looks exactly like \"nothing changed\"",
          },
          {
            code: src`
import subprocess

def changed_files(run=subprocess.run):
    result = run("git status --porcelain", capture_output=True, text=True, shell=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return [line[3:] for line in result.stdout.splitlines()]
`,
            fails: ["call"],
            why: "the command is one shell string instead of a list of words",
          },
        ],
        hints: [
          "Call `run` once, exactly as the spec says, and keep the CompletedProcess it returns.",
          "Check `returncode` before reading `stdout`; a failure must not look like an empty list.",
          "Each line has a fixed-width start (two letters and a space), so slice the path off from position 3 instead of splitting on spaces.",
        ],
        task: {
          checks: [
            expr("demo", "changed_files() lists the starter's three paths", "import subprocess as _sp\ndef _git(args, **kw):\n    return _sp.CompletedProcess(args, 0, stdout=' M report.py\\n?? notes.txt\\nA  src/app.py\\n', stderr='')\nresult = changed_files(_git)", ["report.py", "notes.txt", "src/app.py"], { show: "changed_files(fake_git)" }),
            expr("clean", "Nothing changed", "import subprocess as _sp\ndef _git(args, **kw):\n    return _sp.CompletedProcess(args, 0, stdout='', stderr='')\nresult = changed_files(_git)", [], { show: "changed_files(<git with no output>)" }),
            expr("call", "changed_files() calls run with a list and captures text", "import subprocess as _sp\n_seen = []\ndef _git(args, **kw):\n    _seen.append((args, kw.get('capture_output'), kw.get('text'), kw.get('shell', False)))\n    return _sp.CompletedProcess(args, 0, stdout='', stderr='')\nchanged_files(_git)\nresult = _seen", [py.tuple(py.list(py.str("git"), py.str("status"), py.str("--porcelain")), py.bool(true), py.bool(true), py.bool(false))], { show: "the arguments passed to run" }),
            raisesExpr("failure", "A failed git call raises RuntimeError", "import subprocess as _sp\ndef _git(args, **kw):\n    return _sp.CompletedProcess(args, 128, stdout='', stderr='fatal: not a git repository\\n')\nchanged_files(_git)", "RuntimeError", { hidden: true }),
            expr("message", "The RuntimeError carries git's message", "import subprocess as _sp\ndef _git(args, **kw):\n    return _sp.CompletedProcess(args, 1, stdout='', stderr='  error: index locked  \\n')\ntry:\n    changed_files(_git)\n    result = None\nexcept RuntimeError as _e:\n    result = str(_e)", "error: index locked", { hidden: true }),
            expr("spaces", "A path with spaces in it", "import subprocess as _sp\ndef _git(args, **kw):\n    return _sp.CompletedProcess(args, 0, stdout='?? quarterly report.csv\\n M a b/c.py\\n', stderr='')\nresult = changed_files(_git)", ["quarterly report.csv", "a b/c.py"], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Stop at the first failing step",
        prompt: "A release script runs its checks one after another and must stop at the first failure. Write `run_steps(steps, run)`: `steps` is a list of `(name, command)` pairs. Run each command with `run(command, capture_output=True, text=True)` in order. Return a dictionary: `\"passed\"` is the list of step names that succeeded before anything failed, `\"failed\"` is the name of the first failing step (or `None`), and `\"error\"` is that step's stripped stderr (or `\"\"`). Steps after a failure must not run.",
        spec: [
          ["Function", "`run_steps(steps, run)`"],
          ["steps", "e.g. `[(\"tests\", [\"pytest\", \"-q\"]), (\"build\", [\"python\", \"-m\", \"build\"])]`"],
          ["Returns", "`{\"passed\": [...], \"failed\": name or None, \"error\": text}`"],
          ["Rules", "return code 0 is success; nothing runs after the first failure; no steps gives `{'passed': [], 'failed': None, 'error': ''}`"],
        ],
        starter: src`
import subprocess

def run_steps(steps, run=subprocess.run):
    return {"passed": [], "failed": None, "error": ""}

def fake_run(args, **options):
    if args[0] == "flake8":
        return subprocess.CompletedProcess(args, 1, stdout="", stderr="report.py:3:1: F401 unused import\n")
    return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

steps = [("tests", ["pytest", "-q"]), ("lint", ["flake8", "."]), ("build", ["python", "-m", "build"])]
print(run_steps(steps, fake_run))
`,
        answer: src`
import subprocess

def run_steps(steps, run=subprocess.run):
    passed = []
    for name, command in steps:
        result = run(command, capture_output=True, text=True)
        if result.returncode != 0:
            return {"passed": passed, "failed": name, "error": result.stderr.strip()}
        passed.append(name)
    return {"passed": passed, "failed": None, "error": ""}

def fake_run(args, **options):
    if args[0] == "flake8":
        return subprocess.CompletedProcess(args, 1, stdout="", stderr="report.py:3:1: F401 unused import\n")
    return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

steps = [("tests", ["pytest", "-q"]), ("lint", ["flake8", "."]), ("build", ["python", "-m", "build"])]
print(run_steps(steps, fake_run))
`,
        alternatives: [
          src`
import subprocess

def run_steps(steps, run=subprocess.run):
    report = {"passed": [], "failed": None, "error": ""}
    for step in steps:
        outcome = run(step[1], text=True, capture_output=True)
        if outcome.returncode == 0:
            report["passed"].append(step[0])
            continue
        report["failed"] = step[0]
        report["error"] = outcome.stderr.strip()
        break
    return report
`,
        ],
        wrong: [
          {
            code: src`
import subprocess

def run_steps(steps, run=subprocess.run):
    passed = []
    failed = None
    error = ""
    for name, command in steps:
        result = run(command, capture_output=True, text=True)
        if result.returncode == 0:
            passed.append(name)
        elif failed is None:
            failed = name
            error = result.stderr.strip()
    return {"passed": passed, "failed": failed, "error": error}
`,
            fails: ["demo", "stops", "returns-later"],
            why: "it keeps going after a failure, so later steps run and are reported as passed",
          },
          {
            code: src`
import subprocess

def run_steps(steps, run=subprocess.run):
    passed = []
    for name, command in steps:
        result = run(command, capture_output=True, text=True)
        if result.stderr:
            return {"passed": passed, "failed": name, "error": result.stderr.strip()}
        passed.append(name)
    return {"passed": passed, "failed": None, "error": ""}
`,
            fails: ["stops", "warnings"],
            why: "a step that succeeds but prints a warning on stderr is treated as a failure",
          },
        ],
        hints: [
          "Loop over the pairs, unpacking each into a name and a command, and call `run` once per step.",
          "Collect the names that pass in a list as you go.",
          "On the first non-zero return code, return the report straight away; the `return` ends the loop, so nothing after it runs.",
        ],
        task: {
          checks: [
            expr("demo", "run_steps() stops at lint in the starter", "import subprocess as _sp\ndef _run(args, **kw):\n    if args[0] == 'flake8':\n        return _sp.CompletedProcess(args, 1, stdout='', stderr='report.py:3:1: F401 unused import\\n')\n    return _sp.CompletedProcess(args, 0, stdout='', stderr='')\nresult = run_steps([('tests', ['pytest', '-q']), ('lint', ['flake8', '.']), ('build', ['python', '-m', 'build'])], _run)", { passed: ["tests"], failed: "lint", error: "report.py:3:1: F401 unused import" }, { show: "run_steps(steps, fake_run)" }),
            expr("all-pass", "Every step passes", "import subprocess as _sp\ndef _run(args, **kw):\n    return _sp.CompletedProcess(args, 0, stdout='ok', stderr='')\nresult = run_steps([('a', ['true']), ('b', ['true'])], _run)", { passed: ["a", "b"], failed: null, error: "" }, { show: "run_steps(<two passing steps>, …)" }),
            expr("empty", "No steps", "import subprocess as _sp\ndef _run(args, **kw):\n    return _sp.CompletedProcess(args, 0)\nresult = run_steps([], _run)", { passed: [], failed: null, error: "" }, { show: "run_steps([], …)" }),
            expr("stops", "Steps after a failure don't run", "import subprocess as _sp\n_ran = []\ndef _run(args, **kw):\n    _ran.append(args[0])\n    return _sp.CompletedProcess(args, 2 if args[0] == 'mypy' else 0, stdout='', stderr='bad types')\nrun_steps([('fmt', ['black']), ('types', ['mypy']), ('tests', ['pytest']), ('build', ['make'])], _run)\nresult = _ran", ["black", "mypy"], { hidden: true }),
            expr("returns-later", "The first step fails", "import subprocess as _sp\ndef _run(args, **kw):\n    return _sp.CompletedProcess(args, 1 if args[0] == 'pytest' else 0, stdout='', stderr=' 3 failed \\n')\nresult = run_steps([('tests', ['pytest']), ('build', ['make'])], _run)", { passed: [], failed: "tests", error: "3 failed" }, { hidden: true }),
            expr("warnings", "A passing step that printed a warning", "import subprocess as _sp\ndef _run(args, **kw):\n    return _sp.CompletedProcess(args, 0, stdout='', stderr='DeprecationWarning: old option\\n')\nresult = run_steps([('build', ['make']), ('docs', ['mkdocs', 'build'])], _run)", { passed: ["build", "docs"], failed: null, error: "" }, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import subprocess

result = subprocess.CompletedProcess(["pytest", "-q"], 1, stdout="2 passed, 1 failed\n", stderr="")
print(result.returncode == 0, result.stdout.strip())
`,
        choices: ["False 2 passed, 1 failed", "True 2 passed, 1 failed", "False", "CalledProcessError"],
        answer: 0,
        why: "Return code 1 is a failure, so the comparison is False. Building or reading a CompletedProcess never raises; only `check_returncode()` or `run(..., check=True)` turn a failure into an exception.",
      },
      {
        id: "q2",
        prompt: "On a real computer, `subprocess.run([\"python3\", \"-c\", \"import sys; sys.exit(3)\"])` runs a program that exits with status 3. What happens?",
        choices: [
          "run returns a CompletedProcess whose returncode is 3",
          "run raises CalledProcessError",
          "run returns None",
          "Your own program also exits with status 3",
        ],
        answer: 0,
        why: "Without `check=True`, `run` reports the failure in `returncode` and returns normally (Python documentation, subprocess.run). With `check=True` it would raise `CalledProcessError` with `returncode` 3.",
      },
      {
        id: "q3",
        prompt: "A script archives a folder the user names: `subprocess.run(\"tar czf backup.tgz \" + folder, shell=True)`. What is wrong with it?",
        choices: [
          "A folder name containing `;` or spaces is read by the shell, so it can split the name or run a second command; pass a list of words without shell=True",
          "`tar` can't be run from Python",
          "`shell=True` makes the command slower but is otherwise safe",
          "Nothing, as long as the return code is checked",
        ],
        answer: 0,
        why: "With a string and `shell=True`, the shell interprets the user's text. A list like `[\"tar\", \"czf\", \"backup.tgz\", folder]` passes the name as one argument, whatever it contains.",
      },
    ],
    review: [
      "`subprocess.run([...], capture_output=True, text=True)` returns a CompletedProcess: `returncode`, `stdout`, `stderr`.",
      "0 means success; `run` doesn't raise on failure unless you ask with `check=True`.",
      "Pass the command as a list of words, and take the runner as a parameter so the surrounding logic can run with a stand-in.",
      "Next: a complete folder tool that plans its changes, shows them, applies them and reports.",
    ],
  },

  // ------------------------------------------------------------------ PY-L23-05 a folder tool
  {
    id: "PY-L23-05",
    version: 2,
    slug: "plan-then-apply",
    title: "Automate a folder: plan, apply, report",
    lede: "A script that renames or moves files should first work out what it would do, show that plan, and only then act. Subcommands give the user both: `plan` to look, `apply` to change.",
    focus: "Split folder automation into a plan, a dry run that shows it, an apply step and a report.",
    minutes: 22,
    objectives: [
      "Build a rename plan as a list of `(old, new)` pairs without touching the files",
      "Offer `plan` and `apply` subcommands with `add_subparsers`",
      "Apply changes safely (never overwrite) and report what happened",
    ],
    requires: ["argparse-call", "arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "continue-statement", "csv-write", "dict-get", "dict-literal", "dict-lookup", "dir-list", "else-clause", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-index", "newline-escape", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "spaces-in-text", "string-index", "string-method", "top-level-indent", "truthiness", "tuple-literal", "tuple-unpack", "unquoted-name", "with-statement"],
    teaches: ["file-report"],
    blocks: [
      {
        kind: "text",
        md: "Scanned invoices arrive with names like `Invoice 489434.CSV` and `Credit Note C489449.csv`, and the accounting tool wants `invoice-489434.csv`. Renaming by hand is slow; renaming with a buggy script can destroy files. Careful automation separates two steps:\n\n1. **Plan**: read the folder and build a list of `(old name, new name)` pairs. Nothing on disk changes, so you can print the plan and check it. Printing a plan without acting on it is called a **dry run**.\n2. **Apply**: carry out exactly that plan, then **report** what was done.\n\nBecause the plan only lists names that would change, running the tool a second time finds nothing to do. That property (running twice is the same as running once) is what makes a script safe to re-run after a failure.",
      },
      {
        kind: "example",
        title: "A rename plan",
        code: src`
from pathlib import Path

def tidy_name(name):
    return name.strip().lower().replace(" ", "-")

def rename_plan(folder):
    plan = []
    for path in sorted(Path(folder).iterdir()):
        if not path.is_file():
            continue
        new_name = tidy_name(path.name)
        if new_name != path.name:
            plan.append((path.name, new_name))
    return plan

inbox = Path("inbox")
inbox.mkdir()
for name in ["Invoice 489434.CSV", "invoice-489435.csv", "Credit Note C489449.csv"]:
    (inbox / name).write_text("Invoice,Quantity\n")

for old, new in rename_plan("inbox"):
    print(old, "=>", new)
print(sorted(path.name for path in inbox.iterdir()))
`,
        output: "Credit Note C489449.csv => credit-note-c489449.csv\nInvoice 489434.CSV => invoice-489434.csv\n['Credit Note C489449.csv', 'Invoice 489434.CSV', 'invoice-489435.csv']\n",
        note: "`invoice-489435.csv` is already tidy, so it isn't in the plan. The last line proves the folder is unchanged: building a plan only reads.",
      },
      {
        kind: "text",
        md: "Tools like `git` have **subcommands**: `git status` looks, `git commit` changes. argparse builds them with `add_subparsers`: each subcommand gets its own small parser and its own arguments, and `dest=\"command\"` stores which one was chosen. `required=True` makes choosing one mandatory.\n\n`Path.rename(target)` moves a file to a new name. On Linux and macOS it **silently replaces** a file that already has the target name, so a careful apply step checks `target.exists()` first and skips (and reports) that pair instead of destroying a file.",
      },
      {
        kind: "example",
        title: "plan and apply as subcommands",
        code: src`
import argparse
from pathlib import Path

def tidy_name(name):
    return name.strip().lower().replace(" ", "-")

def rename_plan(folder):
    plan = []
    for path in sorted(Path(folder).iterdir()):
        if path.is_file() and tidy_name(path.name) != path.name:
            plan.append((path.name, tidy_name(path.name)))
    return plan

def apply_plan(folder, plan):
    renamed = 0
    for old, new in plan:
        target = Path(folder, new)
        if target.exists():
            print("skipped", old, "because", new, "exists")
            continue
        Path(folder, old).rename(target)
        renamed += 1
    return renamed

def main(argv):
    parser = argparse.ArgumentParser(prog="tidy")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("plan").add_argument("folder")
    commands.add_parser("apply").add_argument("folder")
    args = parser.parse_args(argv)
    plan = rename_plan(args.folder)
    if args.command == "plan":
        print("planned renames:", len(plan))
        for old, new in plan:
            print("  ", old, "=>", new)
    else:
        print("renamed", apply_plan(args.folder, plan), "of", len(plan))

Path("scans").mkdir()
for name in ["Invoice 489434.CSV", "invoice-489434.csv", "Credit Note C489449.csv"]:
    Path("scans", name).write_text("Invoice,Quantity\n")

main(["plan", "scans"])
main(["apply", "scans"])
main(["plan", "scans"])
`,
        output: "planned renames: 2\n   Credit Note C489449.csv => credit-note-c489449.csv\n   Invoice 489434.CSV => invoice-489434.csv\nskipped Invoice 489434.CSV because invoice-489434.csv exists\nrenamed 1 of 2\nplanned renames: 1\n   Invoice 489434.CSV => invoice-489434.csv\n",
        note: "The plan showed a clash the dry run couldn't hide: two scans tidy to the same name. `apply` refused to overwrite and said so. The second `plan` shows the one file still waiting for a person to decide.",
      },
      {
        kind: "text",
        md: "**When to use it:** any script that changes, moves or deletes many files. Plan first, let people see the plan, then apply.\n\n**Mistakes to avoid:** renaming while you are still listing the folder (the listing can change under you: build the whole plan first); trusting `rename` not to overwrite; and finishing silently. A short report of what changed, what was skipped and why is what lets someone trust an automated run.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Underscores too",
      prompt: "Some scanners write `Credit_Note_C489449.csv`. Change `tidy_name` so underscores become dashes as well, then run it.",
      spec: [
        ["Function", "`tidy_name(name)`"],
        ["Returns", "the name stripped, in lower case, with spaces **and underscores** replaced by `-`"],
      ],
      starter: src`
def tidy_name(name):
    return name.strip().lower().replace(" ", "-")

print(tidy_name("Credit_Note_C489449.csv"))
print(tidy_name(" Invoice 489434.CSV"))
`,
      answer: src`
def tidy_name(name):
    return name.strip().lower().replace(" ", "-").replace("_", "-")

print(tidy_name("Credit_Note_C489449.csv"))
print(tidy_name(" Invoice 489434.CSV"))
`,
      wrong: [
        {
          code: src`
def tidy_name(name):
    return name.strip().lower().replace("_", "-")
`,
          fails: ["returns"],
          why: "the spaces are no longer replaced",
        },
      ],
      hints: [
        "`replace` returns new text, so another `replace` can follow it.",
        "Keep the space replacement and add one for `_`.",
        "Chain `.replace(\"_\", \"-\")` onto the end.",
      ],
      task: {
        checks: [
          fn("returns", "tidy_name", [
            example(["Credit_Note_C489449.csv"], "credit-note-c489449.csv"),
            hiddenCase("spaces and capitals", [" Invoice 489434.CSV"], "invoice-489434.csv"),
            hiddenCase("both kinds of separator", ["Q1_Sales Report.PDF"], "q1-sales-report.pdf"),
          ], { label: "tidy_name() replaces spaces and underscores" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Apply a plan safely",
        prompt: "Write `apply_plan(folder, plan)`: for each `(old, new)` pair in order, rename `folder/old` to `folder/new`, but **skip** a pair when the old file no longer exists or a file named `new` already exists. Return a report: `{\"renamed\": [old names renamed], \"skipped\": [old names skipped]}`.",
        spec: [
          ["Function", "`apply_plan(folder, plan)`"],
          ["plan", "a list of `(old_name, new_name)` pairs, names inside `folder`"],
          ["Returns", "`{\"renamed\": [...], \"skipped\": [...]}`, both in plan order"],
          ["Never", "overwrite an existing file"],
          ["Example", "a folder with `A.csv` and `b.csv`, plan `[(\"A.csv\", \"a.csv\"), (\"B.csv\", \"b.csv\")]` → `{'renamed': ['A.csv'], 'skipped': ['B.csv']}`"],
        ],
        starter: src`
from pathlib import Path

def apply_plan(folder, plan):
    return {"renamed": [], "skipped": []}

Path("box").mkdir()
Path("box/A.csv").write_text("a")
Path("box/b.csv").write_text("b")
print(apply_plan("box", [("A.csv", "a.csv"), ("B.csv", "b.csv")]))
print(sorted(path.name for path in Path("box").iterdir()))
`,
        answer: src`
from pathlib import Path

def apply_plan(folder, plan):
    report = {"renamed": [], "skipped": []}
    for old, new in plan:
        source = Path(folder) / old
        target = Path(folder) / new
        if not source.exists() or target.exists():
            report["skipped"].append(old)
            continue
        source.rename(target)
        report["renamed"].append(old)
    return report

Path("box").mkdir()
Path("box/A.csv").write_text("a")
Path("box/b.csv").write_text("b")
print(apply_plan("box", [("A.csv", "a.csv"), ("B.csv", "b.csv")]))
print(sorted(path.name for path in Path("box").iterdir()))
`,
        alternatives: [
          src`
from pathlib import Path

def apply_plan(folder, plan):
    renamed = []
    skipped = []
    for pair in plan:
        source = Path(folder, pair[0])
        target = Path(folder, pair[1])
        if source.is_file() and not target.exists():
            source.rename(target)
            renamed.append(pair[0])
        else:
            skipped.append(pair[0])
    return {"renamed": renamed, "skipped": skipped}
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def apply_plan(folder, plan):
    report = {"renamed": [], "skipped": []}
    for old, new in plan:
        source = Path(folder) / old
        if not source.exists():
            report["skipped"].append(old)
            continue
        source.rename(Path(folder) / new)
        report["renamed"].append(old)
    return report
`,
            fails: ["no-overwrite", "clash-report"],
            why: "it renames onto an existing file, silently destroying it",
          },
          {
            code: src`
from pathlib import Path

def apply_plan(folder, plan):
    report = {"renamed": [], "skipped": []}
    for old, new in plan:
        target = Path(folder) / new
        if target.exists():
            report["skipped"].append(old)
            continue
        (Path(folder) / old).rename(target)
        report["renamed"].append(old)
    return report
`,
            fails: ["missing-source"],
            why: "a file that has already gone makes `rename` crash with FileNotFoundError",
          },
        ],
        hints: [
          "Loop over the pairs and build the two full paths with `Path(folder) / name`.",
          "Two reasons to skip: the source doesn't exist, or the target already does. Check both before renaming.",
          "Append each old name to exactly one of the two lists, in the order the plan gives them.",
        ],
        task: {
          checks: [
            expr("demo", "apply_plan() renames A.csv and skips B.csv", `${makeFolder("t5c1a", { "A.csv": "a", "b.csv": "b" })}\nresult = apply_plan("t5c1a", [("A.csv", "a.csv"), ("B.csv", "b.csv")])`, { renamed: ["A.csv"], skipped: ["B.csv"] }, { show: "apply_plan(\"box\", [(\"A.csv\", \"a.csv\"), (\"B.csv\", \"b.csv\")])" }),
            expr("files", "The folder holds the new names afterwards", `${makeFolder("t5c1b", { "Q1.CSV": "1", "Q2.CSV": "2" })}\napply_plan("t5c1b", [("Q1.CSV", "q1.csv"), ("Q2.CSV", "q2.csv")])\nresult = sorted(_p.name for _p in _P("t5c1b").iterdir())`, ["q1.csv", "q2.csv"], { show: "the folder after apply_plan" }),
            expr("no-overwrite", "An existing target keeps its content", `${makeFolder("t5c1c", { "Report.csv": "new scan", "report.csv": "approved copy" })}\napply_plan("t5c1c", [("Report.csv", "report.csv")])\nresult = (_P("t5c1c/report.csv").read_text(), _P("t5c1c/Report.csv").exists())`, py.tuple(py.str("approved copy"), py.bool(true)), { hidden: true }),
            expr("clash-report", "A clash is reported as skipped", `${makeFolder("t5c1d", { "X.csv": "1", "x.csv": "2", "Y.csv": "3" })}\nresult = apply_plan("t5c1d", [("X.csv", "x.csv"), ("Y.csv", "y.csv")])`, { renamed: ["Y.csv"], skipped: ["X.csv"] }, { hidden: true }),
            expr("missing-source", "A planned file that has already gone", `${makeFolder("t5c1e", { "B.csv": "b" })}\nresult = apply_plan("t5c1e", [("A.csv", "a.csv"), ("B.csv", "b.csv")])`, { renamed: ["B.csv"], skipped: ["A.csv"] }, { hidden: true }),
            expr("empty", "An empty plan", `${makeFolder("t5c1f", { "a.csv": "a" })}\nresult = apply_plan("t5c1f", [])`, { renamed: [], skipped: [] }, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A size report as CSV",
        prompt: "After a clean-up, finance wants a summary file. Write `write_summary(folder, report_path)`: for the files directly in `folder` (not subfolders), write a CSV with the header `suffix,files,bytes` and one row per suffix (lower case; `(none)` for files without a suffix), sorted by suffix. `files` is how many files have that suffix and `bytes` their total size. Return the number of rows written, not counting the header.",
        spec: [
          ["Function", "`write_summary(folder, report_path)`"],
          ["Writes", "a CSV file at `report_path`: `suffix,files,bytes`, then one row per suffix, sorted"],
          ["Returns", "the number of suffix rows"],
          ["Rules", "suffixes in lower case (`.CSV` counts as `.csv`); folders are ignored; an empty folder writes only the header and returns 0"],
          ["Example", "`a.csv` (10 bytes), `B.CSV` (5 bytes), `notes.txt` (3 bytes), `README` (2 bytes) → rows `(none),1,2`, `.csv,2,15`, `.txt,1,3`; returns 3"],
        ],
        starter: src`
import csv
from pathlib import Path

def write_summary(folder, report_path):
    return 0

Path("cleaned").mkdir()
Path("cleaned/a.csv").write_text("x" * 10)
Path("cleaned/B.CSV").write_text("x" * 5)
Path("cleaned/notes.txt").write_text("abc")
Path("cleaned/README").write_text("hi")
print(write_summary("cleaned", "summary.csv"))
print(Path("summary.csv").read_text())
`,
        answer: src`
import csv
from pathlib import Path

def write_summary(folder, report_path):
    counts = {}
    sizes = {}
    for path in Path(folder).iterdir():
        if not path.is_file():
            continue
        suffix = path.suffix.lower() or "(none)"
        if suffix not in counts:
            counts[suffix] = 0
            sizes[suffix] = 0
        counts[suffix] += 1
        sizes[suffix] += path.stat().st_size
    with open(report_path, "w", newline="", encoding="utf-8") as report:
        writer = csv.writer(report)
        writer.writerow(["suffix", "files", "bytes"])
        for suffix in sorted(counts):
            writer.writerow([suffix, counts[suffix], sizes[suffix]])
    return len(counts)

Path("cleaned").mkdir()
Path("cleaned/a.csv").write_text("x" * 10)
Path("cleaned/B.CSV").write_text("x" * 5)
Path("cleaned/notes.txt").write_text("abc")
Path("cleaned/README").write_text("hi")
print(write_summary("cleaned", "summary.csv"))
print(Path("summary.csv").read_text())
`,
        alternatives: [
          src`
import csv
from pathlib import Path

def write_summary(folder, report_path):
    totals = {}
    for path in sorted(Path(folder).iterdir()):
        if path.is_dir():
            continue
        key = path.suffix.lower() if path.suffix else "(none)"
        files, size = totals.get(key, (0, 0))
        totals[key] = (files + 1, size + path.stat().st_size)
    rows = [[key, totals[key][0], totals[key][1]] for key in sorted(totals)]
    with open(report_path, "w", newline="", encoding="utf-8") as out:
        csv.writer(out).writerows([["suffix", "files", "bytes"]] + rows)
    return len(rows)
`,
        ],
        wrong: [
          {
            code: src`
import csv
from pathlib import Path

def write_summary(folder, report_path):
    counts = {}
    sizes = {}
    for path in Path(folder).iterdir():
        if not path.is_file():
            continue
        suffix = path.suffix or "(none)"
        counts[suffix] = counts.get(suffix, 0) + 1
        sizes[suffix] = sizes.get(suffix, 0) + path.stat().st_size
    with open(report_path, "w", newline="", encoding="utf-8") as report:
        writer = csv.writer(report)
        writer.writerow(["suffix", "files", "bytes"])
        for suffix in sorted(counts):
            writer.writerow([suffix, counts[suffix], sizes[suffix]])
    return len(counts)
`,
            fails: ["demo", "count", "mixed-case"],
            why: "`.CSV` and `.csv` get separate rows because the suffix isn't lowered",
          },
          {
            code: src`
import csv
from pathlib import Path

def write_summary(folder, report_path):
    counts = {}
    sizes = {}
    for path in Path(folder).rglob("*"):
        if not path.is_file():
            continue
        suffix = path.suffix.lower() or "(none)"
        counts[suffix] = counts.get(suffix, 0) + 1
        sizes[suffix] = sizes.get(suffix, 0) + path.stat().st_size
    with open(report_path, "w", newline="", encoding="utf-8") as report:
        writer = csv.writer(report)
        writer.writerow(["suffix", "files", "bytes"])
        for suffix in sorted(counts):
            writer.writerow([suffix, counts[suffix], sizes[suffix]])
    return len(counts)
`,
            fails: ["subfolders"],
            why: "`rglob` also counts files inside subfolders",
          },
        ],
        hints: [
          "Two running totals per suffix, a count and a size, like grouping in the Collection Algorithms module. Build them first, write the file afterwards.",
          "`path.suffix.lower()` is empty for `README`; `or \"(none)\"` replaces an empty text with the label.",
          "Open the report with `newline=\"\"` (see CSV JSON & JSONL), write the header row, then one row per key of the sorted totals.",
        ],
        task: {
          checks: [
            csvRows("demo", "write_summary() writes the starter's report", "t5c2a.csv", [["suffix", "files", "bytes"], ["(none)", "1", "2"], [".csv", "2", "15"], [".txt", "1", "3"]], { setup: `${makeFolder("t5c2a", { "a.csv": "x".repeat(10), "B.CSV": "x".repeat(5), "notes.txt": "abc", "README": "hi" })}\nwrite_summary("t5c2a", "t5c2a.csv")` }),
            expr("count", "write_summary() returns the number of rows", `${makeFolder("t5c2b", { "a.csv": "x".repeat(10), "B.CSV": "x".repeat(5), "notes.txt": "abc", "README": "hi" })}\nresult = write_summary("t5c2b", "t5c2b.csv")`, 3, { show: "write_summary(\"cleaned\", \"summary.csv\")" }),
            csvRows("empty", "An empty folder writes only the header", "t5c2c.csv", [["suffix", "files", "bytes"]], { setup: `${makeFolder("t5c2c", {})}\nwrite_summary("t5c2c", "t5c2c.csv")`, hidden: true }),
            csvRows("subfolders", "Files inside subfolders are ignored", "t5c2d.csv", [["suffix", "files", "bytes"], [".json", "1", "4"]], { setup: `${makeFolder("t5c2d", { "data.json": "[1,]", "old/a.json": "xxxxxxxx", "old/b.csv": "yy" })}\nwrite_summary("t5c2d", "t5c2d.csv")`, hidden: true }),
            csvRows("mixed-case", "One suffix in several spellings", "t5c2e.csv", [["suffix", "files", "bytes"], [".pdf", "3", "6"]], { setup: `${makeFolder("t5c2e", { "a.PDF": "1", "b.Pdf": "22", "c.pdf": "333" })}\nwrite_summary("t5c2e", "t5c2e.csv")`, hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def tidy_name(name):
    return name.strip().lower().replace(" ", "-")

plan = []
for name in ["sales.csv", "Sales Q1.csv", "sales-q1.csv"]:
    new_name = tidy_name(name)
    if new_name != name:
        plan.append((name, new_name))
print(plan)
`,
        choices: ["[('Sales Q1.csv', 'sales-q1.csv')]", "[]", "[('sales.csv', 'sales.csv'), ('Sales Q1.csv', 'sales-q1.csv')]", "[('Sales Q1.csv', 'sales-q1.csv'), ('sales-q1.csv', 'sales-q1.csv')]"],
        answer: 0,
        why: "Only names that change are planned. The one pair it contains clashes with a file that already exists, which is exactly what the apply step must catch.",
      },
      {
        id: "q2",
        prompt: "A common mistake: trusting `rename` not to overwrite. On Linux and macOS, what does this print?",
        program: src`
from pathlib import Path

Path("box").mkdir()
Path("box/new.csv").write_text("new scan")
Path("box/report.csv").write_text("approved copy")
Path("box/new.csv").rename("box/report.csv")
print(Path("box/new.csv").exists(), Path("box/report.csv").read_text())
`,
        choices: ["False new scan", "True approved copy", "False approved copy", "FileExistsError"],
        answer: 0,
        why: "On POSIX systems `rename` replaces the target without asking, so the approved copy is gone. (Windows raises FileExistsError instead.) Check `exists()` first.",
      },
      {
        id: "q3",
        prompt: "Why does the folder tool build the whole plan before renaming anything?",
        choices: [
          "So the plan can be shown and checked as a dry run, and the folder listing isn't changing while it is being read",
          "Because `rename` only works on a list of pairs",
          "Because building a plan is faster than renaming",
          "So the files are renamed in reverse order",
        ],
        answer: 0,
        why: "Planning only reads, so it's safe to show. Applying a finished plan also avoids acting on a listing that your own renames are changing.",
      },
    ],
    review: [
      "Plan first: a list of `(old, new)` pairs built without touching the files.",
      "A dry run prints the plan; `apply` carries it out and never overwrites; a report says what changed and what was skipped.",
      "`add_subparsers(dest=\"command\", required=True)` gives a tool `plan` and `apply` subcommands.",
      "Next module: when a program goes wrong, reading tracebacks, finding the cause and logging what happens.",
    ],
  },
];
