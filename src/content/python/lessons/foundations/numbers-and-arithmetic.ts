import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const numbersAndArithmetic: PyLesson = {
  slug: "numbers-and-arithmetic",
  ref: "python:numbers-and-arithmetic",
  module: "foundations",
  number: 3,
  title: "Numbers and arithmetic",
  level: "beginner",
  summary:
    "Divide two ways with `/` and `//`, find remainders with `%`, raise to powers, control the order of a calculation, and update a variable in place with `+=`.",

  sections: [
    {
      label: "two kinds of division",
      blocks: [
        {
          kind: "p",
          text: "`/` is ordinary division, and it **always gives a float**, even when the numbers divide exactly: `8 / 2` is `4.0`, not `4`.",
        },
        {
          kind: "p",
          text: "`//` is **floor division**: it divides and keeps only the whole part, so `47 // 6` is `7`. `%` (read “modulo”) gives what is left over: `47 % 6` is `5`, because 7 boxes of 6 use 42 of the 47 items. Together they answer questions like “how many full boxes, and how many left over?”",
        },
        { kind: "code", code: "minutes = 135\nhours = minutes // 60   # 2\nleft = minutes % 60     # 15" },
        {
          kind: "p",
          text: "With negative numbers, `//` rounds **down**, towards minus infinity, not towards zero: `-7 // 2` is `-4`. Most everyday code divides positive amounts, but this surprises people when it happens.",
        },
      ],
    },
    {
      label: "powers and order of operations",
      blocks: [
        {
          kind: "p",
          text: "`**` raises to a power: `2 ** 3` is `8`. When a calculation mixes operators, Python follows the usual maths order: `**` first, then `*`, `/`, `//` and `%`, then `+` and `-`. Operators at the same level run left to right.",
        },
        { kind: "code", code: "print(2 + 3 * 4)     # 14: multiplication first\nprint((2 + 3) * 4)   # 20: brackets first" },
        {
          kind: "p",
          text: "Parentheses override the order. Use them whenever a reader might hesitate, even if Python wouldn't need them.",
        },
      ],
    },
    {
      label: "floats are close, not exact",
      blocks: [
        {
          kind: "p",
          text: "Floats are stored in binary, and most decimal fractions can't be stored exactly. `0.1 + 0.2` prints `0.30000000000000004`. That is normal in every programming language, not a bug in your code.",
        },
        {
          kind: "p",
          text: "`round(value, 2)` rounds to two decimal places, which is what you usually want when showing money. Round the result you show; keep calculating with the unrounded values.",
        },
        {
          kind: "p",
          text: "Dividing by zero is an error: `10 / 0` stops the program with a `ZeroDivisionError`. So do `10 // 0` and `10 % 0`.",
        },
      ],
    },
    {
      label: "updating a variable in place",
      blocks: [
        {
          kind: "p",
          text: "Programs often change a variable based on its own value: `balance = balance + 30`. Python has a shorter way to write that: `balance += 30`. It means exactly the same thing.",
        },
        { kind: "code", code: "points = 10\npoints += 5    # same as points = points + 5\npoints -= 3    # 12\npoints *= 2    # 24" },
        {
          kind: "p",
          text: "This is called **augmented assignment**, and every operator has one: `+=`, `-=`, `*=`, `/=`, `//=`, `%=` and `**=`. The variable must already exist, because Python reads its current value first.",
        },
      ],
    },
  ],

  example: {
    caption: "Turning a number of minutes into hours and minutes. Press Run to execute it with real Python; running examples never affects your progress.",
    code: '# A film lasts 135 minutes.\nminutes = 135\nhours = minutes // 60\nleft = minutes % 60\nprint("Hours:", hours)\nprint("Minutes:", left)\nprint("As a decimal:", minutes / 60, "hours")',
  },

  walkthrough: [
    {
      title: "/ always gives a float",
      text: "`7 / 2` is `3.5`. `8 / 2` divides exactly, but the result is still a float, `4.0`: that's what `/` always gives.",
      code: "print(7 / 2)\nprint(8 / 2)",
    },
    {
      title: "// and % split a division",
      text: "47 items in boxes of 6 make 7 full boxes, with 5 left over. The last line checks the split: 7 boxes of 6 plus 5 is back to 47.",
      code: "items = 47\nbox_size = 6\nprint(items // box_size)\nprint(items % box_size)\nprint(items // box_size * box_size + items % box_size)",
    },
    {
      title: "The order of operations",
      text: "`**` runs before `*`, and `*` before `+`, so the first line is `2 + 3 * 16`, which is `50`. Brackets change the order in the second line: `(2 + 3) * 4` is `5 * 4`. The third line shows `//` rounding down, below zero.",
      code: "print(2 + 3 * 4 ** 2)\nprint((2 + 3) * 4)\nprint(-7 // 2)",
    },
    {
      title: "Augmented assignment updates a value",
      text: "Each line reads `points`, changes it, and stores the result back. `/=` divides, so `points` becomes a float.",
      code: 'points = 10\npoints += 5\nprint(points)\npoints -= 3\nprint(points)\npoints *= 2\nprint(points)\npoints /= 4\nprint(points)',
    },
    {
      title: "Rounding what you show",
      text: "The total really is `0.30000000000000004`; `round(total, 2)` gives `0.3` for display. `round()` with one argument rounds to a whole number.",
      code: "total = 0.1 + 0.2\nprint(total)\nprint(round(total, 2))\nprint(round(7.6))",
    },
  ],

  mistakes: [
    {
      title: "Using / when you need a whole number",
      text: "The question is how many **full** boxes there are, but `/` gives `7.833333333333333`. Nobody ships 0.83 of a box.",
      code: "items = 47\nbox_size = 6\nfull_boxes = items / box_size\nprint(full_boxes)",
      fix: "Use floor division for whole groups: `full_boxes = items // box_size`, and `%` for what is left over.",
    },
    {
      title: "Dividing by zero",
      text: "Nobody has bought anything yet, so `orders` is `0`, and the program stops with a `ZeroDivisionError` on line 3.",
      code: "revenue = 0\norders = 0\naverage = revenue / orders\nprint(average)",
      raises: "ZeroDivisionError",
      fix: "Make sure the number you divide by can't be zero. In Conditions and Logic you'll learn to check it before dividing.",
    },
    {
      title: "Using += on a name that doesn't exist yet",
      text: "`total += 5` means `total = total + 5`, so Python has to read `total` first. It was never assigned, so this is a `NameError`.",
      code: "total += 5\nprint(total)",
      raises: "NameError",
      fix: "Give the variable a starting value first, such as `total = 0`, then update it with `+=`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Pack items into boxes",
      prompt:
        "A warehouse packs `items` into boxes that each hold `box_size` items. Calculate how many boxes can be filled completely (`full_boxes`) and how many items are left over (`left_over`), then print both as shown. Check answer also runs your program with other numbers of items and box sizes, so calculate from the variables.",
      expectedOutput: "Full boxes: 7\nLeft over: 5\n",
      looksFor: [
        "`full_boxes` is `7` and `left_over` is `5`, both calculated from `items` and `box_size`.",
        "The program prints the two lines shown.",
        "It still gives the right answers when `items` and `box_size` are changed to other values.",
      ],
      starter: "items = 47\nbox_size = 6\n\n# Calculate full_boxes and left_over, then print them.\n",
      task: {
        checks: [
          { kind: "variable", id: "full-boxes", name: "full_boxes", expected: py.int(7), tip: "A full box is a whole number of items: use floor division, //." },
          { kind: "variable", id: "left-over", name: "left_over", expected: py.int(5), tip: "% gives the remainder of a division: items % box_size." },
          { kind: "uses-variables", id: "full-calc", name: "full_boxes", uses: ["items", "box_size"] },
          { kind: "uses-variables", id: "left-calc", name: "left_over", uses: ["items", "box_size"] },
          { kind: "output", id: "output", label: "Prints both lines", expected: "Full boxes: 7\nLeft over: 5\n", tip: 'Print a label and the value: print("Full boxes:", full_boxes).' },
          { kind: "variant", id: "v-even", set: { items: py.int(12), box_size: py.int(6) }, output: "Full boxes: 2\nLeft over: 0\n" },
          { kind: "variant", id: "v-small", hidden: true, set: { items: py.int(5), box_size: py.int(8) }, output: "Full boxes: 0\nLeft over: 5\n" },
        ],
      },
      hints: [
        "47 // 6 gives the number of full boxes. Write it with the variable names, not the numbers.",
        "The left-over items are the remainder of the same division: items % box_size.",
        'Then print("Full boxes:", full_boxes) and print("Left over:", left_over).',
      ],
      answer: 'items = 47\nbox_size = 6\n\nfull_boxes = items // box_size\nleft_over = items % box_size\nprint("Full boxes:", full_boxes)\nprint("Left over:", left_over)',
      alternatives: [
        'items = 47\nbox_size = 6\nfull_boxes = items // box_size\nleft_over = items - full_boxes * box_size\nprint("Full boxes:", full_boxes)\nprint("Left over:", left_over)\n',
      ],
      wrong: [
        { code: 'items = 47\nbox_size = 6\nfull_boxes = items / box_size\nleft_over = items % box_size\nprint("Full boxes:", full_boxes)\nprint("Left over:", left_over)\n', fails: ["full-boxes", "output", "v-even", "v-small"], why: "/ gives a float" },
        { code: 'items = 47\nbox_size = 6\nfull_boxes = 7\nleft_over = 5\nprint("Full boxes:", full_boxes)\nprint("Left over:", left_over)\n', fails: ["full-calc", "left-calc", "v-even", "v-small"], why: "typed the answers" },
        { code: 'items = 47\nbox_size = 6\nfull_boxes = items // box_size\nleft_over = items - full_boxes\nprint("Full boxes:", full_boxes)\nprint("Left over:", left_over)\n', fails: ["left-over", "left-calc", "output", "v-even"], why: "subtracted boxes, not items" },
      ],
    },
    {
      id: "challenge-2",
      title: "Track a savings jar",
      prompt:
        "A savings jar starts with `balance`. Three things happen in order: a `gift` is added, a `purchase` is paid for, and then a parent matches the savings, doubling what is in the jar. Update `balance` after each event (augmented assignment like `+=` is the natural way) and print it after each one, as shown.",
      expectedOutput: "After gift: 150\nAfter purchase: 105\nAfter match: 210\n",
      looksFor: [
        "The program prints the balance after each of the three events, as shown.",
        "`balance` ends as `210`.",
        "It still works when the starting balance, the gift and the purchase are different.",
      ],
      starter: "balance = 120\ngift = 30\npurchase = 45\n\n# Update balance after each event and print it.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the balance after each event", expected: "After gift: 150\nAfter purchase: 105\nAfter match: 210\n", tip: "Change balance, print it, and repeat for each event, in order." },
          { kind: "variable", id: "balance", label: "balance ends as 210", name: "balance", expected: py.int(210), tip: "Doubling the jar is balance *= 2 (or balance = balance * 2)." },
          { kind: "variant", id: "v-other", set: { balance: py.int(50), gift: py.int(10), purchase: py.int(20) }, output: "After gift: 60\nAfter purchase: 40\nAfter match: 80\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { balance: py.int(0), gift: py.int(5), purchase: py.int(5) }, output: "After gift: 5\nAfter purchase: 0\nAfter match: 0\n", vars: { balance: py.int(0) } },
        ],
      },
      hints: [
        "Adding the gift to the balance is balance += gift.",
        "Paying for the purchase takes it away: balance -= purchase. Doubling is balance *= 2.",
        'Print after each update: print("After gift:", balance), and so on.',
      ],
      answer:
        'balance = 120\ngift = 30\npurchase = 45\n\nbalance += gift\nprint("After gift:", balance)\nbalance -= purchase\nprint("After purchase:", balance)\nbalance *= 2\nprint("After match:", balance)',
      alternatives: [
        'balance = 120\ngift = 30\npurchase = 45\nbalance = balance + gift\nprint("After gift:", balance)\nbalance = balance - purchase\nprint("After purchase:", balance)\nbalance = balance * 2\nprint("After match:", balance)\n',
      ],
      wrong: [
        { code: 'balance = 120\ngift = 30\npurchase = 45\nbalance += gift\nprint("After gift:", balance)\nbalance -= purchase\nprint("After purchase:", balance)\nbalance += 2\nprint("After match:", balance)\n', fails: ["output", "balance", "v-other", "v-hidden"], why: "+= 2 adds two instead of doubling" },
        { code: 'balance = 120\ngift = 30\npurchase = 45\nprint("After gift:", 150)\nprint("After purchase:", 105)\nprint("After match:", 210)\nbalance = 210\n', fails: ["v-other", "v-hidden"], why: "printed fixed numbers" },
        { code: 'balance = 120\ngift = 30\npurchase = 45\nbalance *= 2\nbalance += gift\nprint("After gift:", balance)\nbalance -= purchase\nprint("After purchase:", balance)\nprint("After match:", balance)\n', fails: ["output", "balance", "v-other"], why: "events in the wrong order" },
      ],
    },
  ],

  quiz: [
    {
      id: "precedence",
      prompt: "What does this line print?",
      code: "print(10 - 4 // 3 * 2)",
      options: [
        { text: "`8`", correct: true, why: "`//` and `*` run before `-`, left to right: `4 // 3` is `1`, times 2 is `2`, and `10 - 2` is `8`." },
        { text: "`4`", why: "That would be `(10 - 4) // 3 * 2`. Subtraction runs after `//` and `*` unless brackets say otherwise." },
        { text: "`7.333333333333333`", why: "`//` is floor division, which gives a whole number for two ints. Only `/` gives a float." },
        { text: "`9`", why: "`4 // 3 * 2` runs left to right: `(4 // 3) * 2` is `2`, not `4 // 6`." },
      ],
    },
    {
      id: "augmented",
      prompt: "After these lines run, what is `stock`?",
      code: "stock = 20\nstock -= 8\nstock *= 3\nprint(stock)",
      options: [
        { text: "`36`", correct: true, why: "`stock -= 8` makes it `12`; `stock *= 3` makes it `36`. Each line reads the current value, then stores the result." },
        { text: "`-4`", why: "`stock *= 3` multiplies the current value (`12`) by 3. It doesn't subtract 24 from 20." },
        { text: "`52`", why: "The lines run in order: subtract first, then multiply the result." },
        { text: "`60`", why: "`stock -= 8` runs first and changes `stock` to `12` before it is multiplied." },
      ],
    },
  ],

  outcomes: [
    "Choose between `/`, `//` and `%`, and predict whether a result is an int or a float.",
    "Work out the order of a calculation, and use parentheses to make it clear.",
    "Round a float for display with `round()`, and explain why `0.1 + 0.2` isn't exactly `0.3`.",
    "Update a variable in place with `+=`, `-=`, `*=` and the other augmented assignments.",
  ],
};
