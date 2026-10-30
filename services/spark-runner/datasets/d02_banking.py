"""PS-D02 Banking & Payments: Runtime's own deterministic synthetic retail-banking data (no real people or banks).

    python3 services/spark-runner/datasets/d02_banking.py

Writes fixtures/PS-D02/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

Editions: `lesson` is small enough to read whole on screen (one orphan transaction and one with no account, for the
semi/anti join lesson); `practice` is a realistic month-by-month book with the odd invalid row; `project` is what P04
reconciles: transfers with their debit/credit ledger entries plus reversals, duplicate transfers and unmatched entries.

Money is DECIMAL(12,2) and always positive; `direction` says whether it left (debit) or reached (credit) the account.
merchants.mcc_code is a four-digit category code kept as text (some start with 0), for the casting lesson.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D02"
VERSION = "1.0.0"
SEED = 2002

SCHEMAS = {
    "customers": "customer_id STRING, full_name STRING, email STRING, city STRING, country STRING, segment STRING, kyc_status STRING, joined_date DATE",
    "accounts": "account_id STRING, customer_id STRING, account_type STRING, currency STRING, status STRING, opened_date DATE, overdraft_limit DECIMAL(12,2)",
    "merchants": "merchant_id STRING, merchant_name STRING, mcc_code STRING, category STRING, country STRING",
    "transactions": "transaction_id STRING, account_id STRING, merchant_id STRING, posted_at TIMESTAMP, txn_type STRING, channel STRING, direction STRING, amount DECIMAL(12,2), currency STRING, status STRING",
    "transfers": "transfer_id STRING, from_account_id STRING, to_account_id STRING, amount DECIMAL(12,2), currency STRING, requested_at TIMESTAMP, status STRING, reference STRING, reversal_of STRING",
    "ledger_entries": "entry_id STRING, transfer_id STRING, account_id STRING, entry_type STRING, amount DECIMAL(12,2), currency STRING, booked_at TIMESTAMP",
    "disputes": "dispute_id STRING, transaction_id STRING, opened_date DATE, reason STRING, disputed_amount DECIMAL(12,2), status STRING, resolved_date DATE",
}
TABLE_NOTES = {
    "customers": "One row per bank customer: where they live, their segment and whether their identity checks are done.",
    "accounts": "One row per account a customer holds, with its type, currency and status.",
    "merchants": "One row per card merchant, with its four-digit category code (mcc_code, stored as text).",
    "transactions": "One row per card, cash or account movement posted to an account: when, what kind, which way and how much.",
    "transfers": "One row per request to move money from one account to another, including reversals of earlier transfers.",
    "ledger_entries": "One row per side of a booked transfer: a debit on the sending account or a credit on the receiving one.",
    "disputes": "One row per customer dispute raised against a card transaction, and how it ended.",
}
KEYS = {
    "primary": {
        "customers": ["customer_id"],
        "accounts": ["account_id"],
        "merchants": ["merchant_id"],
        "transactions": ["transaction_id"],
        "transfers": ["transfer_id"],
        "ledger_entries": ["entry_id"],
        "disputes": ["dispute_id"],
    },
    "foreign": {
        "accounts.customer_id": "customers.customer_id",
        "transactions.account_id": "accounts.account_id",
        "transactions.merchant_id": "merchants.merchant_id",
        "transfers.from_account_id": "accounts.account_id",
        "transfers.to_account_id": "accounts.account_id",
        "transfers.reversal_of": "transfers.transfer_id",
        "ledger_entries.transfer_id": "transfers.transfer_id",
        "ledger_entries.account_id": "accounts.account_id",
        "disputes.transaction_id": "transactions.transaction_id",
    },
}
RULES = [
    "Every amount is DECIMAL(12,2) and positive; direction is debit (money leaves the account) or credit (money arrives). A signed amount is -amount for debits.",
    "txn_type is one of purchase, refund, atm_withdrawal, deposit, fee, interest. purchase, atm_withdrawal and fee are debits; refund, deposit and interest are credits.",
    "channel is one of card_present, online, mobile, atm, branch, system. merchant_id is set only for purchase and refund; it is null for the other types.",
    "status is posted, pending or declined. A transaction's currency is its account's currency (USD, EUR or GBP).",
    "merchants.mcc_code is a four-digit code stored as STRING; some codes start with 0 (0742 veterinary), so casting to INT loses the leading zero.",
    "Some accounts have no transactions at all (new, dormant, frozen or closed accounts). Only active accounts transact or transfer.",
    "Every edition, the lesson included, has transactions whose account_id is not in accounts (orphans, ids from A9xxxx) and a few with a null account_id: a feed that lost its account.",
    "practice and project editions contain invalid transactions: a negative amount, an unknown currency (ZZZ, US$ or null), or no account. practice also has 5 exact duplicate rows, project 15.",
    "A transfer moves amount from from_account_id to to_account_id in one currency. status is completed, pending, failed or reversed.",
    "Each completed or reversed transfer has exactly two ledger entries: a debit on from_account_id and a credit on to_account_id for the same amount. pending and failed transfers have none. Debits equal credits for every transfer in the lesson and practice editions.",
    "A reversed transfer is undone by a later completed transfer in the opposite direction whose reversal_of names it; the pair nets to zero.",
    "The project edition (P04) is deliberately unbalanced: 15 duplicate transfers (same accounts, amount and reference, a few seconds after the original, both booked), 8 completed transfers missing their credit entry, 6 ledger entries whose transfer_id is not in transfers, and 4 credit entries whose amount differs from the debit by a few cents.",
    "Disputes are raised only on posted purchases. resolved_date is null while a dispute is open.",
]

FIRST = ["Maya", "Leo", "Anika", "Tomas", "Ines", "Ravi", "Hana", "Omar", "Zoe", "Kofi", "Lena", "Arjun", "Noor", "Felix", "Priya", "Jonas"]
LAST = ["Silva", "Grant", "Rao", "Novak", "Okafor", "Mori", "Weber", "Haddad", "Lind", "Costa", "Byrne", "Iyer"]
PLACES = [("Austin", "US", "USD"), ("Denver", "US", "USD"), ("Leeds", "GB", "GBP"), ("Bristol", "GB", "GBP"), ("Lyon", "FR", "EUR"), ("Porto", "PT", "EUR")]
# (name, mcc_code, category). Invented merchants; codes follow the usual four-digit category scheme.
MERCHANTS = [
    ("Green Basket Grocers", "5411", "groceries"),
    ("Paws & Claws Vet", "0742", "veterinary"),
    ("Corner Bean Cafe", "5814", "fast_food"),
    ("Metro Fuel Stop", "5541", "fuel"),
    ("Lumen Books", "5942", "books"),
    ("Harbor Bistro", "5812", "restaurants"),
    ("Swift Rail Tickets", "4112", "transport"),
    ("Pixel Stream", "4899", "subscriptions"),
    ("Northgate Pharmacy", "5912", "pharmacy"),
    ("Tidy Home Supplies", "5200", "home"),
    ("Orchard Florist", "5992", "gifts"),
    ("Cloud Nine Travel", "4722", "travel"),
]
MERCHANT_WORDS = ["Bright", "Urban", "Maple", "Silver", "Coastal", "Juniper", "Atlas", "Willow", "Granite", "Sunny"]
SEGMENTS, SEGMENT_W = ["retail", "premier", "business"], [75, 15, 10]
KYC, KYC_W = ["verified", "pending", "failed"], [92, 6, 2]
ACCOUNT_TYPES, ACCOUNT_W = ["checking", "savings", "credit_card"], [55, 30, 15]
TXN_TYPES = ["purchase", "refund", "atm_withdrawal", "deposit", "fee", "interest"]
TXN_W = [58, 4, 9, 18, 5, 6]
DIRECTION = {"purchase": "debit", "atm_withdrawal": "debit", "fee": "debit", "refund": "credit", "deposit": "credit", "interest": "credit"}
STATUSES, STATUS_W = ["posted", "pending", "declined"], [92, 5, 3]
REFERENCES = ["Rent", "Savings top-up", "Shared dinner", "Invoice", "Holiday fund", "Car repair", "Gift", "Utilities split", "Loan repayment"]
DISPUTE_REASONS = ["fraud", "not_received", "duplicate_charge", "wrong_amount", "cancelled_subscription"]
DISPUTE_STATUS, DISPUTE_W = ["open", "won", "lost", "withdrawn"], [30, 40, 20, 10]
BAD_CURRENCIES = ["ZZZ", "US$", None]
CENT = Decimal("0.01")


def money(x: float) -> Decimal:
    return Decimal(str(round(x, 2))).quantize(CENT, rounding=ROUND_HALF_UP)


def at(rng: random.Random, start: date, days: int) -> datetime:
    d = start + timedelta(days=rng.randint(0, days - 1))
    return datetime(d.year, d.month, d.day, rng.randint(6, 22), rng.randint(0, 59), rng.randint(0, 59))


def txn_amount(rng: random.Random, kind: str) -> Decimal:
    if kind == "purchase":
        return money(min(rng.lognormvariate(3.3, 0.9), 900))
    if kind == "refund":
        return money(rng.uniform(5, 120))
    if kind == "atm_withdrawal":
        return money(20 * rng.randint(1, 15))
    if kind == "deposit":
        return money(rng.choice([250, 500, 800, 1200, 1850, 2400, 3100]) + rng.choice([0, 0, 0, 37.5, 112.25]))
    if kind == "fee":
        return money(rng.choice([2.5, 5.0, 12.0, 35.0]))
    return money(rng.uniform(0.15, 24))


def channel_for(rng: random.Random, kind: str) -> str:
    if kind in ("purchase", "refund"):
        return rng.choices(["card_present", "online", "mobile"], [50, 35, 15])[0]
    if kind == "atm_withdrawal":
        return "atm"
    if kind == "deposit":
        return rng.choices(["branch", "mobile", "atm"], [40, 45, 15])[0]
    return "system"


def build(rng: random.Random, cfg: dict) -> dict:
    start, days = cfg["start"], cfg["days"]

    customers = []
    for i in range(1, cfg["customers"] + 1):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        city, country, _ = rng.choice(PLACES[: cfg.get("places", len(PLACES))])
        customers.append({
            "customer_id": f"C{i:04d}",
            "full_name": f"{first} {last}",
            "email": f"{first.lower()}.{last.lower()}{i}@mail.example",
            "city": city,
            "country": country,
            "segment": rng.choices(SEGMENTS, SEGMENT_W)[0],
            "kyc_status": rng.choices(KYC, KYC_W)[0] if cfg["messy"] else "verified",
            "joined_date": date(2025, 1, 1) + timedelta(days=rng.randint(0, 170)),
        })

    accounts = []
    for c in customers:
        currency = next(cur for city, _, cur in PLACES if city == c["city"])
        for _ in range(rng.choices([1, 2, 3], [55, 35, 10])[0]):
            kind = rng.choices(ACCOUNT_TYPES, ACCOUNT_W)[0]
            accounts.append({
                "account_id": f"A{len(accounts) + 1:05d}",
                "customer_id": c["customer_id"],
                "account_type": kind,
                "currency": currency,
                "status": rng.choices(["active", "frozen", "closed"], [90, 3, 7])[0],
                "opened_date": c["joined_date"] + timedelta(days=rng.randint(0, 120)),
                "overdraft_limit": money(rng.choice([0, 0, 250, 500, 1000])) if kind == "checking" else None,
            })
    # Accounts that never move: chosen by index, sorted, so the choice doesn't depend on set order.
    idle = set(sorted(rng.sample(range(len(accounts)), cfg["idle_accounts"])))
    active = [a for i, a in enumerate(accounts) if i not in idle and a["status"] == "active"]

    merchants = []
    for i, (name, mcc, category) in enumerate(MERCHANTS[: cfg["merchants"]], start=1):
        merchants.append({"merchant_id": f"M{i:03d}", "merchant_name": name, "mcc_code": mcc, "category": category, "country": rng.choice(["US", "GB", "FR", "PT"])})
    i = len(merchants)
    while len(merchants) < cfg["merchants"]:
        i += 1
        name, mcc, category = MERCHANTS[i % len(MERCHANTS)]
        word = MERCHANT_WORDS[(i // len(MERCHANTS)) % len(MERCHANT_WORDS)]
        merchants.append({"merchant_id": f"M{i:03d}", "merchant_name": f"{word} {name.split()[-1]}", "mcc_code": mcc, "category": category, "country": rng.choice(["US", "GB", "FR", "PT"])})

    # Transactions: a few heavy accounts and many light ones, then numbered in time order.
    weights = [1 if cfg.get("even") else rng.choice([1, 1, 2, 3, 6]) for _ in active]
    txns = []
    for _ in range(cfg["transactions"]):
        a = rng.choices(active, weights)[0]
        kind = rng.choices(TXN_TYPES, TXN_W)[0]
        if kind == "interest" and a["account_type"] == "credit_card":
            kind = "fee"
        txns.append({
            "account_id": a["account_id"],
            "merchant_id": rng.choice(merchants)["merchant_id"] if kind in ("purchase", "refund") else None,
            "posted_at": at(rng, start, days),
            "txn_type": kind,
            "channel": channel_for(rng, kind),
            "direction": DIRECTION[kind],
            "amount": txn_amount(rng, kind),
            "currency": a["currency"],
            "status": rng.choices(STATUSES, STATUS_W)[0],
        })
    for k in range(cfg["orphans"]):
        t = dict(rng.choice(txns))
        t["account_id"] = f"A9{rng.randint(1000, 9999):04d}" if k else "A99999"
        t["posted_at"] = at(rng, start, days)
        txns.append(t)
    for _ in range(cfg["null_accounts"]):
        t = dict(rng.choice(txns))
        t["account_id"] = None
        t["posted_at"] = at(rng, start, days)
        txns.append(t)
    txns.sort(key=lambda t: (t["posted_at"], t["account_id"] or "", t["amount"]))
    for n, t in enumerate(txns, start=1):
        t["transaction_id"] = f"T{n:06d}"

    disputes = []
    purchases = [t for t in txns if t["txn_type"] == "purchase" and t["status"] == "posted" and t["account_id"] and not t["account_id"].startswith("A9")]
    for n, t in enumerate(sorted(rng.sample(purchases, min(cfg["disputes"], len(purchases))), key=lambda t: t["transaction_id"]), start=1):
        opened = t["posted_at"].date() + timedelta(days=rng.randint(2, 40))
        status = rng.choices(DISPUTE_STATUS, DISPUTE_W)[0]
        disputes.append({
            "dispute_id": f"D{n:04d}",
            "transaction_id": t["transaction_id"],
            "opened_date": opened,
            "reason": rng.choice(DISPUTE_REASONS),
            "disputed_amount": t["amount"] if rng.random() < 0.8 else money(float(t["amount"]) * rng.choice([0.25, 0.5])),
            "status": status,
            "resolved_date": None if status == "open" else opened + timedelta(days=rng.randint(3, 45)),
        })

    # Transfers between two active accounts in the same currency.
    by_currency: dict[str, list[dict]] = {}
    for a in active:
        by_currency.setdefault(a["currency"], []).append(a)
    pool = [a for a in active if len(by_currency[a["currency"]]) > 1]
    transfers = []
    statuses = cfg.get("transfer_statuses")
    for n in range(cfg["transfers"]):
        src = rng.choice(pool)
        dst = rng.choice([a for a in by_currency[src["currency"]] if a is not src])
        status = statuses[n] if statuses else rng.choices(["completed", "pending", "failed", "reversed"], [88, 4, 4, 4])[0]
        transfers.append({
            "from_account_id": src["account_id"],
            "to_account_id": dst["account_id"],
            "amount": money(rng.choice([25, 40, 75, 120, 250, 400, 650, 900, 1500]) + rng.choice([0, 0, 0.5, 12.99])),
            "currency": src["currency"],
            "requested_at": at(rng, start, days - 5),
            "status": status,
            "reference": f"{rng.choice(REFERENCES)} {rng.randint(100, 999)}",
            "reversal_of": None,
        })
    for t in list(transfers):
        if t["status"] == "reversed":
            transfers.append({
                "from_account_id": t["to_account_id"],
                "to_account_id": t["from_account_id"],
                "amount": t["amount"],
                "currency": t["currency"],
                "requested_at": t["requested_at"] + timedelta(days=rng.randint(1, 3), hours=rng.randint(0, 6)),
                "status": "completed",
                "reference": f"Reversal: {t['reference']}",
                "reversal_of": t,
            })
    for t in rng.sample([t for t in transfers if t["status"] == "completed" and t["reversal_of"] is None], cfg["duplicate_transfers"]):
        dup = dict(t)
        dup["requested_at"] = t["requested_at"] + timedelta(seconds=rng.randint(2, 40))
        transfers.append(dup)
    transfers.sort(key=lambda t: (t["requested_at"], t["from_account_id"], t["amount"]))
    for n, t in enumerate(transfers, start=1):
        t["transfer_id"] = f"TR{n:05d}"
    for t in transfers:
        if t["reversal_of"] is not None:
            t["reversal_of"] = t["reversal_of"]["transfer_id"]

    entries = []
    for t in transfers:
        if t["status"] not in ("completed", "reversed"):
            continue
        booked = t["requested_at"] + timedelta(minutes=rng.randint(1, 90))
        for side, acct in (("debit", t["from_account_id"]), ("credit", t["to_account_id"])):
            entries.append({"transfer_id": t["transfer_id"], "account_id": acct, "entry_type": side, "amount": t["amount"], "currency": t["currency"], "booked_at": booked})

    if cfg["unbalanced"]:
        completed = [t["transfer_id"] for t in transfers if t["status"] == "completed"]
        missing_credit = set(rng.sample(completed, 8))
        entries = [e for e in entries if not (e["transfer_id"] in missing_credit and e["entry_type"] == "credit")]
        credits = [e for e in entries if e["entry_type"] == "credit"]
        for e in rng.sample(credits, 4):
            e["amount"] = e["amount"] - money(rng.choice([0.01, 0.05, 0.10, 0.99]))
        for k in range(6):
            a = rng.choice(active)
            entries.append({
                "transfer_id": f"TR9{k:04d}",
                "account_id": a["account_id"],
                "entry_type": rng.choice(["debit", "credit"]),
                "amount": money(rng.choice([19.99, 60, 125, 480])),
                "currency": a["currency"],
                "booked_at": at(rng, start, days),
            })
    entries.sort(key=lambda e: (e["booked_at"], e["transfer_id"], e["entry_type"] == "credit"))
    for n, e in enumerate(entries, start=1):
        e["entry_id"] = f"LE{n:06d}"

    return {
        "customers": customers,
        "accounts": accounts,
        "merchants": merchants,
        "transactions": txns,
        "transfers": transfers,
        "ledger_entries": entries,
        "disputes": disputes,
    }


def add_invalid(rng: random.Random, txns: list[dict], negatives: int, bad_currency: int, duplicates: int) -> None:
    """Damage a few real transactions the way a raw feed does, then repeat some rows exactly."""
    picks = rng.sample(range(len(txns)), negatives + bad_currency)
    for k, i in enumerate(picks):
        if k < negatives:
            txns[i]["amount"] = -txns[i]["amount"]
        else:
            txns[i]["currency"] = BAD_CURRENCIES[k % len(BAD_CURRENCIES)]
    for i in sorted(rng.sample(range(len(txns)), duplicates), reverse=True):
        txns.insert(i + 1, dict(txns[i]))


LESSON = {
    "start": date(2026, 1, 5), "days": 60, "customers": 5, "places": 3, "even": True, "merchants": 6, "idle_accounts": 2, "transactions": 12,
    "orphans": 1, "null_accounts": 1, "disputes": 4, "transfers": 5, "duplicate_transfers": 0, "unbalanced": False, "messy": False,
    "transfer_statuses": ["completed", "completed", "reversed", "failed", "completed"],
}
PRACTICE = {
    "start": date(2025, 7, 1), "days": 365, "customers": 220, "merchants": 40, "idle_accounts": 30, "transactions": 2400,
    "orphans": 8, "null_accounts": 4, "disputes": 35, "transfers": 520, "duplicate_transfers": 0, "unbalanced": False, "messy": True,
}
PROJECT = {
    "start": date(2025, 7, 1), "days": 365, "customers": 320, "merchants": 50, "idle_accounts": 40, "transactions": 4600,
    "orphans": 14, "null_accounts": 8, "disputes": 60, "transfers": 1400, "duplicate_transfers": 15, "unbalanced": True, "messy": True,
}


def main() -> dict:
    lesson = build(random.Random(SEED), LESSON)
    practice = build(random.Random(SEED + 1), PRACTICE)
    project = build(random.Random(SEED + 2), PROJECT)
    add_invalid(random.Random(SEED + 3), practice["transactions"], negatives=4, bad_currency=4, duplicates=5)
    add_invalid(random.Random(SEED + 4), project["transactions"], negatives=12, bad_currency=12, duplicates=15)
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Banking & Payments",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions={"lesson": lesson, "practice": practice, "project": project},
        generated_by="services/spark-runner/datasets/d02_banking.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
