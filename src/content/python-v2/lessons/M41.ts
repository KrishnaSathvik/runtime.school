/**
 * M41 NumPy Foundations: five lessons (PY-L41-01 … PY-L41-05).
 *
 * Arrays, indexing and masks, broadcasting, vectorised rules, and statistics along an axis. The data is real:
 * NOAA GHCN-Daily readings (D07) for Wichita, Orlando and Sioux Falls in January 2024, plus a few Runtime Market
 * order lines (R01) and NYC taxi trips (D06). Every example runs in the course's browser Python with NumPy loaded.
 *
 * Challenges are graded by calling the learner's function with the public example and with hidden inputs (empty
 * input, boundaries, a single row, square grids that hide a broadcasting mistake), and by checking that an array the
 * function receives is left unchanged where that matters. Functions take plain lists and return plain values
 * (`tolist()`, `float()`), so the contract is the same whatever NumPy version runs it.
 * Version 2: rewritten from a print-one-value module; saved progress from version 1 does not count as mastery.
 */
import type { PyPackage } from "@/engine/python/client";
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const NP = ["numpy"] as const satisfies readonly PyPackage[];
const loose = { numbers: "int-float-equal" } as const;

// ---------------------------------------------------------------- fixtures (NOAA GHCN-Daily, January 2024)

const wichitaTmax = [-0.5, 6.7, 9.4, 7.2, 1.7, 5.0, 7.8];
const grid3x5 = [
  [-0.5, 6.7, 9.4, 7.2, 1.7],
  [22.2, 17.8, 21.7, 18.3, 23.3],
  [1.1, 2.8, -1.0, -1.0, 1.1],
];
const week = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06", "2024-01-07"];
const siouxTmax = [1.1, 2.8, -1.0, -1.0, 1.1, -0.5, -4.9];

