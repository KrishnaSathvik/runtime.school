/**
 * M44 Visualization & EDA: five lessons (PY-L44-01 … PY-L44-05).
 *
 * matplotlib figures and Axes, charts drawn from DataFrames with pandas plotting, choosing the chart for the question,
 * distributions (histograms, quantiles, the IQR rule), and charts that make one point clearly. The data is real:
 * Runtime Films (R02) runtimes, budgets and revenues; Runtime Market (R01) revenue; NOAA weather (D07); US flight
 * delays (D13).
 *
 * Charts are graded by inspecting the objects the learner's function returns: the Axes' bars (patches), lines,
 * scatter points (collections), tick labels, titles, axis labels, colours and reference lines. Nothing is graded by
 * a printed "chart created" message. seaborn is not installed in the course's browser Python, so the former seaborn
 * lesson now teaches pandas' own plotting (DataFrame.plot), which draws with matplotlib; it does not claim to teach
 * seaborn.
 * Version 2: rewritten; saved progress from version 1 does not count as mastery.
 */
import type { PyPackage } from "@/engine/python/client";
import type { PyLesson } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { pv } from "../fn-checks";
import { frameSetup } from "./M43";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const MPL = ["matplotlib"] as const satisfies readonly PyPackage[];
export const PDMPL = ["pandas", "matplotlib"] as const satisfies readonly PyPackage[];
const loose = { numbers: "int-float-equal" } as const;

