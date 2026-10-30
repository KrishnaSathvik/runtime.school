"""PS-D12 Advertising & Marketing: Runtime's own deterministic synthetic ad-serving data (invented advertisers only).

    python3 services/spark-runner/datasets/d12_ads.py

Writes fixtures/PS-D12/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same bytes.
Standard library only: this runs on the host.

Lessons: L032 conditional aggregation and pivot (channel × day metrics), L069 event-time windows (impressions and clicks
carry event_time, arrival_time and the micro-batch they arrived in). Project P09 (with PS-D06, which shares the
campaign ids CMP-0001 … CMP-0040) attributes conversions; its edition has clicks without impressions, conversions
outside the attribution window and duplicate clicks. The project edition also holds the ad click that landed each of
PS-D06's project campaign sessions, and a conversion for each order those sessions completed (read from
d06_clickstream.py); the contract is docs/pyspark/dataset-contracts.md §2.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D12"
VERSION = "1.1.0"
SEED = 2012

SCHEMAS = {
    "campaigns": "campaign_id STRING, campaign_name STRING, advertiser STRING, channel STRING, objective STRING, "
                 "start_date DATE, end_date DATE, daily_budget DECIMAL(10,2), attribution_window_days INT, status STRING",
    "impressions": "impression_id STRING, campaign_id STRING, user_id STRING, channel STRING, device STRING, "
                   "event_time TIMESTAMP, arrival_time TIMESTAMP, batch INT, cost DECIMAL(10,4)",
    "clicks": "click_id STRING, impression_id STRING, campaign_id STRING, user_id STRING, event_time TIMESTAMP, "
              "arrival_time TIMESTAMP, batch INT",
    "conversions": "conversion_id STRING, user_id STRING, campaign_id STRING, click_id STRING, converted_at TIMESTAMP, "
                   "conversion_type STRING, revenue DECIMAL(10,2)",
    "budgets": "campaign_id STRING, budget_date DATE, planned_spend DECIMAL(10,2), actual_spend DECIMAL(10,2)",
    "attribution_events": "touch_id STRING, conversion_id STRING, user_id STRING, campaign_id STRING, channel STRING, "
                          "touch_type STRING, touch_time TIMESTAMP, position INT, touches_in_path INT",
}
TABLE_NOTES = {
    "campaigns": "One row per campaign: who runs it, on which channel, its daily budget and attribution window.",
    "impressions": "One row per ad shown to a user: when it happened (event_time), when the pipeline received it (arrival_time) and in which batch.",
    "clicks": "One row per click on an impression, with the same event_time / arrival_time / batch columns.",
    "conversions": "One row per purchase, sign-up or lead, with the campaign and click the ad server credited (no click for a view-through conversion).",
    "budgets": "One row per campaign per day: the planned spend and what the ad platform billed.",
    "attribution_events": "One row per touch (impression or click) on a converting user's path, numbered from first to last.",
}
KEYS = {
    "primary": {
        "campaigns": ["campaign_id"], "impressions": ["impression_id"], "clicks": ["click_id"],
        "conversions": ["conversion_id"], "budgets": ["campaign_id", "budget_date"], "attribution_events": ["touch_id"],
    },
    "foreign": {
        "impressions.campaign_id": "campaigns.campaign_id",
        "clicks.impression_id": "impressions.impression_id",
        "clicks.campaign_id": "campaigns.campaign_id",
        "conversions.campaign_id": "campaigns.campaign_id",
        "conversions.click_id": "clicks.click_id",
        "budgets.campaign_id": "campaigns.campaign_id",
        "attribution_events.conversion_id": "conversions.conversion_id",
        "attribution_events.campaign_id": "campaigns.campaign_id",
    },
}
RULES = [
    "campaign_id runs CMP-0001 … CMP-0040 in practice and project (the lesson uses the first four); PS-D06 clickstream uses the same ids.",
    "channel is one of search, social, display, video, email, lowercase; an impression's channel is its campaign's channel.",
    "All times are UTC. event_time is when the user saw or clicked the ad; arrival_time is when the record reached the pipeline, always at or after event_time.",
    "batch (1–5) is the micro-batch the record arrived in, assigned by arrival_time. Most records arrive within minutes, but some arrive hours late, in a later batch than their event_time suggests: these late events are what watermarks are for.",
    "Lesson edition: batch n holds what arrived on day n from 2026-03-02. Impression I0012 happened at 09:12 on 2026-03-02 but arrived in batch 3 two days later, and click K0006 (2026-03-03) arrived in batch 4 — the two late events.",
    "A click always follows its impression (same user and campaign, a few seconds to minutes later), except the deliberate project cases below.",
    "cost is what one impression cost the advertiser. The impression log is a 1-in-1,000 sample, so it does not add up to budgets.actual_spend, which is the platform's bill for the whole campaign-day.",
    "The ad server credits each conversion to the click that led to it (click_id set) or, for a view-through conversion, to an impression (click_id empty); multi-touch models use attribution_events instead.",
    "A conversion counts for a campaign only if converted_at is within attribution_window_days of the credited click or impression.",
    "attribution_events lists every impression and click by the converting user in the attribution window before the conversion (at most 8, the latest kept), position 1 = first touch; position = touches_in_path is the last touch.",
    "revenue is empty (null) for sign-up and lead conversions, which carry no direct revenue.",
    "Practice edition: device is missing (null) on about 1% of impressions, and about 4% of records arrive late.",
    "Project edition problem 1: about 3% of clicks have an impression_id that is not in impressions (the impression was lost upstream).",
    "Project edition problem 2: about 7% of the ad server's own conversions (not the PS-D06 orders below) happened after their campaign's attribution window had closed and must not be attributed.",
    "Project edition problem 3: about 4% of clicks are duplicates: the same click_id, user and event_time delivered again with a later arrival_time and batch. Deduplicate on click_id.",
    "Project edition and PS-D06 (P09): PS-D06's project day (2026-03-05) is inside this week and its signed-in users are these user ids (U00001 to U00480). Lesson and practice editions don't join to PS-D06.",
    "Project edition and PS-D06 (P09): each PS-D06 project campaign session has one landing click here on its campaign, 5 to 90 seconds before the session's started_at (after an impression up to 10 minutes earlier), by the session's user_id, or by a user who is not signed in on the site (U00481 or later) when the session is anonymous. A click and a session match when user_id and campaign_id are equal and started_at is at most 30 minutes after the click.",
    "Project edition and PS-D06 (P09): each order such a signed-in or anonymous session completed (checkout step complete) is a purchase conversion credited to its landing click, with converted_at the complete step's event_time and revenue its order_total; landing clicks lead to no other conversions, and these are never outside the attribution window.",
]

CHANNELS = ["search", "social", "display", "video", "email"]
CHANNEL_CTR = {"search": 0.22, "social": 0.11, "display": 0.05, "video": 0.08, "email": 0.16}
CHANNEL_CPM = {"search": (0.010, 0.040), "social": (0.006, 0.020), "display": (0.002, 0.008), "video": (0.015, 0.045), "email": (0.001, 0.004)}
OBJECTIVES = {"purchase": 0.18, "signup": 0.30, "lead": 0.22}
ADVERTISERS = ["Larkspur Outdoor", "Tidewell Home", "Quillbrook Books", "Ferngate Coffee", "Copperline Fitness",
               "Marlow & Pike Travel", "Brightvale Pets", "Saltmarsh Skincare", "Orbit Lane Audio", "Hollyhock Kitchens"]
THEMES = ["Spring Launch", "Weekend Sale", "Loyalty Push", "New Arrivals", "Retargeting", "Brand Awareness", "Free Shipping", "App Install"]
DEVICES = ["mobile", "desktop", "tablet", "ctv"]
DEVICE_W = [58, 30, 8, 4]
WINDOWS = [1, 3, 7]
START = datetime(2026, 3, 2)
CENT = Decimal("0.01")
TENTH_CENT = Decimal("0.0001")


def money(x: float, q: Decimal = CENT) -> Decimal:
    return Decimal(str(round(x, 6))).quantize(q, rounding=ROUND_HALF_UP)


def batch_of(arrival: datetime, span_days: int) -> int:
    """Batches split the arrival timeline into five equal slices; anything later lands in batch 5."""
    slice_s = span_days * 86400 / 5
    return min(5, int((arrival - START).total_seconds() // slice_s) + 1)


def make_campaigns(rng: random.Random, n: int) -> list[dict]:
    out = []
    for i in range(1, n + 1):
        channel = CHANNELS[(i - 1) % len(CHANNELS)] if n <= 5 else rng.choices(CHANNELS, [30, 25, 20, 15, 10])[0]
        objective = rng.choice(sorted(OBJECTIVES))
        start = date(2026, 2, rng.randint(1, 28))
        status = rng.choices(["active", "paused", "ended"], [80, 10, 10])[0] if n > 5 else "active"
        end = date(2026, 3, rng.randint(5, 8)) if status == "ended" else date(2026, 4, 30)
        out.append({
            "campaign_id": f"CMP-{i:04d}",
            "campaign_name": f"{rng.choice(THEMES)} {2026}",
            "advertiser": ADVERTISERS[(i - 1) % len(ADVERTISERS)],
            "channel": channel,
            "objective": objective,
            "start_date": start,
            "end_date": end,
            "daily_budget": money(rng.choice([150, 250, 400, 600, 900, 1500])),
            "attribution_window_days": WINDOWS[(i - 1) % 3] if n <= 5 else rng.choice(WINDOWS),
            "status": status,
        })
    return out


def delay(rng: random.Random, late_share: float) -> timedelta:
    if rng.random() < late_share:
        return timedelta(minutes=rng.randint(180, 1800))
    return timedelta(seconds=rng.randint(1, 240))


def project_campaigns() -> list[dict]:
    """The project edition's campaigns (the first thing its build draws). PS-D06's project sessions use these."""
    return make_campaigns(random.Random(SEED + 2), 40)


def landings_from_site() -> list[dict]:
    """PS-D06's project campaign sessions, each with the order it completed (if any): the clicks to write here."""
    import d06_clickstream

    site = d06_clickstream.project()
    done = {}
    for e in site["checkout_events"]:
        if e["step"] == "complete":
            done.setdefault(e["session_id"], (e["event_time"], e["order_total"]))
    return [{"user_id": s["user_id"], "campaign_id": s["campaign_id"], "started_at": s["started_at"], "order": done.get(s["session_id"])}
            for s in sorted(site["sessions"], key=lambda s: s["session_id"]) if s["campaign_id"]]


