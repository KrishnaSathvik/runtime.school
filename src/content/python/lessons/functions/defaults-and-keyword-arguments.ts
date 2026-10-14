import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const i = py.int;

export const defaultsAndKeywordArguments: PyLesson = {
  slug: "defaults-and-keyword-arguments",
  ref: "python:defaults-and-keyword-arguments",
  module: "functions",
  number: 4,
  title: "Defaults and keyword arguments",
  level: "intermediate",
  summary:
    "Give parameters default values so callers can leave them out, pass arguments by name for clarity, accept any number of arguments with `*args`, and avoid the most famous trap in Python: a mutable default value.",

  sections: [
    {
      label: "default values",
      blocks: [
        {
          kind: "p",
          text: "A parameter can have a **default**: `def format_price(amount, currency=\"$\"):`. If the caller leaves it out, the default is used; if they pass it, their value wins. Parameters with defaults must come after those without.",
        },
        {
          kind: "p",
          text: "Defaults suit the options most callers don't care about. `print()` is the example you know: `sep` defaults to a space and `end` to a new line.",
        },
      ],
    },
    {
      label: "keyword arguments",
      blocks: [
        {
          kind: "p",
          text: "Any argument can be passed **by name**: `format_price(1234.5, decimals=0)`. Keyword arguments can come in any order, skip over defaults you're happy with, and make calls readable: `ship(order, express=True)` says much more than `ship(order, True)`. In a call, positional arguments come first, then keyword ones.",
        },
      ],
    },
    {
      label: "any number of arguments",
      blocks: [
        {
          kind: "p",
          text: "A parameter written `*args` collects any extra positional arguments into a tuple: `def total(*amounts): return sum(amounts)` works for `total()`, `total(5)` and `total(5, 10, 2.5)`. `**kwargs` does the same for extra keyword arguments, as a dictionary. The names are conventions; the stars are what matter.",
        },
      ],
    },
    {
      label: "the mutable default trap",
      blocks: [
        {
          kind: "p",
          text: "A default value is created **once**, when the `def` runs, not each time the function is called. For numbers and strings that's harmless. For a list or dictionary it means every call that uses the default shares the **same** list, so items from earlier calls pile up.",
        },
        { kind: "code", code: 'def add_tag(tag, tags=None):\n    if tags is None:\n        tags = []      # a new list on every call\n    tags.append(tag)\n    return tags' },
        {
          kind: "p",
          text: "The fix is the pattern above: default to `None`, and create the new list inside the function.",
        },
      ],
    },
  ],

  example: {
    caption: "One function, called four ways. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def format_price(amount, currency="$", decimals=2):\n    """Format amount as money, e.g. $1,234.50."""\n    return f"{currency}{amount:,.{decimals}f}"\n\n\nprint(format_price(1234.5))\nprint(format_price(1234.5, "€"))\nprint(format_price(1234.5, decimals=0))\nprint(format_price(decimals=1, amount=9.99, currency="£"))\n\n\ndef total(*amounts):\n    return sum(amounts)\n\nprint(total(), total(5), total(5, 10, 2.5))',
  },

  walkthrough: [
    {
      title: "Defaults fill in what's left out",
      text: "The first call uses both defaults; the second overrides `greeting`.",
      code: 'def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\nprint(greet("Ada"))\nprint(greet("Ada", "Welcome back"))',
    },
    {
      title: "Keyword arguments by name",
      text: "Naming the argument lets you skip `currency` and set only `decimals`, and order no longer matters.",
      code: 'def format_price(amount, currency="$", decimals=2):\n    return f"{currency}{amount:,.{decimals}f}"\n\nprint(format_price(50, decimals=0))\nprint(format_price(decimals=3, amount=0.5))',
    },
    {
      title: "*args collects extra arguments",
      text: "Inside the function, `amounts` is a tuple of whatever was passed, possibly empty.",
      code: "def total(*amounts):\n    print(amounts)\n    return sum(amounts)\n\nprint(total())\nprint(total(5, 10, 2.5))",
    },
    {
      title: "A shared default list",
      text: "Both calls use the same default list, created once when `def` ran, so the second call still contains the first call's tag.",
      code: 'def add_tag(tag, tags=[]):\n    tags.append(tag)\n    return tags\n\nprint(add_tag("sale"))\nprint(add_tag("new"))',
    },
  ],

  mistakes: [
    {
      title: "A positional argument after a keyword one",
      text: "Once an argument is passed by name, the ones after it must be too: `SyntaxError`.",
      code: 'def format_price(amount, currency="$"):\n    return f"{currency}{amount:.2f}"\n\nprint(format_price(amount=5, "€"))',
      raises: "SyntaxError",
      fix: 'Pass positional arguments first, or name them all: `format_price(5, currency="€")`.',
    },
    {
      title: "A parameter without a default after one with",
      text: "Python can't tell which positional argument would fill `quantity`, so this `def` is a `SyntaxError`.",
      code: 'def line_total(price=1.0, quantity):\n    return price * quantity',
      raises: "SyntaxError",
      fix: "Put parameters with defaults last: `def line_total(quantity, price=1.0):`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Format money with options",
      prompt:
        "Write `format_price(amount, currency=\"$\", decimals=2)`, which returns the amount as text: the currency symbol, then the amount with a thousands separator and `decimals` decimal places. `format_price(1234.5)` returns `\"$1,234.50\"`. Callers may pass the options positionally or by name.",
      looksFor: [
        "With only an amount, the result uses `$` and 2 decimal places.",
        "`currency` and `decimals` can be given by position or by name.",
        "Thousands are separated with commas.",
      ],
      starter: 'def format_price(amount, currency="$", decimals=2):\n    # Return the formatted price.\n    pass\n\n\nprint(format_price(1234.5))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "format_price",
            cases: [
              { args: [f(1234.5)], expected: s("$1,234.50") },
              { args: [f(1234.5), s("€")], expected: s("€1,234.50") },
              { args: [f(1234.5)], kwargs: { decimals: i(0) }, expected: s("$1,234") },
              { args: [f(9.99)], kwargs: { currency: s("£"), decimals: i(1) }, expected: s("£10.0") },
              { args: [i(5)], expected: s("$5.00"), hidden: true },
              { args: [f(1000000)], kwargs: { decimals: i(3) }, expected: s("$1,000,000.000"), hidden: true },
            ],
            tip: 'A format spec can contain a variable inside its own braces: f"{currency}{amount:,.{decimals}f}".',
          },
        ],
      },
      hints: [
        "The defaults are already in the def line; the body just needs to build and return the text.",
        "{amount:,.2f} gives commas and 2 places. The 2 can come from a variable: {amount:,.{decimals}f}.",
        'return f"{currency}{amount:,.{decimals}f}".',
      ],
      answer: 'def format_price(amount, currency="$", decimals=2):\n    """Format amount as money, e.g. $1,234.50."""\n    return f"{currency}{amount:,.{decimals}f}"\n\n\nprint(format_price(1234.5))',
      wrong: [
        { code: 'def format_price(amount, currency="$", decimals=2):\n    return f"{currency}{amount:,.2f}"\n', fails: ["fn"], why: "ignores decimals" },
        { code: 'def format_price(amount, currency="$", decimals=2):\n    return f"{currency}{amount:.{decimals}f}"\n', fails: ["fn"], why: "no thousands separator" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix the shared tag list",
      prompt:
        "`add_tag(tag, tags=[])` should add a tag to the list it's given, or start a **new** list when none is given. But tags from earlier calls keep appearing in later ones. Fix it with the `None` default pattern, so that calls without a list never share one. Passing a list must still add to that list.",
      expectedOutput: "['sale']\n['new']\n['a', 'b']\n",
      looksFor: [
        "Each call without a list returns a new list containing only that tag.",
        "When a list is passed, the tag is appended to it and that list is returned.",
      ],
      starter: 'def add_tag(tag, tags=[]):\n    tags.append(tag)\n    return tags\n\n\nprint(add_tag("sale"))\nprint(add_tag("new"))\nprint(add_tag("b", ["a"]))\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the three results", expected: "['sale']\n['new']\n['a', 'b']\n" },
          { kind: "expr", id: "fresh", label: "Two calls without a list don't share one", show: 'add_tag("x"); add_tag("y")', expr: 'add_tag("x")\nresult = add_tag("y")', expected: py.list(s("y")), tip: "A default list is created once, when def runs. Default to None and create the list inside the function." },
          { kind: "expr", id: "given", label: "A given list is appended to", show: 'tags = ["a"]; add_tag("b", tags); tags', expr: 'tags = ["a"]\nadd_tag("b", tags)\nresult = tags', expected: py.list(s("a"), s("b")) },
          { kind: "expr", id: "given-empty", label: "A given empty list is appended to as well", hidden: true, expr: 'tags = []\nadd_tag("b", tags)\nresult = tags', expected: py.list(s("b")), tip: "Test tags is None, not just whether tags is falsy: an empty list passed in is still the caller's list." },
        ],
      },
      hints: [
        "Run it: the second line shows ['sale', 'new']. Both calls used the same default list.",
        "Change the default to tags=None.",
        "Inside: if tags is None: tags = []. Then append and return as before.",
      ],
      answer: 'def add_tag(tag, tags=None):\n    if tags is None:\n        tags = []\n    tags.append(tag)\n    return tags\n\n\nprint(add_tag("sale"))\nprint(add_tag("new"))\nprint(add_tag("b", ["a"]))',
      wrong: [
        { code: 'def add_tag(tag, tags=None):\n    tags = []\n    tags.append(tag)\n    return tags\n\nprint(add_tag("sale"))\nprint(add_tag("new"))\nprint(add_tag("b", ["a"]))\n', fails: ["output", "given", "given-empty"], why: "always replaces the list, even a given one" },
        { code: 'def add_tag(tag, tags=None):\n    if not tags:\n        tags = []\n    tags.append(tag)\n    return tags\n\nprint(add_tag("sale"))\nprint(add_tag("new"))\nprint(add_tag("b", ["a"]))\n', fails: ["given-empty"], why: "if not tags also replaces a given empty list" },
      ],
    },
  ],

  quiz: [
    {
      id: "defaults",
      prompt: "What does this program print?",
      code: 'def label(name, prefix="Mr", suffix=""):\n    return f"{prefix} {name}{suffix}"\n\nprint(label("Lee", suffix=" Jr"))',
      options: [
        { text: "`Mr Lee Jr`", correct: true, why: "`prefix` keeps its default, `Mr`; `suffix` is passed by name." },
        { text: "`Lee Jr`", why: "Skipping `prefix` uses its default, not an empty string." },
        { text: "` Jr Lee`", why: "Keyword arguments go to the parameter with that name, not to the next position." },
        { text: "A `TypeError`", why: "Keyword arguments can skip over parameters that have defaults." },
      ],
    },
    {
      id: "mutable",
      prompt: "Why is `def log(event, history=[])` a problem?",
      options: [
        { text: "The same list is reused by every call that doesn't pass `history`", correct: true, why: "Default values are created once, when `def` runs, so the list keeps growing across calls." },
        { text: "Lists can't be default values", why: "They can; that's exactly why the shared-list bug is possible." },
        { text: "The list is empty, so `append` fails", why: "Appending to an empty list works; the problem is that it's the same list every time." },
        { text: "`history` must come before `event`", why: "Parameters with defaults must come **after** those without, which this does correctly." },
      ],
    },
  ],

  outcomes: [
    "Give parameters default values, and put them after required parameters.",
    "Pass arguments by keyword for clarity and to skip defaults.",
    "Accept any number of arguments with `*args`.",
    "Avoid mutable defaults with the `None` default pattern.",
  ],
};