/** A check that calls the learner's function and inspects the returned figure with `body` (which sets `result`). */
export const figCheck = (id: string, label: string, setup: string, call: string, body: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: `import matplotlib as _mpl\n${setup}\n_fig = ${call}\n_ax = _fig.axes[0]\n${body}`,
  expected: pv(expected),
  compare: loose,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
/** Common inspections. */
export const HEIGHTS = "result = [float(p.get_height()) for p in _ax.patches]";
export const TICKS = "result = [t.get_text() for t in _ax.get_xticklabels()]";
export const TITLE = "result = _ax.get_title()";

const films = [
  { title: "The Country of Glass", release_year: 2015, runtime_min: 87, budget_usd: 41100000, revenue_usd: 105800000 },
  { title: "The Harbor on Fire", release_year: 1996, runtime_min: 133, budget_usd: 43100000, revenue_usd: 207400000 },
  { title: "The Island at Dawn", release_year: 2014, runtime_min: 117, budget_usd: 9800000, revenue_usd: 10700000 },
  { title: "Quiet Orchard", release_year: 2019, runtime_min: 79, budget_usd: 51600000, revenue_usd: 36600000 },
  { title: "Silent Kingdom", release_year: 1987, runtime_min: 107, budget_usd: null, revenue_usd: null },
  { title: "Last Tide", release_year: 2003, runtime_min: 69, budget_usd: 97500000, revenue_usd: 540900000 },
];

export const m44Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L44-01 Matplotlib
  {
    id: "PY-L44-01",
    version: 2,
    slug: "figures-and-axes",
    title: "Figures and axes with matplotlib",
    lede: "A matplotlib chart is a Figure holding one or more Axes. You draw on an Axes with methods such as bar and plot, label it, and can inspect everything you drew.",
    focus: "Create a Figure and Axes with plt.subplots, draw bars and lines, label the chart, and read back what was drawn.",
    minutes: 18,
    objectives: [
      "Create a chart with `fig, ax = plt.subplots()` and draw on it with `ax.bar` and `ax.plot`",
      "Give it a title, axis labels and a legend with `set_title`, `set_xlabel`, `set_ylabel`, `legend`",
      "Inspect a chart's bars (`ax.patches`), lines (`ax.get_lines()`) and labels, the way a test checks a chart",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comment", "conversion", "dict-get", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "module-file", "none-value", "np-dtype", "np-reduce", "pd-frame", "pd-group", "pd-time", "print-call", "print-text", "reassignment", "string-index", "string-method", "top-level-indent", "try-except", "tuple-unpack"],
    teaches: ["mpl-axes"],
    packages: MPL,
    blocks: [
      {
        kind: "text",
        md: "A table of monthly revenue is hard to scan; a bar chart shows at a glance which month stood out. **matplotlib** draws charts in Python. A chart lives in a **Figure** (the whole image) that holds one or more **Axes** (one plotting area each, with its own x- and y-axis). `fig, ax = plt.subplots()` makes one of each. Every drawing call is a method of the Axes: `ax.bar(labels, heights)` draws bars, `ax.plot(x, y)` a line. `plt.show()` displays the figure (here, below the program's output).\n\nEverything you draw becomes an object you can read back: each bar is a rectangle in `ax.patches`, each line is in `ax.get_lines()`. That is how this course checks your charts, and how you can test your own.",
      },
      {
        kind: "example",
        title: "Revenue per month as bars",
        code: src`
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
revenue = [127.31, 55.72, 246.6, 54.55, 17.75, 103.32]   # Runtime Market sample, 2024
fig, ax = plt.subplots()
ax.bar(months, revenue)
ax.set_title("Revenue by month, first half of 2024")
ax.set_xlabel("Month")
ax.set_ylabel("Revenue (USD)")
print(len(ax.patches), ax.patches[2].get_height())
print(ax.get_title(), "|", ax.get_ylabel())
print([t.get_text() for t in ax.get_xticklabels()])
plt.show()
`,
        output: "6 246.6\nRevenue by month, first half of 2024 | Revenue (USD)\n['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']\n",
        note: "Six labels gave six bars; the third is March at 246.6. Text labels on the x-axis are placed in the order given, so the order of your lists is the order on the chart.",
      },
      {
        kind: "error-example",
        title: "Calling the title instead of setting it",
        code: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.bar(["Jan", "Feb"], [127.31, 55.72])
ax.title("Revenue")
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: 'Text' object is not callable`. On an Axes, `ax.title` is the title's text object; the method is `ax.set_title(...)`. (Shortcuts such as `plt.title` exist for the current chart, but the Axes methods say exactly which chart you mean.)",
      },
      {
        kind: "example",
        title: "Highs and lows as two lines",
        code: src`
import matplotlib.pyplot as plt

days = ["Jan 1", "Jan 2", "Jan 3", "Jan 4", "Jan 5"]
tmax = [-0.5, 6.7, 9.4, 7.2, 1.7]     # Wichita, NOAA GHCN-Daily
tmin = [-5.5, -4.9, -4.9, -2.1, 0.0]
fig, ax = plt.subplots()
ax.plot(days, tmax, label="high", marker="o")
ax.plot(days, tmin, label="low", marker="o")
ax.set_ylabel("Temperature (C)")
ax.legend()
lines = ax.get_lines()
print([line.get_label() for line in lines])
print([float(v) for v in lines[1].get_ydata()])
print(ax.get_legend() is not None)
plt.show()
`,
        output: "['high', 'low']\n[-5.5, -4.9, -4.9, -2.1, 0.0]\nTrue\n",
        note: "Each `plot` call adds one line; `label=` names it and `ax.legend()` shows the names. `marker=\"o\"` draws a dot at each reading.",
      },
      {
        kind: "text",
        md: "**When to use it:** any chart. Make the Figure and Axes yourself and pass the Axes around, so a function can draw on an Axes it is given or return the Figure it made. **Mistakes to avoid:** `ax.title(...)` for `ax.set_title(...)`; unlabeled axes and missing units; lists of labels and values that don't line up; and drawing with `plt.*` shortcuts inside a function, which draw on whatever chart happens to be current.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A rain chart that says what it shows",
      prompt: "`rain_chart` draws the right bars but the chart has no title. Give it the title `Daily rainfall (mm)`.",
      spec: [
        ["Function", "`rain_chart(days, rain)`"],
        ["Returns", "the Figure, with one bar per day and the title `Daily rainfall (mm)`"],
      ],
      starter: src`
import matplotlib.pyplot as plt

def rain_chart(days, rain):
    fig, ax = plt.subplots()
    ax.bar(days, rain)
    return fig

fig = rain_chart(["Jan 5", "Jan 6", "Jan 7"], [0.0, 14.7, 2.3])
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt

def rain_chart(days, rain):
    fig, ax = plt.subplots()
    ax.bar(days, rain)
    ax.set_title("Daily rainfall (mm)")
    return fig

fig = rain_chart(["Jan 5", "Jan 6", "Jan 7"], [0.0, 14.7, 2.3])
plt.show()
`,
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def rain_chart(days, rain):
    fig, ax = plt.subplots()
    ax.set_title("Daily rainfall (mm)")
    return fig
`,
          fails: ["bars"],
          why: "the title is there, but no bars are drawn",
        },
      ],
      hints: ["The bars are already right.", "One Axes method sets the title.", "Call it before returning the figure."],
      task: {
        packages: MPL,
        checks: [
          figCheck("bars", "rain_chart() draws one bar per day", "", "rain_chart(['Mon', 'Tue', 'Wed'], [0.0, 11.4, 27.2])", HEIGHTS, [0, 11.4, 27.2]),
          figCheck("title", "The chart is titled Daily rainfall (mm)", "", "rain_chart(['Mon'], [0.5])", TITLE, "Daily rainfall (mm)"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Highs and lows on one chart",
        prompt: "Write `temperature_chart(days, tmax, tmin)`: return a Figure with one Axes showing two lines over `days`: the highs labelled `high`, then the lows labelled `low`, with a legend, the y-axis label `Temperature (C)` and the title `Daily temperatures`.",
        spec: [
          ["Function", "`temperature_chart(days, tmax, tmin)`"],
          ["Returns", "a Figure whose Axes has exactly two lines, in that order"],
          ["Checked", "the lines' labels and values, the legend, the y label and the title"],
        ],
        starter: src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    return fig

fig = temperature_chart(["Jan 1", "Jan 2", "Jan 3"], [22.2, 17.8, 21.7], [5.6, 9.4, 8.9])
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    ax.plot(days, tmax, label="high")
    ax.plot(days, tmin, label="low")
    ax.set_ylabel("Temperature (C)")
    ax.set_title("Daily temperatures")
    ax.legend()
    return fig

fig = temperature_chart(["Jan 1", "Jan 2", "Jan 3"], [22.2, 17.8, 21.7], [5.6, 9.4, 8.9])
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    for values, name in [(tmax, "high"), (tmin, "low")]:
        ax.plot(days, values, label=name, marker="o")
    ax.set(ylabel="Temperature (C)", title="Daily temperatures")
    ax.legend()
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    ax.plot(days, tmax, label="high")
    ax.plot(days, tmin, label="low")
    ax.set_ylabel("Temperature (C)")
    ax.set_title("Daily temperatures")
    return fig
`,
            fails: ["legend"],
            why: "the lines are labelled but no legend is shown, so a reader can't tell them apart",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    ax.plot(days, tmin, label="low")
    ax.plot(days, tmax, label="high")
    ax.set_ylabel("Temperature (C)")
    ax.set_title("Daily temperatures")
    ax.legend()
    return fig
`,
            fails: ["lines", "lines-hidden"],
            why: "the lows are drawn first, so the lines are in the wrong order",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def temperature_chart(days, tmax, tmin):
    fig, ax = plt.subplots()
    ax.bar(days, tmax, label="high")
    ax.bar(days, tmin, label="low")
    ax.set_ylabel("Temperature (C)")
    ax.set_title("Daily temperatures")
    ax.legend()
    return fig
`,
            fails: ["lines", "lines-hidden"],
            why: "bars overlap each other and draw no lines",
          },
        ],
        hints: [
          "One `plot` call per series, each with its own `label`.",
          "The labels only appear on the chart once a legend is drawn.",
          "Axis label and title are separate `set_` methods.",
        ],
        task: {
          packages: MPL,
          checks: [
            figCheck("lines", "Two lines, high then low, with the given values", "", "temperature_chart(['Jan 1', 'Jan 2', 'Jan 3'], [22.2, 17.8, 21.7], [5.6, 9.4, 8.9])", "result = [[l.get_label(), [float(v) for v in l.get_ydata()]] for l in _ax.get_lines()]", [["high", [22.2, 17.8, 21.7]], ["low", [5.6, 9.4, 8.9]]], { show: "temperature_chart(['Jan 1', 'Jan 2', 'Jan 3'], [22.2, 17.8, 21.7], [5.6, 9.4, 8.9])" }),
            figCheck("lines-hidden", "Works for other readings (a single day, freezing temperatures)", "", "temperature_chart(['Jan 13'], [-12.1], [-18.8])", "result = [[l.get_label(), [float(v) for v in l.get_ydata()]] for l in _ax.get_lines()]", [["high", [-12.1]], ["low", [-18.8]]], { hidden: true }),
            figCheck("legend", "The chart has a legend", "", "temperature_chart(['a'], [1], [0])", "result = _ax.get_legend() is not None", true),
            figCheck("labels", "The y label and the title are set", "", "temperature_chart(['a'], [1], [0])", "result = [_ax.get_ylabel(), _ax.get_title()]", ["Temperature (C)", "Daily temperatures"]),
          ],
        },
      },
      {
        id: "c2",
        title: "Revenue by month from raw orders",
        prompt: "Write `monthly_revenue_chart(records)`: from order records (`ordered_at` text `YYYY-MM-DD HH:MM:SS`, `total`), draw one bar per month **in date order**, labelled like `2024-01`, whose height is that month's revenue. Title it `Revenue by month` and return the Figure.",
        spec: [
          ["Function", "`monthly_revenue_chart(records)`"],
          ["Returns", "a Figure: x labels are months in order, bar heights are revenue"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def monthly_revenue_chart(records):
    fig, ax = plt.subplots()
    return fig

orders = [
    {"ordered_at": "2024-02-25 22:28:23", "total": 55.72},
    {"ordered_at": "2024-01-16 13:03:50", "total": 35.84},
    {"ordered_at": "2024-01-21 22:19:23", "total": 91.47},
]
fig = monthly_revenue_chart(orders)
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def monthly_revenue_chart(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "total"])
    month = pd.to_datetime(orders["ordered_at"], format="%Y-%m-%d %H:%M:%S").dt.to_period("M")
    revenue = orders.groupby(month)["total"].sum()
    fig, ax = plt.subplots()
    ax.bar([str(m) for m in revenue.index], revenue.tolist())
    ax.set_title("Revenue by month")
    return fig

orders = [
    {"ordered_at": "2024-02-25 22:28:23", "total": 55.72},
    {"ordered_at": "2024-01-16 13:03:50", "total": 35.84},
    {"ordered_at": "2024-01-21 22:19:23", "total": 91.47},
]
fig = monthly_revenue_chart(orders)
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def monthly_revenue_chart(records):
    totals = {}
    for order in records:
        month = order["ordered_at"][:7]
        totals[month] = totals.get(month, 0) + order["total"]
    months = sorted(totals)
    fig, ax = plt.subplots()
    ax.bar(months, [totals[m] for m in months])
    ax.set_title("Revenue by month")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt
import pandas as pd

def monthly_revenue_chart(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "total"])
    fig, ax = plt.subplots()
    ax.bar(orders["ordered_at"].str[:7].tolist(), orders["total"].tolist())
    ax.set_title("Revenue by month")
    return fig
`,
            fails: ["months", "bars", "bars-hidden"],
            why: "one bar per order, stacked on the same label, instead of one total per month",
          },
          {
            code: src`
import matplotlib.pyplot as plt
import pandas as pd

def monthly_revenue_chart(records):
    orders = pd.DataFrame(records, columns=["ordered_at", "total"])
    month = orders["ordered_at"].str[:7]
    revenue = orders.groupby(month, sort=False)["total"].sum()
    fig, ax = plt.subplots()
    ax.bar(revenue.index.tolist(), revenue.tolist())
    ax.set_title("Revenue by month")
    return fig
`,
            fails: ["months", "bars", "bars-hidden"],
            why: "the months appear in the order the orders came in, not in date order",
          },
        ],
        hints: [
          "This is a groupby problem first and a chart second.",
          "Group by month (a period or the `YYYY-MM` text); grouped keys come out sorted.",
          "Draw one bar per group: labels from the index, heights from the values.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("months", "One bar per month, in date order", "", "monthly_revenue_chart([{'ordered_at': '2024-02-25 22:28:23', 'total': 55.72}, {'ordered_at': '2024-01-16 13:03:50', 'total': 35.84}, {'ordered_at': '2024-01-21 22:19:23', 'total': 91.47}])", TICKS, ["2024-01", "2024-02"], { show: "monthly_revenue_chart(orders)" }),
            figCheck("bars", "Bar heights are each month's revenue", "", "monthly_revenue_chart([{'ordered_at': '2024-02-25 22:28:23', 'total': 55.72}, {'ordered_at': '2024-01-16 13:03:50', 'total': 35.84}, {'ordered_at': '2024-01-21 22:19:23', 'total': 91.47}])", HEIGHTS, [127.31, 55.72]),
            figCheck("bars-hidden", "Works for other orders (months across a year end, a single order)", "", "monthly_revenue_chart([{'ordered_at': '2025-01-02 10:00:00', 'total': 20.0}, {'ordered_at': '2024-12-30 09:00:00', 'total': 10.0}, {'ordered_at': '2024-12-31 23:00:00', 'total': 5.0}])", "result = [[t.get_text() for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [["2024-12", "2025-01"], [15, 20]], { hidden: true }),
            figCheck("title", "The chart is titled Revenue by month", "", "monthly_revenue_chart([{'ordered_at': '2024-03-13 10:01:28', 'total': 246.6}])", TITLE, "Revenue by month"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.bar(["web", "app", "phone"], [429.63, 128.56, 54.55])
ax.plot(["web", "app", "phone"], [4, 3, 1])
print(len(ax.patches), len(ax.get_lines()), len(fig.axes))
`,
        choices: ["3 1 1", "1 1 1", "3 3 1", "3 1 2"],
        answer: 0,
        why: "Each bar is one patch (3); the `plot` call is one line however many points it has; both were drawn on the one Axes.",
      },
      {
        id: "q2",
        prompt: "A common mistake: labels and values that don't line up. What does this print?",
        program: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
try:
    ax.bar(["Jan", "Feb", "Mar"], [127.31, 55.72])
    print(len(ax.patches))
except ValueError:
    print("ValueError")
`,
        choices: ["ValueError", "2", "3", "0"],
        answer: 0,
        why: "Three labels and two heights can't be paired, and matplotlib refuses (`shape mismatch`). Build labels and values from the same rows so they always match.",
      },
      {
        id: "q3",
        prompt: "How can a test check a bar chart that a function returns?",
        choices: ["Read the bars from `fig.axes[0].patches` and compare their heights", "Compare a screenshot pixel by pixel", "Check that the function printed \"chart created\"", "Count how many times `plt.show()` was called"],
        answer: 0,
        why: "Every drawn element is an object on the Axes, so heights, labels and titles can be compared exactly. A printed message proves nothing about the chart.",
      },
    ],
    review: [
      "`fig, ax = plt.subplots()` makes a Figure with one Axes; draw with `ax.bar`, `ax.plot`.",
      "Label with `set_title`, `set_xlabel`, `set_ylabel`, and `legend()` for labelled series.",
      "Drawn elements can be read back: `ax.patches`, `ax.get_lines()`, `ax.get_title()`.",
      "Next: let a DataFrame draw itself onto an Axes.",
    ],
  },

  // ------------------------------------------------------------------ PY-L44-02 charts from DataFrames
  {
    id: "PY-L44-02",
    version: 2,
    slug: "charts-from-dataframes",
    title: "Charts from DataFrames",
    lede: "pandas can draw a DataFrame or Series directly with .plot, using matplotlib underneath: one call turns a pivot table into grouped bars. Pass ax= to choose where it draws.",
    focus: "Plot DataFrames and Series with .plot (kind=, ax=) and arrange several charts in a grid from plt.subplots(nrows, ncols).",
    minutes: 18,
    objectives: [
      "Draw a Series or DataFrame with `.plot(kind=...)` or `.plot.bar()` and `.plot.barh()`, onto a chosen `ax`",
      "Explain how a DataFrame's index and columns become the x-axis and the legend",
      "Lay out several charts with `plt.subplots(nrows, ncols)` and draw one on each Axes",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "conversion", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "import-alias", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "module-file", "mpl-axes", "np-dtype", "np-reduce", "pd-frame", "pd-group", "pd-loc", "pd-pivot", "precedence", "print-call", "print-several", "reassignment", "sort-key", "string-index", "string-slice", "top-level-indent", "tuple-unpack"],
    teaches: ["pd-plot"],
    packages: PDMPL,
    blocks: [
      {
        kind: "text",
        md: "After a `groupby` or `pivot_table` the numbers are already in a DataFrame or Series, labelled. `.plot` draws them with matplotlib in one call: the **index** becomes the x-axis, and each **column** becomes one series (one colour of bar, one line), named in a legend. `kind=` picks the chart (`\"bar\"`, `\"barh\"`, `\"line\"`, `\"hist\"`, `\"scatter\"`), or use the method form `.plot.bar()`. It returns the Axes it drew on; pass `ax=` to draw on one you made.\n\nYou may meet **seaborn**, a separate library built on matplotlib for statistical charts. It isn't installed in this course's browser Python, so the course draws the same kinds of chart with pandas and matplotlib.",
      },
      {
        kind: "example",
        title: "A pivot table as grouped bars",
        code: src`
import matplotlib.pyplot as plt
import pandas as pd

orders = pd.DataFrame({
    "ship_state": ["TX", "CA", "NY", "TX", "NY", "TX"],
    "channel": ["web", "web", "web", "web", "phone", "app"],
    "total": [35.84, 91.47, 55.72, 246.6, 54.55, 39.15],
})
table = orders.pivot_table(index="ship_state", columns="channel", values="total", aggfunc="sum", fill_value=0)
fig, ax = plt.subplots()
drawn = table.plot(kind="bar", ax=ax, title="Revenue by state and channel")
print(drawn is ax, len(ax.patches))
print([t.get_text() for t in ax.get_legend().get_texts()])
print([t.get_text() for t in ax.get_xticklabels()], ax.get_xlabel())
plt.show()
`,
        output: "True 9\n['app', 'phone', 'web']\n['CA', 'NY', 'TX'] ship_state\n",
        note: "Three states × three channels = nine bars, some of height 0. The column names became the legend, the index the x labels, and the index name the x label.",
      },
      {
        kind: "error-example",
        title: "A scatter plot with only one column",
        code: src`
import pandas as pd

films = pd.DataFrame({"budget_musd": [41.1, 43.1, 9.8], "revenue_musd": [105.8, 207.4, 10.7]})
films.plot(kind="scatter", x="budget_musd")
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: scatter requires an x and y column`. A scatter plot pairs two columns, so both `x=` and `y=` are needed.",
      },
      {
        kind: "text",
        md: "`plt.subplots(nrows, ncols)` makes a grid: `axes` is then an array of Axes, one per panel (`axes[0]`, `axes[1]` for one row). Draw each chart on its own Axes with `ax=`. A shared y-axis (`sharey=True`) makes panels comparable.",
      },
      {
        kind: "example",
        title: "Two panels: runtimes and films per decade",
        code: src`
import matplotlib.pyplot as plt
import pandas as pd

films = pd.DataFrame({
    "title": ["The Country of Glass", "The Harbor on Fire", "The Island at Dawn", "Quiet Orchard", "Silent Kingdom", "Last Tide"],
    "release_year": [2015, 1996, 2014, 2019, 1987, 2003],
    "runtime_min": [87, 133, 117, 79, 107, 69],
})
fig, axes = plt.subplots(1, 2)
films["runtime_min"].plot.hist(ax=axes[0], bins=[60, 90, 120, 150], title="Runtime (min)")
decade = films["release_year"] // 10 * 10
decade.value_counts().sort_index().plot.bar(ax=axes[1], title="Films per decade")
print(len(fig.axes), [a.get_title() for a in fig.axes])
print([float(p.get_height()) for p in axes[0].patches])
print([t.get_text() for t in axes[1].get_xticklabels()], [int(p.get_height()) for p in axes[1].patches])
plt.show()
`,
        output: "2 ['Runtime (min)', 'Films per decade']\n[3.0, 2.0, 1.0]\n['1980', '1990', '2000', '2010'] [1, 1, 1, 3]\n",
        note: "`plot.hist` counted runtimes into three 30-minute bins. `value_counts().sort_index()` puts the decades in order before plotting; without `sort_index` they would be in order of frequency.",
      },
      {
        kind: "text",
        md: "**When to use it:** quick charts of tables you already grouped, and anything where index and columns are the chart's labels. Switch to `ax` methods for fine control. **Mistakes to avoid:** plotting an unsorted `value_counts` when the categories have a natural order; forgetting `ax=` (pandas then draws on whichever Axes is current, usually the last one created, not the panel you meant); and plotting a wide table when you meant one column (`df[\"col\"].plot`).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Bars, not lines, for categories",
      prompt: "`channel_chart` draws revenue per channel as a **line**, which suggests the channels have an order. Draw it as bars instead.",
      spec: [
        ["Function", "`channel_chart(revenue)`"],
        ["revenue", "a Series indexed by channel"],
        ["Returns", "the Figure with one bar per channel and no lines"],
      ],
      starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def channel_chart(revenue):
    fig, ax = plt.subplots()
    revenue.plot(kind="line", ax=ax)
    return fig

fig = channel_chart(pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55}))
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def channel_chart(revenue):
    fig, ax = plt.subplots()
    revenue.plot(kind="bar", ax=ax)
    return fig

fig = channel_chart(pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55}))
plt.show()
`,
      alternatives: [
        src`
