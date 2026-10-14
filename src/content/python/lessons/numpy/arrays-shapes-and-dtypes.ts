import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

export const arraysShapesAndDtypes: PyLesson = {
  slug: "arrays-shapes-and-dtypes",
  ref: "python:arrays-shapes-and-dtypes",
  module: "numpy",
  number: 1,
  title: "Arrays, shapes and dtypes",
  level: "intermediate",
  summary:
    "Meet NumPy's array: a grid of numbers that all share one type. Create arrays from lists and with `arange`, `linspace`, `zeros` and `ones`, read their `shape`, `ndim`, `size` and `dtype`, and convert between types with `astype`.",
  packages: ["numpy"],

  sections: [
    {
      label: "why arrays",
      blocks: [
        {
          kind: "p",
          text: "A Python list can hold anything, and doing maths on it means a loop. A NumPy **array** holds numbers of **one type**, packed together in memory, and does maths on all of them at once (the next lesson). That's what makes it fast for large data, and it's the foundation of pandas, scikit-learn and most scientific Python. By convention it's imported as `np`.",
        },
        { kind: "code", code: 'import numpy as np\n\nprices = np.array([4.5, 12.0, 3.25])\nprint(prices)          # [ 4.5  12.    3.25]\nprint(prices.dtype)    # float64' },
        {
          kind: "p",
          text: "Arrays print without commas, which is how you can tell them from lists. Their `repr` (in a list, or in the Console) is `array([...])`.",
        },
      ],
    },
    {
      label: "shape, ndim, size",
      blocks: [
        {
          kind: "p",
          text: "An array has a **shape**: a tuple with its length along each **axis**. A list of numbers becomes a 1-D array with shape `(3,)`; a list of equal-length lists becomes a 2-D array, with shape `(rows, columns)`. `ndim` is the number of axes and `size` the total number of elements. Rows of different lengths can't form a 2-D array.",
        },
      ],
    },
    {
      label: "dtype",
      blocks: [
        {
          kind: "p",
          text: "Every array has one **dtype** (data type) for all its elements: `float64` for decimals, an integer type for whole numbers, `bool` for `True`/`False`. Mixing ints and floats gives floats. The default integer size depends on the platform: in this browser runtime it's `int32`; on most desktop computers it's `int64`. `arr.astype(float)` converts to another dtype; converting floats to ints **truncates** towards zero, just like `int()`.",
        },
        {
          kind: "p",
          text: "A single element is a NumPy scalar, such as `np.float64(2.5)`. It behaves like a Python number in calculations, but shows as `np.float64(2.5)` inside a list. Convert with `float(x)` or `arr.tolist()` when you need plain Python values.",
        },
      ],
    },
  ],

  example: {
    caption: "Creating arrays and reading their properties. Press Run to execute it with real Python and NumPy; running examples never affects your progress.",
    code: 'import numpy as np\n\nreadings = np.array([[21.5, 22.0, 23.1], [19.8, 20.4, 21.0]])\nprint(readings)\nprint("shape:", readings.shape, "ndim:", readings.ndim, "size:", readings.size, "dtype:", readings.dtype)\n\nprint(np.arange(0, 10, 2))\nprint(np.linspace(0, 1, 5))\nprint(np.zeros((2, 3)))\nprint(np.array([1.9, -1.9, 2.5]).astype(int))',
  },

  walkthrough: [
    {
      title: "From a list to an array",
      text: "The array prints without commas; its `repr` shows `array(...)`; and `tolist()` gives a plain list back.",
      code: "import numpy as np\nscores = np.array([72, 95, 88])\nprint(scores)\nprint(repr(scores))\nprint(scores.tolist(), type(scores).__name__)",
    },
    {
      title: "Shapes of 1-D and 2-D arrays",
      text: "A list of lists becomes rows and columns. `shape` always lists rows first.",
      code: "import numpy as np\nrow = np.array([1, 2, 3])\ngrid = np.array([[1, 2, 3], [4, 5, 6]])\nprint(row.shape, row.ndim, row.size)\nprint(grid.shape, grid.ndim, grid.size)",
    },
    {
      title: "Making arrays without lists",
      text: "`arange` steps like `range`; `linspace` gives a fixed number of evenly spaced points, including the end; `zeros` and `ones` fill a shape.",
      code: "import numpy as np\nprint(np.arange(5), np.arange(1, 2, 0.25))\nprint(np.linspace(0, 100, 3))\nprint(np.ones((2, 2), dtype=int))",
    },
    {
      title: "One dtype for everything",
      text: "One float makes the whole array float. `astype(int)` truncates towards zero. A NumPy scalar shows its type inside a list until converted.",
      code: "import numpy as np\nmixed = np.array([1, 2, 3.5])\nprint(mixed, mixed.dtype)\nprint(mixed.astype(int))\nfirst = mixed[0]\nprint([first], [float(first)])",
    },
  ],

  mistakes: [
    {
      title: "Rows of different lengths",
      text: "A 2-D array needs every row to have the same length, so NumPy refuses these lists: `ValueError`.",
      code: "import numpy as np\ngrid = np.array([[1, 2, 3], [4, 5]])",
      raises: "ValueError",
      fix: "Make the rows the same length (pad missing values with `np.nan`, next lessons), or keep ragged data in a list.",
    },
    {
      title: "Expecting astype(int) to round",
      text: "Converting to int drops the fraction, so 2.9 becomes 2 and -2.9 becomes -2.",
      code: "import numpy as np\nprint(np.array([2.9, -2.9]).astype(int))",
      fix: "Round first if you want the nearest whole number: `np.round(arr).astype(int)`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Describe an array",
      prompt:
        "Write `describe(values)`, which turns a list of lists of numbers into a NumPy array and returns a dictionary with its `\"shape\"` (a tuple), `\"ndim\"`, `\"size\"` and `\"dtype\"` (the dtype's name as a string, such as `\"float64\"`).",
      looksFor: [
        "`describe([[1.5, 2.0], [3.0, 4.5]])` returns `{\"shape\": (2, 2), \"ndim\": 2, \"size\": 4, \"dtype\": \"float64\"}`.",
        "It works for 1-D input and for whole numbers too.",
        "`shape` is a tuple of ints and `dtype` a string.",
      ],
      starter: "import numpy as np\n\n\ndef describe(values):\n    # Return {\"shape\", \"ndim\", \"size\", \"dtype\"} for np.array(values).\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "describe",
            cases: [
              { args: [py.list(py.list(f(1.5), f(2)), py.list(f(3), f(4.5)))], expected: py.dict([[s("shape"), py.tuple(i(2), i(2))], [s("ndim"), i(2)], [s("size"), i(4)], [s("dtype"), s("float64")]]) },
              { args: [py.list(f(1), f(2), f(3.5))], expected: py.dict([[s("shape"), py.tuple(i(3))], [s("ndim"), i(1)], [s("size"), i(3)], [s("dtype"), s("float64")]]) },
              { args: [py.list(py.list(i(1), i(2), i(3)))], expected: py.dict([[s("shape"), py.tuple(i(1), i(3))], [s("ndim"), i(2)], [s("size"), i(3)], [s("dtype"), s("int32")]]), hidden: true },
            ],
            tip: 'arr = np.array(values), then {"shape": arr.shape, "ndim": arr.ndim, "size": arr.size, "dtype": str(arr.dtype)}.',
          },
        ],
      },
      hints: [
        "arr = np.array(values).",
        "arr.shape is already a tuple; arr.ndim and arr.size are ints.",
        "str(arr.dtype) (or arr.dtype.name) gives the dtype's name as text.",
      ],
      answer: 'import numpy as np\n\n\ndef describe(values):\n    """Return the shape, ndim, size and dtype name of np.array(values)."""\n    arr = np.array(values)\n    return {"shape": arr.shape, "ndim": arr.ndim, "size": arr.size, "dtype": str(arr.dtype)}',
      wrong: [
        { code: 'import numpy as np\n\ndef describe(values):\n    arr = np.array(values)\n    return {"shape": arr.shape, "ndim": arr.ndim, "size": len(arr), "dtype": str(arr.dtype)}\n', fails: ["fn"], why: "len counts rows, not elements" },
        { code: 'import numpy as np\n\ndef describe(values):\n    arr = np.array(values)\n    return {"shape": arr.shape, "ndim": arr.ndim, "size": arr.size, "dtype": arr.dtype}\n', fails: ["fn"], why: "dtype object, not its name" },
      ],
    },
    {
      id: "challenge-2",
      title: "Build a price grid",
      prompt:
        "Write `price_grid(base, steps, increment)`, which returns a 1-D float array of `steps` prices starting at `base` and going up by `increment` each time: `price_grid(10, 4, 2.5)` gives `[10.0, 12.5, 15.0, 17.5]`. Use NumPy (`np.arange` or `np.linspace`), and make sure the dtype is `float64` even when the inputs are whole numbers.",
      looksFor: [
        "The result is a NumPy array of `steps` values, starting at `base`, `increment` apart.",
        "Its dtype is `float64`.",
        "`steps = 0` gives an empty array.",
      ],
      starter: "import numpy as np\n\n\ndef price_grid(base, steps, increment):\n    # Return a float array of steps prices.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Gives the right prices", show: "price_grid(10, 4, 2.5).tolist()", expr: "price_grid(10, 4, 2.5).tolist()", expected: py.list(f(10), f(12.5), f(15), f(17.5)) },
          { kind: "expr", id: "dtype", label: "The dtype is float64 even for whole numbers", show: "str(price_grid(1, 3, 1).dtype)", expr: "(str(price_grid(1, 3, 1).dtype), price_grid(1, 3, 1).tolist())", expected: py.tuple(s("float64"), py.list(f(1), f(2), f(3))), tip: "np.arange(steps, dtype=float) or .astype(float) makes sure the values are floats." },
          { kind: "expr", id: "array", label: "Returns a NumPy array", show: "type(price_grid(10, 2, 1)).__name__", expr: "type(price_grid(10, 2, 1)).__name__", expected: s("ndarray") },
          { kind: "expr", id: "empty", label: "steps = 0 gives an empty array", hidden: true, expr: "price_grid(5, 0, 1).shape", expected: py.tuple(i(0)) },
        ],
      },
      hints: [
        "np.arange(steps) gives 0, 1, …, steps - 1.",
        "base + np.arange(steps) * increment gives the prices.",
        "Use np.arange(steps, dtype=float) so the result is float64 for whole-number inputs too.",
      ],
      answer: 'import numpy as np\n\n\ndef price_grid(base, steps, increment):\n    """Return steps float prices: base, base + increment, ..."""\n    return base + np.arange(steps, dtype=float) * increment',
      alternatives: ["import numpy as np\n\ndef price_grid(base, steps, increment):\n    return np.linspace(base, base + increment * (steps - 1), steps) if steps else np.array([], dtype=float)\n"],
      wrong: [
        { code: "import numpy as np\n\ndef price_grid(base, steps, increment):\n    return base + np.arange(steps) * increment\n", fails: ["dtype"], why: "int dtype for whole-number inputs" },
        { code: "def price_grid(base, steps, increment):\n    return [float(base + n * increment) for n in range(steps)]\n", fails: ["values", "dtype", "array", "empty"], why: "a list, not an array" },
      ],
    },
  ],

  quiz: [
    {
      id: "shape",
      prompt: "What is the shape of `np.array([[1, 2], [3, 4], [5, 6]])`?",
      code: "import numpy as np\nprint(np.array([[1, 2], [3, 4], [5, 6]]).shape)",
      options: [
        { text: "`(3, 2)`", correct: true, why: "Three rows of two columns: shape lists rows first." },
        { text: "`(2, 3)`", why: "Shape is (rows, columns); there are three inner lists, so three rows." },
        { text: "`(6,)`", why: "That would be a 1-D array of six numbers. Nested lists make a 2-D array." },
        { text: "`6`", why: "That's `size`, the number of elements. `shape` is a tuple." },
      ],
    },
    {
      id: "dtype",
      prompt: "What is the dtype of `np.array([1, 2, 3.0])`?",
      options: [
        { text: "`float64`", correct: true, why: "An array has one dtype; a single float makes every element a float." },
        { text: "An integer dtype", why: "The `3.0` is a float, so the whole array becomes float." },
        { text: "Mixed: int for the first two, float for the last", why: "Arrays can't mix types; everything is converted to one dtype." },
        { text: "`object`", why: "NumPy uses `object` only for things it can't store as numbers." },
      ],
    },
  ],

  outcomes: [
    "Create arrays with `np.array`, `arange`, `linspace`, `zeros` and `ones`.",
    "Read an array's `shape`, `ndim`, `size` and `dtype`.",
    "Explain why an array has a single dtype, and convert with `astype`.",
    "Turn NumPy results back into plain Python values with `tolist()` or `float()`.",
  ],
};
