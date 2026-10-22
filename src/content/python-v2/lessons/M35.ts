/**
 * M35 Algorithms & Complexity: five lessons (PY-L35-01 … PY-L35-05).
 *
 * How the cost of a program grows with its input. Counting the basic operations (comparisons, reads, calls) is the
 * measuring stick throughout, because a count is the same on every machine while a stopwatch is not. Big O names the
 * growth (O(1), O(log n), O(n), O(n²), exponential); binary search and bisect turn a scan of sorted data into about
 * log2(n) reads; sets and dictionaries answer `in` by hashing instead of scanning; stacks and queues decide which
 * waiting item comes out next (and why `list.pop(0)` is the wrong queue); recursion costs a frame per call and can
 * repeat the same work exponentially often.
 *
 * Challenges are graded by calling the learner's function on public and hidden inputs, and the efficiency ones also
 * by a deterministic operation budget: an instrumented list or string counts the reads or comparisons a solution makes,
 * so a correct but quadratic answer fails only the budget check. Fixtures are small slices of Runtime Market (R01),
 * Online Retail II (D02), NYC taxi (D06) and airline (D13) records.
 * Version 2: rewritten from a five-print module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/**
 * A list subclass that counts every item read through indexing or iteration, for operation budgets. `setup` builds
 * `_data` from `build` (a Python expression); the check then runs `call` and reports whether the reads stayed within
 * `limit`. Correctness is the `returns` check's job, so a fast wrong answer fails only that.
 */
export const readBudget = (build: string, call: string, limit: number) =>
  [
    "class _Counted(list):",
    "    reads = 0",
    "    def __getitem__(self, i):",
    "        _Counted.reads += 1",
    "        return list.__getitem__(self, i)",
    "    def __iter__(self):",
    "        for _x in list.__iter__(self):",
    "            _Counted.reads += 1",
    "            yield _x",
    `_data = _Counted(${build})`,
    "_Counted.reads = 0",
    call,
    `result = _Counted.reads <= ${limit}`,
  ].join("\n");

/** A str subclass that counts == comparisons (hash unchanged), for budgets on hash-based answers. */
export const eqBudget = (build: string, call: string, limit: number) =>
  [
    "class _Code(str):",
    "    eqs = 0",
    "    def __eq__(self, other):",
    "        _Code.eqs += 1",
    "        return str.__eq__(self, other)",
    "    __hash__ = str.__hash__",
    `_data = ${build}`,
    "_Code.eqs = 0",
    call,
    `result = _Code.eqs <= ${limit}`,
  ].join("\n");

const within = py.bool(true);

// ---------------------------------------------------------------- shared fixtures

const departures = ["05:00", "05:01", "06:15", "06:15", "07:40", "09:05"];
const stationKm = [212.5, 18, 96, 140, 61];
const categoryTree = {
  name: "Home",
  children: [
    { name: "Kitchen", children: [{ name: "Knives", children: [] }, { name: "Pans", children: [] }] },
    { name: "Decor", children: [] },
  ],
};
const routes = {
  JFK: ["BOS", "ORD"],
  BOS: ["ORD"],
  ORD: ["DEN", "MIA"],
  DEN: ["SEA"],
  MIA: [],
  SEA: [],
};

