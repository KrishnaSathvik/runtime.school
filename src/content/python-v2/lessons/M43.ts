/**
 * M43 pandas Transformations: five lessons (PY-L43-01 … PY-L43-05).
 *
 * groupby and named aggregation, merge (inner, left, anti-join, validate), pivot_table and crosstab, datetime columns,
 * and data-quality checks. The data is Runtime Market (R01): real orders with their timestamps and delivery estimates,
 * customers, order lines and products, plus rows from the raw customers file with its real case and spacing problems.
 *
 * Challenges are graded by calling the learner's function on records (returning plain dictionaries and lists) or on a
 * DataFrame built by the check (compared row by row), with hidden inputs: ties, unknown keys, duplicate keys, orders
 * not yet delivered, invalid timestamps, and caller frames that must not change.
 * Version 2: rewritten from a print-one-cell module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { frameRows, pv } from "../fn-checks";
import { PD } from "./M42";
import { py } from "@/engine/python/values";

/** `{product: {rating: count}}` with int rating keys, as crosstab returns them. */
const byRating = (o: Record<string, Record<number, number>>) =>
  py.dict(Object.entries(o).map(([p, inner]) => [py.str(p), py.dict(Object.entries(inner).map(([r, n]) => [py.int(Number(r)), py.int(n)]))]));

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;
export const frameSetup = (rows: Record<string, unknown>[]) => `import pandas as _pd\n_df = _pd.DataFrame(${JSON.stringify(rows).replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False")})`;

// ---------------------------------------------------------------- fixtures (Runtime Market, R01)

const DATED = `order_id,customer_id,ordered_at,channel,status,total,ship_state,delivered_at,estimated_delivery
O100282,C00077,2024-01-16 13:03:50,web,delivered,35.84,TX,2024-01-18 07:35:32,2024-01-22
O100376,C00065,2024-01-21 22:19:23,web,returned,91.47,CA,2024-01-24 20:02:08,2024-01-27
O100918,C01338,2024-02-25 22:28:23,web,returned,55.72,NY,2024-02-28 02:46:52,2024-03-02
O101219,C00077,2024-03-13 10:01:28,web,delivered,246.6,TX,2024-03-19 01:26:45,2024-03-19
O101723,C01338,2024-04-06 13:01:04,phone,delivered,54.55,NY,2024-04-10 08:15:18,2024-04-12
O102603,C01339,2024-05-18 14:45:20,marketplace,delivered,17.75,TX,2024-05-22 09:28:46,2024-05-24
O103199,C02264,2024-06-12 12:25:00,app,delivered,64.17,FL,2024-06-18 04:46:10,2024-06-18
O103326,C02309,2024-06-18 22:12:48,app,delivered,39.15,TX,2024-06-26 00:30:53,2024-06-24
O103332,C02315,2024-06-18 23:05:00,app,cancelled,25.24,UT,,2024-06-24`;

/** Nine real orders with timestamps, as records (missing values are None). */
export const datedOrders = DATED.split("\n").slice(1).map((line) => {
  const [order_id, customer_id, ordered_at, channel, status, total, ship_state, delivered_at, estimated_delivery] = line.split(",");
  return { order_id, customer_id, ordered_at, channel, status, total: Number(total), ship_state, delivered_at: delivered_at || null, estimated_delivery };
});
const pick = (keys: string[]) => datedOrders.map((o) => Object.fromEntries(keys.map((k) => [k, (o as Record<string, unknown>)[k]])));

const customers = [
  { customer_id: "C00065", city: "Los Angeles" },
  { customer_id: "C00077", city: "Houston" },
  { customer_id: "C01338", city: "New York" },
  { customer_id: "C01339", city: "San Antonio" },
];

const items = [
  { order_id: "O100282", product_id: "P0164", line_total: 27.9 },
  { order_id: "O100376", product_id: "P0594", line_total: 48 },
  { order_id: "O100376", product_id: "P0708", line_total: 37.49 },
  { order_id: "O100918", product_id: "P0300", line_total: 3.99 },
  { order_id: "O100918", product_id: "P0762", line_total: 42.49 },
];
const products = [
  { product_id: "P0164", category: "sports" },
  { product_id: "P0594", category: "sports" },
  { product_id: "P0708", category: "fashion" },
  { product_id: "P0300", category: "grocery" },
  { product_id: "P0762", category: "fashion" },
];

const rawCustomers = [
  { customer_id: "C02264", email: "Noah.scott51@outlook.com", city: "MIAMI", state: "FL", signup_at: "2024-06-12 12:09:00" },
  { customer_id: "C02308", email: "theowilliams@yahoo.com", city: " Houston", state: "TX", signup_at: "2024-06-17 13:39:00" },
  { customer_id: "C04614", email: "ana.novak45@goldencorp.com ", city: "New York", state: "NY", signup_at: "2024-12-25 21:42:00" },
  { customer_id: "C08994", email: "NOAH.SCOTT51@OUTLOOK.COM", city: "Raleigh", state: "nc", signup_at: "2025-11-26 22:29:00" },
  { customer_id: "C02308", email: "theowilliams@yahoo.com", city: "Houston", state: "TX", signup_at: "2024-07-01 09:00:00" },
  { customer_id: "C06310", email: null, city: "Portland", state: "OR", signup_at: "2025-06-01 00:56:00" },
];

export const m43Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L43-01 groupby
  {
    id: "PY-L43-01",
    version: 2,
    slug: "group-and-aggregate",
    title: "Group and aggregate",
    lede: "groupby splits a table into one group per key value, applies a statistic to each group, and combines the results: one row per channel, per state or per customer.",
    focus: "Answer per-category questions with groupby and named aggregations, and count values with value_counts.",
    minutes: 18,
    objectives: [
      "Compute one statistic per group with `df.groupby(key)[column].sum()` (or `mean`, `max`, `size`)",
      "Compute several named statistics at once with `agg(name=(column, function))` and `as_index=False`",
      "Count how often each value appears with `value_counts`, and sort the result",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comp-if", "comparison", "conversion", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "lambda", "len-call", "list-index", "list-literal", "membership", "none-value", "np-index", "np-reduce", "pd-frame", "pd-loc", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "tuple-literal", "value-count"],
    teaches: ["pd-group"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "In the Collection Algorithms module you counted orders per channel with a dictionary and a loop. pandas does the same in one call: `orders.groupby(\"channel\")` **splits** the rows into one group per channel, a statistic is **applied** to each group, and the results are **combined** into a Series indexed by channel. `size()` counts rows per group; `value_counts()` is the shortcut for counting the values of one column.",
      },
      {
        kind: "example",
        title: "Revenue per channel",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "channel": ["web", "web", "web", "web", "phone", "marketplace", "app", "app", "app"],
    "status": ["delivered", "returned", "returned", "delivered", "delivered", "delivered", "delivered", "delivered", "cancelled"],
    "total": [35.84, 91.47, 55.72, 246.6, 54.55, 17.75, 64.17, 39.15, 25.24],
})
revenue = orders.groupby("channel")["total"].sum()
print(revenue.sort_values(ascending=False).round(2))
print(orders.groupby("channel").size().to_dict())
print(orders["status"].value_counts().to_dict())
`,
        output: "channel\nweb            429.63\napp            128.56\nphone           54.55\nmarketplace     17.75\nName: total, dtype: float64\n{'app': 3, 'marketplace': 1, 'phone': 1, 'web': 4}\n{'delivered': 6, 'returned': 2, 'cancelled': 1}\n",
        note: "The group keys become the index, sorted A to Z until you sort by value. `value_counts` sorts from most to least common. `to_dict()` turns a Series into a plain dictionary.",
      },
      {
        kind: "error-example",
        title: "Grouping by a column that isn't there",
        code: src`
import pandas as pd

orders = pd.DataFrame({"channel": ["web", "app"], "total": [35.84, 64.17]})
print(orders.groupby("Channel")["total"].sum())
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: 'Channel'`: the column is `channel`. Group keys are column names, spelt exactly.",
      },
      {
        kind: "text",
        md: "A report usually wants several numbers per group. `agg` takes **named aggregations**: `name=(column, function)`, where the function is a name such as `\"count\"`, `\"sum\"`, `\"mean\"`, `\"max\"` or `\"size\"`. `as_index=False` keeps the key as an ordinary column, so the result is a normal table you can sort, filter or save.",
      },
      {
        kind: "example",
        title: "A report per state",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "order_id": ["O100282", "O100376", "O100918", "O101219", "O101723", "O102603", "O103199"],
    "ship_state": ["TX", "CA", "NY", "TX", "NY", "TX", "FL"],
    "total": [35.84, 91.47, 55.72, 246.6, 54.55, 17.75, 64.17],
})
report = orders.groupby("ship_state", as_index=False).agg(
    orders=("order_id", "count"),
    revenue=("total", "sum"),
    largest=("total", "max"),
)
print(report.sort_values("revenue", ascending=False))
`,
        output: "  ship_state  orders  revenue  largest\n3         TX       3   300.19   246.60\n2         NY       2   110.27    55.72\n0         CA       1    91.47    91.47\n1         FL       1    64.17    64.17\n",
        note: "One row per state, one column per named aggregation. The row labels (3, 2, 0, 1) are the positions before sorting.",
      },
      {
        kind: "text",
        md: "**When to use it:** any question with *per* or *by* in it: revenue per channel, orders per customer, average rating per product. **Mistakes to avoid:** counting with `count` on a column that has gaps (it skips them; `size` counts rows); averaging averages (group the raw rows instead); and forgetting that the keys become the index unless you pass `as_index=False` or call `reset_index()`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Average, not total, per status",
      prompt: "`by_status` returns the total value of orders for each status. The report needs the **average** order value per status instead.",
      spec: [
        ["Function", "`by_status(records)`"],
        ["Returns", "a dictionary from status to the mean `total`"],
        ["Example", "two returned orders of 91.47 and 55.72 → `{'returned': 73.595, …}`"],
      ],
      starter: src`
import pandas as pd

def by_status(records):
    orders = pd.DataFrame(records)
    return orders.groupby("status")["total"].sum().to_dict()

print(by_status([{"status": "returned", "total": 91.47}, {"status": "returned", "total": 55.72}, {"status": "delivered", "total": 35.84}]))
`,
      answer: src`
import pandas as pd

def by_status(records):
    orders = pd.DataFrame(records)
    return orders.groupby("status")["total"].mean().to_dict()

