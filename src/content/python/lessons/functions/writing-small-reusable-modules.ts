import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

const PRICING = `"""Prices and tax for the café.

Use price_of(item) for a menu price and with_tax(amount) to add tax.
"""

TAX_RATE = 0.2

MENU = {"tea": 2.5, "cake": 3.75, "juice": 3.0, "scone": 2.25}


def price_of(item):
    """Return the menu price of item. Raises KeyError for an item not on the menu."""
    return MENU[item]


def with_tax(amount):
    """Return amount plus tax, rounded to 2 places."""
    return round(amount * (1 + TAX_RATE), 2)
`;

const NOISY = `print("noisy.py is running")

VALUE = 42
`;

/** Save the learner's program as order_tools.py, import it as another program would, and capture what it prints. */
const importQuietly = `import contextlib, importlib, io
with open("order_tools.py", "w") as _fh:
    _fh.write(_source)
_buf = io.StringIO()
with contextlib.redirect_stdout(_buf):
    importlib.import_module("order_tools")
result = _buf.getvalue()`;

export const writingSmallReusableModules: PyLesson = {
  slug: "writing-small-reusable-modules",
  ref: "python:writing-small-reusable-modules",
  module: "functions",
  number: 7,
  title: "Writing small reusable modules",
  level: "intermediate",
  summary:
    "Split a program into files: put related functions and settings in a module, import it from your main program, and guard a module's own demo code with `if __name__ == \"__main__\":` so importing it doesn't run that code.",
  files: { "pricing.py": PRICING, "noisy.py": NOISY },

  sections: [
    {
      label: "your own module is just a .py file",
      blocks: [
        {
          kind: "p",
          text: "Any `.py` file is a module. Next to `main.py` in this lesson there's a file called `pricing.py` (it's in the Files list): it holds the café's menu, its tax rate and two functions. `import pricing` makes them available as `pricing.MENU`, `pricing.price_of(...)` and so on, exactly like a standard-library module.",
        },
        { kind: "code", code: PRICING },
        {
          kind: "p",
          text: "A good module has one job (prices and tax, here), a docstring at the top saying what it's for, and functions with their own docstrings. Settings like `TAX_RATE` live in one place, so changing them is a one-line edit that every program importing the module picks up.",
        },
      ],
    },
    {
      label: "importing runs the module once",
      blocks: [
        {
          kind: "p",
          text: "The first `import` of a module runs its top-level code from top to bottom, then keeps the result. Importing it again in the same program doesn't run it again. That's why modules should mostly **define** things (functions, constants) rather than **do** things such as printing or asking for input.",
        },
      ],
    },
    {
      label: "the __main__ guard",
      blocks: [
        {
          kind: "p",
          text: "Every module has a name in `__name__`. When a file is imported, `__name__` is its module name (`\"pricing\"`); when it's the program being run, `__name__` is `\"__main__\"`. So code inside `if __name__ == \"__main__\":` runs when you run the file, and is skipped when another program imports it.",
        },
        { kind: "code", code: 'def parse_order(line):\n    ...\n\ndef main():\n    print(parse_order("tea x2"))\n\nif __name__ == "__main__":\n    main()' },
        {
          kind: "p",
          text: "This lets one file be both a reusable module and a runnable script with a quick demo or self-test. Putting that code in a `main()` function keeps the module's top level tidy.",
        },
      ],
    },
  ],

  example: {
    caption: "Using the pricing module from main.py. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import pricing\n\nsubtotal = pricing.price_of("tea") * 2 + pricing.price_of("cake")\nprint("Subtotal:", subtotal)\nprint("With tax:", pricing.with_tax(subtotal))\nprint("Tax rate:", pricing.TAX_RATE)\nprint(pricing.__name__, __name__)',
  },

  walkthrough: [
    {
      title: "import, then use the module's names",
      text: "Everything the module defines is reached through its name.",
      code: 'import pricing\nprint(pricing.MENU)\nprint(pricing.price_of("juice"), pricing.with_tax(10))',
    },
    {
      title: "Importing names directly",
      text: "`from pricing import …` brings in just the names you need.",
      code: 'from pricing import price_of, with_tax\nprint(with_tax(price_of("scone")))',
    },
    {
      title: "Top-level code runs once, on the first import",
      text: "`noisy.py` prints when it's first imported. The second import reuses the module without running it again.",
      code: "import noisy\nimport noisy\nprint(noisy.VALUE)",
    },
    {
      title: "__name__ tells a file how it's being used",
      text: "Here `__name__` is `\"__main__\"`, because this file is the one being run, so the guarded block runs.",
      code: 'def main():\n    print("running the demo")\n\nprint("__name__ is", __name__)\nif __name__ == "__main__":\n    main()',
    },
  ],

  mistakes: [
    {
      title: "Using a function name without its module",
      text: "`import pricing` gives you the name `pricing`, not `with_tax`: `NameError`.",
      code: "import pricing\nprint(with_tax(10))",
      raises: "NameError",
      fix: "Use `pricing.with_tax(10)`, or `from pricing import with_tax`.",
    },
    {
      title: "Asking a module for something it doesn't have",
      text: "`pricing` has no `discount` function, so this is an `AttributeError`, which names the module and the missing attribute.",
      code: "import pricing\nprint(pricing.discount(10))",
      raises: "AttributeError",
      fix: "Check the module's names with `dir(pricing)`, or read its docstrings.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Total an order with the pricing module",
      prompt:
        "Write `order_total(items)` using the `pricing` module (it's in the Files list). `items` is a list of `(item, quantity)` pairs. Return the total **including tax**: add up price × quantity for every pair, then apply `pricing.with_tax` once to the subtotal. Don't copy the prices or the tax rate into your code. An item that isn't on the menu raises `KeyError` (which `price_of` already does).",
      looksFor: [
        "`order_total([(\"tea\", 2), (\"cake\", 1)])` returns `10.5`.",
        "Prices come from `pricing.price_of`, and tax from `pricing.with_tax`, applied once.",
        "An empty order totals `0`, and an unknown item raises `KeyError`.",
      ],
      starter: "import pricing\n\n\ndef order_total(items):\n    # Return the total of the order, including tax.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "order_total",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [py.list(py.tuple(s("tea"), i(2)), py.tuple(s("cake"), i(1)))], expected: f(10.5) },
              { args: [py.list(py.tuple(s("juice"), i(3)))], expected: f(10.8) },
              { args: [py.list()], expected: i(0) },
              { args: [py.list(py.tuple(s("pizza"), i(1)))], raises: "KeyError" },
              { args: [py.list(py.tuple(s("scone"), i(4)), py.tuple(s("tea"), i(1)))], expected: f(13.8), hidden: true },
            ],
            tip: "subtotal += pricing.price_of(item) * quantity for each pair, then return pricing.with_tax(subtotal).",
          },
          {
            kind: "expr",
            id: "uses-module",
            label: "Uses the module's prices, not copies",
            hidden: true,
            expr: 'import pricing\npricing.MENU["tea"] = 10.0\nresult = order_total([("tea", 1)])',
            expected: f(12.0),
            tip: "Look prices up with pricing.price_of each time, rather than typing them into your code.",
          },
          {
            kind: "expr",
            id: "tax-once",
            label: "Applies tax once, to the whole subtotal",
            hidden: true,
            expr: 'import pricing\npricing.MENU["tea"] = 0.99\nresult = order_total([("tea", 3)])',
            expected: f(3.56),
            tip: "Add up the prices first, then call pricing.with_tax once: rounding tax item by item can be a cent off.",
          },
        ],
      },
      hints: [
        "subtotal = 0, then for item, quantity in items:",
        "subtotal += pricing.price_of(item) * quantity.",
        "After the loop: return pricing.with_tax(subtotal).",
      ],
      answer: 'import pricing\n\n\ndef order_total(items):\n    """Return the total of (item, quantity) pairs, including tax."""\n    subtotal = 0\n    for item, quantity in items:\n        subtotal += pricing.price_of(item) * quantity\n    return pricing.with_tax(subtotal)',
      alternatives: ["from pricing import price_of, with_tax\n\ndef order_total(items):\n    subtotal = 0\n    for item, qty in items:\n        subtotal = subtotal + price_of(item) * qty\n    return with_tax(subtotal)\n"],
      wrong: [
        { code: 'import pricing\n\ndef order_total(items):\n    prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0, "scone": 2.25}\n    subtotal = 0\n    for item, quantity in items:\n        subtotal += prices[item] * quantity\n    return round(subtotal * 1.2, 2)\n', fails: ["uses-module", "tax-once"], why: "copied the prices" },
        { code: "import pricing\n\ndef order_total(items):\n    total = 0\n    for item, quantity in items:\n        total += pricing.with_tax(pricing.price_of(item)) * quantity\n    return total\n", fails: ["tax-once"], why: "rounds tax per item" },
      ],
    },
    {
      id: "challenge-2",
      title: "Make a file that's both a module and a script",
      prompt:
        "Write `parse_order(line)`, which turns text like `\"tea x2\"` into the tuple `(\"tea\", 2)` (the item, then the quantity as an int; spaces around the line are ignored). Then write `main()`, which prints the parsed result of `\"tea x2\"` and of `\" cake x1 \"`, and call `main()` only inside an `if __name__ == \"__main__\":` guard, so that importing the file prints nothing.",
      expectedOutput: "('tea', 2)\n('cake', 1)\n",
      looksFor: [
        "`parse_order(\"tea x2\")` returns `(\"tea\", 2)`, for any item and quantity.",
        "Running the file prints the two results shown.",
        "Importing the file (as another program would) prints nothing.",
      ],
      starter: 'def parse_order(line):\n    # Return (item, quantity).\n    pass\n\n\nprint(parse_order("tea x2"))\nprint(parse_order(" cake x1 "))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "parse_order",
            cases: [
              { args: [s("tea x2")], expected: py.tuple(s("tea"), i(2)) },
              { args: [s(" cake x1 ")], expected: py.tuple(s("cake"), i(1)) },
              { args: [s("juice x12")], expected: py.tuple(s("juice"), i(12)), hidden: true },
            ],
            tip: 'Strip the line, split it on " x", and convert the second part with int().',
          },
          { kind: "output", id: "output", label: "Running the file prints both results", expected: "('tea', 2)\n('cake', 1)\n" },
          { kind: "expr", id: "quiet-import", label: "Importing the file prints nothing", show: "importing the file as a module", expr: importQuietly, expected: s(""), tip: 'Move the prints into def main(), and call main() only under if __name__ == "__main__":.' },
        ],
      },
      hints: [
        'item, quantity = line.strip().split(" x") splits "tea x2" into "tea" and "2".',
        "return item, int(quantity).",
        'def main(): with the two prints, then if __name__ == "__main__": main().',
      ],
      answer: 'def parse_order(line):\n    """Turn "tea x2" into ("tea", 2)."""\n    item, quantity = line.strip().split(" x")\n    return item, int(quantity)\n\n\ndef main():\n    print(parse_order("tea x2"))\n    print(parse_order(" cake x1 "))\n\n\nif __name__ == "__main__":\n    main()',
      alternatives: ['def parse_order(line):\n    parts = line.split()\n    return parts[0], int(parts[1][1:])\n\nif __name__ == "__main__":\n    print(parse_order("tea x2"))\n    print(parse_order(" cake x1 "))\n'],
      wrong: [
        { code: 'def parse_order(line):\n    item, quantity = line.strip().split(" x")\n    return item, int(quantity)\n\ndef main():\n    print(parse_order("tea x2"))\n    print(parse_order(" cake x1 "))\n\nmain()\n', fails: ["quiet-import"], why: "no guard" },
        { code: 'def parse_order(line):\n    item, quantity = line.strip().split(" x")\n    return item, quantity\n\nif __name__ == "__main__":\n    print(parse_order("tea x2"))\n    print(parse_order(" cake x1 "))\n', fails: ["fn", "output"], why: "quantity left as text" },
      ],
    },
  ],

  quiz: [
    {
      id: "name",
      prompt: "`tools.py` ends with `if __name__ == \"__main__\": print(\"demo\")`. What happens when `main.py` runs `import tools`?",
      options: [
        { text: "Nothing is printed: inside `tools`, `__name__` is `\"tools\"`", correct: true, why: "An imported module's `__name__` is its own name, so the guarded code is skipped." },
        { text: "`demo` is printed", why: "That only happens when `tools.py` itself is the program being run." },
        { text: "An error: modules can't contain `if` statements", why: "Modules can contain any code; the guard is a normal `if`." },
        { text: "`demo` is printed every time `tools` is used", why: "Top-level code runs at most once per import, and this code is guarded anyway." },
      ],
    },
    {
      id: "design",
      prompt: "Which belongs at the top level of a reusable module?",
      options: [
        { text: "Function definitions and constants such as `TAX_RATE = 0.2`", correct: true, why: "Defining things is cheap and harmless when the module is imported." },
        { text: "A loop that prints a report", why: "That runs on every import. Put it in a function, or under the `__main__` guard." },
        { text: "Code that asks the user for input", why: "Importing the module would stop and wait. Keep it in the script that needs it." },
        { text: "A test that deliberately raises an error", why: "That would make every import fail." },
      ],
    },
  ],

  outcomes: [
    "Import your own module and use its functions and constants.",
    "Explain that a module's top-level code runs once, on first import.",
    "Use `if __name__ == \"__main__\":` to keep demo code from running on import.",
    "Design a small module with one job and docstrings.",
  ],
};
