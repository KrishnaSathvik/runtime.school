/**
 * M26 practice: ten independent problems on classes and objects (PY-L26-01 … PY-L26-05).
 *
 * Mix: 1 function implementation (rows → objects → a per-product summary), 2 debugging (a constructor that checks one
 * value and stores another; a unit conversion with the wrong precedence), 2 validation classes (order status
 * transitions kept on the class; seat booking with rules in its methods), 2 data transformations (price changes that
 * share unchanged objects; money parsed by class methods), 1 refactoring (dictionary functions turned into a class
 * with the same behaviour), and 2 output predictions about shared objects and class attributes.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are Runtime Market (R01) products, orders, reviews and customers, plus weather-station readings. Classes
 * are graded by expr checks that build objects and call their methods; plain functions by fn cases.
 * Version 2: every question was replaced; the old set wrote item.sku = "MUG" and printed it.
 */
import type { PyQuestion } from "../model";
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

const reviewRows = [
  { product_id: "P0205", rating: "5", comment: "Great mat" },
  { product_id: "P0421", rating: "2", comment: "Too thin" },
  { product_id: "P0205", rating: "3", comment: "OK" },
  { product_id: "P0205", rating: "4", comment: "Good grip" },
];

export const m26Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q26-02 output prediction, easy
  {
    id: "PY-Q26-02",
    version: 2,
    slug: "a-copied-cart",
    title: "A cart that wasn't really copied",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "attr-assign", "class-def", "function-def", "function-param", "function-return", "identity", "init-method", "len-call", "list-literal", "list-mutate", "plain-class", "print-call", "print-several", "self-name", "top-level-indent"],
    prompt: "`copy_cart` is meant to give Jamal his own cart with Nora's items in it. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "How many Cart objects are created? How many lists?",
      "`other.items = cart.items` stores a reference to the existing list.",
      "Changing `jamal.owner` changes only Jamal's cart object.",
    ],
    explanation: "Two Cart objects exist, so the owners are separate: Nora's owner is still `Nora`. But `other.items = cart.items` makes Jamal's cart refer to Nora's list instead of its own, so the item appended through Jamal's cart lands in that one shared list (two items) and `is` is True. `other.items = list(cart.items)` would have given Jamal a separate list.",
    predict: {
      program: src`
class Cart:
    def __init__(self, owner):
        self.owner = owner
        self.items = []

def copy_cart(cart, new_owner):
    other = Cart(new_owner)
    other.items = cart.items
    return other

nora = Cart("Nora")
nora.items.append("SPO-11681")
jamal = copy_cart(nora, "Jamal")
jamal.items.append("HOM-22847")
jamal.owner = "J. Walker"
print(nora.owner, len(nora.items), jamal.items is nora.items)
`,
      output: "Nora 2 True\n",
      wrongPredictions: ["Nora 1 False", "J. Walker 2 True", "Nora 1 True", "J. Walker 2 False"],
    },
  },

  // ------------------------------------------------------------------ PY-Q26-03 debugging, easy
  {
    id: "PY-Q26-03",
    version: 2,
    slug: "checked-but-not-stored",
    title: "Checked one value, stored another",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "attr-assign", "class-def", "comparison", "conversion", "function-def", "function-param", "identity", "if-statement", "import-module", "init-method", "logical", "none-value", "plain-class", "print-call", "raise-stmt", "self-name", "string-format", "string-method", "top-level-indent"],
    prompt: "Products loaded from the supplier's CSV file crash with `TypeError: '<' not supported between instances of 'str' and 'int'`, and products created in code end up with SKUs like `' spo-11681'` even though the SKU check passes. Fix `Product.__init__` so it tidies and converts every value, checks the tidy values, and stores exactly what it checked.",
    spec: [
      ["Class", "`Product(sku, name, price)`"],
      ["Stores", "`sku` stripped and upper-cased; `name` stripped; `price` as a float (it may arrive as text)"],
      ["Raises", "`ValueError` for a SKU that isn't 3 capital letters, a dash and 5 digits, or a negative price"],
    ],
    hiddenKinds: ["a price that is already a number", "a negative price given as text", "a SKU that is wrong even after tidying"],
    hints: [
      "Run the starter: one crash comes from comparing text with a number. Where should the price become a float?",
      "The SKU check looks at a tidied SKU, but which version is stored?",
      "Tidy and convert each value first into a local name, check those names, and store the same names.",
    ],
    explanation: "The constructor checked a tidied copy of the SKU (`sku.strip().upper()`) but stored the original, so the check passed while untidy data got in. And it compared the price before converting it, so text prices crashed with TypeError. The reliable order is: tidy and convert into local names, validate those names, then store them. That way what is stored is exactly what was checked.",
    code: {
      starter: src`
import re

class Product:
    def __init__(self, sku, name, price):
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku.strip().upper()):
            raise ValueError(f"bad SKU: {sku!r}")
        if price < 0:
            raise ValueError(f"negative price: {price}")
        self.sku = sku
        self.name = name
        self.price = price

mat = Product(" spo-11681", "Yoga mat ", 31.0)
print(repr(mat.sku), repr(mat.name))
lamp = Product("HOM-22847", "Desk lamp", "48.00")
print(lamp.price)
`,
      answer: src`
import re

class Product:
    def __init__(self, sku, name, price):
        sku = sku.strip().upper()
        price = float(price)
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        if price < 0:
            raise ValueError(f"negative price: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price

mat = Product(" spo-11681", "Yoga mat ", 31.0)
print(repr(mat.sku), repr(mat.name))
lamp = Product("HOM-22847", "Desk lamp", "48.00")
print(lamp.price)
`,
      alternatives: [
        src`
import re

class Product:
    def __init__(self, sku, name, price):
        self.sku = sku.strip().upper()
        self.name = name.strip()
        self.price = float(price)
        if re.fullmatch(r"[A-Z]{3}-\d{5}", self.sku) is None:
            raise ValueError("bad SKU")
        if self.price < 0:
            raise ValueError("negative price")
`,
      ],
      wrong: [
        {
          code: src`
import re

class Product:
    def __init__(self, sku, name, price):
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku.strip().upper()):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
`,
          fails: ["tidy"],
          why: "text prices work now, but the untidied SKU is still the one stored",
        },
        {
          code: src`
import re

class Product:
    def __init__(self, sku, name, price):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        if price < 0:
            raise ValueError(f"negative price: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
`,
          fails: ["negative-text", "number-price", "text-price"],
          why: "the SKU is fixed, but a price given as text is still compared before it is converted",
        },
      ],
      task: {
        checks: [
          expr("tidy", "Stored values are the tidied ones", "_p = Product(' spo-11681', 'Yoga mat ', 31.0)\nresult = [_p.sku, _p.name, _p.price]", ["SPO-11681", "Yoga mat", py.float(31)], { show: "Product(\" spo-11681\", \"Yoga mat \", 31.0)" }),
          expr("text-price", "A price given as text", "_p = Product('HOM-22847', 'Desk lamp', '48.00')\nresult = [_p.price, type(_p.price).__name__]", [py.float(48), "float"], { show: "Product(\"HOM-22847\", \"Desk lamp\", \"48.00\").price" }),
          expr("number-price", "A price that is already a number", "result = Product('ELE-24781', 'Speaker', 120).price", py.float(120), { hidden: true }),
          raisesExpr("negative-text", "A negative price given as text", "Product('TOY-54564', 'Kite', '-2.50')", "ValueError", { hidden: true }),
          raisesExpr("bad-sku", "A SKU that is wrong even after tidying", "Product(' spo-1168 ', 'Mat', 5)", "ValueError", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-06 function implementation, easy
  {
    id: "PY-Q26-06",
    version: 2,
    slug: "review-summary",
    title: "Review summary through Review objects",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conversion", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-index", "plain-class", "print-call", "self-name", "string-index", "top-level-indent", "truthiness"],
    prompt: "Product reviews arrive as rows of text. Write a class `Review` that turns one row's values into a review with an int `rating` and a `positive` attribute (True for a rating of 4 or 5). Then write `review_summary(rows)`, which builds a Review from every row and returns, for each product, how many reviews it has and how many of them are positive.",
    spec: [
      ["Class", "`Review(product_id, rating, comment)`: attributes `product_id`, `rating` (int), `comment`, `positive` (rating ≥ 4)"],
      ["Function", "`review_summary(rows)`; rows are `{\"product_id\": …, \"rating\": \"5\", \"comment\": …}`"],
      ["Returns", "`{product_id: [review count, positive count]}`, products in first-seen order; `{}` for no rows"],
    ],
    hiddenKinds: ["a product with no positive reviews", "ratings of exactly 4 and exactly 3", "ratings with spaces around them", "no rows"],
    hints: [
      "Inside `__init__`, convert the rating with `int` before storing it, and compute `positive` from the converted number.",
      "In the function, build one Review per row first; then group the reviews by `product_id`, as in the Collection Algorithms module.",
      "Each product's entry is a two-item list: add 1 to the first item for every review, and 1 to the second when the review is positive.",
    ],
    explanation: "The class does the per-row work once: converting the rating and deciding whether a review is positive. The summary then only reads attributes (`review.product_id`, `review.positive`) and groups, so neither job is tangled with the other. `int` accepts surrounding spaces, and the threshold is `>= 4`, so a rating of exactly 4 counts as positive and 3 does not.",
    code: {
      starter: src`
class Review:
    pass

def review_summary(rows):
    return {}

rows = [
    {"product_id": "P0205", "rating": "5", "comment": "Great mat"},
    {"product_id": "P0421", "rating": "2", "comment": "Too thin"},
    {"product_id": "P0205", "rating": "3", "comment": "OK"},
    {"product_id": "P0205", "rating": "4", "comment": "Good grip"},
]
print(review_summary(rows))
`,
      answer: src`
class Review:
    def __init__(self, product_id, rating, comment):
        self.product_id = product_id
        self.rating = int(rating)
        self.comment = comment
        self.positive = self.rating >= 4

def review_summary(rows):
    reviews = []
    for row in rows:
        reviews.append(Review(row["product_id"], row["rating"], row["comment"]))
    summary = {}
    for review in reviews:
        if review.product_id not in summary:
            summary[review.product_id] = [0, 0]
        summary[review.product_id][0] += 1
        if review.positive:
            summary[review.product_id][1] += 1
    return summary

rows = [
    {"product_id": "P0205", "rating": "5", "comment": "Great mat"},
    {"product_id": "P0421", "rating": "2", "comment": "Too thin"},
    {"product_id": "P0205", "rating": "3", "comment": "OK"},
    {"product_id": "P0205", "rating": "4", "comment": "Good grip"},
]
print(review_summary(rows))
`,
      alternatives: [
        src`
class Review:
    def __init__(self, product_id, rating, comment):
        self.product_id = product_id
        self.rating = int(rating)
        self.comment = comment
        self.positive = self.rating in [4, 5]

def review_summary(rows):
    counts = {}
    positives = {}
    for row in rows:
        review = Review(row["product_id"], row["rating"], row["comment"])
        counts[review.product_id] = counts.get(review.product_id, 0) + 1
        positives[review.product_id] = positives.get(review.product_id, 0) + int(review.positive)
    return {pid: [counts[pid], positives[pid]] for pid in counts}
`,
      ],
      wrong: [
        {
          code: src`
class Review:
    def __init__(self, product_id, rating, comment):
        self.product_id = product_id
        self.rating = rating
        self.comment = comment
        self.positive = rating >= "4"

def review_summary(rows):
    summary = {}
    for row in rows:
        review = Review(row["product_id"], row["rating"], row["comment"])
        if review.product_id not in summary:
            summary[review.product_id] = [0, 0]
        summary[review.product_id][0] += 1
        if review.positive:
            summary[review.product_id][1] += 1
    return summary
`,
          fails: ["returns", "class"],
          why: "the rating stays text and is compared as text, so `\" 5\"` (with a space) counts as not positive and `rating` isn't a number",
        },
        {
          code: src`
class Review:
    def __init__(self, product_id, rating, comment):
        self.product_id = product_id
        self.rating = int(rating)
        self.comment = comment
        self.positive = self.rating > 4

def review_summary(rows):
    summary = {}
    for row in rows:
        review = Review(row["product_id"], row["rating"], row["comment"])
        if review.product_id not in summary:
            summary[review.product_id] = [0, 0]
        summary[review.product_id][0] += 1
        if review.positive:
            summary[review.product_id][1] += 1
    return summary
`,
          fails: ["returns", "class"],
          why: "`> 4` leaves out ratings of exactly 4",
        },
      ],
      task: {
        checks: [
          fn("returns", "review_summary", [
            example([reviewRows], { P0205: [3, 2], P0421: [1, 0] }),
            example([[{ product_id: "P0164", rating: "4", comment: "Fine" }]], { P0164: [1, 1] }),
            example([[]], {}),
            hiddenCase("a product with no positive reviews", [[{ product_id: "P1", rating: "1", comment: "" }, { product_id: "P1", rating: "2", comment: "" }]], { P1: [2, 0] }),
            hiddenCase("ratings of exactly 4 and exactly 3", [[{ product_id: "A", rating: "4", comment: "" }, { product_id: "B", rating: "3", comment: "" }]], { A: [1, 1], B: [1, 0] }),
            hiddenCase("ratings with spaces around them", [[{ product_id: "P2", rating: " 5", comment: "" }, { product_id: "P2", rating: "3 ", comment: "" }]], { P2: [2, 1] }),
            hiddenCase("several products in first-seen order", [[{ product_id: "Z", rating: "5", comment: "" }, { product_id: "A", rating: "5", comment: "" }, { product_id: "Z", rating: "1", comment: "" }]], { Z: [2, 1], A: [1, 1] }),
          ], { label: "review_summary() counts reviews and positive reviews per product" }),
          expr("class", "A Review converts its rating and decides positive", "_r = Review('P0205', ' 4', 'Good grip')\n_s = Review('P0421', '3', 'Meh')\nresult = [_r.product_id, _r.rating, _r.comment, _r.positive, _s.positive]", ["P0205", 4, "Good grip", true, false], { show: "Review(\"P0205\", \" 4\", \"Good grip\") and Review(\"P0421\", \"3\", \"Meh\")" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-10 validation, easy
  {
    id: "PY-Q26-10",
    version: 2,
    slug: "order-status-rules",
    title: "Allowed order status changes",
    format: "validation",
    difficulty: "easy",
    minutes: 15,
    requires: ["assignment", "attr-assign", "class-def", "conditional-expr", "dict-get", "dict-literal", "else-clause", "except-type", "function-def", "function-param", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "string-format", "string-index", "top-level-indent", "try-except"],
    prompt: "An order's status may only change along certain paths: a pending order can be paid or cancelled, a paid order shipped, cancelled or refunded, a shipped order delivered or returned, and a delivered order returned. Write `Order(order_id)` with those rules stored **once, on the class**, and a method `move_to(status)` that enforces them and keeps a history.",
    spec: [
      ["Class attribute", "`ALLOWED = {\"pending\": [\"paid\", \"cancelled\"], \"paid\": [\"shipped\", \"cancelled\", \"refunded\"], \"shipped\": [\"delivered\", \"returned\"], \"delivered\": [\"returned\"]}`"],
      ["`Order(order_id)`", "attributes `order_id`, `status` (starts `\"pending\"`), `history` (starts `[\"pending\"]`)"],
      ["`move_to(status)`", "changes the status and appends it to history if the move is allowed; otherwise raises `ValueError` and changes nothing"],
    ],
    hiddenKinds: ["a status with no moves out of it", "moving to the same status", "a long valid path", "two orders keep separate histories"],
    hints: [
      "The rules are an assignment in the class body; every order reads the same dictionary.",
      "A move is allowed when the target is in the list for the current status. `get` with an empty list as default handles statuses that have no moves out.",
      "Raise before changing anything, so a refused move leaves the order exactly as it was.",
    ],
    explanation: "Keeping the transition table on the class means one definition for every order; changing a rule changes it everywhere. The method looks up the moves allowed from the current status (`ALLOWED.get(self.status, [])`, so `cancelled` and `refunded` have none) and refuses anything else before touching the object. The history must be created in `__init__` so each order has its own list.",
    code: {
      starter: src`
class Order:
    pass

order = Order("O100282")
order.move_to("paid")
order.move_to("shipped")
print(order.status, order.history)
try:
    order.move_to("pending")
except ValueError as err:
    print("refused:", err)
`,
      answer: src`
class Order:
    ALLOWED = {
        "pending": ["paid", "cancelled"],
        "paid": ["shipped", "cancelled", "refunded"],
        "shipped": ["delivered", "returned"],
        "delivered": ["returned"],
    }

    def __init__(self, order_id):
        self.order_id = order_id
        self.status = "pending"
        self.history = ["pending"]

    def move_to(self, status):
        if status not in Order.ALLOWED.get(self.status, []):
            raise ValueError(f"{self.order_id}: can't go from {self.status} to {status}")
        self.status = status
        self.history.append(status)

order = Order("O100282")
order.move_to("paid")
order.move_to("shipped")
print(order.status, order.history)
try:
    order.move_to("pending")
except ValueError as err:
    print("refused:", err)
`,
      alternatives: [
        src`
class Order:
    ALLOWED = {
        "pending": ["paid", "cancelled"],
        "paid": ["shipped", "cancelled", "refunded"],
        "shipped": ["delivered", "returned"],
        "delivered": ["returned"],
    }

    def __init__(self, order_id):
        self.order_id = order_id
        self.status = "pending"
        self.history = [self.status]

    def move_to(self, status):
        allowed = self.ALLOWED[self.status] if self.status in self.ALLOWED else []
        if status in allowed:
            self.status = status
            self.history.append(status)
        else:
            raise ValueError("move not allowed")
`,
      ],
      wrong: [
        {
          code: src`
class Order:
    ALLOWED = {
        "pending": ["paid", "cancelled"],
        "paid": ["shipped", "cancelled", "refunded"],
        "shipped": ["delivered", "returned"],
        "delivered": ["returned"],
    }

    def __init__(self, order_id):
        self.order_id = order_id
        self.status = "pending"
        self.history = ["pending"]

    def move_to(self, status):
        if status not in Order.ALLOWED[self.status]:
            raise ValueError("move not allowed")
        self.status = status
        self.history.append(status)
`,
          fails: ["dead-end"],
          why: "a cancelled order has no entry in ALLOWED, so moving it raises KeyError instead of ValueError",
        },
        {
          code: src`
class Order:
    ALLOWED = {
        "pending": ["paid", "cancelled"],
        "paid": ["shipped", "cancelled", "refunded"],
        "shipped": ["delivered", "returned"],
        "delivered": ["returned"],
    }
    history = ["pending"]

    def __init__(self, order_id):
        self.order_id = order_id
        self.status = "pending"

    def move_to(self, status):
        if status not in Order.ALLOWED.get(self.status, []):
            raise ValueError("move not allowed")
        self.status = status
        self.history.append(status)
`,
          fails: ["refused", "separate"],
          why: "the history list belongs to the class, so every order writes into one shared list",
        },
      ],
      task: {
        checks: [
          expr("path", "A valid path is recorded", "_o = Order('O100282')\n_o.move_to('paid')\n_o.move_to('shipped')\n_o.move_to('delivered')\n_o.move_to('returned')\nresult = [_o.status, _o.history]", ["returned", ["pending", "paid", "shipped", "delivered", "returned"]], { show: "pending → paid → shipped → delivered → returned" }),
          expr("refused", "A refused move changes nothing", "_o = Order('O100918')\n_o.move_to('paid')\ntry:\n    _o.move_to('delivered')\n    _r = 'allowed'\nexcept ValueError:\n    _r = 'refused'\nresult = [_r, _o.status, _o.history]", ["refused", "paid", ["pending", "paid"]], { show: "paid → delivered" }),
          raisesExpr("dead-end", "A status with no moves out of it", "_o = Order('O1')\n_o.move_to('cancelled')\n_o.move_to('paid')", "ValueError", { hidden: true }),
          raisesExpr("same", "Moving to the same status", "Order('O2').move_to('pending')", "ValueError", { hidden: true }),
          expr("separate", "Two orders keep separate histories", "_a = Order('A')\n_b = Order('B')\n_a.move_to('paid')\nresult = [_a.history, _b.history]", [["pending", "paid"], ["pending"]], { hidden: true }),
          expr("shared-rules", "The rules are stored on the class", "result = Order.ALLOWED['paid']", ["shipped", "cancelled", "refunded"], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-12 data transformation, medium
  {
    id: "PY-Q26-12",
    version: 2,
    slug: "price-changes-without-copies",
    title: "Price changes that share what didn't change",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-get", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "list-copy", "list-index", "list-literal", "list-mutate", "logical", "membership", "plain-class", "print-call", "print-several", "reassignment", "self-name", "string-index", "top-level-indent", "zip-call"],
    prompt: "A pricing tool previews next month's catalogue. Copying 50,000 products to change 30 prices is wasteful, so: write `apply_price_changes(products, changes)` that returns a new list in which each **changed** product is a new object with the new price, and every **unchanged** product is the very same object as before. The original products must keep their prices.",
    spec: [
      ["Function", "`apply_price_changes(products, changes)`"],
      ["products", "a list of `Product` objects (`sku`, `name`, `price`)"],
      ["changes", "a dictionary from SKU to new price; SKUs not in the catalogue are ignored"],
      ["Returns", "a new list, same order: new objects for changed products, the original objects for the rest"],
      ["Note", "a change to the price a product already has is not a change: keep that object"],
    ],
    hiddenKinds: ["a change for a SKU not in the catalogue", "a 'change' to the same price", "no changes at all", "an empty catalogue"],
    hints: [
      "Walk the products and decide per product: is its SKU in `changes` with a different price?",
      "For a changed product, create a new Product with its SKU, name and the new price. For the rest, append the product itself.",
      "Return a new list either way; never assign to a price on an original product.",
    ],
    explanation: "Objects are shared by reference, so a new list can hold the original objects at no cost. Only the changed products need new objects, built from the old product's other attributes and the new price. Assigning the new price to the original object would change the live catalogue; copying every product would work but wastes memory and makes `is` useless for spotting which products changed.",
    code: {
      starter: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def apply_price_changes(products, changes):
    return products

catalogue = [Product("SPO-11681", "Yoga mat", 31.0), Product("HOM-22847", "Desk lamp", 48.0), Product("ELE-24781", "Speaker", 171.99)]
preview = apply_price_changes(catalogue, {"HOM-22847": 44.0})
for old, new in zip(catalogue, preview):
    print(old.sku, old.price, new.price, old is new)
`,
      answer: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def apply_price_changes(products, changes):
    preview = []
    for product in products:
        if product.sku in changes and changes[product.sku] != product.price:
            preview.append(Product(product.sku, product.name, changes[product.sku]))
        else:
            preview.append(product)
    return preview

catalogue = [Product("SPO-11681", "Yoga mat", 31.0), Product("HOM-22847", "Desk lamp", 48.0), Product("ELE-24781", "Speaker", 171.99)]
preview = apply_price_changes(catalogue, {"HOM-22847": 44.0})
for old, new in zip(catalogue, preview):
    print(old.sku, old.price, new.price, old is new)
`,
      alternatives: [
        src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def with_price(product, price):
    return Product(product.sku, product.name, price)

def apply_price_changes(products, changes):
    result = []
    for p in products:
        new_price = changes.get(p.sku, p.price)
        result.append(p if new_price == p.price else with_price(p, new_price))
    return result
`,
      ],
      wrong: [
        {
          code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def apply_price_changes(products, changes):
    preview = list(products)
    for product in preview:
        if product.sku in changes:
            product.price = changes[product.sku]
    return preview
`,
          fails: ["originals", "sharing"],
          why: "`list(products)` copies the list, not the products, so the live catalogue's prices change",
        },
        {
          code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def apply_price_changes(products, changes):
    preview = []
    for product in products:
        price = changes.get(product.sku, product.price)
        preview.append(Product(product.sku, product.name, price))
    return preview
`,
          fails: ["no-changes", "same-price", "sharing"],
          why: "every product is copied, so unchanged products are no longer the original objects",
        },
      ],
      task: {
        checks: [
          expr("prices", "New prices in the preview", "_c = [Product('SPO-11681', 'Yoga mat', 31.0), Product('HOM-22847', 'Desk lamp', 48.0), Product('ELE-24781', 'Speaker', 171.99)]\nresult = [_p.price for _p in apply_price_changes(_c, {'HOM-22847': 44.0, 'ELE-24781': 159.99})]", [py.float(31), py.float(44), 159.99], { show: "[p.price for p in apply_price_changes(catalogue, {...})]" }),
          expr("originals", "The catalogue keeps its prices", "_c = [Product('SPO-11681', 'Yoga mat', 31.0), Product('HOM-22847', 'Desk lamp', 48.0)]\n_v = apply_price_changes(_c, {'HOM-22847': 44.0})\nresult = [_p.price for _p in _c]", [py.float(31), py.float(48)], { show: "the catalogue's prices afterwards" }),
          expr("sharing", "Unchanged products are the same objects; changed ones are new", "_c = [Product('SPO-11681', 'Yoga mat', 31.0), Product('HOM-22847', 'Desk lamp', 48.0), Product('ELE-24781', 'Speaker', 171.99)]\n_v = apply_price_changes(_c, {'HOM-22847': 44.0, 'XYZ-00000': 1.0})\nresult = [_v[0] is _c[0], _v[1] is _c[1], _v[2] is _c[2], _v[1].name, len(_v)]", [true, false, true, "Desk lamp", 3], { show: "which preview items are the original objects" }),
          expr("same-price", "A 'change' to the same price", "_c = [Product('SPO-11681', 'Yoga mat', 31.0)]\n_v = apply_price_changes(_c, {'SPO-11681': 31.0})\nresult = _v[0] is _c[0]", true, { hidden: true }),
          expr("no-changes", "No changes at all", "_c = [Product('A', 'a', 1.0), Product('B', 'b', 2.0)]\n_v = apply_price_changes(_c, {})\nresult = [_v is _c, _v[0] is _c[0], _v[1] is _c[1]]", [false, true, true], { hidden: true }),
          expr("empty", "An empty catalogue", "result = apply_price_changes([], {'A': 1.0})", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-13 debugging, medium
  {
    id: "PY-Q26-13",
    version: 2,
    slug: "readings-in-the-wrong-unit",
    title: "Temperature readings in the wrong unit",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conversion", "else-clause", "except-type", "for-loop", "function-def", "function-default", "function-param", "if-statement", "init-method", "logical", "membership", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "string-method", "top-level-indent", "try-except"],
    prompt: "Weather stations report in Celsius or Fahrenheit, and `Reading` is meant to store every reading in Celsius so they can be compared. The charts show 41 °F stored as about 23 °C, some readings still say `unit` F, and stations that send a lower-case `f` are rejected. Fix `Reading.__init__`.",
    spec: [
      ["Class", "`Reading(station, value, unit=\"C\")`"],
      ["Stores", "`station`; `celsius`, the value in Celsius rounded to 1 place (°C = (°F − 32) × 5 / 9); `unit` always `\"C\"`"],
      ["unit", "`\"C\"` or `\"F\"` in either case; anything else raises `ValueError`"],
    ],
    hiddenKinds: ["a value given as text", "a reading below freezing in Fahrenheit", "an unknown unit"],
    hints: [
      "Check the starter's arithmetic by hand for 41 °F: which operation does Python do first?",
      "The unit check compares the text exactly as it was sent; tidy it first.",
      "After converting, the object holds Celsius, so what should its `unit` say?",
    ],
    explanation: "`value - 32 * 5 / 9` multiplies first (precedence, the Operators & Expressions module), computing 41 − 17.8; brackets are needed: `(value - 32) * 5 / 9` gives 5.0. The unit was compared as sent, so `\"f\"` failed the check; `unit.strip().upper()` fixes that. And because every reading is stored in Celsius, the stored unit must be `\"C\"`; keeping the original unit would mislabel converted values.",
    code: {
      starter: src`
class Reading:
    def __init__(self, station, value, unit="C"):
        if unit not in ["C", "F"]:
            raise ValueError(f"unknown unit {unit!r}")
        value = float(value)
        if unit == "F":
            value = value - 32 * 5 / 9
        self.station = station
        self.celsius = round(value, 1)
        self.unit = unit

for station, value, unit in [("USW00094728", 41, "F"), ("UKM00003772", "18.5", "C"), ("CA006158355", 14, "f")]:
    try:
        r = Reading(station, value, unit)
        print(r.station, r.celsius, r.unit)
    except ValueError as err:
        print("refused:", err)
`,
      answer: src`
class Reading:
    def __init__(self, station, value, unit="C"):
        unit = unit.strip().upper()
        if unit not in ["C", "F"]:
            raise ValueError(f"unknown unit {unit!r}")
        value = float(value)
        if unit == "F":
            value = (value - 32) * 5 / 9
        self.station = station
        self.celsius = round(value, 1)
        self.unit = "C"

for station, value, unit in [("USW00094728", 41, "F"), ("UKM00003772", "18.5", "C"), ("CA006158355", 14, "f")]:
    try:
        r = Reading(station, value, unit)
        print(r.station, r.celsius, r.unit)
    except ValueError as err:
        print("refused:", err)
`,
      alternatives: [
        src`
class Reading:
    def __init__(self, station, value, unit="C"):
        kind = unit.upper().strip()
        number = float(value)
        if kind == "F":
            number = (number - 32) / 1.8
        elif kind != "C":
            raise ValueError("unit must be C or F")
        self.station = station
        self.celsius = round(number, 1)
        self.unit = "C"
`,
      ],
      wrong: [
        {
          code: src`
class Reading:
    def __init__(self, station, value, unit="C"):
        unit = unit.strip().upper()
        if unit not in ["C", "F"]:
            raise ValueError(f"unknown unit {unit!r}")
        value = float(value)
        if unit == "F":
            value = value - 32 * 5 / 9
        self.station = station
        self.celsius = round(value, 1)
        self.unit = "C"
`,
          fails: ["fahrenheit", "freezing", "lower-case"],
          why: "the unit handling is fixed, but `value - 32 * 5 / 9` still multiplies before it subtracts",
        },
        {
          code: src`
class Reading:
    def __init__(self, station, value, unit="C"):
        unit = unit.strip().upper()
        if unit not in ["C", "F"]:
            raise ValueError(f"unknown unit {unit!r}")
        value = float(value)
        if unit == "F":
            value = (value - 32) * 5 / 9
        self.station = station
        self.celsius = round(value, 1)
        self.unit = unit
`,
          fails: ["fahrenheit", "lower-case"],
          why: "the conversion is right, but a converted reading is still labelled F",
        },
      ],
      task: {
        checks: [
          expr("fahrenheit", "41 °F is stored as 5.0 °C", "_r = Reading('USW00094728', 41, 'F')\nresult = [_r.station, _r.celsius, _r.unit]", ["USW00094728", py.float(5), "C"], { show: "Reading(\"USW00094728\", 41, \"F\")" }),
          expr("lower-case", "A lower-case unit is accepted", "_r = Reading('CA006158355', 14, 'f')\nresult = [_r.celsius, _r.unit]", [py.float(-10), "C"], { show: "Reading(\"CA006158355\", 14, \"f\")" }),
          expr("text", "A value given as text", "_r = Reading('UKM00003772', '18.5')\nresult = [_r.celsius, _r.unit]", [18.5, "C"], { hidden: true }),
          expr("freezing", "Below freezing in Fahrenheit", "result = Reading('X', -4, 'F').celsius", py.float(-20), { hidden: true }),
          raisesExpr("unknown", "An unknown unit", "Reading('X', 300, 'K')", "ValueError", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-16 refactoring, medium
  {
    id: "PY-Q26-16",
    version: 2,
    slug: "credit-account-class",
    title: "From dictionary functions to a class",
    format: "refactoring",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "if-statement", "init-method", "method-def", "plain-class", "print-call", "print-several", "self-name", "string-index", "top-level-indent"],
    prompt: "A shop's store-credit accounts are dictionaries handled by three loose functions. Refactor them into a class `CreditAccount` with the **same behaviour**: same limits, same counting of declined charges, same results. The starter's functions are correct; keep them as a reference while you write the class, then remove them.",
    spec: [
      ["Class", "`CreditAccount(owner, limit)` with attributes `owner`, `limit`, `spent` (starts 0) and `declined` (starts 0)"],
      ["`charge(amount)`", "like `charge(account, amount)`: returns True and adds to `spent`, or returns False and adds 1 to `declined` when the charge would take `spent` above `limit`"],
      ["`remaining()`", "like `remaining(account)`: `limit - spent`"],
    ],
    hiddenKinds: ["a charge that uses up exactly the limit", "a declined charge followed by a smaller one", "two accounts kept separate"],
    hints: [
      "Each dictionary key becomes an attribute set in `__init__`; `new_account` becomes the constructor.",
      "Each function that took `account` becomes a method that takes `self`: `account[\"spent\"]` turns into `self.spent`.",
      "Keep the comparison exactly as it was: a charge that brings `spent` to exactly the limit is allowed.",
    ],
    explanation: "A refactoring changes the shape of code, not its behaviour. The dictionary becomes attributes, the factory function becomes `__init__`, and every function whose first parameter was the account becomes a method whose first parameter is `self`. The tests are the old behaviour: the same sequence of charges must give the same results, the same `declined` count and the same `remaining()`. Slips such as `>=` for `>` or updating `spent` before checking change behaviour and are caught.",
    code: {
      starter: src`
def new_account(owner, limit):
    return {"owner": owner, "limit": limit, "spent": 0, "declined": 0}

def charge(account, amount):
    if account["spent"] + amount > account["limit"]:
        account["declined"] += 1
        return False
    account["spent"] += amount
    return True

def remaining(account):
    return account["limit"] - account["spent"]

account = new_account("C00077", 100)
print(charge(account, 60), charge(account, 50), charge(account, 40))
print(remaining(account), account["declined"])
`,
      answer: src`
class CreditAccount:
    def __init__(self, owner, limit):
        self.owner = owner
        self.limit = limit
        self.spent = 0
        self.declined = 0

    def charge(self, amount):
        if self.spent + amount > self.limit:
            self.declined += 1
            return False
        self.spent += amount
        return True

    def remaining(self):
        return self.limit - self.spent

account = CreditAccount("C00077", 100)
print(account.charge(60), account.charge(50), account.charge(40))
print(account.remaining(), account.declined)
`,
      alternatives: [
        src`
class CreditAccount:
    def __init__(self, owner, limit):
        self.owner = owner
        self.limit = limit
        self.spent = 0
        self.declined = 0

    def remaining(self):
        return self.limit - self.spent

    def charge(self, amount):
        if amount <= self.remaining():
            self.spent = self.spent + amount
            return True
        self.declined = self.declined + 1
        return False
`,
      ],
      wrong: [
        {
          code: src`
class CreditAccount:
    def __init__(self, owner, limit):
        self.owner = owner
        self.limit = limit
        self.spent = 0
        self.declined = 0

    def charge(self, amount):
        if self.spent + amount >= self.limit:
            self.declined += 1
            return False
        self.spent += amount
        return True

    def remaining(self):
        return self.limit - self.spent
`,
          fails: ["exact-limit", "sequence"],
          why: "`>=` declines a charge that brings the balance to exactly the limit, which the original allowed",
        },
        {
          code: src`
class CreditAccount:
    def __init__(self, owner, limit):
        self.owner = owner
        self.limit = limit
        self.spent = 0
        self.declined = 0

    def charge(self, amount):
        self.spent += amount
        if self.spent > self.limit:
            self.declined += 1
            return False
        return True

    def remaining(self):
        return self.limit - self.spent
`,
          fails: ["sequence", "after-decline"],
          why: "`spent` is increased before the check, so a declined charge is still counted as spent",
        },
      ],
      task: {
        checks: [
          expr("sequence", "Three charges against a limit of 100", "_a = CreditAccount('C00077', 100)\nresult = [_a.charge(60), _a.charge(50), _a.charge(40), _a.remaining(), _a.spent, _a.declined, _a.owner]", [true, false, true, 0, 100, 1, "C00077"], { show: "charge(60), charge(50), charge(40), remaining(), spent, declined, owner" }),
          expr("fresh", "A new account", "_a = CreditAccount('C01338', 250)\nresult = [_a.limit, _a.spent, _a.declined, _a.remaining()]", [250, 0, 0, 250], { show: "CreditAccount(\"C01338\", 250)" }),
          expr("exact-limit", "A charge that uses up exactly the limit", "_a = CreditAccount('C1', 50)\nresult = [_a.charge(50), _a.remaining()]", [true, 0], { hidden: true }),
          expr("after-decline", "A declined charge followed by a smaller one", "_a = CreditAccount('C2', 30)\nresult = [_a.charge(45), _a.charge(20), _a.remaining(), _a.declined]", [false, true, 10, 1], { hidden: true }),
          expr("separate", "Two accounts kept separate", "_a = CreditAccount('A', 10)\n_b = CreditAccount('B', 10)\n_a.charge(8)\nresult = [_a.remaining(), _b.remaining()]", [2, 10], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-19 validation, medium
  {
    id: "PY-Q26-19",
    version: 2,
    slug: "seat-bookings",
    title: "Seat bookings that keep their rules",
    format: "validation",
    difficulty: "medium",
    minutes: 18,
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "dict-get", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "len-call", "list-mutate", "logical", "membership", "method-def", "plain-class", "print-call", "print-text", "raise-stmt", "range-call", "self-name", "string-format", "string-index", "top-level-indent"],
    prompt: "Write a class `Flight(code, seats)` for a small booking system. Seats are numbered from 1. Booking gives a passenger the lowest free seat; a passenger can hold only one seat; a full flight refuses bookings; cancelling frees the seat for the next booking. All refusals raise `ValueError` and change nothing.",
    spec: [
      ["`Flight(code, seats)`", "`seats` is how many seats there are (at least 1, otherwise ValueError)"],
      ["`book(passenger)`", "returns the seat number given; ValueError if the passenger already has a seat or the flight is full"],
      ["`cancel_booking(passenger)`", "frees their seat; ValueError if they have none"],
      ["`seat_of(passenger)`", "their seat number, or `None`"],
      ["`available()`", "how many seats are free"],
    ],
    hiddenKinds: ["a cancelled seat is given to the next booking", "booking the same passenger twice", "cancelling someone without a seat", "a flight with no seats"],
    hints: [
      "Store the bookings in `__init__` as a dictionary from passenger to seat; the free seats can be worked out from it.",
      "The lowest free seat is the first number from 1 to `seats` that no booking uses.",
      "Every method checks its rule first and raises before changing the dictionary.",
    ],
    explanation: "A dictionary from passenger to seat makes three of the rules one-line checks: `passenger in self.bookings` (already booked, or not booked when cancelling) and `len(self.bookings) == self.seats` (full). The lowest free seat is found by scanning 1…seats for a number not among the booked seats, which also hands a cancelled seat to the next passenger. Because every check happens before anything is changed, a refused call leaves the flight exactly as it was.",
    code: {
      starter: src`
class Flight:
    pass

flight = Flight("RT204", 3)
print(flight.book("Nora Garcia"), flight.book("Jamal Walker"))
flight.cancel_booking("Nora Garcia")
print(flight.book("Grace Walker"), flight.available())
`,
      answer: src`
class Flight:
    def __init__(self, code, seats):
        if seats < 1:
            raise ValueError("a flight needs at least one seat")
        self.code = code
        self.seats = seats
        self.bookings = {}

    def book(self, passenger):
        if passenger in self.bookings:
            raise ValueError(f"{passenger} already has seat {self.bookings[passenger]}")
        if len(self.bookings) == self.seats:
            raise ValueError(f"{self.code} is full")
        taken = list(self.bookings.values())
        for seat in range(1, self.seats + 1):
            if seat not in taken:
                self.bookings[passenger] = seat
                return seat

    def cancel_booking(self, passenger):
        if passenger not in self.bookings:
            raise ValueError(f"{passenger} has no seat on {self.code}")
        del self.bookings[passenger]

    def seat_of(self, passenger):
        return self.bookings.get(passenger)

    def available(self):
        return self.seats - len(self.bookings)

flight = Flight("RT204", 3)
print(flight.book("Nora Garcia"), flight.book("Jamal Walker"))
flight.cancel_booking("Nora Garcia")
print(flight.book("Grace Walker"), flight.available())
`,
      alternatives: [
        src`
class Flight:
    def __init__(self, code, seats):
        if seats <= 0:
            raise ValueError("no seats")
        self.code = code
        self.free = list(range(1, seats + 1))
        self.taken = {}

    def book(self, passenger):
        if passenger in self.taken:
            raise ValueError("already booked")
        if not self.free:
            raise ValueError("full")
        seat = min(self.free)
        self.free.remove(seat)
        self.taken[passenger] = seat
        return seat

    def cancel_booking(self, passenger):
        if passenger not in self.taken:
            raise ValueError("not booked")
        self.free.append(self.taken.pop(passenger))

    def seat_of(self, passenger):
        return self.taken.get(passenger)

    def available(self):
        return len(self.free)
`,
      ],
      wrong: [
        {
          code: src`
class Flight:
    def __init__(self, code, seats):
        if seats < 1:
            raise ValueError("no seats")
        self.code = code
        self.seats = seats
        self.bookings = {}
        self.next_seat = 1

    def book(self, passenger):
        if passenger in self.bookings:
            raise ValueError("already booked")
        if self.next_seat > self.seats:
            raise ValueError("full")
        self.bookings[passenger] = self.next_seat
        self.next_seat += 1
        return self.bookings[passenger]

    def cancel_booking(self, passenger):
        if passenger not in self.bookings:
            raise ValueError("not booked")
        del self.bookings[passenger]

    def seat_of(self, passenger):
        return self.bookings.get(passenger)

    def available(self):
        return self.seats - len(self.bookings)
`,
          fails: ["reuse"],
          why: "seats are handed out by a counter that never goes back, so a cancelled seat is never offered again and the flight refuses bookings while seats are free",
        },
        {
          code: src`
class Flight:
    def __init__(self, code, seats):
        self.code = code
        self.seats = seats
        self.bookings = {}

    def book(self, passenger):
        if len(self.bookings) == self.seats:
            raise ValueError("full")
        taken = list(self.bookings.values())
        for seat in range(1, self.seats + 1):
            if seat not in taken:
                self.bookings[passenger] = seat
                return seat

    def cancel_booking(self, passenger):
        if passenger in self.bookings:
            del self.bookings[passenger]

    def seat_of(self, passenger):
        return self.bookings.get(passenger)

    def available(self):
        return self.seats - len(self.bookings)
`,
          fails: ["twice", "cancel-unknown", "no-seats"],
          why: "the passenger and cancellation rules are missing: a second booking silently moves the passenger, and bad cancellations or empty flights are accepted",
        },
      ],
      task: {
        checks: [
          expr("basic", "Lowest free seats, then availability", "_f = Flight('RT204', 3)\nresult = [_f.book('Nora Garcia'), _f.book('Jamal Walker'), _f.seat_of('Jamal Walker'), _f.seat_of('Grace Walker'), _f.available()]", [1, 2, 2, null, 1], { show: "book Nora, book Jamal, seat_of Jamal, seat_of Grace, available()" }),
          expr("reuse", "A cancelled seat goes to the next booking", "_f = Flight('RT204', 3)\n_f.book('A')\n_f.book('B')\n_f.book('C')\n_f.cancel_booking('A')\nresult = [_f.book('D'), _f.available()]", [1, 0], { show: "fill 3 seats, cancel seat 1, book again" }),
          raisesExpr("full", "A full flight refuses a booking", "_f = Flight('RT9', 2)\n_f.book('A')\n_f.book('B')\n_f.cancel_booking('B')\n_f.book('C')\n_f.book('D')", "ValueError", { hidden: true }),
          expr("twice", "Booking the same passenger twice", "_f = Flight('RT1', 4)\n_f.book('Nora')\ntry:\n    _f.book('Nora')\n    _r = 'booked again'\nexcept ValueError:\n    _r = 'refused'\nresult = [_r, _f.seat_of('Nora'), _f.available()]", ["refused", 1, 3], { hidden: true }),
          raisesExpr("cancel-unknown", "Cancelling someone without a seat", "Flight('RT1', 2).cancel_booking('Nobody')", "ValueError", { hidden: true }),
          raisesExpr("no-seats", "A flight with no seats", "Flight('RT0', 0)", "ValueError", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-20 data transformation, medium
  {
    id: "PY-Q26-20",
    version: 2,
    slug: "money-from-text",
    title: "Money parsed by class methods",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "classmethod-dec", "comparison", "conversion", "dict-iterate", "dict-literal", "function-def", "function-default", "function-param", "function-return", "if-statement", "init-method", "logical", "membership", "plain-class", "print-call", "print-several", "raise-stmt", "self-name", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "tuple-unpack", "unicode-text"],
    prompt: "Prices arrive as text such as `£1,250.10` or `€19.99`. Write a class `Money` that stores an amount as whole cents with a currency code, and two class methods that build Money from other formats. The currency symbols are a class attribute shared by both.",
    spec: [
      ["Class attribute", "`SYMBOLS = {\"£\": \"GBP\", \"$\": \"USD\", \"€\": \"EUR\"}`"],
      ["`Money(cents, currency)`", "attributes `cents` (an int) and `currency`; ValueError if `currency` isn't one of the codes in SYMBOLS"],
      ["`Money.parse(text)`", "strips spaces; the first character is the symbol; the rest is the amount, with `,` separators allowed; ValueError for an unknown symbol or an amount that isn't a number"],
      ["`Money.from_amount(amount, currency=\"GBP\")`", "an amount like 12.5 → 1250 cents (rounded to the nearest cent)"],
    ],
    hiddenKinds: ["thousands separators", "an amount with one decimal place", "an unknown symbol", "an amount that isn't a number", "an unknown currency code"],
    hints: [
      "`Money(cents, currency)` only stores and checks; the class methods do the parsing and end with `cls(...)`.",
      "In `parse`, split the text into its first character and the rest, look the symbol up in `cls.SYMBOLS`, and remove the commas from the rest.",
      "Convert the amount with `float`, then to cents with `round(amount * 100)`; both class methods can share that step.",
    ],
    explanation: "Storing whole cents avoids float rounding in later arithmetic, and keeping both parsers as class methods gives each input format one obvious entry point that ends in the one validating constructor. `round(float(x) * 100)` turns `19.99` into 1999 even though `19.99 * 100` is `1998.9999999999998`; `int(...)` would truncate it to 1998. The symbols live on the class, so a new currency is one entry for both methods.",
    code: {
      starter: src`
class Money:
    pass

price = Money.parse("£1,250.10")
tip = Money.from_amount(19.99, "USD")
print(price.cents, price.currency, tip.cents, tip.currency)
`,
      answer: src`
class Money:
    SYMBOLS = {"£": "GBP", "$": "USD", "€": "EUR"}

    def __init__(self, cents, currency):
        if currency not in Money.SYMBOLS.values():
            raise ValueError(f"unknown currency {currency!r}")
        self.cents = cents
        self.currency = currency

    @classmethod
    def parse(cls, text):
        text = text.strip()
        symbol, amount = text[:1], text[1:]
        if symbol not in cls.SYMBOLS:
            raise ValueError(f"unknown currency symbol in {text!r}")
        return cls.from_amount(float(amount.replace(",", "")), cls.SYMBOLS[symbol])

    @classmethod
    def from_amount(cls, amount, currency="GBP"):
        return cls(round(amount * 100), currency)

price = Money.parse("£1,250.10")
tip = Money.from_amount(19.99, "USD")
print(price.cents, price.currency, tip.cents, tip.currency)
`,
      alternatives: [
        src`
class Money:
    SYMBOLS = {"£": "GBP", "$": "USD", "€": "EUR"}

    def __init__(self, cents, currency):
        if currency not in list(self.SYMBOLS.values()):
            raise ValueError("unknown currency")
        self.cents = cents
        self.currency = currency

    @classmethod
    def from_amount(cls, amount, currency="GBP"):
        return cls(int(round(amount * 100)), currency)

    @classmethod
    def parse(cls, text):
        cleaned = text.strip()
        if not cleaned or cleaned[0] not in cls.SYMBOLS:
            raise ValueError("unknown symbol")
        number = float("".join(ch for ch in cleaned[1:] if ch != ","))
        return cls.from_amount(number, cls.SYMBOLS[cleaned[0]])
`,
      ],
      wrong: [
        {
          code: src`
class Money:
    SYMBOLS = {"£": "GBP", "$": "USD", "€": "EUR"}

    def __init__(self, cents, currency):
        if currency not in Money.SYMBOLS.values():
            raise ValueError("unknown currency")
        self.cents = cents
        self.currency = currency

    @classmethod
    def parse(cls, text):
        text = text.strip()
        if text[0] not in cls.SYMBOLS:
            raise ValueError("unknown symbol")
        return cls(int(float(text[1:].replace(",", "")) * 100), cls.SYMBOLS[text[0]])

    @classmethod
    def from_amount(cls, amount, currency="GBP"):
        return cls(int(amount * 100), currency)
`,
          fails: ["from-amount", "parse"],
          why: "`int` cuts off instead of rounding, so 19.99 becomes 1998 cents",
        },
        {
          code: src`
class Money:
    SYMBOLS = {"£": "GBP", "$": "USD", "€": "EUR"}

    def __init__(self, cents, currency):
        self.cents = cents
        self.currency = currency

    @classmethod
    def parse(cls, text):
        text = text.strip()
        return cls(round(float(text[1:]) * 100), cls.SYMBOLS.get(text[0], "GBP"))

    @classmethod
    def from_amount(cls, amount, currency="GBP"):
        return cls(round(amount * 100), currency)
`,
          fails: ["parse", "unknown-symbol", "unknown-code"],
          why: "commas aren't removed, an unknown symbol silently becomes GBP, and any currency code is accepted",
        },
      ],
      task: {
        checks: [
          expr("parse", "Parsing prices with symbols", "result = [(_m.cents, _m.currency) for _m in [Money.parse('£1,250.10'), Money.parse(' €19.99 '), Money.parse('$0.5')]]", [py.tuple(py.int(125010), py.str("GBP")), py.tuple(py.int(1999), py.str("EUR")), py.tuple(py.int(50), py.str("USD"))], { show: "Money.parse(\"£1,250.10\"), Money.parse(\" €19.99 \"), Money.parse(\"$0.5\")" }),
          expr("from-amount", "Building from an amount", "_a = Money.from_amount(19.99, 'USD')\n_b = Money.from_amount(12.5)\nresult = [_a.cents, _a.currency, _b.cents, _b.currency, type(_a).__name__]", [1999, "USD", 1250, "GBP", "Money"], { show: "Money.from_amount(19.99, \"USD\") and Money.from_amount(12.5)" }),
          raisesExpr("unknown-symbol", "An unknown symbol", "Money.parse('¥500')", "ValueError", { hidden: true }),
          raisesExpr("not-a-number", "An amount that isn't a number", "Money.parse('£twelve')", "ValueError", { hidden: true }),
          raisesExpr("unknown-code", "An unknown currency code", "Money(100, 'JPY')", "ValueError", { hidden: true }),
          expr("shared", "The symbols live on the class", "result = Money.SYMBOLS['€']", "EUR", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q26-22 output prediction, hard
  {
    id: "PY-Q26-22",
    version: 2,
    slug: "counters-on-the-class",
    title: "Counters on the class",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "function-def", "function-param", "init-method", "len-call", "list-literal", "list-mutate", "method-def", "plain-class", "print-call", "print-several", "self-name", "top-level-indent"],
    prompt: "A page counter keeps its numbers as class attributes. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`self.total += 1` reads `total` (from the object if it has one, otherwise from the class) and then *assigns* to the object.",
      "`self.seen.append(...)` doesn't assign anything: it changes the list it finds.",
      "`checkout` is created after `PageCounter.total = 10` and has never called `hit`.",
    ],
    explanation: "The first `home.hit()` reads the class's 0 and stores 1 on `home`; the second reads `home`'s own 1 and stores 2. `cart.hit()` stores 1 on `cart`. Setting `PageCounter.total = 10` changes only the class attribute, which `home` and `cart` no longer look at. Meanwhile `seen` was never assigned through an object, so all three appends went into the one class-level list. `checkout` has no attributes of its own besides `page`, so it reads both class attributes: 10 and the shared list.",
    predict: {
      program: src`
class PageCounter:
    total = 0
    seen = []

    def __init__(self, page):
        self.page = page

    def hit(self):
        self.total += 1
        self.seen.append(self.page)

home = PageCounter("home")
cart = PageCounter("cart")
home.hit()
home.hit()
cart.hit()
PageCounter.total = 10
print(home.total, cart.total, PageCounter.total, len(PageCounter.seen))
checkout = PageCounter("checkout")
print(checkout.total, checkout.seen)
`,
      output: "2 1 10 3\n10 ['home', 'home', 'cart']\n",
      wrongPredictions: [
        "10 10 10 3\n10 ['home', 'home', 'cart']",
        "2 1 3 3\n3 []",
        "2 1 10 0\n10 []",
        "3 3 10 3\n10 ['home', 'home', 'cart']",
      ],
    },
  },
];
