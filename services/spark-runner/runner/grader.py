"""Compare what a learner's DataFrame contained with the expected result. Trusted, host-side, no Spark.

Checks, in order: the case ran; column names and order; Spark types; rows as a multiset (or a list when the item is
order-sensitive). Feedback for a visible case may quote rows and the learner's error; feedback for a hidden case is
fixed wording plus names taken from the expected result, never anything the learner's code produced (error text,
exception names, column names or types it made up), since those could carry hidden input data back out.
"""

from __future__ import annotations

import json
from collections import Counter

EXAMPLES = 5


def _key(row: list) -> str:
    return json.dumps(row, sort_keys=True)


def _error_text(case: dict) -> str:
    e = case.get("error") or {}
    line = f" (line {e['line']})" if e.get("line") else ""
    return f"{e.get('type', 'Error')}{line}: {e.get('message', '')}".strip()


# What a hidden case may say about a case that didn't produce a result, by the status the run reported.
HIDDEN_STATUS = {
    "runtime-error": "Your code raised an error on this test.",
    "contract-error": "solve() didn't return a DataFrame on this test.",
    "too-many-rows": "Your result has far more rows than it should on this test.",
}
# ...and about a hidden run that ended without results for its cases.
HIDDEN_RUN = {
    "timeout": "Your code ran out of time on the hidden tests.",
    "memory-limit": "Your code used more memory than allowed on the hidden tests.",
    "output-limit": "Your code printed far more output than allowed on the hidden tests.",
    "cancelled": "Stopped.",
}


def hidden_run_message(result: dict | None) -> str:
    return HIDDEN_RUN.get((result or {}).get("status"), "This test didn't run.")


def grade_case(expected: dict, actual: dict, *, order_sensitive: bool, reveal: bool) -> dict:
    """{passed, message[, missing, unexpected]} for one case. `reveal` allows quoting rows and the learner's own error,
    column names and types (visible cases only)."""
    try:
        return _grade(expected, actual, order_sensitive=order_sensitive, reveal=reveal)
    except (KeyError, TypeError, AttributeError, ValueError):
        # The container's report is the learner's claim; one that isn't shaped like a result graded nothing.
        return {"passed": False, "message": "This test didn't produce a readable result."}


def _grade(expected: dict, actual: dict, *, order_sensitive: bool, reveal: bool) -> dict:
    if actual.get("status") != "ok":
        if not reveal:
            return {"passed": False, "message": HIDDEN_STATUS.get(actual.get("status"), "This test didn't run.")}
        return {"passed": False, "message": _error_text(actual)}

    want = [c["name"] for c in expected["schema"]]
    got = [c["name"] for c in actual["schema"]]
    missing = [c for c in want if c not in got]
    extra = [c for c in got if c not in want]
    if missing or extra:
        parts = []
        if missing:
            parts.append(f"missing column{'s' if len(missing) > 1 else ''} {', '.join(missing)}")
        if extra:
            # Names the learner chose are shown only where the inputs are public.
            parts.append(f"unexpected column{'s' if len(extra) > 1 else ''} {', '.join(extra)}" if reveal else f"{len(extra)} unexpected column{'s' if len(extra) > 1 else ''}")
        return {"passed": False, "message": "The result has " + " and ".join(parts) + "."}
    if want != got:
        return {"passed": False, "message": f"The columns are in a different order. Expected: {', '.join(want)}."}
    types_want = {c["name"]: c["type"] for c in expected["schema"]}
    for c in actual["schema"]:
        if c["type"] != types_want[c["name"]]:
            got_type = f", but it is {c['type']}" if reveal else ""
            return {"passed": False, "message": f"Column {c['name']} should be {types_want[c['name']]}{got_type}."}

    exp_rows, act_rows = expected["rows"], actual["rows"]
    if order_sensitive:
        if exp_rows == act_rows:
            return {"passed": True, "message": "Matches."}
        if Counter(map(_key, exp_rows)) == Counter(map(_key, act_rows)):
            return {"passed": False, "message": "The right rows, in the wrong order."}

    e, a = Counter(map(_key, exp_rows)), Counter(map(_key, act_rows))
    if e == a and not order_sensitive:
        return {"passed": True, "message": "Matches."}
    absent = e - a
    surplus = a - e
    same_rows = set(e) == set(a)
    if same_rows:
        message = "The right rows, but some appear a different number of times than they should. Check whether duplicates were removed or added."
    elif absent and surplus:
        message = "Some rows that should be kept are missing, and some rows that should be dropped are included."
    elif absent:
        message = "Some rows that should be kept are missing."
    else:
        message = "Some rows that should be dropped are included."
    out = {"passed": False, "message": message}
    if reveal:
        out["missing"] = [json.loads(k) for k in list(absent.elements())[:EXAMPLES]]
        out["unexpected"] = [json.loads(k) for k in list(surplus.elements())[:EXAMPLES]]
    return out
