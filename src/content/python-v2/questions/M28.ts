/**
 * M28 practice: ten independent problems on data models and typing (PY-L28-01 … PY-L28-05).
 *
 * Mix: 1 function implementation with type hints (top scores, ties by name), 2 debugging (special methods that print
 * or ignore a field; equality without a matching hash), 2 validation (a price/discount model with property setters;
 * weather readings described by a TypedDict), 2 data transformations (a CSV catalogue into dataclasses; order rows
 * grouped into Order dataclasses), 1 integration (CSV export to any object with a write method, described by a
 * Protocol), and 2 output predictions about properties and dataclass equality.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are Runtime Market (R01) products, orders and SKUs, and NOAA GHCN-style daily readings (D07). Dataclass
 * results are compared with ==, which dataclasses define field by field.
 * Version 2: every question was replaced; the old set read a MUG property and printed it.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
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

const scores = { "Nora Garcia": 91.5, "Jamal Walker": 78.0, "Grace Walker": 91.5, "Theo Williams": 64.25 };

export const m28Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q28-02 output prediction, easy
  {
    id: "PY-Q28-02",
    version: 2,
    slug: "properties-stay-current",
    title: "Properties that stay current",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["aggregate-call", "assignment", "attr-assign", "class-def", "function-def", "function-param", "function-return", "init-method", "len-call", "list-literal", "list-mutate", "method-def", "plain-class", "print-call", "print-several", "property-dec", "self-name", "top-level-indent"],
    prompt: "A basket has two properties and one ordinary attribute. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`count_at_start` is worked out once, in `__init__`, when the list is empty.",
      "`total` and `count` run every time they are read.",
      "Assigning a new list to `prices` replaces it; the properties then read the new list.",
    ],
    explanation: "The two properties recompute on every read, so they follow every change to `prices`, including replacing the list. `count_at_start` was an ordinary value stored when the basket was created, so it stays 0. That difference is the reason to make derived values properties.",
    predict: {
      program: src`
class Basket:
    def __init__(self):
        self.prices = []
        self.count_at_start = len(self.prices)

    @property
    def total(self):
        return round(sum(self.prices), 2)

    @property
    def count(self):
        return len(self.prices)

basket = Basket()
basket.prices.append(17.92)
basket.prices.append(4.99)
print(basket.total, basket.count, basket.count_at_start)
basket.prices = [1.5]
print(basket.total, basket.count)
`,
      output: "22.91 2 0\n1.5 1\n",
      wrongPredictions: ["22.91 2 2\n1.5 1", "0 0 0\n0 0", "22.91 2 0\n22.91 2"],
    },
  },

  // ------------------------------------------------------------------ PY-Q28-03 debugging, easy
  {
    id: "PY-Q28-03",
    version: 2,
    slug: "money-that-misbehaves",
    title: "Money that misbehaves",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conversion", "dict-literal", "function-def", "function-default", "function-param", "function-return", "if-statement", "init-method", "logical", "method-def", "plain-class", "print-call", "print-several", "print-text", "self-name", "str-method", "string-format", "string-index", "top-level-indent", "tuple-literal", "tuple-unpack", "unicode-text"],
    prompt: "`Money` should print as `£12.50` and compare equal only when both the amount and the currency match. Printing crashes with `TypeError: __str__ returned non-string`, and £10 compares equal to €10. Fix the two special methods.",
    spec: [
      ["`str(Money(1250, \"GBP\"))`", "`£12.50` (symbols: GBP £, USD $, EUR €)"],
      ["`==`", "True only for the same cents **and** currency; NotImplemented for anything that isn't Money"],
    ],
    hiddenKinds: ["an amount under £1", "a comparison with a plain number", "the same amount in two currencies"],
    hints: [
      "Run the starter and read the first error: what must `__str__` give back?",
      "`print` inside a method shows text but the method still returns None.",
      "Compare both fields in `__eq__`; a tuple of the two makes that one comparison.",
    ],
    explanation: "`__str__` must **return** a string; printing inside it returns None, which Python reports as `TypeError: __str__ returned non-string (type NoneType)`. And an `__eq__` that compares only the cents treats £10 and €10 as the same money. Comparing `(cents, currency)` tuples fixes it, and returning NotImplemented for other types keeps `Money(1000) == 10` a plain False.",
    code: {
      starter: src`
class Money:
    SYMBOLS = {"GBP": "£", "USD": "$", "EUR": "€"}

    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __str__(self):
        print(f"{Money.SYMBOLS[self.currency]}{self.cents // 100}.{self.cents % 100:02d}")

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.cents == other.cents

print(Money(1000, "GBP") == Money(1000, "EUR"))
print(str(Money(1250)))
`,
      answer: src`
class Money:
    SYMBOLS = {"GBP": "£", "USD": "$", "EUR": "€"}

    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __str__(self):
        return f"{Money.SYMBOLS[self.currency]}{self.cents // 100}.{self.cents % 100:02d}"

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return (self.cents, self.currency) == (other.cents, other.currency)

print(Money(1000, "GBP") == Money(1000, "EUR"))
print(str(Money(1250)))
`,
      alternatives: [
        src`
class Money:
    SYMBOLS = {"GBP": "£", "USD": "$", "EUR": "€"}

    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __str__(self):
        pounds, pence = divmod(self.cents, 100)
        return Money.SYMBOLS[self.currency] + str(pounds) + "." + str(pence).zfill(2)

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.cents == other.cents and self.currency == other.currency
`,
      ],
      wrong: [
        {
          code: src`
class Money:
    SYMBOLS = {"GBP": "£", "USD": "$", "EUR": "€"}

    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __str__(self):
        return f"{Money.SYMBOLS[self.currency]}{self.cents // 100}.{self.cents % 100:02d}"

    def __eq__(self, other):
        if not isinstance(other, Money):
            return NotImplemented
        return self.cents == other.cents
`,
          fails: ["currency"],
          why: "printing works now, but £10 still equals €10",
        },
        {
          code: src`
class Money:
    SYMBOLS = {"GBP": "£", "USD": "$", "EUR": "€"}

    def __init__(self, cents, currency="GBP"):
        self.cents = cents
        self.currency = currency

    def __str__(self):
        return f"{Money.SYMBOLS[self.currency]}{self.cents / 100}"

    def __eq__(self, other):
        return (self.cents, self.currency) == (other.cents, other.currency)
`,
          fails: ["other-types", "text"],
          why: "dividing gives `£12.5` instead of `£12.50`, and comparing with a number crashes instead of giving False",
        },
      ],
      task: {
        checks: [
          expr("text", "Money as text", "result = [str(Money(1250)), str(Money(1999, 'USD')), str(Money(100000, 'EUR'))]", ["£12.50", "$19.99", "€1000.00"], { show: "str(Money(1250)), str(Money(1999, \"USD\")), str(Money(100000, \"EUR\"))" }),
          expr("currency", "Equality needs the same currency", "result = [Money(1000, 'GBP') == Money(1000, 'EUR'), Money(1000) == Money(1000, 'GBP'), Money(1000) == Money(999)]", [false, true, false], { show: "Money(1000, \"GBP\") == Money(1000, \"EUR\") and two more comparisons" }),
          expr("small", "An amount under £1", "result = str(Money(5))", "£0.05", { hidden: true }),
          expr("other-types", "A comparison with a plain number", "result = [Money(1000) == 10, Money(1000) != 'x']", [false, true], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-06 data transformation, easy
  {
    id: "PY-Q28-06",
    version: 2,
    slug: "catalogue-into-dataclasses",
    title: "A CSV catalogue into dataclasses",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conversion", "csv-read", "dataclass-dec", "dict-lookup", "field-ann", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "method-def", "plain-class", "print-call", "raise-stmt", "self-name", "star-kwargs", "string-format", "string-index", "string-method", "top-level-indent", "unquoted-name", "value-count"],
    prompt: "A supplier sends its catalogue as CSV text. Write a dataclass `Product` with fields `sku`, `name`, `price` and `stock`, whose `__post_init__` upper-cases and strips the SKU, strips the name, and converts price to float and stock to int. Then write `parse_catalogue(text)`, which reads the CSV (header `sku,name,price,stock`) into a list of Products and raises `ValueError` if a SKU appears twice.",
    spec: [
      ["Dataclass", "`Product` with `sku: str`, `name: str`, `price: float`, `stock: int`; `__post_init__` tidies and converts"],
      ["Function", "`parse_catalogue(text)` → list of Product, in file order"],
      ["Raises", "`ValueError` for a SKU that appears twice (after tidying)"],
      ["Hint", "`csv.DictReader(io.StringIO(text))` reads CSV from a text"],
    ],
    hiddenKinds: ["a quoted name with a comma", "the same SKU in two cases", "a header with no rows"],
    hints: [
      "Let the dataclass do the per-row work in `__post_init__`; the function only reads rows and builds Products.",
      "`csv.DictReader` gives each row as a dictionary keyed by the header.",
      "Remember the SKUs already seen (after the Product has tidied its SKU) and raise on a repeat.",
    ],
    explanation: "Putting the tidying and conversion in `__post_init__` means every Product, however it is created, has clean fields, and dataclass `==` then lets the result be compared with expected Products directly. The csv module handles quoting (a name like `\"Mat, blue\"`). Duplicates must be checked on the tidied SKU, or `spo-11681` and `SPO-11681` slip through as two products.",
    code: {
      starter: src`
import csv
import io
from dataclasses import dataclass

def parse_catalogue(text):
    return []

text = """sku,name,price,stock
spo-11681,Yoga mat ,31.00,12
HOM-22847,Desk lamp,48,3
"""
for product in parse_catalogue(text):
    print(product)
`,
      answer: src`
import csv
import io
from dataclasses import dataclass

@dataclass
class Product:
    sku: str
    name: str
    price: float
    stock: int

    def __post_init__(self):
        self.sku = self.sku.strip().upper()
        self.name = self.name.strip()
        self.price = float(self.price)
        self.stock = int(self.stock)

def parse_catalogue(text):
    products = []
    seen = []
    for row in csv.DictReader(io.StringIO(text)):
        product = Product(row["sku"], row["name"], row["price"], row["stock"])
        if product.sku in seen:
            raise ValueError(f"SKU {product.sku} appears twice")
        seen.append(product.sku)
        products.append(product)
    return products

text = """sku,name,price,stock
spo-11681,Yoga mat ,31.00,12
HOM-22847,Desk lamp,48,3
"""
for product in parse_catalogue(text):
    print(product)
`,
      alternatives: [
        src`
import csv
import io
from dataclasses import dataclass

@dataclass
class Product:
    sku: str
    name: str
    price: float
    stock: int

    def __post_init__(self):
        self.sku = self.sku.upper().strip()
        self.name = self.name.strip()
        self.price = float(self.price)
        self.stock = int(self.stock)

def parse_catalogue(text):
    products = [Product(**row) for row in csv.DictReader(io.StringIO(text))]
    skus = [p.sku for p in products]
    for sku in skus:
        if skus.count(sku) > 1:
            raise ValueError("duplicate SKU " + sku)
    return products
`,
      ],
      wrong: [
        {
          code: src`
import csv
import io
from dataclasses import dataclass

@dataclass
class Product:
    sku: str
    name: str
    price: float
    stock: int

def parse_catalogue(text):
    products = []
    seen = []
    for row in csv.DictReader(io.StringIO(text)):
        if row["sku"] in seen:
            raise ValueError("duplicate")
        seen.append(row["sku"])
        products.append(Product(row["sku"], row["name"], row["price"], row["stock"]))
    return products
`,
          fails: ["cases", "returns", "types"],
          why: "nothing is tidied or converted, so prices stay text and differently written SKUs count as different",
        },
        {
          code: src`
from dataclasses import dataclass

@dataclass
class Product:
    sku: str
    name: str
    price: float
    stock: int

    def __post_init__(self):
        self.sku = self.sku.strip().upper()
        self.name = self.name.strip()
        self.price = float(self.price)
        self.stock = int(self.stock)

def parse_catalogue(text):
    products = []
    for line in text.strip().split("\n")[1:]:
        sku, name, price, stock = line.split(",")
        products.append(Product(sku, name, price, stock))
    return products
`,
          fails: ["comma", "cases"],
          why: "splitting lines on commas breaks on a quoted name containing a comma, and duplicates aren't checked",
        },
      ],
      task: {
        checks: [
          expr("returns", "Tidy Products from the CSV", "result = parse_catalogue('sku,name,price,stock\\nspo-11681,Yoga mat ,31.00,12\\nHOM-22847,Desk lamp,48,3\\n') == [Product('SPO-11681', 'Yoga mat', 31.0, 12), Product('HOM-22847', 'Desk lamp', 48.0, 3)]", true, { show: "parse_catalogue(text) == [Product(\"SPO-11681\", \"Yoga mat\", 31.0, 12), Product(\"HOM-22847\", \"Desk lamp\", 48.0, 3)]" }),
          expr("types", "Converted field types", "_p = parse_catalogue('sku,name,price,stock\\nele-24781,Speaker,171.99,7\\n')[0]\nresult = [type(_p.price).__name__, type(_p.stock).__name__, _p.sku]", ["float", "int", "ELE-24781"], { show: "the field types of a parsed product" }),
          expr("comma", "A quoted name with a comma", "result = parse_catalogue('sku,name,price,stock\\nSPO-11681,\"Yoga mat, blue\",31,2\\n')[0].name", "Yoga mat, blue", { hidden: true }),
          raisesExpr("cases", "The same SKU in two cases", "parse_catalogue('sku,name,price,stock\\nSPO-11681,Mat,31,1\\nspo-11681,Mat,31,1\\n')", "ValueError", { hidden: true }),
          expr("empty", "A header with no rows", "result = parse_catalogue('sku,name,price,stock\\n')", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-10 validation, easy
  {
    id: "PY-Q28-10",
    version: 2,
    slug: "weather-reading-problems",
    title: "Problems in a weather reading",
    format: "validation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "class-def", "comp-if", "comparison", "dict-get", "dict-literal", "dict-lookup", "field-ann", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "string-format", "string-index", "subclass", "top-level-indent", "typed-dict"],
    prompt: "Daily weather readings arrive as JSON objects. Write a TypedDict `Reading` with required `station` and `date` (text) and `tmax` and `tmin` (°C), and an optional `prcp` (millimetres of rain). Then write `reading_problems(row)` that checks a row using the TypedDict's own required keys, plus two rules: the minimum can't be above the maximum, and rainfall can't be negative.",
    spec: [
      ["TypedDict", "`Reading`: `station: str`, `date: str`, `tmax: float`, `tmin: float`, `prcp: NotRequired[float]`"],
      ["Function", "`reading_problems(row)` → a list of texts"],
      ["Order", "`\"missing <key>\"` for each missing required key (sorted), then `\"tmin above tmax\"` (only if both are present), then `\"negative prcp\"`"],
    ],
    hiddenKinds: ["equal minimum and maximum", "no rainfall reported", "everything missing", "zero rainfall"],
    hints: [
      "Read the required keys from `Reading.__required_keys__`, so the TypedDict stays the single description.",
      "The temperature rule needs both values; skip it when either is missing.",
      "`prcp` is optional: check it only when it is present.",
    ],
    explanation: "The TypedDict documents the shape of a reading and also supplies the required-key set for the check, so the description and the validation can't drift apart. The cross-field rule only makes sense when both temperatures are present, and the optional field is checked only when it was sent: a missing `prcp` means \"no rainfall reported\", which is allowed.",
    code: {
      starter: src`
from typing import NotRequired, TypedDict

def reading_problems(row):
    return []

print(reading_problems({"station": "USW00094728", "date": "2026-07-14", "tmax": 31.7, "tmin": 22.2, "prcp": 3.6}))
print(reading_problems({"station": "USW00094728", "tmax": 18.0, "tmin": 21.5, "prcp": -1}))
`,
      answer: src`
from typing import NotRequired, TypedDict

class Reading(TypedDict):
    station: str
    date: str
    tmax: float
    tmin: float
    prcp: NotRequired[float]

def reading_problems(row):
    problems = [f"missing {key}" for key in sorted(Reading.__required_keys__) if key not in row]
    if "tmax" in row and "tmin" in row and row["tmin"] > row["tmax"]:
        problems.append("tmin above tmax")
    if "prcp" in row and row["prcp"] < 0:
        problems.append("negative prcp")
    return problems

print(reading_problems({"station": "USW00094728", "date": "2026-07-14", "tmax": 31.7, "tmin": 22.2, "prcp": 3.6}))
print(reading_problems({"station": "USW00094728", "tmax": 18.0, "tmin": 21.5, "prcp": -1}))
`,
      alternatives: [
        src`
from typing import NotRequired, TypedDict

class Reading(TypedDict):
    station: str
    date: str
    tmax: float
    tmin: float
    prcp: NotRequired[float]

def reading_problems(row):
    missing = []
    for key in Reading.__required_keys__:
        if key not in row:
            missing.append("missing " + key)
    rules = []
    if row.get("tmax") is not None and row.get("tmin") is not None and row["tmin"] > row["tmax"]:
        rules.append("tmin above tmax")
    if row.get("prcp", 0) < 0:
        rules.append("negative prcp")
    return sorted(missing) + rules
`,
      ],
      wrong: [
        {
          code: src`
from typing import NotRequired, TypedDict

class Reading(TypedDict):
    station: str
    date: str
    tmax: float
    tmin: float
    prcp: NotRequired[float]

def reading_problems(row):
    problems = [f"missing {key}" for key in sorted(Reading.__required_keys__) if key not in row]
    if row["tmin"] > row["tmax"]:
        problems.append("tmin above tmax")
    if row["prcp"] < 0:
        problems.append("negative prcp")
    return problems
`,
          fails: ["equal", "no-rain", "nothing"],
          why: "the rules read keys that may be missing, so a row without rainfall or temperatures crashes with KeyError",
        },
        {
          code: src`
from typing import NotRequired, TypedDict

class Reading(TypedDict):
    station: str
    date: str
    tmax: float
    tmin: float
    prcp: NotRequired[float]

def reading_problems(row):
    problems = [f"missing {key}" for key in ["station", "date", "tmax", "tmin", "prcp"] if key not in row]
    if "tmax" in row and "tmin" in row and row["tmin"] >= row["tmax"]:
        problems.append("tmin above tmax")
    if "prcp" in row and row["prcp"] < 0:
        problems.append("negative prcp")
    return problems
`,
          fails: ["equal", "no-rain", "nothing"],
          why: "the field list is copied by hand and treats the optional rainfall as required, and `>=` rejects a day with no temperature change",
        },
      ],
      task: {
        checks: [
          expr("returns", "A good row and a broken one", "result = [reading_problems({'station': 'USW00094728', 'date': '2026-07-14', 'tmax': 31.7, 'tmin': 22.2, 'prcp': 3.6}), reading_problems({'station': 'USW00094728', 'tmax': 18.0, 'tmin': 21.5, 'prcp': -1})]", [[], ["missing date", "tmin above tmax", "negative prcp"]], { show: "reading_problems for a good and a broken row" }),
          expr("shape", "The TypedDict's keys", "result = [sorted(Reading.__required_keys__), sorted(Reading.__optional_keys__)]", [["date", "station", "tmax", "tmin"], ["prcp"]], { show: "Reading's required and optional keys" }),
          expr("equal", "Equal minimum and maximum", "result = reading_problems({'station': 'S', 'date': 'd', 'tmax': 4.0, 'tmin': 4.0})", [], { hidden: true }),
          expr("no-rain", "No rainfall reported", "result = reading_problems({'station': 'S', 'date': 'd', 'tmax': 9.5, 'tmin': 2.0})", [], { hidden: true }),
          expr("nothing", "Everything missing", "result = reading_problems({})", ["missing date", "missing station", "missing tmax", "missing tmin"], { hidden: true }),
          expr("zero-rain", "Zero rainfall", "result = reading_problems({'station': 'S', 'date': 'd', 'tmax': 1, 'tmin': 0, 'prcp': 0})", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-12 validation, medium
  {
    id: "PY-Q28-12",
    version: 2,
    slug: "price-and-discount-properties",
    title: "A price and a discount that guard themselves",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conversion", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "init-method", "logical", "method-def", "plain-class", "precedence", "print-call", "print-several", "property-dec", "raise-stmt", "self-name", "string-format", "top-level-indent", "type-call"],
    prompt: "Write `Product(sku, price, discount_percent=0)` whose rules hold after every change, not just at creation. `price` is a property whose setter converts to float, rounds to 2 places and refuses negatives. `discount_percent` is a property whose setter accepts only whole numbers from 0 to 90. `sale_price` is a read-only property: the price after the discount, rounded to 2 places.",
    spec: [
      ["`price`", "setter: `round(float(value), 2)`; below 0 → ValueError"],
      ["`discount_percent`", "setter: an int from 0 to 90 (bool doesn't count as an int here) → otherwise ValueError"],
      ["`sale_price`", "read-only: `price × (100 − discount_percent) / 100`, rounded to 2 places"],
      ["`__init__`", "assigns through the properties, so the same rules apply at creation"],
    ],
    hiddenKinds: ["a discount of exactly 90", "a discount given as a float", "a bad value at creation", "assigning the sale price", "a refused change leaves the old value"],
    hints: [
      "Each validated property stores its value under an underscore name (`_price`, `_discount`).",
      "`isinstance(value, int)` is True for True and False too, so rule bools out separately.",
      "`sale_price` has a getter only; computing it from the other two keeps it right after any change.",
    ],
    explanation: "Properties move the rules into the attribute itself: whether a value is set in `__init__` or ten lines later, it passes through the same setter. `sale_price` is derived, so it is a getter only, and assigning it raises AttributeError. The discount check has a classic trap: `bool` is a subclass of `int` in Python, so `isinstance(True, int)` is True and must be excluded explicitly.",
    code: {
      starter: src`
class Product:
    def __init__(self, sku, price, discount_percent=0):
        self.sku = sku
        self.price = price
        self.discount_percent = discount_percent

mat = Product("SPO-11681", "31.00", 20)
print(mat.price, mat.discount_percent)
`,
      answer: src`
class Product:
    def __init__(self, sku, price, discount_percent=0):
        self.sku = sku
        self.price = price
        self.discount_percent = discount_percent

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        value = round(float(value), 2)
        if value < 0:
            raise ValueError(f"{self.sku}: negative price {value}")
        self._price = value

    @property
    def discount_percent(self):
        return self._discount

    @discount_percent.setter
    def discount_percent(self, value):
        if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 90:
            raise ValueError(f"{self.sku}: discount must be a whole number from 0 to 90, got {value!r}")
        self._discount = value

    @property
    def sale_price(self):
        return round(self.price * (100 - self.discount_percent) / 100, 2)

mat = Product("SPO-11681", "31.00", 20)
print(mat.price, mat.discount_percent, mat.sale_price)
`,
      alternatives: [
        src`
class Product:
    def __init__(self, sku, price, discount_percent=0):
        self.sku = sku
        self.price = price
        self.discount_percent = discount_percent

    @property
    def price(self):
        return self._p

    @price.setter
    def price(self, value):
        number = round(float(value), 2)
        if number < 0:
            raise ValueError("negative price")
        self._p = number

    @property
    def discount_percent(self):
        return self._d

    @discount_percent.setter
    def discount_percent(self, value):
        if type(value) is not int or value < 0 or value > 90:
            raise ValueError("bad discount")
        self._d = value

    @property
    def sale_price(self):
        return round(self._p - self._p * self._d / 100, 2)
`,
      ],
      wrong: [
        {
          code: src`
class Product:
    def __init__(self, sku, price, discount_percent=0):
        self.sku = sku
        self._price = round(float(price), 2)
        self._discount = discount_percent

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        value = round(float(value), 2)
        if value < 0:
            raise ValueError("negative price")
        self._price = value

    @property
    def discount_percent(self):
        return self._discount

    @discount_percent.setter
    def discount_percent(self, value):
        if isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 90:
            raise ValueError("bad discount")
        self._discount = value

    @property
    def sale_price(self):
        return round(self.price * (100 - self.discount_percent) / 100, 2)
`,
          fails: ["at-creation"],
          why: "`__init__` stores straight into the underscore names, so a negative price or a 95% discount gets in at creation",
        },
        {
          code: src`
class Product:
    def __init__(self, sku, price, discount_percent=0):
        self.sku = sku
        self.price = price
        self.discount_percent = discount_percent

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        value = round(float(value), 2)
        if value < 0:
            raise ValueError("negative price")
        self._price = value

    @property
    def discount_percent(self):
        return self._discount

    @discount_percent.setter
    def discount_percent(self, value):
        if not 0 <= value <= 90:
            raise ValueError("bad discount")
        self._discount = value

    @property
    def sale_price(self):
        return round(self.price * (100 - self.discount_percent) / 100, 2)
`,
          fails: ["whole"],
          why: "only the range is checked, so 12.5 or True is accepted as a discount",
        },
      ],
      task: {
        checks: [
          expr("prices", "Price, discount and sale price", "_p = Product('SPO-11681', '31.00', 20)\n_a = [_p.price, _p.discount_percent, _p.sale_price]\n_p.price = 40\n_p.discount_percent = 25\nresult = _a + [_p.sale_price]", [py.float(31), 20, 24.8, py.float(30)], { show: "Product(\"SPO-11681\", \"31.00\", 20), then price = 40 and discount_percent = 25" }),
          raisesExpr("negative", "A negative price", "_p = Product('A', 10)\n_p.price = -1", "ValueError", { show: "product.price = -1" }),
          expr("edge", "A discount of exactly 90", "_p = Product('A', 50)\n_p.discount_percent = 90\nresult = _p.sale_price", py.float(5), { hidden: true }),
          expr("whole", "Discounts that aren't whole numbers", "_out = []\nfor _v in [12.5, True, '10', 91, -5]:\n    try:\n        Product('A', 10).discount_percent = _v\n        _out.append('accepted')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused", "refused", "refused", "refused"], { hidden: true }),
          expr("at-creation", "Bad values at creation", "_out = []\nfor _args in [('A', -3), ('B', 10, 95)]:\n    try:\n        Product(*_args)\n        _out.append('created')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused"], { hidden: true }),
          raisesExpr("read-only", "Assigning the sale price", "Product('A', 10).sale_price = 5", "AttributeError", { hidden: true }),
          expr("keeps-old", "A refused change leaves the old value", "_p = Product('A', 10, 10)\ntry:\n    _p.discount_percent = 99\nexcept ValueError:\n    pass\nresult = _p.discount_percent", 10, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-13 debugging, medium
  {
    id: "PY-Q28-13",
    version: 2,
    slug: "skus-in-a-set",
    title: "SKUs that won't go into a set",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["attr-assign", "class-def", "comparison", "function-def", "function-param", "function-return", "if-statement", "init-method", "list-literal", "list-sort", "logical", "membership", "method-def", "plain-class", "print-call", "print-text", "self-name", "string-method", "top-level-indent"],
    prompt: "SKU codes are typed by hand, so `Sku` compares them ignoring case and outer spaces: `Sku(\"spo-11681 \") == Sku(\"SPO-11681\")`. Deduplicating a list with `set(...)` now crashes with `TypeError: unhashable type: 'Sku'`. Make `Sku` hashable in a way that agrees with its equality, so equal SKUs collapse to one.",
    spec: [
      ["Equality", "two Skus are equal when their codes match after `strip().upper()` (keep this)"],
      ["Fix", "a `__hash__` that agrees with `__eq__`: equal Skus must have equal hashes"],
      ["Then", "`unique_skus(skus)` (given) returns the distinct codes, sorted"],
    ],
    hiddenKinds: ["three spellings of one SKU", "SKUs used as dictionary keys", "no SKUs"],
    hints: [
      "Defining `__eq__` removes the default hash; Python needs you to say how equal objects hash.",
      "The hash must be computed from exactly what equality compares.",
      "Hash the tidied code, the same normalised text `__eq__` uses.",
    ],
    explanation: "Sets and dictionary keys first compare hashes, then use `==`. So equal objects must hash equally; that is why Python sets `__hash__` to None when a class defines `__eq__`. Hashing the same normalised value that `__eq__` compares restores the rule. Hashing the raw code instead would put `spo-11681 ` and `SPO-11681` in different buckets, and the set would keep both even though they are equal.",
    code: {
      starter: src`
class Sku:
    def __init__(self, code):
        self.code = code

    def normalised(self):
        return self.code.strip().upper()

    def __eq__(self, other):
        if not isinstance(other, Sku):
            return NotImplemented
        return self.normalised() == other.normalised()

def unique_skus(skus):
    return sorted(sku.normalised() for sku in set(skus))

print(Sku("spo-11681 ") == Sku("SPO-11681"))
print(unique_skus([Sku("spo-11681 "), Sku("SPO-11681"), Sku("HOM-22847")]))
`,
      answer: src`
class Sku:
    def __init__(self, code):
        self.code = code

    def normalised(self):
        return self.code.strip().upper()

    def __eq__(self, other):
        if not isinstance(other, Sku):
            return NotImplemented
        return self.normalised() == other.normalised()

    def __hash__(self):
        return hash(self.normalised())

def unique_skus(skus):
    return sorted(sku.normalised() for sku in set(skus))

print(Sku("spo-11681 ") == Sku("SPO-11681"))
print(unique_skus([Sku("spo-11681 "), Sku("SPO-11681"), Sku("HOM-22847")]))
`,
      alternatives: [
        src`
class Sku:
    def __init__(self, code):
        self.code = code

    def normalised(self):
        return self.code.strip().upper()

    def __eq__(self, other):
        if not isinstance(other, Sku):
            return NotImplemented
        return self.normalised() == other.normalised()

    def __hash__(self):
        return hash(("Sku", self.normalised()))

def unique_skus(skus):
    return sorted(sku.normalised() for sku in set(skus))
`,
      ],
      wrong: [
        {
          code: src`
class Sku:
    def __init__(self, code):
        self.code = code

    def normalised(self):
        return self.code.strip().upper()

    def __eq__(self, other):
        if not isinstance(other, Sku):
            return NotImplemented
        return self.normalised() == other.normalised()

    def __hash__(self):
        return hash(self.code)

def unique_skus(skus):
    return sorted(sku.normalised() for sku in set(skus))
`,
          fails: ["unique", "spellings", "dict-keys"],
          why: "the hash uses the raw code, so equal SKUs written differently land in different buckets and both stay in the set",
        },
        {
          code: src`
class Sku:
    def __init__(self, code):
        self.code = code

    def normalised(self):
        return self.code.strip().upper()

    def __hash__(self):
        return hash(self.normalised())

def unique_skus(skus):
    return sorted(sku.normalised() for sku in set(skus))
`,
          fails: ["equal", "unique", "spellings", "dict-keys"],
          why: "removing `__eq__` makes the set work, but equality is back to identity, so no two SKU objects ever count as the same",
        },
      ],
      task: {
        checks: [
          expr("equal", "Equality ignores case and spaces", "result = [Sku('spo-11681 ') == Sku('SPO-11681'), Sku('SPO-11681') == Sku('HOM-22847'), Sku('A') == 'A']", [true, false, false], { show: "Sku(\"spo-11681 \") == Sku(\"SPO-11681\") and two more" }),
          expr("unique", "Deduplicating a list", "result = unique_skus([Sku('spo-11681 '), Sku('SPO-11681'), Sku('HOM-22847')])", ["HOM-22847", "SPO-11681"], { show: "unique_skus([Sku(\"spo-11681 \"), Sku(\"SPO-11681\"), Sku(\"HOM-22847\")])" }),
          expr("spellings", "Three spellings of one SKU", "result = len({Sku('ele-24781'), Sku(' ELE-24781'), Sku('Ele-24781 ')})", 1, { hidden: true }),
          expr("dict-keys", "SKUs used as dictionary keys", "_stock = {Sku('SPO-11681'): 12}\nresult = _stock.get(Sku(' spo-11681'))", 12, { hidden: true }),
          expr("empty", "No SKUs", "result = unique_skus([])", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-16 data transformation, medium
  {
    id: "PY-Q28-16",
    version: 2,
    slug: "order-rows-into-dataclasses",
    title: "Order rows into Order objects",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 18,
    requires: ["aggregate-call", "arithmetic", "assignment", "class-def", "comparison", "dataclass-dec", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "field-ann", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "membership", "method-def", "nested-condition", "none-value", "plain-class", "precedence", "print-call", "print-several", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "top-level-indent", "truthiness"],
    prompt: "An export has one row per order line. Write dataclasses `Line(sku, quantity, unit_price)` and `Order(order_id, customer_id, lines)`, where `lines` defaults to a new empty list for each order, and `Order` has a `total()` method. Then write `orders_from_rows(rows)` that groups the rows into Orders, in the order each order first appears.",
    spec: [
      ["`Line`", "`sku: str`, `quantity: int`, `unit_price: float`"],
      ["`Order`", "`order_id: str`, `customer_id: str`, `lines: list` (default: a new empty list); `total()` → sum of quantity × unit price, rounded to 2 places"],
      ["Function", "`orders_from_rows(rows)`; each row has `order_id`, `customer_id`, `sku`, `quantity` (int) and `unit_price` (float)"],
      ["Rule", "rows for the same order must agree on the customer; otherwise ValueError"],
    ],
    hiddenKinds: ["an order's lines not next to each other", "one order with one line", "two rows that disagree on the customer", "no rows"],
    hints: [
      "Keep a dictionary from order_id to its Order object while you walk the rows; dictionaries keep first-seen order.",
      "The first row for an order creates the Order (with an empty lines list); every row appends a Line to it.",
      "Before appending, compare the row's customer with the Order's customer and raise if they differ.",
    ],
    explanation: "A dictionary keyed by order id finds each row's Order in one step and preserves the order in which orders first appear, so `list(orders.values())` is the answer. `field(default_factory=list)` is essential: with a shared default every order would collect every line. Because dataclasses compare field by field (including the list of Line dataclasses), the whole result can be checked against expected objects with `==`.",
    code: {
      starter: src`
from dataclasses import dataclass, field

def orders_from_rows(rows):
    return []

rows = [
    {"order_id": "O100282", "customer_id": "C00077", "sku": "SPO-11681", "quantity": 2, "unit_price": 17.92},
    {"order_id": "O100918", "customer_id": "C01338", "sku": "HOM-22847", "quantity": 1, "unit_price": 48.0},
    {"order_id": "O100282", "customer_id": "C00077", "sku": "TOY-54564", "quantity": 1, "unit_price": 4.99},
]
for order in orders_from_rows(rows):
    print(order.order_id, len(order.lines), order.total())
`,
      answer: src`
from dataclasses import dataclass, field

@dataclass
class Line:
    sku: str
    quantity: int
    unit_price: float

@dataclass
class Order:
    order_id: str
    customer_id: str
    lines: list = field(default_factory=list)

    def total(self):
        return round(sum(line.quantity * line.unit_price for line in self.lines), 2)

def orders_from_rows(rows):
    orders = {}
    for row in rows:
        order = orders.get(row["order_id"])
        if order is None:
            order = Order(row["order_id"], row["customer_id"])
            orders[row["order_id"]] = order
        elif order.customer_id != row["customer_id"]:
            raise ValueError(f"{row['order_id']} has two customers")
        order.lines.append(Line(row["sku"], row["quantity"], row["unit_price"]))
    return list(orders.values())

rows = [
    {"order_id": "O100282", "customer_id": "C00077", "sku": "SPO-11681", "quantity": 2, "unit_price": 17.92},
    {"order_id": "O100918", "customer_id": "C01338", "sku": "HOM-22847", "quantity": 1, "unit_price": 48.0},
    {"order_id": "O100282", "customer_id": "C00077", "sku": "TOY-54564", "quantity": 1, "unit_price": 4.99},
]
for order in orders_from_rows(rows):
    print(order.order_id, len(order.lines), order.total())
`,
      alternatives: [
        src`
from dataclasses import dataclass, field

@dataclass
class Line:
    sku: str
    quantity: int
    unit_price: float

@dataclass
class Order:
    order_id: str
    customer_id: str
    lines: list = field(default_factory=list)

    def total(self):
        amount = 0
        for line in self.lines:
            amount += line.quantity * line.unit_price
        return round(amount, 2)

def orders_from_rows(rows):
    result = []
    for row in rows:
        found = [o for o in result if o.order_id == row["order_id"]]
        if found:
            order = found[0]
            if order.customer_id != row["customer_id"]:
                raise ValueError("customer mismatch")
        else:
            order = Order(row["order_id"], row["customer_id"])
            result.append(order)
        order.lines.append(Line(row["sku"], row["quantity"], row["unit_price"]))
    return result
`,
      ],
      wrong: [
        {
          code: src`
from dataclasses import dataclass, field

@dataclass
class Line:
    sku: str
    quantity: int
    unit_price: float

@dataclass
class Order:
    order_id: str
    customer_id: str
    lines: list = field(default_factory=list)

    def total(self):
        return round(sum(l.quantity * l.unit_price for l in self.lines), 2)

def orders_from_rows(rows):
    orders = []
    for row in rows:
        if not orders or orders[-1].order_id != row["order_id"]:
            orders.append(Order(row["order_id"], row["customer_id"]))
        orders[-1].lines.append(Line(row["sku"], row["quantity"], row["unit_price"]))
    return orders
`,
          fails: ["returns", "apart", "customers"],
          why: "only consecutive rows are grouped, so an order whose lines are separated becomes two Orders, and customers aren't compared",
        },
        {
          code: src`
from dataclasses import dataclass, field

@dataclass
class Line:
    sku: str
    quantity: int
    unit_price: float

@dataclass
class Order:
    order_id: str
    customer_id: str
    lines: list = field(default_factory=list)

    def total(self):
        return round(sum(l.quantity * l.unit_price for l in self.lines), 2)

def orders_from_rows(rows):
    orders = {}
    for row in rows:
        orders[row["order_id"]] = Order(row["order_id"], row["customer_id"])
        orders[row["order_id"]].lines.append(Line(row["sku"], row["quantity"], row["unit_price"]))
    return list(orders.values())
`,
          fails: ["returns", "apart", "customers"],
          why: "a new Order is made for every row, replacing the earlier one, so only each order's last line survives",
        },
      ],
      task: {
        checks: [
          expr("returns", "Rows grouped into Orders", "_rows = [{'order_id': 'O100282', 'customer_id': 'C00077', 'sku': 'SPO-11681', 'quantity': 2, 'unit_price': 17.92}, {'order_id': 'O100918', 'customer_id': 'C01338', 'sku': 'HOM-22847', 'quantity': 1, 'unit_price': 48.0}, {'order_id': 'O100282', 'customer_id': 'C00077', 'sku': 'TOY-54564', 'quantity': 1, 'unit_price': 4.99}]\n_out = orders_from_rows(_rows)\nresult = [_out == [Order('O100282', 'C00077', [Line('SPO-11681', 2, 17.92), Line('TOY-54564', 1, 4.99)]), Order('O100918', 'C01338', [Line('HOM-22847', 1, 48.0)])], [_o.total() for _o in _out]]", [true, [40.83, py.float(48)]], { show: "orders_from_rows(rows) == [Order(...), Order(...)] and the totals" }),
          expr("fresh-lists", "Each Order has its own list", "_a = Order('O1', 'C1')\n_b = Order('O2', 'C2')\n_a.lines.append(Line('X', 1, 1.0))\nresult = [len(_a.lines), len(_b.lines)]", [1, 0], { hidden: true }),
          expr("apart", "An order's lines not next to each other", "_rows = [{'order_id': 'A', 'customer_id': 'C1', 'sku': 'S1', 'quantity': 1, 'unit_price': 2.0}, {'order_id': 'B', 'customer_id': 'C2', 'sku': 'S2', 'quantity': 1, 'unit_price': 3.0}, {'order_id': 'A', 'customer_id': 'C1', 'sku': 'S3', 'quantity': 4, 'unit_price': 0.5}]\nresult = [(_o.order_id, len(_o.lines), _o.total()) for _o in orders_from_rows(_rows)]", [py.tuple(py.str("A"), py.int(2), py.float(4)), py.tuple(py.str("B"), py.int(1), py.float(3))], { hidden: true }),
          raisesExpr("customers", "Two rows that disagree on the customer", "orders_from_rows([{'order_id': 'A', 'customer_id': 'C1', 'sku': 'S1', 'quantity': 1, 'unit_price': 2.0}, {'order_id': 'A', 'customer_id': 'C9', 'sku': 'S2', 'quantity': 1, 'unit_price': 3.0}])", "ValueError", { hidden: true }),
          expr("empty", "No rows", "result = orders_from_rows([])", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-19 function implementation, medium
  {
    id: "PY-Q28-19",
    version: 2,
    slug: "top-scores-with-hints",
    title: "Top scores, with type hints",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "boolean", "comparison", "dict-iterate", "dict-literal", "field-ann", "function-def", "function-default", "function-param", "function-return", "if-statement", "lambda", "list-sort", "precedence", "print-call", "print-several", "raise-stmt", "return-hint", "sort-key", "string-format", "string-index", "string-slice", "top-level-indent"],
    prompt: "A leaderboard shows the best results of a course quiz. Write `top_n(scores, n=3)` **with type hints**: it takes a dictionary from learner name to score and returns a list of `(name, score)` tuples for the `n` highest scores, highest first; equal scores are listed by name A–Z. A negative `n` is a `ValueError`. The hints are checked too.",
    spec: [
      ["Function", "`top_n(scores: dict[str, float], n: int = 3) -> list[tuple[str, float]]`"],
      ["Returns", "at most `n` tuples, highest score first; ties by name A–Z; fewer if there are fewer learners"],
      ["Raises", "`ValueError` for `n < 0`"],
    ],
    hiddenKinds: ["a tie at the cut-off", "n larger than the number of learners", "n of 0", "an empty leaderboard", "a negative n"],
    hints: [
      "Sort the dictionary's items with a key that puts high scores first and, for equal scores, names in order.",
      "A key of `(-score, name)` does both, because tuples compare item by item.",
      "Slice the sorted list to `n`; annotate both parameters and the return type.",
    ],
    explanation: "Sorting by the tuple `(-score, name)` orders by score descending and breaks ties alphabetically in one pass, which a two-step sort can get wrong. Slicing never fails when `n` exceeds the length. The hints document exactly what callers pass and get back; `dict[str, float]` and `list[tuple[str, float]]` say more than a plain `dict` and `list` ever could.",
    code: {
      starter: src`
def top_n(scores, n=3):
    return []

scores = {"Nora Garcia": 91.5, "Jamal Walker": 78.0, "Grace Walker": 91.5, "Theo Williams": 64.25}
print(top_n(scores, 2))
`,
      answer: src`
def top_n(scores: dict[str, float], n: int = 3) -> list[tuple[str, float]]:
    if n < 0:
        raise ValueError(f"n must not be negative, got {n}")
    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    return ranked[:n]

scores = {"Nora Garcia": 91.5, "Jamal Walker": 78.0, "Grace Walker": 91.5, "Theo Williams": 64.25}
print(top_n(scores, 2))
`,
      alternatives: [
        src`
def top_n(scores: dict[str, float], n: int = 3) -> list[tuple[str, float]]:
    if n < 0:
        raise ValueError("negative n")
    by_name = sorted(scores.items())
    by_score = sorted(by_name, key=lambda item: item[1], reverse=True)
    return by_score[:n]
`,
      ],
      wrong: [
        {
          code: src`
def top_n(scores: dict[str, float], n: int = 3) -> list[tuple[str, float]]:
    if n < 0:
        raise ValueError("negative n")
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)[:n]
`,
          fails: ["returns"],
          why: "equal scores keep the dictionary's order instead of being listed by name",
        },
        {
          code: src`
def top_n(scores, n=3):
    if n < 0:
        raise ValueError("negative n")
    return sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:n]
`,
          fails: ["hints"],
          why: "the logic is right, but the type hints the task asks for are missing",
        },
      ],
      task: {
        checks: [
          fn("returns", "top_n", [
            example([scores, 2], [py.tuple(py.str("Grace Walker"), py.float(91.5)), py.tuple(py.str("Nora Garcia"), py.float(91.5))]),
            example([scores], [py.tuple(py.str("Grace Walker"), py.float(91.5)), py.tuple(py.str("Nora Garcia"), py.float(91.5)), py.tuple(py.str("Jamal Walker"), py.float(78))]),
            example([{ "Ana Lopez": 55.0 }, 3], [py.tuple(py.str("Ana Lopez"), py.float(55))]),
            hiddenCase("a tie at the cut-off", [{ Zoe: 80.0, Ben: 70.0, Ada: 70.0 }, 2], [py.tuple(py.str("Zoe"), py.float(80)), py.tuple(py.str("Ada"), py.float(70))]),
            hiddenCase("n of 0", [scores, 0], []),
            hiddenCase("an empty leaderboard", [{}, 5], []),
          ], { label: "top_n() lists the best scores, ties by name", compare: { numbers: "int-float-equal" } }),
          fn("negative", "top_n", [raisesCase([scores, -1], "ValueError", { label: "a negative n" })], { label: "top_n() refuses a negative n" }),
          { kind: "expr" as const, id: "hints", label: "The function has the type hints the task asks for", expr: "from typing import get_type_hints as _h\nresult = _h(top_n) == {'scores': dict[str, float], 'n': int, 'return': list[tuple[str, float]]}", expected: py.bool(true), show: "get_type_hints(top_n)" },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-20 integration, medium
  {
    id: "PY-Q28-20",
    version: 2,
    slug: "export-to-any-writer",
    title: "Export to anything that can write",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "class-def", "conversion", "dict-iterate", "dict-literal", "field-ann", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "newline-escape", "print-call", "print-several", "protocol-base", "return-hint", "self-name", "string-index", "subclass", "top-level-indent", "truthiness"],
    prompt: "A report exporter shouldn't care whether it writes to a file, to memory or to a network stream. Write a Protocol `Writer` describing what the exporter needs, `write(text: str) -> int` (return the number of characters written, as files do), and `export_csv(rows, writer)`, which writes a header line and one line per row through `writer.write` and returns the total number of characters written.",
    spec: [
      ["Protocol", "`class Writer(Protocol)` with `write(self, text: str) -> int`"],
      ["Function", "`export_csv(rows: list[dict[str, object]], writer: Writer) -> int`"],
      ["Output", "header from the first row's keys; values joined with `,`; every line ends with `\\n`; no rows → nothing written, returns 0"],
      ["Works with", "`io.StringIO()` and any class of your own with a matching `write`"],
    ],
    hiddenKinds: ["a writer class the exporter has never seen", "a single row", "no rows"],
    hints: [
      "The Protocol is a class inheriting from `Protocol` with the one method, documented by a docstring.",
      "Build each line as text and pass it to `writer.write`, adding up what each call returns.",
      "`io.StringIO` already has a `write` that returns the number of characters, so it satisfies the protocol without knowing about it.",
    ],
    explanation: "The exporter depends only on the method it calls, which the Protocol documents. `io.StringIO`, a real file and a test double all satisfy it without inheriting anything. Summing the values that `write` returns (rather than measuring the text yourself) also reports correctly for writers that write only part of what they are given, which matches how file objects behave.",
    code: {
      starter: src`
import io
from typing import Protocol

def export_csv(rows, writer):
    return 0

buffer = io.StringIO()
count = export_csv([{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}], buffer)
print(count, repr(buffer.getvalue()))
`,
      answer: src`
import io
from typing import Protocol

class Writer(Protocol):
    def write(self, text: str) -> int:
        """Write the text and return how many characters were written."""

def export_csv(rows: list[dict[str, object]], writer: Writer) -> int:
    if not rows:
        return 0
    written = writer.write(",".join(rows[0]) + "\n")
    for row in rows:
        written += writer.write(",".join(str(value) for value in row.values()) + "\n")
    return written

buffer = io.StringIO()
count = export_csv([{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}], buffer)
print(count, repr(buffer.getvalue()))
`,
      alternatives: [
        src`
import io
from typing import Protocol

class Writer(Protocol):
    def write(self, text: str) -> int:
        """Write text; return the number of characters written."""

def export_csv(rows: list[dict[str, object]], writer: Writer) -> int:
    total = 0
    if rows:
        lines = [",".join(rows[0].keys())]
        for row in rows:
            lines.append(",".join([str(row[key]) for key in rows[0]]))
        for line in lines:
            total += writer.write(line + "\n")
    return total
`,
      ],
      wrong: [
        {
          code: src`
import io
from typing import Protocol

class Writer(Protocol):
    def write(self, text: str) -> int:
        """Write the text."""

def export_csv(rows: list[dict[str, object]], writer: Writer) -> int:
    if not isinstance(writer, io.StringIO):
        raise TypeError("writer must be a StringIO")
    if not rows:
        return 0
    text = ",".join(rows[0]) + "\n" + "".join(",".join(str(v) for v in r.values()) + "\n" for r in rows)
    return writer.write(text)
`,
          fails: ["custom-writer"],
          why: "insisting on StringIO throws away the point of the protocol: any object with `write` should work",
        },
        {
          code: src`
import io
from typing import Protocol

class Writer(Protocol):
    def write(self, text: str) -> int:
        """Write the text."""

def export_csv(rows: list[dict[str, object]], writer: Writer) -> int:
    if not rows:
        return 0
    lines = [",".join(rows[0])] + [",".join(str(v) for v in r.values()) for r in rows]
    writer.write("\n".join(lines))
    return len("\n".join(lines))
`,
          fails: ["returns", "custom-writer", "single"],
          why: "the last line has no line ending, and the count is measured instead of taken from what the writer reports",
        },
      ],
      task: {
        checks: [
          expr("returns", "Writing to an io.StringIO", "import io as _io\n_b = _io.StringIO()\n_n = export_csv([{'sku': 'SPO-11681', 'qty': 2}, {'sku': 'HOM-22847', 'qty': 1}], _b)\nresult = [_n, _b.getvalue()]", [32, "sku,qty\nSPO-11681,2\nHOM-22847,1\n"], { show: "export_csv(rows, io.StringIO())" }),
          expr("protocol", "Writer is a Protocol", "import typing as _t\nresult = [issubclass(Writer, _t.Protocol), 'write' in vars(Writer)]", [true, true], { show: "issubclass(Writer, Protocol)" }),
          expr("custom-writer", "A writer class the exporter has never seen", "class _Lines:\n    def __init__(self):\n        self.lines = []\n    def write(self, text):\n        self.lines.append(text)\n        return len(text) - 1\n_w = _Lines()\n_n = export_csv([{'id': 'O1', 'total': 9.5}], _w)\nresult = [_n, _w.lines]", [14, ["id,total\n", "O1,9.5\n"]], { hidden: true }),
          expr("single", "A single row", "import io as _io\n_b = _io.StringIO()\nexport_csv([{'a': 1}], _b)\nresult = _b.getvalue()", "a\n1\n", { hidden: true }),
          expr("empty", "No rows", "import io as _io\n_b = _io.StringIO()\nresult = [export_csv([], _b), _b.getvalue()]", [0, ""], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q28-22 output prediction, hard
  {
    id: "PY-Q28-22",
    version: 2,
    slug: "carts-equal-or-the-same",
    title: "Carts: equal, or the same?",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["aggregate-call", "assignment", "attr-assign", "class-def", "comparison", "dataclass-dec", "field-ann", "function-def", "function-param", "function-return", "identity", "import-module", "len-call", "list-mutate", "method-def", "plain-class", "print-call", "print-several", "property-dec", "self-name", "string-slice", "top-level-indent"],
    prompt: "Dataclass equality, a property and a shared list. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Dataclass `==` compares the fields; `is` asks whether two names are one object.",
      "`b.prices = a.prices` makes both carts refer to one list.",
      "`a.prices[:]` is a copy of the list at that moment.",
    ],
    explanation: "First line: a has one price and b none, so they differ; `total` is computed on each read. Then `b.prices = a.prices` shares one list between two different Cart objects: appending through b changes a too, so the carts are now equal (same owner, equal lists) while still not the same object. `c` gets a copy, so popping from it leaves a's list (two prices) alone, and c then holds only 10.5.",
    predict: {
      program: src`
from dataclasses import dataclass, field

@dataclass
class Cart:
    owner: str
    prices: list = field(default_factory=list)

    @property
    def total(self):
        return round(sum(self.prices), 2)

a = Cart("Nora")
b = Cart("Nora")
a.prices.append(10.5)
print(a == b, a.total, b.total)
b.prices = a.prices
b.prices.append(4.25)
print(a == b, a.total, a is b)
c = Cart("Nora", a.prices[:])
c.prices.pop()
print(a == c, c.total, len(a.prices))
`,
      output: "False 10.5 0\nTrue 14.75 False\nFalse 10.5 2\n",
      wrongPredictions: [
        "False 10.5 0\nTrue 14.75 True\nFalse 10.5 2",
        "False 10.5 0\nFalse 10.5 False\nFalse 10.5 1",
        "True 10.5 0\nTrue 14.75 False\nTrue 10.5 1",
      ],
    },
  },
];
