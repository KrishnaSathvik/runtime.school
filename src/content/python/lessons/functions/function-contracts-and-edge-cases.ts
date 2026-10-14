import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;
const nums = (...xs: number[]) => py.list(...xs.map((x) => (Number.isInteger(x) ? i(x) : f(x))));

export const functionContractsAndEdgeCases: PyLesson = {
  slug: "function-contracts-and-edge-cases",
  ref: "python:function-contracts-and-edge-cases",
  module: "functions",
  number: 3,
  title: "Function contracts and edge cases",
  level: "intermediate",
  summary:
    "Decide, and write down, exactly what a function accepts, what it returns and what happens with awkward input: empty lists, zero, out-of-range values. Then make the code keep that promise, returning a documented value or raising a clear error.",

  sections: [
    {
      label: "a function's contract",
      blocks: [
        {
          kind: "p",
          text: "A function's **contract** is the promise it makes to whoever calls it: what arguments it expects, what it returns, and what it does when the input is unusual. Write it in the docstring, so callers don't have to read the code to find out.",
        },
        { kind: "code", code: 'def average(values):\n    """Return the mean of a list of numbers.\n\n    Returns None for an empty list, since there is no average of nothing.\n    """' },
        {
          kind: "p",
          text: "**Edge cases** are the inputs at the boundaries: an empty list, a single item, zero, negative numbers, values exactly on a threshold. Most bugs hide there, because the “normal” example you tried first doesn't exercise them.",
        },
      ],
    },
    {
      label: "two ways to handle bad input",
      blocks: [
        {
          kind: "p",
          text: "When input can't produce a normal answer, a function can **return a documented special value**, often `None`, when “no answer” is an ordinary outcome the caller should expect (the average of no scores). Or it can **raise an error**, when the input means the caller made a mistake (a negative weight, an unknown zone).",
        },
        { kind: "code", code: 'def percent_change(old, new):\n    """Return the change from old to new, in percent.\n\n    Raises ValueError if old is 0, because the change is undefined.\n    """\n    if old == 0:\n        raise ValueError("old value must not be 0")\n    return (new - old) / old * 100' },
        {
          kind: "p",
          text: "`raise ValueError(\"message\")` stops the function immediately and reports the problem to the caller, with a message saying what was wrong. `ValueError` means “right type, unacceptable value”. Debugging and Testing covers raising and handling errors in depth.",
        },
      ],
    },
    {
      label: "one result type",
      blocks: [
        {
          kind: "p",
          text: "Keep the return type consistent: always a float, or always a float or `None`. A function that sometimes returns a number and sometimes the string `\"error\"` forces every caller to check which one it got, and the check is easy to forget.",
        },
      ],
    },
  ],

  example: {
    caption: "Two contracts: a special value for empty input, and an error for invalid input. The last line raises the error on purpose. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def average(values):\n    """Return the mean of values, or None for an empty list."""\n    if not values:\n        return None\n    return sum(values) / len(values)\n\n\ndef percent_change(old, new):\n    """Return the change from old to new in percent. Raises ValueError if old is 0."""\n    if old == 0:\n        raise ValueError("old value must not be 0")\n    return (new - old) / old * 100\n\n\nprint(average([70, 80, 90]), average([]))\nprint(percent_change(50, 65))\npercent_change(0, 10)',
  },

  walkthrough: [
    {
      title: "The normal case and the edge case",
      text: "The guard handles the empty list before the division, so `average([])` returns `None` instead of failing.",
      code: "def average(values):\n    if not values:\n        return None\n    return sum(values) / len(values)\n\nprint(average([2, 4]))\nprint(average([5]))\nprint(average([]))",
    },
    {
      title: "Without the guard",
      text: "The same calculation without a guard divides by `len([])`, which is 0.",
      code: "def average(values):\n    return sum(values) / len(values)\n\nprint(average([2, 4]))\nprint(average([]))",
    },
    {
      title: "raise stops the function",
      text: "The error message says what went wrong; the `return` after the `raise` is never reached for that input.",
      code: 'def percent_change(old, new):\n    if old == 0:\n        raise ValueError("old value must not be 0")\n    return (new - old) / old * 100\n\nprint(percent_change(50, 65))\nprint(percent_change(80, 60))\nprint(percent_change(0, 10))',
    },
    {
      title: "Test the edges, not just the example",
      text: "A quick table of edge cases: one item, all equal, negatives. Each line shows the input and the result.",
      code: "def spread(values):\n    \"\"\"Return max - min, or 0 for an empty list.\"\"\"\n    if not values:\n        return 0\n    return max(values) - min(values)\n\nfor case in [[3, 9, 4], [7], [5, 5, 5], [-2, 2], []]:\n    print(case, spread(case))",
    },
  ],

  mistakes: [
    {
      title: "Returning a different type for bad input",
      text: "The function returns a string for invalid input, so the caller's arithmetic fails later with a confusing `TypeError`, far from the cause.",
      code: 'def safe_divide(a, b):\n    if b == 0:\n        return "error"\n    return a / b\n\ntotal = safe_divide(10, 0) + 1',
      raises: "TypeError",
      fix: "Return `None` and document it, or raise `ValueError`. Either way the caller can't mistake it for a number.",
    },
    {
      title: "Checking the edge case too late",
      text: "The division runs before the check, so an empty list fails with `ZeroDivisionError` and the guard never helps.",
      code: "def average(values):\n    result = sum(values) / len(values)\n    if not values:\n        return None\n    return result\n\nprint(average([]))",
      raises: "ZeroDivisionError",
      fix: "Put guards at the top of the function, before the work that could fail.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Average with an empty-list contract",
      prompt:
        "Write `average(values)`, which returns the mean of a list of numbers. Its contract: for an empty list it returns `None` (no error). Write that rule in the function's docstring too. Check answer calls it with ordinary lists and with edge cases you can't see.",
      looksFor: [
        "`average([2, 4])` returns `3.0`, `average([5])` returns `5.0`.",
        "`average([])` returns `None` instead of raising an error.",
        "Negative numbers and floats work.",
      ],
      starter: 'def average(values):\n    """Return the mean of values. Return None for an empty list."""\n    pass\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "average",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [nums(2, 4)], expected: f(3) },
              { args: [nums(5)], expected: f(5) },
              { args: [py.list()], expected: py.none },
              { args: [nums(-3, 3, 6)], expected: f(2), hidden: true },
              { args: [nums(0.5, 0.25)], expected: f(0.375), hidden: true },
            ],
            tip: "Check for an empty list first (if not values: return None), then return sum(values) / len(values).",
          },
        ],
      },
      hints: [
        "An empty list is falsy, so if not values: catches it.",
        "In that branch, return None.",
        "Otherwise return sum(values) / len(values).",
      ],
      answer: 'def average(values):\n    """Return the mean of values. Return None for an empty list."""\n    if not values:\n        return None\n    return sum(values) / len(values)',
      alternatives: ['def average(values):\n    """Mean of values, or None when there are none."""\n    if len(values) == 0:\n        return None\n    total = 0\n    for v in values:\n        total += v\n    return total / len(values)\n'],
      wrong: [
        { code: "def average(values):\n    return sum(values) / len(values)\n", fails: ["fn"], why: "ZeroDivisionError for []" },
        { code: "def average(values):\n    if not values:\n        return 0\n    return sum(values) / len(values)\n", fails: ["fn"], why: "returns 0 instead of None" },
        { code: "def average(values):\n    if not values:\n        return None\n    return sum(values) // len(values)\n", fails: ["fn"], why: "floor division" },
      ],
    },
    {
      id: "challenge-2",
      title: "Percent change, with an error for zero",
      prompt:
        "Write `percent_change(old, new)`, which returns the change from `old` to `new` as a percentage, rounded to 1 decimal place: from 50 to 65 is `30.0`, from 80 to 60 is `-25.0`. When `old` is 0 the change is undefined: raise a `ValueError` with a helpful message instead of returning anything.",
      looksFor: [
        "`percent_change(50, 65)` returns `30.0`; decreases are negative.",
        "The result is rounded to 1 decimal place.",
        "`percent_change(0, 10)` raises `ValueError`.",
      ],
      starter: 'def percent_change(old, new):\n    """Return the change from old to new in percent, rounded to 1 place.\n\n    Raises ValueError if old is 0.\n    """\n    pass\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "percent_change",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [i(50), i(65)], expected: f(30) },
              { args: [i(80), i(60)], expected: f(-25) },
              { args: [i(3), i(4)], expected: f(33.3) },
              { args: [i(0), i(10)], raises: "ValueError" },
              { args: [i(200), i(200)], expected: f(0), hidden: true },
              { args: [i(-50), i(-25)], expected: f(-50), hidden: true },
              { args: [i(0), i(0)], raises: "ValueError", hidden: true },
            ],
            tip: "The formula is (new - old) / old * 100, rounded with round(…, 1). Check old == 0 first and raise ValueError.",
          },
        ],
      },
      hints: [
        "Start with the guard: if old == 0: raise ValueError(\"old value must not be 0\").",
        "The change is (new - old) / old * 100.",
        "Return it rounded: return round((new - old) / old * 100, 1).",
      ],
      answer: 'def percent_change(old, new):\n    """Return the change from old to new in percent, rounded to 1 place.\n\n    Raises ValueError if old is 0.\n    """\n    if old == 0:\n        raise ValueError("old value must not be 0")\n    return round((new - old) / old * 100, 1)',
      wrong: [
        { code: "def percent_change(old, new):\n    return round((new - old) / old * 100, 1)\n", fails: ["fn"], why: "ZeroDivisionError, not ValueError" },
        { code: 'def percent_change(old, new):\n    if old == 0:\n        return None\n    return round((new - old) / old * 100, 1)\n', fails: ["fn"], why: "returns None instead of raising" },
        { code: 'def percent_change(old, new):\n    if old == 0:\n        raise ValueError("zero")\n    return round((new - old) / new * 100, 1)\n', fails: ["fn"], why: "divides by new" },
      ],
    },
  ],

  quiz: [
    {
      id: "which",
      prompt: "A function `find_customer(customer_id)` looks up a customer. Which contract fits best when the ID simply isn't in the database?",
      options: [
        { text: "Return `None`, and say so in the docstring", correct: true, why: "“Not found” is an ordinary outcome that callers should handle, so a documented special value fits." },
        { text: 'Return the string `"not found"`', why: "Callers expecting a customer record would have to compare strings, and could easily treat it as a record by mistake." },
        { text: "Return an empty dictionary without documenting it", why: "Undocumented special values surprise callers. If you use one, write it in the contract." },
        { text: "Print an error and return nothing", why: "Printing tells a person, not the calling code, and the function still returns `None` undocumented." },
      ],
    },
    {
      id: "raise",
      prompt: "What does this program print before it stops?",
      code: 'def check_age(age):\n    if age < 0:\n        raise ValueError("age must be at least 0")\n    print("checked", age)\n    return age\n\ncheck_age(30)\ncheck_age(-1)\nprint("done")',
      options: [
        { text: "`checked 30`, then a `ValueError` for -1", correct: true, why: "The first call passes the guard. The second raises at the `raise` line, which stops the program before `done`." },
        { text: "`checked 30`, `checked -1`, `done`", why: "For -1 the `raise` runs first and the function stops; the `print` after it is skipped." },
        { text: "Only the `ValueError`", why: "The first call, with 30, runs completely before the second one fails." },
        { text: "`checked 30`, then `done`", why: "An error that isn't handled stops the program; `done` is never printed." },
      ],
    },
  ],

  outcomes: [
    "Write a docstring that states what a function accepts, returns and does with unusual input.",
    "Identify edge cases: empty input, single items, zero, boundaries and negatives.",
    "Choose between returning a documented `None` and raising `ValueError`.",
    "Put guards first and keep the return type consistent.",
  ],
};
