/**
 * M43 practice: ten independent problems on the pandas transformations of PY-L43-01 … PY-L43-05.
 *
 * Mix: 3 function implementations, 2 data transformations, 1 validation, 2 debugging (an average of daily averages,
 * and a merge that multiplies rows through a duplicated key), 2 output predictions. Easy: 02, 03, 06, 10.
 * Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures are slices of course datasets: D13 (US domestic flights, January 2025: delays, cancellations, airlines) and
 * R01 (Runtime Market orders, customers, order lines). Hidden cases cover ties, cancelled flights, unknown codes,
 * duplicated keys, invalid timestamps and frames that must stay unchanged.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { frameRows, pv } from "../fn-checks";
import { PD } from "../lessons/M42";
import { frameSetup } from "../lessons/M43";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;

const FLIGHTS = `UA,LAS,IAH,2025-01-10 00:59,-4,0
MQ,MCI,MIA,2025-01-10 05:00,12,0
AA,DFW,MIA,2025-01-10 05:01,,1
DL,PDX,SLC,2025-01-10 05:10,-25,0
AA,SLC,DFW,2025-01-10 05:13,-3,0
DL,RDU,ATL,2025-01-10 05:15,,1
MQ,FAR,ORD,2025-01-10 05:15,42,0
OO,PDX,SEA,2025-01-10 05:15,-22,0
AA,BOS,CLT,2025-01-10 05:20,-23,0
AA,BOS,DFW,2025-01-10 05:20,18,0
DL,DFW,DTW,2025-01-10 05:20,54,0
AA,SEA,DFW,2025-01-10 05:22,167,0`;

/** Twelve real flights (D13, 10 January 2025). */
const flights = FLIGHTS.split("\n").map((line) => {
  const [airline_code, origin, destination, scheduled_departure, arrival_delay, cancelled] = line.split(",");
  return { airline_code, origin, destination, scheduled_departure, arrival_delay: arrival_delay === "" ? null : Number(arrival_delay), cancelled: Number(cancelled) };
});
const airlines = [
  { airline_code: "AA", airline_name: "American Airlines" },
  { airline_code: "DL", airline_name: "Delta Air Lines" },
  { airline_code: "MQ", airline_name: "Envoy Air" },
  { airline_code: "OO", airline_name: "SkyWest Airlines" },
  { airline_code: "UA", airline_name: "United Air Lines" },
];

const twoDays = [
  { airline_code: "AA", flight_date: "2025-01-10", arrival_delay: -3 },
  { airline_code: "AA", flight_date: "2025-01-10", arrival_delay: -23 },
  { airline_code: "AA", flight_date: "2025-01-10", arrival_delay: 18 },
  { airline_code: "AA", flight_date: "2025-01-11", arrival_delay: 167 },
  { airline_code: "DL", flight_date: "2025-01-10", arrival_delay: -25 },
  { airline_code: "DL", flight_date: "2025-01-11", arrival_delay: 54 },
  { airline_code: "DL", flight_date: "2025-01-11", arrival_delay: null },
];

const segOrders = [
  { order_id: "O100282", customer_id: "C00077", total: 35.84 },
  { order_id: "O100376", customer_id: "C00065", total: 91.47 },
  { order_id: "O101219", customer_id: "C00077", total: 246.6 },
  { order_id: "O101723", customer_id: "C01338", total: 54.55 },
];
const segCustomers = [
  { customer_id: "C00065", segment: "consumer" },
  { customer_id: "C00077", segment: "business" },
  { customer_id: "C00077", segment: "business" },
  { customer_id: "C01338", segment: "consumer" },
];

const messyCustomers = [
  { customer_id: "C02264", email: "Noah.scott51@outlook.com", city: "MIAMI", state: "FL" },
  { customer_id: "C02306", email: "ben.brown@yahoo.com", city: "Atlanta ", state: "ga" },
  { customer_id: "C02264", email: "noah.scott51@outlook.com ", city: "Miami", state: "FL " },
  { customer_id: "C06310", email: " diegokim4@gmail.com ", city: "portland", state: "OR" },
];

