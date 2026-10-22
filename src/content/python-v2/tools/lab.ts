/**
 * T03 Database Lab: prepared SQLite environments and Python database-programming activities.
 *
 * An environment is a dataset loaded into a SQLite file the learner owns (typed tables, primary and foreign keys),
 * built the first time it's opened and kept in this browser. Activities are complete programs that work on that
 * file with Python's sqlite3 (and pandas or DuckDB where it fits). They are exploratory, never graded.
 * tests/python-lab.test.ts builds every environment and runs every activity in real Pyodide.
 */
import { DUCKDB_ACTIVITIES } from "./lab-duckdb";

export type LabEnvironment = {
  id: string;
  name: string;
  /** Dataset it's built from, and the size used. */
  dataset: string;
  size: "starter" | "standard";
  db: string;
  blurb: string;
  /** Table to show first. */
  start: string;
};

export const LAB_ENVIRONMENTS: LabEnvironment[] = [
  { id: "store", name: "Online Store", dataset: "R01", size: "standard", db: "store.db", blurb: "Customers, products, orders, order lines, payments and reviews.", start: "orders" },
  { id: "movies", name: "Movies", dataset: "R02", size: "standard", db: "movies.db", blurb: "Films, genres, users, ratings and tags.", start: "ratings" },
  { id: "weather", name: "Weather", dataset: "D07", size: "standard", db: "weather.db", blurb: "Cities, weather stations and a year of daily observations.", start: "daily_weather" },
  { id: "flights", name: "Flights", dataset: "D13", size: "standard", db: "flights.db", blurb: "Two weeks of real U.S. flights, airlines and airports.", start: "flights" },
  { id: "retail", name: "Online Retail", dataset: "D02", size: "standard", db: "retail.db", blurb: "Real invoice lines from a UK gift wholesaler, with its products and customers.", start: "invoice_lines" },
  { id: "complaints", name: "Consumer Complaints", dataset: "D03", size: "standard", db: "complaints.db", blurb: "Real 2024 complaints to the U.S. CFPB: product, issue, company and response.", start: "complaints" },
  { id: "rentals", name: "Rentals", dataset: "D05", size: "standard", db: "rentals.db", blurb: "Hosts, listings, a 90-day calendar and guest reviews.", start: "listings" },
  { id: "taxi", name: "NYC Taxi Trips", dataset: "D06", size: "standard", db: "taxi.db", blurb: "Real New York yellow taxi trips with their zones, payment types and rate codes.", start: "trips" },
  { id: "quakes", name: "Earthquakes", dataset: "D08", size: "standard", db: "quakes.db", blurb: "Real 2025 earthquakes: the GeoJSON feed flattened into one row per event.", start: "events" },
  { id: "food", name: "Food Products", dataset: "D09", size: "standard", db: "food.db", blurb: "Packaged foods with nutrition, and a child table of their labels, allergens and categories.", start: "products" },
  { id: "papers", name: "Research Papers", dataset: "D10", size: "standard", db: "papers.db", blurb: "Highly cited works, with child tables for their authors and keywords.", start: "works" },
  { id: "repos", name: "Repository Events", dataset: "D11", size: "standard", db: "repos.db", blurb: "A week of open-source activity: events, the people who made them, and the repositories.", start: "events" },
  { id: "forum", name: "Q&A Forum", dataset: "D12", size: "standard", db: "forum.db", blurb: "Users, questions and answers, with tags kept in one text column.", start: "questions" },
  { id: "places", name: "City Map", dataset: "D14", size: "standard", db: "places.db", blurb: "Portland places from OpenStreetMap, and every key = value tag in its own table.", start: "places" },
  { id: "planets", name: "Exoplanets", dataset: "D15", size: "standard", db: "planets.db", blurb: "Every confirmed exoplanet with its orbit, size, mass and host star.", start: "planets" },
];
/** The empty database, for building your own. */
export const LAB_SCRATCH = { id: "scratch", name: "Empty database", db: "scratch.db", blurb: "Nothing in it yet: create your own tables." } as const;

export type LabActivityGroup = "Connect and query" | "Change data safely" | "Speed and indexes" | "Data work";
export const LAB_GROUPS: LabActivityGroup[] = ["Connect and query", "Change data safely", "Speed and indexes", "Data work"];

export type LabActivity = {
  id: string;
  title: string;
  group: LabActivityGroup;
  /** Environments it works with ("any" = every prepared environment; "all" = those and the empty one too). */
  envs: string[] | "any" | "all";
  /** What you'll do, one or two sentences. */
  goal: string;
  /** What to look for in the result. */
  notice: string;
  /** Python, with __DB__ for the environment's file (and __TABLE__ for its first table, in "any" activities). */
  python: string;
  /** Dataset files the program reads, mounted under data/. */
  data?: { dataset: string; size: string; files: string[] };
  /** An optional SQL version for the SQL tab (__TABLE__ filled in as for python). */
  sql?: string;
};

export const LAB_ACTIVITIES: LabActivity[] = [
  // ---------------- Connect and query ----------------
  {
    id: "first-query",
    title: "Start here: read rows from a table",
    group: "Connect and query",
    envs: "any",
    goal: "Open a table under \"tables in\" below and press Show rows to see its data. Run the SELECT in the SQL tab, then do the same from Python: connect, run the query, fetch the rows and print them.",
    notice: "The column names, then the first five rows of the table, one tuple per row, then how many rows it has. Python's sqlite3 runs the same SELECT you'd type in the SQL tab: `connect()` opens the file, `execute()` runs the query, `fetchall()` hands you the rows.",
    python: `import sqlite3

# 1. Open the database file.
conn = sqlite3.connect("__DB__")

# 2. Run a query: the first 5 rows of __TABLE__.
cur = conn.execute('SELECT * FROM "__TABLE__" LIMIT 5')

# 3. The cursor knows the column names.
columns = [d[0] for d in cur.description]
print("Columns:", columns)

# 4. Fetch the rows. Each row is a tuple, in column order.
rows = cur.fetchall()
for row in rows:
    print(row)

# 5. A query that returns one number.
count = conn.execute('SELECT COUNT(*) FROM "__TABLE__"').fetchone()[0]
print(f"{count:,} rows in __TABLE__")

conn.close()
`,
    sql: `-- The first 5 rows of __TABLE__. Change the 5, or pick columns instead of *.\nSELECT *\nFROM "__TABLE__"\nLIMIT 5;`,
  },
  {
    id: "inspect-schema",
    title: "Inspect a database from Python",
    group: "Connect and query",
    envs: "any",
    goal: "Connect, list the tables with their row counts, and read each table's columns and foreign keys from SQLite itself.",
    notice: "Every table with its row count, columns and links to other tables. The code asks SQLite itself (sqlite_master and PRAGMA), so it works on a database it has never seen.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")

tables = [row[0] for row in conn.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
)]

