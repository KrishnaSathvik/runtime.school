/**
 * M27 Inheritance & Composition: five lessons (PY-L27-01 … PY-L27-05).
 *
 * A subclass that inherits attributes and methods, isinstance and exception hierarchies (L01); overriding a method
 * and extending it, including __init__, with super() (L02); polymorphism: one call that runs a different method on
 * each class, instead of if/elif on the kind of object (L03); composition: objects that hold other objects and
 * delegate to them (L04); choosing between inheritance and composition, and what goes wrong when a class inherits
 * behaviour it shouldn't expose (L05).
 *
 * Fixtures are Runtime Market (R01) products, orders, customers and deliveries. Every mistake runs for real
 * (AttributeError from a missing super().__init__, from a missing method, from a None part).
 * Version 2: rewritten from five lessons about a MUG item and a HAT label.
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

export const m27Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L27-01 subclasses
  {
    id: "PY-L27-01",
    version: 2,
    slug: "a-kind-of-item",
    title: "Inheritance: a class that builds on another",
    lede: "When one kind of object is a special case of another (a book is a product), a subclass inherits everything the parent has and adds or changes only what is different.",
    focus: "Define a subclass that inherits its parent's attributes and methods, adds its own, and is accepted by isinstance as the parent.",
    minutes: 18,
    objectives: [
      "Write `class Child(Parent):` and use the parent's `__init__` and methods on child objects",
      "Change a class attribute or add a method in the subclass only",
      "Use `isinstance` and `issubclass`, and catch a family of your own exceptions by their parent class",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comp-if", "conversion", "dict-literal", "dict-lookup", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-check", "string-format", "string-index", "string-method", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "unicode-text"],
    teaches: ["subclass"],
    blocks: [
      {
        kind: "text",
        md: "Runtime Market sells ordinary products, books and downloads. They are all products (an SKU, a name, a price), but each kind differs a little: books carry no VAT, downloads aren't shipped. Copying the Product class three times and editing each copy would mean fixing every bug three times.\n\n`class Book(Product):` creates a **subclass**. A Book object has everything a Product has: the same `__init__`, attributes and methods. In the subclass body you write only what is different. When Python looks up an attribute or method on a Book, it checks the Book class first and then its parent, so a class attribute defined in Book replaces the parent's for books only.\n\n`isinstance(novel, Product)` is True for a Book: a book *is a* product, and code written for products accepts it.",
      },
      {
        kind: "example",
        title: "Books without VAT",
        code: src`
class Product:
    VAT_RATE = 0.2

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def price_with_vat(self):
        return round(self.price * (1 + self.VAT_RATE), 2)

class Book(Product):
    VAT_RATE = 0.0

lamp = Product("HOM-22847", "Desk lamp", 48.0)
novel = Book("BOO-10233", "The Long Road", 8.99)
print(lamp.price_with_vat(), novel.price_with_vat())
print(novel.name, type(novel).__name__)
print(isinstance(novel, Product), isinstance(lamp, Book))
`,
        output: "57.6 8.99\nThe Long Road Book\nTrue False\n",
        note: "Book has no `__init__` and no `price_with_vat` of its own; both are inherited. Inside `price_with_vat`, `self.VAT_RATE` finds Book's 0.0 for a book and Product's 0.2 for the lamp. A book is a product, but a product isn't necessarily a book.",
      },
      {
        kind: "text",
        md: "A subclass can also **add** methods. They exist only on the subclass: inheritance goes from parent to child, never the other way.",
      },
      {
        kind: "error-example",
        title: "A child's method on a parent object",
        code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct(Product):
    def download_url(self):
        return "https://downloads.runtime.market/" + self.sku.lower()

ebook = DigitalProduct("DIG-30115", "Python Basics (e-book)", 12.0)
print(ebook.download_url())
lamp = Product("HOM-22847", "Desk lamp", 48.0)
print(lamp.download_url())
`,
        error: "AttributeError",
        output: "https://downloads.runtime.market/dig-30115\n",
        note: "The e-book has the method; the lamp, an ordinary Product, doesn't: `AttributeError: 'Product' object has no attribute 'download_url'`.",
      },
      {
        kind: "example",
        title: "A basket with downloads in it",
        code: src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct(Product):
    SHIPS = False

    def download_url(self):
        return "https://downloads.runtime.market/" + self.sku.lower()

basket = [
    Product("HOM-22847", "Desk lamp", 48.0),
    DigitalProduct("DIG-30115", "Python Basics (e-book)", 12.0),
    Product("SPO-11681", "Yoga mat", 31.0),
]
to_ship = [item.sku for item in basket if item.SHIPS]
print("ship:", to_ship)
for item in basket:
    if isinstance(item, DigitalProduct):
        print("email link:", item.download_url())
print(issubclass(DigitalProduct, Product), issubclass(Product, DigitalProduct))
`,
        output: "ship: ['HOM-22847', 'SPO-11681']\nemail link: https://downloads.runtime.market/dig-30115\nTrue False\n",
        note: "One list holds both kinds. The shipping filter reads `SHIPS` and gets the right answer for each class without knowing which is which. `issubclass` asks the same question as `isinstance`, but about classes.",
      },
      {
        kind: "text",
        md: "You have used inheritance since the Exceptions & Validation module: `class QuantityError(Exception)` made a subclass of Exception. Exception families work the same way: `except` catches the class you name **and all its subclasses**, which is why a program can define `ImportProblem` and catch `BadRow` and `MissingColumn` with one `except ImportProblem`.\n\n**When to use it:** when the new class really is a special kind of the parent and should be usable anywhere the parent is. **Mistakes to avoid:** inheriting just to reuse a few lines of code from an unrelated class (the Inheritance & Composition module shows the alternative); calling a subclass-only method on objects that may be the parent; and long `isinstance` chains to decide behaviour (the next lessons replace them).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Gift cards are VAT-free too",
      prompt: "`GiftCard` is a subclass of `Product`, but gift cards are VAT-free and it still charges 20%. Give `GiftCard` its own VAT rate of 0, without changing `Product`.",
      spec: [
        ["Change", "only the `GiftCard` class: `GiftCard(...).price_with_vat()` equals its price"],
      ],
      starter: src`
class Product:
    VAT_RATE = 0.2

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def price_with_vat(self):
        return round(self.price * (1 + self.VAT_RATE), 2)

class GiftCard(Product):
    pass

card = GiftCard("GFT-02500", "Gift card £25", 25.0)
print(card.price_with_vat())
`,
      answer: src`
class Product:
    VAT_RATE = 0.2

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def price_with_vat(self):
        return round(self.price * (1 + self.VAT_RATE), 2)

class GiftCard(Product):
    VAT_RATE = 0.0

card = GiftCard("GFT-02500", "Gift card £25", 25.0)
print(card.price_with_vat())
`,
      wrong: [
        {
          code: src`
class Product:
    VAT_RATE = 0.0

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def price_with_vat(self):
        return round(self.price * (1 + self.VAT_RATE), 2)

class GiftCard(Product):
    pass
`,
          fails: ["product"],
          why: "the parent's rate was changed, so every product lost its VAT, not just gift cards",
        },
      ],
      hints: [
        "A class attribute written in the subclass replaces the parent's for that subclass only.",
        "Replace `pass` with an assignment.",
        "Name it exactly as the parent does, so `self.VAT_RATE` finds it.",
      ],
      task: {
        checks: [
          expr("gift", "A gift card is VAT-free", "result = GiftCard('GFT-02500', 'Gift card £25', 25.0).price_with_vat()", py.float(25), { show: "GiftCard(\"GFT-02500\", \"Gift card £25\", 25.0).price_with_vat()" }),
          expr("product", "Other products still pay VAT", "result = [Product('HOM-22847', 'Desk lamp', 48.0).price_with_vat(), isinstance(GiftCard('G', 'g', 1.0), Product)]", [57.6, true], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Downloads don't ship",
        prompt: "Write a subclass `DigitalProduct` of the given `Product` with a class attribute `SHIPS = False` (products ship by default) and a method `download_url()` returning `https://downloads.runtime.market/` followed by the SKU in lower case. Then write `shipping_list(products)`, returning the SKUs of the products that need shipping, in order.",
        spec: [
          ["Class", "`DigitalProduct(Product)`: `SHIPS = False`; `download_url()`"],
          ["Function", "`shipping_list(products)` → SKUs of the products whose `SHIPS` is True"],
          ["Example", "`DigitalProduct(\"DIG-30115\", \"Python Basics\", 12.0).download_url()` → `'https://downloads.runtime.market/dig-30115'`"],
        ],
        starter: src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def shipping_list(products):
    return []

basket = [Product("HOM-22847", "Desk lamp", 48.0), Product("SPO-11681", "Yoga mat", 31.0)]
print(shipping_list(basket))
`,
        answer: src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct(Product):
    SHIPS = False

    def download_url(self):
        return "https://downloads.runtime.market/" + self.sku.lower()

def shipping_list(products):
    skus = []
    for product in products:
        if product.SHIPS:
            skus.append(product.sku)
    return skus

basket = [Product("HOM-22847", "Desk lamp", 48.0), DigitalProduct("DIG-30115", "Python Basics", 12.0), Product("SPO-11681", "Yoga mat", 31.0)]
print(shipping_list(basket))
print(basket[1].download_url())
`,
        alternatives: [
          src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct(Product):
    SHIPS = False

    def download_url(self):
        return f"https://downloads.runtime.market/{self.sku.lower()}"

def shipping_list(products):
    return [p.sku for p in products if not isinstance(p, DigitalProduct)]
`,
        ],
        wrong: [
          {
            code: src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct:
    SHIPS = False

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def download_url(self):
        return "https://downloads.runtime.market/" + self.sku.lower()

def shipping_list(products):
    return [p.sku for p in products if p.SHIPS]
`,
            fails: ["is-product"],
            why: "a copy of the class works here, but a download is no longer a Product, so code that checks for products rejects it",
          },
          {
            code: src`
class Product:
    SHIPS = True

    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class DigitalProduct(Product):
    SHIPS = False

    def download_url(self):
        return "https://downloads.runtime.market/" + self.sku

def shipping_list(products):
    return [p.sku for p in products]
`,
            fails: ["url", "list"],
            why: "the URL keeps the capitals, and every product is listed for shipping",
          },
        ],
        hints: [
          "A subclass of Product inherits `__init__`, so it only needs its class attribute and the new method.",
          "The method builds a text from a fixed prefix and the object's SKU in lower case.",
          "`shipping_list` doesn't need to know about subclasses: reading `product.SHIPS` gives each object's own answer.",
        ],
        task: {
          checks: [
            expr("url", "A download link", "result = DigitalProduct('DIG-30115', 'Python Basics', 12.0).download_url()", "https://downloads.runtime.market/dig-30115", { show: "DigitalProduct(\"DIG-30115\", \"Python Basics\", 12.0).download_url()" }),
            expr("list", "Only products that ship", "result = shipping_list([Product('HOM-22847', 'Desk lamp', 48.0), DigitalProduct('DIG-30115', 'Python Basics', 12.0), Product('SPO-11681', 'Yoga mat', 31.0), DigitalProduct('DIG-40001', 'Recipes', 5.0)])", ["HOM-22847", "SPO-11681"], { show: "shipping_list(<lamp, e-book, mat, e-book>)" }),
            expr("is-product", "A download is still a Product", "_d = DigitalProduct('DIG-1', 'x', 1.0)\nresult = [isinstance(_d, Product), _d.price, Product('A', 'a', 1.0).SHIPS]", [true, py.float(1), true], { hidden: true }),
            expr("empty", "No products", "result = shipping_list([])", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A family of import errors",
        prompt: "An importer can fail in two expected ways. Define `ImportProblem` (a subclass of Exception) with two subclasses, `MissingColumn` and `BadRow`. Write `parse_row(row)`, which raises `MissingColumn` when the row has no `sku` or no `qty`, and `BadRow` when `qty` isn't a whole number, and otherwise returns `(sku, qty)`. Then write `import_rows(rows)`, which collects the good rows and, for every row that raised **any** ImportProblem, a message `\"<ErrorType>: <message>\"`. Other errors are bugs and must not be caught.",
        spec: [
          ["Classes", "`ImportProblem(Exception)`; `MissingColumn(ImportProblem)`; `BadRow(ImportProblem)`"],
          ["`parse_row(row)`", "`(sku, int(qty))`, or raises one of the two subclasses"],
          ["`import_rows(rows)`", "returns `(good, problems)`: a list of `(sku, qty)` tuples and a list of `\"MissingColumn: …\"` / `\"BadRow: …\"` texts"],
          ["Rule", "catch with one `except ImportProblem`; anything else (for example a row that isn't a dictionary) must reach the caller"],
        ],
        starter: src`
class ImportProblem(Exception):
    pass

def parse_row(row):
    return (row["sku"], int(row["qty"]))

def import_rows(rows):
    return [], []

rows = [{"sku": "SPO-11681", "qty": "2"}, {"sku": "HOM-22847"}, {"sku": "TOY-54564", "qty": "two"}]
print(import_rows(rows))
`,
        answer: src`
class ImportProblem(Exception):
    pass

class MissingColumn(ImportProblem):
    pass

class BadRow(ImportProblem):
    pass

def parse_row(row):
    for column in ["sku", "qty"]:
        if column not in row:
            raise MissingColumn(f"no {column} in {row}")
    if not row["qty"].strip().isdigit():
        raise BadRow(f"qty {row['qty']!r} is not a whole number")
    return (row["sku"], int(row["qty"]))

def import_rows(rows):
    good = []
    problems = []
    for row in rows:
        try:
            good.append(parse_row(row))
        except ImportProblem as err:
            problems.append(f"{type(err).__name__}: {err}")
    return good, problems

rows = [{"sku": "SPO-11681", "qty": "2"}, {"sku": "HOM-22847"}, {"sku": "TOY-54564", "qty": "two"}]
print(import_rows(rows))
`,
        alternatives: [
          src`
class ImportProblem(Exception):
    pass

class MissingColumn(ImportProblem):
    pass

class BadRow(ImportProblem):
    pass

def parse_row(row):
    if "sku" not in row or "qty" not in row:
        raise MissingColumn("missing column")
    try:
        qty = int(row["qty"])
    except ValueError:
        raise BadRow("qty is not a whole number")
    return (row["sku"], qty)

def import_rows(rows):
    good, problems = [], []
    for row in rows:
        try:
            good.append(parse_row(row))
        except ImportProblem as err:
            problems.append(type(err).__name__ + ": " + str(err))
    return good, problems
`,
        ],
        wrong: [
          {
            code: src`
class ImportProblem(Exception):
    pass

class MissingColumn(Exception):
    pass

class BadRow(Exception):
    pass

def parse_row(row):
    if "sku" not in row or "qty" not in row:
        raise MissingColumn("missing column")
    if not row["qty"].strip().isdigit():
        raise BadRow("not a whole number")
    return (row["sku"], int(row["qty"]))

def import_rows(rows):
    good, problems = [], []
    for row in rows:
        try:
            good.append(parse_row(row))
        except ImportProblem as err:
            problems.append(f"{type(err).__name__}: {err}")
    return good, problems
`,
            fails: ["family", "import"],
            why: "the two errors don't inherit from ImportProblem, so `except ImportProblem` never catches them",
          },
          {
            code: src`
class ImportProblem(Exception):
    pass

class MissingColumn(ImportProblem):
    pass

class BadRow(ImportProblem):
    pass

def parse_row(row):
    if "sku" not in row or "qty" not in row:
        raise MissingColumn("missing column")
    if not row["qty"].strip().isdigit():
        raise BadRow("not a whole number")
    return (row["sku"], int(row["qty"]))

def import_rows(rows):
    good, problems = [], []
    for row in rows:
        try:
            good.append(parse_row(row))
        except Exception as err:
            problems.append(f"{type(err).__name__}: {err}")
    return good, problems
`,
            fails: ["bugs-escape"],
            why: "`except Exception` also swallows real bugs, such as a row that isn't a dictionary",
          },
        ],
        hints: [
          "Three small classes: the family parent inherits from Exception, the two specific errors inherit from the parent.",
          "`parse_row` checks the columns first, then the quantity, raising the matching subclass.",
          "In `import_rows`, one `except ImportProblem as err` catches both subclasses; `type(err).__name__` says which one it was.",
        ],
        task: {
          checks: [
            expr("family", "The errors form one family", "result = [issubclass(MissingColumn, ImportProblem), issubclass(BadRow, ImportProblem), issubclass(ImportProblem, Exception), issubclass(BadRow, MissingColumn)]", [true, true, true, false], { show: "issubclass(...) for the three classes" }),
            expr("import", "Good rows and problems", "_g, _p = import_rows([{'sku': 'SPO-11681', 'qty': '2'}, {'sku': 'HOM-22847'}, {'sku': 'TOY-54564', 'qty': 'two'}, {'sku': 'ELE-24781', 'qty': ' 12 '}])\nresult = [_g, [_m.split(':')[0] for _m in _p]]", [[py.tuple(py.str("SPO-11681"), py.int(2)), py.tuple(py.str("ELE-24781"), py.int(12))], ["MissingColumn", "BadRow"]], { show: "import_rows(rows): good rows and the error types" }),
            raisesExpr("missing", "parse_row raises MissingColumn", "parse_row({'qty': '1'})", "MissingColumn", { hidden: true }),
            raisesExpr("bugs-escape", "A row that isn't a dictionary is a bug, not an import problem", "import_rows([{'sku': 'A', 'qty': '1'}, None])", "TypeError", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Delivery:
    SPEED = "standard"
    DAYS = 3

    def describe(self):
        return f"{self.SPEED} in {self.DAYS} days"

class Express(Delivery):
    SPEED = "express"
    DAYS = 1

class Weekend(Express):
    DAYS = 2

print(Delivery().describe(), "|", Express().describe(), "|", Weekend().describe())
`,
        choices: [
          "standard in 3 days | express in 1 days | express in 2 days",
          "standard in 3 days | express in 1 days | standard in 2 days",
          "standard in 3 days | standard in 3 days | standard in 3 days",
          "standard in 3 days | express in 1 days | express in 1 days",
        ],
        answer: 0,
        why: "Lookup starts at the object's own class and goes up. Weekend defines DAYS itself and finds SPEED in its parent Express; `describe` is found in Delivery for all three.",
      },
      {
        id: "q2",
        prompt: "Exception classes form families too. What does this print?",
        program: src`
class PaymentError(Exception):
    pass

class CardDeclined(PaymentError):
    pass

def charge():
    raise CardDeclined("card ending 4242 declined")

def attempt(handler):
    try:
        charge()
        return "no error"
    except handler:
        return handler.__name__ + " caught it"

for handler in [CardDeclined, PaymentError, ValueError]:
    try:
        print(attempt(handler))
    except CardDeclined:
        print(handler.__name__, "missed it")
`,
        choices: [
          "CardDeclined caught it\nPaymentError caught it\nValueError missed it",
          "CardDeclined caught it\nPaymentError missed it\nValueError missed it",
          "CardDeclined caught it\nPaymentError caught it\nValueError caught it",
          "CardDeclined missed it\nPaymentError caught it\nValueError missed it",
        ],
        answer: 0,
        why: "`except` catches the named class and its subclasses. A CardDeclined is a PaymentError, so both of those handlers catch it; ValueError is unrelated, so the error escapes from `attempt` to the outer handler. A class is a value, so it can be passed to a function and named in `except`.",
      },
      {
        id: "q3",
        prompt: "Which pair is a good fit for `class B(A)`?",
        choices: [
          "A = Product, B = Book",
          "A = Customer, B = Order",
          "A = Order, B = OrderLine",
          "A = Warehouse, B = Product",
        ],
        answer: 0,
        why: "A book *is a* product, so it can be used wherever a product is expected. An order isn't a kind of customer and a line isn't a kind of order: those objects *have* each other (see Inheritance & Composition).",
      },
    ],
    review: [
      "`class Child(Parent):` inherits the parent's `__init__`, methods and class attributes.",
      "Lookup checks the object's class first, then its parents, so the subclass only states what differs.",
      "`isinstance(obj, Parent)` is True for subclass objects; `except Parent` catches every subclass error.",
      "Next: replacing a parent's method in a subclass, and extending it with super().",
    ],
  },

  // ------------------------------------------------------------------ PY-L27-02 override and super
  {
    id: "PY-L27-02",
    version: 2,
    slug: "override-and-super",
    title: "Override and extend methods with super()",
    lede: "A subclass can replace a parent method by defining one with the same name, or extend it: call the parent's version with super() and add to its result. The same goes for __init__.",
    focus: "Override a method in a subclass, and extend methods and __init__ with super().",
    minutes: 20,
    objectives: [
      "Override a method by defining one with the same name in the subclass",
      "Extend a method with `super().method(...)` instead of copying the parent's code",
      "Add attributes in a subclass `__init__` that calls `super().__init__(...)` first",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "exc-name", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "string-check", "string-format", "string-index", "string-method", "string-slice", "subclass", "top-level-indent", "type-call", "unicode-text"],
    teaches: ["method-override", "super-call"],
    blocks: [
      {
        kind: "text",
        md: "A method defined in the subclass with the same name as one in the parent **overrides** it: lookup finds the subclass's version first, so the parent's is not used for those objects.\n\nOften you don't want to replace the parent's work, only add to it. Copying the parent's code into the subclass would duplicate it. `super().label()` calls the **parent's** `label` on the same object, so the subclass can take its result and extend it.\n\nThe most common case is `__init__`. A subclass that needs an extra attribute defines its own `__init__`, which replaces the parent's completely, so it must call `super().__init__(...)` to have the parent set up its attributes too.",
      },
      {
        kind: "example",
        title: "Labels for three kinds of product",
        code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def label(self):
        return f"{self.name} - £{self.price:.2f}"

class ShippedProduct(Product):
    def __init__(self, sku, name, price, weight_kg):
        super().__init__(sku, name, price)
        self.weight_kg = weight_kg

    def label(self):
        return super().label() + f" ({self.weight_kg} kg)"

class DigitalProduct(Product):
    def label(self):
        return f"{self.name} - download"

for item in [Product("GFT-00001", "Gift wrap", 2.5), ShippedProduct("SPO-11681", "Yoga mat", 31.0, 1.2), DigitalProduct("DIG-30115", "Python Basics (e-book)", 12.0)]:
    print(item.label())
`,
        output: "Gift wrap - £2.50\nYoga mat - £31.00 (1.2 kg)\nPython Basics (e-book) - download\n",
        note: "ShippedProduct **extends** both methods: its `__init__` lets the parent store the first three attributes, and its `label` reuses the parent's text. DigitalProduct **replaces** `label` entirely. `:.2f` shows the price with two decimals.",
      },
      {
        kind: "error-example",
        title: "Forgetting super().__init__",
        code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

class ShippedProduct(Product):
    def __init__(self, sku, name, price, weight_kg):
        self.weight_kg = weight_kg

mat = ShippedProduct("SPO-11681", "Yoga mat", 31.0, 1.2)
print(mat.weight_kg)
print(mat.name)
`,
        error: "AttributeError",
        output: "1.2\n",
        note: "The subclass `__init__` replaced the parent's, and nothing called it, so `sku`, `name` and `price` were never stored: `AttributeError: 'ShippedProduct' object has no attribute 'name'`.",
      },
      {
        kind: "example",
        title: "Order totals with discounts on top",
        code: src`
class Order:
    def __init__(self, order_id, lines):
        self.order_id = order_id
        self.lines = lines

    def total(self):
        return round(sum(quantity * price for quantity, price in self.lines), 2)

class LoyaltyOrder(Order):
    def total(self):
        return round(super().total() * 0.95, 2)

class StaffOrder(Order):
    def __init__(self, order_id, lines, staff_id):
        super().__init__(order_id, lines)
        self.staff_id = staff_id

    def total(self):
        return round(super().total() * 0.7, 2)

lines = [(2, 17.92), (1, 4.99)]
for order in [Order("O1", lines), LoyaltyOrder("O2", lines), StaffOrder("O3", lines, "S014")]:
    print(type(order).__name__, order.total())
`,
        output: "Order 40.83\nLoyaltyOrder 38.79\nStaffOrder 28.58\n",
        note: "The rule for adding up lines lives only in `Order.total`. If it changes (say, a delivery charge is added), both discounted orders pick it up, because they call it with `super()` instead of repeating it.",
      },
      {
        kind: "text",
        md: "**When to use it:** override when a subclass genuinely does something different; extend with `super()` when it does the parent's job plus a little more.\n\n**Mistakes to avoid:** a subclass `__init__` without `super().__init__(...)` (above); copying the parent's method body instead of calling `super()`; misspelling the method name, which silently adds a new method instead of overriding; and changing what a method returns (a number in the parent, text in the child), which breaks code that uses the parent's contract.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Say it's express",
      prompt: "`ExpressShipment.describe()` should return the parent's description followed by `, express (next day)`. Right now it copies part of the parent's text and gets it wrong. Rewrite it so it calls the parent's `describe` with `super()`.",
      spec: [
        ["Method", "`ExpressShipment(\"O100282\", \"Houston\").describe()` → `'O100282 to Houston, express (next day)'`"],
      ],
      starter: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

    def describe(self):
        return f"{self.order_id} to {self.city}"

class ExpressShipment(Shipment):
    def describe(self):
        return f"{self.order_id}, express (next day)"

print(ExpressShipment("O100282", "Houston").describe())
`,
      answer: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

    def describe(self):
        return f"{self.order_id} to {self.city}"

class ExpressShipment(Shipment):
    def describe(self):
        return super().describe() + ", express (next day)"

print(ExpressShipment("O100282", "Houston").describe())
`,
      wrong: [
        {
          code: src`
class Shipment:
    def __init__(self, order_id, city):
        self.order_id = order_id
        self.city = city

    def describe(self):
        return f"{self.order_id} to {self.city}"

class ExpressShipment(Shipment):
    def describe(self):
        return super().describe + ", express (next day)"
`,
          fails: ["express"],
          why: "without brackets, `super().describe` is the method itself, not its text, so adding a text to it raises TypeError",
        },
      ],
      hints: [
        "The parent already builds the first part of the text.",
        "`super()` gives access to the parent's version of a method, for this same object.",
        "Add the extra text to what the parent's version returns.",
      ],
      task: {
        checks: [
          expr("express", "The express description", "result = ExpressShipment('O100282', 'Houston').describe()", "O100282 to Houston, express (next day)", { show: "ExpressShipment(\"O100282\", \"Houston\").describe()" }),
          expr("parent", "The parent is unchanged", "result = Shipment('O100918', 'Denver').describe()", "O100918 to Denver", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Business customers",
        prompt: "Some customers buy for a company. Write `BusinessCustomer`, a subclass of the given `Customer`, that also takes `company` and `vat_number`, and whose `display_name()` is the parent's display name followed by the company in brackets. A VAT number must start with two capital letters; otherwise raise `ValueError`.",
        spec: [
          ["Class", "`BusinessCustomer(customer_id, name, company, vat_number)`"],
          ["Attributes", "everything a Customer has, plus `company` and `vat_number`"],
          ["`display_name()`", "`\"Grace Walker (Walker & Co)\"`, built on `Customer.display_name()`"],
          ["Raises", "`ValueError` when `vat_number` doesn't start with two capital letters (`GB123456789` is fine)"],
        ],
        starter: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name.strip()

    def display_name(self):
        return self.name

grace = BusinessCustomer("C01338", " Grace Walker", "Walker & Co", "GB123456789")
print(grace.display_name(), grace.customer_id)
`,
        answer: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name.strip()

    def display_name(self):
        return self.name

class BusinessCustomer(Customer):
    def __init__(self, customer_id, name, company, vat_number):
        if not (vat_number[:2].isalpha() and vat_number[:2].isupper()):
            raise ValueError(f"bad VAT number: {vat_number!r}")
        super().__init__(customer_id, name)
        self.company = company
        self.vat_number = vat_number

    def display_name(self):
        return f"{super().display_name()} ({self.company})"

grace = BusinessCustomer("C01338", " Grace Walker", "Walker & Co", "GB123456789")
print(grace.display_name(), grace.customer_id)
`,
        alternatives: [
          src`
import re

class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name.strip()

    def display_name(self):
        return self.name

class BusinessCustomer(Customer):
    def __init__(self, customer_id, name, company, vat_number):
        super().__init__(customer_id, name)
        if re.match(r"[A-Z]{2}", vat_number) is None:
            raise ValueError("VAT number must start with a country code")
        self.company = company
        self.vat_number = vat_number

    def display_name(self):
        return super().display_name() + " (" + self.company + ")"
`,
        ],
        wrong: [
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name.strip()

    def display_name(self):
        return self.name

class BusinessCustomer(Customer):
    def __init__(self, customer_id, name, company, vat_number):
        if not (vat_number[:2].isalpha() and vat_number[:2].isupper()):
            raise ValueError("bad VAT number")
        self.customer_id = customer_id
        self.name = name
        self.company = company
        self.vat_number = vat_number

    def display_name(self):
        return f"{self.name} ({self.company})"
`,
            fails: ["display"],
            why: "the parent's code is copied instead of called, and the copy misses the `strip()`, so the name keeps its space",
          },
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name.strip()

    def display_name(self):
        return self.name

class BusinessCustomer(Customer):
    def __init__(self, customer_id, name, company, vat_number):
        super().__init__(customer_id, name)
        self.company = company
        self.vat_number = vat_number

    def display_name(self):
        return f"{super().display_name()} ({self.company})"
`,
            fails: ["lower", "vat"],
            why: "the VAT number is never checked",
          },
        ],
        hints: [
          "The subclass `__init__` takes four values; the parent knows what to do with the first two.",
          "Check the VAT number, call `super().__init__(...)` with the id and name, then store the two new attributes.",
          "`display_name` adds to what `super().display_name()` returns. `[:2]` gives the first two characters.",
        ],
        task: {
          checks: [
            expr("display", "Display name and inherited attributes", "_g = BusinessCustomer('C01338', ' Grace Walker', 'Walker & Co', 'GB123456789')\nresult = [_g.display_name(), _g.customer_id, _g.name, _g.vat_number, isinstance(_g, Customer)]", ["Grace Walker (Walker & Co)", "C01338", "Grace Walker", "GB123456789", true], { show: "BusinessCustomer(\"C01338\", \" Grace Walker\", \"Walker & Co\", \"GB123456789\")" }),
            raisesExpr("vat", "A VAT number without a country code", "BusinessCustomer('C1', 'Ana', 'Ana Ltd', '123456789')", "ValueError", { show: "BusinessCustomer(..., \"123456789\")" }),
            expr("parent", "Ordinary customers are unchanged", "result = Customer('C00077', 'Jamal Walker ').display_name()", "Jamal Walker", { hidden: true }),
            raisesExpr("lower", "A country code in lower case", "BusinessCustomer('C2', 'Ben', 'Ben plc', 'gb123')", "ValueError", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "An account with an overdraft",
        prompt: "The given `Account.withdraw` asks a separate method, `can_withdraw(amount)`, whether a withdrawal is allowed, and records every successful one in `history`. Write `OverdraftAccount(owner, balance, overdraft)`, which may go below zero by up to `overdraft`. Override **only** what has to change: the rule. Withdrawing, refusing and recording must stay in `Account`.",
        spec: [
          ["Class", "`OverdraftAccount(owner, balance, overdraft)`, a subclass of `Account`"],
          ["Rule", "a withdrawal is allowed while the balance afterwards is at least `-overdraft`"],
          ["Inherited", "`withdraw(amount)` (raises ValueError when not allowed) and `history`"],
        ],
        starter: src`
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
        self.history = []

    def can_withdraw(self, amount):
        return amount <= self.balance

    def withdraw(self, amount):
        if amount <= 0 or not self.can_withdraw(amount):
            raise ValueError(f"{self.owner}: can't withdraw {amount}")
        self.balance -= amount
        self.history.append(-amount)

nora = OverdraftAccount("Nora", 50, 100)
nora.withdraw(120)
print(nora.balance, nora.history)
`,
        answer: src`
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
        self.history = []

    def can_withdraw(self, amount):
        return amount <= self.balance

    def withdraw(self, amount):
        if amount <= 0 or not self.can_withdraw(amount):
            raise ValueError(f"{self.owner}: can't withdraw {amount}")
        self.balance -= amount
        self.history.append(-amount)

class OverdraftAccount(Account):
    def __init__(self, owner, balance, overdraft):
        super().__init__(owner, balance)
        self.overdraft = overdraft

    def can_withdraw(self, amount):
        return self.balance - amount >= -self.overdraft

nora = OverdraftAccount("Nora", 50, 100)
nora.withdraw(120)
print(nora.balance, nora.history)
`,
        alternatives: [
          src`
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
        self.history = []

    def can_withdraw(self, amount):
        return amount <= self.balance

    def withdraw(self, amount):
        if amount <= 0 or not self.can_withdraw(amount):
            raise ValueError(f"{self.owner}: can't withdraw {amount}")
        self.balance -= amount
        self.history.append(-amount)

class OverdraftAccount(Account):
    def __init__(self, owner, balance, overdraft):
        super().__init__(owner, balance)
        self.overdraft = overdraft

    def can_withdraw(self, amount):
        return amount <= self.balance + self.overdraft
`,
        ],
        wrong: [
          {
            code: src`
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
        self.history = []

    def can_withdraw(self, amount):
        return amount <= self.balance

    def withdraw(self, amount):
        if amount <= 0 or not self.can_withdraw(amount):
            raise ValueError(f"{self.owner}: can't withdraw {amount}")
        self.balance -= amount
        self.history.append(-amount)

class OverdraftAccount(Account):
    def __init__(self, owner, balance, overdraft):
        super().__init__(owner, balance)
        self.overdraft = overdraft

    def withdraw(self, amount):
        if self.balance - amount < -self.overdraft:
            raise ValueError("over the limit")
        self.balance -= amount
`,
            fails: ["history", "negative"],
            why: "overriding all of `withdraw` drops the parent's other rule (positive amounts only) and its history",
          },
          {
            code: src`
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance
        self.history = []

    def can_withdraw(self, amount):
        return amount <= self.balance

    def withdraw(self, amount):
        if amount <= 0 or not self.can_withdraw(amount):
            raise ValueError(f"{self.owner}: can't withdraw {amount}")
        self.balance -= amount
        self.history.append(-amount)

class OverdraftAccount(Account):
    def __init__(self, owner, balance, overdraft):
        super().__init__(owner, balance)
        self.overdraft = overdraft

    def can_withdraw(self, amount):
        return self.balance - amount > -self.overdraft
`,
            fails: ["exact"],
            why: "`>` refuses a withdrawal that uses exactly the whole overdraft",
          },
        ],
        hints: [
          "The subclass needs one more attribute, so it needs an `__init__` that calls the parent's.",
          "`withdraw` already asks `self.can_withdraw(amount)`. Because `self` is an OverdraftAccount, overriding `can_withdraw` changes the rule `withdraw` uses.",
          "The rule: the balance after the withdrawal may go down to minus the overdraft, inclusive.",
        ],
        task: {
          checks: [
            expr("history", "A withdrawal into the overdraft", "_a = OverdraftAccount('Nora', 50, 100)\n_a.withdraw(120)\nresult = [_a.balance, _a.history, isinstance(_a, Account)]", [-70, [-120], true], { show: "OverdraftAccount(\"Nora\", 50, 100).withdraw(120)" }),
            raisesExpr("refused", "Beyond the overdraft is refused", "_a = OverdraftAccount('Nora', 50, 100)\n_a.withdraw(151)", "ValueError", { show: "OverdraftAccount(\"Nora\", 50, 100).withdraw(151)" }),
            expr("exact", "Exactly the whole overdraft", "_a = OverdraftAccount('Jamal', 20, 30)\n_a.withdraw(50)\nresult = _a.balance", -30, { hidden: true }),
            raisesExpr("negative", "A negative amount is still refused", "OverdraftAccount('Grace', 10, 10).withdraw(-5)", "ValueError", { hidden: true }),
            expr("plain", "An ordinary account is unchanged", "_a = Account('Theo', 40)\ntry:\n    _a.withdraw(41)\n    _r = 'allowed'\nexcept ValueError:\n    _r = 'refused'\nresult = [_r, _a.balance]", ["refused", 40], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Report:
    def title(self):
        return "Sales"

    def heading(self):
        return "== " + self.title() + " =="

class WeeklyReport(Report):
    def title(self):
        return super().title() + " (week 42)"

print(Report().heading())
print(WeeklyReport().heading())
`,
        choices: ["== Sales ==\n== Sales (week 42) ==", "== Sales ==\n== Sales ==", "== Sales ==\nSales (week 42)", "== Sales (week 42) ==\n== Sales (week 42) =="],
        answer: 0,
        why: "`heading` is inherited, but inside it `self.title()` is looked up on the actual object. For a WeeklyReport that finds the override, which extends the parent's title with `super()`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a misspelt override. What does this print?",
        program: src`
class Product:
    def __init__(self, price):
        self.price = price

    def shipping_cost(self):
        return 3.5

class HeavyProduct(Product):
    def shiping_cost(self):
        return 12.0

print(HeavyProduct(80.0).shipping_cost())
`,
        choices: ["3.5", "12.0", "AttributeError", "15.5"],
        answer: 0,
        why: "`shiping_cost` is a new method with a different name, so nothing overrides `shipping_cost` and the parent's 3.5 is used. Python doesn't warn you; a test of the subclass would.",
      },
      {
        id: "q3",
        prompt: "A subclass adds one attribute in its own `__init__`. What must that `__init__` do?",
        choices: [
          "Call super().__init__(...) with the parent's arguments, then set the new attribute",
          "Nothing special: the parent's __init__ also runs automatically",
          "Copy every line of the parent's __init__",
          "Call Parent() to make a parent object",
        ],
        answer: 0,
        why: "Defining `__init__` in the subclass replaces the parent's. Only `super().__init__(...)` makes the parent's setup run for this object.",
      },
    ],
    review: [
      "A method with the parent's name in the subclass overrides it.",
      "`super().method(...)` runs the parent's version on the same object, so an override can extend instead of copy.",
      "A subclass `__init__` must call `super().__init__(...)`.",
      "Next: calling the same method on objects of different classes, and letting each class decide.",
    ],
  },

  // ------------------------------------------------------------------ PY-L27-03 polymorphism
  {
    id: "PY-L27-03",
    version: 2,
    slug: "one-call-two-classes",
    title: "Polymorphism: one call, many classes",
    lede: "When several classes offer a method with the same name and meaning, code can call it without knowing which class it has. Each object runs its own version, and new kinds can be added without touching the caller.",
    focus: "Call one method on objects of different classes and let each class supply its own behaviour, instead of branching on the type.",
    minutes: 18,
    objectives: [
      "Give several classes a method with the same name, parameters and meaning",
      "Write code that calls that method without checking which class it has",
      "Add a new class that works with existing code without changing that code",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "dict-comp", "dict-iterate", "dict-literal", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "json-dumps", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "newline-escape", "plain-class", "precedence", "print-call", "print-number", "print-several", "print-text", "reassignment", "self-name", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "type-call", "unquoted-name"],
    teaches: ["poly-call"],
    blocks: [
      {
        kind: "text",
        md: "Delivery costs work differently for standard, express and collect-in-store. One way to write the quote is a chain: `if isinstance(option, StandardDelivery): … elif isinstance(option, ExpressDelivery): …`. Every new delivery option means editing that chain, and every other place with a similar chain.\n\nThe alternative: each class has a method with the **same name and meaning**, `cost(weight_kg)`. The caller just calls `option.cost(weight)`, and Python runs the method of whichever class the object belongs to. This is **polymorphism**: one call, many forms.\n\nThe classes don't even need a common parent. Python only needs the object to have the method when it is called (this is called *duck typing*: if it has `cost`, it can be quoted).",
      },
      {
        kind: "example",
        title: "Three ways to deliver",
        code: src`
class StandardDelivery:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class ExpressDelivery:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class CollectInStore:
    def cost(self, weight_kg):
        return 0.0

def quotes(options, weight_kg):
    for option in options:
        print(type(option).__name__, round(option.cost(weight_kg), 2))

quotes([StandardDelivery(), ExpressDelivery(), CollectInStore()], 4.0)
`,
        output: "StandardDelivery 6.0\nExpressDelivery 10.0\nCollectInStore 0.0\n",
        note: "`quotes` contains no `if` about kinds of delivery. Adding a fourth option means writing one class; `quotes` doesn't change.",
      },
      {
        kind: "example",
        title: "Notifications through any channel",
        code: src`
class EmailChannel:
    def __init__(self, address):
        self.address = address

    def send(self, message):
        return f"email to {self.address}: {message}"

class SmsChannel:
    def __init__(self, number):
        self.number = number

    def send(self, message):
        return f"sms to {self.number}: {message[:20]}"

class WebhookChannel:
    def __init__(self, url):
        self.url = url

    def send(self, message):
        return f"POST {self.url} {{\"text\": \"{message}\"}}"

def notify(channels, message):
    receipts = []
    for channel in channels:
        receipts.append(channel.send(message))
    return receipts

channels = [EmailChannel("nora_garcia@fastmail.com"), SmsChannel("+44 7700 900123"), WebhookChannel("https://hooks.example.com/orders")]
for receipt in notify(channels, "Order O100282 has shipped"):
    print(receipt)
`,
        output: "email to nora_garcia@fastmail.com: Order O100282 has shipped\nsms to +44 7700 900123: Order O100282 has sh\nPOST https://hooks.example.com/orders {\"text\": \"Order O100282 has shipped\"}\n",
        note: "Each channel keeps its own details (an address, a number, a URL) and its own way of sending; the SMS one cuts long messages. `notify` treats them all alike. (Here `send` only builds the text it would send, so the example runs anywhere.) `{{` in an f-string is a literal brace.",
      },
      {
        kind: "error-example",
        title: "A class with a different method name",
        code: src`
class EmailChannel:
    def send(self, message):
        return "email: " + message

class PrinterChannel:
    def print_message(self, message):
        return "printed: " + message

for channel in [EmailChannel(), PrinterChannel()]:
    print(channel.send("Order O100282 has shipped"))
`,
        error: "AttributeError",
        output: "email: Order O100282 has shipped\n",
        note: "Polymorphism needs the same name and the same meaning. PrinterChannel calls its method something else, so the shared call fails: `AttributeError: 'PrinterChannel' object has no attribute 'send'`.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever you find yourself writing `if isinstance(x, A) … elif isinstance(x, B) …` to decide what to do. Move each branch into a method of its class.\n\n**Mistakes to avoid:** methods with the same name but different parameters or return types (`cost()` returning a number in one class and text in another); one class printing where the others return; and keeping a type check in the caller \"just in case\", which defeats the point.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A new option, no changes elsewhere",
      prompt: "Add a delivery option `PickupPoint` that costs a flat 1.50 whatever the weight. `cheapest` must then choose it without being changed.",
      spec: [
        ["Class", "`PickupPoint` with `cost(weight_kg)` returning 1.5"],
        ["Unchanged", "`cheapest(options, weight_kg)` returns the class name of the cheapest option"],
      ],
      starter: src`
class StandardDelivery:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class ExpressDelivery:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

def cheapest(options, weight_kg):
    best = options[0]
    for option in options:
        if option.cost(weight_kg) < best.cost(weight_kg):
            best = option
    return type(best).__name__

print(cheapest([StandardDelivery(), ExpressDelivery()], 4.0))
`,
      answer: src`
class StandardDelivery:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class ExpressDelivery:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class PickupPoint:
    def cost(self, weight_kg):
        return 1.5

def cheapest(options, weight_kg):
    best = options[0]
    for option in options:
        if option.cost(weight_kg) < best.cost(weight_kg):
            best = option
    return type(best).__name__

print(cheapest([StandardDelivery(), ExpressDelivery(), PickupPoint()], 4.0))
`,
      wrong: [
        {
          code: src`
class StandardDelivery:
    def cost(self, weight_kg):
        return 3.5 if weight_kg <= 2 else 3.5 + (weight_kg - 2) * 1.25

class ExpressDelivery:
    def cost(self, weight_kg):
        return 8.0 + weight_kg * 0.5

class PickupPoint:
    def price(self, weight_kg):
        return 1.5

def cheapest(options, weight_kg):
    best = options[0]
    for option in options:
        if option.cost(weight_kg) < best.cost(weight_kg):
            best = option
    return type(best).__name__
`,
          fails: ["cost", "chosen"],
          why: "the method is called `price`, so the shared `cost` call fails on it",
        },
      ],
      hints: [
        "The new class needs the same method as the other two: same name, same parameter.",
        "Its cost doesn't depend on the weight, but it still accepts the weight.",
        "`cheapest` stays as it is.",
      ],
      task: {
        checks: [
          expr("cost", "PickupPoint costs 1.50", "result = [PickupPoint().cost(0.5), PickupPoint().cost(30)]", [1.5, 1.5], { show: "PickupPoint().cost(0.5), PickupPoint().cost(30)" }),
          expr("chosen", "cheapest() picks it", "result = cheapest([StandardDelivery(), PickupPoint(), ExpressDelivery()], 4.0)", "PickupPoint", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The best discount",
        prompt: "A checkout may offer several discounts and gives the customer the best one. Write two discount classes with the same method, `apply(total)`, returning the total after the discount: `PercentOff(rate)` (0.1 means 10% off) and `AmountOff(amount)` (never below 0). Then write `best_total(total, discounts)`, returning the lowest total any discount gives, or the total unchanged when there are none.",
        spec: [
          ["Classes", "`PercentOff(rate)` and `AmountOff(amount)`, each with `apply(total)`"],
          ["`AmountOff`", "`max(total - amount, 0)`"],
          ["`best_total(total, discounts)`", "the smallest result of `apply`, rounded to 2 places; `total` when the list is empty"],
          ["Example", "`best_total(80.0, [PercentOff(0.1), AmountOff(10)])` → 70.0"],
        ],
        starter: src`
class PercentOff:
    pass

class AmountOff:
    pass

def best_total(total, discounts):
    return total

print(best_total(80.0, [PercentOff(0.1), AmountOff(10)]))
print(best_total(200.0, [PercentOff(0.1), AmountOff(10)]))
`,
        answer: src`
class PercentOff:
    def __init__(self, rate):
        self.rate = rate

    def apply(self, total):
        return total * (1 - self.rate)

class AmountOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return max(total - self.amount, 0)

def best_total(total, discounts):
    best = total
    for discount in discounts:
        best = min(best, discount.apply(total))
    return round(best, 2)

print(best_total(80.0, [PercentOff(0.1), AmountOff(10)]))
print(best_total(200.0, [PercentOff(0.1), AmountOff(10)]))
`,
        alternatives: [
          src`
class PercentOff:
    def __init__(self, rate):
        self.rate = rate

    def apply(self, total):
        return total - total * self.rate

class AmountOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return total - self.amount if total > self.amount else 0

def best_total(total, discounts):
    return round(min([total] + [d.apply(total) for d in discounts]), 2)
`,
        ],
        wrong: [
          {
            code: src`
class PercentOff:
    def __init__(self, rate):
        self.rate = rate

    def apply(self, total):
        return total * (1 - self.rate)

class AmountOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return total - self.amount

def best_total(total, discounts):
    best = total
    for discount in discounts:
        best = min(best, discount.apply(total))
    return round(best, 2)
`,
            fails: ["floor"],
            why: "an amount larger than the total gives a negative price",
          },
          {
            code: src`
class PercentOff:
    def __init__(self, rate):
        self.rate = rate

    def apply(self, total):
        return total * (1 - self.rate)

class AmountOff:
    def __init__(self, amount):
        self.amount = amount

    def apply(self, total):
        return max(total - self.amount, 0)

def best_total(total, discounts):
    for discount in discounts:
        total = discount.apply(total)
    return round(total, 2)
`,
            fails: ["best", "many"],
            why: "every discount is applied one after another, stacking them, instead of choosing the single best one",
          },
        ],
        hints: [
          "Each class stores its own setting in `__init__` and offers `apply(total)`.",
          "`best_total` doesn't need to know which kind of discount it has: call `apply` on each, with the original total.",
          "Keep the smallest result, starting from the undiscounted total.",
        ],
        task: {
          checks: [
            expr("best", "The better of two discounts", "result = [best_total(80.0, [PercentOff(0.1), AmountOff(10)]), best_total(200.0, [PercentOff(0.1), AmountOff(10)])]", [py.float(70), py.float(180)], { show: "best_total(80.0, ...), best_total(200.0, ...)" }),
            expr("none", "No discounts", "result = best_total(45.5, [])", 45.5, { hidden: true }),
            expr("floor", "A discount larger than the total", "result = best_total(6.0, [AmountOff(10)])", 0, { hidden: true }),
            expr("many", "Several of each kind", "result = best_total(120.0, [PercentOff(0.05), AmountOff(15), PercentOff(0.15), AmountOff(5)])", py.float(102), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Export in any format",
        prompt: "A report can be exported as CSV or JSON. Write two exporter classes with the same interface: a class attribute `EXTENSION` and a method `render(rows)` that turns a list of dictionaries into text. Then write `export_all(rows, exporters)` returning a dictionary from each exporter's extension to its text.",
        spec: [
          ["`CsvExporter`", "`EXTENSION = \"csv\"`; `render` writes a header from the first row's keys and one line per row with `csv.DictWriter(..., lineterminator=\"\\n\")`; no rows → `\"\"`"],
          ["`JsonExporter`", "`EXTENSION = \"json\"`; `render` returns `json.dumps(rows)`"],
          ["`export_all(rows, exporters)`", "`{\"csv\": …, \"json\": …}` for whichever exporters are given"],
          ["Hint", "`io.StringIO()` is a text \"file\" in memory: write to it, then `getvalue()`"],
        ],
        starter: src`
import csv
import io
import json

class CsvExporter:
    pass

class JsonExporter:
    pass

def export_all(rows, exporters):
    return {}

rows = [{"sku": "SPO-11681", "name": "Yoga mat, blue", "price": 31.0}, {"sku": "HOM-22847", "name": "Desk lamp", "price": 48.0}]
for extension, text in export_all(rows, [CsvExporter(), JsonExporter()]).items():
    print(extension)
    print(text)
`,
        answer: src`
import csv
import io
import json

class CsvExporter:
    EXTENSION = "csv"

    def render(self, rows):
        if not rows:
            return ""
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
        return out.getvalue()

class JsonExporter:
    EXTENSION = "json"

    def render(self, rows):
        return json.dumps(rows)

def export_all(rows, exporters):
    files = {}
    for exporter in exporters:
        files[exporter.EXTENSION] = exporter.render(rows)
    return files

rows = [{"sku": "SPO-11681", "name": "Yoga mat, blue", "price": 31.0}, {"sku": "HOM-22847", "name": "Desk lamp", "price": 48.0}]
for extension, text in export_all(rows, [CsvExporter(), JsonExporter()]).items():
    print(extension)
    print(text)
`,
        alternatives: [
          src`
import csv
import io
import json

class CsvExporter:
    EXTENSION = "csv"

    def render(self, rows):
        buffer = io.StringIO()
        if rows:
            writer = csv.DictWriter(buffer, fieldnames=rows[0].keys(), lineterminator="\n")
            writer.writeheader()
            for row in rows:
                writer.writerow(row)
        return buffer.getvalue()

class JsonExporter:
    EXTENSION = "json"

    def render(self, rows):
        return json.dumps(rows)

def export_all(rows, exporters):
    return {e.EXTENSION: e.render(rows) for e in exporters}
`,
        ],
        wrong: [
          {
            code: src`
import json

class CsvExporter:
    EXTENSION = "csv"

    def render(self, rows):
        if not rows:
            return ""
        lines = [",".join(rows[0])]
        for row in rows:
            lines.append(",".join(str(value) for value in row.values()))
        return "\n".join(lines) + "\n"

class JsonExporter:
    EXTENSION = "json"

    def render(self, rows):
        return json.dumps(rows)

def export_all(rows, exporters):
    return {e.EXTENSION: e.render(rows) for e in exporters}
`,
            fails: ["csv"],
            why: "joining with commas by hand doesn't quote a name that contains a comma, so the CSV gains a column",
          },
          {
            code: src`
import csv
import io
import json

class CsvExporter:
    EXTENSION = "csv"

    def render(self, rows):
        if not rows:
            return ""
        out = io.StringIO()
        writer = csv.DictWriter(out, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
        return out.getvalue()

class JsonExporter:
    EXTENSION = "json"

    def render(self, rows):
        return json.dumps(rows)

def export_all(rows, exporters):
    files = {}
    for exporter in exporters:
        if isinstance(exporter, CsvExporter):
            files["csv"] = exporter.render(rows)
        elif isinstance(exporter, JsonExporter):
            files["json"] = exporter.render(rows)
    return files
`,
            fails: ["new-format"],
            why: "`export_all` checks for the two known classes, so a third exporter is silently ignored",
          },
        ],
        hints: [
          "Both classes have the same two things: an `EXTENSION` class attribute and a `render(rows)` method.",
          "For CSV, write into an `io.StringIO()` with `csv.DictWriter`, using the first row's keys as field names; the csv module quotes values that contain commas.",
          "`export_all` reads `exporter.EXTENSION` and calls `exporter.render(rows)` without asking which class it is.",
        ],
        task: {
          checks: [
            expr("csv", "CSV text, with quoting", "result = CsvExporter().render([{'sku': 'SPO-11681', 'name': 'Yoga mat, blue', 'price': 31.0}, {'sku': 'HOM-22847', 'name': 'Desk lamp', 'price': 48.0}])", "sku,name,price\nSPO-11681,\"Yoga mat, blue\",31.0\nHOM-22847,Desk lamp,48.0\n", { show: "CsvExporter().render(rows)" }),
            expr("json", "JSON text", "result = JsonExporter().render([{'sku': 'A', 'qty': 2}])", "[{\"sku\": \"A\", \"qty\": 2}]", { show: "JsonExporter().render([{\"sku\": \"A\", \"qty\": 2}])" }),
            expr("all", "Both formats at once", "_files = export_all([{'sku': 'A', 'qty': 2}], [CsvExporter(), JsonExporter()])\nresult = _files", { csv: "sku,qty\nA,2\n", json: "[{\"sku\": \"A\", \"qty\": 2}]" }, { hidden: true }),
            expr("new-format", "A third exporter works without changes", "class _Tsv:\n    EXTENSION = 'tsv'\n    def render(self, rows):\n        return 'sku\\tqty\\n'\nresult = export_all([{'sku': 'A', 'qty': 2}], [_Tsv(), JsonExporter()])", { tsv: "sku\tqty\n", json: "[{\"sku\": \"A\", \"qty\": 2}]" }, { hidden: true }),
            expr("empty", "No rows", "result = [CsvExporter().render([]), JsonExporter().render([])]", ["", "[]"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Card:
    def fee(self, amount):
        return round(amount * 0.015, 2)

class BankTransfer:
    def fee(self, amount):
        return 0.2

class Voucher:
    def fee(self, amount):
        return 0

payments = [(Card(), 40.0), (BankTransfer(), 40.0), (Voucher(), 15.0), (Card(), 100.0)]
total_fees = 0
for method, amount in payments:
    total_fees += method.fee(amount)
print(round(total_fees, 2))
`,
        choices: ["2.3", "2.1", "0.8", "1.7"],
        answer: 0,
        why: "Each object answers with its own `fee`: 0.6 for the first card payment, 0.2 for the transfer, 0 for the voucher and 1.5 for the second card payment, which adds up to 2.3.",
      },
      {
        id: "q2",
        prompt: "A common mistake: one class prints instead of returning. What does this print?",
        program: src`
class Standard:
    def cost(self, kg):
        return 3.5

class Express:
    def cost(self, kg):
        print(8.0)

try:
    print(sum(option.cost(2) for option in [Standard(), Express()]))
except TypeError:
    print("TypeError")
`,
        choices: ["8.0\nTypeError", "11.5", "TypeError", "3.5\n8.0"],
        answer: 0,
        why: "Express prints 8.0 and returns None, and adding None to a number is a TypeError. Polymorphic methods must keep the same contract: here, return a number.",
      },
      {
        id: "q3",
        prompt: "A function has `if isinstance(m, Card): … elif isinstance(m, Voucher): … elif isinstance(m, BankTransfer): …` to work out fees. What is the polymorphic alternative?",
        choices: [
          "Give each payment class a fee(amount) method and call m.fee(amount)",
          "Add another elif for each new payment type",
          "Store the fee rules in the function's docstring",
          "Make every payment class a subclass of Card",
        ],
        answer: 0,
        why: "Moving each branch into its class means a new payment type is one new class, and the calling code never changes.",
      },
    ],
    review: [
      "Classes that offer the same method (same name, parameters and meaning) can be used interchangeably.",
      "The caller calls the method; each object runs its own version. No isinstance chain is needed.",
      "New kinds are added as new classes, without editing the code that uses them.",
      "Next: objects that hold other objects and hand work to them.",
    ],
  },

  // ------------------------------------------------------------------ PY-L27-04 composition
  {
    id: "PY-L27-04",
    version: 2,
    slug: "objects-that-hold-objects",
    title: "Composition: objects that hold objects",
    lede: "An order has a customer and lines; a customer has an address. Storing objects as attributes of other objects builds a model of the real thing, and each object does its own part of the work.",
    focus: "Store objects as attributes of other objects, read through them (order.customer.email), and delegate work to the parts.",
    minutes: 18,
    objectives: [
      "Build objects from other objects: an Order that holds a Customer and OrderLines",
      "Read through the parts (`order.customer.address.city`) and handle a missing part",
      "Delegate work to the parts, and swap a part to change behaviour",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comp-if", "comparison", "conditional-expr", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "json-dumps", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "print-several", "raise-stmt", "self-name", "string-format", "string-index", "top-level-indent"],
    teaches: ["part-attr"],
    blocks: [
      {
        kind: "text",
        md: "An order isn't a kind of customer, and an order line isn't a kind of order: these objects **have** each other. An Order holds a Customer object and a list of OrderLine objects; a Customer holds an Address. This is **composition**: building an object out of other objects.\n\nYou reach the parts with a chain of dots: `order.customer.address.city`. Each part keeps its own job: the line knows its amount, the order adds up its lines by asking each one (**delegation**), and nothing has to know how the others work inside.",
      },
      {
        kind: "example",
        title: "An order with its customer and lines",
        code: src`
class Address:
    def __init__(self, street, city, postcode):
        self.street = street
        self.city = city
        self.postcode = postcode

class Customer:
    def __init__(self, customer_id, name, email, address):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.address = address

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    def amount(self):
        return self.quantity * self.unit_price

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

    def total(self):
        return round(sum(line.amount() for line in self.lines), 2)

    def shipping_label(self):
        address = self.customer.address
        return f"{self.customer.name}, {address.street}, {address.city} {address.postcode}"

home = Address("12 Bank Street", "Houston", "77002")
jamal = Customer("C00077", "Jamal Walker", "jamal.walker62@icloud.com", home)
order = Order("O100282", jamal, [OrderLine("SPO-11681", 2, 17.92), OrderLine("HOM-22847", 1, 4.99)])
print(order.total())
print(order.shipping_label())
print(order.customer.address.city)
`,
        output: "40.83\nJamal Walker, 12 Bank Street, Houston 77002\nHouston\n",
        note: "`Order.total` asks every line for its `amount()` instead of reaching into its quantity and price. If a line's pricing rule changes (a discount, say), only OrderLine changes.",
      },
      {
        kind: "error-example",
        title: "A part that isn't there",
        code: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Order:
    def __init__(self, order_id, customer):
        self.order_id = order_id
        self.customer = customer

orders = [Order("O100282", Customer("C00077", "jamal.walker62@icloud.com")), Order("O100918", None)]
for order in orders:
    print(order.order_id, order.customer.email)
`,
        error: "AttributeError",
        output: "O100282 jamal.walker62@icloud.com\n",
        note: "A guest checkout has no customer object, so `order.customer` is None and the chain breaks: `AttributeError: 'NoneType' object has no attribute 'email'`. When a part is optional, check `if order.customer is None` before reading through it.",
      },
      {
        kind: "text",
        md: "Because a part is just an attribute, it can be **swapped**. A Shipment that holds a carrier object and asks it for a quote works with any carrier that has a `quote` method (polymorphism, the Inheritance & Composition module), and changing carrier is one assignment.",
      },
      {
        kind: "example",
        title: "Change carrier, keep the shipment",
        code: src`
class FlatRateCarrier:
    def __init__(self, name, rate):
        self.name = name
        self.rate = rate

    def quote(self, weight_kg):
        return self.rate

class PerKiloCarrier:
    def __init__(self, name, base, per_kg):
        self.name = name
        self.base = base
        self.per_kg = per_kg

    def quote(self, weight_kg):
        return round(self.base + self.per_kg * weight_kg, 2)

class Shipment:
    def __init__(self, order_id, weight_kg, carrier):
        self.order_id = order_id
        self.weight_kg = weight_kg
        self.carrier = carrier

    def cost(self):
        return self.carrier.quote(self.weight_kg)

parcel = Shipment("O100282", 3.5, FlatRateCarrier("RoyalPost", 4.2))
print(parcel.carrier.name, parcel.cost())
parcel.carrier = PerKiloCarrier("FastFreight", 2.0, 0.8)
print(parcel.carrier.name, parcel.cost())
`,
        output: "RoyalPost 4.2\nFastFreight 4.8\n",
        note: "`Shipment.cost` delegates to whatever carrier it holds. Neither carrier inherits from anything; each only has to offer `quote`.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever one thing *has* another: orders have lines, customers have addresses, shipments have carriers. **Mistakes to avoid:** long chains in code far away from the objects (`a.b.c.d.e`), which tie that code to every class in the chain (give the outer object a method instead, like `shipping_label`); reading through an optional part without checking for None; and storing copies of a part's data (the customer's email copied onto the order) that go stale when the part changes.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Email for guests and customers",
      prompt: "Give `Order` a method `contact_email()` that returns the customer's email, or `None` for a guest order, which has no customer (`customer` is None).",
      spec: [
        ["Method", "`order.contact_email()` → `order.customer.email`, or None when there is no customer"],
      ],
      starter: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Order:
    def __init__(self, order_id, customer):
        self.order_id = order_id
        self.customer = customer

for order in [Order("O100282", Customer("C00077", "jamal.walker62@icloud.com")), Order("O100918", None)]:
    print(order.order_id)
`,
      answer: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Order:
    def __init__(self, order_id, customer):
        self.order_id = order_id
        self.customer = customer

    def contact_email(self):
        if self.customer is None:
            return None
        return self.customer.email

for order in [Order("O100282", Customer("C00077", "jamal.walker62@icloud.com")), Order("O100918", None)]:
    print(order.order_id, order.contact_email())
`,
      wrong: [
        {
          code: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class Order:
    def __init__(self, order_id, customer):
        self.order_id = order_id
        self.customer = customer

    def contact_email(self):
        return self.customer.email
`,
          fails: ["guest"],
          why: "a guest order has no customer, so reading `.email` through None raises AttributeError",
        },
      ],
      hints: [
        "The method reads through the order's customer part.",
        "Check for the missing part before reading through it.",
        "Use `is None` for the check, and return None in that case.",
      ],
      task: {
        checks: [
          expr("customer", "An order with a customer", "result = Order('O100282', Customer('C00077', 'jamal.walker62@icloud.com')).contact_email()", "jamal.walker62@icloud.com", { show: "Order(\"O100282\", <Jamal>).contact_email()" }),
          expr("guest", "A guest order", "result = Order('O100918', None).contact_email()", null, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A warehouse of stock items",
        prompt: "The `StockItem` class is given. Write `Warehouse(name)`, which holds StockItem objects by SKU. `register(item)` adds one (a SKU registered twice is a `ValueError`); `value()` is the total of `on_hand × unit_cost` over all items; `low_stock()` lists, sorted, the SKUs whose items say they need reordering. Ask the items: don't repeat their rules in the warehouse.",
        spec: [
          ["`Warehouse(name)`", "attributes `name` and `items` (a dictionary from SKU to StockItem)"],
          ["`register(item)`", "stores the item under `item.sku`; ValueError if that SKU is already there"],
          ["`value()`", "sum of `item.on_hand * item.unit_cost`, rounded to 2 places"],
          ["`low_stock()`", "sorted SKUs of the items whose `needs_reorder()` is True"],
        ],
        starter: src`
class StockItem:
    def __init__(self, sku, on_hand, unit_cost, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.unit_cost = unit_cost
        self.reorder_level = reorder_level

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

class Warehouse:
    pass

houston = Warehouse("Houston")
houston.register(StockItem("SPO-11681", 12, 9.5, 5))
houston.register(StockItem("HOM-22847", 3, 21.0, 4))
print(houston.value(), houston.low_stock())
`,
        answer: src`
class StockItem:
    def __init__(self, sku, on_hand, unit_cost, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.unit_cost = unit_cost
        self.reorder_level = reorder_level

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

class Warehouse:
    def __init__(self, name):
        self.name = name
        self.items = {}

    def register(self, item):
        if item.sku in self.items:
            raise ValueError(f"{item.sku} is already in {self.name}")
        self.items[item.sku] = item

    def value(self):
        total = 0
        for item in self.items.values():
            total += item.on_hand * item.unit_cost
        return round(total, 2)

    def low_stock(self):
        return sorted(sku for sku, item in self.items.items() if item.needs_reorder())

houston = Warehouse("Houston")
houston.register(StockItem("SPO-11681", 12, 9.5, 5))
houston.register(StockItem("HOM-22847", 3, 21.0, 4))
print(houston.value(), houston.low_stock())
`,
        alternatives: [
          src`
class StockItem:
    def __init__(self, sku, on_hand, unit_cost, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.unit_cost = unit_cost
        self.reorder_level = reorder_level

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

class Warehouse:
    def __init__(self, name):
        self.name = name
        self.items = {}

    def register(self, item):
        if self.items.get(item.sku) is not None:
            raise ValueError("duplicate SKU")
        self.items[item.sku] = item

    def value(self):
        return round(sum(i.on_hand * i.unit_cost for i in self.items.values()), 2)

    def low_stock(self):
        low = [i.sku for i in self.items.values() if i.needs_reorder()]
        low.sort()
        return low
`,
        ],
        wrong: [
          {
            code: src`
class StockItem:
    def __init__(self, sku, on_hand, unit_cost, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.unit_cost = unit_cost
        self.reorder_level = reorder_level

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

class Warehouse:
    def __init__(self, name):
        self.name = name
        self.items = {}

    def register(self, item):
        if item.sku in self.items:
            raise ValueError("duplicate SKU")
        self.items[item.sku] = item

    def value(self):
        return round(sum(i.on_hand * i.unit_cost for i in self.items.values()), 2)

    def low_stock(self):
        return sorted(i.sku for i in self.items.values() if i.on_hand < i.reorder_level)
`,
            fails: ["low"],
            why: "the warehouse repeats the reorder rule itself, with `<` instead of the item's `<=`, so an item exactly at its level is missed",
          },
          {
            code: src`
class StockItem:
    def __init__(self, sku, on_hand, unit_cost, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.unit_cost = unit_cost
        self.reorder_level = reorder_level

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

class Warehouse:
    def __init__(self, name):
        self.name = name
        self.items = {}

    def register(self, item):
        self.items[item.sku] = item

    def value(self):
        return round(sum(i.on_hand * i.unit_cost for i in self.items.values()), 2)

    def low_stock(self):
        return sorted(i.sku for i in self.items.values() if i.needs_reorder())
`,
            fails: ["duplicate"],
            why: "registering a SKU twice silently replaces the first item",
          },
        ],
        hints: [
          "The warehouse's `__init__` creates its own dictionary of items.",
          "`register` checks the SKU before storing; `value` adds up over the stored items.",
          "`low_stock` asks each item `needs_reorder()` rather than comparing its numbers itself.",
        ],
        task: {
          checks: [
            expr("value", "Stock value and low stock", "_w = Warehouse('Houston')\n_w.register(StockItem('SPO-11681', 12, 9.5, 5))\n_w.register(StockItem('HOM-22847', 3, 21.0, 4))\nresult = [_w.value(), _w.low_stock(), _w.name]", [py.float(177), ["HOM-22847"], "Houston"], { show: "value() and low_stock() for two items" }),
            expr("low", "Items exactly at their reorder level", "_w = Warehouse('Denver')\n_w.register(StockItem('TOY-54564', 4, 2.0, 4))\n_w.register(StockItem('ELE-24781', 0, 80.0, 2))\n_w.register(StockItem('BOO-10233', 9, 3.0, 2))\nresult = _w.low_stock()", ["ELE-24781", "TOY-54564"], { hidden: true }),
            raisesExpr("duplicate", "The same SKU twice", "_w = Warehouse('X')\n_w.register(StockItem('A', 1, 1.0, 0))\n_w.register(StockItem('A', 5, 1.0, 0))", "ValueError", { hidden: true }),
            expr("empty", "An empty warehouse", "_w = Warehouse('Y')\nresult = [_w.value(), _w.low_stock()]", [0, []], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "An order as JSON-ready data",
        prompt: "An API returns orders as nested dictionaries. Give each class a `to_dict()` method and let the outer ones build their dictionaries from their parts' `to_dict()`, so each class decides what it exposes. `Customer` exposes its id and email; `OrderLine` its sku, quantity, unit price and amount; `Order` its id, the customer (or None for a guest), the lines and the total.",
        spec: [
          ["`Customer.to_dict()`", "`{\"customer_id\": …, \"email\": …}`"],
          ["`OrderLine.to_dict()`", "`{\"sku\": …, \"quantity\": …, \"unit_price\": …, \"amount\": …}` (amount rounded to 2 places)"],
          ["`Order.to_dict()`", "`{\"order_id\": …, \"customer\": <customer dict or None>, \"lines\": [<line dicts>], \"total\": <rounded to 2 places>}`"],
        ],
        starter: src`
import json

class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

order = Order("O100282", Customer("C00077", "jamal.walker62@icloud.com"), [OrderLine("SPO-11681", 2, 17.92)])
print(json.dumps(order.to_dict()))
`,
        answer: src`
import json

class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

    def to_dict(self):
        return {"customer_id": self.customer_id, "email": self.email}

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    def amount(self):
        return round(self.quantity * self.unit_price, 2)

    def to_dict(self):
        return {"sku": self.sku, "quantity": self.quantity, "unit_price": self.unit_price, "amount": self.amount()}

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

    def to_dict(self):
        customer = None if self.customer is None else self.customer.to_dict()
        lines = [line.to_dict() for line in self.lines]
        total = round(sum(line["amount"] for line in lines), 2)
        return {"order_id": self.order_id, "customer": customer, "lines": lines, "total": total}

order = Order("O100282", Customer("C00077", "jamal.walker62@icloud.com"), [OrderLine("SPO-11681", 2, 17.92)])
print(json.dumps(order.to_dict()))
`,
        alternatives: [
          src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

    def to_dict(self):
        return {"customer_id": self.customer_id, "email": self.email}

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    def to_dict(self):
        return {
            "sku": self.sku,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "amount": round(self.quantity * self.unit_price, 2),
        }

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

    def to_dict(self):
        data = {"order_id": self.order_id, "customer": None, "lines": [], "total": 0}
        if self.customer is not None:
            data["customer"] = self.customer.to_dict()
        for line in self.lines:
            data["lines"].append(line.to_dict())
            data["total"] += line.to_dict()["amount"]
        data["total"] = round(data["total"], 2)
        return data
`,
        ],
        wrong: [
          {
            code: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

    def to_dict(self):
        return {"customer_id": self.customer_id, "email": self.email}

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    def to_dict(self):
        return {"sku": self.sku, "quantity": self.quantity, "unit_price": self.unit_price, "amount": round(self.quantity * self.unit_price, 2)}

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

    def to_dict(self):
        lines = [line.to_dict() for line in self.lines]
        return {"order_id": self.order_id, "customer": self.customer.to_dict(), "lines": lines, "total": round(sum(l["amount"] for l in lines), 2)}
`,
            fails: ["guest"],
            why: "a guest order has no customer, so calling `to_dict()` on None fails",
          },
          {
            code: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

    def to_dict(self):
        return {"customer_id": self.customer_id, "email": self.email}

class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    def to_dict(self):
        return {"sku": self.sku, "quantity": self.quantity, "unit_price": self.unit_price, "amount": round(self.quantity * self.unit_price, 2)}

class Order:
    def __init__(self, order_id, customer, lines):
        self.order_id = order_id
        self.customer = customer
        self.lines = lines

    def to_dict(self):
        return {"order_id": self.order_id, "customer": self.customer, "lines": self.lines, "total": 0}
`,
            fails: ["order", "guest"],
            why: "the parts are put in as objects instead of their dictionaries, so the result can't be turned into JSON",
          },
        ],
        hints: [
          "Start with the innermost classes: each `to_dict` returns a dictionary of its own attributes.",
          "`Order.to_dict` asks its parts: the customer's `to_dict()` (unless there is none) and every line's `to_dict()`.",
          "Add up the lines' amounts for the total and round it.",
        ],
        task: {
          checks: [
            expr("order", "A full order as data", "import json as _json\n_o = Order('O100282', Customer('C00077', 'jamal.walker62@icloud.com'), [OrderLine('SPO-11681', 2, 17.92), OrderLine('HOM-22847', 1, 4.99)])\nresult = _json.loads(_json.dumps(_o.to_dict()))", { order_id: "O100282", customer: { customer_id: "C00077", email: "jamal.walker62@icloud.com" }, lines: [{ sku: "SPO-11681", quantity: 2, unit_price: 17.92, amount: 35.84 }, { sku: "HOM-22847", quantity: 1, unit_price: 4.99, amount: 4.99 }], total: 40.83 }, { show: "order.to_dict() for O100282" }),
            expr("guest", "A guest order", "_o = Order('O100918', None, [OrderLine('TOY-54564', 3, 0.1)])\nresult = _o.to_dict()", { order_id: "O100918", customer: null, lines: [{ sku: "TOY-54564", quantity: 3, unit_price: 0.1, amount: 0.3 }], total: 0.3 }, { hidden: true }),
            expr("parts", "Each part converts itself", "result = [Customer('C1', 'a@b.com').to_dict(), OrderLine('X', 1, 2.5).to_dict()]", [{ customer_id: "C1", email: "a@b.com" }, { sku: "X", quantity: 1, unit_price: 2.5, amount: 2.5 }], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Address:
    def __init__(self, city):
        self.city = city

class Customer:
    def __init__(self, name, address):
        self.name = name
        self.address = address

home = Address("Houston")
jamal = Customer("Jamal", home)
grace = Customer("Grace", home)
grace.address.city = "Austin"
print(jamal.address.city, grace.address is jamal.address)
`,
        choices: ["Austin True", "Houston False", "Houston True", "Austin False"],
        answer: 0,
        why: "Both customers hold the same Address object. Changing its city through Grace's reference changes it for Jamal too. Parts are shared by reference, just like any other object (see Classes & Objects).",
      },
      {
        id: "q2",
        prompt: "A common mistake: copying a part's data instead of keeping the part. What does this print?",
        program: src`
class Customer:
    def __init__(self, email):
        self.email = email

class Order:
    def __init__(self, order_id, customer):
        self.order_id = order_id
        self.email = customer.email

nora = Customer("nora@old-mail.com")
order = Order("O100282", nora)
nora.email = "nora_garcia@fastmail.com"
print(order.email)
`,
        choices: ["nora@old-mail.com", "nora_garcia@fastmail.com", "None", "AttributeError"],
        answer: 0,
        why: "The order copied the email text when it was created, so it doesn't see the customer's change. Keeping the customer object (`self.customer = customer`) and reading `order.customer.email` would always be current.",
      },
      {
        id: "q3",
        prompt: "Which is composition rather than inheritance?",
        choices: [
          "A Shipment that holds a carrier object and asks it for a quote",
          "class Book(Product)",
          "class CardDeclined(PaymentError)",
          "class LoyaltyOrder(Order) that overrides total()",
        ],
        answer: 0,
        why: "The shipment *has* a carrier and delegates to it. The other three are subclasses: each *is a* kind of its parent.",
      },
    ],
    review: [
      "Composition stores objects as attributes of other objects: an order has a customer and lines.",
      "Read through parts with dots, and check optional parts for None first.",
      "Delegate: the outer object asks its parts to do their own work, and parts can be swapped.",
      "Next: choosing between inheritance and composition.",
    ],
  },

  // ------------------------------------------------------------------ PY-L27-05 choosing
  {
    id: "PY-L27-05",
    version: 2,
    slug: "is-a-and-has-a",
    title: "Inheritance or composition?",
    lede: "Inherit when the new class truly is a kind of the parent and should work everywhere the parent does. When you only want some of another class's behaviour, hold an object of it and expose just what you need.",
    focus: "Choose between inheritance (is-a) and composition (has-a), and fix a class that inherits behaviour it shouldn't expose.",
    minutes: 18,
    objectives: [
      "Apply the is-a / has-a test to decide between a subclass and a part",
      "Recognise a subclass that inherits methods which break its own rules",
      "Rewrite such a class with composition, exposing only the operations it should allow",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "string-format", "string-index", "string-method", "string-slice", "subclass", "super-call", "top-level-indent", "try-except", "type-call", "unquoted-name", "value-count"],
    teaches: ["kind-link"],
    blocks: [
      {
        kind: "text",
        md: "Two questions decide it:\n\n- **Is it a kind of the parent?** A book is a product; a card payment is a payment. Then every method the parent has should make sense for the child, and code written for the parent should work unchanged with the child. Inherit.\n- **Does it only use the other class's behaviour?** An audit log stores entries in a list; a shipment uses a carrier. It *has* one. Hold an object and delegate.\n\nInheriting just to reuse code is a common mistake. The child gets **every** method of the parent, including ones that break its rules. An audit log must only ever grow, but a subclass of `list` also inherits `insert`, `remove` and `clear`.",
      },
      {
        kind: "example",
        title: "An audit log that inherits too much",
        code: src`
class AuditLog(list):
    def record(self, user, action):
        self.append(f"{user}: {action}")

log = AuditLog()
log.record("nora", "refund O100376")
log.record("jamal", "edit price SPO-11681")
log.insert(0, "admin: nothing happened")
log.remove("nora: refund O100376")
print(len(log), log[0])
`,
        output: "2 admin: nothing happened\n",
        note: "Nothing stops code from inserting a fake first entry or deleting the refund record: the class inherited `insert` and `remove` from list. For an audit log those operations are exactly what must be impossible.",
      },
      {
        kind: "text",
        md: "With composition the log **has** a list and offers only the operations an audit log should have. The list is still doing the storage, but nobody outside can call `insert` on it through the log.",
      },
      {
        kind: "example",
        title: "The same log, built with composition",
        code: src`
class AuditLog:
    def __init__(self):
        self.entries = []

    def record(self, user, action):
        self.entries.append(f"{user}: {action}")

    def latest(self, n):
        return self.entries[-n:]

    def count(self):
        return len(self.entries)

log = AuditLog()
log.record("nora", "refund O100376")
log.record("jamal", "edit price SPO-11681")
log.record("grace", "cancel O101219")
print(log.count(), log.latest(2))
print(hasattr(log, "insert"), hasattr(log, "remove"))
`,
        output: "3 ['jamal: edit price SPO-11681', 'grace: cancel O101219']\nFalse False\n",
        note: "The log's public operations are `record`, `latest` and `count`: nothing that edits history. `hasattr(obj, name)` reports whether an object has an attribute or method with that name. (Python can't stop determined code from reaching `log.entries`, but the class no longer offers editing as part of what it is.)",
      },
      {
        kind: "text",
        md: "**A practical rule:** prefer composition, and use inheritance when the is-a relationship is real and the child can honour every promise the parent makes. Composition also lets parts change at run time (swap a carrier, change an employee's role), which a class hierarchy can't.\n\n**Mistakes to avoid:** subclassing built-in containers (`list`, `dict`) to get storage; deep hierarchies (`Product → ShippedProduct → HeavyShippedProduct → …`) where every new feature needs a new level; and subclasses that refuse or change the meaning of a parent method, so code written for the parent breaks on them.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A print queue that only takes from the front",
      prompt: "`PrintQueue` inherits from `list`, so callers can take jobs from the middle or reorder them. Rewrite it with composition: it holds a list of jobs and offers only `add_job(job)`, `next_job()` (the oldest job, removed from the queue) and `size()`.",
      spec: [
        ["Class", "`PrintQueue()` with `add_job(job)`, `next_job()` and `size()`; no list methods such as `insert` or `sort`"],
        ["Order", "first in, first out"],
      ],
      starter: src`
class PrintQueue(list):
    def add_job(self, job):
        self.append(job)

    def next_job(self):
        return self.pop(0)

    def size(self):
        return len(self)

queue = PrintQueue()
queue.add_job("invoice O100282")
queue.add_job("label O100918")
print(queue.next_job(), queue.size())
`,
      answer: src`
class PrintQueue:
    def __init__(self):
        self.jobs = []

    def add_job(self, job):
        self.jobs.append(job)

    def next_job(self):
        return self.jobs.pop(0)

    def size(self):
        return len(self.jobs)

queue = PrintQueue()
queue.add_job("invoice O100282")
queue.add_job("label O100918")
print(queue.next_job(), queue.size())
`,
      wrong: [
        {
          code: src`
class PrintQueue:
    def __init__(self):
        self.jobs = []

    def add_job(self, job):
        self.jobs.append(job)

    def next_job(self):
        return self.jobs.pop()

    def size(self):
        return len(self.jobs)
`,
          fails: ["fifo"],
          why: "`pop()` takes the newest job, so the queue runs last in, first out",
        },
      ],
      hints: [
        "Remove `(list)` from the class line and give the queue its own list in `__init__`.",
        "Each method works on that list instead of on `self`.",
        "The oldest job is at position 0.",
      ],
      task: {
        checks: [
          expr("fifo", "Jobs come out in the order they went in", "_q = PrintQueue()\nfor _j in ['a', 'b', 'c']:\n    _q.add_job(_j)\nresult = [_q.next_job(), _q.next_job(), _q.size()]", ["a", "b", 1], { show: "add a, b, c; next_job() twice; size()" }),
          expr("no-list", "No list methods are exposed", "_q = PrintQueue()\nresult = [hasattr(_q, 'insert'), hasattr(_q, 'sort'), isinstance(_q, list)]", [false, false, false], { show: "hasattr(queue, \"insert\"), hasattr(queue, \"sort\"), isinstance(queue, list)" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An order book that can't be bypassed",
        prompt: "`OrderBook` subclasses `dict`, so anyone can overwrite an order or delete one without the book's rules. Rewrite it with composition. `place(order_id, total)` adds an order (a duplicate id or a negative total is a `ValueError`); `total_of(order_id)` returns its total or None; `withdraw(order_id)` removes it (`ValueError` if unknown); `open_total()` adds up all open orders.",
        spec: [
          ["Class", "`OrderBook()` holding the orders in its own dictionary; not a dict itself"],
          ["`place(order_id, total)`", "ValueError for an id already in the book or a total below 0"],
          ["`total_of(order_id)`", "the total, or None"],
          ["`withdraw(order_id)`", "removes the order; ValueError for an unknown id"],
          ["`open_total()`", "sum of all totals, rounded to 2 places"],
        ],
        starter: src`
class OrderBook(dict):
    def place(self, order_id, total):
        self[order_id] = total

    def open_total(self):
        return round(sum(self.values()), 2)

book = OrderBook()
book.place("O100282", 35.84)
book.place("O100918", 55.72)
book["O100282"] = 0
print(book.open_total())
`,
        answer: src`
class OrderBook:
    def __init__(self):
        self.orders = {}

    def place(self, order_id, total):
        if order_id in self.orders:
            raise ValueError(f"{order_id} is already in the book")
        if total < 0:
            raise ValueError(f"{order_id}: negative total {total}")
        self.orders[order_id] = total

    def total_of(self, order_id):
        return self.orders.get(order_id)

    def withdraw(self, order_id):
        if order_id not in self.orders:
            raise ValueError(f"{order_id} is not in the book")
        del self.orders[order_id]

    def open_total(self):
        return round(sum(self.orders.values()), 2)

book = OrderBook()
book.place("O100282", 35.84)
book.place("O100918", 55.72)
print(book.open_total(), book.total_of("O100282"))
`,
        alternatives: [
          src`
class OrderBook:
    def __init__(self):
        self.orders = {}

    def place(self, order_id, total):
        if order_id in self.orders or total < 0:
            raise ValueError("can't place that order")
        self.orders[order_id] = total

    def total_of(self, order_id):
        if order_id in self.orders:
            return self.orders[order_id]
        return None

    def withdraw(self, order_id):
        if self.orders.pop(order_id, None) is None:
            raise ValueError("unknown order")

    def open_total(self):
        total = 0
        for value in self.orders.values():
            total += value
        return round(total, 2)
`,
        ],
        wrong: [
          {
            code: src`
class OrderBook(dict):
    def place(self, order_id, total):
        if order_id in self or total < 0:
            raise ValueError("can't place that order")
        self[order_id] = total

    def total_of(self, order_id):
        return self.get(order_id)

    def withdraw(self, order_id):
        if order_id not in self:
            raise ValueError("unknown order")
        del self[order_id]

    def open_total(self):
        return round(sum(self.values()), 2)
`,
            fails: ["not-a-dict"],
            why: "the rules are right, but it is still a dict, so `book[id] = …` and `book.clear()` bypass them",
          },
          {
            code: src`
class OrderBook:
    def __init__(self):
        self.orders = {}

    def place(self, order_id, total):
        self.orders[order_id] = total

    def total_of(self, order_id):
        return self.orders.get(order_id)

    def withdraw(self, order_id):
        self.orders.pop(order_id, None)

    def open_total(self):
        return round(sum(self.orders.values()), 2)
`,
            fails: ["duplicate", "negative", "unknown"],
            why: "composition is used, but the rules are missing: duplicates overwrite and unknown ids are ignored",
          },
        ],
        hints: [
          "Drop the `dict` base; the book gets its own dictionary in `__init__`.",
          "Each method checks its rule before touching that dictionary.",
          "`get` returns None for a missing id, which is what `total_of` needs.",
        ],
        task: {
          checks: [
            expr("book", "Placing, reading and totalling", "_b = OrderBook()\n_b.place('O100282', 35.84)\n_b.place('O100918', 55.72)\n_b.withdraw('O100918')\n_b.place('O101219', 246.6)\nresult = [_b.total_of('O100282'), _b.total_of('O100918'), _b.open_total()]", [35.84, null, 282.44], { show: "place two, withdraw one, place another" }),
            expr("not-a-dict", "The book isn't a dictionary", "_b = OrderBook()\nresult = [isinstance(_b, dict), hasattr(_b, 'clear'), hasattr(_b, 'popitem')]", [false, false, false], { show: "isinstance(book, dict), hasattr(book, \"clear\"), hasattr(book, \"popitem\")" }),
            raisesExpr("duplicate", "A duplicate order id", "_b = OrderBook()\n_b.place('O1', 1.0)\n_b.place('O1', 2.0)", "ValueError", { hidden: true }),
            raisesExpr("unknown", "Withdrawing an unknown order", "OrderBook().withdraw('O404')", "ValueError", { hidden: true }),
            raisesExpr("negative", "A negative total", "OrderBook().place('O2', -5)", "ValueError", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Employees whose role can change",
        prompt: "Pay depends on role: pickers earn an hourly rate, drivers an hourly rate plus a fixed bonus per shift. Roles change when people are promoted, which a subclass can't do (an object can't change its class). Write role classes `Picker(rate)` and `Driver(rate, shift_bonus)`, each with `pay(hours)`, and an `Employee(name, role)` that **holds** its role, delegates `pay(hours)` to it, and has `change_role(role)`.",
        spec: [
          ["`Picker(rate)`", "`pay(hours)` → `rate × hours`"],
          ["`Driver(rate, shift_bonus)`", "`pay(hours)` → `rate × hours + shift_bonus`"],
          ["`Employee(name, role)`", "`pay(hours)` delegates to the role, rounded to 2 places; `change_role(role)` swaps it; `role_name()` → the role's class name"],
        ],
        starter: src`
class Employee:
    pass

ana = Employee("Ana Lopez", Picker(11.5))
print(ana.role_name(), ana.pay(8))
ana.change_role(Driver(13.0, 20.0))
print(ana.role_name(), ana.pay(8))
`,
        answer: src`
class Picker:
    def __init__(self, rate):
        self.rate = rate

    def pay(self, hours):
        return self.rate * hours

class Driver:
    def __init__(self, rate, shift_bonus):
        self.rate = rate
        self.shift_bonus = shift_bonus

    def pay(self, hours):
        return self.rate * hours + self.shift_bonus

class Employee:
    def __init__(self, name, role):
        self.name = name
        self.role = role

    def pay(self, hours):
        return round(self.role.pay(hours), 2)

    def change_role(self, role):
        self.role = role

    def role_name(self):
        return type(self.role).__name__

ana = Employee("Ana Lopez", Picker(11.5))
print(ana.role_name(), ana.pay(8))
ana.change_role(Driver(13.0, 20.0))
print(ana.role_name(), ana.pay(8))
`,
        alternatives: [
          src`
class Picker:
    def __init__(self, rate):
        self.rate = rate

    def pay(self, hours):
        return hours * self.rate

class Driver(Picker):
    def __init__(self, rate, shift_bonus):
        super().__init__(rate)
        self.shift_bonus = shift_bonus

    def pay(self, hours):
        return super().pay(hours) + self.shift_bonus

class Employee:
    def __init__(self, name, role):
        self.name = name
        self.role = role

    def pay(self, hours):
        return round(self.role.pay(hours), 2)

    def change_role(self, role):
        self.role = role

    def role_name(self):
        return type(self.role).__name__
`,
        ],
        wrong: [
          {
            code: src`
class Picker:
    def __init__(self, rate):
        self.rate = rate

    def pay(self, hours):
        return self.rate * hours

class Driver:
    def __init__(self, rate, shift_bonus):
        self.rate = rate
        self.shift_bonus = shift_bonus

    def pay(self, hours):
        return self.rate * hours + self.shift_bonus

class Employee:
    def __init__(self, name, role):
        self.name = name
        self.role = role
        self.rate = role.rate

    def pay(self, hours):
        return round(self.rate * hours, 2)

    def change_role(self, role):
        self.role = role

    def role_name(self):
        return type(self.role).__name__
`,
            fails: ["new-role", "promote"],
            why: "the employee copies the first role's rate and does its own sum, so a new role's rules (and bonus) never apply",
          },
          {
            code: src`
class Picker:
    def __init__(self, rate):
        self.rate = rate

    def pay(self, hours):
        return self.rate * hours

class Driver:
    def __init__(self, rate, shift_bonus):
        self.rate = rate
        self.shift_bonus = shift_bonus

    def pay(self, hours):
        return self.rate * hours + self.shift_bonus

class Employee:
    def __init__(self, name, role):
        self.name = name
        self.role = role

    def pay(self, hours):
        if isinstance(self.role, Driver):
            return round(self.role.rate * hours + self.role.shift_bonus, 2)
        return round(self.role.rate * hours, 2)

    def change_role(self, role):
        self.role = role

    def role_name(self):
        return type(self.role).__name__
`,
            fails: ["new-role"],
            why: "the employee decides pay with isinstance instead of asking the role, so a new kind of role is paid by the wrong rule",
          },
        ],
        hints: [
          "Each role class stores its own numbers and offers `pay(hours)`.",
          "The employee keeps the role object as an attribute and asks it for the pay; it never needs to know which role it has.",
          "`change_role` is a single assignment; `role_name` reads the class name of the role it holds.",
        ],
        task: {
          checks: [
            expr("picker", "A picker's pay", "result = [Employee('Ana Lopez', Picker(11.5)).pay(8), Employee('Ana Lopez', Picker(11.5)).role_name()]", [py.float(92), "Picker"], { show: "Employee(\"Ana Lopez\", Picker(11.5)).pay(8)" }),
            expr("promote", "Pay follows a change of role", "_e = Employee('Ana Lopez', Picker(11.5))\n_before = _e.pay(8)\n_e.change_role(Driver(13.0, 20.0))\nresult = [_before, _e.pay(8), _e.role_name()]", [py.float(92), py.float(124), "Driver"], { show: "pay(8) before and after change_role(Driver(13.0, 20.0))" }),
            expr("new-role", "A new kind of role works unchanged", "class _Supervisor:\n    def pay(self, hours):\n        return 600.0\n_e = Employee('Ben Cole', _Supervisor())\nresult = [_e.pay(40), _e.role_name()]", [py.float(600), "_Supervisor"], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Tags(list):
    def add_tag(self, tag):
        tag = tag.lower()
        if tag not in self:
            self.append(tag)

tags = Tags()
tags.add_tag("Sale")
tags.add_tag("SALE")
tags += ["Sale", "sale"]
print(len(tags), tags)
`,
        choices: ["3 ['sale', 'Sale', 'sale']", "1 ['sale']", "2 ['sale', 'Sale']", "4 ['sale', 'sale', 'Sale', 'sale']"],
        answer: 0,
        why: "`add_tag` keeps tags lower-case and unique, so the first two calls leave one tag. But `+=` is an inherited list operation that skips `add_tag` entirely, so a capitalised tag and a duplicate get in. A class that only offered `add_tag` couldn't be bypassed like that.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a subclass that breaks its parent's promise. What does this print?",
        program: src`
class Discount:
    def apply(self, total):
        return total * 0.9

class NoDiscountOnSmallOrders(Discount):
    def apply(self, total):
        if total < 20:
            raise ValueError("too small")
        return super().apply(total)

totals = []
for discount in [Discount(), NoDiscountOnSmallOrders()]:
    try:
        totals.append(round(discount.apply(15.0), 2))
    except ValueError:
        totals.append("crashed")
print(totals)
`,
        choices: ["[13.5, 'crashed']", "[13.5, 15.0]", "[13.5, 13.5]", "['crashed', 'crashed']"],
        answer: 0,
        why: "Code written for any Discount expects `apply` to return a total. The subclass raises instead, so it can't be used wherever a Discount is. Returning the total unchanged would have kept the promise.",
      },
      {
        id: "q3",
        prompt: "Which design fits \"a delivery van has a route and a driver\"?",
        choices: [
          "Van holds a route object and a driver object",
          "class Van(Route, Driver)",
          "class Driver(Van)",
          "class Route(Van)",
        ],
        answer: 0,
        why: "A van is not a kind of route or of driver; it has them. Composition models that, and lets the driver or route change.",
      },
    ],
    review: [
      "Is-a: inherit, and make sure the child keeps every promise of the parent.",
      "Has-a: hold the object and delegate, exposing only the operations that make sense.",
      "Subclassing containers to get storage exposes methods that can break your rules; composition doesn't.",
      "Next module: dataclasses, properties and type hints for describing data models with less code.",
    ],
  },
];
