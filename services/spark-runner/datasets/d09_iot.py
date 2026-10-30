"""PS-D09 IoT & Sensors: Runtime's own deterministic synthetic sensor telemetry for a small fleet of building sensors.

    python3 services/spark-runner/datasets/d09_iot.py

Writes fixtures/PS-D09/<version>/<edition>/<table>.<csv|jsonl> and manifest.json. The same seed always produces the
same bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

`sensor_readings` is JSON Lines with a nested payload (STRUCT and ARRAY), written in arrival order the way a stream
delivers it; `batch` is the micro-batch the reading arrived in. Editions: `lesson` is one hour of four sensors, small
enough to read whole, with one late reading and one duplicate delivery; `practice` is two days of a dozen sensors with
some late, duplicated, incomplete and glitched readings; `project` (P10 IoT Monitoring) is three days with more of each.

Lessons that lean on it: L042 flattening event payloads, L053 mapInPandas, L068 streaming sources and sinks,
L070 watermarks and late events, L087 stateful streaming. Project P10 joins the project edition to PS-D15's project
edition (same device ids, overlapping days); the contract is docs/pyspark/dataset-contracts.md §3.
"""

from __future__ import annotations

import math
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D09"
VERSION = "1.0.0"
SEED = 2009

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "devices": "device_id STRING, device_type STRING, model STRING, installed_date DATE, active BOOLEAN",
    "device_locations": (
        "device_id STRING, site STRING, building STRING, floor INT, latitude DOUBLE, longitude DOUBLE, "
        "valid_from DATE, valid_to DATE"
    ),
    "sensor_readings": (
        "reading_id STRING, device_id STRING, event_time TIMESTAMP, arrival_time TIMESTAMP, batch INT, "
        "payload STRUCT<temperature_c: DOUBLE, humidity_pct: DOUBLE, battery_v: DOUBLE, status: STRING, tags: ARRAY<STRING>>, "
        "firmware STRUCT<version: STRING, build: INT>"
    ),
    "alerts": (
        "alert_id STRING, device_id STRING, reading_id STRING, rule_id STRING, metric STRING, operator STRING, "
        "threshold DOUBLE, observed_value DOUBLE, severity STRING, triggered_at TIMESTAMP, acknowledged BOOLEAN"
    ),
    "maintenance_events": (
        "maintenance_id STRING, device_id STRING, kind STRING, started_at TIMESTAMP, ended_at TIMESTAMP, "
        "performed_by STRING, firmware_after STRING"
    ),
}
FORMATS = {"sensor_readings": "jsonl"}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "devices": "One row per sensor: what it measures, its model, when it was installed and whether it is still in service.",
    "device_locations": "One row per place a sensor has been mounted, with the dates it was there (valid_to is empty for where it is now).",
    "sensor_readings": "One row per reading a sensor delivered: when it was measured, when it arrived, which micro-batch it arrived in, and its nested payload.",
    "alerts": "One row per alert the monitoring rules raised: which reading broke which threshold, and whether someone acknowledged it.",
    "maintenance_events": "One row per maintenance visit to a sensor: battery swap, recalibration or firmware update, with start and end times.",
}
KEYS = {
    "primary": {
        "devices": ["device_id"],
        "device_locations": ["device_id", "valid_from"],
        "sensor_readings": ["reading_id"],
        "alerts": ["alert_id"],
        "maintenance_events": ["maintenance_id"],
    },
    "foreign": {
        "device_locations.device_id": "devices.device_id",
        "sensor_readings.device_id": "devices.device_id",
        "alerts.device_id": "devices.device_id",
        "alerts.reading_id": "sensor_readings.reading_id",
        "maintenance_events.device_id": "devices.device_id",
    },
}
RULES = [
    "Each sensor measures every 15 minutes; event_time is when it measured, arrival_time when the platform received it. Normally a reading arrives within two minutes.",
    "sensor_readings is written in arrival order, as a stream delivers it. batch is the micro-batch it arrived in: whole 15-minute periods (lesson) or whole hours (practice, project) since the first reading, counted from 0.",
    "device_type climate measures temperature and humidity; device_type temp has no humidity sensor, so payload.humidity_pct is always null for it (that null is expected, not a fault).",
    "payload.status is ok, low_battery (battery_v below 3.4) or degraded. payload.tags lists the sensor's placement tags, plus low_battery while the battery is low.",
    "firmware is the version the sensor ran when it measured; it changes only after a firmware_update maintenance event (firmware_after).",
    "Sensors send nothing while a maintenance visit is in progress (between started_at and ended_at); a battery_swap brings battery_v back to about 4.15.",
    "Alert rules: TEMP_HIGH temperature_c > 30 (warning), TEMP_CRIT temperature_c > 40 (critical), HUM_HIGH humidity_pct > 80 (warning), BATT_LOW battery_v < 3.3 (warning). A rule alerts on the first breaching reading of an episode and stays quiet for that sensor and rule until an hour passes without a breach. triggered_at is the reading's arrival_time.",
    "device_locations has one current row per sensor (valid_to empty); a sensor that was moved also has an earlier row whose valid_to is the day before the current valid_from.",
    "Lesson edition: two deliberate cases. Reading R0006 (event_time 09:15) arrives late, at 09:52, in batch 3 instead of batch 1; reading R0011 is delivered twice (same reading_id, the copy arrives six minutes later). Otherwise clean.",
    "Practice edition: about 2% of readings arrive late (20 minutes to 6 hours after event_time); about 1% are delivered twice with the same reading_id; about 1% miss a payload field (battery_v, status or humidity_pct null) or the whole firmware struct; three readings are sensor glitches with temperature_c = 999.0, and the TEMP_CRIT alert they raised is a false alarm.",
    "Project edition (P10): about 6% of readings arrive late (up to 12 hours), about 4% are delivered twice (some three times), about 4% miss payload fields or firmware, about 0.5% are glitches (temperature_c = 999.0 or humidity_pct = 255.0, both out of range), and most glitches raised false TEMP_CRIT / HUM_HIGH alerts (a glitch inside an episode that was already alerting stays quiet, per the hour rule).",
]
SITES = {
    # site: (building, floor, lat, lon, device_type, temperature profile, humidity profile, tags)
    "cold_store": ("B1", 0, 52.3801, 4.9012, "temp", (3.5, 1.2, 0.0), None, ["indoor", "cold_chain"]),
    "office_north": ("B2", 3, 52.3815, 4.9040, "climate", (21.5, 1.5, 0.8), (42.0, 5.0), ["indoor", "hvac"]),
    "greenhouse": ("G1", 0, 52.3792, 4.8987, "climate", (24.0, 5.5, 0.6), (70.0, 9.0), ["outdoor", "greenhouse"]),
    "server_room": ("B2", -1, 52.3814, 4.9043, "climate", (25.0, 1.5, 0.7), (38.0, 4.0), ["indoor", "critical"]),
}
SITE_ORDER = ["cold_store", "office_north", "greenhouse", "server_room"]
MODELS = {"temp": "T-100", "climate": "TH-210"}
TEAMS = ["facilities-a", "facilities-b", "iot-ops"]
RULE_DEFS = [
    ("TEMP_HIGH", "temperature_c", ">", 30.0, "warning"),
    ("TEMP_CRIT", "temperature_c", ">", 40.0, "critical"),
    ("HUM_HIGH", "humidity_pct", ">", 80.0, "warning"),
    ("BATT_LOW", "battery_v", "<", 3.3, "warning"),
]
FW_OLD, FW_NEW = ("2.3.1", 231), ("2.4.0", 240)


