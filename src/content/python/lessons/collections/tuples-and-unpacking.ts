import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;

export const tuplesAndUnpacking: PyLesson = {
  slug: "tuples-and-unpacking",
  ref: "python:tuples-and-unpacking",
  module: "collections",
  number: 3,
  title: "Tuples and unpacking",
  level: "beginner",
  summary:
    "Use tuples for small, fixed groups of values, like a record or a pair of coordinates, and unpack them into separate variables in one step, including the one-line swap and collecting “the rest” with `*`.",

  sections: [
    {
      label: "tuples are fixed sequences",
      blocks: [
        {
          kind: "p",
          text: "A **tuple** is written with commas, usually inside round brackets: `(\"SKU-104\", \"Desk lamp\", 24.5)`. Like a list, it's ordered and you can index, slice, loop over it and use `len()` and `in`. Unlike a list, it's **immutable**: you can't assign to a position, append or remove.",
        },
        {
          kind: "p",
          text: "Use a list for a collection of similar things that grows and shrinks (orders, names). Use a tuple for a fixed group of values that belong together, where each position means something (a record's fields, an `(x, y)` point). Because they can't change, tuples can also be dictionary keys and set members; lists can't.",
        },
        {
          kind: "p",
          text: "The commas make the tuple, not the brackets: `point = 3, 4` is a tuple. A tuple with one item needs a trailing comma: `(\"only\",)`; `(\"only\")` is just a string in brackets.",
        },
      ],
    },
    {
      label: "unpacking",
      blocks: [
        {
          kind: "p",
          text: "**Unpacking** assigns each value of a sequence to its own name in one statement. The number of names must match the number of values, or it's a `ValueError`.",
        },
        { kind: "code", code: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\nsku, name, price, quantity = record' },
        {
          kind: "p",
          text: "Python builds the right-hand tuple first, then unpacks it, which gives a one-line swap: `a, b = b, a`. A starred name collects whatever is left over into a list: `first, *rest = items`, or `start, *middle, end = stops`. The starred list may be empty.",
        },
      ],
    },
  ],

  example: {
    caption: "A record unpacked into named fields. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\nsku, name, price, quantity = record\nprint(f"{name} ({sku}): {quantity} x {price} = {price * quantity}")\n\nstops = ["Leeds", "York", "Hull", "Selby"]\nstart, *via, end = stops\nprint("From", start, "to", end, "via", via)',
  },

  walkthrough: [
    {
      title: "Tuples index like lists",
      text: "Reading works as for any sequence. A tuple with one item needs a trailing comma.",
      code: 'point = (3, 4)\nprint(point[0], point[-1], len(point), 4 in point)\nsingle = ("only",)\nnot_a_tuple = ("only")\nprint(type(single), type(not_a_tuple))',
    },
    {
      title: "Unpacking into names",
      text: "Each value goes to the name in the same position.",
      code: 'x, y = (3, 4)\nprint(x, y)\nname, age, city = ["Ada", 36, "London"]\nprint(name, city)',
    },
    {
      title: "The one-line swap",
      text: "The right side, `(b, a)`, is built before anything is assigned.",
      code: "a = 1\nb = 2\na, b = b, a\nprint(a, b)",
    },
    {
      title: "Collecting the rest with *",
      text: "The starred name gets a list of everything not taken by the other names, possibly empty.",
      code: 'first, *rest = [10, 20, 30]\nprint(first, rest)\nstart, *via, end = ["Leeds", "York"]\nprint(start, via, end)',
    },
  ],

  mistakes: [
    {
      title: "Trying to change a tuple",
      text: "Tuples are immutable, so assigning to a position is a `TypeError`.",
      code: "point = (3, 4)\npoint[0] = 5",
      raises: "TypeError",
      fix: "Make a new tuple: `point = (5, point[1])`, or use a list if the values must change.",
    },
    {
      title: "The wrong number of names",
      text: "The record has four values but only three names: `ValueError: too many values to unpack`.",
      code: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\nsku, name, price = record',
      raises: "ValueError",
      fix: "Use one name per value, or collect extras with a starred name: `sku, name, *details = record`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Unpack an order record",
      prompt:
        "Each order arrives as a tuple: `(sku, name, unit_price, quantity)`. Unpack `record` into the variables `sku`, `name`, `unit_price` and `quantity` in **one** statement, calculate `total`, and print the line shown.",
      expectedOutput: "Desk lamp (SKU-104): 3 x 24.5 = 73.5\n",
      looksFor: [
        "`sku`, `name`, `unit_price` and `quantity` hold the record's four fields.",
        "`total` is `unit_price * quantity`, and the line is printed as shown, for any record.",
      ],
      starter: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\n\n# Unpack record, calculate total, print the line.\n',
      task: {
        checks: [
          { kind: "variable", id: "sku", name: "sku", expected: s("SKU-104") },
          { kind: "variable", id: "name", name: "name", expected: s("Desk lamp") },
          { kind: "variable", id: "total", name: "total", expected: py.float(73.5) },
          { kind: "output", id: "output", label: "Prints the order line", expected: "Desk lamp (SKU-104): 3 x 24.5 = 73.5\n" },
          { kind: "variant", id: "v-other", set: { record: py.tuple(s("SKU-7"), s("Pen"), py.float(1.25), py.int(4)) }, output: "Pen (SKU-7): 4 x 1.25 = 5.0\n" },
        ],
      },
      hints: [
        "Four values, four names: sku, name, unit_price, quantity = record.",
        "total = unit_price * quantity.",
        'print(f"{name} ({sku}): {quantity} x {unit_price} = {total}").',
      ],
      answer: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\n\nsku, name, unit_price, quantity = record\ntotal = unit_price * quantity\nprint(f"{name} ({sku}): {quantity} x {unit_price} = {total}")',
      wrong: [
        { code: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\nname, sku, unit_price, quantity = record\ntotal = unit_price * quantity\nprint(f"{name} ({sku}): {quantity} x {unit_price} = {total}")\n', fails: ["sku", "name", "output", "v-other"], why: "names in the wrong order" },
        { code: 'record = ("SKU-104", "Desk lamp", 24.5, 3)\nsku, name, unit_price = record\n', fails: "program", why: "too few names" },
      ],
    },
    {
      id: "challenge-2",
      title: "Describe a route",
      prompt:
        "A delivery route is a list of `stops`: the first is the depot, the last is the final drop, and anything between is a stop on the way. Unpack it into `start`, `via` (a list of the stops in between) and `end` with one starred assignment, then print the summary as shown. Routes can have no stops in between.",
      expectedOutput: "From Leeds to Selby with 2 stops on the way\n",
      looksFor: [
        "`start` is the first stop, `end` the last, and `via` a list of everything in between (possibly empty).",
        "The summary line uses the number of stops in `via`.",
      ],
      starter: 'stops = ["Leeds", "York", "Hull", "Selby"]\n\n# Unpack stops into start, via and end, then print the summary.\n',
      task: {
        checks: [
          { kind: "variable", id: "start", name: "start", expected: s("Leeds") },
          { kind: "variable", id: "via", name: "via", expected: py.list(s("York"), s("Hull")) },
          { kind: "variable", id: "end", name: "end", expected: s("Selby") },
          { kind: "output", id: "output", label: "Prints the summary", expected: "From Leeds to Selby with 2 stops on the way\n" },
          { kind: "variant", id: "v-direct", set: { stops: py.list(s("Hull"), s("York")) }, output: "From Hull to York with 0 stops on the way\n", vars: { via: py.list() } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { stops: py.list(s("A"), s("B"), s("C"), s("D"), s("E")) }, vars: { start: s("A"), via: py.list(s("B"), s("C"), s("D")), end: s("E") } },
        ],
      },
      hints: [
        "A starred name collects the leftovers: start, *via, end = stops.",
        "via is always a list, so len(via) counts the stops in between.",
        'print(f"From {start} to {end} with {len(via)} stops on the way").',
      ],
      answer: 'stops = ["Leeds", "York", "Hull", "Selby"]\n\nstart, *via, end = stops\nprint(f"From {start} to {end} with {len(via)} stops on the way")',
      alternatives: ['stops = ["Leeds", "York", "Hull", "Selby"]\nstart = stops[0]\nend = stops[-1]\nvia = stops[1:-1]\nprint(f"From {start} to {end} with {len(via)} stops on the way")\n'],
      wrong: [
        { code: 'stops = ["Leeds", "York", "Hull", "Selby"]\nstart, via, end = stops[0], stops[1], stops[-1]\nprint(f"From {start} to {end} with {len(via)} stops on the way")\n', fails: ["via", "output", "v-direct", "v-hidden"], why: "via is one stop, not a list" },
      ],
    },
  ],

  quiz: [
    {
      id: "swap",
      prompt: "What does this program print?",
      code: "a, b, c = 1, 2, 3\na, b, c = c, a, b\nprint(a, b, c)",
      options: [
        { text: "`3 1 2`", correct: true, why: "The right side, `(3, 1, 2)`, is built from the old values first, then unpacked into `a`, `b`, `c`." },
        { text: "`3 3 3`", why: "Nothing is assigned until the whole right side has been worked out from the original values." },
        { text: "`1 2 3`", why: "The assignment does change all three: each gets a value from a different position." },
        { text: "`3 3 1`", why: "Unpacking assigns all three names at once, from the tuple built beforehand." },
      ],
    },
    {
      id: "which",
      prompt: "Which is the best fit for a tuple rather than a list?",
      options: [
        { text: "A GPS position: `(latitude, longitude)`", correct: true, why: "A fixed pair where each position has a meaning, and which shouldn't change by accident." },
        { text: "Today's orders, added as they arrive", why: "A collection that grows needs `append`, so it should be a list." },
        { text: "A to-do list that items are ticked off", why: "Removing items means changing the collection: use a list." },
        { text: "Scores to be sorted in place", why: "Tuples can't be sorted in place; `sort()` is a list method." },
      ],
    },
  ],

  outcomes: [
    "Create tuples (including one-item tuples) and read from them like lists.",
    "Choose between a tuple (a fixed record) and a list (a changing collection).",
    "Unpack sequences into names, and swap two variables in one line.",
    "Collect “the rest” of a sequence with a starred name.",
  ],
};
