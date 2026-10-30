"""PS-D04 Healthcare Operations: Runtime's own deterministic synthetic clinic and claims data, in the style of a
Synthea export but entirely invented (no real patients, providers, pharmacies or payers).

    python3 services/spark-runner/datasets/d04_healthcare.py

Writes fixtures/PS-D04/<version>/<edition>/<table>.<csv|jsonl> and manifest.json. The same seed always produces the
same bytes, so the manifest's SHA-256 values double as a determinism check. Standard library only: this runs on the host.

`encounters` is JSON Lines with nested data: `vitals` is a STRUCT (heart rate, blood pressure, temperature) and
`diagnosis_codes` an ARRAY of ICD-10-style codes. `discharge_disposition` was added to the feed on 2026-01-01, so older
encounters carry null there (for the schema evolution lesson).

Editions: `lesson` is small enough to read whole (one claim submitted before its service date); `practice` is a year of
visits with the odd quality problem a data-quality rule should catch; `project` is what P07 builds a claims lakehouse
from, with duplicate claims, claims pointing at unknown providers and claims whose dates conflict.
"""

from __future__ import annotations

import random
import sys
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D04"
VERSION = "1.0.0"
SEED = 2004

SCHEMAS = {
    "patients": "patient_id STRING, first_name STRING, last_name STRING, birth_date DATE, sex STRING, city STRING, state STRING, postal_code STRING, insurance_plan STRING, primary_pharmacy_id STRING",
    "providers": "provider_id STRING, provider_name STRING, specialty STRING, organization STRING, city STRING, accepts_new_patients BOOLEAN",
    "pharmacies": "pharmacy_id STRING, pharmacy_name STRING, city STRING, state STRING, open_24h BOOLEAN",
    "encounters": "encounter_id STRING, patient_id STRING, provider_id STRING, encounter_class STRING, start_time TIMESTAMP, end_time TIMESTAMP, reason STRING, "
                  "vitals STRUCT<heart_rate: INT, systolic: INT, diastolic: INT, temperature_c: DOUBLE>, diagnosis_codes ARRAY<STRING>, discharge_disposition STRING",
    "claims": "claim_id STRING, encounter_id STRING, patient_id STRING, provider_id STRING, payer STRING, service_date DATE, submitted_date DATE, billed_amount DECIMAL(12,2), allowed_amount DECIMAL(12,2), paid_amount DECIMAL(12,2), claim_status STRING, denial_reason STRING",
    "medications": "prescription_id STRING, patient_id STRING, encounter_id STRING, pharmacy_id STRING, drug_name STRING, dose STRING, quantity INT, days_supply INT, prescribed_date DATE, filled_date DATE, cost DECIMAL(10,2)",
    "observations": "observation_id STRING, encounter_id STRING, patient_id STRING, code STRING, description STRING, value DOUBLE, unit STRING, observed_at TIMESTAMP",
}
TABLE_NOTES = {
    "patients": "One row per (invented) patient: birth date, home town, insurance plan and usual pharmacy.",
    "providers": "One row per clinician, with their specialty and the clinic they work for.",
    "pharmacies": "One row per pharmacy that fills prescriptions.",
    "encounters": "One row per visit: who, with whom, what kind, when, the vitals taken (a struct) and the diagnoses made (an array).",
    "claims": "One row per insurance claim for a visit: what was billed, what the payer allowed and paid, and its status.",
    "medications": "One row per prescription written at a visit, and whether and when a pharmacy filled it.",
    "observations": "One row per lab result or measurement taken at a visit, with its value and unit.",
}
KEYS = {
    "primary": {
        "patients": ["patient_id"],
        "providers": ["provider_id"],
        "pharmacies": ["pharmacy_id"],
        "encounters": ["encounter_id"],
        "claims": ["claim_id"],
        "medications": ["prescription_id"],
        "observations": ["observation_id"],
    },
    "foreign": {
        "patients.primary_pharmacy_id": "pharmacies.pharmacy_id",
        "encounters.patient_id": "patients.patient_id",
        "encounters.provider_id": "providers.provider_id",
        "claims.encounter_id": "encounters.encounter_id",
        "claims.patient_id": "patients.patient_id",
        "claims.provider_id": "providers.provider_id",
        "medications.patient_id": "patients.patient_id",
        "medications.encounter_id": "encounters.encounter_id",
        "medications.pharmacy_id": "pharmacies.pharmacy_id",
        "observations.encounter_id": "encounters.encounter_id",
        "observations.patient_id": "patients.patient_id",
    },
}
RULES = [
    "All people, clinics, pharmacies and payers are invented. Diagnosis codes follow the ICD-10 pattern; nothing is real patient data.",
    "encounter_class is wellness, ambulatory, emergency, inpatient or telehealth. end_time is after start_time; inpatient stays last 1-5 days.",
    "encounters.vitals is a struct (heart_rate, systolic, diastolic as INT; temperature_c as DOUBLE in Celsius). It is null for telehealth visits; temperature_c is sometimes null when it wasn't taken.",
    "encounters.diagnosis_codes is an array of 1-3 codes; reason is the description of the first code.",
    "discharge_disposition (home, home_with_care, transferred, left_against_advice) was added to the feed on 2026-01-01: older encounters have null there, and wellness and telehealth visits always do.",
    "Patients on the Self-pay plan have no claims. Every other encounter has one claim, filed by the visit's provider on the encounter's date (service_date) and submitted 1-30 days later.",
    "claim_status is submitted, approved, paid, denied or appealed. allowed_amount is at most billed_amount and is null until a payer decides; paid_amount is set only for paid claims (denied claims pay 0.00); denial_reason is set only for denied and appealed claims.",
    "Prescriptions come from ambulatory, emergency and inpatient visits. filled_date is null for prescriptions never picked up.",
    "Observations come from wellness, ambulatory and inpatient visits; each code has one unit (GLU mg/dL, HBA1C %, LDL mg/dL, HGB g/dL, BMI kg/m2).",
    "The lesson edition is clean except one claim whose service_date is after its submitted_date. Its patient PAT00004 is Self-pay, so that visit has no claim.",
    "The practice edition has a few problems a data-quality rule should catch: about 1% of observations with a null value, 6 HBA1C results reported in mmol/mol (values 40-80, still labelled %), and 3 encounters with temperature_c recorded in Fahrenheit (about 98-101).",
    "The project edition (P07) has the practice problems plus: 20 claims repeated exactly, 25 claims resubmitted under a new claim_id for the same encounter (later submitted_date), 20 claims whose provider_id is not in providers (ids PRV9xxx), 10 with a null provider_id, and 30 whose service_date is after submitted_date.",
]

