/**
 * M22 Modules & Packages: five lessons (PY-L22-01 … PY-L22-05).
 *
 * How code is split across files and found again. Import styles (import, from, as) and the name clashes they cause or
 * avoid; a .py file as a module that runs once and is shared by everyone who imports it; a folder with __init__.py as
 * a package with dotted and relative imports; the `if __name__ == "__main__":` guard that lets one file be both a
 * library and a script; and diagnosing ModuleNotFoundError (err.name, sys.path, missing dependencies, shadowing).
 *
 * Honest framing of the single-editor runner: these are real files and real imports. Lesson examples create their
 * module files from code first (with importlib.invalidate_caches(), which real programs also need when a module file
 * appears after start-up) because every run starts in an empty folder. Exercises get read-only modules and packages
 * from `task.files`, shown in the prompt. Where the learner's own file must work as a module, checks write main.py's
 * source to `<name>.py` and import it for real (silent import, shared state, constants read at call time).
 * Version 2: rewritten from a print-the-double module.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/**
 * Check code that saves the learner's main.py as `<name>.py`, imports it fresh as a real module (`_m`), with anything it
 * prints on import captured in `_out`, then runs `then` (which sets `result`).
 */
export const importAs = (name: string, then: string) =>
  [
    "import importlib as _il, sys as _sys, io as _io, contextlib as _cl",
    `with open('${name}.py', 'w', encoding='utf-8') as _f:`,
    "    _f.write(_source)",
    "_il.invalidate_caches()",
    `_sys.modules.pop('${name}', None)`,
    "_out = _io.StringIO()",
    "with _cl.redirect_stdout(_out):",
    `    _m = _il.import_module('${name}')`,
    then,
  ].join("\n");

/** importAs, run from inside a fresh empty sub-folder (so the import can't see the exercise's data files). */
export const importElsewhere = (folder: string, name: string, then: string) =>
  [
    "import os as _os",
    `_os.makedirs('${folder}', exist_ok=True)`,
    `_os.chdir('${folder}')`,
    "try:",
    ...importAs(name, then).split("\n").map((l) => "    " + l),
    "finally:",
    "    _os.chdir('..')",
  ].join("\n");

// ---------------------------------------------------------------- read-only fixture modules

export const shippingPy = src`
"""Runtime Market shipping rules."""

FREE_OVER = 75
ZONE_RATES = {"domestic": 5.99, "canada": 12.5, "international": 24}


def rate(zone, weight_kg):
    """Shipping price for one parcel: the zone's base rate, plus 2 per kg above 2 kg."""
    base = ZONE_RATES[zone]
    if weight_kg > 2:
        base += 2 * (weight_kg - 2)
    return base
`;

const unitsPy = src`
"""Weight conversions."""


def convert(kg):
    """Kilograms to pounds."""
    return kg * 2.20462
`;

const currencyPy = src`
"""Currency conversion with fixed daily rates."""

RATES = {"EUR": 0.92, "GBP": 0.79}


def convert(amount_usd, to):
    """US dollars to another currency."""
    return amount_usd * RATES[to]
`;

const checkoutPy = src`
import metrics


def pay(order_id):
    metrics.record("payment")
    return order_id
`;

const searchPy = src`
import metrics


def search(term):
    metrics.record("search")
    return term.lower()
`;

export const marketInit = src`
"""Runtime Market helpers: catalogue lookups and exact money."""
from .catalog import find_product
`;

export const marketCatalog = src`
"""Product lookups."""

PRODUCTS = {
    "HOM-52782": {"name": "Deluxe Pillow", "price": "47.99", "category": "home"},
    "BOO-58412": {"name": "Nordic Handbook", "price": "15.99", "category": "books"},
    "GRO-63674": {"name": "Pro Honey", "price": "5.00", "category": "grocery"},
}


def find_product(sku):
    """The product dictionary for a SKU, or None."""
    return PRODUCTS.get(sku)
`;

export const marketMoney = src`
"""Money helpers: exact cents."""
from decimal import Decimal, ROUND_HALF_UP


def cents(amount):
    """Round a Decimal (or decimal text) to the cent, half up."""
    return Decimal(amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def line_total(price_text, quantity):
    """Price times quantity, in exact cents."""
    return cents(Decimal(price_text) * quantity)
`;

export const marketFiles = { "market/__init__.py": marketInit, "market/catalog.py": marketCatalog, "market/money.py": marketMoney };

const pluginFiles = {
  "plugins/__init__.py": "\"\"\"Export plugins.\"\"\"\n",
  "plugins/csv_export.py": "\"\"\"Export rows as CSV.\"\"\"\nimport csv\n\nFORMAT = \"csv\"\n",
  "plugins/json_export.py": "\"\"\"Export rows as JSON.\"\"\"\nimport json\n\nFORMAT = \"json\"\n",
  "plugins/parquet_export.py": "\"\"\"Export rows as Parquet (needs pyarrow).\"\"\"\nimport pyarrow\n\nFORMAT = \"parquet\"\n",
  "plugins/xlsx_export.py": "\"\"\"Export rows as Excel (needs openpyxl).\"\"\"\nimport openpyxl\n\nFORMAT = \"xlsx\"\n",
};

