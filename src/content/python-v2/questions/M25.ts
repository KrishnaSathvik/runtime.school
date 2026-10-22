/**
 * M25 practice: ten independent problems on testing (PY-L25-01 … PY-L25-05).
 *
 * Mix: 5 testing questions where the learner writes the tests (graded by running them against a correct
 * implementation and against defective ones, one defect hidden), 1 debugging (a TestCase whose tests can't fail),
 * 2 function implementations (a record diff like assertEqual's, a float comparison like math.isclose), and 2 output
 * predictions about how unittest counts tests, failures and errors.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures come from the Runtime Market (R01: SKUs, orders, customers, stock) and from retail-style durations and
 * prices. Tests run through unittest's own loader and result object; pytest isn't used.
 * Version 2: every question was replaced; the old set asserted double(4) == 8 and printed ok.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, learnerTests, raisesCase } from "../checks";
import type { PyCheck } from "@/engine/python/grading";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: PyCheck[], prefix: string, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `${prefix}-${n}`) ? { ...c, hidden: true } : c));

export const m25Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q25-02 testing, easy
  {
    id: "PY-Q25-02",
    version: 2,
    slug: "tests-for-sku-codes",
    title: "Tests for a SKU checker",
    format: "testing",
    difficulty: "easy",
    minutes: 12,
    requires: ["boolean", "class-def", "for-loop", "function-def", "function-param", "function-return", "identity", "import-module", "logical", "membership", "none-value", "string-index", "test-func", "top-level-indent", "unittest-case"],
    prompt: "Runtime Market SKUs look like `SPO-11681`: three capital letters, a dash, then exactly five digits. `valid_sku(text)` is already written and correct. Write a TestCase, `TestValidSku`, whose tests would catch a broken version of it. Check runs your tests against the correct function and against several broken ones.",
    spec: [
      ["Write", "`class TestValidSku(unittest.TestCase)` with test methods using `assertTrue` / `assertFalse`"],
      ["Rule", "`valid_sku(\"SPO-11681\")` → True; anything else → False, e.g. `\"spo-11681\"`, `\"SPO-1168\"`, `\"SPO11681\"`"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "Start from one valid SKU, then change one thing at a time: the letters' case, the number of digits, the dash.",
      "Each of those changed texts must give False. A test for each makes it clear which rule a broken version ignores.",
      "Think about extra characters too: what about a valid SKU with something after it?",
    ],
    explanation: "A checker has two ways to be wrong: refusing valid input and accepting invalid input. Good tests probe each rule separately, by starting from a valid value and breaking one thing at a time: lower-case letters, four or six digits, a missing dash, extra characters at the end. The last one catches a common bug, matching only the start of the text (`re.match` instead of `re.fullmatch`).",
    code: {
      starter: src`
import re
import unittest

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", text) is not None

class TestValidSku(unittest.TestCase):
    pass
`,
      answer: src`
import re
import unittest

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", text) is not None

class TestValidSku(unittest.TestCase):
    def test_accepts_real_skus(self):
        self.assertTrue(valid_sku("SPO-11681"))
        self.assertTrue(valid_sku("HOM-22847"))

    def test_letters_must_be_capitals(self):
        self.assertFalse(valid_sku("spo-11681"))

    def test_exactly_five_digits(self):
        self.assertFalse(valid_sku("SPO-1168"))
        self.assertFalse(valid_sku("SPO-116810"))

    def test_dash_required(self):
        self.assertFalse(valid_sku("SPO11681"))

    def test_nothing_after_the_digits(self):
        self.assertFalse(valid_sku("SPO-11681X"))
`,
      alternatives: [
        src`
import re
import unittest

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", text) is not None

class TestValidSku(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(valid_sku("ELE-24781"), True)

    def test_invalid(self):
        for text in ["ele-24781", "ELE-2478", "ELE24781", "ELE-24781 extra", "ELEC-24781"]:
            self.assertEqual(valid_sku(text), False, text)
`,
      ],
      wrong: [
        {
          code: src`
import re
import unittest

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", text) is not None

class TestValidSku(unittest.TestCase):
    def test_valid(self):
        self.assertTrue(valid_sku("SPO-11681"))

    def test_lower_case(self):
        self.assertFalse(valid_sku("spo-11681"))
`,
          fails: ["tests-2", "tests-3", "tests-4"],
          why: "only the letters' case is probed, so versions that accept any number of digits, no dash, or extra characters all pass",
        },
        {
          code: src`
import re
import unittest

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", text) is not None

class TestValidSku(unittest.TestCase):
    def test_trailing_space_allowed(self):
        self.assertTrue(valid_sku("SPO-11681 "))
`,
          fails: ["tests-4", "tests-correct"],
          why: "the rule doesn't allow a trailing space, so the test fails on the correct function; it also checks nothing else",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "valid_sku",
          correct: "import re\n\ndef valid_sku(text):\n    return re.fullmatch(r'[A-Z]{3}-\\d{5}', text) is not None\n",
          defects: [
            { label: "a version that accepts lower-case letters", code: "import re\n\ndef valid_sku(text):\n    return re.fullmatch(r'[A-Za-z]{3}-\\d{5}', text) is not None\n" },
            { label: "a version that accepts any number of digits", code: "import re\n\ndef valid_sku(text):\n    return re.fullmatch(r'[A-Z]{3}-\\d+', text) is not None\n" },
            { label: "a version where the dash is optional", code: "import re\n\ndef valid_sku(text):\n    return re.fullmatch(r'[A-Z]{3}-?\\d{5}', text) is not None\n" },
            { label: "another broken version", code: "import re\n\ndef valid_sku(text):\n    return re.match(r'[A-Z]{3}-\\d{5}', text) is not None\n" },
          ],
        }), "tests", [4]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-03 debugging, easy
  {
    id: "PY-Q25-03",
    version: 2,
    slug: "tests-that-cannot-fail",
    title: "Tests that can't fail",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assert-stmt", "assignment", "class-def", "comparison", "for-loop", "function-def", "function-param", "function-return", "import-module", "membership", "string-index", "test-func", "top-level-indent", "unittest-case", "with-statement"],
    prompt: "`price_with_vat` adds 20% VAT and rounds to the penny, and its TestCase has always passed. Then someone broke the function and the tests *still* passed. Every test method here has a bug that stops it from failing. Fix the tests (not the function) so that they check what their names promise.",
    spec: [
      ["Fix", "the four test methods of `TestPriceWithVat`"],
      ["Rule", "`price_with_vat(10)` → 12.0; `(19.99)` → 23.99; `(0.01)` → 0.01; `(2.49)` → 2.99; `(5)` → 6.0; `(0)` → 0"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "Look at each test and ask: what would have to happen for it to fail? Where is the `assertEqual` relative to the loop?",
      "`assertTrue(a, b)` treats `b` as a message. A comparison on its own line computes True or False and throws it away. And which methods does unittest actually run?",
      "Move the check into the loop, compare with `assertEqual`, put an assert in front of the bare comparison, and give the zero test a name unittest will find.",
    ],
    explanation: "A test is only useful if it can fail. Four common ways to write one that can't: an `assertEqual` placed after the loop checks only the last row; `assertTrue(value, expected)` passes for any non-zero value because the second argument is just a message; a comparison without an assert is computed and discarded; and a method whose name doesn't start with `test` is never run. A quick way to catch these is to break the function on purpose and confirm that a test goes red.",
    code: {
      starter: src`
import unittest

def price_with_vat(net):
    return round(net * 1.2, 2)

class TestPriceWithVat(unittest.TestCase):
    def test_table(self):
        for net, gross in [(10, 12.0), (19.99, 23.99), (0.01, 0.01)]:
            result = price_with_vat(net)
        self.assertEqual(result, gross)

    def test_rounds_to_pennies(self):
        self.assertTrue(price_with_vat(2.49), 2.99)

    def test_whole_pounds(self):
        price_with_vat(5) == 6.0

    def check_zero(self):
        self.assertEqual(price_with_vat(0), 0)
`,
      answer: src`
import unittest

def price_with_vat(net):
    return round(net * 1.2, 2)

class TestPriceWithVat(unittest.TestCase):
    def test_table(self):
        for net, gross in [(10, 12.0), (19.99, 23.99), (0.01, 0.01)]:
            with self.subTest(net=net):
                self.assertEqual(price_with_vat(net), gross)

    def test_rounds_to_pennies(self):
        self.assertEqual(price_with_vat(2.49), 2.99)

    def test_whole_pounds(self):
        self.assertEqual(price_with_vat(5), 6.0)

    def test_zero(self):
        self.assertEqual(price_with_vat(0), 0)
`,
      alternatives: [
        src`
import unittest

def price_with_vat(net):
    return round(net * 1.2, 2)

class TestPriceWithVat(unittest.TestCase):
    def test_table(self):
        for net, gross in [(10, 12.0), (19.99, 23.99), (0.01, 0.01)]:
            result = price_with_vat(net)
            self.assertEqual(result, gross)

    def test_rounds_to_pennies(self):
        self.assertTrue(price_with_vat(2.49) == 2.99)

    def test_whole_pounds(self):
        assert price_with_vat(5) == 6.0

    def test_check_zero(self):
        self.assertEqual(price_with_vat(0), 0)
`,
      ],
      wrong: [
        {
          code: src`
import unittest

def price_with_vat(net):
    return round(net * 1.2, 2)

class TestPriceWithVat(unittest.TestCase):
    def test_table(self):
        for net, gross in [(10, 12.0), (19.99, 23.99), (0.01, 0.01)]:
            self.assertEqual(price_with_vat(net), gross)

    def test_rounds_to_pennies(self):
        self.assertEqual(price_with_vat(2.49), 2.99)

    def test_whole_pounds(self):
        self.assertEqual(price_with_vat(5), 6.0)

    def check_zero(self):
        self.assertEqual(price_with_vat(0), 0)
`,
          fails: ["tests-3"],
          why: "three tests are fixed, but `check_zero` still never runs, so a version that breaks at zero passes",
        },
        {
          code: src`
import unittest

def price_with_vat(net):
    return round(net * 1.2, 2)

class TestPriceWithVat(unittest.TestCase):
    def test_table(self):
        for net, gross in [(10, 12.0), (19.99, 23.99), (0.01, 0.01)]:
            self.assertEqual(price_with_vat(net), gross)

    def test_rounds_to_pennies(self):
        self.assertEqual(price_with_vat(2.49), 2.988)

    def test_whole_pounds(self):
        self.assertEqual(price_with_vat(5), 6.0)

    def test_zero(self):
        self.assertEqual(price_with_vat(0), 0)
`,
          fails: ["tests-correct"],
          why: "2.988 is the price before rounding, so the corrected test now fails on the correct function",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "price_with_vat",
          correct: "def price_with_vat(net):\n    return round(net * 1.2, 2)\n",
          defects: [
            { label: "a version with a 25% rate", code: "def price_with_vat(net):\n    return round(net * 1.25, 2)\n" },
            { label: "a version that rounds to whole pounds", code: "def price_with_vat(net):\n    return round(net * 1.2)\n" },
            { label: "another broken version", code: "def price_with_vat(net):\n    if not net:\n        return None\n    return round(net * 1.2, 2)\n" },
          ],
        }), "tests", [3]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-06 function implementation, easy
  {
    id: "PY-Q25-06",
    version: 2,
    slug: "diff-two-records",
    title: "Explain why two records differ",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "print-call", "string-format", "string-index", "top-level-indent", "unquoted-name"],
    prompt: "When a test compares a whole record, `assert expected == actual` only says *False*. A good failure message says exactly what differs. Write `diff_records(expected, actual)` that returns one line per difference between two dictionaries, the way unittest explains a failed comparison.",
    spec: [
      ["Function", "`diff_records(expected, actual)`"],
      ["Returns", "a list of texts, `[]` when the records are equal"],
      ["Order", "first walk `expected` in its key order: a key `actual` lacks gives `missing key 'k'`; a different value gives `'k': expected <value>, got <value>`. Then walk `actual`: a key `expected` lacks gives `unexpected key 'k'`"],
      ["Values", "shown with `repr`, so text keeps its quotes: `'qty': expected 12, got '12'`"],
    ],
    hiddenKinds: ["two empty records", "a number compared with the same digits as text", "a key whose expected value is None", "several extra keys"],
    hints: [
      "Two passes: one over `expected`'s keys, one over `actual`'s keys.",
      "Test whether a key is *present* with `in`; don't use `get`, which can't tell a missing key from a key holding `None`.",
      "`repr` (or `!r` in an f-string) shows `'12'` with quotes and `12` without, which is exactly the difference a reader needs to see.",
    ],
    explanation: "The two walks give the order the specification asks for and cover all three kinds of difference. Presence is tested with `in`, because `actual.get(key)` returns `None` for a missing key and would hide a missing key whose expected value is `None`. Values are shown with `repr`: printed with `str`, `12` and `'12'` look identical, and that is precisely the bug such a message is meant to reveal (a quantity read from a CSV file is still text).",
    code: {
      starter: src`
def diff_records(expected, actual):
    return []

expected = {"order_id": "O100282", "status": "paid", "total": 35.84}
actual = {"order_id": "O100282", "total": 35.8, "state": "paid"}
for line in diff_records(expected, actual):
    print(line)
`,
      answer: src`
def diff_records(expected, actual):
    problems = []
    for key, value in expected.items():
        if key not in actual:
            problems.append(f"missing key {key!r}")
        elif actual[key] != value:
            problems.append(f"{key!r}: expected {value!r}, got {actual[key]!r}")
    for key in actual:
        if key not in expected:
            problems.append(f"unexpected key {key!r}")
    return problems

expected = {"order_id": "O100282", "status": "paid", "total": 35.84}
actual = {"order_id": "O100282", "total": 35.8, "state": "paid"}
for line in diff_records(expected, actual):
    print(line)
`,
      alternatives: [
        src`
def diff_records(expected, actual):
    lines = []
    for key in expected:
        if key in actual:
            if expected[key] != actual[key]:
                lines.append(repr(key) + ": expected " + repr(expected[key]) + ", got " + repr(actual[key]))
        else:
            lines.append("missing key " + repr(key))
    extra = [key for key in actual if key not in expected]
    for key in extra:
        lines.append("unexpected key " + repr(key))
    return lines
`,
      ],
      wrong: [
        {
          code: src`
def diff_records(expected, actual):
    problems = []
    for key, value in expected.items():
        if key not in actual:
            problems.append(f"missing key {key!r}")
        elif actual[key] != value:
            problems.append(f"{key!r}: expected {value}, got {actual[key]}")
    for key in actual:
        if key not in expected:
            problems.append(f"unexpected key {key!r}")
    return problems
`,
          fails: ["returns"],
          why: "values are shown with `str`, so `expected 12, got 12` hides that one of them is text",
        },
        {
          code: src`
def diff_records(expected, actual):
    problems = []
    for key, value in expected.items():
        if actual.get(key) != value:
            if key in actual:
                problems.append(f"{key!r}: expected {value!r}, got {actual[key]!r}")
            else:
                problems.append(f"missing key {key!r}")
    return problems
`,
          fails: ["returns"],
          why: "extra keys in `actual` are never reported, and `get` hides a missing key whose expected value is None",
        },
      ],
      task: {
        checks: [
          fn("returns", "diff_records", [
            example([{ order_id: "O100282", status: "paid", total: 35.84 }, { order_id: "O100282", total: 35.8, state: "paid" }], ["missing key 'status'", "'total': expected 35.84, got 35.8", "unexpected key 'state'"]),
            example([{ sku: "SPO-11681", qty: 2 }, { sku: "SPO-11681", qty: 2 }], []),
            example([{ customer_id: "C00077" }, { customer_id: "C00078" }], ["'customer_id': expected 'C00077', got 'C00078'"]),
            hiddenCase("two empty records", [{}, {}], []),
            hiddenCase("a number compared with the same digits as text", [{ qty: 12 }, { qty: "12" }], ["'qty': expected 12, got '12'"]),
            hiddenCase("a key whose expected value is None", [{ note: null, id: "O1" }, { id: "O1" }], ["missing key 'note'"]),
            hiddenCase("several extra keys", [{ id: "O1" }, { id: "O1", b: 1, a: 2 }], ["unexpected key 'b'", "unexpected key 'a'"]),
          ], { label: "diff_records() lists every difference in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-10 testing, easy
  {
    id: "PY-Q25-10",
    version: 2,
    slug: "edge-cases-for-chunks",
    title: "Edge cases for splitting into batches",
    format: "testing",
    difficulty: "easy",
    minutes: 15,
    requires: ["arithmetic", "assignment", "class-def", "comparison", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "membership", "raise-stmt", "range-call", "string-index", "string-slice", "test-func", "top-level-indent", "unittest-case", "with-statement"],
    prompt: "An export sends order IDs to a partner in batches. `chunk(items, size)` splits a list into lists of `size` items; the last batch may be shorter. A size below 1 is a `ValueError`, an empty list gives `[]`, and the list passed in must not change. The function is correct. Write `TestChunk` so that broken versions are caught: concentrate on the edges.",
    spec: [
      ["Write", "`class TestChunk(unittest.TestCase)` with test methods"],
      ["Rule", "`chunk([\"O1\", \"O2\", \"O3\", \"O4\", \"O5\"], 2)` → `[[\"O1\", \"O2\"], [\"O3\", \"O4\"], [\"O5\"]]`; `chunk([], 3)` → `[]`; a size of 0 or below raises ValueError"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "List the edges: a total that doesn't divide evenly, an empty list, a size of 0 or a negative size, and the caller's list after the call.",
      "For the input check, keep a reference to the list you pass, call `chunk`, then compare the list with what it was.",
      "A size larger than the whole list is an edge too: what should come back?",
    ],
    explanation: "Batching code typically breaks at the edges: the short final batch is dropped, an empty input produces one empty batch, a negative size silently returns nothing, or the function consumes the caller's list while slicing it. Each of these passes a test with an exact multiple of the batch size, so a useful suite includes a remainder, an empty list, sizes of 0 and below, a size bigger than the list, and a check that the input is unchanged.",
    code: {
      starter: src`
import unittest

def chunk(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]

class TestChunk(unittest.TestCase):
    pass
`,
      answer: src`
import unittest

def chunk(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]

class TestChunk(unittest.TestCase):
    def test_last_batch_is_shorter(self):
        self.assertEqual(chunk(["O1", "O2", "O3", "O4", "O5"], 2), [["O1", "O2"], ["O3", "O4"], ["O5"]])

    def test_size_bigger_than_list(self):
        self.assertEqual(chunk(["O1", "O2"], 10), [["O1", "O2"]])

    def test_empty_list(self):
        self.assertEqual(chunk([], 3), [])

    def test_bad_sizes(self):
        for size in [0, -2]:
            with self.subTest(size=size):
                with self.assertRaises(ValueError):
                    chunk(["O1"], size)

    def test_input_unchanged(self):
        orders = ["O1", "O2", "O3"]
        chunk(orders, 2)
        self.assertEqual(orders, ["O1", "O2", "O3"])
`,
      alternatives: [
        src`
import unittest

def chunk(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]

class TestChunk(unittest.TestCase):
    def setUp(self):
        self.orders = ["O1", "O2", "O3", "O4", "O5", "O6", "O7"]

    def test_batches(self):
        self.assertEqual(chunk(self.orders, 3), [["O1", "O2", "O3"], ["O4", "O5", "O6"], ["O7"]])
        self.assertEqual(len(self.orders), 7)

    def test_edges(self):
        self.assertEqual(chunk([], 1), [])
        self.assertEqual(chunk(["X"], 5), [["X"]])
        self.assertRaises(ValueError, chunk, self.orders, -1)
`,
      ],
      wrong: [
        {
          code: src`
import unittest

def chunk(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]

class TestChunk(unittest.TestCase):
    def test_even_batches(self):
        self.assertEqual(chunk(["O1", "O2", "O3", "O4"], 2), [["O1", "O2"], ["O3", "O4"]])

    def test_zero_size(self):
        with self.assertRaises(ValueError):
            chunk(["O1"], 0)
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "only an exact multiple and a size of 0 are tested: the short last batch, negative sizes, the caller's list and the empty list are never checked",
        },
        {
          code: src`
import unittest

def chunk(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]

class TestChunk(unittest.TestCase):
    def test_last_batch_is_shorter(self):
        self.assertEqual(chunk(["O1", "O2", "O3", "O4", "O5"], 2), [["O1", "O2"], ["O3", "O4"], ["O5"]])

    def test_empty_list(self):
        self.assertEqual(chunk([], 3), [[]])

    def test_bad_size(self):
        with self.assertRaises(ValueError):
            chunk(["O1"], -1)

    def test_input_unchanged(self):
        orders = ["O1", "O2", "O3"]
        chunk(orders, 2)
        self.assertEqual(orders, ["O1", "O2", "O3"])
`,
          fails: ["tests-correct", "tests-4"],
          why: "an empty list has no batches, so expecting `[[]]` fails on the correct function and agrees with a broken one",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "chunk",
          correct: "def chunk(items, size):\n    if size < 1:\n        raise ValueError('size must be at least 1')\n    return [items[i:i + size] for i in range(0, len(items), size)]\n",
          defects: [
            { label: "a version that drops a short last batch", code: "def chunk(items, size):\n    if size < 1:\n        raise ValueError('size must be at least 1')\n    return [items[i:i + size] for i in range(0, len(items) - size + 1, size)]\n" },
            { label: "a version that accepts negative sizes", code: "def chunk(items, size):\n    if size == 0:\n        raise ValueError('size must be at least 1')\n    return [items[i:i + size] for i in range(0, len(items), size)]\n" },
            { label: "a version that empties the caller's list", code: "def chunk(items, size):\n    if size < 1:\n        raise ValueError('size must be at least 1')\n    batches = []\n    while items:\n        batches.append(items[:size])\n        del items[:size]\n    return batches\n" },
            { label: "another broken version", code: "def chunk(items, size):\n    if size < 1:\n        raise ValueError('size must be at least 1')\n    return [items[i:i + size] for i in range(0, max(len(items), 1), size)]\n" },
          ],
        }), "tests", [4]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-12 output prediction, medium
  {
    id: "PY-Q25-12",
    version: 2,
    slug: "what-unittest-counts",
    title: "What unittest counts",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "class-def", "dict-literal", "function-def", "import-module", "len-call", "list-literal", "print-call", "print-several", "string-method", "test-func", "top-level-indent", "unittest-case", "with-statement"],
    prompt: "Type exactly what this program prints: the number of tests run, failures and errors.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Start by counting the methods unittest will actually run.",
      "`KeyError` is a kind of `LookupError`. Is a list ever equal to a tuple?",
      "`assertAlmostEqual` rounds the difference to 7 decimal places before comparing it with zero.",
    ],
    explanation: "Four methods start with `test`; `total_check` is never run, so its impossible assertion doesn't matter. `assertRaises(LookupError)` accepts any subclass, and looking up a missing key raises `KeyError`, which is one. `[2, \"21329\"]` and `(2, \"21329\")` hold the same values but a list never equals a tuple: one failure. `0.1 + 0.2` is 0.30000000000000004, close enough for `assertAlmostEqual`. Nothing crashed, so there are no errors.",
    predict: {
      program: src`
import unittest

class TestChecks(unittest.TestCase):
    def test_lookup(self):
        with self.assertRaises(LookupError):
            {"sku": "21329"}["price"]

    def test_pair(self):
        self.assertEqual([2, "21329"], (2, "21329"))

    def test_sum(self):
        self.assertAlmostEqual(0.1 + 0.2, 0.3)

    def total_check(self):
        self.assertEqual(1, 2)

    def test_upper(self):
        self.assertEqual("o100282".upper(), "O100282")

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestChecks).run(result)
print(result.testsRun, len(result.failures), len(result.errors))
`,
      output: "4 1 0\n",
      wrongPredictions: ["5 2 0", "4 2 0", "4 1 1", "4 0 0"],
    },
  },

  // ------------------------------------------------------------------ PY-Q25-13 testing, medium
  {
    id: "PY-Q25-13",
    version: 2,
    slug: "table-tests-for-durations",
    title: "A table of tests for durations",
    format: "testing",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "class-def", "comparison", "conversion", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "logical", "membership", "precedence", "raise-stmt", "reassignment", "spaces-in-text", "string-format", "string-index", "string-method", "test-func", "top-level-indent", "tuple-unpack", "unittest-case", "with-statement"],
    prompt: "Delivery slots are written like `1h30m`, `45m` or `2h`. `parse_duration(text)` turns one into minutes and is correct. Write `TestParseDuration` with **table-driven** tests (subTest) for the texts it must accept and for the texts it must refuse, so that broken versions are caught.",
    spec: [
      ["Write", "`class TestParseDuration(unittest.TestCase)` with a table of valid texts and a table of invalid ones, each checked under subTest"],
      ["Accepts", "hours and/or minutes, in that order, with optional spaces around the whole text: `\"1h30m\"` → 90, `\"45m\"` → 45, `\"2h\"` → 120, `\"90m\"` → 90, `\" 1h5m \"` → 65"],
      ["Refuses (ValueError)", "an empty text, a number without a unit (`\"30\"`), minutes before hours (`\"30m1h\"`), and 60 or more minutes after hours (`\"1h75m\"`)"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "Make two tables: `(text, minutes)` pairs that must parse, and texts that must raise. Loop over each under `self.subTest(text=text)`.",
      "Cover each shape: hours and minutes, only minutes, only hours, plus spaces around the text.",
      "For the refusals, think about what a lazy parser might accept: a bare number, an impossible number of minutes, an empty text.",
    ],
    explanation: "Parsers have many shapes to get right, which makes a table the natural form of test: one row per shape, each under subTest so a broken version reports every shape it mishandles. The rows that matter most are the ones a careless implementation gets wrong: hours without minutes, a bare number, minutes overflowing an hour, surrounding spaces and the empty text.",
    code: {
      starter: src`
import re
import unittest

def parse_duration(text):
    text = text.strip()
    found = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not text or not found:
        raise ValueError(f"not a duration: {text!r}")
    hours, minutes = found.groups()
    if hours and minutes and int(minutes) >= 60:
        raise ValueError(f"too many minutes: {text!r}")
    return int(hours or 0) * 60 + int(minutes or 0)

class TestParseDuration(unittest.TestCase):
    pass
`,
      answer: src`
import re
import unittest

def parse_duration(text):
    text = text.strip()
    found = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not text or not found:
        raise ValueError(f"not a duration: {text!r}")
    hours, minutes = found.groups()
    if hours and minutes and int(minutes) >= 60:
        raise ValueError(f"too many minutes: {text!r}")
    return int(hours or 0) * 60 + int(minutes or 0)

class TestParseDuration(unittest.TestCase):
    def test_valid(self):
        table = [("1h30m", 90), ("45m", 45), ("2h", 120), ("90m", 90), (" 1h5m ", 65)]
        for text, minutes in table:
            with self.subTest(text=text):
                self.assertEqual(parse_duration(text), minutes)

    def test_refused(self):
        for text in ["", "30", "30m1h", "1h75m"]:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    parse_duration(text)
`,
      alternatives: [
        src`
import re
import unittest

def parse_duration(text):
    text = text.strip()
    found = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not text or not found:
        raise ValueError(f"not a duration: {text!r}")
    hours, minutes = found.groups()
    if hours and minutes and int(minutes) >= 60:
        raise ValueError(f"too many minutes: {text!r}")
    return int(hours or 0) * 60 + int(minutes or 0)

GOOD = {"2h15m": 135, "5m": 5, "3h": 180, "  10m": 10}
BAD = ["", "   ", "15", "2h60m", "m", "5m2h"]

class TestParseDuration(unittest.TestCase):
    def test_good(self):
        for text, expected in GOOD.items():
            with self.subTest(text=text):
                self.assertEqual(parse_duration(text), expected)

    def test_bad(self):
        for text in BAD:
            with self.subTest(text=text):
                self.assertRaises(ValueError, parse_duration, text)
`,
      ],
      wrong: [
        {
          code: src`
import re
import unittest

def parse_duration(text):
    text = text.strip()
    found = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not text or not found:
        raise ValueError(f"not a duration: {text!r}")
    hours, minutes = found.groups()
    if hours and minutes and int(minutes) >= 60:
        raise ValueError(f"too many minutes: {text!r}")
    return int(hours or 0) * 60 + int(minutes or 0)

class TestParseDuration(unittest.TestCase):
    def test_valid(self):
        for text, minutes in [("1h30m", 90), ("45m", 45)]:
            with self.subTest(text=text):
                self.assertEqual(parse_duration(text), minutes)

    def test_refused(self):
        with self.assertRaises(ValueError):
            parse_duration("")
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "only the two most common shapes are tested: hours on their own, impossible minutes, bare numbers and spaces never appear",
        },
        {
          code: src`
import re
import unittest

def parse_duration(text):
    text = text.strip()
    found = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not text or not found:
        raise ValueError(f"not a duration: {text!r}")
    hours, minutes = found.groups()
    if hours and minutes and int(minutes) >= 60:
        raise ValueError(f"too many minutes: {text!r}")
    return int(hours or 0) * 60 + int(minutes or 0)

class TestParseDuration(unittest.TestCase):
    def test_valid(self):
        for text, minutes in [("1h30m", 90), ("2h", 120), ("90m", 90), (" 1h5m ", 65), ("1h75m", 135)]:
            with self.subTest(text=text):
                self.assertEqual(parse_duration(text), minutes)
`,
          fails: ["tests-correct", "tests-3"],
          why: "75 minutes after an hour must be refused, so this row fails on the correct function and agrees with a version that allows it",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "parse_duration",
          correct: "import re\n\ndef parse_duration(text):\n    text = text.strip()\n    found = re.fullmatch(r'(?:(\\d+)h)?(?:(\\d+)m)?', text)\n    if not text or not found:\n        raise ValueError('not a duration')\n    hours, minutes = found.groups()\n    if hours and minutes and int(minutes) >= 60:\n        raise ValueError('too many minutes')\n    return int(hours or 0) * 60 + int(minutes or 0)\n",
          defects: [
            { label: "a version that needs minutes", code: "import re\n\ndef parse_duration(text):\n    found = re.fullmatch(r'(?:(\\d+)h)?(\\d+)m', text.strip())\n    if not found:\n        raise ValueError('not a duration')\n    return int(found.group(1) or 0) * 60 + int(found.group(2))\n" },
            { label: "a version that reads a bare number as minutes", code: "import re\n\ndef parse_duration(text):\n    text = text.strip()\n    found = re.fullmatch(r'(?:(\\d+)h)?(?:(\\d+)m?)?', text)\n    if not text or not found:\n        raise ValueError('not a duration')\n    hours, minutes = found.groups()\n    if hours and minutes and int(minutes) >= 60:\n        raise ValueError('too many minutes')\n    return int(hours or 0) * 60 + int(minutes or 0)\n" },
            { label: "a version that allows 60 or more minutes after hours", code: "import re\n\ndef parse_duration(text):\n    text = text.strip()\n    found = re.fullmatch(r'(?:(\\d+)h)?(?:(\\d+)m)?', text)\n    if not text or not found:\n        raise ValueError('not a duration')\n    hours, minutes = found.groups()\n    return int(hours or 0) * 60 + int(minutes or 0)\n" },
            { label: "another broken version", code: "import re\n\ndef parse_duration(text):\n    found = re.fullmatch(r'(?:(\\d+)h)?(?:(\\d+)m)?', text)\n    if not text or not found:\n        raise ValueError('not a duration')\n    hours, minutes = found.groups()\n    if hours and minutes and int(minutes) >= 60:\n        raise ValueError('too many minutes')\n    return int(hours or 0) * 60 + int(minutes or 0)\n" },
          ],
        }), "tests", [4]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-16 function implementation, medium
  {
    id: "PY-Q25-16",
    version: 2,
    slug: "close-enough-floats",
    title: "Close enough: comparing floats in tests",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "function-def", "function-default", "function-param", "function-return", "if-statement", "logical", "print-call", "print-several", "raise-stmt", "reassignment", "top-level-indent"],
    prompt: "`0.1 + 0.2 == 0.3` is False, so tests of money and measurements need a tolerance. Write `close_enough(a, b, rel_tol=1e-9, abs_tol=0.0)`, following the rule Python's `math.isclose` uses: two numbers are close when their difference is at most `rel_tol` times the **larger** of their sizes, or at most `abs_tol`, whichever allows more. (Don't call `math.isclose`; write the rule.)",
    spec: [
      ["Function", "`close_enough(a, b, rel_tol=1e-9, abs_tol=0.0)`"],
      ["Rule", "`abs(a - b) <= max(rel_tol × max(abs(a), abs(b)), abs_tol)`"],
      ["Raises", "`ValueError` if either tolerance is negative"],
      ["Note", "the rule is symmetric: swapping `a` and `b` never changes the answer"],
    ],
    hiddenKinds: ["two zeros", "the larger value second", "values near zero with an absolute tolerance", "negative numbers", "a negative tolerance"],
    hints: [
      "Check the tolerances first, then compute the difference with `abs`.",
      "The relative allowance is `rel_tol` times the larger of the two absolute values, not the first one.",
      "Allow the difference to be *equal* to the allowance; two equal numbers, even two zeros, are always close.",
    ],
    explanation: "A relative tolerance scales with the numbers (one part in a billion of a million is 0.001), which is right for most measurements, but near zero it shrinks to nothing: no relative tolerance makes `1e-12` close to `0.0`. That is what `abs_tol` is for. Using the larger magnitude makes the rule symmetric, so `close_enough(a, b)` and `close_enough(b, a)` agree; using `a` alone does not. `<=` matters for exact equality, including two zeros, where the allowance itself is 0.",
    code: {
      starter: src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    return a == b

print(close_enough(0.1 + 0.2, 0.3))
print(close_enough(100, 101, rel_tol=0.01))
print(close_enough(0.0, 1e-12, abs_tol=1e-9))
`,
      answer: src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    if rel_tol < 0 or abs_tol < 0:
        raise ValueError("tolerances must not be negative")
    allowed = max(rel_tol * max(abs(a), abs(b)), abs_tol)
    return abs(a - b) <= allowed

print(close_enough(0.1 + 0.2, 0.3))
print(close_enough(100, 101, rel_tol=0.01))
print(close_enough(0.0, 1e-12, abs_tol=1e-9))
`,
      alternatives: [
        src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    if min(rel_tol, abs_tol) < 0:
        raise ValueError("negative tolerance")
    difference = abs(a - b)
    if difference <= abs_tol:
        return True
    size = abs(a) if abs(a) > abs(b) else abs(b)
    return difference <= rel_tol * size
`,
      ],
      wrong: [
        {
          code: src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    if rel_tol < 0 or abs_tol < 0:
        raise ValueError("tolerances must not be negative")
    return abs(a - b) <= max(rel_tol * abs(a), abs_tol)
`,
          fails: ["returns"],
          why: "the allowance uses only `a`, so swapping the two numbers can change the answer",
        },
        {
          code: src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    if rel_tol < 0 or abs_tol < 0:
        raise ValueError("tolerances must not be negative")
    return abs(a - b) < max(rel_tol * max(abs(a), abs(b)), abs_tol)
`,
          fails: ["returns"],
          why: "`<` says two zeros are not close, because the allowance for zero is 0",
        },
        {
          code: src`
def close_enough(a, b, rel_tol=1e-9, abs_tol=0.0):
    return abs(a - b) <= rel_tol * max(abs(a), abs(b))
`,
          fails: ["returns", "negative"],
          why: "`abs_tol` is ignored, so nothing is ever close to zero, and negative tolerances are accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "close_enough", [
            example([0.1 + 0.2, 0.3], true),
            example([100, 101], true, { kwargs: { rel_tol: 0.01 } }),
            example([100, 102], false, { kwargs: { rel_tol: 0.01 } }),
            example([0.0, 1e-12], true, { kwargs: { abs_tol: 1e-9 } }),
            hiddenCase("values near zero without an absolute tolerance", [0.0, 1e-12], false),
            hiddenCase("two zeros", [0.0, 0.0], true),
            hiddenCase("the larger value second", [100, 101.01], true, { kwargs: { rel_tol: 0.01 } }),
            hiddenCase("negative numbers", [-49.995, -50.0], true, { kwargs: { rel_tol: 0.001 } }),
            hiddenCase("an absolute tolerance larger than the relative one", [1000.0, 1000.4], true, { kwargs: { rel_tol: 1e-9, abs_tol: 0.5 } }),
          ], { label: "close_enough() follows the tolerance rule" }),
          fn("negative", "close_enough", [
            raisesCase([1, 1], "ValueError", { kwargs: { rel_tol: -0.1 } }),
            raisesCase([1, 1], "ValueError", { kwargs: { abs_tol: -1 }, label: "a negative absolute tolerance" }),
          ], { label: "close_enough() refuses negative tolerances" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-19 testing, medium
  {
    id: "PY-Q25-19",
    version: 2,
    slug: "test-restock-alerts",
    title: "Test restock alerts with a Mock",
    format: "testing",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "class-def", "comparison", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "membership", "package-import", "reassignment", "string-index", "test-func", "top-level-indent", "unittest-case"],
    prompt: "`restock_alerts(products, threshold, notify)` calls `notify(sku, stock)` once for every product whose stock is **below** the threshold, in order, and returns how many alerts it sent. In production `notify` sends a message to the warehouse team. Write `TestRestockAlerts`, using `Mock` as `notify`, so that broken versions are caught and no real message is ever sent.",
    spec: [
      ["Write", "`class TestRestockAlerts(unittest.TestCase)` using `unittest.mock.Mock` for `notify`"],
      ["Rule", "stock below `threshold` → `notify(sku, stock)`; stock equal to the threshold → no alert; returns the number of alerts"],
      ["Useful", "`mock.call_args_list == [call(\"SPO-11681\", 2), …]` with `from unittest.mock import Mock, call`; `mock.assert_not_called()`"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "Build a small product list in `setUp` with a product below, one exactly at, and one above the threshold.",
      "Compare the mock's `call_args_list` with the exact calls you expect, in order; `call(sku, stock)` builds one expected call.",
      "Check the return value too, and the case where nothing is low.",
    ],
    explanation: "A Mock records every call, so the test can check exactly which alerts would have gone out, with which arguments and in which order, without a real message. The fixture with a product exactly at the threshold separates `<` from `<=`; comparing the whole `call_args_list` catches swapped arguments and a single batched call; and asserting the return value catches a count that doesn't match what was sent.",
    code: {
      starter: src`
import unittest
from unittest.mock import Mock, call

def restock_alerts(products, threshold, notify):
    sent = 0
    for product in products:
        if product["stock"] < threshold:
            notify(product["sku"], product["stock"])
            sent += 1
    return sent

class TestRestockAlerts(unittest.TestCase):
    pass
`,
      answer: src`
import unittest
from unittest.mock import Mock, call

def restock_alerts(products, threshold, notify):
    sent = 0
    for product in products:
        if product["stock"] < threshold:
            notify(product["sku"], product["stock"])
            sent += 1
    return sent

class TestRestockAlerts(unittest.TestCase):
    def setUp(self):
        self.products = [
            {"sku": "SPO-11681", "stock": 2},
            {"sku": "HOM-22847", "stock": 5},
            {"sku": "ELE-24781", "stock": 40},
            {"sku": "TOY-54564", "stock": 0},
        ]
        self.notify = Mock()

    def test_alerts_for_low_stock_only(self):
        sent = restock_alerts(self.products, 5, self.notify)
        self.assertEqual(self.notify.call_args_list, [call("SPO-11681", 2), call("TOY-54564", 0)])
        self.assertEqual(sent, 2)

    def test_nothing_low(self):
        sent = restock_alerts(self.products, 0, self.notify)
        self.notify.assert_not_called()
        self.assertEqual(sent, 0)
`,
      alternatives: [
        src`
import unittest
from unittest.mock import Mock, call

def restock_alerts(products, threshold, notify):
    sent = 0
    for product in products:
        if product["stock"] < threshold:
            notify(product["sku"], product["stock"])
            sent += 1
    return sent

class TestRestockAlerts(unittest.TestCase):
    def test_boundary(self):
        fake = Mock()
        products = [{"sku": "A", "stock": 9}, {"sku": "B", "stock": 10}, {"sku": "C", "stock": 3}]
        self.assertEqual(restock_alerts(products, 10, fake), 2)
        self.assertEqual(fake.call_count, 2)
        fake.assert_has_calls([call("A", 9), call("C", 3)])
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from unittest.mock import Mock, call

def restock_alerts(products, threshold, notify):
    sent = 0
    for product in products:
        if product["stock"] < threshold:
            notify(product["sku"], product["stock"])
            sent += 1
    return sent

class TestRestockAlerts(unittest.TestCase):
    def test_something_sent(self):
        fake = Mock()
        restock_alerts([{"sku": "A", "stock": 1}, {"sku": "B", "stock": 50}], 10, fake)
        self.assertTrue(fake.called)
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "it only checks that `notify` was called at all: not with what, how often, at the boundary, or what was returned",
        },
        {
          code: src`
import unittest
from unittest.mock import Mock, call

def restock_alerts(products, threshold, notify):
    sent = 0
    for product in products:
        if product["stock"] < threshold:
            notify(product["sku"], product["stock"])
            sent += 1
    return sent

class TestRestockAlerts(unittest.TestCase):
    def test_at_threshold(self):
        fake = Mock()
        restock_alerts([{"sku": "A", "stock": 5}], 5, fake)
        fake.assert_called_once_with("A", 5)
`,
          fails: ["tests-1", "tests-correct"],
          why: "stock equal to the threshold must not trigger an alert, so this test fails on the correct function",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "restock_alerts",
          correct: "def restock_alerts(products, threshold, notify):\n    sent = 0\n    for product in products:\n        if product['stock'] < threshold:\n            notify(product['sku'], product['stock'])\n            sent += 1\n    return sent\n",
          defects: [
            { label: "a version that also alerts at the threshold", code: "def restock_alerts(products, threshold, notify):\n    sent = 0\n    for product in products:\n        if product['stock'] <= threshold:\n            notify(product['sku'], product['stock'])\n            sent += 1\n    return sent\n" },
            { label: "a version that swaps the arguments", code: "def restock_alerts(products, threshold, notify):\n    sent = 0\n    for product in products:\n        if product['stock'] < threshold:\n            notify(product['stock'], product['sku'])\n            sent += 1\n    return sent\n" },
            { label: "a version that sends one combined alert", code: "def restock_alerts(products, threshold, notify):\n    low = [p['sku'] for p in products if p['stock'] < threshold]\n    if low:\n        notify(low)\n    return len(low)\n" },
            { label: "another broken version", code: "def restock_alerts(products, threshold, notify):\n    for product in products:\n        if product['stock'] < threshold:\n            notify(product['sku'], product['stock'])\n    return len(products)\n" },
          ],
        }), "tests", [4]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-20 testing, medium
  {
    id: "PY-Q25-20",
    version: 2,
    slug: "edge-cases-top-customers",
    title: "Edge cases for the top customers",
    format: "testing",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "class-def", "comparison", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-sort", "membership", "precedence", "raise-stmt", "sort-key", "string-index", "string-slice", "test-func", "top-level-indent", "unittest-case", "with-statement"],
    prompt: "`top_customers(orders, n)` returns the IDs of the `n` customers who spent the most, highest first; customers with equal spend are listed by ID; asking for more customers than exist returns all of them; `n` of 0 gives `[]`; a negative `n` is a `ValueError`; and the orders list must not change. The function is correct. Write `TestTopCustomers` to catch broken versions.",
    spec: [
      ["Write", "`class TestTopCustomers(unittest.TestCase)`"],
      ["Rule", "spend is the sum of a customer's order totals; ties by `customer_id` ascending"],
      ["Example", "orders C3: 60, C2: 50, C1: 30, C2: 10 → `top_customers(orders, 2)` → `[\"C2\", \"C3\"]` (60 each, tie by ID)"],
    ],
    hiddenKinds: ["another broken version"],
    hints: [
      "Design orders where the answer depends on adding up several orders per customer, and where two customers tie.",
      "Ask for 0 customers, for more customers than exist, and for a negative number.",
      "Keep a copy of the orders and compare after the call, to catch a version that sorts or changes them.",
    ],
    explanation: "Ranking functions fail at the edges more than in the middle: ties resolved by input order instead of the stated rule, counting orders instead of summing spend, reordering the caller's list as a side effect, and `n == 0` (a slice `[:0]` is right, but `[:n or None]` returns everything). Each edge in the suite pins one of those down.",
    code: {
      starter: src`
import unittest

def top_customers(orders, n):
    if n < 0:
        raise ValueError("n must not be negative")
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend, key=lambda customer: (-spend[customer], customer))
    return ranked[:n]

class TestTopCustomers(unittest.TestCase):
    pass
`,
      answer: src`
import unittest

def top_customers(orders, n):
    if n < 0:
        raise ValueError("n must not be negative")
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend, key=lambda customer: (-spend[customer], customer))
    return ranked[:n]

class TestTopCustomers(unittest.TestCase):
    def setUp(self):
        self.orders = [
            {"customer_id": "C3", "total": 60},
            {"customer_id": "C2", "total": 50},
            {"customer_id": "C1", "total": 30},
            {"customer_id": "C2", "total": 10},
            {"customer_id": "C1", "total": 5},
        ]

    def test_spend_is_summed_and_ties_go_by_id(self):
        self.assertEqual(top_customers(self.orders, 2), ["C2", "C3"])

    def test_more_than_exist(self):
        self.assertEqual(top_customers(self.orders, 10), ["C2", "C3", "C1"])

    def test_zero(self):
        self.assertEqual(top_customers(self.orders, 0), [])

    def test_negative(self):
        with self.assertRaises(ValueError):
            top_customers(self.orders, -1)

    def test_orders_unchanged(self):
        before = [dict(order) for order in self.orders]
        top_customers(self.orders, 2)
        self.assertEqual(self.orders, before)
`,
      alternatives: [
        src`
import unittest

def top_customers(orders, n):
    if n < 0:
        raise ValueError("n must not be negative")
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend, key=lambda customer: (-spend[customer], customer))
    return ranked[:n]

class TestTopCustomers(unittest.TestCase):
    def test_cases(self):
        orders = [{"customer_id": "Z9", "total": 10}, {"customer_id": "A1", "total": 4}, {"customer_id": "A1", "total": 6}, {"customer_id": "M5", "total": 3}]
        original = list(orders)
        table = [(1, ["A1"]), (2, ["A1", "Z9"]), (5, ["A1", "Z9", "M5"]), (0, [])]
        for n, expected in table:
            with self.subTest(n=n):
                self.assertEqual(top_customers(orders, n), expected)
        self.assertEqual(orders, original)
        self.assertRaises(ValueError, top_customers, orders, -3)
`,
      ],
      wrong: [
        {
          code: src`
import unittest

def top_customers(orders, n):
    if n < 0:
        raise ValueError("n must not be negative")
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend, key=lambda customer: (-spend[customer], customer))
    return ranked[:n]

class TestTopCustomers(unittest.TestCase):
    def test_top_one(self):
        orders = [{"customer_id": "C1", "total": 80}, {"customer_id": "C2", "total": 20}]
        self.assertEqual(top_customers(orders, 1), ["C1"])
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "one order per customer and no ties: every broken version gets this right",
        },
        {
          code: src`
import unittest

def top_customers(orders, n):
    if n < 0:
        raise ValueError("n must not be negative")
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend, key=lambda customer: (-spend[customer], customer))
    return ranked[:n]

class TestTopCustomers(unittest.TestCase):
    def test_tie(self):
        orders = [{"customer_id": "C9", "total": 5}, {"customer_id": "C1", "total": 5}]
        self.assertEqual(top_customers(orders, 2), ["C9", "C1"])
`,
          fails: ["tests-1", "tests-correct"],
          why: "ties are listed by ID, so C1 comes before C9: the test fails on the correct function and agrees with a version that keeps input order",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "top_customers",
          correct: "def top_customers(orders, n):\n    if n < 0:\n        raise ValueError('n must not be negative')\n    spend = {}\n    for order in orders:\n        spend[order['customer_id']] = spend.get(order['customer_id'], 0) + order['total']\n    ranked = sorted(spend, key=lambda c: (-spend[c], c))\n    return ranked[:n]\n",
          defects: [
            { label: "a version that breaks ties by input order", code: "def top_customers(orders, n):\n    if n < 0:\n        raise ValueError('n must not be negative')\n    spend = {}\n    for order in orders:\n        spend[order['customer_id']] = spend.get(order['customer_id'], 0) + order['total']\n    ranked = sorted(spend, key=lambda c: -spend[c])\n    return ranked[:n]\n" },
            { label: "a version that counts orders instead of adding totals", code: "def top_customers(orders, n):\n    if n < 0:\n        raise ValueError('n must not be negative')\n    count = {}\n    for order in orders:\n        count[order['customer_id']] = count.get(order['customer_id'], 0) + 1\n    ranked = sorted(count, key=lambda c: (-count[c], c))\n    return ranked[:n]\n" },
            { label: "a version that sorts the caller's orders", code: "def top_customers(orders, n):\n    if n < 0:\n        raise ValueError('n must not be negative')\n    orders.sort(key=lambda o: o['customer_id'])\n    spend = {}\n    for order in orders:\n        spend[order['customer_id']] = spend.get(order['customer_id'], 0) + order['total']\n    ranked = sorted(spend, key=lambda c: (-spend[c], c))\n    return ranked[:n]\n" },
            { label: "another broken version", code: "def top_customers(orders, n):\n    if n < 0:\n        raise ValueError('n must not be negative')\n    spend = {}\n    for order in orders:\n        spend[order['customer_id']] = spend.get(order['customer_id'], 0) + order['total']\n    ranked = sorted(spend, key=lambda c: (-spend[c], c))\n    return ranked[:n or None]\n" },
          ],
        }), "tests", [4]),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q25-22 output prediction, hard
  {
    id: "PY-Q25-22",
    version: 2,
    slug: "failures-or-errors",
    title: "Failures or errors?",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["arithmetic", "assignment", "class-def", "comparison", "conversion", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "membership", "none-value", "print-call", "print-several", "raise-stmt", "string-index", "string-method", "string-split", "test-func", "top-level-indent", "unittest-case", "with-statement"],
    prompt: "Type exactly what this program prints. For each test that doesn't pass, it prints the test's name and the type of the error at the end of its report.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Work out which exception each call raises: `int(\"\")`, `int(None)`, `int(\"4.0\")`.",
      "`assertRaises(X)` only catches X (and its subclasses). Any other exception escapes from the test.",
      "An exception escaping from a test is an *error*; only a failed assert method is a *failure*. Tests run in alphabetical order.",
    ],
    explanation: "`int(\"0\")` is 0, and the function raises ValueError for it, so `test_zero` passes. `int(\"\")` raises ValueError, which `assertRaises(TypeError)` doesn't catch: an error. `int(None)` raises TypeError, which `assertRaises(ValueError)` doesn't catch: another error. `int(\" 3 \")` is 3, but `int(\"4.0\")` raises ValueError (int doesn't parse decimal text), so the second assert never gets to compare: a third error. No assert method found a wrong value, so there are no failures.",
    predict: {
      program: src`
import unittest

def parse_qty(text):
    value = int(text)
    if value < 1:
        raise ValueError("quantity must be at least 1")
    return value

class TestParseQty(unittest.TestCase):
    def test_zero(self):
        with self.assertRaises(ValueError):
            parse_qty("0")

    def test_blank(self):
        with self.assertRaises(TypeError):
            parse_qty("")

    def test_none(self):
        with self.assertRaises(ValueError):
            parse_qty(None)

    def test_spaces(self):
        self.assertEqual(parse_qty(" 3 "), 3)
        self.assertEqual(parse_qty("4.0"), 4)

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestParseQty).run(result)
print(result.testsRun, len(result.failures), len(result.errors))
for test, details in result.failures + result.errors:
    print(test.id().split(".")[-1], details.strip().splitlines()[-1].split(":")[0])
`,
      output: "4 0 3\ntest_blank ValueError\ntest_none TypeError\ntest_spaces ValueError\n",
      wrongPredictions: [
        "4 2 1\ntest_blank ValueError\ntest_none TypeError\ntest_spaces ValueError",
        "4 0 2\ntest_blank ValueError\ntest_none TypeError",
        "4 1 2\ntest_spaces AssertionError\ntest_blank ValueError\ntest_none TypeError",
      ],
    },
  },
];
