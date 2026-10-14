import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const f = py.float;
const i = py.int;
const fl = (...xs: number[]) => py.list(...xs.map((x) => f(x)));

export const nansAndNumericalReliability: PyLesson = {
  slug: "nans-and-numerical-reliability",
  ref: "python:nans-and-numerical-reliability",
  module: "numpy",
  number: 5,
  title: "NaNs and numerical reliability",
  level: "intermediate",
  summary:
    "Handle missing measurements with `NaN`: see how it spreads through calculations, find it with `np.isnan`, and summarise around it with `nanmean` and friends. Then avoid the other quiet numeric traps: comparing floats exactly, dividing by zero, and integers that overflow.",
  packages: ["numpy"],

  sections: [
    {
      label: "NaN means “no number”",
      blocks: [
        {
          kind: "p",
          text: "`np.nan` (“not a number”) is the float NumPy uses for missing or undefined values. It **spreads**: any arithmetic with NaN gives NaN, so the `mean` of an array containing one NaN is NaN. That's deliberate: a silent wrong average would be worse.",
        },
        {
          kind: "p",
          text: "NaN isn't equal to anything, **not even itself**: `np.nan == np.nan` is `False`. So `arr == np.nan` never finds it. Use `np.isnan(arr)`, which gives a boolean mask of the missing positions.",
        },
      ],
    },
    {
      label: "working around NaN",
      blocks: [
        {
          kind: "p",
          text: "`np.nanmean`, `np.nansum`, `np.nanmin`, `np.nanmax` and `np.nanstd` ignore NaNs. A mask does the same explicitly: `arr[~np.isnan(arr)].mean()`. Or fill the gaps: `np.where(np.isnan(arr), fill, arr)`. Which is right depends on what “missing” means for your data, so decide and say so. And if **every** value is NaN, there's no valid answer: `np.nanmean` gives NaN with a warning, so check for that case.",
        },
      ],
    },
    {
      label: "other numeric traps",
      blocks: [
        {
          kind: "p",
          text: "Compare floats with tolerance: `np.isclose(a, b)` for each element, `np.allclose(a, b)` for whole arrays. Dividing by zero in an array doesn't raise an error; it gives `inf` (or `nan` for 0/0). On most computers NumPy also prints a `RuntimeWarning`, but in this browser runtime it can't detect the division at all, so there isn't even a warning: check denominators yourself. And integer arrays have a fixed size: an `int8` holds -128 to 127, and going past the end **wraps around** silently. Use a big enough dtype (or floats) for totals.",
        },
      ],
    },
  ],

  example: {
    caption: "Readings with gaps, summarised safely. Press Run to execute it with real Python and NumPy; running examples never affects your progress.",
    code: 'import numpy as np\n\nreadings = np.array([21.5, np.nan, 23.0, 22.5, np.nan])\nprint("mean:", readings.mean())\nprint("missing:", np.isnan(readings), "count:", np.isnan(readings).sum())\nprint("nanmean:", np.nanmean(readings))\nprint("filled:", np.where(np.isnan(readings), np.nanmean(readings), readings))\n\nprint(0.1 + 0.2 == 0.3, np.isclose(0.1 + 0.2, 0.3))\nprint(np.array([127], dtype=np.int8) + 1)',
  },

  walkthrough: [
    {
      title: "NaN spreads",
      text: "One missing value makes the sum and the mean NaN.",
      code: "import numpy as np\na = np.array([1.0, np.nan, 3.0])\nprint(a + 1, a.sum(), a.mean())",
    },
    {
      title: "NaN isn't equal to itself",
      text: "`==` never matches NaN; `np.isnan` does.",
      code: "import numpy as np\na = np.array([1.0, np.nan, 3.0])\nprint(np.nan == np.nan, a == np.nan)\nprint(np.isnan(a), a[~np.isnan(a)])",
    },
    {
      title: "nan-aware summaries",
      text: "Each `nan…` function ignores the gaps. The mask version gives the same mean.",
      code: "import numpy as np\na = np.array([1.0, np.nan, 3.0, 8.0])\nprint(np.nanmean(a), np.nansum(a), np.nanmax(a))\nprint(a[~np.isnan(a)].mean())",
    },
    {
      title: "Quiet traps: division and overflow",
      text: "Division by zero gives `inf` (and `nan` for 0/0) rather than an error. An `int8` total that passes 127 wraps around to negative numbers: 120 + 10 comes out as -126.",
      code: "import numpy as np\nwith np.errstate(divide=\"ignore\", invalid=\"ignore\"):\n    print(np.array([1.0, 0.0]) / np.array([0.0, 0.0]))\nsmall = np.array([120, 10], dtype=np.int8)\nprint(small.sum(dtype=np.int8), small.sum(dtype=np.int64))",
    },
  ],

  mistakes: [
    {
      title: "Looking for NaN with ==",
      text: "The count of missing values comes out as 0, because `==` never matches NaN.",
      code: "import numpy as np\na = np.array([1.0, np.nan, np.nan])\nprint((a == np.nan).sum())",
      fix: "Count with `np.isnan(a).sum()`.",
    },
    {
      title: "Averaging data with gaps",
      text: "The plain `mean` is NaN as soon as one value is missing, and every calculation that uses it becomes NaN too.",
      code: "import numpy as np\ntemps = np.array([20.5, np.nan, 22.0])\nprint(\"average:\", temps.mean(), \"| alert:\", temps.mean() > 21)",
      fix: "Decide how to treat gaps, then use `np.nanmean(temps)` or a mask.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Mean of valid measurements",
      prompt:
        "Write `valid_mean(values)` for a 1-D float array that may contain NaN. Return a tuple: the mean of the non-NaN values rounded to 2 places, and the number of NaNs. If every value is NaN (or the array is empty), the mean is `None` instead, and no warning should be produced.",
      looksFor: [
        "The mean ignores NaNs and is rounded to 2 places.",
        "The second value counts the NaNs, as an int.",
        "With no valid values, the mean is `None`.",
      ],
      starter: "import numpy as np\n\n\ndef valid_mean(values):\n    # Return (mean of non-NaN values or None, number of NaNs).\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Mean of the valid values, and the NaN count", show: "valid_mean(np.array([21.5, np.nan, 23.0, 22.5, np.nan]))", expr: "import numpy as np\nm, n = valid_mean(np.array([21.5, np.nan, 23.0, 22.5, np.nan]))\nresult = (float(m), int(n))", expected: py.tuple(f(22.33), i(2)), tip: "mask = np.isnan(values); values[~mask].mean(), rounded; mask.sum() counts the NaNs." },
          { kind: "expr", id: "all-nan", label: "All NaN gives None", show: "valid_mean(np.array([np.nan, np.nan]))", expr: "import numpy as np\nm, n = valid_mean(np.array([np.nan, np.nan]))\nresult = (m, int(n))", expected: py.tuple(py.none, i(2)), tip: "If there are no valid values, return None before calculating a mean." },
          { kind: "expr", id: "empty", label: "An empty array gives None", show: "valid_mean(np.array([]))", expr: "import numpy as np\nm, n = valid_mean(np.array([]))\nresult = (m, int(n))", expected: py.tuple(py.none, i(0)) },
          { kind: "expr", id: "no-nan", label: "Works when nothing is missing", hidden: true, expr: "import numpy as np\nm, n = valid_mean(np.array([1.0, 2.0]))\nresult = (float(m), int(n))", expected: py.tuple(f(1.5), i(0)) },
        ],
      },
      hints: [
        "missing = np.isnan(values); valid = values[~missing].",
        "If valid.size == 0: return None, int(missing.sum()).",
        "Otherwise return round(float(valid.mean()), 2), int(missing.sum()).",
      ],
      answer: 'import numpy as np\n\n\ndef valid_mean(values):\n    """Return (mean of non-NaN values rounded to 2 places, or None; number of NaNs)."""\n    missing = np.isnan(values)\n    valid = values[~missing]\n    if valid.size == 0:\n        return None, int(missing.sum())\n    return round(float(valid.mean()), 2), int(missing.sum())',
      wrong: [
        { code: "import numpy as np\n\ndef valid_mean(values):\n    return round(float(values.mean()), 2), int(np.isnan(values).sum())\n", fails: ["values", "all-nan", "empty"], why: "plain mean is NaN" },
        { code: "import numpy as np\n\ndef valid_mean(values):\n    return round(float(np.nanmean(values)), 2), int((values == np.nan).sum())\n", fails: ["values", "all-nan", "empty"], why: "== can't find NaN, and no None case" },
      ],
    },
    {
      id: "challenge-2",
      title: "Safe ratios",
      prompt:
        "Write `conversion_rates(purchases, visits)` for two arrays of the same shape. Return a float array of `purchases / visits`, rounded to 3 places, with `np.nan` wherever `visits` is 0 (the rate is undefined there). No `inf` values should appear.",
      looksFor: [
        "Rates are `purchases / visits`, rounded to 3 places.",
        "Where `visits` is 0, the result is NaN, not `inf`.",
        "It works for 2-D arrays too.",
      ],
      starter: "import numpy as np\n\n\ndef conversion_rates(purchases, visits):\n    # Return purchases / visits, NaN where visits is 0.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Rates, with NaN where there were no visits", show: "conversion_rates(np.array([3, 0, 5]), np.array([40, 0, 8]))", expr: "import numpy as np\nr = conversion_rates(np.array([3, 0, 5]), np.array([40, 0, 8]))\nresult = [None if np.isnan(x) else float(x) for x in r]", expected: py.list(f(0.075), py.none, f(0.625)), tip: "np.where(visits == 0, np.nan, purchases / safe_visits), where safe_visits has 1 in place of 0." },
          { kind: "expr", id: "no-inf", label: "No inf values", show: "np.isinf(conversion_rates(np.array([1, 2]), np.array([0, 4]))).any()", expr: "import numpy as np\nresult = bool(np.isinf(conversion_rates(np.array([1, 2]), np.array([0, 4]))).any())", expected: py.bool(false) },
          { kind: "expr", id: "grid", label: "Works for 2-D arrays", hidden: true, expr: "import numpy as np\nr = conversion_rates(np.array([[1, 2], [0, 3]]), np.array([[4, 0], [5, 6]]))\nresult = np.where(np.isnan(r), -1, r).tolist()", expected: py.list(fl(0.25, -1), fl(0, 0.5)) },
        ],
      },
      hints: [
        "safe = np.where(visits == 0, 1, visits) avoids dividing by zero.",
        "rates = purchases / safe, then put NaN back where visits was 0: np.where(visits == 0, np.nan, rates).",
        "np.round(…, 3) rounds every element.",
      ],
      answer: 'import numpy as np\n\n\ndef conversion_rates(purchases, visits):\n    """Return purchases / visits rounded to 3 places, NaN where visits is 0."""\n    safe = np.where(visits == 0, 1, visits)\n    rates = np.where(visits == 0, np.nan, purchases / safe)\n    return np.round(rates, 3)',
      alternatives: ['import numpy as np\n\ndef conversion_rates(purchases, visits):\n    with np.errstate(divide="ignore", invalid="ignore"):\n        rates = purchases / visits\n    rates = np.where(visits == 0, np.nan, rates)\n    return np.round(rates, 3)\n'],
      wrong: [
        { code: "import numpy as np\n\ndef conversion_rates(purchases, visits):\n    return np.round(purchases / visits, 3)\n", fails: ["no-inf", "grid"], why: "inf where visits is 0" },
        { code: "import numpy as np\n\ndef conversion_rates(purchases, visits):\n    safe = np.where(visits == 0, 1, visits)\n    return np.round(purchases / safe, 3)\n", fails: ["values", "grid"], why: "divides by 1 but never puts NaN back" },
      ],
    },
  ],

  quiz: [
    {
      id: "spread",
      prompt: "What does this print?",
      code: "import numpy as np\na = np.array([2.0, np.nan, 4.0])\nprint(a.sum(), np.nansum(a), (a == np.nan).sum())",
      options: [
        { text: "`nan 6.0 0`", correct: true, why: "NaN spreads through `sum`; `nansum` ignores it; and `==` never matches NaN, so the count is 0." },
        { text: "`6.0 6.0 1`", why: "Plain `sum` doesn't skip NaN, and `== np.nan` finds nothing." },
        { text: "`nan nan 1`", why: "`nansum` ignores NaNs, giving 6.0." },
        { text: "A `ValueError`", why: "NaN is a valid float; nothing here raises." },
      ],
    },
    {
      id: "overflow",
      prompt: "Why can an `int8` array give a negative total for positive numbers?",
      options: [
        { text: "It only holds -128 to 127, and going past 127 wraps around", correct: true, why: "Fixed-size integers overflow silently. Use a larger dtype for totals." },
        { text: "Because NumPy rounds integers", why: "Rounding doesn't make positive totals negative; overflow does." },
        { text: "Because of NaN", why: "Integer arrays can't hold NaN at all." },
        { text: "It can't: NumPy raises an error on overflow", why: "For arrays, NumPy wraps without an error." },
      ],
    },
  ],

  outcomes: [
    "Explain how NaN spreads, and find it with `np.isnan`, never `==`.",
    "Summarise data with gaps using `nanmean`, `nansum` or masks, and handle the all-missing case.",
    "Compare floats with `np.isclose` and `np.allclose`.",
    "Avoid silent division-by-zero results and integer overflow.",
  ],
};
