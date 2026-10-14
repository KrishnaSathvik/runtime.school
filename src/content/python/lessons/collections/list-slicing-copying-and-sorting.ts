import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const i = py.int;
const f = py.float;

export const listSlicingCopyingAndSorting: PyLesson = {
  slug: "list-slicing-copying-and-sorting",
  ref: "python:list-slicing-copying-and-sorting",
  module: "collections",
  number: 2,
  title: "List slicing, copying and sorting",
  level: "beginner",
  summary:
    "Take parts of a list with slices, understand when two names share one list (and how to make a real copy), and sort lists either in place or into a new list, with `min`, `max` and `sum` for quick summaries.",

  sections: [
    {
      label: "slices make new lists",
      blocks: [
        {
          kind: "p",
          text: "Slicing works on lists exactly as on strings: `scores[:3]` is the first three items, `scores[-2:]` the last two, `scores[::-1]` all of them reversed. A slice is a **new** list; changing it doesn't change the original.",
        },
        {
          kind: "p",
          text: "`sum(items)`, `min(items)` and `max(items)` summarise a list of numbers. `min` and `max` raise `ValueError` on an empty list; `sum([])` is `0`.",
        },
      ],
    },
    {
      label: "two names, one list",
      blocks: [
        {
          kind: "p",
          text: "`backup = prices` does **not** copy the list. It makes `backup` a second name for the **same** list, so a change through either name shows up in both. This is called **aliasing**, and it's one of the most common surprises in Python.",
        },
        { kind: "code", code: "prices = [10, 20]\nbackup = prices          # same list, two names\ncopy = prices.copy()     # a new list with the same items\nprices[0] = 99\nprint(backup)   # [99, 20]\nprint(copy)     # [10, 20]" },
        {
          kind: "p",
          text: "Make a real copy with `items.copy()`, `list(items)` or `items[:]`. These are **shallow** copies: a new outer list, but the items themselves are shared. That only matters when the items are lists or dicts themselves (Nested Records covers it).",
        },
      ],
    },
    {
      label: "sort() versus sorted()",
      blocks: [
        {
          kind: "p",
          text: "`items.sort()` sorts the list **in place** and returns `None`. `sorted(items)` leaves the original alone and returns a **new**, sorted list. Use `sorted` when you still need the original order.",
        },
        {
          kind: "p",
          text: "Both take `reverse=True` for descending order, and `key=` to sort by something derived from each item: `sorted(names, key=len)` sorts by length, `sorted(names, key=str.lower)` alphabetically regardless of case. Sorting is **stable**: items that compare equal keep their original order.",
        },
      ],
    },
  ],

  example: {
    caption: "Ranking scores without losing the original order. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'scores = [72, 95, 88, 61, 95, 79]\n\nranked = sorted(scores, reverse=True)\nprint("Top three:", ranked[:3])\nprint("Original:", scores)\nprint("Lowest:", min(scores), "| Highest:", max(scores), "| Average:", round(sum(scores) / len(scores), 1))\n\nnames = ["bea", "Al", "Cy"]\nprint(sorted(names), sorted(names, key=str.lower))',
  },

  walkthrough: [
    {
      title: "Slices are new lists",
      text: "Changing `first_two` doesn't touch `scores`.",
      code: "scores = [72, 95, 88, 61]\nfirst_two = scores[:2]\nfirst_two[0] = 0\nprint(first_two, scores, scores[::-1])",
    },
    {
      title: "Assignment shares the list",
      text: "`backup` and `prices` are two names for one list, so the change shows through both. `copy` is a separate list.",
      code: "prices = [10, 20]\nbackup = prices\ncopy = prices.copy()\nprices[0] = 99\nprint(prices, backup, copy)\nprint(backup is prices, copy is prices)",
    },
    {
      title: "sort() changes the list; sorted() returns a new one",
      text: "`sorted` leaves `a` as it was. `b.sort()` reorders `b` itself and returns `None`.",
      code: "a = [3, 1, 2]\nb = [3, 1, 2]\nnew = sorted(a)\nresult = b.sort()\nprint(a, new, b, result)",
    },
    {
      title: "Sorting by a key",
      text: "By default capitals sort first. `key=str.lower` compares lowercase versions; `key=len` compares lengths, and equal lengths keep their order.",
      code: 'names = ["bea", "Al", "cy", "Dee"]\nprint(sorted(names))\nprint(sorted(names, key=str.lower))\nprint(sorted(names, key=len))',
    },
  ],

  mistakes: [
    {
      title: "Thinking = makes a copy",
      text: "The discount is applied to `prices`, but `original` is the same list, so the original prices are lost too.",
      code: "prices = [10.0, 20.0]\noriginal = prices\nprices[0] = 9.0\nprices[1] = 18.0\nprint(original)",
      fix: "Copy first: `original = prices.copy()`.",
    },
    {
      title: "Using the result of sort()",
      text: "`sort()` returns `None`, so `ranked` is `None` and slicing it is a `TypeError`.",
      code: "scores = [72, 95, 88]\nranked = scores.sort(reverse=True)\nprint(ranked[:2])",
      raises: "TypeError",
      fix: "Use `ranked = sorted(scores, reverse=True)`, or call `scores.sort(...)` on its own line.",
    },
    {
      title: "max() of an empty list",
      text: "There's no largest value of nothing, so `max([])` is a `ValueError`.",
      code: "scores = []\nprint(max(scores))",
      raises: "ValueError",
      fix: "Check the list first (`if scores:`), or give a default: `max(scores, default=None)`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Top three without reordering",
      prompt:
        "Store the three highest scores, highest first, in `top_three`, **without changing the order of `scores`** (the original order is the order people played in). If there are fewer than three scores, `top_three` holds as many as there are. Print both lists as shown.",
      expectedOutput: "Top three: [95, 95, 88]\nIn playing order: [72, 95, 88, 61, 95, 79]\n",
      looksFor: [
        "`top_three` holds the three highest scores, in descending order, or fewer if there aren't three.",
        "`scores` is unchanged.",
      ],
      starter: "scores = [72, 95, 88, 61, 95, 79]\n\n# Store top_three without changing scores, then print both.\n",
      task: {
        checks: [
          { kind: "variable", id: "top", name: "top_three", expected: py.list(i(95), i(95), i(88)) },
          { kind: "variable", id: "scores", name: "scores", expected: py.list(i(72), i(95), i(88), i(61), i(95), i(79)), tip: "scores.sort() reorders scores itself. sorted(scores, …) leaves it alone." },
          { kind: "output", id: "output", label: "Prints both lists", expected: "Top three: [95, 95, 88]\nIn playing order: [72, 95, 88, 61, 95, 79]\n" },
          { kind: "variant", id: "v-short", set: { scores: py.list(i(40), i(60)) }, vars: { top_three: py.list(i(60), i(40)), scores: py.list(i(40), i(60)) } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { scores: py.list(i(1), i(2), i(3), i(4)) }, vars: { top_three: py.list(i(4), i(3), i(2)) } },
        ],
      },
      hints: [
        "sorted(scores, reverse=True) gives a new list, highest first.",
        "A slice of [:3] takes at most three items, so it also works for shorter lists.",
        'top_three = sorted(scores, reverse=True)[:3], then print("Top three:", top_three) and print("In playing order:", scores).',
      ],
      answer: 'scores = [72, 95, 88, 61, 95, 79]\n\ntop_three = sorted(scores, reverse=True)[:3]\nprint("Top three:", top_three)\nprint("In playing order:", scores)',
      alternatives: ['scores = [72, 95, 88, 61, 95, 79]\nranked = scores.copy()\nranked.sort()\ntop_three = ranked[::-1][:3]\nprint("Top three:", top_three)\nprint("In playing order:", scores)\n'],
      wrong: [
        { code: 'scores = [72, 95, 88, 61, 95, 79]\nscores.sort(reverse=True)\ntop_three = scores[:3]\nprint("Top three:", top_three)\nprint("In playing order:", scores)\n', fails: ["scores", "output", "v-short"], why: "sorted the original" },
        { code: 'scores = [72, 95, 88, 61, 95, 79]\ntop_three = sorted(scores)[:3]\nprint("Top three:", top_three)\nprint("In playing order:", scores)\n', fails: ["top", "output", "v-short", "v-hidden"], why: "lowest three" },
        { code: 'scores = [72, 95, 88, 61, 95, 79]\ntop_three = sorted(scores)[-3:]\nprint("Top three:", top_three)\nprint("In playing order:", scores)\n', fails: ["top", "output", "v-short", "v-hidden"], why: "highest three, but in ascending order" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix an accidental alias",
      prompt:
        "This program applies a 10% discount to `prices`, keeping a `backup` of the original prices first. But afterwards the backup shows the discounted prices too. Fix it so `backup` keeps the original prices and `prices` holds the discounted ones (rounded to 2 places, as the code already does).",
      expectedOutput: "Discounted: [9.0, 22.95, 4.49]\nBackup: [10.0, 25.5, 4.99]\n",
      looksFor: [
        "`backup` holds the prices as they were before the discount.",
        "`prices` holds the discounted prices.",
      ],
      starter: 'prices = [10.0, 25.5, 4.99]\nbackup = prices\n\nfor i in range(len(prices)):\n    prices[i] = round(prices[i] * 0.9, 2)\n\nprint("Discounted:", prices)\nprint("Backup:", backup)\n',
      task: {
        checks: [
          { kind: "variable", id: "backup", name: "backup", expected: py.list(f(10), f(25.5), f(4.99)), tip: "backup = prices makes a second name for the same list. Make a copy instead." },
          { kind: "variable", id: "prices", name: "prices", expected: py.list(f(9), f(22.95), f(4.49)) },
          { kind: "output", id: "output", label: "Prints both lists", expected: "Discounted: [9.0, 22.95, 4.49]\nBackup: [10.0, 25.5, 4.99]\n" },
          { kind: "variant", id: "v-other", set: { prices: py.list(f(100)) }, vars: { backup: py.list(f(100)), prices: py.list(f(90)) } },
        ],
      },
      hints: [
        "Run it and compare the two lines: they're identical, because both names refer to one list.",
        "A copy is a new list with the same items: prices.copy(), list(prices) or prices[:].",
        "Change line 2 to backup = prices.copy().",
      ],
      answer: 'prices = [10.0, 25.5, 4.99]\nbackup = prices.copy()\n\nfor i in range(len(prices)):\n    prices[i] = round(prices[i] * 0.9, 2)\n\nprint("Discounted:", prices)\nprint("Backup:", backup)',
      alternatives: [
        'prices = [10.0, 25.5, 4.99]\nbackup = list(prices)\nfor i in range(len(prices)):\n    prices[i] = round(prices[i] * 0.9, 2)\nprint("Discounted:", prices)\nprint("Backup:", backup)\n',
        'prices = [10.0, 25.5, 4.99]\nbackup = prices[:]\nfor i in range(len(prices)):\n    prices[i] = round(prices[i] * 0.9, 2)\nprint("Discounted:", prices)\nprint("Backup:", backup)\n',
      ],
      wrong: [
        { code: 'prices = [10.0, 25.5, 4.99]\nbackup = prices\nfor i in range(len(prices)):\n    prices[i] = round(prices[i] * 0.9, 2)\nbackup = [10.0, 25.5, 4.99]\nprint("Discounted:", prices)\nprint("Backup:", backup)\n', fails: ["v-other"], why: "typed the backup" },
      ],
    },
  ],

  quiz: [
    {
      id: "alias",
      prompt: "What does this program print?",
      code: "a = [1, 2]\nb = a\nc = a[:]\na.append(3)\nprint(len(b), len(c))",
      options: [
        { text: "`3 2`", correct: true, why: "`b` is the same list as `a`, so it sees the new item. `c` is a copy made before the append." },
        { text: "`2 2`", why: "`b = a` doesn't copy: `b` and `a` are one list, so `b` has 3 items." },
        { text: "`3 3`", why: "`a[:]` makes a new list, so appending to `a` doesn't change `c`." },
        { text: "`2 3`", why: "It's the other way round: `b` shares `a`'s list, `c` doesn't." },
      ],
    },
    {
      id: "sort",
      prompt: "`words = [\"pear\", \"Fig\", \"apple\"]`. What is `sorted(words)`?",
      options: [
        { text: "`['Fig', 'apple', 'pear']`", correct: true, why: "Capitals come before lowercase letters, so `Fig` sorts first. Use `key=str.lower` to ignore case." },
        { text: "`['apple', 'Fig', 'pear']`", why: "That's what `sorted(words, key=str.lower)` gives. Plain sorting compares capitals as smaller." },
        { text: "`['pear', 'Fig', 'apple']`", why: "`sorted` returns a new list in order; it doesn't keep the original order." },
        { text: "`None`", why: "`sorted` returns a new list. It's `words.sort()` that returns `None`." },
      ],
    },
  ],

  outcomes: [
    "Take parts of a list with slices, and summarise numbers with `sum`, `min` and `max`.",
    "Explain aliasing, and copy a list with `copy()`, `list()` or `[:]`.",
    "Choose between `sort()` (in place) and `sorted()` (a new list).",
    "Sort in reverse, or by a key such as `len` or `str.lower`.",
  ],
};