def build(rng: random.Random, campaigns: int, users: int, impressions: int, span_days: int, late_share: float, null_device: float,
          landings: list[dict] | None = None, site_users: int = 0):
    """`landings` (project only): PS-D06 campaign sessions that each get a landing impression and click, and their orders."""
    camps = make_campaigns(rng, campaigns)
    by_id = {c["campaign_id"]: c for c in camps}
    user_ids = [f"U{i:05d}" for i in range(1, users + 1)]
    # Each user mostly sees a couple of campaigns, which gives multi-touch paths.
    affinity = {u: rng.sample(camps, k=min(3, len(camps))) for u in user_ids}
    imps = []
    for _ in range(impressions):
        u = rng.choice(user_ids)
        c = rng.choice(affinity[u])
        t = START + timedelta(seconds=rng.randint(0, span_days * 86400 - 1))
        end = datetime.combine(c["end_date"], datetime.min.time()) + timedelta(days=1)
        if t >= end:
            t = end - timedelta(seconds=rng.randint(60, 86400))
        imps.append({"campaign_id": c["campaign_id"], "user_id": u, "channel": c["channel"], "t": t})
    for land in landings or []:
        click_t = land["started_at"] - timedelta(seconds=rng.randint(5, 90))
        u = land["user_id"] or rng.choice(user_ids[site_users:])
        imps.append({"campaign_id": land["campaign_id"], "user_id": u, "channel": by_id[land["campaign_id"]]["channel"],
                     "t": click_t - timedelta(seconds=rng.randint(2, 600)), "_click": click_t, "_order": land["order"]})
    imps.sort(key=lambda r: (r["t"], r["user_id"]))
    landing = {}
    imp_rows, clk_rows = [], []
    for i, r in enumerate(imps, 1):
        arrival = r["t"] + delay(rng, late_share)
        lo, hi = CHANNEL_CPM[r["channel"]]
        imp_rows.append({
            "impression_id": f"I{i:06d}",
            "campaign_id": r["campaign_id"],
            "user_id": r["user_id"],
            "channel": r["channel"],
            "device": None if rng.random() < null_device else rng.choices(DEVICES, DEVICE_W)[0],
            "event_time": r["t"],
            "arrival_time": arrival,
            "batch": batch_of(arrival, span_days),
            "cost": money(rng.uniform(lo, hi), TENTH_CENT),
        })
        if "_click" in r:
            landing[f"I{i:06d}"] = r
    for imp in imp_rows:
        land = landing.get(imp["impression_id"])
        if land or rng.random() < CHANNEL_CTR[imp["channel"]]:
            t = land["_click"] if land else imp["event_time"] + timedelta(seconds=rng.randint(2, 900))
            arrival = t + delay(rng, late_share)
            clk_rows.append({
                "click_id": f"K{len(clk_rows) + 1:06d}",
                "impression_id": imp["impression_id"],
                "campaign_id": imp["campaign_id"],
                "user_id": imp["user_id"],
                "event_time": t,
                "arrival_time": arrival,
                "batch": batch_of(arrival, span_days),
            })
            if land:
                land["_click_id"] = clk_rows[-1]["click_id"]
    conv = make_conversions(rng, imp_rows, clk_rows, by_id, list(landing.values()))
    return {
        "campaigns": camps,
        "impressions": imp_rows,
        "clicks": clk_rows,
        "conversions": conv,
        "budgets": make_budgets(rng, camps, span_days),
        "attribution_events": [],  # filled in by finish(), after any project damage to conversion times
    }


