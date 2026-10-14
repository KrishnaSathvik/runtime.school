import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;
const fl = (...xs: number[]) => py.list(...xs.map((x) => f(x)));

export const indexingMasksAndViews: PyLesson = {
  slug: "indexing-masks-and-views",
  ref: "python:indexing-masks-and-views",
  module: "numpy",
  number: 3,
  title: "Indexing, masks and views",
  level: "intermediate",
  summary:
    "Select parts of arrays: single elements and slices in one or two dimensions, rows that meet a condition with boolean masks, and chosen positions with index arrays. Know which selections are views that share data with the original, and which are copies.",
  packages: ["numpy"],

  sections: [
    {
      label: "indexing and slicing",
      blocks: [
        {
          kind: "p",
          text: "1-D arrays index and slice like lists. 2-D arrays take one index per axis, separated by a comma: `grid[1, 2]` is row 1, column 2; `grid[0]` is the whole first row; `grid[:, 2]` is the whole third column (`:` means “every row”); `grid[0:2, 1:]` is a smaller grid.",
        },
      ],
    },
    {
      label: "boolean masks",
      blocks: [
        {
          kind: "p",
          text: "A comparison gives a boolean array, and using it as an index keeps the elements where it's `True`: `readings[readings > 30]`. That's a **mask**. Combine conditions with `&` (and), `|` (or) and `~` (not), with brackets around each comparison: `readings[(readings > 20) & (readings < 30)]`. The words `and`/`or` don't work on arrays.",
        },
        { kind: "code", code: 'readings = np.array([21.5, 35.2, 18.0, 40.1, 25.3])\nhigh = readings > 30\nprint(high)              # [False  True False  True False]\nprint(readings[high])    # [35.2 40.1]\nprint(high.sum())        # 2: True counts as 1' },
        {
          kind: "p",
          text: "Assigning through a mask changes just those elements: `readings[readings < 0] = 0` clips negative values. `np.where(condition, a, b)` builds a new array taking `a` where the condition holds and `b` elsewhere.",
        },
      ],
    },
    {
      label: "views and copies",
      blocks: [
        {
          kind: "p",
          text: "A **slice** of an array is a **view**: a window onto the same data, not a copy. Changing the view changes the original. That makes slicing big arrays cheap, but it surprises people who expect list behaviour. Mask indexing and index arrays (`arr[[0, 2]]`) make **copies**. Call `.copy()` when you need an independent array.",
        },
      ],
    },
  ],

  example: {
    caption: "Selecting rows, columns and readings that meet a condition. Press Run to execute it with real Python and NumPy; running examples never affects your progress.",
    code: 'import numpy as np\n\n# rows: 3 sensors, columns: 4 hourly readings\ngrid = np.array([[21.5, 22.0, 35.2, 23.1], [19.8, 41.0, 20.4, 21.0], [22.2, 22.9, 23.5, 24.0]])\nprint("Sensor 1:", grid[1])\nprint("Hour 2:", grid[:, 2])\nprint("Reading at sensor 0, hour 2:", grid[0, 2])\n\ntoo_hot = grid > 30\nprint("Readings over 30:", grid[too_hot], "count:", too_hot.sum())\nprint(np.where(too_hot, "HOT", "ok"))',
  },

  walkthrough: [
    {
      title: "Row, column, element",
      text: "One index per axis; `:` takes everything along an axis.",
      code: "import numpy as np\ngrid = np.arange(12).reshape(3, 4)\nprint(grid)\nprint(grid[1], grid[:, 1], grid[2, 3])\nprint(grid[0:2, 1:3])",
    },
    {
      title: "Masks select and count",
      text: "The mask has one boolean per element. Indexing with it keeps the `True` ones; summing it counts them.",
      code: "import numpy as np\nr = np.array([21.5, 35.2, 18.0, 40.1, 25.3])\nprint(r > 30, r[r > 30], (r > 30).sum())\nprint(r[(r > 20) & (r < 30)])\nprint(r[~(r > 30)])",
    },
    {
      title: "Assigning through a mask",
      text: "Only the selected elements change; `np.where` makes a new array instead.",
      code: "import numpy as np\nr = np.array([5.0, -2.0, 7.5, -0.5])\nclipped = np.where(r < 0, 0, r)\nr[r < 0] = 0\nprint(r, clipped)",
    },
    {
      title: "A slice is a view; a mask gives a copy",
      text: "Changing the slice changed `data`; changing the masked selection didn't.",
      code: "import numpy as np\ndata = np.array([1, 2, 3, 4])\nview = data[1:3]\nview[0] = 99\npicked = data[data > 3]\npicked[0] = -1\nsafe = data[1:3].copy()\nsafe[0] = 0\nprint(data, view, picked, safe)",
    },
  ],

  mistakes: [
    {
      title: "Using and between masks",
      text: "`and` needs one `True` or `False`, but each side is a whole array: `ValueError: The truth value of an array … is ambiguous`.",
      code: "import numpy as np\nr = np.array([21.5, 35.2, 18.0])\nprint(r[(r > 20) and (r < 30)])",
      raises: "ValueError",
      fix: "Use `&` (and `|`, `~`) with brackets: `r[(r > 20) & (r < 30)]`.",
    },
    {
      title: "Changing a slice and expecting the original to stay",
      text: "The “top two” slice is a view, so zeroing it also zeroed the original scores.",
      code: "import numpy as np\nscores = np.array([95, 88, 72, 61])\ntop_two = scores[:2]\ntop_two[:] = 0\nprint(scores)",
      fix: "Take a copy when you'll modify the selection: `scores[:2].copy()`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Select readings in range",
      prompt:
        "Write `in_range(readings, low, high)`, which returns a tuple: a **new array** of the readings from `low` to `high` inclusive, in their original order, and how many readings were **outside** that range (as an int). Use a boolean mask, not a loop. The input array must not change.",
      looksFor: [
        "The array holds the readings with `low <= r <= high`, in order.",
        "The count of readings outside the range is an int.",
        "No loops, and the input is unchanged.",
      ],
      starter: "import numpy as np\n\n\ndef in_range(readings, low, high):\n    # Return (readings in range, number outside).\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Keeps the readings in range, in order", show: "in_range(np.array([21.5, 35.2, 18.0, 30.0, 20.0]), 20, 30)", expr: "import numpy as np\narr, outside = in_range(np.array([21.5, 35.2, 18.0, 30.0, 20.0]), 20, 30)\nresult = (arr.tolist(), outside, type(outside).__name__ in ('int', 'int32', 'int64'))", expected: py.tuple(fl(21.5, 30, 20), i(2), py.bool(true)), tip: "mask = (readings >= low) & (readings <= high); the outside count is the number of False values." },
          { kind: "expr", id: "empty", label: "Nothing in range", show: "in_range(np.array([1.0, 2.0]), 5, 6)", expr: "import numpy as np\narr, outside = in_range(np.array([1.0, 2.0]), 5, 6)\nresult = (arr.tolist(), outside)", expected: py.tuple(py.list(), i(2)) },
          { kind: "expr", id: "unchanged", label: "Leaves the input unchanged", hidden: true, expr: "import numpy as np\nr = np.array([5.0, 50.0])\nin_range(r, 0, 10)\nresult = r.tolist()", expected: fl(5, 50) },
        ],
      },
      hints: [
        "mask = (readings >= low) & (readings <= high), with brackets around each comparison.",
        "readings[mask] is a new array of the matching readings.",
        "The outside count is (~mask).sum(); convert it with int().",
      ],
      answer: 'import numpy as np\n\n\ndef in_range(readings, low, high):\n    """Return (readings with low <= r <= high, number of readings outside)."""\n    mask = (readings >= low) & (readings <= high)\n    return readings[mask], int((~mask).sum())',
      wrong: [
        { code: "import numpy as np\n\ndef in_range(readings, low, high):\n    mask = (readings > low) & (readings < high)\n    return readings[mask], int((~mask).sum())\n", fails: ["values"], why: "excludes the edges" },
        { code: "import numpy as np\n\ndef in_range(readings, low, high):\n    readings[readings < low] = low\n    readings[readings > high] = high\n    return readings, 0\n", fails: ["values", "empty", "unchanged"], why: "clips instead of filtering, and changes the input" },
      ],
    },
    {
      id: "challenge-2",
      title: "Replace bad sensor values",
      prompt:
        "Sensors report `-999` when they fail. Write `clean_grid(grid)` for a 2-D array: return a **copy** where every `-999` is replaced by the mean of the **valid** readings in the same row (rounded to 1 place). The original grid must not change. You may assume each row has at least one valid reading.",
      looksFor: [
        "Each `-999` is replaced by its row's mean of valid readings, rounded to 1 place.",
        "Valid readings are unchanged; the original array isn't modified.",
      ],
      starter: "import numpy as np\n\n\ndef clean_grid(grid):\n    # Return a copy with -999 replaced by the row's valid mean.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "values",
            label: "Replaces failures with the row's valid mean",
            show: "clean_grid(np.array([[20.0, -999, 22.0], [-999, 30.0, 31.0]])).tolist()",
            expr: "import numpy as np\nresult = clean_grid(np.array([[20.0, -999, 22.0], [-999, 30.0, 31.0]])).tolist()",
            expected: py.list(fl(20, 21, 22), fl(30.5, 30, 31)),
            tip: "For each row, valid = row[row != -999]; then put round(valid.mean(), 1) where row == -999.",
          },
          { kind: "expr", id: "unchanged", label: "Leaves the original grid unchanged", show: "g = ...; clean_grid(g); g", expr: "import numpy as np\ng = np.array([[1.0, -999.0]])\nclean_grid(g)\nresult = g.tolist()", expected: py.list(fl(1, -999)), tip: "Start with out = grid.copy() and only change out." },
          { kind: "expr", id: "rounding", label: "Rounds the replacement to 1 place", hidden: true, expr: "import numpy as np\nresult = clean_grid(np.array([[1.0, 2.0, 2.0, -999.0]])).tolist()", expected: py.list(fl(1, 2, 2, 1.7)), compare: { float: "exact" } },
        ],
      },
      hints: [
        "out = grid.copy(), then loop over row numbers (one loop over rows is fine).",
        "row = out[r]; bad = row == -999; valid_mean = row[~bad].mean().",
        "row[bad] = round(valid_mean, 1). Since row is a view of out, this changes out.",
      ],
      answer: 'import numpy as np\n\n\ndef clean_grid(grid):\n    """Return a copy of grid with -999 replaced by each row\'s mean of valid readings."""\n    out = grid.astype(float).copy()\n    for r in range(out.shape[0]):\n        row = out[r]\n        bad = row == -999\n        row[bad] = round(row[~bad].mean(), 1)\n    return out',
      alternatives: ["import numpy as np\n\ndef clean_grid(grid):\n    out = grid.astype(float)\n    bad = out == -999\n    sums = np.where(bad, 0, out).sum(axis=1)\n    counts = (~bad).sum(axis=1)\n    means = np.round(sums / counts, 1)\n    return np.where(bad, means[:, None], out)\n"],
      wrong: [
        { code: "import numpy as np\n\ndef clean_grid(grid):\n    for r in range(grid.shape[0]):\n        row = grid[r]\n        bad = row == -999\n        row[bad] = round(row[~bad].mean(), 1)\n    return grid\n", fails: ["unchanged"], why: "modifies the original" },
        { code: "import numpy as np\n\ndef clean_grid(grid):\n    out = grid.copy()\n    for r in range(out.shape[0]):\n        row = out[r]\n        row[row == -999] = round(row.mean(), 1)\n    return out\n", fails: ["values", "rounding"], why: "mean includes the -999 values" },
      ],
    },
  ],

  quiz: [
    {
      id: "view",
      prompt: "What does this program print?",
      code: "import numpy as np\na = np.array([10, 20, 30, 40])\nb = a[1:3]\nb[0] = 0\nprint(a)",
      options: [
        { text: "`[10  0 30 40]`", correct: true, why: "A slice is a view onto `a`'s data, so changing `b[0]` changes `a[1]`." },
        { text: "`[10 20 30 40]`", why: "That would be true for a list slice. Array slices share data." },
        { text: "`[ 0 20 30 40]`", why: "`b[0]` is `a[1]`, not `a[0]`." },
        { text: "An error", why: "Assigning into a view is allowed; it writes through to the original." },
      ],
    },
    {
      id: "mask",
      prompt: "`r = np.array([4, 9, 2, 7])`. What is `r[r > 5].sum()`?",
      options: [
        { text: "`16`", correct: true, why: "The mask keeps 9 and 7, which add up to 16." },
        { text: "`2`", why: "That's `(r > 5).sum()`, the number of elements over 5." },
        { text: "`22`", why: "Only the elements where the mask is `True` are kept before summing." },
        { text: "`[9, 7]`", why: "`.sum()` adds the selected elements into one number." },
      ],
    },
  ],

  outcomes: [
    "Index and slice 1-D and 2-D arrays, including whole rows and columns.",
    "Select and count elements with boolean masks, combining conditions with `&`, `|` and `~`.",
    "Change selected elements through a mask, or build a new array with `np.where`.",
    "Tell views (slices) from copies (masks, index arrays), and use `.copy()` when needed.",
  ],
};
