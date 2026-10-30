"""PS-D06 E-commerce Clickstream: Runtime's own deterministic synthetic shop events, delivered in micro-batches.

    python3 services/spark-runner/datasets/d06_clickstream.py

Writes fixtures/PS-D06/<version>/<edition>/<table>.<jsonl|csv> and manifest.json. The same seed always produces the
same bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

The four event tables are JSON Lines with nested data (device and context structs, item arrays, filter arrays, a map of
checkout attributes). Every event carries when it happened (event_time), when the pipeline received it (arrival_time)
and which of five micro-batches delivered it (batch), so the same files feed the nested-JSON, higher-order-function and
streaming lessons. Campaign ids (CMP-0001 … CMP-0040) are the same ids the Advertising dataset (PS-D12) uses.

Editions: `lesson` is hand-written and readable whole (two late events); `practice` is one shop day with a few late
events; `project` is what P09 cleans: more and later late events, duplicate deliveries and sessions with no page view.
Project P09 joins the project edition to PS-D12's project edition: its day (2026-03-05) is inside PS-D12's week, its
signed-in users are PS-D12 user ids, every campaign session uses a PS-D12 campaign running that day, and d12_ads.py
writes the ad click that landed each campaign session (docs/pyspark/dataset-contracts.md §2).
"""

from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D06"
VERSION = "1.1.0"
SEED = 2006

EVENT = "event_id STRING, session_id STRING, user_id STRING, event_time TIMESTAMP, arrival_time TIMESTAMP, batch INT"
ITEMS = "ARRAY<STRUCT<sku: STRING, qty: INT, price: DOUBLE>>"
# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "page_views": EVENT + ", page STRING, page_type STRING, device STRUCT<type: STRING, os: STRING>, "
                  "context STRUCT<referrer: STRING, utm: STRUCT<source: STRING, campaign: STRING>>, time_on_page_s INT",
    "searches": EVENT + ", query STRING, filters ARRAY<STRING>, result_skus ARRAY<STRING>, results_count INT",
    "cart_events": EVENT + f", action STRING, items {ITEMS}",
    "checkout_events": EVENT + f", step STRING, order_id STRING, payment STRUCT<method: STRING, provider: STRING>, items {ITEMS}, "
                       "order_total DOUBLE, attributes MAP<STRING,STRING>",
    "sessions": "session_id STRING, user_id STRING, started_at TIMESTAMP, ended_at TIMESTAMP, device_type STRING, os STRING, "
                "country STRING, landing_page STRING, traffic_source STRING, campaign_id STRING",
}
FORMATS = {"page_views": "jsonl", "searches": "jsonl", "cart_events": "jsonl", "checkout_events": "jsonl"}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "page_views": "One row per page a visitor opened, with the device and the referrer and campaign that brought them.",
    "searches": "One row per search: the words typed, the filters ticked and the products it returned.",
    "cart_events": "One row per change to a basket: items added, removed or given a new quantity.",
    "checkout_events": "One row per checkout step reached (begin, payment, complete), with the basket and, when complete, the order.",
    "sessions": "One row per visit: who (if signed in), on what device, how they arrived and when the visit started and ended.",
}
KEYS = {
    "primary": {"page_views": ["event_id"], "searches": ["event_id"], "cart_events": ["event_id"], "checkout_events": ["event_id"], "sessions": ["session_id"]},
    "foreign": {
        "page_views.session_id": "sessions.session_id",
        "searches.session_id": "sessions.session_id",
        "cart_events.session_id": "sessions.session_id",
        "checkout_events.session_id": "sessions.session_id",
    },
}
RULES = [
    "event_time is when the event happened in the browser; arrival_time is when the pipeline received it; arrival_time is never earlier than event_time. All times are UTC.",
    "batch (1 to 5) is the micro-batch that delivered the event, chosen by arrival_time: the edition's window is cut into five equal slots (10 minutes each in lesson, 2 hours each in practice and project), starting 10:00 on 2026-03-14 (lesson), 08:00 on 2026-03-14 (practice) and 08:00 on 2026-03-05 (project).",
    "Most events arrive within 20 seconds. Late events arrive much later, so they land in a later batch than their event_time suggests: 2 in the lesson edition (PV-0003 and CA-0002, about 20 minutes late), about 4% in practice (15 to 90 minutes late) and about 8% in project (some more than 3 hours late, beyond a 2-hour watermark).",
    "user_id is null for anonymous visitors (about a third of sessions); every event of a session has the session's user_id.",
    "context.utm is null when the visit didn't come from a campaign; utm.campaign uses the Advertising dataset's ids CMP-0001 to CMP-0040, and sessions.campaign_id repeats it.",
    "context.referrer on a session's first page is the outside site (null for direct visits); on later pages it is the previous page.",
    "time_on_page_s is null on the last page of a visit (nothing followed it to time it).",
    "filters is an empty array when no filter was ticked; result_skus is an empty array (and results_count 0) when a search found nothing.",
    "cart_events.items lists the items this event changed: for add the quantity added, for remove the quantity removed, for update the new quantity.",
    "checkout_events.items is the basket at that step; order_total is the sum of qty × price over it, rounded to cents; order_id and payment are set only from the step where they exist (payment from 'payment', order_id on 'complete').",
    "attributes is a map of optional checkout flags such as coupon and gift_wrap; it is an empty map when none apply.",
    "The project edition delivers some events twice (about 3% of each event table): the copy has the same event_id and the same payload but a later arrival_time and often a later batch; keep one per event_id.",
    "The project edition has sessions with no page view (about 3% of sessions): their searches, cart or checkout events exist but the page views were lost upstream.",
    "Lesson and practice have one row per event_id and every session has at least one page view.",
    "Project edition and PS-D12 (P09): signed-in user_ids are PS-D12 user ids (U00001 to U00480). Every campaign_id is a PS-D12 campaign running on 2026-03-05, and traffic_source follows its channel: search → search_ads, social → social, display → display, video → video, email → email (affiliate and organic visits carry no campaign). Lesson and practice ids and days are not PS-D12's and don't join to it.",
    "Project edition and PS-D12 (P09): every campaign session was started by one PS-D12 click on its campaign 5 to 90 seconds before started_at (for signed-in sessions, by the same user_id). A click and a session match when user_id and campaign_id are equal and started_at is at most 30 minutes after the click; an order (checkout step complete) is attributed to that click when it happens within the campaign's attribution_window_days of the click.",
]

