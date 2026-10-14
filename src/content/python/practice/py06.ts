import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const close = { numbers: "int-float-equal" } as const;

const scoreRows = (...rows: [string, number][]) => py.list(...rows.map(([name, score]) => rec([["name", s(name)], ["score", i(score)]])));

export const py06: PyQuestion[] = [
  {
    ref: "python:bank:py06-01",
    slug: "py06-01",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Reusable shipping calculator",
    topics: ["functions", "validation", "ValueError"],
    minutes: 8,
    after: "python:function-contracts-and-edge-cases",
    prompt:
      "Write `calculate_shipping(weight_kg, zone)` that returns the shipping cost.\n\n| Zone | Fixed fee | Per kg |\n|---|---|---|\n| `local` | 4.00 | 1.50 |\n| `regional` | 6.00 | 2.00 |\n| `national` | 9.00 | 3.00 |\n\nThe cost is the fixed fee plus the per-kg rate times the weight. A negative weight, or any other zone, raises `ValueError`. Don't round. Check answer tries other weights and every zone.",
    expectedOutput: "4.0\n10.0\n",
    looksFor: ["Each zone uses its own fixed fee and per-kg rate.", "Weight 0 is allowed and costs just the fixed fee.", "A negative weight or unknown zone raises `ValueError`."],
    starter: 'def calculate_shipping(weight_kg, zone):\n    pass\n\n\nprint(calculate_shipping(0, "local"))\nprint(calculate_shipping(2, "regional"))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "prices",
          label: "Prices every zone correctly",
          name: "calculate_shipping",
          compare: close,
          cases: [
            { args: [i(0), s("local")], expected: f(4) },
            { args: [i(2), s("regional")], expected: f(10) },
            { args: [f(0.5), s("local")], expected: f(4.75) },
            { args: [i(1), s("national")], expected: f(12) },
            { args: [i(10), s("national")], expected: f(39), hidden: true },
            { args: [i(10), s("local")], expected: f(19), hidden: true },
          ],
        },
        {
          kind: "function",
          id: "errors",
          label: "Rejects bad input",
          name: "calculate_shipping",
          cases: [
            { args: [i(-1), s("local")], raises: "ValueError" },
            { args: [i(2), s("mars")], raises: "ValueError" },
            { args: [i(1), s("Local")], raises: "ValueError", hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "4.0\n10.0\n" },
      ],
    },
    hints: ["Keep the rates in a dictionary: zone → (fixed fee, per kg).", "Validate first: if weight_kg < 0 or zone not in rates: raise ValueError(...).", "Then fixed, per_kg = rates[zone] and return fixed + per_kg * weight_kg."],
    answer:
      'RATES = {"local": (4.00, 1.50), "regional": (6.00, 2.00), "national": (9.00, 3.00)}\n\n\ndef calculate_shipping(weight_kg, zone):\n    if weight_kg < 0:\n        raise ValueError(f"weight must be 0 or more, got {weight_kg}")\n    if zone not in RATES:\n        raise ValueError(f"unknown zone {zone!r}")\n    fixed, per_kg = RATES[zone]\n    return fixed + per_kg * weight_kg\n\n\nprint(calculate_shipping(0, "local"))\nprint(calculate_shipping(2, "regional"))',
    alternatives: [
      'def calculate_shipping(weight_kg, zone):\n    if weight_kg < 0:\n        raise ValueError("negative weight")\n    if zone == "local":\n        return 4.0 + 1.5 * weight_kg\n    elif zone == "regional":\n        return 6.0 + 2.0 * weight_kg\n    elif zone == "national":\n        return 9.0 + 3.0 * weight_kg\n    raise ValueError("unknown zone")\n\n\nprint(calculate_shipping(0, "local"))\nprint(calculate_shipping(2, "regional"))\n',
    ],
    wrong: [
      { code: 'RATES = {"local": (4.00, 1.50), "regional": (6.00, 2.00), "national": (9.00, 3.00)}\ndef calculate_shipping(weight_kg, zone):\n    if weight_kg < 0 or zone not in RATES:\n        raise ValueError("bad input")\n    fixed, per_kg = RATES[zone]\n    return (fixed + per_kg) * weight_kg\n\n\nprint(calculate_shipping(0, "local"))\nprint(calculate_shipping(2, "regional"))\n', fails: ["prices", "output"] },
      { code: 'RATES = {"local": (4.00, 1.50), "regional": (6.00, 2.00), "national": (9.00, 3.00)}\ndef calculate_shipping(weight_kg, zone):\n    fixed, per_kg = RATES.get(zone, RATES["local"])\n    return fixed + per_kg * weight_kg\n\n\nprint(calculate_shipping(0, "local"))\nprint(calculate_shipping(2, "regional"))\n', fails: ["errors"] },
    ],
  },
  {
    ref: "python:bank:py06-02",
    slug: "py06-02",
    module: "functions",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: centimetres to inches",
    topics: ["functions", "division", "rounding"],
    minutes: 4,
    after: "python:parameters-and-return-values",
    prompt:
      "`centimeters_to_inches(value)` should return the length in inches (1 inch = 2.54 cm), rounded to 2 decimal places. It works for 2.54 but goes wrong for most other lengths, including decimals and negative offsets. Find the bug and fix it without changing the function's name or parameter.",
    expectedOutput: "1.0\n3.94\n",
    looksFor: ["Any length converts correctly, including 0, decimals and negatives.", "The result is rounded to 2 decimal places."],
    starter: "def centimeters_to_inches(value):\n    return round(value // 2.54, 2)\n\n\nprint(centimeters_to_inches(2.54))\nprint(centimeters_to_inches(10))\n",
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "centimeters_to_inches",
          compare: close,
          cases: [
            { args: [f(2.54)], expected: f(1) },
            { args: [i(10)], expected: f(3.94) },
            { args: [i(0)], expected: f(0) },
            { args: [f(-5.08)], expected: f(-2) },
            { args: [i(-1)], expected: f(-0.39), hidden: true },
            { args: [i(100)], expected: f(39.37), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "1.0\n3.94\n" },
      ],
    },
    hints: ["What does // do that / doesn't?", "// is floor division: it rounds down to a whole number before round() ever sees the value.", "Use value / 2.54."],
    answer: "def centimeters_to_inches(value):\n    return round(value / 2.54, 2)\n\n\nprint(centimeters_to_inches(2.54))\nprint(centimeters_to_inches(10))",
    wrong: [
      { code: "def centimeters_to_inches(value):\n    return round(value * 2.54, 2)\n\n\nprint(centimeters_to_inches(2.54))\nprint(centimeters_to_inches(10))\n", fails: ["fn", "output"] },
      { code: "def centimeters_to_inches(value):\n    return int(value / 2.54 * 100) / 100\n\n\nprint(centimeters_to_inches(2.54))\nprint(centimeters_to_inches(10))\n", fails: ["fn", "output"], why: "Truncating instead of rounding gets 3.93 for 10 cm." },
    ],
  },
  {
    ref: "python:bank:py06-03",
    slug: "py06-03",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Interpret an HTTP status code",
    topics: ["functions", "ranges", "order of conditions"],
    minutes: 6,
    after: "python:parameters-and-return-values",
    prompt:
      "Write `interpret_status(code)` that returns a label for an HTTP status code:\n\n- `404` → `\"not found\"`\n- otherwise 200–299 → `\"success\"`, 300–399 → `\"redirect\"`, 400–499 → `\"client error\"`, 500–599 → `\"server error\"`\n- anything else → `\"unknown\"`\n\nRanges include both ends.",
    expectedOutput: "success\nnot found\nunknown\n",
    looksFor: ["404 gets its own label; other 4xx codes are client errors.", "Codes at the edges of each range (200, 299, 599) are labelled correctly.", "Codes outside 200–599 are `unknown`."],
    starter: "def interpret_status(code):\n    pass\n\n\nprint(interpret_status(200))\nprint(interpret_status(404))\nprint(interpret_status(99))\n",
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "interpret_status",
          cases: [
            { args: [i(200)], expected: s("success") },
            { args: [i(301)], expected: s("redirect") },
            { args: [i(404)], expected: s("not found") },
            { args: [i(400)], expected: s("client error") },
            { args: [i(503)], expected: s("server error") },
            { args: [i(99)], expected: s("unknown") },
            { args: [i(600)], expected: s("unknown") },
            { args: [i(299)], expected: s("success"), hidden: true },
            { args: [i(499)], expected: s("client error"), hidden: true },
            { args: [i(-1)], expected: s("unknown"), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "success\nnot found\nunknown\n" },
      ],
    },
    hints: ["Check the special case first: if code == 404.", "Chained comparisons read like the table: elif 200 <= code <= 299.", "Finish with return \"unknown\"."],
    answer:
      'def interpret_status(code):\n    if code == 404:\n        return "not found"\n    if 200 <= code <= 299:\n        return "success"\n    if 300 <= code <= 399:\n        return "redirect"\n    if 400 <= code <= 499:\n        return "client error"\n    if 500 <= code <= 599:\n        return "server error"\n    return "unknown"\n\n\nprint(interpret_status(200))\nprint(interpret_status(404))\nprint(interpret_status(99))',
    wrong: [
      { code: 'def interpret_status(code):\n    if 400 <= code <= 499:\n        return "client error"\n    if code == 404:\n        return "not found"\n    if 200 <= code <= 299:\n        return "success"\n    if 300 <= code <= 399:\n        return "redirect"\n    if 500 <= code <= 599:\n        return "server error"\n    return "unknown"\n\n\nprint(interpret_status(200))\nprint(interpret_status(404))\nprint(interpret_status(99))\n', fails: ["fn", "output"] },
      { code: 'def interpret_status(code):\n    if code == 404:\n        return "not found"\n    if code < 300:\n        return "success"\n    if code < 400:\n        return "redirect"\n    if code < 500:\n        return "client error"\n    if code < 600:\n        return "server error"\n    return "unknown"\n\n\nprint(interpret_status(200))\nprint(interpret_status(404))\nprint(interpret_status(99))\n', fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py06-04",
    slug: "py06-04",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Customer name formatter",
    topics: ["default arguments", "strip", "join"],
    minutes: 6,
    after: "python:defaults-and-keyword-arguments",
    prompt:
      "Write `format_name(first, last, middle=None)` that returns `\"first middle last\"` with **exactly one space** between parts. Strip spaces around each part. Leave the middle name out when it's `None` or blank.",
    expectedOutput: "Ada Lovelace\nGrace B. Hopper\n",
    looksFor: ["Extra spaces around any part are removed.", "A missing or blank middle name leaves no double space.", "`middle` can be passed by keyword."],
    starter: 'def format_name(first, last, middle=None):\n    pass\n\n\nprint(format_name("  Ada ", "Lovelace"))\nprint(format_name("Grace", "Hopper", middle="B."))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "format_name",
          cases: [
            { args: [s("Ada"), s("Lovelace")], expected: s("Ada Lovelace") },
            { args: [s("  Ada "), s(" Lovelace")], expected: s("Ada Lovelace") },
            { args: [s("Grace"), s("Hopper")], kwargs: { middle: s("B.") }, expected: s("Grace B. Hopper") },
            { args: [s("Ada"), s("Lovelace"), s("  ")], expected: s("Ada Lovelace") },
            { args: [s("Ada"), s("Lovelace"), s(" King ")], expected: s("Ada King Lovelace"), hidden: true },
            { args: [s("Ada"), s("Lovelace"), s("")], expected: s("Ada Lovelace"), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "Ada Lovelace\nGrace B. Hopper\n" },
      ],
    },
    hints: ["Strip each part first.", "Build a list of the parts you want, adding the middle only if it's not None and not empty after stripping.", '" ".join(parts) puts single spaces between them.'],
    answer:
      'def format_name(first, last, middle=None):\n    parts = [first.strip()]\n    if middle is not None and middle.strip():\n        parts.append(middle.strip())\n    parts.append(last.strip())\n    return " ".join(parts)\n\n\nprint(format_name("  Ada ", "Lovelace"))\nprint(format_name("Grace", "Hopper", middle="B."))',
    wrong: [
      { code: 'def format_name(first, last, middle=None):\n    if middle:\n        return f"{first.strip()} {middle.strip()} {last.strip()}"\n    return f"{first.strip()} {last.strip()}"\n\n\nprint(format_name("  Ada ", "Lovelace"))\nprint(format_name("Grace", "Hopper", middle="B."))\n', fails: ["fn"], why: '"  " is truthy, so a blank middle name leaves a double space.' },
      { code: 'def format_name(first, last, middle=None):\n    if middle is None:\n        return f"{first} {last}"\n    return f"{first} {middle} {last}"\n\n\nprint(format_name("  Ada ", "Lovelace"))\nprint(format_name("Grace", "Hopper", middle="B."))\n', fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py06-05",
    slug: "py06-05",
    module: "functions",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: second largest distinct value",
    topics: ["functions", "sets", "edge cases"],
    minutes: 6,
    after: "python:function-contracts-and-edge-cases",
    prompt:
      "`second_distinct_largest(numbers)` should return the second-largest **distinct** value, or `None` when there are fewer than two distinct values. The version below returns the largest again when it's repeated, and crashes on short lists. Fix it.",
    expectedOutput: "4\nNone\n",
    looksFor: ["Repeated values count once: `[9, 9, 4]` gives 4.", "Fewer than two distinct values gives `None`, never an error.", "Negative numbers work."],
    starter: "def second_distinct_largest(numbers):\n    ordered = sorted(numbers)\n    return ordered[-2]\n\n\nprint(second_distinct_largest([9, 9, 4]))\nprint(second_distinct_largest([5, 5]))\n",
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "second_distinct_largest",
          cases: [
            { args: [ints(3, 9, 4)], expected: i(4) },
            { args: [ints(9, 9, 4)], expected: i(4) },
            { args: [ints(5, 5)], expected: py.none },
            { args: [py.list()], expected: py.none },
            { args: [ints(-1, -3)], expected: i(-3) },
            { args: [ints(1, 2, 2, 3, 3)], expected: i(2), hidden: true },
            { args: [ints(7)], expected: py.none, hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "4\nNone\n" },
      ],
    },
    hints: ["Duplicates go away if you build a set first.", "sorted(set(numbers)) is the distinct values in ascending order.", "Check its length before reading [-2]."],
    answer:
      "def second_distinct_largest(numbers):\n    distinct = sorted(set(numbers))\n    if len(distinct) < 2:\n        return None\n    return distinct[-2]\n\n\nprint(second_distinct_largest([9, 9, 4]))\nprint(second_distinct_largest([5, 5]))",
    wrong: [
      { code: "def second_distinct_largest(numbers):\n    distinct = sorted(set(numbers))\n    return distinct[-2]\n\n\nprint(second_distinct_largest([9, 9, 4]))\nprint(second_distinct_largest([5, 5]))\n", fails: "program" },
      { code: "def second_distinct_largest(numbers):\n    if len(numbers) < 2:\n        return None\n    return sorted(numbers)[-2]\n\n\nprint(second_distinct_largest([9, 9, 4]))\nprint(second_distinct_largest([5, 5]))\n", fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py06-06",
    slug: "py06-06",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Stable sort by score",
    topics: ["sorted", "key functions", "stability"],
    minutes: 6,
    after: "python:lambda-sorting-keys-and-useful-built-ins",
    prompt:
      "Write `sort_by_score(records)` that returns a **new** list of the records, highest `score` first. Records with the same score stay in the order they were given (don't sort ties by name). The input list must not change.",
    expectedOutput: "['Ada', 'Ben', 'Cai']\n",
    looksFor: ["Highest score comes first.", "Ties keep their original order.", "The list passed in isn't reordered."],
    starter: 'def sort_by_score(records):\n    pass\n\n\nplayers = [{"name": "Ben", "score": 7}, {"name": "Ada", "score": 9}, {"name": "Cai", "score": 7}]\nprint([p["name"] for p in sort_by_score(players)])\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "sort_by_score",
          cases: [
            { args: [scoreRows(["Ben", 7], ["Ada", 9], ["Cai", 7])], expected: scoreRows(["Ada", 9], ["Ben", 7], ["Cai", 7]) },
            { args: [py.list()], expected: py.list() },
            { args: [scoreRows(["Zoe", 1], ["Al", 1], ["Mo", 1])], expected: scoreRows(["Zoe", 1], ["Al", 1], ["Mo", 1]), hidden: true },
            { args: [scoreRows(["a", 2], ["b", 5], ["c", 2], ["d", 5])], expected: scoreRows(["b", 5], ["d", 5], ["a", 2], ["c", 2]), hidden: true },
          ],
        },
        {
          kind: "expr",
          id: "input-kept",
          label: "The input list keeps its order",
          show: "sort_by_score(rows), then rows",
          expr: 'rows = [{"name": "b", "score": 1}, {"name": "a", "score": 2}]\nsort_by_score(rows)\nresult = [r["name"] for r in rows]',
          expected: py.list(s("b"), s("a")),
          tip: "list.sort() reorders the caller's list; sorted(records, ...) returns a new one.",
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "['Ada', 'Ben', 'Cai']\n" },
      ],
    },
    hints: ['sorted(records, key=lambda r: r["score"], reverse=True).', "Python's sort is stable, and reverse=True keeps it stable: equal scores stay in their original order.", "Sorting by (score, name) would reorder ties by name, which the task rules out."],
    answer:
      'def sort_by_score(records):\n    return sorted(records, key=lambda r: r["score"], reverse=True)\n\n\nplayers = [{"name": "Ben", "score": 7}, {"name": "Ada", "score": 9}, {"name": "Cai", "score": 7}]\nprint([p["name"] for p in sort_by_score(players)])',
    alternatives: ['def sort_by_score(records):\n    return sorted(records, key=lambda r: -r["score"])\n\n\nplayers = [{"name": "Ben", "score": 7}, {"name": "Ada", "score": 9}, {"name": "Cai", "score": 7}]\nprint([p["name"] for p in sort_by_score(players)])\n'],
    wrong: [
      { code: 'def sort_by_score(records):\n    return sorted(records, key=lambda r: (r["score"], r["name"]), reverse=True)\n\n\nplayers = [{"name": "Ben", "score": 7}, {"name": "Ada", "score": 9}, {"name": "Cai", "score": 7}]\nprint([p["name"] for p in sort_by_score(players)])\n', fails: ["fn", "output"] },
      { code: 'def sort_by_score(records):\n    records.sort(key=lambda r: r["score"], reverse=True)\n    return records\n\n\nplayers = [{"name": "Ben", "score": 7}, {"name": "Ada", "score": 9}, {"name": "Cai", "score": 7}]\nprint([p["name"] for p in sort_by_score(players)])\n', fails: ["input-kept"] },
    ],
  },
  {
    ref: "python:bank:py06-07",
    slug: "py06-07",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Total any number of amounts",
    topics: ["*args", "None", "empty input"],
    minutes: 5,
    after: "python:defaults-and-keyword-arguments",
    prompt:
      "Write `total_amounts(*amounts)` that accepts any number of amounts as separate arguments and returns their sum, skipping any that are `None`. With no amounts (or only `None`s) it returns `0`.",
    expectedOutput: "3.75\n0\n",
    looksFor: ["Takes amounts as separate arguments, not one list.", "`None` amounts are skipped.", "No amounts returns `0`, not `None`."],
    starter: "def total_amounts(*amounts):\n    pass\n\n\nprint(total_amounts(1.5, 2.25))\nprint(total_amounts())\n",
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "total_amounts",
          compare: close,
          cases: [
            { args: [f(1.5), f(2.25)], expected: f(3.75) },
            { args: [], expected: i(0) },
            { args: [i(10)], expected: i(10) },
            { args: [i(5), py.none, f(2.5)], expected: f(7.5) },
            { args: [py.none, py.none], expected: i(0), hidden: true },
            { args: [i(1), i(2), i(3), i(4)], expected: i(10), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "3.75\n0\n" },
      ],
    },
    hints: ["Inside the function, amounts is a tuple of everything passed.", "total = 0, then add each amount that is not None.", "sum(a for a in amounts if a is not None) does it in one line."],
    answer:
      "def total_amounts(*amounts):\n    total = 0\n    for amount in amounts:\n        if amount is not None:\n            total += amount\n    return total\n\n\nprint(total_amounts(1.5, 2.25))\nprint(total_amounts())",
    wrong: [
      { code: "def total_amounts(amounts):\n    return sum(a for a in amounts if a is not None)\n\n\nprint(total_amounts(1.5, 2.25))\nprint(total_amounts())\n", fails: "program" },
      { code: "def total_amounts(*amounts):\n    if not amounts:\n        return None\n    return sum(a for a in amounts if a is not None)\n\n\nprint(total_amounts(1.5, 2.25))\nprint(total_amounts())\n", fails: ["fn", "output"] },
      { code: "def total_amounts(*amounts):\n    return sum(amounts)\n\n\nprint(total_amounts(1.5, 2.25))\nprint(total_amounts())\n", fails: ["fn"] },
    ],
  },
  {
    ref: "python:bank:py06-08",
    slug: "py06-08",
    module: "functions",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: enforce a function contract",
    topics: ["raise", "ValueError", "TypeError"],
    minutes: 6,
    after: "python:function-contracts-and-edge-cases",
    prompt:
      "`line_total(price, quantity)` should return `price * quantity`. Its contract: a negative quantity raises `ValueError`, and a quantity that isn't a whole number (`int`) raises `TypeError`. The current version prints a message and returns 0 instead, so callers silently get a wrong total. Fix it.",
    expectedOutput: "10.0\nrejected: ValueError\n",
    looksFor: ["Valid quantities, including 0, return the total.", "A negative quantity raises `ValueError` instead of returning 0.", "A non-integer quantity such as 1.5 or \"2\" raises `TypeError`."],
    starter:
      'def line_total(price, quantity):\n    if quantity < 0:\n        print("Error: negative quantity")\n        return 0\n    return price * quantity\n\n\nprint(line_total(2.5, 4))\ntry:\n    line_total(3, -2)\n    print("accepted")\nexcept ValueError:\n    print("rejected: ValueError")\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "totals",
          label: "Valid quantities give the total",
          name: "line_total",
          compare: close,
          cases: [
            { args: [f(2.5), i(4)], expected: f(10) },
            { args: [i(3), i(0)], expected: i(0) },
            { args: [f(1.25), i(2)], expected: f(2.5), hidden: true },
          ],
        },
        {
          kind: "function",
          id: "contract",
          label: "Invalid quantities raise the documented errors",
          name: "line_total",
          cases: [
            { args: [i(3), i(-2)], raises: "ValueError" },
            { args: [i(3), f(1.5)], raises: "TypeError" },
            { args: [i(3), s("2")], raises: "TypeError", hidden: true },
            { args: [i(3), i(-1)], raises: "ValueError", hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "10.0\nrejected: ValueError\n" },
      ],
    },
    hints: ["Check the type first: if not isinstance(quantity, int): raise TypeError(...).", "Then if quantity < 0: raise ValueError(...).", "A raise replaces both the print and the return 0."],
    answer:
      'def line_total(price, quantity):\n    if not isinstance(quantity, int):\n        raise TypeError(f"quantity must be a whole number, got {quantity!r}")\n    if quantity < 0:\n        raise ValueError(f"quantity must be 0 or more, got {quantity}")\n    return price * quantity\n\n\nprint(line_total(2.5, 4))\ntry:\n    line_total(3, -2)\n    print("accepted")\nexcept ValueError:\n    print("rejected: ValueError")',
    wrong: [
      { code: 'def line_total(price, quantity):\n    if quantity < 0:\n        raise ValueError("negative quantity")\n    return price * quantity\nprint(line_total(2.5, 4))\ntry:\n    line_total(3, -2)\n    print("accepted")\nexcept ValueError:\n    print("rejected: ValueError")\n', fails: ["contract"], why: "1.5 slips through: only \"2\" happens to fail, because a str can't be compared with 0." },
      { code: 'def line_total(price, quantity):\n    if quantity < 0:\n        raise TypeError("negative quantity")\n    if not isinstance(quantity, int):\n        raise TypeError("not a whole number")\n    return price * quantity\nprint(line_total(2.5, 4))\ntry:\n    line_total(3, -2)\n    print("accepted")\nexcept ValueError:\n    print("rejected: ValueError")\n', fails: "program" },
    ],
  },
  {
    ref: "python:bank:py06-09",
    slug: "py06-09",
    module: "functions",
    kind: "write",
    difficulty: "medium",
    title: "Normalize many records with one function",
    topics: ["functions", "dict.get", "reuse"],
    minutes: 8,
    after: "python:scope-and-mutable-arguments",
    prompt:
      "Write `clean_record(record)` that returns a **new** dictionary with exactly three keys:\n\n- `name`: stripped and in title case\n- `email`: stripped and lowercase\n- `age`: converted to `int`\n\nA field that's absent, or blank after stripping, becomes `None`. Don't change the record passed in. Then build `cleaned` by applying it to every record in `raw_records`.",
    expectedOutput: "{'name': 'Ada Lovelace', 'email': 'ada@x.com', 'age': 36}\n{'name': 'Ben', 'email': None, 'age': None}\n",
    looksFor: ["Every result has exactly `name`, `email` and `age`.", "Absent or blank fields are `None`.", "The input dictionaries aren't changed.", "`cleaned` holds one cleaned record per raw record."],
    starter:
      'def clean_record(record):\n    pass\n\n\nraw_records = [\n    {"name": "  ada LOVELACE ", "email": " Ada@X.COM ", "age": "36"},\n    {"name": "ben", "age": " "},\n]\ncleaned = []\nfor row in cleaned:\n    print(row)\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "clean_record",
          cases: [
            { args: [rec([["name", s("  ada LOVELACE ")], ["email", s(" Ada@X.COM ")], ["age", s("36")]])], expected: rec([["name", s("Ada Lovelace")], ["email", s("ada@x.com")], ["age", i(36)]]) },
            { args: [rec([["name", s("ben")]])], expected: rec([["name", s("Ben")], ["email", py.none], ["age", py.none]]) },
            { args: [py.dict([])], expected: rec([["name", py.none], ["email", py.none], ["age", py.none]]) },
            { args: [rec([["age", s(" 41 ")], ["email", s("")]])], expected: rec([["name", py.none], ["email", py.none], ["age", i(41)]]), hidden: true },
            { args: [rec([["name", s("cai"), ], ["city", s("Leeds")]])], expected: rec([["name", s("Cai")], ["email", py.none], ["age", py.none]]), hidden: true },
          ],
        },
        {
          kind: "expr",
          id: "input-kept",
          label: "The record passed in isn't changed",
          show: 'r = {"name": " ada "}; clean_record(r); r',
          expr: 'r = {"name": " ada "}\nclean_record(r)\nresult = r',
          expected: rec([["name", s(" ada ")]]),
        },
        {
          kind: "variable",
          id: "cleaned",
          name: "cleaned",
          expected: py.list(rec([["name", s("Ada Lovelace")], ["email", s("ada@x.com")], ["age", i(36)]]), rec([["name", s("Ben")], ["email", py.none], ["age", py.none]])),
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'name': 'Ada Lovelace', 'email': 'ada@x.com', 'age': 36}\n{'name': 'Ben', 'email': None, 'age': None}\n" },
      ],
    },
    hints: ['record.get("name", "") gives "" for an absent field, and .strip() works on it.', "Write a small helper, or repeat: text = record.get(field, \"\").strip(); value = None if text == \"\" else ...", "cleaned = [clean_record(r) for r in raw_records]."],
    answer:
      'def clean_record(record):\n    name = record.get("name", "").strip()\n    email = record.get("email", "").strip()\n    age = record.get("age", "").strip()\n    return {\n        "name": name.title() if name else None,\n        "email": email.lower() if email else None,\n        "age": int(age) if age else None,\n    }\n\n\nraw_records = [\n    {"name": "  ada LOVELACE ", "email": " Ada@X.COM ", "age": "36"},\n    {"name": "ben", "age": " "},\n]\ncleaned = [clean_record(r) for r in raw_records]\nfor row in cleaned:\n    print(row)',
    wrong: [
      { code: 'def clean_record(record):\n    record["name"] = record.get("name", "").strip().title() or None\n    record["email"] = record.get("email", "").strip().lower() or None\n    age = record.get("age", "").strip()\n    record["age"] = int(age) if age else None\n    return record\nraw_records = [\n    {"name": "  ada LOVELACE ", "email": " Ada@X.COM ", "age": "36"},\n    {"name": "ben", "age": " "},\n]\ncleaned = [clean_record(r) for r in raw_records]\nfor row in cleaned:\n    print(row)\n', fails: ["fn", "input-kept", "output"] },
      { code: 'def clean_record(record):\n    return {\n        "name": record.get("name", "").strip().title(),\n        "email": record.get("email", "").strip().lower(),\n        "age": int(record["age"]) if "age" in record else None,\n    }\nraw_records = [\n    {"name": "  ada LOVELACE ", "email": " Ada@X.COM ", "age": "36"},\n    {"name": "ben", "age": " "},\n]\ncleaned = [clean_record(r) for r in raw_records]\nfor row in cleaned:\n    print(row)\n', fails: "program" },
    ],
  },
  {
    ref: "python:bank:py06-10",
    slug: "py06-10",
    module: "functions",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: a weekend helper",
    topics: ["modules", "datetime", "exceptions"],
    minutes: 5,
    after: "python:importing-and-using-modules",
    prompt:
      "`date.weekday()` numbers the days Monday = 0 … Sunday = 6, and `date.fromisoformat` rejects dates that don't exist. 14 October 2026 is a Wednesday. What does this program print?",
    code: 'from datetime import date\n\n\ndef is_weekend(iso_date):\n    return date.fromisoformat(iso_date).weekday() >= 5\n\n\nfor text in ["2026-10-17", "2026-10-19"]:\n    print(text, is_weekend(text))\n\nfor text in ["2026-02-29", "2028-02-29"]:\n    try:\n        print(text, is_weekend(text))\n    except ValueError:\n        print(text, "is not a real date")',
    output: "2026-10-17 True\n2026-10-19 False\n2026-02-29 is not a real date\n2028-02-29 False\n",
    explanation:
      "17 October 2026 is three days after a Wednesday, so a Saturday (weekday 5): `True`. The 19th is a Monday (0): `False`. 2026 isn't a leap year, so `fromisoformat` raises `ValueError` for 29 February, and the `except` prints the message instead. 2028 is a leap year; 29 February 2028 is a Tuesday, so `False`.",
    hints: ["Count forward from Wednesday the 14th.", "Which of 2026 and 2028 is a leap year?"],
    wrong: ["2026-10-17 True\n2026-10-19 False\n2026-02-29 is not a real date\n2028-02-29 is not a real date", "2026-10-17 True\n2026-10-19 False\n2026-02-29 False\n2028-02-29 False"],
  },
];
