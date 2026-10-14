import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const f = py.float;
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));

export const selectingAndFilteringRows: PyLesson = {
  slug: "selecting-and-filtering-rows",
  ref: "python:selecting-and-filtering-rows",
  module: "pandas",
  number: 3,
  title: "Selecting and filtering rows",
  level: "intermediate",
  summary:
    "Keep the rows you need with boolean conditions, combine conditions with `&` and `|`, match against lists with `isin`, select by label with `.loc` and by position with `.iloc`, sort the result, and change values safely with `.loc` under pandas' copy-on-write rules.",
  packages: ["pandas"],
  files: SHOP_FILES,

  sections: [
    {
      label: "boolean filtering",
      blocks: [
        {
          kind: "p",
          text: "A comparison on a column gives a boolean Series, one `True`/`False` per row, and indexing the DataFrame with it keeps the `True` rows: `orders[orders[\"status\"] == \"completed\"]`. It's the same idea as a NumPy mask, and the same rules apply: combine with `&`, `|` and `~`, with brackets around each condition.",
        },
        { kind: "code", code: 'completed = orders[orders["status"] == "completed"]\nbig_lighting = orders[(orders["category"] == "lighting") & (orders["quantity"] >= 2)]\nfurniture_or_stationery = orders[orders["category"].isin(["furniture", "stationery"])]' },
        {
          kind: "p",
          text: "`isin([...])` matches any value in a list, and `between(low, high)` an inclusive range. A filter returns a new DataFrame; the original is unchanged. The index labels come along, so a filtered frame's index may have gaps; `reset_index(drop=True)` renumbers it.",
        },
      ],
    },
    {
      label: "loc and iloc",
      blocks: [
        {
          kind: "p",
          text: "`df.loc[rows, columns]` selects by **label**: index labels and column names, or a boolean condition for the rows. `df.iloc[rows, columns]` selects by **position**, like list indexing: `df.iloc[0]` is the first row whatever its label. With `loc`, a slice includes its end label; with `iloc` it doesn't, as in Python.",
        },
        {
          kind: "p",
          text: "`sort_values(\"amount\", ascending=False)` sorts rows; pass a list of columns to sort by several. `nlargest(3, \"amount\")` takes the top rows directly.",
        },
      ],
    },
    {
      label: "changing values: copy-on-write",
      blocks: [
        {
          kind: "p",
          text: "pandas 3 uses **copy-on-write**: every filter or selection behaves as a separate copy. So the two-step `df[df[\"status\"] == \"pending\"][\"status\"] = \"open\"` changes a temporary copy and leaves `df` exactly as it was. To change rows in place, do it in one step with `.loc`: `df.loc[df[\"status\"] == \"pending\", \"status\"] = \"open\"`.",
        },
      ],
    },
  ],

  example: {
    caption: "Filtering, selecting and sorting the shop's orders. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\norders = pd.read_csv("orders.csv")\norders["line_total"] = orders["quantity"] * orders["unit_price"]\n\ncompleted = orders[orders["status"] == "completed"]\nprint(len(orders), "orders,", len(completed), "completed")\n\nlighting = completed[completed["category"] == "lighting"]\ndisplay(lighting[["order_id", "product", "line_total"]].sort_values("line_total", ascending=False))\n\nprint(orders.loc[orders["line_total"] > 100, ["order_id", "line_total"]])\nprint("First order:", orders.iloc[0]["order_id"], "| Last:", orders.iloc[-1]["order_id"])',
  },

  walkthrough: [
    {
      title: "A condition is a column of booleans",
      text: "The comparison gives one `True`/`False` per row; using it as an index keeps the `True` rows.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nmask = orders["status"] == "completed"\nprint(mask.head(4).tolist(), mask.sum())\nprint(orders[mask]["order_id"].tolist())',
    },
    {
      title: "Combining conditions",
      text: "`&` needs both, `|` either, `isin` matches a list, and `between` is inclusive at both ends.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders[(orders["category"] == "lighting") & (orders["quantity"] >= 2)]["order_id"].tolist())\nprint(orders[orders["status"].isin(["refunded", "cancelled"])]["order_id"].tolist())\nprint(orders[orders["unit_price"].between(20, 70)]["product"].unique().tolist())',
    },
    {
      title: "loc by label, iloc by position",
      text: "After filtering, label 3 is the second row. `loc` uses the label; `iloc` the position.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nlighting = orders[orders["category"] == "lighting"]\nprint(lighting.index.tolist())\nprint(lighting.loc[3, "order_id"], lighting.iloc[1]["order_id"])\nprint(lighting.reset_index(drop=True).index.tolist())',
    },
    {
      title: "Change values with one .loc",
      text: "The chained version changes a temporary copy, so `orders` is untouched. The single `.loc` assignment changes it.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\norders[orders["status"] == "pending"]["status"] = "open"\nprint((orders["status"] == "open").sum())\norders.loc[orders["status"] == "pending", "status"] = "open"\nprint((orders["status"] == "open").sum())',
    },
  ],

  mistakes: [
    {
      title: "and instead of &",
      text: "`and` needs a single `True`/`False`, but each side is a whole column: `ValueError: The truth value of a Series is ambiguous`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders[(orders["quantity"] > 1) and (orders["status"] == "completed")])',
      raises: "ValueError",
      fix: "Use `&` (and `|`, `~`), with brackets around each condition.",
    },
    {
      title: "Forgetting the brackets around conditions",
      text: "`&` binds more tightly than `==`, so Python tries `\"lighting\" & orders[\"quantity\"]` first: `TypeError`.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders[orders["category"] == "lighting" & orders["quantity"] > 1])',
      raises: "TypeError",
      fix: 'Bracket each comparison: `(orders["category"] == "lighting") & (orders["quantity"] > 1)`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Filter completed orders by value",
      prompt:
        "Write `big_completed(df, threshold)`, which returns the **completed** orders whose `line_total` (`quantity × unit_price`) is **at least** `threshold`, with columns `order_id`, `product` and `line_total`, sorted by `line_total` from highest to lowest (ties by `order_id`), and the index renumbered from 0. Don't change the DataFrame passed in.",
      looksFor: [
        "Only completed orders with `line_total >= threshold` are kept.",
        "Columns are `order_id`, `product`, `line_total`, sorted high to low; the index is 0, 1, 2, …",
        "The input DataFrame isn't changed (no new column added to it).",
      ],
      starter: 'import pandas as pd\n\n\ndef big_completed(df, threshold):\n    # Return completed orders with line_total >= threshold.\n    pass\n\n\nprint(big_completed(pd.read_csv("orders.csv"), 60))\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "rows",
            label: "The right rows, columns and order",
            show: 'big_completed(pd.read_csv("orders.csv"), 60)',
            expr: 'import pandas as pd\nout = big_completed(pd.read_csv("orders.csv"), 60)\nresult = (_records(out), out.index.tolist())',
            expected: py.tuple(
              py.list(
                py.dict([[s("order_id"), i(1002)], [s("product"), s("Oak desk")], [s("line_total"), f(120)]]),
                py.dict([[s("order_id"), i(1011)], [s("product"), s("Oak desk")], [s("line_total"), f(120)]]),
                py.dict([[s("order_id"), i(1010)], [s("product"), s("Desk lamp")], [s("line_total"), f(73.5)]]),
                py.dict([[s("order_id"), i(1007)], [s("product"), s("Floor lamp")], [s("line_total"), f(65)]]),
              ),
              ints(0, 1, 2, 3),
            ),
            tip: 'Compute line_total on a copy, filter with (status == "completed") & (line_total >= threshold), sort_values(["line_total", "order_id"], ascending=[False, True]), then reset_index(drop=True).',
          },
          { kind: "expr", id: "boundary", label: "The threshold itself counts", show: "big_completed(orders, 120)", expr: 'import pandas as pd\nresult = big_completed(pd.read_csv("orders.csv"), 120)["order_id"].tolist()', expected: ints(1002, 1011) },
          { kind: "expr", id: "input", label: "The input DataFrame is unchanged", show: "columns of the input afterwards", expr: 'import pandas as pd\ndf = pd.read_csv("orders.csv")\nbig_completed(df, 60)\nresult = list(df.columns)', expected: py.list(...["order_id", "order_date", "customer_id", "product", "category", "quantity", "unit_price", "status"].map(s)), tip: "Build line_total with df.assign(line_total=...) (a new frame), not df[\"line_total\"] = ... on the input." },
        ],
      },
      hints: [
        'withtotal = df.assign(line_total=df["quantity"] * df["unit_price"]) leaves df alone.',
        'Filter: withtotal[(withtotal["status"] == "completed") & (withtotal["line_total"] >= threshold)].',
        'Then [["order_id", "product", "line_total"]], .sort_values(["line_total", "order_id"], ascending=[False, True]) and .reset_index(drop=True).',
      ],
      answer: 'import pandas as pd\n\n\ndef big_completed(df, threshold):\n    """Completed orders with line_total >= threshold, highest first."""\n    withtotal = df.assign(line_total=df["quantity"] * df["unit_price"])\n    keep = (withtotal["status"] == "completed") & (withtotal["line_total"] >= threshold)\n    out = withtotal.loc[keep, ["order_id", "product", "line_total"]]\n    out = out.sort_values(["line_total", "order_id"], ascending=[False, True])\n    return out.reset_index(drop=True)\n\n\nprint(big_completed(pd.read_csv("orders.csv"), 60))',
      wrong: [
        { code: 'import pandas as pd\n\ndef big_completed(df, threshold):\n    df["line_total"] = df["quantity"] * df["unit_price"]\n    out = df[(df["status"] == "completed") & (df["line_total"] >= threshold)][["order_id", "product", "line_total"]]\n    return out.sort_values(["line_total", "order_id"], ascending=[False, True]).reset_index(drop=True)\n', fails: ["input"], why: "adds a column to the caller's DataFrame" },
        { code: 'import pandas as pd\n\ndef big_completed(df, threshold):\n    t = df.assign(line_total=df["quantity"] * df["unit_price"])\n    out = t[(t["status"] == "completed") & (t["line_total"] > threshold)][["order_id", "product", "line_total"]]\n    return out.sort_values(["line_total", "order_id"], ascending=[False, True]).reset_index(drop=True)\n', fails: ["boundary"], why: "> excludes the threshold" },
        { code: 'import pandas as pd\n\ndef big_completed(df, threshold):\n    t = df.assign(line_total=df["quantity"] * df["unit_price"])\n    out = t[(t["status"] == "completed") & (t["line_total"] >= threshold)][["order_id", "product", "line_total"]]\n    return out.sort_values(["line_total", "order_id"], ascending=[False, True])\n', fails: ["rows"], why: "index not renumbered" },
      ],
    },
    {
      id: "challenge-2",
      title: "Flag orders in place",
      prompt:
        "Write `flag_review(df)`, which **modifies** `df` in place: it adds a column `needs_review` that is `True` for orders that are `refunded` or `cancelled`, or have a `quantity` of 5 or more, and `False` otherwise; and changes the `status` of every `pending` order to `open`. Return the number of orders flagged. Remember copy-on-write: use `.loc` for the status change.",
      looksFor: [
        "`needs_review` is `True` for refunded/cancelled orders and quantities of 5 or more.",
        "Every `pending` status becomes `open`, in the original DataFrame.",
        "The function returns how many orders were flagged, as an int.",
      ],
      starter: 'import pandas as pd\n\n\ndef flag_review(df):\n    # Add needs_review, change pending to open, return the flagged count.\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "flags",
            label: "Flags the right orders",
            show: 'flag_review(df); df.loc[df["needs_review"], "order_id"]',
            expr: 'import pandas as pd\ndf = pd.read_csv("orders.csv")\nn = flag_review(df)\nresult = (int(n), df.loc[df["needs_review"], "order_id"].tolist())',
            expected: py.tuple(i(3), ints(1003, 1008, 1009)),
            tip: 'df["needs_review"] = df["status"].isin(["refunded", "cancelled"]) | (df["quantity"] >= 5).',
          },
          {
            kind: "expr",
            id: "status",
            label: "pending becomes open in the original",
            show: 'df["status"].value_counts() after flag_review(df)',
            expr: 'import pandas as pd\ndf = pd.read_csv("orders.csv")\nflag_review(df)\nresult = ((df["status"] == "pending").sum() == 0, int((df["status"] == "open").sum()))',
            expected: py.tuple(py.bool(true), i(1)),
            tip: 'One .loc assignment: df.loc[df["status"] == "pending", "status"] = "open".',
          },
        ],
      },
      hints: [
        'The flag is a boolean column: df["status"].isin(["refunded", "cancelled"]) | (df["quantity"] >= 5).',
        'df.loc[df["status"] == "pending", "status"] = "open" changes the original.',
        'Return int(df["needs_review"].sum()).',
      ],
      answer: 'import pandas as pd\n\n\ndef flag_review(df):\n    """Flag refunded/cancelled or large orders, rename pending to open; return the flagged count."""\n    df["needs_review"] = df["status"].isin(["refunded", "cancelled"]) | (df["quantity"] >= 5)\n    df.loc[df["status"] == "pending", "status"] = "open"\n    return int(df["needs_review"].sum())',
      wrong: [
        { code: 'import pandas as pd\n\ndef flag_review(df):\n    df["needs_review"] = df["status"].isin(["refunded", "cancelled"]) | (df["quantity"] >= 5)\n    df[df["status"] == "pending"]["status"] = "open"\n    return int(df["needs_review"].sum())\n', fails: ["status"], why: "chained assignment changes a copy" },
        { code: 'import pandas as pd\n\ndef flag_review(df):\n    df["needs_review"] = df["status"].isin(["refunded", "cancelled"]) & (df["quantity"] >= 5)\n    df.loc[df["status"] == "pending", "status"] = "open"\n    return int(df["needs_review"].sum())\n', fails: ["flags"], why: "& instead of |" },
      ],
    },
  ],

  quiz: [
    {
      id: "loc-iloc",
      prompt: "`small = orders[orders[\"quantity\"] > 2]` keeps rows labelled 2, 5 and 7. What is `small.iloc[0]`?",
      options: [
        { text: "The row labelled 2", correct: true, why: "`iloc` is by position, and the first position holds label 2." },
        { text: "The row labelled 0", why: "Label 0 isn't in `small`; `iloc[0]` means the first row present." },
        { text: "A `KeyError`", why: "That's what `small.loc[0]` would raise: there's no label 0." },
        { text: "The first column", why: "`iloc[0]` with one index selects a row." },
      ],
    },
    {
      id: "cow",
      prompt: "Under copy-on-write, what does `df[df[\"x\"] < 0][\"x\"] = 0` do to `df`?",
      options: [
        { text: "Nothing: the assignment changes a temporary copy", correct: true, why: "Each step of a chained selection is a separate copy; use `df.loc[df[\"x\"] < 0, \"x\"] = 0`." },
        { text: "Sets the negative values in `df` to 0", why: "That only happens with a single `.loc` assignment." },
        { text: "Sets every `x` to 0", why: "The filter limits which rows; but either way, `df` itself isn't changed." },
        { text: "Raises a `KeyError`", why: "It runs, which is why the silent no-op is dangerous." },
      ],
    },
  ],

  outcomes: [
    "Filter rows with boolean conditions, `&`, `|`, `~`, `isin` and `between`.",
    "Select with `.loc` (labels) and `.iloc` (positions), and renumber with `reset_index`.",
    "Sort with `sort_values` and take top rows with `nlargest`.",
    "Change values in place with a single `.loc` assignment under copy-on-write.",
  ],
};
