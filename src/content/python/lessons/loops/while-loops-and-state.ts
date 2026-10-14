import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const whileLoopsAndState: PyLesson = {
  slug: "while-loops-and-state",
  ref: "python:while-loops-and-state",
  module: "loops",
  number: 4,
  title: "while loops and state",
  level: "beginner",
  summary:
    "Repeat until something becomes true, when you don't know in advance how many iterations it will take. Make sure every iteration moves the state towards the end, so the loop finishes.",

  sections: [
    {
      label: "while repeats while a condition is true",
      blocks: [
        {
          kind: "p",
          text: "A `while` loop checks its condition **before** every iteration. If it's `True`, the body runs and the condition is checked again; as soon as it's `False`, the loop ends. If it's `False` the very first time, the body never runs.",
        },
        { kind: "code", code: "balance = 1000\nyears = 0\nwhile balance < 2000:\n    balance *= 1.07\n    years += 1\nprint(years)" },
        {
          kind: "p",
          text: "Use `for` when you know what to loop over (a list, a range of numbers). Use `while` when you're waiting for a state to change: until a balance doubles, until a debt is paid off, until a value settles.",
        },
      ],
    },
    {
      label: "the loop must make progress",
      blocks: [
        {
          kind: "p",
          text: "Something in the body must change the values the condition depends on, and change them in the right direction. If nothing does, the condition stays `True` forever: an **infinite loop**. In Runtime, Run stops a program after a few seconds; elsewhere you'd press Ctrl+C.",
        },
        {
          kind: "p",
          text: "Before writing a `while` loop, ask: what state does the condition check, what changes it each iteration, and could it ever fail to reach the end? A loan whose payment is smaller than its monthly interest never gets paid off, so check for that case first.",
        },
      ],
    },
    {
      label: "counting iterations",
      blocks: [
        {
          kind: "p",
          text: "A `while` loop has no built-in loop variable. To know how many times it ran (years, months, attempts), keep a counter yourself: start it at 0 before the loop and add 1 inside it.",
        },
      ],
    },
  ],

  example: {
    caption: "How long until savings double at 7% a year? Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'balance = 1000\ngoal = 2000\nrate = 0.07\nyears = 0\n\nwhile balance < goal:\n    balance = balance * (1 + rate)\n    years += 1\n\nprint(f"Doubled after {years} years: {balance:.2f}")',
  },

  walkthrough: [
    {
      title: "The condition is checked before each iteration",
      text: "The body runs while `n` is below 4. When `n` becomes 4, the condition is `False` and the loop ends.",
      code: "n = 1\nwhile n < 4:\n    print(n)\n    n += 1\nprint(\"after the loop, n is\", n)",
    },
    {
      title: "A false condition skips the body entirely",
      text: "`n` is already 10, so the body never runs.",
      code: 'n = 10\nwhile n < 4:\n    print("never printed")\n    n += 1\nprint("done")',
    },
    {
      title: "Counting the iterations",
      text: "`years` counts how many times the body ran: how many years the balance needed to reach the goal.",
      code: "balance = 1000\nyears = 0\nwhile balance < 2000:\n    balance *= 1.07\n    years += 1\nprint(years, round(balance, 2))",
    },
    {
      title: "Halving until small",
      text: "Each iteration halves `size`, so it's guaranteed to drop below 1 eventually.",
      code: "size = 100\nsteps = 0\nwhile size >= 1:\n    size = size / 2\n    steps += 1\nprint(steps, size)",
    },
  ],

  mistakes: [
    {
      title: "Forgetting to update the state",
      text: "Nothing in the body changes `n`, so `n < 3` is true forever and `total` just keeps growing. Run stops the program after 5 seconds.",
      code: "n = 0\ntotal = 0\nwhile n < 3:\n    total += n\nprint(total)",
      raises: "timeout",
      fix: "Make the body move towards the end: `n += 1`.",
    },
    {
      title: "Updating in the wrong direction",
      text: "`n` gets smaller every time, so it never reaches 3. This loop would also run forever.",
      code: "n = 0\nwhile n < 3:\n    n -= 1\nprint(n)",
      raises: "timeout",
      fix: "Check that each iteration moves the state towards making the condition false: here, `n += 1`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Years until a goal",
      prompt:
        "Savings of `balance` grow by `rate` each year (0.07 is 7%). Using a `while` loop, find how many whole years it takes for the balance to reach at least `goal`. Store the count in `years` and print it with the final balance as shown. If the balance already meets the goal, the answer is 0 years.",
      expectedOutput: "Years: 11\nBalance: 2104.85\n",
      looksFor: [
        "`years` is the number of yearly increases needed for the balance to be at least `goal`.",
        "`balance` holds the balance after those years; it's rounded only when printed.",
        "It works for other inputs, including a balance that already meets the goal.",
      ],
      starter: "balance = 1000\ngoal = 2000\nrate = 0.07\n\n# Grow balance each year until it reaches goal, counting the years.\n",
      task: {
        checks: [
          { kind: "variable", id: "years", name: "years", expected: py.int(11) },
          { kind: "output", id: "output", label: "Prints years and balance", expected: "Years: 11\nBalance: 2104.85\n" },
          { kind: "variant", id: "v-other", set: { balance: py.int(500), goal: py.int(1000), rate: py.float(0.1) }, output: "Years: 8\nBalance: 1071.79\n" },
          { kind: "variant", id: "v-met", set: { balance: py.int(3000) }, vars: { years: py.int(0) }, tip: "If the balance already meets the goal, the loop body should never run." },
          { kind: "variant", id: "v-exact", set: { balance: py.int(100), goal: py.int(150), rate: py.float(0.5) }, vars: { years: py.int(1) }, tip: "“At least the goal” means stop when balance >= goal, so the loop continues only while balance < goal." },
        ],
      },
      hints: [
        "years = 0 before the loop.",
        "Keep going while the goal hasn't been reached: while balance < goal:",
        'In the body: balance = balance * (1 + rate) and years += 1. Then print("Years:", years) and print(f"Balance: {balance:.2f}").',
      ],
      answer: 'balance = 1000\ngoal = 2000\nrate = 0.07\n\nyears = 0\nwhile balance < goal:\n    balance = balance * (1 + rate)\n    years += 1\nprint("Years:", years)\nprint(f"Balance: {balance:.2f}")',
      wrong: [
        { code: 'balance = 1000\ngoal = 2000\nrate = 0.07\nyears = 0\nwhile balance <= goal:\n    balance = balance * (1 + rate)\n    years += 1\nprint("Years:", years)\nprint(f"Balance: {balance:.2f}")\n', fails: ["v-exact"], why: "<= keeps going at exactly the goal" },
        { code: 'balance = 1000\ngoal = 2000\nrate = 0.07\nyears = 1\nwhile balance < goal:\n    balance = balance * (1 + rate)\n    years += 1\nprint("Years:", years)\nprint(f"Balance: {balance:.2f}")\n', fails: ["years", "output", "v-other", "v-met", "v-exact"], why: "counter starts at 1" },
      ],
    },
    {
      id: "challenge-2",
      title: "Pay off a card",
      prompt:
        "A card has a `debt`. Each month, `rate` interest is added and then `payment` is paid. Count the months until the debt is 0 or less, in `months`. But if the first month's interest is at least the payment, the debt would never shrink: in that case don't loop at all, set `months` to `None` and print `Never paid off`. Otherwise print `Paid off in <months> months`.",
      expectedOutput: "Paid off in 9 months\n",
      looksFor: [
        "`months` counts the months until the debt reaches 0 or below.",
        "When `debt * rate >= payment`, `months` is `None` and the program prints `Never paid off` instead of looping forever.",
      ],
      starter: "debt = 1000\nrate = 0.01\npayment = 120\n\n# Guard against a payment that can't keep up, then count the months.\n",
      task: {
        checks: [
          { kind: "variable", id: "months", name: "months", expected: py.int(9) },
          { kind: "output", id: "output", label: "Prints the result", expected: "Paid off in 9 months\n" },
          { kind: "variant", id: "v-other", set: { debt: py.int(500), rate: py.float(0.02), payment: py.int(100) }, vars: { months: py.int(6) } },
          { kind: "variant", id: "v-short", set: { debt: py.int(150), payment: py.int(100) }, output: "Paid off in 2 months\n" },
          { kind: "variant", id: "v-never", set: { debt: py.int(1000), rate: py.float(0.05), payment: py.int(40) }, output: "Never paid off\n", vars: { months: py.none }, tip: "Check debt * rate >= payment before the loop; otherwise the loop never ends." },
          { kind: "variant", id: "v-hidden-equal", hidden: true, set: { debt: py.int(1000), rate: py.float(0.05), payment: py.int(50) }, vars: { months: py.none } },
        ],
      },
      hints: [
        "First the guard: if debt * rate >= payment: months = None.",
        "Otherwise: months = 0, then while debt > 0: add the interest, subtract the payment, and add 1 to months.",
        "Print the right message depending on whether months is None.",
      ],
      answer: 'debt = 1000\nrate = 0.01\npayment = 120\n\nif debt * rate >= payment:\n    months = None\n    print("Never paid off")\nelse:\n    months = 0\n    while debt > 0:\n        debt = debt * (1 + rate) - payment\n        months += 1\n    print(f"Paid off in {months} months")',
      wrong: [
        { code: 'debt = 1000\nrate = 0.01\npayment = 120\nmonths = 0\nwhile debt > 0:\n    debt = debt - payment\n    months += 1\nprint(f"Paid off in {months} months")\n', fails: ["v-other", "v-never", "v-hidden-equal"], why: "ignores interest, no guard" },
        { code: 'debt = 1000\nrate = 0.01\npayment = 120\nif debt * rate > payment:\n    months = None\n    print("Never paid off")\nelse:\n    months = 0\n    while debt > 0:\n        debt = debt * (1 + rate) - payment\n        months += 1\n    print(f"Paid off in {months} months")\n', fails: "program", why: "> misses the equal case, which loops forever" },
      ],
    },
  ],

  quiz: [
    {
      id: "count",
      prompt: "What does this program print?",
      code: "n = 20\nsteps = 0\nwhile n > 1:\n    n = n // 2\n    steps += 1\nprint(steps, n)",
      options: [
        { text: "`4 1`", correct: true, why: "20 → 10 → 5 → 2 → 1: four halvings. At 1, `n > 1` is `False`, so the loop stops." },
        { text: "`5 0`", why: "The condition is checked before every iteration; once `n` is 1, there's no fifth halving." },
        { text: "`4 2`", why: "When `n` is 2 the condition is still true, so it's halved once more, to 1." },
        { text: "It never ends", why: "`n` gets smaller every iteration, so it must eventually stop being greater than 1." },
      ],
    },
    {
      id: "choose",
      prompt: "Which task needs a `while` loop rather than a `for` loop?",
      options: [
        { text: "Doubling a number until it passes 1,000,000", correct: true, why: "You don't know in advance how many doublings it takes; you repeat until a condition changes." },
        { text: "Printing every item in a shopping list", why: "You know exactly what to loop over: `for item in items:`." },
        { text: "Printing the numbers 1 to 10", why: "That's a known range: `for n in range(1, 11):`." },
        { text: "Counting the vowels in a sentence", why: "You loop over each character exactly once: `for ch in sentence:`." },
      ],
    },
  ],

  outcomes: [
    "Write a `while` loop that repeats until a condition becomes false.",
    "Make sure every iteration moves the state towards the end, and spot infinite loops.",
    "Count iterations with your own counter.",
    "Guard against inputs that would make a loop run forever.",
  ],
};
