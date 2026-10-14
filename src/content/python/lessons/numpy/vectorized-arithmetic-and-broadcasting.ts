import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const fl = (...xs: number[]) => py.list(...xs.map((x) => f(x)));

export const vectorizedArithmeticAndBroadcasting: PyLesson = {
  slug: "vectorized-arithmetic-and-broadcasting",
  ref: "python:vectorized-arithmetic-and-broadcasting",
  module: "numpy",
  number: 2,
  title: "Vectorized arithmetic and broadcasting",
  level: "intermediate",
  summary:
    "Do arithmetic on whole arrays at once, without loops: element by element between arrays of the same shape, and between arrays of different shapes through broadcasting. Know the broadcasting rule, so you can predict when shapes fit and read the error when they don't.",
  packages: ["numpy"],

  sections: [
    {
      label: "element by element",
      blocks: [
        {
          kind: "p",
          text: "Arithmetic between two arrays of the same shape works **element by element**: `prices * quantities` multiplies the first price by the first quantity, the second by the second, and so on, giving a new array. This is called **vectorized** code: one expression replaces a loop, and NumPy runs the loop in fast compiled code.",
        },
        { kind: "code", code: 'prices = np.array([2.5, 4.0, 10.0])\nquantities = np.array([4, 1, 3])\nline_totals = prices * quantities    # [10.  4. 30.]\nprint(line_totals.sum())             # 44.0' },
        {
          kind: "p",
          text: "Comparisons are element by element too, and give **boolean arrays**: `prices > 3` is `[False, True, True]`. Functions like `np.sqrt`, `np.round` and `np.abs` also apply to every element.",
        },
      ],
    },
    {
      label: "broadcasting",
      blocks: [
        {
          kind: "p",
          text: "Shapes don't always have to match. A single number is **broadcast** to every element: `prices * 1.2` adds 20% to each price. More generally, NumPy compares shapes from the **last** axis backwards; two axes fit if they're equal or one of them is 1, and an axis of length 1 is stretched to match.",
        },
        {
          kind: "p",
          text: "So a `(3, 4)` grid and a `(4,)` row fit (the row is applied to every row of the grid), and a `(3, 4)` grid and a `(3, 1)` column fit (the column is applied to every column). A `(3, 4)` grid and a `(3,)` array don't: their last axes are 4 and 3. That's a `ValueError: operands could not be broadcast together`. To apply one value per **row**, reshape it into a column with `values.reshape(-1, 1)` or `values[:, None]`.",
        },
      ],
    },
  ],

  example: {
    caption: "Line totals, a tax rate broadcast to every price, and per-store adjustments. Press Run to execute it with real Python and NumPy; running examples never affects your progress.",
    code: 'import numpy as np\n\nprices = np.array([2.5, 4.0, 10.0])\nquantities = np.array([4, 1, 3])\nprint("Line totals:", prices * quantities, "sum:", (prices * quantities).sum())\nprint("With tax:", np.round(prices * 1.2, 2))\nprint("Over 3:", prices > 3)\n\n# Weekly sales: 2 stores (rows) x 3 days (columns)\nsales = np.array([[10, 12, 9], [20, 18, 25]])\nday_bonus = np.array([0, 5, 0])            # one value per day (column)\nstore_factor = np.array([[1.0], [1.5]])    # one value per store (row)\nprint(sales + day_bonus)\nprint(sales * store_factor)',
  },

  walkthrough: [
    {
      title: "A loop versus one expression",
      text: "Both give the same totals; the array version needs no loop.",
      code: "import numpy as np\nprices = [2.5, 4.0, 10.0]\nqty = [4, 1, 3]\nloop = [p * q for p, q in zip(prices, qty)]\nvec = np.array(prices) * np.array(qty)\nprint(loop)\nprint(vec, vec.tolist() == loop)",
    },
    {
      title: "Lists and arrays mean different things by *",
      text: "`*` on a list repeats it; on an array it multiplies every element.",
      code: "import numpy as np\nprint([1, 2] * 3)\nprint(np.array([1, 2]) * 3)\nprint(np.array([1, 2]) + np.array([10, 20]))",
    },
    {
      title: "Broadcasting a row and a column",
      text: "The `(3,)` row is added to each row of the grid; the `(2, 1)` column multiplies each column.",
      code: "import numpy as np\ngrid = np.array([[1, 2, 3], [4, 5, 6]])\nprint(grid + np.array([10, 20, 30]))\nprint(grid * np.array([[1], [100]]))",
    },
    {
      title: "When shapes don't fit",
      text: "A `(2, 3)` grid and a `(2,)` array clash on the last axis. Reshaping the array into a `(2, 1)` column fixes it.",
      code: "import numpy as np\ngrid = np.array([[1, 2, 3], [4, 5, 6]])\nper_row = np.array([10, 100])\ntry:\n    grid * per_row\nexcept ValueError as error:\n    print(error)\nprint(grid * per_row.reshape(-1, 1))",
    },
  ],

  mistakes: [
    {
      title: "Adding a per-row value along the wrong axis",
      text: "One value per row, as a 1-D array, lines up with the **columns**, and these shapes don't fit: `ValueError`.",
      code: "import numpy as np\nsales = np.array([[10, 12, 9], [20, 18, 25]])\nstore_targets = np.array([30, 60])\nprint(sales - store_targets)",
      raises: "ValueError",
      fix: "Make it a column so it lines up with rows: `store_targets.reshape(-1, 1)` (shape `(2, 1)`).",
    },
    {
      title: "Using a Python loop where an expression would do",
      text: "This works, but it's slower and longer, and the result is a list, not an array.",
      code: "import numpy as np\nprices = np.array([2.5, 4.0, 10.0])\nwith_tax = []\nfor p in prices:\n    with_tax.append(p * 1.2)\nprint(with_tax)",
      fix: "Write the arithmetic on the array itself: `prices * 1.2`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Convert temperatures in one step",
      prompt:
        "Write `to_fahrenheit(celsius)`, which takes a NumPy array of temperatures in Celsius and returns a **new array** in Fahrenheit (`c × 9 / 5 + 32`), rounded to 1 decimal place, without a loop. The input array must not change.",
      looksFor: [
        "The result is an array with every temperature converted and rounded to 1 place.",
        "No loop is needed; the input array is unchanged.",
        "It works for any shape, including a 2-D array.",
      ],
      starter: "import numpy as np\n\n\ndef to_fahrenheit(celsius):\n    # Return a new array, rounded to 1 place.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Converts every temperature", show: "to_fahrenheit(np.array([0, 100, -40, 37.5])).tolist()", expr: "import numpy as np\nresult = to_fahrenheit(np.array([0, 100, -40, 37.5])).tolist()", expected: fl(32, 212, -40, 99.5) },
          { kind: "expr", id: "rounded", label: "Rounds to 1 decimal place", show: "to_fahrenheit(np.array([21.3])).tolist()", expr: "import numpy as np\nresult = to_fahrenheit(np.array([21.3, -17.8])).tolist()", expected: fl(70.3, 0), compare: { float: "exact" }, tip: "np.round(celsius * 9 / 5 + 32, 1)." },
          { kind: "expr", id: "unchanged", label: "Leaves the input unchanged", show: "c = np.array([10.0]); to_fahrenheit(c); c.tolist()", expr: "import numpy as np\nc = np.array([10.0, 20.0])\nto_fahrenheit(c)\nresult = c.tolist()", expected: fl(10, 20) },
          { kind: "expr", id: "grid", label: "Works for a 2-D array", hidden: true, expr: "import numpy as np\nresult = to_fahrenheit(np.array([[0, 10], [20, 30]])).tolist()", expected: py.list(fl(32, 50), fl(68, 86)) },
        ],
      },
      hints: [
        "Arithmetic on the array applies to every element: celsius * 9 / 5 + 32.",
        "np.round(values, 1) rounds every element to 1 place.",
        "return np.round(celsius * 9 / 5 + 32, 1). This makes a new array; it doesn't change celsius.",
      ],
      answer: 'import numpy as np\n\n\ndef to_fahrenheit(celsius):\n    """Return a new array of temperatures in Fahrenheit, rounded to 1 place."""\n    return np.round(celsius * 9 / 5 + 32, 1)',
      wrong: [
        { code: "import numpy as np\n\ndef to_fahrenheit(celsius):\n    celsius *= 9 / 5\n    celsius += 32\n    return np.round(celsius, 1)\n", fails: ["unchanged", "grid"], why: "changes the input in place (and fails for int arrays)" },
        { code: "import numpy as np\n\ndef to_fahrenheit(celsius):\n    return celsius * 9 / 5 + 32\n", fails: ["rounded"], why: "not rounded" },
      ],
    },
    {
      id: "challenge-2",
      title: "Adjust sales per store and per day",
      prompt:
        "`sales` is a 2-D array: one row per store, one column per day. Write `adjusted(sales, store_factor, day_bonus)` that multiplies each **store's row** by its factor (`store_factor` is a 1-D array, one value per store) and then adds each **day's bonus** (`day_bonus`, one value per day), using broadcasting, without loops. Return the new array.",
      looksFor: [
        "Each row is multiplied by its own store factor.",
        "Each column then gets its own day bonus.",
        "Shapes are lined up with broadcasting (one array needs reshaping into a column).",
      ],
      starter: "import numpy as np\n\n\ndef adjusted(sales, store_factor, day_bonus):\n    # Multiply rows by store_factor, then add day_bonus to columns.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "values",
            label: "Rows scaled per store, columns shifted per day",
            show: "adjusted(np.array([[10, 12, 9], [20, 18, 25]]), np.array([1.0, 1.5]), np.array([0, 5, 0])).tolist()",
            expr: "import numpy as np\nresult = adjusted(np.array([[10, 12, 9], [20, 18, 25]]), np.array([1.0, 1.5]), np.array([0, 5, 0])).tolist()",
            expected: py.list(fl(10, 17, 9), fl(30, 32, 37.5)),
            compare: { numbers: "int-float-equal" },
            tip: "store_factor has one value per row, so reshape it into a column: store_factor.reshape(-1, 1).",
          },
          {
            kind: "expr",
            id: "square",
            label: "Works when there are as many stores as days",
            show: "a 2 × 2 example, where the wrong axis would still fit",
            expr: "import numpy as np\nresult = adjusted(np.array([[1, 1], [1, 1]]), np.array([2.0, 3.0]), np.array([0, 10])).tolist()",
            expected: py.list(fl(2, 12), fl(3, 13)),
            compare: { numbers: "int-float-equal" },
            tip: "With a square grid, the 1-D store factors broadcast along the columns without an error, but that's the wrong axis.",
          },
        ],
      },
      hints: [
        "day_bonus already lines up with the columns: sales + day_bonus works.",
        "store_factor must line up with rows: store_factor.reshape(-1, 1) has shape (stores, 1).",
        "return sales * store_factor.reshape(-1, 1) + day_bonus.",
      ],
      answer: 'import numpy as np\n\n\ndef adjusted(sales, store_factor, day_bonus):\n    """Scale each store\'s row by its factor, then add each day\'s bonus."""\n    return sales * store_factor.reshape(-1, 1) + day_bonus',
      alternatives: ["import numpy as np\n\ndef adjusted(sales, store_factor, day_bonus):\n    return sales * store_factor[:, None] + day_bonus[None, :]\n"],
      wrong: [
        { code: "import numpy as np\n\ndef adjusted(sales, store_factor, day_bonus):\n    return sales * store_factor + day_bonus\n", fails: ["values", "square"], why: "factors broadcast along columns" },
        { code: "import numpy as np\n\ndef adjusted(sales, store_factor, day_bonus):\n    return (sales + day_bonus) * store_factor.reshape(-1, 1)\n", fails: ["values", "square"], why: "bonus added before scaling" },
      ],
    },
  ],

  quiz: [
    {
      id: "fit",
      prompt: "Which pair of shapes can be broadcast together?",
      options: [
        { text: "`(4, 3)` and `(3,)`", correct: true, why: "Compare from the last axis: 3 and 3 match, and the missing axis is stretched." },
        { text: "`(4, 3)` and `(4,)`", why: "The last axes are 3 and 4, which differ and aren't 1." },
        { text: "`(2, 3)` and `(3, 2)`", why: "Last axes 3 and 2 differ, and neither is 1." },
        { text: "`(5,)` and `(6,)`", why: "Different lengths of 5 and 6 can't be stretched to match." },
      ],
    },
    {
      id: "compare",
      prompt: "What does `np.array([3, 8, 5]) > 4` give?",
      code: "import numpy as np\nprint(np.array([3, 8, 5]) > 4)",
      options: [
        { text: "`[False  True  True]`, an array of booleans", correct: true, why: "Comparisons are element by element, like arithmetic." },
        { text: "`True`", why: "An array comparison doesn't collapse to one value; use `.any()` or `.all()` for that." },
        { text: "`[8, 5]`", why: "That's what using the comparison as a mask gives, `arr[arr > 4]` (next lesson)." },
        { text: "A `TypeError`", why: "Comparing an array with a number is allowed and broadcast to every element." },
      ],
    },
  ],

  outcomes: [
    "Replace loops with element-by-element array arithmetic and comparisons.",
    "Apply a scalar, a row or a column to a 2-D array through broadcasting.",
    "Use the broadcasting rule to predict when shapes fit, and fix a mismatch with `reshape(-1, 1)`.",
  ],
};
