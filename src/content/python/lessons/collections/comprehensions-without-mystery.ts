import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const comprehensionsWithoutMystery: PyLesson = {
  slug: "comprehensions-without-mystery",
  ref: "python:comprehensions-without-mystery",
  module: "collections",
  number: 8,
  title: "Comprehensions without mystery",
  level: "intermediate",
  summary:
    "Read and write list, dictionary and set comprehensions by seeing each one as the loop it replaces: build a new collection by transforming and filtering another one, in a single expression.",

  sections: [
    {
      label: "a comprehension is a loop that builds a list",
      blocks: [
        {
          kind: "p",
          text: "You've written this shape many times: start an empty list, loop, append a transformed item. A **list comprehension** says the same thing in one expression:",
        },
        { kind: "code", code: 'clean = []\nfor e in raw:\n    clean.append(e.strip().lower())\n\nclean = [e.strip().lower() for e in raw]   # the same result' },
        {
          kind: "p",
          text: "Read it in the order the loop would run: “for each `e` in `raw`, take `e.strip().lower()`”. The expression at the front is what gets appended; the `for` part is the loop header. The result is always a **new** list; the original is untouched.",
        },
      ],
    },
    {
      label: "filtering with if",
      blocks: [
        {
          kind: "p",
          text: "An `if` at the end keeps only the items for which the condition is true: `[e.strip() for e in raw if e.strip()]` drops blanks. This `if` filters; it has no `else`. To choose between two values for **every** item, put a conditional expression at the front instead: `[\"high\" if x > 30 else \"ok\" for x in readings]`.",
        },
      ],
    },
    {
      label: "dictionaries and sets",
      blocks: [
        {
          kind: "p",
          text: "The same idea with braces builds a dictionary or a set. `{sku: price for sku, price in pairs}` makes a dictionary from pairs; `{name.lower() for name in names}` makes a set of distinct lowercased names.",
        },
        {
          kind: "p",
          text: "Comprehensions are great for one transformation and one filter. When the logic needs several steps, `try`, or printing, a normal loop is clearer: readable code beats short code.",
        },
      ],
    },
  ],

  example: {
    caption: "Cleaning a list and building a lookup table. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'raw = [" Ada@Example.com", "", "ben@site.org ", "   "]\nemails = [e.strip().lower() for e in raw if e.strip()]\nprint(emails)\n\nproducts = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nprice_of = {sku: price for sku, price in products}\nexpensive = {sku for sku, price in products if price > 3}\nprint(price_of)\nprint(sorted(expensive))',
  },

  walkthrough: [
    {
      title: "The loop and the comprehension side by side",
      text: "Both build the same list of squares.",
      code: "squares = []\nfor n in range(5):\n    squares.append(n * n)\nprint(squares)\nprint([n * n for n in range(5)])",
    },
    {
      title: "Filtering with if",
      text: "Only the items where the condition is true are kept.",
      code: "readings = [21, 35, 18, 40]\nprint([r for r in readings if r > 30])\nprint([r for r in readings if r % 2 == 0])",
    },
    {
      title: "A conditional expression transforms every item",
      text: "At the front, `… if … else …` picks a value for each item; nothing is dropped.",
      code: 'readings = [21, 35, 18, 40]\nprint(["high" if r > 30 else "ok" for r in readings])',
    },
    {
      title: "Dictionary and set comprehensions",
      text: "Braces with `key: value` build a dictionary; braces with one value build a set.",
      code: 'names = ["Ana", "ben", "ANA", "Cai"]\nlengths = {name: len(name) for name in names}\nunique = {name.lower() for name in names}\nprint(lengths)\nprint(sorted(unique))',
    },
  ],

  mistakes: [
    {
      title: "Putting the filter's if in the wrong place",
      text: "An `if` without `else` at the front isn't valid: Python can't read it.",
      code: "readings = [21, 35, 18]\nhigh = [r if r > 30 for r in readings]",
      raises: "SyntaxError",
      fix: "A filter goes at the end: `[r for r in readings if r > 30]`.",
    },
    {
      title: "Expecting the original list to change",
      text: "A comprehension builds a new list. Without assigning it, the result is lost and `names` is unchanged.",
      code: 'names = [" ana ", "ben "]\n[n.strip() for n in names]\nprint(names)',
      fix: "Assign the result: `names = [n.strip() for n in names]`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Clean a list of emails",
      prompt:
        "Using **one list comprehension**, store in `emails` every entry of `raw` stripped and lowercased, leaving out entries that are blank (empty or only spaces). Then print the list and how many there are.",
      expectedOutput: "['ada@example.com', 'ben@site.org']\n2 emails\n",
      looksFor: [
        "`emails` holds each non-blank entry, stripped and lowercased, in the original order.",
        "Blank entries (empty or only whitespace) are left out.",
      ],
      starter: 'raw = [" Ada@Example.com", "", "ben@site.org ", "   "]\n\n# Build emails with a list comprehension.\n',
      task: {
        checks: [
          { kind: "variable", id: "emails", name: "emails", expected: strs("ada@example.com", "ben@site.org"), tip: "Filter with if e.strip() at the end; transform with e.strip().lower() at the front." },
          { kind: "output", id: "output", label: "Prints the list and the count", expected: "['ada@example.com', 'ben@site.org']\n2 emails\n" },
          { kind: "variant", id: "v-other", set: { raw: strs("X@Y.Z", "\t", "Q@R.S ") }, vars: { emails: strs("x@y.z", "q@r.s") } },
          { kind: "variant", id: "v-empty", set: { raw: py.list() }, output: "[]\n0 emails\n" },
        ],
      },
      hints: [
        "The shape is [transform for e in raw if condition].",
        "The condition is e.strip(): blank text is falsy once stripped.",
        'emails = [e.strip().lower() for e in raw if e.strip()], then print(emails) and print(len(emails), "emails").',
      ],
      answer: 'raw = [" Ada@Example.com", "", "ben@site.org ", "   "]\n\nemails = [e.strip().lower() for e in raw if e.strip()]\nprint(emails)\nprint(len(emails), "emails")',
      wrong: [
        { code: 'raw = [" Ada@Example.com", "", "ben@site.org ", "   "]\nemails = [e.strip().lower() for e in raw if e]\nprint(emails)\nprint(len(emails), "emails")\n', fails: ["emails", "output", "v-other"], why: "only drops empty strings, not spaces" },
        { code: 'raw = [" Ada@Example.com", "", "ben@site.org ", "   "]\nemails = [e.lower() for e in raw if e.strip()]\nprint(emails)\nprint(len(emails), "emails")\n', fails: ["emails", "output", "v-other"], why: "not stripped" },
      ],
    },
    {
      id: "challenge-2",
      title: "Build a price index",
      prompt:
        "`products` is a list of `(sku, price)` pairs. With comprehensions, build `price_of`, a dictionary from SKU to price, and `premium`, a **sorted list** of the SKUs whose price is above `threshold`. Print both.",
      expectedOutput: "{'A1': 2.5, 'B2': 4.0, 'C3': 12.0}\nPremium: ['B2', 'C3']\n",
      looksFor: [
        "`price_of` maps every SKU to its price.",
        "`premium` is a sorted list of the SKUs priced strictly above `threshold`.",
      ],
      starter: 'products = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nthreshold = 3\n\n# Build price_of and premium with comprehensions.\n',
      task: {
        checks: [
          { kind: "variable", id: "index", name: "price_of", expected: py.dict([[s("A1"), py.float(2.5)], [s("B2"), py.float(4)], [s("C3"), py.float(12)]]) },
          { kind: "variable", id: "premium", name: "premium", expected: strs("B2", "C3") },
          { kind: "output", id: "output", label: "Prints both", expected: "{'A1': 2.5, 'B2': 4.0, 'C3': 12.0}\nPremium: ['B2', 'C3']\n" },
          { kind: "variant", id: "v-other", set: { products: py.list(py.tuple(s("Z9"), py.float(5)), py.tuple(s("M2"), py.float(9))), threshold: py.int(5) }, vars: { premium: strs("M2") }, tip: "“Above” means strictly greater: a price equal to the threshold isn't premium." },
          { kind: "variant", id: "v-sorted", set: { products: py.list(py.tuple(s("Z9"), py.float(50)), py.tuple(s("A2"), py.float(60))) }, vars: { premium: strs("A2", "Z9") } },
        ],
      },
      hints: [
        "A dictionary comprehension: {sku: price for sku, price in products}.",
        "A comprehension with a filter gives the premium SKUs: [sku for sku, price in products if price > threshold].",
        "Wrap that in sorted(...) to get a sorted list.",
      ],
      answer: 'products = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nthreshold = 3\n\nprice_of = {sku: price for sku, price in products}\npremium = sorted([sku for sku, price in products if price > threshold])\nprint(price_of)\nprint("Premium:", premium)',
      alternatives: ['products = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nthreshold = 3\nprice_of = dict(products)\npremium = sorted([sku for sku in price_of if price_of[sku] > threshold])\nprint(price_of)\nprint("Premium:", premium)\n'],
      wrong: [
        { code: 'products = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nthreshold = 3\nprice_of = {sku: price for sku, price in products}\npremium = [sku for sku, price in products if price >= threshold]\nprint(price_of)\nprint("Premium:", premium)\n', fails: ["v-other", "v-sorted"], why: ">= and not sorted" },
        { code: 'products = [("A1", 2.5), ("B2", 4.0), ("C3", 12.0)]\nthreshold = 3\nprice_of = {sku: price for sku, price in products}\npremium = {sku for sku, price in products if price > threshold}\nprint(price_of)\nprint("Premium:", sorted(premium))\n', fails: ["premium", "v-other", "v-sorted"], why: "a set, not a sorted list" },
      ],
    },
  ],

  quiz: [
    {
      id: "read",
      prompt: "What does this program print?",
      code: "print([n * 10 for n in range(6) if n % 2 == 1])",
      options: [
        { text: "`[10, 30, 50]`", correct: true, why: "The odd numbers in 0–5 are 1, 3 and 5; each is multiplied by 10." },
        { text: "`[0, 20, 40]`", why: "`n % 2 == 1` keeps the odd numbers, not the even ones." },
        { text: "`[0, 10, 20, 30, 40, 50]`", why: "The `if` at the end filters: only some values of `n` are kept." },
        { text: "`[1, 3, 5]`", why: "The expression at the front, `n * 10`, is what goes into the list." },
      ],
    },
    {
      id: "equivalent",
      prompt: "Which loop builds the same list as `[w.upper() for w in words if len(w) > 3]`?",
      options: [
        { text: "`out = []`, then `for w in words: if len(w) > 3: out.append(w.upper())`", correct: true, why: "The `for` becomes the loop, the `if` filters, and the front expression is what's appended." },
        { text: "`out = []`, then `for w in words: out.append(w.upper() if len(w) > 3 else w)`", why: "That keeps every word. The comprehension's trailing `if` drops short words entirely." },
        { text: "`for w in words: if len(w) > 3: w = w.upper()`", why: "Reassigning the loop variable doesn't build or change any list." },
        { text: "`out = [w for w in words].upper()`", why: "Lists don't have an `upper` method; it's applied to each word." },
      ],
    },
  ],

  outcomes: [
    "Read a comprehension as the loop it replaces.",
    "Write list comprehensions that transform and filter.",
    "Tell a filtering `if` (at the end) from a conditional expression (at the front).",
    "Build dictionaries and sets with comprehensions, and know when a plain loop is clearer.",
  ],
};