for table in tables:
    (count,) = conn.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()
    print(f"{table}: {count:,} rows")
    for cid, name, kind, notnull, default, pk in conn.execute(f'PRAGMA table_info("{table}")'):
        flags = " PRIMARY KEY" if pk else ""
        flags += " NOT NULL" if notnull and not pk else ""
        print(f"    {name:<22} {kind}{flags}")
    for fk in conn.execute(f'PRAGMA foreign_key_list("{table}")'):
        print(f"    {fk[3]} -> {fk[2]}.{fk[4]}")

conn.close()
`,
  },
  {
    id: "cursors",
    title: "Cursors: fetchone, fetchmany, iterate",
    group: "Connect and query",
    envs: ["store"],
    goal: "Run one query and read its rows three ways, then use sqlite3.Row to get columns by name.",
    notice: "A cursor hands rows over as you ask for them. Iterating or fetchmany() keeps memory flat; fetchall() builds the whole list at once.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
cur = conn.execute("SELECT order_id, status, total FROM orders ORDER BY total DESC")

print("fetchone:", cur.fetchone())
print("fetchmany(3):", cur.fetchmany(3))

remaining = 0
for row in cur:          # the cursor itself is an iterator
    remaining += 1
print("rows left after that:", remaining)

conn.row_factory = sqlite3.Row
row = conn.execute("SELECT * FROM orders LIMIT 1").fetchone()
print("Columns:", row.keys())
print(f"Order {row['order_id']} for {row['customer_id']}: {row['total']} ({row['status']})")
conn.close()
`,
    sql: `SELECT order_id, status, total\nFROM orders\nORDER BY total DESC\nLIMIT 5;`,
  },
  {
    id: "order-lookup",
    title: "Order lookup: one customer's orders",
    group: "Connect and query",
    envs: ["store"],
    goal: "Write a function that takes a customer ID, returns their orders, and works out how much they've spent.",
    notice: "The ? placeholder passes the ID as data. The function works for any customer, including one with no orders.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
conn.row_factory = sqlite3.Row


def orders_for(customer_id):
    return conn.execute(
        """
        SELECT order_id, ordered_at, status, total
        FROM orders
        WHERE customer_id = ?
        ORDER BY ordered_at
        """,
        (customer_id,),
    ).fetchall()


# The customer with the most orders, so there's something to show.
(best,) = conn.execute(
    "SELECT customer_id FROM orders GROUP BY customer_id ORDER BY COUNT(*) DESC LIMIT 1"
).fetchone()

orders = orders_for(best)
spent = sum(o["total"] for o in orders if o["status"] not in ("cancelled", "returned"))
print(f"Customer {best}: {len(orders)} orders, {spent:,.2f} spent (excluding cancelled and returned)")
for o in orders[:8]:
    print(f"  {o['ordered_at']}  {o['order_id']}  {o['status']:<10} {o['total']:>8.2f}")

print("Unknown customer:", orders_for("C99999"))
conn.close()
`,
    sql: `SELECT customer_id, COUNT(*) AS orders, ROUND(SUM(total), 2) AS spent\nFROM orders\nWHERE status NOT IN ('cancelled', 'returned')\nGROUP BY customer_id\nORDER BY orders DESC\nLIMIT 10;`,
  },
  {
    id: "injection",
    title: "Parameters vs string formatting",
    group: "Connect and query",
    envs: ["store"],
    goal: "See what an f-string does to a query when the input contains a quote, and how a parameter keeps the same input harmless.",
    notice: "With the f-string, the input becomes part of the SQL and changes what the query means. With ?, it's only ever a value.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")

# Something a user might type into a search box.
user_input = "nobody' OR '1'='1"

unsafe_sql = f"SELECT COUNT(*) FROM customers WHERE last_name = '{user_input}'"
print("The f-string builds this SQL:")
print("   ", unsafe_sql)
print("Rows it matches:", conn.execute(unsafe_sql).fetchone()[0], "(every customer!)")

safe = conn.execute("SELECT COUNT(*) FROM customers WHERE last_name = ?", (user_input,)).fetchone()[0]
print("With a ? parameter it matches:", safe)

# Names that legitimately contain a quote work too.
print(conn.execute("SELECT ? AS name", ("O'Brien",)).fetchone())
conn.close()
`,
  },
  {
    id: "pandas-read-sql",
    title: "Query into pandas",
    group: "Connect and query",
    envs: "any",
    goal: "Run SQL and get a DataFrame back with pandas.read_sql_query, then keep working in pandas.",
    notice: "SQL does the filtering and joining close to the data; pandas is convenient for what comes after.",
    python: `import sqlite3
import pandas as pd

conn = sqlite3.connect("__DB__")
df = pd.read_sql_query('SELECT * FROM "__TABLE__" LIMIT 500', conn)
print(df.shape)
print(df.dtypes)
display(df.head(10))
conn.close()
`,
  },
  {
    id: "top-movies",
    title: "Top-rated films with enough ratings",
    group: "Connect and query",
    envs: ["movies"],
    goal: "Join ratings to films and genres, and rank films that have at least 20 ratings.",
    notice: "HAVING filters groups after aggregation. Without a minimum count, films with one 5-star rating would top the list.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
query = """
    SELECT m.title, m.release_year,
           COUNT(*) AS ratings,
           ROUND(AVG(r.rating), 2) AS average,
           (SELECT GROUP_CONCAT(g.name, ', ')
              FROM movie_genres mg JOIN genres g ON g.genre_id = mg.genre_id
             WHERE mg.movie_id = m.movie_id) AS genres
    FROM ratings r
    JOIN movies m ON m.movie_id = r.movie_id
    GROUP BY m.movie_id
    HAVING COUNT(*) >= ?
    ORDER BY average DESC, ratings DESC
    LIMIT 10
"""
for title, year, n, avg, genres in conn.execute(query, (20,)):
    print(f"{avg:.2f}  ({n:>3})  {title} ({year})  [{genres}]")
conn.close()
`,
    sql: `SELECT m.title, COUNT(*) AS ratings, ROUND(AVG(r.rating), 2) AS average\nFROM ratings r\nJOIN movies m ON m.movie_id = r.movie_id\nGROUP BY m.movie_id\nHAVING COUNT(*) >= 20\nORDER BY average DESC\nLIMIT 10;`,
  },
  {
    id: "delay-report",
    title: "Delay report by airline",
    group: "Connect and query",
    envs: ["flights"],
    goal: "Summarise flights by airline: share cancelled and average arrival delay of the flights that arrived.",
    notice: "AVG ignores NULLs, so cancelled flights (no arrival delay) don't count as on time. That's usually what you want, but say so.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
rows = conn.execute("""
    SELECT a.airline_name,
           COUNT(*) AS flights,
           ROUND(100.0 * SUM(f.cancelled) / COUNT(*), 1) AS pct_cancelled,
           ROUND(AVG(f.arrival_delay), 1) AS avg_arrival_delay
    FROM flights f
    JOIN airlines a ON a.airline_code = f.airline_code
    GROUP BY a.airline_name
    ORDER BY avg_arrival_delay DESC
""").fetchall()

print(f"{'airline':<22}{'flights':>8}{'% cancelled':>13}{'avg delay':>11}")
for name, n, pct, delay in rows:
    print(f"{name:<22}{n:>8}{pct:>13}{delay:>11}")
conn.close()
`,
  },
  {
    id: "weather-extremes",
    title: "Weather extremes per city",
    group: "Connect and query",
    envs: ["weather"],
    goal: "Find each city's hottest and coldest day with a window function, from Python.",
    notice: "ROW_NUMBER() OVER (PARTITION BY …) ranks rows within each city, so one query finds the top day per group.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
query = """
    WITH ranked AS (
        SELECT c.city_name, w.observation_date, w.tmax_c,
               ROW_NUMBER() OVER (PARTITION BY c.city_id ORDER BY w.tmax_c DESC) AS hottest,
               ROW_NUMBER() OVER (PARTITION BY c.city_id ORDER BY w.tmax_c ASC) AS coldest
        FROM daily_weather w
        JOIN stations s ON s.station_id = w.station_id
        JOIN cities c ON c.city_id = s.city_id
        WHERE w.tmax_c IS NOT NULL
    )
    SELECT city_name,
           MAX(CASE WHEN hottest = 1 THEN tmax_c || ' °C on ' || observation_date END),
           MAX(CASE WHEN coldest = 1 THEN tmax_c || ' °C on ' || observation_date END)
    FROM ranked
    GROUP BY city_name
    ORDER BY city_name
"""
for city, hot, cold in conn.execute(query):
    print(f"{city:<16} hottest high {hot:<24} coldest high {cold}")
conn.close()
`,
  },
  {
    id: "retail-net-sales",
    title: "Net sales per month after cancellations",
    group: "Connect and query",
    envs: ["retail"],
    goal: "Add up each month's invoice lines, keeping what was sold apart from what was cancelled or returned, and print net sales.",
    notice: "Cancelled invoices start with C and carry negative quantities, so a plain SUM(Quantity * Price) already nets them off. Splitting with CASE shows how much the cancellations take away.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
query = """
    SELECT substr(InvoiceDate, 1, 7) AS month,
           SUM(CASE WHEN Quantity > 0 THEN Quantity * Price ELSE 0 END) AS sold,
           SUM(CASE WHEN Quantity < 0 THEN Quantity * Price ELSE 0 END) AS cancelled,
           SUM(Quantity * Price) AS net,
           COUNT(DISTINCT CASE WHEN Invoice LIKE 'C%' THEN Invoice END) AS cancelled_invoices
    FROM invoice_lines
    GROUP BY month
    ORDER BY month
"""
print(f"{'month':<9}{'sold':>13}{'cancelled':>13}{'net':>13}{'C-invoices':>12}")
for month, sold, cancelled, net, invoices in conn.execute(query):
    print(f"{month:<9}{sold:>13,.2f}{cancelled:>13,.2f}{net:>13,.2f}{invoices:>12}")
conn.close()
`,
    sql: `SELECT substr(InvoiceDate, 1, 7) AS month,\n       ROUND(SUM(Quantity * Price), 2) AS net\nFROM invoice_lines\nGROUP BY month\nORDER BY month;`,
  },
  {
    id: "complaint-companies",
    title: "Which companies get the most complaints",
    group: "Connect and query",
    envs: ["complaints"],
    goal: "Write a function that ranks companies by complaints, optionally for one product only, with how often they answered on time.",
    notice: "`? IS NULL OR product = ?` makes the filter optional: pass None for every product, or a product name to narrow it. The values travel as parameters, never pasted into the SQL.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")


