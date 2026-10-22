/**
 * M10 practice: ten integration problems that combine everything from M01–M09 (PY-L10-01 … PY-L10-05).
 *
 * Every code question is a function graded on public examples and hidden inputs (empty data, boundaries, ties,
 * missing values, keyword arguments), with a mutation check where the input must survive.
 *
 * Mix: 4 function implementations, 2 data transformations, 2 debugging (genuinely broken functions), 1 validation,
 * 1 output prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 * Fixtures: Runtime Market baskets, addresses and invoices (R01), Runtime Films tags (R02), hotel bookings, race
 * results, step counts, meeting-room bookings and a bank statement as small inline fixtures.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

const labelOrder = {
  customer: { first: " nora", last: "GARCIA " },
  address: { street: "12 Elm St", city: "houston", state: "tx", zip: " 77002" },
};
const raceResults = [tup("Ana", 1520), tup("Ben", 1475), tup("Chen", 1610), tup("Dara", 1475), tup("Eli", 1502)];
const statement = [tup("05-01", "salary", 1800), tup("05-01", "rent", -1200), tup("05-02", "groceries", -86.4), tup("05-03", "phone", -45), tup("05-03", "transfer in", 30)];

export const m10Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q10-02",
    version: 2,
    slug: "tags-through-a-function",
    title: "Tags changed through a function",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "list-literal", "list-mutate", "list-copy", "list-index", "dict-literal", "dict-lookup", "membership", "if-statement", "len-call", "print-call", "print-several", "unquoted-name", "top-level-indent", "string-index", "print-text", "logical"],
    prompt: "Type exactly what this program prints. Decide, for each call, which list the function is changing.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`film[\"tags\"]` is the list stored in the dictionary itself, not a copy of it.",
      "The second call adds nothing, because the tag is already there, but it still returns a length.",
      "`copy()` makes a separate list, so changing it leaves the film's tags alone.",
    ],
    explanation: "The function receives the very list stored in the dictionary, so `append` changes the film's tags: after the first call there are 2. The second call finds `sci-fi` already present and returns 2 again. `copy()` makes a new list; the third call grows that copy to 3 and leaves the film's list at 2.",
    predict: {
      program: src`
def add_tag(tags, tag):
    if tag not in tags:
        tags.append(tag)
    return len(tags)

film = {"title": "Blue Dune", "tags": ["sci-fi"]}
n = add_tag(film["tags"], "space")
m = add_tag(film["tags"], "sci-fi")
spare = film["tags"].copy()
add_tag(spare, "desert")
print(n, m, film["tags"])
print(len(spare))
`,
      output: "2 2 ['sci-fi', 'space']\n3\n",
      wrongPredictions: ["2 3 ['sci-fi', 'space', 'sci-fi']\n3", "1 1 ['sci-fi']\n2", "2 2 ['sci-fi', 'space', 'desert']\n3", "2 2 ['sci-fi', 'space']\n2"],
    },
  },
  {
    id: "PY-Q10-03",
    version: 2,
    slug: "member-discount-twice",
    title: "Members are charged less every time the page refreshes",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "reassignment", "decimal-number", "whole-number", "boolean", "list-literal", "dict-literal", "dict-lookup", "dict-store", "arithmetic", "logical", "if-statement", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "string-format", "string-index", "list-index", "print-text", "membership", "precedence", "truthiness", "list-mutate"],
    prompt: "`basket_total(lines, member=False)` should return the basket's total, with 10% off every line for members **except clearance lines**, which never get the member discount. The checkout page calls it once to show the total and again to charge the card, and members are charged less the second time. Clearance items are being discounted too. Fix both bugs.",
    spec: [
      ["Function", "`basket_total(lines, member=False)`"],
      ["lines", "a list of dictionaries with `\"quantity\"`, `\"price\"` and `\"clearance\"` (True or False)"],
      ["Returns", "the sum of quantity × price, with members paying 90% of the price on non-clearance lines"],
      ["Must not", "change any line"],
    ],
    hiddenKinds: ["a basket with only clearance lines", "a member with an empty basket", "a non-member", "several quantities"],
    hints: [
      "Call it twice with the same basket and print both totals. What changed between the calls?",
      "The discounted price only needs to exist for this calculation: keep it in a local name instead of storing it in the line.",
      "The discount needs two conditions at once: a member, and a line that isn't clearance.",
    ],
    explanation: "`line[\"price\"] = ...` writes into the caller's own dictionary, so every call discounts the already-discounted price again: 90%, then 81%. Computing the price in a local name leaves the basket alone. The clearance rule needs `member and not line[\"clearance\"]`.",
    code: {
      starter: src`
def basket_total(lines, member=False):
    total = 0
    for line in lines:
        if member:
            line["price"] = line["price"] * 0.9
        total = total + line["quantity"] * line["price"]
    return total

basket = [{"quantity": 2, "price": 15.0, "clearance": False}, {"quantity": 1, "price": 8.0, "clearance": True}]
print(f"{basket_total(basket, True):.2f}", f"{basket_total(basket, True):.2f}")
`,
      answer: src`
def basket_total(lines, member=False):
    total = 0
    for line in lines:
        price = line["price"]
        if member and not line["clearance"]:
            price = price * 0.9
        total = total + line["quantity"] * price
    return total

basket = [{"quantity": 2, "price": 15.0, "clearance": False}, {"quantity": 1, "price": 8.0, "clearance": True}]
print(f"{basket_total(basket, True):.2f}", f"{basket_total(basket, True):.2f}")
`,
      alternatives: [
        src`
def basket_total(lines, member=False):
    total = 0
    for line in lines:
        amount = line["quantity"] * line["price"]
        if member and not line["clearance"]:
            amount = amount * 0.9
        total += amount
    return total
`,
      ],
      wrong: [
        {
          code: src`
def basket_total(lines, member=False):
    total = 0
    for line in lines:
        if member and not line["clearance"]:
            line["price"] = line["price"] * 0.9
        total = total + line["quantity"] * line["price"]
    return total
`,
          fails: ["keeps-input"],
          why: "clearance is handled, but the discounted price is still written into the caller's basket",
        },
        {
          code: src`
def basket_total(lines, member=False):
    total = 0
    for line in lines:
        price = line["price"]
        if member:
            price = price * 0.9
        total = total + line["quantity"] * price
    return total
`,
          fails: ["returns"],
          why: "the basket is safe now, but clearance lines still get the member discount",
        },
      ],
      task: {
        checks: [
          fn("returns", "basket_total", [
            example([[{ quantity: 2, price: py.float(15), clearance: false }, { quantity: 1, price: py.float(8), clearance: true }], true], py.float(35)),
            example([[{ quantity: 2, price: py.float(15), clearance: false }], false], py.float(30)),
            example([[], true], 0),
            hiddenCase("a basket with only clearance lines", [[{ quantity: 3, price: py.float(4), clearance: true }], true], py.float(12)),
            hiddenCase("a non-member", [[{ quantity: 1, price: py.float(10), clearance: false }, { quantity: 1, price: py.float(5), clearance: true }]], py.float(15)),
            hiddenCase("several quantities", [[{ quantity: 4, price: 2.5, clearance: false }], true], py.float(9)),
          ], { label: "basket_total() discounts members' non-clearance lines", compare: { numbers: "int-float-equal" } }),
          fn("keeps-input", "basket_total", [
            keepsInput([[{ quantity: 2, price: py.float(15), clearance: false }], true]),
            keepsInput([[{ quantity: 1, price: py.float(9), clearance: false }, { quantity: 1, price: py.float(3), clearance: true }], true], { label: "a member's mixed basket" }),
          ], { label: "basket_total() leaves the basket unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-06",
    version: 2,
    slug: "shipping-label",
    title: "Print-ready shipping label",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "dict-literal", "dict-lookup", "nested-dict", "membership", "logical", "if-statement", "string-method", "string-format", "newline-escape", "print-call", "unquoted-name", "top-level-indent", "string-index", "arithmetic", "comparison", "truthiness", "list-literal", "list-mutate", "list-index"],
    prompt: "Orders arrive with names and addresses exactly as customers typed them. The label printer needs three clean lines: the name in title case, the street (plus the unit, if there is one), and the city in capitals with the state code and ZIP.",
    spec: [
      ["Function", "`shipping_label(order)`"],
      ["order", "`{\"customer\": {\"first\", \"last\"}, \"address\": {\"street\", \"city\", \"state\", \"zip\"}}`; the address may also have a `\"unit\"`"],
      ["Returns", "one text of three lines joined by `\\n`: `First Last`, `street` or `street, unit`, `CITY, ST ZIP`"],
      ["Cleaning", "every field is stripped; names in title case; city and state in capitals; a unit that is blank counts as no unit"],
    ],
    hiddenKinds: ["an address with a unit", "a unit that is only spaces", "a name typed in capitals", "spaces around every field"],
    hints: [
      "Read each field through its two keys, `order[\"address\"][\"city\"]`, and clean it into a short local name.",
      "The unit needs two checks: the key exists, and what's left after `strip` isn't empty.",
      "Build the three lines with f-strings and join them with `\\n` between them.",
    ],
    explanation: "Each field is reached through the nested dictionaries and cleaned once into a local name: `strip` for every field, `title` for names, `upper` for the city and state. The unit is optional, so it is checked with `in` and for blankness before the street line is extended. The result is returned, not printed, so it can be sent to the printer or tested.",
    code: {
      starter: src`
def shipping_label(order):
    return ""

order = {
    "customer": {"first": " nora", "last": "GARCIA "},
    "address": {"street": "12 Elm St", "city": "houston", "state": "tx", "zip": " 77002"},
}
print(shipping_label(order))
`,
      answer: src`
def shipping_label(order):
    customer = order["customer"]
    address = order["address"]
    name = customer["first"].strip().title() + " " + customer["last"].strip().title()
    street = address["street"].strip()
    if "unit" in address and address["unit"].strip() != "":
        street = street + ", " + address["unit"].strip()
    city = address["city"].strip().upper()
    state = address["state"].strip().upper()
    return f"{name}\n{street}\n{city}, {state} {address['zip'].strip()}"

order = {
    "customer": {"first": " nora", "last": "GARCIA "},
    "address": {"street": "12 Elm St", "city": "houston", "state": "tx", "zip": " 77002"},
}
print(shipping_label(order))
`,
      alternatives: [
        src`
def clean(text):
    return text.strip()

def shipping_label(order):
    first = clean(order["customer"]["first"]).title()
    last = clean(order["customer"]["last"]).title()
    lines = [first + " " + last]
    street = clean(order["address"]["street"])
    unit = ""
    if "unit" in order["address"]:
        unit = clean(order["address"]["unit"])
    if unit:
        street = f"{street}, {unit}"
    lines.append(street)
    place = clean(order["address"]["city"]).upper() + ", " + clean(order["address"]["state"]).upper()
    lines.append(place + " " + clean(order["address"]["zip"]))
    return lines[0] + "\n" + lines[1] + "\n" + lines[2]
`,
      ],
      wrong: [
        {
          code: src`
def shipping_label(order):
    customer = order["customer"]
    address = order["address"]
    name = customer["first"].title() + " " + customer["last"].title()
    street = address["street"]
    if "unit" in address:
        street = street + ", " + address["unit"]
    return f"{name}\n{street}\n{address['city'].upper()}, {address['state'].upper()} {address['zip']}"
`,
          fails: ["returns"],
          why: "nothing is stripped, so the label keeps the customer's stray spaces",
        },
        {
          code: src`
def shipping_label(order):
    customer = order["customer"]
    address = order["address"]
    name = customer["first"].strip().title() + " " + customer["last"].strip().title()
    street = address["street"].strip()
    if "unit" in address:
        street = street + ", " + address["unit"].strip()
    city = address["city"].strip().upper()
    state = address["state"].strip().upper()
    return f"{name}\n{street}\n{city}, {state} {address['zip'].strip()}"
`,
          fails: ["returns"],
          why: "a unit of only spaces still adds a dangling comma to the street line",
        },
      ],
      task: {
        checks: [
          fn("returns", "shipping_label", [
            example([labelOrder], "Nora Garcia\n12 Elm St\nHOUSTON, TX 77002"),
            example([{ customer: { first: "jamal", last: "walker" }, address: { street: "400 Pine Ave", unit: "Apt 4", city: "Miami", state: "FL", zip: "33101" } }], "Jamal Walker\n400 Pine Ave, Apt 4\nMIAMI, FL 33101"),
            example([{ customer: { first: "GRACE", last: "WALKER" }, address: { street: "9 Oak Rd", city: "denver", state: "co", zip: "80202" } }], "Grace Walker\n9 Oak Rd\nDENVER, CO 80202"),
            hiddenCase("a unit that is only spaces", [{ customer: { first: "theo", last: "williams" }, address: { street: "1 Main St", unit: "   ", city: "Austin", state: "TX", zip: "73301" } }], "Theo Williams\n1 Main St\nAUSTIN, TX 73301"),
            hiddenCase("spaces around every field", [{ customer: { first: "  iris ", last: " miller  " }, address: { street: " 77 Lake Dr ", unit: " Suite 210 ", city: " boise ", state: " id ", zip: " 83702 " } }], "Iris Miller\n77 Lake Dr, Suite 210\nBOISE, ID 83702"),
            hiddenCase("a two-word city", [{ customer: { first: "hugo", last: "smith" }, address: { street: "5 Bay St", city: "new york", state: "ny", zip: "10001" } }], "Hugo Smith\n5 Bay St\nNEW YORK, NY 10001"),
          ], { label: "shipping_label() returns three clean lines" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-10",
    version: 2,
    slug: "check-a-hotel-booking",
    title: "Check a hotel booking",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "whole-number", "dict-literal", "dict-lookup", "list-literal", "list-mutate", "membership", "logical", "comparison", "if-statement", "else-clause", "string-format", "print-call", "unquoted-name", "top-level-indent", "string-index", "print-several", "print-text", "list-index", "arithmetic"],
    prompt: "A hotel's booking form sends a dictionary. Before confirming, check it and return the list of problems, in this order: the room type isn't one the hotel has; the number of nights isn't 1 to 14; the number of guests isn't at least 1 or is more than the room holds. An empty list means the booking is fine.",
    spec: [
      ["Function", "`booking_problems(booking)`"],
      ["booking", "a dictionary with `\"room\"`, `\"nights\"` and `\"guests\"`"],
      ["Rooms", "`CAPACITY = {\"single\": 1, \"double\": 2, \"suite\": 4}` (given)"],
      ["Messages", "`\"unknown room <room>\"`, `\"nights must be 1-14\"`, `\"too many guests for <room>\"` or `\"at least 1 guest\"`"],
      ["Rule", "the guest check against capacity only happens for a known room"],
    ],
    hiddenKinds: ["a valid suite at full capacity", "an unknown room and bad nights", "zero guests", "nights on both boundaries", "a stay that is too long"],
    hints: [
      "Build an empty list and append a message for each rule that fails, in the order given.",
      "Look the room up in `CAPACITY` only after `in` says it is there.",
      "Zero guests and too many guests are different messages; check zero first.",
    ],
    explanation: "Each rule is an independent `if` that appends its own message, so a booking can collect several problems at once. The capacity lookup is guarded by the unknown-room check, which also decides whether the guest rule can run at all. Chained comparisons such as `1 <= nights <= 14` keep the range checks readable.",
    code: {
      starter: src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    return []

print(booking_problems({"room": "double", "nights": 3, "guests": 3}))
`,
      answer: src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    problems = []
    room = booking["room"]
    if room not in CAPACITY:
        problems.append(f"unknown room {room}")
    if not 1 <= booking["nights"] <= 14:
        problems.append("nights must be 1-14")
    if booking["guests"] < 1:
        problems.append("at least 1 guest")
    elif room in CAPACITY and booking["guests"] > CAPACITY[room]:
        problems.append(f"too many guests for {room}")
    return problems

print(booking_problems({"room": "double", "nights": 3, "guests": 3}))
`,
      alternatives: [
        src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    problems = []
    known = booking["room"] in CAPACITY
    if not known:
        problems.append("unknown room " + booking["room"])
    nights = booking["nights"]
    if nights < 1 or nights > 14:
        problems.append("nights must be 1-14")
    guests = booking["guests"]
    if guests < 1:
        problems.append("at least 1 guest")
    else:
        if known and guests > CAPACITY[booking["room"]]:
            problems.append("too many guests for " + booking["room"])
    return problems
`,
      ],
      wrong: [
        {
          code: src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    problems = []
    room = booking["room"]
    if room not in CAPACITY:
        problems.append(f"unknown room {room}")
    if not 1 <= booking["nights"] <= 14:
        problems.append("nights must be 1-14")
    if booking["guests"] < 1:
        problems.append("at least 1 guest")
    elif booking["guests"] > CAPACITY[room]:
        problems.append(f"too many guests for {room}")
    return problems
`,
          fails: ["returns"],
          why: "an unknown room is looked up for its capacity anyway, which raises KeyError",
        },
        {
          code: src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    problems = []
    room = booking["room"]
    if room not in CAPACITY:
        problems.append(f"unknown room {room}")
    elif not 1 <= booking["nights"] <= 14:
        problems.append("nights must be 1-14")
    elif booking["guests"] < 1:
        problems.append("at least 1 guest")
    elif booking["guests"] > CAPACITY[room]:
        problems.append(f"too many guests for {room}")
    return problems
`,
          fails: ["returns"],
          why: "one `elif` chain reports only the first problem, so a booking with two problems shows one",
        },
        {
          code: src`
CAPACITY = {"single": 1, "double": 2, "suite": 4}

def booking_problems(booking):
    problems = []
    room = booking["room"]
    if room not in CAPACITY:
        problems.append(f"unknown room {room}")
    if not 1 < booking["nights"] < 14:
        problems.append("nights must be 1-14")
    if booking["guests"] < 1:
        problems.append("at least 1 guest")
    elif room in CAPACITY and booking["guests"] > CAPACITY[room]:
        problems.append(f"too many guests for {room}")
    return problems
`,
          fails: ["returns"],
          why: "`<` on both ends rejects stays of exactly 1 and 14 nights",
        },
      ],
      task: {
        checks: [
          fn("returns", "booking_problems", [
            example([{ room: "double", nights: 3, guests: 3 }], ["too many guests for double"]),
            example([{ room: "single", nights: 2, guests: 1 }], []),
            example([{ room: "loft", nights: 0, guests: 2 }], ["unknown room loft", "nights must be 1-14"]),
            hiddenCase("a valid suite at full capacity", [{ room: "suite", nights: 7, guests: 4 }], []),
            hiddenCase("zero guests", [{ room: "double", nights: 2, guests: 0 }], ["at least 1 guest"]),
            hiddenCase("nights on both boundaries", [{ room: "single", nights: 14, guests: 1 }], []),
            hiddenCase("a one-night stay", [{ room: "single", nights: 1, guests: 1 }], []),
            hiddenCase("a stay that is too long", [{ room: "suite", nights: 15, guests: 5 }], ["nights must be 1-14", "too many guests for suite"]),
          ], { label: "booking_problems() lists every problem in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q10-12",
    version: 2,
    slug: "most-items-on-a-budget",
    title: "The most items on a budget",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 10,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "decimal-number", "whole-number", "list-literal", "list-sort", "tuple-literal", "arithmetic", "comparison", "if-statement", "for-loop", "break-statement", "print-call", "unquoted-name", "top-level-indent", "print-several", "membership", "logical", "precedence", "while-loop", "len-call", "string-index"],
    prompt: "A gift-card holder wants as **many** items as possible from a wish list for a fixed budget. Buying the cheapest items first gives the most items. Return how many items fit and how much they cost together.",
    spec: [
      ["Function", "`most_items(prices, budget)`"],
      ["Returns", "a tuple `(count, spent)`: buy the cheapest items first and stop at the first one that no longer fits"],
      ["Rules", "an item that costs exactly what is left still fits; `prices` must not change"],
    ],
    hiddenKinds: ["a budget that fits everything", "an item that exactly uses up the budget", "a budget too small for anything", "several items with the same price", "an empty wish list"],
    hints: [
      "Sort a copy of the prices from cheapest to dearest; `sorted` leaves the original alone.",
      "Walk the sorted prices, adding each one while it still fits.",
      "Stop at the first price that doesn't fit: every later one is at least as expensive.",
    ],
    explanation: "Cheapest-first maximises the count. `sorted(prices)` gives a new ordered list without touching the caller's list. Each price is bought if `spent + price <= budget`, and the loop breaks at the first one that doesn't fit. Using `<` instead of `<=` refuses an item that exactly fits; sorting the input in place changes the caller's wish list.",
    code: {
      starter: src`
def most_items(prices, budget):
    return (0, 0)

print(most_items([12.5, 3.99, 25.0, 7.25, 4.5], 20))
`,
      answer: src`
def most_items(prices, budget):
    count = 0
    spent = 0
    for price in sorted(prices):
        if spent + price > budget:
            break
        spent = spent + price
        count = count + 1
    return count, spent

print(most_items([12.5, 3.99, 25.0, 7.25, 4.5], 20))
`,
      alternatives: [
        src`
def most_items(prices, budget):
    ordered = sorted(prices)
    count = 0
    left = budget
    while count < len(ordered) and ordered[count] <= left:
        left -= ordered[count]
        count += 1
    return (count, budget - left)
`,
      ],
      wrong: [
        {
          code: src`
def most_items(prices, budget):
    count = 0
    spent = 0
    for price in prices:
        if spent + price > budget:
            break
        spent = spent + price
        count = count + 1
    return count, spent
`,
          fails: ["returns"],
          why: "the items are bought in list order, not cheapest first",
        },
        {
          code: src`
def most_items(prices, budget):
    prices.sort()
    count = 0
    spent = 0
    for price in prices:
        if spent + price > budget:
            break
        spent = spent + price
        count = count + 1
    return count, spent
`,
          fails: ["keeps-input"],
          why: "the result is right, but `sort()` reorders the caller's wish list",
        },
        {
          code: src`
def most_items(prices, budget):
    count = 0
    spent = 0
    for price in sorted(prices):
        if spent + price >= budget:
            break
        spent = spent + price
        count = count + 1
    return count, spent
`,
          fails: ["returns"],
          why: "`>=` refuses an item that exactly uses up the budget",
        },
      ],
      task: {
        checks: [
          fn("returns", "most_items", [
            example([[12.5, 3.99, 25.0, 7.25, 4.5], 20], tup(3, 15.74)),
            example([[10, 10, 10], 25], tup(2, 20)),
            example([[], 50], tup(0, 0)),
            hiddenCase("a budget that fits everything", [[1, 2, 3], 100], tup(3, 6)),
            hiddenCase("an item that exactly uses up the budget", [[6, 4], 10], tup(2, 10)),
            hiddenCase("a budget too small for anything", [[5.5, 8], 5], tup(0, 0)),
            hiddenCase("cheap items at the end of the list", [[30, 2, 1, 40], 10], tup(2, 3)),
          ], { label: "most_items() buys the cheapest items first", compare: { numbers: "int-float-equal" } }),
          fn("keeps-input", "most_items", [
            keepsInput([[12.5, 3.99, 25.0, 7.25, 4.5], 20]),
            keepsInput([[9, 1, 5], 6], { label: "an unsorted wish list" }),
          ], { label: "most_items() leaves the wish list as it was" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-13",
    version: 2,
    slug: "race-podium-bug",
    title: "The podium is in alphabetical order",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "string-value", "whole-number", "list-literal", "list-index", "list-mutate", "list-sort", "tuple-literal", "tuple-unpack", "for-loop", "print-call", "unquoted-name", "top-level-indent", "string-index", "membership", "string-slice"],
    prompt: "`podium(results, places=3)` should return the names of the fastest runners, fastest first. Results are `(name, seconds)` tuples. Runners with the same time are listed alphabetically. Right now it returns names in alphabetical order whatever their times, and after calling it the organisers' results list has been reshuffled. Fix both problems.",
    spec: [
      ["Function", "`podium(results, places=3)`"],
      ["results", "a list of `(name, seconds)` tuples"],
      ["Returns", "a new list of up to `places` names, lowest time first; equal times in alphabetical order"],
      ["Must not", "change `results`"],
    ],
    hiddenKinds: ["two runners with the same time", "fewer runners than places", "a different number of places", "times out of order"],
    hints: [
      "Tuples sort by their first item, then the second. Which item does `(name, seconds)` sort by?",
      "Build new `(seconds, name)` tuples, so sorting puts the fastest first and breaks ties by name.",
      "`sort()` changes the list it is called on; `sorted` builds a new one.",
    ],
    explanation: "Sorting tuples compares their first items, so `(name, seconds)` pairs sort alphabetically. Building `(seconds, name)` pairs makes the time decide, and equal times fall back to the name, exactly the tie rule. `results.sort()` rearranges the caller's list; sorting a new list (or using `sorted`) leaves it alone. Slicing `[:places]` handles a field smaller than the podium.",
    code: {
      starter: src`
def podium(results, places=3):
    results.sort()
    names = []
    for name, seconds in results[:places]:
        names.append(name)
    return names

results = [("Ana", 1520), ("Ben", 1475), ("Chen", 1610), ("Dara", 1475), ("Eli", 1502)]
print(podium(results))
print(results[0])
`,
      answer: src`
def podium(results, places=3):
    by_time = []
    for name, seconds in results:
        by_time.append((seconds, name))
    names = []
    for seconds, name in sorted(by_time)[:places]:
        names.append(name)
    return names

results = [("Ana", 1520), ("Ben", 1475), ("Chen", 1610), ("Dara", 1475), ("Eli", 1502)]
print(podium(results))
print(results[0])
`,
      alternatives: [
        src`
def podium(results, places=3):
    flipped = []
    for result in results:
        flipped.append((result[1], result[0]))
    flipped.sort()
    top = flipped[:places]
    names = []
    for pair in top:
        names.append(pair[1])
    return names
`,
      ],
      wrong: [
        {
          code: src`
def podium(results, places=3):
    names = []
    for name, seconds in sorted(results)[:places]:
        names.append(name)
    return names
`,
          fails: ["returns"],
          why: "the input is safe now, but the pairs still sort by name",
        },
        {
          code: src`
def podium(results, places=3):
    by_time = []
    for name, seconds in results:
        by_time.append((seconds, name))
    by_time.sort(reverse=True)
    names = []
    for seconds, name in by_time[:places]:
        names.append(name)
    return names
`,
          fails: ["returns"],
          why: "`reverse=True` puts the slowest runners first",
        },
        {
          code: src`
def podium(results, places=3):
    for i in range(len(results)):
        name, seconds = results[i]
        results[i] = (seconds, name)
    results.sort()
    names = []
    for seconds, name in results[:places]:
        names.append(name)
    return names
`,
          fails: ["keeps-input"],
          why: "the podium is right, but the caller's list is rewritten as (seconds, name) pairs",
        },
      ],
      task: {
        checks: [
          fn("returns", "podium", [
            example([raceResults], ["Ben", "Dara", "Eli"]),
            example([raceResults, 1], ["Ben"]),
            example([[tup("Zed", 900), tup("Amy", 950)]], ["Zed", "Amy"]),
            hiddenCase("two runners with the same time", [[tup("Yara", 1300), tup("Abe", 1300), tup("Kim", 1250)]], ["Kim", "Abe", "Yara"]),
            hiddenCase("fewer runners than places", [[tup("Solo", 2000)]], ["Solo"]),
            hiddenCase("a different number of places", [raceResults], ["Ben", "Dara", "Eli", "Ana", "Chen"], { kwargs: { places: 5 } }),
            hiddenCase("no runners", [[]], []),
          ], { label: "podium() lists the fastest runners first" }),
          fn("keeps-input", "podium", [
            keepsInput([raceResults]),
            keepsInput([[tup("B", 2), tup("A", 1)]], { label: "times out of order" }),
          ], { label: "podium() leaves the results list unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-16",
    version: 2,
    slug: "weekly-step-totals",
    title: "Weekly totals from daily steps",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "reassignment", "whole-number", "list-literal", "list-index", "list-mutate", "len-call", "range-call", "arithmetic", "comparison", "if-statement", "for-loop", "nested-loop", "print-call", "unquoted-name", "top-level-indent", "string-slice", "string-index", "membership", "precedence", "enumerate-call"],
    prompt: "A fitness app stores one step count per day, oldest first. The weekly view groups them into blocks of 7 days starting from the first day; a final block shorter than 7 days is still shown. Return the total of each block.",
    spec: [
      ["Function", "`block_totals(daily, size=7)`"],
      ["daily", "a list of whole-number step counts"],
      ["Returns", "a new list with the total of each block of `size` days, in order; the last block may be shorter"],
    ],
    hiddenKinds: ["an exact number of weeks", "a last week of one day", "a different block size", "no days at all"],
    hints: [
      "`range(0, len(daily), size)` gives the first position of each block.",
      "A slice from that position to `position + size` is one block; a slice past the end simply stops at the end.",
      "Total each block with a loop and append the total.",
    ],
    explanation: "Stepping `range` by the block size gives each block's start; slicing `daily[start:start + size]` takes the block and never fails at the end of the list, so the short final block comes for free. An inner loop totals it. Using `len(daily) // size` blocks instead drops the partial week.",
    code: {
      starter: src`
def block_totals(daily, size=7):
    return []

steps = [8200, 10450, 6120, 9900, 12010, 4300, 7650, 11020, 9050]
print(block_totals(steps))
`,
      answer: src`
def block_totals(daily, size=7):
    totals = []
    for start in range(0, len(daily), size):
        total = 0
        for steps in daily[start:start + size]:
            total = total + steps
        totals.append(total)
    return totals

steps = [8200, 10450, 6120, 9900, 12010, 4300, 7650, 11020, 9050]
print(block_totals(steps))
`,
      alternatives: [
        src`
def block_totals(daily, size=7):
    totals = []
    current = 0
    for i, steps in enumerate(daily):
        current += steps
        if (i + 1) % size == 0:
            totals.append(current)
            current = 0
    if len(daily) % size != 0:
        totals.append(current)
    return totals
`,
      ],
      wrong: [
        {
          code: src`
def block_totals(daily, size=7):
    totals = []
    for week in range(len(daily) // size):
        total = 0
        for steps in daily[week * size:week * size + size]:
            total = total + steps
        totals.append(total)
    return totals
`,
          fails: ["returns"],
          why: "`len(daily) // size` counts only complete weeks, so the short last week is dropped",
        },
        {
          code: src`
def block_totals(daily, size=7):
    totals = []
    for start in range(0, len(daily), size):
        total = 0
        for steps in daily[start:start + size - 1]:
            total = total + steps
        totals.append(total)
    return totals
`,
          fails: ["returns"],
          why: "the slice stops one day early, so the last day of every block is missed",
        },
      ],
      task: {
        checks: [
          fn("returns", "block_totals", [
            example([[8200, 10450, 6120, 9900, 12010, 4300, 7650, 11020, 9050]], [58630, 20070]),
            example([[1000, 2000, 3000], 2], [3000, 3000]),
            example([[500]], [500]),
            hiddenCase("an exact number of weeks", [[1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]], [7, 14]),
            hiddenCase("a last week of one day", [[5, 5, 5, 5, 5, 5, 5, 9]], [35, 9]),
            hiddenCase("a different block size", [[3, 4, 5, 6, 7], 3], [12, 13]),
            hiddenCase("no days at all", [[]], []),
          ], { label: "block_totals() totals each block of days, including a short last one" }),
          fn("keeps-input", "block_totals", [keepsInput([[8200, 10450, 6120]])], { label: "block_totals() leaves the daily list unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-19",
    version: 2,
    slug: "next-invoice-number",
    title: "The next invoice number",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "none-value", "len-call", "string-index", "string-slice", "membership", "conversion", "arithmetic", "comparison", "logical", "if-statement", "while-loop", "print-call", "unquoted-name", "top-level-indent", "print-text", "precedence"],
    prompt: "An accounting system numbers invoices with a prefix and a counter, such as `INV-0099`. The next number keeps the prefix exactly and adds 1 to the counter, keeping the counter's width with leading zeros (`INV-0100`). When the counter overflows its width, it simply grows (`INV-999` → `INV-1000`). The counter is the run of digits at the very end; a number that doesn't end in a digit is invalid.",
    spec: [
      ["Function", "`next_invoice(number)`"],
      ["Returns", "the same prefix with the counter plus 1, zero-padded to at least the old width; `None` if `number` doesn't end in a digit"],
    ],
    hiddenKinds: ["a counter that overflows its width", "digits inside the prefix", "a lower-case prefix", "a number that is only digits", "no digits at the end"],
    hints: [
      "Walk back from the end while the characters are digits: that gives where the counter starts.",
      "Slice the prefix and the counter apart, convert the counter with `int` and add 1.",
      "Turn it back into text and add zeros in front until it is at least as long as the old counter.",
    ],
    explanation: "Only the trailing digits are the counter, so the split point is found from the end; `2024-0001` has digits in its prefix too. Converting with `int` loses the leading zeros, so they are put back by padding to the old width with `\"0\" * missing`. If the new number is longer, it is kept as it is.",
    code: {
      starter: src`
def next_invoice(number):
    return number

print(next_invoice("INV-0099"))
`,
      answer: src`
def next_invoice(number):
    start = len(number)
    while start > 0 and number[start - 1] in "0123456789":
        start = start - 1
    if start == len(number):
        return None
    prefix = number[:start]
    counter = number[start:]
    new_counter = str(int(counter) + 1)
    if len(new_counter) < len(counter):
        new_counter = "0" * (len(counter) - len(new_counter)) + new_counter
    return prefix + new_counter

print(next_invoice("INV-0099"))
`,
      alternatives: [
        src`
def next_invoice(number):
    digits = ""
    i = len(number) - 1
    while i >= 0 and number[i] in "0123456789":
        digits = number[i] + digits
        i -= 1
    if digits == "":
        return None
    width = len(digits)
    value = str(int(digits) + 1)
    while len(value) < width:
        value = "0" + value
    return number[:i + 1] + value
`,
      ],
      wrong: [
        {
          code: src`
def next_invoice(number):
    return number[:4] + str(int(number[4:]) + 1)
`,
          fails: ["returns"],
          why: "it assumes a four-character prefix and drops the leading zeros",
        },
        {
          code: src`
def next_invoice(number):
    start = len(number)
    while start > 0 and number[start - 1] in "0123456789":
        start = start - 1
    if start == len(number):
        return None
    return number[:start] + str(int(number[start:]) + 1)
`,
          fails: ["returns"],
          why: "the counter loses its leading zeros: `INV-0099` becomes `INV-100`",
        },
        {
          code: src`
def next_invoice(number):
    start = 0
    while start < len(number) and number[start] not in "0123456789":
        start = start + 1
    if start == len(number):
        return None
    counter = number[start:]
    new_counter = str(int(counter) + 1)
    if len(new_counter) < len(counter):
        new_counter = "0" * (len(counter) - len(new_counter)) + new_counter
    return number[:start] + new_counter
`,
          fails: ["returns"],
          why: "the counter is taken from the first digit, so a prefix with digits such as `2024-` breaks `int`",
        },
      ],
      task: {
        checks: [
          fn("returns", "next_invoice", [
            example(["INV-0099"], "INV-0100"),
            example(["INV-999"], "INV-1000"),
            example(["A7"], "A8"),
            example(["DRAFT"], null),
            hiddenCase("digits inside the prefix", ["2024-0001"], "2024-0002"),
            hiddenCase("a lower-case prefix", ["inv-0009"], "inv-0010"),
            hiddenCase("a number that is only digits", ["0042"], "0043"),
            hiddenCase("no digits at the end", ["INV-12A"], null),
            hiddenCase("an empty text", [""], null),
          ], { label: "next_invoice() increments the trailing counter and keeps its width" }),
        ],
      },
    },
  },
  {
    id: "PY-Q10-20",
    version: 2,
    slug: "meeting-room-free-slots",
    title: "Free time in a meeting room",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 16,
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "list-literal", "list-mutate", "list-sort", "tuple-literal", "tuple-unpack", "string-slice", "conversion", "arithmetic", "comparison", "if-statement", "for-loop", "string-format", "print-call", "unquoted-name", "top-level-indent", "string-index", "list-index", "membership", "precedence"],
    prompt: "A room-booking screen shows when a meeting room is free. Bookings are `(start, end)` pairs of `\"HH:MM\"` times on one day, in any order, and they may overlap. Return the free gaps between `day_start` and `day_end` as `(start, end)` pairs in time order. A gap of zero minutes is not a gap.",
    spec: [
      ["Function", "`free_slots(bookings, day_start=\"09:00\", day_end=\"17:00\")`"],
      ["bookings", "a list of `(\"HH:MM\", \"HH:MM\")` tuples, unsorted, possibly overlapping, all inside the day"],
      ["Returns", "a new list of `(\"HH:MM\", \"HH:MM\")` free gaps in time order; the whole day when there are no bookings"],
      ["Must not", "change `bookings`"],
    ],
    hiddenKinds: ["overlapping bookings", "a booking inside another", "back-to-back bookings", "the day fully booked", "a shorter day given by name"],
    hints: [
      "Work in minutes after midnight: a small helper turns `\"HH:MM\"` into a number and another turns it back.",
      "Sort the bookings by start time (tuples sort by their first item), without touching the caller's list.",
      "Walk them keeping the time up to which the room is known to be busy; a booking that starts later than that leaves a gap, and the busy-until time only ever moves forward.",
    ],
    explanation: "Converting to minutes makes times comparable and lets the gaps be computed with ordinary comparisons. `sorted` puts the bookings in start order without changing the input. Keeping a `busy_until` mark merges overlaps: a booking that starts before the mark adds no gap, and the mark moves to the later of its old value and the booking's end, so a booking inside another can't pull it back. The last gap runs from the mark to the end of the day.",
    code: {
      starter: src`
def free_slots(bookings, day_start="09:00", day_end="17:00"):
    return []

bookings = [("13:00", "14:30"), ("09:30", "10:00"), ("09:45", "11:00")]
print(free_slots(bookings))
`,
      answer: src`
def to_minutes(text):
    """Return minutes after midnight for an HH:MM text."""
    return int(text[:2]) * 60 + int(text[3:])

def to_text(minutes):
    """Return HH:MM for minutes after midnight."""
    return f"{minutes // 60:02d}:{minutes % 60:02d}"

def free_slots(bookings, day_start="09:00", day_end="17:00"):
    """Return the free (start, end) gaps between day_start and day_end."""
    spans = []
    for start, end in bookings:
        spans.append((to_minutes(start), to_minutes(end)))
    gaps = []
    busy_until = to_minutes(day_start)
    for start, end in sorted(spans):
        if start > busy_until:
            gaps.append((to_text(busy_until), to_text(start)))
        if end > busy_until:
            busy_until = end
    if to_minutes(day_end) > busy_until:
        gaps.append((to_text(busy_until), day_end))
    return gaps

bookings = [("13:00", "14:30"), ("09:30", "10:00"), ("09:45", "11:00")]
print(free_slots(bookings))
`,
      alternatives: [
        src`
def free_slots(bookings, day_start="09:00", day_end="17:00"):
    ordered = sorted(bookings)
    gaps = []
    current = day_start
    for start, end in ordered:
        if start > current:
            gaps.append((current, start))
        if end > current:
            current = end
    if day_end > current:
        gaps.append((current, day_end))
    return gaps
`,
      ],
      wrong: [
        {
          code: src`
def free_slots(bookings, day_start="09:00", day_end="17:00"):
    gaps = []
    current = day_start
    for start, end in bookings:
        if start > current:
            gaps.append((current, start))
        if end > current:
            current = end
    if day_end > current:
        gaps.append((current, day_end))
    return gaps
`,
          fails: ["returns"],
          why: "the bookings are used in the order given, so an early booking listed late is never seen as busy time",
        },
        {
          code: src`
def free_slots(bookings, day_start="09:00", day_end="17:00"):
    gaps = []
    current = day_start
    for start, end in sorted(bookings):
        if start > current:
            gaps.append((current, start))
        current = end
    if day_end > current:
        gaps.append((current, day_end))
    return gaps
`,
          fails: ["returns"],
          why: "the busy-until time is replaced by every end, so a booking inside a longer one moves it backwards and invents a gap",
        },
        {
          code: src`
def free_slots(bookings, day_start="09:00", day_end="17:00"):
    bookings.sort()
    gaps = []
    current = day_start
    for start, end in bookings:
        if start > current:
            gaps.append((current, start))
        if end > current:
            current = end
    if day_end > current:
        gaps.append((current, day_end))
    return gaps
`,
          fails: ["keeps-input"],
          why: "the gaps are right, but `sort()` reorders the caller's list of bookings",
        },
      ],
      task: {
        checks: [
          fn("returns", "free_slots", [
            example([[tup("13:00", "14:30"), tup("09:30", "10:00"), tup("09:45", "11:00")]], [tup("09:00", "09:30"), tup("11:00", "13:00"), tup("14:30", "17:00")]),
            example([[]], [tup("09:00", "17:00")]),
            example([[tup("09:00", "17:00")]], []),
            hiddenCase("a booking inside another", [[tup("10:00", "15:00"), tup("11:00", "12:00")]], [tup("09:00", "10:00"), tup("15:00", "17:00")]),
            hiddenCase("back-to-back bookings", [[tup("10:00", "11:00"), tup("11:00", "12:30")]], [tup("09:00", "10:00"), tup("12:30", "17:00")]),
            hiddenCase("bookings that cover the end of the day", [[tup("16:00", "17:00"), tup("09:00", "09:15")]], [tup("09:15", "16:00")]),
            hiddenCase("a shorter day given by name", [[tup("12:00", "13:00")]], [tup("10:00", "12:00"), tup("13:00", "15:00")], { kwargs: { day_start: "10:00", day_end: "15:00" } }),
          ], { label: "free_slots() lists the gaps between merged bookings" }),
          fn("keeps-input", "free_slots", [
            keepsInput([[tup("13:00", "14:30"), tup("09:30", "10:00")]]),
            keepsInput([[tup("15:00", "16:00"), tup("10:00", "11:00")]], { label: "bookings out of order" }),
          ], { label: "free_slots() leaves the bookings list unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q10-22",
    version: 2,
    slug: "end-of-day-balances",
    title: "End-of-day balances and overdrafts",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 18,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "decimal-number", "whole-number", "none-value", "identity", "list-literal", "list-mutate", "list-index", "tuple-literal", "tuple-unpack", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "print-call", "unquoted-name", "top-level-indent", "nested-condition", "len-call", "print-several", "precedence", "string-index", "membership", "truthiness", "range-call"],
    prompt: "A bank statement is a list of `(date, description, amount)` transactions in date order; money in is positive, money out negative. Starting from `opening`, return a tuple of two lists: the balance at the **end** of each date that has transactions, as `(date, balance)`, and the dates that **ended** overdrawn (below 0). A balance that dips below 0 during a day but recovers by the end of it doesn't count.",
    spec: [
      ["Function", "`daily_balances(transactions, opening)`"],
      ["transactions", "a list of `(date, description, amount)` tuples, dates in order, several per date allowed"],
      ["Returns", "`(balances, overdrawn)`: `[(date, end_balance), ...]` and `[date, ...]`"],
      ["Must not", "change `transactions`"],
    ],
    hiddenKinds: ["a dip that recovers the same day", "a day that ends exactly at 0", "several transactions on the last date", "no transactions", "every day overdrawn"],
    hints: [
      "Walk the transactions keeping the running balance and the date you are currently on.",
      "When the date changes, the previous date has finished: record its end balance (and whether it is below 0) before carrying on.",
      "After the loop the last date is still open; record it too.",
    ],
    explanation: "A day's end balance is only known when the next date starts, so the loop keeps the current date and closes it when the date changes, and once more after the loop. Checking for an overdraft at the moment of closing a day, not after every transaction, implements the \"by the end of the day\" rule. Floating-point sums like 513.6 are compared with a tolerance by the checker.",
    code: {
      starter: src`
def daily_balances(transactions, opening):
    return [], []

statement = [
    ("05-01", "salary", 1800),
    ("05-01", "rent", -1200),
    ("05-02", "groceries", -86.4),
    ("05-03", "phone", -45),
    ("05-03", "transfer in", 30),
]
print(daily_balances(statement, -150))
`,
      answer: src`
def daily_balances(transactions, opening):
    balances = []
    overdrawn = []
    balance = opening
    current = None
    for date, description, amount in transactions:
        if current is not None and date != current:
            balances.append((current, balance))
            if balance < 0:
                overdrawn.append(current)
        current = date
        balance = balance + amount
    if current is not None:
        balances.append((current, balance))
        if balance < 0:
            overdrawn.append(current)
    return balances, overdrawn

statement = [
    ("05-01", "salary", 1800),
    ("05-01", "rent", -1200),
    ("05-02", "groceries", -86.4),
    ("05-03", "phone", -45),
    ("05-03", "transfer in", 30),
]
print(daily_balances(statement, -150))
`,
      alternatives: [
        src`
def close_day(date, balance, balances, overdrawn):
    balances.append((date, balance))
    if balance < 0:
        overdrawn.append(date)

def daily_balances(transactions, opening):
    balances = []
    overdrawn = []
    balance = opening
    for i in range(len(transactions)):
        date, description, amount = transactions[i]
        balance += amount
        last_of_day = i == len(transactions) - 1
        if not last_of_day:
            following = transactions[i + 1]
            last_of_day = following[0] != date
        if last_of_day:
            close_day(date, balance, balances, overdrawn)
    return (balances, overdrawn)
`,
      ],
      wrong: [
        {
          code: src`
def daily_balances(transactions, opening):
    balances = []
    overdrawn = []
    balance = opening
    current = None
    for date, description, amount in transactions:
        if current is not None and date != current:
            balances.append((current, balance))
            if balance < 0:
                overdrawn.append(current)
        current = date
        balance = balance + amount
    return balances, overdrawn
`,
          fails: ["returns"],
          why: "the last date is never closed, so it is missing from both lists",
        },
        {
          code: src`
def daily_balances(transactions, opening):
    balances = []
    overdrawn = []
    balance = opening
    current = None
    for date, description, amount in transactions:
        if current is not None and date != current:
            balances.append((current, balance))
        current = date
        balance = balance + amount
        if balance < 0 and date not in overdrawn:
            overdrawn.append(date)
    if current is not None:
        balances.append((current, balance))
    return balances, overdrawn
`,
          fails: ["returns"],
          why: "the overdraft is checked after every transaction, so a dip that recovers the same day is reported",
        },
        {
          code: src`
def daily_balances(transactions, opening):
    balances = []
    overdrawn = []
    balance = opening
    for date, description, amount in transactions:
        balance = balance + amount
        balances.append((date, balance))
        if balance < 0:
            overdrawn.append(date)
    return balances, overdrawn
`,
          fails: ["returns"],
          why: "one entry per transaction instead of one per date, so a date with two transactions appears twice",
        },
      ],
      task: {
        checks: [
          fn("returns", "daily_balances", [
            example([statement, -150], tup([tup("05-01", 450), tup("05-02", 363.6), tup("05-03", 348.6)], [])),
            example([[tup("06-01", "card", -20), tup("06-02", "refund", 5)], 10], tup([tup("06-01", -10), tup("06-02", -5)], ["06-01", "06-02"])),
            example([[], 100], tup([], [])),
            hiddenCase("a dip that recovers the same day", [[tup("d1", "bill", -80), tup("d1", "wage", 100)], 50], tup([tup("d1", 70)], [])),
            hiddenCase("a day that ends exactly at 0", [[tup("d1", "rent", -30), tup("d2", "fee", -1)], 30], tup([tup("d1", 0), tup("d2", -1)], ["d2"])),
            hiddenCase("several transactions on the last date", [[tup("a", "x", 5), tup("b", "y", -20), tup("b", "z", -1), tup("b", "w", 2)], 0], tup([tup("a", 5), tup("b", -14)], ["b"])),
            hiddenCase("an opening overdraft cleared on day one", [[tup("a", "pay", 500)], -100], tup([tup("a", 400)], [])),
          ], { label: "daily_balances() reports each date's closing balance and the overdrawn dates", compare: { float: { abs: 0.000001 }, numbers: "int-float-equal" } }),
          fn("keeps-input", "daily_balances", [keepsInput([statement, -150])], { label: "daily_balances() leaves the statement unchanged" }),
        ],
      },
    },
  },
];
