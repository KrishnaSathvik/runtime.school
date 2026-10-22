/**
 * M12 Collection Algorithms: five lessons (PY-L12-01 … PY-L12-05).
 *
 * The loops, ifs, lists, dictionaries and functions are all from M04–M11. What is new is the shape of the result:
 * keep some records (filter), build one new value per record (transform), collect a count/total/list per key
 * (accumulate and group), join two collections on a shared key (index and merge), and keep one record per key
 * (dedupe). Fixtures are small slices of the Runtime Market dataset (R01): real order, customer, payment, review
 * and product rows, trimmed to the fields each example needs.
 *
 * Challenges are graded by calling the learner's function with the public example and with hidden inputs
 * (empty lists, boundaries, ties, missing keys), and by checking that inputs are not mutated where that matters.
 * Version 2: rewritten from a print-the-list module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- shared fixtures (inputs for function checks)

const refundOrders = [
  { order_id: "O100282", status: "delivered", total: 35.84 },
  { order_id: "O100376", status: "returned", total: 91.47 },
  { order_id: "O100918", status: "returned", total: 55.72 },
  { order_id: "O101219", status: "delivered", total: 246.6 },
];

const cityCustomers = [
  { first_name: "Nora", last_name: "Garcia", city: "New York" },
  { first_name: "Jamal", last_name: "Walker", city: "Houston" },
  { first_name: "Grace", last_name: "Walker", city: "new york " },
  { first_name: "Theo", last_name: "Williams", city: "Houston" },
];

const lineItems = [
  { product_id: "P0164", quantity: 1, unit_price: 31, discount_rate: 0.1 },
  { product_id: "P0594", quantity: 1, unit_price: 48, discount_rate: 0 },
  { product_id: "P0209", quantity: 2, unit_price: 16.99, discount_rate: 0.1 },
];

const feed = [
  { sku: " spo-11681 ", price: "7.49" },
  { sku: "HOM-22847", price: " 31 " },
  { sku: "ele-24781", price: "171.99" },
];

const reviews = [
  { product_id: "P0205", rating: 5 },
  { product_id: "P0421", rating: 4 },
  { product_id: "P0205", rating: 2 },
  { product_id: "P0187", rating: 5 },
  { product_id: "P0205", rating: 4 },
];

const busyOrders = [
  { order_id: "O100282", customer_id: "C00077" },
  { order_id: "O100918", customer_id: "C01338" },
  { order_id: "O101219", customer_id: "C00077" },
  { order_id: "O101723", customer_id: "C01338" },
  { order_id: "O108858", customer_id: "C00077" },
];

const emailCustomers = [
  { customer_id: "C00038", email: "nora_garcia@fastmail.com" },
  { customer_id: "C00077", email: "jamal.walker62@icloud.com" },
  { customer_id: "C01338", email: "grace_walker29@yahoo.com" },
];
const emailOrders = [
  { order_id: "O101219", customer_id: "C00077" },
  { order_id: "O101341", customer_id: "C00038" },
  { order_id: "O121005", customer_id: "C08398" },
  { order_id: "O108858", customer_id: "C00077" },
];

const stockPrices = { "SPO-11681": 7.49, "HOM-22847": 31, "ELE-24781": 171.99 };

const timeline = [
  { order_id: "O100282", customer_id: "C00077" },
  { order_id: "O100918", customer_id: "C01338" },
  { order_id: "O101219", customer_id: "C00077" },
  { order_id: "O101777", customer_id: "C00305" },
  { order_id: "O101723", customer_id: "C01338" },
];

export const m12Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L12-01 filter
  {
    id: "PY-L12-01",
    version: 2,
    slug: "filter-a-list",
    title: "Keep the records that match",
    lede: "A filter walks a collection and builds a new list of only the items that pass a test. The original stays complete.",
    focus: "Build a new list that keeps only the items that pass a test.",
    minutes: 16,
    objectives: [
      "Explain why a filter builds a new list instead of changing the one it reads",
      "Write a function that returns the matching records, or one field from each",
      "Combine two conditions in the test and keep the original order",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "len-call", "dict-literal", "dict-lookup", "string-index", "comparison", "logical", "if-statement", "for-loop", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "continue-statement", "spaces-in-text", "arithmetic", "string-method", "string-format"],
    teaches: ["list-filter"],
    blocks: [
      {
        kind: "text",
        md: "Most data is things you don't need right now. Out of a day's orders you want only the returned ones; out of a gradebook, only the students who passed. A **filter** answers *which of these pass the test?* and gives the answer back as a new list.\n\nThe pattern has three parts: start an empty result list, walk every item with `for`, and `append` an item only inside an `if`. The list you read is never changed, so the rest of the program can still use all of it.",
      },
      {
        kind: "example",
        title: "Totals of 50 or more",
        code: src`
totals = [35.84, 91.47, 22.35, 246.6, 54.55]
large = []
for total in totals:
    if total >= 50:
        large.append(total)
print(large)
print(len(totals), "orders,", len(large), "of them 50 or more")
`,
        output: "[91.47, 246.6, 54.55]\n5 orders, 3 of them 50 or more\n",
        note: "The kept totals stay in the order they were visited. `totals` still has all five, because the loop only read it.",
      },
      {
        kind: "text",
        md: "In a real program the filter lives in a function: the data and the threshold come in as parameters, and the new list goes back with `return`. The `return` sits after the loop, at the function's own indentation, so it runs once every item has been tested.\n\nThe test and the kept value don't have to be the same thing. These gradebook rows are dictionaries: the filter tests `score` and keeps `name`.",
      },
      {
        kind: "example",
        title: "Who passed",
        code: src`
def passed(students, cutoff):
    names = []
    for student in students:
        if student["score"] >= cutoff:
            names.append(student["name"])
    return names

gradebook = [
    {"name": "Ana", "score": 72},
    {"name": "Ben", "score": 58},
    {"name": "Chen", "score": 91},
    {"name": "Dara", "score": 60},
]
print(passed(gradebook, 60))
print(passed(gradebook, 95))
`,
        output: "['Ana', 'Chen', 'Dara']\n[]\n",
        note: "Dara's 60 passes `>= 60`. When nobody reaches the cutoff the function returns an empty list: a correct answer, not an error.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the question is *which ones?* (cancelled orders, readings below freezing, customers in one city). **Mistakes to avoid:** indenting `return` into the loop, so the function stops after the first item; and testing one field while appending another by accident. The concept check below shows the first one running.",
      },
    ],
    tryIt: {
      id: "try",
      title: "App orders only",
      prompt: "`app_orders` returns every order ID. Change it so it keeps only the orders whose `channel` is `\"app\"`, then run it: the web order should disappear.",
      spec: [
        ["Function", "`app_orders(orders)`"],
        ["Returns", "the `order_id` of each order with channel `\"app\"`, in order"],
      ],
      starter: src`
def app_orders(orders):
    ids = []
    for order in orders:
        ids.append(order["order_id"])
    return ids

orders = [
    {"order_id": "O103199", "channel": "app"},
    {"order_id": "O101777", "channel": "web"},
    {"order_id": "O103303", "channel": "app"},
]
print(app_orders(orders))
`,
      answer: src`
def app_orders(orders):
    ids = []
    for order in orders:
        if order["channel"] == "app":
            ids.append(order["order_id"])
    return ids

orders = [
    {"order_id": "O103199", "channel": "app"},
    {"order_id": "O101777", "channel": "web"},
    {"order_id": "O103303", "channel": "app"},
]
print(app_orders(orders))
`,
      wrong: [
        {
          code: src`
def app_orders(orders):
    return ["O103199", "O103303"]
`,
          fails: ["returns"],
          why: "the two IDs are typed in, so any other list of orders gets the wrong answer",
        },
      ],
      hints: ["The loop already visits every order. Only some of them should be appended.", "Put an `if` above the `append` that looks at the order's channel.", "Indent the `append` one level further, so it runs only when the test is true."],
      task: {
        checks: [
          fn("returns", "app_orders", [
            example([[{ order_id: "O103199", channel: "app" }, { order_id: "O101777", channel: "web" }, { order_id: "O103303", channel: "app" }]], ["O103199", "O103303"]),
            hiddenCase("no app orders", [[{ order_id: "O102603", channel: "marketplace" }, { order_id: "O101723", channel: "phone" }]], []),
            hiddenCase("an empty list", [[]], []),
          ], { label: "app_orders() keeps only app orders" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Refunds worth a second look",
        prompt: "Support checks expensive returns first. Write `refunds_to_review(orders, minimum)`: return the `order_id` of every order whose `status` is `\"returned\"` **and** whose `total` is at least `minimum`, in the order the orders appear.",
        spec: [
          ["Function", "`refunds_to_review(orders, minimum)`"],
          ["orders", "a list of dictionaries with `order_id`, `status` and `total`"],
          ["Returns", "a new list of order IDs; empty when nothing matches"],
          ["Example", "the starter's orders with `minimum` 60 → `['O100376']`; with 50 → `['O100376', 'O100918']`"],
        ],
        starter: src`
def refunds_to_review(orders, minimum):
    ids = []
    return ids

orders = [
    {"order_id": "O100282", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "status": "returned", "total": 91.47},
    {"order_id": "O100918", "status": "returned", "total": 55.72},
    {"order_id": "O101219", "status": "delivered", "total": 246.6},
]
print(refunds_to_review(orders, 60))
`,
        answer: src`
def refunds_to_review(orders, minimum):
    ids = []
    for order in orders:
        if order["status"] == "returned" and order["total"] >= minimum:
            ids.append(order["order_id"])
    return ids

orders = [
    {"order_id": "O100282", "status": "delivered", "total": 35.84},
    {"order_id": "O100376", "status": "returned", "total": 91.47},
    {"order_id": "O100918", "status": "returned", "total": 55.72},
    {"order_id": "O101219", "status": "delivered", "total": 246.6},
]
print(refunds_to_review(orders, 60))
`,
        alternatives: [
          src`
def refunds_to_review(orders, minimum):
    ids = []
    for order in orders:
        if order["status"] != "returned":
            continue
        if order["total"] < minimum:
            continue
        ids.append(order["order_id"])
    return ids
`,
        ],
        wrong: [
          {
            code: src`
def refunds_to_review(orders, minimum):
    ids = []
    for order in orders:
        if order["status"] == "returned":
            ids.append(order["order_id"])
    return ids
`,
            fails: ["returns"],
            why: "only the status is tested, so a cheap return is kept too",
          },
          {
            code: src`
def refunds_to_review(orders, minimum):
    ids = []
    for order in orders:
        if order["status"] == "returned" and order["total"] > minimum:
            ids.append(order["order_id"])
    return ids
`,
            fails: ["returns"],
            why: "`>` drops a return whose total is exactly the minimum",
          },
          {
            code: src`
def refunds_to_review(orders, minimum):
    ids = []
    for order in orders:
        if order["status"] == "returned" or order["total"] >= minimum:
            ids.append(order["order_id"])
    return ids
`,
            fails: ["returns"],
            why: "`or` keeps a big delivered order that was never returned",
          },
        ],
        hints: [
          "Start from the filter pattern: an empty list, a loop, an `if`, an `append`, and a `return` after the loop.",
          "Both conditions must be true at once, so join them with `and`.",
          "\"At least\" includes the minimum itself. The value to append is the order's ID, not the whole dictionary.",
        ],
        task: {
          checks: [
            fn("returns", "refunds_to_review", [
              example([refundOrders, 60], ["O100376"]),
              example([refundOrders, 50], ["O100376", "O100918"]),
              hiddenCase("a total exactly equal to the minimum", [[{ order_id: "O100918", status: "returned", total: 55.72 }], 55.72], ["O100918"]),
              hiddenCase("a big order that was not returned", [[{ order_id: "O103722", status: "cancelled", total: 403.26 }, { order_id: "O101219", status: "delivered", total: 246.6 }], 10], []),
              hiddenCase("several matches kept in their original order", [[{ order_id: "O3", status: "returned", total: 80 }, { order_id: "O1", status: "returned", total: 120 }, { order_id: "O2", status: "returned", total: 15 }], 50], ["O3", "O1"]),
              hiddenCase("an empty list", [[], 0], []),
            ], { label: "refunds_to_review() keeps returned orders at or above the minimum" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Customers in a city",
        prompt: "A search box sends the city exactly as someone typed it, and the stored cities were typed by hand too. Write `customers_in(customers, city)`: return the full name (`\"First Last\"`) of every customer whose city matches, ignoring capital letters and spaces at either end of both texts.",
        spec: [
          ["Function", "`customers_in(customers, city)`"],
          ["customers", "a list of dictionaries with `first_name`, `last_name` and `city`"],
          ["Match", "the whole city name, after strip and lower on both sides (`York` does not match `New York`)"],
          ["Returns", "a new list of names like `\"Nora Garcia\"`, in the order the customers appear"],
          ["Example", "the starter's customers with `\"  HOUSTON\"` → `['Jamal Walker', 'Theo Williams']`"],
        ],
        starter: src`
def customers_in(customers, city):
    names = []
    return names

customers = [
    {"first_name": "Nora", "last_name": "Garcia", "city": "New York"},
    {"first_name": "Jamal", "last_name": "Walker", "city": "Houston"},
    {"first_name": "Grace", "last_name": "Walker", "city": "new york "},
    {"first_name": "Theo", "last_name": "Williams", "city": "Houston"},
]
print(customers_in(customers, "  HOUSTON"))
print(customers_in(customers, "New York"))
`,
        answer: src`
def customers_in(customers, city):
    wanted = city.strip().lower()
    names = []
    for customer in customers:
        if customer["city"].strip().lower() == wanted:
            names.append(customer["first_name"] + " " + customer["last_name"])
    return names

customers = [
    {"first_name": "Nora", "last_name": "Garcia", "city": "New York"},
    {"first_name": "Jamal", "last_name": "Walker", "city": "Houston"},
    {"first_name": "Grace", "last_name": "Walker", "city": "new york "},
    {"first_name": "Theo", "last_name": "Williams", "city": "Houston"},
]
print(customers_in(customers, "  HOUSTON"))
print(customers_in(customers, "New York"))
`,
        alternatives: [
          src`
def customers_in(customers, city):
    names = []
    for customer in customers:
        stored = customer["city"].lower().strip()
        if stored == city.lower().strip():
            names.append(f"{customer['first_name']} {customer['last_name']}")
    return names
`,
        ],
        wrong: [
          {
            code: src`
def customers_in(customers, city):
    names = []
    for customer in customers:
        if customer["city"] == city.strip().lower():
            names.append(customer["first_name"] + " " + customer["last_name"])
    return names
`,
            fails: ["returns"],
            why: "only the search text is cleaned, so a stored `New York` never matches",
          },
          {
            code: src`
def customers_in(customers, city):
    names = []
    for customer in customers:
        if city.strip().lower() in customer["city"].strip().lower():
            names.append(customer["first_name"] + " " + customer["last_name"])
    return names
`,
            fails: ["returns"],
            why: "`in` matches part of a name, so a search for `york` finds New York",
          },
          {
            code: src`
def customers_in(customers, city):
    names = []
    for customer in customers:
        if customer["city"].strip().lower() == city.strip().lower():
            names.append(customer["first_name"])
    return names
`,
            fails: ["returns"],
            why: "it returns first names only, not full names",
          },
        ],
        hints: [
          "This is still a filter: the test decides, and the appended value is built from two fields.",
          "Clean both texts the same way before comparing them: `strip` for the ends, `lower` for the capitals.",
          "Compare with `==`, not `in`, so only whole city names match. Join the first and last name with one space between them.",
        ],
        task: {
          checks: [
            fn("returns", "customers_in", [
              example([cityCustomers, "  HOUSTON"], ["Jamal Walker", "Theo Williams"]),
              example([cityCustomers, "New York"], ["Nora Garcia", "Grace Walker"]),
              example([cityCustomers, "Denver"], []),
              hiddenCase("part of a city name", [cityCustomers, "york"], []),
              hiddenCase("an empty customer list", [[], "Houston"], []),
              hiddenCase("one matching customer with a messy stored city", [[{ first_name: "Hugo", last_name: "Smith", city: "  SEATTLE" }, { first_name: "Iris", last_name: "Miller", city: "Denver" }], "seattle"], ["Hugo Smith"]),
            ], { label: "customers_in() matches whole city names, ignoring case and end spaces" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
readings = [3, -2, 0, -5, 4]
below = []
for r in readings:
    if r < 0:
        below.append(r)
print(below, readings)
`,
        choices: ["[-2, -5] [3, -2, 0, -5, 4]", "[-2, -5] [3, 0, 4]", "[-2, 0, -5] [3, -2, 0, -5, 4]", "[3, 0, 4] [3, -2, 0, -5, 4]"],
        answer: 0,
        why: "0 is not below 0, so only -2 and -5 are appended. `readings` is only read, so it still holds all five values.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the `return` is one level too deep. What does this print?",
        program: src`
def passed(scores, cutoff):
    kept = []
    for score in scores:
        if score >= cutoff:
            kept.append(score)
        return kept

print(passed([72, 58, 91], 60))
`,
        choices: ["[72]", "[72, 91]", "[]", "[72, 58, 91]"],
        answer: 0,
        why: "The `return` is inside the loop, so the function hands back the list at the end of the first pass, after 72 is appended. 91 is never tested.",
      },
      {
        id: "q3",
        prompt: "Which of these jobs is a filter?",
        choices: ["Listing the IDs of only the cancelled orders", "Adding sales tax to every order total", "Counting the orders from each channel", "Finding a customer's name from their ID"],
        answer: 0,
        why: "A filter keeps some items and drops the rest. Changing every total, counting per channel and looking up a name are the transform, group and lookup patterns in the next lessons.",
      },
    ],
    review: [
      "A filter builds a new list: start it empty, test each item, append only what passes, return after the loop.",
      "The test and the kept value can differ: test `status` and `total`, keep `order_id`.",
      "Clean text before comparing when it was typed by people.",
      "Next: instead of keeping some items, build one changed value for every item.",
    ],
  },

  // ------------------------------------------------------------------ PY-L12-02 transform
  {
    id: "PY-L12-02",
    version: 2,
    slug: "map-a-list",
    title: "Transform every record",
    lede: "A transform builds one new value for every item: a converted reading, a line total, a tidy record. The input stays as it was.",
    focus: "Build a new list with one transformed value for every item, without changing the input.",
    minutes: 16,
    objectives: [
      "Build a list with exactly one new value per item, in the same order",
      "Return new dictionaries instead of writing into the ones you were given",
      "Recognise the `x = x.append(…)` mistake and the error it causes",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "arithmetic", "precedence", "conversion", "string-method", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent", "runtime-error", "print-several", "comparison", "len-call", "print-text"],
    teaches: ["list-map"],
    blocks: [
      {
        kind: "text",
        md: "A filter decides *which* items to keep. A **transform** keeps *all* of them and changes their shape: Celsius to Fahrenheit, quantity and price to a line total, a messy record to a tidy one. The result has exactly one value per input item, in the same order.\n\nThe loop looks the same. The difference is what you append, and that there is no `if` deciding whether to append: every pass appends something.",
      },
      {
        kind: "example",
        title: "Celsius to Fahrenheit",
        code: src`
celsius = [18.5, 21, -3, 0]
fahrenheit = []
for c in celsius:
    fahrenheit.append(c * 9 / 5 + 32)
print(fahrenheit)
print(celsius)
`,
        output: "[65.3, 69.8, 26.6, 32.0]\n[18.5, 21, -3, 0]\n",
        note: "Four readings in, four out. `/` always gives a float, so 0 becomes 32.0. The original list is unchanged.",
      },
      {
        kind: "text",
        md: "When the items are dictionaries there is a trap. `for item in items` gives you the **same** dictionary that sits inside the list, not a copy. Writing `item[\"amount\"] = …` would change the caller's data even though you meant to build something new. Build a new dictionary for each item instead, and append that.",
      },
      {
        kind: "example",
        title: "Line amounts as new records",
        code: src`
def priced_lines(items):
    lines = []
    for item in items:
        amount = item["quantity"] * item["unit_price"]
        lines.append({"product_id": item["product_id"], "amount": amount})
    return lines

items = [
    {"product_id": "P0164", "quantity": 2, "unit_price": 31},
    {"product_id": "P0594", "quantity": 1, "unit_price": 48},
    {"product_id": "P0708", "quantity": 3, "unit_price": 12.5},
]
print(priced_lines(items))
print(items[0])
`,
        output: "[{'product_id': 'P0164', 'amount': 62}, {'product_id': 'P0594', 'amount': 48}, {'product_id': 'P0708', 'amount': 37.5}]\n{'product_id': 'P0164', 'quantity': 2, 'unit_price': 31}\n",
        note: "Each new dictionary has only the two fields a report needs. `items` still has its quantity and price, because nothing was stored into it.",
      },
      {
        kind: "text",
        md: "One more mistake shows up in almost every first transform. `append` changes the list and gives back `None`. Storing that result replaces your list with `None`, and the next pass crashes.",
      },
      {
        kind: "error-example",
        title: "Storing what append returns",
        code: src`
labels = []
for name in ["nora", "jamal"]:
    labels = labels.append(name.title())
print(labels)
`,
        error: "AttributeError",
        output: "",
        note: "The first pass sets `labels` to None. The second pass asks None for `append`: `AttributeError: 'NoneType' object has no attribute 'append'`. Call `append` on its own line and don't assign it.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Ten percent off",
      prompt: "Every price is copied unchanged. Make it a 10% sale: append `price * 0.9` instead, then run it.",
      spec: [
        ["Function", "`sale_prices(prices)`"],
        ["Returns", "a new list with each price times 0.9"],
      ],
      starter: src`
def sale_prices(prices):
    new_prices = []
    for price in prices:
        new_prices.append(price)
    return new_prices

print(sale_prices([20, 45, 8]))
`,
      answer: src`
def sale_prices(prices):
    new_prices = []
    for price in prices:
        new_prices.append(price * 0.9)
    return new_prices

print(sale_prices([20, 45, 8]))
`,
      wrong: [
        {
          code: src`
def sale_prices(prices):
    new_prices = []
    for price in prices:
        new_prices.append(price - 10)
    return new_prices
`,
          fails: ["returns"],
          why: "it takes 10 off each price instead of 10 percent",
        },
      ],
      hints: ["Only the value inside `append(…)` needs to change.", "10% off leaves 90% of the price.", "Multiply the price by 0.9 before appending it."],
      task: {
        checks: [
          fn("returns", "sale_prices", [
            example([[20, 45, 8]], [py.float(18), 40.5, 7.2]),
            hiddenCase("an empty list", [[]], []),
            hiddenCase("one price with cents", [[19.99]], [17.991]),
          ], { label: "sale_prices() takes 10% off every price" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Line totals after discount",
        prompt: "Runtime Market stores a `line_total` for every order line, and you want to check it. Write `line_totals(items)`: return a list with one number per item, `quantity × unit_price × (1 − discount_rate)`, in the same order.",
        spec: [
          ["Function", "`line_totals(items)`"],
          ["items", "a list of dictionaries with `quantity`, `unit_price` and `discount_rate` (0.1 means 10% off)"],
          ["Returns", "a new list of numbers, one per item; an empty list for no items"],
          ["Example", "the starter's three lines → about `[27.9, 48, 30.58]`. Printed, they show float rounding (`27.900000000000002`); the checker allows for that tiny difference"],
        ],
        starter: src`
def line_totals(items):
    totals = []
    return totals

items = [
    {"product_id": "P0164", "quantity": 1, "unit_price": 31, "discount_rate": 0.1},
    {"product_id": "P0594", "quantity": 1, "unit_price": 48, "discount_rate": 0},
    {"product_id": "P0209", "quantity": 2, "unit_price": 16.99, "discount_rate": 0.1},
]
print(line_totals(items))
`,
        answer: src`
def line_totals(items):
    totals = []
    for item in items:
        full_price = item["quantity"] * item["unit_price"]
        totals.append(full_price * (1 - item["discount_rate"]))
    return totals

items = [
    {"product_id": "P0164", "quantity": 1, "unit_price": 31, "discount_rate": 0.1},
    {"product_id": "P0594", "quantity": 1, "unit_price": 48, "discount_rate": 0},
    {"product_id": "P0209", "quantity": 2, "unit_price": 16.99, "discount_rate": 0.1},
]
print(line_totals(items))
`,
        alternatives: [
          src`
def line_totals(items):
    totals = []
    for item in items:
        discount = item["quantity"] * item["unit_price"] * item["discount_rate"]
        totals.append(item["quantity"] * item["unit_price"] - discount)
    return totals
`,
        ],
        wrong: [
          {
            code: src`
def line_totals(items):
    totals = []
    for item in items:
        totals.append(item["quantity"] * item["unit_price"] * 1 - item["discount_rate"])
    return totals
`,
            fails: ["returns"],
            why: "without brackets, `* 1 - rate` subtracts 0.1 from the total instead of taking 10% off",
          },
          {
            code: src`
def line_totals(items):
    totals = []
    for item in items:
        totals.append(item["unit_price"] * (1 - item["discount_rate"]))
    return totals
`,
            fails: ["returns"],
            why: "the quantity is ignored, so a line of two items is priced as one",
          },
        ],
        hints: [
          "One number goes into the result for every item, so there is no `if` this time.",
          "Work out the price before discount first: quantity times unit price.",
          "A rate of 0.1 leaves `1 - 0.1` of the price. Put that subtraction in brackets so it happens before the multiplication.",
        ],
        task: {
          checks: [
            fn("returns", "line_totals", [
              example([lineItems], [27.9, 48, 30.582]),
              example([[{ product_id: "P0006", quantity: 3, unit_price: 50.99, discount_rate: 0 }]], [152.97]),
              hiddenCase("an empty list", [[]], []),
              hiddenCase("a 100% discount", [[{ product_id: "P0007", quantity: 2, unit_price: 26.99, discount_rate: 1 }]], [py.float(0)]),
              hiddenCase("several lines kept in order", [[{ product_id: "A", quantity: 4, unit_price: 2.5, discount_rate: 0.5 }, { product_id: "B", quantity: 1, unit_price: 10, discount_rate: 0.25 }]], [py.float(5), 7.5]),
            ], { label: "line_totals() prices each line after its discount", compare: { numbers: "int-float-equal" } }),
          ],
        },
      },
      {
        id: "c2",
        title: "Tidy a supplier feed",
        prompt: "A supplier sends products with messy SKUs and prices as text. Write `clean_feed(rows)`: return a new list of new dictionaries `{\"sku\": …, \"price\": …}` where the SKU has no spaces at the ends and is in capitals, and the price is a number. The rows you were given must not change: the original feed is kept for auditing.",
        spec: [
          ["Function", "`clean_feed(rows)`"],
          ["rows", "a list of dictionaries with text `sku` and text `price`, e.g. `{\"sku\": \" spo-11681 \", \"price\": \"7.49\"}`"],
          ["Returns", "a new list of new dictionaries, e.g. `{\"sku\": \"SPO-11681\", \"price\": 7.49}`, one per row, same order"],
          ["Must not", "change any dictionary in `rows`"],
        ],
        starter: src`
def clean_feed(rows):
    cleaned = []
    return cleaned

feed = [
    {"sku": " spo-11681 ", "price": "7.49"},
    {"sku": "HOM-22847", "price": " 31 "},
    {"sku": "ele-24781", "price": "171.99"},
]
print(clean_feed(feed))
print(feed[0])
`,
        answer: src`
def clean_feed(rows):
    cleaned = []
    for row in rows:
        sku = row["sku"].strip().upper()
        price = float(row["price"])
        cleaned.append({"sku": sku, "price": price})
    return cleaned

feed = [
    {"sku": " spo-11681 ", "price": "7.49"},
    {"sku": "HOM-22847", "price": " 31 "},
    {"sku": "ele-24781", "price": "171.99"},
]
print(clean_feed(feed))
print(feed[0])
`,
        alternatives: [
          src`
def clean_feed(rows):
    cleaned = []
    for row in rows:
        new_row = {}
        new_row["sku"] = row["sku"].upper().strip()
        new_row["price"] = float(row["price"].strip())
        cleaned.append(new_row)
    return cleaned
`,
        ],
        wrong: [
          {
            code: src`
def clean_feed(rows):
    for row in rows:
        row["sku"] = row["sku"].strip().upper()
        row["price"] = float(row["price"])
    return rows
`,
            fails: ["keeps-input"],
            why: "the values are right, but it rewrites the supplier's own dictionaries",
          },
          {
            code: src`
def clean_feed(rows):
    cleaned = []
    for row in rows:
        cleaned.append({"sku": row["sku"].upper(), "price": float(row["price"])})
    return cleaned
`,
            fails: ["returns"],
            why: "the spaces around the SKU are left in",
          },
          {
            code: src`
def clean_feed(rows):
    cleaned = []
    for row in rows:
        cleaned.append({"sku": row["sku"].strip().upper(), "price": row["price"]})
    return cleaned
`,
            fails: ["returns"],
            why: "the price is still text, so it can't be added up later",
          },
        ],
        hints: [
          "One new dictionary per row, so this is a transform: an empty list, a loop, and one `append` per pass.",
          "`strip` and `upper` (the Strings & Text module, the String Algorithms module) tidy the SKU; `float` (see Variables & Data Types) turns text like `\" 31 \"` into a number, spaces and all.",
          "Build the new dictionary with braces and append it. Don't assign into `row`: that dictionary belongs to the caller.",
        ],
        task: {
          checks: [
            fn("returns", "clean_feed", [
              example([feed], [{ sku: "SPO-11681", price: 7.49 }, { sku: "HOM-22847", price: py.float(31) }, { sku: "ELE-24781", price: 171.99 }]),
              example([[{ sku: "toy-54564", price: "26.99" }]], [{ sku: "TOY-54564", price: 26.99 }]),
              example([[]], []),
              hiddenCase("a SKU that is already clean", [[{ sku: "HOM-22847", price: "31.0" }]], [{ sku: "HOM-22847", price: py.float(31) }]),
              hiddenCase("several rows kept in order", [[{ sku: "b-2 ", price: "1" }, { sku: " a-1", price: "2.5" }]], [{ sku: "B-2", price: py.float(1) }, { sku: "A-1", price: 2.5 }]),
            ], { label: "clean_feed() tidies every SKU and price" }),
            fn("keeps-input", "clean_feed", [
              keepsInput([feed]),
              keepsInput([[{ sku: " x-1 ", price: " 5 " }]], { label: "a single messy row" }),
            ], { label: "clean_feed() leaves the original rows unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
names = ["nora", "jamal", "grace"]
caps = []
for name in names:
    caps.append(name.title())
print(caps)
print(len(caps) == len(names))
`,
        choices: ["['Nora', 'Jamal', 'Grace']\nTrue", "['Nora', 'Jamal', 'Grace']\nFalse", "['nora', 'jamal', 'grace']\nTrue", "None\nFalse"],
        answer: 0,
        why: "A transform appends one value per item, so both lists have three items. `title` builds a new text; `names` is unchanged.",
      },
      {
        id: "q2",
        prompt: "A common mistake: this transform writes into the dictionaries it was given. What does the last line print?",
        program: src`
def with_fee(orders):
    result = []
    for order in orders:
        order["total"] = order["total"] + 5
        result.append(order)
    return result

orders = [{"order_id": "O1", "total": 20}]
charged = with_fee(orders)
print(orders[0]["total"])
`,
        choices: ["25", "20", "None", "KeyError"],
        answer: 0,
        why: "`order` is the caller's own dictionary, not a copy, so the caller's total became 25. Building a new dictionary inside the loop would have left it at 20.",
      },
      {
        id: "q3",
        prompt: "A transform runs over a list of 4 orders. Which result is impossible?",
        choices: ["A list of 3 values", "A list of 4 strings", "A list of 4 new dictionaries", "A list of 4 numbers"],
        answer: 0,
        why: "A transform appends exactly once per item. If some items are missing from the result, it was a filter.",
      },
    ],
    review: [
      "A transform appends exactly one new value per item, in the same order.",
      "Build new dictionaries. Assigning into the loop's dictionary changes the caller's data.",
      "`append` changes the list and returns None, so never store its result.",
      "Next: instead of one value per item, collect a count, a total or a list under each key.",
    ],
  },

  // ------------------------------------------------------------------ PY-L12-03 accumulate and group
  {
    id: "PY-L12-03",
    version: 2,
    slug: "group-by-key",
    title: "Count, total and group by key",
    lede: "One pass over the records can build a dictionary keyed by category: orders per channel, revenue per state, order IDs per customer.",
    focus: "Build a dictionary that collects a count, a total or a list for each key.",
    minutes: 18,
    objectives: [
      "Choose a key and a starting value (0 for counts and totals, an empty list for groups)",
      "Create a key the first time it appears, then update it with `+=` or `append`",
      "Read the finished dictionary with `items()` to answer a question about it",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "none-value", "identity", "list-literal", "list-index", "list-mutate", "len-call", "dict-literal", "dict-lookup", "dict-iterate", "tuple-unpack", "string-index", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "nested-loop", "print-text"],
    teaches: ["dict-accumulate", "dict-group"],
    blocks: [
      {
        kind: "text",
        md: "Questions like *how many orders came from each channel?* need one answer per category, and you don't know the categories in advance. A dictionary fits: the key is the category, and the value is what you collect for it.\n\nEvery version of this pattern makes the same decision on each pass: **is this key new?** If it is, store a starting value: 0 for a count or a total, an empty list for a group. Then update the value stored under that key.",
      },
      {
        kind: "example",
        title: "Orders per channel",
        code: src`
channels = ["web", "app", "web", "phone", "app", "web"]
counts = {}
for channel in channels:
    if channel not in counts:
        counts[channel] = 0
    counts[channel] += 1
print(counts)
`,
        output: "{'web': 3, 'app': 2, 'phone': 1}\n",
        note: "`counts[channel] += 1` is short for `counts[channel] = counts[channel] + 1`. The keys appear in the order each channel was first seen.",
      },
      {
        kind: "error-example",
        title: "Forgetting the starting value",
        code: src`
channels = ["web", "app"]
counts = {}
for channel in channels:
    counts[channel] += 1
print(counts)
`,
        error: "KeyError",
        output: "",
        note: "`+=` has to read the old value before adding, and `web` has none yet, so Python stops with `KeyError: 'web'`. That is why the `not in` check comes before the update.",
      },
      {
        kind: "text",
        md: "The value can be a running total instead of a count: add the order's total instead of 1. Or it can be a list that you `append` to. A list per key is a **group**: every record that shares the key ends up together, in the order they were seen.",
      },
      {
        kind: "example",
        title: "Order IDs per customer",
        code: src`
def orders_by_customer(orders):
    groups = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in groups:
            groups[customer] = []
        groups[customer].append(order["order_id"])
    return groups

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101723", "customer_id": "C01338"},
    {"order_id": "O101777", "customer_id": "C00305"},
]
for customer, ids in orders_by_customer(orders).items():
    print(customer, len(ids), ids)
`,
        output: "C00077 2 ['O100282', 'O101219']\nC01338 2 ['O100918', 'O101723']\nC00305 1 ['O101777']\n",
        note: "The finished dictionary answers several questions at once: who ordered, how often, and which orders. `items()` walks it key by key.",
      },
      {
        kind: "text",
        md: "**When to use it:** any *per* question: per channel, per state, per product, per customer. Counts and totals use 0; groups use `[]`. **Mistake to avoid:** creating the starting value on every pass instead of only the first. The concept check shows what that does.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Revenue per channel",
      prompt: "This counts orders per channel. Make it add up each order's `total` instead, so the report shows revenue per channel.",
      spec: [
        ["Function", "`revenue_by_channel(orders)`"],
        ["Returns", "a dictionary from channel to the sum of that channel's totals"],
      ],
      starter: src`
def revenue_by_channel(orders):
    revenue = {}
    for order in orders:
        channel = order["channel"]
        if channel not in revenue:
            revenue[channel] = 0
        revenue[channel] += 1
    return revenue

orders = [
    {"channel": "web", "total": 35.5},
    {"channel": "app", "total": 64.25},
    {"channel": "web", "total": 22.25},
]
print(revenue_by_channel(orders))
`,
      answer: src`
def revenue_by_channel(orders):
    revenue = {}
    for order in orders:
        channel = order["channel"]
        if channel not in revenue:
            revenue[channel] = 0
        revenue[channel] += order["total"]
    return revenue

orders = [
    {"channel": "web", "total": 35.5},
    {"channel": "app", "total": 64.25},
    {"channel": "web", "total": 22.25},
]
print(revenue_by_channel(orders))
`,
      wrong: [
        {
          code: src`
def revenue_by_channel(orders):
    revenue = {}
    for order in orders:
        revenue[order["channel"]] = order["total"]
    return revenue
`,
          fails: ["returns"],
          why: "each order replaces the channel's value, so only the last web order is reported",
        },
      ],
      hints: ["The starting value 0 is still right for a total.", "Only the amount added on each pass changes.", "Add the order's total instead of 1."],
      task: {
        checks: [
          fn("returns", "revenue_by_channel", [
            example([[{ channel: "web", total: 35.5 }, { channel: "app", total: 64.25 }, { channel: "web", total: 22.25 }]], { web: 57.75, app: 64.25 }),
            hiddenCase("an empty list", [[]], {}),
            hiddenCase("one channel with three orders", [[{ channel: "phone", total: 10 }, { channel: "phone", total: 5.5 }, { channel: "phone", total: 4.5 }]], { phone: py.float(20) }),
          ], { label: "revenue_by_channel() totals each channel", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Average rating per product",
        prompt: "Write `average_ratings(reviews)`: return a dictionary from each `product_id` to the average of its ratings. An average needs two things per product, the sum of its ratings and how many there were, so collect both, then build the result.",
        spec: [
          ["Function", "`average_ratings(reviews)`"],
          ["reviews", "a list of dictionaries with `product_id` and a whole-number `rating` from 1 to 5"],
          ["Returns", "a dictionary `{product_id: average}`; averages are floats (`4.0`, not `4`); `{}` for no reviews"],
          ["Example", "the starter's reviews → `{'P0205': 3.6666666666666665, 'P0421': 4.0, 'P0187': 5.0}`"],
        ],
        starter: src`
def average_ratings(reviews):
    averages = {}
    return averages

reviews = [
    {"product_id": "P0205", "rating": 5},
    {"product_id": "P0421", "rating": 4},
    {"product_id": "P0205", "rating": 2},
    {"product_id": "P0187", "rating": 5},
    {"product_id": "P0205", "rating": 4},
]
print(average_ratings(reviews))
`,
        answer: src`
def average_ratings(reviews):
    sums = {}
    counts = {}
    for review in reviews:
        product = review["product_id"]
        if product not in sums:
            sums[product] = 0
            counts[product] = 0
        sums[product] += review["rating"]
        counts[product] += 1
    averages = {}
    for product, total in sums.items():
        averages[product] = total / counts[product]
    return averages

reviews = [
    {"product_id": "P0205", "rating": 5},
    {"product_id": "P0421", "rating": 4},
    {"product_id": "P0205", "rating": 2},
    {"product_id": "P0187", "rating": 5},
    {"product_id": "P0205", "rating": 4},
]
print(average_ratings(reviews))
`,
        alternatives: [
          src`
def average_ratings(reviews):
    ratings = {}
    for review in reviews:
        if review["product_id"] not in ratings:
            ratings[review["product_id"]] = []
        ratings[review["product_id"]].append(review["rating"])
    averages = {}
    for product, scores in ratings.items():
        total = 0
        for score in scores:
            total += score
        averages[product] = total / len(scores)
    return averages
`,
        ],
        wrong: [
          {
            code: src`
def average_ratings(reviews):
    sums = {}
    for review in reviews:
        product = review["product_id"]
        if product not in sums:
            sums[product] = 0
        sums[product] += review["rating"]
    averages = {}
    for product, total in sums.items():
        averages[product] = total / len(reviews)
    return averages
`,
            fails: ["returns"],
            why: "every sum is divided by the number of all reviews, not that product's reviews",
          },
          {
            code: src`
def average_ratings(reviews):
    sums = {}
    counts = {}
    for review in reviews:
        product = review["product_id"]
        if product not in sums:
            sums[product] = 0
            counts[product] = 0
        sums[product] += review["rating"]
        counts[product] += 1
    averages = {}
    for product, total in sums.items():
        averages[product] = total // counts[product]
    return averages
`,
            fails: ["returns"],
            why: "`//` throws away the fraction, so 11 / 3 becomes 3",
          },
        ],
        hints: [
          "Accumulate two dictionaries keyed by product: one total of ratings and one count.",
          "Create both keys the first time a product appears, then add to both on every review.",
          "After the loop, walk one dictionary with `items()` and divide by the matching count with `/`.",
        ],
        task: {
          checks: [
            fn("returns", "average_ratings", [
              example([reviews], { P0205: 11 / 3, P0421: py.float(4), P0187: py.float(5) }),
              example([[{ product_id: "P0640", rating: 3 }, { product_id: "P0640", rating: 4 }]], { P0640: 3.5 }),
              example([[]], {}),
              hiddenCase("a single review", [[{ product_id: "P0164", rating: 1 }]], { P0164: py.float(1) }),
              hiddenCase("products that alternate", [[{ product_id: "A", rating: 5 }, { product_id: "B", rating: 1 }, { product_id: "A", rating: 4 }, { product_id: "B", rating: 2 }]], { A: 4.5, B: 1.5 }),
              hiddenCase("an average that is not a whole number", [[{ product_id: "P1", rating: 5 }, { product_id: "P1", rating: 5 }, { product_id: "P1", rating: 4 }]], { P1: 14 / 3 }),
            ], { label: "average_ratings() averages each product's own ratings" }),
          ],
        },
      },
      {
        id: "c2",
        title: "The busiest customer",
        prompt: "Write `top_customer(orders)`: return the `customer_id` with the most orders. If two customers tie, return the one whose first order comes earlier in the list. If there are no orders, return `None`.",
        spec: [
          ["Function", "`top_customer(orders)`"],
          ["orders", "a list of dictionaries with `order_id` and `customer_id`"],
          ["Returns", "one customer ID, or `None` for an empty list"],
          ["Ties", "the customer seen first wins"],
          ["Example", "the starter's orders → `'C00077'` (3 orders)"],
        ],
        starter: src`
def top_customer(orders):
    return None

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101723", "customer_id": "C01338"},
    {"order_id": "O108858", "customer_id": "C00077"},
]
print(top_customer(orders))
`,
        answer: src`
def top_customer(orders):
    counts = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in counts:
            counts[customer] = 0
        counts[customer] += 1
    best = None
    best_count = 0
    for customer, count in counts.items():
        if count > best_count:
            best = customer
            best_count = count
    return best

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101723", "customer_id": "C01338"},
    {"order_id": "O108858", "customer_id": "C00077"},
]
print(top_customer(orders))
`,
        alternatives: [
          src`
def top_customer(orders):
    counts = {}
    for order in orders:
        if order["customer_id"] in counts:
            counts[order["customer_id"]] += 1
        else:
            counts[order["customer_id"]] = 1
    best = None
    for customer in counts:
        if best is None or counts[customer] > counts[best]:
            best = customer
    return best
`,
        ],
        wrong: [
          {
            code: src`
def top_customer(orders):
    counts = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in counts:
            counts[customer] = 0
        counts[customer] += 1
    best = None
    best_count = 0
    for customer, count in counts.items():
        if count >= best_count:
            best = customer
            best_count = count
    return best
`,
            fails: ["returns"],
            why: "`>=` lets a later customer with the same count take over, so ties go to the wrong one",
          },
          {
            code: src`
def top_customer(orders):
    counts = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in counts:
            counts[customer] = 0
        counts[customer] += 1
    best_count = 0
    for customer, count in counts.items():
        if count > best_count:
            best_count = count
    return best_count
`,
            fails: ["returns"],
            why: "it returns how many orders the top customer has, not who they are",
          },
          {
            code: src`
def top_customer(orders):
    counts = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in counts:
            counts[customer] = 0
        counts[customer] += 1
    best = orders[0]["customer_id"]
    for customer, count in counts.items():
        if count > counts[best]:
            best = customer
    return best
`,
            fails: ["returns"],
            why: "starting from the first order crashes with IndexError when there are no orders",
          },
        ],
        hints: [
          "Two steps: count orders per customer with a dictionary, then find the largest count.",
          "For the second step, keep a best customer and a best count, starting from `None` and 0, and walk the counts with `items()`.",
          "Replace the best only when a count is strictly greater. The dictionary keeps customers in first-seen order, so the earlier one stays on a tie.",
        ],
        task: {
          checks: [
            fn("returns", "top_customer", [
              example([busyOrders], "C00077"),
              example([[{ order_id: "O1", customer_id: "C02307" }]], "C02307"),
              example([[]], null),
              hiddenCase("a tie between two customers", [[{ order_id: "O1", customer_id: "C2" }, { order_id: "O2", customer_id: "C1" }, { order_id: "O3", customer_id: "C1" }, { order_id: "O4", customer_id: "C2" }]], "C2"),
              hiddenCase("the top customer's orders are not next to each other", [[{ order_id: "O1", customer_id: "A" }, { order_id: "O2", customer_id: "B" }, { order_id: "O3", customer_id: "B" }, { order_id: "O4", customer_id: "A" }, { order_id: "O5", customer_id: "B" }]], "B"),
              hiddenCase("everyone ordered once", [[{ order_id: "O1", customer_id: "X" }, { order_id: "O2", customer_id: "Y" }]], "X"),
            ], { label: "top_customer() finds the customer with the most orders" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
statuses = ["delivered", "returned", "delivered", "cancelled", "delivered"]
counts = {}
for s in statuses:
    if s not in counts:
        counts[s] = 0
    counts[s] += 1
print(counts["delivered"], len(counts))
`,
        choices: ["3 3", "3 5", "5 3", "1 3"],
        answer: 0,
        why: "delivered appears three times. There are three different statuses, so the dictionary has three keys.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the starting value is set on every pass. What does this print?",
        program: src`
groups = {}
for city, order_id in [("Houston", "O1"), ("Denver", "O2"), ("Houston", "O3")]:
    groups[city] = []
    groups[city].append(order_id)
print(groups)
`,
        choices: ["{'Houston': ['O3'], 'Denver': ['O2']}", "{'Houston': ['O1', 'O3'], 'Denver': ['O2']}", "{'Houston': ['O1'], 'Denver': ['O2']}", "KeyError"],
        answer: 0,
        why: "Without `if city not in groups`, the third pass replaces Houston's list with a new empty one, so O1 is lost.",
      },
      {
        id: "q3",
        prompt: "You want the list of review IDs for each product. What should a new product's key start with?",
        choices: ["[]", "0", "\"\"", "None"],
        answer: 0,
        why: "A group collects a list, so it starts as an empty list you can append to. 0 is the start for counts and totals.",
      },
    ],
    review: [
      "Pick the key (what you group by) and the starting value (0 for counts and totals, `[]` for groups).",
      "On each pass: create the key if it is new, then update it with `+=` or `append`.",
      "`d[k] += x` reads the old value first, so a missing key raises KeyError.",
      "Next: a dictionary keyed by ID can join two collections.",
    ],
  },

  // ------------------------------------------------------------------ PY-L12-04 index, look up, merge
  {
    id: "PY-L12-04",
    version: 2,
    slug: "merge-dictionaries",
    title: "Look up and merge by key",
    lede: "Orders hold a customer ID; customers hold the name and city. Index one collection by ID once, and every record in the other finds its match in one lookup.",
    focus: "Combine two collections that share a key: index one by ID, look up each record of the other, and decide what happens when a key is missing.",
    minutes: 18,
    objectives: [
      "Build an index: a dictionary from ID to the whole record",
      "Join a second collection through the index, checking `in` when a key can be missing",
      "Merge two dictionaries with `update`, knowing which value wins and which dictionary changes",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-copy", "list-mutate", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "string-index", "comparison", "if-statement", "else-clause", "for-loop", "break-statement", "membership", "none-value", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "nested-loop"],
    teaches: ["dict-index", "dict-update"],
    blocks: [
      {
        kind: "text",
        md: "Data is usually split across tables. An order says `customer_id: C00077`, and that customer's city is in a different list. To show each order with its city you **join** the two on the shared key.\n\nYou could search the whole customer list for every order, a loop inside a loop. Instead, walk the customers once and build an **index**: a dictionary from ID to the whole customer record. After that, each order needs one lookup.",
      },
      {
        kind: "example",
        title: "Index, then look up",
        code: src`
customers = [
    {"customer_id": "C00038", "name": "Nora Garcia", "city": "New York"},
    {"customer_id": "C00077", "name": "Jamal Walker", "city": "Houston"},
]
by_id = {}
for customer in customers:
    by_id[customer["customer_id"]] = customer

orders = [
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101341", "customer_id": "C00038"},
    {"order_id": "O108858", "customer_id": "C00077"},
]
for order in orders:
    customer = by_id[order["customer_id"]]
    print(order["order_id"], customer["name"], customer["city"])
`,
        output: "O101219 Jamal Walker Houston\nO101341 Nora Garcia New York\nO108858 Jamal Walker Houston\n",
        note: "The index is built once. Jamal has two orders, and both find him with one lookup each.",
      },
      {
        kind: "text",
        md: "Real data has gaps. An order can point at a customer who isn't in the list you were given, and looking up a key that isn't there stops the program.",
      },
      {
        kind: "error-example",
        title: "A customer missing from the index",
        code: src`
by_id = {"C00077": {"name": "Jamal Walker"}}
orders = [{"order_id": "O101219", "customer_id": "C00077"}, {"order_id": "O121005", "customer_id": "C08398"}]
for order in orders:
    customer = by_id[order["customer_id"]]
    print(order["order_id"], customer["name"])
`,
        error: "KeyError",
        output: "O101219 Jamal Walker\n",
        note: "The first order prints; the second raises `KeyError: 'C08398'`. Decide what a missing match should do (skip the record, or use a placeholder such as `\"unknown\"`) and test with `in` before looking up.",
      },
      {
        kind: "text",
        md: "Sometimes both sides are already dictionaries with the same kind of key, such as a price list and a file of price changes. `prices.update(changes)` copies every pair from `changes` into `prices`: a key that already exists gets the new value, and a new key is added at the end.\n\n`update` changes the dictionary before the dot and returns None. When the original must survive, `copy()` it first; `copy` works on dictionaries the same way it does on lists.",
      },
      {
        kind: "example",
        title: "Apply price changes to a copy",
        code: src`
prices = {"SPO-11681": 7.49, "HOM-22847": 31.0, "ELE-24781": 171.99}
changes = {"HOM-22847": 27.5, "TOY-54564": 26.99}
new_prices = prices.copy()
new_prices.update(changes)
print(new_prices)
print(prices["HOM-22847"])
`,
        output: "{'SPO-11681': 7.49, 'HOM-22847': 27.5, 'ELE-24781': 171.99, 'TOY-54564': 26.99}\n31.0\n",
        note: "HOM-22847 took the new price and kept its place; TOY-54564 was added at the end. `prices` still has the old price because only the copy was updated.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Unknown products",
      prompt: "P0999 isn't in `names`, so the program stops with KeyError. When a product ID is missing, append `\"unknown\"` instead of looking it up.",
      spec: [
        ["Function", "`item_names(items, names)`"],
        ["Returns", "one product name per item, or `\"unknown\"` when the ID is not in `names`"],
      ],
      starter: src`
def item_names(items, names):
    labels = []
    for item in items:
        labels.append(names[item["product_id"]])
    return labels

names = {"P0001": "Ultra Bike Light", "P0004": "Deluxe Vase"}
items = [{"product_id": "P0001"}, {"product_id": "P0999"}, {"product_id": "P0004"}]
print(item_names(items, names))
`,
      answer: src`
def item_names(items, names):
    labels = []
    for item in items:
        if item["product_id"] in names:
            labels.append(names[item["product_id"]])
        else:
            labels.append("unknown")
    return labels

names = {"P0001": "Ultra Bike Light", "P0004": "Deluxe Vase"}
items = [{"product_id": "P0001"}, {"product_id": "P0999"}, {"product_id": "P0004"}]
print(item_names(items, names))
`,
      wrong: [
        {
          code: src`
def item_names(items, names):
    labels = []
    for item in items:
        if item["product_id"] in names:
            labels.append(names[item["product_id"]])
    return labels
`,
          fails: ["returns"],
          why: "the missing product is skipped, so the list is shorter than the order",
        },
      ],
      hints: ["Ask whether the ID is a key of `names` before using it.", "`in` on a dictionary checks its keys.", "Use `if … in names:` with an `else:` that appends the placeholder."],
      task: {
        checks: [
          fn("returns", "item_names", [
            example([[{ product_id: "P0001" }, { product_id: "P0999" }, { product_id: "P0004" }], { P0001: "Ultra Bike Light", P0004: "Deluxe Vase" }], ["Ultra Bike Light", "unknown", "Deluxe Vase"]),
            hiddenCase("every product is known", [[{ product_id: "P0006" }], { P0006: "Travel Yoga Mat" }], ["Travel Yoga Mat"]),
            hiddenCase("an empty name list", [[{ product_id: "P0007" }, { product_id: "P0005" }], {}], ["unknown", "unknown"]),
          ], { label: "item_names() labels each item, with a placeholder for unknown IDs" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Emails for a delivery notice",
        prompt: "Write `order_emails(orders, customers)`: return the customer email for each order, in the order of `orders`. `customers` is a list, so build an index first. Skip an order whose customer is not in the list.",
        spec: [
          ["Function", "`order_emails(orders, customers)`"],
          ["orders", "a list of dictionaries with `order_id` and `customer_id`"],
          ["customers", "a list of dictionaries with `customer_id` and `email`"],
          ["Returns", "a new list of emails, one per order whose customer is known; a customer with two orders appears twice"],
          ["Example", "the starter's data → `['jamal.walker62@icloud.com', 'nora_garcia@fastmail.com', 'jamal.walker62@icloud.com']`"],
        ],
        starter: src`
def order_emails(orders, customers):
    emails = []
    return emails

customers = [
    {"customer_id": "C00038", "email": "nora_garcia@fastmail.com"},
    {"customer_id": "C00077", "email": "jamal.walker62@icloud.com"},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
orders = [
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101341", "customer_id": "C00038"},
    {"order_id": "O121005", "customer_id": "C08398"},
    {"order_id": "O108858", "customer_id": "C00077"},
]
print(order_emails(orders, customers))
`,
        answer: src`
def order_emails(orders, customers):
    email_of = {}
    for customer in customers:
        email_of[customer["customer_id"]] = customer["email"]
    emails = []
    for order in orders:
        if order["customer_id"] in email_of:
            emails.append(email_of[order["customer_id"]])
    return emails

customers = [
    {"customer_id": "C00038", "email": "nora_garcia@fastmail.com"},
    {"customer_id": "C00077", "email": "jamal.walker62@icloud.com"},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
orders = [
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101341", "customer_id": "C00038"},
    {"order_id": "O121005", "customer_id": "C08398"},
    {"order_id": "O108858", "customer_id": "C00077"},
]
print(order_emails(orders, customers))
`,
        alternatives: [
          src`
def order_emails(orders, customers):
    emails = []
    for order in orders:
        for customer in customers:
            if customer["customer_id"] == order["customer_id"]:
                emails.append(customer["email"])
                break
    return emails
`,
        ],
        wrong: [
          {
            code: src`
def order_emails(orders, customers):
    email_of = {}
    for customer in customers:
        email_of[customer["customer_id"]] = customer["email"]
    emails = []
    for order in orders:
        emails.append(email_of[order["customer_id"]])
    return emails
`,
            fails: ["returns"],
            why: "an order from an unknown customer raises KeyError instead of being skipped",
          },
          {
            code: src`
def order_emails(orders, customers):
    emails = []
    for customer in customers:
        emails.append(customer["email"])
    return emails
`,
            fails: ["returns"],
            why: "it lists every customer once, in customer order, whatever was ordered",
          },
        ],
        hints: [
          "First loop: walk `customers` and store each email under its customer ID.",
          "Second loop: walk `orders` and look each customer ID up in that dictionary.",
          "Guard the lookup with `in`, and append only when the ID was found.",
        ],
        task: {
          checks: [
            fn("returns", "order_emails", [
              example([emailOrders, emailCustomers], ["jamal.walker62@icloud.com", "nora_garcia@fastmail.com", "jamal.walker62@icloud.com"]),
              example([[{ order_id: "O1", customer_id: "C01338" }], emailCustomers], ["grace_walker29@yahoo.com"]),
              example([[], emailCustomers], []),
              hiddenCase("no customers at all", [emailOrders, []], []),
              hiddenCase("every order from an unknown customer", [[{ order_id: "O9", customer_id: "C99999" }], emailCustomers], []),
              hiddenCase("orders listed in a different order from the customers", [[{ order_id: "O2", customer_id: "C01338" }, { order_id: "O3", customer_id: "C00038" }], emailCustomers], ["grace_walker29@yahoo.com", "nora_garcia@fastmail.com"]),
            ], { label: "order_emails() finds each order's email and skips unknown customers" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Price changes for known SKUs only",
        prompt: "A supplier's change file sometimes lists SKUs you don't sell. Write `apply_changes(prices, changes)`: return a **new** dictionary with the new price for every SKU that is already in `prices`. Ignore SKUs that aren't. `prices` must not change.",
        spec: [
          ["Function", "`apply_changes(prices, changes)`"],
          ["prices, changes", "dictionaries from SKU to price"],
          ["Returns", "a new dictionary with the same keys as `prices`, in the same order"],
          ["Must not", "change `prices`, or add a SKU from `changes` that `prices` doesn't have"],
          ["Example", "the starter's data → `{'SPO-11681': 7.49, 'HOM-22847': 27.5, 'ELE-24781': 171.99}`"],
        ],
        starter: src`
def apply_changes(prices, changes):
    result = {}
    return result

prices = {"SPO-11681": 7.49, "HOM-22847": 31, "ELE-24781": 171.99}
changes = {"HOM-22847": 27.5, "TOY-54564": 26.99}
print(apply_changes(prices, changes))
print(prices)
`,
        answer: src`
def apply_changes(prices, changes):
    result = prices.copy()
    for sku, price in changes.items():
        if sku in result:
            result[sku] = price
    return result

prices = {"SPO-11681": 7.49, "HOM-22847": 31, "ELE-24781": 171.99}
changes = {"HOM-22847": 27.5, "TOY-54564": 26.99}
print(apply_changes(prices, changes))
print(prices)
`,
        alternatives: [
          src`
def apply_changes(prices, changes):
    result = {}
    for sku, price in prices.items():
        if sku in changes:
            result[sku] = changes[sku]
        else:
            result[sku] = price
    return result
`,
        ],
        wrong: [
          {
            code: src`
def apply_changes(prices, changes):
    result = prices.copy()
    result.update(changes)
    return result
`,
            fails: ["returns"],
            why: "`update` also adds the SKU you don't sell",
          },
          {
            code: src`
def apply_changes(prices, changes):
    for sku, price in changes.items():
        if sku in prices:
            prices[sku] = price
    return prices
`,
            fails: ["keeps-input", "new-dict"],
            why: "the right prices, but written into the caller's price list and handed back as the same dictionary",
          },
        ],
        hints: [
          "`update` would add unknown SKUs, so this needs a loop with a decision in it.",
          "Start the result as a copy of `prices`, so the original is untouched.",
          "Walk `changes` with `items()` and replace a price only when that SKU is already a key of the result.",
        ],
        task: {
          checks: [
            fn("returns", "apply_changes", [
              example([stockPrices, { "HOM-22847": 27.5, "TOY-54564": 26.99 }], { "SPO-11681": 7.49, "HOM-22847": 27.5, "ELE-24781": 171.99 }),
              example([stockPrices, {}], stockPrices),
              example([{}, { "TOY-54564": 26.99 }], {}),
              hiddenCase("every SKU changes", [{ A: 1, B: 2 }, { B: 5, A: 4 }], { A: 4, B: 5 }),
              hiddenCase("only unknown SKUs in the change file", [{ A: 1 }, { Z: 9, Y: 8 }], { A: 1 }),
            ], { label: "apply_changes() updates known SKUs only" }),
            fn("keeps-input", "apply_changes", [
              keepsInput([stockPrices, { "HOM-22847": 27.5 }]),
              keepsInput([{ A: 1 }, { A: 2, B: 3 }], { label: "a change to a known SKU" }),
            ], { label: "apply_changes() leaves both dictionaries unchanged" }),
            {
              kind: "expr",
              id: "new-dict",
              label: "apply_changes() returns a new dictionary, not prices itself",
              expr: "_p = {'A': 1}\nresult = apply_changes(_p, {'A': 2}) is not _p",
              expected: py.bool(true),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
cities = {"C00038": "New York", "C00077": "Houston"}
for customer_id in ["C00077", "C02307", "C00038"]:
    if customer_id in cities:
        print(cities[customer_id])
    else:
        print("unknown")
`,
        choices: ["Houston\nunknown\nNew York", "Houston\nNew York", "New York\nunknown\nHouston", "Houston\nKeyError"],
        answer: 0,
        why: "Each ID is checked with `in` before the lookup. C02307 isn't a key, so the else branch prints the placeholder.",
      },
      {
        id: "q2",
        prompt: "What does this print?",
        program: src`
settings = {"currency": "USD", "page_size": 20}
saved = {"page_size": 50, "theme": "dark"}
settings.update(saved)
print(settings)
`,
        choices: ["{'currency': 'USD', 'page_size': 50, 'theme': 'dark'}", "{'currency': 'USD', 'page_size': 20, 'theme': 'dark'}", "{'page_size': 50, 'theme': 'dark'}", "{'currency': 'USD', 'theme': 'dark', 'page_size': 50}"],
        answer: 0,
        why: "On a shared key the value from `saved` wins, but the key keeps its original position. theme is new, so it is added at the end.",
      },
      {
        id: "q3",
        prompt: "A common mistake: storing what `update` returns. What does this print?",
        program: src`
prices = {"HOM-22847": 31.0}
new_prices = prices.update({"HOM-22847": 27.5})
print(new_prices, prices)
`,
        choices: ["None {'HOM-22847': 27.5}", "{'HOM-22847': 27.5} {'HOM-22847': 31.0}", "{'HOM-22847': 27.5} {'HOM-22847': 27.5}", "None {'HOM-22847': 31.0}"],
        answer: 0,
        why: "`update` changes `prices` itself and returns None, like `append`. To keep the old prices, copy first and update the copy.",
      },
      {
        id: "q4",
        prompt: "Why build `by_id` once before the order loop, instead of searching the customer list inside it?",
        choices: ["Each order then needs one lookup instead of a scan of every customer", "A dictionary keeps the customers sorted", "Lists can't hold dictionaries", "It makes missing customers impossible"],
        answer: 0,
        why: "With 1,000 orders and 1,000 customers, nested loops compare up to a million pairs; the index needs 1,000 stores and 1,000 lookups. Missing keys still have to be handled.",
      },
    ],
    review: [
      "Index one collection once: `by_id[record[\"customer_id\"]] = record`.",
      "Look up each record from the other; test with `in` first when a key can be missing, and decide: skip it or use a placeholder.",
      "`a.update(b)` copies b's pairs into a; on a shared key b's value wins. It changes a and returns None.",
      "Next: the same \"have I seen this key?\" test removes duplicates.",
    ],
  },

  // ------------------------------------------------------------------ PY-L12-05 dedupe
  {
    id: "PY-L12-05",
    version: 2,
    slug: "drop-duplicates",
    title: "Remove duplicates, keep the first",
    lede: "Remember what you have already kept, and skip anything you've seen. One copy of each value or one record per key survives, in first-seen order.",
    focus: "Keep one copy of each value, or one record per key, in first-seen order.",
    minutes: 16,
    objectives: [
      "Remove repeated values while keeping the order they first appeared in",
      "Deduplicate records by one key field, keeping the first record with each key",
      "Choose deliberately between keeping the first and keeping the last",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "boolean", "list-literal", "list-index", "list-mutate", "len-call", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-method", "string-normalize", "truthiness", "arithmetic", "logical", "if-statement", "for-loop", "continue-statement", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "print-text", "comparison"],
    teaches: ["list-unique"],
    blocks: [
      {
        kind: "text",
        md: "Exports repeat themselves: a customer orders twice, a payment is retried, a sign-up form is sent again. **Deduplicating** keeps one copy of each, and the usual rule is *first seen wins*, in the original order.\n\nIt is a filter whose test is *have I seen this before?* Keep a second collection of what you've already kept, and check it with `not in`.",
      },
      {
        kind: "example",
        title: "Cities, once each",
        code: src`
cities = ["Houston", "New York", "Houston", "Denver", "New York"]
unique = []
for city in cities:
    if city not in unique:
        unique.append(city)
print(unique)
`,
        output: "['Houston', 'New York', 'Denver']\n",
        note: "The second Houston and the second New York find themselves already in `unique` and are skipped. Denver keeps its place after them.",
      },
      {
        kind: "text",
        md: "A set (see Dictionaries & Sets) also holds each value once, but it doesn't keep the order you added things in: printing a set of texts can list them in a different order from one run to the next. Use a list when the order matters.\n\nFor records, the duplicate test is usually one field, not the whole record. A payment that was retried has a new payment ID but the same order ID. Remember the keys you've seen and keep the first record with each key. A dictionary is a good place for the seen keys, because `in` on a dictionary checks its keys without walking a list.",
      },
      {
        kind: "example",
        title: "First payment attempt per order",
        code: src`
def first_attempts(payments):
    seen = {}
    kept = []
    for payment in payments:
        order_id = payment["order_id"]
        if order_id not in seen:
            seen[order_id] = True
            kept.append(payment)
    return kept

payments = [
    {"payment_id": "PAY0000416", "order_id": "O100376", "status": "captured"},
    {"payment_id": "PAY0000417", "order_id": "O100376", "status": "refunded"},
    {"payment_id": "PAY0001023", "order_id": "O100918", "status": "captured"},
    {"payment_id": "PAY0001024", "order_id": "O100918", "status": "refunded"},
    {"payment_id": "PAY0000313", "order_id": "O100282", "status": "captured"},
]
for payment in first_attempts(payments):
    print(payment["payment_id"], payment["order_id"], payment["status"])
`,
        output: "PAY0000416 O100376 captured\nPAY0001023 O100918 captured\nPAY0000313 O100282 captured\n",
        note: "Five payments, three orders. Each order keeps its first attempt; the refunds that came later are skipped.",
      },
      {
        kind: "text",
        md: "Keeping the **last** record per key is a different rule, with no `if` at all: store every record under its key, and later records overwrite earlier ones. Pick the rule on purpose. The first sign-up date wants *first*; an order's current status wants *last*. The concept check runs the *last* version.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Each customer once",
      prompt: "This lists the customer of every order, so a customer with two orders appears twice. Change it so each customer ID is appended only the first time it appears.",
      spec: [
        ["Function", "`customers_who_ordered(orders)`"],
        ["Returns", "each customer ID once, in the order of their first order"],
      ],
      starter: src`
def customers_who_ordered(orders):
    customers = []
    for order in orders:
        customers.append(order["customer_id"])
    return customers

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
]
print(customers_who_ordered(orders))
`,
      answer: src`
def customers_who_ordered(orders):
    customers = []
    for order in orders:
        if order["customer_id"] not in customers:
            customers.append(order["customer_id"])
    return customers

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
]
print(customers_who_ordered(orders))
`,
      wrong: [
        {
          code: src`
def customers_who_ordered(orders):
    return ["C00077", "C01338"]
`,
          fails: ["returns"],
          why: "the answer for one list is typed in",
        },
      ],
      hints: ["Before appending, ask whether the result already holds this customer.", "`not in` answers that question for a list.", "Put the `append` inside an `if` that uses `not in`."],
      task: {
        checks: [
          fn("returns", "customers_who_ordered", [
            example([[{ order_id: "O100282", customer_id: "C00077" }, { order_id: "O100918", customer_id: "C01338" }, { order_id: "O101219", customer_id: "C00077" }]], ["C00077", "C01338"]),
            hiddenCase("one customer with three orders", [[{ order_id: "O1", customer_id: "C9" }, { order_id: "O2", customer_id: "C9" }, { order_id: "O3", customer_id: "C9" }]], ["C9"]),
            hiddenCase("an empty list", [[]], []),
          ], { label: "customers_who_ordered() lists each customer once" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Each customer's first order",
        prompt: "Orders arrive oldest first. Write `first_orders(orders)`: return a dictionary from each `customer_id` to the `order_id` of that customer's **first** order.",
        spec: [
          ["Function", "`first_orders(orders)`"],
          ["orders", "a list of dictionaries with `order_id` and `customer_id`, oldest first"],
          ["Returns", "`{customer_id: first order_id}`; `{}` for no orders"],
          ["Example", "the starter's orders → `{'C00077': 'O100282', 'C01338': 'O100918', 'C00305': 'O101777'}`"],
        ],
        starter: src`
def first_orders(orders):
    firsts = {}
    return firsts

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101777", "customer_id": "C00305"},
    {"order_id": "O101723", "customer_id": "C01338"},
]
print(first_orders(orders))
`,
        answer: src`
def first_orders(orders):
    firsts = {}
    for order in orders:
        if order["customer_id"] not in firsts:
            firsts[order["customer_id"]] = order["order_id"]
    return firsts

orders = [
    {"order_id": "O100282", "customer_id": "C00077"},
    {"order_id": "O100918", "customer_id": "C01338"},
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O101777", "customer_id": "C00305"},
    {"order_id": "O101723", "customer_id": "C01338"},
]
print(first_orders(orders))
`,
        alternatives: [
          src`
def first_orders(orders):
    firsts = {}
    for order in orders:
        customer = order["customer_id"]
        if customer in firsts:
            continue
        firsts[customer] = order["order_id"]
    return firsts
`,
        ],
        wrong: [
          {
            code: src`
def first_orders(orders):
    firsts = {}
    for order in orders:
        firsts[order["customer_id"]] = order["order_id"]
    return firsts
`,
            fails: ["returns"],
            why: "without the test, every later order overwrites the first one, so this keeps the last",
          },
          {
            code: src`
def first_orders(orders):
    firsts = {}
    for order in orders:
        if order["order_id"] not in firsts:
            firsts[order["customer_id"]] = order["order_id"]
    return firsts
`,
            fails: ["returns"],
            why: "it checks the order ID against the keys, which are customer IDs, so the test never stops an overwrite",
          },
        ],
        hints: [
          "The dictionary you're building is also your record of which customers you've seen.",
          "Store an order only when its customer is not a key yet.",
          "Test the customer ID with `not in`, then store the order ID under it. Later orders from the same customer are skipped.",
        ],
        task: {
          checks: [
            fn("returns", "first_orders", [
              example([timeline], { C00077: "O100282", C01338: "O100918", C00305: "O101777" }),
              example([[{ order_id: "O9", customer_id: "C1" }]], { C1: "O9" }),
              example([[]], {}),
              hiddenCase("one customer with many orders", [[{ order_id: "A", customer_id: "C" }, { order_id: "B", customer_id: "C" }, { order_id: "D", customer_id: "C" }]], { C: "A" }),
              hiddenCase("every customer ordered once", [[{ order_id: "O1", customer_id: "X" }, { order_id: "O2", customer_id: "Y" }]], { X: "O1", Y: "O2" }),
            ], { label: "first_orders() keeps each customer's first order" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A clean mailing list",
        prompt: "Sign-up emails were typed by hand: some have capitals, spaces at the ends, or are blank. Write `unique_emails(emails)`: clean each one with `strip` and `lower`, skip blanks, and return each cleaned email once, in first-seen order. The list you were given must not change.",
        spec: [
          ["Function", "`unique_emails(emails)`"],
          ["emails", "a list of texts"],
          ["Returns", "a new list of cleaned, distinct, non-blank emails, in the order they first appear"],
          ["Must not", "change `emails`"],
          ["Example", "`[' Nora_Garcia@fastmail.com', 'nora_garcia@fastmail.com ', '', 'tariq.andersen@ironlabs.com']` → `['nora_garcia@fastmail.com', 'tariq.andersen@ironlabs.com']`"],
        ],
        starter: src`
def unique_emails(emails):
    cleaned = []
    return cleaned

signups = [" Nora_Garcia@fastmail.com", "nora_garcia@fastmail.com ", "", "tariq.andersen@ironlabs.com"]
print(unique_emails(signups))
print(signups)
`,
        answer: src`
def unique_emails(emails):
    cleaned = []
    for email in emails:
        email = email.strip().lower()
        if email and email not in cleaned:
            cleaned.append(email)
    return cleaned

signups = [" Nora_Garcia@fastmail.com", "nora_garcia@fastmail.com ", "", "tariq.andersen@ironlabs.com"]
print(unique_emails(signups))
print(signups)
`,
        alternatives: [
          src`
def unique_emails(emails):
    seen = {}
    for raw in emails:
        email = raw.lower().strip()
        if email == "":
            continue
        if email not in seen:
            seen[email] = True
    result = []
    for email in seen:
        result.append(email)
    return result
`,
        ],
        wrong: [
          {
            code: src`
def unique_emails(emails):
    cleaned = []
    for email in emails:
        if email not in cleaned:
            cleaned.append(email.strip().lower())
    return cleaned
`,
            fails: ["returns"],
            why: "the duplicate test runs on the raw text, so two spellings of one address both get in",
          },
          {
            code: src`
def unique_emails(emails):
    cleaned = []
    for email in emails:
        email = email.strip().lower()
        if email not in cleaned:
            cleaned.append(email)
    return cleaned
`,
            fails: ["returns"],
            why: "a blank sign-up is kept as an empty email",
          },
          {
            code: src`
def unique_emails(emails):
    for i in range(len(emails)):
        emails[i] = emails[i].strip().lower()
    cleaned = []
    for email in emails:
        if email and email not in cleaned:
            cleaned.append(email)
    return cleaned
`,
            fails: ["keeps-input"],
            why: "the result is right, but the caller's list was rewritten in place",
          },
        ],
        hints: [
          "Clean first, then decide: the duplicate test must compare cleaned emails.",
          "An empty text is false (see Conditional Logic), so `if email` skips blanks.",
          "Store the cleaned text in a local name, not back into the list you were given.",
        ],
        task: {
          checks: [
            fn("returns", "unique_emails", [
              example([[" Nora_Garcia@fastmail.com", "nora_garcia@fastmail.com ", "", "tariq.andersen@ironlabs.com"]], ["nora_garcia@fastmail.com", "tariq.andersen@ironlabs.com"]),
              example([["amarasingh@gmail.com"]], ["amarasingh@gmail.com"]),
              example([[]], []),
              hiddenCase("only blank or space-only entries", [["", "   ", ""]], []),
              hiddenCase("a repeat that comes back after other emails", [["b@x.com", "a@x.com", "B@X.COM", "c@x.com"]], ["b@x.com", "a@x.com", "c@x.com"]),
              hiddenCase("emails that are already clean and distinct", [["x@a.com", "y@a.com"]], ["x@a.com", "y@a.com"]),
            ], { label: "unique_emails() returns each cleaned email once" }),
            fn("keeps-input", "unique_emails", [
              keepsInput([[" A@b.com", "a@b.com"]]),
              keepsInput([["  Hugo.Smith@gmail.com "]], { label: "a single messy email" }),
            ], { label: "unique_emails() leaves the original list unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
tags = ["gift", "sale", "gift", "new", "sale", "gift"]
kept = []
for tag in tags:
    if tag not in kept:
        kept.append(tag)
print(kept, len(tags) - len(kept))
`,
        choices: ["['gift', 'sale', 'new'] 3", "['gift', 'sale', 'new'] 0", "['new', 'sale', 'gift'] 3", "['gift', 'sale', 'gift', 'new'] 2"],
        answer: 0,
        why: "Three distinct tags survive, in first-seen order, and three repeats were skipped.",
      },
      {
        id: "q2",
        prompt: "This keeps the *last* status per order. What does it print?",
        program: src`
events = [("O1", "shipped"), ("O2", "shipped"), ("O1", "delivered")]
latest = {}
for order_id, status in events:
    latest[order_id] = status
print(latest)
`,
        choices: ["{'O1': 'delivered', 'O2': 'shipped'}", "{'O1': 'shipped', 'O2': 'shipped'}", "{'O2': 'shipped', 'O1': 'delivered'}", "{'O1': 'shipped', 'O2': 'shipped', 'O1': 'delivered'}"],
        answer: 0,
        why: "With no `if`, the third event overwrites O1's value. O1 keeps its original position as the first key; a key can't appear twice.",
      },
      {
        id: "q3",
        prompt: "A common mistake: why not remove duplicate cities by turning the list into a set when the order matters?",
        choices: ["A set doesn't keep the order the values were added in", "A set keeps every copy", "A set can't hold text", "A set sorts the values alphabetically"],
        answer: 0,
        why: "A set does drop repeats, but its order is not the insertion order, and for text it can even change between runs. A list with `not in` (or a dictionary of seen keys) keeps first-seen order.",
      },
    ],
    review: [
      "Deduplicating is a filter whose test is \"not seen yet\".",
      "Keep first: test `not in` before storing. Keep last: overwrite under the key every time.",
      "Use the record's key field as the duplicate test, cleaned first when people typed it.",
      "Next (see Comprehensions): comprehensions write the filter and transform patterns in a single expression.",
    ],
  },
];
