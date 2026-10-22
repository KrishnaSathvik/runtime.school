/**
 * M35 practice: ten independent problems on the algorithms of PY-L35-01 … PY-L35-05.
 *
 * Mix: 5 function implementations, 1 debugging (a genuinely broken lookup), 1 validation (tag nesting with a stack),
 * 1 refactoring (a nested-loop join made into an index without changing its behaviour, graded by the same cases plus
 * a read budget), 1 data transformation (a round-robin queue), 1 output prediction. Easy: 02, 03, 06. Medium: 10, 12,
 * 13, 16, 19. Hard: 20, 22.
 *
 * Efficiency is graded deterministically: an instrumented list counts the items a solution reads, or an instrumented
 * str counts its == comparisons, so a correct but quadratic answer fails only the budget check. Fixtures are slices of
 * course data: airline flights and carriers (D13), Runtime Market customers and products (R01), taxi pickups (D06).
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";
import { eqBudget, readBudget } from "../lessons/M35";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const within = py.bool(true);
const pair = (name: string, n: number) => py.tuple(py.str(name), py.int(n));

// ---------------------------------------------------------------- fixtures

const leaderboard = [52, 61, 61, 70, 88];
const airlines = [
  { airline_code: "AA", airline_name: "American Airlines" },
  { airline_code: "B6", airline_name: "JetBlue Airways" },
  { airline_code: "UA", airline_name: "United Air Lines" },
];
const flights = [
  { flight_id: "12207", airline_code: "UA" },
  { flight_id: "12208", airline_code: "MQ" },
  { flight_id: "12209", airline_code: "AA" },
];
const catalogue = { "SPO-11681": "Ultra Bike Light", "HOM-22847": "Deluxe Vase", "ELE-24781": "Organic Speaker" };

export const m35Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q35-02",
    version: 2,
    slug: "leaderboard-rank",
    title: "Rank on a leaderboard",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "bisect-call", "comparison", "else-clause", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-literal", "precedence", "print-call", "print-several", "reassignment", "string-index", "top-level-indent", "while-loop"],
    prompt: "A quiz app keeps every player's score in a sorted list. After each game it shows the player their rank: 1 plus the number of players who scored **more**, so equal scores share a rank. The list holds hundreds of thousands of scores, so answer with a binary search, not a scan.",
    spec: [
      ["Function", "`rank_of(scores, score)`"],
      ["scores", "every player's score, sorted from lowest to highest (scores may repeat)"],
      ["Returns", "`1 +` the number of scores strictly greater than `score`; `score` doesn't have to be in the list"],
      ["Constraint", "read at most 40 of 100,000 scores"],
    ],
    hiddenKinds: ["an empty leaderboard", "a score higher than everyone's", "a score between two others", "everyone tied", "a leaderboard of 100,000 scores (read budget)"],
    hints: [
      "Everyone who scored more sits at the end of the sorted list, after every score that is less than or equal to this one.",
      "One bisect call tells you where the scores that are less than or equal to `score` end.",
      "The players after that position are the ones who scored more; the rank is how many of them there are, plus one.",
    ],
    explanation: "`bisect_right(scores, score)` is the position just after the last score `<= score`, so `len(scores) - bisect_right(scores, score)` players scored more, and the rank is that plus 1. It reads about log2(n) scores. `bisect_left` would also count the tied players as better, and a loop gives the right answer but reads the whole list.",
    code: {
      starter: src`
def rank_of(scores, score):
    return 1

print(rank_of([52, 61, 61, 70, 88], 61))
`,
      answer: src`
from bisect import bisect_right

def rank_of(scores, score):
    return len(scores) - bisect_right(scores, score) + 1

print(rank_of([52, 61, 61, 70, 88], 61))
`,
      alternatives: [
        src`
def rank_of(scores, score):
    low = 0
    high = len(scores)
    while low < high:
        middle = (low + high) // 2
        if scores[middle] <= score:
            low = middle + 1
        else:
            high = middle
    return len(scores) - low + 1
`,
      ],
      wrong: [
        {
          code: src`
def rank_of(scores, score):
    better = 0
    for other in scores:
        if other > score:
            better += 1
    return better + 1
`,
          fails: ["reads"],
          why: "right ranks, but every score is read: 100,000 reads instead of about 17",
        },
        {
          code: src`
from bisect import bisect_left

def rank_of(scores, score):
    return len(scores) - bisect_left(scores, score) + 1
`,
          fails: ["returns"],
          why: "`bisect_left` counts the players tied with this score as better, so ties don't share a rank",
        },
      ],
      task: {
        checks: [
          fn("returns", "rank_of", [
            example([leaderboard, 61], 3),
            example([leaderboard, 88], 1),
            example([leaderboard, 50], 6),
            hiddenCase("an empty leaderboard", [[], 75], 1),
            hiddenCase("a score higher than everyone's", [leaderboard, 99], 1),
            hiddenCase("a score between two others", [leaderboard, 65], 3),
            hiddenCase("everyone tied", [[40, 40, 40], 40], 1),
          ], { label: "rank_of() counts the players who scored more" }),
          { kind: "expr", id: "reads", label: "rank_of() reads at most 40 of 100,000 scores", hidden: true, expr: readBudget("range(100000)", "rank_of(_data, 4321)", 40), expected: within },
        ],
      },
    },
  },
  {
    id: "PY-Q35-03",
    version: 2,
    slug: "unknown-skus",
    title: "Fix the unknown-SKU report",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "boolean", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "Before an import, a script lists the SKUs in incoming orders that aren't in the product catalogue (a dictionary from SKU to product name). It reports **every** SKU as unknown, even ones the catalogue clearly has, and it is slow on a big catalogue. Find the bug and fix it without changing what the report should contain.",
    spec: [
      ["Function", "`unknown_skus(order_skus, catalogue)`"],
      ["catalogue", "a dictionary: SKU → product name (a name may be an empty string while it is being written)"],
      ["Returns", "each SKU from `order_skus` that is not a key of the catalogue, once, in the order first seen"],
    ],
    hiddenKinds: ["every SKU known", "an unknown SKU ordered twice", "a known SKU whose name is still empty", "no orders", "SKUs differing only in case"],
    hints: [
      "Print `catalogue.values()` for the example: what does the loop actually compare the SKUs with?",
      "A dictionary's `in` already checks its keys, by hashing.",
      "Test the dictionary itself, not something derived from its values, and keep the rule about reporting each SKU once.",
    ],
    explanation: "`sku not in catalogue.values()` compares each SKU with the product **names**, which never match, so every SKU looks unknown; it is also a scan of every value for every order. `sku not in catalogue` checks the keys with one hash lookup. Tempting half-fixes: `if not catalogue.get(sku)` treats a known SKU with an empty name as unknown, and dropping the `unknown` check reports repeats.",
    code: {
      starter: src`
def unknown_skus(order_skus, catalogue):
    unknown = []
    for sku in order_skus:
        if sku not in catalogue.values():
            if sku not in unknown:
                unknown.append(sku)
    return unknown

catalogue = {"SPO-11681": "Ultra Bike Light", "HOM-22847": "Deluxe Vase", "ELE-24781": "Organic Speaker"}
print(unknown_skus(["HOM-22847", "GRO-10442", "SPO-11681", "GRO-10442"], catalogue))
`,
      answer: src`
def unknown_skus(order_skus, catalogue):
    unknown = []
    for sku in order_skus:
        if sku not in catalogue:
            if sku not in unknown:
                unknown.append(sku)
    return unknown

catalogue = {"SPO-11681": "Ultra Bike Light", "HOM-22847": "Deluxe Vase", "ELE-24781": "Organic Speaker"}
print(unknown_skus(["HOM-22847", "GRO-10442", "SPO-11681", "GRO-10442"], catalogue))
`,
      alternatives: [
        src`
def unknown_skus(order_skus, catalogue):
    reported = {}
    for sku in order_skus:
        if sku not in catalogue.keys() and sku not in reported:
            reported[sku] = True
    return list(reported)
`,
      ],
      wrong: [
        {
          code: src`
def unknown_skus(order_skus, catalogue):
    unknown = []
    for sku in order_skus:
        if not catalogue.get(sku):
            if sku not in unknown:
                unknown.append(sku)
    return unknown
`,
          fails: ["returns"],
          why: "a known SKU whose name is still an empty string is reported as unknown",
        },
        {
          code: src`
def unknown_skus(order_skus, catalogue):
    unknown = []
    for sku in order_skus:
        if sku not in catalogue:
            unknown.append(sku)
    return unknown
`,
          fails: ["returns"],
          why: "an unknown SKU that was ordered twice is reported twice",
        },
      ],
      task: {
        checks: [
          fn("returns", "unknown_skus", [
            example([["HOM-22847", "GRO-10442", "SPO-11681", "GRO-10442"], catalogue], ["GRO-10442"]),
            example([["BOO-58412", "HOM-52782"], catalogue], ["BOO-58412", "HOM-52782"]),
            example([["ELE-24781"], catalogue], []),
            hiddenCase("every SKU known", [["SPO-11681", "HOM-22847", "SPO-11681"], catalogue], []),
            hiddenCase("an unknown SKU ordered twice", [["X-1", "X-2", "X-1"], {}], ["X-1", "X-2"]),
            hiddenCase("a known SKU whose name is still empty", [["NEW-00001", "OLD-1"], { "NEW-00001": "" }], ["OLD-1"]),
            hiddenCase("no orders", [[], catalogue], []),
            hiddenCase("SKUs differing only in case", [["hom-22847"], catalogue], ["hom-22847"]),
          ], { label: "unknown_skus() reports SKUs missing from the catalogue, once each" }),
        ],
      },
    },
  },
  {
    id: "PY-Q35-06",
    version: 2,
    slug: "merge-cost",
    title: "Merge two sorted delivery lists and count the work",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comparison", "deque-call", "else-clause", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "print-call", "print-several", "string-index", "string-slice", "top-level-indent", "while-loop"],
    prompt: "Two warehouses each send their delivery times sorted. Merging them takes one comparison every time the fronts of both lists are compared; once one list runs out, the rest of the other is copied without comparing. Write `merge_sorted(first, second)` that returns the merged list **and** the number of comparisons, showing the merge is O(n + m).",
    spec: [
      ["Function", "`merge_sorted(first, second)`"],
      ["first, second", "lists of numbers, each sorted ascending"],
      ["Returns", "a tuple `(merged, comparisons)`: one sorted list with every value from both, and how many front-to-front comparisons were made"],
      ["Rules", "on equal fronts, take from `first`; don't change either input list"],
    ],
    hiddenKinds: ["one list empty", "both lists empty", "one list entirely before the other", "equal values in both lists", "lists of different lengths"],
    hints: [
      "Keep one position in each list. While both positions are inside their lists, compare the two front values once and take the smaller.",
      "Count exactly one comparison per pass of that loop.",
      "When one list is used up, add everything left in the other without counting anything.",
    ],
    explanation: "Two positions walk the lists; each pass compares the two fronts once (counted), takes the smaller, and moves that position on. When one list is finished, the remainder of the other is already in order and is copied. Comparisons are at most `len(first) + len(second) - 1`. Sorting the concatenation gives the right list but not the merge's cost, and counting the copied leftovers counts work that never compares anything.",
    code: {
      starter: src`
def merge_sorted(first, second):
    merged = []
    comparisons = 0
    return merged, comparisons

print(merge_sorted([5, 9, 14], [7, 9, 20]))
`,
      answer: src`
def merge_sorted(first, second):
    merged = []
    comparisons = 0
    i = 0
    j = 0
    while i < len(first) and j < len(second):
        comparisons += 1
        if first[i] <= second[j]:
            merged.append(first[i])
            i += 1
        else:
            merged.append(second[j])
            j += 1
    merged.extend(first[i:])
    merged.extend(second[j:])
    return merged, comparisons

print(merge_sorted([5, 9, 14], [7, 9, 20]))
`,
      alternatives: [
        src`
from collections import deque

def merge_sorted(first, second):
    a = deque(first)
    b = deque(second)
    merged = []
    count = 0
    while a and b:
        count += 1
        if b[0] < a[0]:
            merged.append(b.popleft())
        else:
            merged.append(a.popleft())
    merged += list(a) + list(b)
    return (merged, count)
`,
      ],
      wrong: [
        {
          code: src`
def merge_sorted(first, second):
    merged = sorted(first + second)
    return merged, len(merged)
`,
          fails: ["returns"],
          why: "the list is right, but the count is just the length, not the comparisons a merge makes",
        },
        {
          code: src`
def merge_sorted(first, second):
    merged = []
    comparisons = 0
    i = 0
    j = 0
    while i < len(first) or j < len(second):
        comparisons += 1
        if j >= len(second) or (i < len(first) and first[i] <= second[j]):
            merged.append(first[i])
            i += 1
        else:
            merged.append(second[j])
            j += 1
    return merged, comparisons
`,
          fails: ["returns"],
          why: "it counts a comparison for every value copied after one list ran out",
        },
        {
          code: src`
def merge_sorted(first, second):
    merged = []
    comparisons = 0
    while first and second:
        comparisons += 1
        if first[0] <= second[0]:
            merged.append(first.pop(0))
        else:
            merged.append(second.pop(0))
    return merged + first + second, comparisons
`,
          fails: ["keeps-input"],
          why: "the result is right, but popping empties the caller's lists",
        },
      ],
      task: {
        checks: [
          fn("returns", "merge_sorted", [
            example([[5, 9, 14], [7, 9, 20]], py.tuple(py.list(py.int(5), py.int(7), py.int(9), py.int(9), py.int(14), py.int(20)), py.int(5))),
            example([[1, 2], [3, 4, 5]], py.tuple(py.list(py.int(1), py.int(2), py.int(3), py.int(4), py.int(5)), py.int(2))),
            example([[], [8, 12]], py.tuple(py.list(py.int(8), py.int(12)), py.int(0))),
            hiddenCase("both lists empty", [[], []], py.tuple(py.list(), py.int(0))),
            hiddenCase("one list entirely before the other", [[30, 40], [1, 2, 3]], py.tuple(py.list(py.int(1), py.int(2), py.int(3), py.int(30), py.int(40)), py.int(3))),
            hiddenCase("interleaved values", [[1, 3, 5], [2, 4, 6]], py.tuple(py.list(py.int(1), py.int(2), py.int(3), py.int(4), py.int(5), py.int(6)), py.int(5))),
            hiddenCase("equal values in both lists", [[4, 4], [4]], py.tuple(py.list(py.int(4), py.int(4), py.int(4)), py.int(2))),
          ], { label: "merge_sorted() merges and counts front-to-front comparisons" }),
          fn("keeps-input", "merge_sorted", [keepsInput([[5, 9], [7]]), keepsInput([[1], [2, 3]], { label: "short lists" })], { label: "merge_sorted() leaves both input lists unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q35-10",
    version: 2,
    slug: "tag-nesting",
    title: "Validate the nesting of HTML tags",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "comparison", "conditional-expr", "continue-statement", "else-clause", "enumerate-call", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "print-call", "print-several", "print-text", "range-call", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness"],
    prompt: "An email template editor rejects templates whose tags don't nest properly, and points at the first problem. Tags arrive already split out, like `\"<ul>\"`, `\"</ul>\"` and `\"<br/>\"`. Write `first_tag_error(tags)`.",
    spec: [
      ["Function", "`first_tag_error(tags)`"],
      ["tags", "a list of tag texts: opening `<name>`, closing `</name>`, or self-closing `<name/>` (which never needs closing)"],
      ["Returns", "the index of the first closing tag that doesn't close the most recently opened tag still open (or closes when none is open); `len(tags)` if every closing tag was fine but some tag is left open; `-1` if the nesting is valid"],
      ["Names", "compared exactly as written, without the brackets and slashes"],
    ],
    hiddenKinds: ["a closing tag with nothing open", "tags left open at the end", "self-closing tags only", "an empty template", "closing tags in the wrong order", "a later error after an earlier valid section"],
    hints: [
      "The tag that must close next is always the most recently opened one that is still open: a stack.",
      "Classify each tag first (closing starts with `</`, self-closing ends with `/>`), and pull out its name by slicing off the brackets.",
      "A closing tag is an error if the stack is empty or its top name differs; after the loop, anything still on the stack means a tag was never closed.",
    ],
    explanation: "Opening tags push their name; self-closing tags are skipped; a closing tag must match the top of the stack, which is popped. The first mismatch (or a closing tag with an empty stack) returns its index. If the loop finishes, a non-empty stack means something was left open (`len(tags)`), otherwise the template is valid (`-1`). Common slips: treating `<br/>` as an opening tag, checking that the name was opened *anywhere* instead of last, and popping an empty list.",
    code: {
      starter: src`
def first_tag_error(tags):
    return -1

print(first_tag_error(["<p>", "<b>", "</p>", "</b>"]))
`,
      answer: src`
def first_tag_error(tags):
    open_tags = []
    for i, tag in enumerate(tags):
        if tag.endswith("/>"):
            continue
        if tag.startswith("</"):
            name = tag[2:-1]
            if not open_tags or open_tags.pop() != name:
                return i
        else:
            open_tags.append(tag[1:-1])
    if open_tags:
        return len(tags)
    return -1

print(first_tag_error(["<p>", "<b>", "</p>", "</b>"]))
`,
      alternatives: [
        src`
def first_tag_error(tags):
    stack = []
    for position in range(len(tags)):
        tag = tags[position]
        if tag[-2:] == "/>":
            pass
        elif tag[:2] == "</":
            if len(stack) == 0 or stack[-1] != tag[2:-1]:
                return position
            stack.pop()
        else:
            stack.append(tag[1:-1])
    return len(tags) if stack else -1
`,
      ],
      wrong: [
        {
          code: src`
def first_tag_error(tags):
    opened = []
    for i, tag in enumerate(tags):
        if tag.startswith("</"):
            if tag[2:-1] not in opened:
                return i
            opened.remove(tag[2:-1])
        elif not tag.endswith("/>"):
            opened.append(tag[1:-1])
    if opened:
        return len(tags)
    return -1
`,
          fails: ["returns"],
          why: "it only checks that the tag was opened somewhere, so `<p><b></p></b>` passes",
        },
        {
          code: src`
def first_tag_error(tags):
    open_tags = []
    for i, tag in enumerate(tags):
        if tag.startswith("</"):
            if not open_tags or open_tags.pop() != tag[2:-1]:
                return i
        else:
            open_tags.append(tag[1:-1])
    if open_tags:
        return len(tags)
    return -1
`,
          fails: ["returns"],
          why: "a self-closing `<br/>` is pushed as if it were opened, so it is reported as never closed",
        },
      ],
      task: {
        checks: [
          fn("returns", "first_tag_error", [
            example([["<p>", "<b>", "</p>", "</b>"]], 2),
            example([["<ul>", "<li>", "</li>", "<li>", "<br/>", "</li>", "</ul>"]], -1),
            example([["<div>", "<p>", "</p>"]], 3),
            hiddenCase("a closing tag with nothing open", [["</td>", "<td>"]], 0),
            hiddenCase("tags left open at the end", [["<table>", "<tr>", "<td>", "</td>"]], 4),
            hiddenCase("self-closing tags only", [["<br/>", "<hr/>"]], -1),
            hiddenCase("an empty template", [[]], -1),
            hiddenCase("a later error after an earlier valid section", [["<h1>", "</h1>", "<p>", "</h1>"]], 3),
          ], { label: "first_tag_error() finds the first nesting problem" }),
        ],
      },
    },
  },
  {
    id: "PY-Q35-12",
    version: 2,
    slug: "bisect-delays",
    title: "Predict bisect on flight delays",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "bisect-call", "import-module", "list-literal", "print-call", "print-several"],
    prompt: "These are arrival delays in minutes from one airport's morning, sorted. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`bisect_left` stops before any values equal to the one searched for; `bisect_right` goes past them.",
      "A range count is the difference between two positions: count the values between them in the list.",
      "A value larger than everything belongs at the very end; one smaller than everything belongs at position 0.",
    ],
    explanation: "Line 1: the two zeros sit at positions 2 and 3, so `bisect_left(…, 0)` is 2 and `bisect_right(…, 0)` is 4. Line 2: values from 15 up to and including 35 run from position 5 (`bisect_left(…, 15)`, the first value ≥ 15, which is 35) to position 7, so 2 flights. Line 3: 120 is bigger than every delay (position 8, the length) and -10 is smaller than every delay (position 0).",
    predict: {
      program: src`
from bisect import bisect_left, bisect_right

delays = [-4, -1, 0, 0, 12, 35, 35, 90]
print(bisect_left(delays, 0), bisect_right(delays, 0))
print(bisect_right(delays, 35) - bisect_left(delays, 15))
print(bisect_left(delays, 120), bisect_left(delays, -10))
`,
      output: "2 4\n2\n8 0\n",
      wrongPredictions: ["2 3\n2\n8 0\n", "2 4\n3\n8 0\n", "2 4\n2\n7 0\n", "3 4\n2\n8 0\n"],
    },
  },
  {
    id: "PY-Q35-13",
    version: 2,
    slug: "returning-customers",
    title: "Customers who came back",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "boolean", "dict-comp", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "print-call", "print-several", "print-text", "set-op", "string-index", "top-level-indent"],
    prompt: "Marketing wants the customers who ordered in January **and** again in February. Each month's export lists one customer ID per order, so IDs repeat. Write `returning_customers(january, february)`. Exports have tens of thousands of rows; the hidden test counts `==` comparisons, so don't search a list for every ID.",
    spec: [
      ["Function", "`returning_customers(january, february)`"],
      ["january, february", "lists of customer ID strings, one per order (repeats allowed)"],
      ["Returns", "a sorted list of the IDs that appear in both lists, each once"],
      ["Constraint", "at most 2,500 comparisons for two exports of 1,000 IDs"],
    ],
    hiddenKinds: ["no customer in both months", "a customer with several orders in each month", "an empty month", "IDs differing only in case", "two exports of 1,000 IDs (comparison budget)"],
    hints: [
      "*Is this ID in the other month?* is a membership question: make the other month a set (or dictionary) first.",
      "Sets also answer *which values are in both?* directly with an intersection, and they remove repeats as a side effect.",
      "Sort at the end, because a set has no order.",
    ],
    explanation: "Turning each month into a set removes repeated orders, and `set(january).intersection(february)` keeps the IDs in both with one hash lookup per ID; `sorted` gives the required order. Checking `id in february` on the list instead compares each January ID with up to every February ID, about a million comparisons for two 1,000-row exports.",
    code: {
      starter: src`
def returning_customers(january, february):
    return []

print(returning_customers(["C00077", "C01338", "C00077", "C00038"], ["C00038", "C00305", "C00077"]))
`,
      answer: src`
def returning_customers(january, february):
    both = set(january).intersection(february)
    return sorted(both)

print(returning_customers(["C00077", "C01338", "C00077", "C00038"], ["C00038", "C00305", "C00077"]))
`,
      alternatives: [
        src`
def returning_customers(january, february):
    in_february = {customer: True for customer in february}
    found = {}
    for customer in january:
        if customer in in_february:
            found[customer] = True
    return sorted(found)
`,
      ],
      wrong: [
        {
          code: src`
def returning_customers(january, february):
    found = []
    for customer in january:
        if customer in february and customer not in found:
            found.append(customer)
    return sorted(found)
`,
          fails: ["comparisons"],
          why: "right IDs, but each January ID is searched for in the February list: about a million comparisons",
        },
        {
          code: src`
def returning_customers(january, february):
    return sorted(set(january).union(february))
`,
          fails: ["returns"],
          why: "a union keeps customers from either month, not customers from both",
        },
        {
          code: src`
def returning_customers(january, february):
    in_february = set(february)
    return sorted(customer for customer in january if customer in in_february)
`,
          fails: ["returns"],
          why: "a customer with several January orders is listed once per order instead of once",
        },
      ],
      task: {
        checks: [
          fn("returns", "returning_customers", [
            example([["C00077", "C01338", "C00077", "C00038"], ["C00038", "C00305", "C00077"]], ["C00038", "C00077"]),
            example([["C00001"], ["C00002"]], []),
            example([["C00305", "C00305"], ["C00305"]], ["C00305"]),
            hiddenCase("a customer with several orders in each month", [["C9", "C9", "C1", "C9"], ["C9", "C1", "C9"]], ["C1", "C9"]),
            hiddenCase("an empty month", [[], ["C00077"]], []),
            hiddenCase("IDs differing only in case", [["c00077"], ["C00077"]], []),
            hiddenCase("many customers in both, out of order", [["C5", "C3", "C8", "C1", "C2"], ["C2", "C8", "C5", "C4"]], ["C2", "C5", "C8"]),
          ], { label: "returning_customers() lists customers from both months, sorted" }),
          {
            kind: "expr",
            id: "comparisons",
            label: "returning_customers() makes at most 2,500 comparisons on two exports of 1,000 IDs",
            hidden: true,
            expr: eqBudget("[_Code(f'C{i:05}') for i in range(1000)]", "returning_customers(_data, [_Code(f'C{i:05}') for i in range(500, 1500)])", 2500),
            expected: within,
          },
        ],
      },
    },
  },
  {
    id: "PY-Q35-16",
    version: 2,
    slug: "airline-index",
    title: "Refactor the airline-name join",
    format: "refactoring",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "nested-loop", "print-call", "print-several", "reassignment", "string-format", "string-index", "top-level-indent"],
    prompt: "This function labels each flight with its airline's name. Its answers are right, and the dashboard depends on every detail of them, but with 7,000 flights and the full carrier table it compares every flight with every airline. Refactor it so the carrier table is read once, without changing a single result.",
    spec: [
      ["Function", "`label_flights(flights, airlines)` (keep the name and parameters)"],
      ["Behaviour", "unchanged: `\"<flight_id> <airline name>\"` for each flight in order; `\"Unknown\"` when no airline has the code; if a code appears more than once in the table, the **last** row's name is used (that is what the original does)"],
      ["Constraint", "read the airline table about once: at most 1,500 reads for 500 flights and 1,000 airlines"],
    ],
    hiddenKinds: ["a code listed twice in the carrier table", "flights with no matching airline", "no flights", "an empty carrier table", "500 flights against 1,000 airlines (read budget)"],
    hints: [
      "The inner loop is a lookup by `airline_code`, repeated for every flight. Build that lookup once, before the flight loop.",
      "A dictionary from code to name, filled in table order, does every lookup in one step.",
      "Check what the original does with a repeated code: with no `break`, the last matching row wins. Filling the dictionary in order gives the same result, but keeping the first one doesn't.",
    ],
    explanation: "Build `names = {airline['airline_code']: airline['airline_name'] for airline in airlines}` once (later rows overwrite earlier ones, exactly like the original's loop without `break`), then label each flight with `names.get(code, 'Unknown')`. Reads drop from flights × airlines to airlines + flights. The tempting refactors change behaviour: a `break` or a *first one wins* dictionary picks the earlier name for a duplicated code.",
    code: {
      starter: src`
def label_flights(flights, airlines):
    labelled = []
    for flight in flights:
        name = "Unknown"
        for airline in airlines:
            if airline["airline_code"] == flight["airline_code"]:
                name = airline["airline_name"]
        labelled.append(flight["flight_id"] + " " + name)
    return labelled

airlines = [
    {"airline_code": "AA", "airline_name": "American Airlines"},
    {"airline_code": "B6", "airline_name": "JetBlue Airways"},
    {"airline_code": "UA", "airline_name": "United Air Lines"},
]
flights = [
    {"flight_id": "12207", "airline_code": "UA"},
    {"flight_id": "12208", "airline_code": "MQ"},
    {"flight_id": "12209", "airline_code": "AA"},
]
print(label_flights(flights, airlines))
`,
      answer: src`
def label_flights(flights, airlines):
    names = {}
    for airline in airlines:
        names[airline["airline_code"]] = airline["airline_name"]
    labelled = []
    for flight in flights:
        name = names.get(flight["airline_code"], "Unknown")
        labelled.append(flight["flight_id"] + " " + name)
    return labelled

airlines = [
    {"airline_code": "AA", "airline_name": "American Airlines"},
    {"airline_code": "B6", "airline_name": "JetBlue Airways"},
    {"airline_code": "UA", "airline_name": "United Air Lines"},
]
flights = [
    {"flight_id": "12207", "airline_code": "UA"},
    {"flight_id": "12208", "airline_code": "MQ"},
    {"flight_id": "12209", "airline_code": "AA"},
]
print(label_flights(flights, airlines))
`,
      alternatives: [
        src`
def label_flights(flights, airlines):
    names = {a["airline_code"]: a["airline_name"] for a in airlines}
    return [f"{f['flight_id']} {names.get(f['airline_code'], 'Unknown')}" for f in flights]
`,
      ],
      wrong: [
        {
          code: src`
def label_flights(flights, airlines):
    names = {}
    for airline in airlines:
        if airline["airline_code"] not in names:
            names[airline["airline_code"]] = airline["airline_name"]
    labelled = []
    for flight in flights:
        labelled.append(flight["flight_id"] + " " + names.get(flight["airline_code"], "Unknown"))
    return labelled
`,
          fails: ["returns"],
          why: "the first row wins for a repeated code, but the original used the last one",
        },
        {
          code: src`
def label_flights(flights, airlines):
    labelled = []
    for flight in flights:
        name = "Unknown"
        for airline in airlines:
            if airline["airline_code"] == flight["airline_code"]:
                name = airline["airline_name"]
                break
        labelled.append(flight["flight_id"] + " " + name)
    return labelled
`,
          fails: ["returns", "reads"],
          why: "`break` stops at the first matching row (a behaviour change) and it still scans the table for every flight",
        },
      ],
      task: {
        checks: [
          fn("returns", "label_flights", [
            example([flights, airlines], ["12207 United Air Lines", "12208 Unknown", "12209 American Airlines"]),
            example([[{ flight_id: "12290", airline_code: "B6" }], airlines], ["12290 JetBlue Airways"]),
            example([[], airlines], []),
            hiddenCase("a code listed twice in the carrier table", [[{ flight_id: "1", airline_code: "WN" }], [{ airline_code: "WN", airline_name: "Southwest (old row)" }, { airline_code: "WN", airline_name: "Southwest Airlines" }]], ["1 Southwest Airlines"]),
            hiddenCase("an empty carrier table", [[{ flight_id: "2", airline_code: "AA" }], []], ["2 Unknown"]),
            hiddenCase("flights with no matching airline", [[{ flight_id: "3", airline_code: "OO" }, { flight_id: "4", airline_code: "YX" }], airlines], ["3 Unknown", "4 Unknown"]),
          ], { label: "label_flights() keeps every result of the original" }),
          {
            kind: "expr",
            id: "reads",
            label: "label_flights() reads 1,000 airlines about once, not once per flight",
            hidden: true,
            expr: readBudget("[{'airline_code': f'X{i}', 'airline_name': f'Carrier {i}'} for i in range(1000)]", "label_flights([{'flight_id': str(i), 'airline_code': f'X{i}'} for i in range(500)], _data)", 1500),
            expected: within,
          },
        ],
      },
    },
  },
  {
    id: "PY-Q35-19",
    version: 2,
    slug: "round-robin-jobs",
    title: "A round-robin job runner",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "deque-call", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "membership", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "tuple-unpack", "while-loop"],
    prompt: "A build server shares one worker fairly: each job in the queue gets a turn of at most `slice_units` units of work; a job that isn't finished goes to the **back** of the queue. Time starts at 0 and advances by the units actually worked. Write `round_robin(jobs, slice_units)` that returns when each job finished.",
    spec: [
      ["Function", "`round_robin(jobs, slice_units)`"],
      ["jobs", "a list of `[name, units]` pairs in queue order; `units` ≥ 1"],
      ["Returns", "a list of `(name, finished_at)` tuples in the order the jobs finish"],
      ["Rules", "a turn works `min(slice_units, remaining)` units; don't change the `jobs` list or its pairs"],
    ],
    hiddenKinds: ["a slice bigger than every job", "a slice of one unit", "a single job", "no jobs", "jobs that finish on the same turn boundary"],
    hints: [
      "Oldest waiting job goes next, and an unfinished one rejoins at the back: a deque with `popleft` and `append`.",
      "Queue copies of the work left (`[name, remaining]`), not the caller's pairs, so the input stays as it was.",
      "Each turn: work `min(slice, remaining)`, add that to the clock, then either record `(name, clock)` or put the job back with what is left.",
    ],
    explanation: "A deque of `(name, remaining)` gives the fair order: `popleft` takes the job that has waited longest, and an unfinished job is appended with its remaining units. The clock advances by the units actually worked, so a job finishing early doesn't waste a full slice. Mutating the caller's `[name, units]` pairs to track what is left is a classic shortcut that corrupts the input.",
    code: {
      starter: src`
def round_robin(jobs, slice_units):
    finished = []
    return finished

print(round_robin([["backup", 5], ["email", 2], ["report", 3]], 2))
`,
      answer: src`
from collections import deque

def round_robin(jobs, slice_units):
    waiting = deque()
    for name, units in jobs:
        waiting.append((name, units))
    clock = 0
    finished = []
    while waiting:
        name, remaining = waiting.popleft()
        worked = min(slice_units, remaining)
        clock += worked
        if remaining > worked:
            waiting.append((name, remaining - worked))
        else:
            finished.append((name, clock))
    return finished

print(round_robin([["backup", 5], ["email", 2], ["report", 3]], 2))
`,
      alternatives: [
        src`
from collections import deque

def round_robin(jobs, slice_units):
    queue = deque([job[0], job[1]] for job in jobs)
    time = 0
    done = []
    while queue:
        job = queue.popleft()
        step = slice_units if job[1] > slice_units else job[1]
        job[1] -= step
        time += step
        if job[1] == 0:
            done.append((job[0], time))
        else:
            queue.append(job)
    return done
`,
      ],
      wrong: [
        {
          code: src`
from collections import deque

def round_robin(jobs, slice_units):
    waiting = deque(jobs)
    clock = 0
    finished = []
    while waiting:
        job = waiting.popleft()
        worked = min(slice_units, job[1])
        job[1] -= worked
        clock += worked
        if job[1] > 0:
            waiting.append(job)
        else:
            finished.append((job[0], clock))
    return finished
`,
          fails: ["keeps-input"],
          why: "the finish times are right, but the caller's `[name, units]` pairs are counted down to 0",
        },
        {
          code: src`
from collections import deque

def round_robin(jobs, slice_units):
    waiting = deque((name, units) for name, units in jobs)
    clock = 0
    finished = []
    while waiting:
        name, remaining = waiting.popleft()
        clock += slice_units
        if remaining > slice_units:
            waiting.append((name, remaining - slice_units))
        else:
            finished.append((name, clock))
    return finished
`,
          fails: ["returns"],
          why: "the clock always advances a full slice, even when a job needed less",
        },
        {
          code: src`
def round_robin(jobs, slice_units):
    waiting = [(name, units) for name, units in jobs]
    clock = 0
    finished = []
    while waiting:
        name, remaining = waiting.pop()
        worked = min(slice_units, remaining)
        clock += worked
        if remaining > worked:
            waiting.append((name, remaining - worked))
        else:
            finished.append((name, clock))
    return finished
`,
          fails: ["returns"],
          why: "`pop()` takes the newest job, so an unfinished job runs again straight away instead of waiting its turn",
        },
      ],
      task: {
        checks: [
          fn("returns", "round_robin", [
            example([[["backup", 5], ["email", 2], ["report", 3]], 2], [pair("email", 4), pair("report", 9), pair("backup", 10)]),
            example([[["lint", 1], ["test", 4]], 3], [pair("lint", 1), pair("test", 5)]),
            example([[], 2], []),
            hiddenCase("a slice bigger than every job", [[["a", 2], ["b", 3]], 10], [pair("a", 2), pair("b", 5)]),
            hiddenCase("a slice of one unit", [[["a", 2], ["b", 2]], 1], [pair("a", 3), pair("b", 4)]),
            hiddenCase("a single job", [[["deploy", 7]], 3], [pair("deploy", 7)]),
            hiddenCase("jobs that finish on the same turn boundary", [[["x", 4], ["y", 2], ["z", 4]], 2], [pair("y", 4), pair("x", 8), pair("z", 10)]),
          ], { label: "round_robin() reports each job's finish time in finishing order" }),
          fn("keeps-input", "round_robin", [keepsInput([[["backup", 5], ["email", 2]], 2]), keepsInput([[["one", 1]], 1], { label: "a single short job" })], { label: "round_robin() leaves the job list and its pairs unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q35-20",
    version: 2,
    slug: "evaluate-deep-expression",
    title: "Evaluate a deeply nested formula without recursion",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "else-clause", "function-def", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "match-case", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "tuple-unpack", "while-loop"],
    prompt: "A pricing tool stores formulas as nested lists: a number, or `[operator, left, right]` with operator `\"+\"`, `\"-\"` or `\"*\"`. Formulas built by a rules engine can be nested more than a thousand levels deep, deeper than Python's recursion limit. Write `evaluate(formula)` with an explicit stack.",
    spec: [
      ["Function", "`evaluate(formula)`"],
      ["formula", "a number (int or float), or a list `[op, left, right]` where `left` and `right` are formulas"],
      ["Returns", "the formula's value; `[\"-\", a, b]` is `a - b` (left minus right)"],
      ["Constraint", "must work for formulas 1,200 levels deep"],
    ],
    hiddenKinds: ["a plain number", "subtraction where order matters", "floats and negatives", "a formula 1,200 levels deep"],
    hints: [
      "Recursion would evaluate both sides, then combine. Do the same with your own stack: a formula's operator can only be applied after both of its sides have values.",
      "Push each list formula twice: once to mean *combine me later*, then its right and left sides on top so they are dealt with first. Results go on a second stack of values.",
      "When a *combine* entry comes off the stack, its two sides' values are the top two values: the right side's is on top. Pop them in that order before applying the operator.",
    ],
    explanation: "The explicit stack holds `(formula, ready)` pairs. A number is pushed straight onto the values stack. A list formula seen for the first time goes back with `ready=True`, followed by its right and then its left side, so the left is evaluated first. When it comes off again, the right value is on top of the values stack and the left value under it; popping them in that order keeps `a - b` from becoming `b - a`. Every formula is handled once, and depth only grows a list, never Python's call stack.",
    code: {
      starter: src`
def evaluate(formula):
    return 0

print(evaluate(["-", ["*", 3, ["+", 4, 5]], 2]))
`,
      answer: src`
def evaluate(formula):
    values = []
    stack = [(formula, False)]
    while stack:
        node, ready = stack.pop()
        if not isinstance(node, list):
            values.append(node)
        elif ready:
            right = values.pop()
            left = values.pop()
            if node[0] == "+":
                values.append(left + right)
            elif node[0] == "-":
                values.append(left - right)
            else:
                values.append(left * right)
        else:
            stack.append((node, True))
            stack.append((node[2], False))
            stack.append((node[1], False))
    return values[0]

print(evaluate(["-", ["*", 3, ["+", 4, 5]], 2]))
`,
      alternatives: [
        src`
def evaluate(formula):
    results = []
    todo = [("visit", formula)]
    while todo:
        kind, item = todo.pop()
        if kind == "apply":
            b = results.pop()
            a = results.pop()
            match item:
                case "+":
                    results.append(a + b)
                case "-":
                    results.append(a - b)
                case "*":
                    results.append(a * b)
        elif isinstance(item, list):
            op, left, right = item
            todo.append(("apply", op))
            todo.append(("visit", right))
            todo.append(("visit", left))
        else:
            results.append(item)
    return results.pop()
`,
      ],
      wrong: [
        {
          code: src`
def evaluate(formula):
    if not isinstance(formula, list):
        return formula
    left = evaluate(formula[1])
    right = evaluate(formula[2])
    if formula[0] == "+":
        return left + right
    if formula[0] == "-":
        return left - right
    return left * right
`,
          fails: ["deep"],
          why: "right for ordinary formulas, but a formula 1,200 levels deep raises RecursionError",
        },
        {
          code: src`
def evaluate(formula):
    values = []
    stack = [(formula, False)]
    while stack:
        node, ready = stack.pop()
        if not isinstance(node, list):
            values.append(node)
        elif ready:
            left = values.pop()
            right = values.pop()
            if node[0] == "+":
                values.append(left + right)
            elif node[0] == "-":
                values.append(left - right)
            else:
                values.append(left * right)
        else:
            stack.append((node, True))
            stack.append((node[2], False))
            stack.append((node[1], False))
    return values[0]
`,
          fails: ["returns"],
          why: "the right side's value is on top of the stack, so popping it as `left` turns `a - b` into `b - a`",
        },
      ],
      task: {
        checks: [
          fn("returns", "evaluate", [
            example([["-", ["*", 3, ["+", 4, 5]], 2]], 25),
            example([["+", 1, 2]], 3),
            example([["*", ["+", 1.5, 2.5], ["-", 0, 3]]], py.float(-12)),
            hiddenCase("a plain number", [42], 42),
            hiddenCase("subtraction where order matters", [["-", 10, ["-", 4, 1]]], 7),
            hiddenCase("floats and negatives", [["+", -2.5, ["*", 2, -1.25]]], py.float(-5)),
          ], { label: "evaluate() computes the formula's value" }),
          {
            kind: "expr",
            id: "deep",
            label: "evaluate() handles a formula 1,200 levels deep",
            hidden: true,
            expr: [
              "def _deep_formula():",
              "    formula = 0",
              "    for _ in range(1199):",
              "        formula = ['+', formula, 2]",
              "    try:",
              "        return evaluate(formula)",
              "    except RecursionError:",
              "        return 'RecursionError'",
              "result = _deep_formula()",
            ].join("\n"),
            expected: py.int(2398),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q35-22",
    version: 2,
    slug: "busiest-window",
    title: "The busiest few minutes of pickups",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "deque-call", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "membership", "nested-loop", "print-call", "print-several", "reassignment", "string-index", "top-level-indent", "while-loop"],
    prompt: "A taxi dispatcher wants the largest number of pickups that fall within any `width` seconds, to plan cover for peaks. The pickup times arrive sorted. Write `busiest_window(times, width)` in one pass: keep the pickups of the current window in a queue, dropping old ones from the front as time moves on.",
    spec: [
      ["Function", "`busiest_window(times, width)`"],
      ["times", "pickup times in seconds since midnight, sorted ascending (repeats allowed)"],
      ["Returns", "the most pickups whose times all fit in one window of `width` seconds, that is, latest − earliest `< width`; `0` for no pickups"],
      ["Constraint", "read each time about once: at most 3,000 reads for 1,000 times"],
    ],
    hiddenKinds: ["no pickups", "pickups exactly `width` apart", "several pickups at the same second", "the peak at the very end", "1,000 pickups (read budget)"],
    hints: [
      "Walk the times once. Each new pickup joins the window at the back.",
      "Before counting, remove pickups from the front while they are too old to share a window with the newest one.",
      "Too old means the gap to the newest pickup is `width` or more; after trimming, the window's size is a candidate for the answer.",
    ],
    explanation: "A deque holds the pickups that can share a window with the newest one. Each new time is appended; while the oldest is `width` or more seconds earlier it is popped from the front. Every time enters and leaves the deque once, so the work is O(n). The off-by-one to avoid: a gap of exactly `width` does **not** fit (latest − earliest must be `< width`). The nested-loop version gives the same answers but reads every pair.",
    code: {
      starter: src`
def busiest_window(times, width):
    return 0

pickups = [28367, 28370, 28401, 28650, 28655, 28659, 28700]
print(busiest_window(pickups, 60))
`,
      answer: src`
from collections import deque

def busiest_window(times, width):
    window = deque()
    best = 0
    for time in times:
        window.append(time)
        while time - window[0] >= width:
            window.popleft()
        if len(window) > best:
            best = len(window)
    return best

pickups = [28367, 28370, 28401, 28650, 28655, 28659, 28700]
print(busiest_window(pickups, 60))
`,
      alternatives: [
        src`
def busiest_window(times, width):
    best = 0
    start = 0
    position = 0
    seen = []
    for time in times:
        seen.append(time)
        while time - seen[start] >= width:
            start += 1
        position += 1
        best = max(best, position - start)
    return best
`,
      ],
      wrong: [
        {
          code: src`
def busiest_window(times, width):
    best = 0
    for i in range(len(times)):
        count = 0
        for later in times[i:]:
            if later - times[i] < width:
                count += 1
        best = max(best, count)
    return best
`,
          fails: ["reads"],
          why: "the counts are right, but every pickup is compared with every later one: about half a million reads for 1,000 pickups",
        },
        {
          code: src`
from collections import deque

def busiest_window(times, width):
    window = deque()
    best = 0
    for time in times:
        window.append(time)
        while time - window[0] > width:
            window.popleft()
        best = max(best, len(window))
    return best
`,
          fails: ["returns"],
          why: "two pickups exactly `width` seconds apart are kept in the same window",
        },
      ],
      task: {
        checks: [
          fn("returns", "busiest_window", [
            example([[28367, 28370, 28401, 28650, 28655, 28659, 28700], 60], 4),
            example([[28367, 28370, 28401, 28650, 28655, 28659, 28700], 10], 3),
            example([[100, 500, 900], 60], 1),
            hiddenCase("no pickups", [[], 60], 0),
            hiddenCase("pickups exactly `width` apart", [[0, 60, 120], 60], 1),
            hiddenCase("several pickups at the same second", [[5, 5, 5, 70], 10], 3),
            hiddenCase("the peak at the very end", [[0, 300, 600, 601, 602, 603], 5], 4),
          ], { label: "busiest_window() finds the most pickups in one window" }),
          {
            kind: "expr",
            id: "reads",
            label: "busiest_window() reads 1,000 pickup times about once each",
            hidden: true,
            expr: readBudget("[i * 7 for i in range(1000)]", "busiest_window(_data, 100)", 3000),
            expected: within,
          },
        ],
      },
    },
  },
];
