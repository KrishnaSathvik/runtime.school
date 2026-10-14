import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const f = py.float;

export const exploratoryDataAnalysisAndExports: PyLesson = {
  slug: "exploratory-data-analysis-and-exports",
  ref: "python:exploratory-data-analysis-and-exports",
  module: "pandas",
  number: 8,
  title: "Exploratory data analysis and exports",
  level: "intermediate",
  summary:
    "Put the module together: check data quality, summarise the data from several angles, draw a clear chart with matplotlib, write down what the numbers do and don't show, and export the results as files someone else can use.",
  packages: ["pandas", "matplotlib"],
  files: SHOP_FILES,

  sections: [
    {
      label: "a repeatable first pass",
      blocks: [
        {
          kind: "p",
          text: "**Exploratory data analysis** (EDA) is looking at data carefully before drawing conclusions. A good first pass is the same every time: size and types; missing values and duplicates; ranges of the numbers (`describe`) and spellings of the categories (`value_counts`); then the questions themselves, by groups and over time. Writing the checks as code means you can rerun them when the data changes.",
        },
      ],
    },
    {
      label: "charts with matplotlib",
      blocks: [
        {
          kind: "p",
          text: "**matplotlib** draws charts; pandas can call it for you (`series.plot(kind=\"bar\")`). The object-oriented style is clearer: `fig, ax = plt.subplots()` makes a figure with one set of axes, then you draw on `ax` and label it. Every chart needs a title and labelled axes with units; a reader shouldn't have to guess what a bar means. In Runtime, `plt.show()` (or the end of the program) puts the finished chart in the Console.",
        },
        { kind: "code", code: 'import matplotlib.pyplot as plt\n\nfig, ax = plt.subplots(figsize=(6, 3))\nrevenue.plot(kind="bar", ax=ax)\nax.set_title("Completed revenue by category")\nax.set_xlabel("Category")\nax.set_ylabel("Revenue (£)")\nplt.show()' },
        {
          kind: "p",
          text: "Pick the chart that fits the question: bars for comparing categories, a line for change over time, a histogram for how values are spread. Start numeric axes at zero for bars, so the lengths compare honestly.",
        },
      ],
    },
    {
      label: "caveats and exports",
      blocks: [
        {
          kind: "p",
          text: "Say what the data **can't** tell you: twelve orders over six days is too little to call a trend; refunded orders were excluded; one customer bought most of the furniture. Then export: `df.to_csv(\"summary.csv\", index=False)` (drop the index unless it means something) and `df.to_json(\"summary.json\", orient=\"records\", indent=2)`. In Runtime, exported files appear in the Files list, ready to download.",
        },
      ],
    },
  ],

  example: {
    caption: "Quality checks, a summary, a bar chart and two exports. Press Run to execute it with real pandas and matplotlib; running examples never affects your progress.",
    code: 'import matplotlib.pyplot as plt\nimport pandas as pd\n\norders = pd.read_csv("orders.csv", parse_dates=["order_date"])\nprint("Rows:", len(orders), "| duplicates:", orders.duplicated().sum(), "| missing:", int(orders.isna().sum().sum()))\n\norders["line_total"] = orders["quantity"] * orders["unit_price"]\ncompleted = orders[orders["status"] == "completed"]\nrevenue = completed.groupby("category")["line_total"].sum().sort_values(ascending=False)\nprint(revenue)\n\nfig, ax = plt.subplots(figsize=(6, 3))\nrevenue.plot(kind="bar", ax=ax, color="#333333")\nax.set_title("Completed revenue by category, 1-6 Sep 2026")\nax.set_xlabel("Category")\nax.set_ylabel("Revenue (£)")\nax.tick_params(axis="x", rotation=0)\nplt.show()\n\nrevenue.reset_index().to_csv("revenue_by_category.csv", index=False)\nprint(open("revenue_by_category.csv").read())',
  },

  walkthrough: [
    {
      title: "Quality checks first",
      text: "Size, duplicates, gaps, and the spellings of a category column, all before any conclusions.",
      code: 'import pandas as pd\norders = pd.read_csv("orders.csv")\nprint(orders.shape, orders.duplicated().sum(), int(orders.isna().sum().sum()))\nprint(orders["status"].value_counts().to_dict())\nprint(orders["quantity"].describe()[["min", "max"]].to_dict())',
    },
    {
      title: "A line chart over time",
      text: "Daily revenue as a line, with a title and labelled axes. The chart appears below the printed totals.",
      code: 'import matplotlib.pyplot as plt\nimport pandas as pd\norders = pd.read_csv("orders.csv", parse_dates=["order_date"])\norders["line_total"] = orders["quantity"] * orders["unit_price"]\ndaily = orders[orders["status"] == "completed"].groupby("order_date")["line_total"].sum()\nprint({day.strftime("%d %b"): total for day, total in daily.round(2).items()})\nfig, ax = plt.subplots(figsize=(6, 3))\nax.plot(daily.index, daily.values, marker="o", color="#333333")\nax.set_title("Completed revenue per day")\nax.set_xlabel("Day")\nax.set_ylabel("Revenue (£)")\nax.set_ylim(bottom=0)\nfig.autofmt_xdate()\nplt.show()',
    },
    {
      title: "A histogram shows the spread",
      text: "Most orders are under £100; a few large furniture orders pull the mean well above the median, which the mean alone would hide.",
      code: 'import matplotlib.pyplot as plt\nimport pandas as pd\norders = pd.read_csv("orders.csv")\ntotals = orders["quantity"] * orders["unit_price"]\nprint("mean:", round(totals.mean(), 2), "| median:", totals.median())\nfig, ax = plt.subplots(figsize=(6, 3))\nax.hist(totals, bins=6, color="#777777", edgecolor="black")\nax.set_title("Order values")\nax.set_xlabel("Order value (£)")\nax.set_ylabel("Number of orders")\nplt.show()',
    },
    {
      title: "Exports",
      text: "`index=False` keeps the meaningless row numbers out of the CSV; `orient=\"records\"` writes one JSON object per row.",
      code: 'import pandas as pd\nsummary = pd.DataFrame({"category": ["furniture", "lighting"], "revenue": [240.0, 212.0]})\nsummary.to_csv("summary.csv", index=False)\nsummary.to_json("summary.json", orient="records", indent=2)\nprint(open("summary.csv").read())\nprint(open("summary.json").read())',
    },
  ],

  mistakes: [
    {
      title: "Exporting the index by accident",
      text: "Without `index=False`, the CSV gets an unnamed first column of row numbers, which readers misread as data.",
      code: 'import pandas as pd\nsummary = pd.DataFrame({"category": ["furniture", "lighting"], "revenue": [240.0, 212.0]})\nsummary.to_csv("summary.csv")\nprint(open("summary.csv").read())',
      fix: "Use `to_csv(path, index=False)` unless the index holds real labels.",
    },
    {
      title: "A chart without labels",
      text: "The bars are right, but nothing says what they measure or in what units. The figure is drawn; the meaning isn't.",
      code: 'import matplotlib.pyplot as plt\nfig, ax = plt.subplots(figsize=(4, 2))\nax.bar(["a", "b"], [240, 212])\nprint("title:", repr(ax.get_title()), "| y label:", repr(ax.get_ylabel()))\nplt.show()',
      fix: "Set a title and both axis labels, with units: `ax.set_title(...)`, `ax.set_xlabel(...)`, `ax.set_ylabel(...)`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "A data-quality summary",
      prompt:
        "Write `quality_report(df)` for any orders DataFrame. Return a dictionary with `\"rows\"`, `\"duplicate_rows\"` (exact duplicates), `\"missing_by_column\"` (a dict of column → missing count, **only columns with at least one gap**), `\"negative_quantities\"` (rows with `quantity` below 0) and `\"statuses\"` (a sorted list of distinct statuses). Use plain Python ints.",
      looksFor: [
        "Each count is right, as a plain int.",
        "`missing_by_column` lists only columns that have gaps.",
        "`statuses` is sorted and has no repeats.",
      ],
      starter: 'import pandas as pd\n\n\ndef quality_report(df):\n    # Return the quality summary.\n    pass\n\n\nprint(quality_report(pd.read_csv("orders.csv")))\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "clean",
            label: "A clean file gives zeros",
            show: 'quality_report(pd.read_csv("orders.csv"))',
            expr: 'import pandas as pd\nresult = quality_report(pd.read_csv("orders.csv"))',
            expected: py.dict([[s("rows"), i(12)], [s("duplicate_rows"), i(0)], [s("missing_by_column"), py.dict([])], [s("negative_quantities"), i(0)], [s("statuses"), py.list(s("cancelled"), s("completed"), s("pending"), s("refunded"))]]),
          },
          {
            kind: "expr",
            id: "messy",
            label: "A messy frame shows its problems",
            show: "quality_report(a frame with a duplicate, gaps and a negative quantity)",
            expr: 'import pandas as pd\ndf = pd.DataFrame({"order_id": [1, 2, 2, 3], "quantity": [1, -2, -2, None], "status": ["new", None, None, "done"]})\nresult = quality_report(df)',
            expected: py.dict([[s("rows"), i(4)], [s("duplicate_rows"), i(1)], [s("missing_by_column"), py.dict([[s("quantity"), i(1)], [s("status"), i(2)]])], [s("negative_quantities"), i(2)], [s("statuses"), py.list(s("done"), s("new"))]]),
            tip: "missing = df.isna().sum(); keep {col: int(n) for col, n in missing.items() if n > 0}. dropna() before listing statuses.",
          },
        ],
      },
      hints: [
        "rows = len(df); duplicate_rows = int(df.duplicated().sum()).",
        "missing = df.isna().sum(), then a dict comprehension keeping counts above 0.",
        'negative = int((df["quantity"] < 0).sum()); statuses = sorted(df["status"].dropna().unique().tolist()).',
      ],
      answer: 'import pandas as pd\n\n\ndef quality_report(df):\n    """Counts of rows, duplicates, gaps and negative quantities, and the distinct statuses."""\n    missing = df.isna().sum()\n    return {\n        "rows": len(df),\n        "duplicate_rows": int(df.duplicated().sum()),\n        "missing_by_column": {col: int(n) for col, n in missing.items() if n > 0},\n        "negative_quantities": int((df["quantity"] < 0).sum()),\n        "statuses": sorted(df["status"].dropna().unique().tolist()),\n    }\n\n\nprint(quality_report(pd.read_csv("orders.csv")))',
      wrong: [
        { code: 'import pandas as pd\n\ndef quality_report(df):\n    return {"rows": len(df), "duplicate_rows": int(df.duplicated().sum()), "missing_by_column": {c: int(n) for c, n in df.isna().sum().items()}, "negative_quantities": int((df["quantity"] < 0).sum()), "statuses": sorted(df["status"].dropna().unique().tolist())}\n', fails: ["clean", "messy"], why: "lists every column, even without gaps" },
        { code: 'import pandas as pd\n\ndef quality_report(df):\n    missing = df.isna().sum()\n    return {"rows": len(df), "duplicate_rows": int(df.duplicated(subset=["order_id"]).sum()), "missing_by_column": {c: int(n) for c, n in missing.items() if n > 0}, "negative_quantities": int((df["quantity"] <= 0).sum()), "statuses": list(df["status"].dropna().unique())}\n', fails: ["clean", "messy"], why: "zero counted as negative, and statuses not sorted" },
      ],
    },
    {
      id: "challenge-2",
      title: "Chart and export revenue",
      prompt:
        "Write `revenue_chart(orders, path)`. For completed orders, total revenue (`quantity × unit_price`) per category, highest first. Save that table to `path` as a CSV with the columns `category,revenue` and **no index**. Then draw a **bar chart** of it with matplotlib, with a title and both axis labels set, and **return the Axes** (`ax`). Don't call `plt.show()` inside the function.",
      looksFor: [
        "The CSV has `category,revenue`, highest revenue first, and no index column.",
        "The chart has one bar per category, a title, and an x and y label.",
        "The function returns the matplotlib Axes.",
      ],
      starter: 'import matplotlib.pyplot as plt\nimport pandas as pd\n\n\ndef revenue_chart(orders, path):\n    # Save category,revenue to path; return the Axes of a bar chart.\n    pass\n\n\nax = revenue_chart(pd.read_csv("orders.csv"), "revenue.csv")\nplt.show()\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "csv",
            label: "The CSV holds category,revenue, highest first, without an index",
            show: 'open(path).read() after revenue_chart(orders, "check.csv")',
            expr: 'import pandas as pd\nimport matplotlib.pyplot as plt\nrevenue_chart(pd.read_csv("orders.csv"), "check.csv")\nplt.close("all")\nwith open("check.csv", encoding="utf-8") as _f:\n    result = _f.read().splitlines()',
            expected: py.list(s("category,revenue"), s("furniture,240.0"), s("lighting,212.0"), s("stationery,62.5")),
            tip: 'revenue.reset_index().to_csv(path, index=False), with the columns named category and revenue.',
          },
          {
            kind: "expr",
            id: "chart",
            label: "A labelled bar chart, one bar per category",
            show: "the returned Axes: bars, title and labels",
            expr: 'import pandas as pd\nimport matplotlib.pyplot as plt\nax = revenue_chart(pd.read_csv("orders.csv"), "check2.csv")\nresult = (type(ax).__name__, len(ax.patches), bool(ax.get_title()), bool(ax.get_xlabel()), bool(ax.get_ylabel()))\nplt.close("all")',
            expected: py.tuple(s("Axes"), i(3), py.bool(true), py.bool(true), py.bool(true)),
            tip: "fig, ax = plt.subplots(); ax.bar(...) or revenue.plot(kind=\"bar\", ax=ax); then ax.set_title, ax.set_xlabel and ax.set_ylabel; return ax.",
          },
        ],
      },
      hints: [
        'Filter completed orders, add line_total, then groupby("category")["line_total"].sum().sort_values(ascending=False).',
        'Save: table = revenue.rename("revenue").reset_index(); table.to_csv(path, index=False).',
        'fig, ax = plt.subplots(); ax.bar(table["category"], table["revenue"]); set the title and labels; return ax.',
      ],
      answer: 'import matplotlib.pyplot as plt\nimport pandas as pd\n\n\ndef revenue_chart(orders, path):\n    """Save completed revenue per category to path, and return a labelled bar chart\'s Axes."""\n    completed = orders[orders["status"] == "completed"]\n    revenue = (completed["quantity"] * completed["unit_price"]).groupby(completed["category"]).sum()\n    table = revenue.sort_values(ascending=False).rename("revenue").reset_index()\n    table.to_csv(path, index=False)\n    fig, ax = plt.subplots(figsize=(6, 3))\n    ax.bar(table["category"], table["revenue"], color="#333333")\n    ax.set_title("Completed revenue by category")\n    ax.set_xlabel("Category")\n    ax.set_ylabel("Revenue (£)")\n    return ax\n\n\nax = revenue_chart(pd.read_csv("orders.csv"), "revenue.csv")\nplt.show()',
      wrong: [
        { code: 'import matplotlib.pyplot as plt\nimport pandas as pd\n\ndef revenue_chart(orders, path):\n    c = orders[orders["status"] == "completed"]\n    revenue = (c["quantity"] * c["unit_price"]).groupby(c["category"]).sum().sort_values(ascending=False).rename("revenue")\n    revenue.to_csv(path)\n    fig, ax = plt.subplots()\n    ax.bar(revenue.index, revenue.values)\n    return ax\n', fails: ["chart"], why: "no title or labels" },
        { code: 'import matplotlib.pyplot as plt\nimport pandas as pd\n\ndef revenue_chart(orders, path):\n    c = orders[orders["status"] == "completed"]\n    table = (c["quantity"] * c["unit_price"]).groupby(c["category"]).sum().rename("revenue").reset_index()\n    table.to_csv(path)\n    fig, ax = plt.subplots()\n    ax.bar(table["category"], table["revenue"])\n    ax.set_title("Revenue")\n    ax.set_xlabel("Category")\n    ax.set_ylabel("£")\n    return ax\n', fails: ["csv"], why: "index exported and not sorted by revenue" },
      ],
    },
  ],

  quiz: [
    {
      id: "chart-type",
      prompt: "Which chart best shows how daily revenue changed over a month?",
      options: [
        { text: "A line chart with days on the x-axis", correct: true, why: "Lines show change over an ordered sequence like time." },
        { text: "A pie chart of revenue per day", why: "Thirty slices make the change over time almost impossible to read." },
        { text: "A histogram of daily revenue", why: "A histogram shows how values are spread, and loses the order of the days." },
        { text: "A bar chart sorted from highest to lowest day", why: "Sorting by value destroys the time order the question is about." },
      ],
    },
    {
      id: "caveat",
      prompt: "Twelve orders over six days show furniture as the top category. Which statement is the most careful?",
      options: [
        { text: "“In these six days furniture earned most, from just two orders; too few to call a trend.”", correct: true, why: "It reports the finding with its size and its limits." },
        { text: "“Furniture is our best-selling category.”", why: "Two orders in one week can't support a general claim." },
        { text: "“Customers prefer furniture.”", why: "The data shows revenue, not preferences, and very little of it." },
        { text: "“Lighting is failing.”", why: "Lighting had more orders; the data doesn't show failure." },
      ],
    },
  ],

  outcomes: [
    "Run a repeatable first pass: size, types, gaps, duplicates, ranges and spellings.",
    "Draw labelled bar, line and histogram charts with matplotlib.",
    "State the caveats of a finding alongside it.",
    "Export results with `to_csv(index=False)` and `to_json(orient=\"records\")`.",
  ],
};