print(by_status([{"status": "returned", "total": 91.47}, {"status": "returned", "total": 55.72}, {"status": "delivered", "total": 35.84}]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def by_status(records):
    orders = pd.DataFrame(records)
    return orders.groupby("status")["total"].max().to_dict()
`,
          fails: ["returns"],
          why: "the largest order per status is not the average",
        },
      ],
      hints: ["The grouping is already right.", "Only the statistic applied to each group changes.", "Swap `sum` for the method that averages."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "by_status", [
            example([[{ status: "returned", total: 91.47 }, { status: "returned", total: 55.72 }, { status: "delivered", total: 35.84 }]], { returned: 73.595, delivered: 35.84 }),
            hiddenCase("the nine orders", [pick(["status", "total"])], { delivered: 76.34333333333333, returned: 73.595, cancelled: 25.24 }),
            hiddenCase("a single order", [[{ status: "shipped", total: 10 }]], { shipped: 10 }),
          ], { label: "by_status() averages the totals per status", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Repeat customers",
        prompt: "Marketing wants the customers who ordered at least `min_orders` times. Write `repeat_customers(records, min_orders)`: return a dictionary from `customer_id` to their number of orders, only for customers with at least `min_orders`.",
        spec: [
          ["Function", "`repeat_customers(records, min_orders)`"],
          ["Returns", "`{customer_id: number_of_orders}`; `{}` when nobody qualifies"],
          ["Example", "the nine orders with `min_orders` 2 → `{'C00077': 2, 'C01338': 2}`"],
        ],
        starter: src`
import pandas as pd

def repeat_customers(records, min_orders):
    return {}

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O101219", "customer_id": "C00077"}, {"order_id": "O100376", "customer_id": "C00065"}]
print(repeat_customers(orders, 2))
`,
        answer: src`
import pandas as pd

def repeat_customers(records, min_orders):
    orders = pd.DataFrame(records, columns=["order_id", "customer_id"])
    counts = orders.groupby("customer_id").size()
    return {cid: int(n) for cid, n in counts.items() if n >= min_orders}

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O101219", "customer_id": "C00077"}, {"order_id": "O100376", "customer_id": "C00065"}]
print(repeat_customers(orders, 2))
`,
        alternatives: [
          src`
import pandas as pd

def repeat_customers(records, min_orders):
    counts = pd.DataFrame(records, columns=["order_id", "customer_id"])["customer_id"].value_counts()
    return counts[counts >= min_orders].to_dict()
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def repeat_customers(records, min_orders):
    orders = pd.DataFrame(records, columns=["order_id", "customer_id"])
    counts = orders.groupby("customer_id").size()
    return {cid: int(n) for cid, n in counts.items() if n > min_orders}
`,
            fails: ["returns"],
            why: "`>` leaves out customers with exactly the minimum",
          },
          {
            code: src`
import pandas as pd

def repeat_customers(records, min_orders):
    orders = pd.DataFrame(records, columns=["order_id", "customer_id"])
    counts = orders.groupby("customer_id").size()
    return {cid: int(n) for cid, n in counts.items()}
`,
            fails: ["returns"],
            why: "every customer is returned, whatever their count",
          },
        ],
        hints: ["Count rows per customer first.", "`size()` or `value_counts()` gives one count per customer.", "Keep only the counts that reach the minimum; the minimum itself qualifies."],
        task: {
          packages: PD,
          checks: [
            fn("returns", "repeat_customers", [
              example([pick(["order_id", "customer_id"]), 2], { C00077: 2, C01338: 2 }),
              example([pick(["order_id", "customer_id"]), 3], {}),
              example([pick(["order_id", "customer_id"]), 1], { C00065: 1, C00077: 2, C01338: 2, C01339: 1, C02264: 1, C02309: 1, C02315: 1 }),
              hiddenCase("one customer with many orders", [[{ order_id: "A", customer_id: "C1" }, { order_id: "B", customer_id: "C1" }, { order_id: "C", customer_id: "C1" }], 3], { C1: 3 }),
              hiddenCase("no orders", [[], 1], {}),
            ], { label: "repeat_customers() counts orders per customer and keeps those at the minimum or above" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A channel report with return rates",
        prompt: "Write `channel_report(orders)`: from an orders DataFrame (`order_id`, `channel`, `status`, `total`), return a table with one row per channel and the columns `channel`, `orders` (how many), `revenue` (sum of `total`) and `return_rate` (the share of that channel's orders whose status is `returned`, from 0 to 1), sorted by revenue, highest first.",
        spec: [
          ["Function", "`channel_report(orders)`"],
          ["Returns", "a DataFrame with columns `channel, orders, revenue, return_rate`"],
          ["Example", "web: 4 orders, revenue 429.63, return rate 0.5"],
        ],
        starter: src`
import pandas as pd

def channel_report(orders):
    return orders

orders = pd.DataFrame([
    {"order_id": "O100282", "channel": "web", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "channel": "web", "status": "returned", "total": 91.47},
    {"order_id": "O103199", "channel": "app", "status": "delivered", "total": 64.17},
])
print(channel_report(orders))
`,
        answer: src`
import pandas as pd

def channel_report(orders):
    flagged = orders.assign(returned=orders["status"] == "returned")
    report = flagged.groupby("channel", as_index=False).agg(
        orders=("order_id", "count"),
        revenue=("total", "sum"),
        return_rate=("returned", "mean"),
    )
    return report.sort_values("revenue", ascending=False)

orders = pd.DataFrame([
    {"order_id": "O100282", "channel": "web", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "channel": "web", "status": "returned", "total": 91.47},
    {"order_id": "O103199", "channel": "app", "status": "delivered", "total": 64.17},
])
print(channel_report(orders))
`,
        alternatives: [
          src`
import pandas as pd

def channel_report(orders):
    groups = orders.groupby("channel")
    report = pd.DataFrame({
        "orders": groups.size(),
        "revenue": groups["total"].sum(),
        "return_rate": groups["status"].apply(lambda s: (s == "returned").sum() / len(s)),
    }).reset_index()
    return report.sort_values("revenue", ascending=False)
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def channel_report(orders):
    flagged = orders.assign(returned=orders["status"] == "returned")
    report = flagged.groupby("channel", as_index=False).agg(
        orders=("order_id", "count"),
        revenue=("total", "sum"),
        return_rate=("returned", "sum"),
    )
    return report.sort_values("revenue", ascending=False)
`,
            fails: ["rows", "rows-hidden"],
            why: "it reports the number of returns, not their share of the channel's orders",
          },
          {
            code: src`
import pandas as pd

def channel_report(orders):
    flagged = orders.assign(returned=orders["status"] == "returned")
    return flagged.groupby("channel", as_index=False).agg(
        orders=("order_id", "count"),
        revenue=("total", "sum"),
        return_rate=("returned", "mean"),
    )
`,
            fails: ["rows"],
            why: "the rows stay in alphabetical order instead of by revenue",
          },
        ],
        hints: [
          "A rate is the mean of a True/False column: True counts as 1.",
          "Add that True/False column first (on a new table), then group.",
          "Three named aggregations, then sort by revenue, highest first.",
        ],
        task: {
          packages: PD,
          checks: [
            frameRows("rows", "channel_report() has one row per channel, by revenue", "channel_report(_df)", [
              { channel: "web", orders: 4, revenue: 429.63, return_rate: 0.5 },
              { channel: "app", orders: 3, revenue: 128.56, return_rate: 0.0 },
              { channel: "phone", orders: 1, revenue: 54.55, return_rate: 0.0 },
              { channel: "marketplace", orders: 1, revenue: 17.75, return_rate: 0.0 },
            ], { setup: frameSetup(pick(["order_id", "channel", "status", "total"])), show: "channel_report(orders)", compare: loose }),
            frameRows("rows-hidden", "Works for other orders (every order returned, one channel)", "channel_report(_df)", [
              { channel: "app", orders: 3, revenue: 30.0, return_rate: 0.6666666666666666 },
              { channel: "web", orders: 1, revenue: 5.0, return_rate: 1.0 },
            ], { hidden: true, compare: loose, setup: frameSetup([
              { order_id: "A", channel: "app", status: "returned", total: 10 },
              { order_id: "B", channel: "web", status: "returned", total: 5 },
              { order_id: "C", channel: "app", status: "returned", total: 12 },
              { order_id: "D", channel: "app", status: "delivered", total: 8 },
            ]) }),
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

ratings = pd.DataFrame({"product_id": ["P0205", "P0421", "P0205", "P0187", "P0205"], "rating": [5, 4, 2, 5, 4]})
means = ratings.groupby("product_id")["rating"].mean()
print(means.idxmax(), means["P0205"], ratings.groupby("product_id").size().max())
`,
        choices: ["P0187 3.6666666666666665 3", "P0205 3.6666666666666665 3", "P0187 11 3", "P0421 3.6666666666666665 1"],
        answer: 0,
        why: "P0187 has one 5-star review, the highest mean; P0205's mean is 11 / 3; P0205 has the most reviews, 3. `idxmax` gives the label of the largest value.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `count` on a column with gaps. What does this print?",
        program: src`
import pandas as pd

orders = pd.DataFrame({"channel": ["web", "web", "app"], "promo_code": ["WELCOME10", None, None]})
print(orders.groupby("channel")["promo_code"].count().to_dict(), orders.groupby("channel").size().to_dict())
`,
        choices: ["{'app': 0, 'web': 1} {'app': 1, 'web': 2}", "{'app': 1, 'web': 2} {'app': 1, 'web': 2}", "{'web': 1} {'app': 1, 'web': 2}", "{'app': 0, 'web': 1} {'app': 0, 'web': 1}"],
        answer: 0,
        why: "`count` counts non-missing values of the column; `size` counts rows. To count orders, use `size` (or count a column that is never empty, such as the ID).",
      },
      {
        id: "q3",
        prompt: "Which question needs `groupby`?",
        choices: ["What was the average delivery time for each carrier?", "Which orders are over $100?", "What is the overall average order value?", "Which customer has ID C00077?"],
        answer: 0,
        why: "*For each carrier* means one result per group. The others are a filter, one statistic for the whole table, and a lookup.",
      },
    ],
    review: [
      "`groupby(key)[col].stat()` gives one result per key; `size()` counts rows; `value_counts()` counts values.",
      "`agg(name=(column, function))` makes several named columns; `as_index=False` keeps the key as a column.",
      "A share is the mean of a True/False column.",
      "Next: combine two tables that share a key.",
    ],
  },

  // ------------------------------------------------------------------ PY-L43-02 merge and join
  {
    id: "PY-L43-02",
    version: 2,
    slug: "merge-tables",
    title: "Merging tables",
    lede: "merge joins two tables on a shared key column. how= decides what happens to rows without a partner, and validate= stops duplicate keys from silently multiplying rows.",
    focus: "Join two DataFrames on a key with merge, choosing inner or left, finding unmatched rows with indicator, and checking the key relationship with validate.",
    minutes: 20,
    objectives: [
      "Join orders to customers with `merge(on=..., how=\"inner\"|\"left\")` and predict the number of rows",
      "Find rows without a match with `indicator=True` (an anti-join)",
      "Explain how duplicate keys multiply rows, and guard against it with `validate=\"many_to_one\"`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "boolean", "comparison", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "membership", "np-dtype", "np-reduce", "pd-filter", "pd-frame", "pd-group", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    teaches: ["pd-merge"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Orders hold a `customer_id`; the customers table holds the city. In the Collection Algorithms module you joined them through a dictionary index. `orders.merge(customers, on=\"customer_id\")` does it for whole tables: every order row is paired with the customer row that has the same key. `how=\"inner\"` (the default) keeps only orders that found a customer; `how=\"left\"` keeps every order and leaves the customer columns missing where there was no match. `indicator=True` adds a `_merge` column saying `both` or `left_only`.",
      },
      {
        kind: "example",
        title: "Orders with their customer's city",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "order_id": ["O100282", "O100376", "O101723", "O103199"],
    "customer_id": ["C00077", "C00065", "C01338", "C02264"],
})
customers = pd.DataFrame({
    "customer_id": ["C00065", "C00077", "C01338"],
    "city": ["Los Angeles", "Houston", "New York"],
})
inner = orders.merge(customers, on="customer_id")
print(len(inner), inner["city"].tolist())
left = orders.merge(customers, on="customer_id", how="left", indicator=True)
print(left[["order_id", "city", "_merge"]])
`,
        output: "3 ['Houston', 'Los Angeles', 'New York']\n  order_id         city     _merge\n0  O100282      Houston       both\n1  O100376  Los Angeles       both\n2  O101723     New York       both\n3  O103199          NaN  left_only\n",
        note: "The inner join silently lost order O103199, whose customer isn't in the table. The left join keeps it with a missing city, and `_merge` says why.",
      },
      {
        kind: "text",
        md: "Each order should match **at most one** customer. If the customers table accidentally has a customer twice, every one of their orders is duplicated, and every total computed afterwards is wrong without any error. `validate=\"many_to_one\"` states the relationship (many orders, one customer each) and raises `MergeError` when the data breaks it. When repeated rows are known to be harmless copies, `customers.drop_duplicates(subset=[\"customer_id\"])` keeps one row per key before merging.",
      },
      {
        kind: "error-example",
        title: "A duplicated customer caught by validate",
        code: src`
import pandas as pd

orders = pd.DataFrame({"order_id": ["O100282", "O101219"], "customer_id": ["C00077", "C00077"]})
customers = pd.DataFrame({"customer_id": ["C00077", "C00077"], "city": ["Houston", "Houston "]})
print(len(orders.merge(customers, on="customer_id")))
orders.merge(customers, on="customer_id", validate="many_to_one")
`,
        error: "MergeError",
        output: "4\n",
        note: "Two orders became four rows. With `validate`, pandas stops: `MergeError: Merge keys are not unique in right dataset; not a many-to-one merge`.",
      },
      {
        kind: "example",
        title: "Revenue per product category",
        code: src`
import pandas as pd

items = pd.DataFrame({
    "order_id": ["O100282", "O100376", "O100376", "O100918", "O100918"],
    "product_id": ["P0164", "P0594", "P0708", "P0300", "P0762"],
    "line_total": [27.9, 48.0, 37.49, 3.99, 42.49],
})
products = pd.DataFrame({
    "product_id": ["P0164", "P0594", "P0708", "P0300", "P0762"],
    "category": ["sports", "sports", "fashion", "grocery", "fashion"],
})
lines = items.merge(products, on="product_id", how="left", validate="many_to_one")
print(lines.groupby("category")["line_total"].sum().round(2).to_dict())
`,
        output: "{'fashion': 79.98, 'grocery': 3.99, 'sports': 75.9}\n",
        note: "Merge first, so each line knows its category, then group. `validate` documents (and checks) that every line points at one product.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the question needs columns from two tables. **Mistakes to avoid:** an inner join that quietly drops rows (compare row counts before and after); duplicate keys on the side that should be unique; joining on columns with different spellings or types (`\"C00077\"` vs `\"C00077 \"`, or 12 vs `\"12\"`).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Keep every order",
      prompt: "`order_cities` uses an inner join, so orders from unknown customers disappear. Keep every order, in order, with `\"unknown\"` as the city when the customer isn't in the table.",
      spec: [
        ["Function", "`order_cities(orders, customers)`"],
        ["Returns", "a list with one city per order"],
      ],
      starter: src`
import pandas as pd

def order_cities(orders, customers):
    joined = pd.DataFrame(orders).merge(pd.DataFrame(customers), on="customer_id")
    return joined["city"].tolist()

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O103199", "customer_id": "C02264"}]
customers = [{"customer_id": "C00077", "city": "Houston"}]
print(order_cities(orders, customers))
`,
      answer: src`
import pandas as pd

def order_cities(orders, customers):
    joined = pd.DataFrame(orders).merge(pd.DataFrame(customers), on="customer_id", how="left")
    return joined["city"].fillna("unknown").tolist()

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O103199", "customer_id": "C02264"}]
customers = [{"customer_id": "C00077", "city": "Houston"}]
print(order_cities(orders, customers))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def order_cities(orders, customers):
    joined = pd.DataFrame(orders).merge(pd.DataFrame(customers), on="customer_id", how="left")
    return joined["city"].tolist()
`,
          fails: ["returns"],
          why: "every order is kept, but an unknown city comes back as nan",
        },
      ],
      hints: ["The join type decides whether unmatched orders stay.", "A left join keeps every order and leaves the city missing.", "Fill the missing cities before making the list."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "order_cities", [
            example([[{ order_id: "O100282", customer_id: "C00077" }, { order_id: "O103199", customer_id: "C02264" }], [{ customer_id: "C00077", city: "Houston" }]], ["Houston", "unknown"]),
            hiddenCase("every customer known", [pick(["order_id", "customer_id"]).slice(0, 3), customers], ["Houston", "Los Angeles", "New York"]),
            hiddenCase("no customer known", [[{ order_id: "A", customer_id: "X" }], customers], ["unknown"]),
          ], { label: "order_cities() keeps every order and labels unknown cities" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Orders without a known customer",
        prompt: "Before a customer report, a check lists orders whose `customer_id` isn't in the customers table (a broken foreign key). Write `orphan_orders(orders, customers)`: return those order IDs in their original order.",
        spec: [
          ["Function", "`orphan_orders(orders, customers)`"],
          ["orders, customers", "lists of dictionaries; both have `customer_id`"],
          ["Returns", "a list of order IDs"],
          ["Example", "the nine orders against four known customers → `['O103199', 'O103326', 'O103332']`"],
        ],
        starter: src`
import pandas as pd

def orphan_orders(orders, customers):
    return []

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O103199", "customer_id": "C02264"}]
customers = [{"customer_id": "C00077", "city": "Houston"}]
print(orphan_orders(orders, customers))
`,
        answer: src`
import pandas as pd

def orphan_orders(orders, customers):
    left = pd.DataFrame(orders, columns=["order_id", "customer_id"])
    right = pd.DataFrame(customers, columns=["customer_id"]).drop_duplicates()
    joined = left.merge(right, on="customer_id", how="left", indicator=True)
    return joined[joined["_merge"] == "left_only"]["order_id"].tolist()

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O103199", "customer_id": "C02264"}]
customers = [{"customer_id": "C00077", "city": "Houston"}]
print(orphan_orders(orders, customers))
`,
        alternatives: [
          src`
import pandas as pd

def orphan_orders(orders, customers):
    table = pd.DataFrame(orders, columns=["order_id", "customer_id"])
    known = [c["customer_id"] for c in customers]
    return table[~table["customer_id"].isin(known)]["order_id"].tolist()
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def orphan_orders(orders, customers):
    left = pd.DataFrame(orders, columns=["order_id", "customer_id"])
    right = pd.DataFrame(customers, columns=["customer_id"])
    joined = left.merge(right, on="customer_id", how="left", indicator=True)
    return joined[joined["_merge"] == "both"]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "it lists the orders that **do** have a customer",
          },
          {
            code: src`
import pandas as pd

def orphan_orders(orders, customers):
    left = pd.DataFrame(orders, columns=["order_id", "customer_id"])
    right = pd.DataFrame(customers, columns=["customer_id"])
    joined = left.merge(right, on="customer_id", how="right", indicator=True)
    return joined[joined["_merge"] == "right_only"]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "it looks for customers without orders, the opposite direction",
          },
        ],
        hints: [
          "Keep every order, and mark which ones found a partner.",
          "`indicator=True` adds `_merge`; the rows you want are only on the left side.",
          "If the customers list repeats an ID, an order would appear twice: drop duplicate keys first, or use `isin`.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "orphan_orders", [
              example([pick(["order_id", "customer_id"]), customers], ["O103199", "O103326", "O103332"]),
              example([[{ order_id: "O100282", customer_id: "C00077" }, { order_id: "O103199", customer_id: "C02264" }], [{ customer_id: "C00077", city: "Houston" }]], ["O103199"]),
              example([pick(["order_id", "customer_id"]).slice(0, 2), customers], []),
              hiddenCase("a customer listed twice", [[{ order_id: "A", customer_id: "C1" }, { order_id: "B", customer_id: "C9" }], [{ customer_id: "C1", city: "X" }, { customer_id: "C1", city: "X" }]], ["B"]),
              hiddenCase("no customers at all", [[{ order_id: "A", customer_id: "C1" }], []], ["A"]),
              hiddenCase("no orders", [[], customers], []),
            ], { label: "orphan_orders() lists orders whose customer is missing" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Revenue by category, including unknown products",
        prompt: "Write `revenue_by_category(items, products)`: add up `line_total` per product `category`. Lines whose `product_id` isn't in the products table must not disappear: count them under `\"unknown\"`.",
        spec: [
          ["Function", "`revenue_by_category(items, products)`"],
          ["Returns", "`{category: revenue}`"],
          ["Example", "the five lines → `{'fashion': 79.98, 'grocery': 3.99, 'sports': 75.9}`"],
        ],
        starter: src`
import pandas as pd

def revenue_by_category(items, products):
    return {}

items = [{"order_id": "O100282", "product_id": "P0164", "line_total": 27.9}, {"order_id": "O100918", "product_id": "P9999", "line_total": 3.99}]
products = [{"product_id": "P0164", "category": "sports"}]
print(revenue_by_category(items, products))
`,
        answer: src`
import pandas as pd

def revenue_by_category(items, products):
    lines = pd.DataFrame(items, columns=["order_id", "product_id", "line_total"])
    catalogue = pd.DataFrame(products, columns=["product_id", "category"])
    joined = lines.merge(catalogue, on="product_id", how="left", validate="many_to_one")
    joined["category"] = joined["category"].fillna("unknown")
    return joined.groupby("category")["line_total"].sum().to_dict()

items = [{"order_id": "O100282", "product_id": "P0164", "line_total": 27.9}, {"order_id": "O100918", "product_id": "P9999", "line_total": 3.99}]
products = [{"product_id": "P0164", "category": "sports"}]
print(revenue_by_category(items, products))
`,
        alternatives: [
          src`
def revenue_by_category(items, products):
    category_of = {p["product_id"]: p["category"] for p in products}
    totals = {}
    for line in items:
        category = category_of.get(line["product_id"], "unknown")
        totals[category] = totals.get(category, 0) + line["line_total"]
    return totals
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def revenue_by_category(items, products):
    lines = pd.DataFrame(items, columns=["order_id", "product_id", "line_total"])
    catalogue = pd.DataFrame(products, columns=["product_id", "category"])
    joined = lines.merge(catalogue, on="product_id")
    return joined.groupby("category")["line_total"].sum().to_dict()
`,
            fails: ["returns"],
            why: "the inner join drops lines for unknown products, so their revenue vanishes",
          },
          {
            code: src`
import pandas as pd

def revenue_by_category(items, products):
    lines = pd.DataFrame(items, columns=["order_id", "product_id", "line_total"])
    catalogue = pd.DataFrame(products, columns=["product_id", "category"])
    joined = lines.merge(catalogue, on="product_id", how="left")
    return joined.groupby("category")["line_total"].sum().to_dict()
`,
            fails: ["returns"],
            why: "`groupby` leaves out rows whose key is missing, so the unknown lines still vanish",
          },
        ],
        hints: [
          "Merge first, then group. Which join keeps every line?",
          "Lines without a product end up with a missing category.",
          "`groupby` skips missing keys: give them a name before grouping.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "revenue_by_category", [
              example([items, products], { fashion: 79.98, grocery: 3.99, sports: 75.9 }),
              example([[{ order_id: "O100282", product_id: "P0164", line_total: 27.9 }, { order_id: "O100918", product_id: "P9999", line_total: 3.99 }], [{ product_id: "P0164", category: "sports" }]], { sports: 27.9, unknown: 3.99 }),
              example([[], products], {}),
              hiddenCase("every product unknown", [items.slice(0, 2), []], { unknown: 75.9 }),
              hiddenCase("one category only", [items.slice(0, 2), products], { sports: 75.9 }),
            ], { label: "revenue_by_category() sums revenue per category, unknown products included", compare: loose }),
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

