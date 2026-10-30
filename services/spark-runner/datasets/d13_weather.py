"""PS-D13 Weather & Climate: Runtime's own deterministic synthetic station observations, NOAA-style but invented.

    python3 services/spark-runner/datasets/d13_weather.py

Writes fixtures/PS-D13/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same bytes.
Standard library only (zoneinfo for local hours): this runs on the host. No NOAA records are used; stations are made up.

Lessons: L018 dates, timestamps and time zones (observed_at is UTC, stations carry an IANA timezone; readings sit near
local midnight and across the US daylight-saving change on 2026-03-08), L019 nulls, NaN and missing values (NULL
temperature, NaN precipitation, the -9999 sentinel), L047 partitioned files (observation_date). Project P06 joins the
project edition's NYC-01 hourly observations to PS-D07's project taxi trips (May 2026): trip times are New York local
time, so the join converts them to UTC first; NYC-01's values for the taxi period come from PS-D07's weather_enrichment
(read from d07_taxi.py), so both weather sources agree. The contract is docs/pyspark/dataset-contracts.md §1.
"""

from __future__ import annotations

import math
import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D13"
VERSION = "1.1.0"
SEED = 2013

SCHEMAS = {
    "stations": "station_id STRING, station_name STRING, city STRING, country STRING, latitude DOUBLE, longitude DOUBLE, "
                "elevation_m INT, timezone STRING, active_since DATE",
    "observations": "observation_id STRING, station_id STRING, observed_at TIMESTAMP, observation_date DATE, temperature_c DOUBLE, "
                    "humidity_pct INT, precipitation_mm DOUBLE, wind_speed_kph DOUBLE, pressure_hpa DOUBLE, quality_flag STRING",
    "forecasts": "forecast_id STRING, station_id STRING, issued_at TIMESTAMP, valid_for TIMESTAMP, forecast_temp_c DOUBLE, "
                 "precip_probability_pct INT, forecast_precip_mm DOUBLE",
    "weather_alerts": "alert_id STRING, station_id STRING, alert_type STRING, severity STRING, issued_at TIMESTAMP, "
                      "starts_at TIMESTAMP, ends_at TIMESTAMP, headline STRING",
}
TABLE_NOTES = {
    "stations": "One row per weather station: where it is and the IANA time zone its local clock follows.",
    "observations": "One row per reading a station sent: the UTC time, its UTC date for partitioning, and the measured values.",
    "forecasts": "One row per forecast: issued at midnight UTC for a station, predicting one later hour.",
    "weather_alerts": "One row per alert raised for a station, with when it starts and ends.",
}
KEYS = {
    "primary": {"stations": ["station_id"], "observations": ["observation_id"], "forecasts": ["forecast_id"], "weather_alerts": ["alert_id"]},
    "foreign": {
        "observations.station_id": "stations.station_id",
        "forecasts.station_id": "stations.station_id",
        "weather_alerts.station_id": "stations.station_id",
    },
}
RULES = [
    "Every station, its name and its readings are invented for teaching; nothing is copied from NOAA.",
    "All TIMESTAMP columns are UTC. A station's local time is observed_at converted with from_utc_timestamp(observed_at, timezone).",
    "observation_date is the UTC calendar date of observed_at (not the local date) and is the column to partition by.",
    "Lesson and practice: US clocks moved forward at 02:00 local time on 2026-03-08 (07:00 UTC in New York): NYC-01 jumps from 01:00 EST to 03:00 EDT, so there is no 02:00 local reading that day. Lisbon and Berlin change on 2026-03-29; Kolkata and Perth have no daylight-saving time.",
    "Lesson edition: several readings sit just before and after local midnight, so their local date differs from observation_date (e.g. PNQ-01 at 18:45 UTC is 00:15 the next day in Kolkata).",
    "temperature_c is empty (null) when the sensor sent nothing. Lesson edition: NYC-01 at 2026-03-08 08:00 UTC.",
    "precipitation_mm is NaN (not a number — a real DOUBLE value, not null) when the heated rain gauge reported a fault. NaN is not null: isNull() is false and it must be found with isnan(). Lesson edition: LIS-01 at 2026-03-08 00:30 UTC.",
    "-9999 in any numeric reading (wind_speed_kph, pressure_hpa, temperature_c, humidity_pct) is the station firmware's code for 'missing' and must be treated as null, never averaged. Lesson edition: PER-01 pressure at 2026-03-07 16:10 UTC.",
    "precipitation_mm is the rain in the hour (or three hours, for 3-hourly stations) ending at observed_at; 0.0 means it was dry.",
    "quality_flag is ok, estimated (filled in by the station from neighbours) or suspect (failed the station's own checks).",
    "NYC-01 reports every hour on the hour; the other stations report every three hours (00:00, 03:00, … UTC). Practice covers 2026-03-01 to 2026-03-14 (UTC dates); project covers 2026-05-03 to 2026-05-25, the P06 taxi period (no clock change in it: New York is on EDT, UTC-4).",
    "forecasts are issued at 00:00 UTC each day for 6, 12, 18 and 24 hours ahead; forecast_temp_c differs from what was later observed by a few degrees.",
    "weather_alerts are raised from the readings: frost (temperature ≤ -2 °C), heat (≥ 32 °C), heavy_rain (≥ 4 mm in a reading), high_wind (≥ 55 km/h). ends_at is empty for an alert still in force at the end of the data.",
    "Practice edition: about 1% of readings each have a null temperature, a NaN precipitation and a -9999 sentinel.",
    "Project edition problem 1: missing values are more common (about 3% each of null temperature, NaN precipitation and -9999).",
    "Project edition problem 2: about 1% of readings were delivered twice: same station, observed_at and values under a new observation_id.",
    "Project edition problem 3: NYC-01 has gaps — a dozen hours inside the taxi period with no reading at all — so an hourly join to taxi trips finds no weather for those hours.",
    "Project edition problem 4: a few readings are physically impossible (temperature above 60 °C or humidity above 100%) and are still flagged ok.",
    "Project edition and PS-D07 (P06): PS-D07's pickup_at and dropoff_at are New York local wall-clock time, and every one of its taxi zones (airports and unknown zone ids included) takes its weather from NYC-01, Harbor Point Station, which stands in zone 10 Harbor Point. A trip's reading is the NYC-01 one at date_trunc('hour', to_utc_timestamp(pickup_at, 'America/New_York')) + 1 hour (the reading for the hour the trip started in).",
    "Project edition and PS-D07 (P06): for every hour of the taxi period (2026-05-04 00:00 to 2026-05-24 23:00 New York time) NYC-01's temperature_c, precipitation_mm and wind_speed_kph equal PS-D07's project weather_enrichment for that local date and hour, except where a reading is missing, duplicated, null, NaN, -9999 or impossible as the problems above say.",
]

