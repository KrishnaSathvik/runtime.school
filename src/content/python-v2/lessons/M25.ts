/**
 * M25 Testing & Code Quality: five lessons (PY-L25-01 … PY-L25-05).
 *
 * assert and test_ functions (L01); unittest.TestCase with assertEqual, assertAlmostEqual and assertRaises, and the
 * difference between a failure and an error (L02); a table of cases with subTest (L03); setUp fixtures and test
 * doubles, including unittest.mock.Mock (L04); edge cases and checking that a suite catches deliberately broken
 * versions (L05).
 *
 * Everything runs: tests are executed by Python's own unittest machinery (a loader, a suite and a TestResult), and
 * the exercises where the learner writes tests are graded by running those tests against a correct implementation
 * and against defective ones (learnerTests). pytest is not available in the browser; where it matters the text says
 * what pytest would do on a computer, without pretending to run it.
 * Version 2: rewritten from five lessons that asserted double(4) == 8 and printed ok.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, learnerTests, raisesCase, usesSource } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";
import type { PyCheck } from "@/engine/python/grading";

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

/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: PyCheck[], prefix: string, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `${prefix}-${n}`) ? { ...c, hidden: true } : c));

/** The few lines every example uses to run a TestCase and print what happened. */
const RUN = `def run(case):
    result = unittest.TestResult()
    unittest.defaultTestLoader.loadTestsFromTestCase(case).run(result)
    print("ran", result.testsRun, "| failures", len(result.failures), "| errors", len(result.errors))
    for test, details in result.failures + result.errors:
        print("  " + test.id().split(".", 1)[1], "->", details.strip().splitlines()[-1])`;

// ---------------------------------------------------------------- reference implementations for learner-written tests

const loyaltyCorrect = src`
def loyalty_points(total):
    points = int(total)
    if total >= 100:
        points = points * 2
    return points
`;

const feeCorrect = src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee
`;

const reserveCorrect = src`
def reserve(stock, sku, quantity):
    if quantity <= 0:
        raise ValueError("quantity must be at least 1")
    if quantity > stock.get(sku, 0):
        raise ValueError(f"only {stock.get(sku, 0)} of {sku} left")
    updated = dict(stock)
    updated[sku] -= quantity
    return updated
`;

const splitCorrect = src`
def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)
`;

const postageCorrect = src`
def postage(weight_g):
    if weight_g <= 100:
        return 85
    if weight_g <= 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")
`;

const gradeCorrect = src`
def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"
`;

const ordersCorrect = src`
def cancel_order(orders, order_id):
    for order in orders:
        if order["order_id"] == order_id:
            order["status"] = "cancelled"

def open_total(orders):
    total = 0
    for order in orders:
        if order["status"] != "cancelled":
            total += order["total"]
    return total
`;

const receiptCorrect = src`
def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True
`;

const averageCorrect = src`
def average_rating(ratings):
    if not ratings:
        return None
    return sum(ratings) / len(ratings)
`;

const medianCorrect = src`
def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2
`;

export const m25Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L25-01 assert and test functions
  {
    id: "PY-L25-01",
    version: 2,
    slug: "assert-the-result",
    title: "Check results with assert and test functions",
    lede: "A test calls your code with an input whose answer you already know and checks the result. assert does the checking; a test_ function gives each check a name you can run again after every change.",
    focus: "Write test_ functions that call code with known inputs and assert the expected results.",
    minutes: 18,
    objectives: [
      "Use `assert condition, message` to check a result, and read the AssertionError when it fails",
      "Put related checks in `test_` functions so each one has a name and can be run on its own",
      "Know when assert is the wrong tool: checking user input that must always be validated",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comment", "comment-out", "comparison", "conditional-expr", "conversion", "else-clause", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-literal", "list-mutate", "membership", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "unquoted-name"],
    teaches: ["assert-stmt", "test-func"],
    blocks: [
      {
        kind: "text",
        md: "You fix a shipping rule today; next month someone changes the discount code and the shipping rule breaks again without anyone noticing. A **test** prevents that: a small piece of code that calls a function with an input whose correct answer you worked out by hand, and complains if the answer is different. Tests are run again after every change, so a bug that comes back is caught at once.\n\nThe simplest check is the `assert` statement: `assert condition`. If the condition is true nothing happens; if it is false, Python raises `AssertionError` and stops. `assert condition, message` adds a message to the error, which is worth writing: it is the first thing you read when the check fails.",
      },
      {
        kind: "example",
        title: "Three checks on a VAT calculation",
        code: src`
def price_with_vat(net, rate):
    return round(net * (1 + rate), 2)

assert price_with_vat(10.00, 0.20) == 12.0
assert price_with_vat(19.99, 0.20) == 23.99
assert price_with_vat(0, 0.20) == 0
print("3 checks passed")
`,
        output: "3 checks passed\n",
        note: "Each expected value was worked out by hand: 19.99 × 1.2 = 23.988, which rounds to 23.99. The `round` matters: without it the result would be `23.987999999999996` and the exact comparison would fail.",
      },
      {
        kind: "error-example",
        title: "A check that finds a bug",
        code: src`
def shipping_cost(total):
    if total > 50:
        return 0
    return 4.99

assert shipping_cost(20) == 4.99
assert shipping_cost(50) == 0, f"an order of exactly 50 should ship free, got {shipping_cost(50)}"
print("all checks passed")
`,
        error: "AssertionError",
        output: "",
        note: "The rule is *free shipping from 50*. `total > 50` leaves out exactly 50, and the second assert stops the program with `AssertionError: an order of exactly 50 should ship free, got 4.99`. The final print never runs.",
      },
      {
        kind: "text",
        md: "A file of loose asserts stops at the first failure, and the error doesn't say *which* rule broke. The usual shape is a **test function**: a function whose name starts with `test_` and describes one behaviour, containing the asserts for it. A test runner such as pytest (on your own computer: `pytest` in a terminal) finds every `test_` function, runs each one, and reports which passed and which failed, so one failure doesn't hide the others.\n\nThe loop below does what a runner does, so you can see it happen: call each test, and report `AssertionError` as a failure instead of stopping.",
      },
      {
        kind: "example",
        title: "Named tests, run one by one",
        code: src`
def shipping_cost(total):
    if total > 50:
        return 0
    return 4.99

def test_small_order_pays_shipping():
    assert shipping_cost(20) == 4.99

def test_free_from_exactly_50():
    assert shipping_cost(50) == 0, f"got {shipping_cost(50)}"

def test_large_order_ships_free():
    assert shipping_cost(120.5) == 0

for test in [test_small_order_pays_shipping, test_free_from_exactly_50, test_large_order_ships_free]:
    try:
        test()
        print("PASS", test.__name__)
    except AssertionError as err:
        print("FAIL", test.__name__, "-", err)