def make_conversions(rng: random.Random, imps: list[dict], clicks: list[dict], camps: dict, landings: list[dict] | None = None) -> list[dict]:
    """Conversions follow clicks (and a few impressions, view-through) inside the credited campaign's window.

    Landing clicks (PS-D06 sessions) convert only through the order their session completed.
    """
    out = []
    landed = {land["_click_id"] for land in landings or []}
    for land in landings or []:
        if land["_order"]:
            at, total = land["_order"]
            out.append({"user_id": land["user_id"], "campaign_id": land["campaign_id"], "click_id": land["_click_id"], "converted_at": at,
                        "conversion_type": "purchase", "revenue": money(total), "_from": land["_click"], "_landing": True})
    candidates = [("click", c) for c in clicks if c["click_id"] not in landed] + [("view", i) for i in imps if rng.random() < 0.004]
    candidates.sort(key=lambda x: (x[1]["event_time"], x[0]))
    for kind, src in candidates:
        c = camps[src["campaign_id"]]
        p = OBJECTIVES[c["objective"]] if kind == "click" else 1.0
        if rng.random() >= p:
            continue
        window_s = c["attribution_window_days"] * 86400
        at = src["event_time"] + timedelta(seconds=rng.randint(60, max(120, int(window_s * rng.choice([0.05, 0.2, 0.9])))))
        ctype = c["objective"]
        out.append({
            "user_id": src["user_id"], "campaign_id": src["campaign_id"],
            "click_id": src["click_id"] if kind == "click" else None, "converted_at": at, "conversion_type": ctype,
            "revenue": money(rng.choice([19.0, 34.5, 49.99, 72.0, 118.0, 240.0]) * rng.uniform(0.8, 1.3)) if ctype == "purchase" else None,
            "_from": src["event_time"],
        })
    out.sort(key=lambda r: (r["converted_at"], r["user_id"]))
    for i, r in enumerate(out, 1):
        r["conversion_id"] = f"V{i:05d}"
    return out


