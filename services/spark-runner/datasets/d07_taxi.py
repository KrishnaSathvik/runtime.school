"""PS-D07 Transportation & Taxi: Runtime's own deterministic synthetic city taxi trips (invented city, zones and drivers).

    python3 services/spark-runner/datasets/d07_taxi.py

Writes fixtures/PS-D07/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.
The shape follows a city trip-record export (pickup and dropoff zones, meter distance, fare, tip, payment) but the city
of Kestrel Bay and every value in it is made up. Lessons convert these CSVs to Parquet and ORC themselves.

Editions: `lesson` is hand-written and readable whole (distances and tips chosen to show rounding); `practice` is two
weeks of trips with hourly weather; `project` is what P06 cleans: zero-distance trips, negative fares, dropoffs before
pickups and unknown zone ids. Project P06 joins the project edition to PS-D13's project edition: trip times are New
York local time and every zone takes its weather from station NYC-01 (docs/pyspark/dataset-contracts.md §1).
"""

from __future__ import annotations

import math
import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D07"
VERSION = "1.0.0"
SEED = 2007

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "trips": "trip_id STRING, driver_id STRING, pickup_at TIMESTAMP, dropoff_at TIMESTAMP, pickup_zone_id INT, dropoff_zone_id INT, "
             "passenger_count INT, trip_distance DOUBLE, rate_code STRING, fare DECIMAL(8,2), tip DECIMAL(8,2), tolls DECIMAL(8,2), "
             "surcharge DECIMAL(8,2), total DECIMAL(8,2), payment_type STRING",
    "taxi_zones": "zone_id INT, zone_name STRING, borough STRING, service_zone STRING",
    "fare_rules": "rate_code STRING, description STRING, base_fare DECIMAL(6,2), per_mile DECIMAL(6,2), per_minute DECIMAL(6,2), "
                  "minimum_fare DECIMAL(6,2), flat_fare DECIMAL(6,2), surcharge DECIMAL(6,2)",
    "drivers": "driver_id STRING, display_name STRING, vehicle_type STRING, joined_date DATE, home_zone_id INT, active BOOLEAN",
    "weather_enrichment": "obs_date DATE, obs_hour INT, temperature_c DOUBLE, precipitation_mm DOUBLE, wind_kph DOUBLE, conditions STRING",
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "trips": "One row per completed taxi trip: when and where it started and ended, the meter distance and what was paid.",
    "taxi_zones": "One row per pickup/dropoff zone of the city, with its borough.",
    "fare_rules": "One row per rate code: how the meter prices a trip under it.",
    "drivers": "One row per licensed driver: their vehicle, when they joined and their home zone.",
    "weather_enrichment": "One row per hour of the trip period: temperature, rain, wind and conditions, to join on pickup date and hour.",
}
KEYS = {
    "primary": {"trips": ["trip_id"], "taxi_zones": ["zone_id"], "fare_rules": ["rate_code"], "drivers": ["driver_id"], "weather_enrichment": ["obs_date", "obs_hour"]},
    "foreign": {
        "trips.pickup_zone_id": "taxi_zones.zone_id",
        "trips.dropoff_zone_id": "taxi_zones.zone_id",
        "trips.driver_id": "drivers.driver_id",
        "trips.rate_code": "fare_rules.rate_code",
        "drivers.home_zone_id": "taxi_zones.zone_id",
    },
}
RULES = [
    "fare is what the meter charged under the trip's rate code: base_fare + per_mile × trip_distance + per_minute × minutes, at least minimum_fare, rounded half up to cents; airport trips pay the flat_fare instead.",
    "total = fare + tip + tolls + surcharge, exactly, in every edition (including the damaged project rows).",
    "Card and wallet tips are a percentage of fare (mostly 15, 18, 20 or 25%) rounded half up to cents, so 18% of 11.25 = 2.025 is stored as 2.03 (lesson trip T006) and a 15.625 meter fare as 15.63 (T001); cash tips are recorded as 0.00.",
    "trip_distance is the meter's reading in miles with two decimals; values ending in 5 (2.25, 2.35, 0.95 in the lesson edition) show the difference between round() (half up) and bround() (half even).",
    "Night trips (pickup 20:00 to 05:59) use the night rate code; trips touching an airport zone use airport_flat.",
    "payment_type is card, cash, wallet, no_charge or dispute; no_charge and dispute trips have a tip of 0.00.",
    "weather_enrichment has one row per date and hour (obs_hour 0 to 23) of the edition's period; join it on to_date(pickup_at) and hour(pickup_at).",
    "passenger_count is missing (null) for about 2% of practice and project trips where the driver didn't key it in.",
    "The project edition is a raw meter export with problems to clean: zero-distance trips (about 1.5%), negative fares and totals from reversed charges (about 1%), dropoff_at earlier than pickup_at (about 1%) and pickup or dropoff zone ids 0 or 99 that are not in taxi_zones (about 1.5%).",
    "Lesson and practice trips are clean: positive distances and fares, dropoff after pickup, known zones and drivers.",
]