def top_companies(product=None, limit=10):
    sql = """
        SELECT company,
               COUNT(*) AS complaints,
               ROUND(100.0 * SUM(timely = 'Yes') / COUNT(*), 1) AS pct_timely,
               SUM(company_response = 'Closed with monetary relief') AS money_back
        FROM complaints
        WHERE ? IS NULL OR product = ?
        GROUP BY company
        ORDER BY complaints DESC
        LIMIT ?
    """
    return conn.execute(sql, (product, product, limit)).fetchall()


print("Every product:")
for company, n, timely, money in top_companies():
    print(f"  {n:>5}  {company[:44]:<46}{timely}% on time · {money} with money back")

(product,) = conn.execute(
    "SELECT product FROM complaints GROUP BY product ORDER BY COUNT(*) DESC LIMIT 1 OFFSET 1"
).fetchone()
print()
print(f"Only {product!r}:")
for company, n, timely, money in top_companies(product, 5):
    print(f"  {n:>5}  {company[:44]:<46}{timely}% on time · {money} with money back")
conn.close()
`,
    sql: `SELECT company, COUNT(*) AS complaints\nFROM complaints\nGROUP BY company\nORDER BY complaints DESC\nLIMIT 10;`,
  },
  {
    id: "rental-prices",
    title: "Prices stored as text: median price by area",
    group: "Connect and query",
    envs: ["rentals"],
    goal: "Read every listing's price, which is text like \"$1,250.00\", turn it into a number in Python, and work out the median nightly price per area and room type.",
    notice: "SQLite has no MEDIAN, and because price is TEXT, ORDER BY price would put \"$1,000.00\" before \"$95.00\". SQL fetches the rows; Python cleans the numbers and does the statistics.",
    python: `import sqlite3