def climate(rng: random.Random, site: str, t: datetime, heat: float) -> tuple[float, float | None]:
    """Temperature and humidity for a site at a time: a daily cycle plus noise, plus any heat episode in progress."""
    profile, hum = SITES[site][5], SITES[site][6]
    base, swing, noise = profile
    hour = t.hour + t.minute / 60
    temp = base + swing * math.sin((hour - 9) / 24 * 2 * math.pi) + rng.gauss(0, noise) + heat
    humidity = None
    if hum is not None:
        humidity = min(99.0, max(5.0, hum[0] - 0.6 * (temp - base) + rng.gauss(0, hum[1] / 3) + (12 if site == "greenhouse" and 5 <= hour < 9 else 0)))
    return round(temp, 1), None if humidity is None else round(humidity, 1)


def build(rng: random.Random, start: datetime, hours: int, devices: int, batch_minutes: int, late_share: float,
          max_late_hours: int, dup_share: float, missing_share: float, glitches: int, triple_dups: bool):
    end = start + timedelta(hours=hours)
    devs, locs, plans = [], [], []
    for i in range(1, devices + 1):
        site = SITE_ORDER[(i - 1) % len(SITE_ORDER)]
        building, floor, lat, lon, dtype, *_ = SITES[site]
        installed = date(2025, 2, 3) + timedelta(days=rng.randint(0, 330))
        did = f"DEV-{i:03d}"
        devs.append({"device_id": did, "device_type": dtype, "model": MODELS[dtype], "installed_date": installed, "active": True})
        moved = rng.random() < 0.25
        here = {"device_id": did, "site": site, "building": building, "floor": floor,
                "latitude": round(lat + rng.uniform(-0.0004, 0.0004), 5), "longitude": round(lon + rng.uniform(-0.0004, 0.0004), 5)}
        if moved:
            moved_on = installed + timedelta(days=rng.randint(30, 90))
            locs.append(dict(here, floor=floor + 1, latitude=round(here["latitude"] + 0.0002, 5), valid_from=installed, valid_to=moved_on - timedelta(days=1)))
            locs.append(dict(here, valid_from=moved_on, valid_to=None))
        else:
            locs.append(dict(here, valid_from=installed, valid_to=None))
        fw_at = start + timedelta(minutes=15 * rng.randint(8, hours * 4 - 8)) if rng.random() < 0.3 else None
        cal_at = start + timedelta(minutes=15 * rng.randint(8, hours * 4 - 8)) if rng.random() < 0.2 else None
        plans.append((did, site, dtype, fw_at, cal_at))

    readings, maint = [], []
    n = 0
    for did, site, dtype, fw_at, cal_at in plans:
        battery = round(rng.uniform(3.38, 4.1), 3)
        drain = rng.uniform(0.0004, 0.0016)
        fw = FW_OLD
        visits = []
        if fw_at:
            visits.append(["firmware_update", fw_at, fw_at + timedelta(minutes=rng.choice([20, 30, 40]))])
        if cal_at:
            visits.append(["recalibration", cal_at, cal_at + timedelta(minutes=rng.choice([45, 60, 90]))])
        swap_planned = False
        heat, heat_left = 0.0, 0
        t = start + timedelta(minutes=rng.choice([0, 1, 2]))
        while t < end:
            active_visit = next((v for v in visits if v[1] <= t < v[2]), None)
            for v in visits:
                if v[2] <= t and len(v) == 3:
                    v.append("done")
                    if v[0] == "firmware_update":
                        fw = FW_NEW
                    if v[0] == "battery_swap":
                        battery = round(rng.uniform(4.12, 4.18), 3)
            if active_visit:
                t += timedelta(minutes=15)
                continue
            if heat_left == 0 and site in ("greenhouse", "server_room") and rng.random() < 0.012:
                heat_left, heat = rng.randint(2, 6), (rng.uniform(6, 10) if site == "greenhouse" else rng.uniform(12, 17))
            temp, hum = climate(rng, site, t, heat if heat_left else 0.0)
            heat_left = max(0, heat_left - 1)
            battery = round(battery - drain, 3)
            low = battery < 3.4
            status = "low_battery" if low else ("degraded" if rng.random() < 0.004 else "ok")
            tags = list(SITES[site][7]) + (["low_battery"] if low else [])
            if battery < 3.3 and not swap_planned:
                swap_planned = True
                s_at = t + timedelta(minutes=15 * rng.randint(12, 32))
                visits.append(["battery_swap", s_at, s_at + timedelta(minutes=rng.choice([15, 30]))])
            n += 1
            arrival = t + timedelta(seconds=rng.randint(2, 110))
            readings.append({
                "reading_id": f"R{n:06d}" if devices > 4 else f"R{n:04d}", "device_id": did, "event_time": t, "arrival_time": arrival,
                "payload": {"temperature_c": temp, "humidity_pct": hum, "battery_v": round(battery, 2), "status": status, "tags": tags},
                "firmware": {"version": fw[0], "build": fw[1]},
            })
            t += timedelta(minutes=15)
        for kind, s_at, e_at, *_ in sorted(visits, key=lambda v: v[1]):
            if s_at < end:
                maint.append({"device_id": did, "kind": kind, "started_at": s_at, "ended_at": e_at, "performed_by": rng.choice(TEAMS),
                              "firmware_after": FW_NEW[0] if kind == "firmware_update" else None})
    maint.sort(key=lambda m: (m["started_at"], m["device_id"]))
    for i, m in enumerate(maint, 1):
        m["maintenance_id"] = f"MT{i:04d}"

    # Delivery problems: late arrivals, missing fields, glitches, re-deliveries.
    for r in readings:
        if rng.random() < late_share:
            r["arrival_time"] = r["event_time"] + timedelta(minutes=rng.randint(20, max_late_hours * 60))
        if rng.random() < missing_share:
            field = rng.choice(["battery_v", "status", "humidity_pct", "firmware"])
            if field == "firmware":
                r["firmware"] = None
            else:
                r["payload"][field] = None
    for k, r in enumerate(rng.sample(readings, glitches)):
        if triple_dups and k % 3 == 2 and r["payload"]["humidity_pct"] is not None:
            r["payload"]["humidity_pct"] = 255.0
        else:
            r["payload"]["temperature_c"] = 999.0
    copies = []
    for r in readings:
        if rng.random() < dup_share:
            times = 2 if triple_dups and rng.random() < 0.15 else 1
            for _ in range(times):
                copies.append(dict(r, arrival_time=r["arrival_time"] + timedelta(minutes=rng.randint(1, 30))))
    alerts = make_alerts(rng, readings)
    readings.extend(copies)
    finish(readings, start, batch_minutes)
    return {"devices": devs, "device_locations": locs, "sensor_readings": readings, "alerts": alerts, "maintenance_events": maint}


