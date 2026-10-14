import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const b = py.bool;
const strs = (...xs: string[]) => py.list(...xs.map(s));
const bools = (...xs: boolean[]) => py.list(...xs.map(b));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const rows = (keys: string[], ...values: PyValue[][]) => py.list(...values.map((v) => rec(keys.map((k, n) => [k, v[n]] as [string, PyValue]))));
const close = { numbers: "int-float-equal" } as const;
const PD = ["pandas"] as const;

const REPORT_DF = 'df = pd.DataFrame({\n    "order_id": [1, 2, 3, 4],\n    "city": ["Leeds", None, "York", "Leeds"],\n    "amount": [9.5, None, 12.0, 9.5],\n})';
const REPORT_DEMO = `${REPORT_DF}\nfor row in column_report(df).itertuples(index=False):\n    print(*row)`;

const SELECT_DF = 'df = pd.DataFrame({"order_id": [1, 2], "city": ["Leeds", "York"], "amount": [9.5, 12.0], "notes": ["", "gift"]})';
const SELECT_DEMO = `${SELECT_DF}\nprint(list(select_columns(df, ["amount", "order_id"]).columns))\ntry:\n    select_columns(df, ["order_id", "region", "segment"])\nexcept ValueError as error:\n    print(error)`;

const FOLLOW_DF =
  'orders = pd.DataFrame({\n    "order_id": [1, 2, 3, 4, 5, 6],\n    "status": ["pending", "completed", None, "pending", "pending", None],\n    "placed": pd.to_datetime(["2026-10-01", "2026-09-20", "2026-10-05", "2026-10-10", "2026-10-07", "2026-10-13"]),\n})';
const FOLLOW_DEMO = `${FOLLOW_DF}\nprint(follow_up(orders, pd.Timestamp("2026-10-14")).to_dict("records"))`;

const COUNTS_DF =
  'customers = pd.DataFrame({"customer_id": ["C01", "C02", "C03", "C04"], "name": ["Ada", "Ben", "Cai", "Dee"]})\norders = pd.DataFrame({"order_id": [1, 2, 3, 4, 5], "customer_id": ["C02", "C01", "C02", "C09", "C02"]})';
const COUNTS_DEMO = `${COUNTS_DF}\nprint(order_counts(customers, orders).to_dict("records"))`;

const EVENTS_DF =
  'events = pd.DataFrame({\n    "ts": ["2026-10-13T23:30:00+00:00", "2026-10-14T01:15:00+02:00", "2026-10-14T09:00:00Z", "2026-10-14T20:00:00-05:00", "2026-10-14T12:00:00+00:00"],\n    "amount": [10.0, 20.0, 5.5, 4.5, 1.0],\n})';
const EVENTS_DEMO = `${EVENTS_DF}\nprint(daily_revenue(events).to_dict("records"))`;

const JOIN_DF =
  'orders = pd.DataFrame({"order_id": [1, 2, 3], "sku": ["A", "B", "A"], "qty": [2, 1, 1]})\nprices = pd.DataFrame({\n    "sku": ["A", "B", "A"],\n    "price": [12.0, 4.0, 10.0],\n    "effective": pd.to_datetime(["2026-06-01", "2026-01-01", "2026-01-01"]),\n})';
const JOIN_DEMO = `${JOIN_DF}\nprint(order_totals(orders, prices).to_dict("records"))`;

const MONTHLY_DF =
  'orders = pd.DataFrame({\n    "date": pd.to_datetime(["2026-07-03", "2026-07-20", "2026-08-02", "2026-09-15", "2026-09-30"]),\n    "amount": [100.0, 50.0, 120.0, 90.0, 45.0],\n})';
const MONTHLY_DEMO = `${MONTHLY_DF}\nfor row in monthly_change(orders).itertuples(index=False):\n    print(*row)`;

const OUTLIER_DF =
  'sales = pd.DataFrame({\n    "category": ["lighting"] * 5 + ["furniture"] * 5,\n    "amount": [10, 12, 11, 13, 60, 100, 120, 110, 115, 400],\n})';
const OUTLIER_DEMO = `${OUTLIER_DF}\nflagged = flag_outliers(sales)\nprint(flagged.loc[flagged["is_outlier"], "amount"].tolist())`;

