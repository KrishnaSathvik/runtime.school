/**
 * M41 practice: ten independent problems on the NumPy skills of PY-L41-01 … PY-L41-05.
 *
 * Mix: 3 function implementations, 1 data transformation, 1 validation, 2 debugging (genuinely broken functions),
 * 1 refactoring (a loop rewritten as array operations: same results, checked by the same cases plus a no-loop
 * check, because removing the loop is the task), 2 output predictions. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19.
 * Hard: 20, 22.
 *
 * Fixtures are slices of course datasets: D07 (NOAA daily weather), D06 (NYC taxi trips), D13 (US flight delays) and
 * R02 (Runtime Films ratings). Functions take plain lists and return plain values; hidden cases cover empty input,
 * boundaries, halves when rounding, gaps (None), constant rows and other inputs a copied example would get wrong.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";
import { NP } from "../lessons/M41";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;

/** True when the named function contains no loop or comprehension (the refactoring's stated goal). */
const noLoopIn = (name: string) =>
  [
    "import ast as _ast",
    "_found = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == " + JSON.stringify(name) + "]",
    "result = bool(_found) and not any(isinstance(n, (_ast.For, _ast.While, _ast.ListComp, _ast.GeneratorExp, _ast.DictComp, _ast.SetComp)) for n in _ast.walk(_found[0]))",
  ].join("\n");

