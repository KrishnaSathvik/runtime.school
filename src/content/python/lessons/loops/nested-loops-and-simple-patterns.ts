import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const nestedLoopsAndSimplePatterns: PyLesson = {
  slug: "nested-loops-and-simple-patterns",
  ref: "python:nested-loops-and-simple-patterns",
  module: "loops",
  number: 7,
  title: "Nested loops and simple patterns",
  level: "beginner",
  summary:
    "Put a loop inside a loop to work through grids, tables and every pair of items, build each row of output before printing it, and see why the work grows quickly as the inputs grow.",

  sections: [
    {
      label: "a loop inside a loop",
      blocks: [
        {
          kind: "p",
          text: "The body of a loop can contain another loop. For **each** iteration of the outer loop, the inner loop runs **all the way through**. With 3 outer iterations and 4 inner ones, the inner body runs 3 × 4 = 12 times.",
        },
        { kind: "code", code: 'for row in range(1, 4):\n    for col in range(1, 5):\n        print(row, col)' },
        {
          kind: "p",
          text: "The usual picture is a grid: the outer loop picks a row, the inner loop walks across its columns. Give the two loop variables different, meaningful names (`row` and `col`, not `i` and `i`).",
        },
      ],
    },
    {
      label: "building a row, then printing it",
      blocks: [
        {
          kind: "p",
          text: "To print a grid, build each row as a string inside the inner loop, then print it once the inner loop has finished, back at the outer loop's indentation. Start each row empty at the top of the outer loop, so it resets for every row.",
        },
        { kind: "code", code: 'for row in range(1, 4):\n    line = ""\n    for col in range(1, 4):\n        line += f"{row * col:4}"\n    print(line)' },
      ],
    },
    {
      label: "pairs, and how fast work grows",
      blocks: [
        {
          kind: "p",
          text: "Nested loops over the same list visit every **pair** of items. Starting the inner loop after the outer position, `for j in range(i + 1, n)`, visits each pair once and never pairs an item with itself.",
        },
        {
          kind: "p",
          text: "Doubling the input roughly quadruples the work of a nested loop: 100 items make about 5,000 pairs, 1,000 items about 500,000. That's fine for small data; for large data, look for a way to avoid comparing everything with everything (a set or dictionary lookup, in the next module).",
        },
      ],
    },
  ],

  example: {
    caption: "A small multiplication grid. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'size = 4\nfor row in range(1, size + 1):\n    line = ""\n    for col in range(1, size + 1):\n        line += f"{row * col:4}"\n    print(line)',
  },

  walkthrough: [
    {
      title: "The inner loop runs fully each time",
      text: "For each `row`, `col` goes through all its values before `row` moves on.",
      code: "for row in range(1, 3):\n    for col in range(1, 4):\n        print(f\"row {row}, col {col}\")",
    },
    {
      title: "Counting the inner iterations",
      text: "3 outer iterations × 4 inner iterations: the inner body runs 12 times.",
      code: "runs = 0\nfor row in range(3):\n    for col in range(4):\n        runs += 1\nprint(runs)",
    },
    {
      title: "A triangle pattern",
      text: "The inner loop's length depends on the outer variable, so each row is one star longer.",
      code: 'for row in range(1, 5):\n    line = ""\n    for _ in range(row):\n        line += "*"\n    print(line)',
    },
    {
      title: "Every pair once",
      text: "Starting the inner loop at `i + 1` gives each pair once, and never pairs an item with itself.",
      code: 'names = ["Ana", "Ben", "Cai"]\nfor i in range(len(names)):\n    for j in range(i + 1, len(names)):\n        print(names[i], "vs", names[j])',
    },
  ],

  mistakes: [
    {
      title: "Not resetting the row",
      text: "`line` is created once, before both loops, so every row keeps the previous rows' stars.",
      code: 'line = ""\nfor row in range(1, 4):\n    for _ in range(row):\n        line += "*"\n    print(line)',
      fix: "Start each row with `line = \"\"` inside the outer loop, before the inner loop.",
    },
    {
      title: "Printing inside the inner loop",
      text: "The `print` is indented into the inner loop, so the half-built row is printed after every star.",
      code: 'for row in range(1, 3):\n    line = ""\n    for _ in range(3):\n        line += "*"\n        print(line)',
      fix: "Dedent the `print` to the outer loop's body, so it runs once per row.",
    },
    {
      title: "Reusing the same loop variable",
      text: "Both loops use `i`, so the inner loop overwrites the outer one's value: `print` shows the inner loop's last value, 2, both times instead of the row numbers 1 and 2.",
      code: "for i in range(1, 3):\n    for i in range(3):\n        pass\n    print(\"row\", i)",
      fix: "Give each loop its own variable: `row` and `col`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Print a multiplication grid",
      prompt:
        "Print a `size` × `size` multiplication grid. Each row is one line; each value is right-aligned in a column 4 characters wide (`f\"{value:4}\"`), so the columns line up. Check answer tries other sizes.",
      expectedOutput: "   1   2   3\n   2   4   6\n   3   6   9\n",
      looksFor: [
        "`size` lines, each with `size` values; the value in row r, column c is r × c.",
        "Each value takes exactly 4 characters, right-aligned.",
      ],
      starter: "size = 3\n\n# Build each row as a string, then print it.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the 3 × 3 grid", expected: "   1   2   3\n   2   4   6\n   3   6   9\n", tip: "Build the row inside the inner loop, and print it after the inner loop finishes." },
          { kind: "variant", id: "v-2", set: { size: py.int(2) }, output: "   1   2\n   2   4\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { size: py.int(5) }, output: [1, 2, 3, 4, 5].map((r) => [1, 2, 3, 4, 5].map((c) => String(r * c).padStart(4)).join("") + "\n").join("") },
        ],
      },
      hints: [
        "Outer loop: for row in range(1, size + 1). Start each row with line = \"\".",
        'Inner loop: for col in range(1, size + 1): line += f"{row * col:4}".',
        "After the inner loop (indented once, not twice): print(line).",
      ],
      answer: 'size = 3\n\nfor row in range(1, size + 1):\n    line = ""\n    for col in range(1, size + 1):\n        line += f"{row * col:4}"\n    print(line)',
      alternatives: ['size = 3\nfor row in range(1, size + 1):\n    for col in range(1, size + 1):\n        print(f"{row * col:4}", end="")\n    print()\n'],
      wrong: [
        { code: 'size = 3\nfor row in range(1, size + 1):\n    line = ""\n    for col in range(1, size + 1):\n        line += f"{row * col}"\n    print(line)\n', fails: ["output", "v-2", "v-hidden"], why: "no column width" },
        { code: 'size = 3\nline = ""\nfor row in range(1, size + 1):\n    for col in range(1, size + 1):\n        line += f"{row * col:4}"\n    print(line)\n', fails: ["output", "v-2", "v-hidden"], why: "row never reset" },
        { code: 'size = 3\nfor row in range(size):\n    line = ""\n    for col in range(size):\n        line += f"{row * col:4}"\n    print(line)\n', fails: ["output", "v-2", "v-hidden"], why: "starts at 0" },
      ],
    },
    {
      id: "challenge-2",
      title: "Find pairs within budget",
      prompt:
        "A customer wants two **different** items from `prices` whose combined price is exactly `budget`. Count every such pair once into `pair_count`, and print each pair's positions and prices as shown (the earlier position first). Then print the count.",
      expectedOutput: "0 and 3: 12 + 28\n1 and 2: 15 + 25\nPairs: 2\n",
      looksFor: [
        "Every pair of different positions whose prices add up to `budget` is printed once, earlier position first, in order.",
        "An item is never paired with itself, and `pair_count` counts the pairs.",
      ],
      starter: "prices = [12, 15, 25, 28, 40]\nbudget = 40\n\n# Check every pair of different items once.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the matching pairs", expected: "0 and 3: 12 + 28\n1 and 2: 15 + 25\nPairs: 2\n" },
          { kind: "variable", id: "count", name: "pair_count", expected: py.int(2) },
          { kind: "variant", id: "v-self", set: { prices: py.list(py.int(20), py.int(5), py.int(35)), budget: py.int(40) }, output: "1 and 2: 5 + 35\nPairs: 1\n", tip: "Start the inner loop at i + 1, so an item (here 20 + 20) is never paired with itself." },
          { kind: "variant", id: "v-none", set: { prices: py.list(py.int(1), py.int(2)), budget: py.int(10) }, output: "Pairs: 0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { prices: py.list(py.int(10), py.int(10), py.int(10)), budget: py.int(20) }, vars: { pair_count: py.int(3) } },
        ],
      },
      hints: [
        "pair_count = 0. Outer loop: for i in range(len(prices)).",
        "Inner loop from the next position: for j in range(i + 1, len(prices)).",
        'If prices[i] + prices[j] == budget: print(f"{i} and {j}: {prices[i]} + {prices[j]}") and add 1 to pair_count.',
      ],
      answer: 'prices = [12, 15, 25, 28, 40]\nbudget = 40\n\npair_count = 0\nfor i in range(len(prices)):\n    for j in range(i + 1, len(prices)):\n        if prices[i] + prices[j] == budget:\n            print(f"{i} and {j}: {prices[i]} + {prices[j]}")\n            pair_count += 1\nprint("Pairs:", pair_count)',
      alternatives: ['prices = [12, 15, 25, 28, 40]\nbudget = 40\npair_count = 0\nfor i, first in enumerate(prices):\n    for j, second in enumerate(prices):\n        if j <= i:\n            continue\n        if first + second == budget:\n            print(f"{i} and {j}: {first} + {second}")\n            pair_count += 1\nprint("Pairs:", pair_count)\n'],
      wrong: [
        { code: 'prices = [12, 15, 25, 28, 40]\nbudget = 40\npair_count = 0\nfor i in range(len(prices)):\n    for j in range(len(prices)):\n        if prices[i] + prices[j] == budget:\n            print(f"{i} and {j}: {prices[i]} + {prices[j]}")\n            pair_count += 1\nprint("Pairs:", pair_count)\n', fails: ["output", "count", "v-self", "v-hidden"], why: "every ordered pair, and items with themselves" },
        { code: 'prices = [12, 15, 25, 28, 40]\nbudget = 40\npair_count = 0\nfor i in range(len(prices)):\n    for j in range(i, len(prices)):\n        if prices[i] + prices[j] == budget:\n            print(f"{i} and {j}: {prices[i]} + {prices[j]}")\n            pair_count += 1\nprint("Pairs:", pair_count)\n', fails: ["v-self", "v-hidden"], why: "pairs an item with itself" },
      ],
    },
  ],

  quiz: [
    {
      id: "count-runs",
      prompt: "How many times does `print` run?",
      code: "for a in range(4):\n    for b in range(a):\n        print(a, b)",
      options: [
        { text: "6", correct: true, why: "The inner loop runs 0, 1, 2 and 3 times as `a` goes from 0 to 3: 0 + 1 + 2 + 3 = 6." },
        { text: "16", why: "That would be two independent loops of 4. Here the inner loop's length is `a`, which changes." },
        { text: "4", why: "The inner loop runs several times for each larger `a`, not once." },
        { text: "10", why: "`range(4)` gives 0 to 3, and `range(a)` stops before `a`, so the counts are 0, 1, 2, 3." },
      ],
    },
    {
      id: "pattern",
      prompt: "What does this print?",
      code: 'for row in range(3):\n    line = ""\n    for col in range(3):\n        line += "#" if col <= row else "."\n    print(line)',
      options: [
        { text: "`#..`, `##.`, `###`", correct: true, why: "In row 0 only column 0 qualifies; each row adds one more `#`." },
        { text: "`###`, `##.`, `#..`", why: "The condition is `col <= row`, which allows more columns as `row` grows." },
        { text: "`###` three times", why: "Columns after `row` get a `.`, so the early rows are shorter on `#`." },
        { text: "`#`, `##`, `###`", why: "Every row has three characters: a `#` or a `.` for each column." },
      ],
    },
  ],

  outcomes: [
    "Write nested loops and predict how many times the inner body runs.",
    "Build a row of output in the inner loop and print it from the outer loop.",
    "Visit every pair of items once with `range(i + 1, n)`.",
    "Recognise that nested loops get slow quickly as inputs grow.",
  ],
};
