import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const i = py.int;
const nums = (...xs: number[]) => py.list(...xs.map((x) => i(x)));

export const importingAndUsingModules: PyLesson = {
  slug: "importing-and-using-modules",
  ref: "python:importing-and-using-modules",
  module: "functions",
  number: 6,
  title: "Importing and using modules",
  level: "intermediate",
  summary:
    "Use code that's already written: import modules from Python's standard library (`math`, `statistics`, `random`, `collections`), choose between `import x` and `from x import y`, and read a module's documentation to find what it offers.",

  sections: [
    {
      label: "import",
      blocks: [
        {
          kind: "p",
          text: "A **module** is a file of Python code (functions, values, classes) that other programs can use. Python ships with a large **standard library** of modules. `import math` runs the module once and gives you the name `math`; its contents are reached with a dot: `math.sqrt(16)`, `math.pi`.",
        },
        { kind: "code", code: 'import math\nfrom statistics import mean, median\nimport collections as col\n\nprint(math.ceil(7 / 3))      # 3\nprint(mean([70, 85, 90]))    # 81.66…\nprint(col.Counter("abca"))' },
        {
          kind: "p",
          text: "`from statistics import mean` brings just `mean` into your program, so you call it without the prefix. `import collections as col` gives a module a shorter name. Put imports at the top of the file, so readers see what the program depends on.",
        },
      ],
    },
    {
      label: "a few modules worth knowing",
      blocks: [
        {
          kind: "p",
          text: "`math`: `sqrt`, `ceil` (round up), `floor` (round down), `pi`, `isclose` for comparing floats. `statistics`: `mean`, `median`, `mode`, `stdev`. `random`: `randint`, `choice`, `shuffle`, and `seed`, which makes the “random” numbers repeat exactly, for tests and reproducible results. `collections.Counter` counts things: `Counter(words).most_common(3)` is the counting pattern in one line.",
        },
        {
          kind: "p",
          text: "To explore a module, `help(math.ceil)` shows a function's documentation and `dir(math)` lists its names. The official Python documentation describes every standard-library module.",
        },
      ],
    },
    {
      label: "don't shadow module names",
      blocks: [
        {
          kind: "p",
          text: "If you assign to a name you imported (`math = 3`, or `def mean(...)` after `from statistics import mean`), your value replaces the import from that point on. Choose your own names so they don't clash with modules you use.",
        },
      ],
    },
  ],

  example: {
    caption: "Four standard-library modules in a few lines. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import math\nimport random\nfrom collections import Counter\nfrom statistics import mean, median\n\nscores = [70, 85, 90, 85]\nprint("Mean:", mean(scores), "| Median:", median(scores))\nprint("Boxes for 70 items, 8 per box:", math.ceil(70 / 8))\n\nwords = "the cat and the hat and the bat".split()\nprint(Counter(words).most_common(2))\n\nrandom.seed(42)\nprint("Dice:", random.randint(1, 6), random.randint(1, 6))',
  },

  walkthrough: [
    {
      title: "import, then a dot",
      text: "`math.ceil` rounds up and `math.floor` rounds down, even for negative numbers.",
      code: "import math\nprint(math.ceil(7 / 3), math.floor(7 / 3), math.floor(-2.5))\nprint(math.sqrt(16), round(math.pi, 4))",
    },
    {
      title: "from … import …",
      text: "The imported names are used directly, without the module prefix.",
      code: "from statistics import mean, median\nprint(mean([70, 85, 90, 85]), median([70, 85, 90, 85]))\nprint(median([1, 2, 3, 4]))",
    },
    {
      title: "Counter does the counting pattern",
      text: "`Counter` counts each item; `most_common(n)` gives the top `n` as `(item, count)` pairs.",
      code: 'from collections import Counter\nevents = ["view", "click", "view", "buy", "view"]\ncounts = Counter(events)\nprint(counts["view"], counts["refund"])\nprint(counts.most_common(1))',
    },
    {
      title: "Seeded randomness repeats",
      text: "Seeding with the same number gives the same sequence every run, which is what makes tests and simulations reproducible.",
      code: "import random\nrandom.seed(7)\nfirst = [random.randint(1, 6) for _ in range(5)]\nrandom.seed(7)\nsecond = [random.randint(1, 6) for _ in range(5)]\nprint(first, first == second)",
    },
  ],

  mistakes: [
    {
      title: "Using a module's contents without the prefix",
      text: "`import math` gives you `math`, not `sqrt`: `NameError`.",
      code: "import math\nprint(sqrt(16))",
      raises: "NameError",
      fix: "Write `math.sqrt(16)`, or import the name: `from math import sqrt`.",
    },
    {
      title: "A module name that doesn't exist",
      text: "There's no module called `maths`: `ModuleNotFoundError`, before any of your code uses it.",
      code: "import maths\nprint(maths.pi)",
      raises: "ModuleNotFoundError",
      fix: "Check the exact module name in the documentation: here, `math`.",
    },
    {
      title: "Shadowing an imported name",
      text: "The loop variable `mean` replaces the imported function, so the call on the last line tries to call an int: `TypeError`.",
      code: "from statistics import mean\nfor mean in [1, 2]:\n    pass\nprint(mean([3, 4]))",
      raises: "TypeError",
      fix: "Use a different variable name, such as `value`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Summarise scores with statistics",
      prompt:
        "Write `summarize(scores)` using the `statistics` module. It returns a tuple `(mean, median)` for a list of scores. For an empty list it returns `None` (the `statistics` functions would raise an error, so check first).",
      looksFor: [
        "`summarize([70, 85, 90, 85])` returns `(82.5, 85.0)`.",
        "It uses `statistics.mean` and `statistics.median` (or equivalent), and works for any list.",
        "`summarize([])` returns `None`.",
      ],
      starter: "# Import what you need from statistics.\n\n\ndef summarize(scores):\n    # Return (mean, median), or None for an empty list.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "summarize",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [nums(70, 85, 90, 85)], expected: py.tuple(f(82.5), f(85)) },
              { args: [nums(1, 2, 3, 4)], expected: py.tuple(f(2.5), f(2.5)) },
              { args: [py.list()], expected: py.none },
              { args: [nums(5)], expected: py.tuple(i(5), i(5)), hidden: true },
              { args: [nums(9, 1, 5)], expected: py.tuple(i(5), i(5)), hidden: true },
            ],
            tip: "from statistics import mean, median, then return mean(scores), median(scores).",
          },
        ],
      },
      hints: [
        "from statistics import mean, median at the top.",
        "if not scores: return None first.",
        "return mean(scores), median(scores).",
      ],
      answer: 'from statistics import mean, median\n\n\ndef summarize(scores):\n    """Return (mean, median) of scores, or None for an empty list."""\n    if not scores:\n        return None\n    return mean(scores), median(scores)',
      alternatives: ["import statistics\n\ndef summarize(scores):\n    if len(scores) == 0:\n        return None\n    return (statistics.mean(scores), statistics.median(scores))\n"],
      wrong: [
        { code: "from statistics import mean, median\n\ndef summarize(scores):\n    return mean(scores), median(scores)\n", fails: ["fn"], why: "StatisticsError for []" },
        { code: "from statistics import mean\n\ndef summarize(scores):\n    if not scores:\n        return None\n    return mean(scores), scores[len(scores) // 2]\n", fails: ["fn"], why: "middle item of the unsorted list isn't the median" },
      ],
    },
    {
      id: "challenge-2",
      title: "Find the most common words",
      prompt:
        "Write `top_words(text, n)`, which returns a list of the `n` most common words in `text`, most common first. Words are separated by whitespace and compared in lowercase. When words tie, they keep the order in which they first appear in the text (that's what `Counter.most_common` does). Use `collections.Counter`.",
      looksFor: [
        "Words are lowercased before counting, so `The` and `the` are the same word.",
        "The result is a list of words (not counts), most common first, at most `n` long.",
        "Ties keep first-appearance order.",
      ],
      starter: "# Import Counter from collections.\n\n\ndef top_words(text, n):\n    # Return the n most common words, most common first.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "top_words",
            cases: [
              { args: [s("the cat and the hat and the bat"), i(2)], expected: py.list(s("the"), s("and")) },
              { args: [s("The cat THE dog"), i(1)], expected: py.list(s("the")) },
              { args: [s("b a c"), i(2)], expected: py.list(s("b"), s("a")) },
              { args: [s(""), i(3)], expected: py.list(), hidden: true },
              { args: [s("x y x z y x"), i(5)], expected: py.list(s("x"), s("y"), s("z")), hidden: true },
            ],
            tip: "Counter(text.lower().split()).most_common(n) gives (word, count) pairs; keep only the words.",
          },
        ],
      },
      hints: [
        "from collections import Counter.",
        "counts = Counter(text.lower().split()).",
        "return [word for word, count in counts.most_common(n)].",
      ],
      answer: 'from collections import Counter\n\n\ndef top_words(text, n):\n    """Return the n most common words in text (lowercased), most common first."""\n    counts = Counter(text.lower().split())\n    return [word for word, count in counts.most_common(n)]',
      wrong: [
        { code: "from collections import Counter\n\ndef top_words(text, n):\n    return Counter(text.lower().split()).most_common(n)\n", fails: ["fn"], why: "returns (word, count) pairs" },
        { code: "from collections import Counter\n\ndef top_words(text, n):\n    counts = Counter(text.split())\n    return [w for w, c in counts.most_common(n)]\n", fails: ["fn"], why: "doesn't lowercase" },
      ],
    },
  ],

  quiz: [
    {
      id: "import-forms",
      prompt: "After `from math import sqrt`, which call works?",
      options: [
        { text: "`sqrt(25)`", correct: true, why: "`from math import sqrt` puts the name `sqrt` itself into your program." },
        { text: "`math.sqrt(25)`", why: "This form doesn't define the name `math`; only `import math` does." },
        { text: "`math(sqrt(25))`", why: "`math` isn't defined, and modules aren't called like functions." },
        { text: "`import.sqrt(25)`", why: "`import` is a keyword, not a module." },
      ],
    },
    {
      id: "seed",
      prompt: "Why call `random.seed(42)` at the start of a simulation?",
      options: [
        { text: "So the same “random” numbers come out every run, making results reproducible", correct: true, why: "A seed fixes the starting point of the random sequence, so runs can be repeated and tested." },
        { text: "So the numbers are more random", why: "Seeding doesn't improve randomness; it makes the sequence repeatable." },
        { text: "So `randint` returns 42", why: "42 is just the starting point of the sequence; the numbers drawn from it vary." },
        { text: "Because `random` can't be used without it", why: "Without a seed Python picks one automatically, so results differ between runs." },
      ],
    },
  ],

  outcomes: [
    "Import modules with `import x`, `from x import y` and `import x as z`.",
    "Use `math`, `statistics`, `random` and `collections.Counter` for common tasks.",
    "Make random results reproducible with `random.seed`.",
    "Explore a module with `help()` and `dir()`, and avoid shadowing imported names.",
  ],
};