def make_budgets(rng: random.Random, camps: list[dict], span_days: int) -> list[dict]:
    out = []
    for c in camps:
        for d in range(span_days):
            day = START.date() + timedelta(days=d)
            if not (c["start_date"] <= day <= c["end_date"]):
                continue
            pace = rng.uniform(0.0, 0.4) if c["status"] == "paused" else rng.uniform(0.7, 1.08)
            out.append({"campaign_id": c["campaign_id"], "budget_date": day, "planned_spend": c["daily_budget"],
                        "actual_spend": money(float(c["daily_budget"]) * pace)})
    return out


def make_paths(conv: list[dict], imps: list[dict], clicks: list[dict], camps: dict) -> list[dict]:
    touches: dict[str, list] = {}
    for r in imps:
        touches.setdefault(r["user_id"], []).append((r["event_time"], "impression", r["campaign_id"], r["channel"]))
    for r in clicks:
        touches.setdefault(r["user_id"], []).append((r["event_time"], "click", r["campaign_id"], camps[r["campaign_id"]]["channel"]))
    out = []
    for v in conv:
        window = timedelta(days=camps[v["campaign_id"]]["attribution_window_days"])
        path = sorted(t for t in touches.get(v["user_id"], []) if v["converted_at"] - window <= t[0] <= v["converted_at"])[-8:]
        for pos, (t, kind, cid, ch) in enumerate(path, 1):
            out.append({"touch_id": f"T{len(out) + 1:06d}", "conversion_id": v["conversion_id"], "user_id": v["user_id"],
                        "campaign_id": cid, "channel": ch, "touch_type": kind, "touch_time": t, "position": pos,
                        "touches_in_path": len(path)})
    return out


