/**
 * M42 practice: ten independent problems on the pandas foundations of PY-L42-01 … PY-L42-05.
 *
 * Mix: 2 function implementations, 2 data transformations (DataFrame in, new DataFrame out, compared row by row),
 * 2 validations, 2 debugging (genuinely broken functions: a chained assignment that never writes, and gaps filled
 * with 0 before averaging), 2 output predictions. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures are slices of course datasets: R01 (Runtime Market orders and reviews) and D02 (UCI Online Retail II
 * invoice lines and products: missing customer IDs, blank descriptions, cancelled invoices). Hidden cases cover empty
 * files, gaps, ties, boundaries and optional filters left out.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { frameRows, pv } from "../fn-checks";
import { ORDERS_CSV, PD, orderRecords } from "../lessons/M42";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;
const frameSetup = (rows: Record<string, unknown>[]) => `import pandas as _pd\n_df = _pd.DataFrame(${JSON.stringify(rows).replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False")})`;

const LINES_CSV = `Invoice,StockCode,Description,Quantity,Price,Customer ID
536374,21258,VICTORIAN SEWING BOX LARGE,32,10.95,15100
536378,22386,JUMBO BAG PINK POLKADOT,10,1.95,14688
536378,21033,JUMBO BAG CHARLIE AND LOLA TOYS,10,2.95,14688
536596,21624,VINTAGE UNION JACK DOORSTOP,1,5.95,
`;

const products = [
  { stock_code: "10002", description: "INFLATABLE POLITICAL GLOBE", list_price: 0.85, first_sold_at: "2009-12-01" },
  { stock_code: "15044C", description: "PURPLE PAPER PARASOL", list_price: 2.95, first_sold_at: "2009-12-01" },
  { stock_code: "21258", description: "VICTORIAN SEWING BOX LARGE", list_price: 10.95, first_sold_at: "2009-12-02" },
  { stock_code: "15044B", description: "BLUE PAPER PARASOL", list_price: 2.95, first_sold_at: "2009-12-01" },
];

const rawLines = [
  { Invoice: "536549", StockCode: "85226A", Description: null, Quantity: 1, "Customer ID": null },
  { Invoice: "536596", StockCode: "21624", Description: "VINTAGE UNION JACK DOORSTOP", Quantity: 1, "Customer ID": null },
  { Invoice: "536378", StockCode: "22386", Description: null, Quantity: 10, "Customer ID": 14688 },
  { Invoice: "536374", StockCode: "21258", Description: "VICTORIAN SEWING BOX LARGE", Quantity: 32, "Customer ID": 15100 },
];

const reviewRecords = [
  { review_id: "R000103", rating: 5 },
  { review_id: "R000140", rating: 2 },
  { review_id: "R000188", rating: null },
  { review_id: "R000201", rating: 4 },
];

export const m42Questions: PyQuestion[] = [
  {
    id: "PY-Q42-02",
    version: 2,
    slug: "sorted-labels-predict",
    title: "Labels and positions after sorting",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "boolean", "dict-literal", "dict-lookup", "import-alias", "import-module", "list-index", "list-literal", "np-dtype", "np-index", "pd-frame", "pd-loc", "print-call", "print-several", "print-text", "string-index", "string-slice", "top-level-indent"],
    packages: PD,
    prompt: "Invoice lines from an online gift shop. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`sort_values` reorders the rows but each row keeps its original label.",
      "`iloc[1]` is the second row of the sorted table; `loc[1]` is the row labelled 1, wherever it is.",
      "A `loc` slice of labels includes its end label.",
    ],
    explanation: "Sorted by price, largest first, the labels are 0 (10.95), 4 (3.75), 3 (2.95), 1 (1.95), 2 (0.85). Position 1 of the sorted table is label 4, `84997B`; label 1 is still `22386`. `lines.loc[1:3, \"price\"]` uses the original table and includes label 3.",
    predict: {
      program: src`
import pandas as pd

lines = pd.DataFrame({
    "stock_code": ["21258", "22386", "21094", "21033", "84997B"],
    "price": [10.95, 1.95, 0.85, 2.95, 3.75],
})
ranked = lines.sort_values("price", ascending=False)
print(ranked.index.tolist())
print(ranked.iloc[1]["stock_code"], ranked.loc[1, "stock_code"])
print(lines.loc[1:3, "price"].tolist())
`,
      output: "[0, 4, 3, 1, 2]\n84997B 22386\n[1.95, 0.85, 2.95]\n",
      wrongPredictions: ["[0, 1, 2, 3, 4]\n84997B 22386\n[1.95, 0.85, 2.95]", "[0, 4, 3, 1, 2]\n84997B 84997B\n[1.95, 0.85, 2.95]", "[0, 4, 3, 1, 2]\n84997B 22386\n[1.95, 0.85]", "[0, 4, 3, 1, 2]\n22386 22386\n[1.95, 0.85, 2.95]"],
    },
  },
  {
    id: "PY-Q42-03",
    version: 2,
    slug: "priority-flag-never-set",
    title: "The priority flag that never gets set",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "boolean", "comparison", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "np-dtype", "pd-filter", "pd-frame", "pd-loc", "print-call", "print-several", "reassignment", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "`mark_priority` should flag every order whose total is at least `limit` as a priority. It runs without an error, but every order comes back `False`. Fix it.",
    spec: [
      ["Function", "`mark_priority(records, limit)`"],
      ["Returns", "a list of True/False, one per order, in order"],
    ],
    hiddenKinds: ["a total exactly at the limit", "no order reaches the limit", "every order reaches it"],
    hints: [
      "Look at the line that should write True: what does `orders[mask]` give back?",
      "Filtering builds a separate table; writing into it never reaches `orders`.",
      "Select the rows and the column in one step on `orders` itself, or compute the column from a comparison.",
    ],
    explanation: "`orders[mask][\"priority\"] = True` is chained indexing: `orders[mask]` is a new DataFrame, the assignment changes that temporary table, and it is thrown away (pandas 3 never writes through it). `orders.loc[mask, \"priority\"] = True` selects rows and column in one step on the real table. Simpler still: the flag *is* the comparison, `orders[\"total\"] >= limit`.",
    code: {
      starter: src`
import pandas as pd

def mark_priority(records, limit):
    orders = pd.DataFrame(records)
    orders["priority"] = False
    orders[orders["total"] >= limit]["priority"] = True
    return orders["priority"].tolist()

orders = [{"order_id": "O100376", "total": 91.47}, {"order_id": "O100282", "total": 35.84}]
print(mark_priority(orders, 50))
`,
      answer: src`
import pandas as pd

def mark_priority(records, limit):
    orders = pd.DataFrame(records)
    orders["priority"] = False
    orders.loc[orders["total"] >= limit, "priority"] = True
    return orders["priority"].tolist()

orders = [{"order_id": "O100376", "total": 91.47}, {"order_id": "O100282", "total": 35.84}]
print(mark_priority(orders, 50))
`,
      alternatives: [
        src`
import pandas as pd

def mark_priority(records, limit):
    orders = pd.DataFrame(records)
    orders["priority"] = orders["total"] >= limit
    return orders["priority"].tolist()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def mark_priority(records, limit):
    orders = pd.DataFrame(records)
    orders["priority"] = False
    orders.loc[orders["total"] > limit, "priority"] = True
    return orders["priority"].tolist()
`,
          fails: ["returns"],
          why: "the write now works, but `>` misses a total exactly at the limit",
        },
        {
          code: src`
import pandas as pd

def mark_priority(records, limit):
    orders = pd.DataFrame(records)
    orders["priority"] = False
    big = orders[orders["total"] >= limit].copy()
    big["priority"] = True
    return orders["priority"].tolist()
`,
          fails: ["returns"],
          why: "the flag is set on a copy of the big orders, which still never reaches `orders`",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "mark_priority", [
            example([[{ order_id: "O100376", total: 91.47 }, { order_id: "O100282", total: 35.84 }], 50], [true, false]),
            example([orderRecords, 60], [false, true, false, true, false, false, true, false]),
            example([[{ order_id: "O1", total: 10 }], 100], [false]),
            hiddenCase("a total exactly at the limit", [[{ order_id: "A", total: 50 }, { order_id: "B", total: 49.99 }], 50], [true, false]),
            hiddenCase("no order reaches the limit", [orderRecords, 500], [false, false, false, false, false, false, false, false]),
            hiddenCase("every order reaches it", [[{ order_id: "A", total: 5 }, { order_id: "B", total: 6 }], 1], [true, true]),
          ], { label: "mark_priority() flags orders at or above the limit" }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-06",
    version: 2,
    slug: "average-unit-price",
    title: "Average price per unit sold",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "dict-lookup", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-mutate", "none-value", "np-reduce", "pd-frame", "precedence", "print-call", "print-text", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "A shop wants the average price **per unit sold**, not per invoice line: a line of 32 boxes at £10.95 counts 32 times. Write `average_unit_price(path)`: read the invoice-lines CSV and return total revenue (Quantity × Price, summed) divided by total units (Quantity, summed). With no units sold, return `None`.",
    spec: [
      ["Function", "`average_unit_price(path)`"],
      ["File", "a CSV with `Invoice,StockCode,Description,Quantity,Price,Customer ID`"],
      ["Returns", "a float, or `None` when the file has no rows"],
    ],
    hiddenKinds: ["a single line", "lines of very different sizes", "a header with no rows"],
    hints: [
      "Two totals are needed: money and units.",
      "Revenue per line is a product of two columns; add those up.",
      "Decide what happens when there are no units before dividing.",
    ],
    explanation: "Multiplying the two columns gives each line's revenue; summing that and the quantities gives the weighted average. The plain mean of `Price` treats a single doorstop the same as 32 sewing boxes, which is the per-line average, not the per-unit one.",
    code: {
      starter: src`
import pandas as pd

def average_unit_price(path):
    return None

print(average_unit_price("lines.csv"))
`,
      answer: src`
import pandas as pd

def average_unit_price(path):
    lines = pd.read_csv(path)
    units = lines["Quantity"].sum()
    if units == 0:
        return None
    revenue = (lines["Quantity"] * lines["Price"]).sum()
    return float(revenue / units)

print(average_unit_price("lines.csv"))
`,
      alternatives: [
        src`
import pandas as pd

def average_unit_price(path):
    lines = pd.read_csv(path)
    if len(lines) == 0:
        return None
    lines["revenue"] = lines["Quantity"] * lines["Price"]
    return lines["revenue"].sum() / lines["Quantity"].sum()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def average_unit_price(path):
    lines = pd.read_csv(path)
    if len(lines) == 0:
        return None
    return float(lines["Price"].mean())
`,
          fails: ["returns"],
          why: "the mean price per line ignores how many units each line sold",
        },
        {
          code: src`
import pandas as pd

def average_unit_price(path):
    lines = pd.read_csv(path)
    revenue = (lines["Quantity"] * lines["Price"]).sum()
    return float(revenue / lines["Quantity"].sum())
`,
          fails: ["returns"],
          why: "an empty file divides 0 by 0 and returns nan instead of None",
        },
      ],
      task: {
        packages: PD,
        files: {
          "lines.csv": LINES_CSV,
          "one.csv": "Invoice,StockCode,Description,Quantity,Price,Customer ID\n536378,20725,LUNCH BAG RED RETROSPOT,10,1.65,14688\n",
          "mixed.csv": "Invoice,StockCode,Description,Quantity,Price,Customer ID\n536378,21212,PACK OF 72 RETROSPOT CAKE CASES,120,0.42,14688\n536374,21258,VICTORIAN SEWING BOX LARGE,1,10.95,15100\n",
          "empty.csv": "Invoice,StockCode,Description,Quantity,Price,Customer ID\n",
          "two.csv": "Invoice,StockCode,Description,Quantity,Price,Customer ID\n536378,22386,JUMBO BAG PINK POLKADOT,10,1.95,14688\n536378,21033,JUMBO BAG CHARLIE AND LOLA TOYS,30,2.95,14688\n",
          "boxes.csv": "Invoice,StockCode,Description,Quantity,Price,Customer ID\n536374,21258,VICTORIAN SEWING BOX LARGE,32,10.95,15100\n",
        },
        checks: [
          fn("returns", "average_unit_price", [
            example(["lines.csv"], 7.64811320754717),
            example(["two.csv"], 2.7),
            example(["boxes.csv"], 10.95),
            hiddenCase("a single line", ["one.csv"], 1.65),
            hiddenCase("lines of very different sizes", ["mixed.csv"], 0.5070247933884297),
            hiddenCase("a header with no rows", ["empty.csv"], null),
          ], { label: "average_unit_price() divides revenue by units" }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-10",
    version: 2,
    slug: "rows-that-are-not-numbers",
    title: "Which rows aren't numbers?",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "bitwise", "continue-statement", "conversion", "dict-literal", "enumerate-call", "except-type", "field-ann", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "membership", "np-dtype", "pd-frame", "pd-kind", "pd-missing", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "truthiness", "try-except"],
    packages: PD,
    prompt: "Before converting a column, a loader reports the rows that would fail. Write `non_numeric_rows(path, column)`: return the row positions (0 for the first data row) where `column` has a value that is **not** a number. Empty cells are missing, not wrong: don't report them.",
    spec: [
      ["Function", "`non_numeric_rows(path, column)`"],
      ["Returns", "a list of row positions, in order; `[]` when every value is a number or empty"],
    ],
    hiddenKinds: ["empty cells next to bad values", "negative and decimal numbers", "a column that is all numbers", "a header with no rows"],
    hints: [
      "Read the column as text so nothing is guessed or lost.",
      "Coercing turns bad values into missing ones; so do empty cells, already.",
      "A bad value is missing **after** converting but was present **before**.",
    ],
    explanation: "Reading the column as text keeps every value as it was typed. After `pd.to_numeric(errors=\"coerce\")`, both empty cells and bad text are NaN, so the bad ones are the NaNs that were present in the text column: `converted.isna() & text.notna()`.",
    code: {
      starter: src`
import pandas as pd

def non_numeric_rows(path, column):
    return []

print(non_numeric_rows("quantities.csv", "Quantity"))
`,
      answer: src`
import pandas as pd

def non_numeric_rows(path, column):
    text = pd.read_csv(path, dtype={column: str})[column]
    converted = pd.to_numeric(text, errors="coerce")
    bad = converted.isna() & text.notna()
    return text[bad].index.tolist()

print(non_numeric_rows("quantities.csv", "Quantity"))
`,
      alternatives: [
        src`
import pandas as pd

def non_numeric_rows(path, column):
    values = pd.read_csv(path, dtype={column: str})[column].tolist()
    bad = []
    for i, v in enumerate(values):
        if pd.isna(v):
            continue
        try:
            float(v)
        except ValueError:
            bad.append(i)
    return bad
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def non_numeric_rows(path, column):
    text = pd.read_csv(path, dtype={column: str})[column]
    converted = pd.to_numeric(text, errors="coerce")
    return text[converted.isna()].index.tolist()
`,
          fails: ["returns"],
          why: "empty cells are reported as if they were bad values",
        },
        {
          code: src`
import pandas as pd

def non_numeric_rows(path, column):
    text = pd.read_csv(path, dtype={column: str})[column]
    bad = ~text.str.isdigit() & text.notna()
    return text[bad].index.tolist()
`,
          fails: ["returns"],
          why: "`isdigit` rejects real numbers such as -4 and 2.5",
        },
      ],
      task: {
        packages: PD,
        files: {
          "quantities.csv": "Invoice,StockCode,Quantity\n536374,21258,32\n536378,22386,ten\n536549,85226A,\n536596,21624,1 box\n",
          "signed.csv": "Invoice,StockCode,Quantity\nC536737,22798,-2\n536378,21212,2.5\n536378,21977,24\n",
          "gaps.csv": "Invoice,StockCode,Quantity\n536549,85226A,\n536552,20950,TBC\n536589,21777,\n",
          "empty.csv": "Invoice,StockCode,Quantity\n",
        },
        checks: [
          fn("returns", "non_numeric_rows", [
            example(["quantities.csv", "Quantity"], [1, 3]),
            example(["quantities.csv", "StockCode"], [2]),
            example(["signed.csv", "Quantity"], []),
            hiddenCase("empty cells next to bad values", ["gaps.csv", "Quantity"], [1]),
            hiddenCase("negative and decimal numbers", ["signed.csv", "Quantity"], []),
            hiddenCase("a column that is all numbers", ["quantities.csv", "Invoice"], []),
            hiddenCase("a header with no rows", ["empty.csv", "Quantity"], []),
          ], { label: "non_numeric_rows() lists rows whose value is present but not a number" }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-12",
    version: 2,
    slug: "catalogue-price-list",
    title: "A price list, most expensive first",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "boolean", "dict-literal", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "np-index", "pd-frame", "pd-loc", "print-call", "string-index", "string-slice", "top-level-indent"],
    packages: PD,
    prompt: "Write `price_list(products)`: from a products DataFrame, return a new DataFrame with only `stock_code`, `description` and `list_price`, ordered by `list_price` from highest to lowest; products with the same price are ordered by `stock_code`, A to Z.",
    spec: [
      ["Function", "`price_list(products)`"],
      ["products", "a DataFrame with `stock_code`, `description`, `list_price`, `first_sold_at`"],
      ["Returns", "a new DataFrame with exactly those three columns, in the required order"],
    ],
    hiddenKinds: ["three products with the same price", "a single product", "codes that sort differently as text"],
    hints: [
      "Choose the columns with a list inside the brackets.",
      "`sort_values` accepts a list of columns, and a list of directions.",
      "Price descending, code ascending: the directions differ.",
    ],
    explanation: "`products[[\"stock_code\", \"description\", \"list_price\"]]` keeps three columns; `sort_values([\"list_price\", \"stock_code\"], ascending=[False, True])` orders by price, breaking ties by code. Sorting by price alone leaves tied products in whatever order the sort produces.",
    code: {
      starter: src`
import pandas as pd

def price_list(products):
    return products

products = pd.DataFrame([
    {"stock_code": "10002", "description": "INFLATABLE POLITICAL GLOBE", "list_price": 0.85, "first_sold_at": "2009-12-01"},
    {"stock_code": "15044C", "description": "PURPLE PAPER PARASOL", "list_price": 2.95, "first_sold_at": "2009-12-01"},
    {"stock_code": "15044B", "description": "BLUE PAPER PARASOL", "list_price": 2.95, "first_sold_at": "2009-12-01"},
])
print(price_list(products))
`,
      answer: src`
import pandas as pd

def price_list(products):
    columns = products[["stock_code", "description", "list_price"]]
    return columns.sort_values(["list_price", "stock_code"], ascending=[False, True])

products = pd.DataFrame([
    {"stock_code": "10002", "description": "INFLATABLE POLITICAL GLOBE", "list_price": 0.85, "first_sold_at": "2009-12-01"},
    {"stock_code": "15044C", "description": "PURPLE PAPER PARASOL", "list_price": 2.95, "first_sold_at": "2009-12-01"},
    {"stock_code": "15044B", "description": "BLUE PAPER PARASOL", "list_price": 2.95, "first_sold_at": "2009-12-01"},
])
print(price_list(products))
`,
      alternatives: [
        src`
import pandas as pd

def price_list(products):
    by_code = products.sort_values("stock_code")
    ranked = by_code.sort_values("list_price", ascending=False, kind="stable")
    return ranked.loc[:, ["stock_code", "description", "list_price"]]
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def price_list(products):
    return products.sort_values(["list_price", "stock_code"], ascending=[False, True])
`,
          fails: ["rows", "rows-hidden"],
          why: "the order is right but `first_sold_at` is still in the table",
        },
        {
          code: src`
import pandas as pd

def price_list(products):
    columns = products[["stock_code", "description", "list_price"]]
    return columns.sort_values(["list_price", "stock_code"], ascending=False)
`,
          fails: ["rows", "rows-hidden"],
          why: "tied products are ordered by code Z to A",
        },
      ],
      task: {
        packages: PD,
        checks: [
          frameRows("rows", "price_list() keeps three columns, highest price first, ties by code", "price_list(_df)", [
            { stock_code: "21258", description: "VICTORIAN SEWING BOX LARGE", list_price: 10.95 },
            { stock_code: "15044B", description: "BLUE PAPER PARASOL", list_price: 2.95 },
            { stock_code: "15044C", description: "PURPLE PAPER PARASOL", list_price: 2.95 },
            { stock_code: "10002", description: "INFLATABLE POLITICAL GLOBE", list_price: 0.85 },
          ], { setup: frameSetup(products), show: "price_list(products)" }),
          frameRows("rows-hidden", "Works for other catalogues (equal prices, one product, codes that sort as text)", "price_list(_df)", [
            { stock_code: "84991", description: "60 TEATIME FAIRY CAKE CASES", list_price: 0.55 },
            { stock_code: "85099C", description: "JUMBO  BAG BAROQUE BLACK WHITE", list_price: 0.55 },
            { stock_code: "9", description: "TEST", list_price: 0.55 },
          ], { hidden: true, setup: frameSetup([
            { stock_code: "9", description: "TEST", list_price: 0.55, first_sold_at: "2010-01-01" },
            { stock_code: "85099C", description: "JUMBO  BAG BAROQUE BLACK WHITE", list_price: 0.55, first_sold_at: "2009-12-01" },
            { stock_code: "84991", description: "60 TEATIME FAIRY CAKE CASES", list_price: 0.55, first_sold_at: "2009-12-01" },
          ]) }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-13",
    version: 2,
    slug: "ratings-average-too-low",
    title: "The average rating that is too low",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "comparison", "conversion", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-index", "list-literal", "none-value", "np-reduce", "pd-frame", "pd-missing", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "value-count"],
    packages: PD,
    prompt: "`rating_summary` should return the average of the ratings customers actually gave, and how many reviews have a rating. Reviews without a rating (missing) must not count. The product team says the averages look too low and the counts too high. Fix it. With no ratings at all, the average is `None`.",
    spec: [
      ["Function", "`rating_summary(records)`"],
      ["records", "a list of `{\"review_id\": …, \"rating\": int or None}`"],
      ["Returns", "`{\"average\": float or None, \"rated\": int}`"],
    ],
    hiddenKinds: ["no review has a rating", "every review has one", "no reviews at all"],
    hints: [
      "What does `fillna(0)` do to the average?",
      "`mean` already skips missing values; `len` counts every row.",
      "Count only the ratings that are present, and handle the case where there are none.",
    ],
    explanation: "Filling gaps with 0 turns every unrated review into a zero-star review, dragging the mean down, and `len` counts those rows too. `mean()` and `count()` skip missing values on their own, so the fix is to stop filling and to count with `count()` (or `notna().sum()`). With nothing rated, `mean()` is nan, so the function checks the count first.",
    code: {
      starter: src`
import pandas as pd

def rating_summary(records):
    reviews = pd.DataFrame(records, columns=["review_id", "rating"])
    ratings = reviews["rating"].fillna(0)
    return {"average": float(ratings.mean()), "rated": len(ratings)}

print(rating_summary([{"review_id": "R000103", "rating": 5}, {"review_id": "R000188", "rating": None}]))
`,
      answer: src`
import pandas as pd

def rating_summary(records):
    reviews = pd.DataFrame(records, columns=["review_id", "rating"])
    ratings = reviews["rating"]
    rated = int(ratings.count())
    if rated == 0:
        return {"average": None, "rated": 0}
    return {"average": float(ratings.mean()), "rated": rated}

print(rating_summary([{"review_id": "R000103", "rating": 5}, {"review_id": "R000188", "rating": None}]))
`,
      alternatives: [
        src`
import pandas as pd

def rating_summary(records):
    ratings = pd.DataFrame(records, columns=["review_id", "rating"])["rating"].dropna()
    if len(ratings) == 0:
        return {"average": None, "rated": 0}
    return {"average": ratings.mean(), "rated": len(ratings)}
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def rating_summary(records):
    reviews = pd.DataFrame(records, columns=["review_id", "rating"])
    ratings = reviews["rating"]
    if ratings.count() == 0:
        return {"average": None, "rated": 0}
    return {"average": float(ratings.mean()), "rated": len(ratings)}
`,
          fails: ["returns"],
          why: "the average is fixed but `len` still counts unrated reviews",
        },
        {
          code: src`
import pandas as pd

def rating_summary(records):
    reviews = pd.DataFrame(records, columns=["review_id", "rating"])
    ratings = reviews["rating"]
    return {"average": float(ratings.mean()), "rated": int(ratings.count())}
`,
          fails: ["returns"],
          why: "with nothing rated the average comes back as nan, not None",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "rating_summary", [
            example([reviewRecords], { average: 3.6666666666666665, rated: 3 }),
            example([[{ review_id: "R000103", rating: 5 }, { review_id: "R000188", rating: null }]], { average: 5.0, rated: 1 }),
            example([[{ review_id: "R1", rating: 1 }, { review_id: "R2", rating: 2 }]], { average: 1.5, rated: 2 }),
            hiddenCase("no review has a rating", [[{ review_id: "R1", rating: null }, { review_id: "R2", rating: null }]], { average: null, rated: 0 }),
            hiddenCase("every review has one", [[{ review_id: "R1", rating: 4 }]], { average: 4.0, rated: 1 }),
            hiddenCase("no reviews at all", [[]], { average: null, rated: 0 }),
          ], { label: "rating_summary() averages and counts only the given ratings", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-16",
    version: 2,
    slug: "clean-invoice-lines",
    title: "Clean invoice lines for a customer report",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-copy", "list-index", "list-literal", "list-mutate", "none-value", "pd-filter", "pd-frame", "pd-missing", "print-call", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "A customer report can't use invoice lines without a customer, and it shows `\"UNKNOWN\"` where a description is missing. Write `customer_lines(lines)`: return a **new** DataFrame without the rows whose `Customer ID` is missing, and with missing `Description`s replaced by `\"UNKNOWN\"`. The caller's DataFrame must keep all its rows and gaps.",
    spec: [
      ["Function", "`customer_lines(lines)`"],
      ["lines", "a DataFrame with `Invoice`, `StockCode`, `Description`, `Quantity`, `Customer ID`"],
      ["Returns", "a new DataFrame, same columns, rows in their original order"],
    ],
    hiddenKinds: ["no line has a customer", "no gaps at all", "a blank description on a line that is dropped anyway"],
    hints: [
      "Two different policies: one column decides whether a row stays, the other is filled.",
      "Drop by the one column that matters, not by every column.",
      "Both methods return new data; assign the filled column on the new table, not the caller's.",
    ],
    explanation: "`dropna(subset=[\"Customer ID\"])` removes only the rows missing a customer; a plain `dropna()` would also drop customers' lines that merely lack a description. Filling the description on the new table leaves the caller's DataFrame untouched.",
    code: {
      starter: src`
import pandas as pd

def customer_lines(lines):
    return lines

lines = pd.DataFrame([
    {"Invoice": "536596", "StockCode": "21624", "Description": "VINTAGE UNION JACK DOORSTOP", "Quantity": 1, "Customer ID": None},
    {"Invoice": "536378", "StockCode": "22386", "Description": None, "Quantity": 10, "Customer ID": 14688},
])
print(customer_lines(lines))
`,
      answer: src`
import pandas as pd

def customer_lines(lines):
    kept = lines.dropna(subset=["Customer ID"]).copy()
    kept["Description"] = kept["Description"].fillna("UNKNOWN")
    return kept

lines = pd.DataFrame([
    {"Invoice": "536596", "StockCode": "21624", "Description": "VINTAGE UNION JACK DOORSTOP", "Quantity": 1, "Customer ID": None},
    {"Invoice": "536378", "StockCode": "22386", "Description": None, "Quantity": 10, "Customer ID": 14688},
])
print(customer_lines(lines))
`,
      alternatives: [
        src`
import pandas as pd

def customer_lines(lines):
    kept = lines[lines["Customer ID"].notna()]
    return kept.fillna({"Description": "UNKNOWN"})
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def customer_lines(lines):
    return lines.dropna().copy()
`,
          fails: ["rows", "rows-hidden"],
          why: "a plain `dropna()` also drops customers' lines that only lack a description",
        },
        {
          code: src`
import pandas as pd

def customer_lines(lines):
    lines["Description"] = lines["Description"].fillna("UNKNOWN")
    return lines.dropna(subset=["Customer ID"])
`,
          fails: ["keeps-input"],
          why: "the result is right, but the caller's descriptions are filled in too",
        },
      ],
      task: {
        packages: PD,
        checks: [
          frameRows("rows", "customer_lines() drops lines without a customer and fills descriptions", "customer_lines(_df)", [
            { Invoice: "536378", StockCode: "22386", Description: "UNKNOWN", Quantity: 10, "Customer ID": 14688 },
            { Invoice: "536374", StockCode: "21258", Description: "VICTORIAN SEWING BOX LARGE", Quantity: 32, "Customer ID": 15100 },
          ], { setup: frameSetup(rawLines), show: "customer_lines(lines)", compare: loose }),
          frameRows("rows-hidden", "Works for other lines (a missing description on a customer's line, no gaps)", "customer_lines(_df)", [
            { Invoice: "1", StockCode: "A", Description: "UNKNOWN", Quantity: 2, "Customer ID": 12347 },
            { Invoice: "2", StockCode: "B", Description: "MUG", Quantity: 1, "Customer ID": 12431 },
          ], { hidden: true, compare: loose, setup: frameSetup([
            { Invoice: "1", StockCode: "A", Description: null, Quantity: 2, "Customer ID": 12347 },
            { Invoice: "2", StockCode: "B", Description: "MUG", Quantity: 1, "Customer ID": 12431 },
          ]) }),
          { kind: "expr", id: "keeps-input", label: "customer_lines() leaves the caller's DataFrame unchanged", expr: `${frameSetup(rawLines)}\ncustomer_lines(_df)\nresult = [len(_df), int(_df["Description"].isna().sum())]`, expected: pv([4, 2]) },
        ],
      },
    },
  },
  {
    id: "PY-Q42-19",
    version: 2,
    slug: "order-search-filters",
    title: "Order search with optional filters",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "bitwise", "boolean", "comparison", "dict-literal", "dict-lookup", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "logical", "none-value", "np-dtype", "pd-filter", "pd-frame", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "An admin search page has three optional filters. Write `find_orders(records, channel=None, min_total=None, states=None)`: return the IDs of orders that pass **every filter that was given**; a filter left as `None` doesn't restrict anything. `min_total` is inclusive; `states` is a list of codes.",
    spec: [
      ["Function", "`find_orders(records, channel=None, min_total=None, states=None)`"],
      ["Returns", "a list of order IDs in their original order"],
      ["Rules", "no filters → every order; an empty `states` list matches nothing"],
    ],
    hiddenKinds: ["all three filters together", "a total exactly at the minimum", "an empty states list", "no orders"],
    hints: [
      "Start from a mask that keeps every row, then narrow it once per filter.",
      "Only narrow when the argument `is not None`.",
      "Combine each new test into the mask with `&`.",
    ],
    explanation: "A mask of all True (`orders[\"order_id\"].notna()`, or `pd.Series(True, index=orders.index)`) is narrowed with `&` for each filter that was given. Testing `if states:` instead of `if states is not None:` would treat an empty list as *no filter*, which the contract forbids.",
    code: {
      starter: src`
import pandas as pd

def find_orders(records, channel=None, min_total=None, states=None):
    return []

orders = [
    {"order_id": "O100282", "channel": "web", "total": 35.84, "ship_state": "TX"},
    {"order_id": "O101723", "channel": "phone", "total": 54.55, "ship_state": "NY"},
]
print(find_orders(orders, channel="web"))
`,
      answer: src`
import pandas as pd

def find_orders(records, channel=None, min_total=None, states=None):
    orders = pd.DataFrame(records, columns=["order_id", "channel", "total", "ship_state"])
    keep = pd.Series(True, index=orders.index)
    if channel is not None:
        keep = keep & (orders["channel"] == channel)
    if min_total is not None:
        keep = keep & (orders["total"] >= min_total)
    if states is not None:
        keep = keep & orders["ship_state"].isin(states)
    return orders[keep]["order_id"].tolist()

orders = [
    {"order_id": "O100282", "channel": "web", "total": 35.84, "ship_state": "TX"},
    {"order_id": "O101723", "channel": "phone", "total": 54.55, "ship_state": "NY"},
]
print(find_orders(orders, channel="web"))
`,
      alternatives: [
        src`
import pandas as pd

def find_orders(records, channel=None, min_total=None, states=None):
    orders = pd.DataFrame(records, columns=["order_id", "channel", "total", "ship_state"])
    if channel is not None:
        orders = orders[orders["channel"] == channel]
    if min_total is not None:
        orders = orders[orders["total"] >= min_total]
    if states is not None:
        orders = orders[orders["ship_state"].isin(states)]
    return orders["order_id"].tolist()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def find_orders(records, channel=None, min_total=None, states=None):
    orders = pd.DataFrame(records, columns=["order_id", "channel", "total", "ship_state"])
    if channel:
        orders = orders[orders["channel"] == channel]
    if min_total:
        orders = orders[orders["total"] >= min_total]
    if states:
        orders = orders[orders["ship_state"].isin(states)]
    return orders["order_id"].tolist()
`,
          fails: ["returns"],
          why: "an empty states list is falsy, so it is treated as no filter instead of matching nothing",
        },
        {
          code: src`
import pandas as pd

def find_orders(records, channel=None, min_total=None, states=None):
    orders = pd.DataFrame(records, columns=["order_id", "channel", "total", "ship_state"])
    if channel is not None:
        orders = orders[orders["channel"] == channel]
    if min_total is not None:
        orders = orders[orders["total"] > min_total]
    if states is not None:
        orders = orders[orders["ship_state"].isin(states)]
    return orders["order_id"].tolist()
`,
          fails: ["returns"],
          why: "the minimum is exclusive, so an order exactly at it is dropped",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "find_orders", [
            example([orderRecords], orderRecords.map((o) => o.order_id)),
            example([orderRecords], ["O100282", "O100376", "O100918", "O101219"], { kwargs: { channel: "web" } }),
            example([orderRecords], ["O100282", "O101219", "O102603"], { kwargs: { states: ["TX"], min_total: 17.75 } }),
            hiddenCase("all three filters together", [orderRecords], ["O101219"], { kwargs: { channel: "web", min_total: 100, states: ["TX", "CA"] } }),
            hiddenCase("a total exactly at the minimum", [orderRecords], ["O100376", "O100918", "O101219", "O101723", "O103199"], { kwargs: { min_total: 54.55 } }),
            hiddenCase("an empty states list", [orderRecords], [], { kwargs: { states: [] } }),
            hiddenCase("no orders", [[]], [], { kwargs: { channel: "app" } }),
          ], { label: "find_orders() applies only the filters that were given" }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-20",
    version: 2,
    slug: "product-feed-errors",
    title: "Error report for a product feed",
    format: "validation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "bitwise", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "pd-frame", "pd-kind", "pd-loc", "pd-missing", "print-call", "print-text", "range-call", "reassignment", "string-format", "string-index", "top-level-indent", "truthiness"],
    packages: PD,
    prompt: "A supplier's product feed must be checked before import. For each data row, report the **first** problem found, checking in this order: the `stock_code` is empty (`\"missing stock code\"`); the `list_price` is empty or not a number (`\"price is not a number\"`); the price is 0 or less (`\"price must be positive\"`). Write `feed_errors(path)`: return messages like `\"line 3: price is not a number\"`, where the line number is the line in the file (the header is line 1).",
    spec: [
      ["Function", "`feed_errors(path)`"],
      ["File", "a CSV with `stock_code,description,list_price`"],
      ["Returns", "a list of messages in file order, one per bad row; `[]` when the feed is clean"],
    ],
    hiddenKinds: ["a row with two problems", "a price of exactly 0", "an empty price", "a clean feed", "stock codes with leading zeros"],
    hints: [
      "Read every column as text so you see exactly what the supplier sent.",
      "Convert the price once with coercion; a missing result means empty or not a number.",
      "Check each row's rules in the stated order and stop at the first; the file line is the row position plus 2.",
    ],
    explanation: "Reading with `dtype=str` keeps codes and prices as typed, so `\"007\"` stays a code. `pd.to_numeric(errors=\"coerce\")` turns empty and bad prices into NaN. Walking the rows in order, each row reports at most one message, chosen by the first rule it breaks; position 0 is file line 2 because of the header.",
    code: {
      starter: src`
import pandas as pd

def feed_errors(path):
    return []

print(feed_errors("feed.csv"))
`,
      answer: src`
import pandas as pd

def feed_errors(path):
    feed = pd.read_csv(path, dtype=str)
    prices = pd.to_numeric(feed["list_price"], errors="coerce")
    errors = []
    for i in range(len(feed)):
        if pd.isna(feed["stock_code"].iloc[i]):
            problem = "missing stock code"
        elif pd.isna(prices.iloc[i]):
            problem = "price is not a number"
        elif prices.iloc[i] <= 0:
            problem = "price must be positive"
        else:
            continue
        errors.append(f"line {i + 2}: {problem}")
    return errors

print(feed_errors("feed.csv"))
`,
      alternatives: [
        src`
import pandas as pd

def feed_errors(path):
    feed = pd.read_csv(path, dtype=str)
    feed["price"] = pd.to_numeric(feed["list_price"], errors="coerce")
    feed["line"] = feed.index + 2
    no_code = feed["stock_code"].isna()
    bad_price = ~no_code & feed["price"].isna()
    not_positive = ~no_code & ~bad_price & (feed["price"] <= 0)
    messages = {}
    for line in feed.loc[no_code, "line"]:
        messages[int(line)] = "missing stock code"
    for line in feed.loc[bad_price, "line"]:
        messages[int(line)] = "price is not a number"
    for line in feed.loc[not_positive, "line"]:
        messages[int(line)] = "price must be positive"
    return [f"line {n}: {messages[n]}" for n in sorted(messages)]
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def feed_errors(path):
    feed = pd.read_csv(path, dtype=str)
    prices = pd.to_numeric(feed["list_price"], errors="coerce")
    errors = []
    for i in range(len(feed)):
        if pd.isna(feed["stock_code"].iloc[i]):
            errors.append(f"line {i + 2}: missing stock code")
        if pd.isna(prices.iloc[i]):
            errors.append(f"line {i + 2}: price is not a number")
        elif prices.iloc[i] <= 0:
            errors.append(f"line {i + 2}: price must be positive")
    return errors
`,
          fails: ["returns"],
          why: "a row with two problems is reported twice instead of once",
        },
        {
          code: src`
import pandas as pd

def feed_errors(path):
    feed = pd.read_csv(path, dtype=str)
    prices = pd.to_numeric(feed["list_price"], errors="coerce")
    errors = []
    for i in range(len(feed)):
        if pd.isna(feed["stock_code"].iloc[i]):
            problem = "missing stock code"
        elif pd.isna(prices.iloc[i]):
            problem = "price is not a number"
        elif prices.iloc[i] <= 0:
            problem = "price must be positive"
        else:
            continue
        errors.append(f"line {i + 1}: {problem}")
    return errors
`,
          fails: ["returns"],
          why: "the line numbers forget the header line",
        },
        {
          code: src`
import pandas as pd

def feed_errors(path):
    feed = pd.read_csv(path, dtype=str)
    prices = pd.to_numeric(feed["list_price"], errors="coerce")
    errors = []
    for i in range(len(feed)):
        if pd.isna(feed["stock_code"].iloc[i]):
            problem = "missing stock code"
        elif pd.isna(prices.iloc[i]):
            problem = "price is not a number"
        elif prices.iloc[i] < 0:
            problem = "price must be positive"
        else:
            continue
        errors.append(f"line {i + 2}: {problem}")
    return errors
`,
          fails: ["returns"],
          why: "a price of 0 is accepted",
        },
      ],
      task: {
        packages: PD,
        files: {
          "feed.csv": "stock_code,description,list_price\n10002,INFLATABLE POLITICAL GLOBE,0.85\n15044B,BLUE PAPER PARASOL,n/a\n,PURPLE PAPER PARASOL,2.95\n21258,VICTORIAN SEWING BOX LARGE,-10.95\n",
          "double.csv": "stock_code,description,list_price\n,MYSTERY ITEM,free\n85099C,JUMBO  BAG BAROQUE BLACK WHITE,1.95\n",
          "zero.csv": "stock_code,description,list_price\n20723,STRAWBERRY CHARLOTTE BAG,0\n21094,SET/6 RED SPOTTY PAPER PLATES,\n",
          "clean.csv": "stock_code,description,list_price\n007,SPY KIT,4.5\n10125,MINI FUNKY DESIGN TAPES,0.85\n",
        },
        checks: [
          fn("returns", "feed_errors", [
            example(["feed.csv"], ["line 3: price is not a number", "line 4: missing stock code", "line 5: price must be positive"]),
            example(["clean.csv"], []),
            hiddenCase("a row with two problems", ["double.csv"], ["line 2: missing stock code"]),
            hiddenCase("a price of exactly 0 and an empty price", ["zero.csv"], ["line 2: price must be positive", "line 3: price is not a number"]),
            hiddenCase("stock codes with leading zeros", ["clean.csv"], []),
          ], { label: "feed_errors() reports the first problem of each bad row, with its file line" }),
        ],
      },
    },
  },
  {
    id: "PY-Q42-22",
    version: 2,
    slug: "nan-statistics-predict",
    title: "What NaN does to statistics",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["aggregate-call", "assignment", "comparison", "dict-literal", "dict-lookup", "import-alias", "import-module", "len-call", "list-index", "list-literal", "none-value", "np-reduce", "pd-frame", "pd-missing", "print-call", "print-text", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "Shipping fees and promo codes with gaps. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`mean` skips missing values; after `fillna(0)` there are none to skip.",
      "`dropna()` with no arguments drops a row with a gap in any column.",
      "A missing value is never equal to anything, so `== None` finds nothing.",
    ],
    explanation: "The fee mean uses 5.99 and 0.0 (2.995); filled with 0, all four count (1.4975). Only row 0 has no gap anywhere, while two rows have a fee. Two codes are missing, but `== None` compares each value with None and is False every time.",
    predict: {
      program: src`
import pandas as pd

fees = pd.DataFrame({
    "fee": [5.99, None, 0.0, None],
    "code": ["WELCOME10", "FREESHIP", None, None],
})
print(fees["fee"].mean(), fees["fee"].fillna(0).mean())
print(len(fees.dropna()), len(fees.dropna(subset=["fee"])))
print(fees["code"].isna().sum(), (fees["code"] == None).sum())
`,
      output: "2.995 1.4975\n1 2\n2 0\n",
      wrongPredictions: ["2.995 2.995\n1 2\n2 0", "1.4975 1.4975\n1 2\n2 0", "2.995 1.4975\n2 2\n2 0", "2.995 1.4975\n1 2\n2 2"],
    },
  },
];
