"""PS-D05 Movies & Streaming: Runtime's own deterministic synthetic streaming service (invented films, not MovieLens).

    python3 services/spark-runner/datasets/d05_movies.py

Writes fixtures/PS-D05/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

Editions: `lesson` is hand-written and small enough to read whole (ties in ratings and years, repeated genres, one
user with no ratings, a viewer whose plays split into sessions over consecutive days); `practice` is a realistic
service for Playground and tests; `project` is what P05 (Movie Recommendation Features) builds on, with duplicate
interactions to remove before building features.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D05"
VERSION = "1.0.0"
SEED = 2005

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "movies": "movie_id STRING, title STRING, release_year INT, primary_genre STRING, genres STRING, runtime_min INT, language STRING, maturity_rating STRING",
    "users": "user_id STRING, signup_date DATE, country STRING, age_band STRING, preferred_device STRING",
    "ratings": "user_id STRING, movie_id STRING, rating DOUBLE, rated_at TIMESTAMP",
    "tags": "user_id STRING, movie_id STRING, tag STRING, tagged_at TIMESTAMP",
    "watch_sessions": "watch_id STRING, user_id STRING, movie_id STRING, device STRING, started_at TIMESTAMP, ended_at TIMESTAMP, completed BOOLEAN",
    "subscriptions": "subscription_id STRING, user_id STRING, plan STRING, monthly_price DECIMAL(6,2), start_date DATE, end_date DATE, status STRING",
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "movies": "One row per film in the catalogue: its year, genres, length, language and maturity rating.",
    "users": "One row per member account: when they joined, where they live, their age band and favourite device.",
    "ratings": "One row per star rating a member gave a film (0.5 to 5.0 in half stars), with when they rated it.",
    "tags": "One row per free-text tag a member put on a film.",
    "watch_sessions": "One row per play: a member watching one film from start to stop on one device.",
    "subscriptions": "One row per subscription period: the plan, its monthly price and when it started and ended.",
}
KEYS = {
    "primary": {
        "movies": ["movie_id"],
        "users": ["user_id"],
        "ratings": ["user_id", "movie_id"],
        "tags": ["user_id", "movie_id", "tag"],
        "watch_sessions": ["watch_id"],
        "subscriptions": ["subscription_id"],
    },
    "foreign": {
        "ratings.user_id": "users.user_id",
        "ratings.movie_id": "movies.movie_id",
        "tags.user_id": "users.user_id",
        "tags.movie_id": "movies.movie_id",
        "watch_sessions.user_id": "users.user_id",
        "watch_sessions.movie_id": "movies.movie_id",
        "subscriptions.user_id": "users.user_id",
    },
}
RULES = [
    "rating is in half stars from 0.5 to 5.0; many ratings tie (3.5 and 4.0 are the most common values).",
    "genres lists every genre of a film separated by '|', primary_genre first; primary_genre repeats across films, so distinct() on it gives the short genre list.",
    "Several films share a release_year, so sorting by year alone leaves ties; sort by year then title (or movie_id) for a stable order.",
    "Ratings are sparse: most members rate only a handful of films and a few popular films collect most ratings.",
    "Cold-start members have an account but no ratings at all (U06 in the lesson edition; about 5% of members in practice and about 12% in project).",
    "rated_at runs from January 2025 to September 2026, so ratings can be split by time: train on earlier ratings, test on later ones.",
    "A viewing session is a run of plays by one member where each play starts no more than 30 minutes after the previous one ended; a longer gap starts a new session.",
    "watch_sessions covers July to September 2026; members often watch on consecutive days, which the streak questions count.",
    "ended_at is missing (null) for a few plays in practice and project where the player stopped reporting; completed is then false.",
    "completed is true when the play lasted at least 90% of the film's runtime.",
    "end_date is null and status is active for a subscription that is still running; a member who changed plan has one row per plan period.",
    "The project edition repeats some interactions, as a raw event export does: exact duplicate rating rows, re-ratings (the same member and film rated again later with a new value; keep the latest), and exact duplicate tag rows.",
    "The lesson and practice editions have one rating per member and film; referential integrity holds in every edition.",
]

GENRES = ["Drama", "Comedy", "Thriller", "Sci-Fi", "Documentary", "Animation", "Romance", "Horror", "Action", "Mystery"]
GENRE_WEIGHTS = [20, 16, 12, 9, 6, 7, 9, 6, 10, 5]
ADJ = ["Silent", "Glass", "Paper", "Iron", "Hollow", "Bright", "Last", "Northern", "Velvet", "Crooked", "Hidden",
       "Burning", "Quiet", "Distant", "Little", "Salt", "Copper", "Wandering", "Midnight", "Second"]
NOUN = ["Orchard", "Ferry", "Lantern", "Harbour", "Signal", "Meadow", "Archive", "Comet", "Tide", "Parade", "Garden",
        "Engine", "Kingdom", "Mirror", "Voyage", "Season", "Station", "Bridge", "Island", "Letter"]
LANGUAGES = ["en", "es", "fr", "hi", "ko", "ja", "de"]
LANGUAGE_WEIGHTS = [55, 10, 8, 9, 7, 6, 5]
MATURITY = ["G", "PG", "PG-13", "R"]
COUNTRIES = ["US", "GB", "IN", "BR", "DE", "CA", "MX", "AU"]
AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55+"]
DEVICES = ["tv", "mobile", "web", "tablet"]
DEVICE_WEIGHTS = [45, 30, 15, 10]
TAGS = ["slow burn", "twist ending", "great soundtrack", "visually stunning", "rewatchable", "too long", "feel-good",
        "dark", "based on a novel", "cozy", "funny", "tearjerker"]
PLANS = {"basic": Decimal("6.99"), "standard": Decimal("11.99"), "premium": Decimal("17.99")}

RATING_START = datetime(2025, 1, 1)
RATING_END = datetime(2026, 9, 30, 23, 59, 59)
WATCH_START = date(2026, 7, 1)
WATCH_DAYS = 92


def ts(y, m, d, hh, mm, ss=0) -> datetime:
    return datetime(y, m, d, hh, mm, ss)


def lesson() -> dict:
    """Hand-written, readable whole. Ties, repeats and one cold-start member are the teaching cases."""
    movies = [
        ("M01", "The Glass Orchard", 2019, "Drama", "Drama|Romance", 118, "en", "PG-13"),
        ("M02", "Midnight Ferry", 2024, "Thriller", "Thriller|Mystery", 104, "en", "R"),
        ("M03", "Paper Comet", 2021, "Animation", "Animation|Comedy", 92, "ja", "PG"),
        ("M04", "Iron Meadow", 2019, "Action", "Action|Drama", 131, "en", "PG-13"),
        ("M05", "Salt Harbour", 2024, "Drama", "Drama", 109, "fr", "PG-13"),
        ("M06", "Quiet Signal", 2023, "Sci-Fi", "Sci-Fi|Thriller", 126, "ko", "PG-13"),
        ("M07", "Little Parade", 2021, "Comedy", "Comedy", 88, "es", "PG"),
        ("M08", "The Hidden Archive", 2025, "Documentary", "Documentary", 97, "en", "G"),
        ("M09", "Copper Tide", 2024, "Thriller", "Thriller|Action", 112, "de", "R"),
        ("M10", "Velvet Season", 2022, "Romance", "Romance|Comedy|Drama", 101, "hi", "PG-13"),
    ]
    movies = [dict(zip(["movie_id", "title", "release_year", "primary_genre", "genres", "runtime_min", "language", "maturity_rating"], m)) for m in movies]
    users = [
        ("U01", date(2025, 2, 3), "US", "25-34", "tv"),
        ("U02", date(2025, 3, 18), "IN", "18-24", "mobile"),
        ("U03", date(2025, 5, 9), "GB", "35-44", "web"),
        ("U04", date(2025, 8, 21), "BR", "25-34", "tv"),
        ("U05", date(2026, 1, 12), "CA", "45-54", "tablet"),
        ("U06", date(2026, 8, 30), "DE", "55+", "tv"),  # cold start: no ratings, no plays yet
    ]
    users = [dict(zip(["user_id", "signup_date", "country", "age_band", "preferred_device"], u)) for u in users]
    ratings = [
        ("U01", "M01", 4.0, ts(2025, 3, 2, 21, 14)),
        ("U01", "M02", 4.5, ts(2025, 6, 11, 22, 40)),
        ("U01", "M04", 3.0, ts(2025, 9, 5, 20, 3)),
        ("U01", "M06", 4.0, ts(2026, 2, 14, 23, 1)),
        ("U02", "M02", 5.0, ts(2025, 4, 1, 19, 22)),
        ("U02", "M03", 4.0, ts(2025, 7, 19, 18, 45)),
        ("U02", "M07", 3.5, ts(2026, 1, 8, 12, 30)),
        ("U03", "M01", 4.0, ts(2025, 6, 30, 21, 55)),
        ("U03", "M05", 2.5, ts(2025, 11, 2, 20, 10)),
        ("U03", "M09", 4.5, ts(2026, 3, 21, 22, 18)),
        ("U04", "M02", 4.0, ts(2025, 10, 4, 23, 30)),
        ("U04", "M10", 5.0, ts(2026, 4, 16, 21, 5)),
        ("U05", "M03", 3.5, ts(2026, 2, 2, 17, 48)),
        ("U05", "M06", 4.0, ts(2026, 6, 27, 20, 20)),
        ("U05", "M08", 1.5, ts(2026, 8, 9, 19, 2)),
    ]
    ratings = [dict(zip(["user_id", "movie_id", "rating", "rated_at"], r)) for r in ratings]
    tags = [
        ("U01", "M02", "twist ending", ts(2025, 6, 11, 22, 41)),
        ("U01", "M06", "visually stunning", ts(2026, 2, 14, 23, 2)),
        ("U02", "M02", "twist ending", ts(2025, 4, 1, 19, 23)),
        ("U02", "M03", "feel-good", ts(2025, 7, 19, 18, 46)),
        ("U03", "M05", "slow burn", ts(2025, 11, 2, 20, 11)),
        ("U03", "M09", "great soundtrack", ts(2026, 3, 21, 22, 19)),
        ("U04", "M10", "rewatchable", ts(2026, 4, 16, 21, 6)),
        ("U05", "M08", "too long", ts(2026, 8, 9, 19, 3)),
    ]
    tags = [dict(zip(["user_id", "movie_id", "tag", "tagged_at"], t)) for t in tags]
    # U01: three plays on 7 Jul (two sessions: a 10-minute gap joins, a 2-hour gap splits), then 8 and 9 Jul: a 3-day streak.
    # U02: 7 Jul, skips 8 Jul, then a play on 9 Jul that runs past midnight into 10 Jul.
    plays = [
        ("U01", "M04", "tv", ts(2026, 7, 7, 19, 0), ts(2026, 7, 7, 19, 42), False),
        ("U01", "M07", "tv", ts(2026, 7, 7, 19, 52), ts(2026, 7, 7, 21, 20), True),
        ("U01", "M06", "tv", ts(2026, 7, 7, 23, 25), ts(2026, 7, 7, 23, 58), False),
        ("U01", "M06", "mobile", ts(2026, 7, 8, 8, 10), ts(2026, 7, 8, 10, 16), True),
        ("U01", "M03", "tv", ts(2026, 7, 9, 20, 0), ts(2026, 7, 9, 21, 32), True),
        ("U02", "M02", "mobile", ts(2026, 7, 7, 22, 5), ts(2026, 7, 7, 23, 49), True),
        ("U02", "M09", "mobile", ts(2026, 7, 9, 23, 15), ts(2026, 7, 10, 1, 7), True),
        ("U02", "M01", "web", ts(2026, 7, 10, 1, 20), ts(2026, 7, 10, 1, 55), False),
        ("U03", "M05", "web", ts(2026, 7, 8, 20, 30), ts(2026, 7, 8, 22, 19), True),
        ("U04", "M10", "tv", ts(2026, 7, 8, 21, 0), ts(2026, 7, 8, 22, 41), True),
        ("U04", "M08", "tv", ts(2026, 7, 8, 22, 55), ts(2026, 7, 9, 0, 32), True),
        ("U05", "M03", "tablet", ts(2026, 7, 9, 17, 0), ts(2026, 7, 9, 17, 25), False),
    ]
    watch = [{"watch_id": f"W{i:03d}", "user_id": u, "movie_id": m, "device": d, "started_at": s, "ended_at": e, "completed": c}
             for i, (u, m, d, s, e, c) in enumerate(plays, 1)]
    subs = [
        ("S01", "U01", "premium", date(2025, 2, 3), None, "active"),
        ("S02", "U02", "basic", date(2025, 3, 18), date(2025, 12, 31), "cancelled"),
        ("S03", "U02", "standard", date(2026, 1, 1), None, "active"),
        ("S04", "U03", "standard", date(2025, 5, 9), None, "active"),
        ("S05", "U04", "basic", date(2025, 8, 21), None, "active"),
        ("S06", "U05", "standard", date(2026, 1, 12), None, "active"),
        ("S07", "U06", "basic", date(2026, 8, 30), None, "active"),
    ]
    subs = [{"subscription_id": s, "user_id": u, "plan": p, "monthly_price": PLANS[p], "start_date": a, "end_date": b, "status": st}
            for s, u, p, a, b, st in subs]
    return {"movies": movies, "users": users, "ratings": ratings, "tags": tags, "watch_sessions": watch, "subscriptions": subs}


def rand_dt(rng: random.Random, lo: datetime, hi: datetime) -> datetime:
    return lo + timedelta(seconds=rng.randint(0, int((hi - lo).total_seconds())))


def half_star(x: float) -> float:
    return min(5.0, max(0.5, round(x * 2) / 2))


def build(rng: random.Random, n_movies: int, n_users: int, cold_share: float, null_end_share: float):
    titles = sorted(f"{a} {n}" for a in ADJ for n in NOUN)
    picked = rng.sample(titles, n_movies)
    movies = []
    for i, title in enumerate(picked, 1):
        g = rng.choices(GENRES, GENRE_WEIGHTS)[0]
        extra = [x for x in rng.sample(GENRES, 3) if x != g][: rng.choice([0, 1, 1, 2])]
        movies.append({
            "movie_id": f"M{i:04d}",
            "title": ("The " if rng.random() < 0.25 else "") + title,
            "release_year": rng.choice(range(1988, 2027)) if rng.random() < 0.35 else rng.randint(2015, 2026),
            "primary_genre": g,
            "genres": "|".join([g] + extra),
            "runtime_min": 80 + int(rng.random() ** 1.5 * 70) if g != "Animation" else rng.randint(78, 105),
            "language": rng.choices(LANGUAGES, LANGUAGE_WEIGHTS)[0],
            "maturity_rating": rng.choices(MATURITY, [8, 22, 45, 25])[0],
        })
    quality = {m["movie_id"]: rng.gauss(0, 0.6) for m in movies}
    popularity = [1.0 / (k + 1) ** 0.9 for k in range(n_movies)]
    pop_order = list(movies)
    rng.shuffle(pop_order)

    users = []
    for i in range(1, n_users + 1):
        users.append({
            "user_id": f"U{i:04d}",
            "signup_date": date(2024, 6, 1) + timedelta(days=rng.randint(0, 800)),
            "country": rng.choices(COUNTRIES, [30, 12, 18, 10, 8, 8, 8, 6])[0],
            "age_band": rng.choices(AGE_BANDS, [18, 32, 24, 15, 11])[0],
            "preferred_device": rng.choices(DEVICES, DEVICE_WEIGHTS)[0],
        })

    ratings, tags = [], []
    for u in users:
        if rng.random() < cold_share:
            continue  # cold start: an account with no ratings
        bias = rng.gauss(0.2, 0.5)
        n = min(n_movies // 3, max(1, int(rng.paretovariate(1.3) * 2)))
        chosen, seen = [], []
        while len(chosen) < n:
            m = rng.choices(pop_order, popularity)[0]
            if m["movie_id"] not in seen:
                seen.append(m["movie_id"])
                chosen.append(m)
        lo = max(RATING_START, datetime.combine(u["signup_date"], datetime.min.time()))
        for m in chosen:
            m_lo = max(lo, datetime(m["release_year"], 1, 1)) if m["release_year"] >= 2025 else lo
            if m_lo >= RATING_END:
                continue
            at = rand_dt(rng, m_lo, RATING_END)
            ratings.append({"user_id": u["user_id"], "movie_id": m["movie_id"], "rating": half_star(3.4 + bias + quality[m["movie_id"]] + rng.gauss(0, 0.7)), "rated_at": at})
            if rng.random() < 0.12:
                tags.append({"user_id": u["user_id"], "movie_id": m["movie_id"], "tag": rng.choice(TAGS), "tagged_at": at + timedelta(seconds=rng.randint(5, 600))})
    ratings.sort(key=lambda r: (r["rated_at"], r["user_id"], r["movie_id"]))
    tags.sort(key=lambda r: (r["tagged_at"], r["user_id"], r["movie_id"]))

    by_id = {m["movie_id"]: m for m in movies}
    watch = []
    for u in users:
        if rng.random() < 0.55:
            continue
        days, d, last_end = [], rng.randint(0, 40), datetime.min
        for _ in range(rng.randint(1, 8)):
            if d >= WATCH_DAYS:
                break
            days.append(d)
            d += 1 if rng.random() < 0.55 else rng.randint(2, 9)
        for day in days:
            t = datetime.combine(WATCH_START + timedelta(days=day), datetime.min.time()) + timedelta(hours=rng.choice([7, 12, 18, 19, 20, 20, 21, 21, 22]), minutes=rng.randint(0, 59))
            t = max(t, last_end + timedelta(minutes=rng.randint(60, 180)))  # never overlap the previous day's late plays
            for _s in range(rng.choice([1, 1, 1, 2])):
                device = rng.choices(DEVICES, DEVICE_WEIGHTS)[0] if rng.random() < 0.3 else u["preferred_device"]
                for _p in range(rng.choice([1, 1, 2, 2, 3])):
                    m = rng.choices(pop_order, popularity)[0]
                    full = rng.random() < 0.55
                    minutes = m["runtime_min"] if full else rng.randint(6, m["runtime_min"] - 5)
                    start = t
                    end = start + timedelta(minutes=minutes, seconds=rng.randint(0, 59))
                    lost = rng.random() < null_end_share
                    watch.append({"user_id": u["user_id"], "movie_id": m["movie_id"], "device": device, "started_at": start,
                                  "ended_at": None if lost else end, "completed": (not lost) and minutes >= 0.9 * by_id[m["movie_id"]]["runtime_min"]})
                    last_end = end
                    t = end + timedelta(minutes=rng.randint(1, 25), seconds=rng.randint(0, 59))
                t += timedelta(minutes=rng.randint(90, 240))
    watch.sort(key=lambda w: (w["started_at"], w["user_id"]))
    watch = [{"watch_id": f"W{i:06d}", **w} for i, w in enumerate(watch, 1)]

    subs = []
    for u in users:
        plan = rng.choices(list(PLANS), [35, 45, 20])[0]
        start = u["signup_date"]
        if rng.random() < 0.15:
            change = start + timedelta(days=rng.randint(40, 300))
            if change < date(2026, 9, 30):
                subs.append({"user_id": u["user_id"], "plan": plan, "monthly_price": PLANS[plan], "start_date": start, "end_date": change - timedelta(days=1), "status": "cancelled"})
                plan = rng.choice([p for p in PLANS if p != plan])
                start = change
        cancelled = rng.random() < 0.1
        end = start + timedelta(days=rng.randint(30, 400)) if cancelled else None
        if end is not None and end > date(2026, 9, 30):
            end = None
        subs.append({"user_id": u["user_id"], "plan": plan, "monthly_price": PLANS[plan], "start_date": start, "end_date": end, "status": "cancelled" if end else "active"})
    subs = [{"subscription_id": f"S{i:05d}", **s} for i, s in enumerate(subs, 1)]
    return {"movies": movies, "users": users, "ratings": ratings, "tags": tags, "watch_sessions": watch, "subscriptions": subs}


def add_duplicates(rng: random.Random, tables: dict, exact: int, rerates: int, tag_dups: int) -> None:
    """Repeat interactions the way a raw event export does. Appended rows are interleaved by time again."""
    ratings, tags = tables["ratings"], tables["tags"]
    extra = [dict(r) for r in rng.sample(ratings, exact)]
    for r in rng.sample(ratings, rerates):
        later = min(RATING_END, r["rated_at"] + timedelta(days=rng.randint(1, 120), seconds=rng.randint(0, 86399)))
        new = half_star(r["rating"] + rng.choice([-1.5, -1.0, -0.5, 0.5, 1.0]))
        extra.append({**r, "rating": new, "rated_at": later})
    ratings.extend(extra)
    ratings.sort(key=lambda r: (r["rated_at"], r["user_id"], r["movie_id"], r["rating"]))
    tags.extend(dict(t) for t in rng.sample(tags, tag_dups))
    tags.sort(key=lambda r: (r["tagged_at"], r["user_id"], r["movie_id"]))


def main() -> dict:
    editions = {
        "lesson": lesson(),
        "practice": build(random.Random(SEED + 1), n_movies=220, n_users=450, cold_share=0.05, null_end_share=0.006),
        "project": build(random.Random(SEED + 2), n_movies=320, n_users=900, cold_share=0.12, null_end_share=0.006),
    }
    add_duplicates(random.Random(SEED + 3), editions["project"], exact=70, rerates=90, tag_dups=15)
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Movies & Streaming",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d05_movies.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
