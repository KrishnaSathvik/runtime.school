/**
 * M26 Classes & Objects: five lessons (PY-L26-01 … PY-L26-05).
 *
 * `class` arrived in M18 for custom errors. Here it describes ordinary objects: a class with __init__ and attributes
 * (L01); names that share one object, identity versus equality, and copies (L02); constructors that convert and
 * validate so no invalid object exists, and the mutable-default trap (L03); methods that compute from and change an
 * object's state (L04); class attributes, the instance-attribute shadowing trap, and @classmethod alternative
 * constructors (L05).
 *
 * Fixtures are Runtime Market (R01) customers, orders, products and stock. Classes are graded by `expr` checks that
 * build objects, call methods and read attributes; mistakes run for real (AttributeError, TypeError, a failing
 * assert that exposes a shared default list).
 * Version 2: rewritten from five lessons that set item.sku = "MUG" and printed it.
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

export const m26Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L26-01 a class with __init__
  {
    id: "PY-L26-01",
    version: 2,
    slug: "a-plain-class",
    title: "Define a class and create objects",
    lede: "A dictionary can hold a customer, but nothing says which keys a customer must have. A class describes a kind of object once; every object made from it gets the same attributes, filled in by __init__.",
    focus: "Define a class whose __init__ stores attributes on self, create objects from it, and read their attributes.",
    minutes: 18,
    objectives: [
      "Write a class with an `__init__` that stores each argument as an attribute on `self`",
      "Create several objects from one class and read their attributes with a dot",
      "Build a list of objects from rows of data and work with it like any other list",
    ],
    requires: ["arithmetic", "assignment", "class-def", "comparison", "conversion", "defaultdict-call", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "try-except", "type-call"],
    teaches: ["plain-class", "init-method", "self-name", "attr-assign"],
    blocks: [
      {
        kind: "text",
        md: "So far a customer has been a dictionary: `{\"customer_id\": \"C00077\", \"name\": \"Jamal Walker\", \"city\": \"Houston\"}`. Nothing in the program says which keys a customer must have; a typo like `\"citty\"` is only discovered when something reads it.\n\nA **class** describes a kind of object once. `class Customer:` starts the description. Inside it, the special function `__init__` (two underscores each side) runs every time a new customer is created. Its first parameter, by convention called `self`, is the **new object itself**; the others are the values you pass in. `self.city = city` stores a value as an **attribute** of that object.\n\nCalling the class, `Customer(\"C00077\", \"Jamal Walker\", \"Houston\")`, creates a new object, runs `__init__` on it with those three values, and gives you the object. `jamal.city` reads one attribute back.",
      },
      {
        kind: "example",
        title: "Two customers from one class",
        code: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

jamal = Customer("C00077", "Jamal Walker", "Houston")
grace = Customer("C01338", "Grace Walker", "New York")
print(jamal.name, "lives in", jamal.city)
print(grace.customer_id, grace.city)
print(type(jamal).__name__, jamal is grace)
`,
        output: "Jamal Walker lives in Houston\nC01338 New York\nCustomer False\n",
        note: "You never pass `self`: Python passes the new object automatically, so `Customer(...)` takes three values for four parameters. Each call creates a separate object with its own attributes; `type(...)` reports the class it was made from.",
      },
      {
        kind: "error-example",
        title: "Forgetting self. on one line",
        code: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        city = city

jamal = Customer("C00077", "Jamal Walker", "Houston")
print(jamal.name)
print(jamal.city)
`,
        error: "AttributeError",
        output: "Jamal Walker\n",
        note: "`city = city` only reassigns the parameter, a local name that disappears when `__init__` ends. Nothing was stored on the object, so reading it fails: `AttributeError: 'Customer' object has no attribute 'city'`.",
      },
      {
        kind: "text",
        md: "Objects are values like any other: they go into lists, are passed to functions and returned from them. A common first job is turning rows of data (from a CSV file, say) into objects, after which the rest of the program reads `customer.city` instead of `row[\"city\"]`.",
      },
      {
        kind: "example",
        title: "Customer objects from rows",
        code: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

rows = [
    {"customer_id": "C00038", "first_name": "Nora", "last_name": "Garcia", "city": "New York"},
    {"customer_id": "C00077", "first_name": "Jamal", "last_name": "Walker", "city": "Houston"},
    {"customer_id": "C01338", "first_name": "Grace", "last_name": "Walker", "city": "New York"},
]
customers = []
for row in rows:
    full_name = row["first_name"] + " " + row["last_name"]
    customers.append(Customer(row["customer_id"], full_name, row["city"]))

for customer in customers:
    if customer.city == "New York":
        print(customer.customer_id, customer.name)
print(len(customers), "customers loaded")
`,
        output: "C00038 Nora Garcia\nC01338 Grace Walker\n3 customers loaded\n",
        note: "The row's shape (two name fields) is dealt with once, where the object is built. Everything after that works with one clear shape: a Customer has an id, a name and a city.",
      },
      {
        kind: "text",
        md: "**When to use it:** when a kind of record has a fixed set of fields and is passed around a program: customers, orders, products. (Later lessons add the functions that belong to it.)\n\n**Mistakes to avoid:**\n- Forgetting `self.` when storing, so the value is lost (above).\n- Leaving `self` out of `def __init__(...)`: the call then has one argument too many and fails with TypeError.\n- Passing `self` yourself: `Customer(jamal, \"C00077\", ...)` is one argument too many.\n- Class names in `lower_case`: the convention is `CapitalisedWords`, so `Customer` reads as a class and `customer` as one object.",
      },
    ],
    tryIt: {
      id: "try",
      title: "An email for every customer",
      prompt: "Customers need an email address. Give `__init__` a fourth parameter, `email`, and store it on the object, so `nora.email` works.",
      spec: [
        ["Change", "`Customer(customer_id, name, city, email)` stores all four as attributes"],
      ],
      starter: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

nora = Customer("C00038", "Nora Garcia", "New York")
print(nora.name, nora.city)
`,
      answer: src`
class Customer:
    def __init__(self, customer_id, name, city, email):
        self.customer_id = customer_id
        self.name = name
        self.city = city
        self.email = email

nora = Customer("C00038", "Nora Garcia", "New York", "nora_garcia@fastmail.com")
print(nora.name, nora.city, nora.email)
`,
      wrong: [
        {
          code: src`
class Customer:
    def __init__(self, customer_id, name, city, email):
        self.customer_id = customer_id
        self.name = name
        self.city = city
        self.mail = email
`,
          fails: ["email"],
          why: "the address is stored as `mail`, so `customer.email` doesn't exist",
        },
      ],
      hints: [
        "Two places change: the parameter list of `__init__`, and a new line in its body.",
        "The new line stores the parameter on the object, like the other three.",
        "Create Nora with her address as the fourth value: nora_garcia@fastmail.com.",
      ],
      task: {
        checks: [
          expr("email", "The email is stored on the object", "result = Customer('C00038', 'Nora Garcia', 'New York', 'nora_garcia@fastmail.com').email", "nora_garcia@fastmail.com", { show: "Customer(\"C00038\", \"Nora Garcia\", \"New York\", \"nora_garcia@fastmail.com\").email" }),
          expr("others", "The other attributes are still there", "_c = Customer('C00077', 'Jamal Walker', 'Houston', 'jamal.walker62@icloud.com')\nresult = [_c.customer_id, _c.name, _c.city]", ["C00077", "Jamal Walker", "Houston"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Order lines from a CSV export",
        prompt: "An export gives order lines as rows of text. Write a class `OrderLine` whose objects have `sku`, `quantity` (an int), `unit_price` (a float) and `amount` (quantity × unit price, rounded to 2 places), and a function `lines_from_rows(rows)` that turns every row into an `OrderLine`, in order.",
        spec: [
          ["Class", "`OrderLine(sku, quantity, unit_price)` with attributes `sku`, `quantity`, `unit_price`, `amount`"],
          ["Function", "`lines_from_rows(rows)`; each row is `{\"sku\": …, \"quantity\": \"2\", \"unit_price\": \"17.92\"}` (all text)"],
          ["Returns", "a list of OrderLine objects; numbers converted with `int` and `float`"],
          ["Example", "the row for SPO-11681 → an OrderLine with quantity 2, unit_price 17.92, amount 35.84"],
        ],
        starter: src`
class OrderLine:
    pass

def lines_from_rows(rows):
    return []

rows = [
    {"sku": "SPO-11681", "quantity": "2", "unit_price": "17.92"},
    {"sku": "HOM-22847", "quantity": "1", "unit_price": "4.99"},
]
for line in lines_from_rows(rows):
    print(line.sku, line.quantity, line.amount)
`,
        answer: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price
        self.amount = round(quantity * unit_price, 2)

def lines_from_rows(rows):
    lines = []
    for row in rows:
        lines.append(OrderLine(row["sku"], int(row["quantity"]), float(row["unit_price"])))
    return lines

rows = [
    {"sku": "SPO-11681", "quantity": "2", "unit_price": "17.92"},
    {"sku": "HOM-22847", "quantity": "1", "unit_price": "4.99"},
]
for line in lines_from_rows(rows):
    print(line.sku, line.quantity, line.amount)
`,
        alternatives: [
          src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = int(quantity)
        self.unit_price = float(unit_price)
        self.amount = round(self.quantity * self.unit_price, 2)

def lines_from_rows(rows):
    return [OrderLine(row["sku"], row["quantity"], row["unit_price"]) for row in rows]
`,
        ],
        wrong: [
          {
            code: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price
        self.amount = unit_price

def lines_from_rows(rows):
    lines = []
    for row in rows:
        lines.append(OrderLine(row["sku"], int(row["quantity"]), float(row["unit_price"])))
    return lines
`,
            fails: ["amounts", "many"],
            why: "the amount ignores the quantity, so a line of two items is priced as one",
          },
          {
            code: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price
        self.amount = quantity * unit_price

def lines_from_rows(rows):
    lines = []
    for row in rows:
        lines.append(OrderLine(row["sku"], row["quantity"], row["unit_price"]))
    return lines
`,
            fails: ["first", "amounts", "many"],
            why: "the text values are never converted, so multiplying \"2\" by \"17.92\" raises TypeError",
          },
        ],
        hints: [
          "`__init__` stores the three values, then computes one more attribute from two of them.",
          "The function makes one object per row and collects them in a list.",
          "Convert with `int` and `float` before (or while) building each object; round the amount to 2 places.",
        ],
        task: {
          checks: [
            expr("first", "The first line's attributes", "_l = lines_from_rows([{'sku': 'SPO-11681', 'quantity': '2', 'unit_price': '17.92'}])[0]\nresult = [_l.sku, _l.quantity, _l.unit_price, type(_l).__name__]", ["SPO-11681", 2, 17.92, "OrderLine"], { show: "lines_from_rows([<SPO-11681 row>])[0]: sku, quantity, unit_price, class" }),
            expr("amounts", "Every line's amount", "result = [_l.amount for _l in lines_from_rows([{'sku': 'SPO-11681', 'quantity': '2', 'unit_price': '17.92'}, {'sku': 'HOM-22847', 'quantity': '1', 'unit_price': '4.99'}])]", [35.84, 4.99], { show: "[line.amount for line in lines_from_rows(rows)]" }),
            expr("many", "Three lines, with rounding", "result = [_l.amount for _l in lines_from_rows([{'sku': 'A', 'quantity': '3', 'unit_price': '0.1'}, {'sku': 'B', 'quantity': '10', 'unit_price': '2.5'}, {'sku': 'C', 'quantity': '7', 'unit_price': '1.15'}])]", [0.3, py.float(25), 8.05], { hidden: true }),
            expr("empty", "No rows", "result = lines_from_rows([])", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Customers grouped by city",
        prompt: "The `Customer` class is given. Write `names_by_city(customers)`: from a list of Customer objects, return a dictionary from each city to the list of its customers' names in alphabetical order. Cities appear in the order they are first met.",
        spec: [
          ["Function", "`names_by_city(customers)`"],
          ["customers", "a list of `Customer` objects (attributes `customer_id`, `name`, `city`)"],
          ["Returns", "`{city: [names sorted A–Z]}`; `{}` for no customers"],
          ["Example", "the starter's customers → `{'New York': ['Grace Walker', 'Nora Garcia'], 'Houston': ['Jamal Walker']}`"],
        ],
        starter: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

def names_by_city(customers):
    return {}

customers = [
    Customer("C00038", "Nora Garcia", "New York"),
    Customer("C00077", "Jamal Walker", "Houston"),
    Customer("C01338", "Grace Walker", "New York"),
]
print(names_by_city(customers))
`,
        answer: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

def names_by_city(customers):
    groups = {}
    for customer in customers:
        if customer.city not in groups:
            groups[customer.city] = []
        groups[customer.city].append(customer.name)
    for city in groups:
        groups[city] = sorted(groups[city])
    return groups

customers = [
    Customer("C00038", "Nora Garcia", "New York"),
    Customer("C00077", "Jamal Walker", "Houston"),
    Customer("C01338", "Grace Walker", "New York"),
]
print(names_by_city(customers))
`,
        alternatives: [
          src`
from collections import defaultdict

class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

def names_by_city(customers):
    groups = defaultdict(list)
    for customer in customers:
        groups[customer.city].append(customer.name)
    return {city: sorted(names) for city, names in groups.items()}
`,
        ],
        wrong: [
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

def names_by_city(customers):
    groups = {}
    for customer in customers:
        if customer.city not in groups:
            groups[customer.city] = []
        groups[customer.city].append(customer.name)
    return groups
`,
            fails: ["returns", "many"],
            why: "the names stay in the order the customers came in, not alphabetical",
          },
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name, city):
        self.customer_id = customer_id
        self.name = name
        self.city = city

def names_by_city(customers):
    groups = {}
    for customer in customers:
        groups[customer.city] = [customer.name]
    return groups
`,
            fails: ["returns", "many"],
            why: "each customer replaces the city's list, so only the last customer per city is kept",
          },
        ],
        hints: [
          "This is the grouping pattern from the Collection Algorithms module, reading `customer.city` and `customer.name` instead of dictionary keys.",
          "Create a city's list the first time you meet the city, then append names to it.",
          "Sort each city's list once all customers are grouped.",
        ],
        task: {
          checks: [
            expr("returns", "Names grouped by city, sorted", "result = names_by_city([Customer('C00038', 'Nora Garcia', 'New York'), Customer('C00077', 'Jamal Walker', 'Houston'), Customer('C01338', 'Grace Walker', 'New York')])", { "New York": ["Grace Walker", "Nora Garcia"], Houston: ["Jamal Walker"] }, { show: "names_by_city(customers)" }),
            expr("many", "Several cities with several customers", "result = names_by_city([Customer('C1', 'Theo Williams', 'Denver'), Customer('C2', 'Ana Lopez', 'Austin'), Customer('C3', 'Ben Cole', 'Denver'), Customer('C4', 'Zoe Hart', 'Austin'), Customer('C5', 'Ada Price', 'Denver')])", { Denver: ["Ada Price", "Ben Cole", "Theo Williams"], Austin: ["Ana Lopez", "Zoe Hart"] }, { hidden: true }),
            expr("empty", "No customers", "result = names_by_city([])", {}, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Product:
    def __init__(self, sku, price):
        self.sku = sku
        self.price = price

mat = Product("SPO-11681", 31.0)
lamp = Product("HOM-22847", 48.0)
lamp.price = 40.0
print(mat.price, lamp.price, mat.sku)
`,
        choices: ["31.0 40.0 SPO-11681", "40.0 40.0 SPO-11681", "31.0 48.0 SPO-11681", "40.0 40.0 HOM-22847"],
        answer: 0,
        why: "Each call to `Product(...)` makes a separate object. Changing `lamp.price` changes only the lamp.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `self` is missing from `__init__`. What happens?",
        program: src`
class Order:
    def __init__(order_id, total):
        order_id.total = total

try:
    order = Order("O100282", 35.84)
    print("created")
except TypeError as err:
    print("TypeError:", err)
`,
        choices: ["TypeError: Order.__init__() takes 2 positional arguments but 3 were given", "created", "TypeError: Order.__init__() missing 1 required positional argument: 'total'", "AttributeError: 'str' object has no attribute 'total'"],
        answer: 0,
        why: "Python always passes the new object as the first argument. With `self` missing, the new object lands in `order_id`, and the two values you passed make three arguments for two parameters.",
      },
      {
        id: "q3",
        prompt: "Which job is a good fit for a new class?",
        choices: [
          "Many records with the same fields (an order id, a status, a total) passed around a program",
          "Adding two numbers once",
          "Printing a greeting",
          "Storing one temporary value inside a loop",
        ],
        answer: 0,
        why: "A class pays off when a kind of record appears many times: it states the fields once and gives every such record the same shape.",
      },
    ],
    review: [
      "`class Name:` describes a kind of object; calling `Name(...)` creates one and runs `__init__`.",
      "`self` is the object being created; `self.attr = value` stores an attribute on it.",
      "Each object has its own attributes; read them with a dot.",
      "Next: what happens when two names refer to the same object.",
    ],
  },

  // ------------------------------------------------------------------ PY-L26-02 shared objects and identity
  {
    id: "PY-L26-02",
    version: 2,
    slug: "objects-and-names",
    title: "Objects, names and identity",
    lede: "A name refers to an object; it isn't the object. Two names can share one object, a change through either shows through both, and two objects with the same data are still two objects.",
    focus: "Predict what happens when names, lists and functions share an object, compare objects with is and ==, and copy an object when you need a separate one.",
    minutes: 18,
    objectives: [
      "Explain why changing an object through one name shows through every name that refers to it",
      "Tell `is` (the same object) from `==`, which on a plain class also means the same object",
      "Make a separate object with the same data when a change must not reach the original",
    ],
    requires: ["any-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-copy", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "plain-class", "precedence", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-index", "top-level-indent", "zip-call"],
    teaches: ["object-identity"],
    blocks: [
      {
        kind: "text",
        md: "`same = order` doesn't copy the order. It makes `same` a second **name** for the one object `order` already refers to, just as with lists in the Lists & Tuples module. Change an attribute through either name and the other sees it, because there is only one object.\n\nThe same is true when an object is stored in a list or passed to a function: the list and the function's parameter refer to the original. That is useful (a function can update an order's status) and dangerous (a function you expected to leave things alone can change them).\n\n`a is b` asks whether two names refer to the **same object**. `a == b` asks whether they are **equal**, and for a class you write yourself, Python doesn't know what equal should mean, so it falls back to identity: two separate orders with identical data are not `==`. (the Data Models & Typing module shows how a class can define its own equality.)",
      },
      {
        kind: "example",
        title: "One order, two names",
        code: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

order = Order("O100282", "paid", 35.84)
same = order
same.status = "shipped"
print(order.status, order is same)

copy_of_data = Order("O100282", "shipped", 35.84)
print(order == copy_of_data, order is copy_of_data)
print(order.total == copy_of_data.total)
`,
        output: "shipped True\nFalse False\nTrue\n",
        note: "`same.status = ...` changed the only order there is. The second Order has the same data but is a different object, so even `==` says False; comparing attributes compares the data.",
      },
      {
        kind: "error-example",
        title: "A misspelt attribute",
        code: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

order = Order("O100918", "returned", 55.72)
print(order.status)
print(order.totl)
`,
        error: "AttributeError",
        output: "returned\n",
        note: "Reading an attribute that was never stored raises `AttributeError: 'Order' object has no attribute 'totl'. Did you mean: 'total'?`. Writing one is worse: `order.statsu = \"lost\"` silently creates a new attribute and leaves `status` unchanged.",
      },
      {
        kind: "text",
        md: "When a change must **not** reach the original (a price simulation, an undo snapshot), make a separate object: call the class again with the old object's attribute values (and the one you want to change). The new object has its own attributes, so changing them leaves the original alone. If an attribute holds a list, pass `list(old.items)` so the two objects don't end up sharing it.",
      },
      {
        kind: "example",
        title: "Sale prices without touching the catalogue",
        code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def sale_prices(products, rate):
    sale = []
    for product in products:
        cheaper = Product(product.sku, product.name, round(product.price * (1 - rate), 2))
        sale.append(cheaper)
    return sale

catalogue = [Product("SPO-11681", "Yoga mat", 31.0), Product("HOM-22847", "Desk lamp", 48.0)]
on_sale = sale_prices(catalogue, 0.25)
for before, after in zip(catalogue, on_sale):
    print(before.sku, before.price, "->", after.price, before is after)
`,
        output: "SPO-11681 31.0 -> 23.25 False\nHOM-22847 48.0 -> 36.0 False\n",
        note: "The catalogue keeps its prices, because every sale product is a new object. Writing `product.price = ...` inside the loop instead would have changed the catalogue for the whole program.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a function receives objects, decide whether it is allowed to change them, and say so in its name or docstring (`mark_shipped` changes; `sale_prices` returns new ones).\n\n**Mistakes to avoid:** `new_list = list(products)` and expecting new products (it copies the list, not the objects in it); comparing objects with `==` and expecting their data to be compared; assigning to a misspelt attribute name; and changing an object you received when the caller expects it unchanged.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Mark the orders as shipped",
      prompt: "`mark_shipped` should set the status of each listed order to `\"shipped\"` and return how many it changed. It returns the right count, but the orders keep their old status. Find out why and fix it.",
      spec: [
        ["Function", "`mark_shipped(orders, order_ids)` changes the matching Order objects and returns the count"],
      ],
      starter: src`
class Order:
    def __init__(self, order_id, status):
        self.order_id = order_id
        self.status = status

def mark_shipped(orders, order_ids):
    changed = 0
    for order in orders:
        if order.order_id in order_ids:
            status = order.status
            status = "shipped"
            changed += 1
    return changed

orders = [Order("O100282", "paid"), Order("O100918", "paid"), Order("O101219", "paid")]
print(mark_shipped(orders, ["O100282", "O101219"]))
for order in orders:
    print(order.order_id, order.status)
`,
      answer: src`
class Order:
    def __init__(self, order_id, status):
        self.order_id = order_id
        self.status = status

def mark_shipped(orders, order_ids):
    changed = 0
    for order in orders:
        if order.order_id in order_ids:
            order.status = "shipped"
            changed += 1
    return changed

orders = [Order("O100282", "paid"), Order("O100918", "paid"), Order("O101219", "paid")]
print(mark_shipped(orders, ["O100282", "O101219"]))
for order in orders:
    print(order.order_id, order.status)
`,
      wrong: [
        {
          code: src`
class Order:
    def __init__(self, order_id, status):
        self.order_id = order_id
        self.status = status

def mark_shipped(orders, order_ids):
    changed = 0
    for order in orders:
        if order.order_id in order_ids:
            order = Order(order.order_id, "shipped")
            changed += 1
    return changed
`,
          fails: ["statuses"],
          why: "a new Order is made and given to the loop name, but the list still holds the old, unchanged objects",
        },
      ],
      hints: [
        "`status = order.status` copies a reference to a text into a local name. Rebinding that name doesn't touch the object.",
        "To change the object, assign to its attribute.",
        "Set `.status` on the loop's `order` itself; the list holds that same object.",
      ],
      task: {
        checks: [
          expr("statuses", "The listed orders are changed in the list", "_os = [Order('O100282', 'paid'), Order('O100918', 'paid'), Order('O101219', 'paid')]\n_n = mark_shipped(_os, ['O100282', 'O101219'])\nresult = [_o.status for _o in _os]", ["shipped", "paid", "shipped"], { show: "statuses after mark_shipped(orders, [\"O100282\", \"O101219\"])" }),
          expr("count", "The count of changed orders", "result = mark_shipped([Order('A', 'paid'), Order('B', 'paid')], ['B', 'C'])", 1, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A snapshot before the changes",
        prompt: "Before a batch job changes order statuses, it keeps a snapshot to compare with afterwards. Write `snapshot(orders)`: return a new list of **copies** of the orders, so that later changes to the orders don't show up in the snapshot.",
        spec: [
          ["Function", "`snapshot(orders)`"],
          ["Returns", "a new list of new Order objects with the same attribute values, in the same order"],
          ["Must hold", "changing an original order afterwards leaves its copy unchanged; no copy `is` an original"],
        ],
        starter: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

def snapshot(orders):
    return orders

orders = [Order("O100282", "paid", 35.84), Order("O100918", "paid", 55.72)]
before = snapshot(orders)
orders[0].status = "shipped"
print(before[0].status, orders[0].status)
`,
        answer: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

def snapshot(orders):
    saved = []
    for order in orders:
        saved.append(Order(order.order_id, order.status, order.total))
    return saved

orders = [Order("O100282", "paid", 35.84), Order("O100918", "paid", 55.72)]
before = snapshot(orders)
orders[0].status = "shipped"
print(before[0].status, orders[0].status)
`,
        alternatives: [
          src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

def copy_order(order):
    return Order(order.order_id, order.status, order.total)

def snapshot(orders):
    return [copy_order(order) for order in orders]
`,
        ],
        wrong: [
          {
            code: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

def snapshot(orders):
    return list(orders)
`,
            fails: ["independent", "not-same"],
            why: "`list(orders)` copies the list, but both lists hold the same Order objects, so the snapshot changes too",
          },
          {
            code: src`
class Order:
    def __init__(self, order_id, status, total):
        self.order_id = order_id
        self.status = status
        self.total = total

def snapshot(orders):
    first = orders[0]
    return [Order(first.order_id, first.status, first.total)]
`,
            fails: ["empty", "independent", "not-same", "values"],
            why: "only the first order is copied, and an empty list crashes",
          },
        ],
        hints: [
          "A new list is not enough: it must hold new objects.",
          "Calling `Order(...)` with an existing order's three attribute values makes a separate order with the same data.",
          "Build the new list in the original order, one copy per order.",
        ],
        task: {
          checks: [
            expr("values", "The copies hold the same data", "_s = snapshot([Order('O100282', 'paid', 35.84), Order('O100918', 'returned', 55.72)])\nresult = [(_o.order_id, _o.status, _o.total) for _o in _s]", [py.tuple(py.str("O100282"), py.str("paid"), py.float(35.84)), py.tuple(py.str("O100918"), py.str("returned"), py.float(55.72))], { show: "the attributes of snapshot(orders)" }),
            expr("independent", "A later change doesn't reach the snapshot", "_os = [Order('O100282', 'paid', 35.84), Order('O100918', 'paid', 55.72)]\n_s = snapshot(_os)\n_os[1].status = 'cancelled'\n_os[1].total = 0\nresult = [_s[1].status, _s[1].total]", ["paid", 55.72], { show: "snapshot after the original order is changed" }),
            expr("not-same", "No copy is an original", "_os = [Order('A', 'paid', 1), Order('B', 'paid', 2), Order('C', 'paid', 3)]\n_s = snapshot(_os)\nresult = [_c is _o for _c, _o in zip(_s, _os)] + [_s is _os]", [false, false, false, false], { hidden: true }),
            expr("empty", "No orders", "result = snapshot([])", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Duplicate customer records",
        prompt: "After merging two customer files, some customers exist twice: two **different** Customer objects with the same `customer_id`. Write `duplicate_ids(customers)` returning the sorted list of ids that belong to more than one object. The same object listed twice is not a duplicate: it is one customer.",
        spec: [
          ["Function", "`duplicate_ids(customers)`"],
          ["customers", "a list of Customer objects (`customer_id`, `name`); the same object may appear more than once"],
          ["Returns", "sorted customer ids held by two or more **different** objects; `[]` if none"],
          ["Example", "two objects for C00077 → `['C00077']`; one object listed twice → `[]`"],
        ],
        starter: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

def duplicate_ids(customers):
    return []

jamal = Customer("C00077", "Jamal Walker")
again = Customer("C00077", "J. Walker")
nora = Customer("C00038", "Nora Garcia")
print(duplicate_ids([jamal, nora, again]))
print(duplicate_ids([nora, nora]))
`,
        answer: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

def duplicate_ids(customers):
    objects = {}
    for customer in customers:
        if customer.customer_id not in objects:
            objects[customer.customer_id] = []
        already = False
        for other in objects[customer.customer_id]:
            if other is customer:
                already = True
        if not already:
            objects[customer.customer_id].append(customer)
    duplicates = []
    for customer_id, found in objects.items():
        if len(found) > 1:
            duplicates.append(customer_id)
    return sorted(duplicates)

jamal = Customer("C00077", "Jamal Walker")
again = Customer("C00077", "J. Walker")
nora = Customer("C00038", "Nora Garcia")
print(duplicate_ids([jamal, nora, again]))
print(duplicate_ids([nora, nora]))
`,
        alternatives: [
          src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

def duplicate_ids(customers):
    seen = {}
    for customer in customers:
        seen.setdefault(customer.customer_id, [])
        if not any(customer is other for other in seen[customer.customer_id]):
            seen[customer.customer_id].append(customer)
    return sorted(cid for cid, objs in seen.items() if len(objs) >= 2)
`,
        ],
        wrong: [
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

def duplicate_ids(customers):
    counts = {}
    for customer in customers:
        counts[customer.customer_id] = counts.get(customer.customer_id, 0) + 1
    return sorted(cid for cid, n in counts.items() if n > 1)
`,
            fails: ["many", "same-object"],
            why: "counting ids also counts the same object listed twice, which is one customer, not a duplicate",
          },
          {
            code: src`
class Customer:
    def __init__(self, customer_id, name):
        self.customer_id = customer_id
        self.name = name

def duplicate_ids(customers):
    found = []
    for i in range(len(customers)):
        for j in range(i + 1, len(customers)):
            if customers[i] == customers[j]:
                found.append(customers[i].customer_id)
    return sorted(found)
`,
            fails: ["many", "returns", "same-object"],
            why: "`==` on two plain objects compares identity: two separate records with the same id are never matched, and one object listed twice is",
          },
        ],
        hints: [
          "Group the objects by `customer_id`, as in the Collection Algorithms module, but keep the objects themselves in each group.",
          "Before adding an object to its group, check with `is` whether that very object is already there.",
          "An id is a duplicate when its group ends up with two or more objects. Sort the ids at the end.",
        ],
        task: {
          checks: [
            expr("returns", "Two objects share an id", "_j = Customer('C00077', 'Jamal Walker')\n_a = Customer('C00077', 'J. Walker')\n_n = Customer('C00038', 'Nora Garcia')\nresult = duplicate_ids([_j, _n, _a])", ["C00077"], { show: "duplicate_ids([jamal, nora, again])" }),
            expr("same-object", "One object listed twice", "_n = Customer('C00038', 'Nora Garcia')\nresult = duplicate_ids([_n, _n])", [], { show: "duplicate_ids([nora, nora])" }),
            expr("many", "Several duplicates, out of order", "_x = Customer('C9', 'x')\nresult = duplicate_ids([Customer('C5', 'a'), _x, Customer('C1', 'b'), Customer('C5', 'c'), _x, Customer('C1', 'd'), Customer('C1', 'e')])", ["C1", "C5"], { hidden: true }),
            expr("empty", "No customers", "result = duplicate_ids([])", [], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Basket:
    def __init__(self, customer_id):
        self.customer_id = customer_id
        self.items = []

baskets = []
basket = Basket("C00077")
for sku in ["SPO-11681", "HOM-22847"]:
    basket.items.append(sku)
    baskets.append(basket)
print(len(baskets), len(baskets[0].items), baskets[0] is baskets[1])
`,
        choices: ["2 2 True", "2 1 False", "1 2 True", "2 2 False"],
        answer: 0,
        why: "Only one Basket was ever created. The list holds that one object twice, so both entries show both items and `is` is True.",
      },
      {
        id: "q2",
        prompt: "A common mistake: copying the list and expecting copies of the objects. What does this print?",
        program: src`
class Product:
    def __init__(self, sku, price):
        self.sku = sku
        self.price = price

catalogue = [Product("SPO-11681", 31.0)]
draft = list(catalogue)
draft[0].price = 25.0
draft.append(Product("HOM-22847", 48.0))
print(catalogue[0].price, len(catalogue), len(draft))
`,
        choices: ["25.0 1 2", "31.0 1 2", "25.0 2 2", "31.0 2 2"],
        answer: 0,
        why: "`list(catalogue)` makes a new list, so appending to `draft` doesn't change `catalogue`. But both lists hold the same Product object, so its price change shows in both.",
      },
      {
        id: "q3",
        prompt: "Two separate `Customer` objects both have `customer_id == \"C00077\"`. What does `a == b` give for a class you wrote with only `__init__`?",
        choices: ["False, because == falls back to identity", "True, because the data is the same", "An error", "True only if the names are equal"],
        answer: 0,
        why: "Without its own definition of equality, a class compares objects by identity. Compare the attributes, or (see Data Models & Typing) define equality for the class.",
      },
    ],
    review: [
      "A name refers to an object; assignment, lists and function calls share it rather than copy it.",
      "`is` means the same object; on a plain class `==` means the same thing.",
      "To keep an original unchanged, make a new object from its attribute values.",
      "Next: a constructor that refuses invalid data, so every object that exists is valid.",
    ],
  },

  // ------------------------------------------------------------------ PY-L26-03 validating constructors
  {
    id: "PY-L26-03",
    version: 2,
    slug: "the-constructor",
    title: "Constructors that keep objects valid",
    lede: "If __init__ converts and checks its arguments and raises ValueError for bad ones, an invalid object can never exist, and the rest of the program can trust every object it gets.",
    focus: "Write an __init__ that converts, normalises and validates its arguments, gives safe defaults, and raises ValueError for bad data.",
    minutes: 20,
    objectives: [
      "Convert and tidy arguments in `__init__` (strip, upper, float) before storing them",
      "Raise `ValueError` from `__init__` so an invalid object is never created",
      "Give parameters defaults, and avoid the shared mutable default trap",
    ],
    requires: ["arithmetic", "assert-stmt", "assignment", "attr-assign", "class-def", "comparison", "continue-statement", "conversion", "dict-literal", "dict-lookup", "enumerate-call", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "spaces-in-text", "star-args", "star-kwargs", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unquoted-name"],
    teaches: ["init-validate"],
    blocks: [
      {
        kind: "text",
        md: "Data arrives messy: SKUs in lower case with spaces, prices as text, negative stock from a typo. If every function that uses a product has to check all of that, the checks get forgotten somewhere. Put them in **one** place instead: the constructor. `__init__` can tidy each argument, convert it, and `raise ValueError(...)` (see Exceptions & Validation) when it can't be made valid. Because the error stops the object from being created, every Product that *does* exist is valid, and the rest of the program can rely on it.\n\nA parameter can have a default (`stock=0`, the Functions module), so callers can leave it out.",
      },
      {
        kind: "example",
        title: "A product that checks itself",
        code: src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

mat = Product(" spo-11681", "Yoga mat ", "31.00", "12")
print(mat.sku, repr(mat.name), mat.price, mat.stock)
lamp = Product("HOM-22847", "Desk lamp", 48)
print(lamp.sku, lamp.stock)
for args in [("SPO-1168", "Mat", 5), ("ELE-24781", "Speaker", -1)]:
    try:
        Product(*args)
    except ValueError as err:
        print("refused:", err)
`,
        output: "SPO-11681 'Yoga mat' 31.0 12\nHOM-22847 0\nrefused: bad SKU: 'SPO-1168'\nrefused: negative price for ELE-24781: -1.0\n",
        note: "The text `\" spo-11681\"` and `\"31.00\"` arrive messy and leave tidy. The two bad calls never produce an object at all. `Product(*args)` passes the tuple's three values as three arguments (see Advanced Functions & Recursion).",
      },
      {
        kind: "text",
        md: "Defaults need one warning. A default value is created **once**, when `def` runs, not each time the function is called. For a number or a text that doesn't matter. For a **list**, every object that uses the default shares that one list.",
      },
      {
        kind: "error-example",
        title: "Two baskets, one default list",
        code: src`
class Basket:
    def __init__(self, customer_id, items=[]):
        self.customer_id = customer_id
        self.items = items

nora = Basket("C00038")
nora.items.append("SPO-11681")
jamal = Basket("C00077")
assert jamal.items == [], f"Jamal's new basket already holds {jamal.items}"
`,
        error: "AssertionError",
        output: "",
        note: "Both baskets got the same default list, so Nora's item appears in Jamal's brand-new basket: `AssertionError: Jamal's new basket already holds ['SPO-11681']`.",
      },
      {
        kind: "text",
        md: "The fix is a default of `None`, replaced inside `__init__` by a new list. While at it, make a copy of a list the caller passes in, so the object doesn't share the caller's list either.",
      },
      {
        kind: "example",
        title: "The None default",
        code: src`
class Basket:
    def __init__(self, customer_id, items=None):
        if not customer_id:
            raise ValueError("a basket needs a customer")
        self.customer_id = customer_id
        if items is None:
            items = []
        self.items = list(items)

nora = Basket("C00038")
nora.items.append("SPO-11681")
jamal = Basket("C00077")
saved = ["HOM-22847", "ELE-24781"]
grace = Basket("C01338", saved)
grace.items.append("TOY-54564")
print(nora.items, jamal.items)
print(grace.items, saved)
`,
        output: "['SPO-11681'] []\n['HOM-22847', 'ELE-24781', 'TOY-54564'] ['HOM-22847', 'ELE-24781']\n",
        note: "Each basket gets its own list, and Grace's basket starts as a copy of `saved`, so adding to it doesn't change the caller's list.",
      },
      {
        kind: "text",
        md: "**When to use it:** for any class whose objects must obey rules (prices not negative, ids in a format, quantities whole and positive). Validate where the object is created, not in every function that uses it.\n\n**Mistakes to avoid:** storing first and checking later (an exception halfway leaves no object, but checks after `self.x = …` read badly); `assert` instead of `raise` (asserts can be switched off, the Testing & Code Quality module); mutable defaults such as `items=[]`; and error messages that don't say which value was wrong.",
      },
    ],
    tryIt: {
      id: "try",
      title: "No empty order lines",
      prompt: "An order line with a quantity of 0 or less makes no sense, but this class accepts one. Make `__init__` raise `ValueError` when the quantity is below 1.",
      spec: [
        ["Change", "`OrderLine(sku, quantity, unit_price)` raises ValueError when `quantity < 1`"],
      ],
      starter: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

line = OrderLine("SPO-11681", 2, 17.92)
print(line.sku, line.quantity)
`,
      answer: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        if quantity < 1:
            raise ValueError(f"quantity must be at least 1, got {quantity}")
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

line = OrderLine("SPO-11681", 2, 17.92)
print(line.sku, line.quantity)
`,
      wrong: [
        {
          code: src`
class OrderLine:
    def __init__(self, sku, quantity, unit_price):
        if quantity < 0:
            raise ValueError("negative quantity")
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price
`,
          fails: ["zero"],
          why: "a quantity of 0 still gets through",
        },
      ],
      hints: [
        "The check goes at the start of `__init__`, before anything is stored.",
        "Use `if` and `raise`, not `assert`.",
        "A quantity is acceptable from 1 upwards; the message should include the bad value.",
      ],
      task: {
        checks: [
          expr("valid", "A valid line is created", "_l = OrderLine('SPO-11681', 2, 17.92)\nresult = [_l.sku, _l.quantity, _l.unit_price]", ["SPO-11681", 2, 17.92], { show: "OrderLine(\"SPO-11681\", 2, 17.92)" }),
          raisesExpr("zero", "A quantity of 0 is refused", "OrderLine('SPO-11681', 0, 17.92)", "ValueError", { show: "OrderLine(\"SPO-11681\", 0, 17.92)" }),
          raisesExpr("negative", "A negative quantity is refused", "OrderLine('SPO-11681', -3, 17.92)", "ValueError", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A customer that can be trusted",
        prompt: "Write `Customer(customer_id, name, email, city=\"\")` that tidies and validates its data. The id must look like `C` followed by five digits. The name has its outer spaces removed and must not be empty. The email has its outer spaces removed, is stored in lower case, and must contain exactly one `@` with something on both sides. The city is stripped and title-cased (`\"new york \"` → `\"New York\"`). Anything invalid raises `ValueError`.",
        spec: [
          ["Class", "`Customer(customer_id, name, email, city=\"\")` with attributes `customer_id`, `name`, `email`, `city`"],
          ["Valid", "id like `C00077`; non-empty name; email `local@domain` with one `@`; city optional"],
          ["Tidies", "strip everything; email to lower case; city with `.title()`"],
          ["Raises", "`ValueError` for a bad id, an empty name or a bad email"],
        ],
        starter: src`
import re

class Customer:
    def __init__(self, customer_id, name, email, city=""):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.city = city

nora = Customer("C00038", " Nora Garcia ", " Nora_Garcia@Fastmail.com", "new york ")
print(nora.name, nora.email, nora.city)
`,
        answer: src`
import re

class Customer:
    def __init__(self, customer_id, name, email, city=""):
        if not re.fullmatch(r"C\d{5}", customer_id):
            raise ValueError(f"bad customer id: {customer_id!r}")
        name = name.strip()
        if not name:
            raise ValueError("a customer needs a name")
        email = email.strip().lower()
        local, at, domain = email.partition("@")
        if not local or not domain or "@" in domain:
            raise ValueError(f"bad email: {email!r}")
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.city = city.strip().title()

nora = Customer("C00038", " Nora Garcia ", " Nora_Garcia@Fastmail.com", "new york ")
print(nora.name, nora.email, nora.city)
`,
        alternatives: [
          src`
import re

class Customer:
    def __init__(self, customer_id, name, email, city=""):
        if re.fullmatch(r"C[0-9]{5}", customer_id) is None:
            raise ValueError("customer id must be C and five digits")
        if name.strip() == "":
            raise ValueError("empty name")
        cleaned = email.strip().lower()
        parts = cleaned.split("@")
        if len(parts) != 2 or parts[0] == "" or parts[1] == "":
            raise ValueError("email must be local@domain")
        self.customer_id = customer_id
        self.name = name.strip()
        self.email = cleaned
        self.city = city.strip().title()
`,
        ],
        wrong: [
          {
            code: src`
import re

class Customer:
    def __init__(self, customer_id, name, email, city=""):
        if not re.fullmatch(r"C\d{5}", customer_id):
            raise ValueError("bad id")
        if not name.strip():
            raise ValueError("no name")
        if "@" not in email:
            raise ValueError("bad email")
        self.customer_id = customer_id
        self.name = name.strip()
        self.email = email.strip().lower()
        self.city = city.strip().title()
`,
            fails: ["bad-emails"],
            why: "`\"@\" in email` accepts `@fastmail.com`, `nora@` and two `@`s",
          },
          {
            code: src`
import re

class Customer:
    def __init__(self, customer_id, name, email, city=""):
        if not re.fullmatch(r"C\d{5}", customer_id):
            raise ValueError("bad id")
        if not name.strip():
            raise ValueError("no name")
        local, at, domain = email.strip().lower().partition("@")
        if not local or not domain or "@" in domain:
            raise ValueError("bad email")
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.city = city
`,
            fails: ["tidy"],
            why: "the checks run on tidied values, but the untidied ones are stored",
          },
        ],
        hints: [
          "Tidy first, check second, store last: the checks and the stored values must use the same tidied text.",
          "`re.fullmatch` (see Dates Numbers & Regex) checks the whole id. For the email, `partition(\"@\")` splits at the first `@` into three parts.",
          "An email is bad when the part before the `@` or the part after it is empty, or the part after it contains another `@`.",
        ],
        task: {
          checks: [
            expr("tidy", "Values are tidied before they are stored", "_c = Customer('C00038', ' Nora Garcia ', ' Nora_Garcia@Fastmail.com', 'new york ')\nresult = [_c.customer_id, _c.name, _c.email, _c.city]", ["C00038", "Nora Garcia", "nora_garcia@fastmail.com", "New York"], { show: "Customer(\"C00038\", \" Nora Garcia \", \" Nora_Garcia@Fastmail.com\", \"new york \")" }),
            expr("default-city", "The city is optional", "result = Customer('C00077', 'Jamal Walker', 'jamal.walker62@icloud.com').city", "", { hidden: true }),
            expr("bad-ids", "Bad ids are refused", "_out = []\nfor _id in ['00077', 'C0077', 'c00077', 'C000777']:\n    try:\n        Customer(_id, 'X', 'x@y.com')\n        _out.append('created')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused", "refused", "refused"], { show: "Customer(<ids 00077, C0077, c00077, C000777>, ...)" }),
            expr("bad-emails", "Bad emails are refused", "_out = []\nfor _e in ['@fastmail.com', 'nora@', 'nora@@fastmail.com', 'nora.fastmail.com', '  ']:\n    try:\n        Customer('C00038', 'Nora', _e)\n        _out.append('created')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused", "refused", "refused", "refused"], { hidden: true }),
            raisesExpr("blank-name", "A blank name is refused", "Customer('C00038', '   ', 'nora@fastmail.com')", "ValueError", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Load the products that are valid",
        prompt: "The `Product` class from the lesson is given; it raises ValueError for a bad SKU or a negative price. Write `load_products(rows)`: build a Product from every row, skip the rows that can't be built, and report why. Rows are dictionaries with `sku`, `name`, `price` and `stock` (all text); some may be missing a field.",
        spec: [
          ["Function", "`load_products(rows)`"],
          ["Returns", "a tuple `(products, errors)`: the Product objects that could be built, in order, and a list of texts"],
          ["errors", "`\"row <n>: <message>\"` for a ValueError (n counts from 1), `\"row <n>: missing <field>\"` for a missing field, e.g. `row 3: missing 'price'`"],
          ["Example", "rows 1 and 2 good, row 3 with SKU `\"SPO-1\"` → 2 products, `[\"row 3: bad SKU: 'SPO-1'\"]`"],
        ],
        starter: src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

def load_products(rows):
    return [], []

rows = [
    {"sku": "spo-11681", "name": "Yoga mat", "price": "31.00", "stock": "12"},
    {"sku": "HOM-22847", "name": "Desk lamp", "price": "48", "stock": "3"},
    {"sku": "SPO-1", "name": "Mat", "price": "5", "stock": "1"},
    {"sku": "ELE-24781", "name": "Speaker", "stock": "7"},
]
products, errors = load_products(rows)
print([p.sku for p in products])
print(errors)
`,
        answer: src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

def load_products(rows):
    products = []
    errors = []
    for number, row in enumerate(rows, start=1):
        try:
            products.append(Product(row["sku"], row["name"], row["price"], row["stock"]))
        except KeyError as err:
            errors.append(f"row {number}: missing {err}")
        except ValueError as err:
            errors.append(f"row {number}: {err}")
    return products, errors

rows = [
    {"sku": "spo-11681", "name": "Yoga mat", "price": "31.00", "stock": "12"},
    {"sku": "HOM-22847", "name": "Desk lamp", "price": "48", "stock": "3"},
    {"sku": "SPO-1", "name": "Mat", "price": "5", "stock": "1"},
    {"sku": "ELE-24781", "name": "Speaker", "stock": "7"},
]
products, errors = load_products(rows)
print([p.sku for p in products])
print(errors)
`,
        alternatives: [
          src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

def load_products(rows):
    good, problems = [], []
    number = 0
    for row in rows:
        number += 1
        missing = [field for field in ["sku", "name", "price", "stock"] if field not in row]
        if missing:
            problems.append(f"row {number}: missing {missing[0]!r}")
            continue
        try:
            good.append(Product(**row))
        except ValueError as err:
            problems.append(f"row {number}: {err}")
    return good, problems
`,
        ],
        wrong: [
          {
            code: src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

def load_products(rows):
    products = []
    errors = []
    for number, row in enumerate(rows, start=1):
        try:
            products.append(Product(row["sku"], row["name"], row["price"], row["stock"]))
        except ValueError as err:
            errors.append(f"row {number}: {err}")
    return products, errors
`,
            fails: ["returns", "missing"],
            why: "a missing field raises KeyError, which isn't caught, so the whole load stops",
          },
          {
            code: src`
import re

class Product:
    def __init__(self, sku, name, price, stock=0):
        sku = sku.strip().upper()
        if not re.fullmatch(r"[A-Z]{3}-\d{5}", sku):
            raise ValueError(f"bad SKU: {sku!r}")
        price = float(price)
        if price < 0:
            raise ValueError(f"negative price for {sku}: {price}")
        self.sku = sku
        self.name = name.strip()
        self.price = price
        self.stock = int(stock)

def load_products(rows):
    products = []
    errors = []
    for number, row in enumerate(rows):
        try:
            products.append(Product(row["sku"], row["name"], row["price"], row["stock"]))
        except (KeyError, ValueError) as err:
            errors.append(f"row {number}: {err}")
    return products, errors
`,
            fails: ["returns", "missing", "bad-values"],
            why: "rows are counted from 0, and a missing field is reported without the word missing",
          },
        ],
        hints: [
          "One `try` per row, around building the Product, so one bad row doesn't stop the others.",
          "Two different errors need two `except` clauses: a missing field raises KeyError, an invalid value raises ValueError.",
          "`str` of a KeyError is the key in quotes, which is exactly what the message needs. Number the rows with `enumerate(..., start=1)`.",
        ],
        task: {
          checks: [
            expr("returns", "Good products and error messages", "_p, _e = load_products([{'sku': 'spo-11681', 'name': 'Yoga mat', 'price': '31.00', 'stock': '12'}, {'sku': 'HOM-22847', 'name': 'Desk lamp', 'price': '48', 'stock': '3'}, {'sku': 'SPO-1', 'name': 'Mat', 'price': '5', 'stock': '1'}, {'sku': 'ELE-24781', 'name': 'Speaker', 'stock': '7'}])\nresult = ([_x.sku for _x in _p], _e)", py.tuple(py.list(py.str("SPO-11681"), py.str("HOM-22847")), py.list(py.str("row 3: bad SKU: 'SPO-1'"), py.str("row 4: missing 'price'"))), { show: "load_products(rows): the SKUs loaded and the errors" }),
            expr("missing", "A row without a SKU", "_p, _e = load_products([{'name': 'Nothing', 'price': '1', 'stock': '1'}])\nresult = (len(_p), _e)", py.tuple(py.int(0), py.list(py.str("row 1: missing 'sku'"))), { hidden: true }),
            expr("bad-values", "A negative price and a price that isn't a number", "_p, _e = load_products([{'sku': 'TOY-54564', 'name': 'Kite', 'price': '-2', 'stock': '1'}, {'sku': 'TOY-54565', 'name': 'Ball', 'price': 'free', 'stock': '1'}, {'sku': 'TOY-54566', 'name': 'Yo-yo', 'price': '2.5', 'stock': '4'}])\nresult = ([_x.sku for _x in _p], [_m.split(':')[0] for _m in _e])", py.tuple(py.list(py.str("TOY-54566")), py.list(py.str("row 1"), py.str("row 2"))), { hidden: true }),
            expr("empty", "No rows", "_p, _e = load_products([])\nresult = (_p, _e)", py.tuple(py.list(), py.list()), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Payment:
    def __init__(self, payment_id, amount, currency="GBP"):
        amount = round(float(amount), 2)
        if amount <= 0:
            raise ValueError(f"{payment_id}: amount must be positive")
        self.payment_id = payment_id
        self.amount = amount
        self.currency = currency.upper()

made = []
for pid, amount in [("PAY1", "19.999"), ("PAY2", "0"), ("PAY3", 5)]:
    try:
        made.append(Payment(pid, amount, "usd"))
    except ValueError as err:
        print(err)
print([(p.payment_id, p.amount, p.currency) for p in made])
`,
        choices: [
          "PAY2: amount must be positive\n[('PAY1', 20.0, 'USD'), ('PAY3', 5.0, 'USD')]",
          "[('PAY1', 19.999, 'usd'), ('PAY2', 0, 'usd'), ('PAY3', 5, 'usd')]",
          "PAY2: amount must be positive\n[('PAY1', 20.0, 'usd'), ('PAY3', 5, 'usd')]",
          "PAY2: amount must be positive\n[('PAY1', 19.999, 'USD'), ('PAY3', 5.0, 'USD')]",
        ],
        answer: 0,
        why: "Every amount is converted and rounded before it is checked and stored: 19.999 becomes 20.0 and 5 becomes 5.0. PAY2 never becomes an object. The currency is upper-cased for every payment that is created.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the value is tidied after it was stored. What does this print?",
        program: src`
class Customer:
    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email
        if "@" not in email:
            raise ValueError(f"bad email: {email!r}")
        email = email.strip().lower()

nora = Customer("C00038", "  Nora_Garcia@Fastmail.COM ")
print(repr(nora.email))
`,
        choices: ["'  Nora_Garcia@Fastmail.COM '", "'nora_garcia@fastmail.com'", "ValueError: bad email", "'Nora_Garcia@Fastmail.COM'"],
        answer: 0,
        why: "`self.email` was stored before the tidying line, and that line only rebinds the local name `email`. Tidy and check first, then store the tidied value.",
      },
      {
        id: "q3",
        prompt: "Where should the rule \"a product's price can't be negative\" be enforced?",
        choices: [
          "In the Product class's __init__, by raising ValueError",
          "In every function that reads a price",
          "In a comment above the class",
          "With an assert in the shop's checkout code",
        ],
        answer: 0,
        why: "Checked once where objects are created, the rule holds for every Product in the program. Checks spread over many functions get forgotten, and asserts can be switched off.",
      },
    ],
    review: [
      "`__init__` can tidy, convert and check its arguments before storing them.",
      "Raising ValueError there means an invalid object is never created.",
      "Defaults are made once: use `None` and create a new list inside, and copy lists the caller passes in.",
      "Next: methods, the functions that belong to a class.",
    ],
  },

  // ------------------------------------------------------------------ PY-L26-04 methods
  {
    id: "PY-L26-04",
    version: 2,
    slug: "a-method",
    title: "Methods: behaviour that belongs to the object",
    lede: "A method is a function defined inside a class. Called on an object, it receives that object as self, so it can compute from its attributes or change them.",
    focus: "Write methods that compute from an object's attributes and methods that change them, and call them on objects.",
    minutes: 20,
    objectives: [
      "Define methods with `self` as the first parameter and call them as `obj.method(...)`",
      "Write methods that compute a value from the object's state, and methods that change it",
      "Keep rules (like \"can't ship more than is in stock\") inside the methods that change the state",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "dict-get", "dict-iterate", "dict-literal", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-index", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "top-level-indent", "try-except", "value-count"],
    teaches: ["method-def"],
    blocks: [
      {
        kind: "text",
        md: "Functions that work on one kind of object belong with it. A **method** is a function defined inside the class. Its first parameter is `self`. You call it on an object, `order.total()`, and Python passes that object as `self`, so `order.total()` means \"run Order's `total` with `self` = this order\".\n\nTwo kinds of method cover most needs:\n\n- methods that **compute** a value from the attributes and return it (`total`, `needs_reorder`);\n- methods that **change** the attributes (`add_line`, `ship`), often checking a rule first.\n\nA computed method stays right after changes: a total stored once in `__init__` goes stale when a line is added; a `total()` method recalculates every time.",
      },
      {
        kind: "example",
        title: "An order that adds up its lines",
        code: src`
class Order:
    def __init__(self, order_id):
        self.order_id = order_id
        self.lines = []

    def add_line(self, sku, quantity, unit_price):
        if quantity < 1:
            raise ValueError(f"quantity must be at least 1, got {quantity}")
        self.lines.append((sku, quantity, unit_price))

    def total(self):
        amount = 0
        for sku, quantity, unit_price in self.lines:
            amount += quantity * unit_price
        return round(amount, 2)

order = Order("O100282")
order.add_line("SPO-11681", 2, 17.92)
print(order.order_id, order.total())
order.add_line("HOM-22847", 1, 4.99)
print(len(order.lines), "lines, total", order.total())
`,
        output: "O100282 35.84\n2 lines, total 40.83\n",
        note: "`add_line` changes the order and enforces its rule in one place. `total()` reads the lines every time it is called, so it is correct after the second line was added.",
      },
      {
        kind: "error-example",
        title: "A method without self",
        code: src`
class Order:
    def __init__(self, order_id):
        self.order_id = order_id
        self.lines = []

    def item_count():
        return len(self.lines)

order = Order("O100918")
print(order.item_count())
`,
        error: "TypeError",
        output: "",
        note: "`order.item_count()` passes the order as the first argument, but the method accepts none: `TypeError: Order.item_count() takes 0 positional arguments but 1 was given`.",
      },
      {
        kind: "example",
        title: "Stock that can't go negative",
        code: src`
class StockItem:
    def __init__(self, sku, on_hand, reorder_level):
        self.sku = sku
        self.on_hand = on_hand
        self.reorder_level = reorder_level

    def receive(self, quantity):
        self.on_hand += quantity

    def ship(self, quantity):
        if quantity > self.on_hand:
            raise ValueError(f"only {self.on_hand} of {self.sku} on hand")
        self.on_hand -= quantity

    def needs_reorder(self):
        return self.on_hand <= self.reorder_level

mat = StockItem("SPO-11681", 12, 5)
for kind, quantity in [("ship", 4), ("ship", 3), ("receive", 10), ("ship", 15), ("ship", 30)]:
    try:
        if kind == "ship":
            mat.ship(quantity)
        else:
            mat.receive(quantity)
        print(kind, quantity, "-> on hand", mat.on_hand, "| reorder:", mat.needs_reorder())
    except ValueError as err:
        print(kind, quantity, "-> refused:", err)
`,
        output: "ship 4 -> on hand 8 | reorder: False\nship 3 -> on hand 5 | reorder: True\nreceive 10 -> on hand 15 | reorder: False\nship 15 -> on hand 0 | reorder: True\nship 30 -> refused: only 0 of SPO-11681 on hand\n",
        note: "Code outside the class never changes `on_hand` directly; it asks the object to `ship` or `receive`, and the object keeps its own rule. The refused shipment leaves the stock as it was.",
      },
      {
        kind: "text",
        md: "**When to use it:** when a function needs one object's attributes, or must keep that object's rules, make it a method of the class.\n\n**Mistakes to avoid:** forgetting `self` (above); forgetting the brackets, `order.total` instead of `order.total()` (you get the method itself, not its result); storing values that can be computed (they go stale); and changing attributes from outside the class when a method exists to do it safely.",
      },
    ],
    tryIt: {
      id: "try",
      title: "How many items?",
      prompt: "Add a method `item_count()` to `Order` that returns the total quantity across all lines (two mats and one lamp is 3 items).",
      spec: [
        ["Method", "`order.item_count()` → the sum of the lines' quantities"],
      ],
      starter: src`
class Order:
    def __init__(self, order_id):
        self.order_id = order_id
        self.lines = []

    def add_line(self, sku, quantity, unit_price):
        self.lines.append((sku, quantity, unit_price))

order = Order("O100282")
order.add_line("SPO-11681", 2, 17.92)
order.add_line("HOM-22847", 1, 4.99)
print(len(order.lines))
`,
      answer: src`
class Order:
    def __init__(self, order_id):
        self.order_id = order_id
        self.lines = []

    def add_line(self, sku, quantity, unit_price):
        self.lines.append((sku, quantity, unit_price))

    def item_count(self):
        count = 0
        for sku, quantity, unit_price in self.lines:
            count += quantity
        return count

order = Order("O100282")
order.add_line("SPO-11681", 2, 17.92)
order.add_line("HOM-22847", 1, 4.99)
print(order.item_count())
`,
      wrong: [
        {
          code: src`
class Order:
    def __init__(self, order_id):
        self.order_id = order_id
        self.lines = []

    def add_line(self, sku, quantity, unit_price):
        self.lines.append((sku, quantity, unit_price))

    def item_count(self):
        return len(self.lines)
`,
          fails: ["count"],
          why: "it counts lines, not items: two mats on one line count as one",
        },
      ],
      hints: [
        "A new `def` inside the class, indented like `add_line`, with `self` as its only parameter.",
        "Each line is a `(sku, quantity, unit_price)` tuple in `self.lines`.",
        "Add up the quantities and return the sum.",
      ],
      task: {
        checks: [
          expr("count", "Items across all lines", "_o = Order('O100282')\n_o.add_line('SPO-11681', 2, 17.92)\n_o.add_line('HOM-22847', 1, 4.99)\nresult = _o.item_count()", 3, { show: "order.item_count() after two mats and one lamp" }),
          expr("empty", "An empty order", "result = Order('O1').item_count()", 0, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A shopping cart",
        prompt: "Write a class `Cart` for a basket that is still being filled. Adding a SKU that is already in the cart increases its quantity instead of adding a second entry. Removing a SKU that isn't there is a `ValueError`.",
        spec: [
          ["Class", "`Cart()` starts empty"],
          ["`add_item(sku, quantity, unit_price)`", "adds the quantity; for a SKU already in the cart, increases its quantity (the price stays as first added)"],
          ["`remove(sku)`", "removes the SKU completely; `ValueError` if it isn't in the cart"],
          ["`total()`", "the sum of quantity × unit price, rounded to 2 places"],
          ["`count()`", "how many items in total"],
        ],
        starter: src`
class Cart:
    pass

cart = Cart()
cart.add_item("SPO-11681", 1, 17.92)
cart.add_item("HOM-22847", 2, 4.99)
cart.add_item("SPO-11681", 1, 17.92)
print(cart.count(), cart.total())
`,
        answer: src`
class Cart:
    def __init__(self):
        self.lines = {}

    def add_item(self, sku, quantity, unit_price):
        if sku in self.lines:
            self.lines[sku][0] += quantity
        else:
            self.lines[sku] = [quantity, unit_price]

    def remove(self, sku):
        if sku not in self.lines:
            raise ValueError(f"{sku} is not in the cart")
        del self.lines[sku]

    def total(self):
        amount = 0
        for quantity, unit_price in self.lines.values():
            amount += quantity * unit_price
        return round(amount, 2)

    def count(self):
        items = 0
        for quantity, unit_price in self.lines.values():
            items += quantity
        return items

cart = Cart()
cart.add_item("SPO-11681", 1, 17.92)
cart.add_item("HOM-22847", 2, 4.99)
cart.add_item("SPO-11681", 1, 17.92)
print(cart.count(), cart.total())
`,
        alternatives: [
          src`
class Cart:
    def __init__(self):
        self.quantities = {}
        self.prices = {}

    def add_item(self, sku, quantity, unit_price):
        self.quantities[sku] = self.quantities.get(sku, 0) + quantity
        self.prices.setdefault(sku, unit_price)

    def remove(self, sku):
        if sku not in self.quantities:
            raise ValueError("not in cart")
        del self.quantities[sku]
        del self.prices[sku]

    def total(self):
        return round(sum(q * self.prices[s] for s, q in self.quantities.items()), 2)

    def count(self):
        return sum(self.quantities.values())
`,
        ],
        wrong: [
          {
            code: src`
class Cart:
    def __init__(self):
        self.lines = []

    def add_item(self, sku, quantity, unit_price):
        self.lines.append((sku, quantity, unit_price))

    def remove(self, sku):
        for line in self.lines:
            if line[0] == sku:
                self.lines.remove(line)
                return
        raise ValueError(f"{sku} is not in the cart")

    def total(self):
        return round(sum(q * p for s, q, p in self.lines), 2)

    def count(self):
        return sum(q for s, q, p in self.lines)
`,
            fails: ["remove"],
            why: "a repeated SKU becomes a second line, so `remove` takes away only one of them",
          },
          {
            code: src`
class Cart:
    def __init__(self):
        self.lines = {}

    def add_item(self, sku, quantity, unit_price):
        self.lines[sku] = [quantity, unit_price]

    def remove(self, sku):
        if sku not in self.lines:
            raise ValueError("not in cart")
        del self.lines[sku]

    def total(self):
        return round(sum(q * p for q, p in self.lines.values()), 2)

    def count(self):
        return sum(q for q, p in self.lines.values())
`,
            fails: ["merge"],
            why: "adding a SKU again replaces its quantity instead of increasing it",
          },
        ],
        hints: [
          "Store the cart's contents in `__init__`; a dictionary from SKU to `[quantity, unit_price]` makes merging easy.",
          "`add_item` decides: is the SKU already there? Then increase the stored quantity; otherwise create the entry.",
          "`total` and `count` walk the stored entries. `remove` checks first and raises if the SKU is missing.",
        ],
        task: {
          checks: [
            expr("merge", "Adding a SKU twice merges it", "_c = Cart()\n_c.add_item('SPO-11681', 1, 17.92)\n_c.add_item('HOM-22847', 2, 4.99)\n_c.add_item('SPO-11681', 1, 17.92)\nresult = (_c.count(), _c.total())", py.tuple(py.int(4), py.float(45.82)), { show: "count() and total() after adding SPO-11681, HOM-22847 ×2, SPO-11681 again" }),
            expr("remove", "Removing a merged SKU removes all of it", "_c = Cart()\n_c.add_item('SPO-11681', 1, 17.92)\n_c.add_item('SPO-11681', 2, 17.92)\n_c.add_item('TOY-54564', 1, 26.99)\n_c.remove('SPO-11681')\nresult = (_c.count(), _c.total())", py.tuple(py.int(1), py.float(26.99)), { hidden: true }),
            raisesExpr("missing", "Removing a SKU that isn't there", "_c = Cart()\n_c.add_item('A', 1, 1.0)\n_c.remove('B')", "ValueError", { show: "cart.remove(<a SKU not in the cart>)" }),
            expr("empty", "An empty cart", "_c = Cart()\nresult = (_c.count(), _c.total())", py.tuple(py.int(0), py.int(0)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A gift card",
        prompt: "Write a class `GiftCard(code, value)`. `redeem(amount)` takes as much of the amount as the card's balance allows and returns what it took (a £30 purchase on a card with £20 left takes £20; the customer pays the rest another way). It also records `(amount asked, amount taken)` in a `history` list. An amount of 0 or less is a `ValueError`. `is_used_up()` says whether the balance has reached 0.",
        spec: [
          ["Class", "`GiftCard(code, value)` with attributes `code`, `balance` (starts at `value`) and `history` (starts empty)"],
          ["`redeem(amount)`", "takes `min(amount, balance)`, lowers the balance, appends `(amount, taken)` to history, returns `taken`; `ValueError` for amount ≤ 0"],
          ["`is_used_up()`", "True when the balance is 0"],
        ],
        starter: src`
class GiftCard:
    pass

card = GiftCard("GIFT-2041", 50)
print(card.redeem(30), card.balance)
print(card.redeem(30), card.balance, card.is_used_up())
print(card.history)
`,
        answer: src`
class GiftCard:
    def __init__(self, code, value):
        self.code = code
        self.balance = value
        self.history = []

    def redeem(self, amount):
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")
        taken = min(amount, self.balance)
        self.balance -= taken
        self.history.append((amount, taken))
        return taken

    def is_used_up(self):
        return self.balance == 0

card = GiftCard("GIFT-2041", 50)
print(card.redeem(30), card.balance)
print(card.redeem(30), card.balance, card.is_used_up())
print(card.history)
`,
        alternatives: [
          src`
class GiftCard:
    def __init__(self, code, value):
        self.code = code
        self.balance = value
        self.history = []

    def redeem(self, amount):
        if not amount > 0:
            raise ValueError("positive amounts only")
        if amount > self.balance:
            taken = self.balance
        else:
            taken = amount
        self.balance = self.balance - taken
        self.history += [(amount, taken)]
        return taken

    def is_used_up(self):
        return not self.balance
`,
        ],
        wrong: [
          {
            code: src`
class GiftCard:
    def __init__(self, code, value):
        self.code = code
        self.balance = value
        self.history = []

    def redeem(self, amount):
        if amount <= 0:
            raise ValueError("positive amounts only")
        self.balance -= amount
        self.history.append((amount, amount))
        return amount

    def is_used_up(self):
        return self.balance == 0
`,
            fails: ["partial", "history"],
            why: "it takes the whole amount even when the card has less, so the balance goes negative",
          },
          {
            code: src`
class GiftCard:
    history = []

    def __init__(self, code, value):
        self.code = code
        self.balance = value

    def redeem(self, amount):
        if amount <= 0:
            raise ValueError("positive amounts only")
        taken = min(amount, self.balance)
        self.balance -= taken
        self.history.append((amount, taken))
        return taken

    def is_used_up(self):
        return self.balance == 0
`,
            fails: ["history", "separate"],
            why: "`history` belongs to the class, so every card writes into the same list",
          },
        ],
        hints: [
          "`__init__` sets three attributes; the history must be a new list for every card.",
          "In `redeem`, check the amount first, then work out how much can be taken: the smaller of the amount and the balance.",
          "Lower the balance by what was taken, record the pair, return what was taken.",
        ],
        task: {
          checks: [
            expr("partial", "A purchase larger than the balance", "_g = GiftCard('GIFT-2041', 50)\n_a = _g.redeem(30)\n_b = _g.redeem(30)\nresult = (_a, _b, _g.balance, _g.is_used_up())", py.tuple(py.int(30), py.int(20), py.int(0), py.bool(true)), { show: "two redeem(30) calls on a 50 card" }),
            expr("history", "The history records asked and taken", "_g = GiftCard('G1', 25)\n_g.redeem(10)\n_g.redeem(40)\nresult = _g.history", [py.tuple(py.int(10), py.int(10)), py.tuple(py.int(40), py.int(15))], { show: "card.history after redeem(10), redeem(40) on a 25 card" }),
            raisesExpr("zero", "An amount of 0 is refused", "GiftCard('G1', 25).redeem(0)", "ValueError", { hidden: true }),
            expr("separate", "Two cards keep separate histories", "_a = GiftCard('A', 10)\n_b = GiftCard('B', 10)\n_a.redeem(4)\nresult = (_b.history, _b.balance, _a.is_used_up())", py.tuple(py.list(), py.int(10), py.bool(false)), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Account:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0

    def deposit(self, amount):
        self.balance += amount
        return self.balance

    def report(self):
        return f"{self.owner}: {self.balance}"

nora = Account("Nora")
jamal = Account("Jamal")
nora.deposit(50)
jamal.deposit(nora.deposit(25))
print(nora.report(), "|", jamal.report())
`,
        choices: ["Nora: 75 | Jamal: 75", "Nora: 75 | Jamal: 25", "Nora: 50 | Jamal: 75", "Nora: 75 | Jamal: 0"],
        answer: 0,
        why: "`nora.deposit(25)` runs first, raising Nora's balance to 75 and returning 75; that value is then deposited into Jamal's account. Each object has its own balance.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the brackets are missing. What does the comparison print?",
        program: src`
class Order:
    def __init__(self, total):
        self.lines_total = total

    def total(self):
        return self.lines_total

order = Order(0)
print(order.total == 0, order.total() == 0)
`,
        choices: ["False True", "True True", "False False", "True False"],
        answer: 0,
        why: "`order.total` without brackets is the method itself, not its result, and a method is never equal to 0. Calling it with `()` returns 0.",
      },
      {
        id: "q3",
        prompt: "An inventory class has `on_hand`. Where should the rule \"never ship more than is on hand\" live?",
        choices: [
          "In the class's ship method, which checks before changing on_hand",
          "In every place that writes item.on_hand -= ...",
          "In __init__ only",
          "In a separate list of rules",
        ],
        answer: 0,
        why: "If changes go through a method, the rule is checked every time, in one place. Code that subtracts from the attribute directly can skip it.",
      },
    ],
    review: [
      "A method is a function in the class whose first parameter is `self`; call it as `obj.method()`.",
      "Compute values with methods so they stay right after the object changes.",
      "Changes go through methods that check the object's rules first.",
      "Next: values that belong to the class itself, and constructors that build objects from other data.",
    ],
  },

  // ------------------------------------------------------------------ PY-L26-05 class state and class methods
  {
    id: "PY-L26-05",
    version: 2,
    slug: "class-level-state",
    title: "Class attributes and class methods",
    lede: "Some values belong to the class, not to each object: a VAT rate, a set of allowed statuses, the next invoice number. A class method works with the class itself, for example to build objects from a row of data.",
    focus: "Store shared values as class attributes, avoid shadowing them through self, and write @classmethod alternative constructors.",
    minutes: 20,
    objectives: [
      "Define class attributes and read them through the class or through an object",
      "Explain why `self.counter += 1` creates an instance attribute instead of changing the class's",
      "Write a `@classmethod` such as `from_row` that builds an object with `cls(...)`",
    ],
    requires: ["arithmetic", "assert-stmt", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "conversion", "dict-literal", "dict-lookup", "exc-name", "function-def", "function-param", "function-return", "identity", "if-statement", "init-method", "list-literal", "list-mutate", "logical", "membership", "method-def", "plain-class", "precedence", "print-call", "print-several", "raise-stmt", "self-name", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "tuple-unpack", "type-call"],
    teaches: ["class-state", "classmethod-dec"],
    blocks: [
      {
        kind: "text",
        md: "A name assigned directly in the class body, outside any method, is a **class attribute**: one value shared by every object of the class. Constants such as a VAT rate fit here, and so does a counter that numbers invoices across all of them.\n\nReading `self.VAT_RATE` finds it: Python looks on the object first and, not finding it there, on the class. **Writing** is different: `self.x = …` always creates or changes an attribute on that one object. To change the shared value, assign through the class: `Invoice.next_number += 1`.",
      },
      {
        kind: "example",
        title: "Invoices numbered across the class",
        code: src`
class Invoice:
    VAT_RATE = 0.2
    next_number = 1

    def __init__(self, customer_id, net):
        self.number = f"INV-{Invoice.next_number:04d}"
        Invoice.next_number += 1
        self.customer_id = customer_id
        self.net = net

    def gross(self):
        return round(self.net * (1 + self.VAT_RATE), 2)

first = Invoice("C00077", 100.0)
second = Invoice("C01338", 19.99)
print(first.number, first.gross())
print(second.number, second.gross())
print(Invoice.VAT_RATE, first.VAT_RATE, Invoice.next_number)
`,
        output: "INV-0001 120.0\nINV-0002 23.99\n0.2 0.2 3\n",
        note: "Both invoices read the one `VAT_RATE`; change `Invoice.VAT_RATE` and every invoice's `gross()` changes with it. `{...:04d}` pads the number with zeros to four digits.",
      },
      {
        kind: "error-example",
        title: "Counting through self",
        code: src`
class Ticket:
    next_number = 1

    def __init__(self, subject):
        self.number = self.next_number
        self.next_number += 1
        self.subject = subject

first = Ticket("Parcel damaged")
second = Ticket("Wrong size")
print(first.number, second.number)
assert second.number == 2, f"both tickets got number {second.number}"
`,
        error: "AssertionError",
        output: "1 1\n",
        note: "`self.next_number += 1` reads the class's 1, adds 1, and stores 2 **on the ticket**. The class attribute never changes, so every ticket starts from 1: `AssertionError: both tickets got number 1`.",
      },
      {
        kind: "text",
        md: "A **class method** receives the class instead of an object. Mark it with `@classmethod` on the line above `def`; its first parameter is called `cls`. Its usual job is an **alternative constructor**: a second way to build an object, from a CSV row or a line of text, that does the parsing and then calls `cls(...)` like the ordinary constructor. Callers write `Product.from_row(row)`.",
      },
      {
        kind: "example",
        title: "Products from a row or a line",
        code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    @classmethod
    def from_row(cls, row):
        return cls(row["sku"].strip().upper(), row["name"].strip(), float(row["price"]))

    @classmethod
    def from_line(cls, line):
        sku, name, price = line.split(";")
        return cls(sku.strip().upper(), name.strip(), float(price))

a = Product.from_row({"sku": " spo-11681", "name": "Yoga mat", "price": "31.00"})
b = Product.from_line("hom-22847; Desk lamp ;48")
print(a.sku, a.name, a.price)
print(b.sku, b.name, b.price)
print(type(b).__name__)
`,
        output: "SPO-11681 Yoga mat 31.0\nHOM-22847 Desk lamp 48.0\nProduct\n",
        note: "Each source format has its own parsing method, and all of them end in the one `__init__`. `cls` is `Product` here; using `cls` rather than writing `Product` means the method keeps working for classes built on this one (see Inheritance & Composition).",
      },
      {
        kind: "text",
        md: "**When to use it:** class attributes for constants and values shared by every object; class methods for constructors that start from another format.\n\n**Mistakes to avoid:** changing a shared counter through `self` (above); a **list** or **dictionary** as a class attribute that objects then append to (every object shares it; make per-object lists in `__init__`); and writing `Product(...)` inside a class method instead of `cls(...)`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Move the parser into the class",
      prompt: "`product_from_row` is a separate function that builds a Product. Make it a class method of `Product` called `from_row`, so callers write `Product.from_row(row)`.",
      spec: [
        ["Method", "`Product.from_row(row)` → a Product with the tidied SKU, name and float price"],
      ],
      starter: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

def product_from_row(row):
    return Product(row["sku"].strip().upper(), row["name"].strip(), float(row["price"]))

mat = product_from_row({"sku": " spo-11681", "name": "Yoga mat", "price": "31.00"})
print(mat.sku, mat.price)
`,
      answer: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    @classmethod
    def from_row(cls, row):
        return cls(row["sku"].strip().upper(), row["name"].strip(), float(row["price"]))

mat = Product.from_row({"sku": " spo-11681", "name": "Yoga mat", "price": "31.00"})
print(mat.sku, mat.price)
`,
      wrong: [
        {
          code: src`
class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def from_row(self, row):
        return Product(row["sku"].strip().upper(), row["name"].strip(), float(row["price"]))
`,
          fails: ["another", "from-row"],
          why: "without `@classmethod`, `Product.from_row(row)` passes the row as `self` and nothing as `row`",
        },
      ],
      hints: [
        "Move the function inside the class and indent it.",
        "Mark it as a class method with the decorator line above the `def`, and make its first parameter `cls`.",
        "Inside, build the object with `cls(...)`.",
      ],
      task: {
        checks: [
          expr("from-row", "Product.from_row builds a tidy Product", "_p = Product.from_row({'sku': ' spo-11681', 'name': 'Yoga mat ', 'price': '31.00'})\nresult = [type(_p).__name__, _p.sku, _p.name, _p.price]", ["Product", "SPO-11681", "Yoga mat", py.float(31)], { show: "Product.from_row({\"sku\": \" spo-11681\", \"name\": \"Yoga mat \", \"price\": \"31.00\"})" }),
          expr("another", "Another row", "_p = Product.from_row({'sku': 'hom-22847', 'name': 'Desk lamp', 'price': '48'})\nresult = [_p.sku, _p.price]", ["HOM-22847", py.float(48)], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Shipping rates on the class",
        prompt: "Write a class `Shipment(order_id, total, speed)`. The rates live on the class: `RATES = {\"standard\": 3.5, \"express\": 8.0}` and `FREE_FROM = 50`. A speed that isn't in `RATES` is a `ValueError`. `cost()` is free for standard shipments of `FREE_FROM` or more, and the speed's rate otherwise. Because the rules are class attributes, changing `Shipment.FREE_FROM` must change the cost of every shipment, including ones already created.",
        spec: [
          ["Class attributes", "`RATES = {\"standard\": 3.5, \"express\": 8.0}`, `FREE_FROM = 50`"],
          ["`Shipment(order_id, total, speed)`", "`ValueError` for an unknown speed"],
          ["`cost()`", "0 for standard when `total >= FREE_FROM`; otherwise `RATES[speed]`; express is never free"],
        ],
        starter: src`
class Shipment:
    pass

small = Shipment("O100282", 35.84, "standard")
large = Shipment("O101219", 246.6, "standard")
fast = Shipment("O100918", 55.72, "express")
print(small.cost(), large.cost(), fast.cost())
`,
        answer: src`
class Shipment:
    RATES = {"standard": 3.5, "express": 8.0}
    FREE_FROM = 50

    def __init__(self, order_id, total, speed):
        if speed not in Shipment.RATES:
            raise ValueError(f"unknown speed {speed!r}")
        self.order_id = order_id
        self.total = total
        self.speed = speed

    def cost(self):
        if self.speed == "standard" and self.total >= Shipment.FREE_FROM:
            return 0
        return Shipment.RATES[self.speed]

small = Shipment("O100282", 35.84, "standard")
large = Shipment("O101219", 246.6, "standard")
fast = Shipment("O100918", 55.72, "express")
print(small.cost(), large.cost(), fast.cost())
`,
        alternatives: [
          src`
class Shipment:
    RATES = {"standard": 3.5, "express": 8.0}
    FREE_FROM = 50

    def __init__(self, order_id, total, speed):
        if speed not in self.RATES:
            raise ValueError("unknown speed")
        self.order_id = order_id
        self.total = total
        self.speed = speed

    def cost(self):
        free = self.speed == "standard" and self.total >= self.FREE_FROM
        return 0 if free else self.RATES[self.speed]
`,
        ],
        wrong: [
          {
            code: src`
class Shipment:
    RATES = {"standard": 3.5, "express": 8.0}
    FREE_FROM = 50

    def __init__(self, order_id, total, speed):
        if speed not in Shipment.RATES:
            raise ValueError("unknown speed")
        self.order_id = order_id
        self.total = total
        self.speed = speed
        self.free_from = Shipment.FREE_FROM

    def cost(self):
        if self.speed == "standard" and self.total >= self.free_from:
            return 0
        return Shipment.RATES[self.speed]
`,
            fails: ["class-change"],
            why: "each shipment copies FREE_FROM when it is created, so a later change on the class doesn't reach it",
          },
          {
            code: src`
class Shipment:
    RATES = {"standard": 3.5, "express": 8.0}
    FREE_FROM = 50

    def __init__(self, order_id, total, speed):
        self.order_id = order_id
        self.total = total
        self.speed = speed

    def cost(self):
        if self.total >= Shipment.FREE_FROM:
            return 0
        return Shipment.RATES[self.speed]
`,
            fails: ["costs", "unknown"],
            why: "express shipments become free over the threshold too, and an unknown speed is accepted",
          },
        ],
        hints: [
          "The two rules are assignments in the class body, above `__init__`.",
          "`__init__` checks the speed against `RATES` before storing anything.",
          "`cost()` reads the class attributes every time it runs; don't copy them onto the object.",
        ],
        task: {
          checks: [
            expr("costs", "Costs for standard and express", "result = [Shipment('O1', 35.84, 'standard').cost(), Shipment('O2', 246.6, 'standard').cost(), Shipment('O3', 55.72, 'express').cost(), Shipment('O4', 50, 'standard').cost()]", [3.5, 0, py.float(8), 0], { show: "cost() for standard 35.84, standard 246.6, express 55.72, standard 50", }),
            raisesExpr("unknown", "An unknown speed", "Shipment('O1', 10, 'drone')", "ValueError", { show: "Shipment(\"O1\", 10, \"drone\")" }),
            expr("class-change", "Changing FREE_FROM on the class", "_s = Shipment('O5', 45, 'standard')\n_before = _s.cost()\n_old = Shipment.FREE_FROM\nShipment.FREE_FROM = 40\ntry:\n    _after = _s.cost()\nfinally:\n    Shipment.FREE_FROM = _old\nresult = (_before, _after)", py.tuple(py.float(3.5), py.int(0)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Invoice numbers you can reset",
        prompt: "Write a class `Invoice(customer_id, net)` that numbers invoices across the whole class: `INV-0001`, `INV-0002`, … in the order they are created. Add a class method `reset_numbering(start)` so a new financial year can begin at a chosen number, and a class method `from_order(order)` that builds an invoice from an order dictionary (`customer_id` and `total`).",
        spec: [
          ["Class attribute", "`next_number`, starting at 1"],
          ["`Invoice(customer_id, net)`", "attributes `number` (`\"INV-\"` and the number padded to 4 digits), `customer_id`, `net`; each new invoice gets the next number"],
          ["`Invoice.reset_numbering(start)`", "the next invoice created gets number `start`"],
          ["`Invoice.from_order(order)`", "an Invoice for `order[\"customer_id\"]` with net `order[\"total\"]`"],
        ],
        starter: src`
class Invoice:
    pass

Invoice.reset_numbering(41)
a = Invoice("C00077", 120.0)
b = Invoice.from_order({"order_id": "O100918", "customer_id": "C01338", "total": 55.72})
print(a.number, b.number, b.customer_id, b.net)
`,
        answer: src`
class Invoice:
    next_number = 1

    def __init__(self, customer_id, net):
        self.number = f"INV-{Invoice.next_number:04d}"
        Invoice.next_number += 1
        self.customer_id = customer_id
        self.net = net

    @classmethod
    def reset_numbering(cls, start):
        cls.next_number = start

    @classmethod
    def from_order(cls, order):
        return cls(order["customer_id"], order["total"])

Invoice.reset_numbering(41)
a = Invoice("C00077", 120.0)
b = Invoice.from_order({"order_id": "O100918", "customer_id": "C01338", "total": 55.72})
print(a.number, b.number, b.customer_id, b.net)
`,
        alternatives: [
          src`
class Invoice:
    next_number = 1

    def __init__(self, customer_id, net):
        number = Invoice.next_number
        Invoice.next_number = number + 1
        self.number = "INV-" + str(number).zfill(4)
        self.customer_id = customer_id
        self.net = net

    @classmethod
    def reset_numbering(cls, start):
        Invoice.next_number = start

    @classmethod
    def from_order(cls, order):
        invoice = cls(order["customer_id"], order["total"])
        return invoice
`,
        ],
        wrong: [
          {
            code: src`
class Invoice:
    next_number = 1

    def __init__(self, customer_id, net):
        self.number = f"INV-{self.next_number:04d}"
        self.next_number += 1
        self.customer_id = customer_id
        self.net = net

    @classmethod
    def reset_numbering(cls, start):
        cls.next_number = start

    @classmethod
    def from_order(cls, order):
        return cls(order["customer_id"], order["total"])
`,
            fails: ["sequence"],
            why: "`self.next_number += 1` stores the increase on the invoice, so the class's number never moves and every invoice gets the same one",
          },
          {
            code: src`
class Invoice:
    next_number = 1

    def __init__(self, customer_id, net):
        self.number = f"INV-{Invoice.next_number:04d}"
        Invoice.next_number += 1
        self.customer_id = customer_id
        self.net = net

    def reset_numbering(self, start):
        self.next_number = start

    @classmethod
    def from_order(cls, order):
        return cls(order["customer_id"], order["total"])
`,
            fails: ["reset", "sequence", "from-order"],
            why: "without `@classmethod`, `Invoice.reset_numbering(41)` has no object to work on and fails with TypeError",
          },
        ],
        hints: [
          "The counter is a class attribute; `__init__` reads it, formats it, and increases it through the class name.",
          "`reset_numbering` and `from_order` both work on the class, so both are class methods with a `cls` parameter.",
          "`reset_numbering` assigns to `cls.next_number`; `from_order` returns `cls(...)` built from the dictionary.",
        ],
        task: {
          checks: [
            expr("reset", "Numbering restarts where you say", "Invoice.reset_numbering(41)\nresult = Invoice('C00077', 120.0).number", "INV-0041", { show: "Invoice.reset_numbering(41); Invoice(\"C00077\", 120.0).number" }),
            expr("sequence", "Invoices are numbered in order", "Invoice.reset_numbering(7)\n_a = Invoice('C1', 1.0)\n_b = Invoice('C2', 2.0)\n_c = Invoice('C3', 3.0)\nresult = [_a.number, _b.number, _c.number, Invoice.next_number]", ["INV-0007", "INV-0008", "INV-0009", 10], { hidden: true }),
            expr("from-order", "An invoice from an order", "Invoice.reset_numbering(1200)\n_i = Invoice.from_order({'order_id': 'O100918', 'customer_id': 'C01338', 'total': 55.72})\nresult = [type(_i).__name__, _i.number, _i.customer_id, _i.net]", ["Invoice", "INV-1200", "C01338", 55.72], { show: "Invoice.from_order(<order O100918>) after reset_numbering(1200)" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Store:
    currency = "GBP"

    def __init__(self, city):
        self.city = city

london = Store("London")
paris = Store("Paris")
paris.currency = "EUR"
Store.currency = "USD"
print(london.currency, paris.currency, Store.currency)
`,
        choices: ["USD EUR USD", "GBP EUR USD", "USD USD USD", "GBP EUR GBP"],
        answer: 0,
        why: "`paris.currency = \"EUR\"` gives Paris its own attribute, which hides the class's. London has none, so it still reads the class attribute, which is now USD.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a list as a class attribute. What does this print?",
        program: src`
class Order:
    notes = []

    def __init__(self, order_id):
        self.order_id = order_id

    def add_note(self, text):
        self.notes.append(text)

a = Order("O100282")
b = Order("O100918")
a.add_note("gift wrap")
print(b.notes, a.notes is b.notes)
`,
        choices: ["['gift wrap'] True", "[] False", "['gift wrap'] False", "[] True"],
        answer: 0,
        why: "`self.notes.append(...)` doesn't assign, it changes the list it finds, which is the one class-level list shared by every order. Per-object lists belong in `__init__`.",
      },
      {
        id: "q3",
        prompt: "Which of these is a good use of `@classmethod`?",
        choices: [
          "Order.from_csv_line(line), which parses a line and returns cls(...)",
          "order.total(), which adds up one order's lines",
          "order.ship(), which changes one order's status",
          "A method that prints one product's name",
        ],
        answer: 0,
        why: "A class method works with the class, not one object; building a new object from another format is its classic job. The others work on one existing object, so they are ordinary methods.",
      },
    ],
    review: [
      "Class attributes are shared by every object; read them through self or the class.",
      "Assigning through `self` creates an instance attribute; change shared values through the class.",
      "`@classmethod` methods receive `cls`; alternative constructors return `cls(...)`.",
      "Next module: classes that build on other classes, and objects that contain objects.",
    ],
  },
];
