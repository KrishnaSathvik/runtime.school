import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;

export const dictionaryIterationAndSafeLookup: PyLesson = {
  slug: "dictionary-iteration-and-safe-lookup",
  ref: "python:dictionary-iteration-and-safe-lookup",
  module: "collections",
  number: 6,
  title: "Dictionary iteration and safe lookup",
  level: "beginner",
  summary:
    "Loop over a dictionary's keys, values or pairs; read keys that might be missing with `get()` and a default; and use the counting pattern, `counts[k] = counts.get(k, 0) + 1`, that turns a list into a summary.",

  sections: [
    {
      label: "safe lookup with get()",
      blocks: [
        {
          kind: "p",
          text: "`d.get(key)` returns the value if the key exists, and `None` if it doesn't, instead of raising `KeyError`. `d.get(key, default)` returns `default` for a missing key: `stock.get(\"sofa\", 0)` treats an unknown product as having none.",
        },
        {
          kind: "p",
          text: "`get` never adds the key. Use it when a missing key has a sensible meaning (zero, “unknown”); use `d[key]` when a missing key is a real error you'd want to hear about.",
        },
      ],
    },
    {
      label: "looping over a dictionary",
      blocks: [
        {
          kind: "p",
          text: "`for key in d:` loops over the keys, in insertion order. `d.values()` gives the values and `d.items()` gives `(key, value)` pairs, which unpack neatly: `for product, units in sales.items():`.",
        },
        {
          kind: "p",
          text: "To loop in a particular order, sort: `for key in sorted(d):` goes alphabetically by key, and `sorted(d.items())` gives pairs sorted by key. Don't add or remove keys while looping over the same dictionary: it's a `RuntimeError`. Loop over `list(d)` instead if you must.",
        },
      ],
    },
    {
      label: "the counting pattern",
      blocks: [
        {
          kind: "p",
          text: "Counting how often each value appears is one of the most common things programs do. Start with an empty dictionary; for each item, look up the current count with a default of 0 and store one more:",
        },
        { kind: "code", code: 'counts = {}\nfor event in events:\n    counts[event] = counts.get(event, 0) + 1' },
        {
          kind: "p",
          text: "The same shape works for totals: `totals[customer] = totals.get(customer, 0) + amount`. The standard library's `collections.Counter` does counting for you; Importing and Using Modules shows it.",
        },
      ],
    },
  ],

  example: {
    caption: "Counting events by type. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'events = ["view", "click", "view", "purchase", "view", "click"]\n\ncounts = {}\nfor event in events:\n    counts[event] = counts.get(event, 0) + 1\n\nfor event, n in sorted(counts.items()):\n    print(f"{event:<10}{n:>3}")\nprint("Refunds:", counts.get("refund", 0))',
  },

  walkthrough: [
    {
      title: "get() with and without a default",
      text: "A missing key gives `None`, or the default you supply. Neither adds the key.",
      code: 'stock = {"desk": 5}\nprint(stock.get("desk"), stock.get("sofa"), stock.get("sofa", 0))\nprint(stock)',
    },
    {
      title: "keys, values and items",
      text: "Looping over the dictionary itself gives keys; `.items()` gives both, unpacked into two names.",
      code: 'sales = {"desk": 12, "lamp": 30}\nfor product in sales:\n    print(product)\nprint(sum(sales.values()))\nfor product, units in sales.items():\n    print(product, units)',
    },
    {
      title: "The counting pattern, step by step",
      text: "The first time a word is seen its count comes from the default 0; after that it goes up by one.",
      code: 'counts = {}\nfor word in ["to", "be", "or", "not", "to", "be"]:\n    counts[word] = counts.get(word, 0) + 1\n    print(word, counts)',
    },
    {
      title: "Finding the largest value",
      text: "Loop over the pairs and remember the best key so far. Comparing names too breaks ties alphabetically, so the answer doesn't depend on order.",
      code: 'sales = {"desk": 12, "lamp": 30, "chair": 30}\nbest = None\nfor product, units in sales.items():\n    if best is None or units > sales[best] or (units == sales[best] and product < best):\n        best = product\nprint(best, sales[best])',
    },
  ],

  mistakes: [
    {
      title: "Counting with d[key] += 1",
      text: "The first time a word appears it has no count yet, so `counts[word] += 1` is a `KeyError`.",
      code: 'counts = {}\nfor word in ["to", "be", "to"]:\n    counts[word] += 1',
      raises: "KeyError",
      fix: "Use `counts[word] = counts.get(word, 0) + 1`.",
    },
    {
      title: "Changing a dictionary while looping over it",
      text: "Removing a key from the dictionary you're looping over is a `RuntimeError`.",
      code: 'stock = {"desk": 5, "lamp": 0, "chair": 0}\nfor product in stock:\n    if stock[product] == 0:\n        del stock[product]',
      raises: "RuntimeError",
      fix: "Loop over a copy of the keys, `for product in list(stock):`, or build a new dictionary.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Count events by type",
      prompt:
        "Count how many times each event type appears in `events`, in a dictionary `counts` (event type → number). Then print one line per type, in **alphabetical order**, as shown. Check answer tries other event lists, including an empty one.",
      expectedOutput: "click: 2\npurchase: 1\nview: 3\n",
      looksFor: [
        "`counts` maps each event type to how many times it appears.",
        "The lines are printed in alphabetical order of event type.",
      ],
      starter: 'events = ["view", "click", "view", "purchase", "view", "click"]\n\n# Count each event type, then print the counts alphabetically.\n',
      task: {
        checks: [
          { kind: "variable", id: "counts", name: "counts", expected: py.dict([[s("view"), i(3)], [s("click"), i(2)], [s("purchase"), i(1)]]) },
          { kind: "output", id: "output", label: "Prints the counts alphabetically", expected: "click: 2\npurchase: 1\nview: 3\n", tip: "for event in sorted(counts): visits the keys in alphabetical order." },
          { kind: "variant", id: "v-other", set: { events: py.list(s("login"), s("login")) }, output: "login: 2\n" },
          { kind: "variant", id: "v-empty", set: { events: py.list() }, output: "", vars: { counts: py.dict([]) } },
        ],
      },
      hints: [
        "counts = {} before the loop.",
        "For each event: counts[event] = counts.get(event, 0) + 1.",
        'Then: for event in sorted(counts): print(f"{event}: {counts[event]}").',
      ],
      answer: 'events = ["view", "click", "view", "purchase", "view", "click"]\n\ncounts = {}\nfor event in events:\n    counts[event] = counts.get(event, 0) + 1\n\nfor event in sorted(counts):\n    print(f"{event}: {counts[event]}")',
      alternatives: ['events = ["view", "click", "view", "purchase", "view", "click"]\ncounts = {}\nfor event in events:\n    if event in counts:\n        counts[event] += 1\n    else:\n        counts[event] = 1\nfor event, n in sorted(counts.items()):\n    print(event + ": " + str(n))\n'],
      wrong: [
        { code: 'events = ["view", "click", "view", "purchase", "view", "click"]\ncounts = {}\nfor event in events:\n    counts[event] = counts.get(event, 0) + 1\nfor event in counts:\n    print(f"{event}: {counts[event]}")\n', fails: ["output"], why: "insertion order, not alphabetical" },
        { code: 'events = ["view", "click", "view", "purchase", "view", "click"]\ncounts = {}\nfor event in events:\n    counts[event] = 1\nfor event in sorted(counts):\n    print(f"{event}: {counts[event]}")\n', fails: ["counts", "output", "v-other"], why: "sets 1 instead of adding" },
      ],
    },
    {
      id: "challenge-2",
      title: "Find the best-selling product",
      prompt:
        "`sales` maps each product to the units sold. Store the product with the most units in `best` and its units in `best_units`. If two products tie, choose the one that comes **first alphabetically**, so the answer doesn't depend on the dictionary's order. If `sales` is empty, `best` is `None` and `best_units` is `0`. Print the result as shown.",
      expectedOutput: "Best seller: chair (30 units)\n",
      looksFor: [
        "`best` is the product with the most units; ties go to the alphabetically first product.",
        "`best_units` is its number of units.",
        "An empty `sales` gives `best = None` and `best_units = 0`.",
      ],
      starter: 'sales = {"desk": 12, "lamp": 30, "chair": 30, "rug": 5}\n\n# Find best and best_units, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "best", name: "best", expected: s("chair"), tip: "lamp and chair tie on 30; chair comes first alphabetically." },
          { kind: "variable", id: "units", name: "best_units", expected: i(30) },
          { kind: "output", id: "output", label: "Prints the best seller", expected: "Best seller: chair (30 units)\n" },
          { kind: "variant", id: "v-clear", set: { sales: py.dict([[s("pen"), i(3)], [s("ink"), i(9)]]) }, vars: { best: s("ink"), best_units: i(9) } },
          { kind: "variant", id: "v-tie-order", set: { sales: py.dict([[s("zebra"), i(4)], [s("apple"), i(4)]]) }, vars: { best: s("apple") }, tip: "Ties must be broken by name, whatever order the products were added in." },
          { kind: "variant", id: "v-empty", set: { sales: py.dict([]) }, vars: { best: py.none, best_units: i(0) } },
          { kind: "variant", id: "v-hidden-tie", hidden: true, set: { sales: py.dict([[s("apple"), i(4)], [s("zebra"), i(4)]]) }, vars: { best: s("apple") } },
        ],
      },
      hints: [
        "Start with best = None and best_units = 0, then loop: for product, units in sales.items():",
        "A product beats the current best if it has more units, or the same units and a name that sorts earlier (product < best).",
        "When a product wins, set best = product and best_units = units.",
      ],
      answer: 'sales = {"desk": 12, "lamp": 30, "chair": 30, "rug": 5}\n\nbest = None\nbest_units = 0\nfor product, units in sales.items():\n    if best is None or units > best_units or (units == best_units and product < best):\n        best = product\n        best_units = units\nif best is not None:\n    print(f"Best seller: {best} ({best_units} units)")',
      alternatives: ['sales = {"desk": 12, "lamp": 30, "chair": 30, "rug": 5}\nbest = None\nbest_units = 0\nfor product in sorted(sales):\n    if best is None or sales[product] > best_units:\n        best = product\n        best_units = sales[product]\nprint(f"Best seller: {best} ({best_units} units)")\n'],
      wrong: [
        { code: 'sales = {"desk": 12, "lamp": 30, "chair": 30, "rug": 5}\nbest = None\nbest_units = 0\nfor product, units in sales.items():\n    if units > best_units:\n        best = product\n        best_units = units\nprint(f"Best seller: {best} ({best_units} units)")\n', fails: ["best", "output", "v-tie-order"], why: "first in dictionary order wins ties" },
        { code: 'sales = {"desk": 12, "lamp": 30, "chair": 30, "rug": 5}\nbest = None\nbest_units = 0\nfor product, units in sales.items():\n    if units >= best_units:\n        best = product\n        best_units = units\nprint(f"Best seller: {best} ({best_units} units)")\n', fails: ["v-hidden-tie"], why: "last in dictionary order wins ties" },
      ],
    },
  ],

  quiz: [
    {
      id: "get",
      prompt: "What does this program print?",
      code: 'stock = {"desk": 5}\nprint(stock.get("lamp", 0) + stock.get("desk", 0))\nprint(len(stock))',
      options: [
        { text: "`5`, then `1`", correct: true, why: "The missing `lamp` counts as 0 and `desk` is 5. `get` never adds keys, so there's still one." },
        { text: "`5`, then `2`", why: "`get` with a default reads; it doesn't store the default." },
        { text: "A `KeyError`", why: "`get` returns the default instead of raising for a missing key." },
        { text: "`None`, then `1`", why: "The default `0` is used for `lamp`, so the sum is a number." },
      ],
    },
    {
      id: "items",
      prompt: "Which loop prints each product with its units?",
      options: [
        { text: "`for product, units in sales.items(): print(product, units)`", correct: true, why: "`items()` gives `(key, value)` pairs, unpacked into two names." },
        { text: "`for product, units in sales: print(product, units)`", why: "Looping over the dictionary gives only keys; unpacking a key string into two names fails or splits it." },
        { text: "`for units in sales.values(): print(product, units)`", why: "`values()` doesn't give the keys, so `product` isn't defined here." },
        { text: "`for product in sales.keys(): print(product, units)`", why: "This loop only has keys; you'd need `sales[product]` for the units." },
      ],
    },
  ],

  outcomes: [
    "Read keys that may be missing with `get()` and a default.",
    "Loop over keys, values and `(key, value)` pairs, and in sorted order.",
    "Count and total with `counts[k] = counts.get(k, 0) + 1`.",
    "Find the largest value with a deterministic tie-break.",
  ],
};
