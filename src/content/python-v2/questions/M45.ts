/**
 * M45 practice: ten independent problems on the formats and workflows of PY-L45-01 … PY-L45-05.
 *
 * Mix: 3 function implementations (DuckDB over a CSV file, a chunked maximum, chunked per-airline statistics),
 * 2 data transformations (a DuckDB zone report, a seeded stratified sample), 1 validation (an export checker),
 * 2 debugging (timestamps lost in a CSV cache, a query built by pasting a zone name with an apostrophe),
 * 2 output predictions. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures are real rows from D06 (NYC taxi trips and zones) and D13 (US flights). Files are given to the learner's
 * program as CSV text next to it; checks call functions on those files and on DataFrames the check builds, with
 * hidden inputs (other chunk sizes, ties, names with apostrophes, missing delays, empty groups).
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { frameRows, pv } from "../fn-checks";
import { frameSetup } from "../lessons/M43";
import { DUCK, PARQ, PDONLY, TRIPS_CSV } from "../lessons/M45";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const loose = { numbers: "int-float-equal" } as const;

const FLIGHTS_CSV = `flight_id,airline_code,scheduled_departure,arrival_delay,cancelled
12207,UA,2025-01-10 00:59,-4,0
12208,MQ,2025-01-10 05:00,12,0
12209,AA,2025-01-10 05:01,,1
12210,DL,2025-01-10 05:10,-25,0
12211,AA,2025-01-10 05:13,-3,0
12212,DL,2025-01-10 05:15,,1
12213,MQ,2025-01-10 05:15,42,0
12214,OO,2025-01-10 05:15,-22,0
12215,AA,2025-01-10 05:20,-23,0
12216,AA,2025-01-10 05:20,18,0
12217,DL,2025-01-10 05:20,54,0
12218,AA,2025-01-10 05:22,167,0
12219,AA,2025-01-10 05:24,5,0
12220,DL,2025-01-10 05:30,-22,0
12221,WN,2025-01-10 05:30,-49,0
`;

const ZONES_CSV = `zone_id,zone_name,borough
84,Eltingville/Annadale/Prince's Bay,Staten Island
114,Greenwich Village South,Manhattan
186,Penn Station/Madison Sq West,Manhattan
`;

export const m45Questions: PyQuestion[] = [
  {
    id: "PY-Q45-02",
    version: 2,
    slug: "chunked-read-predict",
    title: "What each chunk holds",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-lookup", "for-loop", "import-alias", "import-module", "len-call", "list-index", "list-literal", "membership", "newline-escape", "np-dtype", "np-reduce", "pd-chunk", "pd-frame", "print-call", "print-several", "string-index", "top-level-indent", "tuple-unpack"],
    packages: PDONLY,
    prompt: "Five taxi fares read in chunks. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Five rows in chunks of 2 make three chunks.",
      "`usecols` keeps only the named column in every chunk.",
      "The running total adds each chunk's sum; the last line divides it by the row count.",
    ],
    explanation: "The chunks hold 2, 2 and 1 rows, each with only `fare_amount`. Their sums are 48.0, 39.26 and 5.1, so the total is 92.36 and the mean is 92.36 / 5 = 18.472.",
    predict: {
      program: src`
import io
import pandas as pd

text = "trip_id,fare_amount,tip_amount\n16126,40.8,10.7\n16127,7.2,2.55\n16128,17.2,0\n16129,22.06,0\n16130,5.1,1\n"
total, rows = 0.0, 0
for chunk in pd.read_csv(io.StringIO(text), chunksize=2, usecols=["fare_amount"]):
    print(len(chunk), chunk.columns.tolist(), round(chunk["fare_amount"].sum(), 2))
    total += chunk["fare_amount"].sum()
    rows += len(chunk)
print(round(total / rows, 3))
`,
      output: "2 ['fare_amount'] 48.0\n2 ['fare_amount'] 39.26\n1 ['fare_amount'] 5.1\n18.472\n",
      wrongPredictions: ["2 ['fare_amount'] 48.0\n2 ['fare_amount'] 39.26\n2 ['fare_amount'] 5.1\n18.472", "2 ['trip_id', 'fare_amount', 'tip_amount'] 48.0\n2 ['trip_id', 'fare_amount', 'tip_amount'] 39.26\n1 ['trip_id', 'fare_amount', 'tip_amount'] 5.1\n18.472", "2 ['fare_amount'] 48.0\n2 ['fare_amount'] 39.26\n1 ['fare_amount'] 5.1\n30.787", "2 ['fare_amount'] 48.0\n3 ['fare_amount'] 44.36\n18.472"],
    },
  },
  {
    id: "PY-Q45-03",
    version: 2,
    slug: "cache-lost-timestamps",
    title: "The cache that forgets timestamps",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arrow-file", "assignment", "boolean", "comparison", "conversion", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "np-index", "np-reduce", "pd-frame", "pd-group", "pd-time", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    packages: PARQ,
    prompt: "`busiest_hour_cached` saves trips to a cache file, reads the cache back, and returns the pickup hour with the most trips (the earliest hour on a tie). The trips it receives have a real datetime column, yet it crashes with `AttributeError: Can only use .dt accessor with datetimelike values`. Fix the cache so the types survive.",
    spec: [
      ["Function", "`busiest_hour_cached(trips, path)`"],
      ["trips", "a DataFrame whose `pickup_at` column is already a datetime"],
      ["Returns", "an int hour"],
    ],
    hiddenKinds: ["a tie between two hours", "a single trip"],
    hints: [
      "Print the dtype of `pickup_at` after reading the cache back.",
      "CSV stores text, so the datetime comes back as text.",
      "Use a file format that stores column types.",
    ],
    explanation: "CSV keeps only text, so `pickup_at` comes back as `str` and `.dt` fails. Writing and reading Parquet keeps the datetime dtype, so `.dt.hour` works. Parsing the column again after `read_csv` would also run, but every reader of the cache would have to remember to do it.",
    code: {
      starter: src`
import pandas as pd

def busiest_hour_cached(trips, path):
    trips.to_csv(path, index=False)
    cached = pd.read_csv(path)
    hours = cached["pickup_at"].dt.hour.value_counts()
    return int(min(hours[hours == hours.max()].index))

trips = pd.DataFrame({"trip_id": [16126, 16137], "pickup_at": pd.to_datetime(["2025-01-15 00:12:47", "2025-01-15 01:06:21"])})
print(busiest_hour_cached(trips, "cache.csv"))
`,
      answer: src`
import pandas as pd

def busiest_hour_cached(trips, path):
    trips.to_parquet(path, index=False)
    cached = pd.read_parquet(path)
    hours = cached["pickup_at"].dt.hour.value_counts()
    return int(min(hours[hours == hours.max()].index))

trips = pd.DataFrame({"trip_id": [16126, 16137], "pickup_at": pd.to_datetime(["2025-01-15 00:12:47", "2025-01-15 01:06:21"])})
print(busiest_hour_cached(trips, "cache.parquet"))
`,
      alternatives: [
        src`
import pandas as pd

def busiest_hour_cached(trips, path):
    trips.to_csv(path, index=False)
    cached = pd.read_csv(path)
    hours = pd.to_datetime(cached["pickup_at"]).dt.hour
    counts = hours.value_counts()
    return int(min(counts[counts == counts.max()].index))
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def busiest_hour_cached(trips, path):
    trips.to_parquet(path, index=False)
    cached = pd.read_parquet(path)
    return int(cached["pickup_at"].dt.hour.value_counts().index[-1])
`,
          fails: ["returns"],
          why: "the cache works now, but it picks the least common hour",
        },
        {
          code: src`
import pandas as pd

def busiest_hour_cached(trips, path):
    trips.to_parquet(path, index=False)
    cached = pd.read_parquet(path)
    hours = cached["pickup_at"].dt.hour.value_counts()
    return int(max(hours[hours == hours.max()].index))
`,
          fails: ["returns-hidden"],
          why: "a tie goes to the latest hour",
        },
      ],
      task: {
        packages: PARQ,
        checks: [
          { kind: "expr", id: "returns", label: "busiest_hour_cached() returns the busiest pickup hour after caching", show: "busiest_hour_cached(trips, 'cache.parquet')", expr: "import pandas as _pd\n_t = _pd.read_csv('trips.csv')\n_t['pickup_at'] = _pd.to_datetime(_t['pickup_at'])\nresult = busiest_hour_cached(_t, '_a.cache')", expected: pv(0) },
          { kind: "expr", id: "returns-hidden", label: "Works for other trips (a tie between two hours, a single trip)", hidden: true, expr: "import pandas as _pd\n_b = _pd.DataFrame({'trip_id': [1, 2, 3, 4], 'pickup_at': _pd.to_datetime(['2025-01-15 09:10:00', '2025-01-15 07:05:00', '2025-01-15 09:50:00', '2025-01-15 07:30:00'])})\n_c = _pd.DataFrame({'trip_id': [9], 'pickup_at': _pd.to_datetime(['2025-01-15 23:59:00'])})\nresult = [busiest_hour_cached(_b, '_b.cache'), busiest_hour_cached(_c, '_c.cache')]", expected: pv([7, 23]) },
        ],
        files: { "trips.csv": TRIPS_CSV },
      },
    },
  },
  {
    id: "PY-Q45-06",
    version: 2,
    slug: "duckdb-trips-per-hour",
    title: "Trips per hour, straight from the file",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "conversion", "dict-comp", "dict-literal", "duck-ask", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-mutate", "membership", "print-call", "print-text", "string-format", "string-index", "top-level-indent"],
    packages: DUCK,
    prompt: "Write `trips_per_hour(csv_path)`: with one DuckDB query over the CSV file, count trips per pickup hour and return `{hour: count}` for the hours that have trips. (DuckDB reads `pickup_at` from the file as a timestamp; `hour(pickup_at)` extracts the hour.)",
    spec: [
      ["Function", "`trips_per_hour(csv_path)`"],
      ["Returns", "a dictionary from hour (int) to number of trips (int)"],
    ],
    hiddenKinds: ["trips across midnight", "a single trip", "a header with no rows"],
    hints: [
      "The file path goes in the FROM clause, in quotes.",
      "Group by the hour of the pickup time and count.",
      "`fetchall()` gives (hour, count) pairs to put in a dictionary.",
    ],
    explanation: "`duckdb.sql(f\"SELECT hour(pickup_at) AS h, COUNT(*) FROM '{csv_path}' GROUP BY h\")` reads and aggregates the file in one step; the path is part of the query's FROM clause (a table name, not a value, so it can't be a `?` parameter). `fetchall()` returns tuples that convert directly to a dictionary.",
    code: {
      starter: src`
import duckdb

def trips_per_hour(csv_path):
    return {}

print(trips_per_hour("trips.csv"))
`,
      answer: src`
import duckdb

def trips_per_hour(csv_path):
    rows = duckdb.sql(f"SELECT hour(pickup_at) AS h, COUNT(*) AS n FROM '{csv_path}' GROUP BY h ORDER BY h").fetchall()
    return {int(h): int(n) for h, n in rows}

print(trips_per_hour("trips.csv"))
`,
      alternatives: [
        src`
import duckdb

def trips_per_hour(csv_path):
    trips = duckdb.read_csv(csv_path)
    counts = {}
    for hour, n in duckdb.sql("SELECT EXTRACT(hour FROM pickup_at), COUNT(*) FROM trips GROUP BY 1").fetchall():
        counts[int(hour)] = int(n)
    return counts
`,
      ],
      wrong: [
        {
          code: src`
import duckdb

def trips_per_hour(csv_path):
    rows = duckdb.sql(f"SELECT minute(pickup_at) AS h, COUNT(*) AS n FROM '{csv_path}' GROUP BY h").fetchall()
    return {int(h): int(n) for h, n in rows}
`,
          fails: ["returns"],
          why: "it groups by the minute instead of the hour",
        },
        {
          code: src`
import duckdb

def trips_per_hour(csv_path):
    rows = duckdb.sql(f"SELECT hour(pickup_at) AS h, COUNT(DISTINCT payment_type_id) AS n FROM '{csv_path}' GROUP BY h").fetchall()
    return {int(h): int(n) for h, n in rows}
`,
          fails: ["returns"],
          why: "it counts distinct payment types per hour, not trips",
        },
      ],
      task: {
        packages: DUCK,
        files: {
          "trips.csv": TRIPS_CSV,
          "midnight.csv": "trip_id,pickup_at,payment_type_id\n1,2025-01-15 23:58:00,1\n2,2025-01-16 00:01:00,1\n3,2025-01-16 00:30:00,2\n",
          "one.csv": "trip_id,pickup_at,payment_type_id\n1,2025-01-15 13:00:00,1\n",
        },
        checks: [
          fn("returns", "trips_per_hour", [
            example(["trips.csv"], { t: "dict", entries: [[{ t: "int", v: "0" }, { t: "int", v: "11" }], [{ t: "int", v: "1" }, { t: "int", v: "3" }]] }),
            example(["one.csv"], { t: "dict", entries: [[{ t: "int", v: "13" }, { t: "int", v: "1" }]] }),
            example(["midnight.csv"], { t: "dict", entries: [[{ t: "int", v: "23" }, { t: "int", v: "1" }], [{ t: "int", v: "0" }, { t: "int", v: "2" }]] }),
            hiddenCase("trips across midnight", ["midnight.csv"], { t: "dict", entries: [[{ t: "int", v: "0" }, { t: "int", v: "2" }], [{ t: "int", v: "23" }, { t: "int", v: "1" }]] }),
            hiddenCase("a single trip", ["one.csv"], { t: "dict", entries: [[{ t: "int", v: "13" }, { t: "int", v: "1" }]] }),
            hiddenCase("the full sample", ["trips.csv"], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "int", v: "3" }], [{ t: "int", v: "0" }, { t: "int", v: "11" }]] }),
          ], { label: "trips_per_hour() counts trips per pickup hour" }),
        ],
      },
    },
  },
  {
    id: "PY-Q45-10",
    version: 2,
    slug: "largest-fare-in-chunks",
    title: "The largest fare, chunk by chunk",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "list-index", "list-literal", "logical", "membership", "nested-loop", "none-value", "pd-chunk", "pd-frame", "pd-loc", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "tuple-literal", "tuple-unpack", "zip-call"],
    packages: PDONLY,
    prompt: "Write `largest_fare(path, chunksize)`: read the trips CSV in chunks (only `trip_id` and `fare_amount`) and return `(trip_id, fare_amount)` for the trip with the largest fare. On a tie, return the trip that appears first in the file. An empty file gives `None`.",
    spec: [
      ["Function", "`largest_fare(path, chunksize)`"],
      ["Returns", "a tuple `(trip_id, fare)`, or `None`"],
    ],
    hiddenKinds: ["a tie across two chunks", "the maximum in the last chunk", "an empty file"],
    hints: [
      "Keep the best trip so far between chunks.",
      "In each chunk, find its largest fare and where it is.",
      "Replace the best only when a chunk's maximum is strictly larger, so the earlier trip wins ties.",
    ],
    explanation: "The maximum of chunk maxima is the overall maximum, so one best-so-far pair is enough. `idxmax` gives the label of a chunk's first largest value; replacing the best only on a strictly larger fare keeps the earliest trip on ties, even across chunks.",
    code: {
      starter: src`
import pandas as pd

def largest_fare(path, chunksize):
    return None

print(largest_fare("trips.csv", 4))
`,
      answer: src`
import pandas as pd

def largest_fare(path, chunksize):
    best = None
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_id", "fare_amount"]):
        if len(chunk) == 0:
            continue
        top = chunk["fare_amount"].idxmax()
        fare = float(chunk.loc[top, "fare_amount"])
        if best is None or fare > best[1]:
            best = (int(chunk.loc[top, "trip_id"]), fare)
    return best

print(largest_fare("trips.csv", 4))
`,
      alternatives: [
        src`
import pandas as pd

def largest_fare(path, chunksize):
    best_id, best_fare = None, None
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_id", "fare_amount"]):
        for trip_id, fare in zip(chunk["trip_id"], chunk["fare_amount"]):
            if best_fare is None or fare > best_fare:
                best_id, best_fare = int(trip_id), float(fare)
    return None if best_id is None else (best_id, best_fare)
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def largest_fare(path, chunksize):
    best = None
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_id", "fare_amount"]):
        top = chunk["fare_amount"].idxmax()
        fare = float(chunk.loc[top, "fare_amount"])
        if best is None or fare >= best[1]:
            best = (int(chunk.loc[top, "trip_id"]), fare)
    return best
`,
          fails: ["returns"],
          why: "`>=` lets a later chunk's equal fare replace the earlier trip",
        },
        {
          code: src`
import pandas as pd

def largest_fare(path, chunksize):
    best = None
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_id", "fare_amount"]):
        top = chunk["fare_amount"].idxmax()
        best = (int(chunk.loc[top, "trip_id"]), float(chunk.loc[top, "fare_amount"]))
    return best
`,
          fails: ["returns"],
          why: "every chunk overwrites the answer, so it returns the last chunk's maximum",
        },
      ],
      task: {
        packages: PDONLY,
        files: {
          "trips.csv": TRIPS_CSV,
          "tie.csv": "trip_id,fare_amount\n1,10.0\n2,30.0\n3,5.0\n4,30.0\n",
          "late.csv": "trip_id,fare_amount\n1,10.0\n2,9.0\n3,99.5\n",
          "empty.csv": "trip_id,fare_amount\n",
        },
        checks: [
          fn("returns", "largest_fare", [
            example(["trips.csv", 4], py_tuple(16132, 42.9)),
            example(["trips.csv", 14], py_tuple(16132, 42.9)),
            example(["late.csv", 1], py_tuple(3, 99.5)),
            hiddenCase("a tie across two chunks", ["tie.csv", 2], py_tuple(2, 30.0)),
            hiddenCase("the maximum in the last chunk", ["late.csv", 2], py_tuple(3, 99.5)),
            hiddenCase("an empty file", ["empty.csv", 3], null),
          ], { label: "largest_fare() finds the first trip with the largest fare across chunks", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q45-12",
    version: 2,
    slug: "duckdb-busy-zones",
    title: "Busy pickup zones with DuckDB",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "boolean", "comparison", "dict-lookup", "duck-ask", "function-def", "function-doc", "function-param", "function-return", "import-alias", "import-module", "list-index", "list-literal", "pd-filter", "pd-frame", "pd-loc", "print-call", "print-several", "string-index", "top-level-indent"],
    packages: DUCK,
    prompt: "Write `busy_zones(trips, zones, min_trips)`: with one DuckDB query over the two DataFrames, return a DataFrame with `zone_name`, `trips` and `avg_fare` (mean `fare_amount`, rounded to 2 decimals) for pickup zones with **at least** `min_trips` trips, ordered by `trips` (most first), then `zone_name`. Only zones listed in `zones` appear.",
    spec: [
      ["Function", "`busy_zones(trips, zones, min_trips)`"],
      ["Returns", "a DataFrame with columns `zone_name, trips, avg_fare`"],
    ],
    hiddenKinds: ["a zone with exactly the minimum", "a minimum no zone reaches", "zones tied on trips"],
    hints: [
      "Join on the zone ID, group by the zone name.",
      "A condition on a group's count goes in `HAVING`, not `WHERE`.",
      "The minimum is a value: DuckDB accepts `?` with `duckdb.execute(sql, [value])`, or a Python number formatted in; then order by two keys.",
    ],
    explanation: "`JOIN ... GROUP BY z.zone_name HAVING COUNT(*) >= ?` keeps zones with enough trips; `WHERE` runs before grouping and can't see counts. Ordering by `trips DESC, zone_name` makes ties deterministic. Passing the minimum as a parameter keeps the SQL fixed.",
    code: {
      starter: src`
import duckdb
import pandas as pd

def busy_zones(trips, zones, min_trips):
    return trips

trips = pd.read_csv("trips.csv")
zones = pd.read_csv("zones.csv")
print(busy_zones(trips, zones, 2))
`,
      answer: src`
import duckdb
import pandas as pd

def busy_zones(trips, zones, min_trips):
    query = """
        SELECT z.zone_name, COUNT(*) AS trips, ROUND(AVG(t.fare_amount), 2) AS avg_fare
        FROM trips AS t JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY z.zone_name
        HAVING COUNT(*) >= ?
        ORDER BY trips DESC, z.zone_name
    """
    return duckdb.execute(query, [min_trips]).df()

trips = pd.read_csv("trips.csv")
zones = pd.read_csv("zones.csv")
print(busy_zones(trips, zones, 2))
`,
      alternatives: [
        src`
import duckdb

def busy_zones(trips, zones, min_trips):
    grouped = duckdb.sql("""
        SELECT z.zone_name, COUNT(*) AS trips, ROUND(AVG(t.fare_amount), 2) AS avg_fare
        FROM trips t JOIN zones z ON t.pickup_zone_id = z.zone_id
        GROUP BY 1
    """).df()
    kept = grouped[grouped["trips"] >= min_trips]
    return kept.sort_values(["trips", "zone_name"], ascending=[False, True])
`,
      ],
      wrong: [
        {
          code: src`
import duckdb

def busy_zones(trips, zones, min_trips):
    return duckdb.execute("""
        SELECT z.zone_name, COUNT(*) AS trips, ROUND(AVG(t.fare_amount), 2) AS avg_fare
        FROM trips AS t JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY z.zone_name
        HAVING COUNT(*) > ?
        ORDER BY trips DESC, z.zone_name
    """, [min_trips]).df()
`,
          fails: ["rows", "rows-hidden"],
          why: "`>` drops zones with exactly the minimum number of trips",
        },
        {
          code: src`
import duckdb

def busy_zones(trips, zones, min_trips):
    return duckdb.execute("""
        SELECT z.zone_name, COUNT(*) AS trips, ROUND(AVG(t.fare_amount), 2) AS avg_fare
        FROM trips AS t JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY z.zone_name
        HAVING COUNT(*) >= ?
        ORDER BY trips DESC
    """, [min_trips]).df()
`,
          fails: ["rows", "rows-hidden"],
          why: "zones tied on trips come out in no fixed order",
        },
      ],
      task: {
        packages: DUCK,
        files: {
          "trips.csv": TRIPS_CSV,
          "zones.csv": "zone_id,zone_name,borough\n114,Greenwich Village South,Manhattan\n186,Penn Station/Madison Sq West,Manhattan\n263,Yorkville West,Manhattan\n48,Clinton East,Manhattan\n",
        },
        checks: [
          frameRows("rows", "busy_zones() keeps zones with at least the minimum, busiest first", "busy_zones(_pd.read_csv('trips.csv'), _pd.read_csv('zones.csv'), 1)", [
            { zone_name: "Greenwich Village South", trips: 2, avg_fare: 29.25 },
            { zone_name: "Clinton East", trips: 1, avg_fare: 7.9 },
            { zone_name: "Penn Station/Madison Sq West", trips: 1, avg_fare: 40.8 },
            { zone_name: "Yorkville West", trips: 1, avg_fare: 5.1 },
          ], { setup: "import pandas as _pd", show: "busy_zones(trips, zones, 1)", compare: loose }),
          frameRows("rows-hidden", "Works for other minimums and zones (exactly the minimum, ties, no zone qualifying)", "_pd.concat([busy_zones(_t, _z, 2), busy_zones(_t, _z, 5)])", [
            { zone_name: "Alpha", trips: 2, avg_fare: 15.0 },
            { zone_name: "Beta", trips: 2, avg_fare: 7.5 },
          ], { hidden: true, compare: loose, setup: "import pandas as _pd\n_t = _pd.DataFrame({'pickup_zone_id': [2, 1, 2, 1, 3], 'fare_amount': [5.0, 10.0, 10.0, 20.0, 1.0]})\n_z = _pd.DataFrame({'zone_id': [1, 2, 3], 'zone_name': ['Alpha', 'Beta', 'Gamma'], 'borough': ['X', 'X', 'X']})" }),
        ],
      },
    },
  },
  {
    id: "PY-Q45-13",
    version: 2,
    slug: "zone-name-with-apostrophe",
    title: "The zone name with an apostrophe",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "boolean", "comparison", "conditional-expr", "conversion", "dict-lookup", "duck-ask", "function-def", "function-param", "function-return", "identity", "if-statement", "import-alias", "import-module", "len-call", "none-value", "pd-frame", "pd-loc", "print-call", "print-several", "print-text", "sqlite-call", "string-format", "string-index", "top-level-indent", "tuple-literal"],
    packages: DUCK,
    prompt: "`zone_id_for` looks up a zone's ID by its exact name in a SQLite table. It works for most zones but crashes for `Eltingville/Annadale/Prince's Bay` with `OperationalError` (or `DatabaseError`). Fix it so any name works, and return `None` for a name that isn't in the table.",
    spec: [
      ["Function", "`zone_id_for(conn, name)`"],
      ["conn", "a sqlite3 connection with a table `zones(zone_id, zone_name, borough)`"],
      ["Returns", "the zone ID (int), or `None`"],
    ],
    hiddenKinds: ["a name containing a quote", "an unknown name", "a name that looks like SQL"],
    hints: [
      "Print the SQL text the function builds for the failing name.",
      "The apostrophe ends the quoted string early.",
      "Pass the name as a `?` parameter instead of putting it in the text.",
    ],
    explanation: "Pasting the name into quotes breaks on its apostrophe (and lets a name like `x' OR '1'='1` change the query). With a `?` placeholder, the name is sent as a value and can contain any characters. When nothing matches, the result is empty, so the function returns `None`.",
    code: {
      starter: src`
import sqlite3
import pandas as pd

def zone_id_for(conn, name):
    found = pd.read_sql_query(f"SELECT zone_id FROM zones WHERE zone_name = '{name}'", conn)
    return int(found["zone_id"].iloc[0])

conn = sqlite3.connect(":memory:")
pd.read_csv("zones.csv").to_sql("zones", conn, index=False)
print(zone_id_for(conn, "Greenwich Village South"))
`,
      answer: src`
import sqlite3
import pandas as pd

def zone_id_for(conn, name):
    found = pd.read_sql_query("SELECT zone_id FROM zones WHERE zone_name = ?", conn, params=(name,))
    if len(found) == 0:
        return None
    return int(found["zone_id"].iloc[0])

conn = sqlite3.connect(":memory:")
pd.read_csv("zones.csv").to_sql("zones", conn, index=False)
print(zone_id_for(conn, "Greenwich Village South"))
`,
      alternatives: [
        src`
def zone_id_for(conn, name):
    row = conn.execute("SELECT zone_id FROM zones WHERE zone_name = ?", (name,)).fetchone()
    return None if row is None else int(row[0])
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def zone_id_for(conn, name):
    safe = name.replace("'", "")
    found = pd.read_sql_query(f"SELECT zone_id FROM zones WHERE zone_name = '{safe}'", conn)
    if len(found) == 0:
        return None
    return int(found["zone_id"].iloc[0])
`,
          fails: ["returns"],
          why: "removing the apostrophe no longer crashes, but it changes the name, so the zone is never found",
        },
        {
          code: src`
import pandas as pd

def zone_id_for(conn, name):
    found = pd.read_sql_query("SELECT zone_id FROM zones WHERE zone_name = ?", conn, params=(name,))
    return int(found["zone_id"].iloc[0])
`,
          fails: ["returns-hidden"],
          why: "the parameter fixes the quote, but an unknown name raises IndexError instead of returning None",
        },
      ],
      task: {
        packages: DUCK,
        files: { "zones.csv": ZONES_CSV },
        checks: [
          { kind: "expr", id: "returns", label: "zone_id_for() finds any zone by its exact name, or returns None", show: "zone_id_for(conn, \"Eltingville/Annadale/Prince's Bay\")", expr: "import sqlite3 as _sq\nimport pandas as _pd\n_c = _sq.connect(':memory:')\n_pd.read_csv('zones.csv').to_sql('zones', _c, index=False)\nresult = [zone_id_for(_c, 'Greenwich Village South'), zone_id_for(_c, \"Eltingville/Annadale/Prince's Bay\")]", expected: pv([114, 84]) },
          { kind: "expr", id: "returns-hidden", label: "Works for other names (an unknown name, a name that looks like SQL)", hidden: true, expr: "import sqlite3 as _sq\nimport pandas as _pd\n_c = _sq.connect(':memory:')\n_pd.read_csv('zones.csv').to_sql('zones', _c, index=False)\nresult = [zone_id_for(_c, 'Atlantis'), zone_id_for(_c, \"x' OR '1'='1\")]", expected: pv([null, null]) },
        ],
      },
    },
  },
  {
    id: "PY-Q45-16",
    version: 2,
    slug: "seeded-sample-per-airline",
    title: "A seeded sample of flights per airline",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "assignment", "boolean", "for-loop", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-comp", "list-literal", "list-mutate", "membership", "pd-frame", "pd-group", "pd-loc", "pd-merge", "print-call", "print-several", "top-level-indent"],
    packages: PDONLY,
    prompt: "An audit reviews up to `per_airline` flights from each airline. Write `audit_flights(flights, per_airline, seed)`: from each airline take `per_airline` flights at random with `sample(n=..., random_state=seed)`, or all of its flights if it has fewer, and return those rows ordered by `flight_id`. The same seed must always give the same rows.",
    spec: [
      ["Function", "`audit_flights(flights, per_airline, seed)`"],
      ["Returns", "a DataFrame with the same columns, rows ordered by `flight_id`"],
    ],
    hiddenKinds: ["an airline with fewer flights than requested", "a sample size of 1"],
    hints: [
      "Work airline by airline: `groupby` and a loop, or `groupby(...).sample(...)`.",
      "A group smaller than the sample size can't give `n` rows: take `min(n, len(group))`.",
      "Join the samples (`pd.concat`) and sort by `flight_id`.",
    ],
    explanation: "Looping over `flights.groupby(\"airline_code\")` gives each airline's rows; `sample(n=min(per_airline, len(group)), random_state=seed)` draws reproducibly without failing on small groups. Sorting by `flight_id` makes the output order independent of how the groups and samples came out.",
    code: {
      starter: src`
import pandas as pd

def audit_flights(flights, per_airline, seed):
    return flights

flights = pd.read_csv("flights.csv")
print(audit_flights(flights, 2, 1))
`,
      answer: src`
import pandas as pd

def audit_flights(flights, per_airline, seed):
    picked = []
    for airline, group in flights.groupby("airline_code"):
        picked.append(group.sample(n=min(per_airline, len(group)), random_state=seed))
    return pd.concat(picked).sort_values("flight_id")

flights = pd.read_csv("flights.csv")
print(audit_flights(flights, 2, 1))
`,
      alternatives: [
        src`
import pandas as pd

def audit_flights(flights, per_airline, seed):
    parts = [g.sample(n=min(per_airline, len(g)), random_state=seed) for _, g in flights.groupby("airline_code")]
    return pd.concat(parts).sort_values("flight_id").reset_index(drop=True)
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def audit_flights(flights, per_airline, seed):
    picked = []
    for airline, group in flights.groupby("airline_code"):
        picked.append(group.head(per_airline))
    return pd.concat(picked).sort_values("flight_id")
`,
          fails: ["rows", "rows-hidden"],
          why: "the first flights of each airline are not a random sample",
        },
        {
          code: src`
import pandas as pd

def audit_flights(flights, per_airline, seed):
    picked = []
    for airline, group in flights.groupby("airline_code"):
        picked.append(group.sample(n=min(per_airline, len(group)), random_state=seed))
    return pd.concat(picked)
`,
          fails: ["rows", "rows-hidden"],
          why: "the rows come out grouped by airline instead of ordered by flight",
        },
      ],
      task: {
        packages: PDONLY,
        files: { "flights.csv": FLIGHTS_CSV },
        checks: [
          frameRows("rows", "audit_flights() samples per airline with the seed, ordered by flight", "audit_flights(_pd.read_csv('flights.csv'), 2, 1)[['flight_id', 'airline_code']]", [
            { flight_id: 12207, airline_code: "UA" },
            { flight_id: 12208, airline_code: "MQ" },
            { flight_id: 12211, airline_code: "AA" },
            { flight_id: 12213, airline_code: "MQ" },
            { flight_id: 12214, airline_code: "OO" },
            { flight_id: 12215, airline_code: "AA" },
            { flight_id: 12217, airline_code: "DL" },
            { flight_id: 12220, airline_code: "DL" },
            { flight_id: 12221, airline_code: "WN" },
          ], { setup: "import pandas as _pd", show: "audit_flights(flights, 2, 1)" }),
          frameRows("rows-hidden", "Works for other sizes and seeds (a sample of 1, small airlines)", "audit_flights(_pd.read_csv('flights.csv'), 1, 7)[['flight_id']]", [
            { flight_id: 12207 }, { flight_id: 12208 }, { flight_id: 12214 }, { flight_id: 12216 }, { flight_id: 12217 }, { flight_id: 12221 },
          ], { hidden: true, setup: "import pandas as _pd" }),
        ],
      },
    },
  },
  {
    id: "PY-Q45-19",
    version: 2,
    slug: "check-a-csv-export",
    title: "Check a CSV export before sending it",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["any-call", "arithmetic", "assignment", "comp-if", "comparison", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "pd-filter", "pd-frame", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack", "with-statement"],
    packages: PDONLY,
    prompt: "Before a summary file is sent to finance, a script checks it. Write `export_problems(path, columns)`: read the CSV **as text** and return a list of problems in this order: `\"index column\"` if the first column is unnamed (pandas reads it as `Unnamed: 0`); `\"missing: <name>\"` for each expected column that isn't there, in the order given; `\"extra: <name>\"` for each column that isn't expected (ignoring the index column), in file order; `\"too many decimals: <name>\"` for each expected column containing a value with more than 2 digits after the decimal point.",
    spec: [
      ["Function", "`export_problems(path, columns)`"],
      ["columns", "the expected column names, e.g. `[\"payment_type_id\", \"trips\", \"revenue\"]`"],
      ["Returns", "a list of problem texts; `[]` for a clean file"],
    ],
    hiddenKinds: ["a file with every problem", "a value with exactly 2 decimals", "a value padded with trailing zeros"],
    hints: [
      "Read every column as text (`dtype=str`) so you see the digits that were written.",
      "Column problems come from comparing two lists of names.",
      "A value has too many decimals when the part after the dot is longer than 2 characters.",
    ],
    explanation: "Reading with `dtype=str` keeps values exactly as written, so `6.130909090909091` isn't reformatted. The index column shows up as `Unnamed: 0`; missing and extra columns come from comparing name lists in the stated orders; decimals are checked with the text after the `.`.",
    code: {
      starter: src`
import pandas as pd

def export_problems(path, columns):
    return []

print(export_problems("summary.csv", ["payment_type_id", "trips", "revenue", "avg_tip"]))
`,
      answer: src`
import pandas as pd

def export_problems(path, columns):
    table = pd.read_csv(path, dtype=str)
    problems = []
    names = list(table.columns)
    if names and names[0].startswith("Unnamed"):
        problems.append("index column")
        names = names[1:]
    for name in columns:
        if name not in names:
            problems.append(f"missing: {name}")
    for name in names:
        if name not in columns:
            problems.append(f"extra: {name}")
    for name in columns:
        if name in names:
            decimals = table[name].dropna().str.split(".").str[1].fillna("")
            if (decimals.str.len() > 2).any():
                problems.append(f"too many decimals: {name}")
    return problems

print(export_problems("summary.csv", ["payment_type_id", "trips", "revenue", "avg_tip"]))
`,
      alternatives: [
        src`
import csv

def export_problems(path, columns):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    header, body = rows[0], rows[1:]
    problems = []
    offset = 0
    if header and header[0] == "":
        problems.append("index column")
        offset = 1
    names = header[offset:]
    problems += [f"missing: {c}" for c in columns if c not in names]
    problems += [f"extra: {c}" for c in names if c not in columns]
    for c in columns:
        if c in names:
            i = header.index(c)
            if any("." in r[i] and len(r[i].split(".")[1]) > 2 for r in body):
                problems.append(f"too many decimals: {c}")
    return problems
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def export_problems(path, columns):
    table = pd.read_csv(path)
    problems = []
    names = list(table.columns)
    if names and names[0].startswith("Unnamed"):
        problems.append("index column")
        names = names[1:]
    problems += [f"missing: {c}" for c in columns if c not in names]
    problems += [f"extra: {c}" for c in names if c not in columns]
    for name in columns:
        if name in names:
            text = table[name].astype(str).str.split(".").str[1].fillna("")
            if (text.str.len() > 2).any():
                problems.append(f"too many decimals: {name}")
    return problems
`,
          fails: ["problems-hidden"],
          why: "reading as numbers re-formats values (`3.1400` becomes `3.14`), so the digits checked aren't the ones in the file",
        },
        {
          code: src`
import pandas as pd

def export_problems(path, columns):
    table = pd.read_csv(path, dtype=str)
    problems = []
    names = list(table.columns)
    problems += [f"missing: {c}" for c in columns if c not in names]
    problems += [f"extra: {c}" for c in names if c not in columns]
    return problems
`,
          fails: ["messy", "problems-hidden"],
          why: "the index column is reported as an extra column and decimals are never checked",
        },
      ],
      task: {
        packages: PDONLY,
        files: {
          "summary.csv": "payment_type_id,trips,revenue,avg_tip\n0,3,55.34,0.00\n1,11,384.02,6.13\n",
          "messy.csv": ",payment_type_id,trips,revenue,avg_tip\n0,0,3,55.34,0.0\n1,1,11,384.02,6.130909090909091\n",
          "worst.csv": ",trips,note\n0,3,ok\n1,11.125,check\n",
          "two.csv": "revenue\n1.50\n2.25\n",
          "pad.csv": "revenue\n3.1400\n2.25\n",
        },
        checks: [
          { kind: "expr", id: "clean", label: "A clean export has no problems", show: "export_problems('summary.csv', [...])", expr: "result = export_problems('summary.csv', ['payment_type_id', 'trips', 'revenue', 'avg_tip'])", expected: pv([]) },
          { kind: "expr", id: "messy", label: "An index column and long decimals are reported", show: "export_problems('messy.csv', [...])", expr: "result = export_problems('messy.csv', ['payment_type_id', 'trips', 'revenue', 'avg_tip'])", expected: pv(["index column", "too many decimals: avg_tip"]) },
          { kind: "expr", id: "problems-hidden", label: "Works for other files (every problem, exactly two decimals)", hidden: true, expr: "result = [export_problems('worst.csv', ['payment_type_id', 'trips']), export_problems('two.csv', ['revenue']), export_problems('pad.csv', ['revenue'])]", expected: pv([["index column", "missing: payment_type_id", "extra: note", "too many decimals: trips"], [], ["too many decimals: revenue"]]) },
        ],
      },
    },
  },
  {
    id: "PY-Q45-20",
    version: 2,
    slug: "airline-delays-chunked",
    title: "Per-airline delay statistics from a stream",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "bitwise", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-loop", "pd-chunk", "pd-filter", "pd-frame", "pd-group", "pd-missing", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "tuple-literal", "tuple-unpack", "zip-call"],
    packages: PDONLY,
    prompt: "Write `delay_stats(path, chunksize)`: read the flights CSV in chunks and return, for each airline with at least one operated flight that has an `arrival_delay`, `{\"flights\": count, \"mean_delay\": mean, \"late\": number with arrival_delay > 15}`. Cancelled flights (`cancelled == 1`) and missing delays are left out. The result must be the same for every chunk size.",
    spec: [
      ["Function", "`delay_stats(path, chunksize)`"],
      ["Returns", "`{airline_code: {\"flights\": int, \"mean_delay\": float, \"late\": int}}`"],
    ],
    hiddenKinds: ["chunks of 1", "an airline split across chunks", "an airline with only cancelled flights"],
    hints: [
      "Keep three running numbers per airline: count, sum of delays, number late.",
      "Filter each chunk first, then group it and add its partial results.",
      "Compute the means only after the last chunk.",
    ],
    explanation: "Counts, sums and counts of late flights all combine by adding, so each chunk contributes its partial group results to running totals; the mean is sum / count at the end. Averaging chunk means would depend on where chunks split, and an airline whose flights were all cancelled never enters the totals.",
    code: {
      starter: src`
import pandas as pd

def delay_stats(path, chunksize):
    return {}

print(delay_stats("flights.csv", 4))
`,
      answer: src`
import pandas as pd

def delay_stats(path, chunksize):
    totals = {}
    columns = ["airline_code", "arrival_delay", "cancelled"]
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=columns):
        flown = chunk[(chunk["cancelled"] == 0) & chunk["arrival_delay"].notna()]
        flown = flown.assign(late=flown["arrival_delay"] > 15)
        part = flown.groupby("airline_code").agg(n=("arrival_delay", "size"), s=("arrival_delay", "sum"), late=("late", "sum"))
        for code, row in part.iterrows():
            n, s, late = totals.get(code, (0, 0.0, 0))
            totals[code] = (n + int(row["n"]), s + float(row["s"]), late + int(row["late"]))
    return {code: {"flights": n, "mean_delay": s / n, "late": late} for code, (n, s, late) in totals.items()}

print(delay_stats("flights.csv", 4))
`,
      alternatives: [
        src`
import pandas as pd

def delay_stats(path, chunksize):
    counts, sums, lates = {}, {}, {}
    for chunk in pd.read_csv(path, chunksize=chunksize):
        for code, delay, cancelled in zip(chunk["airline_code"], chunk["arrival_delay"], chunk["cancelled"]):
            if cancelled == 1 or pd.isna(delay):
                continue
            counts[code] = counts.get(code, 0) + 1
            sums[code] = sums.get(code, 0) + delay
            lates[code] = lates.get(code, 0) + (1 if delay > 15 else 0)
    return {c: {"flights": counts[c], "mean_delay": sums[c] / counts[c], "late": lates[c]} for c in counts}
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def delay_stats(path, chunksize):
    parts = {}
    for chunk in pd.read_csv(path, chunksize=chunksize):
        flown = chunk[chunk["cancelled"] == 0]
        for code, group in flown.groupby("airline_code"):
            parts.setdefault(code, []).append((len(group), group["arrival_delay"].mean(), int((group["arrival_delay"] > 15).sum())))
    result = {}
    for code, items in parts.items():
        result[code] = {
            "flights": sum(n for n, _, _ in items),
            "mean_delay": sum(m for _, m, _ in items) / len(items),
            "late": sum(l for _, _, l in items),
        }
    return result
`,
          fails: ["returns"],
          why: "averaging chunk means makes the result depend on the chunk size",
        },
        {
          code: src`
import pandas as pd

def delay_stats(path, chunksize):
    totals = {}
    for chunk in pd.read_csv(path, chunksize=chunksize):
        part = chunk.groupby("airline_code").agg(n=("arrival_delay", "size"), s=("arrival_delay", "sum"))
        for code, row in part.iterrows():
            n, s = totals.get(code, (0, 0.0))
            totals[code] = (n + int(row["n"]), s + float(row["s"]))
    return {code: {"flights": n, "mean_delay": s / n, "late": 0} for code, (n, s) in totals.items()}
`,
          fails: ["returns"],
          why: "cancelled flights are counted (their missing delay adds 0 to the sum) and lateness is never counted",
        },
      ],
      task: {
        packages: PDONLY,
        files: {
          "flights.csv": FLIGHTS_CSV,
          "cancelled.csv": "flight_id,airline_code,scheduled_departure,arrival_delay,cancelled\n1,NK,2025-01-10 05:00,,1\n2,B6,2025-01-10 06:00,20,0\n",
        },
        checks: [
          fn("returns", "delay_stats", [
            example(["flights.csv", 4], { AA: { flights: 5, mean_delay: 32.8, late: 2 }, DL: { flights: 3, mean_delay: 2.3333333333333335, late: 1 }, MQ: { flights: 2, mean_delay: 27.0, late: 1 }, OO: { flights: 1, mean_delay: -22.0, late: 0 }, UA: { flights: 1, mean_delay: -4.0, late: 0 }, WN: { flights: 1, mean_delay: -49.0, late: 0 } }),
            example(["flights.csv", 15], { AA: { flights: 5, mean_delay: 32.8, late: 2 }, DL: { flights: 3, mean_delay: 2.3333333333333335, late: 1 }, MQ: { flights: 2, mean_delay: 27.0, late: 1 }, OO: { flights: 1, mean_delay: -22.0, late: 0 }, UA: { flights: 1, mean_delay: -4.0, late: 0 }, WN: { flights: 1, mean_delay: -49.0, late: 0 } }),
            example(["cancelled.csv", 1], { B6: { flights: 1, mean_delay: 20.0, late: 1 } }),
            hiddenCase("chunks of 1", ["flights.csv", 1], { AA: { flights: 5, mean_delay: 32.8, late: 2 }, DL: { flights: 3, mean_delay: 2.3333333333333335, late: 1 }, MQ: { flights: 2, mean_delay: 27.0, late: 1 }, OO: { flights: 1, mean_delay: -22.0, late: 0 }, UA: { flights: 1, mean_delay: -4.0, late: 0 }, WN: { flights: 1, mean_delay: -49.0, late: 0 } }),
            hiddenCase("an airline split across chunks", ["flights.csv", 3], { AA: { flights: 5, mean_delay: 32.8, late: 2 }, DL: { flights: 3, mean_delay: 2.3333333333333335, late: 1 }, MQ: { flights: 2, mean_delay: 27.0, late: 1 }, OO: { flights: 1, mean_delay: -22.0, late: 0 }, UA: { flights: 1, mean_delay: -4.0, late: 0 }, WN: { flights: 1, mean_delay: -49.0, late: 0 } }),
            hiddenCase("an airline with only cancelled flights", ["cancelled.csv", 5], { B6: { flights: 1, mean_delay: 20.0, late: 1 } }),
          ], { label: "delay_stats() combines chunk results exactly", compare: loose }),
        ],
      },
    },
  },
  {
    id: "PY-Q45-22",
    version: 2,
    slug: "seeded-generators-predict",
    title: "Seeds, generators and repeated draws",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "dict-literal", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-literal", "np-dtype", "pd-frame", "pd-loc", "print-call", "print-several", "reassignment", "repro-run", "top-level-indent"],
    packages: ["numpy", "pandas"],
    prompt: "Type exactly what this program prints. (You don't need to know the random numbers themselves; reason about which draws must be equal.)",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Two generators made with the same seed produce the same sequence.",
      "A generator continues its sequence: a second draw from it is a new part of the sequence.",
      "`sample(frac=1, random_state=s)` shuffles all rows; sorting puts them back.",
    ],
    explanation: "`a` and `b` have the same seed, so their first draws match; `a`'s second draw continues its sequence, so it differs from `b`'s first draw (and here equals `b`'s second). Shuffling with any seed and then sorting gives back the original order, so the fingerprints match.",
    predict: {
      program: src`
import hashlib
import numpy as np
import pandas as pd

a = np.random.default_rng(2025)
b = np.random.default_rng(2025)
first_a = a.integers(0, 10**6, size=3).tolist()
first_b = b.integers(0, 10**6, size=3).tolist()
second_a = a.integers(0, 10**6, size=3).tolist()
print(first_a == first_b, first_a == second_a, second_a == b.integers(0, 10**6, size=3).tolist())

trips = pd.DataFrame({"trip_id": [16126, 16127, 16128], "fare": [40.8, 7.2, 17.2]})
def fp(t):
    return hashlib.sha256(t.sort_values("trip_id").to_csv(index=False).encode()).hexdigest()
print(fp(trips) == fp(trips.sample(frac=1, random_state=4)), len(fp(trips)))
`,
      output: "True False True\nTrue 64\n",
      wrongPredictions: ["True True True\nTrue 64", "True False False\nTrue 64", "True False True\nFalse 64", "False False True\nTrue 64"],
    },
  },
];

function py_tuple(id: number, fare: number) {
  return { t: "tuple" as const, items: [{ t: "int" as const, v: String(id) }, { t: "float" as const, v: fare }] };
}
