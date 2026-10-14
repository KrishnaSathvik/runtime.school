import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

export const dataclassesAndTypeHints: PyLesson = {
  slug: "dataclasses-and-type-hints",
  ref: "python:dataclasses-and-type-hints",
  module: "patterns",
  number: 3,
  title: "Dataclasses and type hints",
  level: "advanced",
  summary:
    "Write record classes in a few lines with `@dataclass`, which generates `__init__`, `__repr__` and `==` from a list of typed fields. Give fields safe defaults, make records immutable with `frozen=True`, and use type hints to document what functions expect and return.",

  sections: [
    {
      label: "type hints",
      blocks: [
        {
          kind: "p",
          text: "A **type hint** says what type a value is meant to be: `def total(prices: list[float], tax: float = 0.2) -> float:`. Hints document the contract for readers and let tools (editors, type checkers like mypy) catch mistakes before the code runs. Python itself **doesn't enforce them**: `total(\"oops\")` still runs until something fails.",
        },
        {
          kind: "p",
          text: "Common forms: `int`, `str`, `list[str]`, `dict[str, int]`, `tuple[int, int]`, and `str | None` for a value that may be missing.",
        },
      ],
    },
    {
      label: "@dataclass",
      blocks: [
        {
          kind: "p",
          text: "For classes that are mostly data, `@dataclass` writes the boilerplate. List the fields with type hints in the class body; it generates an `__init__` that takes them in order, a `__repr__` showing them, and an `__eq__` that compares field by field.",
        },
        { kind: "code", code: 'from dataclasses import dataclass, field\n\n@dataclass\nclass Event:\n    name: str\n    user_id: int\n    tags: list[str] = field(default_factory=list)\n    source: str = "web"\n\nprint(Event("signup", 7))   # Event(name=\'signup\', user_id=7, tags=[], source=\'web\')' },
        {
          kind: "p",
          text: "Fields with defaults come after fields without. A mutable default must use `field(default_factory=list)`, so each instance gets a new list (a plain `= []` is refused with a `ValueError`, protecting you from the shared-list trap). Methods and properties work exactly as in any class.",
        },
      ],
    },
    {
      label: "frozen and asdict",
      blocks: [
        {
          kind: "p",
          text: "`@dataclass(frozen=True)` makes instances immutable: assigning to a field raises `FrozenInstanceError`, and the instances can be used as dictionary keys or set members. `dataclasses.asdict(obj)` turns an instance into a plain dictionary, handy for writing JSON. `dataclasses.replace(obj, field=value)` makes a changed copy.",
        },
      ],
    },
  ],

  example: {
    caption: "A typed event record, its defaults, equality and conversion to a dictionary. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import json\nfrom dataclasses import asdict, dataclass, field\n\n\n@dataclass\nclass Event:\n    name: str\n    user_id: int\n    tags: list[str] = field(default_factory=list)\n    source: str = "web"\n\n\na = Event("signup", 7)\nb = Event("signup", 7)\nc = Event("purchase", 7, ["sale"], source="app")\na.tags.append("first")\nprint(a)\nprint(a == b, b.tags)\nprint(json.dumps(asdict(c), sort_keys=True))',
  },

  walkthrough: [
    {
      title: "Hints document; they don't enforce",
      text: "The hint says `int`, but Python runs the call with a string anyway. Hints are for people and tools.",
      code: 'def double(n: int) -> int:\n    return n * 2\n\nprint(double(4))\nprint(double("ab"))\nprint(double.__annotations__)',
    },
    {
      title: "The generated __init__ and __repr__",
      text: "Arguments go to fields in order; the repr shows every field by name.",
      code: 'from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: float\n    y: float\n\np = Point(1.5, -2)\nprint(p, p.x)\nprint(Point(y=3, x=0))',
    },
    {
      title: "Equality compares fields",
      text: "Two dataclass instances with equal fields are `==`; for ordinary classes, `==` only matches the very same object.",
      code: 'from dataclasses import dataclass\n\n@dataclass\nclass Money:\n    amount: int\n    currency: str\n\nclass PlainMoney:\n    def __init__(self, amount, currency):\n        self.amount, self.currency = amount, currency\n\nprint(Money(5, "GBP") == Money(5, "GBP"))\nprint(PlainMoney(5, "GBP") == PlainMoney(5, "GBP"))',
    },
    {
      title: "frozen records",
      text: "A frozen instance can't be changed, but `replace` makes a modified copy.",
      code: 'from dataclasses import dataclass, replace, FrozenInstanceError\n\n@dataclass(frozen=True)\nclass Sku:\n    code: str\n    size: str\n\na = Sku("TSHIRT", "M")\nb = replace(a, size="L")\nprint(a, b, {a: 3}[a])\ntry:\n    a.size = "S"\nexcept FrozenInstanceError:\n    print("frozen: can\'t change size")',
    },
  ],

  mistakes: [
    {
      title: "A plain list as a default",
      text: "`@dataclass` refuses a mutable default like `[]`, because every instance would share it: `ValueError`.",
      code: "from dataclasses import dataclass\n\n@dataclass\nclass Basket:\n    items: list = []",
      raises: "ValueError",
      fix: "Use `items: list = field(default_factory=list)`.",
    },
    {
      title: "A field without a default after one with",
      text: "The generated `__init__` would have a required parameter after an optional one: `TypeError` when the class is defined.",
      code: 'from dataclasses import dataclass\n\n@dataclass\nclass Event:\n    source: str = "web"\n    name: str',
      raises: "TypeError",
      fix: "Put fields without defaults first.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "A typed event record",
      prompt:
        "Define a dataclass `Event` with fields `name` (str), `user_id` (int), `tags` (a list of str, defaulting to a new empty list) and `source` (str, default `\"web\"`). Add a method `to_dict()` that returns the event as a dictionary (`asdict` does this), and a property `is_tagged` that's `True` when there's at least one tag.",
      looksFor: [
        "`Event(\"signup\", 7)` works, with `tags == []` and `source == \"web\"`.",
        "Two events never share a `tags` list.",
        "`to_dict()` returns all four fields; `is_tagged` is a property.",
      ],
      starter: "from dataclasses import asdict, dataclass, field\n\n\n# Define the Event dataclass here.\n",
      task: {
        checks: [
          { kind: "expr", id: "defaults", label: "Defaults for tags and source", show: 'e = Event("signup", 7); (e.tags, e.source)', expr: 'e = Event("signup", 7)\nresult = (e.name, e.user_id, e.tags, e.source)', expected: py.tuple(s("signup"), i(7), py.list(), s("web")) },
          { kind: "expr", id: "separate", label: "Each event gets its own tags list", show: 'a, b = Event("x", 1), Event("y", 2); a.tags.append("t"); b.tags', expr: 'a = Event("x", 1)\nb = Event("y", 2)\na.tags.append("t")\nresult = b.tags', expected: py.list(), tip: "tags: list[str] = field(default_factory=list)." },
          { kind: "expr", id: "dict", label: "to_dict() returns every field", show: 'Event("buy", 3, ["sale"], "app").to_dict()', expr: 'Event("buy", 3, ["sale"], "app").to_dict()', expected: py.dict([[s("name"), s("buy")], [s("user_id"), i(3)], [s("tags"), py.list(s("sale"))], [s("source"), s("app")]]) },
          { kind: "expr", id: "tagged", label: "is_tagged is a property", show: '(Event("a", 1).is_tagged, Event("b", 1, ["x"]).is_tagged)', expr: '(Event("a", 1).is_tagged, Event("b", 1, ["x"]).is_tagged)', expected: py.tuple(py.bool(false), py.bool(true)), tip: "@property def is_tagged(self): return len(self.tags) > 0." },
          { kind: "expr", id: "eq", label: "Events with equal fields are equal", hidden: true, expr: 'Event("a", 1) == Event("a", 1) and Event("a", 1) != Event("a", 2)', expected: py.bool(true) },
        ],
      },
      hints: [
        "@dataclass above class Event:, then one line per field, like name: str.",
        'tags: list[str] = field(default_factory=list) and source: str = "web", after the fields without defaults.',
        "def to_dict(self): return asdict(self); and @property def is_tagged(self): return bool(self.tags).",
      ],
      answer: 'from dataclasses import asdict, dataclass, field\n\n\n@dataclass\nclass Event:\n    """One product event."""\n\n    name: str\n    user_id: int\n    tags: list[str] = field(default_factory=list)\n    source: str = "web"\n\n    def to_dict(self) -> dict:\n        return asdict(self)\n\n    @property\n    def is_tagged(self) -> bool:\n        return len(self.tags) > 0',
      wrong: [
        { code: 'from dataclasses import asdict, dataclass\n\nSHARED = []\n\n@dataclass\nclass Event:\n    name: str\n    user_id: int\n    tags: list = None\n    source: str = "web"\n    def __post_init__(self):\n        if self.tags is None:\n            self.tags = SHARED\n    def to_dict(self):\n        return asdict(self)\n    @property\n    def is_tagged(self):\n        return len(self.tags) > 0\n', fails: ["separate", "tagged"], why: "every event shares one list" },
        { code: 'from dataclasses import asdict, dataclass, field\n\n@dataclass\nclass Event:\n    name: str\n    user_id: int\n    tags: list = field(default_factory=list)\n    source: str = "web"\n    def to_dict(self):\n        return {"name": self.name, "user_id": self.user_id}\n    def is_tagged(self):\n        return len(self.tags) > 0\n', fails: ["dict", "tagged"], why: "partial dict, and is_tagged is a method" },
      ],
    },
    {
      id: "challenge-2",
      title: "Immutable money values",
      prompt:
        "Define a frozen dataclass `Money` with `amount` (int, in cents) and `currency` (str). Add a method `add(other)` that returns a **new** `Money` with the amounts added, raising `ValueError` if the currencies differ, and a `__str__` that shows it as `12.34 GBP`. Because it's frozen, attempts to change a field must fail.",
      looksFor: [
        "`Money(1234, \"GBP\")` is frozen: assigning to a field raises an error.",
        "`add` returns a new `Money` and refuses different currencies with `ValueError`.",
        "`str(Money(1234, \"GBP\"))` is `\"12.34 GBP\"`.",
      ],
      starter: "from dataclasses import dataclass\n\n\n# Define the Money dataclass here.\n",
      task: {
        checks: [
          { kind: "expr", id: "add", label: "add returns a new Money", show: 'a = Money(1234, "GBP"); b = a.add(Money(66, "GBP")); (b.amount, a.amount)', expr: 'a = Money(1234, "GBP")\nb = a.add(Money(66, "GBP"))\nresult = (b.amount, b.currency, a.amount, type(b).__name__)', expected: py.tuple(i(1300), s("GBP"), i(1234), s("Money")) },
          { kind: "expr", id: "currency", label: "Different currencies raise ValueError", show: 'Money(1, "GBP").add(Money(1, "EUR"))', expr: 'Money(1, "GBP").add(Money(1, "EUR"))', raises: "ValueError" },
          { kind: "expr", id: "frozen", label: "Fields can't be changed", show: 'Money(1, "GBP").amount = 5', expr: 'from dataclasses import FrozenInstanceError\nm = Money(1, "GBP")\ntry:\n    m.amount = 5\n    result = "changed"\nexcept FrozenInstanceError:\n    result = "frozen"', expected: s("frozen"), tip: "@dataclass(frozen=True)." },
          { kind: "expr", id: "str", label: "str shows amount and currency", show: 'str(Money(1234, "GBP")), str(Money(5, "EUR"))', expr: '(str(Money(1234, "GBP")), str(Money(5, "EUR")))', expected: py.tuple(s("12.34 GBP"), s("0.05 EUR")), tip: 'return f"{self.amount / 100:.2f} {self.currency}".' },
          { kind: "expr", id: "hashable", label: "Equal values work as dictionary keys", hidden: true, expr: '{Money(5, "GBP"): "five"}[Money(5, "GBP")]', expected: s("five") },
        ],
      },
      hints: [
        "@dataclass(frozen=True) above class Money:, with amount: int and currency: str.",
        'def add(self, other): if other.currency != self.currency: raise ValueError(...); return Money(self.amount + other.amount, self.currency).',
        'def __str__(self): return f"{self.amount / 100:.2f} {self.currency}".',
      ],
      answer: 'from dataclasses import dataclass\n\n\n@dataclass(frozen=True)\nclass Money:\n    """An amount of money in cents, in one currency."""\n\n    amount: int\n    currency: str\n\n    def add(self, other: "Money") -> "Money":\n        if other.currency != self.currency:\n            raise ValueError(f"can\'t add {other.currency} to {self.currency}")\n        return Money(self.amount + other.amount, self.currency)\n\n    def __str__(self) -> str:\n        return f"{self.amount / 100:.2f} {self.currency}"',
      wrong: [
        { code: 'from dataclasses import dataclass\n\n@dataclass\nclass Money:\n    amount: int\n    currency: str\n    def add(self, other):\n        if other.currency != self.currency:\n            raise ValueError("currency")\n        self.amount += other.amount\n        return self\n    def __str__(self):\n        return f"{self.amount / 100:.2f} {self.currency}"\n', fails: ["add", "frozen", "hashable"], why: "not frozen, and add changes self" },
      ],
    },
  ],

  quiz: [
    {
      id: "hints",
      prompt: "`def area(width: float, height: float) -> float:` is called as `area(\"3\", 2)`. What happens?",
      options: [
        { text: "Python runs it; `\"3\" * 2` gives `\"33\"`, because hints aren't enforced", correct: true, why: "Type hints are documentation and input for tools. A type checker would flag the call; Python doesn't." },
        { text: "A `TypeError`, because the hint says float", why: "Python doesn't check hints at run time." },
        { text: "Python converts `\"3\"` to `3.0`", why: "Hints never convert values." },
        { text: "A `SyntaxError`", why: "The call is valid Python." },
      ],
    },
    {
      id: "default-factory",
      prompt: "Why `tags: list = field(default_factory=list)` instead of `tags: list = []`?",
      options: [
        { text: "So each instance gets its own new list", correct: true, why: "`default_factory` calls `list()` for every instance; a single `[]` would be shared. `@dataclass` refuses the shared version outright." },
        { text: "Because lists can't be fields", why: "They can; they just need a factory as their default." },
        { text: "To make the class frozen", why: "Freezing is `@dataclass(frozen=True)`; it's unrelated." },
        { text: "It's only a style preference", why: "`tags: list = []` raises `ValueError` when the class is defined." },
      ],
    },
  ],

  outcomes: [
    "Annotate functions and fields with type hints, knowing Python doesn't enforce them.",
    "Define record classes with `@dataclass`, including defaults and `default_factory`.",
    "Use `frozen=True`, `asdict` and `replace` for immutable, serialisable records.",
    "Add methods and properties to dataclasses.",
  ],
};
