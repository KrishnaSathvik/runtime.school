import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));

export const commonExceptionsAndDefensiveChecks: PyLesson = {
  slug: "common-exceptions-and-defensive-checks",
  ref: "python:common-exceptions-and-defensive-checks",
  module: "debugging",
  number: 2,
  title: "Common exceptions and defensive checks",
  level: "intermediate",
  summary:
    "Recognise the exceptions you'll meet most, know what each one means, and write checks that keep bad input from reaching the line that would fail: missing keys, empty lists, wrong types and impossible values.",

  sections: [
    {
      label: "the usual suspects",
      blocks: [
        {
          kind: "p",
          text: "`TypeError`: an operation got the wrong **type** (`\"3\" + 4`, `None * 2`, calling something that isn't a function). `ValueError`: the type was right but the **value** wasn't acceptable (`int(\"abc\")`). `KeyError`: a dictionary key doesn't exist. `IndexError`: a list position doesn't exist. `AttributeError`: a value has no such method or attribute (`None.strip()`). `ZeroDivisionError`: dividing by zero. `NameError`: a name was never assigned (often a typo).",
        },
        {
          kind: "p",
          text: "Many of these share one root cause: a value is `None`, empty, or missing when the code assumed it wouldn't be. `AttributeError: 'NoneType' object has no attribute …` almost always means a function returned `None` where you expected a value.",
        },
      ],
    },
    {
      label: "defensive checks",
      blocks: [
        {
          kind: "p",
          text: "A **defensive check** tests for the bad case before the code that would fail, and handles it deliberately: return a documented default, skip the item, or raise a clear error. `if key in record`, `record.get(key)`, `if not items`, `if value is None` and `isinstance(value, int)` are the everyday tools.",
        },
        { kind: "code", code: 'def read_quantity(record):\n    value = record.get("qty")\n    if value is None:\n        return 0\n    if isinstance(value, str):\n        value = value.strip()\n        if not value.isdigit():\n            raise ValueError(f"qty is not a whole number: {value!r}")\n        value = int(value)\n    return value' },
        {
          kind: "p",
          text: "`isinstance(value, str)` asks whether `value` is a string; `isinstance(value, (int, float))` accepts either type. Be careful with booleans: `True` counts as an `int`, so `isinstance(True, int)` is `True`.",
        },
      ],
    },
    {
      label: "check first, or try and handle",
      blocks: [
        {
          kind: "p",
          text: "Checking before acting is called **look before you leap**. The alternative, **easier to ask forgiveness than permission**, is to try the operation and handle the error if it happens; that's the next lesson. Checking first is clearest when the bad case is common and easy to describe; handling errors is better when the check would duplicate the operation (like checking whether text is a valid float).",
        },
      ],
    },
  ],

  example: {
    caption: "Reading a quantity defensively from messy records. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def read_quantity(record):\n    value = record.get("qty")\n    if value is None:\n        return 0\n    if isinstance(value, str):\n        value = value.strip()\n        if not value.isdigit():\n            raise ValueError(f"qty is not a whole number: {value!r}")\n        value = int(value)\n    return value\n\n\nfor record in [{"qty": 3}, {"qty": " 12 "}, {}, {"qty": None}]:\n    print(record, "->", read_quantity(record))\nread_quantity({"qty": "two"})',
  },

  walkthrough: [
    {
      title: "Five errors, five causes",
      text: "Each line is tried separately (with `try`, covered next lesson) so you can see every message. Read each type and message together.",
      code: 'tests = [\n    lambda: "3" + 4,\n    lambda: int("abc"),\n    lambda: {"a": 1}["b"],\n    lambda: [1, 2][5],\n    lambda: None.strip(),\n]\nfor test in tests:\n    try:\n        test()\n    except Exception as error:\n        print(type(error).__name__ + ":", error)',
    },
    {
      title: "None is the usual culprit",
      text: "`find` returns `None` when nothing matches, and the next line assumes a string.",
      code: 'def find(names, start):\n    for name in names:\n        if name.startswith(start):\n            return name\n\nresult = find(["ada", "ben"], "z")\nprint(result)\nprint(result.upper())',
    },
    {
      title: "Check before you use",
      text: "Each check handles one way the input can be unusual, before the line that would fail.",
      code: 'def unit_price(order):\n    if "total" not in order or "qty" not in order:\n        return None\n    if order["qty"] == 0:\n        return None\n    return order["total"] / order["qty"]\n\nprint(unit_price({"total": 10, "qty": 4}))\nprint(unit_price({"total": 10}))\nprint(unit_price({"total": 10, "qty": 0}))',
    },
    {
      title: "isinstance checks types",
      text: "`isinstance` accepts a tuple of types. Note that `True` is an `int`.",
      code: 'for value in [3, 2.5, "3", None, True]:\n    print(repr(value), isinstance(value, (int, float)), isinstance(value, str))',
    },
  ],

  mistakes: [
    {
      title: "Using a result that might be None",
      text: "`get` returns `None` for a missing key, and `None` has no `.strip()`: `AttributeError`.",
      code: 'record = {"name": "Ada"}\nemail = record.get("email")\nprint(email.strip())',
      raises: "AttributeError",
      fix: "Check before using it: `if email is not None:`, or give `get` a default: `record.get(\"email\", \"\")`.",
    },
    {
      title: "Checking the wrong thing",
      text: "The check tests whether the list exists, but an empty list still reaches the division: `ZeroDivisionError`.",
      code: "values = []\nif values is not None:\n    print(sum(values) / len(values))",
      raises: "ZeroDivisionError",
      fix: "Check for the case that actually breaks the code: `if values:` (not empty).",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Read a quantity defensively",
      prompt:
        "Write `read_quantity(record)`, which returns the order quantity from a record dictionary as an int. A missing `qty` key, or a `qty` of `None`, means 0. A `qty` given as text (with possible spaces around it) is converted. Anything else that isn't a whole number of at least 0 (a negative number, or text like `\"two\"`) raises `ValueError`.",
      looksFor: [
        "Missing or `None` quantities give `0`; ints are returned as they are.",
        "Text quantities like `\" 12 \"` are stripped and converted to `12`.",
        "Negative numbers and non-numeric text raise `ValueError`.",
      ],
      starter: "def read_quantity(record):\n    # Return the quantity as an int; see the rules above.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "read_quantity",
            cases: [
              { args: [rec([["qty", i(3)]])], expected: i(3) },
              { args: [rec([["qty", s(" 12 ")]])], expected: i(12) },
              { args: [rec([])], expected: i(0) },
              { args: [rec([["qty", py.none]])], expected: i(0) },
              { args: [rec([["qty", s("two")]])], raises: "ValueError" },
              { args: [rec([["qty", i(-2)]])], raises: "ValueError" },
              { args: [rec([["qty", s("0")], ["sku", s("A1")]])], expected: i(0), hidden: true },
              { args: [rec([["qty", s("-5")]])], raises: "ValueError", hidden: true },
            ],
            tip: 'Use record.get("qty") and handle each case in turn: None, text, then the final check that it isn\'t negative.',
          },
        ],
      },
      hints: [
        'value = record.get("qty"); if value is None: return 0.',
        'If isinstance(value, str): strip it; if it isn\'t .isdigit(), raise ValueError; otherwise convert with int().',
        "Finally: if value < 0: raise ValueError(...). Return value.",
      ],
      answer: 'def read_quantity(record):\n    """Return record["qty"] as an int (0 if missing). Raises ValueError for invalid quantities."""\n    value = record.get("qty")\n    if value is None:\n        return 0\n    if isinstance(value, str):\n        value = value.strip()\n        if not value.isdigit():\n            raise ValueError(f"qty is not a whole number: {value!r}")\n        value = int(value)\n    if value < 0:\n        raise ValueError(f"qty must not be negative: {value}")\n    return value',
      wrong: [
        { code: 'def read_quantity(record):\n    return int(record["qty"])\n', fails: ["fn"], why: "KeyError and TypeError instead of 0" },
        { code: 'def read_quantity(record):\n    value = record.get("qty")\n    if value is None:\n        return 0\n    return int(value)\n', fails: ["fn"], why: "accepts negative quantities" },
      ],
    },
    {
      id: "challenge-2",
      title: "Make a summary survive odd input",
      prompt:
        "`summarize(orders)` reports the number of orders, the average order total and the largest total, as a dictionary. It works for normal input but crashes on an empty list, on orders missing `total`, and on totals of `None`. Fix it with defensive checks: skip orders without a usable total, and when no order has one, return `{\"count\": 0, \"average\": None, \"largest\": None}`.",
      looksFor: [
        "Orders whose `total` is missing or `None` are skipped, not counted.",
        "With no usable totals (including an empty list), `average` and `largest` are `None` and `count` is `0`.",
        "Normal input still gives the right count, average and largest.",
      ],
      starter: 'def summarize(orders):\n    totals = [order["total"] for order in orders]\n    return {\n        "count": len(totals),\n        "average": sum(totals) / len(totals),\n        "largest": max(totals),\n    }\n\n\nprint(summarize([{"total": 40.0}, {"total": 22.5}]))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "summarize",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [py.list(rec([["total", f(40)]]), rec([["total", f(22.5)]]))], expected: rec([["count", i(2)], ["average", f(31.25)], ["largest", f(40)]]) },
              { args: [py.list()], expected: rec([["count", i(0)], ["average", py.none], ["largest", py.none]]) },
              { args: [py.list(rec([["total", f(10)]]), rec([["id", i(2)]]))], expected: rec([["count", i(1)], ["average", f(10)], ["largest", f(10)]]) },
              { args: [py.list(rec([["total", py.none]]), rec([["total", f(30)]]), rec([["total", f(10)]]))], expected: rec([["count", i(2)], ["average", f(20)], ["largest", f(30)]]), hidden: true },
              { args: [py.list(rec([["total", py.none]]))], expected: rec([["count", i(0)], ["average", py.none], ["largest", py.none]]), hidden: true },
            ],
            tip: 'Collect only usable totals: [o["total"] for o in orders if o.get("total") is not None], then handle an empty result before dividing.',
          },
        ],
      },
      hints: [
        "Run it with summarize([]) and summarize([{\"id\": 2}]) to see two of the crashes.",
        'Build totals from order.get("total"), keeping only values that aren\'t None.',
        'if not totals: return {"count": 0, "average": None, "largest": None}.',
      ],
      answer: 'def summarize(orders):\n    totals = [order.get("total") for order in orders]\n    totals = [t for t in totals if t is not None]\n    if not totals:\n        return {"count": 0, "average": None, "largest": None}\n    return {\n        "count": len(totals),\n        "average": sum(totals) / len(totals),\n        "largest": max(totals),\n    }\n\n\nprint(summarize([{"total": 40.0}, {"total": 22.5}]))',
      wrong: [
        { code: 'def summarize(orders):\n    totals = [order.get("total", 0) for order in orders]\n    if not totals:\n        return {"count": 0, "average": None, "largest": None}\n    return {"count": len(totals), "average": sum(totals) / len(totals), "largest": max(totals)}\n', fails: ["fn"], why: "counts missing totals as 0" },
        { code: 'def summarize(orders):\n    totals = [o["total"] for o in orders if "total" in o]\n    if not totals:\n        return {"count": 0, "average": None, "largest": None}\n    return {"count": len(totals), "average": sum(totals) / len(totals), "largest": max(totals)}\n', fails: ["fn"], why: "a total of None still gets through" },
      ],
    },
  ],

  quiz: [
    {
      id: "which-error",
      prompt: "`config = {\"debug\": True}`. What does `config[\"verbose\"]` raise?",
      options: [
        { text: "`KeyError`", correct: true, why: "Reading a dictionary key that doesn't exist is a `KeyError`. `config.get(\"verbose\")` would return `None` instead." },
        { text: "`IndexError`", why: "`IndexError` is for list and string positions; dictionaries look up keys." },
        { text: "`AttributeError`", why: "That's for missing methods or attributes, written with a dot." },
        { text: "Nothing: it returns `None`", why: "Only `get()` returns `None` for a missing key; square brackets raise." },
      ],
    },
    {
      id: "none-attr",
      prompt: "What usually causes `AttributeError: 'NoneType' object has no attribute 'lower'`?",
      options: [
        { text: "A variable holds `None`, often because a function returned nothing, and the code called `.lower()` on it", correct: true, why: "`NoneType` is the type of `None`. Find where the value came from and why it was `None`." },
        { text: "The `lower` method was misspelled", why: "A misspelling would name the object's real type, such as `'str' object has no attribute 'lowr'`." },
        { text: "Strings can't be lowercased", why: "Strings have `lower()`; the value here isn't a string." },
        { text: "`lower` needs an argument", why: "A missing argument is a `TypeError`, not an `AttributeError`." },
      ],
    },
  ],

  outcomes: [
    "Recognise `TypeError`, `ValueError`, `KeyError`, `IndexError`, `AttributeError` and `ZeroDivisionError`, and what usually causes each.",
    "Trace an `AttributeError` on `NoneType` back to where the `None` came from.",
    "Write defensive checks with `in`, `get`, `is None`, emptiness tests and `isinstance`.",
    "Handle each unusual input deliberately: a default, a skip, or a clear error.",
  ],
};
