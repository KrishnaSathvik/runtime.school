import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const expressionsAndAFirstProgram: PyLesson = {
  slug: "expressions-and-a-first-program",
  ref: "python:expressions-and-a-first-program",
  module: "foundations",
  number: 5,
  title: "Expressions and a first program",
  level: "beginner",
  summary:
    "Put everything from this module together: plan a calculation in steps, give each step a clear name, check the result against a worked example, and swap two values safely.",

  sections: [
    {
      label: "inputs, steps, output",
      blocks: [
        {
          kind: "p",
          text: "Most small programs have the same shape: some **inputs** at the top, a few **steps** that calculate new values from them, and **output** at the end. Keeping that order makes a program easy to read and easy to change: to try other inputs, you edit only the top.",
        },
        {
          kind: "p",
          text: "An **expression** is anything Python can work out to a value: `3`, `price`, `price * quantity`, `round(total, 2)`. A **statement** is a complete instruction, like an assignment or a `print()` call. Each line of a program is usually one statement, built out of expressions.",
        },
      ],
    },
    {
      label: "name the steps",
      blocks: [
        {
          kind: "p",
          text: "You could write a whole calculation as one long expression, but a few well-named intermediate variables are easier to read and to check. Compare these two ways of working out a fuel cost:",
        },
        {
          kind: "code",
          code: "# Hard to check\ncost = distance_km / 100 * litres_per_100km * price_per_litre\n\n# Each step can be printed and checked\nlitres = distance_km / 100 * litres_per_100km\ncost = litres * price_per_litre",
        },
        {
          kind: "p",
          text: "Before trusting a program, work out one example by hand (or with a calculator) and compare. If the program disagrees, print the intermediate values to find the step that went wrong.",
        },
      ],
    },
    {
      label: "swapping two values",
      blocks: [
        {
          kind: "p",
          text: "To exchange the values of two variables, you need somewhere to keep one of them for a moment. Writing `a = b` first would overwrite `a`'s value before you could copy it into `b`.",
        },
        { kind: "code", code: "temp = a   # keep a's value\na = b      # a now holds b's value\nb = temp   # b gets a's old value" },
        {
          kind: "p",
          text: "Python also has a one-line swap, `a, b = b, a`. You'll see how it works in Tuples and Unpacking.",
        },
      ],
    },
  ],

  example: {
    caption: "A complete small program: inputs, named steps, labelled output. Press Run to execute it with real Python; running examples never affects your progress.",
    code: '# Inputs: a road trip\ndistance_km = 420\nlitres_per_100km = 6.5\nprice_per_litre = 1.8\n\n# Steps\nlitres = distance_km / 100 * litres_per_100km\ncost = litres * price_per_litre\n\n# Output\nprint("Fuel needed:", round(litres, 1), "litres")\nprint("Fuel cost:", round(cost, 2))',
  },

  walkthrough: [
    {
      title: "Inputs first",
      text: "The inputs are plain assignments. Nothing is calculated or printed yet.",
      code: "distance_km = 420\nlitres_per_100km = 6.5\nprice_per_litre = 1.8",
    },
    {
      title: "One step at a time, printed while you check",
      text: "Printing each step while you work lets you compare against a hand calculation: 420 km is 4.2 hundreds, and 4.2 × 6.5 is 27.3 litres.",
      code: "distance_km = 420\nlitres_per_100km = 6.5\nprice_per_litre = 1.8\nlitres = distance_km / 100 * litres_per_100km\nprint(litres)\ncost = litres * price_per_litre\nprint(cost)",
    },
    {
      title: "Change an input, and everything follows",
      text: "Only the first line changed. Because every step is calculated from the inputs, the output updates by itself.",
      code: 'distance_km = 100\nlitres_per_100km = 6.5\nprice_per_litre = 1.8\nlitres = distance_km / 100 * litres_per_100km\ncost = litres * price_per_litre\nprint("Fuel cost:", round(cost, 2))',
    },
    {
      title: "Swap with a temporary variable",
      text: "`temp` keeps the morning shift's name while `morning` is overwritten. Then `evening` gets the saved value.",
      code: 'morning = "Ana"\nevening = "Ben"\ntemp = morning\nmorning = evening\nevening = temp\nprint("Morning:", morning)\nprint("Evening:", evening)',
    },
  ],

  mistakes: [
    {
      title: "Swapping without a temporary variable",
      text: "Line 3 copies Ben into `morning`, and Ana is gone. Line 4 then copies Ben back into `evening`. Both shifts end up with Ben.",
      code: 'morning = "Ana"\nevening = "Ben"\nmorning = evening\nevening = morning\nprint(morning, evening)',
      fix: "Save one value first: `temp = morning`, then `morning = evening`, then `evening = temp`.",
    },
    {
      title: "Forgetting the order of operations in a long expression",
      text: "The average of 70, 80 and 90 should be 80, but `/` runs before `+`, so this is `70 + 80 + 30.0`.",
      code: "a = 70\nb = 80\nc = 90\naverage = a + b + c / 3\nprint(average)",
      fix: "Add first, then divide: `average = (a + b + c) / 3`, or use an intermediate step: `total = a + b + c`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Split a restaurant bill",
      prompt:
        "Friends share a restaurant bill. Starting from `bill`, `tip_percent` and `people`, calculate the `tip`, the `total` (bill plus tip), and each person's `share` of the total. Print the three lines shown, with the share rounded to 2 decimal places. Use intermediate variables: Check answer also tries other bills.",
      expectedOutput: "Tip: 12.0\nTotal: 92.0\nEach pays: 30.67\n",
      looksFor: [
        "`tip` is `12.0`, `total` is `92.0` and `share` is about `30.666…` (rounded only when printed).",
        "`total` is calculated from `bill` and `tip`, and `share` from `total` and `people`.",
        "The program prints the three lines shown, and works for other bills.",
      ],
      starter: "bill = 80\ntip_percent = 15\npeople = 3\n\n# Calculate tip, total and share, then print them.\n",
      task: {
        checks: [
          { kind: "variable", id: "tip", name: "tip", expected: py.float(12.0), tip: "15% of 80 is 80 * 15 / 100." },
          { kind: "variable", id: "total", name: "total", expected: py.float(92.0) },
          { kind: "variable", id: "share", name: "share", expected: py.float(92 / 3), tip: "Keep share unrounded; round only inside print()." },
          { kind: "uses-variables", id: "total-calc", name: "total", uses: ["bill", "tip"] },
          { kind: "uses-variables", id: "share-calc", name: "share", uses: ["total", "people"] },
          { kind: "output", id: "output", label: "Prints the three lines", expected: "Tip: 12.0\nTotal: 92.0\nEach pays: 30.67\n", tip: 'print("Each pays:", round(share, 2)) rounds just the displayed value.' },
          { kind: "variant", id: "v-other", set: { bill: py.int(50), tip_percent: py.int(10), people: py.int(2) }, output: "Tip: 5.0\nTotal: 55.0\nEach pays: 27.5\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { bill: py.int(100), tip_percent: py.int(0), people: py.int(4) }, output: "Tip: 0.0\nTotal: 100.0\nEach pays: 25.0\n" },
        ],
      },
      hints: [
        "A percentage is a fraction of 100: tip = bill * tip_percent / 100.",
        "total = bill + tip, then share = total / people.",
        'Round only when printing: print("Each pays:", round(share, 2)).',
      ],
      answer:
        'bill = 80\ntip_percent = 15\npeople = 3\n\ntip = bill * tip_percent / 100\ntotal = bill + tip\nshare = total / people\n\nprint("Tip:", tip)\nprint("Total:", total)\nprint("Each pays:", round(share, 2))',
      alternatives: [
        'bill = 80\ntip_percent = 15\npeople = 3\ntip = bill * (tip_percent / 100)\ntotal = bill + tip\nshare = total / people\nprint("Tip:", tip)\nprint("Total:", total)\nprint("Each pays:", round(share, 2))\n',
      ],
      wrong: [
        { code: 'bill = 80\ntip_percent = 15\npeople = 3\ntip = bill * tip_percent / 100\ntotal = bill + tip\nshare = round(total / people, 2)\nprint("Tip:", tip)\nprint("Total:", total)\nprint("Each pays:", share)\n', fails: ["share"], why: "rounded the stored value" },
        { code: 'bill = 80\ntip_percent = 15\npeople = 3\ntip = bill * tip_percent / 100\ntotal = bill + tip_percent\nshare = total / people\nprint("Tip:", tip)\nprint("Total:", total)\nprint("Each pays:", round(share, 2))\n', fails: ["total", "share", "total-calc", "output", "v-other", "v-hidden"], why: "added the percentage, not the tip" },
        { code: 'bill = 80\ntip_percent = 15\npeople = 3\ntip = bill * tip_percent / 100\ntotal = bill + tip\nshare = bill + tip / people\nprint("Tip:", tip)\nprint("Total:", total)\nprint("Each pays:", round(share, 2))\n', fails: ["share", "share-calc", "output", "v-other", "v-hidden"], why: "order of operations" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix the shift swap",
      prompt:
        "The rota has the two shifts the wrong way round, and this program is meant to swap them, but both shifts end up with the same person. Fix it so `morning` and `evening` really exchange their values, then print them as shown. Keep the first two lines: Check answer tries other names.",
      expectedOutput: "Morning: Ben\nEvening: Ana\n",
      looksFor: [
        "After the swap, `morning` holds the old `evening` value and `evening` the old `morning` value.",
        "The program prints the two lines shown, and works for any two names.",
      ],
      starter: 'morning = "Ana"\nevening = "Ben"\n\n# Swap the two shifts.\nmorning = evening\nevening = morning\n\nprint("Morning:", morning)\nprint("Evening:", evening)\n',
      task: {
        checks: [
          { kind: "variable", id: "morning", name: "morning", expected: py.str("Ben") },
          { kind: "variable", id: "evening", name: "evening", expected: py.str("Ana"), tip: "By the time evening = morning runs, morning has already been overwritten. Save its value first." },
          { kind: "output", id: "output", label: "Prints both shifts", expected: "Morning: Ben\nEvening: Ana\n" },
          { kind: "variant", id: "v-other", set: { morning: py.str("Kai"), evening: py.str("Lee") }, output: "Morning: Lee\nEvening: Kai\n" },
        ],
      },
      hints: [
        "Run the starter: both lines say Ben. Which line destroyed Ana's name?",
        "Before overwriting morning, copy its value into another variable, such as temp.",
        "temp = morning, then morning = evening, then evening = temp.",
      ],
      answer: 'morning = "Ana"\nevening = "Ben"\n\n# Swap the two shifts.\ntemp = morning\nmorning = evening\nevening = temp\n\nprint("Morning:", morning)\nprint("Evening:", evening)',
      alternatives: [
        'morning = "Ana"\nevening = "Ben"\nmorning, evening = evening, morning\nprint("Morning:", morning)\nprint("Evening:", evening)\n',
        'morning = "Ana"\nevening = "Ben"\nold_evening = evening\nevening = morning\nmorning = old_evening\nprint("Morning:", morning)\nprint("Evening:", evening)\n',
      ],
      wrong: [
        { code: 'morning = "Ana"\nevening = "Ben"\nmorning = "Ben"\nevening = "Ana"\nprint("Morning:", morning)\nprint("Evening:", evening)\n', fails: ["v-other"], why: "typed the names" },
        { code: 'morning = "Ana"\nevening = "Ben"\ntemp = morning\nmorning = evening\nevening = morning\nprint("Morning:", morning)\nprint("Evening:", evening)\n', fails: ["evening", "output", "v-other"], why: "saved but didn't use temp" },
      ],
    },
  ],

  quiz: [
    {
      id: "swap",
      prompt: "What does this program print?",
      code: "a = 1\nb = 2\na = b\nb = a\nprint(a, b)",
      options: [
        { text: "`2 2`", correct: true, why: "`a = b` makes `a` 2, and the 1 is lost. Then `b = a` copies that 2 back into `b`." },
        { text: "`2 1`", why: "That's a successful swap, which needs a temporary variable to keep `a`'s old value." },
        { text: "`1 1`", why: "The first assignment changes `a`, not `b`: `a = b` copies `b`'s value into `a`." },
        { text: "`1 2`", why: "Both assignments run, in order, and each one replaces a value." },
      ],
    },
    {
      id: "expression",
      prompt: "In `total = round(price * quantity, 2)`, which of these is **not** an expression?",
      options: [
        { text: "`total = round(price * quantity, 2)`", correct: true, why: "The whole line is a statement: an assignment. It doesn't have a value of its own; it stores one." },
        { text: "`price * quantity`", why: "This works out to a value (the product), so it's an expression." },
        { text: "`round(price * quantity, 2)`", why: "A call that gives back a value is an expression too." },
        { text: "`price`", why: "A name on its own is the simplest expression: its value is whatever it currently holds." },
      ],
    },
  ],

  outcomes: [
    "Lay out a program as inputs, named steps and labelled output.",
    "Check a calculation against a worked example, printing intermediate values to find mistakes.",
    "Swap two variables with a temporary variable, and explain why `a = b; b = a` fails.",
    "Tell an expression from a statement.",
  ],
};
