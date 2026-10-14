import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { SHOP_RAW_FILES } from "../../data/shop";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));

export const cleaningStringsDatesAndDuplicates: PyLesson = {
  slug: "cleaning-strings-dates-and-duplicates",
  ref: "python:cleaning-strings-dates-and-duplicates",
  module: "pandas",
  number: 5,
  title: "Cleaning strings, dates and duplicates",
  level: "intermediate",
  summary:
    "Tidy text columns with the `.str` methods, turn date text into real datetimes with `pd.to_datetime` (flagging the ones that can't be read), use `.dt` to pull out parts of dates, and find and remove duplicate rows deliberately.",
  packages: ["pandas"],
  files: SHOP_RAW_FILES,

  sections: [
    {
      label: "the .str accessor",
      blocks: [
        {
          kind: "p",
          text: "Text columns have a `.str` accessor with the string methods you know, applied to every row: `.str.strip()`, `.str.lower()`, `.str.title()`, `.str.replace(\"£\", \"\")`, `.str.contains(\"lamp\", case=False)`, `.str.split(\"-\")`. Missing values stay missing instead of causing errors.",
        },
        { kind: "code", code: 'raw["product"] = raw["product"].str.strip().str.capitalize()\nraw["status"] = raw["status"].str.strip().str.lower()' },
        {
          kind: "p",
          text: "Normalising text is what makes grouping and counting correct: `Desk lamp`, ` Desk lamp` and `Desk Lamp ` are three different values to `value_counts` until they're cleaned.",
        },
      ],
    },
    {
      label: "dates",
      blocks: [
        {
          kind: "p",
          text: "`pd.to_datetime(col, errors=\"coerce\")` parses date text into `datetime64` values, turning anything unreadable into `NaT` (“not a time”, the date version of NaN). Give `format=\"%Y-%m-%d\"` when you know the layout: it's faster and won't silently guess day-first versus month-first. Real dates have a `.dt` accessor: `.dt.year`, `.dt.month`, `.dt.day_name()`, `.dt.date`, and they sort and compare by time.",
        },
      ],
    },
    {
      label: "duplicates",
      blocks: [
        {
          kind: "p",
          text: "`df.duplicated()` marks rows that repeat an **earlier** row exactly; `df.drop_duplicates()` removes them. With `subset=[\"order_id\"]` only those columns are compared, which finds the same order exported twice even if another column differs. `keep=\"first\"` (the default) keeps the first copy; `keep=\"last\"` the last, which, after sorting by an update time, means “keep the latest version”. Always count what you removed.",
        },
      ],
    },
  ],

  example: {
    caption: "Cleaning the raw export: text, dates and a duplicated order. Press Run to execute it with real pandas; running examples never affects your progress.",
    code: 'import pandas as pd\n\nraw = pd.read_csv("raw_orders.csv")\nprint(raw["product"].value_counts().to_dict())\n\nclean = raw.assign(\n    product=raw["product"].str.strip().str.capitalize(),\n    status=raw["status"].str.strip().str.lower(),\n    customer_id=raw["customer_id"].str.upper(),\n    order_date=pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce"),\n)\nprint(clean["product"].value_counts().to_dict())\nprint("Unreadable dates:", clean["order_date"].isna().sum())\nprint("Duplicated rows:", clean.duplicated().sum())\nclean = clean.drop_duplicates()\nprint(len(raw), "->", len(clean), "rows")',
  },

  walkthrough: [
    {
      title: "Three spellings of one product",
      text: "Until spacing and case are normalised, `value_counts` sees different values.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw["product"].tolist()[:4])\nprint(raw["product"].str.strip().str.lower().value_counts().to_dict())',
    },
    {
      title: "to_datetime with coerce",
      text: "The unreadable date becomes `NaT`; the rest are real dates with a `.dt` accessor.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\ndates = pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce")\nprint(dates.isna().sum(), raw.loc[dates.isna(), "order_date"].tolist())\nprint(dates.dt.day_name().dropna().unique().tolist())',
    },
    {
      title: "Finding duplicates",
      text: "`duplicated` marks the second copy of order 1004; `keep=False` marks every copy.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw.duplicated().sum(), raw[raw.duplicated()]["order_id"].tolist())\nprint(raw[raw.duplicated(keep=False)]["order_id"].tolist())',
    },
    {
      title: "Keeping the latest version",
      text: "Two versions of order 7: sorting by update time, then keeping the last per `order_id`, keeps the newest.",
      code: 'import pandas as pd\nupdates = pd.DataFrame({\n    "order_id": [7, 8, 7],\n    "status": ["pending", "completed", "shipped"],\n    "updated": pd.to_datetime(["2026-09-01 09:00", "2026-09-01 10:00", "2026-09-02 08:00"]),\n})\nlatest = updates.sort_values("updated").drop_duplicates(subset=["order_id"], keep="last")\nprint(latest.sort_values("order_id")[["order_id", "status"]].to_dict("records"))',
    },
  ],

  mistakes: [
    {
      title: "Using str methods without .str",
      text: "A column isn't a string, so it has no `strip` method of its own: `AttributeError`.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nprint(raw["product"].strip())',
      raises: "AttributeError",
      fix: 'Go through the accessor: `raw["product"].str.strip()`.',
    },
    {
      title: "Parsing dates without coerce",
      text: "One unreadable date stops the whole conversion with a `ValueError`.",
      code: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\ndates = pd.to_datetime(raw["order_date"], format="%Y-%m-%d")',
      raises: "ValueError",
      fix: 'Use `errors="coerce"`, then count and report the `NaT` values.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Clean the raw orders",
      prompt:
        "Write `clean_orders(raw)` for a DataFrame like `raw_orders.csv`. Return a **new** DataFrame where `product` is stripped and capitalised (`Desk lamp`), `status` is stripped and lowercase, `customer_id` is uppercase, and `order_date` is a datetime (unreadable dates become `NaT`). Then remove exact duplicate rows, and renumber the index from 0.",
      looksFor: [
        "Text columns are normalised, so each product and status has one spelling.",
        "`order_date` is a datetime column; unreadable dates are `NaT`.",
        "Exact duplicates are removed and the index is renumbered.",
      ],
      starter: 'import pandas as pd\n\n\ndef clean_orders(raw):\n    # Return the cleaned DataFrame.\n    pass\n\n\nprint(clean_orders(pd.read_csv("raw_orders.csv")))\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "text",
            label: "Products, statuses and customer IDs normalised",
            show: "clean_orders(raw)[[\"product\", \"status\", \"customer_id\"]]",
            expr: 'import pandas as pd\nout = clean_orders(pd.read_csv("raw_orders.csv"))\nresult = (sorted(out["product"].unique().tolist()), sorted(out["status"].unique().tolist()), out["customer_id"].dropna().tolist()[:3])',
            expected: py.tuple(strs("Chair", "Desk lamp", "Floor lamp", "Notebook", "Oak desk", "Pen set"), strs("completed", "pending", "refunded"), strs("C01", "C02", "C01")),
            tip: '.str.strip().str.capitalize() for product, .str.strip().str.lower() for status, .str.upper() for customer_id.',
          },
          {
            kind: "expr",
            id: "dates",
            label: "order_date is a datetime, with NaT for the unreadable date",
            show: 'str(out["order_date"].dtype), out["order_date"].isna().sum()',
            expr: 'import pandas as pd\nout = clean_orders(pd.read_csv("raw_orders.csv"))\nresult = (str(out["order_date"].dtype).startswith("datetime64"), int(out["order_date"].isna().sum()))',
            expected: py.tuple(py.bool(true), i(1)),
            tip: 'pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce").',
          },
          {
            kind: "expr",
            id: "dupes",
            label: "Duplicates removed, index renumbered",
            show: 'out["order_id"].tolist(), out.index.tolist()',
            expr: 'import pandas as pd\nout = clean_orders(pd.read_csv("raw_orders.csv"))\nresult = (out["order_id"].tolist(), out.index.tolist())',
            expected: py.tuple(ints(1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008), ints(0, 1, 2, 3, 4, 5, 6, 7)),
            tip: "drop_duplicates() then reset_index(drop=True).",
          },
          { kind: "expr", id: "input", label: "The input is unchanged", hidden: true, expr: 'import pandas as pd\nraw = pd.read_csv("raw_orders.csv")\nclean_orders(raw)\nresult = (len(raw), raw["status"].iloc[0])', expected: py.tuple(i(9), s("Completed")) },
        ],
      },
      hints: [
        "Use raw.assign(product=..., status=..., customer_id=..., order_date=...) to build a new frame.",
        'The date: pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce").',
        "Then .drop_duplicates().reset_index(drop=True).",
      ],
      answer: 'import pandas as pd\n\n\ndef clean_orders(raw):\n    """Return a cleaned copy of raw orders: normalised text, real dates, no duplicates."""\n    clean = raw.assign(\n        product=raw["product"].str.strip().str.capitalize(),\n        status=raw["status"].str.strip().str.lower(),\n        customer_id=raw["customer_id"].str.upper(),\n        order_date=pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce"),\n    )\n    return clean.drop_duplicates().reset_index(drop=True)\n\n\nprint(clean_orders(pd.read_csv("raw_orders.csv")))',
      wrong: [
        { code: 'import pandas as pd\n\ndef clean_orders(raw):\n    clean = raw.drop_duplicates().assign(\n        product=raw["product"].str.title(),\n        status=raw["status"].str.lower(),\n        customer_id=raw["customer_id"].str.upper(),\n        order_date=pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce"),\n    )\n    return clean.reset_index(drop=True)\n', fails: ["text"], why: "title() without strip: ' Desk lamp' and 'Desk Lamp' stay separate" },
        { code: 'import pandas as pd\n\ndef clean_orders(raw):\n    clean = raw.assign(\n        product=raw["product"].str.strip().str.capitalize(),\n        status=raw["status"].str.strip().str.lower(),\n        customer_id=raw["customer_id"].str.upper(),\n        order_date=pd.to_datetime(raw["order_date"], format="%Y-%m-%d", errors="coerce"),\n    )\n    return clean\n', fails: ["dupes"], why: "duplicates kept" },
      ],
    },
    {
      id: "challenge-2",
      title: "Keep the latest status per order",
      prompt:
        "A status feed has one row per change: `order_id`, `status`, `updated_at` (ISO text). Write `latest_status(feed)`, which returns a DataFrame with **one row per order**: its most recent status, with columns `order_id`, `status` and `updated_at` (as a datetime), sorted by `order_id`, index renumbered. If an order has two rows with the same time, keep the one that appears **later** in the feed.",
      looksFor: [
        "One row per `order_id`, holding the row with the latest `updated_at`.",
        "Ties on time are broken by feed order (the later row wins).",
        "Sorted by `order_id`, index from 0, `updated_at` a datetime.",
      ],
      starter: "import pandas as pd\n\n\ndef latest_status(feed):\n    # Return the latest row per order.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "latest",
            label: "The latest status for each order",
            show: "latest_status(feed)",
            expr: 'import pandas as pd\nfeed = pd.DataFrame({"order_id": [7, 8, 7, 9, 8], "status": ["pending", "completed", "shipped", "pending", "pending"], "updated_at": ["2026-09-01T09:00", "2026-09-01T11:00", "2026-09-02T08:00", "2026-09-02T09:30", "2026-09-01T10:00"]})\nout = latest_status(feed)\nresult = (out["order_id"].tolist(), out["status"].tolist(), out.index.tolist(), str(out["updated_at"].dtype).startswith("datetime64"))',
            expected: py.tuple(ints(7, 8, 9), strs("shipped", "completed", "pending"), ints(0, 1, 2), py.bool(true)),
            tip: 'Convert updated_at with pd.to_datetime, sort by it, drop_duplicates(subset=["order_id"], keep="last"), then sort by order_id.',
          },
          {
            kind: "expr",
            id: "tie",
            label: "Same time: the later row wins",
            show: "two rows for order 1 at the same time",
            expr: 'import pandas as pd\nfeed = pd.DataFrame({"order_id": [1, 1], "status": ["packed", "shipped"], "updated_at": ["2026-09-01T09:00", "2026-09-01T09:00"]})\nresult = latest_status(feed)["status"].tolist()',
            expected: strs("shipped"),
            tip: 'sort_values("updated_at", kind="stable") keeps feed order for equal times, so keep="last" picks the later row.',
          },
        ],
      },
      hints: [
        'feed = feed.assign(updated_at=pd.to_datetime(feed["updated_at"])).',
        'Sort by time with a stable sort: feed.sort_values("updated_at", kind="stable"), then drop_duplicates(subset=["order_id"], keep="last").',
        'Finish with .sort_values("order_id").reset_index(drop=True)[["order_id", "status", "updated_at"]].',
      ],
      answer: 'import pandas as pd\n\n\ndef latest_status(feed):\n    """Return each order\'s latest row; on equal times the later feed row wins."""\n    feed = feed.assign(updated_at=pd.to_datetime(feed["updated_at"]))\n    latest = feed.sort_values("updated_at", kind="stable").drop_duplicates(subset=["order_id"], keep="last")\n    return latest.sort_values("order_id").reset_index(drop=True)[["order_id", "status", "updated_at"]]',
      wrong: [
        { code: 'import pandas as pd\n\ndef latest_status(feed):\n    feed = feed.assign(updated_at=pd.to_datetime(feed["updated_at"]))\n    return feed.drop_duplicates(subset=["order_id"], keep="last").sort_values("order_id").reset_index(drop=True)[["order_id", "status", "updated_at"]]\n', fails: ["latest"], why: "last in the feed, not the latest time" },
        { code: 'import pandas as pd\n\ndef latest_status(feed):\n    feed = feed.assign(updated_at=pd.to_datetime(feed["updated_at"]))\n    return feed.sort_values("updated_at").drop_duplicates(subset=["order_id"], keep="first").sort_values("order_id").reset_index(drop=True)[["order_id", "status", "updated_at"]]\n', fails: ["latest", "tie"], why: "keeps the earliest" },
      ],
    },
  ],

  quiz: [
    {
      id: "dup",
      prompt: "`df` has rows A, B, A (the third repeats the first exactly). What is `df.duplicated().tolist()`?",
      options: [
        { text: "`[False, False, True]`", correct: true, why: "`duplicated` marks rows that repeat an **earlier** row; the first A is the original." },
        { text: "`[True, False, True]`", why: "That's `keep=False`, which marks every copy." },
        { text: "`[False, False, False]`", why: "The third row matches the first exactly, so it's a duplicate." },
        { text: "`[True, False, False]`", why: "That's `keep=\"last\"`: the last copy is the one kept." },
      ],
    },
    {
      id: "nat",
      prompt: 'What is `pd.to_datetime(pd.Series(["2026-02-30"]), errors="coerce")[0]`?',
      options: [
        { text: "`NaT`", correct: true, why: "30 February doesn't exist, and `coerce` turns unreadable dates into NaT." },
        { text: "2 March 2026", why: "pandas doesn't roll invalid days over into the next month." },
        { text: "A `ValueError`", why: "That's without `errors=\"coerce\"`." },
        { text: 'The text `"2026-02-30"`', why: "The result is a datetime column; invalid values become NaT." },
      ],
    },
  ],

  outcomes: [
    "Normalise text columns with `.str` methods so values group correctly.",
    "Parse dates with `pd.to_datetime`, using `format` and `errors=\"coerce\"`, and use `.dt`.",
    "Find duplicates with `duplicated` and remove them with `drop_duplicates`.",
    "Keep the latest version of each record by sorting and `keep=\"last\"`.",
  ],
};
