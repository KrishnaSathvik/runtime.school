import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const incrementalProcessingAndIdempotence: PyLesson = {
  slug: "incremental-processing-and-idempotence",
  ref: "python:incremental-processing-and-idempotence",
  module: "pipelines",
  number: 4,
  title: "Incremental processing and idempotence",
  level: "advanced",
  summary:
    "Process only what's new since the last run with a watermark, merge new records into existing output by key so reprocessing never creates duplicates, and generate stable record IDs with `hashlib`. Together these make a pipeline idempotent: running it twice gives the same result as running it once.",

  sections: [
    {
      label: "incremental runs and watermarks",
      blocks: [
        {
          kind: "p",
          text: "Reprocessing all history every run gets slower forever. An **incremental** pipeline remembers how far it got, its **watermark** (usually the latest timestamp it has processed), and next time takes only records **after** it. Decide the boundary deliberately: with “strictly after”, a record arriving late with exactly the watermark's timestamp would be skipped; many pipelines use “at or after” and rely on idempotent merging to make re-reading the boundary harmless.",
        },
      ],
    },
    {
      label: "idempotence",
      blocks: [
        {
          kind: "p",
          text: "An operation is **idempotent** if doing it twice has the same effect as doing it once. Pipelines get rerun: after a crash, when a batch is resent, when a bug is fixed. Appending a batch is **not** idempotent (rerunning duplicates it). An **upsert** is: merge by a key, inserting new keys and replacing existing ones, so the same batch always leaves the same output.",
        },
        { kind: "code", code: 'def upsert(existing, batch, key="id"):\n    merged = {row[key]: row for row in existing}\n    for row in batch:\n        merged[row[key]] = row\n    return [merged[k] for k in sorted(merged)]' },
        {
          kind: "p",
          text: "When two versions of a record compete, choose the winner by data, not arrival order: keep the one with the later `updated_at`, so an old update resent late doesn't overwrite a newer one.",
        },
      ],
    },
    {
      label: "stable IDs",
      blocks: [
        {
          kind: "p",
          text: "Sometimes records don't have a unique ID, so you derive one from their content. Don't use Python's built-in `hash()` for that: for strings it's randomised per run, so the same record gets a different ID tomorrow. `hashlib.sha256(text.encode()).hexdigest()` is the same on every run and every computer. Normalise first (same field order, same spelling), so equal records produce equal text.",
        },
      ],
    },
  ],

  example: {
    caption: "A watermark, an upsert and a stable ID. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import hashlib\nimport json\n\nevents = [\n    {"id": "E1", "ts": "2026-10-14T09:00:00Z", "value": 1},\n    {"id": "E2", "ts": "2026-10-14T10:00:00Z", "value": 2},\n    {"id": "E3", "ts": "2026-10-14T11:00:00Z", "value": 3},\n]\nwatermark = "2026-10-14T09:00:00Z"\nnew = [e for e in events if e["ts"] > watermark]\nprint("new since watermark:", [e["id"] for e in new])\n\n\ndef upsert(existing, batch, key="id"):\n    merged = {row[key]: row for row in existing}\n    for row in batch:\n        merged[row[key]] = row\n    return [merged[k] for k in sorted(merged)]\n\n\nonce = upsert(events[:1], new)\ntwice = upsert(once, new)\nprint(len(once), len(twice), once == twice)\n\nrecord = {"user": "U-07", "event": "purchase", "ts": "2026-10-14T08:30:00Z"}\ntext = json.dumps(record, sort_keys=True)\nprint(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16])',
  },

  walkthrough: [
    {
      title: "Watermark boundaries",
      text: "ISO UTC timestamps compare correctly as text. `>` skips a late record at exactly the watermark; `>=` re-reads it, which an upsert makes harmless.",
      code: 'events = ["2026-10-14T09:00:00Z", "2026-10-14T10:00:00Z", "2026-10-14T10:00:00Z"]\nwatermark = "2026-10-14T10:00:00Z"\nprint(sum(ts > watermark for ts in events), sum(ts >= watermark for ts in events))',
    },
    {
      title: "Append versus upsert",
      text: "Appending the same batch twice doubles it; upserting it twice changes nothing after the first time.",
      code: 'existing = [{"id": 1, "v": "a"}]\nbatch = [{"id": 2, "v": "b"}]\nappended = existing + batch + batch\nmerged = {r["id"]: r for r in existing}\nfor r in batch + batch:\n    merged[r["id"]] = r\nprint(len(appended), len(merged))',
    },
    {
      title: "The latest version wins, whatever the order",
      text: "The older update arrives last, but comparing `updated_at` keeps the newer one.",
      code: 'versions = [\n    {"id": 7, "status": "shipped", "updated_at": "2026-10-14T12:00:00Z"},\n    {"id": 7, "status": "pending", "updated_at": "2026-10-14T09:00:00Z"},\n]\nbest = {}\nfor row in versions:\n    current = best.get(row["id"])\n    if current is None or row["updated_at"] >= current["updated_at"]:\n        best[row["id"]] = row\nprint(best[7]["status"])',
    },
    {
      title: "hash() versus sha256",
      text: "`hashlib` gives the same digest for the same text on every run. (`hash()` of a string changes between runs, so it isn't shown here.) Field order matters, which is why the text is built with `sort_keys`.",
      code: 'import hashlib, json\na = {"user": "U-07", "event": "purchase"}\nb = {"event": "purchase", "user": "U-07"}\nfor rec in (a, b):\n    print(hashlib.sha256(json.dumps(rec, sort_keys=True).encode()).hexdigest()[:12])\nprint(hashlib.sha256(json.dumps(a).encode()).hexdigest()[:12], hashlib.sha256(json.dumps(b).encode()).hexdigest()[:12])',
    },
  ],

  mistakes: [
    {
      title: "Appending on every run",
      text: "A retried run appends the same batch again, so the output now counts every order twice.",
      code: 'output = [{"id": "A1"}, {"id": "A2"}]\nbatch = [{"id": "A3"}]\noutput += batch\noutput += batch\nprint([r["id"] for r in output])',
      fix: "Merge by key (upsert), so reprocessing a batch can't create duplicates.",
    },
    {
      title: "Letting arrival order decide",
      text: "The stale `pending` update arrives last and overwrites the newer `shipped` status.",
      code: 'merged = {}\nfor row in [{"id": 7, "status": "shipped", "updated_at": "12:00"}, {"id": 7, "status": "pending", "updated_at": "09:00"}]:\n    merged[row["id"]] = row\nprint(merged[7]["status"])',
      fix: "Replace an existing record only when the incoming one is at least as recent (`updated_at`).",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Select new events by watermark",
      prompt:
        "Write `new_events(events, watermark)`. Each event has an ISO UTC `ts` (all in the same `YYYY-MM-DDTHH:MM:SSZ` format). Return a tuple: the events with `ts` **at or after** the watermark (in input order), and the **new watermark**: the latest `ts` among them, or the old watermark if there are none. A watermark of `None` means “first run”: take everything.",
      looksFor: [
        "Events at or after the watermark are returned, in order.",
        "The new watermark is the latest timestamp returned, or unchanged when there's nothing new.",
        "`None` takes every event.",
      ],
      starter: "def new_events(events, watermark):\n    # Return (events at or after watermark, new watermark).\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "select",
            label: "New events and the moved watermark",
            show: 'new_events(events, "2026-10-14T10:00:00Z")',
            expr: 'events = [{"id": "E1", "ts": "2026-10-14T09:00:00Z"}, {"id": "E3", "ts": "2026-10-14T11:00:00Z"}, {"id": "E2", "ts": "2026-10-14T10:00:00Z"}]\nnew, mark = new_events(events, "2026-10-14T10:00:00Z")\nresult = ([e["id"] for e in new], mark)',
            expected: py.tuple(strs("E3", "E2"), s("2026-10-14T11:00:00Z")),
            tip: 'Keep events with e["ts"] >= watermark; the new watermark is max(e["ts"] for e in new).',
          },
          { kind: "expr", id: "none", label: "Nothing new keeps the watermark", show: 'new_events(events, "2026-10-15T00:00:00Z")', expr: 'new, mark = new_events([{"id": "E1", "ts": "2026-10-14T09:00:00Z"}], "2026-10-15T00:00:00Z")\nresult = (new, mark)', expected: py.tuple(py.list(), s("2026-10-15T00:00:00Z")) },
          { kind: "expr", id: "first", label: "A first run (None) takes everything", show: "new_events(events, None)", expr: 'new, mark = new_events([{"id": "E1", "ts": "2026-10-14T09:00:00Z"}, {"id": "E2", "ts": "2026-10-14T08:00:00Z"}], None)\nresult = ([e["id"] for e in new], mark)', expected: py.tuple(strs("E1", "E2"), s("2026-10-14T09:00:00Z")) },
          { kind: "expr", id: "empty", label: "No events and no watermark", hidden: true, expr: "new_events([], None)", expected: py.tuple(py.list(), py.none) },
        ],
      },
      hints: [
        'new = [e for e in events if watermark is None or e["ts"] >= watermark].',
        'If new is empty, return new, watermark.',
        'Otherwise return new, max(e["ts"] for e in new).',
      ],
      answer: 'def new_events(events, watermark):\n    """Return (events with ts >= watermark, the new watermark). None means take everything."""\n    new = [e for e in events if watermark is None or e["ts"] >= watermark]\n    if not new:\n        return new, watermark\n    return new, max(e["ts"] for e in new)',
      wrong: [
        { code: 'def new_events(events, watermark):\n    new = [e for e in events if watermark is None or e["ts"] > watermark]\n    return new, (max(e["ts"] for e in new) if new else watermark)\n', fails: ["select"], why: "> skips the boundary event" },
        { code: 'def new_events(events, watermark):\n    new = [e for e in events if watermark is None or e["ts"] >= watermark]\n    return new, (new[-1]["ts"] if new else watermark)\n', fails: ["select", "first"], why: "last event's time, not the latest" },
      ],
    },
    {
      title: "Merge a batch idempotently",
      id: "challenge-2",
      prompt:
        "Write `merge_batch(existing, batch)` for lists of records with `id` and `updated_at` (ISO UTC text). Return a **new** list with one record per `id`, sorted by `id`: new IDs are added, and an existing ID is replaced only if the incoming record's `updated_at` is **later or equal**. Merging the same batch twice must give the same result as merging it once. Don't change the inputs.",
      looksFor: [
        "New IDs are added and existing ones updated, one record per ID, sorted by ID.",
        "An older update never replaces a newer record.",
        "Merging the same batch again changes nothing, and the inputs aren't modified.",
      ],
      starter: "def merge_batch(existing, batch):\n    # Return the merged list: one record per id, sorted by id.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "merge",
            label: "Adds, updates and keeps the newer version",
            show: "merge_batch(existing, batch)",
            expr: 'existing = [{"id": "A1", "status": "pending", "updated_at": "2026-10-14T09:00:00Z"}, {"id": "A2", "status": "shipped", "updated_at": "2026-10-14T12:00:00Z"}]\nbatch = [{"id": "A1", "status": "shipped", "updated_at": "2026-10-14T10:00:00Z"}, {"id": "A2", "status": "pending", "updated_at": "2026-10-14T08:00:00Z"}, {"id": "A0", "status": "new", "updated_at": "2026-10-14T11:00:00Z"}]\nresult = [(r["id"], r["status"]) for r in merge_batch(existing, batch)]',
            expected: py.list(py.tuple(s("A0"), s("new")), py.tuple(s("A1"), s("shipped")), py.tuple(s("A2"), s("shipped"))),
            tip: "Start from {r[\"id\"]: r for r in existing}; replace only if incoming updated_at >= current updated_at.",
          },
          {
            kind: "expr",
            id: "idempotent",
            label: "Merging the same batch twice changes nothing",
            show: "merge_batch(merge_batch(existing, batch), batch) == merge_batch(existing, batch)",
            expr: 'existing = [{"id": "A1", "status": "pending", "updated_at": "2026-10-14T09:00:00Z"}]\nbatch = [{"id": "A1", "status": "shipped", "updated_at": "2026-10-14T10:00:00Z"}, {"id": "A2", "status": "new", "updated_at": "2026-10-14T10:00:00Z"}]\nonce = merge_batch(existing, batch)\nresult = merge_batch(once, batch) == once and len(once) == 2',
            expected: py.bool(true),
          },
          {
            kind: "expr",
            id: "duplicate-in-batch",
            label: "A batch with two versions of one record keeps the newer",
            hidden: true,
            expr: 'batch = [{"id": "Z", "status": "late", "updated_at": "2026-10-14T12:00:00Z"}, {"id": "Z", "status": "early", "updated_at": "2026-10-14T09:00:00Z"}]\nresult = [r["status"] for r in merge_batch([], batch)]',
            expected: strs("late"),
          },
          {
            kind: "expr",
            id: "inputs",
            label: "Inputs aren't modified",
            hidden: true,
            expr: 'existing = [{"id": "A1", "updated_at": "2026-10-14T09:00:00Z"}]\nbatch = [{"id": "A2", "updated_at": "2026-10-14T10:00:00Z"}]\nmerge_batch(existing, batch)\nresult = (len(existing), len(batch))',
            expected: py.tuple(i(1), i(1)),
          },
        ],
      },
      hints: [
        'merged = {r["id"]: r for r in existing} makes a new dictionary (the input list isn\'t changed).',
        'For each row in batch: current = merged.get(row["id"]); if current is None or row["updated_at"] >= current["updated_at"]: merged[row["id"]] = row.',
        "return [merged[k] for k in sorted(merged)].",
      ],
      answer: 'def merge_batch(existing, batch):\n    """Upsert batch into existing by id, keeping the latest updated_at; sorted by id."""\n    merged = {row["id"]: row for row in existing}\n    for row in batch:\n        current = merged.get(row["id"])\n        if current is None or row["updated_at"] >= current["updated_at"]:\n            merged[row["id"]] = row\n    return [merged[key] for key in sorted(merged)]',
      wrong: [
        { code: 'def merge_batch(existing, batch):\n    merged = {r["id"]: r for r in existing}\n    for r in batch:\n        merged[r["id"]] = r\n    return [merged[k] for k in sorted(merged)]\n', fails: ["merge", "duplicate-in-batch"], why: "arrival order wins" },
        { code: 'def merge_batch(existing, batch):\n    out = existing + [r for r in batch if r["id"] not in {e["id"] for e in existing}]\n    return sorted(out, key=lambda r: r["id"])\n', fails: ["merge", "duplicate-in-batch"], why: "never updates, and keeps duplicates within a batch" },
      ],
    },
  ],

  quiz: [
    {
      id: "idempotent",
      prompt: "Which operation is idempotent?",
      options: [
        { text: "Setting `status[\"A1\"] = \"shipped\"`", correct: true, why: "Doing it twice leaves the same state as doing it once." },
        { text: "`orders.append(new_order)`", why: "Each run adds another copy." },
        { text: "`count += 1`", why: "Every run changes the result again." },
        { text: "Writing a new log line on every run", why: "Each run adds a line, so the log changes every time." },
      ],
    },
    {
      id: "hash",
      prompt: "Why use `hashlib.sha256` rather than `hash()` for a record ID that's stored and compared across runs?",
      options: [
        { text: "`hash()` of a string is randomised per run; sha256 gives the same digest every time", correct: true, why: "Python salts string hashes for security, so `hash()` values aren't stable between runs." },
        { text: "`hash()` is slower", why: "Speed isn't the problem; stability is." },
        { text: "`hash()` only works on numbers", why: "It works on any hashable value, just not stably across runs for strings." },
        { text: "sha256 makes IDs shorter", why: "A sha256 hex digest is 64 characters, longer than most hashes." },
      ],
    },
  ],

  outcomes: [
    "Process only new data with a watermark, and choose the boundary rule deliberately.",
    "Explain idempotence, and make reruns safe with key-based upserts.",
    "Keep the latest version of a record by `updated_at`, not arrival order.",
    "Generate stable content-based IDs with `hashlib`, not `hash()`.",
  ],
};
