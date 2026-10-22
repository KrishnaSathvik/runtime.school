/**
 * M42 pandas Foundations: five lessons (PY-L42-01 … PY-L42-05).
 *
 * DataFrames and Series, selecting by label and position, filtering with boolean masks, missing values, and column
 * dtypes. The data is Runtime Market (R01): real rows from its orders, order lines, payments, reviews and products
 * tables, trimmed to the columns each example needs. This course runs pandas 3, where text columns show the dtype
 * `str` (pandas 2 shows `object`); the lessons say so where it matters.
 *
 * Challenges are graded by calling the learner's function on records, on CSV files placed next to the program, or on
 * DataFrames built by the check, with hidden inputs (empty tables, missing keys, boundaries, gaps) and, where a
 * function receives a DataFrame, a check that the caller's frame is left unchanged.
 * Version 2: rewritten from a print-one-cell module; saved progress from version 1 does not count as mastery.
 */
import type { PyPackage } from "@/engine/python/client";
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { pv } from "../fn-checks";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const PD = ["pandas"] as const satisfies readonly PyPackage[];
const loose = { numbers: "int-float-equal" } as const;

// ---------------------------------------------------------------- fixtures (Runtime Market, R01)

/** Eight real orders, as the CSV the exercises read. */
export const ORDERS_CSV = `order_id,customer_id,ordered_at,channel,status,promo_code,shipping_fee,total,ship_state
O100282,C00077,2024-01-16 13:03:50,web,delivered,WELCOME10,5.99,35.84,TX
O100376,C00065,2024-01-21 22:19:23,web,returned,FREESHIP,0,91.47,CA
O100918,C01338,2024-02-25 22:28:23,web,returned,,5.99,55.72,NY
O101219,C00077,2024-03-13 10:01:28,web,delivered,,0,246.6,TX
O101723,C01338,2024-04-06 13:01:04,phone,delivered,,0,54.55,NY
O102603,C01339,2024-05-18 14:45:20,marketplace,delivered,,5.99,17.75,TX
O103199,C02264,2024-06-12 12:25:00,app,delivered,,0,64.17,FL
O103332,C02315,2024-06-18 23:05:00,app,cancelled,,5.99,25.24,UT
`;

/** The same orders as records (what a JSON API would return). */
export const orderRecords = ORDERS_CSV.trim().split("\n").slice(1).map((line) => {
  const [order_id, customer_id, ordered_at, channel, status, promo_code, shipping_fee, total, ship_state] = line.split(",");
  return { order_id, customer_id, ordered_at, channel, status, promo_code: promo_code || null, shipping_fee: Number(shipping_fee), total: Number(total), ship_state };
});

const ITEMS_CSV = `order_id,line_no,product_id,quantity,unit_price,discount_rate,line_total
O100282,1,P0164,1,31,0.1,27.9
O100376,1,P0594,1,48,0,48
O100376,2,P0708,1,37.49,0,37.49
O100918,1,P0300,1,3.99,0,3.99
O100918,2,P0762,1,42.49,0,42.49
`;

/** Build a frame for an `expr` check: rows as Python source. */
const frameSetup = (rows: Record<string, unknown>[]) => `import pandas as _pd\n_df = _pd.DataFrame(${JSON.stringify(rows).replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False")})`;

const shipRows = [
  { order_id: "O100282", shipping_fee: 5.99, total: 35.84 },
  { order_id: "O100376", shipping_fee: 0, total: 91.47 },
  { order_id: "O102603", shipping_fee: 5.99, total: 17.75 },
];

const feeRows = [
  { order_id: "O100282", promo_code: "WELCOME10", shipping_fee: 5.99 },
  { order_id: "O100376", promo_code: "FREESHIP", shipping_fee: null },
  { order_id: "O100918", promo_code: null, shipping_fee: null },
  { order_id: "O101219", promo_code: null, shipping_fee: 0 },
];

const payments = [
  { payment_id: "PAY0000313", method: "card", status: "captured", amount: 35.84 },
  { payment_id: "PAY0000417", method: "gift_card", status: "refunded", amount: -91.47 },
  { payment_id: "PAY0001023", method: "card", status: "captured", amount: 0 },
  { payment_id: "PAY0001504", method: "crypto", status: "captured", amount: 46.41 },
  { payment_id: "PAY0002210", method: "paypal", status: "refunded", amount: 54.55 },
];

