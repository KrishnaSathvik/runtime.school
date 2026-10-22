/**
 * M44 practice: ten independent problems on the charts and distributions of PY-L44-01 … PY-L44-05.
 *
 * Mix: 3 function implementations (binning, correlation, a bin-width rule), 1 integration (a pivot drawn as grouped
 * bars), 1 data transformation, 1 validation (inspect a figure and report what's wrong with it), 2 debugging (a
 * function returning the wrong figure, and frequency-ordered rating bars), 2 output predictions. Easy: 02, 03, 06, 10.
 * Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Charts are graded by inspecting the Figure and Axes the learner's function returns. Fixtures are slices of R02
 * (Runtime Films runtimes, budgets, ratings), R01 (revenue) and D13 (flight delays).
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { frameRows, pv } from "../fn-checks";
import { frameSetup } from "../lessons/M43";
import { HEIGHTS, PDMPL, TICKS, figCheck } from "../lessons/M44";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;

const monthOrders = [
  { month: "2024-01", channel: "web", total: 35.84 },
  { month: "2024-01", channel: "web", total: 91.47 },
  { month: "2024-02", channel: "web", total: 55.72 },
  { month: "2024-04", channel: "phone", total: 54.55 },
  { month: "2024-06", channel: "app", total: 64.17 },
  { month: "2024-06", channel: "app", total: 39.15 },
];

/** Setup that builds a figure for chart_problems(): bars, labels, title, ylabel, y-limit bottom. */
const chartFig = (labels: string[], heights: number[], title: string, ylabel: string, bottom: number | null) =>
  [
    "import matplotlib.pyplot as _plt",
    "_f, _a = _plt.subplots()",
    `_a.bar(${JSON.stringify(labels)}, ${JSON.stringify(heights)})`,
    title ? `_a.set_title(${JSON.stringify(title)})` : "",
    ylabel ? `_a.set_ylabel(${JSON.stringify(ylabel)})` : "",
    bottom === null ? "" : `_a.set_ylim(bottom=${bottom})`,
  ].filter(Boolean).join("\n");

