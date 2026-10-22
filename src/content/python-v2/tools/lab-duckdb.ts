import type { LabActivity } from "./lab";

/**
 * DuckDB activities for the Database Lab (appended to LAB_ACTIVITIES). Each reads real dataset files mounted under
 * data/ (CSV and Parquet), so DuckDB can query them directly; timings are measured by the program as it runs.
 */
export const DUCKDB_ACTIVITIES: LabActivity[] = [
  {
    id: "duckdb-query-files",
    title: "DuckDB: query CSV and Parquet files directly",
    group: "Data work",
    envs: ["flights"],
    data: { dataset: "D13", size: "standard", files: ["flights.csv",  "flights.parquet"] },
    goal: "Ask DuckDB questions straight from the dataset files: open a CSV with `read_csv()` and see the column types it guessed, then ask the same question of the Parquet file with `read_parquet()` and by its file name.",
    notice: "No table was created and nothing was imported: a file goes where a table name would. Opening the CSV is the slow step, because DuckDB guesses every column's type from the text; keeping it in a Python variable means later queries skip that. Parquet stores its types, so the same question on it takes milliseconds and gives the same answer.",
    python: `import time

import duckdb

# read_csv() opens a CSV file as something you can query: no import step, no CREATE TABLE.
start = time.perf_counter()
flights_csv = duckdb.read_csv("data/flights.csv")
print(f"Opened flights.csv in {(time.perf_counter() - start) * 1000:.0f} ms.")
print("Most of that is DuckDB reading the text to guess each column's type. Its guesses:")
for name, kind in list(zip(flights_csv.columns, flights_csv.types))[:8]:
    print(f"  {name:<20} {kind}")
print(f"  ... {len(flights_csv.columns)} columns in all")
print()

# SQL can use it by its Python name, and the guessing isn't repeated. (SELECT ... FROM 'data/flights.csv'
# works too, but it guesses the types again every time it runs.)
PER_AIRLINE = """
    SELECT airline_code, COUNT(*) AS flights, SUM(cancelled) AS cancelled
    FROM {source}
    GROUP BY airline_code
    ORDER BY flights DESC, airline_code
"""
from_csv = duckdb.sql(PER_AIRLINE.format(source="flights_csv"))
print("Busiest airlines, from the CSV:")
from_csv.limit(5).show()

# read_parquet() reads a Parquet file. Parquet stores the column types, so nothing is guessed.
# A file name in quotes also works on its own, right where a table name would go.
start = time.perf_counter()
from_parquet = duckdb.sql(PER_AIRLINE.format(source="read_parquet('data/flights.parquet')")).fetchall()
print(f"The same question on flights.parquet took {(time.perf_counter() - start) * 1000:.0f} ms.")
duckdb.sql("""
    SELECT COUNT(*) AS rows,
           MIN(flight_date) AS first_day,
           MAX(flight_date) AS last_day,
           ROUND(AVG(departure_delay), 1) AS avg_dep_delay
    FROM 'data/flights.parquet'
""").show()

# Both files hold the same flights, so both give the same answer.
print("Same answer from the CSV and the Parquet file:", from_csv.fetchall() == from_parquet)
`,
  },
  {
    id: "duckdb-joins",
    title: "DuckDB: joins and aggregations across files",
    group: "Data work",
    envs: ["flights"],
    data: { dataset: "D13", size: "standard", files: ["flights.parquet",  "airlines.csv",  "airports.csv"] },
    goal: "Join a Parquet file of flights to the airlines and airports CSV files, then build an on-time scorecard, the busiest routes and a per-airport ranking.",
    notice: "Views give the files short names, so the SQL reads like it would on tables. The routes query joins `airports` twice (origin and destination); `QUALIFY` keeps the top row of each window, which SQLite has no keyword for.",
    python: `import duckdb

con = duckdb.connect()
# Views give the files short names; each query still reads the files themselves.
con.sql("CREATE VIEW flights AS SELECT * FROM 'data/flights.parquet'")
con.sql("CREATE VIEW airlines AS SELECT * FROM 'data/airlines.csv'")
con.sql("CREATE VIEW airports AS SELECT * FROM 'data/airports.csv'")

print("On-time scorecard by airline (share of flights that landed within 15 minutes of schedule):")
con.sql("""
    SELECT a.airline_name,
           COUNT(*) AS flights,
           ROUND(100.0 * COUNT(*) FILTER (WHERE f.arrival_delay <= 15) / COUNT(f.arrival_delay), 1) AS on_time_pct,
           ROUND(100.0 * AVG(f.cancelled), 1) AS cancelled_pct
    FROM flights AS f
    JOIN airlines AS a USING (airline_code)
    GROUP BY a.airline_name
    ORDER BY on_time_pct DESC
""").show()

print()
print("Busiest routes, with both cities (two joins to the same airports table):")
con.sql("""
    SELECT f.origin || ' ' || o.city || '  ->  ' || f.destination || ' ' || d.city AS route,
           COUNT(*) AS flights,
           ROUND(AVG(f.arrival_delay), 1) AS avg_arr_delay
    FROM flights AS f
    JOIN airports AS o ON o.airport_code = f.origin
    JOIN airports AS d ON d.airport_code = f.destination
    GROUP BY route
    ORDER BY flights DESC
    LIMIT 8
""").show()

print()
print("Worst-delayed airline at each of the five busiest airports (a window function):")
con.sql("""
    WITH by_airline AS (
        SELECT origin, airline_code, COUNT(*) AS departures,
               ROUND(AVG(departure_delay), 1) AS avg_dep_delay
        FROM flights
        WHERE cancelled = 0
        GROUP BY origin, airline_code
        HAVING COUNT(*) >= 50
    ),
    busiest AS (
        SELECT origin FROM flights GROUP BY origin ORDER BY COUNT(*) DESC LIMIT 5
    )
    SELECT origin, airline_code, departures, avg_dep_delay
    FROM by_airline
    WHERE origin IN (SELECT origin FROM busiest)
    QUALIFY ROW_NUMBER() OVER (PARTITION BY origin ORDER BY avg_dep_delay DESC) = 1
    ORDER BY avg_dep_delay DESC
""").show()
`,
  },
  {
    id: "duckdb-python-api",
    title: "DuckDB from Python: connect, parameters, results",
    group: "Connect and query",
    envs: ["weather"],
    data: { dataset: "D07", size: "standard", files: ["daily_weather.parquet",  "stations.csv",  "cities.csv"] },
    goal: "Open a DuckDB connection, load tables from the files, and run queries with `?` and `$name` parameters. Read results with `fetchone()` and `fetchall()`, build a query step by step with `.sql()`, and hand one to pandas with `.df()`.",
    notice: "The same habits as sqlite3: a connection, `execute()` with parameters passed as data, rows back as tuples. Two things sqlite3 can't do: a relation you keep refining in Python before it runs, and querying a pandas DataFrame by its variable name.",
    python: `import duckdb

# A connection of your own (in memory). Tables you create live as long as it does.
con = duckdb.connect()
con.execute("CREATE TABLE weather AS SELECT * FROM read_parquet('data/daily_weather.parquet')")
con.execute("""
    CREATE TABLE stations AS
    SELECT s.station_id, s.station_name, c.city_name, c.state_code
    FROM read_csv('data/stations.csv') AS s
    JOIN read_csv('data/cities.csv') AS c USING (city_id)
""")

# execute() + fetchone(): one row back, as a tuple.
rows, first, last = con.execute("SELECT COUNT(*), MIN(observation_date), MAX(observation_date) FROM weather").fetchone()
print(f"{rows:,} daily observations from {first} to {last}")

# Parameters: ? takes values in order. The value is passed as data, never pasted into the SQL.
HOT_DAYS = """
    SELECT st.city_name || ', ' || st.state_code AS city, COUNT(*) AS days
    FROM weather AS w JOIN stations AS st USING (station_id)
    WHERE w.tmax_c >= ?
    GROUP BY city
    ORDER BY days DESC, city
    LIMIT 5
"""
for limit_c in (30, 35):
    print()
    print(f"Cities with the most days at {limit_c} C or hotter:")
    for city, days in con.execute(HOT_DAYS, [limit_c]).fetchall():
        print(f"  {city:<14} {days:>3} days")


# $name parameters, wrapped in a function you can call for any city.
def month_summary(city):
    return con.execute("""
        SELECT strftime(w.observation_date, '%Y-%m') AS month,
               ROUND(AVG(w.tmax_c), 1) AS avg_high_c,
               ROUND(SUM(w.precipitation_mm), 1) AS rain_mm
        FROM weather AS w JOIN stations AS st USING (station_id)
        WHERE st.city_name = $city
        GROUP BY month ORDER BY month
    """, {"city": city}).fetchall()


print()
print("month_summary('Phoenix')[:3] ->", month_summary("Phoenix")[:3])

# .sql() returns a relation: a query you can keep building on in Python before it runs.
wet = con.table("weather").filter("precipitation_mm > 0").join(con.table("stations"), "station_id")
print()
print("Days with rain, top 3 stations:")
wet.aggregate("station_name, COUNT(*) AS rainy_days", "station_name").order("rainy_days DESC").limit(3).show()

# .df() hands the result to pandas; DuckDB can also query a pandas DataFrame by its variable name.
by_city = con.sql("""
    SELECT st.city_name, st.state_code, ROUND(AVG(w.tmax_c), 1) AS avg_high_c, ROUND(AVG(w.tmin_c), 1) AS avg_low_c
    FROM weather AS w JOIN stations AS st USING (station_id)
    GROUP BY ALL
""").df()
by_city["range_c"] = (by_city["avg_high_c"] - by_city["avg_low_c"]).round(1)
print(type(by_city).__name__, by_city.shape)
display(duckdb.sql("SELECT * FROM by_city ORDER BY range_c DESC LIMIT 5").df())
`,
  },
  {
    id: "duckdb-vs-sqlite",
    title: "DuckDB vs SQLite: same answer, measured",
    group: "Speed and indexes",
    envs: ["flights"],
    data: { dataset: "D13", size: "standard", files: ["flights.parquet"] },
    goal: "Run one analytical query in SQLite (flights.db) and in DuckDB on the same 17,661 flights. Check the answers match row by row, then time each one seven times with `time.perf_counter()`.",
    notice: "Checking the answer comes first: a fast wrong answer is worth nothing. The times are measured on this run in this tab, not quoted. At this size both take a few milliseconds and SQLite may come out ahead; DuckDB's column engine pays off on bigger scans (try the bigger-file activity).",
    python: `import math
import sqlite3
import statistics
import time

import duckdb

# One analytical question: per airline, departures, average delay and the share delayed by more than 15 minutes.
QUESTION = """
    SELECT airline_code,
           COUNT(*) AS departures,
           AVG(departure_delay) AS avg_delay,
           AVG(CASE WHEN departure_delay > 15 THEN 1.0 ELSE 0.0 END) AS share_late
    FROM flights
    WHERE cancelled = 0
    GROUP BY airline_code
    ORDER BY airline_code
"""

lite = sqlite3.connect("__DB__")
duck = duckdb.connect()

# DuckDB gets the same rows: the flights.parquet file of the edition flights.db was built from.
start = time.perf_counter()
duck.execute("CREATE TABLE flights AS SELECT * FROM 'data/flights.parquet'")
load_ms = (time.perf_counter() - start) * 1000

rows_lite = lite.execute("SELECT COUNT(*) FROM flights").fetchone()[0]
rows_duck = duck.execute("SELECT COUNT(*) FROM flights").fetchone()[0]
print(f"Rows: SQLite {rows_lite:,}, DuckDB {rows_duck:,} (loaded from Parquet in {load_ms:.0f} ms, once)")

# 1. Same answer? Compare every row, allowing for floating-point rounding.
a = lite.execute(QUESTION).fetchall()
b = duck.execute(QUESTION).fetchall()
same = len(a) == len(b) and all(
    x[0] == y[0] and x[1] == y[1] and math.isclose(x[2], y[2], rel_tol=1e-9) and math.isclose(x[3], y[3], rel_tol=1e-9)
    for x, y in zip(a, b)
)
print("Same answer from both:", same)
for code, n, delay, late in b[:5]:
    print(f"  {code}  {n:>5} departures  avg delay {delay:5.1f} min  {late:.1%} late")
print("  ...")


# 2. How long? Run each one several times and keep every timing.
def timings(run, repeats=7):
    out = []
    for _ in range(repeats):
        t = time.perf_counter()
        run()
        out.append((time.perf_counter() - t) * 1000)
    return out


lite_ms = timings(lambda: lite.execute(QUESTION).fetchall())
duck_ms = timings(lambda: duck.execute(QUESTION).fetchall())
for name, ms in (("SQLite", lite_ms), ("DuckDB", duck_ms)):
    print(f"{name}: median {statistics.median(ms):6.2f} ms, fastest {min(ms):6.2f} ms   all: {', '.join(f'{m:.1f}' for m in ms)}")
print("These times were measured just now in this browser tab; run it again and they will move a little.")
`,
    sql: "SELECT airline_code,\n       COUNT(*) AS departures,\n       ROUND(AVG(departure_delay), 1) AS avg_delay,\n       ROUND(AVG(CASE WHEN departure_delay > 15 THEN 1.0 ELSE 0.0 END), 3) AS share_late\nFROM flights\nWHERE cancelled = 0\nGROUP BY airline_code\nORDER BY airline_code;",
  },
  {
    id: "duckdb-big-file",
    title: "DuckDB on a bigger file: three months of flights",
    group: "Speed and indexes",
    envs: ["flights"],
    data: { dataset: "D13", size: "full", files: ["flights.csv",  "flights.parquet",  "airlines.csv"] },
    goal: "Work with the full edition: 124,460 flights, about seven times flights.db. Time a full scan of the CSV and of the Parquet file, compare a monthly report in DuckDB and SQLite, then pivot it into one row per airline.",
    notice: "The file sizes and every timing are printed by the program. Reading the 16.8 MB CSV (guessing its types, then parsing the text) takes seconds here; the Parquet file is smaller and already typed, so the same scan takes milliseconds. The report is checked to be identical in both engines before any time is compared. This takes several seconds to run.",
    python: `import os
import sqlite3
import statistics
import time

import duckdb

# The full edition: three months of real flights, about seven times the rows in flights.db.
for name in ("flights.csv", "flights.parquet"):
    print(f"{name:<16} {os.path.getsize('data/' + name) / 1_000_000:5.1f} MB on disk")


def measure(run, repeats):
    ms = []
    for _ in range(repeats):
        t = time.perf_counter()
        result = run()
        ms.append((time.perf_counter() - t) * 1000)
    return result, ms


def report(label, ms):
    return f"{label:<16} fastest {min(ms):7.1f} ms, median {statistics.median(ms):7.1f} ms ({len(ms)} runs)"


# 1. Read the whole file: count the rows and average one column. CSV is parsed text; Parquet is stored by column.
for name, repeats in (("flights.csv", 2), ("flights.parquet", 5)):
    (rows, avg), ms = measure(lambda: duckdb.sql(f"SELECT COUNT(*), ROUND(AVG(arrival_delay), 2) FROM 'data/{name}'").fetchone(), repeats)
    print(f"{name}: {rows:,} rows, average arrival delay {avg} min")
    print("  " + report("scan", ms))

# 2. The same rows in DuckDB and in an in-memory SQLite table.
duck = duckdb.connect()
duck.execute("CREATE TABLE flights AS SELECT * FROM 'data/flights.parquet'")
t = time.perf_counter()
lite = sqlite3.connect(":memory:")
lite.execute("CREATE TABLE flights (flight_date TEXT, airline_code TEXT, departure_delay INTEGER, arrival_delay INTEGER)")
lite.executemany(
    "INSERT INTO flights VALUES (?, ?, ?, ?)",
    duck.execute("SELECT CAST(flight_date AS VARCHAR), airline_code, departure_delay, arrival_delay FROM flights").fetchall(),
)
print()
print(f"Copied {lite.execute('SELECT COUNT(*) FROM flights').fetchone()[0]:,} rows into SQLite in {(time.perf_counter() - t) * 1000:.0f} ms")

REPORT = """
    SELECT substr(CAST(flight_date AS VARCHAR), 1, 7) AS month, airline_code,
           COUNT(*) AS flights,
           ROUND(100.0 * SUM(CASE WHEN arrival_delay <= 15 THEN 1 ELSE 0 END) / COUNT(arrival_delay), 1) AS on_time_pct
    FROM flights
    GROUP BY month, airline_code
    ORDER BY month, airline_code
"""
d, d_ms = measure(lambda: duck.execute(REPORT).fetchall(), 5)
s, s_ms = measure(lambda: lite.execute(REPORT).fetchall(), 5)
print(f"Month-by-airline report: {len(d)} rows, same answer in both: {d == s}")
print("  " + report("DuckDB", d_ms))
print("  " + report("SQLite", s_ms))

# 3. The report as a table people can read: one row per airline, one column per month.
duck.execute("CREATE TABLE airlines AS SELECT * FROM 'data/airlines.csv'")
print()
print("Arrived within 15 minutes (%), by month:")
duck.sql("""
    PIVOT (
        SELECT a.airline_name AS airline,
               strftime(f.flight_date, '%b') AS month,
               CASE WHEN f.arrival_delay <= 15 THEN 100.0 ELSE 0 END AS on_time
        FROM flights AS f JOIN airlines AS a USING (airline_code)
        WHERE f.arrival_delay IS NOT NULL
    )
    ON month IN ('Jan', 'Feb', 'Mar')
    USING ROUND(AVG(on_time), 1)
    GROUP BY airline
    ORDER BY airline
""").show()
`,
  },
  {
    id: "duckdb-glob-partitions",
    title: "DuckDB: write Parquet by year, read it back with a glob",
    group: "Data work",
    envs: ["weather"],
    data: { dataset: "D07", size: "full", files: ["daily_weather.parquet",  "stations.csv",  "cities.csv"] },
    goal: "Take three years of daily weather (109,214 rows), write it as one Parquet file per year with `COPY ... PARTITION_BY`, then query all the files at once with a `*` glob.",
    notice: "`weather_by_year/*/*.parquet` matches every year's file, and `hive_partitioning` turns the `year=2023` folder name back into a column. A filter on `year` lets DuckDB skip the other folders entirely.",
    python: `import os

import duckdb

con = duckdb.connect()
(rows,) = con.sql("SELECT COUNT(*) FROM 'data/daily_weather.parquet'").fetchone()
print(f"daily_weather.parquet: {os.path.getsize('data/daily_weather.parquet') / 1_000_000:.2f} MB, {rows:,} rows")

# Split the data into one folder per year, the way data lakes store large tables.
con.execute("""
    COPY (SELECT *, year(observation_date) AS year FROM 'data/daily_weather.parquet')
    TO 'weather_by_year' (FORMAT parquet, PARTITION_BY (year), OVERWRITE_OR_IGNORE)
""")
print()
print("Files written:")
for path, in con.sql("SELECT file FROM glob('weather_by_year/*/*.parquet') ORDER BY file").fetchall():
    print(f"  {path:<45} {os.path.getsize(path) / 1000:6.0f} KB")

# A glob reads every matching file as one table. hive_partitioning turns year=2023 in the path back into a column.
ALL_YEARS = "read_parquet('weather_by_year/*/*.parquet', hive_partitioning = true, filename = true)"
print()
print("Rows per file:")
con.sql(f"""
    SELECT year, filename, COUNT(*) AS days
    FROM {ALL_YEARS}
    GROUP BY ALL ORDER BY year
""").show()

# A filter on the partition column means DuckDB only opens the matching folder.
print("Wettest city per year (rain in mm):")
con.sql(f"""
    SELECT w.year, c.city_name || ', ' || c.state_code AS city, ROUND(SUM(w.precipitation_mm), 0) AS rain_mm
    FROM {ALL_YEARS} AS w
    JOIN read_csv('data/stations.csv') AS s USING (station_id)
    JOIN read_csv('data/cities.csv') AS c USING (city_id)
    WHERE s.is_primary = 1
    GROUP BY w.year, city
    QUALIFY ROW_NUMBER() OVER (PARTITION BY w.year ORDER BY rain_mm DESC) = 1
    ORDER BY w.year
""").show()

print("Only 2024 (one folder read):")
con.sql(f"""
    SELECT COUNT(*) AS days, ROUND(MAX(tmax_c), 1) AS hottest_c, ROUND(MIN(tmin_c), 1) AS coldest_c
    FROM {ALL_YEARS}
    WHERE year = 2024
""").show()
`,
  },
];
