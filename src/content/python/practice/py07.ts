import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import { errorOf, mutationCheck } from "../checks";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const b = py.bool;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const close = { numbers: "int-float-equal" } as const;
const lines = (...qtys: number[]) => py.list(...qtys.map((q) => rec([["qty", i(q)]])));

// PY07-06: one correct shipping_band and three that are wrong only at the edges.
const BAND_OK =
  'def shipping_band(weight):\n    if weight < 0:\n        raise ValueError("weight can\'t be negative")\n    if weight <= 1:\n        return "small"\n    if weight <= 5:\n        return "medium"\n    if weight <= 20:\n        return "large"\n    raise ValueError("too heavy to ship")';
const BAND_LOW_EDGE =
  'def shipping_band(weight):\n    if weight < 0:\n        raise ValueError("weight can\'t be negative")\n    if weight < 1:\n        return "small"\n    if weight <= 5:\n        return "medium"\n    if weight <= 20:\n        return "large"\n    raise ValueError("too heavy to ship")';
const BAND_HIGH_EDGE =
  'def shipping_band(weight):\n    if weight < 0:\n        raise ValueError("weight can\'t be negative")\n    if weight <= 1:\n        return "small"\n    if weight <= 5:\n        return "medium"\n    if weight < 20:\n        return "large"\n    raise ValueError("too heavy to ship")';
const BAND_NO_LIMIT =
  'def shipping_band(weight):\n    if weight < 0:\n        raise ValueError("weight can\'t be negative")\n    if weight <= 1:\n        return "small"\n    if weight <= 5:\n        return "medium"\n    return "large"';

// PY07-09: a correct calculate and four plausible bugs.
const CALC_OK =
  'def calculate(a, op, b):\n    if op == "+":\n        return a + b\n    if op == "-":\n        return a - b\n    if op == "*":\n        return a * b\n    if op == "/":\n        return a / b\n    raise ValueError(f"unknown operator {op!r}")';
const CALC_SUB_BACKWARDS = CALC_OK.replace("return a - b", "return b - a");
const CALC_FLOOR_DIV = CALC_OK.replace("return a / b", "return a // b");
const CALC_NO_ERROR = CALC_OK.replace('raise ValueError(f"unknown operator {op!r}")', "return None");
const CALC_ABS_MUL = CALC_OK.replace("return a * b", "return abs(a * b)");

const TRACK_OPEN = (call: string) =>
  [
    "import builtins",
    "_opened = []",
    "_real_open = builtins.open",
    "def _tracking_open(*args, **kwargs):",
    "    handle = _real_open(*args, **kwargs)",
    "    _opened.append(handle)",
    "    return handle",
    'with _real_open("broken.txt", "wb") as _out:',
    '    _out.write(b"first line\\n\\xff\\xfe not text\\n")',
    "builtins.open = _tracking_open",
    "try:",
    `    ${call}`,
    "except Exception:",
    "    pass",
    "finally:",
    "    builtins.open = _real_open",
    "result = [handle.closed for handle in _opened]",
  ].join("\n");

