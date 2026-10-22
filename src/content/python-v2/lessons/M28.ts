/**
 * M28 Data Models & Typing: five lessons (PY-L28-01 … PY-L28-05).
 *
 * @dataclass: fields, defaults, default_factory, __post_init__ and frozen value objects (L01); @property for computed
 * attributes and setters that validate (L02); special methods: __repr__, __str__, __eq__, __lt__, __add__, __len__,
 * __contains__ (L03); type hints, what they document and what Python does not check at run time, and using them for a
 * real run-time check (L04); TypedDict for dictionary shapes and Protocol for structural interfaces (L05).
 *
 * Fixtures are Runtime Market (R01) products, orders, payments and reviews, and NOAA-style temperatures. Every claim
 * about typing is shown by running code: hints are stored but not enforced, and a static checker such as mypy, which
 * would read them before the program runs, is described rather than pretended to run.
 * Version 2: rewritten from five lessons about a MUG dataclass and a one-line property.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, exception: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises: exception,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});

export const m28Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L28-01 dataclasses
  {
    id: "PY-L28-01",
    version: 2,
    slug: "a-data-class",
    title: "Dataclasses: records without the boilerplate",
    lede: "A class that mainly holds data needs the same __init__, the same readable printout and the same comparison every time. @dataclass writes them for you from a list of annotated fields.",
    focus: "Define dataclasses with typed fields, defaults, default_factory and __post_init__, and use frozen dataclasses as values.",
    minutes: 20,
    objectives: [
      "Declare fields as `name: type` (with defaults) and let `@dataclass` write `__init__`, a readable printout and `==`",
      "Use `field(default_factory=list)` for a list per object, and `__post_init__` to tidy and validate",
      "Make an immutable, hashable value with `@dataclass(frozen=True)`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conversion", "defaultdict-call", "dict-get", "dict-literal", "dict-lookup", "exc-name", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "set-literal", "spaces-in-text", "string-format", "string-index", "string-method", "top-level-indent", "try-except", "type-call", "unquoted-name"],
    teaches: ["dataclass-dec", "field-ann"],
    blocks: [
      {
        kind: "text",
        md: "The classes in the Classes & Objects module repeated `self.sku = sku` for every attribute, printed as `<__main__.Product object at 0x…>`, and compared by identity. For classes whose job is mostly to hold data, the standard library's `dataclasses` module writes that code for you.\n\nPut `@dataclass` on the line above `class` and list the fields with **annotations**: `sku: str` means \"a field called sku, holding text\". The decorator reads that list and adds an `__init__` taking the fields in order, a printout showing every field, and `==` that compares the fields. A field with `= value` has a default, and fields with defaults must come after those without.",
      },
      {
        kind: "example",
        title: "A product in five lines",
        code: src`
from dataclasses import dataclass

@dataclass
class Product:
    sku: str
    name: str
    price: float
    stock: int = 0

mat = Product("SPO-11681", "Yoga mat", 31.0, 12)
lamp = Product("HOM-22847", "Desk lamp", 48.0)
print(mat)
print(lamp.stock, lamp == Product("HOM-22847", "Desk lamp", 48.0))
mat.stock -= 2
print(mat.stock, mat == Product("SPO-11681", "Yoga mat", 31.0, 12))
`,
        output: "Product(sku='SPO-11681', name='Yoga mat', price=31.0, stock=12)\n0 True\n10 False\n",
        note: "`==` now compares the data: two separate products with the same fields are equal, and after the stock changes they no longer are. The annotations describe the fields; they don't convert or check values (see Data Models & Typing).",
      },
      {
        kind: "error-example",
        title: "A list as a field default",
        code: src`
from dataclasses import dataclass

@dataclass
class Basket:
    customer_id: str
    items: list = []

print(Basket("C00038"))
`,
        error: "ValueError",
        output: "",
        note: "dataclasses refuses the shared-list trap from the Classes & Objects module outright, when the class is defined: `ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory`.",
      },
      {
        kind: "text",
        md: "Three more tools cover most real data classes:\n\n- `field(default_factory=list)` calls `list()` for **every new object**, so each gets its own list.\n- `__post_init__(self)` runs right after the generated `__init__`: the place to tidy and validate fields (raise ValueError, as in the Classes & Objects module).\n- `@dataclass(frozen=True)` makes objects read-only. Assigning a field raises `FrozenInstanceError` (a kind of AttributeError). Frozen objects with equal fields hash equally, so they work in sets and as dictionary keys, which suits values like money or a (warehouse, SKU) pair.",
      },
      {
        kind: "example",
        title: "Orders, lines and money",
        code: src`
from dataclasses import dataclass, field

@dataclass
class OrderLine:
    sku: str
    quantity: int
    unit_price: float

    def __post_init__(self):
        self.sku = self.sku.strip().upper()
        if self.quantity < 1:
            raise ValueError(f"{self.sku}: quantity must be at least 1")

@dataclass
class Order:
    order_id: str
    customer_id: str
    lines: list = field(default_factory=list)

    def total(self):
        return round(sum(line.quantity * line.unit_price for line in self.lines), 2)

@dataclass(frozen=True)
class Money:
    cents: int
    currency: str

first = Order("O100282", "C00077")
second = Order("O100918", "C01338")
first.lines.append(OrderLine(" spo-11681", 2, 17.92))
print(first.total(), second.lines)
print(first.lines[0])
price = Money(1250, "GBP")
try:
    price.cents = 999
except AttributeError as err:
    print(type(err).__name__, err)
print(price == Money(1250, "GBP"), len({price, Money(1250, "GBP"), Money(1250, "EUR")}))
`,
        output: "35.84 []\nOrderLine(sku='SPO-11681', quantity=2, unit_price=17.92)\nFrozenInstanceError cannot assign to field 'cents'\nTrue 2\n",
        note: "Each order has its own lines list. `__post_init__` tidied the SKU. Dataclasses can still have ordinary methods such as `total`. The set holds two Money values, because the two GBP amounts are equal and hash alike.",
      },
      {
        kind: "text",
        md: "**When to use it:** for records: rows from a file, API payloads, configuration, value objects. Keep ordinary classes for objects whose main job is behaviour.\n\n**Mistakes to avoid:** expecting annotations to convert or check types (`Product(\"A\", \"B\", \"31\")` stores the text \"31\"; validate in `__post_init__`); a list default instead of `field(default_factory=list)`; and a field without a default after one with a default (a TypeError when the class is defined).",
      },
    ],
    tryIt: {
      id: "try",
      title: "From boilerplate to a dataclass",
      prompt: "Rewrite `Customer` as a dataclass with fields `customer_id`, `name` and `city` (default `\"\"`). The hand-written `__init__` goes; printing and comparing customers should then work by their data.",
      spec: [
        ["Class", "`@dataclass class Customer` with `customer_id: str`, `name: str`, `city: str = \"\"`"],
        ["Then", "`print(Customer(\"C00077\", \"Jamal Walker\"))` shows `Customer(customer_id='C00077', name='Jamal Walker', city='')`"],
      ],
      starter: src`
from dataclasses import dataclass

class Customer:
    def __init__(self, customer_id, name, city=""):
        self.customer_id = customer_id
        self.name = name
        self.city = city

jamal = Customer("C00077", "Jamal Walker")
print(jamal)
print(jamal == Customer("C00077", "Jamal Walker"))
`,
      answer: src`
from dataclasses import dataclass

@dataclass
class Customer:
    customer_id: str
    name: str
    city: str = ""

jamal = Customer("C00077", "Jamal Walker")
print(jamal)
print(jamal == Customer("C00077", "Jamal Walker"))
`,
      wrong: [
        {
          code: src`
from dataclasses import dataclass

@dataclass
class Customer:
    customer_id: str
    name: str
    city: str
`,
          fails: ["repr", "equal"],
          why: "without a default for `city`, a customer can't be created from an id and a name",
        },
      ],
      hints: [
        "Put the decorator on the line above `class`.",
        "Replace the `__init__` with three annotated field lines, in the same order.",
        "Give `city` its default with `= \"\"` on its field line.",
      ],
      task: {
        checks: [
          expr("repr", "A readable printout", "result = repr(Customer('C00077', 'Jamal Walker'))", "Customer(customer_id='C00077', name='Jamal Walker', city='')", { show: "repr(Customer(\"C00077\", \"Jamal Walker\"))" }),
          expr("equal", "Customers compare by their data", "result = [Customer('C00077', 'Jamal Walker') == Customer('C00077', 'Jamal Walker'), Customer('C1', 'A', 'Houston') == Customer('C1', 'A')]", [true, false], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A review that checks itself",
        prompt: "Write a dataclass `Review` with fields `product_id`, `rating` and `comment` (default `\"\"`). Reviews arrive from a form, so `__post_init__` must turn a rating given as text into an int, strip the comment's outer spaces, and raise `ValueError` for a rating outside 1–5.",
        spec: [
          ["Class", "`@dataclass class Review` with `product_id: str`, `rating: int`, `comment: str = \"\"`"],
          ["`__post_init__`", "`rating` → int (it may be text); `comment` stripped; rating not 1–5 → ValueError"],
          ["Example", "`Review(\"P0205\", \"4\", \"  Good grip \")` → `Review(product_id='P0205', rating=4, comment='Good grip')`"],
        ],
        starter: src`
from dataclasses import dataclass

@dataclass
class Review:
    product_id: str
    rating: int

print(Review("P0205", "4", "  Good grip "))
`,
        answer: src`
from dataclasses import dataclass

@dataclass
class Review:
    product_id: str
    rating: int
    comment: str = ""

    def __post_init__(self):
        self.rating = int(self.rating)
        self.comment = self.comment.strip()
        if not 1 <= self.rating <= 5:
            raise ValueError(f"{self.product_id}: rating {self.rating} is not between 1 and 5")

print(Review("P0205", "4", "  Good grip "))
`,
        alternatives: [
          src`
from dataclasses import dataclass

@dataclass
class Review:
    product_id: str
    rating: int
    comment: str = ""

    def __post_init__(self):
        rating = int(self.rating)
        if rating < 1 or rating > 5:
            raise ValueError("rating must be 1 to 5")
        self.rating = rating
        self.comment = self.comment.strip()
`,
        ],
        wrong: [
          {
            code: src`
from dataclasses import dataclass

@dataclass
class Review:
    product_id: str
    rating: int
    comment: str = ""

    def __post_init__(self):
        if not 1 <= int(self.rating) <= 5:
            raise ValueError("rating must be 1 to 5")
        self.comment = self.comment.strip()
`,
            fails: ["edges", "equal", "tidy"],
            why: "the rating is checked as a number but stored as the original text",
          },
          {
            code: src`
from dataclasses import dataclass

@dataclass
class Review:
    product_id: str
    rating: int
    comment: str = ""

    def __post_init__(self):
        self.rating = int(self.rating)
        self.comment = self.comment.strip()
`,
            fails: ["range"],
            why: "nothing stops a rating of 0 or 9",
          },
        ],
        hints: [
          "Add the `comment` field with its default, then a `__post_init__(self)` method.",
          "Inside it, reassign `self.rating` and `self.comment` with their tidied values.",
          "Check the converted rating with a chained comparison and raise ValueError if it is outside 1–5.",
        ],
        task: {
          checks: [
            expr("tidy", "Text rating and padded comment", "result = repr(Review('P0205', '4', '  Good grip '))", "Review(product_id='P0205', rating=4, comment='Good grip')", { show: "Review(\"P0205\", \"4\", \"  Good grip \")" }),
            expr("equal", "Equal reviews compare equal", "result = [Review('P0421', 5) == Review('P0421', '5', ''), Review('P0421', 5) == Review('P0421', 4)]", [true, false], { hidden: true }),
            expr("range", "Ratings outside 1 to 5 are refused", "_out = []\nfor _r in [0, 6, '9', -1]:\n    try:\n        Review('P1', _r)\n        _out.append('created')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused", "refused", "refused"], { show: "Review(\"P1\", <0, 6, \"9\", -1>)" }),
            expr("edges", "Ratings of 1 and 5 are fine", "result = [Review('P1', 1).rating, Review('P1', '5').rating]", [1, 5], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Stock per warehouse and SKU",
        prompt: "Stock movements arrive as rows. Write a frozen dataclass `StockKey` with fields `warehouse` and `sku`, and a function `stock_totals(movements)` that adds up the `qty` of every movement into a dictionary keyed by `StockKey`. Because frozen dataclasses with equal fields hash alike, two rows for the same warehouse and SKU land on the same key.",
        spec: [
          ["Class", "`@dataclass(frozen=True) class StockKey` with `warehouse: str` and `sku: str`"],
          ["Function", "`stock_totals(movements)`; each movement is `{\"warehouse\": …, \"sku\": …, \"qty\": int}` (qty may be negative)"],
          ["Returns", "`{StockKey(warehouse, sku): total qty}`"],
        ],
        starter: src`
from dataclasses import dataclass

def stock_totals(movements):
    return {}

movements = [
    {"warehouse": "HOU", "sku": "SPO-11681", "qty": 12},
    {"warehouse": "NYC", "sku": "SPO-11681", "qty": 4},
    {"warehouse": "HOU", "sku": "SPO-11681", "qty": -7},
]
print(stock_totals(movements))
`,
        answer: src`
from dataclasses import dataclass

@dataclass(frozen=True)
class StockKey:
    warehouse: str
    sku: str

def stock_totals(movements):
    totals = {}
    for move in movements:
        key = StockKey(move["warehouse"], move["sku"])
        totals[key] = totals.get(key, 0) + move["qty"]
    return totals

movements = [
    {"warehouse": "HOU", "sku": "SPO-11681", "qty": 12},
    {"warehouse": "NYC", "sku": "SPO-11681", "qty": 4},
    {"warehouse": "HOU", "sku": "SPO-11681", "qty": -7},
]
print(stock_totals(movements))
`,
        alternatives: [
          src`
from collections import defaultdict
from dataclasses import dataclass

@dataclass(frozen=True)
class StockKey:
    warehouse: str
    sku: str

def stock_totals(movements):
    totals = defaultdict(int)
    for move in movements:
        totals[StockKey(move["warehouse"], move["sku"])] += move["qty"]
    return dict(totals)
`,
        ],
        wrong: [
          {
            code: src`
from dataclasses import dataclass

@dataclass
class StockKey:
    warehouse: str
    sku: str

def stock_totals(movements):
    totals = {}
    for move in movements:
        key = StockKey(move["warehouse"], move["sku"])
        totals[key] = totals.get(key, 0) + move["qty"]
    return totals
`,
            fails: ["totals", "frozen", "keys"],
            why: "a dataclass that isn't frozen defines `==` but no hash, so it can't be a dictionary key at all",
          },
          {
            code: src`
from dataclasses import dataclass

@dataclass(frozen=True)
class StockKey:
    warehouse: str
    sku: str

def stock_totals(movements):
    totals = {}
    for move in movements:
        totals[StockKey(move["warehouse"], move["sku"])] = move["qty"]
    return totals
`,
            fails: ["totals"],
            why: "each movement replaces the stored quantity instead of adding to it",
          },
        ],
        hints: [
          "The class needs `frozen=True` in the decorator, which also makes it hashable.",
          "Build a `StockKey` for each movement and use it like any dictionary key.",
          "Add the quantity to what is already stored; `get` with a default of 0 handles the first movement.",
        ],
        task: {
          checks: [
            expr("totals", "Totals per warehouse and SKU", "result = stock_totals([{'warehouse': 'HOU', 'sku': 'SPO-11681', 'qty': 12}, {'warehouse': 'NYC', 'sku': 'SPO-11681', 'qty': 4}, {'warehouse': 'HOU', 'sku': 'SPO-11681', 'qty': -7}, {'warehouse': 'HOU', 'sku': 'HOM-22847', 'qty': 3}]) == {StockKey('HOU', 'SPO-11681'): 5, StockKey('NYC', 'SPO-11681'): 4, StockKey('HOU', 'HOM-22847'): 3}", true, { show: "stock_totals(movements) == {StockKey(\"HOU\", \"SPO-11681\"): 5, ...}" }),
            raisesExpr("frozen", "StockKey can't be changed", "StockKey('HOU', 'X').sku = 'Y'", "FrozenInstanceError", { show: "StockKey(\"HOU\", \"X\").sku = \"Y\"" }),
            expr("keys", "Equal keys are one key", "result = [StockKey('A', 'B') == StockKey('A', 'B'), len({StockKey('A', 'B'), StockKey('A', 'B'), StockKey('B', 'A')})]", [true, 2], { hidden: true }),
            expr("empty", "No movements", "result = stock_totals([])", {}, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from dataclasses import dataclass, field

@dataclass
class Ticket:
    subject: str
    priority: int = 3
    tags: list = field(default_factory=list)

a = Ticket("Parcel damaged", 1)
b = Ticket("Wrong size")
a.tags.append("refund")
print(b)
print(a == Ticket("Parcel damaged", 1, ["refund"]))
`,
        choices: [
          "Ticket(subject='Wrong size', priority=3, tags=[])\nTrue",
          "Ticket(subject='Wrong size', priority=3, tags=['refund'])\nTrue",
          "Ticket(subject='Wrong size', priority=3, tags=[])\nFalse",
          "<__main__.Ticket object>\nFalse",
        ],
        answer: 0,
        why: "`default_factory=list` gives each ticket its own list, so b's tags stay empty. Dataclass `==` compares all fields, so a equals a new ticket with the same three values.",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting annotations to convert values. What does this print?",
        program: src`
from dataclasses import dataclass

@dataclass
class Line:
    sku: str
    quantity: int

line = Line("SPO-11681", "2")
print(line.quantity * 3, type(line.quantity).__name__)
`,
        choices: ["222 str", "6 int", "TypeError", "6 str"],
        answer: 0,
        why: "`quantity: int` documents the intended type but neither converts nor checks it; the text \"2\" is stored as given, and text times 3 repeats it. Convert or validate in `__post_init__`.",
      },
      {
        id: "q3",
        prompt: "Which needs `@dataclass(frozen=True)` rather than a plain dataclass?",
        choices: [
          "A (currency, amount) value used as a dictionary key",
          "A shopping basket that items are added to",
          "An order whose status changes as it ships",
          "A customer record whose email can be updated",
        ],
        answer: 0,
        why: "Values that are compared and used as keys should never change after creation, and frozen dataclasses are hashable. Things that change over time need ordinary (mutable) objects.",
      },
    ],
    review: [
      "`@dataclass` writes `__init__`, a readable printout and field-by-field `==` from `name: type` lines.",
      "Use `field(default_factory=list)` for per-object lists and `__post_init__` to tidy and validate.",
      "`frozen=True` makes read-only, hashable values.",
      "Next: properties, for attributes that are computed or checked when they are read or set.",
    ],
  },

  // ------------------------------------------------------------------ PY-L28-02 properties
  {
    id: "PY-L28-02",
    version: 2,
    slug: "a-property",
    title: "Properties: computed and validated attributes",
    lede: "A property looks like an attribute to the code that uses it, but runs a method when it is read, and optionally another when it is set. That lets a class compute values on demand and refuse bad assignments.",
    focus: "Use @property for attributes computed on every read, and a setter to validate assignments.",
    minutes: 18,
    objectives: [
      "Turn a computed method into a read-only attribute with `@property`",
      "Add a setter with `@name.setter` that converts and validates assigned values",
      "Run the setter's checks in `__init__` too, so construction and later changes obey the same rule",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comp-if", "comparison", "conditional-expr", "conversion", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "init-method", "list-comp", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "top-level-indent", "try-except", "unicode-text"],
    teaches: ["property-dec"],
    blocks: [
      {
        kind: "text",
        md: "In the Classes & Objects module a line's total was either stored (and went stale when the quantity changed) or a method (`line.total()`). A **property** gives you both: callers write `line.total` like an attribute, and every read runs a method, so it is always current.\n\nPut `@property` above a method that takes only `self`. The method's name becomes the attribute name. There is no setter yet, so assigning to it is an error: a **read-only** attribute.",
      },
      {
        kind: "example",
        title: "A line total that is always current",
        code: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    @property
    def total(self):
        return round(self.quantity * self.unit_price, 2)

line = OrderLine("SPO-11681", 2, 17.92)
print(line.total)
line.quantity = 3
print(line.total)
`,
        output: "35.84\n53.76\n",
        note: "No brackets: `line.total` runs the method. Changing the quantity changes the total, because nothing was stored.",
      },
      {
        kind: "error-example",
        title: "Assigning to a read-only property",
        code: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    @property
    def total(self):
        return round(self.quantity * self.unit_price, 2)

line = OrderLine("SPO-11681", 2, 17.92)
print(line.total)
line.total = 30.0
`,
        error: "AttributeError",
        output: "35.84\n",
        note: "A total is derived from quantity and price, so setting it directly makes no sense, and Python says so: `AttributeError: property 'total' of 'OrderLine' object has no setter`.",
      },
      {
        kind: "text",
        md: "A property can also have a **setter**: `@price.setter` above a second method with the same name, taking the new value. It runs on every assignment, so it can convert and validate. The value itself is stored under a different name, by convention with a leading underscore (`self._price`), which means \"internal: use the property\".\n\nIf `__init__` assigns through the property (`self.price = price`), the setter's checks also run when the object is created, so there is one rule for both.",
      },
      {
        kind: "example",
        title: "A price that can't go negative",
        code: src`
class Product:
    def __init__(self, sku, price):
        self.sku = sku
        self.price = price

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        value = round(float(value), 2)
        if value < 0:
            raise ValueError(f"{self.sku}: price can't be negative ({value})")
        self._price = value

mat = Product("SPO-11681", "31")
print(mat.price)
mat.price = 27.499
print(mat.price)
for bad in [-5, "free"]:
    try:
        mat.price = bad
    except ValueError as err:
        print("refused:", err)
print(mat.price)
try:
    Product("HOM-22847", -48)
except ValueError as err:
    print("refused:", err)
`,
        output: "31.0\n27.5\nrefused: SPO-11681: price can't be negative (-5.0)\nrefused: could not convert string to float: 'free'\n27.5\nrefused: HOM-22847: price can't be negative (-48.0)\n",
        note: "Text \"31\" became 31.0 and 27.499 became 27.5. Refused assignments leave the old price in place. The constructor goes through the same setter, so a negative price can't get in that way either.",
      },
      {
        kind: "text",
        md: "**When to use it:** for values derived from other attributes (totals, full names, flags), and for attributes with rules that must hold after every change. Start with plain attributes; turning one into a property later doesn't change any calling code.\n\n**Mistakes to avoid:** storing the value under the property's own name inside the setter (`self.price = value` calls the setter again, forever: RecursionError); slow work in a property (callers expect attribute reads to be cheap); and properties with surprising side effects.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A full name without brackets",
      prompt: "`full_name()` is a method, but the rest of the code would like to read `customer.full_name` like the other attributes. Turn it into a property.",
      spec: [
        ["Change", "`customer.full_name` (no brackets) returns `\"First Last\"`"],
      ],
      starter: src`
class Customer:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name

    def full_name(self):
        return f"{self.first_name} {self.last_name}"

nora = Customer("Nora", "Garcia")
print(nora.full_name())
`,
      answer: src`
class Customer:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

nora = Customer("Nora", "Garcia")
print(nora.full_name)
`,
      wrong: [
        {
          code: src`
class Customer:
    def __init__(self, first_name, last_name):
        self.first_name = first_name
        self.last_name = last_name
        self.full_name = f"{first_name} {last_name}"
`,
          fails: ["current"],
          why: "the name is stored once, so it goes stale when a part of it changes",
        },
      ],
      hints: [
        "One line changes in the class: a decorator above the method.",
        "The property's name is the method's name.",
        "Callers then drop the brackets.",
      ],
      task: {
        checks: [
          expr("name", "full_name reads like an attribute", "result = Customer('Nora', 'Garcia').full_name", "Nora Garcia", { show: "Customer(\"Nora\", \"Garcia\").full_name" }),
          expr("current", "It follows changes", "_c = Customer('Grace', 'Walker')\n_c.last_name = 'Lee'\nresult = [_c.full_name, isinstance(Customer.full_name, property)]", ["Grace Lee", true], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A temperature in two scales",
        prompt: "Weather data mixes Celsius and Fahrenheit. Write `Temperature(celsius)` that stores one value but offers both scales as properties. `celsius` has a setter that refuses anything below absolute zero (−273.15 °C) with `ValueError`; `fahrenheit` is computed (°F = °C × 9 / 5 + 32) and also has a setter, which converts and stores Celsius, so the absolute-zero rule applies to it too.",
        spec: [
          ["Class", "`Temperature(celsius)`"],
          ["`celsius`", "property with a setter; below −273.15 → ValueError; also checked in `__init__`"],
          ["`fahrenheit`", "property, rounded to 2 places; its setter stores `(f − 32) × 5 / 9` as Celsius"],
        ],
        starter: src`
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

reading = Temperature(21.5)
print(reading.celsius, reading.fahrenheit)
reading.fahrenheit = 32
print(reading.celsius)
`,
        answer: src`
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError(f"{value} °C is below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):
        return round(self.celsius * 9 / 5 + 32, 2)

    @fahrenheit.setter
    def fahrenheit(self, value):
        self.celsius = (value - 32) * 5 / 9

reading = Temperature(21.5)
print(reading.celsius, reading.fahrenheit)
reading.fahrenheit = 32
print(reading.celsius)
`,
        alternatives: [
          src`
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._c

    @celsius.setter
    def celsius(self, value):
        if value >= -273.15:
            self._c = value
        else:
            raise ValueError("below absolute zero")

    @property
    def fahrenheit(self):
        return round(self._c * 1.8 + 32, 2)

    @fahrenheit.setter
    def fahrenheit(self, value):
        self.celsius = (value - 32) / 1.8
`,
        ],
        wrong: [
          {
            code: src`
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):
        return round(self.celsius * 9 / 5 + 32, 2)

    @fahrenheit.setter
    def fahrenheit(self, value):
        self._celsius = (value - 32) * 5 / 9
`,
            fails: ["f-floor"],
            why: "the Fahrenheit setter writes `_celsius` directly, skipping the absolute-zero check",
          },
          {
            code: src`
class Temperature:
    def __init__(self, celsius):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        self._celsius = value

    @property
    def fahrenheit(self):
        return round(self.celsius * 9 / 5 + 32, 2)

    @fahrenheit.setter
    def fahrenheit(self, value):
        self.celsius = (value - 32) * 5 / 9
`,
            fails: ["init"],
            why: "`__init__` stores the value directly, so an impossible temperature can still be created",
          },
        ],
        hints: [
          "Store Celsius under an internal name; both properties read from it.",
          "The Celsius setter holds the only check. Make `__init__` and the Fahrenheit setter assign through `self.celsius` so they use it.",
          "Fahrenheit's getter converts and rounds; its setter converts the other way.",
        ],
        task: {
          checks: [
            expr("both", "Both scales", "_t = Temperature(21.5)\n_a = [_t.celsius, _t.fahrenheit]\n_t.fahrenheit = 32\nresult = _a + [_t.celsius, _t.fahrenheit]", [21.5, 70.7, py.float(0), py.float(32)], { show: "Temperature(21.5): celsius, fahrenheit; then fahrenheit = 32" }),
            raisesExpr("floor", "Below absolute zero in Celsius", "_t = Temperature(10)\n_t.celsius = -300", "ValueError", { show: "temperature.celsius = -300" }),
            raisesExpr("f-floor", "Below absolute zero in Fahrenheit", "_t = Temperature(10)\n_t.fahrenheit = -500", "ValueError", { hidden: true }),
            raisesExpr("init", "An impossible temperature at creation", "Temperature(-274)", "ValueError", { hidden: true }),
            expr("edge", "Exactly absolute zero is allowed", "result = Temperature(-273.15).fahrenheit", -459.67, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A balance that can only be read",
        prompt: "Write `Account(owner)` that keeps a list of transactions (positive for deposits, negative for withdrawals) and never stores a balance. `balance` is a read-only property: the sum of the transactions. `deposit(amount)` and `withdraw(amount)` add transactions; amounts must be positive, and a withdrawal larger than the balance is refused (`ValueError`). `largest_deposit` is another property: the biggest deposit, or `None` if there are none.",
        spec: [
          ["Class", "`Account(owner)` with attributes `owner` and `transactions` (starts empty)"],
          ["Methods", "`deposit(amount)`, `withdraw(amount)`: ValueError for amount ≤ 0, or a withdrawal above the balance"],
          ["Properties", "`balance` (read-only, rounded to 2 places), `largest_deposit` (None when there are no deposits)"],
        ],
        starter: src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.transactions = []

nora = Account("Nora Garcia")
nora.deposit(120.0)
nora.withdraw(35.5)
print(nora.balance, nora.largest_deposit, nora.transactions)
`,
        answer: src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.transactions = []

    @property
    def balance(self):
        return round(sum(self.transactions), 2)

    @property
    def largest_deposit(self):
        deposits = [amount for amount in self.transactions if amount > 0]
        return max(deposits) if deposits else None

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposits must be positive")
        self.transactions.append(amount)

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawals must be positive")
        if amount > self.balance:
            raise ValueError(f"{self.owner}: balance is only {self.balance}")
        self.transactions.append(-amount)

nora = Account("Nora Garcia")
nora.deposit(120.0)
nora.withdraw(35.5)
print(nora.balance, nora.largest_deposit, nora.transactions)
`,
        alternatives: [
          src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.transactions = []

    @property
    def balance(self):
        total = 0
        for amount in self.transactions:
            total += amount
        return round(total, 2)

    @property
    def largest_deposit(self):
        best = None
        for amount in self.transactions:
            if amount > 0 and (best is None or amount > best):
                best = amount
        return best

    def deposit(self, amount):
        if not amount > 0:
            raise ValueError("positive amounts only")
        self.transactions.append(amount)

    def withdraw(self, amount):
        if not amount > 0 or amount > self.balance:
            raise ValueError("can't withdraw that")
        self.transactions.append(-amount)
`,
        ],
        wrong: [
          {
            code: src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.transactions = []
        self.balance = 0

    @property
    def largest_deposit(self):
        deposits = [a for a in self.transactions if a > 0]
        return max(deposits) if deposits else None

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("positive only")
        self.transactions.append(amount)
        self.balance += amount

    def withdraw(self, amount):
        if amount <= 0 or amount > self.balance:
            raise ValueError("can't withdraw that")
        self.transactions.append(-amount)
        self.balance -= amount
`,
            fails: ["read-only"],
            why: "the balance is a stored attribute, so any code can overwrite it and it can drift from the transactions",
          },
          {
            code: src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.transactions = []

    @property
    def balance(self):
        return round(sum(self.transactions), 2)

    @property
    def largest_deposit(self):
        return max(self.transactions)

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("positive only")
        self.transactions.append(amount)

    def withdraw(self, amount):
        if amount <= 0 or amount > self.balance:
            raise ValueError("can't withdraw that")
        self.transactions.append(-amount)
`,
            fails: ["no-deposits"],
            why: "`max` of an empty list raises ValueError instead of giving None for a new account",
          },
        ],
        hints: [
          "Neither property stores anything: both read `self.transactions` each time.",
          "`withdraw` compares the amount with `self.balance`, the property, before adding the transaction.",
          "With no deposits, `largest_deposit` must return None rather than calling `max` on nothing.",
        ],
        task: {
          checks: [
            expr("flow", "Deposits, a withdrawal and the balance", "_a = Account('Nora Garcia')\n_a.deposit(120.0)\n_a.withdraw(35.5)\n_a.deposit(10)\nresult = [_a.balance, _a.largest_deposit, _a.transactions]", [94.5, py.float(120), [py.float(120), -35.5, 10]], { show: "deposit 120, withdraw 35.5, deposit 10" }),
            raisesExpr("overdraw", "Withdrawing more than the balance", "_a = Account('Jamal')\n_a.deposit(20)\n_a.withdraw(20.01)", "ValueError", { show: "deposit 20, withdraw 20.01" }),
            raisesExpr("read-only", "The balance can't be assigned", "_a = Account('Grace')\n_a.balance = 1000000", "AttributeError", { hidden: true }),
            expr("no-deposits", "A new account", "_a = Account('Theo')\nresult = [_a.balance, _a.largest_deposit]", [0, null], { hidden: true }),
            raisesExpr("zero", "A deposit of zero", "Account('Ana').deposit(0)", "ValueError", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Box:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.stored_area = width * height

    @property
    def area(self):
        return self.width * self.height

box = Box(30, 20)
box.width = 40
print(box.area, box.stored_area)
`,
        choices: ["800 600", "600 600", "800 800", "600 800"],
        answer: 0,
        why: "The property recalculates on every read, so it sees the new width. The stored value was computed once in `__init__` and went stale.",
      },
      {
        id: "q2",
        prompt: "A common mistake: setting up a computed property in __init__. What does this print?",
        program: src`
class Order:
    def __init__(self, lines):
        self.lines = lines
        self.total = 0

    @property
    def total(self):
        return sum(self.lines)

try:
    order = Order([17.92, 4.99])
    print("created", order.total)
except AttributeError as err:
    print("AttributeError:", err)
`,
        choices: ["AttributeError: property 'total' of 'Order' object has no setter", "created 22.91", "created 0", "TypeError"],
        answer: 0,
        why: "`total` is a read-only property, so `self.total = 0` in `__init__` is an assignment to it, and there is no setter. A computed value needs no starting value at all. (The opposite slip, a setter that assigns to its own property name, calls itself over and over until Python gives up with RecursionError, which is why the value lives under a different name such as `_price`.)",
      },
      {
        id: "q3",
        prompt: "Which is the best fit for a read-only property?",
        choices: [
          "An order's item_count, worked out from its lines",
          "A customer's email address that customers can change",
          "A method that sends an email",
          "A counter that must be increased by 1 on each call",
        ],
        answer: 0,
        why: "A value derived from other attributes should be computed, not stored, and nobody should set it directly. Changeable data stays a plain (or validated) attribute, and actions stay methods.",
      },
    ],
    review: [
      "`@property` runs a method when an attribute is read, so derived values are always current.",
      "`@name.setter` runs on assignment; store the value under an internal name such as `_price`.",
      "Assign through the property in `__init__` so creation and later changes follow the same rule.",
      "Next: special methods that make objects print, compare, add up and answer `len` and `in`.",
    ],
  },

  // ------------------------------------------------------------------ PY-L28-03 special methods
  {
    id: "PY-L28-03",
    version: 2,
    slug: "special-methods",
    title: "Special methods: printing, comparing and operators",
    lede: "Methods with double-underscore names are how Python's own syntax reaches your objects: print uses __str__, == uses __eq__, sorted uses __lt__, + uses __add__, len and in use __len__ and __contains__.",
    focus: "Implement __repr__, __str__, __eq__, __lt__, __add__, __len__ and __contains__ so objects work with Python's built-in syntax.",
    minutes: 20,
    objectives: [
      "Write `__repr__` for developers and `__str__` for users",
      "Define `__eq__` and `__lt__` so objects compare by value and can be sorted, returning NotImplemented for other types",
      "Support `+`, `len()` and `in` with `__add__`, `__len__` and `__contains__`",
    ],
    requires: ["aggregate-call", "all-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "conversion", "dict-get", "dict-iterate", "dict-literal", "except-type", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "set-literal", "string-check", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-literal", "tuple-unpack", "unicode-text", "unquoted-name"],
    teaches: ["str-method", "operator-methods"],
    blocks: [
      {
        kind: "text",
        md: "Python's syntax calls methods with special names, so a class can join in:\n\n- `repr(x)`, and printing a list of objects, call `__repr__`: aim for something that looks like the code to recreate the object, e.g. `Money(1799, 'GBP')`.\n- `print(x)` and `str(x)` call `__str__`: a friendly text for users, e.g. `£17.99`. Without it, Python falls back to `__repr__`.\n- `a == b` calls `a.__eq__(b)`; `a < b` (and so `sorted`, `min`, `max`) calls `__lt__`; `a + b` calls `__add__`.\n\nWhen the other value is a type your method doesn't handle, return the special value **NotImplemented**. Python then tries the other operand's method, and if that fails too, `==` falls back to identity (False) and `+` raises TypeError, which is what you want for `money + \"cake\"`.",
      },
      {
        kind: "example",
        title: "Money that prints, compares and adds",
        code: src`
class Money:
    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __repr__(self):
        return f"Money({self.cents}, {self.currency!r})"

    def __str__(self):
        symbol = {"GBP": "£", "USD": "$", "EUR": "€"}[self.currency]
        return f"{symbol}{self.cents // 100}.{self.cents % 100:02d}"

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.cents, self.currency) == (other.cents, other.currency)

    def __add__(self, other):
        if not isinstance(other, Money) or other.currency != self.currency:
            return NotImplemented
        return Money(self.cents + other.cents, self.currency)

price = Money(1799)
shipping = Money(350)
print(price + shipping)
print(repr(price + shipping), [price, shipping])
print(price == Money(1799, "GBP"), price == Money(1799, "EUR"), price == 17.99)
`,
        output: "£21.49\nMoney(2149, 'GBP') [Money(1799, 'GBP'), Money(350, 'GBP')]\nTrue False False\n",
        note: "`print` used `__str__`; the list shows each item's `__repr__`. Comparing tuples of fields is a compact way to write `__eq__`. `price == 17.99` returned NotImplemented from our method, so Python fell back to False. `:02d` pads the pence to two digits.",
      },
      {
        kind: "error-example",
        title: "Sorting objects that can't compare",
        code: src`
class Version:
    def __init__(self, text):
        self.parts = tuple(int(part) for part in text.split("."))

releases = [Version("1.10.0"), Version("1.9.2"), Version("2.0.0")]
print(len(releases))
print(sorted(releases))
`,
        error: "TypeError",
        output: "3\n",
        note: "`sorted` needs `<` between the items, and the class doesn't define it: `TypeError: '<' not supported between instances of 'Version' and 'Version'`. A `__lt__` comparing `self.parts` would sort them numerically (1.9.2 before 1.10.0, which plain text sorting gets wrong).",
      },
      {
        kind: "text",
        md: "Containers have their own hooks. `len(x)` calls `__len__`, which must return a whole number; `item in x` calls `__contains__`. A bonus: an object with `__len__` is false in an `if` when its length is 0, just like an empty list.",
      },
      {
        kind: "example",
        title: "A basket that answers len and in",
        code: src`
class Basket:
    def __init__(self, customer_id):
        self.customer_id = customer_id
        self.quantities = {}

    def add_item(self, sku, quantity=1):
        self.quantities[sku] = self.quantities.get(sku, 0) + quantity

    def __len__(self):
        return sum(self.quantities.values())

    def __contains__(self, sku):
        return sku in self.quantities

    def __repr__(self):
        return f"Basket({self.customer_id!r}, {len(self)} items)"

basket = Basket("C00077")
basket.add_item("SPO-11681", 2)
basket.add_item("HOM-22847")
print(len(basket), "SPO-11681" in basket, "TOY-54564" in basket)
print(basket)
if basket:
    print("basket is not empty")
print(bool(Basket("C01338")))
`,
        output: "3 True False\nBasket('C00077', 3 items)\nbasket is not empty\nFalse\n",
        note: "`len(basket)` counts items, not distinct SKUs: you decide what length means for your class. The empty basket is false because its length is 0.",
      },
      {
        kind: "text",
        md: "**When to use it:** `__repr__` on almost every class you write (it makes debugging far easier); `__eq__` for value-like objects; ordering and arithmetic only where they have one obvious meaning. Dataclasses (see Data Models & Typing) write `__repr__` and `__eq__` for you, and `@dataclass(order=True)` adds the comparisons.\n\n**Mistakes to avoid:** `__str__` or `__repr__` that print instead of returning text; raising or returning False for an unknown type instead of returning NotImplemented; and defining `__eq__` on a mutable class you then put in a set (Python removes the default hash when `__eq__` is defined, so it becomes unhashable).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Shipments that show what they are",
      prompt: "Printing a list of shipments shows `[<__main__.Shipment object at 0x…>]`. Add a `__repr__` so a shipment shows as `Shipment('O100282', 'Houston')`.",
      spec: [
        ["Method", "`repr(Shipment(\"O100282\", \"Houston\"))` → `\"Shipment('O100282', 'Houston')\"`"],
      ],
      starter: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

print([Shipment("O100282", "Houston"), Shipment("O100918", "Denver")])
`,
      answer: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

    def __repr__(self):
        return f"Shipment({self.order_id!r}, {self.city!r})"

print([Shipment("O100282", "Houston"), Shipment("O100918", "Denver")])
`,
      wrong: [
        {
          code: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

    def __repr__(self):
        return f"Shipment({self.order_id}, {self.city})"
`,
          fails: ["list", "repr"],
          why: "without `!r` the quotes are lost, so it no longer looks like the code that creates the object",
        },
      ],
      hints: [
        "Add a method named `__repr__` that takes only `self` and returns text.",
        "Use an f-string with the class name and the two attributes in brackets.",
        "`!r` inside the braces shows each value as its own repr, quotes included.",
      ],
      task: {
        checks: [
          expr("repr", "A shipment's repr", "result = repr(Shipment('O100282', 'Houston'))", "Shipment('O100282', 'Houston')", { show: "repr(Shipment(\"O100282\", \"Houston\"))" }),
          expr("list", "A list of shipments", "result = str([Shipment('O1', 'Denver'), Shipment('O2', 'Austin')])", "[Shipment('O1', 'Denver'), Shipment('O2', 'Austin')]", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Versions that sort correctly",
        prompt: "Release versions such as `1.10.2` must sort by number, not as text (as text, `1.10.0` comes before `1.9.2`). Write `Version(text)`, which parses exactly three whole-number parts (otherwise `ValueError`), compares with `==` and `<` by those numbers, shows as `Version('1.10.2')` with `repr` and as `1.10.2` with `str`.",
        spec: [
          ["Class", "`Version(text)`: `\"1.10.2\"` → parts (1, 10, 2); not three whole numbers → ValueError"],
          ["Comparisons", "`__eq__` and `__lt__` by the number parts; NotImplemented for other types"],
          ["Text", "`repr` → `Version('1.10.2')`, `str` → `1.10.2`"],
        ],
        starter: src`
class Version:
    def __init__(self, text):
        self.text = text

releases = [Version("1.10.0"), Version("1.9.2"), Version("2.0.0")]
print(sorted(releases))
print(max(releases), Version("1.9.2") == Version("1.9.2"))
`,
        answer: src`
class Version:
    def __init__(self, text):
        pieces = text.strip().split(".")
        if len(pieces) != 3 or not all(piece.isdigit() for piece in pieces):
            raise ValueError(f"not a version: {text!r}")
        self.parts = tuple(int(piece) for piece in pieces)

    def __repr__(self):
        return f"Version({str(self)!r})"

    def __str__(self):
        return ".".join(str(part) for part in self.parts)

    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self.parts == other.parts

    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self.parts < other.parts

releases = [Version("1.10.0"), Version("1.9.2"), Version("2.0.0")]
print(sorted(releases))
print(max(releases), Version("1.9.2") == Version("1.9.2"))
`,
        alternatives: [
          src`
import re

class Version:
    def __init__(self, text):
        found = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", text.strip())
        if found is None:
            raise ValueError("expected three numbers")
        self.major, self.minor, self.patch = [int(n) for n in found.groups()]

    def key(self):
        return (self.major, self.minor, self.patch)

    def __repr__(self):
        return "Version('" + str(self) + "')"

    def __str__(self):
        return f"{self.major}.{self.minor}.{self.patch}"

    def __eq__(self, other):
        return self.key() == other.key() if isinstance(other, Version) else NotImplemented

    def __lt__(self, other):
        return self.key() < other.key() if isinstance(other, Version) else NotImplemented
`,
        ],
        wrong: [
          {
            code: src`
class Version:
    def __init__(self, text):
        pieces = text.strip().split(".")
        if len(pieces) != 3 or not all(piece.isdigit() for piece in pieces):
            raise ValueError("not a version")
        self.text = text.strip()

    def __repr__(self):
        return f"Version({self.text!r})"

    def __str__(self):
        return self.text

    def __eq__(self, other):
        return isinstance(other, Version) and self.text == other.text

    def __lt__(self, other):
        return self.text < other.text
`,
            fails: ["sorted", "numbers"],
            why: "comparing the text sorts `1.10.0` before `1.9.2`",
          },
          {
            code: src`
class Version:
    def __init__(self, text):
        self.parts = tuple(int(piece) for piece in text.split("."))

    def __repr__(self):
        return f"Version({'.'.join(str(p) for p in self.parts)!r})"

    def __str__(self):
        return ".".join(str(p) for p in self.parts)

    def __eq__(self, other):
        return isinstance(other, Version) and self.parts == other.parts

    def __lt__(self, other):
        return self.parts < other.parts
`,
            fails: ["invalid"],
            why: "`2.0` and `1.2.3.4` are accepted, though a version needs exactly three parts",
          },
        ],
        hints: [
          "Store the parts as a tuple of ints; tuples compare item by item, which is exactly version order.",
          "`__eq__` and `__lt__` compare the tuples, after checking that the other value is a Version.",
          "`__str__` joins the parts with dots; `__repr__` wraps that text in `Version(...)` with quotes.",
        ],
        task: {
          checks: [
            expr("sorted", "Sorting by number", "result = [str(_v) for _v in sorted([Version('1.10.0'), Version('1.9.2'), Version('2.0.0'), Version('1.9.10')])]", ["1.9.2", "1.9.10", "1.10.0", "2.0.0"], { show: "sorted(versions)" }),
            expr("text", "repr and str", "_v = Version('1.10.2')\nresult = [repr(_v), str(_v), str([_v])]", ["Version('1.10.2')", "1.10.2", "[Version('1.10.2')]"], { show: "repr, str and a list of Version(\"1.10.2\")" }),
            expr("numbers", "Equality and order", "result = [Version('1.9.2') == Version('1.9.2'), Version('1.9.2') < Version('1.10.0'), Version('2.0.0') < Version('1.99.99'), Version('1.0.0') == '1.0.0', max(Version('0.9.9'), Version('0.10.0')) == Version('0.10.0')]", [true, true, false, false, true], { hidden: true }),
            expr("invalid", "Texts that aren't versions", "_out = []\nfor _t in ['2.0', '1.2.3.4', '1.x.0', '']:\n    try:\n        Version(_t)\n        _out.append('accepted')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused", "refused", "refused"], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Durations that add up",
        prompt: "Delivery slots and shifts are lengths of time. Write `Duration(minutes)` (a whole number of minutes, not negative, otherwise `ValueError`) so durations can be added with `+` and with `sum`, compared with `==` and `<` (so `max` works), shown to users as `1h05m` (or `45m` under an hour), and shown to developers as `Duration(65)`.",
        spec: [
          ["Class", "`Duration(minutes)`; negative → ValueError"],
          ["`+`", "Duration + Duration → a new Duration; NotImplemented for anything else"],
          ["Compare", "`==`, `<` by minutes"],
          ["Text", "`str`: `\"1h05m\"`, `\"2h00m\"`, `\"45m\"`; `repr`: `\"Duration(65)\"`"],
          ["Example", "`sum([Duration(45), Duration(80)], Duration(0))` → `Duration(125)`, shown as `2h05m`"],
        ],
        starter: src`
class Duration:
    def __init__(self, minutes):
        self.minutes = minutes

shifts = [Duration(45), Duration(80), Duration(30)]
total = sum(shifts, Duration(0))
print(total, repr(total), max(shifts))
`,
        answer: src`
class Duration:
    def __init__(self, minutes):
        if minutes < 0:
            raise ValueError(f"a duration can't be negative: {minutes}")
        self.minutes = minutes

    def __add__(self, other):
        if not isinstance(other, Duration):
            return NotImplemented
        return Duration(self.minutes + other.minutes)

    def __eq__(self, other):
        if not isinstance(other, Duration):
            return NotImplemented
        return self.minutes == other.minutes

    def __lt__(self, other):
        if not isinstance(other, Duration):
            return NotImplemented
        return self.minutes < other.minutes

    def __repr__(self):
        return f"Duration({self.minutes})"

    def __str__(self):
        hours, minutes = divmod(self.minutes, 60)
        if hours == 0:
            return f"{minutes}m"
        return f"{hours}h{minutes:02d}m"

shifts = [Duration(45), Duration(80), Duration(30)]
total = sum(shifts, Duration(0))
print(total, repr(total), max(shifts))
`,
        alternatives: [
          src`
class Duration:
    def __init__(self, minutes):
        if minutes < 0:
            raise ValueError("negative")
        self.minutes = minutes

    def __add__(self, other):
        return Duration(self.minutes + other.minutes) if isinstance(other, Duration) else NotImplemented

    def __eq__(self, other):
        return self.minutes == other.minutes if isinstance(other, Duration) else NotImplemented

    def __lt__(self, other):
        return self.minutes < other.minutes if isinstance(other, Duration) else NotImplemented

    def __repr__(self):
        return "Duration(" + str(self.minutes) + ")"

    def __str__(self):
        if self.minutes < 60:
            return str(self.minutes) + "m"
        return str(self.minutes // 60) + "h" + str(self.minutes % 60).zfill(2) + "m"
`,
        ],
        wrong: [
          {
            code: src`
class Duration:
    def __init__(self, minutes):
        if minutes < 0:
            raise ValueError("negative")
        self.minutes = minutes

    def __add__(self, other):
        return self.minutes + other.minutes

    def __eq__(self, other):
        return isinstance(other, Duration) and self.minutes == other.minutes

    def __lt__(self, other):
        return self.minutes < other.minutes

    def __repr__(self):
        return f"Duration({self.minutes})"

    def __str__(self):
        hours, minutes = divmod(self.minutes, 60)
        return f"{hours}h{minutes:02d}m" if hours else f"{minutes}m"
`,
            fails: ["add", "not-duration", "sum"],
            why: "`+` returns a plain number instead of a Duration, so `sum` of three durations breaks after the first addition",
          },
          {
            code: src`
class Duration:
    def __init__(self, minutes):
        if minutes < 0:
            raise ValueError("negative")
        self.minutes = minutes

    def __add__(self, other):
        if not isinstance(other, Duration):
            return NotImplemented
        return Duration(self.minutes + other.minutes)

    def __eq__(self, other):
        return isinstance(other, Duration) and self.minutes == other.minutes

    def __lt__(self, other):
        return self.minutes < other.minutes

    def __repr__(self):
        return f"Duration({self.minutes})"

    def __str__(self):
        return f"{self.minutes // 60}h{self.minutes % 60}m"
`,
            fails: ["text"],
            why: "short durations show as `0h45m` and minutes aren't padded (`1h5m`)",
          },
        ],
        hints: [
          "`__add__` builds and returns a new Duration; `sum` needs a Duration start value, which the caller passes.",
          "`__eq__` and `__lt__` compare minutes, after checking the other value's type.",
          "`divmod(minutes, 60)` gives hours and the remaining minutes; pad the minutes to two digits when there are hours.",
        ],
        task: {
          checks: [
            expr("sum", "Adding up shifts", "_total = sum([Duration(45), Duration(80), Duration(30)], Duration(0))\nresult = [str(_total), repr(_total), str(max([Duration(45), Duration(80), Duration(30)]))]", ["2h35m", "Duration(155)", "1h20m"], { show: "sum(shifts, Duration(0)) and max(shifts)" }),
            expr("text", "Text for users", "result = [str(Duration(45)), str(Duration(65)), str(Duration(120)), str(Duration(0))]", ["45m", "1h05m", "2h00m", "0m"], { show: "str(Duration(45)), str(Duration(65)), str(Duration(120)), str(Duration(0))" }),
            expr("add", "+ and comparisons", "_a = Duration(30) + Duration(15)\nresult = [type(_a).__name__, _a == Duration(45), Duration(10) < Duration(11), Duration(10) == 10]", ["Duration", true, true, false], { hidden: true }),
            raisesExpr("not-duration", "Adding a plain number", "Duration(10) + 5", "TypeError", { hidden: true }),
            raisesExpr("negative", "A negative duration", "Duration(-1)", "ValueError", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Sku:
    def __init__(self, code):
        self.code = code

    def __repr__(self):
        return f"Sku({self.code!r})"

    def __str__(self):
        return self.code

items = [Sku("SPO-11681"), Sku("HOM-22847")]
print(items[0])
print(items)
print(f"{items[1]} and {items[1]!r}")
`,
        choices: [
          "SPO-11681\n[Sku('SPO-11681'), Sku('HOM-22847')]\nHOM-22847 and Sku('HOM-22847')",
          "Sku('SPO-11681')\n[Sku('SPO-11681'), Sku('HOM-22847')]\nHOM-22847 and Sku('HOM-22847')",
          "SPO-11681\n[SPO-11681, HOM-22847]\nHOM-22847 and HOM-22847",
          "SPO-11681\n[Sku('SPO-11681'), Sku('HOM-22847')]\nSku('HOM-22847') and Sku('HOM-22847')",
        ],
        answer: 0,
        why: "`print` and f-string braces use `__str__`; a list shows its items with `__repr__`; `!r` asks for the repr explicitly.",
      },
      {
        id: "q2",
        prompt: "A common mistake: __eq__ without a hash. What does this print?",
        program: src`
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __eq__(self, other):
        return (self.x, self.y) == (other.x, other.y)

print(Point(1, 2) == Point(1, 2))
try:
    print(len({Point(1, 2), Point(1, 2)}))
except TypeError:
    print("TypeError")
`,
        choices: ["True\nTypeError", "True\n1", "True\n2", "False\nTypeError"],
        answer: 0,
        why: "Defining `__eq__` makes Python drop the default hash (equal objects must hash equally, and Python can't know how), so the objects can't go into a set. Use a frozen dataclass, or define `__hash__` from the same fields, for value objects.",
      },
      {
        id: "q3",
        prompt: "`money == \"£17.99\"` reaches your `Money.__eq__`. What should it return for a value that isn't Money?",
        choices: ["NotImplemented", "False, always", "raise TypeError", "None"],
        answer: 0,
        why: "NotImplemented tells Python to try the other operand's method and otherwise fall back to the default. Returning False works for `==` but breaks that cooperation; raising makes `==` with unrelated values crash.",
      },
    ],
    review: [
      "`__repr__` for developers (looks like code), `__str__` for users (print uses it).",
      "`__eq__`, `__lt__`, `__add__` let your objects use `==`, `sorted`/`max` and `+`; return NotImplemented for types you don't handle.",
      "`__len__` and `__contains__` make `len(x)` and `item in x` work; a length of 0 is false.",
      "Next: type hints, which document what every function and field expects.",
    ],
  },

  // ------------------------------------------------------------------ PY-L28-04 type hints
  {
    id: "PY-L28-04",
    version: 2,
    slug: "type-hints",
    title: "Type hints: documenting types",
    lede: "Type hints say what a function takes and returns: line_total(quantity: int, unit_price: float) -> float. Python stores them but doesn't check them; tools such as mypy read them to catch mistakes before the program runs.",
    focus: "Annotate parameters, return values and collections with type hints, and know what Python does and doesn't do with them.",
    minutes: 18,
    objectives: [
      "Annotate parameters and return values, including `list[str]`, `dict[str, float]` and `X | None`",
      "Show that hints are stored (`get_type_hints`) but not enforced when the code runs",
      "Use hints at run time on purpose, to check a record's field types",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "bitwise", "boolean", "class-def", "comparison", "conditional-expr", "continue-statement", "conversion", "dataclass-dec", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "except-type", "field-ann", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "string-check", "string-format", "string-index", "string-method", "top-level-indent", "try-except", "type-call"],
    teaches: ["return-hint"],
    blocks: [
      {
        kind: "text",
        md: "A function's name says what it does; its **type hints** say what goes in and out. `quantity: int` annotates a parameter, `-> float` the return value. Collections say what they hold: `list[str]`, `dict[str, float]`, `tuple[str, int]`. `str | None` means \"a text, or None\", which is how a lookup that can fail is written.\n\nHints are **documentation that tools can read**. Python itself stores them and otherwise ignores them: nothing checks them when the function is called. A **static type checker** such as mypy, which you run on your computer (`mypy shop.py`), reads the hints and reports calls that don't match before the program ever runs. Editors use them for completion and warnings. In this course's browser there is no type checker; what you can see here is what Python itself does.",
      },
      {
        kind: "example",
        title: "Hints on two shop functions",
        code: src`
from typing import get_type_hints

def line_total(quantity: int, unit_price: float, discount: float = 0.0) -> float:
    return round(quantity * unit_price * (1 - discount), 2)

def find_customer(customers: dict[str, str], customer_id: str) -> str | None:
    return customers.get(customer_id)

print(line_total(2, 17.92), line_total(3, 10, 0.1))
print(find_customer({"C00077": "Jamal Walker"}, "C99999"))
print(get_type_hints(line_total))
`,
        output: "35.84 27.0\nNone\n{'quantity': <class 'int'>, 'unit_price': <class 'float'>, 'discount': <class 'float'>, 'return': <class 'float'>}\n",
        note: "The hints are stored on the function, and `get_type_hints` reads them. Passing the int 10 for `unit_price: float` is fine: type checkers accept an int where a float is expected. `str | None` tells every caller to handle the None case.",
      },
      {
        kind: "error-example",
        title: "Hints don't stop a wrong call",
        code: src`
def order_total(prices: list[float]) -> float:
    return sum(prices)

print(order_total([4.75, 12.5]))
print(order_total(["4.75", "12.50"]))
`,
        error: "TypeError",
        output: "17.25\n",
        note: "Python happily calls the function with a list of texts; the error comes later, from `sum` inside it: `TypeError: unsupported operand type(s) for +: 'int' and 'str'`. mypy would have flagged the call line itself, before running, because a `list[str]` isn't a `list[float]`.",
      },
      {
        kind: "text",
        md: "Because hints are ordinary values you can read, a program can use them **on purpose** at run time. Data-validation libraries (pydantic, for example) are built on exactly that. Here is the core of the idea, for a dataclass: compare each field's value with its annotated type.",
      },
      {
        kind: "example",
        title: "Checking a record against its hints",
        code: src`
from dataclasses import dataclass, fields
from typing import get_type_hints

@dataclass
class Payment:
    payment_id: str
    order_id: str
    amount: float
    instalments: int = 1

def type_problems(record) -> list[str]:
    hints = get_type_hints(type(record))
    problems = []
    for f in fields(record):
        value = getattr(record, f.name)
        expected = hints[f.name]
        if not isinstance(value, expected):
            problems.append(f"{f.name}: expected {expected.__name__}, got {type(value).__name__}")
    return problems

good = Payment("PAY10231", "O100282", 35.84)
bad = Payment("PAY10232", 100918, "55.72", 3)
print(type_problems(good))
print(type_problems(bad))
`,
        output: "[]\n['order_id: expected str, got int', 'amount: expected float, got str']\n",
        note: "`fields(record)` lists the dataclass's fields; `getattr(record, name)` reads an attribute whose name is in a variable. This simple version handles plain classes such as `str` and `float`; hints like `list[str]` need more work, because `isinstance` can't check them directly.",
      },
      {
        kind: "text",
        md: "**When to use it:** on functions other people (or you, later) call, and on every dataclass field. Hints pay off most in larger programs, together with a type checker in your editor or CI.\n\n**Mistakes to avoid:** believing hints validate input (they don't; validate real input yourself); a return hint that lies (`-> float` on a function that can return None should be `-> float | None`); and `list` without the item type when the item type matters.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Annotate the VAT function",
      prompt: "Add type hints to `price_with_vat`: `net` and `rate` are floats (rate defaults to 0.2) and it returns a float.",
      spec: [
        ["Hints", "`get_type_hints(price_with_vat)` → `{'net': float, 'rate': float, 'return': float}`"],
      ],
      starter: src`
from typing import get_type_hints

def price_with_vat(net, rate=0.2):
    return round(net * (1 + rate), 2)

print(price_with_vat(19.99), get_type_hints(price_with_vat))
`,
      answer: src`
from typing import get_type_hints

def price_with_vat(net: float, rate: float = 0.2) -> float:
    return round(net * (1 + rate), 2)

print(price_with_vat(19.99), get_type_hints(price_with_vat))
`,
      wrong: [
        {
          code: src`
def price_with_vat(net: float, rate: float = 0.2):
    return round(net * (1 + rate), 2)
`,
          fails: ["hints"],
          why: "the parameters are annotated but the return type isn't",
        },
      ],
      hints: [
        "A parameter's hint goes after its name with a colon; the default stays after the hint.",
        "The return hint goes between the closing bracket and the colon, after `->`.",
        "Both parameters and the result are floats.",
      ],
      task: {
        checks: [
          expr("hints", "The hints are in place", "from typing import get_type_hints as _h\nresult = _h(price_with_vat) == {'net': float, 'rate': float, 'return': float}", true, { show: "get_type_hints(price_with_vat)" }),
          expr("works", "It still calculates", "result = [price_with_vat(19.99), price_with_vat(100.0, 0.05)]", [23.99, py.float(105)], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A quantity, or None",
        prompt: "Write `parse_quantity(text)` with type hints: it takes a text and returns an `int | None`. A text that, after stripping spaces, is all digits and above 0 gives that number; anything else gives `None`. The hints are checked too.",
        spec: [
          ["Function", "`parse_quantity(text: str) -> int | None`"],
          ["Returns", "the whole number for `\"3\"` or `\" 12 \"`; None for `\"0\"`, `\"-2\"`, `\"2.5\"`, `\"\"` or `\"two\"`"],
        ],
        starter: src`
def parse_quantity(text):
    return int(text)

for text in ["3", " 12 ", "0", "two"]:
    print(repr(text), parse_quantity(text))
`,
        answer: src`
def parse_quantity(text: str) -> int | None:
    cleaned = text.strip()
    if not cleaned.isdigit():
        return None
    quantity = int(cleaned)
    if quantity == 0:
        return None
    return quantity

for text in ["3", " 12 ", "0", "two"]:
    print(repr(text), parse_quantity(text))
`,
        alternatives: [
          src`
from typing import Optional

def parse_quantity(text: str) -> Optional[int]:
    try:
        value = int(text)
    except ValueError:
        return None
    if value < 1 or not text.strip().isdigit():
        return None
    return value
`,
        ],
        wrong: [
          {
            code: src`
def parse_quantity(text: str) -> int:
    cleaned = text.strip()
    if not cleaned.isdigit() or int(cleaned) == 0:
        return None
    return int(cleaned)
`,
            fails: ["hints"],
            why: "the function can return None, so `-> int` is a hint that lies; it should be `int | None`",
          },
          {
            code: src`
def parse_quantity(text: str) -> int | None:
    try:
        return int(text)
    except ValueError:
        return None
`,
            fails: ["returns"],
            why: "`int` accepts `\"0\"` and `\"-2\"`, which aren't valid quantities",
          },
        ],
        hints: [
          "Annotate the parameter as `str` and the result as an int or None.",
          "Strip the text, then decide: digits only? Then convert.",
          "Zero isn't a quantity: return None for it too.",
        ],
        task: {
          checks: [
            fn("returns", "parse_quantity", [
              example(["3"], 3),
              example([" 12 "], 12),
              example(["two"], null),
              hiddenCase("zero", ["0"], null),
              hiddenCase("a negative number", ["-2"], null),
              hiddenCase("a decimal", ["2.5"], null),
              hiddenCase("an empty text", [""], null),
            ], { label: "parse_quantity() returns a positive whole number or None" }),
            expr("hints", "The hints say str in, int or None out", "from typing import get_type_hints as _h, Optional as _O\n_t = _h(parse_quantity)\nresult = _t.get('text') is str and _t.get('return') in (int | None, _O[int])", true, { show: "get_type_hints(parse_quantity)" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Convert a row with a schema of types",
        prompt: "Types are values: `int`, `float` and `str` can be stored in a dictionary and called. Write `convert_row(row, schema)`: `row` maps field names to text (from a CSV file), `schema` maps the same names to the type each field should become. Return a new dictionary with every field converted. A field missing from the row, or text that won't convert, raises `ValueError` whose message starts with the field name. For `bool` fields, accept only `\"true\"` or `\"false\"` in any case.",
        spec: [
          ["Function", "`convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]`"],
          ["Conversion", "call the schema's type on the text (`int(\" 2 \")` → 2); for `bool`, `\"true\"`/`\"false\"` in any case and with spaces"],
          ["Raises", "`ValueError(\"<field>: …\")` for a missing field or a value that won't convert; fields not in the schema are left out"],
          ["Example", "`convert_row({\"sku\": \"SPO-11681\", \"qty\": \"2\", \"price\": \"17.92\"}, {\"sku\": str, \"qty\": int, \"price\": float})` → `{'sku': 'SPO-11681', 'qty': 2, 'price': 17.92}`"],
        ],
        starter: src`
def convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]:
    return dict(row)

schema = {"sku": str, "qty": int, "price": float, "gift": bool}
print(convert_row({"sku": "SPO-11681", "qty": "2", "price": "17.92", "gift": "False"}, schema))
`,
        answer: src`
def convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]:
    converted = {}
    for name, kind in schema.items():
        if name not in row:
            raise ValueError(f"{name}: missing")
        text = row[name].strip()
        if kind is bool:
            if text.lower() not in ["true", "false"]:
                raise ValueError(f"{name}: expected true or false, got {text!r}")
            converted[name] = text.lower() == "true"
            continue
        try:
            converted[name] = kind(text)
        except ValueError:
            raise ValueError(f"{name}: can't read {text!r} as {kind.__name__}")
    return converted

schema = {"sku": str, "qty": int, "price": float, "gift": bool}
print(convert_row({"sku": "SPO-11681", "qty": "2", "price": "17.92", "gift": "False"}, schema))
`,
        alternatives: [
          src`
def to_bool(text: str) -> bool:
    words = {"true": True, "false": False}
    if text.strip().lower() not in words:
        raise ValueError(text)
    return words[text.strip().lower()]

def convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]:
    result = {}
    for name in schema:
        try:
            text = row[name]
            result[name] = to_bool(text) if schema[name] is bool else schema[name](text.strip())
        except KeyError:
            raise ValueError(name + ": missing field")
        except ValueError:
            raise ValueError(name + ": bad value")
    return result
`,
        ],
        wrong: [
          {
            code: src`
def convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]:
    converted = {}
    for name, kind in schema.items():
        if name not in row:
            raise ValueError(f"{name}: missing")
        try:
            converted[name] = kind(row[name].strip())
        except ValueError:
            raise ValueError(f"{name}: bad value")
    return converted
`,
            fails: ["bools", "errors", "returns"],
            why: "`bool(\"False\")` is True, because any non-empty text is true, so the bool fields are wrong",
          },
          {
            code: src`
def convert_row(row: dict[str, str], schema: dict[str, type]) -> dict[str, object]:
    converted = {}
    for name, kind in schema.items():
        text = row.get(name, "").strip()
        if kind is bool:
            converted[name] = text.lower() == "true"
        else:
            converted[name] = kind(text)
    return converted
`,
            fails: ["errors"],
            why: "a missing field becomes an empty text, and the errors raised don't name the field",
          },
        ],
        hints: [
          "Walk the schema, not the row: each `(name, kind)` pair says which field to convert and how.",
          "For most types, calling `kind(text)` converts. bool needs its own rule, because `bool(\"False\")` is True.",
          "Turn a missing field, and the ValueError from a failed conversion, into a ValueError that starts with the field's name.",
        ],
        task: {
          checks: [
            expr("returns", "A full row", "result = convert_row({'sku': 'SPO-11681', 'qty': ' 2 ', 'price': '17.92', 'gift': 'False', 'note': 'x'}, {'sku': str, 'qty': int, 'price': float, 'gift': bool})", { sku: "SPO-11681", qty: 2, price: 17.92, gift: false }, { show: "convert_row(<row>, {\"sku\": str, \"qty\": int, \"price\": float, \"gift\": bool})" }),
            expr("bools", "true and false in any case", "result = [convert_row({'g': _t}, {'g': bool})['g'] for _t in ['true', ' TRUE ', 'False', 'false']]", [true, true, false, false], { hidden: true }),
            expr("errors", "Errors name the field", "_out = []\nfor _row, _schema in [({'qty': 'two'}, {'qty': int}), ({}, {'price': float}), ({'gift': 'yes'}, {'gift': bool})]:\n    try:\n        convert_row(_row, _schema)\n        _out.append('converted')\n    except ValueError as _e:\n        _out.append(str(_e).split(':')[0])\nresult = _out", ["qty", "price", "gift"], { show: "convert_row with a bad int, a missing field and a bad bool" }),
            expr("new", "A new dictionary", "_row = {'qty': '3'}\n_out = convert_row(_row, {'qty': int})\nresult = [_out, _row, _out is _row]", [{ qty: 3 }, { qty: "3" }, false], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def repeat_label(sku: str, copies: int) -> str:
    return sku * copies

print(repeat_label("AB", 3))
print(repeat_label(3, "AB"))
print(repeat_label.__annotations__["return"].__name__)
`,
        choices: ["ABABAB\nABABAB\nstr", "ABABAB\nTypeError", "ABABAB\n3AB\nstr", "TypeError"],
        answer: 0,
        why: "The hints are ignored when the function runs. `3 * \"AB\"` is valid Python (it repeats the text), so even the swapped call works. Only a type checker would object. `__annotations__` is where the hints are stored.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a return hint that doesn't admit None. What does this print?",
        program: src`
def find_price(prices: dict[str, float], sku: str) -> float:
    return prices.get(sku)

price = find_price({"SPO-11681": 31.0}, "HOM-22847")
try:
    print(price * 2)
except TypeError:
    print("TypeError:", price)
`,
        choices: ["TypeError: None", "0.0", "62.0", "KeyError"],
        answer: 0,
        why: "`get` returns None for a missing key, whatever the hint says. Writing `-> float | None` would have told every caller (and a type checker) that this can happen.",
      },
      {
        id: "q3",
        prompt: "What does a type hint like `qty: int` do when the program runs?",
        choices: [
          "Nothing is checked: it is stored for tools and readers",
          "Python converts the argument to int",
          "Python raises TypeError for a non-int argument",
          "It makes the function faster",
        ],
        answer: 0,
        why: "Hints are documentation that tools (mypy, editors, libraries that choose to read them) can use. Plain Python neither converts nor checks.",
      },
    ],
    review: [
      "`param: type` and `-> type` document a function; `list[str]`, `dict[str, float]` and `X | None` describe collections and optional values.",
      "Python stores hints (`get_type_hints`) but doesn't check them; a static checker such as mypy does, before the program runs.",
      "Hints are values, so code can read them on purpose, for example to validate a record.",
      "Next: describing dictionary shapes and interfaces with TypedDict and Protocol.",
    ],
  },

  // ------------------------------------------------------------------ PY-L28-05 TypedDict and Protocol
  {
    id: "PY-L28-05",
    version: 2,
    slug: "a-typed-dict",
    title: "TypedDict and Protocol",
    lede: "JSON arrives as dictionaries, and many objects only need to have the right methods. TypedDict describes the keys a dictionary should have; Protocol describes the methods an object should offer, without making it inherit anything.",
    focus: "Describe dictionary shapes with TypedDict and method-based interfaces with Protocol, and check them where the program needs to.",
    minutes: 20,
    objectives: [
      "Write a TypedDict for a JSON payload, with required and optional (`NotRequired`) keys",
      "Use a TypedDict's `__required_keys__` to check incoming data at run time",
      "Describe an interface with Protocol and write functions that accept any object with those methods",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "bitwise", "class-def", "comp-if", "comparison", "continue-statement", "dict-iterate", "dict-literal", "dict-lookup", "enumerate-call", "exc-name", "except-type", "field-ann", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "identity", "if-statement", "import-module", "init-method", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "none-value", "plain-class", "print-call", "print-several", "print-text", "reassignment", "return-hint", "self-name", "string-format", "string-index", "subclass", "top-level-indent", "try-except", "tuple-unpack", "type-call", "unquoted-name"],
    teaches: ["typed-dict", "protocol-base"],
    blocks: [
      {
        kind: "text",
        md: "Data from APIs and JSON files stays as dictionaries. A **TypedDict** class lists the keys such a dictionary should have and the type of each value, so functions can say `def save(order: OrderPayload)` instead of a vague `dict`. Keys are required unless marked `NotRequired[...]`.\n\nA TypedDict is purely a description: at run time the data is still an ordinary `dict`, and nothing checks it. But the class keeps two useful sets, `__required_keys__` and `__optional_keys__`, which your own code can use to check data where it enters the program.",
      },
      {
        kind: "example",
        title: "An order payload from JSON",
        code: src`
import json
from typing import NotRequired, TypedDict

class OrderPayload(TypedDict):
    order_id: str
    customer_id: str
    total: float
    coupon: NotRequired[str]

def missing_fields(payload):
    return sorted(key for key in OrderPayload.__required_keys__ if key not in payload)

incoming = json.loads('{"order_id": "O100282", "total": 35.84}')
order: OrderPayload = incoming
print(type(order).__name__, sorted(OrderPayload.__required_keys__), sorted(OrderPayload.__optional_keys__))
print(missing_fields(incoming))
print(missing_fields({"order_id": "O1", "customer_id": "C1", "total": 9.5, "coupon": "SPRING"}))
`,
        output: "dict ['customer_id', 'order_id', 'total'] ['coupon']\n['customer_id']\n[]\n",
        note: "`order: OrderPayload = incoming` annotates a variable; at run time it is still the same plain dict, with `customer_id` missing. The required-keys set lets `missing_fields` find that before anything else uses the data.",
      },
      {
        kind: "text",
        md: "In the Inheritance & Composition module several unrelated classes offered `send(message)`, and functions used them interchangeably. A **Protocol** writes that expectation down: a class that inherits from `typing.Protocol` and lists the methods, each with only a docstring as its body (you will also see `...` used there). Any class with matching methods satisfies it, **without inheriting from it**. This is called *structural typing*, duck typing that a type checker can verify. A function annotated `notifiers: list[Notifier]` accepts email, Slack or anything else with `send`.",
      },
      {
        kind: "example",
        title: "Notifiers that never mention the protocol",
        code: src`
from typing import Protocol

class Notifier(Protocol):
    def send(self, message: str) -> str:
        """Deliver the message and return a receipt."""

class EmailNotifier:
    def __init__(self, address: str) -> None:
        self.address = address

    def send(self, message: str) -> str:
        return f"email to {self.address}: {message}"

class SlackNotifier:
    def __init__(self, channel: str) -> None:
        self.channel = channel

    def send(self, message: str) -> str:
        return f"slack {self.channel}: {message}"

def broadcast(notifiers: list[Notifier], message: str) -> list[str]:
    return [notifier.send(message) for notifier in notifiers]

for receipt in broadcast([EmailNotifier("ops@runtime.market"), SlackNotifier("#orders")], "O100282 delayed"):
    print(receipt)
`,
        output: "email to ops@runtime.market: O100282 delayed\nslack #orders: O100282 delayed\n",
        note: "Neither notifier inherits from `Notifier`; they simply have the method. The Protocol exists for readers and type checkers: mypy would report a call to `broadcast` with an object that lacks `send(message: str) -> str`. (Checking a Protocol with `isinstance` at run time needs one more decorator, in the Advanced OOP & Design module.)",
      },
      {
        kind: "error-example",
        title: "A Protocol is not a class to instantiate",
        code: src`
from typing import Protocol

class Notifier(Protocol):
    def send(self, message: str) -> str:
        """Deliver the message and return a receipt."""

print("defined")
notifier = Notifier()
`,
        error: "TypeError",
        output: "defined\n",
        note: "A Protocol only describes an interface; it has no behaviour to run: `TypeError: Protocols cannot be instantiated`. Make a real class with the methods instead.",
      },
      {
        kind: "text",
        md: "**When to use it:** TypedDict for data that stays as dictionaries (JSON in and out); a dataclass when you convert the data into objects. Protocol for \"anything that can do X\" parameters, especially when the classes come from different libraries and can't share a parent.\n\n**Mistakes to avoid:** believing a TypedDict validates incoming JSON (check it yourself, as above); making classes inherit from a Protocol just to satisfy it (unnecessary); and protocols with many methods, which few classes satisfy (keep them small, describing what one function needs).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Payments need a currency",
      prompt: "Payments now must say their currency. Add a required `currency` key (a text) to `PaymentPayload`, so `missing_fields` reports it when it's absent.",
      spec: [
        ["Change", "`PaymentPayload` gains `currency: str`; `note` stays optional"],
      ],
      starter: src`
from typing import NotRequired, TypedDict

class PaymentPayload(TypedDict):
    payment_id: str
    order_id: str
    amount: float
    note: NotRequired[str]

def missing_fields(payload):
    return sorted(key for key in PaymentPayload.__required_keys__ if key not in payload)

print(missing_fields({"payment_id": "PAY10231", "order_id": "O100282", "amount": 35.84}))
`,
      answer: src`
from typing import NotRequired, TypedDict

class PaymentPayload(TypedDict):
    payment_id: str
    order_id: str
    amount: float
    currency: str
    note: NotRequired[str]

def missing_fields(payload):
    return sorted(key for key in PaymentPayload.__required_keys__ if key not in payload)

print(missing_fields({"payment_id": "PAY10231", "order_id": "O100282", "amount": 35.84}))
`,
      wrong: [
        {
          code: src`
from typing import NotRequired, TypedDict

class PaymentPayload(TypedDict):
    payment_id: str
    order_id: str
    amount: float
    currency: NotRequired[str]
    note: NotRequired[str]

def missing_fields(payload):
    return sorted(key for key in PaymentPayload.__required_keys__ if key not in payload)
`,
          fails: ["keys", "missing"],
          why: "marked NotRequired, the currency is optional, so a payment without one passes",
        },
      ],
      hints: [
        "Add one annotated line to the TypedDict, like the other required keys.",
        "Required keys have no `NotRequired[...]` around their type.",
        "`missing_fields` needs no change: it reads the required keys from the class.",
      ],
      task: {
        checks: [
          expr("missing", "A payment without a currency", "result = missing_fields({'payment_id': 'PAY10231', 'order_id': 'O100282', 'amount': 35.84})", ["currency"], { show: "missing_fields(<payment without currency>)" }),
          expr("keys", "Required and optional keys", "result = [sorted(PaymentPayload.__required_keys__), sorted(PaymentPayload.__optional_keys__)]", [["amount", "currency", "order_id", "payment_id"], ["note"]], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "What's wrong with this review payload",
        prompt: "Reviews arrive as JSON. Write a TypedDict `ReviewPayload` with required `review_id` (text), `product_id` (text) and `rating` (int), and an optional `text` (text). Then write `review_problems(payload)` that uses the TypedDict itself, not a second copy of the field list, to report: each missing required key as `\"missing <key>\"` (sorted), then each present key whose value has the wrong type as `\"<key>: expected <type>, got <type>\"` (in the TypedDict's order). Unknown extra keys are ignored.",
        spec: [
          ["TypedDict", "`ReviewPayload`: `review_id: str`, `product_id: str`, `rating: int`, `text: NotRequired[str]`"],
          ["Function", "`review_problems(payload: dict) -> list[str]`"],
          ["Uses", "`ReviewPayload.__required_keys__` and `get_type_hints(ReviewPayload)`"],
          ["Example", "`{\"review_id\": \"R1\", \"rating\": \"5\"}` → `['missing product_id', 'rating: expected int, got str']`"],
        ],
        starter: src`
from typing import NotRequired, TypedDict, get_type_hints

def review_problems(payload):
    return []

print(review_problems({"review_id": "R1", "rating": "5"}))
print(review_problems({"review_id": "R2", "product_id": "P0205", "rating": 4, "text": "Great mat"}))
`,
        answer: src`
from typing import NotRequired, TypedDict, get_type_hints

class ReviewPayload(TypedDict):
    review_id: str
    product_id: str
    rating: int
    text: NotRequired[str]

def review_problems(payload: dict) -> list[str]:
    problems = [f"missing {key}" for key in sorted(ReviewPayload.__required_keys__) if key not in payload]
    for key, expected in get_type_hints(ReviewPayload).items():
        if key in payload and not isinstance(payload[key], expected):
            problems.append(f"{key}: expected {expected.__name__}, got {type(payload[key]).__name__}")
    return problems

print(review_problems({"review_id": "R1", "rating": "5"}))
print(review_problems({"review_id": "R2", "product_id": "P0205", "rating": 4, "text": "Great mat"}))
`,
        alternatives: [
          src`
from typing import NotRequired, TypedDict, get_type_hints

class ReviewPayload(TypedDict):
    review_id: str
    product_id: str
    rating: int
    text: NotRequired[str]

def review_problems(payload: dict) -> list[str]:
    missing = []
    for key in ReviewPayload.__required_keys__:
        if key not in payload:
            missing.append("missing " + key)
    missing.sort()
    wrong = []
    hints = get_type_hints(ReviewPayload)
    for key in hints:
        if key in payload and type(payload[key]) is not hints[key]:
            wrong.append(key + ": expected " + hints[key].__name__ + ", got " + type(payload[key]).__name__)
    return missing + wrong
`,
        ],
        wrong: [
          {
            code: src`
from typing import NotRequired, TypedDict, get_type_hints

class ReviewPayload(TypedDict):
    review_id: str
    product_id: str
    rating: int
    text: NotRequired[str]

def review_problems(payload: dict) -> list[str]:
    problems = []
    for key, expected in get_type_hints(ReviewPayload).items():
        if key not in payload:
            problems.append(f"missing {key}")
        elif not isinstance(payload[key], expected):
            problems.append(f"{key}: expected {expected.__name__}, got {type(payload[key]).__name__}")
    return problems
`,
            fails: ["returns", "optional"],
            why: "every annotated key is treated as required, so a review without the optional text is reported as broken",
          },
          {
            code: src`
from typing import NotRequired, TypedDict, get_type_hints

class ReviewPayload(TypedDict):
    review_id: str
    product_id: str
    rating: int
    text: NotRequired[str]

def review_problems(payload: dict) -> list[str]:
    return [f"missing {key}" for key in sorted(ReviewPayload.__required_keys__) if key not in payload]
`,
            fails: ["returns", "types"],
            why: "only missing keys are reported; a rating sent as text slips through",
          },
        ],
        hints: [
          "`__required_keys__` gives the keys that must be present; sort them before reporting the missing ones.",
          "`get_type_hints(ReviewPayload)` gives every key's type, optional ones included, in the order they were written.",
          "Check a key's type only if the key is present in the payload.",
        ],
        task: {
          checks: [
            expr("returns", "Missing keys, then wrong types", "result = [review_problems({'review_id': 'R1', 'rating': '5'}), review_problems({'review_id': 'R2', 'product_id': 'P0205', 'rating': 4, 'text': 'Great mat'})]", [["missing product_id", "rating: expected int, got str"], []], { show: "review_problems for a broken and a good payload" }),
            expr("optional", "The optional text can be left out", "result = review_problems({'review_id': 'R3', 'product_id': 'P0421', 'rating': 2})", [], { hidden: true }),
            expr("types", "Several wrong types", "result = review_problems({'review_id': 7, 'product_id': 'P1', 'rating': 4.5, 'text': None, 'extra': 'ignored'})", ["review_id: expected str, got int", "rating: expected int, got float", "text: expected str, got NoneType"], { hidden: true }),
            expr("shape", "The TypedDict describes the payload", "result = [sorted(ReviewPayload.__required_keys__), sorted(ReviewPayload.__optional_keys__)]", [["product_id", "rating", "review_id"], ["text"]], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "The cheapest supplier",
        prompt: "Prices come from several suppliers' systems, each wrapped in a small class. Write a Protocol `PriceSource` describing the one method the shop needs, `price(sku: str) -> float`, which raises KeyError for a SKU the supplier doesn't sell. Then write `cheapest(sku, sources)` returning `(name, price)` for the lowest price, where the name is the source's class name, skipping sources that don't sell the SKU, or `None` if none do.",
        spec: [
          ["Protocol", "`class PriceSource(Protocol)` with a method `price(self, sku: str) -> float` whose body is just a docstring"],
          ["Function", "`cheapest(sku: str, sources: list[PriceSource]) -> tuple[str, float] | None`"],
          ["Rules", "skip a source whose `price` raises KeyError; on a tie keep the earlier source; other errors are not caught"],
        ],
        starter: src`
from typing import Protocol

class Acme:
    def price(self, sku: str) -> float:
        return {"SPO-11681": 29.5, "HOM-22847": 47.0}[sku]

class Globex:
    def price(self, sku: str) -> float:
        return {"SPO-11681": 27.99}[sku]

def cheapest(sku, sources):
    return None

print(cheapest("SPO-11681", [Acme(), Globex()]))
print(cheapest("HOM-22847", [Acme(), Globex()]))
`,
        answer: src`
from typing import Protocol

class PriceSource(Protocol):
    def price(self, sku: str) -> float:
        """The supplier's price; KeyError for a SKU it doesn't sell."""

class Acme:
    def price(self, sku: str) -> float:
        return {"SPO-11681": 29.5, "HOM-22847": 47.0}[sku]

class Globex:
    def price(self, sku: str) -> float:
        return {"SPO-11681": 27.99}[sku]

def cheapest(sku: str, sources: list[PriceSource]) -> tuple[str, float] | None:
    best = None
    for source in sources:
        try:
            offer = source.price(sku)
        except KeyError:
            continue
        if best is None or offer < best[1]:
            best = (type(source).__name__, offer)
    return best

print(cheapest("SPO-11681", [Acme(), Globex()]))
print(cheapest("HOM-22847", [Acme(), Globex()]))
`,
        alternatives: [
          src`
from typing import Protocol

class PriceSource(Protocol):
    def price(self, sku: str) -> float:
        """Price of the SKU."""

def cheapest(sku: str, sources: list[PriceSource]) -> tuple[str, float] | None:
    offers = []
    for position, source in enumerate(sources):
        try:
            offers.append((source.price(sku), position, type(source).__name__))
        except KeyError:
            pass
    if not offers:
        return None
    price, position, name = min(offers)
    return (name, price)
`,
        ],
        wrong: [
          {
            code: src`
from typing import Protocol

class PriceSource(Protocol):
    def price(self, sku: str) -> float:
        """The supplier's price; KeyError for a SKU it doesn't sell."""

def cheapest(sku: str, sources: list[PriceSource]) -> tuple[str, float] | None:
    best = None
    for source in sources:
        try:
            offer = source.price(sku)
        except Exception:
            continue
        if best is None or offer < best[1]:
            best = (type(source).__name__, offer)
    return best
`,
            fails: ["bugs"],
            why: "catching every Exception hides a supplier class that is broken, not just one that doesn't sell the SKU",
          },
          {
            code: src`
from typing import Protocol

class PriceSource(Protocol):
    def price(self, sku: str) -> float:
        """The supplier's price; KeyError for a SKU it doesn't sell."""

def cheapest(sku: str, sources: list[PriceSource]) -> tuple[str, float] | None:
    best = None
    for source in sources:
        try:
            offer = source.price(sku)
        except KeyError:
            continue
        if best is None or offer <= best[1]:
            best = (type(source).__name__, offer)
    return best
`,
            fails: ["tie"],
            why: "`<=` lets a later supplier with the same price replace the earlier one",
          },
        ],
        hints: [
          "The Protocol is a class inheriting from `Protocol` with one method; a docstring describing it is enough as the body.",
          "In `cheapest`, ask each source for the price inside `try`, and skip it on KeyError only.",
          "Keep the best `(name, price)` so far; replace it only with a strictly lower price.",
        ],
        task: {
          checks: [
            expr("returns", "The cheapest of two suppliers", "class _Acme:\n    def price(self, sku):\n        return {'SPO-11681': 29.5, 'HOM-22847': 47.0}[sku]\nclass _Globex:\n    def price(self, sku):\n        return {'SPO-11681': 27.99}[sku]\nresult = [cheapest('SPO-11681', [_Acme(), _Globex()]), cheapest('HOM-22847', [_Acme(), _Globex()]), cheapest('TOY-54564', [_Acme(), _Globex()])]", [py.tuple(py.str("_Globex"), py.float(27.99)), py.tuple(py.str("_Acme"), py.float(47)), null], { show: "cheapest for three SKUs" }),
            expr("protocol", "PriceSource is a Protocol", "import typing as _t\nresult = [issubclass(PriceSource, _t.Protocol), 'price' in vars(PriceSource)]", [true, true], { show: "issubclass(PriceSource, Protocol)" }),
            expr("tie", "A tie keeps the earlier supplier", "class _A:\n    def price(self, sku):\n        return 10.0\nclass _B:\n    def price(self, sku):\n        return 10.0\nresult = cheapest('X', [_A(), _B()])", py.tuple(py.str("_A"), py.float(10)), { hidden: true }),
            raisesExpr("bugs", "A broken supplier class isn't hidden", "class _Broken:\n    def price(self, sku):\n        return 1 / 0\ncheapest('X', [_Broken()])", "ZeroDivisionError", { hidden: true }),
            expr("empty", "No suppliers", "result = cheapest('X', [])", null, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from typing import TypedDict

class Point(TypedDict):
    lat: float
    lon: float

stop: Point = {"lat": 29.76, "lon": "-95.37", "label": "Houston depot"}
print(type(stop).__name__, len(stop), stop["lon"] * 2)
`,
        choices: ["dict 3 -95.37-95.37", "Point 2 -190.74", "TypeError", "dict 2 -190.74"],
        answer: 0,
        why: "A TypedDict annotation changes nothing at run time: the value is the plain dict you wrote, extra key and text longitude included. A type checker would flag both problems; Python doesn't.",
      },
      {
        id: "q2",
        prompt: "A common mistake: inheriting from the Protocol to \"satisfy\" it. Which is true?",
        choices: [
          "Any class with a matching send method satisfies Notifier; inheriting from it is unnecessary",
          "A class must inherit from Notifier, or broadcast() refuses it",
          "Inheriting from a Protocol gives the class a working send",
          "Protocols only work with dataclasses",
        ],
        answer: 0,
        why: "Protocols are structural: having the methods is enough. That is what lets classes you can't change (from other libraries) satisfy them.",
      },
      {
        id: "q3",
        prompt: "JSON from an API should stay as dictionaries but be documented and checked on arrival. Which fits?",
        choices: [
          "A TypedDict, plus a check of __required_keys__ where the data comes in",
          "A Protocol",
          "A frozen dataclass with no checks",
          "Annotations alone, since Python validates them",
        ],
        answer: 0,
        why: "TypedDict describes dictionary shapes, and its key sets support a real run-time check. A Protocol describes methods, and annotations alone are never validated.",
      },
    ],
    review: [
      "TypedDict documents a dictionary's keys and value types; required unless `NotRequired`.",
      "At run time a TypedDict value is a plain dict: check `__required_keys__` and types yourself where data enters.",
      "Protocol describes the methods an object must have; matching classes satisfy it without inheriting.",
      "Next module: abstract base classes, runtime protocol checks, mixins and descriptors.",
    ],
  },
];
