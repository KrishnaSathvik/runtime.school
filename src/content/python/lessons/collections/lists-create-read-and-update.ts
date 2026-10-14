import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;

export const listsCreateReadAndUpdate: PyLesson = {
  slug: "lists-create-read-and-update",
  ref: "python:lists-create-read-and-update",
  module: "collections",
  number: 1,
  title: "Lists: create, read and update",
  level: "beginner",
  summary:
    "Store an ordered sequence of values in a list, read items by position, and change the list in place: replace, add, insert and remove items.",

  sections: [
    {
      label: "lists hold items in order",
      blocks: [
        {
          kind: "p",
          text: "A **list** holds any number of values, in order, between square brackets: `[\"desk\", \"lamp\", \"chair\"]`. Items can be of any type, and the empty list is `[]`. You've already looped over lists and indexed the lists `split()` gives you; positions work exactly as they do for strings: `items[0]` is the first, `items[-1]` the last, and `len(items)` is how many there are.",
        },
        {
          kind: "p",
          text: "The big difference from strings: **lists can be changed in place**. They are *mutable*. Assigning to a position replaces that item: `items[1] = \"shelf\"`.",
        },
      ],
    },
    {
      label: "adding and removing",
      blocks: [
        {
          kind: "code",
          code: 'items = ["desk", "lamp"]\nitems.append("chair")      # add to the end\nitems.insert(0, "shelf")   # add at a position\nitems.remove("lamp")       # remove the first matching value\nlast = items.pop()         # remove and return the last item\nfirst = items.pop(0)       # remove and return the item at 0',
        },
        {
          kind: "p",
          text: "These methods change the list itself and (except `pop`) return `None`, so don't write `items = items.append(…)`. `remove(x)` raises `ValueError` if `x` isn't in the list; `pop()` on an empty list and reading past the end both raise `IndexError`. `del items[2]` removes by position without returning the item.",
        },
      ],
    },
    {
      label: "searching",
      blocks: [
        {
          kind: "p",
          text: "`x in items` asks whether `x` is in the list. `items.index(x)` gives the position of its first occurrence (a `ValueError` if absent), and `items.count(x)` how many times it appears. Check with `in` before calling `remove()` or `index()` on a value that might be missing.",
        },
      ],
    },
  ],

  example: {
    caption: "Changing a stock list in place. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'stock = ["desk", "lamp", "chair"]\nprint(stock, len(stock))\n\nstock.append("shelf")\nstock.remove("lamp")\nstock[0] = "standing desk"\nprint(stock)\n\nprint("First:", stock[0], "| Last:", stock[-1])\nprint("Has a chair:", "chair" in stock)',
  },

  walkthrough: [
    {
      title: "Read by position, replace by position",
      text: "Indexing works as for strings, but assigning to a position changes the list.",
      code: 'items = ["desk", "lamp", "chair"]\nprint(items[0], items[-1], len(items))\nitems[1] = "shelf"\nprint(items)',
    },
    {
      title: "append and insert",
      text: "`append` adds to the end; `insert` puts an item before the given position.",
      code: 'queue = ["Ben", "Cai"]\nqueue.append("Dee")\nqueue.insert(0, "Ana")\nprint(queue)',
    },
    {
      title: "remove, pop and del",
      text: "`remove` deletes by value, `pop` removes and gives back an item, `del` deletes by position.",
      code: 'queue = ["Ana", "Ben", "Cai", "Dee"]\nqueue.remove("Cai")\nserved = queue.pop(0)\ndel queue[-1]\nprint(served, queue)',
    },
    {
      title: "Searching a list",
      text: "`in` answers yes or no; `index` and `count` give a position and a number.",
      code: 'colours = ["red", "blue", "red", "green"]\nprint("blue" in colours, colours.index("red"), colours.count("red"))',
    },
  ],

  mistakes: [
    {
      title: "Assigning the result of append",
      text: "`append` changes the list and returns `None`, so this replaces the list with `None`.",
      code: 'items = ["desk"]\nitems = items.append("lamp")\nprint(items)',
      fix: "Call it on its own line: `items.append(\"lamp\")`.",
    },
    {
      title: "Removing a value that isn't there",
      text: "`remove` raises `ValueError` when the value isn't in the list.",
      code: 'items = ["desk", "lamp"]\nitems.remove("chair")',
      raises: "ValueError",
      fix: "Check first: `if \"chair\" in items: items.remove(\"chair\")`.",
    },
    {
      title: "Reading past the end",
      text: "There are three items, so the last position is 2: `items[3]` is an `IndexError`.",
      code: 'items = ["desk", "lamp", "chair"]\nprint(items[len(items)])',
      raises: "IndexError",
      fix: "The last item is `items[-1]` (or `items[len(items) - 1]`).",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Process stock changes",
      prompt:
        "Update the `stock` list in place: add the `arrived` item at the end, and remove the `sold_out` item **if it's in the list** (it may not be). Then store the first and last items in `first` and `last`, and print the list and its length as shown.",
      expectedOutput: "['desk', 'chair', 'shelf']\n3 items\n",
      looksFor: [
        "`stock` ends with `arrived` added at the end and `sold_out` removed when present.",
        "A `sold_out` item that isn't in the list doesn't cause an error.",
        "`first` and `last` are the first and last items afterwards, and the output is as shown.",
      ],
      starter: 'stock = ["desk", "lamp", "chair"]\narrived = "shelf"\nsold_out = "lamp"\n\n# Update stock, then set first and last and print.\n',
      task: {
        checks: [
          { kind: "variable", id: "stock", name: "stock", expected: py.list(s("desk"), s("chair"), s("shelf")) },
          { kind: "variable", id: "first", name: "first", expected: s("desk") },
          { kind: "variable", id: "last", name: "last", expected: s("shelf") },
          { kind: "output", id: "output", label: "Prints the list and its length", expected: "['desk', 'chair', 'shelf']\n3 items\n" },
          { kind: "variant", id: "v-missing", set: { sold_out: s("sofa") }, vars: { stock: py.list(s("desk"), s("lamp"), s("chair"), s("shelf")) }, tip: "Only remove the item if it's in the list: if sold_out in stock." },
          { kind: "variant", id: "v-other", set: { stock: py.list(s("pen")), arrived: s("ink"), sold_out: s("pen") }, output: "['ink']\n1 items\n", vars: { first: s("ink"), last: s("ink") } },
        ],
      },
      hints: [
        "stock.append(arrived) adds to the end.",
        "if sold_out in stock: stock.remove(sold_out).",
        'first = stock[0], last = stock[-1]. Then print(stock) and print(len(stock), "items").',
      ],
      answer: 'stock = ["desk", "lamp", "chair"]\narrived = "shelf"\nsold_out = "lamp"\n\nstock.append(arrived)\nif sold_out in stock:\n    stock.remove(sold_out)\nfirst = stock[0]\nlast = stock[-1]\nprint(stock)\nprint(len(stock), "items")',
      wrong: [
        { code: 'stock = ["desk", "lamp", "chair"]\narrived = "shelf"\nsold_out = "lamp"\nstock.append(arrived)\nstock.remove(sold_out)\nfirst = stock[0]\nlast = stock[-1]\nprint(stock)\nprint(len(stock), "items")\n', fails: ["v-missing"], why: "remove without checking" },
        { code: 'stock = ["desk", "lamp", "chair"]\narrived = "shelf"\nsold_out = "lamp"\nstock.insert(0, arrived)\nif sold_out in stock:\n    stock.remove(sold_out)\nfirst = stock[0]\nlast = stock[-1]\nprint(stock)\nprint(len(stock), "items")\n', fails: ["stock", "first", "last", "output", "v-missing"], why: "added at the front" },
        { code: 'stock = ["desk", "lamp", "chair"]\narrived = "shelf"\nsold_out = "lamp"\nstock = stock.append(arrived)\nfirst = stock[0]\nprint(stock)\n', fails: "program", why: "assigned append's None" },
      ],
    },
    {
      id: "challenge-2",
      title: "Run a queue",
      prompt:
        "A counter serves people in the order they joined `queue`. Serve the person at the front: remove them from the list and store their name in `served`. Then a `vip` arrives and goes straight to the front. Print who was served and the queue afterwards.",
      expectedOutput: "Served: Ana\nQueue: ['Zoe', 'Ben', 'Cai']\n",
      looksFor: [
        "`served` is the person who was first in the queue, and they're no longer in it.",
        "`vip` is now at position 0, and everyone else keeps their order.",
      ],
      starter: 'queue = ["Ana", "Ben", "Cai"]\nvip = "Zoe"\n\n# Serve the first person, then put the VIP at the front.\n',
      task: {
        checks: [
          { kind: "variable", id: "served", name: "served", expected: s("Ana"), tip: "queue.pop(0) removes the first item and gives it back." },
          { kind: "variable", id: "queue", name: "queue", expected: py.list(s("Zoe"), s("Ben"), s("Cai")), tip: "queue.insert(0, vip) puts the VIP before everyone else." },
          { kind: "output", id: "output", label: "Prints both lines", expected: "Served: Ana\nQueue: ['Zoe', 'Ben', 'Cai']\n" },
          { kind: "variant", id: "v-other", set: { queue: py.list(s("Kim")), vip: s("Lee") }, output: "Served: Kim\nQueue: ['Lee']\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { queue: py.list(s("A"), s("B"), s("C"), s("D")) }, vars: { served: s("A"), queue: py.list(s("Zoe"), s("B"), s("C"), s("D")) } },
        ],
      },
      hints: [
        "pop(0) removes and returns the item at position 0: served = queue.pop(0).",
        "insert(0, vip) adds an item at the front.",
        'print("Served:", served) and print("Queue:", queue).',
      ],
      answer: 'queue = ["Ana", "Ben", "Cai"]\nvip = "Zoe"\n\nserved = queue.pop(0)\nqueue.insert(0, vip)\nprint("Served:", served)\nprint("Queue:", queue)',
      alternatives: ['queue = ["Ana", "Ben", "Cai"]\nvip = "Zoe"\nserved = queue[0]\ndel queue[0]\nqueue = [vip] + queue\nprint("Served:", served)\nprint("Queue:", queue)\n'],
      wrong: [
        { code: 'queue = ["Ana", "Ben", "Cai"]\nvip = "Zoe"\nserved = queue.pop()\nqueue.insert(0, vip)\nprint("Served:", served)\nprint("Queue:", queue)\n', fails: ["served", "queue", "output", "v-hidden"], why: "pop() takes the last person" },
        { code: 'queue = ["Ana", "Ben", "Cai"]\nvip = "Zoe"\nserved = queue[0]\nqueue.insert(0, vip)\nprint("Served:", served)\nprint("Queue:", queue)\n', fails: ["queue", "output", "v-other", "v-hidden"], why: "served stays in the queue" },
      ],
    },
  ],

  quiz: [
    {
      id: "mutate",
      prompt: "What does this program print?",
      code: 'items = ["a", "b", "c"]\nitems[1] = "x"\nitems.append("d")\nremoved = items.pop(0)\nprint(removed, items)',
      options: [
        { text: "`a ['x', 'c', 'd']`", correct: true, why: "Position 1 becomes `x`, `d` goes on the end, then `pop(0)` removes and returns `a`." },
        { text: "`d ['a', 'x', 'c']`", why: "`pop(0)` removes position 0, not the last item. `pop()` with no argument takes the last." },
        { text: "`a ['a', 'x', 'c', 'd']`", why: "`pop` removes the item from the list as well as returning it." },
        { text: "A `TypeError`", why: "Lists can be changed in place; only strings and tuples refuse assignment to a position." },
      ],
    },
    {
      id: "none",
      prompt: "After `items = [3, 1]` and `result = items.append(2)`, what is `result`?",
      options: [
        { text: "`None`", correct: true, why: "`append` changes `items` and returns `None`. `items` is now `[3, 1, 2]`." },
        { text: "`[3, 1, 2]`", why: "That's `items` afterwards. The method itself gives back `None`." },
        { text: "`2`", why: "`append` doesn't return the item it added." },
        { text: "`3`", why: "`append` doesn't return the new length either." },
      ],
    },
  ],

  outcomes: [
    "Create lists and read items by position, from either end.",
    "Change a list in place with assignment, `append`, `insert`, `remove`, `pop` and `del`.",
    "Search a list with `in`, `index` and `count`, checking before removing.",
    "Remember that list methods that change the list return `None`.",
  ],
};