export const m41Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L41-01 arrays and dtypes
  {
    id: "PY-L41-01",
    version: 2,
    slug: "arrays-and-dtypes",
    title: "Arrays and their dtype",
    lede: "A NumPy array holds many numbers of one kind in one block of memory, so one call can work on all of them. Its dtype says what that kind is.",
    focus: "Build an array from a list, read its dtype and shape, convert it with astype, and reduce it with sum, mean, min and max.",
    minutes: 18,
    objectives: [
      "Explain why an array has one dtype for every value, and what happens when the values are mixed",
      "Read `dtype`, `shape` and `size`, and convert text readings with `astype(float)`",
      "Reduce a whole array with `sum`, `mean`, `min` and `max`, and turn NumPy results into plain Python values",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comment", "comment-out", "comp-if", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "none-value", "part-attr", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "tuple-unpack", "unquoted-name"],
    teaches: ["np-array", "np-dtype", "np-reduce"],
    packages: NP,
    blocks: [
      {
        kind: "text",
        md: "A weather station reports a reading every day; a year is 365 numbers, a hundred stations are 36,500. A Python list can hold them, but every list item is a separate Python object, and every calculation is a Python loop. **NumPy** stores the numbers side by side in one block of memory, all of the same kind, and runs calculations over the whole block in compiled code.\n\n`np.array(values)` builds the array. Three attributes describe it: `dtype` is the kind of value every slot holds (`float64` is a 64-bit decimal number), `shape` is its size along each dimension as a tuple, and `size` is how many values there are. Methods such as `sum()`, `mean()`, `min()` and `max()` reduce the whole array to one number without a loop. (`np.zeros(n)` builds an array of `n` zeros, handy when you fill values in later.)",
      },
      {
        kind: "example",
        title: "A week of highs at Wichita",
        code: src`
import numpy as np

# Daily high temperatures in Celsius, Wichita, 1 to 7 January 2024 (NOAA GHCN-Daily)
tmax = np.array([-0.5, 6.7, 9.4, 7.2, 1.7, 5.0, 7.8])
print(tmax)
print(tmax.dtype, tmax.shape, tmax.size)
print(tmax.min(), tmax.max(), tmax.mean())
`,
        output: "[-0.5  6.7  9.4  7.2  1.7  5.   7.8]\nfloat64 (7,) 7\n-0.5 9.4 5.328571428571428\n",
        note: "An array prints without commas. `5.0` shows as `5.` because every value is a float64. The shape `(7,)` is a one-item tuple: one dimension of length 7.",
      },
      {
        kind: "text",
        md: "Every slot has the same dtype, so NumPy picks one that can hold all the values. Integers and floats together become `float64`. One piece of text turns the **whole** array into text (a dtype such as `<U3`, \"Unicode strings up to 3 characters\"). Readings from a CSV file are text, and NOAA writes a trace of rain as `T`: converting that array to numbers fails on the value that isn't a number.",
      },
      {
        kind: "error-example",
        title: "A trace reading in a rain column",
        code: src`
import numpy as np

rain_text = np.array(["0", "0.3", "T", "2.3"])
print(rain_text.dtype)
rain = rain_text.astype(float)
`,
        error: "ValueError",
        output: "<U3\n",
        note: "`astype(float)` converts every value or none: `ValueError: could not convert string to float: np.str_('T')`. Decide what `T` means (here: less than 0.1 mm, usually counted as 0) before converting.",
      },
      {
        kind: "example",
        title: "Rain totals from text readings",
        code: src`
import numpy as np

def rain_summary(readings):
    rain = np.array(readings).astype(float)
    return rain.sum(), rain.max()

week = ["0", "0", "0.3", "0", "0", "14.7", "2.3"]  # Orlando, 1 to 7 January 2024
total, wettest = rain_summary(week)
print(total, wettest)
print(rain_summary(week))
print(float(total), round(float(total)))
`,
        output: "17.3 14.7\n(np.float64(17.3), np.float64(14.7))\n17.3 17\n",
        note: "`astype(float)` makes a new float64 array from the text one. The results are NumPy scalars: `print` shows them as plain numbers, but inside a tuple or list you see `np.float64(17.3)`. `float()` (or `int()`) turns one into an ordinary Python number, which is what JSON, a CSV writer or a test expecting `17.3` wants.",
      },
      {
        kind: "text",
        md: "**Integers and the platform.** For a list of whole numbers NumPy picks a default integer dtype, and that default is platform-dependent: `int64` on most 64-bit Linux and macOS machines, `int32` on Windows before NumPy 2 and in this course's browser Python, which is 32-bit. When the width matters (large counts, IDs, sums of big values), say it: `np.array(counts, dtype=np.int64)`. And `astype(int)` on floats **cuts off** the decimals (2.7 becomes 2); it does not round.\n\n**When to use an array:** many numbers of one kind that you calculate with as a whole. **Mistakes to avoid:** mixing text into a numeric array, assuming a default integer width, and passing NumPy scalars on where plain Python values are expected.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Snowfall arrives as text",
      prompt: "`total_snow` builds an array from the text readings but returns the array itself. Convert it to floats and return the total snowfall as one number.",
      spec: [
        ["Function", "`total_snow(readings)`"],
        ["readings", "a list of snowfall readings in millimetres, as text"],
        ["Returns", "the total, as a number"],
        ["Example", "`total_snow([\"0\", \"13\", \"0\", \"267\"])` → `280.0`"],
      ],
      starter: src`
import numpy as np

def total_snow(readings):
    snow = np.array(readings)
    return snow

print(total_snow(["0", "13", "0", "267"]))
`,
      answer: src`
import numpy as np

def total_snow(readings):
    snow = np.array(readings).astype(float)
    return float(snow.sum())

print(total_snow(["0", "13", "0", "267"]))
`,
      alternatives: [
        src`
import numpy as np

def total_snow(readings):
    return np.array(readings, dtype=float).sum()
`,
      ],
      wrong: [
        {
          code: src`
def total_snow(readings):
    return 280.0
`,
          fails: ["returns"],
          why: "the total is typed in, so other readings get the wrong answer",
        },
        {
          code: src`
import numpy as np

def total_snow(readings):
    return float(np.array(readings).astype(float).max())
`,
          fails: ["returns"],
          why: "it returns the largest reading, not the total",
        },
      ],
      hints: [
        "The array holds text, so it can't be added up yet.",
        "`astype` makes a new array of another dtype; `float` is the one you need.",
        "Reduce the converted array with the method that adds every value.",
      ],
      task: {
        packages: NP,
        checks: [
          fn("returns", "total_snow", [
            example([["0", "13", "0", "267"]], py.float(280)),
            hiddenCase("a single reading of zero", [["0"]], py.float(0)),
            hiddenCase("decimal readings", [["10.5", "2"]], 12.5),
          ], { label: "total_snow() adds up the converted readings", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Summarise a series of readings",
        prompt: "A dashboard shows four numbers for any series of readings. Write `summarize(values)`: return a dictionary with the `count`, the lowest (`low`), the highest (`high`) and the `mean`. A series with no readings has nothing to summarise: return `None`.",
        spec: [
          ["Function", "`summarize(values)`"],
          ["values", "a list of numbers (whole or decimal)"],
          ["Returns", "`{\"count\": …, \"low\": …, \"high\": …, \"mean\": …}`, or `None` for an empty list"],
          ["Example", "`summarize([12, 15])` → `{'count': 2, 'low': 12.0, 'high': 15.0, 'mean': 13.5}`"],
        ],
        starter: src`
import numpy as np

def summarize(values):
    return None

print(summarize([-0.5, 6.7, 9.4, 7.2, 1.7, 5.0, 7.8]))
`,
        answer: src`
import numpy as np

def summarize(values):
    if len(values) == 0:
        return None
    data = np.array(values, dtype=float)
    return {"count": data.size, "low": data.min(), "high": data.max(), "mean": data.mean()}

print(summarize([-0.5, 6.7, 9.4, 7.2, 1.7, 5.0, 7.8]))
`,
        alternatives: [
          src`
import numpy as np

def summarize(values):
    data = np.array(values).astype(float)
    if data.size == 0:
        return None
    summary = {}
    summary["count"] = int(data.size)
    summary["low"] = float(data.min())
    summary["high"] = float(data.max())
    summary["mean"] = float(data.sum() / data.size)
    return summary
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def summarize(values):
    data = np.array(values, dtype=float)
    return {"count": data.size, "low": data.min(), "high": data.max(), "mean": data.mean()}
`,
            fails: ["returns"],
            why: "an empty list reaches `min()`, which raises ValueError: a zero-size array has no minimum",
          },
          {
            code: src`
import numpy as np

def summarize(values):
    if len(values) == 0:
        return None
    data = np.array(values, dtype=int)
    return {"count": data.size, "low": data.min(), "high": data.max(), "mean": data.mean()}
`,
            fails: ["returns"],
            why: "`dtype=int` cuts the decimals off every reading, so 6.7 counts as 6",
          },
          {
            code: src`
import numpy as np

def summarize(values):
    if len(values) == 0:
        return None
    data = np.array(values, dtype=float)
    return {"count": data.size, "low": data.min(), "high": data.max(), "mean": (data.min() + data.max()) / 2}
`,
            fails: ["returns"],
            why: "the middle of the range is not the mean unless the values are spread evenly",
          },
        ],
        hints: [
          "Deal with the empty list first: an empty array has no lowest value.",
          "Build the array with a dtype that keeps decimals, then use one reduction method per key.",
          "`size` is the count; `min`, `max` and `mean` are methods of the array.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "summarize", [
              example([wichitaTmax], { count: 7, low: -0.5, high: 9.4, mean: 5.328571428571428 }),
              example([[12, 15]], { count: 2, low: 12, high: 15, mean: 13.5 }),
              example([[]], null),
              hiddenCase("a single reading", [[21.7]], { count: 1, low: 21.7, high: 21.7, mean: 21.7 }),
              hiddenCase("only readings below zero", [[-12.1, -18.8, -14.3]], { count: 3, low: -18.8, high: -12.1, mean: -15.066666666666668 }),
              hiddenCase("decimals that would be cut off as whole numbers", [[0.3, 0.9, 1.5]], { count: 3, low: 0.3, high: 1.5, mean: 0.9 }),
            ], { label: "summarize() returns count, low, high and mean", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "Rain totals with trace and missing days",
        prompt: "NOAA's daily rain readings arrive as text. An empty string means the station sent nothing that day; `T` means a trace (less than 0.1 mm), which counts as 0 but **was** reported. Write `precipitation_total(readings)`: return a dictionary with the `total` rainfall and how many days were `reported`.",
        spec: [
          ["Function", "`precipitation_total(readings)`"],
          ["readings", "a list of texts: numbers, `\"T\"` or `\"\"`"],
          ["Returns", "`{\"total\": float, \"reported\": int}`; skip `\"\"`, count `\"T\"` as a reported 0"],
          ["Example", "`[\"0\", \"T\", \"4.1\", \"\", \"0.8\"]` → `{'total': 4.9, 'reported': 4}`"],
        ],
        starter: src`
import numpy as np

def precipitation_total(readings):
    return {"total": 0.0, "reported": 0}

print(precipitation_total(["0", "T", "4.1", "", "0.8"]))
`,
        answer: src`
import numpy as np

def precipitation_total(readings):
    reported = [r for r in readings if r != ""]
    cleaned = ["0" if r == "T" else r for r in reported]
    rain = np.array(cleaned, dtype=float)
    return {"total": float(rain.sum()), "reported": rain.size}

print(precipitation_total(["0", "T", "4.1", "", "0.8"]))
`,
        alternatives: [
          src`
import numpy as np

def precipitation_total(readings):
    values = []
    for r in readings:
        if r == "":
            continue
        values.append(0.0 if r == "T" else float(r))
    rain = np.array(values, dtype=float)
    return {"total": float(rain.sum()), "reported": len(values)}
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def precipitation_total(readings):
    cleaned = [r for r in readings if r != "" and r != "T"]
    rain = np.array(cleaned, dtype=float)
    return {"total": float(rain.sum()), "reported": rain.size}
`,
            fails: ["returns"],
            why: "dropping `T` leaves the total right but undercounts the days that were reported",
          },
          {
            code: src`
import numpy as np

def precipitation_total(readings):
    cleaned = ["0" if r == "T" or r == "" else r for r in readings]
    rain = np.array(cleaned, dtype=float)
    return {"total": float(rain.sum()), "reported": rain.size}
`,
            fails: ["returns"],
            why: "a missing day is counted as a reported day of 0 mm",
          },
        ],
        hints: [
          "Two different decisions: which readings count as reported, and what number each one is.",
          "Leave out the empty strings first, then replace `T` with a text NumPy can convert.",
          "Convert the cleaned list with a float dtype; `size` of that array is the number of reported days.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "precipitation_total", [
              example([["0", "T", "4.1", "", "0.8"]], { total: 4.9, reported: 4 }),
              example([["0", "0", "0.3", "0", "0", "14.7", "2.3"]], { total: 17.3, reported: 7 }),
              example([[]], { total: py.float(0), reported: 0 }),
              hiddenCase("only trace readings", [["T", "T"]], { total: py.float(0), reported: 2 }),
              hiddenCase("every day missing", [["", "", ""]], { total: py.float(0), reported: 0 }),
              hiddenCase("a long wet spell with gaps", [["11.4", "", "27.2", "0.5", "", "T", "2"]], { total: 41.1, reported: 5 }),
            ], { label: "precipitation_total() skips missing days and counts a trace as 0", compare: loose }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

values = np.array([2, 3.5, 1])
print(values.dtype, values.size)
`,
        choices: ["float64 3", "int32 3", "float64 (3,)", "object 3"],
        answer: 0,
        why: "One value is a decimal, so every slot becomes float64 (2 and 1 are stored as 2.0 and 1.0). `size` counts the values; `shape` would be `(3,)`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: one value arrives as text. What does this print?",
        program: src`
import numpy as np

codes = np.array([12, 7, "9"])
print(codes.dtype.kind, codes[0] + codes[1])
`,
        choices: ["U 127", "i 19", "U 19", "i 127"],
        answer: 0,
        why: "One text value makes the whole array text (`kind` U means Unicode strings), so 12 and 7 are now `'12'` and `'7'`, and `+` joins them.",
      },
      {
        id: "q3",
        prompt: "Why pass `dtype=np.int64` when building an array of counts?",
        choices: ["The default integer width depends on the platform, and 32 bits can overflow on large sums", "Arrays can't hold whole numbers without it", "It makes the array print with commas", "It converts text to numbers that `astype` can't"],
        answer: 0,
        why: "Without it NumPy picks the platform's default integer: int64 on most 64-bit Linux and macOS, int32 elsewhere (including this course's browser Python).",
      },
    ],
    review: [
      "An array holds values of one dtype; mixed values are converted to one kind (int + float → float64, any text → text).",
      "`dtype`, `shape` and `size` describe an array; `astype` builds a converted copy, and `astype(int)` cuts decimals off.",
      "`sum`, `mean`, `min` and `max` reduce the whole array; `float()` turns a NumPy result into a plain Python number.",
      "Next: pick single values, rows, columns and every value that passes a test.",
    ],
  },

  // ------------------------------------------------------------------ PY-L41-02 indexing
  {
    id: "PY-L41-02",
    version: 2,
    slug: "index-slice-mask",
    title: "Indexing, slicing and masks",
    lede: "A 2-D array is a table of numbers. One index pair picks a cell, a slice picks a row or a column, and a True/False mask picks every value that passes a test.",
    focus: "Pick values from an array by position, by slice and by a boolean mask, and know when the result shares memory with the original.",
    minutes: 18,
    objectives: [
      "Read a cell, a row and a column of a 2-D array with `[row, column]` and `:`",
      "Use a boolean mask from a comparison to keep matching values, also from a second array of the same length",
      "Explain why a slice is a view of the original and when to call `copy()`",
    ],
    requires: ["aggregate-call", "assignment", "comment", "comment-out", "comp-if", "comparison", "conversion", "except-type", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-comp", "list-copy", "list-index", "list-literal", "list-mutate", "membership", "np-array", "np-dtype", "np-reduce", "print-call", "print-several", "print-text", "string-index", "string-slice", "top-level-indent", "try-except", "unquoted-name", "zip-call"],
    teaches: ["np-index", "np-view"],
    packages: NP,
    blocks: [
      {
        kind: "text",
        md: "Readings from several stations over several days form a table: one row per station, one column per day. NumPy stores that as a **2-D array**, and its shape is `(rows, columns)`. Inside the brackets, a comma separates the position along each dimension: `tmax[1, 0]` is row 1, column 0. A colon on its own means *all of them*, so `tmax[:, 4]` is column 4 from every row, and `tmax[0, 1:4]` is part of row 0.",
      },
      {
        kind: "example",
        title: "Three stations, five days",
        code: src`
import numpy as np

stations = ["Wichita", "Orlando", "Sioux Falls"]
# Daily highs (C), 1 to 5 January 2024: one row per station, one column per day
tmax = np.array([
    [-0.5, 6.7, 9.4, 7.2, 1.7],
    [22.2, 17.8, 21.7, 18.3, 23.3],
    [1.1, 2.8, -1.0, -1.0, 1.1],
])
print(tmax.shape)
print(stations[1], tmax[1, 0])
print(tmax[2])
print(tmax[:, 4])
print(tmax[0, 1:4])
`,
        output: "(3, 5)\nOrlando 22.2\n[ 1.1  2.8 -1.  -1.   1.1]\n[ 1.7 23.3  1.1]\n[6.7 9.4 7.2]\n",
        note: "One index gives a whole row. `[:, 4]` is the fifth day at every station. A slice stops before its end, exactly as for lists: `1:4` is columns 1, 2 and 3.",
      },
      {
        kind: "error-example",
        title: "A row that isn't there",
        code: src`
import numpy as np

tmax = np.array([[-0.5, 6.7], [22.2, 17.8], [1.1, 2.8]])
print(tmax[3, 0])
`,
        error: "IndexError",
        output: "",
        note: "`IndexError: index 3 is out of bounds for axis 0 with size 3`. Axis 0 is the rows; there are three, numbered 0 to 2.",
      },
      {
        kind: "text",
        md: "A comparison on an array compares every value and gives back an array of `True`/`False`, the same length. That **mask** goes inside the brackets: `values[mask]` keeps the values where the mask is True, in order. The mask can come from a different array of the same length, which is how you ask *on which dates was it below freezing?* Because True counts as 1, `mask.sum()` counts the matches.",
      },
      {
        kind: "example",
        title: "Days that stayed below freezing",
        code: src`
import numpy as np

dates = np.array(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04",
                  "2024-01-05", "2024-01-06", "2024-01-07"])
tmax = np.array([1.1, 2.8, -1.0, -1.0, 1.1, -0.5, -4.9])  # Sioux Falls
freezing = tmax < 0
print(freezing)
print(dates[freezing])
print(freezing.sum(), "of", tmax.size, "days stayed below 0 C")
`,
        output: "[False False  True  True False  True  True]\n['2024-01-03' '2024-01-04' '2024-01-06' '2024-01-07']\n4 of 7 days stayed below 0 C\n",
        note: "The mask was built from `tmax` but used on `dates`. That only works because position 3 in one array is the same day as position 3 in the other.",
      },
      {
        kind: "text",
        md: "**Views and copies.** A slice such as `tmax[:3]` does not copy anything: it is a **view**, a window onto the same memory. Changing a value through the view changes the original, which is fast but surprising. A mask always builds a new array. When you want to change values without touching the original, call `copy()` first.\n\n**When to use it:** a position when you know where the value is, a slice for a run of rows or columns, a mask when you know the rule but not the positions. **Mistakes to avoid:** forgetting the comma (`tmax[1][0]` works but `tmax[1, 0]` is the array way), editing a slice you meant to copy, and masking with an array of a different length.",
      },
    ],
    tryIt: {
      id: "try",
      title: "One day at every station",
      prompt: "`day_column` returns a whole row (one station). Change it to return one **column**: the given day's reading from every station, top to bottom.",
      spec: [
        ["Function", "`day_column(grid, day)`"],
        ["grid", "a list of rows, one per station, one value per day"],
        ["Returns", "a list with the `day` column of every row"],
        ["Example", "the 3 × 5 grid from the lesson with day 4 → `[1.7, 23.3, 1.1]`"],
      ],
      starter: src`
import numpy as np

def day_column(grid, day):
    readings = np.array(grid)
    return readings[day].tolist()

grid = [[-0.5, 6.7, 9.4, 7.2, 1.7], [22.2, 17.8, 21.7, 18.3, 23.3], [1.1, 2.8, -1.0, -1.0, 1.1]]
print(day_column(grid, 2))
`,
      answer: src`
import numpy as np

def day_column(grid, day):
    readings = np.array(grid)
    return readings[:, day].tolist()

grid = [[-0.5, 6.7, 9.4, 7.2, 1.7], [22.2, 17.8, 21.7, 18.3, 23.3], [1.1, 2.8, -1.0, -1.0, 1.1]]
print(day_column(grid, 2))
`,
      wrong: [
        {
          code: src`
import numpy as np

def day_column(grid, day):
    return np.array(grid)[:, day]
`,
          fails: ["returns"],
          why: "the column is right but it is returned as a NumPy array, not a list",
        },
      ],
      hints: ["Inside the brackets, the first position picks rows and the second picks columns.", "You want every row, so the row position is a bare colon.", "Keep `tolist()` so the caller gets a plain list."],
      task: {
        packages: NP,
        checks: [
          fn("returns", "day_column", [
            example([grid3x5, 4], [1.7, 23.3, 1.1]),
            hiddenCase("a 2 × 2 grid", [[[1, 2], [3, 4]], 0], [1, 3]),
            hiddenCase("a single station", [[[5.5, 6.5, 7.5]], 2], [7.5]),
          ], { label: "day_column() returns one column from every row" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which days stayed below freezing?",
        prompt: "Write `freezing_days(dates, tmax)`: given matching lists of dates and daily highs, return the dates whose high was **below** 0, in order.",
        spec: [
          ["Function", "`freezing_days(dates, tmax)`"],
          ["dates, tmax", "two lists of the same length; position *i* in both is the same day"],
          ["Returns", "a list of date strings whose high is below 0 (0 itself is not below)"],
          ["Example", "Sioux Falls' week from the lesson → `['2024-01-03', '2024-01-04', '2024-01-06', '2024-01-07']`"],
        ],
        starter: src`
import numpy as np

def freezing_days(dates, tmax):
    return []

print(freezing_days(["2024-01-12", "2024-01-13", "2024-01-14"], [-5.5, -12.1, 0.0]))
`,
        answer: src`
import numpy as np

def freezing_days(dates, tmax):
    highs = np.array(tmax, dtype=float)
    return np.array(dates)[highs < 0].tolist()

print(freezing_days(["2024-01-12", "2024-01-13", "2024-01-14"], [-5.5, -12.1, 0.0]))
`,
        alternatives: [
          src`
import numpy as np

def freezing_days(dates, tmax):
    below = np.array(tmax) < 0
    return [d for d, cold in zip(dates, below) if cold]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def freezing_days(dates, tmax):
    highs = np.array(tmax, dtype=float)
    return np.array(dates)[highs <= 0].tolist()
`,
            fails: ["returns"],
            why: "`<= 0` keeps a day whose high was exactly 0, which did not stay below freezing",
          },
          {
            code: src`
import numpy as np

def freezing_days(dates, tmax):
    highs = np.array(tmax, dtype=float)
    return highs[highs < 0].tolist()
`,
            fails: ["returns"],
            why: "the mask is applied to the temperatures, so it returns the readings instead of the dates",
          },
        ],
        hints: [
          "Build the mask from the temperatures, then use it on the other array.",
          "Both lists need to become arrays: one for the comparison, one to be masked.",
          "A masked array is still an array; the caller wants a list.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "freezing_days", [
              example([week, siouxTmax], ["2024-01-03", "2024-01-04", "2024-01-06", "2024-01-07"]),
              example([week.slice(0, 5), [22.2, 17.8, 21.7, 18.3, 23.3]], []),
              example([["2024-01-12", "2024-01-13", "2024-01-14"], [-5.5, -12.1, 0.0]], ["2024-01-12", "2024-01-13"]),
              hiddenCase("a high of exactly 0", [["2024-02-01", "2024-02-02"], [0, 0.4]], []),
              hiddenCase("every day below freezing", [["2024-01-13", "2024-01-14"], [-12.1, -14.3]], ["2024-01-13", "2024-01-14"]),
              hiddenCase("empty lists", [[], []], []),
            ], { label: "freezing_days() returns the dates whose high was below 0" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Cap outliers without touching the original",
        prompt: "A chart of daily snowfall is flattened by one huge storm. Write `cap_readings(readings, limit)`: it receives a NumPy array and returns **two** things: a new array where every value above `limit` is replaced by `limit`, and how many values were capped. The array it was given must not change, because other code still needs the real readings.",
        spec: [
          ["Function", "`cap_readings(readings, limit)`"],
          ["readings", "a 1-D NumPy array of floats"],
          ["Returns", "a tuple `(capped, count)`: a new array, and the number of values that were above the limit"],
          ["Rules", "a value equal to the limit is not capped; `readings` keeps its original values"],
          ["Example", "`np.array([0.0, 13.0, 267.0, 30.0])` with limit 100 → `(array([0., 13., 100., 30.]), 1)`"],
        ],
        starter: src`
import numpy as np

def cap_readings(readings, limit):
    return readings, 0

snow = np.array([0.0, 13.0, 267.0, 30.0])
print(cap_readings(snow, 100.0))
print(snow)
`,
        answer: src`
import numpy as np

def cap_readings(readings, limit):
    capped = readings.copy()
    too_big = capped > limit
    capped[too_big] = limit
    return capped, int(too_big.sum())

snow = np.array([0.0, 13.0, 267.0, 30.0])
print(cap_readings(snow, 100.0))
print(snow)
`,
        alternatives: [
          src`
import numpy as np

def cap_readings(readings, limit):
    count = int((readings > limit).sum())
    return np.minimum(readings, limit), count
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def cap_readings(readings, limit):
    too_big = readings > limit
    readings[too_big] = limit
    return readings, int(too_big.sum())
`,
            fails: ["keeps-input"],
            why: "the values are right, but the caller's array is overwritten",
          },
          {
            code: src`
import numpy as np

def cap_readings(readings, limit):
    capped = readings[:]
    too_big = capped > limit
    capped[too_big] = limit
    return capped, int(too_big.sum())
`,
            fails: ["keeps-input"],
            why: "`readings[:]` is a view of the same memory, not a copy, so the original changes too",
          },
          {
            code: src`
import numpy as np

def cap_readings(readings, limit):
    capped = readings.copy()
    too_big = capped >= limit
    capped[too_big] = limit
    return capped, int(too_big.sum())
`,
            fails: ["returns-hidden"],
            why: "a value exactly at the limit is counted as capped",
          },
        ],
        hints: [
          "Work on a separate array, not on the one you were given.",
          "A slice is a view; a different method makes a real copy.",
          "A mask can be used on the left of `=` to replace every matching value at once, and its `sum()` counts them.",
        ],
        task: {
          packages: NP,
          checks: [
            {
              kind: "expr",
              id: "returns",
              label: "cap_readings() caps values above the limit and counts them",
              show: "cap_readings(np.array([0.0, 13.0, 267.0, 30.0]), 100.0)",
              expr: "import numpy as _np\n_r, _n = cap_readings(_np.array([0.0, 13.0, 267.0, 30.0]), 100.0)\nresult = [_r.tolist(), int(_n)]",
              expected: py.list(py.list(py.float(0), py.float(13), py.float(100), py.float(30)), py.int(1)),
            },
            {
              kind: "expr",
              id: "returns-hidden",
              label: "Works for other readings (a value equal to the limit, several values above it, nothing above it)",
              hidden: true,
              expr: "import numpy as _np\nresult = []\nfor _a, _lim in [([50.0, 120.0, 50.0], 50.0), ([267.0, 230.0, 200.0, 5.0], 150.0), ([1.5, 2.5], 10.0)]:\n    _r, _n = cap_readings(_np.array(_a), _lim)\n    result.append([_r.tolist(), int(_n)])",
              expected: py.list(
                py.list(py.list(py.float(50), py.float(50), py.float(50)), py.int(1)),
                py.list(py.list(py.float(150), py.float(150), py.float(150), py.float(5)), py.int(3)),
                py.list(py.list(py.float(1.5), py.float(2.5)), py.int(0)),
              ),
            },
            {
              kind: "expr",
              id: "keeps-input",
              label: "cap_readings() leaves the array it was given unchanged",
              expr: "import numpy as _np\n_a = _np.array([0.0, 13.0, 267.0, 30.0])\ncap_readings(_a, 100.0)\nresult = _a.tolist()",
              expected: py.list(py.float(0), py.float(13), py.float(267), py.float(30)),
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
import numpy as np

tmax = np.array([-0.5, 6.7, 9.4, 7.2])
first_two = tmax[:2]
first_two[0] = 0.0
print(tmax[0], first_two[0])
`,
        choices: ["0.0 0.0", "-0.5 0.0", "-0.5 -0.5", "0.0 -0.5"],
        answer: 0,
        why: "`tmax[:2]` is a view of the same memory, so storing 0.0 through it changes `tmax` as well. `tmax[:2].copy()` would have kept them apart.",
      },
      {
        id: "q2",
        prompt: "A common mistake: masking one array with a mask from an array of a different length. What does this print?",
        program: src`
import numpy as np

rain = np.array([0.0, 14.7, 2.3])
days = np.array(["Mon", "Tue", "Wed", "Thu"])
try:
    print(days[rain > 1])
except IndexError:
    print("IndexError")
`,
        choices: ["IndexError", "['Tue' 'Wed']", "['Tue' 'Wed' 'Thu']", "[]"],
        answer: 0,
        why: "The mask has 3 values and `days` has 4: NumPy refuses (`boolean index did not match indexed array`) instead of guessing which days line up.",
      },
      {
        id: "q3",
        prompt: "`grid` has one row per station and one column per day. Which expression gives every station's reading on the last day?",
        choices: ["`grid[:, -1]`", "`grid[-1]`", "`grid[-1, :]`", "`grid[:-1]`"],
        answer: 0,
        why: "All rows (`:`) and the last column (`-1`). `grid[-1]` and `grid[-1, :]` are the last station's whole row; `grid[:-1]` is every row except the last.",
      },
    ],
    review: [
      "`a[row, col]` picks a cell; `:` means every row or column; slices stop before their end.",
      "A comparison makes a True/False mask; `values[mask]` keeps the matches and `mask.sum()` counts them.",
      "Slices are views of the original; masks build new arrays; `copy()` makes a separate array to change.",
      "Next: arithmetic between arrays of different shapes, and the rule that decides when it works.",
    ],
  },

  // ------------------------------------------------------------------ PY-L41-03 broadcasting
  {
    id: "PY-L41-03",
    version: 2,
    slug: "broadcasting",
    title: "Broadcasting",
    lede: "Arithmetic on arrays works value by value. When the shapes differ, NumPy stretches the smaller one across the larger, if the broadcasting rule allows it.",
    focus: "Combine arrays of different shapes with arithmetic, using the broadcasting rule to predict the result or the error.",
    minutes: 18,
    objectives: [
      "Do element-wise arithmetic between an array and a number, and between two arrays of one shape",
      "Apply the broadcasting rule: compare shapes from the right; each pair must be equal or contain a 1",
      "Turn a 1-D array into a column with `[:, None]` to combine it with every row",
    ],
    requires: ["arithmetic", "assignment", "comment", "comparison", "conversion", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "np-array", "np-dtype", "np-index", "precedence", "print-call", "print-several", "raise-stmt", "reassignment", "set-literal", "string-index", "string-slice", "top-level-indent"],
    teaches: ["np-broadcast"],
    packages: NP,
    blocks: [
      {
        kind: "text",
        md: "`tmax * 9 / 5 + 32` converts a whole week of Celsius readings to Fahrenheit in one expression: the numbers 9, 5 and 32 are used with every value. Two arrays of the **same shape** combine position by position, so `tmax - tmin` is each day's temperature range. No loop, and no index to get wrong.",
      },
      {
        kind: "example",
        title: "Fahrenheit and the daily range",
        code: src`
import numpy as np

tmax = np.array([-0.5, 6.7, 9.4, 7.2, 1.7])   # Wichita, 1 to 5 January 2024
tmin = np.array([-5.5, -4.9, -4.9, -2.1, 0.0])
print(tmax * 9 / 5 + 32)
print(tmax - tmin)
`,
        output: "[31.1  44.06 48.92 44.96 35.06]\n[ 5.  11.6 14.3  9.3  1.7]\n",
        note: "A single number is stretched over every value. Two 5-value arrays are combined first with first, second with second.",
      },
      {
        kind: "text",
        md: "This stretching is called **broadcasting**, and it also works between arrays of different shapes. The rule: line the shapes up from the right; each pair of sizes must be **equal**, or one of them must be **1** (a size-1 dimension is stretched). Order totals of shape `(4,)` and three exchange rates of shape `(3,)` fail the rule: 4 and 3 are neither equal nor 1.",
      },
      {
        kind: "error-example",
        title: "Four totals, three rates",
        code: src`
import numpy as np

totals = np.array([35.84, 91.47, 55.72, 246.6])
rates = np.array([1.0, 0.92, 0.79])
print(totals.shape, rates.shape)
print(totals * rates)
`,
        error: "ValueError",
        output: "(4,) (3,)\n",
        note: "`ValueError: operands could not be broadcast together with shapes (4,) (3,)`. NumPy refuses rather than pairing values that don't belong together.",
      },
      {
        kind: "example",
        title: "Every total in three currencies",
        code: src`
import numpy as np

totals = np.array([35.84, 91.47, 55.72, 246.6])   # Runtime Market orders, in USD
rates = np.array([1.0, 0.92, 0.79])                # example rates: USD, EUR, GBP per dollar
column = totals[:, None]
print(column.shape, rates.shape)
table = column * rates
print(table.shape)
print(table.round(2))
`,
        output: "(4, 1) (3,)\n(4, 3)\n[[ 35.84  32.97  28.31]\n [ 91.47  84.15  72.26]\n [ 55.72  51.26  44.02]\n [246.6  226.87 194.81]]\n",
        note: "`totals[:, None]` keeps all the values and adds a dimension of size 1: four rows, one column. Lined up from the right, `(4, 1)` and `(3,)` give pairs 1/3 (stretch the 1) and 4/nothing, so the result is 4 × 3: one row per order, one column per currency. `round(2)` on an array rounds every value.",
      },
      {
        kind: "text",
        md: "**When to use it:** a constant for every value (unit conversion, a discount), a row of per-column values for every row, or a column of per-row values for every column. **Mistakes to avoid:** a mismatch you didn't expect usually raises a ValueError, which is good. The dangerous case is a mismatch that **does** broadcast: a list of one discount rate silently applies to every line, and a 3 × 3 grid minus three per-row values subtracts them per column unless you make them a column with `[:, None]`. Check lengths yourself when the data must line up.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The middle of the day's range",
      prompt: "`daily_midpoint` returns each day's range (high minus low). Change the calculation so it returns the midpoint between the high and the low instead.",
      spec: [
        ["Function", "`daily_midpoint(tmax, tmin)`"],
        ["Returns", "a list with (high + low) / 2 for each day"],
        ["Example", "`daily_midpoint([-0.5, 6.7], [-5.5, -4.9])` → `[-3.0, 0.9]`"],
      ],
      starter: src`
import numpy as np

def daily_midpoint(tmax, tmin):
    highs = np.array(tmax, dtype=float)
    lows = np.array(tmin, dtype=float)
    return (highs - lows).tolist()

print(daily_midpoint([-0.5, 6.7], [-5.5, -4.9]))
`,
      answer: src`
import numpy as np

def daily_midpoint(tmax, tmin):
    highs = np.array(tmax, dtype=float)
    lows = np.array(tmin, dtype=float)
    return ((highs + lows) / 2).tolist()

print(daily_midpoint([-0.5, 6.7], [-5.5, -4.9]))
`,
      wrong: [
        {
          code: src`
import numpy as np

def daily_midpoint(tmax, tmin):
    highs = np.array(tmax, dtype=float)
    lows = np.array(tmin, dtype=float)
    return (highs + lows / 2).tolist()
`,
          fails: ["returns"],
          why: "without parentheses only the low is halved",
        },
      ],
      hints: ["The arrays already line up day by day.", "Add instead of subtracting, then divide by 2.", "Mind the order of operations: the sum needs parentheses."],
      task: {
        packages: NP,
        checks: [
          fn("returns", "daily_midpoint", [
            example([[-0.5, 6.7], [-5.5, -4.9]], [-3.0, 0.9]),
            hiddenCase("a whole week", [[22.2, 17.8, 21.7], [5.6, 9.4, 8.9]], [13.9, 13.6, 15.3]),
            hiddenCase("a single day", [[10], [0]], [5]),
          ], { label: "daily_midpoint() returns (high + low) / 2 for each day", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Line totals, with lengths checked",
        prompt: "An order's lines come as three lists: quantities, unit prices and discount rates. Write `line_totals(quantities, unit_prices, discount_rates)`: return each line's total, quantity × price × (1 − discount). The three lists must have one value per line; if their lengths differ, raise `ValueError`, even when NumPy could broadcast them.",
        spec: [
          ["Function", "`line_totals(quantities, unit_prices, discount_rates)`"],
          ["Returns", "a list of floats, one per line; `[]` for no lines"],
          ["Raises", "`ValueError` when the three lists don't all have the same length"],
          ["Example", "`line_totals([1, 1, 2], [31, 48, 16.99], [0.1, 0, 0.1])` → `[27.9, 48.0, 30.582]`"],
        ],
        starter: src`
import numpy as np

def line_totals(quantities, unit_prices, discount_rates):
    return []

print(line_totals([1, 1, 2], [31, 48, 16.99], [0.1, 0, 0.1]))
`,
        answer: src`
import numpy as np

def line_totals(quantities, unit_prices, discount_rates):
    if not (len(quantities) == len(unit_prices) == len(discount_rates)):
        raise ValueError("each list needs one value per line")
    q = np.array(quantities, dtype=float)
    p = np.array(unit_prices, dtype=float)
    d = np.array(discount_rates, dtype=float)
    return (q * p * (1 - d)).tolist()

print(line_totals([1, 1, 2], [31, 48, 16.99], [0.1, 0, 0.1]))
`,
        alternatives: [
          src`
import numpy as np

def line_totals(quantities, unit_prices, discount_rates):
    lengths = {len(quantities), len(unit_prices), len(discount_rates)}
    if len(lengths) != 1:
        raise ValueError("lengths differ")
    totals = np.array(quantities) * np.array(unit_prices) * (1 - np.array(discount_rates))
    return [float(t) for t in totals]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def line_totals(quantities, unit_prices, discount_rates):
    q = np.array(quantities, dtype=float)
    p = np.array(unit_prices, dtype=float)
    d = np.array(discount_rates, dtype=float)
    return (q * p * (1 - d)).tolist()
`,
            fails: ["returns"],
            why: "a one-value discount list broadcasts over every line instead of being rejected",
          },
          {
            code: src`
import numpy as np

def line_totals(quantities, unit_prices, discount_rates):
    if not (len(quantities) == len(unit_prices) == len(discount_rates)):
        raise ValueError("each list needs one value per line")
    q = np.array(quantities, dtype=float)
    p = np.array(unit_prices, dtype=float)
    d = np.array(discount_rates, dtype=float)
    return (q * p * d).tolist()
`,
            fails: ["returns"],
            why: "multiplying by the rate gives the discount itself, not the price after it",
          },
        ],
        hints: [
          "Do the length check yourself before any arithmetic: broadcasting accepts a length of 1.",
          "Three same-length arrays combine position by position in one expression.",
          "The price after a discount keeps `1 - rate` of it.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "line_totals", [
              example([[1, 1, 2], [31, 48, 16.99], [0.1, 0, 0.1]], [27.9, 48.0, 30.582]),
              example([[], [], []], []),
              raisesCase([[1, 2], [31, 48], [0.1, 0, 0.1]], "ValueError"),
              hiddenCase("one line", [[3], [12.5], [0.2]], [30.0]),
              hiddenCase("no discounts", [[2, 5], [7.49, 3.99], [0, 0]], [14.98, 19.95]),
              raisesCase([[1, 1, 2], [31, 48, 16.99], [0.1]], "ValueError", { label: "one discount rate for three lines" }),
              raisesCase([[1], [31, 48], [0, 0]], "ValueError", { label: "one quantity for two lines" }),
            ], { label: "line_totals() multiplies line by line and rejects mismatched lists", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "How far from normal was each day?",
        prompt: "Each station has its own typical January high, its **baseline**. Write `anomalies(grid, baselines)`: `grid` has one row per station and one column per day; `baselines` has one value per station. Return the grid with each station's baseline subtracted from **its own row**.",
        spec: [
          ["Function", "`anomalies(grid, baselines)`"],
          ["grid", "a list of rows (stations) of daily highs"],
          ["baselines", "a list with one value per station (row)"],
          ["Returns", "a list of rows, same shape as `grid`"],
          ["Example", "`anomalies([[1.7, 9.4], [23.3, 17.8]], [7.0, 21.0])` → `[[-5.3, 2.4], [2.3, -3.2]]`"],
        ],
        starter: src`
import numpy as np

def anomalies(grid, baselines):
    return grid

print(anomalies([[1.7, 9.4, 7.2], [23.3, 17.8, 21.7]], [7.0, 21.0]))
`,
        answer: src`
import numpy as np

def anomalies(grid, baselines):
    readings = np.array(grid, dtype=float)
    base = np.array(baselines, dtype=float)
    return (readings - base[:, None]).tolist()

print(anomalies([[1.7, 9.4, 7.2], [23.3, 17.8, 21.7]], [7.0, 21.0]))
`,
        alternatives: [
          src`
import numpy as np

def anomalies(grid, baselines):
    readings = np.array(grid, dtype=float)
    base = np.array(baselines, dtype=float).reshape(len(baselines), 1)
    return (readings - base).tolist()
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def anomalies(grid, baselines):
    readings = np.array(grid, dtype=float)
    base = np.array(baselines, dtype=float)
    return (readings - base).tolist()
`,
            fails: ["returns"],
            why: "a 1-D baseline lines up with the columns: it fails for most grids and gives wrong numbers for square ones",
          },
          {
            code: src`
import numpy as np

def anomalies(grid, baselines):
    readings = np.array(grid, dtype=float)
    base = np.array(baselines, dtype=float)
    return (readings - base.mean()).tolist()
`,
            fails: ["returns"],
            why: "every station is compared with one shared average instead of its own baseline",
          },
        ],
        hints: [
          "Write the two shapes down and line them up from the right: which dimension does the baseline match?",
          "The baseline must vary down the rows and stay the same across a row.",
          "Give the baseline a second dimension of size 1 so it becomes a column.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "anomalies", [
              example([[[1.7, 9.4], [23.3, 17.8]], [7.0, 21.0]], [[-5.3, 2.4], [2.3, -3.2]]),
              example([[[1.7, 9.4, 7.2], [23.3, 17.8, 21.7]], [7.0, 21.0]], [[-5.3, 2.4, 0.2], [2.3, -3.2, 0.7]]),
              example([[[1.1, 2.8, -1.0]], [0.5]], [[0.6, 2.3, -1.5]]),
              hiddenCase("a square grid, where a column-wise mistake still runs", [[[10, 20, 30], [10, 20, 30], [10, 20, 30]], [1, 2, 3]], [[9, 19, 29], [8, 18, 28], [7, 17, 27]]),
              hiddenCase("three stations, one day", [[[5], [6], [7]], [5, 5, 5]], [[0], [1], [2]]),
              hiddenCase("negative baselines", [[[-12.1, -14.3], [-0.5, -4.9]], [-10, -2]], [[-2.1, -4.3], [1.5, -2.9]]),
            ], { label: "anomalies() subtracts each station's baseline from its own row", compare: loose }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

column = np.array([[1], [2]])
row = np.array([10, 20, 30])
print((column + row).tolist())
`,
        choices: ["[[11, 21, 31], [12, 22, 32]]", "[[11, 12], [21, 22], [31, 32]]", "[11, 22, 32]", "an error: the shapes differ"],
        answer: 0,
        why: "Shapes (2, 1) and (3,) line up as 1/3 and 2/nothing, giving 2 × 3: each row of the column is added to the whole row of three.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a per-row value used without making it a column. What does this print?",
        program: src`
import numpy as np

grid = np.array([[10, 20], [30, 40]])
per_row = np.array([1, 2])
print((grid - per_row).tolist())
`,
        choices: ["[[9, 18], [29, 38]]", "[[9, 19], [28, 38]]", "an error: the shapes differ", "[[9, 18], [28, 38]]"],
        answer: 0,
        why: "No error: a (2,) array lines up with the **columns**, so 1 and 2 are subtracted along each row. Row-wise subtraction needs `per_row[:, None]`, which gives `[[9, 19], [28, 38]]`.",
      },
      {
        id: "q3",
        prompt: "Which pair of shapes can NOT be broadcast together?",
        choices: ["(5, 3) and (5,)", "(5, 3) and (3,)", "(5, 3) and (5, 1)", "(5, 3) and (1, 3)"],
        answer: 0,
        why: "From the right, 3 and 5 are neither equal nor 1. The others pair 3 with 3, 1 with 3, or 1 with 5.",
      },
    ],
    review: [
      "Arithmetic on arrays is element by element; a single number is used with every value.",
      "Broadcasting rule: line shapes up from the right; sizes must match or be 1.",
      "`values[:, None]` makes a column so per-row values apply across each row.",
      "Next: replace if/else loops with whole-array rules: `np.where`, combined masks and running totals.",
    ],
  },

  // ------------------------------------------------------------------ PY-L41-04 vectorization
  {
    id: "PY-L41-04",
    version: 2,
    slug: "vectorized-rules",
    title: "Vectorised rules instead of loops",
    lede: "A loop with an if inside, run over every value, becomes one array expression: a mask for the test, np.where or np.select for the choice, and np.diff or np.cumsum for neighbours and running totals.",
    focus: "Write if/else rules over whole arrays with masks, np.where and np.select, combining tests with & and |.",
    minutes: 20,
    objectives: [
      "Replace a loop that chooses a value per item with `np.where(test, if_true, if_false)` or `np.select`",
      "Combine masks with `&`, `|` and `~`, with parentheses around each comparison",
      "Use `np.diff`, `np.cumsum`, `np.abs` and `np.flatnonzero` for changes, running totals and positions",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "comment", "comment-out", "comparison", "conversion", "dict-lookup", "except-type", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "np-array", "np-dtype", "np-reduce", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-index", "string-slice", "top-level-indent", "try-except", "unquoted-name"],
    teaches: ["np-where"],
    packages: NP,
    blocks: [
      {
        kind: "text",
        md: "Many rules have the shape *for each value, if it passes a test, use this, otherwise that*. In plain Python that is a loop with an if. With arrays, the test is a mask and `np.where(mask, a, b)` picks from `a` where the mask is True and from `b` where it is False, for every position at once. The work happens in compiled code, which is why vectorised code is usually many times faster than a Python loop over the same numbers, and shorter to read.\n\nTwo tests combine with `&` (and), `|` (or) and `~` (not). These operators bind more tightly than `<`, so **each comparison needs its own parentheses**.",
      },
      {
        kind: "example",
        title: "Ice days at Sioux Falls",
        code: src`
import numpy as np

tmax = np.array([1.1, 2.8, -1.0, -1.0, 1.1, -0.5, -4.9])    # 1 to 7 January 2024
tmin = np.array([-7.1, -5.5, -6.6, -4.9, -1.0, -6.6, -11.0])
print(np.where(tmax < 0, "ice day", "thaw"))
print((tmax < 0).sum(), "ice days")
hard_freeze = (tmax < 0) & (tmin < -5)
print(np.flatnonzero(hard_freeze))
print(np.diff(tmax))
`,
        output: "['thaw' 'thaw' 'ice day' 'ice day' 'thaw' 'ice day' 'ice day']\n4 ice days\n[2 5 6]\n[ 1.7 -3.8  0.   2.1 -1.6 -4.4]\n",
        note: "`np.flatnonzero` gives the positions where a mask is True. `np.diff` subtracts each value from the next, so seven readings give six day-to-day changes.",
      },
      {
        kind: "error-example",
        title: "`and` between two arrays",
        code: src`
import numpy as np

tmax = np.array([1.1, -1.0, -4.9])
tmin = np.array([-7.1, -6.6, -11.0])
hard_freeze = tmax < 0 and tmin < -5
`,
        error: "ValueError",
        output: "",
        note: "`and` needs one True or False, but `tmax < 0` is three of them: `ValueError: The truth value of an array with more than one element is ambiguous`. Use `&` with parentheses: `(tmax < 0) & (tmin < -5)`.",
      },
      {
        kind: "text",
        md: "With more than two outcomes, `np.select(conditions, choices, default=…)` checks the conditions in order and uses the first one that is true at each position, like an if/elif chain. `np.cumsum` builds running totals, and `np.abs` gives sizes without signs.",
      },
      {
        kind: "example",
        title: "Taxi trips: payment type, tips and long card rides",
        code: src`
import numpy as np

# Five NYC yellow taxi trips, 15 January 2025 (TLC trip records)
distance = np.array([9.2, 0.9, 3.17, 4.86, 0.5])     # miles
fare = np.array([40.8, 7.2, 17.2, 22.06, 5.1])        # dollars
tip = np.array([10.7, 2.55, 0.0, 0.0, 1.0])
payment = np.array([1, 1, 0, 0, 1])                   # 1 card, 2 cash, 0 flex fare

kind = np.select([payment == 1, payment == 2], ["card", "cash"], default="other")
print(kind)
tip_pct = np.where(payment == 1, tip / fare * 100, 0.0)
print(tip_pct.round(1))
print(np.cumsum(fare).round(2))
long_card = (payment == 1) & (distance > 5)
print(fare[long_card].sum())
`,
        output: "['card' 'card' 'other' 'other' 'card']\n[26.2 35.4  0.   0.  19.6]\n[40.8  48.   65.2  87.26 92.36]\n40.8\n",
        note: "Tip percentages only make sense where tips are captured in the data, which for TLC trips means card payments, so the other trips get 0.0. The running total's last value is the whole night's fares.",
      },
      {
        kind: "text",
        md: "**When to use it:** any per-value rule over many numbers: labels, thresholds, conditional formulas, changes between neighbours. **Mistakes to avoid:** `and`/`or` on arrays (ValueError); missing parentheses around comparisons joined with `&`; forgetting that `np.where` evaluates **both** branches for every value, so a division in the unused branch still runs (guard it or divide only the masked values); and conditions in `np.select` in the wrong order.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Heating degrees never go negative",
      prompt: "Heating degrees measure how much a building needs heating: 18 minus the day's average temperature, but **0** on days warmer than 18 °C. `heating_degrees` subtracts for every day, so warm days come out negative. Use `np.where` so they become 0.",
      spec: [
        ["Function", "`heating_degrees(tavg)`"],
        ["Returns", "a list: `18 - t` where `t` is below 18, otherwise `0`"],
        ["Example", "`heating_degrees([-3.0, 13.9, 21.5])` → `[21.0, 4.1, 0.0]`"],
      ],
      starter: src`
import numpy as np

def heating_degrees(tavg):
    t = np.array(tavg, dtype=float)
    return (18 - t).tolist()

print(heating_degrees([-3.0, 13.9, 21.5]))
`,
      answer: src`
import numpy as np

def heating_degrees(tavg):
    t = np.array(tavg, dtype=float)
    return np.where(t < 18, 18 - t, 0.0).tolist()

print(heating_degrees([-3.0, 13.9, 21.5]))
`,
      alternatives: [
        src`
import numpy as np

def heating_degrees(tavg):
    t = np.array(tavg, dtype=float)
    return np.clip(18 - t, 0, None).tolist()
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def heating_degrees(tavg):
    t = np.array(tavg, dtype=float)
    return np.where(t < 18, 18 - t, t).tolist()
`,
          fails: ["returns"],
          why: "warm days keep their temperature instead of becoming 0",
        },
      ],
      hints: ["The rule has a test and two outcomes.", "`np.where` takes the test, the value when true and the value when false.", "Warm days get 0.0; the others keep `18 - t`."],
      task: {
        packages: NP,
        checks: [
          fn("returns", "heating_degrees", [
            example([[-3.0, 13.9, 21.5]], [21.0, 4.1, 0.0]),
            hiddenCase("exactly 18 degrees", [[18]], [0]),
            hiddenCase("a cold week", [[-0.5, -12.1]], [18.5, 30.1]),
          ], { label: "heating_degrees() is 18 - t, but never below 0", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Big day-to-day swings",
        prompt: "A forecaster wants the days when the high changed sharply from the day before. Write `big_swings(tmax, limit)`: return the day numbers (the first day is day 1) whose high differs from the previous day's by **at least** `limit` degrees, warmer or colder.",
        spec: [
          ["Function", "`big_swings(tmax, limit)`"],
          ["tmax", "a list of daily highs, day 1 first"],
          ["Returns", "a list of day numbers (whole numbers), in order; a change between day 3 and day 4 is reported as 4"],
          ["Example", "Wichita, 10 to 16 January: `[6.1, 9.4, -5.5, -12.1, -14.3, -13.8, -3.8]` with limit 10 → `[3, 7]`"],
        ],
        starter: src`
import numpy as np

def big_swings(tmax, limit):
    return []

print(big_swings([6.1, 9.4, -5.5, -12.1, -14.3, -13.8, -3.8], 10))
`,
        answer: src`
import numpy as np

def big_swings(tmax, limit):
    highs = np.array(tmax, dtype=float)
    change = np.abs(np.diff(highs))
    return (np.flatnonzero(change >= limit) + 2).tolist()

print(big_swings([6.1, 9.4, -5.5, -12.1, -14.3, -13.8, -3.8], 10))
`,
        alternatives: [
          src`
import numpy as np

def big_swings(tmax, limit):
    highs = np.array(tmax, dtype=float)
    days = np.arange(2, len(tmax) + 1)
    change = highs[1:] - highs[:-1]
    sharp = (change >= limit) | (change <= -limit)
    return [int(d) for d in days[sharp]]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def big_swings(tmax, limit):
    highs = np.array(tmax, dtype=float)
    change = np.diff(highs)
    return (np.flatnonzero(change >= limit) + 2).tolist()
`,
            fails: ["returns"],
            why: "without the absolute value a sharp drop is never reported",
          },
          {
            code: src`
import numpy as np

def big_swings(tmax, limit):
    highs = np.array(tmax, dtype=float)
    change = np.abs(np.diff(highs))
    return (np.flatnonzero(change >= limit) + 1).tolist()
`,
            fails: ["returns"],
            why: "it reports the day before the change instead of the day it happened",
          },
          {
            code: src`
import numpy as np

def big_swings(tmax, limit):
    highs = np.array(tmax, dtype=float)
    change = np.abs(np.diff(highs))
    return (np.flatnonzero(change > limit) + 2).tolist()
`,
            fails: ["returns"],
            why: "`>` misses a change of exactly the limit",
          },
        ],
        hints: [
          "One function gives every day-to-day change at once.",
          "Warmer or colder: compare the size of the change, without its sign.",
          "Positions in the changes array start at 0 and describe the change *into* the next day; convert them to day numbers.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "big_swings", [
              example([[6.1, 9.4, -5.5, -12.1, -14.3, -13.8, -3.8], 10], [3, 7]),
              example([wichitaTmax, 5], [2, 5]),
              example([[22.2], 1], []),
              hiddenCase("a change of exactly the limit", [[0, 4, 0], 4], [2, 3]),
              hiddenCase("only sharp drops", [[20, 5, -10], 10], [2, 3]),
              hiddenCase("no swing reaches the limit", [[1.1, 2.8, -1.0, -1.0], 8], []),
              hiddenCase("no readings at all", [[], 3], []),
            ], { label: "big_swings() reports the day of each change of at least the limit" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Flag suspicious taxi trips",
        prompt: "Before analysing fares, a data team labels each trip. A trip with zero distance is `\"zero distance\"`; otherwise a fare below $3.00 (the NYC minimum) is `\"fare too low\"`; everything else is `\"ok\"`. Write `flag_trips(distance, fare)`: return one label per trip. When both problems apply, the first rule wins.",
        spec: [
          ["Function", "`flag_trips(distance, fare)`"],
          ["distance, fare", "two lists of the same length"],
          ["Returns", "a list of labels: `\"zero distance\"`, `\"fare too low\"` or `\"ok\"`"],
          ["Example", "`flag_trips([9.2, 0.0, 0.5], [40.8, 3.0, 2.5])` → `['ok', 'zero distance', 'fare too low']`"],
        ],
        starter: src`
import numpy as np

def flag_trips(distance, fare):
    return ["ok"] * len(distance)

print(flag_trips([9.2, 0.0, 0.5], [40.8, 3.0, 2.5]))
`,
        answer: src`
import numpy as np

def flag_trips(distance, fare):
    miles = np.array(distance, dtype=float)
    dollars = np.array(fare, dtype=float)
    labels = np.select([miles == 0, dollars < 3], ["zero distance", "fare too low"], default="ok")
    return labels.tolist()

print(flag_trips([9.2, 0.0, 0.5], [40.8, 3.0, 2.5]))
`,
        alternatives: [
          src`
import numpy as np

def flag_trips(distance, fare):
    miles = np.array(distance, dtype=float)
    dollars = np.array(fare, dtype=float)
    labels = np.where(dollars < 3, "fare too low", "ok")
    labels = np.where(miles == 0, "zero distance", labels)
    return [str(label) for label in labels]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def flag_trips(distance, fare):
    miles = np.array(distance, dtype=float)
    dollars = np.array(fare, dtype=float)
    labels = np.select([dollars < 3, miles == 0], ["fare too low", "zero distance"], default="ok")
    return labels.tolist()
`,
            fails: ["returns"],
            why: "the conditions are in the wrong order, so a zero-distance trip with a tiny fare is labelled `fare too low`",
          },
          {
            code: src`
import numpy as np

def flag_trips(distance, fare):
    miles = np.array(distance, dtype=float)
    dollars = np.array(fare, dtype=float)
    labels = np.select([miles == 0, dollars <= 3], ["zero distance", "fare too low"], default="ok")
    return labels.tolist()
`,
            fails: ["returns"],
            why: "a fare of exactly $3.00 meets the minimum, but `<= 3` flags it",
          },
        ],
        hints: [
          "Three outcomes, checked in a fixed order: an if/elif/else, written for whole arrays.",
          "Make one mask per rule, from the matching array.",
          "Give `np.select` the conditions in the order they are checked, and `ok` as the default.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "flag_trips", [
              example([[9.2, 0.0, 0.5], [40.8, 3.0, 2.5]], ["ok", "zero distance", "fare too low"]),
              example([[0.9, 3.17, 4.86], [7.2, 17.2, 22.06]], ["ok", "ok", "ok"]),
              example([[], []], []),
              hiddenCase("zero distance and a fare below the minimum", [[0.0], [0.0]], ["zero distance"]),
              hiddenCase("a fare of exactly the minimum", [[0.3], [3.0]], ["ok"]),
              hiddenCase("every rule in one batch", [[1.2, 0.0, 2.0, 0.0], [2.99, 15.0, 3.5, 1.0]], ["fare too low", "zero distance", "ok", "zero distance"]),
            ], { label: "flag_trips() labels each trip, first rule first" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

rain = np.array([0.0, 11.4, 0.0, 27.2, 0.5])
wet = rain > 1
print(wet.sum(), np.cumsum(rain)[-1], np.where(wet, "wet", "dry")[3])
`,
        choices: ["2 39.1 wet", "3 39.1 wet", "2 27.2 wet", "2 39.1 dry"],
        answer: 0,
        why: "Two readings are above 1 (0.5 is not). The last running total is the whole sum, 39.1. Position 3 holds 27.2, which is wet.",
      },
      {
        id: "q2",
        prompt: "A common mistake: comparisons joined with `&` but no parentheses. What does this print?",
        program: src`
import numpy as np

tmax = np.array([1.1, -1.0, -4.9])
try:
    print(tmax > -2 & tmax < 0)
except TypeError:
    print("TypeError")
`,
        choices: ["TypeError", "[False  True False]", "[ True  True False]", "[False False  True]"],
        answer: 0,
        why: "`&` binds before `>` and `<`, so Python first computes `-2 & tmax`: a bitwise *and* between an integer and floats, which NumPy refuses with a TypeError. `(tmax > -2) & (tmax < 0)` gives `[False  True False]`.",
      },
      {
        id: "q3",
        prompt: "Which job does `np.select` do that `np.where` alone doesn't?",
        choices: ["Choose among more than two outcomes, using the first condition that is true", "Find the positions where a mask is True", "Add up values that pass a test", "Copy an array before changing it"],
        answer: 0,
        why: "`np.where` has one test and two outcomes; `np.select` is the if/elif/else form. Positions are `np.flatnonzero`, sums are `values[mask].sum()`.",
      },
    ],
    review: [
      "A per-value rule becomes a mask plus `np.where` (two outcomes) or `np.select` (an if/elif chain).",
      "Combine masks with `&`, `|`, `~`, and put each comparison in parentheses; `and`/`or` raise on arrays.",
      "`np.diff`, `np.cumsum`, `np.abs` and `np.flatnonzero` cover changes, running totals, sizes and positions.",
      "Next: statistics along one axis of a table, and readings with gaps.",
    ],
  },

  // ------------------------------------------------------------------ PY-L41-05 numerical statistics
  {
    id: "PY-L41-05",
    version: 2,
    slug: "array-statistics",
    title: "Statistics along an axis",
    lede: "The same statistic can summarise a whole table, each row, or each column. axis= decides which, and the nan- functions keep a missing reading from spoiling the answer.",
    focus: "Compute statistics per row or per column with axis=, find where an extreme is with argmax, and handle missing values with np.nan and the nan- functions.",
    minutes: 20,
    objectives: [
      "Use `axis=0` (down each column) and `axis=1` (across each row) with `mean`, `max`, `sum` and `std`",
      "Find the position of the largest value with `argmax`, and use it to look up a label",
      "Explain why one `nan` makes `mean` return nan, and use `np.nanmean`, `np.nanmedian` and `np.isnan`",
    ],
    requires: ["aggregate-call", "assignment", "bitwise", "comment", "comment-out", "comp-if", "comparison", "conversion", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "np-array", "np-dtype", "np-reduce", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-index", "top-level-indent"],
    teaches: ["np-stats"],
    packages: NP,
    blocks: [
      {
        kind: "text",
        md: "With one row per station and one column per day, *the average high* could mean three things: of everything, of each station (across its row), or of each day (down its column). `axis=` chooses. **`axis=1`** collapses the columns and leaves one result per row; **`axis=0`** collapses the rows and leaves one result per column. `argmax()` returns the **position** of the largest value instead of the value, which is how you find *which* station or *which* day.",
      },
      {
        kind: "example",
        title: "Which station was warmest?",
        code: src`
import numpy as np

stations = ["Wichita", "Orlando", "Sioux Falls"]
tmax = np.array([
    [-0.5, 6.7, 9.4, 7.2, 1.7],
    [22.2, 17.8, 21.7, 18.3, 23.3],
    [1.1, 2.8, -1.0, -1.0, 1.1],
])
station_means = tmax.mean(axis=1)
print(station_means.round(2))
print(tmax.max(axis=0))
print(stations[station_means.argmax()])
print(np.median(tmax[0]), tmax[0].std().round(2))
`,
        output: "[ 4.9  20.66  0.6 ]\n[22.2 17.8 21.7 18.3 23.3]\nOrlando\n6.7 3.69\n",
        note: "Three stations, so `axis=1` gives three means; five days, so `axis=0` gives five maxima (Orlando's every day here). `argmax` is a position, so it can index the list of names. `std` is the standard deviation, the typical distance from the mean.",
      },
      {
        kind: "error-example",
        title: "An axis the table doesn't have",
        code: src`
import numpy as np

tmax = np.array([[-0.5, 6.7], [22.2, 17.8]])
print(tmax.mean(axis=2))
`,
        error: "AxisError",
        output: "",
        note: "`AxisError: axis 2 is out of bounds for array of dimension 2`. A 2-D array has axis 0 (rows) and axis 1 (columns) only.",
      },
      {
        kind: "text",
        md: "Real series have gaps. NumPy marks a missing float as `np.nan` (*not a number*), and any arithmetic with nan gives nan, so one gap makes `mean()` nan. The **nan- functions** (`np.nanmean`, `np.nanmedian`, `np.nansum`, `np.nanpercentile`) skip the gaps, and `np.isnan(values)` is a mask of where they are. Building an array with `dtype=float` turns `None` into nan.\n\nThe **median** (middle value) and **percentiles** describe skewed data better than the mean: one blizzard drags the mean snowfall up, but barely moves the median.",
      },
      {
        kind: "example",
        title: "Snowfall with a storm and a gap",
        code: src`
import numpy as np

# Sioux Falls snowfall in mm, 1 to 10 January 2024, and one day with no report
snow = np.array([0, 0, 0, 0, 0, 13, 0, 267, 10, 30, None], dtype=float)
print(snow.mean())
print(np.isnan(snow).sum(), "missing")
print(np.nanmean(snow), np.nanmedian(snow))
print(np.nanpercentile(snow, 90).round(1))
`,
        output: "nan\n1 missing\n32.0 0.0\n53.7\n",
        note: "The plain mean is nan because of the gap. Skipping it, the mean is 32 mm but the median is 0: most days had no snow, and one storm of 267 mm carries the mean. The 90th percentile says nine days in ten had about 54 mm or less.",
      },
      {
        kind: "text",
        md: "**When to use it:** per-group summaries of a table (`axis=`), *which one* questions (`argmax`, `argmin`), and series with gaps (nan- functions). **Mistakes to avoid:** mixing up the axes (check the result's length against the rows or columns you expected), reporting the mean of skewed data without the median, and silently replacing gaps with 0, which changes every statistic.",
      },
    ],
    tryIt: {
      id: "try",
      title: "One mean per station",
      prompt: "`station_means` should give one average per **station** (row), but it averages down the columns and returns one value per day. Change the axis.",
      spec: [
        ["Function", "`station_means(grid)`"],
        ["Returns", "a list with each row's mean"],
        ["Example", "`station_means([[1, 3], [10, 20]])` → `[2.0, 15.0]`"],
      ],
      starter: src`
import numpy as np

def station_means(grid):
    readings = np.array(grid, dtype=float)
    return readings.mean(axis=0).tolist()

print(station_means([[1, 3], [10, 20]]))
`,
      answer: src`
import numpy as np

def station_means(grid):
    readings = np.array(grid, dtype=float)
    return readings.mean(axis=1).tolist()

print(station_means([[1, 3], [10, 20]]))
`,
      wrong: [
        {
          code: src`
import numpy as np

def station_means(grid):
    return [float(np.array(grid, dtype=float).mean())]
`,
          fails: ["returns"],
          why: "it averages the whole table into one number",
        },
      ],
      hints: ["Rows are stations, columns are days.", "The axis you name is the one that disappears.", "To keep one value per row, collapse the columns: axis 1."],
      task: {
        packages: NP,
        checks: [
          fn("returns", "station_means", [
            example([[[1, 3], [10, 20]]], [2.0, 15.0]),
            hiddenCase("three stations, five days", [grid3x5], [4.9, 20.66, 0.6]),
            hiddenCase("one station", [[[4, 8, 12]]], [8.0]),
          ], { label: "station_means() averages each row", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The wettest station",
        prompt: "Write `wettest(names, grid)`: `grid` has one row of daily rainfall per station, in the same order as `names`. Return the name of the station with the highest **total**. On a tie, return the first of them. With no stations, return `None`.",
        spec: [
          ["Function", "`wettest(names, grid)`"],
          ["Returns", "a station name, or `None` when `names` is empty"],
          ["Example", "`wettest([\"Wichita\", \"Orlando\"], [[0, 11.4, 0], [14.7, 2.3, 0]])` → `'Orlando'`"],
        ],
        starter: src`
import numpy as np

def wettest(names, grid):
    return None

print(wettest(["Wichita", "Orlando"], [[0, 11.4, 0], [14.7, 2.3, 0]]))
`,
        answer: src`
import numpy as np

def wettest(names, grid):
    if len(names) == 0:
        return None
    totals = np.array(grid, dtype=float).sum(axis=1)
    return names[totals.argmax()]

print(wettest(["Wichita", "Orlando"], [[0, 11.4, 0], [14.7, 2.3, 0]]))
`,
        alternatives: [
          src`
import numpy as np

def wettest(names, grid):
    if not names:
        return None
    totals = [float(np.sum(row)) for row in grid]
    best = 0
    for i in range(1, len(totals)):
        if totals[i] > totals[best]:
            best = i
    return names[best]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def wettest(names, grid):
    if len(names) == 0:
        return None
    totals = np.array(grid, dtype=float).max(axis=1)
    return names[totals.argmax()]
`,
            fails: ["returns"],
            why: "it picks the station with the wettest single day, not the highest total",
          },
          {
            code: src`
import numpy as np

def wettest(names, grid):
    if len(names) == 0:
        return None
    totals = np.array(grid, dtype=float).sum(axis=0)
    return names[totals.argmax()]
`,
            fails: ["returns"],
            why: "`axis=0` totals each day, so the position is a day, not a station",
          },
          {
            code: src`
import numpy as np

def wettest(names, grid):
    totals = np.array(grid, dtype=float).sum(axis=1)
    return names[totals.argmax()]
`,
            fails: ["returns"],
            why: "with no stations, `argmax` of an empty array raises ValueError",
          },
        ],
        hints: [
          "First make one total per station, then ask where the biggest one is.",
          "Rows are stations: the axis to collapse is the days.",
          "`argmax` returns the first position of the maximum, which is the tie rule you need. Handle the empty case before it.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "wettest", [
              example([["Wichita", "Orlando"], [[0, 11.4, 0], [14.7, 2.3, 0]]], "Orlando"),
              example([["Wichita", "Orlando", "Sioux Falls"], [[0, 0, 11.4, 27.2], [0, 0.3, 14.7, 2.3], [0, 1.5, 18, 0.5]]], "Wichita"),
              example([[], []], null),
              hiddenCase("a tie between two stations", [["A", "B", "C"], [[5, 5], [10, 0], [2, 2]]], "A"),
              hiddenCase("one wet day against steady rain", [["storm", "drizzle"], [[30, 0, 0, 0], [9, 9, 9, 9]]], "drizzle"),
              hiddenCase("a single station", [["Orlando"], [[0, 0.3]]], "Orlando"),
            ], { label: "wettest() names the station with the highest total" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A robust summary of readings with gaps",
        prompt: "Wind readings sometimes go missing (`None`), and one gust can distort the mean. Write `robust_summary(values)`: return a dictionary with how many readings are `valid`, their `median`, and their 90th percentile (`p90`), ignoring the gaps. If no reading is valid, return `None`.",
        spec: [
          ["Function", "`robust_summary(values)`"],
          ["values", "a list of numbers and `None`"],
          ["Returns", "`{\"valid\": int, \"median\": float, \"p90\": float}`, or `None` when nothing is valid"],
          ["Example", "`[2.8, None, 2.6, 1.7, 9.3]` → `{'valid': 4, 'median': 2.7, 'p90': 7.35}`"],
        ],
        starter: src`
import numpy as np

def robust_summary(values):
    return None

print(robust_summary([2.8, None, 2.6, 1.7, 9.3]))
`,
        answer: src`
import numpy as np

def robust_summary(values):
    readings = np.array(values, dtype=float)
    valid = int((~np.isnan(readings)).sum())
    if valid == 0:
        return None
    return {
        "valid": valid,
        "median": float(np.nanmedian(readings)),
        "p90": float(np.nanpercentile(readings, 90)),
    }

print(robust_summary([2.8, None, 2.6, 1.7, 9.3]))
`,
        alternatives: [
          src`
import numpy as np

def robust_summary(values):
    present = np.array([v for v in values if v is not None], dtype=float)
    if present.size == 0:
        return None
    return {"valid": present.size, "median": np.median(present), "p90": np.percentile(present, 90)}
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def robust_summary(values):
    readings = np.array(values, dtype=float)
    valid = int((~np.isnan(readings)).sum())
    if valid == 0:
        return None
    return {"valid": valid, "median": float(np.median(readings)), "p90": float(np.percentile(readings, 90))}
`,
            fails: ["returns"],
            why: "the plain functions return nan as soon as one reading is missing",
          },
          {
            code: src`
import numpy as np

def robust_summary(values):
    readings = np.array([0 if v is None else v for v in values], dtype=float)
    if readings.size == 0:
        return None
    return {"valid": readings.size, "median": float(np.median(readings)), "p90": float(np.percentile(readings, 90))}
`,
            fails: ["returns"],
            why: "a gap is treated as a calm reading of 0, which changes the count and the median",
          },
        ],
        hints: [
          "Let NumPy turn the gaps into nan, then count what isn't nan.",
          "Decide the all-missing case before computing anything.",
          "The nan- versions of median and percentile skip the gaps for you.",
        ],
        task: {
          packages: NP,
          checks: [
            fn("returns", "robust_summary", [
              example([[2.8, null, 2.6, 1.7, 9.3]], { valid: 4, median: 2.7, p90: 7.35 }),
              example([[null, null]], null),
              example([[4.4, 3.4, 3.4]], { valid: 3, median: 3.4, p90: 4.2 }),
              hiddenCase("an empty list", [[]], null),
              hiddenCase("a single valid reading among gaps", [[null, 5.2, null]], { valid: 1, median: 5.2, p90: 5.2 }),
              hiddenCase("one extreme gust", [[2.0, 2.0, 2.0, 2.0, 40.0]], { valid: 5, median: 2.0, p90: 24.8 }),
            ], { label: "robust_summary() skips gaps and reports count, median and 90th percentile", compare: loose }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

sales = np.array([[3, 0, 5], [1, 4, 1]])
print(sales.sum(axis=0).tolist(), sales.sum(axis=1).tolist(), sales.argmax())
`,
        choices: ["[4, 4, 6] [8, 6] 2", "[8, 6] [4, 4, 6] 2", "[4, 4, 6] [8, 6] 5", "[4, 4, 6] [8, 6] 4"],
        answer: 0,
        why: "`axis=0` collapses the rows (one total per column); `axis=1` one total per row. Without an axis, `argmax` counts positions through the flattened table: 5 is at position 2.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a single gap in the data. What does this print?",
        program: src`
import numpy as np

wind = np.array([2.8, None, 2.6], dtype=float)
print(wind.mean(), np.nanmean(wind))
`,
        choices: ["nan 2.7", "2.7 2.7", "1.8 2.7", "an error: None is not a number"],
        answer: 0,
        why: "With `dtype=float`, `None` becomes nan, and nan spreads through `mean`. `np.nanmean` averages only 2.8 and 2.6.",
      },
      {
        id: "q3",
        prompt: "Daily snowfall is 0 on most days and 267 mm on one. Which statistic best describes a typical day?",
        choices: ["The median", "The mean", "The maximum", "The sum"],
        answer: 0,
        why: "The median is the middle value, so one storm barely moves it; the mean is pulled toward the storm.",
      },
    ],
    review: [
      "`axis=1` gives one result per row, `axis=0` one per column; no axis summarises everything.",
      "`argmax`/`argmin` give positions, which index a list of labels.",
      "nan marks a gap; the nan- functions skip gaps, and the median resists outliers.",
      "Next (the pandas Foundations module): pandas puts labels on the rows and columns, so a table of mixed columns keeps its names.",
    ],
  },
];