from statistics import median

conn = sqlite3.connect("__DB__")


def to_number(price):
    # "$1,250.00" -> 1250.0
    return float(price.replace("$", "").replace(",", ""))


prices = {}
for area, room, price in conn.execute("SELECT neighbourhood_group, room_type, price FROM listings"):
    prices.setdefault((area, room), []).append(to_number(price))

print(f"{'area':<10}{'room type':<18}{'listings':>9}{'median':>9}")
for (area, room), values in sorted(prices.items()):
    print(f"{area:<10}{room:<18}{len(values):>9}{median(values):>9.0f}")

(kind,) = conn.execute("SELECT typeof(price) FROM listings LIMIT 1").fetchone()
print("SQLite stores price as:", kind)
conn.close()
`,
    sql: `-- Sorting text: '$1,000.00' comes before '$95.00'.\nSELECT name, price\nFROM listings\nORDER BY price DESC\nLIMIT 10;`,
  },
  {
    id: "taxi-tips",
    title: "Tips by hour of day",
    group: "Connect and query",
    envs: ["taxi"],
    goal: "Join trips to payment types and work out tips as a share of the fare for each pickup hour, for card payments only.",
    notice: "Only card tips are recorded, so cash trips would drag the average towards zero: the join plus the ? filter keeps like with like. strftime('%H', …) pulls the hour out of the text timestamp.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
query = """
    SELECT CAST(strftime('%H', t.pickup_at) AS INTEGER) AS hour,
           COUNT(*) AS trips,
           ROUND(100.0 * SUM(t.tip_amount) / SUM(t.fare_amount), 1) AS tip_pct
    FROM trips t
    JOIN payment_types p ON p.payment_type_id = t.payment_type_id
    WHERE p.description = ? AND t.fare_amount > 0
    GROUP BY hour
    ORDER BY hour
"""
for hour, trips, pct in conn.execute(query, ("Credit card",)):
    bar = "#" * round(pct)
    print(f"{hour:02d}:00  {trips:>5} trips  {pct:>5}%  {bar}")
conn.close()
`,
    sql: `SELECT p.description, COUNT(*) AS trips, ROUND(AVG(t.tip_amount), 2) AS avg_tip\nFROM trips t\nJOIN payment_types p ON p.payment_type_id = t.payment_type_id\nGROUP BY p.description\nORDER BY trips DESC;`,
  },
  {
    id: "quake-strongest",
    title: "The strongest earthquakes",
    group: "Connect and query",
    envs: ["quakes"],
    goal: "Write a function that returns earthquakes above a magnitude you choose, and read the columns by name with sqlite3.Row.",
    notice: "The events table is the GeoJSON feed flattened: one row per feature, with the coordinates and properties as columns. Change 6.0 to see how quickly the list grows for smaller quakes.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
conn.row_factory = sqlite3.Row


def strongest(min_magnitude, limit=10):
    return conn.execute(
        """SELECT time_utc, magnitude, depth_km, place, tsunami
           FROM events
           WHERE magnitude >= ? AND event_type = 'earthquake'
           ORDER BY magnitude DESC, time_utc
           LIMIT ?""",
        (min_magnitude, limit),
    ).fetchall()


for q in strongest(6.0):
    flag = "  (tsunami flag)" if q["tsunami"] else ""
    print(f"M{q['magnitude']:.1f}  {q['depth_km']:>6.1f} km deep  {q['time_utc'][:10]}  {q['place']}{flag}")

(n,) = conn.execute("SELECT COUNT(*) FROM events WHERE magnitude >= ?", (6.0,)).fetchone()
print(n, "events of magnitude 6.0 or more")
conn.close()
`,
    sql: `SELECT time_utc, magnitude, depth_km, place\nFROM events\nWHERE magnitude >= 6\nORDER BY magnitude DESC;`,
  },
  {
    id: "food-sugar",
    title: "Sugar in cereals, with their labels",
    group: "Connect and query",
    envs: ["food"],
    goal: "Rank breakfast cereals by sugar per 100 g, then look up the labels of the sweetest labelled one in the product_tags child table.",
    notice: "Each product's lists (labels, allergens, categories) live in product_tags, one row per tag, linked by code. A correlated subquery counts them; a second query with ? lists them.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
query = """
    SELECT p.code, p.product_name, p.brands, p.sugars_100g, p.nutriscore_grade,
           (SELECT COUNT(*) FROM product_tags t WHERE t.code = p.code AND t.kind = 'label') AS labels
    FROM products p
    WHERE p.search_category = ? AND p.sugars_100g IS NOT NULL
    ORDER BY p.sugars_100g DESC
    LIMIT 10
"""
rows = conn.execute(query, ("breakfast-cereals",)).fetchall()
for code, name, brand, sugar, grade, labels in rows:
    print(f"{sugar:>5.1f} g  Nutri-Score {(grade or '?').upper():<14} labels: {labels:<3} {name} ({brand})")

# The sweetest one that carries any labels at all.
labelled = [r for r in rows if r[5] > 0]
if labelled:
    code, name = labelled[0][0], labelled[0][1]
    tags = [t for (t,) in conn.execute("SELECT tag FROM product_tags WHERE code = ? AND kind = 'label' ORDER BY tag", (code,))]
    print()
    print(f"Labels on {name}:", ", ".join(tags))
conn.close()
`,
    sql: `SELECT product_name, brands, sugars_100g, nutriscore_grade\nFROM products\nWHERE search_category = 'breakfast-cereals'\nORDER BY sugars_100g DESC\nLIMIT 10;`,
  },
  {
    id: "paper-citations",
    title: "Most-cited papers and their first authors",
    group: "Connect and query",
    envs: ["papers"],
    goal: "Join works to their authorships to show each top paper's first author and author count, then rank journals by total citations.",
    notice: "Authors were a nested list in the API; here they're a child table with one row per author per paper. LEFT JOIN keeps a paper even if it had no first author listed.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
top = conn.execute("""
    SELECT w.title, w.publication_year, w.cited_by_count, a.author_name,
           (SELECT COUNT(*) FROM authorships x WHERE x.work_id = w.work_id) AS authors
    FROM works w
    LEFT JOIN authorships a ON a.work_id = w.work_id AND a.author_position = 'first'
    ORDER BY w.cited_by_count DESC
    LIMIT 8
""").fetchall()
for title, year, cited, first, authors in top:
    print(f"{cited:>7,} citations  {year}  {(title or '')[:60]}")
    print(f"{'':>19}{first} + {authors - 1} more")

print()
print("Venues with the most citations:")
for venue, papers, cited in conn.execute("""
    SELECT source_name, COUNT(*), SUM(cited_by_count)
    FROM works WHERE source_name IS NOT NULL
    GROUP BY source_name ORDER BY 3 DESC LIMIT 5
"""):
    print(f"  {cited:>8,}  {papers:>3} papers  {venue}")
conn.close()
`,
    sql: `SELECT source_name, COUNT(*) AS papers, SUM(cited_by_count) AS citations\nFROM works\nWHERE source_name IS NOT NULL\nGROUP BY source_name\nORDER BY citations DESC\nLIMIT 10;`,
  },
  {
    id: "repo-stars",
    title: "New stars per repository",
    group: "Connect and query",
    envs: ["repos"],
    goal: "Count star events (WatchEvent) per repository, leaving out bot accounts, and compare them with the stars each repo had before.",
    notice: "The event stream names the actor and repo in every row; joining actors lets you drop bots, and repos adds the language and starting star count.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
start, end = conn.execute("SELECT MIN(created_at), MAX(created_at) FROM events").fetchone()
print(f"Events from {start} to {end}")

query = """
    SELECT r.name, r.language, r.stars_before, COUNT(*) AS new_stars
    FROM events e
    JOIN repos r ON r.repo_id = e.repo_id
    JOIN actors a ON a.actor_id = e.actor_id
    WHERE e.type = ? AND a.is_bot = 0
    GROUP BY r.repo_id
    ORDER BY new_stars DESC, r.name
    LIMIT 10
"""
for name, language, before, new in conn.execute(query, ("WatchEvent",)):
    print(f"  +{new:<4} {name:<30} {language or '-':<17} had {before:,} stars")
conn.close()
`,
    sql: `SELECT type, COUNT(*) AS events\nFROM events\nGROUP BY type\nORDER BY events DESC;`,
  },
  {
    id: "forum-tags",
    title: "Tags in a text column: which get accepted answers",
    group: "Connect and query",
    envs: ["forum"],
    goal: "Fetch every question's tags, stored as one string like <python><pandas>, split them in Python and count how often each tag's questions get an accepted answer.",
    notice: "SQL can't easily split <a><b> into rows, so Python does it with a Counter. If you need this often, the cleaner design is a question_tags table with one row per tag.",
    python: `import sqlite3
from collections import Counter

conn = sqlite3.connect("__DB__")
asked = Counter()
accepted = Counter()
for tags, accepted_id in conn.execute("SELECT tags, accepted_answer_id FROM questions"):
    for tag in tags.strip("<>").split("><"):
        asked[tag] += 1
        if accepted_id is not None:
            accepted[tag] += 1

print(f"{'tag':<18}{'questions':>10}{'accepted':>10}")
for tag, n in asked.most_common(12):
    print(f"{tag:<18}{n:>10}{100 * accepted[tag] / n:>9.0f}%")
conn.close()
`,
    sql: `SELECT question_id, title, tags, answer_count\nFROM questions\nWHERE tags LIKE '%<pandas>%'\nORDER BY score DESC\nLIMIT 10;`,
  },
  {
    id: "place-tags",
    title: "Places and their key = value tags",
    group: "Connect and query",
    envs: ["places"],
    goal: "Count places by kind, then list every OpenStreetMap tag of one café from the tags table, using its two-column key.",
    notice: "places keeps the common fields as columns; tags keeps every key = value pair as its own row, matched on (osm_type, osm_id). Both parts of the key go in as parameters.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
print("Places by kind:")
for kind, n in conn.execute("SELECT kind, COUNT(*) FROM places GROUP BY kind ORDER BY 2 DESC LIMIT 8"):
    print(f"  {n:>5}  {kind}")

osm_type, osm_id, name = conn.execute(
    "SELECT osm_type, osm_id, name FROM places WHERE kind = 'cafe' AND name IS NOT NULL ORDER BY tag_count DESC, name LIMIT 1"
).fetchone()
print()
print(f"Every tag on {name} ({osm_type} {osm_id}):")
for key, value in conn.execute("SELECT key, value FROM tags WHERE osm_type = ? AND osm_id = ? ORDER BY key", (osm_type, osm_id)):
    print(f"  {key:<26} {value}")
conn.close()
`,
    sql: `SELECT key, COUNT(*) AS places\nFROM tags\nGROUP BY key\nORDER BY places DESC\nLIMIT 15;`,
  },
  {
    id: "planet-methods",
    title: "How planets were discovered, period by period",
    group: "Connect and query",
    envs: ["planets"],
    goal: "Group confirmed planets by five-year period and discovery method in SQL, then reshape the rows into one line per period in Python.",
    notice: "Radial velocity found most early planets; transit takes over once space telescopes start surveying. Integer division (disc_year / 5) * 5 buckets the years.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
rows = conn.execute("""
    SELECT (disc_year / 5) * 5 AS period, discoverymethod, COUNT(*)
    FROM planets
    WHERE disc_year IS NOT NULL
    GROUP BY period, discoverymethod
    ORDER BY period
""").fetchall()

by_period = {}
for period, method, n in rows:
    by_period.setdefault(period, {})[method] = n

(latest,) = conn.execute("SELECT MAX(disc_year) FROM planets").fetchone()
print(f"{'years':<11}{'planets':>8}{'transit':>9}{'radial v.':>11}{'other':>7}")
for period, methods in by_period.items():
    total = sum(methods.values())
    transit = methods.get("Transit", 0)
    radial = methods.get("Radial Velocity", 0)
    years = f"{period}-{min(period + 4, latest)}"
    print(f"{years:<11}{total:>8}{transit:>9}{radial:>11}{total - transit - radial:>7}")
conn.close()
`,
    sql: `SELECT discoverymethod, COUNT(*) AS planets, MIN(disc_year) AS first_year\nFROM planets\nGROUP BY discoverymethod\nORDER BY planets DESC;`,
  },

  // ---------------- Change data safely ----------------
  {
    id: "crud",
    title: "Insert, update and delete",
    group: "Change data safely",
    envs: ["store"],
    goal: "Add a customer, change them, delete them, and check cursor.rowcount and lastrowid after each step.",
    notice: "Changes are invisible to other connections until commit(). rowcount says how many rows a statement touched.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")

