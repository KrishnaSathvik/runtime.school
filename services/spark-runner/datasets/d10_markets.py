"""PS-D10 Financial Markets: Runtime's own deterministic synthetic stock market (invented companies, symbols and prices).

    python3 services/spark-runner/datasets/d10_markets.py

Writes fixtures/PS-D10/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.
Every symbol ends in ".SX", the invented Sandbox Exchange, so none can be mistaken for a real listing.

Editions: `lesson` is hand-checked and readable whole (one holiday, a weekend, one missing day and a 2-for-1 split
inside the week); `practice` is a year of daily prices for ten securities with splits, dividends, a trading halt and a
few missing days. There is no project edition: practice is the main use.
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

DATASET_ID = "PS-D10"
VERSION = "1.0.0"
SEED = 2010

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "securities": "symbol STRING, company_name STRING, sector STRING, exchange STRING, currency STRING, listed_date DATE, shares_outstanding BIGINT",
    "daily_prices": "symbol STRING, trade_date DATE, open DECIMAL(10,2), high DECIMAL(10,2), low DECIMAL(10,2), close DECIMAL(10,2), volume BIGINT",
    "trades": "trade_id STRING, account_id STRING, symbol STRING, executed_at TIMESTAMP, side STRING, quantity INT, price DECIMAL(10,2), fee DECIMAL(8,2)",
    "corporate_actions": "action_id STRING, symbol STRING, action_type STRING, announced_date DATE, ex_date DATE, split_ratio DOUBLE, dividend_per_share DECIMAL(8,4)",
    "market_calendar": "cal_date DATE, day_of_week STRING, is_trading_day BOOLEAN, holiday_name STRING",
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "securities": "One row per listed security: its company, sector, listing date and shares outstanding.",
    "daily_prices": "One row per security per trading day it traded: open, high, low, close and volume.",
    "trades": "One row per executed trade by a client account: buy or sell, how many shares, at what price and fee.",
    "corporate_actions": "One row per split or dividend: when it was announced and the ex-date it takes effect.",
    "market_calendar": "One row per calendar day: whether the exchange was open and, if closed on a weekday, which holiday.",
}
KEYS = {
    "primary": {"securities": ["symbol"], "daily_prices": ["symbol", "trade_date"], "trades": ["trade_id"], "corporate_actions": ["action_id"], "market_calendar": ["cal_date"]},
    "foreign": {
        "daily_prices.symbol": "securities.symbol",
        "daily_prices.trade_date": "market_calendar.cal_date",
        "trades.symbol": "securities.symbol",
        "corporate_actions.symbol": "securities.symbol",
    },
}
RULES = [
    "All companies, symbols and prices are invented; symbols end in .SX (the made-up Sandbox Exchange). Prices are in USD.",
    "market_calendar has every calendar day of the period; weekends and exchange holidays have is_trading_day false, and holiday_name is set only for weekday holidays.",
    "daily_prices has rows only for trading days, so lag() over trade_date per symbol steps over weekends and holidays; the previous row is the previous trading day.",
    "A few trading days are missing for some symbols (a data gap, not a closed market): BRVO.SX on 2026-01-20 in the lesson edition; in practice eight isolated days plus a three-day trading halt for KORA.SX (2026-02-10 to 2026-02-12). Compare with market_calendar to find them.",
    "Prices are not adjusted for splits: on a split's ex_date the price drops by the split ratio (ALDR.SX 2-for-1 on 2026-01-21 in the lesson edition; ALDR.SX 2-for-1 and NIMB.SX 3-for-1 in practice). Divide earlier prices by split_ratio (and multiply volume) to compare across the split.",
    "corporate_actions: split_ratio is set for splits (2.0 means 2-for-1) and dividend_per_share for dividends; the other is null.",
    "low <= open, close <= high on every row; volume is shares traded that day.",
    "A security listed during the period has no prices before its listed_date (DUNE.SX lists on 2026-02-02, so it has no prices in the lesson week; in practice LUMA.SX starts in November 2025 and DUNE.SX in February 2026).",
    "trades happen only on trading days the symbol has a price, between 14:30 and 21:00 UTC, at a price between that day's low and high; fee is 0.05% of quantity × price with a 1.00 minimum, rounded half up to cents.",
    "The lesson and practice editions have no other deliberate problems; there is no project edition.",
]

CENT = Decimal("0.01")
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
HOLIDAYS = {
    date(2025, 7, 4): "Independence Day", date(2025, 9, 1): "Labor Day", date(2025, 11, 27): "Thanksgiving Day",
    date(2025, 12, 25): "Christmas Day", date(2026, 1, 1): "New Year's Day", date(2026, 1, 19): "Martin Luther King Jr. Day",
    date(2026, 2, 16): "Presidents' Day", date(2026, 4, 3): "Good Friday", date(2026, 5, 25): "Memorial Day", date(2026, 6, 19): "Juneteenth",
}
# symbol, company, sector, listed, shares, start price, yearly drift, daily volatility, base volume
SECURITIES = [
    ("ALDR.SX", "Alder Robotics", "Industrials", date(2014, 5, 12), 182_000_000, 188.0, 0.18, 0.019, 2_400_000),
    ("BRVO.SX", "Bravo Foods Group", "Consumer Staples", date(2009, 3, 2), 410_000_000, 54.0, 0.04, 0.010, 3_100_000),
    ("CYPH.SX", "Cypher Grid Software", "Technology", date(2017, 9, 18), 96_000_000, 121.0, 0.25, 0.024, 1_600_000),
    ("DUNE.SX", "Dunehaven Energy", "Energy", date(2026, 2, 2), 75_000_000, 18.0, 0.0, 0.03, 900_000),
    ("ECHO.SX", "Echo Lane Media", "Communication", date(2012, 6, 4), 230_000_000, 32.5, -0.08, 0.021, 2_000_000),
    ("FERN.SX", "Fernway Outdoor", "Consumer Discretionary", date(2015, 10, 26), 64_000_000, 76.0, 0.10, 0.017, 700_000),
    ("KORA.SX", "Kora Biotherapeutics", "Health Care", date(2019, 4, 8), 120_000_000, 41.0, 0.05, 0.034, 1_900_000),
    ("LUMA.SX", "Luma Payments", "Financials", date(2025, 11, 3), 150_000_000, 26.0, 0.30, 0.028, 4_200_000),
    ("NIMB.SX", "Nimbus Freight", "Industrials", date(2011, 1, 18), 88_000_000, 285.0, 0.12, 0.015, 600_000),
    ("ORCA.SX", "Orca Water Utilities", "Utilities", date(2006, 8, 14), 300_000_000, 63.0, 0.03, 0.008, 1_200_000),
    ("PIKE.SX", "Pike Street Bank", "Financials", date(2008, 2, 25), 510_000_000, 47.0, 0.07, 0.013, 3_600_000),
]


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(CENT, rounding=ROUND_HALF_UP)


def calendar(first: date, last: date) -> list[dict]:
    rows, d = [], first
    while d <= last:
        weekday = d.weekday() < 5
        rows.append({"cal_date": d, "day_of_week": DAYS[d.weekday()], "is_trading_day": weekday and d not in HOLIDAYS, "holiday_name": HOLIDAYS.get(d) if weekday else None})
        d += timedelta(days=1)
    return rows


def securities(symbols: list[str]) -> list[dict]:
    return [{"symbol": s, "company_name": c, "sector": sec, "exchange": "SBX", "currency": "USD", "listed_date": ld, "shares_outstanding": sh}
            for s, c, sec, ld, sh, *_ in SECURITIES if s in symbols]


def fee(qty: int, px: Decimal) -> Decimal:
    return max(Decimal("1.00"), (qty * px * Decimal("0.0005")).quantize(CENT, rounding=ROUND_HALF_UP))


def simulate(rng: random.Random, symbols: list[str], days: list[date], splits: dict, missing: set) -> list[dict]:
    """Daily OHLCV per symbol from a random walk. `splits` maps (symbol, ex_date) -> ratio; `missing` drops rows."""
    rows = []
    for s, _c, _sec, listed, _sh, px, drift, vol, base_vol in SECURITIES:
        if s not in symbols:
            continue
        close = px
        for d in days:
            if d < listed:
                continue
            ratio = splits.get((s, d), 1.0)
            prev = close / ratio
            open_ = prev * math.exp(rng.gauss(0, vol * 0.35))
            close = open_ * math.exp(drift / 252 + rng.gauss(0, vol * 0.9))
            high = max(open_, close) * (1 + abs(rng.gauss(0, vol * 0.5)))
            low = min(open_, close) * (1 - abs(rng.gauss(0, vol * 0.5)))
            volume = int(base_vol * ratio * math.exp(rng.gauss(0, 0.35)) * (2.2 if ratio > 1 else 1.0) / 100) * 100
            if ratio > 1:
                base_vol = int(base_vol * ratio)
            if (s, d) in missing:
                continue
            o, h, lo, c = money(open_), money(high), money(low), money(close)
            rows.append({"symbol": s, "trade_date": d, "open": o, "high": max(h, o, c), "low": min(lo, o, c), "close": c, "volume": volume})
    rows.sort(key=lambda r: (r["trade_date"], r["symbol"]))
    return rows


def make_trades(rng: random.Random, prices: list[dict], n: int, accounts: int) -> list[dict]:
    out = []
    for _ in range(n):
        p = rng.choice(prices)
        at = datetime.combine(p["trade_date"], datetime.min.time()) + timedelta(hours=14, minutes=30, seconds=rng.randint(0, 6 * 3600 + 1800 - 1))
        px = money(rng.uniform(float(p["low"]), float(p["high"])))
        px = min(max(px, p["low"]), p["high"])
        qty = rng.choice([1, 5, 10, 10, 20, 25, 50, 50, 100, 100, 100, 200, 250, 500, 1000])
        out.append({"account_id": f"ACC-{rng.randint(1, accounts):04d}", "symbol": p["symbol"], "executed_at": at,
                    "side": rng.choices(["buy", "sell"], [55, 45])[0], "quantity": qty, "price": px, "fee": fee(qty, px)})
    out.sort(key=lambda t: (t["executed_at"], t["account_id"], t["symbol"]))
    return [{"trade_id": f"TR-{i:06d}", **t} for i, t in enumerate(out, 1)]


def lesson() -> dict:
    rng = random.Random(SEED)
    cal = calendar(date(2026, 1, 15), date(2026, 1, 22))
    days = [c["cal_date"] for c in cal if c["is_trading_day"]]
    symbols = ["ALDR.SX", "BRVO.SX", "CYPH.SX", "DUNE.SX"]
    prices = simulate(rng, symbols, days, splits={("ALDR.SX", date(2026, 1, 21)): 2.0}, missing={("BRVO.SX", date(2026, 1, 20))})
    trades = make_trades(rng, prices, 10, accounts=4)
    actions = [
        {"action_id": "CA-001", "symbol": "ALDR.SX", "action_type": "dividend", "announced_date": date(2025, 11, 20), "ex_date": date(2025, 12, 11), "split_ratio": None, "dividend_per_share": Decimal("0.4500")},
        {"action_id": "CA-002", "symbol": "BRVO.SX", "action_type": "dividend", "announced_date": date(2025, 12, 18), "ex_date": date(2026, 1, 16), "split_ratio": None, "dividend_per_share": Decimal("0.3800")},
        {"action_id": "CA-003", "symbol": "ALDR.SX", "action_type": "split", "announced_date": date(2025, 12, 9), "ex_date": date(2026, 1, 21), "split_ratio": 2.0, "dividend_per_share": None},
        {"action_id": "CA-004", "symbol": "CYPH.SX", "action_type": "dividend", "announced_date": date(2026, 1, 2), "ex_date": date(2026, 1, 22), "split_ratio": None, "dividend_per_share": Decimal("0.1250")},
    ]
    return {"securities": securities(symbols), "daily_prices": prices, "trades": trades, "corporate_actions": actions, "market_calendar": cal}


def build(rng: random.Random, first: date, last: date, n_trades: int):
    cal = calendar(first, last)
    days = [c["cal_date"] for c in cal if c["is_trading_day"]]
    symbols = [s[0] for s in SECURITIES]
    splits = {("ALDR.SX", date(2025, 10, 15)): 2.0, ("NIMB.SX", date(2026, 3, 9)): 3.0}
    missing = {("KORA.SX", date(2026, 2, d)) for d in (10, 11, 12)}  # trading halt
    candidates = sorted((s, d) for s in symbols for d in days if s not in ("LUMA.SX", "DUNE.SX") and (s, d) not in splits and (s, d) not in missing)
    gaps = rng.sample(candidates, 8)
    missing |= set(gaps)
    prices = simulate(rng, symbols, days, splits, missing)
    actions = []
    for s, d in sorted(splits):
        actions.append({"symbol": s, "action_type": "split", "announced_date": d - timedelta(days=rng.randint(21, 45)), "ex_date": d, "split_ratio": splits[(s, d)], "dividend_per_share": None})
    payers = {"BRVO.SX": "0.3800", "ORCA.SX": "0.5600", "PIKE.SX": "0.4100", "ALDR.SX": "0.2250", "FERN.SX": "0.3000"}
    for s in sorted(payers):
        for month in (8, 11, 2, 5):
            year = 2025 if month >= 7 else 2026
            ex = date(year, month, 10)
            while ex not in days:
                ex += timedelta(days=1)
            actions.append({"symbol": s, "action_type": "dividend", "announced_date": ex - timedelta(days=rng.randint(14, 30)), "ex_date": ex, "split_ratio": None, "dividend_per_share": Decimal(payers[s])})
    actions.sort(key=lambda a: (a["ex_date"], a["symbol"]))
    actions = [{"action_id": f"CA-{i:03d}", **a} for i, a in enumerate(actions, 1)]
    trades = make_trades(rng, prices, n_trades, accounts=60)
    return {"securities": securities(symbols), "daily_prices": prices, "trades": trades, "corporate_actions": actions, "market_calendar": cal}, sorted(gaps)


def main() -> dict:
    practice, gaps = build(random.Random(SEED + 1), first=date(2025, 7, 1), last=date(2026, 6, 30), n_trades=1500)
    editions = {"lesson": lesson(), "practice": practice}
    rules = list(RULES)
    rules[3] = rules[3].replace("eight isolated days", "eight isolated days (" + ", ".join(f"{s} {d.isoformat()}" for s, d in gaps) + ")")
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Financial Markets",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=rules,
        editions=editions,
        generated_by="services/spark-runner/datasets/d10_markets.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