export const py07: PyQuestion[] = [
  {
    ref: "python:bank:py07-01",
    slug: "py07-01",
    module: "debugging",
    kind: "debug",
    difficulty: "medium",
    title: "Repair an off-by-one loop",
    topics: ["range", "off-by-one", "edge cases"],
    minutes: 4,
    after: "python:reading-tracebacks-and-locating-errors",
    prompt:
      "`total_quantity(lines)` should add up the `qty` of every order line. Totals come out too low. Find the off-by-one error and fix it, keeping the function's name and parameter. An empty order totals 0.",
    expectedOutput: "6\n",
    looksFor: ["Every line is counted, including the last.", "A single line and an empty list both work."],
    starter: 'def total_quantity(lines):\n    total = 0\n    for index in range(len(lines) - 1):\n        total += lines[index]["qty"]\n    return total\n\n\nprint(total_quantity([{"qty": 1}, {"qty": 2}, {"qty": 3}]))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "total_quantity",
          cases: [
            { args: [lines(1, 2, 3)], expected: i(6) },
            { args: [lines(5)], expected: i(5) },
            { args: [py.list()], expected: i(0) },
            { args: [lines(4, 0, 9, 1)], expected: i(14), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "6\n" },
      ],
    },
    hints: ["range(len(lines) - 1) stops one index early.", "range(len(lines)) covers every index.", 'Even simpler: for line in lines: total += line["qty"].'],
    answer: 'def total_quantity(lines):\n    total = 0\n    for line in lines:\n        total += line["qty"]\n    return total\n\n\nprint(total_quantity([{"qty": 1}, {"qty": 2}, {"qty": 3}]))',
    alternatives: ['def total_quantity(lines):\n    total = 0\n    for index in range(len(lines)):\n        total += lines[index]["qty"]\n    return total\n\n\nprint(total_quantity([{"qty": 1}, {"qty": 2}, {"qty": 3}]))\n'],
    wrong: [
      { code: 'def total_quantity(lines):\n    total = 0\n    for index in range(1, len(lines)):\n        total += lines[index]["qty"]\n    return total\n\n\nprint(total_quantity([{"qty": 1}, {"qty": 2}, {"qty": 3}]))\n', fails: ["fn", "output"], why: "Now the first line is skipped instead of the last." },
      { code: 'def total_quantity(lines):\n    total = 0\n    for index in range(len(lines) + 1):\n        total += lines[index]["qty"]\n    return total\n\n\nprint(total_quantity([{"qty": 1}, {"qty": 2}, {"qty": 3}]))\n', fails: "program" },
    ],
  },
  {
    ref: "python:bank:py07-02",
    slug: "py07-02",
    module: "debugging",
    kind: "debug",
    difficulty: "medium",
    title: "Fix shared state between calls",
    topics: ["mutable defaults", "None", "dictionaries"],
    minutes: 5,
    after: "python:scope-and-mutable-arguments",
    prompt:
      "`record_visit(user, counts=...)` adds one visit for `user` to a counts dictionary and returns it. Called without `counts`, it should start a **fresh** dictionary each time. Called with one, it should update and return that dictionary. Right now, visits from earlier calls leak into later ones.",
    expectedOutput: "{'ada': 1}\n{'ben': 1}\n",
    looksFor: ["Calls without `counts` don't share a dictionary.", "A dictionary passed in (even an empty one) is the one updated."],
    starter: 'def record_visit(user, counts={}):\n    counts[user] = counts.get(user, 0) + 1\n    return counts\n\n\nprint(record_visit("ada"))\nprint(record_visit("ben"))\n',
    task: {
      checks: [
        { kind: "expr", id: "fresh", label: "Two calls without counts don't share a dictionary", show: 'record_visit("x"); record_visit("y")', expr: 'record_visit("x")\nresult = record_visit("y")', expected: rec([["y", i(1)]]), tip: "A default dictionary is created once, when def runs. Default to None and make a new {} inside." },
        { kind: "expr", id: "given", label: "A given dictionary is updated", show: 'seen = {"x": 2}; record_visit("x", seen); seen', expr: 'seen = {"x": 2}\nrecord_visit("x", seen)\nresult = seen', expected: rec([["x", i(3)]]) },
        { kind: "expr", id: "given-empty", label: "A given empty dictionary is updated too", hidden: true, expr: "seen = {}\nrecord_visit(\"x\", seen)\nresult = seen", expected: rec([["x", i(1)]]), tip: "Test counts is None, not just whether counts is falsy: an empty dict passed in is still the caller's dict." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'ada': 1}\n{'ben': 1}\n" },
      ],
    },
    hints: ["Default arguments are evaluated once, when the function is defined.", "Use counts=None as the default.", "Inside: if counts is None: counts = {}."],
    answer: 'def record_visit(user, counts=None):\n    if counts is None:\n        counts = {}\n    counts[user] = counts.get(user, 0) + 1\n    return counts\n\n\nprint(record_visit("ada"))\nprint(record_visit("ben"))',
    wrong: [
      { code: 'def record_visit(user, counts=None):\n    if not counts:\n        counts = {}\n    counts[user] = counts.get(user, 0) + 1\n    return counts\n\n\nprint(record_visit("ada"))\nprint(record_visit("ben"))\n', fails: ["given-empty"] },
      { code: 'def record_visit(user, counts={}):\n    counts = dict(counts)\n    counts[user] = counts.get(user, 0) + 1\n    return counts\n\n\nprint(record_visit("ada"))\nprint(record_visit("ben"))\n', fails: ["given", "given-empty"] },
    ],
  },
  {
    ref: "python:bank:py07-03",
    slug: "py07-03",
    module: "debugging",
    kind: "write",
    difficulty: "medium",
    title: "Guard a division",
    topics: ["try", "ZeroDivisionError", "ValueError"],
    minutes: 5,
    after: "python:try-except-else-and-finally",
    prompt:
      "Write `average_order_value(revenue, orders)` returning `revenue / orders`. A day with **no orders** has no average: catch the `ZeroDivisionError` and return `None`. A negative order count is a data error: raise `ValueError`.",
    expectedOutput: "25.0\nNone\n",
    looksFor: ["Normal days return revenue divided by orders.", "Zero orders returns `None`, whatever the revenue.", "Negative orders raise `ValueError`."],
    starter: "def average_order_value(revenue, orders):\n    pass\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))\n",
    task: {
      checks: [
        {
          kind: "function",
          id: "values",
          label: "Returns the average, or None with no orders",
          name: "average_order_value",
          compare: close,
          cases: [
            { args: [i(100), i(4)], expected: f(25) },
            { args: [i(50), i(0)], expected: py.none },
            { args: [i(0), i(0)], expected: py.none },
            { args: [f(19.5), i(3)], expected: f(6.5), hidden: true },
          ],
        },
        { kind: "function", id: "negative", label: "Rejects negative order counts", name: "average_order_value", cases: [{ args: [i(10), i(-1)], raises: "ValueError" }] },
        { kind: "output", id: "output", label: "Prints the demo", expected: "25.0\nNone\n" },
      ],
    },
    hints: ["Check orders < 0 first and raise ValueError.", "try: return revenue / orders", "except ZeroDivisionError: return None."],
    answer:
      'def average_order_value(revenue, orders):\n    if orders < 0:\n        raise ValueError(f"orders can\'t be negative, got {orders}")\n    try:\n        return revenue / orders\n    except ZeroDivisionError:\n        return None\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))',
    alternatives: ['def average_order_value(revenue, orders):\n    if orders < 0:\n        raise ValueError("negative")\n    if orders == 0:\n        return None\n    return revenue / orders\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))\n'],
    wrong: [
      { code: "def average_order_value(revenue, orders):\n    if revenue == 0:\n        return None\n    return revenue / orders\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))\n", fails: "program" },
      { code: "def average_order_value(revenue, orders):\n    try:\n        return revenue / orders\n    except ZeroDivisionError:\n        return None\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))\n", fails: ["negative"] },
      { code: "def average_order_value(revenue, orders):\n    try:\n        if orders < 0:\n            raise ValueError(\"negative\")\n        return revenue / orders\n    except Exception:\n        return None\n\n\nprint(average_order_value(100, 4))\nprint(average_order_value(50, 0))\n", fails: ["negative"], why: "except Exception also swallows the ValueError the function meant to raise." },
    ],
  },
  {
    ref: "python:bank:py07-04",
    slug: "py07-04",
    module: "debugging",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: where did it fail?",
    topics: ["exceptions", "call stack", "partial output"],
    minutes: 5,
    after: "python:reading-tracebacks-and-locating-errors",
    prompt: "An exception raised deep inside nested calls travels back up until something catches it. What does this program print?",
    code: 'def parse_qty(text):\n    print("parsing", repr(text))\n    return int(text)\n\n\ndef order_total(lines):\n    total = 0\n    for price, qty in lines:\n        total += price * parse_qty(qty)\n    return total\n\n\ntry:\n    print(order_total([(2.5, "4"), (1.0, "two"), (3.0, "1")]))\nexcept ValueError as error:\n    print("failed:", type(error).__name__)\n    print(error)',
    output: "parsing '4'\nparsing 'two'\nfailed: ValueError\ninvalid literal for int() with base 10: 'two'\n",
    explanation:
      "`int(\"two\")` raises `ValueError` inside `parse_qty`, called from `order_total`, called from the `try`. Neither function catches it, so both stop immediately: the third line is never parsed and `order_total` never returns, so its `print` never runs. The `except` at the top catches it and prints the type and the message. A traceback would list the same chain: the `try` line, then line 9 in `order_total`, then line 3 in `parse_qty`.",
    hints: ["Which call raises, and is there an except between it and the top?", "Nothing after the failing call in either function runs."],
    wrong: ["parsing '4'\nparsing 'two'\nparsing '1'\nfailed: ValueError\ninvalid literal for int() with base 10: 'two'", "parsing '4'\nfailed: ValueError\ninvalid literal for int() with base 10: 'two'"],
  },
  {
    ref: "python:bank:py07-05",
    slug: "py07-05",
    module: "debugging",
    kind: "write",
    difficulty: "medium",
    title: "Validate a record with useful errors",
    topics: ["raise", "isinstance", "error messages"],
    minutes: 8,
    after: "python:raising-useful-errors",
    prompt:
      "Write `validate_order(order)`. It returns `True` for a valid order and otherwise raises an error naming the problem, First every field must be present (checked in the order `id`, `email`, `amount`); then the types are checked in the same order.\n\n- A missing field: `ValueError(\"missing field: <name>\")`\n- `id` not an `int`: `TypeError(\"id must be an int\")`\n- `email` not a `str`: `TypeError(\"email must be a str\")`\n- `amount` not an `int` or `float`: `TypeError(\"amount must be a number\")`. A `bool` doesn't count as a number here.",
    expectedOutput: "True\nValueError: missing field: email\n",
    looksFor: ["A valid order returns `True`.", "The first problem, in field order, is the one reported.", "Messages match the formats above exactly.", "`True`/`False` are rejected as amounts."],
    starter:
      'def validate_order(order):\n    pass\n\n\nprint(validate_order({"id": 7, "email": "a@x.com", "amount": 12.5}))\ntry:\n    validate_order({"id": 7, "amount": 12.5})\nexcept (ValueError, TypeError) as error:\n    print(f"{type(error).__name__}: {error}")\n',
    task: {
      checks: [
        { kind: "function", id: "valid", label: "Valid orders return True", name: "validate_order", cases: [{ args: [rec([["id", i(7)], ["email", s("a@x.com")], ["amount", f(12.5)]])], expected: b(true) }, { args: [rec([["id", i(1)], ["email", s("")], ["amount", i(0)]])], expected: b(true), hidden: true }] },
        { kind: "expr", id: "missing", label: "A missing field is named", show: 'validate_order({"email": "a@x.com", "amount": 1})', expr: errorOf('validate_order({"email": "a@x.com", "amount": 1})'), expected: s("ValueError: missing field: id") },
        { kind: "expr", id: "types", label: "A wrong type is named", show: 'validate_order({"id": "7", "email": "a@x.com", "amount": 1})', expr: errorOf('validate_order({"id": "7", "email": "a@x.com", "amount": 1})'), expected: s("TypeError: id must be an int") },
        { kind: "expr", id: "order", label: "Fields are checked in order", hidden: true, expr: errorOf('validate_order({"id": 1, "email": 5, "amount": "x"})'), expected: s("TypeError: email must be a str") },
        { kind: "expr", id: "bool", label: "A bool isn't accepted as an amount", show: 'validate_order({"id": 1, "email": "a@x.com", "amount": True})', expr: errorOf('validate_order({"id": 1, "email": "a@x.com", "amount": True})'), expected: s("TypeError: amount must be a number"), tip: "bool is a subclass of int, so isinstance(True, int) is True. Check for bool first." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "True\nValueError: missing field: email\n" },
      ],
    },
    hints: ['Loop over ["id", "email", "amount"] and raise ValueError(f"missing field: {name}") for the first one not in order.', 'Then check each type with isinstance(...) and raise TypeError with the exact message.', "For amount: isinstance(amount, bool) or not isinstance(amount, (int, float))."],
    answer:
      'def validate_order(order):\n    for name in ["id", "email", "amount"]:\n        if name not in order:\n            raise ValueError(f"missing field: {name}")\n    if not isinstance(order["id"], int):\n        raise TypeError("id must be an int")\n    if not isinstance(order["email"], str):\n        raise TypeError("email must be a str")\n    amount = order["amount"]\n    if isinstance(amount, bool) or not isinstance(amount, (int, float)):\n        raise TypeError("amount must be a number")\n    return True\n\n\nprint(validate_order({"id": 7, "email": "a@x.com", "amount": 12.5}))\ntry:\n    validate_order({"id": 7, "amount": 12.5})\nexcept (ValueError, TypeError) as error:\n    print(f"{type(error).__name__}: {error}")',
    wrong: [
      { code: 'def validate_order(order):\n    for name in ["id", "email", "amount"]:\n        if name not in order:\n            raise ValueError(f"missing field: {name}")\n    if not isinstance(order["id"], int):\n        raise TypeError("id must be an int")\n    if not isinstance(order["email"], str):\n        raise TypeError("email must be a str")\n    if not isinstance(order["amount"], (int, float)):\n        raise TypeError("amount must be a number")\n    return True\n\n\nprint(validate_order({"id": 7, "email": "a@x.com", "amount": 12.5}))\ntry:\n    validate_order({"id": 7, "amount": 12.5})\nexcept (ValueError, TypeError) as error:\n    print(f"{type(error).__name__}: {error}")\n', fails: ["bool"] },
      { code: 'def validate_order(order):\n    order["id"]\n    order["email"]\n    order["amount"]\n    return True\n\n\nprint(validate_order({"id": 7, "email": "a@x.com", "amount": 12.5}))\ntry:\n    validate_order({"id": 7, "amount": 12.5})\nexcept (ValueError, TypeError) as error:\n    print(f"{type(error).__name__}: {error}")\n', fails: "program" },
    ],
  },
  {
    ref: "python:bank:py07-06",
    slug: "py07-06",
    module: "debugging",
    kind: "write",
    difficulty: "medium",
    title: "Write edge-case tests",
    topics: ["assert", "boundaries", "testing"],
    minutes: 8,
    after: "python:testing-edge-cases-and-avoiding-brittle-code",
    prompt:
      "`shipping_band(weight)` is already written: up to and including 1 kg is `\"small\"`, up to 5 is `\"medium\"`, up to 20 is `\"large\"`; above 20, or below 0, it raises `ValueError`. Write `test_shipping_band()` using `assert` so that it **passes** for this function and **fails** for versions that get a boundary wrong. Check answer runs your test against the real function and three broken ones.",
    looksFor: ["The test passes for the correct function.", "It catches `< 1` written instead of `<= 1`.", "It catches `< 20` written instead of `<= 20`.", "It catches a version that never rejects weights over 20."],
    starter: `${BAND_OK}\n\n\ndef test_shipping_band():\n    assert shipping_band(3) == "medium"\n\n\ntest_shipping_band()\nprint("tests passed")\n`,
    task: {
      checks: [
        {
          kind: "expr",
          id: "mutants",
          label: "Your test passes for the real function and fails for each broken one",
          show: "test_shipping_band() with the correct function, then three broken ones",
          expr: mutationCheck("test_shipping_band", "shipping_band", [BAND_OK, BAND_LOW_EDGE, BAND_HIGH_EDGE, BAND_NO_LIMIT]),
          expected: py.list(b(true), b(false), b(false), b(false)),
          tip: "Test the exact boundary values (1, 20) and just past the top (20.5), where a ValueError must be raised.",
        },
        { kind: "output", id: "output", label: "The test passes when run", expected: "tests passed\n" },
      ],
    },
    hints: ["Bugs hide at boundaries: test exactly 1, 5 and 20.", "For the error, call shipping_band(21) inside try / except ValueError, with else: raise AssertionError(...).", "A test of 3 kg alone can't tell < 1 from <= 1."],
    answer: `${BAND_OK}\n\n\ndef test_shipping_band():\n    assert shipping_band(0) == "small"\n    assert shipping_band(1) == "small"\n    assert shipping_band(1.5) == "medium"\n    assert shipping_band(5) == "medium"\n    assert shipping_band(20) == "large"\n    for bad in [-1, 21]:\n        try:\n            shipping_band(bad)\n        except ValueError:\n            pass\n        else:\n            raise AssertionError(f"expected ValueError for {bad}")\n\n\ntest_shipping_band()\nprint("tests passed")`,
    wrong: [
      { code: `${BAND_OK}\n\n\ndef test_shipping_band():\n    assert shipping_band(0.5) == "small"\n    assert shipping_band(3) == "medium"\n    assert shipping_band(10) == "large"\n\n\ntest_shipping_band()\nprint("tests passed")\n`, fails: ["mutants"], why: "Only middle-of-the-range values: every broken version agrees with them." },
      { code: `${BAND_OK}\n\n\ndef test_shipping_band():\n    assert shipping_band(1) == "small"\n    assert shipping_band(20) == "large"\n    try:\n        shipping_band(21)\n    except ValueError:\n        pass\n\n\ntest_shipping_band()\nprint("tests passed")\n`, fails: ["mutants"], why: "Without else: raise AssertionError, the test passes when no error is raised." },
    ],
  },
  {
    ref: "python:bank:py07-07",
    slug: "py07-07",
    module: "debugging",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: a copy that isn't",
    topics: ["aliasing", "shallow copy", "nested data"],
    minutes: 6,
    after: "python:scope-and-mutable-arguments",
    prompt:
      "`apply_discount(orders, percent)` should return **new** order dictionaries with `price` reduced by `percent` (rounded to 2 places), leaving the caller's orders untouched. It copies the list, but the original prices still change. Fix it.",
    expectedOutput: "[{'id': 1, 'price': 9.0}, {'id': 2, 'price': 18.0}]\n[{'id': 1, 'price': 10.0}, {'id': 2, 'price': 20.0}]\n",
    looksFor: ["The returned orders have discounted prices.", "The caller's list and the dictionaries inside it are unchanged.", "Other fields are kept."],
    starter:
      'def apply_discount(orders, percent):\n    result = orders.copy()\n    for order in result:\n        order["price"] = round(order["price"] * (1 - percent / 100), 2)\n    return result\n\n\nbasket = [{"id": 1, "price": 10.0}, {"id": 2, "price": 20.0}]\nprint(apply_discount(basket, 10))\nprint(basket)\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "apply_discount",
          compare: close,
          cases: [
            { args: [py.list(rec([["id", i(1)], ["price", f(10)]])), i(10)], expected: py.list(rec([["id", i(1)], ["price", f(9)]])) },
            { args: [py.list(), i(50)], expected: py.list() },
            { args: [py.list(rec([["id", i(3)], ["price", f(9.99)], ["sku", s("X")]])), i(15)], expected: py.list(rec([["id", i(3)], ["price", f(8.49)], ["sku", s("X")]])), hidden: true },
          ],
        },
        {
          kind: "expr",
          id: "untouched",
          label: "The caller's orders keep their prices",
          show: 'orders = [{"id": 1, "price": 10.0}]; apply_discount(orders, 50); orders',
          expr: 'orders = [{"id": 1, "price": 10.0}]\napply_discount(orders, 50)\nresult = orders',
          expected: py.list(rec([["id", i(1)], ["price", f(10)]])),
          tip: "orders.copy() makes a new list holding the same dictionaries. Build a new dictionary for each order.",
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'id': 1, 'price': 9.0}, {'id': 2, 'price': 18.0}]\n[{'id': 1, 'price': 10.0}, {'id': 2, 'price': 20.0}]\n" },
      ],
    },
    hints: ["A list copy is shallow: both lists hold the very same dictionaries.", "Changing order[\"price\"] changes the dictionary the caller also holds.", 'Build new ones: {**order, "price": ...}.'],
    answer:
      'def apply_discount(orders, percent):\n    result = []\n    for order in orders:\n        result.append({**order, "price": round(order["price"] * (1 - percent / 100), 2)})\n    return result\n\n\nbasket = [{"id": 1, "price": 10.0}, {"id": 2, "price": 20.0}]\nprint(apply_discount(basket, 10))\nprint(basket)',
    alternatives: ['import copy\n\n\ndef apply_discount(orders, percent):\n    result = copy.deepcopy(orders)\n    for order in result:\n        order["price"] = round(order["price"] * (1 - percent / 100), 2)\n    return result\n\n\nbasket = [{"id": 1, "price": 10.0}, {"id": 2, "price": 20.0}]\nprint(apply_discount(basket, 10))\nprint(basket)\n'],
    wrong: [
      { code: 'def apply_discount(orders, percent):\n    result = list(orders)\n    for order in result:\n        order["price"] = round(order["price"] * (1 - percent / 100), 2)\n    return result\n\n\nbasket = [{"id": 1, "price": 10.0}, {"id": 2, "price": 20.0}]\nprint(apply_discount(basket, 10))\nprint(basket)\n', fails: ["untouched", "output"] },
      { code: 'def apply_discount(orders, percent):\n    result = []\n    for order in orders:\n        result.append({"price": round(order["price"] * (1 - percent / 100), 2)})\n    return result\n\n\nbasket = [{"id": 1, "price": 10.0}, {"id": 2, "price": 20.0}]\nprint(apply_discount(basket, 10))\nprint(basket)\n', fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py07-08",
    slug: "py07-08",
    module: "debugging",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: close the file even on errors",
    topics: ["with", "files", "FileNotFoundError"],
    minutes: 6,
    after: "python:working-with-text-files-safely",
    prompt:
      "`count_lines(path)` returns how many non-blank lines a UTF-8 text file has, or `None` if the file doesn't exist. Two problems: a missing file gives `0` (as if it were empty), and if reading fails halfway (say the file isn't valid UTF-8) the file is never closed. Fix both. Any error other than a missing file should still reach the caller.",
    expectedOutput: "2\nNone\n",
    looksFor: ["Non-blank lines are counted.", "A missing file returns `None`.", "The file is closed even when reading raises.", "Other errors aren't swallowed."],
    starter:
      'def count_lines(path):\n    try:\n        handle = open(path, encoding="utf-8")\n        count = 0\n        for line in handle:\n            if line.strip():\n                count += 1\n        handle.close()\n        return count\n    except FileNotFoundError:\n        return 0\n\n\nprint(count_lines("notes.txt"))\nprint(count_lines("missing.txt"))\n',
    files: { "notes.txt": "first\n\n   \nsecond\n" },
    task: {
      checks: [
        { kind: "expr", id: "counts", label: "Counts non-blank lines", show: 'count_lines("notes.txt")', expr: 'count_lines("notes.txt")', expected: i(2) },
        { kind: "expr", id: "missing", label: "A missing file returns None", show: 'count_lines("missing.txt")', expr: 'count_lines("missing.txt")', expected: py.none },
        { kind: "expr", id: "closed", label: "The file is closed when reading fails", show: "count_lines on a file that isn't valid UTF-8", expr: TRACK_OPEN('count_lines("broken.txt")'), expected: py.list(b(true)), tip: "with open(...) as handle: closes the file however the block ends." },
        { kind: "expr", id: "raises", label: "A decoding error still reaches the caller", hidden: true, expr: 'with open("broken2.txt", "wb") as _out:\n    _out.write(b"\\xff")\ntry:\n    count_lines("broken2.txt")\n    result = "no error"\nexcept UnicodeDecodeError:\n    result = "UnicodeDecodeError"', expected: s("UnicodeDecodeError"), tip: "Catch only FileNotFoundError." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "2\nNone\n" },
      ],
    },
    hints: ["with open(path, encoding=\"utf-8\") as handle: closes the file when the block ends, even by an exception.", "Return None in the except FileNotFoundError branch.", "Don't widen the except: other errors should propagate."],
    answer:
      'def count_lines(path):\n    try:\n        with open(path, encoding="utf-8") as handle:\n            count = 0\n            for line in handle:\n                if line.strip():\n                    count += 1\n            return count\n    except FileNotFoundError:\n        return None\n\n\nprint(count_lines("notes.txt"))\nprint(count_lines("missing.txt"))',
    wrong: [
      { code: 'def count_lines(path):\n    try:\n        handle = open(path, encoding="utf-8")\n        count = 0\n        for line in handle:\n            if line.strip():\n                count += 1\n        handle.close()\n        return count\n    except FileNotFoundError:\n        return None\n\n\nprint(count_lines("notes.txt"))\nprint(count_lines("missing.txt"))\n', fails: ["closed"] },
      { code: 'def count_lines(path):\n    try:\n        with open(path, encoding="utf-8") as handle:\n            return sum(1 for line in handle if line.strip())\n    except Exception:\n        return None\n\n\nprint(count_lines("notes.txt"))\nprint(count_lines("missing.txt"))\n', fails: ["raises"] },
    ],
  },
  {
    ref: "python:bank:py07-09",
    slug: "py07-09",
    module: "debugging",
    kind: "write",
    difficulty: "medium",
    title: "Test a calculator",
    topics: ["assert", "testing", "exceptions"],
    minutes: 8,
    after: "python:testing-edge-cases-and-avoiding-brittle-code",
    prompt:
      "`calculate(a, op, b)` supports `+`, `-`, `*` and `/` (true division) and raises `ValueError` for any other operator. Write `test_calculate()` so that it passes for this function and fails for four plausible bugs: operands swapped in subtraction, floor division instead of true division, a missing error for unknown operators, and a sign lost in multiplication.",
    looksFor: ["Passes for the correct `calculate`.", "Uses inputs where the bugs give different answers: negative numbers, a division that isn't whole.", "Checks that an unknown operator raises `ValueError`."],
    starter: `${CALC_OK}\n\n\ndef test_calculate():\n    assert calculate(2, "+", 3) == 5\n\n\ntest_calculate()\nprint("tests passed")\n`,
    task: {
      checks: [
        {
          kind: "expr",
          id: "mutants",
          label: "Your test passes for the real function and fails for each broken one",
          show: "test_calculate() with the correct function, then four broken ones",
          expr: mutationCheck("test_calculate", "calculate", [CALC_OK, CALC_SUB_BACKWARDS, CALC_FLOOR_DIV, CALC_NO_ERROR, CALC_ABS_MUL]),
          expected: py.list(b(true), b(false), b(false), b(false), b(false)),
          tip: "5 - 3 vs 3 - 5, 7 / 2 = 3.5, -2 * 3 = -6, and an unknown operator like \"%\" inside try/except/else.",
        },
        { kind: "output", id: "output", label: "The test passes when run", expected: "tests passed\n" },
      ],
    },
    hints: ["Pick inputs where each bug changes the answer: 5 - 3 isn't 3 - 5.", "7 / 2 is 3.5 but 7 // 2 is 3; -2 * 3 is -6, not 6.", 'For "%": try: calculate(1, "%", 2) except ValueError: pass else: raise AssertionError(...).'],
    answer: `${CALC_OK}\n\n\ndef test_calculate():\n    assert calculate(2, "+", 3) == 5\n    assert calculate(5, "-", 3) == 2\n    assert calculate(-2, "*", 3) == -6\n    assert calculate(7, "/", 2) == 3.5\n    try:\n        calculate(1, "%", 2)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError("expected ValueError for an unknown operator")\n\n\ntest_calculate()\nprint("tests passed")`,
    wrong: [
      { code: `${CALC_OK}\n\n\ndef test_calculate():\n    assert calculate(2, "+", 3) == 5\n    assert calculate(3, "-", 3) == 0\n    assert calculate(2, "*", 3) == 6\n    assert calculate(8, "/", 2) == 4\n\n\ntest_calculate()\nprint("tests passed")\n`, fails: ["mutants"], why: "Every one of these inputs gives the same answer with the bugs." },
    ],
  },
  {
    ref: "python:bank:py07-10",
    slug: "py07-10",
    module: "debugging",
    kind: "debug",
    difficulty: "medium",
    title: "Correct a timestamp parser",
    topics: ["datetime", "leap years", "narrow except"],
    minutes: 8,
    after: "python:dates-times-and-time-zones",
    prompt:
      "`parse_timestamp(text)` turns `\"YYYY-MM-DD HH:MM\"` into a `datetime`, or returns `None` when the text isn't a real timestamp. It wrongly rejects every 29 February (including leap years), and its `except Exception` hides programming mistakes: passing something that isn't a string should raise `TypeError`, not return `None`. Fix both.",
    expectedOutput: "2028-02-29 09:30:00\nNone\n",
    looksFor: ["Real timestamps parse, including 29 February in leap years.", "Impossible dates and malformed text give `None`.", "A non-string argument raises `TypeError`."],
    starter:
      'from datetime import datetime\n\n\ndef parse_timestamp(text):\n    try:\n        date_part, time_part = text.split(" ")\n        year, month, day = [int(p) for p in date_part.split("-")]\n        if month == 2 and day > 28:\n            return None\n        hour, minute = [int(p) for p in time_part.split(":")]\n        return datetime(year, month, day, hour, minute)\n    except Exception:\n        return None\n\n\nprint(parse_timestamp("2028-02-29 09:30"))\nprint(parse_timestamp("2026-02-29 09:30"))\n',
    task: {
      checks: [
        {
          kind: "expr",
          id: "parses",
          label: "Real timestamps parse; impossible ones give None",
          show: 'parse_timestamp(...) for "2026-10-14 08:05", "2028-02-29 09:30", "2026-02-29 09:30", "2026-13-01 00:00"',
          expr: 'result = []\nfor _t in ["2026-10-14 08:05", "2028-02-29 09:30", "2026-02-29 09:30", "2026-13-01 00:00"]:\n    _r = parse_timestamp(_t)\n    result.append(None if _r is None else _r.isoformat())',
          expected: py.list(s("2026-10-14T08:05:00"), s("2028-02-29T09:30:00"), py.none, py.none),
        },
        {
          kind: "expr",
          id: "malformed",
          label: "Malformed text gives None",
          hidden: true,
          expr: 'result = [parse_timestamp(_t) for _t in ["", "2026-10-14", "2026-10-14 25:00", "yesterday"]]',
          expected: py.list(py.none, py.none, py.none, py.none),
        },
        { kind: "expr", id: "type", label: "A non-string raises TypeError", show: "parse_timestamp(None)", expr: "parse_timestamp(None)", raises: "TypeError", tip: "Check isinstance(text, str) first, and catch only ValueError." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "2028-02-29 09:30:00\nNone\n" },
      ],
    },
    hints: ["datetime already knows which years are leap years: let it decide.", 'datetime.strptime(text, "%Y-%m-%d %H:%M") raises ValueError for anything that isn\'t a real timestamp.', "Raise TypeError for non-strings before the try, and catch only ValueError."],
    answer:
      'from datetime import datetime\n\n\ndef parse_timestamp(text):\n    if not isinstance(text, str):\n        raise TypeError(f"expected a string, got {type(text).__name__}")\n    try:\n        return datetime.strptime(text, "%Y-%m-%d %H:%M")\n    except ValueError:\n        return None\n\n\nprint(parse_timestamp("2028-02-29 09:30"))\nprint(parse_timestamp("2026-02-29 09:30"))',
    wrong: [
      { code: 'from datetime import datetime\n\n\ndef parse_timestamp(text):\n    try:\n        return datetime.strptime(text, "%Y-%m-%d %H:%M")\n    except Exception:\n        return None\n\n\nprint(parse_timestamp("2028-02-29 09:30"))\nprint(parse_timestamp("2026-02-29 09:30"))\n', fails: ["type"] },
      { code: 'from datetime import datetime\n\n\ndef parse_timestamp(text):\n    if not isinstance(text, str):\n        raise TypeError("expected a string")\n    try:\n        date_part, time_part = text.split(" ")\n        year, month, day = [int(p) for p in date_part.split("-")]\n        if month == 2 and day > 28:\n            return None\n        hour, minute = [int(p) for p in time_part.split(":")]\n        return datetime(year, month, day, hour, minute)\n    except ValueError:\n        return None\n\n\nprint(parse_timestamp("2028-02-29 09:30"))\nprint(parse_timestamp("2026-02-29 09:30"))\n', fails: ["parses", "output"] },
    ],
  },
];
