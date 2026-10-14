import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const f = py.float;

export const mergingAndReshapingData: PyLesson = {
  slug: "merging-and-reshaping-data",
  ref: "python:merging-and-reshaping-data",
  module: "pandas",
  number: 7,
  title: "Merging and reshaping data",
  level: "intermediate",
  summary:
    "Combine tables: join orders to customers with `merge` (and check the join did what you expected), stack tables with `concat`, turn rows into a grid with `pivot_table`, and turn a grid back into rows with `melt`.",
  packages: ["pandas"],
  files: SHOP_FILES,

  sections: [
    {
      label: "merge: joining on a key",
      blocks: [
        {
          kind: "p",
          text: "`orders.merge(customers, on=\"customer_id\", how=\"left\")` adds the matching customer's columns to each order, the same idea as a SQL join. `how` decides what happens to rows without a match: `\"inner\"` keeps only matches, `\"left\"` keeps every order (customer columns become missing where there's no match), `\"right\"` and `\"outer\"` likewise for the other side or both.",
        },
        { kind: "code", code: 'joined = orders.merge(customers, on="customer_id", how="left", validate="many_to_one", indicator=True)\nprint(joined["_merge"].value_counts())' },
        {
          kind: "p",
          text: "Two safety nets: `validate=\"many_to_one\"` raises an error if a customer appears twice in `customers` (which would silently duplicate orders), and `indicator=True` adds a `_merge` column saying whether each row matched (`both`) or not (`left_only`). Always check the row count after a join.",
        },
      ],
    },
    {
      label: "concat: stacking tables",
      blocks: [
        {
          kind: "p",
          text: "`pd.concat([january, february], ignore_index=True)` stacks tables with the same columns on top of each other, such as monthly exports, and renumbers the index.",
        },
      ],
    },
    {
      label: "pivot_table and melt",
      blocks: [
        {
          kind: "p",
          text: "`pivot_table(index=\"city\", columns=\"category\", values=\"line_total\", aggfunc=\"sum\", fill_value=0)` makes a grid: one row per city, one column per category, each cell an aggregate. `fill_value` says what to show for combinations with no data, a decision worth stating. `melt` goes the other way, turning a wide grid back into long rows of `(id, variable, value)`, which is the shape `groupby` and charts prefer.",
        },
      ],
    },
  ],

  example: {
    caption: "Joining orders to customers, checking the join, and pivoting revenue by city. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\norders = pd.read_csv("orders.csv")\ncustomers = pd.read_csv("customers.csv")\norders["line_total"] = orders["quantity"] * orders["unit_price"]\n\njoined = orders.merge(customers, on="customer_id", how="left", validate="many_to_one", indicator=True)\nprint(len(orders), "orders ->", len(joined), "rows;", joined["_merge"].value_counts().to_dict())\n\ncompleted = joined[joined["status"] == "completed"]\ngrid = completed.pivot_table(index="city", columns="category", values="line_total", aggfunc="sum", fill_value=0)\ndisplay(grid)',
  },

  walkthrough: [
    {
      title: "A left join keeps every order",
      text: "Order 3's customer isn't in the customer table, so its `name` is missing, but the order stays.",
      code: 'import pandas as pd\norders = pd.DataFrame({"order_id": [1, 2, 3], "customer_id": ["C1", "C2", "C9"]})\ncustomers = pd.DataFrame({"customer_id": ["C1", "C2"], "name": ["Ada", "Ben"]})\nprint(orders.merge(customers, on="customer_id", how="left"))\nprint(len(orders.merge(customers, on="customer_id", how="inner")), "rows with an inner join")',
    },
    {
      title: "validate catches duplicate keys",
      text: "C1 appears twice in `customers`, which would duplicate order 1. `validate` turns that into an error.",
      code: 'import pandas as pd\nimport pandas.errors\norders = pd.DataFrame({"order_id": [1], "customer_id": ["C1"]})\ncustomers = pd.DataFrame({"customer_id": ["C1", "C1"], "name": ["Ada", "Ada L."]})\nprint(len(orders.merge(customers, on="customer_id")))\ntry:\n    orders.merge(customers, on="customer_id", validate="many_to_one")\nexcept pandas.errors.MergeError as error:\n    print("MergeError:", error)',
    },
    {
      title: "concat stacks tables",
      text: "Two monthly tables become one, with a new index.",
      code: 'import pandas as pd\nsep = pd.DataFrame({"month": ["2026-09"], "revenue": [514.5]})\noct_ = pd.DataFrame({"month": ["2026-10"], "revenue": [602.0]})\nprint(pd.concat([sep, oct_], ignore_index=True))',
    },
    {
      title: "pivot_table and melt",
      text: "`pivot_table` makes a city × category grid; `melt` turns it back into long rows.",
      code: 'import pandas as pd\nsales = pd.DataFrame({"city": ["Leeds", "Leeds", "York"], "category": ["lighting", "furniture", "lighting"], "revenue": [50.0, 120.0, 30.0]})\ngrid = sales.pivot_table(index="city", columns="category", values="revenue", aggfunc="sum", fill_value=0)\nprint(grid)\nprint(grid.reset_index().melt(id_vars="city", value_name="revenue"))',
    },
  ],

  mistakes: [
    {
      title: "Duplicate keys multiply rows",
      text: "C1 is listed twice in the customer table, so the merge doubles order 1 and its revenue, without any error.",
      code: 'import pandas as pd\norders = pd.DataFrame({"order_id": [1, 2], "customer_id": ["C1", "C2"], "total": [40.0, 15.0]})\ncustomers = pd.DataFrame({"customer_id": ["C1", "C1", "C2"], "city": ["London", "London", "Leeds"]})\njoined = orders.merge(customers, on="customer_id")\nprint(len(joined), joined["total"].sum())',
      fix: 'Add `validate="many_to_one"`, deduplicate the lookup table, and compare row counts before and after.',
    },
    {
      title: "Joining on a column one side doesn't have",
      text: "`customers` has no `id` column: `KeyError`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\ncustomers = pd.read_csv("customers.csv")\norders.merge(customers, on="id")',
      raises: "KeyError",
      fix: 'Join on a column both tables have (`customer_id`), or use `left_on=` and `right_on=` for different names.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Join orders to customers safely",
      prompt:
        "Write `orders_with_city(orders, customers)`, which left-joins `customers` onto `orders` by `customer_id`, refusing duplicate customer IDs with `validate=\"many_to_one\"`. Return a tuple: the joined DataFrame with columns `order_id`, `customer_id` and `city` (in the original order of `orders`), and the **list of `order_id`s whose customer wasn't found**.",
      looksFor: [
        "Every order is kept, in order; `city` comes from the customer table.",
        "Orders whose customer isn't found are listed.",
        "A customer table with a duplicated ID raises an error instead of duplicating orders.",
      ],
      starter: 'import pandas as pd\n\n\ndef orders_with_city(orders, customers):\n    # Return (joined frame, order_ids without a matching customer).\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "join",
            label: "Every order with its city",
            show: 'orders_with_city(pd.read_csv("orders.csv"), pd.read_csv("customers.csv"))',
            expr: 'import pandas as pd\nout, missing = orders_with_city(pd.read_csv("orders.csv"), pd.read_csv("customers.csv"))\nresult = (list(out.columns), out["city"].tolist()[:4], len(out), list(missing))',
            expected: py.tuple(py.list(s("order_id"), s("customer_id"), s("city")), py.list(s("London"), s("Leeds"), s("London"), s("London")), i(12), py.list()),
          },
          {
            kind: "expr",
            id: "unmatched",
            label: "Lists orders without a customer",
            show: "orders for customer C99, who isn't in the table",
            expr: 'import pandas as pd\norders = pd.DataFrame({"order_id": [5, 6, 7], "customer_id": ["C01", "C99", "C02"]})\nout, missing = orders_with_city(orders, pd.read_csv("customers.csv"))\nresult = (out["order_id"].tolist(), [None if pd.isna(c) else c for c in out["city"]], list(missing))',
            expected: py.tuple(py.list(i(5), i(6), i(7)), py.list(s("London"), py.none, s("Leeds")), py.list(i(6))),
            tip: 'With indicator=True, rows whose _merge is "left_only" had no match.',
          },
          {
            kind: "expr",
            id: "duplicates",
            label: "A duplicated customer ID raises an error",
            show: "customers with C01 twice",
            expr: 'import pandas as pd\nimport pandas.errors\ncustomers = pd.DataFrame({"customer_id": ["C01", "C01"], "city": ["London", "Paris"]})\ntry:\n    orders_with_city(pd.DataFrame({"order_id": [1], "customer_id": ["C01"]}), customers)\n    result = "no error"\nexcept pandas.errors.MergeError:\n    result = "MergeError"',
            expected: s("MergeError"),
            tip: 'Pass validate="many_to_one" to merge.',
          },
        ],
      },
      hints: [
        'joined = orders.merge(customers[["customer_id", "city"]], on="customer_id", how="left", validate="many_to_one", indicator=True).',
        'missing = joined.loc[joined["_merge"] == "left_only", "order_id"].tolist().',
        'Return joined[["order_id", "customer_id", "city"]], missing.',
      ],
      answer: 'import pandas as pd\n\n\ndef orders_with_city(orders, customers):\n    """Left-join each order to its customer\'s city; also list orders with no matching customer."""\n    joined = orders.merge(\n        customers[["customer_id", "city"]],\n        on="customer_id",\n        how="left",\n        validate="many_to_one",\n        indicator=True,\n    )\n    missing = joined.loc[joined["_merge"] == "left_only", "order_id"].tolist()\n    return joined[["order_id", "customer_id", "city"]], missing',
      wrong: [
        { code: 'import pandas as pd\n\ndef orders_with_city(orders, customers):\n    joined = orders.merge(customers[["customer_id", "city"]], on="customer_id", how="inner")\n    return joined[["order_id", "customer_id", "city"]], []\n', fails: ["unmatched", "duplicates"], why: "inner join drops unmatched orders, and no validate" },
        { code: 'import pandas as pd\n\ndef orders_with_city(orders, customers):\n    joined = orders.merge(customers[["customer_id", "city"]], on="customer_id", how="left", indicator=True)\n    missing = joined.loc[joined["_merge"] == "left_only", "order_id"].tolist()\n    return joined[["order_id", "customer_id", "city"]], missing\n', fails: ["duplicates"], why: "no validate" },
      ],
    },
    {
      id: "challenge-2",
      title: "Revenue grid by city and category",
      prompt:
        "Write `revenue_grid(orders, customers)`: join each **completed** order to its customer's city, then return a pivot table of revenue (`quantity × unit_price`) with one row per city (sorted) and one column per category (sorted), with 0 for combinations that have no sales. Turn the cities into an ordinary `city` column with `reset_index()`.",
      looksFor: [
        "Only completed orders count; revenue is `quantity × unit_price`.",
        "Rows are cities and columns are categories, both sorted, with 0 for no sales.",
        "`city` is an ordinary column.",
      ],
      starter: 'import pandas as pd\n\n\ndef revenue_grid(orders, customers):\n    # Return the city x category revenue grid.\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "grid",
            label: "The grid of revenue",
            show: 'revenue_grid(pd.read_csv("orders.csv"), pd.read_csv("customers.csv"))',
            expr: 'import pandas as pd\nout = revenue_grid(pd.read_csv("orders.csv"), pd.read_csv("customers.csv"))\nout.columns.name = None\nresult = _records(out)',
            expected: py.list(
              ...([
                ["Hull", 0, 73.5, 0],
                ["Leeds", 120, 65, 30],
                ["London", 0, 73.5, 32.5],
                ["York", 120, 0, 0],
              ] as [string, number, number, number][]).map(([city, furn, light, stat]) =>
                py.dict([[s("city"), s(city)], [s("furniture"), f(furn)], [s("lighting"), f(light)], [s("stationery"), f(stat)]]),
              ),
            ),
            compare: { numbers: "int-float-equal" },
            tip: 'pivot_table(index="city", columns="category", values="line_total", aggfunc="sum", fill_value=0).reset_index().',
          },
        ],
      },
      hints: [
        'Filter completed orders and add line_total, then merge with customers[["customer_id", "city"]] on customer_id.',
        'pivot_table(index="city", columns="category", values="line_total", aggfunc="sum", fill_value=0) sorts rows and columns for you.',
        "Finish with .reset_index().",
      ],
      answer: 'import pandas as pd\n\n\ndef revenue_grid(orders, customers):\n    """Completed-order revenue by city (rows) and category (columns), 0 where there were no sales."""\n    completed = orders[orders["status"] == "completed"]\n    completed = completed.assign(line_total=completed["quantity"] * completed["unit_price"])\n    joined = completed.merge(customers[["customer_id", "city"]], on="customer_id", how="left", validate="many_to_one")\n    grid = joined.pivot_table(index="city", columns="category", values="line_total", aggfunc="sum", fill_value=0)\n    return grid.reset_index()',
      wrong: [
        { code: 'import pandas as pd\n\ndef revenue_grid(orders, customers):\n    c = orders.assign(line_total=orders["quantity"] * orders["unit_price"])\n    j = c.merge(customers[["customer_id", "city"]], on="customer_id")\n    return j.pivot_table(index="city", columns="category", values="line_total", aggfunc="sum", fill_value=0).reset_index()\n', fails: ["grid"], why: "every status counted" },
        { code: 'import pandas as pd\n\ndef revenue_grid(orders, customers):\n    c = orders[orders["status"] == "completed"]\n    c = c.assign(line_total=c["quantity"] * c["unit_price"])\n    j = c.merge(customers[["customer_id", "city"]], on="customer_id")\n    return j.pivot_table(index="city", columns="category", values="line_total", aggfunc="sum").reset_index()\n', fails: ["grid"], why: "NaN instead of 0" },
      ],
    },
  ],

  quiz: [
    {
      id: "how",
      prompt: "10 orders, 2 of them from customers missing from the customer table. How many rows does an **inner** merge give (customer IDs are unique)?",
      options: [
        { text: "8", correct: true, why: "An inner join keeps only orders that found a match." },
        { text: "10", why: "That's a left join, which keeps unmatched orders with missing customer columns." },
        { text: "12", why: "Rows only multiply when the lookup table has duplicate keys." },
        { text: "2", why: "Those are the unmatched ones; the inner join drops them." },
      ],
    },
    {
      id: "validate",
      prompt: 'What does `validate="many_to_one"` protect against?',
      options: [
        { text: "Duplicate keys in the right-hand table, which would silently multiply rows", correct: true, why: "Many orders can share one customer, but each customer must appear once." },
        { text: "Orders without a matching customer", why: "That's what `how` and `indicator` are for." },
        { text: "Different column names", why: "Names are handled by `on`, or `left_on`/`right_on`." },
        { text: "Missing values in the key", why: "Validation checks key uniqueness, not missing values." },
      ],
    },
  ],

  outcomes: [
    "Join tables with `merge`, choosing `how` deliberately.",
    "Check joins with `validate`, `indicator` and row counts.",
    "Stack tables with `pd.concat`.",
    "Reshape with `pivot_table` (with an explicit `fill_value`) and `melt`.",
  ],
};
