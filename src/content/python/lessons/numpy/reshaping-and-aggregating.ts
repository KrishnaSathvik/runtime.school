import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;
const fl = (...xs: number[]) => py.list(...xs.map((x) => f(x)));
const il = (...xs: number[]) => py.list(...xs.map((x) => i(x)));

export const reshapingAndAggregating: PyLesson = {
  slug: "reshaping-and-aggregating",
  ref: "python:reshaping-and-aggregating",
  module: "numpy",
  number: 4,
  title: "Reshaping and aggregating",
  level: "intermediate",
  summary:
    "Change an array's shape without changing its data, then summarise it: totals, means, minimums and maximums for the whole array or along one axis, positions of the extremes, running totals, and joining arrays together.",
  packages: ["numpy"],

  sections: [
    {
      label: "reshape",
      blocks: [
        {
          kind: "p",
          text: "`arr.reshape(rows, cols)` gives the same elements in a new shape, filled row by row. The total size can't change: 12 elements can be `(3, 4)`, `(4, 3)`, `(2, 6)` or `(12,)`, but not `(5, 2)`. Use `-1` for one dimension to let NumPy work it out: `reshape(-1, 4)` means “rows of 4, however many that takes”. `arr.ravel()` flattens back to 1-D.",
        },
      ],
    },
    {
      label: "aggregating along an axis",
      blocks: [
        {
          kind: "p",
          text: "`sum`, `mean`, `min`, `max` and `std` summarise the whole array by default. With `axis=` they work **along** one axis and collapse it: on a `(stores, days)` grid, `axis=1` goes along each row and gives one value per store; `axis=0` goes down each column and gives one value per day. Remember it as “the axis you name disappears”.",
        },
        { kind: "code", code: 'sales = np.array([[10, 12, 9], [20, 18, 25]])   # 2 stores x 3 days\nsales.sum()          # 94\nsales.sum(axis=1)    # [31 63]      one per store\nsales.sum(axis=0)    # [30 30 34]   one per day' },
        {
          kind: "p",
          text: "`argmax` and `argmin` give the **position** of the largest or smallest value (the first one, on ties). `cumsum` gives running totals. `np.concatenate`, `np.vstack` and `np.column_stack` join arrays.",
        },
      ],
    },
  ],

  example: {
    caption: "A week of hourly readings reshaped into days, then summarised. Press Run to execute it with real Python and NumPy; running examples never affects your progress.",
    code: 'import numpy as np\n\nreadings = np.arange(1, 13)          # 12 readings, 3 per day\ndaily = readings.reshape(-1, 3)      # one row per day\nprint(daily)\nprint("Per day:", daily.sum(axis=1), "| Per slot:", daily.sum(axis=0))\nprint("Busiest day:", daily.sum(axis=1).argmax())\nprint("Running total:", readings.cumsum())\nprint("Mean per day:", daily.mean(axis=1))',
  },

  walkthrough: [
    {
      title: "Same data, new shape",
      text: "`reshape` fills row by row; `-1` works out the missing dimension; `ravel` flattens again.",
      code: "import numpy as np\na = np.arange(6)\nprint(a.reshape(2, 3))\nprint(a.reshape(-1, 2))\nprint(a.reshape(3, 2).ravel())",
    },
    {
      title: "The axis you name disappears",
      text: "On a 2 × 3 grid, `axis=0` leaves 3 values (one per column) and `axis=1` leaves 2 (one per row).",
      code: "import numpy as np\nsales = np.array([[10, 12, 9], [20, 18, 25]])\nprint(sales.sum(), sales.sum(axis=0), sales.sum(axis=1))\nprint(sales.max(axis=0), sales.mean(axis=1))",
    },
    {
      title: "Where the extremes are",
      text: "`argmax` gives a position, which you can use to look up a label.",
      code: 'import numpy as np\nstores = ["Leeds", "York", "Hull"]\ntotals = np.array([310, 455, 455])\nprint(totals.argmax(), stores[totals.argmax()])\nprint(totals.argmin(), totals.cumsum())',
    },
    {
      title: "Joining arrays",
      text: "`concatenate` joins end to end; `vstack` stacks as rows; `column_stack` puts 1-D arrays side by side as columns.",
      code: "import numpy as np\na = np.array([1, 2])\nb = np.array([3, 4])\nprint(np.concatenate([a, b]))\nprint(np.vstack([a, b]))\nprint(np.column_stack([a, b]))",
    },
  ],

  mistakes: [
    {
      title: "A shape that doesn't fit the data",
      text: "Ten elements can't be arranged in rows of 3: `ValueError: cannot reshape array of size 10 into shape (3)`-style error.",
      code: "import numpy as np\nprint(np.arange(10).reshape(-1, 3))",
      raises: "ValueError",
      fix: "Check that the size divides evenly (`arr.size % 3 == 0`), or trim or pad the data first.",
    },
    {
      title: "Summing along the wrong axis",
      text: "The question was total per store (per row), but `axis=0` gave one total per day.",
      code: "import numpy as np\nsales = np.array([[10, 12, 9], [20, 18, 25]])\nprint(\"per store?\", sales.sum(axis=0))",
      fix: "For one value per row, use `axis=1`: the axis you name is the one that disappears.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Daily totals from a flat feed",
      prompt:
        "A sensor sends `per_day` readings a day, as one flat array. Write `daily_summary(readings, per_day)`, which returns a tuple: an array of the **total for each day**, and the **index of the day with the highest total**. If the number of readings isn't a whole number of days, raise `ValueError`.",
      looksFor: [
        "The totals array has one value per day, in order.",
        "The busiest day's index is an int (the first one, on ties).",
        "A partial day raises `ValueError`.",
      ],
      starter: "import numpy as np\n\n\ndef daily_summary(readings, per_day):\n    # Return (daily totals, index of the busiest day).\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Totals per day and the busiest day", show: "daily_summary(np.arange(1, 13), 3)", expr: "import numpy as np\ntotals, best = daily_summary(np.arange(1, 13), 3)\nresult = (totals.tolist(), int(best))", expected: py.tuple(il(6, 15, 24, 33), i(3)), tip: "readings.reshape(-1, per_day).sum(axis=1), then .argmax()." },
          { kind: "expr", id: "tie", label: "Ties go to the first day", show: "daily_summary(np.array([5, 5, 2, 8]), 2)", expr: "import numpy as np\ntotals, best = daily_summary(np.array([5, 5, 2, 8]), 2)\nresult = (totals.tolist(), int(best))", expected: py.tuple(il(10, 10), i(0)) },
          { kind: "expr", id: "partial", label: "A partial day raises ValueError", show: "daily_summary(np.arange(10), 3)", expr: "import numpy as np\nresult = daily_summary(np.arange(10), 3)", raises: "ValueError" },
          { kind: "expr", id: "floats", label: "Works with decimal readings", hidden: true, expr: "import numpy as np\ntotals, best = daily_summary(np.array([0.5, 1.5, 2.25, 0.25]), 2)\nresult = (totals.tolist(), int(best))", expected: py.tuple(fl(2, 2.5), i(1)) },
        ],
      },
      hints: [
        "readings.size % per_day != 0 means there's a partial day.",
        "readings.reshape(-1, per_day) gives one row per day.",
        "Sum along each row with axis=1, then argmax() gives the busiest day.",
      ],
      answer: 'import numpy as np\n\n\ndef daily_summary(readings, per_day):\n    """Return (total per day, index of the busiest day)."""\n    if readings.size % per_day != 0:\n        raise ValueError(f"{readings.size} readings is not a whole number of {per_day}-reading days")\n    totals = readings.reshape(-1, per_day).sum(axis=1)\n    return totals, int(totals.argmax())',
      wrong: [
        { code: "import numpy as np\n\ndef daily_summary(readings, per_day):\n    totals = readings.reshape(-1, per_day).sum(axis=0)\n    return totals, int(totals.argmax())\n", fails: ["values", "tie", "floats"], why: "sums along the wrong axis" },
        { code: "import numpy as np\n\ndef daily_summary(readings, per_day):\n    totals = readings.reshape(per_day, -1).sum(axis=1)\n    return totals, int(totals.argmax())\n", fails: ["values"], why: "reshape with the dimensions swapped" },
      ],
    },
    {
      id: "challenge-2",
      title: "Normalise each column",
      prompt:
        "Write `min_max_scale(data)` for a 2-D array of features (rows are samples, columns are features). Scale **each column** to the range 0 to 1: `(x - column_min) / (column_max - column_min)`. A column whose values are all equal can't be scaled that way; set it to all zeros. Return a new float array; don't loop over columns.",
      looksFor: [
        "Each column runs from 0 (its minimum) to 1 (its maximum).",
        "A constant column becomes all 0, with no division-by-zero warnings or NaNs.",
        "The result is a new float array.",
      ],
      starter: "import numpy as np\n\n\ndef min_max_scale(data):\n    # Scale each column to 0..1; constant columns become 0.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Each column scaled to 0..1", show: "min_max_scale(np.array([[1, 10], [2, 20], [3, 40]])).tolist()", expr: "import numpy as np\nresult = np.round(min_max_scale(np.array([[1, 10], [2, 20], [3, 40]])), 4).tolist()", expected: py.list(fl(0, 0), fl(0.5, 0.3333), fl(1, 1)), tip: "lo = data.min(axis=0) and hi = data.max(axis=0) give one value per column; broadcasting does the rest." },
          { kind: "expr", id: "constant", label: "A constant column becomes 0, without NaN", show: "min_max_scale(np.array([[5, 1], [5, 3]])).tolist()", expr: "import numpy as np\nresult = min_max_scale(np.array([[5, 1], [5, 3]])).tolist()", expected: py.list(fl(0, 0), fl(0, 1)), tip: "Where hi - lo is 0, divide by 1 instead (np.where(span == 0, 1, span)), so those values become 0." },
          { kind: "expr", id: "new", label: "Returns a new float array", hidden: true, expr: "import numpy as np\nd = np.array([[0, 4], [2, 8]])\nout = min_max_scale(d)\nresult = (str(out.dtype), d.tolist())", expected: py.tuple(py.str("float64"), py.list(il(0, 4), il(2, 8))) },
        ],
      },
      hints: [
        "lo = data.min(axis=0); hi = data.max(axis=0): one value per column.",
        "span = hi - lo; replace zero spans with 1 so the division is safe: np.where(span == 0, 1, span).",
        "return (data - lo) / span. For a constant column, data - lo is 0 everywhere.",
      ],
      answer: 'import numpy as np\n\n\ndef min_max_scale(data):\n    """Scale each column to 0..1; constant columns become 0."""\n    lo = data.min(axis=0)\n    span = data.max(axis=0) - lo\n    safe_span = np.where(span == 0, 1, span)\n    return (data - lo) / safe_span',
      wrong: [
        { code: "import numpy as np\n\ndef min_max_scale(data):\n    lo = data.min(axis=0)\n    hi = data.max(axis=0)\n    return (data - lo) / (hi - lo)\n", fails: ["constant"], why: "0 / 0 gives NaN for constant columns" },
        { code: "import numpy as np\n\ndef min_max_scale(data):\n    lo = data.min()\n    hi = data.max()\n    return (data - lo) / (hi - lo)\n", fails: ["values", "constant"], why: "scales by the whole array, not per column" },
      ],
    },
  ],

  quiz: [
    {
      id: "axis",
      prompt: "`grid` has shape `(4, 7)`. What's the shape of `grid.mean(axis=0)`?",
      options: [
        { text: "`(7,)`", correct: true, why: "`axis=0` (the rows) is collapsed, leaving one mean per column: 7 values." },
        { text: "`(4,)`", why: "That's `axis=1`: one value per row." },
        { text: "`(4, 7)`", why: "Aggregating along an axis removes it." },
        { text: "A single number", why: "That's `grid.mean()` with no axis." },
      ],
    },
    {
      id: "reshape",
      prompt: "Which reshape works for an array of 18 elements?",
      options: [
        { text: "`reshape(-1, 6)`", correct: true, why: "18 / 6 = 3, so NumPy fills in 3 rows." },
        { text: "`reshape(4, 5)`", why: "4 × 5 = 20 elements, not 18." },
        { text: "`reshape(-1, 4)`", why: "18 isn't divisible by 4." },
        { text: "`reshape(-1, -1)`", why: "Only one dimension can be `-1`." },
      ],
    },
  ],

  outcomes: [
    "Reshape arrays, using `-1` to infer a dimension, and flatten with `ravel`.",
    "Aggregate with `sum`, `mean`, `min`, `max` along an axis, knowing which axis disappears.",
    "Find positions with `argmax`/`argmin`, and running totals with `cumsum`.",
    "Join arrays with `concatenate`, `vstack` and `column_stack`.",
  ],
};
