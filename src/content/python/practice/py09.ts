import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const s = py.str;
const b = py.bool;
const strs = (...xs: string[]) => py.list(...xs.map(s));
const bools = (...xs: boolean[]) => py.list(...xs.map(b));
const tup = (...xs: number[]) => py.tuple(...xs.map((x) => i(x)));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));

/** A source that fails if it's read past its third item: proves a generator only takes what it needs. */
const STRICT_SOURCE = (items: string) =>
  `def _strict_source():\n    for _item in ${items}:\n        yield _item\n    raise RuntimeError("read past the items it needed")\n`;

const STOCK_DEMO = 'item = StockItem("L-01", 10)\nitem.reserve(4)\nitem.ship(3)\nprint(item.on_hand, item.reserved, item.available)';
const STOCK_OK =
  'class StockItem:\n    def __init__(self, sku, on_hand):\n        if on_hand < 0:\n            raise ValueError("on_hand can\'t be negative")\n        self.sku = sku\n        self.on_hand = on_hand\n        self.reserved = 0\n\n    @property\n    def available(self):\n        return self.on_hand - self.reserved\n\n    def reserve(self, n):\n        if n < 1:\n            raise ValueError("reserve at least 1")\n        if n > self.available:\n            raise ValueError(f"only {self.available} available")\n        self.reserved += n\n\n    def release(self, n):\n        if n < 1 or n > self.reserved:\n            raise ValueError("can\'t release more than is reserved")\n        self.reserved -= n\n\n    def ship(self, n):\n        if n < 1 or n > self.reserved:\n            raise ValueError("can only ship reserved stock")\n        self.reserved -= n\n        self.on_hand -= n';

const SHIPMENT_DEMO =
  's = Shipment("S1", 2.5, ["lamp"])\ndata = s.to_dict()\ndata["status"] = "sent"\nprint(s.status)\npayload = {"id": "S2", "weight_kg": 1.0, "items": [], "status": "pending", "source": "api"}\nprint(Shipment.from_dict(payload))';

const LIMITER_DEMO = "limiter = RateLimiter(limit=2, window=10)\nprint([limiter.allow(t) for t in [0, 1, 5, 10, 11, 12]])";
const LIMITER_HEAD = "class RateLimiter:\n    def __init__(self, limit, window):\n        self.limit = limit\n        self.window = window\n        self.calls = []\n\n";

const PARSER_DEMO = 'p = KeyValueParser()\nprint(p.parse("region=eu; token=a=b;"))\nprint(p.serialize({"a": "1", "b": "two"}))\nprint(p.parse(""))';

const CART_OK =
  "class Cart:\n    def __init__(self):\n        self.items = []\n\n    def add(self, sku, qty=1):\n        if qty < 1:\n            raise ValueError(\"qty must be at least 1\")\n        self.items.append((sku, qty))\n\n    @property\n    def count(self):\n        return sum(qty for _, qty in self.items)";
const CART_CLASS_LIST = CART_OK.replace("class Cart:\n    def __init__(self):\n        self.items = []", "class Cart:\n    items = []\n\n    def __init__(self):\n        pass");
const CART_DEFAULT_LIST = CART_OK.replace("def __init__(self):\n        self.items = []", "def __init__(self, items=[]):\n        self.items = items");
const CART_LEN_COUNT = CART_OK.replace("return sum(qty for _, qty in self.items)", "return len(self.items)");

/** Like mutationCheck, for a class: run test_cart() with each Cart implementation swapped in. */
function classMutationCheck(test: string, target: string, impls: string[]): string {
  return [
    `_g = ${test}.__globals__`,
    `_saved = _g.get("${target}")`,
    "_impls = []",
    ...impls.map((code, n) => `${code.replace(`class ${target}:`, `class _Impl${n}:`)}\n_impls.append(_Impl${n})`),
    "result = []",
    "for _impl in _impls:",
    `    _g["${target}"] = _impl`,
    "    try:",
    `        ${test}()`,
    "        result.append(True)",
    "    except Exception:",
    "        result.append(False)",
    `_g["${target}"] = _saved`,
  ].join("\n");
}