DAY = datetime(2026, 3, 14)
CATEGORIES = ["shoes", "jackets", "bags", "tents", "lamps", "bottles"]
WORDS = {"shoes": ["trail runner", "hiking boot", "sandal"], "jackets": ["rain jacket", "down vest", "fleece"],
         "bags": ["daypack", "duffel", "sling bag"], "tents": ["2 person tent", "tarp", "bivy"],
         "lamps": ["headlamp", "camp lantern"], "bottles": ["water bottle", "flask", "filter bottle"]}
FILTERS = ["color:black", "color:green", "color:blue", "size:M", "size:L", "price:<50", "price:50-100", "brand:northpeak",
           "brand:fernway", "in_stock", "rating:4+"]
DEVICES = [("mobile", "iOS"), ("mobile", "Android"), ("desktop", "Windows"), ("desktop", "macOS"), ("tablet", "iPadOS"), ("tablet", "Android")]
DEVICE_WEIGHTS = [26, 22, 20, 16, 9, 7]
COUNTRIES = ["US", "GB", "DE", "CA", "AU", "NL"]
SOURCES = {"social": "social.example", "email": "mail.example", "search_ads": "search.example", "display": "news.example", "affiliate": "deals.example"}
ORGANIC = [("organic", "search.example"), ("referral", "blog.example"), ("direct", None)]
# Project edition: a PS-D12 campaign's channel decides the traffic source, and the source the outside referrer.
CHANNEL_SOURCE = {"search": "search_ads", "social": "social", "display": "display", "video": "video", "email": "email"}
REFERRER = {**SOURCES, "video": "video.example"}
PROJECT_DAY = datetime(2026, 3, 5)
PAYMENTS = [("card", "paycore"), ("card", "stripeline"), ("wallet", "quickpay"), ("bnpl", "laterly")]
COUPONS = ["SPRING10", "WELCOME5", "FREESHIP"]


def catalogue(rng: random.Random, n: int) -> list[dict]:
    out = []
    for i in range(n):
        c = CATEGORIES[i % len(CATEGORIES)]
        out.append({"sku": f"SKU-{1001 + i}", "category": c, "price": round(rng.choice([12, 18, 24, 35, 49, 65, 89, 120, 159, 210]) - rng.choice([0, 0.01, 0.05, 0.51]), 2)})
    return out