`,
        output: "PASS test_small_order_pays_shipping\nFAIL test_free_from_exactly_50 - got 4.99\nPASS test_large_order_ships_free\n",
        note: "Functions are values, so they can sit in a list; `test.__name__` is each function's name. The names say which rule is broken before you read any code: the boundary at exactly 50.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every function whose answer you can work out by hand. Check ordinary inputs, and especially the boundaries where rules change (exactly 50 here).\n\n**Mistakes to avoid:**\n- Using `assert` to validate input from users or files. Python run with `-O` skips every assert, so `assert quantity > 0` in production code may silently do nothing. Validate input with `if` and `raise ValueError`; keep assert for tests and for facts about your own code.\n- `assert (total == 12, \"msg\")` with brackets: that asserts a two-item tuple, which is always true, so it can never fail (Python warns about it).\n- Comparing floats exactly when the arithmetic isn't exact: round first, or compare with a tolerance (the next lesson's `assertAlmostEqual`).\n- Tests that can't fail, for example a comparison with no `assert` in front of it.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Check the double-points rule",
      prompt: "`loyalty_points` gives one point per whole pound, and **double** points for orders of 100 or more. The test only checks a small order, so a broken doubling rule would pass. Add asserts to `test_loyalty_points` for the doubling rule, including an order of exactly 100. Check runs your test against the correct function and against broken versions.",
      spec: [
        ["Test", "`test_loyalty_points()` with more asserts"],
        ["Rule", "`loyalty_points(42.75)` is 42; `loyalty_points(100)` is 200; `loyalty_points(150.5)` is 300"],
      ],
      starter: src`
def loyalty_points(total):
    points = int(total)
    if total >= 100:
        points = points * 2
    return points

def test_loyalty_points():
    assert loyalty_points(42.75) == 42

test_loyalty_points()
print("test passed")
`,
      answer: src`
def loyalty_points(total):
    points = int(total)
    if total >= 100:
        points = points * 2
    return points

def test_loyalty_points():
    assert loyalty_points(42.75) == 42
    assert loyalty_points(100) == 200
    assert loyalty_points(150.5) == 300

test_loyalty_points()
print("test passed")
`,
      wrong: [
        {
          code: src`
def loyalty_points(total):
    points = int(total)
    if total >= 100:
        points = points * 2
    return points

def test_loyalty_points():
    assert loyalty_points(42.75) == 42
    assert loyalty_points(150.5) == 300
`,
          fails: ["tests-1"],
          why: "the large order is checked, but not the boundary, so `total > 100` slips through",
        },
      ],
      hints: [
        "Work out a few answers by hand first: what should 100 and 150.5 give?",
        "One assert per input, inside the test function.",
        "The boundary is the input most likely to be wrong, so the order of exactly 100 needs its own assert.",
      ],
      task: {
        checks: learnerTests("tests", {
          target: "loyalty_points",
          correct: loyaltyCorrect,
          defects: [
            { label: "a version that only doubles above 100", code: "def loyalty_points(total):\n    points = int(total)\n    if total > 100:\n        points = points * 2\n    return points\n" },
            { label: "a version that never doubles", code: "def loyalty_points(total):\n    return int(total)\n" },
          ],
        }),
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Tests for a delivery fee",
        prompt: "Write tests for `delivery_fee(total, express)` (it is already written, and correct). Standard delivery costs 3.50, and is free for orders of 40 or more. Express adds 5.00 on top of the standard fee. Write one or more `test_` functions with asserts that would catch a broken version of this rule. Check runs your tests against the correct function and against several broken ones.",
        spec: [
          ["Write", "`test_` functions that call `delivery_fee` and assert results"],
          ["Rule", "standard: 3.50 below 40, 0.00 from 40; express: the standard fee + 5.00"],
          ["Examples", "`delivery_fee(39.99, False)` → 3.5; `delivery_fee(40, True)` → 5.0"],
        ],
        starter: src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee

# Write your test_ functions here.
`,
        answer: src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee

def test_standard_below_threshold():
    assert delivery_fee(39.99, False) == 3.5

def test_standard_free_from_40():
    assert delivery_fee(40, False) == 0
    assert delivery_fee(85.5, False) == 0

def test_express_adds_to_the_standard_fee():
    assert delivery_fee(10, True) == 8.5
    assert delivery_fee(40, True) == 5.0
`,
        alternatives: [
          src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee

def test_fee_table():
    cases = [(12.0, False, 3.5), (40.0, False, 0.0), (40.0, True, 5.0), (39.5, True, 8.5)]
    for total, express, expected in cases:
        assert delivery_fee(total, express) == expected, (total, express)
`,
        ],
        wrong: [
          {
            code: src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee

def test_fees():
    assert delivery_fee(20, False) == 3.5
    assert delivery_fee(60, False) == 0
    assert delivery_fee(60, True) == 5.0
`,
            fails: ["tests-1", "tests-2"],
            why: "no test sits on the boundary of 40, and express is only checked on a free order, where adding and replacing give the same 5.00",
          },
          {
            code: src`
def delivery_fee(total, express):
    fee = 0.0 if total >= 40 else 3.5
    if express:
        fee += 5.0
    return fee

def test_express():
    assert delivery_fee(10, True) == 5.0
`,
            fails: ["tests-2", "tests-correct"],
            why: "the expected value is wrong (express adds 5.00 to the 3.50): the test fails on the correct function and agrees with the version where express replaces the fee",
          },
        ],
        hints: [
          "List the situations the rule distinguishes: below 40, exactly 40, above 40, each with and without express.",
          "A broken version might use `> 40`, or set express to 5.00 instead of adding it, or ignore express. Which input exposes each one?",
          "Express on a small order is where adding and replacing differ: work out that fee by hand.",
        ],
        task: {
          checks: hideDefects(learnerTests("tests", {
            target: "delivery_fee",
            correct: feeCorrect,
            defects: [
              { label: "a version where exactly 40 still pays", code: "def delivery_fee(total, express):\n    fee = 0.0 if total > 40 else 3.5\n    if express:\n        fee += 5.0\n    return fee\n" },
              { label: "a version where express replaces the fee", code: "def delivery_fee(total, express):\n    fee = 0.0 if total >= 40 else 3.5\n    if express:\n        fee = 5.0\n    return fee\n" },
              { label: "another broken version", code: "def delivery_fee(total, express):\n    return 0.0 if total >= 40 else 3.5\n" },
            ],
          }), "tests", [3]),
        },
      },
      {
        id: "c2",
        title: "A runner that tells failures from errors",
        prompt: "Test runners report two kinds of trouble. A **failure** is an `AssertionError`: the code ran and gave a wrong answer. An **error** is any other exception: the test crashed before it could compare anything. Write `run_tests(tests)`: call each test function in order and return one `(name, outcome, detail)` tuple per test.",
        spec: [
          ["Function", "`run_tests(tests)`"],
          ["tests", "a list of test functions that take no arguments"],
          ["Returns", "a list of `(name, outcome, detail)`: `(\"test_x\", \"pass\", \"\")`, `(\"test_x\", \"fail\", <the assertion's message>)` or `(\"test_x\", \"error\", <the exception's type name>)`"],
          ["Rules", "every test runs, even after one fails; a test's name is its `__name__`"],
          ["Example", "a test whose `assert 4.99 == 0, \"got 4.99\"` fails → `(\"test_free_from_50\", \"fail\", \"got 4.99\")`"],
        ],
        starter: src`
def run_tests(tests):
    results = []
    return results

def shipping_cost(total):
    return 0 if total > 50 else 4.99

def test_free_from_50():
    assert shipping_cost(50) == 0, f"got {shipping_cost(50)}"

def test_text_total():
    assert shipping_cost("20") == 4.99

def test_small_order():
    assert shipping_cost(20) == 4.99

for result in run_tests([test_free_from_50, test_text_total, test_small_order]):
    print(result)
`,
        answer: src`
def run_tests(tests):
    results = []
    for test in tests:
        try:
            test()
        except AssertionError as err:
            results.append((test.__name__, "fail", str(err)))
        except Exception as err:
            results.append((test.__name__, "error", type(err).__name__))
        else:
            results.append((test.__name__, "pass", ""))
    return results

def shipping_cost(total):
    return 0 if total > 50 else 4.99

def test_free_from_50():
    assert shipping_cost(50) == 0, f"got {shipping_cost(50)}"

def test_text_total():
    assert shipping_cost("20") == 4.99

def test_small_order():
    assert shipping_cost(20) == 4.99

for result in run_tests([test_free_from_50, test_text_total, test_small_order]):
    print(result)
`,
        alternatives: [
          src`
def run_one(test):
    try:
        test()
    except AssertionError as err:
        return "fail", str(err)
    except Exception as err:
        return "error", type(err).__name__
    return "pass", ""

def run_tests(tests):
    report = []
    for test in tests:
        outcome, detail = run_one(test)
        report.append((test.__name__, outcome, detail))
    return report
`,
        ],
        wrong: [
          {
            code: src`
def run_tests(tests):
    results = []
    for test in tests:
        try:
            test()
            results.append((test.__name__, "pass", ""))
        except Exception as err:
            results.append((test.__name__, "error", type(err).__name__))
        except AssertionError as err:
            results.append((test.__name__, "fail", str(err)))
    return results
`,
            fails: ["returns", "mixed"],
            why: "AssertionError is a kind of Exception, so the first `except` catches failures too and reports them as errors",
          },
          {
            code: src`
def run_tests(tests):
    results = []
    try:
        for test in tests:
            test()
            results.append((test.__name__, "pass", ""))
    except AssertionError as err:
        results.append(("?", "fail", str(err)))
    return results
`,
            fails: ["mixed", "returns"],
            why: "the `try` wraps the whole loop, so the first failure ends the run and the remaining tests never execute",
          },
        ],
        hints: [
          "The `try` has to be inside the loop, so that one test's exception doesn't stop the others.",
          "Order the `except` clauses from the most specific to the most general: AssertionError is itself an Exception.",
          "`str(err)` is the assertion's message; `type(err).__name__` names any other error. `else:` after the excepts runs only when the test raised nothing.",
        ],
        task: {
          checks: [
            expr("returns", "One failure, one error and one pass", "def _cost(total):\n    return 0 if total > 50 else 4.99\ndef test_free_from_50():\n    assert _cost(50) == 0, f'got {_cost(50)}'\ndef test_text_total():\n    assert _cost('20') == 4.99\ndef test_small_order():\n    assert _cost(20) == 4.99\nresult = run_tests([test_free_from_50, test_text_total, test_small_order])", [py.tuple(py.str("test_free_from_50"), py.str("fail"), py.str("got 4.99")), py.tuple(py.str("test_text_total"), py.str("error"), py.str("TypeError")), py.tuple(py.str("test_small_order"), py.str("pass"), py.str(""))], { show: "run_tests([test_free_from_50, test_text_total, test_small_order])" }),
            expr("mixed", "A failure with no message, then an error", "def test_a():\n    assert 1 + 1 == 3\ndef test_b():\n    {}['missing']\nresult = run_tests([test_a, test_b])", [py.tuple(py.str("test_a"), py.str("fail"), py.str("")), py.tuple(py.str("test_b"), py.str("error"), py.str("KeyError"))], { hidden: true }),
            expr("all-pass", "Every test passes", "def test_one():\n    assert True\ndef test_two():\n    assert 'a' in 'cat'\nresult = run_tests([test_one, test_two])", [py.tuple(py.str("test_one"), py.str("pass"), py.str("")), py.tuple(py.str("test_two"), py.str("pass"), py.str(""))], { hidden: true }),
            expr("empty", "No tests", "result = run_tests([])", [], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def discount(total):
    return total * 0.1 if total >= 100 else 0

checks = 0
for total, expected in [(150, 15), (99, 0), (100, 10)]:
    try:
        assert discount(total) == expected, total
        checks += 1
    except AssertionError as err:
        print("failed for", err)
print(checks, "passed")
`,
        choices: ["3 passed", "failed for 100\n2 passed", "failed for 99\n2 passed", "failed for 150\n2 passed"],
        answer: 0,
        why: "150 × 0.1 is 15.0, which equals 15; 99 is below 100 so the discount is 0; 100 qualifies and gives 10.0. All three asserts hold.",
      },
      {
        id: "q2",
        prompt: "A common mistake: this test has brackets around the condition and message. What does it print?",
        program: src`
def shipping_cost(total):
    return 4.99

def test_free_shipping():
    assert (shipping_cost(80) == 0, "orders over 50 ship free")

test_free_shipping()
print("passed?")
`,
        choices: ["passed?", "AssertionError: orders over 50 ship free", "(nothing)", "False"],
        answer: 0,
        why: "With brackets, `assert` checks one value: a two-item tuple. A non-empty tuple is always true, so this test can never fail, even though the function is wrong. Python prints a SyntaxWarning about it to the error stream. Write `assert condition, message` without brackets.",
      },
      {
        id: "q3",
        prompt: "A web form sends a quantity, and the order must never be created with a quantity below 1. Where does `assert quantity >= 1` belong?",
        choices: [
          "In a test of the order code, not as the check in the code itself: there, use `if` and `raise ValueError`",
          "As the only check in the order code, because it stops the program",
          "Nowhere: asserts are only for floats",
          "In the form's HTML",
        ],
        answer: 0,
        why: "Running Python with `-O` removes asserts, so a validation that must always happen can't rely on one. Asserts are for tests and for facts about your own code.",
      },
    ],
    review: [
      "A test calls code with an input whose answer you worked out by hand and asserts the result.",
      "`assert condition, message` raises AssertionError with your message when the condition is false.",
      "`test_` functions give every check a name; a runner runs them all and reports each failure separately.",
      "Validate real input with `raise`, not assert. Next: Python's built-in test framework, unittest.",
    ],
  },

  // ------------------------------------------------------------------ PY-L25-02 unittest
  {
    id: "PY-L25-02",
    version: 2,
    slug: "a-test-function",
    title: "unittest: test cases and a test run",
    lede: "unittest is the testing framework in Python's standard library. Tests are methods of a TestCase class, its assert methods explain every failure, and a run tells failures from errors.",
    focus: "Write a unittest.TestCase with assertEqual, assertAlmostEqual and assertRaises, run it, and read the result.",
    minutes: 20,
    objectives: [
      "Write test methods in a `unittest.TestCase` and check results with `assertEqual`, `assertAlmostEqual` and `assertIn`",
      "Test that code raises the right exception with `with self.assertRaises(...)`",
      "Run a TestCase and tell a failure (a wrong answer) from an error (a crash)",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "class-def", "comparison", "continue-statement", "conversion", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "module-file", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "string-format", "string-index", "string-method", "string-split", "test-func", "top-level-indent", "truthiness", "tuple-unpack", "unicode-text", "with-statement"],
    teaches: ["unittest-case"],
    blocks: [
      {
        kind: "text",
        md: "`unittest` comes with Python, so it works everywhere Python does. Its tests live in a **TestCase**: a class (you'll write your own classes in the Classes & Objects module) whose methods are the tests. Each test method's name must start with `test`, and it takes one parameter, `self`, which is the running test. Through `self` you call the checking methods:\n\n- `self.assertEqual(actual, expected)`: on failure it shows **both** values, so you don't need to write a message;\n- `self.assertAlmostEqual(a, b)`: equal to 7 decimal places, for floats;\n- `self.assertIn(item, collection)`, `self.assertTrue(x)`, `self.assertIsNone(x)`;\n- `with self.assertRaises(ValueError):` followed by an indented call: the test passes only if that call raises ValueError.\n\nOn a computer you run a test file with `python -m unittest -v` in a terminal. On this page, the small `run` function at the bottom of each example does the same with unittest's own loader and result object, and prints a summary.",
      },
      {
        kind: "example",
        title: "Four tests of a price parser",
        code: src`
import unittest

def parse_price(text):
    price = float(text.strip().replace("£", ""))
    if price < 0:
        raise ValueError(f"negative price: {text!r}")
    return price

class TestParsePrice(unittest.TestCase):
    def test_pound_sign(self):
        self.assertEqual(parse_price("£4.99"), 4.99)

    def test_spaces_around(self):
        self.assertEqual(parse_price("  12 "), 12.0)

    def test_negative_is_refused(self):
        with self.assertRaises(ValueError):
            parse_price("-3.50")

    def test_not_a_number(self):
        with self.assertRaises(ValueError):
            parse_price("free")

${RUN}

run(TestParsePrice)
`,
        output: "ran 4 | failures 0 | errors 0\n",
        note: "`test_not_a_number` passes because `float(\"free\")` raises ValueError inside the `with` block. If `parse_price(\"free\")` had returned a value instead, the test would fail with `AssertionError: ValueError not raised`.",
      },
      {
        kind: "text",
        md: "A test can go wrong in two ways, and unittest reports them separately. A **failure** means an assert method found a wrong answer. An **error** means an exception escaped from the test before it could compare: a bug in the code under test, or in the test itself.",
      },
      {
        kind: "example",
        title: "A failure and an error",
        code: src`
import unittest

def order_total(lines):
    total = 0
    for line in lines:
        total += line["unit_price"]
    return total

class TestOrderTotal(unittest.TestCase):
    def test_quantities_multiply(self):
        lines = [{"unit_price": 2.5, "quantity": 4}, {"unit_price": 10.0, "quantity": 1}]
        self.assertAlmostEqual(order_total(lines), 20.0)

    def test_empty_order(self):
        self.assertEqual(order_total([]), 0)

    def test_price_sent_as_text(self):
        lines = [{"unit_price": "2.50", "quantity": 1}]
        self.assertEqual(order_total(lines), 2.5)

${RUN}

run(TestOrderTotal)
`,
        output: "ran 3 | failures 1 | errors 1\n  TestOrderTotal.test_quantities_multiply -> AssertionError: 12.5 != 20.0 within 7 places (7.5 difference)\n  TestOrderTotal.test_price_sent_as_text -> TypeError: unsupported operand type(s) for +=: 'int' and 'str'\n",
        note: "The failure shows both numbers: 12.5 is 2.5 + 10.0, so the quantities were ignored. The error is a crash: the feed sends prices as text, a case the function doesn't handle yet. `assertAlmostEqual` is used for the float total because sums like 0.1 + 0.2 aren't exact.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever you want tests that run anywhere without installing anything, or when a project already uses unittest. (pytest, which many projects install, runs unittest TestCases too, and also plain `test_` functions with `assert`.)\n\n**Mistakes to avoid:**\n- A method whose name doesn't start with `test` is silently skipped: it never runs, so it never fails.\n- `self.assertTrue(total == 20)` reports only `False is not true`; `assertEqual(total, 20)` reports both values.\n- `assertRaises` without `with`: `self.assertRaises(ValueError, parse_price(\"x\"))` calls `parse_price` *before* assertRaises can catch anything, so the test errors. Use the `with` form.\n- `assertEqual` on floats from arithmetic: use `assertAlmostEqual`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Test the refusal",
      prompt: "`reserve(stock, sku, quantity)` returns a new stock dictionary with the quantity taken off, and must refuse to reserve more than is in stock. The TestCase only checks a normal reservation. Add a test method that asserts `reserve` raises ValueError when asked for more than is available.",
      spec: [
        ["Add", "a `test_…` method in `TestReserve` that uses `with self.assertRaises(ValueError):`"],
        ["Rule", "`reserve({\"21329\": 3}, \"21329\", 5)` must raise ValueError"],
      ],
      starter: src`
import unittest

def reserve(stock, sku, quantity):
    if quantity <= 0:
        raise ValueError("quantity must be at least 1")
    if quantity > stock.get(sku, 0):
        raise ValueError(f"only {stock.get(sku, 0)} of {sku} left")
    updated = dict(stock)
    updated[sku] -= quantity
    return updated

class TestReserve(unittest.TestCase):
    def test_takes_quantity_off(self):
        self.assertEqual(reserve({"21329": 3}, "21329", 2), {"21329": 1})
`,
      answer: src`
import unittest

def reserve(stock, sku, quantity):
    if quantity <= 0:
        raise ValueError("quantity must be at least 1")
    if quantity > stock.get(sku, 0):
        raise ValueError(f"only {stock.get(sku, 0)} of {sku} left")
    updated = dict(stock)
    updated[sku] -= quantity
    return updated

class TestReserve(unittest.TestCase):
    def test_takes_quantity_off(self):
        self.assertEqual(reserve({"21329": 3}, "21329", 2), {"21329": 1})

    def test_refuses_more_than_stock(self):
        with self.assertRaises(ValueError):
            reserve({"21329": 3}, "21329", 5)
`,
      wrong: [
        {
          code: src`
import unittest

def reserve(stock, sku, quantity):
    if quantity <= 0:
        raise ValueError("quantity must be at least 1")
    if quantity > stock.get(sku, 0):
        raise ValueError(f"only {stock.get(sku, 0)} of {sku} left")
    updated = dict(stock)
    updated[sku] -= quantity
    return updated

class TestReserve(unittest.TestCase):
    def test_takes_quantity_off(self):
        self.assertEqual(reserve({"21329": 3}, "21329", 2), {"21329": 1})

    def check_refuses_more_than_stock(self):
        with self.assertRaises(ValueError):
            reserve({"21329": 3}, "21329", 5)
`,
          fails: ["tests-1"],
          why: "the method's name doesn't start with `test`, so unittest never runs it",
        },
      ],
      hints: [
        "A new method inside the class, with `self` as its only parameter and a name starting with `test`.",
        "The call that should fail goes inside a `with` block that uses `self.assertRaises` and names the error you expect.",
        "Ask for 5 when the stock dictionary holds 3.",
      ],
      task: {
        checks: learnerTests("tests", {
          target: "reserve",
          correct: reserveCorrect,
          defects: [
            { label: "a version that lets stock go below zero", code: "def reserve(stock, sku, quantity):\n    if quantity <= 0:\n        raise ValueError('quantity must be at least 1')\n    updated = dict(stock)\n    updated[sku] = updated.get(sku, 0) - quantity\n    return updated\n" },
          ],
        }),
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Tests for splitting a bill",
        prompt: "`split_bill(total_cents, people)` shares a bill in whole cents: everyone pays the same, and any leftover cents go one each to the first people, so the shares add up to the total exactly. Fewer than one person is a `ValueError`. Write a TestCase, `TestSplitBill`, whose tests would catch a broken version.",
        spec: [
          ["Write", "`class TestSplitBill(unittest.TestCase)` with test methods"],
          ["Rule", "`split_bill(1000, 3)` → `[334, 333, 333]`; `split_bill(900, 3)` → `[300, 300, 300]`; `split_bill(500, 0)` raises ValueError"],
          ["Must hold", "the shares always add up to `total_cents`"],
        ],
        starter: src`
import unittest

def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)

class TestSplitBill(unittest.TestCase):
    pass
`,
        answer: src`
import unittest

def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)

class TestSplitBill(unittest.TestCase):
    def test_even_split(self):
        self.assertEqual(split_bill(900, 3), [300, 300, 300])

    def test_leftover_cents_go_to_the_first_people(self):
        self.assertEqual(split_bill(1000, 3), [334, 333, 333])

    def test_shares_add_up(self):
        self.assertEqual(sum(split_bill(1001, 4)), 1001)

    def test_nobody_to_pay(self):
        with self.assertRaises(ValueError):
            split_bill(500, 0)
`,
        alternatives: [
          src`
import unittest

def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)

class TestSplitBill(unittest.TestCase):
    def test_examples(self):
        self.assertEqual(split_bill(1000, 3), [334, 333, 333])
        self.assertEqual(split_bill(7, 1), [7])

    def test_zero_people(self):
        self.assertRaises(ValueError, split_bill, 500, 0)
`,
        ],
        wrong: [
          {
            code: src`
import unittest

def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)

class TestSplitBill(unittest.TestCase):
    def test_even_split(self):
        self.assertEqual(split_bill(900, 3), [300, 300, 300])

    def test_nobody_to_pay(self):
        with self.assertRaises(ValueError):
            split_bill(500, 0)
`,
            fails: ["tests-1", "tests-2"],
            why: "only a total that divides evenly is tested, so losing or misplacing the leftover cents goes unnoticed",
          },
          {
            code: src`
import unittest

def split_bill(total_cents, people):
    if people < 1:
        raise ValueError("at least one person must pay")
    share, extra = divmod(total_cents, people)
    return [share + 1] * extra + [share] * (people - extra)

class TestSplitBill(unittest.TestCase):
    def test_leftover(self):
        self.assertEqual(split_bill(1000, 3), [333, 333, 334])
`,
            fails: ["tests-2", "tests-correct"],
            why: "the expected list puts the extra cent last, which isn't the rule: the test fails on the correct function and passes the broken one that does exactly that",
          },
        ],
        hints: [
          "Pick totals that divide evenly and totals that don't; work out the lists by hand.",
          "A test can assert a property instead of a whole list: whatever the split, `sum` of the shares must equal the total.",
          "Zero people must raise ValueError, not some other error: `assertRaises(ValueError)` checks the type.",
        ],
        task: {
          checks: hideDefects(learnerTests("tests", {
            target: "split_bill",
            correct: splitCorrect,
            defects: [
              { label: "a version that loses the leftover cents", code: "def split_bill(total_cents, people):\n    if people < 1:\n        raise ValueError('at least one person must pay')\n    return [total_cents // people] * people\n" },
              { label: "a version that gives the extra cents to the last people", code: "def split_bill(total_cents, people):\n    if people < 1:\n        raise ValueError('at least one person must pay')\n    share, extra = divmod(total_cents, people)\n    return [share] * (people - extra) + [share + 1] * extra\n" },
              { label: "another broken version", code: "def split_bill(total_cents, people):\n    share, extra = divmod(total_cents, people)\n    return [share + 1] * extra + [share] * (people - extra)\n" },
            ],
          }), "tests", [3]),
        },
      },
      {
        id: "c2",
        title: "Read a verbose test report",
        prompt: "`python -m unittest -v` prints one line per test, like `test_spaces (test_prices.TestParse.test_spaces) ... FAIL`, followed by a detailed section for every failure and error. A CI dashboard needs the outcomes as data. Write `test_outcomes(report)`: return a dictionary from each outcome to the list of tests that had it.",
        spec: [
          ["Function", "`test_outcomes(report)`"],
          ["Result line", "`<method> (<module>.<Class>.<method>) ... <outcome>`, where outcome is `ok`, `FAIL`, `ERROR`, or `skipped '<reason>'`"],
          ["Returns", "`{\"ok\": […], \"FAIL\": […], \"ERROR\": […], \"skipped\": […]}`, always with all four keys; each test is named `\"Class.method\"`, in report order"],
          ["Ignore", "every other line, including the `ERROR: test_text (...)` headings of the detail section"],
          ["Example", "the starter's report → `{'ok': ['TestParse.test_pound', 'TestTotals.test_empty'], 'FAIL': ['TestParse.test_spaces'], 'ERROR': ['TestParse.test_text'], 'skipped': ['TestParse.test_rates']}`"],
        ],
        starter: src`
def test_outcomes(report):
    return {}

report = """test_pound (test_prices.TestParse.test_pound) ... ok
test_rates (test_prices.TestParse.test_rates) ... skipped 'needs the live rates service'
test_spaces (test_prices.TestParse.test_spaces) ... FAIL
test_text (test_prices.TestParse.test_text) ... ERROR
test_empty (test_prices.TestTotals.test_empty) ... ok

======================================================================
ERROR: test_text (test_prices.TestParse.test_text)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_prices.py", line 8, in test_text
    int("x")
ValueError: invalid literal for int() with base 10: 'x'
"""
print(test_outcomes(report))
`,
        answer: src`
def test_outcomes(report):
    outcomes = {"ok": [], "FAIL": [], "ERROR": [], "skipped": []}
    for line in report.splitlines():
        if " ... " not in line:
            continue
        test, result = line.split(" ... ", 1)
        if "(" not in test:
            continue
        dotted = test.split("(")[1].rstrip(")")
        parts = dotted.split(".")
        name = parts[-2] + "." + parts[-1]
        status = result.split(" ")[0]
        if status in outcomes:
            outcomes[status].append(name)
    return outcomes

report = """test_pound (test_prices.TestParse.test_pound) ... ok
test_rates (test_prices.TestParse.test_rates) ... skipped 'needs the live rates service'
test_spaces (test_prices.TestParse.test_spaces) ... FAIL
test_text (test_prices.TestParse.test_text) ... ERROR
test_empty (test_prices.TestTotals.test_empty) ... ok

======================================================================
ERROR: test_text (test_prices.TestParse.test_text)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "test_prices.py", line 8, in test_text
    int("x")
ValueError: invalid literal for int() with base 10: 'x'
"""
print(test_outcomes(report))
`,
        alternatives: [
          src`
import re

def test_outcomes(report):
    found = {"ok": [], "FAIL": [], "ERROR": [], "skipped": []}
    for line in report.splitlines():
        result = re.fullmatch(r"\S+ \((?:[\w.]+\.)?(\w+\.\w+)\) \.\.\. (ok|FAIL|ERROR|skipped)\b.*", line.strip())
        if result:
            found[result.group(2)].append(result.group(1))
    return found
`,
        ],
        wrong: [
          {
            code: src`
def test_outcomes(report):
    outcomes = {"ok": [], "FAIL": [], "ERROR": [], "skipped": []}
    for line in report.splitlines():
        for status in outcomes:
            if status in line and "(" in line:
                dotted = line.split("(")[1].split(")")[0]
                parts = dotted.split(".")
                outcomes[status].append(parts[-2] + "." + parts[-1])
    return outcomes
`,
            fails: ["returns"],
            why: "searching the whole line for the word also counts the `ERROR: test_text (...)` heading of the detail section, so that test is listed twice",
          },
          {
            code: src`
def test_outcomes(report):
    outcomes = {"ok": [], "FAIL": [], "ERROR": [], "skipped": []}
    for line in report.splitlines():
        if " ... " in line:
            test, result = line.split(" ... ", 1)
            if result in outcomes:
                outcomes[result].append(test.split(" ")[0])
    return outcomes
`,
            fails: ["returns", "modules"],
            why: "skipped lines carry a reason after the word, so they never match, and the names lose their class",
          },
        ],
        hints: [
          "Only result lines contain ` ... `; everything else can be skipped.",
          "Split a result line at ` ... `: the left part holds the dotted name in brackets, the right part starts with the outcome word.",
          "The class and method are the last two dotted parts, whatever the module path looks like. A skipped line's outcome is only its first word.",
        ],
        task: {
          checks: [
            fn("returns", "test_outcomes", [
              example(["test_pound (test_prices.TestParse.test_pound) ... ok\ntest_rates (test_prices.TestParse.test_rates) ... skipped 'needs the live rates service'\ntest_spaces (test_prices.TestParse.test_spaces) ... FAIL\ntest_text (test_prices.TestParse.test_text) ... ERROR\ntest_empty (test_prices.TestTotals.test_empty) ... ok\n\n======================================================================\nERROR: test_text (test_prices.TestParse.test_text)\n----------------------------------------------------------------------\nTraceback (most recent call last):\n  File \"test_prices.py\", line 8, in test_text\n    int(\"x\")\nValueError: invalid literal for int() with base 10: 'x'\n"], { ok: ["TestParse.test_pound", "TestTotals.test_empty"], FAIL: ["TestParse.test_spaces"], ERROR: ["TestParse.test_text"], skipped: ["TestParse.test_rates"] }),
              hiddenCase("a run where everything passed", ["test_a (t.T.test_a) ... ok\ntest_b (t.T.test_b) ... ok\n\n----------------------------------------------------------------------\nRan 2 tests in 0.001s\n\nOK\n"], { ok: ["T.test_a", "T.test_b"], FAIL: [], ERROR: [], skipped: [] }),
              hiddenCase("an empty report", [""], { ok: [], FAIL: [], ERROR: [], skipped: [] }),
            ], { label: "test_outcomes() groups the tests by outcome" }),
            fn("modules", "test_outcomes", [
              hiddenCase("tests in a package's module", ["test_load (shop.tests.test_import.TestLoad.test_load) ... FAIL\ntest_main (__main__.TestMain.test_main) ... skipped 'slow'\n"], { ok: [], FAIL: ["TestLoad.test_load"], ERROR: [], skipped: ["TestMain.test_main"] }),
            ], { label: "test_outcomes() names tests by class and method, whatever the module" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import unittest

class TestNames(unittest.TestCase):
    def test_upper(self):
        self.assertEqual("nora".upper(), "NORA")

    def check_title(self):
        self.assertEqual("nora".title(), "NOPE")

    def test_in(self):
        self.assertIn("a", "jamal")

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestNames).run(result)
print(result.testsRun, len(result.failures))
`,
        choices: ["2 0", "3 1", "3 0", "2 1"],
        answer: 0,
        why: "Only methods whose names start with `test` are collected, so `check_title` never runs and its wrong expectation is never noticed. Two tests ran and both passed.",
      },
      {
        id: "q2",
        prompt: "A common mistake: assertRaises without `with`. What does this print?",
        program: src`
import unittest

def parse_quantity(text):
    return int(text)

class TestQuantity(unittest.TestCase):
    def test_letters_refused(self):
        self.assertRaises(ValueError, parse_quantity("six"))

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestQuantity).run(result)
print(len(result.failures), len(result.errors))
`,
        choices: ["0 1", "0 0", "1 0", "1 1"],
        answer: 0,
        why: "`parse_quantity(\"six\")` is called first, to compute the argument, and its ValueError escapes before assertRaises can catch anything: the test is an error. Either use `with self.assertRaises(ValueError):` or pass the function and its argument separately: `self.assertRaises(ValueError, parse_quantity, \"six\")`.",
      },
      {
        id: "q3",
        prompt: "A test run reports an **error** (not a failure) for `test_import_orders`. What does that tell you?",
        choices: [
          "An exception other than an assertion escaped from the test before it could compare anything",
          "An assertEqual found two different values",
          "The test method's name doesn't start with test",
          "The test was skipped",
        ],
        answer: 0,
        why: "Failures come from assert methods finding a wrong value; errors are crashes, in the code under test or in the test itself. Both need fixing, but you investigate them differently.",
      },
    ],
    review: [
      "A `unittest.TestCase` holds test methods named `test…`, each taking `self`.",
      "`assertEqual` shows both values on failure; `assertAlmostEqual` for floats; `with self.assertRaises(E):` for expected errors.",
      "A failure is a wrong answer; an error is a crash. Methods not named `test…` never run.",
      "Next: one test that checks a whole table of inputs, and reports every case that fails.",
    ],
  },

  // ------------------------------------------------------------------ PY-L25-03 a table of cases
  {
    id: "PY-L25-03",
    version: 2,
    slug: "one-check-many-inputs",
    title: "One test, a table of cases",
    lede: "Many inputs, one rule: put the inputs and expected results in a table and loop over it. subTest makes unittest report every failing row instead of stopping at the first.",
    focus: "Test a function against a table of (input, expected) cases with subTest, so every failing case is reported.",
    minutes: 18,
    objectives: [
      "Write a table of input and expected-result pairs and check them in one loop",
      "Use `self.subTest(...)` so each failing case is reported with its own values",
      "Choose the rows of a table to cover each band and each boundary of a rule",
    ],
    requires: ["arithmetic", "assert-stmt", "assignment", "class-def", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-iterate", "dict-literal", "enumerate-call", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "newline-escape", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "string-check", "string-format", "string-index", "string-method", "string-split", "test-func", "top-level-indent", "try-except", "tuple-unpack", "unittest-case", "value-count", "with-statement"],
    teaches: ["case-pairs"],
    blocks: [
      {
        kind: "text",
        md: "Postage depends on weight bands: up to 100 g costs 85p, up to 250 g costs 135p, up to 750 g costs 210p, and heavier letters aren't accepted. Testing that rule needs many inputs: one inside each band and one on each boundary. Writing a test method for each is repetitive. A **table** is clearer: a list of `(input, expected)` pairs, checked in one loop. Adding a case means adding a row.\n\nA plain loop has a weakness: the first failing assert stops the test, so you see one wrong row even if three are wrong.",
      },
      {
        kind: "example",
        title: "A table in a plain loop",
        code: src`
def postage(weight_g):
    if weight_g < 100:
        return 85
    if weight_g < 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")

CASES = [(20, 85), (100, 85), (101, 135), (250, 135), (750, 210)]

def test_price_table():
    for weight, pence in CASES:
        assert postage(weight) == pence, f"{weight} g: expected {pence}, got {postage(weight)}"

try:
    test_price_table()
    print("PASS")
except AssertionError as err:
    print("FAIL", err)
`,
        output: "FAIL 100 g: expected 85, got 135\n",
        note: "The 100 g row fails and the loop stops there. The 250 g row is wrong too, but you won't find out until the first bug is fixed.",
      },
      {
        kind: "text",
        md: "unittest's `with self.subTest(name=value):` marks one pass of the loop as a **sub-test**. A failure inside it is reported with the values you passed, and the loop carries on with the next row. pytest's equivalent is `@pytest.mark.parametrize`, which turns each row into its own test.",
      },
      {
        kind: "example",
        title: "The same table with subTest",
        code: src`
import unittest

def postage(weight_g):
    if weight_g < 100:
        return 85
    if weight_g < 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")

CASES = [(20, 85), (100, 85), (101, 135), (250, 135), (750, 210)]

class TestPostage(unittest.TestCase):
    def test_price_table(self):
        for weight, pence in CASES:
            with self.subTest(weight=weight):
                self.assertEqual(postage(weight), pence)

    def test_too_heavy(self):
        with self.assertRaises(ValueError):
            postage(751)

${RUN}

run(TestPostage)
`,
        output: "ran 2 | failures 2 | errors 0\n  TestPostage.test_price_table (weight=100) -> AssertionError: 135 != 85\n  TestPostage.test_price_table (weight=250) -> AssertionError: 210 != 135\n",
        note: "Two test methods ran, but the table produced two separate failures, each labelled with its weight. Both point at the same mistake: `<` where the rule says *up to and including*.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever one rule should hold for many inputs: price bands, validation rules, parsing formats. Choose rows deliberately: one inside each band, and both sides of every boundary (100 and 101, 250 and 251).\n\n**Mistakes to avoid:** a table with only comfortable values in the middle of each band (it can't catch `<` versus `<=`); putting the `assert` outside the `with self.subTest(...)` block (the failure isn't attached to the row); and computing the expected values with the code under test, which makes the test agree with any bug.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Report every bad row",
      prompt: "This table-driven test stops at the first wrong row. Wrap the check in `with self.subTest(...)` so every failing row is reported with its value. (The postage function here is correct; Check also runs your test against a broken one.)",
      spec: [
        ["Change", "`test_price_table`: the `assertEqual` goes inside `with self.subTest(weight=weight):`"],
      ],
      starter: src`
import unittest

def postage(weight_g):
    if weight_g <= 100:
        return 85
    if weight_g <= 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")

CASES = [(20, 85), (100, 85), (101, 135), (250, 135), (750, 210)]

class TestPostage(unittest.TestCase):
    def test_price_table(self):
        for weight, pence in CASES:
            self.assertEqual(postage(weight), pence)
`,
      answer: src`
import unittest

def postage(weight_g):
    if weight_g <= 100:
        return 85
    if weight_g <= 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")

CASES = [(20, 85), (100, 85), (101, 135), (250, 135), (750, 210)]

class TestPostage(unittest.TestCase):
    def test_price_table(self):
        for weight, pence in CASES:
            with self.subTest(weight=weight):
                self.assertEqual(postage(weight), pence)
`,
      wrong: [
        {
          code: src`
import unittest

def postage(weight_g):
    if weight_g <= 100:
        return 85
    if weight_g <= 250:
        return 135
    if weight_g <= 750:
        return 210
    raise ValueError(f"{weight_g} g is too heavy for a letter")

CASES = [(20, 85), (750, 210)]

class TestPostage(unittest.TestCase):
    def test_price_table(self):
        for weight, pence in CASES:
            with self.subTest(weight=weight):
                self.assertEqual(postage(weight), pence)
`,
          fails: ["tests-1"],
          why: "subTest is there, but the boundary rows were removed, so the broken `<` version passes",
        },
      ],
      hints: [
        "subTest is used with `with`, inside the loop.",
        "Give it the row's weight as a keyword argument, so the report says which row failed.",
        "The `assertEqual` line moves one level in, under the `with` line.",
      ],
      task: {
        checks: [
          ...learnerTests("tests", {
            target: "postage",
            correct: postageCorrect,
            defects: [{ label: "a version that uses < at the band limits", code: "def postage(weight_g):\n    if weight_g < 100:\n        return 85\n    if weight_g < 250:\n        return 135\n    if weight_g <= 750:\n        return 210\n    raise ValueError('too heavy')\n" }],
          }),
          usesSource("subtest", "The table is checked with subTest", "subTest("),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A table for grade bands",
        prompt: "`grade_band(score)` turns an exam score from 0 to 100 into a band: 90 and above is `A`, 80–89 `B`, 70–79 `C`, below 70 `F`. A score below 0 or above 100 raises `ValueError`. Write a TestCase, `TestGradeBand`, with a table-driven test (using subTest) that would catch a broken version, plus a test for the scores that must be refused.",
        spec: [
          ["Write", "`class TestGradeBand(unittest.TestCase)` with a table of `(score, band)` rows checked under `subTest`, and a test for out-of-range scores"],
          ["Rule", "A: 90–100, B: 80–89, C: 70–79, F: 0–69; below 0 or above 100: ValueError"],
        ],
        starter: src`
import unittest

def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

class TestGradeBand(unittest.TestCase):
    pass
`,
        answer: src`
import unittest

def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

class TestGradeBand(unittest.TestCase):
    def test_bands(self):
        table = [(100, "A"), (90, "A"), (89, "B"), (80, "B"), (79, "C"), (70, "C"), (69, "F"), (0, "F")]
        for score, band in table:
            with self.subTest(score=score):
                self.assertEqual(grade_band(score), band)

    def test_out_of_range(self):
        for score in [-1, 101]:
            with self.subTest(score=score):
                with self.assertRaises(ValueError):
                    grade_band(score)
`,
        alternatives: [
          src`
import unittest

def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

BANDS = {"A": [90, 95, 100], "B": [80, 89], "C": [70, 79], "F": [0, 69]}

class TestGradeBand(unittest.TestCase):
    def test_every_band(self):
        for band, scores in BANDS.items():
            for score in scores:
                with self.subTest(score=score, band=band):
                    self.assertEqual(grade_band(score), band)

    def test_refused(self):
        self.assertRaises(ValueError, grade_band, 101)
        self.assertRaises(ValueError, grade_band, -5)
`,
        ],
        wrong: [
          {
            code: src`
import unittest

def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

class TestGradeBand(unittest.TestCase):
    def test_bands(self):
        table = [(95, "A"), (85, "B"), (75, "C"), (50, "F")]
        for score, band in table:
            with self.subTest(score=score):
                self.assertEqual(grade_band(score), band)

    def test_out_of_range(self):
        with self.assertRaises(ValueError):
            grade_band(101)
`,
            fails: ["tests-1", "tests-3"],
            why: "every row sits in the middle of its band, so off-by-one boundaries pass unnoticed",
          },
          {
            code: src`
import unittest

def grade_band(score):
    if score < 0 or score > 100:
        raise ValueError(f"score out of range: {score}")
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    return "F"

class TestGradeBand(unittest.TestCase):
    def test_bands(self):
        table = [(90, "A"), (89, "B"), (80, "B"), (79, "C"), (70, "C"), (69, "F")]
        for score, band in table:
            with self.subTest(score=score):
                self.assertEqual(grade_band(score), band)
`,
            fails: ["tests-2"],
            why: "the boundaries are covered, but nothing checks that impossible scores are refused",
          },
        ],
        hints: [
          "For each band, include its lowest score and the score just below it: 90 and 89, 80 and 79, 70 and 69.",
          "Put the rows in a list of `(score, band)` tuples and check each one inside a subTest that names its score.",
          "Out-of-range scores need their own test with `assertRaises`; check both ends, -1 and 101.",
        ],
        task: {
          checks: hideDefects(learnerTests("tests", {
            target: "grade_band",
            correct: gradeCorrect,
            defects: [
              { label: "a version where 90 is a B", code: "def grade_band(score):\n    if score < 0 or score > 100:\n        raise ValueError('out of range')\n    if score > 90:\n        return 'A'\n    if score >= 80:\n        return 'B'\n    if score >= 70:\n        return 'C'\n    return 'F'\n" },
              { label: "a version that accepts scores above 100", code: "def grade_band(score):\n    if score < 0:\n        raise ValueError('out of range')\n    if score >= 90:\n        return 'A'\n    if score >= 80:\n        return 'B'\n    if score >= 70:\n        return 'C'\n    return 'F'\n" },
              { label: "another broken version", code: "def grade_band(score):\n    if score < 0 or score > 100:\n        raise ValueError('out of range')\n    if score >= 90:\n        return 'A'\n    if score >= 81:\n        return 'B'\n    if score >= 70:\n        return 'C'\n    return 'F'\n" },
            ],
          }), "tests", [3]),
        },
      },
      {
        id: "c2",
        title: "Test cases from a text table",
        prompt: "The pricing team keeps postage test cases in a text file they can edit, one `weight,pence` case per line, so a new rule comes with its own cases. Write `read_cases(text)` that turns that file's contents into the list of `(weight, pence)` pairs a table-driven test loops over.",
        spec: [
          ["Function", "`read_cases(text)`"],
          ["Lines", "`weight,pence`, both whole numbers, spaces around either allowed; blank lines and lines starting with `#` are skipped"],
          ["Returns", "a list of `(weight, pence)` tuples of ints, in file order"],
          ["Raises", "`ValueError` for any other line, with a message that contains `line <n>` (lines counted from 1, including skipped ones)"],
          ["Example", "`\"# letters\\n100, 85\\n\\n101,135\\n\"` → `[(100, 85), (101, 135)]`"],
        ],
        starter: src`
def read_cases(text):
    return []

table = """# weight in grams, price in pence
20,85
100, 85

# the next band starts here
101,135
"""
print(read_cases(table))
`,
        answer: src`
def read_cases(text):
    cases = []
    for number, line in enumerate(text.splitlines(), start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split(",")
        if len(parts) != 2:
            raise ValueError(f"line {number}: expected weight,pence")
        try:
            cases.append((int(parts[0]), int(parts[1])))
        except ValueError:
            raise ValueError(f"line {number}: not whole numbers: {line!r}")
    return cases

table = """# weight in grams, price in pence
20,85
100, 85

# the next band starts here
101,135
"""
print(read_cases(table))
`,
        alternatives: [
          src`
def read_cases(text):
    result = []
    number = 0
    for raw in text.split("\n"):
        number += 1
        line = raw.strip()
        if line == "" or line[0] == "#":
            continue
        if line.count(",") != 1:
            raise ValueError("bad case on line " + str(number))
        weight, pence = line.split(",")
        if not weight.strip().isdigit() or not pence.strip().isdigit():
            raise ValueError("bad numbers on line " + str(number))
        result.append((int(weight), int(pence)))
    return result
`,
        ],
        wrong: [
          {
            code: src`
def read_cases(text):
    cases = []
    lines = [line.strip() for line in text.splitlines() if line.strip() and not line.strip().startswith("#")]
    for number, line in enumerate(lines, start=1):
        parts = line.split(",")
        if len(parts) != 2:
            raise ValueError(f"line {number}: expected weight,pence")
        cases.append((int(parts[0]), int(parts[1])))
    return cases
`,
            fails: ["line-number"],
            why: "the line numbers are counted after skipping blanks and comments, so the error points at the wrong line of the file",
          },
          {
            code: src`
def read_cases(text):
    cases = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        weight, pence = line.split(",")
        cases.append((weight, pence))
    return cases
`,
            fails: ["bad-lines", "line-number", "returns"],
            why: "the values stay text, so `postage(weight)` would be called with \"100\" instead of 100",
          },
        ],
        hints: [
          "Number the lines with `enumerate(..., start=1)` before skipping any, so error messages match the file.",
          "After stripping, skip a line when it's empty or starts with `#`; otherwise it must split into exactly two parts.",
          "`int` accepts spaces around a number. Turn its ValueError into one whose message names the line.",
        ],
        task: {
          checks: [
            fn("returns", "read_cases", [
              example(["# letters\n100, 85\n\n101,135\n"], [py.tuple(py.int(100), py.int(85)), py.tuple(py.int(101), py.int(135))]),
              example(["20,85\n750 , 210"], [py.tuple(py.int(20), py.int(85)), py.tuple(py.int(750), py.int(210))]),
              example([""], []),
              hiddenCase("only comments and blank lines", ["# nothing yet\n\n   \n# still nothing\n"], []),
              hiddenCase("spaces around both numbers", ["  250 ,  135  \n"], [py.tuple(py.int(250), py.int(135))]),
            ], { label: "read_cases() reads every case as a pair of ints" }),
            fn("bad-lines", "read_cases", [
              raisesCase(["20,85\n100;85\n"], "ValueError"),
              raisesCase(["20,85,1\n"], "ValueError", { label: "three fields" }),
              raisesCase(["heavy,210\n"], "ValueError", { label: "a weight that isn't a number" }),
            ], { label: "read_cases() refuses a malformed line" }),
            expr("line-number", "The error names the line of the file", "try:\n    read_cases('# cases\\n\\n20,85\\n100;85\\n')\n    result = 'no error'\nexcept ValueError as _e:\n    result = 'line 4' in str(_e)", true, { show: "read_cases(<a bad 4th line after a comment and a blank line>)" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import unittest

def band(score):
    return "pass" if score > 50 else "fail"

class TestBand(unittest.TestCase):
    def test_table(self):
        for score, expected in [(80, "pass"), (50, "pass"), (10, "fail"), (51, "fail")]:
            with self.subTest(score=score):
                self.assertEqual(band(score), expected)

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestBand).run(result)
print(result.testsRun, len(result.failures))
`,
        choices: ["1 2", "4 2", "1 1", "4 1"],
        answer: 0,
        why: "One test method ran. Inside it, two rows failed and each was reported as its own failure: 50 gives \"fail\" (the rule says `> 50`), and the row (51, \"fail\") has a wrong expectation, because 51 passes.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the table's expected values are computed with the function being tested. How many failures does this report for a function that is clearly wrong?",
        program: src`
import unittest

def vat(net):
    return net * 0.02

class TestVat(unittest.TestCase):
    def test_table(self):
        for net in [10, 25, 99.5]:
            with self.subTest(net=net):
                self.assertEqual(vat(net), vat(net))

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestVat).run(result)
print(len(result.failures))
`,
        choices: ["0", "3", "1", "2"],
        answer: 0,
        why: "Comparing the function with itself can never fail, so the wrong rate (0.02 instead of 0.2) passes. Expected values must come from somewhere else: worked out by hand, or from the specification.",
      },
      {
        id: "q3",
        prompt: "Which table gives a rule \"orders up to and including 50 kg ship by van, heavier ones by lorry\" the best chance of catching a bug?",
        choices: ["10, 50, 51 and 300 kg", "10, 20, 30 and 40 kg", "300, 400 and 500 kg", "50 kg only"],
        answer: 0,
        why: "It has a value inside each band and both sides of the boundary (50 and 51), where `<` and `<=` give different answers.",
      },
    ],
    review: [
      "A table of `(input, expected)` rows checks one rule on many inputs in one loop.",
      "`with self.subTest(...)` reports every failing row with its values, instead of stopping at the first.",
      "Pick rows inside each band and on both sides of every boundary; never compute expected values with the code under test.",
      "Next: fresh test data for every test, and stand-ins for parts you don't want a test to call.",
    ],
  },

  // ------------------------------------------------------------------ PY-L25-04 fixtures and test doubles
  {
    id: "PY-L25-04",
    version: 2,
    slug: "a-stand-in-value",
    title: "Fixtures and test doubles",
    lede: "Tests need data and sometimes need to avoid slow or outside services. setUp gives every test fresh data, and a test double (a small fake or a Mock) stands in for a service and records how it was called.",
    focus: "Give each test fresh data with setUp, and replace an outside dependency with a fake or a Mock.",
    minutes: 20,
    objectives: [
      "Explain why tests sharing one mutable object can pass or fail depending on their order",
      "Build fresh test data in `setUp`",
      "Pass a test double into the code under test, and check how it was called with Mock",
    ],
    requires: ["arithmetic", "assignment", "boolean", "class-def", "comparison", "dict-get", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-index", "none-value", "package-import", "precedence", "print-call", "print-several", "print-text", "reassignment", "spaces-in-text", "string-format", "string-index", "string-method", "string-split", "test-func", "top-level-indent", "try-except", "unittest-case", "with-statement"],
    teaches: ["fixture-fn", "stand-in"],
    blocks: [
      {
        kind: "text",
        md: "Tests often need the same starting data: a basket with two items, a list of orders. Putting that data in one module-level variable that every test uses is tempting, and wrong when the code under test **changes** it: whatever one test does is still there when the next one starts, and results depend on the order tests run in.\n\nunittest calls a TestCase's `setUp` method before **every** test method. Data built there is new for each test. (pytest calls such a function a *fixture*.) Store it on `self`, as `self.basket = …`, so the test methods can use it.",
      },
      {
        kind: "example",
        title: "Shared data versus setUp",
        code: src`
import unittest

def add_item(basket, sku, quantity):
    basket[sku] = basket.get(sku, 0) + quantity

def remove_item(basket, sku):
    del basket[sku]

SHARED = {"21329": 2}

class TestSharedBasket(unittest.TestCase):
    def test_empty_after_remove(self):
        remove_item(SHARED, "21329")
        self.assertEqual(SHARED, {})

    def test_more_after_add(self):
        add_item(SHARED, "21329", 1)
        self.assertEqual(SHARED["21329"], 3)

class TestFreshBasket(unittest.TestCase):
    def setUp(self):
        self.basket = {"21329": 2}

    def test_empty_after_remove(self):
        remove_item(self.basket, "21329")
        self.assertEqual(self.basket, {})

    def test_more_after_add(self):
        add_item(self.basket, "21329", 1)
        self.assertEqual(self.basket["21329"], 3)

${RUN}

run(TestSharedBasket)
run(TestFreshBasket)
`,
        output: "ran 2 | failures 1 | errors 0\n  TestSharedBasket.test_more_after_add -> AssertionError: 1 != 3\nran 2 | failures 0 | errors 0\n",
        note: "unittest runs a TestCase's methods in alphabetical order. In the shared version, `test_empty_after_remove` ran first and emptied the basket, so the second test found nothing to add to. The functions are correct; the tests interfered. With `setUp`, each test gets its own basket.",
      },
      {
        kind: "text",
        md: "Some code depends on things a test shouldn't use: an exchange-rate service on the internet, a payment provider, the clock. Write such code so the dependency is **passed in** (as `get_rate` below). Then a test can pass a **test double** instead: a stand-in that returns a chosen answer instantly and records how it was called.\n\n`unittest.mock.Mock` builds one in a line. `Mock(return_value=1.17)` can be called with any arguments and returns 1.17; `Mock(side_effect=ConnectionError(...))` raises that error when called. Afterwards it can tell you how it was used: `call_count`, `call_args_list`, and `assert_called_once_with(...)`, `assert_not_called()`.",
      },
      {
        kind: "example",
        title: "A fake exchange-rate service",
        code: src`
import unittest
from unittest.mock import Mock

def total_in(currency, amount_gbp, get_rate):
    if currency == "GBP":
        return amount_gbp
    return round(amount_gbp * get_rate(currency), 2)

fake = Mock(return_value=1.17)
print(fake("EUR"), fake("USD"))
print(fake.call_count, fake.call_args_list)

class TestTotalIn(unittest.TestCase):
    def test_converts_with_the_rate(self):
        get_rate = Mock(return_value=1.17)
        self.assertEqual(total_in("EUR", 100.0, get_rate), 117.0)
        get_rate.assert_called_once_with("EUR")

    def test_pounds_need_no_rate(self):
        get_rate = Mock()
        self.assertEqual(total_in("GBP", 25.0, get_rate), 25.0)
        get_rate.assert_not_called()

    def test_rates_service_down(self):
        get_rate = Mock(side_effect=ConnectionError("rates service timed out"))
        with self.assertRaises(ConnectionError):
            total_in("USD", 10.0, get_rate)

${RUN}

run(TestTotalIn)
`,
        output: "1.17 1.17\n2 [call('EUR'), call('USD')]\nran 3 | failures 0 | errors 0\n",
        note: "The tests check `total_in`, the real code: its arithmetic, that it asks for the right currency, that pounds need no lookup, and what happens when the service fails. Only the service itself is replaced, so the tests are fast and never depend on the network.",
      },
      {
        kind: "text",
        md: "**When to use it:** `setUp` whenever several tests start from the same data; a double for anything slow, random, external or costly (networks, payments, emails, the current time).\n\n**Mistakes to avoid:**\n- Module-level test data that tests modify (order-dependent results, as above).\n- Replacing the code you meant to test. The double stands in for a *dependency*; the assertions are still about your function.\n- Asserting only on the double (`get_rate` was called) and never on the result.\n- Doubles that return values the real service never would, so the tests pass against a world that doesn't exist.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Fresh orders for every test",
      prompt: "Both tests are right, but they share the module-level `ORDERS` list, and `cancel_order` changes it. Whether `test_open_total` passes depends on which test runs first. Build the orders in `setUp` instead, so every test gets its own.",
      spec: [
        ["Change", "move the orders into `setUp` as `self.orders`, and use `self.orders` in both tests"],
      ],
      starter: src`
import unittest

def cancel_order(orders, order_id):
    for order in orders:
        if order["order_id"] == order_id:
            order["status"] = "cancelled"

def open_total(orders):
    total = 0
    for order in orders:
        if order["status"] != "cancelled":
            total += order["total"]
    return total

ORDERS = [
    {"order_id": "O100282", "status": "paid", "total": 35},
    {"order_id": "O100918", "status": "paid", "total": 20},
]

class TestOrders(unittest.TestCase):
    def test_cancelled_order_leaves_total(self):
        cancel_order(ORDERS, "O100282")
        self.assertEqual(open_total(ORDERS), 20)

    def test_open_total(self):
        self.assertEqual(open_total(ORDERS), 55)
`,
      answer: src`
import unittest

def cancel_order(orders, order_id):
    for order in orders:
        if order["order_id"] == order_id:
            order["status"] = "cancelled"

def open_total(orders):
    total = 0
    for order in orders:
        if order["status"] != "cancelled":
            total += order["total"]
    return total

class TestOrders(unittest.TestCase):
    def setUp(self):
        self.orders = [
            {"order_id": "O100282", "status": "paid", "total": 35},
            {"order_id": "O100918", "status": "paid", "total": 20},
        ]

    def test_cancelled_order_leaves_total(self):
        cancel_order(self.orders, "O100282")
        self.assertEqual(open_total(self.orders), 20)

    def test_open_total(self):
        self.assertEqual(open_total(self.orders), 55)
`,
      wrong: [
        {
          code: src`
import unittest

def cancel_order(orders, order_id):
    for order in orders:
        if order["order_id"] == order_id:
            order["status"] = "cancelled"

def open_total(orders):
    total = 0
    for order in orders:
        if order["status"] != "cancelled":
            total += order["total"]
    return total

ORDERS = [
    {"order_id": "O100282", "status": "paid", "total": 35},
    {"order_id": "O100918", "status": "paid", "total": 20},
]

class TestOrders(unittest.TestCase):
    def setUp(self):
        self.orders = ORDERS

    def test_cancelled_order_leaves_total(self):
        cancel_order(self.orders, "O100282")
        self.assertEqual(open_total(self.orders), 20)

    def test_open_total(self):
        self.assertEqual(open_total(self.orders), 55)
`,
          fails: ["tests-correct"],
          why: "`self.orders = ORDERS` gives each test another name for the same list, not a new one, so the cancellation still leaks into the next test",
        },
      ],
      hints: [
        "`setUp(self)` is a method of the TestCase, like the tests, and runs before each of them.",
        "Inside it, build the list of order dictionaries and store it as `self.orders`.",
        "The list has to be built inside `setUp`. Assigning the old module-level list there would still share one list between the tests.",
      ],
      task: {
        checks: learnerTests("tests", {
          target: "open_total",
          correct: ordersCorrect,
          defects: [
            { label: "a version that still counts cancelled orders", code: "def cancel_order(orders, order_id):\n    for order in orders:\n        if order['order_id'] == order_id:\n            order['status'] = 'cancelled'\n\ndef open_total(orders):\n    total = 0\n    for order in orders:\n        total += order['total']\n    return total\n" },
          ],
        }),
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Test a receipt email without sending one",
        prompt: "`send_receipt(order, send_email)` emails a receipt through the function it is given, and returns whether it sent one. Write a TestCase, `TestSendReceipt`, that uses `Mock` as `send_email` to check the calls. No real email may be sent, and no test should depend on another.",
        spec: [
          ["Write", "`class TestSendReceipt(unittest.TestCase)` using `Mock()` for `send_email`"],
          ["Rule", "with an email: calls `send_email(email, \"Receipt for order <order_id>\")` exactly once and returns True"],
          ["Rule", "with no email (`None` or `\"\"`): never calls `send_email` and returns False"],
        ],
        starter: src`
import unittest
from unittest.mock import Mock

def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True

class TestSendReceipt(unittest.TestCase):
    pass
`,
        answer: src`
import unittest
from unittest.mock import Mock

def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True

class TestSendReceipt(unittest.TestCase):
    def setUp(self):
        self.send_email = Mock()

    def test_sends_one_receipt(self):
        order = {"order_id": "O100282", "email": "nora_garcia@fastmail.com"}
        self.assertTrue(send_receipt(order, self.send_email))
        self.send_email.assert_called_once_with("nora_garcia@fastmail.com", "Receipt for order O100282")

    def test_no_email_address(self):
        for email in [None, ""]:
            with self.subTest(email=email):
                order = {"order_id": "O100918", "email": email}
                self.assertFalse(send_receipt(order, self.send_email))
        self.send_email.assert_not_called()
`,
        alternatives: [
          src`
import unittest
from unittest.mock import Mock

def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True

class TestSendReceipt(unittest.TestCase):
    def test_with_email(self):
        fake = Mock()
        result = send_receipt({"order_id": "O7", "email": "a@b.com"}, fake)
        self.assertEqual(result, True)
        self.assertEqual(fake.call_count, 1)
        self.assertEqual(fake.call_args_list[0][0], ("a@b.com", "Receipt for order O7"))

    def test_without_email(self):
        fake = Mock()
        self.assertEqual(send_receipt({"order_id": "O8", "email": None}, fake), False)
        self.assertEqual(send_receipt({"order_id": "O9"}, fake), False)
        self.assertEqual(fake.call_count, 0)
`,
        ],
        wrong: [
          {
            code: src`
import unittest
from unittest.mock import Mock

def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True

class TestSendReceipt(unittest.TestCase):
    def test_sends(self):
        fake = Mock()
        self.assertTrue(send_receipt({"order_id": "O1", "email": "a@b.com"}, fake))
        self.assertTrue(fake.called)

    def test_no_email(self):
        self.assertFalse(send_receipt({"order_id": "O2", "email": None}, Mock()))
`,
            fails: ["tests-1", "tests-2", "tests-3"],
            why: "the tests check the return values and that something was sent, but never what was sent, how often, or that nothing was sent without an address",
          },
          {
            code: src`
import unittest
from unittest.mock import Mock

def send_receipt(order, send_email):
    email = order.get("email")
    if not email:
        return False
    send_email(email, f"Receipt for order {order['order_id']}")
    return True

class TestSendReceipt(unittest.TestCase):
    def test_sends(self):
        fake = Mock()
        send_receipt({"order_id": "O1", "email": "a@b.com"}, fake)
        fake.assert_called_once_with("a@b.com", "Receipt O1")
`,
            fails: ["tests-correct"],
            why: "the expected subject is wrong, so the test fails on the correct function",
          },
        ],
        hints: [
          "Create a fresh `Mock()` for each test (setUp is a good place) and pass it as `send_email`.",
          "After calling `send_receipt`, ask the mock how it was used: `assert_called_once_with(...)` checks the arguments and that there was exactly one call.",
          "For the no-email case, check both the return value and `assert_not_called()`; try `None` and an empty text.",
        ],
        task: {
          checks: hideDefects(learnerTests("tests", {
            target: "send_receipt",
            correct: receiptCorrect,
            defects: [
              { label: "a version that sends even without an address", code: "def send_receipt(order, send_email):\n    send_email(order.get('email'), f\"Receipt for order {order['order_id']}\")\n    return bool(order.get('email'))\n" },
              { label: "a version with the wrong subject", code: "def send_receipt(order, send_email):\n    email = order.get('email')\n    if not email:\n        return False\n    send_email(email, 'Your receipt')\n    return True\n" },
              { label: "another broken version", code: "def send_receipt(order, send_email):\n    email = order.get('email')\n    if not email:\n        return False\n    for _ in range(2):\n        send_email(email, f\"Receipt for order {order['order_id']}\")\n    return True\n" },
            ],
          }), "tests", [3]),
        },
      },
      {
        id: "c2",
        title: "Charge through a payment function",
        prompt: "Write `charge_order(order, charge)`. Work out the order's amount in whole cents from its lines (`quantity × unit_price`, rounded to the nearest cent). If the amount is 0, return `\"nothing to charge\"` without calling `charge`. Otherwise call `charge(order[\"card_token\"], cents)` once: return `\"paid\"` if it returns normally, or `\"declined\"` if it raises `ValueError` (the provider's way of refusing a card). Any other error, such as a network failure, must reach the caller. Check tests your function with Mock stand-ins for `charge`.",
        spec: [
          ["Function", "`charge_order(order, charge)`"],
          ["order", "a dictionary with `card_token` and `lines`, a list of `{\"quantity\": int, \"unit_price\": float}`"],
          ["Calls", "`charge(card_token, cents)` with `cents` as an int; not at all for a zero amount"],
          ["Returns", "`\"paid\"`, `\"declined\"` or `\"nothing to charge\"`"],
          ["Example", "two lines of 2 × 17.92 and 1 × 4.99 → `charge(\"tok_visa\", 4083)` → `\"paid\"`"],
        ],
        starter: src`
from unittest.mock import Mock

def charge_order(order, charge):
    return "paid"

order = {"card_token": "tok_visa", "lines": [{"quantity": 2, "unit_price": 17.92}, {"quantity": 1, "unit_price": 4.99}]}
charge = Mock(return_value="ch_1")
print(charge_order(order, charge), charge.call_args_list)
`,
        answer: src`
from unittest.mock import Mock

def charge_order(order, charge):
    total = 0
    for line in order["lines"]:
        total += line["quantity"] * line["unit_price"]
    cents = round(total * 100)
    if cents == 0:
        return "nothing to charge"
    try:
        charge(order["card_token"], cents)
    except ValueError:
        return "declined"
    return "paid"

order = {"card_token": "tok_visa", "lines": [{"quantity": 2, "unit_price": 17.92}, {"quantity": 1, "unit_price": 4.99}]}
charge = Mock(return_value="ch_1")
print(charge_order(order, charge), charge.call_args_list)
`,
        alternatives: [
          src`
def charge_order(order, charge):
    cents = 0
    for line in order["lines"]:
        cents += round(line["quantity"] * line["unit_price"] * 100)
    if not cents:
        return "nothing to charge"
    try:
        charge(order["card_token"], cents)
        return "paid"
    except ValueError:
        return "declined"
`,
        ],
        wrong: [
          {
            code: src`
def charge_order(order, charge):
    total = 0
    for line in order["lines"]:
        total += line["quantity"] * line["unit_price"]
    try:
        charge(order["card_token"], total * 100)
    except ValueError:
        return "declined"
    return "paid" if total else "nothing to charge"
`,
            fails: ["calls", "zero"],
            why: "the amount is passed as a float like 4083.0000000000005, and a zero order still calls the provider",
          },
          {
            code: src`
def charge_order(order, charge):
    total = 0
    for line in order["lines"]:
        total += line["quantity"] * line["unit_price"]
    cents = round(total * 100)
    if cents == 0:
        return "nothing to charge"
    try:
        charge(order["card_token"], cents)
    except Exception:
        return "declined"
    return "paid"
`,
            fails: ["network"],
            why: "catching every Exception reports a network failure as a declined card, so nobody retries a payment that might succeed",
          },
        ],
        hints: [
          "Add up quantity × unit_price, then convert to cents with `round(total * 100)`, which gives an int.",
          "Check for zero before calling `charge`. Put only the `charge(...)` call inside `try`.",
          "Catch `ValueError` alone; anything else should be left to propagate.",
        ],
        task: {
          checks: [
            expr("calls", "The provider is called once with the token and whole cents", "from unittest.mock import Mock as _Mock\n_c = _Mock(return_value='ch_1')\n_r = charge_order({'card_token': 'tok_visa', 'lines': [{'quantity': 2, 'unit_price': 17.92}, {'quantity': 1, 'unit_price': 4.99}]}, _c)\nresult = (_r, [tuple(_x.args) for _x in _c.call_args_list], [type(_x.args[1]).__name__ for _x in _c.call_args_list])", py.tuple(py.str("paid"), py.list(py.tuple(py.str("tok_visa"), py.int(4083))), py.list(py.str("int"))), { show: "charge_order(order, <a Mock charge>): the result, the calls, the type of cents" }),
            expr("declined", "A refused card is reported as declined", "from unittest.mock import Mock as _Mock\n_c = _Mock(side_effect=ValueError('card declined'))\nresult = charge_order({'card_token': 'tok_chargeDeclined', 'lines': [{'quantity': 1, 'unit_price': 9.5}]}, _c)", "declined", { show: "charge_order(<one line>, <a charge that raises ValueError>)" }),
            expr("zero", "A zero order never reaches the provider", "from unittest.mock import Mock as _Mock\n_c = _Mock()\n_r = charge_order({'card_token': 'tok_visa', 'lines': [{'quantity': 0, 'unit_price': 12.0}]}, _c)\nresult = (_r, _c.call_count)", py.tuple(py.str("nothing to charge"), py.int(0)), { hidden: true }),
            { kind: "expr" as const, id: "network", label: "A network failure reaches the caller", hidden: true, expr: "from unittest.mock import Mock as _Mock\ncharge_order({'card_token': 'tok_visa', 'lines': [{'quantity': 1, 'unit_price': 3.0}]}, _Mock(side_effect=ConnectionError('timeout')))", raises: "ConnectionError" },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from unittest.mock import Mock

lookup = Mock(side_effect=[1.17, 1.28])
print(lookup("EUR"), lookup("USD"))
print(lookup.call_count)
lookup.assert_called_with("USD")
print("checked")
`,
        choices: ["1.17 1.28\n2\nchecked", "1.17 1.17\n2\nchecked", "1.17 1.28\n1\nchecked", "1.17 1.28\n2"],
        answer: 0,
        why: "A list as `side_effect` gives one value per call, in order. `assert_called_with` checks only the most recent call, which was with \"USD\", so it passes and `checked` prints.",
      },
      {
        id: "q2",
        prompt: "A common mistake: setUp hands every test the same list. What does this print?",
        program: src`
import unittest

ITEMS = []

class TestBasket(unittest.TestCase):
    def setUp(self):
        self.items = ITEMS

    def test_a_add(self):
        self.items.append("21329")
        self.assertEqual(len(self.items), 1)

    def test_b_add(self):
        self.items.append("85048")
        self.assertEqual(len(self.items), 1)

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestBasket).run(result)
print(len(result.failures), ITEMS)
`,
        choices: ["1 ['21329', '85048']", "0 []", "0 ['21329', '85048']", "2 ['85048']"],
        answer: 0,
        why: "`setUp` runs before each test, but `self.items = ITEMS` only gives the one module-level list another name. The second test finds the first test's item still there. Build a new list inside setUp: `self.items = []`.",
      },
      {
        id: "q3",
        prompt: "`place_order` saves the order, charges the card and emails a receipt. In a test of `place_order`, which should be replaced by doubles?",
        choices: [
          "The card charge and the email: they are outside services; place_order's own logic stays real",
          "place_order itself, so the test is fast",
          "Nothing: tests should always use the real payment provider",
          "Only the assertions",
        ],
        answer: 0,
        why: "Doubles replace dependencies that are slow, costly or outside your control. Replacing the function under test would leave nothing to test.",
      },
    ],
    review: [
      "`setUp` runs before every test: build fresh data there and store it on `self`.",
      "Code that receives its dependencies can be tested with doubles instead of real services.",
      "`Mock(return_value=…)` / `Mock(side_effect=…)` stand in for a call and record it: `assert_called_once_with`, `assert_not_called`, `call_count`.",
      "Next: which inputs to test, so that a broken version is actually caught.",
    ],
  },

  // ------------------------------------------------------------------ PY-L25-05 edge cases
  {
    id: "PY-L25-05",
    version: 2,
    slug: "the-zero-case",
    title: "Edge cases that catch bugs",
    lede: "Most bugs live at the edges: an empty list, one item, the exact boundary, a repeated value. A good test suite is one that fails when the code is broken, and you can check that by running it against deliberately broken versions.",
    focus: "Choose edge-case inputs that catch defects, and judge a test suite by whether it catches broken versions of the code.",
    minutes: 20,
    objectives: [
      "List the edge cases for a function: empty, one item, boundaries, duplicates, order, invalid input",
      "Decide and test what a function should do at an edge (return a value or raise)",
      "Judge a test suite by running it against deliberately broken versions of the code",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "class-def", "comparison", "conditional-expr", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "set-literal", "set-op", "spaces-in-text", "string-index", "string-method", "string-slice", "string-split", "test-func", "top-level-indent", "unittest-case", "unquoted-name", "with-statement"],
    teaches: ["edge-case"],
    blocks: [
      {
        kind: "text",
        md: "Tests written from a typical example tend to pass: the typical case is the one the code was written for. Bugs hide where the code's assumptions break:\n\n- **empty** input (no orders yet, an empty file) and a **single** item;\n- **boundaries**: exactly at a limit, one below, one above; the first and last page;\n- **duplicates** and **ties**; input in an unexpected **order**;\n- **invalid** input: negative, missing, the wrong type.\n\nAn edge case often forces a decision the specification forgot. What *is* the average rating of a product with no ratings? Decide (here: `None`), write it down, and test it.",
      },
      {
        kind: "example",
        title: "A typical test passes; an edge case doesn't",
        code: src`
import unittest

def average_rating(ratings):
    return sum(ratings) / len(ratings)

class TestTypicalOnly(unittest.TestCase):
    def test_three_ratings(self):
        self.assertAlmostEqual(average_rating([5, 4, 3]), 4.0)

class TestWithEdges(unittest.TestCase):
    def test_three_ratings(self):
        self.assertAlmostEqual(average_rating([5, 4, 3]), 4.0)

    def test_one_rating(self):
        self.assertEqual(average_rating([2]), 2.0)

    def test_no_ratings_yet(self):
        self.assertIsNone(average_rating([]))

${RUN}

run(TestTypicalOnly)
run(TestWithEdges)
`,
        output: "ran 1 | failures 0 | errors 0\nran 3 | failures 0 | errors 1\n  TestWithEdges.test_no_ratings_yet -> ZeroDivisionError: division by zero\n",
        note: "Every new product page would crash on its first visit, and the typical-only suite would never have shown it. The fix is an `if not ratings: return None` at the start.",
      },
      {
        kind: "text",
        md: "How do you know a suite is good enough? Passing proves little: an empty suite passes too. The useful question is the reverse: **would it fail if the code were wrong?** You can check that for real. Write a few deliberately broken versions of the function (each with one typical mistake), run the suite against each, and see which tests catch it. A broken version that no test catches shows exactly which case is missing. (Tools such as mutmut automate this on a computer; it is called *mutation testing*.)",
      },
      {
        kind: "example",
        title: "Which tests catch which broken version",
        code: src`
import unittest

def page_correct(items, number, size):
    start = (number - 1) * size
    return items[start:start + size]

def page_skips_first(items, number, size):
    return items[number * size:(number + 1) * size]

def page_drops_partial(items, number, size):
    start = (number - 1) * size
    chunk = items[start:start + size]
    if len(chunk) < size:
        return []
    return chunk

ORDERS = ["O1", "O2", "O3", "O4", "O5", "O6", "O7"]

class TestPage(unittest.TestCase):
    def test_first_page(self):
        self.assertEqual(page(ORDERS, 1, 3), ["O1", "O2", "O3"])

    def test_last_page_is_partial(self):
        self.assertEqual(page(ORDERS, 3, 3), ["O7"])

    def test_past_the_end(self):
        self.assertEqual(page(ORDERS, 4, 3), [])

    def test_no_orders(self):
        self.assertEqual(page([], 1, 3), [])

for version in [page_correct, page_skips_first, page_drops_partial]:
    page = version
    result = unittest.TestResult()
    unittest.defaultTestLoader.loadTestsFromTestCase(TestPage).run(result)
    caught = []
    for test, details in result.failures + result.errors:
        caught.append(test.id().split(".")[-1])
    print(version.__name__, "->", caught)
`,
        output: "page_correct -> []\npage_skips_first -> ['test_first_page', 'test_last_page_is_partial']\npage_drops_partial -> ['test_last_page_is_partial']\n",
        note: "The tests call `page`, a name looked up when each test runs, so assigning a different function to it swaps the implementation under test. The correct version passes everything; each broken one is caught. Without `test_last_page_is_partial`, the version that drops a short last page would have passed the whole suite.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every function you test. Before writing tests, list the edges of its input; after writing them, ask which plausible mistake would still pass.\n\n**Mistakes to avoid:** testing only the example from the specification; skipping the empty case because \"it never happens\"; and edge-case tests that only check that *something* is returned (`assertIsNotNone`) instead of the exact expected value.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The empty list",
      prompt: "`average_rating` now returns `None` when there are no ratings. Add a test for that edge to `TestAverageRating`, so that a version which crashes or returns 0 for no ratings is caught.",
      spec: [
        ["Add", "a test method asserting that `average_rating([])` is `None`"],
      ],
      starter: src`
import unittest

def average_rating(ratings):
    if not ratings:
        return None
    return sum(ratings) / len(ratings)

class TestAverageRating(unittest.TestCase):
    def test_several_ratings(self):
        self.assertAlmostEqual(average_rating([5, 4, 3, 4]), 4.0)
`,
      answer: src`
import unittest

def average_rating(ratings):
    if not ratings:
        return None
    return sum(ratings) / len(ratings)

class TestAverageRating(unittest.TestCase):
    def test_several_ratings(self):
        self.assertAlmostEqual(average_rating([5, 4, 3, 4]), 4.0)

    def test_no_ratings(self):
        self.assertIsNone(average_rating([]))
`,
      wrong: [
        {
          code: src`
import unittest

def average_rating(ratings):
    if not ratings:
        return None
    return sum(ratings) / len(ratings)

class TestAverageRating(unittest.TestCase):
    def test_several_ratings(self):
        self.assertAlmostEqual(average_rating([5, 4, 3, 4]), 4.0)

    def test_no_ratings(self):
        self.assertFalse(average_rating([]))
`,
          fails: ["tests-2"],
          why: "`assertFalse` accepts 0 as well as None, so the version that returns 0 for no ratings passes",
        },
      ],
      hints: [
        "A new test method in the class, named for the situation it covers.",
        "The expected result is exactly `None`.",
        "unittest has an assert method made for checking that a value is None.",
      ],
      task: {
        checks: learnerTests("tests", {
          target: "average_rating",
          correct: averageCorrect,
          defects: [
            { label: "a version that crashes with no ratings", code: "def average_rating(ratings):\n    return sum(ratings) / len(ratings)\n" },
            { label: "a version that returns 0 for no ratings", code: "def average_rating(ratings):\n    if not ratings:\n        return 0\n    return sum(ratings) / len(ratings)\n" },
          ],
        }),
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Edge cases for a median",
        prompt: "`median(values)` returns the middle value of a list of numbers: for an even count, the average of the two middle values. The list can arrive in any order and must not be changed. An empty list raises `ValueError`. Write a TestCase, `TestMedian`, that catches broken versions: think about order, odd and even counts, the caller's list, and the empty list.",
        spec: [
          ["Write", "`class TestMedian(unittest.TestCase)` with test methods"],
          ["Rule", "`median([3, 1, 2])` → 2; `median([4, 1, 3, 2])` → 2.5; `median([7])` → 7; `median([])` raises ValueError"],
          ["Must hold", "the list passed in is left exactly as it was"],
        ],
        starter: src`
import unittest

def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2

class TestMedian(unittest.TestCase):
    pass
`,
        answer: src`
import unittest

def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2

class TestMedian(unittest.TestCase):
    def test_odd_count_unsorted(self):
        self.assertEqual(median([3, 1, 2]), 2)

    def test_even_count(self):
        self.assertEqual(median([4, 1, 3, 2]), 2.5)

    def test_single_value(self):
        self.assertEqual(median([7]), 7)

    def test_input_not_changed(self):
        values = [3, 1, 2]
        median(values)
        self.assertEqual(values, [3, 1, 2])

    def test_empty(self):
        with self.assertRaises(ValueError):
            median([])
`,
        alternatives: [
          src`
import unittest

def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2

class TestMedian(unittest.TestCase):
    def test_table(self):
        for values, expected in [([5, 1, 3], 3), ([10, 2, 8, 4], 6.0), ([1], 1)]:
            with self.subTest(values=values):
                original = list(values)
                self.assertEqual(median(values), expected)
                self.assertEqual(values, original)

    def test_nothing(self):
        self.assertRaises(ValueError, median, [])
`,
        ],
        wrong: [
          {
            code: src`
import unittest

def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2

class TestMedian(unittest.TestCase):
    def test_sorted_odd(self):
        self.assertEqual(median([1, 2, 3]), 2)

    def test_empty(self):
        with self.assertRaises(ValueError):
            median([])
`,
            fails: ["tests-1", "tests-2", "tests-3"],
            why: "a sorted, odd-length list is the one input where every broken version still gives the right answer",
          },
          {
            code: src`
import unittest

def median(values):
    if not values:
        raise ValueError("median of no values")
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        return ordered[middle]
    return (ordered[middle - 1] + ordered[middle]) / 2

class TestMedian(unittest.TestCase):
    def test_even(self):
        self.assertEqual(median([4, 1, 3, 2]), 2)
`,
            fails: ["tests-1", "tests-correct"],
            why: "the median of 1, 2, 3, 4 is 2.5: the test fails on the correct function, and by coincidence agrees with the version that forgets to sort",
          },
        ],
        hints: [
          "Each broken version makes one classic mistake: not sorting, getting the even case wrong, sorting the caller's list in place, or mishandling the empty list.",
          "Use unsorted input, both odd and even counts, and a single value. To test that the input is unchanged, keep a reference to the list and compare it after the call.",
          "The empty list must raise ValueError specifically.",
        ],
        task: {
          checks: hideDefects(learnerTests("tests", {
            target: "median",
            correct: medianCorrect,
            defects: [
              { label: "a version that forgets to sort", code: "def median(values):\n    if not values:\n        raise ValueError('empty')\n    middle = len(values) // 2\n    if len(values) % 2 == 1:\n        return values[middle]\n    return (values[middle - 1] + values[middle]) / 2\n" },
              { label: "a version that takes the upper middle value for even counts", code: "def median(values):\n    if not values:\n        raise ValueError('empty')\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n" },
              { label: "a version that sorts the caller's list", code: "def median(values):\n    if not values:\n        raise ValueError('empty')\n    values.sort()\n    middle = len(values) // 2\n    if len(values) % 2 == 1:\n        return values[middle]\n    return (values[middle - 1] + values[middle]) / 2\n" },
              { label: "another broken version", code: "def median(values):\n    if not values:\n        return None\n    ordered = sorted(values)\n    middle = len(ordered) // 2\n    if len(ordered) % 2 == 1:\n        return ordered[middle]\n    return (ordered[middle - 1] + ordered[middle]) / 2\n" },
            ],
          }), "tests", [4]),
        },
      },
      {
        id: "c2",
        title: "Boundary inputs for a banded rule",
        prompt: "Banded rules (postage by weight, discounts by order total, grades by score) break at their cut-offs. Write `boundary_inputs(cutoffs, low, high)` that produces the inputs a test table should use: for each cut-off `c` (the first value of a new band), the values `c - 1` and `c`; plus the lowest and highest valid inputs. Leave out anything outside `low`–`high`, and list each value once, smallest first.",
        spec: [
          ["Function", "`boundary_inputs(cutoffs, low, high)`"],
          ["cutoffs", "whole numbers where a new band starts, in any order, possibly repeated"],
          ["Returns", "a sorted list of distinct whole numbers: `low`, `high`, and `c - 1`, `c` for each cut-off, keeping only values from `low` to `high`"],
          ["Example", "grade bands starting at 70, 80, 90 for scores 0–100 → `[0, 69, 70, 79, 80, 89, 90, 100]`"],
        ],
        starter: src`
def boundary_inputs(cutoffs, low, high):
    return []

print(boundary_inputs([90, 70, 80], 0, 100))
`,
        answer: src`
def boundary_inputs(cutoffs, low, high):
    values = [low, high]
    for cutoff in cutoffs:
        values.append(cutoff - 1)
        values.append(cutoff)
    inside = []
    for value in values:
        if low <= value <= high and value not in inside:
            inside.append(value)
    return sorted(inside)

print(boundary_inputs([90, 70, 80], 0, 100))
`,
        alternatives: [
          src`
def boundary_inputs(cutoffs, low, high):
    found = {low, high}
    for c in cutoffs:
        for value in (c - 1, c):
            if low <= value <= high:
                found = found.union({value})
    return sorted(found)
`,
        ],
        wrong: [
          {
            code: src`
def boundary_inputs(cutoffs, low, high):
    values = [low, high]
    for cutoff in sorted(cutoffs):
        values.append(cutoff - 1)
        values.append(cutoff)
    return sorted(values)
`,
            fails: ["returns"],
            why: "repeated cut-offs give repeated values, and a cut-off at the very edge adds a value outside the valid range",
          },
          {
            code: src`
def boundary_inputs(cutoffs, low, high):
    values = []
    for cutoff in cutoffs:
        for value in [cutoff - 1, cutoff, cutoff + 1]:
            if low <= value <= high and value not in values:
                values.append(value)
    return sorted(values)
`,
            fails: ["returns"],
            why: "it adds `c + 1` and leaves out the lowest and highest valid inputs",
          },
        ],
        hints: [
          "Collect candidates first: `low`, `high`, then `c - 1` and `c` for every cut-off.",
          "Keep a candidate only if it lies from `low` to `high` and isn't already kept.",
          "Sort the kept values at the end; the cut-offs may arrive in any order.",
        ],
        task: {
          checks: [
            fn("returns", "boundary_inputs", [
              example([[90, 70, 80], 0, 100], [0, 69, 70, 79, 80, 89, 90, 100]),
              example([[101, 251], 1, 750], [1, 100, 101, 250, 251, 750]),
              example([[], 0, 10], [0, 10]),
              hiddenCase("a cut-off at the lowest valid value", [[0, 50], 0, 100], [0, 49, 50, 100]),
              hiddenCase("a repeated cut-off", [[40, 40], 0, 99], [0, 39, 40, 99]),
              hiddenCase("cut-offs outside the valid range", [[-5, 500, 30], 1, 100], [1, 29, 30, 100]),
              hiddenCase("a range of one value", [[5], 5, 5], [5]),
            ], { label: "boundary_inputs() lists each boundary input once, in order" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import unittest

def first_word(text):
    return text.split()[0]

class TestFirstWord(unittest.TestCase):
    def test_sentence(self):
        self.assertEqual(first_word("Fast delivery, great mug"), "Fast")

    def test_leading_spaces(self):
        self.assertEqual(first_word("   ok"), "ok")

    def test_empty_review(self):
        self.assertEqual(first_word(""), "")

result = unittest.TestResult()
unittest.defaultTestLoader.loadTestsFromTestCase(TestFirstWord).run(result)
print(len(result.failures), len(result.errors))
`,
        choices: ["0 1", "1 0", "0 0", "1 1"],
        answer: 0,
        why: "`split()` ignores leading spaces, so the first two tests pass. An empty review splits into `[]`, and `[0]` raises IndexError: an error, not a failure, found only by the edge case.",
      },
      {
        id: "q2",
        prompt: "A common mistake: an edge-case test that checks too little. Which broken versions does this test catch?",
        program: src`
def total_v1(prices):
    return sum(prices)

def total_v2(prices):
    return None if not prices else sum(prices)

def total_v3(prices):
    return 1 if not prices else sum(prices)

caught = []
for version in [total_v1, total_v2, total_v3]:
    if version([]) is None:
        caught.append(version.__name__)
print(caught)
`,
        choices: ["['total_v2']", "['total_v1', 'total_v3']", "[]", "['total_v1', 'total_v2', 'total_v3']"],
        answer: 0,
        why: "The check only looks for `None`, so it flags v2 and lets v3's wrong total of 1 through. An edge-case test should compare with the exact expected value: `total([]) == 0` would pass v1 and catch both v2 and v3.",
      },
      {
        id: "q3",
        prompt: "A test suite passes. What is the best evidence that it is also *good*?",
        choices: [
          "It fails for deliberately broken versions of the code, each with one typical mistake",
          "It has more than 20 tests",
          "It runs in under a second",
          "Every test has a long name",
        ],
        answer: 0,
        why: "A suite's job is to fail when the code is wrong. Running it against broken versions shows which mistakes it would catch, and which case is missing when one slips through.",
      },
    ],
    review: [
      "Bugs cluster at edges: empty, one item, boundaries, duplicates, order, invalid input.",
      "An edge case often needs a decision (return None? raise?): make it, then test exactly that.",
      "Judge a suite by the broken versions it catches, not by how many tests it has.",
      "Next module: classes, so your own objects can bundle data with the functions that work on it.",
    ],
  },
];
