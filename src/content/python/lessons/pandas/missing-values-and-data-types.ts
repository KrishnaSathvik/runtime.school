import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_RAW_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const f = py.float;

export const missingValuesAndDataTypes: PyLesson = {
  slug: "missing-values-and-data-types",
  ref: "python:missing-values-and-data-types",
  module: "pandas",
  number: 4,
  title: "Missing values and data types",
  level: "intermediate",
  summary:
    "Find missing values, decide what each gap means, and handle it: drop the row, fill a sensible value, or keep it as missing. Convert columns to the types they should be, with `pd.to_numeric(errors=\"coerce\")` turning unreadable values into gaps you can count instead of crashes.",
  packages: ["pandas"],
  files: SHOP_RAW_FILES,

  sections: [
    {
      label: "missing values",
      blocks: [
        {
          kind: "p",
          text: "pandas marks a missing value as `NaN` in number columns and `NaN` (shown that way, though it's pandas' missing marker) in text columns. `df.isna()` gives `True` where a value is missing, `df.isna().sum()` counts gaps per column, and `df[\"col\"].notna()` keeps rows that have a value. Aggregations like `sum` and `mean` skip missing values by default.",
        },
        {
          kind: "p",
          text: "Handling a gap is a **decision**, not a formality. `dropna(subset=[\"customer_id\"])` removes rows missing a key field; `fillna(0)` is right only when “missing” really means zero (no returns recorded); often the honest choice is to keep the gap and report how many there were. Write down the rule you chose.",
        },
      ],
    },
    {
      label: "fixing types",
      blocks: [
        {
          kind: "p",
          text: "Messy files often turn number columns into text: one value like `one` or `£24.50` is enough. `astype(float)` fails on the first bad value. `pd.to_numeric(col, errors=\"coerce\")` converts what it can and turns the rest into `NaN`, which you can then count and report. Clean predictable decoration first: `col.str.replace(\"£\", \"\")`.",
        },
        { kind: "code", code: 'prices = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce")\nprint(prices.isna().sum(), "prices missing or unreadable")' },
        {
          kind: "p",
          text: "Integer columns can't hold `NaN` in NumPy's `int64`, so a whole-number column with gaps becomes `float64`. pandas' **nullable** integer type, `astype(\"Int64\")` (capital I), keeps whole numbers and shows gaps as `<NA>`.",
        },
      ],
    },
  ],

  example: {
    caption: "Counting and handling the gaps in a messy export (raw_orders.csv). Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\nraw = pd.read_csv("raw_orders.csv")\nprint(raw.dtypes)\nprint(raw.isna().sum())\n\nqty = pd.to_numeric(raw["quantity"], errors="coerce")\nprice = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce")\nprint("Unreadable quantities:", int(qty.isna().sum()), "| missing prices:", int(price.isna().sum()))\nprint(qty.astype("Int64").tolist())',
  },

  walkthrough: [
    {
      title: "Gaps per column",
      text: "`isna().sum()` counts missing cells in each column: here one price and one customer ID.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw.isna().sum())\nprint(raw[raw["customer_id"].isna()]["order_id"].tolist())',
    },
    {
      title: "One bad value makes a column text",
      text: "`one` in the quantity column makes the whole column text, so `sum` would join strings. `to_numeric` with `errors=\"coerce\"` turns it into a gap.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw["quantity"].dtype)\nqty = pd.to_numeric(raw["quantity"], errors="coerce")\nprint(qty.dtype, qty.tolist())',
    },
    {
      title: "Drop, fill or keep",
      text: "Three different answers to the same gap. Which is right depends on what a missing customer means for your question.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(len(raw), len(raw.dropna(subset=["customer_id"])))\nprint(raw["customer_id"].fillna("UNKNOWN").tolist()[-2:])\nprint(raw["customer_id"].isna().sum(), "orders without a customer, kept and reported")',
    },
    {
      title: "Nullable integers",
      text: "With a gap, plain integers become floats; `Int64` keeps whole numbers and shows the gap as `<NA>`.",
      code: 'import pandas as pd\nqty = pd.to_numeric(pd.Series(["2", "one", "5"]), errors="coerce")\nprint(qty.tolist(), qty.dtype)\nprint(qty.astype("Int64").tolist(), qty.astype("Int64").dtype)',
    },
  ],

  mistakes: [
    {
      title: "astype on a column with bad values",
      text: "`astype(int)` stops at the first value it can't convert: `ValueError`, without telling you how many others are bad.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw["quantity"].astype(int).sum())',
      raises: "ValueError",
      fix: 'Use `pd.to_numeric(raw["quantity"], errors="coerce")`, then count the NaNs.',
    },
    {
      title: "Filling gaps with zero by habit",
      text: "Filling the missing price with 0 makes the average price look lower than any real price would suggest.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprice = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce")\nprint(round(price.mean(), 2), round(price.fillna(0).mean(), 2))',
      fix: "Keep the gap (pandas skips it) or fill it with a value that means something; report what you did.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Convert prices and quantities",
      prompt:
        "Write `numeric_columns(raw)` for a DataFrame like `raw_orders.csv`. Return a **new** DataFrame with `order_id`, `quantity` and `unit_price`, where `quantity` is a nullable integer (`Int64`) and `unit_price` a float with the `£` removed. Values that can't be read become missing. Also return how many values (across both columns) are missing after conversion. Return `(frame, missing_count)`.",
      looksFor: [
        "`unit_price` is a float without the `£`; `quantity` is `Int64`.",
        "Unreadable or empty values become missing, and the count of missing values is returned.",
        "The input DataFrame isn't changed.",
      ],
      starter: 'import pandas as pd\n\n\ndef numeric_columns(raw):\n    # Return (frame with order_id, quantity, unit_price; missing count).\n    pass\n\n\nprint(numeric_columns(pd.read_csv("raw_orders.csv")))\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "values",
            label: "Converted values, with gaps where values were unreadable",
            show: 'numeric_columns(pd.read_csv("raw_orders.csv"))',
            expr: 'import pandas as pd\nout, missing = numeric_columns(pd.read_csv("raw_orders.csv"))\nresult = (_records(out[["quantity", "unit_price"]]), int(missing))',
            expected: py.tuple(
              py.list(
                ...([
                  [2, 24.5], [1, 120], [5, 3.25], [1, 24.5], [1, 24.5], [2, null], [3, 6], [null, 65], [10, 3.25],
                ] as (number | null)[][]).map(([q, p]) =>
                  py.dict([[s("quantity"), q === null ? py.none : i(q)], [s("unit_price"), p === null ? py.none : f(p)]]),
                ),
              ),
              i(2),
            ),
            compare: { numbers: "int-float-equal" },
            tip: 'pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce") and pd.to_numeric(raw["quantity"], errors="coerce").astype("Int64").',
          },
          { kind: "expr", id: "dtypes", label: "quantity is Int64, unit_price is float64", show: "out.dtypes", expr: 'import pandas as pd\nout, missing = numeric_columns(pd.read_csv("raw_orders.csv"))\nresult = (str(out["quantity"].dtype), str(out["unit_price"].dtype))', expected: py.tuple(s("Int64"), s("float64")) },
          { kind: "expr", id: "input", label: "The input is unchanged", show: 'raw["unit_price"] afterwards', expr: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nnumeric_columns(raw)\nresult = raw["unit_price"].iloc[0]', expected: s("£24.50"), tip: "Build a new frame, rather than assigning into raw." },
        ],
      },
      hints: [
        'qty = pd.to_numeric(raw["quantity"], errors="coerce").astype("Int64").',
        'price = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce").',
        'out = pd.DataFrame({"order_id": raw["order_id"], "quantity": qty, "unit_price": price}); missing = int(out[["quantity", "unit_price"]].isna().sum().sum()).',
      ],
      answer: 'import pandas as pd\n\n\ndef numeric_columns(raw):\n    """Return (order_id, quantity as Int64, unit_price as float; number of missing values)."""\n    qty = pd.to_numeric(raw["quantity"], errors="coerce").astype("Int64")\n    price = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce")\n    out = pd.DataFrame({"order_id": raw["order_id"], "quantity": qty, "unit_price": price})\n    missing = int(out[["quantity", "unit_price"]].isna().sum().sum())\n    return out, missing\n\n\nprint(numeric_columns(pd.read_csv("raw_orders.csv")))',
      wrong: [
        { code: 'import pandas as pd\n\ndef numeric_columns(raw):\n    qty = pd.to_numeric(raw["quantity"], errors="coerce").fillna(0).astype(int)\n    price = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce").fillna(0)\n    out = pd.DataFrame({"order_id": raw["order_id"], "quantity": qty, "unit_price": price})\n    return out, 0\n', fails: ["values", "dtypes"], why: "fills gaps with zero and hides them" },
        { code: 'import pandas as pd\n\ndef numeric_columns(raw):\n    raw["quantity"] = pd.to_numeric(raw["quantity"], errors="coerce").astype("Int64")\n    raw["unit_price"] = pd.to_numeric(raw["unit_price"].str.replace("£", ""), errors="coerce")\n    out = raw[["order_id", "quantity", "unit_price"]]\n    return out, int(out[["quantity", "unit_price"]].isna().sum().sum())\n', fails: ["input"], why: "overwrites the input's columns" },
      ],
    },
    {
      id: "challenge-2",
      title: "Report and handle missing customers",
      prompt:
        "Write `customer_gaps(raw)`, which returns a tuple: the list of `order_id`s with no `customer_id`, and a new DataFrame with those rows **removed** and the remaining `customer_id`s uppercased (some are typed in lowercase). The kept rows keep their original order; renumber the index from 0.",
      looksFor: [
        "The first value lists the order IDs with a missing customer.",
        "The DataFrame excludes those rows, has uppercase customer IDs, and an index from 0.",
        "The input DataFrame isn't changed.",
      ],
      starter: 'import pandas as pd\n\n\ndef customer_gaps(raw):\n    # Return (order_ids without a customer, cleaned frame).\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "values",
            label: "Reports the gaps and drops them",
            show: 'customer_gaps(pd.read_csv("raw_orders.csv"))',
            expr: 'import pandas as pd\nmissing, kept = customer_gaps(pd.read_csv("raw_orders.csv"))\nresult = (list(missing), kept["customer_id"].tolist(), kept.index.tolist())',
            expected: py.tuple(py.list(i(1008)), py.list(...["C01", "C02", "C01", "C03", "C03", "C04", "C02", "C05"].map(s)), py.list(...[0, 1, 2, 3, 4, 5, 6, 7].map((x) => i(x)))),
            tip: 'raw.loc[raw["customer_id"].isna(), "order_id"].tolist() lists the gaps; dropna(subset=["customer_id"]) removes them.',
          },
          { kind: "expr", id: "input", label: "The input is unchanged", show: "len(raw) afterwards", expr: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\ncustomer_gaps(raw)\nresult = (len(raw), raw["customer_id"].iloc[2])', expected: py.tuple(i(9), s("c01")) },
        ],
      },
      hints: [
        'missing = raw.loc[raw["customer_id"].isna(), "order_id"].tolist().',
        'kept = raw.dropna(subset=["customer_id"]).reset_index(drop=True).',
        'kept = kept.assign(customer_id=kept["customer_id"].str.upper()). Return missing, kept.',
      ],
      answer: 'import pandas as pd\n\n\ndef customer_gaps(raw):\n    """Return (order_ids with no customer_id, the other rows with uppercase customer IDs)."""\n    missing = raw.loc[raw["customer_id"].isna(), "order_id"].tolist()\n    kept = raw.dropna(subset=["customer_id"]).reset_index(drop=True)\n    kept = kept.assign(customer_id=kept["customer_id"].str.upper())\n    return missing, kept',
      wrong: [
        { code: 'import pandas as pd\n\ndef customer_gaps(raw):\n    missing = raw.loc[raw["customer_id"].isna(), "order_id"].tolist()\n    kept = raw.dropna().reset_index(drop=True)\n    kept = kept.assign(customer_id=kept["customer_id"].str.upper())\n    return missing, kept\n', fails: ["values"], why: "dropna() without subset drops rows missing any field" },
        { code: 'import pandas as pd\n\ndef customer_gaps(raw):\n    missing = raw.loc[raw["customer_id"].isna(), "order_id"].tolist()\n    kept = raw.assign(customer_id=raw["customer_id"].fillna("UNKNOWN").str.upper())\n    return missing, kept\n', fails: ["values"], why: "fills instead of removing" },
      ],
    },
  ],

  quiz: [
    {
      id: "mean",
      prompt: "`s = pd.Series([10, None, 20])`. What is `s.mean()`?",
      code: "import pandas as pd\nprint(pd.Series([10, None, 20]).mean())",
      options: [
        { text: "`15.0`", correct: true, why: "pandas skips missing values by default: (10 + 20) / 2." },
        { text: "`10.0`", why: "That would be dividing by 3, counting the gap as 0." },
        { text: "`nan`", why: "That's NumPy's behaviour on raw arrays; pandas aggregations skip NaN." },
        { text: "A `TypeError`", why: "`None` in a number list becomes `NaN`, which pandas handles." },
      ],
    },
    {
      id: "coerce",
      prompt: 'What does `pd.to_numeric(pd.Series(["4", "x"]), errors="coerce")` give?',
      options: [
        { text: "`4.0` and `NaN`", correct: true, why: "Readable values are converted; unreadable ones become missing, so you can count them." },
        { text: "A `ValueError`", why: "That's the default, `errors=\"raise\"`. `coerce` turns problems into NaN." },
        { text: '`4` and `"x"`', why: "A column has one type; `coerce` makes it numeric and marks the rest missing." },
        { text: "`4.0` and `0.0`", why: "Unreadable values become NaN, not zero." },
      ],
    },
  ],

  outcomes: [
    "Find and count missing values with `isna`, and filter with `notna`.",
    "Choose deliberately between `dropna`, `fillna` and keeping a gap, and report it.",
    "Convert messy text to numbers with `pd.to_numeric(errors=\"coerce\")`.",
    "Keep whole numbers with gaps as nullable `Int64`.",
  ],
};