def make_alerts(rng: random.Random, readings: list[dict]) -> list[dict]:
    """What the monitoring rules raised, from each distinct reading in event order (before re-deliveries)."""
    alerts, last_breach = [], {}
    for r in sorted(readings, key=lambda r: (r["event_time"], r["device_id"])):
        for rule_id, metric, op, threshold, severity in RULE_DEFS:
            v = r["payload"][metric]
            if v is None or not (v > threshold if op == ">" else v < threshold):
                continue
            key = (r["device_id"], rule_id)
            prev = last_breach.get(key)
            last_breach[key] = r["event_time"]
            if prev is not None and r["event_time"] - prev <= timedelta(hours=1):
                continue
            alerts.append({"device_id": r["device_id"], "reading_id": r["reading_id"], "rule_id": rule_id, "metric": metric, "operator": op,
                           "threshold": threshold, "observed_value": v, "severity": severity, "triggered_at": r["arrival_time"],
                           "acknowledged": rng.random() < 0.7})
    alerts.sort(key=lambda a: (a["triggered_at"], a["device_id"], a["rule_id"]))
    for i, a in enumerate(alerts, 1):
        a["alert_id"] = f"AL{i:04d}"
    return alerts


def finish(readings: list[dict], start: datetime, batch_minutes: int) -> None:
    """Arrival order, and the micro-batch each reading arrived in."""
    readings.sort(key=lambda r: (r["arrival_time"], r["reading_id"]))
    for r in readings:
        r["batch"] = int((r["arrival_time"] - start).total_seconds() // (batch_minutes * 60))


def lesson(rng: random.Random) -> dict:
    """Four sensors, one per site, measuring at 09:00, 09:15 and 09:30, with the two cases the rules name."""
    start = datetime(2026, 4, 14, 9, 0)
    devs = [
        {"device_id": "DEV-001", "device_type": "temp", "model": "T-100", "installed_date": date(2025, 6, 2), "active": True},
        {"device_id": "DEV-002", "device_type": "climate", "model": "TH-210", "installed_date": date(2025, 6, 2), "active": True},
        {"device_id": "DEV-003", "device_type": "climate", "model": "TH-210", "installed_date": date(2025, 9, 15), "active": True},
        {"device_id": "DEV-004", "device_type": "climate", "model": "TH-210", "installed_date": date(2025, 11, 3), "active": True},
    ]
    locs = []
    for d, site in zip(devs, SITE_ORDER):
        building, floor, lat, lon, *_ = SITES[site]
        locs.append({"device_id": d["device_id"], "site": site, "building": building, "floor": floor, "latitude": lat, "longitude": lon,
                     "valid_from": d["installed_date"], "valid_to": None})
    # DEV-003 started in the office and moved to the greenhouse.
    locs.insert(2, {"device_id": "DEV-003", "site": "office_north", "building": "B2", "floor": 3, "latitude": 52.3815, "longitude": 4.9040,
                    "valid_from": date(2025, 9, 15), "valid_to": date(2026, 1, 11)})
    locs[3]["valid_from"] = date(2026, 1, 12)
    # (temperature, humidity, battery) per device per slot. DEV-003 heats up; DEV-004 spikes once; DEV-001's battery is low.
    values = {
        "DEV-001": [(3.2, None, 3.31), (3.4, None, 3.30), (3.3, None, 3.29)],
        "DEV-002": [(21.4, 41.5, 3.92), (21.6, 41.2, 3.92), (21.9, 40.8, 3.91)],
        "DEV-003": [(28.7, 79.0, 3.75), (29.6, 82.4, 3.75), (31.4, 80.6, 3.74)],
        "DEV-004": [(25.1, 37.9, 3.88), (41.2, 33.0, 3.88), (26.0, 37.5, 3.87)],
    }
    firmware = {"DEV-001": FW_OLD, "DEV-002": FW_NEW, "DEV-003": FW_OLD, "DEV-004": FW_NEW}
    readings, n = [], 0
    for slot in range(3):
        for d in devs:
            did = d["device_id"]
            n += 1
            t = start + timedelta(minutes=15 * slot)
            temp, hum, batt = values[did][slot]
            low = batt < 3.4
            tags = list(SITES[SITE_ORDER[int(did[-1]) - 1]][7]) + (["low_battery"] if low else [])
            readings.append({
                "reading_id": f"R{n:04d}", "device_id": did, "event_time": t, "arrival_time": t + timedelta(seconds=rng.randint(4, 50)),
                "payload": {"temperature_c": temp, "humidity_pct": hum, "battery_v": batt, "status": "low_battery" if low else "ok", "tags": tags},
                "firmware": {"version": firmware[did][0], "build": firmware[did][1]},
            })
    late = next(r for r in readings if r["reading_id"] == "R0006")
    late["arrival_time"] = datetime(2026, 4, 14, 9, 52, 7)
    alerts = make_alerts(rng, readings)
    dup = next(r for r in readings if r["reading_id"] == "R0011")
    readings.append(dict(dup, arrival_time=dup["arrival_time"] + timedelta(minutes=6)))
    finish(readings, start, 15)
    maint = [
        {"maintenance_id": "MT0001", "device_id": "DEV-002", "kind": "firmware_update", "started_at": datetime(2026, 3, 30, 10, 0),
         "ended_at": datetime(2026, 3, 30, 10, 30), "performed_by": "iot-ops", "firmware_after": FW_NEW[0]},
        {"maintenance_id": "MT0002", "device_id": "DEV-003", "kind": "recalibration", "started_at": datetime(2026, 4, 2, 14, 0),
         "ended_at": datetime(2026, 4, 2, 15, 0), "performed_by": "facilities-a", "firmware_after": None},
        {"maintenance_id": "MT0003", "device_id": "DEV-004", "kind": "firmware_update", "started_at": datetime(2026, 4, 8, 11, 0),
         "ended_at": datetime(2026, 4, 8, 11, 20), "performed_by": "iot-ops", "firmware_after": FW_NEW[0]},
        {"maintenance_id": "MT0004", "device_id": "DEV-001", "kind": "battery_swap", "started_at": datetime(2026, 4, 14, 13, 0),
         "ended_at": datetime(2026, 4, 14, 13, 15), "performed_by": "facilities-b", "firmware_after": None},
    ]
    return {"devices": devs, "device_locations": locs, "sensor_readings": readings, "alerts": alerts, "maintenance_events": maint}


def project() -> dict:
    """The P10 edition. PS-D15's project edition (d15_logs.py) reads its devices, maintenance and glitches from here."""
    return build(random.Random(SEED + 2), start=datetime(2026, 5, 11), hours=72, devices=18, batch_minutes=60,
                 late_share=0.06, max_late_hours=12, dup_share=0.04, missing_share=0.04, glitches=26, triple_dups=True)


def main() -> dict:
    editions = {
        "lesson": lesson(random.Random(SEED)),
        "practice": build(random.Random(SEED + 1), start=datetime(2026, 4, 20), hours=48, devices=12, batch_minutes=60,
                          late_share=0.02, max_late_hours=6, dup_share=0.01, missing_share=0.01, glitches=3, triple_dups=False),
        "project": project(),
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="IoT & Sensors",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d09_iot.py",
        formats=FORMATS,
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
