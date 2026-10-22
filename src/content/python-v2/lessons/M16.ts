/**
 * M16 Collections & Itertools: five lessons (PY-L16-01 … PY-L16-05).
 *
 * M12 counted and grouped with a plain dictionary and an `if key not in …` line, and walked queues and pairs with
 * hand-written loops. The standard library has a tool for each of those jobs, and each lesson starts from the job:
 * counting and ranking (Counter, 01, which is also where `import` arrives), grouping without the setup line
 * (defaultdict, 02), first-in-first-out queues and "the last N" windows (deque, 03), runs of equal neighbours in
 * ordered data (itertools.groupby, 04), and every pair from a list without repeats (itertools.combinations, 05).
 * Fixtures are small slices of course datasets: Runtime Repository Events (D11: pushes, stars, issues), Runtime Q&A
 * (D12: question tags), Runtime Market orders and products (R01), NOAA daily highs (D07) and BTS routes (D13).
 *
 * Challenges are graded by calling the learner's function with the public example and with hidden inputs (empty,
 * single, ties, boundaries, repeated keys), and by checking that inputs are not mutated where that matters. The grader
 * compares plain values, so functions hand back a plain dict or list, never a Counter or defaultdict.
 * Version 2: rewritten from a print-one-value module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** A Python tuple of plain values. */
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

// ---------------------------------------------------------------- shared fixtures (inputs for function checks)

const repoEvents = [
  { type: "PushEvent", repo: "quill-data/fast-parser" },
  { type: "WatchEvent", repo: "tidewater/stream-sync" },
  { type: "PushEvent", repo: "quill-data/fast-parser" },
  { type: "PushEvent", repo: "lumen-labs/py-cache" },
];

const tagged = [
  { question_id: 101, tags: ["python", "pandas"] },
  { question_id: 102, tags: ["python", "list"] },
  { question_id: 103, tags: ["python", "pandas", "datetime"] },
  { question_id: 104, tags: ["sqlite"] },
];

const issues = [
  { number: 412, labels: ["bug", "help wanted"] },
  { number: 415, labels: ["documentation"] },
  { number: 418, labels: ["bug"] },
  { number: 420, labels: [] },
];

const titles = [
  { id: 101, title: "Merge two DataFrames" },
  { id: 102, title: "merge sorted lists" },
  { id: 103, title: "Sort a list of dicts" },
];

const highs = [28.1, 31.4, 32.0, 29.5, 33.2, 34.0, 35.1, 29.0];

const pushes = [
  { author: "maya-k", date: "2025-03-04", commits: 3 },
  { author: "devon-r", date: "2025-03-04", commits: 1 },
  { author: "maya-k", date: "2025-03-03", commits: 2 },
  { author: "maya-k", date: "2025-03-04", commits: 1 },
];

const shelf = [
  { name: "Travel Yoga Mat", price: 24.99 },
  { name: "Deluxe Vase", price: 31.0 },
  { name: "Nordic Candle", price: 12.5 },
  { name: "Organic Speaker", price: 59.0 },
];

const people = [
  { id: "C00038", email: "nora_garcia@fastmail.com", phone: "+1 202-555-0143" },
  { id: "C00077", email: "jamal.walker62@icloud.com", phone: "(312) 555 0199" },
  { id: "C01338", email: " Nora_Garcia@Fastmail.com", phone: "" },
  { id: "C02210", email: "j.walker@example.com", phone: "312-555-0199" },
];