export const py09: PyQuestion[] = [
  {
    ref: "python:bank:py09-01",
    slug: "py09-01",
    module: "patterns",
    kind: "write",
    difficulty: "hard",
    title: "Model stock reservations",
    topics: ["classes", "invariants", "properties"],
    minutes: 12,
    after: "python:methods-and-object-state",
    prompt:
      "Write a `StockItem` class that tracks stock on hand and stock reserved for orders.\n\n- `StockItem(sku, on_hand)`: a negative `on_hand` raises `ValueError`. `reserved` starts at 0.\n- `available` is always `on_hand - reserved` (a property, so it can't go stale).\n- `reserve(n)`: reserves `n` more; `n` below 1, or more than is available, raises `ValueError`.\n- `release(n)`: un-reserves `n`; below 1 or more than reserved raises `ValueError`.\n- `ship(n)`: ships `n` reserved units, reducing both `reserved` and `on_hand`; below 1 or more than reserved raises `ValueError`.\n\nA rejected call changes nothing.",
    expectedOutput: "7 1 6\n",
    looksFor: ["`available` stays correct after every change.", "You can't reserve more than is available, even across several calls.", "Shipping takes from reserved stock only.", "A rejected call leaves the numbers unchanged."],
    starter: `class StockItem:\n    pass\n\n\n${STOCK_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "flow", label: "Reserve, release and ship keep the numbers right", show: 'StockItem("A", 10): reserve(6), release(2), ship(3)', expr: 'item = StockItem("A", 10)\nitem.reserve(6)\nitem.release(2)\nitem.ship(3)\nresult = (item.on_hand, item.reserved, item.available)', expected: tup(7, 1, 6) },
        { kind: "expr", id: "over-reserve", label: "Reserving more than is available fails and changes nothing", show: 'StockItem("A", 10): reserve(8), then reserve(3)', expr: 'item = StockItem("A", 10)\nitem.reserve(8)\ntry:\n    item.reserve(3)\n    result = "accepted"\nexcept ValueError:\n    result = (item.on_hand, item.reserved, item.available)', expected: tup(10, 8, 2), tip: "Compare n with available (on_hand - reserved), not with on_hand." },
        { kind: "expr", id: "ship-unreserved", label: "Shipping more than is reserved fails and changes nothing", show: 'StockItem("A", 5): reserve(1), then ship(2)', expr: 'item = StockItem("A", 5)\nitem.reserve(1)\ntry:\n    item.ship(2)\n    result = "accepted"\nexcept ValueError:\n    result = (item.on_hand, item.reserved)', expected: tup(5, 1) },
        { kind: "expr", id: "bad-counts", label: "Zero, negative and over-release amounts are rejected", hidden: true, expr: 'item = StockItem("A", 5)\nitem.reserve(2)\nresult = []\nfor _call in [lambda: item.reserve(0), lambda: item.release(3), lambda: item.ship(-1), lambda: StockItem("B", -1)]:\n    try:\n        _call()\n        result.append("accepted")\n    except ValueError:\n        result.append("rejected")\nresult.append((item.on_hand, item.reserved))', expected: py.list(s("rejected"), s("rejected"), s("rejected"), s("rejected"), tup(5, 2)) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "7 1 6\n" },
      ],
    },
    hints: ["Store on_hand and reserved; compute available in a @property.", "Validate first, then change: an early raise leaves the object as it was.", "ship(n) does self.reserved -= n and self.on_hand -= n."],
    answer: `${STOCK_OK}\n\n\n${STOCK_DEMO}`,
    wrong: [
      { code: `${STOCK_OK.replace("    @property\n    def available(self):\n        return self.on_hand - self.reserved\n\n", "").replace("        self.reserved = 0", "        self.reserved = 0\n        self.available = on_hand")}\n\n\n${STOCK_DEMO}\n`, fails: ["flow", "over-reserve", "output"], why: "available is computed once, in __init__, and never updated." },
      { code: `${STOCK_OK.replace("if n > self.available:", "if n > self.on_hand:")}\n\n\n${STOCK_DEMO}\n`, fails: ["over-reserve"] },
    ],
  },
  {
    ref: "python:bank:py09-02",
    slug: "py09-02",
    module: "patterns",
    kind: "debug",
    difficulty: "hard",
    title: "Debug: a dataclass that round-trips",
    topics: ["dataclasses", "asdict", "serialization"],
    minutes: 10,
    after: "python:dataclasses-and-type-hints",
    prompt:
      "`Shipment` converts to and from plain dictionaries for an API. Two bugs: changing the dictionary from `to_dict()` changes the shipment itself, and `from_dict` crashes when the API adds a field the class doesn't know (like `source`). Fix both. Unknown keys are ignored, missing optional keys get their defaults, and `Shipment.from_dict(s.to_dict()) == s`.",
    expectedOutput: "pending\nShipment(id='S2', weight_kg=1.0, items=[], status='pending')\n",
    looksFor: ["`to_dict()` returns an independent dictionary, including its `items` list.", "`from_dict` ignores keys that aren't fields.", "Missing optional fields use their defaults.", "A round trip gives an equal shipment."],
    starter: `from dataclasses import dataclass, field


@dataclass
class Shipment:
    id: str
    weight_kg: float
    items: list[str] = field(default_factory=list)
    status: str = "pending"

    def to_dict(self):
        return self.__dict__

    @classmethod
    def from_dict(cls, data):
        return cls(**data)


${SHIPMENT_DEMO}
`,
    task: {
      checks: [
        { kind: "expr", id: "independent", label: "Changing to_dict()'s list doesn't change the shipment", show: 's = Shipment("S1", 2.5, ["lamp"]); s.to_dict()["items"].append("rug"); s.items', expr: 's = Shipment("S1", 2.5, ["lamp"])\ns.to_dict()["items"].append("rug")\nresult = s.items', expected: strs("lamp"), tip: "dataclasses.asdict(self) builds a new dictionary and copies lists inside it." },
        { kind: "expr", id: "unknown", label: "Unknown keys are ignored", show: 'Shipment.from_dict({"id": "S2", "weight_kg": 1.0, "source": "api", "trace": 7})', expr: 'Shipment.from_dict({"id": "S2", "weight_kg": 1.0, "source": "api", "trace": 7}).to_dict()', expected: rec([["id", s("S2")], ["weight_kg", py.float(1)], ["items", py.list()], ["status", s("pending")]]) },
        { kind: "expr", id: "round-trip", label: "A round trip gives an equal shipment", show: 'Shipment.from_dict(s.to_dict()) == s', expr: 's = Shipment("S9", 4.0, ["a", "b"], "sent")\nresult = Shipment.from_dict(s.to_dict()) == s', expected: b(true) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "pending\nShipment(id='S2', weight_kg=1.0, items=[], status='pending')\n" },
      ],
    },
    hints: ["self.__dict__ is the object's own attribute storage, not a copy.", "from dataclasses import asdict, fields: asdict(self) copies; fields(cls) lists the field names.", "In from_dict, keep only keys whose name is a field: {k: v for k, v in data.items() if k in names}."],
    answer: `from dataclasses import asdict, dataclass, field, fields


@dataclass
class Shipment:
    id: str
    weight_kg: float
    items: list[str] = field(default_factory=list)
    status: str = "pending"

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data):
        names = {f.name for f in fields(cls)}
        return cls(**{key: value for key, value in data.items() if key in names})


${SHIPMENT_DEMO}`,
    wrong: [
      { code: `from dataclasses import dataclass, field, fields


@dataclass
class Shipment:
    id: str
    weight_kg: float
    items: list[str] = field(default_factory=list)
    status: str = "pending"

    def to_dict(self):
        return dict(self.__dict__)

    @classmethod
    def from_dict(cls, data):
        names = {f.name for f in fields(cls)}
        return cls(**{key: value for key, value in data.items() if key in names})


${SHIPMENT_DEMO}
`, fails: ["independent"], why: "dict(...) copies the outer dictionary, but both still share one items list." },
      { code: `from dataclasses import asdict, dataclass, field


@dataclass
class Shipment:
    id: str
    weight_kg: float
    items: list[str] = field(default_factory=list)
    status: str = "pending"

    def to_dict(self):
        return asdict(self)

    @classmethod
    def from_dict(cls, data):
        data = dict(data)
        data.pop("source", None)
        return cls(**data)


${SHIPMENT_DEMO}
`, fails: ["unknown"] },
    ],
  },
  {
    ref: "python:bank:py09-03",
    slug: "py09-03",
    module: "patterns",
    kind: "write",
    difficulty: "hard",
    title: "Sliding windows from any iterable",
    topics: ["generators", "iterables", "laziness"],
    minutes: 10,
    after: "python:iterators-and-generators",
    prompt:
      "Write a generator `windows(values, size)` that yields each run of `size` consecutive items as a tuple: `windows([1, 2, 3, 4], 2)` yields `(1, 2)`, `(2, 3)`, `(3, 4)`. It must work on **any iterable**, including generators and streams with no length, and read only as far as it needs. Fewer than `size` items yield nothing. A `size` below 1 raises `ValueError`.",
    expectedOutput: "[(1, 2), (2, 3), (3, 4)]\n",
    looksFor: ["Yields overlapping tuples of exactly `size` items.", "Works when `values` is a generator.", "Reads no further than needed for the next window.", "`size` below 1 raises `ValueError`."],
    starter: "def windows(values, size):\n    pass\n\n\nprint(list(windows([1, 2, 3, 4], 2)))\n",
    task: {
      checks: [
        { kind: "expr", id: "lists", label: "Windows over lists", show: "list(windows(...)) for sizes 2, 3 and 1", expr: "result = [list(windows([1, 2, 3, 4], 2)), list(windows([1, 2], 3)), list(windows([7, 8], 1))]", expected: py.list(py.list(tup(1, 2), tup(2, 3), tup(3, 4)), py.list(), py.list(tup(7), tup(8))) },
        { kind: "expr", id: "generator-input", label: "Works on a generator", show: "list(windows((n * n for n in range(4)), 3))", expr: "list(windows((n * n for n in range(4)), 3))", expected: py.list(tup(0, 1, 4), tup(1, 4, 9)), tip: "A generator has no len() and can't be sliced: build each window as items arrive." },
        { kind: "expr", id: "lazy", label: "Reads only what the first window needs", show: "next(windows(source, 2)) on a source that fails after 3 items", expr: `${STRICT_SOURCE("[1, 2, 3]")}result = next(windows(_strict_source(), 2))`, expected: tup(1, 2) },
        { kind: "expr", id: "bad-size", label: "size 0 raises ValueError", show: "list(windows([1, 2], 0))", expr: "list(windows([1, 2], 0))", raises: "ValueError" },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[(1, 2), (2, 3), (3, 4)]\n" },
      ],
    },
    hints: ["Keep a list buffer; append each new value as you loop over values.", "When the buffer is longer than size, drop its first item (buffer.pop(0)).", "When it's exactly size long, yield tuple(buffer)."],
    answer:
      'def windows(values, size):\n    if size < 1:\n        raise ValueError("size must be at least 1")\n    buffer = []\n    for value in values:\n        buffer.append(value)\n        if len(buffer) > size:\n            buffer.pop(0)\n        if len(buffer) == size:\n            yield tuple(buffer)\n\n\nprint(list(windows([1, 2, 3, 4], 2)))',
    wrong: [
      { code: 'def windows(values, size):\n    if size < 1:\n        raise ValueError("size must be at least 1")\n    for start in range(len(values) - size + 1):\n        yield tuple(values[start:start + size])\n\n\nprint(list(windows([1, 2, 3, 4], 2)))\n', fails: ["generator-input", "lazy"] },
      { code: 'def windows(values, size):\n    if size < 1:\n        raise ValueError("size must be at least 1")\n    items = list(values)\n    return [tuple(items[k:k + size]) for k in range(len(items) - size + 1)]\n\n\nprint(list(windows([1, 2, 3, 4], 2)))\n', fails: ["lazy"], why: "list(values) reads the whole source before the first window." },
    ],
  },
  {
    ref: "python:bank:py09-04",
    slug: "py09-04",
    module: "patterns",
    kind: "write",
    difficulty: "hard",
    title: "A generator that drops repeats",
    topics: ["generators", "sets", "streams"],
    minutes: 8,
    after: "python:iterators-and-generators",
    prompt:
      "Events can arrive more than once. Write a generator `unique_by_id(records)` that yields each record the **first** time its `id` is seen, skips later records with the same `id`, and skips records with no `id` at all. It must stream: yield each new record as soon as it arrives, without reading ahead.",
    expectedOutput: "[{'id': 'a', 'n': 1}, {'id': 'b', 'n': 2}]\n",
    looksFor: ["The first record for each id is kept, later ones skipped.", "Records without an `id` are skipped.", "Records are yielded one at a time, without reading the whole input first."],
    starter: 'def unique_by_id(records):\n    pass\n\n\nevents = [{"id": "a", "n": 1}, {"id": "b", "n": 2}, {"n": 3}, {"id": "a", "n": 4}]\nprint(list(unique_by_id(events)))\n',
    task: {
      checks: [
        { kind: "expr", id: "dedupe", label: "Keeps the first record per id", show: "list(unique_by_id(events))", expr: 'list(unique_by_id([{"id": "a", "n": 1}, {"id": "b", "n": 2}, {"n": 3}, {"id": "a", "n": 4}, {"id": "b", "n": 5}, {"id": "c", "n": 6}]))', expected: py.list(rec([["id", s("a")], ["n", i(1)]]), rec([["id", s("b")], ["n", i(2)]]), rec([["id", s("c")], ["n", i(6)]])) },
        { kind: "expr", id: "lazy", label: "Streams: the first record comes out before the rest is read", show: "next(unique_by_id(source)) on a source that fails after its first items", expr: `${STRICT_SOURCE('[{"id": 1}, {"id": 1}, {"id": 2}]')}_gen = unique_by_id(_strict_source())\nresult = [next(_gen), next(_gen)]`, expected: py.list(rec([["id", i(1)]]), rec([["id", i(2)]])) },
        { kind: "expr", id: "empty", label: "Empty input yields nothing", hidden: true, expr: "list(unique_by_id([]))", expected: py.list() },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[{'id': 'a', 'n': 1}, {'id': 'b', 'n': 2}]\n" },
      ],
    },
    hints: ["Keep a set of ids already yielded.", 'For each record: skip it if "id" not in record or record["id"] in seen.', "Otherwise add the id to seen and yield the record."],
    answer:
      'def unique_by_id(records):\n    seen = set()\n    for record in records:\n        if "id" not in record or record["id"] in seen:\n            continue\n        seen.add(record["id"])\n        yield record\n\n\nevents = [{"id": "a", "n": 1}, {"id": "b", "n": 2}, {"n": 3}, {"id": "a", "n": 4}]\nprint(list(unique_by_id(events)))',
    wrong: [
      { code: 'def unique_by_id(records):\n    latest = {}\n    for record in records:\n        if "id" in record:\n            latest[record["id"]] = record\n    yield from latest.values()\n\n\nevents = [{"id": "a", "n": 1}, {"id": "b", "n": 2}, {"n": 3}, {"id": "a", "n": 4}]\nprint(list(unique_by_id(events)))\n', fails: ["dedupe", "lazy", "output"] },
      { code: 'def unique_by_id(records):\n    seen = set()\n    for record in list(records):\n        if "id" not in record or record["id"] in seen:\n            continue\n        seen.add(record["id"])\n        yield record\n\n\nevents = [{"id": "a", "n": 1}, {"id": "b", "n": 2}, {"n": 3}, {"id": "a", "n": 4}]\nprint(list(unique_by_id(events)))\n', fails: ["lazy"] },
    ],
  },
  {
    ref: "python:bank:py09-05",
    slug: "py09-05",
    module: "patterns",
    kind: "debug",
    difficulty: "hard",
    title: "Debug: a rate limiter",
    topics: ["classes", "state", "boundaries"],
    minutes: 10,
    after: "python:methods-and-object-state",
    prompt:
      "`RateLimiter(limit, window)` allows at most `limit` calls in any `window` seconds. `allow(now)` is given the current time (no real clock, so tests are repeatable) and returns `True` if the call is allowed. A call made exactly `window` seconds ago no longer counts, and **denied calls don't count** at all. The version below gets both rules wrong. Fix it.",
    expectedOutput: "[True, True, False, True, True, False]\n",
    looksFor: ["Only allowed calls count towards the limit.", "A call exactly `window` seconds old has expired.", "Old calls don't pile up in memory forever."],
    starter: `${LIMITER_HEAD}    def allow(self, now):\n        self.calls.append(now)\n        recent = [t for t in self.calls if now - t <= self.window]\n        return len(recent) <= self.limit\n\n\n${LIMITER_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "demo", label: "limit 2, window 10", show: "allow(t) for t in 0, 1, 5, 10, 11, 12", expr: "_l = RateLimiter(2, 10)\nresult = [_l.allow(t) for t in [0, 1, 5, 10, 11, 12]]", expected: bools(true, true, false, true, true, false) },
        { kind: "expr", id: "boundary", label: "limit 1, window 5: calls expire after exactly 5 seconds", show: "allow(t) for t in 0, 4, 5, 9, 10", expr: "_l = RateLimiter(1, 5)\nresult = [_l.allow(t) for t in [0, 4, 5, 9, 10]]", expected: bools(true, false, true, false, true) },
        { kind: "expr", id: "denied", label: "A burst of denied calls doesn't block later ones", hidden: true, expr: "_l = RateLimiter(1, 3)\nresult = [_l.allow(t) for t in [0, 1, 1, 2, 2, 3]]", expected: bools(true, false, false, false, false, true) },
        { kind: "expr", id: "pruned", label: "Expired calls are forgotten", hidden: true, expr: "_l = RateLimiter(3, 2)\nfor _t in range(0, 100, 5):\n    _l.allow(_t)\nresult = len(_l.calls) <= 3", expected: b(true), tip: "Replace self.calls with only the recent calls, instead of keeping every call ever made." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "[True, True, False, True, True, False]\n" },
      ],
    },
    hints: ["First forget expired calls: keep only t where now - t < window.", "Then decide: if len(self.calls) >= self.limit, return False without recording anything.", "Only an allowed call is appended."],
    answer: `${LIMITER_HEAD}    def allow(self, now):\n        self.calls = [t for t in self.calls if now - t < self.window]\n        if len(self.calls) >= self.limit:\n            return False\n        self.calls.append(now)\n        return True\n\n\n${LIMITER_DEMO}`,
    wrong: [
      { code: `${LIMITER_HEAD}    def allow(self, now):\n        self.calls.append(now)\n        self.calls = [t for t in self.calls if now - t < self.window]\n        return len(self.calls) <= self.limit\n\n\n${LIMITER_DEMO}\n`, fails: ["demo", "boundary", "denied", "output"], why: "The boundary is right now, but denied calls are still recorded." },
      { code: `${LIMITER_HEAD}    def allow(self, now):\n        recent = [t for t in self.calls if now - t <= self.window]\n        if len(recent) >= self.limit:\n            return False\n        self.calls.append(now)\n        return True\n\n\n${LIMITER_DEMO}\n`, fails: ["demo", "boundary", "denied", "pruned", "output"] },
    ],
  },
  {
    ref: "python:bank:py09-06",
    slug: "py09-06",
    module: "patterns",
    kind: "write",
    difficulty: "hard",
    title: "A context manager that restores a setting",
    topics: ["contextmanager", "finally", "missing versus None"],
    minutes: 10,
    after: "python:context-managers-and-resource-safety",
    prompt:
      "Write a context manager `temporary_setting(config, key, value)` for tests: inside the `with` block, `config[key]` is `value`; afterwards `config` is exactly as before. If the key didn't exist, it's removed again; if it held `None`, it holds `None` again. This must happen even when the block raises, and the exception must still reach the caller.",
    expectedOutput: "inside: True\nafter: False\n",
    looksFor: ["The setting has the temporary value inside the block.", "Afterwards the old value is back, or the key is gone if it was absent.", "An explicit `None` is restored as `None`.", "Exceptions inside the block still propagate, and the setting is restored anyway."],
    starter: 'from contextlib import contextmanager\n\n\n# Write temporary_setting here.\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])\n',
    task: {
      checks: [
        { kind: "expr", id: "restores", label: "An existing value comes back", show: 'temporary_setting(c, "debug", True) with c = {"debug": False}', expr: 'c = {"debug": False}\nwith temporary_setting(c, "debug", True):\n    _inside = c["debug"]\nresult = (_inside, c)', expected: py.tuple(b(true), rec([["debug", b(false)]])) },
        { kind: "expr", id: "absent", label: "An absent key is removed again", show: 'temporary_setting({}, "mode", "test")', expr: 'c = {}\nwith temporary_setting(c, "mode", "test"):\n    _inside = dict(c)\nresult = (_inside, c)', expected: py.tuple(rec([["mode", s("test")]]), py.dict([])) },
        { kind: "expr", id: "none", label: "An explicit None is restored, not deleted", show: 'temporary_setting({"user": None}, "user", "ada")', expr: 'c = {"user": None}\nwith temporary_setting(c, "user", "ada"):\n    pass\nresult = c', expected: rec([["user", py.none]]), tip: "Tell 'absent' from 'None' with key in config (or a unique sentinel object), not with config.get(key)." },
        { kind: "expr", id: "error", label: "On an exception: restored, and the error propagates", show: "raise inside the block", expr: 'c = {"debug": False}\ntry:\n    with temporary_setting(c, "debug", True):\n        raise KeyError("boom")\n    result = ("no error", c)\nexcept KeyError:\n    result = ("KeyError", c)', expected: py.tuple(s("KeyError"), rec([["debug", b(false)]])), tip: "Put the yield inside try: and the restore in finally:, with no except that swallows the error." },
        { kind: "output", id: "output", label: "Prints the demo", expected: "inside: True\nafter: False\n" },
      ],
    },
    hints: ["With @contextmanager, the code before yield runs on entry and the code after it on exit.", "Remember whether the key existed (key in config) and its old value before changing it.", "try: yield / finally: restore, so the restore runs even when the block raises."],
    answer:
      'from contextlib import contextmanager\n\n\n@contextmanager\ndef temporary_setting(config, key, value):\n    existed = key in config\n    old = config.get(key)\n    config[key] = value\n    try:\n        yield config\n    finally:\n        if existed:\n            config[key] = old\n        else:\n            del config[key]\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])',
    alternatives: [
      'class temporary_setting:\n    def __init__(self, config, key, value):\n        self.config, self.key, self.value = config, key, value\n\n    def __enter__(self):\n        self.existed = self.key in self.config\n        self.old = self.config.get(self.key)\n        self.config[self.key] = self.value\n        return self.config\n\n    def __exit__(self, exc_type, exc, tb):\n        if self.existed:\n            self.config[self.key] = self.old\n        else:\n            del self.config[self.key]\n        return False\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])\n',
    ],
    wrong: [
      { code: 'from contextlib import contextmanager\n\n\n@contextmanager\ndef temporary_setting(config, key, value):\n    existed = key in config\n    old = config.get(key)\n    config[key] = value\n    yield config\n    if existed:\n        config[key] = old\n    else:\n        del config[key]\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])\n', fails: ["error"] },
      { code: 'from contextlib import contextmanager\n\n\n@contextmanager\ndef temporary_setting(config, key, value):\n    old = config.get(key)\n    config[key] = value\n    try:\n        yield config\n    finally:\n        if old is None:\n            del config[key]\n        else:\n            config[key] = old\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])\n', fails: ["none"] },
      { code: 'from contextlib import contextmanager\n\n\n@contextmanager\ndef temporary_setting(config, key, value):\n    existed = key in config\n    old = config.get(key)\n    config[key] = value\n    try:\n        yield config\n    except Exception:\n        pass\n    finally:\n        if existed:\n            config[key] = old\n        else:\n            del config[key]\n\n\nconfig = {"debug": False}\nwith temporary_setting(config, "debug", True):\n    print("inside:", config["debug"])\nprint("after:", config["debug"])\n', fails: ["error"] },
    ],
  },
  {
    ref: "python:bank:py09-07",
    slug: "py09-07",
    module: "patterns",
    kind: "predict",
    difficulty: "hard",
    title: "Predict: merging nested settings",
    topics: ["dict unpacking", "shallow merge", "configuration"],
    minutes: 5,
    after: "python:logging-configuration-and-project-structure",
    prompt: "Defaults are merged with overrides using `{**defaults, **overrides}`. What does this program print?",
    code: 'defaults = {"retries": 3, "db": {"host": "localhost", "port": 5432}}\noverrides = {"db": {"host": "db.internal"}, "debug": True}\n\nmerged = {**defaults, **overrides}\nprint(merged["db"])\nprint(merged["db"].get("port", "no port"))\nprint(sorted(merged))\n\ndefaults["retries"] = 5\nprint(merged["retries"])',
    output: "{'host': 'db.internal'}\nno port\n['db', 'debug', 'retries']\n3\n",
    explanation:
      "The merge is **shallow**: the override's whole `db` dictionary replaces the default one, so `port` is gone, not merged. Keys from both sides end up in `merged`. And `merged` holds its own reference to the value `3`: assigning a new value to `defaults[\"retries\"]` afterwards changes only `defaults`.",
    hints: ["Does ** merge nested dictionaries, or replace the value under a key?", "merged was built before defaults changed."],
    wrong: ["{'host': 'db.internal', 'port': 5432}\n5432\n['db', 'debug', 'retries']\n3", "{'host': 'db.internal'}\nno port\n['db', 'debug', 'retries']\n5"],
  },
  {
    ref: "python:bank:py09-08",
    slug: "py09-08",
    module: "patterns",
    kind: "debug",
    difficulty: "hard",
    title: "Debug: a reusable key=value parser",
    topics: ["classes", "split", "round trips"],
    minutes: 8,
    after: "python:methods-and-object-state",
    prompt:
      "`KeyValueParser` reads settings like `\"region=eu;retries=3\"` and writes them back. `parse` crashes on an empty string, on a trailing `;`, and on values that contain `=` (like tokens). Fix `parse` so those work, spaces around keys and values are stripped, and `parse(serialize(d)) == d` for string keys and values without `;`.",
    expectedOutput: "{'region': 'eu', 'token': 'a=b'}\na=1;b=two\n{}\n",
    looksFor: ["An empty string parses to `{}`.", "Empty parts (like after a trailing `;`) are skipped.", "Only the first `=` separates key from value.", "Serializing and parsing again gives back the same dictionary."],
    starter: `class KeyValueParser:\n    def __init__(self, sep=";", assign="="):\n        self.sep = sep\n        self.assign = assign\n\n    def parse(self, text):\n        result = {}\n        for part in text.split(self.sep):\n            key, value = part.split(self.assign)\n            result[key.strip()] = value.strip()\n        return result\n\n    def serialize(self, data):\n        return self.sep.join(f"{key}{self.assign}{value}" for key, value in data.items())\n\n\n${PARSER_DEMO}\n`,
    task: {
      checks: [
        { kind: "expr", id: "parse", label: "Parses tokens, spaces and trailing separators", show: 'KeyValueParser().parse(" region = eu ;token=a=b==;")', expr: 'KeyValueParser().parse(" region = eu ;token=a=b==;")', expected: rec([["region", s("eu")], ["token", s("a=b==")]]) },
        { kind: "expr", id: "empty", label: "An empty string gives {}", show: 'KeyValueParser().parse("")', expr: 'KeyValueParser().parse("")', expected: py.dict([]) },
        { kind: "expr", id: "round-trip", label: "parse(serialize(d)) == d", show: 'd = {"a": "1", "url": "x?y=z"}', expr: 'p = KeyValueParser()\nd = {"a": "1", "url": "x?y=z"}\nresult = p.parse(p.serialize(d)) == d', expected: b(true) },
        { kind: "expr", id: "custom", label: "Other separators work too", hidden: true, expr: 'KeyValueParser(sep="&", assign=":").parse("a:1&&b:x:y&")', expected: rec([["a", s("1")], ["b", s("x:y")]]) },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'region': 'eu', 'token': 'a=b'}\na=1;b=two\n{}\n" },
      ],
    },
    hints: ['"".split(";") is [""], one empty part, which can\'t be unpacked into key and value.', "Skip a part that's empty after strip().", "part.split(self.assign, 1) splits on the first = only."],
    answer: `class KeyValueParser:\n    def __init__(self, sep=";", assign="="):\n        self.sep = sep\n        self.assign = assign\n\n    def parse(self, text):\n        result = {}\n        for part in text.split(self.sep):\n            if not part.strip():\n                continue\n            key, value = part.split(self.assign, 1)\n            result[key.strip()] = value.strip()\n        return result\n\n    def serialize(self, data):\n        return self.sep.join(f"{key}{self.assign}{value}" for key, value in data.items())\n\n\n${PARSER_DEMO}`,
    wrong: [
      { code: `class KeyValueParser:\n    def __init__(self, sep=";", assign="="):\n        self.sep = sep\n        self.assign = assign\n\n    def parse(self, text):\n        result = {}\n        for part in text.split(self.sep):\n            key, _, value = part.partition(self.assign)\n            result[key.strip()] = value.strip()\n        return result\n\n    def serialize(self, data):\n        return self.sep.join(f"{key}{self.assign}{value}" for key, value in data.items())\n\n\n${PARSER_DEMO}\n`, fails: ["parse", "empty", "custom", "output"], why: "No crash now, but every empty part becomes a bogus '' key." },
      { code: `class KeyValueParser:\n    def __init__(self, sep=";", assign="="):\n        self.sep = sep\n        self.assign = assign\n\n    def parse(self, text):\n        result = {}\n        for part in text.split(self.sep):\n            if not part.strip():\n                continue\n            key, value = part.split("=", 1)\n            result[key.strip()] = value.strip()\n        return result\n\n    def serialize(self, data):\n        return self.sep.join(f"{key}{self.assign}{value}" for key, value in data.items())\n\n\n${PARSER_DEMO}\n`, fails: ["custom"], why: 'Hard-coding "=" ignores the parser\'s own assign setting.' },
    ],
  },
  {
    ref: "python:bank:py09-09",
    slug: "py09-09",
    module: "patterns",
    kind: "write",
    difficulty: "hard",
    title: "Test that objects don't share state",
    topics: ["testing", "instances", "shared state"],
    minutes: 10,
    after: "python:methods-and-object-state",
    prompt:
      "`Cart` is already written. Write `test_cart()` using `assert` so that it passes for this `Cart` and fails for three broken versions: one keeps `items` in the class body (shared by every cart), one uses a mutable default `items=[]` in `__init__`, and one counts lines instead of quantities. Check answer runs your test against all four.",
    looksFor: ["The test passes for the correct `Cart`.", "It makes **two** carts and checks that adding to one leaves the other empty.", "It adds a quantity above 1 and checks `count`."],
    starter: `${CART_OK}\n\n\ndef test_cart():\n    cart = Cart()\n    cart.add("lamp")\n    assert cart.count == 1\n\n\ntest_cart()\nprint("tests passed")\n`,
    task: {
      checks: [
        {
          kind: "expr",
          id: "mutants",
          label: "Your test passes for the real Cart and fails for each broken one",
          show: "test_cart() with the correct Cart, then three broken ones",
          expr: classMutationCheck("test_cart", "Cart", [CART_OK, CART_CLASS_LIST, CART_DEFAULT_LIST, CART_LEN_COUNT]),
          expected: bools(true, false, false, false),
          tip: "Make two carts, add to the first, and assert the second's count is still 0; also add a line with qty=3.",
        },
        { kind: "output", id: "output", label: "The test passes when run", expected: "tests passed\n" },
      ],
    },
    hints: ["Shared state only shows up with more than one instance.", "a = Cart(); b = Cart(); a.add(\"x\"); assert b.count == 0.", 'cart.add("rug", qty=3) and assert cart.count includes all 3.'],
    answer: `${CART_OK}\n\n\ndef test_cart():\n    first = Cart()\n    second = Cart()\n    first.add("lamp")\n    first.add("rug", qty=3)\n    assert first.count == 4\n    assert second.count == 0\n    assert second.items == []\n\n\ntest_cart()\nprint("tests passed")`,
    wrong: [
      { code: `${CART_OK}\n\n\ndef test_cart():\n    cart = Cart()\n    cart.add("lamp", qty=2)\n    assert cart.count == 2\n\n\ntest_cart()\nprint("tests passed")\n`, fails: ["mutants"], why: "With one cart, shared state is invisible." },
      { code: `${CART_OK}\n\n\ndef test_cart():\n    first = Cart()\n    second = Cart()\n    first.add("lamp")\n    assert second.count == 0\n\n\ntest_cart()\nprint("tests passed")\n`, fails: ["mutants"], why: "Every line has qty 1, so counting lines looks right." },
    ],
  },
  {
    ref: "python:bank:py09-10",
    slug: "py09-10",
    module: "patterns",
    kind: "predict",
    difficulty: "hard",
    title: "Predict: structured log lines",
    topics: ["json", "**kwargs", "defaults"],
    minutes: 5,
    after: "python:logging-configuration-and-project-structure",
    prompt: "Structured logs are one JSON object per line, so tools can search them. What does this program print?",
    code: 'import json\n\n\ndef log_entry(event, level="INFO", ts="2026-10-14T08:00:00Z", **context):\n    entry = {"ts": ts, "level": level, "event": event}\n    if context:\n        entry["context"] = dict(sorted(context.items()))\n    return json.dumps(entry)\n\n\nprint(log_entry("started"))\nprint(log_entry("retry", level="WARN", order_id="A1", attempt=2))\nprint(log_entry("done", user=None))',
    output:
      '{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "started"}\n{"ts": "2026-10-14T08:00:00Z", "level": "WARN", "event": "retry", "context": {"attempt": 2, "order_id": "A1"}}\n{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "done", "context": {"user": null}}\n',
    explanation:
      "Keyword arguments that aren't parameters land in `context`. With none, `context` is an empty dict (falsy), so there's no `context` key. `level=\"WARN\"` fills the parameter, not `context`. The context is sorted, so `attempt` comes before `order_id`. The entry keeps insertion order, and `json.dumps` writes Python's `None` as `null`.",
    hints: ["Which keyword arguments match a parameter, and which go into **context?", "How does json.dumps write None?"],
    wrong: [
      '{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "started", "context": {}}\n{"ts": "2026-10-14T08:00:00Z", "level": "WARN", "event": "retry", "context": {"attempt": 2, "order_id": "A1"}}\n{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "done", "context": {"user": null}}',
      '{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "started"}\n{"ts": "2026-10-14T08:00:00Z", "level": "WARN", "event": "retry", "context": {"order_id": "A1", "attempt": 2}}\n{"ts": "2026-10-14T08:00:00Z", "level": "INFO", "event": "done", "context": {"user": None}}',
    ],
  },
];

