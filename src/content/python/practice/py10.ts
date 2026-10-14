import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));
const floats = (...xs: number[]) => py.list(...xs.map((x) => f(x)));
const grid = (...rows: number[][]) => py.list(...rows.map((r) => floats(...r)));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const close = { numbers: "int-float-equal" } as const;
const NP = ["numpy"] as const;

const SPREAD_DEMO = "print(spread(np.array([12, 15, 15, 18, 22, 30, 41, 95])))";
const CENTER_DEMO = "data = np.array([[10, 20, 30], [1, 2, 3], [5, 5, 5]])\nprint(center_rows(data).tolist())";
const FILL_DEMO = "data = np.array([[1.0, np.nan, 4.0], [3.0, 6.0, np.nan], [np.nan, 8.0, np.nan]])\nprint(fill_gaps(data).tolist())";
const BALANCE_DEMO = "running, first = balance([50, -80, 20, -10, -30], opening=20)\nprint(running.tolist(), first)";

export const py10: PyQuestion[] = [
  {
    ref: "python:bank:py10-01",
    slug: "py10-01",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Median, 90th percentile and spread",
    topics: ["np.median", "np.percentile", "empty arrays"],
    minutes: 7,
    after: "python:reshaping-and-aggregating",
    packages: NP,
    prompt:
      "Order values are skewed by a few big orders, so the mean misleads. Write `spread(values)` that returns `{\"median\": ..., \"p90\": ..., \"iqr\": ...}` for a 1-D array: the median, the 90th percentile, and the interquartile range (75th percentile minus 25th), each a float rounded to 2 places, using NumPy's default (linear) percentiles. An empty array returns all three as `None`.",
    expectedOutput: "{'median': 20.0, 'p90': 57.2, 'iqr': 17.75}\n",
    looksFor: ["Uses the median and percentiles, not the mean.", "Each value is rounded to 2 places.", "An empty array gives `None` values instead of an error or NaN."],
    starter: `import numpy as np\n\n\ndef spread(values):\n    pass\n\n\n${SPREAD_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "spread",
          compare: close,
          cases: [
            { args: [ints(12, 15, 15, 18, 22, 30, 41, 95)], expected: rec([["median", f(20)], ["p90", f(57.2)], ["iqr", f(17.75)]]) },
            { args: [ints(1, 2, 3, 4)], expected: rec([["median", f(2.5)], ["p90", f(3.7)], ["iqr", f(1.5)]]) },
            { args: [ints(5)], expected: rec([["median", f(5)], ["p90", f(5)], ["iqr", f(0)]]), hidden: true },
          ],
        },
        { kind: "expr", id: "empty", label: "An empty array gives None values", show: "spread(np.array([]))", expr: "spread(np.array([]))", expected: rec([["median", py.none], ["p90", py.none], ["iqr", py.none]]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'median': 20.0, 'p90': 57.2, 'iqr': 17.75}\n" },
      ],
    },
    hints: ["np.median(values) and np.percentile(values, 90).", "np.percentile(values, [25, 75]) gives both quartiles at once.", "Check values.size == 0 first; round(float(x), 2) gives a plain rounded float."],
    answer:
      'import numpy as np\n\n\ndef spread(values):\n    values = np.asarray(values)\n    if values.size == 0:\n        return {"median": None, "p90": None, "iqr": None}\n    q25, q75 = np.percentile(values, [25, 75])\n    return {\n        "median": round(float(np.median(values)), 2),\n        "p90": round(float(np.percentile(values, 90)), 2),\n        "iqr": round(float(q75 - q25), 2),\n    }\n\n\n' + SPREAD_DEMO,
    wrong: [
      { code: `import numpy as np\n\n\ndef spread(values):\n    values = np.asarray(values)\n    if values.size == 0:\n        return {"median": None, "p90": None, "iqr": None}\n    return {"median": round(float(values.mean()), 2), "p90": round(float(np.percentile(values, 90)), 2), "iqr": round(float(values.max() - values.min()), 2)}\n\n\n${SPREAD_DEMO}\n`, fails: ["fn", "output"] },
      { code: `import numpy as np\n\n\ndef spread(values):\n    q25, q75 = np.percentile(values, [25, 75])\n    return {"median": round(float(np.median(values)), 2), "p90": round(float(np.percentile(values, 90)), 2), "iqr": round(float(q75 - q25), 2)}\n\n\n${SPREAD_DEMO}\n`, fails: ["empty"] },
    ],
  },
  {
    ref: "python:bank:py10-02",
    slug: "py10-02",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Readings above a threshold, with positions",
    topics: ["boolean masks", "np.flatnonzero", "boundaries"],
    minutes: 6,
    after: "python:indexing-masks-and-views",
    packages: NP,
    prompt:
      "Write `above(readings, threshold)` returning a tuple of two arrays: the readings **strictly** above `threshold`, and their positions in `readings`. A reading equal to the threshold is not above it. Use a mask, not a loop.",
    expectedOutput: "[31.0, 35.2, 30.1] [1, 3, 5]\n",
    looksFor: ["Only readings greater than the threshold are returned.", "Positions are a 1-D array of indexes into the original array.", "Nothing above the threshold gives two empty arrays."],
    starter: "import numpy as np\n\n\ndef above(readings, threshold):\n    pass\n\n\nvalues, positions = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nprint(values.tolist(), positions.tolist())\n",
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Values and positions above 30", show: "above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)", expr: "_v, _p = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nresult = (_v.tolist(), _p.tolist())", expected: py.tuple(floats(31, 35.2, 30.1), ints(1, 3, 5)) },
        { kind: "expr", id: "none", label: "Nothing above gives empty arrays", show: "above(np.array([1, 2]), 5)", expr: "_v, _p = above(np.array([1, 2]), 5)\nresult = (_v.tolist(), _p.tolist())", expected: py.tuple(py.list(), py.list()) },
        { kind: "expr", id: "hidden", label: "Another threshold", hidden: true, expr: "_v, _p = above(np.array([5, 7, 7, 9, 2]), 7)\nresult = (_v.tolist(), _p.tolist())", expected: py.tuple(ints(9), ints(3)) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[31.0, 35.2, 30.1] [1, 3, 5]\n" },
      ],
    },
    hints: ["mask = readings > threshold (not >=).", "readings[mask] gives the values.", "np.flatnonzero(mask) gives the positions as one array (np.where(mask) returns a tuple of arrays)."],
    answer: "import numpy as np\n\n\ndef above(readings, threshold):\n    mask = readings > threshold\n    return readings[mask], np.flatnonzero(mask)\n\n\nvalues, positions = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nprint(values.tolist(), positions.tolist())",
    alternatives: ["import numpy as np\n\n\ndef above(readings, threshold):\n    mask = readings > threshold\n    return readings[mask], np.where(mask)[0]\n\n\nvalues, positions = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nprint(values.tolist(), positions.tolist())\n"],
    wrong: [
      { code: "import numpy as np\n\n\ndef above(readings, threshold):\n    mask = readings >= threshold\n    return readings[mask], np.flatnonzero(mask)\n\n\nvalues, positions = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nprint(values.tolist(), positions.tolist())\n", fails: ["demo", "hidden", "output"] },
      { code: "import numpy as np\n\n\ndef above(readings, threshold):\n    mask = readings > threshold\n    return readings[mask], readings[mask].argsort()\n\n\nvalues, positions = above(np.array([28.5, 31.0, 30.0, 35.2, 29.9, 30.1]), 30)\nprint(values.tolist(), positions.tolist())\n", fails: ["demo", "hidden", "output"] },
    ],
  },
  {
    ref: "python:bank:py10-03",
    slug: "py10-03",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Convert temperatures in one operation",
    topics: ["vectorized arithmetic", "np.round", "any shape"],
    minutes: 4,
    after: "python:vectorized-arithmetic-and-broadcasting",
    packages: NP,
    prompt:
      "Write `c_to_f(temps)` converting a NumPy array of Celsius temperatures to Fahrenheit (`F = C × 9/5 + 32`), rounded to 1 decimal place. It must work for an array of **any shape** (a 2-D grid of sensors too) and return a new float array, leaving the input unchanged.",
    expectedOutput: "[-40.0, 32.0, 97.9, 212.0]\n",
    looksFor: ["The formula is applied to every element at once.", "Results are rounded to 1 place.", "2-D input gives 2-D output of the same shape."],
    starter: "import numpy as np\n\n\ndef c_to_f(temps):\n    pass\n\n\nprint(c_to_f(np.array([-40, 0, 36.6, 100])).tolist())\n",
    task: {
      checks: [
        { kind: "expr", id: "one-d", label: "Converts a 1-D array", show: "c_to_f(np.array([-40, 0, 36.6, 100]))", expr: "c_to_f(np.array([-40, 0, 36.6, 100])).tolist()", expected: floats(-40, 32, 97.9, 212) },
        { kind: "expr", id: "two-d", label: "Converts a 2-D grid and keeps its shape", show: "c_to_f(np.array([[0, 10], [20, -10]]))", expr: "c_to_f(np.array([[0, 10], [20, -10]])).tolist()", expected: grid([32, 50], [68, 14]) },
        { kind: "expr", id: "untouched", label: "The input array isn't changed", hidden: true, expr: "_t = np.array([1.5, 2.5])\nc_to_f(_t)\nresult = _t.tolist()", expected: floats(1.5, 2.5) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[-40.0, 32.0, 97.9, 212.0]\n" },
      ],
    },
    hints: ["Arithmetic on an array applies to every element: temps * 9 / 5 + 32.", "np.round(result, 1) rounds every element.", "No loop needed, and the same line works for 2-D arrays."],
    answer: "import numpy as np\n\n\ndef c_to_f(temps):\n    return np.round(temps * 9 / 5 + 32, 1)\n\n\nprint(c_to_f(np.array([-40, 0, 36.6, 100])).tolist())",
    wrong: [
      { code: "import numpy as np\n\n\ndef c_to_f(temps):\n    return temps * 9 / 5 + 32\n\n\nprint(c_to_f(np.array([-40, 0, 36.6, 100])).tolist())\n", fails: ["one-d", "output"] },
      { code: "import numpy as np\n\n\ndef c_to_f(temps):\n    return np.round((temps - 32) * 5 / 9, 1)\n\n\nprint(c_to_f(np.array([-40, 0, 36.6, 100])).tolist())\n", fails: ["one-d", "two-d", "output"] },
    ],
  },
  {
    ref: "python:bank:py10-04",
    slug: "py10-04",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Totals and best day per store",
    topics: ["axis", "sum", "argmax"],
    minutes: 6,
    after: "python:reshaping-and-aggregating",
    packages: NP,
    prompt:
      "`sales` is a 2-D array with one **row per store** and one **column per day**. Write `store_summary(sales)` returning a tuple of two arrays: each store's total, and the index of each store's best day (on a tie, the earliest day).",
    expectedOutput: "[10, 4, 11] [2, 0, 1]\n",
    looksFor: ["Totals are per store (per row), not per day.", "Best days are column indexes, one per store.", "Works for a single store or a single day."],
    starter: "import numpy as np\n\n\ndef store_summary(sales):\n    pass\n\n\nsales = np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]])\ntotals, best = store_summary(sales)\nprint(totals.tolist(), best.tolist())\n",
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Three stores, four days", show: "store_summary(np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]]))", expr: "_t, _b = store_summary(np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]]))\nresult = (_t.tolist(), _b.tolist())", expected: py.tuple(ints(10, 4, 11), ints(2, 0, 1)) },
        { kind: "expr", id: "one-row", label: "One store", show: "store_summary(np.array([[5, 9]]))", expr: "_t, _b = store_summary(np.array([[5, 9]]))\nresult = (_t.tolist(), _b.tolist())", expected: py.tuple(ints(14), ints(1)) },
        { kind: "expr", id: "one-col", label: "One day", hidden: true, expr: "_t, _b = store_summary(np.array([[2], [3]]))\nresult = (_t.tolist(), _b.tolist())", expected: py.tuple(ints(2, 3), ints(0, 0)) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[10, 4, 11] [2, 0, 1]\n" },
      ],
    },
    hints: ["The axis you name is the one that gets collapsed.", "Per store means collapsing the days: axis=1.", "sales.argmax(axis=1) gives the first index of each row's maximum."],
    answer: "import numpy as np\n\n\ndef store_summary(sales):\n    return sales.sum(axis=1), sales.argmax(axis=1)\n\n\nsales = np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]])\ntotals, best = store_summary(sales)\nprint(totals.tolist(), best.tolist())",
    wrong: [
      { code: "import numpy as np\n\n\ndef store_summary(sales):\n    return sales.sum(axis=0), sales.argmax(axis=0)\n\n\nsales = np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]])\ntotals, best = store_summary(sales)\nprint(totals.tolist(), best.tolist())\n", fails: ["demo", "one-row", "one-col", "output"] },
      { code: "import numpy as np\n\n\ndef store_summary(sales):\n    return sales.sum(axis=1), sales.max(axis=1)\n\n\nsales = np.array([[3, 0, 5, 2], [1, 1, 1, 1], [0, 7, 0, 4]])\ntotals, best = store_summary(sales)\nprint(totals.tolist(), best.tolist())\n", fails: ["demo", "one-row", "one-col", "output"], why: "max gives the best day's sales, not which day it was." },
    ],
  },
  {
    ref: "python:bank:py10-05",
    slug: "py10-05",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Each row as shares of its total",
    topics: ["keepdims", "broadcasting", "zero division"],
    minutes: 8,
    after: "python:nans-and-numerical-reliability",
    packages: NP,
    prompt:
      "`counts` is a 2-D array: one row per customer, one column per product category. Write `row_shares(counts)` returning a new float array where each value is its share of the **row's** total, rounded to 3 places. A row whose total is 0 becomes all zeros (not NaN). Don't loop over rows.",
    expectedOutput: "[[0.25, 0.75], [0.0, 0.0], [0.5, 0.5]]\n",
    looksFor: ["Each row is divided by its own total.", "Rows with a zero total become zeros, with no NaN.", "Values are rounded to 3 places."],
    starter: "import numpy as np\n\n\ndef row_shares(counts):\n    pass\n\n\nprint(row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist())\n",
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Shares, with a zero row", show: "row_shares(np.array([[1, 3], [0, 0], [2, 2]]))", expr: "row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist()", expected: grid([0.25, 0.75], [0, 0], [0.5, 0.5]) },
        { kind: "expr", id: "thirds", label: "Rounded to 3 places", show: "row_shares(np.array([[1, 1, 1], [0, 2, 6]]))", expr: "row_shares(np.array([[1, 1, 1], [0, 2, 6]])).tolist()", expected: grid([0.333, 0.333, 0.333], [0, 0.25, 0.75]) },
        { kind: "expr", id: "square", label: "A square array divides by rows, not columns", hidden: true, expr: "row_shares(np.array([[1, 0], [1, 3]])).tolist()", expected: grid([1, 0], [0.25, 0.75]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[[0.25, 0.75], [0.0, 0.0], [0.5, 0.5]]\n" },
      ],
    },
    hints: ["counts.sum(axis=1, keepdims=True) gives a column of row totals that broadcasts across each row.", "np.divide(counts, totals, out=np.zeros(counts.shape), where=totals != 0) skips the zero rows.", "np.round(..., 3) last."],
    answer: "import numpy as np\n\n\ndef row_shares(counts):\n    totals = counts.sum(axis=1, keepdims=True)\n    shares = np.divide(counts, totals, out=np.zeros(counts.shape), where=totals != 0)\n    return np.round(shares, 3)\n\n\nprint(row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist())",
    alternatives: ["import numpy as np\n\n\ndef row_shares(counts):\n    totals = counts.sum(axis=1)[:, np.newaxis]\n    safe = np.where(totals == 0, 1, totals)\n    return np.round(counts / safe, 3)\n\n\nprint(row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist())\n"],
    wrong: [
      { code: "import numpy as np\n\n\ndef row_shares(counts):\n    totals = counts.sum(axis=0, keepdims=True)\n    shares = np.divide(counts, totals, out=np.zeros(counts.shape), where=totals != 0)\n    return np.round(shares, 3)\n\n\nprint(row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist())\n", fails: ["demo", "thirds", "square", "output"] },
      { code: "import numpy as np\n\n\ndef row_shares(counts):\n    totals = counts.sum(axis=1, keepdims=True)\n    return np.round(counts / totals, 3)\n\n\nprint(row_shares(np.array([[1, 3], [0, 0], [2, 2]])).tolist())\n", fails: ["demo", "output"], why: "0 / 0 gives NaN for the empty row." },
    ],
  },
  {
    ref: "python:bank:py10-06",
    slug: "py10-06",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Average by weekday",
    topics: ["reshape", "slicing", "axis"],
    minutes: 8,
    after: "python:reshaping-and-aggregating",
    packages: NP,
    prompt:
      "`daily` is a 1-D array of daily sales starting on a Monday. Write `weekday_averages(daily)` that drops any incomplete week at the end, reshapes to one row per week, and returns a tuple: the average for each weekday (7 values, rounded to 2 places) and the number of full weeks used (an `int`). Fewer than 7 days raises `ValueError`.",
    expectedOutput: "[4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5] 2\n",
    looksFor: ["Only full weeks are used; leftover days are dropped.", "Averages are per weekday (per column), 7 of them.", "Fewer than 7 days raises `ValueError`."],
    starter: "import numpy as np\n\n\ndef weekday_averages(daily):\n    pass\n\n\naverages, weeks = weekday_averages(np.arange(1, 16))\nprint(averages.tolist(), weeks)\n",
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "15 days: two full weeks", show: "weekday_averages(np.arange(1, 16))", expr: "_a, _w = weekday_averages(np.arange(1, 16))\nresult = (_a.tolist(), _w)", expected: py.tuple(floats(4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5), i(2)), compare: close },
        { kind: "expr", id: "one-week", label: "Exactly one week", show: "weekday_averages(np.array([0, 0, 0, 0, 0, 10, 20]))", expr: "_a, _w = weekday_averages(np.array([0, 0, 0, 0, 0, 10, 20]))\nresult = (_a.tolist(), _w)", expected: py.tuple(floats(0, 0, 0, 0, 0, 10, 20), i(1)), compare: close },
        { kind: "expr", id: "short", label: "Fewer than 7 days raises ValueError", show: "weekday_averages(np.arange(6))", expr: "weekday_averages(np.arange(6))", raises: "ValueError" },
        { kind: "expr", id: "rounding", label: "Rounded to 2 places", hidden: true, expr: "_a, _w = weekday_averages(np.array([1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 5]))\nresult = (_a.tolist()[0], _w)", expected: py.tuple(f(1.33), i(3)), compare: close },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5] 2\n" },
      ],
    },
    hints: ["weeks = len(daily) // 7 full weeks.", "daily[:weeks * 7].reshape(weeks, 7) has one row per week.", "The mean over axis=0 averages each column (weekday)."],
    answer: 'import numpy as np\n\n\ndef weekday_averages(daily):\n    weeks = len(daily) // 7\n    if weeks == 0:\n        raise ValueError("need at least one full week")\n    table = daily[:weeks * 7].reshape(weeks, 7)\n    return np.round(table.mean(axis=0), 2), weeks\n\n\naverages, weeks = weekday_averages(np.arange(1, 16))\nprint(averages.tolist(), weeks)',
    wrong: [
      { code: 'import numpy as np\n\n\ndef weekday_averages(daily):\n    table = daily.reshape(-1, 7)\n    return np.round(table.mean(axis=0), 2), len(table)\n\n\naverages, weeks = weekday_averages(np.arange(1, 16))\nprint(averages.tolist(), weeks)\n', fails: "program" },
      { code: 'import numpy as np\n\n\ndef weekday_averages(daily):\n    weeks = len(daily) // 7\n    if weeks == 0:\n        raise ValueError("need at least one full week")\n    table = daily[:weeks * 7].reshape(weeks, 7)\n    return np.round(table.mean(axis=1), 2), weeks\n\n\naverages, weeks = weekday_averages(np.arange(1, 16))\nprint(averages.tolist(), weeks)\n', fails: ["demo", "one-week", "rounding", "output"] },
    ],
  },
  {
    ref: "python:bank:py10-07",
    slug: "py10-07",
    module: "numpy",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: a broadcasting bug that hides",
    topics: ["broadcasting", "keepdims", "silent bugs"],
    minutes: 6,
    after: "python:reshaping-and-aggregating",
    packages: NP,
    prompt:
      "`center_rows(data)` should subtract each **row's** mean from that row, so every row averages 0. On a 3×3 array it runs without error, yet the numbers are wrong; on a 2×3 array it crashes. Find out why and fix it.",
    expectedOutput: "[[-10.0, 0.0, 10.0], [-1.0, 0.0, 1.0], [0.0, 0.0, 0.0]]\n",
    looksFor: ["Each row has its own mean subtracted.", "Works for arrays that aren't square."],
    starter: `import numpy as np\n\n\ndef center_rows(data):\n    return data - data.mean(axis=1)\n\n\n${CENTER_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "square", label: "Centers the rows of a 3×3 array", show: "center_rows(np.array([[10, 20, 30], [1, 2, 3], [5, 5, 5]]))", expr: "center_rows(np.array([[10, 20, 30], [1, 2, 3], [5, 5, 5]])).tolist()", expected: grid([-10, 0, 10], [-1, 0, 1], [0, 0, 0]) },
        { kind: "expr", id: "wide", label: "Works on a 2×3 array", show: "center_rows(np.array([[1, 2, 3], [4, 4, 4]]))", expr: "center_rows(np.array([[1, 2, 3], [4, 4, 4]])).tolist()", expected: grid([-1, 0, 1], [0, 0, 0]) },
        { kind: "expr", id: "tall", label: "Works on a 3×2 array", hidden: true, expr: "center_rows(np.array([[0, 2], [5, 7], [1, 1]])).tolist()", expected: grid([-1, 1], [-1, 1], [0, 0]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[[-10.0, 0.0, 10.0], [-1.0, 0.0, 1.0], [0.0, 0.0, 0.0]]\n" },
      ],
    },
    hints: ["data.mean(axis=1) has shape (rows,); broadcasting lines it up with the last axis, the columns.", "For a square array the shapes happen to fit, so the wrong mean is subtracted from each column silently.", "keepdims=True keeps it as a (rows, 1) column, which broadcasts across each row."],
    answer: `import numpy as np\n\n\ndef center_rows(data):\n    return data - data.mean(axis=1, keepdims=True)\n\n\n${CENTER_DEMO}`,
    alternatives: [`import numpy as np\n\n\ndef center_rows(data):\n    return data - data.mean(axis=1)[:, np.newaxis]\n\n\n${CENTER_DEMO}\n`],
    wrong: [
      { code: `import numpy as np\n\n\ndef center_rows(data):\n    return data - data.mean(axis=0)\n\n\n${CENTER_DEMO}\n`, fails: ["square", "wide", "tall", "output"], why: "This centers columns: it runs on every shape, but answers a different question." },
    ],
  },
  {
    ref: "python:bank:py10-08",
    slug: "py10-08",
    module: "numpy",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: view or copy?",
    topics: ["views", "fancy indexing", "masks"],
    minutes: 6,
    after: "python:indexing-masks-and-views",
    packages: NP,
    prompt: "Some indexing gives a view of the same data, some gives a copy. What does this program print?",
    code: "import numpy as np\n\na = np.array([1, 2, 3, 4, 5])\n\ns = a[1:3]\ns[0] = 20\n\nf = a[[3, 4]]\nf[0] = 40\n\nm = a[a > 4]\nm[:] = 0\n\nc = a[:2].copy()\nc[1] = -1\n\nprint(a.tolist())\nprint(s.tolist(), f.tolist(), m.tolist(), c.tolist())",
    output: "[1, 20, 3, 4, 5]\n[20, 3] [40, 5] [0, 0] [1, -1]\n",
    explanation:
      "A basic slice like `a[1:3]` is a **view**: writing `s[0]` changes `a[1]`. Indexing with a list (`a[[3, 4]]`) or a mask (`a[a > 4]`) builds a **copy**, so changing `f` or `m` leaves `a` alone. Note `m` is taken after `a[1]` became 20, so it holds 20 and 5 before being zeroed. `.copy()` always copies.",
    hints: ["Which of these index with a plain slice?", "The mask a > 4 is evaluated after s[0] = 20 has already changed a."],
    wrong: ["[1, 2, 3, 4, 5]\n[20, 3] [40, 5] [0, 0] [1, -1]", "[1, 20, 3, 40, 0]\n[20, 3] [40, 5] [0, 0] [1, -1]"],
  },
  {
    ref: "python:bank:py10-09",
    slug: "py10-09",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Fill gaps with column means",
    topics: ["NaN", "np.where", "masks"],
    minutes: 8,
    after: "python:nans-and-numerical-reliability",
    packages: NP,
    prompt:
      "`data` is a 2-D float array (rows are days, columns are sensors) with gaps stored as `NaN`. Write `fill_gaps(data)` that returns a **new** array where each NaN is replaced by the mean of the non-NaN values in its **column**. A column with no values at all is filled with `0.0`. The input must not change.",
    expectedOutput: "[[1.0, 7.0, 4.0], [3.0, 6.0, 4.0], [2.0, 8.0, 4.0]]\n",
    looksFor: ["Each gap gets its own column's mean of real values.", "Known values are kept as they are.", "An all-NaN column becomes zeros.", "The input array still has its NaNs afterwards."],
    starter: `import numpy as np\n\n\ndef fill_gaps(data):\n    pass\n\n\n${FILL_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Fills each gap with its column mean", show: "fill_gaps(data) for the demo array", expr: "fill_gaps(np.array([[1.0, np.nan, 4.0], [3.0, 6.0, np.nan], [np.nan, 8.0, np.nan]])).tolist()", expected: grid([1, 7, 4], [3, 6, 4], [2, 8, 4]) },
        { kind: "expr", id: "all-nan", label: "An all-NaN column becomes zeros", show: "fill_gaps(np.array([[np.nan, 1.0], [np.nan, 3.0]]))", expr: "fill_gaps(np.array([[np.nan, 1.0], [np.nan, 3.0]])).tolist()", expected: grid([0, 1], [0, 3]) },
        { kind: "expr", id: "untouched", label: "The input keeps its NaNs", show: "count of NaNs in data after fill_gaps(data)", expr: "_d = np.array([[np.nan, 2.0], [4.0, np.nan]])\nfill_gaps(_d)\nresult = int(np.isnan(_d).sum())", expected: i(2), tip: "Assigning into data[mask] changes the caller's array. Build a new one with np.where(...)." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[[1.0, 7.0, 4.0], [3.0, 6.0, 4.0], [2.0, 8.0, 4.0]]\n" },
      ],
    },
    hints: ["missing = np.isnan(data).", "Per column: np.nansum(data, axis=0) divided by the count of non-NaN values; columns with a count of 0 get 0.", "np.where(missing, means, data) picks the mean where a value is missing; means broadcasts across rows."],
    answer:
      `import numpy as np\n\n\ndef fill_gaps(data):\n    missing = np.isnan(data)\n    counts = (~missing).sum(axis=0)\n    sums = np.nansum(data, axis=0)\n    means = np.divide(sums, counts, out=np.zeros(sums.shape), where=counts > 0)\n    return np.where(missing, means, data)\n\n\n${FILL_DEMO}`,
    wrong: [
      { code: `import numpy as np\n\n\ndef fill_gaps(data):\n    missing = np.isnan(data)\n    counts = (~missing).sum(axis=0)\n    sums = np.nansum(data, axis=0)\n    means = np.divide(sums, counts, out=np.zeros(sums.shape), where=counts > 0)\n    data[missing] = np.broadcast_to(means, data.shape)[missing]\n    return data\n\n\n${FILL_DEMO}\n`, fails: ["untouched"] },
      { code: `import numpy as np\n\n\ndef fill_gaps(data):\n    return np.nan_to_num(data)\n\n\n${FILL_DEMO}\n`, fails: ["demo", "output"] },
    ],
  },
  {
    ref: "python:bank:py10-10",
    slug: "py10-10",
    module: "numpy",
    kind: "write",
    difficulty: "medium",
    title: "Running balance without a loop",
    topics: ["np.cumsum", "masks", "argmax"],
    minutes: 7,
    after: "python:reshaping-and-aggregating",
    packages: NP,
    prompt:
      "Write `balance(transactions, opening=0)` that returns a tuple: a NumPy array of the account balance after each transaction (starting from `opening`), and the index of the **first** transaction that takes the balance below 0, or `-1` if it never goes negative. Use NumPy, not a loop. An empty list gives an empty array and `-1`.",
    expectedOutput: "[70.0, -10.0, 10.0, 0.0, -30.0] 1\n",
    looksFor: ["Balances start from `opening`.", "The first negative balance's index is found, or `-1`.", "A balance of exactly 0 isn't negative.", "Empty input works."],
    starter: `import numpy as np\n\n\ndef balance(transactions, opening=0):\n    pass\n\n\n${BALANCE_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Balances and first overdraft", show: "balance([50, -80, 20, -10, -30], opening=20)", expr: "_r, _i = balance([50, -80, 20, -10, -30], opening=20)\nresult = (_r.tolist(), _i)", expected: py.tuple(floats(70, -10, 10, 0, -30), i(1)), compare: close },
        { kind: "expr", id: "never", label: "Never negative gives -1", show: "balance([5, 5, -10])", expr: "_r, _i = balance([5, 5, -10])\nresult = (_r.tolist(), _i)", expected: py.tuple(floats(5, 10, 0), i(-1)), compare: close, tip: "(running < 0).argmax() is 0 when nothing is negative: check .any() first." },
        { kind: "expr", id: "empty", label: "No transactions", show: "balance([])", expr: "_r, _i = balance([])\nresult = (_r.tolist(), _i)", expected: py.tuple(py.list(), i(-1)) },
        { kind: "expr", id: "first", label: "Negative straight away", hidden: true, expr: "_r, _i = balance([-1, 2])\nresult = (_r.tolist(), _i)", expected: py.tuple(floats(-1, 1), i(0)), compare: close },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[70.0, -10.0, 10.0, 0.0, -30.0] 1\n" },
      ],
    },
    hints: ["running = opening + np.cumsum(np.asarray(transactions, dtype=float)).", "negative = running < 0.", "int(negative.argmax()) if negative.any() else -1."],
    answer: `import numpy as np\n\n\ndef balance(transactions, opening=0):\n    running = opening + np.cumsum(np.asarray(transactions, dtype=float))\n    negative = running < 0\n    first = int(negative.argmax()) if negative.any() else -1\n    return running, first\n\n\n${BALANCE_DEMO}`,
    wrong: [
      { code: `import numpy as np\n\n\ndef balance(transactions, opening=0):\n    running = opening + np.cumsum(np.asarray(transactions, dtype=float))\n    return running, int((running < 0).argmax())\n\n\n${BALANCE_DEMO}\n`, fails: ["never", "empty"] },
      { code: `import numpy as np\n\n\ndef balance(transactions, opening=0):\n    running = np.cumsum(np.asarray(transactions, dtype=float))\n    negative = running < 0\n    return running, int(negative.argmax()) if negative.any() else -1\n\n\n${BALANCE_DEMO}\n`, fails: ["demo", "output"] },
    ],
  },
];
