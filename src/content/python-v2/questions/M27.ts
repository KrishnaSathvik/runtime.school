/**
 * M27 practice: ten independent problems on inheritance and composition (PY-L27-01 … PY-L27-05).
 *
 * Mix: 1 function implementation (a path up a category hierarchy), 2 debugging (polymorphic methods that print or are
 * misnamed; an isinstance chain that misses a class), 1 refactoring (a list subclass rebuilt with composition and the
 * same behaviour), 2 validation (a subclass that extends __init__ and a discount with super(); an API error family
 * and a retry policy decided by class), 1 data transformation (an invoice whose lines delegate tax to rule objects),
 * 1 integration (a notifier that falls back through channel objects), and 2 output predictions about super().
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are Runtime Market (R01) members, payments, deliveries, invoices and categories, plus GitHub-style API
 * status codes. Objects are graded by expr checks; the category function by fn cases.
 * Version 2: every question was replaced; the old set printed HAT and MUG labels.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
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

const categories = { Sports: null, Fitness: "Sports", "Yoga mats": "Fitness", Home: null, Lamps: "Home" };

export const m27Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q27-02 output prediction, easy
  {
    id: "PY-Q27-02",
    version: 2,
    slug: "notices-with-super",
    title: "Notices built with super()",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["arithmetic", "attr-assign", "class-def", "for-loop", "function-def", "function-param", "function-return", "init-method", "membership", "method-def", "plain-class", "print-call", "self-name", "string-format", "string-index", "subclass", "super-call", "top-level-indent"],
    prompt: "Three kinds of order notice share most of their text. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`body` is defined in Notice and overridden only in DelayedNotice.",
      "Inside `body`, `self.subject()` is looked up on the actual object, so a ShippedNotice uses its own subject.",
      "`super().body()` in DelayedNotice runs Notice's body, which calls the ordinary subject.",
    ],
    explanation: "Notice uses its own two methods. ShippedNotice inherits `body`, but `body` calls `self.subject()`, which finds ShippedNotice's override, and that override extends the parent's subject with `super()`. DelayedNotice overrides `body` and extends the parent's version; its subject is the inherited one.",
    predict: {
      program: src`
class Notice:
    def __init__(self, order_id):
        self.order_id = order_id

    def subject(self):
        return f"Order {self.order_id}"

    def body(self):
        return self.subject() + " has an update"

class ShippedNotice(Notice):
    def subject(self):
        return super().subject() + " shipped"

class DelayedNotice(Notice):
    def body(self):
        return "Sorry: " + super().body()

for notice in [Notice("O100282"), ShippedNotice("O100918"), DelayedNotice("O101219")]:
    print(notice.body())
`,
      output: "Order O100282 has an update\nOrder O100918 shipped has an update\nSorry: Order O101219 has an update\n",
      wrongPredictions: [
        "Order O100282 has an update\nOrder O100918 has an update\nSorry: Order O101219 has an update",
        "Order O100282 has an update\nOrder O100918 shipped\nSorry: Order O101219 has an update",
        "Order O100282 has an update\nOrder O100918 shipped has an update\nSorry: has an update",
      ],
    },
  },

  // ------------------------------------------------------------------ PY-Q27-03 debugging, easy
  {
    id: "PY-Q27-03",
    version: 2,
    slug: "payment-fees-break",
    title: "Payment fees that don't add up",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "class-def", "for-loop", "function-def", "function-param", "function-return", "list-literal", "membership", "method-def", "plain-class", "precedence", "print-call", "print-several", "self-name", "top-level-indent"],
    prompt: "Every payment method should offer `fee(amount)`, returning the fee as a number, so `total_fees` can treat them all alike. Since two new methods were added, `total_fees` crashes. Fix the payment classes (not `total_fees`) so they all keep the same contract.",
    spec: [
      ["Contract", "every payment class has `fee(amount)` returning a number"],
      ["Fees", "Card: 1.5% rounded to 2 places; BankTransfer: 0.20; Voucher: 0; PayLater: 2.9% + 0.30, rounded to 2 places"],
      ["Unchanged", "`total_fees(payments)` adds up `method.fee(amount)` for `(method, amount)` pairs"],
    ],
    hiddenKinds: ["only the new payment methods", "a single voucher payment"],
    hints: [
      "Run the starter and read the errors: one class has no `fee` at all, another returns nothing.",
      "Polymorphism only works if every class uses the same method name and returns the same kind of value.",
      "Rename the misnamed method, and make the other one return its value instead of printing it.",
    ],
    explanation: "`total_fees` calls `fee` on whatever it is given, so every class must offer `fee(amount)` and return a number. `Voucher` called its method `fees`, so the call failed with AttributeError; `PayLater` printed its fee and returned None, so adding it failed with TypeError. Fixing the classes, not the caller, keeps `total_fees` free of special cases.",
    code: {
      starter: src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fees(self, amount):
        return 0

class PayLater:
    def fee(self, amount):
        print(round(amount * 0.029 + 0.3, 2))

def total_fees(payments):
    total = 0
    for method, amount in payments:
        total += method.fee(amount)
    return round(total, 2)

print(total_fees([(Card(), 40.0), (BankTransfer(), 40.0), (Voucher(), 15.0), (PayLater(), 100.0)]))
`,
      answer: src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fee(self, amount):
        return 0

class PayLater:
    def fee(self, amount):
        return round(amount * 0.029 + 0.3, 2)

def total_fees(payments):
    total = 0
    for method, amount in payments:
        total += method.fee(amount)
    return round(total, 2)

print(total_fees([(Card(), 40.0), (BankTransfer(), 40.0), (Voucher(), 15.0), (PayLater(), 100.0)]))
`,
      alternatives: [
        src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fee(self, amount):
        return 0

class PayLater:
    def fee(self, amount):
        charge = amount * 0.029 + 0.3
        return round(charge, 2)

def total_fees(payments):
    total = 0
    for method, amount in payments:
        total += method.fee(amount)
    return round(total, 2)
`,
      ],
      wrong: [
        {
          code: src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fee(self, amount):
        return 0

class PayLater:
    def fee(self, amount):
        print(round(amount * 0.029 + 0.3, 2))

def total_fees(payments):
    total = 0
    for method, amount in payments:
        total += method.fee(amount)
    return round(total, 2)
`,
          fails: ["total", "new-ones"],
          why: "the voucher is fixed, but PayLater still prints its fee and returns None",
        },
        {
          code: src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fees(self, amount):
        return 0

class PayLater:
    def fee(self, amount):
        return round(amount * 0.029 + 0.3, 2)

def total_fees(payments):
    total = 0
    for method, amount in payments:
        if isinstance(method, Voucher):
            continue
        total += method.fee(amount)
    return round(total, 2)
`,
          fails: ["voucher"],
          why: "the caller now skips vouchers by type instead of the Voucher class offering `fee`, so a voucher still can't be asked for its fee",
        },
      ],
      task: {
        checks: [
          expr("total", "Fees for four payments", "result = total_fees([(Card(), 40.0), (BankTransfer(), 40.0), (Voucher(), 15.0), (PayLater(), 100.0)])", py.float(4), { show: "total_fees(<card 40, transfer 40, voucher 15, pay later 100>)" }),
          expr("voucher", "A voucher answers fee() itself", "result = Voucher().fee(15.0)", 0, { show: "Voucher().fee(15.0)" }),
          expr("new-ones", "Only the new payment methods", "result = total_fees([(PayLater(), 20.0), (Voucher(), 50.0)])", 0.88, { hidden: true }),
          expr("single", "A single voucher payment", "result = total_fees([(Voucher(), 9.99)])", 0, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-06 function implementation, easy
  {
    id: "PY-Q27-06",
    version: 2,
    slug: "category-path",
    title: "The path up a category tree",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "dict-literal", "function-def", "function-param", "function-return", "identity", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "top-level-indent", "while-loop"],
    prompt: "Product categories form a hierarchy, like classes and their parents: Yoga mats are a kind of Fitness product, which is a kind of Sports product. The catalogue stores it as a dictionary from each category to its parent (`None` for a top-level category). Write `category_path(category, parents)`, returning the path from the top-level category down to the one asked for, as a website's breadcrumb shows it.",
    spec: [
      ["Function", "`category_path(category, parents)`"],
      ["parents", "a dictionary from category to parent category, or to None for a top level; every parent named is also a key"],
      ["Returns", "a list from the top-level category to `category` itself"],
      ["Raises", "`ValueError` for a category that isn't in `parents`, or when following parents loops back to a category already on the path"],
      ["Must not", "change `parents`"],
    ],
    hiddenKinds: ["a deep hierarchy", "a category whose parents loop", "an unknown category", "a top-level category"],
    hints: [
      "Start at the category and keep stepping to its parent until you reach None.",
      "You collect the categories from the bottom up; the answer is top-down.",
      "Before stepping on, check whether the category is already on the path: if it is, the parents loop.",
    ],
    explanation: "Following `parents[current]` until None walks up the hierarchy, the same way Python looks up a method through a class's parents. The walk produces the bottom-up order, so the list is reversed at the end (or each step is inserted at the front). A loop in the data (A's parent is B and B's parent is A) would make the walk run forever, so a category seen twice is an error.",
    code: {
      starter: src`
def category_path(category, parents):
    return [category]

parents = {"Sports": None, "Fitness": "Sports", "Yoga mats": "Fitness", "Home": None, "Lamps": "Home"}
print(category_path("Yoga mats", parents))
print(category_path("Home", parents))
`,
      answer: src`
def category_path(category, parents):
    if category not in parents:
        raise ValueError(f"unknown category {category!r}")
    path = []
    current = category
    while current is not None:
        if current in path:
            raise ValueError(f"the parents of {category!r} loop at {current!r}")
        path.append(current)
        current = parents[current]
    path.reverse()
    return path

parents = {"Sports": None, "Fitness": "Sports", "Yoga mats": "Fitness", "Home": None, "Lamps": "Home"}
print(category_path("Yoga mats", parents))
print(category_path("Home", parents))
`,
      alternatives: [
        src`
def category_path(category, parents):
    if category not in parents:
        raise ValueError("unknown category")
    path = [category]
    while parents[path[0]] is not None:
        parent = parents[path[0]]
        if parent in path:
            raise ValueError("loop")
        path.insert(0, parent)
    return path
`,
      ],
      wrong: [
        {
          code: src`
def category_path(category, parents):
    if category not in parents:
        raise ValueError("unknown category")
    path = []
    current = category
    while current is not None:
        if current in path:
            raise ValueError("loop")
        path.append(current)
        current = parents[current]
    return path
`,
          fails: ["returns"],
          why: "the path is bottom-up: the category first and the top level last",
        },
        {
          code: src`
def category_path(category, parents):
    if category not in parents:
        return []
    path = []
    current = category
    while current is not None:
        if current in path:
            raise ValueError("loop")
        path.insert(0, current)
        current = parents[current]
    return path
`,
          fails: ["errors"],
          why: "an unknown category quietly gives an empty path instead of an error",
        },
      ],
      task: {
        checks: [
          fn("returns", "category_path", [
            example(["Yoga mats", categories], ["Sports", "Fitness", "Yoga mats"]),
            example(["Lamps", categories], ["Home", "Lamps"]),
            example(["Home", categories], ["Home"]),
            hiddenCase("a deep hierarchy", ["Trail", { Sports: null, Outdoor: "Sports", Running: "Outdoor", Shoes: "Running", Trail: "Shoes" }], ["Sports", "Outdoor", "Running", "Shoes", "Trail"]),
            hiddenCase("a top-level category", ["Books", { Books: null, Fiction: "Books" }], ["Books"]),
          ], { label: "category_path() lists the path from the top level down" }),
          fn("errors", "category_path", [
            raisesCase(["Garden", categories], "ValueError"),
            raisesCase(["A", { A: "B", B: "A" }], "ValueError", { label: "a category whose parents loop" }),
          ], { label: "category_path() refuses unknown categories and loops" }),
          fn("keeps-input", "category_path", [keepsInput(["Yoga mats", categories])], { label: "category_path() leaves the parents dictionary unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-10 refactoring, easy
  {
    id: "PY-Q27-10",
    version: 2,
    slug: "inbox-by-composition",
    title: "An inbox that isn't a list",
    format: "refactoring",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "attr-assign", "boolean", "class-def", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "plain-class", "print-call", "self-name", "string-index", "subclass", "top-level-indent", "value-count"],
    prompt: "The support team's `Inbox` subclasses `list`, so other code has started calling `inbox.sort()`, `inbox.clear()` and `inbox.insert()` on it. Refactor it to hold its messages instead of being a list, keeping the behaviour of `receive`, `unread` and `mark_read` exactly the same, and adding `count()` (a list's `len` no longer applies).",
    spec: [
      ["Class", "`Inbox()` holding its messages in its own list; not a list itself"],
      ["Unchanged", "`receive(sender, subject)`, `unread()` (the unread messages' subjects, oldest first) and `mark_read(index)` (an IndexError for a bad index, as before)"],
      ["New", "`count()` → how many messages there are"],
    ],
    hiddenKinds: ["marking a message read twice", "an index past the end", "an empty inbox"],
    hints: [
      "Remove the `list` base and give `__init__` a list of messages.",
      "Every place that used `self` as the list now uses that attribute.",
      "Keep each method's result the same as before: `unread` still returns subjects, oldest first.",
    ],
    explanation: "The behaviour stays identical, but the inbox no longer *is* a list, so `sort`, `clear` and `insert` are gone and the only way to change it is through its own methods. `mark_read` still indexes the message list, so a bad index still raises IndexError, exactly as before: a refactoring changes the structure, not the behaviour.",
    code: {
      starter: src`
class Inbox(list):
    def receive(self, sender, subject):
        self.append({"from": sender, "subject": subject, "read": False})

    def unread(self):
        return [message["subject"] for message in self if not message["read"]]

    def mark_read(self, index):
        self[index]["read"] = True

inbox = Inbox()
inbox.receive("nora_garcia@fastmail.com", "Where is O100282?")
inbox.receive("jamal.walker62@icloud.com", "Refund for O100376")
inbox.mark_read(0)
print(inbox.unread(), len(inbox))
`,
      answer: src`
class Inbox:
    def __init__(self):
        self.messages = []

    def receive(self, sender, subject):
        self.messages.append({"from": sender, "subject": subject, "read": False})

    def unread(self):
        return [message["subject"] for message in self.messages if not message["read"]]

    def mark_read(self, index):
        self.messages[index]["read"] = True

    def count(self):
        return len(self.messages)

inbox = Inbox()
inbox.receive("nora_garcia@fastmail.com", "Where is O100282?")
inbox.receive("jamal.walker62@icloud.com", "Refund for O100376")
inbox.mark_read(0)
print(inbox.unread(), inbox.count())
`,
      alternatives: [
        src`
class Inbox:
    def __init__(self):
        self.messages = []

    def receive(self, sender, subject):
        self.messages.append({"from": sender, "subject": subject, "read": False})

    def unread(self):
        subjects = []
        for message in self.messages:
            if not message["read"]:
                subjects.append(message["subject"])
        return subjects

    def mark_read(self, index):
        message = self.messages[index]
        message["read"] = True

    def count(self):
        return len(self.messages)
`,
      ],
      wrong: [
        {
          code: src`
class Inbox(list):
    def receive(self, sender, subject):
        self.append({"from": sender, "subject": subject, "read": False})

    def unread(self):
        return [message["subject"] for message in self if not message["read"]]

    def mark_read(self, index):
        self[index]["read"] = True

    def count(self):
        return len(self)
`,
          fails: ["not-a-list"],
          why: "`count` was added, but it is still a list, so `sort`, `clear` and `insert` still work on it",
        },
        {
          code: src`
class Inbox:
    def __init__(self):
        self.messages = []

    def receive(self, sender, subject):
        self.messages.append({"from": sender, "subject": subject, "read": False})

    def unread(self):
        return [m["subject"] for m in self.messages if not m["read"]]

    def mark_read(self, index):
        if index < len(self.messages):
            self.messages[index]["read"] = True

    def count(self):
        return len(self.messages)
`,
          fails: ["bad-index"],
          why: "a bad index is now silently ignored, which changes behaviour: callers relied on the IndexError",
        },
      ],
      task: {
        checks: [
          expr("behaviour", "Receiving, reading and counting", "_i = Inbox()\n_i.receive('nora_garcia@fastmail.com', 'Where is O100282?')\n_i.receive('jamal.walker62@icloud.com', 'Refund for O100376')\n_i.receive('grace_walker29@yahoo.com', 'Wrong size')\n_i.mark_read(1)\nresult = [_i.unread(), _i.count()]", [["Where is O100282?", "Wrong size"], 3], { show: "receive three, mark_read(1), unread(), count()" }),
          expr("not-a-list", "The inbox isn't a list", "_i = Inbox()\nresult = [isinstance(_i, list), hasattr(_i, 'sort'), hasattr(_i, 'insert'), hasattr(_i, 'clear')]", [false, false, false, false], { show: "isinstance(inbox, list) and its list methods" }),
          expr("twice", "Marking a message read twice", "_i = Inbox()\n_i.receive('a@b.com', 'One')\n_i.mark_read(0)\n_i.mark_read(0)\nresult = [_i.unread(), _i.count()]", [[], 1], { hidden: true }),
          raisesExpr("bad-index", "An index past the end", "_i = Inbox()\n_i.receive('a@b.com', 'One')\n_i.mark_read(5)", "IndexError", { hidden: true }),
          expr("empty", "An empty inbox", "_i = Inbox()\nresult = [_i.unread(), _i.count()]", [[], 0], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-12 validation, medium
  {
    id: "PY-Q27-12",
    version: 2,
    slug: "premium-members",
    title: "Premium members extend the discount",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-literal", "else-clause", "function-def", "function-param", "function-return", "if-statement", "init-method", "logical", "membership", "method-def", "plain-class", "print-call", "raise-stmt", "self-name", "string-format", "string-index", "string-method", "subclass", "super-call", "top-level-indent"],
    prompt: "Every member gets 5% off orders of 50 or more. Premium members also get a tier bonus on **every** order: 5 percentage points for `gold`, 10 for `platinum`. Write `PremiumMember`, a subclass of the given `Member`, that adds a `tier` (tidied to lower case and validated) and extends `discount(total)` with super() instead of repeating the base rule.",
    spec: [
      ["Class", "`PremiumMember(member_id, name, tier)`, a subclass of `Member`"],
      ["tier", "stripped and lower-cased; must be `gold` or `platinum`, otherwise ValueError"],
      ["`discount(total)`", "the member's discount plus the tier bonus, rounded to 2 places (`0.1` is 10%)"],
      ["Inherited", "`member_id`, `name` and `describe()`"],
    ],
    hiddenKinds: ["an order below the threshold", "an unknown tier", "a tier with capitals and spaces"],
    hints: [
      "The subclass `__init__` tidies and checks the tier, lets `super().__init__` store the inherited attributes, then stores the tier.",
      "A class attribute can hold the bonus for each tier.",
      "`discount` adds the tier's bonus to whatever `super().discount(total)` returns.",
    ],
    explanation: "Extending with `super()` keeps the base rule in one place: if members' 5% threshold changes, premium members follow automatically. The subclass constructor validates the new attribute and hands the old ones to the parent, so inherited methods such as `describe` keep working. Copying the base rule into the subclass would duplicate it and drift.",
    code: {
      starter: src`
class Member:
    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name

    def discount(self, total):
        return 0.05 if total >= 50 else 0.0

    def describe(self):
        return f"{self.member_id} {self.name}"

ana = PremiumMember("M0042", "Ana Lopez", " Gold")
print(ana.describe(), ana.tier, ana.discount(80.0), ana.discount(20.0))
`,
      answer: src`
class Member:
    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name

    def discount(self, total):
        return 0.05 if total >= 50 else 0.0

    def describe(self):
        return f"{self.member_id} {self.name}"

class PremiumMember(Member):
    BONUS = {"gold": 0.05, "platinum": 0.10}

    def __init__(self, member_id, name, tier):
        tier = tier.strip().lower()
        if tier not in PremiumMember.BONUS:
            raise ValueError(f"unknown tier {tier!r}")
        super().__init__(member_id, name)
        self.tier = tier

    def discount(self, total):
        return round(super().discount(total) + PremiumMember.BONUS[self.tier], 2)

ana = PremiumMember("M0042", "Ana Lopez", " Gold")
print(ana.describe(), ana.tier, ana.discount(80.0), ana.discount(20.0))
`,
      alternatives: [
        src`
class Member:
    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name

    def discount(self, total):
        return 0.05 if total >= 50 else 0.0

    def describe(self):
        return f"{self.member_id} {self.name}"

class PremiumMember(Member):
    def __init__(self, member_id, name, tier):
        super().__init__(member_id, name)
        self.tier = tier.strip().lower()
        if self.tier == "gold":
            self.bonus = 0.05
        elif self.tier == "platinum":
            self.bonus = 0.1
        else:
            raise ValueError("tier must be gold or platinum")

    def discount(self, total):
        base = super().discount(total)
        return round(base + self.bonus, 2)
`,
      ],
      wrong: [
        {
          code: src`
class Member:
    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name

    def discount(self, total):
        return 0.05 if total >= 50 else 0.0

    def describe(self):
        return f"{self.member_id} {self.name}"

class PremiumMember(Member):
    BONUS = {"gold": 0.05, "platinum": 0.10}

    def __init__(self, member_id, name, tier):
        tier = tier.strip().lower()
        if tier not in PremiumMember.BONUS:
            raise ValueError("unknown tier")
        self.tier = tier

    def discount(self, total):
        return round(super().discount(total) + PremiumMember.BONUS[self.tier], 2)
`,
          fails: ["inherited"],
          why: "`super().__init__` is never called, so the member id and name are missing and `describe()` fails",
        },
        {
          code: src`
class Member:
    def __init__(self, member_id, name):
        self.member_id = member_id
        self.name = name

    def discount(self, total):
        return 0.05 if total >= 50 else 0.0

    def describe(self):
        return f"{self.member_id} {self.name}"

class PremiumMember(Member):
    BONUS = {"gold": 0.05, "platinum": 0.10}

    def __init__(self, member_id, name, tier):
        tier = tier.strip().lower()
        if tier not in PremiumMember.BONUS:
            raise ValueError("unknown tier")
        super().__init__(member_id, name)
        self.tier = tier

    def discount(self, total):
        return PremiumMember.BONUS[self.tier]
`,
          fails: ["discounts"],
          why: "the override replaces the base 5% instead of adding to it",
        },
      ],
      task: {
        checks: [
          expr("discounts", "Discounts above and below the threshold", "_g = PremiumMember('M0042', 'Ana Lopez', 'gold')\n_p = PremiumMember('M0043', 'Ben Cole', 'platinum')\nresult = [_g.discount(80.0), _g.discount(20.0), _p.discount(50.0), _p.discount(49.99)]", [0.1, 0.05, 0.15, 0.1], { show: "discount() for gold and platinum, above and below 50" }),
          expr("inherited", "Inherited attributes and methods", "_m = PremiumMember('M0042', 'Ana Lopez', ' Gold')\nresult = [_m.describe(), _m.tier, isinstance(_m, Member)]", ["M0042 Ana Lopez", "gold", true], { show: "PremiumMember(\"M0042\", \"Ana Lopez\", \" Gold\")" }),
          raisesExpr("tier", "An unknown tier", "PremiumMember('M1', 'X', 'bronze')", "ValueError", { hidden: true }),
          expr("member", "Ordinary members are unchanged", "result = [Member('M2', 'Y').discount(60.0), Member('M2', 'Y').discount(10.0)]", [0.05, py.float(0)], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-13 debugging, medium
  {
    id: "PY-Q27-13",
    version: 2,
    slug: "quotes-without-isinstance",
    title: "Quotes that miss a delivery option",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-comp", "dict-literal", "dict-lookup", "else-clause", "exc-name", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "membership", "method-def", "plain-class", "precedence", "print-call", "self-name", "string-index", "top-level-indent", "truthiness", "type-call"],
    prompt: "`quote_all` decides each delivery option's cost with an isinstance chain. When pallet delivery was added it never appeared in the quotes, and adding it to the chain crashed because its `cost` needs a distance too. Make every option answer `cost(weight_kg)` the same way (pallet delivery keeps its distance as an attribute), and make `quote_all` work for any option without naming classes.",
    spec: [
      ["Options", "`Standard()`, `Express()`, `Pallet(distance_km)`; each with `cost(weight_kg)`"],
      ["Pallet", "`45 + 0.4 × distance_km`, whatever the weight"],
      ["`quote_all(options, weight_kg)`", "`{class name: cost rounded to 2 places}` for every option given"],
    ],
    hiddenKinds: ["an option class that quote_all has never heard of", "only a pallet"],
    hints: [
      "Polymorphism needs one call shape: `cost(weight_kg)` for every class. Where else can the pallet's distance live?",
      "Store the distance when the Pallet is created.",
      "`quote_all` can name each result with `type(option).__name__` and call `option.cost(weight_kg)`, with no `isinstance` at all.",
    ],
    explanation: "The isinstance chain had to be edited for every new option, and it was missed for Pallet. Pallet also broke the shared contract by needing an extra argument. Moving the distance into the object (set in `__init__`) gives every option the same `cost(weight_kg)`, and `quote_all` can then ask any option for its cost and label it by its class name, so the next option needs no change to `quote_all` at all.",
    code: {
      starter: src`
class Standard:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class Express:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class Pallet:
    def cost(self, weight_kg, distance_km):
        return 45 + 0.4 * distance_km

def quote_all(options, weight_kg):
    quotes = {}
    for option in options:
        if isinstance(option, Standard):
            quotes["Standard"] = round(option.cost(weight_kg), 2)
        elif isinstance(option, Express):
            quotes["Express"] = round(option.cost(weight_kg), 2)
    return quotes

print(quote_all([Standard(), Express(), Pallet()], 4.0))
`,
      answer: src`
class Standard:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class Express:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class Pallet:
    def __init__(self, distance_km):
        self.distance_km = distance_km

    def cost(self, weight_kg):
        return 45 + 0.4 * self.distance_km

def quote_all(options, weight_kg):
    quotes = {}
    for option in options:
        quotes[type(option).__name__] = round(option.cost(weight_kg), 2)
    return quotes

print(quote_all([Standard(), Express(), Pallet(120)], 4.0))
`,
      alternatives: [
        src`
class Standard:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class Express:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class Pallet:
    def __init__(self, distance_km):
        self.distance_km = distance_km

    def cost(self, weight_kg):
        return 45 + self.distance_km * 0.4

def quote_all(options, weight_kg):
    return {type(o).__name__: round(o.cost(weight_kg), 2) for o in options}
`,
      ],
      wrong: [
        {
          code: src`
class Standard:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class Express:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class Pallet:
    def __init__(self, distance_km):
        self.distance_km = distance_km

    def cost(self, weight_kg):
        return 45 + 0.4 * self.distance_km

def quote_all(options, weight_kg):
    quotes = {}
    for option in options:
        if isinstance(option, Standard):
            quotes["Standard"] = round(option.cost(weight_kg), 2)
        elif isinstance(option, Express):
            quotes["Express"] = round(option.cost(weight_kg), 2)
        elif isinstance(option, Pallet):
            quotes["Pallet"] = round(option.cost(weight_kg), 2)
    return quotes
`,
          fails: ["unknown-class"],
          why: "Pallet works now, but only because it was added to the chain: the next new option is silently left out again",
        },
        {
          code: src`
class Standard:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class Express:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class Pallet:
    def cost(self, weight_kg, distance_km=100):
        return 45 + 0.4 * distance_km

def quote_all(options, weight_kg):
    return {type(o).__name__: round(o.cost(weight_kg), 2) for o in options}
`,
          fails: ["all", "pallet-only"],
          why: "a default distance hides the problem: every pallet is priced as if it went 100 km",
        },
      ],
      task: {
        checks: [
          expr("all", "Three options at 4 kg", "result = quote_all([Standard(), Express(), Pallet(120)], 4.0)", { Standard: py.float(6), Express: py.float(10), Pallet: py.float(93) }, { show: "quote_all([Standard(), Express(), Pallet(120)], 4.0)" }),
          expr("unknown-class", "An option class quote_all has never heard of", "class _Drone:\n    def cost(self, weight_kg):\n        return 12.5\nresult = quote_all([_Drone(), Standard()], 1.0)", { _Drone: 12.5, Standard: 3.5 }, { hidden: true }),
          expr("pallet-only", "Only a pallet", "result = quote_all([Pallet(35)], 800)", { Pallet: py.float(59) }, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-16 validation, medium
  {
    id: "PY-Q27-16",
    version: 2,
    slug: "api-error-family",
    title: "API errors and when to retry",
    format: "validation",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conversion", "dict-literal", "else-clause", "exc-name", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "logical", "membership", "print-call", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "subclass", "super-call", "top-level-indent", "type-call"],
    prompt: "A client for a code-hosting API turns failed responses into exceptions. Build the family: `ApiError` (keeps the `status` code), `ClientError` for 4xx statuses with two special cases `NotFound` (404) and `RateLimited` (429), and `ServerError` for 5xx. Then write `error_for(status, message)`, which returns (doesn't raise) the most specific exception, and `should_retry(err)`, which is True only for server errors and rate limits.",
    spec: [
      ["Classes", "`ApiError(Exception)` with `__init__(status, message)` storing `status` (its text is `\"<status>: <message>\"`); `ClientError` and `ServerError` subclass ApiError; `NotFound` and `RateLimited` subclass ClientError"],
      ["`error_for(status, message)`", "404 → NotFound, 429 → RateLimited, other 400–499 → ClientError, 500–599 → ServerError; any other status → ValueError"],
      ["`should_retry(err)`", "True for a ServerError or a RateLimited, False for any other error"],
    ],
    hiddenKinds: ["a 400 that is neither 404 nor 429", "the edges of the 5xx range", "a status that isn't an error", "an error that isn't from the API"],
    hints: [
      "Only ApiError needs an `__init__`: it builds the text with `super().__init__(...)` and stores the status. The subclasses can be empty.",
      "`error_for` checks the two special codes first, then the ranges.",
      "`should_retry` can ask `isinstance(err, (ServerError, RateLimited))`: one call, both families.",
    ],
    explanation: "A hierarchy lets callers choose how specific to be: `except NotFound` for one case, `except ClientError` for all 4xx, `except ApiError` for anything from the API. Retry policy follows the classes: server errors and rate limits are worth retrying, other client errors are not, because the same request will fail the same way. `isinstance` with a tuple tests several classes at once, and subclasses count, which is exactly the point of the family.",
    code: {
      starter: src`
class ApiError(Exception):
    pass

def error_for(status, message):
    return ApiError(f"{status}: {message}")

def should_retry(err):
    return False

for status in [404, 429, 422, 503]:
    err = error_for(status, "from GET /repos/octo/api")
    print(type(err).__name__, err.status, should_retry(err))
`,
      answer: src`
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(f"{status}: {message}")
        self.status = status

class ClientError(ApiError):
    pass

class NotFound(ClientError):
    pass

class RateLimited(ClientError):
    pass

class ServerError(ApiError):
    pass

def error_for(status, message):
    if status == 404:
        return NotFound(status, message)
    if status == 429:
        return RateLimited(status, message)
    if 400 <= status <= 499:
        return ClientError(status, message)
    if 500 <= status <= 599:
        return ServerError(status, message)
    raise ValueError(f"{status} is not an error status")

def should_retry(err):
    return isinstance(err, (ServerError, RateLimited))

for status in [404, 429, 422, 503]:
    err = error_for(status, "from GET /repos/octo/api")
    print(type(err).__name__, err.status, should_retry(err))
`,
      alternatives: [
        src`
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(str(status) + ": " + message)
        self.status = status

class ClientError(ApiError):
    pass

class ServerError(ApiError):
    pass

class NotFound(ClientError):
    pass

class RateLimited(ClientError):
    pass

SPECIAL = {404: NotFound, 429: RateLimited}

def error_for(status, message):
    if status in SPECIAL:
        kind = SPECIAL[status]
    elif 400 <= status < 500:
        kind = ClientError
    elif 500 <= status < 600:
        kind = ServerError
    else:
        raise ValueError("not an error status")
    return kind(status, message)

def should_retry(err):
    return isinstance(err, ServerError) or isinstance(err, RateLimited)
`,
      ],
      wrong: [
        {
          code: src`
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(f"{status}: {message}")
        self.status = status

class ClientError(ApiError):
    pass

class NotFound(ApiError):
    pass

class RateLimited(ApiError):
    pass

class ServerError(ApiError):
    pass

def error_for(status, message):
    if status == 404:
        return NotFound(status, message)
    if status == 429:
        return RateLimited(status, message)
    if 400 <= status <= 499:
        return ClientError(status, message)
    if 500 <= status <= 599:
        return ServerError(status, message)
    raise ValueError("not an error status")

def should_retry(err):
    return isinstance(err, (ServerError, RateLimited))
`,
          fails: ["family"],
          why: "NotFound and RateLimited skip ClientError, so `except ClientError` misses them",
        },
        {
          code: src`
class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(f"{status}: {message}")
        self.status = status

class ClientError(ApiError):
    pass

class NotFound(ClientError):
    pass

class RateLimited(ClientError):
    pass

class ServerError(ApiError):
    pass

def error_for(status, message):
    if status == 404:
        return NotFound(status, message)
    if status == 429:
        return RateLimited(status, message)
    if 400 <= status <= 499:
        return ClientError(status, message)
    if 500 <= status <= 599:
        return ServerError(status, message)
    raise ValueError("not an error status")

def should_retry(err):
    return not isinstance(err, ClientError)
`,
          fails: ["retry", "foreign"],
          why: "rate limits are client errors but are worth retrying, and errors that aren't from the API at all would be retried too",
        },
      ],
      task: {
        checks: [
          expr("mapping", "The most specific class for each status", "result = [type(error_for(_s, 'x')).__name__ for _s in [404, 429, 422, 503, 400, 599, 500]]", ["NotFound", "RateLimited", "ClientError", "ServerError", "ClientError", "ServerError", "ServerError"], { show: "the class for 404, 429, 422, 503, 400, 599, 500" }),
          expr("family", "Errors form one family", "result = [issubclass(NotFound, ClientError), issubclass(RateLimited, ClientError), issubclass(ClientError, ApiError), issubclass(ServerError, ApiError), issubclass(ServerError, ClientError)]", [true, true, true, true, false], { show: "issubclass checks for the family" }),
          expr("details", "Status and message are kept", "_e = error_for(404, 'repo octo/api not found')\nresult = [_e.status, str(_e), isinstance(_e, Exception)]", [404, "404: repo octo/api not found", true], { show: "error_for(404, \"repo octo/api not found\")" }),
          expr("retry", "Which errors are retried", "result = [should_retry(error_for(_s, 'x')) for _s in [503, 429, 404, 422]]", [true, true, false, false], { hidden: true }),
          raisesExpr("not-error", "A status that isn't an error", "error_for(200, 'ok')", "ValueError", { hidden: true }),
          expr("foreign", "An error that isn't from the API", "result = should_retry(KeyError('price'))", false, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-19 data transformation, medium
  {
    id: "PY-Q27-19",
    version: 2,
    slug: "invoice-with-tax-rules",
    title: "An invoice whose lines know their tax",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 18,
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "init-method", "list-literal", "list-mutate", "membership", "method-def", "plain-class", "print-call", "reassignment", "self-name", "top-level-indent"],
    prompt: "Different products are taxed differently, and the rules change. Each invoice line therefore **holds** a tax-rule object and asks it for the tax. The rules `StandardVat` and `ZeroRated` are given. Write `InvoiceLine` and `Invoice`, and an `Invoice.summary()` that turns the whole invoice into a dictionary.",
    spec: [
      ["`InvoiceLine(description, quantity, unit_price, tax_rule)`", "`net()` → quantity × unit price, rounded to 2 places; `tax()` → `tax_rule.tax(net)`"],
      ["`Invoice(number, customer_name, lines)`", "`net()`, `tax()` and `gross()` add up the lines (each rounded to 2 places)"],
      ["`summary()`", "`{\"number\": …, \"customer\": …, \"net\": …, \"tax\": …, \"gross\": …, \"lines\": [[description, net, tax], …]}`"],
    ],
    hiddenKinds: ["a tax rule the invoice has never seen", "a line's rule replaced after the invoice was made", "an invoice with no lines"],
    hints: [
      "The line stores the rule object it is given; `tax()` passes the line's net to the rule's `tax` method.",
      "The invoice never looks at rules: it adds up what its lines report.",
      "Build `summary` from the methods you already have.",
    ],
    explanation: "Composition puts each decision where it belongs: the rule knows how to tax a net amount, the line knows its own net and which rule applies, and the invoice only adds up. A new rule (a reduced rate, say) is one new class with a `tax` method, and changing a line's rule changes its tax without touching the invoice. The invoice reads the lines through their methods, so a replaced rule is picked up the next time `tax()` runs.",
    code: {
      starter: src`
class StandardVat:
    def tax(self, net):
        return round(net * 0.2, 2)

class ZeroRated:
    def tax(self, net):
        return 0.0

class InvoiceLine:
    pass

class Invoice:
    pass

invoice = Invoice("INV-0041", "Grace Walker", [
    InvoiceLine("Yoga mat", 2, 17.92, StandardVat()),
    InvoiceLine("The Long Road (book)", 1, 8.99, ZeroRated()),
])
print(invoice.summary())
`,
      answer: src`
class StandardVat:
    def tax(self, net):
        return round(net * 0.2, 2)

class ZeroRated:
    def tax(self, net):
        return 0.0

class InvoiceLine:
    def __init__(self, description, quantity, unit_price, tax_rule):
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.tax_rule = tax_rule

    def net(self):
        return round(self.quantity * self.unit_price, 2)

    def tax(self):
        return self.tax_rule.tax(self.net())

class Invoice:
    def __init__(self, number, customer_name, lines):
        self.number = number
        self.customer_name = customer_name
        self.lines = lines

    def net(self):
        return round(sum(line.net() for line in self.lines), 2)

    def tax(self):
        return round(sum(line.tax() for line in self.lines), 2)

    def gross(self):
        return round(self.net() + self.tax(), 2)

    def summary(self):
        return {
            "number": self.number,
            "customer": self.customer_name,
            "net": self.net(),
            "tax": self.tax(),
            "gross": self.gross(),
            "lines": [[line.description, line.net(), line.tax()] for line in self.lines],
        }

invoice = Invoice("INV-0041", "Grace Walker", [
    InvoiceLine("Yoga mat", 2, 17.92, StandardVat()),
    InvoiceLine("The Long Road (book)", 1, 8.99, ZeroRated()),
])
print(invoice.summary())
`,
      alternatives: [
        src`
class StandardVat:
    def tax(self, net):
        return round(net * 0.2, 2)

class ZeroRated:
    def tax(self, net):
        return 0.0

class InvoiceLine:
    def __init__(self, description, quantity, unit_price, tax_rule):
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.tax_rule = tax_rule

    def net(self):
        return round(self.unit_price * self.quantity, 2)

    def tax(self):
        return self.tax_rule.tax(self.net())

class Invoice:
    def __init__(self, number, customer_name, lines):
        self.number = number
        self.customer_name = customer_name
        self.lines = lines

    def net(self):
        total = 0
        for line in self.lines:
            total += line.net()
        return round(total, 2)

    def tax(self):
        total = 0
        for line in self.lines:
            total += line.tax()
        return round(total, 2)

    def gross(self):
        return round(self.net() + self.tax(), 2)

    def summary(self):
        lines = []
        for line in self.lines:
            lines.append([line.description, line.net(), line.tax()])
        return {"number": self.number, "customer": self.customer_name, "net": self.net(), "tax": self.tax(), "gross": self.gross(), "lines": lines}
`,
      ],
      wrong: [
        {
          code: src`
class StandardVat:
    def tax(self, net):
        return round(net * 0.2, 2)

class ZeroRated:
    def tax(self, net):
        return 0.0

class InvoiceLine:
    def __init__(self, description, quantity, unit_price, tax_rule):
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.tax_rule = tax_rule

    def net(self):
        return round(self.quantity * self.unit_price, 2)

    def tax(self):
        if isinstance(self.tax_rule, ZeroRated):
            return 0.0
        return round(self.net() * 0.2, 2)

class Invoice:
    def __init__(self, number, customer_name, lines):
        self.number = number
        self.customer_name = customer_name
        self.lines = lines

    def net(self):
        return round(sum(line.net() for line in self.lines), 2)

    def tax(self):
        return round(sum(line.tax() for line in self.lines), 2)

    def gross(self):
        return round(self.net() + self.tax(), 2)

    def summary(self):
        return {"number": self.number, "customer": self.customer_name, "net": self.net(), "tax": self.tax(), "gross": self.gross(), "lines": [[l.description, l.net(), l.tax()] for l in self.lines]}
`,
          fails: ["new-rule"],
          why: "the line works the tax out itself instead of asking its rule, so any rule other than the two known ones is taxed at 20%",
        },
        {
          code: src`
class StandardVat:
    def tax(self, net):
        return round(net * 0.2, 2)

class ZeroRated:
    def tax(self, net):
        return 0.0

class InvoiceLine:
    def __init__(self, description, quantity, unit_price, tax_rule):
        self.description = description
        self.quantity = quantity
        self.unit_price = unit_price
        self.tax_amount = tax_rule.tax(round(quantity * unit_price, 2))

    def net(self):
        return round(self.quantity * self.unit_price, 2)

    def tax(self):
        return self.tax_amount

class Invoice:
    def __init__(self, number, customer_name, lines):
        self.number = number
        self.customer_name = customer_name
        self.lines = lines

    def net(self):
        return round(sum(line.net() for line in self.lines), 2)

    def tax(self):
        return round(sum(line.tax() for line in self.lines), 2)

    def gross(self):
        return round(self.net() + self.tax(), 2)

    def summary(self):
        return {"number": self.number, "customer": self.customer_name, "net": self.net(), "tax": self.tax(), "gross": self.gross(), "lines": [[l.description, l.net(), l.tax()] for l in self.lines]}
`,
          fails: ["swap"],
          why: "the tax is worked out once in `__init__` and the rule isn't kept, so replacing a line's rule later has no effect",
        },
      ],
      task: {
        checks: [
          expr("summary", "An invoice with two kinds of tax", "_i = Invoice('INV-0041', 'Grace Walker', [InvoiceLine('Yoga mat', 2, 17.92, StandardVat()), InvoiceLine('The Long Road (book)', 1, 8.99, ZeroRated())])\nresult = _i.summary()", { number: "INV-0041", customer: "Grace Walker", net: 44.83, tax: 7.17, gross: py.float(52), lines: [["Yoga mat", 35.84, 7.17], ["The Long Road (book)", 8.99, py.float(0)]] }, { show: "invoice.summary() for INV-0041" }),
          expr("new-rule", "A tax rule the invoice has never seen", "class _Reduced:\n    def tax(self, net):\n        return round(net * 0.05, 2)\n_i = Invoice('INV-0042', 'Nora Garcia', [InvoiceLine('Child car seat', 1, 120.0, _Reduced())])\nresult = [_i.tax(), _i.gross()]", [py.float(6), py.float(126)], { hidden: true }),
          expr("swap", "A line's rule replaced after the invoice was made", "_l = InvoiceLine('Desk lamp', 1, 48.0, StandardVat())\n_i = Invoice('INV-0043', 'Jamal Walker', [_l])\n_before = _i.tax()\n_l.tax_rule = ZeroRated()\nresult = [_before, _i.tax()]", [9.6, py.float(0)], { hidden: true }),
          expr("empty", "An invoice with no lines", "_i = Invoice('INV-0044', 'Theo Williams', [])\nresult = [_i.net(), _i.tax(), _i.gross(), _i.summary()['lines']]", [0, 0, 0, []], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-20 integration, medium
  {
    id: "PY-Q27-20",
    version: 2,
    slug: "notifier-with-fallback",
    title: "A notifier that falls back",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "break-statement", "class-def", "conversion", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "print-call", "print-text", "raise-stmt", "reassignment", "self-name", "string-format", "string-slice", "top-level-indent", "try-except", "type-call"],
    prompt: "Order updates go out by email, and by SMS when email is down. Write `Notifier(channels)`: it holds a list of channel objects in order of preference, each with `send(message)` that returns a receipt or raises `ConnectionError`. `notify(message)` tries the channels in order and returns the first receipt; every failure it skipped is kept in `failures` as `\"<channel class name>: <error message>\"`. If every channel fails, raise `DeliveryFailed` (your own exception) with all the failures in its message.",
    spec: [
      ["Class", "`Notifier(channels)` with attributes `channels` and `failures` (the failures of the latest `notify`)"],
      ["`notify(message)`", "returns the first receipt; resets `failures` at the start of each call"],
      ["Raises", "`DeliveryFailed` (a subclass of Exception) when no channel succeeds; other errors are not caught"],
    ],
    hiddenKinds: ["the first channel works", "every channel fails", "a channel with a bug (not a connection problem)", "a second call after a failure"],
    hints: [
      "Loop over the channels with a `try` around each `send`; return as soon as one works.",
      "In the `except ConnectionError as err` branch, record the channel's class name and the error, then carry on.",
      "After the loop, nothing worked: raise DeliveryFailed. Catch only ConnectionError, so real bugs still surface.",
    ],
    explanation: "The notifier doesn't know or care what kind of channel it holds: anything with `send` will do (composition plus polymorphism). Trying each in turn and recording why the earlier ones failed gives both reliability and a trail for whoever investigates later. Catching only `ConnectionError` matters: a channel with a genuine bug (a TypeError, say) should crash loudly, not be treated as \"email is down\".",
    code: {
      starter: src`
class EmailChannel:
    def __init__(self, working):
        self.working = working

    def send(self, message):
        if not self.working:
            raise ConnectionError("SMTP server not responding")
        return "email sent: " + message

class SmsChannel:
    def send(self, message):
        return "sms sent: " + message[:20]

class Notifier:
    pass

notifier = Notifier([EmailChannel(False), SmsChannel()])
print(notifier.notify("Order O100282 has shipped"))
print(notifier.failures)
`,
      answer: src`
class EmailChannel:
    def __init__(self, working):
        self.working = working

    def send(self, message):
        if not self.working:
            raise ConnectionError("SMTP server not responding")
        return "email sent: " + message

class SmsChannel:
    def send(self, message):
        return "sms sent: " + message[:20]

class DeliveryFailed(Exception):
    pass

class Notifier:
    def __init__(self, channels):
        self.channels = channels
        self.failures = []

    def notify(self, message):
        self.failures = []
        for channel in self.channels:
            try:
                return channel.send(message)
            except ConnectionError as err:
                self.failures.append(f"{type(channel).__name__}: {err}")
        raise DeliveryFailed("; ".join(self.failures))

notifier = Notifier([EmailChannel(False), SmsChannel()])
print(notifier.notify("Order O100282 has shipped"))
print(notifier.failures)
`,
      alternatives: [
        src`
class EmailChannel:
    def __init__(self, working):
        self.working = working

    def send(self, message):
        if not self.working:
            raise ConnectionError("SMTP server not responding")
        return "email sent: " + message

class SmsChannel:
    def send(self, message):
        return "sms sent: " + message[:20]

class DeliveryFailed(Exception):
    pass

class Notifier:
    def __init__(self, channels):
        self.channels = list(channels)
        self.failures = []

    def notify(self, message):
        failures = []
        receipt = None
        for channel in self.channels:
            try:
                receipt = channel.send(message)
                break
            except ConnectionError as err:
                failures.append(type(channel).__name__ + ": " + str(err))
        self.failures = failures
        if receipt is None:
            raise DeliveryFailed(", ".join(failures))
        return receipt
`,
      ],
      wrong: [
        {
          code: src`
class DeliveryFailed(Exception):
    pass

class Notifier:
    def __init__(self, channels):
        self.channels = channels
        self.failures = []

    def notify(self, message):
        for channel in self.channels:
            try:
                return channel.send(message)
            except ConnectionError as err:
                self.failures.append(f"{type(channel).__name__}: {err}")
        raise DeliveryFailed("; ".join(self.failures))
`,
          fails: ["again"],
          why: "`failures` is never reset, so a later call reports the failures of earlier calls as its own",
        },
        {
          code: src`
class DeliveryFailed(Exception):
    pass

class Notifier:
    def __init__(self, channels):
        self.channels = channels
        self.failures = []

    def notify(self, message):
        self.failures = []
        for channel in self.channels:
            try:
                return channel.send(message)
            except Exception as err:
                self.failures.append(f"{type(channel).__name__}: {err}")
        raise DeliveryFailed("; ".join(self.failures))
`,
          fails: ["bug-surfaces"],
          why: "catching every Exception treats a channel's bug as an outage, so the bug is hidden behind a fallback",
        },
      ],
      task: {
        checks: [
          expr("fallback", "Email down, SMS works", "class _Down:\n    def send(self, message):\n        raise ConnectionError('SMTP server not responding')\nclass _Sms:\n    def send(self, message):\n        return 'sms: ' + message\n_n = Notifier([_Down(), _Sms()])\nresult = [_n.notify('O100282 shipped'), _n.failures]", ["sms: O100282 shipped", ["_Down: SMTP server not responding"]], { show: "notify() with a failing email channel and a working SMS channel" }),
          expr("first", "The first channel works", "class _Ok:\n    def send(self, message):\n        return 'email: ' + message\nclass _Never:\n    def send(self, message):\n        raise AssertionError('should not be called')\n_n = Notifier([_Ok(), _Never()])\nresult = [_n.notify('hi'), _n.failures]", ["email: hi", []], { hidden: true }),
          expr("all-fail", "Every channel fails", "class _A:\n    def send(self, message):\n        raise ConnectionError('timeout')\nclass _B:\n    def send(self, message):\n        raise ConnectionError('no signal')\n_n = Notifier([_A(), _B()])\ntry:\n    _n.notify('x')\n    result = 'no error'\nexcept DeliveryFailed as _e:\n    result = [issubclass(DeliveryFailed, Exception), 'timeout' in str(_e) and 'no signal' in str(_e), len(_n.failures)]", [true, true, 2], { hidden: true }),
          raisesExpr("bug-surfaces", "A channel with a bug (not a connection problem)", "class _Buggy:\n    def send(self, message):\n        return message + 1\nclass _Sms:\n    def send(self, message):\n        return 'sms'\nNotifier([_Buggy(), _Sms()]).notify('x')", "TypeError", { hidden: true }),
          expr("again", "A second call after a failure", "class _Flaky:\n    def __init__(self):\n        self.calls = 0\n    def send(self, message):\n        self.calls += 1\n        if self.calls == 1:\n            raise ConnectionError('blip')\n        return 'ok'\nclass _Sms:\n    def send(self, message):\n        return 'sms'\n_n = Notifier([_Flaky(), _Sms()])\n_first = _n.notify('a')\n_second = _n.notify('b')\nresult = [_first, _second, _n.failures]", ["sms", "ok", []], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q27-22 output prediction, hard
  {
    id: "PY-Q27-22",
    version: 2,
    slug: "three-levels-of-super",
    title: "Three levels of super()",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "function-def", "function-param", "function-return", "init-method", "list-literal", "list-mutate", "method-def", "plain-class", "print-call", "self-name", "string-format", "subclass", "super-call", "top-level-indent"],
    prompt: "A clearance item is a sale item, which is a listing. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Follow `Clearance()`: its `__init__` sets `log`, then calls the parent's `__init__`, which calls *its* parent's.",
      "`Listing.__init__` assigns a brand-new list to `self.log`.",
      "`describe` calls `self.price()`: the most specific override runs, and each override builds on `super().price()`.",
    ],
    explanation: "Clearance sets `log` to `['Clearance']`, but then `super().__init__()` runs Sale's `__init__`, which runs Listing's, and Listing *assigns* a new list `['Listing']`, replacing the first; Sale then appends `'Sale'`. Setting attributes before calling `super().__init__` is a classic way to lose them. For the price, Clearance's override takes Sale's price (Listing's 100 × 0.8 = 80.0) and subtracts 30, giving 50.0. Sale alone gives 80.0; Listing alone gives its int 100.",
    predict: {
      program: src`
class Listing:
    def __init__(self):
        self.log = ["Listing"]

    def price(self):
        return 100

    def describe(self):
        return f"{type(self).__name__}: {self.price()}"

class Sale(Listing):
    def __init__(self):
        super().__init__()
        self.log.append("Sale")

    def price(self):
        return super().price() * 0.8

class Clearance(Sale):
    def __init__(self):
        self.log = ["Clearance"]
        super().__init__()

    def price(self):
        return super().price() - 30

item = Clearance()
print(item.log)
print(item.describe())
print(Sale().describe(), Listing().describe())
`,
      output: "['Listing', 'Sale']\nClearance: 50.0\nSale: 80.0 Listing: 100\n",
      wrongPredictions: [
        "['Clearance', 'Listing', 'Sale']\nClearance: 50.0\nSale: 80.0 Listing: 100",
        "['Listing', 'Sale']\nClearance: 70\nSale: 80.0 Listing: 100",
        "['Clearance']\nClearance: 50.0\nSale: 80.0 Listing: 100.0",
      ],
    },
  },
];