orders = pd.DataFrame({"order_id": ["A", "B", "C"], "customer_id": ["C1", "C2", "C9"]})
customers = pd.DataFrame({"customer_id": ["C1", "C2", "C3"], "segment": ["consumer", "business", "consumer"]})
print(len(orders.merge(customers, on="customer_id")), len(orders.merge(customers, on="customer_id", how="left")), len(orders.merge(customers, on="customer_id", how="outer")))
`,
        choices: ["2 3 4", "3 3 3", "2 3 3", "2 2 4"],
        answer: 0,
        why: "Inner keeps the two matches; left keeps all three orders; outer also keeps customer C3, who has no order: four rows.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a key that is duplicated on the side that should be unique. What does this print?",
        program: src`
import pandas as pd

items = pd.DataFrame({"product_id": ["P0164", "P0164", "P0594"], "line_total": [27.9, 31.0, 48.0]})
products = pd.DataFrame({"product_id": ["P0164", "P0164", "P0594"], "category": ["sports", "sports", "sports"]})
joined = items.merge(products, on="product_id")
print(len(joined), round(joined["line_total"].sum(), 2))
`,
        choices: ["5 165.8", "3 106.9", "3 165.8", "6 213.8"],
        answer: 0,
        why: "Each of the two P0164 lines matches both P0164 product rows (2 × 2 = 4 rows), plus one row for P0594: five rows, and the revenue is overstated.",
      },
      {
        id: "q3",
        prompt: "You need every order, plus the customer's city where known. Which join?",
        choices: ["`orders.merge(customers, on=\"customer_id\", how=\"left\")`", "`orders.merge(customers, on=\"customer_id\")`", "`customers.merge(orders, on=\"customer_id\", how=\"left\")`", "`orders.merge(customers, how=\"inner\", on=\"city\")`"],
        answer: 0,
        why: "A left join keeps every row of the left table (orders). The default inner join drops orders without a customer; the third keeps every customer instead.",
      },
    ],
    review: [
      "`left.merge(right, on=key, how=...)`: inner keeps matches, left keeps every left row.",
      "`indicator=True` labels rows `both`/`left_only`, which finds unmatched rows.",
      "Duplicate keys multiply rows; `validate=\"many_to_one\"` turns that into an error.",
      "Next: spread one column's values into columns with a pivot table.",
    ],
  },

  // ------------------------------------------------------------------ PY-L43-03 pivot
  {
    id: "PY-L43-03",
    version: 2,
    slug: "pivot-tables",
    title: "Pivot tables",
    lede: "A pivot table puts one key down the side, another across the top, and an aggregate in each cell: revenue by state and channel, orders by status and channel.",
    focus: "Reshape grouped results into a two-way table with pivot_table (index, columns, values, aggfunc, fill_value) and crosstab.",
    minutes: 18,
    objectives: [
      "Build a two-way summary with `pivot_table(index=, columns=, values=, aggfunc=, fill_value=)`",
      "Count combinations with `pd.crosstab`, and turn counts into row shares with `normalize=\"index\"`",
      "Explain why `pivot` refuses duplicate entries and `pivot_table` aggregates them",
    ],
    requires: ["aggregate-call", "assignment", "conversion", "dict-comp", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "membership", "nested-dict", "np-array", "np-dtype", "np-reduce", "np-stats", "pd-frame", "pd-loc", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "unquoted-name"],
    teaches: ["pd-pivot"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "`groupby([\"ship_state\", \"channel\"])` gives one row per pair, which is hard to compare by eye. A **pivot table** lays the same numbers out as a grid: states down the side (`index`), channels across the top (`columns`), and in each cell the `aggfunc` of the `values` column for that pair. Pairs with no orders would be missing; `fill_value=0` writes 0 instead.",
      },
      {
        kind: "example",
        title: "Revenue by state and channel",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "ship_state": ["TX", "CA", "NY", "TX", "NY", "TX", "FL", "TX"],
    "channel": ["web", "web", "web", "web", "phone", "marketplace", "app", "app"],
    "total": [35.84, 91.47, 55.72, 246.6, 54.55, 17.75, 64.17, 39.15],
})
table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="sum", fill_value=0)
print(table)
print(table.loc["TX", "web"], table["web"].sum())
`,
        output: "channel       app  marketplace  phone     web\nship_state                                   \nCA           0.00         0.00   0.00   91.47\nFL          64.17         0.00   0.00    0.00\nNY           0.00         0.00  54.55   55.72\nTX          39.15        17.75   0.00  282.44\n282.44 429.63\n",
        note: "Each cell is the sum for that state and channel; Texas web orders are 35.84 + 246.6. The result is an ordinary DataFrame, so `loc` and column sums work on it.",
      },
      {
        kind: "error-example",
        title: "pivot with two values for one cell",
        code: src`
