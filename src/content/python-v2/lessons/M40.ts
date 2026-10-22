/**
 * M40 Software Architecture: five lessons (PY-L40-01 … PY-L40-05).
 *
 * How a program that has outgrown one file stays understandable and testable. Separate parsing, computing and
 * presenting, with pure logic in the middle and input/output at the edges; load configuration in layers (defaults, a
 * file, environment overrides) into one validated, frozen object; keep the core independent of storage by depending on
 * an interface (Protocol) that adapters implement, and check the import rules with an architecture test (ast);
 * refactor behind characterization tests; and test the wired-together modules through their real entry point.
 *
 * Multi-file work is real: exercises receive read-only modules through task.files and import them, and lesson
 * examples that need several modules write them first (examples can't receive files). Checks call each layer on its
 * own, run entry points against temporary folders, inspect source structure only where the refactoring is the point,
 * and grade learner-written tests against defective implementations.
 * Version 2: rewritten from a module that printed fixed labels.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, jsonFile, keepsInput, learnerTests, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const strs = (...xs: string[]) => py.list(...xs.map((x) => py.str(x)));

// ---------------------------------------------------------------- read-only modules given to exercises

/** service.py for L40-03 c1: the core, which depends only on a store with get/save. */
export const SERVICE_PY = src`
"""Refunds for Runtime Market orders. Depends on any store with get(order_id) and save(order)."""


class RefundService:
    def __init__(self, store):
        self.store = store

    def refund(self, order_id):
        order = self.store.get(order_id)
        if order is None or order["status"] != "delivered":
            return False
        order["status"] = "refunded"
        self.store.save(order)
        return True
`;

/** The stock importer used by L40-05: three modules with one job each. */
export const STOCK_FILES = {
  "parsing.py": src`
"""Turn CSV text into stock movements."""


def parse_movements(text):
    movements = []
    for line in text.strip().splitlines()[1:]:
        sku, change = line.split(",")
        movements.append((sku.strip(), int(change)))
    return movements
`,
  "inventory.py": src`
"""In-memory stock levels."""


class Inventory:
    def __init__(self, levels=None):
        self.levels = dict(levels or {})

    def apply(self, sku, change):
        self.levels[sku] = self.levels.get(sku, 0) + change

    def report(self):
        return [f"{sku},{qty}" for sku, qty in sorted(self.levels.items())]
`,
};

const shipments = [
  { shipment_id: "S1", promised: "2024-01-22", delivered: "2024-01-18" },
  { shipment_id: "S2", promised: "2024-01-27", delivered: "2024-01-29" },
  { shipment_id: "S3", promised: "2024-01-25", delivered: "" },
];