FIRST_F = ["Maya", "Anika", "Ines", "Hana", "Zoe", "Lena", "Noor", "Priya", "Elif", "Sana", "Ada", "Bea"]
FIRST_M = ["Leo", "Tomas", "Ravi", "Omar", "Kofi", "Arjun", "Felix", "Jonas", "Mateo", "Kenji"]
FIRST = FIRST_F + FIRST_M
LAST = ["Silva", "Grant", "Rao", "Novak", "Okafor", "Mori", "Weber", "Haddad", "Lind", "Costa", "Byrne", "Iyer", "Duarte", "Kowal", "Achebe", "Sato", "Quill", "Ferro"]
PLACES = [("Riverton", "OR", "97"), ("Cedar Falls", "OR", "97"), ("Millbrook", "WA", "98"), ("Lakeview", "WA", "98"), ("Pine Hollow", "ID", "83")]
PLANS, PLAN_W = ["Bluebird Health PPO", "Bluebird Health HMO", "Summit Senior Advantage", "Cedar State Medicaid", "Self-pay"], [32, 24, 18, 18, 8]
ORGS = ["Riverbend Family Clinic", "Northfield Medical Group", "Lakeview Community Hospital", "Pine Hollow Health Center"]
SPECIALTIES = ["family_medicine", "internal_medicine", "pediatrics", "emergency_medicine", "cardiology", "endocrinology", "orthopedics"]
PHARMACY_NAMES = ["Corner Remedy Pharmacy", "Greenleaf Drugstore", "Harbor Rx", "Maple Apothecary", "Summit Care Pharmacy", "Willow Pharmacy", "Brightway Chemists", "Fernside Rx"]
# code, description, drug for it (None: no prescription), dose, cost per unit
DIAGNOSES = [
    ("Z00.00", "General adult exam", None),
    ("J06.9", "Upper respiratory infection", ("amoxicillin 500 mg capsule", "1 capsule 3x daily", 0.35)),
    ("I10", "Essential hypertension", ("lisinopril 10 mg tablet", "1 tablet daily", 0.12)),
    ("E11.9", "Type 2 diabetes", ("metformin 500 mg tablet", "1 tablet 2x daily", 0.10)),
    ("E78.5", "High cholesterol", ("atorvastatin 20 mg tablet", "1 tablet daily", 0.18)),
    ("M54.5", "Low back pain", ("ibuprofen 600 mg tablet", "1 tablet as needed", 0.08)),
    ("J45.909", "Asthma", ("albuterol 90 mcg inhaler", "2 puffs as needed", 28.50)),
    ("N39.0", "Urinary tract infection", ("nitrofurantoin 100 mg capsule", "1 capsule 2x daily", 0.95)),
    ("F41.1", "Generalized anxiety", ("sertraline 50 mg tablet", "1 tablet daily", 0.22)),
    ("K21.9", "Acid reflux", ("omeprazole 20 mg capsule", "1 capsule daily", 0.15)),
    ("S93.401A", "Ankle sprain", ("naproxen 500 mg tablet", "1 tablet 2x daily", 0.14)),
    ("R51.9", "Headache", None),
]
CLASSES, CLASS_W = ["wellness", "ambulatory", "emergency", "inpatient", "telehealth"], [22, 46, 10, 4, 18]
BILLED = {"wellness": (150, 320), "ambulatory": (120, 480), "emergency": (650, 3800), "inpatient": (4200, 26000), "telehealth": (60, 160)}
LABS = [("GLU", "Glucose", "mg/dL", 70, 190, 0), ("HBA1C", "Hemoglobin A1c", "%", 4.8, 9.8, 1), ("LDL", "LDL cholesterol", "mg/dL", 60, 190, 0), ("HGB", "Hemoglobin", "g/dL", 11.0, 17.2, 1), ("BMI", "Body mass index", "kg/m2", 18.5, 39.5, 1)]
STATUS, STATUS_W = ["paid", "approved", "submitted", "denied", "appealed"], [64, 10, 12, 10, 4]
DENIALS = ["not_covered", "missing_information", "duplicate_claim", "prior_auth_required", "out_of_network"]
DISPOSITIONS, DISPOSITION_W = ["home", "home_with_care", "transferred", "left_against_advice"], [82, 10, 5, 3]
CENT = Decimal("0.01")
FEED_CHANGE = datetime(2026, 1, 1)