BOROUGHS = {
    "Northbank": ["Harbor Point", "Mill District", "Signal Hill", "Lantern Row", "Cedar Flats", "Glassworks"],
    "Riverside": ["Ferry Landing", "Otter Bend", "Willow Quay", "Saltmarsh", "Brickfield", "Tannery Lane"],
    "Eastfield": ["Orchard Park", "Copper Gate", "Foundry Yard", "Kiln Street", "Elm Terrace", "Rope Walk"],
    "Old Quarter": ["Cathedral Steps", "Market Square", "Guild Hall", "Clocktower", "Printers Court", "Dock Gate"],
    "Outer Ring": ["Pinecrest", "Quarry Hills", "Larkspur"],
}
AIRPORTS = ["Kestrel Airport Terminal A", "Kestrel Airport Terminal B", "Kestrel Airport Cargo"]
FIRST = ["Amara", "Bastian", "Calla", "Dario", "Esme", "Faris", "Greta", "Hugo", "Ilse", "Joaquin", "Kaia", "Lionel", "Mira",
         "Nico", "Odile", "Pavel", "Quinn", "Rosa", "Soren", "Talia"]
LAST_INITIALS = "ABCDEFGHJKLMNPRSTVW"
VEHICLES = ["sedan", "suv", "van", "ev"]
CENT = Decimal("0.01")
ZERO = Decimal("0.00")


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(CENT, rounding=ROUND_HALF_UP)


FARE_RULES = [
    {"rate_code": "standard", "description": "Day meter rate", "base_fare": money(3.00), "per_mile": money(2.50), "per_minute": money(0.50), "minimum_fare": money(7.00), "flat_fare": None, "surcharge": money(0.50)},
    {"rate_code": "night", "description": "Night meter rate, 20:00 to 05:59", "base_fare": money(3.50), "per_mile": money(2.75), "per_minute": money(0.55), "minimum_fare": money(8.00), "flat_fare": None, "surcharge": money(1.00)},
    {"rate_code": "airport_flat", "description": "Flat fare to or from an airport zone", "base_fare": ZERO, "per_mile": ZERO, "per_minute": ZERO, "minimum_fare": money(52.00), "flat_fare": money(52.00), "surcharge": money(1.75)},
    {"rate_code": "shared", "description": "Shared ride, per rider", "base_fare": money(2.00), "per_mile": money(1.60), "per_minute": money(0.30), "minimum_fare": money(5.00), "flat_fare": None, "surcharge": money(0.50)},
]
RULE = {r["rate_code"]: r for r in FARE_RULES}