# id, name, city, country, lat, lon, elevation, tz, March mean °C, daily swing, humidity, wind, rain chance
STATIONS = [
    ("NYC-01", "Harbor Point Station", "New York", "US", 40.7312, -73.9874, 12, "America/New_York", 6.0, 8.0, 62, 18, 0.30),
    ("LIS-01", "Alfama Hill Station", "Lisbon", "PT", 38.7139, -9.1334, 95, "Europe/Lisbon", 14.5, 7.0, 72, 16, 0.32),
    ("PNQ-01", "Sinhagad Road Station", "Pune", "IN", 18.4815, 73.8262, 560, "Asia/Kolkata", 27.5, 14.0, 34, 10, 0.04),
    ("PER-01", "Swan Reach Station", "Perth", "AU", -31.9488, 115.8563, 24, "Australia/Perth", 24.5, 11.0, 48, 20, 0.08),
    ("CHI-01", "Lakefront Yard Station", "Chicago", "US", 41.8902, -87.6081, 180, "America/Chicago", 3.5, 8.0, 66, 24, 0.28),
    ("DEN-01", "Foothill Ridge Station", "Denver", "US", 39.7420, -104.9915, 1609, "America/Denver", 5.5, 15.0, 42, 22, 0.15),
    ("SEA-01", "Sound View Station", "Seattle", "US", 47.6080, -122.3371, 54, "America/Los_Angeles", 8.5, 6.0, 78, 14, 0.50),
    ("BER-01", "Spreebogen Station", "Berlin", "DE", 52.5190, 13.3761, 34, "Europe/Berlin", 5.0, 7.5, 70, 17, 0.30),
]
UTC = timezone.utc
MISSING = -9999
# Spark's CSV reader spells NaN as "NaN" (its nanValue); Python's str(float("nan")) is "nan", which Spark rejects.
NAN = "NaN"


