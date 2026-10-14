import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { errorOf } from "../../checks";

const s = py.str;
const i = py.int;
const f = py.float;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));


export const raisingUsefulErrors: PyLesson = {
  slug: "raising-useful-errors",
  ref: "python:raising-useful-errors",
  module: "debugging",
  number: 4,
  title: "Raising useful errors",
  level: "intermediate",
  summary:
    "Stop bad input at the door with `raise`: pick the exception type that fits, write a message that says what was wrong and what was expected, define your own exception class when callers need to tell your errors apart, and add context when re-raising.",

  sections: [
    {
      label: "raise the right type",
      blocks: [
        {
          kind: "p",
          text: "`raise ValueError(\"…\")` stops the function and sends the error to the caller. Choose the type by what's wrong: `TypeError` when an argument is the wrong kind of thing, `ValueError` when it's the right kind but an unacceptable value, `KeyError` for a missing key in a mapping. Callers can then catch exactly the errors they can handle.",
        },
      ],
    },
    {
      label: "write a message someone can act on",
      blocks: [
        {
          kind: "p",
          text: "A good message names the field, shows the bad value with `!r` (so empty strings and spaces are visible), and says what was expected: `ValueError: quantity must be a positive whole number, got -3`. “Invalid input” makes the reader do all the work again.",
        },
        { kind: "code", code: 'if quantity <= 0:\n    raise ValueError(f"quantity must be a positive whole number, got {quantity!r}")' },
      ],
    },
    {
      label: "your own exception types",
      blocks: [
        {
          kind: "p",
          text: "A two-line class defines a new exception type: `class OutOfStockError(Exception): pass`. Classes are covered in Practical Python Patterns; for exceptions this is all you need. Raise it like any other, and callers can write `except OutOfStockError:` to handle just that case. Basing it on an existing type (`class OrderError(ValueError):`) means code that catches `ValueError` catches it too.",
        },
      ],
    },
    {
      label: "re-raising with context",
      blocks: [
        {
          kind: "p",
          text: "Inside an `except` block, `raise NewError(\"…\") from error` raises a clearer error while keeping the original as its cause; the traceback shows both. A plain `raise` on its own re-raises the error being handled, unchanged, after you've done something like logging it.",
        },
      ],
    },
  ],

  example: {
    caption: "Validating an order with specific, readable errors. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'class OutOfStockError(Exception):\n    pass\n\n\ndef reserve(stock, item, quantity):\n    if not isinstance(quantity, int):\n        raise TypeError(f"quantity must be an int, got {type(quantity).__name__}")\n    if quantity <= 0:\n        raise ValueError(f"quantity must be positive, got {quantity!r}")\n    if stock.get(item, 0) < quantity:\n        raise OutOfStockError(f"only {stock.get(item, 0)} {item} left, {quantity} requested")\n    stock[item] -= quantity\n\n\nstock = {"lamp": 2}\nreserve(stock, "lamp", 1)\nprint(stock)\nfor bad in [("lamp", 0), ("lamp", "2"), ("lamp", 5)]:\n    try:\n        reserve(stock, *bad)\n    except (TypeError, ValueError, OutOfStockError) as error:\n        print(type(error).__name__ + ":", error)',
  },

  walkthrough: [
    {
      title: "raise stops the function",
      text: "The line after `raise` never runs for bad input; the error travels to the caller.",
      code: 'def set_discount(rate):\n    if not 0 <= rate <= 1:\n        raise ValueError(f"rate must be between 0 and 1, got {rate!r}")\n    print("discount set to", rate)\n\nset_discount(0.2)\nset_discount(20)',
    },
    {
      title: "!r makes bad values visible",
      text: "With `!r`, the empty string and the trailing space show up in the message.",
      code: 'for code in ["", "AB ", "A1"]:\n    print(f"invalid code: {code}")\n    print(f"invalid code: {code!r}")',
    },
    {
      title: "A custom exception type",
      text: "Callers can catch `OutOfStockError` specifically, and let other errors through.",
      code: 'class OutOfStockError(Exception):\n    pass\n\ndef take(stock, n):\n    if n > stock:\n        raise OutOfStockError(f"only {stock} left")\n    return stock - n\n\ntry:\n    take(2, 5)\nexcept OutOfStockError as error:\n    print("Sorry:", error)',
    },
    {
      title: "raise … from … keeps the cause",
      text: "The new error explains which field failed; the original `ValueError` is kept as its cause, shown first in the traceback.",
      code: 'def parse_age(text):\n    try:\n        return int(text)\n    except ValueError as error:\n        raise ValueError(f"age must be a whole number, got {text!r}") from error\n\nprint(parse_age("41"))\nparse_age("forty")',
    },
  ],

  mistakes: [
    {
      title: "A message that says nothing",
      text: "The error is right, but the message gives no clue which value was wrong or why.",
      code: 'def set_quantity(n):\n    if n < 0:\n        raise ValueError("invalid")\n\nset_quantity(-3)',
      raises: "ValueError",
      fix: 'Say what was expected and what was received: `raise ValueError(f"quantity must not be negative, got {n!r}")`.',
    },
    {
      title: "Raising a string",
      text: "Only exception objects can be raised. `raise \"…\"` is itself a `TypeError`.",
      code: 'raise "something went wrong"',
      raises: "TypeError",
      fix: "Raise an exception type with the message: `raise ValueError(\"something went wrong\")`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Validate an order record",
      prompt:
        "Write `validate_order(order)` for a dictionary with `sku` (a non-empty string) and `quantity` (an int of at least 1). Return `True` for a valid order. Otherwise raise: `KeyError` if a field is missing, `TypeError` if `quantity` isn't an int (note: `True` doesn't count as one here), and `ValueError` if `sku` is blank or `quantity` is below 1. Each message must name the field.",
      looksFor: [
        "Valid orders return `True`.",
        "Missing fields raise `KeyError`; a non-int quantity raises `TypeError`; a blank sku or a quantity below 1 raises `ValueError`.",
        "Every error message includes the field's name (`sku` or `quantity`).",
      ],
      starter: "def validate_order(order):\n    # Return True, or raise KeyError / TypeError / ValueError as described.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "validate_order",
            cases: [
              { args: [rec([["sku", s("A1")], ["quantity", i(2)]])], expected: py.bool(true) },
              { args: [rec([["sku", s("A1")]])], raises: "KeyError" },
              { args: [rec([["sku", s("A1")], ["quantity", s("2")]])], raises: "TypeError" },
              { args: [rec([["sku", s("A1")], ["quantity", i(0)]])], raises: "ValueError" },
              { args: [rec([["sku", s("  ")], ["quantity", i(1)]])], raises: "ValueError" },
              { args: [rec([["sku", s("A1")], ["quantity", py.bool(true)]])], raises: "TypeError", hidden: true },
              { args: [rec([["quantity", i(1)]])], raises: "KeyError", hidden: true },
              { args: [rec([["sku", s("B2")], ["quantity", f(1.5)]])], raises: "TypeError", hidden: true },
            ],
          },
          { kind: "expr", id: "msg-qty", label: "The quantity error message names the field", show: 'validate_order({"sku": "A1", "quantity": 0})', expr: errorOf('validate_order({"sku": "A1", "quantity": 0})') + '\nresult = "quantity" in result', expected: py.bool(true), tip: "Include the field name in the message, for example f\"quantity must be at least 1, got {q!r}\"." },
          { kind: "expr", id: "msg-sku", label: "The sku error message names the field", show: 'validate_order({"sku": "", "quantity": 1})', expr: errorOf('validate_order({"sku": "", "quantity": 1})') + '\nresult = "sku" in result', expected: py.bool(true) },
        ],
      },
      hints: [
        'For each field: if "sku" not in order: raise KeyError("sku").',
        'type(q) is not int catches strings, floats and True (isinstance(True, int) would let True through).',
        'Then the value checks: if not order["sku"].strip(): raise ValueError("sku must not be blank"), and quantity < 1.',
      ],
      answer: 'def validate_order(order):\n    """Return True for a valid order; raise KeyError, TypeError or ValueError otherwise."""\n    for field in ("sku", "quantity"):\n        if field not in order:\n            raise KeyError(f"missing field: {field}")\n    sku = order["sku"]\n    quantity = order["quantity"]\n    if type(quantity) is not int:\n        raise TypeError(f"quantity must be an int, got {type(quantity).__name__}")\n    if not isinstance(sku, str) or not sku.strip():\n        raise ValueError(f"sku must not be blank, got {sku!r}")\n    if quantity < 1:\n        raise ValueError(f"quantity must be at least 1, got {quantity!r}")\n    return True',
      wrong: [
        { code: 'def validate_order(order):\n    if order["quantity"] < 1 or not order["sku"].strip():\n        raise ValueError("invalid order")\n    return True\n', fails: ["fn", "msg-qty", "msg-sku"], why: "one vague error for everything" },
        { code: 'def validate_order(order):\n    for field in ("sku", "quantity"):\n        if field not in order:\n            raise KeyError(field)\n    if not isinstance(order["quantity"], int):\n        raise TypeError("quantity must be an int")\n    if not order["sku"].strip():\n        raise ValueError("sku is blank")\n    if order["quantity"] < 1:\n        raise ValueError("quantity must be at least 1")\n    return True\n', fails: ["fn"], why: "isinstance lets True through" },
      ],
    },
    {
      id: "challenge-2",
      title: "A custom error for overselling",
      prompt:
        "Define an exception class `OutOfStockError`, based on `Exception`. Then write `reserve(stock, item, quantity)`: if `stock` (a dictionary of item → units) has at least `quantity` of `item`, subtract it and return the units left. Otherwise raise `OutOfStockError` with a message that includes the item and how many are left, and leave `stock` unchanged. An item that isn't in `stock` has 0 left.",
      looksFor: [
        "`OutOfStockError` is an exception class, and `reserve` raises it when there aren't enough units.",
        "A successful reservation reduces `stock[item]` and returns what's left.",
        "A failed one leaves `stock` unchanged, and its message names the item and the units left.",
      ],
      starter: "# Define OutOfStockError here.\n\n\ndef reserve(stock, item, quantity):\n    # Subtract and return what's left, or raise OutOfStockError.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "class", label: "OutOfStockError is an exception class", show: "issubclass(OutOfStockError, Exception)", expr: "isinstance(OutOfStockError, type) and issubclass(OutOfStockError, Exception)", expected: py.bool(true), tip: "class OutOfStockError(Exception): pass." },
          { kind: "expr", id: "ok", label: "A reservation that fits reduces the stock", show: 'stock = {"lamp": 3}; reserve(stock, "lamp", 2), stock', expr: 'stock = {"lamp": 3}\nleft = reserve(stock, "lamp", 2)\nresult = (left, stock)', expected: py.tuple(i(1), py.dict([[s("lamp"), i(1)]])) },
          { kind: "expr", id: "raises", label: "Too many raises OutOfStockError", show: 'reserve({"lamp": 1}, "lamp", 2)', expr: 'try:\n    reserve({"lamp": 1}, "lamp", 2)\n    result = "no error"\nexcept OutOfStockError:\n    result = "OutOfStockError"', expected: s("OutOfStockError") },
          { kind: "expr", id: "unchanged", label: "A failed reservation leaves the stock unchanged", show: 'stock = {"lamp": 1}; reserve(stock, "lamp", 2); stock', expr: 'stock = {"lamp": 1}\ntry:\n    reserve(stock, "lamp", 2)\nexcept Exception:\n    pass\nresult = stock', expected: py.dict([[s("lamp"), i(1)]]), tip: "Check before subtracting, so nothing changes when you raise." },
          { kind: "expr", id: "message", label: "The message names the item and the units left", show: 'reserve({"desk": 2}, "desk", 5)', expr: errorOf('reserve({"desk": 2}, "desk", 5)') + '\nresult = "desk" in result and "2" in result', expected: py.bool(true) },
          { kind: "expr", id: "missing", label: "An item not in stock counts as 0 left", hidden: true, expr: errorOf('reserve({}, "rug", 1)') + '\nresult = result.startswith("OutOfStockError")', expected: py.bool(true) },
        ],
      },
      hints: [
        "class OutOfStockError(Exception): with pass as its body.",
        "left = stock.get(item, 0). If left < quantity: raise OutOfStockError(f\"only {left} {item} left\").",
        "Otherwise stock[item] = left - quantity, and return it.",
      ],
      answer: 'class OutOfStockError(Exception):\n    """Raised when a reservation asks for more units than are in stock."""\n\n\ndef reserve(stock, item, quantity):\n    """Reserve quantity of item: return the units left, or raise OutOfStockError."""\n    left = stock.get(item, 0)\n    if left < quantity:\n        raise OutOfStockError(f"only {left} {item} left, {quantity} requested")\n    stock[item] = left - quantity\n    return stock[item]',
      wrong: [
        { code: 'class OutOfStockError(Exception):\n    pass\n\ndef reserve(stock, item, quantity):\n    stock[item] = stock.get(item, 0) - quantity\n    if stock[item] < 0:\n        raise OutOfStockError(f"only {stock[item] + quantity} {item} left")\n    return stock[item]\n', fails: ["unchanged"], why: "subtracts before checking" },
        { code: 'def reserve(stock, item, quantity):\n    left = stock.get(item, 0)\n    if left < quantity:\n        raise ValueError(f"only {left} {item} left")\n    stock[item] = left - quantity\n    return stock[item]\n', fails: ["class", "raises", "missing"], why: "no custom class" },
      ],
    },
  ],

  quiz: [
    {
      id: "type",
      prompt: "`set_age(age)` is called with `\"thirty\"`. Which error fits best?",
      options: [
        { text: "`TypeError`: the argument should be a number, and it's a string", correct: true, why: "The kind of value is wrong, not just its value." },
        { text: "`ValueError`", why: "`ValueError` fits a number that's out of range, like `-5`. Here the type is wrong." },
        { text: "`KeyError`", why: "`KeyError` is for missing keys in a mapping." },
        { text: "No error: convert it with `int()`", why: "`int(\"thirty\")` would raise `ValueError` itself; it's better to reject the wrong type clearly." },
      ],
    },
    {
      id: "from",
      prompt: "What does `raise ConfigError(\"bad port\") from error` do differently from `raise ConfigError(\"bad port\")`?",
      options: [
        { text: "It records `error` as the cause, so the traceback shows both errors", correct: true, why: "The original exception is kept as `__cause__`, so nobody loses the detail of what actually failed." },
        { text: "It suppresses the original error entirely", why: "That's `from None`. `from error` keeps it." },
        { text: "It raises `error` instead of `ConfigError`", why: "The new error is raised; the old one is attached to it." },
        { text: "Nothing: `from` is ignored", why: "It changes the traceback: the cause is shown first, then the new error." },
      ],
    },
  ],

  outcomes: [
    "Raise `TypeError`, `ValueError` or `KeyError` according to what's wrong.",
    "Write error messages that name the field, show the bad value with `!r` and say what was expected.",
    "Define and raise your own exception class, and catch it specifically.",
    "Re-raise with `raise … from …` to keep the original cause.",
  ],
};