export const m16Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L16-01 Counter (and import)
  {
    id: "PY-L16-01",
    version: 2,
    slug: "count-with-counter",
    title: "Count and rank with Counter",
    lede: "Counting how often each value appears is one of the most common jobs in data work. `Counter`, from the standard library's `collections` module, does the counting, gives 0 for values it never saw, and ranks the results.",
    focus: "Import Counter and use it to count values, add weighted amounts, and rank the most common.",
    minutes: 17,
    objectives: [
      "Bring a tool in from the standard library with `from collections import Counter`",
      "Count a list in one step, read a count (0 for an unseen value), and add more counts with `+=` or `update`",
      "Rank with `most_common(n)`, and know how it orders ties",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-split", "arithmetic", "comparison", "for-loop", "membership", "if-statement", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "len-call", "print-text", "dict-update", "conditional-expr", "list-mutate", "dict-iterate"],
    teaches: ["import-module", "counter-call"],
    blocks: [
      {
        kind: "text",
        md: "In the Collection Algorithms module you counted with a dictionary: start each new key at 0, then add 1. It works, but almost every program that reads data needs it, so Python ships a ready-made counter.\n\nPython comes with a **standard library**: modules of extra tools that are installed with Python but not loaded until you ask. `from collections import Counter` loads the `collections` module and makes its name `Counter` available in your program. Put imports at the top of the file.\n\n`Counter(values)` counts every value in a list. Reading a count works like a dictionary lookup, except that a value it never saw gives **0** instead of a KeyError. `most_common(n)` returns the top `n` as `(value, count)` pairs, highest first.",
      },
      {
        kind: "example",
        title: "Repository events by type",
        code: src`
from collections import Counter

event_types = ["PushEvent", "WatchEvent", "PushEvent", "IssuesEvent", "PushEvent", "WatchEvent"]
counts = Counter(event_types)
print(counts)
print(counts["PushEvent"], counts["ReleaseEvent"])
print(counts.most_common(2))
`,
        output: "Counter({'PushEvent': 3, 'WatchEvent': 2, 'IssuesEvent': 1})\n3 0\n[('PushEvent', 3), ('WatchEvent', 2)]\n",
        note: "No release happened, so `counts[\"ReleaseEvent\"]` is 0. Reading a missing value doesn't add it to the counter.",
      },
      {
        kind: "text",
        md: "The import is not optional. Without it, Python has never heard of `Counter`:",
      },
      {
        kind: "error-example",
        title: "Using Counter without importing it",
        code: src`
counts = Counter(["PushEvent", "WatchEvent"])
print(counts)
`,
        error: "NameError",
        output: "",
        note: "`NameError: name 'Counter' is not defined`. Add `from collections import Counter` at the top.",
      },
      {
        kind: "text",
        md: "A Counter is a dictionary underneath, so you can also add any amount to a count. Because a missing count starts at 0, `units[product] += quantity` needs no `if` first. To add 1 for every item of another list, `counts.update(more_values)` does it in one call.",
      },
      {
        kind: "example",
        title: "Best sellers by units, not by order lines",
        code: src`
from collections import Counter

def best_sellers(lines, n):
    units = Counter()
    for line in lines:
        units[line["product"]] += line["quantity"]
    return units.most_common(n)

lines = [
    {"product": "Travel Yoga Mat", "quantity": 2},
    {"product": "Deluxe Vase", "quantity": 1},
    {"product": "Travel Yoga Mat", "quantity": 3},
    {"product": "Nordic Candle", "quantity": 4},
]
print(best_sellers(lines, 2))
`,
        output: "[('Travel Yoga Mat', 5), ('Nordic Candle', 4)]\n",
        note: "`Counter()` with nothing inside starts empty. The yoga mat appears on two lines but sold 5 units; counting lines instead would rank it lower than it deserves.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the question is *how many of each?* or *which are the most common?*: events per type, tags per question, units per product. **Mistakes to avoid:** `Counter(\"python pandas\")` counts **letters**, because a text is a sequence of characters; split it into words first. `most_common` breaks ties by the order values were first seen, not alphabetically. And a Counter prints as `Counter({…})`; when a function's caller expects a plain dictionary or list, convert it (`dict(counts)`, or the list from `most_common`).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count by repository",
      prompt: "`events_per_repo` counts the events by **type**. The dashboard wants them counted by **repository**: change what is counted, then run it.",
      spec: [
        ["Function", "`events_per_repo(events)`"],
        ["Returns", "`(repo, count)` pairs, busiest first, from `most_common()`"],
      ],
      starter: src`
from collections import Counter

def events_per_repo(events):
    counts = Counter([event["type"] for event in events])
    return counts.most_common()

events = [
    {"type": "PushEvent", "repo": "quill-data/fast-parser"},
    {"type": "WatchEvent", "repo": "tidewater/stream-sync"},
    {"type": "PushEvent", "repo": "quill-data/fast-parser"},
    {"type": "PushEvent", "repo": "lumen-labs/py-cache"},
]
print(events_per_repo(events))
`,
      answer: src`
from collections import Counter

def events_per_repo(events):
    counts = Counter([event["repo"] for event in events])
    return counts.most_common()

events = [
    {"type": "PushEvent", "repo": "quill-data/fast-parser"},
    {"type": "WatchEvent", "repo": "tidewater/stream-sync"},
    {"type": "PushEvent", "repo": "quill-data/fast-parser"},
    {"type": "PushEvent", "repo": "lumen-labs/py-cache"},
]
print(events_per_repo(events))
`,
      wrong: [
        {
          code: src`
from collections import Counter

def events_per_repo(events):
    counts = Counter([event["repo"] for event in events])
    return dict(counts)
`,
          fails: ["returns"],
          why: "it returns a dictionary instead of the ranked pairs",
        },
      ],
      hints: ["Only the value read from each event needs to change.", "Each event stores its repository under `\"repo\"`.", "`most_common()` with no number returns every pair, busiest first."],
      task: {
        checks: [
          fn("returns", "events_per_repo", [
            example([repoEvents], [tup("quill-data/fast-parser", 2), tup("tidewater/stream-sync", 1), tup("lumen-labs/py-cache", 1)]),
            hiddenCase("one repository", [[{ type: "PushEvent", repo: "a/b" }, { type: "ForkEvent", repo: "a/b" }]], [tup("a/b", 2)]),
            hiddenCase("no events", [[]], []),
          ], { label: "events_per_repo() counts events per repository" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The tags that need an expert",
        prompt: "A Q&A site wants to know which topics people ask about most, so it can find experts for them. Each question carries a list of tags. Write `top_tags(questions, n)`: return the names of the `n` most used tags across all questions, most used first.",
        spec: [
          ["Function", "`top_tags(questions, n)`"],
          ["questions", "a list of dictionaries with `question_id` and `tags` (a list of texts)"],
          ["Returns", "a list of at most `n` tag names; ties keep the order the tags were first seen"],
          ["Example", "the starter's questions with `n` 2 → `['python', 'pandas']`"],
        ],
        starter: src`
from collections import Counter

def top_tags(questions, n):
    return []

questions = [
    {"question_id": 101, "tags": ["python", "pandas"]},
    {"question_id": 102, "tags": ["python", "list"]},
    {"question_id": 103, "tags": ["python", "pandas", "datetime"]},
    {"question_id": 104, "tags": ["sqlite"]},
]
print(top_tags(questions, 2))
print(top_tags(questions, 3))
`,
        answer: src`
from collections import Counter

def top_tags(questions, n):
    counts = Counter()
    for question in questions:
        counts.update(question["tags"])
    return [tag for tag, count in counts.most_common(n)]

questions = [
    {"question_id": 101, "tags": ["python", "pandas"]},
    {"question_id": 102, "tags": ["python", "list"]},
    {"question_id": 103, "tags": ["python", "pandas", "datetime"]},
    {"question_id": 104, "tags": ["sqlite"]},
]
print(top_tags(questions, 2))
print(top_tags(questions, 3))
`,
        alternatives: [
          src`
from collections import Counter

def top_tags(questions, n):
    counts = Counter([tag for question in questions for tag in question["tags"]])
    ranked = counts.most_common(n)
    return [pair[0] for pair in ranked]
`,
        ],
        wrong: [
          {
            code: src`
from collections import Counter

def top_tags(questions, n):
    counts = Counter()
    for question in questions:
        counts[question["tags"][0]] += 1
    return [tag for tag, count in counts.most_common(n)]
`,
            fails: ["returns"],
            why: "only each question's first tag is counted",
          },
          {
            code: src`
from collections import Counter

def top_tags(questions, n):
    for question in questions:
        counts = Counter(question["tags"])
    return [tag for tag, count in counts.most_common(n)]
`,
            fails: ["returns"],
            why: "a new Counter is made for every question, so only the last question's tags are counted",
          },
          {
            code: src`
from collections import Counter

def top_tags(questions, n):
    counts = Counter()
    for question in questions:
        counts.update(question["tags"])
    return counts.most_common(n)
`,
            fails: ["returns"],
            why: "it returns `(tag, count)` pairs instead of tag names",
          },
        ],
        hints: [
          "One Counter has to collect the tags of every question, so create it before the loop.",
          "`update` adds 1 for each item of a list, so it can take a question's whole tag list at once.",
          "`most_common(n)` gives pairs; keep only the first item of each pair.",
        ],
        task: {
          checks: [
            fn("returns", "top_tags", [
              example([tagged, 2], ["python", "pandas"]),
              example([tagged, 3], ["python", "pandas", "list"]),
              example([[], 5], []),
              hiddenCase("n larger than the number of tags", [[{ question_id: 1, tags: ["regex"] }, { question_id: 2, tags: ["regex", "python"] }], 10], ["regex", "python"]),
              hiddenCase("ties in first-seen order", [[{ question_id: 1, tags: ["numpy", "sqlite"] }, { question_id: 2, tags: ["list", "numpy", "sqlite", "list"] }], 3], ["numpy", "sqlite", "list"]),
              hiddenCase("n of zero", [tagged, 0], []),
              hiddenCase("one question with one tag", [[{ question_id: 9, tags: ["datetime"] }], 1], ["datetime"]),
            ], { label: "top_tags() ranks tags across every question" }),
          ],
        },
      },
      {
        id: "c2",
        title: "What can't we ship?",
        prompt: "A picking list repeats a SKU once per unit ordered. Before packing, the warehouse needs to know what is short. Write `shortfall(order_skus, stock)`: return a plain dictionary of each SKU the order needs more of than is in stock, with how many units are missing. A SKU missing from `stock` has 0 units.",
        spec: [
          ["Function", "`shortfall(order_skus, stock)`"],
          ["order_skus", "a list of SKUs, one entry per unit ordered"],
          ["stock", "a dictionary of SKU → units on the shelf"],
          ["Returns", "a plain `dict` of SKU → units short, in the order each SKU first appears in the order; SKUs that can be filled are left out"],
          ["Example", "the starter's order → `{'SPO-11681': 1, 'ELE-24781': 1}`"],
        ],
        starter: src`
from collections import Counter

def shortfall(order_skus, stock):
    return {}

order = ["SPO-11681", "HOM-22847", "SPO-11681", "ELE-24781", "SPO-11681"]
stock = {"SPO-11681": 2, "HOM-22847": 5}
print(shortfall(order, stock))
`,
        answer: src`
from collections import Counter

def shortfall(order_skus, stock):
    wanted = Counter(order_skus)
    missing = {}
    for sku, units in wanted.items():
        available = stock[sku] if sku in stock else 0
        if units > available:
            missing[sku] = units - available
    return missing

order = ["SPO-11681", "HOM-22847", "SPO-11681", "ELE-24781", "SPO-11681"]
stock = {"SPO-11681": 2, "HOM-22847": 5}
print(shortfall(order, stock))
`,
        alternatives: [
          src`
from collections import Counter

def shortfall(order_skus, stock):
    on_shelf = Counter()
    for sku, units in stock.items():
        on_shelf[sku] = units
    missing = {}
    for sku, units in Counter(order_skus).items():
        if units - on_shelf[sku] > 0:
            missing[sku] = units - on_shelf[sku]
    return missing
`,
        ],
        wrong: [
          {
            code: src`
from collections import Counter

def shortfall(order_skus, stock):
    wanted = Counter(order_skus)
    missing = {}
    for sku, units in wanted.items():
        if units > stock[sku]:
            missing[sku] = units - stock[sku]
    return missing
`,
            fails: ["returns"],
            why: "a SKU that isn't in the stock dictionary raises KeyError instead of counting as 0",
          },
          {
            code: src`
from collections import Counter

def shortfall(order_skus, stock):
    wanted = Counter(order_skus)
    missing = {}
    for sku, units in wanted.items():
        available = stock[sku] if sku in stock else 0
        if units >= available:
            missing[sku] = units - available
    return missing
`,
            fails: ["returns"],
            why: "an order that uses exactly the stock is reported as short by 0",
          },
          {
            code: src`
from collections import Counter

def shortfall(order_skus, stock):
    missing = {}
    for sku in order_skus:
        if sku not in stock or stock[sku] == 0:
            missing[sku] = 1
    return missing
`,
            fails: ["returns"],
            why: "units are never counted, so a SKU ordered three times with two in stock isn't short",
          },
        ],
        hints: [
          "The order is a list with repeats: count it first, so you have units wanted per SKU.",
          "For each SKU, find what is on the shelf, treating a SKU that isn't in `stock` as 0.",
          "Only SKUs that need **more** than the shelf has belong in the result, with the difference as the value.",
        ],
        task: {
          checks: [
            fn("returns", "shortfall", [
              example([["SPO-11681", "HOM-22847", "SPO-11681", "ELE-24781", "SPO-11681"], { "SPO-11681": 2, "HOM-22847": 5 }], { "SPO-11681": 1, "ELE-24781": 1 }),
              example([["HOM-22847", "HOM-22847"], { "HOM-22847": 5 }], {}),
              example([["P1", "P2", "P2", "P2"], { P1: 0, P2: 1 }], { P1: 1, P2: 2 }),
              hiddenCase("an order that uses exactly the stock", [["A", "A", "B"], { A: 2, B: 1 }], {}),
              hiddenCase("a SKU the warehouse has never stocked", [["NEW-1", "NEW-1"], { OLD: 9 }], { "NEW-1": 2 }),
              hiddenCase("an empty order", [[], { A: 1 }], {}),
              hiddenCase("short SKUs reported in first-seen order", [["Z", "A", "Z", "A"], {}], { Z: 2, A: 2 }),
            ], { label: "shortfall() reports the units each SKU is short" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from collections import Counter

words = "to be or not to be".split()
counts = Counter(words)
counts.update(["be", "brave"])
print(counts["be"], counts["maybe"], len(counts))
print(counts.most_common(2))
`,
        choices: ["3 0 5\n[('be', 3), ('to', 2)]", "3 0 6\n[('be', 3), ('to', 2)]", "2 0 5\n[('to', 2), ('be', 2)]", "3 None 5\n[('be', 3), ('to', 2)]"],
        answer: 0,
        why: "`update` adds one more `be` and a new `brave`. Reading `maybe` gives 0 and does not add it, so there are 5 distinct words: to, be, or, not, brave.",
      },
      {
        id: "q2",
        prompt: "A common mistake: counting a text directly. What does this print?",
        program: src`
from collections import Counter

tags = Counter("python")
print(tags["python"], tags["p"], len(tags))
`,
        choices: ["0 1 6", "1 0 1", "1 1 6", "0 0 0"],
        answer: 0,
        why: "A text is a sequence of characters, so Counter counts the six letters. Split the text into words, or pass a list, to count whole words.",
      },
      {
        id: "q3",
        prompt: "Which job is Counter made for?",
        choices: ["Finding the five most common error messages in a log", "Looking up a customer's email from their ID", "Keeping the last ten readings", "Sorting orders by date"],
        answer: 0,
        why: "Counting values and ranking them is exactly what Counter and `most_common` do. A lookup is a plain dictionary; the last ten readings is a deque (two lessons on); sorting is `sorted`.",
      },
    ],
    review: [
      "`from collections import Counter` loads a standard-library tool; the import goes at the top.",
      "`Counter(values)` counts a list; a missing value counts as 0; `+=` and `update` add more.",
      "`most_common(n)` ranks the counts; ties keep first-seen order. Hand callers a plain dict or list.",
      "Next: defaultdict, which builds the starting value for any new key, so grouping needs no setup line.",
    ],
  },

  // ------------------------------------------------------------------ PY-L16-02 defaultdict
  {
    id: "PY-L16-02",
    version: 2,
    slug: "a-default-list",
    title: "Group without the setup line: defaultdict",
    lede: "A defaultdict builds the starting value for a key the first time the key is used, so grouping and totalling need no `if key not in …` line.",
    focus: "Use defaultdict(list), defaultdict(int) or another factory to group and total by key, and hand back a plain dict.",
    minutes: 17,
    objectives: [
      "Create a defaultdict with a factory such as `list`, `int` or `Counter`, passed without brackets",
      "Group with `groups[key].append(value)` and total with `totals[key] += amount`",
      "Know that **reading** a missing key creates it, and return `dict(groups)` to callers",
    ],
    requires: ["import-module", "counter-call", "function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-method", "string-split", "arithmetic", "comparison", "for-loop", "nested-loop", "membership", "if-statement", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "len-call", "reassignment", "logical", "dict-comp", "boolean"],
    teaches: ["defaultdict-call"],
    blocks: [
      {
        kind: "text",
        md: "Grouping in the Collection Algorithms module always had a setup line: `if key not in groups: groups[key] = []`, then the `append`. Forget it and the first new key raises KeyError.\n\n`defaultdict(list)` removes that line. When you use a key it doesn't have yet, it calls `list()` to make an empty list, stores it under the key, and carries on with your `append`. The argument is the **function that makes the starting value** (a *factory*): `list` gives `[]`, `int` gives `0`, `Counter` gives an empty counter.",
      },
      {
        kind: "example",
        title: "Repositories each person pushed to",
        code: src`
from collections import defaultdict

pushes = [
    ("maya-k", "quill-data/fast-parser"),
    ("devon-r", "tidewater/stream-sync"),
    ("maya-k", "tidewater/stream-sync"),
    ("lena-o", "quill-data/fast-parser"),
]
repos_by_user = defaultdict(list)
for login, repo in pushes:
    repos_by_user[login].append(repo)
print(repos_by_user["maya-k"])
print(dict(repos_by_user))
`,
        output: "['quill-data/fast-parser', 'tidewater/stream-sync']\n{'maya-k': ['quill-data/fast-parser', 'tidewater/stream-sync'], 'devon-r': ['tidewater/stream-sync'], 'lena-o': ['quill-data/fast-parser']}\n",
        note: "The first push by each person creates that person's list. `dict(…)` turns the result into a plain dictionary, which prints without the `defaultdict(<class 'list'>, …)` wrapper.",
      },
      {
        kind: "text",
        md: "Pass the factory itself, without brackets. `list()` is a call that has already made one empty list, and a list can't make new values:",
      },
      {
        kind: "error-example",
        title: "Calling the factory instead of passing it",
        code: src`
from collections import defaultdict

repos_by_user = defaultdict(list())
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: first argument must be callable or None`. Write `defaultdict(list)`.",
      },
      {
        kind: "text",
        md: "The factory can be any tool that makes a starting value, including the Counter from the last lesson. A `defaultdict(Counter)` keeps one counter per key: a small two-level table.",
      },
      {
        kind: "example",
        title: "Activity per repository, per event type",
        code: src`
from collections import Counter, defaultdict

def activity_by_repo(events):
    activity = defaultdict(Counter)
    for event in events:
        activity[event["repo"]][event["type"]] += 1
    return activity

events = [
    {"repo": "quill-data/fast-parser", "type": "PushEvent"},
    {"repo": "tidewater/stream-sync", "type": "WatchEvent"},
    {"repo": "quill-data/fast-parser", "type": "PushEvent"},
    {"repo": "quill-data/fast-parser", "type": "IssuesEvent"},
]
activity = activity_by_repo(events)
print(activity["quill-data/fast-parser"])
print(activity["tidewater/stream-sync"]["PushEvent"], len(activity))
`,
        output: "Counter({'PushEvent': 2, 'IssuesEvent': 1})\n0 2\n",
        note: "Two levels of missing values are handled: a new repository gets an empty Counter, and a new event type in that Counter starts at 0.",
      },
      {
        kind: "text",
        md: "**When to use it:** grouping (`defaultdict(list)`), totals that aren't simple counts, such as minutes or money (`defaultdict(int)` or `float`), and nested tables. **Mistakes to avoid:** passing `list()` instead of `list`; and checking for a key by **reading** it: `groups[\"x\"]` on a missing key creates `\"x\"` with an empty list, so test with `in` instead. A defaultdict also keeps creating keys after you return it, which surprises callers, so return `dict(groups)`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Total minutes instead of a list",
      prompt: "`delay_per_route` collects every delay into a list per route. The report needs the **total** delay minutes per route: change the factory to `int` and add each delay to the route's total instead of appending it.",
      spec: [
        ["Function", "`delay_per_route(flights)`"],
        ["Returns", "a plain `dict` of route → total arrival delay in minutes"],
      ],
      starter: src`
from collections import defaultdict

def delay_per_route(flights):
    delays = defaultdict(list)
    for flight in flights:
        delays[flight["route"]].append(flight["arrival_delay"])
    return dict(delays)

flights = [
    {"route": "LAS-IAH", "arrival_delay": 16},
    {"route": "MCI-MIA", "arrival_delay": 42},
    {"route": "LAS-IAH", "arrival_delay": -4},
]
print(delay_per_route(flights))
`,
      answer: src`
from collections import defaultdict

def delay_per_route(flights):
    delays = defaultdict(int)
    for flight in flights:
        delays[flight["route"]] += flight["arrival_delay"]
    return dict(delays)

flights = [
    {"route": "LAS-IAH", "arrival_delay": 16},
    {"route": "MCI-MIA", "arrival_delay": 42},
    {"route": "LAS-IAH", "arrival_delay": -4},
]
print(delay_per_route(flights))
`,
      wrong: [
        {
          code: src`
from collections import defaultdict

def delay_per_route(flights):
    delays = defaultdict(int)
    for flight in flights:
        delays[flight["route"]] = flight["arrival_delay"]
    return dict(delays)
`,
          fails: ["returns"],
          why: "`=` replaces the total with the latest delay instead of adding to it",
        },
      ],
      hints: ["Two things change: the factory and the line inside the loop.", "`int()` is 0, the right start for a total.", "Add the delay to the route's total with `+=`."],
      task: {
        checks: [
          fn("returns", "delay_per_route", [
            example([[{ route: "LAS-IAH", arrival_delay: 16 }, { route: "MCI-MIA", arrival_delay: 42 }, { route: "LAS-IAH", arrival_delay: -4 }]], { "LAS-IAH": 12, "MCI-MIA": 42 }),
            hiddenCase("three flights on one route", [[{ route: "PDX-SEA", arrival_delay: 5 }, { route: "PDX-SEA", arrival_delay: 0 }, { route: "PDX-SEA", arrival_delay: 7 }]], { "PDX-SEA": 12 }),
            hiddenCase("no flights", [[]], {}),
          ], { label: "delay_per_route() totals the delay of each route" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Issues under every label",
        prompt: "An issue tracker shows one column per label, and an issue can carry several labels. Write `issues_by_label(issues)`: return a plain dictionary from each label to the numbers of the issues that carry it, in the order the issues appear.",
        spec: [
          ["Function", "`issues_by_label(issues)`"],
          ["issues", "a list of dictionaries with `number` and `labels` (a list of texts, possibly empty)"],
          ["Returns", "a plain `dict` of label → list of issue numbers; labels no issue uses don't appear"],
          ["Example", "the starter's issues → `{'bug': [412, 418], 'help wanted': [412], 'documentation': [415]}`"],
        ],
        starter: src`
from collections import defaultdict

def issues_by_label(issues):
    return {}

issues = [
    {"number": 412, "labels": ["bug", "help wanted"]},
    {"number": 415, "labels": ["documentation"]},
    {"number": 418, "labels": ["bug"]},
    {"number": 420, "labels": []},
]
print(issues_by_label(issues))
`,
        answer: src`
from collections import defaultdict

def issues_by_label(issues):
    columns = defaultdict(list)
    for issue in issues:
        for label in issue["labels"]:
            columns[label].append(issue["number"])
    return dict(columns)

issues = [
    {"number": 412, "labels": ["bug", "help wanted"]},
    {"number": 415, "labels": ["documentation"]},
    {"number": 418, "labels": ["bug"]},
    {"number": 420, "labels": []},
]
print(issues_by_label(issues))
`,
        alternatives: [
          src`
def issues_by_label(issues):
    columns = {}
    for issue in issues:
        for label in issue["labels"]:
            if label not in columns:
                columns[label] = []
            columns[label].append(issue["number"])
    return columns
`,
        ],
        wrong: [
          {
            code: src`
from collections import defaultdict

def issues_by_label(issues):
    columns = defaultdict(list)
    for issue in issues:
        for label in issue["labels"]:
            columns[label].append(issue["number"])
    return columns
`,
            fails: ["returns"],
            why: "it returns the defaultdict itself instead of a plain dictionary",
          },
          {
            code: src`
from collections import defaultdict

def issues_by_label(issues):
    columns = defaultdict(list)
    for issue in issues:
        if issue["labels"]:
            columns[issue["labels"][0]].append(issue["number"])
    return dict(columns)
`,
            fails: ["returns"],
            why: "only each issue's first label gets the issue",
          },
        ],
        hints: [
          "Each issue can add itself to several groups, one per label: a loop over the labels inside the loop over issues.",
          "A `defaultdict(list)` lets you append under a label the first time you meet it.",
          "An issue with no labels simply adds nothing. Convert the result before returning it.",
        ],
        task: {
          checks: [
            fn("returns", "issues_by_label", [
              example([issues], { bug: [412, 418], "help wanted": [412], documentation: [415] }),
              example([[{ number: 7, labels: ["question"] }]], { question: [7] }),
              example([[]], {}),
              hiddenCase("issues with no labels at all", [[{ number: 1, labels: [] }, { number: 2, labels: [] }]], {}),
              hiddenCase("one label on many issues, kept in order", [[{ number: 30, labels: ["bug"] }, { number: 12, labels: ["bug"] }, { number: 21, labels: ["bug", "performance"] }]], { bug: [30, 12, 21], performance: [21] }),
              hiddenCase("an issue with three labels", [[{ number: 5, labels: ["bug", "duplicate", "wontfix"] }]], { bug: [5], duplicate: [5], wontfix: [5] }),
            ], { label: "issues_by_label() lists each issue under every label it carries" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A search index for question titles",
        prompt: "A Q&A site's search box finds questions by word. Build the index: write `word_index(questions)`, returning a plain dictionary from each word in the titles to the IDs of the questions whose title contains it. Words are compared in lower case and split on spaces, and a question is listed **once** per word, even if the word appears twice in its title.",
        spec: [
          ["Function", "`word_index(questions)`"],
          ["questions", "a list of dictionaries with `id` and `title`"],
          ["Returns", "a plain `dict` of lower-case word → list of question IDs, in question order"],
          ["Example", "titles \"Merge two DataFrames\" (101) and \"merge sorted lists\" (102) → `'merge'` maps to `[101, 102]`"],
        ],
        starter: src`
from collections import defaultdict

def word_index(questions):
    return {}

questions = [
    {"id": 101, "title": "Merge two DataFrames"},
    {"id": 102, "title": "merge sorted lists"},
    {"id": 103, "title": "Sort a list of dicts"},
]
index = word_index(questions)
print(index["merge"], index["sort"])
`,
        answer: src`
from collections import defaultdict

def word_index(questions):
    index = defaultdict(list)
    for question in questions:
        for word in question["title"].lower().split():
            if question["id"] not in index[word]:
                index[word].append(question["id"])
    return dict(index)

questions = [
    {"id": 101, "title": "Merge two DataFrames"},
    {"id": 102, "title": "merge sorted lists"},
    {"id": 103, "title": "Sort a list of dicts"},
]
index = word_index(questions)
print(index["merge"], index["sort"])
`,
        alternatives: [
          src`
from collections import defaultdict

def word_index(questions):
    index = defaultdict(list)
    for question in questions:
        words = question["title"].lower().split()
        for word in {w: True for w in words}:
            index[word].append(question["id"])
    return dict(index)
`,
        ],
        wrong: [
          {
            code: src`
from collections import defaultdict

def word_index(questions):
    index = defaultdict(list)
    for question in questions:
        for word in question["title"].split():
            if question["id"] not in index[word]:
                index[word].append(question["id"])
    return dict(index)
`,
            fails: ["returns"],
            why: "without `lower()`, `Merge` and `merge` are indexed as different words",
          },
          {
            code: src`
from collections import defaultdict

def word_index(questions):
    index = defaultdict(list)
    for question in questions:
        for word in question["title"].lower().split():
            index[word].append(question["id"])
    return dict(index)
`,
            fails: ["returns"],
            why: "a word used twice in one title lists that question twice",
          },
        ],
        hints: [
          "Clean each title the same way first: lower case, then split into words.",
          "Group the question's ID under each of its words with a `defaultdict(list)`.",
          "Before appending, check whether this question is already in that word's list.",
        ],
        task: {
          checks: [
            fn("returns", "word_index", [
              example([titles], { merge: [101, 102], two: [101], dataframes: [101], sorted: [102], lists: [102], sort: [103], a: [103], list: [103], of: [103], dicts: [103] }),
              example([[{ id: 7, title: "Parse dates" }]], { parse: [7], dates: [7] }),
              example([[]], {}),
              hiddenCase("a word used twice in one title", [[{ id: 5, title: "Merge merge conflicts" }]], { merge: [5], conflicts: [5] }),
              hiddenCase("extra spaces between words", [[{ id: 3, title: "  read   a CSV " }, { id: 4, title: "csv to JSON" }]], { read: [3], a: [3], csv: [3, 4], to: [4], json: [4] }),
              hiddenCase("the same words in different capitals", [[{ id: 1, title: "NumPy Arrays" }, { id: 2, title: "numpy arrays" }]], { numpy: [1, 2], arrays: [1, 2] }),
            ], { label: "word_index() maps every lower-case word to its question IDs once" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from collections import defaultdict

seats = defaultdict(int)
for cabin in ["economy", "business", "economy"]:
    seats[cabin] += 1
print(seats["economy"], seats["first"])
print(len(seats))
`,
        choices: ["2 0\n3", "2 0\n2", "2 None\n2", "KeyError"],
        answer: 0,
        why: "Reading `seats[\"first\"]` doesn't fail: the defaultdict creates `first` with `int()`, which is 0, and **stores** it. That is why `len` is 3, not 2.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the factory is called. What does this print before the program stops?",
        program: src`
from collections import defaultdict

print("grouping")
groups = defaultdict(list())
groups["sale"].append("Deluxe Vase")
print(dict(groups))
`,
        choices: ["grouping", "grouping\n{'sale': ['Deluxe Vase']}", "{'sale': ['Deluxe Vase']}", "(nothing)"],
        answer: 0,
        why: "`list()` makes one empty list, and a list can't be called to make new values, so the defaultdict line raises TypeError right after `grouping` is printed.",
      },
      {
        id: "q3",
        prompt: "Which job is `defaultdict(list)` the right tool for?",
        choices: ["Collecting every order ID under its customer", "Counting how many times each word appears", "Keeping only the last five events", "Checking whether a key exists without changing the dictionary"],
        answer: 0,
        why: "Appending values under a key is grouping. Counting is Counter's job; a fixed window is a deque; and reading a missing key from a defaultdict **adds** it, so use `in` to check.",
      },
    ],
    review: [
      "`defaultdict(factory)` calls the factory (`list`, `int`, `Counter`…) the first time a key is used.",
      "Pass the factory without brackets; group with `.append`, total with `+=`.",
      "Reading a missing key creates it: test with `in`, and return `dict(…)` to callers.",
      "Next: deque, a list built for taking items off the front, and for keeping only the newest few.",
    ],
  },

  // ------------------------------------------------------------------ PY-L16-03 deque
  {
    id: "PY-L16-03",
    version: 2,
    slug: "a-line-of-items",
    title: "Queues and recent windows: deque",
    lede: "A deque is a list built for both ends: add on the right and take from the left for a fair queue, and give it a `maxlen` to keep only the newest few items.",
    focus: "Use deque for first-in-first-out queues (append and popleft) and fixed-size windows of recent items (maxlen).",
    minutes: 17,
    objectives: [
      "Run a first-in-first-out queue with `append` and `popleft`",
      "Explain why `list.pop(0)` gets slow on long lists and `popleft` does not",
      "Keep only the newest `n` items with `deque(maxlen=n)`",
    ],
    requires: ["import-module", "function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "string-index", "aggregate-call", "len-call", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "while-loop", "truthiness", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "nested-loop", "range-call"],
    teaches: ["deque-call"],
    blocks: [
      {
        kind: "text",
        md: "A support desk handles tickets in the order they arrive: new ones join the back, the agent takes the oldest from the front. That is a **queue**, first in, first out.\n\nA list can do it with `append` and `pop(0)`, but `pop(0)` has a hidden cost: every item behind the first one moves one place forward, so with a hundred thousand waiting tickets each `pop(0)` shifts a hundred thousand items. `deque` (from `collections`, said *deck*, short for *double-ended queue*) is built so that adding and removing at **either** end takes the same tiny time however long it is: `append` and `popleft`, and also `appendleft` and `pop`.",
      },
      {
        kind: "example",
        title: "A support queue",
        code: src`
from collections import deque

queue = deque(["T-101", "T-102"])
queue.append("T-103")
first = queue.popleft()
print("handling", first)
queue.appendleft("T-099")
print(queue)
print(len(queue), queue[0])
`,
        output: "handling T-101\ndeque(['T-099', 'T-102', 'T-103'])\n3 T-099\n",
        note: "`popleft` takes the oldest ticket. `appendleft` lets an urgent ticket jump to the front. `len` and `[0]` work as on a list.",
      },
      {
        kind: "text",
        md: "Taking from an empty queue is an error, so a loop that drains a queue checks it first: `while queue:` stops when it is empty.",
      },
      {
        kind: "error-example",
        title: "Taking from an empty queue",
        code: src`
from collections import deque

queue = deque(["T-101"])
print(queue.popleft())
print(queue.popleft())
`,
        error: "IndexError",
        output: "T-101\n",
        note: "`IndexError: pop from an empty deque`.",
      },
      {
        kind: "text",
        md: "The second job a deque does well is a **window**: keep only the newest few items. With `maxlen`, appending to a full deque silently drops the item at the other end. A rolling average of page-load times needs exactly that.",
      },
      {
        kind: "example",
        title: "A rolling average of load times",
        code: src`
from collections import deque

def rolling_average(times, window):
    recent = deque(maxlen=window)
    averages = []
    for ms in times:
        recent.append(ms)
        averages.append(sum(recent) / len(recent))
    return averages

print(rolling_average([210, 190, 260, 240], 2))
`,
        output: "[210.0, 200.0, 225.0, 250.0]\n",
        note: "When 260 arrives, 210 falls out of the window, so the average is (190 + 260) / 2. Early on the window isn't full yet, which is why it divides by `len(recent)`, not by `window`.",
      },
      {
        kind: "text",
        md: "**When to use it:** queues of work (tickets, print jobs, pages to visit), and \"the last N\" (recent searches, a rolling average, undo history). **Mistakes to avoid:** `pop()` takes from the **right**, so using it instead of `popleft()` serves the newest item first; reading items in the middle of a long deque is slower than in a list, so a deque is not a general list replacement; and popping from an empty deque raises IndexError.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the last few",
      prompt: "`recent_pages` should keep only the newest `n` pages a visitor opened, but its deque has no limit, so it returns them all. Give the deque a `maxlen` of `n`.",
      spec: [
        ["Function", "`recent_pages(pages, n)`"],
        ["Returns", "a list of the last `n` pages, oldest of them first"],
      ],
      starter: src`
from collections import deque

def recent_pages(pages, n):
    recent = deque()
    for page in pages:
        recent.append(page)
    return list(recent)

print(recent_pages(["home", "search", "product", "cart", "checkout"], 3))
`,
      answer: src`
from collections import deque

def recent_pages(pages, n):
    recent = deque(maxlen=n)
    for page in pages:
        recent.append(page)
    return list(recent)

print(recent_pages(["home", "search", "product", "cart", "checkout"], 3))
`,
      wrong: [
        {
          code: src`
from collections import deque

def recent_pages(pages, n):
    recent = deque(maxlen=n)
    for page in pages:
        recent.appendleft(page)
    return list(recent)
`,
          fails: ["returns"],
          why: "`appendleft` keeps the newest pages but in reverse order",
        },
      ],
      hints: ["Only the line that creates the deque changes.", "`deque` accepts a named setting for its largest size.", "Write `maxlen=` with the number of pages to keep."],
      task: {
        checks: [
          fn("returns", "recent_pages", [
            example([["home", "search", "product", "cart", "checkout"], 3], ["product", "cart", "checkout"]),
            hiddenCase("fewer pages than the limit", [["home", "help"], 5], ["home", "help"]),
            hiddenCase("no pages", [[], 2], []),
          ], { label: "recent_pages() keeps only the newest pages" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The busiest few seconds",
        prompt: "An API allows a burst of requests, and the team wants to know the worst burst in a log. Write `busiest_window(times, window)`: `times` are request times in seconds, in order. Return the largest number of requests that fall inside any stretch of `window` seconds, where a request at time `t` shares a stretch with the earlier requests made **less than** `window` seconds before it.",
        spec: [
          ["Function", "`busiest_window(times, window)`"],
          ["times", "a list of whole-number times in seconds, smallest first (repeats allowed)"],
          ["Returns", "a whole number; 0 for no requests"],
          ["Example", "`busiest_window([0, 2, 3, 10, 11, 12, 13], 5)` → `4` (10, 11, 12 and 13)"],
        ],
        starter: src`
from collections import deque

def busiest_window(times, window):
    return 0

print(busiest_window([0, 2, 3, 10, 11, 12, 13], 5))
print(busiest_window([0, 2, 3, 10, 11, 12, 13], 3))
`,
        answer: src`
from collections import deque

def busiest_window(times, window):
    recent = deque()
    best = 0
    for t in times:
        recent.append(t)
        while t - recent[0] >= window:
            recent.popleft()
        if len(recent) > best:
            best = len(recent)
    return best

print(busiest_window([0, 2, 3, 10, 11, 12, 13], 5))
print(busiest_window([0, 2, 3, 10, 11, 12, 13], 3))
`,
        alternatives: [
          src`
def busiest_window(times, window):
    best = 0
    start = 0
    for end in range(len(times)):
        while times[end] - times[start] >= window:
            start += 1
        best = max(best, end - start + 1)
    return best
`,
        ],
        wrong: [
          {
            code: src`
from collections import deque

def busiest_window(times, window):
    recent = deque()
    best = 0
    for t in times:
        recent.append(t)
        if len(recent) > best:
            best = len(recent)
        while t - recent[0] >= window:
            recent.popleft()
    return best
`,
            fails: ["returns"],
            why: "the size is measured before the old requests are dropped, so requests from outside the window are counted",
          },
          {
            code: src`
from collections import deque

def busiest_window(times, window):
    recent = deque()
    best = 0
    for t in times:
        recent.append(t)
        while t - recent[0] > window:
            recent.popleft()
        if len(recent) > best:
            best = len(recent)
    return best
`,
            fails: ["returns"],
            why: "a request exactly `window` seconds earlier is still counted",
          },
        ],
        hints: [
          "Walk the times in order and keep a deque of the requests in the current stretch.",
          "When a new request arrives, drop requests from the **front** while they are `window` seconds or more older than it. More than one may need to go.",
          "After dropping, the deque's length is the size of this stretch: keep the largest you see.",
        ],
        task: {
          checks: [
            fn("returns", "busiest_window", [
              example([[0, 2, 3, 10, 11, 12, 13], 5], 4),
              example([[0, 2, 3, 10, 11, 12, 13], 3], 3),
              example([[], 10], 0),
              hiddenCase("requests exactly a window apart", [[0, 5, 10], 5], 1),
              hiddenCase("a long gap after a burst", [[1, 1, 2, 2, 100, 104], 10], 4),
              hiddenCase("many requests in the same second", [[7, 7, 7, 7, 7], 1], 5),
              hiddenCase("a single request", [[42], 60], 1),
            ], { label: "busiest_window() finds the largest burst" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Take turns until every job is done",
        prompt: "A small job runner shares its time fairly: the job at the front of the queue works for up to `slice_size` units, and if it still has work left it goes to the **back** of the queue. Write `finish_order(jobs, slice_size)`: return the job names in the order they finish. Don't change the list you are given.",
        spec: [
          ["Function", "`finish_order(jobs, slice_size)`"],
          ["jobs", "a list of `[name, units]` pairs, in arrival order; units are whole numbers, 0 or more"],
          ["Returns", "a list of names in finishing order; a job finishes on the turn its remaining units reach 0 or less"],
          ["Example", "`finish_order([[\"backup\", 5], [\"email\", 2], [\"report\", 3]], 2)` → `['email', 'report', 'backup']`"],
        ],
        starter: src`
from collections import deque

def finish_order(jobs, slice_size):
    return []

jobs = [["backup", 5], ["email", 2], ["report", 3]]
print(finish_order(jobs, 2))
print(jobs)
`,
        answer: src`
from collections import deque

def finish_order(jobs, slice_size):
    queue = deque()
    for name, units in jobs:
        queue.append((name, units))
    finished = []
    while queue:
        name, left = queue.popleft()
        left -= slice_size
        if left > 0:
            queue.append((name, left))
        else:
            finished.append(name)
    return finished

jobs = [["backup", 5], ["email", 2], ["report", 3]]
print(finish_order(jobs, 2))
print(jobs)
`,
        alternatives: [
          src`
from collections import deque

def finish_order(jobs, slice_size):
    queue = deque([[name, units] for name, units in jobs])
    finished = []
    while queue:
        job = queue.popleft()
        job[1] = job[1] - slice_size
        if job[1] <= 0:
            finished.append(job[0])
        else:
            queue.append(job)
    return finished
`,
        ],
        wrong: [
          {
            code: src`
from collections import deque

def finish_order(jobs, slice_size):
    queue = deque()
    for name, units in jobs:
        queue.append((name, units))
    finished = []
    while queue:
        name, left = queue.pop()
        left -= slice_size
        if left > 0:
            queue.append((name, left))
        else:
            finished.append(name)
    return finished
`,
            fails: ["returns"],
            why: "`pop()` takes from the back, so the job that just ran runs again instead of the next in line",
          },
          {
            code: src`
from collections import deque

def finish_order(jobs, slice_size):
    queue = deque(jobs)
    finished = []
    while queue:
        job = queue.popleft()
        job[1] -= slice_size
        if job[1] > 0:
            queue.append(job)
        else:
            finished.append(job[0])
    return finished
`,
            fails: ["keeps-input"],
            why: "the caller's `[name, units]` lists are the ones being counted down, so the input is changed",
          },
          {
            code: src`
from collections import deque

def finish_order(jobs, slice_size):
    queue = deque()
    for name, units in jobs:
        queue.append((name, units))
    finished = []
    while queue:
        name, left = queue.popleft()
        left -= slice_size
        if left >= 0:
            queue.append((name, left))
        else:
            finished.append(name)
    return finished
`,
            fails: ["returns"],
            why: "a job that uses up exactly its last units goes round again instead of finishing",
          },
        ],
        hints: [
          "Copy each job into the deque as a new pair, so the caller's lists are never changed.",
          "Repeat while the queue isn't empty: take from the front, subtract one slice, then decide.",
          "Work left over sends the job to the back; otherwise it is finished.",
        ],
        task: {
          checks: [
            fn("returns", "finish_order", [
              example([[["backup", 5], ["email", 2], ["report", 3]], 2], ["email", "report", "backup"]),
              example([[["a", 1], ["b", 1]], 10], ["a", "b"]),
              example([[], 3], []),
              hiddenCase("a job with no work", [[["idle", 0], ["sync", 4]], 3], ["idle", "sync"]),
              hiddenCase("a job that ends exactly on a slice", [[["x", 2], ["y", 1], ["z", 5]], 2], ["x", "y", "z"]),
              hiddenCase("a single long job", [[["export", 9]], 2], ["export"]),
              hiddenCase("later jobs overtaking a long one", [[["big", 9], ["s1", 1], ["s2", 2], ["s3", 3]], 3], ["s1", "s2", "s3", "big"]),
            ], { label: "finish_order() serves jobs in turns" }),
            fn("keeps-input", "finish_order", [
              keepsInput([[["backup", 5], ["email", 2]], 2]),
              keepsInput([[["a", 3], ["b", 7], ["c", 1]], 2], { label: "a longer queue" }),
            ], { label: "finish_order() leaves the jobs list unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from collections import deque

recent = deque(maxlen=3)
for page in ["home", "search", "product", "cart", "checkout"]:
    recent.append(page)
print(list(recent))
recent.appendleft("home")
print(list(recent))
`,
        choices: ["['product', 'cart', 'checkout']\n['home', 'product', 'cart']", "['product', 'cart', 'checkout']\n['home', 'cart', 'checkout']", "['home', 'search', 'product']\n['home', 'home', 'search']", "['product', 'cart', 'checkout']\n['home', 'product', 'cart', 'checkout']"],
        answer: 0,
        why: "Appending on the right pushes the oldest pages out on the left. `appendleft` on a full deque does the opposite: it adds on the left and drops `checkout` from the right.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `pop` instead of `popleft`. What does this print?",
        program: src`
from collections import deque

line = deque(["Ana", "Ben", "Chen"])
print(line.pop(), line.popleft())
`,
        choices: ["Chen Ana", "Ana Chen", "Ana Ben", "Chen Ben"],
        answer: 0,
        why: "`pop()` takes from the right end, the newest arrival. For a fair queue, take from the left with `popleft()`.",
      },
      {
        id: "q3",
        prompt: "Which job is a deque the right tool for?",
        choices: ["Keeping the last 20 sensor readings for a rolling average", "Counting how many readings each sensor sent", "Looking up a sensor by its ID", "Sorting readings by time"],
        answer: 0,
        why: "`deque(maxlen=20)` keeps exactly the newest 20 readings. Counting is Counter, lookup is a dictionary, and ordering is `sorted`.",
      },
    ],
    review: [
      "`deque` adds and removes quickly at both ends: `append` + `popleft` is a fair queue.",
      "`list.pop(0)` shifts every remaining item; `popleft` doesn't.",
      "`deque(maxlen=n)` keeps the newest `n` items, dropping from the other end.",
      "Next: itertools.groupby, which walks runs of equal neighbours in ordered data.",
    ],
  },

  // ------------------------------------------------------------------ PY-L16-04 groupby
  {
    id: "PY-L16-04",
    version: 2,
    slug: "group-neighbors",
    title: "Runs of equal neighbours: groupby",
    lede: "`itertools.groupby` walks a sequence and hands you each run of neighbouring items that share a key. It finds streaks in time-ordered data, and groups a whole list once the list is sorted by the same key.",
    focus: "Use itertools.groupby to process runs of neighbouring items with the same key, sorting first when the whole list must be grouped.",
    minutes: 18,
    objectives: [
      "Loop over `groupby(items, key=…)` as `(key, run)` pairs and turn a run into a list before measuring it",
      "Sort by the same key first when every item with that key must land in one group",
      "Recognise that a run is used up once groupby moves on",
    ],
    requires: ["import-module", "lambda", "sort-key", "list-sort", "function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "list-comp", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "dict-iterate", "string-index", "aggregate-call", "len-call", "arithmetic", "comparison", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "print-text", "logical", "else-clause", "defaultdict-call"],
    teaches: ["groupby-call"],
    blocks: [
      {
        kind: "text",
        md: "A health check pings a server every minute and logs `up` or `down`. The useful summary isn't *how many downs in total* but *when did it go down, and for how long*: the **runs** of equal values next to each other.\n\n`from itertools import groupby` gives a tool for exactly that. `groupby(items)` yields one `(key, run)` pair per run of equal neighbours. `run` is not a list but an *iterator*: a one-pass stream of that run's items, which you can loop over once or turn into a list with `list(run)`.",
      },
      {
        kind: "example",
        title: "Up and down periods",
        code: src`
from itertools import groupby

checks = ["up", "up", "down", "down", "down", "up", "up", "up"]
for status, run in groupby(checks):
    print(status, len(list(run)))
`,
        output: "up 2\ndown 3\nup 3\n",
        note: "`up` appears twice because there are two separate up periods. groupby only joins items that are **next to each other**.",
      },
      {
        kind: "error-example",
        title: "Measuring a run directly",
        code: src`
from itertools import groupby

for status, run in groupby(["up", "up", "down"]):
    print(status, len(run))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: object of type 'itertools._grouper' has no len()`. A run is a stream, not a list: `len(list(run))`.",
      },
      {
        kind: "text",
        md: "To group a **whole** list by a key, sort it by that key first, so equal keys sit next to each other, then group with the **same** key function. `key=` works as it does for `sorted`: groupby compares what the key returns, not the items themselves.",
      },
      {
        kind: "example",
        title: "Order totals per day",
        code: src`
from itertools import groupby

def daily_totals(orders):
    ordered = sorted(orders, key=lambda o: o["date"])
    totals = []
    for date, day_orders in groupby(ordered, key=lambda o: o["date"]):
        totals.append((date, sum(o["total"] for o in day_orders)))
    return totals

orders = [
    {"date": "2025-03-04", "total": 35.5},
    {"date": "2025-03-03", "total": 20.25},
    {"date": "2025-03-04", "total": 14.5},
    {"date": "2025-03-03", "total": 9.75},
    {"date": "2025-03-05", "total": 60.0},
]
print(daily_totals(orders))
`,
        output: "[('2025-03-03', 30.0), ('2025-03-04', 50.0), ('2025-03-05', 60.0)]\n",
        note: "Without the `sorted` line, 2025-03-04 would appear twice, because its orders are not next to each other in the input.",
      },
      {
        kind: "text",
        md: "**When to use it:** streaks and periods in ordered data (uptime, consecutive hot days, repeated log lines), and per-key summaries of data that is sorted anyway. For grouping unsorted data in one pass, the `defaultdict(list)` from two lessons ago is simpler. **Mistakes to avoid:** forgetting to sort (the same key shows up in several groups); sorting by one key and grouping by another; and keeping a `run` to read later: once groupby moves to the next run, the old one is used up. Turn it into a list inside the loop if you need it again.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Sort before grouping",
      prompt: "`count_by_language` should give each language once with its number of repositories, A to Z. It groups the list as it arrives, so a language appears several times. Sort the languages first.",
      spec: [
        ["Function", "`count_by_language(languages)`"],
        ["Returns", "`(language, count)` pairs, one per language, A–Z"],
      ],
      starter: src`
from itertools import groupby

def count_by_language(languages):
    counts = []
    for language, run in groupby(languages):
        counts.append((language, len(list(run))))
    return counts

print(count_by_language(["Python", "Rust", "Python", "Go", "Rust", "Python"]))
`,
      answer: src`
from itertools import groupby

def count_by_language(languages):
    counts = []
    for language, run in groupby(sorted(languages)):
        counts.append((language, len(list(run))))
    return counts

print(count_by_language(["Python", "Rust", "Python", "Go", "Rust", "Python"]))
`,
      wrong: [
        {
          code: src`
from itertools import groupby

def count_by_language(languages):
    counts = []
    for language, run in groupby(sorted(languages)):
        counts.append((language, len(run)))
    return counts
`,
          fails: ["returns"],
          why: "`len(run)` fails: a run is a stream, not a list",
        },
      ],
      hints: ["Equal languages must be next to each other before groupby sees them.", "`sorted` gives a new list in A–Z order.", "Pass the sorted list to groupby instead of the original."],
      task: {
        checks: [
          fn("returns", "count_by_language", [
            example([["Python", "Rust", "Python", "Go", "Rust", "Python"]], [tup("Go", 1), tup("Python", 3), tup("Rust", 2)]),
            hiddenCase("one language", [["Java", "Java"]], [tup("Java", 2)]),
            hiddenCase("no repositories", [[]], []),
          ], { label: "count_by_language() gives each language once, A–Z" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The longest hot streak",
        prompt: "A heat-wave alert needs the longest run of **consecutive** days whose high temperature was above a threshold. Write `longest_streak(highs, threshold)` using groupby.",
        spec: [
          ["Function", "`longest_streak(highs, threshold)`"],
          ["highs", "daily high temperatures in day order"],
          ["Returns", "the length of the longest run of days strictly above `threshold`; 0 if there is none"],
          ["Example", "`longest_streak([28.1, 31.4, 32.0, 29.5, 33.2, 34.0, 35.1, 29.0], 30)` → `3`"],
        ],
        starter: src`
from itertools import groupby

def longest_streak(highs, threshold):
    return 0

print(longest_streak([28.1, 31.4, 32.0, 29.5, 33.2, 34.0, 35.1, 29.0], 30))
`,
        answer: src`
from itertools import groupby

def longest_streak(highs, threshold):
    best = 0
    for hot, run in groupby(highs, key=lambda t: t > threshold):
        length = len(list(run))
        if hot and length > best:
            best = length
    return best

print(longest_streak([28.1, 31.4, 32.0, 29.5, 33.2, 34.0, 35.1, 29.0], 30))
`,
        alternatives: [
          src`
def longest_streak(highs, threshold):
    best = 0
    current = 0
    for t in highs:
        if t > threshold:
            current += 1
            best = max(best, current)
        else:
            current = 0
    return best
`,
        ],
        wrong: [
          {
            code: src`
from itertools import groupby

def longest_streak(highs, threshold):
    return len([t for t in highs if t > threshold])
`,
            fails: ["returns"],
            why: "it counts every hot day, not the longest run of consecutive ones",
          },
          {
            code: src`
from itertools import groupby

def longest_streak(highs, threshold):
    best = 0
    for hot, run in groupby(highs, key=lambda t: t > threshold):
        length = len(list(run))
        if length > best:
            best = length
    return best
`,
            fails: ["returns"],
            why: "cool runs are measured too, so a long cool spell wins",
          },
          {
            code: src`
from itertools import groupby

def longest_streak(highs, threshold):
    best = 0
    for hot, run in groupby(highs, key=lambda t: t >= threshold):
        length = len(list(run))
        if hot and length > best:
            best = length
    return best
`,
            fails: ["returns"],
            why: "`>=` counts a day exactly at the threshold as hot",
          },
        ],
        hints: [
          "Group the days by whether they are hot: the key is a True/False test on each temperature.",
          "Each run comes with its key, so you know whether it is a hot run or a cool one.",
          "Measure only the hot runs, and keep the longest. With no hot run, the answer stays 0.",
        ],
        task: {
          checks: [
            fn("returns", "longest_streak", [
              example([highs, 30], 3),
              example([highs, 33], 3),
              example([[], 25], 0),
              hiddenCase("no day above the threshold", [[12.5, 14.0, 9.8], 20], 0),
              hiddenCase("every day above the threshold", [[21, 22, 23, 24], 20], 4),
              hiddenCase("days exactly at the threshold", [[30, 31, 30, 31, 32], 30], 2),
              hiddenCase("a long cool spell and a short hot one", [[5, 6, 4, 5, 7, 6, 25, 26], 20], 2),
            ], { label: "longest_streak() finds the longest run of hot days" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Commits per person per day",
        prompt: "A team dashboard shows how many commits each person pushed on each day. A push event records the author, the date and how many commits it carried, and one person may push several times a day. Write `daily_commits(pushes)` with sorted and groupby: return one `(author, date, commits)` tuple per author and day, ordered by author A–Z and then by date.",
        spec: [
          ["Function", "`daily_commits(pushes)`"],
          ["pushes", "a list of dictionaries with `author`, `date` (`YYYY-MM-DD`) and `commits`, in any order"],
          ["Returns", "a list of `(author, date, total_commits)` tuples, by author then date"],
          ["Example", "the starter's pushes → `[('devon-r', '2025-03-04', 1), ('maya-k', '2025-03-03', 2), ('maya-k', '2025-03-04', 4)]`"],
        ],
        starter: src`
from itertools import groupby

def daily_commits(pushes):
    return []

pushes = [
    {"author": "maya-k", "date": "2025-03-04", "commits": 3},
    {"author": "devon-r", "date": "2025-03-04", "commits": 1},
    {"author": "maya-k", "date": "2025-03-03", "commits": 2},
    {"author": "maya-k", "date": "2025-03-04", "commits": 1},
]
for row in daily_commits(pushes):
    print(row)
`,
        answer: src`
from itertools import groupby

def author_day(push):
    return (push["author"], push["date"])

def daily_commits(pushes):
    rows = []
    for key, group in groupby(sorted(pushes, key=author_day), key=author_day):
        author, date = key
        rows.append((author, date, sum(push["commits"] for push in group)))
    return rows

pushes = [
    {"author": "maya-k", "date": "2025-03-04", "commits": 3},
    {"author": "devon-r", "date": "2025-03-04", "commits": 1},
    {"author": "maya-k", "date": "2025-03-03", "commits": 2},
    {"author": "maya-k", "date": "2025-03-04", "commits": 1},
]
for row in daily_commits(pushes):
    print(row)
`,
        alternatives: [
          src`
from collections import defaultdict

def daily_commits(pushes):
    totals = defaultdict(int)
    for push in pushes:
        totals[(push["author"], push["date"])] += push["commits"]
    return [(author, date, commits) for (author, date), commits in sorted(totals.items())]
`,
        ],
        wrong: [
          {
            code: src`
from itertools import groupby

def author_day(push):
    return (push["author"], push["date"])

def daily_commits(pushes):
    rows = []
    for (author, date), group in groupby(pushes, key=author_day):
        rows.append((author, date, sum(push["commits"] for push in group)))
    return rows
`,
            fails: ["returns"],
            why: "without sorting, pushes from the same author and day that aren't next to each other become separate rows",
          },
          {
            code: src`
from itertools import groupby

def author_day(push):
    return (push["author"], push["date"])

def daily_commits(pushes):
    rows = []
    for (author, date), group in groupby(sorted(pushes, key=lambda p: p["author"]), key=author_day):
        rows.append((author, date, sum(push["commits"] for push in group)))
    return rows
`,
            fails: ["returns"],
            why: "sorted by author only, so one author's days are still mixed up and split into several runs",
          },
          {
            code: src`
from itertools import groupby

def author_day(push):
    return (push["author"], push["date"])

def daily_commits(pushes):
    rows = []
    for (author, date), group in groupby(sorted(pushes, key=author_day), key=author_day):
        rows.append((author, date, len(list(group))))
    return rows
`,
            fails: ["returns"],
            why: "it counts pushes, not the commits they carried",
          },
        ],
        hints: [
          "The key is a pair: the author and the date. Write it once as a small function and use it for both `sorted` and `groupby`.",
          "Tuples sort by their first item, then their second, which is exactly author A–Z, then date.",
          "Each group holds one author's pushes for one day: add up their commits.",
        ],
        task: {
          checks: [
            fn("returns", "daily_commits", [
              example([pushes], [tup("devon-r", "2025-03-04", 1), tup("maya-k", "2025-03-03", 2), tup("maya-k", "2025-03-04", 4)]),
              example([[{ author: "lena-o", date: "2025-03-10", commits: 6 }]], [tup("lena-o", "2025-03-10", 6)]),
              example([[]], []),
              hiddenCase("one person's pushes on the same day spread through the list", [[{ author: "a", date: "2025-03-01", commits: 1 }, { author: "b", date: "2025-03-01", commits: 1 }, { author: "a", date: "2025-03-01", commits: 2 }, { author: "a", date: "2025-03-02", commits: 4 }]], [tup("a", "2025-03-01", 3), tup("a", "2025-03-02", 4), tup("b", "2025-03-01", 1)]),
              hiddenCase("dates given newest first", [[{ author: "z", date: "2025-03-09", commits: 1 }, { author: "z", date: "2025-03-02", commits: 5 }]], [tup("z", "2025-03-02", 5), tup("z", "2025-03-09", 1)]),
              hiddenCase("a push with zero commits", [[{ author: "q", date: "2025-03-05", commits: 0 }]], [tup("q", "2025-03-05", 0)]),
            ], { label: "daily_commits() totals commits per author and day" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from itertools import groupby

cities = ["Boston", "Boston", "Atlanta", "Boston"]
print([city for city, run in groupby(cities)])
print([city for city, run in groupby(sorted(cities))])
`,
        choices: ["['Boston', 'Atlanta', 'Boston']\n['Atlanta', 'Boston']", "['Boston', 'Atlanta']\n['Atlanta', 'Boston']", "['Boston', 'Boston', 'Atlanta', 'Boston']\n['Atlanta', 'Boston']", "['Atlanta', 'Boston']\n['Atlanta', 'Boston']"],
        answer: 0,
        why: "Unsorted, the last Boston isn't next to the first two, so it starts a new run. Sorted, all three Bostons sit together.",
      },
      {
        id: "q2",
        prompt: "A common mistake: keeping runs to read later. What does this print?",
        program: src`
from itertools import groupby

runs = {}
for status, run in groupby(["up", "up", "down"]):
    runs[status] = run
print([len(list(r)) for r in runs.values()])
`,
        choices: ["[0, 0]", "[2, 1]", "[2, 0]", "[1, 1]"],
        answer: 0,
        why: "Each run reads from the same underlying stream. When groupby moves on to the next run, the previous one is used up, so by the time they are read both are empty. Use `list(run)` inside the loop.",
      },
      {
        id: "q3",
        prompt: "Which job suits groupby best?",
        choices: ["Finding streaks of failed logins in a time-ordered log", "Counting words in an unsorted list", "Looking up a user's email", "Keeping the last ten events"],
        answer: 0,
        why: "Streaks are runs of equal neighbours, which is what groupby yields. Counting unsorted words is Counter's job.",
      },
    ],
    review: [
      "`groupby(items, key=…)` yields `(key, run)` for each run of neighbours with the same key.",
      "A run is a one-pass stream: `list(run)` to measure or keep it, inside the loop.",
      "To group a whole list, sort it by the same key first.",
      "Next: itertools.combinations, every pair (or trio) from a list, each once.",
    ],
  },

  // ------------------------------------------------------------------ PY-L16-05 combinations
  {
    id: "PY-L16-05",
    version: 2,
    slug: "pairs-of-items",
    title: "Every pair, once: combinations",
    lede: "`itertools.combinations(items, 2)` gives every pair from a list exactly once, never an item with itself and never the same pair twice. It replaces a nested loop that is easy to get wrong.",
    focus: "Use itertools.combinations to visit every pair (or group of r items) once, and apply a test or a count to each.",
    minutes: 17,
    objectives: [
      "Produce every pair, or every group of `r` items, with `combinations(items, r)`",
      "Know how many there are, n × (n − 1) / 2 pairs, and that the number grows fast",
      "Sort items first when the same pair can arrive in either order",
    ],
    requires: ["import-module", "counter-call", "function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-method", "string-check", "list-sort", "len-call", "arithmetic", "comparison", "logical", "if-statement", "for-loop", "nested-loop", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "range-call", "truthiness", "boolean"],
    teaches: ["combinations-call"],
    blocks: [
      {
        kind: "text",
        md: "A league where every team plays every other team once; a check that no two meetings overlap; finding which tags are asked about **together**: each needs every pair from one list.\n\nWith loops you would write a loop inside a loop and make sure the inner one starts after the outer item, or you get an item paired with itself and every pair twice. `from itertools import combinations` does it for you: `combinations(items, 2)` yields each pair as a tuple, in the order of the list, each pair once. `combinations(items, 3)` gives every group of three. For `n` items there are n × (n − 1) / 2 pairs: 6 for 4 teams, but 499,500 for 1,000 items.",
      },
      {
        kind: "example",
        title: "Fixtures for a four-team league",
        code: src`
from itertools import combinations

teams = ["Harbor FC", "Rovers", "City", "Athletic"]
fixtures = list(combinations(teams, 2))
print(len(fixtures))
for home, away in fixtures:
    print(home, "v", away)
`,
        output: "6\nHarbor FC v Rovers\nHarbor FC v City\nHarbor FC v Athletic\nRovers v City\nRovers v Athletic\nCity v Athletic\n",
        note: "Each team meets the others exactly once, and no team plays itself. Like groupby, combinations hands out its results one at a time; `list(…)` collects them so they can be counted and reused.",
      },
      {
        kind: "error-example",
        title: "Forgetting the group size",
        code: src`
from itertools import combinations

teams = ["Harbor FC", "Rovers", "City"]
print(list(combinations(teams)))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: combinations() missing required argument 'r' (pos 2)`. Say how many items go in each group.",
      },
      {
        kind: "text",
        md: "Pairs combine well with Counter. To find the tags most often asked about together, count every pair of tags on every question. A question tagged `pandas, python` and another tagged `python, pandas` are about the same pair, so sort each tag list first: then the pair always comes out in the same order.",
      },
      {
        kind: "example",
        title: "Tags asked about together",
        code: src`
from collections import Counter
from itertools import combinations

def tag_pairs(questions, n):
    pairs = Counter()
    for question in questions:
        for pair in combinations(sorted(question["tags"]), 2):
            pairs[pair] += 1
    return pairs.most_common(n)

questions = [
    {"tags": ["python", "pandas"]},
    {"tags": ["pandas", "python", "datetime"]},
    {"tags": ["python", "datetime"]},
    {"tags": ["python", "list"]},
]
print(tag_pairs(questions, 2))
`,
        output: "[(('pandas', 'python'), 2), (('datetime', 'python'), 2)]\n",
        note: "A question with three tags gives three pairs. A question with one tag gives none, because there is no pair to make.",
      },
      {
        kind: "text",
        md: "**When to use it:** round-robin schedules, comparing every record with every other (overlaps, possible duplicates, distances), and co-occurrence counts. **Mistakes to avoid:** forgetting `r`; counting the same pair twice because the items arrived in different orders (sort first); and running it over a huge list without thinking: 10,000 records make almost 50 million pairs. When a shared key can find the matches (same email), grouping by that key is far faster; pairs are for tests that compare two records.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Review partners",
      prompt: "`review_pairs` is meant to list every pair of developers who could review each other's code, but it builds groups of **three**. Make it build pairs.",
      spec: [
        ["Function", "`review_pairs(developers)`"],
        ["Returns", "a list of every pair of developers as tuples, in list order"],
      ],
      starter: src`
from itertools import combinations

def review_pairs(developers):
    return list(combinations(developers, 3))

print(review_pairs(["maya-k", "devon-r", "lena-o"]))
`,
      answer: src`
from itertools import combinations

def review_pairs(developers):
    return list(combinations(developers, 2))

print(review_pairs(["maya-k", "devon-r", "lena-o"]))
`,
      wrong: [
        {
          code: src`
def review_pairs(developers):
    pairs = []
    for a in developers:
        for b in developers:
            pairs.append((a, b))
    return pairs
`,
          fails: ["returns"],
          why: "two full loops pair each developer with themselves and list every pair twice",
        },
      ],
      hints: ["Only the group size needs to change.", "A pair is a group of two.", "Change the second argument of `combinations`."],
      task: {
        checks: [
          fn("returns", "review_pairs", [
            example([["maya-k", "devon-r", "lena-o"]], [tup("maya-k", "devon-r"), tup("maya-k", "lena-o"), tup("devon-r", "lena-o")]),
            hiddenCase("four developers", [["a", "b", "c", "d"]], [tup("a", "b"), tup("a", "c"), tup("a", "d"), tup("b", "c"), tup("b", "d"), tup("c", "d")]),
            hiddenCase("one developer", [["solo"]], []),
          ], { label: "review_pairs() lists every pair once" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Two gifts within budget",
        prompt: "A gift page suggests two **different** products that together fit a shopper's budget. Write `pairs_within_budget(products, budget)`: return the names of every pair of products whose prices add up to at most `budget`, as `(name, name)` tuples in the order `combinations` produces them.",
        spec: [
          ["Function", "`pairs_within_budget(products, budget)`"],
          ["products", "a list of dictionaries with `name` and `price`"],
          ["Returns", "a list of `(name, name)` tuples; `[]` when no pair fits or there are fewer than two products"],
          ["Example", "the starter's shelf with budget 50 → `[('Travel Yoga Mat', 'Nordic Candle'), ('Deluxe Vase', 'Nordic Candle')]`"],
        ],
        starter: src`
from itertools import combinations

def pairs_within_budget(products, budget):
    return []

shelf = [
    {"name": "Travel Yoga Mat", "price": 24.99},
    {"name": "Deluxe Vase", "price": 31.0},
    {"name": "Nordic Candle", "price": 12.5},
    {"name": "Organic Speaker", "price": 59.0},
]
print(pairs_within_budget(shelf, 50))
`,
        answer: src`
from itertools import combinations

def pairs_within_budget(products, budget):
    pairs = []
    for first, second in combinations(products, 2):
        if first["price"] + second["price"] <= budget:
            pairs.append((first["name"], second["name"]))
    return pairs

shelf = [
    {"name": "Travel Yoga Mat", "price": 24.99},
    {"name": "Deluxe Vase", "price": 31.0},
    {"name": "Nordic Candle", "price": 12.5},
    {"name": "Organic Speaker", "price": 59.0},
]
print(pairs_within_budget(shelf, 50))
`,
        alternatives: [
          src`
def pairs_within_budget(products, budget):
    pairs = []
    for i in range(len(products)):
        for j in range(i + 1, len(products)):
            if products[i]["price"] + products[j]["price"] <= budget:
                pairs.append((products[i]["name"], products[j]["name"]))
    return pairs
`,
        ],
        wrong: [
          {
            code: src`
def pairs_within_budget(products, budget):
    pairs = []
    for first in products:
        for second in products:
            if first["price"] + second["price"] <= budget:
                pairs.append((first["name"], second["name"]))
    return pairs
`,
            fails: ["returns"],
            why: "a product is paired with itself, and every pair appears in both orders",
          },
          {
            code: src`
from itertools import combinations

def pairs_within_budget(products, budget):
    pairs = []
    for first, second in combinations(products, 2):
        if first["price"] + second["price"] < budget:
            pairs.append((first["name"], second["name"]))
    return pairs
`,
            fails: ["returns"],
            why: "`<` leaves out a pair that costs exactly the budget",
          },
        ],
        hints: [
          "Every pair of products, each once: that is `combinations` with a group size of 2.",
          "Each pair arrives as a tuple of two product dictionaries; unpack it into two names in the `for` line.",
          "\"At most\" includes the budget itself. Keep the names, not the dictionaries.",
        ],
        task: {
          checks: [
            fn("returns", "pairs_within_budget", [
              example([shelf, 50], [tup("Travel Yoga Mat", "Nordic Candle"), tup("Deluxe Vase", "Nordic Candle")]),
              example([shelf, 30], []),
              example([shelf.slice(0, 1), 100], []),
              hiddenCase("a pair that costs exactly the budget", [[{ name: "A", price: 25 }, { name: "B", price: 25 }, { name: "C", price: 26 }], 50], [tup("A", "B")]),
              hiddenCase("every pair fits", [[{ name: "x", price: 1 }, { name: "y", price: 2 }, { name: "z", price: 3 }], 10], [tup("x", "y"), tup("x", "z"), tup("y", "z")]),
              hiddenCase("no products", [[], 20], []),
            ], { label: "pairs_within_budget() lists every affordable pair once" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Customers who might be the same person",
        prompt: "Customers sometimes sign up twice. Flag pairs of records that probably belong to one person: two records match when their emails are the same after removing spaces at the ends and ignoring capitals, **or** when their phone numbers have the same digits (ignoring spaces, dashes, brackets and `+`). A phone with no digits at all never matches. Write `possible_duplicates(customers)`: return the matching pairs of IDs as `(id, id)` tuples, in the order `combinations` produces them.",
        spec: [
          ["Function", "`possible_duplicates(customers)`"],
          ["customers", "a list of dictionaries with `id`, `email` and `phone` (text, possibly empty)"],
          ["Returns", "a list of `(id, id)` tuples"],
          ["Example", "the starter's customers → `[('C00038', 'C01338'), ('C00077', 'C02210')]`"],
        ],
        starter: src`
from itertools import combinations

def possible_duplicates(customers):
    return []

customers = [
    {"id": "C00038", "email": "nora_garcia@fastmail.com", "phone": "+1 202-555-0143"},
    {"id": "C00077", "email": "jamal.walker62@icloud.com", "phone": "(312) 555 0199"},
    {"id": "C01338", "email": " Nora_Garcia@Fastmail.com", "phone": ""},
    {"id": "C02210", "email": "j.walker@example.com", "phone": "312-555-0199"},
]
print(possible_duplicates(customers))
`,
        answer: src`
from itertools import combinations

def digits_of(phone):
    digits = ""
    for ch in phone:
        if ch.isdigit():
            digits += ch
    return digits

def same_person(a, b):
    if a["email"].strip().lower() == b["email"].strip().lower():
        return True
    phone = digits_of(a["phone"])
    return phone != "" and phone == digits_of(b["phone"])

def possible_duplicates(customers):
    matches = []
    for a, b in combinations(customers, 2):
        if same_person(a, b):
            matches.append((a["id"], b["id"]))
    return matches

customers = [
    {"id": "C00038", "email": "nora_garcia@fastmail.com", "phone": "+1 202-555-0143"},
    {"id": "C00077", "email": "jamal.walker62@icloud.com", "phone": "(312) 555 0199"},
    {"id": "C01338", "email": " Nora_Garcia@Fastmail.com", "phone": ""},
    {"id": "C02210", "email": "j.walker@example.com", "phone": "312-555-0199"},
]
print(possible_duplicates(customers))
`,
        alternatives: [
          src`
from itertools import combinations

def clean(customer):
    digits = [ch for ch in customer["phone"] if ch.isdigit()]
    return customer["email"].strip().lower(), digits

def possible_duplicates(customers):
    matches = []
    for a, b in combinations(customers, 2):
        email_a, phone_a = clean(a)
        email_b, phone_b = clean(b)
        if email_a == email_b or (phone_a and phone_a == phone_b):
            matches.append((a["id"], b["id"]))
    return matches
`,
        ],
        wrong: [
          {
            code: src`
from itertools import combinations

def digits_of(phone):
    digits = ""
    for ch in phone:
        if ch.isdigit():
            digits += ch
    return digits

def possible_duplicates(customers):
    matches = []
    for a, b in combinations(customers, 2):
        if a["email"] == b["email"] or digits_of(a["phone"]) == digits_of(b["phone"]) != "":
            matches.append((a["id"], b["id"]))
    return matches
`,
            fails: ["returns"],
            why: "emails are compared as typed, so a capital letter or a stray space hides a duplicate",
          },
          {
            code: src`
from itertools import combinations

def digits_of(phone):
    digits = ""
    for ch in phone:
        if ch.isdigit():
            digits += ch
    return digits

def possible_duplicates(customers):
    matches = []
    for a, b in combinations(customers, 2):
        same_email = a["email"].strip().lower() == b["email"].strip().lower()
        if same_email or digits_of(a["phone"]) == digits_of(b["phone"]):
            matches.append((a["id"], b["id"]))
    return matches
`,
            fails: ["returns"],
            why: "two customers who both left the phone empty are flagged as the same person",
          },
          {
            code: src`
from itertools import combinations

def possible_duplicates(customers):
    matches = []
    for a, b in combinations(customers, 2):
        same_email = a["email"].strip().lower() == b["email"].strip().lower()
        if same_email or (a["phone"] != "" and a["phone"] == b["phone"]):
            matches.append((a["id"], b["id"]))
    return matches
`,
            fails: ["returns"],
            why: "phones are compared as typed, so `(312) 555 0199` and `312-555-0199` don't match",
          },
        ],
        hints: [
          "Write the rule for **one** pair of customers first, as its own small function, then apply it to every pair.",
          "Clean before comparing: strip and lower the emails, keep only the digits of the phones (`isdigit`).",
          "An empty set of digits must not count as a match, so check that the digits aren't empty before comparing them.",
        ],
        task: {
          checks: [
            fn("returns", "possible_duplicates", [
              example([people], [tup("C00038", "C01338"), tup("C00077", "C02210")]),
              example([[people[0], people[1]]], []),
              example([[]], []),
              hiddenCase("two empty phone numbers", [[{ id: "A", email: "a@x.com", phone: "" }, { id: "B", email: "b@x.com", phone: " " }]], []),
              hiddenCase("three records for one person", [[{ id: "A", email: "Sam@x.com", phone: "1" }, { id: "B", email: "sam@x.com ", phone: "" }, { id: "C", email: "s@y.com", phone: "+1" }]], [tup("A", "B"), tup("A", "C")]),
              hiddenCase("one customer", [[people[2]]], []),
              hiddenCase("same digits written differently", [[{ id: "P", email: "p@x.com", phone: "+44 20 7946 0958" }, { id: "Q", email: "q@x.com", phone: "442079460958" }]], [tup("P", "Q")]),
            ], { label: "possible_duplicates() flags matching emails or phone digits" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from itertools import combinations

sizes = ["S", "M", "L", "XL"]
print(len(list(combinations(sizes, 2))), len(list(combinations(sizes, 3))))
print(list(combinations(sizes, 3))[0])
`,
        choices: ["6 4\n('S', 'M', 'L')", "12 24\n('S', 'M', 'L')", "6 4\n['S', 'M', 'L']", "16 64\n('S', 'S', 'S')"],
        answer: 0,
        why: "4 items make 4 × 3 / 2 = 6 pairs and 4 groups of three. Groups keep list order and never repeat an item, so the first trio is S, M, L.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the same pair in two orders. What does this print?",
        program: src`
from collections import Counter
from itertools import combinations

pairs = Counter()
for tags in [["python", "pandas"], ["pandas", "python"]]:
    for pair in combinations(tags, 2):
        pairs[pair] += 1
print(len(pairs), pairs[("python", "pandas")])
`,
        choices: ["2 1", "1 2", "2 2", "1 1"],
        answer: 0,
        why: "`('python', 'pandas')` and `('pandas', 'python')` are different tuples, so the one real pair is counted as two pairs of 1. Sorting each tag list first makes both come out as `('pandas', 'python')`.",
      },
      {
        id: "q3",
        prompt: "Which job is `combinations(items, 2)` the right tool for?",
        choices: ["Checking every two meetings in a day for an overlap", "Grouping customers by city", "Finding the most common city", "Keeping the last three cities searched"],
        answer: 0,
        why: "An overlap is a test that compares two meetings, so every pair has to be checked. Grouping is defaultdict, ranking is Counter, and a recent window is a deque.",
      },
    ],
    review: [
      "`combinations(items, r)` yields every group of `r` items once, in list order, never repeating an item.",
      "n items make n × (n − 1) / 2 pairs; that grows fast, so use pairs for tests that really compare two records.",
      "Sort items first when a pair can arrive in either order.",
      "Next module: nested data, reading values deep inside lists of dictionaries with missing keys.",
    ],
  },
];