export const m42Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L42-01 Series and DataFrames
  {
    id: "PY-L42-01",
    version: 2,
    slug: "series-and-dataframes",
    title: "Series and DataFrames",
    lede: "A DataFrame is a table with named columns, each column a Series of one dtype. It reads a CSV in one call and calculates whole columns at once.",
    focus: "Build a DataFrame from records or a CSV, describe it with shape and columns, and compute with whole columns (Series).",
    minutes: 18,
    objectives: [
      "Build a DataFrame from a list of dictionaries and from CSV text with `pd.read_csv`",
      "Describe a table with `shape`, `columns` and `head`, and take one column out as a Series",
      "Add a column calculated from other columns, and explain why Series arithmetic lines values up by index label",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "conversion", "dict-literal", "dict-lookup", "exc-name", "function-def", "function-doc", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "np-array", "np-dtype", "np-reduce", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "tuple-unpack", "type-call", "unquoted-name"],
    teaches: ["pd-frame"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Orders have an ID (text), a channel (text) and a total (a number). A NumPy array wants one dtype for everything, and a list of dictionaries needs a loop for every question. **pandas** gives you a **DataFrame**: a table whose columns each have a name and their own dtype. One column on its own is a **Series**: an array of values plus an **index**, the row labels (0, 1, 2, … unless you choose others).\n\n`pd.DataFrame(records)` builds a table from a list of dictionaries, one per row. `shape` is (rows, columns), `columns` lists the names, and `df[\"total\"]` takes one column out as a Series, which has `sum()`, `mean()`, `max()` and the rest.",
      },
      {
        kind: "example",
        title: "Four orders as a table",
        code: src`
import pandas as pd

orders = pd.DataFrame([
    {"order_id": "O100282", "channel": "web", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "channel": "web", "status": "returned", "total": 91.47},
    {"order_id": "O101723", "channel": "phone", "status": "delivered", "total": 54.55},
    {"order_id": "O103199", "channel": "app", "status": "delivered", "total": 64.17},
])
print(orders)
print(orders.shape, list(orders.columns))
totals = orders["total"]
print(type(totals).__name__, totals.max(), round(totals.sum(), 2))
`,
        output: "  order_id channel     status  total\n0  O100282     web  delivered  35.84\n1  O100376     web   returned  91.47\n2  O101723   phone  delivered  54.55\n3  O103199     app  delivered  64.17\n(4, 4) ['order_id', 'channel', 'status', 'total']\nSeries 91.47 246.03\n",
        note: "The numbers on the left are the index. Each dictionary became a row and each key a column. `round(…, 2)` keeps the printed sum to cents, because float sums can end in …0000003.",
      },
      {
        kind: "error-example",
        title: "A column name with the wrong case",
        code: src`
import pandas as pd

orders = pd.DataFrame([{"order_id": "O100282", "total": 35.84}])
print(orders["Total"].sum())
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: 'Total'`. Column names are exact, like dictionary keys. `list(df.columns)` shows the real ones.",
      },
      {
        kind: "text",
        md: "Most tables arrive as files. `pd.read_csv(path)` reads one, works out each column's dtype, and turns empty cells into missing values. Here the CSV text is wrapped in `io.StringIO`, which makes a string behave like an open file, so the example is self-contained; with a real file you pass its path. The reverse, `df.to_csv(path, index=False)`, writes a table to a CSV file (the Data Formats & Analytical Workflows module covers export options).\n\nArithmetic between columns works value by value, like NumPy, and assigning to a new name adds a column.",
      },
      {
        kind: "example",
        title: "Order lines from a CSV, with a calculated column",
        code: src`
import io
import pandas as pd

csv_text = """order_id,line_no,product_id,quantity,unit_price,discount_rate
O100282,1,P0164,1,31,0.1
O100376,1,P0594,1,48,0
O100376,2,P0708,1,37.49,0
O100918,1,P0300,1,3.99,0
O100918,2,P0762,1,42.49,0
"""
items = pd.read_csv(io.StringIO(csv_text))
items["line_total"] = items["quantity"] * items["unit_price"] * (1 - items["discount_rate"])
print(items.head(3))
print(len(items), "lines,", items["quantity"].sum(), "units")
`,
        output: "  order_id  line_no product_id  quantity  unit_price  discount_rate  line_total\n0  O100282        1      P0164         1       31.00            0.1       27.90\n1  O100376        1      P0594         1       48.00            0.0       48.00\n2  O100376        2      P0708         1       37.49            0.0       37.49\n5 lines, 5 units\n",
        note: "`head(3)` shows the first three rows, the usual first look at a file. `len(df)` is the number of rows. The new column was computed for all five rows at once.",
      },
      {
        kind: "text",
        md: "**Index alignment.** When two Series are combined, pandas pairs values by **index label**, not by position. Columns of one DataFrame share an index, so that is invisible; but two separately built Series of different lengths give missing values (`NaN`) where a label exists in only one of them.\n\n**When to use a DataFrame:** tabular data with named columns of different kinds, especially from files. **Mistakes to avoid:** misspelt column names; assigning a new column to a DataFrame your function was *given* (that changes the caller's table: build the result on a copy); and assuming position-based pairing between unrelated Series.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Revenue before tax",
      prompt: "`revenue_without_tax` adds up the `total` column. Finance wants the revenue **before tax**: subtract each order's `tax` from its `total` first, then add them up.",
      spec: [
        ["Function", "`revenue_without_tax(records)`"],
        ["records", "a list of dictionaries with `total` and `tax`"],
        ["Returns", "the sum of total − tax over every order"],
        ["Example", "`[{\"total\": 35.84, \"tax\": 1.95}, {\"total\": 91.47, \"tax\": 5.98}]` → `119.38`"],
      ],
      starter: src`
import pandas as pd

def revenue_without_tax(records):
    orders = pd.DataFrame(records)
    return float(orders["total"].sum())

print(revenue_without_tax([{"total": 35.84, "tax": 1.95}, {"total": 91.47, "tax": 5.98}]))
`,
      answer: src`
import pandas as pd

def revenue_without_tax(records):
    orders = pd.DataFrame(records)
    return float((orders["total"] - orders["tax"]).sum())

print(revenue_without_tax([{"total": 35.84, "tax": 1.95}, {"total": 91.47, "tax": 5.98}]))
`,
      alternatives: [
        src`
import pandas as pd

def revenue_without_tax(records):
    orders = pd.DataFrame(records)
    return float(orders["total"].sum() - orders["tax"].sum())
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def revenue_without_tax(records):
    orders = pd.DataFrame(records)
    return float(orders["total"].sum() - orders["tax"].max())
`,
          fails: ["returns"],
          why: "only the largest tax is taken off, not every order's tax",
        },
      ],
      hints: ["Two columns line up row by row.", "Subtract the tax column from the total column, then reduce.", "Return a plain float."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "revenue_without_tax", [
            example([[{ total: 35.84, tax: 1.95 }, { total: 91.47, tax: 5.98 }]], 119.38),
            hiddenCase("a single order", [[{ total: 246.6, tax: 16.13 }]], 230.47),
            hiddenCase("three orders", [[{ total: 54.55, tax: 3.57 }, { total: 17.75, tax: 0.77 }, { total: 64.17, tax: 4.2 }]], 127.93),
          ], { label: "revenue_without_tax() sums total − tax", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Summarise an order-lines file",
        prompt: "Write `basket_summary(path)`: read the order-lines CSV at `path` and return a dictionary with the number of `lines`, the number of `units` (the sum of `quantity`) and the `revenue` (the sum of `line_total`). A file with a header and no rows gives zeros.",
        spec: [
          ["Function", "`basket_summary(path)`"],
          ["File", "a CSV with columns `order_id,line_no,product_id,quantity,unit_price,discount_rate,line_total`"],
          ["Returns", "`{\"lines\": int, \"units\": int, \"revenue\": float}`"],
          ["Example", "`basket_summary(\"items.csv\")` (the file next to your program) → `{'lines': 5, 'units': 5, 'revenue': 159.87}`"],
        ],
        starter: src`
import pandas as pd

def basket_summary(path):
    return {"lines": 0, "units": 0, "revenue": 0.0}

print(basket_summary("items.csv"))
`,
        answer: src`
import pandas as pd

def basket_summary(path):
    items = pd.read_csv(path)
    return {
        "lines": len(items),
        "units": int(items["quantity"].sum()),
        "revenue": float(items["line_total"].sum()),
    }

print(basket_summary("items.csv"))
`,
        alternatives: [
          src`
import pandas as pd

def basket_summary(path):
    items = pd.read_csv(path)
    rows, _ = items.shape
    return {"lines": rows, "units": items["quantity"].sum(), "revenue": items["line_total"].sum()}
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def basket_summary(path):
    items = pd.read_csv(path)
    return {"lines": len(items), "units": len(items), "revenue": float(items["line_total"].sum())}
`,
            fails: ["returns"],
            why: "it counts lines as units, so a line with quantity 3 counts once",
          },
          {
            code: src`
import pandas as pd

def basket_summary(path):
    items = pd.read_csv(path)
    return {"lines": len(items), "units": int(items["quantity"].sum()), "revenue": float(items["unit_price"].sum())}
`,
            fails: ["returns"],
            why: "unit prices ignore quantities and discounts; the revenue is in `line_total`",
          },
        ],
        hints: [
          "One call turns the file into a DataFrame.",
          "Each value in the result comes from one column (or from the row count).",
          "Convert the NumPy results with `int()` and `float()` so the dictionary holds plain numbers.",
        ],
        task: {
          packages: PD,
          files: {
            "items.csv": ITEMS_CSV,
            "items_bulk.csv": "order_id,line_no,product_id,quantity,unit_price,discount_rate,line_total\nO101219,1,P0005,3,171.99,0.1,464.37\nO101219,2,P0006,2,50.99,0,101.98\n",
            "items_empty.csv": "order_id,line_no,product_id,quantity,unit_price,discount_rate,line_total\n",
            "items_one.csv": "order_id,line_no,product_id,quantity,unit_price,discount_rate,line_total\nO102603,1,P0007,1,10.99,0,10.99\n",
          },
          checks: [
            fn("returns", "basket_summary", [
              example(["items.csv"], { lines: 5, units: 5, revenue: 159.87 }),
              hiddenCase("lines with quantities above 1", ["items_bulk.csv"], { lines: 2, units: 5, revenue: 566.35 }),
              hiddenCase("a header and no rows", ["items_empty.csv"], { lines: 0, units: 0, revenue: 0 }),
              hiddenCase("a single line", ["items_one.csv"], { lines: 1, units: 1, revenue: 10.99 }),
            ], { label: "basket_summary() counts lines and units and adds up revenue", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "Shipping as a share of the order",
        prompt: "Write `with_shipping_share(orders)`: it receives a DataFrame with `order_id`, `shipping_fee` and `total`, and returns a **new** DataFrame with one more column, `shipping_share` = shipping_fee / total. The caller's DataFrame must keep exactly the columns it had.",
        spec: [
          ["Function", "`with_shipping_share(orders)`"],
          ["orders", "a DataFrame with `order_id`, `shipping_fee`, `total`"],
          ["Returns", "a new DataFrame: the same columns plus `shipping_share`"],
          ["Example", "fee 5.99 on a 35.84 order → share 0.16713…; free shipping → 0.0"],
        ],
        starter: src`
import pandas as pd

def with_shipping_share(orders):
    return orders

orders = pd.DataFrame([
    {"order_id": "O100282", "shipping_fee": 5.99, "total": 35.84},
    {"order_id": "O100376", "shipping_fee": 0.0, "total": 91.47},
])
print(with_shipping_share(orders))
print(list(orders.columns))
`,
        answer: src`
import pandas as pd

def with_shipping_share(orders):
    result = orders.copy()
    result["shipping_share"] = result["shipping_fee"] / result["total"]
    return result

orders = pd.DataFrame([
    {"order_id": "O100282", "shipping_fee": 5.99, "total": 35.84},
    {"order_id": "O100376", "shipping_fee": 0.0, "total": 91.47},
])
print(with_shipping_share(orders))
print(list(orders.columns))
`,
        alternatives: [
          src`
import pandas as pd

def with_shipping_share(orders):
    return orders.assign(shipping_share=orders["shipping_fee"] / orders["total"])
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def with_shipping_share(orders):
    orders["shipping_share"] = orders["shipping_fee"] / orders["total"]
    return orders
`,
            fails: ["keeps-input"],
            why: "the share is right, but the column is added to the caller's DataFrame",
          },
          {
            code: src`
import pandas as pd

def with_shipping_share(orders):
    result = orders.copy()
    result["shipping_share"] = result["total"] / result["shipping_fee"]
    return result
`,
            fails: ["returns", "returns-hidden"],
            why: "the division is upside down (and free shipping divides by zero)",
          },
        ],
        hints: [
          "Two problems: the calculation, and where the new column goes.",
          "Work on a copy of the table you were given, or use a method that returns a new DataFrame.",
          "The share is fee divided by total, row by row.",
        ],
        task: {
          packages: PD,
          checks: [
            { kind: "expr", id: "returns", label: "with_shipping_share() adds fee / total", show: "with_shipping_share(orders)", expr: `${frameSetup(shipRows)}\nresult = with_shipping_share(_df)["shipping_share"].tolist()`, expected: pv([0.16713169642857142, 0.0, 0.33746478873239435]), compare: loose },
            { kind: "expr", id: "columns", label: "The result keeps the original columns and adds shipping_share", expr: `${frameSetup(shipRows)}\nresult = [str(c) for c in with_shipping_share(_df).columns]`, expected: pv(["order_id", "shipping_fee", "total", "shipping_share"]) },
            { kind: "expr", id: "returns-hidden", label: "Works for other orders (a single order, an order that is all shipping)", hidden: true, expr: `${frameSetup([{ order_id: "A", shipping_fee: 2, total: 8 }])}\n_a = with_shipping_share(_df)["shipping_share"].tolist()\n${frameSetup([{ order_id: "B", shipping_fee: 5.99, total: 5.99 }, { order_id: "C", shipping_fee: 1, total: 4 }])}\nresult = _a + with_shipping_share(_df)["shipping_share"].tolist()`, expected: pv([0.25, 1.0, 0.25]), compare: loose },
            { kind: "expr", id: "keeps-input", label: "with_shipping_share() leaves the caller's DataFrame unchanged", expr: `${frameSetup(shipRows)}\nwith_shipping_share(_df)\nresult = [str(c) for c in _df.columns]`, expected: pv(["order_id", "shipping_fee", "total"]) },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

reviews = pd.DataFrame([
    {"review_id": "R000103", "rating": 5},
    {"review_id": "R000140", "rating": 2},
    {"review_id": "R000188", "rating": 4},
])
print(reviews.shape, reviews["rating"].mean())
`,
        choices: ["(3, 2) 3.6666666666666665", "(2, 3) 3.6666666666666665", "(3, 2) 11", "(3,) 3.6666666666666665"],
        answer: 0,
        why: "Three rows and two columns; `mean()` of 5, 2 and 4 is 11 / 3.",
      },
      {
        id: "q2",
        prompt: "A common mistake: combining two Series built separately. What does this print?",
        program: src`
import pandas as pd

monday = pd.Series([10, 20])
tuesday = pd.Series([1, 2, 3])
print((monday + tuesday).tolist())
`,
        choices: ["[11.0, 22.0, nan]", "[11, 22, 3]", "[11, 22]", "an error: the lengths differ"],
        answer: 0,
        why: "Values are paired by index label: labels 0 and 1 exist in both, label 2 only in `tuesday`, so its result is missing (NaN), which also makes the column float.",
      },
      {
        id: "q3",
        prompt: "What is a Series?",
        choices: ["One column of values with an index of row labels", "A list of DataFrames", "A row of a CSV file as text", "A DataFrame with exactly one row"],
        answer: 0,
        why: "`df[\"total\"]` is a Series: the values plus the index they share with the rest of the table.",
      },
    ],
    review: [
      "A DataFrame is a table of named columns; each column is a Series with its own dtype and a shared index.",
      "`pd.DataFrame(records)` and `pd.read_csv(path)` build tables; `shape`, `columns` and `head()` describe them.",
      "Column arithmetic is element by element; add a column on a copy when the table was given to you.",
      "Next: pick rows and columns by label and by position.",
    ],
  },

  // ------------------------------------------------------------------ PY-L42-02 selection
  {
    id: "PY-L42-02",
    version: 2,
    slug: "select-rows-and-columns",
    title: "Selecting rows and columns",
    lede: "loc selects by label, iloc by position. With a meaningful index such as the order ID, loc answers lookups directly; after sort_values, iloc takes the top rows.",
    focus: "Pick rows and columns with df[[...]], loc (labels) and iloc (positions), after set_index or sort_values when the question needs it.",
    minutes: 18,
    objectives: [
      "Select several columns with a list, and one cell or row with `loc[label, column]`",
      "Use `set_index` to look rows up by a key, and check membership with `in df.index`",
      "Order rows with `sort_values` and take positions with `iloc`, knowing that a `loc` slice includes its end",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conversion", "dict-literal", "dict-lookup", "except-type", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "lambda", "len-call", "list-index", "list-literal", "list-sort", "logical", "membership", "none-value", "np-array", "np-dtype", "np-index", "pd-frame", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "sort-key", "string-index", "string-slice", "top-level-indent", "try-except"],
    teaches: ["pd-loc"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Two kinds of question pick rows. *Show me order O100376* is a **label** lookup: `loc`. *Show me the three biggest orders* is a **position** question after ordering: `sort_values` then `iloc`. Inside `loc[...]` and `iloc[...]` the row comes first and the column second, as in NumPy. `set_index(\"order_id\")` makes a column the row labels, so `loc` can find a row by its ID.",
      },
      {
        kind: "example",
        title: "Look orders up by ID",
        code: src`
import pandas as pd

orders = pd.DataFrame([
    {"order_id": "O100282", "status": "delivered", "ship_state": "TX", "total": 35.84},
    {"order_id": "O100376", "status": "returned", "ship_state": "CA", "total": 91.47},
    {"order_id": "O100918", "status": "returned", "ship_state": "NY", "total": 55.72},
    {"order_id": "O101219", "status": "delivered", "ship_state": "TX", "total": 246.6},
]).set_index("order_id")
print(orders.loc["O100376", "total"])
print(orders.loc["O100918", ["status", "ship_state"]].tolist())
print(orders.loc["O100376":"O101219", ["status", "total"]])
print("O999999" in orders.index)
`,
        output: "91.47\n['returned', 'NY']\n             status   total\norder_id                   \nO100376    returned   91.47\nO100918    returned   55.72\nO101219   delivered  246.60\nFalse\n",
        note: "One label and one column give one value; one label and a list of columns give a Series of those values. A `loc` slice of labels **includes** its end (O101219 is there), unlike Python slices. `in orders.index` checks a label without raising.",
      },
      {
        kind: "error-example",
        title: "A position given to loc",
        code: src`
import pandas as pd

orders = pd.DataFrame([{"order_id": "O100282", "total": 35.84}]).set_index("order_id")
print(orders.loc[0])
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: 0`. After `set_index`, the labels are order IDs; 0 is a position, which is `iloc[0]`.",
      },
      {
        kind: "example",
        title: "The three largest orders",
        code: src`
import pandas as pd

orders = pd.DataFrame([
    {"order_id": "O100282", "channel": "web", "total": 35.84},
    {"order_id": "O100376", "channel": "web", "total": 91.47},
    {"order_id": "O101219", "channel": "web", "total": 246.6},
    {"order_id": "O101723", "channel": "phone", "total": 54.55},
    {"order_id": "O103199", "channel": "app", "total": 64.17},
])
ranked = orders.sort_values("total", ascending=False)
print(ranked.iloc[:3]["order_id"].tolist())
print(ranked.iloc[0]["channel"], ranked.index[0])
print(orders[["order_id", "total"]].shape)
`,
        output: "['O101219', 'O100376', 'O103199']\nweb 2\n(5, 2)\n",
        note: "`sort_values` returns a new, reordered table and keeps each row's original label (the largest order was row 2). `iloc[:3]` then means the first three positions in the new order. `df[[\"order_id\", \"total\"]]`, with a list inside the brackets, selects several columns.",
      },
      {
        kind: "text",
        md: "**When to use which:** `loc` when you know the label (an ID, a date), `iloc` when you know the position (first, last, top n after sorting), `df[[...]]` to keep only some columns. **Mistakes to avoid:** `df[\"a\", \"b\"]` (one key that is a tuple, a KeyError) instead of `df[[\"a\", \"b\"]]`; mixing up labels and positions after `sort_values` or `set_index`; and forgetting that a `loc` slice includes its end.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The biggest orders, not the smallest",
      prompt: "`top_orders` returns the IDs of the `n` **cheapest** orders. Change it to return the `n` most expensive, largest first.",
      spec: [
        ["Function", "`top_orders(records, n)`"],
        ["Returns", "a list of `n` order IDs, largest total first"],
        ["Example", "the starter's orders with `n` 2 → `['O100376', 'O100918']`"],
      ],
      starter: src`
import pandas as pd

def top_orders(records, n):
    orders = pd.DataFrame(records)
    ranked = orders.sort_values("total")
    return ranked.iloc[:n]["order_id"].tolist()

orders = [
    {"order_id": "O100282", "total": 35.84},
    {"order_id": "O100376", "total": 91.47},
    {"order_id": "O100918", "total": 55.72},
]
print(top_orders(orders, 2))
`,
      answer: src`
import pandas as pd

def top_orders(records, n):
    orders = pd.DataFrame(records)
    ranked = orders.sort_values("total", ascending=False)
    return ranked.iloc[:n]["order_id"].tolist()

orders = [
    {"order_id": "O100282", "total": 35.84},
    {"order_id": "O100376", "total": 91.47},
    {"order_id": "O100918", "total": 55.72},
]
print(top_orders(orders, 2))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def top_orders(records, n):
    orders = pd.DataFrame(records)
    ranked = orders.sort_values("total")
    return ranked.iloc[-n:]["order_id"].tolist()
`,
          fails: ["returns"],
          why: "the right orders, but smallest first",
        },
      ],
      hints: ["`sort_values` can order either way.", "Its `ascending` argument decides the direction.", "Keep the `iloc` slice as it is."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "top_orders", [
            example([[{ order_id: "O100282", total: 35.84 }, { order_id: "O100376", total: 91.47 }, { order_id: "O100918", total: 55.72 }], 2], ["O100376", "O100918"]),
            hiddenCase("n of 1", [[{ order_id: "A", total: 5 }, { order_id: "B", total: 9 }], 1], ["B"]),
            hiddenCase("n larger than the table", [[{ order_id: "A", total: 5 }, { order_id: "B", total: 9 }], 5], ["B", "A"]),
          ], { label: "top_orders() returns the n largest orders, largest first" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Look up one order",
        prompt: "A support screen asks for one order by ID. Write `order_lookup(records, order_id)`: return `{\"status\": …, \"total\": …}` for that order, or `None` if there is no such order.",
        spec: [
          ["Function", "`order_lookup(records, order_id)`"],
          ["records", "a list of order dictionaries (`order_id`, `status`, `total`, and more)"],
          ["Returns", "a dictionary with the order's `status` and `total`, or `None`"],
          ["Example", "the eight orders with `\"O101723\"` → `{'status': 'delivered', 'total': 54.55}`"],
        ],
        starter: src`
import pandas as pd

def order_lookup(records, order_id):
    return None

orders = [
    {"order_id": "O100376", "status": "returned", "total": 91.47},
    {"order_id": "O101723", "status": "delivered", "total": 54.55},
]
print(order_lookup(orders, "O101723"))
`,
        answer: src`
import pandas as pd

def order_lookup(records, order_id):
    orders = pd.DataFrame(records)
    if len(orders) == 0:
        return None
    orders = orders.set_index("order_id")
    if order_id not in orders.index:
        return None
    row = orders.loc[order_id]
    return {"status": row["status"], "total": float(row["total"])}

orders = [
    {"order_id": "O100376", "status": "returned", "total": 91.47},
    {"order_id": "O101723", "status": "delivered", "total": 54.55},
]
print(order_lookup(orders, "O101723"))
`,
        alternatives: [
          src`
import pandas as pd

def order_lookup(records, order_id):
    orders = pd.DataFrame(records, columns=["order_id", "status", "total"]).set_index("order_id")
    if order_id in orders.index:
        return {"status": orders.loc[order_id, "status"], "total": orders.loc[order_id, "total"]}
    return None
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def order_lookup(records, order_id):
    orders = pd.DataFrame(records).set_index("order_id")
    row = orders.loc[order_id]
    return {"status": row["status"], "total": float(row["total"])}
`,
            fails: ["returns"],
            why: "an unknown order ID raises KeyError instead of returning None",
          },
          {
            code: src`
import pandas as pd

def order_lookup(records, order_id):
    orders = pd.DataFrame(records)
    if order_id not in orders["order_id"].tolist():
        return None
    row = orders.iloc[0]
    return {"status": row["status"], "total": float(row["total"])}
`,
            fails: ["returns"],
            why: "it checks the ID exists but then returns the first row, not that order's",
          },
        ],
        hints: [
          "Make the order ID the row label, so the lookup is one `loc`.",
          "Check that the label exists before reading the row.",
          "An empty list of records has no `order_id` column at all; decide that case first.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "order_lookup", [
              example([orderRecords, "O101723"], { status: "delivered", total: 54.55 }),
              example([orderRecords, "O100376"], { status: "returned", total: 91.47 }),
              example([orderRecords, "O999999"], null),
              hiddenCase("the last order in the list", [orderRecords, "O103332"], { status: "cancelled", total: 25.24 }),
              hiddenCase("a single order", [[{ order_id: "O1", status: "shipped", total: 10 }], "O1"], { status: "shipped", total: 10 }),
              hiddenCase("no orders at all", [[], "O100282"], null),
            ], { label: "order_lookup() finds an order by ID, or returns None", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "One page of recent orders",
        prompt: "An order-history screen shows `size` orders per page, newest first. Write `orders_page(records, page, size)`: sort by `ordered_at` (newest first) and return the order IDs on page `page`, where page 1 is the first. A page past the end is empty; a page below 1 raises `ValueError`.",
        spec: [
          ["Function", "`orders_page(records, page, size)`"],
          ["ordered_at", "text like `\"2024-06-12 12:25:00\"`, which sorts correctly as text"],
          ["Returns", "a list of at most `size` order IDs"],
          ["Raises", "`ValueError` when `page < 1`"],
          ["Example", "the eight orders, page 1, size 3 → `['O103332', 'O103199', 'O102603']`"],
        ],
        starter: src`
import pandas as pd

def orders_page(records, page, size):
    return []

orders = [
    {"order_id": "O100282", "ordered_at": "2024-01-16 13:03:50"},
    {"order_id": "O103199", "ordered_at": "2024-06-12 12:25:00"},
    {"order_id": "O101723", "ordered_at": "2024-04-06 13:01:04"},
]
print(orders_page(orders, 1, 2))
`,
        answer: src`
import pandas as pd

def orders_page(records, page, size):
    if page < 1:
        raise ValueError("pages start at 1")
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at"])
    newest = orders.sort_values("ordered_at", ascending=False)
    start = (page - 1) * size
    return newest.iloc[start:start + size]["order_id"].tolist()

orders = [
    {"order_id": "O100282", "ordered_at": "2024-01-16 13:03:50"},
    {"order_id": "O103199", "ordered_at": "2024-06-12 12:25:00"},
    {"order_id": "O101723", "ordered_at": "2024-04-06 13:01:04"},
]
print(orders_page(orders, 1, 2))
`,
        alternatives: [
          src`
import pandas as pd

def orders_page(records, page, size):
    if page < 1:
        raise ValueError("bad page")
    ids = [r["order_id"] for r in sorted(records, key=lambda r: r["ordered_at"], reverse=True)]
    return ids[(page - 1) * size:page * size]
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def orders_page(records, page, size):
    if page < 1:
        raise ValueError("pages start at 1")
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at"])
    newest = orders.sort_values("ordered_at", ascending=False)
    start = page * size
    return newest.iloc[start:start + size]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "page 1 skips the first `size` orders: pages are counted from 1, positions from 0",
          },
          {
            code: src`
import pandas as pd

def orders_page(records, page, size):
    if page < 1:
        raise ValueError("pages start at 1")
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at"])
    newest = orders.sort_values("ordered_at", ascending=False)
    start = (page - 1) * size
    return newest.loc[start:start + size]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "`loc` slices by the original row labels (and includes the end), not by position in the sorted table",
          },
          {
            code: src`
import pandas as pd

def orders_page(records, page, size):
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at"])
    newest = orders.sort_values("ordered_at", ascending=False)
    start = (page - 1) * size
    return newest.iloc[start:start + size]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "page 0 is accepted and returns an empty page instead of raising",
          },
        ],
        hints: [
          "Order first, newest at the top; then the page is a run of positions.",
          "Page 1 starts at position 0; work out where page `page` starts.",
          "Positions in a sorted table need `iloc`, not `loc`. Check the page number before anything else.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "orders_page", [
              example([orderRecords, 1, 3], ["O103332", "O103199", "O102603"]),
              example([orderRecords, 3, 3], ["O100376", "O100282"]),
              example([orderRecords, 4, 3], []),
              raisesCase([orderRecords, 0, 3], "ValueError"),
              hiddenCase("the middle page", [orderRecords, 2, 3], ["O101723", "O101219", "O100918"]),
              hiddenCase("a page size of 1", [orderRecords, 8, 1], ["O100282"]),
              hiddenCase("no orders", [[], 1, 5], []),
              raisesCase([orderRecords, -1, 2], "ValueError", { label: "a negative page" }),
            ], { label: "orders_page() returns one page of orders, newest first" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

totals = pd.DataFrame({"total": [35.84, 91.47, 55.72, 246.6]}, index=["a", "b", "c", "d"])
print(totals.loc["b":"c", "total"].tolist(), totals.iloc[1:2]["total"].tolist())
`,
        choices: ["[91.47, 55.72] [91.47]", "[91.47] [91.47]", "[91.47, 55.72] [91.47, 55.72]", "[55.72] [91.47]"],
        answer: 0,
        why: "A `loc` label slice includes its end label (b and c); an `iloc` position slice stops before its end (position 1 only).",
      },
      {
        id: "q2",
        prompt: "A common mistake: two column names in single brackets. What does this print?",
        program: src`
import pandas as pd

orders = pd.DataFrame([{"order_id": "O100282", "status": "delivered", "total": 35.84}])
try:
    print(orders["order_id", "total"])
except KeyError:
    print("KeyError")
`,
        choices: ["KeyError", "  order_id  total\n0  O100282  35.84", "O100282 35.84", "['O100282', 35.84]"],
        answer: 0,
        why: "`orders[\"order_id\", \"total\"]` asks for one column named by the tuple `(\"order_id\", \"total\")`. A list of names, `orders[[\"order_id\", \"total\"]]`, selects two columns.",
      },
      {
        id: "q3",
        prompt: "After `ranked = orders.sort_values(\"total\")`, which expression is the cheapest order's row?",
        choices: ["`ranked.iloc[0]`", "`ranked.loc[0]`", "`orders.iloc[0]`", "`ranked[0]`"],
        answer: 0,
        why: "Sorting keeps the original labels, so label 0 may be anywhere; position 0 of the sorted table is the cheapest.",
      },
    ],
    review: [
      "`loc[row_label, column]` selects by label (slices include the end); `iloc` selects by position.",
      "`set_index` makes a key column the labels; `in df.index` checks one exists.",
      "`sort_values` then `iloc[:n]` gives the top n; `df[[...]]` keeps chosen columns.",
      "Next: keep only the rows that pass a test.",
    ],
  },

  // ------------------------------------------------------------------ PY-L42-03 filtering
  {
    id: "PY-L42-03",
    version: 2,
    slug: "filter-rows-with-masks",
    title: "Filtering rows",
    lede: "A comparison on a column gives a True/False Series; putting it inside df[...] keeps the rows where it is True. isin, between and the .str methods build tests for lists, ranges and text.",
    focus: "Keep the rows that pass a test with boolean masks, combining tests with &, | and ~.",
    minutes: 18,
    objectives: [
      "Filter rows with `df[mask]`, where the mask is a comparison on a column",
      "Combine conditions with `&`, `|` and `~`, wrapping each comparison in parentheses",
      "Build tests with `isin`, `between` and `.str` methods such as `str.endswith`",
    ],
    requires: ["assignment", "bitwise", "comparison", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "np-dtype", "pd-frame", "print-call", "print-several", "print-text", "reassignment", "string-index", "string-method", "top-level-indent", "try-except"],
    teaches: ["pd-filter"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Filtering a DataFrame works like masking a NumPy array: `orders[\"total\"] > 50` is a Series of True/False, one per row, and `orders[that_series]` keeps the rows where it is True, with their original labels. Tests combine with `&` (and), `|` (or) and `~` (not); like in NumPy, each comparison needs its own parentheses.",
      },
      {
        kind: "example",
        title: "Delivered web orders over $50",
        code: src`
import pandas as pd

orders = pd.DataFrame([
    {"order_id": "O100282", "channel": "web", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "channel": "web", "status": "returned", "total": 91.47},
    {"order_id": "O101219", "channel": "web", "status": "delivered", "total": 246.6},
    {"order_id": "O101723", "channel": "phone", "status": "delivered", "total": 54.55},
    {"order_id": "O103199", "channel": "app", "status": "delivered", "total": 64.17},
])
big = orders["total"] > 50
print(big.tolist())
web_big = orders[(orders["channel"] == "web") & (orders["status"] == "delivered") & big]
print(web_big["order_id"].tolist())
not_web = orders[~(orders["channel"] == "web")]
print(not_web["order_id"].tolist(), not_web.index.tolist())
`,
        output: "[False, True, True, True, True]\n['O101219']\n['O101723', 'O103199'] [3, 4]\n",
        note: "Three masks joined with `&`: all must be True. The kept rows keep their labels (3 and 4), which is how you can tell where they came from.",
      },
      {
        kind: "error-example",
        title: "`and` between two Series",
        code: src`
import pandas as pd

orders = pd.DataFrame([{"status": "returned", "total": 91.47}, {"status": "delivered", "total": 35.84}])
print(orders[orders["status"] == "returned" and orders["total"] > 50])
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: The truth value of a Series is ambiguous`. `and` wants one True or False; use `&` with parentheses around each comparison.",
      },
      {
        kind: "example",
        title: "Lists, ranges and text tests",
        code: src`
import pandas as pd

customers = pd.DataFrame([
    {"customer_id": "C00038", "email": "nora_garcia@fastmail.com", "state": "NY", "orders": 3},
    {"customer_id": "C00065", "email": "irishaddad32@gmail.com", "state": "CA", "orders": 1},
    {"customer_id": "C00071", "email": "arjun_mensah@gmail.com", "state": "TX", "orders": 6},
    {"customer_id": "C00077", "email": "jamal.walker62@icloud.com", "state": "TX", "orders": 2},
])
west_or_south = customers[customers["state"].isin(["CA", "TX"])]
print(west_or_south["customer_id"].tolist())
gmail = customers["email"].str.endswith("@gmail.com")
print(customers[gmail & customers["orders"].between(2, 6)]["customer_id"].tolist())
`,
        output: "['C00065', 'C00071', 'C00077']\n['C00071']\n",
        note: "`isin` tests membership in a list for every row. `between(2, 6)` includes both ends. `.str` gives string methods that run on every value of a text column.",
      },
      {
        kind: "text",
        md: "**When to use it:** every *which rows?* question. **Mistakes to avoid:** `and`/`or` instead of `&`/`|`; a missing parenthesis (`orders[\"total\"] > 50 & big` compares against `50 & big`); `==` on a list (use `isin`); and forgetting that `between` includes both ends.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Returned or cancelled",
      prompt: "`problem_orders` returns the IDs of returned orders only. Support also wants the cancelled ones: change the test so either status is kept.",
      spec: [
        ["Function", "`problem_orders(records)`"],
        ["Returns", "order IDs whose status is `returned` or `cancelled`, in their original order"],
      ],
      starter: src`
import pandas as pd

def problem_orders(records):
    orders = pd.DataFrame(records)
    kept = orders[orders["status"] == "returned"]
    return kept["order_id"].tolist()

orders = [
    {"order_id": "O100376", "status": "returned"},
    {"order_id": "O101219", "status": "delivered"},
    {"order_id": "O103332", "status": "cancelled"},
]
print(problem_orders(orders))
`,
      answer: src`
import pandas as pd

def problem_orders(records):
    orders = pd.DataFrame(records)
    kept = orders[orders["status"].isin(["returned", "cancelled"])]
    return kept["order_id"].tolist()

orders = [
    {"order_id": "O100376", "status": "returned"},
    {"order_id": "O101219", "status": "delivered"},
    {"order_id": "O103332", "status": "cancelled"},
]
print(problem_orders(orders))
`,
      alternatives: [
        src`
import pandas as pd

def problem_orders(records):
    orders = pd.DataFrame(records)
    kept = orders[(orders["status"] == "returned") | (orders["status"] == "cancelled")]
    return kept["order_id"].tolist()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def problem_orders(records):
    orders = pd.DataFrame(records)
    kept = orders[orders["status"] != "delivered"]
    return kept["order_id"].tolist()
`,
          fails: ["returns"],
          why: "`!= \"delivered\"` also keeps shipped orders",
        },
      ],
      hints: ["Two statuses should pass now.", "Either test the status against a list, or join two comparisons with `|`.", "Keep `tolist()` at the end."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "problem_orders", [
            example([orderRecords], ["O100376", "O100918", "O103332"]),
            hiddenCase("a shipped order", [[{ order_id: "A", status: "shipped" }, { order_id: "B", status: "cancelled" }]], ["B"]),
            hiddenCase("only delivered orders", [[{ order_id: "A", status: "delivered" }]], []),
          ], { label: "problem_orders() keeps returned and cancelled orders" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Returns shipped to chosen states",
        prompt: "A regional team investigates returns. Write `returns_in_states(records, states)`: return the IDs of orders whose `status` is `\"returned\"` **and** whose `ship_state` is one of `states`, in their original order.",
        spec: [
          ["Function", "`returns_in_states(records, states)`"],
          ["states", "a list of two-letter state codes"],
          ["Returns", "a list of order IDs; `[]` when none match"],
          ["Example", "the eight orders with `[\"CA\", \"NY\"]` → `['O100376', 'O100918']`"],
        ],
        starter: src`
import pandas as pd

def returns_in_states(records, states):
    return []

orders = [
    {"order_id": "O100376", "status": "returned", "ship_state": "CA"},
    {"order_id": "O100918", "status": "returned", "ship_state": "NY"},
    {"order_id": "O101723", "status": "delivered", "ship_state": "NY"},
]
print(returns_in_states(orders, ["NY"]))
`,
        answer: src`
import pandas as pd

def returns_in_states(records, states):
    orders = pd.DataFrame(records, columns=["order_id", "status", "ship_state"])
    keep = (orders["status"] == "returned") & orders["ship_state"].isin(states)
    return orders[keep]["order_id"].tolist()

orders = [
    {"order_id": "O100376", "status": "returned", "ship_state": "CA"},
    {"order_id": "O100918", "status": "returned", "ship_state": "NY"},
    {"order_id": "O101723", "status": "delivered", "ship_state": "NY"},
]
print(returns_in_states(orders, ["NY"]))
`,
        alternatives: [
          src`
def returns_in_states(records, states):
    return [r["order_id"] for r in records if r["status"] == "returned" and r["ship_state"] in states]
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def returns_in_states(records, states):
    orders = pd.DataFrame(records, columns=["order_id", "status", "ship_state"])
    keep = (orders["status"] == "returned") | orders["ship_state"].isin(states)
    return orders[keep]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "`|` keeps every order shipped to those states, returned or not",
          },
          {
            code: src`
import pandas as pd

def returns_in_states(records, states):
    orders = pd.DataFrame(records, columns=["order_id", "status", "ship_state"])
    keep = orders["status"] == "returned"
    return orders[keep]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "the state list is ignored",
          },
        ],
        hints: [
          "Two tests, both required.",
          "One test compares the status; the other checks the state against a list.",
          "Join the masks with the and-operator for Series, then select the ID column.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "returns_in_states", [
              example([orderRecords, ["CA", "NY"]], ["O100376", "O100918"]),
              example([orderRecords, ["TX"]], []),
              example([orderRecords, ["NY"]], ["O100918"]),
              hiddenCase("a state list with no returns in it", [orderRecords, ["FL", "UT"]], []),
              hiddenCase("an empty state list", [orderRecords, []], []),
              hiddenCase("no orders", [[], ["CA"]], []),
            ], { label: "returns_in_states() keeps returned orders shipped to the given states" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Payments that need a second look",
        prompt: "A payments audit flags three kinds of record: a **captured** payment whose amount is 0 or less; a **refunded** payment whose amount is not negative (refunds are stored as negative amounts); and any payment whose `method` is not one of `card`, `paypal`, `apple_pay`, `gift_card` or `bank_transfer`. Write `payments_to_review(records)`: return the `payment_id` of every flagged payment, each once, in their original order.",
        spec: [
          ["Function", "`payments_to_review(records)`"],
          ["records", "dictionaries with `payment_id`, `method`, `status`, `amount`"],
          ["Returns", "a list of payment IDs"],
          ["Example", "a captured card payment of 0.00 and a `crypto` payment are flagged; a refunded −91.47 is fine"],
        ],
        starter: src`
import pandas as pd

def payments_to_review(records):
    return []

payments = [
    {"payment_id": "PAY0000313", "method": "card", "status": "captured", "amount": 35.84},
    {"payment_id": "PAY0001023", "method": "card", "status": "captured", "amount": 0},
]
print(payments_to_review(payments))
`,
        answer: src`
import pandas as pd

KNOWN = ["card", "paypal", "apple_pay", "gift_card", "bank_transfer"]

def payments_to_review(records):
    pay = pd.DataFrame(records, columns=["payment_id", "method", "status", "amount"])
    empty_capture = (pay["status"] == "captured") & (pay["amount"] <= 0)
    positive_refund = (pay["status"] == "refunded") & (pay["amount"] >= 0)
    unknown = ~pay["method"].isin(KNOWN)
    return pay[empty_capture | positive_refund | unknown]["payment_id"].tolist()

payments = [
    {"payment_id": "PAY0000313", "method": "card", "status": "captured", "amount": 35.84},
    {"payment_id": "PAY0001023", "method": "card", "status": "captured", "amount": 0},
]
print(payments_to_review(payments))
`,
        alternatives: [
          src`
def payments_to_review(records):
    known = ["card", "paypal", "apple_pay", "gift_card", "bank_transfer"]
    flagged = []
    for p in records:
        if (p["status"] == "captured" and p["amount"] <= 0) or (p["status"] == "refunded" and p["amount"] >= 0) or p["method"] not in known:
            flagged.append(p["payment_id"])
    return flagged
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

KNOWN = ["card", "paypal", "apple_pay", "gift_card", "bank_transfer"]

def payments_to_review(records):
    pay = pd.DataFrame(records, columns=["payment_id", "method", "status", "amount"])
    empty_capture = (pay["status"] == "captured") & (pay["amount"] <= 0)
    unknown = ~pay["method"].isin(KNOWN)
    return pay[empty_capture | unknown]["payment_id"].tolist()
`,
            fails: ["returns"],
            why: "a refund stored as a positive amount is never flagged",
          },
          {
            code: src`
import pandas as pd

KNOWN = ["card", "paypal", "apple_pay", "gift_card", "bank_transfer"]

def payments_to_review(records):
    pay = pd.DataFrame(records, columns=["payment_id", "method", "status", "amount"])
    flagged = pay[(pay["amount"] <= 0) | ~pay["method"].isin(KNOWN)]
    return flagged["payment_id"].tolist()
`,
            fails: ["returns"],
            why: "every correct negative refund is flagged, because the status is not checked",
          },
          {
            code: src`
import pandas as pd

KNOWN = ["card", "paypal", "apple_pay", "gift_card", "bank_transfer"]

def payments_to_review(records):
    pay = pd.DataFrame(records, columns=["payment_id", "method", "status", "amount"])
    empty_capture = (pay["status"] == "captured") & (pay["amount"] < 0)
    positive_refund = (pay["status"] == "refunded") & (pay["amount"] >= 0)
    unknown = ~pay["method"].isin(KNOWN)
    return pay[empty_capture | positive_refund | unknown]["payment_id"].tolist()
`,
            fails: ["returns"],
            why: "a captured payment of exactly 0 is not flagged",
          },
        ],
        hints: [
          "Write one mask per rule; each rule is itself two tests or a list test.",
          "Unknown methods are the ones *not* in the list: flip an `isin` mask.",
          "A row is flagged when any rule matches, so join the three masks with `|`; each row then appears once.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "payments_to_review", [
              example([payments], ["PAY0001023", "PAY0001504", "PAY0002210"]),
              example([payments.slice(0, 2)], []),
              example([[]], []),
              hiddenCase("a payment that breaks two rules", [[{ payment_id: "P1", method: "cheque", status: "captured", amount: -5 }]], ["P1"]),
              hiddenCase("a refund of exactly 0", [[{ payment_id: "P2", method: "card", status: "refunded", amount: 0 }]], ["P2"]),
              hiddenCase("failed and voided payments", [[{ payment_id: "P3", method: "paypal", status: "failed", amount: 12.5 }, { payment_id: "P4", method: "apple_pay", status: "voided", amount: 0 }]], []),
              hiddenCase("bank transfers are a known method", [[{ payment_id: "P5", method: "bank_transfer", status: "captured", amount: 410 }]], []),
            ], { label: "payments_to_review() flags each suspicious payment once" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

orders = pd.DataFrame({"total": [35.84, 91.47, 55.72, 246.6, 54.55]})
kept = orders[orders["total"].between(50, 100)]
print(len(kept), kept.index.tolist())
`,
        choices: ["3 [1, 2, 4]", "3 [0, 1, 2]", "2 [1, 2]", "4 [1, 2, 3, 4]"],
        answer: 0,
        why: "91.47, 55.72 and 54.55 are between 50 and 100; the kept rows keep their original labels 1, 2 and 4.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `==` against a list of values. What does this print?",
        program: src`
import pandas as pd

orders = pd.DataFrame({"ship_state": ["TX", "CA", "NY"]})
try:
    print(orders[orders["ship_state"] == ["TX", "NY"]])
except ValueError:
    print("ValueError")
`,
        choices: ["ValueError", "  ship_state\n0         TX\n2         NY", "Empty DataFrame", "[True, False, True]"],
        answer: 0,
        why: "`==` compares position by position, and a 3-row column against a 2-item list fails with `Lengths must match`. Membership is `isin([\"TX\", \"NY\"])`.",
      },
      {
        id: "q3",
        prompt: "Which mask keeps orders that are NOT from the web channel and are over $50?",
        choices: ["`~(df[\"channel\"] == \"web\") & (df[\"total\"] > 50)`", "`not df[\"channel\"] == \"web\" and df[\"total\"] > 50`", "`df[\"channel\"] != \"web\" | df[\"total\"] > 50`", "`~df[\"channel\"] == \"web\" & df[\"total\"] > 50`"],
        answer: 0,
        why: "`~` flips the parenthesised mask and `&` joins it with the other parenthesised comparison. `not`/`and` raise on Series, `|` means or, and without parentheses `~` and `&` apply to the wrong parts.",
      },
    ],
    review: [
      "`df[mask]` keeps rows where a True/False Series is True; the kept rows keep their labels.",
      "Join masks with `&`, `|`, `~`, each comparison in parentheses.",
      "`isin` for lists, `between` for inclusive ranges, `.str` methods for text columns.",
      "Next: rows with missing values, and what each statistic does with them.",
    ],
  },

  // ------------------------------------------------------------------ PY-L42-04 missing values
  {
    id: "PY-L42-04",
    version: 2,
    slug: "missing-values",
    title: "Missing values",
    lede: "An empty cell becomes NaN. isna finds the gaps, dropna and fillna deal with them, and sum and mean quietly skip them, which is what you want only if you know it happens.",
    focus: "Find missing values with isna, then decide per column whether to drop, fill, or leave them, knowing how statistics treat NaN.",
    minutes: 18,
    objectives: [
      "Count missing values per column with `isna().sum()` and test single cells with `pd.isna`",
      "Remove rows with `dropna(subset=...)` and fill gaps with `fillna`, on purpose",
      "Explain that `mean`, `sum` and `count` skip NaN, and why filling with 0 changes an average",
    ],
    requires: ["aggregate-call", "assignment", "bitwise", "boolean", "comp-if", "comparison", "conversion", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "map-call", "membership", "none-value", "np-dtype", "np-reduce", "pd-frame", "pd-loc", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "value-count"],
    teaches: ["pd-missing"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Real tables have holes: an order with no promo code, a review with no title, a shipment that hasn't been delivered yet. `read_csv` turns empty cells into **missing values**, shown as `NaN` (in number columns, and also in text columns in pandas 3). A missing value is not 0 and not an empty string: it means *unknown*.\n\n`df.isna()` is a True/False table of where the gaps are, so `df.isna().sum()` counts them per column. `notna()` is the opposite. For one value, use `pd.isna(value)`: `==` can't detect NaN, because NaN is not equal to anything, itself included.",
      },
      {
        kind: "example",
        title: "Where are the gaps?",
        code: src`
import io
import pandas as pd

csv_text = """order_id,promo_code,shipping_fee,delivered_at
O100282,WELCOME10,5.99,2024-01-18 07:35:32
O100376,FREESHIP,,2024-01-24 20:02:08
O100918,,5.99,
O101219,,0,2024-03-19 01:26:45
"""
orders = pd.read_csv(io.StringIO(csv_text))
print(orders.isna().sum())
print(orders["promo_code"].notna().sum(), "orders used a code")
print(pd.isna(orders.loc[2, "delivered_at"]))
`,
        output: "order_id        0\npromo_code      2\nshipping_fee    1\ndelivered_at    1\ndtype: int64\n2 orders used a code\nTrue\n",
        note: "The result of `isna().sum()` is a Series indexed by column name. Each gap means something different: no promo code is normal, a missing shipping fee is a data problem, and no delivery date means not delivered yet.",
      },
      {
        kind: "error-example",
        title: "Converting a missing rating",
        code: src`
import pandas as pd

reviews = pd.DataFrame({"rating": [5, None, 4]})
print(reviews["rating"].tolist())
stars = int(reviews["rating"].iloc[1])
`,
        error: "ValueError",
        output: "[5.0, nan, 4.0]\n",
        note: "`ValueError: cannot convert float NaN to integer`. One gap also turned the whole whole-number column into floats, because NaN is a float.",
      },
      {
        kind: "text",
        md: "Three ways to deal with gaps, chosen per column: **drop** the rows (`dropna(subset=[\"col\"])`) when the row is useless without that value; **fill** (`fillna(value)`) when there is a correct default, such as `\"none\"` for no promo code; or **leave** them, because `sum`, `mean` and `count` already skip NaN. Filling with 0 is a decision, not a cleanup: it changes every average.",
      },
      {
        kind: "example",
        title: "Average rating: skip, fill, or drop?",
        code: src`
import pandas as pd

reviews = pd.DataFrame({
    "review_id": ["R000103", "R000140", "R000188", "R000201"],
    "rating": [5, 2, None, 4],
    "title": ["Great quality", None, "Works", None],
})
print(reviews["rating"].mean(), reviews["rating"].count(), len(reviews))
print(reviews["rating"].fillna(0).mean())
titled = reviews.dropna(subset=["title"])
print(titled["review_id"].tolist())
print(reviews["title"].fillna("(no title)").tolist())
`,
        output: "3.6666666666666665 3 4\n2.75\n['R000103', 'R000188']\n['Great quality', '(no title)', 'Works', '(no title)']\n",
        note: "`mean` used the three known ratings; `count` counts non-missing values while `len` counts rows. Filling with 0 invented a 0-star review and dragged the average to 2.75. `dropna` and `fillna` return new data; the original keeps its gaps.",
      },
      {
        kind: "text",
        md: "**When to use it:** check `isna().sum()` on every new file before computing anything. **Mistakes to avoid:** `value == None` or `value == float(\"nan\")` (always False for NaN; use `pd.isna`), filling numbers with 0 without a reason, and dropping rows for a gap in a column the question doesn't use (`dropna()` with no `subset` drops a row for a gap anywhere).",
      },
    ],
    tryIt: {
      id: "try",
      title: "No promo code is \"none\"",
      prompt: "`promo_labels` returns each order's promo code, but orders without one come back as `nan`. Fill the gaps with the text `\"none\"` before returning.",
      spec: [
        ["Function", "`promo_labels(records)`"],
        ["Returns", "a list of promo codes, `\"none\"` where an order had none"],
      ],
      starter: src`
import pandas as pd

def promo_labels(records):
    orders = pd.DataFrame(records)
    return orders["promo_code"].tolist()

print(promo_labels([{"promo_code": "WELCOME10"}, {"promo_code": None}]))
`,
      answer: src`
import pandas as pd

def promo_labels(records):
    orders = pd.DataFrame(records)
    return orders["promo_code"].fillna("none").tolist()

print(promo_labels([{"promo_code": "WELCOME10"}, {"promo_code": None}]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def promo_labels(records):
    orders = pd.DataFrame(records)
    return orders["promo_code"].dropna().tolist()
`,
          fails: ["returns"],
          why: "dropping the gaps removes those orders instead of labelling them",
        },
      ],
      hints: ["The column has gaps where there was no code.", "One method replaces every gap with a value you choose.", "Fill with the text `\"none\"`, then convert to a list."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "promo_labels", [
            example([[{ promo_code: "WELCOME10" }, { promo_code: null }]], ["WELCOME10", "none"]),
            hiddenCase("every order has a code", [[{ promo_code: "FREESHIP" }]], ["FREESHIP"]),
            hiddenCase("no order has a code", [[{ promo_code: null }, { promo_code: null }]], ["none", "none"]),
          ], { label: "promo_labels() fills missing codes with \"none\"" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A missing-values report",
        prompt: "Before loading a file, a pipeline prints which columns have gaps. Write `missing_report(path)`: read the CSV and return a dictionary from column name to number of missing values, **only** for columns that have at least one.",
        spec: [
          ["Function", "`missing_report(path)`"],
          ["Returns", "`{column: count}` for columns with gaps; `{}` when nothing is missing"],
          ["Example", "`missing_report(\"orders.csv\")` (the eight orders) → `{'promo_code': 6}`"],
        ],
        starter: src`
import pandas as pd

def missing_report(path):
    return {}

print(missing_report("orders.csv"))
`,
        answer: src`
import pandas as pd

def missing_report(path):
    counts = pd.read_csv(path).isna().sum()
    return {name: int(n) for name, n in counts.items() if n > 0}

print(missing_report("orders.csv"))
`,
        alternatives: [
          src`
import pandas as pd

def missing_report(path):
    table = pd.read_csv(path)
    report = {}
    for column in table.columns:
        gaps = int(table[column].isna().sum())
        if gaps:
            report[column] = gaps
    return report
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def missing_report(path):
    counts = pd.read_csv(path).isna().sum()
    return {name: int(n) for name, n in counts.items()}
`,
            fails: ["returns"],
            why: "columns with no gaps are listed with 0",
          },
          {
            code: src`
import pandas as pd

def missing_report(path):
    counts = pd.read_csv(path).notna().sum()
    return {name: int(n) for name, n in counts.items() if n > 0}
`,
            fails: ["returns"],
            why: "`notna` counts the values that are present",
          },
        ],
        hints: [
          "One expression counts the gaps in every column.",
          "That result behaves like a dictionary of column → count; `items()` walks it.",
          "Keep only the counts above 0, as plain ints.",
        ],
        task: {
          packages: PD,
          files: {
            "orders.csv": ORDERS_CSV,
            "reviews.csv": "review_id,order_id,rating,title\nR000103,O100282,5,Great quality\nR000140,O100376,2,\nR000188,O100918,,Works\nR000201,O101219,4,\n",
            "clean.csv": "order_id,total\nO100282,35.84\nO100376,91.47\n",
            "header.csv": "order_id,total\n",
          },
          checks: [
            fn("returns", "missing_report", [
              example(["orders.csv"], { promo_code: 6 }),
              hiddenCase("gaps in two columns", ["reviews.csv"], { rating: 1, title: 2 }),
              hiddenCase("a file with no gaps", ["clean.csv"], {}),
              hiddenCase("a header with no rows", ["header.csv"], {}),
            ], { label: "missing_report() counts gaps in the columns that have them" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Fill missing shipping fees by rule",
        prompt: "Some orders lost their shipping fee in an export. The rule: orders with promo code `FREESHIP` paid 0.00; every other order paid the standard 5.99. Write `fill_shipping(orders)`: return a **new** DataFrame where each missing `shipping_fee` is filled by that rule. Known fees stay as they are, and the caller's DataFrame keeps its gaps.",
        spec: [
          ["Function", "`fill_shipping(orders)`"],
          ["orders", "a DataFrame with `order_id`, `promo_code` (may be missing) and `shipping_fee` (may be missing)"],
          ["Returns", "a new DataFrame with no missing `shipping_fee`"],
          ["Example", "a FREESHIP order with no fee → 0.0; an order with no code and no fee → 5.99"],
        ],
        starter: src`
import pandas as pd

def fill_shipping(orders):
    return orders

orders = pd.DataFrame([
    {"order_id": "O100282", "promo_code": "WELCOME10", "shipping_fee": 5.99},
    {"order_id": "O100376", "promo_code": "FREESHIP", "shipping_fee": None},
    {"order_id": "O100918", "promo_code": None, "shipping_fee": None},
])
print(fill_shipping(orders))
`,
        answer: src`
import pandas as pd

def fill_shipping(orders):
    result = orders.copy()
    gap = result["shipping_fee"].isna()
    free = result["promo_code"] == "FREESHIP"
    result.loc[gap & free, "shipping_fee"] = 0.0
    result.loc[gap & ~free, "shipping_fee"] = 5.99
    return result

orders = pd.DataFrame([
    {"order_id": "O100282", "promo_code": "WELCOME10", "shipping_fee": 5.99},
    {"order_id": "O100376", "promo_code": "FREESHIP", "shipping_fee": None},
    {"order_id": "O100918", "promo_code": None, "shipping_fee": None},
])
print(fill_shipping(orders))
`,
        alternatives: [
          src`
import pandas as pd

def fill_shipping(orders):
    default = (orders["promo_code"] == "FREESHIP").map({True: 0.0, False: 5.99})
    return orders.assign(shipping_fee=orders["shipping_fee"].fillna(default))
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def fill_shipping(orders):
    result = orders.copy()
    result["shipping_fee"] = result["shipping_fee"].fillna(5.99)
    return result
`,
            fails: ["returns"],
            why: "FREESHIP orders are charged the standard fee",
          },
          {
            code: src`
import pandas as pd

def fill_shipping(orders):
    gap = orders["shipping_fee"].isna()
    free = orders["promo_code"] == "FREESHIP"
    orders.loc[gap & free, "shipping_fee"] = 0.0
    orders.loc[gap & ~free, "shipping_fee"] = 5.99
    return orders
`,
            fails: ["keeps-input"],
            why: "the fees are right, but the caller's DataFrame is filled in too",
          },
          {
            code: src`
import pandas as pd

def fill_shipping(orders):
    result = orders.copy()
    free = result["promo_code"] == "FREESHIP"
    result.loc[free, "shipping_fee"] = 0.0
    result.loc[~free, "shipping_fee"] = 5.99
    return result
`,
            fails: ["returns", "returns-hidden"],
            why: "known fees are overwritten too, not just the missing ones",
          },
        ],
        hints: [
          "Two masks: which fees are missing, and which orders are FREESHIP.",
          "Assign into a copy with `loc[mask, column]`, once for each rule.",
          "A missing promo code is not FREESHIP: the comparison gives False for it, which is the rule you want.",
        ],
        task: {
          packages: PD,
          checks: [
            { kind: "expr", id: "returns", label: "fill_shipping() fills each missing fee by the promo rule", show: "fill_shipping(orders)", expr: `${frameSetup(feeRows)}\nresult = fill_shipping(_df)["shipping_fee"].tolist()`, expected: pv([5.99, 0.0, 5.99, 0.0]), compare: loose },
            { kind: "expr", id: "returns-hidden", label: "Works for other orders (a known fee on a FREESHIP order, no gaps at all)", hidden: true, expr: `${frameSetup([{ order_id: "A", promo_code: "FREESHIP", shipping_fee: 4.5 }, { order_id: "B", promo_code: "WELCOME10", shipping_fee: null }])}\n_a = fill_shipping(_df)["shipping_fee"].tolist()\n${frameSetup([{ order_id: "C", promo_code: null, shipping_fee: 2.5 }])}\nresult = _a + fill_shipping(_df)["shipping_fee"].tolist()`, expected: pv([4.5, 5.99, 2.5]), compare: loose },
            { kind: "expr", id: "keeps-input", label: "fill_shipping() leaves the caller's DataFrame unchanged", expr: `${frameSetup(feeRows)}\nfill_shipping(_df)\nresult = int(_df["shipping_fee"].isna().sum())`, expected: pv(2) },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

fees = pd.Series([5.99, None, 0.0, None])
print(fees.count(), fees.sum(), fees.isna().sum())
`,
        choices: ["2 5.99 2", "4 5.99 2", "2 nan 2", "3 5.99 1"],
        answer: 0,
        why: "Two values are present (5.99 and 0.0), `sum` skips the gaps, and two gaps remain.",
      },
      {
        id: "q2",
        prompt: "A common mistake: testing for a missing value with `==`. What does this print?",
        program: src`
import pandas as pd

codes = pd.Series(["WELCOME10", None])
gap = codes.iloc[1]
print(gap == None, pd.isna(gap))
`,
        choices: ["False True", "True True", "True False", "False False"],
        answer: 0,
        why: "pandas stored the gap as NaN, not None, and `NaN == None` is False. `pd.isna` recognises every kind of missing value.",
      },
      {
        id: "q3",
        prompt: "A ratings column has a few gaps. Which is usually the wrong fix before computing the average rating?",
        choices: ["`fillna(0)`", "leave the gaps: `mean()` skips them", "`dropna(subset=[\"rating\"])` first", "report `count()` next to the mean"],
        answer: 0,
        why: "Filling with 0 invents zero-star ratings and lowers the average; skipping or dropping the gaps keeps it honest.",
      },
    ],
    review: [
      "Empty cells become NaN; `isna().sum()` counts gaps per column; `pd.isna(x)` tests one value.",
      "`dropna(subset=...)` removes rows, `fillna(value)` fills gaps; both return new data.",
      "`sum`, `mean` and `count` skip NaN; filling with 0 changes the answer.",
      "Next: each column's dtype, and converting text that should be numbers.",
    ],
  },

  // ------------------------------------------------------------------ PY-L42-05 data types
  {
    id: "PY-L42-05",
    version: 2,
    slug: "column-dtypes",
    title: "Column data types",
    lede: "read_csv guesses each column's dtype from its contents. One bad value turns a price column into text; a leading zero vanishes from a code read as a number. Check dtypes, then convert on purpose.",
    focus: "Read dtypes, convert columns with astype and pd.to_numeric(errors=\"coerce\"), and tell read_csv which columns must stay text.",
    minutes: 18,
    objectives: [
      "Read `df.dtypes` and recognise int64, float64, bool and text (`str` in pandas 3, `object` in pandas 2)",
      "Convert with `astype` when every value is valid, and with `pd.to_numeric(errors=\"coerce\")` when some aren't",
      "Use `read_csv(dtype={...})` to keep codes such as ZIP codes as text",
    ],
    requires: ["aggregate-call", "assignment", "comp-if", "comparison", "conditional-expr", "conversion", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "except-type", "field-ann", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "newline-escape", "none-value", "np-dtype", "np-reduce", "pd-filter", "pd-frame", "pd-loc", "pd-missing", "print-call", "print-several", "print-text", "string-index", "string-method", "top-level-indent", "try-except"],
    teaches: ["pd-kind"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "`read_csv` looks at every value in a column and picks a dtype: `int64` when all are whole numbers, `float64` with decimals or gaps, `bool` for true/false, and text otherwise. In pandas 3 a text column shows as `str`; pandas 2 calls it `object`. A dtype decides what works: `sum()` on a text column joins strings instead of adding numbers.",
      },
      {
        kind: "example",
        title: "A product feed with one bad price",
        code: src`
import io
import pandas as pd

csv_text = """sku,name,list_price,weight_kg
SPO-11681,Ultra Bike Light,7.49,2.75
HOM-22847,Deluxe Vase,31,0.3
ELE-24781,Organic Speaker,TBC,0.2
SPO-61044,Travel Yoga Mat,50.99,1.6
"""
products = pd.read_csv(io.StringIO(csv_text))
print(products.dtypes)
prices = pd.to_numeric(products["list_price"], errors="coerce")
print(prices.tolist(), prices.dtype)
print(products.loc[prices.isna(), "sku"].tolist())
`,
        output: "sku               str\nname              str\nlist_price        str\nweight_kg     float64\ndtype: object\n[7.49, 31.0, nan, 50.99] float64\n['ELE-24781']\n",
        note: "One `TBC` (\"to be confirmed\") made the whole price column text. (Common markers such as `n/a`, `NA` and empty cells are already read as missing.) `pd.to_numeric(..., errors=\"coerce\")` converts what it can and turns the rest into NaN, which you can then find and report.",
      },
      {
        kind: "error-example",
        title: "astype on a column with bad text",
        code: src`
import pandas as pd

prices = pd.Series(["7.49", "31", "n/a"])
print(prices.astype(float))
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: could not convert string to float: 'n/a'`. `astype` is all or nothing, which is right when bad values should stop the program, and wrong when you want to find and report them.",
      },
      {
        kind: "example",
        title: "Codes that must stay text",
        code: src`
import io
import pandas as pd

csv_text = """customer_id,zip,marketing_opt_in
C00038,02134,true
C00039,80202,false
C00065,07030,true
"""
guessed = pd.read_csv(io.StringIO(csv_text))
print(guessed["zip"].tolist(), guessed["zip"].dtype)
told = pd.read_csv(io.StringIO(csv_text), dtype={"zip": str})
print(told["zip"].tolist(), told["marketing_opt_in"].dtype)
print(told["marketing_opt_in"].sum(), "customers opted in")
`,
        output: "[2134, 80202, 7030] int64\n['02134', '80202', '07030'] bool\n2 customers opted in\n",
        note: "A ZIP code looks like a number but is a code: as int64 it loses its leading zero. `dtype={\"zip\": str}` tells `read_csv` not to guess for that column. `true`/`false` became bool, so `sum()` counts the Trues.",
      },
      {
        kind: "text",
        md: "**When to use it:** look at `dtypes` right after reading a file. **Mistakes to avoid:** computing with a column that is secretly text; letting IDs, ZIP codes or phone numbers become numbers; using `astype` where some values are expected to be bad (it raises), or `errors=\"coerce\"` where a bad value should stop the program (it hides it, unless you count the NaNs it produced).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count the prices that are numbers",
      prompt: "`valid_price_count` converts the prices with `astype(float)`, which crashes on `\"n/a\"`. Convert with `pd.to_numeric(..., errors=\"coerce\")` instead and return how many prices are valid numbers.",
      spec: [
        ["Function", "`valid_price_count(prices)`"],
        ["prices", "a list of texts"],
        ["Returns", "how many of them are numbers"],
        ["Example", "`valid_price_count([\"7.49\", \"31\", \"n/a\"])` → `2`"],
      ],
      starter: src`
import pandas as pd

def valid_price_count(prices):
    values = pd.Series(prices).astype(float)
    return int(values.notna().sum())

print(valid_price_count(["7.49", "31", "n/a"]))
`,
      answer: src`
import pandas as pd

def valid_price_count(prices):
    values = pd.to_numeric(pd.Series(prices), errors="coerce")
    return int(values.notna().sum())

print(valid_price_count(["7.49", "31", "n/a"]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def valid_price_count(prices):
    return len(prices)
`,
          fails: ["returns"],
          why: "every price is counted, valid or not",
        },
      ],
      hints: ["The conversion should not stop at the first bad value.", "`pd.to_numeric` has an option that turns bad values into NaN.", "Then count the values that are not missing."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "valid_price_count", [
            example([["7.49", "31", "n/a"]], 2),
            hiddenCase("no valid prices", [["n/a", "", "free"]], 0),
            hiddenCase("all valid", [["0.98", "3", "6.38"]], 3),
          ], { label: "valid_price_count() counts the prices that convert to numbers" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Parse prices from a messy feed",
        prompt: "A supplier sends prices as text, sometimes with a dollar sign and spaces (`\" $31.00 \"`), sometimes as `\"n/a\"` or empty. Write `parse_prices(prices)`: return a list with each price as a float, or `None` where it isn't a number.",
        spec: [
          ["Function", "`parse_prices(prices)`"],
          ["Returns", "a list of floats and `None`, one per input"],
          ["Example", "`parse_prices([\"7.49\", \" $31.00 \", \"n/a\"])` → `[7.49, 31.0, None]`"],
        ],
        starter: src`
import pandas as pd

def parse_prices(prices):
    return []

print(parse_prices(["7.49", " $31.00 ", "n/a"]))
`,
        answer: src`
import pandas as pd

def parse_prices(prices):
    text = pd.Series(prices, dtype=str).str.strip().str.replace("$", "")
    numbers = pd.to_numeric(text, errors="coerce")
    return [None if pd.isna(v) else float(v) for v in numbers]

print(parse_prices(["7.49", " $31.00 ", "n/a"]))
`,
        alternatives: [
          src`
def parse_prices(prices):
    result = []
    for p in prices:
        cleaned = p.strip().replace("$", "")
        try:
            result.append(float(cleaned))
        except ValueError:
            result.append(None)
    return result
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def parse_prices(prices):
    numbers = pd.to_numeric(pd.Series(prices, dtype=str), errors="coerce")
    return [None if pd.isna(v) else float(v) for v in numbers]
`,
            fails: ["returns"],
            why: "the dollar sign and spaces are not removed, so `\" $31.00 \"` becomes None",
          },
          {
            code: src`
import pandas as pd

def parse_prices(prices):
    text = pd.Series(prices, dtype=str).str.strip().str.replace("$", "")
    numbers = pd.to_numeric(text, errors="coerce")
    return numbers.tolist()
`,
            fails: ["returns"],
            why: "bad prices come back as nan instead of None",
          },
        ],
        hints: [
          "Clean the text first, then convert.",
          "`.str.strip()` and `.str.replace(...)` work on every value of a text Series.",
          "After coercing, turn each missing value into `None` while building the list.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "parse_prices", [
              example([["7.49", " $31.00 ", "n/a"]], [7.49, 31.0, null]),
              example([["171.99"]], [171.99]),
              example([[]], []),
              hiddenCase("an empty string", [["", "26.99"]], [null, 26.99]),
              hiddenCase("only a dollar sign", [["$"]], [null]),
              hiddenCase("whole-dollar prices with signs", [["$5", " 12 "]], [5.0, 12.0]),
            ], { label: "parse_prices() returns floats, or None for text that isn't a price", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "Check a file against its expected types",
        prompt: "A loader expects each column of a file to have a certain dtype. Write `type_problems(path, expected)`: read the CSV (keeping any column whose expected type is `\"str\"` as text, so codes keep their leading zeros) and return a dictionary of the columns that are wrong: the actual dtype name (`str(dtype)`), or `\"missing\"` when the column isn't in the file.",
        spec: [
          ["Function", "`type_problems(path, expected)`"],
          ["expected", "a dictionary such as `{\"zip\": \"str\", \"total\": \"float64\"}`"],
          ["Returns", "`{column: actual_dtype_name or \"missing\"}` for the columns that don't match; `{}` when all do"],
          ["Example", "`type_problems(\"products.csv\", {\"sku\": \"str\", \"list_price\": \"float64\"})` → `{'list_price': 'str'}`"],
        ],
        starter: src`
import pandas as pd

def type_problems(path, expected):
    return {}

print(type_problems("products.csv", {"sku": "str", "list_price": "float64"}))
`,
        answer: src`
import pandas as pd

def type_problems(path, expected):
    text_columns = {name: str for name, kind in expected.items() if kind == "str"}
    table = pd.read_csv(path, dtype=text_columns)
    problems = {}
    for name, kind in expected.items():
        if name not in table.columns:
            problems[name] = "missing"
        elif str(table[name].dtype) != kind:
            problems[name] = str(table[name].dtype)
    return problems

print(type_problems("products.csv", {"sku": "str", "list_price": "float64"}))
`,
        alternatives: [
          src`
import pandas as pd

def type_problems(path, expected):
    keep_text = {}
    for name in expected:
        if expected[name] == "str":
            keep_text[name] = str
    actual = {c: str(t) for c, t in pd.read_csv(path, dtype=keep_text).dtypes.items()}
    return {c: actual.get(c, "missing") for c in expected if actual.get(c, "missing") != expected[c]}
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def type_problems(path, expected):
    table = pd.read_csv(path)
    problems = {}
    for name, kind in expected.items():
        if name not in table.columns:
            problems[name] = "missing"
        elif str(table[name].dtype) != kind:
            problems[name] = str(table[name].dtype)
    return problems
`,
            fails: ["returns"],
            why: "a code column such as `zip` is read as int64 and reported as wrong",
          },
          {
            code: src`
import pandas as pd

def type_problems(path, expected):
    text_columns = {name: str for name, kind in expected.items() if kind == "str"}
    table = pd.read_csv(path, dtype=text_columns)
    problems = {}
    for name, kind in expected.items():
        if name in table.columns and str(table[name].dtype) != kind:
            problems[name] = str(table[name].dtype)
    return problems
`,
            fails: ["returns"],
            why: "a column that is missing from the file is not reported",
          },
        ],
        hints: [
          "Build the `dtype=` dictionary for `read_csv` from the expected types that are `\"str\"`.",
          "Compare `str(table[name].dtype)` with the expected name for each expected column.",
          "Check that a column exists before reading its dtype.",
        ],
        task: {
          packages: PD,
          files: {
            "products.csv": "sku,name,list_price,weight_kg\nSPO-11681,Ultra Bike Light,7.49,2.75\nHOM-22847,Deluxe Vase,31,0.3\nELE-24781,Organic Speaker,TBC,0.2\n",
            "customers.csv": "customer_id,zip,marketing_opt_in,orders\nC00038,02134,true,3\nC00039,80202,false,1\n",
          },
          checks: [
            fn("returns", "type_problems", [
              example(["products.csv", { sku: "str", list_price: "float64" }], { list_price: "str" }),
              example(["customers.csv", { zip: "str", marketing_opt_in: "bool", orders: "int64" }], {}),
              example(["products.csv", { sku: "str", stock: "int64" }], { stock: "missing" }),
              hiddenCase("a whole-number column expected as float", ["customers.csv", { orders: "float64" }], { orders: "int64" }),
              hiddenCase("several problems at once", ["products.csv", { weight_kg: "int64", list_price: "float64", seller_id: "str" }], { weight_kg: "float64", list_price: "str", seller_id: "missing" }),
              hiddenCase("nothing expected", ["customers.csv", {}], {}),
            ], { label: "type_problems() reports wrong and missing columns" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import io
import pandas as pd

table = pd.read_csv(io.StringIO("qty,price,code\n2,7.49,007\n3,,010\n"))
print(table["qty"].dtype, table["price"].dtype, table["code"].tolist())
`,
        choices: ["int64 float64 [7, 10]", "int64 str ['007', '010']", "float64 float64 [7, 10]", "int64 float64 ['007', '010']"],
        answer: 0,
        why: "Whole numbers give int64; a gap forces float64 (NaN is a float); the codes look like numbers, so they are read as 7 and 10 unless `dtype={\"code\": str}` says otherwise.",
      },
      {
        id: "q2",
        prompt: "A common mistake: adding up a column that is secretly text. What does this print?",
        program: src`
import pandas as pd

units = pd.Series(["2", "3", "5"])
print(units.sum(), pd.to_numeric(units).sum())
`,
        choices: ["235 10", "10 10", "235 235", "an error: text can't be summed"],
        answer: 0,
        why: "`sum` on text joins the strings; after `pd.to_numeric` the same values add up to 10.",
      },
      {
        id: "q3",
        prompt: "Prices sometimes contain `\"n/a\"`, and the report must list those products. Which conversion fits?",
        choices: ["`pd.to_numeric(col, errors=\"coerce\")`, then find the NaNs", "`col.astype(float)`", "`col.astype(int)`", "leave the column as text"],
        answer: 0,
        why: "Coercing keeps going and marks bad values as NaN so they can be found. `astype` stops at the first bad value.",
      },
    ],
    review: [
      "`read_csv` guesses a dtype per column; check `df.dtypes` first (text is `str` in pandas 3, `object` in pandas 2).",
      "`astype` converts when all values are valid; `pd.to_numeric(errors=\"coerce\")` marks bad values as NaN.",
      "`read_csv(dtype={\"zip\": str})` keeps codes as text.",
      "Next (the pandas Transformations module): group, join, pivot and clean whole tables.",
    ],
  },
];
