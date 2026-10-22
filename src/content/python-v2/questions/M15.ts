/**
 * M15 practice: ten independent problems on the function tools of PY-L15-01 … PY-L15-05.
 *
 * Mix: 5 function implementations, 1 data transformation, 3 debugging (genuinely broken code: a key that is never
 * called, a closure that forgets `nonlocal`, closures created in a loop that all see the last value), 1 output
 * prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 20. Hard: 19, 22.
 *
 * Fixtures are small Runtime Market shapes (R01): customers, orders, product records, category trees and product
 * assemblies. Function questions are graded by calling the learner's function on the public examples and on hidden
 * inputs (empty, single, ties, boundaries, deep nesting); closures are graded by expression checks that build the
 * function and call it several times. Version 2: every question was replaced; saved progress from version 1 does
 * not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expression check: runs `code` after the learner's program; `result` must equal `expected`. */
const call = (id: string, label: string, code: string, expected: unknown, opts: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(opts.show ? { show: opts.show } : {}),
  ...(opts.hidden ? { hidden: true } : {}),
});

// ---------------------------------------------------------------- fixtures

const cat = (name: string, products: string[] = [], children: unknown[] = []) => ({ name, products, children });
const catalog = cat("All", [], [
  cat("Electronics", ["Organic Speaker"], [cat("Audio", ["Studio Headphones", "Pocket Radio"], [cat("Headphones", ["Travel Earbuds"])]), cat("Cameras", ["Action Cam"])]),
  cat("Home", ["Deluxe Vase", "Nordic Candle"]),
]);

const part = (name: string, parts: unknown[] = []) => ({ name, parts });
const component = (qty: number, p: unknown) => ({ qty, part: p });
const campingKit = part("Camping Kit", [
  component(1, part("Studio Tent")),
  component(2, part("Lantern Set", [component(2, part("LED Lantern")), component(4, part("AA Battery"))])),
]);
const campingPrices = { "Studio Tent": 89, "LED Lantern": 12.5, "AA Battery": 0.5 };

const orders = [
  { order_id: "O100282", total: 35.84 },
  { order_id: "O100376", total: 91.47 },
  { order_id: "O100918", total: 55.72 },
  { order_id: "O101219", total: 246.6 },
];

