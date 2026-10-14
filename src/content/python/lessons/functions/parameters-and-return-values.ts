import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;

export const parametersAndReturnValues: PyLesson = {
  slug: "parameters-and-return-values",
  ref: "python:parameters-and-return-values",
  module: "functions",
  number: 2,
  title: "Parameters and return values",
  level: "intermediate",
  summary:
    "Make functions calculate and hand back a result with `return`, so the caller can store, test or combine it. Learn the difference between returning and printing, what `None` means here, and how to return several values at once.",

  sections: [
    {
      label: "return hands a value back",
      blocks: [
        {
          kind: "p",
          text: "`return value` ends the function and makes the call itself **evaluate to** that value. The caller decides what to do with it: store it, print it, compare it, or pass it to another function.",
        },
        { kind: "code", code: "def to_fahrenheit(celsius):\n    return celsius * 9 / 5 + 32\n\nboiling = to_fahrenheit(100)    # 212.0\nprint(to_fahrenheit(37) > 98)    # True" },
        {
          kind: "p",
          text: "That's what makes a function reusable: a function that **prints** its answer can only show it, while one that **returns** it can be used in further calculations, tests and other functions. Prefer returning; let the caller print.",
        },
      ],
    },
    {
      label: "None and the end of a function",
      blocks: [
        {
          kind: "p",
          text: "A function without a `return`, or one that reaches the end of its body without hitting one, returns `None`. That's why `result = print_line(…)` stores `None`, and why “my function printed the right answer but the total is `None`” is such a common bug.",
        },
        {
          kind: "p",
          text: "`return` stops the function immediately; any lines after it in the same block never run. A function can have several `return` statements, for example one in each branch of an `if`.",
        },
      ],
    },
    {
      label: "returning several values",
      blocks: [
        {
          kind: "p",
          text: "To return more than one value, return a tuple: `return hours, minutes`. The caller unpacks it: `h, m = split_minutes(135)`.",
        },
      ],
    },
  ],

  example: {
    caption: "Functions that return, used in further calculations. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def to_fahrenheit(celsius):\n    """Convert a temperature from Celsius to Fahrenheit."""\n    return celsius * 9 / 5 + 32\n\n\ndef split_minutes(total):\n    """Split a number of minutes into (hours, minutes)."""\n    return total // 60, total % 60\n\n\nprint(to_fahrenheit(100))\nwarmest = max(to_fahrenheit(18), to_fahrenheit(31))\nprint(f"Warmest: {warmest:.1f}")\nhours, minutes = split_minutes(135)\nprint(f"{hours}h {minutes}m")',
  },

  walkthrough: [
    {
      title: "The call becomes the returned value",
      text: "`to_fahrenheit(100)` evaluates to `212.0`, which can be stored or used directly.",
      code: "def to_fahrenheit(celsius):\n    return celsius * 9 / 5 + 32\n\nboiling = to_fahrenheit(100)\nprint(boiling)\nprint(to_fahrenheit(0) + 10)",
    },
    {
      title: "Printing is not returning",
      text: "`shown` prints the value, but returns nothing, so `a` is `None`. `given` returns it, so `b` holds it.",
      code: "def shown(x):\n    print(x * 2)\n\ndef given(x):\n    return x * 2\n\na = shown(5)\nb = given(5)\nprint(a, b)",
    },
    {
      title: "return ends the function",
      text: "Each branch returns, so the function stops there. The last line of the body is never reached.",
      code: 'def sign(n):\n    if n > 0:\n        return "positive"\n    if n < 0:\n        return "negative"\n    return "zero"\n    print("never runs")\n\nprint(sign(5), sign(-2), sign(0))',
    },
    {
      title: "Returning two values",
      text: "The function returns a tuple; unpacking gives each value a name.",
      code: "def split_minutes(total):\n    return total // 60, total % 60\n\nresult = split_minutes(135)\nprint(result)\nhours, minutes = split_minutes(59)\nprint(hours, minutes)",
    },
  ],

  mistakes: [
    {
      title: "Printing instead of returning",
      text: "The function prints the price, but returns `None`, so adding to it is a `TypeError`.",
      code: "def with_tax(price):\n    print(price * 1.2)\n\ntotal = with_tax(10) + 5",
      raises: "TypeError",
      fix: "Return the value: `return price * 1.2`. Print it where it's used, if you want to see it.",
    },
    {
      title: "A path that forgets to return",
      text: "For a negative number neither `return` runs, so the function returns `None`.",
      code: "def absolute(n):\n    if n > 0:\n        return n\n    if n == 0:\n        return 0\n\nprint(absolute(-4))",
      fix: "Make sure every path returns: add `return -n` at the end.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Convert temperatures",
      prompt:
        "Write `to_fahrenheit(celsius)`, which **returns** the temperature in Fahrenheit (`celsius × 9 / 5 + 32`). It must return the number, not print it. Check answer calls it with several temperatures, including some you can't see.",
      looksFor: [
        "`to_fahrenheit(0)` returns `32.0` and `to_fahrenheit(100)` returns `212.0`.",
        "It works for negative and fractional temperatures too.",
        "It returns the value; printing isn't enough.",
      ],
      starter: "def to_fahrenheit(celsius):\n    # Return the temperature in Fahrenheit.\n    pass\n\n\nprint(to_fahrenheit(100))\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "to_fahrenheit",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [i(0)], expected: f(32) },
              { args: [i(100)], expected: f(212) },
              { args: [i(-40)], expected: f(-40) },
              { args: [f(37.5)], expected: f(99.5), hidden: true },
              { args: [i(-10)], expected: f(14), hidden: true },
            ],
            tip: "Use the parameter in the formula, and return the result: return celsius * 9 / 5 + 32.",
          },
        ],
      },
      hints: [
        "The body needs return, followed by the formula.",
        "Use the parameter name, celsius, not a fixed number.",
        "return celsius * 9 / 5 + 32.",
      ],
      answer: 'def to_fahrenheit(celsius):\n    """Convert a temperature from Celsius to Fahrenheit."""\n    return celsius * 9 / 5 + 32\n\n\nprint(to_fahrenheit(100))',
      alternatives: ["def to_fahrenheit(celsius):\n    fahrenheit = celsius * 1.8 + 32\n    return fahrenheit\n"],
      wrong: [
        { code: "def to_fahrenheit(celsius):\n    print(celsius * 9 / 5 + 32)\n", fails: ["fn"], why: "prints instead of returning" },
        { code: "def to_fahrenheit(celsius):\n    return celsius * 9 / (5 + 32)\n", fails: ["fn"], why: "brackets in the wrong place" },
        { code: "def to_fahrenheit(celsius):\n    if celsius == 0:\n        return 32.0\n    if celsius == 100:\n        return 212.0\n    return -40.0\n", fails: ["fn"], why: "hard-coded answers" },
      ],
    },
    {
      id: "challenge-2",
      title: "Split minutes into hours and minutes",
      prompt:
        "Write `split_minutes(total)`, which returns a tuple `(hours, minutes)` for a whole number of minutes: `split_minutes(135)` returns `(2, 15)`. Then use it to print `135 minutes is 2h 15m`, as shown.",
      expectedOutput: "135 minutes is 2h 15m\n",
      looksFor: [
        "`split_minutes(total)` returns a tuple of two ints: whole hours, then the remaining minutes.",
        "It works for 0, 59, 60 and other values.",
        "The program prints the line shown, using the function.",
      ],
      starter: "def split_minutes(total):\n    # Return (hours, minutes).\n    pass\n\n\ntotal = 135\n# Use split_minutes to print the line.\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "split_minutes",
            cases: [
              { args: [i(135)], expected: py.tuple(i(2), i(15)) },
              { args: [i(59)], expected: py.tuple(i(0), i(59)) },
              { args: [i(60)], expected: py.tuple(i(1), i(0)) },
              { args: [i(0)], expected: py.tuple(i(0), i(0)), hidden: true },
              { args: [i(1439)], expected: py.tuple(i(23), i(59)), hidden: true },
            ],
            tip: "// gives whole hours, % the minutes left over: return total // 60, total % 60.",
          },
          { kind: "output", id: "output", label: "Prints the line", expected: "135 minutes is 2h 15m\n" },
        ],
      },
      hints: [
        "Whole hours: total // 60. Remaining minutes: total % 60.",
        "return total // 60, total % 60 returns both as a tuple.",
        'hours, minutes = split_minutes(total), then print(f"{total} minutes is {hours}h {minutes}m").',
      ],
      answer: 'def split_minutes(total):\n    """Split a number of minutes into (hours, minutes)."""\n    return total // 60, total % 60\n\n\ntotal = 135\nhours, minutes = split_minutes(total)\nprint(f"{total} minutes is {hours}h {minutes}m")',
      alternatives: ['def split_minutes(total):\n    hours = total // 60\n    minutes = total - hours * 60\n    return (hours, minutes)\n\ntotal = 135\nh, m = split_minutes(total)\nprint(total, "minutes is", f"{h}h", f"{m}m")\n'],
      wrong: [
        { code: 'def split_minutes(total):\n    return total / 60, total % 60\n\ntotal = 135\nhours, minutes = split_minutes(total)\nprint(f"{total} minutes is {hours}h {minutes}m")\n', fails: ["fn", "output"], why: "/ gives fractional hours" },
        { code: 'def split_minutes(total):\n    return [total // 60, total % 60]\n\ntotal = 135\nhours, minutes = split_minutes(total)\nprint(f"{total} minutes is {hours}h {minutes}m")\n', fails: ["fn"], why: "a list, not a tuple" },
        { code: 'def split_minutes(total):\n    print(total // 60, total % 60)\n\ntotal = 135\nsplit_minutes(total)\n', fails: ["fn", "output"], why: "prints instead of returning" },
      ],
    },
  ],

  quiz: [
    {
      id: "none",
      prompt: "What does this program print?",
      code: "def double(n):\n    result = n * 2\n\nprint(double(4))",
      options: [
        { text: "`None`", correct: true, why: "The function calculates `result` but never returns it, so the call evaluates to `None`." },
        { text: "`8`", why: "`result` is a local variable; without `return result`, the value never leaves the function." },
        { text: "Nothing", why: "`print()` still runs; it prints the call's value, which is `None`." },
        { text: "A `NameError`", why: "The function runs fine; it just doesn't hand anything back." },
      ],
    },
    {
      id: "early-return",
      prompt: "What does `check(15)` return?",
      code: 'def check(n):\n    if n > 10:\n        return "big"\n    if n > 5:\n        return "medium"\n    return "small"\n\nprint(check(15))',
      options: [
        { text: '`"big"`', correct: true, why: "The first condition is true, and `return` ends the function right there." },
        { text: '`"medium"`', why: "Once `return \"big\"` runs, the function is finished; the second test is never reached." },
        { text: '`"small"`', why: "The last line only runs when neither earlier `return` did." },
        { text: '`["big", "medium"]`', why: "A function returns once, and `return` doesn't collect values." },
      ],
    },
  ],

  outcomes: [
    "Return a result with `return`, and use the call as a value.",
    "Explain why printing isn't returning, and spot a function that returns `None` by accident.",
    "Use `return` to end a function early from inside a branch.",
    "Return several values as a tuple and unpack them.",
  ],
};
