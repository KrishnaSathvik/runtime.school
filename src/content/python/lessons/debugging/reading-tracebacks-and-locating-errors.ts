import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const i = py.int;

export const readingTracebacksAndLocatingErrors: PyLesson = {
  slug: "reading-tracebacks-and-locating-errors",
  ref: "python:reading-tracebacks-and-locating-errors",
  module: "debugging",
  number: 1,
  title: "Reading tracebacks and locating errors",
  level: "intermediate",
  summary:
    "Read a traceback from the bottom up: the error type and message say what went wrong, the last frame says where, and the frames above it say how the program got there. Then use that to find the line that actually needs fixing.",

  sections: [
    {
      label: "the anatomy of a traceback",
      blocks: [
        {
          kind: "p",
          text: "When a program stops with an error, Python prints a **traceback**: the chain of calls that were running when it happened. Each **frame** shows a file, a line number, the function it was in, and the line of code itself. The carets (`~~~^^^`) underline the part of the line that was being worked out.",
        },
        {
          kind: "code",
          code: 'Traceback (most recent call last):\n  File "main.py", line 9, in <module>\n    print(line_total("cake;3,75;1"))\n  File "main.py", line 6, in line_total\n    return parse_price(price) * int(qty)\n  File "main.py", line 2, in parse_price\n    return float(text)\nValueError: could not convert string to float: \'3,75\'',
        },
        {
          kind: "p",
          text: "“Most recent call last” means the frames run from the outside in: the top-level program (`<module>`) called `line_total`, which called `parse_price`, where the error happened.",
        },
      ],
    },
    {
      label: "read it from the bottom",
      blocks: [
        {
          kind: "p",
          text: "1. **The last line**: the exception type and message. `ValueError: could not convert string to float: '3,75'` already tells you the input that broke it. 2. **The last frame**: where it happened (line 2, in `parse_price`). 3. **The frames above**: how it got there, and which of your lines passed in the bad value.",
        },
        {
          kind: "p",
          text: "The line where an error **appears** is not always the line that's **wrong**. `float(text)` is fine; the question is whether `parse_price` should accept a comma as a decimal point, or whether the data should never contain one. Decide where the fix belongs, and fix it there.",
        },
      ],
    },
    {
      label: "a debugging routine",
      blocks: [
        {
          kind: "p",
          text: "Reproduce the error with the smallest input you can. Read the message, then the last frame. Print the values involved just before the failing line (`print(repr(text))` shows hidden spaces and quotes). Form one guess, change one thing, and run again. In Runtime, the line number in the Console is a button that jumps to that line in your code.",
        },
      ],
    },
  ],

  example: {
    caption: "An error two calls deep. Press Run and read the traceback from the bottom up. Running examples never affects your progress.",
    code: 'def parse_price(text):\n    return float(text)\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3,75;1"))',
  },

  walkthrough: [
    {
      title: "One input works, so look at what differs",
      text: "`\"2.50\"` converts and `\"3,75\"` doesn't, so the problem is in what's different about it: the comma.",
      code: 'def parse_price(text):\n    return float(text)\n\nprint(parse_price("2.50"))\nprint(parse_price("3,75"))',
    },
    {
      title: "repr() shows what a value really contains",
      text: "The quantity has a trailing space and a new line, invisible with `print` but obvious with `repr`. `int()` tolerates surrounding whitespace, which is why this one isn't an error.",
      code: 'qty = " 2\\n"\nprint(qty)\nprint(repr(qty))\nprint(int(qty))',
    },
    {
      title: "Errors inside a call report every frame",
      text: "The traceback shows three frames: the program called `average`, which called `total_of`, which failed on `None`.",
      code: "def total_of(values):\n    return sum(values)\n\ndef average(values):\n    return total_of(values) / len(values)\n\nprint(average([3, 4]))\nprint(average([3, None]))",
    },
    {
      title: "Fix it where it belongs",
      text: "Accepting a comma as the decimal point in `parse_price` fixes every caller at once.",
      code: 'def parse_price(text):\n    return float(text.replace(",", "."))\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3,75;1"))',
    },
  ],

  mistakes: [
    {
      title: "Fixing the line where the error appears",
      text: "The traceback points at `return text[0].upper()`, but that line is fine; the caller passed an empty name. Patching this line hides the real problem.",
      code: 'def initial(text):\n    return text[0].upper()\n\nnames = ["ada", "", "grace"]\nfor name in names:\n    print(initial(name))',
      raises: "IndexError",
      fix: "Decide where empty names should be handled: skip them in the loop, or give `initial` a documented result for empty text.",
    },
    {
      title: "Reading only the top of the traceback",
      text: "The top frame is just where the program started (`<module>`). The cause is at the bottom: `KeyError: 'price'`, raised inside `cost`.",
      code: 'def cost(item):\n    return item["price"] * item["qty"]\n\norder = [{"price": 2.5, "qty": 2}, {"qty": 1}]\nprint(sum(cost(item) for item in order))',
      raises: "KeyError",
      fix: "Start with the last line of the traceback, then the last frame.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Fix a crash two calls deep",
      prompt:
        "This program totals order lines like `\"cake;3,75;1\"` (item; price; quantity), but some prices use a comma as the decimal point and it crashes. Run it, read the traceback, and fix `parse_price` so it accepts both `3.75` and `3,75`. Don't change the order lines.",
      expectedOutput: "5.0\n3.75\n7.5\n",
      looksFor: [
        "`parse_price` accepts a decimal point or a decimal comma, and returns a float.",
        "The program runs and prints the three line totals.",
      ],
      starter: 'def parse_price(text):\n    return float(text)\n\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3,75;1"))\nprint(line_total("juice;2,5;3"))\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the three totals", expected: "5.0\n3.75\n7.5\n" },
          {
            kind: "function",
            id: "fn",
            name: "parse_price",
            cases: [
              { args: [s("2.50")], expected: f(2.5) },
              { args: [s("3,75")], expected: f(3.75) },
              { args: [s("10")], expected: f(10), hidden: true },
              { args: [s(" 0,99 ")], expected: f(0.99), hidden: true },
            ],
            tip: 'Replace a comma with a point before converting: float(text.replace(",", ".")).',
          },
        ],
      },
      hints: [
        "The last line of the traceback shows the text that float() couldn't convert.",
        "The last frame is in parse_price: that's where the fix belongs, since every price goes through it.",
        'return float(text.replace(",", ".")).',
      ],
      answer: 'def parse_price(text):\n    return float(text.replace(",", "."))\n\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3,75;1"))\nprint(line_total("juice;2,5;3"))',
      wrong: [
        { code: 'def parse_price(text):\n    return float(text)\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3.75;1"))\nprint(line_total("juice;2.5;3"))\n', fails: ["fn"], why: "edited the data instead" },
        { code: 'def parse_price(text):\n    return float(text.replace(",", ""))\n\ndef line_total(line):\n    name, price, qty = line.split(";")\n    return parse_price(price) * int(qty)\n\nprint(line_total("tea;2.50;2"))\nprint(line_total("cake;3,75;1"))\nprint(line_total("juice;2,5;3"))\n', fails: ["output", "fn"], why: "removed the comma: 3,75 became 375" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix an off-by-one",
      prompt:
        "`first_and_last(items)` should return a tuple of the first and last items, or `(None, None)` for an empty list. It crashes with an `IndexError` for every list. Read the traceback and fix it.",
      looksFor: [
        "`first_and_last([3, 7, 9])` returns `(3, 9)`; a one-item list returns that item twice.",
        "An empty list returns `(None, None)` instead of crashing.",
      ],
      starter: 'def first_and_last(items):\n    return items[0], items[len(items)]\n\n\nprint(first_and_last([3, 7, 9]))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "first_and_last",
            cases: [
              { args: [py.list(i(3), i(7), i(9))], expected: py.tuple(i(3), i(9)) },
              { args: [py.list(s("only"))], expected: py.tuple(s("only"), s("only")) },
              { args: [py.list()], expected: py.tuple(py.none, py.none) },
              { args: [py.list(i(1), i(2))], expected: py.tuple(i(1), i(2)), hidden: true },
            ],
            tip: "The last index is len(items) - 1 (or simply -1). Handle the empty list before indexing.",
          },
        ],
      },
      hints: [
        "IndexError: list index out of range. Which index? A list of 3 has indexes 0, 1 and 2.",
        "items[-1] is the last item, for any non-empty list.",
        "Check if not items: return None, None first.",
      ],
      answer: 'def first_and_last(items):\n    if not items:\n        return None, None\n    return items[0], items[-1]\n\n\nprint(first_and_last([3, 7, 9]))',
      alternatives: ["def first_and_last(items):\n    if len(items) == 0:\n        return (None, None)\n    return (items[0], items[len(items) - 1])\n"],
      wrong: [
        { code: "def first_and_last(items):\n    return items[0], items[-1]\n", fails: ["fn"], why: "empty list still crashes" },
        { code: "def first_and_last(items):\n    if not items:\n        return None\n    return items[0], items[-1]\n", fails: ["fn"], why: "returns None, not (None, None)" },
      ],
    },
  ],

  quiz: [
    {
      id: "where",
      prompt: "Which line of this traceback should you read first?",
      code: 'Traceback (most recent call last):\n  File "main.py", line 12, in <module>\n    report(orders)\n  File "main.py", line 8, in report\n    print(average(o["total"] for o in orders))\n  File "main.py", line 3, in average\n    return sum(values) / len(values)\nTypeError: object of type \'generator\' has no len()',
      options: [
        { text: "The last one: `TypeError: object of type 'generator' has no len()`", correct: true, why: "It says what went wrong. The frame just above it (line 3, in `average`) says where." },
        { text: "The first frame: line 12, `report(orders)`", why: "That's only where the program started the chain of calls. The cause is further down." },
        { text: "`Traceback (most recent call last):`", why: "That header is the same for every error." },
        { text: "Line 8, because `print` is involved", why: "Line 8 passes the generator in, which matters for the fix, but read the error itself first." },
      ],
    },
    {
      id: "frames",
      prompt: "In that traceback, which function was running when the error happened?",
      options: [
        { text: "`average`", correct: true, why: "The last frame is `in average`, at line 3." },
        { text: "`report`", why: "`report` called `average`; it's one frame above the error." },
        { text: "`<module>`", why: "`<module>` is the top level of the program, the outermost frame." },
        { text: "`len`", why: "`len` is where the problem surfaced, but tracebacks list your code's frames; the last one is `average`." },
      ],
    },
  ],

  outcomes: [
    "Read a traceback from the bottom: the error, then the last frame, then the calls above it.",
    "Tell the line where an error appears from the line that needs fixing.",
    "Use `repr()` and small inputs to find what a value really contains.",
    "Follow a routine: reproduce, read, inspect, change one thing, run again.",
  ],
};
