"""PS-D15 Application Logs: Runtime's own deterministic synthetic service telemetry (no real hosts, users, secrets or tokens).

    python3 services/spark-runner/datasets/d15_logs.py

Writes fixtures/PS-D15/<version>/<edition>/<table>.<csv|jsonl|txt> and manifest.json. The same seed always produces the
same bytes. Standard library only: this runs on the host.

Lessons: L002 driver/executors and L005 RDDs vs DataFrames (api_requests), L040 maps (application_logs.attributes is a
MAP whose keys vary by line), L044 JSON and malformed records (application_logs_raw is raw text with a few broken lines),
L049/L050 RDD map/flatMap/reduceByKey (endpoint, status_code, user_agent), L059 data skew (one endpoint dominates),
L072 checkpoints, L081 logging/metrics, L084 SLA monitoring (latency percentiles per service). Project P10 correlates
the project edition's error_events with PS-D09's project devices through device_id (DEV-001 … DEV-018, the same ids and
days as PS-D09's project edition, read from d09_iot.py); lesson and practice use stand-alone device ids (DEV-0001 …)
that are not PS-D09 devices. The contract is docs/pyspark/dataset-contracts.md §3.
"""

from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import d09_iot  # noqa: E402
from dslib import write_dataset  # noqa: E402

DATASET_ID = "PS-D15"
VERSION = "1.1.0"
SEED = 2015

SCHEMAS = {
    "api_requests": "request_id STRING, trace_id STRING, requested_at TIMESTAMP, service STRING, method STRING, endpoint STRING, "
                    "status_code INT, latency_ms INT, bytes_sent BIGINT, user_agent STRING, client_region STRING",
    "application_logs": "log_id STRING, logged_at TIMESTAMP, level STRING, service STRING, message STRING, trace_id STRING, "
                        "attributes MAP<STRING,STRING>",
    "application_logs_raw": "value STRING",
    "traces": "span_id STRING, trace_id STRING, parent_span_id STRING, service STRING, operation STRING, started_at TIMESTAMP, "
              "duration_ms INT, status STRING",
    "deployments": "deployment_id STRING, service STRING, version STRING, environment STRING, deployed_at TIMESTAMP, "
                   "deployed_by STRING, outcome STRING",
    "service_metrics": "service STRING, window_start TIMESTAMP, request_count INT, error_count INT, p50_latency_ms INT, "
                       "p95_latency_ms INT, p99_latency_ms INT, cpu_pct DOUBLE, memory_mb INT",
    "error_events": "error_id STRING, occurred_at TIMESTAMP, service STRING, error_type STRING, error_message STRING, "
                    "severity STRING, request_id STRING, device_id STRING",
}
FORMATS = {"application_logs": "jsonl", "application_logs_raw": "text"}
TABLE_NOTES = {
    "api_requests": "One row per HTTP request a service answered: endpoint, status, latency and the caller's user agent.",
    "application_logs": "One row per structured log line, with a map of attributes whose keys depend on the service.",
    "application_logs_raw": "One row per raw line of the log file as shipped, before parsing; a few lines are broken.",
    "traces": "One row per span of a distributed trace: which service did what, for how long, under which parent span.",
    "deployments": "One row per release of a service to production, and whether it stuck or was rolled back.",
    "service_metrics": "One row per service per 5-minute window: traffic, errors, latency percentiles and resource use.",
    "error_events": "One row per error a service reported, linked to the request or the IoT device involved when there is one.",
}
KEYS = {
    "primary": {"api_requests": ["request_id"], "application_logs": ["log_id"], "traces": ["span_id"], "deployments": ["deployment_id"],
                "service_metrics": ["service", "window_start"], "error_events": ["error_id"]},
    "foreign": {
        "traces.trace_id": "api_requests.trace_id",
        "traces.parent_span_id": "traces.span_id",
        "application_logs.trace_id": "api_requests.trace_id",
        "error_events.request_id": "api_requests.request_id",
    },
}
RULES = [
    "Every service, host, user agent and identifier is invented; logs contain no real users, IP addresses, secrets or tokens.",
    "All times are UTC. endpoint is the route template (e.g. GET /v1/catalog/items/{sku}), never a path with real ids in it.",
    "status_code is an HTTP status; 5xx is a server error and counts in error_count, 4xx is the caller's mistake and does not.",
    "latency_ms is the time from receiving the request to sending the last byte.",
    "application_logs.attributes is a map whose keys depend on the line: host and region are on every line; checkout lines add order_ref and payment_provider, iot-gateway lines add device_id and firmware, search lines add result_count, and so on. A missing key is simply absent from the map.",
    "application_logs_raw is the log file before parsing: every application_logs record as one JSON line, plus a few malformed lines — a line cut off mid-record (the shipper resent it whole), a record missing its closing brace, and plain-text lines that are not JSON at all. Dropping the malformed lines leaves exactly the records in application_logs.",
    "Lesson edition: application_logs_raw lines 4, 8 and 12 are the malformed ones (truncated, missing brace, plain text).",
    "traces: the root span (parent_span_id empty) is the request itself; child spans start inside their parent and end before it.",
    "service_metrics is computed from api_requests: requests and 5xx errors per service in each 5-minute window, latency percentiles by nearest rank. Windows with no requests have no row.",
    "error_events.request_id is set when the error happened while answering a request; device_id is set for iot-gateway device errors. Lesson and practice device ids (DEV-0001 …) are stand-alone and are not PS-D09 devices; in the project edition device_id is always a PS-D09 project device (DEV-001 … DEV-018), in error_events and in application_logs attributes alike.",
    "Deployment incident in practice and project: checkout-api 2.14.0 raised 5xx errors and latency until it was rolled back about 35 minutes later (outcome rolled_back), then 2.13.2 was redeployed.",
    "Data skew: in practice about 55% of requests are GET /v1/catalog/items on catalog-api; in project about 70%. Grouping or joining by endpoint puts most rows in one partition.",
    "Practice edition: user_agent is missing (null) on about 1% of requests.",
    "Project edition problem 1: about 1% of application_logs records were shipped twice (same log_id, identical row), and they appear twice in application_logs_raw too.",
    "Project edition problem 2: about 2% of application_logs_raw lines are malformed.",
    "Project edition problem 3: requests the client abandoned have status_code 499 and an empty (null) latency_ms; they are not server errors.",
    "Project edition and PS-D09 (P10): it covers 2026-05-12 00:00 to 24:00 UTC, inside PS-D09's project days (2026-05-11 to 05-13, also UTC). Every sensor talks to the platform only through iot-gateway, and no iot-gateway request names a device while that device is under maintenance in PS-D09.",
    "Project edition and PS-D09 (P10): each PS-D09 maintenance visit that starts that day has one HeartbeatMissed error (no request) for its device 10 minutes after started_at, and each PS-D09 glitch reading (temperature_c 999.0 or humidity_pct 255.0) that first arrived that day has one OutOfRangeReading error (no request) for its device at that arrival_time. Other devices' errors are tied to iot-gateway requests.",
]