def local_hour(t: datetime, tz: str) -> float:
    lt = t.replace(tzinfo=UTC).astimezone(ZoneInfo(tz))
    return lt.hour + lt.minute / 60


def station_rows(which: list[str]) -> list[dict]:
    out = []
    for s in STATIONS:
        if s[0] in which:
            out.append({"station_id": s[0], "station_name": s[1], "city": s[2], "country": s[3], "latitude": s[4], "longitude": s[5],
                        "elevation_m": s[6], "timezone": s[7], "active_since": date(2019 + STATIONS.index(s) % 5, 1 + STATIONS.index(s) % 12, 1)})
    return out


# Project edition (May 2026): seasonal shift of each station's March mean, °C.
MAY_SHIFT = {"NYC-01": 6.0, "LIS-01": 3.0, "PNQ-01": 3.5, "PER-01": -7.0, "CHI-01": 11.0, "DEN-01": 8.0, "SEA-01": 5.0, "BER-01": 9.0}


def taxi_weather() -> dict[datetime, tuple[float, float, float]]:
    """PS-D07's project weather_enrichment, keyed by the UTC end of each New York local hour: observed_at → values."""
    import d07_taxi

    ny = ZoneInfo("America/New_York")
    out = {}
    for w in d07_taxi.project()["weather_enrichment"]:
        local = datetime.combine(w["obs_date"], datetime.min.time()).replace(hour=w["obs_hour"], tzinfo=ny)
        out[local.astimezone(UTC).replace(tzinfo=None) + timedelta(hours=1)] = (w["temperature_c"], w["precipitation_mm"], w["wind_kph"])
    return out


def observe(rng: random.Random, start: date, days: int, missing: float, shift: dict | None = None, nyc: dict | None = None):
    """Readings for all stations: a diurnal cycle on local time, day-to-day drift, and rainy spells.

    `shift` moves each station's mean for another month; `nyc` overrides NYC-01's temperature, rain and wind by observed_at.
    """
    obs = []
    for s in STATIONS:
        sid, tz, mean, swing, hum, wind, rain = s[0], s[7], s[8] + (shift or {}).get(s[0], 0.0), s[9], s[10], s[11], s[12]
        step = 1 if sid == "NYC-01" else 3
        drift = 0.0
        rainy = False
        t = datetime.combine(start, datetime.min.time())
        end = t + timedelta(days=days)
        while t < end:
            if t.hour == 0:
                drift = max(-7.0, min(7.0, drift * 0.6 + rng.gauss(0, 2.5)))
                rainy = rng.random() < rain
            h = local_hour(t, tz)
            temp = mean + drift + swing / 2 * math.cos((h - 15) / 24 * 2 * math.pi) + rng.gauss(0, 0.6)
            wet = rainy and rng.random() < 0.45
            precip = round(min(12.0, rng.expovariate(0.8)) * step ** 0.5, 1) if wet else 0.0
            humidity = int(max(8, min(100, hum + (18 if wet else 0) - (temp - mean) * 1.5 + rng.gauss(0, 5))))
            gust = rng.random() < 0.03
            speed = round(max(0.0, rng.gauss(wind, wind * 0.35) + (rng.uniform(25, 40) if gust else 0)), 1)
            pressure = round(1013.0 + rng.gauss(0, 6) - (8 if wet else 0) - s[6] / 120, 1)
            if nyc and sid == "NYC-01" and t in nyc:
                temp, precip, speed = nyc[t]
                wet = precip > 0
                humidity = int(max(8, min(100, hum + (18 if wet else 0) - (temp - mean) * 1.5 + rng.gauss(0, 5))))
            r = {"station_id": sid, "observed_at": t, "observation_date": t.date(), "temperature_c": round(temp, 1),
                 "humidity_pct": humidity, "precipitation_mm": precip, "wind_speed_kph": speed, "pressure_hpa": pressure,
                 "quality_flag": rng.choices(["ok", "estimated", "suspect"], [96, 3, 1])[0]}
            if rng.random() < missing:
                r["temperature_c"] = None
            if rng.random() < missing:
                r["precipitation_mm"] = NAN
            if rng.random() < missing:
                r[rng.choice(["wind_speed_kph", "pressure_hpa", "pressure_hpa", "humidity_pct", "temperature_c"])] = MISSING
            obs.append(r)
            t += timedelta(hours=step)
    return obs


