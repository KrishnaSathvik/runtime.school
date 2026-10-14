import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const enumerateAndZip: PyLesson = {
  slug: "enumerate-and-zip",
  ref: "python:enumerate-and-zip",
  module: "loops",
  number: 6,
  title: "enumerate and zip",
  level: "beginner",
  summary:
    "Get each item's position along with the item using `enumerate()`, and walk through two or more lists side by side using `zip()`, without managing indexes yourself.",

  sections: [
    {
      label: "enumerate(): the position and the item",
      blocks: [
        {
          kind: "p",
          text: "When you need to know where you are in a list, `enumerate(items)` gives you pairs: the position and the item. The loop header names both, separated by a comma.",
        },
        { kind: "code", code: 'for position, name in enumerate(["Desk", "Lamp"]):\n    print(position, name)    # 0 Desk, then 1 Lamp' },
        {
          kind: "p",
          text: "Positions start at 0. For a numbered list that people will read, start counting at 1 with `enumerate(items, start=1)`. That's clearer and safer than `range(len(items))` plus indexing, and it works on anything you can loop over, including strings.",
        },
      ],
    },
    {
      label: "zip(): lists side by side",
      blocks: [
        {
          kind: "p",
          text: "Data often comes in **parallel lists**, where the item at each position belongs together: `skus[0]` goes with `prices[0]`. `zip(skus, prices)` pairs them up: first with first, second with second.",
        },
        { kind: "code", code: 'for sku, price in zip(["A1", "B2"], [2.5, 4.0]):\n    print(sku, price)' },
        {
          kind: "p",
          text: "`zip()` can take three or more lists. It stops at the **shortest**, silently dropping the leftovers of longer lists. If lists should always be the same length, that silence can hide a bug: check the lengths first, or pass `strict=True`, which raises a `ValueError` when they differ.",
        },
      ],
    },
    {
      label: "unpacking in the loop header",
      blocks: [
        {
          kind: "p",
          text: "Writing two names, `for position, name in …`, **unpacks** each pair into two variables. The number of names must match the number of values in each item. Tuples and Unpacking covers this properly; for loops, this is all you need.",
        },
      ],
    },
  ],

  example: {
    caption: "A numbered order with parallel lists. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'products = ["Desk", "Lamp", "Chair"]\nprices = [120.0, 24.5, 89.0]\nquantities = [1, 2, 4]\n\nfor number, product in enumerate(products, start=1):\n    print(f"{number}. {product}")\n\ntotal = 0\nfor product, price, qty in zip(products, prices, quantities):\n    total += price * qty\nprint(f"Total: {total:.2f}")',
  },

  walkthrough: [
    {
      title: "enumerate gives positions",
      text: "Each iteration gets a position and an item. Counting starts at 0.",
      code: 'for position, letter in enumerate("abc"):\n    print(position, letter)',
    },
    {
      title: "start=1 for people",
      text: "The numbering a reader expects starts at 1.",
      code: 'tasks = ["Wash", "Dry", "Fold"]\nfor number, task in enumerate(tasks, start=1):\n    print(f"{number}. {task}")',
    },
    {
      title: "zip pairs items by position",
      text: "Each iteration gets one item from each list, from the same position.",
      code: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0, 1.25]\nfor sku, price in zip(skus, prices):\n    print(sku, "costs", price)',
    },
    {
      title: "zip stops at the shortest list",
      text: "`C3` has no price, so it's silently left out. With `strict=True`, the mismatch is an error instead.",
      code: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0]\nfor sku, price in zip(skus, prices):\n    print(sku, price)\nprint(len(skus), len(prices))',
    },
  ],

  mistakes: [
    {
      title: "Forgetting to unpack the pair",
      text: "With one loop variable, each item from `enumerate` is a pair, printed in brackets: `(0, 'Desk')`.",
      code: 'for item in enumerate(["Desk", "Lamp"]):\n    print(item)',
      fix: "Name both parts: `for position, name in enumerate(...)`.",
    },
    {
      title: "Unpacking into the wrong number of names",
      text: "Each item from `zip` of two lists has two values, but the header names three: a `ValueError`.",
      code: 'for a, b, c in zip(["A1", "B2"], [2.5, 4.0]):\n    print(a, b, c)',
      raises: "ValueError",
      fix: "Use one name per list you zip.",
    },
    {
      title: "Lists of different lengths",
      text: "With `strict=True`, `zip` raises a `ValueError` as soon as one list runs out before the others. The first two pairs are printed before it notices, but the missing price is no longer silent.",
      code: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0]\nfor sku, price in zip(skus, prices, strict=True):\n    print(sku, price)',
      raises: "ValueError",
      fix: "Find out why a price is missing. `strict=True` turns a silent data problem into an error you can see.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Print a numbered product list",
      prompt:
        "Print `products` as a numbered list starting at 1, in the form shown, using `enumerate()`. Then print how many products there are. Check answer tries other lists, including an empty one.",
      expectedOutput: "1. Desk\n2. Lamp\n3. Chair\n3 products\n",
      looksFor: [
        "Each product on its own line, numbered from 1, as `<n>. <name>`.",
        "A final line with the number of products.",
      ],
      starter: 'products = ["Desk", "Lamp", "Chair"]\n\n# Print the numbered list, then the count.\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the numbered list", expected: "1. Desk\n2. Lamp\n3. Chair\n3 products\n", tip: "enumerate(products, start=1) numbers from 1." },
          { kind: "variant", id: "v-other", set: { products: py.list(py.str("Pen"), py.str("Ink")) }, output: "1. Pen\n2. Ink\n2 products\n" },
          { kind: "variant", id: "v-empty", set: { products: py.list() }, output: "0 products\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { products: py.list(py.str("A"), py.str("B"), py.str("C"), py.str("D"), py.str("E")) }, output: "1. A\n2. B\n3. C\n4. D\n5. E\n5 products\n" },
        ],
      },
      hints: [
        "for number, product in enumerate(products, start=1):",
        'Inside the loop: print(f"{number}. {product}").',
        'After the loop: print(f"{len(products)} products").',
      ],
      answer: 'products = ["Desk", "Lamp", "Chair"]\n\nfor number, product in enumerate(products, start=1):\n    print(f"{number}. {product}")\nprint(f"{len(products)} products")',
      alternatives: ['products = ["Desk", "Lamp", "Chair"]\nfor i in range(len(products)):\n    print(str(i + 1) + ". " + products[i])\nprint(len(products), "products")\n'],
      wrong: [
        { code: 'products = ["Desk", "Lamp", "Chair"]\nfor number, product in enumerate(products):\n    print(f"{number}. {product}")\nprint(f"{len(products)} products")\n', fails: ["output", "v-other", "v-hidden"], why: "numbered from 0" },
        { code: 'products = ["Desk", "Lamp", "Chair"]\nfor number, product in enumerate(products, start=1):\n    print(f"{number}. {product}")\nprint(f"{number} products")\n', fails: ["v-empty"], why: "uses the loop variable, which doesn't exist for an empty list" },
      ],
    },
    {
      id: "challenge-2",
      title: "Value the stock",
      prompt:
        "Three parallel lists describe the stock: `skus`, `prices` and `quantities`. Using `zip()`, print one line per SKU in the form shown (the value is price times quantity, with 2 decimal places), and add up the total value of all stock in `total_value`. Print the total last.",
      expectedOutput: "A1: 3 x 2.50 = 7.50\nB2: 10 x 4.00 = 40.00\nC3: 0 x 1.25 = 0.00\nTotal: 47.50\n",
      looksFor: [
        "One line per SKU: `<sku>: <quantity> x <price> = <value>`, money with 2 decimal places.",
        "`total_value` is the sum of price × quantity over all three lists.",
      ],
      starter: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0, 1.25]\nquantities = [3, 10, 0]\n\n# Loop over the three lists together.\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints each SKU and the total", expected: "A1: 3 x 2.50 = 7.50\nB2: 10 x 4.00 = 40.00\nC3: 0 x 1.25 = 0.00\nTotal: 47.50\n" },
          { kind: "variable", id: "total", name: "total_value", expected: py.float(47.5) },
          { kind: "variant", id: "v-other", set: { skus: py.list(py.str("Z9")), prices: py.list(py.float(9.99)), quantities: py.list(py.int(2)) }, output: "Z9: 2 x 9.99 = 19.98\nTotal: 19.98\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { skus: py.list(), prices: py.list(), quantities: py.list() }, output: "Total: 0.00\n", vars: { total_value: py.int(0) } },
        ],
      },
      hints: [
        "total_value = 0, then for sku, price, qty in zip(skus, prices, quantities):",
        "value = price * qty; total_value += value.",
        'print(f"{sku}: {qty} x {price:.2f} = {value:.2f}"), and after the loop print(f"Total: {total_value:.2f}").',
      ],
      answer: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0, 1.25]\nquantities = [3, 10, 0]\n\ntotal_value = 0\nfor sku, price, qty in zip(skus, prices, quantities):\n    value = price * qty\n    total_value += value\n    print(f"{sku}: {qty} x {price:.2f} = {value:.2f}")\nprint(f"Total: {total_value:.2f}")',
      wrong: [
        { code: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0, 1.25]\nquantities = [3, 10, 0]\ntotal_value = 0\nfor sku, price in zip(skus, prices):\n    value = price * quantities[0]\n    total_value += value\n    print(f"{sku}: {quantities[0]} x {price:.2f} = {value:.2f}")\nprint(f"Total: {total_value:.2f}")\n', fails: ["output", "total"], why: "always the first quantity" },
        { code: 'skus = ["A1", "B2", "C3"]\nprices = [2.5, 4.0, 1.25]\nquantities = [3, 10, 0]\nfor sku, price, qty in zip(skus, prices, quantities):\n    total_value = 0\n    value = price * qty\n    total_value += value\n    print(f"{sku}: {qty} x {price:.2f} = {value:.2f}")\nprint(f"Total: {total_value:.2f}")\n', fails: ["output", "total", "v-hidden"], why: "total reset inside the loop" },
      ],
    },
  ],

  quiz: [
    {
      id: "zip-short",
      prompt: "What does this program print?",
      code: 'names = ["Ana", "Ben", "Cai"]\nscores = [90, 75]\nfor name, score in zip(names, scores):\n    print(name, score)',
      options: [
        { text: "`Ana 90`, then `Ben 75`", correct: true, why: "`zip` stops at the shortest list, so `Cai` is silently left out." },
        { text: "`Ana 90`, `Ben 75`, then `Cai None`", why: "`zip` doesn't fill in missing values; it stops at the end of the shortest list." },
        { text: "A `ValueError`", why: "Only `zip(..., strict=True)` raises an error for different lengths." },
        { text: "An `IndexError`", why: "`zip` never indexes past the end; it just stops." },
      ],
    },
    {
      id: "enumerate",
      prompt: "Which loop prints `1 a`, `2 b`, `3 c`?",
      options: [
        { text: '`for i, ch in enumerate("abc", start=1): print(i, ch)`', correct: true, why: "`enumerate` pairs each character with a count starting at 1." },
        { text: '`for i, ch in enumerate("abc"): print(i, ch)`', why: "Without `start=1`, counting starts at 0." },
        { text: '`for i, ch in zip("abc", range(1, 4)): print(i, ch)`', why: "This pairs them the other way round: `a 1`, `b 2`, `c 3`." },
        { text: '`for ch in enumerate("abc"): print(ch)`', why: "With one name, each item is a pair, printed as `(0, 'a')`." },
      ],
    },
  ],

  outcomes: [
    "Number items with `enumerate()`, starting at 0 or at 1.",
    "Loop over parallel lists together with `zip()`.",
    "Unpack pairs in a loop header with one name per value.",
    "Know that `zip()` stops at the shortest list, and use `strict=True` to catch mismatches.",
  ],
};
