import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

export const classesAndDataModels: PyLesson = {
  slug: "classes-and-data-models",
  ref: "python:classes-and-data-models",
  module: "patterns",
  number: 1,
  title: "Classes and data models",
  level: "advanced",
  summary:
    "Define your own types with `class`: give each object its own data in `__init__`, add methods that use that data, and write a `__repr__` so objects print usefully. Use a class when a dictionary of fields starts needing rules and behaviour of its own.",

  sections: [
    {
      label: "a class is a blueprint",
      blocks: [
        {
          kind: "p",
          text: "A **class** defines a new type. Each **instance** (object) made from it has its own **attributes** (data), and shares the class's **methods** (functions that work on that data). `str`, `list` and `dict` are classes; now you can make your own.",
        },
        { kind: "code", code: 'class Product:\n    def __init__(self, name, price, stock):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def value(self):\n        return self.price * self.stock\n\n\nlamp = Product("Lamp", 24.5, 3)\nprint(lamp.name, lamp.value())   # Lamp 73.5' },
        {
          kind: "p",
          text: "Calling the class, `Product(\"Lamp\", 24.5, 3)`, creates an instance and runs `__init__` on it. The first parameter of every method, `self`, is the instance itself; Python passes it for you, so `lamp.value()` runs `value` with `self` set to `lamp`. `self.name = name` stores an attribute on that particular object.",
        },
      ],
    },
    {
      label: "a useful repr",
      blocks: [
        {
          kind: "p",
          text: "By default an object prints as something like `<__main__.Product object at 0x…>`. Defining `__repr__` (a **special method**, recognised by its double underscores) controls that: return a string that shows what the object is, ideally looking like the code that would create it. `print`, the Console and error messages all use it.",
        },
      ],
    },
    {
      label: "when a class beats a dictionary",
      blocks: [
        {
          kind: "p",
          text: "A dictionary is fine for loose records. A class is better when the record has **behaviour** (a `value()` calculation that belongs with the data), **rules** (stock can't be negative), or many instances that should all have the same fields. Typos in attribute names fail loudly (`AttributeError`) instead of silently creating a new key.",
        },
      ],
    },
  ],

  example: {
    caption: "A small data model with a method and a repr. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'class Product:\n    """A product in stock."""\n\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def value(self):\n        """Total value of the stock."""\n        return self.price * self.stock\n\n    def __repr__(self):\n        return f"Product({self.name!r}, {self.price}, {self.stock})"\n\n\nitems = [Product("Lamp", 24.5, 3), Product("Desk", 120.0, 1), Product("Pen", 1.5)]\nfor item in items:\n    print(item, "->", item.value())\nprint("Total:", sum(item.value() for item in items))',
  },

  walkthrough: [
    {
      title: "Each instance has its own attributes",
      text: "`a` and `b` are separate objects from the same class; changing one doesn't touch the other.",
      code: 'class Product:\n    def __init__(self, name, price):\n        self.name = name\n        self.price = price\n\na = Product("Lamp", 24.5)\nb = Product("Desk", 120.0)\na.price = 20.0\nprint(a.name, a.price, "|", b.name, b.price)\nprint(type(a).__name__, isinstance(a, Product))',
    },
    {
      title: "Methods get the instance as self",
      text: "`lamp.value()` is shorthand for `Product.value(lamp)`: the instance is passed as `self`.",
      code: 'class Product:\n    def __init__(self, name, price, stock):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def value(self):\n        return self.price * self.stock\n\nlamp = Product("Lamp", 24.5, 3)\nprint(lamp.value(), Product.value(lamp))',
    },
    {
      title: "Without and with __repr__",
      text: "The default repr shows only the type, plus a memory address that differs every run (hidden here with `split`). A `__repr__` shows the data.",
      code: 'class Plain:\n    def __init__(self, name):\n        self.name = name\n\nclass Nice:\n    def __init__(self, name):\n        self.name = name\n    def __repr__(self):\n        return f"Nice({self.name!r})"\n\nprint(repr(Plain("x")).split(" at ")[0] + ">")\nprint(Nice("x"), [Nice("a"), Nice("b")])',
    },
    {
      title: "Attribute typos fail loudly",
      text: "Reading an attribute that was never set is an `AttributeError`, which names the object's type and the missing attribute.",
      code: 'class Product:\n    def __init__(self, name):\n        self.name = name\n\np = Product("Lamp")\nprint(p.name)\nprint(p.nmae)',
    },
  ],

  mistakes: [
    {
      title: "Forgetting self",
      text: "Without `self` as the first parameter, Python still passes the instance, so the call has one argument too many: `TypeError`.",
      code: 'class Product:\n    def __init__(self, name):\n        self.name = name\n\n    def label():\n        return "item"\n\nprint(Product("Lamp").label())',
      raises: "TypeError",
      fix: "Every method's first parameter is `self`: `def label(self):`.",
    },
    {
      title: "Assigning a local name instead of an attribute",
      text: "`name = name` inside `__init__` only sets a local variable, so the object never gets a `name` attribute.",
      code: 'class Product:\n    def __init__(self, name):\n        name = name\n\nprint(Product("Lamp").name)',
      raises: "AttributeError",
      fix: "Store it on the instance: `self.name = name`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Model a product",
      prompt:
        "Define a class `Product` whose `__init__` takes `name`, `price` and `stock` (with `stock` defaulting to 0) and stores them as attributes. Give it a method `value()` that returns `price × stock`, a method `in_stock()` that returns whether `stock` is above 0, and a `__repr__` that returns text like `Product('Lamp', 24.5, 3)`.",
      looksFor: [
        "`Product(\"Lamp\", 24.5, 3)` has `name`, `price` and `stock` attributes; `stock` defaults to 0.",
        "`value()` returns `price × stock`; `in_stock()` returns `True` or `False`.",
        "`repr(Product(\"Lamp\", 24.5, 3))` is `Product('Lamp', 24.5, 3)`.",
      ],
      starter: "class Product:\n    # Define __init__, value, in_stock and __repr__.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "attrs", label: "Stores name, price and stock", show: 'p = Product("Lamp", 24.5, 3); (p.name, p.price, p.stock)', expr: 'p = Product("Lamp", 24.5, 3)\nresult = (p.name, p.price, p.stock)', expected: py.tuple(s("Lamp"), f(24.5), i(3)), tip: "In __init__: self.name = name, and the same for price and stock." },
          { kind: "expr", id: "default", label: "stock defaults to 0", show: 'Product("Pen", 1.5).stock', expr: 'Product("Pen", 1.5).stock', expected: i(0), tip: "def __init__(self, name, price, stock=0):" },
          { kind: "expr", id: "value", label: "value() is price × stock", show: 'Product("Lamp", 24.5, 3).value()', expr: 'Product("Lamp", 24.5, 3).value()', expected: f(73.5) },
          { kind: "expr", id: "in-stock", label: "in_stock() is True only when stock > 0", show: '(Product("A", 1, 2).in_stock(), Product("B", 1).in_stock())', expr: '(Product("A", 1, 2).in_stock(), Product("B", 1).in_stock())', expected: py.tuple(py.bool(true), py.bool(false)) },
          { kind: "expr", id: "repr", label: "repr shows the data", show: 'repr(Product("Lamp", 24.5, 3))', expr: 'repr(Product("Lamp", 24.5, 3))', expected: s("Product('Lamp', 24.5, 3)"), tip: 'return f"Product({self.name!r}, {self.price}, {self.stock})"; !r adds the quotes.' },
          { kind: "expr", id: "independent", label: "Each instance keeps its own data", hidden: true, expr: 'a = Product("A", 2.0, 5)\nb = Product("B", 3.0, 1)\nfirst = (a.stock, b.stock, a.value(), b.value())\na.stock = 0\nresult = first + (a.in_stock(), b.in_stock())', expected: py.tuple(i(5), i(1), f(10), f(3), py.bool(false), py.bool(true)), tip: "Store stock on the instance (self.stock = stock), so each product keeps its own." },
        ],
      },
      hints: [
        "def __init__(self, name, price, stock=0): with self.name = name and so on.",
        "def value(self): return self.price * self.stock. def in_stock(self): return self.stock > 0.",
        'def __repr__(self): return f"Product({self.name!r}, {self.price}, {self.stock})".',
      ],
      answer: 'class Product:\n    """A product in stock."""\n\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def value(self):\n        return self.price * self.stock\n\n    def in_stock(self):\n        return self.stock > 0\n\n    def __repr__(self):\n        return f"Product({self.name!r}, {self.price}, {self.stock})"',
      wrong: [
        { code: 'class Product:\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        self.stock = stock\n\n    def value(self):\n        return self.price * self.stock\n\n    def in_stock(self):\n        return self.stock > 0\n\n    def __repr__(self):\n        return f"Product({self.name}, {self.price}, {self.stock})"\n', fails: ["repr"], why: "repr without quotes around the name" },
        { code: 'class Product:\n    stock = 0\n    def __init__(self, name, price, stock=0):\n        self.name = name\n        self.price = price\n        Product.stock = stock\n\n    def value(self):\n        return self.price * self.stock\n\n    def in_stock(self):\n        return self.stock > 0\n\n    def __repr__(self):\n        return f"Product({self.name!r}, {self.price}, {self.stock})"\n', fails: ["independent"], why: "stock stored on the class, shared by all" },
      ],
    },
    {
      id: "challenge-2",
      title: "Total an order of line objects",
      prompt:
        "Define a class `OrderLine` with attributes `sku`, `quantity` and `unit_price`, and a method `total()` that returns `quantity × unit_price` rounded to 2 places. Then write a function `order_total(lines)` that returns the sum of the totals of a list of `OrderLine` objects, rounded to 2 places.",
      looksFor: [
        "`OrderLine(\"A1\", 3, 2.5).total()` returns `7.5`.",
        "`order_total` adds up `total()` for every line, and returns `0` for no lines.",
      ],
      starter: "class OrderLine:\n    pass\n\n\ndef order_total(lines):\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "line", label: "OrderLine.total() works", show: 'OrderLine("A1", 3, 2.5).total()', expr: 'OrderLine("A1", 3, 2.5).total()', expected: f(7.5) },
          { kind: "expr", id: "rounded", label: "Line totals are rounded to 2 places", show: 'OrderLine("B2", 3, 0.335).total()', expr: 'OrderLine("B2", 3, 0.335).total()', expected: f(1.01), compare: { float: "exact" } },
          { kind: "expr", id: "order", label: "order_total adds up the lines", show: 'order_total([OrderLine("A1", 3, 2.5), OrderLine("C3", 1, 9.99)])', expr: 'order_total([OrderLine("A1", 3, 2.5), OrderLine("C3", 1, 9.99)])', expected: f(17.49), compare: { float: "exact" } },
          { kind: "expr", id: "empty", label: "An empty order totals 0", show: "order_total([])", expr: "order_total([])", expected: i(0), compare: { numbers: "int-float-equal" } },
        ],
      },
      hints: [
        "__init__ stores self.sku, self.quantity and self.unit_price.",
        "def total(self): return round(self.quantity * self.unit_price, 2).",
        "order_total: return round(sum(line.total() for line in lines), 2).",
      ],
      answer: 'class OrderLine:\n    """One line of an order."""\n\n    def __init__(self, sku, quantity, unit_price):\n        self.sku = sku\n        self.quantity = quantity\n        self.unit_price = unit_price\n\n    def total(self):\n        return round(self.quantity * self.unit_price, 2)\n\n    def __repr__(self):\n        return f"OrderLine({self.sku!r}, {self.quantity}, {self.unit_price})"\n\n\ndef order_total(lines):\n    """Return the rounded sum of the lines\' totals."""\n    return round(sum(line.total() for line in lines), 2)',
      wrong: [
        { code: "class OrderLine:\n    def __init__(self, sku, quantity, unit_price):\n        self.sku = sku\n        self.quantity = quantity\n        self.unit_price = unit_price\n\n    def total(self):\n        return self.quantity * self.unit_price\n\ndef order_total(lines):\n    return sum(line.total() for line in lines)\n", fails: ["rounded", "order"], why: "no rounding" },
      ],
    },
  ],

  quiz: [
    {
      id: "self",
      prompt: "What does this program print?",
      code: 'class Counter:\n    def __init__(self):\n        self.count = 0\n\n    def add(self):\n        self.count += 1\n\na = Counter()\nb = Counter()\na.add()\na.add()\nb.add()\nprint(a.count, b.count)',
      options: [
        { text: "`2 1`", correct: true, why: "Each instance has its own `count`; `a.add()` changes only `a`." },
        { text: "`3 3`", why: "`self.count` belongs to one instance; the two counters don't share it." },
        { text: "`1 1`", why: "`a.add()` runs twice, adding 1 to `a.count` each time." },
        { text: "A `TypeError`", why: "Python passes the instance as `self` automatically, so `a.add()` needs no argument." },
      ],
    },
    {
      id: "init",
      prompt: "When does `__init__` run?",
      options: [
        { text: "Each time an instance is created, such as `Product(\"Lamp\", 24.5)`", correct: true, why: "Calling the class creates the object and then runs `__init__` on it with the arguments." },
        { text: "Once, when the class is defined", why: "Defining the class only stores its methods; `__init__` runs per instance." },
        { text: "Every time a method is called", why: "Only creating an instance runs `__init__`." },
        { text: "Only if you call `__init__` yourself", why: "Python calls it for you when the class is called." },
      ],
    },
  ],

  outcomes: [
    "Define a class with `__init__`, attributes and methods.",
    "Create instances and explain what `self` is.",
    "Write a `__repr__` that shows an object's data.",
    "Decide when a class is a better model than a dictionary.",
  ],
};
