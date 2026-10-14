import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));

export const iteratorsAndGenerators: PyLesson = {
  slug: "iterators-and-generators",
  ref: "python:iterators-and-generators",
  module: "patterns",
  number: 4,
  title: "Iterators and generators",
  level: "advanced",
  summary:
    "See what a `for` loop really does (`iter()` and `next()`), and write generator functions with `yield` that produce values one at a time: process data in batches, filter a stream of records, and avoid building huge lists you don't need.",

  sections: [
    {
      label: "what for really does",
      blocks: [
        {
          kind: "p",
          text: "Anything you can loop over is **iterable**. `iter(things)` gives an **iterator**, and each `next(iterator)` returns the next value; when there are none left, `next` raises `StopIteration`. A `for` loop does exactly this for you, and stops quietly at `StopIteration`.",
        },
        {
          kind: "p",
          text: "Iterators are **one-pass**: once used up, they stay used up. A list can be looped over again and again; a file object, a `zip` or a generator can't.",
        },
      ],
    },
    {
      label: "generator functions",
      blocks: [
        {
          kind: "p",
          text: "A function containing `yield` is a **generator function**. Calling it doesn't run the body; it returns a generator. Each time the loop asks for a value, the body runs until the next `yield`, hands that value out, and **pauses** there, keeping its local variables, until it's asked again.",
        },
        { kind: "code", code: 'def chunked(items, size):\n    """Yield lists of at most size items."""\n    for start in range(0, len(items), size):\n        yield items[start:start + size]\n\nfor batch in chunked([1, 2, 3, 4, 5], 2):\n    print(batch)    # [1, 2], then [3, 4], then [5]' },
        {
          kind: "p",
          text: "Generators are **lazy**: values are made only when needed, so a generator over a million records uses memory for one record at a time, and work stops as soon as the consumer stops asking. Wrap one in `list()` when you do want all the values at once.",
        },
      ],
    },
    {
      label: "pipelines of generators",
      blocks: [
        {
          kind: "p",
          text: "Generators chain naturally: one reads lines, the next parses them, the next keeps the valid ones. Each stage is a small, testable function, and records flow through one by one. A **generator expression**, `(x * 2 for x in values)`, is the one-line version.",
        },
      ],
    },
  ],

  example: {
    caption: "Batches and a filtering stage, both as generators. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def chunked(items, size):\n    """Yield lists of at most size items, in order."""\n    for start in range(0, len(items), size):\n        yield items[start:start + size]\n\n\ndef valid_amounts(lines):\n    """Yield the lines that are positive numbers, as floats."""\n    for line in lines:\n        try:\n            amount = float(line)\n        except ValueError:\n            continue\n        if amount > 0:\n            yield amount\n\n\nfor batch in chunked(["A1", "B2", "C3", "D4", "E5"], 2):\n    print("send", batch)\n\nraw = ["12.5", "oops", "-3", "7", ""]\nprint(list(valid_amounts(raw)), sum(valid_amounts(raw)))',
  },

  walkthrough: [
    {
      title: "iter and next",
      text: "This is what a `for` loop does behind the scenes. The final `next` has nothing left, so it raises `StopIteration`.",
      code: 'it = iter(["a", "b"])\nprint(next(it))\nprint(next(it))\nprint(next(it))',
    },
    {
      title: "A generator pauses at yield",
      text: "The prints show the body running only when a value is requested, and resuming where it stopped.",
      code: 'def countdown(n):\n    print("starting")\n    while n > 0:\n        yield n\n        n -= 1\n    print("finished")\n\ngen = countdown(2)\nprint("created")\nprint(next(gen))\nprint(next(gen))\nprint(list(gen))',
    },
    {
      title: "Generators are used up after one pass",
      text: "The second `list` is empty: the generator already produced all its values.",
      code: "squares = (n * n for n in range(4))\nprint(list(squares))\nprint(list(squares))",
    },
    {
      title: "Lazy work stops early",
      text: "`next` takes only the first match, so the generator stops after checking three readings, not all of them.",
      code: 'checked = []\ndef over_limit(readings, limit):\n    for r in readings:\n        checked.append(r)\n        if r > limit:\n            yield r\n\nprint(next(over_limit([12, 18, 31, 40, 55], 30)))\nprint(checked)',
    },
  ],

  mistakes: [
    {
      title: "Looping over a generator twice",
      text: "The total is right, but the count is 0: the first loop used the generator up.",
      code: 'amounts = (float(x) for x in ["1.5", "2.5"])\nprint(sum(amounts))\nprint(len(list(amounts)))',
      fix: "Make a list once (`amounts = [float(x) for x in raw]`) if you need several passes.",
    },
    {
      title: "Using return instead of yield",
      text: "`return` ends the function on the first item, so only the first batch comes back, and as a plain list rather than a stream of batches.",
      code: "def chunked(items, size):\n    for start in range(0, len(items), size):\n        return items[start:start + size]\n\nprint(list(chunked([1, 2, 3, 4, 5], 2)))",
      fix: "`yield` each batch so the function produces all of them.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Yield batches",
      prompt:
        "Write a generator function `chunked(items, size)` that yields consecutive lists of at most `size` items from the list `items`, in order, with the leftovers in a final shorter batch. A `size` below 1 raises `ValueError`. It must be a generator (use `yield`).",
      looksFor: [
        "`list(chunked([1, 2, 3, 4, 5], 2))` is `[[1, 2], [3, 4], [5]]`.",
        "An empty list yields nothing; `size` larger than the list yields one batch.",
        "It's a generator, and `size < 1` raises `ValueError`.",
      ],
      starter: "def chunked(items, size):\n    # Yield lists of at most size items.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "batches", label: "Batches in order, leftovers last", show: "list(chunked([1, 2, 3, 4, 5], 2))", expr: "list(chunked([1, 2, 3, 4, 5], 2))", expected: py.list(ints(1, 2), ints(3, 4), ints(5)) },
          { kind: "expr", id: "edges", label: "Empty input, and a size bigger than the list", show: "list(chunked([], 3)), list(chunked([1, 2], 10))", expr: "(list(chunked([], 3)), list(chunked([1, 2], 10)))", expected: py.tuple(py.list(), py.list(ints(1, 2))) },
          { kind: "expr", id: "generator", label: "chunked is a generator", show: "import inspect; inspect.isgeneratorfunction(chunked)", expr: "import inspect\nresult = inspect.isgeneratorfunction(chunked)", expected: py.bool(true), tip: "Use yield inside the loop instead of building and returning a list." },
          { kind: "expr", id: "size", label: "size below 1 raises ValueError", show: "list(chunked([1], 0))", expr: "list(chunked([1], 0))", raises: "ValueError" },
          { kind: "expr", id: "exact", label: "Exact multiples have no empty batch", hidden: true, expr: "list(chunked(list(range(6)), 3))", expected: py.list(ints(0, 1, 2), ints(3, 4, 5)) },
        ],
      },
      hints: [
        "Check size first: if size < 1: raise ValueError(...). It runs when the generator starts.",
        "for start in range(0, len(items), size): gives 0, size, 2×size, …",
        "yield items[start:start + size].",
      ],
      answer: 'def chunked(items, size):\n    """Yield consecutive lists of at most size items."""\n    if size < 1:\n        raise ValueError(f"size must be at least 1, got {size}")\n    for start in range(0, len(items), size):\n        yield items[start:start + size]',
      wrong: [
        { code: "def chunked(items, size):\n    if size < 1:\n        raise ValueError('size')\n    batches = []\n    for start in range(0, len(items), size):\n        batches.append(items[start:start + size])\n    return batches\n", fails: ["generator"], why: "returns a list" },
        { code: "def chunked(items, size):\n    if size < 1:\n        raise ValueError('size')\n    for start in range(0, len(items) - size + 1, size):\n        yield items[start:start + size]\n", fails: ["batches", "edges"], why: "drops the leftovers" },
      ],
    },
    {
      id: "challenge-2",
      title: "Stream valid records",
      prompt:
        "Write a generator `valid_records(lines)` that takes lines like `\"ORD-1,ana,40.0\"` (id, customer, amount) and yields a dictionary `{\"id\", \"customer\", \"amount\"}` for each valid line, with `amount` as a float. Skip blank lines, lines without exactly three fields, and lines whose amount isn't a positive number. Process one line at a time.",
      looksFor: [
        "Valid lines become dictionaries with a float `amount`, in order.",
        "Blank lines, wrong field counts and non-positive or non-numeric amounts are skipped.",
        "It's a generator, so it works on any iterable of lines, including a file.",
      ],
      starter: "def valid_records(lines):\n    # Yield a dict for each valid line.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "records",
            label: "Valid lines become dictionaries",
            show: 'list(valid_records(["ORD-1,ana,40.0", "", "ORD-2,ben", "ORD-3,cai,-5", "ORD-4,dee,abc", "ORD-5,eve,9.5"]))',
            expr: 'list(valid_records(["ORD-1,ana,40.0", "", "ORD-2,ben", "ORD-3,cai,-5", "ORD-4,dee,abc", "ORD-5,eve,9.5"]))',
            expected: py.list(py.dict([[s("id"), s("ORD-1")], [s("customer"), s("ana")], [s("amount"), py.float(40)]]), py.dict([[s("id"), s("ORD-5")], [s("customer"), s("eve")], [s("amount"), py.float(9.5)]])),
          },
          { kind: "expr", id: "generator", label: "valid_records is a generator", show: "inspect.isgeneratorfunction(valid_records)", expr: "import inspect\nresult = inspect.isgeneratorfunction(valid_records)", expected: py.bool(true) },
          { kind: "expr", id: "lazy", label: "Hands out each record as soon as it's ready", show: "next(valid_records(a stream of lines))", expr: 'def _stream():\n    yield "ORD-9,zed,1.25\\n"\n    raise RuntimeError("valid_records read past the first record before handing it out")\nresult = next(valid_records(_stream()))', expected: py.dict([[s("id"), s("ORD-9")], [s("customer"), s("zed")], [s("amount"), py.float(1.25)]]), tip: "Yield each record as soon as it's ready, and strip the line first: lines from files end with \\n." },
          { kind: "expr", id: "zero", label: "Zero amounts are skipped", hidden: true, expr: 'list(valid_records(["A,b,0", " X,y,2 "]))', expected: py.list(py.dict([[s("id"), s("X")], [s("customer"), s("y")], [s("amount"), py.float(2)]])) },
        ],
      },
      hints: [
        'for line in lines: parts = line.strip().split(","), then skip unless len(parts) == 3.',
        "try: amount = float(parts[2]) except ValueError: continue. Skip if amount <= 0.",
        'yield {"id": parts[0], "customer": parts[1], "amount": amount}.',
      ],
      answer: 'def valid_records(lines):\n    """Yield {id, customer, amount} for each valid "id,customer,amount" line."""\n    for line in lines:\n        parts = line.strip().split(",")\n        if len(parts) != 3:\n            continue\n        record_id, customer, amount_text = parts\n        try:\n            amount = float(amount_text)\n        except ValueError:\n            continue\n        if amount <= 0:\n            continue\n        yield {"id": record_id, "customer": customer, "amount": amount}',
      wrong: [
        { code: 'def valid_records(lines):\n    out = []\n    for line in lines:\n        parts = line.strip().split(",")\n        if len(parts) != 3:\n            continue\n        try:\n            amount = float(parts[2])\n        except ValueError:\n            continue\n        if amount > 0:\n            out.append({"id": parts[0], "customer": parts[1], "amount": amount})\n    return out\n', fails: ["generator", "lazy"], why: "builds a whole list before returning" },
        { code: 'def valid_records(lines):\n    for line in lines:\n        parts = line.split(",")\n        if len(parts) != 3:\n            continue\n        try:\n            amount = float(parts[2])\n        except ValueError:\n            continue\n        if amount > 0:\n            yield {"id": parts[0], "customer": parts[1], "amount": amount}\n', fails: ["zero"], why: "no strip: \" X\" keeps its space" },
      ],
    },
  ],

  quiz: [
    {
      id: "lazy",
      prompt: "What does this program print?",
      code: 'def gen():\n    print("A")\n    yield 1\n    print("B")\n    yield 2\n\ng = gen()\nprint("C")\nprint(next(g))',
      options: [
        { text: "`C`, `A`, `1`", correct: true, why: "Calling `gen()` runs nothing. `next(g)` runs the body up to the first `yield`, printing `A` and returning 1." },
        { text: "`A`, `C`, `1`", why: "The body doesn't start when the generator is created, only when a value is requested." },
        { text: "`C`, `A`, `1`, `B`, `2`", why: "Only one value was requested; the body pauses at the first `yield`." },
        { text: "`C`, `1`", why: "The body does run up to the `yield`, including `print(\"A\")`." },
      ],
    },
    {
      id: "one-pass",
      prompt: "`nums = (n for n in range(3))`. What is `sum(nums) + sum(nums)`?",
      options: [
        { text: "`3`", correct: true, why: "The first `sum` uses the generator up (0 + 1 + 2 = 3); the second sees nothing, so adds 0." },
        { text: "`6`", why: "A generator can't be restarted, so the second pass is empty." },
        { text: "`0`", why: "The first `sum` does get all three values." },
        { text: "A `TypeError`", why: "`sum` works on generators; it just consumes them." },
      ],
    },
  ],

  outcomes: [
    "Explain how `for` uses `iter()`, `next()` and `StopIteration`.",
    "Write generator functions with `yield`, and predict when their code runs.",
    "Use generators for batching and filtering streams of records lazily.",
    "Know that iterators are one-pass, and turn them into lists when needed.",
  ],
};