def zones_all(rng: random.Random) -> tuple[list[dict], dict]:
    """30 zones with hidden map positions (miles) used only to make distances plausible."""
    zones, pos = [], {}
    centres = {"Northbank": (0, 4), "Riverside": (-3, 0), "Eastfield": (4, 0), "Old Quarter": (0, 0), "Outer Ring": (0, -7), "Airport": (9, -6)}
    zid = 1
    for i, name in enumerate(AIRPORTS):
        zones.append({"zone_id": zid, "zone_name": name, "borough": "Airport", "service_zone": "Airports"})
        pos[zid] = (9 + i * 0.6, -6 + i * 0.4)
        zid += 1
    for borough in ["Old Quarter", "Northbank", "Riverside", "Eastfield", "Outer Ring"]:
        for name in BOROUGHS[borough]:
            cx, cy = centres[borough]
            zones.append({"zone_id": zid, "zone_name": name, "borough": borough, "service_zone": "Outer" if borough == "Outer Ring" else "Core"})
            pos[zid] = (cx + rng.uniform(-1.6, 1.6), cy + rng.uniform(-1.6, 1.6))
            zid += 1
    return zones, pos


def is_airport(zid: int) -> bool:
    return 1 <= zid <= 3


def price(rate_code: str, distance: float, minutes: float, payment: str, tip_pct: float, tolls: Decimal) -> dict:
    r = RULE[rate_code]
    if r["flat_fare"] is not None:
        fare = r["flat_fare"]
    else:
        fare = max(r["minimum_fare"], (r["base_fare"] + r["per_mile"] * Decimal(str(distance)) + r["per_minute"] * Decimal(str(round(minutes, 2)))).quantize(CENT, rounding=ROUND_HALF_UP))
    tip = (fare * Decimal(str(tip_pct))).quantize(CENT, rounding=ROUND_HALF_UP) if payment in ("card", "wallet") else ZERO
    return {"rate_code": rate_code, "fare": fare, "tip": tip, "tolls": tolls, "surcharge": r["surcharge"], "total": fare + tip + tolls + r["surcharge"], "payment_type": payment}


def lesson() -> dict:
    rng = random.Random(SEED)
    zones_full, _ = zones_all(rng)
    keep = [1, 4, 5, 10, 16, 22]
    zones = [z for z in zones_full if z["zone_id"] in keep]
    drivers = [
        {"driver_id": "DRV-001", "display_name": "Amara K.", "vehicle_type": "sedan", "joined_date": date(2023, 4, 2), "home_zone_id": 4, "active": True},
        {"driver_id": "DRV-002", "display_name": "Dario M.", "vehicle_type": "ev", "joined_date": date(2024, 9, 15), "home_zone_id": 10, "active": True},
        {"driver_id": "DRV-003", "display_name": "Esme T.", "vehicle_type": "suv", "joined_date": date(2025, 1, 20), "home_zone_id": 16, "active": True},
        {"driver_id": "DRV-004", "display_name": "Hugo B.", "vehicle_type": "van", "joined_date": date(2022, 11, 7), "home_zone_id": 22, "active": False},
    ]
    day = datetime(2026, 4, 7)
    # (driver, pickup h:m, minutes, from, to, passengers, distance, payment, tip %, tolls)
    spec = [
        ("DRV-001", (7, 5), 14.0, 4, 5, 1, 2.25, "card", 0.18, 0),
        ("DRV-002", (7, 12), 15.0, 10, 4, 2, 2.35, "card", 0.20, 0),
        ("DRV-001", (7, 40), 6.5, 5, 4, 1, 0.95, "cash", 0, 0),
        ("DRV-003", (8, 2), 31.0, 16, 1, 3, 10.05, "card", 0.15, 6.55),
        ("DRV-002", (8, 25), 22.0, 4, 22, 1, 4.6, "wallet", 0.25, 0),
        ("DRV-001", (8, 51), 9.0, 5, 10, 1, 1.5, "card", 0.18, 0),
        ("DRV-003", (9, 30), 38.0, 1, 10, 2, 11.8, "card", 0.20, 6.55),
        ("DRV-002", (9, 44), 12.0, 22, 16, 4, 3.15, "cash", 0, 0),
        ("DRV-001", (10, 15), 11.0, 10, 5, 1, 2.25, "card", 0.15, 0),
        ("DRV-003", (10, 58), 18.0, 4, 16, 1, 3.85, "dispute", 0, 0),
        ("DRV-002", (11, 20), 8.0, 16, 22, 2, 1.25, "card", 0.25, 0),
        ("DRV-001", (12, 3), 16.0, 22, 4, 1, 3.4, "card", 0.18, 0),
    ]
    trips = []
    for i, (drv, (h, m), minutes, a, b, pax, dist, pay, pct, tolls) in enumerate(spec, 1):
        pickup = day.replace(hour=h, minute=m, second=(i * 7) % 60)
        code = "airport_flat" if is_airport(a) or is_airport(b) else "standard"
        trips.append({"trip_id": f"T{i:03d}", "driver_id": drv, "pickup_at": pickup, "dropoff_at": pickup + timedelta(minutes=minutes),
                      "pickup_zone_id": a, "dropoff_zone_id": b, "passenger_count": pax, "trip_distance": dist,
                      **price(code, dist, minutes, pay, pct, money(tolls))})
    weather = [
        {"obs_date": day.date(), "obs_hour": h, "temperature_c": t, "precipitation_mm": p, "wind_kph": w, "conditions": c}
        for h, t, p, w, c in [(7, 8.4, 0.0, 9.0, "cloudy"), (8, 9.1, 0.4, 12.5, "rain"), (9, 9.8, 2.6, 18.0, "heavy_rain"),
                              (10, 10.5, 1.1, 15.5, "rain"), (11, 11.9, 0.0, 11.0, "cloudy"), (12, 13.2, 0.0, 8.5, "clear")]
    ]
    return {"trips": trips, "taxi_zones": zones, "fare_rules": FARE_RULES, "drivers": drivers, "weather_enrichment": weather}


