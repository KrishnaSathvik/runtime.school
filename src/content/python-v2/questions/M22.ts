/**
 * M22 practice: ten independent problems on modules and packages (PY-L22-01 … PY-L22-05).
 *
 * Mix: 4 function implementations, 2 debugging (wrong package imports; a report module with side effects on import),
 * 1 validation (an import-requirements check), 1 data transformation (a packing slip built with a provided package),
 * 1 integration (plug-in discovery that survives missing dependencies) and 1 output prediction. Easy: 02, 03, 06.
 * Medium: 10, 12, 13, 16, 19. Hard: 20, 22.
 *
 * Real files and real imports: provided modules and packages come from `task.files` and are shown in each prompt;
 * where the learner's own file must work as a module, checks save main.py's source as `<name>.py` and import it (in an
 * empty folder when the point is that importing has no side effects). Version 2: every question was replaced.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";
import { importAs, importElsewhere, marketCatalog, marketFiles, marketInit, marketMoney } from "../lessons/M22";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const geoPy = src`
"""Distances on the Earth's surface."""
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_KM = 6371.0


def distance_km(lat1, lon1, lat2, lon2):
    """Great-circle distance between two points, in kilometres."""
    p1, p2 = radians(lat1), radians(lat2)
    dp = p2 - p1
    dl = radians(lon2 - lon1)
    a = sin(dp / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * asin(sqrt(a))
`;

const portlandStores = [
  { name: "Pearl District", lat: 45.529, lon: -122.684 },
  { name: "Hawthorne", lat: 45.5122, lon: -122.629 },
  { name: "St Johns", lat: 45.59, lon: -122.754 },
];

const slipInit = src`
"""Packing-slip helpers."""
from .layout import columns
from .units import to_lb
`;

const slipLayout = src`
"""Fixed-width text layout."""


def columns(left, right, width=30):
    """Left text, then right text ending at column \`width\` (at least one space between them)."""
    gap = width - len(left) - len(right)
    if gap < 1:
        gap = 1
    return left + " " * gap + right
`;

const slipUnits = src`
"""Weight units."""

LB_PER_KG = 2.20462


def to_lb(kg):
    """Kilograms to pounds."""
    return kg * LB_PER_KG
`;

const slipFiles = { "slip/__init__.py": slipInit, "slip/layout.py": slipLayout, "slip/units.py": slipUnits };

const ordersCsv = "order_id,status,total\nO100043,delivered,12.93\nO108024,cancelled,57.34\nO101217,delivered,71.14\n";

const exporterFiles = {
  "exporters/__init__.py": "\"\"\"Export plug-ins: each module has export(rows) -> text.\"\"\"\n",
  "exporters/csv_out.py": src`
import csv
import io


def export(rows):
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["sku", "qty"])
    for row in rows:
        writer.writerow([row["sku"], row["qty"]])
    return out.getvalue()
`,
  "exporters/json_out.py": "import json\n\n\ndef export(rows):\n    return json.dumps(rows)\n",
  "exporters/xml_out.py": "import lxml.etree\n\n\ndef export(rows):\n    return ''\n",
  "exporters/notes.txt": "csv_out and json_out are stable; xml_out needs lxml.\n",
  "reporting/__init__.py": "",
  "reporting/count_out.py": "def export(rows):\n    return f\"{len(rows)} rows\"\n",
  "reporting/sheet_out.py": "from .styles import header_style\n\n\ndef export(rows):\n    return header_style()\n",
  "reporting/xlsx_out.py": "import openpyxl\n\n\ndef export(rows):\n    return ''\n",
};

const shopkitFiles = {
  "shopkit/__init__.py": "from .pricing import price\n",
  "shopkit/money.py": "from decimal import Decimal\n\n\ndef cents(x):\n    return Decimal(x)\n",
  "shopkit/tax.py": "from .money import cents\n\n\ndef rate_for(state):\n    return cents('0.07')\n",
  "shopkit/pricing.py": "from .money import cents\nfrom .tax import rate_for\n\n\ndef price(p):\n    return cents(p)\n",
  "shopkit/report.py": "import csv\nfrom .pricing import price\n",
  "flat/b.py": "X = 1\n",
  "flat/a.py": "Y = 2\n",
  "greek/alpha.py": "from .zeta import Z\n",
  "greek/zeta.py": "Z = 26\n",
  "greek/beta.py": "import json\n",
  "loop/x.py": "from .y import Y\nX = 1\n",
  "loop/y.py": "from .x import X\nY = 2\n",
  "loop/z.py": "Z = 3\n",
  "outside/main_part.py": "from .helpers import h\nfrom .vendor_missing import v\n",
  "outside/helpers.py": "def h():\n    return 1\n",
  "dup/a.py": "from .b import x\nfrom .b import y\n",
  "dup/b.py": "x = 1\ny = 2\n",
  "lazy/main.py": "def run():\n    from .heavy import go\n    return go()\n",
  "lazy/heavy.py": "def go():\n    return 'done'\n",
};

export const m22Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q22-02",
    version: 2,
    slug: "nearest-store",
    title: "The nearest store, using the geo module",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "logical", "identity", "none-value", "dict-lookup", "list-literal", "print-call", "unquoted-name", "top-level-indent", "aggregate-call", "dict-literal", "lambda", "list-index", "membership", "print-several", "string-index"],
    prompt: "The store finder shows a customer their nearest Runtime Market pickup point in Portland. Distances on a map aren't straight-line differences of latitude and longitude, so a provided module, `geo.py`, does the maths. Use it. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"geo.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
    spec: [
      ["Function", "`nearest_store(lat, lon, stores)`"],
      ["stores", "a list of dictionaries with `name`, `lat` and `lon`"],
      ["Returns", "the `name` of the store with the smallest `geo.distance_km`; the first one on a tie; `None` for no stores"],
      ["geo.py", "`distance_km(lat1, lon1, lat2, lon2)` → the great-circle distance between two points, in kilometres"],
    ],
    hiddenKinds: ["a store that looks nearer in degrees but isn't in kilometres", "two stores at the same distance", "no stores"],
    hints: [
      "Import the module (or its function) and call it once per store.",
      "Keep the best name and best distance so far, starting from None.",
      "Replace the best only when a store is strictly nearer, so the first of two equal stores wins.",
    ],
    explanation: "The function walks the stores keeping a running minimum of `distance_km`, which is the great-circle distance. Comparing raw latitude and longitude differences is wrong away from the equator: at Portland's latitude a degree of longitude is only about 78 km while a degree of latitude is about 111 km, so a store can look nearer in degrees and be farther on the ground.",
    code: {
      starter: src`
def nearest_store(lat, lon, stores):
    return None

stores = [
    {"name": "Pearl District", "lat": 45.529, "lon": -122.684},
    {"name": "Hawthorne", "lat": 45.5122, "lon": -122.629},
    {"name": "St Johns", "lat": 45.59, "lon": -122.754},
]
print(nearest_store(45.5231, -122.6765, stores))
`,
      answer: src`
from geo import distance_km

def nearest_store(lat, lon, stores):
    best_name = None
    best_km = None
    for store in stores:
        km = distance_km(lat, lon, store["lat"], store["lon"])
        if best_km is None or km < best_km:
            best_name = store["name"]
            best_km = km
    return best_name

stores = [
    {"name": "Pearl District", "lat": 45.529, "lon": -122.684},
    {"name": "Hawthorne", "lat": 45.5122, "lon": -122.629},
    {"name": "St Johns", "lat": 45.59, "lon": -122.754},
]
print(nearest_store(45.5231, -122.6765, stores))
`,
      alternatives: [
        src`
import geo

def nearest_store(lat, lon, stores):
    if not stores:
        return None
    nearest = min(stores, key=lambda s: geo.distance_km(lat, lon, s["lat"], s["lon"]))
    return nearest["name"]
`,
      ],
      wrong: [
        {
          code: src`
def nearest_store(lat, lon, stores):
    best_name = None
    best = None
    for store in stores:
        degrees = ((store["lat"] - lat) ** 2 + (store["lon"] - lon) ** 2) ** 0.5
        if best is None or degrees < best:
            best_name = store["name"]
            best = degrees
    return best_name
`,
          fails: ["returns"],
          why: "distance in degrees treats a degree of longitude like a degree of latitude, which is wrong at 45° north",
        },
        {
          code: src`
from geo import distance_km

def nearest_store(lat, lon, stores):
    best_name = None
    best_km = None
    for store in stores:
        km = distance_km(lat, lon, store["lat"], store["lon"])
        if best_km is None or km <= best_km:
            best_name = store["name"]
            best_km = km
    return best_name
`,
          fails: ["returns"],
          why: "`<=` lets a later store with the same distance replace the first",
        },
      ],
      task: {
        files: { "geo.py": geoPy },
        checks: [
          fn("returns", "nearest_store", [
            example([45.5231, -122.6765, portlandStores], "Pearl District"),
            example([45.5, -122.62, portlandStores], "Hawthorne"),
            example([45.6, -122.76, portlandStores], "St Johns"),
            hiddenCase("a store that looks nearer in degrees but isn't in kilometres", [45.5, -122.6, [{ name: "North", lat: 45.55, lon: -122.6 }, { name: "East", lat: 45.5, lon: -122.54 }]], "East"),
            hiddenCase("two stores at the same distance", [45.5, -122.6, [{ name: "First", lat: 45.51, lon: -122.6 }, { name: "Second", lat: 45.51, lon: -122.6 }]], "First"),
            hiddenCase("no stores", [45.5, -122.6, []], null),
          ], { label: "nearest_store() finds the closest store with geo.distance_km" }),
        ],
      },
    },
  },
  {
    id: "PY-Q22-03",
    version: 2,
    slug: "fix-the-receipt-imports",
    title: "Fix the receipt line imports",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "package-import", "function-def", "function-param", "function-return", "assignment", "if-statement", "identity", "none-value", "dict-lookup", "string-format", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "logical", "print-several", "print-text", "string-index"],
    prompt: "`receipt_line` should format one line of a receipt using the provided `market` package, but it stops with `ImportError: cannot import name 'line_total' from 'market'`. Fix it. Once the import works, test it with an unknown SKU too. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"market/__init__.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
    spec: [
      ["Function", "`receipt_line(sku, quantity)`"],
      ["Returns", "`\"<name> x<quantity>: <line total>\"`, e.g. `'Deluxe Pillow x2: 95.98'`; for a SKU the catalogue doesn't have, `'unknown SKU <sku>'`"],
      ["market/__init__.py", "`from .catalog import find_product`, so `from market import find_product` works"],
      ["market/catalog.py", "`find_product(sku)` → the product's dictionary (`name`, `price` as text, `category`) or `None`; it knows `HOM-52782` Deluxe Pillow 47.99, `BOO-58412` Nordic Handbook 15.99 and `GRO-63674` Pro Honey 5.00"],
      ["market/money.py", "`cents(amount)` rounds a Decimal or decimal text to the cent, half up; `line_total(price_text, quantity)` → `cents(Decimal(price_text) * quantity)`"],
    ],
    hiddenKinds: ["an unknown SKU", "a quantity of one"],
    hints: [
      "The package's `__init__.py` only offers `find_product`. Where does `line_total` live?",
      "After the import is fixed, the next error names something the file never imported. Is that call needed at all?",
      "`find_product` returns None for an unknown SKU; check for that before reading the product.",
    ],
    explanation: "Three problems. `line_total` isn't re-exported by `market/__init__.py`, so it must come from `market.money`. The f-string calls `money.cents`, but `money` was never imported, and `line_total` already returns cents anyway. And an unknown SKU makes `find_product` return None, so `product['name']` raises TypeError; the contract asks for a message instead.",
    code: {
      starter: src`
from market import line_total
from market.catalog import find_product

def receipt_line(sku, quantity):
    product = find_product(sku)
    return f"{product['name']} x{quantity}: {money.cents(line_total(product['price'], quantity))}"

print(receipt_line("HOM-52782", 2))
`,
      answer: src`
from market.catalog import find_product
from market.money import line_total

def receipt_line(sku, quantity):
    product = find_product(sku)
    if product is None:
        return f"unknown SKU {sku}"
    return f"{product['name']} x{quantity}: {line_total(product['price'], quantity)}"

print(receipt_line("HOM-52782", 2))
`,
      alternatives: [
        src`
import market
from market import money

def receipt_line(sku, quantity):
    product = market.find_product(sku)
    if not product:
        return "unknown SKU " + sku
    amount = money.cents(money.line_total(product["price"], quantity))
    return f"{product['name']} x{quantity}: {amount}"
`,
      ],
      wrong: [
        {
          code: src`
from market.catalog import find_product
from market.money import line_total

def receipt_line(sku, quantity):
    product = find_product(sku)
    return f"{product['name']} x{quantity}: {money.cents(line_total(product['price'], quantity))}"
`,
          fails: ["returns"],
          why: "the import is fixed, but `money` is still an undefined name",
        },
        {
          code: src`
from market.catalog import find_product
from market.money import line_total

def receipt_line(sku, quantity):
    product = find_product(sku)
    return f"{product['name']} x{quantity}: {line_total(product['price'], quantity)}"
`,
          fails: ["returns"],
          why: "known SKUs work, but an unknown SKU still crashes with TypeError",
        },
      ],
      task: {
        files: marketFiles,
        checks: [
          fn("returns", "receipt_line", [
            example(["HOM-52782", 2], "Deluxe Pillow x2: 95.98"),
            example(["GRO-63674", 3], "Pro Honey x3: 15.00"),
            hiddenCase("an unknown SKU", ["TOY-99999", 1], "unknown SKU TOY-99999"),
            hiddenCase("a quantity of one", ["BOO-58412", 1], "Nordic Handbook x1: 15.99"),
          ], { label: "receipt_line() formats one receipt line" }),
        ],
      },
    },
  },
  {
    id: "PY-Q22-06",
    version: 2,
    slug: "a-slugs-module",
    title: "A slugs module for URLs",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "regex-call", "function-def", "function-param", "function-return", "string-method", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "assignment", "else-clause", "for-loop", "if-statement", "list-literal", "list-mutate", "membership", "reassignment", "string-check", "truthiness"],
    prompt: "Product pages need URL-friendly names (\"slugs\"), and the shop, the blog and the sitemap all make them. Write this file as the shared `slugs` module with one function, `slugify(title)`. Check calls it directly and also imports the file as `slugs`.",
    spec: [
      ["Module", "this file, imported as `slugs`"],
      ["Function", "`slugify(title)`: lower case; every run of characters that aren't letters or digits (spaces, punctuation, underscores) becomes one `-`; no `-` at either end"],
      ["Letters", "accented and non-English letters count as letters: `Crème` → `crème`"],
      ["Example", "`slugify('Tea set, \"Royal\" edition')` → `'tea-set-royal-edition'`"],
    ],
    hiddenKinds: ["underscores between words", "a title of only punctuation", "symbols at both ends", "digits inside words"],
    hints: [
      "Lower-case first, then replace runs of separators with one dash.",
      "`\\W` matches anything that isn't a letter, digit or underscore; underscores need adding to the character class: `[\\W_]+`.",
      "`strip(\"-\")` removes dashes left at the ends.",
    ],
    explanation: "`re.sub(r\"[\\W_]+\", \"-\", title.lower())` turns every run of separators into one dash, and `strip(\"-\")` tidies the ends. `\\W` alone treats `_` as a word character, so `snake_case` would keep its underscores; replacing only spaces leaves commas and quotes in the URL.",
    code: {
      starter: src`
import re

def slugify(title):
    return title
`,
      answer: src`
import re

def slugify(title):
    return re.sub(r"[\W_]+", "-", title.lower()).strip("-")
`,
      alternatives: [
        src`
def slugify(title):
    pieces = []
    word = ""
    for ch in title.lower():
        if ch.isalnum():
            word += ch
        elif word:
            pieces.append(word)
            word = ""
    if word:
        pieces.append(word)
    return "-".join(pieces)
`,
      ],
      wrong: [
        {
          code: src`
def slugify(title):
    return title.lower().replace(" ", "-")
`,
          fails: ["returns", "module"],
          why: "only spaces are replaced, so commas, quotes and other symbols end up in the URL",
        },
        {
          code: src`
import re

def slugify(title):
    return re.sub(r"\W+", "-", title.lower()).strip("-")
`,
          fails: ["returns"],
          why: "`\\W` doesn't match underscores, so `snake_case` keeps them",
        },
        {
          code: src`
import re

def slugify(title):
    return re.sub(r"[\W_]+", "-", title.lower())
`,
          fails: ["returns", "module"],
          why: "symbols at the start or end leave a dash there",
        },
      ],
      task: {
        checks: [
          fn("returns", "slugify", [
            example(["Deluxe Pillow"], "deluxe-pillow"),
            example(["Tea set, \"Royal\" edition"], "tea-set-royal-edition"),
            example(["  Crème brûlée kit!  "], "crème-brûlée-kit"),
            hiddenCase("underscores between words", ["snake_case_name"], "snake-case-name"),
            hiddenCase("a title of only punctuation", ["___"], ""),
            hiddenCase("symbols at both ends", ["C++ for 3D-printing!!"], "c-for-3d-printing"),
            hiddenCase("digits inside words", ["Straße 42b"], "straße-42b"),
          ], { label: "slugify() makes a URL-friendly slug" }),
          {
            kind: "expr",
            id: "module",
            label: "imported as slugs, the module's slugify works",
            show: "import slugs; slugs.slugify('Nordic Handbook (2nd ed.)')",
            expr: importAs("slugs", "result = _m.slugify('Nordic Handbook (2nd ed.)')"),
            expected: py.str("nordic-handbook-2nd-ed"),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q22-10",
    version: 2,
    slug: "missing-imports-report",
    title: "Which imports would fail?",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "module-missing", "regex-call", "function-def", "function-param", "function-return", "assignment", "for-loop", "if-statement", "comparison", "logical", "identity", "none-value", "membership", "try-except", "except-type", "string-method", "list-literal", "list-mutate", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "boolean", "comp-if", "hash-in-text", "list-comp", "list-index", "print-several", "print-text", "reassignment", "string-index", "string-split"],
    prompt: "Before a long batch job starts, it checks a list of the modules it will import, one per line, so it fails in a second instead of after an hour. Lines may carry a version requirement and a comment, as in a requirements file. Report the module names that can't be imported here.",
    spec: [
      ["Function", "`missing_imports(lines)`"],
      ["Line format", "a module name (letters, digits, `_` and `.`), optionally followed by a version rule like `>=1.2` or `==2.0`, extras like `[fast]`, spaces, or a `#` comment; blank and comment-only lines are skipped"],
      ["Check", "`importlib.util.find_spec(name)` is None, or raises ModuleNotFoundError (a dotted name whose package is missing)"],
      ["Returns", "the missing names, in order, each once; `[]` when everything can be imported"],
      ["Here", "the folder has a `pricing` module and a `market` package (with `market.money`)"],
    ],
    hiddenKinds: ["a dotted name whose package is missing", "a dotted name inside a local package", "a missing name listed twice", "extras in brackets"],
    hints: [
      "Strip each line and skip it if it's empty or starts with `#`.",
      "The module name is the run of name characters at the start: `re.match(r\"[\\w.]+\", line)`.",
      "`find_spec` can raise for a dotted name: put it in a `try` and treat ModuleNotFoundError as missing.",
    ],
    explanation: "Each line is reduced to its leading module name, so `shiplabel>=1.2  # labels` becomes `shiplabel`. `find_spec` reports a missing module as None without importing anything, but for `nosuchpkg.client` it has to import `nosuchpkg` first and raises ModuleNotFoundError, which also means missing. Passing the whole line to `find_spec` looks for a module literally named `shiplabel>=1.2`.",
    code: {
      starter: src`
import importlib.util
import re

def missing_imports(lines):
    return []

print(missing_imports(["json", "csv  # reading exports", "", "shiplabel>=1.2", "pricing"]))
`,
      answer: src`
import importlib.util
import re

def can_import(name):
    try:
        return importlib.util.find_spec(name) is not None
    except ModuleNotFoundError:
        return False

def missing_imports(lines):
    missing = []
    for line in lines:
        line = line.strip()
        if line == "" or line.startswith("#"):
            continue
        name = re.match(r"[\w.]+", line).group(0)
        if not can_import(name) and name not in missing:
            missing.append(name)
    return missing

print(missing_imports(["json", "csv  # reading exports", "", "shiplabel>=1.2", "pricing"]))
`,
      alternatives: [
        src`
import importlib.util
import re

def importable(name):
    try:
        return importlib.util.find_spec(name) is not None
    except ModuleNotFoundError:
        return False

def missing_imports(lines):
    names = []
    for line in lines:
        name = re.split(r"[^\w.]", line.strip(), maxsplit=1)[0]
        if name and name not in names:
            names.append(name)
    return [name for name in names if not importable(name)]
`,
      ],
      wrong: [
        {
          code: src`
import importlib.util

def missing_imports(lines):
    missing = []
    for line in lines:
        line = line.strip()
        if line == "" or line.startswith("#"):
            continue
        try:
            found = importlib.util.find_spec(line) is not None
        except ModuleNotFoundError:
            found = False
        if not found and line not in missing:
            missing.append(line)
    return missing
`,
          fails: ["returns"],
          why: "the whole line, version rule and comment included, is looked up as a module name",
        },
        {
          code: src`
import importlib.util
import re

def missing_imports(lines):
    missing = []
    for line in lines:
        line = line.strip()
        if line == "" or line.startswith("#"):
            continue
        name = re.match(r"[\w.]+", line).group(0)
        if importlib.util.find_spec(name) is None and name not in missing:
            missing.append(name)
    return missing
`,
          fails: ["returns"],
          why: "a dotted name in a missing package makes `find_spec` raise ModuleNotFoundError, which stops the check",
        },
      ],
      task: {
        files: { "pricing.py": "TAX_RATE = 0.07\n", ...marketFiles },
        checks: [
          fn("returns", "missing_imports", [
            example([["json", "csv  # reading exports", "", "shiplabel>=1.2", "pricing"]], ["shiplabel"]),
            example([["# nothing yet", "   "]], []),
            example([["decimal==1.70", "rateclient ; python_version >= '3.12'", "zoneinfo"]], ["rateclient"]),
            hiddenCase("a dotted name whose package is missing", [["nosuchpkg.client==2", "json"]], ["nosuchpkg.client"]),
            hiddenCase("a dotted name inside a local package", [["market.money", "market.tax"]], ["market.tax"]),
            hiddenCase("a missing name listed twice", [["shiplabel", "shiplabel>=2"]], ["shiplabel"]),
            hiddenCase("extras in brackets", [["csv[fast]", "labelkit[pdf]>=1"]], ["labelkit"]),
          ], { label: "missing_imports() lists the modules that can't be imported" }),
        ],
      },
    },
  },
  {
    id: "PY-Q22-12",
    version: 2,
    slug: "one-module-many-names",
    title: "One module, many names",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["import-module", "import-alias", "module-file", "path-call", "encoding-arg", "assignment", "identity", "print-call", "print-several", "unquoted-name", "newline-escape", "print-text"],
    prompt: "A module is imported three different ways and used through all three names. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "How many times does the module's top-level `print` run?",
      "`from visits import visit, TOTALS` binds names to the objects inside the one module.",
      "All three calls change the same dictionary.",
    ],
    explanation: "The module runs once, on the first import, so `visits loaded` prints once. `visits`, `v` and the names `visit` and `TOTALS` all refer to the same module and the same dictionary, so the three calls add up: two visits to `/home`, one to `/cart`, and `v.TOTALS is TOTALS` is True.",
    predict: {
      program: src`
from pathlib import Path
import importlib

Path("visits.py").write_text('print("visits loaded")\nTOTALS = {}\n\ndef visit(page):\n    TOTALS[page] = TOTALS.get(page, 0) + 1\n    return TOTALS[page]\n', encoding="utf-8")
importlib.invalidate_caches()

import visits
from visits import visit, TOTALS
import visits as v
visit("/home")
v.visit("/home")
visits.visit("/cart")
print(TOTALS, v.TOTALS is TOTALS)
`,
      output: "visits loaded\n{'/home': 2, '/cart': 1} True\n",
      wrongPredictions: ["visits loaded\nvisits loaded\nvisits loaded\n{'/home': 2, '/cart': 1} True", "visits loaded\n{'/home': 1, '/cart': 1} False", "visits loaded\n{} True"],
    },
  },
  {
    id: "PY-Q22-13",
    version: 2,
    slug: "report-runs-twice",
    title: "Why does the nightly report run twice?",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["import-module", "csv-read", "dunder-main", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "dict-lookup", "string-format", "print-call", "unquoted-name", "top-level-indent", "aggregate-call", "len-call", "list-index", "list-literal", "membership", "print-text", "string-index", "string-method"],
    prompt: "This file is the `nightly` module. The scheduler imports it and calls `run_report(\"orders.csv\")` at 02:00, and the log shows the report **twice**, both saying `0 delivered orders, 0.00 total`. A test that imports the module from another folder crashes with FileNotFoundError. Fix both problems; running the file by hand should still print the report once. (The scheduler's job is just `import nightly`, then `nightly.run_report(\"orders.csv\")`.)",
    spec: [
      ["Function", "`run_report(path)`: prints `\"<n> delivered orders, <total, 2 decimals> total\"` and returns n"],
      ["File", "`orders.csv` with columns `order_id,status,total`; statuses are lower case"],
      ["Run as a script", "prints the report for `orders.csv` once"],
      ["Imported", "prints nothing and reads no file"],
    ],
    hiddenKinds: ["importing the module from a folder without orders.csv"],
    hints: [
      "Count how many times `run_report` is called when the scheduler imports this file and then calls it.",
      "The module-level call belongs behind the `__main__` guard.",
      "Compare the status test with the statuses actually in the file, character by character.",
    ],
    explanation: "The last line calls `run_report` at module level, so importing the module runs the report (and reads orders.csv) before the scheduler calls it again: hence two reports, and a crash wherever orders.csv isn't present. Moving the call under `if __name__ == \"__main__\":` fixes that. The zero counts are a separate bug: the file says `delivered`, but the test compares with `Delivered`.",
    code: {
      starter: src`
import csv

def run_report(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "Delivered":
                count += 1
                total += float(row["total"])
    print(f"{count} delivered orders, {total:.2f} total")
    return count

run_report("orders.csv")
`,
      answer: src`
import csv

def run_report(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "delivered":
                count += 1
                total += float(row["total"])
    print(f"{count} delivered orders, {total:.2f} total")
    return count

if __name__ == "__main__":
    run_report("orders.csv")
`,
      alternatives: [
        src`
import csv


def run_report(path):
    with open(path, encoding="utf-8", newline="") as source:
        delivered = [row for row in csv.DictReader(source) if row["status"].lower() == "delivered"]
    total = sum(float(row["total"]) for row in delivered)
    print(f"{len(delivered)} delivered orders, {total:.2f} total")
    return len(delivered)


def main():
    run_report("orders.csv")


if __name__ == "__main__":
    main()
`,
      ],
      wrong: [
        {
          code: src`
import csv

def run_report(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "Delivered":
                count += 1
                total += float(row["total"])
    print(f"{count} delivered orders, {total:.2f} total")
    return count

if __name__ == "__main__":
    run_report("orders.csv")
`,
          fails: ["returns", "script"],
          why: "the double run is fixed, but the status test still never matches, so the report says 0",
        },
        {
          code: src`
import csv

def run_report(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "delivered":
                count += 1
                total += float(row["total"])
    print(f"{count} delivered orders, {total:.2f} total")
    return count

run_report("orders.csv")
`,
          fails: ["quiet-import"],
          why: "the numbers are right, but importing the module still runs the report",
        },
      ],
      task: {
        files: { "orders.csv": ordersCsv },
        checks: [
          fn("returns", "run_report", [
            example(["orders.csv"], 2),
          ], { label: "run_report() counts the delivered orders" }),
          { kind: "output", id: "script", label: "running the file prints the report once", expected: "2 delivered orders, 84.07 total\n" },
          {
            kind: "expr",
            id: "quiet-import",
            label: "importing the module from a folder without orders.csv",
            hidden: true,
            expr: importElsewhere("_scheduler_test", "nightly", "result = _out.getvalue()"),
            expected: py.str(""),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q22-16",
    version: 2,
    slug: "packing-slip-with-a-package",
    title: "A packing slip from the slip package",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "package-import", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "arithmetic", "dict-lookup", "list-literal", "list-mutate", "string-format", "print-call", "unquoted-name", "top-level-indent", "conversion", "dict-literal", "list-index", "membership", "nested-dict", "string-index", "zip-call"],
    prompt: "The warehouse prints fixed-width packing slips. A provided package, `slip`, already knows the layout and the units; turn an order into the lines of its slip using it. Provided files sit next to your program (they aren't editor tabs); `print(Path(\"slip/layout.py\").read_text(encoding=\"utf-8\"))` shows one's source.",
    spec: [
      ["Function", "`packing_slip(order)`"],
      ["order", "a dictionary with `order_id` and `items`, a list of dictionaries with `name`, `quantity` and `weight_kg` (per unit)"],
      ["Returns", "a list of lines: `\"ORDER <order_id>\"`; then for each item `columns(\"<quantity> x <name>\", \"<pounds for the whole line, 1 decimal> lb\")`; then `columns(\"TOTAL WEIGHT\", \"<total pounds, 1 decimal> lb\")`"],
      ["Example", "line 2 for 2 × Deluxe Pillow at 1.12 kg is `'2 x Deluxe Pillow       4.9 lb'`"],
      ["slip/__init__.py", "`from .layout import columns` and `from .units import to_lb`, so `from slip import columns, to_lb` works"],
      ["slip/layout.py", "`columns(left, right, width=30)` → `left`, spaces, then `right` ending at column `width` (always at least one space)"],
      ["slip/units.py", "`to_lb(kg)` → pounds (`kg * 2.20462`)"],
    ],
    hiddenKinds: ["an order with no items", "a name too long for the line", "several units of a light item"],
    hints: [
      "Import `columns` and `to_lb` from the package (its `__init__.py` offers both).",
      "Each item's pounds are `to_lb(weight_kg) * quantity`; keep a running total of the unrounded pounds.",
      "Format with `:.1f` only when building the text, and add the total line after the loop.",
    ],
    explanation: "The package hides the layout rule (right-aligned at column 30, at least one space) and the conversion factor, so the slip code only decides what goes on each line. Forgetting to multiply by the quantity prints the weight of one unit, and padding the text yourself (`ljust`) breaks as soon as a name is longer than expected, which `columns` already handles.",
    code: {
      starter: src`
def packing_slip(order):
    return []

order = {"order_id": "O104839", "items": [
    {"name": "Deluxe Pillow", "quantity": 2, "weight_kg": 1.12},
    {"name": "Pro Honey", "quantity": 3, "weight_kg": 0.56},
]}
for line in packing_slip(order):
    print(line)
`,
      answer: src`
from slip import columns, to_lb

def packing_slip(order):
    lines = [f"ORDER {order['order_id']}"]
    total = 0
    for item in order["items"]:
        pounds = to_lb(item["weight_kg"]) * item["quantity"]
        total += pounds
        lines.append(columns(f"{item['quantity']} x {item['name']}", f"{pounds:.1f} lb"))
    lines.append(columns("TOTAL WEIGHT", f"{total:.1f} lb"))
    return lines

order = {"order_id": "O104839", "items": [
    {"name": "Deluxe Pillow", "quantity": 2, "weight_kg": 1.12},
    {"name": "Pro Honey", "quantity": 3, "weight_kg": 0.56},
]}
for line in packing_slip(order):
    print(line)
`,
      alternatives: [
        src`
import slip.layout
import slip.units

def packing_slip(order):
    weights = [slip.units.to_lb(i["weight_kg"]) * i["quantity"] for i in order["items"]]
    lines = ["ORDER " + order["order_id"]]
    for item, pounds in zip(order["items"], weights):
        lines.append(slip.layout.columns(str(item["quantity"]) + " x " + item["name"], f"{pounds:.1f} lb"))
    lines.append(slip.layout.columns("TOTAL WEIGHT", f"{sum(weights):.1f} lb"))
    return lines
`,
      ],
      wrong: [
        {
          code: src`
from slip import columns, to_lb

def packing_slip(order):
    lines = [f"ORDER {order['order_id']}"]
    total = 0
    for item in order["items"]:
        pounds = to_lb(item["weight_kg"])
        total += pounds
        lines.append(columns(f"{item['quantity']} x {item['name']}", f"{pounds:.1f} lb"))
    lines.append(columns("TOTAL WEIGHT", f"{total:.1f} lb"))
    return lines
`,
          fails: ["returns"],
          why: "the weight of one unit is printed, not the whole line's",
        },
        {
          code: src`
from slip import to_lb

def packing_slip(order):
    lines = [f"ORDER {order['order_id']}"]
    total = 0
    for item in order["items"]:
        pounds = to_lb(item["weight_kg"]) * item["quantity"]
        total += pounds
        lines.append(f"{item['quantity']} x {item['name']}".ljust(24) + f"{pounds:.1f} lb")
    lines.append("TOTAL WEIGHT".ljust(24) + f"{total:.1f} lb")
    return lines
`,
          fails: ["returns"],
          why: "padding by hand doesn't right-align the weights the way the slip layout does",
        },
      ],
      task: {
        files: slipFiles,
        checks: [
          fn("returns", "packing_slip", [
            example([{ order_id: "O104839", items: [{ name: "Deluxe Pillow", quantity: 2, weight_kg: 1.12 }, { name: "Pro Honey", quantity: 3, weight_kg: 0.56 }] }], ["ORDER O104839", "2 x Deluxe Pillow       4.9 lb", "3 x Pro Honey           3.7 lb", "TOTAL WEIGHT            8.6 lb"]),
            example([{ order_id: "O100043", items: [] }], ["ORDER O100043", "TOTAL WEIGHT            0.0 lb"]),
            hiddenCase("a name too long for the line", [{ order_id: "O1", items: [{ name: "Speaker, Organic Bluetooth Edition", quantity: 1, weight_kg: 1.18 }] }], ["ORDER O1", "1 x Speaker, Organic Bluetooth Edition 2.6 lb", "TOTAL WEIGHT            2.6 lb"]),
            hiddenCase("several units of a light item", [{ order_id: "O2", items: [{ name: "Tea Bags", quantity: 12, weight_kg: 0.05 }, { name: "Mug", quantity: 1, weight_kg: 0.35 }] }], ["ORDER O2", "12 x Tea Bags           1.3 lb", "1 x Mug                 0.8 lb", "TOTAL WEIGHT            2.1 lb"]),
          ], { label: "packing_slip() lays out the slip with the package's helpers" }),
        ],
      },
    },
  },
  {
    id: "PY-Q22-19",
    version: 2,
    slug: "summary-tool-with-exit-code",
    title: "A summary tool with an exit status",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "csv-read", "dunder-main", "raise-stmt", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "len-call", "dict-literal", "dict-lookup", "list-literal", "string-format", "print-call", "unquoted-name", "top-level-indent", "function-default", "list-index", "logical", "membership", "print-several", "print-text", "string-index"],
    prompt: "Write this file as `order_summary`, used two ways. Other code imports `summarize(rows)`. The scheduler runs the file and reads its **exit status**: 0 means success, anything else means \"look at this\". `main()` reads `orders.csv`, prints a one-line summary and returns 0, or prints `no orders in orders.csv` and returns 1 when the file has no rows. When run, the file ends with `raise SystemExit(main())`, which ends the program with that status, behind the `__main__` guard.",
    spec: [
      ["Library", "`summarize(rows)` → `{\"orders\": n, \"delivered\": d, \"revenue\": \"<delivered total, 2 decimals>\"}` for rows with `status` and text `total`"],
      ["Script", "`main()` prints `\"<orders> orders, <delivered> delivered, <revenue> revenue\"` and returns 0; with no rows prints `no orders in orders.csv` and returns 1"],
      ["Import", "prints nothing and reads no file"],
    ],
    hiddenKinds: ["no delivered orders", "every order delivered", "a cancelled order with the biggest total", "importing from a folder without orders.csv"],
    hints: [
      "`summarize` only counts and adds; it doesn't read files or print.",
      "`main` reads the CSV into a list of rows, handles the empty case first, then prints from `summarize`'s result.",
      "End the program with SystemExit carrying main's return value, and do it only inside the `__main__` guard, so importing never runs it.",
    ],
    explanation: "Splitting the work into `summarize` (pure, importable, easy to test) and `main` (files, printing, exit status) is the usual shape of a Python tool. `raise SystemExit(main())` turns main's return value into the process exit status that schedulers and shells check. Without the guard, importing the module would read orders.csv, print, and even end the importing program.",
    code: {
      starter: src`
import csv

def summarize(rows):
    return {"orders": 0, "delivered": 0, "revenue": "0.00"}

def main():
    return 0
`,
      answer: src`
import csv

def summarize(rows):
    delivered = 0
    revenue = 0
    for row in rows:
        if row["status"] == "delivered":
            delivered += 1
            revenue += float(row["total"])
    return {"orders": len(rows), "delivered": delivered, "revenue": f"{revenue:.2f}"}

def main():
    with open("orders.csv", encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    if len(rows) == 0:
        print("no orders in orders.csv")
        return 1
    summary = summarize(rows)
    print(f"{summary['orders']} orders, {summary['delivered']} delivered, {summary['revenue']} revenue")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
`,
      alternatives: [
        src`
import csv


def summarize(rows):
    done = [float(r["total"]) for r in rows if r["status"] == "delivered"]
    return {"orders": len(rows), "delivered": len(done), "revenue": f"{sum(done):.2f}"}


def main(path="orders.csv"):
    with open(path, encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    if not rows:
        print("no orders in", path)
        return 1
    s = summarize(rows)
    print(s["orders"], "orders,", s["delivered"], "delivered,", s["revenue"], "revenue")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
`,
      ],
      wrong: [
        {
          code: src`
import csv

def summarize(rows):
    delivered = 0
    revenue = 0
    for row in rows:
        if row["status"] == "delivered":
            delivered += 1
            revenue += float(row["total"])
    return {"orders": len(rows), "delivered": delivered, "revenue": f"{revenue:.2f}"}

def main():
    with open("orders.csv", encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    if len(rows) == 0:
        print("no orders in orders.csv")
        return 1
    summary = summarize(rows)
    print(f"{summary['orders']} orders, {summary['delivered']} delivered, {summary['revenue']} revenue")
    return 0

raise SystemExit(main())
`,
          fails: ["quiet-import"],
          why: "without the guard, importing the module reads orders.csv, prints, and tries to end the importing program",
        },
        {
          code: src`
import csv

def summarize(rows):
    delivered = 0
    revenue = 0
    for row in rows:
        if row["status"] == "delivered":
            delivered += 1
        revenue += float(row["total"])
    return {"orders": len(rows), "delivered": delivered, "revenue": f"{revenue:.2f}"}

def main():
    with open("orders.csv", encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    if len(rows) == 0:
        print("no orders in orders.csv")
        return 1
    summary = summarize(rows)
    print(f"{summary['orders']} orders, {summary['delivered']} delivered, {summary['revenue']} revenue")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
`,
          fails: ["summary", "script"],
          why: "revenue adds every order, including the cancelled one",
        },
      ],
      task: {
        files: { "orders.csv": ordersCsv },
        checks: [
          fn("summary", "summarize", [
            example([[{ status: "delivered", total: "12.93" }, { status: "cancelled", total: "57.34" }, { status: "delivered", total: "71.14" }]], { orders: 3, delivered: 2, revenue: "84.07" }),
            example([[]], { orders: 0, delivered: 0, revenue: "0.00" }),
            hiddenCase("no delivered orders", [[{ status: "returned", total: "20.00" }]], { orders: 1, delivered: 0, revenue: "0.00" }),
            hiddenCase("every order delivered", [[{ status: "delivered", total: "5" }, { status: "delivered", total: "7.5" }]], { orders: 2, delivered: 2, revenue: "12.50" }),
            hiddenCase("a cancelled order with the biggest total", [[{ status: "cancelled", total: "999.99" }, { status: "delivered", total: "0.01" }]], { orders: 2, delivered: 1, revenue: "0.01" }),
          ], { label: "summarize() counts orders and delivered revenue" }),
          fn("main", "main", [
            example([], 0),
          ], { label: "main() returns exit status 0 for a file with orders" }),
          { kind: "output", id: "script", label: "running the file prints the summary", expected: "3 orders, 2 delivered, 84.07 revenue\n" },
          {
            kind: "expr",
            id: "quiet-import",
            label: "importing from a folder without orders.csv",
            hidden: true,
            expr: importElsewhere("_tool_test", "order_summary", "result = [_out.getvalue(), _m.summarize([{'status': 'delivered', 'total': '5'}])]"),
            expected: py.list(py.str(""), py.dict([[py.str("orders"), py.int(1)], [py.str("delivered"), py.int(1)], [py.str("revenue"), py.str("5.00")]])),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q22-20",
    version: 2,
    slug: "run-every-exporter",
    title: "Run every exporter that can load",
    format: "integration",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "module-missing", "package-import", "path-call", "path-glob", "list-sort", "try-except", "except-type", "except-as", "function-def", "function-param", "function-return", "assignment", "for-loop", "if-statement", "comparison", "continue-statement", "dict-literal", "dict-store", "tuple-literal", "string-format", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "else-clause", "identity", "list-index", "list-literal", "list-mutate", "membership", "module-file", "none-value", "print-several", "print-text", "string-index", "tuple-unpack"],
    prompt: "Export formats are plug-ins: every `.py` module in an exporters package (except `__init__.py`) has an `export(rows)` function that returns text. New plug-ins are added by dropping in a file, so the runner must **discover** them, not list them by hand. Some plug-ins need a library that isn't installed; the runner must skip those and say which library is missing, while every other plug-in still runs.",
    spec: [
      ["Function", "`run_exporters(package, rows)`"],
      ["Discover", "the `*.py` files in the folder `package` (other files ignored), excluding `__init__.py`, in sorted order; each is imported as `<package>.<file stem>` with `importlib.import_module`"],
      ["Returns", "`(outputs, skipped)`: `outputs` maps each loaded plug-in's stem to `export(rows)`; `skipped` maps each plug-in that raised ModuleNotFoundError to the missing module's name (`err.name`)"],
      ["Here", "the `exporters` package has `csv_out`, `json_out` and `xml_out` (which imports `lxml`, not installed); a `reporting` package also exists"],
    ],
    hiddenKinds: ["a plug-in whose missing module is a sibling inside the package", "another package with a missing third-party library", "an empty row list"],
    hints: [
      "List the plug-in files with `Path(package).glob(\"*.py\")`, sorted, and skip `__init__.py`.",
      "Import each with `importlib.import_module(package + \".\" + path.stem)` inside a `try`.",
      "On ModuleNotFoundError record `err.name` under the plug-in's stem and move on; otherwise call the module's `export(rows)`.",
    ],
    explanation: "Discovery by file name plus `importlib.import_module` is how many real plug-in systems work. Each import is guarded on its own, so one plug-in with a missing dependency (`lxml`, `openpyxl`, or a sibling module that was never shipped) is reported with exactly what is missing and doesn't stop the others. Recording the plug-in's own name instead of `err.name` loses the one fact an operator needs, and importing `__init__` as a plug-in calls an `export` that doesn't exist.",
    code: {
      starter: src`
import importlib
from pathlib import Path

def run_exporters(package, rows):
    outputs = {}
    skipped = {}
    return (outputs, skipped)

print(run_exporters("exporters", [{"sku": "HOM-52782", "qty": 4}]))
`,
      answer: src`
import importlib
from pathlib import Path

def run_exporters(package, rows):
    outputs = {}
    skipped = {}
    for path in sorted(Path(package).glob("*.py")):
        if path.stem == "__init__":
            continue
        try:
            plugin = importlib.import_module(package + "." + path.stem)
        except ModuleNotFoundError as err:
            skipped[path.stem] = err.name
            continue
        outputs[path.stem] = plugin.export(rows)
    return (outputs, skipped)

print(run_exporters("exporters", [{"sku": "HOM-52782", "qty": 4}]))
`,
      alternatives: [
        src`
import importlib
from pathlib import Path


def load(package, stem):
    try:
        return importlib.import_module(f"{package}.{stem}"), None
    except ModuleNotFoundError as err:
        return None, err.name


def run_exporters(package, rows):
    stems = sorted(p.stem for p in Path(package).glob("*.py") if p.name != "__init__.py")
    outputs, skipped = {}, {}
    for stem in stems:
        module, missing = load(package, stem)
        if module is None:
            skipped[stem] = missing
        else:
            outputs[stem] = module.export(rows)
    return (outputs, skipped)
`,
      ],
      wrong: [
        {
          code: src`
import importlib
from pathlib import Path

def run_exporters(package, rows):
    outputs = {}
    skipped = {}
    for path in sorted(Path(package).glob("*.py")):
        if path.stem == "__init__":
            continue
        try:
            plugin = importlib.import_module(package + "." + path.stem)
        except ModuleNotFoundError:
            skipped[path.stem] = path.stem
            continue
        outputs[path.stem] = plugin.export(rows)
    return (outputs, skipped)
`,
          fails: ["returns"],
          why: "it records the plug-in's own name, not the module that's actually missing",
        },
        {
          code: src`
import importlib
from pathlib import Path

def run_exporters(package, rows):
    outputs = {}
    skipped = {}
    for path in sorted(Path(package).glob("*.py")):
        plugin = importlib.import_module(package + "." + path.stem)
        outputs[path.stem] = plugin.export(rows)
    return (outputs, skipped)
`,
          fails: ["returns"],
          why: "one plug-in with a missing dependency stops every export, and `__init__` is treated as a plug-in",
        },
      ],
      task: {
        files: exporterFiles,
        checks: [
          fn("returns", "run_exporters", [
            example(["exporters", [{ sku: "HOM-52782", qty: 4 }]], py.tuple(pv({ csv_out: "sku,qty\nHOM-52782,4\n", json_out: "[{\"sku\": \"HOM-52782\", \"qty\": 4}]" }), pv({ xml_out: "lxml" }))),
            example(["exporters", []], py.tuple(pv({ csv_out: "sku,qty\n", json_out: "[]" }), pv({ xml_out: "lxml" }))),
            hiddenCase("a plug-in whose missing module is a sibling inside the package, and one missing a library", ["reporting", [{ sku: "A", qty: 1 }, { sku: "B", qty: 2 }]], py.tuple(pv({ count_out: "2 rows" }), pv({ sheet_out: "reporting.styles", xlsx_out: "openpyxl" }))),
          ], { label: "run_exporters() runs every plug-in that loads and reports what the others are missing" }),
        ],
      },
    },
  },
  {
    id: "PY-Q22-22",
    version: 2,
    slug: "module-import-order",
    title: "In which order do a package's modules depend on each other?",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "relative-import", "regex-call", "path-call", "path-glob", "file-open", "encoding-arg", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "while-loop", "if-statement", "comparison", "logical", "membership", "identity", "none-value", "dict-literal", "dict-lookup", "dict-store", "list-literal", "list-mutate", "list-sort", "len-call", "raise-stmt", "string-format", "all-call", "print-call", "unquoted-name", "top-level-indent", "break-statement", "arithmetic", "comp-if", "dict-comp", "dict-iterate", "list-comp", "list-index", "match-case", "module-file", "nested-loop", "precedence", "print-text", "string-index", "truthiness"],
    prompt: "A refactoring tool needs to know which modules of a package depend on which, so it can move them without breaking imports. Read the package's files (without importing them) and put its modules in dependency order: every module after all the sibling modules it imports.",
    spec: [
      ["Function", "`import_order(folder)`"],
      ["Modules", "every `*.py` file in `folder` except `__init__.py`, named by its stem"],
      ["Dependencies", "a line of the form `from .name import …` (leading spaces allowed) means the module depends on sibling `name`; siblings that don't exist and all other imports are ignored"],
      ["Order", "repeatedly place the alphabetically first module whose dependencies are all already placed"],
      ["Returns", "the list of module names in that order"],
      ["Raises", "`ValueError` when some modules can never be placed (an import cycle)"],
    ],
    hiddenKinds: ["an order where alphabetical first isn't ready yet", "an import of a sibling that doesn't exist", "the same sibling imported twice", "an indented import inside a function"],
    hints: [
      "First build a dictionary from each module to the set (or list) of sibling modules it imports, reading each file line by line.",
      "Then loop: among the unplaced modules, in sorted order, find the first whose dependencies are all placed, and place it.",
      "If a pass finds no such module while some are still unplaced, there is a cycle: raise ValueError.",
    ],
    explanation: "This is a topological sort (Kahn's algorithm) with an alphabetical tie-break, which makes the answer unique. Dependencies come from the source text with a regular expression, so nothing is executed; imports of modules outside the folder are dropped because they don't constrain the order. A depth-first order would also respect the dependencies but can place `zeta` before `beta`; the stated rule always picks the alphabetically first ready module. When no module is ready, the remaining ones depend on each other in a cycle.",
    code: {
      starter: src`
import re
from pathlib import Path

def import_order(folder):
    return []

print(import_order("shopkit"))
`,
      answer: src`
import re
from pathlib import Path

def import_order(folder):
    deps = {}
    for path in Path(folder).glob("*.py"):
        if path.stem != "__init__":
            deps[path.stem] = []
    for name in deps:
        with open(Path(folder) / (name + ".py"), encoding="utf-8") as source:
            for line in source:
                match = re.match(r"\s*from \.(\w+) import ", line)
                if match and match.group(1) in deps:
                    deps[name].append(match.group(1))
    order = []
    while len(order) < len(deps):
        ready = None
        for name in sorted(deps):
            if name not in order and all(dep in order for dep in deps[name]):
                ready = name
                break
        if ready is None:
            raise ValueError("import cycle among " + ", ".join(sorted([n for n in deps if n not in order])))
        order.append(ready)
    return order

print(import_order("shopkit"))
`,
      alternatives: [
        src`
import re
from pathlib import Path

PATTERN = re.compile(r"\s*from \.(\w+) import ")

def sibling_imports(path, names):
    found = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = PATTERN.match(line)
        if m and m.group(1) in names:
            found.append(m.group(1))
    return found

def import_order(folder):
    files = {p.stem: p for p in Path(folder).glob("*.py") if p.stem != "__init__"}
    needs = {name: sibling_imports(path, files) for name, path in files.items()}
    placed = []
    remaining = sorted(files)
    while remaining:
        ready = [name for name in remaining if all(d in placed for d in needs[name])]
        if not ready:
            raise ValueError(f"cycle: {remaining}")
        placed.append(ready[0])
        remaining.remove(ready[0])
    return placed
`,
      ],
      wrong: [
        {
          code: src`
import re
from pathlib import Path

def import_order(folder):
    deps = {}
    for path in Path(folder).glob("*.py"):
        if path.stem != "__init__":
            deps[path.stem] = []
    for name in deps:
        with open(Path(folder) / (name + ".py"), encoding="utf-8") as source:
            for line in source:
                match = re.match(r"\s*from \.(\w+) import ", line)
                if match and match.group(1) in deps:
                    deps[name].append(match.group(1))
    order = []
    def visit(name):
        if name in order:
            return
        for dep in sorted(deps[name]):
            visit(dep)
        order.append(name)
    for name in sorted(deps):
        visit(name)
    return order
`,
          fails: ["returns"],
          why: "a depth-first walk places dependencies as soon as they're reached (zeta before beta), and it never notices a cycle",
        },
        {
          code: src`
import re
from pathlib import Path

def import_order(folder):
    deps = {}
    for path in Path(folder).glob("*.py"):
        if path.stem != "__init__":
            deps[path.stem] = []
    for name in deps:
        with open(Path(folder) / (name + ".py"), encoding="utf-8") as source:
            for line in source:
                match = re.match(r"\s*from \.(\w+) import ", line)
                if match:
                    deps[name].append(match.group(1))
    order = []
    while len(order) < len(deps):
        ready = None
        for name in sorted(deps):
            if name not in order and all(dep in order for dep in deps[name]):
                ready = name
                break
        if ready is None:
            raise ValueError("import cycle")
        order.append(ready)
    return order
`,
          fails: ["returns"],
          why: "an import of a sibling that doesn't exist can never be satisfied, so it's reported as a cycle",
        },
      ],
      task: {
        files: shopkitFiles,
        checks: [
          fn("returns", "import_order", [
            example(["shopkit"], ["money", "tax", "pricing", "report"]),
            example(["flat"], ["a", "b"]),
            raisesCase(["loop"], "ValueError"),
            hiddenCase("an order where alphabetical first isn't ready yet", ["greek"], ["beta", "zeta", "alpha"]),
            hiddenCase("an import of a sibling that doesn't exist", ["outside"], ["helpers", "main_part"]),
            hiddenCase("the same sibling imported twice", ["dup"], ["b", "a"]),
            hiddenCase("an indented import inside a function", ["lazy"], ["heavy", "main"]),
          ], { label: "import_order() puts every module after the siblings it imports" }),
        ],
      },
    },
  },
];

function pv(x: Record<string, string>) {
  return py.dict(Object.entries(x).map(([k, v]) => [py.str(k), py.str(v)]));
}