def campaign(rng: random.Random) -> str:
    return f"CMP-{rng.choices(range(1, 41), [1 / k ** 0.7 for k in range(1, 41)])[0]:04d}"


def batch_of(arrival: datetime, start: datetime, slot: timedelta) -> int:
    return min(5, 1 + int((arrival - start) / slot))


# ---------------------------------------------------------------------------------------------------- lesson (hand-written)

def lesson() -> dict:
    start, slot = DAY.replace(hour=10), timedelta(minutes=10)

    def t(m, s=0):
        return DAY.replace(hour=10, minute=m, second=s)

    sessions = [
        ("SES-0001", "CU-001", t(1, 5), t(9, 40), "mobile", "iOS", "US", "/", "social", "CMP-0007"),
        ("SES-0002", None, t(4, 12), t(5, 22), "desktop", "Windows", "GB", "/c/tents", "organic", None),
        ("SES-0003", "CU-002", t(12, 0), t(19, 55), "desktop", "macOS", "DE", "/c/jackets", "email", "CMP-0012"),
        ("SES-0004", "CU-003", t(23, 30), t(25, 40), "tablet", "Android", "CA", "/", "direct", None),
        ("SES-0005", None, t(38, 0), t(41, 50), "mobile", "Android", "US", "/p/SKU-1007", "social", "CMP-0007"),
    ]
    cols = ["session_id", "user_id", "started_at", "ended_at", "device_type", "os", "country", "landing_page", "traffic_source", "campaign_id"]
    sess = [dict(zip(cols, s)) for s in sessions]
    by = {s["session_id"]: s for s in sess}

    def base(eid, sid, when, delay_s):
        s = by[sid]
        arrival = when + timedelta(seconds=delay_s)
        return {"event_id": eid, "session_id": sid, "user_id": s["user_id"], "event_time": when, "arrival_time": arrival, "batch": batch_of(arrival, start, slot)}

    def ctx(sid, referrer):
        s = by[sid]
        utm = {"source": s["traffic_source"], "campaign": s["campaign_id"]} if s["campaign_id"] else None
        return {"referrer": referrer, "utm": utm}

    pv = [
        ("PV-0001", "SES-0001", t(1, 5), 3, "/", "home", "social.example", 40),
        ("PV-0002", "SES-0001", t(1, 45), 2, "/c/shoes", "category", "/", 95),
        ("PV-0003", "SES-0001", t(3, 20), 1230, "/p/SKU-1001", "product", "/c/shoes", 140),  # late: arrives 10:23:50, batch 3
        ("PV-0004", "SES-0002", t(4, 12), 4, "/c/tents", "category", "search.example", 70),
        ("PV-0005", "SES-0002", t(5, 22), 2, "/p/SKU-1004", "product", "/c/tents", None),
        ("PV-0006", "SES-0003", t(12, 0), 5, "/c/jackets", "category", "mail.example", 50),
        ("PV-0007", "SES-0003", t(12, 50), 3, "/p/SKU-1002", "product", "/c/jackets", 120),
        ("PV-0008", "SES-0003", t(15, 30), 2, "/cart", "cart", "/p/SKU-1002", None),
        ("PV-0009", "SES-0004", t(23, 30), 6, "/", "home", None, 85),
        ("PV-0010", "SES-0004", t(24, 55), 2, "/p/SKU-1005", "product", "/", None),
        ("PV-0011", "SES-0005", t(38, 0), 4, "/p/SKU-1007", "product", "social.example", 220),
        ("PV-0012", "SES-0005", t(41, 40), 3, "/search", "search", "/p/SKU-1007", None),
    ]
    page_views = []
    for eid, sid, when, delay, page, ptype, ref, top in pv:
        s = by[sid]
        page_views.append({**base(eid, sid, when, delay), "page": page, "page_type": ptype, "device": {"type": s["device_type"], "os": s["os"]},
                           "context": ctx(sid, ref), "time_on_page_s": top})
    sr = [
        ("SR-0001", "SES-0001", t(1, 30), 2, "trail runner", ["size:M", "color:black"], ["SKU-1001", "SKU-1013", "SKU-1019"]),
        ("SR-0002", "SES-0002", t(4, 40), 3, "2 person tent", ["in_stock"], ["SKU-1004", "SKU-1010"]),
        ("SR-0003", "SES-0003", t(12, 30), 2, "rain jacket", [], ["SKU-1002", "SKU-1008", "SKU-1014", "SKU-1020"]),
        ("SR-0004", "SES-0004", t(24, 10), 4, "headlamp", ["price:<50", "brand:fernway", "rating:4+"], ["SKU-1005"]),
        ("SR-0005", "SES-0005", t(41, 50), 2, "solar kettle", [], []),
    ]
    searches = [{**base(e, s, w, d), "query": q, "filters": f, "result_skus": r, "results_count": len(r)} for e, s, w, d, q, f, r in sr]
    ca = [
        ("CA-0001", "SES-0001", t(4, 10), 2, "add", [{"sku": "SKU-1001", "qty": 1, "price": 89.0}]),
        ("CA-0002", "SES-0001", t(5, 0), 1195, "add", [{"sku": "SKU-1013", "qty": 2, "price": 11.99}]),  # late: arrives 10:24:55, batch 3
        ("CA-0003", "SES-0003", t(14, 5), 3, "add", [{"sku": "SKU-1002", "qty": 1, "price": 119.95}, {"sku": "SKU-1008", "qty": 1, "price": 34.99}]),
        ("CA-0004", "SES-0003", t(15, 10), 2, "remove", [{"sku": "SKU-1008", "qty": 1, "price": 34.99}]),
        ("CA-0005", "SES-0004", t(25, 40), 3, "add", [{"sku": "SKU-1005", "qty": 3, "price": 24.0}]),
    ]
    cart = [{**base(e, s, w, d), "action": a, "items": i} for e, s, w, d, a, i in ca]
    basket1 = [{"sku": "SKU-1001", "qty": 1, "price": 89.0}, {"sku": "SKU-1013", "qty": 2, "price": 11.99}]
    basket3 = [{"sku": "SKU-1002", "qty": 1, "price": 119.95}]
    co = [
        ("CO-0001", "SES-0001", t(6, 0), 2, "begin", None, None, basket1, {}),
        ("CO-0002", "SES-0001", t(8, 30), 3, "payment", None, {"method": "card", "provider": "paycore"}, basket1, {"coupon": "SPRING10"}),
        ("CO-0003", "SES-0001", t(9, 40), 2, "complete", "ORD-0001", {"method": "card", "provider": "paycore"}, basket1, {"coupon": "SPRING10"}),
        ("CO-0004", "SES-0003", t(19, 55), 4, "begin", None, None, basket3, {"gift_wrap": "true"}),
    ]
    checkout = [{**base(e, s, w, d), "step": st, "order_id": o, "payment": p, "items": i, "order_total": round(sum(x["qty"] * x["price"] for x in i), 2), "attributes": a}
                for e, s, w, d, st, o, p, i, a in co]
    return {"page_views": page_views, "searches": searches, "cart_events": cart, "checkout_events": checkout, "sessions": sess}