def weather_for(rng: random.Random, first: date, days: int) -> list[dict]:
    rows, wet = [], False
    for d in range(days):
        day = first + timedelta(days=d)
        base = 9 + d * 0.25 + rng.uniform(-2, 2)
        for h in range(24):
            wet = rng.random() < (0.75 if wet else 0.06)
            rain = round(rng.expovariate(1 / 1.6), 1) if wet else 0.0
            temp = round(base + 5 * math.sin((h - 9) / 24 * 2 * math.pi) + rng.uniform(-0.8, 0.8) - (1.5 if wet else 0), 1)
            wind = round(max(0.0, rng.gauss(14 if wet else 10, 4)), 1)
            cond = ("heavy_rain" if rain >= 4 else "rain") if rain > 0 else ("fog" if h < 8 and rng.random() < 0.12 else rng.choice(["clear", "clear", "cloudy"]))
            rows.append({"obs_date": day, "obs_hour": h, "temperature_c": temp, "precipitation_mm": rain, "wind_kph": wind, "conditions": cond})
    return rows


HOUR_WEIGHTS = [3, 2, 1.5, 1, 1, 1.5, 3, 6, 8, 7, 6, 6, 6.5, 6.5, 6, 6.5, 7, 8, 9, 8.5, 7, 6, 5.5, 4.5]