# service → [(method, endpoint, weight, median latency ms, response bytes)]
ENDPOINTS = {
    "catalog-api": [("GET", "/v1/catalog/items", 0, 45, 18000), ("GET", "/v1/catalog/items/{sku}", 8, 30, 4200)],
    "checkout-api": [("POST", "/v1/checkout", 12, 220, 1600), ("POST", "/v1/payments/authorize", 8, 340, 900)],
    "auth-service": [("POST", "/v1/auth/token", 7, 60, 700), ("POST", "/v1/auth/refresh", 5, 35, 650)],
    "search-api": [("GET", "/v1/search", 10, 120, 9500)],
    "iot-gateway": [("POST", "/v1/devices/{device_id}/telemetry", 8, 25, 120), ("GET", "/v1/devices/{device_id}/status", 3, 40, 800)],
    "notification-worker": [("POST", "/internal/notify", 4, 80, 300)],
}
SERVICES = sorted(ENDPOINTS)
USER_AGENTS = [
    ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36", 30),
    ("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15", 15),
    ("RuntimeShop-iOS/4.12.0 (iPhone; iOS 17.5)", 18),
    ("RuntimeShop-Android/4.11.2 (Android 14)", 16),
    ("okhttp/4.12.0", 6),
    ("python-requests/2.32.3", 4),
    ("curl/8.7.1", 2),
]
DEVICE_AGENT = "SensorHub-Agent/2.3 (firmware 1.8.4)"
REGIONS = ["us-east", "us-west", "eu-west", "ap-south"]
REGION_W = [40, 20, 28, 12]
HOSTS = {s: [f"{s}-{h}" for h in ("7f9c2", "a41d8", "c03be")] for s in SERVICES}
PROVIDERS = ["cardpay", "walletly", "banklink"]


