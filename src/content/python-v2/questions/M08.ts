/**
 * M08 practice: ten independent problems on dictionaries and sets (PY-L08-01 … PY-L08-05).
 *
 * Functions arrive in M09, so every code question is a short program whose inputs are its first lines. It is graded on
 * its output, on public re-runs with other inputs, and on hidden re-runs (`variant` checks) chosen for the edge cases:
 * missing keys, blank values, empty inputs, repeats, keys that clash after cleaning, boundaries.
 *
 * Mix: 4 data transformations, 2 validations, 2 debugging (genuinely broken programs), 2 output predictions.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 * Fixtures: Runtime Market products, prices and stock (R01), Runtime Films language codes (R02), app settings, sign-up
 * forms, course rosters and a cinema seat map as small inline fixtures.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyQuestion } from "../model";
import { pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const values = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, pv(v)]));
const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** A public re-run: the program is run again with these input values, shown to the learner. */
const shown = (id: string, set: Record<string, unknown>, output: string): PyCheck => ({ kind: "variant", id, set: values(set), output });
/** A hidden re-run: only `kind` is shown when it fails. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: values(set),
  output,
  hidden: true,
});
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m08Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q08-02",
    version: 2,
    slug: "stock-after-edits",
    title: "Stock after a day of edits",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "whole-number", "string-value", "dict-literal", "dict-lookup", "dict-store", "arithmetic", "membership", "len-call", "boolean", "print-call", "print-several", "unquoted-name", "string-index", "list-mutate"],
    prompt: "Type exactly what this program prints. Track the dictionary line by line: which keys it holds, in which order, and with which values.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Storing under a key that already exists replaces the value and keeps the key where it was.",
      "A key that is deleted and then stored again is a new key, so it goes to the end.",
      "`in` on a dictionary looks at the keys only.",
    ],
    explanation: "P0659 is added, then deleted, then added again, so it ends up last with the value 1. P0607 drops to 7, and P0208 is replaced by 10 without moving. Three keys remain. `\"P0659\" in stock` is True because P0659 is a key; `10 in stock` is False because 10 is only a value.",
    predict: {
      program: src`
stock = {"P0607": 12, "P0208": 3}
stock["P0659"] = 7
stock["P0607"] = stock["P0607"] - 5
stock["P0208"] = 10
del stock["P0659"]
stock["P0659"] = 1
print(stock)
print(len(stock), "P0659" in stock, 10 in stock)
`,
      output: "{'P0607': 7, 'P0208': 10, 'P0659': 1}\n3 True False\n",
      wrongPredictions: [
        "{'P0607': 7, 'P0659': 1, 'P0208': 10}\n3 True False",
        "{'P0607': 7, 'P0208': 10, 'P0659': 1}\n3 True True",
        "{'P0607': 7, 'P0208': 13, 'P0659': 1}\n3 True False",
        "{'P0607': 7, 'P0208': 10}\n2 False False",
      ],
    },
  },
  {
    id: "PY-Q08-03",
    version: 2,
    slug: "settings-keys-crash",
    title: "Tidying settings keys crashes",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "string-value", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "tuple-unpack", "for-loop", "membership", "string-method", "print-call", "unquoted-name", "top-level-indent", "string-index", "runtime-error", "list-mutate"],
    prompt: "An app reads its settings from a file that people edit by hand, so the keys arrive with stray spaces and random capitals. This program should print the settings with every key stripped and in lower case. The values must stay exactly as they were. It stops with `RuntimeError: dictionary changed size during iteration`, and even the idea behind it is incomplete. Fix it.",
    spec: [
      ["Input", "`settings`, a dictionary whose keys may have spaces at the ends and capital letters"],
      ["Prints", "a dictionary with the same values under cleaned keys (stripped, lower case), in the original order"],
      ["Clash", "if two keys clean to the same name, the later one's value wins"],
      ["Examples", "the starter's settings → `{'theme': 'Dark', 'language': 'en', 'timezone': 'UTC'}`"],
    ],
    hiddenKinds: ["two keys that clean to the same name", "keys that are already clean", "values with capitals that must stay as they are", "no settings at all"],
    hints: [
      "The loop stores new keys into the very dictionary it is walking. Where else could the cleaned pairs go?",
      "Start an empty dictionary before the loop and store each cleaned pair there instead.",
      "The key needs two cleaning steps, the value none: print the new dictionary at the end.",
    ],
    explanation: "Adding keys to a dictionary while `for` walks it raises RuntimeError, and even without the crash the old messy keys would still be there. Build a new dictionary: for each pair, store the value under `key.strip().lower()`. Storing under a name that already exists replaces it, which gives the \"later one wins\" rule for free. Lowering the values too would change `Dark` to `dark`, which the app treats as a different theme.",
    code: {
      starter: src`
settings = {" Theme": "Dark", "LANGUAGE": "en", "timezone ": "UTC"}
for key, value in settings.items():
    settings[key.lower()] = value
print(settings)
`,
      answer: src`
settings = {" Theme": "Dark", "LANGUAGE": "en", "timezone ": "UTC"}
clean = {}
for key, value in settings.items():
    clean[key.strip().lower()] = value
print(clean)
`,
      alternatives: [
        src`
settings = {" Theme": "Dark", "LANGUAGE": "en", "timezone ": "UTC"}
clean = {}
for key in settings:
    name = key.lower().strip()
    clean[name] = settings[key]
print(clean)
`,
      ],
      wrong: [
        {
          code: src`
settings = {" Theme": "Dark", "LANGUAGE": "en", "timezone ": "UTC"}
clean = {}
for key, value in settings.items():
    clean[key.lower()] = value
print(clean)
`,
          fails: ["clash", "one", "output", "spaces"],
          why: "the crash is gone, but the spaces around ` Theme` and `timezone ` are still in the keys",
        },
        {
          code: src`
settings = {" Theme": "Dark", "LANGUAGE": "en", "timezone ": "UTC"}
clean = {}
for key, value in settings.items():
    clean[key.strip().lower()] = value.lower()
print(clean)
`,
          fails: ["clash", "output", "spaces", "values"],
          why: "the values are lowered too, so `Dark` becomes `dark`",
        },
      ],
      task: {
        checks: [
          out("{'theme': 'Dark', 'language': 'en', 'timezone': 'UTC'}\n"),
          shown("one", { settings: { "  FONT_SIZE": "14" } }, "{'font_size': '14'}\n"),
          rerun("clash", "two keys that clean to the same name", { settings: { Theme: "Light", " theme ": "Dark" } }, "{'theme': 'Dark'}\n"),
          rerun("spaces", "keys with spaces at both ends", { settings: { " region ": "EU", lang: "fr" } }, "{'region': 'EU', 'lang': 'fr'}\n"),
          rerun("values", "values with capitals that must stay as they are", { settings: { CURRENCY: "USD", locale: "en_US" } }, "{'currency': 'USD', 'locale': 'en_US'}\n"),
          rerun("empty", "no settings at all", { settings: {} }, "{}\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q08-06",
    version: 2,
    slug: "language-code-from-name",
    title: "Language code from a typed name",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "string-value", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "tuple-unpack", "for-loop", "membership", "if-statement", "else-clause", "string-method", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "string-index", "logical", "spaces-in-text", "list-mutate", "continue-statement", "string-format"],
    prompt: "Runtime Films stores languages as code → name (`\"de\": \"German\"`). A search box needs the opposite: someone types a language name, in any capitals and with stray spaces, and the site needs its code. Build a name → code dictionary from `languages`, then print the code for `typed`, or `no language called <name>` with the cleaned name.",
    spec: [
      ["Inputs", "`languages`, a dictionary from code to name; `typed`, the text from the search box"],
      ["Matching", "ignore capitals and spaces at the ends of `typed`; names in `languages` match whatever their capitals"],
      ["Shared names", "if two codes have the same name, the code that comes **first** in `languages` wins"],
      ["Prints", "the code, or `no language called <cleaned typed text>`"],
      ["Examples", "`\"  german\"` → `de`; `\"KOREAN\"` → `ko`"],
    ],
    hiddenKinds: ["a name that isn't in the table", "two codes with the same name", "a name typed with capitals and spaces", "an empty table"],
    hints: [
      "Walk `languages` with `items()` and store each pair the other way round in a new dictionary.",
      "Lower-case the name before using it as a key, and clean `typed` the same way before looking it up.",
      "Storing a key twice keeps the later value, so only store a name the first time you see it.",
    ],
    explanation: "Inverting a dictionary means walking its pairs and storing `codes[name] = code`. The keys must be cleaned the same way as the search text, so both go through `lower()` (and `strip()` for the typed text). Because storing an existing key replaces its value, the first-code-wins rule needs a `not in` test before storing. Then the lookup itself is guarded with `in`, as in PY-L08-01.",
    code: {
      starter: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean", "pt": "Portuguese"}
typed = "  german"
`,
      answer: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean", "pt": "Portuguese"}
typed = "  german"
codes = {}
for code, name in languages.items():
    key = name.lower()
    if key not in codes:
        codes[key] = code
wanted = typed.strip().lower()
if wanted in codes:
    print(codes[wanted])
else:
    print("no language called", wanted)
`,
      alternatives: [
        src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean", "pt": "Portuguese"}
typed = "  german"
codes = {}
for code in languages:
    if languages[code].lower() in codes:
        continue
    codes[languages[code].lower()] = code
wanted = typed.lower().strip()
if wanted not in codes:
    print(f"no language called {wanted}")
else:
    print(codes[wanted])
`,
      ],
      wrong: [
        {
          code: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean", "pt": "Portuguese"}
typed = "  german"
codes = {}
for code, name in languages.items():
    if name not in codes:
        codes[name] = code
wanted = typed.strip().lower()
if wanted in codes:
    print(codes[wanted])
else:
    print("no language called", wanted)
`,
          fails: ["capitals", "output", "shared", "upper"],
          why: "the stored names keep their capitals, so a cleaned search for `german` never finds `German`",
        },
        {
          code: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean", "pt": "Portuguese"}
typed = "  german"
codes = {}
for code, name in languages.items():
    codes[name.lower()] = code
wanted = typed.strip().lower()
if wanted in codes:
    print(codes[wanted])
else:
    print("no language called", wanted)
`,
          fails: ["shared"],
          why: "every code is stored, so a later code with the same name replaces the first one",
        },
      ],
      task: {
        checks: [
          out("de\n"),
          shown("upper", { typed: "KOREAN" }, "ko\n"),
          rerun("unknown", "a name that isn't in the table", { typed: " Swedish " }, "no language called swedish\n"),
          rerun("shared", "two codes with the same name", { languages: { zh: "Chinese", en: "English", cn: "chinese" }, typed: "chinese" }, "zh\n"),
          rerun("capitals", "a name typed with capitals and spaces", { typed: "   PorTuguese  " }, "pt\n"),
          rerun("empty", "an empty table", { languages: {}, typed: "English" }, "no language called english\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q08-10",
    version: 2,
    slug: "required-form-fields",
    title: "Required fields on a sign-up form",
    format: "validation",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "string-value", "dict-literal", "dict-lookup", "list-literal", "list-mutate", "for-loop", "membership", "if-statement", "else-clause", "logical", "comparison", "len-call", "string-method", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "string-index", "spaces-in-text", "list-index", "nested-condition", "truthiness", "continue-statement"],
    prompt: "A sign-up form arrives as a dictionary from field name to the text typed in it. Some fields are required. A required field is **missing** if its key isn't in the form, or if its text is empty or only spaces. Print `missing:` followed by the list of missing fields, in the order of `required`, or `complete` if none are missing. Fields that aren't required are ignored.",
    spec: [
      ["Inputs", "`form`, a dictionary from field name to text; `required`, a list of field names"],
      ["Prints", "`missing: [...]` in the order of `required`, or `complete`"],
      ["Examples", "the starter's form → `missing: ['email', 'phone']`"],
    ],
    hiddenKinds: ["every required field filled", "a field of only spaces", "an empty form", "extra fields that aren't required", "required fields listed in another order"],
    hints: [
      "Walk `required`, not `form`: the question is about each required field.",
      "A field can be missing in two ways, and either one is enough.",
      "Test `in` before reading the value, and `strip` the value before checking whether anything is left.",
    ],
    explanation: "Loop over `required` and decide for each name: missing if `name not in form`, or if `form[name].strip()` is empty. Putting the `not in` test first matters, because `or` stops at the first true part, so a missing key is never looked up. Checking only the keys lets a field of spaces through, and looping over the form reports fields nobody asked for.",
    code: {
      starter: src`
form = {"name": "Nora Garcia", "email": "  ", "city": "Houston", "newsletter": "yes"}
required = ["name", "email", "phone"]
`,
      answer: src`
form = {"name": "Nora Garcia", "email": "  ", "city": "Houston", "newsletter": "yes"}
required = ["name", "email", "phone"]
missing = []
for field in required:
    if field not in form or form[field].strip() == "":
        missing.append(field)
if len(missing) == 0:
    print("complete")
else:
    print("missing:", missing)
`,
      alternatives: [
        src`
form = {"name": "Nora Garcia", "email": "  ", "city": "Houston", "newsletter": "yes"}
required = ["name", "email", "phone"]
missing = []
for field in required:
    if field in form:
        if form[field].strip():
            continue
    missing.append(field)
if missing:
    print("missing:", missing)
else:
    print("complete")
`,
      ],
      wrong: [
        {
          code: src`
form = {"name": "Nora Garcia", "email": "  ", "city": "Houston", "newsletter": "yes"}
required = ["name", "email", "phone"]
missing = []
for field in required:
    if field not in form:
        missing.append(field)
if len(missing) == 0:
    print("complete")
else:
    print("missing:", missing)
`,
          fails: ["order", "output", "spaces"],
          why: "only absent keys count, so a field of spaces passes as filled",
        },
        {
          code: src`
form = {"name": "Nora Garcia", "email": "  ", "city": "Houston", "newsletter": "yes"}
required = ["name", "email", "phone"]
missing = []
for field in required:
    if form[field].strip() == "" or field not in form:
        missing.append(field)
if len(missing) == 0:
    print("complete")
else:
    print("missing:", missing)
`,
          fails: ["complete", "empty", "extra", "order", "output", "spaces"],
          why: "the value is read before checking the key exists, so a missing field raises KeyError",
        },
      ],
      task: {
        checks: [
          out("missing: ['email', 'phone']\n"),
          shown("complete", { form: { name: "Jamal Walker", email: "jamal@icloud.com" }, required: ["email", "name"] }, "complete\n"),
          rerun("spaces", "a field of only spaces", { form: { name: "   ", email: "a@b.io" }, required: ["name", "email"] }, "missing: ['name']\n"),
          rerun("empty", "an empty form", { form: {}, required: ["name", "email"] }, "missing: ['name', 'email']\n"),
          rerun("extra", "extra fields that aren't required", { form: { email: "x@y.io", promo: "" }, required: ["email"] }, "complete\n"),
          rerun("order", "required fields listed in another order", { form: { email: "" }, required: ["zip", "email", "name"] }, "missing: ['zip', 'email', 'name']\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q08-12",
    version: 2,
    slug: "two-course-rosters",
    title: "Two course rosters",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["assignment", "string-value", "list-literal", "set-op", "list-sort", "len-call", "membership", "print-call", "print-several", "unquoted-name", "list-index", "boolean"],
    prompt: "Type exactly what this program prints. Work out each set first, then each set operation, paying attention to which set each method is called on.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`set(python)` keeps each name once. How many names does it hold?",
      "The union holds everyone; taking away the intersection leaves the people in exactly one course.",
      "`s.difference(p)` keeps names of `s` that aren't in `p`, and `sorted` puts them in alphabetical order.",
    ],
    explanation: "`python` has 4 entries but only 3 different names, because Ben is listed twice. The union is Ana, Ben, Chen, Dara and Eli; the intersection is Ana and Chen; removing the intersection leaves Ben, Dara and Eli, the students in exactly one course. `s.difference(p)` is Dara and Eli, and Ben is not in the SQL set.",
    predict: {
      program: src`
python = ["Ana", "Ben", "Chen", "Ben"]
sql = ["Chen", "Dara", "Ana", "Eli"]
p = set(python)
s = set(sql)
only_one = p.union(s).difference(p.intersection(s))
print(len(python), len(p))
print(sorted(only_one))
print(sorted(s.difference(p)), "Ben" in s)
`,
      output: "4 3\n['Ben', 'Dara', 'Eli']\n['Dara', 'Eli'] False\n",
      wrongPredictions: [
        "4 4\n['Ben', 'Dara', 'Eli']\n['Dara', 'Eli'] False",
        "4 3\n['Ana', 'Chen']\n['Dara', 'Eli'] False",
        "4 3\n['Ben', 'Dara', 'Eli']\n['Ben'] False",
        "4 3\n['Ben', 'Dara', 'Eli']\n['Dara', 'Eli'] True",
      ],
    },
  },
  {
    id: "PY-Q08-13",
    version: 2,
    slug: "new-warehouse-shares-stock",
    title: "The new warehouse empties the old one",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "string-value", "whole-number", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "nested-dict", "list-literal", "tuple-literal", "tuple-unpack", "for-loop", "membership", "if-statement", "else-clause", "arithmetic", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "string-index", "list-index", "runtime-error", "list-mutate", "logical", "continue-statement"],
    prompt: "A shop is opening a new warehouse. It should stock every product the Atlanta warehouse lists, starting at 0 units, and then receive its first delivery. A delivery line for a product that isn't in the catalogue must be reported as `skipped <id>` and not stored. Then every warehouse is printed. The program stops with a KeyError, and once that is fixed you'll find that opening the new warehouse also wipes out Atlanta's stock. Fix both bugs.",
    spec: [
      ["Inputs", "`stock`, a dictionary from warehouse to its own stock dictionary; `new_site`; `delivery`, a list of `(product_id, units)`"],
      ["Prints", "`skipped <id>` for each unknown delivery line, in delivery order, then `<warehouse> <stock dictionary>` for every warehouse"],
      ["Must not", "change the Atlanta or Denver stock"],
      ["Examples", "the starter's data prints `skipped P0999`, then Atlanta and Denver unchanged, then `Boise {'P0035': 0, 'P0146': 5}`"],
    ],
    hiddenKinds: ["no delivery", "the same product delivered twice", "every delivery line unknown", "a different template of products"],
    hints: [
      "Run it, and read which key the KeyError names. Is that product in the new warehouse's dictionary?",
      "After `stock[new_site] = stock[\"Atlanta\"]`, how many stock dictionaries are there for Atlanta and the new site together?",
      "Give the new site a dictionary of its own: start it empty and store a 0 for every product Atlanta lists.",
    ],
    explanation: "`stock[new_site] = stock[\"Atlanta\"]` doesn't copy anything: both keys now hold the same dictionary, so zeroing the new site zeroes Atlanta, and the delivery shows up in both (the Lists & Tuples module's aliasing, now one level down). Build a new dictionary with a loop instead. The KeyError comes from adding units to a product the new site doesn't stock; test with `in` first and print the skip message.",
    code: {
      starter: src`
stock = {
    "Atlanta": {"P0035": 4, "P0146": 9},
    "Denver": {"P0035": 12, "P0146": 0},
}
new_site = "Boise"
delivery = [("P0146", 5), ("P0999", 2)]
stock[new_site] = stock["Atlanta"]
for product_id in stock[new_site]:
    stock[new_site][product_id] = 0
for product_id, units in delivery:
    stock[new_site][product_id] = stock[new_site][product_id] + units
for site, levels in stock.items():
    print(site, levels)
`,
      answer: src`
stock = {
    "Atlanta": {"P0035": 4, "P0146": 9},
    "Denver": {"P0035": 12, "P0146": 0},
}
new_site = "Boise"
delivery = [("P0146", 5), ("P0999", 2)]
stock[new_site] = {}
for product_id in stock["Atlanta"]:
    stock[new_site][product_id] = 0
for product_id, units in delivery:
    if product_id in stock[new_site]:
        stock[new_site][product_id] = stock[new_site][product_id] + units
    else:
        print("skipped", product_id)
for site, levels in stock.items():
    print(site, levels)
`,
      alternatives: [
        src`
stock = {
    "Atlanta": {"P0035": 4, "P0146": 9},
    "Denver": {"P0035": 12, "P0146": 0},
}
new_site = "Boise"
delivery = [("P0146", 5), ("P0999", 2)]
opening = {}
for product_id in stock["Atlanta"]:
    opening[product_id] = 0
for product_id, units in delivery:
    if product_id not in opening:
        print("skipped", product_id)
        continue
    opening[product_id] += units
stock[new_site] = opening
for site in stock:
    print(site, stock[site])
`,
      ],
      wrong: [
        {
          code: src`
stock = {
    "Atlanta": {"P0035": 4, "P0146": 9},
    "Denver": {"P0035": 12, "P0146": 0},
}
new_site = "Boise"
delivery = [("P0146", 5), ("P0999", 2)]
stock[new_site] = stock["Atlanta"]
for product_id in stock[new_site]:
    stock[new_site][product_id] = 0
for product_id, units in delivery:
    if product_id in stock[new_site]:
        stock[new_site][product_id] = stock[new_site][product_id] + units
    else:
        print("skipped", product_id)
for site, levels in stock.items():
    print(site, levels)
`,
          fails: ["all-unknown", "none", "other-site", "output", "template", "twice"],
          why: "the KeyError is fixed, but Atlanta and the new site still share one dictionary, so Atlanta is wiped",
        },
        {
          code: src`
stock = {
    "Atlanta": {"P0035": 4, "P0146": 9},
    "Denver": {"P0035": 12, "P0146": 0},
}
new_site = "Boise"
delivery = [("P0146", 5), ("P0999", 2)]
stock[new_site] = {}
for product_id in stock["Atlanta"]:
    stock[new_site][product_id] = 0
for product_id, units in delivery:
    if product_id in stock[new_site]:
        stock[new_site][product_id] = units
    else:
        print("skipped", product_id)
for site, levels in stock.items():
    print(site, levels)
`,
          fails: ["twice"],
          why: "each delivery line replaces the units instead of adding to them, so a second line for a product loses the first",
        },
      ],
      task: {
        checks: [
          out("skipped P0999\nAtlanta {'P0035': 4, 'P0146': 9}\nDenver {'P0035': 12, 'P0146': 0}\nBoise {'P0035': 0, 'P0146': 5}\n"),
          shown("other-site", { new_site: "Reno", delivery: [tup("P0035", 3)] }, "Atlanta {'P0035': 4, 'P0146': 9}\nDenver {'P0035': 12, 'P0146': 0}\nReno {'P0035': 3, 'P0146': 0}\n"),
          rerun("none", "no delivery", { delivery: [] }, "Atlanta {'P0035': 4, 'P0146': 9}\nDenver {'P0035': 12, 'P0146': 0}\nBoise {'P0035': 0, 'P0146': 0}\n"),
          rerun("twice", "the same product delivered twice", { delivery: [tup("P0035", 2), tup("P0035", 6)] }, "Atlanta {'P0035': 4, 'P0146': 9}\nDenver {'P0035': 12, 'P0146': 0}\nBoise {'P0035': 8, 'P0146': 0}\n"),
          rerun("all-unknown", "every delivery line unknown", { delivery: [tup("X1", 1), tup("X2", 2)] }, "skipped X1\nskipped X2\nAtlanta {'P0035': 4, 'P0146': 9}\nDenver {'P0035': 12, 'P0146': 0}\nBoise {'P0035': 0, 'P0146': 0}\n"),
          rerun("template", "a different template of products", { stock: { Atlanta: { A: 1 }, Denver: { B: 2 } }, delivery: [tup("B", 4), tup("A", 3)] }, "skipped B\nAtlanta {'A': 1}\nDenver {'B': 2}\nBoise {'A': 3}\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q08-16",
    version: 2,
    slug: "apply-a-price-feed",
    title: "Apply a supplier's price feed",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "reassignment", "string-value", "decimal-number", "whole-number", "dict-literal", "dict-lookup", "dict-store", "list-literal", "tuple-literal", "tuple-unpack", "for-loop", "membership", "if-statement", "else-clause", "comparison", "arithmetic", "len-call", "string-format", "print-call", "unquoted-name", "top-level-indent", "string-index", "list-index", "print-text", "logical", "list-mutate", "nested-condition", "continue-statement"],
    prompt: "A supplier sends a feed of `(product_id, price)` pairs. Apply it to the shop's `prices` dictionary one line at a time and report what changed: `<id>: <old> -> <new>` for a price that changed, `<id>: new at <price>` for a product the shop didn't have. A line with the same price is not printed but counted. Finish with `<n> unchanged, <m> products`. All prices are printed with two decimals.",
    spec: [
      ["Inputs", "`prices`, a dictionary from product ID to price; `feed`, a list of `(product_id, price)` tuples"],
      ["Prints", "one line per change or new product, in feed order; then `<n> unchanged, <m> products` (the size of `prices` afterwards)"],
      ["Order matters", "a product that appears twice in the feed is compared with the price the first line set"],
      ["Examples", "the starter's data prints changes for P0208 and P0659, `P0164: new at 31.00`, then `1 unchanged, 4 products`"],
    ],
    hiddenKinds: ["an empty feed", "the same product twice in the feed", "every product new", "a feed that changes nothing"],
    hints: [
      "Three outcomes per feed line: new, changed or unchanged. Decide which before you store anything.",
      "Check `in` first: a new product has no old price to compare with.",
      "Store the new price as you go, so a later line for the same product sees it.",
    ],
    explanation: "Each line is classified against the dictionary as it is at that moment: `not in prices` is new, a different stored price is a change, otherwise it is unchanged. Storing the price after each line keeps the dictionary current, which is what makes a repeated product compare with the price from earlier in the same feed. Comparing before the `in` test crashes on a new product with KeyError.",
    code: {
      starter: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
`,
      answer: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
unchanged = 0
for product_id, price in feed:
    if product_id not in prices:
        print(f"{product_id}: new at {price:.2f}")
    elif prices[product_id] != price:
        print(f"{product_id}: {prices[product_id]:.2f} -> {price:.2f}")
    else:
        unchanged = unchanged + 1
    prices[product_id] = price
print(f"{unchanged} unchanged, {len(prices)} products")
`,
      alternatives: [
        src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
same = 0
for line in feed:
    product_id, price = line
    if product_id in prices:
        old = prices[product_id]
        if old == price:
            same += 1
            continue
        print(f"{product_id}: {old:.2f} -> {price:.2f}")
    else:
        print(f"{product_id}: new at {price:.2f}")
    prices[product_id] = price
print(f"{same} unchanged, {len(prices)} products")
`,
      ],
      wrong: [
        {
          code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
unchanged = 0
for product_id, price in feed:
    if product_id not in prices:
        print(f"{product_id}: new at {price:.2f}")
    elif prices[product_id] != price:
        print(f"{product_id}: {prices[product_id]:.2f} -> {price:.2f}")
    else:
        unchanged = unchanged + 1
print(f"{unchanged} unchanged, {len(prices)} products")
`,
          fails: ["all-new", "output", "twice"],
          why: "the prices are never stored, so the dictionary doesn't grow and a repeated product is compared with the stale price",
        },
        {
          code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
unchanged = 0
for product_id, price in feed:
    if prices[product_id] != price:
        print(f"{product_id}: {prices[product_id]:.2f} -> {price:.2f}")
    elif product_id not in prices:
        print(f"{product_id}: new at {price:.2f}")
    else:
        unchanged = unchanged + 1
    prices[product_id] = price
print(f"{unchanged} unchanged, {len(prices)} products")
`,
          fails: ["all-new", "empty", "nothing", "output", "same", "twice"],
          why: "the old price is read before checking the product exists, so a new product raises KeyError",
        },
        {
          code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
feed = [("P0208", 59.99), ("P0607", 6.49), ("P0164", 31.0), ("P0659", 54.99)]
unchanged = 0
for product_id, price in feed:
    if product_id not in prices:
        print(f"{product_id}: new at {price:.2f}")
    elif prices[product_id] != price:
        print(f"{product_id}: {prices[product_id]:.2f} -> {price:.2f}")
    unchanged = unchanged + 1
    prices[product_id] = price
print(f"{unchanged} unchanged, {len(prices)} products")
`,
          fails: ["all-new", "output", "twice"],
          why: "every feed line is counted as unchanged, not only the lines with the same price",
        },
      ],
      task: {
        checks: [
          out("P0208: 66.49 -> 59.99\nP0164: new at 31.00\nP0659: 51.49 -> 54.99\n1 unchanged, 4 products\n"),
          shown("nothing", { feed: [tup("P0607", 6.49)] }, "1 unchanged, 3 products\n"),
          rerun("empty", "an empty feed", { feed: [] }, "0 unchanged, 3 products\n"),
          rerun("twice", "the same product twice in the feed", { prices: { A: 10 }, feed: [tup("A", 12), tup("A", 12), tup("A", 9.5)] }, "A: 10.00 -> 12.00\nA: 12.00 -> 9.50\n1 unchanged, 1 products\n"),
          rerun("all-new", "every product new", { prices: {}, feed: [tup("X", 1.5), tup("Y", 2)] }, "X: new at 1.50\nY: new at 2.00\n0 unchanged, 2 products\n"),
          rerun("same", "a feed that changes nothing", { prices: { A: 1, B: 2 }, feed: [tup("B", 2), tup("A", 1)] }, "2 unchanged, 2 products\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q08-19",
    version: 2,
    slug: "every-session-attendance",
    title: "Who came to every session?",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "reassignment", "string-value", "list-literal", "list-index", "set-op", "list-sort", "for-loop", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "string-index", "membership", "logical", "nested-loop", "if-statement", "truthiness", "else-clause", "list-mutate", "boolean"],
    prompt: "A workshop ran several sessions, and each session's sign-in sheet is a list of names (someone who signed twice appears twice). A certificate goes to everyone who came to **every** session, and a reminder to everyone who came to some sessions but not all. Print both groups, sorted.",
    spec: [
      ["Input", "`sessions`, a list of at least one sign-in list"],
      ["Line 1", "`every session: [...]`, the sorted names on every sheet"],
      ["Line 2", "`some sessions: [...]`, the sorted names on at least one sheet but not all"],
      ["Examples", "the starter's sheets → `every session: ['Ana', 'Ben', 'Dara']` and `some sessions: ['Chen', 'Eli']`"],
    ],
    hiddenKinds: ["a single session", "nobody at every session", "a name signed twice on one sheet", "a session nobody signed"],
    hints: [
      "Start both groups from the first sheet's set, then fold in the other sheets one at a time.",
      "Keeping only the names in both is one set method; collecting everyone is another.",
      "The reminder group is everyone minus the certificate group.",
    ],
    explanation: "Start with `set(sessions[0])` for both groups. For each sheet, `intersection` keeps only the names that were also on that sheet, and `union` collects every name seen. After the loop, the reminder group is `anyone.difference(everyone)`. Starting the intersection from an empty set would keep it empty forever, which is why the first sheet is the starting point.",
    code: {
      starter: src`
sessions = [
    ["Ana", "Ben", "Chen", "Dara"],
    ["Ben", "Dara", "Ana", "Eli"],
    ["Dara", "Ana", "Ben", "Ana"],
]
`,
      answer: src`
sessions = [
    ["Ana", "Ben", "Chen", "Dara"],
    ["Ben", "Dara", "Ana", "Eli"],
    ["Dara", "Ana", "Ben", "Ana"],
]
everyone = set(sessions[0])
anyone = set(sessions[0])
for sheet in sessions:
    everyone = everyone.intersection(set(sheet))
    anyone = anyone.union(set(sheet))
print("every session:", sorted(everyone))
print("some sessions:", sorted(anyone.difference(everyone)))
`,
      alternatives: [
        src`
sessions = [
    ["Ana", "Ben", "Chen", "Dara"],
    ["Ben", "Dara", "Ana", "Eli"],
    ["Dara", "Ana", "Ben", "Ana"],
]
anyone = set()
for sheet in sessions:
    anyone = anyone.union(set(sheet))
full = []
part = []
for name in anyone:
    on_all = True
    for sheet in sessions:
        if name not in sheet:
            on_all = False
    if on_all:
        full.append(name)
    else:
        part.append(name)
print("every session:", sorted(full))
print("some sessions:", sorted(part))
`,
      ],
      wrong: [
        {
          code: src`
sessions = [
    ["Ana", "Ben", "Chen", "Dara"],
    ["Ben", "Dara", "Ana", "Eli"],
    ["Dara", "Ana", "Ben", "Ana"],
]
everyone = set()
anyone = set()
for sheet in sessions:
    everyone = everyone.intersection(set(sheet))
    anyone = anyone.union(set(sheet))
print("every session:", sorted(everyone))
print("some sessions:", sorted(anyone.difference(everyone)))
`,
          fails: ["output", "single", "twice", "two"],
          why: "the intersection starts empty, and nothing is ever in both an empty set and a sheet",
        },
        {
          code: src`
sessions = [
    ["Ana", "Ben", "Chen", "Dara"],
    ["Ben", "Dara", "Ana", "Eli"],
    ["Dara", "Ana", "Ben", "Ana"],
]
everyone = set(sessions[0])
anyone = set(sessions[0])
for sheet in sessions:
    everyone = everyone.intersection(set(sheet))
    anyone = anyone.union(set(sheet))
print("every session:", sorted(everyone))
print("some sessions:", sorted(anyone))
`,
          fails: ["output", "single", "twice", "two"],
          why: "the reminder group still contains the people who came to everything",
        },
      ],
      task: {
        checks: [
          out("every session: ['Ana', 'Ben', 'Dara']\nsome sessions: ['Chen', 'Eli']\n"),
          shown("two", { sessions: [["Mo", "Lee"], ["Lee", "Kim"]] }, "every session: ['Lee']\nsome sessions: ['Kim', 'Mo']\n"),
          rerun("single", "a single session", { sessions: [["Zoe", "Abe"]] }, "every session: ['Abe', 'Zoe']\nsome sessions: []\n"),
          rerun("nobody", "nobody at every session", { sessions: [["A"], ["B"], ["C"]] }, "every session: []\nsome sessions: ['A', 'B', 'C']\n"),
          rerun("twice", "a name signed twice on one sheet", { sessions: [["Kai", "Kai", "Ivy"], ["Kai"]] }, "every session: ['Kai']\nsome sessions: ['Ivy']\n"),
          rerun("empty-sheet", "a session nobody signed", { sessions: [["Ana", "Ben"], []] }, "every session: []\nsome sessions: ['Ana', 'Ben']\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q08-20",
    version: 2,
    slug: "validate-user-records",
    title: "Check user records from an API",
    format: "validation",
    difficulty: "medium",
    minutes: 14,
    requires: ["assignment", "reassignment", "string-value", "whole-number", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "tuple-unpack", "for-loop", "membership", "if-statement", "else-clause", "logical", "comparison", "arithmetic", "string-method", "string-format", "print-call", "unquoted-name", "top-level-indent", "string-index", "nested-condition", "spaces-in-text", "print-text", "truthiness", "boolean", "print-several", "nested-loop", "len-call", "list-literal", "list-mutate", "list-index"],
    prompt: "An API returns users as a dictionary from user ID to a record. Before importing them, check each record and print one line per problem: `<id>: missing email` when there is no `email` key or it is blank, `<id>: bad email` when the email has no `@`, `<id>: missing age` when there is no `age` key, and `<id>: age <n> out of range` when the age is below 13 or above 120. A user can have an email problem and an age problem. Finish with `<k> of <n> users valid`.",
    spec: [
      ["Input", "`users`, a dictionary from user ID to a dictionary that may hold `\"email\"` (text) and `\"age\"` (a whole number)"],
      ["Prints", "the problem lines in user order (email before age), then `<k> of <n> users valid`"],
      ["Valid ages", "13 to 120, both included"],
      ["Examples", "the starter's users print problems for U02, U03 and U04, then `1 of 4 users valid`"],
    ],
    hiddenKinds: ["every user valid", "an email without @", "a record with no age", "ages exactly at 13 and 120", "no users at all"],
    hints: [
      "Walk the outer dictionary with `items()`: each value is one user's record.",
      "Check the email and the age separately, and remember whether this user had any problem.",
      "Test that a key is in the record before you read it, and strip the email before deciding it's blank.",
    ],
    explanation: "Each record is checked with `in` before any lookup, because a missing key would raise KeyError. The email check is an `if`/`elif`: blank first, then the `@` test, so a blank email isn't also reported as bad. The age is a separate check, since a user can fail both. A flag per user (or a count of problems) decides whether the user counts as valid. Using `>` and `<` on the boundaries keeps 13 and 120 valid.",
    code: {
      starter: src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
`,
      answer: src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
valid = 0
for user_id, record in users.items():
    ok = True
    if "email" not in record or record["email"].strip() == "":
        print(f"{user_id}: missing email")
        ok = False
    elif "@" not in record["email"]:
        print(f"{user_id}: bad email")
        ok = False
    if "age" not in record:
        print(f"{user_id}: missing age")
        ok = False
    elif record["age"] < 13 or record["age"] > 120:
        print(f"{user_id}: age {record['age']} out of range")
        ok = False
    if ok:
        valid = valid + 1
print(f"{valid} of {len(users)} users valid")
`,
      alternatives: [
        src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
valid = 0
for user_id in users:
    record = users[user_id]
    problems = []
    email = ""
    if "email" in record:
        email = record["email"].strip()
    if email == "":
        problems.append("missing email")
    elif "@" not in email:
        problems.append("bad email")
    if "age" in record:
        age = record["age"]
        if not 13 <= age <= 120:
            problems.append(f"age {age} out of range")
    else:
        problems.append("missing age")
    for problem in problems:
        print(user_id + ": " + problem)
    if len(problems) == 0:
        valid += 1
print(valid, "of", len(users), "users valid")
`,
      ],
      wrong: [
        {
          code: src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
valid = 0
for user_id, record in users.items():
    ok = True
    if "email" not in record:
        print(f"{user_id}: missing email")
        ok = False
    elif "@" not in record["email"]:
        print(f"{user_id}: bad email")
        ok = False
    if "age" not in record:
        print(f"{user_id}: missing age")
        ok = False
    elif record["age"] < 13 or record["age"] > 120:
        print(f"{user_id}: age {record['age']} out of range")
        ok = False
    if ok:
        valid = valid + 1
print(f"{valid} of {len(users)} users valid")
`,
          fails: ["output"],
          why: "a blank email isn't treated as missing, so it is reported as a bad email instead",
        },
        {
          code: src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
valid = 0
for user_id, record in users.items():
    ok = True
    if "email" not in record or record["email"].strip() == "":
        print(f"{user_id}: missing email")
        ok = False
    elif "@" not in record["email"]:
        print(f"{user_id}: bad email")
        ok = False
    if "age" not in record:
        print(f"{user_id}: missing age")
        ok = False
    elif record["age"] <= 13 or record["age"] >= 120:
        print(f"{user_id}: age {record['age']} out of range")
        ok = False
    if ok:
        valid = valid + 1
print(f"{valid} of {len(users)} users valid")
`,
          fails: ["bounds"],
          why: "`<=` and `>=` reject the boundary ages 13 and 120, which are allowed",
        },
        {
          code: src`
users = {
    "U01": {"email": "nora@fastmail.com", "age": 34},
    "U02": {"age": 9},
    "U03": {"email": "  ", "age": 41},
    "U04": {"email": "theo.icloud.com", "age": 130},
}
valid = 0
for user_id, record in users.items():
    if "email" not in record or record["email"].strip() == "":
        print(f"{user_id}: missing email")
    elif "@" not in record["email"]:
        print(f"{user_id}: bad email")
    elif "age" not in record:
        print(f"{user_id}: missing age")
    elif record["age"] < 13 or record["age"] > 120:
        print(f"{user_id}: age {record['age']} out of range")
    else:
        valid = valid + 1
print(f"{valid} of {len(users)} users valid")
`,
          fails: ["no-age", "output"],
          why: "one `elif` chain reports only the first problem, so a user with a bad email and a bad age shows one line",
        },
      ],
      task: {
        checks: [
          out("U02: missing email\nU02: age 9 out of range\nU03: missing email\nU04: bad email\nU04: age 130 out of range\n1 of 4 users valid\n"),
          shown("valid", { users: { A1: { email: "a@b.io", age: 20 } } }, "1 of 1 users valid\n"),
          rerun("bad-email", "an email without @", { users: { B1: { email: "jamal.walker", age: 30 } } }, "B1: bad email\n0 of 1 users valid\n"),
          rerun("no-age", "a record with no age", { users: { C1: { email: "c@d.io" }, C2: { email: "bad" } } }, "C1: missing age\nC2: bad email\nC2: missing age\n0 of 2 users valid\n"),
          rerun("bounds", "ages exactly at 13 and 120", { users: { D1: { email: "x@y.io", age: 13 }, D2: { email: "z@y.io", age: 120 } } }, "2 of 2 users valid\n"),
          rerun("none", "no users at all", { users: {} }, "0 of 0 users valid\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q08-22",
    version: 2,
    slug: "cinema-seat-requests",
    title: "Book seats from a list of requests",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 16,
    requires: ["assignment", "reassignment", "string-value", "whole-number", "none-value", "identity", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "nested-dict", "list-literal", "tuple-literal", "tuple-unpack", "for-loop", "membership", "if-statement", "else-clause", "logical", "comparison", "arithmetic", "string-index", "string-format", "print-call", "unquoted-name", "top-level-indent", "list-index", "nested-loop", "print-text", "nested-condition", "conversion", "continue-statement", "list-mutate"],
    prompt: "A small cinema stores its seat map as a dictionary from row letter to that row's seats, and each seat holds the name of whoever booked it, or `None` if it is free. Process booking requests in order. For each `(name, seat)` request, print `<name>: booked <seat>`, `<name>: <seat> is taken by <owner>` or `<name>: no such seat <seat>`. After the requests, print `<row>: <n> free` for every row, in seat-map order.",
    spec: [
      ["Inputs", "`seats`, a dictionary from row letter to a dictionary from seat ID to a name or `None`; `requests`, a list of `(name, seat_id)` tuples"],
      ["Seat IDs", "a seat ID starts with its row letter: `A2` is in row `A`"],
      ["No such seat", "the row doesn't exist, or the row exists but has no seat with that ID"],
      ["Examples", "the starter's data books A1 and B2, refuses A2 (taken by Nora) and C4 (no row C), then prints `A: 0 free` and `B: 1 free`"],
    ],
    hiddenKinds: ["two requests for the same free seat", "a seat that doesn't exist in a row that does", "no requests", "a row with every seat free"],
    hints: [
      "The row is the first character of the seat ID. Check the row exists, then that the seat exists in that row, before reading anything.",
      "A free seat holds None, and `is None` tests for it. Booking means storing the name in that seat.",
      "Count the free seats only after every request has been handled, with a loop over each row's values.",
    ],
    explanation: "Each request needs two guarded lookups: `row in seats`, then `seat in seats[row]`; joined with `and`, the second test only runs when the row exists. A seat holding `None` is free, so store the name there, which also makes a later request for the same seat see it as taken. The free counts must come after the loop, because bookings change them, and they need an inner loop over each row's seat values.",
    code: {
      starter: src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
`,
      answer: src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
for name, seat in requests:
    row = seat[0]
    if row in seats and seat in seats[row]:
        owner = seats[row][seat]
        if owner is None:
            seats[row][seat] = name
            print(f"{name}: booked {seat}")
        else:
            print(f"{name}: {seat} is taken by {owner}")
    else:
        print(f"{name}: no such seat {seat}")
for row, row_seats in seats.items():
    free = 0
    for owner in row_seats.values():
        if owner is None:
            free = free + 1
    print(f"{row}: {free} free")
`,
      alternatives: [
        src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
for request in requests:
    name = request[0]
    seat = request[1]
    if seat[0] not in seats:
        print(name + ": no such seat " + seat)
        continue
    row = seats[seat[0]]
    if seat not in row:
        print(name + ": no such seat " + seat)
    elif row[seat] is not None:
        print(name + ": " + seat + " is taken by " + row[seat])
    else:
        row[seat] = name
        print(name + ": booked " + seat)
for letter in seats:
    free = 0
    for seat in seats[letter]:
        if seats[letter][seat] is None:
            free += 1
    print(letter + ": " + str(free) + " free")
`,
      ],
      wrong: [
        {
          code: src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
for name, seat in requests:
    row = seat[0]
    if row in seats:
        owner = seats[row][seat]
        if owner is None:
            seats[row][seat] = name
            print(f"{name}: booked {seat}")
        else:
            print(f"{name}: {seat} is taken by {owner}")
    else:
        print(f"{name}: no such seat {seat}")
for row, row_seats in seats.items():
    free = 0
    for owner in row_seats.values():
        if owner is None:
            free = free + 1
    print(f"{row}: {free} free")
`,
          fails: ["no-seat"],
          why: "only the row is checked, so a seat number the row doesn't have raises KeyError",
        },
        {
          code: src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
for name, seat in requests:
    row = seat[0]
    if row in seats and seat in seats[row]:
        owner = seats[row][seat]
        if owner is None:
            print(f"{name}: booked {seat}")
        else:
            print(f"{name}: {seat} is taken by {owner}")
    else:
        print(f"{name}: no such seat {seat}")
for row, row_seats in seats.items():
    free = 0
    for owner in row_seats.values():
        if owner is None:
            free = free + 1
    print(f"{row}: {free} free")
`,
          fails: ["all-free", "output", "quiet", "same-seat"],
          why: "the booking is announced but never stored, so the seat stays free and can be booked again",
        },
        {
          code: src`
seats = {
    "A": {"A1": None, "A2": "Nora", "A3": "Jamal"},
    "B": {"B1": None, "B2": None},
}
requests = [("Grace", "A1"), ("Theo", "A2"), ("Iris", "C4"), ("Hugo", "B2")]
for name, seat in requests:
    row = seat[0]
    if row in seats and seat in seats[row]:
        seats[row][seat] = name
        print(f"{name}: booked {seat}")
    else:
        print(f"{name}: no such seat {seat}")
for row, row_seats in seats.items():
    free = 0
    for owner in row_seats.values():
        if owner is None:
            free = free + 1
    print(f"{row}: {free} free")
`,
          fails: ["output", "same-seat"],
          why: "a taken seat is overwritten, so Nora loses her seat to the next person who asks",
        },
      ],
      task: {
        checks: [
          out("Grace: booked A1\nTheo: A2 is taken by Nora\nIris: no such seat C4\nHugo: booked B2\nA: 0 free\nB: 1 free\n"),
          shown("quiet", { requests: [tup("Ana", "B1")] }, "Ana: booked B1\nA: 1 free\nB: 1 free\n"),
          rerun("same-seat", "two requests for the same free seat", { requests: [tup("Ana", "B1"), tup("Ben", "B1")] }, "Ana: booked B1\nBen: B1 is taken by Ana\nA: 1 free\nB: 1 free\n"),
          rerun("no-seat", "a seat that doesn't exist in a row that does", { requests: [tup("Cy", "A9")] }, "Cy: no such seat A9\nA: 1 free\nB: 2 free\n"),
          rerun("none", "no requests", { requests: [] }, "A: 1 free\nB: 2 free\n"),
          rerun("all-free", "a row with every seat free", { seats: { D: { D1: null, D2: null, D3: null } }, requests: [tup("Eve", "D2")] }, "Eve: booked D2\nD: 2 free\n"),
        ],
      },
    },
  },
];