# ---------------------------------------------------------------------------------------------------- practice and project

def build(rng: random.Random, n_sessions: int, n_users: int, late_share: float, late_minutes: tuple[int, int], very_late_share: float,
          day: datetime = DAY, campaigns: list[dict] | None = None):
    """`campaigns` (project only) are PS-D12's: users become PS-D12 user ids and campaign sessions use running campaigns."""
    start, slot = day.replace(hour=8), timedelta(hours=2)
    end = start + 5 * slot - timedelta(seconds=1)
    skus = catalogue(rng, 60)
    by_cat = {c: [s for s in skus if s["category"] == c] for c in CATEGORIES}
    users = [f"U{i:05d}" if campaigns else f"CU-{i:04d}" for i in range(1, n_users + 1)]
    running = [c for c in campaigns or [] if c["start_date"] <= day.date() <= c["end_date"]]
    sessions, pvs, srs, cas, cos = [], [], [], [], []
    orders = 0

    for n in range(1, n_sessions + 1):
        sid = f"SES-{n:05d}"
        user = rng.choice(users) if rng.random() < 0.66 else None
        dtype, os_ = rng.choices(DEVICES, DEVICE_WEIGHTS)[0]
        from_ad = rng.random() < 0.45
        if from_ad and campaigns:
            c = rng.choices(running, [1 / int(c["campaign_id"][4:]) ** 0.7 for c in running])[0]
            cmp_, source = c["campaign_id"], CHANNEL_SOURCE[c["channel"]]
            outside = REFERRER[source]
        elif from_ad:
            source = rng.choices(list(SOURCES), [30, 25, 25, 10, 10])[0]
            cmp_, outside = campaign(rng), SOURCES[source]
        else:
            source, outside = rng.choices(ORGANIC, [45, 15, 40])[0]
            cmp_ = None
        utm = {"source": source, "campaign": cmp_} if cmp_ else None
        t = start + timedelta(seconds=rng.randint(0, int((5 * slot).total_seconds()) - 3600))
        first = t
        cat = rng.choice(CATEGORIES)
        landing = rng.choices(["/", f"/c/{cat}", f"/p/{rng.choice(by_cat[cat])['sku']}"], [40, 35, 25])[0]
        evs = []  # (table, row) in time order; arrival and batch are filled in later
        prev, basket = None, {}

        def ev(when):
            return {"event_id": None, "session_id": sid, "user_id": user, "event_time": when}

        page = landing
        for k in range(rng.choices([1, 2, 3, 4, 5, 6, 8], [14, 18, 20, 17, 13, 10, 8])[0]):
            ptype = "home" if page == "/" else page.split("/")[1]
            ptype = {"c": "category", "p": "product"}.get(ptype, ptype)
            evs.append(("page_views", {**ev(t), "page": page, "page_type": ptype, "device": {"type": dtype, "os": os_},
                                       "context": {"referrer": outside if prev is None else prev, "utm": utm}, "time_on_page_s": None}))
            last_pv = evs[-1][1]
            dwell = rng.randint(4, 180)
            last_pv["time_on_page_s"] = dwell
            t += timedelta(seconds=dwell)
            if rng.random() < 0.3:
                q_cat = rng.choice(CATEGORIES)
                found = rng.sample(by_cat[q_cat], rng.randint(0, 6)) if rng.random() > 0.08 else []
                filt = rng.sample(FILTERS, rng.choices([0, 1, 2, 3], [40, 30, 20, 10])[0])
                evs.append(("searches", {**ev(t), "query": rng.choice(WORDS[q_cat]), "filters": filt,
                                         "result_skus": [s["sku"] for s in found], "results_count": len(found)}))
                t += timedelta(seconds=rng.randint(3, 40))
            if ptype == "product" and rng.random() < 0.35:
                sku = next(s for s in skus if s["sku"] == page.split("/")[2])
                qty = rng.choice([1, 1, 1, 2, 3])
                basket[sku["sku"]] = basket.get(sku["sku"], 0) + qty
                evs.append(("cart_events", {**ev(t), "action": "add", "items": [{"sku": sku["sku"], "qty": qty, "price": sku["price"]}]}))
                t += timedelta(seconds=rng.randint(2, 30))
                if len(basket) > 1 and rng.random() < 0.2:
                    drop = sorted(basket)[0]
                    price = next(s["price"] for s in skus if s["sku"] == drop)
                    evs.append(("cart_events", {**ev(t), "action": "remove", "items": [{"sku": drop, "qty": basket.pop(drop), "price": price}]}))
                    t += timedelta(seconds=rng.randint(2, 30))
                elif rng.random() < 0.1:
                    key = sorted(basket)[-1]
                    basket[key] += 1
                    price = next(s["price"] for s in skus if s["sku"] == key)
                    evs.append(("cart_events", {**ev(t), "action": "update", "items": [{"sku": key, "qty": basket[key], "price": price}]}))
                    t += timedelta(seconds=rng.randint(2, 30))
            prev = page
            cat = rng.choice(CATEGORIES) if rng.random() < 0.3 else cat
            page = rng.choices([f"/c/{cat}", f"/p/{rng.choice(by_cat[cat])['sku']}", "/"], [35, 55, 10])[0]
        evs[[i for i, (tb, _) in enumerate(evs) if tb == "page_views"][-1]][1]["time_on_page_s"] = None

        if basket and rng.random() < 0.4:
            items = [{"sku": k, "qty": basket[k], "price": next(s["price"] for s in skus if s["sku"] == k)} for k in sorted(basket)]
            total = round(sum(i["qty"] * i["price"] for i in items), 2)
            attrs = {}
            if rng.random() < 0.25:
                attrs["coupon"] = rng.choice(COUPONS)
            if rng.random() < 0.1:
                attrs["gift_wrap"] = "true"
            method, provider = rng.choice(PAYMENTS)
            steps = ["begin"] + (["payment"] if rng.random() < 0.7 else [])
            if len(steps) == 2 and rng.random() < 0.85:
                steps.append("complete")
            for st in steps:
                t += timedelta(seconds=rng.randint(20, 150))
                order_id = None
                if st == "complete":
                    orders += 1
                    order_id = f"ORD-{orders:05d}"
                evs.append(("checkout_events", {**ev(t), "step": st, "order_id": order_id,
                                                "payment": None if st == "begin" else {"method": method, "provider": provider},
                                                "items": items, "order_total": total, "attributes": attrs}))
        evs = [(tb, r) for tb, r in evs if r["event_time"] <= end]
        if not evs or evs[0][0] != "page_views":
            continue
        sessions.append({"session_id": sid, "user_id": user, "started_at": first, "ended_at": evs[-1][1]["event_time"], "device_type": dtype, "os": os_,
                         "country": rng.choices(COUNTRIES, [40, 15, 12, 12, 10, 11])[0], "landing_page": landing, "traffic_source": source, "campaign_id": cmp_})
        for tb, r in evs:
            delay = timedelta(seconds=rng.randint(0, 20))
            if rng.random() < late_share:
                lo, hi = late_minutes
                if rng.random() < very_late_share:
                    lo, hi = 190, 330
                delay = timedelta(minutes=rng.randint(lo, hi), seconds=rng.randint(0, 59))
            r["arrival_time"] = min(r["event_time"] + delay, end) if r["event_time"] + delay > end else r["event_time"] + delay
            r["batch"] = batch_of(r["arrival_time"], start, slot)
            {"page_views": pvs, "searches": srs, "cart_events": cas, "checkout_events": cos}[tb].append(r)

    out = {"page_views": pvs, "searches": srs, "cart_events": cas, "checkout_events": cos}
    prefix = {"page_views": "PV", "searches": "SR", "cart_events": "CA", "checkout_events": "CO"}
    for tb, rows in out.items():
        rows.sort(key=lambda r: (r["event_time"], r["session_id"]))
        for i, r in enumerate(rows, 1):
            r["event_id"] = f"{prefix[tb]}-{i:06d}"
    # Files are in delivery order, the way a stream sink writes them.
    order = ["event_id", "session_id", "user_id", "event_time", "arrival_time", "batch"]
    for tb, rows in out.items():
        rows.sort(key=lambda r: (r["arrival_time"], r["event_id"]))
        out[tb] = [{**{k: r[k] for k in order}, **{k: v for k, v in r.items() if k not in order}} for r in rows]
    out["sessions"] = sessions
    return out


