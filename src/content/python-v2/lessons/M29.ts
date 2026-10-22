/**
 * M29 Advanced OOP & Design: five lessons (PY-L29-01 … PY-L29-05).
 *
 * Abstract base classes and the template-method pattern (L01); @runtime_checkable protocols, what isinstance can and
 * can't check, and ABC versus Protocol (L02); mixins, multiple inheritance, the MRO and cooperative super() (L03);
 * descriptors for reusable validated attributes, the machinery behind property (L04); dependency injection: passing
 * clocks, prices, storage and notifiers in, so code can be tested and changed (L05).
 *
 * Fixtures are Runtime Market (R01) payments, orders, products, carriers and invoices. Every failure mode runs for real:
 * instantiating an incomplete ABC, isinstance on a plain Protocol, an impossible MRO, a refused descriptor assignment,
 * and a hard-wired dependency on a file that isn't there.
 * Version 2: rewritten from five lessons about a HAT item and a passed-in price of 4.
 */
import type { PyLesson } from "../model";
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

export const m29Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L29-01 abstract base classes
  {
    id: "PY-L29-01",
    version: 2,
    slug: "an-abstract-item",
    title: "Abstract base classes",
    lede: "Some base classes exist only to be built on: every payment method must say what its fee is, but there is no fee for a payment method in general. An abstract base class states which methods subclasses must supply, and refuses to create objects until they do.",
    focus: "Define an abstract base class with @abstractmethod, implement it in subclasses, and use a concrete template method that calls the abstract ones.",
    minutes: 20,
    objectives: [
      "Write a base class that inherits from `ABC` and marks required methods with `@abstractmethod`",
      "Explain the TypeError raised when an abstract class, or a subclass missing a method, is instantiated",
      "Put shared logic in a concrete method that calls the abstract ones (the template method pattern)",
    ],
    requires: ["aggregate-call", "any-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "conversion", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-dict", "newline-escape", "plain-class", "precedence", "print-call", "print-text", "self-name", "string-format", "string-index", "string-method", "string-slice", "subclass", "top-level-indent", "try-except", "unquoted-name"],
    teaches: ["abstract-method"],
    blocks: [
      {
        kind: "text",
        md: "In the Inheritance & Composition module a payment method's subclasses each had a `fee` method, but nothing *required* it: a new subclass that forgot `fee` (or misspelt it) was only discovered when some code called it. An **abstract base class** turns the rule into code. Inherit from `ABC` (from the standard `abc` module) and mark each required method with `@abstractmethod`; its body can be just a docstring.\n\nPython then refuses to create an object of any class that still has abstract methods: the base class itself, and every subclass that hasn't implemented them all. The mistake surfaces when the object is created, with a message naming the missing method.\n\nThe base class can also hold **concrete** methods. A concrete `charge` that calls the abstract `fee` is the *template method* pattern: the base class fixes the steps, the subclasses fill in the parts that vary.",
      },
      {
        kind: "example",
        title: "Payment methods with a required fee",
        code: src`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    def __init__(self, label):
        self.label = label

    @abstractmethod
    def fee(self, amount):
        """The provider's fee for this amount."""

    def charge(self, amount):
        fee = self.fee(amount)
        return f"{self.label}: charge {amount:.2f} + fee {fee:.2f} = {amount + fee:.2f}"

class Card(PaymentMethod):
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer(PaymentMethod):
    def fee(self, amount):
        return 0.2

for method in [Card("Visa 4242"), BankTransfer("IBAN GB33")]:
    print(method.charge(40.0))
try:
    PaymentMethod("generic")
except TypeError as err:
    print(err)
`,
        output: "Visa 4242: charge 40.00 + fee 0.60 = 40.60\nIBAN GB33: charge 40.00 + fee 0.20 = 40.20\nCan't instantiate abstract class PaymentMethod without an implementation for abstract method 'fee'\n",
        note: "`charge` is written once, in the base class, and works for every subclass because each supplies `fee`. The base class itself can't be instantiated: a payment method in general has no fee.",
      },
      {
        kind: "error-example",
        title: "A subclass with the wrong method name",
        code: src`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    @abstractmethod
    def fee(self, amount):
        """The provider's fee for this amount."""

class Voucher(PaymentMethod):
    def fees(self, amount):
        return 0

print("classes defined")
voucher = Voucher()
`,
        error: "TypeError",
        output: "classes defined\n",
        note: "`fees` is a different method, so `fee` is still abstract and creating a Voucher fails at once: `TypeError: Can't instantiate abstract class Voucher without an implementation for abstract method 'fee'`. Without the ABC, the typo would have surfaced only when someone was charged.",
      },
      {
        kind: "example",
        title: "One render method, two formats",
        code: src`
from abc import ABC, abstractmethod

class Exporter(ABC):
    @abstractmethod
    def header(self, columns):
        """The first line(s) of the output."""

    @abstractmethod
    def row(self, values):
        """One record as a line of text."""

    def render(self, records):
        columns = list(records[0])
        lines = [self.header(columns)]
        for record in records:
            lines.append(self.row([str(record[c]) for c in columns]))
        return "\n".join(lines)

class CsvExporter(Exporter):
    def header(self, columns):
        return ",".join(columns)

    def row(self, values):
        return ",".join(values)

class MarkdownExporter(Exporter):
    def header(self, columns):
        return "| " + " | ".join(columns) + " |\n|" + "---|" * len(columns)

    def row(self, values):
        return "| " + " | ".join(values) + " |"

orders = [{"order_id": "O100282", "total": 35.84}, {"order_id": "O100918", "total": 55.72}]
print(CsvExporter().render(orders))
print(MarkdownExporter().render(orders))
`,
        output: "order_id,total\nO100282,35.84\nO100918,55.72\n| order_id | total |\n|---|---|\n| O100282 | 35.84 |\n| O100918 | 55.72 |\n",
        note: "The loop over records lives once in `render`. Each format only answers two small questions: what the header looks like and what one row looks like.",
      },
      {
        kind: "text",
        md: "**When to use it:** for a family of classes that must all provide the same methods, especially when the base class has shared logic that depends on them. **Mistakes to avoid:** forgetting `ABC` as the base (then `@abstractmethod` is not enforced); putting real work in an abstract method's body and expecting it to run; and making everything abstract, which leaves nothing to share. When unrelated classes only need to *look* alike, a Protocol (next lesson) is lighter.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Finish the gift card",
      prompt: "`GiftCard` is a payment method, but it doesn't implement the abstract `fee`, so it can't be created. Gift cards have no fee: implement `fee` so it returns 0, and `charge` will work.",
      spec: [
        ["Method", "`GiftCard(\"GC-2041\").fee(amount)` → 0; `charge(40.0)` then works"],
      ],
      starter: src`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    def __init__(self, label):
        self.label = label

    @abstractmethod
    def fee(self, amount):
        """The provider's fee for this amount."""

    def charge(self, amount):
        fee = self.fee(amount)
        return f"{self.label}: charge {amount:.2f} + fee {fee:.2f} = {amount + fee:.2f}"

class GiftCard(PaymentMethod):
    pass

print(GiftCard("GC-2041").charge(40.0))
`,
      answer: src`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    def __init__(self, label):
        self.label = label

    @abstractmethod
    def fee(self, amount):
        """The provider's fee for this amount."""

    def charge(self, amount):
        fee = self.fee(amount)
        return f"{self.label}: charge {amount:.2f} + fee {fee:.2f} = {amount + fee:.2f}"

class GiftCard(PaymentMethod):
    def fee(self, amount):
        return 0

print(GiftCard("GC-2041").charge(40.0))
`,
      wrong: [
        {
          code: src`
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    def __init__(self, label):
        self.label = label

    @abstractmethod
    def fee(self, amount):
        """The provider's fee for this amount."""

    def charge(self, amount):
        fee = self.fee(amount)
        return f"{self.label}: charge {amount:.2f} + fee {fee:.2f} = {amount + fee:.2f}"

class GiftCard(PaymentMethod):
    def charge(self, amount):
        return f"{self.label}: charge {amount:.2f}"
`,
          fails: ["charge"],
          why: "overriding `charge` doesn't help: `fee` is still abstract, so a GiftCard still can't be created",
        },
      ],
      hints: [
        "The error names the method that's missing.",
        "Replace `pass` with a method of that name, taking the same parameters as the abstract one.",
        "It returns 0.",
      ],
      task: {
        checks: [
          expr("charge", "A gift card can be charged", "result = GiftCard('GC-2041').charge(40.0)", "GC-2041: charge 40.00 + fee 0.00 = 40.00", { show: "GiftCard(\"GC-2041\").charge(40.0)" }),
          expr("still-abstract", "The base class stays abstract", "try:\n    PaymentMethod('x')\n    result = 'created'\nexcept TypeError:\n    result = 'refused'", "refused", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Discount rules with a shared apply",
        prompt: "Write an abstract base class `DiscountRule` with two abstract methods, `applies(order)` (True or False) and `amount(order)` (the discount), and a concrete `apply(order)` that returns `amount(order)` when the rule applies and 0 otherwise. Then write two rules: `FreeShippingOver(threshold)`, which takes off the order's shipping when its subtotal is at least the threshold, and `CategoryPercent(category, rate)`, which takes `rate` off the lines in one category.",
        spec: [
          ["Orders", "dictionaries: `{\"subtotal\": 62.0, \"shipping\": 3.5, \"lines\": [{\"category\": \"books\", \"amount\": 12.0}, …]}`"],
          ["`DiscountRule`", "an ABC; `applies` and `amount` abstract; `apply(order)` concrete, rounded to 2 places"],
          ["`FreeShippingOver(threshold)`", "applies when `subtotal >= threshold`; amount = the shipping"],
          ["`CategoryPercent(category, rate)`", "applies when a line has that category; amount = `rate ×` the sum of those lines"],
        ],
        starter: src`
from abc import ABC, abstractmethod

order = {"subtotal": 62.0, "shipping": 3.5, "lines": [{"category": "books", "amount": 12.0}, {"category": "sports", "amount": 50.0}]}
`,
        answer: src`
from abc import ABC, abstractmethod

class DiscountRule(ABC):
    @abstractmethod
    def applies(self, order):
        """Whether this rule gives a discount on the order."""

    @abstractmethod
    def amount(self, order):
        """The discount, assuming the rule applies."""

    def apply(self, order):
        if not self.applies(order):
            return 0
        return round(self.amount(order), 2)

class FreeShippingOver(DiscountRule):
    def __init__(self, threshold):
        self.threshold = threshold

    def applies(self, order):
        return order["subtotal"] >= self.threshold

    def amount(self, order):
        return order["shipping"]

class CategoryPercent(DiscountRule):
    def __init__(self, category, rate):
        self.category = category
        self.rate = rate

    def applies(self, order):
        return any(line["category"] == self.category for line in order["lines"])

    def amount(self, order):
        return self.rate * sum(line["amount"] for line in order["lines"] if line["category"] == self.category)

order = {"subtotal": 62.0, "shipping": 3.5, "lines": [{"category": "books", "amount": 12.0}, {"category": "sports", "amount": 50.0}]}
print(FreeShippingOver(50).apply(order), CategoryPercent("books", 0.1).apply(order))
`,
        alternatives: [
          src`
from abc import ABC, abstractmethod

class DiscountRule(ABC):
    @abstractmethod
    def applies(self, order):
        """True when the rule gives a discount."""

    @abstractmethod
    def amount(self, order):
        """How much the discount is."""

    def apply(self, order):
        return round(self.amount(order), 2) if self.applies(order) else 0

class FreeShippingOver(DiscountRule):
    def __init__(self, threshold):
        self.threshold = threshold

    def applies(self, order):
        return not order["subtotal"] < self.threshold

    def amount(self, order):
        return order["shipping"]

class CategoryPercent(DiscountRule):
    def __init__(self, category, rate):
        self.category = category
        self.rate = rate

    def matching(self, order):
        return [line["amount"] for line in order["lines"] if line["category"] == self.category]

    def applies(self, order):
        return len(self.matching(order)) > 0

    def amount(self, order):
        return sum(self.matching(order)) * self.rate
`,
        ],
        wrong: [
          {
            code: src`
class DiscountRule:
    def applies(self, order):
        return False

    def amount(self, order):
        return 0

    def apply(self, order):
        return round(self.amount(order), 2) if self.applies(order) else 0

class FreeShippingOver(DiscountRule):
    def __init__(self, threshold):
        self.threshold = threshold

    def applies(self, order):
        return order["subtotal"] >= self.threshold

    def amount(self, order):
        return order["shipping"]

class CategoryPercent(DiscountRule):
    def __init__(self, category, rate):
        self.category = category
        self.rate = rate

    def applies(self, order):
        return any(line["category"] == self.category for line in order["lines"])

    def amount(self, order):
        return self.rate * sum(l["amount"] for l in order["lines"] if l["category"] == self.category)
`,
            fails: ["abstract"],
            why: "without ABC and @abstractmethod, an incomplete rule is created happily and silently gives no discount",
          },
          {
            code: src`
from abc import ABC, abstractmethod

class DiscountRule(ABC):
    @abstractmethod
    def applies(self, order):
        """Whether this rule applies."""

    @abstractmethod
    def amount(self, order):
        """The discount."""

    def apply(self, order):
        return round(self.amount(order), 2)

class FreeShippingOver(DiscountRule):
    def __init__(self, threshold):
        self.threshold = threshold

    def applies(self, order):
        return order["subtotal"] >= self.threshold

    def amount(self, order):
        return order["shipping"]

class CategoryPercent(DiscountRule):
    def __init__(self, category, rate):
        self.category = category
        self.rate = rate

    def applies(self, order):
        return any(line["category"] == self.category for line in order["lines"])

    def amount(self, order):
        return self.rate * sum(l["amount"] for l in order["lines"] if l["category"] == self.category)
`,
            fails: ["not-applying"],
            why: "`apply` never asks `applies`, so free shipping is given on small orders too",
          },
        ],
        hints: [
          "The base class inherits from ABC; its two abstract methods have only docstrings; `apply` combines them.",
          "Each rule stores its settings in `__init__` and implements both abstract methods.",
          "For the category rule, add up the amounts of the matching lines; `any` tells whether there is at least one.",
        ],
        task: {
          checks: [
            expr("rules", "Both rules on one order", "_o = {'subtotal': 62.0, 'shipping': 3.5, 'lines': [{'category': 'books', 'amount': 12.0}, {'category': 'sports', 'amount': 50.0}]}\nresult = [FreeShippingOver(50).apply(_o), CategoryPercent('books', 0.1).apply(_o), CategoryPercent('sports', 0.25).apply(_o)]", [3.5, 1.2, 12.5], { show: "the two rules on a 62.00 order with books and sports" }),
            expr("not-applying", "Rules that don't apply give 0", "_o = {'subtotal': 30.0, 'shipping': 3.5, 'lines': [{'category': 'home', 'amount': 30.0}]}\nresult = [FreeShippingOver(50).apply(_o), CategoryPercent('books', 0.1).apply(_o)]", [0, 0], { show: "the rules on a 30.00 home order" }),
            expr("abstract", "The base class can't be created", "try:\n    DiscountRule()\n    result = 'created'\nexcept TypeError:\n    result = 'refused'", "refused", { hidden: true }),
            expr("edge", "A subtotal exactly at the threshold", "result = FreeShippingOver(50).apply({'subtotal': 50.0, 'shipping': 4.99, 'lines': []})", 4.99, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Reports from one template",
        prompt: "Every report the shop prints has the same layout: a title, a line of `=` as long as the title, one line per row as `label: value`, and a final `total: <sum>`. Write an abstract `Report` with an abstract `title()` and an abstract `rows()` (a list of `(label, value)` pairs), and a concrete `render()` that builds the text. Then write `RevenueByChannel(orders)`, whose rows are the total order value per channel, channels in first-seen order.",
        spec: [
          ["`Report`", "ABC; abstract `title()` and `rows()`; concrete `render()` returns the lines joined with `\\n`"],
          ["Layout", "`title`, `=` × len(title), `label: value` per row, `total: <sum of values>`; values rounded to 2 places"],
          ["`RevenueByChannel(orders)`", "orders are `{\"channel\": …, \"total\": …}`; title `\"Revenue by channel\"`"],
        ],
        starter: src`
from abc import ABC, abstractmethod

orders = [{"channel": "web", "total": 35.5}, {"channel": "app", "total": 64.25}, {"channel": "web", "total": 22.25}]
`,
        answer: src`
from abc import ABC, abstractmethod

class Report(ABC):
    @abstractmethod
    def title(self):
        """The report's heading."""

    @abstractmethod
    def rows(self):
        """A list of (label, value) pairs."""

    def render(self):
        heading = self.title()
        lines = [heading, "=" * len(heading)]
        total = 0
        for label, value in self.rows():
            lines.append(f"{label}: {round(value, 2)}")
            total += value
        lines.append(f"total: {round(total, 2)}")
        return "\n".join(lines)

class RevenueByChannel(Report):
    def __init__(self, orders):
        self.orders = orders

    def title(self):
        return "Revenue by channel"

    def rows(self):
        totals = {}
        for order in self.orders:
            totals[order["channel"]] = totals.get(order["channel"], 0) + order["total"]
        return list(totals.items())

orders = [{"channel": "web", "total": 35.5}, {"channel": "app", "total": 64.25}, {"channel": "web", "total": 22.25}]
print(RevenueByChannel(orders).render())
`,
        alternatives: [
          src`
from abc import ABC, abstractmethod

class Report(ABC):
    @abstractmethod
    def title(self):
        """Heading text."""

    @abstractmethod
    def rows(self):
        """(label, value) pairs."""

    def render(self):
        rows = self.rows()
        text = self.title() + "\n" + "=" * len(self.title())
        for label, value in rows:
            text += "\n" + label + ": " + str(round(value, 2))
        text += "\ntotal: " + str(round(sum(value for label, value in rows), 2))
        return text

class RevenueByChannel(Report):
    def __init__(self, orders):
        self.orders = orders

    def title(self):
        return "Revenue by channel"

    def rows(self):
        channels = []
        for order in self.orders:
            if order["channel"] not in channels:
                channels.append(order["channel"])
        return [(c, sum(o["total"] for o in self.orders if o["channel"] == c)) for c in channels]
`,
        ],
        wrong: [
          {
            code: src`
from abc import ABC, abstractmethod

class Report(ABC):
    @abstractmethod
    def title(self):
        """Heading."""

    @abstractmethod
    def rows(self):
        """Pairs."""

    def render(self):
        lines = [self.title(), "=" * 20]
        total = 0
        for label, value in self.rows():
            lines.append(f"{label}: {round(value, 2)}")
            total += value
        lines.append(f"total: {round(total, 2)}")
        return "\n".join(lines)

class RevenueByChannel(Report):
    def __init__(self, orders):
        self.orders = orders

    def title(self):
        return "Revenue by channel"

    def rows(self):
        totals = {}
        for order in self.orders:
            totals[order["channel"]] = totals.get(order["channel"], 0) + order["total"]
        return list(totals.items())
`,
            fails: ["empty", "other-report", "render"],
            why: "the underline has a fixed length instead of matching the title",
          },
          {
            code: src`
from abc import ABC, abstractmethod

class Report(ABC):
    @abstractmethod
    def title(self):
        """Heading."""

    @abstractmethod
    def rows(self):
        """Pairs."""

    def render(self):
        heading = self.title()
        lines = [heading, "=" * len(heading)]
        for label, value in self.rows():
            lines.append(f"{label}: {round(value, 2)}")
        return "\n".join(lines)

class RevenueByChannel(Report):
    def __init__(self, orders):
        self.orders = orders

    def title(self):
        return "Revenue by channel"

    def rows(self):
        totals = {}
        for order in self.orders:
            totals[order["channel"]] = totals.get(order["channel"], 0) + order["total"]
        return list(totals.items())
`,
            fails: ["render", "other-report", "empty"],
            why: "the total line is missing from the shared layout",
          },
        ],
        hints: [
          "`render` calls `self.title()` and `self.rows()`; it never needs to know which report it is rendering.",
          "Collect the lines in a list, keeping a running total of the values as you go.",
          "In `RevenueByChannel.rows`, add up the totals per channel in a dictionary, then return its items.",
        ],
        task: {
          checks: [
            expr("render", "The revenue report", "result = RevenueByChannel([{'channel': 'web', 'total': 35.5}, {'channel': 'app', 'total': 64.25}, {'channel': 'web', 'total': 22.25}]).render()", "Revenue by channel\n==================\nweb: 57.75\napp: 64.25\ntotal: 122.0", { show: "RevenueByChannel(orders).render()" }),
            expr("other-report", "Another report uses the same template", "class _Stock(Report):\n    def title(self):\n        return 'Stock'\n    def rows(self):\n        return [('SPO-11681', 12), ('HOM-22847', 3)]\nresult = _Stock().render()", "Stock\n=====\nSPO-11681: 12\nHOM-22847: 3\ntotal: 15", { hidden: true }),
            expr("abstract", "Report itself can't be created", "try:\n    Report()\n    result = 'created'\nexcept TypeError:\n    result = 'refused'", "refused", { hidden: true }),
            expr("empty", "A report with no rows", "result = RevenueByChannel([]).render()", "Revenue by channel\n==================\ntotal: 0", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from abc import ABC, abstractmethod

class Notifier(ABC):
    @abstractmethod
    def send(self, message):
        """Deliver the message."""

    def notify_all(self, messages):
        return [self.send(m) for m in messages]

class Sms(Notifier):
    def send(self, message):
        return message[:10]

class Draft(Notifier):
    def preview(self, message):
        return message

made = []
for cls in [Sms, Draft]:
    try:
        made.append(cls().notify_all(["Order O100282 shipped"]))
    except TypeError:
        made.append(cls.__name__ + " refused")
print(made)
`,
        choices: ["[['Order O100'], 'Draft refused']", "[['Order O100282 shipped'], 'Draft refused']", "[['Order O100'], ['Order O100282 shipped']]", "['Sms refused', 'Draft refused']"],
        answer: 0,
        why: "Sms implements `send`, so `notify_all` (inherited, concrete) works and cuts each message to 10 characters. Draft doesn't implement `send`, so creating it raises TypeError before anything is sent.",
      },
      {
        id: "q2",
        prompt: "A common mistake: @abstractmethod without ABC. What does this print?",
        program: src`
from abc import abstractmethod

class Exporter:
    @abstractmethod
    def render(self, records):
        """Turn records into text."""

class Lazy(Exporter):
    pass

print(Lazy().render([1, 2]))
`,
        choices: ["None", "TypeError: Can't instantiate abstract class Lazy", "[1, 2]", "AttributeError"],
        answer: 0,
        why: "`@abstractmethod` is only enforced for classes built on `ABC`. Here the base is an ordinary class, so Lazy is created and calls the inherited `render`, whose body is just a docstring: it returns None.",
      },
      {
        id: "q3",
        prompt: "When is an abstract base class the right tool?",
        choices: [
          "A family of related classes must each supply certain methods, and the base class shares logic that uses them",
          "Two unrelated library classes happen to have a method with the same name",
          "A class needs a list of items",
          "You want to stop anyone from creating subclasses",
        ],
        answer: 0,
        why: "ABCs suit an is-a family with shared, template-style logic. Unrelated classes that merely look alike are described with a Protocol; ABCs don't prevent subclassing, they require it.",
      },
    ],
    review: [
      "Inherit from `ABC` and mark required methods with `@abstractmethod`.",
      "A class with any unimplemented abstract method can't be instantiated: mistakes surface when objects are created.",
      "Concrete methods in the base class can call the abstract ones: the template method pattern.",
      "Next: checking at run time whether any object fits a Protocol.",
    ],
  },

  // ------------------------------------------------------------------ PY-L29-02 runtime protocols
  {
    id: "PY-L29-02",
    version: 2,
    slug: "a-checked-protocol",
    title: "Protocols you can check at run time",
    lede: "A Protocol describes methods; @runtime_checkable lets isinstance ask whether an object has them. It checks that the methods exist, not that they take the right arguments, which matters when you rely on it.",
    focus: "Make a Protocol runtime-checkable, use isinstance to detect what an object can do, and know the limits of that check.",
    minutes: 18,
    objectives: [
      "Add `@runtime_checkable` to a Protocol and test objects with `isinstance`",
      "Explain what the check verifies (the methods exist) and what it doesn't (their parameters and results)",
      "Choose between an ABC (an is-a family) and a Protocol (anything with the right methods)",
    ],
    requires: ["arithmetic", "assignment", "boolean", "class-def", "comp-if", "conversion", "dict-iterate", "dict-literal", "else-clause", "exc-name", "except-type", "field-ann", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "newline-escape", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "protocol-base", "raise-stmt", "return-hint", "self-name", "string-format", "string-index", "subclass", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call"],
    teaches: ["runtime-protocol"],
    blocks: [
      {
        kind: "text",
        md: "The Data Models & Typing module's Protocols were descriptions for readers and type checkers; `isinstance(obj, SomeProtocol)` raises TypeError. Put `@runtime_checkable` (from `typing`) above the Protocol and `isinstance` works: it is True when the object has every method the protocol lists, whatever its class and parents.\n\nThat makes it useful for **capability checks**: code that accepts plug-ins, or objects from several libraries, can ask *can this object quote a delivery price?* before using it.",
      },
      {
        kind: "example",
        title: "Which objects can quote shipping?",
        code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Carrier(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price to ship this weight."""

class RoyalPost:
    def quote(self, weight_kg: float) -> float:
        return 4.2

class FastFreight:
    def quote(self, weight_kg: float) -> float:
        return round(2.0 + 0.8 * weight_kg, 2)

class Warehouse:
    def stock(self, sku: str) -> int:
        return 12

for thing in [RoyalPost(), FastFreight(), Warehouse(), "RoyalPost"]:
    print(type(thing).__name__, isinstance(thing, Carrier))
`,
        output: "RoyalPost True\nFastFreight True\nWarehouse False\nstr False\n",
        note: "Neither carrier inherits from `Carrier`; having `quote` is enough. The warehouse and the text don't have it.",
      },
      {
        kind: "error-example",
        title: "isinstance on a plain Protocol",
        code: src`
from typing import Protocol

class Carrier(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price to ship this weight."""

class RoyalPost:
    def quote(self, weight_kg: float) -> float:
        return 4.2

print("checking")
print(isinstance(RoyalPost(), Carrier))
`,
        error: "TypeError",
        output: "checking\n",
        note: "Without the decorator, Python refuses: `TypeError: Instance and class checks can only be used with @runtime_checkable protocols`.",
      },
      {
        kind: "text",
        md: "The check has a limit worth knowing: it only looks for **names**. A `render` method that takes the wrong arguments, or returns the wrong type, still passes; so would an attribute that merely has the right name. The check tells you the object is *worth trying*, not that it will work. Combine it with error handling, or with a type checker that compares signatures before the program runs.",
      },
      {
        kind: "example",
        title: "Loading export plug-ins",
        code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Exporter(Protocol):
    def render(self, records: list[dict]) -> str:
        """Turn records into text."""

class CsvExporter:
    def render(self, records: list[dict]) -> str:
        return "\n".join(",".join(str(v) for v in r.values()) for r in records)

class BrokenExporter:
    def render(self) -> str:
        return "nothing"

class Notes:
    text = "remember to export"

def load_plugins(candidates):
    accepted, rejected = [], []
    for plugin in candidates:
        if isinstance(plugin, Exporter):
            accepted.append(type(plugin).__name__)
        else:
            rejected.append(type(plugin).__name__)
    return accepted, rejected

print(load_plugins([CsvExporter(), BrokenExporter(), Notes()]))
try:
    BrokenExporter().render([{"a": 1}])
except TypeError as err:
    print("TypeError:", err)
`,
        output: "(['CsvExporter', 'BrokenExporter'], ['Notes'])\nTypeError: BrokenExporter.render() takes 1 positional argument but 2 were given\n",
        note: "`BrokenExporter` has a `render`, so it passes the check, and only fails when it is used. `Notes` has no `render` and is rejected.",
      },
      {
        kind: "text",
        md: "**ABC or Protocol?** An ABC is *nominal*: an object belongs only if its class inherits from the ABC, and the base can share code. A Protocol is *structural*: anything with the methods belongs, including classes you don't control. Use an ABC for your own family of classes with shared logic; use a Protocol to describe what a function needs from whatever it is given.\n\n**Mistakes to avoid:** treating `isinstance(x, SomeProtocol)` as proof the methods behave correctly; long protocols that few objects satisfy; and run-time checks everywhere where plain duck typing (just call the method) would do.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Make the check possible",
      prompt: "`can_ship` uses `isinstance` with the `Carrier` protocol and crashes with TypeError. Make the protocol checkable at run time.",
      spec: [
        ["Change", "`Carrier` can be used with `isinstance`; `can_ship` then returns True or False"],
      ],
      starter: src`
from typing import Protocol, runtime_checkable

class Carrier(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price to ship this weight."""

class RoyalPost:
    def quote(self, weight_kg: float) -> float:
        return 4.2

def can_ship(thing):
    return isinstance(thing, Carrier)

print(can_ship(RoyalPost()), can_ship("RoyalPost"))
`,
      answer: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Carrier(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price to ship this weight."""

class RoyalPost:
    def quote(self, weight_kg: float) -> float:
        return 4.2

def can_ship(thing):
    return isinstance(thing, Carrier)

print(can_ship(RoyalPost()), can_ship("RoyalPost"))
`,
      wrong: [
        {
          code: src`
from typing import Protocol, runtime_checkable

class Carrier(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price to ship this weight."""

def can_ship(thing):
    try:
        return isinstance(thing, Carrier)
    except TypeError:
        return False
`,
          fails: ["checks"],
          why: "hiding the TypeError makes every object look like it can't ship",
        },
      ],
      hints: [
        "The error message says which decorator the protocol needs.",
        "It is already imported.",
        "It goes on the line above the class.",
      ],
      task: {
        checks: [
          expr("checks", "Carriers and non-carriers", "class _Freight:\n    def quote(self, weight_kg):\n        return 9.0\nresult = [can_ship(_Freight()), can_ship('x'), can_ship(42)]", [true, false, false], { show: "can_ship(<a class with quote>), can_ship(\"x\"), can_ship(42)" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Sort out the plug-ins",
        prompt: "A shop loads payment plug-ins written by different teams. A usable plug-in has **both** `authorize(amount)` and `capture(reference)`. Write a runtime-checkable Protocol `PaymentPlugin` with those two methods, and `split_plugins(objects)` returning two lists of class names: the usable plug-ins and the rest, each in the order given.",
        spec: [
          ["Protocol", "`@runtime_checkable class PaymentPlugin(Protocol)` with `authorize(self, amount: float) -> str` and `capture(self, reference: str) -> bool`"],
          ["Function", "`split_plugins(objects)` → `(usable, rejected)`, lists of `type(obj).__name__`"],
        ],
        starter: src`
from typing import Protocol, runtime_checkable

class StripeLike:
    def authorize(self, amount: float) -> str:
        return "auth_1"

    def capture(self, reference: str) -> bool:
        return True

class HalfDone:
    def authorize(self, amount: float) -> str:
        return "auth_2"

def split_plugins(objects):
    return [], []

print(split_plugins([StripeLike(), HalfDone(), "paypal"]))
`,
        answer: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class PaymentPlugin(Protocol):
    def authorize(self, amount: float) -> str:
        """Reserve the amount; return a reference."""

    def capture(self, reference: str) -> bool:
        """Take the reserved money."""

class StripeLike:
    def authorize(self, amount: float) -> str:
        return "auth_1"

    def capture(self, reference: str) -> bool:
        return True

class HalfDone:
    def authorize(self, amount: float) -> str:
        return "auth_2"

def split_plugins(objects):
    usable, rejected = [], []
    for obj in objects:
        if isinstance(obj, PaymentPlugin):
            usable.append(type(obj).__name__)
        else:
            rejected.append(type(obj).__name__)
    return usable, rejected

print(split_plugins([StripeLike(), HalfDone(), "paypal"]))
`,
        alternatives: [
          src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class PaymentPlugin(Protocol):
    def authorize(self, amount: float) -> str:
        """Reserve the money."""

    def capture(self, reference: str) -> bool:
        """Collect it."""

def split_plugins(objects):
    names = [(type(o).__name__, isinstance(o, PaymentPlugin)) for o in objects]
    return [n for n, ok in names if ok], [n for n, ok in names if not ok]
`,
        ],
        wrong: [
          {
            code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class PaymentPlugin(Protocol):
    def authorize(self, amount: float) -> str:
        """Reserve the money."""

def split_plugins(objects):
    usable, rejected = [], []
    for obj in objects:
        if isinstance(obj, PaymentPlugin):
            usable.append(type(obj).__name__)
        else:
            rejected.append(type(obj).__name__)
    return usable, rejected
`,
            fails: ["split", "protocol"],
            why: "the protocol lists only `authorize`, so a plug-in that can't capture is accepted",
          },
          {
            code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class PaymentPlugin(Protocol):
    def authorize(self, amount: float) -> str:
        """Reserve the money."""

    def capture(self, reference: str) -> bool:
        """Collect it."""

def split_plugins(objects):
    usable, rejected = [], []
    for obj in objects:
        if type(obj).__name__.endswith("Plugin"):
            usable.append(type(obj).__name__)
        else:
            rejected.append(type(obj).__name__)
    return usable, rejected
`,
            fails: ["split"],
            why: "judging by the class name instead of by the methods rejects good plug-ins and accepts badly named ones",
          },
        ],
        hints: [
          "The protocol lists both methods, each with only a docstring as its body.",
          "`isinstance(obj, PaymentPlugin)` is True only when both methods are present.",
          "Collect `type(obj).__name__` into one of two lists.",
        ],
        task: {
          checks: [
            expr("split", "Usable and rejected plug-ins", "class _Full:\n    def authorize(self, amount):\n        return 'a'\n    def capture(self, reference):\n        return True\nclass _OnlyAuth:\n    def authorize(self, amount):\n        return 'a'\nclass _BadPlugin:\n    def refund(self):\n        return None\nresult = split_plugins([_Full(), _OnlyAuth(), 'paypal', _BadPlugin(), _Full()])", py.tuple(py.list(py.str("_Full"), py.str("_Full")), py.list(py.str("_OnlyAuth"), py.str("str"), py.str("_BadPlugin"))), { show: "split_plugins([<full>, <authorize only>, \"paypal\", <refund only>, <full>])" }),
            expr("protocol", "The protocol needs both methods", "class _Cap:\n    def capture(self, reference):\n        return True\nresult = [isinstance(_Cap(), PaymentPlugin), sorted(m for m in ['authorize', 'capture'] if m in vars(PaymentPlugin))]", [false, ["authorize", "capture"]], { hidden: true }),
            expr("empty", "No objects", "result = split_plugins([])", py.tuple(py.list(), py.list()), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Write in batches when you can",
        prompt: "Export targets come in two kinds. Some can take many rows at once with `write_rows(rows)`; simpler ones only have `write(text)`. Write two runtime-checkable Protocols, `BatchTarget` and `StreamTarget`, and `export(rows, target)`: use `write_rows` once if the target supports it; otherwise call `write` once per row with the row's values joined by `,` and a final `\\n`; otherwise raise `TypeError`. Return `\"batch\"` or `\"stream\"` to say which path was used.",
        spec: [
          ["Protocols", "`BatchTarget` with `write_rows(self, rows: list[dict]) -> None`; `StreamTarget` with `write(self, text: str) -> int`"],
          ["`export(rows, target)`", "batch if available, else stream, else `TypeError`; returns `\"batch\"` or `\"stream\"`"],
          ["Rule", "a target with both methods uses the batch path"],
        ],
        starter: src`
import io
from typing import Protocol, runtime_checkable

def export(rows, target):
    return "stream"

buffer = io.StringIO()
print(export([{"sku": "SPO-11681", "qty": 2}], buffer), repr(buffer.getvalue()))
`,
        answer: src`
import io
from typing import Protocol, runtime_checkable

@runtime_checkable
class BatchTarget(Protocol):
    def write_rows(self, rows: list[dict]) -> None:
        """Write many rows in one call."""

@runtime_checkable
class StreamTarget(Protocol):
    def write(self, text: str) -> int:
        """Write some text."""

def export(rows, target):
    if isinstance(target, BatchTarget):
        target.write_rows(rows)
        return "batch"
    if isinstance(target, StreamTarget):
        for row in rows:
            target.write(",".join(str(value) for value in row.values()) + "\n")
        return "stream"
    raise TypeError(f"can't export to a {type(target).__name__}")

buffer = io.StringIO()
print(export([{"sku": "SPO-11681", "qty": 2}], buffer), repr(buffer.getvalue()))
`,
        alternatives: [
          src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class BatchTarget(Protocol):
    def write_rows(self, rows: list[dict]) -> None:
        """Many rows at once."""

@runtime_checkable
class StreamTarget(Protocol):
    def write(self, text: str) -> int:
        """Text, piece by piece."""

def export(rows, target):
    batch = isinstance(target, BatchTarget)
    if not batch and not isinstance(target, StreamTarget):
        raise TypeError("unsupported target")
    if batch:
        target.write_rows(rows)
        return "batch"
    for row in rows:
        values = [str(v) for v in row.values()]
        target.write(",".join(values) + "\n")
    return "stream"
`,
        ],
        wrong: [
          {
            code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class BatchTarget(Protocol):
    def write_rows(self, rows: list[dict]) -> None:
        """Many rows."""

@runtime_checkable
class StreamTarget(Protocol):
    def write(self, text: str) -> int:
        """Text."""

def export(rows, target):
    if isinstance(target, StreamTarget):
        for row in rows:
            target.write(",".join(str(v) for v in row.values()) + "\n")
        return "stream"
    if isinstance(target, BatchTarget):
        target.write_rows(rows)
        return "batch"
    raise TypeError("unsupported target")
`,
            fails: ["both"],
            why: "checking the stream protocol first means a target that can do both is written row by row",
          },
          {
            code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class BatchTarget(Protocol):
    def write_rows(self, rows: list[dict]) -> None:
        """Many rows."""

@runtime_checkable
class StreamTarget(Protocol):
    def write(self, text: str) -> int:
        """Text."""

def export(rows, target):
    if isinstance(target, BatchTarget):
        target.write_rows(rows)
        return "batch"
    for row in rows:
        target.write(",".join(str(v) for v in row.values()) + "\n")
    return "stream"
`,
            fails: ["unsupported"],
            why: "an unsupported target fails later with AttributeError instead of a clear TypeError up front",
          },
        ],
        hints: [
          "Two small protocols, one method each, both runtime-checkable.",
          "Check the batch protocol first; only if it fails, check the stream protocol.",
          "If neither matches, raise TypeError naming the target's class.",
        ],
        task: {
          checks: [
            expr("stream", "An io.StringIO target", "import io as _io\n_b = _io.StringIO()\nresult = [export([{'sku': 'SPO-11681', 'qty': 2}, {'sku': 'HOM-22847', 'qty': 1}], _b), _b.getvalue()]", ["stream", "SPO-11681,2\nHOM-22847,1\n"], { show: "export(rows, io.StringIO())" }),
            expr("batch", "A target that takes rows in batches", "class _Db:\n    def __init__(self):\n        self.calls = []\n    def write_rows(self, rows):\n        self.calls.append(len(rows))\n_d = _Db()\nresult = [export([{'a': 1}, {'a': 2}, {'a': 3}], _d), _d.calls]", ["batch", [3]], { show: "export(three rows, <a target with write_rows>)" }),
            expr("both", "A target with both methods", "class _Both:\n    def __init__(self):\n        self.used = []\n    def write_rows(self, rows):\n        self.used.append('rows')\n    def write(self, text):\n        self.used.append('text')\n        return len(text)\n_t = _Both()\nresult = [export([{'a': 1}, {'a': 2}], _t), _t.used]", ["batch", ["rows"]], { hidden: true }),
            raisesExpr("unsupported", "A target with neither method", "export([{'a': 1}], 42)", "TypeError", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Sized(Protocol):
    def size(self) -> int:
        """How many items."""

class Basket:
    def size(self):
        return 3

class Label:
    size = "XL"

class Crate:
    def size(self, unit):
        return 12

print([isinstance(x, Sized) for x in [Basket(), Label(), Crate(), [1, 2]]])
`,
        choices: ["[True, True, True, False]", "[True, False, False, False]", "[True, False, True, False]", "[True, False, True, True]"],
        answer: 0,
        why: "The run-time check only looks for a member called `size`. Label's text attribute and Crate's method with an extra parameter both pass. A list has `len()` support but no `size`, so it fails.",
      },
      {
        id: "q2",
        prompt: "A common mistake: trusting the check. What does this print?",
        program: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Quoter(Protocol):
    def quote(self, weight_kg: float) -> float:
        """Price for the weight."""

class TextQuote:
    def quote(self, weight_kg):
        return "about four pounds"

carrier = TextQuote()
if isinstance(carrier, Quoter):
    try:
        print(carrier.quote(2.0) + 1.5)
    except TypeError:
        print("TypeError")
`,
        choices: ["TypeError", "5.5", "about four pounds1.5", "(nothing)"],
        answer: 0,
        why: "TextQuote has a `quote`, so the isinstance check passes, but it returns text, and adding a number to text fails. The check verifies names, not return types.",
      },
      {
        id: "q3",
        prompt: "A function must accept file objects, io.StringIO and your own writer classes, as long as they have `write`. What describes that parameter best?",
        choices: ["A Protocol with write (runtime-checkable if you need isinstance)", "An ABC that every writer must inherit from", "A subclass of io.StringIO", "A TypedDict"],
        answer: 0,
        why: "You can't make built-in or third-party classes inherit from your ABC, but they already satisfy a structural Protocol.",
      },
    ],
    review: [
      "`@runtime_checkable` lets `isinstance` test a Protocol: True when every listed method name exists.",
      "The check doesn't verify parameters or results; treat it as \"worth trying\".",
      "ABC: nominal family with shared code. Protocol: anything with the right methods.",
      "Next: small classes that add one behaviour each, combined with multiple inheritance.",
    ],
  },

  // ------------------------------------------------------------------ PY-L29-03 mixins and the MRO
  {
    id: "PY-L29-03",
    version: 2,
    slug: "mixins-and-mro",
    title: "Mixins and the method resolution order",
    lede: "A mixin is a small class that adds one behaviour, such as converting to a dictionary, to any class that lists it as a parent. With several parents, Python looks methods up in a fixed order, the MRO, and super() follows it.",
    focus: "Add behaviour with mixins, read a class's MRO, and write mixin methods that cooperate through super().",
    minutes: 20,
    objectives: [
      "Write a mixin that adds a method to unrelated classes",
      "Read `Class.__mro__` to see the order in which Python looks up methods",
      "Chain mixin methods with `super()` so every class in the MRO takes part",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conditional-expr", "conversion", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "json-dumps", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "map-call", "membership", "method-def", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "spaces-in-text", "string-index", "string-method", "string-split", "subclass", "super-call", "top-level-indent", "tuple-unpack", "type-call"],
    teaches: ["mixin-class"],
    blocks: [
      {
        kind: "text",
        md: "Customers, products and orders all need to become dictionaries (for JSON) but have nothing else in common, so a shared parent class would be wrong. A **mixin** is a small class with one capability and no `__init__` of its own; a class gains the capability by listing the mixin among its parents: `class Customer(ToDictMixin, JsonMixin):`. By convention its name ends in `Mixin`.\n\nWith several parents, Python needs an order for looking up methods: the **method resolution order** (MRO), visible as `Class.__mro__`. Roughly: the class itself, then its parents left to right, with each class appearing before its own parents.",
      },
      {
        kind: "example",
        title: "to_dict and to_json for any class",
        code: src`
import json

class ToDictMixin:
    def to_dict(self):
        return dict(vars(self))

class JsonMixin:
    def to_json(self):
        return json.dumps(self.to_dict(), sort_keys=True)

class Customer(ToDictMixin, JsonMixin):
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

class Product(ToDictMixin, JsonMixin):
    def __init__(self, sku, price):
        self.sku = sku
        self.price = price

print(Customer("C00077", "Jamal Walker", "Houston").to_dict())
print(Product("SPO-11681", 31.0).to_json())
print([cls.__name__ for cls in Product.__mro__])
`,
        output: "{'customer_id': 'C00077', 'name': 'Jamal Walker', 'city': 'Houston'}\n{\"price\": 31.0, \"sku\": \"SPO-11681\"}\n['Product', 'ToDictMixin', 'JsonMixin', 'object']\n",
        note: "`vars(self)` is the object's own attributes as a dictionary. `JsonMixin` relies on `to_dict` coming from somewhere else in the class: mixins are designed to be combined.",
      },
      {
        kind: "text",
        md: "When several classes in the MRO define the same method and each calls `super().save(...)`, `super()` doesn't mean \"my parent\": it means **the next class in the MRO of the object's class**. So every mixin runs its part and passes on, and the chain ends at the real implementation. This is called *cooperative* multiple inheritance, and the order of the bases decides the order of the steps.",
      },
      {
        kind: "example",
        title: "Saving through two mixins",
        code: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class TimestampMixin:
    def save(self, record):
        record = dict(record, saved_at="2026-10-20T09:00:00Z")
        return super().save(record)

class AuditMixin:
    def save(self, record):
        print("audit: saving", record["order_id"], sorted(record))
        return super().save(record)

class OrderRepository(AuditMixin, TimestampMixin, Repository):
    pass

repo = OrderRepository()
repo.save({"order_id": "O100282", "total": 35.84})
print([cls.__name__ for cls in OrderRepository.__mro__])
print(repo.saved)
`,
        output: "audit: saving O100282 ['order_id', 'total']\n['OrderRepository', 'AuditMixin', 'TimestampMixin', 'Repository', 'object']\n[{'order_id': 'O100282', 'total': 35.84, 'saved_at': '2026-10-20T09:00:00Z'}]\n",
        note: "AuditMixin comes first, so it logs the record before the timestamp is added; its `super()` is TimestampMixin (not `object`), whose `super()` is Repository. Swap the two mixins in the class line and the audit line would include `saved_at`. The fixed timestamp keeps the output stable; real code would read a clock (see Advanced OOP & Design).",
      },
      {
        kind: "error-example",
        title: "An order Python can't satisfy",
        code: src`
class Repository:
    def save(self, record):
        return record

class AuditMixin(Repository):
    def save(self, record):
        print("audit")
        return super().save(record)

print("defining")
class OrderRepository(Repository, AuditMixin):
    pass
`,
        error: "TypeError",
        output: "defining\n",
        note: "Listing Repository before its own subclass asks for Repository to come both before and after AuditMixin: `TypeError: Cannot create a consistent method resolution order (MRO) for bases Repository, AuditMixin`. Mixins go first, the main base class last.",
      },
      {
        kind: "text",
        md: "**When to use it:** for small, independent capabilities shared by unrelated classes (serialising, comparing, logging). **Mistakes to avoid:** mixins with their own state and `__init__` (they become hard to combine); a mixin method that overrides without calling `super()`, which silently cuts the chain; putting the main base class before the mixins; and deep webs of mixins nobody can follow (composition, the Inheritance & Composition module, is often clearer).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Give orders to_dict too",
      prompt: "`Order` needs a `to_dict()` method like the other classes. Don't write a new method: add the existing `ToDictMixin` to its bases.",
      spec: [
        ["Change", "`Order(\"O100282\", 35.84).to_dict()` → `{'order_id': 'O100282', 'total': 35.84}`"],
      ],
      starter: src`
class ToDictMixin:
    def to_dict(self):
        return dict(vars(self))

class Order:
    def __init__(self, order_id, total):
        self.order_id = order_id
        self.total = total

print(Order("O100282", 35.84).order_id)
`,
      answer: src`
class ToDictMixin:
    def to_dict(self):
        return dict(vars(self))

class Order(ToDictMixin):
    def __init__(self, order_id, total):
        self.order_id = order_id
        self.total = total

print(Order("O100282", 35.84).to_dict())
`,
      wrong: [
        {
          code: src`
class ToDictMixin:
    def to_dict(self):
        return dict(vars(self))

class Order:
    def __init__(self, order_id, total):
        self.order_id = order_id
        self.total = total

    def to_dict(self):
        return {"order_id": self.order_id}
`,
          fails: ["dict", "uses-mixin"],
          why: "a hand-written copy left out the total, which is exactly the drift a shared mixin prevents",
        },
      ],
      hints: [
        "A class lists its parents in brackets after its name.",
        "The mixin needs no `__init__` and no changes.",
        "`Order(ToDictMixin)` is all it takes.",
      ],
      task: {
        checks: [
          expr("dict", "An order as a dictionary", "result = Order('O100282', 35.84).to_dict()", { order_id: "O100282", total: 35.84 }, { show: "Order(\"O100282\", 35.84).to_dict()" }),
          expr("uses-mixin", "The method comes from the mixin", "result = issubclass(Order, ToDictMixin)", true, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A mixin that checks required fields",
        prompt: "Write `RequiredFieldsMixin` with a method `missing_fields()`: it reads the class attribute `REQUIRED` (a list of attribute names) and returns, in that order, the names whose value on the object is missing, `None`, or blank text. Then use it on two unrelated classes: `Customer(customer_id, email)` with `REQUIRED = [\"customer_id\", \"email\"]` and `Shipment(order_id, address, carrier=None)` with `REQUIRED = [\"order_id\", \"address\", \"carrier\"]`.",
        spec: [
          ["Mixin", "`RequiredFieldsMixin.missing_fields()` → list of names from `self.REQUIRED` whose value is missing, None, or text that is empty after `strip()`"],
          ["Classes", "`Customer` and `Shipment` inherit the mixin and set their own `REQUIRED`"],
          ["Note", "`getattr(obj, name, None)` reads an attribute whose name is in a variable, with a default"],
        ],
        starter: src`
class RequiredFieldsMixin:
    pass

grace = Customer("C01338", "  ")
parcel = Shipment("O100282", "12 Bank Street")
print(grace.missing_fields(), parcel.missing_fields())
`,
        answer: src`
class RequiredFieldsMixin:
    REQUIRED = []

    def missing_fields(self):
        missing = []
        for name in self.REQUIRED:
            value = getattr(self, name, None)
            if value is None or (isinstance(value, str) and not value.strip()):
                missing.append(name)
        return missing

class Customer(RequiredFieldsMixin):
    REQUIRED = ["customer_id", "email"]

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Shipment(RequiredFieldsMixin):
    REQUIRED = ["order_id", "address", "carrier"]

    def __init__(self, order_id, address, carrier=None):
        self.order_id = order_id
        self.address = address
        self.carrier = carrier

grace = Customer("C01338", "  ")
parcel = Shipment("O100282", "12 Bank Street")
print(grace.missing_fields(), parcel.missing_fields())
`,
        alternatives: [
          src`
class RequiredFieldsMixin:
    def missing_fields(self):
        result = []
        for name in type(self).REQUIRED:
            value = vars(self).get(name)
            if value is None or str(value).strip() == "":
                result.append(name)
        return result

class Customer(RequiredFieldsMixin):
    REQUIRED = ["customer_id", "email"]

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Shipment(RequiredFieldsMixin):
    REQUIRED = ["order_id", "address", "carrier"]

    def __init__(self, order_id, address, carrier=None):
        self.order_id = order_id
        self.address = address
        self.carrier = carrier
`,
        ],
        wrong: [
          {
            code: src`
class RequiredFieldsMixin:
    def missing_fields(self):
        return [name for name in self.REQUIRED if not getattr(self, name, None)]

class Customer(RequiredFieldsMixin):
    REQUIRED = ["customer_id", "email"]

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Shipment(RequiredFieldsMixin):
    REQUIRED = ["order_id", "address", "carrier"]

    def __init__(self, order_id, address, carrier=None):
        self.order_id = order_id
        self.address = address
        self.carrier = carrier
`,
            fails: ["fields", "zero"],
            why: "`not value` also treats text of spaces as present and the number 0 as missing",
          },
          {
            code: src`
class RequiredFieldsMixin:
    def missing_fields(self):
        missing = []
        for name in ["customer_id", "email"]:
            value = getattr(self, name, None)
            if value is None or (isinstance(value, str) and not value.strip()):
                missing.append(name)
        return missing

class Customer(RequiredFieldsMixin):
    REQUIRED = ["customer_id", "email"]

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Shipment(RequiredFieldsMixin):
    REQUIRED = ["order_id", "address", "carrier"]

    def __init__(self, order_id, address, carrier=None):
        self.order_id = order_id
        self.address = address
        self.carrier = carrier
`,
            fails: ["fields", "zero"],
            why: "the mixin hard-codes the customer's fields instead of reading each class's REQUIRED",
          },
        ],
        hints: [
          "Inside the mixin, `self.REQUIRED` finds the list defined by whichever class the object belongs to.",
          "Read each listed attribute with `getattr(self, name, None)`.",
          "Count None and blank text as missing, but not other falsy values such as 0.",
        ],
        task: {
          checks: [
            expr("fields", "Missing fields for two classes", "result = [Customer('C01338', '  ').missing_fields(), Shipment('O100282', '12 Bank Street').missing_fields(), Shipment('O1', '', 'RoyalPost').missing_fields(), Customer('C1', 'a@b.com').missing_fields()]", [["email"], ["carrier"], ["address"], []], { show: "missing_fields() for two customers and two shipments" }),
            expr("mixin", "Both classes use the mixin", "result = [issubclass(Customer, RequiredFieldsMixin), issubclass(Shipment, RequiredFieldsMixin), 'missing_fields' in vars(RequiredFieldsMixin)]", [true, true, true], { hidden: true }),
            expr("zero", "A required number that is 0", "class _Line(RequiredFieldsMixin):\n    REQUIRED = ['sku', 'quantity']\n    def __init__(self):\n        self.sku = 'SPO-11681'\n        self.quantity = 0\nresult = _Line().missing_fields()", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Comparisons from one key",
        prompt: "Writing `__eq__`, `__lt__`, `__le__`, `__gt__`, `__ge__` and `__hash__` for every value class is repetitive. Write `KeyedMixin`, which implements all six from one method each class provides, `sort_key()`. Comparing with an object of a different class returns NotImplemented. Then use it for `Version(text)` (key: the number parts) and `Customer(customer_id, name)` (key: the id, so two records with the same id are equal).",
        spec: [
          ["Mixin", "`KeyedMixin`: `==`, `<`, `<=`, `>`, `>=` compare `sort_key()` when `type(other) is type(self)`, else NotImplemented; `__hash__` = hash of `sort_key()`"],
          ["`Version(text)`", "`sort_key()` → tuple of ints from `\"1.10.2\"`"],
          ["`Customer(customer_id, name)`", "`sort_key()` → `customer_id`"],
        ],
        starter: src`
class KeyedMixin:
    pass

releases = [Version("1.10.0"), Version("1.9.2"), Version("2.0.0")]
print([r.text for r in sorted(releases)], Version("1.9.2") <= Version("1.9.2"))
print(Customer("C00077", "Jamal") == Customer("C00077", "J. Walker"))
`,
        answer: src`
class KeyedMixin:
    def sort_key(self):
        raise NotImplementedError("classes using KeyedMixin define sort_key()")

    def __eq__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() == other.sort_key()

    def __lt__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() < other.sort_key()

    def __le__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() <= other.sort_key()

    def __gt__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() > other.sort_key()

    def __ge__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() >= other.sort_key()

    def __hash__(self):
        return hash(self.sort_key())

class Version(KeyedMixin):
    def __init__(self, text):
        self.text = text

    def sort_key(self):
        return tuple(int(part) for part in self.text.split("."))

class Customer(KeyedMixin):
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

    def sort_key(self):
        return self.customer_id

releases = [Version("1.10.0"), Version("1.9.2"), Version("2.0.0")]
print([r.text for r in sorted(releases)], Version("1.9.2") <= Version("1.9.2"))
print(Customer("C00077", "Jamal") == Customer("C00077", "J. Walker"))
`,
        alternatives: [
          src`
class KeyedMixin:
    def compare(self, other):
        if type(other) is not type(self):
            return None
        mine, theirs = self.sort_key(), other.sort_key()
        return (mine > theirs) - (mine < theirs)

    def __eq__(self, other):
        result = self.compare(other)
        return NotImplemented if result is None else result == 0

    def __lt__(self, other):
        result = self.compare(other)
        return NotImplemented if result is None else result < 0

    def __le__(self, other):
        result = self.compare(other)
        return NotImplemented if result is None else result <= 0

    def __gt__(self, other):
        result = self.compare(other)
        return NotImplemented if result is None else result > 0

    def __ge__(self, other):
        result = self.compare(other)
        return NotImplemented if result is None else result >= 0

    def __hash__(self):
        return hash(self.sort_key())

class Version(KeyedMixin):
    def __init__(self, text):
        self.text = text

    def sort_key(self):
        return tuple(map(int, self.text.split(".")))

class Customer(KeyedMixin):
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

    def sort_key(self):
        return self.customer_id
`,
        ],
        wrong: [
          {
            code: src`
class KeyedMixin:
    def __eq__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() == other.sort_key()

    def __lt__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return self.sort_key() < other.sort_key()

class Version(KeyedMixin):
    def __init__(self, text):
        self.text = text

    def sort_key(self):
        return tuple(int(part) for part in self.text.split("."))

class Customer(KeyedMixin):
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

    def sort_key(self):
        return self.customer_id
`,
            fails: ["operators", "hashing"],
            why: "only `==` and `<` exist; `<=` falls back to nothing useful and, with `__eq__` defined, the objects aren't hashable",
          },
          {
            code: src`
class KeyedMixin:
    def __eq__(self, other):
        return self.sort_key() == other.sort_key()

    def __lt__(self, other):
        return self.sort_key() < other.sort_key()

    def __le__(self, other):
        return self.sort_key() <= other.sort_key()

    def __gt__(self, other):
        return self.sort_key() > other.sort_key()

    def __ge__(self, other):
        return self.sort_key() >= other.sort_key()

    def __hash__(self):
        return hash(self.sort_key())

class Version(KeyedMixin):
    def __init__(self, text):
        self.text = text

    def sort_key(self):
        return tuple(int(part) for part in self.text.split("."))

class Customer(KeyedMixin):
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

    def sort_key(self):
        return self.customer_id
`,
            fails: ["other-types"],
            why: "comparing with an unrelated object crashes (or compares keys of unrelated classes) instead of returning NotImplemented",
          },
        ],
        hints: [
          "Every operator method has the same shape: check that the other object is the same class, then compare the two keys.",
          "`__hash__` must agree with `__eq__`, so hash the same key.",
          "Each class only implements `sort_key()`; the mixin supplies everything else.",
        ],
        task: {
          checks: [
            expr("sorting", "Versions sort by number", "result = [_r.text for _r in sorted([Version('1.10.0'), Version('1.9.2'), Version('2.0.0'), Version('1.9.10')])]", ["1.9.2", "1.9.10", "1.10.0", "2.0.0"], { show: "sorted(versions)" }),
            expr("operators", "All the comparisons", "_a, _b = Version('1.9.2'), Version('1.10.0')\nresult = [_a < _b, _a <= _a, _b > _a, _b >= _a, _a == Version('1.9.2'), _a != _b]", [true, true, true, true, true, true], { show: "<, <=, >, >=, ==, != on two versions" }),
            expr("hashing", "Equal customers are one key", "result = [Customer('C00077', 'Jamal') == Customer('C00077', 'J. Walker'), len({Customer('C1', 'a'), Customer('C1', 'b'), Customer('C2', 'c')})]", [true, 2], { hidden: true }),
            expr("other-types", "Comparing with an unrelated object", "result = [Version('1.0.0') == '1.0.0', Customer('C1', 'x') == Version('1.0.0')]", [false, false], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Base:
    def describe(self):
        return ["Base"]

class LoudMixin:
    def describe(self):
        return ["Loud"] + super().describe()

class ColourMixin:
    def describe(self):
        return ["Colour"] + super().describe()

class Item(LoudMixin, ColourMixin, Base):
    pass

class Other(ColourMixin, LoudMixin, Base):
    pass

print(Item().describe(), Other().describe())
`,
        choices: [
          "['Loud', 'Colour', 'Base'] ['Colour', 'Loud', 'Base']",
          "['Loud', 'Base'] ['Colour', 'Base']",
          "['Loud', 'Colour', 'Base'] ['Loud', 'Colour', 'Base']",
          "['Base'] ['Base']",
        ],
        answer: 0,
        why: "`super()` follows the MRO of the object's class. In Item that is Loud → Colour → Base, so LoudMixin's `super()` reaches ColourMixin, not Base. Swapping the bases swaps the order.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a mixin that doesn't call super(). What does this print?",
        program: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)

class AuditMixin:
    def save(self, record):
        print("audit", record)

class OrderRepository(AuditMixin, Repository):
    pass

repo = OrderRepository()
repo.save("O100282")
print(repo.saved)
`,
        choices: ["audit O100282\n[]", "audit O100282\n['O100282']", "['O100282']", "AttributeError"],
        answer: 0,
        why: "AuditMixin's `save` comes first in the MRO and doesn't pass the call on, so Repository's `save` never runs and nothing is stored. A cooperating mixin ends with `return super().save(record)`.",
      },
      {
        id: "q3",
        prompt: "Which is a good mixin?",
        choices: [
          "ToJsonMixin with one to_json() method and no __init__",
          "A CustomerMixin that stores name, email and address",
          "A mixin that changes the meaning of save() and never calls super()",
          "A mixin that must always be the last base class",
        ],
        answer: 0,
        why: "Good mixins add one capability, keep no state of their own and cooperate through `super()`, so they can be combined freely.",
      },
    ],
    review: [
      "A mixin adds one behaviour to any class that lists it as a base; its name ends in Mixin by convention.",
      "`Class.__mro__` shows the lookup order: the class, then its bases left to right, each before its own parents.",
      "`super()` means the next class in the object's MRO, so cooperating mixins each run and pass on.",
      "Next: descriptors, reusable attribute logic that powers property itself.",
    ],
  },

  // ------------------------------------------------------------------ PY-L29-04 descriptors
  {
    id: "PY-L29-04",
    version: 2,
    slug: "a-price-descriptor",
    title: "Descriptors: reusable attribute rules",
    lede: "A property protects one attribute of one class. A descriptor is a small class whose __get__ and __set__ run whenever an attribute is read or assigned, so one rule (\"never negative\", \"one of these values\") can guard any attribute of any class.",
    focus: "Write descriptors with __set_name__, __get__ and __set__, and use them for reusable validated attributes.",
    minutes: 20,
    objectives: [
      "Write a descriptor class with `__set_name__`, `__get__` and `__set__`",
      "Use one descriptor class for several attributes of several classes",
      "Explain where the value is stored and why a descriptor is placed on the class, not the object",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-get", "exc-name", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "star-args", "string-format", "string-index", "string-method", "top-level-indent", "try-except", "type-call"],
    teaches: ["descriptor-method"],
    blocks: [
      {
        kind: "text",
        md: "Products have a price and a stock level that must never be negative; order lines have a quantity with the same rule. With properties (see Data Models & Typing) each attribute needs its own getter and setter. A **descriptor** writes the rule once, as a class, and is reused by putting an instance of it in any class body: `price = NonNegative()`.\n\nWhen an attribute that is a descriptor on the class is read or assigned through an object, Python calls the descriptor's methods instead:\n\n- `__set_name__(self, owner, name)` runs once, when the owning class is created, and tells the descriptor which attribute name it was given (`\"price\"`);\n- `__get__(self, obj, objtype)` runs on `product.price` (`obj` is None when it is read from the class itself);\n- `__set__(self, obj, value)` runs on `product.price = …`: validate here, then store the value in the object's own dictionary, `obj.__dict__`.\n\n`property` itself is a descriptor; this is the mechanism underneath it.",
      },
      {
        kind: "example",
        title: "One rule, two attributes",
        code: src`
class NonNegative:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} can't be negative: {value}")
        obj.__dict__[self.name] = value

class Product:
    price = NonNegative()
    stock = NonNegative()

    def __init__(self, sku, price, stock):
        self.sku = sku
        self.price = price
        self.stock = stock

mat = Product("SPO-11681", 31.0, 12)
mat.stock -= 5
print(mat.price, mat.stock, vars(mat))
for field, value in [("price", -1), ("stock", -3)]:
    try:
        setattr(mat, field, value)
    except ValueError as err:
        print("refused:", err)
print(type(Product.price).__name__, mat.stock)
`,
        output: "31.0 7 {'sku': 'SPO-11681', 'price': 31.0, 'stock': 7}\nrefused: price can't be negative: -1\nrefused: stock can't be negative: -3\nNonNegative 7\n",
        note: "The rule is written once and guards both attributes; `__set_name__` gave each descriptor its name, so messages say which attribute was wrong. The values themselves live in each product's `__dict__`. `setattr(obj, name, value)` assigns to an attribute whose name is in a variable. Reading from the class returns the descriptor object itself.",
      },
      {
        kind: "error-example",
        title: "The rule also runs in __init__",
        code: src`
class NonNegative:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} can't be negative: {value}")
        obj.__dict__[self.name] = value

class OrderLine:
    quantity = NonNegative()

    def __init__(self, sku, quantity):
        self.sku = sku
        self.quantity = quantity

print(OrderLine("SPO-11681", 2).quantity)
OrderLine("HOM-22847", -1)
`,
        error: "ValueError",
        output: "2\n",
        note: "Assignments in `__init__` go through the descriptor like any other, so a bad quantity can't even be created: `ValueError: quantity can't be negative: -1`. The same descriptor class now guards a third attribute in a second class.",
      },
      {
        kind: "example",
        title: "A choice of allowed values",
        code: src`
class OneOf:
    def __init__(self, *allowed):
        self.allowed = allowed

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        value = value.strip().lower()
        if value not in self.allowed:
            raise ValueError(f"{self.name} must be one of {', '.join(self.allowed)}, not {value!r}")
        obj.__dict__[self.name] = value

class Order:
    status = OneOf("pending", "paid", "shipped", "delivered", "cancelled")
    channel = OneOf("web", "app", "phone")

    def __init__(self, order_id, status, channel):
        self.order_id = order_id
        self.status = status
        self.channel = channel

order = Order("O100282", " Paid", "APP")
print(order.status, order.channel)
order.status = "shipped"
try:
    order.status = "lost"
except ValueError as err:
    print("refused:", err)
print(order.status)
`,
        output: "paid app\nrefused: status must be one of pending, paid, shipped, delivered, cancelled, not 'lost'\nshipped\n",
        note: "A descriptor can take settings in its own `__init__` (here the allowed values), so one class covers many rules. It can also tidy values before storing them.",
      },
      {
        kind: "text",
        md: "**When to use it:** when the same attribute rule appears in several places: non-negative numbers, codes matching a pattern, values from a fixed set, text with a maximum length. For a one-off rule on one attribute, a property is simpler. Frameworks (ORMs, dataclass-like libraries) use descriptors for their field declarations.\n\n**Mistakes to avoid:** storing the value on the descriptor (`self.value = value`): there is one descriptor per class attribute, shared by **every** object, so all products would share one price; putting the descriptor on the object in `__init__` instead of in the class body (it then does nothing); and forgetting the `obj is None` case in `__get__`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Guard the order line's price",
      prompt: "`OrderLine.quantity` is already guarded by `NonNegative`. Use the same descriptor class to guard `unit_price` too, so a negative price is refused.",
      spec: [
        ["Change", "`OrderLine(\"SPO-11681\", 2, -5.0)` raises ValueError"],
      ],
      starter: src`
class NonNegative:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} can't be negative: {value}")
        obj.__dict__[self.name] = value

class OrderLine:
    quantity = NonNegative()

    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

print(OrderLine("SPO-11681", 2, 17.92).unit_price)
`,
      answer: src`
class NonNegative:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} can't be negative: {value}")
        obj.__dict__[self.name] = value

class OrderLine:
    quantity = NonNegative()
    unit_price = NonNegative()

    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

print(OrderLine("SPO-11681", 2, 17.92).unit_price)
`,
      wrong: [
        {
          code: src`
class NonNegative:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} can't be negative: {value}")
        obj.__dict__[self.name] = value

class OrderLine:
    quantity = NonNegative()

    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = NonNegative()
        self.unit_price = unit_price
`,
          fails: ["negative", "valid"],
          why: "a descriptor stored on the object does nothing: descriptors only work as class attributes",
        },
      ],
      hints: [
        "Descriptors are placed in the class body, next to `quantity = NonNegative()`.",
        "Add one line there for the new attribute.",
        "`__init__` stays as it is: its assignment now goes through the descriptor.",
      ],
      task: {
        checks: [
          raisesExpr("negative", "A negative unit price is refused", "OrderLine('SPO-11681', 2, -5.0)", "ValueError", { show: "OrderLine(\"SPO-11681\", 2, -5.0)" }),
          expr("valid", "A valid line still works", "_l = OrderLine('SPO-11681', 2, 17.92)\n_l.unit_price = 15.0\nresult = [_l.quantity, _l.unit_price, type(OrderLine.unit_price).__name__]", [2, py.float(15), "NonNegative"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A bounded number descriptor",
        prompt: "Write a descriptor `Bounded(low, high)` that accepts numbers from `low` to `high` inclusive and raises `ValueError` otherwise, with a message naming the attribute. Use it in `Promotion(code, percent_off, max_uses)` with `percent_off = Bounded(1, 90)` and `max_uses = Bounded(1, 10000)`.",
        spec: [
          ["Descriptor", "`Bounded(low, high)` with `__set_name__`, `__get__` (returns itself when read from the class) and `__set__`"],
          ["Error", "`ValueError` whose message contains the attribute name, e.g. `percent_off must be between 1 and 90, got 95`"],
          ["Class", "`Promotion(code, percent_off, max_uses)` using two Bounded attributes"],
        ],
        starter: src`
class Bounded:
    pass

class Promotion:
    def __init__(self, code, percent_off, max_uses):
        self.code = code
        self.percent_off = percent_off
        self.max_uses = max_uses

spring = Promotion("SPRING25", 25, 500)
print(spring.percent_off, spring.max_uses)
`,
        answer: src`
class Bounded:
    def __init__(self, low, high):
        self.low = low
        self.high = high

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if not self.low <= value <= self.high:
            raise ValueError(f"{self.name} must be between {self.low} and {self.high}, got {value}")
        obj.__dict__[self.name] = value

class Promotion:
    percent_off = Bounded(1, 90)
    max_uses = Bounded(1, 10000)

    def __init__(self, code, percent_off, max_uses):
        self.code = code
        self.percent_off = percent_off
        self.max_uses = max_uses

spring = Promotion("SPRING25", 25, 500)
print(spring.percent_off, spring.max_uses)
`,
        alternatives: [
          src`
class Bounded:
    def __init__(self, low, high):
        self.low, self.high = low, high

    def __set_name__(self, owner, name):
        self.key = "_" + name
        self.name = name

    def __get__(self, obj, objtype=None):
        return self if obj is None else getattr(obj, self.key)

    def __set__(self, obj, value):
        if value < self.low or value > self.high:
            raise ValueError(self.name + " out of range")
        setattr(obj, self.key, value)

class Promotion:
    percent_off = Bounded(1, 90)
    max_uses = Bounded(1, 10000)

    def __init__(self, code, percent_off, max_uses):
        self.code = code
        self.percent_off = percent_off
        self.max_uses = max_uses
`,
        ],
        wrong: [
          {
            code: src`
class Bounded:
    def __init__(self, low, high):
        self.low = low
        self.high = high

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self.value

    def __set__(self, obj, value):
        if not self.low <= value <= self.high:
            raise ValueError(f"{self.name} must be between {self.low} and {self.high}")
        self.value = value

class Promotion:
    percent_off = Bounded(1, 90)
    max_uses = Bounded(1, 10000)

    def __init__(self, code, percent_off, max_uses):
        self.code = code
        self.percent_off = percent_off
        self.max_uses = max_uses
`,
            fails: ["separate"],
            why: "the value is stored on the descriptor, which every Promotion shares, so creating a second promotion changes the first",
          },
          {
            code: src`
class Bounded:
    def __init__(self, low, high):
        self.low = low
        self.high = high

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if not self.low < value < self.high:
            raise ValueError(f"{self.name} must be between {self.low} and {self.high}")
        obj.__dict__[self.name] = value

class Promotion:
    percent_off = Bounded(1, 90)
    max_uses = Bounded(1, 10000)

    def __init__(self, code, percent_off, max_uses):
        self.code = code
        self.percent_off = percent_off
        self.max_uses = max_uses
`,
            fails: ["edges"],
            why: "`<` excludes the limits themselves, so a 90% promotion is refused",
          },
        ],
        hints: [
          "The descriptor's own `__init__` stores the limits; `__set_name__` stores the attribute's name.",
          "`__set__` checks the range and stores the value in `obj.__dict__` under the name; `__get__` reads it back.",
          "In `Promotion`, the two descriptors are class attributes; `__init__` assigns as usual.",
        ],
        task: {
          checks: [
            expr("valid", "A valid promotion", "_p = Promotion('SPRING25', 25, 500)\nresult = [_p.percent_off, _p.max_uses, _p.code]", [25, 500, "SPRING25"], { show: "Promotion(\"SPRING25\", 25, 500)" }),
            expr("messages", "Refusals name the attribute", "_out = []\nfor _args in [('A', 95, 10), ('B', 10, 0)]:\n    try:\n        Promotion(*_args)\n        _out.append('created')\n    except ValueError as _e:\n        _out.append('percent_off' in str(_e) or 'max_uses' in str(_e))\nresult = _out", [true, true], { show: "Promotion with 95% off, and with 0 uses" }),
            expr("separate", "Two promotions keep their own values", "_a = Promotion('A', 10, 100)\n_b = Promotion('B', 50, 7)\nresult = [_a.percent_off, _a.max_uses, _b.percent_off]", [10, 100, 50], { hidden: true }),
            expr("edges", "The limits themselves are allowed", "_p = Promotion('EDGE', 90, 1)\n_p.percent_off = 1\n_p.max_uses = 10000\nresult = [_p.percent_off, _p.max_uses]", [1, 10000], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "An attribute that remembers its changes",
        prompt: "For audits, some attributes must keep a history of every value they have held. Write a descriptor `Tracked` that stores the current value as usual and also appends every assigned value to a per-object history list; and a function `history_of(obj, name)` that returns that list. Use it on `Account(owner, credit_limit, email)` for `credit_limit` and `email`.",
        spec: [
          ["Descriptor", "`Tracked`: reading gives the current value; every assignment (including the first, in `__init__`) is appended to that object's history for that attribute"],
          ["Function", "`history_of(obj, name)` → the list of values assigned to that attribute of that object, oldest first (`[]` if none)"],
          ["Storage", "keep each object's history in its own `__dict__`, e.g. under `\"credit_limit_history\"`"],
        ],
        starter: src`
class Tracked:
    pass

def history_of(obj, name):
    return []

class Account:
    def __init__(self, owner, credit_limit, email):
        self.owner = owner
        self.credit_limit = credit_limit
        self.email = email

acct = Account("C00077", 500, "jamal@old.example")
acct.credit_limit = 750
acct.credit_limit = 600
print(acct.credit_limit, history_of(acct, "credit_limit"), history_of(acct, "email"))
`,
        answer: src`
class Tracked:
    def __set_name__(self, owner, name):
        self.name = name
        self.history_key = name + "_history"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        obj.__dict__[self.name] = value
        obj.__dict__.setdefault(self.history_key, []).append(value)

def history_of(obj, name):
    return list(obj.__dict__.get(name + "_history", []))

class Account:
    credit_limit = Tracked()
    email = Tracked()

    def __init__(self, owner, credit_limit, email):
        self.owner = owner
        self.credit_limit = credit_limit
        self.email = email

acct = Account("C00077", 500, "jamal@old.example")
acct.credit_limit = 750
acct.credit_limit = 600
print(acct.credit_limit, history_of(acct, "credit_limit"), history_of(acct, "email"))
`,
        alternatives: [
          src`
class Tracked:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        key = self.name + "_history"
        if key not in obj.__dict__:
            obj.__dict__[key] = []
        obj.__dict__[key].append(value)
        obj.__dict__[self.name] = value

def history_of(obj, name):
    key = name + "_history"
    return obj.__dict__[key][:] if key in obj.__dict__ else []

class Account:
    credit_limit = Tracked()
    email = Tracked()

    def __init__(self, owner, credit_limit, email):
        self.owner = owner
        self.credit_limit = credit_limit
        self.email = email
`,
        ],
        wrong: [
          {
            code: src`
class Tracked:
    def __set_name__(self, owner, name):
        self.name = name
        self.history = []

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        obj.__dict__[self.name] = value
        self.history.append(value)

def history_of(obj, name):
    return list(type(obj).__dict__[name].history)

class Account:
    credit_limit = Tracked()
    email = Tracked()

    def __init__(self, owner, credit_limit, email):
        self.owner = owner
        self.credit_limit = credit_limit
        self.email = email
`,
            fails: ["first", "separate", "unknown"],
            why: "the history is kept on the descriptor, so every account's changes end up in one shared list",
          },
          {
            code: src`
class Tracked:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        if self.name in obj.__dict__:
            obj.__dict__.setdefault(self.name + "_history", []).append(value)
        obj.__dict__[self.name] = value

def history_of(obj, name):
    return list(obj.__dict__.get(name + "_history", []))

class Account:
    credit_limit = Tracked()
    email = Tracked()

    def __init__(self, owner, credit_limit, email):
        self.owner = owner
        self.credit_limit = credit_limit
        self.email = email
`,
            fails: ["history", "separate", "first"],
            why: "the value set in `__init__` isn't recorded, so the history is missing where it started",
          },
        ],
        hints: [
          "`__set_name__` can work out both keys: the attribute's name and the name of its history list.",
          "`__set__` stores the value and appends it to the object's history list, creating the list the first time (`setdefault` does both).",
          "`history_of` reads the same key from `obj.__dict__`, returning a copy, or `[]`.",
        ],
        task: {
          checks: [
            expr("history", "A credit limit changed twice", "_a = Account('C00077', 500, 'jamal@old.example')\n_a.credit_limit = 750\n_a.credit_limit = 600\nresult = [_a.credit_limit, history_of(_a, 'credit_limit'), history_of(_a, 'email')]", [600, [500, 750, 600], ["jamal@old.example"]], { show: "credit_limit set to 500, 750, 600" }),
            expr("separate", "Two accounts keep separate histories", "_a = Account('A', 100, 'a@x.com')\n_b = Account('B', 200, 'b@x.com')\n_a.credit_limit = 150\nresult = [history_of(_a, 'credit_limit'), history_of(_b, 'credit_limit')]", [[100, 150], [200]], { hidden: true }),
            expr("first", "A fresh account's history", "result = history_of(Account('C', 300, 'c@x.com'), 'credit_limit')", [300], { hidden: true }),
            expr("unknown", "An attribute that isn't tracked", "result = history_of(Account('D', 1, 'd@x.com'), 'owner')", [], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Upper:
    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        obj.__dict__[self.name] = value.strip().upper()

class Product:
    sku = Upper()

    def __init__(self, sku):
        self.sku = sku

a = Product(" spo-11681")
b = Product("hom-22847 ")
a.sku = "toy-54564"
print(a.sku, b.sku, vars(b))
`,
        choices: [
          "TOY-54564 HOM-22847 {'sku': 'HOM-22847'}",
          "toy-54564 HOM-22847 {'sku': 'HOM-22847'}",
          "TOY-54564 TOY-54564 {'sku': 'TOY-54564'}",
          "TOY-54564 HOM-22847 {}",
        ],
        answer: 0,
        why: "Every assignment, in `__init__` and afterwards, goes through `__set__`, which tidies the text and stores it in that object's own `__dict__`. The descriptor is shared; the values aren't.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the value is kept on the descriptor. What does this print?",
        program: src`
class Remember:
    def __get__(self, obj, objtype=None):
        return self.value

    def __set__(self, obj, value):
        self.value = value

class Product:
    price = Remember()

    def __init__(self, price):
        self.price = price

mat = Product(31.0)
lamp = Product(48.0)
print(mat.price, lamp.price)
`,
        choices: ["48.0 48.0", "31.0 48.0", "31.0 31.0", "AttributeError"],
        answer: 0,
        why: "There is one `Remember` object for the class, shared by every product, so the second product's price overwrote the first. Store per-object values in `obj.__dict__`.",
      },
      {
        id: "q3",
        prompt: "When is a descriptor better than a property?",
        choices: [
          "The same validation rule is needed for several attributes, in several classes",
          "One attribute of one class needs a computed value",
          "You want an attribute that can never be read",
          "Always: properties are deprecated",
        ],
        answer: 0,
        why: "A property is a one-off; a descriptor is a reusable rule. (A property is in fact implemented as a descriptor.)",
      },
    ],
    review: [
      "A descriptor is a class attribute whose `__get__`/`__set__` run on reads and assignments through objects.",
      "`__set_name__` tells it its attribute name; store per-object values in `obj.__dict__`, never on the descriptor.",
      "One descriptor class can guard many attributes in many classes; property is the built-in one-off version.",
      "Next: passing collaborators into objects, so they can be swapped and tested.",
    ],
  },

  // ------------------------------------------------------------------ PY-L29-05 dependency injection
  {
    id: "PY-L29-05",
    version: 2,
    slug: "dependency-injection",
    title: "Dependency injection: pass collaborators in",
    lede: "An object that creates its own clock, price list or storage can only ever use those. Passing them in through the constructor lets the same class run against real services, test fakes or a different supplier, without changing its code.",
    focus: "Pass collaborators (clocks, prices, storage, notifiers) into objects through the constructor, and use fakes to test them.",
    minutes: 20,
    objectives: [
      "Recognise hard-wired dependencies (`datetime.now()`, a fixed file name, a service created inside `__init__`)",
      "Receive collaborators as constructor parameters, with sensible defaults where useful",
      "Test the class with small fakes that make results predictable",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "continue-statement", "conversion", "counter-call", "csv-read", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "encoding-arg", "file-open", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-condition", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-format", "string-index", "timedelta-call", "top-level-indent", "tuple-literal", "tuple-unpack", "with-statement"],
    teaches: ["inject-dep"],
    blocks: [
      {
        kind: "text",
        md: "A class that needs the current date can call `date.today()` itself, and then a test can't check what happens at month end without waiting for month end. A class that opens `prices.csv` in its constructor can't run without that exact file. These are **hard-wired dependencies**.\n\n**Dependency injection** means the object *receives* its collaborators: `InvoiceService(clock)`, `Checkout(prices, orders, notifier)`. The class only relies on what it needs from them (a `today()` method, a `save` method: a Protocol, the Data Models & Typing module). In production you pass the real ones; in tests you pass small fakes whose answers you choose. You have already done this with functions (passing `get_rate` and `send_email` in the Testing & Code Quality module); here it is done for whole objects.",
      },
      {
        kind: "example",
        title: "Due dates with an injected clock",
        code: src`
from datetime import date, timedelta

class FixedClock:
    def __init__(self, day):
        self.day = day

    def today(self):
        return self.day

class InvoiceService:
    def __init__(self, clock, payment_days=30):
        self.clock = clock
        self.payment_days = payment_days

    def due_date(self):
        return self.clock.today() + timedelta(days=self.payment_days)

    def is_overdue(self, due):
        return self.clock.today() > due

service = InvoiceService(FixedClock(date(2026, 10, 20)))
print(service.due_date())
print(service.is_overdue(date(2026, 10, 19)), service.is_overdue(date(2026, 10, 20)))
later = InvoiceService(FixedClock(date(2026, 12, 31)), payment_days=14)
print(later.due_date())
`,
        output: "2026-11-19\nTrue False\n2027-01-14\n",
        note: "With a fixed clock the results are the same on every run, and the year-end case can be tested today. In production you would pass a clock whose `today()` returns `date.today()`.",
      },
      {
        kind: "error-example",
        title: "A hard-wired price file",
        code: src`
import csv

class PriceList:
    def __init__(self):
        with open("prices.csv", encoding="utf-8") as f:
            self.prices = {row["sku"]: float(row["price"]) for row in csv.DictReader(f)}

    def price(self, sku):
        return self.prices[sku]

class Checkout:
    def __init__(self):
        self.prices = PriceList()

    def total(self, skus):
        return round(sum(self.prices.price(sku) for sku in skus), 2)

print("creating checkout")
checkout = Checkout()
`,
        error: "FileNotFoundError",
        output: "creating checkout\n",
        note: "`Checkout` builds its own PriceList, which insists on a file called `prices.csv` in the current folder. Here there is none, so nothing about the checkout can even be tried: `FileNotFoundError: [Errno 2] No such file or directory: 'prices.csv'`.",
      },
      {
        kind: "example",
        title: "A checkout with everything passed in",
        code: src`
class InMemoryOrders:
    def __init__(self):
        self.orders = {}

    def save(self, order_id, total):
        self.orders[order_id] = total

class ListNotifier:
    def __init__(self):
        self.sent = []

    def send(self, message):
        self.sent.append(message)

class Checkout:
    def __init__(self, prices, orders, notifier):
        self.prices = prices
        self.orders = orders
        self.notifier = notifier

    def place(self, order_id, skus):
        total = round(sum(self.prices[sku] for sku in skus), 2)
        self.orders.save(order_id, total)
        self.notifier.send(f"{order_id} placed: {total}")
        return total

orders = InMemoryOrders()
notifier = ListNotifier()
checkout = Checkout({"SPO-11681": 31.0, "HOM-22847": 48.0}, orders, notifier)
print(checkout.place("O100282", ["SPO-11681", "HOM-22847"]))
print(orders.orders, notifier.sent)
`,
        output: "79.0\n{'O100282': 79.0} ['O100282 placed: 79.0']\n",
        note: "The prices are any mapping, the storage anything with `save`, the notifier anything with `send`. Here they are in-memory fakes, so the result can be inspected directly; in production they would be a database and an email service, and `Checkout` wouldn't change.",
      },
      {
        kind: "text",
        md: "**When to use it:** for anything slow, external, random or time-dependent: clocks, network services, databases, files, random numbers, email. Give parameters sensible defaults where there is an obvious real implementation, so everyday callers needn't pass them.\n\n**Mistakes to avoid:** creating collaborators inside `__init__` (hard-wired again); reaching into global state such as module-level connections; injecting so many collaborators that the class is doing too much (split it); and fakes that behave differently from the real thing in ways the tests rely on.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Let the caller choose the clock",
      prompt: "`LateFees` reads today's date itself, so its result changes every day and can't be tested. Give `__init__` a `clock` parameter (any object with `today()`) and use it instead of `date.today()`.",
      spec: [
        ["Change", "`LateFees(clock)`; `fee(due)` uses `clock.today()`: 2.50 per day late, 0 if not late"],
      ],
      starter: src`
from datetime import date

class LateFees:
    def fee(self, due):
        days_late = (date.today() - due).days
        return round(max(days_late, 0) * 2.5, 2)

class FixedClock:
    def __init__(self, day):
        self.day = day

    def today(self):
        return self.day

print(LateFees().fee(date(2026, 10, 1)))
`,
      answer: src`
from datetime import date

class LateFees:
    def __init__(self, clock):
        self.clock = clock

    def fee(self, due):
        days_late = (self.clock.today() - due).days
        return round(max(days_late, 0) * 2.5, 2)

class FixedClock:
    def __init__(self, day):
        self.day = day

    def today(self):
        return self.day

print(LateFees(FixedClock(date(2026, 10, 20))).fee(date(2026, 10, 1)))
`,
      wrong: [
        {
          code: src`
from datetime import date

class LateFees:
    def __init__(self, clock):
        self.clock = clock

    def fee(self, due):
        days_late = (date.today() - due).days
        return round(max(days_late, 0) * 2.5, 2)
`,
          fails: ["fixed"],
          why: "the clock is accepted but never used, so the fee still depends on the real date",
        },
      ],
      hints: [
        "Store the clock in `__init__`.",
        "In `fee`, ask the stored clock for today's date.",
        "Nothing else changes.",
      ],
      task: {
        checks: [
          expr("fixed", "Fees on a fixed date", "from datetime import date as _d\nclass _Clock:\n    def today(self):\n        return _d(2025, 6, 30)\n_f = LateFees(_Clock())\nresult = [_f.fee(_d(2025, 6, 11)), _f.fee(_d(2025, 6, 30)), _f.fee(_d(2025, 7, 13))]", [47.5, py.float(0), py.float(0)], { show: "fees on 30 Jun 2025 for invoices due 11 Jun, 30 Jun and 13 Jul" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Payment reminders",
        prompt: "Write `ReminderService(clock, send)` where `clock` has `today()` and `send(email, text)` delivers a message. `remind(invoices)` sends one reminder for every unpaid invoice whose due date has passed, with the text `Invoice <number> is <n> days overdue`, and returns the numbers reminded, in order. Paid invoices and invoices not yet due get nothing.",
        spec: [
          ["Class", "`ReminderService(clock, send)`"],
          ["invoices", "dictionaries with `number`, `email`, `due` (a `date`) and `paid` (True/False)"],
          ["`remind(invoices)`", "for unpaid invoices with `today > due`: `send(email, \"Invoice INV-0041 is 3 days overdue\")`; returns the list of numbers"],
        ],
        starter: src`
from datetime import date

class ReminderService:
    pass

class FixedClock:
    def __init__(self, day):
        self.day = day

    def today(self):
        return self.day

sent = []
def collect(email, text):
    sent.append((email, text))

service = ReminderService(FixedClock(date(2026, 10, 20)), collect)
invoices = [
    {"number": "INV-0041", "email": "jamal.walker62@icloud.com", "due": date(2026, 10, 17), "paid": False},
    {"number": "INV-0042", "email": "nora_garcia@fastmail.com", "due": date(2026, 10, 10), "paid": True},
    {"number": "INV-0043", "email": "grace_walker29@yahoo.com", "due": date(2026, 10, 20), "paid": False},
]
print(service.remind(invoices), sent)
`,
        answer: src`
from datetime import date

class ReminderService:
    def __init__(self, clock, send):
        self.clock = clock
        self.send = send

    def remind(self, invoices):
        today = self.clock.today()
        reminded = []
        for invoice in invoices:
            if invoice["paid"] or today <= invoice["due"]:
                continue
            days = (today - invoice["due"]).days
            self.send(invoice["email"], f"Invoice {invoice['number']} is {days} days overdue")
            reminded.append(invoice["number"])
        return reminded

class FixedClock:
    def __init__(self, day):
        self.day = day

    def today(self):
        return self.day

sent = []
def collect(email, text):
    sent.append((email, text))

service = ReminderService(FixedClock(date(2026, 10, 20)), collect)
invoices = [
    {"number": "INV-0041", "email": "jamal.walker62@icloud.com", "due": date(2026, 10, 17), "paid": False},
    {"number": "INV-0042", "email": "nora_garcia@fastmail.com", "due": date(2026, 10, 10), "paid": True},
    {"number": "INV-0043", "email": "grace_walker29@yahoo.com", "due": date(2026, 10, 20), "paid": False},
]
print(service.remind(invoices), sent)
`,
        alternatives: [
          src`
class ReminderService:
    def __init__(self, clock, send):
        self.clock = clock
        self.send = send

    def remind(self, invoices):
        overdue = [inv for inv in invoices if not inv["paid"] and inv["due"] < self.clock.today()]
        for inv in overdue:
            late = self.clock.today() - inv["due"]
            self.send(inv["email"], "Invoice " + inv["number"] + " is " + str(late.days) + " days overdue")
        return [inv["number"] for inv in overdue]
`,
        ],
        wrong: [
          {
            code: src`
from datetime import date

class ReminderService:
    def __init__(self, clock, send):
        self.clock = clock
        self.send = send

    def remind(self, invoices):
        reminded = []
        for invoice in invoices:
            if invoice["paid"] or date.today() <= invoice["due"]:
                continue
            days = (date.today() - invoice["due"]).days
            self.send(invoice["email"], f"Invoice {invoice['number']} is {days} days overdue")
            reminded.append(invoice["number"])
        return reminded
`,
            fails: ["remind", "edge"],
            why: "it ignores the injected clock and reads the real date, so the result depends on the day it runs",
          },
          {
            code: src`
class ReminderService:
    def __init__(self, clock, send):
        self.clock = clock
        self.send = send

    def remind(self, invoices):
        today = self.clock.today()
        reminded = []
        for invoice in invoices:
            if invoice["paid"] or today < invoice["due"]:
                continue
            days = (today - invoice["due"]).days
            self.send(invoice["email"], f"Invoice {invoice['number']} is {days} days overdue")
            reminded.append(invoice["number"])
        return reminded
`,
            fails: ["remind", "edge"],
            why: "an invoice due today is reminded as \"0 days overdue\"",
          },
        ],
        hints: [
          "Store both collaborators in `__init__`; `remind` only talks to them.",
          "Skip paid invoices and those whose due date is today or later.",
          "Subtracting two dates gives a timedelta; `.days` is the number of days.",
        ],
        task: {
          checks: [
            expr("remind", "Reminders on 20 October", "from datetime import date as _d\nclass _Clock:\n    def today(self):\n        return _d(2025, 3, 15)\n_sent = []\ndef _send(email, text):\n    _sent.append((email, text))\n_s = ReminderService(_Clock(), _send)\n_r = _s.remind([{'number': 'INV-0041', 'email': 'jamal.walker62@icloud.com', 'due': _d(2025, 3, 12), 'paid': False}, {'number': 'INV-0042', 'email': 'nora_garcia@fastmail.com', 'due': _d(2025, 3, 5), 'paid': True}, {'number': 'INV-0043', 'email': 'grace_walker29@yahoo.com', 'due': _d(2025, 3, 15), 'paid': False}, {'number': 'INV-0044', 'email': 'theo@example.com', 'due': _d(2025, 2, 23), 'paid': False}])\nresult = [_r, _sent]", [["INV-0041", "INV-0044"], [py.tuple(py.str("jamal.walker62@icloud.com"), py.str("Invoice INV-0041 is 3 days overdue")), py.tuple(py.str("theo@example.com"), py.str("Invoice INV-0044 is 20 days overdue"))]], { show: "remind(invoices) with a clock fixed on 15 Mar 2025" }),
            expr("edge", "An invoice due today", "from datetime import date as _d\nclass _Clock:\n    def today(self):\n        return _d(2026, 1, 1)\n_sent = []\n_s = ReminderService(_Clock(), lambda email, text: _sent.append(text))\nresult = [_s.remind([{'number': 'INV-1', 'email': 'a@b.com', 'due': _d(2026, 1, 1), 'paid': False}]), _sent]", [[], []], { hidden: true }),
            expr("none", "Nothing to remind", "from datetime import date as _d\nclass _Clock:\n    def today(self):\n        return _d(2026, 5, 5)\n_s = ReminderService(_Clock(), lambda email, text: None)\nresult = _s.remind([])", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Exchange rates with a cache that expires",
        prompt: "Looking up exchange rates is slow, so cache them, but only for a while. Write `CachedRates(source, clock, max_age_seconds)`. `source.rate(currency)` is the slow lookup; `clock.now()` returns a `datetime`. `rate(currency)` returns the cached rate if it was fetched less than `max_age_seconds` ago, and otherwise asks the source again and remembers the new value and when it was fetched. Tests will pass a fake source that counts its calls and a fake clock they can move forward.",
        spec: [
          ["Class", "`CachedRates(source, clock, max_age_seconds)`"],
          ["`rate(currency)`", "cached if fetched less than `max_age_seconds` ago; otherwise fetched again (and the fetch time stored)"],
          ["Per currency", "each currency has its own cached value and fetch time"],
        ],
        starter: src`
from datetime import datetime, timedelta

class CachedRates:
    def __init__(self, source, clock, max_age_seconds):
        self.source = source

    def rate(self, currency):
        return self.source.rate(currency)
`,
        answer: src`
from datetime import datetime, timedelta

class CachedRates:
    def __init__(self, source, clock, max_age_seconds):
        self.source = source
        self.clock = clock
        self.max_age = timedelta(seconds=max_age_seconds)
        self.cache = {}

    def rate(self, currency):
        now = self.clock.now()
        if currency in self.cache:
            value, fetched_at = self.cache[currency]
            if now - fetched_at < self.max_age:
                return value
        value = self.source.rate(currency)
        self.cache[currency] = (value, now)
        return value
`,
        alternatives: [
          src`
class CachedRates:
    def __init__(self, source, clock, max_age_seconds):
        self.source = source
        self.clock = clock
        self.max_age_seconds = max_age_seconds
        self.values = {}
        self.times = {}

    def rate(self, currency):
        now = self.clock.now()
        fetched = self.times.get(currency)
        if fetched is None or (now - fetched).total_seconds() >= self.max_age_seconds:
            self.values[currency] = self.source.rate(currency)
            self.times[currency] = now
        return self.values[currency]
`,
        ],
        wrong: [
          {
            code: src`
class CachedRates:
    def __init__(self, source, clock, max_age_seconds):
        self.source = source
        self.clock = clock
        self.cache = {}

    def rate(self, currency):
        if currency not in self.cache:
            self.cache[currency] = self.source.rate(currency)
        return self.cache[currency]
`,
            fails: ["expires"],
            why: "nothing ever expires, so a rate fetched once is used forever",
          },
          {
            code: src`
from datetime import datetime

class CachedRates:
    def __init__(self, source, clock, max_age_seconds):
        self.source = source
        self.clock = clock
        self.max_age_seconds = max_age_seconds
        self.cache = {}

    def rate(self, currency):
        now = datetime.now()
        if currency in self.cache:
            value, fetched_at = self.cache[currency]
            if (now - fetched_at).total_seconds() < self.max_age_seconds:
                return value
        value = self.source.rate(currency)
        self.cache[currency] = (value, now)
        return value
`,
            fails: ["expires"],
            why: "it reads the real clock instead of the injected one, so moving the test clock forward has no effect",
          },
        ],
        hints: [
          "Store all three collaborators and a dictionary from currency to `(value, fetched_at)`.",
          "Ask `self.clock.now()` once per call; compare its distance from the fetch time with the maximum age.",
          "On a miss or an expired entry, fetch from the source and record the value with the current time.",
        ],
        task: {
          checks: [
            expr("cached", "A second lookup within the age is served from the cache", "from datetime import datetime as _dt, timedelta as _td\nclass _Clock:\n    def __init__(self):\n        self.t = _dt(2026, 10, 20, 9, 0, 0)\n    def now(self):\n        return self.t\nclass _Source:\n    def __init__(self):\n        self.calls = 0\n    def rate(self, currency):\n        self.calls += 1\n        return {'EUR': 1.17, 'USD': 1.28}[currency]\n_c, _s = _Clock(), _Source()\n_r = CachedRates(_s, _c, 60)\n_a = _r.rate('EUR')\n_c.t += _td(seconds=59)\n_b = _r.rate('EUR')\nresult = [_a, _b, _s.calls]", [1.17, 1.17, 1], { show: "rate(\"EUR\") twice, 59 seconds apart, max age 60" }),
            expr("expires", "After the maximum age it fetches again", "from datetime import datetime as _dt, timedelta as _td\nclass _Clock:\n    def __init__(self):\n        self.t = _dt(2026, 10, 20, 9, 0, 0)\n    def now(self):\n        return self.t\nclass _Source:\n    def __init__(self):\n        self.calls = 0\n    def rate(self, currency):\n        self.calls += 1\n        return 1.17 + self.calls / 100\n_c, _s = _Clock(), _Source()\n_r = CachedRates(_s, _c, 60)\n_a = _r.rate('EUR')\n_c.t += _td(seconds=60)\n_b = _r.rate('EUR')\n_c.t += _td(seconds=30)\n_x = _r.rate('EUR')\nresult = [_a, _b, _x, _s.calls]", [1.18, 1.19, 1.19, 2], { show: "rate(\"EUR\") at 0 s, 60 s and 90 s, max age 60" }),
            expr("per-currency", "Each currency is cached separately", "from datetime import datetime as _dt\nclass _Clock:\n    def now(self):\n        return _dt(2026, 10, 20, 9, 0, 0)\nclass _Source:\n    def __init__(self):\n        self.asked = []\n    def rate(self, currency):\n        self.asked.append(currency)\n        return 1.0\n_s = _Source()\n_r = CachedRates(_s, _Clock(), 300)\nfor _cur in ['EUR', 'USD', 'EUR', 'USD', 'JPY']:\n    _r.rate(_cur)\nresult = _s.asked", ["EUR", "USD", "JPY"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Counter:
    def __init__(self):
        self.calls = 0

    def next_id(self):
        self.calls += 1
        return f"O{100000 + self.calls}"

class OrderFactory:
    def __init__(self, ids):
        self.ids = ids

    def create(self, customer_id):
        return {"order_id": self.ids.next_id(), "customer_id": customer_id}

shared = Counter()
web = OrderFactory(shared)
app = OrderFactory(shared)
print(web.create("C00077")["order_id"], app.create("C01338")["order_id"], shared.calls)
`,
        choices: ["O100001 O100002 2", "O100001 O100001 2", "O100001 O100001 1", "O100002 O100002 2"],
        answer: 0,
        why: "Both factories were given the same Counter object, so they share its state: the ids continue across them. Injecting one collaborator into several objects is a deliberate way to share it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a default that creates the collaborator once. What does this print?",
        program: src`
class InMemoryLog:
    def __init__(self):
        self.lines = []

    def write(self, line):
        self.lines.append(line)

DEFAULT_LOG = InMemoryLog()

class Importer:
    def __init__(self, name, log=DEFAULT_LOG):
        self.name = name
        self.log = log

    def run(self):
        self.log.write(f"{self.name} ran")

Importer("orders").run()
Importer("products").run()
print(len(DEFAULT_LOG.lines), Importer("x").log is Importer("y").log)
`,
        choices: ["2 True", "1 False", "0 True", "2 False"],
        answer: 0,
        why: "Every Importer created without a log shares the one module-level log object, so their lines pile up together (and tests that rely on the default affect each other). Default to None and create a new collaborator inside `__init__`, or require the caller to pass one.",
      },
      {
        id: "q3",
        prompt: "Which collaborator is most worth injecting?",
        choices: [
          "The clock that a billing class asks for the current date",
          "The string method upper() used to tidy a code",
          "The len() function",
          "A constant like the number of days in a week",
        ],
        answer: 0,
        why: "Time-dependent, slow, external or random collaborators are the ones that make code hard to test and change. Pure, fixed helpers can be used directly.",
      },
    ],
    review: [
      "Hard-wired dependencies (the real clock, a fixed file, a service built inside `__init__`) make classes hard to test and change.",
      "Pass collaborators in through the constructor; the class relies only on the methods it calls.",
      "Tests pass small fakes (a fixed clock, an in-memory store) and get predictable results.",
      "Next module: packaging projects and storing data in SQLite.",
    ],
  },
];
