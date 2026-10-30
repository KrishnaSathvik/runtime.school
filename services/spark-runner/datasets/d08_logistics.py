"""PS-D08 Logistics & Supply Chain: Runtime's own deterministic synthetic warehouse, shipment and supplier data.

    python3 services/spark-runner/datasets/d08_logistics.py

Writes fixtures/PS-D08/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

Editions: `lesson` is small enough to read whole on screen; `practice` is a realistic month of tracking events for
Playground and tests; `project` is the raw change feed P08 (Logistics CDC) cleans: events out of order, delivered twice,
corrected late, and some for shipments the shipments table has never heard of.

Lessons that lean on it: L024 quarantine and reconciliation, L028 composite and conditional joins (inventory on
warehouse_id + sku; delivered events whose event_time falls inside a delivery window), L058 broadcast joins (small
warehouses and suppliers against a big event feed), L063 MERGE (purchase_orders versions), L074 incremental batches
(load_date + sequence), L077 orchestration and L082 failure handling.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D08"
VERSION = "1.0.0"
SEED = 2008

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "warehouses": "warehouse_id STRING, name STRING, city STRING, region STRING, capacity_pallets INT, opened_date DATE",
    "suppliers": "supplier_id STRING, name STRING, country STRING, lead_time_days INT, on_time_rate DOUBLE",
    "inventory": "warehouse_id STRING, sku STRING, sku_name STRING, on_hand INT, reserved INT, reorder_point INT, as_of_date DATE",
    "purchase_orders": (
        "po_id STRING, version INT, supplier_id STRING, warehouse_id STRING, sku STRING, quantity INT, "
        "unit_cost DECIMAL(10,2), status STRING, expected_date DATE, updated_at TIMESTAMP"
    ),
    "shipments": (
        "shipment_id STRING, warehouse_id STRING, sku STRING, quantity INT, carrier STRING, service_level STRING, "
        "destination_city STRING, created_at TIMESTAMP, promised_date DATE"
    ),
    "shipment_events": (
        "event_id STRING, shipment_id STRING, warehouse_id STRING, event_type STRING, event_time TIMESTAMP, "
        "location STRING, sequence BIGINT, load_date DATE, is_correction BOOLEAN"
    ),
    "deliveries": (
        "delivery_id STRING, shipment_id STRING, window_start TIMESTAMP, window_end TIMESTAMP, "
        "delivered_at TIMESTAMP, status STRING"
    ),
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "warehouses": "One row per warehouse: where it is, its region and how many pallets it holds.",
    "suppliers": "One row per supplier: country, usual lead time and share of past orders that arrived on time.",
    "inventory": "One row per SKU stocked in a warehouse (warehouse_id + sku), with stock on hand at the as-of date.",
    "purchase_orders": "One row per version of a purchase order: the first version is the order, later versions are its updates.",
    "shipments": "One row per outbound shipment: which warehouse sends which SKU, by which carrier, promised for which day.",
    "shipment_events": "One row per tracking event a carrier or warehouse reported, with the day it was loaded and its source sequence number.",
    "deliveries": "One row per delivery attempt booked for a shipment: the promised time window and when it was actually delivered.",
}
KEYS = {
    "primary": {
        "warehouses": ["warehouse_id"],
        "suppliers": ["supplier_id"],
        "inventory": ["warehouse_id", "sku"],
        "purchase_orders": ["po_id", "version"],
        "shipments": ["shipment_id"],
        "shipment_events": ["event_id"],
        "deliveries": ["delivery_id"],
    },
    "foreign": {
        "inventory.warehouse_id": "warehouses.warehouse_id",
        "purchase_orders.supplier_id": "suppliers.supplier_id",
        "purchase_orders.warehouse_id": "warehouses.warehouse_id",
        "shipments.warehouse_id": "warehouses.warehouse_id",
        "shipments.warehouse_id+sku": "inventory.warehouse_id+sku",
        "shipment_events.shipment_id": "shipments.shipment_id",
        "shipment_events.warehouse_id": "warehouses.warehouse_id",
        "deliveries.shipment_id": "shipments.shipment_id",
    },
}
RULES = [
    "inventory is keyed by warehouse_id + sku together: the same SKU is stocked in several warehouses, so joining shipments to inventory on sku alone multiplies rows.",
    "event_type is one of created, picked, departed, in_transit, out_for_delivery, delivered, exception, always lowercase; a shipment's events follow that order in event_time.",
    "sequence is the source system's log number: it increases with event_time across all events, so within a shipment a higher sequence is a later step.",
    "load_date is the day the event reached the platform. Most events load the day they happen; some load one to four days late, so process loads by load_date, not by event_time.",
    "location is the warehouse_id for created, picked and departed, a hub code (HUB-…) for in_transit, and the destination city after that. warehouse_id on an event is the shipment's sending warehouse.",
    "A delivery is on_time when delivered_at falls between window_start and window_end (inclusive), late when it is after window_end, and failed when the carrier gave up after an exception event (no delivered_at).",
    "Shipments created near the end of the data are still in flight: they have no delivered event and no delivery row until they go out for delivery.",
    "purchase_orders keeps every version of an order: version 1 is the original, higher versions change quantity, status or expected_date, and updated_at orders them. The current state of an order is its highest version; to rehearse MERGE, load version 1 as the target and apply later versions as updates.",
    "purchase_orders status is one of open, confirmed, shipped, received, cancelled.",
    "unit_cost is in exact decimals (DECIMAL(10,2)); on_time_rate is a share between 0 and 1.",
    "Lesson edition: two deliberate cases for quarantine and reconciliation: event {dup} is delivered twice (the same event_id on two rows, the copy loaded a day later), and event {stray} is for shipment SH9999, which is not in shipments.",
    "Practice edition: a few events are delivered twice with the same event_id (an exact copy loaded on the same or the next day), and some events load late; every event's shipment exists.",
    "Project edition (the P08 CDC feed): the file is not in event order; about 3% of events are duplicated with the same event_id (sometimes on a later load_date); about 2% of events have a late correction: a second row with a new event_id, the same shipment_id, event_type and sequence, a corrected event_time or location, is_correction = true and a later load_date, so it arrives after events with higher sequences (the correction wins); about 1% of events are for shipment_ids not in shipments (quarantine them).",
    "is_correction is false on every row except the project edition's late corrections.",
]
LESSON_CASES: dict[str, str] = {}
WAREHOUSES = [
    ("Harbor Point DC", "Rotterdam", "north"),
    ("Ridgeway Fulfilment", "Leeds", "north"),
    ("Sunbelt Cross-Dock", "Valencia", "south"),
    ("Lakeside Depot", "Lyon", "central"),
    ("Granite Hub", "Kraków", "east"),
    ("Riverbend DC", "Porto", "south"),
    ("Pinecrest Store", "Gothenburg", "north"),
    ("Meadowgate Depot", "Munich", "central"),
]
SUPPLIERS = [
    ("Kestrel Packaging Co", "PL"), ("Bluefin Components", "PT"), ("Amberline Textiles", "TR"), ("Copperleaf Tools", "DE"),
    ("Tidewater Plastics", "NL"), ("Saltmarsh Paper", "SE"), ("Ironbark Fixings", "CZ"), ("Larkspur Ceramics", "ES"),
    ("Brightwell Electrics", "IT"), ("Foxglove Home", "FR"), ("Quarry Lane Metals", "SK"), ("Oakhollow Goods", "BE"),
]
SKUS = [
    ("SKU-1001", "Corrugated box M"), ("SKU-1002", "Corrugated box L"), ("SKU-1003", "Packing tape 48mm"), ("SKU-1004", "Bubble wrap roll"),
    ("SKU-1005", "Pallet wrap film"), ("SKU-1006", "Desk lamp"), ("SKU-1007", "Cordless drill"), ("SKU-1008", "Drill bit set"),
    ("SKU-1009", "Ceramic mug"), ("SKU-1010", "Dinner plate set"), ("SKU-1011", "Cotton towel"), ("SKU-1012", "Bath mat"),
    ("SKU-1013", "LED bulb 4-pack"), ("SKU-1014", "Extension lead"), ("SKU-1015", "Storage crate"), ("SKU-1016", "Wall shelf"),
    ("SKU-1017", "Wood screws 200"), ("SKU-1018", "Wall plugs 100"), ("SKU-1019", "Notebook A5"), ("SKU-1020", "Printer paper"),
    ("SKU-1021", "Water bottle"), ("SKU-1022", "Lunch box"), ("SKU-1023", "Doormat"), ("SKU-1024", "Cushion cover"),
    ("SKU-1025", "Picture frame"), ("SKU-1026", "Plant pot"), ("SKU-1027", "Garden hose"), ("SKU-1028", "Work gloves"),
    ("SKU-1029", "Step stool"), ("SKU-1030", "Tool box"),
]
CITIES = ["Antwerp", "Bordeaux", "Bremen", "Brno", "Cork", "Graz", "Malmö", "Nantes", "Seville", "Turin", "Utrecht", "Wrocław"]
HUBS = ["HUB-NORTH", "HUB-CENTRAL", "HUB-SOUTH", "HUB-EAST"]
CARRIERS = ["Parcelway", "SwiftFreight", "Northline Express"]
CENT = Decimal("0.01")


def money(x: float) -> Decimal:
    return Decimal(str(x)).quantize(CENT, rounding=ROUND_HALF_UP)


def at(day: date, minutes: int) -> datetime:
    """A naive UTC timestamp `minutes` after midnight of `day`."""
    return datetime(day.year, day.month, day.day) + timedelta(minutes=minutes)


def lifecycle(rng: random.Random, created: datetime, promised: date, compact: bool):
    """(event_type, event_time, location_kind) steps for one shipment, and its delivery window/outcome."""
    steps = [("created", created)]
    t = created
    if not compact:
        t += timedelta(minutes=rng.randint(30, 360))
        steps.append(("picked", t))
    t += timedelta(minutes=rng.randint(60, 480))
    steps.append(("departed", t))
    if not compact:
        for _ in range(rng.randint(1, 2)):
            t += timedelta(minutes=rng.randint(360, 1200))
            steps.append(("in_transit", t))
    # The delivery day: the promised day mostly, sometimes a day or two later; never before the truck reaches the area.
    day = max(promised, (t + timedelta(hours=10)).date()) + timedelta(days=rng.choices([0, 1, 2], [80, 15, 5])[0])
    slot = rng.choice([8, 12, 16])
    window_start = at(day, slot * 60)
    window_end = window_start + timedelta(hours=4)
    ofd = window_start - timedelta(minutes=rng.randint(45, 180))
    if not compact:
        steps.append(("out_for_delivery", ofd))
    outcome = rng.choices(["on_time", "late", "failed"], [82, 14, 4])[0]
    if outcome == "on_time":
        steps.append(("delivered", window_start + timedelta(minutes=rng.randint(5, 235))))
    elif outcome == "late":
        steps.append(("delivered", window_end + timedelta(minutes=rng.randint(15, 300))))
    else:
        steps.append(("exception", window_start + timedelta(minutes=rng.randint(30, 200))))
    return steps, window_start, window_end, ofd


def build(rng: random.Random, start: date, days: int, warehouses: int, suppliers: int, skus_per_wh: int, shipments: int,
          pos: int, late_share: float, dup_share: float, compact: bool, shared_sku: int | None = None,
          create_within: int | None = None):
    end = at(start, days * 24 * 60)
    whs = []
    for i, (name, city, region) in enumerate(WAREHOUSES[:warehouses], 1):
        whs.append({
            "warehouse_id": f"WH{i:02d}", "name": name, "city": city, "region": region,
            "capacity_pallets": rng.choice([4000, 6500, 8000, 12000, 15000]),
            "opened_date": date(2025, 1, 6) + timedelta(days=rng.randint(0, 300)),
        })
    sups = []
    for i, (name, country) in enumerate(SUPPLIERS[:suppliers], 1):
        sups.append({
            "supplier_id": f"SUP{i:02d}", "name": name, "country": country,
            "lead_time_days": rng.choice([3, 5, 7, 7, 10, 14]),
            "on_time_rate": round(rng.uniform(0.78, 0.99), 2),
        })
    inv, stocked = [], {}
    for w in whs:
        picked = rng.sample(range(len(SKUS)), skus_per_wh)
        if shared_sku is not None and shared_sku not in picked:
            picked[0] = shared_sku
        picked.sort()
        stocked[w["warehouse_id"]] = [SKUS[k][0] for k in picked]
        for k in picked:
            sku, name = SKUS[k]
            on_hand = rng.randint(0, 900)
            inv.append({
                "warehouse_id": w["warehouse_id"], "sku": sku, "sku_name": name, "on_hand": on_hand,
                "reserved": min(on_hand, rng.randint(0, 120)), "reorder_point": rng.choice([50, 100, 150, 200]),
                "as_of_date": start + timedelta(days=days - 1),
            })
    # Purchase orders and their later versions.
    po_rows = []
    for i in range(1, pos + 1):
        w = rng.choice(whs)
        sup = rng.choice(sups)
        created = at(start + timedelta(days=rng.randint(0, max(0, days - 8))), rng.randint(7 * 60, 18 * 60))
        row = {
            "po_id": f"PO{i:05d}", "version": 1, "supplier_id": sup["supplier_id"], "warehouse_id": w["warehouse_id"],
            "sku": rng.choice(stocked[w["warehouse_id"]]), "quantity": rng.choice([100, 200, 250, 500, 1000]),
            "unit_cost": money(rng.choice([0.85, 1.2, 2.5, 3.75, 6.4, 9.9, 14.5, 22.0])), "status": "open",
            "expected_date": created.date() + timedelta(days=sup["lead_time_days"]), "updated_at": created,
        }
        po_rows.append(row)
        prev = row
        for v in range(2, rng.choices([1, 2, 3, 4], [45, 30, 18, 7])[0] + 1):
            nxt = dict(prev, version=v, updated_at=prev["updated_at"] + timedelta(hours=rng.randint(6, 96)))
            change = rng.choice(["status", "status", "quantity", "expected_date"])
            if change == "status" or prev["status"] in ("open",):
                nxt["status"] = {"open": rng.choices(["confirmed", "cancelled"], [9, 1])[0], "confirmed": "shipped",
                                 "shipped": "received", "received": "received", "cancelled": "cancelled"}[prev["status"]]
            if change == "quantity":
                nxt["quantity"] = prev["quantity"] + rng.choice([-50, 50, 100])
            if change == "expected_date":
                nxt["expected_date"] = prev["expected_date"] + timedelta(days=rng.randint(1, 4))
            if nxt["updated_at"] >= end:
                break
            po_rows.append(nxt)
            prev = nxt
            if nxt["status"] in ("received", "cancelled"):
                break
    # Shipments, their tracking events and delivery windows.
    ships, raw_events, dels = [], [], []
    for i in range(1, shipments + 1):
        w = rng.choice(whs)
        service = rng.choices(["standard", "express"], [3, 1])[0]
        created = at(start + timedelta(days=rng.randint(0, create_within or days - 2)), rng.randint(6 * 60, 20 * 60))
        promised = created.date() + timedelta(days=rng.randint(1, 2) if service == "express" else rng.randint(2, 5))
        sid = f"SH{i:04d}" if shipments < 10000 else f"SH{i:05d}"
        dest = rng.choice(CITIES)
        ships.append({
            "shipment_id": sid, "warehouse_id": w["warehouse_id"], "sku": rng.choice(stocked[w["warehouse_id"]]),
            "quantity": rng.choice([1, 1, 2, 4, 6, 10, 24]), "carrier": rng.choice(CARRIERS), "service_level": service,
            "destination_city": dest, "created_at": created, "promised_date": promised,
        })
        steps, ws, we, ofd = lifecycle(rng, created, promised, compact)
        hubs = rng.sample(HUBS, 2)
        hop = 0
        for etype, t in steps:
            if t >= end:
                break
            if etype in ("created", "picked", "departed"):
                loc = w["warehouse_id"]
            elif etype == "in_transit":
                loc, hop = hubs[hop], hop + 1
            else:
                loc = dest
            raw_events.append({"shipment_id": sid, "warehouse_id": w["warehouse_id"], "event_type": etype, "event_time": t, "location": loc})
        last = [e for e in raw_events if e["shipment_id"] == sid][-1]
        if ofd < end:
            delivered = last["event_time"] if last["event_type"] == "delivered" else None
            if last["event_type"] not in ("delivered", "exception"):
                continue  # out for delivery when the data ends: no outcome yet, so no row
            status = "failed" if delivered is None else "on_time" if delivered <= we else "late"
            dels.append({"delivery_id": f"DL{len(dels) + 1:05d}", "shipment_id": sid, "window_start": ws, "window_end": we,
                         "delivered_at": delivered, "status": status})
    # The source log numbers events in event-time order; event ids follow the same order.
    raw_events.sort(key=lambda e: (e["event_time"], e["shipment_id"]))
    events = []
    for n, e in enumerate(raw_events, 1):
        lag = 0
        if rng.random() < late_share:
            lag = rng.choices([1, 2, 3, 4], [60, 25, 10, 5])[0]
        elif e["event_time"].hour >= 22:
            lag = 1  # late-evening scans land in the next morning's load
        events.append(dict(event_id=f"E{n:07d}", **e, sequence=100000 + n, load_date=e["event_time"].date() + timedelta(days=lag), is_correction=False))
    # Occasional exact re-deliveries of the same event.
    for e in list(events):
        if rng.random() < dup_share:
            events.append(dict(e, load_date=e["load_date"] + timedelta(days=rng.choice([0, 0, 1]))))
    events.sort(key=lambda e: (e["load_date"], e["sequence"], e["event_id"]))
    return {"warehouses": whs, "suppliers": sups, "inventory": inv, "purchase_orders": po_rows, "shipments": ships,
            "shipment_events": events, "deliveries": dels}


def lesson(rng: random.Random) -> dict:
    """Four shipments from three warehouses, with the two quarantine cases the rules name."""
    ed = build(rng, start=date(2026, 3, 2), days=9, warehouses=3, suppliers=4, skus_per_wh=3, shipments=4, pos=5,
               late_share=0.0, dup_share=0.0, compact=True, shared_sku=2, create_within=1)
    # One late delivery, so the window range join has a delivered event that falls outside its window.
    dels = ed["deliveries"]
    if not any(d["status"] == "late" for d in dels):
        d = next(d for d in reversed(dels) if d["status"] == "on_time")
        e = next(e for e in ed["shipment_events"] if e["shipment_id"] == d["shipment_id"] and e["event_type"] == "delivered")
        e["event_time"] = d["delivered_at"] = d["window_end"] + timedelta(minutes=50)
        e["load_date"] = e["event_time"].date()
        d["status"] = "late"
    # SKU-1003 is stocked in every warehouse, so a join on sku alone fans out (the composite-join lesson's point).
    ed["shipments"][0]["sku"] = "SKU-1003"
    ev = sorted(ed["shipment_events"], key=lambda e: e["sequence"])
    for n, e in enumerate(ev, 1):
        e["event_id"] = f"E{n:07d}"
    dup = dict(ev[6], load_date=ev[6]["load_date"] + timedelta(days=1))
    ev.insert(7, dup)
    stray_id = f"E{len(ev):07d}"  # one past the last real event (the copy above reuses an id)
    stray_t = ev[-1]["event_time"] + timedelta(minutes=30)
    ev.append({"event_id": stray_id, "shipment_id": "SH9999", "warehouse_id": "WH02", "event_type": "departed",
               "event_time": stray_t, "location": "WH02", "sequence": ev[-1]["sequence"] + 1, "load_date": stray_t.date(), "is_correction": False})
    ed["shipment_events"] = ev
    LESSON_CASES.update(dup=dup["event_id"], stray=stray_id)
    return ed


def add_cdc_problems(rng: random.Random, ed: dict) -> None:
    """Turn the project feed into a raw CDC export: corrections, unknown shipments, shuffled file order."""
    events = ed["shipment_events"]
    by_id = {}
    for e in events:
        by_id.setdefault(e["event_id"], e)
    originals = [by_id[k] for k in sorted(by_id)]
    next_id = len(originals) + 1
    extra = []
    for e in originals:
        if rng.random() < 0.02:
            fix = dict(e, event_id=f"E{next_id:07d}", is_correction=True, load_date=e["load_date"] + timedelta(days=rng.randint(1, 3)))
            next_id += 1
            if rng.random() < 0.6:
                fix["event_time"] = e["event_time"] + timedelta(minutes=rng.choice([-90, -45, -20, 25, 60]))
            else:
                fix["location"] = rng.choice(HUBS) if e["event_type"] == "in_transit" else rng.choice(CITIES) if e["event_type"] in ("out_for_delivery", "delivered", "exception") else e["location"]
                fix["event_time"] = e["event_time"] + timedelta(minutes=rng.choice([-10, 10]))
            extra.append(fix)
    unknown_ids = [f"SH{9000 + k}" for k in range(1, 16)]
    for e in originals:
        if rng.random() < 0.01:
            extra.append(dict(e, event_id=f"E{next_id:07d}", shipment_id=rng.choice(unknown_ids)))
            next_id += 1
    events.extend(extra)
    # Out of order: within each load the rows arrive in no particular order.
    events.sort(key=lambda e: (e["load_date"], rng.random()))


def main() -> dict:
    project = build(random.Random(SEED + 2), start=date(2026, 5, 4), days=28, warehouses=8, suppliers=12, skus_per_wh=20,
                    shipments=760, pos=260, late_share=0.10, dup_share=0.03, compact=False)
    add_cdc_problems(random.Random(SEED + 3), project)
    editions = {
        "lesson": lesson(random.Random(SEED)),
        "practice": build(random.Random(SEED + 1), start=date(2026, 3, 2), days=28, warehouses=6, suppliers=10, skus_per_wh=18,
                          shipments=380, pos=150, late_share=0.05, dup_share=0.004, compact=False),
        "project": project,
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Logistics & Supply Chain",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=[r.format(**LESSON_CASES) if r.startswith("Lesson edition") else r for r in RULES],
        editions=editions,
        generated_by="services/spark-runner/datasets/d08_logistics.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
