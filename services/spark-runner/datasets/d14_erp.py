"""PS-D14 Enterprise CRM & ERP: Runtime's own deterministic synthetic business-system data (AdventureWorks-like, invented).

    python3 services/spark-runner/datasets/d14_erp.py

Writes fixtures/PS-D14/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same bytes.
Standard library only: this runs on the host. No AdventureWorks rows are used; every company, person and product is made up.

Lessons: L029 union/intersect/except (suppliers come from two systems that overlap), L046 XML/Avro and schemas, L048 JDBC
and multi-source ingestion, L061 Delta tables, L064 change data capture and L075 slowly changing dimensions
(customer_cdc and product_cdc are change feeds with op, sequence, changed_at and the full row image), L086 small files,
L090 integration. Project P08 (with PS-D08) replays the feeds; its edition has out-of-order arrivals and duplicate changes.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D14"
VERSION = "1.0.0"
SEED = 2014

ACCOUNT_COLS = "account_id STRING, account_name STRING, industry STRING, country STRING, segment STRING, account_owner STRING, " \
               "credit_limit DECIMAL(12,2), created_on DATE, is_active BOOLEAN"
PRODUCT_COLS = "product_id STRING, product_name STRING, category STRING, list_price DECIMAL(10,2), unit_of_measure STRING, is_active BOOLEAN"
SCHEMAS = {
    "accounts": ACCOUNT_COLS,
    "contacts": "contact_id STRING, account_id STRING, first_name STRING, last_name STRING, job_title STRING, email STRING, "
                "phone STRING, is_primary BOOLEAN",
    "invoices": "invoice_id STRING, account_id STRING, invoice_date DATE, due_date DATE, status STRING, total_amount DECIMAL(12,2)",
    "invoice_lines": "invoice_id STRING, line_no INT, product_id STRING, quantity INT, unit_price DECIMAL(10,2), "
                     "discount_pct DECIMAL(5,2), line_amount DECIMAL(12,2)",
    "purchase_orders": "po_id STRING, supplier_id STRING, order_date DATE, expected_date DATE, status STRING, currency STRING, "
                       "total_amount DECIMAL(12,2)",
    "suppliers": "source_system STRING, supplier_id STRING, supplier_name STRING, country STRING, payment_terms_days INT, "
                 "contact_email STRING",
    "customer_cdc": "op STRING, sequence BIGINT, changed_at TIMESTAMP, " + ACCOUNT_COLS,
    "product_cdc": "op STRING, sequence BIGINT, changed_at TIMESTAMP, " + PRODUCT_COLS,
}
TABLE_NOTES = {
    "accounts": "One row per customer account as the CRM held it at the 2026-01-01 snapshot.",
    "contacts": "One row per person the business deals with at a customer account.",
    "invoices": "One row per invoice sent to an account, with its status and total.",
    "invoice_lines": "One row per line of an invoice: which product, how many, at what price and discount.",
    "purchase_orders": "One row per purchase order raised in the ERP to a supplier.",
    "suppliers": "One row per supplier per source system: the ERP and the procurement tool each keep their own list.",
    "customer_cdc": "One row per change to an account after the snapshot: insert, update or delete, with the whole row as it stood after the change.",
    "product_cdc": "One row per change to a product since the catalogue began: insert, update or delete, with the whole row.",
}
KEYS = {
    "primary": {
        "accounts": ["account_id"], "contacts": ["contact_id"], "invoices": ["invoice_id"], "invoice_lines": ["invoice_id", "line_no"],
        "purchase_orders": ["po_id"], "suppliers": ["source_system", "supplier_id"],
        "customer_cdc": ["account_id", "sequence"], "product_cdc": ["product_id", "sequence"],
    },
    "foreign": {
        "contacts.account_id": "accounts.account_id",
        "invoices.account_id": "accounts.account_id",
        "invoice_lines.invoice_id": "invoices.invoice_id",
        "invoice_lines.product_id": "product_cdc.product_id",
        "purchase_orders.supplier_id": "suppliers.supplier_id",
    },
}
RULES = [
    "Every company, person, email domain (.example) and phone number (555-01xx) is invented.",
    "accounts is the CRM snapshot taken at 2026-01-01 00:00 UTC. customer_cdc holds every change after it; applying the feed in sequence order to the snapshot gives today's accounts. Accounts inserted by the feed are not in the snapshot.",
    "product_cdc is the full history of the catalogue from its first insert in 2025; there is no product snapshot table — today's products are the feed's latest row per product_id, unless that row is a delete.",
    "op is I (insert), U (update) or D (delete). Every row carries the full row image: for I and U the row after the change, for D the last row before the delete.",
    "sequence is the change's position in the source log: it increases strictly with every change, so per key it is strictly increasing and it decides the order of changes. changed_at (UTC) is when the change was committed and follows the same order.",
    "A key can change many times; the lesson edition's ACC-0001 is updated three times, ACC-0003 is deleted and ACC-0006 is inserted and then updated.",
    "suppliers comes from two systems: source_system erp and procurement. The same supplier has the same supplier_id in both. Most suppliers are in both lists, some only in one.",
    "A few suppliers appear in both systems with a small difference (the name spelled with a legal suffix, or different payment terms), so comparing whole rows (intersect, exceptAll) does not match them while comparing supplier_id does. Lesson edition: SUP-003.",
    "purchase_orders are raised in the ERP, so supplier_id always refers to a supplier in the erp list.",
    "invoice_lines.unit_price is the product's list_price on the invoice date (from product_cdc history); line_amount = quantity × unit_price × (1 − discount_pct / 100), rounded to cents; an invoice's total_amount is the sum of its line_amount.",
    "All invoice amounts are in USD. Invoice status is draft, open, paid, overdue or void; due_date is 30 days after invoice_date.",
    "Each account has one primary contact (is_primary true); phone is empty (null) for some contacts.",
    "Practice edition: the change feeds are clean — one row per change, in sequence order.",
    "Project edition problem 1 (out-of-order arrivals): about 5% of feed rows arrived late, after rows with a higher sequence; the file is in arrival order, so the last row in the file for a key is not always its latest change. Order by sequence.",
    "Project edition problem 2 (duplicate changes): a few changes were delivered twice — identical rows with the same key and sequence. Deduplicate on (key, sequence) before applying.",
]

PREFIXES = ["Quillfen", "Brackenmoor", "Tamsley", "Corvane", "Ellowby", "Fennick", "Marrowind", "Pellacott", "Rindell", "Ostley",
            "Vantor", "Hesketh Vale", "Larchmere", "Dunmarrow", "Sablewick", "Thornvale", "Wrenfield", "Kelderby", "Amberloch", "Grisford",
            "Nettlecombe", "Ashbury Row", "Calloway Bend", "Pemberlin", "Yarrowby"]
SUFFIXES = ["Analytics", "Logistics", "Foods", "Manufacturing", "Health", "Systems", "Retail", "Energy", "Labs", "Partners", "Textiles", "Marine"]
INDUSTRIES = {"Analytics": "technology", "Systems": "technology", "Labs": "technology", "Logistics": "transport", "Marine": "transport",
              "Foods": "consumer goods", "Retail": "consumer goods", "Textiles": "consumer goods", "Manufacturing": "manufacturing",
              "Energy": "energy", "Health": "healthcare", "Partners": "professional services"}
COUNTRIES = ["US", "US", "US", "GB", "DE", "NL", "PT", "IN", "AU", "CA"]
LEGAL = {"US": "Inc", "CA": "Inc", "GB": "Ltd", "DE": "GmbH", "NL": "B.V.", "PT": "Lda", "IN": "Pvt Ltd", "AU": "Pty Ltd"}
CURRENCY = {"US": "USD", "CA": "CAD", "GB": "GBP", "DE": "EUR", "NL": "EUR", "PT": "EUR", "IN": "INR", "AU": "AUD"}
SEGMENTS = ["enterprise", "mid_market", "smb"]
SEGMENT_W = [15, 35, 50]
OWNERS = ["Dana Whitlock", "Rafael Ibarra", "Priya Venkat", "Jonas Ekberg", "Mei Lindqvist", "Tobias Achterberg"]
FIRST = ["Alina", "Bram", "Chiara", "Dev", "Elif", "Farid", "Greta", "Hugo", "Ines", "Jae", "Kaito", "Lucia", "Milan", "Nadia", "Oskar",
         "Pia", "Quentin", "Rosa", "Sanjay", "Tess", "Umar", "Vera", "Wes", "Ximena", "Yusuf", "Zara"]
LAST = ["Abernathy", "Brightwater", "Castellan", "Dorsey", "Eklund", "Fairbanks", "Goswami", "Halloran", "Ivers", "Jaramillo", "Kowalczyk",
        "Lindqvist", "Marchetti", "Nakashima", "Okonjo", "Prescott", "Quaid", "Rasmussen", "Sandoval", "Thorne", "Underhill", "Valdez"]
TITLES = ["Procurement Manager", "Finance Director", "Operations Lead", "IT Manager", "Buyer", "Accounts Payable Clerk", "COO", "Category Manager"]
CATALOGUE = {
    "fasteners": ["Hex Bolt M8", "Hex Nut M8", "Wood Screw 40mm", "Rivet 4mm", "Anchor Plug 6mm"],
    "tools": ["Torque Wrench", "Cordless Drill", "Utility Knife", "Spirit Level 60cm", "Socket Set 24pc"],
    "safety": ["Safety Glasses", "Nitrile Gloves", "Hi-Vis Vest", "Ear Defenders", "Hard Hat"],
    "packaging": ["Stretch Film Roll", "Carton 40x30x30", "Packing Tape", "Pallet Wrap", "Bubble Roll"],
    "electrical": ["Cable Tie Pack", "Extension Reel 25m", "LED Panel 600", "Junction Box", "Fuse Kit"],
}
UOM = {"fasteners": "box", "tools": "each", "safety": "pair", "packaging": "roll", "electrical": "each"}
INVOICE_STATUS = ["draft", "open", "paid", "overdue", "void"]
INVOICE_STATUS_W = [3, 22, 60, 12, 3]
CENT = Decimal("0.01")
SNAPSHOT = datetime(2026, 1, 1)


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(CENT, rounding=ROUND_HALF_UP)


def company_names(rng: random.Random) -> list[str]:
    names = [f"{p} {s}" for p in PREFIXES for s in SUFFIXES]
    rng.shuffle(names)
    return names + [f"{n} Holdings" for n in names]


def strip_legal(name: str) -> tuple[str, str]:
    """('Quillfen Analytics', 'Inc') from 'Quillfen Analytics Inc'."""
    for legal in sorted(set(LEGAL.values()), key=len, reverse=True):
        if name.endswith(" " + legal):
            return name[: -len(legal) - 1], legal
    return name, ""


def slug(name: str) -> str:
    return "".join(ch for ch in name.lower() if ch.isalnum())


def new_account(rng: random.Random, i: int, name: str, created: date) -> dict:
    country = rng.choice(COUNTRIES)
    seg = rng.choices(SEGMENTS, SEGMENT_W)[0]
    limit = {"enterprise": 250000, "mid_market": 75000, "smb": 15000}[seg] * rng.choice([1, 1, 2, 0.5])
    return {"account_id": f"ACC-{i:04d}", "account_name": f"{name} {LEGAL[country]}", "industry": next(INDUSTRIES[w] for w in name.split() if w in INDUSTRIES),
            "country": country, "segment": seg, "account_owner": rng.choice(OWNERS), "credit_limit": money(limit),
            "created_on": created, "is_active": True}


def mutate_account(rng: random.Random, row: dict) -> dict:
    r = dict(row)
    field = rng.choices(["credit_limit", "segment", "account_owner", "account_name", "is_active", "country"], [35, 15, 25, 10, 10, 5])[0]
    if field == "credit_limit":
        r["credit_limit"] = money(float(r["credit_limit"]) * rng.choice([0.5, 0.8, 1.25, 1.5, 2.0]))
    elif field == "segment":
        r["segment"] = rng.choice([s for s in SEGMENTS if s != r["segment"]])
    elif field == "account_owner":
        r["account_owner"] = rng.choice([o for o in OWNERS if o != r["account_owner"]])
    elif field == "account_name":
        base, legal = strip_legal(r["account_name"])
        base = base[: -len(" Group")] if base.endswith(" Group") else base + " Group"
        r["account_name"] = f"{base} {legal}".strip()
    elif field == "is_active":
        r["is_active"] = not r["is_active"]
    else:
        r["country"] = rng.choice([c for c in sorted(set(COUNTRIES)) if c != r["country"]])
    return r


def new_product(rng: random.Random, i: int, category: str, name: str) -> dict:
    return {"product_id": f"PRD-{i:03d}", "product_name": name, "category": category,
            "list_price": money(rng.choice([4.5, 8.9, 12.0, 18.5, 24.0, 39.0, 65.0, 120.0, 189.0])), "unit_of_measure": UOM[category],
            "is_active": True}


def mutate_product(rng: random.Random, row: dict) -> dict:
    r = dict(row)
    if rng.random() < 0.8:
        r["list_price"] = money(float(r["list_price"]) * rng.choice([0.9, 1.05, 1.08, 1.1, 1.15]))
    else:
        r["is_active"] = not r["is_active"]
    return r


def feed(rng: random.Random, start: datetime, end: datetime, live: dict, n_changes: int, weights: list[int], make_new, mutate,
         key: str, seq_start: int) -> list[dict]:
    """A change log from `start` to `end` against the rows in `live` (mutated in place). Returns rows in sequence order."""
    times = sorted(start + timedelta(seconds=rng.randint(0, int((end - start).total_seconds()))) for _ in range(n_changes))
    out = []
    seq = seq_start
    for t in times:
        # sequence increases strictly; the gaps mimic a shared log with other tables' changes in between.
        seq += rng.randint(1, 3)
        keys = sorted(live)
        op = rng.choices(["I", "U", "D"], weights)[0] if len(keys) > 3 else "I"
        if op == "I":
            row = make_new(t)
            live[row[key]] = row
        elif op == "U":
            k = rng.choice(keys)
            row = mutate(rng, live[k])
            live[k] = row
        else:
            k = rng.choice(keys)
            row = live.pop(k)
        out.append({"op": op, "sequence": seq, "changed_at": t, **row})
    return out


def products_feed(rng: random.Random, n_products: int, n_updates: int) -> list[dict]:
    pool = [(c, n) for c in sorted(CATALOGUE) for n in CATALOGUE[c]]
    variants = ["", " Pro", " Lite", " XL", " Eco"]
    names = [(c, n + v) for v in variants for c, n in pool][:n_products]
    live: dict[str, dict] = {}
    out = []
    first = names[: int(n_products * 0.75)]
    t0 = datetime(2025, 6, 2, 9, 0)
    for i, (c, n) in enumerate(first, 1):
        row = new_product(rng, i, c, n)
        live[row["product_id"]] = row
        out.append({"op": "I", "sequence": 1000 + i, "changed_at": t0 + timedelta(minutes=i), **row})
    later = iter(names[len(first):])
    counter = [len(first)]

    def make_new(t):
        c, n = next(later, (None, None))
        if c is None:
            c, n = "tools", f"Tool Kit {counter[0]}"
        counter[0] += 1
        return new_product(rng, counter[0], c, n)

    remaining = n_products - len(first)
    out += feed(rng, datetime(2025, 7, 1), datetime(2026, 3, 31), live, n_updates + remaining, [remaining, n_updates, max(1, n_updates // 12)],
                make_new, mutate_product, "product_id", 5000)
    return out


def price_on(history: list[dict], product_id: str, day: date):
    """List price of a product on a day, from its history (None if it didn't exist or was deleted)."""
    price = None
    for r in history:
        if r["product_id"] == product_id and r["changed_at"].date() <= day:
            price = None if r["op"] == "D" or not r["is_active"] else r["list_price"]
    return price


def build(rng: random.Random, accounts: int, invoices: int, cust_changes: int, products: int, prod_updates: int, suppliers: int, pos: int) -> dict:
    names = company_names(rng)
    accts = [new_account(rng, i, names[i - 1], date(2021, 1, 1) + timedelta(days=rng.randint(0, 1700))) for i in range(1, accounts + 1)]
    live = {a["account_id"]: dict(a) for a in accts}
    counter = [accounts]

    def make_account(t):
        counter[0] += 1
        return new_account(rng, counter[0], names[counter[0] - 1], t.date())

    cust = feed(rng, SNAPSHOT, datetime(2026, 3, 31, 23, 59), live, cust_changes, [18, 70, 12], make_account, mutate_account, "account_id", 200000)
    prod = products_feed(rng, products, prod_updates)

    contacts = []
    for a in accts:
        for k in range(rng.choices([1, 2, 3], [40, 40, 20])[0]):
            f, l = rng.choice(FIRST), rng.choice(LAST)
            contacts.append({"contact_id": f"CON-{len(contacts) + 1:05d}", "account_id": a["account_id"], "first_name": f, "last_name": l,
                             "job_title": rng.choice(TITLES), "email": f"{f.lower()}.{l.lower()}@{slug(strip_legal(a['account_name'])[0])}.example",
                             "phone": None if rng.random() < 0.2 else f"+1-202-555-01{rng.randint(0, 99):02d}", "is_primary": k == 0})

    by_product = {}
    for r in prod:
        by_product.setdefault(r["product_id"], []).append(r)
    product_ids = sorted(by_product)
    inv, lines = [], []
    dates = sorted(date(2025, 10, 1) + timedelta(days=rng.randint(0, 181)) for _ in range(invoices))
    for i, d in enumerate(dates, 1):
        a = rng.choice(accts)
        inv_id = f"INV-{i:06d}"
        total = Decimal("0.00")
        n = 0
        for _ in range(rng.choices([1, 2, 3, 4, 5], [20, 30, 25, 15, 10])[0]):
            pid = rng.choice(product_ids)
            price = price_on(by_product[pid], pid, d)
            if price is None:
                continue
            n += 1
            qty = rng.choice([1, 2, 5, 10, 20, 50])
            disc = Decimal(rng.choice(["0.00", "0.00", "0.00", "5.00", "10.00", "15.00"]))
            amount = (price * qty * (1 - disc / 100)).quantize(CENT, rounding=ROUND_HALF_UP)
            lines.append({"invoice_id": inv_id, "line_no": n, "product_id": pid, "quantity": qty, "unit_price": price,
                          "discount_pct": disc, "line_amount": amount})
            total += amount
        if n == 0:
            continue
        status = rng.choices(INVOICE_STATUS, INVOICE_STATUS_W)[0]
        inv.append({"invoice_id": inv_id, "account_id": a["account_id"], "invoice_date": d, "due_date": d + timedelta(days=30),
                    "status": status, "total_amount": total})

    sup = make_suppliers(rng, names[len(names) // 2 - suppliers:len(names) // 2], suppliers)
    erp_ids = [s["supplier_id"] for s in sup if s["source_system"] == "erp"]
    sup_country = {s["supplier_id"]: s["country"] for s in sup if s["source_system"] == "erp"}
    po_rows = []
    for i, d in enumerate(sorted(date(2025, 11, 1) + timedelta(days=rng.randint(0, 150)) for _ in range(pos)), 1):
        sid = rng.choice(erp_ids)
        status = rng.choices(["open", "partially_received", "received", "cancelled"], [25, 10, 58, 7])[0]
        po_rows.append({"po_id": f"PO-{i:05d}", "supplier_id": sid, "order_date": d, "expected_date": d + timedelta(days=rng.choice([7, 14, 21, 30])),
                        "status": status, "currency": CURRENCY[sup_country[sid]], "total_amount": money(rng.uniform(300, 48000))})
    return {"accounts": accts, "contacts": contacts, "invoices": inv, "invoice_lines": lines, "purchase_orders": po_rows,
            "suppliers": sup, "customer_cdc": cust, "product_cdc": prod}


def make_suppliers(rng: random.Random, names: list[str], n: int) -> list[dict]:
    """Suppliers in two systems: ~65% in both (a few with small differences), the rest in only one."""
    out = []
    for i in range(1, n + 1):
        country = rng.choice(COUNTRIES)
        name = f"{names[i - 1]} Supply"
        base = {"supplier_id": f"SUP-{i:03d}", "supplier_name": name, "country": country,
                "payment_terms_days": rng.choice([15, 30, 30, 45, 60]), "contact_email": f"orders@{slug(name)}.example"}
        where = rng.choices(["both", "erp", "procurement"], [65, 20, 15])[0]
        if where in ("both", "erp"):
            out.append({"source_system": "erp", **base})
        if where in ("both", "procurement"):
            other = dict(base)
            if where == "both" and rng.random() < 0.1:
                if rng.random() < 0.5:
                    other["supplier_name"] = f"{name} {LEGAL[country]}"
                else:
                    other["payment_terms_days"] = base["payment_terms_days"] + 15
            out.append({"source_system": "procurement", **other})
    out.sort(key=lambda r: (r["source_system"], r["supplier_id"]))
    return out


def add_problems(rng: random.Random, ed: dict) -> None:
    for table in ("customer_cdc", "product_cdc"):
        rows = ed[table]
        late = [r for r in rows if rng.random() < 0.05]
        late_ids = {id(r) for r in late}
        arrived = [r for r in rows if id(r) not in late_ids]
        for r in late:
            # Arrives 3–40 rows after where it belongs.
            pos = next(i for i, x in enumerate(arrived) if x["sequence"] > r["sequence"]) if any(x["sequence"] > r["sequence"] for x in arrived) else len(arrived)
            arrived.insert(min(len(arrived), pos + rng.randint(3, 40)), r)
        for r in rng.sample(rows, 6 if table == "customer_cdc" else 3):
            i = next(i for i, x in enumerate(arrived) if x is r)
            arrived.insert(min(len(arrived), i + rng.randint(1, 25)), dict(r))
        ed[table] = arrived


def lesson() -> dict:
    """Hand-written: every row readable, every CDC case visible once."""
    A = lambda i, name, ind, c, seg, owner, lim, created: {  # noqa: E731
        "account_id": f"ACC-{i:04d}", "account_name": name, "industry": ind, "country": c, "segment": seg, "account_owner": owner,
        "credit_limit": money(lim), "created_on": created, "is_active": True}
    accts = [
        A(1, "Quillfen Analytics Inc", "technology", "US", "mid_market", "Dana Whitlock", 75000, date(2022, 3, 14)),
        A(2, "Brackenmoor Foods Ltd", "consumer goods", "GB", "smb", "Jonas Ekberg", 15000, date(2023, 6, 2)),
        A(3, "Tamsley Logistics GmbH", "transport", "DE", "enterprise", "Mei Lindqvist", 250000, date(2021, 9, 20)),
        A(4, "Corvane Health Pty Ltd", "healthcare", "AU", "mid_market", "Rafael Ibarra", 75000, date(2024, 1, 8)),
        A(5, "Ellowby Energy Inc", "energy", "US", "smb", "Dana Whitlock", 15000, date(2025, 4, 30)),
    ]
    by = {a["account_id"]: a for a in accts}

    def ch(op, seq, t, base, **changes):
        return {"op": op, "sequence": seq, "changed_at": t, **{**base, **changes}}

    a6 = A(6, "Fennick Labs B.V.", "technology", "NL", "smb", "Priya Venkat", 15000, date(2026, 1, 19))
    a7 = A(7, "Marrowind Retail Lda", "consumer goods", "PT", "smb", "Tobias Achterberg", 15000, date(2026, 2, 9))
    cust = [
        ch("U", 200001, datetime(2026, 1, 6, 10, 15), by["ACC-0001"], credit_limit=money(100000)),
        ch("U", 200004, datetime(2026, 1, 12, 14, 2), by["ACC-0002"], account_owner="Priya Venkat"),
        ch("I", 200007, datetime(2026, 1, 19, 9, 40), a6),
        ch("U", 200009, datetime(2026, 1, 27, 16, 5), by["ACC-0001"], credit_limit=money(100000), segment="enterprise"),
        ch("D", 200012, datetime(2026, 2, 3, 11, 30), by["ACC-0003"]),
        ch("I", 200015, datetime(2026, 2, 9, 8, 55), a7),
        ch("U", 200016, datetime(2026, 2, 17, 13, 20), a6, credit_limit=money(30000)),
        ch("U", 200019, datetime(2026, 3, 2, 10, 0), by["ACC-0004"], is_active=False),
        ch("U", 200023, datetime(2026, 3, 10, 15, 45), by["ACC-0001"], credit_limit=money(100000), segment="enterprise", account_owner="Mei Lindqvist"),
        ch("U", 200026, datetime(2026, 3, 18, 9, 10), a7, account_name="Marrowind Retail Group Lda"),
    ]
    P = lambda i, name, cat, price: {"product_id": f"PRD-{i:03d}", "product_name": name, "category": cat, "list_price": money(price),  # noqa: E731
                                     "unit_of_measure": UOM[cat], "is_active": True}
    p = [P(1, "Hex Bolt M8", "fasteners", 12.00), P(2, "Torque Wrench", "tools", 65.00), P(3, "Safety Glasses", "safety", 8.90),
         P(4, "Packing Tape", "packaging", 4.50), P(5, "LED Panel 600", "electrical", 39.00)]
    prod = [
        ch("I", 1001, datetime(2025, 6, 2, 9, 1), p[0]),
        ch("I", 1002, datetime(2025, 6, 2, 9, 2), p[1]),
        ch("I", 1003, datetime(2025, 6, 2, 9, 3), p[2]),
        ch("I", 1004, datetime(2025, 6, 2, 9, 4), p[3]),
        ch("U", 5002, datetime(2025, 11, 3, 8, 0), p[1], list_price=money(69.00)),
        ch("U", 5007, datetime(2026, 2, 2, 8, 0), p[1], list_price=money(74.50)),
        ch("D", 5011, datetime(2026, 2, 20, 17, 30), p[3]),
        ch("I", 5013, datetime(2026, 3, 1, 9, 0), p[4]),
    ]
    contacts = [
        {"contact_id": "CON-00001", "account_id": "ACC-0001", "first_name": "Alina", "last_name": "Castellan", "job_title": "Procurement Manager",
         "email": "alina.castellan@quillfenanalytics.example", "phone": "+1-202-555-0114", "is_primary": True},
        {"contact_id": "CON-00002", "account_id": "ACC-0001", "first_name": "Hugo", "last_name": "Eklund", "job_title": "Finance Director",
         "email": "hugo.eklund@quillfenanalytics.example", "phone": None, "is_primary": False},
        {"contact_id": "CON-00003", "account_id": "ACC-0002", "first_name": "Rosa", "last_name": "Marchetti", "job_title": "Buyer",
         "email": "rosa.marchetti@brackenmoorfoods.example", "phone": "+1-202-555-0162", "is_primary": True},
        {"contact_id": "CON-00004", "account_id": "ACC-0003", "first_name": "Oskar", "last_name": "Rasmussen", "job_title": "Operations Lead",
         "email": "oskar.rasmussen@tamsleylogistics.example", "phone": "+1-202-555-0127", "is_primary": True},
        {"contact_id": "CON-00005", "account_id": "ACC-0004", "first_name": "Nadia", "last_name": "Goswami", "job_title": "IT Manager",
         "email": "nadia.goswami@corvanehealth.example", "phone": "+1-202-555-0145", "is_primary": True},
        {"contact_id": "CON-00006", "account_id": "ACC-0005", "first_name": "Wes", "last_name": "Okonjo", "job_title": "COO",
         "email": "wes.okonjo@ellowbyenergy.example", "phone": None, "is_primary": True},
    ]
    hist = {r["product_id"]: [x for x in prod if x["product_id"] == r["product_id"]] for r in prod}
    spec = [("INV-000001", "ACC-0001", date(2025, 10, 14), "paid", [("PRD-002", 2, "0.00"), ("PRD-001", 10, "5.00")]),
            ("INV-000002", "ACC-0002", date(2025, 11, 20), "paid", [("PRD-003", 20, "0.00"), ("PRD-004", 12, "0.00")]),
            ("INV-000003", "ACC-0003", date(2025, 12, 9), "overdue", [("PRD-002", 1, "0.00"), ("PRD-003", 50, "10.00")]),
            ("INV-000004", "ACC-0001", date(2026, 2, 5), "open", [("PRD-002", 3, "0.00"), ("PRD-001", 5, "0.00")]),
            ("INV-000005", "ACC-0005", date(2026, 3, 4), "draft", [("PRD-005", 4, "0.00"), ("PRD-003", 10, "0.00")])]
    inv, lines = [], []
    for iid, acc, d, status, ls in spec:
        total = Decimal("0.00")
        for n, (pid, qty, disc) in enumerate(ls, 1):
            price = price_on(hist[pid], pid, d)
            disc = Decimal(disc)
            amount = (price * qty * (1 - disc / 100)).quantize(CENT, rounding=ROUND_HALF_UP)
            lines.append({"invoice_id": iid, "line_no": n, "product_id": pid, "quantity": qty, "unit_price": price, "discount_pct": disc, "line_amount": amount})
            total += amount
        inv.append({"invoice_id": iid, "account_id": acc, "invoice_date": d, "due_date": d + timedelta(days=30), "status": status, "total_amount": total})
    S = lambda sys_, i, name, c, terms: {"source_system": sys_, "supplier_id": f"SUP-{i:03d}", "supplier_name": name, "country": c,  # noqa: E731
                                         "payment_terms_days": terms, "contact_email": f"orders@{slug(name.split(' Ltd')[0])}.example"}
    sup = [
        S("erp", 1, "Pellacott Fasteners", "GB", 30), S("erp", 2, "Rindell Tooling", "DE", 45),
        S("erp", 3, "Ostley Safety Supply", "GB", 30), S("erp", 4, "Vantor Packaging", "NL", 60),
        S("procurement", 1, "Pellacott Fasteners", "GB", 30), S("procurement", 2, "Rindell Tooling", "DE", 45),
        S("procurement", 3, "Ostley Safety Supply Ltd", "GB", 30), S("procurement", 5, "Larchmere Electrical", "US", 30),
    ]
    po = [
        {"po_id": "PO-00001", "supplier_id": "SUP-001", "order_date": date(2025, 11, 4), "expected_date": date(2025, 11, 18), "status": "received", "currency": "GBP", "total_amount": money(2480.00)},
        {"po_id": "PO-00002", "supplier_id": "SUP-002", "order_date": date(2025, 12, 1), "expected_date": date(2025, 12, 22), "status": "received", "currency": "EUR", "total_amount": money(9150.50)},
        {"po_id": "PO-00003", "supplier_id": "SUP-004", "order_date": date(2026, 1, 15), "expected_date": date(2026, 2, 14), "status": "cancelled", "currency": "EUR", "total_amount": money(1320.00)},
        {"po_id": "PO-00004", "supplier_id": "SUP-003", "order_date": date(2026, 2, 10), "expected_date": date(2026, 2, 24), "status": "partially_received", "currency": "GBP", "total_amount": money(5640.75)},
        {"po_id": "PO-00005", "supplier_id": "SUP-001", "order_date": date(2026, 3, 9), "expected_date": date(2026, 3, 23), "status": "open", "currency": "GBP", "total_amount": money(3075.20)},
    ]
    return {"accounts": accts, "contacts": contacts, "invoices": inv, "invoice_lines": lines, "purchase_orders": po,
            "suppliers": sup, "customer_cdc": cust, "product_cdc": prod}


def main() -> dict:
    practice = build(random.Random(SEED + 1), accounts=150, invoices=900, cust_changes=420, products=80, prod_updates=90, suppliers=60, pos=320)
    project = build(random.Random(SEED + 2), accounts=220, invoices=1900, cust_changes=1200, products=110, prod_updates=200, suppliers=80, pos=600)
    add_problems(random.Random(SEED + 3), project)
    editions = {"lesson": lesson(), "practice": practice, "project": project}
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Enterprise CRM & ERP",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d14_erp.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