import matplotlib.pyplot as plt

def channel_chart(revenue):
    fig, ax = plt.subplots()
    revenue.plot.bar(ax=ax)
    return fig
`,
      ],
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def channel_chart(revenue):
    fig, ax = plt.subplots()
    revenue.plot(kind="area", ax=ax)
    return fig
`,
          fails: ["bars"],
          why: "an area chart still joins the channels as if they were a sequence",
        },
      ],
      hints: ["Only the kind of chart changes.", "`kind=` names it.", "Keep `ax=ax` so it draws on the figure you return."],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("bars", "channel_chart() draws one bar per channel and no line", "import pandas as _pd", "channel_chart(_pd.Series({'web': 429.63, 'app': 128.56, 'phone': 54.55}))", "result = [[float(p.get_height()) for p in _ax.patches], len(_ax.get_lines())]", [[429.63, 128.56, 54.55], 0]),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Films per genre as horizontal bars",
        prompt: "Write `genre_chart(genres)`: `genres` is a Series of genre names, one per film. Draw how many films each genre has as **horizontal** bars, most common genre at the **top**, titled `Films per genre`, and return the Figure. (Bars from `barh` are drawn bottom-up.) Genres with the same count are ordered by name, A to Z from the top.",
        spec: [
          ["Function", "`genre_chart(genres)`"],
          ["Returns", "a Figure: one horizontal bar per genre, the longest at the top"],
          ["Checked", "the y labels from top to bottom, the bar lengths, the title"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def genre_chart(genres):
    fig, ax = plt.subplots()
    return fig

fig = genre_chart(pd.Series(["Drama", "Comedy", "Drama", "Thriller", "Drama", "Comedy"]))
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def genre_chart(genres):
    counts = genres.value_counts()
    table = pd.DataFrame({"genre": counts.index, "films": counts.values})
    table = table.sort_values(["films", "genre"], ascending=[True, False])
    fig, ax = plt.subplots()
    table.set_index("genre")["films"].plot.barh(ax=ax, title="Films per genre")
    return fig

fig = genre_chart(pd.Series(["Drama", "Comedy", "Drama", "Thriller", "Drama", "Comedy"]))
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def genre_chart(genres):
    counts = {}
    for g in genres:
        counts[g] = counts.get(g, 0) + 1
    top_down = sorted(counts, key=lambda g: (-counts[g], g))
    bottom_up = top_down[::-1]
    fig, ax = plt.subplots()
    ax.barh(bottom_up, [counts[g] for g in bottom_up])
    ax.set_title("Films per genre")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def genre_chart(genres):
    fig, ax = plt.subplots()
    genres.value_counts().plot.barh(ax=ax, title="Films per genre")
    return fig
`,
            fails: ["order", "order-hidden"],
            why: "`value_counts` puts the most common first, and `barh` draws the first bar at the bottom",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def genre_chart(genres):
    fig, ax = plt.subplots()
    genres.value_counts().sort_values().plot.bar(ax=ax, title="Films per genre")
    return fig
`,
            fails: ["order", "order-hidden"],
            why: "vertical bars: the genres end up on the x-axis",
          },
        ],
        hints: [
          "Count first; then think about which end of the y-axis the first bar goes to.",
          "For `barh` the order you give is bottom to top, so give the smallest count first.",
          "Ties: decide the top-to-bottom order (A to Z), then reverse it for drawing.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("order", "Genres from top to bottom, most films first", "import pandas as _pd", "genre_chart(_pd.Series(['Drama', 'Comedy', 'Drama', 'Thriller', 'Drama', 'Comedy']))", "result = [[t.get_text() for t in _ax.get_yticklabels()][::-1], [float(p.get_width()) for p in _ax.patches][::-1]]", [["Drama", "Comedy", "Thriller"], [3, 2, 1]], { show: "genre_chart(pd.Series(['Drama', 'Comedy', 'Drama', 'Thriller', 'Drama', 'Comedy']))" }),
            figCheck("order-hidden", "Works for other genres (a tie, a single genre)", "import pandas as _pd", "genre_chart(_pd.Series(['Western', 'Animation', 'Animation', 'Western', 'Horror']))", "result = [[t.get_text() for t in _ax.get_yticklabels()][::-1], [float(p.get_width()) for p in _ax.patches][::-1]]", [["Animation", "Western", "Horror"], [2, 2, 1]], { hidden: true }),
            figCheck("title", "The chart is titled Films per genre", "import pandas as _pd", "genre_chart(_pd.Series(['Drama']))", TITLE, "Films per genre"),
          ],
        },
      },
      {
        id: "c2",
        title: "A two-panel order report",
        prompt: "Write `order_report(orders)`: from an orders DataFrame (`channel`, `status`, `total`), return a Figure with **two** Axes side by side. Left: revenue per channel as bars, highest first, titled `Revenue by channel`. Right: number of orders per status as bars, most common first, titled `Orders by status`.",
        spec: [
          ["Function", "`order_report(orders)`"],
          ["Returns", "a Figure with exactly two Axes"],
          ["Checked", "each panel's title, x labels and bar heights"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def order_report(orders):
    fig, axes = plt.subplots(1, 2)
    return fig

orders = pd.DataFrame({
    "channel": ["web", "web", "app", "phone"],
    "status": ["delivered", "returned", "delivered", "delivered"],
    "total": [35.84, 91.47, 64.17, 54.55],
})
fig = order_report(orders)
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def order_report(orders):
    revenue = orders.groupby("channel")["total"].sum().sort_values(ascending=False)
    statuses = orders["status"].value_counts()
    fig, axes = plt.subplots(1, 2)
    revenue.plot.bar(ax=axes[0], title="Revenue by channel")
    statuses.plot.bar(ax=axes[1], title="Orders by status")
    return fig

orders = pd.DataFrame({
    "channel": ["web", "web", "app", "phone"],
    "status": ["delivered", "returned", "delivered", "delivered"],
    "total": [35.84, 91.47, 64.17, 54.55],
})
fig = order_report(orders)
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def order_report(orders):
    fig, (left, right) = plt.subplots(ncols=2)
    revenue = orders.groupby("channel")["total"].sum().sort_values(ascending=False)
    left.bar(revenue.index.tolist(), revenue.tolist())
    left.set_title("Revenue by channel")
    counts = orders["status"].value_counts()
    right.bar(counts.index.tolist(), counts.tolist())
    right.set_title("Orders by status")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def order_report(orders):
    revenue = orders.groupby("channel")["total"].sum()
    statuses = orders["status"].value_counts()
    fig, axes = plt.subplots(1, 2)
    revenue.plot.bar(ax=axes[0], title="Revenue by channel")
    statuses.plot.bar(ax=axes[1], title="Orders by status")
    return fig
`,
            fails: ["left"],
            why: "the channels stay in alphabetical order instead of highest revenue first",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def order_report(orders):
    revenue = orders.groupby("channel")["total"].sum().sort_values(ascending=False)
    statuses = orders["status"].value_counts()
    fig, axes = plt.subplots(1, 2)
    revenue.plot.bar(ax=axes[0], title="Revenue by channel")
    statuses.plot.bar(ax=axes[0], title="Orders by status")
    return fig
`,
            fails: ["left", "right", "left-hidden"],
            why: "both charts are drawn on the left panel and the right one stays empty",
          },
        ],
        hints: [
          "Compute the two Series first: a sorted groupby sum and a count of statuses.",
          "Make a 1 × 2 grid; `axes[0]` is the left panel, `axes[1]` the right.",
          "Pass the right Axes to each `.plot` with `ax=`, along with its title.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            { kind: "expr", id: "left", label: "Left panel: revenue per channel, highest first", show: "order_report(orders).axes[0]", expr: `${frameSetup([{ channel: "web", status: "delivered", total: 35.84 }, { channel: "web", status: "returned", total: 91.47 }, { channel: "app", status: "delivered", total: 64.17 }, { channel: "phone", status: "delivered", total: 54.55 }])}\n_a = order_report(_df).axes[0]\nresult = [_a.get_title(), [t.get_text() for t in _a.get_xticklabels()], [float(p.get_height()) for p in _a.patches]]`, expected: pv(["Revenue by channel", ["web", "app", "phone"], [127.31, 64.17, 54.55]]), compare: loose },
            { kind: "expr", id: "right", label: "Right panel: orders per status, most common first", expr: `${frameSetup([{ channel: "web", status: "delivered", total: 35.84 }, { channel: "web", status: "returned", total: 91.47 }, { channel: "app", status: "delivered", total: 64.17 }, { channel: "phone", status: "delivered", total: 54.55 }])}\n_f = order_report(_df)\n_a = _f.axes[1]\nresult = [len(_f.axes), _a.get_title(), [t.get_text() for t in _a.get_xticklabels()], [float(p.get_height()) for p in _a.patches]]`, expected: pv([2, "Orders by status", ["delivered", "returned"], [3, 1]]), compare: loose },
            { kind: "expr", id: "left-hidden", label: "Works for other orders (a channel that overtakes when orders are added up)", hidden: true, expr: `${frameSetup([{ channel: "app", status: "delivered", total: 30 }, { channel: "web", status: "delivered", total: 50 }, { channel: "app", status: "cancelled", total: 25 }])}\n_a = order_report(_df).axes[0]\nresult = [[t.get_text() for t in _a.get_xticklabels()], [float(p.get_height()) for p in _a.patches]]`, expected: pv([["app", "web"], [55, 50]]), compare: loose },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import matplotlib.pyplot as plt
import pandas as pd

table = pd.DataFrame({"web": [1, 2], "app": [3, 4], "phone": [0, 5]}, index=["CA", "TX"])
ax = table.plot(kind="bar")
print(len(ax.patches), [t.get_text() for t in ax.get_xticklabels()])
`,
        choices: ["6 ['CA', 'TX']", "2 ['CA', 'TX']", "6 ['web', 'app', 'phone']", "3 ['CA', 'TX']"],
        answer: 0,
        why: "Each of the 2 index labels gets one bar per column: 2 × 3 = 6 bars, grouped under CA and TX. The columns go to the legend.",
      },
      {
        id: "q2",
        prompt: "A common mistake: forgetting `ax=` in a two-panel figure. What does this print?",
        program: src`
import matplotlib.pyplot as plt
import pandas as pd

fig, axes = plt.subplots(1, 2)
pd.Series([3, 1], index=["a", "b"]).plot.bar()
print(len(axes[0].patches), len(axes[1].patches))
`,
        choices: ["0 2", "2 0", "0 0", "2 2"],
        answer: 0,
        why: "Without `ax=`, pandas draws on the current Axes, which is the last one `plt.subplots` created: the right panel. The left panel, where you probably wanted it, stays empty.",
      },
      {
        id: "q3",
        prompt: "In `df.plot(kind=\"line\")`, what becomes the x-axis?",
        choices: ["The DataFrame's index", "The first column", "The row numbers, always", "The column names"],
        answer: 0,
        why: "The index supplies the x values and each column is one line, named in the legend.",
      },
    ],
    review: [
      "`df.plot(kind=..., ax=...)` and `series.plot.bar()` draw with matplotlib and return the Axes.",
      "Index → x-axis; columns → series and legend.",
      "`plt.subplots(nrows, ncols)` gives a grid of Axes; draw each panel with `ax=axes[i]`.",
      "Next: which chart answers which question.",
    ],
  },

  // ------------------------------------------------------------------ PY-L44-03 chart selection
  {
    id: "PY-L44-03",
    version: 2,
    slug: "choose-the-chart",
    title: "Choosing the right chart",
    lede: "The question decides the chart: change over time is a line, comparing categories is bars, a relationship between two numbers is a scatter plot, and how values are spread is a histogram.",
    focus: "Pick line, bar, scatter or histogram from the question being asked, and build it so the reader can answer that question.",
    minutes: 18,
    objectives: [
      "Match a question to a chart: trend → line, comparison → bar, relationship → scatter, spread → histogram",
      "Draw a scatter plot with `ax.scatter` and read its points from `ax.collections`",
      "Explain why a line between unordered categories or a bar chart of a long time series misleads",
    ],
    requires: ["arithmetic", "assignment", "bitwise", "boolean", "comment", "conversion", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-index", "list-literal", "membership", "module-file", "mpl-axes", "none-value", "np-dtype", "pd-frame", "pd-missing", "pd-plot", "print-call", "range-call", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    teaches: ["chart-pick"],
    packages: PDMPL,
    blocks: [
      {
        kind: "text",
        md: "A chart answers one question. **Line**: how did a value change over time? The line connects points that have an order. **Bar**: which category is bigger? Bars compare separate things; their lengths start at 0. **Scatter**: do two numbers move together (is a bigger budget a bigger revenue)? Each point is one item. **Histogram**: how are values spread out, where do most fall, are there extremes?\n\nEach kind leaves different objects on the Axes: lines in `ax.get_lines()`, bars in `ax.patches`, scatter points in `ax.collections` (one collection whose `get_offsets()` are the (x, y) pairs).",
      },
      {
        kind: "example",
        title: "Do bigger budgets earn more?",
        code: src`
import matplotlib.pyplot as plt
import pandas as pd

films = pd.DataFrame({
    "title": ["The Country of Glass", "The Harbor on Fire", "The Island at Dawn", "Quiet Orchard", "Last Tide"],
    "budget_usd": [41100000, 43100000, 9800000, 51600000, 97500000],
    "revenue_usd": [105800000, 207400000, 10700000, 36600000, 540900000],
})
budget = films["budget_usd"] / 1e6
revenue = films["revenue_usd"] / 1e6
fig, ax = plt.subplots()
ax.scatter(budget, revenue)
ax.set_xlabel("Budget (million USD)")
ax.set_ylabel("Revenue (million USD)")
points = ax.collections[0].get_offsets()
print(len(points), points[4].tolist())
print(round(budget.corr(revenue), 2))
plt.show()
`,
        output: "5 [97.5, 540.9]\n0.89\n",
        note: "Each film is one point. `corr` (correlation, from −1 to 1) puts a number on what the scatter shows: here a strong positive relationship, with Quiet Orchard as a costly exception. Dividing by `1e6` makes the axis readable.",
      },
      {
        kind: "error-example",
        title: "A scatter plot with unequal columns",
        code: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.scatter([41.1, 43.1, 9.8], [105.8, 207.4])
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: x and y must be the same size`. Every point needs both numbers; drop rows with a missing value in either column first.",
      },
      {
        kind: "example",
        title: "A trend over days: line, not bars",
        code: src`
import matplotlib.pyplot as plt

days = list(range(1, 11))
tmax = [-0.5, 6.7, 9.4, 7.2, 1.7, 5.0, 7.8, 5.6, -0.5, 6.1]   # Wichita, 1 to 10 January 2024
fig, axes = plt.subplots(1, 2, sharey=True)
axes[0].plot(days, tmax, marker="o")
axes[0].set_title("Trend: a line")
axes[1].hist(tmax, bins=[-5, 0, 5, 10])
axes[1].set_title("Spread: a histogram")
print(len(axes[0].get_lines()), len(axes[0].patches), len(axes[1].patches))
print([int(p.get_height()) for p in axes[1].patches])
plt.show()
`,
        output: "1 0 3\n[2, 1, 7]\n",
        note: "The same ten readings answer two questions. The line shows the order of days; the histogram forgets the order and shows that most days were between 5 and 10 °C.",
      },
      {
        kind: "text",
        md: "**Mistakes to avoid:** a line through categories (it implies an order and in-between values that don't exist); bar charts of long time series (a line shows the trend with less ink); pie charts for more than a few parts, or for comparing similar sizes (bars compare lengths far more accurately); and a scatter plot without units on both axes.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A trend deserves a line",
      prompt: "`trend_chart` draws daily highs as bars. The question is how the temperature changed from day to day: draw it as a line instead.",
      spec: [
        ["Function", "`trend_chart(days, values)`"],
        ["Returns", "a Figure with one line through the values and no bars"],
      ],
      starter: src`
import matplotlib.pyplot as plt

def trend_chart(days, values):
    fig, ax = plt.subplots()
    ax.bar(days, values)
    return fig

fig = trend_chart([1, 2, 3, 4], [-0.5, 6.7, 9.4, 7.2])
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt

def trend_chart(days, values):
    fig, ax = plt.subplots()
    ax.plot(days, values)
    return fig

fig = trend_chart([1, 2, 3, 4], [-0.5, 6.7, 9.4, 7.2])
plt.show()
`,
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def trend_chart(days, values):
    fig, ax = plt.subplots()
    ax.scatter(days, values)
    return fig
`,
          fails: ["line"],
          why: "separate points without a line don't show the day-to-day change",
        },
      ],
      hints: ["A trend connects points in order.", "One Axes method draws a line.", "Replace the bar call."],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("line", "trend_chart() draws one line through the values and no bars", "", "trend_chart([1, 2, 3], [5.0, 13.0, 9.0])", "result = [len(_ax.get_lines()), [float(v) for v in _ax.get_lines()[0].get_ydata()] if _ax.get_lines() else [], len(_ax.patches)]", [1, [5, 13, 9], 0]),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Budget against revenue, in millions",
        prompt: "Write `budget_vs_revenue(films)`: from a DataFrame with `budget_usd` and `revenue_usd` (either may be missing), draw a scatter plot with budget on x and revenue on y, both in **millions** of dollars, leaving out films missing either number. Label the axes `Budget (million USD)` and `Revenue (million USD)` and return the Figure.",
        spec: [
          ["Function", "`budget_vs_revenue(films)`"],
          ["Returns", "a Figure with one scatter collection; its points are (budget, revenue) in millions"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def budget_vs_revenue(films):
    fig, ax = plt.subplots()
    return fig

films = pd.DataFrame({"budget_usd": [41100000, None, 9800000], "revenue_usd": [105800000, 4800000, 10700000]})
fig = budget_vs_revenue(films)
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def budget_vs_revenue(films):
    known = films.dropna(subset=["budget_usd", "revenue_usd"])
    fig, ax = plt.subplots()
    ax.scatter(known["budget_usd"] / 1e6, known["revenue_usd"] / 1e6)
    ax.set_xlabel("Budget (million USD)")
    ax.set_ylabel("Revenue (million USD)")
    return fig

films = pd.DataFrame({"budget_usd": [41100000, None, 9800000], "revenue_usd": [105800000, 4800000, 10700000]})
fig = budget_vs_revenue(films)
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def budget_vs_revenue(films):
    both = films["budget_usd"].notna() & films["revenue_usd"].notna()
    millions = films[both][["budget_usd", "revenue_usd"]] / 1_000_000
    fig, ax = plt.subplots()
    millions.plot(kind="scatter", x="budget_usd", y="revenue_usd", ax=ax)
    ax.set_xlabel("Budget (million USD)")
    ax.set_ylabel("Revenue (million USD)")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def budget_vs_revenue(films):
    fig, ax = plt.subplots()
    ax.scatter(films["budget_usd"] / 1e6, films["revenue_usd"] / 1e6)
    ax.set_xlabel("Budget (million USD)")
    ax.set_ylabel("Revenue (million USD)")
    return fig
`,
            fails: ["points", "points-hidden"],
            why: "films with a missing number stay in as points with a nan coordinate",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def budget_vs_revenue(films):
    known = films.dropna(subset=["budget_usd", "revenue_usd"])
    fig, ax = plt.subplots()
    ax.scatter(known["revenue_usd"] / 1e6, known["budget_usd"] / 1e6)
    ax.set_xlabel("Budget (million USD)")
    ax.set_ylabel("Revenue (million USD)")
    return fig
`,
            fails: ["points", "points-hidden"],
            why: "the axes are swapped: revenue is plotted along x",
          },
        ],
        hints: [
          "Drop the films that miss either number first.",
          "Divide both columns by one million before plotting.",
          "Budget is x, revenue is y; then set both axis labels.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("points", "One point per film with both numbers, in millions", frameSetup(films), "budget_vs_revenue(_df)", "result = _ax.collections[0].get_offsets().tolist()", [[41.1, 105.8], [43.1, 207.4], [9.8, 10.7], [51.6, 36.6], [97.5, 540.9]], { show: "budget_vs_revenue(films)" }),
            figCheck("points-hidden", "Works for other films (a missing revenue only, a single film)", frameSetup([{ budget_usd: 33000000, revenue_usd: 132300000 }, { budget_usd: 1100000, revenue_usd: null }]), "budget_vs_revenue(_df)", "result = _ax.collections[0].get_offsets().tolist()", [[33.0, 132.3]], { hidden: true }),
            figCheck("labels", "Both axes are labelled with units", frameSetup(films), "budget_vs_revenue(_df)", "result = [_ax.get_xlabel(), _ax.get_ylabel()]", ["Budget (million USD)", "Revenue (million USD)"]),
          ],
        },
      },
      {
        id: "c2",
        title: "A weather panel: trend above, rain below",
        prompt: "Write `weather_panel(days, tmax, rain)`: return a Figure with **two rows** of Axes sharing the x-axis. Top: the daily highs as a line, titled `High (C)`. Bottom: daily rain as bars, titled `Rain (mm)`. Each question gets the chart that fits it.",
        spec: [
          ["Function", "`weather_panel(days, tmax, rain)`"],
          ["Returns", "a Figure with two Axes: a line on the first, bars on the second"],
        ],
        starter: src`
import matplotlib.pyplot as plt

def weather_panel(days, tmax, rain):
    fig, axes = plt.subplots(2, 1, sharex=True)
    return fig

fig = weather_panel([1, 2, 3, 4], [22.2, 17.8, 21.7, 18.3], [0.0, 0.0, 0.3, 0.0])
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt

def weather_panel(days, tmax, rain):
    fig, axes = plt.subplots(2, 1, sharex=True)
    axes[0].plot(days, tmax)
    axes[0].set_title("High (C)")
    axes[1].bar(days, rain)
    axes[1].set_title("Rain (mm)")
    return fig

fig = weather_panel([1, 2, 3, 4], [22.2, 17.8, 21.7, 18.3], [0.0, 0.0, 0.3, 0.0])
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def weather_panel(days, tmax, rain):
    fig, (top, bottom) = plt.subplots(nrows=2, sharex=True)
    top.plot(days, tmax, marker="o")
    bottom.bar(days, rain)
    top.set_title("High (C)")
    bottom.set_title("Rain (mm)")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def weather_panel(days, tmax, rain):
    fig, axes = plt.subplots(2, 1, sharex=True)
    axes[0].bar(days, tmax)
    axes[0].set_title("High (C)")
    axes[1].plot(days, rain)
    axes[1].set_title("Rain (mm)")
    return fig
`,
            fails: ["top", "bottom", "panels-hidden"],
            why: "the chart types are swapped: temperatures as bars, rain as a line",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def weather_panel(days, tmax, rain):
    fig, ax = plt.subplots()
    ax.plot(days, tmax)
    ax.bar(days, rain)
    ax.set_title("High (C)")
    return fig
`,
            fails: ["top", "bottom", "panels-hidden"],
            why: "both series share one Axes, and the second panel is missing",
          },
        ],
        hints: ["Two rows, one column, one shared x-axis.", "Choose the chart for each question: a trend, and amounts per day.", "Title each Axes separately."],
        task: {
          packages: PDMPL,
          checks: [
            { kind: "expr", id: "top", label: "Top panel: one line of the highs, titled High (C)", show: "weather_panel([1, 2, 3, 4], [22.2, 17.8, 21.7, 18.3], [0.0, 0.0, 0.3, 0.0])", expr: "_f = weather_panel([1, 2, 3, 4], [22.2, 17.8, 21.7, 18.3], [0.0, 0.0, 0.3, 0.0])\n_a = _f.axes[0]\nresult = [_a.get_title(), len(_a.get_lines()), [float(v) for v in _a.get_lines()[0].get_ydata()] if _a.get_lines() else [], len(_a.patches)]", expected: pv(["High (C)", 1, [22.2, 17.8, 21.7, 18.3], 0]), compare: loose },
            { kind: "expr", id: "bottom", label: "Bottom panel: rain as bars, titled Rain (mm)", expr: "_f = weather_panel([1, 2, 3, 4], [22.2, 17.8, 21.7, 18.3], [0.0, 0.0, 0.3, 0.0])\nresult = [len(_f.axes), _f.axes[-1].get_title(), [float(p.get_height()) for p in _f.axes[-1].patches]]", expected: pv([2, "Rain (mm)", [0, 0, 0.3, 0]]), compare: loose },
            { kind: "expr", id: "panels-hidden", label: "Works for other readings (a wet week, a single day)", hidden: true, expr: "_f = weather_panel([1], [-12.1], [27.2])\nresult = [len(_f.axes), [float(v) for v in _f.axes[0].get_lines()[0].get_ydata()] if _f.axes[0].get_lines() else [], [float(p.get_height()) for p in _f.axes[-1].patches]]", expected: pv([2, [-12.1], [27.2]]), compare: loose },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.scatter([87, 133, 117], [105.8, 207.4, 10.7])
ax.plot([80, 140], [0, 300])
print(len(ax.collections), len(ax.get_lines()), len(ax.collections[0].get_offsets()))
`,
        choices: ["1 1 3", "3 1 3", "1 2 3", "0 1 3"],
        answer: 0,
        why: "One `scatter` call makes one collection holding all 3 points; one `plot` call makes one line.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a line through categories. Which chart fits *average delay per airline*?",
        choices: ["Bars, one per airline", "A line from airline to airline", "A scatter of airline against delay", "A histogram of airline names"],
        answer: 0,
        why: "Airlines are separate categories with no order between them, so a line would invent a trend. Bars compare their values.",
      },
      {
        id: "q3",
        prompt: "Which question does a histogram answer?",
        choices: ["How are flight delays spread out, and how many are extreme?", "Did delays grow week by week?", "Which airline has the longest average delay?", "Do longer flights have longer delays?"],
        answer: 0,
        why: "A histogram shows a distribution. The others are a trend (line), a comparison (bars) and a relationship (scatter).",
      },
    ],
    review: [
      "Trend over an ordered axis → line; comparison of categories → bars; relationship of two numbers → scatter; spread → histogram.",
      "Scatter points are in `ax.collections[0].get_offsets()`.",
      "One chart per question; a grid of panels can answer several.",
      "Next: distributions in detail: bins, quantiles and outliers.",
    ],
  },

  // ------------------------------------------------------------------ PY-L44-04 distributions
  {
    id: "PY-L44-04",
    version: 2,
    slug: "distributions-and-outliers",
    title: "Distributions and outliers",
    lede: "Before trusting an average, look at the spread: a histogram counts values per bin, quantiles mark the middle half, and the 1.5 × IQR rule flags values far outside it.",
    focus: "Describe a numeric column's distribution with histograms (bins and counts), describe and quantile, and flag outliers with the IQR rule.",
    minutes: 20,
    objectives: [
      "Count values per bin with `np.histogram` or `ax.hist`, choosing bin edges on purpose",
      "Summarise a column with `describe` and `quantile`, and explain the median and quartiles",
      "Flag outliers with the 1.5 × IQR rule and show them with a box plot",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "comment", "comp-if", "comparison", "conversion", "dict-comp", "dict-literal", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "logical", "membership", "module-file", "mpl-axes", "none-value", "np-array", "np-dtype", "np-index", "np-reduce", "np-stats", "pd-frame", "pd-plot", "precedence", "print-call", "print-several", "range-call", "reassignment", "string-index", "top-level-indent", "tuple-unpack"],
    teaches: ["pd-dist"],
    packages: PDMPL,
    blocks: [
      {
        kind: "text",
        md: "Two columns can share a mean and look nothing alike. **Exploratory data analysis** starts by looking at each column's distribution. A **histogram** splits the range into bins (edges such as 60, 90, 120, 150 make three bins: 60–90, 90–120, 120–150, each including its left edge) and counts the values in each. `np.histogram(values, bins=edges)` returns the counts and the edges; `ax.hist` draws the same bins and returns them too.",
      },
      {
        kind: "example",
        title: "Film runtimes in 30-minute bins",
        code: src`
import matplotlib.pyplot as plt
import numpy as np

runtimes = [107, 107, 87, 108, 133, 117, 79, 124, 69, 95, 126, 99, 95, 75, 134, 104]   # Runtime Films
counts, edges = np.histogram(runtimes, bins=[60, 90, 120, 150])
print(counts.tolist(), edges.tolist())
fig, ax = plt.subplots()
drawn, _, bars = ax.hist(runtimes, bins=[60, 90, 120, 150])
ax.set_xlabel("Runtime (min)")
print(drawn.tolist(), len(bars))
plt.show()
`,
        output: "[4, 8, 4] [60, 90, 120, 150]\n[4.0, 8.0, 4.0] 3\n",
        note: "Half the films run 90 to 120 minutes. `ax.hist` returns the same counts as floats, plus the bar objects.",
      },
      {
        kind: "error-example",
        title: "Bin edges out of order",
        code: src`
import numpy as np

counts, edges = np.histogram([107, 87, 133], bins=[60, 120, 90, 150])
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: bins must increase monotonically`. Edges are boundaries along the number line, so they must be sorted.",
      },
      {
        kind: "text",
        md: "Numbers summarise the same picture. `describe()` gives the count, mean, standard deviation, minimum, the **quartiles** (25%, 50% = median, 75%) and maximum. The middle half of the data lies between the first and third quartile; that width is the **IQR** (interquartile range). A common rule calls a value an **outlier** when it is more than 1.5 × IQR below the first quartile or above the third. It is a rule for *looking closer*, not for deleting: the outlier might be the most important value in the data.",
      },
      {
        kind: "example",
        title: "Which delays are extreme?",
        code: src`
import matplotlib.pyplot as plt
import pandas as pd

delays = pd.Series([-4, 12, -25, -3, 42, -22, -23, 18, 54, 167, 5, -22, -49, 0, -2, 0])   # arrival delays (min), D13
print(delays.describe().round(1).to_dict())
q1, q3 = delays.quantile(0.25), delays.quantile(0.75)
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
print(q1, q3, low, high)
print(delays[(delays < low) | (delays > high)].tolist())
fig, ax = plt.subplots()
ax.boxplot(delays)
plt.show()
`,
        output: "{'count': 16.0, 'mean': 9.2, 'std': 49.2, 'min': -49.0, '25%': -22.0, '50%': -1.0, '75%': 13.5, 'max': 167.0}\n-22.0 13.5 -75.25 66.75\n[167]\n",
        note: "The mean (9 minutes late) is pulled up by one flight 167 minutes late; the median says the typical flight arrived early. The box plot draws the quartiles as a box and the outlier as a separate dot.",
      },
      {
        kind: "text",
        md: "**Mistakes to avoid:** trusting the mean of skewed data; histograms with too few or too many bins (try two or three widths); bins that leave the maximum out (`np.histogram` includes the last edge in the last bin, but a hand-made rule might not); and deleting outliers without a reason that is about the data, not the chart.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Narrower bins",
      prompt: "`runtime_counts` counts runtimes in 30-minute bins from 60 to 150. Use 15-minute bins over the same range instead (60, 75, 90, …, 150).",
      spec: [
        ["Function", "`runtime_counts(runtimes)`"],
        ["Returns", "a list of six counts, one per 15-minute bin from 60 to 150"],
      ],
      starter: src`
import numpy as np

def runtime_counts(runtimes):
    counts, edges = np.histogram(runtimes, bins=[60, 90, 120, 150])
    return counts.tolist()

print(runtime_counts([107, 87, 133, 79, 69, 95]))
`,
      answer: src`
import numpy as np

def runtime_counts(runtimes):
    counts, edges = np.histogram(runtimes, bins=[60, 75, 90, 105, 120, 135, 150])
    return counts.tolist()

print(runtime_counts([107, 87, 133, 79, 69, 95]))
`,
      alternatives: [
        src`
import numpy as np

def runtime_counts(runtimes):
    counts, edges = np.histogram(runtimes, bins=np.arange(60, 151, 15))
    return counts.tolist()
`,
      ],
      wrong: [
        {
          code: src`
import numpy as np

def runtime_counts(runtimes):
    counts, edges = np.histogram(runtimes, bins=6)
    return counts.tolist()
`,
          fails: ["returns"],
          why: "`bins=6` divides the data's own range into six, not 60 to 150",
        },
      ],
      hints: ["Only the bin edges change.", "Seven edges make six bins.", "Start at 60 and step by 15 up to 150."],
      task: {
        packages: PDMPL,
        checks: [
          fn("returns", "runtime_counts", [
            example([[107, 87, 133, 79, 69, 95]], [1, 2, 1, 1, 1, 0]),
            hiddenCase("runtimes on bin edges", [[60, 75, 150]], [1, 1, 0, 0, 0, 1]),
            hiddenCase("long films only", [[140, 145, 136]], [0, 0, 0, 0, 0, 3]),
          ], { label: "runtime_counts() counts runtimes in 15-minute bins" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A runtime histogram with bins of a chosen width",
        prompt: "Write `runtime_histogram(runtimes, width)`: draw a histogram whose bins are `width` minutes wide, starting at the largest multiple of `width` not above the shortest runtime and ending at the first multiple of `width` **above** the longest. Label x `Runtime (min)` and return the Figure.",
        spec: [
          ["Function", "`runtime_histogram(runtimes, width)`"],
          ["Bins", "e.g. runtimes 69…134 with width 30 → edges 60, 90, 120, 150"],
          ["Checked", "each bar's left edge and height, and the x label"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import numpy as np

def runtime_histogram(runtimes, width):
    fig, ax = plt.subplots()
    return fig

fig = runtime_histogram([107, 87, 133, 79, 69, 95], 30)
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import numpy as np

def runtime_histogram(runtimes, width):
    start = min(runtimes) // width * width
    stop = max(runtimes) // width * width + width
    edges = np.arange(start, stop + 1, width)
    fig, ax = plt.subplots()
    ax.hist(runtimes, bins=edges)
    ax.set_xlabel("Runtime (min)")
    return fig

fig = runtime_histogram([107, 87, 133, 79, 69, 95], 30)
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt
import pandas as pd

def runtime_histogram(runtimes, width):
    values = pd.Series(runtimes)
    edges = list(range(int(values.min()) // width * width, int(values.max()) // width * width + width + 1, width))
    fig, ax = plt.subplots()
    values.plot.hist(ax=ax, bins=edges)
    ax.set_xlabel("Runtime (min)")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def runtime_histogram(runtimes, width):
    fig, ax = plt.subplots()
    ax.hist(runtimes, bins=(max(runtimes) - min(runtimes)) // width)
    ax.set_xlabel("Runtime (min)")
    return fig
`,
            fails: ["bins", "bins-hidden", "label"],
            why: "a number of bins gives widths that depend on the data, with edges that aren't multiples of `width`",
          },
          {
            code: src`
import matplotlib.pyplot as plt
import numpy as np

def runtime_histogram(runtimes, width):
    start = min(runtimes) // width * width
    edges = np.arange(start, max(runtimes), width)
    fig, ax = plt.subplots()
    ax.hist(runtimes, bins=edges)
    ax.set_xlabel("Runtime (min)")
    return fig
`,
            fails: ["bins", "bins-hidden"],
            why: "the last edge stops before the longest runtime, so the longest films are left out",
          },
        ],
        hints: [
          "Work out the first and last edge with whole-number division by the width.",
          "`np.arange` (or `range`) builds the edges; check that the last edge is included.",
          "Pass the edges as `bins=` so every bar is exactly one width.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("bins", "Bins of the given width covering every runtime", "", "runtime_histogram([107, 87, 133, 79, 69, 95], 30)", "result = [[float(p.get_x()) for p in _ax.patches], [float(p.get_height()) for p in _ax.patches]]", [[60, 90, 120], [3, 2, 1]], { show: "runtime_histogram([107, 87, 133, 79, 69, 95], 30)" }),
            figCheck("bins-hidden", "Works for other runtimes (the longest exactly on a multiple, a 10-minute width)", "", "runtime_histogram([90, 95, 100, 120], 10)", "result = [[float(p.get_x()) for p in _ax.patches], [float(p.get_height()) for p in _ax.patches]]", [[90, 100, 110, 120], [2, 1, 0, 1]], { hidden: true }),
            figCheck("label", "The x-axis is labelled Runtime (min)", "", "runtime_histogram([100], 15)", "result = _ax.get_xlabel()", "Runtime (min)"),
          ],
        },
      },
      {
        id: "c2",
        title: "Flag outliers with the IQR rule",
        prompt: "Write `iqr_outliers(values)`: return a dictionary with the first quartile `q1`, third quartile `q3`, the fences `low` = q1 − 1.5 × IQR and `high` = q3 + 1.5 × IQR, and `outliers`: the values strictly outside the fences, in their original order. Use pandas' default quantiles. With fewer than 4 values there is nothing to judge: return `None`.",
        spec: [
          ["Function", "`iqr_outliers(values)`"],
          ["Returns", "`{\"q1\", \"q3\", \"low\", \"high\", \"outliers\"}` or `None`"],
          ["Example", "the 16 delays from the lesson → q1 −22.0, q3 13.5, outliers `[167]`"],
        ],
        starter: src`
import pandas as pd

def iqr_outliers(values):
    return None

print(iqr_outliers([-4, 12, -25, -3, 42, -22, -23, 18, 54, 167, 5, -22, -49, 0, -2, 0]))
`,
        answer: src`
import pandas as pd

def iqr_outliers(values):
    if len(values) < 4:
        return None
    data = pd.Series(values, dtype=float)
    q1 = data.quantile(0.25)
    q3 = data.quantile(0.75)
    spread = q3 - q1
    low = q1 - 1.5 * spread
    high = q3 + 1.5 * spread
    outside = data[(data < low) | (data > high)]
    return {"q1": q1, "q3": q3, "low": low, "high": high, "outliers": outside.tolist()}

print(iqr_outliers([-4, 12, -25, -3, 42, -22, -23, 18, 54, 167, 5, -22, -49, 0, -2, 0]))
`,
        alternatives: [
          src`
import numpy as np

def iqr_outliers(values):
    if len(values) < 4:
        return None
    q1, q3 = np.percentile(values, [25, 75])
    fence = 1.5 * (q3 - q1)
    low, high = q1 - fence, q3 + fence
    return {"q1": q1, "q3": q3, "low": low, "high": high, "outliers": [v for v in values if v < low or v > high]}
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def iqr_outliers(values):
    if len(values) < 4:
        return None
    data = pd.Series(values, dtype=float)
    q1 = data.quantile(0.25)
    q3 = data.quantile(0.75)
    spread = q3 - q1
    low = q1 - 1.5 * spread
    high = q3 + 1.5 * spread
    outside = data[(data < low) | (data > high)]
    return {"q1": q1, "q3": q3, "low": low, "high": high, "outliers": sorted(outside.tolist())}
`,
            fails: ["returns"],
            why: "the outliers are sorted instead of kept in their original order",
          },
          {
            code: src`
import pandas as pd

def iqr_outliers(values):
    if len(values) < 4:
        return None
    data = pd.Series(values, dtype=float)
    mean = data.mean()
    spread = data.std()
    low, high = mean - 2 * spread, mean + 2 * spread
    outside = data[(data < low) | (data > high)]
    return {"q1": data.quantile(0.25), "q3": data.quantile(0.75), "low": low, "high": high, "outliers": outside.tolist()}
`,
            fails: ["returns"],
            why: "fences from the mean and standard deviation are dragged by the very outliers they should catch",
          },
        ],
        hints: [
          "Two quantiles give the box; their difference is the IQR.",
          "The fences are 1.5 IQR beyond each quartile.",
          "Keep values strictly outside the fences, with a mask, in their original order.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            fn("returns", "iqr_outliers", [
              example([[-4, 12, -25, -3, 42, -22, -23, 18, 54, 167, 5, -22, -49, 0, -2, 0]], { q1: -22, q3: 13.5, low: -75.25, high: 66.75, outliers: [167] }),
              example([[1, 2, 3, 4]], { q1: 1.75, q3: 3.25, low: -0.5, high: 5.5, outliers: [] }),
              example([[5, 6]], null),
              hiddenCase("outliers on both sides, out of order", [[100, 10, 11, 12, 13, -80, 14]], { q1: 10.5, q3: 13.5, low: 6.0, high: 18.0, outliers: [100, -80] }),
              hiddenCase("a value exactly on a fence", [[0, 0, 0, 0, 0]], { q1: 0, q3: 0, low: 0, high: 0, outliers: [] }),
              hiddenCase("an empty list", [[]], null),
            ], { label: "iqr_outliers() returns quartiles, fences and outliers", compare: loose }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

counts, edges = np.histogram([60, 75, 89, 90, 150], bins=[60, 90, 120, 150])
print(counts.tolist())
`,
        choices: ["[3, 1, 1]", "[2, 2, 1]", "[3, 1, 0]", "[4, 0, 1]"],
        answer: 0,
        why: "Each bin includes its left edge: 60, 75 and 89 are in 60–90, and 90 starts the next bin. The last bin also includes its right edge, so 150 counts.",
      },
      {
        id: "q2",
        prompt: "A common mistake: judging a typical value by the mean. What does this print?",
        program: src`
import pandas as pd

delays = pd.Series([-5, -3, 0, 2, 4, 180])
print(delays.mean(), delays.median())
`,
        choices: ["29.666666666666668 1.0", "1.0 29.666666666666668", "29.666666666666668 0.0", "30.0 1.0"],
        answer: 0,
        why: "One 180-minute delay pulls the mean to almost 30, while the median, the middle of the sorted values, is 1 minute.",
      },
      {
        id: "q3",
        prompt: "A value is outside the 1.5 × IQR fences. What should you do first?",
        choices: ["Look at the row and find out why it is so far out", "Delete it so the chart looks better", "Replace it with the mean", "Lower the fence so it fits"],
        answer: 0,
        why: "The rule flags values worth a closer look. Some are data errors; others (a real 167-minute delay) are the story.",
      },
    ],
    review: [
      "A histogram counts values per bin; choose the edges on purpose (`np.histogram`, `ax.hist`).",
      "`describe` and `quantile` summarise the spread; the median resists extremes.",
      "1.5 × IQR beyond the quartiles flags outliers to investigate; a box plot shows them.",
      "Next: turn a chart into a clear statement.",
    ],
  },

  // ------------------------------------------------------------------ PY-L44-05 storytelling
  {
    id: "PY-L44-05",
    version: 2,
    slug: "charts-that-make-a-point",
    title: "Charts that make a point",
    lede: "A chart for a report should make its point without a caption: sort the bars, highlight the one that matters, say the finding in the title, and label the values readers need.",
    focus: "Turn a correct chart into an explanatory one: sorted bars, one highlighted colour, a title computed from the data, value labels and a reference line.",
    minutes: 20,
    objectives: [
      "Sort categories so the order itself carries information",
      "Highlight one bar with its own colour and keep the rest neutral",
      "Build the title from the data (an f-string), add value labels with `bar_label` and a target line with `axhline`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "conversion", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-sort", "membership", "module-file", "mpl-axes", "none-value", "np-dtype", "np-reduce", "pd-filter", "pd-frame", "pd-group", "pd-loc", "pd-plot", "precedence", "print-call", "print-text", "reassignment", "string-format", "string-index", "top-level-indent", "tuple-literal", "tuple-unpack", "zip-call"],
    teaches: ["story-title"],
    packages: PDMPL,
    blocks: [
      {
        kind: "text",
        md: "An exploratory chart helps *you* find something; an explanatory chart tells *someone else* what you found. Four habits do most of the work. **Sort** bars so the order means something. **Highlight** the bar the story is about in a strong colour and draw the others in grey. **Say the finding in the title** (\"Web brings in two thirds of revenue\"), computed from the data so it is never stale. **Label** the values readers will quote, with `ax.bar_label(bars)`, and draw targets or limits with `ax.axhline(value)`.",
      },
      {
        kind: "example",
        title: "Which channel brings in the most?",
        code: src`
import matplotlib.colors as mcolors
import matplotlib.pyplot as plt
import pandas as pd

revenue = pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55, "marketplace": 17.75}).sort_values(ascending=False)
share = revenue.iloc[0] / revenue.sum()
colours = ["tab:blue"] + ["lightgray"] * (len(revenue) - 1)
fig, ax = plt.subplots()
bars = ax.bar(revenue.index, revenue.values, color=colours)
ax.bar_label(bars, fmt="%.0f")
ax.set_title(f"{revenue.index[0]} brings in {share:.0%} of revenue")
ax.set_ylabel("Revenue (USD)")
print(ax.get_title())
print([mcolors.to_hex(p.get_facecolor()) for p in ax.patches])
print([t.get_text() for t in ax.texts])
plt.show()
`,
        output: "web brings in 68% of revenue\n['#1f77b4', '#d3d3d3', '#d3d3d3', '#d3d3d3']\n['430', '129', '55', '18']\n",
        note: "The title is built from the numbers, so it stays true when the data changes. `:.0%` formats a share as a whole percentage. `bar_label` writes each bar's value on it; `to_hex` shows the colour of each bar as a hex code.",
      },
      {
        kind: "error-example",
        title: "A colour matplotlib doesn't know",
        code: src`
import matplotlib.pyplot as plt

fig, ax = plt.subplots()
ax.bar(["web", "app"], [429.63, 128.56], color=["tab:blue", "grey50"])
`,
        error: "ValueError",
        output: "",
        note: "matplotlib rejects `grey50` (`ValueError: 'grey50' is not a valid color value`). Use a name it knows (`gray`, `lightgray`, `tab:red`) or a hex code such as `#d3d3d3`.",
      },
      {
        kind: "example",
        title: "Delays against a 15-minute target",
        code: src`
import matplotlib.pyplot as plt
import pandas as pd

delays = pd.Series({"AA": 39.75, "DL": 14.5, "MQ": 27.0, "OO": -22.0, "UA": -4.0}).sort_values(ascending=False)
fig, ax = plt.subplots()
ax.bar(delays.index, delays.values, color=["tab:red" if d > 15 else "lightgray" for d in delays])
target = ax.axhline(15, linestyle="--", color="black")
ax.annotate("on-time limit", xy=(4, 15), xytext=(3.2, 25))
ax.set_title(f"{(delays > 15).sum()} of {len(delays)} airlines averaged more than 15 minutes late")
print(ax.get_title())
print(delays.index.tolist(), list(target.get_ydata()))
plt.show()
`,
        output: "2 of 5 airlines averaged more than 15 minutes late\n['AA', 'MQ', 'DL', 'UA', 'OO'] [15, 15]\n",
        note: "The colour rule comes from the same threshold as the line, so chart and title agree. `axhline` draws a horizontal line across the whole Axes; `annotate` puts a short label next to it.",
      },
      {
        kind: "text",
        md: "**Mistakes to avoid:** a title that only names the axes (\"Revenue by channel\") when the reader needs the finding; a rainbow of colours that highlights nothing; truncated y-axes on bar charts (bars must start at 0, or their lengths lie); and a typed-in number in the title that goes stale when the data changes.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Highlight the biggest bar",
      prompt: "`highlight_top` draws sorted bars, all in grey. Draw the **first** (largest) bar in `tab:red` and keep the others `lightgray`.",
      spec: [
        ["Function", "`highlight_top(values)`"],
        ["values", "a Series already sorted from largest to smallest"],
        ["Returns", "the Figure; the first bar red, the rest light gray"],
      ],
      starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def highlight_top(values):
    fig, ax = plt.subplots()
    ax.bar(values.index, values.values, color="lightgray")
    return fig

fig = highlight_top(pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55}))
plt.show()
`,
      answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def highlight_top(values):
    colours = ["tab:red"] + ["lightgray"] * (len(values) - 1)
    fig, ax = plt.subplots()
    ax.bar(values.index, values.values, color=colours)
    return fig

fig = highlight_top(pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55}))
plt.show()
`,
      wrong: [
        {
          code: src`
import matplotlib.pyplot as plt

def highlight_top(values):
    fig, ax = plt.subplots()
    ax.bar(values.index, values.values, color="tab:red")
    return fig
`,
          fails: ["colours"],
          why: "every bar is red, so nothing stands out",
        },
      ],
      hints: ["`color=` also accepts one colour per bar.", "Build a list: red first, then gray for the rest.", "The list must be as long as the Series."],
      task: {
        packages: PDMPL,
        checks: [
          figCheck("colours", "The first bar is tab:red and the others lightgray", "import pandas as _pd", "highlight_top(_pd.Series({'web': 429.63, 'app': 128.56, 'phone': 54.55, 'marketplace': 17.75}))", "result = [_mpl.colors.to_hex(p.get_facecolor()) for p in _ax.patches]", ["#d62728", "#d3d3d3", "#d3d3d3", "#d3d3d3"]),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The leader, highlighted and named",
        prompt: "Write `leader_chart(names, values)`: draw one bar per name, sorted from largest to smallest value; colour the largest `tab:red` and the others `lightgray`; title the chart `<name> leads with <value>`, the value with one decimal (e.g. `web leads with 429.6`); and return the Figure. Equal values keep the order of `names`.",
        spec: [
          ["Function", "`leader_chart(names, values)`"],
          ["Checked", "bar order and heights, colours, and the title"],
        ],
        starter: src`
import matplotlib.pyplot as plt

def leader_chart(names, values):
    fig, ax = plt.subplots()
    ax.bar(names, values)
    return fig

fig = leader_chart(["phone", "web", "app"], [54.55, 429.63, 128.56])
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def leader_chart(names, values):
    ranked = pd.Series(values, index=names).sort_values(ascending=False, kind="stable")
    colours = ["tab:red"] + ["lightgray"] * (len(ranked) - 1)
    fig, ax = plt.subplots()
    ax.bar(ranked.index, ranked.values, color=colours)
    ax.set_title(f"{ranked.index[0]} leads with {ranked.iloc[0]:.1f}")
    return fig

fig = leader_chart(["phone", "web", "app"], [54.55, 429.63, 128.56])
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def leader_chart(names, values):
    pairs = sorted(zip(names, values), key=lambda p: -p[1])
    labels = [p[0] for p in pairs]
    heights = [p[1] for p in pairs]
    fig, ax = plt.subplots()
    ax.bar(labels, heights, color=["tab:red"] + ["lightgray"] * (len(pairs) - 1))
    ax.set_title("{} leads with {:.1f}".format(labels[0], heights[0]))
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def leader_chart(names, values):
    colours = ["tab:red"] + ["lightgray"] * (len(names) - 1)
    fig, ax = plt.subplots()
    ax.bar(names, values, color=colours)
    ax.set_title(f"{names[0]} leads with {values[0]:.1f}")
    return fig
`,
            fails: ["bars", "title", "bars-hidden"],
            why: "nothing is sorted, so the first name in the input is highlighted and named, not the leader",
          },
          {
            code: src`
import matplotlib.pyplot as plt
import pandas as pd

def leader_chart(names, values):
    ranked = pd.Series(values, index=names).sort_values(ascending=False, kind="stable")
    colours = ["tab:red"] + ["lightgray"] * (len(ranked) - 1)
    fig, ax = plt.subplots()
    ax.bar(ranked.index, ranked.values, color=colours)
    ax.set_title("web leads with 429.6")
    return fig
`,
            fails: ["bars-hidden"],
            why: "a typed-in title is only right for one dataset",
          },
        ],
        hints: [
          "Pair names with values and sort the pairs by value, largest first.",
          "The colour list is the same for any data: one highlight, then gray.",
          "Build the title with an f-string from the first sorted pair; `:.1f` gives one decimal.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("bars", "Bars sorted from largest to smallest", "", "leader_chart(['phone', 'web', 'app'], [54.55, 429.63, 128.56])", "result = [[t.get_text() for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches]]", [["web", "app", "phone"], [429.63, 128.56, 54.55]], { show: "leader_chart(['phone', 'web', 'app'], [54.55, 429.63, 128.56])" }),
            figCheck("colours", "Only the largest bar is highlighted", "", "leader_chart(['phone', 'web', 'app'], [54.55, 429.63, 128.56])", "result = [_mpl.colors.to_hex(p.get_facecolor()) for p in _ax.patches]", ["#d62728", "#d3d3d3", "#d3d3d3"]),
            figCheck("title", "The title names the leader and its value", "", "leader_chart(['phone', 'web', 'app'], [54.55, 429.63, 128.56])", TITLE, "web leads with 429.6"),
            figCheck("bars-hidden", "Works for other data (a tie for first: order and title)", "", "leader_chart(['AS', 'B6', 'F9'], [12.0, 31.25, 31.25])", "result = [[t.get_text() for t in _ax.get_xticklabels()], _ax.get_title()]", [["B6", "F9", "AS"], "B6 leads with 31.2"], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Which airlines miss the on-time target?",
        prompt: "Write `delay_story(flights)`: from a flights DataFrame (`airline_code`, `arrival_delay`, `cancelled` 0/1), compute each airline's average arrival delay over flights that operated, and draw bars sorted from longest to shortest delay. Bars above 15 minutes are `tab:red`, the rest `lightgray`; draw a horizontal line at 15; title the chart `<n> of <total> airlines average more than 15 minutes late`; label y `Average arrival delay (min)`. Return the Figure.",
        spec: [
          ["Function", "`delay_story(flights)`"],
          ["Checked", "bar order and heights, colours, the line at 15, the title and the y label"],
        ],
        starter: src`
import matplotlib.pyplot as plt
import pandas as pd

def delay_story(flights):
    fig, ax = plt.subplots()
    return fig

flights = pd.DataFrame({"airline_code": ["AA", "AA", "DL", "UA"], "arrival_delay": [167, -3, -25, None], "cancelled": [0, 0, 0, 1]})
fig = delay_story(flights)
plt.show()
`,
        answer: src`
import matplotlib.pyplot as plt
import pandas as pd

def delay_story(flights):
    flown = flights[flights["cancelled"] == 0]
    delays = flown.groupby("airline_code")["arrival_delay"].mean().sort_values(ascending=False)
    late = delays > 15
    fig, ax = plt.subplots()
    ax.bar(delays.index, delays.values, color=["tab:red" if x else "lightgray" for x in late])
    ax.axhline(15, linestyle="--", color="black")
    ax.set_title(f"{late.sum()} of {len(delays)} airlines average more than 15 minutes late")
    ax.set_ylabel("Average arrival delay (min)")
    return fig

flights = pd.DataFrame({"airline_code": ["AA", "AA", "DL", "UA"], "arrival_delay": [167, -3, -25, None], "cancelled": [0, 0, 0, 1]})
fig = delay_story(flights)
plt.show()
`,
        alternatives: [
          src`
import matplotlib.pyplot as plt

def delay_story(flights):
    delays = flights.loc[flights["cancelled"] == 0].groupby("airline_code")["arrival_delay"].mean()
    delays = delays.sort_values(ascending=False)
    colours = ["tab:red" if d > 15 else "lightgray" for d in delays]
    fig, ax = plt.subplots()
    delays.plot.bar(ax=ax, color=colours)
    ax.axhline(y=15)
    count = int((delays > 15).sum())
    ax.set_title(f"{count} of {delays.size} airlines average more than 15 minutes late")
    ax.set_ylabel("Average arrival delay (min)")
    return fig
`,
        ],
        wrong: [
          {
            code: src`
import matplotlib.pyplot as plt

def delay_story(flights):
    delays = flights.groupby("airline_code")["arrival_delay"].mean().sort_values(ascending=False)
    late = delays > 15
    fig, ax = plt.subplots()
    ax.bar(delays.index, delays.values, color=["tab:red" if x else "lightgray" for x in late])
    ax.axhline(15, linestyle="--", color="black")
    ax.set_title(f"{late.sum()} of {len(delays)} airlines average more than 15 minutes late")
    ax.set_ylabel("Average arrival delay (min)")
    return fig
`,
            fails: ["bars", "title", "story-hidden"],
            why: "an airline whose only flight was cancelled still gets a (nan) bar and is counted",
          },
          {
            code: src`
import matplotlib.pyplot as plt

def delay_story(flights):
    flown = flights[flights["cancelled"] == 0]
    delays = flown.groupby("airline_code")["arrival_delay"].mean().sort_values(ascending=False)
    late = delays > 15
    fig, ax = plt.subplots()
    ax.bar(delays.index, delays.values, color=["tab:red" if x else "lightgray" for x in late])
    ax.set_title(f"{late.sum()} of {len(delays)} airlines average more than 15 minutes late")
    ax.set_ylabel("Average arrival delay (min)")
    return fig
`,
            fails: ["target"],
            why: "the 15-minute target line is missing",
          },
        ],
        hints: [
          "Average per airline over operated flights only, then sort.",
          "One threshold drives three things: the colours, the line and the count in the title.",
          "`axhline(15)` draws the target; its y data is `[15, 15]`.",
        ],
        task: {
          packages: PDMPL,
          checks: [
            figCheck("bars", "Average delays per operating airline, longest first", frameSetup([{ airline_code: "AA", arrival_delay: 167, cancelled: 0 }, { airline_code: "AA", arrival_delay: -3, cancelled: 0 }, { airline_code: "DL", arrival_delay: -25, cancelled: 0 }, { airline_code: "MQ", arrival_delay: 42, cancelled: 0 }, { airline_code: "UA", arrival_delay: null, cancelled: 1 }]), "delay_story(_df)", "result = [[t.get_text() for t in _ax.get_xticklabels()], [float(p.get_height()) for p in _ax.patches], [_mpl.colors.to_hex(p.get_facecolor()) for p in _ax.patches]]", [["AA", "MQ", "DL"], [82, 42, -25], ["#d62728", "#d62728", "#d3d3d3"]], { show: "delay_story(flights)" }),
            figCheck("target", "A horizontal line at 15 minutes", frameSetup([{ airline_code: "AA", arrival_delay: 5, cancelled: 0 }]), "delay_story(_df)", "result = [list(l.get_ydata()) for l in _ax.get_lines()]", [[15, 15]]),
            figCheck("title", "The title counts the airlines above the target", frameSetup([{ airline_code: "AA", arrival_delay: 167, cancelled: 0 }, { airline_code: "AA", arrival_delay: -3, cancelled: 0 }, { airline_code: "DL", arrival_delay: -25, cancelled: 0 }, { airline_code: "MQ", arrival_delay: 42, cancelled: 0 }, { airline_code: "UA", arrival_delay: null, cancelled: 1 }]), "delay_story(_df)", "result = [_ax.get_title(), _ax.get_ylabel()]", ["2 of 3 airlines average more than 15 minutes late", "Average arrival delay (min)"]),
            figCheck("story-hidden", "Works for other flights (a delay of exactly 15, an airline with only cancellations)", frameSetup([{ airline_code: "B6", arrival_delay: 15, cancelled: 0 }, { airline_code: "NK", arrival_delay: null, cancelled: 1 }, { airline_code: "WN", arrival_delay: 30, cancelled: 0 }]), "delay_story(_df)", "result = [[t.get_text() for t in _ax.get_xticklabels()], _ax.get_title()]", [["WN", "B6"], "1 of 2 airlines average more than 15 minutes late"], { hidden: true }),
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

revenue = pd.Series({"web": 429.63, "app": 128.56, "phone": 54.55})
top = revenue.idxmax()
print(f"{top} brings in {revenue[top] / revenue.sum():.0%} of revenue")
`,
        choices: ["web brings in 70% of revenue", "web brings in 0.70% of revenue", "web brings in 429.63 of revenue", "app brings in 21% of revenue"],
        answer: 0,
        why: "429.63 / 612.74 is about 0.701; the `%` format multiplies by 100 and adds the sign, rounded to a whole percent.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a bar chart whose y-axis doesn't start at 0. Why does it mislead?",
        choices: ["Bar lengths no longer match the values, so small differences look huge", "matplotlib can't draw it", "The bars change colour", "The legend disappears"],
        answer: 0,
        why: "Readers compare bar lengths. Cutting the axis at, say, 400 makes 410 look twice as big as 405.",
      },
      {
        id: "q3",
        prompt: "Why build the title with an f-string from the data?",
        choices: ["So the stated finding stays true when the data changes", "Because matplotlib requires it", "To make the title shorter", "So the chart draws faster"],
        answer: 0,
        why: "A typed-in number goes stale as soon as the data is refreshed; a computed one cannot disagree with the bars.",
      },
    ],
    review: [
      "Sort bars so the order carries meaning; highlight one colour, keep the rest neutral.",
      "State the finding in the title, computed with an f-string from the same data.",
      "`bar_label` adds values, `axhline` draws a target, `annotate` labels a point.",
      "Next (see Data Formats & Analytical Workflows): store and move the data behind these charts: Parquet, chunks, SQL and exports.",
    ],
  },
];