def lesson() -> dict:
    """Hand-written so every row can be read: two days, three channels, 10-minute windows, two late arrivals."""
    camps = [
        {"campaign_id": "CMP-0001", "campaign_name": "Spring Launch 2026", "advertiser": "Larkspur Outdoor", "channel": "search", "objective": "purchase",
         "start_date": date(2026, 2, 16), "end_date": date(2026, 4, 30), "daily_budget": money(400), "attribution_window_days": 7, "status": "active"},
        {"campaign_id": "CMP-0002", "campaign_name": "Weekend Sale 2026", "advertiser": "Tidewell Home", "channel": "social", "objective": "purchase",
         "start_date": date(2026, 2, 20), "end_date": date(2026, 4, 30), "daily_budget": money(250), "attribution_window_days": 1, "status": "active"},
        {"campaign_id": "CMP-0003", "campaign_name": "Brand Awareness 2026", "advertiser": "Quillbrook Books", "channel": "display", "objective": "signup",
         "start_date": date(2026, 2, 1), "end_date": date(2026, 4, 30), "daily_budget": money(150), "attribution_window_days": 3, "status": "active"},
        {"campaign_id": "CMP-0004", "campaign_name": "Loyalty Push 2026", "advertiser": "Ferngate Coffee", "channel": "search", "objective": "lead",
         "start_date": date(2026, 2, 10), "end_date": date(2026, 4, 30), "daily_budget": money(150), "attribution_window_days": 3, "status": "active"},
    ]
    ch = {c["campaign_id"]: c["channel"] for c in camps}
    d1, d2 = datetime(2026, 3, 2), datetime(2026, 3, 3)
    # (id, campaign, user, device, event_time, arrival delay seconds, cost)
    raw = [
        ("I0001", "CMP-0001", "U00001", "mobile", d1 + timedelta(hours=9, minutes=1, seconds=5), 20, "0.0210"),
        ("I0002", "CMP-0002", "U00002", "mobile", d1 + timedelta(hours=9, minutes=3, seconds=40), 35, "0.0120"),
        ("I0003", "CMP-0003", "U00003", "desktop", d1 + timedelta(hours=9, minutes=6, seconds=12), 15, "0.0040"),
        ("I0004", "CMP-0001", "U00004", "desktop", d1 + timedelta(hours=9, minutes=14, seconds=50), 42, "0.0250"),
        ("I0005", "CMP-0002", "U00001", "tablet", d1 + timedelta(hours=9, minutes=18, seconds=3), 30, "0.0110"),
        ("I0006", "CMP-0004", "U00005", "mobile", d1 + timedelta(hours=9, minutes=27, seconds=31), 18, "0.0180"),
        ("I0007", "CMP-0001", "U00002", "mobile", d2 + timedelta(hours=9, minutes=2, seconds=9), 25, "0.0230"),
        ("I0008", "CMP-0003", "U00004", "desktop", d2 + timedelta(hours=9, minutes=9, seconds=44), 12, "0.0050"),
        ("I0009", "CMP-0002", "U00003", "mobile", d2 + timedelta(hours=9, minutes=11, seconds=20), 40, "0.0130"),
        ("I0010", "CMP-0004", "U00001", "desktop", d2 + timedelta(hours=9, minutes=21, seconds=7), 22, "0.0170"),
        ("I0011", "CMP-0003", "U00005", "tablet", d2 + timedelta(hours=9, minutes=24, seconds=58), 16, "0.0040"),
        # The late one: seen on day 1 at 09:12, received two days later in batch 3.
        ("I0012", "CMP-0001", "U00003", "mobile", d1 + timedelta(hours=9, minutes=12, seconds=30), 48 * 3600 + 600, "0.0220"),
    ]
    span = 5  # lesson batches: one per day from 2026-03-02
    imps = []
    for iid, cid, uid, dev, t, dl, cost in raw:
        arrival = t + timedelta(seconds=dl)
        imps.append({"impression_id": iid, "campaign_id": cid, "user_id": uid, "channel": ch[cid], "device": dev,
                     "event_time": t, "arrival_time": arrival, "batch": batch_of(arrival, span), "cost": Decimal(cost)})
    imp_by = {r["impression_id"]: r for r in imps}
    clk_raw = [("K0001", "I0001", 40, 30), ("K0002", "I0004", 95, 20), ("K0003", "I0005", 61, 25),
               ("K0004", "I0007", 33, 18), ("K0005", "I0010", 120, 40),
               # Late click: clicked on day 2 at 09:13, arrived two days later in batch 4.
               ("K0006", "I0009", 105, 2 * 86400 + 3600)]
    clicks = []
    for kid, iid, after, dl in clk_raw:
        imp = imp_by[iid]
        t = imp["event_time"] + timedelta(seconds=after)
        arrival = t + timedelta(seconds=dl)
        clicks.append({"click_id": kid, "impression_id": iid, "campaign_id": imp["campaign_id"], "user_id": imp["user_id"],
                       "event_time": t, "arrival_time": arrival, "batch": batch_of(arrival, span)})
    clk_by = {r["click_id"]: r for r in clicks}
    conv = [
        {"conversion_id": "V0001", "user_id": "U00001", "campaign_id": "CMP-0002", "click_id": "K0003",
         "converted_at": clk_by["K0003"]["event_time"] + timedelta(minutes=14), "conversion_type": "purchase", "revenue": money(49.99)},
        {"conversion_id": "V0002", "user_id": "U00004", "campaign_id": "CMP-0001", "click_id": "K0002",
         "converted_at": clk_by["K0002"]["event_time"] + timedelta(hours=6), "conversion_type": "purchase", "revenue": money(118.00)},
        {"conversion_id": "V0003", "user_id": "U00002", "campaign_id": "CMP-0001", "click_id": "K0004",
         "converted_at": clk_by["K0004"]["event_time"] + timedelta(minutes=8), "conversion_type": "purchase", "revenue": money(72.00)},
        {"conversion_id": "V0004", "user_id": "U00005", "campaign_id": "CMP-0003", "click_id": None,
         "converted_at": imp_by["I0011"]["event_time"] + timedelta(hours=2), "conversion_type": "signup", "revenue": None},
    ]
    camp_by = {c["campaign_id"]: c for c in camps}
    budgets = []
    for c, a1, a2 in [("CMP-0001", 388.20, 402.75), ("CMP-0002", 241.10, 236.40), ("CMP-0003", 150.00, 131.85), ("CMP-0004", 97.30, 144.60)]:
        for day, actual in ((d1.date(), a1), (d2.date(), a2)):
            budgets.append({"campaign_id": c, "budget_date": day, "planned_spend": camp_by[c]["daily_budget"], "actual_spend": money(actual)})
    return {"campaigns": camps, "impressions": imps, "clicks": clicks, "conversions": conv, "budgets": budgets,
            "attribution_events": make_paths(conv, imps, clicks, camp_by)}


