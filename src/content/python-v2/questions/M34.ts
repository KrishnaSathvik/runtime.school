/**
 * M34 practice: ten independent problems on functional and dynamic Python (PY-L34-01 … PY-L34-05).
 *
 * Mix: 3 function implementations (tidy brand lists without mutation, formatting through a registry, a rule engine
 * with operator lookup), 1 data transformation (a cleaning plan named in settings), 1 integration (checking a call
 * against a function's signature), 1 refactoring (an if/elif chain into a registry), 2 debugging (an impure portion
 * calculator; late-binding lambdas and a check that never runs) and 2 output predictions.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures are real Open Food Facts products (D09: codes, names, brands with stray spaces, nutriments per 100 g).
 * Purity is graded with keepsInput checks; registries by adding entries and calling through them.
 * Version 2: every question was replaced; the old set completed one-line programs about a "mug".
 */
import type { PyQuestion } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, keepsInput, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

function expr(id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string; raises?: string } = {}): PyCheck {
  return {
    kind: "expr",
    id,
    label,
    ...(o.raises ? { expr: code, raises: o.raises } : { expr: code, expected: pv(expected) }),
    ...(o.show ? { show: o.show } : {}),
    ...(o.hidden ? { hidden: true } : {}),
  };
}

const off = (code: string, name: string, brands: string[], grade: string | null, sugars: number, salt: number) => ({ code, product_name: name, brands, nutriscore_grade: grade, nutriments: { sugars_100g: sugars, salt_100g: salt } });
const porridge = off("5010029219494", "Super smooth porridge", ["Weetabix", " Ready break"], "a", 1, 0.03);
const lion = off("7613032192570", "NESTLE LION Céréales 480g", ["Nestlé", " Lion"], "d", 25, 0.49);
const bran = off("20621483", "  Bran Flakes ", ["Crownfield", "Lidl"], "b", 13.2, 0.63);
const unnamed = off("0000000000000", "", [], null, 3, 0.1);
const cocoPops = off("5059319024479", "Coco Pops", ["Kellogg's"], "c", 17, 0.525);

