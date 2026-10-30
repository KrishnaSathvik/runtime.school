"""PS-D01 Retail Commerce: Runtime's own deterministic synthetic retail data (no Olist, no third-party records).

    python3 services/spark-runner/datasets/d01_retail.py

Writes fixtures/PS-D01/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

Editions: `lesson` is small enough to read whole on screen; `practice` is a realistic table for Playground and tests;
`project` (added in 1.1.0) is what P01 cleans, with the quality problems a real export has. 1.1.0's lesson and practice
editions are byte-identical to 1.0.0's.
This first version builds four of the nine planned tables (customers, products, orders, order_items).
"""

from __future__ import annotations

import random
import sys
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D01"
VERSION = "1.1.0"
SEED = 20261023

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "customers": "customer_id STRING, name STRING, city STRING, segment STRING, signup_date DATE",
    "products": "product_id STRING, name STRING, category STRING, unit_price DECIMAL(10,2), active BOOLEAN",
    "orders": "order_id STRING, customer_id STRING, order_date DATE, status STRING, channel STRING, total DECIMAL(10,2)",
    "order_items": "order_id STRING, line_no INT, product_id STRING, quantity INT, unit_price DECIMAL(10,2)",
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "customers": "One row per customer: where they live, whether they buy for a business, when they signed up.",
    "products": "One row per product in the catalogue, with today's price.",
    "orders": "One row per order: who placed it, when, its status and its total.",
    "order_items": "One row per line of an order: which product, how many, and the price paid.",
}
KEYS = {
    "primary": {"customers": ["customer_id"], "products": ["product_id"], "orders": ["order_id"], "order_items": ["order_id", "line_no"]},
    "foreign": {"orders.customer_id": "customers.customer_id", "order_items.order_id": "orders.order_id", "order_items.product_id": "products.product_id"},
}
RULES = [
    "status is one of placed, paid, shipped, delivered, cancelled, refunded, always lowercase.",
    "total is the sum of quantity × unit_price over the order's lines, in exact decimals.",
    "total is missing (null) for some placed orders whose basket wasn't priced yet.",
    "unit_price on an order line is the price at the time of the order, which may differ from today's product price.",
    "The practice edition contains a few rows delivered twice by the ingestion job (exact duplicates); removing them is taught in the deduplication lesson.",
    "The project edition is a raw export with problems to clean: statuses outside the six (wrong case, unknown words, missing), negative or missing totals, missing order dates, and dates outside 2026.",
]
STATUSES = ["placed", "paid", "shipped", "delivered", "cancelled", "refunded"]
STATUS_WEIGHTS = [8, 22, 18, 40, 8, 4]
CHANNELS = ["web", "app", "store"]
CITIES = ["Lisbon", "Austin", "Pune", "Leeds", "Osaka", "Denver", "Lyon", "Perth"]
FIRST = ["Maya", "Leo", "Anika", "Tomas", "Ines", "Ravi", "Hana", "Omar", "Zoe", "Kofi", "Lena", "Arjun"]
LAST = ["Silva", "Grant", "Rao", "Novak", "Okafor", "Mori", "Weber", "Haddad", "Lind", "Costa"]
CATEGORIES = {
    "kitchen": ["Chef Knife", "Pour-Over Kettle", "Cast Iron Pan", "Spice Rack", "Bread Tin"],
    "outdoor": ["Trail Bottle", "Camp Lantern", "Dry Bag", "Folding Stool", "Rain Shell"],
    "office": ["Desk Lamp", "Notebook Set", "Monitor Stand", "Cable Tray", "Pen Case"],
    "home": ["Linen Throw", "Wall Clock", "Plant Pot", "Door Mat", "Candle Duo"],
}
START = date(2026, 1, 1)
CENT = Decimal("0.01")


def money(x: float) -> Decimal:
    return Decimal(str(x)).quantize(CENT, rounding=ROUND_HALF_UP)


def build(rng: random.Random, customers: int, products_per_category: int, orders: int, duplicates: int, null_totals: bool):
    cust = []
    for i in range(1, customers + 1):
        cust.append({
            "customer_id": f"C{i:04d}",
            "name": f"{rng.choice(FIRST)} {rng.choice(LAST)}",
            "city": rng.choice(CITIES),
            "segment": "business" if rng.random() < 0.2 else "consumer",
            "signup_date": START - timedelta(days=rng.randint(0, 700)),
        })
    prods = []
    for category, names in CATEGORIES.items():
        for name in names[:products_per_category]:
            prods.append({
                "product_id": f"P{len(prods) + 1:03d}",
                "name": name,
                "category": category,
                "unit_price": money(rng.choice([4.5, 7.99, 12.0, 15.5, 19.99, 24.0, 32.5, 45.0, 59.99, 89.0])),
                "active": rng.random() > 0.1,
            })
    ords, items = [], []
    for i in range(1, orders + 1):
        status = rng.choices(STATUSES, STATUS_WEIGHTS)[0]
        order_id = f"O{i:05d}"
        total = Decimal("0.00")
        for line in range(1, rng.randint(1, 4) + 1):
            p = rng.choice(prods)
            qty = rng.randint(1, 3)
            price = p["unit_price"] if rng.random() > 0.15 else money(float(p["unit_price"]) * 0.9)
            items.append({"order_id": order_id, "line_no": line, "product_id": p["product_id"], "quantity": qty, "unit_price": price})
            total += price * qty
        priced = not (null_totals and status == "placed" and rng.random() < 0.3)
        ords.append({
            "order_id": order_id,
            "customer_id": rng.choice(cust)["customer_id"],
            "order_date": START + timedelta(days=rng.randint(0, 270)),
            "status": status,
            "channel": rng.choice(CHANNELS),
            "total": total.quantize(CENT) if priced else None,
        })
    for _ in range(duplicates):
        ords.append(dict(rng.choice(ords)))
    return {"customers": cust, "products": prods, "orders": ords, "order_items": items}


BAD_STATUSES = ["PAID", "Shipped", "pending", "unknown", None]


def add_problems(rng: random.Random, orders: list[dict], share: float = 0.06) -> None:
    """Damage a share of orders the way a raw export does. Each damaged order gets exactly one problem."""
    for o in orders:
        if rng.random() >= share:
            continue
        kind = rng.choice(["status", "negative", "missing_total", "missing_date", "early", "late"])
        if kind == "status":
            o["status"] = rng.choice(BAD_STATUSES)
        elif kind == "negative":
            o["total"] = -o["total"] if o["total"] else Decimal("-12.50")
        elif kind == "missing_total":
            o["total"] = None
        elif kind == "missing_date":
            o["order_date"] = None
        elif kind == "early":
            o["order_date"] = date(2025, 12, rng.randint(1, 31))
        else:
            o["order_date"] = date(2027, 1, rng.randint(1, 15))


def main() -> dict:
    editions = {
        # A table you can read whole on screen. Questions that need a precise edge (a boundary, a null) bring their own.
        "lesson": build(random.Random(SEED), customers=6, products_per_category=2, orders=12, duplicates=0, null_totals=False),
        "practice": build(random.Random(SEED + 1), customers=300, products_per_category=5, orders=2000, duplicates=6, null_totals=True),
        "project": build(random.Random(SEED + 2), customers=400, products_per_category=5, orders=3000, duplicates=12, null_totals=True),
    }
    add_problems(random.Random(SEED + 3), editions["project"]["orders"])
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Retail Commerce",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d01_retail.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