export const m44Questions: PyQuestion[] = [
  {
    id: "PY-Q44-02",
    version: 2,
    slug: "what-is-on-the-axes",
    title: "What is on the Axes?",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "import-alias", "import-module", "len-call", "list-comp", "list-literal", "membership", "module-file", "mpl-axes", "print-call", "tuple-unpack"],
    packages: PDMPL,
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Each bar is one patch; each `plot` call is one line, however many points it has.",
      "The second `bar` call adds more patches to the same Axes.",
      "Text x labels keep the order they were first given in.",
    ],
    explanation: "The first `bar` adds three patches and the second two more, so there are five; the `plot` call adds one line. The tick labels are the categories in first-seen order: Jan, Feb, Mar, then Apr from the second call. The title was set, the y label wasn't.",
    predict: {
      program: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.bar(["Jan", "Feb", "Mar"], [127.31, 55.72, 246.6])
ax.bar(["Mar", "Apr"], [10.0, 54.55])
ax.plot(["Jan", "Apr"], [100, 100])
ax.set_title("Revenue")
print(len(ax.patches), len(ax.get_lines()))
print([t.get_text() for t in ax.get_xticklabels()])
print(repr(ax.get_title()), repr(ax.get_ylabel()))
`,
      output: "5 1\n['Jan', 'Feb', 'Mar', 'Apr']\n'Revenue' ''\n",
      wrongPredictions: ["3 1\n['Jan', 'Feb', 'Mar', 'Apr']\n'Revenue' ''", "5 2\n['Jan', 'Feb', 'Mar', 'Apr']\n'Revenue' ''", "5 1\n['Jan', 'Feb', 'Mar', 'Mar', 'Apr']\n'Revenue' ''", "5 1\n['Jan', 'Feb', 'Mar', 'Apr']\n'Revenue' None"],
    },
  },
  {
    id: "PY-Q44-03",
    version: 2,
    slug: "blank-chart-returned",
    title: "The dashboard chart that comes out blank",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "dict-iterate", "dict-literal", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "membership", "module-file", "mpl-axes", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "`fares_chart` should return a bar chart of average fare per payment type, titled `Average fare by payment`. The dashboard that calls it shows an empty chart. Fix the function.",
    spec: [
      ["Function", "`fares_chart(averages)`"],
      ["averages", "a dictionary from payment type to average fare"],
      ["Returns", "the Figure with one bar per payment type and the title"],
    ],
    hiddenKinds: ["a single payment type", "four payment types"],
    hints: [
      "Count how many figures the function creates.",
      "The bars are drawn on one figure, but a different one is returned.",
      "Return the figure that `plt.subplots()` made.",
    ],
    explanation: "`plt.figure()` creates a second, empty Figure, and that is what the function returns, while the bars live on the first one. Returning the Figure from `plt.subplots()` fixes it. Drawing with `plt.bar` instead of `ax.bar` happens to work here only because the subplots figure is the current one, which is why Axes methods are safer.",
    code: {
      starter: src`
import matplotlib.pyplot as plt

def fares_chart(averages):
    fig, ax = plt.subplots()
    ax.bar(list(averages.keys()), list(averages.values()))
    ax.set_title("Average fare by payment")
    fig = plt.figure()
    return fig

fig = fares_chart({"card": 18.8, "cash": 15.2})
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt

def fares_chart(averages):
    fig, ax = plt.subplots()
    ax.bar(list(averages.keys()), list(averages.values()))
    ax.set_title("Average fare by payment")
    return fig

fig = fares_chart({"card": 18.8, "cash": 15.2})
plt.show()
`,
      alternatives: [
        src`
import matplotlib.pyplot as plt

def fares_chart(averages):
    fig = plt.figure()
    ax = fig.add_subplot()
    ax.bar(list(averages), [averages[k] for k in averages])
    ax.set_title("Average fare by payment")
    return fig
`,
      ],
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def fares_chart(averages):
    fig, ax = plt.subplots()
    fig = plt.figure()
    ax.bar(list(averages.keys()), list(averages.values()))
    ax.set_title("Average fare by payment")
    return fig
`,
          fails: ["bars", "title", "bars-hidden"],
          why: "moving the line doesn't help: the returned figure is still the new empty one",
        },
        {
          code: src`
import matplotlib.pyplot as plt

def fares_chart(averages):
    fig, ax = plt.subplots()
    ax.bar(list(averages.keys()), list(averages.values()))
    return fig
`,
          fails: ["title"],
          why: "the right figure, but the title was deleted with the extra line",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("bars", "The returned figure has one bar per payment type", "", "fares_chart({'card': 18.8, 'cash': 15.2, 'flex': 21.0})", "result = [[t.get_text() for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [["card", "cash", "flex"], [18.8, 15.2, 21.0]], { show: "fares_chart({'card': 18.8, 'cash': 15.2, 'flex': 21.0})" }),
          figCheck("title", "The returned figure is titled", "", "fares_chart({'card': 18.8})", "result = _ax.get_title()", "Average fare by payment"),
          figCheck("bars-hidden", "Works for other averages (one type, four types)", "", "fares_chart({'dispute': 9.5, 'card': 1.0, 'cash': 2.0, 'no charge': 0.0})", HEIGHTS, [9.5, 1.0, 2.0, 0.0], { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-06",
    version: 2,
    slug: "runtime-bands",
    title: "Films by runtime band",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "assignment", "comp-if", "comparison", "conversion", "dict-literal", "function-def", "function-param", "function-return", "identity", "import-alias", "import-module", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "np-reduce", "pd-dist", "pd-filter", "pd-frame", "pd-missing", "print-call", "print-several", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "A catalogue page groups films by length. Write `runtime_bands(runtimes)`: return how many films are `short` (under 90 minutes), `feature` (90 to under 120) and `long` (120 or more). Every band appears in the result, even with 0 films. Missing runtimes (`None`) are not counted.",
    spec: [
      ["Function", "`runtime_bands(runtimes)`"],
      ["Returns", "`{\"short\": int, \"feature\": int, \"long\": int}`"],
    ],
    hiddenKinds: ["runtimes exactly on a band edge", "missing runtimes", "very long films", "no films"],
    hints: [
      "These are histogram bins with uneven edges.",
      "The last band has no upper limit: an infinite edge (`np.inf`) closes it.",
      "Drop the missing runtimes first; then map the three counts to their names.",
    ],
    explanation: "`np.histogram` with edges `[0, 90, 120, inf]` counts the three bands; each bin includes its left edge, so 90 is a feature and 120 is long. Missing values must be removed first, because a NaN can't be placed in a bin.",
    code: {
      starter: src`
import numpy as np

def runtime_bands(runtimes):
    return {"short": 0, "feature": 0, "long": 0}

print(runtime_bands([107, 87, 133, 79, None, 95]))
`,
      answer: src`
import numpy as np

def runtime_bands(runtimes):
    known = [r for r in runtimes if r is not None]
    counts, edges = np.histogram(known, bins=[0, 90, 120, np.inf])
    return {"short": int(counts[0]), "feature": int(counts[1]), "long": int(counts[2])}

print(runtime_bands([107, 87, 133, 79, None, 95]))
`,
      alternatives: [
        src`
import pandas as pd

def runtime_bands(runtimes):
    values = pd.Series(runtimes, dtype=float).dropna()
    return {
        "short": int((values < 90).sum()),
        "feature": int(values.between(90, 120, inclusive="left").sum()),
        "long": int((values >= 120).sum()),
    }
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def runtime_bands(runtimes):
    known = [r for r in runtimes if r is not None]
    counts, edges = np.histogram(known, bins=3)
    return {"short": int(counts[0]), "feature": int(counts[1]), "long": int(counts[2])}
`,
          fails: ["returns"],
          why: "`bins=3` splits the data's own range into thirds instead of using the band edges",
        },
        {
          code: src`
def runtime_bands(runtimes):
    bands = {"short": 0, "feature": 0, "long": 0}
    for r in runtimes:
        if r is None:
            continue
        if r <= 90:
            bands["short"] += 1
        elif r <= 120:
            bands["feature"] += 1
        else:
            bands["long"] += 1
    return bands
`,
          fails: ["returns"],
          why: "90 and 120 are put in the band below; each band starts at its edge",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          fn("returns", "runtime_bands", [
            example([[107, 87, 133, 79, null, 95]], { short: 2, feature: 2, long: 1 }),
            example([[124, 126, 132]], { short: 0, feature: 0, long: 3 }),
            example([[]], { short: 0, feature: 0, long: 0 }),
            hiddenCase("runtimes exactly on a band edge", [[90, 120, 89]], { short: 1, feature: 1, long: 1 }),
            hiddenCase("missing runtimes", [[null, null, 100]], { short: 0, feature: 1, long: 0 }),
            hiddenCase("very long films", [[240, 69]], { short: 1, feature: 0, long: 1 }),
          ], { label: "runtime_bands() counts films per band" }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-10",
    version: 2,
    slug: "budget-revenue-correlation",
    title: "How strongly do two numbers move together?",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "comp-if", "comparison", "conversion", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "np-array", "pd-frame", "pd-missing", "print-call", "print-several", "reassignment", "string-index", "top-level-indent", "zip-call"],
    packages: PDMPL,
    prompt: "Before drawing a scatter plot, an analyst wants the correlation between two columns. Write `paired_correlation(xs, ys)`: use only the positions where **both** values are present (not `None`), and return their Pearson correlation. With fewer than 3 complete pairs, return `None`.",
    spec: [
      ["Function", "`paired_correlation(xs, ys)`"],
      ["Returns", "a float from −1 to 1, or `None`"],
    ],
    hiddenKinds: ["a missing value in only one list", "a perfect negative relationship", "only two complete pairs"],
    hints: [
      "Put both lists in one table so a row is one pair.",
      "Drop rows where either value is missing.",
      "Count the remaining pairs before computing; Series have a `corr` method.",
    ],
    explanation: "A DataFrame with an `x` and a `y` column keeps the pairs together; `dropna()` removes any pair with a gap, and `x.corr(y)` computes Pearson's correlation. Dropping missing values from each list separately would shift the pairs out of line.",
    code: {
      starter: src`
import pandas as pd

def paired_correlation(xs, ys):
    return None

print(paired_correlation([41.1, 43.1, 9.8, 51.6, None], [105.8, 207.4, 10.7, 36.6, 4.8]))
`,
      answer: src`
import pandas as pd

def paired_correlation(xs, ys):
    pairs = pd.DataFrame({"x": xs, "y": ys}, dtype=float).dropna()
    if len(pairs) < 3:
        return None
    return float(pairs["x"].corr(pairs["y"]))

print(paired_correlation([41.1, 43.1, 9.8, 51.6, None], [105.8, 207.4, 10.7, 36.6, 4.8]))
`,
      alternatives: [
        src`
import numpy as np

def paired_correlation(xs, ys):
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    a = np.array([p[0] for p in pairs], dtype=float)
    b = np.array([p[1] for p in pairs], dtype=float)
    return float(np.corrcoef(a, b)[0, 1])
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def paired_correlation(xs, ys):
    x = pd.Series(xs, dtype=float).dropna().reset_index(drop=True)
    y = pd.Series(ys, dtype=float).dropna().reset_index(drop=True)
    if min(len(x), len(y)) < 3:
        return None
    return float(x.corr(y))
`,
          fails: ["returns"],
          why: "dropping gaps from each list separately pairs values from different films",
        },
        {
          code: src`
import pandas as pd

def paired_correlation(xs, ys):
    pairs = pd.DataFrame({"x": xs, "y": ys}, dtype=float).dropna()
    return float(pairs["x"].corr(pairs["y"]))
`,
          fails: ["returns"],
          why: "two pairs always give ±1 (or nan), which says nothing; the minimum isn't enforced",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          fn("returns", "paired_correlation", [
            example([[41.1, 43.1, 9.8, 51.6, null], [105.8, 207.4, 10.7, 36.6, 4.8]], 0.44716355097485583),
            example([[1, 2, 3, 4], [2, 4, 6, 8]], 1.0),
            example([[1, null], [2, 3]], null),
            hiddenCase("a missing value in only one list", [[1, 2, null, 4, 5], [1, 3, 100, 2, 6]], 0.7606388292556651),
            hiddenCase("a perfect negative relationship", [[1, 2, 3], [30, 20, 10]], -1.0),
            hiddenCase("only two complete pairs", [[1, 2, null], [5, 6, 7]], null),
          ], { label: "paired_correlation() correlates complete pairs only", compare: { numbers: "int-float-equal", float: { abs: 1e-9 } } }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-12",
    version: 2,
    slug: "month-channel-grouped-bars",
    title: "Grouped bars of revenue by month and channel",
    format: "integration",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-literal", "module-file", "mpl-axes", "pd-frame", "pd-missing", "pd-pivot", "pd-plot", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "Write `channel_month_chart(orders)`: from a DataFrame with `month` (`YYYY-MM`), `channel` and `total`, draw grouped bars with one group per month (in date order), one bar per channel inside each group (channels A to Z, named in the legend), heights = revenue (0 where a channel sold nothing that month). Title it `Revenue by month and channel` and return the Figure.",
    spec: [
      ["Function", "`channel_month_chart(orders)`"],
      ["Checked", "the x labels, the legend entries, every bar height, the title"],
    ],
    hiddenKinds: ["months given out of order", "a single channel"],
    hints: [
      "Shape the data first: months down the side, channels across, revenue in the cells.",
      "A DataFrame shaped like that becomes grouped bars with one `.plot` call.",
      "Draw on the Axes you return, and fill empty cells with 0.",
    ],
    explanation: "`pivot_table(index=\"month\", columns=\"channel\", values=\"total\", aggfunc=\"sum\", fill_value=0)` produces exactly the table grouped bars need: its index (sorted months) becomes the x-axis and each column a coloured series in the legend. `table.plot(kind=\"bar\", ax=ax)` draws it; pandas draws all bars of the first column, then the next, which is the order the heights are checked in.",
    code: {
      starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def channel_month_chart(orders):
    fig, ax = plt.subplots()
    return fig

orders = pd.DataFrame({"month": ["2024-01", "2024-02", "2024-02"], "channel": ["web", "web", "app"], "total": [35.84, 55.72, 64.17]})
fig = channel_month_chart(orders)
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def channel_month_chart(orders):
    table = orders.pivot_table(index="month", columns="channel", values="total", aggfunc="sum", fill_value=0)
    fig, ax = plt.subplots()
    table.plot(kind="bar", ax=ax, title="Revenue by month and channel")
    return fig

orders = pd.DataFrame({"month": ["2024-01", "2024-02", "2024-02"], "channel": ["web", "web", "app"], "total": [35.84, 55.72, 64.17]})
fig = channel_month_chart(orders)
plt.show()
`,
      alternatives: [
        src`
import matplotlib.pyplot as plt
import pandas as pd

def channel_month_chart(orders):
    table = pd.crosstab(orders["month"], orders["channel"], values=orders["total"], aggfunc="sum").fillna(0)
    fig, ax = plt.subplots()
    table.plot.bar(ax=ax)
    ax.set_title("Revenue by month and channel")
    return fig
`,
      ],
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def channel_month_chart(orders):
    table = orders.pivot_table(index="channel", columns="month", values="total", aggfunc="sum", fill_value=0)
    fig, ax = plt.subplots()
    table.plot(kind="bar", ax=ax, title="Revenue by month and channel")
    return fig
`,
          fails: ["groups", "heights", "groups-hidden"],
          why: "index and columns are swapped: the groups are channels and the legend is months",
        },
        {
          code: src`
import matplotlib.pyplot as plt

def channel_month_chart(orders):
    revenue = orders.groupby("month")["total"].sum()
    fig, ax = plt.subplots()
    revenue.plot(kind="bar", ax=ax, title="Revenue by month and channel")
    return fig
`,
          fails: ["groups", "heights"],
          why: "one bar per month: the channels are lost",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("groups", "Months on the x-axis, channels in the legend", frameSetup(monthOrders), "channel_month_chart(_df)", "result = [[t.get_text() for t in _ax.get_xticklabels()], [t.get_text() for t in _ax.get_legend().get_texts()] if _ax.get_legend() else []]", [["2024-01", "2024-02", "2024-04", "2024-06"], ["app", "phone", "web"]], { show: "channel_month_chart(orders)" }),
          figCheck("heights", "Bar heights per channel and month, 0 where nothing sold", frameSetup(monthOrders), "channel_month_chart(_df)", HEIGHTS, [0, 0, 0, 103.32, 0, 0, 54.55, 0, 127.31, 55.72, 0, 0]),
          figCheck("title", "The chart is titled", frameSetup(monthOrders), "channel_month_chart(_df)", "result = _ax.get_title()", "Revenue by month and channel"),
          figCheck("groups-hidden", "Works for other orders (months out of order, one channel)", frameSetup([{ month: "2025-03", channel: "web", total: 5 }, { month: "2024-12", channel: "web", total: 7 }]), "channel_month_chart(_df)", "result = [[t.get_text() for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [["2024-12", "2025-03"], [7, 5]], { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-13",
    version: 2,
    slug: "star-ratings-out-of-order",
    title: "Star ratings in a confusing order",
    format: "debugging",
    difficulty: "medium",
    minutes: 10,
    requires: ["assignment", "conversion", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-comp", "list-literal", "list-sort", "membership", "module-file", "mpl-axes", "pd-frame", "pd-group", "pd-plot", "reassignment", "top-level-indent", "tuple-unpack", "value-count"],
    packages: PDMPL,
    prompt: "`rating_chart` should show how many ratings of each value (0.5 to 5 stars, in half stars) a film received, as bars from the lowest rating on the left to the highest on the right. Readers complain the bars jump around: 4.0, 3.5, 5.0, … Fix it so the ratings run in order. Ratings nobody gave don't need a bar.",
    spec: [
      ["Function", "`rating_chart(ratings)`"],
      ["ratings", "a list of half-star ratings"],
      ["Returns", "the Figure; x labels from lowest to highest rating, heights = counts"],
    ],
    hiddenKinds: ["a single rating value", "ratings whose counts tie"],
    hints: [
      "`value_counts` orders by how common a value is.",
      "Ratings have a natural order of their own.",
      "Sort by the index (the rating), not by the counts.",
    ],
    explanation: "`value_counts()` sorts by frequency, which suits unordered categories but scrambles an ordered scale. `sort_index()` puts the ratings in numeric order before plotting.",
    code: {
      starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def rating_chart(ratings):
    counts = pd.Series(ratings).value_counts()
    fig, ax = plt.subplots()
    counts.plot.bar(ax=ax, title="Ratings")
    return fig

fig = rating_chart([4.0, 3.5, 4.0, 5.0, 2.5, 4.0, 3.5])
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def rating_chart(ratings):
    counts = pd.Series(ratings).value_counts().sort_index()
    fig, ax = plt.subplots()
    counts.plot.bar(ax=ax, title="Ratings")
    return fig

fig = rating_chart([4.0, 3.5, 4.0, 5.0, 2.5, 4.0, 3.5])
plt.show()
`,
      alternatives: [
        src`
import matplotlib.pyplot as plt

def rating_chart(ratings):
    values = sorted(set(ratings))
    fig, ax = plt.subplots()
    ax.bar([str(v) for v in values], [ratings.count(v) for v in values])
    ax.set_title("Ratings")
    return fig
`,
      ],
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt
import pandas as pd

def rating_chart(ratings):
    counts = pd.Series(ratings).value_counts().sort_values()
    fig, ax = plt.subplots()
    counts.plot.bar(ax=ax, title="Ratings")
    return fig
`,
          fails: ["order", "order-hidden"],
          why: "sorting by the counts still ignores the order of the ratings",
        },
        {
          code: src`
import matplotlib.pyplot as plt
import pandas as pd

def rating_chart(ratings):
    counts = pd.Series(ratings).value_counts().sort_index(ascending=False)
    fig, ax = plt.subplots()
    counts.plot.bar(ax=ax, title="Ratings")
    return fig
`,
          fails: ["order", "order-hidden"],
          why: "the ratings run from highest to lowest",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("order", "Ratings from lowest to highest, with their counts", "", "rating_chart([4.0, 3.5, 4.0, 5.0, 2.5, 4.0, 3.5])", "result = [[float(t.get_text()) for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [[2.5, 3.5, 4.0, 5.0], [1, 2, 3, 1]], { show: "rating_chart([4.0, 3.5, 4.0, 5.0, 2.5, 4.0, 3.5])" }),
          figCheck("order-hidden", "Works for other ratings (tied counts, a single value)", "", "rating_chart([0.5, 5.0, 3.0, 5.0, 0.5])", "result = [[float(t.get_text()) for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [[0.5, 3.0, 5.0], [2, 1, 2]], { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-16",
    version: 2,
    slug: "mark-outlier-rows",
    title: "Mark outlier rows for review",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "bitwise", "comparison", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-copy", "list-index", "list-literal", "list-mutate", "pd-dist", "pd-filter", "pd-frame", "pd-missing", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "Write `mark_outliers(table, column)`: return a **new** DataFrame with an extra boolean column `outlier` that is True for rows whose `column` value is outside the 1.5 × IQR fences (pandas' default quantiles; values exactly on a fence are not outliers). Rows with a missing value are not outliers. The caller's DataFrame must not change.",
    spec: [
      ["Function", "`mark_outliers(table, column)`"],
      ["Returns", "a new DataFrame: the same rows and columns plus `outlier`"],
    ],
    hiddenKinds: ["a missing value", "outliers on both sides", "no outliers"],
    hints: [
      "Compute the quartiles of the column, then the two fences.",
      "A mask outside either fence is the new column.",
      "Comparisons with a missing value are False, which gives the rule you need; add the column on a copy.",
    ],
    explanation: "The quartiles (`quantile(0.25)`, `quantile(0.75)`) skip missing values; the fences are 1.5 IQR beyond them. `(col < low) | (col > high)` is False for NaN, so gaps are not flagged. `assign` (or a copy) leaves the caller's table as it was.",
    code: {
      starter: src`
import pandas as pd

def mark_outliers(table, column):
    return table

delays = pd.DataFrame({"flight": ["UA2017", "MQ3443", "AA2748"], "arrival_delay": [-4, 12, 167]})
print(mark_outliers(delays, "arrival_delay"))
`,
      answer: src`
import pandas as pd

def mark_outliers(table, column):
    values = table[column]
    q1, q3 = values.quantile(0.25), values.quantile(0.75)
    spread = q3 - q1
    outside = (values < q1 - 1.5 * spread) | (values > q3 + 1.5 * spread)
    return table.assign(outlier=outside)

delays = pd.DataFrame({"flight": ["UA2017", "MQ3443", "AA2748"], "arrival_delay": [-4, 12, 167]})
print(mark_outliers(delays, "arrival_delay"))
`,
      alternatives: [
        src`
import pandas as pd

def mark_outliers(table, column):
    result = table.copy()
    q1 = result[column].quantile(0.25)
    q3 = result[column].quantile(0.75)
    fence = 1.5 * (q3 - q1)
    result["outlier"] = ~result[column].between(q1 - fence, q3 + fence) & result[column].notna()
    return result
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def mark_outliers(table, column):
    values = table[column]
    q1, q3 = values.quantile(0.25), values.quantile(0.75)
    spread = q3 - q1
    table["outlier"] = (values < q1 - 1.5 * spread) | (values > q3 + 1.5 * spread)
    return table
`,
          fails: ["keeps-input"],
          why: "the flags are right, but they are added to the caller's DataFrame",
        },
        {
          code: src`
import pandas as pd

def mark_outliers(table, column):
    values = table[column]
    q1, q3 = values.quantile(0.25), values.quantile(0.75)
    outside = (values < q1) | (values > q3)
    return table.assign(outlier=outside)
`,
          fails: ["rows", "rows-hidden"],
          why: "everything outside the middle half is flagged, not just values beyond the fences",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          frameRows("rows", "mark_outliers() flags values beyond the fences", "mark_outliers(_df, 'arrival_delay')", [
            { flight: "UA2017", arrival_delay: -4, outlier: false },
            { flight: "MQ3443", arrival_delay: 12, outlier: false },
            { flight: "DL1270", arrival_delay: -25, outlier: false },
            { flight: "AA1214", arrival_delay: -3, outlier: false },
            { flight: "MQ3615", arrival_delay: 42, outlier: false },
            { flight: "AA2748", arrival_delay: 167, outlier: true },
          ], { setup: frameSetup([
            { flight: "UA2017", arrival_delay: -4 }, { flight: "MQ3443", arrival_delay: 12 }, { flight: "DL1270", arrival_delay: -25 },
            { flight: "AA1214", arrival_delay: -3 }, { flight: "MQ3615", arrival_delay: 42 }, { flight: "AA2748", arrival_delay: 167 },
          ]), show: "mark_outliers(delays, 'arrival_delay')", compare: loose }),
          frameRows("rows-hidden", "Works for other tables (a missing value, outliers on both sides)", "mark_outliers(_df, 'runtime_min')", [
            { title: "A", runtime_min: 100, outlier: false },
            { title: "B", runtime_min: 10, outlier: true },
            { title: "C", runtime_min: 101, outlier: false },
            { title: "D", runtime_min: null, outlier: false },
            { title: "E", runtime_min: 102, outlier: false },
            { title: "F", runtime_min: 400, outlier: true },
            { title: "G", runtime_min: 99, outlier: false },
          ], { hidden: true, compare: loose, setup: frameSetup([
            { title: "A", runtime_min: 100 }, { title: "B", runtime_min: 10 }, { title: "C", runtime_min: 101 }, { title: "D", runtime_min: null },
            { title: "E", runtime_min: 102 }, { title: "F", runtime_min: 400 }, { title: "G", runtime_min: 99 },
          ]) }),
          { kind: "expr", id: "keeps-input", label: "mark_outliers() leaves the caller's DataFrame unchanged", expr: `${frameSetup([{ flight: "UA2017", arrival_delay: -4 }, { flight: "AA2748", arrival_delay: 167 }])}\nmark_outliers(_df, "arrival_delay")\nresult = [str(c) for c in _df.columns]`, expected: pv(["flight", "arrival_delay"]) },
        ],
      },
    },
  },
  {
    id: "PY-Q44-19",
    version: 2,
    slug: "review-a-bar-chart",
    title: "Review a bar chart before it is published",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["any-call", "arithmetic", "assignment", "boolean", "comp-if", "comparison", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "module-file", "mpl-axes", "print-call", "range-call", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "A reporting team checks every bar chart before publishing. Write `chart_problems(fig)`: inspect the first Axes of the Figure and return a list of the problems found, in this order: `\"no title\"` (empty title), `\"no y label\"` (empty y label), `\"bars not sorted\"` (heights not from largest to smallest), `\"y axis does not start at 0\"` (the bottom of the y-axis is above 0). A clean chart gives `[]`.",
    spec: [
      ["Function", "`chart_problems(fig)`"],
      ["Reads", "`ax.get_title()`, `ax.get_ylabel()`, `ax.patches` heights, `ax.get_ylim()`"],
      ["Returns", "a list of problem texts in the stated order"],
    ],
    hiddenKinds: ["a chart with every problem", "equal bars next to each other", "a clean chart with negative bars"],
    hints: [
      "Everything you need is a method or attribute of the first Axes.",
      "Sorted from largest to smallest means each height is at least the next one.",
      "`get_ylim()` returns (bottom, top); only a bottom above 0 is a problem.",
    ],
    explanation: "The Axes holds everything: `get_title()` and `get_ylabel()` are empty strings when unset; the bar heights come from `patches`; `get_ylim()[0]` is where the y-axis starts. Checking each rule in the stated order and appending its text gives a stable report a person can act on.",
    code: {
      starter: src`
import matplotlib.pyplot as plt

def chart_problems(fig):
    return []

fig, ax = plt.subplots()
ax.bar(["web", "app", "phone"], [429.63, 128.56, 54.55])
ax.set_ylim(bottom=50)
print(chart_problems(fig))
`,
      answer: src`
import matplotlib.pyplot as plt

def chart_problems(fig):
    ax = fig.axes[0]
    problems = []
    if not ax.get_title():
        problems.append("no title")
    if not ax.get_ylabel():
        problems.append("no y label")
    heights = [p.get_height() for p in ax.patches]
    if any(heights[i] < heights[i + 1] for i in range(len(heights) - 1)):
        problems.append("bars not sorted")
    if ax.get_ylim()[0] > 0:
        problems.append("y axis does not start at 0")
    return problems

fig, ax = plt.subplots()
ax.bar(["web", "app", "phone"], [429.63, 128.56, 54.55])
ax.set_ylim(bottom=50)
print(chart_problems(fig))
`,
      alternatives: [
        src`
def chart_problems(fig):
    ax = fig.axes[0]
    heights = [bar.get_height() for bar in ax.patches]
    checks = [
        ("no title", ax.get_title() == ""),
        ("no y label", ax.get_ylabel() == ""),
        ("bars not sorted", heights != sorted(heights, reverse=True)),
        ("y axis does not start at 0", ax.get_ylim()[0] > 0),
    ]
    return [text for text, failed in checks if failed]
`,
      ],
      wrong: [
        {
          code: src`
def chart_problems(fig):
    ax = fig.axes[0]
    problems = []
    if not ax.get_title():
        problems.append("no title")
    if not ax.get_ylabel():
        problems.append("no y label")
    heights = [p.get_height() for p in ax.patches]
    if heights != sorted(heights):
        problems.append("bars not sorted")
    if ax.get_ylim()[0] > 0:
        problems.append("y axis does not start at 0")
    return problems
`,
          fails: ["clean", "messy", "problems-hidden"],
          why: "it expects smallest first, so a correctly sorted chart is reported",
        },
        {
          code: src`
def chart_problems(fig):
    ax = fig.axes[0]
    problems = []
    if not ax.get_title():
        problems.append("no title")
    if not ax.get_ylabel():
        problems.append("no y label")
    heights = [p.get_height() for p in ax.patches]
    if heights != sorted(heights, reverse=True):
        problems.append("bars not sorted")
    if ax.get_ylim()[0] != 0:
        problems.append("y axis does not start at 0")
    return problems
`,
          fails: ["problems-hidden"],
          why: "a chart with negative bars correctly starts below 0, but `!= 0` reports it",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          { kind: "expr", id: "clean", label: "A clean chart has no problems", show: "a sorted, titled, labelled bar chart", expr: `${chartFig(["web", "app", "phone"], [429.63, 128.56, 54.55], "Web leads", "Revenue (USD)", null)}\nresult = chart_problems(_f)`, expected: pv([]) },
          { kind: "expr", id: "messy", label: "Problems are reported in order", show: "an untitled chart with a raised y-axis", expr: `${chartFig(["web", "app", "phone"], [429.63, 128.56, 54.55], "", "Revenue (USD)", 50)}\nresult = chart_problems(_f)`, expected: pv(["no title", "y axis does not start at 0"]) },
          { kind: "expr", id: "problems-hidden", label: "Works for other charts (every problem, equal neighbours, negative bars)", hidden: true, expr: `${chartFig(["a", "b"], [1, 5], "", "", 0.5)}\n_r1 = chart_problems(_f)\n${chartFig(["a", "b", "c"], [5, 5, 2], "T", "Y", null)}\n_r2 = chart_problems(_f)\n${chartFig(["AA", "DL", "OO"], [39.75, 14.5, -22.0], "Delays", "Minutes", null)}\nresult = [_r1, _r2, chart_problems(_f)]`, expected: pv([["no title", "no y label", "bars not sorted", "y axis does not start at 0"], [], []]) },
        ],
      },
    },
  },
  {
    id: "PY-Q44-20",
    version: 2,
    slug: "freedman-diaconis-bins",
    title: "Choose a histogram's bin count from the data",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["aggregate-call", "arithmetic", "assignment", "comp-if", "comparison", "conversion", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-literal", "logical", "membership", "none-value", "np-array", "np-reduce", "np-stats", "pd-dist", "pd-frame", "pd-missing", "precedence", "print-call", "print-several", "top-level-indent", "tuple-unpack"],
    packages: PDMPL,
    prompt: "The Freedman–Diaconis rule picks a bin width from the data: width = 2 × IQR ÷ n^(1/3), where n is the number of values and IQR uses pandas' default quantiles. Write `fd_bins(values)`: return the number of bins, the range (max − min) divided by that width, **rounded up**, and at least 1. If the IQR is 0 (or there are fewer than 2 values), return 1. Ignore missing values (`None`).",
    spec: [
      ["Function", "`fd_bins(values)`"],
      ["Returns", "an int ≥ 1"],
    ],
    hiddenKinds: ["an IQR of 0", "missing values", "a single value", "a wide spread with a few values"],
    hints: [
      "Drop the missing values, then count what is left.",
      "Compute the quartiles, the width, and the range in that order.",
      "Rounding up a division is `math.ceil`; guard the cases where the width would be 0.",
    ],
    explanation: "After dropping gaps, the width is 2 × (q3 − q1) / n^(1/3). Dividing the range by it and rounding up gives enough bins to cover every value. A zero IQR would divide by zero, so that case (and a single value) returns 1. The rule adapts to the data: more values or a tighter middle half give narrower bins.",
    code: {
      starter: src`
import math
import pandas as pd

def fd_bins(values):
    return 1

print(fd_bins([107, 107, 87, 108, 133, 117, 79, 124, 69, 95, 126, 99, 95, 75, 134, 104]))
`,
      answer: src`
import math
import pandas as pd

def fd_bins(values):
    data = pd.Series(values, dtype=float).dropna()
    if len(data) < 2:
        return 1
    iqr = data.quantile(0.75) - data.quantile(0.25)
    if iqr == 0:
        return 1
    width = 2 * iqr / len(data) ** (1 / 3)
    return max(1, math.ceil((data.max() - data.min()) / width))

print(fd_bins([107, 107, 87, 108, 133, 117, 79, 124, 69, 95, 126, 99, 95, 75, 134, 104]))
`,
      alternatives: [
        src`
import math
import numpy as np

def fd_bins(values):
    data = np.array([v for v in values if v is not None], dtype=float)
    if data.size < 2:
        return 1
    q1, q3 = np.percentile(data, [25, 75])
    if q3 == q1:
        return 1
    width = 2 * (q3 - q1) / data.size ** (1 / 3)
    return max(1, int(math.ceil((data.max() - data.min()) / width)))
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def fd_bins(values):
    data = pd.Series(values, dtype=float).dropna()
    if len(data) < 2:
        return 1
    iqr = data.quantile(0.75) - data.quantile(0.25)
    if iqr == 0:
        return 1
    width = 2 * iqr / len(data) ** (1 / 3)
    return max(1, int((data.max() - data.min()) / width))
`,
          fails: ["returns"],
          why: "`int()` rounds down, so the last values can fall outside the bins",
        },
        {
          code: src`
import math
import pandas as pd

def fd_bins(values):
    data = pd.Series(values, dtype=float).dropna()
    if len(data) < 2:
        return 1
    iqr = data.quantile(0.75) - data.quantile(0.25)
    if iqr == 0:
        return 1
    width = 2 * iqr / len(data) ** 1 / 3
    return max(1, math.ceil((data.max() - data.min()) / width))
`,
          fails: ["returns"],
          why: "without parentheses `n ** 1 / 3` is n divided by 3, not the cube root",
        },
      ],
      task: {
        packages: PDMPL,
        checks: [
          fn("returns", "fd_bins", [
            example([[107, 107, 87, 108, 133, 117, 79, 124, 69, 95, 126, 99, 95, 75, 134, 104]], 4),
            example([[1, 2, 3, 4, 5, 6, 7, 8]], 2),
            example([[5, 5, 5, 5]], 1),
            hiddenCase("missing values", [[1, null, 2, 3, null, 4, 5, 6, 7, 8]], 2),
            hiddenCase("a single value", [[42]], 1),
            hiddenCase("a wide spread with a few values", [[0, 1, 2, 3, 100]], 43),
          ], { label: "fd_bins() applies the Freedman-Diaconis rule" }),
        ],
      },
    },
  },
  {
    id: "PY-Q44-22",
    version: 2,
    slug: "story-chart-predict",
    title: "A computed title and highlight colours",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["aggregate-call", "assignment", "boolean", "comparison", "conditional-expr", "conversion", "dict-literal", "import-alias", "import-module", "list-comp", "list-literal", "membership", "np-dtype", "np-reduce", "pd-frame", "pd-loc", "print-call", "print-text", "string-format", "unquoted-name"],
    packages: PDMPL,
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Sort first: the order of the colours follows the sorted values.",
      "Only values above the target get the highlight colour.",
      "`:.0%` multiplies by 100 and rounds to a whole number.",
    ],
    explanation: "Sorted from largest, the airlines are AA, MQ, DL, UA. Two of them (39.75 and 27.0) are above 15, so the first two colours are red. The share is 2 / 4 = 50%.",
    predict: {
      program: src`
import pandas as pd

delays = pd.Series({"DL": 14.5, "AA": 39.75, "UA": -4.0, "MQ": 27.0}).sort_values(ascending=False)
colours = ["red" if d > 15 else "gray" for d in delays]
late = int((delays > 15).sum())
print(delays.index.tolist())
print(colours)
print(f"{late} of {len(delays)} ({late / len(delays):.0%}) airlines are late on average")
`,
      output: "['AA', 'MQ', 'DL', 'UA']\n['red', 'red', 'gray', 'gray']\n2 of 4 (50%) airlines are late on average\n",
      wrongPredictions: ["['DL', 'AA', 'UA', 'MQ']\n['gray', 'red', 'gray', 'red']\n2 of 4 (50%) airlines are late on average", "['AA', 'MQ', 'DL', 'UA']\n['red', 'red', 'red', 'gray']\n3 of 4 (75%) airlines are late on average", "['AA', 'MQ', 'DL', 'UA']\n['red', 'red', 'gray', 'gray']\n2 of 4 (0.50%) airlines are late on average", "['UA', 'DL', 'MQ', 'AA']\n['gray', 'gray', 'red', 'red']\n2 of 4 (50%) airlines are late on average"],
    },
  },
];