def build(rng: random.Random, first: date, days: int, n_trips: int, n_drivers: int, null_pax_share: float):
    zones, pos = zones_all(rng)
    ids = [z["zone_id"] for z in zones]
    zone_weights = [3 if is_airport(z) else 6 if z <= 9 else 1 if z >= 28 else 4 for z in ids]
    weather = weather_for(rng, first, days)
    rain = {(w["obs_date"], w["obs_hour"]): w["precipitation_mm"] for w in weather}
    drivers = []
    for i in range(1, n_drivers + 1):
        drivers.append({"driver_id": f"DRV-{i:03d}", "display_name": f"{rng.choice(FIRST)} {rng.choice(LAST_INITIALS)}.",
                        "vehicle_type": rng.choices(VEHICLES, [50, 20, 8, 22])[0], "joined_date": date(2019, 1, 1) + timedelta(days=rng.randint(0, 2600)),
                        "home_zone_id": rng.choice([z for z in ids if not is_airport(z)]), "active": rng.random() > 0.06})
    working = [d for d in drivers if d["active"]]
    trips = []
    for _ in range(n_trips):
        d = rng.randrange(days)
        h = rng.choices(range(24), HOUR_WEIGHTS)[0]
        pickup = datetime.combine(first + timedelta(days=d), datetime.min.time()) + timedelta(hours=h, minutes=rng.randint(0, 59), seconds=rng.randint(0, 59))
        a = rng.choices(ids, zone_weights)[0]
        b = rng.choices(ids, zone_weights)[0]
        while is_airport(a) and is_airport(b):
            b = rng.choices(ids, zone_weights)[0]
        (x1, y1), (x2, y2) = pos[a], pos[b]
        dist = round(max(0.3, math.hypot(x1 - x2, y1 - y2) * 1.25 + rng.uniform(0.2, 1.4) if a != b else rng.uniform(0.3, 1.8)), 2)
        speed = 11 if h in (7, 8, 9, 16, 17, 18) else 22 if h < 6 or h >= 21 else 16
        if rain[(pickup.date(), h)] > 0:
            speed *= 0.8
        minutes = round(dist / speed * 60 + rng.uniform(1, 6), 2)
        code = "airport_flat" if is_airport(a) or is_airport(b) else "night" if h >= 20 or h < 6 else "shared" if rng.random() < 0.04 else "standard"
        pay = rng.choices(["card", "cash", "wallet", "no_charge", "dispute"], [62, 20, 15, 2, 1])[0]
        pct = rng.choices([0.0, 0.10, 0.15, 0.18, 0.20, 0.25, 0.30], [8, 6, 22, 26, 24, 11, 3])[0]
        tolls = money(6.55) if code == "airport_flat" and rng.random() < 0.6 else money(3.25) if dist > 6 and rng.random() < 0.15 else ZERO
        pax = rng.choices([1, 2, 3, 4, 5, 6], [62, 20, 8, 6, 2, 2])[0] if code != "shared" else 1
        trips.append({"driver_id": rng.choice(working)["driver_id"], "pickup_at": pickup, "dropoff_at": pickup + timedelta(seconds=round(minutes * 60)),
                      "pickup_zone_id": a, "dropoff_zone_id": b, "passenger_count": None if rng.random() < null_pax_share else pax,
                      "trip_distance": dist, **price(code, dist, minutes, pay, pct, tolls)})
    trips.sort(key=lambda t: (t["pickup_at"], t["driver_id"]))
    trips = [{"trip_id": f"T{i:06d}", **t} for i, t in enumerate(trips, 1)]
    return {"trips": trips, "taxi_zones": zones, "fare_rules": FARE_RULES, "drivers": drivers, "weather_enrichment": weather}


def add_problems(rng: random.Random, trips: list[dict]) -> None:
    """Damage trips the way a raw meter export does. Each damaged trip gets exactly one problem."""
    for t in trips:
        x = rng.random()
        if x < 0.015:  # meter started and stopped without moving
            t["trip_distance"] = 0.0
            t["dropoff_at"] = t["pickup_at"] + timedelta(seconds=rng.randint(20, 240))
        elif x < 0.025:  # reversed charge exported as a negative fare
            t["fare"], t["tip"], t["total"] = -t["fare"], -t["tip"], -t["fare"] + -t["tip"] + t["tolls"] + t["surcharge"]
        elif x < 0.035:  # clock error: dropoff before pickup
            t["pickup_at"], t["dropoff_at"] = t["dropoff_at"], t["pickup_at"]
        elif x < 0.050:  # zone not in the lookup table
            key = rng.choice(["pickup_zone_id", "dropoff_zone_id"])
            t[key] = rng.choice([0, 99])


def project() -> dict:
    """The P06 edition. PS-D13's project edition (d13_weather.py) takes NYC-01's hourly weather from its weather_enrichment."""
    ed = build(random.Random(SEED + 2), first=date(2026, 5, 4), days=21, n_trips=5200, n_drivers=180, null_pax_share=0.02)
    add_problems(random.Random(SEED + 3), ed["trips"])
    return ed


def main() -> dict:
    editions = {
        "lesson": lesson(),
        "practice": build(random.Random(SEED + 1), first=date(2026, 4, 6), days=14, n_trips=3000, n_drivers=120, null_pax_share=0.02),
        "project": project(),
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Transportation & Taxi",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d07_taxi.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
