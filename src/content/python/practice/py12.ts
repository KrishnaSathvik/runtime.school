import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const b = py.bool;
const strs = (...xs: string[]) => py.list(...xs.map(s));
const ints = (...xs: number[]) => py.list(...xs.map((x) => i(x)));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const header = (ok: boolean, missing: string[], unexpected: string[], duplicates: string[]) =>
  rec([["ok", b(ok)], ["missing", strs(...missing)], ["unexpected", strs(...unexpected)], ["duplicates", strs(...duplicates)]]);
const ev = (id: number, ts: string) => rec([["id", i(id)], ["ts", s(ts)]]);
const row = (id: number, value: string, updated: string) => rec([["id", i(id)], ["value", s(value)], ["updated_at", s(updated)]]);
const stats = (inserted: number, updated: number, unchanged: number) => rec([["inserted", i(inserted)], ["updated", i(updated)], ["unchanged", i(unchanged)]]);

const HEADER_DEMO = 'print(check_header(" Order_ID,customer_id,amount,Amount,coupon", ["order_id", "customer_id", "amount", "currency"], ["coupon"]))';

const EVENTS = '[\n    {"id": 5, "ts": "2026-10-14T08:00:00Z"},\n    {"id": 7, "ts": "2026-10-14T08:00:00Z"},\n    {"id": 3, "ts": "2026-10-14T08:00:05Z"},\n    {"id": 6, "ts": "2026-10-14T07:59:59Z"},\n]';
const WATERMARK_DEMO = `events = ${EVENTS}\nselected, mark = events_after(events, ("2026-10-14T08:00:00Z", 5))\nprint([e["id"] for e in selected], mark)\nprint(events_after(events, mark))`;

const UPSERT_DATA =
  'existing = [\n    {"id": 1, "value": "a", "updated_at": "2026-10-01"},\n    {"id": 2, "value": "b", "updated_at": "2026-10-05"},\n]\nbatch = [\n    {"id": 2, "value": "B", "updated_at": "2026-10-06"},\n    {"id": 3, "value": "c", "updated_at": "2026-10-06"},\n    {"id": 1, "value": "old", "updated_at": "2026-09-30"},\n]';
const UPSERT_DEMO = `${UPSERT_DATA}\nrecords, counts = upsert(existing, batch)\nprint([r["value"] for r in records], counts)\nprint(upsert(records, batch)[1])`;

const LOAD_LINES = '["1,9.5", "2,abc", "3", "4,12", "x,1", "5,0.5"]';
const LOAD_DEMO = `loaded, quarantined = load(${LOAD_LINES})\nprint([r["id"] for r in loaded], [q["line_no"] for q in quarantined])`;

const RECONCILE_DATA =
  'source = {"2026-10-12": 100, "2026-10-13": 80, "2026-10-14": 50}\naccepted = {"2026-10-12": 95, "2026-10-13": 80, "2026-10-14": 40, "2026-10-15": 3}\nrejected = {"2026-10-12": 5, "2026-10-14": 9}';
const RECONCILE_DEMO = `${RECONCILE_DATA}\nfor problem in reconcile(source, accepted, rejected):\n    print(problem)`;

const MANIFESTS =
  'previous = {\n    "schema_version": "1",\n    "counts": {"rows_in": 1000, "accepted": 980, "rejected": 20},\n    "checks": {"no_nulls": "pass", "unique_ids": "pass"},\n}\ncurrent = {\n    "schema_version": "1",\n    "counts": {"rows_in": 1050, "accepted": 735, "rejected": 315},\n    "checks": {"no_nulls": "pass", "unique_ids": "fail", "fresh": "fail"},\n}';
const MANIFEST_DEMO = `${MANIFESTS}\nfor alert in compare_manifests(previous, current):\n    print(alert)`;

const SINK =
  'class FlakySink:\n    """Fails once for each id in fail_on, like a dropped connection."""\n\n    def __init__(self, fail_on=()):\n        self.rows = []\n        self.fail_on = set(fail_on)\n\n    def write(self, row):\n        if row["id"] in self.fail_on:\n            self.fail_on.discard(row["id"])\n            raise ConnectionError(f"lost connection writing {row[\'id\']}")\n        self.rows.append(row)';
const RETRY_DEMO = 'rows = [{"id": n} for n in [1, 2, 3, 4]]\nsink = FlakySink(fail_on=[3])\nprint(run_batch(rows, sink), [r["id"] for r in sink.rows])';

const PARTITION_DEMO = 'print(partition_key("2026-10-14T23:30:00-02:00"))\nprint(partition_key("2026-10-14T00:15:00+01:00"))';

const QUALITY_ROWS =
  'rows = [\n    {"id": 1, "email": "a@x", "amount": 5},\n    {"id": 2, "email": "", "amount": -1},\n    {"id": 3, "email": "c@x", "amount": 0},\n    {"id": 4, "email": None, "amount": 3},\n    {"id": 5, "email": "", "amount": 2},\n    {"id": 6, "email": "", "amount": 7},\n]\nRULES = [\n    ("has_email", lambda r: bool(r.get("email"))),\n    ("positive_amount", lambda r: r["amount"] > 0),\n    ("has_id", lambda r: r.get("id") is not None),\n]';
const QUALITY_JSON = JSON.stringify(
  {
    failed_rows: 5,
    rows: 6,
    rules: {
      has_email: { failures: 4, sample_ids: [2, 4, 5] },
      has_id: { failures: 0, sample_ids: [] },
      positive_amount: { failures: 2, sample_ids: [2, 3] },
    },
  },
  null,
  2,
);
const QUALITY_DEMO = `${QUALITY_ROWS}\nreport = quality_report(rows, RULES)\nprint(report.splitlines()[0:3])`;

