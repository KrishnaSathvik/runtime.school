import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;

export const scopeAndMutableArguments: PyLesson = {
  slug: "scope-and-mutable-arguments",
  ref: "python:scope-and-mutable-arguments",
  module: "functions",
  number: 5,
  title: "Scope and mutable arguments",
  level: "intermediate",
  summary:
    "Understand where a name exists: variables made inside a function are local to it. See why assigning to an outside variable inside a function fails, how passing a list lets a function change the caller's data, and why returning new values is usually the better design.",

  sections: [
    {
      label: "local and global names",
      blocks: [
        {
          kind: "p",
          text: "Each call of a function gets its own fresh set of names: its parameters and any variable it assigns. These are **local**: they exist only while the call runs, and they're invisible outside. Names assigned at the top level of the program are **global**; a function can read them.",
        },
        { kind: "code", code: 'tax_rate = 0.2          # global\n\ndef with_tax(price):\n    total = price * (1 + tax_rate)   # reads the global; total is local\n    return total\n\nwith_tax(10)\nprint(total)   # NameError: total only existed inside the call' },
        {
          kind: "p",
          text: "The catch: if a function **assigns** to a name anywhere in its body, that name is local for the whole function. So `count += 1` inside a function, where `count` is a global, is an `UnboundLocalError`: Python treats `count` as local, and it has no value yet. (`global count` would allow it, but functions that change globals are hard to test and reuse. Pass values in and return results instead.)",
        },
      ],
    },
    {
      label: "functions can change lists they're given",
      blocks: [
        {
          kind: "p",
          text: "Passing a list to a function doesn't copy it: the parameter is another name for the **same** list, just like `b = a`. So if the function calls `append`, assigns `items[0] = …`, or sorts in place, the caller's list changes too. Assigning a whole new value to the parameter (`items = []`) only rebinds the local name; the caller's list is unaffected.",
        },
        {
          kind: "p",
          text: "Surprising changes to the caller's data are a classic source of bugs. Unless changing the input is the function's documented job, build and **return a new list** instead: `return [p * (1 - rate) for p in prices]`.",
        },
      ],
    },
  ],

  example: {
    caption: "Two discount functions: one changes the caller's list, one returns a new list. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def discount_in_place(prices, rate):\n    for n in range(len(prices)):\n        prices[n] = round(prices[n] * (1 - rate), 2)\n\n\ndef discounted(prices, rate):\n    """Return a new list of discounted prices; prices is unchanged."""\n    return [round(p * (1 - rate), 2) for p in prices]\n\n\nshop = [10.0, 20.0]\nsale = discounted(shop, 0.1)\nprint(shop, sale)\n\ndiscount_in_place(shop, 0.1)\nprint(shop)',
  },

  walkthrough: [
    {
      title: "Local names disappear after the call",
      text: "`total` exists only inside the call. Reading it afterwards is a `NameError`.",
      code: "tax_rate = 0.2\n\ndef with_tax(price):\n    total = price * (1 + tax_rate)\n    return total\n\nprint(with_tax(10))\nprint(total)",
    },
    {
      title: "Same name, different variables",
      text: "The `x` inside the function is a separate local variable; the global `x` is untouched.",
      code: "x = 1\n\ndef set_x():\n    x = 99\n    return x\n\nprint(set_x(), x)",
    },
    {
      title: "Changing a list changes the caller's list",
      text: "`items` and `cart` are the same list, so the append is visible outside.",
      code: 'def add_bag(items):\n    items.append("bag")\n\ncart = ["milk"]\nadd_bag(cart)\nprint(cart)',
    },
    {
      title: "Rebinding the parameter doesn't",
      text: "`items = []` points the local name at a new list; `cart` still refers to the original.",
      code: "def clear(items):\n    items = []\n    return items\n\ncart = [\"milk\"]\nprint(clear(cart), cart)",
    },
  ],

  mistakes: [
    {
      title: "Assigning to a global inside a function",
      text: "Because the function assigns to `count`, Python treats it as local throughout, so reading it in `count + 1` fails with `UnboundLocalError`.",
      code: "count = 0\n\ndef record_visit():\n    count += 1\n\nrecord_visit()",
      raises: "UnboundLocalError",
      fix: "Pass the value in and return the new one: `def record_visit(count): return count + 1`, then `count = record_visit(count)`.",
    },
    {
      title: "Sorting the caller's list by accident",
      text: "`top_two` only meant to look at the scores, but `sort()` reorders the caller's list.",
      code: "def top_two(scores):\n    scores.sort(reverse=True)\n    return scores[:2]\n\nresults = [70, 95, 80]\nprint(top_two(results), results)",
      fix: "Use `sorted(scores, reverse=True)[:2]`, which leaves the input alone.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Discount without touching the original",
      prompt:
        "Write `apply_discount(prices, rate)`, which **returns a new list** with each price reduced by `rate` (0.1 means 10% off) and rounded to 2 places. The list passed in must not change: the original prices are still needed for the receipt.",
      looksFor: [
        "`apply_discount([10.0, 20.0], 0.1)` returns `[9.0, 18.0]`.",
        "The list passed in is unchanged afterwards.",
        "An empty list gives an empty list.",
      ],
      starter: "def apply_discount(prices, rate):\n    # Return a new list; don't change prices.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "apply_discount",
            cases: [
              { args: [py.list(f(10), f(20)), f(0.1)], expected: py.list(f(9), f(18)) },
              { args: [py.list(f(4.99)), f(0.5)], expected: py.list(f(2.5)) },
              { args: [py.list(), f(0.2)], expected: py.list() },
              { args: [py.list(f(100), f(1)), i(0)], expected: py.list(f(100), f(1)), hidden: true },
            ],
            tip: "Build a new list: [round(p * (1 - rate), 2) for p in prices].",
          },
          { kind: "expr", id: "unchanged", label: "The list passed in is unchanged", show: "prices = [10.0, 20.0]; apply_discount(prices, 0.1); prices", expr: "prices = [10.0, 20.0]\napply_discount(prices, 0.1)\nresult = prices", expected: py.list(f(10), f(20)), tip: "Changing prices[n] inside the function changes the caller's list. Build and return a new list." },
        ],
      },
      hints: [
        "Start an empty result list, or use a comprehension.",
        "Each new price is round(p * (1 - rate), 2).",
        "return [round(p * (1 - rate), 2) for p in prices].",
      ],
      answer: 'def apply_discount(prices, rate):\n    """Return a new list of discounted prices; prices is unchanged."""\n    return [round(p * (1 - rate), 2) for p in prices]',
      alternatives: ["def apply_discount(prices, rate):\n    result = []\n    for p in prices:\n        result.append(round(p * (1 - rate), 2))\n    return result\n"],
      wrong: [
        { code: "def apply_discount(prices, rate):\n    for n in range(len(prices)):\n        prices[n] = round(prices[n] * (1 - rate), 2)\n    return prices\n", fails: ["unchanged"], why: "changes the caller's list" },
        { code: "def apply_discount(prices, rate):\n    return [p * (1 - rate) for p in prices]\n", fails: ["fn"], why: "not rounded" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix a visit counter",
      prompt:
        "This counter stops with an error because the function assigns to a global. Rewrite `record_visit` so it takes the current count as a parameter and **returns** the new count, and update the calls so `count` ends at 3. Don't use `global`.",
      expectedOutput: "Visits: 3\n",
      looksFor: [
        "`record_visit(count)` returns `count + 1` for any count.",
        "The program runs, `count` ends at `3`, and it prints the line shown.",
      ],
      starter: 'count = 0\n\ndef record_visit():\n    count += 1\n\n\nrecord_visit()\nrecord_visit()\nrecord_visit()\nprint("Visits:", count)\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the count", expected: "Visits: 3\n" },
          { kind: "variable", id: "count", name: "count", expected: i(3), tip: "Store what the function returns: count = record_visit(count)." },
          { kind: "function", id: "fn", name: "record_visit", cases: [{ args: [i(0)], expected: i(1) }, { args: [i(41)], expected: i(42) }, { args: [i(-1)], expected: i(0), hidden: true }], tip: "def record_visit(count): return count + 1." },
        ],
      },
      hints: [
        "Run it: UnboundLocalError. The function assigns to count, so count is local inside it.",
        "Give the function a parameter and return the new value: def record_visit(count): return count + 1.",
        "Each call becomes count = record_visit(count).",
      ],
      answer: 'count = 0\n\ndef record_visit(count):\n    return count + 1\n\n\ncount = record_visit(count)\ncount = record_visit(count)\ncount = record_visit(count)\nprint("Visits:", count)',
      wrong: [
        { code: 'count = 0\n\ndef record_visit(count):\n    return count + 1\n\nrecord_visit(count)\nrecord_visit(count)\nrecord_visit(count)\nprint("Visits:", count)\n', fails: ["output", "count"], why: "return value thrown away" },
        { code: 'count = 0\n\ndef record_visit(count):\n    count += 1\n\ncount = record_visit(count)\ncount = record_visit(count)\nprint("Visits:", count)\n', fails: "program", why: "no return, so count becomes None" },
      ],
    },
  ],

  quiz: [
    {
      id: "rebind",
      prompt: "What does this program print?",
      code: "def change(items, n):\n    items.append(n)\n    n = n * 10\n    items = [n]\n\nnums = [1]\nvalue = 2\nchange(nums, value)\nprint(nums, value)",
      options: [
        { text: "`[1, 2] 2`", correct: true, why: "`append` changes the caller's list. Rebinding `n` and `items` only changes the local names." },
        { text: "`[20] 20`", why: "Assigning to a parameter rebinds the local name; it never changes the caller's variables." },
        { text: "`[1] 2`", why: "`items.append(n)` runs on the shared list before `items` is rebound, so the caller sees the 2." },
        { text: "`[1, 2] 20`", why: "`value` is an int; `n = n * 10` makes a new local value and leaves `value` alone." },
      ],
    },
    {
      id: "unbound",
      prompt: "Why does `total += price` inside a function raise `UnboundLocalError` when `total` is a global?",
      options: [
        { text: "Assigning to `total` makes it local for the whole function, and it has no value yet", correct: true, why: "Python decides scope from the whole body: any assignment makes a name local, so the read in `total + price` fails." },
        { text: "Functions can't read global variables", why: "They can read them; it's assigning that makes the name local." },
        { text: "`+=` doesn't work on numbers", why: "It works fine on numbers; the problem is which `total` it refers to." },
        { text: "`total` must be passed with `global=True`", why: "There's no such argument. The `global` statement exists, but passing and returning values is the better design." },
      ],
    },
  ],

  outcomes: [
    "Tell local names from global ones, and predict a `NameError` or `UnboundLocalError`.",
    "Explain why a function can change a list it's given, but not the caller's variables.",
    "Return new values instead of changing inputs or globals.",
  ],
};
