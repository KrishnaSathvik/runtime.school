import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const countingAndRunningTotals: PyLesson = {
  slug: "counting-and-running-totals",
  ref: "python:counting-and-running-totals",
  module: "loops",
  number: 2,
  title: "Counting and running totals",
  level: "beginner",
  summary:
    "Use the accumulator pattern: start a total or a count before the loop, update it on every iteration, and use it after the loop, for sums, counts of matching values, averages and running balances.",

  sections: [
    {
      label: "the accumulator pattern",
      blocks: [
        {
          kind: "p",
          text: "Most loops that calculate something follow the same three steps: **initialise** a variable before the loop (`total = 0`), **update** it inside the loop (`total += n`), and **use** it after the loop has finished (`print(total)`). The variable is called an **accumulator**.",
        },
        { kind: "code", code: "total = 0              # 1. initialise\nfor n in range(1, 6):\n    total += n         # 2. update\nprint(total)           # 3. use: 15" },
        {
          kind: "p",
          text: "Where each step goes matters. Initialise inside the loop and the total restarts every time; print inside the loop and you see every partial total instead of the result.",
        },
      ],
    },
    {
      label: "counting matches",
      blocks: [
        {
          kind: "p",
          text: "A count is an accumulator that adds 1, usually inside an `if`: `if n % 3 == 0: count += 1`. You can keep several accumulators in one loop, such as a count and a total, and combine them afterwards: the average is `total / count`, as long as `count` isn't zero.",
        },
      ],
    },
    {
      label: "running values",
      blocks: [
        {
          kind: "p",
          text: "An accumulator doesn't have to be a sum. A savings balance grows by interest and a deposit each month: `balance = balance * (1 + rate) + deposit`. A best-so-far value only changes when something beats it: `if n > largest: largest = n`. Print inside the loop when you want to see each step (a running total), and after it when you only want the result.",
        },
      ],
    },
  ],

  example: {
    caption: "Counting and summing the multiples of 3 below 20. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'count = 0\ntotal = 0\nfor n in range(1, 20):\n    if n % 3 == 0:\n        count += 1\n        total += n\n\nprint("Multiples of 3:", count)\nprint("Their sum:", total)\nprint("Their average:", total / count)',
  },

  walkthrough: [
    {
      title: "Initialise, update, use",
      text: "`total` starts at 0 and grows by each `n`. Only the final value is printed.",
      code: "total = 0\nfor n in range(1, 6):\n    total += n\nprint(total)",
    },
    {
      title: "Printing inside the loop shows a running total",
      text: "The same loop with the `print` indented shows the total after every step.",
      code: "total = 0\nfor n in range(1, 6):\n    total += n\n    print(n, total)",
    },
    {
      title: "Counting with an if",
      text: "`count` only goes up when the condition is true, so it counts the even numbers.",
      code: "count = 0\nfor n in range(1, 11):\n    if n % 2 == 0:\n        count += 1\nprint(count)",
    },
    {
      title: "A running balance",
      text: "Each month the balance earns 1% and then gets a 100 deposit. Rounding happens only when printing.",
      code: 'balance = 0\nfor month in range(1, 4):\n    balance = balance * 1.01 + 100\n    print(f"Month {month}: {balance:.2f}")',
    },
  ],

  mistakes: [
    {
      title: "Initialising inside the loop",
      text: "`total = 0` runs on every iteration, so each time the total starts again. Only the last number survives.",
      code: "for n in range(1, 6):\n    total = 0\n    total += n\nprint(total)",
      fix: "Initialise once, before the loop.",
    },
    {
      title: "Forgetting to initialise",
      text: "`count += 1` needs `count` to exist already: `NameError` on the first iteration.",
      code: "for n in range(5):\n    count += 1\nprint(count)",
      raises: "NameError",
      fix: "Add `count = 0` before the loop.",
    },
    {
      title: "Averaging an empty count",
      text: "No number below 2 is a multiple of 3, so `count` stays 0 and the average divides by zero.",
      code: "count = 0\ntotal = 0\nfor n in range(1, 2):\n    if n % 3 == 0:\n        count += 1\n        total += n\nprint(total / count)",
      raises: "ZeroDivisionError",
      fix: "Guard it: `average = total / count if count > 0 else None`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Count multiples of 3 or 5",
      prompt:
        "For the numbers from 1 to `limit` (inclusive), count how many are divisible by 3 **or** 5 into `count`, and add them up into `total`. Print both as shown. Check answer tries other limits.",
      expectedOutput: "Count: 14\nTotal: 225\n",
      looksFor: [
        "`count` and `total` cover every number from 1 to `limit`, including `limit` itself.",
        "Numbers divisible by both 3 and 5 (like 15) are counted once.",
        "It works for other limits, including ones too small to have any matches.",
      ],
      starter: "limit = 30\n\n# Count and add up the numbers from 1 to limit divisible by 3 or 5.\n",
      task: {
        checks: [
          { kind: "variable", id: "count", name: "count", expected: py.int(14) },
          { kind: "variable", id: "total", name: "total", expected: py.int(225) },
          { kind: "output", id: "output", label: "Prints both", expected: "Count: 14\nTotal: 225\n" },
          { kind: "variant", id: "v-10", set: { limit: py.int(10) }, vars: { count: py.int(5), total: py.int(33) }, tip: "range(1, limit + 1) includes the limit: 10 is a multiple of 5." },
          { kind: "variant", id: "v-15", set: { limit: py.int(15) }, output: "Count: 7\nTotal: 60\n", tip: "15 is divisible by 3 and by 5, but it's still one number: use or in a single if." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { limit: py.int(2) }, vars: { count: py.int(0), total: py.int(0) } },
        ],
      },
      hints: [
        "Start with count = 0 and total = 0, before the loop.",
        "n % 3 == 0 means n is divisible by 3. Combine the two tests with or in one if.",
        "Inside the if: count += 1 and total += n. Print after the loop.",
      ],
      answer: 'limit = 30\n\ncount = 0\ntotal = 0\nfor n in range(1, limit + 1):\n    if n % 3 == 0 or n % 5 == 0:\n        count += 1\n        total += n\nprint("Count:", count)\nprint("Total:", total)',
      wrong: [
        { code: 'limit = 30\ncount = 0\ntotal = 0\nfor n in range(1, limit):\n    if n % 3 == 0 or n % 5 == 0:\n        count += 1\n        total += n\nprint("Count:", count)\nprint("Total:", total)\n', fails: ["count", "total", "output", "v-10", "v-15"], why: "excludes the limit" },
        { code: 'limit = 30\ncount = 0\ntotal = 0\nfor n in range(1, limit + 1):\n    if n % 3 == 0:\n        count += 1\n        total += n\n    if n % 5 == 0:\n        count += 1\n        total += n\nprint("Count:", count)\nprint("Total:", total)\n', fails: ["count", "total", "output", "v-15"], why: "counts 15 and 30 twice" },
        { code: 'limit = 30\nfor n in range(1, limit + 1):\n    count = 0\n    total = 0\n    if n % 3 == 0 or n % 5 == 0:\n        count += 1\n        total += n\nprint("Count:", count)\nprint("Total:", total)\n', fails: ["count", "total", "output", "v-10", "v-15"], why: "reset inside the loop" },
      ],
    },
    {
      id: "challenge-2",
      title: "Grow a savings balance",
      prompt:
        "A savings account starts at 0. At the end of every month, the balance earns `rate` interest (0.01 means 1%) and then a `deposit` is added. Calculate the `balance` after `months` months, and print it rounded to 2 decimal places. Check answer tries other deposits, rates and lengths, including 0 months.",
      expectedOutput: "Balance after 12 months: 1902.38\n",
      looksFor: [
        "Each month, interest is applied to the current balance before the deposit is added.",
        "`balance` keeps its full value; only the printed number is rounded.",
        "It works for other inputs, including 0 months and a 0 rate.",
      ],
      starter: "deposit = 150\nrate = 0.01\nmonths = 12\n\n# Update balance once per month, then print it.\n",
      task: {
        checks: [
          { kind: "variable", id: "balance", name: "balance", expected: py.float(1902.375451979546) },
          { kind: "output", id: "output", label: "Prints the balance", expected: "Balance after 12 months: 1902.38\n", tip: 'f"{balance:.2f}" rounds just the printed value.' },
          { kind: "variant", id: "v-no-rate", set: { deposit: py.int(100), rate: py.float(0), months: py.int(6) }, output: "Balance after 6 months: 600.00\n" },
          { kind: "variant", id: "v-short", set: { deposit: py.int(50), rate: py.float(0.02), months: py.int(3) }, output: "Balance after 3 months: 153.02\n", tip: "Interest first, then the deposit: balance = balance * (1 + rate) + deposit." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { months: py.int(0) }, output: "Balance after 0 months: 0.00\n" },
        ],
      },
      hints: [
        "balance = 0 before the loop; the loop runs months times: for month in range(months).",
        "Each month: balance = balance * (1 + rate) + deposit.",
        'After the loop: print(f"Balance after {months} months: {balance:.2f}").',
      ],
      answer: 'deposit = 150\nrate = 0.01\nmonths = 12\n\nbalance = 0\nfor month in range(months):\n    balance = balance * (1 + rate) + deposit\nprint(f"Balance after {months} months: {balance:.2f}")',
      alternatives: ['deposit = 150\nrate = 0.01\nmonths = 12\nbalance = 0\nfor _ in range(months):\n    balance += balance * rate\n    balance += deposit\nprint(f"Balance after {months} months: {round(balance, 2):.2f}")\n'],
      wrong: [
        { code: 'deposit = 150\nrate = 0.01\nmonths = 12\nbalance = 0\nfor month in range(months):\n    balance = (balance + deposit) * (1 + rate)\nprint(f"Balance after {months} months: {balance:.2f}")\n', fails: ["balance", "output", "v-short"], why: "deposit before interest" },
        { code: 'deposit = 150\nrate = 0.01\nmonths = 12\nbalance = 0\nfor month in range(months):\n    balance = round(balance * (1 + rate) + deposit, 2)\nprint(f"Balance after {months} months: {balance:.2f}")\n', fails: ["balance", "output"], why: "rounds every month" },
        { code: 'deposit = 150\nrate = 0.01\nmonths = 12\nbalance = deposit * months * (1 + rate)\nprint(f"Balance after {months} months: {balance:.2f}")\n', fails: ["balance", "output", "v-short"], why: "simple interest on everything" },
      ],
    },
  ],

  quiz: [
    {
      id: "where-print",
      prompt: "How many lines does this program print?",
      code: "total = 0\nfor n in range(1, 4):\n    total += n\n    print(total)\nprint(total)",
      options: [
        { text: "4: `1`, `3`, `6`, then `6` again", correct: true, why: "The indented `print` runs on each of the three iterations, showing the running total; the last line runs once after the loop." },
        { text: "1: `6`", why: "The first `print` is indented, so it's part of the loop body and runs every iteration." },
        { text: "3: `1`, `3`, `6`", why: "The unindented `print(total)` after the loop runs too, once." },
        { text: "4: `0`, `1`, `3`, `6`", why: "Each `print` inside the loop comes after `total += n`, so the first one shows 1." },
      ],
    },
    {
      id: "init",
      prompt: "Why does this print `5` instead of `15`?",
      code: "for n in range(1, 6):\n    total = 0\n    total += n\nprint(total)",
      options: [
        { text: "`total = 0` is inside the loop, so it resets on every iteration", correct: true, why: "On the last iteration, `total` is reset to 0 and then 5 is added. Move the initialisation above the loop." },
        { text: "`range(1, 6)` stops at 5, so only 5 is added", why: "The loop does visit 1 to 5; the problem is that the total keeps being reset." },
        { text: "`+=` replaces the value instead of adding", why: "`total += n` does add: `total = total + n`. But `total` was just set back to 0." },
        { text: "`print` only shows the loop variable", why: "`print(total)` shows `total`; it's 5 because of where it was initialised." },
      ],
    },
  ],

  outcomes: [
    "Use the accumulator pattern: initialise before the loop, update inside it, use it after.",
    "Count values that match a condition, and combine a count and a total into an average.",
    "Keep a running value, such as a balance, that depends on its previous value.",
    "Choose whether to print inside the loop (every step) or after it (the result).",
  ],
};