def hexid(rng: random.Random, n: int) -> str:
    return f"{rng.getrandbits(n * 4):0{n}x}"


def latency(rng: random.Random, median: int, slow: float = 1.0) -> int:
    return max(1, int(rng.lognormvariate(0, 0.55) * median * slow))


def pct(values: list[int], p: int) -> int:
    """Nearest-rank percentile: the smallest value with at least p% of values at or below it."""
    s = sorted(values)
    return s[max(1, -(-p * len(s) // 100)) - 1]


def maintained(fleet: dict | None, device: str, t: datetime) -> bool:
    return bool(fleet) and any(m["device_id"] == device and m["started_at"] <= t <= m["ended_at"] for m in fleet["maintenance_events"])


def build(rng: random.Random, start: datetime, hours: int, requests: int, skew: float, devices: int, incident_at: timedelta,
          null_agent: float, abandoned: float, fleet: dict | None = None) -> dict:
    """`fleet` (project only) is PS-D09's project edition: devices then come from it instead of DEV-0001 … DEV-<devices>."""
    end = start + timedelta(hours=hours)
    bad_from, bad_to = start + incident_at, start + incident_at + timedelta(minutes=35)
    choices = [(s, m, e, w, med, b) for s in SERVICES for m, e, w, med, b in ENDPOINTS[s] if w > 0]
    total_w = sum(c[3] for c in choices)
    times = sorted(start + timedelta(milliseconds=rng.randint(0, hours * 3600 * 1000 - 1)) for _ in range(requests))
    reqs = []
    for i, t in enumerate(times, 1):
        if rng.random() < skew:
            s, m, e, med, b = "catalog-api", "GET", "/v1/catalog/items", 45, 18000
        else:
            s, m, e, _, med, b = rng.choices(choices, [c[3] / total_w for c in choices])[0]
        bad = s == "checkout-api" and bad_from <= t < bad_to
        r = rng.random()
        status = 500 if bad and r < 0.6 else 503 if r < 0.004 else 502 if r < 0.006 else 401 if r < 0.03 and s == "auth-service" else \
            404 if r < 0.05 else 429 if r < 0.06 else 400 if r < 0.07 else 201 if m == "POST" and s != "auth-service" else 200
        lat = latency(rng, med, 3.0 if bad else 1.0)
        if status == 503:
            lat = 30000
        agent = DEVICE_AGENT if s == "iot-gateway" else "RuntimeNotify/1.0" if s == "notification-worker" else \
            rng.choices([u for u, _ in USER_AGENTS], [w for _, w in USER_AGENTS])[0]
        if abandoned and rng.random() < abandoned:
            status, lat = 499, None
        reqs.append({
            "request_id": f"REQ-{i:06d}", "trace_id": hexid(rng, 16), "requested_at": t, "service": s, "method": m, "endpoint": e,
            "status_code": status, "latency_ms": lat, "bytes_sent": 0 if status >= 400 else int(b * rng.uniform(0.6, 1.5)),
            "user_agent": None if rng.random() < null_agent else agent, "client_region": rng.choices(REGIONS, REGION_W)[0],
            "_device": (pick_device(rng, fleet, t) if fleet else f"DEV-{rng.randint(1, devices):04d}") if s == "iot-gateway" else None,
        })
    deps = make_deployments(rng, start, bad_from, bad_to)
    errs = make_errors(rng, reqs, start, end, devices, fleet)
    logs = make_logs(rng, reqs, deps, errs)
    return {"api_requests": reqs, "application_logs": logs, "traces": make_traces(rng, reqs, 0.1 if requests < 3000 else 0.05),
            "deployments": deps, "service_metrics": make_metrics(rng, reqs), "error_events": errs}


def make_deployments(rng: random.Random, start: datetime, bad_from: datetime, bad_to: datetime) -> list[dict]:
    rows = [
        ("catalog-api", "3.8.1", start - timedelta(days=2, hours=3), "platform-team", "succeeded"),
        ("auth-service", "1.22.0", start - timedelta(days=1, hours=5), "identity-team", "succeeded"),
        ("checkout-api", "2.13.2", start - timedelta(days=1, hours=1), "payments-team", "succeeded"),
        ("search-api", "5.0.4", start + timedelta(minutes=rng.randint(10, 60)), "discovery-team", "succeeded"),
        ("checkout-api", "2.14.0", bad_from, "payments-team", "rolled_back"),
        ("checkout-api", "2.13.2", bad_to, "payments-team", "succeeded"),
        ("iot-gateway", "0.19.3", bad_to + timedelta(minutes=rng.randint(40, 90)), "devices-team", "succeeded"),
        ("notification-worker", "1.4.7", start - timedelta(hours=6), "platform-team", "succeeded"),
    ]
    rows.sort(key=lambda r: r[2])
    return [{"deployment_id": f"DEP-{i:04d}", "service": s, "version": v, "environment": "production", "deployed_at": t,
             "deployed_by": by, "outcome": o} for i, (s, v, t, by, o) in enumerate(rows, 1)]


ERROR_TYPES = {
    500: ("UpstreamError", "payment authorizer returned an unexpected response"),
    502: ("BadGateway", "upstream connection reset by peer"),
    503: ("ServiceUnavailable", "request timed out waiting for a free worker"),
}
DEVICE_ERRORS = [("TelemetryRejected", "payload failed schema validation", "warning"),
                 ("DeviceAuthFailed", "device certificate expired", "error"),
                 ("ClockSkew", "device clock more than 5 minutes off server time", "warning"),
                 ("PayloadTooLarge", "telemetry batch over 256 KB", "warning")]


def pick_device(rng: random.Random, fleet: dict, t: datetime) -> str:
    """A PS-D09 device that is not under maintenance at t (a sensor sends nothing while it is serviced)."""
    return rng.choice([d["device_id"] for d in fleet["devices"] if not maintained(fleet, d["device_id"], t)])


def fleet_errors(fleet: dict, start: datetime, end: datetime) -> list[dict]:
    """PS-D09's side of P10: a missed heartbeat per maintenance visit, a range warning per glitch reading."""
    out = []
    for m in fleet["maintenance_events"]:
        t = m["started_at"] + timedelta(minutes=10)
        if start <= m["started_at"] < end and t < end:
            out.append({"occurred_at": t, "service": "iot-gateway", "error_type": "HeartbeatMissed", "error_message": "no heartbeat for 10 minutes",
                        "severity": "warning", "request_id": None, "device_id": m["device_id"]})
    first: dict[str, dict] = {}
    for r in fleet["sensor_readings"]:
        p = r["payload"]
        if p["temperature_c"] == 999.0 or p["humidity_pct"] == 255.0:
            if r["reading_id"] not in first or r["arrival_time"] < first[r["reading_id"]]["arrival_time"]:
                first[r["reading_id"]] = r
    for r in first.values():
        if start <= r["arrival_time"] < end:
            metric = "temperature_c" if r["payload"]["temperature_c"] == 999.0 else "humidity_pct"
            out.append({"occurred_at": r["arrival_time"], "service": "iot-gateway", "error_type": "OutOfRangeReading",
                        "error_message": f"reading {r['reading_id']} has {metric} {r['payload'][metric]}, outside the sensor's range",
                        "severity": "warning", "request_id": None, "device_id": r["device_id"]})
    return out


def make_errors(rng: random.Random, reqs: list[dict], start: datetime, end: datetime, devices: int, fleet: dict | None = None) -> list[dict]:
    out = []
    for r in reqs:
        if r["status_code"] in ERROR_TYPES:
            et, msg = ERROR_TYPES[r["status_code"]]
            out.append({"occurred_at": r["requested_at"] + timedelta(milliseconds=r["latency_ms"] or 0), "service": r["service"],
                        "error_type": et, "error_message": msg, "severity": "critical" if r["status_code"] == 503 else "error",
                        "request_id": r["request_id"], "device_id": r["_device"]})
        elif r["service"] == "iot-gateway" and rng.random() < 0.03:
            et, msg, sev = rng.choice(DEVICE_ERRORS)
            out.append({"occurred_at": r["requested_at"] + timedelta(milliseconds=r["latency_ms"] or 0), "service": "iot-gateway",
                        "error_type": et, "error_message": msg, "severity": sev, "request_id": r["request_id"], "device_id": r["_device"]})
    # Background errors with no request: device heartbeats missed, a notification provider failing.
    span = int((end - start).total_seconds())
    for _ in range(max(3, len(reqs) // 150)):
        t = start + timedelta(seconds=rng.randint(0, span - 1))
        if rng.random() < 0.6:
            if fleet:  # project: heartbeats come from PS-D09 maintenance below, not at random
                continue
            out.append({"occurred_at": t, "service": "iot-gateway", "error_type": "HeartbeatMissed", "error_message": "no heartbeat for 10 minutes",
                        "severity": "warning", "request_id": None, "device_id": f"DEV-{rng.randint(1, devices):04d}"})
        else:
            out.append({"occurred_at": t, "service": "notification-worker", "error_type": "ProviderTimeout",
                        "error_message": "email provider did not answer within 10 s", "severity": "error", "request_id": None, "device_id": None})
    if fleet:
        out += fleet_errors(fleet, start, end)
    out.sort(key=lambda e: (e["occurred_at"], e["service"], e["request_id"] or "", e["device_id"] or ""))
    for i, e in enumerate(out, 1):
        e["error_id"] = f"ERR-{i:05d}"
    return out


def attrs(rng: random.Random, r: dict) -> dict:
    a = {"host": rng.choice(HOSTS[r["service"]]), "region": r["client_region"]}
    s = r["service"]
    if s == "checkout-api":
        a["order_ref"] = f"ord-{rng.randint(100000, 999999)}"
        a["payment_provider"] = rng.choice(PROVIDERS)
    elif s == "catalog-api":
        a["cache"] = rng.choice(["hit", "hit", "hit", "miss"])
        if "{sku}" in r["endpoint"]:
            a["sku"] = f"SKU-{rng.randint(1000, 9999)}"
    elif s == "search-api":
        a["result_count"] = str(rng.choice([0, 3, 12, 25, 48, 100]))
        a["query_terms"] = str(rng.randint(1, 5))
    elif s == "iot-gateway":
        a["device_id"] = r["_device"]
        a["firmware"] = rng.choice(["1.8.4", "1.8.4", "1.9.0"])
    elif s == "auth-service":
        a["grant_type"] = "refresh_token" if "refresh" in r["endpoint"] else "client_credentials"
    else:
        a["channel"] = rng.choice(["email", "push", "sms"])
        a["template"] = rng.choice(["order_shipped", "password_reset", "weekly_digest"])
    return dict(sorted(a.items()))


def make_logs(rng: random.Random, reqs: list[dict], deps: list[dict], errs: list[dict]) -> list[dict]:
    out = []
    for r in reqs:
        lat = r["latency_ms"]
        if r["status_code"] >= 500:
            level, msg = "ERROR", f"{r['method']} {r['endpoint']} failed with {r['status_code']}"
        elif lat is not None and lat > 1000:
            level, msg = "WARN", f"slow request: {r['method']} {r['endpoint']} took {lat} ms"
        elif rng.random() < 0.22:
            level, msg = ("DEBUG" if rng.random() < 0.1 else "INFO"), f"{r['method']} {r['endpoint']} {r['status_code']}"
        else:
            continue
        a = attrs(rng, r)
        if lat is not None:
            a["latency_ms"] = str(lat)
        out.append({"logged_at": r["requested_at"] + timedelta(milliseconds=lat or 0), "level": level, "service": r["service"],
                    "message": msg, "trace_id": r["trace_id"], "attributes": dict(sorted(a.items()))})
    for d in deps:
        out.append({"logged_at": d["deployed_at"], "level": "INFO", "service": d["service"], "message": f"deployed version {d['version']}",
                    "trace_id": None, "attributes": {"deployment_id": d["deployment_id"], "host": HOSTS[d["service"]][0], "version": d["version"]}})
    for e in errs:
        if e["request_id"] is None:
            a = {"host": rng.choice(HOSTS[e["service"]]), "error_type": e["error_type"]}
            if e["device_id"]:
                a["device_id"] = e["device_id"]
            out.append({"logged_at": e["occurred_at"], "level": "WARN" if e["severity"] == "warning" else "ERROR", "service": e["service"],
                        "message": e["error_message"], "trace_id": None, "attributes": dict(sorted(a.items()))})
    lo = min(r["requested_at"] for r in reqs)
    out = [x for x in out if x["logged_at"] >= lo]
    out.sort(key=lambda x: (x["logged_at"], x["service"], x["message"]))
    for i, x in enumerate(out, 1):
        x["log_id"] = f"LOG-{i:06d}"
    return out


def make_traces(rng: random.Random, reqs: list[dict], share: float) -> list[dict]:
    out = []
    downstream = {"checkout-api": ["auth-service", "postgres", "payments-gateway"], "catalog-api": ["redis-cache", "postgres"],
                  "search-api": ["search-index", "redis-cache"], "auth-service": ["postgres"], "iot-gateway": ["timeseries-store"],
                  "notification-worker": ["email-provider"]}
    for r in reqs:
        if r["latency_ms"] is None or rng.random() >= share:
            continue
        root = hexid(rng, 16)
        err = r["status_code"] >= 500
        out.append({"span_id": root, "trace_id": r["trace_id"], "parent_span_id": None, "service": r["service"],
                    "operation": f"{r['method']} {r['endpoint']}", "started_at": r["requested_at"], "duration_ms": r["latency_ms"],
                    "status": "error" if err else "ok"})
        offset = 1
        for k, dep in enumerate(downstream[r["service"]]):
            if offset >= r["latency_ms"] - 1:
                break
            dur = max(1, int((r["latency_ms"] - offset) * rng.uniform(0.2, 0.6)))
            out.append({"span_id": hexid(rng, 16), "trace_id": r["trace_id"], "parent_span_id": root, "service": dep,
                        "operation": {"postgres": "SELECT", "redis-cache": "GET", "search-index": "query", "auth-service": "verify token",
                                      "payments-gateway": "authorize", "timeseries-store": "write", "email-provider": "send"}[dep],
                        "started_at": r["requested_at"] + timedelta(milliseconds=offset), "duration_ms": dur,
                        "status": "error" if err and k == len(downstream[r["service"]]) - 1 else "ok"})
            offset += dur + 1
    return out


def make_metrics(rng: random.Random, reqs: list[dict]) -> list[dict]:
    buckets: dict[tuple, list[dict]] = {}
    for r in reqs:
        t = r["requested_at"]
        w = t.replace(minute=t.minute - t.minute % 5, second=0, microsecond=0)
        buckets.setdefault((r["service"], w), []).append(r)
    out = []
    for (s, w) in sorted(buckets):
        rows = buckets[(s, w)]
        lats = [r["latency_ms"] for r in rows if r["latency_ms"] is not None] or [0]
        n = len(rows)
        out.append({"service": s, "window_start": w, "request_count": n, "error_count": sum(r["status_code"] >= 500 for r in rows),
                    "p50_latency_ms": pct(lats, 50), "p95_latency_ms": pct(lats, 95), "p99_latency_ms": pct(lats, 99),
                    "cpu_pct": round(min(98.0, 8 + n * 0.9 + rng.uniform(0, 6)), 1), "memory_mb": 380 + n * 3 + rng.randint(0, 60)})
    return out


def raw_lines(rng: random.Random, logs: list[dict], share: float, fixed: list[int] | None = None) -> list[str]:
    """Logs as the shipper wrote them, with malformed lines mixed in."""
    def line(x):
        return json.dumps({"log_id": x["log_id"], "logged_at": x["logged_at"].isoformat(), "level": x["level"], "service": x["service"],
                           "message": x["message"], "trace_id": x["trace_id"], "attributes": x["attributes"]}, separators=(",", ":"))

    def bad(kind: int, x: dict) -> str:
        whole = line(x)
        if kind == 0:
            return whole[: len(whole) * 2 // 3]
        if kind == 1:
            return whole[:-1]
        stamp = x["logged_at"].strftime("%Y-%m-%d %H:%M:%S")
        return rng.choice([f"{stamp} WARN {x['service']} connection pool exhausted, retrying in 250 ms",
                           f"{stamp} ERROR {x['service']} Traceback (most recent call last):",
                           f"{stamp} INFO {x['service']} worker started"])
    out = []
    for i, x in enumerate(logs):
        if fixed is not None:
            if i in fixed:
                out.append(bad(fixed.index(i), x))
        elif rng.random() < share:
            out.append(bad(rng.randint(0, 2), x))
        out.append(line(x))
    return out


def lesson() -> dict:
    """Hand-written: twelve requests across services, ten log lines, three broken raw lines."""
    base = datetime(2026, 4, 14, 10, 0)
    rq = [
        # (offset s, service, method, endpoint, status, latency, bytes, agent, region, device)
        (2.1, "catalog-api", "GET", "/v1/catalog/items", 200, 42, 17950, USER_AGENTS[0][0], "us-east", None),
        (5.4, "catalog-api", "GET", "/v1/catalog/items", 200, 38, 18220, USER_AGENTS[2][0], "eu-west", None),
        (9.0, "auth-service", "POST", "/v1/auth/token", 200, 61, 702, USER_AGENTS[3][0], "us-east", None),
        (14.7, "checkout-api", "POST", "/v1/checkout", 201, 236, 1580, USER_AGENTS[2][0], "us-west", None),
        (21.3, "search-api", "GET", "/v1/search", 200, 118, 9410, USER_AGENTS[0][0], "eu-west", None),
        (33.8, "catalog-api", "GET", "/v1/catalog/items/{sku}", 404, 12, 0, USER_AGENTS[1][0], "us-east", None),
        (47.2, "iot-gateway", "POST", "/v1/devices/{device_id}/telemetry", 201, 24, 118, DEVICE_AGENT, "ap-south", "DEV-0003"),
        (58.9, "checkout-api", "POST", "/v1/payments/authorize", 500, 1240, 0, USER_AGENTS[3][0], "us-east", None),
        (66.0, "catalog-api", "GET", "/v1/catalog/items", 200, 51, 18030, USER_AGENTS[4][0], "us-west", None),
        (72.5, "iot-gateway", "POST", "/v1/devices/{device_id}/telemetry", 201, 22, 121, DEVICE_AGENT, "ap-south", "DEV-0001"),
        (81.4, "search-api", "GET", "/v1/search", 200, 162, 10220, USER_AGENTS[1][0], "us-east", None),
        (95.6, "catalog-api", "GET", "/v1/catalog/items", 200, 40, 17780, USER_AGENTS[0][0], "eu-west", None),
    ]
    rng = random.Random(SEED)
    reqs = []
    for i, (off, s, m, e, st, lat, b, ua, reg, dev) in enumerate(rq, 1):
        reqs.append({"request_id": f"REQ-{i:06d}", "trace_id": hexid(rng, 16), "requested_at": base + timedelta(milliseconds=int(off * 1000)),
                     "service": s, "method": m, "endpoint": e, "status_code": st, "latency_ms": lat, "bytes_sent": b, "user_agent": ua,
                     "client_region": reg, "_device": dev})
    by = {r["request_id"]: r for r in reqs}
    deps = [
        {"deployment_id": "DEP-0001", "service": "catalog-api", "version": "3.8.1", "environment": "production", "deployed_at": datetime(2026, 4, 12, 7, 0), "deployed_by": "platform-team", "outcome": "succeeded"},
        {"deployment_id": "DEP-0002", "service": "checkout-api", "version": "2.13.2", "environment": "production", "deployed_at": datetime(2026, 4, 13, 9, 0), "deployed_by": "payments-team", "outcome": "succeeded"},
        {"deployment_id": "DEP-0003", "service": "checkout-api", "version": "2.14.0", "environment": "production", "deployed_at": datetime(2026, 4, 14, 9, 58), "deployed_by": "payments-team", "outcome": "rolled_back"},
        {"deployment_id": "DEP-0004", "service": "checkout-api", "version": "2.13.2", "environment": "production", "deployed_at": datetime(2026, 4, 14, 10, 33), "deployed_by": "payments-team", "outcome": "succeeded"},
    ]
    errs = [
        {"error_id": "ERR-00001", "occurred_at": by["REQ-000008"]["requested_at"] + timedelta(milliseconds=1240), "service": "checkout-api",
         "error_type": "UpstreamError", "error_message": ERROR_TYPES[500][1], "severity": "error", "request_id": "REQ-000008", "device_id": None},
        {"error_id": "ERR-00002", "occurred_at": base + timedelta(seconds=63), "service": "iot-gateway", "error_type": "HeartbeatMissed",
         "error_message": "no heartbeat for 10 minutes", "severity": "warning", "request_id": None, "device_id": "DEV-0002"},
        {"error_id": "ERR-00003", "occurred_at": by["REQ-000010"]["requested_at"] + timedelta(milliseconds=22), "service": "iot-gateway",
         "error_type": "ClockSkew", "error_message": DEVICE_ERRORS[2][1], "severity": "warning", "request_id": "REQ-000010", "device_id": "DEV-0001"},
        {"error_id": "ERR-00004", "occurred_at": base + timedelta(seconds=88), "service": "notification-worker", "error_type": "ProviderTimeout",
         "error_message": "email provider did not answer within 10 s", "severity": "error", "request_id": None, "device_id": None},
    ]
    picked = ["REQ-000001", "REQ-000003", "REQ-000004", "REQ-000005", "REQ-000007", "REQ-000008", "REQ-000010", "REQ-000011"]
    logs = []
    for rid in picked:
        r = by[rid]
        level = "ERROR" if r["status_code"] >= 500 else "WARN" if r["latency_ms"] > 1000 else "INFO"
        msg = f"{r['method']} {r['endpoint']} failed with {r['status_code']}" if level == "ERROR" else f"{r['method']} {r['endpoint']} {r['status_code']}"
        a = attrs(rng, r)
        a["latency_ms"] = str(r["latency_ms"])
        logs.append({"logged_at": r["requested_at"] + timedelta(milliseconds=r["latency_ms"]), "level": level, "service": r["service"],
                     "message": msg, "trace_id": r["trace_id"], "attributes": dict(sorted(a.items()))})
    logs.append({"logged_at": base + timedelta(seconds=63), "level": "WARN", "service": "iot-gateway", "message": "no heartbeat for 10 minutes",
                 "trace_id": None, "attributes": {"device_id": "DEV-0002", "error_type": "HeartbeatMissed", "host": HOSTS["iot-gateway"][1]}})
    logs.append({"logged_at": base + timedelta(seconds=88), "level": "ERROR", "service": "notification-worker",
                 "message": "email provider did not answer within 10 s", "trace_id": None,
                 "attributes": {"error_type": "ProviderTimeout", "host": HOSTS["notification-worker"][0]}})
    logs.sort(key=lambda x: x["logged_at"])
    for i, x in enumerate(logs, 1):
        x["log_id"] = f"LOG-{i:06d}"
    # Raw lines 4, 8, 12 (1-based) are the broken ones: truncated, missing brace, plain text.
    raw = raw_lines(rng, logs, 0.0, fixed=[3, 6, 9])
    traces = make_traces(random.Random(SEED + 10), [by["REQ-000004"], by["REQ-000008"]], 1.0)
    metrics = make_metrics(random.Random(SEED + 11), reqs)
    return {"api_requests": reqs, "application_logs": logs, "application_logs_raw": raw, "traces": traces, "deployments": deps,
            "service_metrics": metrics, "error_events": errs}


def finish(rng: random.Random, ed: dict, malformed: float, dup_logs: float) -> dict:
    if dup_logs:
        logs = []
        for x in ed["application_logs"]:
            logs.append(x)
            if rng.random() < dup_logs:
                logs.append(dict(x))
        ed["application_logs"] = logs
    ed["application_logs_raw"] = raw_lines(rng, ed["application_logs"], malformed)
    for r in ed["api_requests"]:
        r.pop("_device", None)
    return {t: ed[t] for t in SCHEMAS}


def main() -> dict:
    practice = build(random.Random(SEED + 1), datetime(2026, 4, 14, 10, 0), hours=6, requests=2500, skew=0.55, devices=50,
                     incident_at=timedelta(hours=2, minutes=30), null_agent=0.01, abandoned=0.0)
    # P10: the same day and devices as PS-D09's project edition (docs/pyspark/dataset-contracts.md §3).
    project = build(random.Random(SEED + 2), datetime(2026, 5, 12, 0, 0), hours=24, requests=5000, skew=0.70, devices=18,
                    incident_at=timedelta(hours=14, minutes=10), null_agent=0.0, abandoned=0.01, fleet=d09_iot.project())
    les = lesson()
    for r in les["api_requests"]:
        r.pop("_device", None)
    editions = {
        "lesson": {t: les[t] for t in SCHEMAS},
        "practice": finish(random.Random(SEED + 3), practice, malformed=0.01, dup_logs=0.0),
        "project": finish(random.Random(SEED + 4), project, malformed=0.02, dup_logs=0.01),
    }
    return write_dataset(
        dataset_id=DATASET_ID,
        version=VERSION,
        title="Application Logs",
        seed=SEED,
        schemas=SCHEMAS,
        notes=TABLE_NOTES,
        keys=KEYS,
        rules=RULES,
        editions=editions,
        generated_by="services/spark-runner/datasets/d15_logs.py",
        formats=FORMATS,
    )


if __name__ == "__main__":
    m = main()
    for edition, tables in m["editions"].items():
        print(edition, {t: v["rows"] for t, v in tables.items()})