export const m41Questions: PyQuestion[] = [
  {
    id: "PY-Q41-02",
    version: 2,
    slug: "flight-delay-slices",
    title: "Slices and masks on a delay table",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "comparison", "import-alias", "import-module", "list-index", "list-literal", "np-array", "np-dtype", "np-index", "print-call", "print-several", "string-index", "string-slice", "top-level-indent"],
    packages: NP,
    prompt: "The table holds arrival delays in minutes (negative means early): one row per airline, one column per day. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`1:` means from row 1 to the end; the 2 after the comma is one column.",
      "A mask keeps matching values in reading order: row 0 left to right, then row 1, then row 2.",
      "`::2` is a slice with a step of 2: positions 0 and 2.",
    ],
    explanation: "`delays[1:, 2]` takes column 2 from rows 1 and 2: 58 and -5. The mask keeps every value above 20 in row-major order: 35 (row 0), 58 (row 1), 21 (row 2). `delays[0, ::2]` steps through row 0 two at a time: -4 and 0.",
    predict: {
      program: src`
import numpy as np

delays = np.array([
    [-4, 12, 0, 35],
    [-1, -7, 58, 3],
    [21, 0, -5, 9],
])
print(delays[1:, 2].tolist())
print(delays[delays > 20].tolist())
print(delays[0, ::2].tolist())
`,
      output: "[58, -5]\n[35, 58, 21]\n[-4, 0]\n",
      wrongPredictions: ["[58, -5]\n[21, 35, 58]\n[-4, 0]", "[0, 58, -5]\n[35, 58, 21]\n[-4, 0]", "[58, -5]\n[35, 58, 21]\n[-4, 12]", "[-1, -7, 58, 3]\n[35, 58, 21]\n[-4, 0]"],
    },
  },
  {
    id: "PY-Q41-03",
    version: 2,
    slug: "average-fare-crash",
    title: "The average fare that crashes on cents",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-literal", "none-value", "np-array", "np-dtype", "np-reduce", "print-call", "print-several", "print-text", "top-level-indent"],
    packages: NP,
    prompt: "`average_fare` should return the mean of a list of fares that arrive as text. It works for `[\"40\", \"7\"]` but crashes with `ValueError` as soon as a fare has cents, and for an empty list it should return `None` instead of a warning and `nan`. Fix it.",
    spec: [
      ["Function", "`average_fare(fares)`"],
      ["fares", "a list of texts such as `\"17.2\"`"],
      ["Returns", "the mean fare as a float, or `None` for an empty list"],
    ],
    hiddenKinds: ["whole-dollar fares", "a single fare", "an empty list", "fares whose cents would be lost if truncated"],
    hints: [
      "Read the error: which conversion fails on `\"40.8\"`?",
      "A dtype that keeps decimals is needed before averaging.",
      "Check for no fares before computing anything.",
    ],
    explanation: "`astype(int)` on the text `\"40.8\"` fails because `int()` can't read a decimal point. Converting to float keeps the cents, so the mean is right; converting the text to float and then to int would run but drop the cents. An empty list has no mean, so the function returns `None` before reaching `mean()`.",
    code: {
      starter: src`
import numpy as np

def average_fare(fares):
    values = np.array(fares).astype(int)
    return float(values.mean())

print(average_fare(["40", "7"]))
print(average_fare(["40.8", "7.2", "17.2"]))
`,
      answer: src`
import numpy as np

def average_fare(fares):
    if len(fares) == 0:
        return None
    values = np.array(fares).astype(float)
    return float(values.mean())

print(average_fare(["40", "7"]))
print(average_fare(["40.8", "7.2", "17.2"]))
`,
      alternatives: [
        src`
import numpy as np

def average_fare(fares):
    values = np.array(fares, dtype=float)
    if values.size == 0:
        return None
    return float(values.sum() / values.size)
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def average_fare(fares):
    if len(fares) == 0:
        return None
    values = np.array(fares).astype(float).astype(int)
    return float(values.mean())
`,
          fails: ["returns"],
          why: "it no longer crashes, but converting to int afterwards still throws the cents away",
        },
        {
          code: src`
import numpy as np

def average_fare(fares):
    values = np.array(fares).astype(float)
    return float(values.mean())
`,
          fails: ["returns"],
          why: "the crash is fixed, but an empty list still gives nan instead of None",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "average_fare", [
            example([["40.8", "7.2", "17.2"]], 21.733333333333334),
            example([["40", "7"]], 23.5),
            example([[]], null),
            hiddenCase("whole-dollar fares", [["10", "20", "30"]], 20.0),
            hiddenCase("a single fare", [["5.1"]], 5.1),
            hiddenCase("fares whose cents would be lost if truncated", [["2.9", "2.9"]], 2.9),
            hiddenCase("an empty list", [[]], null),
          ], { label: "average_fare() returns the mean of the fares, or None", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-06",
    version: 2,
    slug: "fares-to-whole-dollars",
    title: "Fares to whole dollars",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "conversion", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-comp", "list-index", "list-literal", "membership", "np-array", "np-dtype", "print-call", "print-several", "string-index", "top-level-indent"],
    packages: NP,
    prompt: "A summary chart groups taxi fares by whole dollars. Write `whole_dollars(fares)`: return each fare rounded to the **nearest** whole number, as a list of `int`. Exact halves go to the even neighbour (2.5 → 2, 3.5 → 4), which is what `np.rint` and Python's `round` both do.",
    spec: [
      ["Function", "`whole_dollars(fares)`"],
      ["fares", "a list of numbers (dollars and cents)"],
      ["Returns", "a list of `int`, one per fare, nearest whole number; `[]` for no fares"],
    ],
    hiddenKinds: ["fares just below the next dollar", "exact halves", "negative adjustments", "an empty list"],
    hints: [
      "Converting floats to an integer dtype is not rounding.",
      "Round first, as floats, then change the dtype.",
      "The caller wants plain Python ints, not a NumPy array.",
    ],
    explanation: "`np.rint` rounds every value to the nearest whole number (halves to even) but keeps a float dtype, so `astype` converts afterwards and `tolist()` gives plain ints. `astype(int)` alone truncates toward zero, so 7.9 would become 7; `np.floor` always rounds down.",
    code: {
      starter: src`
import numpy as np

def whole_dollars(fares):
    return []

print(whole_dollars([40.8, 7.2, 17.5, 22.06]))
`,
      answer: src`
import numpy as np

def whole_dollars(fares):
    rounded = np.rint(np.array(fares, dtype=float))
    return rounded.astype(np.int64).tolist()

print(whole_dollars([40.8, 7.2, 17.5, 22.06]))
`,
      alternatives: [
        src`
def whole_dollars(fares):
    return [round(f) for f in fares]
`,
        src`
import numpy as np

def whole_dollars(fares):
    return [int(v) for v in np.round(np.array(fares, dtype=float))]
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def whole_dollars(fares):
    return np.array(fares, dtype=float).astype(int).tolist()
`,
          fails: ["returns"],
          why: "`astype(int)` cuts the cents off, so 40.8 becomes 40",
        },
        {
          code: src`
import numpy as np

def whole_dollars(fares):
    return np.floor(np.array(fares, dtype=float)).astype(int).tolist()
`,
          fails: ["returns"],
          why: "`floor` always rounds down",
        },
        {
          code: src`
import numpy as np

def whole_dollars(fares):
    return np.rint(np.array(fares, dtype=float)).tolist()
`,
          fails: ["returns"],
          why: "the values are rounded but are still floats such as `41.0`",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "whole_dollars", [
            example([[40.8, 7.2, 17.5, 22.06]], [41, 7, 18, 22]),
            example([[5.1]], [5]),
            example([[]], []),
            hiddenCase("fares just below the next dollar", [[7.9, 12.99]], [8, 13]),
            hiddenCase("exact halves", [[2.5, 3.5, 0.5]], [2, 4, 0]),
            hiddenCase("negative adjustments", [[-0.6, -2.4]], [-1, -2]),
            hiddenCase("an empty list", [[]], []),
          ], { label: "whole_dollars() rounds to the nearest int" }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-10",
    version: 2,
    slug: "rescale-ratings",
    title: "Rescale ratings to 0–1",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "logical", "np-array", "np-dtype", "np-reduce", "precedence", "print-call", "print-several", "string-index", "top-level-indent"],
    packages: NP,
    prompt: "To compare films rated on different scales, a recommender rescales each list of scores so the lowest becomes 0 and the highest becomes 1. Write `rescale(scores)`: return `(score - lowest) / (highest - lowest)` for every score. If every score is the same there is no range: return all zeros.",
    spec: [
      ["Function", "`rescale(scores)`"],
      ["scores", "a list of numbers"],
      ["Returns", "a list of floats between 0 and 1; all `0.0` when the scores are equal; `[]` for no scores"],
    ],
    hiddenKinds: ["identical scores", "a single score", "negative values", "an empty list"],
    hints: [
      "Two reductions give the numbers the formula needs.",
      "Subtract and divide the whole array at once; the single numbers are used with every value.",
      "Decide the no-range case before dividing, or you divide by zero.",
    ],
    explanation: "`min()` and `max()` reduce the array to two numbers, and broadcasting uses them with every score. When they are equal, the range is 0 and the division would give nan, so that case returns zeros explicitly. An empty list has no minimum, so it is returned before reducing.",
    code: {
      starter: src`
import numpy as np

def rescale(scores):
    return []

print(rescale([3.5, 2.0, 4.5, 5.0]))
`,
      answer: src`
import numpy as np

def rescale(scores):
    values = np.array(scores, dtype=float)
    if values.size == 0:
        return []
    low = values.min()
    spread = values.max() - low
    if spread == 0:
        return [0.0] * values.size
    return ((values - low) / spread).tolist()

print(rescale([3.5, 2.0, 4.5, 5.0]))
`,
      alternatives: [
        src`
import numpy as np

def rescale(scores):
    if not scores:
        return []
    values = np.array(scores, dtype=float)
    shifted = values - values.min()
    top = shifted.max()
    return (shifted / top).tolist() if top > 0 else (shifted * 0).tolist()
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def rescale(scores):
    values = np.array(scores, dtype=float)
    if values.size == 0:
        return []
    return (values / values.max()).tolist()
`,
          fails: ["returns"],
          why: "dividing by the maximum keeps the lowest score above 0",
        },
        {
          code: src`
import numpy as np

def rescale(scores):
    values = np.array(scores, dtype=float)
    if values.size == 0:
        return []
    low = values.min()
    return ((values - low) / (values.max() - low)).tolist()
`,
          fails: ["returns"],
          why: "equal scores divide 0 by 0 and give nan",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "rescale", [
            example([[3.5, 2.0, 4.5, 5.0]], [0.5, 0.0, 0.8333333333333334, 1.0]),
            example([[1, 3]], [0.0, 1.0]),
            example([[]], []),
            hiddenCase("identical scores", [[4, 4, 4]], [0.0, 0.0, 0.0]),
            hiddenCase("a single score", [[2.5]], [0.0]),
            hiddenCase("negative values", [[-10, 0, 30]], [0.0, 0.25, 1.0]),
            hiddenCase("an empty list", [[]], []),
          ], { label: "rescale() maps the lowest to 0 and the highest to 1", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-12",
    version: 2,
    slug: "taxi-masks-predict",
    title: "Labels and masks on taxi trips",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["aggregate-call", "assignment", "bitwise", "comparison", "conversion", "import-alias", "import-module", "list-index", "list-literal", "np-array", "np-dtype", "np-reduce", "np-where", "print-call", "string-index"],
    packages: NP,
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "The inner `np.where` decides between cash and other; the outer one only takes over where the payment is 1.",
      "`&` keeps a trip only when both tests are true.",
      "`~` flips the mask, so the sum is over every trip that is *not* a cheap card trip.",
    ],
    explanation: "Payments 1, 1, 0, 2, 1 become card, card, other, cash, card. Cheap card trips are positions 1 (7.2) and 4 (5.1), so the count is 2, and the other three fares add up to 40.8 + 17.2 + 22.06 = 80.06.",
    predict: {
      program: src`
import numpy as np

fare = np.array([40.8, 7.2, 17.2, 22.06, 5.1])
payment = np.array([1, 1, 0, 2, 1])
label = np.where(payment == 1, "card", np.where(payment == 2, "cash", "other"))
print(label.tolist())
cheap_card = (payment == 1) & (fare < 10)
print(cheap_card.sum(), round(float(fare[~cheap_card].sum()), 2))
`,
      output: "['card', 'card', 'other', 'cash', 'card']\n2 80.06\n",
      wrongPredictions: ["['card', 'card', 'cash', 'other', 'card']\n2 80.06", "['card', 'card', 'other', 'cash', 'card']\n2 12.3", "['card', 'card', 'other', 'cash', 'card']\n3 80.06", "['card', 'card', 'other', 'cash', 'card']\n2 92.36"],
    },
  },
  {
    id: "PY-Q41-13",
    version: 2,
    slug: "cold-windy-days-bug",
    title: "Cold, windy days: the ambiguous truth value",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "bitwise", "comparison", "conversion", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-comp", "list-literal", "logical", "membership", "np-array", "np-dtype", "np-where", "print-call", "print-several", "reassignment", "string-index", "top-level-indent"],
    packages: NP,
    prompt: "`cold_windy_days` should return the positions of days that were at or below `max_temp` **and** had an average wind of at least `min_wind`. Every call crashes with `ValueError: The truth value of an array with more than one element is ambiguous`. Fix it.",
    spec: [
      ["Function", "`cold_windy_days(tmax, wind, max_temp, min_wind)`"],
      ["tmax, wind", "lists of the same length, one value per day"],
      ["Returns", "a list of day positions (0 is the first day) where both conditions hold"],
    ],
    hiddenKinds: ["values exactly at both limits", "cold days that were calm", "no matching days", "empty lists"],
    hints: [
      "The error names the problem: `and` wants one True or False.",
      "There is an operator that combines two masks position by position.",
      "Each comparison needs its own parentheses next to that operator.",
    ],
    explanation: "`and` asks each array whether it is true as a whole, which NumPy refuses for arrays of several values. `&` combines the masks position by position; it binds more tightly than `<=`, so each comparison is wrapped in parentheses. `|` would also run, but answers a different question (cold *or* windy).",
    code: {
      starter: src`
import numpy as np

def cold_windy_days(tmax, wind, max_temp, min_wind):
    t = np.array(tmax, dtype=float)
    w = np.array(wind, dtype=float)
    bad = t <= max_temp and w >= min_wind
    return np.flatnonzero(bad).tolist()

print(cold_windy_days([-0.5, 9.4, -12.1, -14.3], [2.8, 1.7, 7.8, 4.7], 0, 4))
`,
      answer: src`
import numpy as np

def cold_windy_days(tmax, wind, max_temp, min_wind):
    t = np.array(tmax, dtype=float)
    w = np.array(wind, dtype=float)
    bad = (t <= max_temp) & (w >= min_wind)
    return np.flatnonzero(bad).tolist()

print(cold_windy_days([-0.5, 9.4, -12.1, -14.3], [2.8, 1.7, 7.8, 4.7], 0, 4))
`,
      alternatives: [
        src`
import numpy as np

def cold_windy_days(tmax, wind, max_temp, min_wind):
    t = np.array(tmax, dtype=float)
    w = np.array(wind, dtype=float)
    bad = np.logical_and(t <= max_temp, w >= min_wind)
    return [int(i) for i in np.flatnonzero(bad)]
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def cold_windy_days(tmax, wind, max_temp, min_wind):
    t = np.array(tmax, dtype=float)
    w = np.array(wind, dtype=float)
    bad = (t <= max_temp) | (w >= min_wind)
    return np.flatnonzero(bad).tolist()
`,
          fails: ["returns"],
          why: "`|` keeps days that were only cold or only windy",
        },
        {
          code: src`
import numpy as np

def cold_windy_days(tmax, wind, max_temp, min_wind):
    t = np.array(tmax, dtype=float)
    w = np.array(wind, dtype=float)
    bad = (t < max_temp) & (w > min_wind)
    return np.flatnonzero(bad).tolist()
`,
          fails: ["returns"],
          why: "strict comparisons drop days exactly at the limits",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "cold_windy_days", [
            example([[-0.5, 9.4, -12.1, -14.3], [2.8, 1.7, 7.8, 4.7], 0, 4], [2, 3]),
            example([[5, -8.8], [6.3, 6.3], -5, 5], [1]),
            example([[20.0, 21.1], [2.0, 9.0], 0, 4], []),
            hiddenCase("values exactly at both limits", [[0, 0], [4, 3.9], 0, 4], [0]),
            hiddenCase("cold days that were calm", [[-10, -12], [1.0, 2.0], 0, 4], []),
            hiddenCase("windy days that were warm", [[15, -1], [9, 9], 0, 4], [1]),
            hiddenCase("empty lists", [[], [], 0, 4], []),
          ], { label: "cold_windy_days() returns positions where both conditions hold" }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-16",
    version: 2,
    slug: "standardise-station-rows",
    title: "Standardise each station's readings",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "membership", "none-value", "np-array", "np-broadcast", "np-dtype", "np-reduce", "np-stats", "np-where", "precedence", "print-call", "print-several", "reassignment", "string-slice", "top-level-indent"],
    packages: NP,
    prompt: "To compare how unusual each day was at stations with very different climates, convert every reading to a z-score **within its own row**: (reading − that row's mean) / that row's standard deviation. A row whose readings are all the same has no spread; its z-scores are all 0.",
    spec: [
      ["Function", "`standardize_rows(grid)`"],
      ["grid", "a list of rows (stations), each a list of readings"],
      ["Returns", "a list of rows of floats, same shape as `grid`"],
      ["Rules", "use the population standard deviation (NumPy's default `std`)"],
    ],
    hiddenKinds: ["a row with no spread", "a square grid", "a single station", "negative readings"],
    hints: [
      "Each row needs its own mean and its own standard deviation: choose the axis that leaves one value per row.",
      "Those per-row values must line up with the rows, not the columns, before subtracting and dividing.",
      "Replace a zero spread with something harmless before dividing, or handle it with a mask.",
    ],
    explanation: "`mean(axis=1)` and `std(axis=1)` give one value per row; `[:, None]` turns them into columns so they broadcast across each row. A row with no spread would divide 0 by 0, so its standard deviation is swapped for 1, which leaves its differences (all 0) unchanged.",
    code: {
      starter: src`
import numpy as np

def standardize_rows(grid):
    return grid

print(standardize_rows([[-0.5, 6.7, 9.4], [22.2, 17.8, 21.7]]))
`,
      answer: src`
import numpy as np

def standardize_rows(grid):
    data = np.array(grid, dtype=float)
    mean = data.mean(axis=1)[:, None]
    spread = data.std(axis=1)[:, None]
    safe = np.where(spread == 0, 1.0, spread)
    return ((data - mean) / safe).tolist()

print(standardize_rows([[-0.5, 6.7, 9.4], [22.2, 17.8, 21.7]]))
`,
      alternatives: [
        src`
import numpy as np

def standardize_rows(grid):
    rows = []
    for row in grid:
        values = np.array(row, dtype=float)
        spread = values.std()
        if spread == 0:
            rows.append([0.0] * values.size)
        else:
            rows.append(((values - values.mean()) / spread).tolist())
    return rows
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def standardize_rows(grid):
    data = np.array(grid, dtype=float)
    spread = data.std(axis=0)
    safe = np.where(spread == 0, 1.0, spread)
    return ((data - data.mean(axis=0)) / safe).tolist()
`,
          fails: ["returns"],
          why: "`axis=0` standardises each day across stations instead of each station across days",
        },
        {
          code: src`
import numpy as np

def standardize_rows(grid):
    data = np.array(grid, dtype=float)
    mean = data.mean(axis=1)[:, None]
    spread = data.std(axis=1)[:, None]
    return ((data - mean) / spread).tolist()
`,
          fails: ["returns"],
          why: "a row with no spread divides by zero and becomes nan",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "standardize_rows", [
            example([[[1, 2, 3], [10, 20, 30]]], [[-1.224744871391589, 0, 1.224744871391589], [-1.224744871391589, 0, 1.224744871391589]]),
            example([[[2, 4]]], [[-1, 1]]),
            example([[[5, 5, 5], [0, 10, 5]]], [[0, 0, 0], [-1.224744871391589, 1.224744871391589, 0]]),
            hiddenCase("a row with no spread", [[[3.3, 3.3]]], [[0, 0]]),
            hiddenCase("a square grid", [[[0, 2], [10, 30]]], [[-1, 1], [-1, 1]]),
            hiddenCase("a single station with negative readings", [[[-14.3, -12.1, -13.8, -3.8]]], [[-0.7790085217488766, -0.2596695072496254, -0.6609769275445013, 1.699654956543003]]),
          ], { label: "standardize_rows() gives z-scores within each row", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-19",
    version: 2,
    slug: "impossible-temperature-readings",
    title: "Find impossible temperature readings",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "bitwise", "comparison", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "np-array", "np-dtype", "np-stats", "np-where", "precedence", "print-call", "print-several", "range-call", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    packages: NP,
    prompt: "Before daily highs and lows go into a report, a check lists every day that can't be trusted: either reading is missing (`None`), the low is **above** the high, or either reading is outside −60 to 60 °C. Write `invalid_days(tmax, tmin)`: return the positions of those days, in order, each once.",
    spec: [
      ["Function", "`invalid_days(tmax, tmin)`"],
      ["tmax, tmin", "lists of the same length; values are numbers or `None`"],
      ["Returns", "a list of positions (0 is the first day)"],
      ["Rules", "a low equal to the high is valid; −60 and 60 themselves are valid"],
    ],
    hiddenKinds: ["a missing low", "a low equal to the high", "readings exactly at the limits", "a day with two problems", "all valid"],
    hints: [
      "Build one mask per rule, all the same length.",
      "Missing values become nan; comparisons with nan are False, so missing needs its own mask.",
      "Combine the masks with `|`; positions where the result is True are the answer, and each appears once.",
    ],
    explanation: "With `dtype=float`, `None` becomes nan. `np.isnan` catches the gaps, because any comparison with nan is False and would let them through. Swapped readings and out-of-range readings are two more masks, and `|` combines all three, so a day with several problems still appears once.",
    code: {
      starter: src`
import numpy as np

def invalid_days(tmax, tmin):
    return []

print(invalid_days([6.7, None, 9.4, 75.0], [-4.9, -4.9, 12.0, 3.0]))
`,
      answer: src`
import numpy as np

def invalid_days(tmax, tmin):
    hi = np.array(tmax, dtype=float)
    lo = np.array(tmin, dtype=float)
    missing = np.isnan(hi) | np.isnan(lo)
    swapped = lo > hi
    out_of_range = (hi < -60) | (hi > 60) | (lo < -60) | (lo > 60)
    return np.flatnonzero(missing | swapped | out_of_range).tolist()

print(invalid_days([6.7, None, 9.4, 75.0], [-4.9, -4.9, 12.0, 3.0]))
`,
      alternatives: [
        src`
def invalid_days(tmax, tmin):
    bad = []
    for i in range(len(tmax)):
        hi, lo = tmax[i], tmin[i]
        if hi is None or lo is None or lo > hi or not (-60 <= hi <= 60 and -60 <= lo <= 60):
            bad.append(i)
    return bad
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def invalid_days(tmax, tmin):
    hi = np.array(tmax, dtype=float)
    lo = np.array(tmin, dtype=float)
    swapped = lo > hi
    out_of_range = (hi < -60) | (hi > 60) | (lo < -60) | (lo > 60)
    return np.flatnonzero(swapped | out_of_range).tolist()
`,
          fails: ["returns"],
          why: "comparisons with nan are False, so missing readings slip through",
        },
        {
          code: src`
import numpy as np

def invalid_days(tmax, tmin):
    hi = np.array(tmax, dtype=float)
    lo = np.array(tmin, dtype=float)
    missing = np.isnan(hi) | np.isnan(lo)
    swapped = lo >= hi
    out_of_range = (hi < -60) | (hi > 60) | (lo < -60) | (lo > 60)
    return np.flatnonzero(missing | swapped | out_of_range).tolist()
`,
          fails: ["returns"],
          why: "`>=` rejects a calm day whose low equals its high",
        },
        {
          code: src`
import numpy as np

def invalid_days(tmax, tmin):
    hi = np.array(tmax, dtype=float)
    lo = np.array(tmin, dtype=float)
    missing = np.isnan(hi) | np.isnan(lo)
    swapped = lo > hi
    out_of_range = (hi <= -60) | (hi >= 60) | (lo <= -60) | (lo >= 60)
    return np.flatnonzero(missing | swapped | out_of_range).tolist()
`,
          fails: ["returns"],
          why: "the limits themselves are valid readings",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "invalid_days", [
            example([[6.7, null, 9.4, 75.0], [-4.9, -4.9, 12.0, 3.0]], [1, 2, 3]),
            example([[-0.5, 6.7], [-5.5, -4.9]], []),
            example([[], []], []),
            hiddenCase("a missing low", [[5.0, 6.0], [null, 1.0]], [0]),
            hiddenCase("a low equal to the high", [[3.3], [3.3]], []),
            hiddenCase("readings exactly at the limits", [[60, -60], [-60, -60]], []),
            hiddenCase("a day with two problems", [[-70.0, 5.0], [-50.0, 1.0]], [0]),
            hiddenCase("all valid", [[22.2, 17.8, 21.7], [5.6, 9.4, 8.9]], []),
          ], { label: "invalid_days() lists each untrustworthy day once" }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-20",
    version: 2,
    slug: "moving-average",
    title: "A moving average of daily highs",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-copy", "list-index", "list-literal", "list-mutate", "membership", "np-array", "np-dtype", "np-reduce", "np-where", "precedence", "print-call", "print-several", "raise-stmt", "range-call", "string-index", "string-slice", "top-level-indent"],
    packages: NP,
    prompt: "A smoothed temperature line replaces each value with the average of a window of consecutive days. Write `moving_average(values, window)`: return the mean of every run of `window` consecutive values, starting with the first full window. A window that doesn't fit gives `[]`; a window smaller than 1 is a mistake: raise `ValueError`.",
    spec: [
      ["Function", "`moving_average(values, window)`"],
      ["Returns", "a list of `len(values) - window + 1` floats; `[]` when `window` is larger than the list"],
      ["Raises", "`ValueError` when `window < 1`"],
    ],
    hiddenKinds: ["a window as long as the list", "a window of 1", "a window longer than the list", "a window of 0", "negative values"],
    hints: [
      "How many full windows fit in n values? Check that count with a small example on paper.",
      "Each result is the mean of a slice; the slices start at 0, 1, 2, …",
      "Validate the window before computing, and stop when no full window fits.",
    ],
    explanation: "There are `n - window + 1` full windows; the one starting at position `i` is `values[i:i + window]`. A running total (`np.cumsum`) gives the same sums faster for long series: the sum of a window is the difference of two running totals. A window larger than the list leaves no full window, and a window below 1 means nothing, so it raises.",
    code: {
      starter: src`
import numpy as np

def moving_average(values, window):
    return []

print(moving_average([-0.5, 6.7, 9.4, 7.2, 1.7], 3))
`,
      answer: src`
import numpy as np

def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    data = np.array(values, dtype=float)
    count = data.size - window + 1
    return [float(data[i:i + window].mean()) for i in range(max(count, 0))]

print(moving_average([-0.5, 6.7, 9.4, 7.2, 1.7], 3))
`,
      alternatives: [
        src`
import numpy as np

def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    data = np.array(values, dtype=float)
    if window > data.size:
        return []
    running = np.cumsum(data)
    sums = running[window - 1:].copy()
    sums[1:] = sums[1:] - running[:-window]
    return (sums / window).tolist()
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    data = np.array(values, dtype=float)
    return [float(data[i:i + window].mean()) for i in range(data.size - window)]
`,
          fails: ["returns"],
          why: "the range stops one window early, so the last full window is missing",
        },
        {
          code: src`
import numpy as np

def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    data = np.array(values, dtype=float)
    return [float(data[i:i + window].mean()) for i in range(data.size)]
`,
          fails: ["returns"],
          why: "windows near the end are shorter than `window` but are averaged anyway",
        },
        {
          code: src`
import numpy as np

def moving_average(values, window):
    data = np.array(values, dtype=float)
    count = data.size - window + 1
    return [float(data[i:i + window].mean()) for i in range(max(count, 0))]
`,
          fails: ["returns"],
          why: "a window of 0 is not rejected",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "moving_average", [
            example([[-0.5, 6.7, 9.4, 7.2, 1.7], 3], [5.2, 7.766666666666667, 6.1]),
            example([[1, 2, 3, 4], 2], [1.5, 2.5, 3.5]),
            example([[22.2, 17.8], 5], []),
            raisesCase([[1, 2, 3], 0], "ValueError"),
            hiddenCase("a window as long as the list", [[2, 4, 6], 3], [4.0]),
            hiddenCase("a window of 1", [[1.5, 2.5], 1], [1.5, 2.5]),
            hiddenCase("a window longer than the list", [[1.0], 2], []),
            raisesCase([[1, 2], -1], "ValueError", { label: "a negative window" }),
            hiddenCase("negative values", [[-12.1, -14.3, -13.8, -3.8], 2], [-13.2, -14.05, -8.8]),
          ], { label: "moving_average() averages each full window", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q41-22",
    version: 2,
    slug: "vectorise-tip-percentages",
    title: "Vectorise the tip calculation",
    format: "refactoring",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "bitwise", "comparison", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "np-array", "np-dtype", "np-where", "print-call", "print-several", "reassignment", "string-index", "top-level-indent", "zip-call"],
    packages: NP,
    prompt: "`tip_percentages` works, but loops over every trip in Python, and the full taxi file has over a hundred thousand of them. Rewrite it with array operations and **no loop or comprehension** inside the function. It must return exactly what the loop version returns: for a card trip (`payment == 1`) with a fare above 0, the tip as a percentage of the fare; for every other trip, `0.0`.",
    spec: [
      ["Function", "`tip_percentages(fares, tips, payments)`"],
      ["Returns", "a list of floats, one per trip"],
      ["Constraint", "no `for`, `while` or comprehension inside the function"],
    ],
    hiddenKinds: ["a card trip with a zero fare", "cash trips with a tip field", "a single trip", "no trips"],
    hints: [
      "Start from one mask that says which trips get a percentage.",
      "Make an array of zeros the right length, then fill only the masked positions.",
      "Divide only the masked fares, so a zero fare is never divided.",
    ],
    explanation: "One mask, `(payments == 1) & (fares > 0)`, marks the trips that get a percentage. Filling a zero array only at those positions computes the division only where the fare is positive. `np.where(mask, tips / fares * 100, 0.0)` gives the same numbers but divides every fare first, including the zeros (a warning and inf in the unused branch), so the masked assignment is the cleaner rewrite.",
    code: {
      starter: src`
import numpy as np

def tip_percentages(fares, tips, payments):
    result = []
    for fare, tip, payment in zip(fares, tips, payments):
        if payment == 1 and fare > 0:
            result.append(tip / fare * 100)
        else:
            result.append(0.0)
    return result

print(tip_percentages([40.8, 7.2, 17.2, 0.0], [10.7, 2.55, 0.0, 1.0], [1, 1, 2, 1]))
`,
      answer: src`
import numpy as np

def tip_percentages(fares, tips, payments):
    f = np.array(fares, dtype=float)
    t = np.array(tips, dtype=float)
    p = np.array(payments)
    counted = (p == 1) & (f > 0)
    percent = np.zeros(f.size)
    percent[counted] = t[counted] / f[counted] * 100
    return percent.tolist()

print(tip_percentages([40.8, 7.2, 17.2, 0.0], [10.7, 2.55, 0.0, 1.0], [1, 1, 2, 1]))
`,
      alternatives: [
        src`
import numpy as np

def tip_percentages(fares, tips, payments):
    f = np.array(fares, dtype=float)
    t = np.array(tips, dtype=float)
    counted = (np.array(payments) == 1) & (f > 0)
    safe = np.where(counted, f, 1.0)
    return np.where(counted, t / safe * 100, 0.0).tolist()
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def tip_percentages(fares, tips, payments):
    f = np.array(fares, dtype=float)
    t = np.array(tips, dtype=float)
    p = np.array(payments)
    counted = p == 1
    percent = np.zeros(f.size)
    percent[counted] = t[counted] / f[counted] * 100
    return percent.tolist()
`,
          fails: ["returns"],
          why: "a card trip with a zero fare is divided by zero and becomes inf",
        },
        {
          code: src`
import numpy as np

def tip_percentages(fares, tips, payments):
    f = np.array(fares, dtype=float)
    t = np.array(tips, dtype=float)
    p = np.array(payments)
    return [float(tip / fare * 100) if pay == 1 and fare > 0 else 0.0 for fare, tip, pay in zip(f, t, p)]
`,
          fails: ["vectorised"],
          why: "the results are right, but the loop has only moved into a comprehension",
        },
        {
          code: src`
import numpy as np

def tip_percentages(fares, tips, payments):
    f = np.array(fares, dtype=float)
    t = np.array(tips, dtype=float)
    counted = f > 0
    percent = np.zeros(f.size)
    percent[counted] = t[counted] / f[counted] * 100
    return percent.tolist()
`,
          fails: ["returns"],
          why: "cash and other trips get a percentage too",
        },
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "tip_percentages", [
            example([[40.8, 7.2, 17.2, 0.0], [10.7, 2.55, 0.0, 1.0], [1, 1, 2, 1]], [26.225490196078436, 35.41666666666667, 0.0, 0.0]),
            example([[22.06, 5.1], [0.0, 1.0], [0, 1]], [0.0, 19.607843137254903]),
            example([[], [], []], []),
            hiddenCase("a card trip with a zero fare", [[0.0, 10.0], [2.0, 1.0], [1, 1]], [0.0, 10.0]),
            hiddenCase("cash trips with a tip field", [[20.0, 30.0], [4.0, 6.0], [2, 2]], [0.0, 0.0]),
            hiddenCase("a single trip", [[50.0], [12.5], [1]], [25.0]),
            hiddenCase("no trips", [[], [], []], []),
          ], { label: "tip_percentages() returns the same values as the loop version", compare: loose }),
          { kind: "expr", id: "vectorised", label: "tip_percentages() has no loop or comprehension", expr: noLoopIn("tip_percentages"), expected: py.bool(true) },
        ],
      },
    },
  },
];
