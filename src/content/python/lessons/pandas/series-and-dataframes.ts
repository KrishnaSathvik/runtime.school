import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const seriesAndDataframes: PyLesson = {
  slug: "series-and-dataframes",
  ref: "python:series-and-dataframes",
  module: "pandas",
  number: 1,
  title: "Series and DataFrames",
  level: "intermediate",
  summary:
    "Meet pandas' two structures: a Series (one labelled column of values) and a DataFrame (a table of named columns sharing one index). Build them from dictionaries and records, see them as tables with `display()`, and read their shape, columns and dtypes.",
  packages: ["pandas"],

  sections: [
    {
      label: "a table in Python",
      blocks: [
        {
          kind: "p",
          text: "**pandas** is the standard library for tabular data in Python: think of a spreadsheet you control with code. A **DataFrame** is a table: named **columns**, each holding one kind of value, and an **index** labelling the rows (0, 1, 2, … by default). Each column on its own is a **Series**: values plus that same index. By convention it's imported as `pd`.",
        },
        { kind: "code", code: 'import pandas as pd\n\norders = pd.DataFrame({\n    "order_id": [1001, 1002, 1003],\n    "customer": ["ana", "ben", "ana"],\n    "amount": [40.0, 15.5, 22.5],\n})\nprint(orders.shape)          # (3, 3): rows, columns\nprint(list(orders.columns))  # [\'order_id\', \'customer\', \'amount\']' },
        {
          kind: "p",
          text: "A dictionary of lists gives one column per key. A **list of dictionaries** (records, like the JSON you've already handled) gives one row per dictionary. Both are common ways data arrives.",
        },
      ],
    },
    {
      label: "seeing a DataFrame",
      blocks: [
        {
          kind: "p",
          text: "`print(df)` shows a text table. `display(df)` shows it as a proper table in Runtime's Console, as it would in a Jupyter notebook. (`display` comes from notebooks; in a plain Python script you'd use `print`.) For large tables, `df.head(n)` and `df.tail(n)` show the first or last rows.",
        },
      ],
    },
    {
      label: "columns and dtypes",
      blocks: [
        {
          kind: "p",
          text: "`df[\"amount\"]` selects one column as a Series; `df[[\"customer\", \"amount\"]]` (a list of names) selects several as a smaller DataFrame. Each column has a **dtype**: `int64` and `float64` for numbers, `str` for text (pandas 3's string type), `bool`, and `datetime64` for dates. `df.dtypes` lists them. Column operations work on every row at once, as with NumPy: `df[\"amount\"] * 1.2`, `df[\"amount\"].sum()`, `df[\"amount\"].mean()`.",
        },
      ],
    },
  ],

  example: {
    caption: "Building a DataFrame from records, and looking at it. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\nrecords = [\n    {"order_id": 1001, "customer": "ana", "product": "Desk lamp", "amount": 49.0},\n    {"order_id": 1002, "customer": "ben", "product": "Oak desk", "amount": 120.0},\n    {"order_id": 1003, "customer": "ana", "product": "Notebook", "amount": 16.25},\n]\norders = pd.DataFrame(records)\ndisplay(orders)\nprint(orders.shape)\nprint(orders.dtypes)\nprint("Total:", orders["amount"].sum(), "| Mean:", orders["amount"].mean())',
  },

  walkthrough: [
    {
      title: "A Series is values plus an index",
      text: "The left column is the index; `dtype` is the type shared by all the values.",
      code: 'import pandas as pd\nprices = pd.Series([2.5, 4.0, 10.0], index=["tea", "cake", "sandwich"])\nprint(prices)\nprint(prices["cake"], prices.max(), prices.idxmax())',
    },
    {
      title: "A DataFrame from a dictionary of columns",
      text: "Each key becomes a column; the rows get the default index 0, 1, 2.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"city": ["Leeds", "York", "Hull"], "stores": [4, 2, 1]})\nprint(df)\nprint(df.shape, list(df.columns), df.index.tolist())',
    },
    {
      title: "One column, or several",
      text: "One name gives a Series; a list of names gives a DataFrame.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"customer": ["ana", "ben"], "amount": [40.0, 15.5], "status": ["done", "refunded"]})\nprint(type(df["amount"]).__name__, df["amount"].tolist())\nprint(type(df[["customer", "amount"]]).__name__)\nprint(df[["customer", "amount"]])',
    },
    {
      title: "Columns calculate all at once",
      text: "Arithmetic on a column applies to every row; assigning it to a new name adds a column.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"qty": [2, 1, 5], "unit_price": [24.5, 120.0, 3.25]})\ndf["line_total"] = df["qty"] * df["unit_price"]\nprint(df)\nprint(df["line_total"].sum())',
    },
  ],

  mistakes: [
    {
      title: "A column name that doesn't exist",
      text: "Column names are exact: `Amount` isn't `amount`, so this is a `KeyError` naming the missing column.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"amount": [40.0, 15.5]})\nprint(df["Amount"])',
      raises: "KeyError",
      fix: "Check `df.columns` for the exact spelling.",
    },
    {
      title: "Columns of different lengths",
      text: "Every column must have one value per row: `ValueError: All arrays must be of the same length`.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"customer": ["ana", "ben", "cai"], "amount": [40.0, 15.5]})',
      raises: "ValueError",
      fix: "Make the lists the same length (use `None` for unknown values), or build the frame from records.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Build an orders table",
      prompt:
        "Write `orders_frame(records)`, which turns a list of order dictionaries (`order_id`, `customer`, `quantity`, `unit_price`) into a DataFrame and adds a `line_total` column (`quantity × unit_price`). Return the DataFrame with the columns in this order: `order_id`, `customer`, `quantity`, `unit_price`, `line_total`.",
      looksFor: [
        "The result is a DataFrame with one row per record.",
        "`line_total` is `quantity × unit_price` for every row.",
        "The columns are in the order given.",
      ],
      starter: "import pandas as pd\n\n\ndef orders_frame(records):\n    # Return a DataFrame with a line_total column.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "rows",
            label: "Rows and line totals",
            show: "orders_frame([...]).to_dict(\"records\")",
            expr: 'df = orders_frame([{"order_id": 1, "customer": "ana", "quantity": 2, "unit_price": 24.5}, {"order_id": 2, "customer": "ben", "quantity": 1, "unit_price": 120.0}])\nresult = _records(df)',
            expected: py.list(
              py.dict([[s("order_id"), i(1)], [s("customer"), s("ana")], [s("quantity"), i(2)], [s("unit_price"), f(24.5)], [s("line_total"), f(49)]]),
              py.dict([[s("order_id"), i(2)], [s("customer"), s("ben")], [s("quantity"), i(1)], [s("unit_price"), f(120)], [s("line_total"), f(120)]]),
            ),
            tip: 'df["line_total"] = df["quantity"] * df["unit_price"].',
          },
          { kind: "expr", id: "columns", label: "Columns in the right order", show: "list(orders_frame([...]).columns)", expr: 'result = list(orders_frame([{"customer": "x", "unit_price": 1.0, "quantity": 3, "order_id": 9}]).columns)', expected: strs("order_id", "customer", "quantity", "unit_price", "line_total"), tip: "Select the columns in order at the end: df[[\"order_id\", \"customer\", …]]." },
          { kind: "expr", id: "type", label: "Returns a DataFrame", show: "type(orders_frame([...])).__name__", expr: 'type(orders_frame([{"order_id": 1, "customer": "a", "quantity": 1, "unit_price": 1.0}])).__name__', expected: s("DataFrame") },
        ],
      },
      hints: [
        "df = pd.DataFrame(records) makes one row per dictionary.",
        'df["line_total"] = df["quantity"] * df["unit_price"].',
        'return df[["order_id", "customer", "quantity", "unit_price", "line_total"]].',
      ],
      answer: 'import pandas as pd\n\n\ndef orders_frame(records):\n    """Return the records as a DataFrame with a line_total column."""\n    df = pd.DataFrame(records)\n    df["line_total"] = df["quantity"] * df["unit_price"]\n    return df[["order_id", "customer", "quantity", "unit_price", "line_total"]]',
      wrong: [
        { code: 'import pandas as pd\n\ndef orders_frame(records):\n    df = pd.DataFrame(records)\n    df["line_total"] = df["quantity"] * df["unit_price"]\n    return df\n', fails: ["columns"], why: "keeps the records' column order" },
        { code: 'import pandas as pd\n\ndef orders_frame(records):\n    df = pd.DataFrame(records)\n    df["line_total"] = df["quantity"] + df["unit_price"]\n    return df[["order_id", "customer", "quantity", "unit_price", "line_total"]]\n', fails: ["rows"], why: "adds instead of multiplying" },
      ],
    },
    {
      id: "challenge-2",
      title: "Summarise a column",
      prompt:
        "Write `amount_summary(df)` for a DataFrame with an `amount` column. Return a dictionary with `\"count\"` (rows), `\"total\"` and `\"mean\"` (both rounded to 2 places) and `\"largest_order\"`: the `order_id` of the row with the largest amount. Return plain Python numbers, not NumPy scalars.",
      looksFor: [
        "`count`, `total`, `mean` and `largest_order` are correct.",
        "Totals and means are rounded to 2 places.",
        "Values are plain Python `int`/`float`.",
      ],
      starter: "import pandas as pd\n\n\ndef amount_summary(df):\n    # Return {\"count\", \"total\", \"mean\", \"largest_order\"}.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "values",
            label: "Count, total, mean and the largest order",
            show: 'amount_summary(pd.DataFrame({"order_id": [1001, 1002, 1003], "amount": [49.0, 120.0, 16.25]}))',
            expr: 'import pandas as pd\nresult = amount_summary(pd.DataFrame({"order_id": [1001, 1002, 1003], "amount": [49.0, 120.0, 16.25]}))',
            expected: py.dict([[s("count"), i(3)], [s("total"), f(185.25)], [s("mean"), f(61.75)], [s("largest_order"), i(1002)]]),
            tip: 'df["amount"].idxmax() is the index of the largest amount; df.loc[that, "order_id"] gives its order_id.',
          },
          {
            kind: "expr",
            id: "types",
            label: "Plain Python numbers",
            show: "types of the values",
            expr: 'import pandas as pd\nout = amount_summary(pd.DataFrame({"order_id": [7, 8], "amount": [1.0, 2.0]}))\nresult = [type(out[k]).__name__ for k in ("count", "total", "mean", "largest_order")]',
            expected: strs("int", "float", "float", "int"),
            tip: "Wrap pandas results in int(...) and float(...)/round(...).",
          },
          { kind: "expr", id: "index", label: "Works when the index isn't 0, 1, 2", hidden: true, expr: 'import pandas as pd\ndf = pd.DataFrame({"order_id": [5, 6], "amount": [3.0, 9.0]}, index=[10, 20])\nresult = amount_summary(df)["largest_order"]', expected: i(6) },
        ],
      },
      hints: [
        'count = len(df); total = round(float(df["amount"].sum()), 2).',
        'mean = round(float(df["amount"].mean()), 2).',
        'largest_order = int(df.loc[df["amount"].idxmax(), "order_id"]).',
      ],
      answer: 'import pandas as pd\n\n\ndef amount_summary(df):\n    """Return count, total, mean and the order_id of the largest amount."""\n    return {\n        "count": len(df),\n        "total": round(float(df["amount"].sum()), 2),\n        "mean": round(float(df["amount"].mean()), 2),\n        "largest_order": int(df.loc[df["amount"].idxmax(), "order_id"]),\n    }',
      wrong: [
        { code: 'import pandas as pd\n\ndef amount_summary(df):\n    return {"count": len(df), "total": round(float(df["amount"].sum()), 2), "mean": round(float(df["amount"].mean()), 2), "largest_order": int(df["order_id"][df["amount"].argmax()])}\n', fails: ["index"], why: "argmax position used as an index label" },
        { code: 'import pandas as pd\n\ndef amount_summary(df):\n    return {"count": df["amount"].count(), "total": df["amount"].sum(), "mean": df["amount"].mean(), "largest_order": df.loc[df["amount"].idxmax(), "order_id"]}\n', fails: ["types"], why: "NumPy scalars, unrounded" },
      ],
    },
  ],

  quiz: [
    {
      id: "select",
      prompt: "`df` has columns `customer` and `amount`. What is `type(df[[\"amount\"]])`?",
      options: [
        { text: "DataFrame", correct: true, why: "A **list** of column names always gives a DataFrame, even with one name in it." },
        { text: "Series", why: "`df[\"amount\"]` (one name, no inner brackets) gives a Series." },
        { text: "list", why: "Selecting columns returns pandas objects, not lists." },
        { text: "An error", why: "Selecting a list of existing columns is valid." },
      ],
    },
    {
      id: "shape",
      prompt: "A DataFrame is built from a list of 5 dictionaries, each with the same 3 keys. What's its shape?",
      options: [
        { text: "`(5, 3)`", correct: true, why: "One row per dictionary, one column per key: (rows, columns)." },
        { text: "`(3, 5)`", why: "Shape lists rows first, and each record is a row." },
        { text: "`(15,)`", why: "A DataFrame is 2-D; it doesn't flatten the values." },
        { text: "`(5,)`", why: "That's a Series' shape; a DataFrame has rows and columns." },
      ],
    },
  ],

  outcomes: [
    "Build DataFrames from dictionaries of columns and from lists of records.",
    "Select one column (a Series) or several (a DataFrame).",
    "Read `shape`, `columns`, `index` and `dtypes`, and show tables with `display()`.",
    "Calculate new columns and summaries over whole columns.",
  ],
};