import pandas as pd

orders = pd.DataFrame({"ship_state": ["TX", "TX"], "channel": ["web", "web"], "total": [35.84, 246.6]})
print(orders.pivot(index="ship_state", columns="channel", values="total"))
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: Index contains duplicate entries, cannot reshape`. `pivot` only rearranges, so two values for one cell is an error; `pivot_table` combines them with its `aggfunc`.",
      },
      {
        kind: "example",
        title: "Order status by channel",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "channel": ["web", "web", "web", "web", "phone", "app", "app", "app"],
    "status": ["delivered", "returned", "returned", "delivered", "delivered", "delivered", "delivered", "cancelled"],
})
print(pd.crosstab(orders["channel"], orders["status"]))
shares = pd.crosstab(orders["channel"], orders["status"], normalize="index")
print(shares.loc["web"].to_dict())
`,
        output: "status   cancelled  delivered  returned\nchannel                                \napp              1          2         0\nphone            0          1         0\nweb              0          2         2\n{'cancelled': 0.0, 'delivered': 0.5, 'returned': 0.5}\n",
        note: "`crosstab` counts each combination. `normalize=\"index\"` divides each row by its total, so each channel's row adds up to 1.",
      },
      {
        kind: "text",
        md: "**When to use it:** comparing a measure across two categories at once, or building the table behind a heatmap or a grouped bar chart. **Mistakes to avoid:** `pivot` on data with repeated pairs (use `pivot_table`); forgetting `fill_value`, then treating NaN as zero later; and `aggfunc=\"mean\"` when the question asks for totals (the default aggfunc is the mean).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count orders, not revenue",
      prompt: "`orders_grid` sums `total` per state and channel. The operations team wants the **number of orders** in each cell instead.",
      spec: [
        ["Function", "`orders_grid(records)`"],
        ["Returns", "`{channel: {state: number_of_orders}}`, with 0 for empty cells"],
      ],
      starter: src`
import pandas as pd

def orders_grid(records):
    orders = pd.DataFrame(records)
    table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="sum", fill_value=0)
    return table.to_dict()

print(orders_grid([{"ship_state": "TX", "channel": "web", "total": 35.84}, {"ship_state": "TX", "channel": "web", "total": 246.6}, {"ship_state": "CA", "channel": "app", "total": 64.17}]))
`,
      answer: src`
import pandas as pd

def orders_grid(records):
    orders = pd.DataFrame(records)
    table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="count", fill_value=0)
    return table.to_dict()

print(orders_grid([{"ship_state": "TX", "channel": "web", "total": 35.84}, {"ship_state": "TX", "channel": "web", "total": 246.6}, {"ship_state": "CA", "channel": "app", "total": 64.17}]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def orders_grid(records):
    orders = pd.DataFrame(records)
    table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="count")
    return table.to_dict()
`,
          fails: ["returns"],
          why: "without `fill_value=0` empty cells are nan instead of 0",
        },
      ],
      hints: ["The layout stays the same.", "Only the function applied to each cell changes.", "Keep `fill_value=0` so empty cells are 0."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "orders_grid", [
            example([[{ ship_state: "TX", channel: "web", total: 35.84 }, { ship_state: "TX", channel: "web", total: 246.6 }, { ship_state: "CA", channel: "app", total: 64.17 }]], { app: { CA: 1, TX: 0 }, web: { CA: 0, TX: 2 } }),
            hiddenCase("one channel", [[{ ship_state: "NY", channel: "phone", total: 54.55 }]], { phone: { NY: 1 } }),
            hiddenCase("the nine orders", [pick(["ship_state", "channel", "total"])], { app: { CA: 0, FL: 1, NY: 0, TX: 1, UT: 1 }, marketplace: { CA: 0, FL: 0, NY: 0, TX: 1, UT: 0 }, phone: { CA: 0, FL: 0, NY: 1, TX: 0, UT: 0 }, web: { CA: 1, FL: 0, NY: 1, TX: 2, UT: 0 } }),
          ], { label: "orders_grid() counts orders per state and channel", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Rating counts per product",
        prompt: "A product page shows how many reviews gave each star rating. Write `rating_counts(reviews)`: return `{product_id: {rating: count}}` for every product and every rating that appears **anywhere** in the data, with 0 where a product has none of that rating.",
        spec: [
          ["Function", "`rating_counts(reviews)`"],
          ["reviews", "a list of `{\"product_id\": …, \"rating\": int}`"],
          ["Returns", "a nested dictionary: product → rating → count"],
          ["Example", "`[{P0205, 5}, {P0205, 2}, {P0421, 5}]` → `{'P0205': {2: 1, 5: 1}, 'P0421': {2: 0, 5: 1}}`"],
        ],
        starter: src`
import pandas as pd

def rating_counts(reviews):
    return {}

print(rating_counts([{"product_id": "P0205", "rating": 5}, {"product_id": "P0205", "rating": 2}, {"product_id": "P0421", "rating": 5}]))
`,
        answer: src`
import pandas as pd

def rating_counts(reviews):
    table = pd.DataFrame(reviews, columns=["product_id", "rating"])
    grid = pd.crosstab(table["product_id"], table["rating"])
    return grid.to_dict(orient="index")

print(rating_counts([{"product_id": "P0205", "rating": 5}, {"product_id": "P0205", "rating": 2}, {"product_id": "P0421", "rating": 5}]))
`,
        alternatives: [
          src`
import pandas as pd

def rating_counts(reviews):
    table = pd.DataFrame(reviews, columns=["product_id", "rating"])
    table["n"] = 1
    grid = table.pivot_table(index="product_id", columns="rating", values="n", aggfunc="sum", fill_value=0)
    return {p: {int(r): int(grid.loc[p, r]) for r in grid.columns} for p in grid.index}
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def rating_counts(reviews):
    table = pd.DataFrame(reviews, columns=["product_id", "rating"])
    grid = pd.crosstab(table["product_id"], table["rating"])
    return grid.to_dict()
`,
            fails: ["returns"],
            why: "`to_dict()` nests by column, so the outer keys are ratings, not products",
          },
          {
            code: src`
import pandas as pd

def rating_counts(reviews):
    table = pd.DataFrame(reviews, columns=["product_id", "rating"])
    counts = table.groupby(["product_id", "rating"]).size()
    result = {}
    for (product, rating), n in counts.items():
        result.setdefault(product, {})[rating] = int(n)
    return result
`,
            fails: ["returns"],
            why: "ratings a product never received are missing instead of 0",
          },
        ],
        hints: ["Products down the side, ratings across the top, a count in each cell.", "One function counts combinations and fills the gaps with 0.", "Turn the grid into a dictionary keyed by the row labels."],
        task: {
          packages: PD,
          checks: [
            fn("returns", "rating_counts", [
              example([[{ product_id: "P0205", rating: 5 }, { product_id: "P0205", rating: 2 }, { product_id: "P0421", rating: 5 }]], byRating({ P0205: { 2: 1, 5: 1 }, P0421: { 2: 0, 5: 1 } })),
              example([[{ product_id: "P0187", rating: 4 }]], byRating({ P0187: { 4: 1 } })),
              hiddenCase("many reviews of one rating", [[{ product_id: "A", rating: 3 }, { product_id: "A", rating: 3 }, { product_id: "B", rating: 1 }]], byRating({ A: { 1: 0, 3: 2 }, B: { 1: 1, 3: 0 } })),
              hiddenCase("five products, mixed ratings", [[{ product_id: "P0205", rating: 5 }, { product_id: "P0421", rating: 4 }, { product_id: "P0205", rating: 2 }, { product_id: "P0187", rating: 5 }, { product_id: "P0205", rating: 4 }]], byRating({ P0187: { 2: 0, 4: 0, 5: 1 }, P0205: { 2: 1, 4: 1, 5: 1 }, P0421: { 2: 0, 4: 1, 5: 0 } })),
            ], { label: "rating_counts() counts each rating per product, with zeros" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Each state's revenue split by channel",
        prompt: "Write `channel_shares(records)`: for each `ship_state`, return the share of that state's revenue (`total`) that came from each channel, as `{state: {channel: share}}`. Each state's shares add up to 1; a channel with no orders in a state has share 0.",
        spec: [
          ["Function", "`channel_shares(records)`"],
          ["Returns", "a nested dictionary: state → channel → share between 0 and 1"],
          ["Example", "TX: web 35.84 and app 64.16 → `{'TX': {'app': 0.6416, 'web': 0.3584}}`"],
        ],
        starter: src`
import pandas as pd

def channel_shares(records):
    return {}

print(channel_shares([{"ship_state": "TX", "channel": "web", "total": 35.84}, {"ship_state": "TX", "channel": "app", "total": 64.16}]))
`,
        answer: src`
import pandas as pd

def channel_shares(records):
    orders = pd.DataFrame(records, columns=["ship_state", "channel", "total"])
    table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="sum", fill_value=0)
    shares = table.div(table.sum(axis=1), axis=0)
    return shares.to_dict(orient="index")

print(channel_shares([{"ship_state": "TX", "channel": "web", "total": 35.84}, {"ship_state": "TX", "channel": "app", "total": 64.16}]))
`,
        alternatives: [
          src`
import pandas as pd

def channel_shares(records):
    orders = pd.DataFrame(records, columns=["ship_state", "channel", "total"])
    totals = pd.crosstab(orders["ship_state"], orders["channel"], values=orders["total"], aggfunc="sum", normalize="index")
    return totals.fillna(0).to_dict(orient="index")
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def channel_shares(records):
    orders = pd.DataFrame(records, columns=["ship_state", "channel", "total"])
    table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="sum", fill_value=0)
    shares = table / table.sum()
    return shares.to_dict(orient="index")
`,
            fails: ["returns"],
            why: "dividing by the column totals gives each state's share of a channel, not each channel's share of a state",
          },
          {
            code: src`
import pandas as pd

def channel_shares(records):
    orders = pd.DataFrame(records, columns=["ship_state", "channel", "total"])
    counts = pd.crosstab(orders["ship_state"], orders["channel"], normalize="index")
    return counts.to_dict(orient="index")
`,
            fails: ["returns"],
            why: "these are shares of the number of orders, not of revenue",
          },
        ],
        hints: [
          "Build the revenue grid first: states down the side, channels across.",
          "Each row must be divided by its own total: the row sums are one value per state.",
          "A plain `/` lines a Series up with the columns; `div(..., axis=0)` lines it up with the rows.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "channel_shares", [
              example([[{ ship_state: "TX", channel: "web", total: 35.84 }, { ship_state: "TX", channel: "app", total: 64.16 }]], { TX: { app: 0.6416, web: 0.3584 } }),
              example([pick(["ship_state", "channel", "total"]).slice(0, 5)], { CA: { phone: 0, web: 1 }, NY: { phone: 0.4946948399383332, web: 0.5053051600616668 }, TX: { phone: 0, web: 1 } }),
              hiddenCase("one state, one channel", [[{ ship_state: "FL", channel: "app", total: 64.17 }]], { FL: { app: 1.0 } }),
              hiddenCase("many orders in one cell", [[{ ship_state: "TX", channel: "web", total: 10 }, { ship_state: "TX", channel: "web", total: 20 }, { ship_state: "TX", channel: "app", total: 10 }, { ship_state: "UT", channel: "app", total: 5 }]], { TX: { app: 0.25, web: 0.75 }, UT: { app: 1.0, web: 0.0 } }),
            ], { label: "channel_shares() splits each state's revenue by channel", compare: loose }),
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

sales = pd.DataFrame({"state": ["TX", "TX", "CA"], "channel": ["web", "web", "app"], "total": [10, 30, 5]})
table = sales.pivot_table(index="state", columns="channel", values="total")
print(table.loc["TX", "web"], table.shape)
`,
        choices: ["20.0 (2, 2)", "40 (2, 2)", "20.0 (3, 2)", "40.0 (2, 3)"],
        answer: 0,
        why: "Without `aggfunc`, `pivot_table` averages: (10 + 30) / 2 = 20.0. Two states by two channels.",
      },
      {
        id: "q2",
        prompt: "A common mistake: no `fill_value`. What does this print?",
        program: src`
import pandas as pd

sales = pd.DataFrame({"state": ["TX", "CA"], "channel": ["web", "app"], "total": [10, 5]})
table = sales.pivot_table(index="state", columns="channel", values="total", aggfunc="sum")
print(table["web"].tolist(), table["web"].sum())
`,
        choices: ["[nan, 10.0] 10.0", "[0, 10] 10", "[nan, 10.0] nan", "[10.0] 10.0"],
        answer: 0,
        why: "California has no web sales, so its cell is missing (NaN) rather than 0; `sum` skips it. A later `mean` would skip it too, which is wrong for revenue that really was 0.",
      },
      {
        id: "q3",
        prompt: "When does `pivot` (not `pivot_table`) work?",
        choices: ["When each index/column pair appears at most once", "When the values column is numeric", "Only with fill_value", "When there are fewer than 100 rows"],
        answer: 0,
        why: "`pivot` only rearranges values, so a pair that occurs twice has nowhere to go. `pivot_table` aggregates repeats.",
      },
    ],
    review: [
      "`pivot_table(index, columns, values, aggfunc, fill_value)` builds a two-way summary; the default aggfunc is the mean.",
      "`crosstab` counts combinations; `normalize=\"index\"` turns rows into shares.",
      "`div(row_totals, axis=0)` divides each row by its own total.",
      "Next: timestamps: parse them, take them apart, and group by month.",
    ],
  },

  // ------------------------------------------------------------------ PY-L43-04 datetime operations
  {
    id: "PY-L43-04",
    version: 2,
    slug: "datetime-columns",
    title: "Dates and times in a table",
    lede: "Timestamps read from a CSV are text. to_datetime turns them into real moments, so you can take them apart with .dt, subtract them, and group by month.",
    focus: "Parse timestamp columns with to_datetime, use the .dt accessor for parts and durations, and group by period.",
    minutes: 20,
    objectives: [
      "Convert text to datetimes with `pd.to_datetime(col, format=...)`, using `errors=\"coerce\"` for bad values",
      "Read parts (`.dt.month`, `.dt.day_name()`) and compute durations by subtracting columns",
      "Group by month with `.dt.to_period(\"M\")`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "comparison", "continue-statement", "conversion", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "membership", "none-value", "np-dtype", "np-reduce", "part-attr", "pd-filter", "pd-frame", "pd-group", "pd-loc", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    teaches: ["pd-time"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "`ordered_at` arrives as text like `\"2024-01-16 13:03:50\"`. Text sorts correctly in this format, but you can't ask its weekday or subtract two of them. `pd.to_datetime(column, format=\"%Y-%m-%d %H:%M:%S\")` converts a whole column (the format codes are the `strptime` ones from the Dates Numbers & Regex module; giving the format makes parsing exact and fast). The result has a datetime dtype, and `.dt` gives the parts: `.dt.month`, `.dt.hour`, `.dt.day_name()`. Subtracting two datetime columns gives **Timedeltas** (durations).",
      },
      {
        kind: "example",
        title: "Weekdays and delivery times",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "order_id": ["O100282", "O100376", "O101219"],
    "ordered_at": ["2024-01-16 13:03:50", "2024-01-21 22:19:23", "2024-03-13 10:01:28"],
    "delivered_at": ["2024-01-18 07:35:32", "2024-01-24 20:02:08", "2024-03-19 01:26:45"],
})
stamp = "%Y-%m-%d %H:%M:%S"
ordered = pd.to_datetime(orders["ordered_at"], format=stamp)
delivered = pd.to_datetime(orders["delivered_at"], format=stamp)
print(ordered.dt.day_name().tolist(), ordered.dt.month.tolist())
took = delivered - ordered
print(took.iloc[0])
print((took.dt.total_seconds() / 86400).round(1).tolist())
`,
        output: "['Tuesday', 'Sunday', 'Wednesday'] [1, 1, 3]\n1 days 18:31:42\n[1.8, 2.9, 5.6]\n",
        note: "A Timedelta prints as days and hours. `dt.total_seconds()` turns durations into numbers; dividing by 86,400 seconds gives days.",
      },
      {
        kind: "error-example",
        title: "Subtracting timestamps that are still text",
        code: src`
import pandas as pd

orders = pd.DataFrame({"ordered_at": ["2024-01-16 13:03:50"], "delivered_at": ["2024-01-18 07:35:32"]})
print(orders["delivered_at"] - orders["ordered_at"])
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for -: 'str' and 'str'`. Convert both columns with `pd.to_datetime` first.",
      },
      {
        kind: "example",
        title: "Revenue per month, with one bad timestamp",
        code: src`
import pandas as pd

orders = pd.DataFrame({
    "ordered_at": ["2024-01-16 13:03:50", "2024-01-21 22:19:23", "2024-02-25 22:28:23", "2024-02-30 10:00:00", "2024-03-13 10:01:28"],
    "total": [35.84, 91.47, 55.72, 12.0, 246.6],
})
when = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
print(when.isna().sum(), "bad timestamp")
month = when.dt.to_period("M")
print(orders.groupby(month)["total"].sum().round(2))
`,
        output: "1 bad timestamp\nordered_at\n2024-01    127.31\n2024-02     55.72\n2024-03    246.60\nFreq: M, Name: total, dtype: float64\n",
        note: "30 February doesn't exist; `errors=\"coerce\"` makes it NaT (*not a time*), the datetime version of a missing value, and `groupby` leaves it out. `to_period(\"M\")` labels every moment with its month.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time-based question: per month, per weekday, how long, how late. **Mistakes to avoid:** computing with text timestamps; letting pandas guess an ambiguous format (`01/02/2024` is January or February depending on the country: pass `format=`); comparing a datetime with a date that still has its time part (normalise with `.dt.normalize()` to compare whole days); and dropping NaT silently without counting how many.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Weekday names, not months",
      prompt: "`order_days` returns the month number of each order. The staffing team needs the **weekday name** (Monday, Tuesday, …) instead.",
      spec: [
        ["Function", "`order_days(timestamps)`"],
        ["timestamps", "a list of texts like `\"2024-01-16 13:03:50\"`"],
        ["Returns", "a list of weekday names"],
      ],
      starter: src`
import pandas as pd

def order_days(timestamps):
    when = pd.to_datetime(pd.Series(timestamps), format="%Y-%m-%d %H:%M:%S")
    return when.dt.month.tolist()

print(order_days(["2024-01-16 13:03:50", "2024-01-21 22:19:23"]))
`,
      answer: src`
import pandas as pd

def order_days(timestamps):
    when = pd.to_datetime(pd.Series(timestamps), format="%Y-%m-%d %H:%M:%S")
    return when.dt.day_name().tolist()

print(order_days(["2024-01-16 13:03:50", "2024-01-21 22:19:23"]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def order_days(timestamps):
    when = pd.to_datetime(pd.Series(timestamps), format="%Y-%m-%d %H:%M:%S")
    return when.dt.dayofweek.tolist()
`,
          fails: ["returns"],
          why: "`dayofweek` is a number (Monday is 0), not a name",
        },
      ],
      hints: ["The conversion is already done.", "`.dt` has a method that names the day.", "It is a method, so it needs parentheses."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "order_days", [
            example([["2024-01-16 13:03:50", "2024-01-21 22:19:23"]], ["Tuesday", "Sunday"]),
            hiddenCase("a single order", [["2024-06-12 12:25:00"]], ["Wednesday"]),
            hiddenCase("a leap day", [["2024-02-29 08:00:00"]], ["Thursday"]),
          ], { label: "order_days() returns weekday names" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Orders delivered late",
        prompt: "Each order has an `estimated_delivery` date and, once delivered, a `delivered_at` timestamp. Write `late_orders(records)`: return the IDs of orders delivered on a **later day** than estimated. Delivery any time on the estimated day is on time; orders not yet delivered (`delivered_at` is `None`) are not late yet.",
        spec: [
          ["Function", "`late_orders(records)`"],
          ["delivered_at", "`\"2024-06-26 00:30:53\"` or `None`"],
          ["estimated_delivery", "`\"2024-06-24\"`"],
          ["Returns", "a list of order IDs in their original order"],
          ["Example", "the nine orders → `['O103326']`"],
        ],
        starter: src`
import pandas as pd

def late_orders(records):
    return []

orders = [
    {"order_id": "O101219", "delivered_at": "2024-03-19 01:26:45", "estimated_delivery": "2024-03-19"},
    {"order_id": "O103326", "delivered_at": "2024-06-26 00:30:53", "estimated_delivery": "2024-06-24"},
]
print(late_orders(orders))
`,
        answer: src`
import pandas as pd

def late_orders(records):
    orders = pd.DataFrame(records, columns=["order_id", "delivered_at", "estimated_delivery"])
    delivered = pd.to_datetime(orders["delivered_at"], format="%Y-%m-%d %H:%M:%S")
    promised = pd.to_datetime(orders["estimated_delivery"], format="%Y-%m-%d")
    late = delivered.dt.normalize() > promised
    return orders[late]["order_id"].tolist()

orders = [
    {"order_id": "O101219", "delivered_at": "2024-03-19 01:26:45", "estimated_delivery": "2024-03-19"},
    {"order_id": "O103326", "delivered_at": "2024-06-26 00:30:53", "estimated_delivery": "2024-06-24"},
]
print(late_orders(orders))
`,
        alternatives: [
          src`
import pandas as pd

def late_orders(records):
    late = []
    for order in records:
        if order["delivered_at"] is None:
            continue
        if order["delivered_at"][:10] > order["estimated_delivery"]:
            late.append(order["order_id"])
    return late
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def late_orders(records):
    orders = pd.DataFrame(records, columns=["order_id", "delivered_at", "estimated_delivery"])
    delivered = pd.to_datetime(orders["delivered_at"], format="%Y-%m-%d %H:%M:%S")
    promised = pd.to_datetime(orders["estimated_delivery"], format="%Y-%m-%d")
    late = delivered > promised
    return orders[late]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "a delivery at 01:26 on the estimated day is after midnight of that day, so it is wrongly called late",
          },
          {
            code: src`
import pandas as pd

def late_orders(records):
    orders = pd.DataFrame(records, columns=["order_id", "delivered_at", "estimated_delivery"])
    delivered = pd.to_datetime(orders["delivered_at"], format="%Y-%m-%d %H:%M:%S")
    promised = pd.to_datetime(orders["estimated_delivery"], format="%Y-%m-%d")
    late = ~(delivered.dt.normalize() <= promised)
    return orders[late]["order_id"].tolist()
`,
            fails: ["returns"],
            why: "comparisons with NaT are False, so flipping `<=` marks undelivered orders as late",
          },
        ],
        hints: [
          "Convert both columns: one has a time, the other only a date.",
          "Compare whole days: strip the time from the delivery moment first.",
          "A missing delivery becomes NaT, and any comparison with NaT is False, which is the rule you want.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "late_orders", [
              example([pick(["order_id", "delivered_at", "estimated_delivery"])], ["O103326"]),
              example([[{ order_id: "O101219", delivered_at: "2024-03-19 01:26:45", estimated_delivery: "2024-03-19" }, { order_id: "O103326", delivered_at: "2024-06-26 00:30:53", estimated_delivery: "2024-06-24" }]], ["O103326"]),
              example([[]], []),
              hiddenCase("delivered just before midnight on the estimated day", [[{ order_id: "A", delivered_at: "2024-07-11 23:59:59", estimated_delivery: "2024-07-11" }]], []),
              hiddenCase("several late orders", [[{ order_id: "O103436", delivered_at: "2024-07-02 19:53:48", estimated_delivery: "2024-06-29" }, { order_id: "O103682", delivered_at: "2024-07-13 07:34:42", estimated_delivery: "2024-07-11" }]], ["O103436", "O103682"]),
              hiddenCase("only undelivered orders", [[{ order_id: "O103332", delivered_at: null, estimated_delivery: "2024-06-24" }]], []),
            ], { label: "late_orders() lists orders delivered on a later day than estimated" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Monthly revenue from raw timestamps",
        prompt: "Write `monthly_revenue(records)`: return `{\"YYYY-MM\": revenue}` from `ordered_at` and `total`, leaving out cancelled orders and orders whose `ordered_at` is not a valid timestamp.",
        spec: [
          ["Function", "`monthly_revenue(records)`"],
          ["Returns", "a dictionary from month text (e.g. `\"2024-06\"`) to the sum of `total`"],
          ["Example", "the nine orders → January 127.31, February 55.72, … June 103.32 (the cancelled order is left out)"],
        ],
        starter: src`
import pandas as pd

def monthly_revenue(records):
    return {}

orders = [
    {"ordered_at": "2024-06-12 12:25:00", "status": "delivered", "total": 64.17},
    {"ordered_at": "2024-06-18 23:05:00", "status": "cancelled", "total": 25.24},
]
print(monthly_revenue(orders))
`,
        answer: src`
import pandas as pd

def monthly_revenue(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "status", "total"])
    orders = orders[orders["status"] != "cancelled"]
    when = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
    sums = orders.groupby(when.dt.to_period("M"))["total"].sum()
    return {str(month): total for month, total in sums.items()}

orders = [
    {"ordered_at": "2024-06-12 12:25:00", "status": "delivered", "total": 64.17},
    {"ordered_at": "2024-06-18 23:05:00", "status": "cancelled", "total": 25.24},
]
print(monthly_revenue(orders))
`,
        alternatives: [
          src`
import pandas as pd

def monthly_revenue(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "status", "total"])
    orders["when"] = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
    kept = orders[(orders["status"] != "cancelled") & orders["when"].notna()]
    labels = kept["when"].dt.strftime("%Y-%m")
    return kept.groupby(labels)["total"].sum().to_dict()
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def monthly_revenue(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "status", "total"])
    when = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S", errors="coerce")
    sums = orders.groupby(when.dt.to_period("M"))["total"].sum()
    return {str(month): total for month, total in sums.items()}
`,
            fails: ["returns"],
            why: "cancelled orders are counted as revenue",
          },
          {
            code: src`
import pandas as pd

def monthly_revenue(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "status", "total"])
    orders = orders[orders["status"] != "cancelled"]
    when = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S")
    sums = orders.groupby(when.dt.to_period("M"))["total"].sum()
    return {str(month): total for month, total in sums.items()}
`,
            fails: ["returns"],
            why: "without `errors=\"coerce\"` one invalid timestamp crashes the whole report",
          },
        ],
        hints: [
          "Leave out the cancelled orders first.",
          "Parse the timestamps so that invalid ones become NaT instead of stopping the program.",
          "Group by the month period; its text form is `\"2024-06\"`.",
        ],
        task: {
          packages: PD,
          checks: [
            fn("returns", "monthly_revenue", [
              example([pick(["ordered_at", "status", "total"])], { "2024-01": 127.31, "2024-02": 55.72, "2024-03": 246.6, "2024-04": 54.55, "2024-05": 17.75, "2024-06": 103.32 }),
              example([[{ ordered_at: "2024-06-12 12:25:00", status: "delivered", total: 64.17 }, { ordered_at: "2024-06-18 23:05:00", status: "cancelled", total: 25.24 }]], { "2024-06": 64.17 }),
              example([[]], {}),
              hiddenCase("an invalid timestamp", [[{ ordered_at: "2024-02-30 10:00:00", status: "delivered", total: 12 }, { ordered_at: "2024-02-29 10:00:00", status: "delivered", total: 8 }]], { "2024-02": 8 }),
              hiddenCase("orders across a year end", [[{ ordered_at: "2024-12-31 23:59:59", status: "shipped", total: 10 }, { ordered_at: "2025-01-01 00:00:00", status: "delivered", total: 20 }]], { "2024-12": 10, "2025-01": 20 }),
              hiddenCase("only cancelled orders", [[{ ordered_at: "2024-06-18 23:05:00", status: "cancelled", total: 25.24 }]], {}),
            ], { label: "monthly_revenue() sums valid, non-cancelled orders per month", compare: loose }),
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

when = pd.to_datetime(pd.Series(["2024-06-18 22:12:48", "2024-06-26 00:30:53"]), format="%Y-%m-%d %H:%M:%S")
gap = when.iloc[1] - when.iloc[0]
print(gap.days, when.dt.day.tolist(), str(when.dt.to_period("M").iloc[0]))
`,
        choices: ["7 [18, 26] 2024-06", "8 [18, 26] 2024-06", "7 [6, 6] 2024-06", "7 [18, 26] 6"],
        answer: 0,
        why: "7 days and about 2 hours: `.days` is the whole days, 7. `.dt.day` is the day of the month. The period prints as `2024-06`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: comparing a timestamp with a date. What does this print?",
        program: src`
import pandas as pd

delivered = pd.Timestamp("2024-03-19 01:26:45")
promised = pd.Timestamp("2024-03-19")
print(delivered > promised, delivered.normalize() > promised)
`,
        choices: ["True False", "False False", "True True", "False True"],
        answer: 0,
        why: "A date alone means midnight, so 01:26 that day is later. `normalize()` sets the time to midnight, comparing whole days.",
      },
      {
        id: "q3",
        prompt: "Why pass `format=` to `pd.to_datetime`?",
        choices: ["So ambiguous dates like 01/02/2024 are read the way your data means them, and bad values are caught", "Because pandas can't parse dates without it", "To make the column print as text", "To convert the times to UTC"],
        answer: 0,
        why: "Guessing can read day and month the wrong way round; an explicit format parses exactly and flags values that don't fit.",
      },
    ],
    review: [
      "`pd.to_datetime(col, format=..., errors=\"coerce\")` turns text into datetimes (bad values become NaT).",
      "`.dt` gives parts and methods; subtracting datetimes gives Timedeltas (`.dt.total_seconds()`, `.days`).",
      "`dt.to_period(\"M\")` groups by month; `dt.normalize()` compares whole days.",
      "Next: find and fix duplicates and inconsistent values before trusting any of these numbers.",
    ],
  },

  // ------------------------------------------------------------------ PY-L43-05 data quality
  {
    id: "PY-L43-05",
    version: 2,
    slug: "data-quality-checks",
    title: "Data quality checks",
    lede: "Duplicates hide behind different capital letters and stray spaces. Normalise text first, then find duplicates on the columns that identify a record, and report every rule a row breaks as a count.",
    focus: "Normalise text columns, find and drop duplicates by key with duplicated/drop_duplicates, and summarise rule violations in a quality report.",
    minutes: 20,
    objectives: [
      "Normalise text with `.str.strip()`, `.str.lower()` and `.str.title()` before comparing",
      "Find duplicates by key with `duplicated(subset=..., keep=...)` and remove them with `drop_duplicates`",
      "Count rule violations (missing, duplicated, wrong format) in a report instead of silently fixing them",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "boolean", "comparison", "conversion", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "np-dtype", "np-reduce", "pd-filter", "pd-frame", "pd-loc", "pd-merge", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-index", "string-method", "top-level-indent", "truthiness", "unquoted-name"],
    teaches: ["pd-quality"],
    packages: PD,
    blocks: [
      {
        kind: "text",
        md: "Runtime Market's raw customers file has the same e-mail as `Noah.scott51@outlook.com` and `NOAH.SCOTT51@OUTLOOK.COM`, cities such as `MIAMI` and ` Houston`, and the same customer exported twice. Every count and join built on that data is quietly wrong. Two steps fix most of it: **normalise** text (strip spaces, one case) so equal things compare equal, then **deduplicate on a key**: `duplicated(subset=[...])` marks every row whose key appeared earlier (`keep=\"first\"`) or later (`keep=\"last\"`), and `drop_duplicates` removes them.",
      },
      {
        kind: "example",
        title: "Duplicates that only appear after normalising",
        code: src`
import pandas as pd

customers = pd.DataFrame({
    "customer_id": ["C02264", "C02308", "C04614", "C08994"],
    "email": ["Noah.scott51@outlook.com", "theowilliams@yahoo.com", "ana.novak45@goldencorp.com ", "NOAH.SCOTT51@OUTLOOK.COM"],
    "city": ["MIAMI", " Houston", "New York", "Raleigh"],
})
print(customers["email"].duplicated().sum())
customers["email"] = customers["email"].str.strip().str.lower()
customers["city"] = customers["city"].str.strip().str.title()
print(customers["email"].duplicated().sum(), customers["city"].tolist())
print(customers[customers["email"].duplicated(keep=False)]["customer_id"].tolist())
`,
        output: "0\n1 ['Miami', 'Houston', 'New York', 'Raleigh']\n['C02264', 'C08994']\n",
        note: "Before normalising nothing looks duplicated. Afterwards one e-mail is a repeat. `keep=False` marks **every** copy, which is what a reviewer wants to see.",
      },
      {
        kind: "error-example",
        title: "A subset column with the wrong name",
        code: src`
import pandas as pd

customers = pd.DataFrame({"customer_id": ["C02308", "C02308"], "email": ["theowilliams@yahoo.com", "theowilliams@yahoo.com"]})
print(customers.drop_duplicates(subset=["Email"]))
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: Index(['Email'], dtype='str')`: the column is `email`.",
      },
      {
        kind: "example",
        title: "A quality report",
        code: src`
import pandas as pd

customers = pd.DataFrame({
    "customer_id": ["C02264", "C02308", "C02308", "C06310", "C08994"],
    "email": ["noah.scott51@outlook.com", "theowilliams@yahoo.com", "theowilliams@yahoo.com", None, "noahpatel@willowlabs.com"],
    "state": ["FL", "TX", "TX", "OR", "nc"],
})
report = {
    "rows": len(customers),
    "duplicate_rows": int(customers.duplicated().sum()),
    "missing_email": int(customers["email"].isna().sum()),
    "bad_state": int((~customers["state"].str.fullmatch(r"[A-Z]{2}")).sum()),
}
print(report)
clean = customers.drop_duplicates(subset=["customer_id"], keep="last")
print(clean["customer_id"].tolist())
`,
        output: "{'rows': 5, 'duplicate_rows': 1, 'missing_email': 1, 'bad_state': 1}\n['C02264', 'C02308', 'C06310', 'C08994']\n",
        note: "Each rule becomes a count, so a pipeline can stop when a count is too high and a person can see what was wrong. `str.fullmatch` applies a regular expression (see Dates Numbers & Regex) to every value: two capital letters. `duplicated()` with no subset compares whole rows.",
      },
      {
        kind: "text",
        md: "**When to use it:** on every new file, before joins and aggregates. **Mistakes to avoid:** deduplicating before normalising (case and spaces hide copies); deduplicating on the whole row when the key is what identifies a record; keeping the wrong copy (sort first, then choose `keep=\"first\"` or `\"last\"` on purpose); and \"fixing\" data without counting what you fixed.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Keep the latest record",
      prompt: "`latest_records` keeps the first record of each customer, but the export lists updates later in the file, so the **last** record is the current one. Change which copy is kept.",
      spec: [
        ["Function", "`latest_records(records)`"],
        ["Returns", "a list of e-mails, one per customer, from each customer's last record"],
      ],
      starter: src`
import pandas as pd

def latest_records(records):
    table = pd.DataFrame(records)
    kept = table.drop_duplicates(subset=["customer_id"], keep="first")
    return kept["email"].tolist()

print(latest_records([{"customer_id": "C1", "email": "old@x.com"}, {"customer_id": "C1", "email": "new@x.com"}]))
`,
      answer: src`
import pandas as pd

def latest_records(records):
    table = pd.DataFrame(records)
    kept = table.drop_duplicates(subset=["customer_id"], keep="last")
    return kept["email"].tolist()

print(latest_records([{"customer_id": "C1", "email": "old@x.com"}, {"customer_id": "C1", "email": "new@x.com"}]))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def latest_records(records):
    table = pd.DataFrame(records)
    kept = table.drop_duplicates(keep="last")
    return kept["email"].tolist()
`,
          fails: ["returns"],
          why: "without `subset` only identical rows count as duplicates, so both versions are kept",
        },
      ],
      hints: ["The key stays the same.", "One argument decides which copy survives.", "The current record is the one further down."],
      task: {
        packages: PD,
        checks: [
          fn("returns", "latest_records", [
            example([[{ customer_id: "C1", email: "old@x.com" }, { customer_id: "C1", email: "new@x.com" }]], ["new@x.com"]),
            hiddenCase("no duplicates", [[{ customer_id: "C1", email: "a@x.com" }, { customer_id: "C2", email: "b@x.com" }]], ["a@x.com", "b@x.com"]),
            hiddenCase("three versions of one customer", [[{ customer_id: "C1", email: "1@x.com" }, { customer_id: "C2", email: "b@x.com" }, { customer_id: "C1", email: "2@x.com" }, { customer_id: "C1", email: "3@x.com" }]], ["b@x.com", "3@x.com"]),
          ], { label: "latest_records() keeps each customer's last record" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "One customer per e-mail address",
        prompt: "Write `dedupe_by_email(customers)`: return a **new** DataFrame where e-mails are normalised (spaces stripped, lower case) and only one row per e-mail remains: the one with the **latest** `signup_at`. Rows without an e-mail are kept as they are. Return the rows ordered by `customer_id`. The caller's DataFrame must not change.",
        spec: [
          ["Function", "`dedupe_by_email(customers)`"],
          ["customers", "a DataFrame with `customer_id`, `email`, `city`, `state`, `signup_at` (text, `YYYY-MM-DD HH:MM:SS`)"],
          ["Returns", "a new DataFrame with the same columns"],
        ],
        starter: src`
import pandas as pd

def dedupe_by_email(customers):
    return customers

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "Noah.scott51@outlook.com", "city": "MIAMI", "state": "FL", "signup_at": "2024-06-12 12:09:00"},
    {"customer_id": "C08994", "email": "NOAH.SCOTT51@OUTLOOK.COM", "city": "Raleigh", "state": "nc", "signup_at": "2025-11-26 22:29:00"},
])
print(dedupe_by_email(customers))
`,
        answer: src`
import pandas as pd

def dedupe_by_email(customers):
    result = customers.copy()
    result["email"] = result["email"].str.strip().str.lower()
    has_email = result["email"].notna()
    newest = result[has_email].sort_values("signup_at").drop_duplicates(subset=["email"], keep="last")
    kept = pd.concat([newest, result[~has_email]])
    return kept.sort_values("customer_id")

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "Noah.scott51@outlook.com", "city": "MIAMI", "state": "FL", "signup_at": "2024-06-12 12:09:00"},
    {"customer_id": "C08994", "email": "NOAH.SCOTT51@OUTLOOK.COM", "city": "Raleigh", "state": "nc", "signup_at": "2025-11-26 22:29:00"},
])
print(dedupe_by_email(customers))
`,
        alternatives: [
          src`
import pandas as pd

def dedupe_by_email(customers):
    result = customers.assign(email=customers["email"].str.strip().str.lower())
    result = result.sort_values("signup_at")
    repeat = result["email"].notna() & result["email"].duplicated(keep="last")
    return result[~repeat].sort_values("customer_id")
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def dedupe_by_email(customers):
    result = customers.copy()
    result = result.sort_values("signup_at").drop_duplicates(subset=["email"], keep="last")
    return result.sort_values("customer_id")
`,
            fails: ["rows", "rows-hidden"],
            why: "without normalising, e-mails that differ only in case or spaces stay as separate customers",
          },
          {
            code: src`
import pandas as pd

def dedupe_by_email(customers):
    result = customers.copy()
    result["email"] = result["email"].str.strip().str.lower()
    result = result.drop_duplicates(subset=["email"], keep="first")
    return result.sort_values("customer_id")
`,
            fails: ["rows", "rows-hidden"],
            why: "it keeps the first row in the file, not the latest signup, and merges every customer without an e-mail into one",
          },
          {
            code: src`
import pandas as pd

def dedupe_by_email(customers):
    customers["email"] = customers["email"].str.strip().str.lower()
    has_email = customers["email"].notna()
    newest = customers[has_email].sort_values("signup_at").drop_duplicates(subset=["email"], keep="last")
    return pd.concat([newest, customers[~has_email]]).sort_values("customer_id")
`,
            fails: ["keeps-input"],
            why: "the result is right, but the caller's e-mails are rewritten",
          },
        ],
        hints: [
          "Normalise on a copy first; then equal addresses really are equal.",
          "Sort by signup time so that `keep=\"last\"` means the latest.",
          "Missing e-mails all look the same to `drop_duplicates`: handle those rows separately (`pd.concat` joins two DataFrames' rows).",
        ],
        task: {
          packages: PD,
          checks: [
            frameRows("rows", "dedupe_by_email() keeps the latest row per normalised e-mail", "dedupe_by_email(_df)", [
              { customer_id: "C02308", email: "theowilliams@yahoo.com", city: "Houston", state: "TX", signup_at: "2024-07-01 09:00:00" },
              { customer_id: "C04614", email: "ana.novak45@goldencorp.com", city: "New York", state: "NY", signup_at: "2024-12-25 21:42:00" },
              { customer_id: "C06310", email: null, city: "Portland", state: "OR", signup_at: "2025-06-01 00:56:00" },
              { customer_id: "C08994", email: "noah.scott51@outlook.com", city: "Raleigh", state: "nc", signup_at: "2025-11-26 22:29:00" },
            ], { setup: frameSetup(rawCustomers), show: "dedupe_by_email(customers)" }),
            frameRows("rows-hidden", "Works for other customers (an older copy later in the file, two rows without an e-mail)", "dedupe_by_email(_df)", [
              { customer_id: "A1", email: "x@y.com", city: "Austin", state: "TX", signup_at: "2025-01-01 00:00:00" },
              { customer_id: "A3", email: null, city: "Dallas", state: "TX", signup_at: "2024-03-01 00:00:00" },
              { customer_id: "A4", email: null, city: "Waco", state: "TX", signup_at: "2024-04-01 00:00:00" },
            ], { hidden: true, setup: frameSetup([
              { customer_id: "A1", email: "X@y.com ", city: "Austin", state: "TX", signup_at: "2025-01-01 00:00:00" },
              { customer_id: "A2", email: "x@Y.com", city: "Austin", state: "TX", signup_at: "2024-01-01 00:00:00" },
              { customer_id: "A3", email: null, city: "Dallas", state: "TX", signup_at: "2024-03-01 00:00:00" },
              { customer_id: "A4", email: null, city: "Waco", state: "TX", signup_at: "2024-04-01 00:00:00" },
            ]) }),
            { kind: "expr", id: "keeps-input", label: "dedupe_by_email() leaves the caller's DataFrame unchanged", expr: `${frameSetup(rawCustomers)}\ndedupe_by_email(_df)\nresult = _df["email"].fillna("<missing>").tolist()`, expected: pv(rawCustomers.map((c) => c.email ?? "<missing>")) },
          ],
        },
      },
      {
        id: "c2",
        title: "A customer-file quality report",
        prompt: "Write `quality_report(customers)`: count, without changing anything, `rows`; `duplicate_ids` (rows whose `customer_id` already appeared earlier); `missing_email`; `bad_state` (a `state` that is not exactly two capital letters); and `messy_city` (a `city` that changes when stripped and title-cased). Return them as a dictionary.",
        spec: [
          ["Function", "`quality_report(customers)`"],
          ["Returns", "`{\"rows\", \"duplicate_ids\", \"missing_email\", \"bad_state\", \"messy_city\"}` with int counts"],
          ["Example", "the six raw rows → `{'rows': 6, 'duplicate_ids': 1, 'missing_email': 1, 'bad_state': 1, 'messy_city': 2}`"],
        ],
        starter: src`
import pandas as pd

def quality_report(customers):
    return {"rows": len(customers)}

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "noah.scott51@outlook.com", "city": "MIAMI", "state": "FL"},
    {"customer_id": "C02264", "email": None, "city": "Miami", "state": "fl"},
])
print(quality_report(customers))
`,
        answer: src`
import pandas as pd

def quality_report(customers):
    city = customers["city"].fillna("")
    return {
        "rows": len(customers),
        "duplicate_ids": int(customers["customer_id"].duplicated().sum()),
        "missing_email": int(customers["email"].isna().sum()),
        "bad_state": int((~customers["state"].fillna("").str.fullmatch(r"[A-Z]{2}")).sum()),
        "messy_city": int((city != city.str.strip().str.title()).sum()),
    }

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "noah.scott51@outlook.com", "city": "MIAMI", "state": "FL"},
    {"customer_id": "C02264", "email": None, "city": "Miami", "state": "fl"},
])
print(quality_report(customers))
`,
        alternatives: [
          src`
import re
import pandas as pd

def quality_report(customers):
    seen = []
    report = {"rows": 0, "duplicate_ids": 0, "missing_email": 0, "bad_state": 0, "messy_city": 0}
    for row in customers.to_dict("records"):
        report["rows"] += 1
        if row["customer_id"] in seen:
            report["duplicate_ids"] += 1
        seen.append(row["customer_id"])
        if pd.isna(row["email"]):
            report["missing_email"] += 1
        if not isinstance(row["state"], str) or not re.fullmatch(r"[A-Z]{2}", row["state"]):
            report["bad_state"] += 1
        if isinstance(row["city"], str) and row["city"] != row["city"].strip().title():
            report["messy_city"] += 1
    return report
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def quality_report(customers):
    city = customers["city"].fillna("")
    return {
        "rows": len(customers),
        "duplicate_ids": int(customers.duplicated().sum()),
        "missing_email": int(customers["email"].isna().sum()),
        "bad_state": int((~customers["state"].fillna("").str.fullmatch(r"[A-Z]{2}")).sum()),
        "messy_city": int((city != city.str.strip().str.title()).sum()),
    }
`,
            fails: ["returns", "returns-hidden"],
            why: "comparing whole rows misses a repeated ID whose other columns differ",
          },
          {
            code: src`
import pandas as pd

def quality_report(customers):
    city = customers["city"].fillna("")
    return {
        "rows": len(customers),
        "duplicate_ids": int(customers["customer_id"].duplicated(keep=False).sum()),
        "missing_email": int(customers["email"].isna().sum()),
        "bad_state": int((~customers["state"].fillna("").str.fullmatch(r"[A-Z]{2}")).sum()),
        "messy_city": int((city != city.str.strip().str.title()).sum()),
    }
`,
            fails: ["returns", "returns-hidden"],
            why: "`keep=False` counts the first copy as a duplicate too",
          },
        ],
        hints: [
          "Each count is the sum of a True/False Series.",
          "A repeated ID is one already seen above it: that is `duplicated()`'s default.",
          "A city is messy when it differs from its own cleaned version; a state is fine only if it fully matches two capitals.",
        ],
        task: {
          packages: PD,
          checks: [
            { kind: "expr", id: "returns", label: "quality_report() counts every rule", show: "quality_report(customers)", expr: `${frameSetup(rawCustomers)}\nresult = quality_report(_df)`, expected: pv({ rows: 6, duplicate_ids: 1, missing_email: 1, bad_state: 1, messy_city: 2 }) },
            { kind: "expr", id: "returns-hidden", label: "Works for other files (an ID three times with different e-mails, a clean file)", hidden: true, expr: `${frameSetup([
              { customer_id: "C1", email: "a@x.com", city: "Austin", state: "TX" },
              { customer_id: "C1", email: "b@x.com", city: "austin", state: "Tx" },
              { customer_id: "C1", email: null, city: "Austin ", state: "TX" },
            ])}\n_a = quality_report(_df)\n${frameSetup([{ customer_id: "C2", email: "c@x.com", city: "New York", state: "NY" }])}\nresult = [_a, quality_report(_df)]`, expected: pv([{ rows: 3, duplicate_ids: 2, missing_email: 1, bad_state: 1, messy_city: 2 }, { rows: 1, duplicate_ids: 0, missing_email: 0, bad_state: 0, messy_city: 0 }]) },
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

ids = pd.Series(["C1", "C2", "C1", "C3", "C1"])
print(ids.duplicated().sum(), ids.duplicated(keep="last").tolist()[0], ids.duplicated(keep=False).sum())
`,
        choices: ["2 True 3", "3 True 3", "2 False 3", "2 True 2"],
        answer: 0,
        why: "Default `keep=\"first\"` marks the 2nd and 3rd C1. With `keep=\"last\"` the first C1 has a later copy, so it is marked. `keep=False` marks all three C1 rows.",
      },
      {
        id: "q2",
        prompt: "A common mistake: deduplicating before normalising. What does this print?",
        program: src`
import pandas as pd

emails = pd.Series(["ben.brown@yahoo.com", "Ben.Brown@yahoo.com ", "ben.brown@yahoo.com"])
print(len(emails.drop_duplicates()), len(emails.str.strip().str.lower().drop_duplicates()))
`,
        choices: ["2 1", "1 1", "3 1", "2 2"],
        answer: 0,
        why: "Only the exact repeat is dropped at first; after stripping and lower-casing, all three are the same address.",
      },
      {
        id: "q3",
        prompt: "Why report counts of problems instead of just fixing them?",
        choices: ["So a pipeline can stop when a count is too high and people can see how bad the data was", "Because pandas can't fix data", "Counting is faster than fixing", "Fixed data can't be saved"],
        answer: 0,
        why: "A silent fix hides a broken source. A report (and a threshold) makes the problem visible and the decision explicit.",
      },
    ],
    review: [
      "Normalise text (`str.strip`, `str.lower`, `str.title`) before comparing or deduplicating.",
      "`duplicated(subset, keep)` marks repeats; `drop_duplicates` removes them; sort first to choose which copy survives.",
      "A quality report turns each rule into a count.",
      "Next (see Visualization & EDA): charts that show what these tables mean.",
    ],
  },
];
