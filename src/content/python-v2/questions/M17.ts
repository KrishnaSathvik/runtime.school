/**
 * M17 practice: ten independent problems on nested data (PY-L17-01 … PY-L17-05).
 *
 * Mix: 3 function implementations, 2 data transformations, 2 debugging (a function that returns too early; shared
 * default settings), 1 validation, 1 refactoring (behaviour preserved, graded by the same cases plus a limit on
 * nested `if`s), 1 output prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures are small slices of course datasets: D09 (Open Food Facts products: nested nutriments and tag lists),
 * D02 (Online Retail II invoices), D08 (USGS earthquake GeoJSON) and D12 (Runtime Q&A questions and answers).
 * Every function question is graded by calling the learner's function on public examples and hidden inputs
 * (missing keys, None values, empty lists, ties, out-of-range positions); mutation is checked where it matters.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures

const weetabix = { code: "5010029000023", brands: ["Weetabix"], nutriments: { "energy-kcal_100g": 362, sugars_100g: 4.4, fiber_100g: 10 }, allergens_tags: ["en:gluten"] };
const bruggen = { code: "4008713756661", brands: ["Brüggen"], nutriments: { "energy-kcal_100g": 368, sugars_100g: 1.2 }, allergens_tags: ["en:gluten"] };
const oatly = { code: "7394376616228", brands: ["Oatly"], nutriments: { sugars_100g: 4 }, allergens_tags: ["en:gluten", "en:oats"] };
const yogurt = { code: "0070470003023", brands: ["Yoplait"], nutriments: { sugars_100g: 11.5 }, allergens_tags: ["en:milk"] };
const chips = { code: "0028400090896", brands: ["Lay's"], nutriments: {} };

const invoices = [
  { invoice: "489434", lines: [{ stock_code: "85048", quantity: 12, price: 6.95 }, { stock_code: "79323P", quantity: 12, price: 6.75 }] },
  { invoice: "489435", lines: [{ stock_code: "22350", quantity: 12, price: 2.55 }] },
  { invoice: "C489449", lines: [{ stock_code: "22087", quantity: -12, price: 2.95 }] },
];

const quake = (id: string | null, mag: number | null, place: string, coords: number[] | null) => {
  const f: Record<string, unknown> = { type: "Feature" };
  if (id !== null) f.id = id;
  f.properties = { mag, place };
  if (coords !== null) f.geometry = { type: "Point", coordinates: coords };
  return f;
};

const regionFeatures = [
  quake("us6000pw7c", 4.3, "79 km S of Champerico, Guatemala", [-91.9089, 13.5727, 10]),
  quake("ak0252r9gt13", 2.7, "Southern Alaska", [-147.2371, 61.4029, 9.6]),
  quake("us6000pw7t", 4.4, "69 km S of Champerico, Guatemala", [-91.867, 13.6626, 37.388]),
  quake("us7000pp3c", 3.6, "48 km SSE of Adak, Alaska", [-176.3629, 51.4765, 33.783]),
];

const page = {
  type: "FeatureCollection",
  metadata: { count: 2, status: 200 },
  features: [
    { id: "us6000pw8f", properties: { mag: 4.6, felt: 1, alert: null }, geometry: { coordinates: [122.5991, 8.8699, 10] } },
    { id: "us6000pw8e", properties: { mag: 4.4, felt: null }, geometry: { coordinates: [-68.546, -21.7883, 123.298] } },
  ],
};

const qaQuestions = [
  { question_id: 70015316, title: "TypeError when I inherit from a base class", tags: ["python"] },
  { question_id: 70015402, title: "Why does my CSV have blank lines?", tags: ["csv"] },
  { question_id: 70015577, title: "How do I read a gzip file?", tags: [] },
];
const qaAnswers = [
  { answer_id: 70009556, question_id: 70015316, score: 4 },
  { answer_id: 70009601, question_id: 70015402, score: 9 },
  { answer_id: 70009587, question_id: 70015316, score: 11 },
  { answer_id: 70009612, question_id: 70015316, score: 4 },
  { answer_id: 70009999, question_id: 69999999, score: 2 },
];

// Prerequisite tags shared by most questions: a function that walks a list of dictionaries.
const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "if-statement", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m17Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q17-02",
    version: 2,
    slug: "the-inner-title",
    title: "Sugar in one serving",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "nested-dict", "nested-lookup", "dict-get", "none-value", "identity", "arithmetic", "print-several", "comparison", "logical"],
    prompt: "Open Food Facts stores nutrition **per 100 g** inside each product's `nutriments` dictionary, and leaves out what it doesn't know. A tracking app wants the sugar in the amount someone actually ate.",
    spec: [
      ["Function", "`sugar_in_serving(product, grams)`"],
      ["product", "a dictionary that may have `\"nutriments\"`, which may have `\"sugars_100g\"` (a number, or None)"],
      ["Returns", "`sugars_100g * grams / 100`, or `None` when the sugar value is missing or None"],
      ["Rules", "a sugar value of 0 is a real value (0.0 g), not missing"],
    ],
    hiddenKinds: ["a product with no nutriments at all", "a sugar value stored as None", "a sugar value of zero", "a serving of zero grams"],
    hints: [
      "Two levels can be missing: the `nutriments` dictionary and the `sugars_100g` key inside it.",
      "`get` with an empty dictionary as the default keeps the second lookup safe.",
      "Test the sugar value with `is None`; a plain truth test would treat 0 as missing.",
    ],
    explanation: "Reach the value with `product.get(\"nutriments\", {}).get(\"sugars_100g\")`, return None when that is None, and otherwise scale it. `is None` matters: a sugar-free drink has `sugars_100g` 0, and `if not sugar` would wrongly call it unknown. Brackets crash on a product without nutrition data.",
    code: {
      starter: src`
def sugar_in_serving(product, grams):
    return None

weetabix = {"code": "5010029000023", "brands": ["Weetabix"], "nutriments": {"energy-kcal_100g": 362, "sugars_100g": 4.4, "fiber_100g": 10}, "allergens_tags": ["en:gluten"]}
print(sugar_in_serving(weetabix, 40))
`,
      answer: src`
def sugar_in_serving(product, grams):
    sugar = product.get("nutriments", {}).get("sugars_100g")
    if sugar is None:
        return None
    return sugar * grams / 100

weetabix = {"code": "5010029000023", "brands": ["Weetabix"], "nutriments": {"energy-kcal_100g": 362, "sugars_100g": 4.4, "fiber_100g": 10}, "allergens_tags": ["en:gluten"]}
print(sugar_in_serving(weetabix, 40))
`,
      alternatives: [
        src`
def sugar_in_serving(product, grams):
    if "nutriments" not in product:
        return None
    per_100 = product["nutriments"].get("sugars_100g")
    if per_100 is None:
        return None
    return per_100 / 100 * grams
`,
      ],
      wrong: [
        {
          code: src`
def sugar_in_serving(product, grams):
    sugar = product["nutriments"]["sugars_100g"]
    if sugar is None:
        return None
    return sugar * grams / 100
`,
          fails: ["returns"],
          why: "a product with no nutrition data (or no sugar key) raises KeyError",
        },
        {
          code: src`
def sugar_in_serving(product, grams):
    sugar = product.get("nutriments", {}).get("sugars_100g")
    if not sugar:
        return None
    return sugar * grams / 100
`,
          fails: ["returns"],
          why: "`not sugar` is also true for 0, so a sugar-free product is reported as unknown",
        },
        {
          code: src`
def sugar_in_serving(product, grams):
    return product.get("nutriments", {}).get("sugars_100g", 0) * grams / 100
`,
          fails: ["returns"],
          why: "an unknown value is reported as 0 g, and a stored None crashes",
        },
      ],
      task: {
        checks: [
          fn("returns", "sugar_in_serving", [
            example([weetabix, 40], 1.76),
            example([yogurt, 150], 17.25),
            example([chips, 30], null),
            hiddenCase("a product with no nutriments at all", [{ code: "1", brands: [] }, 50], null),
            hiddenCase("a sugar value stored as None", [{ code: "2", nutriments: { sugars_100g: null } }, 50], null),
            hiddenCase("a sugar value of zero", [{ code: "3", nutriments: { sugars_100g: 0 } }, 250], py.float(0)),
            hiddenCase("a serving of zero grams", [bruggen, 0], py.float(0)),
          ], { label: "sugar_in_serving() scales the sugar per 100 g", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
  {
    id: "PY-Q17-03",
    version: 2,
    slug: "tags-under-the-sku",
    title: "Invoice totals that stop at one",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "nested-lookup", "walk-nested", "nested-loop", "arithmetic", "reassignment", "dict-iterate", "tuple-unpack", "print-several", "nested-dict", "precedence"],
    prompt: "`invoice_totals` should return the total of every invoice (quantity × price over its lines). The finance team says the report only ever shows the first invoice. Find the bug and fix it.",
    spec: [
      ["Function", "`invoice_totals(invoices)`"],
      ["invoices", "dictionaries with `invoice` and `lines`: a list of `{\"stock_code\", \"quantity\", \"price\"}`"],
      ["Returns", "`{invoice number: total}` for every invoice, in order; an invoice with no lines totals 0"],
      ["Keep", "the function name and what it returns; only the bug should change"],
    ],
    hiddenKinds: ["a cancellation with a negative quantity", "an invoice with no lines", "many invoices", "no invoices"],
    hints: [
      "Run the starter with two invoices and look at how many keys come back.",
      "Find the line that ends the function, and check which loop it sits inside.",
      "The result is only complete after the outer loop has visited every invoice.",
    ],
    explanation: "`return totals` was indented into the outer loop, so the function returned at the end of the first invoice. Moving it out to the function's own indentation lets every invoice be visited. `total = 0` must stay inside the outer loop (each invoice starts from zero); moving it out produces running totals.",
    code: {
      starter: src`
def invoice_totals(invoices):
    totals = {}
    for invoice in invoices:
        total = 0
        for line in invoice["lines"]:
            total += line["quantity"] * line["price"]
        totals[invoice["invoice"]] = total
        return totals

invoices = [
    {"invoice": "489434", "lines": [{"stock_code": "85048", "quantity": 12, "price": 6.95}, {"stock_code": "79323P", "quantity": 12, "price": 6.75}]},
    {"invoice": "489435", "lines": [{"stock_code": "22350", "quantity": 12, "price": 2.55}]},
    {"invoice": "C489449", "lines": [{"stock_code": "22087", "quantity": -12, "price": 2.95}]},
]
for number, total in invoice_totals(invoices).items():
    print(number, total)
`,
      answer: src`
def invoice_totals(invoices):
    totals = {}
    for invoice in invoices:
        total = 0
        for line in invoice["lines"]:
            total += line["quantity"] * line["price"]
        totals[invoice["invoice"]] = total
    return totals

invoices = [
    {"invoice": "489434", "lines": [{"stock_code": "85048", "quantity": 12, "price": 6.95}, {"stock_code": "79323P", "quantity": 12, "price": 6.75}]},
    {"invoice": "489435", "lines": [{"stock_code": "22350", "quantity": 12, "price": 2.55}]},
    {"invoice": "C489449", "lines": [{"stock_code": "22087", "quantity": -12, "price": 2.95}]},
]
for number, total in invoice_totals(invoices).items():
    print(number, total)
`,
      alternatives: [
        src`
def invoice_totals(invoices):
    totals = {}
    for invoice in invoices:
        totals[invoice["invoice"]] = 0
        for line in invoice["lines"]:
            totals[invoice["invoice"]] += line["quantity"] * line["price"]
    return totals
`,
      ],
      wrong: [
        {
          code: src`
def invoice_totals(invoices):
    totals = {}
    total = 0
    for invoice in invoices:
        for line in invoice["lines"]:
            total += line["quantity"] * line["price"]
        totals[invoice["invoice"]] = total
    return totals
`,
          fails: ["returns"],
          why: "the total no longer restarts, so each invoice shows a running total of all invoices so far",
        },
        {
          code: src`
def invoice_totals(invoices):
    totals = {}
    for invoice in invoices:
        total = 0
        for line in invoice["lines"]:
            total += line["quantity"] * line["price"]
            totals[invoice["invoice"]] = total
    return totals
`,
          fails: ["returns"],
          why: "an invoice with no lines is never stored, because the assignment moved into the inner loop",
        },
      ],
      task: {
        checks: [
          fn("returns", "invoice_totals", [
            example([invoices], { "489434": 164.4, "489435": 30.6, C489449: -35.4 }),
            example([[invoices[1]]], { "489435": 30.6 }),
            example([[invoices[0], invoices[1]]], { "489434": 164.4, "489435": 30.6 }),
            hiddenCase("a cancellation with a negative quantity", [[invoices[2], invoices[1]]], { C489449: -35.4, "489435": 30.6 }),
            hiddenCase("an invoice with no lines", [[{ invoice: "490001", lines: [] }, invoices[1]]], { "490001": 0, "489435": 30.6 }),
            hiddenCase("many invoices", [[{ invoice: "a", lines: [{ stock_code: "x", quantity: 1, price: 1 }] }, { invoice: "b", lines: [{ stock_code: "y", quantity: 2, price: 2 }] }, { invoice: "c", lines: [{ stock_code: "z", quantity: 3, price: 3 }] }]], { a: 1, b: 4, c: 9 }),
            hiddenCase("no invoices", [[]], {}),
          ], { label: "invoice_totals() totals every invoice", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
  {
    id: "PY-Q17-06",
    version: 2,
    slug: "second-row-first-cell",
    title: "Allergen counts across a range",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "walk-nested", "nested-loop", "dict-get", "string-method", "string-slice", "arithmetic", "print-several", "dict-iterate", "tuple-unpack", "conditional-expr", "continue-statement", "logical", "truthiness"],
    prompt: "A shop wants to know how many of its products contain each allergen. Open Food Facts lists allergens per product as tags like `\"en:gluten\"`, and leaves the list out when it has none.",
    spec: [
      ["Function", "`allergen_counts(products)`"],
      ["products", "dictionaries that may have `\"allergens_tags\"`: a list of texts like `\"en:milk\"`"],
      ["Returns", "`{allergen: number of products}` with the `\"en:\"` prefix removed, in the order allergens are first met"],
      ["Rules", "a product without `allergens_tags` contributes nothing; a tag without the `en:` prefix is kept as it is"],
    ],
    hiddenKinds: ["products with no allergen list", "a tag without the en: prefix", "one product with several allergens", "no products"],
    hints: [
      "Walk each product's allergen list with an inner loop; a missing list can be treated as an empty one.",
      "Count with a dictionary: create the key with 0 the first time, then add 1.",
      "Only remove `en:` when the tag starts with it; `startswith` and a slice do that.",
    ],
    explanation: "For each product, `product.get(\"allergens_tags\", [])` gives a list (empty when missing), and an inner loop counts each tag after stripping a leading `en:`. `replace(\"en:\", \"\")` looks similar but would also mangle a tag that merely contains `en:` in the middle; `startswith` plus a slice removes only the prefix.",
    code: {
      starter: src`
def allergen_counts(products):
    counts = {}
    return counts

products = [
    {"code": "5010029000023", "brands": ["Weetabix"], "allergens_tags": ["en:gluten"]},
    {"code": "7394376616228", "brands": ["Oatly"], "allergens_tags": ["en:gluten", "en:oats"]},
    {"code": "0070470003023", "brands": ["Yoplait"], "allergens_tags": ["en:milk"]},
    {"code": "0028400090896", "brands": ["Lay's"]},
]
print(allergen_counts(products))
`,
      answer: src`
def allergen_counts(products):
    counts = {}
    for product in products:
        for tag in product.get("allergens_tags", []):
            if tag.startswith("en:"):
                tag = tag[3:]
            if tag not in counts:
                counts[tag] = 0
            counts[tag] += 1
    return counts

products = [
    {"code": "5010029000023", "brands": ["Weetabix"], "allergens_tags": ["en:gluten"]},
    {"code": "7394376616228", "brands": ["Oatly"], "allergens_tags": ["en:gluten", "en:oats"]},
    {"code": "0070470003023", "brands": ["Yoplait"], "allergens_tags": ["en:milk"]},
    {"code": "0028400090896", "brands": ["Lay's"]},
]
print(allergen_counts(products))
`,
      alternatives: [
        src`
def allergen_counts(products):
    counts = {}
    for product in products:
        if "allergens_tags" not in product:
            continue
        for tag in product["allergens_tags"]:
            name = tag[3:] if tag.startswith("en:") else tag
            counts[name] = counts.get(name, 0) + 1
    return counts
`,
      ],
      wrong: [
        {
          code: src`
def allergen_counts(products):
    counts = {}
    for product in products:
        for tag in product["allergens_tags"]:
            name = tag[3:]
            if name not in counts:
                counts[name] = 0
            counts[name] += 1
    return counts
`,
          fails: ["returns", "keeps-input"],
          why: "a product without an allergen list raises KeyError, and a tag without the prefix loses its first three letters",
        },
        {
          code: src`
def allergen_counts(products):
    counts = {}
    for product in products:
        for tag in product.get("allergens_tags", []):
            if tag not in counts:
                counts[tag] = 0
            counts[tag] += 1
    return counts
`,
          fails: ["returns"],
          why: "the `en:` prefix is left on, so the keys are `en:gluten` instead of `gluten`",
        },
        {
          code: src`
def allergen_counts(products):
    counts = {}
    for product in products:
        tags = product.get("allergens_tags", [])
        for tag in tags:
            name = tag.replace("en:", "")
            counts[name] = len(tags)
    return counts
`,
          fails: ["returns"],
          why: "it stores the size of each product's list instead of counting products",
        },
      ],
      task: {
        checks: [
          fn("returns", "allergen_counts", [
            example([[weetabix, oatly, yogurt, chips]], { gluten: 2, oats: 1, milk: 1 }),
            example([[chips]], {}),
            example([[yogurt, yogurt]], { milk: 2 }),
            hiddenCase("products with no allergen list", [[chips, { code: "9" }]], {}),
            hiddenCase("a tag without the en: prefix", [[{ code: "1", allergens_tags: ["fr:lait", "en:milk"] }]], { "fr:lait": 1, milk: 1 }),
            hiddenCase("one product with several allergens", [[{ code: "2", allergens_tags: ["en:milk", "en:soybeans", "en:nuts"] }]], { milk: 1, soybeans: 1, nuts: 1 }),
            hiddenCase("no products", [[]], {}),
          ], { label: "allergen_counts() counts products per allergen" }),
          fn("keeps-input", "allergen_counts", [
            keepsInput([[weetabix, oatly, yogurt, chips]]),
            keepsInput([[{ code: "1", allergens_tags: ["en:milk"] }]], { label: "a single product" }),
          ], { label: "allergen_counts() leaves the products unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q17-10",
    version: 2,
    slug: "qty-falls-back-to-zero",
    title: "Is this earthquake record usable?",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "nested-lookup", "dict-get", "none-value", "identity", "logical", "comparison", "len-call", "print-several", "else-clause", "nested-dict"],
    prompt: "Before loading a feed into a map, a data team rejects GeoJSON features that can't be drawn or ranked. Report every problem a feature has, so the feed's owner can fix them all at once.",
    spec: [
      ["Function", "`feature_problems(feature)`"],
      ["Checks, in this order", "`\"no id\"` when `id` is missing or None; `\"no magnitude\"` when `properties` or its `mag` is missing or None; `\"bad coordinates\"` when `geometry` or its `coordinates` is missing, or the list doesn't hold exactly 3 values"],
      ["Returns", "a list of the problem texts that apply, in the order above; `[]` for a usable feature"],
    ],
    hiddenKinds: ["a magnitude of zero", "coordinates with only two values", "a feature with no geometry", "everything missing", "a magnitude stored as None"],
    hints: [
      "Three independent checks, each appending its own message: don't stop at the first problem.",
      "Reach each value with `get` and an empty dictionary default, then test it with `is None`.",
      "A magnitude of 0 is a real reading; only missing or None counts as a problem. Coordinates need a length test too.",
    ],
    explanation: "Each check reaches its value safely (`feature.get(\"properties\", {}).get(\"mag\")`) and appends a message when the value is unusable. Using `if` rather than `elif` reports every problem; `is None` keeps a magnitude of 0 valid; and `len(...) != 3` catches a point with no depth. Bracket lookups crash on exactly the records this check exists to catch.",
    code: {
      starter: src`
def feature_problems(feature):
    problems = []
    return problems

feature = {"type": "Feature", "properties": {"mag": None, "place": "Southern Alaska"}, "geometry": {"type": "Point", "coordinates": [-147.2371, 61.4029]}}
print(feature_problems(feature))
`,
      answer: src`
def feature_problems(feature):
    problems = []
    if feature.get("id") is None:
        problems.append("no id")
    if feature.get("properties", {}).get("mag") is None:
        problems.append("no magnitude")
    coordinates = feature.get("geometry", {}).get("coordinates")
    if coordinates is None or len(coordinates) != 3:
        problems.append("bad coordinates")
    return problems

feature = {"type": "Feature", "properties": {"mag": None, "place": "Southern Alaska"}, "geometry": {"type": "Point", "coordinates": [-147.2371, 61.4029]}}
print(feature_problems(feature))
`,
      alternatives: [
        src`
def feature_problems(feature):
    problems = []
    if "id" not in feature or feature["id"] is None:
        problems.append("no id")
    props = feature.get("properties", {})
    if props.get("mag") is None:
        problems.append("no magnitude")
    geometry = feature.get("geometry", {})
    if "coordinates" not in geometry:
        problems.append("bad coordinates")
    elif len(geometry["coordinates"]) != 3:
        problems.append("bad coordinates")
    return problems
`,
      ],
      wrong: [
        {
          code: src`
def feature_problems(feature):
    if feature.get("id") is None:
        return ["no id"]
    if feature.get("properties", {}).get("mag") is None:
        return ["no magnitude"]
    coordinates = feature.get("geometry", {}).get("coordinates")
    if coordinates is None or len(coordinates) != 3:
        return ["bad coordinates"]
    return []
`,
          fails: ["returns"],
          why: "it stops at the first problem, so a feature with several problems reports only one",
        },
        {
          code: src`
def feature_problems(feature):
    problems = []
    if not feature.get("id"):
        problems.append("no id")
    if not feature.get("properties", {}).get("mag"):
        problems.append("no magnitude")
    coordinates = feature.get("geometry", {}).get("coordinates")
    if coordinates is None or len(coordinates) != 3:
        problems.append("bad coordinates")
    return problems
`,
          fails: ["returns"],
          why: "a magnitude of 0 is treated as missing",
        },
        {
          code: src`
def feature_problems(feature):
    problems = []
    if feature.get("id") is None:
        problems.append("no id")
    if feature.get("properties", {}).get("mag") is None:
        problems.append("no magnitude")
    if feature.get("geometry", {}).get("coordinates") is None:
        problems.append("bad coordinates")
    return problems
`,
          fails: ["returns"],
          why: "coordinates with the wrong number of values are accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "feature_problems", [
            example([quake(null, null, "Southern Alaska", [-147.2371, 61.4029])], ["no id", "no magnitude", "bad coordinates"]),
            example([quake("us6000pw77", 4.7, "Arctic Ocean", [-107.5679, 80.7069, 10])], []),
            example([quake("ak0252r9gt13", null, "Southern Alaska", [-147.2371, 61.4029, 9.6])], ["no magnitude"]),
            hiddenCase("a magnitude of zero", [quake("x1", 0, "test", [1, 2, 3])], []),
            hiddenCase("coordinates with only two values", [quake("x2", 3.1, "test", [1, 2])], ["bad coordinates"]),
            hiddenCase("a feature with no geometry", [quake("x3", 3.1, "test", null)], ["bad coordinates"]),
            hiddenCase("everything missing", [{}], ["no id", "no magnitude", "bad coordinates"]),
            hiddenCase("an id stored as None", [{ id: null, properties: { mag: 2.5 }, geometry: { coordinates: [0, 0, 5] } }], ["no id"]),
          ], { label: "feature_problems() reports every problem in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q17-12",
    version: 2,
    slug: "nested-dictionaries-predict",
    title: "A job copied from the defaults",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "dict-literal", "dict-lookup", "nested-dict", "nested-lookup", "dict-get", "list-copy", "arithmetic", "len-call", "print-call", "print-several", "string-index", "none-value", "list-mutate", "print-text"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`copy()` gives `job` its own outer dictionary. Which values inside it are still shared with `defaults`?",
      "Replacing `job[\"retries\"]` and adding `job[\"timeout\"]` only touch the outer copy. Changing a value inside `job[\"headers\"]` is different.",
      "`get` on a key that `defaults` never had returns None. Count `defaults`' keys at the end.",
    ],
    explanation: "`job[\"retries\"]` becomes 4 but `defaults[\"retries\"]` stays 3, because assigning a key changes only the outer copy. `job[\"headers\"]` is the same dictionary as `defaults[\"headers\"]`, so setting `Accept` to csv is visible through both. Adding `timeout` to `job` doesn't add it to `defaults`, which still has 2 keys, and `defaults.get(\"timeout\")` is None.",
    predict: {
      program: src`
defaults = {"retries": 3, "headers": {"Accept": "application/json"}}
job = defaults.copy()
job["retries"] = job.get("retries", 0) + 1
job["headers"]["Accept"] = "text/csv"
job["timeout"] = defaults.get("timeout")
print(defaults["retries"], job["retries"])
print(defaults["headers"]["Accept"])
print(len(defaults), len(job), job["timeout"])
`,
      output: "3 4\ntext/csv\n2 3 None\n",
      wrongPredictions: [
        "4 4\ntext/csv\n3 3 None",
        "3 4\napplication/json\n2 3 None",
        "3 4\ntext/csv\n3 3 None",
        "3 1\ntext/csv\n2 3 0",
      ],
    },
  },
  {
    id: "PY-Q17-13",
    version: 2,
    slug: "every-account-shares-tags",
    title: "Every new account gets everyone's tags",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "nested-dict", "nested-lookup", "nested-copy", "list-copy", "boolean", "print-several", "logical", "arithmetic", "print-text"],
    prompt: "Accounts start from shared `DEFAULTS`. After a few sign-ups, support notices that each new account shows the tags of every earlier account, and switching SMS on for one person switched it on for others. Fix `new_account` so every account owns its own settings and `DEFAULTS` never changes.",
    spec: [
      ["Function", "`new_account(user_id, tags)`"],
      ["Returns", "a new dictionary: `user_id`, `notify` (`{\"email\": True, \"sms\": False}`) and `tags` (the given tags, in order)"],
      ["Rules", "two accounts never share their `notify` dictionary or their `tags` list, with each other, with `DEFAULTS` or with the list passed in"],
      ["Keep", "`DEFAULTS` and the function's name and result; only the bug should change"],
    ],
    hiddenKinds: ["changing one account's notify settings after creating another", "the list passed in is changed later", "an account with no tags"],
    hints: [
      "Print `DEFAULTS` after creating two accounts. What has changed?",
      "`DEFAULTS.copy()` makes a new outer dictionary, but its `notify` and `tags` values are still the ones inside `DEFAULTS`.",
      "Give each account its own copy of every inner dictionary or list it might change, not just the outer one.",
    ],
    explanation: "`copy()` copied only the outer dictionary, so every account's `tags` was the one list inside `DEFAULTS`, and every `append` added to it; `notify` was shared the same way. Copying `notify` and building a fresh `tags` list per account fixes both. Storing the caller's `tags` list directly would avoid the append but tie the account to a list the caller may change later.",
    code: {
      starter: src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    account = DEFAULTS.copy()
    account["user_id"] = user_id
    for tag in tags:
        account["tags"].append(tag)
    return account

ana = new_account("u-ana", ["beta"])
ben = new_account("u-ben", ["vip"])
print(ben["tags"])
print(DEFAULTS)
`,
      answer: src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    account = DEFAULTS.copy()
    account["user_id"] = user_id
    account["notify"] = DEFAULTS["notify"].copy()
    account["tags"] = DEFAULTS["tags"].copy()
    for tag in tags:
        account["tags"].append(tag)
    return account

ana = new_account("u-ana", ["beta"])
ben = new_account("u-ben", ["vip"])
print(ben["tags"])
print(DEFAULTS)
`,
      alternatives: [
        src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    return {
        "notify": DEFAULTS["notify"].copy(),
        "tags": DEFAULTS["tags"] + list(tags),
        "user_id": user_id,
    }
`,
      ],
      wrong: [
        {
          code: src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    account = DEFAULTS.copy()
    account["user_id"] = user_id
    account["tags"] = []
    for tag in tags:
        account["tags"].append(tag)
    return account
`,
          fails: ["separate"],
          why: "the tags are fixed, but every account still shares the one `notify` dictionary",
        },
        {
          code: src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    account = DEFAULTS.copy()
    account["user_id"] = user_id
    account["notify"] = DEFAULTS["notify"].copy()
    account["tags"] = tags
    return account
`,
          fails: ["separate"],
          why: "the account holds the caller's own list, so changing that list later changes the account",
        },
        {
          code: src`
DEFAULTS = {"notify": {"email": True, "sms": False}, "tags": []}

def new_account(user_id, tags):
    account = dict(DEFAULTS)
    account["user_id"] = user_id
    for tag in tags:
        account["tags"].append(tag)
    return account
`,
          fails: ["returns", "separate"],
          why: "`dict(DEFAULTS)` is the same one-level copy as `copy()`",
        },
      ],
      task: {
        checks: [
          fn("returns", "new_account", [
            example(["u-ana", ["beta"]], { user_id: "u-ana", notify: { email: true, sms: false }, tags: ["beta"] }),
            example(["u-ben", ["vip", "eu"]], { user_id: "u-ben", notify: { email: true, sms: false }, tags: ["vip", "eu"] }),
            example(["u-cai", []], { user_id: "u-cai", notify: { email: true, sms: false }, tags: [] }),
          ], { label: "new_account() returns a fresh account each time" }),
          {
            kind: "expr",
            id: "separate",
            label: "Accounts never share their settings with each other, with DEFAULTS or with the caller's list",
            hidden: true,
            expr: [
              "_tags = ['beta']",
              "_a = new_account('a', _tags)",
              "_b = new_account('b', [])",
              "_a['notify']['sms'] = True",
              "_tags.append('changed later')",
              "result = (_b['notify']['sms'] is False and _b['tags'] == [] and _a['tags'] == ['beta']",
              "          and DEFAULTS == {'notify': {'email': True, 'sms': False}, 'tags': []})",
            ].join("\n"),
            expected: py.bool(true),
            tip: "Create two accounts, change one account's notify settings and the list you passed in: nothing else should change.",
          },
        ],
      },
    },
  },
  {
    id: "PY-Q17-16",
    version: 2,
    slug: "earthquakes-per-region",
    title: "Earthquakes per region",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "nested-dict", "nested-lookup", "string-method", "string-find", "string-slice", "comparison", "none-value", "identity", "continue-statement", "arithmetic", "print-several", "dict-iterate", "tuple-unpack", "else-clause", "aggregate-call", "logical", "string-split"],
    prompt: "A seismology dashboard groups a page of USGS events by region and shows how many there were and the largest magnitude. The region is the part of `place` after its **last** `\", \"` (`\"79 km S of Champerico, Guatemala\"` → `\"Guatemala\"`); a place with no comma is its own region (`\"Southern Alaska\"`).",
    spec: [
      ["Function", "`region_stats(features)`"],
      ["features", "GeoJSON features with `properties` → `place` and `properties` → `mag`"],
      ["Returns", "`{region: {\"count\": n, \"max_mag\": m}}`, regions in the order first seen"],
      ["Rules", "events whose `mag` is None are left out entirely"],
    ],
    hiddenKinds: ["a place with several commas", "an event with no magnitude", "a smaller magnitude after a larger one", "no events"],
    hints: [
      "First work out the region from `place`: find the last comma-space, and keep what follows it (or the whole place if there is none).",
      "Each region's value is itself a dictionary with two fields; create it the first time the region is seen.",
      "Update the count every time, and the maximum only when the new magnitude is larger.",
    ],
    explanation: "`place.rfind(\", \")` finds the last separator (or -1), so slicing after it gives the region. Each region holds a small dictionary: create `{\"count\": 0, \"max_mag\": mag}` on first sight, then add 1 and keep the larger magnitude. `split(\", \")[1]` breaks on places with two commas, and comparing with `>=` doesn't matter here, but skipping the None check crashes the comparison.",
    code: {
      starter: src`
def region_stats(features):
    stats = {}
    return stats

features = [
    {"id": "us6000pw7c", "properties": {"mag": 4.3, "place": "79 km S of Champerico, Guatemala"}},
    {"id": "ak0252r9gt13", "properties": {"mag": 2.7, "place": "Southern Alaska"}},
    {"id": "us6000pw7t", "properties": {"mag": 4.4, "place": "69 km S of Champerico, Guatemala"}},
    {"id": "us7000pp3c", "properties": {"mag": 3.6, "place": "48 km SSE of Adak, Alaska"}},
]
for region, numbers in region_stats(features).items():
    print(region, numbers)
`,
      answer: src`
def region_of(place):
    cut = place.rfind(", ")
    if cut == -1:
        return place
    return place[cut + 2:]

def region_stats(features):
    stats = {}
    for feature in features:
        mag = feature["properties"]["mag"]
        if mag is None:
            continue
        region = region_of(feature["properties"]["place"])
        if region not in stats:
            stats[region] = {"count": 0, "max_mag": mag}
        stats[region]["count"] += 1
        if mag > stats[region]["max_mag"]:
            stats[region]["max_mag"] = mag
    return stats

features = [
    {"id": "us6000pw7c", "properties": {"mag": 4.3, "place": "79 km S of Champerico, Guatemala"}},
    {"id": "ak0252r9gt13", "properties": {"mag": 2.7, "place": "Southern Alaska"}},
    {"id": "us6000pw7t", "properties": {"mag": 4.4, "place": "69 km S of Champerico, Guatemala"}},
    {"id": "us7000pp3c", "properties": {"mag": 3.6, "place": "48 km SSE of Adak, Alaska"}},
]
for region, numbers in region_stats(features).items():
    print(region, numbers)
`,
      alternatives: [
        src`
def region_stats(features):
    stats = {}
    for feature in features:
        props = feature["properties"]
        if props["mag"] is None:
            continue
        region = props["place"].split(", ")[-1]
        if region in stats:
            stats[region]["count"] += 1
            stats[region]["max_mag"] = max(stats[region]["max_mag"], props["mag"])
        else:
            stats[region] = {"count": 1, "max_mag": props["mag"]}
    return stats
`,
      ],
      wrong: [
        {
          code: src`
def region_stats(features):
    stats = {}
    for feature in features:
        props = feature["properties"]
        if props["mag"] is None:
            continue
        region = props["place"].split(", ")[1]
        if region not in stats:
            stats[region] = {"count": 0, "max_mag": props["mag"]}
        stats[region]["count"] += 1
        if props["mag"] > stats[region]["max_mag"]:
            stats[region]["max_mag"] = props["mag"]
    return stats
`,
          fails: ["returns"],
          why: "position 1 is wrong when a place has no comma (IndexError) or more than one",
        },
        {
          code: src`
def region_stats(features):
    stats = {}
    for feature in features:
        props = feature["properties"]
        if props["mag"] is None:
            continue
        region = props["place"].split(", ")[-1]
        if region not in stats:
            stats[region] = {"count": 0, "max_mag": props["mag"]}
        stats[region]["count"] += 1
        stats[region]["max_mag"] = props["mag"]
    return stats
`,
          fails: ["returns"],
          why: "the last magnitude seen replaces the maximum, even when it is smaller",
        },
        {
          code: src`
def region_stats(features):
    stats = {}
    for feature in features:
        props = feature["properties"]
        region = props["place"].split(", ")[-1]
        if region not in stats:
            stats[region] = {"count": 0, "max_mag": 0}
        stats[region]["count"] += 1
        if props["mag"] > stats[region]["max_mag"]:
            stats[region]["max_mag"] = props["mag"]
    return stats
`,
          fails: ["returns"],
          why: "an event with no magnitude crashes the comparison instead of being left out",
        },
      ],
      task: {
        checks: [
          fn("returns", "region_stats", [
            example([regionFeatures], { Guatemala: { count: 2, max_mag: 4.4 }, "Southern Alaska": { count: 1, max_mag: 2.7 }, Alaska: { count: 1, max_mag: 3.6 } }),
            example([[regionFeatures[1]]], { "Southern Alaska": { count: 1, max_mag: 2.7 } }),
            example([[]], {}),
            hiddenCase("a place with several commas", [[quake("p1", 3.6, "Rat Islands, Aleutian Islands, Alaska", [0, 0, 1])]], { Alaska: { count: 1, max_mag: 3.6 } }),
            hiddenCase("an event with no magnitude", [[quake("n1", null, "Southern Alaska", [0, 0, 1]), quake("n2", 2.5, "Southern Alaska", [0, 0, 1])]], { "Southern Alaska": { count: 1, max_mag: 2.5 } }),
            hiddenCase("a smaller magnitude after a larger one", [[quake("s1", 4.6, "x, Chile", [0, 0, 1]), quake("s2", 4.4, "y, Chile", [0, 0, 1]), quake("s3", 4.5, "z, Chile", [0, 0, 1])]], { Chile: { count: 3, max_mag: 4.6 } }),
            hiddenCase("only events with no magnitude", [[quake("z1", null, "Arctic Ocean", [0, 0, 1])]], {}),
          ], { label: "region_stats() counts events and keeps the largest magnitude per region" }),
        ],
      },
    },
  },
  {
    id: "PY-Q17-19",
    version: 2,
    slug: "flatten-the-arrow-code",
    title: "Flatten the arrow-shaped lookups",
    format: "refactoring",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "nested-dict", "nested-lookup", "dict-get", "none-value", "identity", "logical", "string-format", "nested-condition", "print-several", "print-text", "reassignment"],
    prompt: "`summary` works, but every value is guarded by three nested `if`s, so the code drifts right like an arrow and is hard to change. Refactor it with `get` so it reads straight down. **Behaviour must not change**, including the original's handling of a value stored as `None` (it falls back to the default, exactly like a missing key).",
    spec: [
      ["Function", "`summary(feature)` (same name, same result)"],
      ["Returns", "`\"<alert> alert, felt by <felt>\"`, with `\"green\"` and `0` when the alert or felt value is missing or None"],
      ["Constraint", "at most two `if` statements in your whole program"],
    ],
    hiddenKinds: ["a feature with no properties", "values stored as None", "an alert but no felt count", "a felt count of zero"],
    hints: [
      "Reach the properties once with `get` and an empty dictionary default, and store them in a name.",
      "`get` can return None for a stored None even when you give a default, and the original treated that as missing.",
      "One `if … is None` per value is enough to keep the old behaviour.",
    ],
    explanation: "`props = feature.get(\"properties\", {})` replaces the outer test, and `props.get(\"alert\")` replaces the middle one. The innermost test (`is not None`) is the one people drop: `props.get(\"felt\", 0)` returns None for a stored None, which would print `felt by None`. Keeping one `is None` fallback per value preserves the behaviour in two `if`s instead of six.",
    code: {
      starter: src`
def summary(feature):
    alert = "green"
    if "properties" in feature:
        if "alert" in feature["properties"]:
            if feature["properties"]["alert"] is not None:
                alert = feature["properties"]["alert"]
    felt = 0
    if "properties" in feature:
        if "felt" in feature["properties"]:
            if feature["properties"]["felt"] is not None:
                felt = feature["properties"]["felt"]
    return f"{alert} alert, felt by {felt}"

print(summary({"id": "us6000pw8f", "properties": {"mag": 4.6, "felt": 1, "alert": None}}))
`,
      answer: src`
def summary(feature):
    props = feature.get("properties", {})
    alert = props.get("alert")
    if alert is None:
        alert = "green"
    felt = props.get("felt")
    if felt is None:
        felt = 0
    return f"{alert} alert, felt by {felt}"

print(summary({"id": "us6000pw8f", "properties": {"mag": 4.6, "felt": 1, "alert": None}}))
`,
      alternatives: [
        src`
def value_or(props, key, default):
    value = props.get(key)
    if value is None:
        return default
    return value

def summary(feature):
    props = feature.get("properties", {})
    return f"{value_or(props, 'alert', 'green')} alert, felt by {value_or(props, 'felt', 0)}"
`,
      ],
      wrong: [
        {
          code: src`
def summary(feature):
    props = feature.get("properties", {})
    alert = props.get("alert", "green")
    felt = props.get("felt", 0)
    return f"{alert} alert, felt by {felt}"
`,
          fails: ["returns"],
          why: "a value stored as None now prints `None` instead of the default",
        },
        {
          code: src`
def summary(feature):
    alert = feature["properties"].get("alert")
    if alert is None:
        alert = "green"
    felt = feature["properties"].get("felt")
    if felt is None:
        felt = 0
    return f"{alert} alert, felt by {felt}"
`,
          fails: ["returns"],
          why: "a feature with no properties now raises KeyError",
        },
        {
          code: src`
def summary(feature):
    alert = "green"
    felt = 0
    if "properties" in feature:
        if feature["properties"].get("alert") is not None:
            alert = feature["properties"]["alert"]
        if feature["properties"].get("felt") is not None:
            felt = feature["properties"]["felt"]
    return f"{alert} alert, felt by {felt}"
`,
          fails: ["flat"],
          why: "the behaviour is right, but it still nests `if`s: three where two will do",
        },
      ],
      task: {
        checks: [
          fn("returns", "summary", [
            example([page.features[0]], "green alert, felt by 1"),
            example([{ id: "us7000p001", properties: { mag: 6.1, alert: "yellow", felt: 312 } }], "yellow alert, felt by 312"),
            example([{ id: "us6000pw77", properties: { mag: 4.7 } }], "green alert, felt by 0"),
            hiddenCase("a feature with no properties", [{ id: "x" }], "green alert, felt by 0"),
            hiddenCase("values stored as None", [{ id: "y", properties: { alert: null, felt: null } }], "green alert, felt by 0"),
            hiddenCase("an alert but no felt count", [{ id: "z", properties: { alert: "orange" } }], "orange alert, felt by 0"),
            hiddenCase("a felt count of zero", [{ id: "w", properties: { alert: "green", felt: 0 } }], "green alert, felt by 0"),
          ], { label: "summary() returns exactly what the original did" }),
          {
            kind: "expr",
            id: "flat",
            label: "The program uses at most two if statements",
            expr: "import ast as _ast\nresult = sum(1 for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.If)) <= 2",
            expected: py.bool(true),
            tip: "Replace the `in` tests with `get`, and keep one `is None` fallback per value.",
          },
        ],
      },
    },
  },
  {
    id: "PY-Q17-20",
    version: 2,
    slug: "follow-a-dotted-path",
    title: "Follow a dotted path into a response",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "nested-dict", "nested-lookup", "nested-index", "dict-get", "string-split", "string-check", "conversion", "comparison", "logical", "len-call", "none-value", "function-default", "else-clause", "print-several", "print-text", "reassignment", "boolean", "nested-condition", "truthiness", "tuple-unpack"],
    prompt: "Monitoring rules are written as dotted paths, like `\"features.0.properties.mag\"`, so non-programmers can point at a value inside a JSON response. Write the function that follows such a path. Each part is a dictionary key, or, when the current value is a list, a position written in digits.",
    spec: [
      ["Function", "`get_path(data, path, default=None)`"],
      ["path", "parts separated by dots, e.g. `\"metadata.count\"` or `\"features.1.geometry.coordinates.2\"`"],
      ["Steps", "on a dictionary, the part must be one of its keys; on a list, the part must be all digits and a position inside the list; on anything else the path can't continue"],
      ["Returns", "the value at the end of the path, or `default` as soon as a step can't be taken"],
      ["Rules", "a value that exists but is `None` is returned as `None` (it was found); `isinstance(value, list)` tells you a value is a list"],
    ],
    hiddenKinds: ["a position past the end of a list", "a key that is made of digits on a dictionary", "a path that runs into a number", "a found value that is None", "a non-digit part on a list"],
    hints: [
      "Split the path on dots and walk it part by part, keeping the value you have reached so far.",
      "Decide each step by the kind of value you are on: a dictionary needs `in`; a list needs a digit part and a position below its length.",
      "Return the default the moment a step fails. Don't use `get` with the default for the last key: a stored None was found and must come back as None.",
    ],
    explanation: "Walk `path.split(\".\")`. On a dictionary, a missing key means the default; otherwise step into it. On a list, the part must pass `isdigit()` and `int(part) < len(current)`. Anything else (a number, a text) can't be stepped into. Using `in` rather than `get(part, default)` matters for the last step: a key that holds None is a real value. Converting every digit part to an int also breaks dictionaries whose keys are digit strings, so convert only when the current value is a list.",
    code: {
      starter: src`
def get_path(data, path, default=None):
    return default

page = {
    "type": "FeatureCollection",
    "metadata": {"count": 2, "status": 200},
    "features": [
        {"id": "us6000pw8f", "properties": {"mag": 4.6, "felt": 1, "alert": None}, "geometry": {"coordinates": [122.5991, 8.8699, 10]}},
        {"id": "us6000pw8e", "properties": {"mag": 4.4, "felt": None}, "geometry": {"coordinates": [-68.546, -21.7883, 123.298]}},
    ],
}
print(get_path(page, "metadata.count"))
print(get_path(page, "features.1.geometry.coordinates.2"))
print(get_path(page, "features.5.id", "missing"))
`,
      answer: src`
def get_path(data, path, default=None):
    current = data
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return default
            current = current[part]
        elif isinstance(current, list):
            if not part.isdigit() or int(part) >= len(current):
                return default
            current = current[int(part)]
        else:
            return default
    return current

page = {
    "type": "FeatureCollection",
    "metadata": {"count": 2, "status": 200},
    "features": [
        {"id": "us6000pw8f", "properties": {"mag": 4.6, "felt": 1, "alert": None}, "geometry": {"coordinates": [122.5991, 8.8699, 10]}},
        {"id": "us6000pw8e", "properties": {"mag": 4.4, "felt": None}, "geometry": {"coordinates": [-68.546, -21.7883, 123.298]}},
    ],
}
print(get_path(page, "metadata.count"))
print(get_path(page, "features.1.geometry.coordinates.2"))
print(get_path(page, "features.5.id", "missing"))
`,
      alternatives: [
        src`
def step(current, part):
    if isinstance(current, dict) and part in current:
        return True, current[part]
    if isinstance(current, list) and part.isdigit() and int(part) < len(current):
        return True, current[int(part)]
    return False, None

def get_path(data, path, default=None):
    current = data
    for part in path.split("."):
        found, current = step(current, part)
        if not found:
            return default
    return current
`,
      ],
      wrong: [
        {
          code: src`
def get_path(data, path, default=None):
    current = data
    for part in path.split("."):
        if isinstance(current, dict):
            current = current.get(part, default)
        elif isinstance(current, list):
            if not part.isdigit() or int(part) >= len(current):
                return default
            current = current[int(part)]
        else:
            return default
    return current
`,
          fails: ["returns"],
          why: "a missing key carries on walking from the default, and a path that continues past it can return the wrong thing",
        },
        {
          code: src`
def get_path(data, path, default=None):
    current = data
    for part in path.split("."):
        if part.isdigit():
            part = int(part)
        if isinstance(current, dict):
            if part not in current:
                return default
            current = current[part]
        elif isinstance(current, list):
            if part >= len(current):
                return default
            current = current[part]
        else:
            return default
    return current
`,
          fails: ["returns"],
          why: "every digit part becomes a number, so a dictionary key such as \"2025\" is never found (and a word on a list crashes)",
        },
        {
          code: src`
def get_path(data, path, default=None):
    current = data
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return default
            current = current[part]
        elif isinstance(current, list):
            current = current[int(part)]
        else:
            return default
    if current is None:
        return default
    return current
`,
          fails: ["returns"],
          why: "an out-of-range position crashes, and a value that exists but is None is replaced by the default",
        },
      ],
      task: {
        checks: [
          fn("returns", "get_path", [
            example([page, "metadata.count"], 2),
            example([page, "features.1.geometry.coordinates.2"], 123.298),
            example([page, "features.5.id", "missing"], "missing"),
            example([page, "metadata.next"], null),
            hiddenCase("a position past the end of a list", [page, "features.0.geometry.coordinates.3", -1], -1),
            hiddenCase("a key that is made of digits on a dictionary", [{ years: { "2025": { total: 8 } } }, "years.2025.total", 0], 8),
            hiddenCase("a path that runs into a number", [page, "metadata.count.value", "n/a"], "n/a"),
            hiddenCase("a found value that is None", [page, "features.0.properties.alert", "none"], null),
            hiddenCase("a non-digit part on a list", [page, "features.first.id", "?"], "?"),
            hiddenCase("a missing key in the middle of the path", [page, "features.0.links.self", "?"], "?"),
            hiddenCase("a default that looks like data", [{ meta: {} }, "meta.paging.next", { next: "page-2" }], { next: "page-2" }),
          ], { label: "get_path() follows keys and positions, or returns the default" }),
        ],
      },
    },
  },
  {
    id: "PY-Q17-22",
    version: 2,
    slug: "question-threads",
    title: "Build question threads from flat tables",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "nested-dict", "nested-lookup", "dict-index", "dict-group", "sort-key", "lambda", "list-sort", "arithmetic", "comparison", "tuple-literal", "print-several", "else-clause", "dict-get", "list-comp", "dict-comp", "nested-loop", "precedence", "reassignment"],
    prompt: "The Q&A export arrives as two flat tables: questions and answers. The site's thread page needs them nested: each question with the IDs of its answers, best first. Answers that point at a question you weren't given (deleted ones) are ignored.",
    spec: [
      ["Function", "`thread_view(questions, answers)`"],
      ["questions", "dictionaries with `question_id`, `title` and `tags`"],
      ["answers", "dictionaries with `answer_id`, `question_id` and `score`"],
      ["Returns", "a list with one `{\"question_id\": …, \"title\": …, \"answers\": [answer ids]}` per question, in the questions' order"],
      ["Answer order", "highest score first; equal scores by smaller `answer_id` first; a question with no answers gets `[]`"],
      ["Must not", "change either input list or any record in them"],
    ],
    hiddenKinds: ["answers listed lowest score first", "a tie on score", "an answer to a missing question", "a question with no answers", "no questions"],
    hints: [
      "Group the answers by question ID first, so each question finds its answers with one lookup.",
      "Skip answers whose question isn't in the questions you were given; then sort each group.",
      "A sort key can return a pair: put the negated score first and the answer ID second. Build new dictionaries for the result.",
    ],
    explanation: "Index the question IDs, group the answers under their question (ignoring unknown ones), then build one new dictionary per question with its answers sorted by `(-score, answer_id)`. Negating the score sorts high scores first while the ID still sorts upwards for ties. Sorting with `reverse=True` on `(score, answer_id)` gets ties backwards, and appending to lists inside the input records changes the caller's data.",
    code: {
      starter: src`
def thread_view(questions, answers):
    threads = []
    return threads

questions = [
    {"question_id": 70015316, "title": "TypeError when I inherit from a base class", "tags": ["python"]},
    {"question_id": 70015402, "title": "Why does my CSV have blank lines?", "tags": ["csv"]},
    {"question_id": 70015577, "title": "How do I read a gzip file?", "tags": []},
]
answers = [
    {"answer_id": 70009556, "question_id": 70015316, "score": 4},
    {"answer_id": 70009601, "question_id": 70015402, "score": 9},
    {"answer_id": 70009587, "question_id": 70015316, "score": 11},
    {"answer_id": 70009612, "question_id": 70015316, "score": 4},
    {"answer_id": 70009999, "question_id": 69999999, "score": 2},
]
for thread in thread_view(questions, answers):
    print(thread)
`,
      answer: src`
def thread_view(questions, answers):
    grouped = {}
    for question in questions:
        grouped[question["question_id"]] = []
    for answer in answers:
        if answer["question_id"] in grouped:
            grouped[answer["question_id"]].append(answer)
    threads = []
    for question in questions:
        ranked = sorted(grouped[question["question_id"]], key=lambda a: (-a["score"], a["answer_id"]))
        ids = []
        for answer in ranked:
            ids.append(answer["answer_id"])
        threads.append({"question_id": question["question_id"], "title": question["title"], "answers": ids})
    return threads

questions = [
    {"question_id": 70015316, "title": "TypeError when I inherit from a base class", "tags": ["python"]},
    {"question_id": 70015402, "title": "Why does my CSV have blank lines?", "tags": ["csv"]},
    {"question_id": 70015577, "title": "How do I read a gzip file?", "tags": []},
]
answers = [
    {"answer_id": 70009556, "question_id": 70015316, "score": 4},
    {"answer_id": 70009601, "question_id": 70015402, "score": 9},
    {"answer_id": 70009587, "question_id": 70015316, "score": 11},
    {"answer_id": 70009612, "question_id": 70015316, "score": 4},
    {"answer_id": 70009999, "question_id": 69999999, "score": 2},
]
for thread in thread_view(questions, answers):
    print(thread)
`,
      alternatives: [
        src`
def rank(answer):
    return (-answer["score"], answer["answer_id"])

def thread_view(questions, answers):
    threads = []
    for question in questions:
        mine = [a for a in answers if a["question_id"] == question["question_id"]]
        mine = sorted(mine, key=rank)
        threads.append({"question_id": question["question_id"], "title": question["title"], "answers": [a["answer_id"] for a in mine]})
    return threads
`,
      ],
      wrong: [
        {
          code: src`
def thread_view(questions, answers):
    grouped = {}
    for question in questions:
        grouped[question["question_id"]] = []
    for answer in answers:
        if answer["question_id"] in grouped:
            grouped[answer["question_id"]].append(answer)
    threads = []
    for question in questions:
        ranked = sorted(grouped[question["question_id"]], key=lambda a: (a["score"], a["answer_id"]), reverse=True)
        ids = []
        for answer in ranked:
            ids.append(answer["answer_id"])
        threads.append({"question_id": question["question_id"], "title": question["title"], "answers": ids})
    return threads
`,
          fails: ["returns"],
          why: "reversing the whole sort also reverses the tie-break, so equal scores come out larger ID first",
        },
        {
          code: src`
def thread_view(questions, answers):
    threads = []
    for question in questions:
        question["answers"] = []
        for answer in sorted(answers, key=lambda a: (-a["score"], a["answer_id"])):
            if answer["question_id"] == question["question_id"]:
                question["answers"].append(answer["answer_id"])
        threads.append(question)
    return threads
`,
          fails: ["returns", "keeps-input"],
          why: "it writes `answers` into the caller's question records and returns them with their tags still attached",
        },
        {
          code: src`
def thread_view(questions, answers):
    grouped = {}
    for answer in answers:
        grouped[answer["question_id"]] = grouped.get(answer["question_id"], []) + [answer["answer_id"]]
    threads = []
    for question in questions:
        threads.append({"question_id": question["question_id"], "title": question["title"], "answers": grouped.get(question["question_id"], [])})
    return threads
`,
          fails: ["returns"],
          why: "the answers keep the order of the export instead of best first",
        },
      ],
      task: {
        checks: [
          fn("returns", "thread_view", [
            example([qaQuestions, qaAnswers], [
              { question_id: 70015316, title: "TypeError when I inherit from a base class", answers: [70009587, 70009556, 70009612] },
              { question_id: 70015402, title: "Why does my CSV have blank lines?", answers: [70009601] },
              { question_id: 70015577, title: "How do I read a gzip file?", answers: [] },
            ]),
            example([[qaQuestions[2]], []], [{ question_id: 70015577, title: "How do I read a gzip file?", answers: [] }]),
            example([[], qaAnswers], []),
            hiddenCase("answers listed lowest score first", [[{ question_id: 1, title: "q", tags: [] }], [{ answer_id: 10, question_id: 1, score: 1 }, { answer_id: 11, question_id: 1, score: 2 }, { answer_id: 12, question_id: 1, score: 3 }]], [{ question_id: 1, title: "q", answers: [12, 11, 10] }]),
            hiddenCase("a tie on score", [[{ question_id: 1, title: "q", tags: [] }], [{ answer_id: 30, question_id: 1, score: 5 }, { answer_id: 20, question_id: 1, score: 5 }, { answer_id: 25, question_id: 1, score: -1 }]], [{ question_id: 1, title: "q", answers: [20, 30, 25] }]),
            hiddenCase("an answer to a missing question", [[{ question_id: 2, title: "kept", tags: [] }], [{ answer_id: 1, question_id: 3, score: 99 }]], [{ question_id: 2, title: "kept", answers: [] }]),
            hiddenCase("questions in a different order from their answers", [[{ question_id: 9, title: "b", tags: [] }, { question_id: 8, title: "a", tags: [] }], [{ answer_id: 1, question_id: 8, score: 0 }, { answer_id: 2, question_id: 9, score: 0 }]], [{ question_id: 9, title: "b", answers: [2] }, { question_id: 8, title: "a", answers: [1] }]),
          ], { label: "thread_view() nests each question's answers, best first" }),
          fn("keeps-input", "thread_view", [
            keepsInput([qaQuestions, qaAnswers]),
            keepsInput([[{ question_id: 1, title: "q", tags: ["x"] }], [{ answer_id: 5, question_id: 1, score: 2 }]], { label: "one question with one answer" }),
          ], { label: "thread_view() leaves both tables unchanged" }),
        ],
      },
    },
  },
];
