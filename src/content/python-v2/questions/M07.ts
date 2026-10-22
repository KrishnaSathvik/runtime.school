/**
 * M07 practice: ten independent problems on lists and tuples (PY-L07-01 … PY-L07-05).
 *
 * Functions arrive in M09, so every code question is a short program whose inputs are its first lines. It is graded on
 * its output, on public re-runs with other lists, and on hidden re-runs (`variant` checks) chosen for the edge cases:
 * empty lists, a single item, ties, repeats, boundaries and gaps.
 *
 * Mix: 4 data transformations, 2 validations, 2 debugging (genuinely broken programs), 2 output predictions.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 * Fixtures: Runtime Market order and product IDs (R01), Runtime Films titles and ratings (R02), NOAA daily readings
 * (D07 style), Online Retail II invoice numbers.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyQuestion } from "../model";
import { pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const values = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, pv(v)]));
const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** A public re-run: the program is run again with these input values, shown to the learner. */
const shown = (id: string, set: Record<string, unknown>, output: string): PyCheck => ({ kind: "variant", id, set: values(set), output });
/** A hidden re-run: only `kind` is shown when it fails. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: values(set),
  output,
  hidden: true,
});
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m07Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q07-02",
    version: 2,
    slug: "two-names-one-cart",
    title: "Two names, one cart",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "string-value", "list-literal", "list-index", "list-mutate", "len-call", "print-call", "print-several", "unquoted-name", "string-index"],
    prompt: "Type exactly what this program prints. Decide first how many lists there are.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`saved = cart` doesn't copy anything. How many lists exist after that line?",
      "A change made through either name is a change to that one list.",
      "Apply the append, then the replacement at position 0, to the same list.",
    ],
    explanation: "`saved = cart` gives the one list a second name. Appending through `cart` and replacing position 0 through `saved` both change that list, so it ends as `['P0164', 'P0208', 'P0659']`, and `len(saved)` is 3. A copy would have needed `cart.copy()`.",
    predict: {
      program: src`
cart = ["P0607", "P0208"]
saved = cart
cart.append("P0659")
saved[0] = "P0164"
print(cart, len(saved))
`,
      output: "['P0164', 'P0208', 'P0659'] 3\n",
      wrongPredictions: ["['P0607', 'P0208', 'P0659'] 2", "['P0607', 'P0208', 'P0659'] 3", "['P0164', 'P0208', 'P0659'] 2", "['P0164', 'P0208'] 3"],
    },
  },
  {
    id: "PY-Q07-03",
    version: 2,
    slug: "late-deliveries-crash",
    title: "The late-deliveries list crashes",
    format: "debugging",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "reassignment", "string-value", "whole-number", "list-literal", "list-index", "list-mutate", "len-call", "range-call", "comparison", "if-statement", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "enumerate-call", "string-index"],
    prompt: "Two lists line up by position: `order_ids[i]` took `days[i]` days to arrive. The program should print the IDs of the orders that took **more than 5 days**, as a list. It crashes with an AttributeError, and once that is fixed it still misses an order. Fix both bugs.",
    spec: [
      ["Inputs", "`order_ids` and `days`, two lists of the same length"],
      ["Prints", "a list of the IDs whose delivery took more than 5 days, in their original order"],
      ["Examples", "the starter's lists → `['O101217', 'O108752']`; days `[1, 2]` → `[]`"],
    ],
    hiddenKinds: ["the last order is late", "exactly 5 days", "every order late", "a single order"],
    hints: [
      "Read the AttributeError: on which pass does `late` stop being a list?",
      "`append` changes the list and returns None, so its result must not be stored.",
      "Check which positions `range(len(days) - 1)` really visits.",
    ],
    explanation: "`late = late.append(...)` replaces the list with None on the first late order, so the next `append` fails. Call `late.append(...)` on its own. `range(len(days) - 1)` stops one position early, so the last order is never checked; `range(len(days))` visits every position.",
    code: {
      starter: src`
order_ids = ["O100043", "O101217", "O104839", "O108752"]
days = [3, 6, 2, 8]
late = []
for i in range(len(days) - 1):
    if days[i] > 5:
        late = late.append(order_ids[i])
print(late)
`,
      answer: src`
order_ids = ["O100043", "O101217", "O104839", "O108752"]
days = [3, 6, 2, 8]
late = []
for i in range(len(days)):
    if days[i] > 5:
        late.append(order_ids[i])
print(late)
`,
      alternatives: [
        src`
order_ids = ["O100043", "O101217", "O104839", "O108752"]
days = [3, 6, 2, 8]
late = []
for i, d in enumerate(days):
    if d > 5:
        late.append(order_ids[i])
print(late)
`,
      ],
      wrong: [
        {
          code: src`
order_ids = ["O100043", "O101217", "O104839", "O108752"]
days = [3, 6, 2, 8]
late = []
for i in range(len(days) - 1):
    if days[i] > 5:
        late.append(order_ids[i])
print(late)
`,
          fails: ["all-late", "five", "last-late", "output", "single"],
          why: "the crash is fixed, but the loop still skips the last order",
        },
        {
          code: src`
order_ids = ["O100043", "O101217", "O104839", "O108752"]
days = [3, 6, 2, 8]
late = []
for i in range(len(days)):
    if days[i] >= 5:
        late.append(order_ids[i])
print(late)
`,
          fails: ["five"],
          why: "`>= 5` counts an order that took exactly 5 days, which is not more than 5",
        },
      ],
      task: {
        checks: [
          out("['O101217', 'O108752']\n"),
          shown("none", { order_ids: ["O1", "O2"], days: [1, 2] }, "[]\n"),
          rerun("last-late", "the last order is late", { order_ids: ["O1", "O2", "O3"], days: [1, 2, 9] }, "['O3']\n"),
          rerun("five", "exactly 5 days", { order_ids: ["O1", "O2"], days: [5, 6] }, "['O2']\n"),
          rerun("all-late", "every order late", { order_ids: ["A", "B"], days: [7, 12] }, "['A', 'B']\n"),
          rerun("single", "a single order", { order_ids: ["O104839"], days: [10] }, "['O104839']\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q07-06",
    version: 2,
    slug: "order-numbers-from-ids",
    title: "Order numbers from mixed IDs",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "reassignment", "string-value", "none-value", "identity", "string-slice", "string-method", "conversion", "list-literal", "list-mutate", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent", "len-call", "list-index", "list-sort", "nested-condition", "string-index", "truthiness"],
    prompt: "An export mixes Runtime Market order IDs (`O104839`) with retail invoice numbers (`C489528`). Keep only the IDs that start with `O`, turn each into its number (`104839`), and print the list of numbers. Then print the largest of those numbers (the most recent order), or `None` if there were no order IDs.",
    spec: [
      ["Input", "`ids`, a list of texts"],
      ["Line 1", "a list of the numbers from IDs starting with `O`, in their original order"],
      ["Line 2", "the largest of those numbers, or `None`"],
      ["Examples", "`[\"O100043\", \"O104839\", \"C489528\", \"O101217\"]` → `[100043, 104839, 101217]` then `104839`; `[\"C1\"]` → `[]` then `None`"],
    ],
    hiddenKinds: ["the most recent order first", "no order IDs", "an ID with a lower-case o", "a single order ID"],
    hints: [
      "Build a new list with `append`, keeping only the IDs whose first character is `O`.",
      "The number is everything after the first character, converted with `int`.",
      "Track the largest number while you go, starting from `None`, so an empty result is easy to report.",
    ],
    explanation: "Filter on `startswith(\"O\")` (capital only), convert `id[1:]` with `int`, append, and keep the running maximum with `is None or n > largest`. Starting the maximum at 0 would print 0 instead of None for an export with no orders, and comparing the IDs as text before converting would also work here only because every number has the same width.",
    code: {
      starter: src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
`,
      answer: src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
largest = None
for code in ids:
    if code.startswith("O"):
        n = int(code[1:])
        numbers.append(n)
        if largest is None or n > largest:
            largest = n
print(numbers)
print(largest)
`,
      alternatives: [
        src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
for code in ids:
    if code[0] == "O":
        numbers.append(int(code[1:]))
if len(numbers) == 0:
    largest = None
else:
    largest = sorted(numbers)[-1]
print(numbers)
print(largest)
`,
      ],
      wrong: [
        {
          code: src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
largest = 0
for code in ids:
    if code.startswith("O"):
        n = int(code[1:])
        numbers.append(n)
        if n > largest:
            largest = n
print(numbers)
print(largest)
`,
          fails: ["none", "none-orders"],
          why: "starting the maximum at 0 prints 0 instead of None when there are no orders",
        },
        {
          code: src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
largest = None
for code in ids:
    if code.upper().startswith("O"):
        n = int(code[1:])
        numbers.append(n)
        if largest is None or n > largest:
            largest = n
print(numbers)
print(largest)
`,
          fails: ["lower-o"],
          why: "upper-casing first lets an ID starting with a lower-case `o` in, but only capital `O` IDs are orders",
        },
        {
          code: src`
ids = ["O100043", "O104839", "C489528", "O101217"]
numbers = []
for code in ids:
    if code.startswith("O"):
        numbers.append(int(code[1:]))
print(numbers)
print(numbers[-1])
`,
          fails: ["newest-first", "none", "none-orders", "output"],
          why: "the last number in the list is not necessarily the largest",
        },
      ],
      task: {
        checks: [
          out("[100043, 104839, 101217]\n104839\n"),
          shown("none", { ids: ["C1"] }, "[]\nNone\n"),
          rerun("newest-first", "the most recent order first", { ids: ["O121005", "O100282"] }, "[121005, 100282]\n121005\n"),
          rerun("none-orders", "no order IDs", { ids: ["C489528", "C489541"] }, "[]\nNone\n"),
          rerun("lower-o", "an ID with a lower-case o", { ids: ["o555", "O100376"] }, "[100376]\n100376\n"),
          rerun("single", "a single order ID", { ids: ["O108858"] }, "[108858]\n108858\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q07-10",
    version: 2,
    slug: "impossible-gps-points",
    title: "Impossible GPS points",
    format: "validation",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "decimal-number", "whole-number", "tuple-literal", "tuple-unpack", "list-literal", "list-mutate", "len-call", "enumerate-call", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "print-call", "print-text", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "reassignment", "truthiness"],
    prompt: "A delivery driver's app records a track of `(latitude, longitude)` points. A latitude must be between -90 and 90, and a longitude between -180 and 180, both inclusive. Print the positions (counting from 0) of every impossible point as a list. If every point is valid, print `all valid`.",
    spec: [
      ["Input", "`track`, a list of `(latitude, longitude)` tuples"],
      ["Valid", "`-90 <= latitude <= 90` and `-180 <= longitude <= 180`"],
      ["Prints", "the list of positions of invalid points, or `all valid`"],
      ["Examples", "the starter's track → `[1, 3]`; `[(0, 0)]` → `all valid`"],
    ],
    hiddenKinds: ["points exactly on the limits", "a bad longitude only", "every point invalid", "an empty track"],
    hints: [
      "`enumerate` gives each point's position, and the point itself can be unpacked into two names.",
      "A point is invalid when any one of the four limits is broken, so join the tests with `or`.",
      "The limits themselves are allowed, which decides between `<` and `<=`.",
    ],
    explanation: "Unpack `for i, (lat, lon) in enumerate(track)` (or unpack inside the loop), test `lat < -90 or lat > 90 or lon < -180 or lon > 180`, and append `i`. Using `and` would flag only points that are wrong in every way, and `<=` on the limits would reject the poles and the date line.",
    code: {
      starter: src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
`,
      answer: src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
for i, point in enumerate(track):
    lat, lon = point
    if lat < -90 or lat > 90 or lon < -180 or lon > 180:
        bad.append(i)
if len(bad) == 0:
    print("all valid")
else:
    print(bad)
`,
      alternatives: [
        src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
position = 0
for lat, lon in track:
    lat_ok = -90 <= lat and lat <= 90
    lon_ok = -180 <= lon and lon <= 180
    if not (lat_ok and lon_ok):
        bad.append(position)
    position = position + 1
if bad:
    print(bad)
else:
    print("all valid")
`,
      ],
      wrong: [
        {
          code: src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
for i, point in enumerate(track):
    lat, lon = point
    if lat <= -90 or lat >= 90 or lon <= -180 or lon >= 180:
        bad.append(i)
if len(bad) == 0:
    print("all valid")
else:
    print(bad)
`,
          fails: ["limits"],
          why: "`<=` and `>=` reject points exactly on the limits, such as the North Pole",
        },
        {
          code: src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
for i, point in enumerate(track):
    lat, lon = point
    if lat < -90 or lat > 90:
        bad.append(i)
if len(bad) == 0:
    print("all valid")
else:
    print(bad)
`,
          fails: ["all-bad", "longitude", "output"],
          why: "only the latitude is checked",
        },
        {
          code: src`
track = [(47.5, -111.3), (91.2, 10.0), (25.8, -80.2), (-33.9, 181.0)]
bad = []
for i, point in enumerate(track):
    lat, lon = point
    if lat < -90 or lat > 90 or lon < -180 or lon > 180:
        bad.append(point)
if len(bad) == 0:
    print("all valid")
else:
    print(bad)
`,
          fails: ["output", "longitude", "all-bad"],
          why: "it collects the points themselves instead of their positions",
        },
      ],
      task: {
        checks: [
          out("[1, 3]\n"),
          shown("valid", { track: [tup(0, 0)] }, "all valid\n"),
          rerun("limits", "points exactly on the limits", { track: [tup(90, 180), tup(-90, -180)] }, "all valid\n"),
          rerun("longitude", "a bad longitude only", { track: [tup(10, 10), tup(10, -190.5)] }, "[1]\n"),
          rerun("all-bad", "every point invalid", { track: [tup(100, 0), tup(0, 200)] }, "[0, 1]\n"),
          rerun("empty", "an empty track", { track: [] }, "all valid\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q07-12",
    version: 2,
    slug: "sorted-sort-and-slices",
    title: "sorted, sort and a slice",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "whole-number", "list-literal", "list-index", "list-mutate", "list-sort", "print-call", "print-several", "unquoted-name", "boolean", "string-slice"],
    prompt: "Type exactly what this program prints. Keep track of which lines build a new list and which change one.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`sorted(...)` builds a new list; the slice then takes its first two items.",
      "`scores.sort()` reorders `scores` itself.",
      "A slice is a new list, so appending to `low` doesn't touch `scores`.",
    ],
    explanation: "`top` is the two highest scores from a new sorted list, `[91, 72]`. `scores.sort()` then sorts the original in place. `low` is a new list made by the slice, so `low.append(0)` changes only `low`.",
    predict: {
      program: src`
scores = [72, 58, 91, 60]
top = sorted(scores, reverse=True)[:2]
scores.sort()
low = scores[:2]
low.append(0)
print(top, scores, low)
`,
      output: "[91, 72] [58, 60, 72, 91] [58, 60, 0]\n",
      wrongPredictions: [
        "[91, 72] [72, 58, 91, 60] [72, 58, 0]",
        "[91, 72] [58, 60, 72, 91, 0] [58, 60, 0]",
        "[72, 58] [58, 60, 72, 91] [58, 60, 0]",
        "[91, 72] [58, 60, 72, 91] [58, 60]",
      ],
    },
  },
  {
    id: "PY-Q07-13",
    version: 2,
    slug: "catalogue-order-lost",
    title: "The catalogue lost its order",
    format: "debugging",
    difficulty: "medium",
    minutes: 8,
    requires: ["assignment", "decimal-number", "string-value", "tuple-literal", "tuple-unpack", "list-literal", "list-index", "list-sort", "list-copy", "for-loop", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "boolean", "string-index", "string-slice"],
    prompt: "This program should print a film site's top 3 films by rating, then every title again in its original catalogue order. Each film is a `(rating, title)` tuple, and sorting tuples compares their first items, the ratings. The output has two bugs: the top list skips the best film, and the catalogue comes out in rating order. Fix the program.",
    spec: [
      ["Input", "`films`, a list of `(rating, title)` tuples with different ratings"],
      ["Prints", "`Top 3:`, then up to three lines `<title> <rating>` from highest to lowest, then `Catalogue:` and every title in the original order"],
      ["Examples", "the starter's films → `Night Harbor 4.6`, `Glass Echo of Glass 4.1`, `Wild Archive 3.9`, then the catalogue in its original order"],
    ],
    hiddenKinds: ["only two films", "the best film last", "a single film"],
    hints: [
      "Print `films` right after the sort. Why has it changed?",
      "`ranked = films` gives the same list a second name. One way of sorting builds a new list instead.",
      "The first three items of a list are positions 0, 1 and 2.",
    ],
    explanation: "`ranked = films` is an alias, so `ranked.sort(reverse=True)` reorders `films` too. Build the ranking with `sorted(films, reverse=True)` (or sort a `copy()`). `ranked[1:3]` starts at the second film and takes only two; the top three is `ranked[:3]`, which also works when there are fewer than three films.",
    code: {
      starter: src`
films = [(3.9, "Wild Archive"), (4.6, "Night Harbor"), (2.8, "Up"), (4.1, "Glass Echo of Glass")]
ranked = films
ranked.sort(reverse=True)
print("Top 3:")
for rating, title in ranked[1:3]:
    print(title, rating)
print("Catalogue:")
for rating, title in films:
    print(title)
`,
      answer: src`
films = [(3.9, "Wild Archive"), (4.6, "Night Harbor"), (2.8, "Up"), (4.1, "Glass Echo of Glass")]
ranked = sorted(films, reverse=True)
print("Top 3:")
for rating, title in ranked[:3]:
    print(title, rating)
print("Catalogue:")
for rating, title in films:
    print(title)
`,
      alternatives: [
        src`
films = [(3.9, "Wild Archive"), (4.6, "Night Harbor"), (2.8, "Up"), (4.1, "Glass Echo of Glass")]
ranked = films.copy()
ranked.sort(reverse=True)
print("Top 3:")
for rating, title in ranked[0:3]:
    print(title, rating)
print("Catalogue:")
for film in films:
    print(film[1])
`,
      ],
      wrong: [
        {
          code: src`
films = [(3.9, "Wild Archive"), (4.6, "Night Harbor"), (2.8, "Up"), (4.1, "Glass Echo of Glass")]
ranked = sorted(films, reverse=True)
print("Top 3:")
for rating, title in ranked[1:3]:
    print(title, rating)
print("Catalogue:")
for rating, title in films:
    print(title)
`,
          fails: ["output", "two", "best-last", "single"],
          why: "the catalogue is fixed, but the top list still starts at the second film",
        },
        {
          code: src`
films = [(3.9, "Wild Archive"), (4.6, "Night Harbor"), (2.8, "Up"), (4.1, "Glass Echo of Glass")]
ranked = films
ranked.sort(reverse=True)
print("Top 3:")
for rating, title in ranked[:3]:
    print(title, rating)
print("Catalogue:")
for rating, title in films:
    print(title)
`,
          fails: ["output", "two", "best-last"],
          why: "the top list is fixed, but sorting the alias still reorders the catalogue",
        },
      ],
      task: {
        checks: [
          out("Top 3:\nNight Harbor 4.6\nGlass Echo of Glass 4.1\nWild Archive 3.9\nCatalogue:\nWild Archive\nNight Harbor\nUp\nGlass Echo of Glass\n"),
          rerun("two", "only two films", { films: [tup(2.5, "Up"), tup(4, "Blue Dune")] }, "Top 3:\nBlue Dune 4\nUp 2.5\nCatalogue:\nUp\nBlue Dune\n"),
          rerun("best-last", "the best film last", { films: [tup(1, "A"), tup(2, "B"), tup(3, "C"), tup(4, "D"), tup(5, "E")] }, "Top 3:\nE 5\nD 4\nC 3\nCatalogue:\nA\nB\nC\nD\nE\n"),
          rerun("single", "a single film", { films: [tup(3.5, "Solo")] }, "Top 3:\nSolo 3.5\nCatalogue:\nSolo\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q07-16",
    version: 2,
    slug: "three-day-moving-average",
    title: "A three-day moving average",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 10,
    requires: ["assignment", "decimal-number", "list-literal", "list-index", "len-call", "range-call", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "membership", "string-format", "print-call", "print-text", "unquoted-name", "top-level-indent", "else-clause", "nested-loop", "reassignment", "string-index", "string-slice"],
    prompt: "Daily highs jump around, so a weather chart smooths them with a three-day moving average: for each day from the third onward, the average of that day and the two days before it. Print one average per line with one decimal. If there are fewer than three readings, print `not enough data`.",
    spec: [
      ["Input", "`highs`, a list of daily highs"],
      ["Prints", "for each position i from 2 to the end, the average of `highs[i - 2]`, `highs[i - 1]` and `highs[i]`, with one decimal; or `not enough data`"],
      ["Examples", "`[6.7, 7.2, 3.3, 7.2, 3.9, -2.1]` → `5.7`, `5.9`, `4.8`, `3.0`; `[1, 2]` → `not enough data`"],
    ],
    hiddenKinds: ["exactly three readings", "negative readings", "a long steady run", "an empty list"],
    hints: [
      "There is one average for each position from 2 to the last, so loop over those positions.",
      "Each average reads three neighbouring positions: the current one and the two before it.",
      "Fewer than three readings means the loop would print nothing, but the task asks for a message.",
    ],
    explanation: "`for i in range(2, len(highs))` visits every day that has two days before it, and the average is `(highs[i - 2] + highs[i - 1] + highs[i]) / 3`. A list of n readings gives n − 2 averages. Starting the loop at 0 reads `highs[-2]` and `highs[-1]`, the end of the list, without any error.",
    code: {
      starter: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
`,
      answer: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
if len(highs) < 3:
    print("not enough data")
for i in range(2, len(highs)):
    average = (highs[i - 2] + highs[i - 1] + highs[i]) / 3
    print(f"{average:.1f}")
`,
      alternatives: [
        src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
if len(highs) >= 3:
    for i in range(len(highs) - 2):
        window = highs[i:i + 3]
        total = 0
        for t in window:
            total = total + t
        print(f"{total / 3:.1f}")
else:
    print("not enough data")
`,
      ],
      wrong: [
        {
          code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
if len(highs) < 3:
    print("not enough data")
for i in range(len(highs)):
    average = (highs[i - 2] + highs[i - 1] + highs[i]) / 3
    print(f"{average:.1f}")
`,
          fails: ["negative", "output", "short", "steady", "three"],
          why: "starting at position 0 wraps round to the end of the list for the first two averages",
        },
        {
          code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
if len(highs) < 3:
    print("not enough data")
for i in range(2, len(highs)):
    average = highs[i - 2] + highs[i - 1] + highs[i] / 3
    print(f"{average:.1f}")
`,
          fails: ["output", "three", "negative", "steady"],
          why: "without brackets only the last reading is divided by 3",
        },
        {
          code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
for i in range(2, len(highs)):
    average = (highs[i - 2] + highs[i - 1] + highs[i]) / 3
    print(f"{average:.1f}")
`,
          fails: ["short", "empty"],
          why: "a short list prints nothing instead of `not enough data`",
        },
      ],
      task: {
        checks: [
          out("5.7\n5.9\n4.8\n3.0\n"),
          shown("short", { highs: [1, 2] }, "not enough data\n"),
          rerun("three", "exactly three readings", { highs: [10, 11, 15] }, "12.0\n"),
          rerun("negative", "negative readings", { highs: [-14.9, -9.3, -2.1, 0.6] }, "-8.8\n-3.6\n"),
          rerun("steady", "a long steady run", { highs: [20, 20, 20, 20, 20] }, "20.0\n20.0\n20.0\n"),
          rerun("empty", "an empty list", { highs: [] }, "not enough data\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q07-19",
    version: 2,
    slug: "double-booked-seats",
    title: "Double-booked seats",
    format: "validation",
    difficulty: "medium",
    minutes: 10,
    requires: ["assignment", "whole-number", "string-value", "tuple-literal", "list-literal", "list-mutate", "len-call", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "print-call", "print-text", "unquoted-name", "top-level-indent", "list-index", "nested-condition", "range-call", "string-index", "string-slice", "truthiness"],
    prompt: "A cinema's booking system received these seat bookings, each a `(row, seat)` tuple. A seat booked more than once is double-booked. Print each double-booked seat **once**, in the order its second booking arrives, as a list. If no seat is double-booked, print `no double bookings`.",
    spec: [
      ["Input", "`bookings`, a list of `(row, seat)` tuples"],
      ["Prints", "a list of the double-booked seats, each once, in the order they are found; or `no double bookings`"],
      ["Same seat", "the same row number and the same seat letter: `(12, \"A\")` and `(12, \"B\")` are different seats"],
      ["Examples", "the starter's bookings → `[(12, 'A'), (3, 'C')]`; `[(1, \"A\")]` → `no double bookings`"],
    ],
    hiddenKinds: ["a seat booked three times", "the same seat letter in different rows", "repeats found in a different order from first booking", "no bookings at all"],
    hints: [
      "`in` works on a list of tuples: it compares whole tuples, row and seat together.",
      "Keep two lists: the seats seen so far, and the seats already reported.",
      "A booking is a repeat when its seat is already in the seen list; report it only if it isn't reported yet.",
    ],
    explanation: "Walk the bookings with a `seen` list. A booking already in `seen` is a repeat, and it is appended to `repeats` only if it isn't there yet, so a seat booked three times is reported once, at its second booking. Comparing just the row (or just the letter) treats different seats as the same.",
    code: {
      starter: src`
bookings = [(12, "A"), (3, "C"), (12, "A"), (7, "B"), (12, "A"), (3, "C")]
`,
      answer: src`
bookings = [(12, "A"), (3, "C"), (12, "A"), (7, "B"), (12, "A"), (3, "C")]
seen = []
repeats = []
for seat in bookings:
    if seat in seen:
        if seat not in repeats:
            repeats.append(seat)
    else:
        seen.append(seat)
if len(repeats) == 0:
    print("no double bookings")
else:
    print(repeats)
`,
      alternatives: [
        src`
bookings = [(12, "A"), (3, "C"), (12, "A"), (7, "B"), (12, "A"), (3, "C")]
repeats = []
for i in range(len(bookings)):
    earlier = bookings[:i]
    if bookings[i] in earlier and bookings[i] not in repeats:
        repeats.append(bookings[i])
if repeats:
    print(repeats)
else:
    print("no double bookings")
`,
      ],
      wrong: [
        {
          code: src`
bookings = [(12, "A"), (3, "C"), (12, "A"), (7, "B"), (12, "A"), (3, "C")]
seen = []
repeats = []
for seat in bookings:
    if seat in seen:
        repeats.append(seat)
    else:
        seen.append(seat)
if len(repeats) == 0:
    print("no double bookings")
else:
    print(repeats)
`,
          fails: ["output", "three-times"],
          why: "a seat booked three times is reported twice",
        },
        {
          code: src`
bookings = [(12, "A"), (3, "C"), (12, "A"), (7, "B"), (12, "A"), (3, "C")]
seen = []
repeats = []
for row, letter in bookings:
    if row in seen:
        if (row, letter) not in repeats:
            repeats.append((row, letter))
    else:
        seen.append(row)
if len(repeats) == 0:
    print("no double bookings")
else:
    print(repeats)
`,
          fails: ["other-rows"],
          why: "only the row is compared, so two different seats in the same row look like a double booking",
        },
      ],
      task: {
        checks: [
          out("[(12, 'A'), (3, 'C')]\n"),
          shown("clean", { bookings: [tup(1, "A")] }, "no double bookings\n"),
          rerun("three-times", "a seat booked three times", { bookings: [tup(5, "D"), tup(5, "D"), tup(5, "D")] }, "[(5, 'D')]\n"),
          rerun("other-rows", "the same seat letter in different rows", { bookings: [tup(1, "A"), tup(2, "A"), tup(1, "B")] }, "no double bookings\n"),
          rerun("order", "repeats found in a different order from first booking", { bookings: [tup(1, "A"), tup(2, "B"), tup(2, "B"), tup(1, "A")] }, "[(2, 'B'), (1, 'A')]\n"),
          rerun("none", "no bookings at all", { bookings: [] }, "no double bookings\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q07-20",
    version: 2,
    slug: "longest-rainy-streak",
    title: "The longest rainy streak",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 15,
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "none-value", "tuple-literal", "tuple-unpack", "list-literal", "comparison", "if-statement", "else-clause", "nested-condition", "for-loop", "membership", "arithmetic", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "enumerate-call", "identity", "list-index", "logical", "string-format", "string-index"],
    prompt: "A station's daily record is a list of `(date, precipitation)` tuples, in date order. A rainy day has precipitation above 0. Find the longest run of rainy days in a row and print its length, first date and last date. If two runs are equally long, report the earlier one. If no day was rainy, print `no rain`.",
    spec: [
      ["Input", "`days`, a list of `(date, mm)` tuples in date order"],
      ["Prints", "`<length> days: <first date> to <last date>`, or `no rain`"],
      ["Ties", "the earlier run wins"],
      ["Examples", "the starter's record → `3 days: 2024-01-05 to 2024-01-07`"],
    ],
    hiddenKinds: ["a run at the very end", "two runs of the same length", "every day rainy", "no rain at all", "a single rainy day"],
    hints: [
      "Walk the days once, keeping the length of the current run and the date it started; a dry day resets the run.",
      "Separately keep the best run so far: its length, first date and last date.",
      "Update the best whenever the current run becomes strictly longer, which handles a run that reaches the end of the list and keeps the earlier of two equal runs.",
    ],
    explanation: "Two sets of variables: the current run (length and start date) and the best run (length, start and end). Each rainy day extends the current run (starting it if the length was 0) and, if it is now strictly longer than the best, copies it into the best with today's date as the end. A dry day sets the current length back to 0. Updating the best only when a dry day ends a run misses a run that lasts to the last day.",
    code: {
      starter: src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
`,
      answer: src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
best_length = 0
best_start = None
best_end = None
run_length = 0
run_start = None
for date, mm in days:
    if mm > 0:
        if run_length == 0:
            run_start = date
        run_length = run_length + 1
        if run_length > best_length:
            best_length = run_length
            best_start = run_start
            best_end = date
    else:
        run_length = 0
if best_length == 0:
    print("no rain")
else:
    print(f"{best_length} days: {best_start} to {best_end}")
`,
      alternatives: [
        src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
best = None
run = 0
for i, (date, mm) in enumerate(days):
    if mm > 0:
        run = run + 1
        if best is None or run > best[0]:
            first_date, first_mm = days[i - run + 1]
            best = (run, first_date, date)
    else:
        run = 0
if best is None:
    print("no rain")
else:
    length, first, last = best
    print(length, "days:", first, "to", last)
`,
      ],
      wrong: [
        {
          code: src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
best_length = 0
run_length = 0
run_start = None
previous = None
for date, mm in days:
    if mm > 0:
        if run_length == 0:
            run_start = date
        run_length = run_length + 1
    else:
        if run_length > best_length:
            best_length = run_length
            best_start = run_start
            best_end = previous
        run_length = 0
    previous = date
if best_length == 0:
    print("no rain")
else:
    print(f"{best_length} days: {best_start} to {best_end}")
`,
          fails: ["at-end", "all-rain"],
          why: "the best run is only updated when a dry day ends a run, so a run that lasts to the last day is missed",
        },
        {
          code: src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
best_length = 0
best_start = None
best_end = None
run_length = 0
run_start = None
for date, mm in days:
    if mm > 0:
        if run_length == 0:
            run_start = date
        run_length = run_length + 1
        if run_length >= best_length:
            best_length = run_length
            best_start = run_start
            best_end = date
    else:
        run_length = 0
if best_length == 0:
    print("no rain")
else:
    print(f"{best_length} days: {best_start} to {best_end}")
`,
          fails: ["tie"],
          why: "`>=` lets a later run of the same length replace the earlier one",
        },
        {
          code: src`
days = [("2024-01-01", 0), ("2024-01-02", 2.5), ("2024-01-03", 0.3), ("2024-01-04", 0), ("2024-01-05", 1.0), ("2024-01-06", 4.1), ("2024-01-07", 0.8), ("2024-01-08", 0)]
rainy = 0
first = None
last = None
for date, mm in days:
    if mm > 0:
        rainy = rainy + 1
        if first is None:
            first = date
        last = date
if rainy == 0:
    print("no rain")
else:
    print(f"{rainy} days: {first} to {last}")
`,
          fails: ["at-end", "output", "tie"],
          why: "it counts every rainy day, not the longest run of days in a row",
        },
      ],
      task: {
        checks: [
          out("3 days: 2024-01-05 to 2024-01-07\n"),
          rerun("at-end", "a run at the very end", { days: [tup("d1", 1), tup("d2", 0), tup("d3", 2), tup("d4", 3)] }, "2 days: d3 to d4\n"),
          rerun("tie", "two runs of the same length", { days: [tup("d1", 1), tup("d2", 1), tup("d3", 0), tup("d4", 5), tup("d5", 5)] }, "2 days: d1 to d2\n"),
          rerun("all-rain", "every day rainy", { days: [tup("a", 0.1), tup("b", 0.2)] }, "2 days: a to b\n"),
          rerun("dry", "no rain at all", { days: [tup("a", 0), tup("b", 0)] }, "no rain\n"),
          rerun("one", "a single rainy day", { days: [tup("2024-02-01", 0), tup("2024-02-02", 6.4), tup("2024-02-03", 0)] }, "1 days: 2024-02-02 to 2024-02-02\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q07-22",
    version: 2,
    slug: "leaderboard-with-ties",
    title: "A leaderboard with shared places",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 15,
    requires: ["assignment", "reassignment", "whole-number", "string-value", "none-value", "tuple-literal", "tuple-unpack", "list-literal", "list-mutate", "list-sort", "enumerate-call", "arithmetic", "comparison", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "len-call", "list-index", "nested-condition", "precedence", "print-text", "range-call", "string-format", "string-index"],
    prompt: "Print a quiz leaderboard from `(name, score)` tuples: highest score first, and players with the same score in alphabetical order of name. Players with equal scores share a place, and the next place skips accordingly (scores 91, 88, 88, 70 get places 1, 2, 2, 4). Each line is `<place> <name> <score>`.",
    spec: [
      ["Input", "`results`, a list of `(name, score)` tuples"],
      ["Order", "score from high to low; equal scores by name A–Z"],
      ["Places", "equal scores share a place; the next different score gets its position counting from 1"],
      ["Examples", "Ben 88, Ana 91, Dee 70, Cy 88 → `1 Ana 91`, `2 Ben 88`, `2 Cy 88`, `4 Dee 70`"],
    ],
    hiddenKinds: ["everyone tied", "a tie at the bottom", "names that would sort differently by score alone", "a single player"],
    hints: [
      "Sorting tuples compares the first items, then the second. Build tuples whose first item puts the highest score first when sorted normally.",
      "A negated score sorts high scores first; a name as the second item breaks ties alphabetically.",
      "Walk the sorted list with `enumerate`. The place changes only when the score differs from the previous one, and then it becomes position + 1.",
    ],
    explanation: "Building `(-score, name)` tuples and calling `sorted` orders by score descending and name ascending in one sort; `sorted(..., reverse=True)` on `(score, name)` would put equal scores in reverse alphabetical order. Then the place is `i + 1` whenever the score changes and stays the same while it repeats, which gives 1, 2, 2, 4.",
    code: {
      starter: src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
`,
      answer: src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
keyed = []
for name, score in results:
    keyed.append((-score, name))
keyed.sort()
place = 0
previous = None
for i, (negative, name) in enumerate(keyed):
    if negative != previous:
        place = i + 1
        previous = negative
    print(place, name, -negative)
`,
      alternatives: [
        src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
rows = []
for name, score in results:
    rows.append((0 - score, name))
rows = sorted(rows)
place = 1
for i in range(len(rows)):
    negative, name = rows[i]
    if i > 0:
        before, other = rows[i - 1]
        if negative != before:
            place = i + 1
    print(f"{place} {name} {-negative}")
`,
      ],
      wrong: [
        {
          code: src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
keyed = []
for name, score in results:
    keyed.append((score, name))
keyed.sort(reverse=True)
place = 0
previous = None
for i, (score, name) in enumerate(keyed):
    if score != previous:
        place = i + 1
        previous = score
    print(place, name, score)
`,
          fails: ["all-tied", "bottom-tie", "names", "output"],
          why: "`reverse=True` also reverses the names, so tied players come out Z–A",
        },
        {
          code: src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
keyed = []
for name, score in results:
    keyed.append((-score, name))
keyed.sort()
place = 0
previous = None
for negative, name in keyed:
    if negative != previous:
        place = place + 1
        previous = negative
    print(place, name, -negative)
`,
          fails: ["output", "names"],
          why: "adding 1 to the place gives 1, 2, 2, 3; after a tie the next place should skip to 4",
        },
        {
          code: src`
results = [("Ben", 88), ("Ana", 91), ("Dee", 70), ("Cy", 88)]
keyed = []
for name, score in results:
    keyed.append((-score, name))
keyed.sort()
for i, (negative, name) in enumerate(keyed):
    print(i + 1, name, -negative)
`,
          fails: ["all-tied", "bottom-tie", "names", "output"],
          why: "every player gets their own place, so tied scores don't share one",
        },
      ],
      task: {
        checks: [
          out("1 Ana 91\n2 Ben 88\n2 Cy 88\n4 Dee 70\n"),
          rerun("all-tied", "everyone tied", { results: [tup("Zoe", 50), tup("Ali", 50), tup("Max", 50)] }, "1 Ali 50\n1 Max 50\n1 Zoe 50\n"),
          rerun("bottom-tie", "a tie at the bottom", { results: [tup("Bo", 3), tup("Al", 9), tup("Cy", 3)] }, "1 Al 9\n2 Bo 3\n2 Cy 3\n"),
          rerun("names", "names that would sort differently by score alone", { results: [tup("Ann", 10), tup("Zed", 30), tup("Bea", 20), tup("Cal", 20), tup("Dan", 5)] }, "1 Zed 30\n2 Bea 20\n2 Cal 20\n4 Ann 10\n5 Dan 5\n"),
          rerun("single", "a single player", { results: [tup("Solo", 7)] }, "1 Solo 7\n"),
        ],
      },
    },
  },
];
