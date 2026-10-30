"""PS-D11 Education & Learning: Runtime's own deterministic synthetic learning-platform activity (fictional learners only).

    python3 services/spark-runner/datasets/d11_education.py

Writes fixtures/PS-D11/<version>/<edition>/<table>.csv and manifest.json. The same seed always produces the same
bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.
No row comes from any real platform's users: every learner, name and score here is invented.

This is the first dataset a learner meets (L001 What is Spark, L003 SparkSession, L009 selecting and aliasing columns),
so the `lesson` edition is deliberately tiny and clean: five learners, two short courses, column names that read as
plain English, and numbers such as score_pct and minutes_spent that are natural to rename or compute from.
`practice` is half a year of activity; `project` (P03 Learning Platform Activity Analytics) adds duplicate attempt rows.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D11"
VERSION = "1.0.0"
SEED = 2011

# Spark DDL for every table. The harness reads fixtures with exactly these schemas.
SCHEMAS = {
    "learners": "learner_id STRING, display_name STRING, country STRING, signup_date DATE, plan STRING",
    "courses": "course_id STRING, title STRING, track STRING, level STRING, lesson_count INT, published_date DATE",
    "lessons": "lesson_id STRING, course_id STRING, position INT, title STRING, estimated_minutes INT",
    "attempts": (
        "attempt_id STRING, learner_id STRING, lesson_id STRING, attempt_no INT, started_at TIMESTAMP, "
        "minutes_spent INT, score_pct DOUBLE, passed BOOLEAN"
    ),
    "completions": (
        "learner_id STRING, course_id STRING, as_of_date DATE, lessons_completed INT, lessons_total INT, completed_date DATE"
    ),
    "assessments": (
        "assessment_id STRING, learner_id STRING, course_id STRING, taken_at TIMESTAMP, points INT, max_points INT, "
        "score_pct DOUBLE, passed BOOLEAN"
    ),
}
# What one row is, in a sentence, for the dataset page.
TABLE_NOTES = {
    "learners": "One row per learner: a display name, country, the day they signed up and their plan.",
    "courses": "One row per course: its title, track, level and how many lessons it has.",
    "lessons": "One row per lesson, with its course, its position in that course and how long it usually takes.",
    "attempts": "One row per attempt at a lesson: who, which lesson, which try it was, minutes spent and the score.",
    "completions": "One row per learner per course per as-of date: how many of the course's lessons the learner had passed by that day.",
    "assessments": "One row per final assessment a learner sat for a course: points, percentage and whether they passed.",
}
KEYS = {
    "primary": {
        "learners": ["learner_id"],
        "courses": ["course_id"],
        "lessons": ["lesson_id"],
        "attempts": ["attempt_id"],
        "completions": ["learner_id", "course_id", "as_of_date"],
        "assessments": ["assessment_id"],
    },
    "foreign": {
        "lessons.course_id": "courses.course_id",
        "attempts.learner_id": "learners.learner_id",
        "attempts.lesson_id": "lessons.lesson_id",
        "completions.learner_id": "learners.learner_id",
        "completions.course_id": "courses.course_id",
        "assessments.learner_id": "learners.learner_id",
        "assessments.course_id": "courses.course_id",
    },
}
RULES = [
    "Every learner, name and score is invented; nothing comes from a real platform's users.",
    "score_pct is a percentage from 0 to 100 with one decimal; an attempt passes when score_pct is 70 or more. minutes_spent is whole minutes.",
    "A learner may attempt the same lesson several times: attempt_no counts the tries (1, 2, 3 …) and a learner stops retrying once they pass.",
    "completions is a snapshot: each row says how many lessons of the course the learner had passed by as_of_date. completed_date is the day they passed the course's last lesson, empty while the course is unfinished. Use the latest as_of_date for the current picture.",
    "An assessment is the course's final test, sat after passing every lesson; it passes at score_pct 70 or more (points out of max_points).",
    "The data ends on the last as_of_date. A learner is inactive when they have no attempt in the 30 days up to and including that date; some learners signed up and never attempted anything.",
    "plan is free or plus; track is sql, python or data_engineering; level is beginner or intermediate.",
    "Lesson edition: five learners and four two-lesson courses, all clean. Learners L003 and L005 each needed two attempts at one lesson, and learner L005 is inactive (last attempt on 2026-04-09). completions has one as-of date, 2026-06-28.",
    "Practice edition: half a year of activity with completions snapshots at the end of each month (the last one on 2026-06-28). A few attempts were abandoned: score_pct is empty and passed is false.",
    "Project edition (P03): like practice but bigger, and about 2% of attempt rows are exact duplicates (the same attempt_id twice, from a re-run export); count attempts after removing them.",
]
FIRST = ["Aiko", "Bruno", "Chidi", "Dana", "Elif", "Farah", "Goran", "Hugo", "Ines", "Jonas", "Kavya", "Liam", "Mira", "Nadia",
         "Oscar", "Priya", "Quentin", "Rosa", "Samir", "Tess", "Uma", "Viktor", "Wen", "Yara", "Zane"]
LAST_INITIAL = list("ABCDEFGHJKLMNOPRSTVW")
COUNTRIES = ["IN", "US", "GB", "DE", "BR", "NG", "JP", "CA", "ES", "PL"]
COURSES = [
    ("SQL Foundations", "sql", "beginner", ["Your first SELECT", "Filtering rows", "Sorting results", "Grouping and counting", "Joining two tables", "Subqueries"]),
    ("Python for Data", "python", "beginner", ["Variables and types", "Lists and loops", "Functions", "Reading files", "Dictionaries", "Error handling"]),
    ("Spark Essentials", "data_engineering", "intermediate", ["What Spark is", "DataFrames", "Selecting columns", "Filtering at scale", "Aggregations", "Joins"]),
    ("Data Modelling Basics", "data_engineering", "beginner", ["Tables and keys", "One-to-many", "Normalising", "Star schemas", "Slowly changing data"]),
    ("Advanced SQL Patterns", "sql", "intermediate", ["Window functions", "Running totals", "Ranking", "Recursive queries", "Pivoting", "Query plans", "Tuning"]),
]
START = date(2026, 1, 5)
END = date(2026, 6, 28)
MONTH_ENDS = [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31), date(2026, 4, 30), date(2026, 5, 31), END]


def at(day: date, minutes: int) -> datetime:
    return datetime(day.year, day.month, day.day) + timedelta(minutes=minutes)


def catalogue(courses: int, lessons_per_course: int | None):
    crs, les = [], []
    for i, (title, track, level, titles) in enumerate(COURSES[:courses], 1):
        titles = titles[:lessons_per_course] if lessons_per_course else titles
        cid = f"C{i:02d}"
        crs.append({"course_id": cid, "title": title, "track": track, "level": level, "lesson_count": len(titles),
                    "published_date": date(2025, 2 + 2 * i, 1)})
        for pos, lt in enumerate(titles, 1):
            les.append({"lesson_id": f"{cid}-L{pos:02d}", "course_id": cid, "position": pos, "title": lt,
                        "estimated_minutes": 10 + 5 * ((i + pos) % 4)})
    return crs, les


def snapshots(attempts: list[dict], courses: list[dict], lessons: list[dict], dates: list[date]) -> list[dict]:
    """completions rows: for each learner and course they started, lessons passed by each as-of date."""
    course_of = {l["lesson_id"]: l["course_id"] for l in lessons}
    total = {c["course_id"]: c["lesson_count"] for c in courses}
    passed_on: dict[tuple[str, str], dict[str, date]] = {}
    first_seen: dict[tuple[str, str], date] = {}
    for a in attempts:
        key = (a["learner_id"], course_of[a["lesson_id"]])
        first_seen[key] = min(first_seen.get(key, a["started_at"].date()), a["started_at"].date())
        if a["passed"]:
            passed_on.setdefault(key, {})
            passed_on[key].setdefault(a["lesson_id"], a["started_at"].date())
    rows = []
    for key in sorted(first_seen):
        learner, course = key
        passes = passed_on.get(key, {})
        for d in dates:
            if first_seen[key] > d:
                continue
            done = sorted(p for p in passes.values() if p <= d)
            rows.append({"learner_id": learner, "course_id": course, "as_of_date": d, "lessons_completed": len(done),
                         "lessons_total": total[course], "completed_date": done[-1] if len(done) == total[course] else None})
    return rows


def assessments_for(rng: random.Random, attempts, courses, lessons, prefix_len: int = 4) -> list[dict]:
    course_of = {l["lesson_id"]: l["course_id"] for l in lessons}
    total = {c["course_id"]: c["lesson_count"] for c in courses}
    finished: dict[tuple[str, str], list[str]] = {}
    done_at = {}
    for a in sorted(attempts, key=lambda a: a["started_at"]):
        if not a["passed"]:
            continue
        key = (a["learner_id"], course_of[a["lesson_id"]])
        got = finished.setdefault(key, [])
        if a["lesson_id"] not in got:
            got.append(a["lesson_id"])
            if len(got) == total[key[1]]:
                done_at[key] = a["started_at"]
    out = []
    for key in sorted(done_at):
        t = done_at[key] + timedelta(days=rng.randint(1, 6), minutes=rng.randint(-120, 240))
        for _ in range(2):
            if t.date() > END:
                break
            points = min(50, max(18, round(rng.gauss(39, 6))))
            pct = round(points / 50 * 100, 1)
            out.append({"learner_id": key[0], "course_id": key[1], "taken_at": t, "points": points, "max_points": 50,
                        "score_pct": pct, "passed": pct >= 70})
            if pct >= 70:
                break
            t += timedelta(days=rng.randint(2, 9))
    out.sort(key=lambda r: (r["taken_at"], r["learner_id"]))
    for i, r in enumerate(out, 1):
        r["assessment_id"] = f"AS{i:0{prefix_len}d}"
    return out


def build(rng: random.Random, learners: int, courses: int, duplicate_share: float, abandon_share: float) -> dict:
    crs, les = catalogue(courses, None)
    by_course = {c["course_id"]: [l for l in les if l["course_id"] == c["course_id"]] for c in crs}
    people, raw = [], []
    for i in range(1, learners + 1):
        lid = f"L{i:04d}"
        signup = START + timedelta(days=rng.randint(-40, 140))
        people.append({"learner_id": lid, "display_name": f"{rng.choice(FIRST)} {rng.choice(LAST_INITIAL)}.",
                       "country": rng.choice(COUNTRIES), "signup_date": signup, "plan": "plus" if rng.random() < 0.28 else "free"})
        if rng.random() < 0.06:
            continue  # signed up, never started
        skill = rng.uniform(-12, 10)  # how a learner's scores sit around the average
        pace = rng.choice([2, 3, 4, 6, 8, 10])  # typical days between study sessions
        stop = END + timedelta(days=1) if rng.random() < 0.8 else START + timedelta(days=rng.randint(30, 140))
        day = max(signup, START) + timedelta(days=rng.randint(0, 10))
        # Learners work through courses one after another, in their own order, until they stop or the data ends.
        chosen = [c["course_id"] for c in crs]
        rng.shuffle(chosen)
        for cid in chosen:
            for lesson in by_course[cid]:
                tries = 0
                while tries < 4:
                    tries += 1
                    if day > END or day >= stop:
                        break
                    est = lesson["estimated_minutes"]
                    abandoned = rng.random() < abandon_share
                    if abandoned:
                        score, minutes = None, rng.randint(1, max(2, est // 3))
                    else:
                        score = round(min(100.0, max(12.0, rng.gauss(76 + skill + 4 * (tries - 1), 13))), 1)
                        minutes = max(3, round(rng.gauss(est * 1.1, est * 0.35)))
                    raw.append({"learner_id": lid, "lesson_id": lesson["lesson_id"], "attempt_no": tries,
                                "started_at": at(day, rng.randint(6 * 60, 23 * 60)), "minutes_spent": minutes,
                                "score_pct": score, "passed": score is not None and score >= 70})
                    day += timedelta(days=rng.choice([0, 0, 1]) if score is None or score < 70 else rng.randint(1, 2 * pace))
                    if score is not None and score >= 70:
                        break
                if day > END or day >= stop:
                    break
                if not raw or raw[-1]["learner_id"] != lid or not raw[-1]["passed"]:
                    break  # gave up on this course after failing repeatedly
            day += timedelta(days=rng.randint(1, 10))
    raw.sort(key=lambda a: (a["started_at"], a["learner_id"]))
    attempts = [dict(attempt_id=f"A{n:06d}", **a) for n, a in enumerate(raw, 1)]
    completions = snapshots(attempts, crs, les, MONTH_ENDS)
    tests = assessments_for(rng, attempts, crs, les)
    for a in list(attempts):
        if rng.random() < duplicate_share:
            attempts.append(dict(a))
    if duplicate_share:
        attempts.sort(key=lambda a: (a["started_at"], a["attempt_id"]))
    return {"learners": people, "courses": crs, "lessons": les, "attempts": attempts, "completions": completions, "assessments": tests}


def lesson(rng: random.Random) -> dict:
    """Five learners, four two-lesson courses, thirteen attempts. Clean: the only twists are retries and a quiet learner."""
    crs, les = catalogue(4, 2)
    people = [
        {"learner_id": "L001", "display_name": "Aiko M.", "country": "JP", "signup_date": date(2026, 1, 8), "plan": "plus"},
        {"learner_id": "L002", "display_name": "Bruno S.", "country": "BR", "signup_date": date(2026, 2, 2), "plan": "free"},
        {"learner_id": "L003", "display_name": "Chidi O.", "country": "NG", "signup_date": date(2026, 2, 17), "plan": "free"},
        {"learner_id": "L004", "display_name": "Dana K.", "country": "CA", "signup_date": date(2026, 3, 9), "plan": "plus"},
        {"learner_id": "L005", "display_name": "Elif T.", "country": "DE", "signup_date": date(2026, 3, 23), "plan": "free"},
    ]
    # (learner, lesson, day, start minute, minutes_spent, score_pct)
    plan = [
        ("L001", "C01-L01", date(2026, 5, 4), 19 * 60 + 5, 14, 92.0),
        ("L001", "C01-L02", date(2026, 5, 6), 19 * 60 + 40, 19, 85.5),
        ("L001", "C02-L01", date(2026, 6, 15), 7 * 60 + 30, 21, 88.0),
        ("L001", "C02-L02", date(2026, 6, 16), 7 * 60 + 45, 26, 79.0),
        ("L002", "C02-L01", date(2026, 5, 20), 12 * 60 + 15, 18, 74.5),
        ("L002", "C02-L02", date(2026, 6, 3), 12 * 60 + 50, 33, 81.0),
        ("L003", "C01-L01", date(2026, 6, 1), 21 * 60 + 0, 12, 70.0),
        ("L003", "C01-L02", date(2026, 6, 2), 21 * 60 + 25, 24, 58.5),
        ("L003", "C01-L02", date(2026, 6, 4), 22 * 60 + 5, 22, 76.0),
        ("L004", "C03-L01", date(2026, 6, 8), 9 * 60 + 0, 16, 95.0),
        ("L004", "C03-L02", date(2026, 6, 12), 9 * 60 + 20, 28, 89.5),
        ("L005", "C04-L01", date(2026, 4, 2), 18 * 60 + 30, 15, 66.0),
        ("L005", "C04-L01", date(2026, 4, 9), 18 * 60 + 10, 13, 72.5),
    ]
    attempts, tries = [], {}
    for n, (learner, lesson_id, day, minute, spent, score) in enumerate(sorted(plan, key=lambda p: (p[2], p[3])), 1):
        tries[(learner, lesson_id)] = tries.get((learner, lesson_id), 0) + 1
        attempts.append({"attempt_id": f"A{n:03d}", "learner_id": learner, "lesson_id": lesson_id, "attempt_no": tries[(learner, lesson_id)],
                         "started_at": at(day, minute), "minutes_spent": spent, "score_pct": score, "passed": score >= 70})
    completions = snapshots(attempts, crs, les, [END])
    tests = assessments_for(rng, attempts, crs, les, prefix_len=3)
    return {"learners": people, "courses": crs, "lessons": les, "attempts": attempts, "completions": completions, "assessments": tests}


def main() -> dict:
    editions = {
        "lesson": lesson(random.Random(SEED)),
        "practice": build(random.Random(SEED + 1), learners=110, courses=4, duplicate_share=0.0, abandon_share=0.02),
        "project": build(random.Random(SEED + 2), learners=200, courses=5, duplicate_share=0.02, abandon_share=0.02),
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Education & Learning",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d11_education.py",
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