def money(x: float) -> Decimal:
    return Decimal(str(round(x, 2))).quantize(CENT, rounding=ROUND_HALF_UP)


def build(rng: random.Random, cfg: dict) -> dict:
    pharmacies = []
    for i, name in enumerate(PHARMACY_NAMES[: cfg["pharmacies"]], start=1):
        city, state, _ = PLACES[(i - 1) % len(PLACES)]
        pharmacies.append({"pharmacy_id": f"PH{i:02d}", "pharmacy_name": name, "city": city, "state": state, "open_24h": rng.random() < 0.25})

    patients = []
    for i in range(1, cfg["patients"] + 1):
        city, state, zip_prefix = rng.choice(PLACES)
        age = rng.choices([rng.randint(1, 17), rng.randint(18, 64), rng.randint(65, 92)], [18, 60, 22])[0]
        plan = rng.choices(PLANS, PLAN_W)[0]
        if i in cfg.get("self_pay", []):
            plan = "Self-pay"
        if age >= 65 and plan != "Self-pay":
            plan = "Summit Senior Advantage"
        elif plan == "Summit Senior Advantage":
            plan = "Bluebird Health PPO"
        sex = rng.choices(["F", "M", "X"], [50, 48, 2])[0]
        patients.append({
            "patient_id": f"PAT{i:05d}",
            "first_name": rng.choice(FIRST_F if sex == "F" else FIRST_M if sex == "M" else FIRST),
            "last_name": rng.choice(LAST),
            "birth_date": date(2026 - age, 1, 1) + timedelta(days=rng.randint(0, 364)),
            "sex": sex,
            "city": city,
            "state": state,
            "postal_code": f"{zip_prefix}{rng.randint(0, 999):03d}",
            "insurance_plan": plan,
            "primary_pharmacy_id": rng.choice(pharmacies)["pharmacy_id"] if rng.random() < 0.85 else None,
            "_age": age,
        })

    providers = []
    for i in range(1, cfg["providers"] + 1):
        specialty = SPECIALTIES[(i - 1) % len(SPECIALTIES)] if i <= len(SPECIALTIES) else rng.choice(SPECIALTIES)
        providers.append({
            "provider_id": f"PRV{i:04d}",
            "provider_name": f"Dr. {rng.choice(FIRST)} {rng.choice(LAST)}",
            "specialty": specialty,
            "organization": rng.choice(ORGS),
            "city": rng.choice(PLACES)[0],
            "accepts_new_patients": rng.random() < 0.7,
        })
    emergency = [p for p in providers if p["specialty"] == "emergency_medicine"]
    clinic = [p for p in providers if p["specialty"] != "emergency_medicine"]

    encounters = []
    span = (cfg["end"] - cfg["start"]).days
    for n in range(cfg["encounters"]):
        pat = patients[cfg["who"][n] - 1] if "who" in cfg else rng.choice(patients)
        kind = cfg["classes"][n] if "classes" in cfg else rng.choices(CLASSES, CLASS_W)[0]
        doc = rng.choice(emergency if kind == "emergency" else clinic)
        day = cfg["start"] + timedelta(days=rng.randint(0, span))
        start = datetime(day.year, day.month, day.day, rng.randint(0, 23) if kind in ("emergency", "inpatient") else rng.randint(8, 17), rng.choice([0, 15, 30, 45]))
        if kind == "inpatient":
            end = start + timedelta(days=rng.randint(1, 5), hours=rng.randint(0, 12))
        elif kind == "emergency":
            end = start + timedelta(hours=rng.randint(2, 9), minutes=rng.choice([0, 20, 40]))
        else:
            end = start + timedelta(minutes=rng.choice([15, 20, 30, 45, 60]))
        if kind == "wellness":
            codes = ["Z00.00"] + ([rng.choice(["I10", "E78.5", "E11.9"])] if rng.random() < 0.3 else [])
        else:
            first = rng.choice(DIAGNOSES[1:])
            codes = [first[0]] + [d[0] for d in rng.sample(DIAGNOSES[1:], rng.choices([0, 1, 2], [60, 30, 10])[0]) if d[0] != first[0]]
        vitals = None
        if kind != "telehealth":
            child = pat["_age"] < 12
            vitals = {
                "heart_rate": rng.randint(80, 120) if child else rng.randint(56, 104) + (12 if kind == "emergency" else 0),
                "systolic": rng.randint(95, 112) if child else rng.randint(104, 162),
                "diastolic": rng.randint(55, 72) if child else rng.randint(62, 98),
                "temperature_c": round(rng.uniform(36.2, 37.4) + (rng.uniform(0.5, 2.0) if codes[0] in ("J06.9", "N39.0") and rng.random() < 0.4 else 0), 1) if rng.random() < 0.9 else None,
            }
        disposition = None
        if start >= FEED_CHANGE and kind in ("ambulatory", "emergency", "inpatient"):
            disposition = rng.choices(DISPOSITIONS, DISPOSITION_W)[0] if kind != "ambulatory" else "home"
        encounters.append({
            "patient_id": pat["patient_id"],
            "provider_id": doc["provider_id"],
            "encounter_class": kind,
            "start_time": start,
            "end_time": end,
            "reason": next(d[1] for d in DIAGNOSES if d[0] == codes[0]),
            "vitals": vitals,
            "diagnosis_codes": codes,
            "discharge_disposition": disposition,
        })
    encounters.sort(key=lambda e: (e["start_time"], e["patient_id"]))
    for n, e in enumerate(encounters, start=1):
        e["encounter_id"] = f"ENC{n:06d}"
    plan_of = {p["patient_id"]: p["insurance_plan"] for p in patients}
    pharmacy_of = {p["patient_id"]: p["primary_pharmacy_id"] for p in patients}

    claims = []
    for e in encounters:
        if plan_of[e["patient_id"]] == "Self-pay":
            continue
        lo, hi = BILLED[e["encounter_class"]]
        billed = money(rng.uniform(lo, hi))
        status = rng.choices(STATUS, STATUS_W)[0]
        allowed = money(float(billed) * rng.uniform(0.45, 0.9)) if status in ("paid", "approved", "appealed") else None
        if status == "denied":
            allowed = money(0)
        service = e["start_time"].date()
        claims.append({
            "encounter_id": e["encounter_id"],
            "patient_id": e["patient_id"],
            "provider_id": e["provider_id"],
            "payer": plan_of[e["patient_id"]].split(" PPO")[0].split(" HMO")[0],
            "service_date": service,
            "submitted_date": service + timedelta(days=rng.randint(1, 30)),
            "billed_amount": billed,
            "allowed_amount": allowed,
            "paid_amount": allowed if status == "paid" else (money(0) if status == "denied" else None),
            "claim_status": status,
            "denial_reason": rng.choice(DENIALS) if status in ("denied", "appealed") else None,
        })
    for n, c in enumerate(claims, start=1):
        c["claim_id"] = f"CLM{n:06d}"

    meds = []
    for e in encounters:
        if e["encounter_class"] not in ("ambulatory", "emergency", "inpatient") or rng.random() > cfg.get("rx_share", 0.55):
            continue
        diag = next(d for d in DIAGNOSES if d[0] == e["diagnosis_codes"][0])
        if diag[2] is None:
            continue
        drug, dose, unit_cost = diag[2]
        inhaler = "inhaler" in drug
        qty = 1 if inhaler else rng.choice([10, 14, 20, 30, 60, 90])
        prescribed = e["start_time"].date()
        filled = prescribed + timedelta(days=rng.choice([0, 0, 0, 1, 2, 5])) if rng.random() < 0.88 else None
        meds.append({
            "patient_id": e["patient_id"],
            "encounter_id": e["encounter_id"],
            "pharmacy_id": pharmacy_of[e["patient_id"]] or rng.choice(pharmacies)["pharmacy_id"],
            "drug_name": drug,
            "dose": dose,
            "quantity": qty,
            "days_supply": 30 if inhaler else (qty if "daily" in dose and "x" not in dose else max(5, qty // 2)),
            "prescribed_date": prescribed,
            "filled_date": filled,
            "cost": money(unit_cost * qty + rng.choice([0, 1.5, 3.0])),
        })
    for n, m in enumerate(meds, start=1):
        m["prescription_id"] = f"RX{n:06d}"

    obs = []
    for e in encounters:
        if e["encounter_class"] not in ("wellness", "ambulatory", "inpatient") or rng.random() > cfg["obs_share"]:
            continue
        for code, desc, unit, lo, hi, places in rng.sample(LABS, rng.randint(1, 3)):
            obs.append({
                "encounter_id": e["encounter_id"],
                "patient_id": e["patient_id"],
                "code": code,
                "description": desc,
                "value": round(rng.uniform(lo, hi), places) if places else float(round(rng.uniform(lo, hi))),
                "unit": unit,
                "observed_at": e["start_time"] + timedelta(minutes=rng.choice([10, 20, 35, 50])),
            })
    for n, o in enumerate(obs, start=1):
        o["observation_id"] = f"OBS{n:06d}"

    for p in patients:
        del p["_age"]
    return {"patients": patients, "providers": providers, "pharmacies": pharmacies, "encounters": encounters, "claims": claims, "medications": meds, "observations": obs}


def add_quality_problems(rng: random.Random, ed: dict) -> None:
    """The problems a data-quality rule should catch (practice and project)."""
    obs = ed["observations"]
    for o in rng.sample(obs, max(1, len(obs) // 100)):
        o["value"] = None
    a1c = [o for o in obs if o["code"] == "HBA1C" and o["value"] is not None]
    for o in rng.sample(a1c, 6):
        o["value"] = float(rng.randint(40, 80))
    with_temp = [e for e in ed["encounters"] if e["vitals"] and e["vitals"]["temperature_c"] is not None]
    for e in rng.sample(with_temp, 3):
        e["vitals"] = dict(e["vitals"], temperature_c=round(e["vitals"]["temperature_c"] * 9 / 5 + 32, 1))


def add_claim_problems(rng: random.Random, ed: dict) -> None:
    """P07: duplicates, resubmissions, unknown or missing providers, and conflicting dates."""
    claims = ed["claims"]
    picks = rng.sample(range(len(claims)), 80)
    unknown, missing, conflict = picks[:20], picks[20:30], picks[30:60]
    for i in unknown:
        claims[i]["provider_id"] = f"PRV9{rng.randint(0, 999):03d}"
    for i in missing:
        claims[i]["provider_id"] = None
    for i in conflict:
        c = claims[i]
        c["submitted_date"] = c["service_date"] - timedelta(days=rng.randint(1, 20))
    next_id = len(claims) + 1
    for i in picks[60:80] + rng.sample(range(len(claims)), 5):
        c = dict(claims[i])
        c["claim_id"] = f"CLM{next_id:06d}"
        c["submitted_date"] = c["submitted_date"] + timedelta(days=rng.randint(10, 45))
        c["claim_status"], c["allowed_amount"], c["paid_amount"], c["denial_reason"] = "submitted", None, None, None
        claims.append(c)
        next_id += 1
    for i in sorted(rng.sample(range(len(claims)), 20), reverse=True):
        claims.insert(i + 1, dict(claims[i]))


LESSON = {
    "start": date(2025, 12, 1), "end": date(2026, 1, 31), "pharmacies": 4, "patients": 6, "providers": 5, "encounters": 8, "obs_share": 0.7, "rx_share": 1.0,
    "self_pay": [4], "who": [1, 2, 3, 4, 2, 5, 6, 1],
    "classes": ["ambulatory", "wellness", "emergency", "telehealth", "ambulatory", "ambulatory", "inpatient", "telehealth"],
}
PRACTICE = {"start": date(2025, 7, 1), "end": date(2026, 6, 30), "pharmacies": 6, "patients": 360, "providers": 24, "encounters": 1100, "obs_share": 0.6}
PROJECT = {"start": date(2025, 7, 1), "end": date(2026, 6, 30), "pharmacies": 8, "patients": 700, "providers": 40, "encounters": 2600, "obs_share": 0.6}


def main() -> dict:
    lesson = build(random.Random(SEED), LESSON)
    practice = build(random.Random(SEED + 1), PRACTICE)
    project = build(random.Random(SEED + 2), PROJECT)
    # Lesson: one claim submitted before the visit it is for.
    c = lesson["claims"][2]
    c["submitted_date"] = c["service_date"] - timedelta(days=3)
    add_quality_problems(random.Random(SEED + 3), practice)
    add_quality_problems(random.Random(SEED + 4), project)
    add_claim_problems(random.Random(SEED + 5), project)
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Healthcare Operations",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions={"lesson": lesson, "practice": practice, "project": project},
        generated_by="services/spark-runner/datasets/d04_healthcare.py",
        formats={"encounters": "jsonl"},
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
