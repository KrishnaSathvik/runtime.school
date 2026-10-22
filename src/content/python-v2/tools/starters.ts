/**
 * Playground starter workspaces: small, complete programs to start from, grouped by what they're for. Each one
 * runs as written on its dataset's Small size (tests/python-playground.test.ts runs every one in real Pyodide).
 * A starter can have several files; `main.py` is what Run starts with.
 */
export type PyStarter = {
  id: string;
  title: string;
  group: StarterGroup;
  /** One line: what it shows. */
  summary: string;
  /** Dataset it reads (Small size), or none. */
  dataset?: string;
  files: { name: string; code: string }[];
};
export type StarterGroup = "Python basics" | "Files and formats" | "Data analysis" | "Databases and SQL" | "Text, dates and places";
export const STARTER_GROUPS: StarterGroup[] = ["Python basics", "Files and formats", "Data analysis", "Databases and SQL", "Text, dates and places"];

export const BLANK_MAIN = `# Write Python here and press Run (Ctrl/Cmd + Enter).
name = "Runtime"
print(f"Hello, {name}!")
`;

export const STARTERS: PyStarter[] = [
  // ---------------- Python basics ----------------
  {
    id: "basics",
    title: "Python basics",
    group: "Python basics",
    summary: "Variables, f-strings, if/else and loops.",
    files: [{ name: "main.py", code: `prices = [12.5, 3.99, 7.25, 20.0]

total = 0
for price in prices:
    total += price

average = total / len(prices)
print(f"{len(prices)} items, total {total:.2f}, average {average:.2f}")

for price in prices:
    if price >= 10:
        label = "expensive"
    elif price >= 5:
        label = "mid"
    else:
        label = "cheap"
    print(f"{price:>6.2f}  {label}")
` }],
  },
  {
    id: "collections",
    title: "Strings and collections",
    group: "Python basics",
    summary: "Split text, count words with a dict, compare with Counter and sets.",
    files: [{ name: "main.py", code: `from collections import Counter

text = """The quick brown fox jumps over the lazy dog.
The dog sleeps; the fox runs away."""

words = [w.strip(".;,").lower() for w in text.split()]

counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1

print("Most common (dict):", sorted(counts.items(), key=lambda kv: -kv[1])[:3])
print("Most common (Counter):", Counter(words).most_common(3))

first_line = set(text.splitlines()[0].lower().strip(".").split())
second_line = set(text.splitlines()[1].lower().replace(";", "").strip(".").split())
print("In both lines:", sorted(first_line & second_line))
print("Only in the first:", sorted(first_line - second_line))
` }],
  },
  {
    id: "functions-modules",
    title: "Functions across files",
    group: "Python basics",
    summary: "main.py imports functions from pricing.py: a two-file program.",
    files: [
      { name: "main.py", code: `from pricing import apply_discount, total_with_tax

cart = [("Mug", 12.0, 2), ("Notebook", 4.5, 3), ("Lamp", 39.0, 1)]

subtotal = sum(price * qty for _, price, qty in cart)
discounted = apply_discount(subtotal, percent=10)
print(f"Subtotal:   {subtotal:8.2f}")
print(f"Discounted: {discounted:8.2f}")
print(f"With tax:   {total_with_tax(discounted):8.2f}")
` },
      { name: "pricing.py", code: `"""Price helpers used by main.py."""

TAX_RATE = 0.07


def apply_discount(amount, percent=0):
    """Take percent off amount, never going below zero."""
    if not 0 <= percent <= 100:
        raise ValueError("percent must be between 0 and 100")
    return round(amount * (1 - percent / 100), 2)


def total_with_tax(amount, rate=TAX_RATE):
    return round(amount * (1 + rate), 2)
` },
    ],
  },
  {
    id: "classes",
    title: "Classes and dataclasses",
    group: "Python basics",
    summary: "Model a shopping cart with a dataclass and methods.",
    files: [{ name: "main.py", code: `from dataclasses import dataclass, field


@dataclass
class Item:
    name: str
    price: float
    quantity: int = 1

    @property
    def total(self):
        return self.price * self.quantity


@dataclass
class Cart:
    items: list[Item] = field(default_factory=list)

    def add(self, item):
        self.items.append(item)

    def total(self):
        return sum(i.total for i in self.items)


cart = Cart()
cart.add(Item("Coffee beans", 14.0, 2))
cart.add(Item("Filter papers", 3.5))
for item in cart.items:
    print(item)
print(f"Cart total: {cart.total():.2f}")
` }],
  },

  // ---------------- Files and formats ----------------
  {
    id: "read-csv",
    title: "Read a CSV with the csv module",
    group: "Files and formats",
    summary: "Read Online Store orders row by row and total them by status.",
    dataset: "R01",
    files: [{ name: "main.py", code: `import csv

totals = {}
with open("data/orders.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        status = row["status"]
        totals[status] = totals.get(status, 0) + float(row["total"])

for status, amount in sorted(totals.items(), key=lambda kv: -kv[1]):
    print(f"{status:<12} {amount:>10,.2f}")
` }],
  },
  {
    id: "geojson",
    title: "Nested JSON: earthquakes",
    group: "Files and formats",
    summary: "Walk a GeoJSON FeatureCollection and pull values out of nested objects.",
    dataset: "D08",
    files: [{ name: "main.py", code: `import json
from datetime import datetime, timezone

with open("data/earthquakes.geojson", encoding="utf-8") as f:
    collection = json.load(f)

features = collection["features"]
print(len(features), "events")

strongest = sorted(features, key=lambda f: f["properties"]["mag"], reverse=True)[:5]
for quake in strongest:
    props = quake["properties"]
    lon, lat, depth = quake["geometry"]["coordinates"]
    when = datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc)
    print(f"M{props['mag']:.1f}  {when:%Y-%m-%d %H:%M}  depth {depth:5.1f} km  {props['place']}")
` }],
  },
  {
    id: "jsonl-stream",
    title: "Stream JSON Lines files",
    group: "Files and formats",
    summary: "Read 24 hourly event files one line at a time, without loading them all.",
    dataset: "D11",
    files: [{ name: "main.py", code: `import json
from collections import Counter
from pathlib import Path

types = Counter()
seen = set()
duplicates = 0

for path in sorted(Path("data/events").glob("*.jsonl")):
    with path.open(encoding="utf-8") as f:
        for line in f:
            event = json.loads(line)
            if event["id"] in seen:
                duplicates += 1
                continue
            seen.add(event["id"])
            types[event["type"]] += 1

print(f"{len(seen):,} distinct events, {duplicates} repeated across files")
for kind, n in types.most_common():
    print(f"{kind:<26} {n:>6,}")
` }],
  },
  {
    id: "api-pages",
    title: "Paginated API responses",
    group: "Files and formats",
    summary: "Combine recorded API pages and flatten nested author lists.",
    dataset: "D10",
    files: [{ name: "main.py", code: `import json
from pathlib import Path


def pages():
    """Yield each recorded page, in order, like requesting page=1, 2, ..."""
    for path in sorted(Path("data/api").glob("works-page-*.json")):
        with path.open(encoding="utf-8") as f:
            yield json.load(f)


works = []
for page in pages():
    print("page", page["meta"]["page"], "with", len(page["results"]), "works")
    works.extend(page["results"])

print(len(works), "works in total")
top = works[0]
print(top["title"])
print("Cited", top["cited_by_count"], "times")
authors = [a["author"]["display_name"] for a in top["authorships"]]
print(len(authors), "authors, first three:", authors[:3])
` }],
  },
  {
    id: "write-files",
    title: "Write CSV and JSON files",
    group: "Files and formats",
    summary: "Summarise data and write the result to new files (see the Files tab).",
    dataset: "R02",
    files: [{ name: "main.py", code: `import csv
import json
from collections import defaultdict

ratings = defaultdict(list)
with open("data/ratings.csv", newline="") as f:
    for row in csv.DictReader(f):
        ratings[row["movie_id"]].append(float(row["rating"]))

summary = [
    {"movie_id": movie, "ratings": len(values), "average": round(sum(values) / len(values), 2)}
    for movie, values in ratings.items()
    if len(values) >= 5
]
summary.sort(key=lambda r: (-r["average"], -r["ratings"]))

with open("top_movies.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["movie_id", "ratings", "average"])
    writer.writeheader()
    writer.writerows(summary[:20])

with open("top_movies.json", "w") as f:
    json.dump(summary[:5], f, indent=2)

print(f"Wrote {min(20, len(summary))} rows to top_movies.csv and 5 to top_movies.json")
` }],
  },

  {
    id: "validate-nested",
    title: "Validate nested records",
    group: "Files and formats",
    summary: "Food Products: check JSON Lines records for missing and impossible values.",
    dataset: "D09",
    files: [{ name: "main.py", code: `import json
from collections import Counter

problems = Counter()
checked = 0
with open("data/products.jsonl", encoding="utf-8") as f:
    for line in f:
        product = json.loads(line)
        checked += 1
        nutrients = product.get("nutriments") or {}
        if not product.get("product_name"):
            problems["no name"] += 1
        if "energy-kcal_100g" not in nutrients:
            problems["no calories"] += 1
        sugar, carbs = nutrients.get("sugars_100g"), nutrients.get("carbohydrates_100g")
        if sugar is not None and carbs is not None and sugar > carbs:
            problems["more sugar than carbohydrate"] += 1
        if product.get("nutriscore_grade") not in {"a", "b", "c", "d", "e"}:
            problems["no Nutri-Score grade"] += 1

print(checked, "products checked")
for issue, n in problems.most_common():
    print(f"{n:>4}  {issue}")
` }],
  },
  // ---------------- Data analysis ----------------
  {
    id: "pandas-first-look",
    title: "pandas: first look",
    group: "Data analysis",
    summary: "Load a table, check types and gaps, and look at the first rows.",
    dataset: "R01",
    files: [{ name: "main.py", code: `import pandas as pd

orders = pd.read_csv("data/orders.csv", parse_dates=["ordered_at"])

print(orders.shape)
print(orders.dtypes)
print("Missing values per column:")
print(orders.isna().sum()[lambda s: s > 0])
display(orders.head())
` }],
  },
  {
    id: "cleaning",
    title: "Clean real retail data",
    group: "Data analysis",
    summary: "Online Retail: separate cancellations, remove duplicates, handle missing customers.",
    dataset: "D02",
    files: [{ name: "main.py", code: `import pandas as pd

lines = pd.read_csv("data/invoice_lines.csv", dtype={"Invoice": str, "StockCode": str}, parse_dates=["InvoiceDate"])
print("Rows:", len(lines))

duplicates = lines.duplicated().sum()
lines = lines.drop_duplicates()
print("Removed exact duplicates:", duplicates)

cancelled = lines["Invoice"].str.startswith("C")
print("Cancellation lines:", cancelled.sum())
print("Lines without a customer:", lines["Customer ID"].isna().sum())

lines["Revenue"] = lines["Quantity"] * lines["Price"]
products = lines[lines["StockCode"].str.match(r"^\\d")]
by_country = products.groupby("Country")["Revenue"].sum().sort_values(ascending=False)
display(by_country.head(10).round(2).to_frame("net revenue"))
` }],
  },
  {
    id: "groupby",
    title: "Join and group: top-rated movies",
    group: "Data analysis",
    summary: "Merge ratings with movies, aggregate, and rank.",
    dataset: "R02",
    files: [{ name: "main.py", code: `import pandas as pd

ratings = pd.read_csv("data/ratings.csv")
movies = pd.read_csv("data/movies.csv")

stats = ratings.groupby("movie_id")["rating"].agg(count="count", average="mean").reset_index()
ranked = (
    stats[stats["count"] >= 5]
    .merge(movies[["movie_id", "title", "release_year"]], on="movie_id")
    .sort_values(["average", "count"], ascending=False)
)
display(ranked.head(10).round({"average": 2}))
` }],
  },
  {
    id: "numpy",
    title: "NumPy calculations",
    group: "Data analysis",
    summary: "Exoplanets: arrays, masks, and summary statistics with missing values.",
    dataset: "D15",
    files: [{ name: "main.py", code: `import numpy as np
import pandas as pd

planets = pd.read_csv("data/planets.csv")
radius = planets["pl_rade"].to_numpy()        # Earth radii
period = planets["pl_orbper"].to_numpy()      # days

known = ~np.isnan(radius)
print(f"{known.sum()} of {radius.size} planets have a radius")
print("Median radius:", np.nanmedian(radius).round(2), "Earth radii")

earth_sized = known & (radius >= 0.8) & (radius <= 1.25)
print("Earth-sized:", earth_sized.sum())

bins = np.array([0, 1.25, 2, 6, 15, np.inf])
names = ["Earth-like", "Super-Earth", "Neptune-like", "Jupiter-like", "Larger"]
counts = np.histogram(radius[known], bins=bins)[0]
for name, n in zip(names, counts):
    print(f"{name:<13} {n:>4}")
print("Shortest year:", np.nanmin(period).round(3), "days")
` }],
  },
  {
    id: "charts",
    title: "Charts with matplotlib",
    group: "Data analysis",
    summary: "Daily Weather: a line chart of temperatures and a histogram.",
    dataset: "D07",
    files: [{ name: "main.py", code: `import matplotlib.pyplot as plt
import pandas as pd

weather = pd.read_csv("data/daily_weather.csv", parse_dates=["observation_date"])
stations = pd.read_csv("data/stations.csv")
weather = weather.merge(stations[["station_id", "station_name"]], on="station_id")

fig, ax = plt.subplots(figsize=(8, 4))
for name, group in weather.groupby("station_name"):
    ax.plot(group["observation_date"], group["tmax_c"], label=name)
ax.set_title("Daily high temperature")
ax.set_ylabel("°C")
ax.legend()
plt.show()

plt.figure(figsize=(6, 3))
plt.hist(weather["tmax_c"].dropna(), bins=20)
plt.title("How often each daily high occurs")
plt.xlabel("°C")
plt.show()
` }],
  },
  {
    id: "polars",
    title: "Polars DataFrames",
    group: "Data analysis",
    summary: "NYC Taxi: filter, add columns and group with Polars expressions.",
    dataset: "D06",
    files: [{ name: "main.py", code: `import polars as pl

trips = pl.read_csv("data/trips.csv", try_parse_dates=True)

summary = (
    trips.filter((pl.col("fare_amount") > 0) & (pl.col("payment_type_id") == 1))
    .with_columns(
        hour=pl.col("pickup_at").dt.hour(),
        tip_share=pl.col("tip_amount") / pl.col("fare_amount"),
    )
    .group_by("hour")
    .agg(trips=pl.len(), median_tip_share=pl.col("tip_share").median())
    .sort("hour")
)
display(summary)
` }],
  },

  {
    id: "messy-text-columns",
    title: "Parse messy text columns",
    group: "Data analysis",
    summary: "Rentals: turn \"$1,250.00\" prices, JSON amenity lists and \"1.5 shared baths\" into data.",
    dataset: "D05",
    files: [{ name: "main.py", code: `import json
import pandas as pd

listings = pd.read_csv("data/listings.csv")

listings["price_usd"] = listings["price"].str.replace(r"[$,]", "", regex=True).astype(float)
listings["baths"] = listings["bathrooms_text"].str.extract(r"([\\d.]+)")[0].astype(float)
listings.loc[listings["bathrooms_text"].str.contains("half", case=False), "baths"] = 0.5
listings["amenity_count"] = listings["amenities"].map(lambda text: len(json.loads(text)))
listings["has_wifi"] = listings["amenities"].map(lambda text: "Wifi" in json.loads(text))

print(listings[["price", "price_usd", "bathrooms_text", "baths", "amenity_count"]].head())
summary = listings.groupby(["neighbourhood_group", "room_type"])["price_usd"].median().unstack()
display(summary.round(0))
` }],
  },
  {
    id: "categorical-dates",
    title: "Categories and ISO dates",
    group: "Data analysis",
    summary: "Consumer Complaints: parse ISO timestamps with Z, then count by company and response.",
    dataset: "D03",
    files: [{ name: "main.py", code: `import pandas as pd

complaints = pd.read_csv("data/complaints.csv")
complaints["received"] = pd.to_datetime(complaints["date_received"], utc=True)
complaints["sent"] = pd.to_datetime(complaints["date_sent_to_company"], utc=True)
complaints["days_to_forward"] = (complaints["sent"] - complaints["received"]).dt.total_seconds() / 86400

top = complaints["company"].value_counts().head(5)
print("Most complaints:")
print(top)
responses = pd.crosstab(complaints["company"], complaints["company_response"]).loc[top.index]
display(responses)
print("Median days before the CFPB forwarded a complaint:", round(complaints["days_to_forward"].median(), 2))
` }],
  },
  // ---------------- Databases and SQL ----------------
  {
    id: "sqlite",
    title: "SQLite from Python",
    group: "Databases and SQL",
    summary: "Load a CSV into SQLite with executemany, then query it with parameters.",
    dataset: "R01",
    files: [{ name: "main.py", code: `import csv
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("""
    CREATE TABLE orders (
        order_id TEXT PRIMARY KEY,
        customer_id TEXT,
        status TEXT,
        total REAL
    )
""")

with open("data/orders.csv", newline="") as f:
    rows = [(r["order_id"], r["customer_id"], r["status"], float(r["total"])) for r in csv.DictReader(f)]
with conn:
    conn.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", rows)

status = "delivered"
count, revenue = conn.execute(
    "SELECT COUNT(*), ROUND(SUM(total), 2) FROM orders WHERE status = ?", (status,)
).fetchone()
print(f"{count} {status} orders worth {revenue}")

for customer, n in conn.execute(
    "SELECT customer_id, COUNT(*) AS n FROM orders GROUP BY customer_id ORDER BY n DESC LIMIT 5"
):
    print(customer, n)
` }],
  },
  {
    id: "duckdb",
    title: "DuckDB: SQL on files",
    group: "Databases and SQL",
    summary: "Flights: query a CSV with SQL and get a pandas DataFrame back.",
    dataset: "D13",
    files: [{ name: "main.py", code: `import duckdb

delays = duckdb.sql("""
    SELECT airline_code,
           COUNT(*) AS flights,
           ROUND(AVG(arrival_delay), 1) AS avg_arrival_delay,
           SUM(cancelled) AS cancelled
    FROM 'data/flights.csv'
    GROUP BY airline_code
    ORDER BY avg_arrival_delay DESC
""").df()

display(delays)
` }],
  },

  // ---------------- Text, dates and places ----------------
  {
    id: "text-regex",
    title: "Text and regular expressions",
    group: "Text, dates and places",
    summary: "Q&A Forum: strip HTML, pull out code blocks and count tags.",
    dataset: "D12",
    files: [{ name: "main.py", code: `import csv
import html
import re
from collections import Counter

with open("data/questions.csv", newline="", encoding="utf-8") as f:
    questions = list(csv.DictReader(f))

tags = Counter(tag for q in questions for tag in re.findall(r"<([^>]+)>", q["tags"]))
print("Top tags:", tags.most_common(6))

body = questions[0]["body"]
code_blocks = [html.unescape(c) for c in re.findall(r"<pre><code>(.*?)</code></pre>", body, flags=re.S)]
plain = html.unescape(re.sub(r"<[^>]+>", " ", body))
print("\\nTitle:", questions[0]["title"])
print("Text:", " ".join(plain.split())[:160])
print("First code block:\\n" + code_blocks[0])
` }],
  },
  {
    id: "dates-timezones",
    title: "Dates and time zones",
    group: "Text, dates and places",
    summary: "Flights: local times at two airports, and why subtracting them misleads.",
    dataset: "D13",
    files: [{ name: "main.py", code: `import csv
from datetime import datetime
from zoneinfo import ZoneInfo

ZONES = {"JFK": "America/New_York", "LAX": "America/Los_Angeles", "ORD": "America/Chicago", "DEN": "America/Denver", "SEA": "America/Los_Angeles", "ATL": "America/New_York"}

with open("data/flights.csv", newline="") as f:
    flights = [r for r in csv.DictReader(f) if r["origin"] in ZONES and r["destination"] in ZONES and r["actual_arrival"]]

for r in flights[:5]:
    dep = datetime.strptime(r["actual_departure"], "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(ZONES[r["origin"]]))
    arr = datetime.strptime(r["actual_arrival"], "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(ZONES[r["destination"]]))
    naive = (arr.replace(tzinfo=None) - dep.replace(tzinfo=None)).total_seconds() / 60
    real = (arr - dep).total_seconds() / 60
    print(f"{r['origin']}→{r['destination']}: clock difference {naive:5.0f} min, real duration {real:5.0f} min (air time {r['air_time_minutes']})")
` }],
  },
  {
    id: "geo",
    title: "Distances on a map",
    group: "Text, dates and places",
    summary: "City Map: the haversine formula, and the nearest cafés to a point.",
    dataset: "D14",
    files: [{ name: "main.py", code: `import csv
from math import asin, cos, radians, sin, sqrt


def km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two points, in kilometres."""
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))


here = (45.5189, -122.6793)  # Pioneer Courthouse Square
with open("data/places.csv", newline="", encoding="utf-8") as f:
    cafes = [p for p in csv.DictReader(f) if p["kind"] == "cafe" and p["name"]]

nearest = sorted(cafes, key=lambda p: km(*here, float(p["latitude"]), float(p["longitude"])))[:5]
for p in nearest:
    d = km(*here, float(p["latitude"]), float(p["longitude"]))
    print(f"{d * 1000:5.0f} m  {p['name']}  ({p['opening_hours'] or 'hours unknown'})")
` }],
  },
];