def add_problems(rng: random.Random, ed: dict, span_days: int) -> None:
    """Project edition damage, each kind documented in RULES. Paths are built between the window damage and the duplicates."""
    next_imp = len(ed["impressions"]) + 1
    for c in ed["clicks"]:
        if rng.random() < 0.03:
            c["impression_id"] = f"I{next_imp:06d}"  # never written to impressions: lost upstream
            next_imp += 1
    camps = {c["campaign_id"]: c for c in ed["campaigns"]}
    for v in ed["conversions"]:
        if not v.get("_landing") and rng.random() < 0.06:
            w = camps[v["campaign_id"]]["attribution_window_days"]
            v["converted_at"] = v["_from"] + timedelta(days=w, hours=rng.randint(2, 72))
    finish(ed)
    dups = []
    for c in ed["clicks"]:
        if rng.random() < 0.04:
            d = dict(c)
            d["arrival_time"] = c["arrival_time"] + timedelta(minutes=rng.randint(5, 600))
            d["batch"] = max(c["batch"], batch_of(d["arrival_time"], span_days))
            dups.append(d)
    ed["clicks"].extend(dups)
    ed["clicks"].sort(key=lambda r: (r["arrival_time"], r["click_id"]))


def finish(ed: dict) -> dict:
    if not ed["attribution_events"]:
        ed["attribution_events"] = make_paths(ed["conversions"], ed["impressions"], ed["clicks"], {c["campaign_id"]: c for c in ed["campaigns"]})
    for v in ed["conversions"]:
        v.pop("_from", None)
        v.pop("_landing", None)
    return ed


def main() -> dict:
    practice = build(random.Random(SEED + 1), campaigns=40, users=700, impressions=3000, span_days=7, late_share=0.04, null_device=0.01)
    # P09: the clicks behind PS-D06's project campaign sessions (docs/pyspark/dataset-contracts.md §2).
    project = build(random.Random(SEED + 2), campaigns=40, users=1100, impressions=5200, span_days=7, late_share=0.05, null_device=0.01,
                    landings=landings_from_site(), site_users=480)
    add_problems(random.Random(SEED + 3), project, 7)
    editions = {"lesson": lesson(), "practice": finish(practice), "project": finish(project)}
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Advertising & Marketing",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d12_ads.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