export const py12: PyQuestion[] = [
  {
    ref: "python:bank:py12-01",
    slug: "py12-01",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "Check a feed's header against its contract",
    topics: ["contracts", "normalization", "duplicates"],
    minutes: 8,
    after: "python:define-input-and-output-contracts",
    prompt:
      "Before reading any rows, a pipeline checks the CSV header. Write `check_header(header_line, required, optional=())`. Compare column names after stripping spaces and lowercasing. Return `{\"ok\": ..., \"missing\": [...], \"unexpected\": [...], \"duplicates\": [...]}`:\n\n- `missing`: required names not in the header, in `required` order\n- `unexpected`: header names that are neither required nor optional, in header order, each once\n- `duplicates`: names that appear more than once, in the order they first repeat, each once\n- `ok`: `True` only if all three lists are empty",
    expectedOutput: "{'ok': False, 'missing': ['currency'], 'unexpected': [], 'duplicates': ['amount']}\n",
    looksFor: ["Names are compared after strip and lower.", "Every list is in the stated order, with no repeats.", "`ok` is `True` only for a clean header."],
    starter: `def check_header(header_line, required, optional=()):\n    pass\n\n\n${HEADER_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "check_header",
          cases: [
            { args: [s(" Order_ID,customer_id,amount,Amount,coupon"), strs("order_id", "customer_id", "amount", "currency"), strs("coupon")], expected: header(false, ["currency"], [], ["amount"]) },
            { args: [s("id,name"), strs("id", "name")], expected: header(true, [], [], []) },
            { args: [s("a,b,c,b"), strs("a")], expected: header(false, [], ["b", "c"], ["b"]) },
            { args: [s("x, y ,X,Y,x"), strs("x", "y", "z")], expected: header(false, ["z"], [], ["x", "y"]), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'ok': False, 'missing': ['currency'], 'unexpected': [], 'duplicates': ['amount']}\n" },
      ],
    },
    hints: ['names = [n.strip().lower() for n in header_line.split(",")].', "Walk names once with a seen set: a name already in seen is a duplicate (add it once).", "missing comes from required; unexpected from names not in required or optional."],
    answer:
      'def check_header(header_line, required, optional=()):\n    names = [name.strip().lower() for name in header_line.split(",")]\n    allowed = set(required) | set(optional)\n    seen = set()\n    duplicates = []\n    unexpected = []\n    for name in names:\n        if name in seen:\n            if name not in duplicates:\n                duplicates.append(name)\n            continue\n        seen.add(name)\n        if name not in allowed:\n            unexpected.append(name)\n    missing = [name for name in required if name not in seen]\n    ok = not (missing or unexpected or duplicates)\n    return {"ok": ok, "missing": missing, "unexpected": unexpected, "duplicates": duplicates}\n\n\n' + HEADER_DEMO,
    wrong: [
      { code: `def check_header(header_line, required, optional=()):\n    names = [name.strip() for name in header_line.split(",")]\n    allowed = set(required) | set(optional)\n    missing = [n for n in required if n not in names]\n    unexpected = [n for n in names if n not in allowed]\n    duplicates = []\n    for n in names:\n        if names.count(n) > 1 and n not in duplicates:\n            duplicates.append(n)\n    return {"ok": not (missing or unexpected or duplicates), "missing": missing, "unexpected": unexpected, "duplicates": duplicates}\n\n\n${HEADER_DEMO}\n`, fails: ["fn", "output"] },
      { code: `def check_header(header_line, required, optional=()):\n    names = [name.strip().lower() for name in header_line.split(",")]\n    allowed = set(required) | set(optional)\n    missing = [n for n in required if n not in names]\n    unexpected = [n for n in names if n not in allowed]\n    duplicates = [n for n in names if names.count(n) > 1]\n    return {"ok": not (missing or unexpected or duplicates), "missing": missing, "unexpected": unexpected, "duplicates": duplicates}\n\n\n${HEADER_DEMO}\n`, fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py12-02",
    slug: "py12-02",
    module: "pipelines",
    kind: "predict",
    difficulty: "hard",
    title: "Predict: a deterministic event ID",
    topics: ["hashlib", "canonical JSON", "idempotence"],
    minutes: 5,
    after: "python:incremental-processing-and-idempotence",
    prompt:
      "To recognise the same event across runs, a pipeline derives its ID from the content. (Python's built-in `hash()` of a string changes between runs, so it can't be used for this.) What does this program print?",
    code: 'import hashlib\nimport json\n\n\ndef event_id(payload):\n    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))\n    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:12]\n\n\na = {"user": "u1", "type": "view", "ts": "2026-10-14T08:00:00Z"}\nb = {"ts": "2026-10-14T08:00:00Z", "type": "view", "user": "u1"}\nc = {"user": "u1", "type": "view", "ts": "2026-10-14T08:00:01Z"}\n\nprint(event_id(a) == event_id(b), event_id(a) == event_id(c))\nprint(json.dumps(a, sort_keys=True, separators=(",", ":")))\nprint(len(event_id(a)), event_id(a) == event_id(dict(a)))',
    output: 'True False\n{"ts":"2026-10-14T08:00:00Z","type":"view","user":"u1"}\n12 True\n',
    explanation:
      "`sort_keys=True` writes the keys in the same order whatever order the dictionary was built in, and the compact separators remove spaces, so `a` and `b` produce identical text and therefore the same hash. `c` differs by one second, so its hash differs completely. The ID is the first 12 hex characters of the SHA-256 digest, the same on every run and machine.",
    hints: ["Do a and b contain the same keys and values?", "What does sort_keys=True do to the order of keys in the text?"],
    wrong: ['False False\n{"user":"u1","type":"view","ts":"2026-10-14T08:00:00Z"}\n12 True', 'True False\n{"ts": "2026-10-14T08:00:00Z", "type": "view", "user": "u1"}\n12 True'],
  },
  {
    ref: "python:bank:py12-03",
    slug: "py12-03",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "A watermark that survives timestamp ties",
    topics: ["watermarks", "tuples", "incremental loads"],
    minutes: 10,
    after: "python:incremental-processing-and-idempotence",
    prompt:
      "Several events can share a timestamp, so a timestamp alone can't say where the last run stopped. Use a **composite watermark** `(ts, id)`. Write `events_after(events, watermark)` returning a tuple: the events whose `(ts, id)` is **greater than** the watermark, sorted by `(ts, id)`, and the new watermark: the `(ts, id)` of the last selected event, or the old watermark if none were selected. `None` means first run: take everything. All `ts` values use the same `YYYY-MM-DDTHH:MM:SSZ` format, so they compare correctly as text.",
    expectedOutput: "[7, 3] ('2026-10-14T08:00:05Z', 3)\n([], ('2026-10-14T08:00:05Z', 3))\n",
    looksFor: ["An event with the watermark's timestamp but a higher id is picked up.", "The event at the watermark itself isn't processed twice.", "Running again with the new watermark selects nothing.", "`None` selects everything, sorted."],
    starter: `def events_after(events, watermark):\n    pass\n\n\n${WATERMARK_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "events_after",
          cases: [
            { args: [py.list(ev(5, "2026-10-14T08:00:00Z"), ev(7, "2026-10-14T08:00:00Z"), ev(3, "2026-10-14T08:00:05Z"), ev(6, "2026-10-14T07:59:59Z")), py.tuple(s("2026-10-14T08:00:00Z"), i(5))], expected: py.tuple(py.list(ev(7, "2026-10-14T08:00:00Z"), ev(3, "2026-10-14T08:00:05Z")), py.tuple(s("2026-10-14T08:00:05Z"), i(3))) },
            { args: [py.list(ev(2, "2026-10-14T08:00:00Z"), ev(1, "2026-10-14T08:00:00Z")), py.none], expected: py.tuple(py.list(ev(1, "2026-10-14T08:00:00Z"), ev(2, "2026-10-14T08:00:00Z")), py.tuple(s("2026-10-14T08:00:00Z"), i(2))) },
            { args: [py.list(), py.tuple(s("2026-10-14T08:00:00Z"), i(5))], expected: py.tuple(py.list(), py.tuple(s("2026-10-14T08:00:00Z"), i(5))) },
            { args: [py.list(ev(9, "2026-10-14T09:00:00Z")), py.tuple(s("2026-10-14T09:00:00Z"), i(9))], expected: py.tuple(py.list(), py.tuple(s("2026-10-14T09:00:00Z"), i(9))), hidden: true },
            { args: [py.list(ev(1, "2026-10-14T09:00:01Z"), ev(10, "2026-10-14T09:00:00Z")), py.tuple(s("2026-10-14T09:00:00Z"), i(9))], expected: py.tuple(py.list(ev(10, "2026-10-14T09:00:00Z"), ev(1, "2026-10-14T09:00:01Z")), py.tuple(s("2026-10-14T09:00:01Z"), i(1))), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[7, 3] ('2026-10-14T08:00:05Z', 3)\n([], ('2026-10-14T08:00:05Z', 3))\n" },
      ],
    },
    hints: ["Tuples compare item by item: (ts, id) > (wm_ts, wm_id) handles the tie on ts.", 'key = lambda e: (e["ts"], e["id"]); keep events with key(e) > watermark (or all if watermark is None).', "Sort the kept events with that key; the new watermark is key(last) if any were kept."],
    answer: `def events_after(events, watermark):\n    def key(event):\n        return (event["ts"], event["id"])\n\n    selected = sorted((e for e in events if watermark is None or key(e) > tuple(watermark)), key=key)\n    new_mark = key(selected[-1]) if selected else watermark\n    return selected, new_mark\n\n\n${WATERMARK_DEMO}`,
    wrong: [
      { code: `def events_after(events, watermark):\n    selected = sorted((e for e in events if watermark is None or e["ts"] > watermark[0]), key=lambda e: (e["ts"], e["id"]))\n    new_mark = (selected[-1]["ts"], selected[-1]["id"]) if selected else watermark\n    return selected, new_mark\n\n\n${WATERMARK_DEMO}\n`, fails: ["fn", "output"], why: "Event 7 shares the watermark's timestamp and is never processed." },
      { code: `def events_after(events, watermark):\n    selected = sorted((e for e in events if watermark is None or e["ts"] >= watermark[0]), key=lambda e: (e["ts"], e["id"]))\n    new_mark = (selected[-1]["ts"], selected[-1]["id"]) if selected else watermark\n    return selected, new_mark\n\n\n${WATERMARK_DEMO}\n`, fails: ["fn", "output"], why: "Event 5 was already processed last run, and comes through again." },
    ],
  },
  {
    ref: "python:bank:py12-04",
    slug: "py12-04",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "An idempotent upsert",
    topics: ["idempotence", "upsert", "dictionaries"],
    minutes: 10,
    after: "python:incremental-processing-and-idempotence",
    prompt:
      "Write `upsert(existing, batch)` merging a batch into existing records keyed by `id`. A new id is **inserted**; a known id is **updated** only if the batch record's `updated_at` is later; otherwise it's **unchanged**. Process the batch in order. Return a tuple: a new list of records sorted by `id`, and `{\"inserted\": n, \"updated\": n, \"unchanged\": n}`. Don't modify the inputs. Running the same batch again must change nothing.",
    expectedOutput: "['a', 'B', 'c'] {'inserted': 1, 'updated': 1, 'unchanged': 1}\n{'inserted': 0, 'updated': 0, 'unchanged': 3}\n",
    looksFor: ["Newer records replace older ones; older or equal ones don't.", "Re-running the same batch reports everything unchanged.", "The input lists and dictionaries are untouched."],
    starter: `def upsert(existing, batch):\n    pass\n\n\n${UPSERT_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "upsert",
          cases: [
            {
              args: [py.list(row(1, "a", "2026-10-01"), row(2, "b", "2026-10-05")), py.list(row(2, "B", "2026-10-06"), row(3, "c", "2026-10-06"), row(1, "old", "2026-09-30"))],
              expected: py.tuple(py.list(row(1, "a", "2026-10-01"), row(2, "B", "2026-10-06"), row(3, "c", "2026-10-06")), stats(1, 1, 1)),
            },
            { args: [py.list(row(1, "a", "2026-10-01")), py.list(row(1, "same", "2026-10-01"))], expected: py.tuple(py.list(row(1, "a", "2026-10-01")), stats(0, 0, 1)) },
            { args: [py.list(), py.list(row(4, "x", "2026-10-01"), row(4, "y", "2026-10-02"))], expected: py.tuple(py.list(row(4, "y", "2026-10-02")), stats(1, 1, 0)), hidden: true },
          ],
        },
        { kind: "expr", id: "rerun", label: "Running the same batch twice changes nothing the second time", show: "upsert(upsert(existing, batch)[0], batch)", expr: `${UPSERT_DATA}\nfirst, _ = upsert(existing, batch)\nsecond, counts = upsert(first, batch)\nresult = (second == first, counts)`, expected: py.tuple(b(true), stats(0, 0, 3)) },
        { kind: "expr", id: "untouched", label: "The inputs aren't modified", show: "existing after upsert(existing, batch)", expr: `${UPSERT_DATA}\nupsert(existing, batch)\nresult = [r["value"] for r in existing] + [len(existing)]`, expected: py.list(s("a"), s("b"), i(2)), tip: "Copy each record (dict(record)) into your index instead of updating the caller's dictionaries." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "['a', 'B', 'c'] {'inserted': 1, 'updated': 1, 'unchanged': 1}\n{'inserted': 0, 'updated': 0, 'unchanged': 3}\n" },
      ],
    },
    hints: ['Build index = {r["id"]: dict(r) for r in existing}.', 'For each incoming record: not in index → insert; record["updated_at"] > index[id]["updated_at"] → replace; else unchanged.', 'Return sorted(index.values(), key=lambda r: r["id"]) and the counts.'],
    answer: `def upsert(existing, batch):\n    index = {record["id"]: dict(record) for record in existing}\n    counts = {"inserted": 0, "updated": 0, "unchanged": 0}\n    for record in batch:\n        current = index.get(record["id"])\n        if current is None:\n            index[record["id"]] = dict(record)\n            counts["inserted"] += 1\n        elif record["updated_at"] > current["updated_at"]:\n            index[record["id"]] = dict(record)\n            counts["updated"] += 1\n        else:\n            counts["unchanged"] += 1\n    return sorted(index.values(), key=lambda r: r["id"]), counts\n\n\n${UPSERT_DEMO}`,
    wrong: [
      { code: `def upsert(existing, batch):\n    index = {record["id"]: dict(record) for record in existing}\n    counts = {"inserted": 0, "updated": 0, "unchanged": 0}\n    for record in batch:\n        if record["id"] in index:\n            counts["updated"] += 1\n        else:\n            counts["inserted"] += 1\n        index[record["id"]] = dict(record)\n    return sorted(index.values(), key=lambda r: r["id"]), counts\n\n\n${UPSERT_DEMO}\n`, fails: ["fn", "rerun", "output"], why: "Last write wins: the stale 'old' record overwrites 'a', and a rerun reports updates." },
      { code: `def upsert(existing, batch):\n    index = {record["id"]: record for record in existing}\n    counts = {"inserted": 0, "updated": 0, "unchanged": 0}\n    for record in batch:\n        current = index.get(record["id"])\n        if current is None:\n            index[record["id"]] = record\n            counts["inserted"] += 1\n        elif record["updated_at"] > current["updated_at"]:\n            current.update(record)\n            counts["updated"] += 1\n        else:\n            counts["unchanged"] += 1\n    return sorted(index.values(), key=lambda r: r["id"]), counts\n\n\n${UPSERT_DEMO}\n`, fails: ["untouched"] },
    ],
  },
  {
    ref: "python:bank:py12-05",
    slug: "py12-05",
    module: "pipelines",
    kind: "debug",
    difficulty: "hard",
    title: "Debug: one bad line stops the load",
    topics: ["try placement", "quarantine", "partial success"],
    minutes: 8,
    after: "python:data-quality-rules-and-rejections",
    prompt:
      "`load(lines)` parses `\"id,amount\"` lines into `{\"id\": int, \"amount\": float}` records. A line that can't be parsed should go to quarantine as `{\"line_no\": n, \"line\": text, \"error\": message}` (line numbers start at 1) **and the load should carry on**. Right now the first bad line ends the whole load, and the good lines after it are lost. Fix it.",
    expectedOutput: "[1, 4, 5] [2, 3, 5]\n",
    looksFor: ["Every good line is loaded, including those after a bad one.", "Each bad line is quarantined once, with its 1-based line number and text.", "The error message explains what went wrong (it isn't empty)."],
    starter: `def load(lines):\n    loaded = []\n    quarantined = []\n    try:\n        for line_no, line in enumerate(lines, start=1):\n            order_id, amount = line.split(",")\n            loaded.append({"id": int(order_id), "amount": float(amount)})\n    except ValueError as error:\n        quarantined.append({"line_no": line_no, "line": line, "error": str(error)})\n    return loaded, quarantined\n\n\n${LOAD_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "loaded", label: "Every good line is loaded", show: `load(${LOAD_LINES})[0]`, expr: `result = load(${LOAD_LINES})[0]`, expected: py.list(rec([["id", i(1)], ["amount", f(9.5)]]), rec([["id", i(4)], ["amount", f(12)]]), rec([["id", i(5)], ["amount", f(0.5)]])) },
        { kind: "expr", id: "quarantined", label: "Each bad line is quarantined with its number and text", show: `load(${LOAD_LINES})[1]`, expr: `result = [(q["line_no"], q["line"]) for q in load(${LOAD_LINES})[1]]`, expected: py.list(py.tuple(i(2), s("2,abc")), py.tuple(i(3), s("3")), py.tuple(i(5), s("x,1"))) },
        { kind: "expr", id: "messages", label: "Every quarantine entry has a message", show: "the error field of each quarantined line", expr: `result = all(isinstance(q["error"], str) and q["error"] for q in load(${LOAD_LINES})[1])`, expected: b(true) },
        { kind: "expr", id: "all-bad", label: "All bad lines", hidden: true, expr: 'result = [len(part) for part in load(["a", "b,c", ""])]', expected: ints(0, 3) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[1, 4, 5] [2, 3, 5]\n" },
      ],
    },
    hints: ["Where does control go after the except? Out of the loop, which is why the load stops.", "Move the try inside the for loop, around one line's parsing.", "The except then quarantines that line and the loop moves on to the next."],
    answer: `def load(lines):\n    loaded = []\n    quarantined = []\n    for line_no, line in enumerate(lines, start=1):\n        try:\n            order_id, amount = line.split(",")\n            record = {"id": int(order_id), "amount": float(amount)}\n        except ValueError as error:\n            quarantined.append({"line_no": line_no, "line": line, "error": str(error)})\n            continue\n        loaded.append(record)\n    return loaded, quarantined\n\n\n${LOAD_DEMO}`,
    wrong: [
      { code: `def load(lines):\n    loaded = []\n    quarantined = []\n    for line_no, line in enumerate(lines):\n        try:\n            order_id, amount = line.split(",")\n            loaded.append({"id": int(order_id), "amount": float(amount)})\n        except ValueError as error:\n            quarantined.append({"line_no": line_no, "line": line, "error": str(error)})\n    return loaded, quarantined\n\n\n${LOAD_DEMO}\n`, fails: ["quarantined", "output"], why: "enumerate starts at 0 unless told otherwise." },
      { code: `def load(lines):\n    loaded = []\n    quarantined = []\n    for line_no, line in enumerate(lines, start=1):\n        try:\n            order_id, amount = line.split(",")\n            loaded.append({"id": int(order_id), "amount": float(amount)})\n        except ValueError:\n            quarantined.append({"line_no": line_no, "line": line, "error": ""})\n    return loaded, quarantined\n\n\n${LOAD_DEMO}\n`, fails: ["messages"] },
    ],
  },
  {
    ref: "python:bank:py12-06",
    slug: "py12-06",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "Reconcile counts per partition",
    topics: ["reconciliation", "dictionaries", "set union"],
    minutes: 8,
    after: "python:pipeline-tests-and-observability",
    prompt:
      "A run reports row counts per date partition for its source, accepted and rejected rows (dictionaries from partition to count). Write `reconcile(source, accepted, rejected)` returning a list of problems, sorted by partition, for every partition where `accepted + rejected != source`. A partition missing from a dictionary counts as 0 there, and partitions that appear **only** in the outputs are problems too. Each problem is `{\"partition\", \"source\", \"accepted\", \"rejected\", \"difference\"}` with `difference = source - (accepted + rejected)`.",
    expectedOutput: "{'partition': '2026-10-14', 'source': 50, 'accepted': 40, 'rejected': 9, 'difference': 1}\n{'partition': '2026-10-15', 'source': 0, 'accepted': 3, 'rejected': 0, 'difference': -3}\n",
    looksFor: ["Partitions from all three dictionaries are checked.", "Missing counts are treated as 0, not an error.", "Only mismatched partitions are reported, in partition order."],
    starter: `def reconcile(source, accepted, rejected):\n    pass\n\n\n${RECONCILE_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "reconcile",
          cases: [
            {
              args: [rec([["2026-10-12", i(100)], ["2026-10-13", i(80)], ["2026-10-14", i(50)]]), rec([["2026-10-12", i(95)], ["2026-10-13", i(80)], ["2026-10-14", i(40)], ["2026-10-15", i(3)]]), rec([["2026-10-12", i(5)], ["2026-10-14", i(9)]])],
              expected: py.list(
                rec([["partition", s("2026-10-14")], ["source", i(50)], ["accepted", i(40)], ["rejected", i(9)], ["difference", i(1)]]),
                rec([["partition", s("2026-10-15")], ["source", i(0)], ["accepted", i(3)], ["rejected", i(0)], ["difference", i(-3)]]),
              ),
            },
            { args: [rec([["p", i(2)]]), rec([["p", i(2)]]), py.dict([])], expected: py.list() },
            { args: [rec([["b", i(5)], ["a", i(1)]]), py.dict([]), rec([["c", i(2)]])], expected: py.list(rec([["partition", s("a")], ["source", i(1)], ["accepted", i(0)], ["rejected", i(0)], ["difference", i(1)]]), rec([["partition", s("b")], ["source", i(5)], ["accepted", i(0)], ["rejected", i(0)], ["difference", i(5)]]), rec([["partition", s("c")], ["source", i(0)], ["accepted", i(0)], ["rejected", i(2)], ["difference", i(-2)]])), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'partition': '2026-10-14', 'source': 50, 'accepted': 40, 'rejected': 9, 'difference': 1}\n{'partition': '2026-10-15', 'source': 0, 'accepted': 3, 'rejected': 0, 'difference': -3}\n" },
      ],
    },
    hints: ["The partitions to check are the union of all three dictionaries' keys: set(source) | set(accepted) | set(rejected).", "dict.get(partition, 0) treats a missing partition as 0.", "Loop over sorted(partitions) and append a problem only when the counts don't add up."],
    answer: `def reconcile(source, accepted, rejected):\n    problems = []\n    for partition in sorted(set(source) | set(accepted) | set(rejected)):\n        counts = {\n            "source": source.get(partition, 0),\n            "accepted": accepted.get(partition, 0),\n            "rejected": rejected.get(partition, 0),\n        }\n        difference = counts["source"] - (counts["accepted"] + counts["rejected"])\n        if difference != 0:\n            problems.append({"partition": partition, **counts, "difference": difference})\n    return problems\n\n\n${RECONCILE_DEMO}`,
    wrong: [
      { code: `def reconcile(source, accepted, rejected):\n    problems = []\n    for partition in sorted(source):\n        a = accepted.get(partition, 0)\n        r = rejected.get(partition, 0)\n        difference = source[partition] - (a + r)\n        if difference != 0:\n            problems.append({"partition": partition, "source": source[partition], "accepted": a, "rejected": r, "difference": difference})\n    return problems\n\n\n${RECONCILE_DEMO}\n`, fails: ["fn", "output"], why: "Rows that appear from nowhere (2026-10-15) are a problem too." },
      { code: `def reconcile(source, accepted, rejected):\n    problems = []\n    for partition in sorted(set(source) | set(accepted) | set(rejected)):\n        s, a, r = source[partition], accepted[partition], rejected[partition]\n        if s != a + r:\n            problems.append({"partition": partition, "source": s, "accepted": a, "rejected": r, "difference": s - a - r})\n    return problems\n\n\n${RECONCILE_DEMO}\n`, fails: "program" },
    ],
  },
  {
    ref: "python:bank:py12-07",
    slug: "py12-07",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "Compare two run manifests",
    topics: ["manifests", "drift", "alerts"],
    minutes: 10,
    after: "python:pipeline-tests-and-observability",
    prompt:
      "Each run writes a manifest with `schema_version`, `counts` and `checks` (name → `\"pass\"`/`\"fail\"`). Write `compare_manifests(previous, current, tolerance=0.1)` returning a list of alert strings, in this order:\n\n1. `schema_version changed: 1 -> 2` if it changed\n2. for each count name, in sorted order, whose relative change `current / previous - 1` is **more than** `tolerance` either way: `accepted changed by -25.0%` (sign always shown, 1 decimal place). A count going from 0 to anything else: `accepted changed from 0`.\n3. for each check, in sorted order, that fails now but didn't fail before (passing or absent): `check newly failing: unique_ids`\n\nAll counts appear in both manifests.",
    expectedOutput: "accepted changed by -25.0%\nrejected changed by +1475.0%\ncheck newly failing: fresh\ncheck newly failing: unique_ids\n",
    looksFor: ["Changes within the tolerance raise no alert.", "Percentages are signed with one decimal place.", "Only checks that start failing are reported, including new ones.", "Alerts come in the stated order."],
    starter: `def compare_manifests(previous, current, tolerance=0.1):\n    pass\n\n\n${MANIFEST_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "Alerts for the demo manifests", show: "compare_manifests(previous, current)", expr: `${MANIFESTS}\nresult = compare_manifests(previous, current)`, expected: strs("accepted changed by -25.0%", "rejected changed by +1475.0%", "check newly failing: fresh", "check newly failing: unique_ids") },
        { kind: "expr", id: "schema-zero", label: "Schema changes and counts from zero", show: "compare_manifests with schema 1 -> 2 and rejected 0 -> 4", expr: 'result = compare_manifests({"schema_version": "1", "counts": {"rejected": 0, "rows_in": 100}, "checks": {}}, {"schema_version": "2", "counts": {"rejected": 4, "rows_in": 105}, "checks": {}})', expected: strs("schema_version changed: 1 -> 2", "rejected changed from 0") },
        { kind: "expr", id: "quiet", label: "Nothing to report", hidden: true, expr: 'result = compare_manifests({"schema_version": "3", "counts": {"rows_in": 100, "rejected": 0}, "checks": {"a": "fail"}}, {"schema_version": "3", "counts": {"rows_in": 91, "rejected": 0}, "checks": {"a": "fail"}})', expected: py.list() },
        { kind: "expr", id: "tolerance", label: "A custom tolerance", hidden: true, expr: 'result = compare_manifests({"schema_version": "1", "counts": {"rows_in": 100}, "checks": {}}, {"schema_version": "1", "counts": {"rows_in": 104}, "checks": {}}, tolerance=0.02)', expected: strs("rows_in changed by +4.0%") },
        { kind: "output", id: "output", label: "Prints the demo", expected: "accepted changed by -25.0%\nrejected changed by +1475.0%\ncheck newly failing: fresh\ncheck newly failing: unique_ids\n" },
      ],
    },
    hints: ['f"{name} changed by {change * 100:+.1f}%" shows the sign and one decimal.', "abs(change) > tolerance decides whether a count alert is raised; handle a previous count of 0 first.", 'A check is newly failing if current says "fail" and previous.get(name) != "fail".'],
    answer: `def compare_manifests(previous, current, tolerance=0.1):\n    alerts = []\n    if previous["schema_version"] != current["schema_version"]:\n        alerts.append(f"schema_version changed: {previous['schema_version']} -> {current['schema_version']}")\n    for name in sorted(current["counts"]):\n        before = previous["counts"][name]\n        after = current["counts"][name]\n        if before == 0:\n            if after != 0:\n                alerts.append(f"{name} changed from 0")\n            continue\n        change = after / before - 1\n        if abs(change) > tolerance:\n            alerts.append(f"{name} changed by {change * 100:+.1f}%")\n    for name in sorted(current["checks"]):\n        if current["checks"][name] == "fail" and previous["checks"].get(name) != "fail":\n            alerts.append(f"check newly failing: {name}")\n    return alerts\n\n\n${MANIFEST_DEMO}`,
    wrong: [
      { code: `def compare_manifests(previous, current, tolerance=0.1):\n    alerts = []\n    if previous["schema_version"] != current["schema_version"]:\n        alerts.append(f"schema_version changed: {previous['schema_version']} -> {current['schema_version']}")\n    for name in sorted(current["counts"]):\n        before = previous["counts"][name]\n        after = current["counts"][name]\n        if before == 0:\n            if after != 0:\n                alerts.append(f"{name} changed from 0")\n            continue\n        change = after / before - 1\n        if abs(change) > tolerance:\n            alerts.append(f"{name} changed by {change * 100:+.1f}%")\n    for name in sorted(previous["checks"]):\n        if current["checks"].get(name) == "fail" and previous["checks"][name] == "pass":\n            alerts.append(f"check newly failing: {name}")\n    return alerts\n\n\n${MANIFEST_DEMO}\n`, fails: ["demo", "output"], why: "A brand-new check that fails ('fresh') is missed." },
      { code: `def compare_manifests(previous, current, tolerance=0.1):\n    alerts = []\n    if previous["schema_version"] != current["schema_version"]:\n        alerts.append(f"schema_version changed: {previous['schema_version']} -> {current['schema_version']}")\n    for name in sorted(current["counts"]):\n        before = previous["counts"][name]\n        after = current["counts"][name]\n        if before == 0:\n            if after != 0:\n                alerts.append(f"{name} changed from 0")\n            continue\n        change = after / before - 1\n        if change > tolerance:\n            alerts.append(f"{name} changed by {change * 100:+.1f}%")\n    for name in sorted(current["checks"]):\n        if current["checks"][name] == "fail" and previous["checks"].get(name) != "fail":\n            alerts.append(f"check newly failing: {name}")\n    return alerts\n\n\n${MANIFEST_DEMO}\n`, fails: ["demo", "output"], why: "Without abs, a 25% drop goes unnoticed." },
    ],
  },
  {
    ref: "python:bank:py12-08",
    slug: "py12-08",
    module: "pipelines",
    kind: "debug",
    difficulty: "hard",
    title: "Debug: retrying without duplicates",
    topics: ["retries", "idempotence", "failure in the middle"],
    minutes: 8,
    after: "python:incremental-processing-and-idempotence",
    prompt:
      "`run_batch(rows, sink, attempts=3)` writes rows to a sink that sometimes drops the connection (`FlakySink` simulates it, failing once for each id in `fail_on`). On a `ConnectionError` it retries, but each retry starts the batch again, so rows written before the failure are written twice. Fix it so each row reaches the sink exactly once, in order. Return the number of attempts used; if every attempt fails, raise `RuntimeError`. Leave `FlakySink` as it is.",
    expectedOutput: "2 [1, 2, 3, 4]\n",
    looksFor: ["Rows written before a failure aren't written again.", "Several failures in one batch are survived when attempts allow.", "Running out of attempts raises `RuntimeError`."],
    starter: `${SINK}\n\n\ndef run_batch(rows, sink, attempts=3):\n    for attempt in range(attempts):\n        try:\n            for row in rows:\n                sink.write(row)\n            return attempt + 1\n        except ConnectionError:\n            continue\n    raise RuntimeError("batch failed after retries")\n\n\n${RETRY_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "once", label: "One failure: every row once, two attempts", show: "run_batch(rows 1-4, FlakySink(fail_on=[3]))", expr: '_sink = FlakySink(fail_on=[3])\n_n = run_batch([{"id": k} for k in [1, 2, 3, 4]], _sink)\nresult = (_n, [r["id"] for r in _sink.rows])', expected: py.tuple(i(2), ints(1, 2, 3, 4)) },
        { kind: "expr", id: "twice", label: "Two failures: every row once, three attempts", show: "run_batch(rows 1-4, FlakySink(fail_on=[2, 4]))", expr: '_sink = FlakySink(fail_on=[2, 4])\n_n = run_batch([{"id": k} for k in [1, 2, 3, 4]], _sink)\nresult = (_n, [r["id"] for r in _sink.rows])', expected: py.tuple(i(3), ints(1, 2, 3, 4)) },
        { kind: "expr", id: "gives-up", label: "Too many failures raise RuntimeError", show: "run_batch(rows 1-3, FlakySink(fail_on=[1, 2, 3]), attempts=3)", expr: '_sink = FlakySink(fail_on=[1, 2, 3])\nrun_batch([{"id": k} for k in [1, 2, 3]], _sink, attempts=3)', raises: "RuntimeError" },
        { kind: "expr", id: "clean", label: "No failures: one attempt", hidden: true, expr: '_sink = FlakySink()\n_n = run_batch([{"id": k} for k in [7, 8]], _sink)\nresult = (_n, [r["id"] for r in _sink.rows])', expected: py.tuple(i(1), ints(7, 8)) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "2 [1, 2, 3, 4]\n" },
      ],
    },
    hints: ["The retry loops over all rows again, including those already written.", "Keep a set of ids written successfully, created once, before the attempts loop.", "Skip rows whose id is in that set; add an id only after its write succeeds."],
    answer: `${SINK}\n\n\ndef run_batch(rows, sink, attempts=3):\n    written = set()\n    for attempt in range(attempts):\n        try:\n            for row in rows:\n                if row["id"] in written:\n                    continue\n                sink.write(row)\n                written.add(row["id"])\n            return attempt + 1\n        except ConnectionError:\n            continue\n    raise RuntimeError("batch failed after retries")\n\n\n${RETRY_DEMO}`,
    wrong: [
      { code: `${SINK}\n\n\ndef run_batch(rows, sink, attempts=3):\n    for attempt in range(attempts):\n        written = set()\n        try:\n            for row in rows:\n                if row["id"] in written:\n                    continue\n                sink.write(row)\n                written.add(row["id"])\n            return attempt + 1\n        except ConnectionError:\n            continue\n    raise RuntimeError("batch failed after retries")\n\n\n${RETRY_DEMO}\n`, fails: ["once", "twice", "output"], why: "The set is recreated on every attempt, so it forgets what was written." },
      { code: `${SINK}\n\n\ndef run_batch(rows, sink, attempts=3):\n    written = set()\n    for attempt in range(attempts):\n        try:\n            for row in rows:\n                if row["id"] in written:\n                    continue\n                written.add(row["id"])\n                sink.write(row)\n            return attempt + 1\n        except ConnectionError:\n            continue\n    raise RuntimeError("batch failed after retries")\n\n\n${RETRY_DEMO}\n`, fails: ["once", "twice", "output"], why: "Marking a row as written before the write succeeds loses the row that failed." },
    ],
  },
  {
    ref: "python:bank:py12-09",
    slug: "py12-09",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "Partition keys from timestamps with offsets",
    topics: ["datetime", "UTC", "partitions"],
    minutes: 7,
    after: "python:build-a-reproducible-data-deliverable",
    prompt:
      "Output files are partitioned by UTC date and hour. Write `partition_key(ts_text)` that takes an ISO 8601 timestamp **with** an offset (or `Z`) and returns `dt=YYYY-MM-DD/hour=HH` for the same instant in UTC. A timestamp with no offset is ambiguous: raise `ValueError` rather than guess.",
    expectedOutput: "dt=2026-10-15/hour=01\ndt=2026-10-13/hour=23\n",
    looksFor: ["The instant is converted to UTC before taking date and hour.", "Day, month and year boundaries move correctly.", "A timestamp without an offset raises `ValueError`."],
    starter: `from datetime import datetime, timezone\n\n\ndef partition_key(ts_text):\n    pass\n\n\n${PARTITION_DEMO}\n`,
    task: {
      checks: [
        {
          kind: "function",
          id: "converts",
          label: "Converts to UTC partitions",
          name: "partition_key",
          cases: [
            { args: [s("2026-10-14T23:30:00-02:00")], expected: s("dt=2026-10-15/hour=01") },
            { args: [s("2026-10-14T00:15:00+01:00")], expected: s("dt=2026-10-13/hour=23") },
            { args: [s("2026-10-14T09:00:00Z")], expected: s("dt=2026-10-14/hour=09") },
            { args: [s("2026-12-31T23:59:59-00:30")], expected: s("dt=2027-01-01/hour=00"), hidden: true },
            { args: [s("2028-02-29T23:00:00-01:00")], expected: s("dt=2028-03-01/hour=00"), hidden: true },
          ],
        },
        { kind: "function", id: "naive", label: "Rejects timestamps without an offset", name: "partition_key", cases: [{ args: [s("2026-10-14T09:00:00")], raises: "ValueError" }] },
        { kind: "output", id: "output", label: "Prints the demo", expected: "dt=2026-10-15/hour=01\ndt=2026-10-13/hour=23\n" },
      ],
    },
    hints: ["datetime.fromisoformat(ts_text) understands offsets and Z.", "A parsed value with tzinfo None had no offset: raise ValueError.", 'moment.astimezone(timezone.utc).strftime("dt=%Y-%m-%d/hour=%H").'],
    answer: `from datetime import datetime, timezone\n\n\ndef partition_key(ts_text):\n    moment = datetime.fromisoformat(ts_text)\n    if moment.tzinfo is None:\n        raise ValueError(f"timestamp has no UTC offset: {ts_text!r}")\n    return moment.astimezone(timezone.utc).strftime("dt=%Y-%m-%d/hour=%H")\n\n\n${PARTITION_DEMO}`,
    wrong: [
      { code: `from datetime import datetime, timezone\n\n\ndef partition_key(ts_text):\n    return f"dt={ts_text[:10]}/hour={ts_text[11:13]}"\n\n\n${PARTITION_DEMO}\n`, fails: ["converts", "naive", "output"] },
      { code: `from datetime import datetime, timezone\n\n\ndef partition_key(ts_text):\n    moment = datetime.fromisoformat(ts_text)\n    return moment.astimezone(timezone.utc).strftime("dt=%Y-%m-%d/hour=%H")\n\n\n${PARTITION_DEMO}\n`, fails: ["naive"], why: "A naive time is silently treated as the machine's local time." },
    ],
  },
  {
    ref: "python:bank:py12-10",
    slug: "py12-10",
    module: "pipelines",
    kind: "write",
    difficulty: "hard",
    title: "A reproducible quality report",
    topics: ["json", "determinism", "rule failures"],
    minutes: 10,
    after: "python:build-a-reproducible-data-deliverable",
    prompt:
      "Write `quality_report(rows, rules)` returning a JSON **string** (sorted keys, 2-space indent) so the same input always gives the same bytes. `rules` is a list of `(code, check)` pairs where `check(row)` is `True` for a good row. The report has `rows` (how many), `failed_rows` (rows failing at least one rule) and `rules`: for **every** rule, even one nobody failed, its `failures` count and `sample_ids`, the ids of the first 3 failing rows in input order.",
    expectedOutput: "['{', '  \"failed_rows\": 5,', '  \"rows\": 6,']\n",
    looksFor: ["Every rule appears, with 0 failures if none failed.", "A row failing several rules counts once in `failed_rows`.", "Samples are the first 3 failing ids, in input order.", "Output text is identical on every run: sorted keys, indent 2."],
    starter: `import json\n\n\ndef quality_report(rows, rules):\n    pass\n\n\n${QUALITY_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "text", label: "The exact report text", show: "quality_report(rows, RULES)", expr: `${QUALITY_ROWS}\nresult = quality_report(rows, RULES)`, expected: s(QUALITY_JSON), tip: "json.dumps(report, sort_keys=True, indent=2)." },
        { kind: "expr", id: "empty", label: "No rows", show: "quality_report([], RULES)", expr: `${QUALITY_ROWS}\nimport json as _json\nresult = _json.loads(quality_report([], RULES))`, expected: rec([["failed_rows", i(0)], ["rows", i(0)], ["rules", rec([["has_email", rec([["failures", i(0)], ["sample_ids", py.list()]])], ["positive_amount", rec([["failures", i(0)], ["sample_ids", py.list()]])], ["has_id", rec([["failures", i(0)], ["sample_ids", py.list()]])]])]]) },
        { kind: "expr", id: "samples", label: "At most three samples, in order", hidden: true, expr: 'import json as _json\n_rows = [{"id": k, "ok": k % 2 == 0} for k in [9, 1, 4, 3, 7, 5]]\nresult = _json.loads(quality_report(_rows, [("even", lambda r: r["ok"])]))["rules"]["even"]', expected: rec([["failures", i(5)], ["sample_ids", ints(9, 1, 3)]]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "['{', '  \"failed_rows\": 5,', '  \"rows\": 6,']\n" },
      ],
    },
    hints: ['Start with summary = {code: {"failures": 0, "sample_ids": []} for code, _ in rules}.', "For each row, collect the codes it fails; if any, count the row once in failed_rows.", "Append an id to sample_ids only while it has fewer than 3, then return json.dumps(..., sort_keys=True, indent=2)."],
    answer: `import json\n\n\ndef quality_report(rows, rules):\n    summary = {code: {"failures": 0, "sample_ids": []} for code, _ in rules}\n    failed_rows = 0\n    for row in rows:\n        failed = [code for code, check in rules if not check(row)]\n        if failed:\n            failed_rows += 1\n        for code in failed:\n            summary[code]["failures"] += 1\n            if len(summary[code]["sample_ids"]) < 3:\n                summary[code]["sample_ids"].append(row["id"])\n    report = {"rows": len(rows), "failed_rows": failed_rows, "rules": summary}\n    return json.dumps(report, sort_keys=True, indent=2)\n\n\n${QUALITY_DEMO}`,
    wrong: [
      { code: `import json\n\n\ndef quality_report(rows, rules):\n    summary = {}\n    failed_rows = 0\n    for row in rows:\n        failed = [code for code, check in rules if not check(row)]\n        failed_rows += len(failed)\n        for code in failed:\n            entry = summary.setdefault(code, {"failures": 0, "sample_ids": []})\n            entry["failures"] += 1\n            if len(entry["sample_ids"]) < 3:\n                entry["sample_ids"].append(row["id"])\n    return json.dumps({"rows": len(rows), "failed_rows": failed_rows, "rules": summary}, sort_keys=True, indent=2)\n\n\n${QUALITY_DEMO}\n`, fails: ["text", "empty", "output"] },
      { code: `import json\n\n\ndef quality_report(rows, rules):\n    summary = {code: {"failures": 0, "sample_ids": []} for code, _ in rules}\n    failed_rows = 0\n    for row in rows:\n        failed = [code for code, check in rules if not check(row)]\n        if failed:\n            failed_rows += 1\n        for code in failed:\n            summary[code]["failures"] += 1\n            if len(summary[code]["sample_ids"]) < 3:\n                summary[code]["sample_ids"].append(row["id"])\n    return json.dumps({"rows": len(rows), "failed_rows": failed_rows, "rules": summary})\n\n\n${QUALITY_DEMO}\n`, fails: ["text", "output"] },
    ],
  },
];