export const m34Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q34-02 output prediction, easy
  {
    id: "PY-Q34-02",
    version: 2,
    slug: "predict-partial-of-partial",
    title: "Predict: a partial of a partial",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "function-def", "function-default", "function-param", "function-return", "identity", "import-module", "partial-call", "print-call", "print-several", "print-text", "reassignment", "string-format", "top-level-indent"],
    prompt: "A partial is built from another partial, then called with extra arguments. Predict exactly what this prints.",
    spec: [["Watch", "which arguments each layer fixes, which call arguments fill the rest, and what the outer partial records"]],
    hiddenKinds: [],
    hints: [
      "`eur` fixes `currency`; `oats_eur` adds the first two positional arguments, `name` and `price`.",
      "A positional argument given at call time goes into the next free parameter, `qty`; a keyword given at call time overrides a fixed keyword.",
      "A partial of a partial is flattened: it points straight at the original function and holds all the fixed arguments.",
    ],
    explanation: "`oats_eur()` runs `price_line(\"Oats\", 2.5, currency=\"EUR\")`, so `qty` takes its default 1. `oats_eur(qty=3)` adds a keyword. `oats_eur(4, currency=\"GBP\")` puts 4 into the next positional slot (`qty`) and overrides the currency. `functools.partial` flattens nested partials, so `.func` is `price_line` itself and `.args` and `.keywords` hold everything fixed so far.",
    predict: {
      program: src`
from functools import partial

def price_line(name, price, qty=1, currency="USD"):
    return f"{name}: {qty} x {price:.2f} {currency}"

eur = partial(price_line, currency="EUR")
oats_eur = partial(eur, "Oats", 2.5)
print(oats_eur())
print(oats_eur(qty=3))
print(oats_eur(4, currency="GBP"))
print(oats_eur.func is price_line, oats_eur.args, oats_eur.keywords)
`,
      output: "Oats: 1 x 2.50 EUR\nOats: 3 x 2.50 EUR\nOats: 4 x 2.50 GBP\nTrue ('Oats', 2.5) {'currency': 'EUR'}\n",
      wrongPredictions: [
        "Oats: 1 x 2.50 EUR\nOats: 3 x 2.50 EUR\nOats: 4 x 2.50 EUR\nTrue ('Oats', 2.5) {'currency': 'EUR'}\n",
        "Oats: 1 x 2.50 EUR\nOats: 3 x 2.50 EUR\nOats: 4 x 2.50 GBP\nFalse ('Oats', 2.5) {}\n",
        "Oats: 1 x 2.50 USD\nOats: 3 x 2.50 USD\nOats: 4 x 2.50 GBP\nTrue ('Oats', 2.5) {'currency': 'EUR'}\n",
      ],
    },
  },

  // ------------------------------------------------------------------ PY-Q34-03 debugging, easy
  {
    id: "PY-Q34-03",
    version: 2,
    slug: "impure-portion-calculator",
    title: "The portion calculator that breaks the product page",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "dict-comp", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "list-mutate", "membership", "precedence", "print-call", "print-several", "string-index", "top-level-indent", "unquoted-name"],
    prompt: "`per_portion(nutriments, grams)` converts per-100 g values to a portion. Two bugs were reported: every 30 g portion shows 0, and after a portion is shown, the product page's per-100 g values are wrong. Fix it so it returns a new dictionary and leaves its argument alone.",
    spec: [
      ["Function", "`per_portion(nutriments, grams)`"],
      ["Returns", "a new dictionary with the same keys, each value `value * grams / 100`"],
      ["Must not", "change `nutriments`"],
    ],
    hiddenKinds: ["a portion over 100 g", "an empty dictionary", "the input after a call"],
    hints: [
      "Try `per_portion({\"sugars_100g\": 25}, 30)` and print the argument afterwards.",
      "`//` is floor division: `30 // 100` is 0.",
      "Build a new dictionary (a comprehension works) instead of assigning into `nutriments`.",
    ],
    explanation: "`grams // 100` rounds down to a whole number, so any portion under 100 g scales everything to 0; `value * grams / 100` keeps the fraction. The loop also wrote the portion values into the caller's dictionary, so the product page, which shows the same dictionary, displayed portion values as per-100 g ones. Returning a new dictionary makes the function pure.",
    code: {
      starter: src`
def per_portion(nutriments, grams):
    for key in nutriments:
        nutriments[key] = nutriments[key] * (grams // 100)
    return nutriments

weetabix = {"sugars_100g": 4.27, "salt_100g": 0.26, "fiber_100g": 10.1}
print(per_portion(weetabix, 30))
print(weetabix)
`,
      answer: src`
def per_portion(nutriments, grams):
    return {key: value * grams / 100 for key, value in nutriments.items()}

weetabix = {"sugars_100g": 4.27, "salt_100g": 0.26, "fiber_100g": 10.1}
print(per_portion(weetabix, 30))
print(weetabix)
`,
      alternatives: [
        src`
def per_portion(nutriments, grams):
    portion = dict(nutriments)
    for key in portion:
        portion[key] = portion[key] / 100 * grams
    return portion
`,
      ],
      wrong: [
        {
          code: src`
def per_portion(nutriments, grams):
    for key in nutriments:
        nutriments[key] = nutriments[key] * grams / 100
    return nutriments
`,
          fails: ["keeps-input"],
          why: "the numbers are right now, but the caller's dictionary is still changed",
        },
        {
          code: src`
def per_portion(nutriments, grams):
    return {key: value * (grams // 100) for key, value in nutriments.items()}
`,
          fails: ["returns"],
          why: "it no longer changes the input, but `//` still makes every portion under 100 g zero",
        },
      ],
      task: {
        checks: [
          fn("returns", "per_portion", [
            example([{ sugars_100g: 25, salt_100g: 0.49 }, 30], { sugars_100g: 7.5, salt_100g: 0.147 }),
            example([{ fiber_100g: 10 }, 40], { fiber_100g: py.float(4) }),
            example([{ sugars_100g: 1 }, 100], { sugars_100g: py.float(1) }),
            hiddenCase("a portion over 100 g", [{ sugars_100g: 32.4 }, 150], { sugars_100g: 48.6 }),
            hiddenCase("an empty dictionary", [{}, 30], {}),
          ], { label: "per_portion() scales each value" }),
          fn("keeps-input", "per_portion", [keepsInput([{ sugars_100g: 25, salt_100g: 0.49 }, 30]), keepsInput([{ sugars_100g: 4.27 }, 45], { label: "the input after a call" })], { label: "per_portion() leaves its argument unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-06 function implementation, easy
  {
    id: "PY-Q34-06",
    version: 2,
    slug: "tidy-brand-lists",
    title: "Tidy brand lists",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "boolean", "continue-statement", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "string-index", "string-method", "top-level-indent"],
    prompt: "Open Food Facts brand lists come with stray spaces, empty entries and the same brand typed twice in different case: `[\"Weetabix\", \" Ready break\", \"weetabix \"]`. Write a pure function `tidy_brands(brands)`: strip each brand, drop empty ones, and keep only the first spelling of brands that are equal ignoring case, in order. Don't change the list you're given.",
    spec: [
      ["Function", "`tidy_brands(brands)`"],
      ["Returns", "a new list, e.g. `[\"Weetabix\", \"Ready break\"]` for the example above"],
      ["Must not", "change `brands`"],
    ],
    hiddenKinds: ["an empty list", "only blank entries", "case-insensitive duplicates", "a brand with inner spaces", "the input after a call"],
    hints: [
      "Strip first, then decide: empty → skip; already seen (in lower case) → skip; otherwise keep.",
      "Remember the lower-cased brands you've kept, in a dictionary or a list.",
      "Append to a new list; never assign into `brands`.",
    ],
    explanation: "Stripping before comparing makes `\" Ready break\"` and `\"Ready break\"` the same brand, and comparing lower-cased versions catches `Weetabix`/`weetabix `. Keeping the first spelling preserves the order people expect. Building a new list keeps the function pure.",
    code: {
      starter: src`
def tidy_brands(brands):
    return brands

print(tidy_brands(["Weetabix", " Ready break", "weetabix "]))
`,
      answer: src`
def tidy_brands(brands):
    tidy = []
    seen = {}
    for brand in brands:
        name = brand.strip()
        if not name or name.lower() in seen:
            continue
        seen[name.lower()] = True
        tidy.append(name)
    return tidy

print(tidy_brands(["Weetabix", " Ready break", "weetabix "]))
`,
      alternatives: [
        src`
def tidy_brands(brands):
    out = []
    for b in [b.strip() for b in brands]:
        if b and b.lower() not in [x.lower() for x in out]:
            out.append(b)
    return out
`,
      ],
      wrong: [
        {
          code: src`
def tidy_brands(brands):
    for i, brand in enumerate(brands):
        brands[i] = brand.strip()
    tidy = []
    for brand in brands:
        if brand and brand.lower() not in [t.lower() for t in tidy]:
            tidy.append(brand)
    return tidy
`,
          fails: ["keeps-input"],
          why: "it strips the brands inside the caller's list",
        },
        {
          code: src`
def tidy_brands(brands):
    tidy = []
    for brand in brands:
        name = brand.strip()
        if name and name not in tidy:
            tidy.append(name)
    return tidy
`,
          fails: ["returns"],
          why: "duplicates that differ only in case are kept",
        },
        {
          code: src`
def tidy_brands(brands):
    return sorted({b.strip() for b in brands if b.strip()})
`,
          fails: ["returns"],
          why: "a set loses the order and keeps different-case duplicates",
        },
      ],
      task: {
        checks: [
          fn("returns", "tidy_brands", [
            example([["Weetabix", " Ready break", "weetabix "]], ["Weetabix", "Ready break"]),
            example([["Nestlé", " Lion"]], ["Nestlé", "Lion"]),
            example([["Crownfield", "Lidl"]], ["Crownfield", "Lidl"]),
            hiddenCase("an empty list", [[]], []),
            hiddenCase("only blank entries", [["", "  ", "\t"]], []),
            hiddenCase("case-insensitive duplicates", [["GENERAL MILLS", "Cheerios", "general mills", "CHEERIOS "]], ["GENERAL MILLS", "Cheerios"]),
            hiddenCase("a brand with inner spaces", [["  Kellogg's  Europe "]], ["Kellogg's  Europe"]),
          ], { label: "tidy_brands() returns clean, unique brands in order" }),
          fn("keeps-input", "tidy_brands", [keepsInput([[" Lidl", "lidl"]]), keepsInput([["Quaker ", ""]], { label: "the input after a call" })], { label: "tidy_brands() leaves its argument unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-10 function implementation, easy
  {
    id: "PY-Q34-10",
    version: 2,
    slug: "format-through-a-registry",
    title: "Format values through a registry",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "conversion", "dict-literal", "except-type", "function-def", "function-param", "function-return", "if-statement", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "string-format", "string-index", "string-method", "top-level-indent", "try-except"],
    prompt: "A product page shows values of different kinds. Write `format_value(value, kind)` using a dictionary from kind to a formatting function, not an if/elif chain: `\"grams\"` → `\"13.2 g\"`, `\"kcal\"` → `\"363 kcal\"` (rounded to a whole number), `\"percent\"` → `\"27.8%\"` (one decimal), `\"grade\"` → `\"Nutri-Score B\"`. An unknown kind raises `ValueError`.",
    spec: [
      ["Function", "`format_value(value, kind)`"],
      ["grams", "the number as Python prints it, then ` g`"],
      ["kcal", "rounded to a whole number, then ` kcal`"],
      ["percent", "one decimal place, then `%`"],
      ["grade", "`Nutri-Score ` and the letter in capitals"],
    ],
    hiddenKinds: ["a whole number of grams", "kcal that round up", "a grade already in capitals", "an unknown kind"],
    hints: [
      "Write one small function per kind.",
      "Put them in a dictionary keyed by kind, and look the kind up in `format_value`.",
      "f-string formats help: `{value:.1f}` for one decimal, `{value:.0f}` for a whole number.",
    ],
    explanation: "Each kind is a small function in a dictionary, so adding a kind is one entry and `format_value` itself never changes. Looking the kind up and raising a ValueError for a missing key gives a clear message instead of a bare KeyError.",
    code: {
      starter: src`
def format_value(value, kind):
    return str(value)

print(format_value(13.2, "grams"), format_value(363.4, "kcal"), format_value("b", "grade"))
`,
      answer: src`
def grams(value):
    return f"{value} g"

def kcal(value):
    return f"{value:.0f} kcal"

def percent(value):
    return f"{value:.1f}%"

def grade(value):
    return "Nutri-Score " + value.upper()

FORMATTERS = {"grams": grams, "kcal": kcal, "percent": percent, "grade": grade}

def format_value(value, kind):
    if kind not in FORMATTERS:
        raise ValueError(f"unknown kind: {kind}")
    return FORMATTERS[kind](value)

print(format_value(13.2, "grams"), format_value(363.4, "kcal"), format_value("b", "grade"))
`,
      alternatives: [
        src`
FORMATS = {
    "grams": "{} g".format,
    "kcal": "{:.0f} kcal".format,
    "percent": "{:.1f}%".format,
}

def format_value(value, kind):
    if kind == "grade":
        return "Nutri-Score " + value.upper()
    try:
        return FORMATS[kind](value)
    except KeyError:
        raise ValueError(kind) from None
`,
      ],
      wrong: [
        {
          code: src`
FORMATTERS = {
    "grams": lambda v: f"{v} g",
    "kcal": lambda v: f"{v} kcal",
    "percent": lambda v: f"{v:.1f}%",
    "grade": lambda v: "Nutri-Score " + v.upper(),
}

def format_value(value, kind):
    if kind not in FORMATTERS:
        raise ValueError(kind)
    return FORMATTERS[kind](value)
`,
          fails: ["returns"],
          why: "kcal isn't rounded to a whole number",
        },
        {
          code: src`
FORMATTERS = {
    "grams": lambda v: f"{v} g",
    "kcal": lambda v: f"{v:.0f} kcal",
    "percent": lambda v: f"{v:.1f}%",
    "grade": lambda v: "Nutri-Score " + v.upper(),
}

def format_value(value, kind):
    return FORMATTERS[kind](value)
`,
          fails: ["unknown"],
          why: "an unknown kind raises KeyError instead of ValueError",
        },
      ],
      task: {
        checks: [
          fn("returns", "format_value", [
            example([13.2, "grams"], "13.2 g"),
            example([363.4, "kcal"], "363 kcal"),
            example([27.777, "percent"], "27.8%"),
            example(["b", "grade"], "Nutri-Score B"),
            hiddenCase("a whole number of grams", [10, "grams"], "10 g"),
            hiddenCase("kcal that round up", [409.6, "kcal"], "410 kcal"),
            hiddenCase("a grade already in capitals", ["D", "grade"], "Nutri-Score D"),
          ], { label: "format_value() formats each kind" }),
          fn("unknown", "format_value", [raisesCase([1, "ounces"], "ValueError", { label: "an unknown kind" })], { label: "unknown kinds raise ValueError" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-12 data transformation, medium
  {
    id: "PY-Q34-12",
    version: 2,
    slug: "cleaning-plan-from-settings",
    title: "A cleaning plan named in settings",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comp-if", "dict-comp", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "star-kwargs", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness"],
    prompt: "A product import is cleaned by steps chosen in a settings file. The starter has the step functions and a `STEPS` registry. Write `clean_products(products, plan)`: check every name in `plan` first (unknown → `ValueError` naming it), then apply the steps in order to the list. Every step returns a new list, so the products you were given must not change.",
    spec: [
      ["Function", "`clean_products(products, plan)`"],
      ["plan", "a list of step names, e.g. `[\"drop_unnamed\", \"strip_names\", \"graded_only\"]`"],
      ["STEPS", "`drop_unnamed`, `strip_names`, `tidy_brands`, `graded_only` (in the starter)"],
      ["Returns", "the cleaned list; an empty plan returns the products as they are (a new list)"],
    ],
    hiddenKinds: ["an unknown step", "an empty plan", "a different order", "the input after cleaning"],
    hints: [
      "Validate the whole plan before running anything, so a typo can't half-clean the data.",
      "Then feed the list through `STEPS[name]` for each name in order (a loop or `functools.reduce`).",
      "Return a new list even for an empty plan, for example `list(products)`.",
    ],
    explanation: "Checking the plan up front means a typo in the settings fails immediately with a clear message instead of after some steps ran. Applying registry functions in order is a pipeline (PY-L34-03) chosen from data (PY-L34-05). Because the steps return new lists and dictionaries, the caller's products stay as they were.",
    code: {
      starter: src`
def drop_unnamed(products):
    return [p for p in products if p["product_name"].strip()]

def strip_names(products):
    return [{**p, "product_name": p["product_name"].strip()} for p in products]

def tidy_brands(products):
    return [{**p, "brands": [b.strip() for b in p["brands"] if b.strip()]} for p in products]

def graded_only(products):
    return [p for p in products if p["nutriscore_grade"]]

STEPS = {"drop_unnamed": drop_unnamed, "strip_names": strip_names, "tidy_brands": tidy_brands, "graded_only": graded_only}

def clean_products(products, plan):
    return products

products = [
    {"code": "20621483", "product_name": "  Bran Flakes ", "brands": ["Crownfield", "Lidl"], "nutriscore_grade": "b"},
    {"code": "0000000000000", "product_name": "", "brands": [], "nutriscore_grade": None},
]
print(clean_products(products, ["drop_unnamed", "strip_names"]))
`,
      answer: src`
def drop_unnamed(products):
    return [p for p in products if p["product_name"].strip()]

def strip_names(products):
    return [{**p, "product_name": p["product_name"].strip()} for p in products]

def tidy_brands(products):
    return [{**p, "brands": [b.strip() for b in p["brands"] if b.strip()]} for p in products]

def graded_only(products):
    return [p for p in products if p["nutriscore_grade"]]

STEPS = {"drop_unnamed": drop_unnamed, "strip_names": strip_names, "tidy_brands": tidy_brands, "graded_only": graded_only}

def clean_products(products, plan):
    for name in plan:
        if name not in STEPS:
            raise ValueError(f"unknown step: {name}")
    cleaned = list(products)
    for name in plan:
        cleaned = STEPS[name](cleaned)
    return cleaned

products = [
    {"code": "20621483", "product_name": "  Bran Flakes ", "brands": ["Crownfield", "Lidl"], "nutriscore_grade": "b"},
    {"code": "0000000000000", "product_name": "", "brands": [], "nutriscore_grade": None},
]
print(clean_products(products, ["drop_unnamed", "strip_names"]))
`,
      alternatives: [
        src`
from functools import reduce

def drop_unnamed(products):
    return [p for p in products if p["product_name"].strip()]

def strip_names(products):
    return [{**p, "product_name": p["product_name"].strip()} for p in products]

def tidy_brands(products):
    return [{**p, "brands": [b.strip() for b in p["brands"] if b.strip()]} for p in products]

def graded_only(products):
    return [p for p in products if p["nutriscore_grade"]]

STEPS = {"drop_unnamed": drop_unnamed, "strip_names": strip_names, "tidy_brands": tidy_brands, "graded_only": graded_only}

def clean_products(products, plan):
    missing = [name for name in plan if name not in STEPS]
    if missing:
        raise ValueError("unknown step: " + missing[0])
    return reduce(lambda rows, name: STEPS[name](rows), plan, list(products))
`,
      ],
      wrong: [
        {
          code: src`
def drop_unnamed(products):
    return [p for p in products if p["product_name"].strip()]

def strip_names(products):
    for p in products:
        p["product_name"] = p["product_name"].strip()
    return products

def tidy_brands(products):
    return [{**p, "brands": [b.strip() for b in p["brands"] if b.strip()]} for p in products]

def graded_only(products):
    return [p for p in products if p["nutriscore_grade"]]

STEPS = {"drop_unnamed": drop_unnamed, "strip_names": strip_names, "tidy_brands": tidy_brands, "graded_only": graded_only}

def clean_products(products, plan):
    for name in plan:
        if name not in STEPS:
            raise ValueError(name)
    for name in plan:
        products = STEPS[name](products)
    return products
`,
          fails: ["keeps-input"],
          why: "rewriting `strip_names` to change the products in place makes the cleaning change the caller's data",
        },
        {
          code: src`
def drop_unnamed(products):
    return [p for p in products if p["product_name"].strip()]

def strip_names(products):
    return [{**p, "product_name": p["product_name"].strip()} for p in products]

def tidy_brands(products):
    return [{**p, "brands": [b.strip() for b in p["brands"] if b.strip()]} for p in products]

def graded_only(products):
    return [p for p in products if p["nutriscore_grade"]]

STEPS = {"drop_unnamed": drop_unnamed, "strip_names": strip_names, "tidy_brands": tidy_brands, "graded_only": graded_only}

def clean_products(products, plan):
    cleaned = list(products)
    for name in plan:
        if name in STEPS:
            cleaned = STEPS[name](cleaned)
    return cleaned
`,
          fails: ["unknown"],
          why: "unknown step names are silently skipped",
        },
      ],
      task: {
        checks: [
          fn("returns", "clean_products", [
            example([[bran, unnamed], ["drop_unnamed", "strip_names"]], [{ ...bran, product_name: "Bran Flakes" }]),
            example([[porridge, lion], ["tidy_brands"]], [{ ...porridge, brands: ["Weetabix", "Ready break"] }, { ...lion, brands: ["Nestlé", "Lion"] }]),
            example([[unnamed, cocoPops], ["graded_only"]], [cocoPops]),
            hiddenCase("an empty plan", [[bran], []], [bran]),
            hiddenCase("a different order", [[unnamed, bran, lion], ["graded_only", "strip_names", "tidy_brands"]], [{ ...bran, product_name: "Bran Flakes" }, { ...lion, brands: ["Nestlé", "Lion"] }]),
          ], { label: "clean_products() applies the planned steps in order" }),
          fn("unknown", "clean_products", [raisesCase([[bran], ["strip_names", "shout"]], "ValueError", { label: "an unknown step" })], { label: "an unknown step raises ValueError" }),
          fn("keeps-input", "clean_products", [keepsInput([[bran, porridge], ["strip_names", "tidy_brands"]], { label: "the input after cleaning" })], { label: "clean_products() leaves its input unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-13 debugging, medium
  {
    id: "PY-Q34-13",
    version: 2,
    slug: "checks-built-in-a-loop",
    title: "Nutrient checks built in a loop",
    format: "debugging",
    difficulty: "medium",
    minutes: 14,
    requires: ["assignment", "comp-if", "comparison", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "import-module", "lambda", "list-comp", "list-mutate", "membership", "nested-dict", "partial-call", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    prompt: "`make_checks(limits)` builds one check function per nutrient, and `flags(product, checks)` lists the nutrients a product is over. Every product is flagged for every nutrient, and when that is fixed, the checks all compare against the last nutrient in `limits`. Fix both bugs.",
    spec: [
      ["make_checks(limits)", "returns `{nutrient: function(product) -> bool}`, true when the product's value is over that nutrient's limit"],
      ["flags(product, checks)", "the names of the checks that are true for the product, in order"],
      ["Missing values", "a missing nutrient is not over the limit"],
    ],
    hiddenKinds: ["three nutrients", "a product under every limit", "a missing nutrient"],
    hints: [
      "Print `flags(...)` for a product that should pass everything. What does `if check` test?",
      "A function object is always true; the check has to be *called* with the product.",
      "Each lambda looks up `nutrient` and `limit` when it runs, after the loop ended. Bind them when each function is made: `functools.partial`, or default arguments.",
    ],
    explanation: "`if check` tests the function object, which is always true, so every name was flagged; `check(product)` runs it. The lambdas in the loop read `nutrient` and `limit` when called, and by then the loop has left them at the last item. Building each check with `partial(over_limit, nutrient=nutrient, limit=limit)` (or `lambda p, n=nutrient, l=limit: ...`) stores the values at creation time.",
    code: {
      starter: src`
def make_checks(limits):
    checks = {}
    for nutrient, limit in limits.items():
        checks[nutrient] = lambda product: product["nutriments"].get(nutrient, 0) > limit
    return checks

def flags(product, checks):
    return [name for name, check in checks.items() if check]

checks = make_checks({"sugars_100g": 22.5, "salt_100g": 1.5})
print(flags({"nutriments": {"sugars_100g": 25, "salt_100g": 0.49}}, checks))
`,
      answer: src`
from functools import partial

def over_limit(product, nutrient, limit):
    return product["nutriments"].get(nutrient, 0) > limit

def make_checks(limits):
    checks = {}
    for nutrient, limit in limits.items():
        checks[nutrient] = partial(over_limit, nutrient=nutrient, limit=limit)
    return checks

def flags(product, checks):
    return [name for name, check in checks.items() if check(product)]

checks = make_checks({"sugars_100g": 22.5, "salt_100g": 1.5})
print(flags({"nutriments": {"sugars_100g": 25, "salt_100g": 0.49}}, checks))
`,
      alternatives: [
        src`
def make_checks(limits):
    checks = {}
    for nutrient, limit in limits.items():
        checks[nutrient] = lambda product, n=nutrient, l=limit: product["nutriments"].get(n, 0) > l
    return checks

def flags(product, checks):
    return [name for name in checks if checks[name](product)]
`,
      ],
      wrong: [
        {
          code: src`
def make_checks(limits):
    checks = {}
    for nutrient, limit in limits.items():
        checks[nutrient] = lambda product: product["nutriments"].get(nutrient, 0) > limit
    return checks

def flags(product, checks):
    return [name for name, check in checks.items() if check(product)]
`,
          fails: ["returns", "salty", "three"],
          why: "the checks are called now, but they all use the last nutrient and limit",
        },
        {
          code: src`
from functools import partial

def over_limit(product, nutrient, limit):
    return product["nutriments"].get(nutrient, 0) > limit

def make_checks(limits):
    return {n: partial(over_limit, nutrient=n, limit=l) for n, l in limits.items()}

def flags(product, checks):
    return [name for name, check in checks.items() if check]
`,
          fails: ["returns", "salty", "three", "none", "missing"],
          why: "each check now has its own limit, but `flags` still never calls them",
        },
      ],
      task: {
        checks: [
          expr("returns", "a sugary cereal is flagged for sugar only", "result = flags({'nutriments': {'sugars_100g': 25, 'salt_100g': 0.49}}, make_checks({'sugars_100g': 22.5, 'salt_100g': 1.5}))", ["sugars_100g"], { show: "flags(lion_cereal, make_checks({'sugars_100g': 22.5, 'salt_100g': 1.5}))" }),
          expr("salty", "a salty cereal is flagged for salt only", "result = flags({'nutriments': {'sugars_100g': 10.71, 'salt_100g': 1.785}}, make_checks({'sugars_100g': 22.5, 'salt_100g': 1.5}))", ["salt_100g"], { show: "flags(corn_flakes, checks)" }),
          expr("three", "three nutrients", "result = flags({'nutriments': {'sugars_100g': 32.4, 'salt_100g': 1.42, 'fat_100g': 18}}, make_checks({'sugars_100g': 22.5, 'fat_100g': 17.5, 'salt_100g': 1.5}))", ["sugars_100g", "fat_100g"], { hidden: true }),
          expr("none", "a product under every limit", "result = flags({'nutriments': {'sugars_100g': 1, 'salt_100g': 0.03}}, make_checks({'sugars_100g': 22.5, 'salt_100g': 1.5}))", [], { hidden: true }),
          expr("missing", "a missing nutrient", "result = flags({'nutriments': {'sugars_100g': 5}}, make_checks({'salt_100g': 1.5}))", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-16 integration, medium
  {
    id: "PY-Q34-16",
    version: 2,
    slug: "check-a-call-against-a-signature",
    title: "Check a plugin call before making it",
    format: "integration",
    difficulty: "medium",
    minutes: 15,
    requires: ["any-call", "arithmetic", "assignment", "boolean", "comp-if", "continue-statement", "dict-iterate", "dict-literal", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "keyword-only", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "print-call", "print-several", "print-text", "reassignment", "star-kwargs", "string-format", "string-index", "top-level-indent", "try-except"],
    prompt: "A report runs plugin functions with keyword arguments taken from a settings file. Before running anything, it wants a list of problems. Write `call_problems(func, kwargs)`: return a sorted list of `\"missing: <name>\"` for required parameters not in `kwargs` (positional-or-keyword or keyword-only, without a default) and `\"unexpected: <name>\"` for keys the function doesn't accept. A function with `**kwargs` accepts any key.",
    spec: [
      ["Function", "`call_problems(func, kwargs)`"],
      ["Returns", "a sorted list of problem texts; `[]` when the call would work"],
      ["Tools", "`inspect.signature(func).parameters`, each parameter's `kind` and `default`"],
    ],
    hiddenKinds: ["a function that takes **kwargs", "a keyword-only required parameter", "both missing and unexpected names", "*args is never required"],
    hints: [
      "Walk the parameters once: note which names can be passed by keyword, and which of them are required.",
      "Required means no default and not a `*args`/`**kwargs` collector; a `**kwargs` parameter means nothing is unexpected.",
      "Build both kinds of message and return `sorted(...)` of them together.",
    ],
    explanation: "`inspect.signature` describes exactly what a call can supply. Parameters without a default (other than the `*args` and `**kwargs` collectors) must be present; keyword arguments must match a parameter name unless the function has `**kwargs`. Positional-only parameters can't be given by keyword at all, so they count as missing if required. Checking up front turns a TypeError halfway through a report into a clear list of setting mistakes.",
    code: {
      starter: src`
import inspect

def call_problems(func, kwargs):
    return []

def sugar_report(products, limit, *, currency="USD"):
    return len(products)

print(call_problems(sugar_report, {"limit": 22.5, "colour": "red"}))
`,
      answer: src`
import inspect

def call_problems(func, kwargs):
    problems = []
    accepts_any = False
    names = []
    for name, param in inspect.signature(func).parameters.items():
        if param.kind is param.VAR_KEYWORD:
            accepts_any = True
            continue
        if param.kind is param.VAR_POSITIONAL:
            continue
        if param.kind is not param.POSITIONAL_ONLY:
            names.append(name)
        if param.default is param.empty and (param.kind is param.POSITIONAL_ONLY or name not in kwargs):
            problems.append(f"missing: {name}")
    if not accepts_any:
        problems += [f"unexpected: {key}" for key in kwargs if key not in names]
    return sorted(problems)

def sugar_report(products, limit, *, currency="USD"):
    return len(products)

print(call_problems(sugar_report, {"limit": 22.5, "colour": "red"}))
`,
      alternatives: [
        src`
import inspect

def call_problems(func, kwargs):
    try:
        inspect.signature(func).bind(**kwargs)
        return []
    except TypeError:
        pass
    params = inspect.signature(func).parameters.values()
    kinds = inspect.Parameter
    open_ended = any([p.kind is kinds.VAR_KEYWORD for p in params])
    known = [p.name for p in params if p.kind in (kinds.POSITIONAL_OR_KEYWORD, kinds.KEYWORD_ONLY)]
    out = [f"missing: {p.name}" for p in params if p.default is kinds.empty and p.kind not in (kinds.VAR_POSITIONAL, kinds.VAR_KEYWORD) and (p.name not in kwargs or p.kind is kinds.POSITIONAL_ONLY)]
    if not open_ended:
        out += [f"unexpected: {k}" for k in kwargs if k not in known]
    return sorted(out)
`,
      ],
      wrong: [
        {
          code: src`
import inspect

def call_problems(func, kwargs):
    params = inspect.signature(func).parameters
    problems = [f"missing: {n}" for n, p in params.items() if p.default is p.empty and n not in kwargs]
    problems += [f"unexpected: {k}" for k in kwargs if k not in params]
    return sorted(problems)
`,
          fails: ["any-key", "star-args"],
          why: "`**options` and `*args` are treated as ordinary parameters: reported as missing, and extra keys as unexpected",
        },
        {
          code: src`
import inspect

def call_problems(func, kwargs):
    problems = []
    for name, param in inspect.signature(func).parameters.items():
        if param.kind is param.POSITIONAL_OR_KEYWORD and param.default is param.empty and name not in kwargs:
            problems.append(f"missing: {name}")
    return sorted(problems)
`,
          fails: ["returns", "keyword-only", "both"],
          why: "unexpected keys and required keyword-only parameters are never reported",
        },
      ],
      task: {
        checks: [
          expr("returns", "a missing parameter and an unexpected key", "def _sugar_report(products, limit, *, currency='USD'):\n    return 0\nresult = call_problems(_sugar_report, {'limit': 22.5, 'colour': 'red'})", ["missing: products", "unexpected: colour"], { show: "call_problems(sugar_report, {'limit': 22.5, 'colour': 'red'})" }),
          expr("fine", "a call that would work", "def _r(products, limit=1):\n    return 0\nresult = call_problems(_r, {'products': []})", [], { show: "call_problems(report, {'products': []})" }),
          expr("any-key", "a function that takes **kwargs", "def _export(path, **options):\n    return path\nresult = call_problems(_export, {'path': 'a.csv', 'delimiter': ';', 'encoding': 'utf-8'})", [], { hidden: true }),
          expr("keyword-only", "a keyword-only required parameter", "def _fetch(url, *, timeout):\n    return url\nresult = call_problems(_fetch, {'url': 'https://api.openalex.org/works'})", ["missing: timeout"], { hidden: true }),
          expr("both", "both missing and unexpected names", "def _rank(works, *, by, descending=True):\n    return works\nresult = call_problems(_rank, {'sort': 'year', 'limit': 5})", ["missing: by", "missing: works", "unexpected: limit", "unexpected: sort"], { hidden: true }),
          expr("star-args", "*args is never required", "def _merge(*paths, out):\n    return out\nresult = call_problems(_merge, {'out': 'all.csv'})", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-19 refactoring, medium
  {
    id: "PY-Q34-19",
    version: 2,
    slug: "unit-conversions-registry",
    title: "From an if/elif chain to a registry",
    format: "refactoring",
    difficulty: "medium",
    minutes: 14,
    requires: ["arithmetic", "assignment", "comparison", "dict-get", "dict-literal", "else-clause", "function-def", "function-param", "function-return", "identity", "if-statement", "lambda", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "string-format", "string-index", "top-level-indent"],
    prompt: "`to_base(value, unit)` converts food label amounts to grams or kilocalories with a growing if/elif chain. Refactor it so the conversions live in a dictionary `CONVERSIONS` from unit to a function, and `to_base` only looks the unit up. Behaviour must stay exactly the same, including the ValueError for an unknown unit, and a unit added to `CONVERSIONS` later must work without changing `to_base`.",
    spec: [
      ["Function", "`to_base(value, unit)`, same results as the original"],
      ["CONVERSIONS", "a dictionary from unit (`\"g\"`, `\"kg\"`, `\"mg\"`, `\"oz\"`, `\"kcal\"`, `\"kj\"`) to a function of the value"],
      ["Unknown unit", "`ValueError(\"unknown unit: lb\")`"],
    ],
    hiddenKinds: ["every unit", "an unknown unit", "a unit added to CONVERSIONS later"],
    hints: [
      "Each branch of the chain becomes one small function (or lambda) in the dictionary.",
      "`to_base` checks whether the unit is a key, raises the same ValueError if not, and calls the function.",
      "Because `to_base` reads `CONVERSIONS` each time, adding an entry later is enough.",
    ],
    explanation: "Each branch turned into an entry, and the dispatcher shrank to a lookup plus the unknown-unit error. The same results come out for every unit, and new units are added by registering a function, without touching `to_base`, which is the point of a registry.",
    code: {
      starter: src`
def to_base(value, unit):
    if unit == "g":
        return value
    elif unit == "kg":
        return value * 1000
    elif unit == "mg":
        return value / 1000
    elif unit == "oz":
        return value * 28.349523125
    elif unit == "kcal":
        return value
    elif unit == "kj":
        return value / 4.184
    raise ValueError(f"unknown unit: {unit}")

CONVERSIONS = {}

print(to_base(20.5, "oz"), to_base(1523, "kj"))
`,
      answer: src`
CONVERSIONS = {
    "g": lambda value: value,
    "kg": lambda value: value * 1000,
    "mg": lambda value: value / 1000,
    "oz": lambda value: value * 28.349523125,
    "kcal": lambda value: value,
    "kj": lambda value: value / 4.184,
}

def to_base(value, unit):
    if unit not in CONVERSIONS:
        raise ValueError(f"unknown unit: {unit}")
    return CONVERSIONS[unit](value)

print(to_base(20.5, "oz"), to_base(1523, "kj"))
`,
      alternatives: [
        src`
def same(value):
    return value

def factor(n):
    def convert(value):
        return value * n
    return convert

CONVERSIONS = {"g": same, "kg": factor(1000), "mg": factor(0.001), "oz": factor(28.349523125), "kcal": same, "kj": factor(1 / 4.184)}

def to_base(value, unit):
    convert = CONVERSIONS.get(unit)
    if convert is None:
        raise ValueError("unknown unit: " + unit)
    return convert(value)
`,
      ],
      wrong: [
        {
          code: src`
CONVERSIONS = {"g": 1, "kg": 1000, "mg": 0.001, "oz": 28.349523125, "kcal": 1, "kj": 1 / 4.184}

def to_base(value, unit):
    if unit == "g":
        return value
    if unit not in CONVERSIONS:
        raise ValueError(f"unknown unit: {unit}")
    return value * CONVERSIONS[unit]
`,
          fails: ["registry", "added"],
          why: "the results match, but `CONVERSIONS` holds numbers, not functions, so a new unit that isn't a simple factor can't be registered",
        },
        {
          code: src`
CONVERSIONS = {
    "g": lambda value: value,
    "kg": lambda value: value * 1000,
    "mg": lambda value: value / 1000,
    "oz": lambda value: value * 28.349523125,
    "kcal": lambda value: value,
    "kj": lambda value: value / 4.184,
}

def to_base(value, unit):
    return CONVERSIONS[unit](value)
`,
          fails: ["unknown"],
          why: "an unknown unit now raises KeyError instead of the ValueError callers expect",
        },
      ],
      task: {
        checks: [
          fn("returns", "to_base", [
            example([20.5, "oz"], 581.1652240625),
            example([1523, "kj"], 364.00573613766733),
            example([0.5, "kg"], py.float(500)),
            hiddenCase("every unit", [250, "mg"], 0.25),
            hiddenCase("grams and kilocalories unchanged", [363, "kcal"], 363),
            hiddenCase("plain grams", [30, "g"], 30),
          ], { label: "to_base() keeps its results" }),
          fn("unknown", "to_base", [raisesCase([1, "lb"], "ValueError", { label: "an unknown unit" })], { label: "unknown units raise ValueError" }),
          expr("registry", "CONVERSIONS maps every unit to a function", "result = sorted(CONVERSIONS) == ['g', 'kcal', 'kg', 'kj', 'mg', 'oz'] and all([callable(f) for f in CONVERSIONS.values()])", true, { hidden: true }),
          expr("added", "a unit added to CONVERSIONS later", "CONVERSIONS['lb'] = lambda value: value * 453.59237\ntry:\n    result = to_base(2, 'lb')\nfinally:\n    CONVERSIONS.pop('lb', None)", 907.18474, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-20 function implementation, hard
  {
    id: "PY-Q34-20",
    version: 2,
    slug: "label-rule-engine",
    title: "A rule engine for product labels",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 22,
    requires: ["assignment", "boolean", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-loop", "none-value", "print-call", "print-several", "raise-stmt", "reassignment", "string-format", "string-index", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack"],
    prompt: "Label rules are kept as data so the nutrition team can edit them without touching code: `[\"nutriments.sugars_100g\", \">\", 22.5, \"high sugar\"]`. Write `apply_rules(products, rules)`: return `{code: [labels]}` with, for each product, the labels of the rules that hold, in rule order. A field is a dotted path into the product; a rule whose field is missing doesn't apply. Operators are `>`, `>=`, `<`, `<=`, `==`, `!=`, looked up in a dictionary (the `operator` module has the functions); an unknown operator raises `ValueError` before any product is checked.",
    spec: [
      ["Function", "`apply_rules(products, rules)`"],
      ["rule", "`[field_path, op, value, label]`"],
      ["Returns", "a new dictionary from each product's `code` to its list of labels (possibly empty)"],
      ["Raises", "`ValueError` for an unknown operator"],
    ],
    hiddenKinds: ["a missing field", "equality on text", "an unknown operator", "rules in a different order", "no products", "a value exactly at the limit"],
    hints: [
      "Map each operator text to a function: `{\">\": operator.gt, \">=\": operator.ge, ...}`. Check every rule's operator before the main loop.",
      "Walk a dotted path one key at a time; when a key is missing, the rule doesn't apply to that product.",
      "For each product, collect the labels of the rules whose operator function returns True for (field value, rule value).",
    ],
    explanation: "Turning operator text into functions through a dictionary is the registry pattern applied to comparisons; `operator.gt(a, b)` is `a > b`. Validating all rules first means a typo in the rule file fails before any labels are produced. The dotted path is resolved key by key so that missing data skips a rule instead of crashing the whole run.",
    code: {
      starter: src`
import operator

def apply_rules(products, rules):
    return {}

rules = [
    ["nutriments.sugars_100g", ">", 22.5, "high sugar"],
    ["nutriments.salt_100g", ">", 1.5, "high salt"],
    ["nutriscore_grade", "==", "a", "best grade"],
]
products = [
    {"code": "5010029219494", "nutriscore_grade": "a", "nutriments": {"sugars_100g": 1, "salt_100g": 0.03}},
    {"code": "7613032192570", "nutriscore_grade": "d", "nutriments": {"sugars_100g": 25, "salt_100g": 0.49}},
]
print(apply_rules(products, rules))
`,
      answer: src`
import operator

OPERATORS = {">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le, "==": operator.eq, "!=": operator.ne}
MISSING = object()

def lookup(record, path):
    value = record
    for key in path.split("."):
        if not isinstance(value, dict) or key not in value:
            return MISSING
        value = value[key]
    return value

def apply_rules(products, rules):
    for field, op, value, label in rules:
        if op not in OPERATORS:
            raise ValueError(f"unknown operator: {op}")
    labels = {}
    for product in products:
        found = []
        for field, op, value, label in rules:
            actual = lookup(product, field)
            if actual is not MISSING and OPERATORS[op](actual, value):
                found.append(label)
        labels[product["code"]] = found
    return labels

rules = [
    ["nutriments.sugars_100g", ">", 22.5, "high sugar"],
    ["nutriments.salt_100g", ">", 1.5, "high salt"],
    ["nutriscore_grade", "==", "a", "best grade"],
]
products = [
    {"code": "5010029219494", "nutriscore_grade": "a", "nutriments": {"sugars_100g": 1, "salt_100g": 0.03}},
    {"code": "7613032192570", "nutriscore_grade": "d", "nutriments": {"sugars_100g": 25, "salt_100g": 0.49}},
]
print(apply_rules(products, rules))
`,
      alternatives: [
        src`
import operator
from functools import reduce

OPS = {">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le, "==": operator.eq, "!=": operator.ne}

def get_path(record, path):
    try:
        return True, reduce(lambda acc, key: acc[key], path.split("."), record)
    except (KeyError, TypeError):
        return False, None

def apply_rules(products, rules):
    unknown = [r[1] for r in rules if r[1] not in OPS]
    if unknown:
        raise ValueError(unknown[0])
    result = {}
    for p in products:
        result[p["code"]] = []
        for path, op, target, label in rules:
            ok, value = get_path(p, path)
            if ok and OPS[op](value, target):
                result[p["code"]].append(label)
    return result
`,
      ],
      wrong: [
        {
          code: src`
import operator

OPERATORS = {">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le, "==": operator.eq, "!=": operator.ne}

def apply_rules(products, rules):
    labels = {}
    for product in products:
        found = []
        for field, op, value, label in rules:
            actual = product
            for key in field.split("."):
                actual = actual.get(key, 0)
            if OPERATORS[op](actual, value):
                found.append(label)
        labels[product["code"]] = found
    return labels
`,
            fails: ["returns", "unknown-op"],
            why: "a missing field counts as 0, so a `<` rule labels products with no data, and an unknown operator only fails when it is reached",
        },
        {
          code: src`
import operator

OPERATORS = {">": operator.gt, ">=": operator.ge, "<": operator.lt, "<=": operator.le, "==": operator.eq, "!=": operator.ne}

def apply_rules(products, rules):
    for field, op, value, label in rules:
        if op not in OPERATORS:
            raise ValueError(op)
    labels = {}
    for product in products:
        found = []
        for field, op, value, label in rules:
            actual = product
            missing = False
            for key in field.split("."):
                if key not in actual:
                    missing = True
                    break
                actual = actual[key]
            if not missing and OPERATORS[op](value, actual):
                found.append(label)
        labels[product["code"]] = found
    return labels
`,
          fails: ["returns"],
          why: "the operator gets its arguments the wrong way round: `22.5 > sugar` instead of `sugar > 22.5`",
        },
      ],
      task: {
        checks: [
          fn("returns", "apply_rules", [
            example([[{ code: "5010029219494", nutriscore_grade: "a", nutriments: { sugars_100g: 1, salt_100g: 0.03 } }, { code: "7613032192570", nutriscore_grade: "d", nutriments: { sugars_100g: 25, salt_100g: 0.49 } }], [["nutriments.sugars_100g", ">", 22.5, "high sugar"], ["nutriments.salt_100g", ">", 1.5, "high salt"], ["nutriscore_grade", "==", "a", "best grade"]]], { "5010029219494": ["best grade"], "7613032192570": ["high sugar"] }),
            example([[{ code: "0038000001109", nutriscore_grade: "c", nutriments: { sugars_100g: 10.71, salt_100g: 1.785, fiber_100g: 3.6 } }], [["nutriments.fiber_100g", ">=", 6, "high fibre"], ["nutriments.salt_100g", ">", 1.5, "high salt"]]], { "0038000001109": ["high salt"] }),
            example([[], [["nutriments.sugars_100g", ">", 22.5, "high sugar"]]], {}),
            hiddenCase("a missing field", [[{ code: "x", nutriments: { sugars_100g: 30 } }], [["nutriments.salt_100g", "<", 0.3, "low salt"], ["nutriments.sugars_100g", ">", 22.5, "high sugar"]]], { x: ["high sugar"] }),
            hiddenCase("equality on text", [[{ code: "y", nutriscore_grade: "e", nutriments: {} }], [["nutriscore_grade", "!=", "a", "not top grade"], ["nutriscore_grade", "==", "e", "worst grade"]]], { y: ["not top grade", "worst grade"] }),
            hiddenCase("rules in a different order", [[{ code: "z", nutriments: { sugars_100g: 32.4, salt_100g: 1.6 } }], [["nutriments.salt_100g", ">", 1.5, "high salt"], ["nutriments.sugars_100g", ">", 22.5, "high sugar"]]], { z: ["high salt", "high sugar"] }),
            hiddenCase("a value exactly at the limit", [[{ code: "w", nutriments: { sugars_100g: 22.5 } }], [["nutriments.sugars_100g", ">", 22.5, "high sugar"], ["nutriments.sugars_100g", "<=", 22.5, "not high sugar"]]], { w: ["not high sugar"] }),
          ], { label: "apply_rules() labels each product" }),
          fn("unknown-op", "apply_rules", [raisesCase([[], [["nutriments.sugars_100g", "=>", 22.5, "x"]]], "ValueError", { label: "an unknown operator" })], { label: "an unknown operator raises ValueError" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q34-22 output prediction, hard
  {
    id: "PY-Q34-22",
    version: 2,
    slug: "predict-introspection",
    title: "Predict: introspecting wrapped and partial functions",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 10,
    requires: ["arithmetic", "assignment", "callable-call", "decorator-at", "decorator-call", "function-def", "function-default", "function-param", "function-return", "import-module", "keyword-only", "partial-call", "print-call", "print-several", "reassignment", "star-args", "star-kwargs", "top-level-indent", "wraps-dec"],
    prompt: "A decorated function and a partial of it are examined with `__name__`, `inspect.signature`, `callable` and `getattr`. Predict exactly what this prints.",
    spec: [["Watch", "what `wraps` copies, what `inspect.signature` follows, and what a partial does and doesn't have"]],
    hiddenKinds: [],
    hints: [
      "`wraps` copies the name and sets `__wrapped__`; `inspect.signature` follows `__wrapped__` to the original's parameters.",
      "The signature of a partial still lists the parameters it fixed by keyword (they become keyword-only with new defaults).",
      "A partial is callable but has no `__name__`, so `getattr` returns the default.",
    ],
    explanation: "Because `logged` uses `wraps`, `energy.__name__` is `energy` and `inspect.signature` reports the original's parameters rather than `(*args, **kwargs)`. A partial that fixes `portion_g` by keyword keeps it in its signature (as keyword-only, default 50). Partials have no `__name__` of their own, and `half(363)` is 363 × 50 / 100 = 181.5.",
    predict: {
      program: src`
import inspect
from functools import partial, wraps

def logged(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@logged
def energy(kcal_100g, portion_g=30, *, per=100):
    return kcal_100g * portion_g / per

half = partial(energy, portion_g=50)
print(energy.__name__, list(inspect.signature(energy).parameters))
print(list(inspect.signature(half).parameters))
print(callable(half), getattr(half, "__name__", "no name"), half(363))
`,
      output: "energy ['kcal_100g', 'portion_g', 'per']\n['kcal_100g', 'portion_g', 'per']\nTrue no name 181.5\n",
      wrongPredictions: [
        "wrapper ['args', 'kwargs']\n['args', 'kwargs']\nTrue no name 181.5\n",
        "energy ['kcal_100g', 'portion_g', 'per']\n['kcal_100g', 'per']\nTrue no name 181.5\n",
        "energy ['kcal_100g', 'portion_g', 'per']\n['kcal_100g', 'portion_g', 'per']\nTrue energy 181.5\n",
      ],
    },
  },
];
