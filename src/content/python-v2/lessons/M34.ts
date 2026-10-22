/**
 * M34 Functional & Dynamic Python: five lessons (PY-L34-01 … PY-L34-05).
 *
 * Pure functions (no hidden inputs, no side effects, the clock as a parameter), functools.partial, composing
 * functions into pipelines (including functools.reduce), introspection (callable, getattr/hasattr/setattr,
 * inspect.signature), and registries that choose a function from data instead of an if/elif chain.
 * Fixtures are real Open Food Facts products (D09: names, brands with stray spaces, nutriments per 100 g) and
 * OpenAlex works (D10). Nutrient limits are the UK front-of-pack "high" thresholds (sugars over 22.5 g, salt over
 * 1.5 g per 100 g) and the EU "high fibre" claim (at least 6 g per 100 g).
 *
 * Purity is graded by calling the learner's functions and checking that their inputs are unchanged; partial and
 * registries by calling what the learner's code builds or registers with hidden inputs.
 * Version 2: rewritten from "box a word" and "register the mug" exercises; saved progress from version 1 doesn't count.
 */
import type { PyLesson } from "../model";
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

const product = (code: string, name: string, sugars: number, salt: number, fiber: number) => ({ code, product_name: name, nutriments: { sugars_100g: sugars, salt_100g: salt, fiber_100g: fiber } });
const weetabix = product("5010029000023", "Weetabix", 4.27, 0.26, 10.1);
const cocoPops = product("5059319024479", "Coco Pops", 17, 0.525, 3.8);
const lion = product("7613032192570", "NESTLE LION Céréales 480g", 25, 0.49, 5.8);
const cornFlakes = product("0038000001109", "Corn Flakes", 10.71, 1.785, 3.6);
const honeyNut = product("0016000124790", "Honey Nut Cheerios", 32.4, 1.42, 8.11);
const LIMITS = { sugars_100g: 22.5, salt_100g: 1.5 };

