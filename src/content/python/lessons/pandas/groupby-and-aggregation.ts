import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const f = py.float;

export const groupbyAndAggregation: PyLesson = {
  slug: "groupby-and-aggregation",
  ref: "python:groupby-and-aggregation",
  module: "pandas",
  number: 6,
  title: "GroupBy and aggregation",
  level: "intermediate",
  summary:
    "Answer “per category”, “per customer” and “per day” questions with `groupby`: split the rows into groups, calculate a summary for each, and get a tidy table back, with clearly named result columns and a deterministic order.",
  packages: ["pandas"],
  files: SHOP_FILES,

  sections: [
    {
      label: "split, apply, combine",
      blocks: [
        {
          kind: "p",
          text: "`df.groupby(\"category\")` **splits** the rows into one group per category. Selecting a column and calling a summary **applies** it to each group, and pandas **combines** the results into a Series indexed by category: `orders.groupby(\"category\")[\"line_total\"].sum()`. It's the counting-and-totals pattern from Collections, for a whole table at once.",
        },
        {
          kind: "p",
          text: "Common summaries: `sum`, `mean`, `count` (non-missing values), `size` (rows, missing or not), `min`, `max`, `nunique`. Group by several columns with a list: `groupby([\"category\", \"status\"])`.",
        },
      ],
    },
    {
      label: "named aggregations",
      blocks: [
        {
          kind: "p",
          text: "`agg` calculates several summaries at once, and **named aggregation** names each result column: the name, then a `(column, function)` pair. This is the clearest way to build a summary table.",
        },
        { kind: "code", code: 'summary = completed.groupby("category").agg(\n    orders=("order_id", "count"),\n    revenue=("line_total", "sum"),\n    avg_order=("line_total", "mean"),\n).reset_index()' },
        {
          kind: "p",
          text: "The group keys become the **index** of the result; `reset_index()` turns them back into an ordinary column, which is easier to export or join. Results come out sorted by the keys; sort by a value with `sort_values` when you want a ranking, adding the key as a tie-breaker so the order is always the same.",
        },
      ],
    },
  ],

  example: {
    caption: "Revenue per category for completed orders. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\norders = pd.read_csv("orders.csv")\norders["line_total"] = orders["quantity"] * orders["unit_price"]\ncompleted = orders[orders["status"] == "completed"]\n\nprint(completed.groupby("category")["line_total"].sum())\n\nsummary = completed.groupby("category").agg(\n    orders=("order_id", "count"),\n    revenue=("line_total", "sum"),\n    avg_order=("line_total", "mean"),\n).reset_index().sort_values(["revenue", "category"], ascending=[False, True])\ndisplay(summary.round(2))',
  },

  walkthrough: [
    {
      title: "One summary per group",
      text: "The result is a Series whose index is the group key.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders.groupby("status")["order_id"].count())',
    },
    {
      title: "count versus size",
      text: "`size` counts rows; `count` counts non-missing values in a column, so they differ when there are gaps.",
      code: 'import pandas as pd\ndf = pd.DataFrame({"team": ["a", "a", "b"], "score": [1.0, None, 3.0]})\nprint(df.groupby("team").size().to_dict(), df.groupby("team")["score"].count().to_dict())',
    },
    {
      title: "Named aggregations and reset_index",
      text: "Each result column is named; `reset_index` makes `customer_id` an ordinary column again.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\norders["line_total"] = orders["quantity"] * orders["unit_price"]\nper_customer = orders.groupby("customer_id").agg(orders=("order_id", "count"), spent=("line_total", "sum")).reset_index()\nprint(per_customer)',
    },
    {
      title: "Two keys",
      text: "Grouping by two columns gives one row per combination that occurs.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders.groupby(["category", "status"]).size().reset_index(name="orders"))',
    },
  ],

  mistakes: [
    {
      title: "Summing before filtering",
      text: "Refunded, pending and cancelled orders are included, so this “revenue” is too high.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\norders["line_total"] = orders["quantity"] * orders["unit_price"]\nprint(orders.groupby("category")["line_total"].sum().to_dict())',
      fix: "Filter to the rows the question is about (completed orders) before grouping.",
    },
    {
      title: "Grouping by a column that isn't there",
      text: "The column is `category`, not `Category`: `KeyError`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders.groupby("Category").size())',
      raises: "KeyError",
      fix: "Check `orders.columns` for the exact name.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Revenue by category",
      prompt:
        "Write `category_revenue(orders)` for a DataFrame like `orders.csv`. Using only **completed** orders, return a DataFrame with one row per category and the columns `category`, `orders` (number of orders), `revenue` (sum of `quantity × unit_price`, rounded to 2 places) and `avg_order` (mean order value, rounded to 2 places), sorted by `revenue` from highest to lowest (ties by `category`), index from 0.",
      looksFor: [
        "Only completed orders count.",
        "One row per category, with `orders`, `revenue` and `avg_order` correct and rounded.",
        "Sorted by revenue, highest first, with a 0-based index.",
      ],
      starter: 'import pandas as pd\n\n\ndef category_revenue(orders):\n    # Return the per-category summary.\n    pass\n\n\nprint(category_revenue(pd.read_csv("orders.csv")))\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "table",
            label: "The summary table",
            show: 'category_revenue(pd.read_csv("orders.csv"))',
            expr: 'import pandas as pd\nout = category_revenue(pd.read_csv("orders.csv"))\nresult = (_records(out), out.index.tolist())',
            expected: py.tuple(
              py.list(
                py.dict([[s("category"), s("furniture")], [s("orders"), i(2)], [s("revenue"), f(240)], [s("avg_order"), f(120)]]),
                py.dict([[s("category"), s("lighting")], [s("orders"), i(4)], [s("revenue"), f(212)], [s("avg_order"), f(53)]]),
                py.dict([[s("category"), s("stationery")], [s("orders"), i(3)], [s("revenue"), f(62.5)], [s("avg_order"), f(20.83)]]),
              ),
              py.list(i(0), i(1), i(2)),
            ),
            tip: 'Filter status == "completed", add line_total, then groupby("category").agg(orders=("order_id", "count"), revenue=("line_total", "sum"), avg_order=("line_total", "mean")).',
          },
          {
            kind: "expr",
            id: "other",
            label: "Works on other orders",
            hidden: true,
            expr: 'import pandas as pd\ndf = pd.DataFrame({"order_id": [1, 2, 3, 4], "category": ["b", "a", "b", "a"], "quantity": [1, 3, 2, 1], "unit_price": [10.0, 1.0, 10.0, 99.0], "status": ["completed", "completed", "completed", "refunded"]})\nresult = _records(category_revenue(df))',
            expected: py.list(
              py.dict([[s("category"), s("b")], [s("orders"), i(2)], [s("revenue"), f(30)], [s("avg_order"), f(15)]]),
              py.dict([[s("category"), s("a")], [s("orders"), i(1)], [s("revenue"), f(3)], [s("avg_order"), f(3)]]),
            ),
          },
        ],
      },
      hints: [
        'completed = orders[orders["status"] == "completed"].assign(line_total=lambda d: d["quantity"] * d["unit_price"]).',
        'Then groupby("category").agg(orders=("order_id", "count"), revenue=("line_total", "sum"), avg_order=("line_total", "mean")).reset_index().',
        'Round the two money columns with .round(2), then sort_values(["revenue", "category"], ascending=[False, True]).reset_index(drop=True).',
      ],
      answer: 'import pandas as pd\n\n\ndef category_revenue(orders):\n    """Completed-order revenue per category, highest first."""\n    completed = orders[orders["status"] == "completed"]\n    completed = completed.assign(line_total=completed["quantity"] * completed["unit_price"])\n    summary = completed.groupby("category").agg(\n        orders=("order_id", "count"),\n        revenue=("line_total", "sum"),\n        avg_order=("line_total", "mean"),\n    ).reset_index()\n    summary[["revenue", "avg_order"]] = summary[["revenue", "avg_order"]].round(2)\n    summary = summary.sort_values(["revenue", "category"], ascending=[False, True])\n    return summary.reset_index(drop=True)\n\n\nprint(category_revenue(pd.read_csv("orders.csv")))',
      wrong: [
        { code: 'import pandas as pd\n\ndef category_revenue(orders):\n    o = orders.assign(line_total=orders["quantity"] * orders["unit_price"])\n    s = o.groupby("category").agg(orders=("order_id", "count"), revenue=("line_total", "sum"), avg_order=("line_total", "mean")).reset_index().round(2)\n    return s.sort_values(["revenue", "category"], ascending=[False, True]).reset_index(drop=True)\n', fails: ["table", "other"], why: "includes every status" },
        { code: 'import pandas as pd\n\ndef category_revenue(orders):\n    c = orders[orders["status"] == "completed"]\n    c = c.assign(line_total=c["quantity"] * c["unit_price"])\n    s = c.groupby("category").agg(orders=("order_id", "count"), revenue=("line_total", "sum"), avg_order=("line_total", "mean")).round(2)\n    return s.sort_values("revenue", ascending=False)\n', fails: ["table", "other"], why: "category left in the index" },
      ],
    },
    {
      id: "challenge-2",
      title: "Customers' first and last orders",
      prompt:
        "Write `customer_activity(orders)`, returning one row per customer, sorted by `customer_id`, with columns `customer_id`, `orders` (all their orders, any status), `first_order` and `last_order` (their earliest and latest `order_date`, as `YYYY-MM-DD` text), and `categories` (how many different categories they bought from). Index from 0.",
      looksFor: [
        "One row per customer, sorted by ID.",
        "`orders` counts every order; `categories` counts distinct categories.",
        "`first_order` and `last_order` are the min and max dates as text.",
      ],
      starter: 'import pandas as pd\n\n\ndef customer_activity(orders):\n    # Return one row per customer.\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "table",
            label: "Activity per customer",
            show: 'customer_activity(pd.read_csv("orders.csv"))',
            expr: 'import pandas as pd\nout = customer_activity(pd.read_csv("orders.csv"))\nresult = (_records(out), out.index.tolist()[:2])',
            expected: py.tuple(
              py.list(
                ...([
                  ["C01", 3, "2026-09-01", "2026-09-05", 3],
                  ["C02", 2, "2026-09-01", "2026-09-03", 2],
                  ["C03", 2, "2026-09-02", "2026-09-04", 2],
                  ["C04", 2, "2026-09-03", "2026-09-06", 1],
                  ["C05", 2, "2026-09-04", "2026-09-06", 2],
                  ["C06", 1, "2026-09-05", "2026-09-05", 1],
                ] as [string, number, string, string, number][]).map(([c, n, first, last, cats]) =>
                  py.dict([[s("customer_id"), s(c)], [s("orders"), i(n)], [s("first_order"), s(first)], [s("last_order"), s(last)], [s("categories"), i(cats)]]),
                ),
              ),
              py.list(i(0), i(1)),
            ),
            tip: 'agg(orders=("order_id", "count"), first_order=("order_date", "min"), last_order=("order_date", "max"), categories=("category", "nunique")). ISO date text sorts like dates, so min and max work on it.',
          },
        ],
      },
      hints: [
        'Group by "customer_id" and aggregate with named results.',
        'nunique counts distinct values: categories=("category", "nunique").',
        "ISO dates (YYYY-MM-DD) compare correctly as text, so \"min\" and \"max\" on order_date give the right days. Finish with reset_index().",
      ],
      answer: 'import pandas as pd\n\n\ndef customer_activity(orders):\n    """One row per customer: order count, first and last order dates, distinct categories."""\n    out = orders.groupby("customer_id").agg(\n        orders=("order_id", "count"),\n        first_order=("order_date", "min"),\n        last_order=("order_date", "max"),\n        categories=("category", "nunique"),\n    ).reset_index()\n    return out.sort_values("customer_id").reset_index(drop=True)',
      wrong: [
        { code: 'import pandas as pd\n\ndef customer_activity(orders):\n    return orders.groupby("customer_id").agg(orders=("order_id", "count"), first_order=("order_date", "min"), last_order=("order_date", "max"), categories=("category", "count")).reset_index()\n', fails: ["table"], why: "count instead of nunique for categories" },
      ],
    },
  ],

  quiz: [
    {
      id: "shape",
      prompt: "`orders` has 4 distinct categories and 3 distinct statuses, and 9 of the 12 combinations occur. How many rows does `orders.groupby([\"category\", \"status\"]).size()` have?",
      options: [
        { text: "9", correct: true, why: "One row per combination that actually occurs in the data." },
        { text: "12", why: "Combinations that never occur don't get a row (without extra options)." },
        { text: "7", why: "It's per combination of the two keys, not per key." },
        { text: "4", why: "Grouping by two columns splits by both." },
      ],
    },
    {
      id: "reset",
      prompt: "Why call `reset_index()` after a `groupby` summary?",
      options: [
        { text: "To turn the group keys from the index back into an ordinary column", correct: true, why: "An ordinary column is easier to sort, export and join on." },
        { text: "To undo the grouping", why: "The summary stays; only where the keys are stored changes." },
        { text: "To remove duplicate rows", why: "A groupby result already has one row per group." },
        { text: "It's required before `sort_values`", why: "You can sort either way; `reset_index` is about shape and clarity." },
      ],
    },
  ],

  outcomes: [
    "Summarise per group with `groupby` and `sum`, `mean`, `count`, `size` and `nunique`.",
    "Build tidy summary tables with named aggregations and `reset_index()`.",
    "Group by several columns.",
    "Filter before grouping, and sort results deterministically.",
  ],
};