export const m22Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L22-01 import styles
  {
    id: "PY-L22-01",
    version: 2,
    slug: "an-import-alias",
    title: "Import styles: import, from and as",
    lede: "`import json` keeps a module's names behind its name, `from collections import Counter` brings one name in directly, and `as` renames. Each choice decides which names your code has, and which ones can collide.",
    focus: "Choose between import, from … import and as, and avoid names that collide.",
    minutes: 16,
    objectives: [
      "Explain what `import x`, `from x import y` and `import x as z` each bind in your program",
      "Recognise ImportError for a name the module doesn't have",
      "Spot and fix a clash where a later import or definition replaces an earlier name",
    ],
    requires: ["import-module", "counter-call", "function-def", "function-param", "function-return", "assignment", "dict-literal", "dict-lookup", "list-literal", "list-index", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "precedence", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "identity", "boolean", "conditional-expr", "json-dumps", "string-index"],
    teaches: ["import-alias"],
    blocks: [
      {
        kind: "text",
        md: "Since the Collections & Itertools module you've written `from collections import Counter`. An import does two things: it finds the module and runs it (once per program), then it **binds a name** in your file. The style decides which name:\n\n- `import json` binds `json`, the module itself. You write `json.dumps(...)`, so every call says where it comes from.\n- `from collections import Counter` binds just `Counter`. Shorter, but a reader has to look at the top of the file to know where it's from.\n- `import statistics as stats` binds the module under another name. Use it for long names or well-known conventions (you'll meet `import pandas as pd` later), and to avoid clashes.",
      },
      {
        kind: "example",
        title: "Three ways to bring names in",
        code: src`
import json
from collections import Counter
import statistics as stats

ratings = [5, 4, 5, 3, 5]
print(json.dumps({"ratings": ratings}))
print(Counter(ratings).most_common(1))
print(stats.median(ratings))
`,
        output: "{\"ratings\": [5, 4, 5, 3, 5]}\n[(5, 3)]\n5\n",
        note: "`json` and `stats` are module objects: the dot reaches a name inside them. `Counter` was copied into this file's names directly. A name the module doesn't have fails at once: `from statistics import average` raises `ImportError: cannot import name 'average'`.",
      },
      {
        kind: "text",
        md: "A name can only mean one thing at a time. `from x import y` and `def y(...)` both bind `y`, so the later one silently replaces the earlier. The classic case: the `time` module (for `time.sleep`) and the `time` type from `datetime` (a clock time like 09:30).",
      },
      {
        kind: "error-example",
        title: "One name, two imports",
        code: src`
import time
from datetime import time

opening = time(9, 30)
time.sleep(0.1)
`,
        error: "AttributeError",
        output: "",
        note: "`AttributeError: type object 'datetime.time' has no attribute 'sleep'`. The second import replaced the module `time` with the class `time`, so `time.sleep` no longer exists.",
      },
      {
        kind: "example",
        title: "Keep both, with as",
        code: src`
import time
from datetime import time as clock_time

opening = clock_time(9, 30)
closing = clock_time(17, 0)
print(opening, closing, opening < closing)
pause = 0.01
time.sleep(pause)
print("slept for", pause, "seconds")
`,
        output: "09:30:00 17:00:00 True\nslept for 0.01 seconds\n",
        note: "`as clock_time` gives the class a name of its own, so `time` stays the module. `import datetime` and writing `datetime.time(9, 30)` would work too.",
      },
      {
        kind: "text",
        md: "**When to use which:** `import module` when you use several of its names or the module name helps the reader (`json.loads`, `csv.DictReader`); `from module import name` for one or two names used often (`Counter`, `Decimal`); `as` for conventions and clashes. Put imports at the top of the file. **Mistakes to avoid:** importing two things with the same name, naming your own variable or function after something you imported, and `from module import *`, which dumps every name in and makes clashes invisible.",
      },
    ],
    tryIt: {
      id: "try",
      title: "median isn't defined",
      prompt: "`median_rating` raises `NameError: name 'median' is not defined`. The module is imported, but the function's name isn't. Fix it either way: reach the function through the module, or import the name itself.",
      spec: [
        ["Function", "`median_rating(ratings)`"],
        ["Returns", "the median of the ratings, from the `statistics` module"],
      ],
      starter: src`
import statistics

def median_rating(ratings):
    return median(ratings)

print(median_rating([5, 1, 4, 3]))
`,
      answer: src`
import statistics

def median_rating(ratings):
    return statistics.median(ratings)

print(median_rating([5, 1, 4, 3]))
`,
      alternatives: [
        src`
from statistics import median

def median_rating(ratings):
    return median(ratings)
`,
      ],
      wrong: [
        {
          code: src`
import statistics

def median_rating(ratings):
    return sorted(ratings)[len(ratings) // 2]
`,
          fails: ["returns"],
          why: "taking the middle item is wrong for an even number of ratings, where the median is the mean of the two middle ones",
        },
      ],
      hints: ["`import statistics` binds only the name `statistics`.", "The function lives inside that module.", "Write `statistics.median(...)`, or change the import to `from statistics import median`."],
      task: {
        checks: [
          fn("returns", "median_rating", [
            example([[5, 1, 4, 3]], 3.5),
            hiddenCase("an odd number of ratings", [[3, 5, 1]], 3),
          ], { label: "median_rating() returns the median", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Delivery cost from the shipping module",
        prompt: "The shop keeps its shipping rules in a module, `shipping.py`, next to your program (it's provided; you can't edit it). Write `delivery_cost(order)` in your file, using the module's names: domestic orders whose subtotal is at least `FREE_OVER` ship free; every other order pays `rate(zone, weight_kg)`. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"shipping.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
        spec: [
          ["Function", "`delivery_cost(order)`"],
          ["order", "a dictionary with `subtotal`, `zone` (`\"domestic\"`, `\"canada\"` or `\"international\"`) and `weight_kg`"],
          ["Returns", "`0` for free shipping, otherwise the module's `rate(zone, weight_kg)`"],
          ["Example", "`{\"subtotal\": 40, \"zone\": \"domestic\", \"weight_kg\": 1}` → `5.99`"],
          ["shipping.py", "`FREE_OVER = 75`; `ZONE_RATES = {\"domestic\": 5.99, \"canada\": 12.5, \"international\": 24}`; `rate(zone, weight_kg)` → the zone's base rate, plus 2 for every kg above 2 kg"],
        ],
        starter: src`
def delivery_cost(order):
    return 0

print(delivery_cost({"subtotal": 40, "zone": "domestic", "weight_kg": 1}))
`,
        answer: src`
from shipping import FREE_OVER, rate

def delivery_cost(order):
    if order["zone"] == "domestic" and order["subtotal"] >= FREE_OVER:
        return 0
    return rate(order["zone"], order["weight_kg"])

print(delivery_cost({"subtotal": 40, "zone": "domestic", "weight_kg": 1}))
`,
        alternatives: [
          src`
import shipping

def delivery_cost(order):
    free = order["zone"] == "domestic" and order["subtotal"] >= shipping.FREE_OVER
    return 0 if free else shipping.rate(order["zone"], order["weight_kg"])
`,
        ],
        wrong: [
          {
            code: src`
from shipping import FREE_OVER, rate

def delivery_cost(order):
    if order["subtotal"] >= FREE_OVER:
        return 0
    return rate(order["zone"], order["weight_kg"])
`,
            fails: ["returns"],
            why: "free shipping is only for domestic orders, but this gives it to Canada too",
          },
          {
            code: src`
from shipping import FREE_OVER, ZONE_RATES

def delivery_cost(order):
    if order["zone"] == "domestic" and order["subtotal"] >= FREE_OVER:
        return 0
    return ZONE_RATES[order["zone"]]
`,
            fails: ["returns"],
            why: "it uses the base rate directly and skips the weight surcharge that `rate` adds",
          },
          {
            code: src`
from shipping import FREE_OVER, rate

def delivery_cost(order):
    if order["zone"] == "domestic" and order["subtotal"] > FREE_OVER:
        return 0
    return rate(order["zone"], order["weight_kg"])
`,
            fails: ["returns"],
            why: "\"at least FREE_OVER\" includes 75 itself",
          },
        ],
        hints: [
          "Import what you need from `shipping`: the threshold and the rate function.",
          "Free shipping needs two things at once: the zone and the subtotal.",
          "For everything else, let the module's `rate` work out the price, so its weight rule is applied.",
        ],
        task: {
          files: { "shipping.py": shippingPy },
          checks: [
            fn("returns", "delivery_cost", [
              example([{ subtotal: 40, zone: "domestic", weight_kg: 1 }], 5.99),
              example([{ subtotal: 80, zone: "domestic", weight_kg: 1 }], 0),
              example([{ subtotal: 120, zone: "canada", weight_kg: 3 }], 14.5),
              hiddenCase("a subtotal exactly at the threshold", [{ subtotal: 75, zone: "domestic", weight_kg: 4 }], 0),
              hiddenCase("a heavy international parcel", [{ subtotal: 300, zone: "international", weight_kg: 5 }], 30),
              hiddenCase("just under the threshold, a little over 2 kg", [{ subtotal: 74.99, zone: "domestic", weight_kg: 2.5 }], 6.99),
            ], { label: "delivery_cost() applies the shipping module's rules", compare: { numbers: "int-float-equal" } }),
          ],
        },
      },
      {
        id: "c2",
        title: "Two modules, one function name",
        prompt: "Product labels for the European site show weight in pounds and price in the local currency. Two provided modules each have a function called `convert`: `units.convert(kg)` gives pounds, and `currency.convert(amount_usd, to)` gives another currency. Write `export_label(product, code)` that uses **both**. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"currency.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
        spec: [
          ["Function", "`export_label(product, code)`"],
          ["product", "a dictionary with `name`, `weight_kg` and `price_usd`"],
          ["Returns", "`\"<name>: <pounds, 1 decimal> lb, <price, 2 decimals> <code>\"`"],
          ["Example", "`({\"name\": \"Deluxe Pillow\", \"weight_kg\": 1.12, \"price_usd\": 47.99}, \"EUR\")` → `'Deluxe Pillow: 2.5 lb, 44.15 EUR'`"],
          ["Errors", "a currency with no rate raises the module's KeyError; don't catch it"],
          ["units.py", "`convert(kg)` → pounds (`kg * 2.20462`)"],
          ["currency.py", "`RATES = {\"EUR\": 0.92, \"GBP\": 0.79}`; `convert(amount_usd, to)` → `amount_usd * RATES[to]`"],
        ],
        starter: src`
def export_label(product, code):
    return ""

print(export_label({"name": "Deluxe Pillow", "weight_kg": 1.12, "price_usd": 47.99}, "EUR"))
`,
        answer: src`
import currency
import units

def export_label(product, code):
    pounds = units.convert(product["weight_kg"])
    price = currency.convert(product["price_usd"], code)
    return f"{product['name']}: {pounds:.1f} lb, {price:.2f} {code}"

print(export_label({"name": "Deluxe Pillow", "weight_kg": 1.12, "price_usd": 47.99}, "EUR"))
`,
        alternatives: [
          src`
from currency import convert as to_currency
from units import convert as to_pounds

def export_label(product, code):
    return product["name"] + ": " + f"{to_pounds(product['weight_kg']):.1f}" + " lb, " + f"{to_currency(product['price_usd'], code):.2f}" + " " + code
`,
        ],
        wrong: [
          {
            code: src`
from units import convert
from currency import convert

def export_label(product, code):
    pounds = convert(product["weight_kg"])
    price = convert(product["price_usd"], code)
    return f"{product['name']}: {pounds:.1f} lb, {price:.2f} {code}"
`,
            fails: ["returns"],
            why: "the second import replaces the first `convert`, so the weight call gets the currency function and raises TypeError",
          },
          {
            code: src`
import units

def export_label(product, code):
    pounds = units.convert(product["weight_kg"])
    price = product["price_usd"] * 0.92
    return f"{product['name']}: {pounds:.1f} lb, {price:.2f} {code}"
`,
            fails: ["returns"],
            why: "the euro rate is typed in, so pounds sterling come out wrong",
          },
        ],
        hints: [
          "Both modules export the same name, so importing both names directly can't work.",
          "Import the modules themselves, or rename one or both functions with `as`.",
          "Format pounds with `:.1f` and the price with `:.2f` inside an f-string.",
        ],
        task: {
          files: { "units.py": unitsPy, "currency.py": currencyPy },
          checks: [
            fn("returns", "export_label", [
              example([{ name: "Deluxe Pillow", weight_kg: 1.12, price_usd: 47.99 }, "EUR"], "Deluxe Pillow: 2.5 lb, 44.15 EUR"),
              example([{ name: "Pro Honey", weight_kg: 0.56, price_usd: 5 }, "GBP"], "Pro Honey: 1.2 lb, 3.95 GBP"),
              hiddenCase("a weight of zero", [{ name: "Gift card", weight_kg: 0, price_usd: 25 }, "EUR"], "Gift card: 0.0 lb, 23.00 EUR"),
              raisesCase([{ name: "Lamp", weight_kg: 2, price_usd: 30 }, "JPY"], "KeyError", { label: "a currency with no rate" }),
            ], { label: "export_label() uses both conversion modules" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import statistics as stats
from statistics import median

ratings = [5, 1, 4]
print(stats.median(ratings) == median(ratings), stats.median is median)
`,
        choices: ["True True", "True False", "False False", "NameError"],
        answer: 0,
        why: "Both imports reach the same function object in the same module; they just bind different names to it. The module ran once.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a later import replacing an earlier name. What does this print?",
        program: src`
import time
from datetime import time
print(time)
`,
        choices: ["<class 'datetime.time'>", "<module 'time' (built-in)>", "ImportError", "Both, on two lines"],
        answer: 0,
        why: "`from datetime import time` rebinds the name `time`. The module is still loaded, but this file can no longer reach it by that name.",
      },
      {
        id: "q3",
        prompt: "Why might a team prefer `import json` + `json.loads(text)` over `from json import loads`?",
        choices: ["Every call shows which module the function comes from, and `loads` can't clash with another `loads`", "It runs faster", "`from` imports can't be used inside functions", "`json.loads` checks the JSON more strictly"],
        answer: 0,
        why: "Both reach the same function. The module-name style trades a few characters for clarity and fewer clashes with another module's `loads`, or your own.",
      },
    ],
    review: [
      "`import m` binds the module (`m.name`), `from m import name` binds one name, `as` renames.",
      "A name the module doesn't have raises ImportError; a later import or `def` with the same name replaces the earlier one.",
      "Use the module name or `as` when two modules share a name.",
      "Next: your own file as a module.",
    ],
  },

  // ------------------------------------------------------------------ PY-L22-02 your own module
  {
    id: "PY-L22-02",
    version: 2,
    slug: "a-file-you-can-import",
    title: "Your own file as a module",
    lede: "Any .py file is a module. `import pricing` finds pricing.py next to your program, runs its top-level code once, and shares that one module object with every file that imports it.",
    focus: "Put reusable functions and constants in a .py file and import them, knowing the module runs once and is shared.",
    minutes: 18,
    objectives: [
      "Import a module of your own and use its functions and constants",
      "Explain why the module's top-level code runs only on the first import",
      "Use module-level state that every importer shares, and know when a function reads a module constant",
    ],
    requires: ["import-module", "import-alias", "path-call", "file-open", "encoding-arg", "function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "dict-literal", "dict-lookup", "dict-store", "dict-get", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "conditional-expr", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "newline-escape", "membership", "regex-call", "regex-fullmatch", "identity", "none-value", "boolean", "counter-call", "for-loop", "list-mutate", "logical", "string-index"],
    teaches: ["module-file"],
    blocks: [
      {
        kind: "text",
        md: "Once two programs need the same function, copying it means fixing every bug twice. Put it in its own file instead: `pricing.py` is a **module** named `pricing`, and `import pricing` in any program in the same folder gives access to everything it defines.\n\nThe first `import pricing` finds the file (Python searches the folder of the program you ran first), runs its top-level code from top to bottom, and stores the finished module in a cache (`sys.modules`). Every later import, from any file, gets that **same** module object without running it again.\n\nAbout this runner: in a real project you'd create pricing.py in your editor next to main.py. Here each run starts in an empty folder with one editor, so the examples create the module file from code first and call `importlib.invalidate_caches()`, which tells Python to look at the folder again because the file appeared after the program started. Everything from `import pricing` on is exactly what happens in a multi-file project.",
      },
      {
        kind: "example",
        title: "A pricing module, imported twice",
        code: src`
from pathlib import Path
import importlib

Path("pricing.py").write_text('''TAX_RATE = 0.07
print("pricing module loaded")

def with_tax(amount):
    return amount * (1 + TAX_RATE)
''', encoding="utf-8")
importlib.invalidate_caches()

import pricing
import pricing
print(f"{pricing.with_tax(66.49):.2f}")
print(pricing.TAX_RATE, pricing.__name__)
`,
        output: "pricing module loaded\n71.14\n0.07 pricing\n",
        note: "The module's `print` ran once, on the first import; the second import reused the cached module. Inside a module, `__name__` is the module's name.",
      },
      {
        kind: "error-example",
        title: "A name the module doesn't define",
        code: src`
from pathlib import Path
import importlib

Path("pricing.py").write_text("TAX_RATE = 0.07\n", encoding="utf-8")
importlib.invalidate_caches()

import pricing
print(pricing.with_tax(10))
`,
        error: "AttributeError",
        output: "",
        note: "`AttributeError: module 'pricing' has no attribute 'with_tax'`. The module was found and ran; it just doesn't define that name. Check the spelling, or that the module file you edited is the one being imported.",
      },
      {
        kind: "text",
        md: "Because a module runs once and is shared, a variable at module level is shared too. Here `inventory` holds the stock, and `checkout` (another module) imports it and takes stock away. The main program sees the change, because there is only one `inventory`.",
      },
      {
        kind: "example",
        title: "Two modules, one shared inventory",
        code: src`
from pathlib import Path
import importlib

Path("inventory.py").write_text('''STOCK = {"HOM-52782": 4, "GRO-63674": 12}

def take(sku, quantity):
    if STOCK.get(sku, 0) < quantity:
        return False
    STOCK[sku] -= quantity
    return True
''', encoding="utf-8")
Path("checkout.py").write_text('''import inventory

def buy(sku, quantity):
    return "paid" if inventory.take(sku, quantity) else "out of stock"
''', encoding="utf-8")
importlib.invalidate_caches()

import checkout
import inventory
print(checkout.buy("HOM-52782", 3), checkout.buy("HOM-52782", 3))
print(inventory.STOCK)
print(checkout.inventory is inventory)
`,
        output: "paid out of stock\n{'HOM-52782': 1, 'GRO-63674': 12}\nTrue\n",
        note: "`checkout.inventory` and the `inventory` imported here are the same object, so the second purchase sees the stock the first one took. That sharing is useful (one cache, one set of counters) and a trap (a test that changes it affects the next one).",
      },
      {
        kind: "text",
        md: "**When to use it:** as soon as code is reused by more than one program, or a file grows too long to read. Give modules plain lower-case names. **Mistakes to avoid:** naming your file after a standard module (`json.py`, `csv.py`), doing slow work or printing at module level (it happens on import), and expecting edits to a module to show up in a program that already imported it (it was cached).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Use the module's own setting",
      prompt: "This file is the `pricing` module that the checkout imports; Check imports it for real. `shipping_fee` always charges 5.99, ignoring the module's `FREE_SHIPPING_OVER` setting. Make orders at or above that amount ship free, reading the module constant (so changing the setting in one place changes the fee).",
      spec: [
        ["Module", "this file, imported as `pricing`"],
        ["Function", "`shipping_fee(subtotal)` → `0` when `subtotal >= FREE_SHIPPING_OVER`, else `5.99`"],
      ],
      starter: src`
FREE_SHIPPING_OVER = 75

def shipping_fee(subtotal):
    return 5.99
`,
      answer: src`
FREE_SHIPPING_OVER = 75

def shipping_fee(subtotal):
    if subtotal >= FREE_SHIPPING_OVER:
        return 0
    return 5.99
`,
      wrong: [
        {
          code: src`
FREE_SHIPPING_OVER = 75

def shipping_fee(subtotal):
    if subtotal >= 75:
        return 0
    return 5.99
`,
          fails: ["setting"],
          why: "75 is typed into the function, so changing `FREE_SHIPPING_OVER` changes nothing",
        },
      ],
      hints: ["The threshold already exists as a module-level name.", "Compare the subtotal with that name inside the function.", "At or above the threshold, return 0; otherwise 5.99."],
      task: {
        checks: [
          fn("returns", "shipping_fee", [
            example([80], 0),
            example([20], 5.99),
            hiddenCase("exactly the threshold", [75], 0),
          ], { label: "shipping_fee() charges nothing at or above the threshold", compare: { numbers: "int-float-equal" } }),
          {
            kind: "expr",
            id: "setting",
            label: "imported as pricing, the fee follows a changed FREE_SHIPPING_OVER",
            show: "import pricing; pricing.FREE_SHIPPING_OVER = 100; pricing.shipping_fee(80)",
            expr: importAs("pricing", "_m.FREE_SHIPPING_OVER = 100\nresult = _m.shipping_fee(80)"),
            expected: py.float(5.99),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A validators module other code can share",
        prompt: "Several programs check SKUs and order IDs, each with its own slightly different regex. Write this file as the shared `validators` module: two pattern constants, `SKU_PATTERN` (three capitals, a dash, five digits) and `ORDER_PATTERN` (an `O` and six digits), and two functions, `is_sku(code)` and `is_order_id(code)`, that check a **whole** code against those constants. The functions must use the constants, so a change to a pattern changes every check. Keep the file to definitions: Check imports it as `validators`.",
        spec: [
          ["Module", "this file, imported as `validators`"],
          ["Constants", "`SKU_PATTERN` and `ORDER_PATTERN`: regex text other modules can use with `re.fullmatch`"],
          ["Functions", "`is_sku(code)` and `is_order_id(code)` → `True` or `False`"],
          ["Example", "`is_sku(\"HOM-52782\")` → `True`; `is_order_id(\"O10483\")` → `False`"],
        ],
        starter: src`
import re

def is_sku(code):
    return False

def is_order_id(code):
    return False
`,
        answer: src`
import re

SKU_PATTERN = r"[A-Z]{3}-\d{5}"
ORDER_PATTERN = r"O\d{6}"

def is_sku(code):
    return re.fullmatch(SKU_PATTERN, code) is not None

def is_order_id(code):
    return re.fullmatch(ORDER_PATTERN, code) is not None
`,
        alternatives: [
          src`
"""Shared format checks for Runtime Market codes."""
import re

SKU_PATTERN = "[A-Z]{3}-[0-9]{5}"
ORDER_PATTERN = "O[0-9]{6}"


def matches(pattern, text):
    return bool(re.fullmatch(pattern, text))


def is_sku(code):
    return matches(SKU_PATTERN, code)


def is_order_id(code):
    return matches(ORDER_PATTERN, code)
`,
        ],
        wrong: [
          {
            code: src`
import re

SKU_PATTERN = r"[A-Z]{3}-\d{5}"
ORDER_PATTERN = r"O\d{6}"

def is_sku(code):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", code) is not None

def is_order_id(code):
    return re.fullmatch(r"O\d{6}", code) is not None
`,
            fails: ["uses-constants"],
            why: "the checks repeat the patterns instead of using the constants, so the two can drift apart",
          },
          {
            code: src`
import re

SKU_PATTERN = r"[A-Z]{3}-\d{5}"
ORDER_PATTERN = r"O\d{6}"

def is_sku(code):
    return re.search(SKU_PATTERN, code) is not None

def is_order_id(code):
    return re.search(ORDER_PATTERN, code) is not None
`,
            fails: ["sku", "order"],
            why: "`search` accepts a valid piece inside a longer code",
          },
          {
            code: src`
import re

SKU = r"[A-Z]{3}-\d{5}"
ORDER = r"O\d{6}"

def is_sku(code):
    return re.fullmatch(SKU, code) is not None

def is_order_id(code):
    return re.fullmatch(ORDER, code) is not None
`,
            fails: ["constants", "uses-constants"],
            why: "other modules look for `SKU_PATTERN` and `ORDER_PATTERN`; these names don't exist",
          },
        ],
        hints: [
          "Module-level names are what other files can import: put the two patterns there as raw strings.",
          "Each function checks the whole code with `re.fullmatch` against its constant.",
          "Refer to the constant by name inside the function; it's looked up each time the function runs.",
        ],
        task: {
          checks: [
            fn("sku", "is_sku", [
              example(["HOM-52782"], true),
              example(["hom-52782"], false),
              hiddenCase("an extra digit", ["HOM-527821"], false),
              hiddenCase("text before a valid code", ["SKU HOM-52782"], false),
            ], { label: "is_sku() checks the whole code" }),
            fn("order", "is_order_id", [
              example(["O104839"], true),
              example(["O10483"], false),
              hiddenCase("an order ID with a suffix", ["O104839-R"], false),
            ], { label: "is_order_id() checks the whole code" }),
            {
              kind: "expr",
              id: "constants",
              label: "imported as validators, the pattern constants work with re.fullmatch",
              show: "import validators; re.fullmatch(validators.SKU_PATTERN, 'HOM-52782'), …",
              expr: importAs("validators", "import re as _re\nresult = [_re.fullmatch(_m.SKU_PATTERN, 'HOM-52782') is not None, _re.fullmatch(_m.SKU_PATTERN, 'HOM-5278') is None, _re.fullmatch(_m.ORDER_PATTERN, 'O104839') is not None, _re.fullmatch(_m.ORDER_PATTERN, 'P104839') is None]"),
              expected: py.list(py.bool(true), py.bool(true), py.bool(true), py.bool(true)),
            },
            {
              kind: "expr",
              id: "uses-constants",
              label: "changing a pattern constant changes the check",
              hidden: true,
              expr: importAs("validators", "_m.SKU_PATTERN = r'[A-Z]{2}-\\d{2}'\n_m.ORDER_PATTERN = r'R\\d{3}'\nresult = [_m.is_sku('AB-12'), _m.is_order_id('R123')]"),
              expected: py.list(py.bool(true), py.bool(true)),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Counters every module shares",
        prompt: "The shop wants to count events from different parts of the code: the checkout records payments, the search records searches. Write this file as the `metrics` module they both import (they're provided below). `record(event)` adds one to that event's count, `count(event)` returns it (0 for an event that never happened), and `reset()` sets every count back to zero. Keep the counts in a dictionary at module level, so every importer shares them. Keep the file to definitions only: importing it must not record anything. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"checkout.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
        spec: [
          ["Module", "this file, imported as `metrics` by checkout.py and search.py"],
          ["Functions", "`record(event)`, `count(event)` → int, `reset()`"],
          ["Shared", "events counted through checkout and through search add up in the same module"],
          ["checkout.py", "`import metrics`; `pay(order_id)` calls `metrics.record(\"payment\")` and returns the ID"],
          ["search.py", "`import metrics`; `search(term)` calls `metrics.record(\"search\")` and returns the term in lower case"],
        ],
        starter: src`
def record(event):
    pass

def count(event):
    return 0

def reset():
    pass
`,
        answer: src`
COUNTS = {}

def record(event):
    COUNTS[event] = COUNTS.get(event, 0) + 1

def count(event):
    return COUNTS.get(event, 0)

def reset():
    COUNTS.clear()
`,
        alternatives: [
          src`
"""Event counters shared by every module that imports this one."""
from collections import Counter

_counts = Counter()


def record(event):
    _counts[event] += 1


def count(event):
    return _counts[event]


def reset():
    for event in list(_counts):
        del _counts[event]
`,
        ],
        wrong: [
          {
            code: src`
def record(event):
    counts = {}
    counts[event] = counts.get(event, 0) + 1

def count(event):
    return 0

def reset():
    pass
`,
            fails: ["shared", "reset"],
            why: "the dictionary is created inside `record`, so it disappears after every call",
          },
          {
            code: src`
COUNTS = {}

def record(event):
    COUNTS[event] = COUNTS.get(event, 0) + 1

def count(event):
    return COUNTS.get(event, 0)

def reset():
    COUNTS = {}
`,
            fails: ["reset"],
            why: "`COUNTS = {}` inside `reset` makes a new local name; the module's dictionary is never emptied",
          },
          {
            code: src`
COUNTS = {}

def record(event):
    COUNTS[event] = COUNTS.get(event, 0) + 1

def count(event):
    return COUNTS[event]

def reset():
    COUNTS.clear()
`,
            fails: ["shared", "reset", "quiet-import"],
            why: "an event that was never recorded raises KeyError instead of counting 0",
          },
        ],
        hints: [
          "The counts must outlive each call and be shared by importers, so they belong at module level, outside any function.",
          "`record` and `count` read and update that one dictionary; `get(event, 0)` covers events not seen yet.",
          "To empty it in `reset`, change the existing dictionary (`clear()`) rather than assigning a new one to the name.",
        ],
        task: {
          files: { "checkout.py": checkoutPy, "search.py": searchPy },
          checks: [
            {
              kind: "expr",
              id: "shared",
              label: "events recorded by checkout and search are counted together",
              show: "checkout.pay('O1'); checkout.pay('O2'); search.search('Pillow'); [metrics.count('payment'), metrics.count('search'), metrics.count('refund')]",
              expr: importAs("metrics", "_sys.modules.pop('checkout', None)\n_sys.modules.pop('search', None)\nimport checkout as _co, search as _se\n_co.pay('O1')\n_co.pay('O2')\n_se.search('Pillow')\nresult = [_m.count('payment'), _m.count('search'), _m.count('refund')]"),
              expected: py.list(py.int(2), py.int(1), py.int(0)),
            },
            {
              kind: "expr",
              id: "reset",
              label: "reset() sets every count back to zero",
              hidden: true,
              expr: importAs("metrics", "_sys.modules.pop('checkout', None)\nimport checkout as _co\n_co.pay('O1')\n_m.record('refund')\n_m.reset()\n_co.pay('O2')\nresult = [_m.count('payment'), _m.count('refund')]"),
              expected: py.list(py.int(1), py.int(0)),
            },
            {
              kind: "expr",
              id: "quiet-import",
              label: "importing the module records nothing",
              hidden: true,
              expr: importAs("metrics", "result = [_m.count('payment'), _m.count('search')]"),
              expected: py.list(py.int(0), py.int(0)),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import Path
import importlib

Path("greeting.py").write_text('print("loading greeting")\nNAME = "Runtime Market"\n', encoding="utf-8")
importlib.invalidate_caches()

import greeting
from greeting import NAME
import greeting as g
print(NAME, g is greeting)
`,
        choices: ["loading greeting\nRuntime Market True", "loading greeting\nloading greeting\nloading greeting\nRuntime Market True", "Runtime Market True", "loading greeting\nRuntime Market False"],
        answer: 0,
        why: "The module runs once, on the first import. The `from` and `as` imports reuse the cached module, so `g` and `greeting` are the same object.",
      },
      {
        id: "q2",
        prompt: "A common surprise: editing a module file after it was imported. What does this print?",
        program: src`
from pathlib import Path
import importlib

Path("prices.py").write_text("PILLOW = 47.99\n", encoding="utf-8")
importlib.invalidate_caches()
import prices

Path("prices.py").write_text("PILLOW = 39.99\n", encoding="utf-8")
import prices
print(prices.PILLOW)
`,
        choices: ["47.99", "39.99", "47.99\n39.99", "ImportError"],
        answer: 0,
        why: "The second `import prices` finds the module already in the cache and doesn't read the file again. A program has to restart (or deliberately reload the module) to see the new price.",
      },
      {
        id: "q3",
        prompt: "Why is `print(\"loading…\")` or reading a big file at a module's top level usually a bad idea?",
        choices: ["It runs whenever any program imports the module, even one that only wanted a single function", "Top-level code can't use functions", "Modules can't contain print", "It runs every time a function in the module is called"],
        answer: 0,
        why: "Top-level code runs on (the first) import. Work there slows down and clutters every importer; put it in a function, or behind the guard in the next lesson.",
      },
    ],
    review: [
      "A .py file is a module; `import name` runs it once and caches it, and every importer shares that one object.",
      "Module-level constants and dictionaries are shared state; functions read module names when they run.",
      "Keep modules to definitions: top-level work runs on import.",
      "Next: a folder of modules, a package.",
    ],
  },

  // ------------------------------------------------------------------ PY-L22-03 packages
  {
    id: "PY-L22-03",
    version: 2,
    slug: "a-folder-of-modules",
    title: "Packages: folders of modules",
    lede: "A folder with an __init__.py is a package. Dotted imports reach the modules inside it, modules in the package import each other with relative imports, and __init__.py decides what the package itself offers.",
    focus: "Organise modules into a package and import from it with dotted and relative imports.",
    minutes: 18,
    objectives: [
      "Import from a package with `import shop.tax` and `from shop.pricing import price_with_tax`",
      "Use relative imports (`from .tax import rate_for`) between modules of the same package",
      "Re-export names in `__init__.py`, and recognise the error from a relative import outside a package",
    ],
    requires: ["import-module", "import-alias", "module-file", "path-call", "file-open", "encoding-arg", "with-statement", "csv-read", "decimal-call", "function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "dict-literal", "dict-lookup", "dict-get", "list-literal", "list-mutate", "list-index", "tuple-unpack", "for-loop", "if-statement", "comparison", "identity", "none-value", "arithmetic", "precedence", "conversion", "continue-statement", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "newline-escape", "tuple-literal", "membership", "string-method", "boolean", "else-clause", "logical", "nested-condition", "string-format", "string-index", "truthiness"],
    teaches: ["package-import", "relative-import"],
    blocks: [
      {
        kind: "text",
        md: "Ten modules in one folder get hard to find. A **package** groups related modules in a folder: `shop/pricing.py`, `shop/tax.py`, plus `shop/__init__.py`, which marks the folder as a package and runs when the package is first imported.\n\nFrom outside, dotted names reach inside: `import shop.tax` (then `shop.tax.rate_for(...)`) or `from shop.pricing import price_with_tax`. Inside the package, modules import their neighbours with **relative** imports: `from .tax import rate_for` means \"the `tax` module in my own package\", so the package keeps working if the folder is renamed or moved.",
      },
      {
        kind: "example",
        title: "A shop package with two modules",
        code: src`
from pathlib import Path
import importlib

Path("shop").mkdir(exist_ok=True)
Path("shop/__init__.py").write_text('"""Runtime Market shop helpers."""\n', encoding="utf-8")
Path("shop/tax.py").write_text('''from decimal import Decimal

RATES = {"NY": Decimal("0.08875"), "FL": Decimal("0.07"), "OR": Decimal("0")}

def rate_for(state):
    return RATES.get(state, Decimal("0.05"))
''', encoding="utf-8")
Path("shop/pricing.py").write_text('''from decimal import Decimal, ROUND_HALF_UP
from .tax import rate_for

def price_with_tax(price_text, state):
    total = Decimal(price_text) * (1 + rate_for(state))
    return total.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
''', encoding="utf-8")
importlib.invalidate_caches()

from shop.pricing import price_with_tax
import shop.tax

print(price_with_tax("47.99", "NY"), price_with_tax("47.99", "OR"))
print(shop.tax.rate_for("FL"))
`,
        output: "52.25 47.99\n0.07\n",
        note: "`pricing` reaches `tax` with `from .tax import ...`. From outside, the main program uses full dotted names. (As before, the first lines only create the files a real project would already have.)",
      },
      {
        kind: "error-example",
        title: "A relative import in the program you run",
        code: src`
from .tax import rate_for
`,
        error: "ImportError",
        output: "",
        note: "`ImportError: attempted relative import with no known parent package`. A relative import means \"next to me in my package\"; the program you run directly isn't inside a package. Use the full name, `from shop.tax import rate_for`.",
      },
      {
        kind: "text",
        md: "`__init__.py` can also choose what the package offers at the top level. With `from .pricing import price_with_tax` inside it, users can write `from shop import price_with_tax` without knowing which module the function lives in, and you can reorganise the modules later without breaking them.",
      },
      {
        kind: "example",
        title: "Re-exporting from __init__.py",
        code: src`
from pathlib import Path
import importlib

Path("catalog").mkdir(exist_ok=True)
Path("catalog/__init__.py").write_text('from .lookup import find_product\n', encoding="utf-8")
Path("catalog/lookup.py").write_text('''PRODUCTS = {"HOM-52782": "Deluxe Pillow", "GRO-63674": "Pro Honey"}

def find_product(sku):
    return PRODUCTS.get(sku, "unknown product")
''', encoding="utf-8")
importlib.invalidate_caches()

from catalog import find_product
import catalog

print(find_product("HOM-52782"), "|", catalog.find_product("XXX-00000"))
print(catalog.lookup.find_product("GRO-63674"))
`,
        output: "Deluxe Pillow | unknown product\nPro Honey\n",
        note: "`find_product` is available straight from `catalog` because `__init__.py` imported it. The module itself is still there as `catalog.lookup`.",
      },
      {
        kind: "text",
        md: "**When to use it:** once a project has more than a handful of modules, group them by responsibility (`shop.pricing`, `shop.tax`, `shop.export`). **Mistakes to avoid:** relative imports in the script you run, forgetting `__init__.py` (it isn't strictly required in modern Python, but without it the folder is a looser \"namespace package\" and many tools expect it), and circular imports, where two modules import each other at the top.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Import from the package",
      prompt: "`order_line` imports `line_total` from a module called `money`, but `money.py` lives inside the provided `market` package, so the import fails with ModuleNotFoundError. Fix the import. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"market/money.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
      spec: [
        ["Function", "`order_line(price_text, quantity)`"],
        ["Returns", "the line total from `market.money.line_total`, as text"],
        ["market/money.py", "`cents(amount)` rounds a Decimal or decimal text to the cent, half up; `line_total(price_text, quantity)` → `cents(Decimal(price_text) * quantity)`"],
      ],
      starter: src`
from money import line_total

def order_line(price_text, quantity):
    return str(line_total(price_text, quantity))

print(order_line("47.99", 2))
`,
      answer: src`
from market.money import line_total

def order_line(price_text, quantity):
    return str(line_total(price_text, quantity))

print(order_line("47.99", 2))
`,
      alternatives: [
        src`
import market.money

def order_line(price_text, quantity):
    return str(market.money.line_total(price_text, quantity))
`,
      ],
      wrong: [
        {
          code: src`
from decimal import Decimal

def order_line(price_text, quantity):
    return str(Decimal(price_text) * quantity)
`,
          fails: ["returns"],
          why: "it skips the package's rounding, so a price with more than two decimals isn't rounded to the cent",
        },
      ],
      hints: ["The module isn't next to your program; it's inside the `market` folder.", "From outside a package, a module inside it is reached by a dotted name.", "Write the package name, a dot, then the module name, in the `from` part of the import."],
      task: {
        files: marketFiles,
        checks: [
          fn("returns", "order_line", [
            example(["47.99", 2], "95.98"),
            hiddenCase("a wholesale price with three decimals", ["0.425", 1], "0.43"),
          ], { label: "order_line() uses the package's line_total" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Price a basket with the market package",
        prompt: "The provided `market` package has a catalogue and exact money helpers. Write `basket_total(items)`: look each SKU up with `find_product` (offered by the package itself, see `__init__.py`), add up `line_total(price, quantity)` for every known SKU, skip unknown SKUs, and return the total as text with two decimals. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"market/catalog.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
        spec: [
          ["Function", "`basket_total(items)`"],
          ["items", "a list of `[sku, quantity]` pairs"],
          ["Returns", "text such as `\"110.98\"`; `\"0.00\"` for an empty basket"],
          ["Example", "`[[\"HOM-52782\", 2], [\"GRO-63674\", 3]]` → `'110.98'`"],
          ["market/__init__.py", "`from .catalog import find_product`, so `from market import find_product` works"],
          ["market/catalog.py", "`find_product(sku)` → the product's dictionary (`name`, `price` as text, `category`) or `None`; it knows `HOM-52782` Deluxe Pillow 47.99, `BOO-58412` Nordic Handbook 15.99 and `GRO-63674` Pro Honey 5.00"],
          ["market/money.py", "`cents(amount)` rounds a Decimal or decimal text to the cent, half up; `line_total(price_text, quantity)` → `cents(Decimal(price_text) * quantity)`"],
        ],
        starter: src`
def basket_total(items):
    return "0.00"

print(basket_total([["HOM-52782", 2], ["GRO-63674", 3]]))
`,
        answer: src`
from decimal import Decimal
from market import find_product
from market.money import line_total

def basket_total(items):
    total = Decimal("0.00")
    for sku, quantity in items:
        product = find_product(sku)
        if product is None:
            continue
        total += line_total(product["price"], quantity)
    return str(total)

print(basket_total([["HOM-52782", 2], ["GRO-63674", 3]]))
`,
        alternatives: [
          src`
import market
import market.money

def basket_total(items):
    total = market.money.cents("0")
    for item in items:
        product = market.find_product(item[0])
        if product is not None:
            total = total + market.money.line_total(product["price"], item[1])
    return str(total)
`,
        ],
        wrong: [
          {
            code: src`
from market import find_product

def basket_total(items):
    total = 0
    for sku, quantity in items:
        product = find_product(sku)
        if product is None:
            continue
        total += float(product["price"]) * quantity
    return str(total)
`,
            fails: ["returns"],
            why: "float arithmetic and `str` give text like `110.97999999999999` or `0`, not exact cents",
          },
          {
            code: src`
from decimal import Decimal
from market import find_product
from market.money import line_total

def basket_total(items):
    total = Decimal("0.00")
    for sku, quantity in items:
        total += line_total(find_product(sku)["price"], quantity)
    return str(total)
`,
            fails: ["returns"],
            why: "an unknown SKU gives None, and `None[\"price\"]` raises TypeError",
          },
        ],
        hints: [
          "Import `find_product` from the package and `line_total` from its money module.",
          "Start the total as `Decimal(\"0.00\")` so it already has two decimals, and skip SKUs that come back as None.",
          "Add each line total (already rounded to the cent); turning the Decimal into text keeps its two decimals.",
        ],
        task: {
          files: marketFiles,
          checks: [
            fn("returns", "basket_total", [
              example([[["HOM-52782", 2], ["GRO-63674", 3]]], "110.98"),
              example([[]], "0.00"),
              example([[["BOO-58412", 1], ["XXX-00000", 4]]], "15.99"),
              hiddenCase("the same SKU twice", [[["GRO-63674", 1], ["GRO-63674", 2]]], "15.00"),
              hiddenCase("only unknown SKUs", [[["NOPE-1", 1]]], "0.00"),
              hiddenCase("a quantity of zero", [[["HOM-52782", 0], ["BOO-58412", 2]]], "31.98"),
            ], { label: "basket_total() prices known SKUs exactly" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Price an uploaded basket file",
        prompt: "Customers can upload a basket as a CSV with the header `sku,quantity`. Write `price_upload(path)` using the provided `market` package (same files as the previous challenge): return a tuple `(total, unknown)`, where `total` is the price of the known SKUs as text with two decimals, and `unknown` is a list of the SKUs the catalogue doesn't have, in file order, each once. Quantities arrive as text.",
        spec: [
          ["Function", "`price_upload(path)`"],
          ["File", "CSV with header `sku,quantity`"],
          ["Returns", "`(total text, list of unknown SKUs)`"],
          ["Example", "`basket.csv` → `('63.98', ['TOY-99999'])`"],
        ],
        starter: src`
import csv

def price_upload(path):
    return ("0.00", [])

print(price_upload("basket.csv"))
`,
        answer: src`
import csv
from decimal import Decimal
from market import find_product
from market.money import line_total

def price_upload(path):
    total = Decimal("0.00")
    unknown = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            product = find_product(row["sku"])
            if product is None:
                if row["sku"] not in unknown:
                    unknown.append(row["sku"])
                continue
            total += line_total(product["price"], int(row["quantity"]))
    return (str(total), unknown)

print(price_upload("basket.csv"))
`,
        alternatives: [
          src`
import csv
import market
import market.money

def price_upload(path):
    with open(path, encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    total = market.money.cents("0")
    unknown = []
    for row in rows:
        product = market.find_product(row["sku"])
        if product:
            total += market.money.line_total(product["price"], int(row["quantity"]))
        elif row["sku"] not in unknown:
            unknown.append(row["sku"])
    return (f"{total}", unknown)
`,
        ],
        wrong: [
          {
            code: src`
import csv
from decimal import Decimal
from market import find_product
from market.money import line_total

def price_upload(path):
    total = Decimal("0.00")
    unknown = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            product = find_product(row["sku"])
            if product is None:
                unknown.append(row["sku"])
                continue
            total += line_total(product["price"], int(row["quantity"]))
    return (str(total), unknown)
`,
            fails: ["returns"],
            why: "an unknown SKU that appears twice is reported twice",
          },
          {
            code: src`
import csv
from decimal import Decimal
from market import find_product
from market.money import line_total

def price_upload(path):
    total = Decimal("0.00")
    unknown = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            product = find_product(row["sku"])
            if product is None:
                if row["sku"] not in unknown:
                    unknown.append(row["sku"])
                continue
            total += line_total(product["price"], row["quantity"])
    return (str(total), unknown)
`,
            fails: ["returns"],
            why: "the quantity is still text, and multiplying a Decimal by text raises TypeError",
          },
        ],
        hints: [
          "Read the rows with `csv.DictReader`; the package does the lookups and the money.",
          "Quantities are text: convert them before passing them to `line_total`.",
          "Collect unknown SKUs in a list, adding each one only the first time.",
        ],
        task: {
          files: {
            ...marketFiles,
            "basket.csv": "sku,quantity\nHOM-52782,1\nTOY-99999,2\nBOO-58412,1\n",
            "repeats.csv": "sku,quantity\nNOPE-1,1\nGRO-63674,2\nNOPE-1,3\nNOPE-2,1\n",
            "empty.csv": "sku,quantity\n",
          },
          checks: [
            fn("returns", "price_upload", [
              example(["basket.csv"], py.tuple(py.str("63.98"), py.list(py.str("TOY-99999")))),
              hiddenCase("an unknown SKU listed twice", ["repeats.csv"], py.tuple(py.str("10.00"), py.list(py.str("NOPE-1"), py.str("NOPE-2")))),
              hiddenCase("a file with only the header", ["empty.csv"], py.tuple(py.str("0.00"), py.list())),
            ], { label: "price_upload() prices the known SKUs and lists the unknown ones" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import Path
import importlib

Path("tools").mkdir(exist_ok=True)
Path("tools/__init__.py").write_text('print("tools package loaded")\n', encoding="utf-8")
Path("tools/slug.py").write_text('def make(title):\n    return title.lower().replace(" ", "-")\n', encoding="utf-8")
importlib.invalidate_caches()

from tools.slug import make
import tools.slug
print(make("Deluxe Pillow"), tools.slug.make("Pro Honey"))
`,
        choices: ["tools package loaded\ndeluxe-pillow pro-honey", "deluxe-pillow pro-honey", "tools package loaded\ntools package loaded\ndeluxe-pillow pro-honey", "tools package loaded\nDeluxe-Pillow Pro-Honey"],
        answer: 0,
        why: "Importing anything inside a package runs its `__init__.py` first, once. The second import reuses the cached package and module, so the message appears only once.",
      },
      {
        id: "q2",
        prompt: "A common mistake: inside `shop/pricing.py`, which import reaches `shop/tax.py` and keeps working if the folder is renamed?",
        choices: ["`from .tax import rate_for`", "`from tax import rate_for`", "`import tax`", "`from shop.tax.rate_for import rate_for`"],
        answer: 0,
        why: "The dot means \"in my own package\". `import tax` looks for a top-level module called tax, which only exists if the program happens to run from inside the shop folder.",
      },
      {
        id: "q3",
        prompt: "Why put `from .pricing import price_with_tax` in a package's `__init__.py`?",
        choices: ["So users can write `from shop import price_with_tax` without knowing which module holds it", "Because functions can only be called through __init__.py", "To stop pricing.py from running", "To make the import faster"],
        answer: 0,
        why: "It gives the package a small public surface. The modules behind it can be reorganised without changing the code that uses the package.",
      },
    ],
    review: [
      "A folder with `__init__.py` is a package; `__init__.py` runs on the package's first import.",
      "From outside: `import shop.tax` or `from shop.pricing import name`. Inside: `from .tax import name`.",
      "Relative imports only work inside a package, never in the program you run.",
      "Next: one file that is both a module and a program.",
    ],
  },

  // ------------------------------------------------------------------ PY-L22-04 __main__
  {
    id: "PY-L22-04",
    version: 2,
    slug: "run-it-as-main",
    title: "Library and script: the __main__ guard",
    lede: "`__name__` is `\"__main__\"` in the file you run and the module's name when it's imported. The guard `if __name__ == \"__main__\":` keeps a file's script part from running when another program imports it.",
    focus: "Use `if __name__ == \"__main__\":` so one file can be imported as a module and also run as a program.",
    minutes: 16,
    objectives: [
      "Say what `__name__` holds when a file is run and when it's imported",
      "Put a file's script code (demo calls, printing, reading files) in a `main()` behind the guard",
      "Keep imports free of side effects: no printing, no file reading, no slow work at module level",
    ],
    requires: ["import-module", "module-file", "path-call", "file-open", "encoding-arg", "with-statement", "file-lines", "csv-read", "json-loads", "function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "list-literal", "list-mutate", "dict-literal", "dict-lookup", "string-format", "string-method", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "tuple-literal", "len-call", "membership", "function-default", "list-index", "string-index"],
    teaches: ["dunder-main"],
    blocks: [
      {
        kind: "text",
        md: "Every module has a name in `__name__`. When a file is imported, it's the module's name (`\"report_tool\"`). When a file is the program you ran (`python report_tool.py`), Python sets it to `\"__main__\"`.\n\nThat difference is how one file can be both a library and a script. Definitions go at the top, as usual. The script part, the code that reads files, prints a report or runs a demo, goes in a `main()` function, called only under `if __name__ == \"__main__\":`. Run the file and the report appears; import it and you just get the functions.",
      },
      {
        kind: "example",
        title: "Imported, then run as the main program",
        code: src`
from pathlib import Path
import importlib
import runpy

Path("report_tool.py").write_text('''def summarize(totals):
    return f"{len(totals)} orders, {sum(totals):.2f} total"

def main():
    print("report:", summarize([12.93, 71.14, 142.77]))

print("__name__ is", __name__)
if __name__ == "__main__":
    main()
''', encoding="utf-8")
importlib.invalidate_caches()

import report_tool
print(report_tool.summarize([5, 7.5]))
runpy.run_path("report_tool.py", run_name="__main__")
`,
        output: "__name__ is report_tool\n2 orders, 12.50 total\n__name__ is __main__\nreport: 3 orders, 226.84 total\n",
        note: "Imported, the file's `__name__` is `report_tool` and `main()` doesn't run. `runpy.run_path(..., run_name=\"__main__\")` runs the file the way `python report_tool.py` would, so the guard is true and the report prints. (The `print` of `__name__` is only there to show the value.)",
      },
      {
        kind: "text",
        md: "Without the guard, everything at the top level runs on import. Here a module that prints its own demo is imported by a scheduler, and the demo output lands in the scheduler's log.",
      },
      {
        kind: "example",
        title: "What goes wrong without the guard",
        code: src`
from pathlib import Path
import importlib

Path("labels.py").write_text('''def shelf_label(name, price):
    return f"{name.upper()} ... {price:.2f}"

print(shelf_label("Deluxe Pillow", 47.99))
''', encoding="utf-8")
importlib.invalidate_caches()

print("scheduler starting")
from labels import shelf_label
print(shelf_label("Pro Honey", 5))
`,
        output: "scheduler starting\nDELUXE PILLOW ... 47.99\nPRO HONEY ... 5.00\n",
        note: "The pillow line is labels.py's own test print, running inside a program that only wanted the function. Moving it under the guard fixes that.",
      },
      {
        kind: "text",
        md: "**When to use it:** in every file that can be run directly and might also be imported: utilities, report scripts, data jobs. Tests (see Testing & Code Quality) import your modules too, so a side-effect-free import matters even more later. **Mistakes to avoid:** misspelling the guard (`\"main\"` or `\"__main\"`), putting real work at module level \"just this once\", and calling `main()` unconditionally at the bottom.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Guard the demo",
      prompt: "This file is a `labels` module other programs import, and it has a demo line at the bottom. Running the file should still print the demo label, but importing it must print nothing. Put the demo under the guard. (Check imports the file as `labels`.)",
      spec: [
        ["Function", "`shelf_label(name, price)` → `\"DELUXE PILLOW ... 47.99\"`"],
        ["Run", "prints `DELUXE PILLOW ... 47.99`"],
        ["Import", "prints nothing"],
      ],
      starter: src`
def shelf_label(name, price):
    return f"{name.upper()} ... {price:.2f}"

print(shelf_label("Deluxe Pillow", 47.99))
`,
      answer: src`
def shelf_label(name, price):
    return f"{name.upper()} ... {price:.2f}"

if __name__ == "__main__":
    print(shelf_label("Deluxe Pillow", 47.99))
`,
      wrong: [
        {
          code: src`
def shelf_label(name, price):
    return f"{name.upper()} ... {price:.2f}"
`,
          fails: ["runs"],
          why: "the import is quiet now, but running the file no longer prints the demo",
        },
      ],
      hints: ["The demo line is the only line that runs on import.", "Put it inside an `if` that is true only when the file is the program being run.", "That test compares `__name__` with `\"__main__\"`."],
      task: {
        checks: [
          { kind: "output", id: "runs", label: "running the file prints the demo label", expected: "DELUXE PILLOW ... 47.99\n" },
          {
            kind: "expr",
            id: "quiet",
            label: "importing the file as labels prints nothing",
            show: "import labels  # output while importing",
            expr: importAs("labels", "result = [_out.getvalue(), _m.shelf_label('Pro Honey', 5)]"),
            expected: py.list(py.str(""), py.str("PRO HONEY ... 5.00")),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A stock report that's also a library",
        prompt: "Write this file so it works both ways. As a library it offers `low_stock(rows, limit)`: the SKUs whose `qty` is below `limit`, from rows like `{\"sku\": \"HOM-52782\", \"qty\": \"4\"}` (quantities are text, as from a CSV). As a script, its `main()` reads `stock.csv` (header `sku,qty`) and prints one line per low-stock SKU with limit 5, then a summary line. Importing the file must not read any file or print anything.",
        spec: [
          ["Library", "`low_stock(rows, limit)` → list of SKUs, in order"],
          ["Script output", "for the provided `stock.csv`: `LOW HOM-52782`, `LOW GRO-10442`, then `2 of 4 products below 5`"],
          ["Import", "no output, no file access"],
        ],
        starter: src`
import csv

def low_stock(rows, limit):
    return []

def main():
    pass
`,
        answer: src`
import csv

def low_stock(rows, limit):
    skus = []
    for row in rows:
        if int(row["qty"]) < limit:
            skus.append(row["sku"])
    return skus

def main():
    with open("stock.csv", encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    low = low_stock(rows, 5)
    for sku in low:
        print("LOW", sku)
    print(f"{len(low)} of {len(rows)} products below 5")

if __name__ == "__main__":
    main()
`,
        alternatives: [
          src`
"""Stock checks: import low_stock, or run this file for a report."""
import csv

LIMIT = 5


def low_stock(rows, limit):
    return [row["sku"] for row in rows if int(row["qty"]) < limit]


def main(path="stock.csv"):
    with open(path, encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    found = low_stock(rows, LIMIT)
    for sku in found:
        print(f"LOW {sku}")
    print(len(found), "of", len(rows), "products below", LIMIT)


if __name__ == "__main__":
    main()
`,
        ],
        wrong: [
          {
            code: src`
import csv

def low_stock(rows, limit):
    skus = []
    for row in rows:
        if int(row["qty"]) < limit:
            skus.append(row["sku"])
    return skus

with open("stock.csv", encoding="utf-8", newline="") as source:
    rows = list(csv.DictReader(source))
low = low_stock(rows, 5)
for sku in low:
    print("LOW", sku)
print(f"{len(low)} of {len(rows)} products below 5")
`,
            fails: ["quiet"],
            why: "the report runs on import too, reading stock.csv and printing inside whoever imported it",
          },
          {
            code: src`
import csv

def low_stock(rows, limit):
    skus = []
    for row in rows:
        if row["qty"] < str(limit):
            skus.append(row["sku"])
    return skus

def main():
    with open("stock.csv", encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    low = low_stock(rows, 5)
    for sku in low:
        print("LOW", sku)
    print(f"{len(low)} of {len(rows)} products below 5")

if __name__ == "__main__":
    main()
`,
            fails: ["low", "report"],
            why: "comparing quantities as text puts `12` below `5`",
          },
        ],
        hints: [
          "Write `low_stock` as an ordinary function that converts each quantity before comparing.",
          "Put the file reading and printing in `main()`, using `low_stock` for the work.",
          "Call `main()` only inside the `__main__` guard at the bottom of the file.",
        ],
        task: {
          files: { "stock.csv": "sku,qty\nHOM-52782,4\nBOO-58412,12\nGRO-10442,0\nGRO-63674,5\n" },
          checks: [
            fn("low", "low_stock", [
              example([[{ sku: "HOM-52782", qty: "4" }, { sku: "BOO-58412", qty: "12" }], 5], ["HOM-52782"]),
              example([[], 5], []),
              hiddenCase("a quantity exactly at the limit, and a two-digit one", [[{ sku: "A", qty: "5" }, { sku: "B", qty: "10" }, { sku: "C", qty: "9" }], 10], ["A", "C"]),
            ], { label: "low_stock() finds the SKUs below the limit" }),
            { kind: "output", id: "report", label: "running the file prints the stock report", expected: "LOW HOM-52782\nLOW GRO-10442\n2 of 4 products below 5\n" },
            {
              kind: "expr",
              id: "quiet",
              label: "importing the file prints nothing and reads no file",
              hidden: true,
              expr: importElsewhere("_import_here", "stock_report", "result = [_out.getvalue(), _m.low_stock([{'sku': 'X', 'qty': '1'}], 2)]"),
              expected: py.list(py.str(""), py.list(py.str("X"))),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Don't load data at import time",
        prompt: "This currency module reads `rates.json` at its top level, so importing it from anywhere that file isn't (a test, another folder) crashes with FileNotFoundError. Restructure it: `load_rates(path)` returns the rates dictionary from a JSON file, `convert(amount, currency, rates)` converts US dollars using a rates dictionary it's given, and the demo (load `rates.json`, print `100 USD = 92.00 EUR`) moves into `main()` behind the guard.",
        spec: [
          ["Functions", "`load_rates(path)` → dictionary; `convert(amount, currency, rates)` → `amount * rates[currency]`"],
          ["Script output", "`100 USD = 92.00 EUR` with the provided `rates.json`"],
          ["Import", "works in a folder without `rates.json`, and prints nothing"],
        ],
        starter: src`
import json

with open("rates.json", encoding="utf-8") as source:
    RATES = json.load(source)

def convert(amount, currency):
    return amount * RATES[currency]

print(f"100 USD = {convert(100, 'EUR'):.2f} EUR")
`,
        answer: src`
import json

def load_rates(path):
    with open(path, encoding="utf-8") as source:
        return json.load(source)

def convert(amount, currency, rates):
    return amount * rates[currency]

def main():
    rates = load_rates("rates.json")
    print(f"100 USD = {convert(100, 'EUR', rates):.2f} EUR")

if __name__ == "__main__":
    main()
`,
        alternatives: [
          src`
import json
from pathlib import Path


def load_rates(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def convert(amount, currency, rates):
    rate = rates[currency]
    return amount * rate


def main():
    euros = convert(100, "EUR", load_rates("rates.json"))
    print("100 USD =", f"{euros:.2f}", "EUR")


if __name__ == "__main__":
    main()
`,
        ],
        wrong: [
          {
            code: src`
import json

with open("rates.json", encoding="utf-8") as source:
    RATES = json.load(source)

def load_rates(path):
    with open(path, encoding="utf-8") as source:
        return json.load(source)

def convert(amount, currency, rates):
    return amount * rates[currency]

def main():
    print(f"100 USD = {convert(100, 'EUR', RATES):.2f} EUR")

if __name__ == "__main__":
    main()
`,
            fails: ["portable-import"],
            why: "the file is still read at the top level, so importing it elsewhere still crashes",
          },
          {
            code: src`
import json

def load_rates(path):
    with open(path, encoding="utf-8") as source:
        return json.load(source)

def convert(amount, currency, rates):
    return amount * rates[currency]

def main():
    rates = load_rates("rates.json")
    print(f"100 USD = {convert(100, 'EUR', rates):.2f} EUR")

main()
`,
            fails: ["portable-import"],
            why: "`main()` is called unconditionally, so importing the module still reads rates.json",
          },
        ],
        hints: [
          "Nothing at the top level should touch the file: move the reading into `load_rates(path)`.",
          "`convert` takes the rates as a parameter instead of reading a module-level variable.",
          "The demo goes in `main()`, called only under the `__main__` guard.",
        ],
        task: {
          files: { "rates.json": "{\"EUR\": 0.92, \"GBP\": 0.79}\n", "other_rates.json": "{\"CAD\": 1.36}\n" },
          checks: [
            fn("load", "load_rates", [
              example(["rates.json"], { EUR: 0.92, GBP: 0.79 }),
              hiddenCase("another rates file", ["other_rates.json"], { CAD: 1.36 }),
            ], { label: "load_rates() reads a rates file" }),
            fn("convert", "convert", [
              example([100, "EUR", { EUR: 0.92 }], py.float(92)),
              hiddenCase("rates passed in, not read from a file", [50, "CAD", { CAD: 1.36 }], py.float(68)),
            ], { label: "convert() uses the rates it is given", compare: { numbers: "int-float-equal" } }),
            { kind: "output", id: "demo", label: "running the file prints the demo conversion", expected: "100 USD = 92.00 EUR\n" },
            {
              kind: "expr",
              id: "portable-import",
              label: "the module imports in a folder that has no rates.json, without printing",
              hidden: true,
              expr: importElsewhere("_no_rates", "currency_tools", "result = [_out.getvalue(), _m.convert(10, 'GBP', {'GBP': 0.5})]"),
              expected: py.list(py.str(""), py.float(5)),
              compare: { numbers: "int-float-equal" },
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import Path
import importlib

Path("helper.py").write_text('def name_of_this():\n    return __name__\n\nif __name__ == "__main__":\n    print("helper ran as a program")\n', encoding="utf-8")
importlib.invalidate_caches()

import helper
print(helper.name_of_this(), __name__)
`,
        choices: ["helper __main__", "__main__ __main__", "helper ran as a program\nhelper __main__", "helper helper"],
        answer: 0,
        why: "Inside the imported module, `__name__` is `helper`, so its guard is false. The file you run is `__main__`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a misspelled guard. What does this print when the file is run?",
        program: src`
def main():
    print("report printed")

if __name__ == "main":
    main()
print("done")
`,
        choices: ["done", "report printed\ndone", "report printed", "NameError"],
        answer: 0,
        why: "`__name__` is `\"__main__\"`, with two underscores on each side, so `\"main\"` never matches and the report silently never runs.",
      },
      {
        id: "q3",
        prompt: "Which of these belongs behind `if __name__ == \"__main__\":` rather than at a module's top level?",
        choices: ["Reading today's orders file and printing a report", "`import csv`", "A constant `TAX_RATE = 0.07`", "`def summarize(totals):`"],
        answer: 0,
        why: "Imports, constants and definitions are cheap and side-effect free. Reading files and printing are the script's job and shouldn't happen just because someone imported a function.",
      },
    ],
    review: [
      "`__name__` is the module's name when imported and `\"__main__\"` in the program you run.",
      "Put script work in `main()` and call it under `if __name__ == \"__main__\":`.",
      "An import should only define things: no printing, no file reading, no slow work.",
      "Next: when an import fails, how to find out why.",
    ],
  },

  // ------------------------------------------------------------------ PY-L22-05 ModuleNotFoundError
  {
    id: "PY-L22-05",
    version: 2,
    slug: "a-missing-module",
    title: "When an import fails",
    lede: "ModuleNotFoundError names the module Python couldn't find. Usually it's a typo, a module in another folder, or a package that isn't installed; sometimes it's a dependency of the module you asked for.",
    focus: "Diagnose ModuleNotFoundError from its name and the search path, and handle optional modules without hiding real problems.",
    minutes: 18,
    objectives: [
      "Read `err.name` to see exactly which module is missing, and know where Python looks (`sys.path`)",
      "Check whether a module can be imported with `importlib.util.find_spec`",
      "Treat a missing optional module as \"not available\" while re-raising when one of its own dependencies is missing",
    ],
    requires: ["import-module", "import-alias", "module-file", "package-import", "path-call", "path-glob", "file-open", "encoding-arg", "function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "for-loop", "if-statement", "else-clause", "comparison", "logical", "identity", "none-value", "boolean", "membership", "try-except", "except-type", "except-as", "raise-stmt", "dict-literal", "dict-store", "list-literal", "list-mutate", "list-index", "list-sort", "string-method", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "newline-escape", "arithmetic", "dict-comp", "json-dumps", "string-index"],
    teaches: ["module-missing"],
    blocks: [
      {
        kind: "text",
        md: "`ModuleNotFoundError: No module named 'pricng'` is Python saying it looked everywhere it knows and found no module with that name. Where it looks is the list `sys.path`: first the folder of the program you ran, then the standard library, then the installed packages. The error object's `name` attribute is the exact module that was missing.\n\nThe usual causes, in order: a **typo**; the module is in **another folder** (inside a package, so it needs a dotted name); the package **isn't installed** in the environment you're running (in a real project you'd run `python -m pip install <package>` in the project's virtual environment; this browser runner can only load the packages it ships with); or a file of yours **shadows** a standard module (a `json.py` in your folder is found before the real `json`).",
      },
      {
        kind: "example",
        title: "Which modules can be found?",
        code: src`
import importlib.util
from pathlib import Path

Path("pricing.py").write_text("TAX_RATE = 0.07\n", encoding="utf-8")
importlib.invalidate_caches()

for name in ["json", "pricing", "pricng", "requests"]:
    print(name, importlib.util.find_spec(name) is not None)
`,
        output: "json True\npricing True\npricng False\nrequests False\n",
        note: "`find_spec` answers \"could this be imported?\" without importing it. `pricing` is found in the program's folder; `requests` is a real package, but it isn't installed here, so it can't be found any more than a typo can.",
      },
      {
        kind: "error-example",
        title: "A typo in an import",
        code: src`
import jsom
`,
        error: "ModuleNotFoundError",
        output: "",
        note: "`ModuleNotFoundError: No module named 'jsom'`. Read the quoted name first: it is the module Python looked for, which isn't always the one you wrote (see the next example).",
      },
      {
        kind: "text",
        md: "A module can be missing because **it** doesn't exist, or because something **it imports** doesn't. Code that treats a module as optional (\"use the fast exporter if it's available\") must tell those apart: catch the error, compare `err.name` with the module you asked for, and re-raise anything else, or a broken install is silently reported as \"not available\".",
      },
      {
        kind: "example",
        title: "Optional, but not hiding a broken dependency",
        code: src`
import importlib
from pathlib import Path

Path("fast_export.py").write_text("import polars\n\nFORMAT = 'parquet'\n", encoding="utf-8")
importlib.invalidate_caches()

def optional(name):
    try:
        return importlib.import_module(name)
    except ModuleNotFoundError as err:
        if err.name != name:
            raise
        return None

print(optional("pdf_export"))
try:
    optional("fast_export")
except ModuleNotFoundError as err:
    print("fast_export is installed but needs", err.name)
`,
        output: "None\nfast_export is installed but needs polars\n",
        note: "`pdf_export` doesn't exist, so it's simply not available. `fast_export` exists, but its own `import polars` failed: `err.name` is `polars`, not `fast_export`, so the error is re-raised for someone to fix. `importlib.import_module(name)` is `import` with the module name as text.",
      },
      {
        kind: "text",
        md: "**When to use it:** reading any import error, writing plug-in or optional-feature code, and checking an environment before a long job. **Mistakes to avoid:** catching ModuleNotFoundError (or ImportError) around everything and carrying on, \"fixing\" a path problem by copying files around instead of importing from the package, and naming your files after standard modules.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Fix the import",
      prompt: "`to_json` fails with `ModuleNotFoundError: No module named 'jsom'`. Fix the import.",
      spec: [
        ["Function", "`to_json(record)`"],
        ["Returns", "the record as JSON text"],
      ],
      starter: src`
import jsom

def to_json(record):
    return jsom.dumps(record)

print(to_json({"sku": "HOM-52782", "qty": 4}))
`,
      answer: src`
import json

def to_json(record):
    return json.dumps(record)

print(to_json({"sku": "HOM-52782", "qty": 4}))
`,
      wrong: [
        {
          code: src`
def to_json(record):
    return str(record)
`,
          fails: ["returns"],
          why: "`str` writes Python syntax with single quotes, not JSON",
        },
      ],
      hints: ["Read the quoted name in the error.", "It's a typo of a standard module you've used before.", "Spell both the import and the call `json`."],
      task: {
        checks: [
          fn("returns", "to_json", [
            example([{ sku: "HOM-52782", qty: 4 }], "{\"sku\": \"HOM-52782\", \"qty\": 4}"),
            hiddenCase("a record with true and null", [{ ok: true, note: null }], "{\"ok\": true, \"note\": null}"),
          ], { label: "to_json() returns JSON text" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Check an environment before a job",
        prompt: "A nightly job needs several modules. Write `available(names)`: return a dictionary from each name to `True` if it could be imported and `False` if not, without importing anything. Use `importlib.util.find_spec(name)`, which returns None for a missing module. Careful: for a dotted name whose **package** is missing (`nosuchpkg.tools`), `find_spec` raises ModuleNotFoundError instead of returning None; that name is simply not available. The provided folder has a `pricing` module and a `market` package (with `market.money`).",
        spec: [
          ["Function", "`available(names)`"],
          ["Returns", "a dictionary `{name: True or False}`; `{}` for no names"],
          ["Example", "`available([\"json\", \"pricing\", \"pricng\"])` → `{'json': True, 'pricing': True, 'pricng': False}`"],
        ],
        starter: src`
import importlib.util

def available(names):
    return {}

print(available(["json", "pricing", "pricng"]))
`,
        answer: src`
import importlib.util

def available(names):
    result = {}
    for name in names:
        try:
            result[name] = importlib.util.find_spec(name) is not None
        except ModuleNotFoundError:
            result[name] = False
    return result

print(available(["json", "pricing", "pricng"]))
`,
        alternatives: [
          src`
from importlib.util import find_spec

def can_import(name):
    try:
        return find_spec(name) is not None
    except ModuleNotFoundError:
        return False

def available(names):
    return {name: can_import(name) for name in names}
`,
        ],
        wrong: [
          {
            code: src`
import importlib.util

def available(names):
    result = {}
    for name in names:
        result[name] = importlib.util.find_spec(name) is not None
    return result
`,
            fails: ["returns"],
            why: "a dotted name in a missing package makes `find_spec` raise, which stops the whole check",
          },
          {
            code: src`
import importlib.util

def available(names):
    result = {}
    for name in names:
        top = name.split(".")[0]
        result[name] = importlib.util.find_spec(top) is not None
    return result
`,
            fails: ["returns"],
            why: "checking only the first part says `json.nosuch` exists because `json` does",
          },
        ],
        hints: [
          "Loop over the names and build the dictionary one entry at a time.",
          "`find_spec(name) is not None` is the answer for most names.",
          "Wrap the call in `try`; a ModuleNotFoundError from it means False too.",
        ],
        task: {
          files: { "pricing.py": "TAX_RATE = 0.07\n", ...marketFiles },
          checks: [
            fn("returns", "available", [
              example([["json", "pricing", "pricng"]], { json: true, pricing: true, pricng: false }),
              example([[]], {}),
              example([["market", "market.money", "market.tax"]], { market: true, "market.money": true, "market.tax": false }),
              hiddenCase("a dotted name in a missing package", [["nosuchpkg.tools", "csv"]], { "nosuchpkg.tools": false, csv: true }),
              hiddenCase("a missing module inside a real package", [["json.nosuch", "json.decoder"]], { "json.nosuch": false, "json.decoder": true }),
            ], { label: "available() says which modules can be imported" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Load an export plug-in",
        prompt: "Export formats are plug-ins: modules in the provided `plugins` package, each with a `FORMAT` constant. Some plug-ins need a library that may not be installed. Write `load_plugin(name)`: import the module called `name` (like `\"plugins.csv_export\"`) with `importlib.import_module` and return its `FORMAT`. If the plug-in **itself** doesn't exist (the missing module is `name`, or a package `name` is inside), return `None`. If the plug-in exists but a module **it** imports is missing, let the ModuleNotFoundError propagate so someone installs the dependency.",
        spec: [
          ["Function", "`load_plugin(name)`"],
          ["Returns", "the plug-in's `FORMAT`, or `None` when that plug-in doesn't exist"],
          ["Raises", "ModuleNotFoundError when the plug-in exists but one of its own imports is missing"],
          ["Plug-ins", "`plugins.csv_export` and `plugins.json_export` work; `plugins.parquet_export` imports `pyarrow` and `plugins.xlsx_export` imports `openpyxl`, which aren't installed here"],
          ["Missing-module test", "with `except ModuleNotFoundError as err:`, the plug-in is missing when `err.name == name` or `name.startswith(err.name + \".\")`"],
        ],
        starter: src`
import importlib

def load_plugin(name):
    return None

print(load_plugin("plugins.csv_export"))
print(load_plugin("plugins.pdf_export"))
`,
        answer: src`
import importlib

def load_plugin(name):
    try:
        module = importlib.import_module(name)
    except ModuleNotFoundError as err:
        if err.name == name or name.startswith(err.name + "."):
            return None
        raise
    return module.FORMAT

print(load_plugin("plugins.csv_export"))
print(load_plugin("plugins.pdf_export"))
`,
        alternatives: [
          src`
import importlib

def is_missing_itself(name, missing):
    return missing == name or name.startswith(missing + ".")

def load_plugin(name):
    try:
        plugin = importlib.import_module(name)
    except ModuleNotFoundError as err:
        if not is_missing_itself(name, err.name):
            raise
        plugin = None
    if plugin is None:
        return None
    return plugin.FORMAT
`,
        ],
        wrong: [
          {
            code: src`
import importlib

def load_plugin(name):
    try:
        module = importlib.import_module(name)
    except ModuleNotFoundError:
        return None
    return module.FORMAT
`,
            fails: ["returns"],
            why: "a plug-in with a missing dependency is reported as not existing, so nobody knows to install pyarrow",
          },
          {
            code: src`
import importlib

def load_plugin(name):
    try:
        module = importlib.import_module(name)
    except ModuleNotFoundError as err:
        if err.name == name:
            return None
        raise
    return module.FORMAT
`,
            fails: ["returns"],
            why: "when the whole package is missing, `err.name` is the package, so a missing plug-in raises instead of returning None",
          },
        ],
        hints: [
          "Import with `importlib.import_module(name)` inside a `try`, keeping the error with `as err`.",
          "Return None only when the missing module is the plug-in or a package it's inside; otherwise `raise` the same error again.",
          "If the import worked, the answer is the module's `FORMAT`.",
        ],
        task: {
          files: pluginFiles,
          checks: [
            fn("returns", "load_plugin", [
              example(["plugins.csv_export"], "csv"),
              example(["plugins.pdf_export"], null),
              raisesCase(["plugins.parquet_export"], "ModuleNotFoundError"),
              hiddenCase("another working plug-in", ["plugins.json_export"], "json"),
              raisesCase(["plugins.xlsx_export"], "ModuleNotFoundError", { label: "another plug-in with a missing dependency" }),
              hiddenCase("a plug-in in a package that doesn't exist", ["reports.pdf_export"], null),
            ], { label: "load_plugin() tells missing plug-ins from missing dependencies" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
try:
    import market_tools.pricing
except ModuleNotFoundError as err:
    print(err.name)
`,
        choices: ["market_tools", "market_tools.pricing", "pricing", "No module named 'market_tools.pricing'"],
        answer: 0,
        why: "To import `market_tools.pricing`, Python first needs the package `market_tools`, and that's what is missing. `err.name` is the module that couldn't be found, not the one you wrote.",
      },
      {
        id: "q2",
        prompt: "A common mistake: catching too much. What does this print?",
        program: src`
import importlib

def has_module(name):
    try:
        importlib.import_module(name)
        return True
    except Exception:
        return False

print(has_module("json"), has_module("json.decoder"), has_module(""))
`,
        choices: ["True True False", "True False False", "True True True", "ValueError"],
        answer: 0,
        why: "An empty name is a bug in the calling code (`import_module` raises ValueError: Empty module name), but `except Exception` turns it into a quiet False, exactly like a missing module. Catching ModuleNotFoundError only would have shown the real problem.",
      },
      {
        id: "q3",
        prompt: "A project folder contains your own file `csv.py`. Another file in it runs `import csv` and then fails with `AttributeError: module 'csv' has no attribute 'DictReader'`. Why?",
        choices: ["Python finds your csv.py in the program's folder before the standard library's csv", "The csv module was removed in recent Python versions", "DictReader must be imported with from", "csv can only be imported once"],
        answer: 0,
        why: "The program's own folder comes first in `sys.path`, so your file shadows the standard module. Rename your file (and delete any `__pycache__` next to it).",
      },
    ],
    review: [
      "ModuleNotFoundError's `err.name` is the module Python couldn't find; `sys.path` is where it looked.",
      "Typos, the wrong folder, a missing install and shadowing are the usual causes.",
      "`importlib.util.find_spec` checks without importing; for optional modules, compare `err.name` and re-raise anything else.",
      "Next module: automating real tasks with command-line arguments and files.",
    ],
  },
];
