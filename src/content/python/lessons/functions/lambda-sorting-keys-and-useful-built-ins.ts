import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const player = (name: string, score: number) => py.tuple(s(name), i(score));
const product = (name: string, price: number, stock: number): PyValue => py.dict([[s("name"), s(name)], [s("price"), f(price)], [s("stock"), i(stock)]]);

export const lambdaSortingKeysAndUsefulBuiltIns: PyLesson = {
  slug: "lambda-sorting-keys-and-useful-built-ins",
  ref: "python:lambda-sorting-keys-and-useful-built-ins",
  module: "functions",
  number: 8,
  title: "Lambda, sorting keys and useful built-ins",
  level: "intermediate",
  summary:
    "Pass a function to another function: sort and pick the largest or smallest by any rule with `key=`, write small throwaway functions with `lambda`, and use `any`, `all`, `sum`, `min` and `max` to answer common questions in one line.",

  sections: [
    {
      label: "functions are values",
      blocks: [
        {
          kind: "p",
          text: "A function is a value like any other: you can store it in a variable or pass it as an argument. `sorted(names, key=len)` passes the `len` function itself (no brackets) to `sorted`, which calls it on each item and sorts by the results.",
        },
      ],
    },
    {
      label: "lambda: a small function in one expression",
      blocks: [
        {
          kind: "p",
          text: "`lambda item: item[1]` is a function with one parameter, `item`, that returns `item[1]`. It's the same as a two-line `def`, written where it's needed. A lambda can only contain one expression, which is exactly what a sort key usually is.",
        },
        { kind: "code", code: 'players = [("Ana", 82), ("Ben", 95), ("Cai", 82)]\nsorted(players, key=lambda p: p[1])           # by score, lowest first\nsorted(players, key=lambda p: (-p[1], p[0]))  # score high→low, then name' },
        {
          kind: "p",
          text: "A key can return a tuple to sort by several things: tuples compare their first items, then the second ones on a tie, and so on. Negating a number (`-p[1]`) flips that part of the order. When the logic gets longer, write a normal `def` and pass its name.",
        },
      ],
    },
    {
      label: "useful built-ins",
      blocks: [
        {
          kind: "p",
          text: "`min(items, key=…)` and `max(items, key=…)` return the item with the smallest or largest key; on a tie, the first such item wins, and `default=` is returned for an empty list instead of raising `ValueError`. `any(checks)` is `True` if at least one is true, `all(checks)` if every one is (and `all([])` is `True`). Give them a comprehension: `all(q > 0 for q in quantities)`.",
        },
        {
          kind: "p",
          text: "Written with round brackets inside a function call, `(q > 0 for q in quantities)` is a **generator expression**: like a list comprehension, but it produces values one at a time without building a list. Iterators and Generators covers them; here they're just the tidy way to feed `sum`, `any`, `all`, `min` and `max`.",
        },
      ],
    },
  ],

  example: {
    caption: "Ranking players and querying products. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'players = [("Ana", 82), ("Ben", 95), ("Cai", 82), ("Dee", 70)]\nranked = sorted(players, key=lambda p: (-p[1], p[0]))\nprint([name for name, score in ranked])\n\nproducts = [\n    {"name": "Desk", "price": 120.0, "stock": 4},\n    {"name": "Lamp", "price": 24.5, "stock": 0},\n    {"name": "Chair", "price": 89.0, "stock": 7},\n]\ncheapest = min(products, key=lambda p: p["price"])\nprint("Cheapest:", cheapest["name"])\nprint("Any out of stock:", any(p["stock"] == 0 for p in products))\nprint("Stock value:", sum(p["price"] * p["stock"] for p in products))',
  },

  walkthrough: [
    {
      title: "key= with a built-in function",
      text: "`sorted` calls `len` on each word and sorts by those lengths. Words of equal length keep their order.",
      code: 'words = ["kiwi", "fig", "banana", "plum"]\nprint(sorted(words, key=len))\nprint(max(words, key=len))',
    },
    {
      title: "A lambda is a short function",
      text: "`by_score` and the `def` version do the same thing.",
      code: 'def score_of(p):\n    return p[1]\n\nby_score = lambda p: p[1]\nplayers = [("Ana", 82), ("Ben", 95)]\nprint(score_of(players[0]), by_score(players[0]))\nprint(sorted(players, key=by_score, reverse=True))',
    },
    {
      title: "Sorting by two things",
      text: "The key is a tuple: highest score first (`-score`), then name alphabetically for ties.",
      code: 'players = [("Cai", 82), ("Ben", 95), ("Ana", 82)]\nfor name, score in sorted(players, key=lambda p: (-p[1], p[0])):\n    print(name, score)',
    },
    {
      title: "any, all, and an empty list",
      text: "`any` needs one true value, `all` needs no false ones, so `all([])` is `True` and `any([])` is `False`.",
      code: "quantities = [3, 0, 5]\nprint(any(q == 0 for q in quantities), all(q > 0 for q in quantities))\nprint(any([]), all([]))\nprint(max([], default=None))",
    },
  ],

  mistakes: [
    {
      title: "Calling the key function instead of passing it",
      text: "`key=len()` calls `len` with no arguments right away: `TypeError`. The key must be the function itself.",
      code: 'words = ["kiwi", "fig"]\nprint(sorted(words, key=len()))',
      raises: "TypeError",
      fix: "Pass the function without brackets: `key=len`.",
    },
    {
      title: "min() of an empty list",
      text: "With no items there's no minimum: `ValueError`.",
      code: "prices = []\nprint(min(prices))",
      raises: "ValueError",
      fix: "Use `min(prices, default=None)`, or check `if prices:` first.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Rank players",
      prompt:
        "Write `rank(players)`, where `players` is a list of `(name, score)` tuples. Return a list of the **names**, highest score first; players with the same score are listed alphabetically. Use `sorted` with a `key`.",
      looksFor: [
        "Names are ordered by score, highest first.",
        "Ties are broken alphabetically by name.",
        "The input list isn't changed, and an empty list gives `[]`.",
      ],
      starter: "def rank(players):\n    # Return names, highest score first; ties alphabetically.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "rank",
            cases: [
              { args: [py.list(player("Ana", 82), player("Ben", 95), player("Cai", 82))], expected: py.list(s("Ben"), s("Ana"), s("Cai")) },
              { args: [py.list(player("Zoe", 50), player("Al", 50))], expected: py.list(s("Al"), s("Zoe")) },
              { args: [py.list()], expected: py.list() },
              { args: [py.list(player("Dee", 10), player("Eve", 99), player("Bo", 99), player("Cy", 10))], expected: py.list(s("Bo"), s("Eve"), s("Cy"), s("Dee")), hidden: true },
            ],
            tip: "key=lambda p: (-p[1], p[0]) sorts by score descending, then name.",
          },
        ],
      },
      hints: [
        "sorted(players, key=…) returns a new sorted list.",
        "A key returning (-score, name) gives highest score first, then alphabetical.",
        "return [name for name, score in sorted(players, key=lambda p: (-p[1], p[0]))].",
      ],
      answer: 'def rank(players):\n    """Return the names, highest score first; ties alphabetically."""\n    ordered = sorted(players, key=lambda p: (-p[1], p[0]))\n    return [name for name, score in ordered]',
      alternatives: ["def by_rank(p):\n    name, score = p\n    return (-score, name)\n\ndef rank(players):\n    return [p[0] for p in sorted(players, key=by_rank)]\n"],
      wrong: [
        { code: "def rank(players):\n    ordered = sorted(players, key=lambda p: p[1], reverse=True)\n    return [name for name, score in ordered]\n", fails: ["fn"], why: "ties keep input order" },
        { code: "def rank(players):\n    ordered = sorted(players, reverse=True)\n    return [name for name, score in ordered]\n", fails: ["fn"], why: "sorts by name, not score" },
      ],
    },
    {
      id: "challenge-2",
      title: "Query a product list",
      prompt:
        "Write `stock_report(products)`. Each product is a dictionary with `name`, `price` and `stock`. Return a tuple of three things: the name of the **cheapest product that is in stock** (`None` if none are), whether **any** product is out of stock, and the total stock value (`price × stock`, summed). Use `min` with `key=` and `default=`, `any`, and `sum`.",
      looksFor: [
        "The cheapest product with `stock > 0`, by name, or `None` when nothing is in stock.",
        "`True` if any product has `stock == 0`.",
        "The total value of the stock.",
      ],
      starter: "def stock_report(products):\n    # Return (cheapest_in_stock_name, any_out_of_stock, total_value).\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "stock_report",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [py.list(product("Desk", 120, 4), product("Lamp", 24.5, 0), product("Chair", 89, 7))], expected: py.tuple(s("Chair"), py.bool(true), f(1103)) },
              { args: [py.list(product("Pen", 1.5, 10))], expected: py.tuple(s("Pen"), py.bool(false), f(15)) },
              { args: [py.list(product("Lamp", 24.5, 0))], expected: py.tuple(py.none, py.bool(true), f(0)) },
              { args: [py.list()], expected: py.tuple(py.none, py.bool(false), i(0)), hidden: true },
            ],
            tip: "Filter first: in_stock = [p for p in products if p[\"stock\"] > 0], then min(in_stock, key=lambda p: p[\"price\"], default=None).",
          },
        ],
      },
      hints: [
        'in_stock = [p for p in products if p["stock"] > 0].',
        'cheapest = min(in_stock, key=lambda p: p["price"], default=None); its name is cheapest["name"] when it isn\'t None.',
        'any(p["stock"] == 0 for p in products) and sum(p["price"] * p["stock"] for p in products).',
      ],
      answer: 'def stock_report(products):\n    """Return (cheapest in-stock name or None, any out of stock, total stock value)."""\n    in_stock = [p for p in products if p["stock"] > 0]\n    cheapest = min(in_stock, key=lambda p: p["price"], default=None)\n    name = cheapest["name"] if cheapest is not None else None\n    out_of_stock = any(p["stock"] == 0 for p in products)\n    value = sum(p["price"] * p["stock"] for p in products)\n    return name, out_of_stock, value',
      wrong: [
        { code: 'def stock_report(products):\n    cheapest = min(products, key=lambda p: p["price"], default=None)\n    name = cheapest["name"] if cheapest else None\n    return name, any(p["stock"] == 0 for p in products), sum(p["price"] * p["stock"] for p in products)\n', fails: ["fn"], why: "cheapest product may be out of stock" },
        { code: 'def stock_report(products):\n    in_stock = [p for p in products if p["stock"] > 0]\n    cheapest = min(in_stock, key=lambda p: p["price"])\n    return cheapest["name"], any(p["stock"] == 0 for p in products), sum(p["price"] * p["stock"] for p in products)\n', fails: ["fn"], why: "ValueError when nothing is in stock" },
      ],
    },
  ],

  quiz: [
    {
      id: "key",
      prompt: "What does this program print?",
      code: 'items = ["bb", "a", "ccc", "dd"]\nprint(sorted(items, key=len, reverse=True))',
      options: [
        { text: "`['ccc', 'bb', 'dd', 'a']`", correct: true, why: "Longest first. `bb` and `dd` have the same length, so they keep their original order (sorting is stable)." },
        { text: "`['ccc', 'dd', 'bb', 'a']`", why: "`reverse=True` reverses the order of keys, but items with equal keys still keep their original relative order." },
        { text: "`['dd', 'ccc', 'bb', 'a']`", why: "The key is the length, not the text, so `ccc` (length 3) comes first." },
        { text: "`['a', 'bb', 'dd', 'ccc']`", why: "That's shortest first: `reverse=True` puts the longest first." },
      ],
    },
    {
      id: "all-empty",
      prompt: "What is `all(q > 0 for q in [])`?",
      options: [
        { text: "`True`", correct: true, why: "`all` is `True` when no item is false, and an empty list has no false items. Check for empty input separately if that matters." },
        { text: "`False`", why: "That's `any([])`: with nothing to check, “at least one is true” fails." },
        { text: "A `ValueError`", why: "Unlike `min` and `max`, `all` and `any` accept empty input." },
        { text: "`None`", why: "`all` always returns a boolean." },
      ],
    },
  ],

  outcomes: [
    "Pass functions as values, for example as a `key=` for sorting.",
    "Write short `lambda` functions, and sort by several things with a tuple key.",
    "Use `min`/`max` with `key=` and `default=`, plus `any`, `all` and `sum` over a generator expression.",
    "Know `all([])` is `True` and `min([])` needs a default.",
  ],
};