export const m35Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L35-01 Big O
  {
    id: "PY-L35-01",
    version: 2,
    slug: "big-o-growth",
    title: "Big O: how the work grows",
    lede: "A program that is quick on 100 records can crawl on 100,000. Counting its basic operations as the input grows tells you which programs will, before you find out the hard way.",
    focus: "Count an algorithm's operations as the input grows and name the growth with Big O.",
    minutes: 20,
    objectives: [
      "Instrument a function with a counter to measure how many comparisons it makes",
      "Recognise O(1), O(n) and O(n²) from how the count changes when n doubles",
      "Tell the best case from the worst case of an algorithm that can stop early",
    ],
    requires: ["all-call", "arithmetic", "assignment", "break-statement", "comparison", "dict-literal", "dict-lookup", "enumerate-call", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-index", "string-slice", "top-level-indent"],
    teaches: ["op-count", "big-o"],
    blocks: [
      {
        kind: "text",
        md: "A stopwatch says how long a program took *on this machine, today*. A **count** of the basic operations it performs (comparisons, lookups, additions) is the same everywhere, and it shows how the cost changes with the size of the input, which we call **n**.\n\nTo count, add a counter variable and increase it exactly where the operation happens. Then run the same function for n, 2n and 4n and look at how the count moves.",
      },
      {
        kind: "example",
        title: "One loop against two nested loops",
        code: src`
def scan_cost(n):
    items = list(range(n))
    comparisons = 0
    for item in items:
        comparisons += 1
        if item == -1:
            break
    return comparisons

def pairs_cost(n):
    comparisons = 0
    for i in range(n):
        for j in range(i + 1, n):
            comparisons += 1
    return comparisons

for n in [10, 20, 40]:
    print(n, scan_cost(n), pairs_cost(n))
`,
        output: "10 10 45\n20 20 190\n40 40 780\n",
        note: "`scan_cost` looks for a value that isn't there, its **worst case**: every item is compared once, so doubling n doubles the count (if the value were first, the **best case**, one comparison would do). `pairs_cost` compares every item with every later item, n·(n−1)/2 times: doubling n roughly **quadruples** the count.",
      },
      {
        kind: "text",
        md: "**Big O** names that growth and ignores the details that don't change it. A scan of n items is **O(n)** (linear): twice the data, twice the work. Comparing every pair is **O(n²)** (quadratic): twice the data, four times the work. Reading `items[0]` or `len(items)` is **O(1)** (constant): the list's size doesn't matter. Constant factors are dropped: n·(n−1)/2 is still O(n²), because for large n the n² term is what you feel.\n\nThe same idea applies when there are two inputs. Matching every customer against every order costs one comparison per (customer, order) pair, O(n·m).",
      },
      {
        kind: "example",
        title: "Orders per customer, every pair compared",
        code: src`
def orders_per_customer(customers, orders):
    counts = {}
    comparisons = 0
    for customer in customers:
        counts[customer] = 0
        for order in orders:
            comparisons += 1
            if order["customer_id"] == customer:
                counts[customer] += 1
    return counts, comparisons

customers = ["C00038", "C00077", "C01338"]
orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101723", "customer_id": "C01338"},
]
print(orders_per_customer(customers, orders))
print(orders_per_customer(customers * 2, orders * 2)[1])
`,
        output: "({'C00038': 0, 'C00077': 2, 'C01338': 2}, 12)\n48\n",
        note: "Every customer is compared with every order: 3 × 4 = 12. Doubling both lists makes it 6 × 8 = 48, four times the work. A store with 10,000 customers and 10,000 orders would need 100 million comparisons; “Hash-based problems: sets and dictionaries” does the same job in one pass over each list.",
      },
      {
        kind: "text",
        md: "**When to use it:** before you trust a function with real data, ask what its count does when n doubles. Loops inside loops over the same data are the usual O(n²) suspects. **Mistakes to avoid:** counting the wrong thing (incrementing inside the `if` counts matches, not comparisons); judging by one tiny input, where every algorithm looks fast; and forgetting that an early `break` changes the best case, not the worst. The next lessons replace the slow patterns: binary search, then hashing.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count every comparison",
      prompt: "`comparisons_to_find` should count the `==` comparisons made until the target is found (including the one that finds it), or all of them when it isn't there. Its counter never moves. Add the increment in the right place and run it.",
      spec: [
        ["Function", "`comparisons_to_find(values, target)`"],
        ["Returns", "how many values were compared with the target"],
        ["Example", "`comparisons_to_find([4, 8, 15], 8)` → `2`; with target `99` → `3`"],
      ],
      starter: src`
def comparisons_to_find(values, target):
    comparisons = 0
    for value in values:
        if value == target:
            break
    return comparisons

print(comparisons_to_find([4, 8, 15], 8))
print(comparisons_to_find([4, 8, 15], 99))
`,
      answer: src`
def comparisons_to_find(values, target):
    comparisons = 0
    for value in values:
        comparisons += 1
        if value == target:
            break
    return comparisons

print(comparisons_to_find([4, 8, 15], 8))
print(comparisons_to_find([4, 8, 15], 99))
`,
      wrong: [
        {
          code: src`
def comparisons_to_find(values, target):
    comparisons = 0
    for value in values:
        if value == target:
            comparisons += 1
            break
    return comparisons
`,
          fails: ["returns"],
          why: "the increment sits inside the `if`, so only the matching comparison is counted",
        },
      ],
      hints: [
        "Every pass of the loop makes exactly one comparison, matching or not.",
        "So the counter must go up on every pass, before the test decides whether to stop.",
        "Put the increment as the first line of the loop body, above the `if`.",
      ],
      task: {
        checks: [
          fn("returns", "comparisons_to_find", [
            example([[4, 8, 15], 8], 2),
            example([[4, 8, 15], 99], 3),
            hiddenCase("an empty list", [[], 7], 0),
            hiddenCase("the target is the first value", [[16, 23, 42], 16], 1),
          ], { label: "comparisons_to_find() counts every comparison made" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The cost of a duplicate check",
        prompt: "A data-quality job checks invoice numbers for duplicates by comparing each one with every later one, and stops at the first equal pair. Write `duplicate_check_cost(codes)` that performs exactly that check and returns **how many comparisons it made**. It shows how much the job's best and worst cases differ.",
        spec: [
          ["Function", "`duplicate_check_cost(codes)`"],
          ["Order", "compare `codes[0]` with `codes[1]`, `codes[2]`, … then `codes[1]` with `codes[2]`, … (each later code once)"],
          ["Returns", "the number of `==` comparisons made, counting the one that finds the first duplicate; with no duplicate, all of them"],
          ["Example", "`[\"489434\", \"489435\", \"489436\", \"489437\"]` → `6`; `[\"489434\", \"489434\", \"489436\"]` → `1`"],
        ],
        starter: src`
def duplicate_check_cost(codes):
    comparisons = 0
    return comparisons

print(duplicate_check_cost(["489434", "489435", "489436", "489437"]))
print(duplicate_check_cost(["489434", "489434", "489436"]))
`,
        answer: src`
def duplicate_check_cost(codes):
    comparisons = 0
    for i in range(len(codes)):
        for j in range(i + 1, len(codes)):
            comparisons += 1
            if codes[i] == codes[j]:
                return comparisons
    return comparisons

print(duplicate_check_cost(["489434", "489435", "489436", "489437"]))
print(duplicate_check_cost(["489434", "489434", "489436"]))
`,
        alternatives: [
          src`
def duplicate_check_cost(codes):
    comparisons = 0
    for i, first in enumerate(codes):
        for second in codes[i + 1:]:
            comparisons += 1
            if first == second:
                return comparisons
    return comparisons
`,
        ],
        wrong: [
          {
            code: src`
def duplicate_check_cost(codes):
    comparisons = 0
    for i in range(len(codes)):
        for j in range(i + 1, len(codes)):
            comparisons += 1
    return comparisons
`,
            fails: ["returns"],
            why: "it never stops at the first duplicate, so it reports the worst case every time",
          },
          {
            code: src`
def duplicate_check_cost(codes):
    comparisons = 0
    for i in range(len(codes)):
        for j in range(len(codes)):
            if i != j:
                comparisons += 1
                if codes[i] == codes[j]:
                    return comparisons
    return comparisons
`,
            fails: ["returns"],
            why: "comparing each code with every other one (not only the later ones) checks every pair twice",
          },
        ],
        hints: [
          "Two loops: the outer picks a code, the inner walks only the codes after it.",
          "Count a comparison every time the inner loop runs, before testing it.",
          "Returning as soon as two codes are equal is what makes the best case cheap; with no duplicate the loops finish and you return the full count.",
        ],
        task: {
          checks: [
            fn("returns", "duplicate_check_cost", [
              example([["489434", "489435", "489436", "489437"]], 6),
              example([["489434", "489434", "489436"]], 1),
              example([["C489528", "489436", "489437", "C489528"]], 3),
              hiddenCase("an empty list", [[]], 0),
              hiddenCase("a single code", [["489434"]], 0),
              hiddenCase("a duplicate found in the second pass", [["A", "B", "C", "B"]], 5),
              hiddenCase("five codes with no duplicate", [["1", "2", "3", "4", "5"]], 10),
            ], { label: "duplicate_check_cost() counts the comparisons of the early-stopping pair check" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Name the growth",
        prompt: "You measured an operation count at input sizes n, 2n and 4n. Write `growth(counts)` that names the growth: compare each count with the one before it. Both ratios at most 1.2 → `\"constant\"`; both between 1.6 and 2.4 → `\"linear\"`; both between 3.2 and 4.8 → `\"quadratic\"`; anything else → `\"unclear\"`.",
        spec: [
          ["Function", "`growth(counts)`"],
          ["counts", "a list of three positive numbers: the count at n, 2n and 4n"],
          ["Returns", "`\"constant\"`, `\"linear\"`, `\"quadratic\"` or `\"unclear\"` (ranges include their ends)"],
          ["Example", "`[10, 20, 40]` → `\"linear\"`; `[45, 190, 780]` → `\"quadratic\"`"],
        ],
        starter: src`
def growth(counts):
    return "unclear"

print(growth([10, 20, 40]))
print(growth([45, 190, 780]))
`,
        answer: src`
def growth(counts):
    first = counts[1] / counts[0]
    second = counts[2] / counts[1]
    if first <= 1.2 and second <= 1.2:
        return "constant"
    if 1.6 <= first <= 2.4 and 1.6 <= second <= 2.4:
        return "linear"
    if 3.2 <= first <= 4.8 and 3.2 <= second <= 4.8:
        return "quadratic"
    return "unclear"

print(growth([10, 20, 40]))
print(growth([45, 190, 780]))
`,
        alternatives: [
          src`
def growth(counts):
    ratios = [counts[1] / counts[0], counts[2] / counts[1]]
    for name, low, high in [("constant", 0, 1.2), ("linear", 1.6, 2.4), ("quadratic", 3.2, 4.8)]:
        if all(low <= r <= high for r in ratios):
            return name
    return "unclear"
`,
        ],
        wrong: [
          {
            code: src`
def growth(counts):
    first = counts[1] / counts[0]
    if first <= 1.2:
        return "constant"
    if first <= 2.4:
        return "linear"
    if first <= 4.8:
        return "quadratic"
    return "unclear"
`,
            fails: ["returns"],
            why: "it looks only at the first doubling, so a count that jumps later is still called linear",
          },
          {
            code: src`
def growth(counts):
    first = counts[1] - counts[0]
    second = counts[2] - counts[1]
    if first == second:
        return "linear"
    if second == 2 * first:
        return "quadratic"
    return "constant"
`,
            fails: ["returns"],
            why: "differences aren't ratios: a count that doubles has differences that double too, so linear growth is reported as quadratic",
          },
        ],
        hints: [
          "Growth is about how many times bigger each count is than the previous one, so divide, don't subtract.",
          "Work out both ratios first; a class only applies when both of them fall in its range.",
          "Check the ranges with `<=` on both ends, and fall through to `\"unclear\"` when no class fits both ratios.",
        ],
        task: {
          checks: [
            fn("returns", "growth", [
              example([[10, 20, 40]], "linear"),
              example([[45, 190, 780]], "quadratic"),
              example([[7, 7, 8]], "constant"),
              hiddenCase("linear first, then a jump", [[10, 20, 80]], "unclear"),
              hiddenCase("ratios exactly on the range ends", [[100, 160, 384]], "linear"),
              hiddenCase("cubic growth", [[1, 8, 64]], "unclear"),
              hiddenCase("a slowly growing count", [[20, 23, 26]], "constant"),
            ], { label: "growth() classifies the counts by both doubling ratios" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def work(n):
    steps = 0
    for i in range(n):
        for j in range(n):
            steps += 1
    return steps

print(work(3), work(6))
`,
        choices: ["9 36", "9 18", "6 12", "3 6"],
        answer: 0,
        why: "Both loops run n times, so the body runs n × n times: 9, then 36. Doubling n multiplied the work by four, which is what O(n²) means.",
      },
      {
        id: "q2",
        prompt: "A common mistake: this function is meant to count comparisons. What does it print?",
        program: src`
def comparisons(values, target):
    count = 0
    for value in values:
        if value == target:
            count += 1
    return count

print(comparisons([4, 8, 15, 16], 16))
`,
        choices: ["1", "4", "3", "0"],
        answer: 0,
        why: "Four comparisons were made, but the increment only runs when one of them is true, so it counts matches. The operation you count must be counted every time it happens.",
      },
      {
        id: "q3",
        prompt: "Which of these jobs is O(n²) as written?",
        choices: [
          "Comparing every order with every other order to find duplicates",
          "Adding up the totals of n orders",
          "Reading the first order of a list",
          "Finding the largest of n prices in one pass",
        ],
        answer: 0,
        why: "Every pair means about n²/2 comparisons. A total and a maximum visit each order once (O(n)); reading one item by position is O(1).",
      },
    ],
    review: [
      "Count the operation you care about every time it happens, then compare the counts at n, 2n and 4n.",
      "O(1) stays flat, O(n) doubles, O(n²) quadruples when n doubles; constant factors are dropped.",
      "An early stop helps the best case; the worst case decides how a program behaves on bad days.",
      "Next: sorted data lets a search skip most of the list, with binary search and bisect.",
    ],
  },

  // ------------------------------------------------------------------ PY-L35-02 searching and sorting
  {
    id: "PY-L35-02",
    version: 2,
    slug: "binary-search-and-bisect",
    title: "Searching sorted data: binary search and bisect",
    lede: "When data is sorted, a search can look at the middle and throw away half of what is left. A million items take about twenty reads instead of a million.",
    focus: "Search sorted data by halving the range, by hand and with the bisect module.",
    minutes: 22,
    objectives: [
      "Explain why binary search needs sorted data and takes about log2(n) steps",
      "Use bisect_left and bisect_right to find positions and count values in a range",
      "Decide when sorting once and searching many times beats scanning each time",
    ],
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "else-clause", "end", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-index", "string-slice", "top-level-indent", "while-loop"],
    teaches: ["binary-search", "bisect-call"],
    blocks: [
      {
        kind: "text",
        md: "Finding an invoice number in a list by scanning is O(n). If the list is **sorted**, you can do what you do with a dictionary or a phone book: open it in the middle, see whether the target is before or after, and discard the other half. Each step halves what is left, so 1,000 items need at most 10 steps and 1,000,000 need at most 20. That growth is **O(log n)**.",
      },
      {
        kind: "example",
        title: "Binary search by hand",
        code: src`
def binary_search(values, target):
    low = 0
    high = len(values) - 1
    steps = 0
    while low <= high:
        steps += 1
        middle = (low + high) // 2
        if values[middle] == target:
            return middle, steps
        if values[middle] < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1, steps

invoices = list(range(489000, 490000))
print(binary_search(invoices, 489737))
print(binary_search(invoices, 489000))
print(binary_search(invoices, 12))
`,
        output: "(737, 8)\n(0, 9)\n(-1, 9)\n",
        note: "`low` and `high` mark the part that can still hold the target. Each pass looks at the middle and moves one end past it. A scan would need 738 comparisons to find 489737; binary search needed 8, and at most 10 for any of these 1,000 invoices.",
      },
      {
        kind: "text",
        md: "Binary search is only correct on sorted data. On unsorted data it discards the wrong half and reports *not found* for a value that is there. No error is raised, which makes the bug easy to miss.",
      },
      {
        kind: "example",
        title: "The same search on unsorted totals",
        code: src`
def binary_search(values, target):
    low = 0
    high = len(values) - 1
    while low <= high:
        middle = (low + high) // 2
        if values[middle] == target:
            return middle
        if values[middle] < target:
            low = middle + 1
        else:
            high = middle - 1
    return -1

totals = [35.84, 91.47, 22.35, 246.6, 54.55]
print(binary_search(totals, 91.47))
print(binary_search(sorted(totals), 91.47))
`,
        output: "-1\n3\n",
        note: "91.47 is in the list, but the first middle (22.35) sends the search to the right half. Sorted, the same search finds it at position 3 of the sorted list.",
      },
      {
        kind: "text",
        md: "Python's `bisect` module does the halving for you. `bisect_left(values, x)` returns the first position where `x` could be inserted to keep the list sorted, which is the position of the first value **≥ x**. `bisect_right(values, x)` returns the position after the last value **≤ x**. Two calls count the values in a range without looking at each one.",
      },
      {
        kind: "example",
        title: "Taxi pickups between 09:00 and 10:05",
        code: src`
from bisect import bisect_left, bisect_right

pickups = ["08:02", "08:15", "09:40", "09:58", "10:05", "10:05", "11:30"]
start = bisect_left(pickups, "09:00")
end = bisect_left(pickups, "10:05")
print(start, end, pickups[start:end])
print(bisect_right(pickups, "10:05") - bisect_left(pickups, "10:05"))
`,
        output: "2 4 ['09:40', '09:58']\n2\n",
        note: "Times written as `HH:MM` sort correctly as text. `bisect_left` for both ends gives a range that includes 09:00 and excludes 10:05. The difference between `bisect_right` and `bisect_left` for one value counts its copies.",
      },
      {
        kind: "text",
        md: "**When to use it:** many lookups in data that changes rarely. Sorting costs O(n log n) once; after that each search is O(log n). For a single lookup in unsorted data, a plain scan (O(n)) is cheaper than sorting first. **Mistakes to avoid:** searching unsorted data; mixing up `bisect_left` and `bisect_right` when values repeat; and slicing or copying the list inside the search, which costs O(n) and wipes out the gain.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count with one bisect call",
      prompt: "`scores_at_most` counts the scores that are at most `limit` by walking the whole sorted list. Replace the loop with a single `bisect_right` call, then run it: the answers stay the same.",
      spec: [
        ["Function", "`scores_at_most(sorted_scores, limit)`"],
        ["Returns", "how many scores are `<= limit`, reading only a handful of them"],
        ["Example", "`scores_at_most([52, 61, 61, 70, 88], 61)` → `3`"],
      ],
      starter: src`
from bisect import bisect_right

def scores_at_most(sorted_scores, limit):
    count = 0
    for score in sorted_scores:
        if score <= limit:
            count += 1
    return count

print(scores_at_most([52, 61, 61, 70, 88], 61))
`,
      answer: src`
from bisect import bisect_right

def scores_at_most(sorted_scores, limit):
    return bisect_right(sorted_scores, limit)

print(scores_at_most([52, 61, 61, 70, 88], 61))
`,
      wrong: [
        {
          code: src`
from bisect import bisect_left

def scores_at_most(sorted_scores, limit):
    return bisect_left(sorted_scores, limit)
`,
          fails: ["returns"],
          why: "`bisect_left` stops before the scores equal to the limit, so they aren't counted",
        },
      ],
      hints: [
        "In a sorted list, every score `<= limit` comes before the first score that is bigger.",
        "So the count is a position: where the limit would be inserted after any equal scores.",
        "That position is exactly what `bisect_right(sorted_scores, limit)` returns.",
      ],
      task: {
        checks: [
          fn("returns", "scores_at_most", [
            example([[52, 61, 61, 70, 88], 61], 3),
            hiddenCase("a limit below every score", [[52, 61], 10], 0),
            hiddenCase("an empty list", [[], 50], 0),
          ], { label: "scores_at_most() counts the scores up to the limit" }),
          {
            kind: "expr",
            id: "reads",
            label: "scores_at_most() reads at most 40 of 100,000 sorted scores",
            hidden: true,
            expr: readBudget("range(100000)", "scores_at_most(_data, 61234)", 40),
            expected: within,
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The first departure at or after a time",
        prompt: "A departures board lists the day's flight times in order. Write `first_at_or_after(times, moment)` that returns the **position** of the first time that is at or after `moment`, or `len(times)` when every time is earlier. It must halve the search rather than scan: the hidden test uses 100,000 times and allows at most 40 reads.",
        spec: [
          ["Function", "`first_at_or_after(times, moment)`"],
          ["times", "a sorted list (`\"HH:MM\"` texts or numbers); values may repeat"],
          ["Returns", "the index of the first value `>= moment`, or `len(times)` if there is none"],
          ["Example", "the starter's departures with `\"06:15\"` → `2`; with `\"23:00\"` → `6`"],
        ],
        starter: src`
def first_at_or_after(times, moment):
    return 0

departures = ["05:00", "05:01", "06:15", "06:15", "07:40", "09:05"]
print(first_at_or_after(departures, "06:15"))
print(first_at_or_after(departures, "23:00"))
`,
        answer: src`
from bisect import bisect_left

def first_at_or_after(times, moment):
    return bisect_left(times, moment)

departures = ["05:00", "05:01", "06:15", "06:15", "07:40", "09:05"]
print(first_at_or_after(departures, "06:15"))
print(first_at_or_after(departures, "23:00"))
`,
        alternatives: [
          src`
def first_at_or_after(times, moment):
    low = 0
    high = len(times)
    while low < high:
        middle = (low + high) // 2
        if times[middle] < moment:
            low = middle + 1
        else:
            high = middle
    return low
`,
        ],
        wrong: [
          {
            code: src`
def first_at_or_after(times, moment):
    for i, time in enumerate(times):
        if time >= moment:
            return i
    return len(times)
`,
            fails: ["reads"],
            why: "the answers are right, but a scan reads tens of thousands of values instead of about 17",
          },
          {
            code: src`
from bisect import bisect_right

def first_at_or_after(times, moment):
    return bisect_right(times, moment)
`,
            fails: ["returns"],
            why: "`bisect_right` skips past times equal to the moment, so a 06:15 departure is missed",
          },
        ],
        hints: [
          "The list is sorted, so the answer is the place where `moment` would be inserted.",
          "Of the two bisect functions, one puts the insertion point before equal values and one after them.",
          "You want the first value that is *at or after* the moment, so equal values must count: insert before them.",
        ],
        task: {
          checks: [
            fn("returns", "first_at_or_after", [
              example([departures, "06:15"], 2),
              example([departures, "23:00"], 6),
              example([departures, "00:00"], 0),
              hiddenCase("a moment between two times", [departures, "07:00"], 4),
              hiddenCase("an empty board", [[], "08:00"], 0),
              hiddenCase("numbers with repeats", [[1, 3, 3, 3, 9], 3], 1),
            ], { label: "first_at_or_after() finds the first time at or after the moment" }),
            {
              kind: "expr",
              id: "reads",
              label: "first_at_or_after() reads at most 40 of 100,000 sorted times",
              hidden: true,
              expr: readBudget("range(0, 200000, 2)", "first_at_or_after(_data, 123457)", 40),
              expected: within,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "The nearest charging station",
        prompt: "Charging stations sit at kilometre markers along a highway, listed in no particular order. A trip planner asks for the nearest station to many positions. Write `nearest_stations(stations, positions)`: for each position, the marker of the nearest station; on a tie, the smaller marker. Sort once and search each position; the hidden test checks that the station list is read only a few times, not once per position.",
        spec: [
          ["Function", "`nearest_stations(stations, positions)`"],
          ["stations", "a non-empty list of kilometre markers, unsorted"],
          ["Returns", "a list with the nearest marker for each position, in the order of `positions`; ties go to the smaller marker"],
          ["Example", "stations `[212.5, 18, 96, 140, 61]`, positions `[100, 0, 300]` → `[96, 18, 212.5]`"],
        ],
        starter: src`
def nearest_stations(stations, positions):
    nearest = []
    return nearest

print(nearest_stations([212.5, 18, 96, 140, 61], [100, 0, 300]))
`,
        answer: src`
from bisect import bisect_left

def nearest_stations(stations, positions):
    ordered = sorted(stations)
    nearest = []
    for position in positions:
        i = bisect_left(ordered, position)
        candidates = []
        if i > 0:
            candidates.append(ordered[i - 1])
        if i < len(ordered):
            candidates.append(ordered[i])
        best = candidates[0]
        for station in candidates:
            if abs(station - position) < abs(best - position):
                best = station
        nearest.append(best)
    return nearest

print(nearest_stations([212.5, 18, 96, 140, 61], [100, 0, 300]))
`,
        alternatives: [
          src`
import bisect

def nearest_stations(stations, positions):
    ordered = sorted(stations)
    result = []
    for p in positions:
        i = bisect.bisect_left(ordered, p)
        if i == 0:
            result.append(ordered[0])
        elif i == len(ordered):
            result.append(ordered[-1])
        else:
            before = ordered[i - 1]
            after = ordered[i]
            result.append(before if p - before <= after - p else after)
    return result
`,
        ],
        wrong: [
          {
            code: src`
def nearest_stations(stations, positions):
    nearest = []
    for position in positions:
        best = stations[0]
        for station in stations:
            if abs(station - position) < abs(best - position) or (abs(station - position) == abs(best - position) and station < best):
                best = station
        nearest.append(best)
    return nearest
`,
            fails: ["reads"],
            why: "the answers are right, but every position scans every station: positions × stations reads",
          },
          {
            code: src`
from bisect import bisect_left

def nearest_stations(stations, positions):
    ordered = sorted(stations)
    nearest = []
    for position in positions:
        i = bisect_left(ordered, position)
        if i == len(ordered):
            i = i - 1
        nearest.append(ordered[i])
    return nearest
`,
            fails: ["returns"],
            why: "it always takes the station at or after the position, even when the one before it is closer",
          },
          {
            code: src`
from bisect import bisect_left

def nearest_stations(stations, positions):
    ordered = sorted(stations)
    nearest = []
    for position in positions:
        i = bisect_left(ordered, position)
        candidates = ordered[max(i - 1, 0):i + 1]
        best = candidates[-1]
        for station in candidates:
            if abs(station - position) < abs(best - position):
                best = station
        nearest.append(best)
    return nearest
`,
            fails: ["returns"],
            why: "on a tie it keeps the later (larger) marker instead of the smaller one",
          },
        ],
        hints: [
          "Sorting the stations once lets every position be found with a bisect instead of a scan.",
          "The insertion point splits the stations into those before the position and those at or after it; the nearest is one of the two neighbours of that point.",
          "Watch both ends (no station before, no station after), and compare distances so that an equal distance keeps the smaller marker.",
        ],
        task: {
          checks: [
            fn("returns", "nearest_stations", [
              example([stationKm, [100, 0, 300]], [96, 18, 212.5]),
              example([stationKm, [61, 78.5]], [61, 61]),
              example([[50], [10, 90]], [50, 50]),
              hiddenCase("a position exactly halfway between two stations", [[10, 20], [15]], [10]),
              hiddenCase("no positions", [stationKm, []], []),
              hiddenCase("a position past the last station", [[5, 9, 2], [40, 1]], [9, 2]),
            ], { label: "nearest_stations() finds the nearest marker for each position", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "nearest_stations", [keepsInput([[212.5, 18, 96], [50]])], { label: "nearest_stations() doesn't reorder the station list it is given" }),
            {
              kind: "expr",
              id: "reads",
              label: "nearest_stations() reads 2,000 stations a few times, not once per position",
              hidden: true,
              expr: readBudget("[(i * 7919) % 20000 for i in range(2000)]", "nearest_stations(_data, list(range(0, 20000, 40)))[:3]", 6000),
              expected: within,
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from bisect import bisect_left, bisect_right

fares = [10, 20, 20, 30]
print(bisect_left(fares, 20), bisect_right(fares, 20))
`,
        choices: ["1 3", "1 2", "2 3", "0 4"],
        answer: 0,
        why: "`bisect_left` gives the position of the first 20 (1); `bisect_right` gives the position just after the last 20 (3). Their difference, 2, is how many 20s there are.",
      },
      {
        id: "q2",
        prompt: "A common mistake: searching data that isn't sorted. What does this print?",
        program: src`
from bisect import bisect_left

ids = [300, 100, 200]
i = bisect_left(ids, 100)
print(i < len(ids) and ids[i] == 100)
`,
        choices: ["False", "True", "0", "1"],
        answer: 0,
        why: "bisect assumes sorted data. Here the middle value 100 is compared with 100 and the search keeps going left, ending at position 0, where 300 sits, so 100 is reported missing. Sort first (or keep the list sorted).",
      },
      {
        id: "q3",
        prompt: "You must answer 50,000 lookups against 1,000,000 product codes that never change. Which plan does the least work?",
        choices: [
          "Sort the codes once, then use bisect for each lookup",
          "Scan the list for each lookup",
          "Sort the codes again before each lookup",
          "Use bisect on the unsorted list",
        ],
        answer: 0,
        why: "One O(n log n) sort plus 50,000 searches of about 20 steps each is far less than 50,000 scans of a million items. Re-sorting every time throws the gain away, and bisect on unsorted data is wrong.",
      },
    ],
    review: [
      "Binary search halves a sorted range at each step: O(log n), about 20 steps for a million items.",
      "`bisect_left` → first position of a value ≥ x; `bisect_right` → position after the last value ≤ x.",
      "Sort once, search many times; on unsorted data binary search silently gives wrong answers.",
      "Next: hashing finds a value in a set or dictionary without any ordering at all.",
    ],
  },

  // ------------------------------------------------------------------ PY-L35-03 hash-based problems
  {
    id: "PY-L35-03",
    version: 2,
    slug: "hash-lookups",
    title: "Hash-based problems: sets and dictionaries",
    lede: "A set or dictionary turns a value into a number (its hash) and goes straight to the slot where it would be. Checking `in` costs about the same for ten items or ten million.",
    focus: "Replace repeated scans with a set or dictionary lookup, and know which values can be keys.",
    minutes: 22,
    objectives: [
      "Measure that `in` on a list compares item by item while `in` on a set does not",
      "Solve repeat and pair problems in one pass with a dictionary of what you have seen",
      "Explain why lists can't be keys or set members, and use tuples instead",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "bitwise", "boolean", "class-def", "comparison", "dict-literal", "enumerate-call", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-loop", "none-value", "print-call", "print-several", "print-text", "range-call", "self-name", "set-literal", "string-format", "string-index", "subclass", "top-level-indent", "try-except", "tuple-literal", "type-call", "unquoted-name"],
    teaches: ["hash-lookup", "hashable-key"],
    blocks: [
      {
        kind: "text",
        md: "`code in codes` on a **list** compares `code` with one item after another: O(n). A **set** or **dictionary** works differently. It calls `hash(code)`, which turns the value into a number, uses that number to pick a slot, and only compares with whatever sits in that slot. Equal values always have equal hashes, so a value that is there is found in that slot, and a value that isn't usually costs no comparison at all. On average that is **O(1)**.\n\nTo see it, the example uses a `str` subclass that counts every `==` it takes part in.",
      },
      {
        kind: "example",
        title: "Counting the comparisons behind `in`",
        code: src`
class Sku(str):
    comparisons = 0

    def __eq__(self, other):
        Sku.comparisons += 1
        return str.__eq__(self, other)

    __hash__ = str.__hash__

catalogue = [Sku(f"SKU-{n:05}") for n in range(20000)]
as_list = catalogue
as_set = set(catalogue)

for wanted in ["SKU-00007", "SKU-19999", "SKU-99999"]:
    Sku.comparisons = 0
    in_list = Sku(wanted) in as_list
    list_cost = Sku.comparisons
    Sku.comparisons = 0
    in_set = Sku(wanted) in as_set
    print(wanted, in_list, list_cost, in_set, Sku.comparisons)
`,
        output: "SKU-00007 True 8 True 1\nSKU-19999 True 20000 True 1\nSKU-99999 False 20000 False 0\n",
        note: "The list compares until it finds the code: 8 comparisons near the front, all 20,000 at the end or when the code is missing. The set needs one comparison when the code is there and none when it isn't. Building the set costs one pass, so it pays off as soon as you look things up more than a few times.",
      },
      {
        kind: "text",
        md: "Hashing only works if a value's hash never changes, so only **hashable** values (numbers, strings, tuples of hashable values) can be dictionary keys or set members. A list can change after it is stored, so Python refuses it.",
      },
      {
        kind: "error-example",
        title: "A list as a dictionary key",
        code: src`
visits = {}
visits[["C00077", "2024-01-16"]] = 1
print(visits)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: cannot use 'list' as a dict key (unhashable type: 'list')`. When a key is made of several parts, such as a customer and a day, use a tuple: `(customer, day)`.",
      },
      {
        kind: "example",
        title: "Visits per customer and day, keyed by a tuple",
        code: src`
def visits_per_day(events):
    visits = {}
    for customer, day in events:
        key = (customer, day)
        if key not in visits:
            visits[key] = 0
        visits[key] += 1
    return visits

events = [
    ("C00077", "2024-01-16"),
    ("C01338", "2024-01-16"),
    ("C00077", "2024-01-16"),
    ("C00077", "2024-01-20"),
]
print(visits_per_day(events))
`,
        output: "{('C00077', '2024-01-16'): 2, ('C01338', '2024-01-16'): 1, ('C00077', '2024-01-20'): 1}\n",
        note: "Each `key not in visits` is a hash lookup, so the whole count is one O(n) pass. Doing the same with a list of seen keys would compare against every earlier key: O(n²).",
      },
      {
        kind: "text",
        md: "**When to use it:** any time a loop asks *have I seen this before?*, *is this in that other collection?* or *what goes with this key?*: duplicates, joins, counts, matching pairs. Build the set or dictionary once, then look up as often as you like. **Mistakes to avoid:** building the set inside the loop (that rebuilds it every pass and is O(n²) again); searching `dictionary.values()`, which is a scan; and using a list or dictionary as a key. Sets and dictionaries don't keep values sorted, so if you need order, keep a list beside them or sort at the end.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Duplicates without comparing every pair",
      prompt: "`has_duplicates` compares every payment ID with every later one. Rewrite it with a set: a set keeps one copy of each value, so compare its size with the list's size. Run it and check both answers stay the same.",
      spec: [
        ["Function", "`has_duplicates(ids)`"],
        ["Returns", "`True` if any ID appears more than once, otherwise `False`"],
        ["Example", "`[\"PAY0000416\", \"PAY0000417\", \"PAY0000416\"]` → `True`"],
      ],
      starter: src`
def has_duplicates(ids):
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if ids[i] == ids[j]:
                return True
    return False

print(has_duplicates(["PAY0000416", "PAY0000417", "PAY0000416"]))
print(has_duplicates(["PAY0000416", "PAY0000417"]))
`,
      answer: src`
def has_duplicates(ids):
    return len(set(ids)) != len(ids)

print(has_duplicates(["PAY0000416", "PAY0000417", "PAY0000416"]))
print(has_duplicates(["PAY0000416", "PAY0000417"]))
`,
      wrong: [
        {
          code: src`
def has_duplicates(ids):
    return len(set(ids)) == len(ids)
`,
          fails: ["returns"],
          why: "equal sizes mean there were **no** duplicates, so every answer is flipped",
        },
      ],
      hints: [
        "A set built from the list keeps one copy of each ID.",
        "If any ID was repeated, the set is smaller than the list.",
        "Return the result of comparing the two lengths with `!=`.",
      ],
      task: {
        checks: [
          fn("returns", "has_duplicates", [
            example([["PAY0000416", "PAY0000417", "PAY0000416"]], true),
            example([["PAY0000416", "PAY0000417"]], false),
            hiddenCase("an empty list", [[]], false),
          ], { label: "has_duplicates() spots a repeated ID" }),
          {
            kind: "expr",
            id: "comparisons",
            label: "has_duplicates() makes at most 10 comparisons for 1,000 distinct IDs",
            hidden: true,
            expr: eqBudget("[_Code(f'PAY{i:07}') for i in range(1000)]", "has_duplicates(_data)", 10),
            expected: within,
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The first payment ID seen twice",
        prompt: "A payments export should have unique IDs, but a retrying client sometimes sends the same payment again. Write `first_repeat(payment_ids)` that returns the first ID to appear for a **second** time, reading the list once, or `None` when there is no repeat. The hidden test counts `==` comparisons on 1,000 IDs.",
        spec: [
          ["Function", "`first_repeat(payment_ids)`"],
          ["Returns", "the ID whose second appearance comes earliest in the list; `None` if every ID is unique"],
          ["Example", "`[\"PAY7\", \"PAY3\", \"PAY9\", \"PAY3\", \"PAY7\"]` → `\"PAY3\"` (its second copy, at position 3, comes before PAY7's)"],
        ],
        starter: src`
def first_repeat(payment_ids):
    return None

print(first_repeat(["PAY7", "PAY3", "PAY9", "PAY3", "PAY7"]))
`,
        answer: src`
def first_repeat(payment_ids):
    seen = {}
    for payment_id in payment_ids:
        if payment_id in seen:
            return payment_id
        seen[payment_id] = True
    return None

print(first_repeat(["PAY7", "PAY3", "PAY9", "PAY3", "PAY7"]))
`,
        alternatives: [
          src`
def first_repeat(payment_ids):
    seen = set()
    for payment_id in payment_ids:
        if payment_id in seen:
            return payment_id
        seen |= {payment_id}
    return None
`,
        ],
        wrong: [
          {
            code: src`
def first_repeat(payment_ids):
    for i, payment_id in enumerate(payment_ids):
        if payment_id in payment_ids[:i]:
            return payment_id
    return None
`,
            fails: ["comparisons"],
            why: "right answers, but each ID is compared with every earlier one: millions of comparisons on a long export",
          },
          {
            code: src`
def first_repeat(payment_ids):
    for payment_id in payment_ids:
        if payment_ids.count(payment_id) > 1:
            return payment_id
    return None
`,
            fails: ["returns", "comparisons"],
            why: "it returns the first ID that *has* a repeat somewhere (PAY7), not the first repeat to appear, and counting scans the whole list each time",
          },
        ],
        hints: [
          "Walk the list once and remember every ID you have already passed.",
          "Keep the remembered IDs in a dictionary (or set), so checking one is a hash lookup, not a scan.",
          "Check *before* remembering: if the current ID is already remembered, it is the answer.",
        ],
        task: {
          checks: [
            fn("returns", "first_repeat", [
              example([["PAY7", "PAY3", "PAY9", "PAY3", "PAY7"]], "PAY3"),
              example([["PAY1", "PAY2", "PAY3"]], null),
              example([["PAY5", "PAY5"]], "PAY5"),
              hiddenCase("an empty list", [[]], null),
              hiddenCase("a repeat at the very end", [["A", "B", "C", "D", "A"]], "A"),
              hiddenCase("IDs differing only in case", [["pay1", "PAY1", "Pay1"]], null),
            ], { label: "first_repeat() finds the earliest second appearance" }),
            {
              kind: "expr",
              id: "comparisons",
              label: "first_repeat() makes at most 10 comparisons on 1,000 IDs",
              hidden: true,
              expr: eqBudget("[_Code(f'PAY{i:07}') for i in range(1000)] + [_Code('PAY0000500')]", "first_repeat(_data)", 10),
              expected: within,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Two refunds that cancel a charge",
        prompt: "Finance needs two refunds that together equal a disputed charge. Write `pair_for_total(amounts, target)` that returns the positions `(i, j)`, `i < j`, of the first such pair: scan left to right and stop at the first `j` that completes a pair with an **earlier** amount; if several earlier amounts would do, use the earliest one. Return `None` when there is no pair. Amounts are whole cents, so `==` is exact. The hidden test checks the list is read in one pass, not once per amount.",
        spec: [
          ["Function", "`pair_for_total(amounts, target)`"],
          ["amounts", "a list of whole numbers of cents (may repeat, may be negative)"],
          ["Returns", "a tuple `(i, j)` with `i < j` and `amounts[i] + amounts[j] == target`, the pair whose `j` is smallest, and for that `j` the smallest `i`; or `None`"],
          ["Example", "`[1250, 899, 4000, 351, 899]`, target `1250` → `(1, 3)`"],
        ],
        starter: src`
def pair_for_total(amounts, target):
    return None

print(pair_for_total([1250, 899, 4000, 351, 899], 1250))
`,
        answer: src`
def pair_for_total(amounts, target):
    first_position = {}
    for j, amount in enumerate(amounts):
        needed = target - amount
        if needed in first_position:
            return (first_position[needed], j)
        if amount not in first_position:
            first_position[amount] = j
    return None

print(pair_for_total([1250, 899, 4000, 351, 899], 1250))
`,
        alternatives: [
          src`
def pair_for_total(amounts, target):
    where = {}
    j = 0
    for amount in amounts:
        if target - amount in where:
            return where[target - amount], j
        where.setdefault(amount, j)
        j += 1
    return None
`,
        ],
        wrong: [
          {
            code: src`
def pair_for_total(amounts, target):
    for j in range(len(amounts)):
        for i in range(j):
            if amounts[i] + amounts[j] == target:
                return (i, j)
    return None
`,
            fails: ["reads"],
            why: "correct pairs, but every amount is compared with every earlier one: O(n²) reads",
          },
          {
            code: src`
def pair_for_total(amounts, target):
    position = {}
    for j, amount in enumerate(amounts):
        needed = target - amount
        if needed in position:
            return (position[needed], j)
        position[amount] = j
    return None
`,
            fails: ["returns"],
            why: "a repeated amount overwrites its earlier position, so the pair doesn't use the earliest one",
          },
          {
            code: src`
def pair_for_total(amounts, target):
    position = {}
    for j, amount in enumerate(amounts):
        position[amount] = j
        needed = target - amount
        if needed in position and position[needed] != j:
            return (position[needed], j)
    return None
`,
            fails: ["returns"],
            why: "storing the amount before checking lets 625 + 625 pair with itself through the overwritten entry, and loses earliest positions",
          },
        ],
        hints: [
          "For each amount, the partner it needs is `target - amount`; the question is whether that partner appeared earlier.",
          "A dictionary from amount to the position where it was **first** seen answers that in one lookup.",
          "Check for the partner before recording the current amount, and never overwrite a position that is already stored.",
        ],
        task: {
          checks: [
            fn("returns", "pair_for_total", [
              example([[1250, 899, 4000, 351, 899], 1250], py.tuple(py.int(1), py.int(3))),
              example([[500, 700, 300], 1000], py.tuple(py.int(1), py.int(2))),
              example([[100, 200], 1000], null),
              hiddenCase("two equal halves", [[625, 1, 625], 1250], py.tuple(py.int(0), py.int(2))),
              hiddenCase("an amount that would pair with itself", [[625, 10], 1250], null),
              hiddenCase("several earlier partners", [[300, 300, 700], 1000], py.tuple(py.int(0), py.int(2))),
              hiddenCase("negative adjustments", [[-200, 900, 1400], 1200], py.tuple(py.int(0), py.int(2))),
              hiddenCase("an empty list", [[], 0], null),
            ], { label: "pair_for_total() finds the first pair that adds up to the target" }),
            {
              kind: "expr",
              id: "reads",
              label: "pair_for_total() reads 600 amounts about once each",
              hidden: true,
              expr: readBudget("[2 * i for i in range(600)]", "pair_for_total(_data, 1)", 1800),
              expected: within,
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
codes = {"A12", "a12", "A12"}
stock = {("SKU-1", "red"): 4}
print(len(codes), ("SKU-1", "red") in stock)
`,
        choices: ["2 True", "3 True", "2 False", "1 True"],
        answer: 0,
        why: "A set keeps one copy of each equal value: \"A12\" and \"a12\" are different strings, so 2 remain. A tuple of strings is hashable, so it works as a key and is found.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a list as a key. What does this print?",
        program: src`
counts = {}
try:
    counts[["C00077", "web"]] = 1
except TypeError as error:
    print(type(error).__name__)
`,
        choices: ["TypeError", "KeyError", "ValueError", "(nothing)"],
        answer: 0,
        why: "Lists can change, so they have no hash and can't be keys. Use the tuple `(\"C00077\", \"web\")` instead.",
      },
      {
        id: "q3",
        prompt: "Which of these checks is a scan even though it uses a dictionary?",
        choices: [
          "`email in customers_by_id.values()`",
          "`customer_id in customers_by_id`",
          "`customers_by_id[customer_id]`",
          "`customer_id not in customers_by_id`",
        ],
        answer: 0,
        why: "Only keys are hashed. `values()` is searched one value at a time, O(n). If you look values up often, build a second dictionary keyed by them.",
      },
    ],
    review: [
      "Sets and dictionaries hash a value to find its slot: `in` and `[key]` are O(1) on average.",
      "Build the set or dictionary once, outside the loop; then *seen before?* and *partner exists?* are single lookups.",
      "Keys and set members must be hashable: use tuples, not lists.",
      "Next: two simple structures that decide *which* waiting item comes out next, stacks and queues.",
    ],
  },

  // ------------------------------------------------------------------ PY-L35-04 stacks and queues
  {
    id: "PY-L35-04",
    version: 2,
    slug: "stacks-and-queues",
    title: "Stacks and queues",
    lede: "When work piles up, the order it comes out matters. A stack hands back the newest item; a queue hands back the oldest. Choosing the wrong one gives wrong answers or slow programs.",
    focus: "Use a list as a stack and a deque as a queue, and choose by which item must come out next.",
    minutes: 22,
    objectives: [
      "Use append and pop for last-in, first-out processing (undo, bracket matching)",
      "Use deque append and popleft for first-in, first-out processing (fair queues, level-by-level searches)",
      "Explain why `list.pop(0)` makes a slow queue",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "deque-call", "dict-get", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "match-case", "membership", "nested-loop", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "tuple-unpack", "unquoted-name", "while-loop"],
    teaches: ["stack-lifo", "queue-fifo"],
    blocks: [
      {
        kind: "text",
        md: "A **stack** is last in, first out (LIFO): like a pile of plates, you take from the top. A Python list is a ready-made stack: `append` puts an item on top and `pop()` takes the top one off, both O(1).\n\nStacks fit any job where the most recent thing must be dealt with first: undoing the last edit, or checking that brackets close in the right order. Every closing bracket must match the **latest** bracket still open.",
      },
      {
        kind: "example",
        title: "Do the brackets in a template match?",
        code: src`
def balanced(text):
    closes = {")": "(", "]": "[", "}": "{"}
    stack = []
    for char in text:
        if char in "([{":
            stack.append(char)
        elif char in closes:
            if not stack or stack.pop() != closes[char]:
                return False
    return not stack

for template in ['{"items": [1, 2]}', '{"items": [1, 2}', "(total * (1 - rate)", "rate)"]:
    print(template, balanced(template))
`,
        output: "{\"items\": [1, 2]} True\n{\"items\": [1, 2} False\n(total * (1 - rate) False\nrate) False\n",
        note: "In the second template `}` arrives while `[` is on top: wrong order. The third ends with a bracket still open (`not stack` is False). The fourth closes a bracket that was never opened, which the `not stack` test catches before `pop()` would fail.",
      },
      {
        kind: "error-example",
        title: "Popping an empty stack",
        code: src`
history = ["typed Hello"]
print(history.pop())
print(history.pop())
`,
        error: "IndexError",
        output: "typed Hello\n",
        note: "`IndexError: pop from empty list`. Check `if history:` before popping whenever the stack may be empty.",
      },
      {
        kind: "text",
        md: "A **queue** is first in, first out (FIFO): the item that has waited longest goes next, as in a support desk. A list *can* do this with `pop(0)`, but a list stores its items in one block, so removing the first item moves every other item one place left: O(n) per removal, O(n²) for a whole queue. `collections.deque` is built for both ends: `append` adds at the back and `popleft` takes from the front, both O(1).",
      },
      {
        kind: "example",
        title: "A support queue, oldest ticket first",
        code: src`
from collections import deque

tickets = deque(["T-101 login", "T-102 refund", "T-103 address"])
tickets.append("T-104 refund")
while tickets:
    ticket = tickets.popleft()
    print("handling", ticket, "| still waiting:", len(tickets))
`,
        output: "handling T-101 login | still waiting: 3\nhandling T-102 refund | still waiting: 2\nhandling T-103 address | still waiting: 1\nhandling T-104 refund | still waiting: 0\n",
        note: "Tickets come out in the order they arrived, and the late T-104 waits its turn. With `pop()` instead of `popleft()`, T-104 would jump the queue.",
      },
      {
        kind: "text",
        md: "**When to use which:** a stack when the newest item must be handled first (undo, matching, walking a tree depth-first); a queue when the oldest must go first (fair processing, retry lines, searching level by level so the nearest answers are found first). **Mistakes to avoid:** `pop()` where you meant a queue (silently unfair), `list.pop(0)` on long queues (slow), and popping without checking for empty.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Print jobs in arrival order",
      prompt: "The office printer should print jobs in the order they were sent, but `print_order` takes the newest job first. Change one call so the oldest job goes first, and run it.",
      spec: [
        ["Function", "`print_order(jobs)`"],
        ["Returns", "the jobs in the order they are printed"],
        ["Example", "`[\"invoice.pdf\", \"label.pdf\", \"report.pdf\"]` → the same order"],
      ],
      starter: src`
from collections import deque

def print_order(jobs):
    waiting = deque(jobs)
    printed = []
    while waiting:
        printed.append(waiting.pop())
    return printed

print(print_order(["invoice.pdf", "label.pdf", "report.pdf"]))
`,
      answer: src`
from collections import deque

def print_order(jobs):
    waiting = deque(jobs)
    printed = []
    while waiting:
        printed.append(waiting.popleft())
    return printed

print(print_order(["invoice.pdf", "label.pdf", "report.pdf"]))
`,
      wrong: [
        {
          code: src`
def print_order(jobs):
    return ["invoice.pdf", "label.pdf", "report.pdf"]
`,
          fails: ["returns"],
          why: "the three names are typed in, so any other list of jobs comes out wrong",
        },
      ],
      hints: [
        "`pop()` takes from the right end of a deque, where the newest job was added.",
        "A fair queue takes from the other end.",
        "Swap `pop` for the deque method that removes from the left.",
      ],
      task: {
        checks: [
          fn("returns", "print_order", [
            example([["invoice.pdf", "label.pdf", "report.pdf"]], ["invoice.pdf", "label.pdf", "report.pdf"]),
            hiddenCase("one job", [["notes.txt"]], ["notes.txt"]),
            hiddenCase("no jobs", [[]], []),
          ], { label: "print_order() prints the oldest job first" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An editor with undo",
        prompt: "A small text editor records what the user does. Write `editor_text(actions)` that replays the actions and returns the final text. `[\"type\", text]` adds text at the end; `[\"undo\"]` removes the most recent typing that hasn't been undone yet; an undo with nothing left to undo does nothing.",
        spec: [
          ["Function", "`editor_text(actions)`"],
          ["actions", "a list of `[\"type\", text]` and `[\"undo\"]` lists, in the order they happened"],
          ["Returns", "the text left after every action, as one string"],
          ["Example", "`[[\"type\", \"Dear Nora\"], [\"type\", \",\"], [\"undo\"], [\"type\", \":\"]]` → `\"Dear Nora:\"`"],
        ],
        starter: src`
def editor_text(actions):
    return ""

print(editor_text([["type", "Dear Nora"], ["type", ","], ["undo"], ["type", ":"]]))
`,
        answer: src`
def editor_text(actions):
    typed = []
    for action in actions:
        if action[0] == "type":
            typed.append(action[1])
        elif action[0] == "undo" and typed:
            typed.pop()
    return "".join(typed)

print(editor_text([["type", "Dear Nora"], ["type", ","], ["undo"], ["type", ":"]]))
`,
        alternatives: [
          src`
def editor_text(actions):
    stack = []
    for action in actions:
        match action:
            case ["type", text]:
                stack.append(text)
            case ["undo"]:
                if stack:
                    stack.pop()
    text = ""
    for piece in stack:
        text += piece
    return text
`,
        ],
        wrong: [
          {
            code: src`
def editor_text(actions):
    typed = []
    for action in actions:
        if action[0] == "type":
            typed.append(action[1])
        elif typed:
            typed.pop(0)
    return "".join(typed)
`,
            fails: ["returns"],
            why: "undo removes the oldest typing instead of the newest",
          },
          {
            code: src`
def editor_text(actions):
    typed = []
    for action in actions:
        if action[0] == "type":
            typed.append(action[1])
        else:
            typed.pop()
    return "".join(typed)
`,
            fails: ["returns"],
            why: "an undo with nothing left to undo crashes with IndexError instead of doing nothing",
          },
        ],
        hints: [
          "Undo always cancels the latest change that is still in effect: newest first.",
          "Keep each piece of typed text on a stack; undo pops the top piece.",
          "Only pop when the stack isn't empty, and join the remaining pieces at the end.",
        ],
        task: {
          checks: [
            fn("returns", "editor_text", [
              example([[["type", "Dear Nora"], ["type", ","], ["undo"], ["type", ":"]]], "Dear Nora:"),
              example([[["type", "Hi"], ["undo"], ["undo"], ["type", "Hello"]]], "Hello"),
              example([[]], ""),
              hiddenCase("several undos in a row", [[["type", "a"], ["type", "b"], ["type", "c"], ["undo"], ["undo"]]], "a"),
              hiddenCase("an undo before any typing", [[["undo"], ["type", "Order shipped"]]], "Order shipped"),
              hiddenCase("everything undone", [[["type", "x"], ["undo"]]], ""),
            ], { label: "editor_text() replays typing and undo" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Fewest connections between airports",
        prompt: "A travel site shows the fewest flights needed between two airports. Write `fewest_flights(routes, start, goal)`: `routes` maps each airport to the airports it has direct flights to. Return the smallest number of flights from `start` to `goal`, `0` when they are the same airport, or `-1` when the goal can't be reached. Search level by level with a queue, so the first time you reach the goal is by the fewest flights.",
        spec: [
          ["Function", "`fewest_flights(routes, start, goal)`"],
          ["routes", "a dictionary: airport code → list of airport codes with a direct flight (an airport may be missing from the keys, meaning no flights leave it)"],
          ["Returns", "the minimum number of flights, `0` for the same airport, `-1` if unreachable"],
          ["Example", "with the starter's routes, `\"JFK\"` → `\"SEA\"` is `3` (JFK→ORD→DEN→SEA)"],
        ],
        starter: src`
def fewest_flights(routes, start, goal):
    return -1

routes = {
    "JFK": ["BOS", "ORD"],
    "BOS": ["ORD"],
    "ORD": ["DEN", "MIA"],
    "DEN": ["SEA"],
    "MIA": [],
    "SEA": [],
}
print(fewest_flights(routes, "JFK", "SEA"))
print(fewest_flights(routes, "SEA", "JFK"))
`,
        answer: src`
from collections import deque

def fewest_flights(routes, start, goal):
    flights = {start: 0}
    waiting = deque([start])
    while waiting:
        airport = waiting.popleft()
        if airport == goal:
            return flights[airport]
        for next_airport in routes.get(airport, []):
            if next_airport not in flights:
                flights[next_airport] = flights[airport] + 1
                waiting.append(next_airport)
    return -1

routes = {
    "JFK": ["BOS", "ORD"],
    "BOS": ["ORD"],
    "ORD": ["DEN", "MIA"],
    "DEN": ["SEA"],
    "MIA": [],
    "SEA": [],
}
print(fewest_flights(routes, "JFK", "SEA"))
print(fewest_flights(routes, "SEA", "JFK"))
`,
        alternatives: [
          src`
from collections import deque

def fewest_flights(routes, start, goal):
    if start == goal:
        return 0
    seen = {start: True}
    level = deque([(start, 0)])
    while level:
        airport, count = level.popleft()
        for nxt in routes.get(airport, []):
            if nxt == goal:
                return count + 1
            if nxt not in seen:
                seen[nxt] = True
                level.append((nxt, count + 1))
    return -1
`,
        ],
        wrong: [
          {
            code: src`
def fewest_flights(routes, start, goal):
    flights = {start: 0}
    waiting = [start]
    while waiting:
        airport = waiting.pop()
        if airport == goal:
            return flights[airport]
        for next_airport in routes.get(airport, []):
            if next_airport not in flights:
                flights[next_airport] = flights[airport] + 1
                waiting.append(next_airport)
    return -1
`,
            fails: ["returns"],
            why: "a stack explores the newest airport first, so the goal can be reached first by a longer route",
          },
          {
            code: src`
from collections import deque

def fewest_flights(routes, start, goal):
    flights = {start: 0}
    waiting = deque([start])
    while waiting:
        airport = waiting.popleft()
        if airport == goal:
            return flights[airport]
        for next_airport in routes[airport]:
            if next_airport not in flights:
                flights[next_airport] = flights[airport] + 1
                waiting.append(next_airport)
    return -1
`,
            fails: ["returns"],
            why: "an airport with no entry in `routes` raises KeyError instead of being treated as having no flights",
          },
        ],
        hints: [
          "Searching level by level means: all airports one flight away, then all two flights away, and so on. A queue gives exactly that order.",
          "Remember how many flights it took to reach each airport the first time; an airport already reached is never queued again (that also stops loops).",
          "Return as soon as the goal comes out of the queue; if the queue runs dry, the goal is unreachable. Use `get` with an empty list for airports with no entry.",
        ],
        task: {
          checks: [
            fn("returns", "fewest_flights", [
              example([routes, "JFK", "SEA"], 3),
              example([routes, "SEA", "JFK"], -1),
              example([routes, "ORD", "ORD"], 0),
              hiddenCase("a direct flight", [routes, "JFK", "BOS"], 1),
              hiddenCase("a route that loops back", [{ A: ["B"], B: ["A", "C"], C: ["D"] }, "A", "D"], 3),
              hiddenCase("a short route and a longer one explored first by a stack", [{ A: ["B", "C"], B: ["G"], C: ["D"], D: ["G"], G: [] }, "A", "G"], 2),
              hiddenCase("an airport with no entry in routes", [{ A: ["B"] }, "A", "C"], -1),
            ], { label: "fewest_flights() finds the minimum number of flights" }),
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

stack = []
queue = deque()
for code in ["A", "B", "C"]:
    stack.append(code)
    queue.append(code)
print(stack.pop(), queue.popleft(), stack.pop(), queue.popleft())
`,
        choices: ["C A B B", "A A B B", "C C B B", "A C B B"],
        answer: 0,
        why: "The stack gives back the newest item (C, then B); the queue gives back the oldest (A, then B).",
      },
      {
        id: "q2",
        prompt: "A common mistake: this is meant to serve customers in arrival order. What does it print?",
        program: src`
waiting = ["Nora", "Jamal", "Grace"]
served = []
while waiting:
    served.append(waiting.pop())
print(served)
`,
        choices: ["['Grace', 'Jamal', 'Nora']", "['Nora', 'Jamal', 'Grace']", "['Grace']", "['Nora']"],
        answer: 0,
        why: "`pop()` takes from the end, so the last to arrive is served first. A queue needs `popleft()` on a deque (or `pop(0)`, which is slow on long lists).",
      },
      {
        id: "q3",
        prompt: "Which job needs a queue rather than a stack?",
        choices: [
          "Retrying failed uploads in the order they failed",
          "Undoing the latest edits one at a time",
          "Checking that HTML tags close in the right order",
          "Going back through pages with a browser's Back button",
        ],
        answer: 0,
        why: "Retries in failure order are first in, first out. Undo, tag matching and Back all need the most recent item first: a stack.",
      },
    ],
    review: [
      "Stack: `append` and `pop()` on a list, newest first (undo, brackets, depth-first walks).",
      "Queue: `append` and `popleft()` on a deque, oldest first (fair processing, level-by-level search).",
      "`list.pop(0)` shifts every remaining item, so a list makes an O(n²) queue.",
      "Next: recursion uses a stack too, the interpreter's own, and that has limits and costs.",
    ],
  },

  // ------------------------------------------------------------------ PY-L35-05 recursion trade-offs
  {
    id: "PY-L35-05",
    version: 2,
    slug: "recursion-trade-offs",
    title: "Recursion trade-offs: depth and repeated work",
    lede: "Recursion is a natural fit for nested data, but every call costs a frame on Python's call stack, and a recursion that repeats subproblems can explode. Loops and explicit stacks avoid both.",
    focus: "Recognise when recursion repeats work or runs too deep, and rewrite it with a loop or an explicit stack.",
    minutes: 22,
    objectives: [
      "Count the calls a recursive function makes and spot exponential repetition",
      "Explain RecursionError and the default limit of about 1,000 frames",
      "Rewrite a recursive tree walk as a loop with an explicit stack",
    ],
    requires: ["arithmetic", "assignment", "comparison", "deque-call", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "membership", "nested-dict", "nested-loop", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "while-loop"],
    teaches: ["recursion-limit", "recursion-cost"],
    blocks: [
      {
        kind: "text",
        md: "In the Advanced Functions & Recursion module a function called itself until a base case. Two costs come with that. First, a function that calls itself **twice** per step can solve the same small problem over and over. Counting the calls shows it: the number of ways to climb a staircase taking 1 or 2 steps at a time is the ways for one step less plus the ways for two steps less.",
      },
      {
        kind: "example",
        title: "Counting the calls",
        code: src`
counter = {"calls": 0}

def ways(steps):
    counter["calls"] += 1
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

for n in [10, 20, 25]:
    counter["calls"] = 0
    print(n, ways(n), counter["calls"])
`,
        output: "10 89 177\n20 10946 21891\n25 121393 242785\n",
        note: "Five more steps multiply the calls by about 11: the work grows **exponentially**, because `ways(18)`, `ways(17)` and the rest are recomputed inside every branch. `ways(40)` would need over 300 million calls. A loop that keeps the last two answers needs one pass of 40 steps (the try-it below).",
      },
      {
        kind: "text",
        md: "Second, every call that hasn't returned yet keeps a **frame** (its local variables and where to continue) on the interpreter's call stack. CPython stops at about 1,000 frames by default (`sys.getrecursionlimit()`) and raises `RecursionError` rather than run out of memory. Nested data from the outside world (a comment thread, a folder tree, a JSON document) can easily be deeper than that.",
      },
      {
        kind: "error-example",
        title: "A reply chain 1,200 levels deep",
        code: src`
def count_comments(comment):
    total = 1
    for reply in comment["replies"]:
        total += count_comments(reply)
    return total

thread = {"text": "first", "replies": []}
current = thread
for n in range(1200):
    reply = {"text": f"reply {n}", "replies": []}
    current["replies"].append(reply)
    current = reply
print(count_comments(thread))
`,
        error: "RecursionError",
        output: "",
        note: "`RecursionError: maximum recursion depth exceeded`. The code is correct for shallow threads; the data is simply deeper than the call stack allows. Raising the limit with `sys.setrecursionlimit` only moves the problem, and set too high it can crash the interpreter.",
      },
      {
        kind: "text",
        md: "The fix is to keep the stack yourself. A recursive walk remembers *what is left to visit* in its frames; a loop can remember the same thing in a list used as a stack (“Stacks and queues”), which is limited only by memory.",
      },
      {
        kind: "example",
        title: "Folder sizes with an explicit stack",
        code: src`
def folder_size(folder):
    total = 0
    stack = [folder]
    while stack:
        current = stack.pop()
        total += current["size"]
        for child in current["children"]:
            stack.append(child)
    return total

project = {"size": 4, "children": [
    {"size": 120, "children": []},
    {"size": 8, "children": [{"size": 300, "children": []}]},
]}
print(folder_size(project))

deep = {"size": 1, "children": []}
current = deep
for n in range(1200):
    child = {"size": 1, "children": []}
    current["children"].append(child)
    current = child
print(folder_size(deep))
`,
        output: "432\n1201\n",
        note: "Each pass pops one folder, adds its size, and pushes its children to visit later. Depth no longer matters: 1,201 nested folders are summed without a single extra frame, and 100,000 would be too.",
      },
      {
        kind: "text",
        md: "**When to use what:** recursion is clear and fine when the depth is small and known (a menu three levels deep, a balanced tree) and each subproblem is solved once. Switch to a loop when subproblems repeat (keep earlier answers, as the try-it does) or when the depth comes from data you don't control. The Profiling & Optimization module shows a third option, caching results. **Mistakes to avoid:** a missing or unreachable base case (infinite recursion ends in RecursionError), and raising the recursion limit instead of fixing the algorithm.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Climb the stairs with a loop",
      prompt: "This loop version of `stairs` keeps the ways to reach the last two steps, but the line that moves them forward doesn't change anything. Fix that one line: the new `one_back` is the sum of both, and the new `two_back` is the old `one_back`. Run it; `stairs(70)` comes back instantly.",
      spec: [
        ["Function", "`stairs(n)`"],
        ["Returns", "the number of ways to climb `n` steps taking 1 or 2 at a time (`stairs(0)` and `stairs(1)` are 1)"],
        ["Example", "`stairs(5)` → `8`"],
      ],
      starter: src`
def stairs(n):
    one_back, two_back = 1, 1
    for step in range(2, n + 1):
        one_back, two_back = one_back, two_back
    return one_back

print(stairs(5))
print(stairs(70))
`,
      answer: src`
def stairs(n):
    one_back, two_back = 1, 1
    for step in range(2, n + 1):
        one_back, two_back = one_back + two_back, one_back
    return one_back

print(stairs(5))
print(stairs(70))
`,
      wrong: [
        {
          code: src`
def stairs(n):
    one_back, two_back = 1, 1
    for step in range(2, n + 1):
        one_back = one_back + two_back
        two_back = one_back
    return one_back
`,
          fails: ["returns"],
          why: "updating one name at a time makes `two_back` copy the *new* value, so every step just doubles",
        },
      ],
      hints: [
        "The ways to reach a step are the ways to reach the step before it plus the ways to reach the one before that.",
        "Both names must move forward together, using their old values.",
        "A tuple assignment computes every right-hand value before storing any of them.",
      ],
      task: {
        checks: [
          fn("returns", "stairs", [
            example([5], 8),
            example([1], 1),
            hiddenCase("zero steps", [0], 1),
            hiddenCase("a long staircase", [70], 308061521170129),
          ], { label: "stairs() counts the ways to climb" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "How deep does a thread go?",
        prompt: "A forum shows a warning when a discussion nests too deeply. Write `thread_depth(comment)`: a comment is a dictionary with `\"text\"` and `\"replies\"` (a list of comments). A comment with no replies has depth 1; otherwise its depth is 1 plus the deepest reply. The hidden test includes a thread 1,200 levels deep, deeper than Python's recursion limit, so don't use recursion.",
        spec: [
          ["Function", "`thread_depth(comment)`"],
          ["comment", "`{\"text\": ..., \"replies\": [...]}`, nested to any depth"],
          ["Returns", "the number of levels in the deepest chain of replies, counting the first comment"],
          ["Example", "a comment with two replies, one of which has its own reply → `3`"],
        ],
        starter: src`
def thread_depth(comment):
    return 1

thread = {"text": "Is the bike light waterproof?", "replies": [
    {"text": "Yes, IPX4.", "replies": [{"text": "Thanks!", "replies": []}]},
    {"text": "Mine survived rain.", "replies": []},
]}
print(thread_depth(thread))
`,
        answer: src`
def thread_depth(comment):
    deepest = 0
    stack = [(comment, 1)]
    while stack:
        current, level = stack.pop()
        if level > deepest:
            deepest = level
        for reply in current["replies"]:
            stack.append((reply, level + 1))
    return deepest

thread = {"text": "Is the bike light waterproof?", "replies": [
    {"text": "Yes, IPX4.", "replies": [{"text": "Thanks!", "replies": []}]},
    {"text": "Mine survived rain.", "replies": []},
]}
print(thread_depth(thread))
`,
        alternatives: [
          src`
from collections import deque

def thread_depth(comment):
    level = 0
    current_level = deque([comment])
    while current_level:
        level += 1
        next_level = deque()
        for item in current_level:
            next_level.extend(item["replies"])
        current_level = next_level
    return level
`,
        ],
        wrong: [
          {
            code: src`
def thread_depth(comment):
    deepest = 0
    for reply in comment["replies"]:
        deepest = max(deepest, thread_depth(reply))
    return deepest + 1
`,
            fails: ["deep"],
            why: "correct for normal threads, but the 1,200-level thread raises RecursionError",
          },
          {
            code: src`
def thread_depth(comment):
    total = 0
    stack = [comment]
    while stack:
        current = stack.pop()
        total += 1
        for reply in current["replies"]:
            stack.append(reply)
    return total
`,
            fails: ["returns"],
            why: "it counts every comment instead of the levels of the deepest chain",
          },
        ],
        hints: [
          "Use a list as a stack of comments still to visit, as the folder example does.",
          "Depth isn't a property of a comment on its own, so push each comment together with its level as a pair.",
          "When you pop a pair, update the deepest level seen and push every reply with one level more.",
        ],
        task: {
          checks: [
            fn("returns", "thread_depth", [
              example([{ text: "Is the bike light waterproof?", replies: [{ text: "Yes, IPX4.", replies: [{ text: "Thanks!", replies: [] }] }, { text: "Mine survived rain.", replies: [] }] }], 3),
              example([{ text: "Great tent.", replies: [] }], 1),
              example([{ text: "a", replies: [{ text: "b", replies: [] }, { text: "c", replies: [] }] }], 2),
              hiddenCase("the deepest chain in the last reply", [{ text: "a", replies: [{ text: "b", replies: [] }, { text: "c", replies: [{ text: "d", replies: [{ text: "e", replies: [] }] }] }] }], 4),
            ], { label: "thread_depth() measures the deepest chain of replies" }),
            {
              kind: "expr",
              id: "deep",
              label: "thread_depth() handles a thread 1,200 levels deep",
              hidden: true,
              expr: [
                "def _deep_thread():",
                "    root = {'text': 'start', 'replies': []}",
                "    current = root",
                "    for _ in range(1199):",
                "        reply = {'text': 'r', 'replies': []}",
                "        current['replies'].append(reply)",
                "        current = reply",
                "    try:",
                "        return thread_depth(root)",
                "    except RecursionError:",
                "        return 'RecursionError'",
                "result = _deep_thread()",
              ].join("\n"),
              expected: py.int(1200),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Every category path, in menu order",
        prompt: "A shop's category tree feeds a navigation menu. Write `category_paths(tree)` that returns every category as a path like `\"Home > Kitchen > Knives\"`, in the order a menu lists them: a category, then all of its subcategories (in their order) before its next sibling. Trees can be thousands of levels deep, so use an explicit stack rather than recursion.",
        spec: [
          ["Function", "`category_paths(tree)`"],
          ["tree", "`{\"name\": ..., \"children\": [...]}`, where each child has the same shape"],
          ["Returns", "a list of paths joined with `\" > \"`, parent before children, children in their listed order"],
          ["Example", "the starter's tree → `['Home', 'Home > Kitchen', 'Home > Kitchen > Knives', 'Home > Kitchen > Pans', 'Home > Decor']`"],
        ],
        starter: src`
def category_paths(tree):
    paths = []
    return paths

tree = {"name": "Home", "children": [
    {"name": "Kitchen", "children": [
        {"name": "Knives", "children": []},
        {"name": "Pans", "children": []},
    ]},
    {"name": "Decor", "children": []},
]}
print(category_paths(tree))
`,
        answer: src`
def category_paths(tree):
    paths = []
    stack = [(tree, tree["name"])]
    while stack:
        node, path = stack.pop()
        paths.append(path)
        for child in reversed(node["children"]):
            stack.append((child, path + " > " + child["name"]))
    return paths

tree = {"name": "Home", "children": [
    {"name": "Kitchen", "children": [
        {"name": "Knives", "children": []},
        {"name": "Pans", "children": []},
    ]},
    {"name": "Decor", "children": []},
]}
print(category_paths(tree))
`,
        alternatives: [
          src`
def category_paths(tree):
    paths = []
    stack = [([tree["name"]], tree)]
    while stack:
        names, node = stack.pop()
        paths.append(" > ".join(names))
        children = node["children"]
        for i in range(len(children) - 1, -1, -1):
            stack.append((names + [children[i]["name"]], children[i]))
    return paths
`,
        ],
        wrong: [
          {
            code: src`
def category_paths(tree):
    paths = []
    stack = [(tree, tree["name"])]
    while stack:
        node, path = stack.pop()
        paths.append(path)
        for child in node["children"]:
            stack.append((child, path + " > " + child["name"]))
    return paths
`,
            fails: ["returns"],
            why: "children are pushed in order, so the stack pops the last one first and the menu comes out backwards",
          },
          {
            code: src`
from collections import deque

def category_paths(tree):
    paths = []
    waiting = deque([(tree, tree["name"])])
    while waiting:
        node, path = waiting.popleft()
        paths.append(path)
        for child in node["children"]:
            waiting.append((child, path + " > " + child["name"]))
    return paths
`,
            fails: ["returns"],
            why: "a queue lists the tree level by level, so Decor appears before Kitchen's subcategories",
          },
          {
            code: src`
def category_paths(tree):
    paths = [tree["name"]]
    for child in tree["children"]:
        for path in category_paths(child):
            paths.append(tree["name"] + " > " + path)
    return paths
`,
            fails: ["deep"],
            why: "the recursion gives the right order, but a very deep tree raises RecursionError",
          },
        ],
        hints: [
          "Push each category together with the path that leads to it, so the path is ready when it is popped.",
          "A stack pops the most recently pushed item first: to visit children in their listed order, push them in the opposite order.",
          "`reversed(...)` walks a list from the end without changing it.",
        ],
        task: {
          checks: [
            fn("returns", "category_paths", [
              example([categoryTree], ["Home", "Home > Kitchen", "Home > Kitchen > Knives", "Home > Kitchen > Pans", "Home > Decor"]),
              example([{ name: "Books", children: [] }], ["Books"]),
              example([{ name: "Sports", children: [{ name: "Bikes", children: [] }, { name: "Camping", children: [{ name: "Tents", children: [] }] }] }], ["Sports", "Sports > Bikes", "Sports > Camping", "Sports > Camping > Tents"]),
              hiddenCase("three siblings with their own children", [{ name: "A", children: [{ name: "B", children: [{ name: "C", children: [] }] }, { name: "D", children: [] }, { name: "E", children: [{ name: "F", children: [] }] }] }], ["A", "A > B", "A > B > C", "A > D", "A > E", "A > E > F"]),
            ], { label: "category_paths() lists every path in menu order" }),
            fn("keeps-input", "category_paths", [keepsInput([categoryTree])], { label: "category_paths() leaves the tree unchanged" }),
            {
              kind: "expr",
              id: "deep",
              label: "category_paths() handles a tree 1,200 levels deep",
              hidden: true,
              expr: [
                "def _deep_tree():",
                "    root = {'name': 'c', 'children': []}",
                "    current = root",
                "    for _ in range(1199):",
                "        child = {'name': 'c', 'children': []}",
                "        current['children'].append(child)",
                "        current = child",
                "    try:",
                "        paths = category_paths(root)",
                "    except RecursionError:",
                "        return 'RecursionError'",
                "    return [len(paths), paths[-1].count('>')]",
                "result = _deep_tree()",
              ].join("\n"),
              expected: py.list(py.int(1200), py.int(1199)),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
calls = [0]

def ways(steps):
    calls[0] += 1
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

print(ways(4), calls[0])
`,
        choices: ["5 9", "5 5", "4 9", "5 7"],
        answer: 0,
        why: "ways(4) = ways(3) + ways(2) = 3 + 2 = 5. The calls: ways(4) makes 1 + the 5 calls of ways(3) + the 3 calls of ways(2) = 9. ways(2) is computed twice, ways(1) three times: repeated work.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the base case can never be reached. What does this print?",
        program: src`
def countdown(n):
    if n == 0:
        return "liftoff"
    return countdown(n - 2)

try:
    print(countdown(5))
except RecursionError:
    print("RecursionError")
`,
        choices: ["RecursionError", "liftoff", "(nothing)", "0"],
        answer: 0,
        why: "5, 3, 1, -1, … skips 0, so the function calls itself until Python's frame limit stops it with RecursionError. A base case must be reachable from every input (`n <= 0` here).",
      },
      {
        id: "q3",
        prompt: "When is plain recursion the right choice?",
        choices: [
          "Walking a settings menu that is at most four levels deep",
          "Summing a folder tree uploaded by users, of unknown depth",
          "Computing ways(60) by calling ways(n - 1) + ways(n - 2)",
          "Following a reply chain that can be thousands of levels deep",
        ],
        answer: 0,
        why: "Shallow, known depth with no repeated subproblems is where recursion is clearest. Unknown depth needs an explicit stack, and repeated subproblems need a loop (or the caching the Profiling & Optimization module introduces).",
      },
    ],
    review: [
      "Count calls: a function that calls itself twice per step on overlapping problems does exponential work.",
      "Each pending call is a frame; past about 1,000 (`sys.getrecursionlimit()`) Python raises RecursionError.",
      "A loop that keeps earlier answers removes repetition; a list used as a stack removes the depth limit.",
      "Next module: what all these objects cost in memory, and how CPython manages it.",
    ],
  },
];