def number(obs: list[dict]) -> list[dict]:
    obs.sort(key=lambda r: (r["observed_at"], r["station_id"], r.get("_dup", 0)))
    for i, r in enumerate(obs, 1):
        r["observation_id"] = f"OBS-{i:06d}"
        r.pop("_dup", None)
    return obs


def valid(v) -> bool:
    return v is not None and v != NAN and v != MISSING


def make_forecasts(rng: random.Random, obs: list[dict]) -> list[dict]:
    seen = {(r["station_id"], r["observed_at"]): r for r in obs}
    days = sorted({r["observed_at"].date() for r in obs})
    out = []
    for d in days:
        issued = datetime.combine(d, datetime.min.time())
        for sid in [s[0] for s in STATIONS]:
            if (sid, issued) not in seen:
                continue
            for ahead in (6, 12, 18, 24):
                v = issued + timedelta(hours=ahead)
                actual = seen.get((sid, v))
                if actual is None:
                    continue
                t = actual["temperature_c"] if valid(actual["temperature_c"]) else seen[(sid, issued)]["temperature_c"]
                t = t if valid(t) else 10.0
                wet = valid(actual["precipitation_mm"]) and actual["precipitation_mm"] > 0
                prob = max(0, min(100, int(rng.gauss(70 if wet else 15, 15)) // 5 * 5))
                out.append({"station_id": sid, "issued_at": issued, "valid_for": v,
                            "forecast_temp_c": round(t + rng.gauss(0, 1.2 + ahead / 12), 1), "precip_probability_pct": prob,
                            "forecast_precip_mm": round(max(0.0, rng.gauss(1.5, 1.0)), 1) if prob >= 50 else 0.0})
    out.sort(key=lambda r: (r["issued_at"], r["station_id"], r["valid_for"]))
    for i, r in enumerate(out, 1):
        r["forecast_id"] = f"FC-{i:06d}"
    return out


ALERTS = [
    ("frost", lambda r: valid(r["temperature_c"]) and r["temperature_c"] <= -2, "Frost expected; protect exposed pipes and plants."),
    ("heat", lambda r: valid(r["temperature_c"]) and r["temperature_c"] >= 32, "High temperatures; limit outdoor work in the afternoon."),
    ("heavy_rain", lambda r: valid(r["precipitation_mm"]) and r["precipitation_mm"] >= 4, "Heavy rain; localized flooding possible."),
    ("high_wind", lambda r: valid(r["wind_speed_kph"]) and r["wind_speed_kph"] >= 55, "Strong winds; secure loose objects."),
]


def make_alerts(obs: list[dict]) -> list[dict]:
    """Group consecutive triggering readings per station and type into one alert."""
    by_station: dict[str, list[dict]] = {}
    for r in obs:
        by_station.setdefault(r["station_id"], []).append(r)
    out = []
    last_time = max(r["observed_at"] for r in obs)
    for sid in sorted(by_station):
        rows = sorted(by_station[sid], key=lambda r: r["observed_at"])
        step = timedelta(hours=1 if sid == "NYC-01" else 3)
        for kind, test, headline in ALERTS:
            run = []
            for r in rows + [None]:
                if r is not None and test(r) and (not run or r["observed_at"] - run[-1]["observed_at"] <= step):
                    run.append(r)
                    continue
                if run:
                    starts = run[0]["observed_at"]
                    ends = run[-1]["observed_at"] + step
                    hours = (ends - starts).total_seconds() / 3600
                    out.append({"station_id": sid, "alert_type": kind,
                                "severity": "warning" if hours >= 6 else "watch" if hours >= 3 else "advisory",
                                "issued_at": starts - timedelta(hours=2), "starts_at": starts,
                                "ends_at": None if ends > last_time else ends, "headline": headline})
                run = [r] if r is not None and test(r) else []
    out.sort(key=lambda r: (r["starts_at"], r["station_id"], r["alert_type"]))
    for i, r in enumerate(out, 1):
        r["alert_id"] = f"AL-{i:04d}"
    return out


def build(rng: random.Random, start: date, days: int, missing: float, shift: dict | None = None, nyc: dict | None = None) -> dict:
    obs = number(observe(rng, start, days, missing, shift, nyc))
    return {"stations": station_rows([s[0] for s in STATIONS]), "observations": obs,
            "forecasts": make_forecasts(rng, obs), "weather_alerts": make_alerts(obs)}


def add_problems(rng: random.Random, ed: dict, taxi_hours: set) -> None:
    obs = ed["observations"]
    nyc = [r for r in obs if r["station_id"] == "NYC-01" and r["observed_at"] in taxi_hours]
    gaps = {r["observation_id"] for r in rng.sample(nyc, 12)}
    obs = [r for r in obs if r["observation_id"] not in gaps]
    for r in rng.sample(obs, 6):
        if rng.random() < 0.5:
            r["temperature_c"] = round(rng.uniform(61, 75), 1)
        else:
            r["humidity_pct"] = rng.randint(101, 140)
        r["quality_flag"] = "ok"
    dups = []
    for r in obs:
        if rng.random() < 0.01:
            d = dict(r)
            d["_dup"] = 1
            dups.append(d)
    ed["observations"] = number(obs + dups)


def lesson() -> dict:
    """Hand-written: twelve readings around local midnight and the US clock change, with one null, one NaN, one -9999."""
    rows = [
        ("NYC-01", datetime(2026, 3, 8, 4, 0), 2.1, 71, 0.0, 14.8, 1016.2),   # 23:00 EST on Mar 7
        ("NYC-01", datetime(2026, 3, 8, 5, 0), 1.6, 73, 0.0, 13.0, 1016.4),   # 00:00 EST on Mar 8
        ("NYC-01", datetime(2026, 3, 8, 6, 0), 1.2, 74, 0.0, 12.2, 1016.1),   # 01:00 EST
        ("NYC-01", datetime(2026, 3, 8, 7, 0), 0.9, 76, 0.2, 11.5, 1015.8),   # 03:00 EDT: clocks skipped 02:00
        ("NYC-01", datetime(2026, 3, 8, 8, 0), None, 77, 0.4, 12.9, 1015.3),  # 04:00 EDT: no temperature sent
        ("LIS-01", datetime(2026, 3, 7, 23, 30), 11.4, 81, 0.0, 9.4, 1019.0),  # 23:30 in Lisbon
        ("LIS-01", datetime(2026, 3, 8, 0, 30), 11.0, 83, NAN, 8.7, 1018.6),   # 00:30: rain gauge fault
        ("PNQ-01", datetime(2026, 3, 7, 18, 15), 24.8, 31, 0.0, 6.1, 1008.9),  # 23:45 IST
        ("PNQ-01", datetime(2026, 3, 7, 18, 45), 24.1, 33, 0.0, 5.4, 1009.1),  # 00:15 IST on Mar 8
        ("PER-01", datetime(2026, 3, 7, 15, 50), 21.3, 55, 0.0, 15.2, 1012.7),  # 23:50 AWST
        ("PER-01", datetime(2026, 3, 7, 16, 10), 21.0, 56, 0.0, 14.6, MISSING),  # 00:10 AWST: pressure sentinel
        ("PER-01", datetime(2026, 3, 8, 4, 0), 33.4, 24, 0.0, 22.8, 1010.4),   # 12:00 AWST
    ]
    obs = [{"station_id": s, "observed_at": t, "observation_date": t.date(), "temperature_c": temp, "humidity_pct": hum,
            "precipitation_mm": p, "wind_speed_kph": w, "pressure_hpa": pr, "quality_flag": "ok"} for s, t, temp, hum, p, w, pr in rows]
    obs = number(obs)
    fc = []
    for i, (s, issued, ahead, temp, prob) in enumerate([
        ("NYC-01", datetime(2026, 3, 8), 6, 1.0, 20), ("NYC-01", datetime(2026, 3, 8), 12, 6.5, 35),
        ("LIS-01", datetime(2026, 3, 8), 6, 10.2, 60), ("PNQ-01", datetime(2026, 3, 8), 6, 31.5, 0),
        ("PER-01", datetime(2026, 3, 8), 6, 32.1, 5), ("PER-01", datetime(2026, 3, 8), 12, 26.0, 0)], 1):
        fc.append({"forecast_id": f"FC-{i:06d}", "station_id": s, "issued_at": issued, "valid_for": issued + timedelta(hours=ahead),
                   "forecast_temp_c": temp, "precip_probability_pct": prob, "forecast_precip_mm": 1.2 if prob >= 50 else 0.0})
    alerts = [
        {"alert_id": "AL-0001", "station_id": "NYC-01", "alert_type": "frost", "severity": "watch", "issued_at": datetime(2026, 3, 9, 6, 0),
         "starts_at": datetime(2026, 3, 9, 8, 0), "ends_at": datetime(2026, 3, 9, 12, 0), "headline": ALERTS[0][2]},
        {"alert_id": "AL-0002", "station_id": "PER-01", "alert_type": "heat", "severity": "warning", "issued_at": datetime(2026, 3, 8, 1, 0),
         "starts_at": datetime(2026, 3, 8, 3, 0), "ends_at": datetime(2026, 3, 8, 10, 0), "headline": ALERTS[1][2]},
        {"alert_id": "AL-0003", "station_id": "LIS-01", "alert_type": "heavy_rain", "severity": "advisory", "issued_at": datetime(2026, 3, 8, 9, 0),
         "starts_at": datetime(2026, 3, 8, 11, 0), "ends_at": datetime(2026, 3, 8, 13, 0), "headline": ALERTS[2][2]},
        {"alert_id": "AL-0004", "station_id": "NYC-01", "alert_type": "high_wind", "severity": "advisory", "issued_at": datetime(2026, 3, 8, 16, 0),
         "starts_at": datetime(2026, 3, 8, 18, 0), "ends_at": None, "headline": ALERTS[3][2]},
    ]
    return {"stations": station_rows(["NYC-01", "LIS-01", "PNQ-01", "PER-01"]), "observations": obs, "forecasts": fc, "weather_alerts": alerts}


def main() -> dict:
    practice = build(random.Random(SEED + 1), date(2026, 3, 1), 14, missing=0.01)
    # P06: the PS-D07 taxi period (docs/pyspark/dataset-contracts.md §1).
    nyc = taxi_weather()
    project = build(random.Random(SEED + 2), date(2026, 5, 3), 23, missing=0.03, shift=MAY_SHIFT, nyc=nyc)
    add_problems(random.Random(SEED + 3), project, set(nyc))
    editions = {"lesson": lesson(), "practice": practice, "project": project}
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Weather & Climate",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d13_weather.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