export const m40Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L40-01 separation of concerns
  {
    id: "PY-L40-01",
    version: 2,
    slug: "separation-of-concerns",
    title: "Separation of concerns: parse, compute, present",
    lede: "A script that reads, calculates and prints in one loop works until someone needs the numbers somewhere else. Splitting it into parse, compute and present functions makes each part reusable and testable on its own.",
    focus: "Split a program into input, pure logic and output, connected by return values.",
    minutes: 22,
    objectives: [
      "Separate parsing, computing and presenting into functions with one job each",
      "Keep the core logic pure: data in, data out, no printing or file access",
      "Reuse the same core with a different input source and a different output",
    ],
    requires: ["aggregate-call", "arithmetic", "assert-stmt", "assignment", "boolean", "comparison", "conditional-expr", "conversion", "csv-read", "dict-get", "dict-literal", "dict-lookup", "else-clause", "encoding-arg", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "json-loads", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-condition", "nested-dict", "newline-escape", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "star-kwargs", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack", "unquoted-name", "with-statement"],
    teaches: ["split-fn"],
    blocks: [
      {
        kind: "text",
        md: "Most programs do three different kinds of work: **get** data in (read a file, call an API, parse text), **decide** something about it (totals, rules, filters), and **show** the result (print, write a file, return JSON). Mixing them in one loop makes every part hard to change: the totals can't be reused for a dashboard, and testing the arithmetic requires a file on disk.\n\nThe usual structure is a **functional core with an imperative shell**: pure functions in the middle that take data and return data, and a thin layer at the edges that does the input and output and connects the pieces with return values (the Fundamentals Integration module started this; here it becomes the design).",
      },
      {
        kind: "example",
        title: "An order report in three parts",
        code: src`
orders_csv = """order_id,status,total
O100282,delivered,35.84
O100376,returned,91.47
O100918,delivered,55.72
"""

def parse_orders(text):
    orders = []
    for line in text.strip().splitlines()[1:]:
        order_id, status, total = line.split(",")
        orders.append({"order_id": order_id, "status": status, "total": float(total)})
    return orders

def summarise(orders):
    summary = {}
    for order in orders:
        entry = summary.setdefault(order["status"], {"count": 0, "revenue": 0.0})
        entry["count"] += 1
        entry["revenue"] += order["total"]
    return summary

def render(summary):
    lines = []
    for status in sorted(summary):
        entry = summary[status]
        lines.append(f"{status:<10}{entry['count']:>3}{entry['revenue']:>10.2f}")
    return "\n".join(lines)

print(render(summarise(parse_orders(orders_csv))))
`,
        output: "delivered   2     91.56\nreturned    1     91.47\n",
        note: "`parse_orders` knows about CSV and nothing else; `summarise` knows about orders and nothing about text or printing; `render` knows about layout. The last line is the shell that connects them. `setdefault` returns the existing entry, or stores and returns the starting one.",
      },
      {
        kind: "text",
        md: "The payoff comes when a requirement changes. Orders now also arrive as JSON from the web shop's API, and a dashboard wants the numbers as JSON. Only the edges change: the core is reused untouched.",
      },
      {
        kind: "example",
        title: "Same core, new edges",
        code: src`
import json

def summarise(orders):
    summary = {}
    for order in orders:
        entry = summary.setdefault(order["status"], {"count": 0, "revenue": 0.0})
        entry["count"] += 1
        entry["revenue"] += order["total"]
    return summary

api_body = '[{"order_id": "O101219", "status": "delivered", "total": 246.6}, {"order_id": "O103722", "status": "cancelled", "total": 403.26}]'
summary = summarise(json.loads(api_body))
print(json.dumps(summary, sort_keys=True))
assert summarise([]) == {}
assert summarise([{"status": "returned", "total": 5.0}]) == {"returned": {"count": 1, "revenue": 5.0}}
print("core checks pass")
`,
        output: "{\"cancelled\": {\"count\": 1, \"revenue\": 403.26}, \"delivered\": {\"count\": 1, \"revenue\": 246.6}}\ncore checks pass\n",
        note: "A new input (JSON) and a new output (JSON) needed no change to `summarise`. And because it is pure, the two `assert` lines test it with plain lists: no files, no captured printing.",
      },
      {
        kind: "text",
        md: "**When to split:** as soon as a function both does I/O and makes decisions, or when you can't test a rule without creating files. Name functions after their one job. **Mistakes to avoid:** printing inside the core (callers can't reuse the result); passing file paths deep into the logic; and the opposite extreme, splitting a five-line script into ten files. Split along the three concerns first; further splits come when a part grows.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Return the lines instead of printing them",
      prompt: "`report_lines` prints each line itself, so no other code can use the report (and it returns None). Make it build and return a list of the lines instead, and print them from the shell at the bottom.",
      spec: [
        ["Function", "`report_lines(totals)`, where `totals` maps a category to its revenue"],
        ["Returns", "a list of `\"category: revenue\"` lines (revenue with 2 decimals), sorted by category; it prints nothing"],
        ["Example", "`{\"sports\": 112.5, \"home\": 31}` → `['home: 31.00', 'sports: 112.50']`"],
      ],
      starter: src`
def report_lines(totals):
    for category in sorted(totals):
        print(f"{category}: {totals[category]:.2f}")

report_lines({"sports": 112.5, "home": 31})
`,
      answer: src`
def report_lines(totals):
    lines = []
    for category in sorted(totals):
        lines.append(f"{category}: {totals[category]:.2f}")
    return lines

for line in report_lines({"sports": 112.5, "home": 31}):
    print(line)
`,
      wrong: [
        {
          code: src`
def report_lines(totals):
    lines = []
    for category in sorted(totals):
        print(f"{category}: {totals[category]:.2f}")
        lines.append(f"{category}: {totals[category]:.2f}")
    return lines
`,
          fails: ["quiet"],
          why: "it returns the lines but still prints them, so callers get output they didn't ask for",
        },
      ],
      hints: [
        "Collect the lines in a list instead of printing each one.",
        "Return the list at the end.",
        "Move the printing to the bottom of the program, where the function is called.",
      ],
      task: {
        checks: [
          fn("returns", "report_lines", [
            example([{ sports: 112.5, home: 31 }], ["home: 31.00", "sports: 112.50"]),
            hiddenCase("no categories", [{}], []),
          ], { label: "report_lines() returns the sorted report lines" }),
          {
            kind: "expr",
            id: "quiet",
            label: "report_lines() prints nothing itself",
            hidden: true,
            expr: "import io as _io, contextlib as _cl\n_buf = _io.StringIO()\nwith _cl.redirect_stdout(_buf):\n    report_lines({'toys': 5})\nresult = _buf.getvalue()",
            expected: py.str(""),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Untangle the late-shipment report",
        prompt: "The starter's `late_report(text, today)` parses shipments, decides which are late and formats the answer, all in one loop. Split it into three functions with the same overall result: `parse_shipments(text)` (CSV text → list of dictionaries), `late_shipments(shipments, today)` (pure: the IDs of late shipments) and `format_late(ids)` (the report text). Keep `late_report` as the shell that calls them.",
        spec: [
          ["parse_shipments(text)", "rows of `shipment_id,promised,delivered` (header first; `delivered` may be empty) → list of `{\"shipment_id\", \"promised\", \"delivered\"}` dictionaries of text"],
          ["late_shipments(shipments, today)", "IDs, in order, delivered after the promised date, or not delivered and `today` is after the promised date; dates are `YYYY-MM-DD` text, which compares correctly"],
          ["format_late(ids)", "`\"late: S2, S3\"`, or `\"no late shipments\"` for none"],
          ["late_report(text, today)", "`format_late(late_shipments(parse_shipments(text), today))`"],
        ],
        starter: src`
def late_report(text, today):
    late = []
    for line in text.strip().splitlines()[1:]:
        shipment_id, promised, delivered = line.split(",")
        if (delivered and delivered > promised) or (not delivered and today > promised):
            late.append(shipment_id)
    if not late:
        return "no late shipments"
    return "late: " + ", ".join(late)

text = "shipment_id,promised,delivered\nS1,2024-01-22,2024-01-18\nS2,2024-01-27,2024-01-29\nS3,2024-01-25,\n"
print(late_report(text, "2024-01-26"))
`,
        answer: src`
def parse_shipments(text):
    shipments = []
    for line in text.strip().splitlines()[1:]:
        shipment_id, promised, delivered = line.split(",")
        shipments.append({"shipment_id": shipment_id, "promised": promised, "delivered": delivered})
    return shipments

def late_shipments(shipments, today):
    late = []
    for s in shipments:
        if s["delivered"]:
            if s["delivered"] > s["promised"]:
                late.append(s["shipment_id"])
        elif today > s["promised"]:
            late.append(s["shipment_id"])
    return late

def format_late(ids):
    if not ids:
        return "no late shipments"
    return "late: " + ", ".join(ids)

def late_report(text, today):
    return format_late(late_shipments(parse_shipments(text), today))

text = "shipment_id,promised,delivered\nS1,2024-01-22,2024-01-18\nS2,2024-01-27,2024-01-29\nS3,2024-01-25,\n"
print(late_report(text, "2024-01-26"))
`,
        alternatives: [
          src`
import csv
import io

def parse_shipments(text):
    return [dict(row) for row in csv.DictReader(io.StringIO(text.strip() + "\n"))]

def is_late(shipment, today):
    finished = shipment["delivered"] or today
    return finished > shipment["promised"]

def late_shipments(shipments, today):
    return [s["shipment_id"] for s in shipments if is_late(s, today)]

def format_late(ids):
    return "late: " + ", ".join(ids) if ids else "no late shipments"

def late_report(text, today):
    return format_late(late_shipments(parse_shipments(text), today))
`,
        ],
        wrong: [
          {
            code: src`
def parse_shipments(text):
    shipments = []
    for line in text.strip().splitlines()[1:]:
        shipment_id, promised, delivered = line.split(",")
        shipments.append({"shipment_id": shipment_id, "promised": promised, "delivered": delivered})
    return shipments

def late_shipments(shipments, today):
    late = [s["shipment_id"] for s in shipments if s["delivered"] > s["promised"]]
    print("late:", late)
    return late

def format_late(ids):
    if not ids:
        return "no late shipments"
    return "late: " + ", ".join(ids)

def late_report(text, today):
    return format_late(late_shipments(parse_shipments(text), today))
`,
            fails: ["decide", "report", "pure"],
            why: "the core prints, and it forgets shipments that haven't arrived yet",
          },
          {
            code: src`
def parse_shipments(text):
    return text

def late_shipments(shipments, today):
    late = []
    for line in shipments.strip().splitlines()[1:]:
        shipment_id, promised, delivered = line.split(",")
        if (delivered and delivered > promised) or (not delivered and today > promised):
            late.append(shipment_id)
    return late

def format_late(ids):
    if not ids:
        return "no late shipments"
    return "late: " + ", ".join(ids)

def late_report(text, today):
    return format_late(late_shipments(parse_shipments(text), today))
`,
            fails: ["parse", "decide", "pure"],
            why: "the logic still parses text itself, so it can't be used on shipments from anywhere else",
          },
        ],
        hints: [
          "Move each kind of work out of the loop into its own function: reading the lines, the lateness rule, the wording.",
          "`late_shipments` receives dictionaries and returns a list of IDs; it never sees text and never prints.",
          "`late_report` becomes one line that passes each function's result to the next.",
        ],
        task: {
          checks: [
            fn("parse", "parse_shipments", [
              example(["shipment_id,promised,delivered\nS1,2024-01-22,2024-01-18\nS3,2024-01-25,\n"], [shipments[0], shipments[2]]),
              hiddenCase("only a header", ["shipment_id,promised,delivered\n"], []),
            ], { label: "parse_shipments() turns CSV text into dictionaries" }),
            fn("decide", "late_shipments", [
              example([shipments, "2024-01-26"], ["S2", "S3"]),
              example([shipments, "2024-01-24"], ["S2"]),
              hiddenCase("delivered exactly on the promised date", [[{ shipment_id: "S9", promised: "2024-02-01", delivered: "2024-02-01" }], "2024-03-01"], []),
              hiddenCase("not delivered, promised today", [[{ shipment_id: "S8", promised: "2024-02-01", delivered: "" }], "2024-02-01"], []),
            ], { label: "late_shipments() applies the lateness rule to dictionaries" }),
            fn("report", "late_report", [
              example(["shipment_id,promised,delivered\nS1,2024-01-22,2024-01-18\nS2,2024-01-27,2024-01-29\nS3,2024-01-25,\n", "2024-01-26"], "late: S2, S3"),
              hiddenCase("nothing late", ["shipment_id,promised,delivered\nS1,2024-01-22,2024-01-18\n", "2024-01-26"], "no late shipments"),
            ], { label: "late_report() still gives the same report" }),
            {
              kind: "expr",
              id: "pure",
              label: "late_shipments() prints nothing",
              hidden: true,
              expr: "import io as _io, contextlib as _cl\n_buf = _io.StringIO()\nwith _cl.redirect_stdout(_buf):\n    late_shipments([{'shipment_id': 'S', 'promised': '2024-01-01', 'delivered': '2024-01-05'}], '2024-02-01')\nresult = _buf.getvalue()",
              expected: py.str(""),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "A pure discount core with a file shell",
        prompt: "Write a checkout in two layers. The core, `apply_discounts(cart, rules)`, is pure: it returns a **new** cart with each line's `price` reduced by its category's discount rate. The shell, `checkout(cart_path, rules_path, out_path)`, reads both JSON files, calls the core, writes the new cart as JSON and returns the cart's total (sum of price × qty).",
        spec: [
          ["apply_discounts(cart, rules)", "cart: list of `{\"sku\", \"category\", \"price\", \"qty\"}`; rules: `{category: rate}` (0.1 = 10% off); categories without a rule are unchanged; the input cart is not modified"],
          ["checkout(cart_path, rules_path, out_path)", "reads the two JSON files, writes the discounted cart to `out_path`, returns the total"],
          ["Example", "a 20.0 sports item with `{\"sports\": 0.25}` → price 15.0"],
        ],
        starter: src`
import json

def apply_discounts(cart, rules):
    return cart

def checkout(cart_path, rules_path, out_path):
    return 0
`,
        answer: src`
import json

def apply_discounts(cart, rules):
    discounted = []
    for line in cart:
        rate = rules.get(line["category"], 0)
        new_line = dict(line)
        new_line["price"] = line["price"] * (1 - rate)
        discounted.append(new_line)
    return discounted

def checkout(cart_path, rules_path, out_path):
    with open(cart_path, encoding="utf-8") as f:
        cart = json.load(f)
    with open(rules_path, encoding="utf-8") as f:
        rules = json.load(f)
    new_cart = apply_discounts(cart, rules)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(new_cart, f)
    return sum(line["price"] * line["qty"] for line in new_cart)
`,
        alternatives: [
          src`
import json
from pathlib import Path

def apply_discounts(cart, rules):
    return [{**line, "price": line["price"] * (1 - rules.get(line["category"], 0))} for line in cart]

def checkout(cart_path, rules_path, out_path):
    cart = json.loads(Path(cart_path).read_text(encoding="utf-8"))
    rules = json.loads(Path(rules_path).read_text(encoding="utf-8"))
    result = apply_discounts(cart, rules)
    Path(out_path).write_text(json.dumps(result), encoding="utf-8")
    total = 0
    for line in result:
        total += line["price"] * line["qty"]
    return total
`,
        ],
        wrong: [
          {
            code: src`
import json

def apply_discounts(cart, rules):
    for line in cart:
        line["price"] = line["price"] * (1 - rules.get(line["category"], 0))
    return cart

def checkout(cart_path, rules_path, out_path):
    with open(cart_path, encoding="utf-8") as f:
        cart = json.load(f)
    with open(rules_path, encoding="utf-8") as f:
        rules = json.load(f)
    new_cart = apply_discounts(cart, rules)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(new_cart, f)
    return sum(line["price"] * line["qty"] for line in new_cart)
`,
            fails: ["keeps-input"],
            why: "the core changes the caller's cart instead of returning a new one",
          },
          {
            code: src`
import json

def apply_discounts(cart, rules):
    with open("rules.json", encoding="utf-8") as f:
        rules = json.load(f)
    return [dict(line, price=line["price"] * (1 - rules.get(line["category"], 0))) for line in cart]

def checkout(cart_path, rules_path, out_path):
    with open(cart_path, encoding="utf-8") as f:
        cart = json.load(f)
    new_cart = apply_discounts(cart, {})
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(new_cart, f)
    return sum(line["price"] * line["qty"] for line in new_cart)
`,
            fails: ["core"],
            why: "the core reads rules.json itself, so it ignores the rules it is given (and breaks when there is no such file)",
          },
        ],
        hints: [
          "The core loops over the lines and builds a new dictionary per line (copy it, then change the price).",
          "A category with no rule has a rate of 0 (`rules.get(category, 0)`).",
          "The shell is three steps: read both files with `json.load`, call the core, write with `json.dump`; then add up price × qty.",
        ],
        task: {
          files: {
            "cart.json": '[{"sku": "SPO-11681", "category": "sports", "price": 20.0, "qty": 2}, {"sku": "HOM-22847", "category": "home", "price": 31.0, "qty": 1}]',
            "rules.json": '{"sports": 0.25, "toys": 0.5}',
          },
          checks: [
            fn("core", "apply_discounts", [
              example([[{ sku: "SPO-11681", category: "sports", price: py.float(20), qty: 2 }], { sports: 0.25 }], [{ sku: "SPO-11681", category: "sports", price: py.float(15), qty: 2 }]),
              example([[{ sku: "HOM-22847", category: "home", price: py.float(31), qty: 1 }], { sports: 0.25 }], [{ sku: "HOM-22847", category: "home", price: py.float(31), qty: 1 }]),
              example([[], { sports: 0.5 }], []),
              hiddenCase("a full discount", [[{ sku: "X", category: "promo", price: py.float(9), qty: 3 }], { promo: 1 }], [{ sku: "X", category: "promo", price: py.float(0), qty: 3 }]),
            ], { label: "apply_discounts() returns the discounted cart", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "apply_discounts", [keepsInput([[{ sku: "S", category: "sports", price: py.float(20), qty: 1 }], { sports: 0.5 }])], { label: "apply_discounts() leaves the given cart unchanged" }),
            {
              kind: "expr",
              id: "shell",
              label: "checkout() reads the files and returns the total",
              show: "checkout('cart.json', 'rules.json', 'out.json')",
              expr: "result = checkout('cart.json', 'rules.json', 'out.json')",
              expected: py.float(61),
            },
            jsonFile("written", "checkout() writes the discounted cart", "out.json", [{ sku: "SPO-11681", category: "sports", price: py.float(15), qty: 2 }, { sku: "HOM-22847", category: "home", price: py.float(31), qty: 1 }], { setup: "checkout('cart.json', 'rules.json', 'out.json')", hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def total(prices):
    return sum(prices)

def shout(amount):
    print("TOTAL", amount)

result = shout(total([7.49, 31.0]))
print(result)
`,
        choices: ["TOTAL 38.49\nNone", "TOTAL 38.49\n38.49", "38.49\nNone", "TOTAL 38.49"],
        answer: 0,
        why: "`total` returns a value; `shout` prints and returns nothing (None). A function that only prints gives its caller nothing to work with.",
      },
      {
        id: "q2",
        prompt: "A common mistake: which function is hardest to test?",
        choices: [
          "def tax_due(path): reads the orders file, computes tax and prints it",
          "def tax_due(orders, rate): returns the tax for the orders",
          "def load_orders(path): returns the parsed orders",
          "def format_tax(amount): returns the text for the report",
        ],
        answer: 0,
        why: "It mixes reading, computing and printing: a test needs a real file and has to capture printed output. The pure version takes data and returns a number.",
      },
      {
        id: "q3",
        prompt: "The finance team now wants the same monthly totals as a CSV export, besides the printed report. With parse/compute/present separated, what changes?",
        choices: [
          "Add a new presenter that writes CSV; parsing and computing stay as they are",
          "Copy the whole script and change the print lines",
          "Add a flag to the compute function that makes it write CSV",
          "Rewrite the parser",
        ],
        answer: 0,
        why: "Only the output edge is new. The core already returns the totals, so a second presenter can use them.",
      },
    ],
    review: [
      "Three concerns: get the data, decide, show the result.",
      "Pure core (data in, data out) with input and output at the edges, connected by return values.",
      "Separated layers can be reused with new inputs and outputs, and tested without files.",
      "Next: settings that change between environments, kept out of the code.",
    ],
  },

  // ------------------------------------------------------------------ PY-L40-02 configuration
  {
    id: "PY-L40-02",
    version: 2,
    slug: "layered-configuration",
    title: "Configuration: defaults, files and environment",
    lede: "Page sizes, currencies and connection strings differ between your laptop, the test server and production. Configuration keeps them out of the code: defaults, overridden by a file, overridden by environment variables, checked once.",
    focus: "Load settings in layers with a clear precedence and validate them once into one object.",
    minutes: 22,
    objectives: [
      "Merge defaults, a settings file and environment overrides in a fixed precedence",
      "Convert environment text to the right types, ignoring unrelated variables",
      "Validate once into a frozen dataclass that the rest of the program receives",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comp-if", "comparison", "conditional-expr", "continue-statement", "conversion", "dataclass-dec", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "exc-name", "except-type", "field-ann", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-condition", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "set-literal", "star-kwargs", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "type-call", "unquoted-name"],
    teaches: ["config-map"],
    blocks: [
      {
        kind: "text",
        md: "Hard-coded values (`PAGE_SIZE = 50` buried in a function) force a code change for every environment. Instead, collect settings in **layers**, each overriding the one before: built-in **defaults**, then a **settings file** (JSON or TOML) for this deployment, then **environment variables** for the machine or container (often secrets and per-server values). Environment variables are always text, so they must be converted to the type each setting expects. Read the environment as a dictionary passed in (`os.environ` in production), so tests can pass a plain dictionary (the CLI & Automation module, the Advanced OOP & Design module).",
      },
      {
        kind: "example",
        title: "Three layers, one result",
        code: src`
import json

DEFAULTS = {"page_size": 50, "currency": "USD", "debug": False}

def from_env(environ, prefix, defaults):
    overrides = {}
    for key, text in environ.items():
        if not key.startswith(prefix):
            continue
        name = key[len(prefix):].lower()
        if name not in defaults:
            continue
        default = defaults[name]
        if isinstance(default, bool):
            overrides[name] = text.lower() in ("1", "true", "yes")
        elif isinstance(default, int):
            overrides[name] = int(text)
        else:
            overrides[name] = text
    return overrides

file_settings = json.loads('{"page_size": 100, "currency": "GBP"}')
environ = {"SHOP_CURRENCY": "EUR", "SHOP_DEBUG": "true", "PATH": "/usr/bin", "SHOP_THEME": "dark"}
settings = {**DEFAULTS, **file_settings, **from_env(environ, "SHOP_", DEFAULTS)}
print(settings)
`,
        output: "{'page_size': 100, 'currency': 'EUR', 'debug': True}\n",
        note: "In `{**a, **b, **c}` later layers win: the file set the page size, the environment set the currency (overriding the file's GBP) and debug. `PATH` lacks the prefix and `SHOP_THEME` isn't a known setting, so both are ignored. `bool` is checked before `int` because `True` is also an `int` in Python.",
      },
      {
        kind: "text",
        md: "Validate the merged settings **once**, at start-up, and hand the rest of the program an object, not a loose dictionary. A dataclass with `frozen=True` (the Data Models & Typing module introduced dataclasses) can't be changed after it is created, so no part of the program can quietly modify a setting another part relies on, and `__post_init__` is the natural place to reject bad values with a clear message.",
      },
      {
        kind: "example",
        title: "A validated, frozen settings object",
        code: src`
from dataclasses import dataclass, FrozenInstanceError

@dataclass(frozen=True)
class Settings:
    page_size: int
    currency: str
    debug: bool

    def __post_init__(self):
        if not 1 <= self.page_size <= 500:
            raise ValueError(f"page_size must be 1-500, got {self.page_size}")
        if self.currency not in ("USD", "EUR", "GBP"):
            raise ValueError(f"unsupported currency {self.currency!r}")

settings = Settings(**{"page_size": 100, "currency": "EUR", "debug": True})
print(settings)
try:
    settings.page_size = 5
except FrozenInstanceError as error:
    print(type(error).__name__)
try:
    Settings(page_size=0, currency="USD", debug=False)
except ValueError as error:
    print(error)
`,
        output: "Settings(page_size=100, currency='EUR', debug=True)\nFrozenInstanceError\npage_size must be 1-500, got 0\n",
        note: "`Settings(**merged)` passes each key as a keyword argument. A typo'd or out-of-range value fails at start-up with a message naming the setting, instead of crashing later in some unrelated function.",
      },
      {
        kind: "text",
        md: "**When to use it:** for anything that differs between environments or that operators should change without a code release: limits, URLs, feature switches, credentials (credentials only from the environment or a secrets store, never from the repository). **Mistakes to avoid:** reading `os.environ` all over the program (read once, pass the settings object); forgetting that environment values are strings (`\"false\"` is truthy!); silently ignoring invalid values; and mutating the defaults dictionary while merging.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Let the environment win",
      prompt: "`merge_settings` applies the layers in the wrong order, so the settings file overrides the environment. Fix the order (defaults, then file, then environment) and run it: the environment's currency should win.",
      spec: [
        ["Function", "`merge_settings(defaults, file_settings, env_settings)`"],
        ["Returns", "a new dictionary: defaults, overridden by the file, overridden by the environment"],
      ],
      starter: src`
def merge_settings(defaults, file_settings, env_settings):
    return {**defaults, **env_settings, **file_settings}

print(merge_settings({"currency": "USD", "page_size": 50}, {"currency": "GBP"}, {"currency": "EUR"}))
`,
      answer: src`
def merge_settings(defaults, file_settings, env_settings):
    return {**defaults, **file_settings, **env_settings}

print(merge_settings({"currency": "USD", "page_size": 50}, {"currency": "GBP"}, {"currency": "EUR"}))
`,
      wrong: [
        {
          code: src`
def merge_settings(defaults, file_settings, env_settings):
    defaults.update(file_settings)
    defaults.update(env_settings)
    return defaults
`,
          fails: ["keeps-input"],
          why: "the right values, but the shared defaults dictionary is changed for everyone",
        },
      ],
      hints: [
        "In `{**a, **b}`, keys from `b` replace keys from `a`.",
        "The layer that should win must come last.",
        "Put the environment settings after the file settings.",
      ],
      task: {
        checks: [
          fn("returns", "merge_settings", [
            example([{ currency: "USD", page_size: 50 }, { currency: "GBP" }, { currency: "EUR" }], { currency: "EUR", page_size: 50 }),
            hiddenCase("only the file sets a value", [{ page_size: 50 }, { page_size: 100 }, {}], { page_size: 100 }),
          ], { label: "merge_settings() lets later layers win" }),
          fn("keeps-input", "merge_settings", [keepsInput([{ a: 1 }, { a: 2 }, { a: 3 }])], { label: "merge_settings() leaves the layers unchanged" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Typed environment overrides",
        prompt: "Write `env_overrides(environ, prefix, defaults)`: for every variable named `prefix + NAME` where `name` (lower-cased) is a key of `defaults`, convert its text to the type of that default and return the overrides. Booleans accept `true/false/1/0/yes/no` (any case); anything else for a boolean, or text that isn't a whole number for an int, raises `ValueError` naming the variable.",
        spec: [
          ["Function", "`env_overrides(environ, prefix, defaults)`"],
          ["Types", "bool default → `True` for true/1/yes, `False` for false/0/no (case-insensitive), else ValueError; int default → `int(text)` (ValueError if not a whole number); str default → the text"],
          ["Ignores", "variables without the prefix, and names not in `defaults`"],
          ["Example", "`{\"SHOP_PAGE_SIZE\": \"25\", \"HOME\": \"/root\"}` with prefix `SHOP_` → `{\"page_size\": 25}`"],
        ],
        starter: src`
def env_overrides(environ, prefix, defaults):
    return {}

print(env_overrides({"SHOP_PAGE_SIZE": "25", "HOME": "/root"}, "SHOP_", {"page_size": 50, "debug": False}))
`,
        answer: src`
def env_overrides(environ, prefix, defaults):
    overrides = {}
    for key, text in environ.items():
        if not key.startswith(prefix):
            continue
        name = key[len(prefix):].lower()
        if name not in defaults:
            continue
        default = defaults[name]
        if isinstance(default, bool):
            word = text.strip().lower()
            if word in ("true", "1", "yes"):
                overrides[name] = True
            elif word in ("false", "0", "no"):
                overrides[name] = False
            else:
                raise ValueError(f"{key} must be true or false, got {text!r}")
        elif isinstance(default, int):
            try:
                overrides[name] = int(text)
            except ValueError:
                raise ValueError(f"{key} must be a whole number, got {text!r}") from None
        else:
            overrides[name] = text
    return overrides

print(env_overrides({"SHOP_PAGE_SIZE": "25", "HOME": "/root"}, "SHOP_", {"page_size": 50, "debug": False}))
`,
        alternatives: [
          src`
TRUE_WORDS = {"true": True, "1": True, "yes": True, "false": False, "0": False, "no": False}

def convert(key, text, default):
    if type(default) is bool:
        if text.lower() not in TRUE_WORDS:
            raise ValueError(key)
        return TRUE_WORDS[text.lower()]
    if type(default) is int:
        return int(text)
    return text

def env_overrides(environ, prefix, defaults):
    result = {}
    for key in environ:
        if key.startswith(prefix) and key[len(prefix):].lower() in defaults:
            name = key[len(prefix):].lower()
            result[name] = convert(key, environ[key], defaults[name])
    return result
`,
        ],
        wrong: [
          {
            code: src`
def env_overrides(environ, prefix, defaults):
    overrides = {}
    for key, text in environ.items():
        if key.startswith(prefix):
            name = key[len(prefix):].lower()
            if name in defaults:
                if isinstance(defaults[name], int):
                    overrides[name] = int(text)
                elif isinstance(defaults[name], bool):
                    overrides[name] = text.lower() == "true"
                else:
                    overrides[name] = text
    return overrides
`,
            fails: ["returns"],
            why: "`bool` is a kind of `int`, so `int(\"true\")` is tried for booleans and fails",
          },
          {
            code: src`
def env_overrides(environ, prefix, defaults):
    overrides = {}
    for key, text in environ.items():
        if key.startswith(prefix) and key[len(prefix):].lower() in defaults:
            overrides[key[len(prefix):].lower()] = text
    return overrides
`,
            fails: ["returns"],
            why: "the values stay text: page size `\"25\"` and debug `\"false\"`, which is truthy",
          },
        ],
        hints: [
          "Skip variables without the prefix; strip the prefix and lower-case the rest to get the setting name.",
          "Decide the conversion from the type of the default, testing `bool` before `int` (a bool is also an int).",
          "For booleans, compare the lower-cased text with the accepted words and raise ValueError otherwise.",
        ],
        task: {
          checks: [
            fn("returns", "env_overrides", [
              example([{ SHOP_PAGE_SIZE: "25", HOME: "/root" }, "SHOP_", { page_size: 50, debug: false }], { page_size: 25 }),
              example([{ SHOP_DEBUG: "Yes", SHOP_CURRENCY: "EUR" }, "SHOP_", { debug: false, currency: "USD" }], { debug: true, currency: "EUR" }),
              example([{}, "SHOP_", { debug: false }], {}),
              hiddenCase("a boolean switched off", [{ APP_DEBUG: "0" }, "APP_", { debug: true }], { debug: false }),
              hiddenCase("a prefixed name that isn't a setting", [{ SHOP_THEME: "dark" }, "SHOP_", { page_size: 50 }], {}),
              raisesCase([{ SHOP_DEBUG: "maybe" }, "SHOP_", { debug: false }], "ValueError", { label: "a boolean that isn't a known word" }),
              raisesCase([{ SHOP_PAGE_SIZE: "ten" }, "SHOP_", { page_size: 50 }], "ValueError", { label: "a number that isn't a number" }),
            ], { label: "env_overrides() converts prefixed variables to the defaults' types" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Load and validate the settings",
        prompt: "Write `load_settings(defaults, file_text, environ)` that returns the final, validated settings as a dictionary: defaults, then the JSON settings file (`file_text`, possibly empty), then environment overrides with prefix `SHOP_` (as in c1; you may write your own conversion). Validate the result: `page_size` from 1 to 500 and `currency` one of USD, EUR, GBP; otherwise raise `ValueError`. Unknown keys in the file are an error too.",
        spec: [
          ["Function", "`load_settings(defaults, file_text, environ)`"],
          ["Precedence", "defaults < file < `SHOP_` environment variables"],
          ["Raises", "`ValueError` for an unknown key in the file, a page size outside 1–500, or an unsupported currency"],
          ["Rule", "`defaults` is not modified"],
        ],
        starter: src`
import json

def load_settings(defaults, file_text, environ):
    return dict(defaults)
`,
        answer: src`
import json

def env_value(text, default):
    if isinstance(default, bool):
        return text.lower() in ("true", "1", "yes")
    if isinstance(default, int):
        return int(text)
    return text

def load_settings(defaults, file_text, environ):
    settings = dict(defaults)
    from_file = json.loads(file_text) if file_text.strip() else {}
    for key, value in from_file.items():
        if key not in defaults:
            raise ValueError(f"unknown setting {key!r} in the settings file")
        settings[key] = value
    for key, text in environ.items():
        name = key[len("SHOP_"):].lower()
        if key.startswith("SHOP_") and name in defaults:
            settings[name] = env_value(text, defaults[name])
    if not 1 <= settings["page_size"] <= 500:
        raise ValueError("page_size must be between 1 and 500")
    if settings["currency"] not in ("USD", "EUR", "GBP"):
        raise ValueError("currency must be USD, EUR or GBP")
    return settings
`,
        alternatives: [
          src`
import json

def load_settings(defaults, file_text, environ):
    layer = json.loads(file_text) if file_text.strip() else {}
    unknown = [k for k in layer if k not in defaults]
    if unknown:
        raise ValueError(f"unknown settings: {unknown}")
    env = {}
    for key, text in environ.items():
        if key.startswith("SHOP_"):
            name = key[5:].lower()
            if name in defaults:
                d = defaults[name]
                env[name] = (text.lower() in ("true", "1", "yes")) if type(d) is bool else int(text) if type(d) is int else text
    merged = {**defaults, **layer, **env}
    if merged["page_size"] < 1 or merged["page_size"] > 500 or merged["currency"] not in {"USD", "EUR", "GBP"}:
        raise ValueError("invalid settings")
    return merged
`,
        ],
        wrong: [
          {
            code: src`
import json

def load_settings(defaults, file_text, environ):
    settings = defaults
    if file_text.strip():
        settings.update(json.loads(file_text))
    for key, text in environ.items():
        name = key[len("SHOP_"):].lower()
        if key.startswith("SHOP_") and name in settings:
            settings[name] = int(text) if isinstance(settings[name], int) else text
    return settings
`,
            fails: ["returns", "keeps-input"],
            why: "it changes the shared defaults, accepts unknown and invalid settings, and converts booleans as ints",
          },
          {
            code: src`
import json

def load_settings(defaults, file_text, environ):
    settings = dict(defaults)
    for key, text in environ.items():
        name = key[len("SHOP_"):].lower()
        if key.startswith("SHOP_") and name in defaults:
            settings[name] = int(text) if type(defaults[name]) is int else text
    if file_text.strip():
        settings.update(json.loads(file_text))
    if not 1 <= settings["page_size"] <= 500 or settings["currency"] not in ("USD", "EUR", "GBP"):
        raise ValueError("invalid")
    return settings
`,
            fails: ["returns"],
            why: "the file is applied after the environment, so the file wins and unknown keys slip through",
          },
        ],
        hints: [
          "Start from a copy of the defaults, then apply the file, then the environment.",
          "Check each file key against the defaults before using it; convert environment text by the default's type.",
          "Validate the merged result last and raise ValueError with a message naming the problem.",
        ],
        task: {
          checks: [
            fn("returns", "load_settings", [
              example([{ page_size: 50, currency: "USD", debug: false }, '{"page_size": 100}', { SHOP_CURRENCY: "EUR" }], { page_size: 100, currency: "EUR", debug: false }),
              example([{ page_size: 50, currency: "USD", debug: false }, "", {}], { page_size: 50, currency: "USD", debug: false }),
              example([{ page_size: 50, currency: "USD", debug: false }, '{"currency": "GBP"}', { SHOP_DEBUG: "true", SHOP_PAGE_SIZE: "20" }], { page_size: 20, currency: "GBP", debug: true }),
              hiddenCase("the environment beats the file", [{ page_size: 50, currency: "USD", debug: false }, '{"page_size": 100}', { SHOP_PAGE_SIZE: "250" }], { page_size: 250, currency: "USD", debug: false }),
              raisesCase([{ page_size: 50, currency: "USD", debug: false }, '{"colour": "blue"}', {}], "ValueError", { label: "an unknown key in the file" }),
              raisesCase([{ page_size: 50, currency: "USD", debug: false }, "", { SHOP_PAGE_SIZE: "900" }], "ValueError", { label: "a page size that is too big" }),
              raisesCase([{ page_size: 50, currency: "USD", debug: false }, '{"currency": "JPY"}', {}], "ValueError", { label: "an unsupported currency" }),
            ], { label: "load_settings() merges, converts and validates" }),
            fn("keeps-input", "load_settings", [keepsInput([{ page_size: 50, currency: "USD", debug: false }, '{"page_size": 10}', { SHOP_DEBUG: "1" }])], { label: "load_settings() leaves the defaults unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
defaults = {"retries": 3, "region": "us-east"}
from_file = {"retries": 5}
from_env = {"region": "eu-west"}
settings = {**defaults, **from_file, **from_env}
print(settings["retries"], settings["region"], defaults["retries"])
`,
        choices: ["5 eu-west 3", "3 us-east 3", "5 eu-west 5", "3 eu-west 3"],
        answer: 0,
        why: "Later layers win, and unpacking into a new dictionary leaves `defaults` unchanged.",
      },
      {
        id: "q2",
        prompt: "A common mistake: what does this print?",
        program: src`
environ = {"SHOP_DEBUG": "false"}
debug = bool(environ["SHOP_DEBUG"])
print(debug)
`,
        choices: ["True", "False", "false", "ValueError"],
        answer: 0,
        why: "Environment values are text, and any non-empty text is truthy, so `bool(\"false\")` is True. Compare the text with the accepted words instead.",
      },
      {
        id: "q3",
        prompt: "Where should a database password come from?",
        choices: [
          "An environment variable (or a secrets manager) read at start-up",
          "A constant in the source code",
          "The settings file committed to the repository",
          "A default value in the dataclass",
        ],
        answer: 0,
        why: "Secrets must never be in the repository. The environment or a secrets store supplies them per deployment.",
      },
    ],
    review: [
      "Layers: defaults < settings file < environment; later layers win.",
      "Environment values are text: convert by type, and ignore unrelated variables.",
      "Validate once into a frozen object and pass it to the code that needs it.",
      "Next: keeping the core independent of storage and services.",
    ],
  },

  // ------------------------------------------------------------------ PY-L40-03 dependency boundaries
  {
    id: "PY-L40-03",
    version: 2,
    slug: "dependency-boundaries",
    title: "Dependency boundaries: interfaces, adapters and import rules",
    lede: "Business rules shouldn't know whether orders live in SQLite, a JSON file or a web API. The core states what it needs as an interface; adapters provide it; and an architecture test keeps imports pointing the right way.",
    focus: "Make the core depend on an interface it defines, implement adapters for it, and check the import rules.",
    minutes: 24,
    objectives: [
      "Describe what the core needs as a Protocol and pass an implementation in",
      "Write adapters (in-memory, SQLite, files) that satisfy the same interface",
      "Check dependency direction automatically by reading imports with ast",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conditional-expr", "continue-statement", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "encoding-arg", "exc-name", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "module-file", "nested-condition", "nested-loop", "newline-escape", "none-value", "path-call", "plain-class", "print-call", "print-several", "print-text", "protocol-base", "reassignment", "self-name", "sqlite-call", "string-index", "string-split", "subclass", "top-level-indent", "truthiness", "type-call", "unquoted-name", "with-statement"],
    teaches: ["passed-call"],
    blocks: [
      {
        kind: "text",
        md: "A **dependency** is something a module needs: another module, a database, a service. When the refund rules import `sqlite3` and run SQL themselves, every test needs a database, and moving to another store means rewriting the rules. Instead, let the core say *what* it needs: an object with `get(order_id)` and `save(order)`, described as a `Protocol` (see Data Models & Typing). **Adapters** implement that interface for each technology, and the program passes one in (the Advanced OOP & Design module's dependency injection, now at the scale of whole modules). Dependencies point **inward**: adapters import the core, never the other way round.",
      },
      {
        kind: "example",
        title: "One service, two stores",
        code: src`
import sqlite3
from typing import Protocol

class OrderStore(Protocol):
    def get(self, order_id):
        """Return the order dictionary, or None."""

    def save(self, order):
        """Store the order dictionary."""

class InMemoryOrders:
    def __init__(self):
        self.rows = {}

    def get(self, order_id):
        return self.rows.get(order_id)

    def save(self, order):
        self.rows[order["order_id"]] = dict(order)

class SqliteOrders:
    def __init__(self, connection):
        self.db = connection
        self.db.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT PRIMARY KEY, status TEXT, total REAL)")

    def get(self, order_id):
        row = self.db.execute("SELECT order_id, status, total FROM orders WHERE order_id = ?", (order_id,)).fetchone()
        return None if row is None else {"order_id": row[0], "status": row[1], "total": row[2]}

    def save(self, order):
        self.db.execute("INSERT OR REPLACE INTO orders VALUES (?, ?, ?)", (order["order_id"], order["status"], order["total"]))

class RefundService:
    def __init__(self, store: OrderStore):
        self.store = store

    def refund(self, order_id):
        order = self.store.get(order_id)
        if order is None or order["status"] != "delivered":
            return False
        order["status"] = "refunded"
        self.store.save(order)
        return True

for store in [InMemoryOrders(), SqliteOrders(sqlite3.connect(":memory:"))]:
    store.save({"order_id": "O100282", "status": "delivered", "total": 35.84})
    service = RefundService(store)
    print(type(store).__name__, service.refund("O100282"), service.refund("O100282"), store.get("O100282")["status"])
`,
        output: "InMemoryOrders True False refunded\nSqliteOrders True False refunded\n",
        note: "`RefundService` never mentions SQLite: the same rules ran over a dictionary and over a real database. In a project the parts live in separate modules: `domain.py` (the service and the Protocol), `adapters.py` (which imports domain), and `main.py`, which builds the real adapter and passes it in. Tests pass the in-memory one.",
      },
      {
        kind: "text",
        md: "Import rules decay unless something checks them. An **architecture test** reads each module's imports and fails when a forbidden one appears. The standard `ast` module parses source into a tree without running it (`ast.parse(text)`; a real test would read each module's file): `ast.walk` visits every node, an `ast.Import` node lists `names` (each with `.name`), and an `ast.ImportFrom` node has the `module` it imports from.",
      },
      {
        kind: "example",
        title: "An architecture test with ast",
        code: src`
import ast

trees = {
    "domain.py": ast.parse("from dataclasses import dataclass\n\n@dataclass\nclass Order:\n    order_id: str\n    total: float\n"),
    "service.py": ast.parse("from domain import Order\nimport sqlite3\n"),
    "adapters.py": ast.parse("import sqlite3\nfrom domain import Order\n"),
}

def imported_modules(tree):
    names = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names += [alias.name for alias in node.names]
        elif isinstance(node, ast.ImportFrom):
            names.append(node.module)
    return names

for module, tree in trees.items():
    print(module, imported_modules(tree))
print([m for m in ("domain.py", "service.py") if "sqlite3" in imported_modules(trees[m])])
`,
        output: "domain.py ['dataclasses']\nservice.py ['domain', 'sqlite3']\nadapters.py ['sqlite3', 'domain']\n['service.py']\n",
        note: "The rule *only adapters may import sqlite3* caught `service.py`. Run as a test (see Testing & Code Quality), this stops the violation before it is merged.",
      },
      {
        kind: "text",
        md: "**When to draw a boundary:** around anything slow, external or likely to change: databases, HTTP APIs, the clock, the file system, email. **Mistakes to avoid:** adapters leaking their types into the core (returning `sqlite3.Row` objects instead of plain data); the core importing a concrete adapter \"just for the default\"; and interfaces so wide (twenty methods) that every adapter is painful to write. Keep each interface to what the core actually calls.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Pass the store in",
      prompt: "`count_delivered` connects to a SQLite file itself, so it can't be used or tested without that database. Change it to take a `store` argument (anything with `all_orders()`) instead of creating a connection, and run it with the in-memory store.",
      spec: [
        ["Function", "`count_delivered(store)`"],
        ["Returns", "how many of `store.all_orders()` have status `\"delivered\"`"],
      ],
      starter: src`
import sqlite3

def count_delivered():
    db = sqlite3.connect("shop.db")
    rows = db.execute("SELECT status FROM orders").fetchall()
    return sum(1 for (status,) in rows if status == "delivered")

class InMemoryOrders:
    def __init__(self, orders):
        self.orders = orders

    def all_orders(self):
        return list(self.orders)

store = InMemoryOrders([{"status": "delivered"}, {"status": "returned"}, {"status": "delivered"}])
print(count_delivered())
`,
      answer: src`
def count_delivered(store):
    return sum(1 for order in store.all_orders() if order["status"] == "delivered")

class InMemoryOrders:
    def __init__(self, orders):
        self.orders = orders

    def all_orders(self):
        return list(self.orders)

store = InMemoryOrders([{"status": "delivered"}, {"status": "returned"}, {"status": "delivered"}])
print(count_delivered(store))
`,
      wrong: [
        {
          code: src`
def count_delivered(store):
    return len(store.all_orders())
`,
          fails: ["count"],
          why: "it counts every order, not only delivered ones",
        },
      ],
      hints: [
        "The function should receive what it needs as a parameter instead of creating it.",
        "Anything with an `all_orders()` method will do: the in-memory store in the example, a SQLite adapter in production.",
        "Count the orders whose status is delivered; no import of sqlite3 is needed any more.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "count",
            label: "count_delivered() works with any store passed in",
            show: "count_delivered(store) with 2 delivered of 3",
            expr: "class _S:\n    def __init__(self, o):\n        self.o = o\n    def all_orders(self):\n        return self.o\nresult = [count_delivered(_S([{'status': 'delivered'}, {'status': 'returned'}, {'status': 'delivered'}])), count_delivered(_S([]))]",
            expected: py.list(py.int(2), py.int(0)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A JSON-file adapter for the refund service",
        prompt: "`service.py` (read-only) contains `RefundService(store)`, which needs a store with `get(order_id)` (the order dictionary, or `None`) and `save(order)`. Write an adapter `JsonFileOrders(path)` that keeps the orders in a JSON file (a dictionary from order ID to order). It must read the file on every `get` and write it on every `save`, so another process sees the changes; a file that doesn't exist yet means no orders.",
        spec: [
          ["Class", "`JsonFileOrders(path)` with `get(order_id)` and `save(order)`"],
          ["File", "a JSON object: order ID → order dictionary"],
          ["Rules", "`get` returns a copy that changing doesn't affect the file; `save` stores by `order[\"order_id\"]`; a missing file counts as empty"],
        ],
        starter: src`
import json
import os
from service import RefundService

class JsonFileOrders:
    def __init__(self, path):
        self.path = path

    def get(self, order_id):
        return None

    def save(self, order):
        pass

store = JsonFileOrders("orders.json")
store.save({"order_id": "O100282", "status": "delivered", "total": 35.84})
print(RefundService(store).refund("O100282"), store.get("O100282"))
`,
        answer: src`
import json
import os
from service import RefundService

class JsonFileOrders:
    def __init__(self, path):
        self.path = path

    def _load(self):
        if not os.path.exists(self.path):
            return {}
        with open(self.path, encoding="utf-8") as f:
            return json.load(f)

    def get(self, order_id):
        return self._load().get(order_id)

    def save(self, order):
        orders = self._load()
        orders[order["order_id"]] = order
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump(orders, f)

store = JsonFileOrders("orders.json")
store.save({"order_id": "O100282", "status": "delivered", "total": 35.84})
print(RefundService(store).refund("O100282"), store.get("O100282"))
`,
        alternatives: [
          src`
import json
from pathlib import Path
from service import RefundService

class JsonFileOrders:
    def __init__(self, path):
        self.file = Path(path)

    def _read(self):
        return json.loads(self.file.read_text(encoding="utf-8")) if self.file.exists() else {}

    def get(self, order_id):
        found = self._read().get(order_id)
        return None if found is None else dict(found)

    def save(self, order):
        data = self._read()
        data[order["order_id"]] = dict(order)
        self.file.write_text(json.dumps(data), encoding="utf-8")
`,
        ],
        wrong: [
          {
            code: src`
class JsonFileOrders:
    def __init__(self, path):
        self.path = path
        self.orders = {}

    def get(self, order_id):
        return self.orders.get(order_id)

    def save(self, order):
        self.orders[order["order_id"]] = order
`,
            fails: ["file", "shared"],
            why: "it keeps the orders in memory only: nothing reaches the file",
          },
          {
            code: src`
import json

class JsonFileOrders:
    def __init__(self, path):
        self.path = path

    def get(self, order_id):
        with open(self.path, encoding="utf-8") as f:
            return json.load(f).get(order_id)

    def save(self, order):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump({order["order_id"]: order}, f)
`,
            fails: ["file", "missing", "shared"],
            why: "a missing file crashes `get`, and each save overwrites the other orders",
          },
        ],
        hints: [
          "A small helper that reads the whole file into a dictionary (or returns `{}` when the file doesn't exist) serves both methods.",
          "`get` looks the ID up in that dictionary; `json.load` builds fresh objects, so the caller's changes can't reach the file.",
          "`save` reads, updates one entry, and writes the whole dictionary back.",
        ],
        task: {
          files: { "service.py": SERVICE_PY },
          checks: [
            {
              kind: "expr",
              id: "service",
              label: "RefundService works with the adapter",
              show: "save a delivered order, refund it twice",
              expr: "from service import RefundService\nimport os as _os\nif _os.path.exists('t1.json'):\n    _os.remove('t1.json')\n_s = JsonFileOrders('t1.json')\n_s.save({'order_id': 'O1', 'status': 'delivered', 'total': 10.0})\n_svc = RefundService(_s)\nresult = [_svc.refund('O1'), _svc.refund('O1'), _s.get('O1')['status'], _s.get('O9')]",
              expected: py.list(yes, py.bool(false), py.str("refunded"), py.none),
            },
            {
              kind: "expr",
              id: "file",
              label: "the orders are in the JSON file",
              hidden: true,
              expr: "import json as _json, os as _os\nif _os.path.exists('t2.json'):\n    _os.remove('t2.json')\n_s = JsonFileOrders('t2.json')\n_s.save({'order_id': 'A', 'status': 'delivered', 'total': 1.0})\n_s.save({'order_id': 'B', 'status': 'returned', 'total': 2.0})\nwith open('t2.json', encoding='utf-8') as _f:\n    result = sorted(_json.load(_f))",
              expected: strs("A", "B"),
            },
            {
              kind: "expr",
              id: "shared",
              label: "a second adapter on the same file sees the changes",
              hidden: true,
              expr: "import os as _os\nif _os.path.exists('t3.json'):\n    _os.remove('t3.json')\n_a = JsonFileOrders('t3.json')\n_b = JsonFileOrders('t3.json')\n_a.save({'order_id': 'X', 'status': 'delivered', 'total': 3.0})\n_a.save({'order_id': 'Y', 'status': 'delivered', 'total': 4.0})\nresult = [_b.get('X')['total'], _b.get('Y')['total']]",
              expected: py.list(py.float(3), py.float(4)),
            },
            {
              kind: "expr",
              id: "missing",
              label: "a file that doesn't exist yet means no orders",
              hidden: true,
              expr: "import os as _os\nif _os.path.exists('never.json'):\n    _os.remove('never.json')\nresult = JsonFileOrders('never.json').get('O1')",
              expected: py.none,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Check the layer rules",
        prompt: "A project allows each of its modules to import only certain other project modules (third-party and standard-library imports are not restricted). Write `layer_violations(sources, allowed)` that parses every module with `ast` and returns the forbidden imports as sorted `(module, imported)` pairs.",
        spec: [
          ["Function", "`layer_violations(sources, allowed)`"],
          ["sources", "`{\"domain\": source_text, \"adapters\": ..., ...}`: project module names (without `.py`) to their source"],
          ["allowed", "`{module: [project modules it may import]}`"],
          ["Returns", "a sorted list of `(module, imported)` tuples where `imported` is another project module not in `allowed[module]`; imports of non-project modules are ignored; `import a.b` and `from a.b import c` count as importing `a`"],
        ],
        starter: src`
import ast

def layer_violations(sources, allowed):
    return []
`,
        answer: src`
import ast

def layer_violations(sources, allowed):
    found = []
    for module, source in sources.items():
        for node in ast.walk(ast.parse(source)):
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            else:
                continue
            for name in names:
                top = name.split(".")[0]
                if top in sources and top != module and top not in allowed.get(module, []):
                    if (module, top) not in found:
                        found.append((module, top))
    return sorted(found)
`,
        alternatives: [
          src`
import ast

def imports(source):
    tree = ast.parse(source)
    out = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                out[alias.name.split(".")[0]] = True
        elif isinstance(node, ast.ImportFrom) and node.module:
            out[node.module.split(".")[0]] = True
    return list(out)

def layer_violations(sources, allowed):
    bad = []
    for module, source in sources.items():
        for name in imports(source):
            if name in sources and name != module and name not in allowed.get(module, []):
                bad.append((module, name))
    return sorted(bad)
`,
        ],
        wrong: [
          {
            code: src`
import ast

def layer_violations(sources, allowed):
    found = []
    for module, source in sources.items():
        for node in ast.walk(ast.parse(source)):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name not in allowed.get(module, []):
                        found.append((module, alias.name))
    return sorted(found)
`,
            fails: ["returns"],
            why: "it flags standard-library imports and misses `from ... import` statements",
          },
          {
            code: src`
def layer_violations(sources, allowed):
    found = []
    for module, source in sources.items():
        for other in sources:
            if other != module and other in source and other not in allowed.get(module, []):
                found.append((module, other))
    return sorted(found)
`,
            fails: ["returns"],
            why: "searching the text finds names in comments and strings, not real imports",
          },
        ],
        hints: [
          "Parse each source with `ast.parse` and visit nodes with `ast.walk`.",
          "`ast.Import` nodes have `names` (each `.name`); `ast.ImportFrom` nodes have `module`. Keep only the part before the first dot.",
          "Report a name only if it is another project module (a key of `sources`) that isn't allowed; collect each pair once and sort.",
        ],
        task: {
          checks: [
            fn("returns", "layer_violations", [
              example([{ domain: "from dataclasses import dataclass\n", service: "import domain\nimport adapters\n", adapters: "import sqlite3\nfrom domain import Order\n" }, { domain: [], service: ["domain"], adapters: ["domain"] }], [py.tuple(py.str("service"), py.str("adapters"))]),
              example([{ domain: "import adapters\n", adapters: "import domain\n" }, { domain: [], adapters: ["domain"] }], [py.tuple(py.str("domain"), py.str("adapters"))]),
              example([{ a: "import json\n" }, { a: [] }], []),
              hiddenCase("a dotted import inside a package", [{ core: "from adapters.sql import Repo\n", adapters: "" }, { core: [], adapters: ["core"] }], [py.tuple(py.str("core"), py.str("adapters"))]),
              hiddenCase("a module name inside a comment", [{ core: "# uses adapters later\nimport json\n", adapters: "" }, { core: [], adapters: [] }], []),
              hiddenCase("the same violation twice", [{ ui: "import db\nfrom db import query\n", db: "" }, { ui: [], db: [] }], [py.tuple(py.str("ui"), py.str("db"))]),
            ], { label: "layer_violations() reports forbidden project imports" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import ast

source = "import os\nfrom domain.orders import Order\nimport adapters.sql as sql\n"
found = []
for node in ast.walk(ast.parse(source)):
    if isinstance(node, ast.Import):
        found += [alias.name for alias in node.names]
    elif isinstance(node, ast.ImportFrom):
        found.append(node.module)
print(found)
`,
        choices: ["['os', 'domain.orders', 'adapters.sql']", "['os', 'Order', 'sql']", "['os', 'domain', 'adapters']", "['domain.orders']"],
        answer: 0,
        why: "`Import` nodes list full module names (`adapters.sql`, whatever its alias), and `ImportFrom` nodes record the module imported from, `domain.orders`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the domain module contains `from adapters import SqliteOrders` so that `OrderService()` can create its store by default. What does this break?",
        choices: [
          "The core now depends on SQLite: tests and other stores drag the adapter (and the database) along",
          "Nothing: defaults are convenient",
          "Python can't import across modules",
          "The adapter can no longer import the domain",
        ],
        answer: 0,
        why: "The dependency now points outward, and it often creates a circular import too. The entry point (main) should build the adapter and pass it in.",
      },
      {
        id: "q3",
        prompt: "Which belongs in the core of an order system?",
        choices: [
          "The rule that only delivered orders can be refunded",
          "The SQL that reads the orders table",
          "The HTTP call to the payment provider",
          "Reading the database URL from the environment",
        ],
        answer: 0,
        why: "Business rules are the core. SQL, HTTP and configuration belong to adapters and the entry point.",
      },
    ],
    review: [
      "The core states what it needs (a Protocol); adapters implement it; the entry point wires them together.",
      "Dependencies point inward: adapters import the core, never the reverse.",
      "An architecture test with `ast` keeps import rules from eroding.",
      "Next: changing the structure of existing code safely.",
    ],
  },

  // ------------------------------------------------------------------ PY-L40-04 refactoring
  {
    id: "PY-L40-04",
    version: 2,
    slug: "safe-refactoring",
    title: "Refactoring: change the structure, keep the behaviour",
    lede: "Refactoring improves code without changing what it does. The safety net is a set of tests that pin the current behaviour first; then small steps (extract a function, replace a chain of ifs with a table, remove duplication), checking after each.",
    focus: "Pin behaviour with characterization tests, then restructure in small, checked steps.",
    minutes: 24,
    objectives: [
      "Write characterization tests that record what code does now, before changing it",
      "Replace if/elif chains with a lookup table and extract duplicated logic into a helper",
      "Prove a refactor kept the behaviour by comparing old and new over many inputs",
    ],
    requires: ["aggregate-call", "all-call", "arithmetic", "assert-stmt", "assignment", "class-def", "comparison", "conditional-expr", "conversion", "dict-get", "dict-literal", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "star-args", "string-format", "string-index", "string-method", "test-func", "top-level-indent", "try-except", "tuple-unpack", "unittest-case", "unquoted-name", "value-count", "with-statement"],
    teaches: ["helper-fn"],
    blocks: [
      {
        kind: "text",
        md: "A refactor must not change behaviour, including the odd parts users rely on. So first **pin** the current behaviour with **characterization tests**: call the old code with representative inputs (normal, boundaries, odd cases) and record its answers as expected values. Then change the structure in small steps, re-running the tests after each. Common steps: **extract a function** for a named idea, **replace an if/elif chain with a table** when the branches only differ in data, and **remove duplication** by moving the shared part into one helper.",
      },
      {
        kind: "example",
        title: "A shipping chain becomes a table",
        code: src`
def shipping_old(zone, weight_kg):
    if zone == "domestic":
        if weight_kg <= 1:
            return 4.99
        else:
            return 4.99 + (weight_kg - 1) * 1.5
    elif zone == "canada":
        if weight_kg <= 1:
            return 12.5
        else:
            return 12.5 + (weight_kg - 1) * 3.0
    elif zone == "international":
        if weight_kg <= 1:
            return 24.0
        else:
            return 24.0 + (weight_kg - 1) * 6.0
    else:
        raise ValueError(f"unknown zone {zone!r}")

RATES = {"domestic": (4.99, 1.5), "canada": (12.5, 3.0), "international": (24.0, 6.0)}

def shipping_new(zone, weight_kg):
    if zone not in RATES:
        raise ValueError(f"unknown zone {zone!r}")
    base, per_kg = RATES[zone]
    return base + max(0, weight_kg - 1) * per_kg

cases = [(zone, w) for zone in RATES for w in [0.2, 1, 1.5, 3, 12.75]]
print(all(shipping_old(z, w) == shipping_new(z, w) for z, w in cases), len(cases))
for function in (shipping_old, shipping_new):
    try:
        function("mars", 1)
    except ValueError as error:
        print(function.__name__, error)
`,
        output: "True 15\nshipping_old unknown zone 'mars'\nshipping_new unknown zone 'mars'\n",
        note: "The three branches differed only in two numbers, so the numbers moved into a table and the logic is written once; adding a zone is now one line of data. The check compares both versions over every zone and several weights, including the boundary of 1 kg, and the error case behaves the same too.",
      },
      {
        kind: "text",
        md: "The second classic is **duplication**: two functions that validate an email the same way will drift apart the first time someone fixes one of them. Extract the shared part into a helper with a name that says what it does, and call it from both.",
      },
      {
        kind: "example",
        title: "Extracting a shared helper",
        code: src`
def clean_email(raw):
    email = raw.strip().lower()
    if email.count("@") != 1 or email.startswith("@") or email.endswith("@"):
        raise ValueError(f"invalid email {raw!r}")
    return email

def register(customers, raw_email, name):
    email = clean_email(raw_email)
    customers[email] = {"name": name}
    return email

def change_email(customers, old, raw_new):
    new = clean_email(raw_new)
    customers[new] = customers.pop(old)
    return new

customers = {}
print(register(customers, "  Nora_Garcia@Fastmail.com ", "Nora"))
print(change_email(customers, "nora_garcia@fastmail.com", "nora@runtime.market"))
print(customers)
try:
    register(customers, "jamal.walker62", "Jamal")
except ValueError as error:
    print(error)
`,
        output: "nora_garcia@fastmail.com\nnora@runtime.market\n{'nora@runtime.market': {'name': 'Nora'}}\ninvalid email 'jamal.walker62'\n",
        note: "The cleaning and validation rule exists once; a future fix (say, rejecting spaces inside the address) happens in one place and both callers get it.",
      },
      {
        kind: "text",
        md: "**When to refactor:** before adding a feature to code that is hard to change, and when you see the same change being made in several places. **Mistakes to avoid:** refactoring without tests; mixing a refactor and a behaviour change in one step (when a test fails, you can't tell which one broke it); \"fixing\" odd behaviour silently during a refactor (change behaviour deliberately, in a separate step, with its own test); and big-bang rewrites.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Replace the chain with a lookup",
      prompt: "`status_label` maps order statuses to customer-facing labels with an if/elif chain. Replace the chain with a dictionary lookup that keeps exactly the same results, including `\"Unknown status\"` for anything else, and run it.",
      spec: [
        ["Function", "`status_label(status)`"],
        ["Behaviour", "delivered → `\"Delivered\"`, shipped → `\"On its way\"`, returned → `\"Returned\"`, cancelled → `\"Cancelled\"`, anything else → `\"Unknown status\"`"],
        ["Rule", "no `if` statements"],
      ],
      starter: src`
def status_label(status):
    if status == "delivered":
        return "Delivered"
    elif status == "shipped":
        return "On its way"
    elif status == "returned":
        return "Returned"
    elif status == "cancelled":
        return "Cancelled"
    else:
        return "Unknown status"

print(status_label("shipped"), status_label("lost"))
`,
      answer: src`
LABELS = {
    "delivered": "Delivered",
    "shipped": "On its way",
    "returned": "Returned",
    "cancelled": "Cancelled",
}

def status_label(status):
    return LABELS.get(status, "Unknown status")

print(status_label("shipped"), status_label("lost"))
`,
      wrong: [
        {
          code: src`
LABELS = {"delivered": "Delivered", "shipped": "On its way", "returned": "Returned", "cancelled": "Cancelled"}

def status_label(status):
    return LABELS[status]
`,
          fails: ["returns"],
          why: "an unknown status raises KeyError instead of returning the fallback label",
        },
      ],
      hints: [
        "The branches only differ in data: a status and its label.",
        "Put the pairs in a dictionary defined once, outside the function.",
        "`dict.get(key, fallback)` covers the `else` branch.",
      ],
      task: {
        checks: [
          fn("returns", "status_label", [
            example(["shipped"], "On its way"),
            example(["lost"], "Unknown status"),
            hiddenCase("every known status", ["cancelled"], "Cancelled"),
            hiddenCase("a status in capitals", ["DELIVERED"], "Unknown status"),
          ], { label: "status_label() keeps every label" }),
          {
            kind: "expr",
            id: "no-chain",
            label: "status_label() has no if statements",
            hidden: true,
            expr: "import ast as _ast, inspect as _insp\n_tree = _ast.parse(_insp.getsource(status_label))\nresult = sum(isinstance(_n, _ast.If) for _n in _ast.walk(_tree))",
            expected: py.int(0),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Refactor the loyalty points rules",
        prompt: "`loyalty_points(tier, amount)` grew one branch per tier, each repeating the same rounding and the same minimum. Refactor it into a table of tier multipliers plus one rule, keeping **every** result identical (the hidden checks compare with the original on many inputs, including the odd ones). The refactored function may contain at most one `if`.",
        spec: [
          ["Function", "`loyalty_points(tier, amount)` (same name and parameters)"],
          ["Behaviour", "exactly the starter's results for every tier and amount, including its errors"],
          ["Structure", "a dictionary of tier multipliers and at most one `if` statement"],
        ],
        starter: src`
def loyalty_points(tier, amount):
    if tier == "bronze":
        points = int(amount * 1)
        if points < 1:
            points = 1
        return points
    elif tier == "silver":
        points = int(amount * 1.5)
        if points < 1:
            points = 1
        return points
    elif tier == "gold":
        points = int(amount * 2)
        if points < 1:
            points = 1
        return points
    elif tier == "platinum":
        points = int(amount * 3)
        if points < 1:
            points = 1
        return points
    else:
        raise ValueError("unknown tier: " + tier)

print(loyalty_points("silver", 35.84), loyalty_points("gold", 0.2))
`,
        answer: src`
MULTIPLIERS = {"bronze": 1, "silver": 1.5, "gold": 2, "platinum": 3}

def loyalty_points(tier, amount):
    if tier not in MULTIPLIERS:
        raise ValueError("unknown tier: " + tier)
    return max(1, int(amount * MULTIPLIERS[tier]))

print(loyalty_points("silver", 35.84), loyalty_points("gold", 0.2))
`,
        alternatives: [
          src`
MULTIPLIERS = {"bronze": 1, "silver": 1.5, "gold": 2, "platinum": 3}

def loyalty_points(tier, amount):
    try:
        factor = MULTIPLIERS[tier]
    except KeyError:
        raise ValueError("unknown tier: " + tier) from None
    points = int(amount * factor)
    return points if points >= 1 else 1
`,
        ],
        wrong: [
          {
            code: src`
MULTIPLIERS = {"bronze": 1, "silver": 1.5, "gold": 2, "platinum": 3}

def loyalty_points(tier, amount):
    if tier not in MULTIPLIERS:
        raise ValueError("unknown tier: " + tier)
    return max(1, round(amount * MULTIPLIERS[tier]))
`,
            fails: ["returns"],
            why: "`round` instead of `int` changes results: 35.84 × 1.5 = 53.76 becomes 54 instead of 53",
          },
          {
            code: src`
MULTIPLIERS = {"bronze": 1, "silver": 1.5, "gold": 2, "platinum": 3}

def loyalty_points(tier, amount):
    return max(1, int(amount * MULTIPLIERS.get(tier.lower(), 1)))
`,
            fails: ["returns"],
            why: "it silently changes behaviour: unknown tiers no longer raise, and capitals are accepted",
          },
        ],
        hints: [
          "Write down what differs between the branches: only the multiplier.",
          "Put the multipliers in a dictionary; keep the unknown-tier error as the one `if`.",
          "The repeated rounding and minimum become one expression; keep exactly the same rounding (`int` cuts off the fraction).",
        ],
        task: {
          checks: [
            fn("returns", "loyalty_points", [
              example(["silver", 35.84], 53),
              example(["gold", 0.2], 1),
              example(["platinum", 246.6], 739),
              hiddenCase("bronze below one point", ["bronze", 0.99], 1),
              hiddenCase("an amount of zero", ["silver", 0], 1),
              hiddenCase("an exact multiple", ["gold", 50], 100),
              raisesCase(["diamond", 10], "ValueError", { label: "an unknown tier" }),
              raisesCase(["Gold", 10], "ValueError", { label: "a tier in capitals" }),
            ], { label: "loyalty_points() keeps every original result" }),
            {
              kind: "expr",
              id: "structure",
              label: "loyalty_points() uses at most one if statement",
              hidden: true,
              expr: "import ast as _ast, inspect as _insp\n_tree = _ast.parse(_insp.getsource(loyalty_points))\nresult = sum(isinstance(_n, _ast.If) for _n in _ast.walk(_tree)) <= 1",
              expected: yes,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Pin the behaviour before anyone refactors",
        prompt: "A team is about to refactor `legacy_discount(total, code)`. Write characterization tests first: test functions (named `test_…`) with asserts that pin its current behaviour, so a refactor that changes any result fails. The checker runs your tests against the real function and against three \"refactored\" versions that each change one behaviour by accident.",
        spec: [
          ["Target", "`legacy_discount(total, code)` (given in the starter)"],
          ["Write", "top-level `test_…` functions using `assert`; leave the calls to the checker"],
          ["Must pass", "on the current implementation"],
          ["Must fail", "on each defective refactor (they change a boundary, the treatment of letter case, or the rounding)"],
        ],
        starter: src`
def legacy_discount(total, code):
    code = code.strip().upper()
    if code == "WELCOME10" and total >= 50:
        return round(total * 0.9, 2)
    if code == "FREESHIP":
        return round(total - 5.99, 2) if total > 5.99 else 0.0
    return round(total, 2)

def test_welcome_applies():
    assert legacy_discount(100, "WELCOME10") == 90.0
`,
        answer: src`
def legacy_discount(total, code):
    code = code.strip().upper()
    if code == "WELCOME10" and total >= 50:
        return round(total * 0.9, 2)
    if code == "FREESHIP":
        return round(total - 5.99, 2) if total > 5.99 else 0.0
    return round(total, 2)

def test_welcome_applies():
    assert legacy_discount(100, "WELCOME10") == 90.0

def test_welcome_boundary():
    assert legacy_discount(50, "WELCOME10") == 45.0
    assert legacy_discount(49.99, "WELCOME10") == 49.99

def test_codes_ignore_case_and_spaces():
    assert legacy_discount(80, " welcome10 ") == 72.0
    assert legacy_discount(20, "freeship") == 14.01

def test_rounding_to_cents():
    assert legacy_discount(35.849, "") == 35.85
    assert legacy_discount(55.55, "WELCOME10") == 49.99

def test_freeship_floor():
    assert legacy_discount(4.0, "FREESHIP") == 0.0
`,
        alternatives: [
          src`
import unittest

def legacy_discount(total, code):
    code = code.strip().upper()
    if code == "WELCOME10" and total >= 50:
        return round(total * 0.9, 2)
    if code == "FREESHIP":
        return round(total - 5.99, 2) if total > 5.99 else 0.0
    return round(total, 2)

class CharacterizeDiscount(unittest.TestCase):
    def test_cases(self):
        cases = [((50, "WELCOME10"), 45.0), ((49.99, "WELCOME10"), 49.99), ((80, " welcome10 "), 72.0), ((12.345, "NONE"), 12.35), ((3.0, "FREESHIP"), 0.0)]
        for args, expected in cases:
            with self.subTest(args=args):
                self.assertEqual(legacy_discount(*args), expected)
`,
        ],
        wrong: [
          {
            code: src`
def legacy_discount(total, code):
    code = code.strip().upper()
    if code == "WELCOME10" and total >= 50:
        return round(total * 0.9, 2)
    if code == "FREESHIP":
        return round(total - 5.99, 2) if total > 5.99 else 0.0
    return round(total, 2)

def test_welcome_applies():
    assert legacy_discount(100, "WELCOME10") == 90.0
`,
            fails: ["tests-1", "tests-2", "tests-3"],
            why: "one typical case pins almost nothing: none of the accidental changes is caught",
          },
          {
            code: src`
def legacy_discount(total, code):
    code = code.strip().upper()
    if code == "WELCOME10" and total >= 50:
        return round(total * 0.9, 2)
    if code == "FREESHIP":
        return round(total - 5.99, 2) if total > 5.99 else 0.0
    return round(total, 2)

def test_boundary():
    assert legacy_discount(50, "WELCOME10") == 45.0

def test_case():
    assert legacy_discount(80, "welcome10") == 72.0
`,
            fails: ["tests-3"],
            why: "the boundary and letter case are pinned, but nothing checks the rounding to cents",
          },
        ],
        hints: [
          "Characterization tests record what the code does now, odd parts included; work out each expected value by running the current function.",
          "Each accidental change lives at an edge: the 50 boundary, codes typed in lower case or with spaces, and amounts with more than two decimals.",
          "Write one small test per behaviour, with values right at those edges.",
        ],
        task: {
          checks: learnerTests("tests", {
            target: "legacy_discount",
            correct: "def legacy_discount(total, code):\n    code = code.strip().upper()\n    if code == 'WELCOME10' and total >= 50:\n        return round(total * 0.9, 2)\n    if code == 'FREESHIP':\n        return round(total - 5.99, 2) if total > 5.99 else 0.0\n    return round(total, 2)\n",
            defects: [
              { label: "a refactor that moved the 50 boundary (> instead of >=)", code: "DISCOUNTS = {'WELCOME10': 0.9}\ndef legacy_discount(total, code):\n    code = code.strip().upper()\n    if code in DISCOUNTS and total > 50:\n        return round(total * DISCOUNTS[code], 2)\n    if code == 'FREESHIP':\n        return round(total - 5.99, 2) if total > 5.99 else 0.0\n    return round(total, 2)\n" },
              { label: "a refactor that stopped normalising the code", code: "def legacy_discount(total, code):\n    if code == 'WELCOME10' and total >= 50:\n        return round(total * 0.9, 2)\n    if code == 'FREESHIP':\n        return round(total - 5.99, 2) if total > 5.99 else 0.0\n    return round(total, 2)\n" },
              { label: "a refactor that dropped the rounding to cents", code: "def legacy_discount(total, code):\n    code = code.strip().upper()\n    if code == 'WELCOME10' and total >= 50:\n        return total * 0.9\n    if code == 'FREESHIP':\n        return total - 5.99 if total > 5.99 else 0.0\n    return total\n" },
            ],
          }),
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def old_fee(kind):
    if kind == "express":
        return 9.99
    elif kind == "standard":
        return 4.99
    return 0.0

FEES = {"express": 9.99, "standard": 4.99}

def new_fee(kind):
    return FEES.get(kind, 0.0)

print([old_fee(k) == new_fee(k) for k in ["express", "standard", "pickup", ""]])
`,
        choices: ["[True, True, True, True]", "[True, True, False, False]", "[True, True, False, True]", "[False, False, True, True]"],
        answer: 0,
        why: "The table and the fallback reproduce every branch, including the default for unknown kinds; comparing old and new on the same inputs proves it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: during a refactor, a developer notices the function rounds .5 cents oddly and \"fixes\" it in the same commit. What is the problem?",
        choices: [
          "Behaviour changed inside a refactor: if something breaks, nobody can tell whether the restructuring or the fix caused it",
          "Rounding can't be changed in Python",
          "Nothing: refactors should fix bugs",
          "The tests will pass anyway",
        ],
        answer: 0,
        why: "Refactor (no behaviour change, tests unchanged) and fix (behaviour change, test updated) are separate steps so each can be verified.",
      },
      {
        id: "q3",
        prompt: "Which change is a refactoring?",
        choices: [
          "Extracting a repeated tax calculation into one helper used by both callers",
          "Adding a new discount code",
          "Changing the minimum order from 50 to 40",
          "Making the function accept dates as well as text",
        ],
        answer: 0,
        why: "Only the extraction keeps every result the same while improving structure; the others change behaviour.",
      },
    ],
    review: [
      "Pin the current behaviour with characterization tests before changing structure.",
      "Small steps: extract functions, replace data-only if/elif chains with tables, remove duplication.",
      "Prove equality on many inputs; keep behaviour changes in separate steps.",
      "Next: testing the modules together, through the real entry point.",
    ],
  },

  // ------------------------------------------------------------------ PY-L40-05 integration tests
  {
    id: "PY-L40-05",
    version: 2,
    slug: "integration-tests",
    title: "Integration tests: modules working together",
    lede: "Unit tests check each part alone. Integration tests run the real parts together through the program's entry point, faking only the outer edges (a temporary folder, an in-memory store), and catch the wiring bugs unit tests miss.",
    focus: "Test several real modules together through their entry point, with temporary files and in-memory edges.",
    minutes: 24,
    objectives: [
      "Write an entry point that wires parsing, the core and output together",
      "Test it end to end in a temporary folder with `tempfile.TemporaryDirectory`",
      "Choose what to fake (outer edges only) and what to keep real (everything in between)",
    ],
    requires: ["arithmetic", "assert-stmt", "assignment", "class-def", "comparison", "conditional-expr", "conversion", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-loads", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "module-file", "newline-escape", "path-call", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "test-func", "top-level-indent", "try-except", "tuple-literal", "tuple-unpack", "unittest-case", "with-statement"],
    teaches: ["integ-check"],
    blocks: [
      {
        kind: "text",
        md: "Each module of a stock importer can pass its own tests while the program as a whole fails: the parser returns `(sku, change)` tuples but the caller expects dictionaries, the report is written to the wrong file name, the header line is counted as stock. **Integration tests** catch this by running the real modules together, as a user would, through the **entry point**. They replace only the outer edges: the files go in a temporary folder (`tempfile.TemporaryDirectory()` creates one and deletes it after the `with` block), and remote services get an in-memory stand-in.",
      },
      {
        kind: "example",
        title: "A three-module importer, tested end to end",
        code: src`
import importlib
import os
import tempfile

with open("parsing.py", "w", encoding="utf-8") as f:
    f.write("def parse_movements(text):\n    rows = []\n    for line in text.strip().splitlines()[1:]:\n        sku, change = line.split(',')\n        rows.append((sku.strip(), int(change)))\n    return rows\n")
with open("inventory.py", "w", encoding="utf-8") as f:
    f.write("class Inventory:\n    def __init__(self):\n        self.levels = {}\n    def apply(self, sku, change):\n        self.levels[sku] = self.levels.get(sku, 0) + change\n    def report(self):\n        return [f'{sku},{qty}' for sku, qty in sorted(self.levels.items())]\n")
with open("app.py", "w", encoding="utf-8") as f:
    f.write("from inventory import Inventory\nfrom parsing import parse_movements\n\ndef run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        movements = parse_movements(f.read())\n    stock = Inventory()\n    for sku, change in movements:\n        stock.apply(sku, change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write('\\n'.join(stock.report()) + '\\n')\n    return len(movements)\n")
importlib.invalidate_caches()
from app import run_import

def test_import_end_to_end():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "moves.csv")
        target = os.path.join(folder, "stock.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("sku,change\nSPO-11681,5\nHOM-22847,2\nSPO-11681,-1\n")
        assert run_import(source, target) == 3
        with open(target, encoding="utf-8") as f:
            assert f.read() == "HOM-22847,2\nSPO-11681,4\n"

test_import_end_to_end()
print("integration test passed")
`,
        output: "integration test passed\n",
        note: "The test goes through `run_import`, the same function the command line would call, so the parser, the inventory and the file writing are all exercised together. The temporary folder keeps the test independent of the real data and is cleaned up even if an assert fails. (The example writes its modules first because examples can't come with files; in a project they already exist.)",
      },
      {
        kind: "text",
        md: "With `unittest` (see Testing & Code Quality), integration tests sit next to unit tests and run with the same runner. A `setUp` builds the temporary folder (`self.addCleanup(tmp.cleanup)` removes it), and each test feeds a realistic input file: an empty file, a line with spaces, a negative movement. Keep integration tests fewer and broader than unit tests: they are slower and, when they fail, they say *something* in the chain broke; unit tests then say what.",
      },
      {
        kind: "example",
        title: "Integration tests in a TestCase",
        code: src`
import io
import os
import tempfile
import unittest

def parse_movements(text):
    rows = []
    for line in text.strip().splitlines()[1:]:
        sku, change = line.split(",")
        rows.append((sku.strip(), int(change)))
    return rows

def run_import(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        movements = parse_movements(f.read())
    levels = {}
    for sku, change in movements:
        levels[sku] = levels.get(sku, 0) + change
    with open(out_path, "w", encoding="utf-8") as f:
        f.writelines(f"{sku},{qty}\n" for sku, qty in sorted(levels.items()))
    return len(movements)

class ImportTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.folder = tmp.name

    def run_with(self, text):
        source = os.path.join(self.folder, "in.csv")
        target = os.path.join(self.folder, "out.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write(text)
        count = run_import(source, target)
        with open(target, encoding="utf-8") as f:
            return count, f.read()

    def test_header_only(self):
        self.assertEqual(self.run_with("sku,change\n"), (0, ""))

    def test_spaces_and_negatives(self):
        self.assertEqual(self.run_with("sku,change\n GRO-10442 ,3\nGRO-10442,-3\n"), (2, "GRO-10442,0\n"))

result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(ImportTests))
print(result.testsRun, len(result.failures), len(result.errors))
`,
        output: "2 0 0\n",
        note: "Running the suite inside the program (with its output sent to a StringIO) shows 2 tests run, no failures, no errors. Normally `python -m unittest` would discover and run them.",
      },
      {
        kind: "text",
        md: "**What to fake:** only what is slow, external or uncontrollable: the network, the clock, third-party services, real user folders. Keep your own modules real, or the test proves nothing about how they fit. **Mistakes to avoid:** writing to real paths (tests that pass once and then fail, or delete real data); integration tests that depend on each other's leftovers; and replacing so much with fakes that only the fakes are tested.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Use a temporary folder",
      prompt: "This integration test writes `moves.csv` and `stock.csv` into the current folder, where they would collide with real files and with other test runs. Change it to create both files inside a `tempfile.TemporaryDirectory()`, and run it.",
      spec: [
        ["Function", "`test_import()`; it calls `run_import(in_path, out_path)` from `app.py` (given)"],
        ["Rule", "the test leaves no files behind in the current folder"],
      ],
      starter: src`
import os
import tempfile
from app import run_import

def test_import():
    with open("moves.csv", "w", encoding="utf-8") as f:
        f.write("sku,change\nSPO-11681,5\n")
    assert run_import("moves.csv", "stock.csv") == 1
    with open("stock.csv", encoding="utf-8") as f:
        assert f.read() == "SPO-11681,5\n"

test_import()
print("passed")
`,
      answer: src`
import os
import tempfile
from app import run_import

def test_import():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "moves.csv")
        target = os.path.join(folder, "stock.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("sku,change\nSPO-11681,5\n")
        assert run_import(source, target) == 1
        with open(target, encoding="utf-8") as f:
            assert f.read() == "SPO-11681,5\n"

test_import()
print("passed")
`,
      wrong: [
        {
          code: src`
from app import run_import

def test_import():
    assert run_import("moves.csv", "stock.csv") == 1
`,
          fails: ["clean"],
          why: "it still uses the current folder (and depends on a file being there already)",
        },
      ],
      hints: [
        "`tempfile.TemporaryDirectory()`, used in a `with` statement, gives you a fresh folder that disappears afterwards.",
        "Build both paths with `os.path.join(folder, name)`.",
        "Indent the whole test body inside that `with` block.",
      ],
      task: {
        files: {
          ...STOCK_FILES,
          "app.py": "from inventory import Inventory\nfrom parsing import parse_movements\n\n\ndef run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        movements = parse_movements(f.read())\n    stock = Inventory()\n    for sku, change in movements:\n        stock.apply(sku, change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write('\\n'.join(stock.report()) + '\\n')\n    return len(movements)\n",
        },
        checks: [
          {
            kind: "expr",
            id: "clean",
            label: "the test passes and leaves no files in the current folder",
            expr: "import os as _os\nfor _n in ('moves.csv', 'stock.csv'):\n    if _os.path.exists(_n):\n        _os.remove(_n)\n_before = sorted(_os.listdir('.'))\ntest_import()\nresult = sorted(_os.listdir('.')) == _before",
            expected: yes,
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Wire the importer's entry point",
        prompt: "`parsing.py` and `inventory.py` (read-only) are unit-tested. Write the entry point `main(argv, environ)` that connects them: `argv` is `[input_path, output_path]`; the starting stock comes from a JSON file named by the environment variable `STOCK_START` (no variable means empty stock); apply every movement, write the inventory's report lines to the output file (one per line, with a final newline, or an empty file when there is no stock), and return 0. With the wrong number of arguments, return 2 without writing anything.",
        spec: [
          ["Function", "`main(argv, environ)` → exit code"],
          ["Uses", "`parse_movements(text)` (from parsing.py) and `Inventory(levels)` with `apply` and `report` (from inventory.py)"],
          ["Returns", "0 after writing the report; 2 for a wrong number of arguments"],
        ],
        starter: src`
import json
from inventory import Inventory
from parsing import parse_movements

def main(argv, environ):
    return 1
`,
        answer: src`
import json
from inventory import Inventory
from parsing import parse_movements

def main(argv, environ):
    if len(argv) != 2:
        return 2
    in_path, out_path = argv
    levels = {}
    if "STOCK_START" in environ:
        with open(environ["STOCK_START"], encoding="utf-8") as f:
            levels = json.load(f)
    stock = Inventory(levels)
    with open(in_path, encoding="utf-8") as f:
        for sku, change in parse_movements(f.read()):
            stock.apply(sku, change)
    lines = stock.report()
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("".join(line + "\n" for line in lines))
    return 0
`,
        alternatives: [
          src`
import json
from pathlib import Path
from inventory import Inventory
from parsing import parse_movements

def main(argv, environ):
    try:
        source, target = argv
    except ValueError:
        return 2
    start = environ.get("STOCK_START")
    levels = json.loads(Path(start).read_text(encoding="utf-8")) if start else {}
    inventory = Inventory(levels)
    for sku, change in parse_movements(Path(source).read_text(encoding="utf-8")):
        inventory.apply(sku, change)
    report = inventory.report()
    Path(target).write_text("\n".join(report) + ("\n" if report else ""), encoding="utf-8")
    return 0
`,
        ],
        wrong: [
          {
            code: src`
import json
from inventory import Inventory
from parsing import parse_movements

def main(argv, environ):
    in_path, out_path = argv
    stock = Inventory()
    with open(in_path, encoding="utf-8") as f:
        for sku, change in parse_movements(f.read()):
            stock.apply(sku, change)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("".join(line + "\n" for line in stock.report()))
    return 0
`,
            fails: ["start", "usage"],
            why: "the starting stock from STOCK_START is never loaded, and bad arguments crash",
          },
          {
            code: src`
import json
from inventory import Inventory
from parsing import parse_movements

def main(argv, environ):
    if len(argv) != 2:
        return 2
    in_path, out_path = argv
    levels = {}
    if "STOCK_START" in environ:
        with open(environ["STOCK_START"], encoding="utf-8") as f:
            levels = json.load(f)
    stock = Inventory(levels)
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().splitlines()
    for line in lines:
        sku, change = line.split(",")
        stock.apply(sku, int(change))
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("".join(line + "\n" for line in stock.report()))
    return 0
`,
            fails: ["basic", "start", "empty"],
            why: "it re-parses the file itself instead of using parse_movements, and chokes on the header line",
          },
        ],
        hints: [
          "Check the argument count first; then read the optional starting stock (a JSON dictionary) only if the variable is present.",
          "Build `Inventory(levels)`, read the input file, and apply every `(sku, change)` that `parse_movements` returns.",
          "Write each report line followed by a newline, and return 0.",
        ],
        task: {
          files: STOCK_FILES,
          checks: [
            {
              kind: "expr",
              id: "basic",
              label: "main() imports movements and writes the report",
              show: "main(['in.csv', 'out.csv'], {})",
              expr: "with open('in.csv', 'w', encoding='utf-8') as _f:\n    _f.write('sku,change\\nSPO-11681,5\\nHOM-22847,2\\nSPO-11681,-1\\n')\n_code = main(['in.csv', 'out.csv'], {})\nwith open('out.csv', encoding='utf-8') as _f:\n    result = [_code, _f.read()]",
              expected: py.list(py.int(0), py.str("HOM-22847,2\nSPO-11681,4\n")),
            },
            {
              kind: "expr",
              id: "start",
              label: "the starting stock comes from STOCK_START",
              hidden: true,
              expr: "with open('start.json', 'w', encoding='utf-8') as _f:\n    _f.write('{\"SPO-11681\": 10, \"BOO-58412\": 1}')\nwith open('in2.csv', 'w', encoding='utf-8') as _f:\n    _f.write('sku,change\\nSPO-11681,-3\\n')\n_code = main(['in2.csv', 'out2.csv'], {'STOCK_START': 'start.json', 'HOME': '/root'})\nwith open('out2.csv', encoding='utf-8') as _f:\n    result = [_code, _f.read()]",
              expected: py.list(py.int(0), py.str("BOO-58412,1\nSPO-11681,7\n")),
            },
            {
              kind: "expr",
              id: "usage",
              label: "a wrong number of arguments returns 2",
              hidden: true,
              expr: "import os as _os\nresult = [main(['only-one.csv'], {}), _os.path.exists('only-one.csv')]",
              expected: py.list(py.int(2), py.bool(false)),
            },
            {
              kind: "expr",
              id: "empty",
              label: "an input with only a header writes an empty report",
              hidden: true,
              expr: "with open('in3.csv', 'w', encoding='utf-8') as _f:\n    _f.write('sku,change\\n')\n_code = main(['in3.csv', 'out3.csv'], {})\nwith open('out3.csv', encoding='utf-8') as _f:\n    result = [_code, _f.read()]",
              expected: py.list(py.int(0), py.str("")),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Integration tests that catch wiring bugs",
        prompt: "Write integration tests for `run_import(in_path, out_path)`, the importer's entry point: `test_…` functions that create input files in a temporary folder, call `run_import`, and assert on the returned count and the output file. The checker runs your tests against the correct importer and against three versions with wiring bugs; your tests must pass on the first and fail on each of the others.",
        spec: [
          ["Target", "`run_import(in_path, out_path)` → number of movements; writes `sku,qty` lines sorted by SKU, each ending in a newline"],
          ["Write", "top-level `test_…` functions using `tempfile.TemporaryDirectory()` and `assert`"],
          ["Defects to catch", "the header counted as a movement; movements for the same SKU not added together; the report written unsorted"],
        ],
        starter: src`
import os
import tempfile
from app import run_import

def test_single_movement():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        target = os.path.join(folder, "out.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("sku,change\nSPO-11681,5\n")
        run_import(source, target)
`,
        answer: src`
import os
import tempfile
from app import run_import

def run_case(text):
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        target = os.path.join(folder, "out.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write(text)
        count = run_import(source, target)
        with open(target, encoding="utf-8") as f:
            return count, f.read()

def test_single_movement():
    assert run_case("sku,change\nSPO-11681,5\n") == (1, "SPO-11681,5\n")

def test_same_sku_adds_up():
    assert run_case("sku,change\nSPO-11681,5\nSPO-11681,-2\n") == (2, "SPO-11681,3\n")

def test_report_sorted_by_sku():
    assert run_case("sku,change\nZZZ-1,1\nAAA-1,1\n") == (2, "AAA-1,1\nZZZ-1,1\n")
`,
        alternatives: [
          src`
import os
import tempfile
import unittest
from app import run_import

class ImporterIntegration(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.folder = tmp.name

    def run_text(self, text):
        src = os.path.join(self.folder, "moves.csv")
        dst = os.path.join(self.folder, "stock.csv")
        with open(src, "w", encoding="utf-8") as f:
            f.write(text)
        n = run_import(src, dst)
        with open(dst, encoding="utf-8") as f:
            return n, f.read()

    def test_counts_and_sums(self):
        self.assertEqual(self.run_text("sku,change\nB,2\nA,1\nB,3\n"), (3, "A,1\nB,5\n"))
`,
        ],
        wrong: [
          {
            code: src`
import os
import tempfile
from app import run_import

def test_single_movement():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        target = os.path.join(folder, "out.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("sku,change\nSPO-11681,5\n")
        run_import(source, target)
        assert os.path.exists(target)
`,
            fails: ["tests-1", "tests-2", "tests-3"],
            why: "it only checks that a file was written: no count, no contents",
          },
          {
            code: src`
import os
import tempfile
from app import run_import

def test_count():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("sku,change\nSPO-11681,5\n")
        assert run_import(source, os.path.join(folder, "out.csv")) == 1
`,
            fails: ["tests-2", "tests-3"],
            why: "the count catches the header bug, but nothing reads the report, so sums and order are unchecked",
          },
        ],
        hints: [
          "A helper that writes the input text, calls `run_import` and returns `(count, output text)` keeps every test short.",
          "Each defect shows up with a specific input: one movement (the count), two movements for the same SKU (the sum), SKUs out of order (the sorting).",
          "Assert on both the count and the exact output text.",
        ],
        task: {
          files: {
            ...STOCK_FILES,
            "app.py": "from inventory import Inventory\nfrom parsing import parse_movements\n\n\ndef run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        movements = parse_movements(f.read())\n    stock = Inventory()\n    for sku, change in movements:\n        stock.apply(sku, change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write(''.join(line + '\\n' for line in stock.report()))\n    return len(movements)\n",
          },
          checks: learnerTests("tests", {
            target: "run_import",
            correct: "def run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    levels = {}\n    for line in lines:\n        sku, change = line.split(',')\n        levels[sku.strip()] = levels.get(sku.strip(), 0) + int(change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write(''.join(f'{s},{q}\\n' for s, q in sorted(levels.items())))\n    return len(lines)\n",
            defects: [
              { label: "an importer that counts the header line", code: "def run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        all_lines = f.read().strip().splitlines()\n    levels = {}\n    for line in all_lines[1:]:\n        sku, change = line.split(',')\n        levels[sku.strip()] = levels.get(sku.strip(), 0) + int(change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write(''.join(f'{s},{q}\\n' for s, q in sorted(levels.items())))\n    return len(all_lines)\n" },
              { label: "an importer that keeps only the last movement per SKU", code: "def run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    levels = {}\n    for line in lines:\n        sku, change = line.split(',')\n        levels[sku.strip()] = int(change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write(''.join(f'{s},{q}\\n' for s, q in sorted(levels.items())))\n    return len(lines)\n" },
              { label: "an importer that writes the report unsorted", code: "def run_import(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    levels = {}\n    for line in lines:\n        sku, change = line.split(',')\n        levels[sku.strip()] = levels.get(sku.strip(), 0) + int(change)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        f.write(''.join(f'{s},{q}\\n' for s, q in levels.items()))\n    return len(lines)\n" },
            ],
          }),
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import os
import tempfile

with tempfile.TemporaryDirectory() as folder:
    path = os.path.join(folder, "report.csv")
    with open(path, "w", encoding="utf-8") as f:
        f.write("sku,qty\n")
    inside = os.path.exists(path)
print(inside, os.path.exists(path))
`,
        choices: ["True False", "True True", "False False", "False True"],
        answer: 0,
        why: "The file exists while the temporary folder exists; leaving the `with` block deletes the folder and everything in it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: an integration test for the importer replaces the parser, the inventory and the file writing with fakes. What does it prove?",
        choices: [
          "Almost nothing about the real program: only that the fakes work together",
          "That the real modules fit together",
          "That the parser handles headers",
          "That the output file is correct",
        ],
        answer: 0,
        why: "Integration tests keep your own modules real and fake only the outer edges; otherwise the wiring you wanted to test is gone.",
      },
      {
        id: "q3",
        prompt: "Which belongs in an integration test rather than a unit test?",
        choices: [
          "Running main() on an input file in a temporary folder and checking the output file",
          "Checking that parse_movements turns one line into a tuple",
          "Checking that Inventory.apply adds to a level",
          "Checking that report() sorts by SKU",
        ],
        answer: 0,
        why: "End-to-end through the entry point is integration. The other three each test one function alone: unit tests.",
      },
    ],
    review: [
      "Integration tests run the real modules together through the entry point.",
      "Fake only the outer edges: temporary folders for files, in-memory stand-ins for remote services.",
      "Fewer and broader than unit tests; each catches wiring bugs unit tests can't see.",
      "Next module: data analysis with NumPy and pandas.",
    ],
  },
];