export const m34Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L34-01 pure functions
  {
    id: "PY-L34-01",
    version: 2,
    slug: "pure-functions",
    title: "Pure functions: same input, same output, no surprises",
    lede: "A pure function's result depends only on its arguments, and calling it changes nothing outside it. Such functions are easy to test, reuse and reason about. Side effects (changing inputs, globals, files, the clock) are kept at the edges of the program.",
    focus: "Recognise hidden inputs and side effects, and rewrite functions so their results depend only on their arguments.",
    minutes: 20,
    objectives: [
      "Name the side effects and hidden inputs that make a function impure",
      "Return new data instead of changing the arguments, and check that inputs are unchanged",
      "Turn hidden inputs, such as today's date or a global setting, into parameters",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comp-if", "comparison", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "nested-loop", "none-value", "precedence", "print-call", "print-several", "print-text", "sort-key", "spaces-in-text", "star-kwargs", "string-index", "string-method", "string-slice", "timedelta-call", "top-level-indent", "unicode-text", "unquoted-name", "while-loop"],
    teaches: ["pure-fn"],
    blocks: [
      {
        kind: "text",
        md: "A function is **pure** when two things hold. Its result depends only on its arguments: no global settings, no `datetime.now()`, no random numbers, no files. And calling it has no **side effects**: it doesn't change its arguments, globals or files, and doesn't print. Call it twice with the same arguments and you get the same answer, and nothing else in the program can tell it ran.\n\nThat makes it easy to test (no setup, no clean-up), safe to reuse anywhere, and safe to cache (see Decorators & Context Managers). Programs still need side effects, such as reading files and writing reports, but they can keep them in a thin outer layer and do the real work in pure functions.",
      },
      {
        kind: "example",
        title: "Changing the input versus returning new data",
        code: src`
def add_vat_in_place(basket, rate):
    for line in basket:
        line["price"] = line["price"] * (1 + rate)
    return basket

def with_vat(basket, rate):
    return [{**line, "price": line["price"] * (1 + rate)} for line in basket]

basket = [{"sku": "GRO-41017", "price": 8.0}, {"sku": "TOY-54564", "price": 25.0}]
print(with_vat(basket, 0.2))
print(basket)
add_vat_in_place(basket, 0.2)
add_vat_in_place(basket, 0.2)
print(basket)
`,
        output: "[{'sku': 'GRO-41017', 'price': 9.6}, {'sku': 'TOY-54564', 'price': 30.0}]\n[{'sku': 'GRO-41017', 'price': 8.0}, {'sku': 'TOY-54564', 'price': 25.0}]\n[{'sku': 'GRO-41017', 'price': 11.52}, {'sku': 'TOY-54564', 'price': 36.0}]\n",
        note: "`with_vat` built new dictionaries (`{**line, ...}` copies a line and replaces one key), so `basket` was untouched. The in-place version changed the caller's data, and calling it twice added VAT twice: the answer depends on how often it ran.",
      },
      {
        kind: "text",
        md: "Hidden inputs are just as troublesome. A function that calls `date.today()` gives a different answer tomorrow, so a test written today fails next week. Make the date a parameter: the caller passes `date.today()` in production and a fixed date in tests.",
      },
      {
        kind: "example",
        title: "The date as a parameter",
        code: src`
from datetime import date

def days_left(best_before, today):
    return (date.fromisoformat(best_before) - today).days

def expiring(products, today, within_days):
    return [p["code"] for p in products if 0 <= days_left(p["best_before"], today) <= within_days]

stock = [
    {"code": "5010029000023", "best_before": "2026-11-02"},
    {"code": "20621483", "best_before": "2026-10-25"},
    {"code": "0016000170032", "best_before": "2026-10-18"},
]
print(expiring(stock, date(2026, 10, 20), 7))
print(expiring(stock, date(2026, 10, 30), 7))
`,
        output: "['20621483']\n['5010029000023']\n",
        note: "Same function, two fixed \"todays\", two predictable answers; a test can check both. The product past its date (`0016000170032`) has negative days left, so it isn't \"expiring\"; it has expired.",
      },
      {
        kind: "text",
        md: "**When to use it:** for all calculation, conversion, filtering and formatting, which is most of a program. Keep reading files, calling APIs, printing and writing databases in a few outer functions. **Mistakes to avoid:** changing a list or dictionary you were given; mutable default arguments (see Functions), which keep state between calls; reading globals or the clock inside a calculation; and printing from a function whose job is to compute.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Clean names without touching the input",
      prompt: "`clean_names` tidies product names by changing the dictionaries it is given. Make it pure: return a **new** list of **new** dictionaries with the cleaned name, and leave the input exactly as it was.",
      spec: [
        ["Function", "`clean_names(products)`"],
        ["Returns", "new dictionaries with `product_name` stripped and in title case; other keys copied"],
        ["Must not", "change the products it is given"],
      ],
      starter: src`
def clean_names(products):
    for product in products:
        product["product_name"] = product["product_name"].strip().title()
    return products

products = [{"code": "20621483", "product_name": "  bran flakes"}, {"code": "01771879", "product_name": "SWISS STYLE MUESLI "}]
print(clean_names(products))
print(products[0])
`,
      answer: src`
def clean_names(products):
    return [{**product, "product_name": product["product_name"].strip().title()} for product in products]

products = [{"code": "20621483", "product_name": "  bran flakes"}, {"code": "01771879", "product_name": "SWISS STYLE MUESLI "}]
print(clean_names(products))
print(products[0])
`,
      wrong: [
        {
          code: src`
def clean_names(products):
    cleaned = list(products)
    for product in cleaned:
        product["product_name"] = product["product_name"].strip().title()
    return cleaned
`,
          fails: ["keeps-input"],
          why: "`list(products)` copies the list but not the dictionaries inside it, so they are still changed",
        },
      ],
      hints: ["The loop writes into the caller's dictionaries.", "Build a new dictionary for each product instead.", "`{**product, \"product_name\": ...}` copies a product and replaces one key."],
      task: {
        checks: [
          fn("returns", "clean_names", [
            example([[{ code: "20621483", product_name: "  bran flakes" }, { code: "01771879", product_name: "SWISS STYLE MUESLI " }]], [{ code: "20621483", product_name: "Bran Flakes" }, { code: "01771879", product_name: "Swiss Style Muesli" }]),
            hiddenCase("an empty list", [[]], []),
          ], { label: "clean_names() returns tidy names" }),
          fn("keeps-input", "clean_names", [keepsInput([[{ code: "1", product_name: " corn flakes " }]], { label: "a product with a messy name" })], { label: "clean_names() leaves its input unchanged" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Nutrition labels, without changing the data",
        prompt: "A shop shows warning labels next to cereals. Write a pure function `label_products(products, limits)`: return a new list with one new dictionary per product, `{\"code\": …, \"labels\": [...]}`. For each nutrient in `limits`, in the order of `limits`, add the label `\"high <nutrient without _100g>\"` when the product's value per 100 g is **over** the limit. Neither argument may change.",
        spec: [
          ["Function", "`label_products(products, limits)`"],
          ["products", "dictionaries with `code` and a `nutriments` dictionary such as `{\"sugars_100g\": 25, \"salt_100g\": 0.49}`"],
          ["limits", "e.g. `{\"sugars_100g\": 22.5, \"salt_100g\": 1.5}` (UK front-of-pack \"high\" thresholds)"],
          ["Returns", "e.g. `{\"code\": \"7613032192570\", \"labels\": [\"high sugars\"]}`; a missing nutrient is not labelled"],
        ],
        starter: src`
def label_products(products, limits):
    return []

products = [
    {"code": "7613032192570", "product_name": "NESTLE LION Céréales 480g", "nutriments": {"sugars_100g": 25, "salt_100g": 0.49}},
    {"code": "5010029000023", "product_name": "Weetabix", "nutriments": {"sugars_100g": 4.27, "salt_100g": 0.26}},
]
print(label_products(products, {"sugars_100g": 22.5, "salt_100g": 1.5}))
`,
        answer: src`
def label_products(products, limits):
    labelled = []
    for product in products:
        labels = []
        for nutrient, limit in limits.items():
            value = product["nutriments"].get(nutrient)
            if value is not None and value > limit:
                labels.append("high " + nutrient.removesuffix("_100g"))
        labelled.append({"code": product["code"], "labels": labels})
    return labelled

products = [
    {"code": "7613032192570", "product_name": "NESTLE LION Céréales 480g", "nutriments": {"sugars_100g": 25, "salt_100g": 0.49}},
    {"code": "5010029000023", "product_name": "Weetabix", "nutriments": {"sugars_100g": 4.27, "salt_100g": 0.26}},
]
print(label_products(products, {"sugars_100g": 22.5, "salt_100g": 1.5}))
`,
        alternatives: [
          src`
def label_for(nutriments, limits):
    return ["high " + name[:-len("_100g")] for name, limit in limits.items() if nutriments.get(name, limit) > limit]

def label_products(products, limits):
    return [{"code": p["code"], "labels": label_for(p["nutriments"], limits)} for p in products]
`,
        ],
        wrong: [
          {
            code: src`
def label_products(products, limits):
    for product in products:
        product["labels"] = []
        for nutrient, limit in limits.items():
            if product["nutriments"].get(nutrient, 0) > limit:
                product["labels"].append("high " + nutrient.removesuffix("_100g"))
    return [{"code": p["code"], "labels": p["labels"]} for p in products]
`,
            fails: ["keeps-input"],
            why: "the labels are right, but they are also written into the shop's product records",
          },
          {
            code: src`
def label_products(products, limits):
    labelled = []
    for product in products:
        labels = []
        for nutrient, limit in limits.items():
            value = product["nutriments"].get(nutrient)
            if value is not None and value >= limit:
                labels.append("high " + nutrient.removesuffix("_100g"))
        labelled.append({"code": product["code"], "labels": labels})
    return labelled
`,
            fails: ["returns"],
            why: "`>=` labels a product that is exactly at the limit; the guidance says over",
          },
          {
            code: src`
def label_products(products, limits):
    labelled = []
    for product in products:
        labels = []
        for nutrient, limit in limits.items():
            if product["nutriments"][nutrient] > limit:
                labels.append("high " + nutrient.removesuffix("_100g"))
        labelled.append({"code": product["code"], "labels": labels})
    return labelled
`,
            fails: ["returns"],
            why: "a product without a salt value crashes with KeyError",
          },
        ],
        hints: [
          "Build each result dictionary from scratch; never assign into `product`.",
          "Loop over `limits.items()` so the labels follow the order of the limits; read the value with `get` because it may be missing.",
          "`\"sugars_100g\".removesuffix(\"_100g\")` gives `\"sugars\"` for the label.",
        ],
        task: {
          checks: [
            fn("returns", "label_products", [
              example([[lion, weetabix], LIMITS], [{ code: "7613032192570", labels: ["high sugars"] }, { code: "5010029000023", labels: [] }]),
              example([[honeyNut, cornFlakes], LIMITS], [{ code: "0016000124790", labels: ["high sugars"] }, { code: "0038000001109", labels: ["high salt"] }]),
              example([[], LIMITS], []),
              hiddenCase("a value exactly at the limit", [[product("x1", "Test", 22.5, 1.5, 0)], LIMITS], [{ code: "x1", labels: [] }]),
              hiddenCase("a missing nutrient", [[{ code: "0016000275263", product_name: "Cheerios Heart shape", nutriments: { sugars_100g: 30 } }], LIMITS], [{ code: "0016000275263", labels: ["high sugars"] }]),
              hiddenCase("limits in a different order", [[product("x2", "Salty sweet", 30, 2, 1)], { salt_100g: 1.5, sugars_100g: 22.5 }], [{ code: "x2", labels: ["high salt", "high sugars"] }]),
            ], { label: "label_products() labels each product over a limit" }),
            fn("keeps-input", "label_products", [keepsInput([[lion, cornFlakes], LIMITS]), keepsInput([[honeyNut], { sugars_100g: 10 }], { label: "a product over the limit" })], { label: "label_products() leaves both arguments unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Which batches expire in the next days?",
        prompt: "A warehouse report lists stock batches that need selling soon. The old version called `date.today()` inside, so its tests broke every day. Write a pure function `expiring_batches(batches, today, days)`: `today` is an ISO date text; return the codes of batches whose `best_before` is from `today` up to `days` days later (inclusive), soonest first, ties in the order given.",
        spec: [
          ["Function", "`expiring_batches(batches, today, days)`"],
          ["batches", "dictionaries with `code` and `best_before` (`\"2026-10-25\"`)"],
          ["Returns", "codes with `0 <= (best_before - today).days <= days`, sorted by best-before date; expired batches are not included"],
        ],
        starter: src`
from datetime import date

def expiring_batches(batches, today, days):
    return []

batches = [
    {"code": "5010029000023", "best_before": "2026-11-02"},
    {"code": "20621483", "best_before": "2026-10-25"},
    {"code": "0016000170032", "best_before": "2026-10-18"},
    {"code": "01771879", "best_before": "2026-10-21"},
]
print(expiring_batches(batches, "2026-10-20", 7))
`,
        answer: src`
from datetime import date

def expiring_batches(batches, today, days):
    start = date.fromisoformat(today)
    soon = []
    for batch in batches:
        left = (date.fromisoformat(batch["best_before"]) - start).days
        if 0 <= left <= days:
            soon.append((left, batch["code"]))
    soon.sort(key=lambda pair: pair[0])
    return [code for left, code in soon]

batches = [
    {"code": "5010029000023", "best_before": "2026-11-02"},
    {"code": "20621483", "best_before": "2026-10-25"},
    {"code": "0016000170032", "best_before": "2026-10-18"},
    {"code": "01771879", "best_before": "2026-10-21"},
]
print(expiring_batches(batches, "2026-10-20", 7))
`,
        alternatives: [
          src`
from datetime import date, timedelta

def expiring_batches(batches, today, days):
    first = date.fromisoformat(today)
    last = first + timedelta(days=days)
    chosen = [b for b in batches if first <= date.fromisoformat(b["best_before"]) <= last]
    return [b["code"] for b in sorted(chosen, key=lambda b: b["best_before"])]
`,
        ],
        wrong: [
          {
            code: src`
from datetime import date

def expiring_batches(batches, today, days):
    start = date.fromisoformat(today)
    soon = []
    for batch in batches:
        left = (date.fromisoformat(batch["best_before"]) - start).days
        if 0 <= left <= 7:
            soon.append((left, batch["code"]))
    soon.sort(key=lambda pair: pair[0])
    return [code for left, code in soon]
`,
            fails: ["edges"],
            why: "a hidden input crept back in: the window is always a week, whatever `days` says",
          },
          {
            code: src`
from datetime import date

def expiring_batches(batches, today, days):
    start = date.fromisoformat(today)
    soon = []
    for batch in batches:
        left = (date.fromisoformat(batch["best_before"]) - start).days
        if left <= days:
            soon.append((left, batch["code"]))
    soon.sort(key=lambda pair: pair[0])
    return [code for left, code in soon]
`,
            fails: ["returns", "edges"],
            why: "expired batches (negative days left) are included",
          },
          {
            code: src`
from datetime import date

def expiring_batches(batches, today, days):
    start = date.fromisoformat(today)
    return [b["code"] for b in batches if 0 <= (date.fromisoformat(b["best_before"]) - start).days <= days]
`,
            fails: ["returns", "ties"],
            why: "the batches stay in the order given instead of soonest first",
          },
        ],
        hints: [
          "Turn both dates into `date` objects with `date.fromisoformat` (see Dates Numbers & Regex); subtracting them gives a timedelta with `.days`.",
          "Keep a batch when its days left are between 0 and `days`, both included.",
          "Sort the kept batches by their date (`sort` is stable, so equal dates keep their order) and return the codes.",
        ],
        task: {
          checks: [
            fn("returns", "expiring_batches", [
              example([[{ code: "5010029000023", best_before: "2026-11-02" }, { code: "20621483", best_before: "2026-10-25" }, { code: "0016000170032", best_before: "2026-10-18" }, { code: "01771879", best_before: "2026-10-21" }], "2026-10-20", 7], ["01771879", "20621483"]),
              example([[{ code: "5010029000023", best_before: "2026-11-02" }], "2026-10-30", 7], ["5010029000023"]),
              example([[], "2026-10-20", 7], []),
              hiddenCase("dates on both edges of the window", [[{ code: "a", best_before: "2026-10-27" }, { code: "b", best_before: "2026-10-20" }, { code: "c", best_before: "2026-10-28" }, { code: "d", best_before: "2026-10-19" }], "2026-10-20", 7], ["b", "a"]),
              hiddenCase("equal dates keep their order", [[{ code: "z", best_before: "2027-01-02" }, { code: "y", best_before: "2027-01-01" }, { code: "x", best_before: "2027-01-02" }], "2026-12-31", 3], ["y", "z", "x"]),
              hiddenCase("a window across a year end", [[{ code: "n", best_before: "2027-01-03" }], "2026-12-30", 5], ["n"]),
            ], { label: "expiring_batches() uses the given date" }),
            fn("edges", "expiring_batches", [hiddenCase("a zero-day window", [[{ code: "t", best_before: "2026-10-20" }, { code: "u", best_before: "2026-10-21" }, { code: "v", best_before: "2026-10-19" }], "2026-10-20", 0], ["t"])], { label: "only today's batches for a zero-day window" }),
            fn("ties", "expiring_batches", [hiddenCase("several batches out of order", [[{ code: "late", best_before: "2026-10-24" }, { code: "early", best_before: "2026-10-21" }], "2026-10-20", 10], ["early", "late"])], { label: "soonest first" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def remove_blank(tags):
    tags = [t for t in tags if t.strip()]
    return tags

def drop_blank(tags):
    while "" in tags:
        tags.remove("")
    return tags

labels = ["vegan", "", "high-fibre", ""]
print(len(remove_blank(labels)), len(labels))
print(len(drop_blank(labels)), len(labels))
`,
        choices: ["2 4\n2 2", "2 2\n2 2", "2 4\n2 4", "4 4\n2 2"],
        answer: 0,
        why: "`remove_blank` builds a new list and only rebinds its own local name, so `labels` keeps its four items. `drop_blank` calls `remove` on the caller's list itself, so afterwards `labels` has two items.",
      },
      {
        id: "q2",
        prompt: "A common mistake: sorting the argument in place. What does this print?",
        program: src`
def top_two(fares):
    fares.sort(reverse=True)
    return fares[:2]

day = [12.8, 40.8, 7.2]
print(top_two(day), day)
`,
        choices: ["[40.8, 12.8] [40.8, 12.8, 7.2]", "[40.8, 12.8] [12.8, 40.8, 7.2]", "[12.8, 40.8] [12.8, 40.8, 7.2]", "[40.8, 12.8] [7.2, 12.8, 40.8]"],
        answer: 0,
        why: "`list.sort` reorders the caller's own list, so `day` comes back sorted too: a side effect. `sorted(fares, reverse=True)[:2]` returns the same answer and leaves `day` alone.",
      },
      {
        id: "q3",
        prompt: "Which function is pure?",
        choices: [
          "`def fare_per_mile(fare, miles): return fare / miles`",
          "`def log_fare(fare): print(fare); return fare`",
          "`def next_id(): global counter; counter += 1; return counter`",
          "`def is_open(): return datetime.now().hour < 22`",
        ],
        answer: 0,
        why: "Only `fare_per_mile` depends on nothing but its arguments and changes nothing. The others print, change a global, or read the clock.",
      },
    ],
    review: [
      "A pure function's result depends only on its arguments, and calling it changes nothing outside it.",
      "Return new lists and dictionaries instead of changing the ones you were given.",
      "Pass hidden inputs (today's date, settings) in as parameters; keep printing and I/O at the edges.",
      "Next: `functools.partial`, which makes a new function from an existing one by fixing some arguments.",
    ],
  },

  // ------------------------------------------------------------------ PY-L34-02 partial
  {
    id: "PY-L34-02",
    version: 2,
    slug: "functools-partial",
    title: "functools.partial: fix some arguments now",
    lede: "partial(func, *args, **kwargs) returns a new callable with some arguments already filled in. It is the tidy way to adapt a general function to a place that expects a simpler one: a sort key, a callback, a table of converters.",
    focus: "Create specialised functions with functools.partial, and know how they bind their arguments.",
    minutes: 18,
    objectives: [
      "Build a partial with positional and keyword arguments, and call it with the rest",
      "Use partials as sort keys and as entries in a table of functions",
      "Explain why a partial built in a loop keeps its own value while a lambda in a loop may not",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-dict", "none-value", "part-attr", "precedence", "print-call", "print-several", "print-text", "reassignment", "sort-key", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness"],
    teaches: ["partial-call"],
    blocks: [
      {
        kind: "text",
        md: "Many places want a function of a particular shape: `sorted(key=...)` wants one argument, a callback might want none, `map` wants one. Your function often takes more. **`functools.partial(func, *args, **kwargs)`** returns a callable that remembers those arguments; calling it adds the new ones: `partial(func, a)(b, c=1)` runs `func(a, b, c=1)`. Its arguments are fixed **when the partial is created**, and you can inspect them: `.func`, `.args`, `.keywords`.",
      },
      {
        kind: "example",
        title: "Specialised converters",
        code: src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

to_eur = partial(convert, rate=0.92)
to_gbp_card = partial(convert, rate=0.79, fee=1.5)
parse_hex = partial(int, base=16)

print(to_eur(50))
print(to_gbp_card(100))
print(to_eur(50, fee=2))
print(parse_hex("ff"), parse_hex("1A"))
print(to_eur.func.__name__, to_eur.args, to_eur.keywords)
`,
        output: "46.0\n77.5\n44.0\n255 26\nconvert () {'rate': 0.92}\n",
        note: "Keywords fixed by a partial can still be overridden or extended at call time (`fee=2`). `partial(int, base=16)` adapts a built-in. The partial object shows exactly what it holds.",
      },
      {
        kind: "text",
        md: "A partial is handy wherever a function is passed around. Here one general scoring function becomes a sort key with fixed weights, and a loop builds one filter per nutrient. In a loop, `partial` captures each value as it is created, which is exactly where a `lambda` written in the loop goes wrong (the concept check shows it).",
      },
      {
        kind: "example",
        title: "Sort keys and a table of filters",
        code: src`
from functools import partial

def score(work, citations_weight, year_weight):
    return work["cited_by_count"] * citations_weight + work["publication_year"] * year_weight

works = [
    {"id": "W3003257820", "publication_year": 2020, "cited_by_count": 38040},
    {"id": "W2970971581", "publication_year": 2019, "cited_by_count": 31488},
    {"id": "W3021613070", "publication_year": 2020, "cited_by_count": 2362},
]
by_citations = partial(score, citations_weight=1, year_weight=0)
by_recent = partial(score, citations_weight=0.001, year_weight=100)
print([w["id"] for w in sorted(works, key=by_citations, reverse=True)])
print([w["id"] for w in sorted(works, key=by_recent, reverse=True)])

def above(product, nutrient, limit):
    return product["nutriments"].get(nutrient, 0) > limit

checks = {}
for nutrient, limit in {"sugars_100g": 22.5, "salt_100g": 1.5}.items():
    checks[nutrient] = partial(above, nutrient=nutrient, limit=limit)
corn_flakes = {"nutriments": {"sugars_100g": 10.71, "salt_100g": 1.785}}
print({name: check(corn_flakes) for name, check in checks.items()})
`,
        output: "['W3003257820', 'W2970971581', 'W3021613070']\n['W3003257820', 'W3021613070', 'W2970971581']\n{'sugars_100g': False, 'salt_100g': True}\n",
        note: "Each partial in `checks` holds its own nutrient and limit, fixed on the pass of the loop that created it.",
      },
      {
        kind: "text",
        md: "**When to use it:** to adapt a general function to a slot that expects fewer arguments, to build tables of configured functions, and as a clearer alternative to a lambda that only fills in arguments. **Mistakes to avoid:** fixing a positional argument in the wrong position (`partial(convert, 0.92)` sets `amount`, not `rate`: use keywords); fixing a value that should change between calls; and expecting a partial to have `__name__` (it doesn't; look at `.func.__name__`).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Fix the right argument",
      prompt: "`sugar_ri` should give a portion's sugar as a percentage of the UK reference intake for total sugars, 90 g. But `partial(percent_of, 90)` fixed the wrong argument. Fix `whole` by keyword instead.",
      spec: [
        ["Function", "`percent_of(part, whole)` returns `100 * part / whole`"],
        ["sugar_ri", "a partial of `percent_of` with `whole=90`, so `sugar_ri(45)` → `50.0`"],
      ],
      starter: src`
from functools import partial

def percent_of(part, whole):
    return 100 * part / whole

sugar_ri = partial(percent_of, 90)
print(sugar_ri(45))
`,
      answer: src`
from functools import partial

def percent_of(part, whole):
    return 100 * part / whole

sugar_ri = partial(percent_of, whole=90)
print(sugar_ri(45))
`,
      wrong: [
        {
          code: src`
from functools import partial

def percent_of(part, whole):
    return 100 * part / whole

sugar_ri = partial(percent_of, part=90)
`,
          fails: ["returns", "other"],
          why: "fixing `part` by keyword makes `sugar_ri(45)` fail: 45 goes into the same slot",
        },
      ],
      hints: ["`partial(percent_of, 90)` fills the first parameter, `part`.", "The 90 g reference intake is the `whole`.", "Pass it by keyword: `whole=90`."],
      task: {
        checks: [
          expr("returns", "45 g of sugar is half the reference intake", "result = sugar_ri(45)", py.float(50), { show: "sugar_ri(45)" }),
          expr("other", "another amount", "result = sugar_ri(9)", py.float(10), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A converter per currency",
        prompt: "Write `make_converters(rates)`: given a dictionary from currency code to the rate for one US dollar, return a new dictionary from the same codes to **functions** that convert a dollar amount to that currency. Each function takes the amount and an optional keyword `fee` (default 0), and returns `amount * rate - fee`. `convert` is in the starter; build the functions with `partial`.",
        spec: [
          ["Function", "`make_converters(rates)`, e.g. `{\"EUR\": 0.92, \"GBP\": 0.79}`"],
          ["Returns", "`{\"EUR\": f, \"GBP\": g}` where `f(50)` → `46.0` and `g(100, fee=1.5)` → `77.5`"],
          ["Each function", "keeps its own rate, even after `rates` changes"],
        ],
        starter: src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

def make_converters(rates):
    return {}

converters = make_converters({"EUR": 0.92, "GBP": 0.79})
print(converters["EUR"](50), converters["GBP"](100, fee=1.5))
`,
        answer: src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

def make_converters(rates):
    return {code: partial(convert, rate=rate) for code, rate in rates.items()}

converters = make_converters({"EUR": 0.92, "GBP": 0.79})
print(converters["EUR"](50), converters["GBP"](100, fee=1.5))
`,
        alternatives: [
          src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

def make_converters(rates):
    result = {}
    for code in rates:
        result[code] = partial(convert, rate=rates[code])
    return result
`,
        ],
        wrong: [
          {
            code: src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

def make_converters(rates):
    result = {}
    for code, rate in rates.items():
        result[code] = lambda amount, fee=0.0: convert(amount, rate, fee)
    return result
`,
            fails: ["returns", "three"],
            why: "every lambda looks `rate` up when it is called, after the loop has finished, so they all use the last rate",
          },
          {
            code: src`
from functools import partial

def convert(amount, rate, fee=0.0):
    return amount * rate - fee

def make_converters(rates):
    converters = {}
    for code in rates:
        converters[code] = lambda amount, fee=0.0, code=code: convert(amount, rates[code], fee)
    return converters
`,
            fails: ["kept"],
            why: "each function reads `rates[code]` at call time, so changing the dictionary later changes the converters",
          },
        ],
        hints: [
          "One function per entry of `rates`: a dictionary comprehension or a loop.",
          "`partial(convert, rate=...)` fixes the rate by keyword and leaves `amount` and `fee` for the caller.",
          "Use the rate value from the current item, so each function holds its own number.",
        ],
        task: {
          checks: [
            expr("returns", "converters for EUR and GBP", "_c = make_converters({'EUR': 0.92, 'GBP': 0.79})\nresult = (_c['EUR'](50), _c['GBP'](100, fee=1.5))", py.tuple(py.float(46), py.float(77.5)), { show: "converters['EUR'](50), converters['GBP'](100, fee=1.5)" }),
            expr("three", "three currencies", "_c = make_converters({'EUR': 0.92, 'JPY': 151.0, 'GBP': 0.79})\nresult = [_c[k](10) for k in ['EUR', 'JPY', 'GBP']]", [9.2, py.float(1510), 7.9], { hidden: true }),
            expr("kept", "each converter keeps its rate after the dictionary changes", "_r = {'CAD': 1.37}\n_c = make_converters(_r)\n_r['CAD'] = 2.0\nresult = _c['CAD'](100)", py.float(137), { hidden: true }),
            expr("empty", "no currencies", "result = make_converters({})", {}, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A configurable sort order",
        prompt: "A report sorts OpenAlex works by fields chosen in its settings, such as `[\"-cited_by_count\", \"publication_year\"]`: a leading `-` means descending. Write `field_key(work, fields)` that returns a sort key (a tuple) for one work, and `sort_key(fields)` that returns a one-argument key function for `sorted`, made with `partial`. Descending fields are numbers, so they can be negated.",
        spec: [
          ["field_key(work, fields)", "a tuple with one value per field: the work's value, negated when the field starts with `-`"],
          ["sort_key(fields)", "`partial(field_key, fields=fields)`"],
          ["Example", "`sorted(works, key=sort_key([\"-cited_by_count\"]))` → most cited first"],
        ],
        starter: src`
from functools import partial

def field_key(work, fields):
    return ()

def sort_key(fields):
    return None

works = [
    {"id": "W3021613070", "publication_year": 2020, "cited_by_count": 2362},
    {"id": "W3003257820", "publication_year": 2020, "cited_by_count": 38040},
    {"id": "W2970971581", "publication_year": 2019, "cited_by_count": 31488},
]
print([w["id"] for w in sorted(works, key=sort_key(["publication_year", "-cited_by_count"]))])
`,
        answer: src`
from functools import partial

def field_key(work, fields):
    values = []
    for field in fields:
        if field.startswith("-"):
            values.append(-work[field[1:]])
        else:
            values.append(work[field])
    return tuple(values)

def sort_key(fields):
    return partial(field_key, fields=fields)

works = [
    {"id": "W3021613070", "publication_year": 2020, "cited_by_count": 2362},
    {"id": "W3003257820", "publication_year": 2020, "cited_by_count": 38040},
    {"id": "W2970971581", "publication_year": 2019, "cited_by_count": 31488},
]
print([w["id"] for w in sorted(works, key=sort_key(["publication_year", "-cited_by_count"]))])
`,
        alternatives: [
          src`
from functools import partial

def field_key(work, fields):
    return tuple([-work[f.lstrip("-")] if f[:1] == "-" else work[f] for f in fields])

def sort_key(fields):
    return partial(field_key, fields=list(fields))
`,
        ],
        wrong: [
          {
            code: src`
from functools import partial

def field_key(work, fields):
    return tuple([work[f.lstrip("-")] for f in fields])

def sort_key(fields):
    return partial(field_key, fields=fields)
`,
            fails: ["returns", "single", "key-tuple"],
            why: "the `-` is stripped but never acted on, so every field sorts ascending",
          },
          {
            code: src`
from functools import partial

def field_key(work, fields):
    values = []
    for field in fields:
        if field.startswith("-"):
            values.append(-work[field[1:]])
        else:
            values.append(work[field])
    return tuple(values)

def sort_key(fields):
    return partial(field_key, fields)
`,
            fails: ["returns", "single", "titles"],
            why: "`partial(field_key, fields)` fixes the first parameter, so `sorted` passes the work as `fields`",
          },
        ],
        hints: [
          "`field_key` builds a tuple: for each field, look up the value, negated when the name starts with `-`.",
          "Tuples compare item by item, so the first field decides and later fields break ties.",
          "In `sort_key`, fix `fields` by keyword so the work arrives as the first argument.",
        ],
        task: {
          checks: [
            expr("returns", "year ascending, then citations descending", "_w = [{'id': 'W3021613070', 'publication_year': 2020, 'cited_by_count': 2362}, {'id': 'W3003257820', 'publication_year': 2020, 'cited_by_count': 38040}, {'id': 'W2970971581', 'publication_year': 2019, 'cited_by_count': 31488}]\nresult = [w['id'] for w in sorted(_w, key=sort_key(['publication_year', '-cited_by_count']))]", ["W2970971581", "W3003257820", "W3021613070"], { show: "sorted(works, key=sort_key(['publication_year', '-cited_by_count']))" }),
            expr("key-tuple", "the key for one work", "result = field_key({'publication_year': 2020, 'cited_by_count': 8702}, ['-cited_by_count', 'publication_year'])", py.tuple(py.int(-8702), py.int(2020)), { show: "field_key(work, ['-cited_by_count', 'publication_year'])" }),
            expr("single", "one descending field", "_w = [{'id': 'a', 'cited_by_count': 5}, {'id': 'b', 'cited_by_count': 50}, {'id': 'c', 'cited_by_count': 20}]\nresult = [w['id'] for w in sorted(_w, key=sort_key(['-cited_by_count']))]", ["b", "c", "a"], { hidden: true }),
            expr("titles", "a text field ascending", "_w = [{'title': 'Pymoo', 'publication_year': 2020}, {'title': 'DeepXDE', 'publication_year': 2021}, {'title': 'PsychoPy2', 'publication_year': 2019}]\nresult = [w['title'] for w in sorted(_w, key=sort_key(['title']))]", ["DeepXDE", "PsychoPy2", "Pymoo"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from functools import partial

def label(prefix, text, suffix="!"):
    return prefix + text + suffix

warn = partial(label, "WARNING: ", suffix=".")
print(warn("salt is high"))
print(warn("sugar is high", suffix="!!"))
print(warn.args, warn.keywords)
`,
        choices: [
          "WARNING: salt is high.\nWARNING: sugar is high!!\n('WARNING: ',) {'suffix': '.'}",
          "WARNING: salt is high!\nWARNING: sugar is high!!\n('WARNING: ',) {'suffix': '.'}",
          "WARNING: salt is high.\nWARNING: sugar is high.\n('WARNING: ',) {'suffix': '.'}",
          "salt is highWARNING: .\nsugar is highWARNING: !!\n('WARNING: ',) {'suffix': '.'}",
        ],
        answer: 0,
        why: "The fixed positional argument fills `prefix`, the call's argument fills `text`, and a keyword given at call time overrides the partial's `suffix`. The partial still records what it was created with.",
      },
      {
        id: "q2",
        prompt: "A common mistake: lambdas created in a loop. What does this print?",
        program: src`
from functools import partial

def times(x, factor):
    return x * factor

lambdas = []
partials = []
for factor in [1, 2, 3]:
    lambdas.append(lambda x: times(x, factor))
    partials.append(partial(times, factor=factor))
print([f(10) for f in lambdas])
print([f(10) for f in partials])
`,
        choices: ["[30, 30, 30]\n[10, 20, 30]", "[10, 20, 30]\n[10, 20, 30]", "[30, 30, 30]\n[30, 30, 30]", "[10, 20, 30]\n[30, 30, 30]"],
        answer: 0,
        why: "Each lambda looks up `factor` when it is called, after the loop ended with `factor` = 3. Each partial stored the value of `factor` when it was created.",
      },
      {
        id: "q3",
        prompt: "`sorted(works, key=...)` needs a one-argument function, but your scoring function is `score(work, weights)`. Which is the cleanest key?",
        choices: [
          "`partial(score, weights=my_weights)`",
          "`score(my_weights)`",
          "`partial(score, my_weights)`",
          "`score`",
        ],
        answer: 0,
        why: "Fixing `weights` by keyword leaves `work` as the single argument `sorted` supplies. `partial(score, my_weights)` would put the weights into `work`.",
      },
    ],
    review: [
      "`partial(func, *args, **kwargs)` returns a callable with those arguments filled in; calls add the rest.",
      "Fix arguments by keyword unless they really are the first positional ones.",
      "A partial stores values when it is created, which avoids the late-binding trap of lambdas in loops.",
      "Next: composing functions into pipelines.",
    ],
  },

  // ------------------------------------------------------------------ PY-L34-03 composition
  {
    id: "PY-L34-03",
    version: 2,
    slug: "function-composition",
    title: "Composition: build pipelines from small functions",
    lede: "Composing functions feeds each one's result into the next. A pipeline written as a list of small, pure steps is easy to read, reorder, test and configure, and functools.reduce applies the list in one expression.",
    focus: "Combine small functions into one with composition and pipelines, including with functools.reduce.",
    minutes: 20,
    objectives: [
      "Write `compose` (right to left) and `pipeline` (left to right) for one-argument functions",
      "Apply a list of steps to a value with a loop or `functools.reduce`",
      "Keep each step small and pure so the pipeline can be rearranged and tested",
    ],
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "field-ann", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "partial-call", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "spaces-in-text", "star-args", "star-kwargs", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "unicode-text"],
    teaches: ["compose-call"],
    blocks: [
      {
        kind: "text",
        md: "Cleaning a product name from Open Food Facts takes several small steps: strip the ends, collapse repeated spaces, fix the capitals. Writing them as nested calls, `title(collapse(strip(name)))`, reads inside out. **Composition** builds one function out of several, so the steps can be named, listed and reused.\n\nIn mathematics, `compose(f, g)(x)` is `f(g(x))`: the last function runs first. A **pipeline** lists the steps in the order they run, which most people find easier to read. Both are a loop that feeds each result into the next function, and `functools.reduce(function, items, start)` is exactly that loop: it carries a value through the items.",
      },
      {
        kind: "example",
        title: "compose and pipeline",
        code: src`
from functools import reduce

def compose(*funcs):
    def composed(value):
        for func in reversed(funcs):
            value = func(value)
        return value
    return composed

def pipeline(*steps):
    def run(value):
        return reduce(lambda acc, step: step(acc), steps, value)
    return run

def collapse_spaces(text):
    return " ".join(text.split())

clean = pipeline(str.strip, collapse_spaces, str.title)
same = compose(str.title, collapse_spaces, str.strip)
print(clean("  super   smooth porridge "))
print(same("  super   smooth porridge "))
print(pipeline()("unchanged"))
`,
        output: "Super Smooth Porridge\nSuper Smooth Porridge\nunchanged\n",
        note: "`str.strip` and `str.title` are ordinary functions that take the text as their argument. `reduce` starts with the input and applies each step to the running value. With no steps at all, the input comes back unchanged.",
      },
      {
        kind: "text",
        md: "Steps don't have to work on text. Over a list of records, each step can take a list and return a new one (filter, transform, sort), and the pipeline becomes a small data-processing plan. Because each step is pure, the order is easy to change and each step can be tested on its own.",
      },
      {
        kind: "example",
        title: "A pipeline over product records",
        code: src`
from functools import partial, reduce

def run_steps(rows, steps):
    return reduce(lambda acc, step: step(acc), steps, rows)

def with_name(rows):
    return [row for row in rows if row.get("product_name")]

def tidy_brands(rows):
    return [{**row, "brands": [b.strip() for b in row["brands"]]} for row in rows]

def sugar_at_most(rows, limit):
    return [row for row in rows if row["sugars_100g"] <= limit]

products = [
    {"code": "5010029219494", "product_name": "Super smooth porridge", "brands": ["Weetabix", " Ready break"], "sugars_100g": 1},
    {"code": "7613032192570", "product_name": "NESTLE LION Céréales 480g", "brands": ["Nestlé", " Lion"], "sugars_100g": 25},
    {"code": "0000000000000", "product_name": "", "brands": [], "sugars_100g": 3},
]
steps = [with_name, tidy_brands, partial(sugar_at_most, limit=10)]
for row in run_steps(products, steps):
    print(row["code"], row["brands"])
print(len(products), products[0]["brands"])
`,
        output: "5010029219494 ['Weetabix', 'Ready break']\n3 ['Weetabix', ' Ready break']\n",
        note: "The steps are data: a list you could build from settings. `partial` turned a two-argument step into a one-argument one. The original records are unchanged, because every step returns new lists and dictionaries.",
      },
      {
        kind: "text",
        md: "**When to use it:** text clean-up, record cleaning, transformations configured by settings, anything you would describe as \"first this, then that\". **Mistakes to avoid:** applying the steps in the wrong order (`compose` runs right to left); steps that change their input, which makes the order matter in surprising ways; and steps with different shapes (a step that returns None breaks every step after it).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Steps in the order listed",
      prompt: "`apply_steps` applies the steps last-first, so `[str.strip, str.upper, add_prefix]` adds the prefix before upper-casing. Make it apply the steps in the order they are listed.",
      spec: [
        ["Function", "`apply_steps(value, steps)`"],
        ["Returns", "the value after each step, first to last"],
      ],
      starter: src`
def apply_steps(value, steps):
    for step in reversed(steps):
        value = step(value)
    return value

def add_prefix(code):
    return "OFF-" + code

print(apply_steps("  bran flakes ", [str.strip, str.upper, add_prefix]))
`,
      answer: src`
def apply_steps(value, steps):
    for step in steps:
        value = step(value)
    return value

def add_prefix(code):
    return "OFF-" + code

print(apply_steps("  bran flakes ", [str.strip, str.upper, add_prefix]))
`,
      wrong: [
        {
          code: src`
def apply_steps(value, steps):
    for step in steps:
        step(value)
    return value

def add_prefix(code):
    return "OFF-" + code
`,
          fails: ["returns", "numbers"],
          why: "each step's result is thrown away, so the value never changes",
        },
      ],
      hints: ["`reversed` is what makes the last step run first.", "Loop over the steps as they are.", "Keep assigning each step's result back to `value`."],
      task: {
        checks: [
          expr("returns", "strip, upper, then prefix", "def _prefix(code):\n    return 'OFF-' + code\nresult = apply_steps('  bran flakes ', [str.strip, str.upper, _prefix])", "OFF-BRAN FLAKES", { show: "apply_steps('  bran flakes ', [str.strip, str.upper, add_prefix])" }),
          expr("numbers", "steps on numbers", "def _add(x):\n    return x + 3\ndef _double(x):\n    return x * 2\nresult = apply_steps(1, [_add, _double])", 8, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "compose, the mathematical way",
        prompt: "Write `compose(*funcs)`: return a function of one argument that applies the functions **right to left**, so `compose(f, g, h)(x)` is `f(g(h(x)))`. With no functions it returns its input unchanged. The composed function must work for any one-argument functions, including ones that return different types.",
        spec: [
          ["Function", "`compose(*funcs)`"],
          ["Returns", "a one-argument function; `compose(f, g)(x) == f(g(x))`; `compose()(x) == x`"],
          ["Example", "`compose(len, str.split)(\"Schoko Müsli 750 g\")` → `4`"],
        ],
        starter: src`
from functools import reduce

def compose(*funcs):
    return None

word_count = compose(len, str.split)
print(word_count("Schoko Müsli 750 g"))
`,
        answer: src`
from functools import reduce

def compose(*funcs):
    def composed(value):
        for func in reversed(funcs):
            value = func(value)
        return value
    return composed

word_count = compose(len, str.split)
print(word_count("Schoko Müsli 750 g"))
`,
        alternatives: [
          src`
from functools import reduce

def compose(*funcs):
    return reduce(lambda f, g: lambda x: f(g(x)), funcs, lambda x: x)
`,
        ],
        wrong: [
          {
            code: src`
def compose(*funcs):
    def composed(value):
        for func in funcs:
            value = func(value)
        return value
    return composed
`,
            fails: ["returns", "order", "types"],
            why: "it applies the functions left to right, the opposite of composition",
          },
          {
            code: src`
def compose(*funcs):
    def composed(value):
        result = value
        for func in reversed(funcs):
            result = func(value)
        return result
    return composed
`,
            fails: ["returns", "order", "types"],
            why: "every function is applied to the original input, so only the first function's result survives",
          },
          {
            code: src`
def compose(*funcs):
    def composed(value):
        for func in reversed(funcs):
            value = func(value)
        return value
    return composed if funcs else None
`,
            fails: ["empty"],
            why: "with no functions it returns None instead of a function that returns its input",
          },
        ],
        hints: [
          "`compose` returns an inner function; that inner function does the work when it's called.",
          "Right to left means the last function in `funcs` runs first: loop over `reversed(funcs)`.",
          "Feed each result into the next function; with no functions, the loop doesn't run and the input comes back.",
        ],
        task: {
          checks: [
            expr("returns", "word count of a product name", "result = compose(len, str.split)('Schoko Müsli 750 g')", 4, { show: "compose(len, str.split)('Schoko Müsli 750 g')" }),
            expr("order", "three functions, applied right to left", "def _inc(x):\n    return x + 1\ndef _dbl(x):\n    return x * 2\ndef _sq(x):\n    return x * x\nresult = compose(_inc, _dbl, _sq)(3)", 19, { show: "compose(inc, double, square)(3)" }),
            expr("empty", "no functions at all", "result = compose()('Coco Pops')", "Coco Pops", { hidden: true }),
            expr("types", "functions that change the type", "result = compose(sorted, set, str.lower)('Weetabix')", ["a", "b", "e", "i", "t", "w", "x"], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A cleaner built from settings",
        prompt: "Name cleaning is configured in a settings file as a list of step names, such as `[\"strip\", \"collapse\", \"title\"]`. Write `build_cleaner(names)`: look each name up in the `STEPS` dictionary (in the starter) and return one function that applies those steps in the listed order. An unknown name raises `ValueError` naming it, **when the cleaner is built**, not when it's first used.",
        spec: [
          ["Function", "`build_cleaner(names)`"],
          ["STEPS", "`{\"strip\": str.strip, \"collapse\": collapse_spaces, \"title\": str.title, \"lower\": str.lower, \"ascii\": to_ascii}`"],
          ["Returns", "a one-argument function applying the named steps in order; an empty list gives a function that returns its input"],
          ["Raises", "`ValueError(\"unknown step: shout\")` from `build_cleaner([\"strip\", \"shout\"])`"],
        ],
        starter: src`
import unicodedata

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    return None

clean = build_cleaner(["strip", "collapse", "ascii", "title"])
print(clean("  NESTLE LION   Céréales 480g "))
`,
        answer: src`
import unicodedata

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    steps = []
    for name in names:
        if name not in STEPS:
            raise ValueError(f"unknown step: {name}")
        steps.append(STEPS[name])
    def clean(text):
        for step in steps:
            text = step(text)
        return text
    return clean

clean = build_cleaner(["strip", "collapse", "ascii", "title"])
print(clean("  NESTLE LION   Céréales 480g "))
`,
        alternatives: [
          src`
import unicodedata
from functools import reduce

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    unknown = [n for n in names if n not in STEPS]
    if unknown:
        raise ValueError("unknown step: " + unknown[0])
    chosen = [STEPS[n] for n in names]
    return lambda text: reduce(lambda acc, step: step(acc), chosen, text)
`,
        ],
        wrong: [
          {
            code: src`
import unicodedata

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    def clean(text):
        for name in names:
            if name not in STEPS:
                raise ValueError(f"unknown step: {name}")
            text = STEPS[name](text)
        return text
    return clean
`,
            fails: ["unknown"],
            why: "a typo in the settings is only noticed when the first name is cleaned, not when the cleaner is built",
          },
          {
            code: src`
import unicodedata

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    steps = [STEPS[name] for name in names if name in STEPS]
    def clean(text):
        for step in steps:
            text = step(text)
        return text
    return clean
`,
            fails: ["unknown"],
            why: "unknown names are silently skipped instead of reported",
          },
          {
            code: src`
import unicodedata

def collapse_spaces(text):
    return " ".join(text.split())

def to_ascii(text):
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")

STEPS = {"strip": str.strip, "collapse": collapse_spaces, "title": str.title, "lower": str.lower, "ascii": to_ascii}

def build_cleaner(names):
    steps = []
    for name in names:
        if name not in STEPS:
            raise ValueError(f"unknown step: {name}")
        steps.append(STEPS[name])
    def clean(text):
        for step in reversed(steps):
            text = step(text)
        return text
    return clean
`,
            fails: ["order"],
            why: "the steps run last-first, so the configured order is reversed",
          },
        ],
        hints: [
          "Look every name up first, in `build_cleaner`, so mistakes in the settings show up immediately.",
          "Keep the looked-up functions in a list, in the configured order.",
          "Return an inner function that feeds the text through that list.",
        ],
        task: {
          checks: [
            expr("returns", "strip, collapse, ascii, title", "result = build_cleaner(['strip', 'collapse', 'ascii', 'title'])('  NESTLE LION   Céréales 480g ')", "Nestle Lion Cereales 480G", { show: "build_cleaner(['strip', 'collapse', 'ascii', 'title'])('  NESTLE LION   Céréales 480g ')" }),
            expr("order", "lower before title gives title case", "result = (build_cleaner(['lower', 'title'])('SWISS STYLE MUESLI'), build_cleaner(['title', 'lower'])('SWISS STYLE MUESLI'))", py.tuple(py.str("Swiss Style Muesli"), py.str("swiss style muesli")), { show: "two orders of the same steps" }),
            expr("unknown", "an unknown step is reported when the cleaner is built", "try:\n    build_cleaner(['strip', 'shout'])\n    result = 'built'\nexcept ValueError as _e:\n    result = str(_e)", "unknown step: shout", { hidden: true }),
            expr("empty", "no steps", "result = build_cleaner([])(' Coco Pops ')", " Coco Pops ", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from functools import reduce

def add_vat(price):
    return price * 1.2

def discount(price):
    return price - 5

steps = [discount, add_vat]
print(reduce(lambda value, step: step(value), steps, 50))
print(reduce(lambda value, step: step(value), reversed(steps), 50))
`,
        choices: ["54.0\n55.0", "55.0\n54.0", "54.0\n54.0", "60.0\n55.0"],
        answer: 0,
        why: "In order: (50 − 5) × 1.2 = 54.0. Reversed: 50 × 1.2 − 5 = 55.0. The order of steps changes the answer, so a pipeline must apply them as listed.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a step that changes its input and returns nothing. What does this print?",
        program: src`
def drop_blank(names):
    names.remove("")

names = ["oats", "", "rye"]
value = names
for step in [drop_blank]:
    value = step(value)
print(value, names)
`,
        choices: ["None ['oats', 'rye']", "['oats', 'rye'] ['oats', 'rye']", "['oats', 'rye'] ['oats', '', 'rye']", "None ['oats', '', 'rye']"],
        answer: 0,
        why: "`drop_blank` changed the caller's list and returned nothing, so the pipeline's value became None: the next step would crash. Pipeline steps should return their result (ideally a new list).",
      },
      {
        id: "q3",
        prompt: "Why list pipeline steps as data (`steps = [strip, collapse, title]`) instead of nesting the calls?",
        choices: [
          "The steps can be read in order, chosen or reordered from settings, and tested one by one",
          "Nested calls run more slowly",
          "Python can't nest more than two calls",
          "Lists of functions use less memory",
        ],
        answer: 0,
        why: "A list makes the order explicit and changeable at run time. Nested calls read inside out and are fixed when the code is written.",
      },
    ],
    review: [
      "`compose(f, g)(x)` is `f(g(x))`; a pipeline applies its steps in the order listed.",
      "`functools.reduce(lambda acc, step: step(acc), steps, start)` carries a value through a list of steps.",
      "Small pure steps with one shape (same kind in, same kind out) can be reordered and configured safely.",
      "Next: looking inside objects and functions while the program runs.",
    ],
  },

  // ------------------------------------------------------------------ PY-L34-04 introspection
  {
    id: "PY-L34-04",
    version: 2,
    slug: "introspection",
    title: "Introspection: examine objects while the program runs",
    lede: "Python can answer questions about its own objects: is this callable, does it have this attribute, what parameters does this function take? Tools such as test runners, plugin systems and serialisers are built on those answers.",
    focus: "Use callable, getattr, hasattr, setattr, vars and inspect.signature to examine and use objects you don't know in advance.",
    minutes: 20,
    objectives: [
      "Use `callable`, `hasattr`, `getattr` with a default, and `setattr`",
      "Read a function's parameters, kinds and defaults with `inspect.signature`",
      "Call a plugin function with only the arguments it declares",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comp-if", "comparison", "conditional-expr", "continue-statement", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "encoding-arg", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "keyword-only", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "none-value", "part-attr", "partial-call", "plain-class", "print-call", "print-several", "print-text", "reassignment", "self-name", "star-args", "star-kwargs", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "tuple-literal", "unicode-text", "unquoted-name"],
    teaches: ["callable-call"],
    blocks: [
      {
        kind: "text",
        md: "Most code knows exactly what it works with. Some code has to work with objects it has never seen: a plugin someone else wrote, a settings object, a function passed in by the caller. **Introspection** asks the object about itself: `callable(x)` (can it be called?), `hasattr(obj, \"name\")`, `getattr(obj, \"name\", default)` (read an attribute named by a string, with a fallback), `setattr(obj, \"name\", value)`, `vars(obj)` (an object's attribute dictionary), and for functions `inspect.signature(func)`, which describes every parameter.",
      },
      {
        kind: "example",
        title: "Asking objects about themselves",
        code: src`
import inspect

class Product:
    def __init__(self, code, name):
        self.code = code
        self.name = name

    def label(self):
        return f"{self.name} ({self.code})"

def per_portion(value_per_100g, grams=30, *, round_to=None):
    return value_per_100g * grams / 100

p = Product("5010029000023", "Weetabix")
print(callable(p), callable(p.label), callable(per_portion))
print(getattr(p, "name"), getattr(p, "brand", "unknown brand"), hasattr(p, "label"))
setattr(p, "brand", "Weetabix Ltd")
print(vars(p))
sig = inspect.signature(per_portion)
for name, param in sig.parameters.items():
    print(name, param.kind.name, param.default if param.default is not param.empty else "required")
`,
        output: "False True True\nWeetabix unknown brand True\n{'code': '5010029000023', 'name': 'Weetabix', 'brand': 'Weetabix Ltd'}\nvalue_per_100g POSITIONAL_OR_KEYWORD required\ngrams POSITIONAL_OR_KEYWORD 30\nround_to KEYWORD_ONLY None\n",
        note: "`getattr` with a default doesn't raise for a missing attribute. `vars` shows only the instance's own data, not its methods. `param.empty` is the marker for \"no default\".",
      },
      {
        kind: "text",
        md: "A typical use: a report runs plugin functions written by different teams, and each plugin takes only some of the available data. With `inspect.signature`, the report passes each plugin exactly the arguments it asks for, so plugins can be simple and the report doesn't need to know them in advance.",
      },
      {
        kind: "example",
        title: "Call a plugin with what it asks for",
        code: src`
import inspect

def call_with(func, available):
    params = inspect.signature(func).parameters
    wanted = {name: value for name, value in available.items() if name in params}
    return func(**wanted)

def sugar_warning(sugars_100g):
    return "high sugar" if sugars_100g > 22.5 else None

def fibre_claim(fiber_100g, product_name):
    return f"{product_name}: high fibre" if fiber_100g >= 6 else None

data = {"product_name": "All Bran Flakes", "sugars_100g": 11, "salt_100g": 0.28, "fiber_100g": 16}
for plugin in [sugar_warning, fibre_claim]:
    print(plugin.__name__, "->", call_with(plugin, data))
`,
        output: "sugar_warning -> None\nfibre_claim -> All Bran Flakes: high fibre\n",
        note: "Each plugin received only the keys matching its parameter names. (\"High fibre\" is the EU claim for at least 6 g per 100 g; \"high\" sugar is the UK label above 22.5 g.)",
      },
      {
        kind: "text",
        md: "**When to use it:** frameworks and tools: plugin systems, command-line tools built from functions, serialisers, test runners, settings loaders. **Mistakes to avoid:** using introspection where ordinary code would do (`getattr(obj, \"name\")` with a fixed name is just `obj.name`); `getattr` without a default when the attribute may be missing; trusting attribute names that come from users without checking them; and `setattr` on names that start with `_`, which are private by convention.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A safe attribute read",
      prompt: "`describe` crashes with AttributeError for objects that have no `unit`. Use `getattr` with a default of `\"\"` so a missing unit is simply left out.",
      spec: [
        ["Function", "`describe(obj, field)`"],
        ["Returns", "`\"<field>: <value> <unit>\"`, or `\"<field>: <value>\"` when the object has no `unit` (or it's empty)"],
      ],
      starter: src`
class Reading:
    def __init__(self, value, unit=None):
        self.value = value
        if unit:
            self.unit = unit

def describe(obj, field):
    unit = obj.unit
    text = f"{field}: {obj.value}"
    return f"{text} {unit}" if unit else text

print(describe(Reading(31.7, "°C"), "tmax"))
print(describe(Reading(4), "rating"))
`,
      answer: src`
class Reading:
    def __init__(self, value, unit=None):
        self.value = value
        if unit:
            self.unit = unit

def describe(obj, field):
    unit = getattr(obj, "unit", "")
    text = f"{field}: {obj.value}"
    return f"{text} {unit}" if unit else text

print(describe(Reading(31.7, "°C"), "tmax"))
print(describe(Reading(4), "rating"))
`,
      wrong: [
        {
          code: src`
class Reading:
    def __init__(self, value, unit=None):
        self.value = value
        if unit:
            self.unit = unit

def describe(obj, field):
    unit = getattr(obj, "unit")
    text = f"{field}: {obj.value}"
    return f"{text} {unit}" if unit else text
`,
          fails: ["missing"],
          why: "`getattr` without a default raises AttributeError just like `obj.unit`",
        },
      ],
      hints: ["`obj.unit` fails when the attribute doesn't exist.", "`getattr` can take a third argument.", "Read it with `getattr(obj, \"unit\", \"\")`."],
      task: {
        checks: [
          expr("returns", "a reading with a unit", "result = describe(Reading(31.7, '°C'), 'tmax')", "tmax: 31.7 °C", { show: "describe(Reading(31.7, '°C'), 'tmax')" }),
          expr("missing", "an object without a unit", "result = describe(Reading(4), 'rating')", "rating: 4", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which parameters are required?",
        prompt: "A command-line tool builds its options from a function's parameters. Write `required_params(func)`: return the names of the parameters a caller **must** supply, in order: those without a default, excluding `*args` and `**kwargs` collectors.",
        spec: [
          ["Function", "`required_params(func)`"],
          ["Returns", "a list of names; keyword-only parameters without a default count as required"],
          ["Tools", "`inspect.signature(func).parameters`, each parameter's `.default` and `.kind`"],
        ],
        starter: src`
import inspect

def required_params(func):
    return []

def export(path, fmt="csv", *columns, overwrite, encoding="utf-8", **options):
    return path

print(required_params(export))
`,
        answer: src`
import inspect

def required_params(func):
    required = []
    for name, param in inspect.signature(func).parameters.items():
        if param.kind in (param.VAR_POSITIONAL, param.VAR_KEYWORD):
            continue
        if param.default is param.empty:
            required.append(name)
    return required

def export(path, fmt="csv", *columns, overwrite, encoding="utf-8", **options):
    return path

print(required_params(export))
`,
        alternatives: [
          src`
import inspect

def required_params(func):
    sig = inspect.signature(func)
    collectors = (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
    return [p.name for p in sig.parameters.values() if p.default is inspect.Parameter.empty and p.kind not in collectors]
`,
        ],
        wrong: [
          {
            code: src`
import inspect

def required_params(func):
    return [name for name, param in inspect.signature(func).parameters.items() if param.default is param.empty]
`,
            fails: ["returns", "collectors"],
            why: "`*columns` and `**options` have no default either, but nobody has to supply them",
          },
          {
            code: src`
import inspect

def required_params(func):
    required = []
    for name, param in inspect.signature(func).parameters.items():
        if param.kind is param.POSITIONAL_OR_KEYWORD and param.default is param.empty:
            required.append(name)
    return required
`,
            fails: ["returns", "keyword-only"],
            why: "required keyword-only parameters are missed",
          },
          {
            code: src`
def required_params(func):
    count = func.__code__.co_argcount
    defaults = len(func.__defaults__ or ())
    return list(func.__code__.co_varnames[:count - defaults])
`,
            fails: ["returns", "keyword-only"],
            why: "reading the code object misses keyword-only parameters",
          },
        ],
        hints: [
          "`inspect.signature(func).parameters` is an ordered mapping from name to Parameter.",
          "A parameter without a default has `param.default is param.empty`.",
          "Skip parameters whose kind is `VAR_POSITIONAL` (`*args`) or `VAR_KEYWORD` (`**kwargs`).",
        ],
        task: {
          checks: [
            expr("returns", "required parameters of export", "def _export(path, fmt='csv', *columns, overwrite, encoding='utf-8', **options):\n    return path\nresult = required_params(_export)", ["path", "overwrite"], { show: "required_params(export)" }),
            expr("plain", "a plain function", "def _scale(value, grams=30):\n    return value\nresult = required_params(_scale)", ["value"], { show: "required_params(scale)" }),
            expr("collectors", "only collectors", "def _log(*args, **kwargs):\n    return None\nresult = required_params(_log)", [], { hidden: true }),
            expr("keyword-only", "keyword-only parameters", "def _fetch(url, *, timeout, retries=3, sleep):\n    return url\nresult = required_params(_fetch)", ["url", "timeout", "sleep"], { hidden: true }),
            expr("builtin-like", "no parameters", "def _now():\n    return 0\nresult = required_params(_now)", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Apply settings to an object, safely",
        prompt: "A tool loads settings from a file into a `Settings` object. Write `apply_settings(obj, updates)`: for each key in `updates`, set the attribute when it is a **public, existing, non-callable** attribute of the object; otherwise reject it. Return the sorted list of rejected keys. Never set anything starting with `_`, and never replace a method.",
        spec: [
          ["Function", "`apply_settings(obj, updates)`"],
          ["Sets", "`obj.<key> = value` when `hasattr(obj, key)`, the key doesn't start with `_`, and the current value isn't callable"],
          ["Returns", "the rejected keys, sorted"],
        ],
        starter: src`
class Settings:
    def __init__(self):
        self.currency = "USD"
        self.top_n = 10
        self._secret = "token"

    def save(self):
        return "saved"

def apply_settings(obj, updates):
    return []

s = Settings()
print(apply_settings(s, {"top_n": 5, "save": "oops", "_secret": "x", "colour": "blue"}))
print(s.top_n, s._secret, s.save())
`,
        answer: src`
class Settings:
    def __init__(self):
        self.currency = "USD"
        self.top_n = 10
        self._secret = "token"

    def save(self):
        return "saved"

def apply_settings(obj, updates):
    rejected = []
    for key, value in updates.items():
        allowed = not key.startswith("_") and hasattr(obj, key) and not callable(getattr(obj, key))
        if allowed:
            setattr(obj, key, value)
        else:
            rejected.append(key)
    return sorted(rejected)

s = Settings()
print(apply_settings(s, {"top_n": 5, "save": "oops", "_secret": "x", "colour": "blue"}))
print(s.top_n, s._secret, s.save())
`,
        alternatives: [
          src`
class Settings:
    def __init__(self):
        self.currency = "USD"
        self.top_n = 10
        self._secret = "token"

    def save(self):
        return "saved"

def apply_settings(obj, updates):
    bad = []
    for key in updates:
        if key[:1] == "_" or not hasattr(obj, key):
            bad.append(key)
        elif callable(getattr(obj, key)):
            bad.append(key)
        else:
            setattr(obj, key, updates[key])
    bad.sort()
    return bad
`,
        ],
        wrong: [
          {
            code: src`
def apply_settings(obj, updates):
    rejected = []
    for key, value in updates.items():
        if hasattr(obj, key):
            setattr(obj, key, value)
        else:
            rejected.append(key)
    return sorted(rejected)
`,
            fails: ["returns", "private", "method"],
            why: "private attributes and methods are overwritten too",
          },
          {
            code: src`
def apply_settings(obj, updates):
    rejected = []
    for key, value in updates.items():
        if not key.startswith("_") and not callable(getattr(obj, key, None)):
            setattr(obj, key, value)
        else:
            rejected.append(key)
    return sorted(rejected)
`,
            fails: ["returns", "unknown"],
            why: "unknown keys are added as new attributes instead of rejected, so a typo goes unnoticed",
          },
        ],
        hints: [
          "Three tests per key: not private, the attribute exists, and its current value isn't callable.",
          "`getattr(obj, key)` reads the current value; `callable(...)` tells you whether it's a method.",
          "`setattr` sets an attribute whose name is held in a variable; collect the rejected keys and sort them.",
        ],
        task: {
          checks: [
            expr("returns", "the allowed key is set and the others are rejected", "class Settings:\n    def __init__(self):\n        self.currency = 'USD'\n        self.top_n = 10\n        self._secret = 'token'\n    def save(self):\n        return 'saved'\n_s = Settings()\n_r = apply_settings(_s, {'top_n': 5, 'save': 'oops', '_secret': 'x', 'colour': 'blue'})\nresult = (_r, _s.top_n, _s._secret, _s.save())", py.tuple(pv(["_secret", "colour", "save"]), py.int(5), py.str("token"), py.str("saved")), { show: "rejected keys, then top_n, _secret and save() afterwards" }),
            expr("several", "several valid settings", "class Settings:\n    def __init__(self):\n        self.currency = 'USD'\n        self.top_n = 10\n        self._secret = 'token'\n    def save(self):\n        return 'saved'\n_s = Settings()\n_r = apply_settings(_s, {'currency': 'EUR', 'top_n': 3})\nresult = (_r, _s.currency, _s.top_n)", py.tuple(py.list(), py.str("EUR"), py.int(3)), { show: "apply_settings(s, {'currency': 'EUR', 'top_n': 3})" }),
            expr("private", "a private attribute", "class Settings:\n    def __init__(self):\n        self.currency = 'USD'\n        self.top_n = 10\n        self._secret = 'token'\n    def save(self):\n        return 'saved'\n_s = Settings()\napply_settings(_s, {'_secret': 'stolen'})\nresult = _s._secret", "token", { hidden: true }),
            expr("method", "a method name", "class Settings:\n    def __init__(self):\n        self.currency = 'USD'\n        self.top_n = 10\n        self._secret = 'token'\n    def save(self):\n        return 'saved'\n_s = Settings()\napply_settings(_s, {'save': None})\nresult = _s.save()", "saved", { hidden: true }),
            expr("unknown", "an unknown key", "class Settings:\n    def __init__(self):\n        self.currency = 'USD'\n        self.top_n = 10\n        self._secret = 'token'\n    def save(self):\n        return 'saved'\n_s = Settings()\n_r = apply_settings(_s, {'currncy': 'EUR'})\nresult = (_r, hasattr(_s, 'currncy'), _s.currency)", py.tuple(pv(["currncy"]), py.bool(false), py.str("USD")), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from functools import partial

def scale(value, grams=100):
    return value * grams / 100

per_30g = partial(scale, grams=30)
print(callable(per_30g), hasattr(per_30g, "__name__"), per_30g.func.__name__)
print(getattr(scale, "__doc__", "no docs"), getattr(scale, "unit", "g"))
`,
        choices: ["True False scale\nNone g", "True True per_30g\nNone g", "False False scale\nno docs g", "True False scale\nno docs g"],
        answer: 0,
        why: "A partial is callable but has no `__name__` of its own; its `.func` is `scale`. `scale` has a `__doc__` attribute whose value is None, so `getattr` returns None rather than the default. `unit` doesn't exist, so the default `g` is used.",
      },
      {
        id: "q2",
        prompt: "A common mistake: checking a parameter's default with a truth test. What does this print?",
        program: src`
import inspect

def export(path, overwrite=False, limit=0):
    return path

required = [n for n, p in inspect.signature(export).parameters.items() if not p.default]
print(required)
`,
        choices: ["['overwrite', 'limit']", "['path']", "['path', 'overwrite', 'limit']", "[]"],
        answer: 0,
        why: "`p.default` for `path` is the marker `inspect.Parameter.empty`, which is truthy, so `path` is left out; the defaults `False` and `0` are falsy, so those parameters are wrongly listed. Compare with `p.default is p.empty` instead.",
      },
      {
        id: "q3",
        prompt: "When is `getattr(obj, name)` the right tool rather than `obj.something`?",
        choices: [
          "When the attribute name is only known while the program runs, for example from a settings file",
          "Whenever you read an attribute, because it is faster",
          "When the attribute is private",
          "When the object is a dictionary",
        ],
        answer: 0,
        why: "With a fixed name, write `obj.name`. `getattr` exists for names held in variables. For dictionaries, use keys and `get`.",
      },
    ],
    review: [
      "`callable`, `hasattr`, `getattr(obj, name, default)`, `setattr` and `vars` examine and change objects by name.",
      "`inspect.signature(func).parameters` describes each parameter: its kind and default (`param.empty` if none).",
      "Use introspection for tools that handle unknown objects; ordinary code should just use the attribute.",
      "Next: registries, which choose which function to run from data.",
    ],
  },

  // ------------------------------------------------------------------ PY-L34-05 registries
  {
    id: "PY-L34-05",
    version: 2,
    slug: "function-registry",
    title: "Registries: choose a function from data",
    lede: "A dictionary from names to functions replaces a growing if/elif chain: the program looks up which function to run from data, such as a file format or an event type. A registration decorator lets each function add itself, so new handlers don't require editing the dispatcher.",
    focus: "Dispatch through a dictionary of functions and fill it with a registration decorator.",
    minutes: 20,
    objectives: [
      "Replace an if/elif chain on a name with a dictionary lookup, with a clear error for unknown names",
      "Write a decorator factory that registers functions under a name and returns them unchanged",
      "Decide what happens to duplicates and unknown names",
    ],
    requires: ["arithmetic", "assignment", "callable-call", "comparison", "conditional-expr", "continue-statement", "conversion", "counter-call", "decorator-at", "decorator-call", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-comp", "newline-escape", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "star-args", "string-format", "string-index", "top-level-indent", "try-except", "unquoted-name"],
    teaches: ["register-map"],
    blocks: [
      {
        kind: "text",
        md: "An export function that handles CSV, JSON and Markdown usually starts as `if fmt == \"csv\": ... elif fmt == \"json\": ...`. Every new format edits that chain, and the code for each format is buried inside it. A **registry** is a dictionary from a name to the function that handles it: the dispatcher becomes `REGISTRY[fmt](data)`, each handler is a small function of its own, and the list of supported names is `list(REGISTRY)`.",
      },
      {
        kind: "example",
        title: "Dispatch through a dictionary",
        code: src`
import json

def to_csv(rows):
    header = ",".join(rows[0])
    lines = [",".join(str(row[key]) for key in rows[0]) for row in rows]
    return "\n".join([header] + lines)

def to_json(rows):
    return json.dumps(rows)

EXPORTERS = {"csv": to_csv, "json": to_json}

def export(rows, fmt):
    try:
        exporter = EXPORTERS[fmt]
    except KeyError:
        raise ValueError(f"unknown format {fmt!r}; choose from {', '.join(EXPORTERS)}") from None
    return exporter(rows)

rows = [{"code": "20621483", "sugars_100g": 13.2}, {"code": "01771879", "sugars_100g": 14.3}]
print(export(rows, "csv"))
print(export(rows, "json"))
try:
    export(rows, "xml")
except ValueError as err:
    print(err)
`,
        output: "code,sugars_100g\n20621483,13.2\n01771879,14.3\n[{\"code\": \"20621483\", \"sugars_100g\": 13.2}, {\"code\": \"01771879\", \"sugars_100g\": 14.3}]\nunknown format 'xml'; choose from csv, json\n",
        note: "Adding a format is one function and one dictionary entry; `export` never changes. `from None` hides the internal KeyError from the traceback, because the ValueError says everything.",
      },
      {
        kind: "text",
        md: "With many handlers, writing the dictionary by hand gets error-prone. A **registration decorator** (a factory, the Decorators & Context Managers module) lets each handler register itself where it is defined. The decorator stores the function and returns it **unchanged**, so it is still an ordinary function too.",
      },
      {
        kind: "example",
        title: "Handlers that register themselves",
        code: src`
HANDLERS = {}

def handles(event_type):
    def register(func):
        if event_type in HANDLERS:
            raise ValueError(f"{event_type} already handled by {HANDLERS[event_type].__name__}")
        HANDLERS[event_type] = func
        return func
    return register

@handles("WatchEvent")
def starred(event):
    return f"{event['actor']} starred {event['repo']}"

@handles("ForkEvent")
def forked(event):
    return f"{event['actor']} forked {event['repo']}"

def describe(event):
    handler = HANDLERS.get(event["type"])
    return handler(event) if handler else f"({event['type']} not shown)"

events = [
    {"type": "WatchEvent", "actor": "stackkoi785", "repo": "tidewater/smartqueue"},
    {"type": "PushEvent", "actor": "data_fox514", "repo": "cobalt-tools/deeplint"},
    {"type": "ForkEvent", "actor": "hack_lynx150", "repo": "tidewater/smartqueue"},
]
for event in events:
    print(describe(event))
print(sorted(HANDLERS), starred(events[0]) == describe(events[0]))
`,
        output: "stackkoi785 starred tidewater/smartqueue\n(PushEvent not shown)\nhack_lynx150 forked tidewater/smartqueue\n['ForkEvent', 'WatchEvent'] True\n",
        note: "Registering a second handler for the same type raises immediately, instead of silently replacing the first. Unknown types get a default here; whether to skip, use a default or raise is a design decision to make on purpose.",
      },
      {
        kind: "text",
        md: "**When to use it:** formats, commands, event types, unit conversions, validation rules: anything chosen by a name that may grow. **Mistakes to avoid:** storing the result of calling the function (`HANDLERS[t] = func()`) instead of the function; forgetting `return func` in the registering decorator (the decorated name becomes None); letting a second registration silently overwrite the first; and a bare `KeyError` for an unknown name instead of a message listing the valid ones.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Register the Markdown exporter",
      prompt: "`to_markdown` exists, but `export(rows, \"md\")` says the format is unknown. Register it in `EXPORTERS` under `\"md\"`.",
      spec: [
        ["Dispatcher", "`export(rows, fmt)` looks the format up in `EXPORTERS`"],
        ["Add", "`\"md\"` → `to_markdown`"],
      ],
      starter: src`
def to_csv(rows):
    return "\n".join([",".join(rows[0])] + [",".join(str(v) for v in row.values()) for row in rows])

def to_markdown(rows):
    header = "| " + " | ".join(rows[0]) + " |"
    lines = ["| " + " | ".join(str(v) for v in row.values()) + " |" for row in rows]
    return "\n".join([header] + lines)

EXPORTERS = {"csv": to_csv}

def export(rows, fmt):
    if fmt not in EXPORTERS:
        raise ValueError(f"unknown format {fmt!r}")
    return EXPORTERS[fmt](rows)

print(export([{"code": "20621483", "grade": "b"}], "md"))
`,
      answer: src`
def to_csv(rows):
    return "\n".join([",".join(rows[0])] + [",".join(str(v) for v in row.values()) for row in rows])

def to_markdown(rows):
    header = "| " + " | ".join(rows[0]) + " |"
    lines = ["| " + " | ".join(str(v) for v in row.values()) + " |" for row in rows]
    return "\n".join([header] + lines)

EXPORTERS = {"csv": to_csv, "md": to_markdown}

def export(rows, fmt):
    if fmt not in EXPORTERS:
        raise ValueError(f"unknown format {fmt!r}")
    return EXPORTERS[fmt](rows)

print(export([{"code": "20621483", "grade": "b"}], "md"))
`,
      wrong: [
        {
          code: src`
def to_csv(rows):
    return "\n".join([",".join(rows[0])] + [",".join(str(v) for v in row.values()) for row in rows])

def to_markdown(rows):
    header = "| " + " | ".join(rows[0]) + " |"
    lines = ["| " + " | ".join(str(v) for v in row.values()) + " |" for row in rows]
    return "\n".join([header] + lines)

EXPORTERS = {"csv": to_csv, "md": to_markdown([{"code": ""}])}

def export(rows, fmt):
    if fmt not in EXPORTERS:
        raise ValueError(f"unknown format {fmt!r}")
    return EXPORTERS[fmt](rows)
`,
          fails: ["returns", "csv-still"],
          why: "the registry stores the text one call returned, not the function",
        },
      ],
      hints: ["The dispatcher only knows the names in `EXPORTERS`.", "Add an entry to the dictionary.", "The value is the function itself, without brackets: `to_markdown`."],
      task: {
        checks: [
          expr("returns", "Markdown export", "result = export([{'code': '20621483', 'grade': 'b'}], 'md')", "| code | grade |\n| 20621483 | b |", { show: "export([{'code': '20621483', 'grade': 'b'}], 'md')" }),
          expr("csv-still", "CSV still works", "result = (export([{'a': 1}], 'csv'), sorted(EXPORTERS), callable(EXPORTERS['md']))", py.tuple(py.str("a\n1"), pv(["csv", "md"]), py.bool(true)), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A command registry",
        prompt: "A maintenance tool runs commands by name. Write a decorator factory `command(name)` that registers a function in `COMMANDS` and returns it unchanged, raising `ValueError` if the name is already taken. Then write `run(name, *args)`: call the registered function with the arguments, or raise `KeyError` with the message `\"unknown command 'x'; available: a, b\"` (names sorted).",
        spec: [
          ["command(name)", "registers the decorated function under `name`; duplicate names raise `ValueError`; returns the function itself"],
          ["run(name, *args)", "returns the command's result"],
          ["Unknown", "`KeyError(\"unknown command 'purge'; available: export, sync\")`"],
        ],
        starter: src`
COMMANDS = {}

def command(name):
    def register(func):
        return func
    return register

def run(name, *args):
    return None

@command("sync")
def sync(repo):
    return f"synced {repo}"

print(run("sync", "tidewater/smartqueue"))
`,
        answer: src`
COMMANDS = {}

def command(name):
    def register(func):
        if name in COMMANDS:
            raise ValueError(f"command {name!r} is already registered")
        COMMANDS[name] = func
        return func
    return register

def run(name, *args):
    if name not in COMMANDS:
        available = ", ".join(sorted(COMMANDS))
        raise KeyError(f"unknown command {name!r}; available: {available}")
    return COMMANDS[name](*args)

@command("sync")
def sync(repo):
    return f"synced {repo}"

print(run("sync", "tidewater/smartqueue"))
`,
        alternatives: [
          src`
COMMANDS = {}

def command(name):
    def register(func):
        if COMMANDS.get(name) is not None:
            raise ValueError("duplicate command " + name)
        COMMANDS[name] = func
        return func
    return register

def run(name, *args):
    try:
        func = COMMANDS[name]
    except KeyError:
        raise KeyError("unknown command " + repr(name) + "; available: " + ", ".join(sorted(COMMANDS))) from None
    return func(*args)

@command("sync")
def sync(repo):
    return f"synced {repo}"
`,
        ],
        wrong: [
          {
            code: src`
COMMANDS = {}

def command(name):
    def register(func):
        COMMANDS[name] = func
    return register

def run(name, *args):
    if name not in COMMANDS:
        raise KeyError(f"unknown command {name!r}; available: {', '.join(sorted(COMMANDS))}")
    return COMMANDS[name](*args)

@command("sync")
def sync(repo):
    return f"synced {repo}"
`,
            fails: ["unchanged", "duplicate"],
            why: "the decorator returns None, so the decorated name is lost, and duplicates silently replace each other",
          },
          {
            code: src`
COMMANDS = {}

def command(name):
    def register(func):
        if name in COMMANDS:
            raise ValueError(name)
        COMMANDS[name] = func
        return func
    return register

def run(name, *args):
    return COMMANDS[name](*args)

@command("sync")
def sync(repo):
    return f"synced {repo}"
`,
            fails: ["unknown"],
            why: "an unknown name gives a bare KeyError that doesn't say what's available",
          },
        ],
        hints: [
          "In `register`, check for the name, store the function, and return the function itself.",
          "`run` looks the name up and calls the function with `*args`.",
          "For an unknown name, build the message from the sorted names in `COMMANDS` before raising.",
        ],
        task: {
          checks: [
            expr("returns", "a registered command runs", "result = run('sync', 'tidewater/smartqueue')", "synced tidewater/smartqueue", { show: "run('sync', 'tidewater/smartqueue')" }),
            expr("unchanged", "the decorated function still works on its own", "@command('m34-export')\ndef _export(path, fmt):\n    return path + '.' + fmt\nresult = (_export('summary', 'csv'), run('m34-export', 'summary', 'json'))", py.tuple(py.str("summary.csv"), py.str("summary.json")), { show: "export('summary', 'csv'), run('export', 'summary', 'json')" }),
            expr("unknown", "an unknown command lists the available ones", "COMMANDS.clear()\n@command('sync')\ndef _s():\n    return 1\n@command('export')\ndef _e():\n    return 2\ntry:\n    run('purge')\n    result = 'ran'\nexcept KeyError as _err:\n    result = _err.args[0]", "unknown command 'purge'; available: export, sync", { hidden: true }),
            expr("duplicate", "registering a name twice", "COMMANDS.clear()\n@command('dup')\ndef _a():\n    return 'a'\ntry:\n    @command('dup')\n    def _b():\n        return 'b'\n    result = run('dup')\nexcept ValueError:\n    result = 'refused'", "refused", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Summarise an event stream",
        prompt: "Write `summarise(events, handlers)`: `handlers` is a registry from event type to a function that turns an event into a short line. Return `(lines, skipped)`: the lines for events whose type has a handler, in order, and a dictionary counting the events of each type that had no handler. A handler that returns `None` means \"nothing to show\" and adds no line.",
        spec: [
          ["Function", "`summarise(events, handlers)`"],
          ["events", "dictionaries with at least `type`"],
          ["Returns", "`(lines, skipped)`, e.g. `(['stackkoi785 starred tidewater/smartqueue'], {'PushEvent': 2})`"],
        ],
        starter: src`
def summarise(events, handlers):
    return ([], {})

def starred(event):
    return f"{event['actor']} starred {event['repo']}"

events = [
    {"type": "WatchEvent", "actor": "stackkoi785", "repo": "tidewater/smartqueue"},
    {"type": "PushEvent", "actor": "data_fox514", "repo": "cobalt-tools/deeplint"},
    {"type": "PushEvent", "actor": "data_fox514", "repo": "cobalt-tools/deeplint"},
]
print(summarise(events, {"WatchEvent": starred}))
`,
        answer: src`
def summarise(events, handlers):
    lines = []
    skipped = {}
    for event in events:
        handler = handlers.get(event["type"])
        if handler is None:
            skipped[event["type"]] = skipped.get(event["type"], 0) + 1
            continue
        line = handler(event)
        if line is not None:
            lines.append(line)
    return (lines, skipped)

def starred(event):
    return f"{event['actor']} starred {event['repo']}"

events = [
    {"type": "WatchEvent", "actor": "stackkoi785", "repo": "tidewater/smartqueue"},
    {"type": "PushEvent", "actor": "data_fox514", "repo": "cobalt-tools/deeplint"},
    {"type": "PushEvent", "actor": "data_fox514", "repo": "cobalt-tools/deeplint"},
]
print(summarise(events, {"WatchEvent": starred}))
`,
        alternatives: [
          src`
from collections import Counter

def summarise(events, handlers):
    shown = []
    missing = Counter()
    for event in events:
        if event["type"] not in handlers:
            missing[event["type"]] += 1
        else:
            text = handlers[event["type"]](event)
            if text is not None:
                shown.append(text)
    return shown, dict(missing)
`,
        ],
        wrong: [
          {
            code: src`
def summarise(events, handlers):
    lines = []
    skipped = {}
    for event in events:
        if event["type"] in handlers:
            lines.append(handlers[event["type"]](event))
        else:
            skipped[event["type"]] = skipped.get(event["type"], 0) + 1
    return (lines, skipped)
`,
            fails: ["none-lines"],
            why: "a handler's None is added to the lines instead of being dropped",
          },
          {
            code: src`
def summarise(events, handlers):
    lines = []
    skipped = {}
    for event in events:
        handler = handlers.get(event["type"])
        if handler is None:
            skipped[event["type"]] = 1
            continue
        line = handler(event)
        if line is not None:
            lines.append(line)
    return (lines, skipped)
`,
            fails: ["returns", "many"],
            why: "each skipped type is counted as 1, however many events it had",
          },
        ],
        hints: [
          "Look each event's handler up with `get`, so a missing type gives None instead of an error.",
          "No handler: count the type (starting at 0 the first time). A handler: call it and keep the line unless it is None.",
          "Return the two results as a tuple.",
        ],
        task: {
          checks: [
            expr("returns", "one star shown, two pushes skipped", "def _starred(e):\n    return f\"{e['actor']} starred {e['repo']}\"\n_ev = [{'type': 'WatchEvent', 'actor': 'stackkoi785', 'repo': 'tidewater/smartqueue'}, {'type': 'PushEvent', 'actor': 'data_fox514', 'repo': 'cobalt-tools/deeplint'}, {'type': 'PushEvent', 'actor': 'data_fox514', 'repo': 'cobalt-tools/deeplint'}]\nresult = summarise(_ev, {'WatchEvent': _starred})", py.tuple(pv(["stackkoi785 starred tidewater/smartqueue"]), pv({ PushEvent: 2 })), { show: "summarise(events, {'WatchEvent': starred})" }),
            expr("none-lines", "a handler that has nothing to show", "def _maybe(e):\n    return None if e.get('draft') else 'release ' + e['tag']\n_ev = [{'type': 'ReleaseEvent', 'tag': 'v2.1', 'draft': True}, {'type': 'ReleaseEvent', 'tag': 'v2.2', 'draft': False}]\nresult = summarise(_ev, {'ReleaseEvent': _maybe})", py.tuple(pv(["release v2.2"]), pv({})), { show: "summarise(events, {'ReleaseEvent': show_release}) with one draft release" }),
            expr("many", "several unhandled types", "_ev = [{'type': t} for t in ['IssuesEvent', 'PushEvent', 'IssuesEvent', 'ForkEvent', 'IssuesEvent']]\nresult = summarise(_ev, {})", py.tuple(py.list(), pv({ IssuesEvent: 3, PushEvent: 1, ForkEvent: 1 })), { hidden: true }),
            expr("empty", "no events", "result = summarise([], {'WatchEvent': len})", py.tuple(py.list(), pv({})), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
REGISTRY = {}

def register(name):
    def store(func):
        REGISTRY[name] = func
        return func
    return store

@register("kcal")
def to_kcal(kj):
    return kj / 4.184

@register("kj")
def to_kj(kcal):
    return kcal * 4.184

print(sorted(REGISTRY), round(REGISTRY["kj"](100), 1), to_kcal.__name__)
`,
        choices: ["['kcal', 'kj'] 418.4 to_kcal", "['to_kcal', 'to_kj'] 418.4 to_kcal", "['kcal', 'kj'] 23.9 to_kcal", "['kcal', 'kj'] 418.4 store"],
        answer: 0,
        why: "The registry is keyed by the names given to `register`. `REGISTRY[\"kj\"]` is `to_kj`, and 100 × 4.184 = 418.4. `store` returns the function unchanged, so `to_kcal` keeps its own name.",
      },
      {
        id: "q2",
        prompt: "A common mistake: storing the result instead of the function. What does this print?",
        program: src`
def to_csv(rows):
    return "csv"

def to_json(rows):
    return "json"

EXPORTERS = {"csv": to_csv([]), "json": to_json}
for name, exporter in EXPORTERS.items():
    print(name, callable(exporter))
`,
        choices: ["csv False\njson True", "csv True\njson True", "csv False\njson False", "TypeError"],
        answer: 0,
        why: "`to_csv([])` ran once while the dictionary was built and stored its result, the text `\"csv\"`. Store the function itself, without brackets, and call it later.",
      },
      {
        id: "q3",
        prompt: "Which situation is the best fit for a registry?",
        choices: [
          "Choosing a parser by file extension, where new formats are added every few months",
          "Adding two numbers",
          "Reading one known setting from a file",
          "Sorting a list of fares",
        ],
        answer: 0,
        why: "A registry pays off when a name chooses among handlers and the set of names grows. The others have one fixed behaviour.",
      },
    ],
    review: [
      "A dictionary from names to functions replaces an if/elif chain; unknown names deserve a clear error.",
      "A registration decorator stores the function and returns it unchanged; decide what duplicates do.",
      "Store functions, not the results of calling them.",
      "Next (see Algorithms & Complexity): measuring how much work an algorithm does as its input grows.",
    ],
  },
];
