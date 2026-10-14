import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const readingAndInspectingData: PyLesson = {
  slug: "reading-and-inspecting-data",
  ref: "python:reading-and-inspecting-data",
  module: "pandas",
  number: 2,
  title: "Reading and inspecting data",
  level: "intermediate",
  summary:
    "Load a CSV into a DataFrame with `pd.read_csv`, then get to know it before analysing anything: its size, columns and types, the first rows, summary statistics, how often each value appears, and where values are missing.",
  packages: ["pandas"],
  files: SHOP_FILES,

  sections: [
    {
      label: "read_csv",
      blocks: [
        {
          kind: "p",
          text: "`pd.read_csv(\"orders.csv\")` reads a CSV file (with its header) into a DataFrame, handling quoting and **guessing a type for each column**: whole numbers become `int64`, decimals `float64`, everything else text. Dates stay text unless you ask: `parse_dates=[\"order_date\"]` turns that column into real datetimes. `dtype={\"customer_id\": \"str\"}` forces a column's type, which matters for codes like `00417` that would otherwise lose their leading zeros.",
        },
        { kind: "code", code: 'orders = pd.read_csv("orders.csv", parse_dates=["order_date"])' },
      ],
    },
    {
      label: "a first look",
      blocks: [
        {
          kind: "p",
          text: "Always inspect before you analyse. `df.shape` (how much data), `df.head()` (what it looks like), `df.dtypes` (did the types come out right?), and `df.info()` (types plus non-missing counts, in one view). `df.describe()` summarises the numeric columns: count, mean, spread, minimum, quartiles and maximum, a quick way to spot impossible values like negative quantities.",
        },
        {
          kind: "p",
          text: "For text columns: `df[\"status\"].value_counts()` counts each distinct value (and reveals typos such as `Completed` next to `completed`), `df[\"customer_id\"].nunique()` counts distinct values, and `df.isna().sum()` counts missing values per column.",
        },
      ],
    },
  ],

  example: {
    caption: "Loading orders.csv (in the Files list) and inspecting it. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\norders = pd.read_csv("orders.csv", parse_dates=["order_date"])\nprint(orders.shape)\ndisplay(orders.head(3))\nprint(orders.dtypes)\nprint(orders["status"].value_counts())\nprint("Customers:", orders["customer_id"].nunique(), "| Date range:", orders["order_date"].min().date(), "to", orders["order_date"].max().date())',
  },

  walkthrough: [
    {
      title: "read_csv guesses the types",
      text: "Numbers come out numeric; text and (unparsed) dates are `str`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders.dtypes)',
    },
    {
      title: "Ask for dates and types you need",
      text: "`parse_dates` gives a datetime column you can sort and compare by time.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv", parse_dates=["order_date"])\nprint(orders["order_date"].dtype, orders["order_date"].iloc[0])\nprint(orders["order_date"].dt.day_name().head(3).tolist())',
    },
    {
      title: "describe the numbers",
      text: "One table shows each numeric column's count, mean, standard deviation, min, quartiles and max.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders[["quantity", "unit_price"]].describe().round(2))',
    },
    {
      title: "Counts of values, and of gaps",
      text: "`value_counts` shows each status and how often it appears; `isna().sum()` shows there's nothing missing here.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders["status"].value_counts())\nprint(orders["category"].nunique(), "categories")\nprint(orders.isna().sum().sum(), "missing values")',
    },
  ],

  mistakes: [
    {
      title: "A file name that isn't there",
      text: "There's no `order.csv`; `read_csv` raises `FileNotFoundError`.",
      code: 'import pandas as pd\norders = pd.read_csv("order.csv")',
      raises: "FileNotFoundError",
      fix: "Check the exact file name (see the Files list).",
    },
    {
      title: "Treating unparsed dates as dates",
      text: "Without `parse_dates`, the column is text, so `.dt` doesn't exist: `AttributeError`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders["order_date"].dt.month)',
      raises: "AttributeError",
      fix: 'Parse it when reading (`parse_dates=["order_date"]`) or later with `pd.to_datetime(orders["order_date"])`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Profile a CSV",
      prompt:
        "Write `profile(path)`, which reads the CSV at `path` and returns a dictionary: `\"rows\"` and `\"columns\"` (counts), `\"numeric_columns\"` (a **list** of the names of numeric columns, in file order), and `\"missing\"` (the total number of missing values in the whole table). Use plain Python ints.",
      looksFor: [
        "`rows` and `columns` match the file.",
        "`numeric_columns` lists the int and float columns, in order.",
        "`missing` is the total count of missing cells.",
      ],
      starter: "import pandas as pd\n\n\ndef profile(path):\n    # Return {\"rows\", \"columns\", \"numeric_columns\", \"missing\"}.\n    pass\n\n\nprint(profile(\"orders.csv\"))\n",
      task: {
        files: { "gappy.csv": "id,name,score,weight\n1,ana,90,\n2,,85,61.5\n3,cai,,70\n" },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "profile",
            cases: [
              { args: [s("orders.csv")], expected: py.dict([[s("rows"), i(12)], [s("columns"), i(8)], [s("numeric_columns"), strs("order_id", "quantity", "unit_price")], [s("missing"), i(0)]]) },
              { args: [s("gappy.csv")], expected: py.dict([[s("rows"), i(3)], [s("columns"), i(4)], [s("numeric_columns"), strs("id", "score", "weight")], [s("missing"), i(3)]]) },
            ],
            tip: 'df.select_dtypes("number").columns gives the numeric columns; df.isna().sum().sum() counts every missing cell.',
          },
        ],
      },
      hints: [
        "df = pd.read_csv(path); rows, columns = df.shape.",
        'list(df.select_dtypes("number").columns) gives the numeric column names in order.',
        "int(df.isna().sum().sum()) counts all missing cells.",
      ],
      answer: 'import pandas as pd\n\n\ndef profile(path):\n    """Return the size, numeric columns and missing-value count of a CSV."""\n    df = pd.read_csv(path)\n    rows, columns = df.shape\n    return {\n        "rows": int(rows),\n        "columns": int(columns),\n        "numeric_columns": list(df.select_dtypes("number").columns),\n        "missing": int(df.isna().sum().sum()),\n    }\n\n\nprint(profile("orders.csv"))',
      wrong: [
        { code: 'import pandas as pd\n\ndef profile(path):\n    df = pd.read_csv(path)\n    return {"rows": len(df), "columns": len(df.columns), "numeric_columns": list(df.select_dtypes("number").columns), "missing": int(df.isna().sum().max())}\n', fails: ["fn"], why: "max per column, not the total" },
      ],
    },
    {
      id: "challenge-2",
      title: "Count orders by status",
      prompt:
        "Write `status_counts(path)`, which reads an orders CSV and returns a **dictionary** from status to the number of orders with that status, with every status included. Use `value_counts`, and return plain Python ints.",
      looksFor: [
        "Every status in the file appears, with its count.",
        "The values are plain ints.",
      ],
      starter: "import pandas as pd\n\n\ndef status_counts(path):\n    # Return {status: number of orders}.\n    pass\n\n\nprint(status_counts(\"orders.csv\"))\n",
      task: {
        files: { "few.csv": "order_id,status\n1,new\n2,new\n3,done\n" },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "status_counts",
            cases: [
              { args: [s("orders.csv")], expected: py.dict([[s("completed"), i(9)], [s("refunded"), i(1)], [s("pending"), i(1)], [s("cancelled"), i(1)]]) },
              { args: [s("few.csv")], expected: py.dict([[s("new"), i(2)], [s("done"), i(1)]]), hidden: true },
            ],
            tip: 'df["status"].value_counts() gives counts; turn it into {status: int(n) for status, n in counts.items()}.',
          },
          { kind: "expr", id: "ints", label: "Counts are plain ints", show: 'type of each count', expr: 'result = sorted({type(v).__name__ for v in status_counts("orders.csv").values()})', expected: strs("int"), tip: "Convert each count with int()." },
        ],
      },
      hints: [
        'counts = pd.read_csv(path)["status"].value_counts().',
        "A Series has .items(), giving (index value, count) pairs.",
        "return {status: int(n) for status, n in counts.items()}.",
      ],
      answer: 'import pandas as pd\n\n\ndef status_counts(path):\n    """Return {status: number of orders} for an orders CSV."""\n    counts = pd.read_csv(path)["status"].value_counts()\n    return {status: int(n) for status, n in counts.items()}\n\n\nprint(status_counts("orders.csv"))',
      wrong: [
        { code: 'import pandas as pd\n\ndef status_counts(path):\n    return dict(pd.read_csv(path)["status"].value_counts())\n', fails: ["ints"], why: "dict() keeps NumPy ints" },
        { code: 'import pandas as pd\n\ndef status_counts(path):\n    return {k: float(v) for k, v in pd.read_csv(path)["status"].value_counts(normalize=True).items()}\n', fails: ["fn", "ints"], why: "proportions instead of counts" },
      ],
    },
  ],

  quiz: [
    {
      id: "inspect",
      prompt: "Which gives one count per distinct value of a column?",
      options: [
        { text: "`df[\"status\"].value_counts()`", correct: true, why: "It counts each distinct value, most common first." },
        { text: "`df[\"status\"].nunique()`", why: "That's how many distinct values there are: one number." },
        { text: "`df[\"status\"].count()`", why: "That's the number of non-missing values." },
        { text: "`df.describe()`", why: "By default `describe` summarises numeric columns, not counts of text values." },
      ],
    },
    {
      id: "zeros",
      prompt: "A CSV has a column of codes like `00417`. Why read it with `dtype={\"code\": \"str\"}`?",
      options: [
        { text: "Otherwise it's read as the number 417 and the leading zeros are lost", correct: true, why: "`read_csv` guesses a numeric type for digit-only columns." },
        { text: "Codes can't be stored at all otherwise", why: "They'd be stored, but as numbers, changing their meaning." },
        { text: "It makes reading faster", why: "The point is keeping the values exactly as written." },
        { text: "pandas requires a dtype for every column", why: "It guesses when you don't say; the guess is just wrong here." },
      ],
    },
  ],

  outcomes: [
    "Load CSV files with `pd.read_csv`, parsing dates and forcing types when needed.",
    "Inspect a DataFrame with `shape`, `head`, `dtypes`, `info` and `describe`.",
    "Count values with `value_counts` and `nunique`, and missing cells with `isna().sum()`.",
  ],
};