cur = conn.execute(
    """INSERT INTO customers (customer_id, first_name, last_name, email, city, state, segment, signup_at, marketing_opt_in)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)""",
    ("C90001", "Ada", "Lovelace", "ada@example.com", "London", "NY", "consumer", 0),
)
print("Inserted rows:", cur.rowcount, "· rowid:", cur.lastrowid)

cur = conn.execute("UPDATE customers SET city = ? WHERE customer_id = ?", ("Boston", "C90001"))
print("Updated rows:", cur.rowcount)
print(conn.execute("SELECT customer_id, first_name, city FROM customers WHERE customer_id = 'C90001'").fetchone())

cur = conn.execute("DELETE FROM customers WHERE customer_id = ?", ("C90001",))
print("Deleted rows:", cur.rowcount)

conn.commit()
print("Customers now:", conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0])
conn.close()
`,
  },
  {
    id: "transactions",
    title: "Transactions: commit and roll back",
    group: "Change data safely",
    envs: "all",
    goal: "Move money between two wallets inside a transaction, then make the second step fail and watch the first step roll back.",
    notice: "Inside \`with conn:\` both updates commit together, or neither does. The failed transfer leaves both balances exactly as they were.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
conn.execute("DROP TABLE IF EXISTS wallets")
conn.execute("CREATE TABLE wallets (owner TEXT PRIMARY KEY, balance REAL NOT NULL CHECK (balance >= 0))")
conn.executemany("INSERT INTO wallets VALUES (?, ?)", [("ana", 100.0), ("ben", 20.0)])
conn.commit()


def transfer(source, target, amount):
    with conn:  # BEGIN ... COMMIT, or ROLLBACK if anything raises
        conn.execute("UPDATE wallets SET balance = balance + ? WHERE owner = ?", (amount, target))
        conn.execute("UPDATE wallets SET balance = balance - ? WHERE owner = ?", (amount, source))


def balances():
    return dict(conn.execute("SELECT owner, balance FROM wallets ORDER BY owner"))


print("Start:          ", balances())
transfer("ana", "ben", 30)
print("After 30 ana→ben:", balances())

try:
    transfer("ben", "ana", 500)  # ben can't go below zero: the CHECK fails on the second UPDATE
except sqlite3.IntegrityError as e:
    print("Transfer failed:", e)
print("After the failure:", balances(), "(ana's +500 was rolled back too)")
conn.close()
`,
    sql: `BEGIN;\nUPDATE wallets SET balance = balance + 30 WHERE owner = 'ben';\nUPDATE wallets SET balance = balance - 30 WHERE owner = 'ana';\nCOMMIT;\nSELECT * FROM wallets;`,
  },
  {
    id: "constraints",
    title: "Constraints and the errors they raise",
    group: "Change data safely",
    envs: ["store"],
    goal: "Break a primary key, a NOT NULL column and a foreign key on purpose, and catch each error from Python.",
    notice: "SQLite only enforces foreign keys after PRAGMA foreign_keys = ON, and that setting is per connection.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")


