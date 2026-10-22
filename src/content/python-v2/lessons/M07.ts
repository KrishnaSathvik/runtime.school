/**
 * M07 Lists & Tuples: five lessons (PY-L07-01 … PY-L07-05).
 *
 * A list holds many values in order and can change; a tuple holds a fixed record. The module covers making and walking
 * a list, reading items and slices by position, changing a list in place (append, pop, item assignment), sorting with
 * sorted and sort, the difference between a second name for the same list and a copy, and unpacking tuples. Fixtures
 * are NOAA daily readings (D07, with real gaps), Runtime Films titles, years, runtimes and ratings (R02), and Runtime
 * Market product IDs (R01).
 *
 * Functions arrive in M09, so exercises are short programs with their inputs on the first lines. They are graded on
 * their output and re-run with other lists (hidden `variant` checks: empty lists, one item, ties, gaps, negatives).
 * Version 2: rewritten from a print-the-literal module; saved progress from version 1 does not count as mastery.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyLesson } from "../model";
import { pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** Re-run the whole program with other values for its input lines (hidden): it must print `output`. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, pv(v)])),
  output,
  hidden: true,
});
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m07Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L07-01 lists and tuples
  {
    id: "PY-L07-01",
    version: 2,
    slug: "make-a-list",
    title: "Make a list",
    lede: "A list holds many values in order under one name: a week of temperatures, a watchlist. A tuple holds a fixed record, such as a film's title and year.",
    focus: "Store many values in a list, walk them with for, and keep a fixed record in a tuple.",
    minutes: 16,
    objectives: [
      "Write a list with square brackets and walk it with `for`",
      "Count, total and test membership with `len`, a loop and `in`",
      "Explain when a tuple fits better than a list, and why `in` on a list matches whole items only",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "comparison", "if-statement", "for-loop", "membership", "len-call", "top-level-indent", "else-clause", "print-number", "string-format", "string-index"],
    teaches: ["list-literal", "tuple-literal"],
    blocks: [
      {
        kind: "text",
        md: "A weather station reports a temperature every day. With one name per value (`day1`, `day2` …) you couldn't loop over them, and a month of readings would need 31 names. A **list** keeps any number of values in order under one name: `highs = [6.7, 7.2, 3.3]`. Square brackets hold the items, and commas separate them.\n\nEverything you did with the characters of a text works with the items of a list. `for` visits each item in order, `len` counts the items, and `in` asks whether a value is one of them.",
      },
      {
        kind: "example",
        title: "A week of daily highs",
        code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
print(highs)
print(len(highs), "days")
warm = 0
for t in highs:
    if t > 5:
        warm = warm + 1
print(warm, "days above 5 C")
print(-2.1 in highs, 10 in highs)
`,
        output: "[6.7, 7.2, 3.3, 7.2, 3.9, -2.1]\n6 days\n3 days above 5 C\nTrue False\n",
        note: "These are real highs from a Great Falls, Montana station in January 2024. A list can hold the same value twice (7.2), and it keeps the items in the order they were written.",
      },
      {
        kind: "text",
        md: "A **tuple** is written with parentheses: `(\"Wild Archive\", 2008, \"de\")`. Use a tuple for a fixed record whose positions mean different things: a title, a year, a language. Use a list for a collection of similar things that may grow.\n\nWatch what `in` means on each kind of value. On a text, `in` looks for a piece of the text. On a list, it looks for a whole item.",
      },
      {
        kind: "example",
        title: "A watchlist and one film's record",
        code: src`
watchlist = ["Glass Echo of Glass", "Wild Archive", "Glass Horizon on Fire"]
film = ("Wild Archive", 2008, "de")
print(film)
print(len(film))
print("Wild Archive" in watchlist)
print("Wild" in watchlist)
print("Wild" in "Wild Archive")
`,
        output: "('Wild Archive', 2008, 'de')\n3\nTrue\nFalse\nTrue\n",
        note: "`\"Wild\" in watchlist` is False, because no item is exactly `\"Wild\"`. The same test on one title is True, because `Wild` is part of that text.",
      },
      {
        kind: "text",
        md: "**When to use it:** use a list for many values of the same kind that you will loop over, count or search, such as readings, IDs or titles. Use a tuple for a small fixed record. **Mistakes to avoid:**\n\n- Expecting `in` on a list to find part of an item.\n- Forgetting the commas between items. `[\"a\" \"b\"]` is a list with one item, `\"ab\"`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count the frosty days",
      prompt: "This counts the days warmer than 5 °C. Change it to count the days whose high was **below freezing** (below 0), and print `<n> days below freezing`.",
      spec: [
        ["Input", "`highs`, a list of daily highs"],
        ["Prints", "`<n> days below freezing`"],
      ],
      starter: src`
highs = [6.7, -0.5, 3.3, 7.2, 3.9, -2.1]
warm = 0
for t in highs:
    if t > 5:
        warm = warm + 1
print(warm, "days above 5 C")
`,
      answer: src`
highs = [6.7, -0.5, 3.3, 7.2, 3.9, -2.1]
frosty = 0
for t in highs:
    if t < 0:
        frosty = frosty + 1
print(frosty, "days below freezing")
`,
      wrong: [
        {
          code: src`
highs = [6.7, -0.5, 3.3, 7.2, 3.9, -2.1]
frosty = 0
for t in highs:
    if t <= 0:
        frosty = frosty + 1
print(frosty, "days below freezing")
`,
          fails: ["zero"],
          why: "`<= 0` also counts a day of exactly 0, which is not below freezing",
        },
      ],
      hints: [
        "The loop and the counter stay; only the test and the message change.",
        "Below freezing means below 0.",
        "Change the printed words too, so the line says what was counted.",
      ],
      task: {
        checks: [
          out("2 days below freezing\n"),
          rerun("zero", "a day of exactly 0", { highs: [0, -1.5, 2, -3.2] }, "2 days below freezing\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Rainfall for the week",
        prompt: "Daily precipitation from a weather station arrives as a list of millimetres. Print the week's total and the average per day, each with one decimal, as `total 4.0 mm, average 0.8 mm`. A station that sent nothing gives an empty list: print `no readings` instead, without dividing by zero.",
        spec: [
          ["Input", "`rain`, a list of numbers (it may be empty)"],
          ["Prints", "`total <t> mm, average <a> mm` with one decimal each, or `no readings`"],
          ["Example", "`[0, 2.5, 0, 1.2, 0.3]` prints `total 4.0 mm, average 0.8 mm`"],
        ],
        starter: src`
rain = [0, 2.5, 0, 1.2, 0.3]
`,
        answer: src`
rain = [0, 2.5, 0, 1.2, 0.3]
if len(rain) == 0:
    print("no readings")
else:
    total = 0
    for mm in rain:
        total = total + mm
    print(f"total {total:.1f} mm, average {total / len(rain):.1f} mm")
`,
        alternatives: [
          src`
rain = [0, 2.5, 0, 1.2, 0.3]
total = 0
days = 0
for mm in rain:
    total = total + mm
    days = days + 1
if days > 0:
    average = total / days
    print(f"total {total:.1f} mm, average {average:.1f} mm")
else:
    print("no readings")
`,
        ],
        wrong: [
          {
            code: src`
rain = [0, 2.5, 0, 1.2, 0.3]
total = 0
for mm in rain:
    total = total + mm
print(f"total {total:.1f} mm, average {total / len(rain):.1f} mm")
`,
            fails: ["empty"],
            why: "an empty list makes `len(rain)` 0, and dividing by it raises ZeroDivisionError",
          },
          {
            code: src`
rain = [0, 2.5, 0, 1.2, 0.3]
if len(rain) == 0:
    print("no readings")
else:
    total = 0
    for mm in rain:
        if mm > 0:
            total = total + mm
    print(f"total {total:.1f} mm, average {total / 3:.1f} mm")
`,
            fails: ["one-day", "output"],
            why: "the average is divided by a typed-in 3 instead of the number of days",
          },
        ],
        hints: [
          "Deal with the empty list first, so the rest of the program can assume there is at least one reading.",
          "Add the readings up in a loop, starting from 0.",
          "The average divides the total by how many readings there are, and `len` counts them.",
        ],
        task: {
          checks: [
            out("total 4.0 mm, average 0.8 mm\n"),
            rerun("empty", "a station that sent no readings", { rain: [] }, "no readings\n"),
            rerun("one-day", "a single reading", { rain: [12.7] }, "total 12.7 mm, average 12.7 mm\n"),
            rerun("dry", "a dry week", { rain: [0, 0, 0, 0] }, "total 0.0 mm, average 0.0 mm\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "The longest title",
        prompt: "A film catalogue's layout needs to know its longest title. Print the longest title in `titles` and its number of characters. If two titles are equally long, keep the one that comes first.",
        spec: [
          ["Input", "`titles`, a list of at least one film title"],
          ["Prints", "the longest title, a space, and its length"],
          ["Ties", "the earlier title wins"],
          ["Example", "the starter's list prints `Glass Horizon on Fire 21`"],
        ],
        starter: src`
titles = ["Glass Echo of Glass", "Wild Island for Two", "Glass Horizon on Fire", "Wild Archive"]
`,
        answer: src`
titles = ["Glass Echo of Glass", "Wild Island for Two", "Glass Horizon on Fire", "Wild Archive"]
longest = ""
for title in titles:
    if len(title) > len(longest):
        longest = title
print(longest, len(longest))
`,
        alternatives: [
          src`
titles = ["Glass Echo of Glass", "Wild Island for Two", "Glass Horizon on Fire", "Wild Archive"]
best_length = -1
for title in titles:
    size = len(title)
    if size > best_length:
        best_length = size
        longest = title
print(f"{longest} {best_length}")
`,
        ],
        wrong: [
          {
            code: src`
titles = ["Glass Echo of Glass", "Wild Island for Two", "Glass Horizon on Fire", "Wild Archive"]
longest = ""
for title in titles:
    if len(title) >= len(longest):
        longest = title
print(longest, len(longest))
`,
            fails: ["tie"],
            why: "`>=` lets a later title of the same length take over, so ties go to the last one",
          },
          {
            code: src`
titles = ["Glass Echo of Glass", "Wild Island for Two", "Glass Horizon on Fire", "Wild Archive"]
longest = ""
for title in titles:
    if title > longest:
        longest = title
print(longest, len(longest))
`,
            fails: ["output"],
            why: "`title > longest` compares the texts alphabetically, not by length",
          },
        ],
        hints: [
          "Keep the best title so far, starting from an empty text, and compare each title with it.",
          "Compare lengths, not the titles themselves.",
          "Replace the best only when a title is strictly longer, so an earlier title keeps a tie.",
        ],
        task: {
          checks: [
            out("Glass Horizon on Fire 21\n"),
            rerun("tie", "two titles of the same length", { titles: ["Wild Archive", "Night Harbor", "Up"] }, "Wild Archive 12\n"),
            rerun("first-longest", "the longest title first", { titles: ["Zeta Station at Midnight", "Alpha", "Bravo"] }, "Zeta Station at Midnight 24\n"),
            rerun("single", "a one-title list", { titles: ["Up"] }, "Up 2\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
codes = ["P0607", "P0208", "P0607"]
print(len(codes), "P0607" in codes, "P06" in codes)
`,
        choices: ["3 True False", "2 True True", "3 True True", "2 True False"],
        answer: 0,
        why: "A list keeps repeats, so there are 3 items. `in` on a list matches whole items, and no item is exactly \"P06\".",
      },
      {
        id: "q2",
        prompt: "A common mistake: a comma is missing. What does this print?",
        program: src`
cities = ["Miami" "Denver", "Houston"]
print(len(cities))
print(cities)
`,
        choices: ["2\n['MiamiDenver', 'Houston']", "3\n['Miami', 'Denver', 'Houston']", "2\n['Miami', 'Houston']", "SyntaxError"],
        answer: 0,
        why: "Two texts written side by side are joined into one, so the list has two items and the first is \"MiamiDenver\". There is no error to warn you.",
      },
      {
        id: "q3",
        prompt: "Which value is best stored as a tuple rather than a list?",
        choices: ["One film's (title, year, language)", "Every rating a user gave", "The IDs of the products in a cart", "A month of daily temperatures"],
        answer: 0,
        why: "A tuple is a fixed record whose positions mean different things. The others are collections of the same kind of value that can grow.",
      },
    ],
    review: [
      "A list, written `[a, b, c]`, holds values in order. `for` walks them, `len` counts them, and `in` matches whole items.",
      "A tuple, written `(a, b, c)`, is a fixed record such as a title and a year.",
      "Check for an empty list before dividing by its length.",
      "Next: pick items and pieces of a list by their position.",
    ],
  },

  // ------------------------------------------------------------------ PY-L07-02 index and slice
  {
    id: "PY-L07-02",
    version: 2,
    slug: "list-indexes",
    title: "Pick an item by position",
    lede: "list[n] is the item at position n, list[-1] is the last item, and list[a:b] is a new list of the items in between. The positions work just as they do for text.",
    focus: "Read items and slices of a list by position, including neighbours of an item.",
    minutes: 16,
    objectives: [
      "Read the first, last and nth item, and take a slice of a list",
      "Loop over positions with `range(len(items))` when you need an item's neighbour",
      "Recognise `IndexError` and the off-by-one mistakes that cause it",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "range-call", "len-call", "string-index", "string-slice", "string-format", "top-level-indent", "runtime-error", "list-literal", "else-clause", "identity", "logical", "membership", "none-value"],
    teaches: ["list-index"],
    blocks: [
      {
        kind: "text",
        md: "A list's items have positions, just as a text's characters do. `ratings[0]` is the first item, `ratings[-1]` is the last, and `ratings[1:3]` is a **new list** holding the items at positions 1 and 2. All the rules from the Strings & Text module carry over. Positions start at 0, the end of a slice is not included, and a slice past the end is shorter instead of an error.",
      },
      {
        kind: "example",
        title: "Positions in a list of ratings",
        code: src`
ratings = [4.5, 3, 5, 2.5, 4]
print(ratings[0], ratings[-1], len(ratings))
print(ratings[1:3])
print(ratings[-2:])
`,
        output: "4.5 4 5\n[3, 5]\n[2.5, 4]\n",
        note: "These are one Runtime Films user's half-star ratings. A slice of a list is a list, which is why it prints with brackets.",
      },
      {
        kind: "error-example",
        title: "Reading past the last item",
        code: src`
ratings = [4.5, 3, 5, 2.5, 4]
print(ratings[len(ratings) - 1])
print(ratings[5])
`,
        error: "IndexError",
        output: "4\n",
        note: "The program stops with `IndexError: list index out of range`. Five items sit at positions 0 to 4.",
      },
      {
        kind: "text",
        md: "Some questions compare an item with its neighbour: *how much did the temperature change since yesterday?* `for t in highs` gives you each item but not the one before it. Loop over the **positions** instead, with `range(len(highs))`, and read `highs[i]` and `highs[i - 1]`. Start at 1, because position 0 has no day before it.",
      },
      {
        kind: "example",
        title: "Day-to-day temperature change",
        code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
for i in range(1, len(highs)):
    change = highs[i] - highs[i - 1]
    print(f"Day {i + 1}: {change:+.1f}")
`,
        output: "Day 2: +0.5\nDay 3: -3.9\nDay 4: +3.9\nDay 5: -3.3\nDay 6: -6.0\n",
        note: "`range(1, len(highs))` gives 1 to 5, so `i - 1` is never below 0. The `+` in the spec `:+.1f` shows the sign of a rise too. People count days from 1, so the label shows `i + 1`.",
      },
      {
        kind: "text",
        md: "**When to use it:** use positions for the first or last item, a fixed window such as the last 3 days, or a comparison with a neighbour. When you only need each item, `for item in items` is simpler. **Mistakes to avoid:**\n\n- Starting a neighbour loop at 0. Then `highs[0 - 1]` quietly reads the *last* item.\n- Using `len(items)` as a position.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The most recent ratings",
      prompt: "This prints the first two ratings. Change the slice so it prints the user's **last three** ratings, whatever the length of the list.",
      spec: [
        ["Input", "`ratings`, a list of at least three ratings"],
        ["Prints", "a list of the last three"],
      ],
      starter: src`
ratings = [4.5, 3, 5, 2.5, 4]
print(ratings[:2])
`,
      answer: src`
ratings = [4.5, 3, 5, 2.5, 4]
print(ratings[-3:])
`,
      wrong: [
        {
          code: src`
ratings = [4.5, 3, 5, 2.5, 4]
print(ratings[2:])
`,
          fails: ["longer"],
          why: "starting at position 2 gives the last three only when the list has exactly five items",
        },
      ],
      hints: [
        "Count from the end rather than from the start.",
        "A negative start means \"this many from the end\".",
        "Leave the end of the slice empty so it runs to the last item.",
      ],
      task: {
        checks: [
          out("[5, 2.5, 4]\n"),
          rerun("longer", "a longer list", { ratings: [1, 2, 3, 4, 5, 0.5, 3.5] }, "[5, 0.5, 3.5]\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The recent average",
        prompt: "A weather app shows the average high of the **last three days** in the list, with one decimal. If the list has fewer than three readings, it averages all of them.",
        spec: [
          ["Input", "`highs`, a list of at least one reading"],
          ["Prints", "the average of the last three readings (or all of them, if fewer), with one decimal"],
          ["Example", "`[6.7, 7.2, 3.3, 7.2, 3.9, -2.1]` prints `3.0`"],
        ],
        starter: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
`,
        answer: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
recent = highs[-3:]
total = 0
for t in recent:
    total = total + t
print(f"{total / len(recent):.1f}")
`,
        alternatives: [
          src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
start = len(highs) - 3
if start < 0:
    start = 0
total = 0
for i in range(start, len(highs)):
    total = total + highs[i]
print(f"{total / (len(highs) - start):.1f}")
`,
        ],
        wrong: [
          {
            code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
recent = highs[-3:]
total = 0
for t in recent:
    total = total + t
print(f"{total / 3:.1f}")
`,
            fails: ["one-day", "two-days"],
            why: "dividing by 3 is wrong when the list has fewer than three readings",
          },
          {
            code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
recent = highs[:3]
total = 0
for t in recent:
    total = total + t
print(f"{total / len(recent):.1f}")
`,
            fails: ["output", "longer"],
            why: "`highs[:3]` is the first three days, not the last three",
          },
        ],
        hints: [
          "Slice the readings you want first, then average that slice.",
          "A slice with a negative start gives the last few items, and it is simply shorter when the list is short.",
          "Divide by the length of the slice, not by a fixed number.",
        ],
        task: {
          checks: [
            out("3.0\n"),
            rerun("two-days", "fewer than three readings", { highs: [10, 12] }, "11.0\n"),
            rerun("longer", "a longer list", { highs: [30, 30, 30, 1, 2, 3] }, "2.0\n"),
            rerun("one-day", "a single reading", { highs: [-4.5] }, "-4.5\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "The biggest swing",
        prompt: "Find the biggest change in temperature between two days in a row, rising or falling. Print the day it happened, counting the first day as day 1, and the size of the change with one decimal: `day 6: 6.0`. If several changes are equally big, report the first. If the list has fewer than two readings, or no change at all, print `no change`.",
        spec: [
          ["Input", "`highs`, a list of daily highs"],
          ["Prints", "`day <n>: <size>`, where the change is from day n − 1 to day n, or `no change`"],
          ["Size", "how big the change is, ignoring its direction (a drop of 6.0 counts as 6.0)"],
          ["Example", "`[6.7, 7.2, 3.3, 7.2, 3.9, -2.1]` prints `day 6: 6.0`"],
        ],
        starter: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
`,
        answer: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
best_day = 0
best_size = 0
for i in range(1, len(highs)):
    size = highs[i] - highs[i - 1]
    if size < 0:
        size = -size
    if size > best_size:
        best_size = size
        best_day = i + 1
if best_day == 0:
    print("no change")
else:
    print(f"day {best_day}: {best_size:.1f}")
`,
        alternatives: [
          src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
best = None
for i in range(len(highs) - 1):
    change = highs[i + 1] - highs[i]
    if change < 0:
        change = change * -1
    if change > 0 and (best is None or change > best):
        best = change
        day = i + 2
if best is None:
    print("no change")
else:
    print(f"day {day}: {best:.1f}")
`,
        ],
        wrong: [
          {
            code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
best_day = 0
best_size = 0
for i in range(1, len(highs)):
    size = highs[i] - highs[i - 1]
    if size > best_size:
        best_size = size
        best_day = i + 1
if best_day == 0:
    print("no change")
else:
    print(f"day {best_day}: {best_size:.1f}")
`,
            fails: ["output", "falling"],
            why: "only rises are counted, so a big drop is missed",
          },
          {
            code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
best_day = 0
best_size = 0
for i in range(1, len(highs)):
    size = highs[i] - highs[i - 1]
    if size < 0:
        size = -size
    if size >= best_size:
        best_size = size
        best_day = i + 1
if best_day == 0:
    print("no change")
else:
    print(f"day {best_day}: {best_size:.1f}")
`,
            fails: ["tie", "flat"],
            why: "`>=` hands a tie to the later day, and turns a flat week into a change of 0.0",
          },
          {
            code: src`
highs = [6.7, 7.2, 3.3, 7.2, 3.9, -2.1]
best_day = 0
best_size = 0
for i in range(len(highs)):
    size = highs[i] - highs[i - 1]
    if size < 0:
        size = -size
    if size > best_size:
        best_size = size
        best_day = i + 1
if best_day == 0:
    print("no change")
else:
    print(f"day {best_day}: {best_size:.1f}")
`,
            fails: ["output", "tie"],
            why: "starting at 0 compares the first day with `highs[-1]`, the last day",
          },
        ],
        hints: [
          "Loop over positions from 1, so each day can be compared with the one before it.",
          "Turn a negative change into its positive size before comparing it with the best so far.",
          "Keep the best size and its day. Replace them only when a change is strictly bigger, and start from 0 so that \"no change\" is easy to spot.",
        ],
        task: {
          checks: [
            out("day 6: 6.0\n"),
            rerun("falling", "a sharp drop", { highs: [0, -10, -9] }, "day 2: 10.0\n"),
            rerun("tie", "two changes of the same size", { highs: [1, 4, 1, 4] }, "day 2: 3.0\n"),
            rerun("flat", "a week with no change", { highs: [5, 5, 5] }, "no change\n"),
            rerun("one", "a single reading", { highs: [12.5] }, "no change\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
ids = ["O100043", "O101217", "O104839", "O108752"]
last = ids[-1]
print(ids[1], last[1:], ids[1:2])
`,
        choices: ["O101217 108752 ['O101217']", "O100043 108752 ['O101217']", "O101217 O108752 ['O101217']", "O101217 108752 O101217"],
        answer: 0,
        why: "`ids[1]` is the second item. `ids[-1]` is the last ID, and `[1:]` drops its first character. `ids[1:2]` is a list with one item, so it prints with brackets.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the neighbour loop starts at 0. What does the first printed line show?",
        program: src`
highs = [6.7, 7.2, 3.3]
for i in range(len(highs)):
    print(highs[i] - highs[i - 1])
`,
        choices: ["3.4000000000000004\n0.5\n-3.9000000000000004", "0.5\n-3.9000000000000004", "IndexError", "0.0\n0.5\n-3.9000000000000004"],
        answer: 0,
        why: "When `i` is 0, `highs[i - 1]` is `highs[-1]`, the last day, so the first line is 6.7 − 3.3. No error warns you about it.",
      },
      {
        id: "q3",
        prompt: "Which job needs a loop over positions rather than `for item in items`?",
        choices: ["Comparing each day's high with the day before", "Counting the days above 5 °C", "Adding up a week's rainfall", "Checking whether a title is in a watchlist"],
        answer: 0,
        why: "Only the comparison needs a second item, the neighbour, which you reach through its position. The others look at one item at a time.",
      },
    ],
    review: [
      "`items[n]`, `items[-1]` and `items[a:b]` work on lists as they do on text. A slice of a list is a new list.",
      "Loop over `range(1, len(items))` when each item is compared with the one before it.",
      "Five items sit at positions 0 to 4. Asking for position 5 raises IndexError.",
      "Next: change a list in place by adding, replacing and removing items.",
    ],
  },

  // ------------------------------------------------------------------ PY-L07-03 change a list
  {
    id: "PY-L07-03",
    version: 2,
    slug: "change-a-list",
    title: "Change a list",
    lede: "Unlike text, a list can change in place. append adds an item, items[i] = x replaces one, and pop removes the last one. A tuple can't change.",
    focus: "Change a list in place with append, item assignment and pop, and build a new list in a loop.",
    minutes: 18,
    objectives: [
      "Add, replace and remove items, and explain that these change the list itself",
      "Build a result list in a loop, starting from `[]`",
      "Avoid `items = items.append(x)`, and explain why a tuple raises TypeError",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "comparison", "if-statement", "else-clause", "for-loop", "range-call", "len-call", "top-level-indent", "runtime-error", "list-literal", "list-index", "tuple-literal", "membership", "nested-condition", "string-index", "truthiness"],
    teaches: ["list-mutate"],
    blocks: [
      {
        kind: "text",
        md: "Text never changes, and every string method builds a new text. A list is different: it can change **in place**. A shopping cart is a good picture of this, because the same cart gains items, has an item swapped and loses the last one.\n\n- `cart.append(x)` adds `x` at the end.\n- `cart[i] = x` replaces the item at position `i`.\n- `cart.pop()` removes the last item and gives it back to you.",
      },
      {
        kind: "example",
        title: "A cart that changes",
        code: src`
cart = []
cart.append("P0607")
cart.append("P0208")
cart.append("P0659")
print(cart, len(cart))
cart[1] = "P0209"
print(cart)
removed = cart.pop()
print(removed, cart)
`,
        output: "['P0607', 'P0208', 'P0659'] 3\n['P0607', 'P0209', 'P0659']\nP0659 ['P0607', 'P0209']\n",
        note: "There is one list the whole time, and `cart` keeps naming it while it changes. `pop` both removes the last item and returns it, so you can still use it.",
      },
      {
        kind: "text",
        md: "Changing items through their positions is how you repair data in place. Weather stations sometimes miss a day, and the gap arrives as `None`. A common fix is to carry the previous day's reading forward. Loop over positions, so you can both read the previous item and replace the current one.",
      },
      {
        kind: "example",
        title: "Filling gaps in the readings",
        code: src`
temps = [6.7, None, 3.3, None, None, 3.9]
for i in range(1, len(temps)):
    if temps[i] is None:
        temps[i] = temps[i - 1]
print(temps)
`,
        output: "[6.7, 6.7, 3.3, 3.3, 3.3, 3.9]\n",
        note: "Two gaps in a row both become 3.3, because by the time position 4 is checked, position 3 has already been filled. `is None` is the test for a missing value (see Operators & Expressions).",
      },
      {
        kind: "error-example",
        title: "A tuple can't change",
        code: src`
film = ("Wild Archive", 2008)
print(film[1])
film[1] = 2009
`,
        error: "TypeError",
        output: "2008\n",
        note: "The program stops with `TypeError: 'tuple' object does not support item assignment`. That is the point of a tuple: a record that can't be changed by accident.",
      },
      {
        kind: "text",
        md: "**When to use it:** to collect results in a loop (start from `[]` and `append`), and to update or repair a list that the rest of the program shares. **Mistakes to avoid:**\n\n- Writing `cart = cart.append(x)`. `append` changes the list and returns `None`, so this replaces your list with `None`.\n- Calling `pop()` on an empty list, which raises IndexError. Check `len` first.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Collect the warm days",
      prompt: "The loop counts the days above 20 °C. Change it to **collect** those highs in the list `warm`, then print the list.",
      spec: [
        ["Input", "`highs`, a list of daily highs"],
        ["Prints", "the list of highs above 20, in their original order"],
      ],
      starter: src`
highs = [18.5, 22.1, 25.4, 19.9, 21.0]
warm = []
for t in highs:
    if t > 20:
        print(t)
`,
      answer: src`
highs = [18.5, 22.1, 25.4, 19.9, 21.0]
warm = []
for t in highs:
    if t > 20:
        warm.append(t)
print(warm)
`,
      wrong: [
        {
          code: src`
highs = [18.5, 22.1, 25.4, 19.9, 21.0]
warm = []
for t in highs:
    if t > 20:
        warm = [t]
print(warm)
`,
          fails: ["output"],
          why: "`warm = [t]` replaces the whole list each time, so only the last warm day is left",
        },
      ],
      hints: [
        "Instead of printing each warm high, add it to `warm`.",
        "`append` adds one item at the end of the list.",
        "Print the list once, after the loop has finished.",
      ],
      task: {
        checks: [
          out("[22.1, 25.4, 21.0]\n"),
          rerun("cold", "a week with one warm day", { highs: [10, 25, 11] }, "[25]\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Undo at the checkout scanner",
        prompt: "A self-checkout scanner sends the codes it reads. The special code `UNDO` means the customer removed the last item scanned. Build the final cart from `scans` and print it. An `UNDO` when the cart is empty does nothing.",
        spec: [
          ["Input", "`scans`, a list of product IDs and `\"UNDO\"`"],
          ["Prints", "the cart as a list, in the order the remaining items were scanned"],
          ["Example", "`[\"P0607\", \"P0208\", \"UNDO\", \"P0659\", \"P0659\"]` prints `['P0607', 'P0659', 'P0659']`"],
        ],
        starter: src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
`,
        answer: src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
for code in scans:
    if code == "UNDO":
        if len(cart) > 0:
            cart.pop()
    else:
        cart.append(code)
print(cart)
`,
        alternatives: [
          src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
for code in scans:
    if code != "UNDO":
        cart.append(code)
    elif cart:
        cart.pop()
print(cart)
`,
        ],
        wrong: [
          {
            code: src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
for code in scans:
    if code == "UNDO":
        cart.pop()
    else:
        cart.append(code)
print(cart)
`,
            fails: ["early-undo"],
            why: "an UNDO on an empty cart calls `pop()` on an empty list, which raises IndexError",
          },
          {
            code: src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
for code in scans:
    if code != "UNDO":
        cart.append(code)
print(cart)
`,
            fails: ["output", "two-undos", "early-undo"],
            why: "the UNDO codes are skipped, but nothing is ever removed",
          },
          {
            code: src`
scans = ["P0607", "P0208", "UNDO", "P0659", "P0659"]
cart = []
for code in scans:
    if code == "UNDO":
        if len(cart) > 0:
            cart = cart[1:]
    else:
        cart.append(code)
print(cart)
`,
            fails: ["output", "two-undos"],
            why: "`cart[1:]` drops the first item scanned, not the last",
          },
        ],
        hints: [
          "Start from an empty cart and decide what each scan does to it.",
          "An ordinary code is added at the end, and an UNDO removes the item at the end.",
          "Removing from an empty list is an error, so check the cart's length first.",
        ],
        task: {
          checks: [
            out("['P0607', 'P0659', 'P0659']\n"),
            rerun("two-undos", "two UNDOs in a row", { scans: ["A", "B", "C", "UNDO", "UNDO", "D"] }, "['A', 'D']\n"),
            rerun("early-undo", "an UNDO before anything was scanned", { scans: ["UNDO", "P0164", "UNDO", "UNDO"] }, "[]\n"),
            rerun("no-undo", "no UNDO at all", { scans: ["P0035"] }, "['P0035']\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Running rainfall total",
        prompt: "A rainfall chart plots the total so far on each day. From the daily amounts in `rain`, build a new list `running` whose item i is the sum of days 0 to i, and print it. `rain` must stay unchanged, because it is printed on the next line as well.",
        spec: [
          ["Input", "`rain`, a list of daily amounts in mm (it may be empty)"],
          ["Prints", "line 1: the running totals as a list; line 2: `rain`, unchanged"],
          ["Example", "`[0, 2.5, 0, 1.2, 0.3]` prints `[0, 2.5, 2.5, 3.7, 4.0]` then the original list"],
        ],
        starter: src`
rain = [0, 2.5, 0, 1.2, 0.3]
running = []
`,
        answer: src`
rain = [0, 2.5, 0, 1.2, 0.3]
running = []
total = 0
for mm in rain:
    total = total + mm
    running.append(total)
print(running)
print(rain)
`,
        alternatives: [
          src`
rain = [0, 2.5, 0, 1.2, 0.3]
running = []
for i in range(len(rain)):
    if i == 0:
        running.append(rain[0])
    else:
        running.append(running[i - 1] + rain[i])
print(running)
print(rain)
`,
        ],
        wrong: [
          {
            code: src`
rain = [0, 2.5, 0, 1.2, 0.3]
running = []
for i in range(1, len(rain)):
    rain[i] = rain[i] + rain[i - 1]
running = rain
print(running)
print(rain)
`,
            fails: ["output", "steady"],
            why: "the totals are written into `rain` itself, so the original amounts are lost",
          },
          {
            code: src`
rain = [0, 2.5, 0, 1.2, 0.3]
running = []
total = 0
for mm in rain:
    running.append(total)
    total = total + mm
print(running)
print(rain)
`,
            fails: ["output", "steady", "single"],
            why: "each total is appended before the day's rain is added, so every item is one day behind",
          },
        ],
        hints: [
          "Keep a total that grows as you walk the list, and record it each day.",
          "Add the day's amount first, then append the total.",
          "Build the new list with `append`, and leave `rain` alone.",
        ],
        task: {
          checks: [
            out("[0, 2.5, 2.5, 3.7, 4.0]\n[0, 2.5, 0, 1.2, 0.3]\n"),
            rerun("steady", "steady rain", { rain: [1, 2, 3] }, "[1, 3, 6]\n[1, 2, 3]\n"),
            rerun("empty", "an empty list", { rain: [] }, "[]\n[]\n"),
            rerun("single", "a single day", { rain: [12.7] }, "[12.7]\n[12.7]\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
queue = ["O100043", "O101217", "O104839"]
queue.append("O108752")
queue[0] = "O100282"
last = queue.pop()
print(len(queue), queue[0], last)
`,
        choices: ["3 O100282 O108752", "4 O100282 O108752", "3 O100043 O104839", "3 O100282 O104839"],
        answer: 0,
        why: "After `append` there are 4 IDs. Position 0 is replaced. `pop` removes the last, O108752, which leaves 3.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the result of `append` is stored. What does this print?",
        program: src`
codes = ["P0607"]
codes = codes.append("P0208")
print(codes)
`,
        choices: ["None", "['P0607', 'P0208']", "['P0607']", "AttributeError"],
        answer: 0,
        why: "`append` changes the list and returns None. Storing that return value replaces the list with None. Call `codes.append(...)` on its own line.",
      },
      {
        id: "q3",
        prompt: "Which of these changes the list `cart` itself, rather than building something new?",
        choices: ["cart[0] = \"P0209\"", "cart[1:]", "len(cart)", "\"P0209\" in cart"],
        answer: 0,
        why: "Assigning to a position replaces an item in the same list. A slice builds a new list, and `len` and `in` only read.",
      },
    ],
    review: [
      "Lists change in place. `append` adds at the end, `items[i] = x` replaces, and `pop()` removes and returns the last item.",
      "These methods return None, so call them on their own line and don't store the result.",
      "Build a result by starting from `[]` and appending in a loop. Check `len` before you `pop`.",
      "Next: sorting, and why a second name for a list is not a copy.",
    ],
  },

  // ------------------------------------------------------------------ PY-L07-04 sort and copy
  {
    id: "PY-L07-04",
    version: 2,
    slug: "sort-and-copy",
    title: "Sort, and copy before you change",
    lede: "sorted(items) builds a new sorted list. items.sort() sorts the list itself and returns None. A second name for a list is the same list; copy() makes a separate one.",
    focus: "Sort with sorted or sort, and copy a list when the original must survive a change.",
    minutes: 18,
    objectives: [
      "Choose between `sorted(items)` (new list) and `items.sort()` (in place)",
      "Explain why `backup = items` doesn't protect anything, and use `items.copy()`",
      "Tell `==` (same items) apart from `is` (the same list)",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "none-value", "boolean", "identity", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "for-loop", "len-call", "top-level-indent", "list-literal", "list-index", "list-mutate", "break-statement", "logical", "membership", "string-index"],
    teaches: ["list-sort", "list-copy"],
    blocks: [
      {
        kind: "text",
        md: "Sorting answers many questions: the cheapest items, the median rating, the top scores. Python gives you two ways to sort.\n\n- `sorted(items)` builds a **new** list in order and leaves `items` alone.\n- `items.sort()` rearranges **the list itself** and returns `None`, like `append` does.\n\nBoth sort numbers from smallest to largest and text alphabetically. Add `reverse=True` to get the largest first.",
      },
      {
        kind: "example",
        title: "sorted versus sort",
        code: src`
scores = [72, 58, 91, 60]
print(sorted(scores))
print(scores)
print(sorted(scores, reverse=True))
result = scores.sort()
print(result, scores)
print(sorted(["banana", "Apple", "cherry"]))
`,
        output: "[58, 60, 72, 91]\n[72, 58, 91, 60]\n[91, 72, 60, 58]\nNone [58, 60, 72, 91]\n['Apple', 'banana', 'cherry']\n",
        note: "After `sorted`, `scores` is still in its original order. `sort()` changes it and returns None. Text is compared by code point, so every capital letter sorts before every lower-case one: `\"Zoo\"` comes before `\"apple\"`.",
      },
      {
        kind: "text",
        md: "Because lists change in place, you need to know which names refer to which list. `same = readings` doesn't copy anything. It gives the **same list** a second name, so a change made through either name shows up under both. `readings.copy()` builds a new list with the same items, and changing one list no longer affects the other.\n\n`is` tells you whether two names refer to the same list, and `==` tells you whether two lists hold equal items.",
      },
      {
        kind: "example",
        title: "A second name is not a copy",
        code: src`
readings = [3.3, 7.2, 6.7]
same = readings
backup = readings.copy()
readings.sort()
print(same, same is readings)
print(backup, backup is readings)
print(backup == [3.3, 7.2, 6.7])
`,
        output: "[3.3, 6.7, 7.2] True\n[3.3, 7.2, 6.7] False\nTrue\n",
        note: "Sorting `readings` also sorted `same`, because it is one list. `backup` kept the original order. `copy()` copies the list but not the items inside it. For numbers and text that doesn't matter, because they can't change anyway.",
      },
      {
        kind: "text",
        md: "**When to use it:** use `sorted` when the original order still matters, for example when you print it later, and `.sort()` when you no longer need it. Copy a list before changing it if someone else still needs the original. **Mistakes to avoid:**\n\n- `items = items.sort()`, which leaves you with None.\n- Thinking `b = a` makes a backup.\n- Sorting text with mixed capitals and expecting dictionary order.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Cheapest first, original kept",
      prompt: "The program sorts `prices` in place, so the second line no longer shows the original order. Change it so the first line shows the prices from cheapest to dearest and the second line still shows the list as it was.",
      spec: [
        ["Input", "`prices`, a list of prices"],
        ["Prints", "line 1: the prices sorted; line 2: `prices` unchanged"],
      ],
      starter: src`
prices = [47.99, 29.99, 15.99, 66.49]
prices.sort()
print(prices)
print(prices)
`,
      answer: src`
prices = [47.99, 29.99, 15.99, 66.49]
cheapest_first = sorted(prices)
print(cheapest_first)
print(prices)
`,
      wrong: [
        {
          code: src`
prices = [47.99, 29.99, 15.99, 66.49]
cheapest_first = prices
cheapest_first.sort()
print(cheapest_first)
print(prices)
`,
          fails: ["output", "other-prices"],
          why: "`cheapest_first = prices` is the same list, so sorting it sorts `prices` too",
        },
      ],
      hints: [
        "One of the two ways to sort leaves the original list alone.",
        "`sorted(prices)` gives back a new list; store it under its own name.",
        "Print the new list, then the original.",
      ],
      task: {
        checks: [
          out("[15.99, 29.99, 47.99, 66.49]\n[47.99, 29.99, 15.99, 66.49]\n"),
          rerun("other-prices", "other prices", { prices: [3, 1, 2] }, "[1, 2, 3]\n[3, 1, 2]\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The median rating",
        prompt: "An average is pulled around by a few extreme ratings, and a median is not. To find the median, sort the ratings. With an odd number of ratings the median is the middle one. With an even number it is the average of the two in the middle. Print the median, then print `ratings` to show its order was not changed.",
        spec: [
          ["Input", "`ratings`, a list of at least one number"],
          ["Line 1", "the median (an even count gives the average of the two middle values)"],
          ["Line 2", "`ratings`, in its original order"],
          ["Example", "`[4.5, 3, 5, 2.5, 4]` prints `4` then `[4.5, 3, 5, 2.5, 4]`"],
        ],
        starter: src`
ratings = [4.5, 3, 5, 2.5, 4]
`,
        answer: src`
ratings = [4.5, 3, 5, 2.5, 4]
ordered = sorted(ratings)
middle = len(ordered) // 2
if len(ordered) % 2 == 1:
    print(ordered[middle])
else:
    print((ordered[middle - 1] + ordered[middle]) / 2)
print(ratings)
`,
        alternatives: [
          src`
ratings = [4.5, 3, 5, 2.5, 4]
ordered = ratings.copy()
ordered.sort()
n = len(ordered)
if n % 2 == 0:
    median = (ordered[n // 2 - 1] + ordered[n // 2]) / 2
else:
    median = ordered[n // 2]
print(median)
print(ratings)
`,
        ],
        wrong: [
          {
            code: src`
ratings = [4.5, 3, 5, 2.5, 4]
ratings.sort()
middle = len(ratings) // 2
if len(ratings) % 2 == 1:
    print(ratings[middle])
else:
    print((ratings[middle - 1] + ratings[middle]) / 2)
print(ratings)
`,
            fails: ["output", "even", "pairs"],
            why: "`ratings.sort()` changes the original order, which the second line must show",
          },
          {
            code: src`
ratings = [4.5, 3, 5, 2.5, 4]
ordered = sorted(ratings)
print(ordered[len(ordered) // 2])
print(ratings)
`,
            fails: ["even", "pairs"],
            why: "with an even count it takes one of the middle values instead of their average",
          },
          {
            code: src`
ratings = [4.5, 3, 5, 2.5, 4]
middle = len(ratings) // 2
if len(ratings) % 2 == 1:
    print(ratings[middle])
else:
    print((ratings[middle - 1] + ratings[middle]) / 2)
print(ratings)
`,
            fails: ["even", "output"],
            why: "the list is never sorted, so the middle position holds whatever value happens to be there",
          },
        ],
        hints: [
          "Work on a sorted copy so that the original order survives.",
          "`len(...) // 2` is the middle position for an odd count, and the upper of the two middle positions for an even count.",
          "`% 2` tells you whether the count is odd or even.",
        ],
        task: {
          checks: [
            out("4\n[4.5, 3, 5, 2.5, 4]\n"),
            rerun("even", "an even number of ratings", { ratings: [3.5, 5, 1, 4] }, "3.75\n[3.5, 5, 1, 4]\n"),
            rerun("single", "a single rating", { ratings: [2] }, "2\n[2]\n"),
            rerun("pairs", "repeated values", { ratings: [5, 5, 1, 1] }, "3.0\n[5, 5, 1, 1]\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Runner-up score",
        prompt: "A quiz shows the runner-up score: the highest score that is **lower** than the top score. Several players can share the top score, so the runner-up is not simply the second item after sorting. Print it, or print `None` if there is no lower score (for example, when everyone tied).",
        spec: [
          ["Input", "`scores`, a list of at least one whole number"],
          ["Prints", "the highest score below the top score, or `None`"],
          ["Example", "`[72, 91, 58, 91, 60]` prints `72`"],
        ],
        starter: src`
scores = [72, 91, 58, 91, 60]
`,
        answer: src`
scores = [72, 91, 58, 91, 60]
ordered = sorted(scores, reverse=True)
runner_up = None
for s in ordered:
    if s < ordered[0]:
        runner_up = s
        break
print(runner_up)
`,
        alternatives: [
          src`
scores = [72, 91, 58, 91, 60]
top = scores[0]
for s in scores:
    if s > top:
        top = s
runner_up = None
for s in scores:
    if s < top and (runner_up is None or s > runner_up):
        runner_up = s
print(runner_up)
`,
        ],
        wrong: [
          {
            code: src`
scores = [72, 91, 58, 91, 60]
ordered = sorted(scores, reverse=True)
print(ordered[1])
`,
            fails: ["output", "all-tied", "single"],
            why: "the second item after sorting is another 91 when the top score is shared",
          },
          {
            code: src`
scores = [72, 91, 58, 91, 60]
ordered = sorted(scores)
runner_up = None
for s in ordered:
    if s < ordered[-1]:
        runner_up = s
        break
print(runner_up)
`,
            fails: ["output", "three"],
            why: "sorted from smallest, the first score below the top is the lowest score, not the runner-up",
          },
        ],
        hints: [
          "Sort from the highest down. The top score is then at position 0.",
          "Walk the sorted scores and stop at the first one that is lower than the top.",
          "Start the answer at `None`, so it stays None when no score is lower.",
        ],
        task: {
          checks: [
            out("72\n"),
            rerun("all-tied", "everyone tied", { scores: [50, 50] }, "None\n"),
            rerun("single", "a single score", { scores: [88] }, "None\n"),
            rerun("three", "three different scores", { scores: [3, 1, 2] }, "2\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
week = [5, 1, 4]
copy = week.copy()
alias = week
week.append(2)
alias.sort()
print(week, copy)
`,
        choices: ["[1, 2, 4, 5] [5, 1, 4]", "[5, 1, 4, 2] [5, 1, 4]", "[1, 2, 4, 5] [1, 4, 5]", "[1, 2, 4, 5] [5, 1, 4, 2]"],
        answer: 0,
        why: "`alias` and `week` are one list, so it gains 2 and is then sorted. `copy` was made before the append, and it is a separate list.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the result of `sort()` is stored. What does this print?",
        program: src`
prices = [47.99, 29.99, 15.99]
cheapest = prices.sort()
print(cheapest)
`,
        choices: ["None", "[15.99, 29.99, 47.99]", "15.99", "[47.99, 29.99, 15.99]"],
        answer: 0,
        why: "`sort()` sorts the list in place and returns None. Use `sorted(prices)` when you want the sorted list as a value.",
      },
      {
        id: "q3",
        prompt: "You must show a top-3 list and, below it, the scores in the order they were entered. Which line builds the top 3?",
        choices: ["top = sorted(scores, reverse=True)[:3]", "scores.sort(reverse=True)", "top = scores", "top = scores.sort()[:3]"],
        answer: 0,
        why: "`sorted` leaves `scores` in its entered order. `.sort()` reorders it, `top = scores` is the same list, and `.sort()[:3]` fails because None can't be sliced.",
      },
    ],
    review: [
      "`sorted(items)` returns a new sorted list. `items.sort()` sorts in place and returns None. `reverse=True` puts the largest first.",
      "`b = a` gives the same list a second name. `a.copy()` makes a separate list.",
      "`==` compares items, and `is` asks whether two names refer to the same list.",
      "Next: give each value in a tuple its own name by unpacking it.",
    ],
  },

  // ------------------------------------------------------------------ PY-L07-05 tuple unpacking
  {
    id: "PY-L07-05",
    version: 2,
    slug: "unpack-a-tuple",
    title: "Unpack a tuple",
    lede: "title, year = film stores each value of a tuple under its own name. In a loop over a list of tuples, for title, year in films does the same for every record.",
    focus: "Give each value of a tuple its own name, including in a loop over a list of tuples.",
    minutes: 16,
    objectives: [
      "Unpack a tuple into names, and swap two values with `a, b = b, a`",
      "Loop over a list of tuples with one name per field",
      "Read the ValueError raised when the number of names doesn't match",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "precedence", "comparison", "logical", "if-statement", "for-loop", "enumerate-call", "string-format", "top-level-indent", "runtime-error", "list-literal", "tuple-literal", "list-index", "list-mutate", "conversion", "len-call", "membership", "string-index"],
    teaches: ["tuple-unpack"],
    blocks: [
      {
        kind: "text",
        md: "A tuple is a record: `(\"USW00024143\", \"2024-01-01\", 6.7)` is a station, a date and a high. Reading it as `reading[0]`, `reading[1]` and `reading[2]` works, but the numbers say nothing about what each value means.\n\n**Unpacking** gives each position a name in one line: `station, date, tmax = reading`. You need one name per value, in order. You already used this with `enumerate` (see Loops & Iteration), where `for i, ch in ...` unpacks a pair on every pass.",
      },
      {
        kind: "example",
        title: "Unpacking one reading, and swapping",
        code: src`
reading = ("USW00024143", "2024-01-01", 6.7)
station, date, tmax = reading
print(station, date, tmax)
low, high = 31, 12
if low > high:
    low, high = high, low
print(low, high)
`,
        output: "USW00024143 2024-01-01 6.7\n12 31\n",
        note: "`low, high = high, low` swaps the two values in one step. The right side is built as a tuple first, and then unpacked into the names.",
      },
      {
        kind: "text",
        md: "Unpacking matters most in a loop. A list of tuples is a small table, with one tuple per row. `for title, year, minutes in films:` unpacks each row as the loop reaches it, so the body can use names instead of positions.",
      },
      {
        kind: "example",
        title: "Long films, formatted",
        code: src`
films = [("Wild Archive", 2008, 86), ("Glass Echo of Glass", 2023, 95), ("Glass Horizon on Fire", 2015, 128)]
for title, year, minutes in films:
    if minutes >= 90:
        print(f"{title} ({year}): {minutes // 60}h {minutes % 60:02d}m")
`,
        output: "Glass Echo of Glass (2023): 1h 35m\nGlass Horizon on Fire (2015): 2h 08m\n",
        note: "`//` and `%` split the minutes into hours and leftover minutes. `:02d` pads a whole number to two digits, so 8 shows as 08.",
      },
      {
        kind: "error-example",
        title: "One name too few",
        code: src`
reading = ("USW00024143", "2024-01-01", 6.7)
station, tmax = reading
`,
        error: "ValueError",
        output: "",
        note: "The program stops with `ValueError: too many values to unpack (expected 2)`. With too many names, the message is `not enough values to unpack`. Count the fields in the tuple.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever you read a record with a fixed layout, such as a pair from `enumerate`, a row from a list of tuples, or two values to swap. **Mistakes to avoid:**\n\n- Getting the number of names wrong.\n- Getting the order wrong. Unpacking goes by position, so `year, title = (\"Wild Archive\", 2008)` puts the title in `year` with no error.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Use names, not positions",
      prompt: "This loop reads each film's fields by position. Rewrite the loop header to unpack each tuple into `title, year`, and use those names in the print.",
      spec: [
        ["Input", "`films`, a list of `(title, year)` tuples"],
        ["Prints", "`<title> was released in <year>` for each film"],
      ],
      starter: src`
films = [("Wild Archive", 2008), ("Glass Echo of Glass", 2023)]
for film in films:
    print(film[0], "was released in", film[1])
`,
      answer: src`
films = [("Wild Archive", 2008), ("Glass Echo of Glass", 2023)]
for title, year in films:
    print(title, "was released in", year)
`,
      wrong: [
        {
          code: src`
films = [("Wild Archive", 2008), ("Glass Echo of Glass", 2023)]
for year, title in films:
    print(title, "was released in", year)
`,
          fails: ["output", "other-films"],
          why: "the names are in the wrong order, so the year is printed as the title",
        },
      ],
      hints: [
        "Two names go between `for` and `in`, separated by a comma.",
        "The names are filled in the order of the tuple: the title first.",
        "Then the print can use the names directly.",
      ],
      task: {
        checks: [
          out("Wild Archive was released in 2008\nGlass Echo of Glass was released in 2023\n"),
          rerun("other-films", "other films", { films: [tup("Night Harbor", 2019)] }, "Night Harbor was released in 2019\n"),
          {
            kind: "expr",
            id: "unpacks",
            label: "The loop header unpacks each tuple into names",
            expr: "import ast as _ast\nresult = any(isinstance(_n, _ast.For) and isinstance(_n.target, _ast.Tuple) for _n in _ast.walk(_ast.parse(_source)))",
            expected: py.bool(true),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The warmest day",
        prompt: "Daily readings arrive as `(date, high)` tuples. Print the date and the high of the warmest day. If two days tie, report the earlier one.",
        spec: [
          ["Input", "`days`, a list of at least one `(date, high)` tuple"],
          ["Prints", "`<date> <high>` for the warmest day"],
          ["Ties", "the earlier day wins"],
          ["Example", "the starter's list prints `2024-01-02 7.2`"],
        ],
        starter: src`
days = [("2024-01-01", 6.7), ("2024-01-02", 7.2), ("2024-01-03", 3.3), ("2024-01-04", 7.2)]
`,
        answer: src`
days = [("2024-01-01", 6.7), ("2024-01-02", 7.2), ("2024-01-03", 3.3), ("2024-01-04", 7.2)]
best_date, best_high = days[0]
for date, high in days:
    if high > best_high:
        best_date, best_high = date, high
print(best_date, best_high)
`,
        alternatives: [
          src`
days = [("2024-01-01", 6.7), ("2024-01-02", 7.2), ("2024-01-03", 3.3), ("2024-01-04", 7.2)]
best = None
for day in days:
    date, high = day
    if best is None or high > best[1]:
        best = day
print(best[0], best[1])
`,
        ],
        wrong: [
          {
            code: src`
days = [("2024-01-01", 6.7), ("2024-01-02", 7.2), ("2024-01-03", 3.3), ("2024-01-04", 7.2)]
best_date, best_high = days[0]
for date, high in days:
    if high >= best_high:
        best_date, best_high = date, high
print(best_date, best_high)
`,
            fails: ["output", "all-same"],
            why: "`>=` hands a tie to the later day",
          },
          {
            code: src`
days = [("2024-01-01", 6.7), ("2024-01-02", 7.2), ("2024-01-03", 3.3), ("2024-01-04", 7.2)]
best_date = ""
best_high = 0
for date, high in days:
    if high > best_high:
        best_date, best_high = date, high
print(best_date, best_high)
`,
            fails: ["freezing"],
            why: "starting the best high at 0 finds nothing when every day is below freezing",
          },
        ],
        hints: [
          "Keep the best date and the best high so far, and start from the first day's values.",
          "Unpack each tuple in the loop header so you can compare highs by name.",
          "Replace the best only when a high is strictly greater.",
        ],
        task: {
          checks: [
            out("2024-01-02 7.2\n"),
            rerun("freezing", "a week below freezing", { days: [tup("2024-01-14", -14.9), tup("2024-01-15", -9.3)] }, "2024-01-15 -9.3\n"),
            rerun("all-same", "every day the same", { days: [tup("2024-07-01", 30), tup("2024-07-02", 30)] }, "2024-07-01 30\n"),
            rerun("single", "a single day", { days: [tup("2024-03-09", 12.1)] }, "2024-03-09 12.1\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Which films improved?",
        prompt: "Each tuple holds a film, its average rating in 2019, and its average rating in 2024. Print one line for each film whose rating went **up**, in the form `Wild Archive: 3.5 -> 4.0 (+0.5)`, with the change shown to one decimal. If no film improved, print `no film improved`.",
        spec: [
          ["Input", "`ratings`, a list of `(title, rating_2019, rating_2024)` tuples"],
          ["Prints", "`<title>: <old> -> <new> (+<change>)` for each improved film, in list order, or `no film improved`"],
          ["Example", "the starter's list prints lines for Wild Archive and Night Harbor"],
        ],
        starter: src`
ratings = [("Wild Archive", 3.5, 4.0), ("Glass Echo of Glass", 4.5, 4.5), ("Night Harbor", 2.0, 3.5)]
`,
        answer: src`
ratings = [("Wild Archive", 3.5, 4.0), ("Glass Echo of Glass", 4.5, 4.5), ("Night Harbor", 2.0, 3.5)]
improved = 0
for title, before, after in ratings:
    if after > before:
        improved = improved + 1
        print(f"{title}: {before} -> {after} (+{after - before:.1f})")
if improved == 0:
    print("no film improved")
`,
        alternatives: [
          src`
ratings = [("Wild Archive", 3.5, 4.0), ("Glass Echo of Glass", 4.5, 4.5), ("Night Harbor", 2.0, 3.5)]
lines = []
for row in ratings:
    title, old, new = row
    change = new - old
    if change > 0:
        lines.append(title + ": " + str(old) + " -> " + str(new) + " (+" + f"{change:.1f}" + ")")
if len(lines) == 0:
    print("no film improved")
for line in lines:
    print(line)
`,
        ],
        wrong: [
          {
            code: src`
ratings = [("Wild Archive", 3.5, 4.0), ("Glass Echo of Glass", 4.5, 4.5), ("Night Harbor", 2.0, 3.5)]
for title, before, after in ratings:
    if after >= before:
        print(f"{title}: {before} -> {after} (+{after - before:.1f})")
`,
            fails: ["empty", "none", "output"],
            why: "`>=` includes a film whose rating stayed the same, and nothing reports when no film improved",
          },
          {
            code: src`
ratings = [("Wild Archive", 3.5, 4.0), ("Glass Echo of Glass", 4.5, 4.5), ("Night Harbor", 2.0, 3.5)]
improved = 0
for title, after, before in ratings:
    if after > before:
        improved = improved + 1
        print(f"{title}: {before} -> {after} (+{after - before:.1f})")
if improved == 0:
    print("no film improved")
`,
            fails: ["drop", "none", "output"],
            why: "the names are unpacked in the wrong order, so falls are reported as rises",
          },
        ],
        hints: [
          "Unpack three names per tuple in the loop header.",
          "Count the films you print, so that after the loop you know whether to print the fallback line.",
          "The change is the new rating minus the old one, shown with one decimal.",
        ],
        task: {
          checks: [
            out("Wild Archive: 3.5 -> 4.0 (+0.5)\nNight Harbor: 2.0 -> 3.5 (+1.5)\n"),
            rerun("none", "no film improving", { ratings: [tup("Up", 4, 4), tup("Down", 3.5, 2.5)] }, "no film improved\n"),
            rerun("drop", "a single film that dropped and one that rose", { ratings: [tup("Fade", 4.5, 3), tup("Rise", 1, 4.5)] }, "Rise: 1 -> 4.5 (+3.5)\n"),
            rerun("empty", "an empty list", { ratings: [] }, "no film improved\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
pairs = [("A", 3), ("B", 1)]
for name, n in pairs:
    name, n = n, name
    print(name, n)
`,
        choices: ["3 A\n1 B", "A 3\nB 1", "3 1\nA B", "ValueError"],
        answer: 0,
        why: "Each pass unpacks a pair, and then the swap puts the number in `name` and the letter in `n`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the names are in the wrong order. What does this print?",
        program: src`
film = ("Wild Archive", 2008)
year, title = film
print(title + 1)
`,
        choices: ["2009", "TypeError", "Wild Archive1", "2008"],
        answer: 0,
        why: "Unpacking goes by position, so `title` holds 2008 and `year` holds the text. The program runs without complaint and adds 1 to the year. That is why the order of names matters.",
      },
      {
        id: "q3",
        prompt: "`row = (\"O104839\", \"C00800\", 142.77)`. Which line unpacks it?",
        choices: ["order_id, customer_id, total = row", "order_id, total = row", "order_id = customer_id = total = row", "(order_id, customer_id, total) == row"],
        answer: 0,
        why: "Unpacking needs one name per value, in order. Two names raise ValueError, the chained `=` gives every name the whole tuple, and `==` only compares.",
      },
    ],
    review: [
      "`a, b, c = record` names each value of a tuple in order. The count of names must match.",
      "`for title, year in films:` unpacks every row of a list of tuples, and `a, b = b, a` swaps.",
      "Unpacking goes by position, so names in the wrong order give wrong values with no error.",
      "Next module: dictionaries look values up by a key instead of a position.",
    ],
  },
];