export const py11: PyQuestion[] = [
  {
    ref: "python:bank:py11-01",
    slug: "py11-01",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "A per-column inspection report",
    topics: ["dtypes", "isna", "nunique"],
    minutes: 7,
    after: "python:missing-values-and-data-types",
    packages: PD,
    prompt:
      "Write `column_report(df)` returning a **DataFrame** with one row per column of `df`, in order, and the columns `column` (name), `dtype` (as text, like `\"int64\"`), `missing` (count of missing values) and `unique` (count of distinct non-missing values). It must work for a frame with columns but no rows.",
    expectedOutput: "order_id int64 0 4\ncity str 1 2\namount float64 1 2\n",
    looksFor: ["One row per column, in the frame's order.", "`missing` counts missing values, not present ones.", "`unique` doesn't count missing as a value.", "An empty frame gives zeros."],
    starter: `import pandas as pd\n\n\ndef column_report(df):\n    pass\n\n\n${REPORT_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "report", label: "Reports each column", show: "column_report(df) for the demo frame", expr: `${REPORT_DF}\nresult = _records(column_report(df))`, expected: rows(["column", "dtype", "missing", "unique"], [s("order_id"), s("int64"), i(0), i(4)], [s("city"), s("str"), i(1), i(2)], [s("amount"), s("float64"), i(1), i(2)]) },
        { kind: "expr", id: "empty", label: "A frame with no rows", show: 'column_report(pd.DataFrame({"a": pd.Series([], dtype="int64")}))', expr: 'result = _records(column_report(pd.DataFrame({"a": pd.Series([], dtype="int64")})))', expected: rows(["column", "dtype", "missing", "unique"], [s("a"), s("int64"), i(0), i(0)]) },
        { kind: "expr", id: "hidden", label: "Another frame", hidden: true, expr: 'result = _records(column_report(pd.DataFrame({"flag": [True, False, True], "x": [None, None, None]})))', expected: rows(["column", "dtype", "missing", "unique"], [s("flag"), s("bool"), i(0), i(2)], [s("x"), s("object"), i(3), i(0)]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "order_id int64 0 4\ncity str 1 2\namount float64 1 2\n" },
      ],
    },
    hints: ["Build a dictionary of four lists, one entry per column, and pass it to pd.DataFrame.", "str(df[c].dtype), int(df[c].isna().sum()), int(df[c].nunique()).", "nunique() already leaves missing values out."],
    answer: `import pandas as pd\n\n\ndef column_report(df):\n    return pd.DataFrame({\n        "column": list(df.columns),\n        "dtype": [str(df[c].dtype) for c in df.columns],\n        "missing": [int(df[c].isna().sum()) for c in df.columns],\n        "unique": [int(df[c].nunique()) for c in df.columns],\n    })\n\n\n${REPORT_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef column_report(df):\n    return pd.DataFrame({\n        "column": list(df.columns),\n        "dtype": [str(df[c].dtype) for c in df.columns],\n        "missing": [int(df[c].count()) for c in df.columns],\n        "unique": [int(df[c].nunique()) for c in df.columns],\n    })\n\n\n${REPORT_DEMO}\n`, fails: ["report", "hidden", "output"], why: "count() counts the values that are present." },
      { code: `import pandas as pd\n\n\ndef column_report(df):\n    return pd.DataFrame({\n        "column": list(df.columns),\n        "dtype": [str(df[c].dtype) for c in df.columns],\n        "missing": [int(df[c].isna().sum()) for c in df.columns],\n        "unique": [len(df[c].unique()) for c in df.columns],\n    })\n\n\n${REPORT_DEMO}\n`, fails: ["report", "hidden", "output"], why: "unique() includes NaN as one of the values." },
    ],
  },
  {
    ref: "python:bank:py11-02",
    slug: "py11-02",
    module: "pandas",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: cleaning a currency column",
    topics: ["str.replace", "to_numeric", "NaN"],
    minutes: 5,
    after: "python:missing-values-and-data-types",
    packages: PD,
    prompt: "A revenue column arrived as text. What does this program print?",
    code: 'import pandas as pd\n\nraw = pd.Series(["$1,200.50", "n/a", "", "$35", "-$4.25"])\ncleaned = raw.str.replace("$", "", regex=False).str.replace(",", "", regex=False)\namounts = pd.to_numeric(cleaned, errors="coerce")\n\nprint(amounts.tolist())\nprint(int(amounts.isna().sum()), round(float(amounts.sum()), 2))',
    output: "[1200.5, nan, nan, 35.0, -4.25]\n2 1231.25\n",
    explanation:
      "After removing `$` and `,` the texts are `1200.50`, `n/a`, an empty string, `35` and `-4.25`. With `errors=\"coerce\"`, anything that isn't a number (`n/a`, the empty string) becomes `NaN` instead of raising. The column is float, so `35` becomes `35.0`. `sum()` skips NaN: 1200.5 + 35 − 4.25 = 1231.25.",
    hints: ["What does errors=\"coerce\" do with text that isn't a number?", "Does sum() include NaN?"],
    wrong: ["[1200.5, nan, 0.0, 35.0, -4.25]\n1 1231.25", "[1200.5, nan, nan, 35.0, nan]\n3 1235.5"],
  },
  {
    ref: "python:bank:py11-03",
    slug: "py11-03",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Choose required columns, or say what's missing",
    topics: ["column selection", "validation", "error messages"],
    minutes: 5,
    after: "python:selecting-and-filtering-rows",
    packages: PD,
    prompt:
      "Write `select_columns(df, columns)` returning a DataFrame with exactly the named columns, in the order given. If any are missing, raise `ValueError` naming **all** of them, in the order requested: `missing columns: region, segment`. Don't silently drop missing names.",
    expectedOutput: "['amount', 'order_id']\nmissing columns: region, segment\n",
    looksFor: ["Columns come back in the requested order.", "Every missing name is reported, not just the first.", "The error is a `ValueError` with the exact message format."],
    starter: `import pandas as pd\n\n\ndef select_columns(df, columns):\n    pass\n\n\n${SELECT_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "order", label: "Returns the columns in the order asked", show: 'select_columns(df, ["amount", "order_id"])', expr: `${SELECT_DF}\nresult = _records(select_columns(df, ["amount", "order_id"]))`, expected: rows(["amount", "order_id"], [f(9.5), i(1)], [f(12), i(2)]) },
        { kind: "expr", id: "missing", label: "Names every missing column", show: 'select_columns(df, ["region", "city", "segment"])', expr: `${SELECT_DF}\ntry:\n    select_columns(df, ["region", "city", "segment"])\n    result = "no error"\nexcept ValueError as error:\n    result = str(error)`, expected: s("missing columns: region, segment") },
        { kind: "expr", id: "one", label: "One missing column", hidden: true, expr: `${SELECT_DF}\ntry:\n    select_columns(df, ["Amount"])\n    result = "no error"\nexcept ValueError as error:\n    result = str(error)`, expected: s("missing columns: Amount") },
        { kind: "output", id: "output", label: "Prints the demo", expected: "['amount', 'order_id']\nmissing columns: region, segment\n" },
      ],
    },
    hints: ["missing = [c for c in columns if c not in df.columns].", 'if missing: raise ValueError("missing columns: " + ", ".join(missing)).', "Then df[columns] picks them in that order."],
    answer: `import pandas as pd\n\n\ndef select_columns(df, columns):\n    missing = [c for c in columns if c not in df.columns]\n    if missing:\n        raise ValueError("missing columns: " + ", ".join(missing))\n    return df[list(columns)].copy()\n\n\n${SELECT_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef select_columns(df, columns):\n    return df[columns]\n\n\n${SELECT_DEMO}\n`, fails: "program" },
      { code: `import pandas as pd\n\n\ndef select_columns(df, columns):\n    for c in columns:\n        if c not in df.columns:\n            raise ValueError(f"missing columns: {c}")\n    return df[columns]\n\n\n${SELECT_DEMO}\n`, fails: ["missing", "output"] },
      { code: `import pandas as pd\n\n\ndef select_columns(df, columns):\n    return df[[c for c in columns if c in df.columns]]\n\n\n${SELECT_DEMO}\n`, fails: ["missing", "one", "output"] },
    ],
  },
  {
    ref: "python:bank:py11-04",
    slug: "py11-04",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Orders that need a follow-up",
    topics: ["boolean masks", "missing values", "dates"],
    minutes: 8,
    after: "python:cleaning-strings-dates-and-duplicates",
    packages: PD,
    prompt:
      "Write `follow_up(orders, today)` for a frame with `order_id`, `status` and `placed` (datetimes). An order needs a follow-up if its status is `\"pending\"` **or missing**, and it was placed **more than 7 days** before `today`. Return a new DataFrame with `order_id`, `status` (missing shown as `\"unknown\"`) and `days_open` (whole days), longest-open first, then by `order_id`, with a fresh 0-based index. Don't change `orders`.",
    expectedOutput: "[{'order_id': 1, 'status': 'pending', 'days_open': 13}, {'order_id': 3, 'status': 'unknown', 'days_open': 9}]\n",
    looksFor: ["Missing statuses count as open, not as \"not pending\".", "Exactly 7 days isn't more than 7.", "Longest-open first.", "The input frame is left as it was."],
    starter: `import pandas as pd\n\n\ndef follow_up(orders, today):\n    pass\n\n\n${FOLLOW_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Finds the open, old orders", show: 'follow_up(orders, pd.Timestamp("2026-10-14"))', expr: `${FOLLOW_DF}\nresult = _records(follow_up(orders, pd.Timestamp("2026-10-14")))`, expected: rows(["order_id", "status", "days_open"], [i(1), s("pending"), i(13)], [i(3), s("unknown"), i(9)]) },
        { kind: "expr", id: "later", label: "A later today catches more", show: 'follow_up(orders, pd.Timestamp("2026-10-20"))', expr: `${FOLLOW_DF}\nresult = _records(follow_up(orders, pd.Timestamp("2026-10-20")))`, expected: rows(["order_id", "status", "days_open"], [i(1), s("pending"), i(19)], [i(3), s("unknown"), i(15)], [i(5), s("pending"), i(13)], [i(4), s("pending"), i(10)]) },
        { kind: "expr", id: "untouched", label: "orders still has its missing statuses", show: "orders.status after follow_up", expr: `${FOLLOW_DF}\nfollow_up(orders, pd.Timestamp("2026-10-14"))\nresult = int(orders["status"].isna().sum())`, expected: i(2), tip: "Fill missing statuses on the result, not on orders." },
        { kind: "expr", id: "index", label: "The result has a fresh index", hidden: true, expr: `${FOLLOW_DF}\nresult = follow_up(orders, pd.Timestamp("2026-10-14")).index.tolist()`, expected: py.list(i(0), i(1)) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'order_id': 1, 'status': 'pending', 'days_open': 13}, {'order_id': 3, 'status': 'unknown', 'days_open': 9}]\n" },
      ],
    },
    hints: ['days = (today - orders["placed"]).dt.days gives whole days.', 'is_open = orders["status"].isna() | (orders["status"] == "pending"): == alone is False for missing values.', 'Select, then .assign(...) or copy before changing; sort_values(["days_open", "order_id"], ascending=[False, True]).reset_index(drop=True).'],
    answer: `import pandas as pd\n\n\ndef follow_up(orders, today):\n    days = (today - orders["placed"]).dt.days\n    is_open = orders["status"].isna() | (orders["status"] == "pending")\n    keep = is_open & (days > 7)\n    result = pd.DataFrame({\n        "order_id": orders.loc[keep, "order_id"],\n        "status": orders.loc[keep, "status"].fillna("unknown"),\n        "days_open": days[keep],\n    })\n    return result.sort_values(["days_open", "order_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${FOLLOW_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef follow_up(orders, today):\n    days = (today - orders["placed"]).dt.days\n    keep = (orders["status"] == "pending") & (days > 7)\n    result = pd.DataFrame({"order_id": orders.loc[keep, "order_id"], "status": orders.loc[keep, "status"], "days_open": days[keep]})\n    return result.sort_values(["days_open", "order_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${FOLLOW_DEMO}\n`, fails: ["demo", "later", "index", "output"] },
      { code: `import pandas as pd\n\n\ndef follow_up(orders, today):\n    orders["status"] = orders["status"].fillna("unknown")\n    orders["days_open"] = (today - orders["placed"]).dt.days\n    keep = orders["status"].isin(["pending", "unknown"]) & (orders["days_open"] > 7)\n    result = orders.loc[keep, ["order_id", "status", "days_open"]]\n    return result.sort_values(["days_open", "order_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${FOLLOW_DEMO}\n`, fails: ["untouched"] },
    ],
  },
  {
    ref: "python:bank:py11-05",
    slug: "py11-05",
    module: "pandas",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: aggregates after removing duplicates",
    topics: ["drop_duplicates", "groupby", "named aggregation"],
    minutes: 6,
    after: "python:groupby-and-aggregation",
    packages: PD,
    prompt: "Order 2 was exported twice. What does this program print?",
    code: 'import pandas as pd\n\norders = pd.DataFrame({\n    "order_id": [1, 2, 2, 3, 4],\n    "customer": ["C1", "C2", "C2", "C1", "C3"],\n    "amount": [10.0, 5.0, 5.0, 7.5, None],\n})\nunique = orders.drop_duplicates()\nprint(len(orders) - len(unique))\n\nsummary = unique.groupby("customer").agg(orders=("order_id", "count"), revenue=("amount", "sum"))\nfor row in summary.itertuples():\n    print(row.Index, row.orders, row.revenue)',
    output: "1\nC1 2 17.5\nC2 1 5.0\nC3 1 0.0\n",
    explanation:
      "`drop_duplicates()` removes rows identical in every column, so one copy of order 2 goes. Grouping by customer: C1 has orders 1 and 3 (10.0 + 7.5). C3's only order has a missing amount: `count` on `order_id` still counts it (the id is present), but `sum` skips missing values, and the sum of nothing is `0.0`, not NaN.",
    hints: ["Which column does the count look at, and is it missing for C3?", "What is the sum of no values?"],
    wrong: ["1\nC1 2 17.5\nC2 2 10.0\nC3 1 0.0", "1\nC1 2 17.5\nC2 1 5.0\nC3 1 nan"],
  },
  {
    ref: "python:bank:py11-06",
    slug: "py11-06",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Order counts, including customers with none",
    topics: ["value_counts", "map", "zero counts"],
    minutes: 7,
    after: "python:merging-and-reshaping-data",
    packages: PD,
    prompt:
      "Write `order_counts(customers, orders)` returning a DataFrame with **every** customer (`customer_id`, `name`) and `orders`, how many orders they placed, as an int: `0` for customers with none. Orders whose `customer_id` isn't in `customers` are ignored. Sort by `orders` (most first), then `customer_id`, with a fresh index.",
    expectedOutput: "[{'customer_id': 'C02', 'name': 'Ben', 'orders': 3}, {'customer_id': 'C01', 'name': 'Ada', 'orders': 1}, {'customer_id': 'C03', 'name': 'Cai', 'orders': 0}, {'customer_id': 'C04', 'name': 'Dee', 'orders': 0}]\n",
    looksFor: ["Customers without orders appear with `0`.", "Orders for unknown customers don't add rows.", "`orders` is an integer column.", "Sorted by count, then id."],
    starter: `import pandas as pd\n\n\ndef order_counts(customers, orders):\n    pass\n\n\n${COUNTS_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Counts every customer", show: "order_counts(customers, orders)", expr: `${COUNTS_DF}\nresult = _records(order_counts(customers, orders))`, expected: rows(["customer_id", "name", "orders"], [s("C02"), s("Ben"), i(3)], [s("C01"), s("Ada"), i(1)], [s("C03"), s("Cai"), i(0)], [s("C04"), s("Dee"), i(0)]) },
        { kind: "expr", id: "int", label: "orders is an integer column", show: "order_counts(...)['orders'].dtype", expr: `${COUNTS_DF}\nresult = str(order_counts(customers, orders)["orders"].dtype)`, expected: s("int64") },
        { kind: "expr", id: "none", label: "No orders at all", hidden: true, expr: `${COUNTS_DF}\nresult = _records(order_counts(customers, orders.iloc[0:0]))`, expected: rows(["customer_id", "name", "orders"], [s("C01"), s("Ada"), i(0)], [s("C02"), s("Ben"), i(0)], [s("C03"), s("Cai"), i(0)], [s("C04"), s("Dee"), i(0)]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'customer_id': 'C02', 'name': 'Ben', 'orders': 3}, {'customer_id': 'C01', 'name': 'Ada', 'orders': 1}, {'customer_id': 'C03', 'name': 'Cai', 'orders': 0}, {'customer_id': 'C04', 'name': 'Dee', 'orders': 0}]\n" },
      ],
    },
    hints: ['counts = orders["customer_id"].value_counts() gives a Series from id to count.', 'customers["customer_id"].map(counts) looks each customer up; customers with no orders get NaN.', ".fillna(0).astype(int), then sort_values([\"orders\", \"customer_id\"], ascending=[False, True]).reset_index(drop=True)."],
    answer: `import pandas as pd\n\n\ndef order_counts(customers, orders):\n    counts = orders["customer_id"].value_counts()\n    result = customers[["customer_id", "name"]].copy()\n    result["orders"] = result["customer_id"].map(counts).fillna(0).astype("int64")\n    return result.sort_values(["orders", "customer_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${COUNTS_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef order_counts(customers, orders):\n    merged = customers.merge(orders, on="customer_id")\n    result = merged.groupby(["customer_id", "name"], as_index=False).size().rename(columns={"size": "orders"})\n    return result.sort_values(["orders", "customer_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${COUNTS_DEMO}\n`, fails: ["demo", "none", "output"], why: "An inner join drops customers with no orders." },
      { code: `import pandas as pd\n\n\ndef order_counts(customers, orders):\n    merged = customers.merge(orders, on="customer_id", how="left")\n    result = merged.groupby(["customer_id", "name"], as_index=False).size().rename(columns={"size": "orders"})\n    return result.sort_values(["orders", "customer_id"], ascending=[False, True]).reset_index(drop=True)\n\n\n${COUNTS_DEMO}\n`, fails: ["demo", "none", "output"], why: "size() counts rows, and a customer with no orders still has one row (with a missing order_id)." },
    ],
  },
  {
    ref: "python:bank:py11-07",
    slug: "py11-07",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Daily revenue across time zones",
    topics: ["to_datetime", "UTC", "groupby"],
    minutes: 8,
    after: "python:cleaning-strings-dates-and-duplicates",
    packages: PD,
    prompt:
      "Events carry ISO timestamps with **different UTC offsets**. Write `daily_revenue(events)` that groups them by **UTC calendar day** and returns a DataFrame with `day` (text `YYYY-MM-DD`), `revenue` (sum of `amount`, rounded to 2 places) and `orders` (number of events), sorted by day.",
    expectedOutput: "[{'day': '2026-10-13', 'revenue': 30.0, 'orders': 2}, {'day': '2026-10-14', 'revenue': 6.5, 'orders': 2}, {'day': '2026-10-15', 'revenue': 4.5, 'orders': 1}]\n",
    looksFor: ["Timestamps are converted to UTC before taking the date.", "An event late in the evening west of UTC lands on the next UTC day.", "Days are sorted."],
    starter: `import pandas as pd\n\n\ndef daily_revenue(events):\n    pass\n\n\n${EVENTS_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Groups by UTC day", show: "daily_revenue(events)", expr: `${EVENTS_DF}\nresult = _records(daily_revenue(events))`, expected: rows(["day", "revenue", "orders"], [s("2026-10-13"), f(30), i(2)], [s("2026-10-14"), f(6.5), i(2)], [s("2026-10-15"), f(4.5), i(1)]), compare: close },
        { kind: "expr", id: "hidden", label: "Other events", hidden: true, expr: 'result = _records(daily_revenue(pd.DataFrame({"ts": ["2026-12-31T23:59:00-01:00", "2027-01-01T00:30:00+01:00"], "amount": [0.1, 0.2]})))', expected: rows(["day", "revenue", "orders"], [s("2026-12-31"), f(0.2), i(1)], [s("2027-01-01"), f(0.1), i(1)]), compare: close },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'day': '2026-10-13', 'revenue': 30.0, 'orders': 2}, {'day': '2026-10-14', 'revenue': 6.5, 'orders': 2}, {'day': '2026-10-15', 'revenue': 4.5, 'orders': 1}]\n" },
      ],
    },
    hints: ['pd.to_datetime(events["ts"], utc=True, format="ISO8601") converts every offset to UTC.', 'Then .dt.strftime("%Y-%m-%d") gives the UTC day as text.', 'groupby("day", as_index=False).agg(revenue=("amount", "sum"), orders=("amount", "size")).'],
    answer: `import pandas as pd\n\n\ndef daily_revenue(events):\n    utc = pd.to_datetime(events["ts"], utc=True, format="ISO8601")\n    days = events.assign(day=utc.dt.strftime("%Y-%m-%d"))\n    result = days.groupby("day", as_index=False).agg(revenue=("amount", "sum"), orders=("amount", "size"))\n    result["revenue"] = result["revenue"].round(2)\n    return result.sort_values("day").reset_index(drop=True)\n\n\n${EVENTS_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef daily_revenue(events):\n    days = events.assign(day=events["ts"].str[:10])\n    result = days.groupby("day", as_index=False).agg(revenue=("amount", "sum"), orders=("amount", "size"))\n    result["revenue"] = result["revenue"].round(2)\n    return result\n\n\n${EVENTS_DEMO}\n`, fails: ["demo", "hidden", "output"], why: "The first 10 characters are the local date, not the UTC one." },
    ],
  },
  {
    ref: "python:bank:py11-08",
    slug: "py11-08",
    module: "pandas",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: a join that multiplies rows",
    topics: ["merge", "validate", "duplicates"],
    minutes: 8,
    after: "python:merging-and-reshaping-data",
    packages: PD,
    prompt:
      "`order_totals(orders, prices)` should give one row per order with `total = qty × price`, using each SKU's **current** price (the one with the latest `effective` date). `prices` keeps price history, so SKU `A` appears twice and order 1 comes out twice. Fix it so each order appears once with the current price. An order whose SKU has no price at all keeps its row, with a missing total.",
    expectedOutput: "[{'order_id': 1, 'total': 24.0}, {'order_id': 2, 'total': 4.0}, {'order_id': 3, 'total': 12.0}]\n",
    looksFor: ["One row per order.", "Each SKU uses the price with the latest `effective` date, wherever it appears in `prices`.", "An order with an unpriced SKU is kept, with a missing total."],
    starter: `import pandas as pd\n\n\ndef order_totals(orders, prices):\n    merged = orders.merge(prices, on="sku", how="left")\n    merged["total"] = merged["qty"] * merged["price"]\n    return merged[["order_id", "total"]]\n\n\n${JOIN_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "One row per order at the current price", show: "order_totals(orders, prices)", expr: `${JOIN_DF}\nresult = _records(order_totals(orders, prices))`, expected: rows(["order_id", "total"], [i(1), f(24)], [i(2), f(4)], [i(3), f(12)]), compare: close },
        { kind: "expr", id: "order-of-history", label: "The latest price wins wherever it appears in the table", hidden: true, expr: `${JOIN_DF}\nresult = _records(order_totals(orders, prices.iloc[::-1]))`, expected: rows(["order_id", "total"], [i(1), f(24)], [i(2), f(4)], [i(3), f(12)]), compare: close, tip: "Sort by effective before keeping the last row per SKU." },
        { kind: "expr", id: "unpriced", label: "An unpriced SKU keeps its order", show: 'order_totals(orders with an extra order for SKU "Z", prices)', expr: `${JOIN_DF}\nextra = pd.concat([orders, pd.DataFrame({"order_id": [4], "sku": ["Z"], "qty": [1]})], ignore_index=True)\nresult = _records(order_totals(extra, prices))`, expected: rows(["order_id", "total"], [i(1), f(24)], [i(2), f(4)], [i(3), f(12)], [i(4), py.none]), compare: close, tip: 'Keep how="left" so orders without a price aren\'t dropped.' },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'order_id': 1, 'total': 24.0}, {'order_id': 2, 'total': 4.0}, {'order_id': 3, 'total': 12.0}]\n" },
      ],
    },
    hints: ["A merge returns one row for every matching pair: two prices for A means two rows for each A order.", 'current = prices.sort_values("effective").drop_duplicates("sku", keep="last").', 'orders.merge(current, on="sku", how="left", validate="many_to_one").'],
    answer: `import pandas as pd\n\n\ndef order_totals(orders, prices):\n    current = prices.sort_values("effective").drop_duplicates("sku", keep="last")\n    merged = orders.merge(current, on="sku", how="left", validate="many_to_one")\n    merged["total"] = merged["qty"] * merged["price"]\n    return merged[["order_id", "total"]]\n\n\n${JOIN_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef order_totals(orders, prices):\n    current = prices.drop_duplicates("sku", keep="last")\n    merged = orders.merge(current, on="sku", how="left", validate="many_to_one")\n    merged["total"] = merged["qty"] * merged["price"]\n    return merged[["order_id", "total"]]\n\n\n${JOIN_DEMO}\n`, fails: ["demo", "unpriced", "output"], why: "keep=\"last\" without sorting keeps whichever row happens to be last, here the older price." },
      { code: `import pandas as pd\n\n\ndef order_totals(orders, prices):\n    current = prices.sort_values("effective").drop_duplicates("sku", keep="last")\n    merged = orders.merge(current, on="sku")\n    merged["total"] = merged["qty"] * merged["price"]\n    return merged[["order_id", "total"]]\n\n\n${JOIN_DEMO}\n`, fails: ["unpriced"] },
    ],
  },
  {
    ref: "python:bank:py11-09",
    slug: "py11-09",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Month-over-month revenue change",
    topics: ["dt.to_period", "groupby", "pct_change"],
    minutes: 8,
    after: "python:groupby-and-aggregation",
    packages: PD,
    prompt:
      "Write `monthly_change(orders)` for a frame with `date` (datetimes) and `amount`. Return a DataFrame with one row per month that has orders, in date order: `month` (text `YYYY-MM`), `revenue` (sum) and `change_pct`, the percentage change from the previous row's revenue, rounded to 1 place. The first month has no previous month, so its change is missing (NaN).",
    expectedOutput: "2026-07 150.0 nan\n2026-08 120.0 -20.0\n2026-09 135.0 12.5\n",
    looksFor: ["Months are summed and sorted by date.", "`change_pct` compares each month with the one before it, as a percentage.", "The first month's change is missing, not 0."],
    starter: `import pandas as pd\n\n\ndef monthly_change(orders):\n    pass\n\n\n${MONTHLY_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Monthly revenue and change", show: "monthly_change(orders)", expr: `${MONTHLY_DF}\nresult = _records(monthly_change(orders))`, expected: rows(["month", "revenue", "change_pct"], [s("2026-07"), f(150), py.none], [s("2026-08"), f(120), f(-20)], [s("2026-09"), f(135), f(12.5)]), compare: close },
        { kind: "expr", id: "unsorted", label: "Works when rows aren't in date order", show: "monthly_change(orders shuffled)", expr: `${MONTHLY_DF}\nresult = _records(monthly_change(orders.iloc[[4, 0, 2, 1, 3]]))`, expected: rows(["month", "revenue", "change_pct"], [s("2026-07"), f(150), py.none], [s("2026-08"), f(120), f(-20)], [s("2026-09"), f(135), f(12.5)]), compare: close },
        { kind: "expr", id: "year", label: "Across a year boundary", hidden: true, expr: 'result = _records(monthly_change(pd.DataFrame({"date": pd.to_datetime(["2027-01-05", "2026-12-24"]), "amount": [30.0, 90.0]})))', expected: rows(["month", "revenue", "change_pct"], [s("2026-12"), f(90), py.none], [s("2027-01"), f(30), f(-66.7)]), compare: close },
        { kind: "output", id: "output", label: "Prints the demo", expected: "2026-07 150.0 nan\n2026-08 120.0 -20.0\n2026-09 135.0 12.5\n" },
      ],
    },
    hints: ['orders["date"].dt.strftime("%Y-%m") gives the month as text, which also sorts correctly.', 'groupby("month", as_index=False)["amount"].sum() sorts by month for you.', '(revenue.pct_change() * 100).round(1) compares each row with the previous one.'],
    answer: `import pandas as pd\n\n\ndef monthly_change(orders):\n    months = orders.assign(month=orders["date"].dt.strftime("%Y-%m"))\n    result = months.groupby("month", as_index=False).agg(revenue=("amount", "sum"))\n    result["change_pct"] = (result["revenue"].pct_change() * 100).round(1)\n    return result\n\n\n${MONTHLY_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef monthly_change(orders):\n    months = orders.assign(month=orders["date"].dt.strftime("%Y-%m"))\n    result = months.groupby("month", as_index=False).agg(revenue=("amount", "sum"))\n    result["change_pct"] = (result["revenue"].pct_change() * 100).round(1).fillna(0)\n    return result\n\n\n${MONTHLY_DEMO}\n`, fails: ["demo", "unsorted", "year", "output"] },
      { code: `import pandas as pd\n\n\ndef monthly_change(orders):\n    months = orders.assign(month=orders["date"].dt.strftime("%m-%Y"))\n    result = months.groupby("month", as_index=False).agg(revenue=("amount", "sum"))\n    result["change_pct"] = (result["revenue"].pct_change() * 100).round(1)\n    return result\n\n\n${MONTHLY_DEMO}\n`, fails: ["demo", "unsorted", "year", "output"], why: "\"12-2026\" sorts after \"01-2027\" as text, and the month isn't in YYYY-MM form." },
    ],
  },
  {
    ref: "python:bank:py11-10",
    slug: "py11-10",
    module: "pandas",
    kind: "write",
    difficulty: "medium",
    title: "Flag outliers within each category",
    topics: ["groupby transform", "quantile", "IQR"],
    minutes: 8,
    after: "python:exploratory-data-analysis-and-exports",
    packages: PD,
    prompt:
      "What's unusual depends on the category: a 60 lamp is odd, a 60 sofa isn't. Write `flag_outliers(sales)` returning a **copy** of `sales` with a new boolean column `is_outlier`: `True` when `amount` is below Q1 − 1.5×IQR or above Q3 + 1.5×IQR, where Q1, Q3 and IQR = Q3 − Q1 are computed **within the row's own category** (pandas' default quantiles). Don't change `sales`.",
    expectedOutput: "[60, 400]\n",
    looksFor: ["Quartiles are computed per category, not over the whole column.", "Values outside the fences on either side are flagged.", "`sales` itself gets no new column."],
    starter: `import pandas as pd\n\n\ndef flag_outliers(sales):\n    pass\n\n\n${OUTLIER_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Flags the outlier in each category", show: "flag_outliers(sales)['is_outlier']", expr: `${OUTLIER_DF}\nresult = flag_outliers(sales)["is_outlier"].tolist()`, expected: bools(false, false, false, false, true, false, false, false, false, true) },
        { kind: "expr", id: "low", label: "Low values are flagged too", show: 'flag_outliers on [50, 52, 51, 53, 1]', expr: 'result = flag_outliers(pd.DataFrame({"category": ["x"] * 5, "amount": [50, 52, 51, 53, 1]}))["is_outlier"].tolist()', expected: bools(false, false, false, false, true) },
        { kind: "expr", id: "untouched", label: "sales keeps its own columns", show: "list(sales.columns) after flag_outliers(sales)", expr: `${OUTLIER_DF}\nflag_outliers(sales)\nresult = list(sales.columns)`, expected: strs("category", "amount"), tip: "Work on sales.copy() (or use assign), so the caller's frame doesn't change." },
        { kind: "expr", id: "mixed", label: "Categories don't influence each other", hidden: true, expr: 'result = flag_outliers(pd.DataFrame({"category": ["a"] * 8 + ["b"] * 2, "amount": [10] * 8 + [50, 51]}))["is_outlier"].tolist()', expected: py.list(...Array.from({ length: 10 }, () => b(false))) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[60, 400]\n" },
      ],
    },
    hints: ['groups = sales.groupby("category")["amount"].', "groups.transform(lambda a: a.quantile(0.25)) gives each row its own category's Q1 (likewise 0.75).", "Compare amount with Q1 - 1.5 * IQR and Q3 + 1.5 * IQR, combining the two masks with |."],
    answer: `import pandas as pd\n\n\ndef flag_outliers(sales):\n    groups = sales.groupby("category")["amount"]\n    q1 = groups.transform(lambda a: a.quantile(0.25))\n    q3 = groups.transform(lambda a: a.quantile(0.75))\n    iqr = q3 - q1\n    result = sales.copy()\n    result["is_outlier"] = (sales["amount"] < q1 - 1.5 * iqr) | (sales["amount"] > q3 + 1.5 * iqr)\n    return result\n\n\n${OUTLIER_DEMO}`,
    wrong: [
      { code: `import pandas as pd\n\n\ndef flag_outliers(sales):\n    q1 = sales["amount"].quantile(0.25)\n    q3 = sales["amount"].quantile(0.75)\n    iqr = q3 - q1\n    result = sales.copy()\n    result["is_outlier"] = (sales["amount"] < q1 - 1.5 * iqr) | (sales["amount"] > q3 + 1.5 * iqr)\n    return result\n\n\n${OUTLIER_DEMO}\n`, fails: ["demo", "mixed", "output"], why: "Over the whole column, the furniture prices make a 60 lamp look normal." },
      { code: `import pandas as pd\n\n\ndef flag_outliers(sales):\n    groups = sales.groupby("category")["amount"]\n    q1 = groups.transform(lambda a: a.quantile(0.25))\n    q3 = groups.transform(lambda a: a.quantile(0.75))\n    iqr = q3 - q1\n    sales["is_outlier"] = sales["amount"] > q3 + 1.5 * iqr\n    return sales\n\n\n${OUTLIER_DEMO}\n`, fails: ["low", "untouched"] },
    ],
  },
];