/** Prerequisite tags shared by most questions: a function over lists and dictionaries. */
const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "dict-literal", "dict-lookup", "string-index", "for-loop", "membership", "if-statement", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m15Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q15-02",
    version: 2,
    slug: "how-arguments-are-collected",
    title: "How the arguments are collected",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["function-def", "function-param", "function-default", "star-args", "star-kwargs", "keyword-only", "len-call", "boolean", "print-call", "print-several", "top-level-indent", "assignment", "reassignment", "arithmetic"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "The first positional argument always fills `order_id`. Every other positional argument goes into `items`.",
      "`items` is a tuple. Think about how Python prints a tuple with one item, and one with none.",
      "`gift` comes after `*items`, so only a named `gift=` can change it; any other named argument lands in `notes`.",
    ],
    explanation: "`order_id` takes the first positional argument and `*items` collects the rest into a tuple: two items, then one, then none. Python prints a one-item tuple with a trailing comma, `('P0209',)`, so it can't be mistaken for a value in brackets, and an empty tuple as `()`. `gift` sits after the star, so it is keyword-only and keeps its default unless named. `note=` matches no parameter, so `**notes` collects it into a dictionary; otherwise `notes` is an empty dictionary.",
    predict: {
      program: src`
def pack_order(order_id, *items, gift=False, **notes):
    print(order_id, len(items), items, gift, notes)

pack_order("O100282", "P0164", "P0594")
pack_order("O100376", "P0209", gift=True)
pack_order("O100918", note="leave at door")
`,
      output: "O100282 2 ('P0164', 'P0594') False {}\nO100376 1 ('P0209',) True {}\nO100918 0 () False {'note': 'leave at door'}\n",
      wrongPredictions: [
        "O100282 2 ['P0164', 'P0594'] False {}\nO100376 1 ['P0209'] True {}\nO100918 0 [] False {'note': 'leave at door'}",
        "O100282 2 ('P0164', 'P0594') False {}\nO100376 1 ('P0209') True {}\nO100918 0 () False {'note': 'leave at door'}",
        "O100282 2 ('P0164', 'P0594') False {}\nO100376 1 ('P0209',) True {'gift': True}\nO100918 0 () False {'note': 'leave at door'}",
        "O100282 2 ('P0164', 'P0594') False {}\nO100376 1 ('P0209',) True {}\nO100918 1 ('leave at door',) False {}",
      ],
    },
  },
  {
    id: "PY-Q15-03",
    version: 2,
    slug: "sort-names-ignoring-capitals",
    title: "A name sort that crashes",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "lambda", "sort-key", "list-sort", "string-method", "runtime-error", "print-several", "print-text"],
    prompt: "`sort_names` should list customer names A–Z without caring about capital letters, keeping each name exactly as it was typed. Instead it stops with `TypeError: '<' not supported between instances of 'builtin_function_or_method' and 'builtin_function_or_method'`. Find the bug and fix it.",
    spec: [
      ["Function", "`sort_names(names)`"],
      ["names", "a list of texts"],
      ["Returns", "a new list of the same names, A–Z ignoring capitals; names that differ only in capitals keep their input order"],
      ["Keep", "the original spelling of every name"],
    ],
    hiddenKinds: ["a capital letter in the middle of a name", "two names that differ only in capitals", "a single name", "no names"],
    hints: [
      "Read the error: `sorted` is comparing two *methods*, not two texts. Where does a method come from in this code?",
      "`name.lower` names the method; it doesn't run it. The key has to hand back the lower-case text itself.",
      "The lambda's body is an expression that is evaluated for each name, so it must call the method.",
    ],
    explanation: "`lambda name: name.lower` returns the method object `name.lower` for every name, and Python can't order method objects, hence the TypeError. Calling it, `name.lower()`, returns the lower-case text, so `sorted` compares texts while still returning the original names. Sorting the lower-cased names themselves would lose the original spelling, and sorting without a key puts every capital letter before every small one (`McKay` before `Mcdonald`).",
    code: {
      starter: src`
def sort_names(names):
    return sorted(names, key=lambda name: name.lower)

print(sort_names(["nora", "Theo", "grace", "Jamal"]))
`,
      answer: src`
def sort_names(names):
    return sorted(names, key=lambda name: name.lower())

print(sort_names(["nora", "Theo", "grace", "Jamal"]))
`,
      alternatives: [
        src`
def lower_name(name):
    return name.lower()

def sort_names(names):
    return sorted(names, key=lower_name)
`,
      ],
      wrong: [
        {
          code: src`
def sort_names(names):
    return sorted(names)
`,
          fails: ["returns"],
          why: "without a key, every capital letter sorts before every small letter",
        },
        {
          code: src`
def sort_names(names):
    return sorted([name.lower() for name in names])
`,
          fails: ["returns"],
          why: "the names come back lower-cased instead of as they were typed",
        },
        {
          code: src`
def sort_names(names):
    return sorted(names, key=lambda name: name.lower(), reverse=True)
`,
          fails: ["returns"],
          why: "`reverse=True` gives Z to A",
        },
      ],
      task: {
        checks: [
          fn("returns", "sort_names", [
            example([["nora", "Theo", "grace", "Jamal"]], ["grace", "Jamal", "nora", "Theo"]),
            example([["Zoe", "adam"]], ["adam", "Zoe"]),
            example([["Ana", "Ben"]], ["Ana", "Ben"]),
            hiddenCase("a capital letter in the middle of a name", [["McKay", "Mcdonald", "MacLeod"]], ["MacLeod", "Mcdonald", "McKay"]),
            hiddenCase("two names that differ only in capitals", [["bob", "Amy", "Bob"]], ["Amy", "bob", "Bob"]),
            hiddenCase("a single name", [["Grace"]], ["Grace"]),
            hiddenCase("no names", [[]], []),
          ], { label: "sort_names() sorts A–Z ignoring capitals and keeps the spelling" }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-06",
    version: 2,
    slug: "first-value-provided",
    title: "The first value that was provided",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "star-args", "for-loop", "if-statement", "identity", "none-value", "print-call", "print-several", "unquoted-name", "top-level-indent", "print-text", "arithmetic", "logical", "membership", "assignment", "truthiness", "string-index", "list-literal", "list-index", "list-comp", "comp-if"],
    prompt: "A customer's phone number can come from several places: their account, their last order, a delivery note. Each source gives `None` when it has no number. Write `first_present(*values)`: return the first value that is not `None`, or `None` when every value is missing. Callers pass the sources as separate arguments, as many as they have.",
    spec: [
      ["Function", "`first_present(*values)`"],
      ["values", "any number of values, possibly none at all"],
      ["Returns", "the first value that is not `None`; `None` if there is none"],
      ["Rules", "only `None` counts as missing: `0`, `False` and `\"\"` are real values and are returned"],
    ],
    hiddenKinds: ["a zero after a missing value", "an empty text before a real one", "every value missing", "a single value", "many values"],
    hints: [
      "The starred parameter is a tuple of every argument, in the order they were passed.",
      "Walk it and stop at the first value that is not missing; `return` inside the loop stops the whole function.",
      "Test with `is not None`, not with truthiness, or a real `0` would be skipped. If the loop finishes, nothing was found.",
    ],
    explanation: "`*values` collects the arguments into a tuple, so a `for` loop visits them in order and `return value` stops at the first one that `is not None`. Falling off the end of the loop means every value was missing, so the function returns `None`. The common bug is `if value:`, which treats `0` and `\"\"` as missing too; the other is a single list parameter, which makes `first_present(None, \"x\")` a TypeError.",
    code: {
      starter: src`
def first_present(*values):
    return None

print(first_present(None, "+44 20 7946 0958", "+1 202 555 0143"))
`,
      answer: src`
def first_present(*values):
    for value in values:
        if value is not None:
            return value
    return None

print(first_present(None, "+44 20 7946 0958", "+1 202 555 0143"))
`,
      alternatives: [
        src`
def first_present(*values):
    found = [value for value in values if value is not None]
    if found:
        return found[0]
    return None
`,
      ],
      wrong: [
        {
          code: src`
def first_present(*values):
    for value in values:
        if value:
            return value
    return None
`,
          fails: ["returns"],
          why: "truthiness skips real values such as `0` and `\"\"`",
        },
        {
          code: src`
def first_present(values):
    for value in values:
        if value is not None:
            return value
    return None
`,
          fails: ["returns"],
          why: "without the star it takes exactly one argument, so several sources raise TypeError",
        },
        {
          code: src`
def first_present(*values):
    found = None
    for value in values:
        if value is not None:
            found = value
    return found
`,
          fails: ["returns"],
          why: "it keeps going and returns the last value provided, not the first",
        },
      ],
      task: {
        checks: [
          fn("returns", "first_present", [
            example([null, "+44 20 7946 0958", "+1 202 555 0143"], "+44 20 7946 0958"),
            example(["nora@fastmail.com", null], "nora@fastmail.com"),
            example([null, null], null),
            example([], null),
            hiddenCase("a zero after a missing value", [null, 0, 7], 0),
            hiddenCase("an empty text before a real one", ["", "fallback"], ""),
            hiddenCase("every value missing", [null, null, null, null], null),
            hiddenCase("a single value", [false], false),
            hiddenCase("many values", [null, null, null, null, null, "late", "later"], "late"),
          ], { label: "first_present() returns the first value that is not None" }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-10",
    version: 2,
    slug: "product-anywhere-in-the-tree",
    title: "Is the product anywhere in this category?",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "recursion", "boolean", "print-several", "print-text", "nested-dict", "truthiness", "logical", "any-call"],
    prompt: "A shop's categories nest to any depth, and each category lists its own products. Before deleting a category, the shop checks whether a product is filed anywhere inside it. Write `contains_product(category, product)`: return `True` if the product is listed in this category or in any category below it, otherwise `False`.",
    spec: [
      ["Function", "`contains_product(category, product)`"],
      ["category", "`{\"name\": …, \"products\": [names…], \"children\": [categories of the same shape…]}`"],
      ["Returns", "`True` or `False`"],
      ["Rules", "names are compared exactly (capitals matter); a category may have no products and no children"],
    ],
    hiddenKinds: ["a product three levels down", "a product only in the last child", "a name that differs only in capitals", "an empty category"],
    hints: [
      "Check this category's own product list first: if the product is there, you already know the answer.",
      "Otherwise each child category is the same question on a smaller tree. Ask it by calling the function itself.",
      "Return `True` as soon as one child says yes, but only return `False` once every child has said no.",
    ],
    explanation: "The base case is the category's own list: `product in category[\"products\"]` answers directly. Otherwise the function asks each child the same question by calling itself, returning `True` as soon as one child finds it, and `False` only after the loop has asked them all. Returning the first child's answer straight away (`return contains_product(child, product)` inside the loop) never looks at the later children, and checking only the children's product lists misses anything deeper.",
    code: {
      starter: src`
def contains_product(category, product):
    return False

catalog = {"name": "All", "products": [], "children": [
    {"name": "Electronics", "products": ["Organic Speaker"], "children": [
        {"name": "Audio", "products": ["Studio Headphones", "Pocket Radio"], "children": []},
    ]},
    {"name": "Home", "products": ["Deluxe Vase", "Nordic Candle"], "children": []},
]}
print(contains_product(catalog, "Pocket Radio"), contains_product(catalog, "Garden Hose"))
`,
      answer: src`
def contains_product(category, product):
    if product in category["products"]:
        return True
    for child in category["children"]:
        if contains_product(child, product):
            return True
    return False

catalog = {"name": "All", "products": [], "children": [
    {"name": "Electronics", "products": ["Organic Speaker"], "children": [
        {"name": "Audio", "products": ["Studio Headphones", "Pocket Radio"], "children": []},
    ]},
    {"name": "Home", "products": ["Deluxe Vase", "Nordic Candle"], "children": []},
]}
print(contains_product(catalog, "Pocket Radio"), contains_product(catalog, "Garden Hose"))
`,
      alternatives: [
        src`
def contains_product(category, product):
    return product in category["products"] or any(contains_product(child, product) for child in category["children"])
`,
      ],
      wrong: [
        {
          code: src`
def contains_product(category, product):
    if product in category["products"]:
        return True
    for child in category["children"]:
        return contains_product(child, product)
    return False
`,
          fails: ["returns"],
          why: "it returns the first child's answer, so later children are never searched",
        },
        {
          code: src`
def contains_product(category, product):
    if product in category["products"]:
        return True
    for child in category["children"]:
        if product in child["products"]:
            return True
    return False
`,
          fails: ["returns"],
          why: "only one level below is searched; deeper categories are missed",
        },
      ],
      task: {
        checks: [
          fn("returns", "contains_product", [
            example([catalog, "Pocket Radio"], true),
            example([catalog, "Garden Hose"], false),
            example([catalog, "Nordic Candle"], true),
            hiddenCase("a product three levels down", [catalog, "Travel Earbuds"], true),
            hiddenCase("a product only in the last child", [cat("Shop", [], [cat("A", ["x"]), cat("B", ["y"]), cat("C", ["Bike Light"])]), "Bike Light"], true),
            hiddenCase("a name that differs only in capitals", [catalog, "pocket radio"], false),
            hiddenCase("an empty category", [cat("Empty"), "Deluxe Vase"], false),
          ], { label: "contains_product() searches every level" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q15-12",
    version: 2,
    slug: "notify-only-on-change",
    title: "Notify only when the status changes",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "closure", "assignment", "reassignment", "comparison", "logical", "if-statement", "boolean", "none-value", "list-literal", "list-comp", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "membership", "string-index", "list-index", "list-mutate"],
    prompt: "An order tracker receives the same status many times (`packed`, `packed`, `shipped`…) and should message the customer only when it changes. `make_change_detector()` returns a function `changed(value)` for that, but calling it stops with `UnboundLocalError`. Fix it so that `changed` returns `True` when the value differs from the one passed on the previous call, and `False` when it is the same. The **first** call always counts as a change, whatever the value, including `None`.",
    spec: [
      ["Function", "`make_change_detector()`"],
      ["Returns", "a function `changed(value)`"],
      ["changed(value)", "`True` on the first call and whenever `value` differs from the previous call's value; otherwise `False`"],
      ["Rules", "each detector remembers only its own values"],
    ],
    hiddenKinds: ["a value that returns to an earlier one", "two detectors used side by side", "a first value of None", "a single call"],
    hints: [
      "Read the error: `previous = value` assigns, so Python treats `previous` as a new local variable of `changed`.",
      "`nonlocal` tells the inner function to update the outer function's variable instead.",
      "Then try a first call with `None`: the starting `None` looks like a previous value. The detector also needs to remember whether it has been called at all.",
    ],
    explanation: "Assigning to `previous` inside `changed` makes it local to `changed`, so the comparison on the line before reads a local that has no value yet: UnboundLocalError. `nonlocal previous` makes the assignment update the variable kept by the closure. That alone still answers `False` for a first call with `None`, because the starting value `None` is indistinguishable from a real previous `None`, so the fixed version also keeps a `started` flag (or a list of values seen). A global variable would fix the error but make every detector share one memory.",
    code: {
      starter: src`
def make_change_detector():
    previous = None
    def changed(value):
        if value == previous:
            return False
        previous = value
        return True
    return changed

notify = make_change_detector()
print([notify(status) for status in ["packed", "packed", "shipped", "shipped", "delivered"]])
`,
      answer: src`
def make_change_detector():
    previous = None
    started = False
    def changed(value):
        nonlocal previous, started
        if started and value == previous:
            return False
        previous = value
        started = True
        return True
    return changed

notify = make_change_detector()
print([notify(status) for status in ["packed", "packed", "shipped", "shipped", "delivered"]])
`,
      alternatives: [
        src`
def make_change_detector():
    seen = []
    def changed(value):
        if seen and seen[-1] == value:
            return False
        seen.append(value)
        return True
    return changed
`,
      ],
      wrong: [
        {
          code: src`
def make_change_detector():
    previous = None
    def changed(value):
        nonlocal previous
        if value == previous:
            return False
        previous = value
        return True
    return changed
`,
          fails: ["first-none"],
          why: "the starting `None` is treated as a real previous value, so a first `None` is not reported",
        },
        {
          code: src`
previous = None
started = False

def make_change_detector():
    def changed(value):
        global previous, started
        if started and value == previous:
            return False
        previous = value
        started = True
        return True
    return changed
`,
          fails: ["side-by-side"],
          why: "global variables are shared, so every detector remembers the other detectors' values",
        },
        {
          code: src`
def make_change_detector():
    previous = None
    started = False
    def changed(value):
        nonlocal previous, started
        if started and value == previous:
            return False
        started = True
        return True
    return changed
`,
          fails: ["statuses", "back-again", "side-by-side"],
          why: "the new value is never stored, so every later call compares with the first value",
        },
      ],
      task: {
        checks: [
          call("statuses", "changed() reports only real changes", "_c = make_change_detector()\nresult = [_c(s) for s in ['packed', 'packed', 'shipped', 'shipped', 'delivered']]", [true, false, true, false, true], { show: "notify = make_change_detector(); [notify(s) for s in ['packed', 'packed', 'shipped', 'shipped', 'delivered']]" }),
          call("back-again", "a value that returns to an earlier one", "_c = make_change_detector()\nresult = [_c(20.5), _c(21.0), _c(20.5), _c(20.5)]", [true, true, true, false], { hidden: true }),
          call("side-by-side", "two detectors used side by side", "_a = make_change_detector()\n_b = make_change_detector()\nresult = [_a('open'), _b('open'), _a('open'), _b('closed')]", [true, true, false, true], { hidden: true }),
          call("first-none", "a first value of None", "_c = make_change_detector()\nresult = [_c(None), _c(None), _c(0)]", [true, false, true], { hidden: true }),
          call("single", "a single call", "result = make_change_detector()('pending')", true, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-13",
    version: 2,
    slug: "split-by-any-rule",
    title: "Split a list by any rule",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "lambda", "list-mutate", "else-clause", "tuple-literal", "comparison", "string-method", "print-several", "print-text", "truthiness", "tuple-unpack", "logical", "list-comp", "comp-if"],
    prompt: "Several reports need the same job: split a list in two, the items that pass some rule and the items that don't. Write a reusable `partition(items, test)`, where `test` is a function that takes one item. Then write `split_orders(orders, minimum)`, which uses `partition` with an inline `lambda` to split orders into those whose `total` is at least `minimum` and the rest, returning their order IDs.",
    spec: [
      ["Function 1", "`partition(items, test)` → a tuple `(passed, failed)` of two new lists, each in the original order; an item passes when `test(item)` is true"],
      ["Function 2", "`split_orders(orders, minimum)` → `(large_ids, small_ids)`, using `partition`"],
      ["orders", "a list of dictionaries with `order_id` and `total`"],
      ["Rules", "`items` is not changed; a rule may return any value, which counts by its truthiness (so `\"\"` fails)"],
    ],
    hiddenKinds: ["a total exactly equal to the minimum", "every order large", "no orders", "partition with a rule that returns text", "partition leaves its list unchanged"],
    hints: [
      "`partition` doesn't know what the rule is: it calls `test(item)` for each item and puts the item in one of two lists.",
      "Return both lists together, passed first, as a tuple.",
      "In `split_orders`, the lambda takes one order and compares its total with `minimum`, which it can read from the surrounding function. Then turn each list of orders into a list of IDs.",
    ],
    explanation: "`partition` calls the function it was given once per item (`test(item)`, with brackets) and appends the item to `passed` or `failed`, then returns both as a tuple. Because `if` tests truthiness, a rule may return text or a number as well as a bool. `split_orders` passes `lambda order: order[\"total\"] >= minimum`, a one-off rule that reads `minimum` from the enclosing call, and maps both halves to IDs. Writing `if test:` tests the function object itself, which is always true, so everything passes; `filter` gives a lazy iterator, not a list.",
    code: {
      starter: src`
def partition(items, test):
    return [], []

def split_orders(orders, minimum):
    return [], []

orders = [
    {"order_id": "O100282", "total": 35.84},
    {"order_id": "O100376", "total": 91.47},
    {"order_id": "O100918", "total": 55.72},
    {"order_id": "O101219", "total": 246.6},
]
print(split_orders(orders, 60))
print(partition(["C489528", "489438", "C489541"], lambda code: code.startswith("C")))
`,
      answer: src`
def partition(items, test):
    passed = []
    failed = []
    for item in items:
        if test(item):
            passed.append(item)
        else:
            failed.append(item)
    return passed, failed

def split_orders(orders, minimum):
    large, small = partition(orders, lambda order: order["total"] >= minimum)
    return [order["order_id"] for order in large], [order["order_id"] for order in small]

orders = [
    {"order_id": "O100282", "total": 35.84},
    {"order_id": "O100376", "total": 91.47},
    {"order_id": "O100918", "total": 55.72},
    {"order_id": "O101219", "total": 246.6},
]
print(split_orders(orders, 60))
print(partition(["C489528", "489438", "C489541"], lambda code: code.startswith("C")))
`,
      alternatives: [
        src`
def partition(items, test):
    passed = [item for item in items if test(item)]
    failed = [item for item in items if not test(item)]
    return (passed, failed)

def ids(orders):
    return [order["order_id"] for order in orders]

def split_orders(orders, minimum):
    large, small = partition(orders, lambda order: order["total"] >= minimum)
    return (ids(large), ids(small))
`,
      ],
      wrong: [
        {
          code: src`
def partition(items, test):
    passed = []
    failed = []
    for item in items:
        if test:
            passed.append(item)
        else:
            failed.append(item)
    return passed, failed

def split_orders(orders, minimum):
    large, small = partition(orders, lambda order: order["total"] >= minimum)
    return [order["order_id"] for order in large], [order["order_id"] for order in small]
`,
          fails: ["returns", "rule-text", "codes"],
          why: "`if test:` checks the function itself, which is always true, so every item passes",
        },
        {
          code: src`
def partition(items, test):
    passed = []
    failed = []
    for item in items:
        if test(item):
            passed.append(item)
        else:
            failed.append(item)
    return passed, failed

def split_orders(orders, minimum):
    large, small = partition(orders, lambda order: order["total"] > minimum)
    return [order["order_id"] for order in large], [order["order_id"] for order in small]
`,
          fails: ["returns"],
          why: "`>` puts an order of exactly the minimum among the small ones",
        },
        {
          code: src`
def partition(items, test):
    return list(filter(test, items)), []

def split_orders(orders, minimum):
    large, small = partition(orders, lambda order: order["total"] >= minimum)
    return [order["order_id"] for order in large], [order["order_id"] for order in small]
`,
          fails: ["returns", "rule-text", "codes"],
          why: "the items that fail the rule are thrown away instead of returned",
        },
      ],
      task: {
        checks: [
          fn("returns", "split_orders", [
            example([orders, 60], py.tuple(pv(["O100376", "O101219"]), pv(["O100282", "O100918"]))),
            example([orders, 300], py.tuple(pv([]), pv(["O100282", "O100376", "O100918", "O101219"]))),
            example([orders, 0], py.tuple(pv(["O100282", "O100376", "O100918", "O101219"]), pv([]))),
            hiddenCase("a total exactly equal to the minimum", [[{ order_id: "O1", total: 50 }, { order_id: "O2", total: 49.99 }], 50], py.tuple(pv(["O1"]), pv(["O2"]))),
            hiddenCase("every order large", [[{ order_id: "A", total: 400 }, { order_id: "B", total: 120 }], 100], py.tuple(pv(["A", "B"]), pv([]))),
            hiddenCase("no orders", [[], 10], py.tuple(pv([]), pv([]))),
          ], { label: "split_orders() splits order IDs at the minimum" }),
          call("codes", "partition() splits by any rule, keeping the order", "result = partition(['C489528', '489438', 'C489541'], lambda code: code.startswith('C'))", py.tuple(pv(["C489528", "C489541"]), pv(["489438"])), { show: "partition(['C489528', '489438', 'C489541'], lambda code: code.startswith('C'))" }),
          call("rule-text", "partition with a rule that returns text", "result = partition(['ok', '', ' x '], lambda s: s.strip())", py.tuple(pv(["ok", " x "]), pv([""])), { hidden: true }),
          call("unchanged", "partition leaves its list unchanged", "_x = [3, 8, 1]\npartition(_x, lambda n: n > 2)\nresult = _x", [3, 8, 1], { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-16",
    version: 2,
    slug: "fill-missing-fields",
    title: "Fill in the missing fields",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "star-kwargs", "dict-iterate", "dict-store", "list-copy", "logical", "identity", "none-value", "print-several", "print-text", "arithmetic", "list-mutate"],
    prompt: "Product records arrive from suppliers with fields left out or set to `None`. Before import, each record is completed with the shop's default values, which differ from call to call. Write `fill_missing(record, **defaults)`: return a **new** dictionary with every field of `record`, plus each default for a field that is absent or `None`. A field that has a real value keeps it, even when that value is `0` or `\"\"`.",
    spec: [
      ["Function", "`fill_missing(record, **defaults)`"],
      ["record", "a dictionary of field names to values"],
      ["defaults", "any number of named arguments, such as `colour=\"black\"`"],
      ["Returns", "a new dictionary; `record` itself is left unchanged"],
    ],
    hiddenKinds: ["a value of zero is kept", "an empty text is kept", "no defaults given", "an empty record", "the record passed in is left unchanged"],
    hints: [
      "`defaults` arrives as a dictionary of the named arguments: walk it with `items()`.",
      "Start from a copy of the record, so the caller's dictionary is never written to.",
      "Store a default only when the field is not in the copy, or is there but `is None`. Don't test truthiness, or a stock of `0` would be replaced.",
    ],
    explanation: "`**defaults` collects the named arguments into a dictionary. The answer copies `record`, then for each default checks `field not in filled or filled[field] is None` before storing it, so real values, including `0` and `\"\"`, win. `record.update(defaults)` overwrites real values; writing into `record` itself changes the caller's data; and `if not filled[field]` treats `0` as missing.",
    code: {
      starter: src`
def fill_missing(record, **defaults):
    return record

row = {"sku": "SPO-11681", "colour": None, "stock": 0}
print(fill_missing(row, colour="black", stock=10, material="cotton"))
print(row)
`,
      answer: src`
def fill_missing(record, **defaults):
    filled = record.copy()
    for field, value in defaults.items():
        if field not in filled or filled[field] is None:
            filled[field] = value
    return filled

row = {"sku": "SPO-11681", "colour": None, "stock": 0}
print(fill_missing(row, colour="black", stock=10, material="cotton"))
print(row)
`,
      alternatives: [
        src`
def fill_missing(record, **defaults):
    filled = {}
    for field, value in record.items():
        filled[field] = value
        if value is None and field in defaults:
            filled[field] = defaults[field]
    for field, value in defaults.items():
        if field not in record:
            filled[field] = value
    return filled
`,
      ],
      wrong: [
        {
          code: src`
def fill_missing(record, **defaults):
    filled = record.copy()
    filled.update(defaults)
    return filled
`,
          fails: ["returns"],
          why: "`update` overwrites real values with the defaults",
        },
        {
          code: src`
def fill_missing(record, **defaults):
    for field, value in defaults.items():
        if field not in record or record[field] is None:
            record[field] = value
    return record
`,
          fails: ["keeps-input"],
          why: "the caller's record is filled in place instead of copied",
        },
        {
          code: src`
def fill_missing(record, **defaults):
    filled = record.copy()
    for field, value in defaults.items():
        if field not in filled or not filled[field]:
            filled[field] = value
    return filled
`,
          fails: ["returns"],
          why: "truthiness treats a real `0` or `\"\"` as missing",
        },
      ],
      task: {
        checks: [
          fn("returns", "fill_missing", [
            example([{ sku: "SPO-11681", colour: null, stock: 0 }], { sku: "SPO-11681", colour: "black", stock: 0, material: "cotton" }, { kwargs: { colour: "black", stock: 10, material: "cotton" } }),
            example([{ sku: "HOM-22847", size: "L" }], { sku: "HOM-22847", size: "L", colour: "white" }, { kwargs: { colour: "white" } }),
            example([{ sku: "ELE-24781", warranty: null }], { sku: "ELE-24781", warranty: 12 }, { kwargs: { warranty: 12 } }),
            hiddenCase("a value of zero is kept", [{ discount: 0 }], { discount: 0 }, { kwargs: { discount: 0.1 } }),
            hiddenCase("an empty text is kept", [{ note: "" }], { note: "", gift: false }, { kwargs: { note: "none", gift: false } }),
            hiddenCase("no defaults given", [{ sku: "X", colour: null }], { sku: "X", colour: null }),
            hiddenCase("an empty record", [{}], { a: 1, b: 2 }, { kwargs: { a: 1, b: 2 } }),
          ], { label: "fill_missing() adds defaults only for absent or None fields" }),
          fn("keeps-input", "fill_missing", [
            keepsInput([{ sku: "SPO-11681", colour: null }], { kwargs: { colour: "black", size: "M" } }),
            keepsInput([{ stock: null }], { kwargs: { stock: 5 }, label: "the record passed in is left unchanged" }),
          ], { label: "fill_missing() leaves the record it is given unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-20",
    version: 2,
    slug: "one-menu-row-per-level",
    title: "One menu row per level",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: [...fnBase, "recursion", "arithmetic", "comparison", "list-mutate", "print-several", "nested-dict"],
    prompt: "A shop's mega-menu shows one row per level of the category tree: the departments, then the sections inside them, and so on. Write `names_at_level(category, level)`: return the names of every category exactly `level` steps below `category`, from left to right. Level 0 is the category itself.",
    spec: [
      ["Function", "`names_at_level(category, level)`"],
      ["category", "`{\"name\": …, \"products\": […], \"children\": [categories of the same shape…]}`"],
      ["level", "a whole number, 0 or more"],
      ["Returns", "a new list of names, in left-to-right order; `[]` when the tree is not that deep"],
    ],
    hiddenKinds: ["a level deeper than the tree", "the deepest level of an uneven tree", "a single category at level 0", "a level where only one branch reaches"],
    hints: [
      "Level 0 is the base case: the answer is just this category's name, in a list.",
      "Level 2 below this category is level 1 below each of its children. Each step down makes the level one smaller.",
      "Collect the children's answers in order, adding every item of each child's list to one result list.",
    ],
    explanation: "Each call either stops (`level == 0`: the category's own name) or asks every child for the names `level - 1` below it and joins those lists in order with `extend`. A tree that runs out of children before the level reaches 0 simply contributes nothing, so a level deeper than the tree gives `[]`. Listing only the direct children works for level 1 but not deeper; and a base case of `level == 1` shifts every row by one.",
    code: {
      starter: src`
def names_at_level(category, level):
    return []

menu = {"name": "All", "products": [], "children": [
    {"name": "Electronics", "products": [], "children": [
        {"name": "Audio", "products": [], "children": []},
        {"name": "Cameras", "products": [], "children": []},
    ]},
    {"name": "Home", "products": [], "children": []},
]}
print(names_at_level(menu, 1))
print(names_at_level(menu, 2))
`,
      answer: src`
def names_at_level(category, level):
    if level == 0:
        return [category["name"]]
    names = []
    for child in category["children"]:
        names.extend(names_at_level(child, level - 1))
    return names

menu = {"name": "All", "products": [], "children": [
    {"name": "Electronics", "products": [], "children": [
        {"name": "Audio", "products": [], "children": []},
        {"name": "Cameras", "products": [], "children": []},
    ]},
    {"name": "Home", "products": [], "children": []},
]}
print(names_at_level(menu, 1))
print(names_at_level(menu, 2))
`,
      alternatives: [
        src`
def names_at_level(category, level):
    if level == 0:
        return [category["name"]]
    return [name for child in category["children"] for name in names_at_level(child, level - 1)]
`,
      ],
      wrong: [
        {
          code: src`
def names_at_level(category, level):
    if level == 0:
        return [category["name"]]
    return [child["name"] for child in category["children"]]
`,
          fails: ["returns"],
          why: "every level above 0 lists only the direct children",
        },
        {
          code: src`
def names_at_level(category, level):
    if level == 1:
        return [category["name"]]
    names = []
    for child in category["children"]:
        names.extend(names_at_level(child, level - 1))
    return names
`,
          fails: ["returns"],
          why: "stopping at level 1 shifts every row one level up",
        },
        {
          code: src`
def names_at_level(category, level):
    names = [category["name"]]
    if level == 0:
        return names
    for child in category["children"]:
        names.extend(names_at_level(child, level - 1))
    return names
`,
          fails: ["returns"],
          why: "every level on the way down is included, not only the requested one",
        },
      ],
      task: {
        checks: [
          fn("returns", "names_at_level", [
            example([catalog, 1], ["Electronics", "Home"]),
            example([catalog, 2], ["Audio", "Cameras"]),
            example([catalog, 0], ["All"]),
            hiddenCase("a level deeper than the tree", [catalog, 7], []),
            hiddenCase("the deepest level of an uneven tree", [catalog, 3], ["Headphones"]),
            hiddenCase("a single category at level 0", [cat("Sale"), 0], ["Sale"]),
            hiddenCase("a level where only one branch reaches", [cat("R", [], [cat("A", [], [cat("A1"), cat("A2")]), cat("B"), cat("C", [], [cat("C1")])]), 2], ["A1", "A2", "C1"]),
          ], { label: "names_at_level() lists the names exactly that many levels down" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q15-19",
    version: 2,
    slug: "validators-share-one-limit",
    title: "Every validator checks the last limit",
    format: "debugging",
    difficulty: "hard",
    minutes: 15,
    requires: ["function-def", "function-param", "function-return", "closure", "assignment", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "string-index", "comparison", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "boolean", "list-literal", "print-text", "membership", "list-mutate", "function-default", "dict-comp"],
    prompt: "`make_validators(limits)` builds one check function per field of an order form, from a dictionary such as `{\"quantity\": 10, \"discount\": 0.5}`. Each check should return `True` when a value is at most **its own** field's limit. But every check behaves as if its limit were the last one in the dictionary: `checks[\"quantity\"](8)` is `False`. Find out why and fix it.",
    spec: [
      ["Function", "`make_validators(limits)`"],
      ["limits", "a dictionary of field name → maximum allowed value"],
      ["Returns", "a dictionary of field name → function; `checks[field](value)` is `True` when `value <= limits[field]`"],
      ["Keep", "the function name and what it returns"],
    ],
    hiddenKinds: ["three fields with very different limits", "a value exactly at the limit", "a single field", "no fields"],
    hints: [
      "Print `checks[\"quantity\"](8)` and `checks[\"quantity\"](0.4)`: which limit is it really comparing with?",
      "The inner function reads `limit` when it is **called**, not when it is defined. By then the loop has finished, and `limit` holds the last value.",
      "Each check needs its own variable: create each one from a small factory function that takes the limit as a parameter, so every call to the factory makes a fresh `limit`.",
    ],
    explanation: "All the inner functions close over the same variable, `limit`, of the one call to `make_validators`. A closure looks up the variable's value when it runs, and by then the loop has left the last limit in it, so every check uses 0.5. Moving the inner function into a factory, `make_check(limit)`, gives each check its own `limit`, because each call to a function creates new variables. A default argument (`def within(value, limit=limit)`) also works, because defaults are evaluated when the `def` runs. Adding `nonlocal` or rewriting the inner function as a lambda in the loop keeps the same shared variable, so the bug stays.",
    code: {
      starter: src`
def make_validators(limits):
    validators = {}
    for field, limit in limits.items():
        def within(value):
            return value <= limit
        validators[field] = within
    return validators

checks = make_validators({"quantity": 10, "discount": 0.5})
print(checks["quantity"](8), checks["discount"](0.8))
`,
      answer: src`
def make_check(limit):
    def within(value):
        return value <= limit
    return within

def make_validators(limits):
    validators = {}
    for field, limit in limits.items():
        validators[field] = make_check(limit)
    return validators

checks = make_validators({"quantity": 10, "discount": 0.5})
print(checks["quantity"](8), checks["discount"](0.8))
`,
      alternatives: [
        src`
def make_validators(limits):
    validators = {}
    for field, limit in limits.items():
        def within(value, limit=limit):
            return value <= limit
        validators[field] = within
    return validators
`,
        src`
def make_check(limit):
    def within(value):
        return value <= limit
    return within

def make_validators(limits):
    return {field: make_check(limit) for field, limit in limits.items()}
`,
      ],
      wrong: [
        {
          code: src`
def make_validators(limits):
    validators = {}
    for field, limit in limits.items():
        def within(value):
            nonlocal limit
            return value <= limit
        validators[field] = within
    return validators
`,
          fails: ["form", "three", "at-limit"],
          why: "`nonlocal` still points at the one shared `limit`, so the last limit wins",
        },
        {
          code: src`
def make_check(limit):
    def within(value):
        return value < limit
    return within

def make_validators(limits):
    validators = {}
    for field, limit in limits.items():
        validators[field] = make_check(limit)
    return validators
`,
          fails: ["at-limit", "single"],
          why: "`<` rejects a value exactly at the limit",
        },
      ],
      task: {
        checks: [
          call("form", "each check uses its own field's limit", "_v = make_validators({'quantity': 10, 'discount': 0.5})\nresult = [_v['quantity'](8), _v['discount'](0.8), _v['quantity'](11), _v['discount'](0.2)]", [true, false, false, true], { show: "checks = make_validators({'quantity': 10, 'discount': 0.5}); [checks['quantity'](8), checks['discount'](0.8), checks['quantity'](11), checks['discount'](0.2)]" }),
          call("three", "three fields with very different limits", "_v = make_validators({'age': 120, 'rating': 5, 'weight_kg': 30})\nresult = [_v['age'](64), _v['rating'](6), _v['weight_kg'](12.5)]", [true, false, true], { hidden: true }),
          call("at-limit", "a value exactly at the limit", "_v = make_validators({'items': 3, 'gift_cards': 1})\nresult = [_v['items'](3), _v['gift_cards'](1)]", [true, true], { hidden: true }),
          call("single", "a single field", "_v = make_validators({'quantity': 99})\nresult = [_v['quantity'](99), _v['quantity'](100)]", [true, false], { hidden: true }),
          call("empty", "no fields", "result = make_validators({})", {}, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q15-22",
    version: 2,
    slug: "cost-of-an-assembly",
    title: "What does a kit cost to build?",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "recursion", "keyword-only", "function-default", "arithmetic", "reassignment", "comparison", "print-several", "nested-dict", "logical", "precedence", "len-call", "aggregate-call"],
    prompt: "Runtime Market sells kits that are built from parts, and some parts are themselves built from smaller parts. A bought part (one with no parts of its own) costs its price from the price list. Building one unit of an assembly costs `labour` plus, for each line of its parts list, `qty` × the cost of that part. Write `assembly_cost(part, prices, *, labour=0)`. `labour` must be passed by name.",
    spec: [
      ["Function", "`assembly_cost(part, prices, *, labour=0)`"],
      ["part", "`{\"name\": …, \"parts\": [{\"qty\": n, \"part\": {…same shape…}}, …]}`; an empty `parts` list means a bought part"],
      ["prices", "a dictionary of bought-part name → price"],
      ["Returns", "the cost of one unit of `part`; bought parts never add labour"],
      ["Example", "Camping Kit = 1 Studio Tent + 2 Lantern Sets; a Lantern Set = 2 LED Lanterns + 4 AA Batteries. With labour 3: Lantern Set 3 + 25 + 2 = 30, so the kit costs 3 + 89 + 2 × 30 = 152"],
    ],
    hiddenKinds: ["a bought part on its own", "labour at every level of a deep assembly", "a quantity of zero", "the same part used in two places", "labour passed by position"],
    hints: [
      "Base case: a part with an empty parts list is bought, so its cost is just its price.",
      "For an assembly, start from the labour, then add `qty` times the cost of each part. That cost is the same question one level down, so ask `assembly_cost` itself.",
      "Every assembly further down pays labour too, so the recursive call must pass the same labour on, by name.",
    ],
    explanation: "A bought part returns `prices[name]`. An assembly starts at `labour` and adds `qty * assembly_cost(child, prices, labour=labour)` for each line, so quantities multiply on the way down (two Lantern Sets mean four lanterns) and every sub-assembly pays its own labour. Forgetting to pass `labour` on makes only the top level pay it; adding labour to bought parts overcharges; adding the quantity instead of multiplying by it gets every multi-unit line wrong.",
    code: {
      starter: src`
def assembly_cost(part, prices, *, labour=0):
    return 0

kit = {"name": "Camping Kit", "parts": [
    {"qty": 1, "part": {"name": "Studio Tent", "parts": []}},
    {"qty": 2, "part": {"name": "Lantern Set", "parts": [
        {"qty": 2, "part": {"name": "LED Lantern", "parts": []}},
        {"qty": 4, "part": {"name": "AA Battery", "parts": []}},
    ]}},
]}
prices = {"Studio Tent": 89, "LED Lantern": 12.5, "AA Battery": 0.5}
print(assembly_cost(kit, prices))
print(assembly_cost(kit, prices, labour=3))
`,
      answer: src`
def assembly_cost(part, prices, *, labour=0):
    if not part["parts"]:
        return prices[part["name"]]
    cost = labour
    for line in part["parts"]:
        cost += line["qty"] * assembly_cost(line["part"], prices, labour=labour)
    return cost

kit = {"name": "Camping Kit", "parts": [
    {"qty": 1, "part": {"name": "Studio Tent", "parts": []}},
    {"qty": 2, "part": {"name": "Lantern Set", "parts": [
        {"qty": 2, "part": {"name": "LED Lantern", "parts": []}},
        {"qty": 4, "part": {"name": "AA Battery", "parts": []}},
    ]}},
]}
prices = {"Studio Tent": 89, "LED Lantern": 12.5, "AA Battery": 0.5}
print(assembly_cost(kit, prices))
print(assembly_cost(kit, prices, labour=3))
`,
      alternatives: [
        src`
def assembly_cost(part, prices, *, labour=0):
    lines = part["parts"]
    if len(lines) == 0:
        return prices[part["name"]]
    return labour + sum(line["qty"] * assembly_cost(line["part"], prices, labour=labour) for line in lines)
`,
      ],
      wrong: [
        {
          code: src`
def assembly_cost(part, prices, *, labour=0):
    if not part["parts"]:
        return prices[part["name"]]
    cost = labour
    for line in part["parts"]:
        cost += line["qty"] * assembly_cost(line["part"], prices)
    return cost
`,
          fails: ["returns"],
          why: "labour isn't passed down, so only the top assembly pays it",
        },
        {
          code: src`
def assembly_cost(part, prices, *, labour=0):
    if not part["parts"]:
        return prices[part["name"]] + labour
    cost = labour
    for line in part["parts"]:
        cost += line["qty"] * assembly_cost(line["part"], prices, labour=labour)
    return cost
`,
          fails: ["returns"],
          why: "bought parts are charged labour too",
        },
        {
          code: src`
def assembly_cost(part, prices, *, labour=0):
    if not part["parts"]:
        return prices[part["name"]]
    cost = labour
    for line in part["parts"]:
        cost += line["qty"] + assembly_cost(line["part"], prices, labour=labour)
    return cost
`,
          fails: ["returns"],
          why: "the quantity is added instead of multiplied",
        },
        {
          code: src`
def assembly_cost(part, prices, labour=0):
    if not part["parts"]:
        return prices[part["name"]]
    cost = labour
    for line in part["parts"]:
        cost += line["qty"] * assembly_cost(line["part"], prices, labour)
    return cost
`,
          fails: ["returns"],
          why: "without the bare `*`, labour can be passed by position",
        },
      ],
      task: {
        checks: [
          fn("returns", "assembly_cost", [
            example([campingKit, campingPrices], 143),
            example([campingKit, campingPrices], 152, { kwargs: { labour: 3 } }),
            example([part("Lantern Set", [component(2, part("LED Lantern")), component(4, part("AA Battery"))]), campingPrices], 30, { kwargs: { labour: 3 } }),
            hiddenCase("a bought part on its own", [part("Studio Tent"), campingPrices], 89, { kwargs: { labour: 5 } }),
            hiddenCase("labour at every level of a deep assembly", [part("A", [component(2, part("B", [component(3, part("C", [component(1, part("bolt"))]))]))]), { bolt: 1 }], 24, { kwargs: { labour: 2 } }),
            hiddenCase("a quantity of zero", [part("Bundle", [component(0, part("Studio Tent")), component(1, part("AA Battery"))]), campingPrices], 0.5),
            hiddenCase("the same part used in two places", [part("Set", [component(2, part("AA Battery")), component(1, part("Torch", [component(3, part("AA Battery"))]))]), campingPrices], 4.5, { kwargs: { labour: 1 } }),
            raisesCase([campingKit, campingPrices, 3], "TypeError", { label: "labour passed by position" }),
          ], { label: "assembly_cost() adds parts and labour at every level", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
];