export const m43Questions: PyQuestion[] = [
  {
    id: "PY-Q43-02",
    version: 2,
    slug: "airline-delay-groups-predict",
    title: "Grouped delay statistics",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["aggregate-call", "assignment", "dict-literal", "dict-lookup", "import-alias", "import-module", "list-index", "list-literal", "np-dtype", "np-reduce", "pd-frame", "pd-group", "pd-loc", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "Arrival delays in minutes for six flights on 10 January 2025. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Group keys come out sorted A to Z.",
      "`agg([\"count\", \"max\"])` makes one column per function.",
      "AA's three delays are −3, 18 and 167.",
    ],
    explanation: "The groups are AA, DL and MQ in that order. AA's largest delay is 167, and the counts add up to the six flights. The means are (−3 + 18 + 167) / 3 ≈ 60.7, (−25 + 54) / 2 = 14.5 and 42.",
    predict: {
      program: src`
import pandas as pd

flights = pd.DataFrame({
    "airline": ["AA", "DL", "AA", "MQ", "DL", "AA"],
    "arrival_delay": [-3, -25, 18, 42, 54, 167],
})
stats = flights.groupby("airline")["arrival_delay"].agg(["count", "max"])
print(stats.index.tolist())
print(stats.loc["AA", "max"], stats["count"].sum())
print(flights.groupby("airline")["arrival_delay"].mean().round(1).to_dict())
`,
      output: "['AA', 'DL', 'MQ']\n167 6\n{'AA': 60.7, 'DL': 14.5, 'MQ': 42.0}\n",
      wrongPredictions: ["['AA', 'DL', 'AA', 'MQ', 'DL', 'AA']\n167 6\n{'AA': 60.7, 'DL': 14.5, 'MQ': 42.0}", "['AA', 'DL', 'MQ']\n167 3\n{'AA': 60.7, 'DL': 14.5, 'MQ': 42.0}", "['AA', 'DL', 'MQ']\n182 6\n{'AA': 60.7, 'DL': 14.5, 'MQ': 42.0}", "['AA', 'DL', 'MQ']\n167 6\n{'AA': 182, 'DL': 29, 'MQ': 42}"],
    },
  },
  {
    id: "PY-Q43-03",
    version: 2,
    slug: "average-of-daily-averages",
    title: "The average delay that weights days, not flights",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-literal", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "np-reduce", "pd-frame", "pd-group", "pd-missing", "precedence", "print-call", "reassignment", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "`average_delay` should return each airline's average arrival delay over **all its flights**. It averages each day first and then averages those daily numbers, so a quiet day with one bad flight counts as much as a busy day. For American Airlines in the example the report says 77.8 minutes, but the four flights average 39.75. Fix it. Cancelled flights have no delay (`None`) and don't count.",
    spec: [
      ["Function", "`average_delay(records)`"],
      ["records", "dictionaries with `airline_code`, `flight_date`, `arrival_delay` (minutes or `None`)"],
      ["Returns", "`{airline_code: average delay}`"],
    ],
    hiddenKinds: ["days with very different numbers of flights", "a cancelled flight", "a single flight"],
    hints: [
      "Group once, by the thing the answer is per.",
      "The date shouldn't be part of the grouping at all.",
      "`mean` already skips the missing delays of cancelled flights.",
    ],
    explanation: "An average of daily averages weights every day equally, whatever its number of flights. Grouping the raw rows by airline weights every flight equally, which is what *average delay per flight* means. Filling the missing delays with 0 would count cancelled flights as on time.",
    code: {
      starter: src`
import pandas as pd

def average_delay(records):
    flights = pd.DataFrame(records)
    daily = flights.groupby(["airline_code", "flight_date"])["arrival_delay"].mean()
    return daily.groupby("airline_code").mean().to_dict()

flights = [
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": -3},
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": -23},
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": 18},
    {"airline_code": "AA", "flight_date": "2025-01-11", "arrival_delay": 167},
]
print(average_delay(flights))
`,
      answer: src`
import pandas as pd

def average_delay(records):
    flights = pd.DataFrame(records)
    return flights.groupby("airline_code")["arrival_delay"].mean().to_dict()

flights = [
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": -3},
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": -23},
    {"airline_code": "AA", "flight_date": "2025-01-10", "arrival_delay": 18},
    {"airline_code": "AA", "flight_date": "2025-01-11", "arrival_delay": 167},
]
print(average_delay(flights))
`,
      alternatives: [
        src`
import pandas as pd

def average_delay(records):
    flights = pd.DataFrame(records).dropna(subset=["arrival_delay"])
    sums = flights.groupby("airline_code")["arrival_delay"].sum()
    counts = flights.groupby("airline_code").size()
    return (sums / counts).to_dict()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def average_delay(records):
    flights = pd.DataFrame(records)
    flights["arrival_delay"] = flights["arrival_delay"].fillna(0)
    return flights.groupby("airline_code")["arrival_delay"].mean().to_dict()
`,
          fails: ["returns"],
          why: "a cancelled flight is counted as arriving exactly on time",
        },
        {
          code: src`
import pandas as pd

def average_delay(records):
    flights = pd.DataFrame(records)
    daily = flights.groupby(["airline_code", "flight_date"])["arrival_delay"].median()
    return daily.groupby("airline_code").mean().to_dict()
`,
          fails: ["returns"],
          why: "it still averages per-day numbers instead of the flights",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "average_delay", [
            example([twoDays.slice(0, 4)], { AA: 39.75 }),
            example([twoDays], { AA: 39.75, DL: 14.5 }),
            example([[{ airline_code: "MQ", flight_date: "2025-01-10", arrival_delay: 42 }]], { MQ: 42 }),
            hiddenCase("days with very different numbers of flights", [[{ airline_code: "UA", flight_date: "d1", arrival_delay: 0 }, { airline_code: "UA", flight_date: "d1", arrival_delay: 0 }, { airline_code: "UA", flight_date: "d1", arrival_delay: 0 }, { airline_code: "UA", flight_date: "d2", arrival_delay: 100 }]], { UA: 25 }),
            hiddenCase("a cancelled flight", [[{ airline_code: "DL", flight_date: "d1", arrival_delay: null }, { airline_code: "DL", flight_date: "d1", arrival_delay: 10 }]], { DL: 10 }),
            hiddenCase("a single flight", [[{ airline_code: "OO", flight_date: "d1", arrival_delay: -22 }]], { OO: -22 }),
          ], { label: "average_delay() averages every flight of each airline", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-06",
    version: 2,
    slug: "peak-departure-hour-pandas",
    title: "The busiest departure hour",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "dict-get", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "np-index", "np-reduce", "part-attr", "pd-frame", "pd-group", "pd-time", "print-call", "print-several", "print-text", "string-index", "string-slice", "top-level-indent"],
    packages: PD,
    prompt: "An airport plans staff around its busiest hour. Write `busiest_hour(departures)`: given scheduled departure times like `\"2025-01-10 05:13\"`, return the hour (0–23) with the most departures. On a tie, return the earliest of those hours; with no departures, return `None`.",
    spec: [
      ["Function", "`busiest_hour(departures)`"],
      ["Returns", "an int from 0 to 23, or `None`"],
    ],
    hiddenKinds: ["a tie between two hours", "a single departure", "departures just before and after midnight", "no departures"],
    hints: [
      "Parse the texts, then take the hour of each.",
      "Count how many departures each hour has.",
      "Several hours can share the highest count: choose the smallest of them.",
    ],
    explanation: "`pd.to_datetime(..., format=\"%Y-%m-%d %H:%M\")` parses the times and `.dt.hour` extracts the hour. `value_counts` counts each hour; the hours whose count equals the maximum are candidates, and the smallest wins the tie. `value_counts().idxmax()` alone would pick whichever tied hour happened to be listed first.",
    code: {
      starter: src`
import pandas as pd

def busiest_hour(departures):
    return None

print(busiest_hour(["2025-01-10 00:59", "2025-01-10 05:00", "2025-01-10 05:13"]))
`,
      answer: src`
import pandas as pd

def busiest_hour(departures):
    if len(departures) == 0:
        return None
    when = pd.to_datetime(pd.Series(departures), format="%Y-%m-%d %H:%M")
    counts = when.dt.hour.value_counts()
    top = counts[counts == counts.max()]
    return int(min(top.index))

print(busiest_hour(["2025-01-10 00:59", "2025-01-10 05:00", "2025-01-10 05:13"]))
`,
      alternatives: [
        src`
def busiest_hour(departures):
    counts = {}
    for text in departures:
        hour = int(text[11:13])
        counts[hour] = counts.get(hour, 0) + 1
    if not counts:
        return None
    best = max(counts.values())
    return min(h for h in counts if counts[h] == best)
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def busiest_hour(departures):
    if len(departures) == 0:
        return None
    when = pd.to_datetime(pd.Series(departures), format="%Y-%m-%d %H:%M")
    counts = when.dt.hour.value_counts()
    top = counts[counts == counts.max()]
    return int(max(top.index))
`,
          fails: ["returns"],
          why: "a tie goes to the latest hour instead of the earliest",
        },
        {
          code: src`
import pandas as pd

def busiest_hour(departures):
    if len(departures) == 0:
        return None
    when = pd.to_datetime(pd.Series(departures), format="%Y-%m-%d %H:%M")
    return int(when.dt.minute.value_counts().idxmax())
`,
          fails: ["returns"],
          why: "it counts minutes past the hour instead of hours",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "busiest_hour", [
            example([flights.map((f) => f.scheduled_departure)], 5),
            example([["2025-01-10 00:59", "2025-01-10 05:00", "2025-01-10 05:13"]], 5),
            example([[]], null),
            hiddenCase("a tie between two hours", [["2025-01-10 14:05", "2025-01-10 09:30", "2025-01-10 14:55", "2025-01-10 09:00"]], 9),
            hiddenCase("a single departure", [["2025-01-10 23:59"]], 23),
            hiddenCase("departures just before and after midnight", [["2025-01-10 23:50", "2025-01-11 00:10", "2025-01-11 00:20"]], 0),
          ], { label: "busiest_hour() returns the hour with most departures, earliest on a tie" }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-10",
    version: 2,
    slug: "top-revenue-categories",
    title: "Top categories by revenue",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "import-alias", "import-module", "lambda", "list-index", "list-literal", "list-sort", "membership", "np-dtype", "np-reduce", "pd-frame", "pd-group", "pd-loc", "precedence", "print-call", "print-several", "sort-key", "string-index", "string-slice", "top-level-indent"],
    packages: PD,
    prompt: "A dashboard tile shows the `n` product categories with the most revenue. Write `top_categories(lines, n)`: add up `line_total` per `category` and return the `n` best categories, highest revenue first; categories with equal revenue are ordered by name, A to Z.",
    spec: [
      ["Function", "`top_categories(lines, n)`"],
      ["lines", "dictionaries with `category` and `line_total`"],
      ["Returns", "a list of at most `n` category names"],
    ],
    hiddenKinds: ["two categories with equal revenue", "n larger than the number of categories", "a category spread over many lines", "no lines"],
    hints: [
      "Total per category first, then rank the totals.",
      "Sorting a Series by its values and its index can be done in two steps, or by turning it into a table.",
      "Take the first `n` after sorting, and return the names.",
    ],
    explanation: "`groupby(\"category\")[\"line_total\"].sum()` gives one total per category. Sorting the reset table by `[\"revenue\", \"category\"]` with `ascending=[False, True]` orders by revenue and breaks ties by name; `head(n)` keeps the top. Sorting by revenue alone leaves equal totals in an arbitrary order.",
    code: {
      starter: src`
import pandas as pd

def top_categories(lines, n):
    return []

lines = [{"category": "sports", "line_total": 27.9}, {"category": "fashion", "line_total": 37.49}, {"category": "sports", "line_total": 48.0}]
print(top_categories(lines, 1))
`,
      answer: src`
import pandas as pd

def top_categories(lines, n):
    table = pd.DataFrame(lines, columns=["category", "line_total"])
    totals = table.groupby("category", as_index=False)["line_total"].sum()
    ranked = totals.sort_values(["line_total", "category"], ascending=[False, True])
    return ranked.head(n)["category"].tolist()

lines = [{"category": "sports", "line_total": 27.9}, {"category": "fashion", "line_total": 37.49}, {"category": "sports", "line_total": 48.0}]
print(top_categories(lines, 1))
`,
      alternatives: [
        src`
def top_categories(lines, n):
    totals = {}
    for line in lines:
        totals[line["category"]] = totals.get(line["category"], 0) + line["line_total"]
    ranked = sorted(totals, key=lambda c: (-totals[c], c))
    return ranked[:n]
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def top_categories(lines, n):
    table = pd.DataFrame(lines, columns=["category", "line_total"])
    totals = table.groupby("category", as_index=False)["line_total"].sum()
    ranked = totals.sort_values(["line_total", "category"], ascending=[False, False])
    return ranked.head(n)["category"].tolist()
`,
          fails: ["returns"],
          why: "equal revenues are ordered Z to A",
        },
        {
          code: src`
import pandas as pd

def top_categories(lines, n):
    table = pd.DataFrame(lines, columns=["category", "line_total"])
    ranked = table.sort_values("line_total", ascending=False)
    return ranked.head(n)["category"].tolist()
`,
          fails: ["returns"],
          why: "it ranks single lines, not category totals, and can repeat a category",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "top_categories", [
            example([[{ category: "sports", line_total: 27.9 }, { category: "fashion", line_total: 37.49 }, { category: "sports", line_total: 48.0 }], 1], ["sports"]),
            example([[{ category: "sports", line_total: 27.9 }, { category: "sports", line_total: 48 }, { category: "fashion", line_total: 37.49 }, { category: "grocery", line_total: 3.99 }, { category: "fashion", line_total: 42.49 }], 2], ["fashion", "sports"]),
            example([[], 3], []),
            hiddenCase("two categories with equal revenue", [[{ category: "toys", line_total: 26.99 }, { category: "books", line_total: 26.99 }, { category: "home", line_total: 5 }], 2], ["books", "toys"]),
            hiddenCase("n larger than the number of categories", [[{ category: "home", line_total: 31 }], 5], ["home"]),
            hiddenCase("a category spread over many lines", [[{ category: "grocery", line_total: 3.99 }, { category: "grocery", line_total: 3.99 }, { category: "grocery", line_total: 3.99 }, { category: "electronics", line_total: 10 }], 1], ["grocery"]),
          ], { label: "top_categories() ranks categories by total revenue, ties by name" }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-12",
    version: 2,
    slug: "departed-flights-grid",
    title: "Departed flights per airline and airport",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "comparison", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "pd-filter", "pd-frame", "pd-pivot", "print-call", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "Write `departures_grid(flights)`: from a flights DataFrame (`airline_code`, `origin`, `cancelled` as 0/1, and more), return a table with one row per airline and one column per origin airport, counting the flights that actually departed (`cancelled == 0`), with 0 where an airline had none from that airport. Airlines and airports with no departed flight at all don't appear.",
    spec: [
      ["Function", "`departures_grid(flights)`"],
      ["Returns", "a DataFrame: index = airline codes, columns = origin airports, values = counts"],
    ],
    hiddenKinds: ["an airline whose only flight was cancelled", "one airline, one airport", "every flight departed"],
    hints: [
      "Drop the cancelled flights first.",
      "Airlines down the side, airports across the top, a count in each cell.",
      "`crosstab` counts combinations and fills empty cells with 0.",
    ],
    explanation: "Filtering to `cancelled == 0` first means a cancelled flight never reaches the grid, so an airline (or airport) with only cancellations disappears. `pd.crosstab(index, columns)` (or `pivot_table` with `aggfunc=\"size\"` and `fill_value=0`) builds the counts.",
    code: {
      starter: src`
import pandas as pd

def departures_grid(flights):
    return flights

flights = pd.DataFrame([
    {"airline_code": "AA", "origin": "BOS", "cancelled": 0},
    {"airline_code": "AA", "origin": "DFW", "cancelled": 1},
    {"airline_code": "DL", "origin": "BOS", "cancelled": 0},
])
print(departures_grid(flights))
`,
      answer: src`
import pandas as pd

def departures_grid(flights):
    flown = flights[flights["cancelled"] == 0]
    return pd.crosstab(flown["airline_code"], flown["origin"])

flights = pd.DataFrame([
    {"airline_code": "AA", "origin": "BOS", "cancelled": 0},
    {"airline_code": "AA", "origin": "DFW", "cancelled": 1},
    {"airline_code": "DL", "origin": "BOS", "cancelled": 0},
])
print(departures_grid(flights))
`,
      alternatives: [
        src`
import pandas as pd

def departures_grid(flights):
    flown = flights[flights["cancelled"] == 0]
    return flown.pivot_table(index="airline_code", columns="origin", aggfunc="size", fill_value=0)
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def departures_grid(flights):
    return pd.crosstab(flights["airline_code"], flights["origin"])
`,
          fails: ["grid", "grid-hidden"],
          why: "cancelled flights are counted as departures",
        },
        {
          code: src`
import pandas as pd

def departures_grid(flights):
    flown = flights[flights["cancelled"] == 0]
    return pd.crosstab(flown["origin"], flown["airline_code"])
`,
          fails: ["grid", "grid-hidden"],
          why: "airports are the rows and airlines the columns, the wrong way round",
        },
      ],
      task: {
        packages: PD,
        checks: [
          { kind: "expr", id: "grid", label: "departures_grid() counts departed flights per airline and origin", show: "departures_grid(flights).to_dict(orient=\"index\")", expr: `${frameSetup(flights)}\nresult = departures_grid(_df).to_dict(orient="index")`, expected: pv({
            AA: { BOS: 2, DFW: 0, FAR: 0, LAS: 0, MCI: 0, PDX: 0, SEA: 1, SLC: 1 },
            DL: { BOS: 0, DFW: 1, FAR: 0, LAS: 0, MCI: 0, PDX: 1, SEA: 0, SLC: 0 },
            MQ: { BOS: 0, DFW: 0, FAR: 1, LAS: 0, MCI: 1, PDX: 0, SEA: 0, SLC: 0 },
            OO: { BOS: 0, DFW: 0, FAR: 0, LAS: 0, MCI: 0, PDX: 1, SEA: 0, SLC: 0 },
            UA: { BOS: 0, DFW: 0, FAR: 0, LAS: 1, MCI: 0, PDX: 0, SEA: 0, SLC: 0 },
          }) },
          { kind: "expr", id: "grid-hidden", label: "Works for other flights (an airline with only a cancelled flight, one airport)", hidden: true, expr: `${frameSetup([
            { airline_code: "NK", origin: "DFW", cancelled: 1 },
            { airline_code: "WN", origin: "MSP", cancelled: 0 },
            { airline_code: "WN", origin: "MSP", cancelled: 0 },
          ])}\nresult = departures_grid(_df).to_dict(orient="index")`, expected: pv({ WN: { MSP: 2 } }) },
        ],
      },
    },
  },
  {
    id: "PY-Q43-13",
    version: 2,
    slug: "segment-revenue-doubled",
    title: "Segment revenue that counts orders twice",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "membership", "np-reduce", "pd-frame", "pd-group", "pd-merge", "print-call", "print-several", "string-index", "top-level-indent"],
    packages: PD,
    prompt: "`segment_revenue` should total order revenue per customer segment. Finance noticed the business segment is about twice what the orders add up to. The customers export sometimes lists a customer more than once (identical rows). Fix the function so each order counts once. Orders whose customer isn't listed are left out.",
    spec: [
      ["Function", "`segment_revenue(orders, customers)`"],
      ["Returns", "`{segment: revenue}`"],
    ],
    hiddenKinds: ["a customer listed three times", "no duplicates", "an order whose customer isn't listed"],
    hints: [
      "Count the rows after the merge: how many did each order become?",
      "The customers table is supposed to have one row per customer.",
      "Make it so before merging; `validate` can then confirm it.",
    ],
    explanation: "Each order is paired with **every** matching customer row, so a customer listed twice doubles their orders. Dropping duplicate customers by `customer_id` restores one row per customer; `validate=\"many_to_one\"` then documents and checks that. Adding `validate` alone turns the silent error into a MergeError, which is better than a wrong number but still doesn't produce the report.",
    code: {
      starter: src`
import pandas as pd

def segment_revenue(orders, customers):
    joined = pd.DataFrame(orders, columns=["order_id", "customer_id", "total"]).merge(pd.DataFrame(customers), on="customer_id")
    return joined.groupby("segment")["total"].sum().to_dict()

orders = [{"order_id": "O100282", "customer_id": "C00077", "total": 35.84}]
customers = [{"customer_id": "C00077", "segment": "business"}, {"customer_id": "C00077", "segment": "business"}]
print(segment_revenue(orders, customers))
`,
      answer: src`
import pandas as pd

def segment_revenue(orders, customers):
    people = pd.DataFrame(customers).drop_duplicates(subset=["customer_id"])
    joined = pd.DataFrame(orders, columns=["order_id", "customer_id", "total"]).merge(people, on="customer_id", validate="many_to_one")
    return joined.groupby("segment")["total"].sum().to_dict()

orders = [{"order_id": "O100282", "customer_id": "C00077", "total": 35.84}]
customers = [{"customer_id": "C00077", "segment": "business"}, {"customer_id": "C00077", "segment": "business"}]
print(segment_revenue(orders, customers))
`,
      alternatives: [
        src`
def segment_revenue(orders, customers):
    segment_of = {c["customer_id"]: c["segment"] for c in customers}
    totals = {}
    for order in orders:
        if order["customer_id"] in segment_of:
            seg = segment_of[order["customer_id"]]
            totals[seg] = totals.get(seg, 0) + order["total"]
    return totals
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def segment_revenue(orders, customers):
    joined = pd.DataFrame(orders, columns=["order_id", "customer_id", "total"]).merge(pd.DataFrame(customers), on="customer_id", validate="many_to_one")
    return joined.groupby("segment")["total"].sum().to_dict()
`,
          fails: ["returns"],
          why: "the duplicate is now detected, but the function raises MergeError instead of reporting",
        },
        {
          code: src`
import pandas as pd

def segment_revenue(orders, customers):
    joined = pd.DataFrame(orders, columns=["order_id", "customer_id", "total"]).drop_duplicates().merge(pd.DataFrame(customers), on="customer_id")
    return joined.groupby("segment")["total"].sum().to_dict()
`,
          fails: ["returns"],
          why: "the orders were never duplicated; the customers table was",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "segment_revenue", [
            example([segOrders, segCustomers], { business: 282.44, consumer: 146.02 }),
            example([[{ order_id: "O100282", customer_id: "C00077", total: 35.84 }], [{ customer_id: "C00077", segment: "business" }, { customer_id: "C00077", segment: "business" }]], { business: 35.84 }),
            example([[], segCustomers], {}),
            hiddenCase("a customer listed three times", [[{ order_id: "A", customer_id: "C1", total: 10 }], [{ customer_id: "C1", segment: "consumer" }, { customer_id: "C1", segment: "consumer" }, { customer_id: "C1", segment: "consumer" }]], { consumer: 10 }),
            hiddenCase("no duplicates", [segOrders.slice(1, 2), segCustomers.slice(0, 1)], { consumer: 91.47 }),
            hiddenCase("an order whose customer isn't listed", [[{ order_id: "A", customer_id: "C9", total: 10 }, { order_id: "B", customer_id: "C00065", total: 5 }], segCustomers], { consumer: 5 }),
          ], { label: "segment_revenue() counts each order once", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-16",
    version: 2,
    slug: "tidy-customer-records",
    title: "Tidy a customer export",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "bitwise", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-copy", "list-index", "list-literal", "list-mutate", "pd-filter", "pd-frame", "pd-merge", "pd-quality", "print-call", "string-index", "string-method", "top-level-indent"],
    packages: PD,
    prompt: "Write `tidy_customers(customers)`: return a **new** DataFrame where `email` is stripped and lower-cased, `city` is stripped and title-cased, `state` is stripped and upper-cased, and only the **last** row of each `customer_id` remains (later rows are newer). Keep the remaining rows in their original order. The caller's DataFrame must not change.",
    spec: [
      ["Function", "`tidy_customers(customers)`"],
      ["customers", "a DataFrame with `customer_id`, `email`, `city`, `state`"],
      ["Returns", "a new DataFrame with the same columns"],
    ],
    hiddenKinds: ["a customer whose newer row has different details", "no duplicates", "text that only differs by spaces"],
    hints: [
      "Clean each text column with chained `.str` methods, on a copy.",
      "Then remove repeated IDs, keeping the newer row.",
      "`drop_duplicates` keeps the surviving rows in their original order.",
    ],
    explanation: "Cleaning first means equal values look equal; `drop_duplicates(subset=[\"customer_id\"], keep=\"last\")` then keeps the newest row of each customer, in file order. Working on `copy()` (or with `assign`) keeps the caller's frame untouched.",
    code: {
      starter: src`
import pandas as pd

def tidy_customers(customers):
    return customers

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "Noah.scott51@outlook.com", "city": "MIAMI", "state": "FL"},
    {"customer_id": "C02306", "email": "ben.brown@yahoo.com", "city": "Atlanta ", "state": "ga"},
])
print(tidy_customers(customers))
`,
      answer: src`
import pandas as pd

def tidy_customers(customers):
    result = customers.copy()
    result["email"] = result["email"].str.strip().str.lower()
    result["city"] = result["city"].str.strip().str.title()
    result["state"] = result["state"].str.strip().str.upper()
    return result.drop_duplicates(subset=["customer_id"], keep="last")

customers = pd.DataFrame([
    {"customer_id": "C02264", "email": "Noah.scott51@outlook.com", "city": "MIAMI", "state": "FL"},
    {"customer_id": "C02306", "email": "ben.brown@yahoo.com", "city": "Atlanta ", "state": "ga"},
])
print(tidy_customers(customers))
`,
      alternatives: [
        src`
import pandas as pd

def tidy_customers(customers):
    tidy = customers.assign(
        email=customers["email"].str.strip().str.lower(),
        city=customers["city"].str.strip().str.title(),
        state=customers["state"].str.strip().str.upper(),
    )
    newer = tidy["customer_id"].duplicated(keep="last")
    return tidy[~newer]
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def tidy_customers(customers):
    result = customers.copy()
    result["email"] = result["email"].str.strip().str.lower()
    result["city"] = result["city"].str.strip().str.title()
    result["state"] = result["state"].str.strip().str.upper()
    return result.drop_duplicates(subset=["customer_id"])
`,
            fails: ["rows", "rows-hidden"],
            why: "it keeps the older first row of each customer",
          },
          {
            code: src`
import pandas as pd

def tidy_customers(customers):
    customers["email"] = customers["email"].str.strip().str.lower()
    customers["city"] = customers["city"].str.strip().str.title()
    customers["state"] = customers["state"].str.strip().str.upper()
    return customers.drop_duplicates(subset=["customer_id"], keep="last")
`,
            fails: ["keeps-input"],
            why: "the caller's DataFrame is cleaned in place",
          },
        ],
      task: {
        packages: PD,
        checks: [
          frameRows("rows", "tidy_customers() cleans text and keeps each customer's last row", "tidy_customers(_df)", [
            { customer_id: "C02306", email: "ben.brown@yahoo.com", city: "Atlanta", state: "GA" },
            { customer_id: "C02264", email: "noah.scott51@outlook.com", city: "Miami", state: "FL" },
            { customer_id: "C06310", email: "diegokim4@gmail.com", city: "Portland", state: "OR" },
          ], { setup: frameSetup(messyCustomers), show: "tidy_customers(customers)" }),
          frameRows("rows-hidden", "Works for other exports (a newer row with different details, no duplicates)", "tidy_customers(_df)", [
            { customer_id: "B", email: "b@x.com", city: "New York", state: "NY" },
            { customer_id: "A", email: "new@x.com", city: "Salt Lake City", state: "UT" },
          ], { hidden: true, setup: frameSetup([
            { customer_id: "A", email: "OLD@x.com", city: "provo", state: "ut" },
            { customer_id: "B", email: " b@x.com", city: "NEW YORK", state: "ny" },
            { customer_id: "A", email: "New@X.com", city: "salt lake city ", state: "UT" },
          ]) }),
          { kind: "expr", id: "keeps-input", label: "tidy_customers() leaves the caller's DataFrame unchanged", expr: `${frameSetup(messyCustomers)}\ntidy_customers(_df)\nresult = [len(_df), _df["city"].tolist()]`, expected: pv([4, messyCustomers.map((c) => c.city)]) },
        ],
      },
    },
  },
  {
    id: "PY-Q43-19",
    version: 2,
    slug: "order-timeline-problems",
    title: "Orders whose timeline is impossible",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "bitwise", "boolean", "comparison", "continue-statement", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "np-dtype", "pd-frame", "pd-missing", "pd-time", "print-call", "reassignment", "string-index", "strptime-call", "top-level-indent", "try-except"],
    packages: PD,
    prompt: "An order's timestamps must make sense: every timestamp that is present must be valid (`YYYY-MM-DD HH:MM:SS`), it can't ship before it was ordered, and it can't be delivered before it shipped. `shipped_at` and `delivered_at` may be `None` (not yet). Write `timeline_problems(records)`: return the IDs of orders that break any rule, in their original order.",
    spec: [
      ["Function", "`timeline_problems(records)`"],
      ["records", "dictionaries with `order_id`, `ordered_at`, `shipped_at`, `delivered_at`"],
      ["Returns", "a list of order IDs"],
    ],
    hiddenKinds: ["an invalid timestamp", "delivered before shipping", "shipped at the same moment as ordered", "not yet shipped"],
    hints: [
      "Parse each column with `errors=\"coerce\"` and count a value as invalid when it was present but became NaT.",
      "Comparisons with NaT are False, so a missing timestamp never breaks an ordering rule.",
      "Combine the masks with `|`; the same moment is allowed.",
    ],
    explanation: "Each column is parsed with `errors=\"coerce\"`; a value that was present but is NaT afterwards is invalid. The ordering rules compare parsed columns, and because comparisons with NaT are False, orders that haven't shipped or arrived pass them. `|` joins the rules, so an order is listed once.",
    code: {
      starter: src`
import pandas as pd

def timeline_problems(records):
    return []

orders = [
    {"order_id": "O100282", "ordered_at": "2024-01-16 13:03:50", "shipped_at": "2024-01-17 03:20:06", "delivered_at": "2024-01-18 07:35:32"},
    {"order_id": "O999001", "ordered_at": "2024-03-02 10:00:00", "shipped_at": "2024-03-01 09:00:00", "delivered_at": None},
]
print(timeline_problems(orders))
`,
      answer: src`
import pandas as pd

def timeline_problems(records):
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at", "shipped_at", "delivered_at"])
    stamp = "%Y-%m-%d %H:%M:%S"
    bad = pd.Series(False, index=orders.index)
    parsed = {}
    for column in ["ordered_at", "shipped_at", "delivered_at"]:
        parsed[column] = pd.to_datetime(orders[column], format=stamp, errors="coerce")
        bad = bad | (orders[column].notna() & parsed[column].isna())
    bad = bad | (parsed["shipped_at"] < parsed["ordered_at"])
    bad = bad | (parsed["delivered_at"] < parsed["shipped_at"])
    return orders[bad]["order_id"].tolist()

orders = [
    {"order_id": "O100282", "ordered_at": "2024-01-16 13:03:50", "shipped_at": "2024-01-17 03:20:06", "delivered_at": "2024-01-18 07:35:32"},
    {"order_id": "O999001", "ordered_at": "2024-03-02 10:00:00", "shipped_at": "2024-03-01 09:00:00", "delivered_at": None},
]
print(timeline_problems(orders))
`,
      alternatives: [
        src`
from datetime import datetime

def timeline_problems(records):
    problems = []
    for order in records:
        times = []
        ok = True
        for key in ["ordered_at", "shipped_at", "delivered_at"]:
            value = order[key]
            if value is None:
                times.append(None)
                continue
            try:
                times.append(datetime.strptime(value, "%Y-%m-%d %H:%M:%S"))
            except ValueError:
                ok = False
                times.append(None)
        if times[0] and times[1] and times[1] < times[0]:
            ok = False
        if times[1] and times[2] and times[2] < times[1]:
            ok = False
        if not ok:
            problems.append(order["order_id"])
    return problems
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def timeline_problems(records):
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at", "shipped_at", "delivered_at"])
    stamp = "%Y-%m-%d %H:%M:%S"
    ordered = pd.to_datetime(orders["ordered_at"], format=stamp, errors="coerce")
    shipped = pd.to_datetime(orders["shipped_at"], format=stamp, errors="coerce")
    delivered = pd.to_datetime(orders["delivered_at"], format=stamp, errors="coerce")
    bad = (shipped < ordered) | (delivered < shipped)
    return orders[bad]["order_id"].tolist()
`,
          fails: ["returns"],
          why: "an invalid timestamp becomes NaT and silently passes every rule",
        },
        {
          code: src`
import pandas as pd

def timeline_problems(records):
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at", "shipped_at", "delivered_at"])
    stamp = "%Y-%m-%d %H:%M:%S"
    bad = pd.Series(False, index=orders.index)
    parsed = {}
    for column in ["ordered_at", "shipped_at", "delivered_at"]:
        parsed[column] = pd.to_datetime(orders[column], format=stamp, errors="coerce")
        bad = bad | parsed[column].isna()
    bad = bad | (parsed["shipped_at"] < parsed["ordered_at"])
    bad = bad | (parsed["delivered_at"] < parsed["shipped_at"])
    return orders[bad]["order_id"].tolist()
`,
          fails: ["returns"],
          why: "orders that simply haven't shipped or arrived yet are reported as broken",
        },
        {
          code: src`
import pandas as pd

def timeline_problems(records):
    orders = pd.DataFrame(records, columns=["order_id", "ordered_at", "shipped_at", "delivered_at"])
    stamp = "%Y-%m-%d %H:%M:%S"
    bad = pd.Series(False, index=orders.index)
    parsed = {}
    for column in ["ordered_at", "shipped_at", "delivered_at"]:
        parsed[column] = pd.to_datetime(orders[column], format=stamp, errors="coerce")
        bad = bad | (orders[column].notna() & parsed[column].isna())
    bad = bad | (parsed["shipped_at"] <= parsed["ordered_at"])
    bad = bad | (parsed["delivered_at"] <= parsed["shipped_at"])
    return orders[bad]["order_id"].tolist()
`,
          fails: ["returns"],
          why: "two events at the same moment are allowed, but `<=` rejects them",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "timeline_problems", [
            example([[
              { order_id: "O100282", ordered_at: "2024-01-16 13:03:50", shipped_at: "2024-01-17 03:20:06", delivered_at: "2024-01-18 07:35:32" },
              { order_id: "O999001", ordered_at: "2024-03-02 10:00:00", shipped_at: "2024-03-01 09:00:00", delivered_at: null },
            ]], ["O999001"]),
            example([[{ order_id: "O103332", ordered_at: "2024-06-18 23:05:00", shipped_at: null, delivered_at: null }]], []),
            example([[]], []),
            hiddenCase("an invalid timestamp", [[{ order_id: "A", ordered_at: "2024-02-30 10:00:00", shipped_at: null, delivered_at: null }, { order_id: "B", ordered_at: "2024-02-01 10:00:00", shipped_at: "soon", delivered_at: null }]], ["A", "B"]),
            hiddenCase("delivered before shipping", [[{ order_id: "C", ordered_at: "2024-05-01 10:00:00", shipped_at: "2024-05-02 10:00:00", delivered_at: "2024-05-02 09:59:59" }]], ["C"]),
            hiddenCase("shipped at the same moment as ordered", [[{ order_id: "D", ordered_at: "2024-05-01 10:00:00", shipped_at: "2024-05-01 10:00:00", delivered_at: "2024-05-01 10:00:00" }]], []),
          ], { label: "timeline_problems() lists orders with invalid or impossible timestamps" }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-20",
    version: 2,
    slug: "on-time-rate-by-airline",
    title: "On-time rate by airline name",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "continue-statement", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-copy", "list-index", "list-literal", "list-mutate", "membership", "np-reduce", "pd-filter", "pd-frame", "pd-group", "pd-merge", "pd-missing", "print-call", "print-several", "reassignment", "string-index", "top-level-indent", "truthiness", "tuple-literal", "tuple-unpack"],
    packages: PD,
    prompt: "A flight is **on time** when it arrives no more than 15 minutes late. Write `on_time_rates(flights, airlines)`: for each airline that operated at least one flight (not cancelled), return the share of its operated flights that were on time, keyed by the airline's **name** from `airlines`. An airline code missing from `airlines` is reported under the code itself.",
    spec: [
      ["Function", "`on_time_rates(flights, airlines)`"],
      ["flights", "dictionaries with `airline_code`, `arrival_delay` (minutes or `None`), `cancelled` (0 or 1)"],
      ["airlines", "dictionaries with `airline_code`, `airline_name`"],
      ["Returns", "`{name: share between 0 and 1}`"],
    ],
    hiddenKinds: ["a delay of exactly 15 minutes", "an airline with only cancelled flights", "a code missing from the airlines table", "early arrivals"],
    hints: [
      "Leave out the cancelled flights before computing anything.",
      "On time is a True/False column; its mean per airline is the rate.",
      "Bring in names with a left join, and fall back to the code where no name was found.",
    ],
    explanation: "Filtering to operated flights first means cancellations count neither as on time nor as late. The mean of `arrival_delay <= 15` per airline is its rate. A left merge with the airlines table adds names; `fillna` with the code column covers codes the table doesn't know. An inner merge would drop those airlines entirely.",
    code: {
      starter: src`
import pandas as pd

def on_time_rates(flights, airlines):
    return {}

flights = [{"airline_code": "AA", "arrival_delay": -3, "cancelled": 0}, {"airline_code": "AA", "arrival_delay": 167, "cancelled": 0}]
airlines = [{"airline_code": "AA", "airline_name": "American Airlines"}]
print(on_time_rates(flights, airlines))
`,
      answer: src`
import pandas as pd

def on_time_rates(flights, airlines):
    table = pd.DataFrame(flights, columns=["airline_code", "arrival_delay", "cancelled"])
    flown = table[table["cancelled"] == 0].copy()
    flown["on_time"] = flown["arrival_delay"] <= 15
    names = pd.DataFrame(airlines, columns=["airline_code", "airline_name"]).drop_duplicates(subset=["airline_code"])
    named = flown.merge(names, on="airline_code", how="left", validate="many_to_one")
    named["airline_name"] = named["airline_name"].fillna(named["airline_code"])
    return named.groupby("airline_name")["on_time"].mean().to_dict()

flights = [{"airline_code": "AA", "arrival_delay": -3, "cancelled": 0}, {"airline_code": "AA", "arrival_delay": 167, "cancelled": 0}]
airlines = [{"airline_code": "AA", "airline_name": "American Airlines"}]
print(on_time_rates(flights, airlines))
`,
      alternatives: [
        src`
def on_time_rates(flights, airlines):
    name_of = {a["airline_code"]: a["airline_name"] for a in airlines}
    counts = {}
    for f in flights:
        if f["cancelled"]:
            continue
        name = name_of.get(f["airline_code"], f["airline_code"])
        done, good = counts.get(name, (0, 0))
        counts[name] = (done + 1, good + (1 if f["arrival_delay"] <= 15 else 0))
    return {name: good / done for name, (done, good) in counts.items()}
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def on_time_rates(flights, airlines):
    table = pd.DataFrame(flights, columns=["airline_code", "arrival_delay", "cancelled"])
    table["on_time"] = table["arrival_delay"] <= 15
    names = pd.DataFrame(airlines, columns=["airline_code", "airline_name"])
    named = table.merge(names, on="airline_code", how="left")
    named["airline_name"] = named["airline_name"].fillna(named["airline_code"])
    return named.groupby("airline_name")["on_time"].mean().to_dict()
`,
          fails: ["returns"],
          why: "cancelled flights stay in, counting as late (their delay is missing)",
        },
        {
          code: src`
import pandas as pd

def on_time_rates(flights, airlines):
    table = pd.DataFrame(flights, columns=["airline_code", "arrival_delay", "cancelled"])
    flown = table[table["cancelled"] == 0].copy()
    flown["on_time"] = flown["arrival_delay"] <= 15
    names = pd.DataFrame(airlines, columns=["airline_code", "airline_name"])
    named = flown.merge(names, on="airline_code")
    return named.groupby("airline_name")["on_time"].mean().to_dict()
`,
          fails: ["returns"],
          why: "the inner join drops airlines missing from the names table",
        },
        {
          code: src`
import pandas as pd

def on_time_rates(flights, airlines):
    table = pd.DataFrame(flights, columns=["airline_code", "arrival_delay", "cancelled"])
    flown = table[table["cancelled"] == 0].copy()
    flown["on_time"] = flown["arrival_delay"] < 15
    names = pd.DataFrame(airlines, columns=["airline_code", "airline_name"])
    named = flown.merge(names, on="airline_code", how="left")
    named["airline_name"] = named["airline_name"].fillna(named["airline_code"])
    return named.groupby("airline_name")["on_time"].mean().to_dict()
`,
          fails: ["returns"],
          why: "a flight exactly 15 minutes late counts as on time, but `< 15` calls it late",
        },
      ],
      task: {
        packages: PD,
        checks: [
          fn("returns", "on_time_rates", [
            example([flights, airlines], { "American Airlines": 0.5, "Delta Air Lines": 0.5, "Envoy Air": 0.5, "SkyWest Airlines": 1.0, "United Air Lines": 1.0 }),
            example([[{ airline_code: "AA", arrival_delay: -3, cancelled: 0 }, { airline_code: "AA", arrival_delay: 167, cancelled: 0 }], [{ airline_code: "AA", airline_name: "American Airlines" }]], { "American Airlines": 0.5 }),
            example([[], airlines], {}),
            hiddenCase("a delay of exactly 15 minutes", [[{ airline_code: "DL", arrival_delay: 15, cancelled: 0 }], airlines], { "Delta Air Lines": 1.0 }),
            hiddenCase("an airline with only cancelled flights", [[{ airline_code: "NK", arrival_delay: null, cancelled: 1 }, { airline_code: "UA", arrival_delay: 30, cancelled: 0 }], airlines], { "United Air Lines": 0.0 }),
            hiddenCase("a code missing from the airlines table", [[{ airline_code: "WN", arrival_delay: -49, cancelled: 0 }], airlines], { WN: 1.0 }),
          ], { label: "on_time_rates() gives each operating airline's on-time share by name", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q43-22",
    version: 2,
    slug: "timestamps-predict",
    title: "Periods, gaps and NaT",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "import-alias", "import-module", "list-comp", "list-index", "list-literal", "membership", "np-reduce", "pd-frame", "pd-loc", "pd-missing", "pd-time", "print-call", "print-several", "string-index"],
    packages: PD,
    prompt: "Three order timestamps, one of them broken. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "The two valid times fall either side of midnight at the end of January.",
      "A Timedelta of 45 minutes has 0 whole days.",
      "NaT is missing; a comparison with it is False.",
    ],
    explanation: "The first order belongs to January and the second to February; the broken one is NaT, whose period prints as `NaT`. The gap is 45 minutes: 0 whole days, 45.0 minutes. Two timestamps are valid, and only the second is after midnight on 1 February (NaT compares as False).",
    predict: {
      program: src`
import pandas as pd

stamps = pd.Series(["2024-01-31 23:30:00", "2024-02-01 00:15:00", "not a date"])
when = pd.to_datetime(stamps, format="%Y-%m-%d %H:%M:%S", errors="coerce")
print([str(month) for month in when.dt.to_period("M")])
gap = when.iloc[1] - when.iloc[0]
print(gap, gap.days, gap.total_seconds() / 60)
print(when.notna().sum(), (when > pd.Timestamp("2024-02-01")).sum())
`,
      output: "['2024-01', '2024-02', 'NaT']\n0 days 00:45:00 0 45.0\n2 1\n",
      wrongPredictions: ["['2024-01', '2024-01', 'NaT']\n0 days 00:45:00 0 45.0\n2 1", "['2024-01', '2024-02', 'NaT']\n0 days 00:45:00 1 45.0\n2 1", "['2024-01', '2024-02', 'NaT']\n0 days 00:45:00 0 45.0\n3 2", "['2024-01', '2024-02']\n0 days 00:45:00 0 45.0\n2 1"],
    },
  },
];
