/**
 * M40 practice: ten independent problems on separating concerns, configuration, dependency boundaries, refactoring
 * and integration testing (PY-L40-01 … PY-L40-05).
 *
 * Mix: 3 function implementations, 2 debugging (a hidden clock dependency, an adapter that leaks database rows), 1
 * refactoring (duplicated validation removed, behaviour pinned), 1 testing (integration tests graded against wiring
 * defects), 1 integration (an entry point over read-only modules), 2 output predictions. Easy: 02, 03, 06, 10.
 * Medium: 12, 13, 16, 19. Hard: 20, 22.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, jsonFile, keepsInput, learnerTests, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const t = (...xs: unknown[]) => py.tuple(...xs.map((x) => (x === null ? py.none : typeof x === "string" ? py.str(x) : typeof x === "boolean" ? py.bool(x) : Number.isInteger(x) ? py.int(x as number) : py.float(x as number))));

const RATINGS_FILES = {
  "ratings.py": src`
"""Parse product ratings and summarise them (no file access here)."""


def parse_ratings(text):
    rows = []
    for line in text.strip().splitlines()[1:]:
        product_id, rating = line.split(",")
        rows.append((product_id.strip(), int(rating)))
    return rows


def averages(rows):
    totals = {}
    counts = {}
    for product_id, rating in rows:
        totals[product_id] = totals.get(product_id, 0) + rating
        counts[product_id] = counts.get(product_id, 0) + 1
    return {p: round(totals[p] / counts[p], 2) for p in sorted(totals)}
`,
};

export const m40Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q40-02",
    version: 2,
    slug: "predict-config-layers",
    title: "Predict: environment layers are text",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["arithmetic", "assignment", "boolean", "conditional-expr", "dict-literal", "dict-lookup", "list-sort", "precedence", "print-call", "print-several", "print-text", "set-literal", "star-kwargs", "string-index"],
    prompt: "Three configuration layers are merged, but the environment layer was not converted from text. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Later layers win in `{**a, **b, **c}`; check which layer supplies each key.",
      "The environment's values are strings: `\"100\" * 2` repeats text.",
      "Any non-empty string is truthy, including `\"False\"`; and the defaults dictionary isn't changed by unpacking.",
    ],
    explanation: "The environment layer wins for page_size and debug, but both are strings. `\"100\"` is not an int, so the else branch doubles the text (`100100`). `bool(\"False\")` is True because the string isn't empty, while the defaults keep `False`. The keys come out sorted alphabetically.",
    predict: {
      program: src`
DEFAULTS = {"page_size": 50, "debug": False, "currency": "USD"}
file_layer = {"page_size": 20, "debug": True}
env_layer = {"debug": "False", "page_size": "100"}
merged = {**DEFAULTS, **file_layer, **env_layer}
print(merged["page_size"] + 1 if isinstance(merged["page_size"], int) else merged["page_size"] * 2)
print(bool(merged["debug"]), DEFAULTS["debug"])
print(sorted(merged))
`,
      output: "100100\nTrue False\n['currency', 'debug', 'page_size']\n",
      wrongPredictions: ["101\nFalse False\n['currency', 'debug', 'page_size']\n", "200\nTrue False\n['currency', 'debug', 'page_size']\n", "100100\nFalse False\n['currency', 'debug', 'page_size']\n", "21\nTrue True\n['page_size', 'debug', 'currency']\n"],
    },
  },
  {
    id: "PY-Q40-03",
    version: 2,
    slug: "hidden-clock",
    title: "Fix the late fee that depends on today's date",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "function-def", "function-param", "function-return", "if-statement", "import-module", "precedence", "print-call", "print-several", "top-level-indent"],
    prompt: "`late_fee` gives different answers depending on the day the tests run: it reads the real clock inside the business rule. Make the rule pure: it should take `today` as a parameter (a `date`), and keep the fee rules unchanged.",
    spec: [
      ["Function", "`late_fee(due, today)`; both are `datetime.date` objects"],
      ["Rule", "0 if returned on or before the due date; otherwise 1.50 per day late, at most 15.00"],
    ],
    hiddenKinds: ["returned exactly on the due date", "more than ten days late", "one day late"],
    hints: [
      "Which line makes the result depend on when the code runs?",
      "Anything outside the arguments that changes should become an argument.",
      "Take `today` as a parameter and remove the call to `date.today()`.",
    ],
    explanation: "Reading `date.today()` inside the rule hides a dependency: the result changes with the calendar, so tests can't pin it and a batch re-run on another day bills differently. Passing `today` in makes the rule pure; the caller (the entry point) reads the real clock once and passes it.",
    code: {
      starter: src`
from datetime import date

def late_fee(due):
    days = (date.today() - due).days
    if days <= 0:
        return 0.0
    return min(days * 1.5, 15.0)

print(late_fee(date(2024, 1, 10)))
`,
      answer: src`
from datetime import date

def late_fee(due, today):
    days = (today - due).days
    if days <= 0:
        return 0.0
    return min(days * 1.5, 15.0)

print(late_fee(date(2024, 1, 10), date(2024, 1, 14)))
`,
      alternatives: [
        src`
from datetime import date

def late_fee(due, today):
    late_by = (today - due).days
    return 0.0 if late_by <= 0 else min(15.0, 1.5 * late_by)
`,
      ],
      wrong: [
        {
          code: src`
from datetime import date

def late_fee(due, today=date.today()):
    days = (today - due).days
    if days <= 0:
        return 0.0
    return min(days * 1.5, 15.0)
`,
          fails: ["default"],
          why: "a default of `date.today()` is evaluated once, when the module loads: the hidden clock is still there",
        },
        {
          code: src`
from datetime import date

def late_fee(due, today):
    days = (today - due).days
    return min(days * 1.5, 15.0)
`,
          fails: ["fee"],
          why: "early returns give a negative fee",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "fee",
            label: "late_fee() follows the fee rules for the given day",
            show: "due 10 Jan; today 14 Jan, 10 Jan, 9 Jan, 31 Jan",
            expr: "from datetime import date as _d\n_due = _d(2024, 1, 10)\nresult = [late_fee(_due, _d(2024, 1, 14)), late_fee(_due, _d(2024, 1, 10)), late_fee(_due, _d(2024, 1, 9)), late_fee(_due, _d(2024, 1, 31)), late_fee(_due, _d(2024, 1, 11))]",
            expected: py.list(py.float(6), py.float(0), py.float(0), py.float(15), py.float(1.5)),
          },
          {
            kind: "expr",
            id: "default",
            label: "today must be passed in (no hidden default)",
            hidden: true,
            expr: "import inspect as _insp\nresult = [p.default is _insp.Parameter.empty for p in _insp.signature(late_fee).parameters.values()]",
            expected: py.list(yes, yes),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q40-06",
    version: 2,
    slug: "parse-ratings-core",
    title: "A parser that reports what it rejected",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "continue-statement", "conversion", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "string-index", "string-method", "string-split", "top-level-indent", "try-except", "tuple-unpack"],
    prompt: "Review exports contain bad lines. Write the parsing layer `parse_reviews(lines)`: it receives the lines (already read by the caller, header removed) and returns `(reviews, rejected)`: the valid reviews as `(product_id, rating)` tuples and the count of rejected lines. It does no file access and no printing.",
    spec: [
      ["Function", "`parse_reviews(lines)`"],
      ["Valid line", "`product_id,rating` with exactly one comma, a non-empty ID (spaces stripped) and a whole-number rating from 1 to 5"],
      ["Returns", "`(list of (product_id, rating) tuples in order, number of rejected lines)`; blank lines are skipped without counting"],
    ],
    hiddenKinds: ["a rating out of range", "a line with too many fields", "a blank line", "an empty list", "an ID that is only spaces"],
    hints: [
      "Skip blank lines first; then split on the comma and check there are exactly two parts.",
      "Convert the rating with `int` inside `try`; a ValueError means a rejected line.",
      "Check the range and the stripped ID before accepting the review.",
    ],
    explanation: "The parser turns raw lines into clean data and counts what it refused, leaving file reading to the shell and reporting to the presenter. Catching only ValueError around `int` keeps real bugs visible; checking the field count and range means `P1,5,extra` and `P1,9` are rejected instead of crashing or slipping through.",
    code: {
      starter: src`
def parse_reviews(lines):
    return [], 0

print(parse_reviews(["P0205,5", "P0421, 4", "P0205,nine", "", "P0187,7"]))
`,
      answer: src`
def parse_reviews(lines):
    reviews = []
    rejected = 0
    for line in lines:
        if not line.strip():
            continue
        parts = line.split(",")
        if len(parts) != 2:
            rejected += 1
            continue
        product_id = parts[0].strip()
        try:
            rating = int(parts[1])
        except ValueError:
            rejected += 1
            continue
        if not product_id or not 1 <= rating <= 5:
            rejected += 1
            continue
        reviews.append((product_id, rating))
    return reviews, rejected

print(parse_reviews(["P0205,5", "P0421, 4", "P0205,nine", "", "P0187,7"]))
`,
      alternatives: [
        src`
def parse_one(line):
    product_id, _, rating_text = line.partition(",")
    if "," in rating_text or not product_id.strip():
        return None
    try:
        rating = int(rating_text)
    except ValueError:
        return None
    return (product_id.strip(), rating) if 1 <= rating <= 5 else None

def parse_reviews(lines):
    good = []
    bad = 0
    for line in lines:
        if line.strip() == "":
            continue
        review = parse_one(line)
        if review is None:
            bad += 1
        else:
            good.append(review)
    return good, bad
`,
      ],
      wrong: [
        {
          code: src`
def parse_reviews(lines):
    reviews = []
    rejected = 0
    for line in lines:
        try:
            product_id, rating = line.split(",")
            reviews.append((product_id.strip(), int(rating)))
        except ValueError:
            rejected += 1
    return reviews, rejected
`,
          fails: ["returns"],
          why: "blank lines are counted as rejected, and out-of-range ratings are accepted",
        },
        {
          code: src`
def parse_reviews(lines):
    reviews = []
    rejected = 0
    for line in lines:
        if not line.strip():
            continue
        parts = line.split(",")
        if len(parts) == 2 and parts[1].strip().isdigit() and 1 <= int(parts[1]) <= 5:
            reviews.append((parts[0], int(parts[1])))
        else:
            rejected += 1
    return reviews, rejected
`,
          fails: ["returns"],
          why: "the product ID keeps its spaces, and an ID of only spaces is accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_reviews", [
            example([["P0205,5", "P0421, 4", "P0205,nine", "", "P0187,7"]], py.tuple(py.list(t("P0205", 5), t("P0421", 4)), py.int(2))),
            example([[" P0001 ,1"]], py.tuple(py.list(t("P0001", 1)), py.int(0))),
            example([[]], py.tuple(py.list(), py.int(0))),
            hiddenCase("a line with too many fields", [["P1,5,extra", "P2,3"]], py.tuple(py.list(t("P2", 3)), py.int(1))),
            hiddenCase("a rating of zero", [["P1,0"]], py.tuple(py.list(), py.int(1))),
            hiddenCase("an ID that is only spaces", [["   ,4"]], py.tuple(py.list(), py.int(1))),
            hiddenCase("blank lines only", [["", "   "]], py.tuple(py.list(), py.int(0))),
          ], { label: "parse_reviews() keeps valid reviews and counts the rest" }),
          fn("keeps-input", "parse_reviews", [keepsInput([["P1,5", "bad"]])], { label: "parse_reviews() leaves the lines unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q40-10",
    version: 2,
    slug: "test-ratings-report",
    title: "Integration tests for the ratings report",
    format: "testing",
    difficulty: "easy",
    minutes: 15,
    requires: ["assert-stmt", "assignment", "class-def", "comparison", "conversion", "dict-literal", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "newline-escape", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "test-func", "top-level-indent", "tuple-literal", "tuple-unpack", "unittest-case", "with-statement"],
    prompt: "`write_report(in_path, out_path)` reads a ratings CSV, averages each product's ratings and writes `product_id,average` lines. Write integration tests (`test_…` functions with `assert`) that run it on files in a temporary folder. They must pass for the real function and fail for three versions with wiring bugs.",
    spec: [
      ["Target", "`write_report(in_path, out_path)`: input `product_id,rating` with a header; output one `product_id,average` line per product, sorted by ID, averages rounded to 2 decimals; returns the number of products"],
      ["Defects to catch", "the header read as data; averages not rounded; products in input order instead of sorted"],
    ],
    hiddenKinds: ["tests that leave files behind in the current folder"],
    hints: [
      "A helper that writes input text into a temporary folder, calls `write_report`, and returns the count and the output text keeps tests short.",
      "Pick inputs where each bug shows: a product rated 4 and 5 and 5 (average 4.67), and products listed out of order.",
      "Assert on the exact output text and the returned count.",
    ],
    explanation: "Each test drives the real function through files, so the reading, parsing, averaging and writing are checked together. Inputs are chosen so every defect changes the output: a non-terminating average exposes missing rounding, out-of-order IDs expose missing sorting, and the count exposes a header treated as data.",
    code: {
      starter: src`
import os
import tempfile

def write_report(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().strip().splitlines()[1:]
    totals = {}
    for line in lines:
        product_id, rating = line.split(",")
        totals.setdefault(product_id, []).append(int(rating))
    with open(out_path, "w", encoding="utf-8") as f:
        for product_id in sorted(totals):
            ratings = totals[product_id]
            f.write(f"{product_id},{round(sum(ratings) / len(ratings), 2)}\n")
    return len(totals)

def test_one_product():
    pass
`,
      answer: src`
import os
import tempfile

def write_report(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().strip().splitlines()[1:]
    totals = {}
    for line in lines:
        product_id, rating = line.split(",")
        totals.setdefault(product_id, []).append(int(rating))
    with open(out_path, "w", encoding="utf-8") as f:
        for product_id in sorted(totals):
            ratings = totals[product_id]
            f.write(f"{product_id},{round(sum(ratings) / len(ratings), 2)}\n")
    return len(totals)

def report_for(text):
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "ratings.csv")
        target = os.path.join(folder, "report.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write(text)
        count = write_report(source, target)
        with open(target, encoding="utf-8") as f:
            return count, f.read()

def test_rounded_average():
    assert report_for("product_id,rating\nP0205,4\nP0205,5\nP0205,5\n") == (1, "P0205,4.67\n")

def test_sorted_products():
    assert report_for("product_id,rating\nP0421,3\nP0187,5\n") == (2, "P0187,5.0\nP0421,3.0\n")
`,
      alternatives: [
        src`
import os
import tempfile
import unittest

def write_report(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().strip().splitlines()[1:]
    totals = {}
    for line in lines:
        product_id, rating = line.split(",")
        totals.setdefault(product_id, []).append(int(rating))
    with open(out_path, "w", encoding="utf-8") as f:
        for product_id in sorted(totals):
            ratings = totals[product_id]
            f.write(f"{product_id},{round(sum(ratings) / len(ratings), 2)}\n")
    return len(totals)

class ReportTests(unittest.TestCase):
    def test_everything(self):
        with tempfile.TemporaryDirectory() as d:
            src_path = os.path.join(d, "in.csv")
            out_path = os.path.join(d, "out.csv")
            with open(src_path, "w", encoding="utf-8") as f:
                f.write("product_id,rating\nB,1\nA,2\nA,3\nA,3\n")
            self.assertEqual(write_report(src_path, out_path), 2)
            with open(out_path, encoding="utf-8") as f:
                self.assertEqual(f.read(), "A,2.67\nB,1.0\n")
`,
      ],
      wrong: [
        {
          code: src`
import os
import tempfile

def write_report(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().strip().splitlines()[1:]
    totals = {}
    for line in lines:
        product_id, rating = line.split(",")
        totals.setdefault(product_id, []).append(int(rating))
    with open(out_path, "w", encoding="utf-8") as f:
        for product_id in sorted(totals):
            ratings = totals[product_id]
            f.write(f"{product_id},{round(sum(ratings) / len(ratings), 2)}\n")
    return len(totals)

def test_runs():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("product_id,rating\nP1,5\n")
        write_report(source, os.path.join(folder, "out.csv"))
`,
          fails: ["tests-1", "tests-2", "tests-3"],
          why: "the test runs the report but asserts nothing",
        },
        {
          code: src`
import os
import tempfile

def write_report(in_path, out_path):
    with open(in_path, encoding="utf-8") as f:
        lines = f.read().strip().splitlines()[1:]
    totals = {}
    for line in lines:
        product_id, rating = line.split(",")
        totals.setdefault(product_id, []).append(int(rating))
    with open(out_path, "w", encoding="utf-8") as f:
        for product_id in sorted(totals):
            ratings = totals[product_id]
            f.write(f"{product_id},{round(sum(ratings) / len(ratings), 2)}\n")
    return len(totals)

def test_single():
    with tempfile.TemporaryDirectory() as folder:
        source = os.path.join(folder, "in.csv")
        target = os.path.join(folder, "out.csv")
        with open(source, "w", encoding="utf-8") as f:
            f.write("product_id,rating\nP1,4\n")
        assert write_report(source, target) == 1
        with open(target, encoding="utf-8") as f:
            assert f.read() == "P1,4.0\n"
`,
          fails: ["tests-2", "tests-3"],
          why: "one product with one rating can't reveal rounding or ordering bugs",
        },
      ],
      task: {
        checks: [
          ...learnerTests("tests", {
          target: "write_report",
          correct: "def write_report(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    totals = {}\n    for line in lines:\n        p, r = line.split(',')\n        totals.setdefault(p, []).append(int(r))\n    with open(out_path, 'w', encoding='utf-8') as f:\n        for p in sorted(totals):\n            f.write(f'{p},{round(sum(totals[p]) / len(totals[p]), 2)}\\n')\n    return len(totals)\n",
          defects: [
            { label: "a report that reads the header as a product", code: "def write_report(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()\n    totals = {}\n    for line in lines:\n        p, r = line.split(',')\n        totals.setdefault(p, []).append(int(r) if r.strip().isdigit() else 0)\n    with open(out_path, 'w', encoding='utf-8') as f:\n        for p in sorted(totals):\n            f.write(f'{p},{round(sum(totals[p]) / len(totals[p]), 2)}\\n')\n    return len(totals)\n" },
            { label: "a report that doesn't round the averages", code: "def write_report(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    totals = {}\n    for line in lines:\n        p, r = line.split(',')\n        totals.setdefault(p, []).append(int(r))\n    with open(out_path, 'w', encoding='utf-8') as f:\n        for p in sorted(totals):\n            f.write(f'{p},{sum(totals[p]) / len(totals[p])}\\n')\n    return len(totals)\n" },
            { label: "a report in input order instead of sorted", code: "def write_report(in_path, out_path):\n    with open(in_path, encoding='utf-8') as f:\n        lines = f.read().strip().splitlines()[1:]\n    totals = {}\n    for line in lines:\n        p, r = line.split(',')\n        totals.setdefault(p, []).append(int(r))\n    with open(out_path, 'w', encoding='utf-8') as f:\n        for p in totals:\n            f.write(f'{p},{round(sum(totals[p]) / len(totals[p]), 2)}\\n')\n    return len(totals)\n" },
          ],
        }),
          {
            kind: "expr",
            id: "clean",
            label: "your tests leave no files in the current folder",
            hidden: true,
            expr: "import os as _os\n_before = sorted(_os.listdir('.'))\nfor _name, _f in list(globals().items()):\n    if _name.startswith('test') and callable(_f) and not isinstance(_f, type):\n        _f()\nresult = sorted(_os.listdir('.')) == _before",
            expected: yes,
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q40-12",
    version: 2,
    slug: "predict-frozen-limits",
    title: "Predict: a frozen settings object",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["assignment", "boolean", "class-def", "comparison", "dataclass-dec", "except-type", "field-ann", "function-def", "function-param", "if-statement", "import-module", "method-def", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "top-level-indent", "try-except", "unquoted-name"],
    prompt: "Checkout limits are a frozen dataclass with a validation step. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "A dataclass prints its fields by name; a default fills in what wasn't passed.",
      "Building a new object leaves the old one as it was; dataclasses compare field by field.",
      "`__post_init__` runs after the fields are set and can reject them.",
    ],
    explanation: "`Limits(10)` uses the default weight, so its repr shows both fields. `bigger` is a new object (frozen objects can't be changed, so you build another); `base` still has 10, and `bigger` equals `Limits(25)` because all fields match. `Limits(0, 5.0)` is rejected by `__post_init__`.",
    predict: {
      program: src`
from dataclasses import dataclass

@dataclass(frozen=True)
class Limits:
    max_items: int
    max_weight_kg: float = 30.0

    def __post_init__(self):
        if self.max_items < 1:
            raise ValueError("max_items must be at least 1")

base = Limits(10)
print(base)
bigger = Limits(25, base.max_weight_kg)
print(bigger.max_items, base.max_items, bigger == Limits(25))
try:
    Limits(0, 5.0)
except ValueError as error:
    print("rejected:", error)
`,
      output: "Limits(max_items=10, max_weight_kg=30.0)\n25 10 True\nrejected: max_items must be at least 1\n",
      wrongPredictions: [
        "Limits(max_items=10)\n25 10 True\nrejected: max_items must be at least 1\n",
        "Limits(max_items=10, max_weight_kg=30.0)\n25 25 True\nrejected: max_items must be at least 1\n",
        "Limits(max_items=10, max_weight_kg=30.0)\n25 10 False\nrejected: max_items must be at least 1\n",
        "Limits(max_items=10, max_weight_kg=30.0)\n25 10 True\n",
      ],
    },
  },
  {
    id: "PY-Q40-13",
    version: 2,
    slug: "leaky-adapter",
    title: "Fix the adapter that leaks database rows",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "conditional-expr", "dict-get", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "list-index", "list-literal", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "raise-stmt", "self-name", "sqlite-call", "string-index", "top-level-indent", "zip-call"],
    prompt: "The pricing core works with product dictionaries (`product[\"price\"]`). Its SQLite adapter returns raw database rows, which are tuples, so the core crashes with `TypeError: tuple indices must be integers`. Fix the **adapter** (the core must not learn about SQL rows): `get` returns a dictionary with `sku`, `name` and `price`, or `None` for an unknown SKU.",
    spec: [
      ["Class", "`SqliteProducts(connection)` with `get(sku)`"],
      ["Returns", "`{\"sku\": ..., \"name\": ..., \"price\": ...}` or `None`"],
      ["Core", "`price_with_tax(store, sku, rate)` (given) must stay unchanged"],
    ],
    hiddenKinds: ["an unknown SKU", "a second product"],
    hints: [
      "Look at what `fetchone()` returns, and at what the core does with it.",
      "The translation from a database row to the core's dictionary belongs in the adapter.",
      "Build the dictionary from the row's three columns, and keep returning None when there is no row.",
    ],
    explanation: "The adapter's job is to translate between the database's shapes and the core's. Returning `sqlite3` tuples leaked a storage detail into the core. Converting each row to a plain dictionary keeps the core independent of SQLite (an in-memory or JSON adapter can return the same dictionaries).",
    code: {
      starter: src`
import sqlite3

class SqliteProducts:
    def __init__(self, connection):
        self.db = connection

    def get(self, sku):
        return self.db.execute("SELECT sku, name, price FROM products WHERE sku = ?", (sku,)).fetchone()

def price_with_tax(store, sku, rate):
    product = store.get(sku)
    if product is None:
        raise KeyError(sku)
    return round(product["price"] * (1 + rate), 2)

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, price REAL)")
db.execute("INSERT INTO products VALUES ('SPO-11681', 'Ultra Bike Light', 7.49)")
print(price_with_tax(SqliteProducts(db), "SPO-11681", 0.0825))
`,
      answer: src`
import sqlite3

class SqliteProducts:
    def __init__(self, connection):
        self.db = connection

    def get(self, sku):
        row = self.db.execute("SELECT sku, name, price FROM products WHERE sku = ?", (sku,)).fetchone()
        if row is None:
            return None
        return {"sku": row[0], "name": row[1], "price": row[2]}

def price_with_tax(store, sku, rate):
    product = store.get(sku)
    if product is None:
        raise KeyError(sku)
    return round(product["price"] * (1 + rate), 2)

db = sqlite3.connect(":memory:")
db.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, price REAL)")
db.execute("INSERT INTO products VALUES ('SPO-11681', 'Ultra Bike Light', 7.49)")
print(price_with_tax(SqliteProducts(db), "SPO-11681", 0.0825))
`,
      alternatives: [
        src`
import sqlite3

class SqliteProducts:
    def __init__(self, connection):
        self.db = connection

    def get(self, sku):
        cursor = self.db.execute("SELECT sku, name, price FROM products WHERE sku = ?", (sku,))
        names = [column[0] for column in cursor.description]
        row = cursor.fetchone()
        return dict(zip(names, row)) if row else None

def price_with_tax(store, sku, rate):
    product = store.get(sku)
    if product is None:
        raise KeyError(sku)
    return round(product["price"] * (1 + rate), 2)
`,
      ],
      wrong: [
        {
          code: src`
import sqlite3

class SqliteProducts:
    def __init__(self, connection):
        self.db = connection

    def get(self, sku):
        return self.db.execute("SELECT sku, name, price FROM products WHERE sku = ?", (sku,)).fetchone()

def price_with_tax(store, sku, rate):
    product = store.get(sku)
    if product is None:
        raise KeyError(sku)
    return round(product[2] * (1 + rate), 2)
`,
          fails: ["shape"],
          why: "the core was changed to read tuple positions: now it depends on the SQL column order",
        },
        {
          code: src`
import sqlite3

class SqliteProducts:
    def __init__(self, connection):
        self.db = connection

    def get(self, sku):
        row = self.db.execute("SELECT sku, name, price FROM products WHERE sku = ?", (sku,)).fetchone()
        return {"sku": row[0], "name": row[1], "price": row[2]}

def price_with_tax(store, sku, rate):
    product = store.get(sku)
    if product is None:
        raise KeyError(sku)
    return round(product["price"] * (1 + rate), 2)
`,
          fails: ["unknown"],
          why: "an unknown SKU crashes inside the adapter with TypeError instead of returning None",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "shape",
            label: "get() returns a product dictionary the core can use",
            show: "SqliteProducts(db).get('SPO-11681')",
            expr: "import sqlite3 as _sq\n_db = _sq.connect(':memory:')\n_db.execute('CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, price REAL)')\n_db.execute(\"INSERT INTO products VALUES ('SPO-11681', 'Ultra Bike Light', 7.49), ('HOM-22847', 'Deluxe Vase', 31.0)\")\n_s = SqliteProducts(_db)\nresult = [_s.get('HOM-22847'), price_with_tax(_s, 'SPO-11681', 0.0825), price_with_tax({'X': None} and _s, 'HOM-22847', 0.1)]",
            expected: py.list(py.dict([[py.str("sku"), py.str("HOM-22847")], [py.str("name"), py.str("Deluxe Vase")], [py.str("price"), py.float(31)]]), py.float(8.11), py.float(34.1)),
          },
          {
            kind: "expr",
            id: "unknown",
            label: "an unknown SKU gives None",
            hidden: true,
            expr: "import sqlite3 as _sq\n_db = _sq.connect(':memory:')\n_db.execute('CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, price REAL)')\nresult = SqliteProducts(_db).get('NOPE')",
            expected: py.none,
          },
        ],
      },
    },
  },
  {
    id: "PY-Q40-16",
    version: 2,
    slug: "invoice-core",
    title: "The invoice calculation as a pure core",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "list-index", "list-literal", "membership", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    prompt: "An invoicing script mixed database reads, arithmetic and PDF output. Write its core, `invoice_totals(lines, prices, tax_rate)`: pure arithmetic over plain data, no I/O, so it can be tested and reused for the PDF and the API.",
    spec: [
      ["Function", "`invoice_totals(lines, prices, tax_rate)`"],
      ["lines", "a list of `{\"sku\": ..., \"qty\": ...}`; `prices` maps SKU to unit price"],
      ["Returns", "`{\"subtotal\": s, \"tax\": t, \"total\": s + t}`, each rounded to 2 decimals (round the subtotal and tax first, then add)"],
      ["Raises", "`KeyError` for a SKU with no price"],
    ],
    hiddenKinds: ["no lines", "a SKU without a price", "tax that needs rounding"],
    hints: [
      "Add up `prices[sku] * qty` for the subtotal; a missing SKU raises KeyError by itself.",
      "Round the subtotal, then compute and round the tax from it.",
      "The total is the sum of the two rounded amounts.",
    ],
    explanation: "Everything the calculation needs arrives as arguments and the result is returned, so a test is a single call with literals. Rounding the subtotal and tax before adding them keeps the printed amounts consistent: the total always equals the two numbers shown above it.",
    code: {
      starter: src`
def invoice_totals(lines, prices, tax_rate):
    return {}

print(invoice_totals([{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}], {"SPO-11681": 7.49, "HOM-22847": 31.0}, 0.0825))
`,
      answer: src`
def invoice_totals(lines, prices, tax_rate):
    subtotal = 0
    for line in lines:
        subtotal += prices[line["sku"]] * line["qty"]
    subtotal = round(subtotal, 2)
    tax = round(subtotal * tax_rate, 2)
    return {"subtotal": subtotal, "tax": tax, "total": round(subtotal + tax, 2)}

print(invoice_totals([{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}], {"SPO-11681": 7.49, "HOM-22847": 31.0}, 0.0825))
`,
      alternatives: [
        src`
def invoice_totals(lines, prices, tax_rate):
    subtotal = round(sum(prices[l["sku"]] * l["qty"] for l in lines), 2)
    tax = round(subtotal * tax_rate, 2)
    return dict(subtotal=subtotal, tax=tax, total=round(subtotal + tax, 2))
`,
      ],
      wrong: [
        {
          code: src`
def invoice_totals(lines, prices, tax_rate):
    subtotal = sum(prices.get(l["sku"], 0) * l["qty"] for l in lines)
    tax = subtotal * tax_rate
    return {"subtotal": round(subtotal, 2), "tax": round(tax, 2), "total": round(subtotal + tax, 2)}
`,
          fails: ["returns"],
          why: "a missing price silently counts as 0, and the total can differ by a cent from the shown amounts",
        },
        {
          code: src`
def invoice_totals(lines, prices, tax_rate):
    subtotal = round(sum(prices[l["sku"]] * l["qty"] for l in lines), 2)
    tax = round(subtotal * tax_rate, 2)
    print("subtotal", subtotal)
    return {"subtotal": subtotal, "tax": tax, "total": round(subtotal + tax, 2)}
`,
          fails: ["pure"],
          why: "the core prints, which the PDF and API callers don't want",
        },
      ],
      task: {
        checks: [
          fn("returns", "invoice_totals", [
            example([[{ sku: "SPO-11681", qty: 2 }, { sku: "HOM-22847", qty: 1 }], { "SPO-11681": 7.49, "HOM-22847": 31.0 }, 0.0825], { subtotal: 45.98, tax: 3.79, total: 49.77 }),
            example([[], { "SPO-11681": 7.49 }, 0.1], { subtotal: 0, tax: py.float(0), total: py.float(0) }),
            example([[{ sku: "A", qty: 3 }], { A: 10 }, 0], { subtotal: 30, tax: 0, total: 30 }),
            hiddenCase("tax that needs rounding", [[{ sku: "B", qty: 1 }], { B: 0.25 }, 0.07], { subtotal: 0.25, tax: 0.02, total: 0.27 }),
            hiddenCase("the shown amounts add up", [[{ sku: "C", qty: 1 }], { C: 10.005 }, 0.0005], { subtotal: 10.01, tax: 0.01, total: 10.02 }),
            raisesCase([[{ sku: "ZZZ", qty: 1 }], { A: 1 }, 0.1], "KeyError", { label: "a SKU without a price" }),
          ], { label: "invoice_totals() computes subtotal, tax and total", compare: { numbers: "int-float-equal" } }),
          {
            kind: "expr",
            id: "pure",
            label: "invoice_totals() prints nothing",
            hidden: true,
            expr: "import io as _io, contextlib as _cl\n_buf = _io.StringIO()\nwith _cl.redirect_stdout(_buf):\n    invoice_totals([{'sku': 'A', 'qty': 1}], {'A': 2.0}, 0.1)\nresult = _buf.getvalue()",
            expected: py.str(""),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q40-19",
    version: 2,
    slug: "dedupe-validation",
    title: "Refactor the duplicated SKU validation",
    format: "refactoring",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-mutate", "logical", "none-value", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "top-level-indent"],
    prompt: "`add_product` and `rename_sku` each contain a copy of the SKU rules, and the copies have started to drift in their messages. Extract one helper used by both, keeping every result and every error message **exactly** as the current code produces them (the checks compare with the current behaviour). The rules' text must appear only once.",
    spec: [
      ["Functions", "`add_product(catalogue, sku, name)` and `rename_sku(catalogue, old, new)` keep their names, parameters and behaviour"],
      ["Rules", "a SKU is stripped and upper-cased; it must look like `ABC-12345` (3 letters, a dash, 5 digits), else ValueError(\"bad SKU: <original text>\")"],
      ["Structure", "the pattern of the rule appears once in the program"],
    ],
    hiddenKinds: ["a lower-case SKU with spaces", "a SKU with four digits", "renaming to an invalid SKU"],
    hints: [
      "Compare the two copies line by line: what is shared, and what is different?",
      "Move the shared cleaning and checking into one function that returns the clean SKU or raises.",
      "Call it from both functions, keeping each function's own dictionary changes.",
    ],
    explanation: "The shared part (strip, upper-case, check the shape, raise with the original text) becomes `clean_sku`, and both callers use it, so the next rule change happens once. The behaviour checks prove the refactor changed nothing; the structure check proves the duplication is gone.",
    code: {
      starter: src`
import re

def add_product(catalogue, sku, name):
    clean = sku.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + sku)
    catalogue[clean] = name
    return clean

def rename_sku(catalogue, old, new):
    clean = new.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + new)
    catalogue[clean] = catalogue.pop(old)
    return clean
`,
      answer: src`
import re

def clean_sku(sku):
    clean = sku.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + sku)
    return clean

def add_product(catalogue, sku, name):
    clean = clean_sku(sku)
    catalogue[clean] = name
    return clean

def rename_sku(catalogue, old, new):
    clean = clean_sku(new)
    catalogue[clean] = catalogue.pop(old)
    return clean
`,
      alternatives: [
        src`
import re

SKU_SHAPE = re.compile(r"[A-Z]{3}-\d{5}")

def checked(text):
    value = text.strip().upper()
    if SKU_SHAPE.fullmatch(value) is None:
        raise ValueError(f"bad SKU: {text}")
    return value

def add_product(catalogue, sku, name):
    key = checked(sku)
    catalogue[key] = name
    return key

def rename_sku(catalogue, old, new):
    key = checked(new)
    catalogue[key] = catalogue.pop(old)
    return key
`,
      ],
      wrong: [
        {
          code: src`
import re

def clean_sku(sku):
    clean = sku.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + clean)
    return clean

def add_product(catalogue, sku, name):
    clean = clean_sku(sku)
    catalogue[clean] = name
    return clean

def rename_sku(catalogue, old, new):
    clean = clean_sku(new)
    catalogue[clean] = catalogue.pop(old)
    return clean
`,
          fails: ["messages"],
          why: "the message now shows the cleaned text instead of what the user typed: a behaviour change",
        },
        {
          code: src`
import re

def clean_sku(sku):
    clean = sku.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + sku)
    return clean

def add_product(catalogue, sku, name):
    clean = clean_sku(sku)
    catalogue[clean] = name
    return clean

def rename_sku(catalogue, old, new):
    clean = new.strip().upper()
    if not re.fullmatch(r"[A-Z]{3}-\d{5}", clean):
        raise ValueError("bad SKU: " + new)
    catalogue[clean] = catalogue.pop(old)
    return clean
`,
          fails: ["once"],
          why: "the helper exists, but `rename_sku` still has its own copy of the rule, so the copies can drift again",
        },
      ],
      task: {
        checks: [
          fn("adds", "add_product", [
            example([{}, " spo-11681 ", "Ultra Bike Light"], "SPO-11681"),
            example([{}, "HOM-22847", "Deluxe Vase"], "HOM-22847"),
            example([{}, "ELE-24781", "Organic Speaker"], "ELE-24781"),
            raisesCase([{}, "SPO-1168", "Short"], "ValueError", { label: "a SKU with four digits" }),
            hiddenCase("a lower-case SKU with spaces", [{}, "  boo-58412", "Atlas"], "BOO-58412"),
          ], { label: "add_product() behaves as before" }),
          {
            kind: "expr",
            id: "messages",
            label: "error messages show the text as typed",
            hidden: true,
            expr: "_msgs = []\nfor _call in (lambda: add_product({}, ' bad ', 'x'), lambda: rename_sku({'SPO-11681': 'L'}, 'SPO-11681', 'ab-1')):\n    try:\n        _call()\n    except ValueError as _e:\n        _msgs.append(str(_e))\nresult = _msgs",
            expected: py.list(py.str("bad SKU:  bad "), py.str("bad SKU: ab-1")),
          },
          {
            kind: "expr",
            id: "renames",
            label: "rename_sku() moves the product to the clean SKU",
            show: "rename_sku({'SPO-11681': 'Light'}, 'SPO-11681', 'spo-20417')",
            expr: "_c = {'SPO-11681': 'Light'}\nresult = [rename_sku(_c, 'SPO-11681', 'spo-20417'), _c]",
            expected: py.list(py.str("SPO-20417"), py.dict([[py.str("SPO-20417"), py.str("Light")]])),
          },
          {
            kind: "expr",
            id: "once",
            label: "the SKU pattern is written only once",
            hidden: true,
            expr: "result = _source.count('{3}-')",
            expected: py.int(1),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q40-20",
    version: 2,
    slug: "ratings-entry-point",
    title: "An entry point over the ratings modules",
    format: "integration",
    difficulty: "hard",
    minutes: 20,
    requires: ["argparse-call", "assignment", "boolean", "comp-if", "comparison", "conversion", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "json-dumps", "len-call", "list-mutate", "logical", "membership", "path-call", "print-call", "print-text", "reassignment", "string-format", "string-index", "top-level-indent", "try-except", "tuple-unpack", "with-statement"],
    prompt: "`ratings.py` (read-only) holds the pure core: `parse_ratings(text)` and `averages(rows)`. Write the entry point `main(argv)`: `argv` is `[input_csv, output_json]` with an optional `--min N` after them; read the CSV, compute the averages, keep products whose average is at least N (default 0), write them as a JSON object to the output file and return 0. A missing input file prints `error: <path> not found` and returns 1; wrong arguments return 2.",
    spec: [
      ["Function", "`main(argv)` → exit code"],
      ["argv", "`[in_csv, out_json]` or `[in_csv, out_json, \"--min\", \"4\"]`"],
      ["Output", "JSON object `{product_id: average}` of the kept products"],
      ["Codes", "0 success; 1 input missing (with the message printed); 2 wrong arguments"],
    ],
    hiddenKinds: ["the --min option", "a missing input file", "wrong arguments"],
    hints: [
      "Validate the argument shape first: two paths, or two paths followed by `--min` and a number.",
      "Read the file inside `try`/`except FileNotFoundError`; everything else is `averages(parse_ratings(text))`.",
      "Filter by the minimum, `json.dump` the dictionary, and return the code.",
    ],
    explanation: "The entry point is the imperative shell: it interprets arguments, does the I/O, maps failures to exit codes and messages, and delegates all computation to the core module. Because the core is separate, these checks only need to verify the wiring and the edge behaviour.",
    code: {
      starter: src`
import json
from ratings import averages, parse_ratings

def main(argv):
    return 2
`,
      answer: src`
import json
from ratings import averages, parse_ratings

def main(argv):
    minimum = 0.0
    if len(argv) == 4 and argv[2] == "--min":
        try:
            minimum = float(argv[3])
        except ValueError:
            return 2
    elif len(argv) != 2:
        return 2
    in_path, out_path = argv[0], argv[1]
    try:
        with open(in_path, encoding="utf-8") as f:
            text = f.read()
    except FileNotFoundError:
        print(f"error: {in_path} not found")
        return 1
    result = {}
    for product_id, average in averages(parse_ratings(text)).items():
        if average >= minimum:
            result[product_id] = average
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f)
    return 0
`,
      alternatives: [
        src`
import argparse
import json
from pathlib import Path
from ratings import averages, parse_ratings

def main(argv):
    parser = argparse.ArgumentParser(exit_on_error=False)
    parser.add_argument("source")
    parser.add_argument("target")
    parser.add_argument("--min", type=float, default=0.0)
    try:
        args = parser.parse_args(argv)
    except (argparse.ArgumentError, SystemExit):
        return 2
    source = Path(args.source)
    if not source.exists():
        print(f"error: {args.source} not found")
        return 1
    kept = {p: a for p, a in averages(parse_ratings(source.read_text(encoding="utf-8"))).items() if a >= args.min}
    Path(args.target).write_text(json.dumps(kept), encoding="utf-8")
    return 0
`,
      ],
      wrong: [
        {
          code: src`
import json
from ratings import averages, parse_ratings

def main(argv):
    in_path, out_path = argv[0], argv[1]
    with open(in_path, encoding="utf-8") as f:
        text = f.read()
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(averages(parse_ratings(text)), f)
    return 0
`,
          fails: ["minimum", "missing", "usage"],
          why: "no option handling, a traceback instead of a message for a missing file, and no usage check",
        },
        {
          code: src`
import json
from ratings import averages, parse_ratings

def main(argv):
    if len(argv) not in (2, 4):
        return 2
    minimum = float(argv[3]) if len(argv) == 4 else 0
    try:
        with open(argv[0], encoding="utf-8") as f:
            text = f.read()
    except FileNotFoundError:
        print(f"error: {argv[0]} not found")
        return 1
    rows = parse_ratings(text)
    kept = {p: a for p, a in averages(rows).items() if a > minimum}
    with open(argv[1], "w", encoding="utf-8") as f:
        json.dump(kept, f)
    return 0
`,
          fails: ["minimum", "usage"],
          why: "`>` drops products whose average equals the minimum",
        },
      ],
      task: {
        files: { ...RATINGS_FILES, "reviews.csv": "product_id,rating\nP0205,5\nP0421,4\nP0205,2\nP0187,5\nP0205,4\nP0421,4\n" },
        checks: [
          {
            kind: "expr",
            id: "basic",
            label: "main() writes every product's average",
            show: "main(['reviews.csv', 'out.json'])",
            expr: "import json as _j\n_code = main(['reviews.csv', 'out.json'])\nwith open('out.json', encoding='utf-8') as _f:\n    result = [_code, _j.load(_f)]",
            expected: py.list(py.int(0), py.dict([[py.str("P0187"), py.float(5)], [py.str("P0205"), py.float(3.67)], [py.str("P0421"), py.float(4)]])),
          },
          jsonFile("minimum", "--min keeps products at or above the minimum", "out2.json", { P0187: py.float(5), P0421: py.float(4) }, { setup: "main(['reviews.csv', 'out2.json', '--min', '4'])", hidden: true }),
          {
            kind: "expr",
            id: "missing",
            label: "a missing input file prints a message and returns 1",
            hidden: true,
            expr: "import io as _io, contextlib as _cl\n_buf = _io.StringIO()\nwith _cl.redirect_stdout(_buf):\n    _code = main(['nope.csv', 'x.json'])\nresult = [_code, _buf.getvalue()]",
            expected: py.list(py.int(1), py.str("error: nope.csv not found\n")),
          },
          {
            kind: "expr",
            id: "usage",
            label: "wrong arguments return 2",
            hidden: true,
            expr: "result = [main(['reviews.csv']), main(['a', 'b', '--max', '3'])]",
            expected: py.list(py.int(2), py.int(2)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q40-22",
    version: 2,
    slug: "config-diff",
    title: "Review a configuration change",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "bitwise", "boolean", "comparison", "dict-get", "dict-iterate", "dict-literal", "dict-update", "else-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "precedence", "print-call", "print-several", "print-text", "sort-key", "string-index", "top-level-indent", "tuple-unpack"],
    prompt: "Before a deployment, reviewers want to see exactly which settings change. Write `config_diff(old, new)` over nested configuration dictionaries: list every leaf setting that was added, removed or changed, as `(dotted.key, old_value, new_value)` with `None` for a side where the setting doesn't exist. A dictionary on both sides is compared key by key; anything else (including lists) is a value.",
    spec: [
      ["Function", "`config_diff(old, new)`"],
      ["Returns", "a list of `(key, old_value, new_value)` tuples sorted by key; unchanged settings are left out"],
      ["Keys", "nested keys joined with dots: `db.pool.size`; when a dictionary is replaced by a value (or the reverse), report the whole key once"],
    ],
    hiddenKinds: ["a removed nested setting", "a dictionary replaced by a value", "identical configurations", "a changed list"],
    hints: [
      "Walk both dictionaries together: for every key in either one, compare the two values.",
      "If both values are dictionaries, go one level deeper with the key as a prefix (recursion is fine: configurations are shallow).",
      "Otherwise, if they differ, record `(prefix + key, old.get(key), new.get(key))`; sort at the end.",
    ],
    explanation: "Taking the union of keys at each level finds additions and removals as well as changes, `get` supplies `None` for a missing side, and only recursing when both sides are dictionaries makes a type change one clear entry. Sorting by dotted key gives reviewers a stable, readable list.",
    code: {
      starter: src`
def config_diff(old, new):
    return []

print(config_diff({"db": {"host": "localhost", "pool": {"size": 5}}, "debug": True}, {"db": {"host": "db.internal", "pool": {"size": 5}}, "cache": {"ttl": 60}}))
`,
      answer: src`
def config_diff(old, new, prefix=""):
    changes = []
    for key in set(old) | set(new):
        before = old.get(key)
        after = new.get(key)
        name = prefix + key
        if isinstance(before, dict) and isinstance(after, dict):
            changes.extend(config_diff(before, after, name + "."))
        elif before != after or (key in old) != (key in new):
            changes.append((name, before, after))
    return sorted(changes, key=lambda change: change[0])

print(config_diff({"db": {"host": "localhost", "pool": {"size": 5}}, "debug": True}, {"db": {"host": "db.internal", "pool": {"size": 5}}, "cache": {"ttl": 60}}))
`,
      alternatives: [
        src`
def leaves(config, prefix=""):
    out = {}
    for key, value in config.items():
        if isinstance(value, dict) and value:
            out.update(leaves(value, prefix + key + "."))
        else:
            out[prefix + key] = value
    return out

def config_diff(old, new):
    result = []
    for key in sorted(set(old) | set(new)):
        a, b = old.get(key), new.get(key)
        if isinstance(a, dict) and isinstance(b, dict):
            result += [(key + "." + k, x, y) for k, x, y in config_diff(a, b)]
        elif a != b or (key in old) != (key in new):
            result.append((key, a, b))
    return sorted(result, key=lambda r: r[0])
`,
      ],
      wrong: [
        {
          code: src`
def config_diff(old, new, prefix=""):
    changes = []
    for key in old:
        if isinstance(old[key], dict) and isinstance(new.get(key), dict):
            changes.extend(config_diff(old[key], new[key], prefix + key + "."))
        elif old[key] != new.get(key):
            changes.append((prefix + key, old[key], new.get(key)))
    return sorted(changes, key=lambda change: change[0])
`,
          fails: ["returns"],
          why: "only keys from the old configuration are visited, so added settings are never reported",
        },
        {
          code: src`
def config_diff(old, new):
    changes = []
    for key in sorted(set(old) | set(new)):
        if old.get(key) != new.get(key):
            changes.append((key, old.get(key), new.get(key)))
    return changes
`,
          fails: ["returns"],
          why: "nested dictionaries are compared as whole values, so one changed pool size reports the entire `db` section",
        },
      ],
      task: {
        checks: [
          fn("returns", "config_diff", [
            example([{ db: { host: "localhost", pool: { size: 5 } }, debug: true }, { db: { host: "db.internal", pool: { size: 5 } }, cache: { ttl: 60 } }], [t("cache", null, null), t("db.host", "localhost", "db.internal"), t("debug", true, null)].map((x, i) => (i === 0 ? py.tuple(py.str("cache"), py.none, py.dict([[py.str("ttl"), py.int(60)]])) : x))),
            example([{ a: 1 }, { a: 1 }], []),
            example([{ a: 1 }, { a: 2 }], [t("a", 1, 2)]),
            hiddenCase("a removed nested setting", [{ db: { pool: { size: 5, timeout: 30 } } }, { db: { pool: { size: 5 } } }], [t("db.pool.timeout", 30, null)]),
            hiddenCase("a dictionary replaced by a value", [{ cache: { ttl: 60 } }, { cache: false }], [py.tuple(py.str("cache"), py.dict([[py.str("ttl"), py.int(60)]]), py.bool(false))]),
            hiddenCase("a changed list", [{ features: ["search"] }, { features: ["search", "reviews"] }], [py.tuple(py.str("features"), py.list(py.str("search")), py.list(py.str("search"), py.str("reviews")))]),
            hiddenCase("a setting added as None", [{}, { proxy: null }], [t("proxy", null, null)]),
          ], { label: "config_diff() lists every changed leaf setting" }),
          fn("keeps-input", "config_diff", [keepsInput([{ db: { pool: { size: 5 } } }, { db: { pool: { size: 8 } } }])], { label: "config_diff() leaves both configurations unchanged" }),
        ],
      },
    },
  },
];