def add_problems(rng: random.Random, tables: dict, dup_share: float, no_pv_share: float, day: datetime = PROJECT_DAY) -> None:
    """P09's raw feed: sessions whose page views were lost, and events delivered twice."""
    start, slot = day.replace(hour=8), timedelta(hours=2)
    end = start + 5 * slot - timedelta(seconds=1)
    has_other = sorted({r["session_id"] for tb in ("searches", "cart_events", "checkout_events") for r in tables[tb]})
    lost = set(rng.sample(has_other, int(len(tables["sessions"]) * no_pv_share)))
    tables["page_views"] = [r for r in tables["page_views"] if r["session_id"] not in lost]
    for tb in ("page_views", "searches", "cart_events", "checkout_events"):
        rows = tables[tb]
        copies = []
        for r in rng.sample(rows, max(1, int(len(rows) * dup_share))):
            again = min(end, r["arrival_time"] + timedelta(minutes=rng.choice([0, 1, 5, 30, 90, 150]), seconds=rng.randint(1, 59)))
            copies.append({**r, "arrival_time": again, "batch": batch_of(again, start, slot)})
        rows.extend(copies)
        rows.sort(key=lambda r: (r["arrival_time"], r["event_id"]))


def project() -> dict:
    """The P09 edition, on PS-D12's campaigns and users. d12_ads.py reads its sessions and orders to write the landing clicks."""
    import d12_ads

    ed = build(random.Random(SEED + 2), n_sessions=760, n_users=480, late_share=0.08, late_minutes=(15, 150), very_late_share=0.2,
               day=PROJECT_DAY, campaigns=d12_ads.project_campaigns())
    add_problems(random.Random(SEED + 3), ed, dup_share=0.03, no_pv_share=0.03)
    return ed


def main() -> dict:
    editions = {
        "lesson": lesson(),
        "practice": build(random.Random(SEED + 1), n_sessions=420, n_users=260, late_share=0.04, late_minutes=(15, 90), very_late_share=0.0),
        "project": project(),
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="E-commerce Clickstream",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d06_clickstream.py",
        formats=FORMATS,
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