def attempt(label, sql, params=()):
    try:
        with conn:
            conn.execute(sql, params)
        print(f"{label}: accepted")
    except sqlite3.IntegrityError as e:
        print(f"{label}: IntegrityError: {e}")


(existing,) = conn.execute("SELECT order_id FROM orders LIMIT 1").fetchone()
attempt("Duplicate order_id", "INSERT INTO orders (order_id, customer_id, ordered_at, channel, status, subtotal, shipping_fee, tax, total, ship_city, ship_state, estimated_delivery) VALUES (?, 'C00001', '2025-01-01', 'web', 'processing', 1, 0, 0, 1, 'X', 'NY', '2025-01-07')", (existing,))
attempt("Missing email (NOT NULL)", "INSERT INTO customers (customer_id, first_name, last_name, email, state, segment, signup_at, marketing_opt_in) VALUES ('C90002', 'No', 'Email', NULL, 'NY', 'consumer', '2025-01-01', 0)")

line = "INSERT INTO order_items (order_id, line_no, product_id, quantity, unit_price, discount_rate, line_total) VALUES ('O999999', 1, 'P0001', 1, 1, 0, 1)"
attempt("Order line for an order that doesn't exist (foreign keys off)", line)
conn.execute("DELETE FROM order_items WHERE order_id = 'O999999'")
conn.commit()
conn.execute("PRAGMA foreign_keys = ON")
attempt("Same line with foreign keys on", line)
conn.close()
`,
  },
  {
    id: "upsert",
    title: "Insert, or update if it already exists",
    group: "Change data safely",
    envs: "all",
    goal: "Keep a stock table up to date with INSERT … ON CONFLICT DO UPDATE, so re-running the same load never duplicates rows.",
    notice: "The second load updates the three existing products and adds one new one: 4 rows, not 7.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")
conn.execute("DROP TABLE IF EXISTS stock")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, on_hand INTEGER NOT NULL, updated TEXT)")

UPSERT = """
    INSERT INTO stock (sku, on_hand, updated) VALUES (?, ?, ?)
    ON CONFLICT (sku) DO UPDATE SET on_hand = excluded.on_hand, updated = excluded.updated
"""
with conn:
    conn.executemany(UPSERT, [("A-1", 10, "mon"), ("B-2", 5, "mon"), ("C-3", 0, "mon")])
with conn:
    conn.executemany(UPSERT, [("A-1", 7, "tue"), ("B-2", 5, "tue"), ("C-3", 12, "tue"), ("D-4", 3, "tue")])

for row in conn.execute("SELECT * FROM stock ORDER BY sku"):
    print(row)
conn.close()
`,
  },

  // ---------------- Speed and indexes ----------------
  {
    id: "bulk-insert",
    title: "Bulk insert: one at a time vs executemany",
    group: "Speed and indexes",
    envs: "all",
    goal: "Insert 20,000 rows three ways and time each: a commit per row, many execute() calls in one transaction, and one executemany().",
    notice: "Committing every row is by far the slowest: each commit is a separate transaction. In this in-browser SQLite, writes go to memory, so a disk-backed database would show an even bigger gap.",
    python: `import sqlite3
import time

conn = sqlite3.connect("__DB__")
rows = [(i, f"item-{i}", i % 97) for i in range(20_000)]


def fresh():
    conn.execute("DROP TABLE IF EXISTS bulk")
    conn.execute("CREATE TABLE bulk (id INTEGER PRIMARY KEY, name TEXT, bucket INTEGER)")
    conn.commit()


def timed(label, work):
    fresh()
    start = time.perf_counter()
    work()
    elapsed = time.perf_counter() - start
    (n,) = conn.execute("SELECT COUNT(*) FROM bulk").fetchone()
    print(f"{label:<34} {elapsed * 1000:8.1f} ms  ({n:,} rows)")


def commit_each():
    for r in rows[:2_000]:  # only 2,000: committing each one is slow
        conn.execute("INSERT INTO bulk VALUES (?, ?, ?)", r)
        conn.commit()


def one_transaction():
    with conn:
        for r in rows:
            conn.execute("INSERT INTO bulk VALUES (?, ?, ?)", r)


def executemany():
    with conn:
        conn.executemany("INSERT INTO bulk VALUES (?, ?, ?)", rows)


timed("execute + commit, 2,000 rows", commit_each)
timed("execute in one transaction", one_transaction)
timed("executemany in one transaction", executemany)
conn.execute("DROP TABLE bulk")
conn.commit()
conn.close()
`,
  },
  {
    id: "index-experiment",
    title: "Index experiment: query plans before and after",
    group: "Speed and indexes",
    envs: ["flights"],
    goal: "Look up one route's flights, read SQLite's real plan, add an index, and compare the plan and the time per query.",
    notice: "Before: SCAN flights (every row is read). After: SEARCH flights USING INDEX. Each time is a total over many runs of the query divided by the number of runs, measured with time.perf_counter_ns(): a browser's clock only ticks every few microseconds or more, too coarse to time one indexed lookup. Times are from this run in your browser; the plan is the evidence that holds everywhere.",
    python: `import sqlite3
import time

conn = sqlite3.connect("__DB__")
conn.execute("DROP INDEX IF EXISTS idx_route")
QUERY = "SELECT flight_date, airline_code, arrival_delay FROM flights WHERE origin = ? AND destination = ?"
route = conn.execute("SELECT origin, destination FROM flights GROUP BY 1, 2 ORDER BY COUNT(*) DESC LIMIT 1").fetchone()


def plan():
    return [row[3] for row in conn.execute("EXPLAIN QUERY PLAN " + QUERY, route)]


def clock_step_ns():
    # The smallest step this clock can show: wait for it to change, a few times.
    steps = []
    for _ in range(5):
        t0 = t1 = time.perf_counter_ns()
        while t1 == t0:
            t1 = time.perf_counter_ns()
        steps.append(t1 - t0)
    return min(steps)


def time_per_query(min_total_ns=200_000_000):
    # Run the query again and again until at least 0.2 s has passed, then divide.
    runs = 0
    start = time.perf_counter_ns()
    while True:
        rows = conn.execute(QUERY, route).fetchall()
        runs += 1
        total = time.perf_counter_ns() - start
        if total >= min_total_ns:
            return total / runs, runs, len(rows)


def show(ns):
    if ns >= 1_000_000:
        return f"{ns / 1_000_000:.2f} ms"
    if ns >= 1_000:
        return f"{ns / 1_000:.1f} µs"
    return f"{ns:.0f} ns"


step = clock_step_ns()
print("Route:", " → ".join(route), "·", conn.execute("SELECT COUNT(*) FROM flights").fetchone()[0], "flights in the table")
print("Without an index:", plan())
before, runs, n = time_per_query()
print(f"  {n} rows in {show(before)} per query (average of {runs:,} runs)")

conn.execute("CREATE INDEX idx_route ON flights (origin, destination)")
print("With idx_route:  ", plan())
after, runs, n = time_per_query()
print(f"  {n} rows in {show(after)} per query (average of {runs:,} runs)")

print(f"About {before / after:.0f}× faster with the index.")
print(f"This clock moves in steps of {show(step)}, so each time is a total of at least 0.2 s divided by the runs.")

conn.execute("DROP INDEX idx_route")  # leave the database as it was
conn.commit()
conn.close()
`,
    sql: `EXPLAIN QUERY PLAN\nSELECT flight_date, airline_code, arrival_delay\nFROM flights\nWHERE origin = 'ORD' AND destination = 'LGA';`,
  },
  {
    id: "fetchmany-batches",
    title: "Read in batches with fetchmany",
    group: "Speed and indexes",
    envs: ["movies"],
    goal: "Compute an average over every rating while holding only 1,000 rows at a time, and compare peak memory with fetchall().",
    notice: "tracemalloc's peak for the batched version stays small however big the table gets; fetchall() grows with it.",
    python: `import sqlite3
import tracemalloc

conn = sqlite3.connect("__DB__")
SQL = "SELECT rating FROM ratings"


def with_fetchall():
    rows = conn.execute(SQL).fetchall()
    return sum(r[0] for r in rows) / len(rows)


def in_batches(size=1_000):
    cur = conn.execute(SQL)
    total = count = 0
    while batch := cur.fetchmany(size):
        total += sum(r[0] for r in batch)
        count += len(batch)
    return total / count


for fn in (with_fetchall, in_batches):
    tracemalloc.start()
    avg = fn()
    peak = tracemalloc.get_traced_memory()[1]
    tracemalloc.stop()
    print(f"{fn.__name__:<14} average {avg:.4f}   peak {peak / 1024:,.0f} KB")
conn.close()
`,
  },

  // ---------------- Data work ----------------
  {
    id: "reconcile",
    title: "Check that payments match orders",
    group: "Data work",
    envs: ["store"],
    goal: "Find orders with no successful payment and payments whose amounts don't match the order total.",
    notice: "A LEFT JOIN keeps orders that have no match; IS NULL picks them out. Every gap here has a business reason (cancelled, returned). Reconciliation is finding the gaps, then explaining each one.",
    python: `import sqlite3

conn = sqlite3.connect("__DB__")

unpaid = conn.execute("""
    SELECT o.status, COUNT(*)
    FROM orders o
    LEFT JOIN payments p ON p.order_id = o.order_id AND p.status = 'captured'
    WHERE p.payment_id IS NULL
    GROUP BY o.status
    ORDER BY COUNT(*) DESC
""").fetchall()
print("Orders with no captured payment, by status:", unpaid)

mismatched = conn.execute("""
    SELECT o.order_id, o.status, o.total, ROUND(SUM(p.amount), 2) AS net_paid
    FROM orders o
    JOIN payments p ON p.order_id = o.order_id AND p.status IN ('captured', 'refunded')
    GROUP BY o.order_id
    HAVING ABS(SUM(p.amount) - o.total) > 0.01
    ORDER BY o.order_id
    LIMIT 10
""").fetchall()
print(len(mismatched), "orders where the net payment (captured, plus negative refunds) differs from the total:")
for row in mismatched[:5]:
    print("   ", row)
statuses = {row[1] for row in mismatched}
print("Their statuses:", statuses, "· a returned order keeps only its shipping fee, so these are explained.")

orphans = conn.execute("""
    SELECT COUNT(*) FROM payments p
    WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = p.order_id)
""").fetchone()[0]
print("Payments for orders that don't exist:", orphans)
conn.close()
`,
  },
  {
    id: "csv-to-table",
    title: "Load a CSV file into a new table",
    group: "Data work",
    envs: ["weather", "scratch"],
    data: { dataset: "D07", size: "standard", files: ["daily_weather.csv"] },
    goal: "Read a dataset CSV with the csv module, create a typed table for it, and load it with executemany.",
    notice: "Every CSV value is text: converting while loading (int, float, None for empty) is what makes later SUMs and comparisons correct.",
    python: `import csv
import sqlite3

conn = sqlite3.connect("__DB__")
conn.execute("DROP TABLE IF EXISTS station_days")
conn.execute("""
    CREATE TABLE station_days (
        station_id TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        tmax_c REAL,
        tmin_c REAL,
        precipitation_mm REAL,
        PRIMARY KEY (station_id, observation_date)
    )
""")


def number(text):
    return float(text) if text != "" else None


with open("data/daily_weather.csv", newline="") as f:
    rows = [
        (r["station_id"], r["observation_date"], number(r["tmax_c"]), number(r["tmin_c"]), number(r["precipitation_mm"]))
        for r in csv.DictReader(f)
    ]
with conn:
    conn.executemany("INSERT INTO station_days VALUES (?, ?, ?, ?, ?)", rows)

print(conn.execute("SELECT COUNT(*), ROUND(AVG(tmax_c), 1), SUM(tmax_c IS NULL) FROM station_days").fetchone(), "(rows, mean high, missing highs)")
conn.close()
`,
  },
  {
    id: "export-csv",
    title: "Export a query to CSV",
    group: "Data work",
    envs: ["store"],
    goal: "Write monthly revenue to monthly_revenue.csv with csv.writer, headers taken from cursor.description.",
    notice: "cursor.description holds the column names of the last query. The file appears in the results under Files.",
    python: `import csv
import sqlite3

conn = sqlite3.connect("__DB__")
cur = conn.execute("""
    SELECT substr(ordered_at, 1, 7) AS month,
           COUNT(*) AS orders,
           ROUND(SUM(total), 2) AS revenue
    FROM orders
    WHERE status NOT IN ('cancelled', 'returned')
    GROUP BY month
    ORDER BY month
""")
with open("monthly_revenue.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([col[0] for col in cur.description])
    writer.writerows(cur)

print(open("monthly_revenue.csv").read()[:400])
conn.close()
`,
  },
  {
    id: "duckdb-analytics",
    title: "Analytics with DuckDB on SQLite data",
    group: "Data work",
    envs: ["flights"],
    goal: "Pull a table out of SQLite into pandas, then let DuckDB run an analytical query over the DataFrame.",
    notice: "SQLite is built for many small reads and writes; DuckDB is built for scanning and aggregating columns. Here they work together.",
    python: `import sqlite3
import duckdb
import pandas as pd

conn = sqlite3.connect("__DB__")
flights = pd.read_sql_query("SELECT * FROM flights", conn)
conn.close()

summary = duckdb.sql("""
    SELECT origin,
           COUNT(*) AS departures,
           ROUND(AVG(departure_delay), 1) AS avg_dep_delay,
           ROUND(quantile_cont(departure_delay, 0.9), 0) AS p90_dep_delay
    FROM flights
    WHERE cancelled = 0
    GROUP BY origin
    HAVING COUNT(*) >= 300
    ORDER BY avg_dep_delay DESC
    LIMIT 10
""").df()
display(summary)
`,
  },
  ...DUCKDB_ACTIVITIES,
];

export const labEnv = (id: string | null | undefined) => LAB_ENVIRONMENTS.find((e) => e.id === id) ?? null;
/** Every environment an activity runs on, scratch included where it applies. */
export const activityEnvs = (a: LabActivity): string[] => (a.envs === "all" ? [...LAB_ENVIRONMENTS.map((e) => e.id), "scratch"] : a.envs === "any" ? LAB_ENVIRONMENTS.map((e) => e.id) : a.envs);
export const activitiesFor = (env: string) => LAB_ACTIVITIES.filter((a) => activityEnvs(a).includes(env));
/** The activity's Python with the environment filled in. */
export function activityCode(a: LabActivity, env: { db: string; start?: string }): string {
  return a.python.replace(/__DB__/g, env.db).replace(/__TABLE__/g, env.start ?? "sqlite_master");
}
/** The activity's SQL version with the environment's first table filled in. */
export function activitySql(a: LabActivity, env: { start?: string }): string | undefined {
  return a.sql?.replace(/__TABLE__/g, env.start ?? "sqlite_master");
}
