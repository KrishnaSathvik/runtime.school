"""PS-D03 Employee & HR: Runtime's own deterministic synthetic people data for an invented company (no real staff).

    python3 services/spark-runner/datasets/d03_hr.py

Writes fixtures/PS-D03/<version>/<edition>/<table>.<csv|txt> and manifest.json. The same seed always produces the
same bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

The company was founded in January 2025, so every hire, raise and promotion falls in 2025–2026. One chief executive
(manager_id null) leads department heads, who lead team managers and individual contributors. Salaries move in steps of
2,500, so ties inside a department are common (for the ranking lesson).

Editions: `lesson` is small enough to read whole (one messy job title, one upper-case email); `practice` has the messy
text a real HR export has (case, spacing, phone formats); `project` is what P02 checks: salary history with effective
dates plus one deliberate manager cycle and a few bad history rows. `employees_raw` is the raw `;`-delimited export
read as text lines, with a header, quoted fields that contain `;`, and one malformed line.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D03"
VERSION = "1.0.0"
SEED = 2003

SCHEMAS = {
    "departments": "department_id STRING, department_name STRING, cost_center STRING, location STRING, head_employee_id STRING",
    "employees": "employee_id STRING, first_name STRING, last_name STRING, email STRING, phone STRING, job_title STRING, level INT, department_id STRING, manager_id STRING, hire_date DATE, employment_type STRING, salary DECIMAL(10,2), status STRING, termination_date DATE",
    "salary_history": "employee_id STRING, effective_date DATE, salary DECIMAL(10,2), change_reason STRING",
    "promotions": "promotion_id STRING, employee_id STRING, effective_date DATE, from_title STRING, to_title STRING, from_level INT, to_level INT, salary_increase DECIMAL(10,2)",
    "attendance": "employee_id STRING, work_date DATE, status STRING, check_in TIMESTAMP, hours_worked DOUBLE",
    "managers": "manager_id STRING, department_id STRING, role STRING, effective_from DATE, effective_to DATE",
    "employees_raw": "value STRING",
}
TABLE_NOTES = {
    "departments": "One row per department, with its cost center, office and head.",
    "employees": "One row per person ever employed: contact details, title, level, department, manager and current salary.",
    "salary_history": "One row per salary change: the new salary and the date it took effect.",
    "promotions": "One row per promotion: the old and new title and level, and the raise that came with it.",
    "attendance": "One row per employee per working day in the period: present, remote, sick, vacation or absent.",
    "managers": "One row per management appointment: who led which department or team, from when, and until when.",
    "employees_raw": "One row per line of the raw `;`-delimited HR export, read as text: a header, then one line per employee.",
}
KEYS = {
    "primary": {
        "departments": ["department_id"],
        "employees": ["employee_id"],
        "salary_history": ["employee_id", "effective_date"],
        "promotions": ["promotion_id"],
        "attendance": ["employee_id", "work_date"],
        "managers": ["manager_id", "department_id", "effective_from"],
    },
    "foreign": {
        "departments.head_employee_id": "employees.employee_id",
        "employees.department_id": "departments.department_id",
        "employees.manager_id": "employees.employee_id",
        "salary_history.employee_id": "employees.employee_id",
        "promotions.employee_id": "employees.employee_id",
        "attendance.employee_id": "employees.employee_id",
        "managers.manager_id": "employees.employee_id",
        "managers.department_id": "departments.department_id",
    },
}
RULES = [
    "employees.manager_id points at another employee (a self join). The chief executive is the only employee with a null manager_id; following manager_id upward from anyone reaches the chief executive.",
    "level is 1 (individual contributor), 2 (senior), 3 (team manager), 4 (department head) or 5 (chief executive). Heads report to the chief executive, team managers to their head, everyone else to a team manager or the head.",
    "Salaries are multiples of 2,500, so several people in a department often earn the same amount (ties for rank versus dense_rank).",
    "employees.salary equals the salary on the employee's latest salary_history row. Every employee has a hire row on hire_date; raises are merit (2026-01-01), market_adjustment (2026-04-01) or promotion.",
    "Each promotion has a matching salary_history row with change_reason promotion on the same date, and salary_increase is the difference.",
    "status is active, on_leave or terminated; termination_date is set only for terminated employees, who have no attendance after it. On-leave employees have no attendance rows.",
    "attendance: hours_worked and check_in are null for sick and vacation days; absent days have 0 hours and no check_in.",
    "managers lists management appointments; effective_to is null for current ones. The chief executive was acting head of some departments until their head was hired.",
    "employees_raw is the HR system's export: `;` between fields, a header line, job titles that contain `;` wrapped in double quotes, and exactly one malformed line (too few fields). Read it with spark.read.text, or as CSV with sep=';'.",
    "The lesson edition is clean except one job title with stray spaces and lower case, and one email in mixed case. It has no merit or market raises, only hires and promotions, so the history fits on screen.",
    "practice and project editions have messy text to standardise: job titles in the wrong case or with extra spaces, emails with capitals, and phone numbers in five formats (555-201-3344, (555) 201-3344, 555.201.3344, +1 555 201 3344, 5552013344).",
    "The project edition (P02) has deliberate errors: one manager cycle (a team manager's manager_id was set to one of their own reports, so neither chain reaches the chief executive), 3 salary_history rows repeated exactly, and 2 salary_history rows dated before the employee's hire_date.",
]

FIRST = ["Maya", "Leo", "Anika", "Tomas", "Ines", "Ravi", "Hana", "Omar", "Zoe", "Kofi", "Lena", "Arjun", "Noor", "Felix", "Priya", "Jonas", "Elif", "Mateo", "Sana", "Dmitri", "Ada", "Kenji"]
LAST = ["Silva", "Grant", "Rao", "Novak", "Okafor", "Mori", "Weber", "Haddad", "Lind", "Costa", "Byrne", "Iyer", "Duarte", "Kowal", "Achebe", "Sato"]
# (name, cost center, office, base role of a level-1 employee)
DEPARTMENTS = [
    ("Executive", "CC-100", "Austin", None),
    ("Engineering", "CC-200", "Austin", "Software Engineer"),
    ("Finance", "CC-300", "Leeds", "Financial Analyst"),
    ("Sales", "CC-400", "Denver", "Account Executive"),
    ("People", "CC-500", "Leeds", "People Partner"),
    ("Marketing", "CC-600", "Denver", "Marketing Specialist"),
    ("Customer Support", "CC-700", "Lyon", "Support Specialist"),
    ("Data", "CC-800", "Austin", "Data Analyst"),
    ("Operations", "CC-900", "Lyon", "Operations Analyst"),
    ("Legal", "CC-950", "Leeds", "Legal Counsel"),
]
BANDS = {1: (55000, 80000), 2: (80000, 115000), 3: (110000, 150000), 4: (150000, 200000), 5: (260000, 260000)}
STEP = 2500
FOUNDED = date(2025, 1, 6)
LAST_HIRE = date(2026, 3, 27)


def title_of(dept: tuple, level: int) -> str:
    name, _, _, base = dept
    return {1: base, 2: f"Senior {base}" if base else None, 3: f"{name} Manager", 4: f"Head of {name}", 5: "Chief Executive Officer"}[level]


def band(rng: random.Random, level: int) -> int:
    lo, hi = BANDS[level]
    return rng.randrange(lo, hi + 1, STEP)


def dec(x: int) -> Decimal:
    return Decimal(x).quantize(Decimal("0.01"))


def phone_digits(rng: random.Random) -> str:
    return f"555{rng.randint(200, 999)}{rng.randint(0, 9999):04d}"


def phone_as(d: str, style: int) -> str:
    a, b, c = d[:3], d[3:6], d[6:]
    return [f"{a}-{b}-{c}", f"({a}) {b}-{c}", f"{a}.{b}.{c}", f"+1 {a} {b} {c}", d][style]


def messy_title(rng: random.Random, t: str) -> str:
    return rng.choice([t.lower(), t.upper(), f"  {t}", f"{t} ", t.replace(" ", "  "), t.title()])


def build(rng: random.Random, cfg: dict) -> dict:
    depts = DEPARTMENTS[: cfg["departments"]]
    departments, employees, used = [], [], {}

    def hire(dept_idx: int, level: int, hired: date, manager: dict | None) -> dict:
        first, last = rng.choice(FIRST), rng.choice(LAST)
        stem = f"{first}.{last}".lower()
        used[stem] = used.get(stem, 0) + 1
        e = {
            "employee_id": f"E{len(employees) + 1:04d}",
            "first_name": first,
            "last_name": last,
            "email": f"{stem}{used[stem] if used[stem] > 1 else ''}@corp.example",
            "phone": phone_as(phone_digits(rng), 0),
            "job_title": title_of(depts[dept_idx], level),
            "level": level,
            "department_id": f"D{dept_idx + 1:02d}",
            "manager_id": manager["employee_id"] if manager else None,
            "hire_date": hired,
            "employment_type": "full_time" if level >= 3 else rng.choices(["full_time", "part_time", "contractor"], [85, 8, 7])[0],
            "salary": None,
            "status": "active",
            "termination_date": None,
        }
        employees.append(e)
        return e

    ceo = hire(0, 5, FOUNDED, None)
    managers = [{"manager_id": ceo["employee_id"], "department_id": "D01", "role": "chief_executive", "effective_from": FOUNDED, "effective_to": None}]
    last_hire = cfg.get("last_hire", LAST_HIRE)
    for d in range(1, len(depts)):
        dept_id = f"D{d + 1:02d}"
        size = cfg["sizes"][d - 1] if "sizes" in cfg else rng.randint(*cfg["dept_size"])
        head_hired = FOUNDED + timedelta(days=rng.choice([0, 7, 30, 60, 95, 140]))
        head = hire(d, 4, head_hired, ceo)
        if head_hired > FOUNDED:
            managers.append({"manager_id": ceo["employee_id"], "department_id": dept_id, "role": "acting_head", "effective_from": FOUNDED, "effective_to": head_hired - timedelta(days=1)})
        managers.append({"manager_id": head["employee_id"], "department_id": dept_id, "role": "department_head", "effective_from": head_hired, "effective_to": None})
        leads = []
        for _ in range((size - 1) // 8):
            hired = head_hired + timedelta(days=rng.randint(10, 120))
            lead = hire(d, 3, hired, head)
            leads.append(lead)
            managers.append({"manager_id": lead["employee_id"], "department_id": dept_id, "role": "team_manager", "effective_from": hired, "effective_to": None})
        for _ in range(size - 1 - len(leads)):
            boss = rng.choice(leads) if leads else head
            earliest = boss["hire_date"] + timedelta(days=7)
            hired = earliest + timedelta(days=rng.randint(0, max(1, (last_hire - earliest).days)))
            hire(d, rng.choices([1, 2], cfg.get("level_w", [65, 35]))[0], min(hired, last_hire), boss)
        departments.append({"department_id": dept_id, "department_name": depts[d][0], "cost_center": depts[d][1], "location": depts[d][2], "head_employee_id": head["employee_id"]})
    departments.insert(0, {"department_id": "D01", "department_name": "Executive", "cost_center": "CC-100", "location": "Austin", "head_employee_id": ceo["employee_id"]})

    # Salary history: hire, then promotion / merit / market events in date order. Steps of 2,500 keep ties common.
    history, promotions = [], []
    for e in employees:
        level = e["level"]
        promoted = level in (2, 3) and e["hire_date"] < date(2025, 9, 1) and rng.random() < cfg["promotion_rate"]
        start_level = level - 1 if promoted else level
        dept = depts[int(e["department_id"][1:]) - 1]
        salary = band(rng, start_level)
        events = [(e["hire_date"], "hire")]
        if promoted:
            p = e["hire_date"] + timedelta(days=rng.randint(150, 300))
            events.append((min(p, date(2026, 6, 1)), "promotion"))
        if cfg.get("raises", True) and e["hire_date"] < date(2025, 10, 1) and level < 5:
            events.append((date(2026, 1, 1), "merit"))
        if cfg.get("raises", True) and level < 5 and rng.random() < 0.12 and e["hire_date"] < date(2026, 3, 1):
            events.append((date(2026, 4, 1), "market_adjustment"))
        events.sort()
        for when, reason in events:
            if reason == "promotion":
                rise = rng.choice([7500, 10000, 12500])
                promotions.append({
                    "employee_id": e["employee_id"], "effective_date": when,
                    "from_title": title_of(dept, start_level), "to_title": title_of(dept, level),
                    "from_level": start_level, "to_level": level, "salary_increase": dec(rise),
                })
                salary += rise
            elif reason == "merit":
                salary += rng.choice([0, 2500, 2500, 5000])
                if salary == history[-1]["salary"]:
                    continue
            elif reason == "market_adjustment":
                salary += STEP
            history.append({"employee_id": e["employee_id"], "effective_date": when, "salary": dec(salary), "change_reason": reason})
        e["salary"] = dec(salary)
    promotions.sort(key=lambda p: (p["effective_date"], p["employee_id"]))
    for n, p in enumerate(promotions, start=1):
        p["promotion_id"] = f"PR{n:04d}"
    # Promoted team managers started managing on their promotion date.
    for p in promotions:
        if p["to_level"] == 3:
            for m in managers:
                if m["manager_id"] == p["employee_id"]:
                    m["effective_from"] = p["effective_date"]

    if cfg.get("tie"):
        # Make sure the small edition shows a tie: two peers in Engineering end on the same salary.
        peers = [e for e in employees if e["department_id"] == "D02" and e["level"] <= 2]
        rows = {e["employee_id"]: [h for h in history if h["employee_id"] == e["employee_id"]] for e in peers}
        a, b = next((a, b) for a in peers for b in peers if a is not b and a["level"] == b["level"] and (len(rows[b["employee_id"]]) == 1 or rows[b["employee_id"]][-2]["salary"] < a["salary"]))
        last = rows[b["employee_id"]][-1]
        if last["change_reason"] == "promotion":
            promo = next(p for p in promotions if p["employee_id"] == b["employee_id"] and p["effective_date"] == last["effective_date"])
            promo["salary_increase"] = a["salary"] - rows[b["employee_id"]][-2]["salary"]
        b["salary"] = last["salary"] = a["salary"]

    # Leavers: individual contributors only, so nobody reports to someone who has gone.
    for e in employees:
        if e["level"] <= 2 and e["hire_date"] < date(2026, 1, 1) and rng.random() < cfg["leave_rate"]:
            if rng.random() < 0.7:
                e["status"] = "terminated"
                e["termination_date"] = e["hire_date"] + timedelta(days=rng.randint(90, (date(2026, 9, 30) - e["hire_date"]).days))
            else:
                e["status"] = "on_leave"

    attendance = []
    day = cfg["att_start"]
    while day <= cfg["att_end"]:
        if day.weekday() < 5:
            for e in employees:
                if e["employee_id"] not in cfg.get("att_only", [e["employee_id"]]):
                    continue
                if e["hire_date"] > day or e["status"] == "on_leave" or (e["termination_date"] and e["termination_date"] <= day):
                    continue
                status = rng.choices(["present", "remote", "sick", "vacation", "absent"], cfg.get("att_w", [74, 16, 3, 5, 2]))[0]
                check_in, hours = None, None
                if status in ("present", "remote"):
                    check_in = datetime(day.year, day.month, day.day, rng.randint(7, 9), rng.randint(0, 59))
                    hours = rng.choice([7.0, 7.5, 7.75, 8.0, 8.0, 8.25, 8.5, 9.0, 9.5])
                elif status == "absent":
                    hours = 0.0
                attendance.append({"employee_id": e["employee_id"], "work_date": day, "status": status, "check_in": check_in, "hours_worked": hours})
        day += timedelta(days=1)

    raw = ["employee_id;full_name;job_title;department;salary;hire_date"]
    names = {d["department_id"]: d["department_name"] for d in departments}
    quoted = set(sorted(rng.sample(range(len(employees)), cfg["raw_quoted"])))
    for i, e in enumerate(employees):
        title = e["job_title"]
        if i in quoted:
            title = f'"{title}; {rng.choice(["Payments", "EMEA", "Platform", "Pricing", "Onboarding"])}"'
        raw.append(f"{e['employee_id']};{e['first_name']} {e['last_name']};{title};{names[e['department_id']]};{e['salary']};{e['hire_date'].isoformat()}")
    bad = cfg["raw_malformed_at"]
    parts = raw[bad].split(";")
    raw[bad] = ";".join(parts[:3])

    return {
        "departments": departments,
        "employees": employees,
        "salary_history": history,
        "promotions": promotions,
        "attendance": attendance,
        "managers": managers,
        "employees_raw": raw,
    }


def make_messy(rng: random.Random, employees: list[dict], share: float) -> None:
    """Text the way people type it into an HR system."""
    for e in employees:
        if rng.random() < share:
            e["job_title"] = messy_title(rng, e["job_title"])
        if rng.random() < share:
            first, rest = e["email"].split(".", 1)
            name, domain = rest.split("@")
            e["email"] = rng.choice([f"{first.capitalize()}.{name.capitalize()}@{domain}", e["email"].upper(), f"{first.capitalize()}.{name}@Corp.Example"])
        style = rng.choices([0, 1, 2, 3, 4], [50, 15, 15, 10, 10])[0]
        e["phone"] = phone_as(e["phone"].replace("-", ""), style)


def add_project_errors(rng: random.Random, ed: dict) -> None:
    employees, history = ed["employees"], ed["salary_history"]
    # One manager cycle: a team manager now "reports to" one of their own reports.
    lead = next(e for e in employees if e["level"] == 3 and e["status"] == "active" and any(r["manager_id"] == e["employee_id"] and r["status"] == "active" for r in employees))
    report = next(r for r in employees if r["manager_id"] == lead["employee_id"] and r["status"] == "active")
    lead["manager_id"] = report["employee_id"]
    for i in sorted(rng.sample(range(len(history)), 3), reverse=True):
        history.insert(i + 1, dict(history[i]))
    by_id = {e["employee_id"]: e for e in employees}
    hires = [h for h in history if h["change_reason"] == "hire" and h["effective_date"] > date(2025, 3, 1)]
    for h in rng.sample(hires, 2):
        h["effective_date"] = by_id[h["employee_id"]]["hire_date"] - timedelta(days=rng.randint(10, 40))


LESSON = {
    "departments": 3, "sizes": [5, 3], "promotion_rate": 1.0, "level_w": [35, 65], "raises": False, "last_hire": date(2025, 8, 29), "leave_rate": 0.0, "tie": True,
    "att_start": date(2026, 3, 2), "att_end": date(2026, 3, 6), "att_only": ["E0003", "E0008"], "att_w": [60, 20, 10, 10, 0],
    "raw_quoted": 1, "raw_malformed_at": 5,
}
PRACTICE = {
    "departments": 8, "dept_size": (8, 24), "promotion_rate": 0.3, "leave_rate": 0.08,
    "att_start": date(2026, 3, 2), "att_end": date(2026, 3, 27), "raw_quoted": 4, "raw_malformed_at": 57,
}
PROJECT = {
    "departments": 10, "dept_size": (14, 34), "promotion_rate": 0.3, "leave_rate": 0.1,
    "att_start": date(2026, 3, 2), "att_end": date(2026, 4, 3), "raw_quoted": 6, "raw_malformed_at": 133,
}


def main() -> dict:
    lesson = build(random.Random(SEED), LESSON)
    practice = build(random.Random(SEED + 1), PRACTICE)
    project = build(random.Random(SEED + 2), PROJECT)
    # Lesson: exactly one messy title and one mixed-case email.
    lesson["employees"][3]["job_title"] = "  " + lesson["employees"][3]["job_title"].lower()
    e = lesson["employees"][6]
    e["email"] = e["email"][0].upper() + e["email"][1:].replace("@corp.example", "@Corp.Example")
    make_messy(random.Random(SEED + 3), practice["employees"], 0.08)
    make_messy(random.Random(SEED + 4), project["employees"], 0.15)
    add_project_errors(random.Random(SEED + 5), project)
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Employee & HR",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions={"lesson": lesson, "practice": practice, "project": project},
        generated_by="services/spark-runner/datasets/d03_hr.py",
        formats={"employees_raw": "text"},
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
