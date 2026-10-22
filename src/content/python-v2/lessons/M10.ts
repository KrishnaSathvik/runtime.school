/**
 * M10 Fundamentals Integration: five lessons (PY-L10-01 … PY-L10-05).
 *
 * No new syntax. Each lesson solves one realistic job with everything from M01–M09 together: functions with
 * parameters, defaults and return values, decisions, loops, strings and f-strings, lists, tuples, dictionaries and
 * sets. The jobs: price an order from its lines (PY-L10-01), summarise a list of film records (PY-L10-02), analyse a
 * run of daily weather readings with gaps (PY-L10-03), sort support messages into categories (PY-L10-04), and build a
 * small program from several functions that each do one step (PY-L10-05).
 *
 * Fixtures: Runtime Market orders and stock (R01), Runtime Films titles, genres, ratings and votes (R02), NOAA GHCN-style
 * daily readings with missing values (D07), and CFPB-style complaint texts (D03). Challenges are graded by calling
 * the learner's functions with public and hidden inputs. Version 2: rewritten from a module of one-line exercises;
 * saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));
const line = (sku: string, quantity: number, price: number) => ({ sku, quantity, price });
const film = (title: string, genre: string, rating: number, votes: number, minutes: number) => ({ title, genre, rating, votes, minutes });

const films = [
  film("Wild Archive", "drama", 7.8, 1520, 128),
  film("Night Harbor", "thriller", 8.1, 940, 104),
  film("Glass Echo", "drama", 8.4, 85, 97),
  film("Blue Dune", "sci-fi", 7.2, 3100, 151),
  film("Paper Moons", "drama", 8.2, 610, 112),
];

export const m10Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L10-01 order pricing
  {
    id: "PY-L10-01",
    version: 2,
    slug: "order-total",
    title: "Price an order from its lines",
    lede: "An order total is a chain of small rules: line amounts, discounts, a coupon, shipping. One function per rule keeps each rule readable and testable on its own.",
    focus: "Combine small functions, decisions and a loop over order lines into one order total.",
    minutes: 20,
    objectives: [
      "Split a pricing job into one function per rule, each returning a number",
      "Apply rules in the right order: line discounts, then the coupon, then shipping",
      "Reuse the pricing functions to compare several orders",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "dict-iterate", "len-call", "spaces-in-text", "conditional-expr", "nested-dict", "nested-condition", "continue-statement", "enumerate-call", "nested-loop", "range-call"],
    teaches: ["order-total"],
    blocks: [
      {
        kind: "text",
        md: "A checkout page answers one question, *what does this order cost?*, but the answer depends on several rules applied in order. Written as one long block, those rules tangle together; written as small functions, each one can be read, tested and changed alone.\n\nThis lesson adds nothing new to the language. It uses lists of dictionaries (see Dictionaries & Sets), functions with defaults and return values (see Functions) and f-strings (see Strings & Text) together, in the order a real checkout applies them.",
      },
      {
        kind: "example",
        title: "One order, three small functions",
        code: src`
def line_amount(line):
    """Return quantity times price for one order line."""
    return line["quantity"] * line["price"]

def shipping(subtotal, free_from=50):
    """Return the shipping fee for a subtotal."""
    if subtotal >= free_from:
        return 0
    return 5.99

def order_total(lines):
    """Return the subtotal of all lines plus shipping."""
    subtotal = 0
    for line in lines:
        subtotal = subtotal + line_amount(line)
    return subtotal + shipping(subtotal)

lines = [
    {"sku": "HOM-22847", "quantity": 2, "price": 15.5},
    {"sku": "SPO-11681", "quantity": 1, "price": 7.49},
]
for line in lines:
    print(f"{line['sku']}  {line_amount(line):>6.2f}")
print(f"total     {order_total(lines):>6.2f}")
`,
        output: "HOM-22847   31.00\nSPO-11681    7.49\ntotal      44.48\n",
        note: "`order_total` doesn't know how a line is priced or when shipping is free; it calls the functions that do. The subtotal is 38.49, below 50, so 5.99 shipping is added.",
      },
      {
        kind: "text",
        md: "Once orders are priced by a function, questions about **many** orders are just loops that call it. Here the same `order_total` ranks a day's orders and flags the ones that will need a signature on delivery. The order ID and the lines live together in a dictionary, the shape an online shop's API would send.",
      },
      {
        kind: "example",
        title: "A day's orders, priced and ranked",
        code: src`
def line_amount(line):
    return line["quantity"] * line["price"]

def order_total(lines, free_from=50):
    subtotal = 0
    for line in lines:
        subtotal = subtotal + line_amount(line)
    if subtotal >= free_from:
        return subtotal
    return subtotal + 5.99

orders = [
    {"order_id": "O100043", "lines": [{"quantity": 1, "price": 6.49}]},
    {"order_id": "O104839", "lines": [{"quantity": 1, "price": 51.49}, {"quantity": 2, "price": 15.99}]},
    {"order_id": "O101217", "lines": [{"quantity": 3, "price": 12.0}]},
]
biggest = None
for order in orders:
    total = order_total(order["lines"])
    flag = "  signature" if total >= 80 else ""
    print(f"{order['order_id']} {total:>7.2f}{flag}")
    if biggest is None or total > biggest[1]:
        biggest = (order["order_id"], total)
print("largest:", biggest[0])
`,
        output: "O100043   12.48\nO104839   83.47  signature\nO101217   41.99\nlargest: O104839\n",
        note: "`biggest` holds a tuple of the best order so far and its total, starting at None so the first order always wins the first comparison.",
      },
      {
        kind: "text",
        md: "**When to use it:** any calculation with several rules. Give each rule a function with a name that says what it decides, pass in what it needs, and return a number. **Mistakes to avoid:**\n\n- Applying rules in the wrong order: a coupon usually comes off before the free-shipping check, not after.\n- Printing inside the pricing functions, which makes them useless for comparisons and totals.\n- Repeating a rule's arithmetic in two places instead of calling its function.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Free shipping from 40",
      prompt: "The shop is lowering its free-shipping limit to 40. Change the **default** in `shipping` so every caller gets the new limit, and run it: the order should now ship free.",
      spec: [
        ["Function", "`shipping(subtotal, free_from=...)`"],
        ["Returns", "0 when the subtotal is at least the limit, otherwise 5.99"],
      ],
      starter: src`
def shipping(subtotal, free_from=50):
    if subtotal >= free_from:
        return 0
    return 5.99

print(shipping(44.48))
`,
      answer: src`
def shipping(subtotal, free_from=40):
    if subtotal >= free_from:
        return 0
    return 5.99

print(shipping(44.48))
`,
      wrong: [
        {
          code: src`
def shipping(subtotal, free_from=50):
    if subtotal >= 40:
        return 0
    return 5.99

print(shipping(44.48))
`,
          fails: ["returns"],
          why: "the limit is typed into the test, so a caller who passes `free_from` is ignored",
        },
      ],
      hints: ["Only the def line needs to change.", "The default is the value after `free_from=`.", "Callers that pass their own limit still override it."],
      task: {
        checks: [
          fn("returns", "shipping", [
            example([44.48], 0),
            example([39.99], 5.99),
            hiddenCase("a caller's own limit", [60], 5.99, { kwargs: { free_from: 75 } }),
          ], { label: "shipping() is free from 40 unless the caller says otherwise" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Bulk discounts and a coupon",
        prompt: "Write `order_total(lines, coupon=None)`. Each line is `{\"sku\", \"quantity\", \"price\"}`. Rules, in this order: a line of **10 or more** units gets 5% off that line; the coupon `\"SAVE10\"` takes 10% off the whole subtotal, but only if the subtotal (after bulk discounts) is at least 30; shipping is 5.99 unless the amount after the coupon is at least 50. Return the final amount.",
        spec: [
          ["Function", "`order_total(lines, coupon=None)`"],
          ["Bulk", "quantity ≥ 10: that line costs 95%"],
          ["Coupon", "`\"SAVE10\"` and subtotal ≥ 30: 10% off; any other coupon does nothing"],
          ["Shipping", "5.99 unless the amount after the coupon is ≥ 50"],
          ["Example", "lines of 12 × 2.50 and 1 × 20.00 with `\"SAVE10\"` → `49.64`: 28.50 + 20.00 = 48.50, the coupon makes it 43.65, and 5.99 shipping is added"],
        ],
        starter: src`
def order_total(lines, coupon=None):
    return 0

lines = [{"sku": "SPO-11681", "quantity": 12, "price": 2.5}, {"sku": "HOM-22847", "quantity": 1, "price": 20.0}]
print(f"{order_total(lines, 'SAVE10'):.2f}")
`,
        answer: src`
def line_amount(line):
    """Return the line's price, with 5% off for 10 or more units."""
    amount = line["quantity"] * line["price"]
    if line["quantity"] >= 10:
        amount = amount * 0.95
    return amount

def order_total(lines, coupon=None):
    """Return the amount due: bulk discounts, then the coupon, then shipping."""
    subtotal = 0
    for line in lines:
        subtotal = subtotal + line_amount(line)
    if coupon == "SAVE10" and subtotal >= 30:
        subtotal = subtotal * 0.9
    if subtotal < 50:
        subtotal = subtotal + 5.99
    return subtotal

lines = [{"sku": "SPO-11681", "quantity": 12, "price": 2.5}, {"sku": "HOM-22847", "quantity": 1, "price": 20.0}]
print(f"{order_total(lines, 'SAVE10'):.2f}")
`,
        alternatives: [
          src`
def order_total(lines, coupon=None):
    subtotal = 0
    for line in lines:
        rate = 0.95 if line["quantity"] >= 10 else 1
        subtotal += line["quantity"] * line["price"] * rate
    discount = 0
    if coupon == "SAVE10":
        if subtotal >= 30:
            discount = subtotal * 0.1
    after = subtotal - discount
    fee = 0 if after >= 50 else 5.99
    return after + fee
`,
        ],
        wrong: [
          {
            code: src`
def order_total(lines, coupon=None):
    subtotal = 0
    for line in lines:
        amount = line["quantity"] * line["price"]
        if line["quantity"] >= 10:
            amount = amount * 0.95
        subtotal = subtotal + amount
    if subtotal < 50:
        subtotal = subtotal + 5.99
    if coupon == "SAVE10" and subtotal >= 30:
        subtotal = subtotal * 0.9
    return subtotal
`,
            fails: ["returns"],
            why: "shipping is decided before the coupon, and then the coupon takes 10% off the shipping too",
          },
          {
            code: src`
def order_total(lines, coupon=None):
    subtotal = 0
    for line in lines:
        amount = line["quantity"] * line["price"]
        if line["quantity"] > 10:
            amount = amount * 0.95
        subtotal = subtotal + amount
    if coupon == "SAVE10" and subtotal >= 30:
        subtotal = subtotal * 0.9
    if subtotal < 50:
        subtotal = subtotal + 5.99
    return subtotal
`,
            fails: ["returns"],
            why: "`> 10` gives no bulk discount to a line of exactly 10 units",
          },
          {
            code: src`
def order_total(lines, coupon=None):
    subtotal = 0
    for line in lines:
        amount = line["quantity"] * line["price"]
        if line["quantity"] >= 10:
            amount = amount * 0.95
        subtotal = subtotal + amount
    if coupon == "SAVE10":
        subtotal = subtotal * 0.9
    if subtotal < 50:
        subtotal = subtotal + 5.99
    return subtotal
`,
            fails: ["returns"],
            why: "the coupon ignores its 30 minimum",
          },
        ],
        hints: [
          "Write one helper that prices a line, bulk rule included, and add up the lines with it.",
          "The coupon needs two things to be true at once: the right code and a large enough subtotal.",
          "Decide shipping last, on the amount after the coupon.",
        ],
        task: {
          checks: [
            fn("returns", "order_total", [
              example([[line("SPO-11681", 12, 2.5), line("HOM-22847", 1, 20)], "SAVE10"], 49.64),
              example([[line("ELE-24781", 1, 171.99)]], 171.99),
              example([[]], 5.99),
              hiddenCase("a line of exactly 10 units", [[line("A", 10, 6)]], py.float(57)),
              hiddenCase("a coupon on a small order", [[line("B", 1, 25)], "SAVE10"], 30.99),
              hiddenCase("a coupon that takes the order below free shipping", [[line("C", 1, 54)], "SAVE10"], 54.59),
              hiddenCase("an unknown coupon", [[line("D", 2, 40)], "FREE"], py.float(80)),
            ], { label: "order_total() applies bulk discounts, the coupon, then shipping", compare: { float: { abs: 0.000001 }, numbers: "int-float-equal" } }),
          ],
        },
      },
      {
        id: "c2",
        title: "The cheapest complete basket",
        prompt: "A price-comparison page has several candidate baskets, each a list of `(product_id, quantity)`. Write `cheapest_basket(baskets, prices)`: return the **position** of the cheapest basket whose products all have a price in `prices`. A basket with an unknown product can't be bought and is skipped. On a tie the earlier basket wins. Return `None` if no basket can be bought.",
        spec: [
          ["Function", "`cheapest_basket(baskets, prices)`"],
          ["baskets", "a list of baskets; each basket is a list of `(product_id, quantity)` tuples"],
          ["prices", "a dictionary from product ID to price"],
          ["Returns", "the index of the cheapest buyable basket, or `None`"],
          ["Example", "`[[(\"P1\", 2)], [(\"P2\", 1)], [(\"P9\", 1)]]` with `{\"P1\": 3.0, \"P2\": 5.5}` → `1`: the baskets cost 6.00 and 5.50, and the third has no price for P9"],
        ],
        starter: src`
def cheapest_basket(baskets, prices):
    return None

prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
baskets = [[("P0208", 1)], [("P0607", 2), ("P0659", 1)], [("P0607", 1), ("P0999", 1)]]
print(cheapest_basket(baskets, prices))
`,
        answer: src`
def basket_cost(basket, prices):
    """Return the basket's cost, or None if a product has no price."""
    cost = 0
    for product_id, quantity in basket:
        if product_id not in prices:
            return None
        cost = cost + quantity * prices[product_id]
    return cost

def cheapest_basket(baskets, prices):
    """Return the index of the cheapest buyable basket, or None."""
    best = None
    best_cost = 0
    for i, basket in enumerate(baskets):
        cost = basket_cost(basket, prices)
        if cost is None:
            continue
        if best is None or cost < best_cost:
            best = i
            best_cost = cost
    return best

prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
baskets = [[("P0208", 1)], [("P0607", 2), ("P0659", 1)], [("P0607", 1), ("P0999", 1)]]
print(cheapest_basket(baskets, prices))
`,
        alternatives: [
          src`
def cheapest_basket(baskets, prices):
    best = None
    lowest = None
    for i in range(len(baskets)):
        total = 0
        ok = True
        for product_id, quantity in baskets[i]:
            if product_id in prices:
                total += quantity * prices[product_id]
            else:
                ok = False
        if ok and (lowest is None or total < lowest):
            best = i
            lowest = total
    return best
`,
        ],
        wrong: [
          {
            code: src`
def cheapest_basket(baskets, prices):
    best = None
    best_cost = 0
    for i, basket in enumerate(baskets):
        cost = 0
        for product_id, quantity in basket:
            if product_id in prices:
                cost = cost + quantity * prices[product_id]
        if best is None or cost < best_cost:
            best = i
            best_cost = cost
    return best
`,
            fails: ["returns"],
            why: "unknown products are skipped instead of ruling the basket out, so a basket with a missing price looks cheap",
          },
          {
            code: src`
def cheapest_basket(baskets, prices):
    best = None
    best_cost = 0
    for i, basket in enumerate(baskets):
        cost = 0
        ok = True
        for product_id, quantity in basket:
            if product_id in prices:
                cost = cost + quantity * prices[product_id]
            else:
                ok = False
        if ok and (best is None or cost <= best_cost):
            best = i
            best_cost = cost
    return best
`,
            fails: ["returns"],
            why: "`<=` lets a later basket with the same cost win the tie",
          },
          {
            code: src`
def cheapest_basket(baskets, prices):
    best = None
    best_cost = 0
    for i, basket in enumerate(baskets):
        cost = 0
        ok = True
        for product_id, quantity in basket:
            if product_id in prices:
                cost = cost + prices[product_id]
            else:
                ok = False
        if ok and (best is None or cost < best_cost):
            best = i
            best_cost = cost
    return best
`,
            fails: ["returns"],
            why: "quantities are ignored, so two of an item cost the same as one",
          },
        ],
        hints: [
          "A helper that prices one basket, returning None when a product is unknown, keeps the main loop simple.",
          "Walk the baskets with their positions; skip any basket the helper can't price.",
          "Keep the best position and its cost, and replace them only on a strictly lower cost.",
        ],
        task: {
          checks: [
            fn("returns", "cheapest_basket", [
              example([[[tup("P0208", 1)], [tup("P0607", 2), tup("P0659", 1)], [tup("P0607", 1), tup("P0999", 1)]], { P0607: 6.49, P0208: 66.49, P0659: 51.49 }], 1),
              example([[[tup("P1", 2)], [tup("P2", 1)], [tup("P9", 1)]], { P1: 3.0, P2: 5.5 }], 1),
              example([[[tup("X", 1)]], { P1: 3.0 }], null),
              hiddenCase("a cheap basket with an unknown product", [[[tup("A", 1), tup("Z", 1)], [tup("A", 3)]], { A: 2 }], 1),
              hiddenCase("two baskets with the same cost", [[[tup("A", 2)], [tup("B", 1)]], { A: 5, B: 10 }], 0),
              hiddenCase("quantities that change the order", [[[tup("A", 4)], [tup("B", 1)]], { A: 3, B: 10 }], 1),
              hiddenCase("no baskets", [[], { A: 1 }], null),
            ], { label: "cheapest_basket() finds the cheapest basket that can be bought" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def amount(quantity, price):
    return quantity * price

def total(lines, fee=4):
    subtotal = 0
    for quantity, price in lines:
        subtotal = subtotal + amount(quantity, price)
    if subtotal >= 20:
        fee = 0
    return subtotal + fee

print(total([(2, 5), (1, 4)]), total([(3, 7)]), total([], 1))
`,
        choices: ["18 21 1", "14 21 1", "18 25 1", "18 21 4"],
        answer: 0,
        why: "2×5 + 1×4 is 14, below 20, so the default fee 4 is added: 18. 21 is at least 20, so the fee is set to 0. An empty list totals 0 and uses the passed fee 1.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the coupon is applied after shipping. What does this print?",
        program: src`
subtotal = 60
shipping = 0 if subtotal >= 50 else 5.99
total = (subtotal + shipping) * 0.8
print(f"{total:.2f}")
subtotal = 40
shipping = 0 if subtotal >= 50 else 5.99
total = (subtotal + shipping) * 0.8
print(f"{total:.2f}")
`,
        choices: ["48.00\n36.79", "48.00\n37.99", "53.99\n37.99", "48.00\n32.00"],
        answer: 0,
        why: "The 20% coupon comes off the shipping too: (40 + 5.99) × 0.8 is 36.79. Taking the coupon off the subtotal first, then deciding shipping, gives the shop's real rule.",
      },
      {
        id: "q3",
        prompt: "Why give each pricing rule its own function?",
        choices: ["Each rule can be tested and changed alone, and every caller uses the same rule", "Functions run faster than lines at the top level", "Python requires every calculation to be inside a function", "It removes the need for if statements"],
        answer: 0,
        why: "Small functions isolate decisions: change the shipping rule once and every order follows. Speed and syntax have nothing to do with it.",
      },
    ],
    review: [
      "Price an order with one function per rule: line amount, discounts, coupon, shipping.",
      "Apply the rules in the order the business applies them, and return numbers rather than printing them.",
      "Questions about many orders are loops that call the same functions.",
      "Next: summarise a list of records, the films in Runtime Films' catalogue.",
    ],
  },

  // ------------------------------------------------------------------ PY-L10-02 summarise records
  {
    id: "PY-L10-02",
    version: 2,
    slug: "movie-summary",
    title: "Summarise a list of records",
    lede: "Most reports reduce a list of records to a few numbers and names: how many, the average, the best. One function that walks the list and returns those values can serve every report.",
    focus: "Walk a list of dictionaries once and return a summary: count, average and best record, with the empty case handled.",
    minutes: 20,
    objectives: [
      "Collect a count, a total and a best record in one pass over a list of dictionaries",
      "Return several results as a tuple, and None for an empty list",
      "Filter by a parameter (a genre, a minimum) inside the same pass",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "list-sort", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "len-call", "spaces-in-text", "continue-statement", "string-method", "precedence", "nested-loop", "set-literal", "set-op"],
    teaches: ["movie-summary"],
    blocks: [
      {
        kind: "text",
        md: "Runtime Films keeps one dictionary per film: title, genre, rating, number of votes, running time. A catalogue page needs a summary line: how many films, their average rating, the best one. That is a single walk over the list, carrying three things: a count, a running total, and the best record so far.\n\nThe edge case comes first: with no films there is no average and no best, so the function returns `None` and the caller decides what to show.",
      },
      {
        kind: "example",
        title: "A catalogue summary",
        code: src`
def summarise(films):
    """Return (count, average rating, best title), or None for no films."""
    if len(films) == 0:
        return None
    total = 0
    best = films[0]
    for film in films:
        total = total + film["rating"]
        if film["rating"] > best["rating"]:
            best = film
    return len(films), total / len(films), best["title"]

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1},
    {"title": "Blue Dune", "genre": "sci-fi", "rating": 7.2},
]
count, average, best = summarise(films)
print(f"{count} films, average {average:.2f}, best: {best}")
print(summarise([]))
`,
        output: "3 films, average 7.70, best: Night Harbor\nNone\n",
        note: "`best` holds the whole dictionary, so any field of the winner can be returned. Starting it at `films[0]` is safe only because the empty list was handled first.",
      },
      {
        kind: "text",
        md: "A parameter can narrow the summary without a second function: pass a genre, and skip the films of other genres in the same loop. Reports usually also need a **threshold**: a film with 85 votes and a rating of 8.4 shouldn't top a chart over films with thousands of votes. A default makes the usual threshold automatic.",
      },
      {
        kind: "example",
        title: "Best film per genre, with enough votes",
        code: src`
def best_in_genre(films, genre, min_votes=100):
    best = None
    for film in films:
        if film["genre"] != genre or film["votes"] < min_votes:
            continue
        if best is None or film["rating"] > best["rating"]:
            best = film
    if best is None:
        return f"{genre}: no film qualifies"
    return f"{genre}: {best['title']} ({best['rating']}, {best['votes']} votes)"

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8, "votes": 1520},
    {"title": "Glass Echo", "genre": "drama", "rating": 8.4, "votes": 85},
    {"title": "Paper Moons", "genre": "drama", "rating": 8.2, "votes": 610},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1, "votes": 940},
]
print(best_in_genre(films, "drama"))
print(best_in_genre(films, "drama", min_votes=50))
print(best_in_genre(films, "comedy"))
`,
        output: "drama: Paper Moons (8.2, 610 votes)\ndrama: Glass Echo (8.4, 85 votes)\ncomedy: no film qualifies\n",
        note: "One `continue` skips everything that doesn't qualify, so the rest of the loop body only sees candidates. Lowering `min_votes` lets Glass Echo in.",
      },
      {
        kind: "text",
        md: "**When to use it:** any *how many / what average / which is best* report over a list of records. **Mistakes to avoid:**\n\n- Starting the best at `0` or at an empty dictionary: start at None, or at the first record after checking the list isn't empty.\n- Dividing by `len(films)` after filtering: divide by the number of records you actually counted.\n- Using `>=` when the earlier record should win a tie.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Longest film instead of best",
      prompt: "`longest` should return the title of the film with the most `minutes`, but it compares ratings. Change the comparison so it looks at running time.",
      spec: [
        ["Function", "`longest(films)`"],
        ["Returns", "the title of the longest film (the earlier one on a tie)"],
      ],
      starter: src`
def longest(films):
    best = films[0]
    for film in films:
        if film["rating"] > best["rating"]:
            best = film
    return best["title"]

films = [
    {"title": "Wild Archive", "rating": 7.8, "minutes": 128},
    {"title": "Night Harbor", "rating": 8.1, "minutes": 104},
    {"title": "Blue Dune", "rating": 7.2, "minutes": 151},
]
print(longest(films))
`,
      answer: src`
def longest(films):
    best = films[0]
    for film in films:
        if film["minutes"] > best["minutes"]:
            best = film
    return best["title"]

films = [
    {"title": "Wild Archive", "rating": 7.8, "minutes": 128},
    {"title": "Night Harbor", "rating": 8.1, "minutes": 104},
    {"title": "Blue Dune", "rating": 7.2, "minutes": 151},
]
print(longest(films))
`,
      wrong: [
        {
          code: src`
def longest(films):
    best = films[0]
    for film in films:
        if film["minutes"] < best["minutes"]:
            best = film
    return best["title"]
`,
          fails: ["returns"],
          why: "`<` keeps the shortest film",
        },
      ],
      hints: ["Only the comparison line changes.", "Both sides must read the same field.", "The longest film has the largest number of minutes."],
      task: {
        checks: [
          fn("returns", "longest", [
            example([films], "Blue Dune"),
            hiddenCase("the longest film first", [[film("A", "x", 5, 1, 200), film("B", "x", 9, 1, 90)]], "A"),
            hiddenCase("two films of equal length", [[film("C", "x", 5, 1, 95), film("D", "x", 9, 1, 95)]], "C"),
          ], { label: "longest() picks the film with the most minutes" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A watch-time report",
        prompt: "Write `watch_time(films, max_minutes)`: someone has an evening of `max_minutes` and wants to know what fits. Return a tuple `(count, hours, longest_title)`: how many films are at most `max_minutes` long, their total running time in hours (minutes ÷ 60, a float), and the title of the longest film among them (the earlier one on a tie). If no film fits, return `(0, 0.0, None)`.",
        spec: [
          ["Function", "`watch_time(films, max_minutes)`"],
          ["films", "a list of dictionaries with `title`, `genre`, `rating`, `votes` and `minutes`"],
          ["Returns", "`(count, hours, longest_title)` for films of at most `max_minutes`; `(0, 0.0, None)` if none fit"],
          ["Example", "the starter's films with 120 → `(3, 5.216666666666667, 'Paper Moons')`"],
        ],
        starter: src`
def watch_time(films, max_minutes):
    return (0, 0.0, None)

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8, "votes": 1520, "minutes": 128},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1, "votes": 940, "minutes": 104},
    {"title": "Glass Echo", "genre": "drama", "rating": 8.4, "votes": 85, "minutes": 97},
    {"title": "Blue Dune", "genre": "sci-fi", "rating": 7.2, "votes": 3100, "minutes": 151},
    {"title": "Paper Moons", "genre": "drama", "rating": 8.2, "votes": 610, "minutes": 112},
]
print(watch_time(films, 120))
`,
        answer: src`
def watch_time(films, max_minutes):
    """Return (count, hours, longest title) for films that fit in max_minutes."""
    count = 0
    minutes = 0
    longest = None
    for film in films:
        if film["minutes"] > max_minutes:
            continue
        count = count + 1
        minutes = minutes + film["minutes"]
        if longest is None or film["minutes"] > longest["minutes"]:
            longest = film
    if longest is None:
        return (0, 0.0, None)
    return (count, minutes / 60, longest["title"])

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8, "votes": 1520, "minutes": 128},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1, "votes": 940, "minutes": 104},
    {"title": "Glass Echo", "genre": "drama", "rating": 8.4, "votes": 85, "minutes": 97},
    {"title": "Blue Dune", "genre": "sci-fi", "rating": 7.2, "votes": 3100, "minutes": 151},
    {"title": "Paper Moons", "genre": "drama", "rating": 8.2, "votes": 610, "minutes": 112},
]
print(watch_time(films, 120))
`,
        alternatives: [
          src`
def watch_time(films, max_minutes):
    fitting = []
    for film in films:
        if film["minutes"] <= max_minutes:
            fitting.append(film)
    if len(fitting) == 0:
        return (0, 0.0, None)
    total = 0
    best = fitting[0]
    for film in fitting:
        total += film["minutes"]
        if film["minutes"] > best["minutes"]:
            best = film
    return len(fitting), total / 60, best["title"]
`,
        ],
        wrong: [
          {
            code: src`
def watch_time(films, max_minutes):
    count = 0
    minutes = 0
    longest = None
    for film in films:
        if film["minutes"] >= max_minutes:
            continue
        count = count + 1
        minutes = minutes + film["minutes"]
        if longest is None or film["minutes"] > longest["minutes"]:
            longest = film
    if longest is None:
        return (0, 0.0, None)
    return (count, minutes / 60, longest["title"])
`,
            fails: ["returns"],
            why: "a film of exactly `max_minutes` is left out, although it fits",
          },
          {
            code: src`
def watch_time(films, max_minutes):
    count = 0
    minutes = 0
    longest = None
    for film in films:
        if film["minutes"] > max_minutes:
            continue
        count = count + 1
        minutes = minutes + film["minutes"]
        if longest is None or film["minutes"] > longest["minutes"]:
            longest = film
    if longest is None:
        return (0, 0.0, None)
    return (count, minutes // 60, longest["title"])
`,
            fails: ["returns"],
            why: "`//` gives whole hours, so 313 minutes shows as 5 hours",
          },
          {
            code: src`
def watch_time(films, max_minutes):
    count = 0
    minutes = 0
    longest = films[0]
    for film in films:
        if film["minutes"] > max_minutes:
            continue
        count = count + 1
        minutes = minutes + film["minutes"]
        if film["minutes"] > longest["minutes"]:
            longest = film
    return (count, minutes / 60, longest["title"])
`,
            fails: ["returns"],
            why: "starting the longest at the first film lets a film that doesn't fit win, and an empty list crashes",
          },
        ],
        hints: [
          "Skip films that are too long first; everything after that only sees films that fit.",
          "Carry three things through the loop: a count, a total of minutes, and the longest fitting film (starting at None).",
          "Convert to hours with `/ 60` at the end, and return the fallback tuple when nothing fit.",
        ],
        task: {
          checks: [
            fn("returns", "watch_time", [
              example([films, 120], tup(3, 313 / 60, "Paper Moons")),
              example([films, 100], tup(1, 97 / 60, "Glass Echo")),
              example([films, 60], tup(0, py.float(0), null)),
              hiddenCase("a film exactly at the limit", [films, 104], tup(2, 201 / 60, "Night Harbor")),
              hiddenCase("every film fits", [films, 200], tup(5, 592 / 60, "Blue Dune")),
              hiddenCase("two fitting films of equal length", [[film("A", "x", 7, 1, 90), film("B", "x", 8, 1, 90)], 90], tup(2, py.float(3), "A")),
              hiddenCase("no films at all", [[], 120], tup(0, py.float(0), null)),
            ], { label: "watch_time() counts, totals and finds the longest film that fits" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Genre lines for a catalogue page",
        prompt: "Write `genre_lines(films, min_votes=100)`: return a list of texts, one per genre in alphabetical order, each `\"<genre>: <n> films, avg <a>\"` with the average rating of that genre's films to one decimal. Only films with at least `min_votes` votes count; a genre whose films all fall below the threshold is left out.",
        spec: [
          ["Function", "`genre_lines(films, min_votes=100)`"],
          ["Returns", "a list of texts like `\"drama: 2 films, avg 8.0\"`, genres sorted alphabetically"],
          ["Counts", "only films with `votes >= min_votes`"],
          ["Example", "the starter's films → `['drama: 2 films, avg 8.0', 'sci-fi: 1 films, avg 7.2', 'thriller: 1 films, avg 8.1']`"],
        ],
        starter: src`
def genre_lines(films, min_votes=100):
    return []

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8, "votes": 1520, "minutes": 128},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1, "votes": 940, "minutes": 104},
    {"title": "Glass Echo", "genre": "drama", "rating": 8.4, "votes": 85, "minutes": 97},
    {"title": "Blue Dune", "genre": "sci-fi", "rating": 7.2, "votes": 3100, "minutes": 151},
    {"title": "Paper Moons", "genre": "drama", "rating": 8.2, "votes": 610, "minutes": 112},
]
for text in genre_lines(films):
    print(text)
`,
        answer: src`
def genre_lines(films, min_votes=100):
    """Return one summary text per genre, alphabetically, counting films with enough votes."""
    genres = []
    for film in films:
        if film["votes"] >= min_votes and film["genre"] not in genres:
            genres.append(film["genre"])
    lines = []
    for genre in sorted(genres):
        count = 0
        total = 0
        for film in films:
            if film["genre"] == genre and film["votes"] >= min_votes:
                count = count + 1
                total = total + film["rating"]
        lines.append(f"{genre}: {count} films, avg {total / count:.1f}")
    return lines

films = [
    {"title": "Wild Archive", "genre": "drama", "rating": 7.8, "votes": 1520, "minutes": 128},
    {"title": "Night Harbor", "genre": "thriller", "rating": 8.1, "votes": 940, "minutes": 104},
    {"title": "Glass Echo", "genre": "drama", "rating": 8.4, "votes": 85, "minutes": 97},
    {"title": "Blue Dune", "genre": "sci-fi", "rating": 7.2, "votes": 3100, "minutes": 151},
    {"title": "Paper Moons", "genre": "drama", "rating": 8.2, "votes": 610, "minutes": 112},
]
for text in genre_lines(films):
    print(text)
`,
        alternatives: [
          src`
def genre_summary(films, genre, min_votes):
    count = 0
    total = 0
    for film in films:
        if film["genre"] == genre and film["votes"] >= min_votes:
            count += 1
            total += film["rating"]
    return count, total

def genre_lines(films, min_votes=100):
    names = set()
    for film in films:
        if film["votes"] >= min_votes:
            names = names.union({film["genre"]})
    result = []
    for genre in sorted(names):
        count, total = genre_summary(films, genre, min_votes)
        result.append(f"{genre}: {count} films, avg {total / count:.1f}")
    return result
`,
        ],
        wrong: [
          {
            code: src`
def genre_lines(films, min_votes=100):
    genres = []
    for film in films:
        if film["genre"] not in genres:
            genres.append(film["genre"])
    lines = []
    for genre in sorted(genres):
        count = 0
        total = 0
        for film in films:
            if film["genre"] == genre:
                count = count + 1
                total = total + film["rating"]
        lines.append(f"{genre}: {count} films, avg {total / count:.1f}")
    return lines
`,
            fails: ["returns"],
            why: "the vote threshold is ignored, so Glass Echo's 85 votes count",
          },
          {
            code: src`
def genre_lines(films, min_votes=100):
    genres = []
    for film in films:
        if film["votes"] >= min_votes and film["genre"] not in genres:
            genres.append(film["genre"])
    lines = []
    for genre in genres:
        count = 0
        total = 0
        for film in films:
            if film["genre"] == genre and film["votes"] >= min_votes:
                count = count + 1
                total = total + film["rating"]
        lines.append(f"{genre}: {count} films, avg {total / count:.1f}")
    return lines
`,
            fails: ["returns"],
            why: "the genres stay in first-seen order instead of alphabetical order",
          },
        ],
        hints: [
          "First collect the genres that have at least one qualifying film, each once.",
          "Sort those genres, then for each one count and total the qualifying films of that genre.",
          "Format the average with `:.1f` in the f-string and append the text to the result list.",
        ],
        task: {
          checks: [
            fn("returns", "genre_lines", [
              example([films], ["drama: 2 films, avg 8.0", "sci-fi: 1 films, avg 7.2", "thriller: 1 films, avg 8.1"]),
              example([films, 1000], ["drama: 1 films, avg 7.8", "sci-fi: 1 films, avg 7.2"]),
              example([[]], []),
              hiddenCase("a lower threshold given by name", [films], ["drama: 3 films, avg 8.1", "sci-fi: 1 films, avg 7.2", "thriller: 1 films, avg 8.1"], { kwargs: { min_votes: 50 } }),
              hiddenCase("a genre where no film has enough votes", [[film("A", "horror", 6, 10, 90), film("B", "comedy", 7, 500, 90)]], ["comedy: 1 films, avg 7.0"]),
              hiddenCase("genres that arrive out of alphabetical order", [[film("A", "war", 6, 200, 90), film("B", "action", 8, 300, 90), film("C", "war", 7, 400, 90)]], ["action: 1 films, avg 8.0", "war: 2 films, avg 6.5"]),
            ], { label: "genre_lines() summarises each genre's qualifying films" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def stats(ratings):
    if len(ratings) == 0:
        return None
    best = ratings[0]
    total = 0
    for r in ratings:
        total = total + r
        if r > best:
            best = r
    return total / len(ratings), best

print(stats([7, 9, 8]))
print(stats([]))
`,
        choices: ["(8.0, 9)\nNone", "(8, 9)\nNone", "8.0 9\nNone", "(8.0, 9)\n(0, 0)"],
        answer: 0,
        why: "`/` always gives a float, so the average is 8.0, and two returned values print as a tuple. The empty list returns None before any division.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the best starts at 0. What does this print?",
        program: src`
def coldest(temps):
    best = 0
    for t in temps:
        if t < best:
            best = t
    return best

print(coldest([12, 4, 7]), coldest([3, -2, 5]))
`,
        choices: ["0 -2", "4 -2", "0 0", "12 5"],
        answer: 0,
        why: "No reading in the first list is below 0, so the made-up starting value 0 is returned even though it isn't a reading. Start from the first reading (after checking the list isn't empty) or from None.",
      },
      {
        id: "q3",
        prompt: "A summary function is given an empty list of films. What should it do?",
        choices: ["Return a value such as None that the caller can test", "Divide by len(films) and let it crash", "Return a made-up average of 0", "Print an error and return the first film"],
        answer: 0,
        why: "There is no average or best of nothing. Returning None (or an agreed fallback) lets each caller choose what to show.",
      },
    ],
    review: [
      "A summary is one pass that carries a count, a running total and the best record so far.",
      "Handle the empty list first; return None or an agreed fallback.",
      "Filter by parameters inside the same loop, and divide by the number of records actually counted.",
      "Next: a run of daily weather readings, where some days are missing.",
    ],
  },

  // ------------------------------------------------------------------ PY-L10-03 readings
  {
    id: "PY-L10-03",
    version: 2,
    slug: "weather-report",
    title: "Analyse a run of readings",
    lede: "Measurements come in order, with gaps. Analysing them means skipping missing values honestly, comparing each reading with its neighbour, and looking at windows of days.",
    focus: "Process an ordered list of readings: skip and count missing values, compare neighbours by position, and compute over windows.",
    minutes: 20,
    objectives: [
      "Skip `None` readings with `is None` and report how many were missing",
      "Compare each reading with the one before it using positions",
      "Compute a value over a window of consecutive readings with a slice",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "range-call", "len-call", "membership", "string-format", "string-index", "string-slice", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "continue-statement", "nested-loop", "spaces-in-text", "truthiness", "conditional-expr", "while-loop", "list-copy"],
    teaches: ["weather-report"],
    blocks: [
      {
        kind: "text",
        md: "NOAA's daily records come from real stations, and real stations miss days. In the data those days are empty, which in Python becomes `None`. An honest summary skips the gaps **and says how many there were**: an average of 20 readings out of 31 days is not the same claim as an average of 31.\n\n`None` can't be compared with a number (`None > 5` is a TypeError), so test `is None` before doing anything else with a reading.",
      },
      {
        kind: "example",
        title: "A month's highs, with gaps",
        code: src`
def summary(highs):
    """Return (days with data, missing days, average high) for daily highs that may be None."""
    total = 0
    count = 0
    missing = 0
    for high in highs:
        if high is None:
            missing = missing + 1
            continue
        total = total + high
        count = count + 1
    average = total / count if count > 0 else None
    return count, missing, average

highs = [31.1, 33.9, None, 35.0, 29.4, None, 32.2]
count, missing, average = summary(highs)
print(f"{count} days, {missing} missing, average {average:.1f}")
print(summary([None, None]))
`,
        output: "5 days, 2 missing, average 32.3\n(0, 2, None)\n",
        note: "The average divides by the 5 days that had data, not by 7. When no day has a reading, the average is None rather than a ZeroDivisionError.",
      },
      {
        kind: "text",
        md: "Many weather questions compare a day with the day before: *the first day it warmed past 20 °C*, *how often it got colder overnight*. A `for` loop over values can't see the previous value, so loop over **positions** with `range(1, len(temps))` and read `temps[i - 1]` and `temps[i]`. Starting at 1 means the first day has a day before it.\n\nOther questions look at a **window** of days: a slice `temps[i:i + 3]` is the three days starting at `i`.",
      },
      {
        kind: "example",
        title: "First warm day and the warmest three days",
        code: src`
def first_crossing(temps, level):
    """Return the position of the first day that rose to level from below it, or None."""
    for i in range(1, len(temps)):
        if temps[i - 1] < level <= temps[i]:
            return i
    return None

def warmest_window(temps, days=3):
    """Return the start position of the warmest run of that many readings."""
    best_start = 0
    best_total = None
    for start in range(len(temps) - days + 1):
        total = 0
        for t in temps[start:start + days]:
            total = total + t
        if best_total is None or total > best_total:
            best_start = start
            best_total = total
    return best_start

temps = [18.3, 21.7, 14.2, 15.0, 22.8, 24.1, 23.5]
print(first_crossing(temps, 20), first_crossing(temps, 22), first_crossing(temps, 30))
print(warmest_window(temps), warmest_window(temps, 2))
`,
        output: "1 4 None\n4 5\n",
        note: "`first_crossing` compares each day with the one before, so a day that is already warm doesn't count as crossing: for level 22 the answer is day 4, the day it climbed from 15.0. `range(len(temps) - days + 1)` gives exactly the window starts that fit.",
      },
      {
        kind: "text",
        md: "**When to use it:** for anything measured over time: temperatures, prices, step counts, server response times. **Mistakes to avoid:**\n\n- Comparing or adding `None`: test `is None` first.\n- Starting a neighbour loop at 0: `temps[-1]` is the **last** reading, so day 0 is silently compared with the end of the list.\n- Dividing by the number of days instead of the number of readings.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count the dry days",
      prompt: "`dry_days` still counts the days with some precipitation, skipping missing readings. Fix it so it counts the **dry** days, as its name says: readings of exactly 0. Keep the `None` check.",
      spec: [
        ["Function", "`dry_days(precip)`"],
        ["Returns", "how many readings are 0; `None` readings are skipped"],
      ],
      starter: src`
def dry_days(precip):
    count = 0
    for mm in precip:
        if mm is None:
            continue
        if mm > 0:
            count = count + 1
    return count

print(dry_days([0.0, 2.5, None, 0.0, 0.4]))
`,
      answer: src`
def dry_days(precip):
    count = 0
    for mm in precip:
        if mm is None:
            continue
        if mm == 0:
            count = count + 1
    return count

print(dry_days([0.0, 2.5, None, 0.0, 0.4]))
`,
      wrong: [
        {
          code: src`
def dry_days(precip):
    count = 0
    for mm in precip:
        if mm == 0 or mm is None:
            count = count + 1
    return count
`,
          fails: ["returns"],
          why: "missing days are counted as dry, although nobody knows whether it rained",
        },
      ],
      hints: ["Only the test after the `None` check changes.", "A dry day has a reading of exactly 0.", "Keep skipping `None`: a missing reading is neither wet nor dry."],
      task: {
        checks: [
          fn("returns", "dry_days", [
            example([[py.float(0), 2.5, null, py.float(0), 0.4]], 2),
            hiddenCase("only missing readings", [[null, null]], 0),
            hiddenCase("no dry days", [[1.2, 0.1]], 0),
          ], { label: "dry_days() counts the dry days" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Heating degree days",
        prompt: "Energy companies estimate heating demand with **heating degree days**: for each day whose average temperature is below a base (usually 18 °C), add `base − temperature`. Days at or above the base add nothing. Write `heating_degree_days(temps, base=18)`: return the total for the readings, skipping `None`, as a float.",
        spec: [
          ["Function", "`heating_degree_days(temps, base=18)`"],
          ["temps", "daily average temperatures in °C, some `None`"],
          ["Returns", "the sum of `base − t` over readings below `base`, as a float (0.0 if none)"],
          ["Example", "`[12.5, 20.0, None, 15.0]` → `8.5` (5.5 + 3.0)"],
        ],
        starter: src`
def heating_degree_days(temps, base=18):
    return 0.0

print(heating_degree_days([12.5, 20.0, None, 15.0]))
`,
        answer: src`
def heating_degree_days(temps, base=18):
    """Return the heating degree days for daily averages that may be None."""
    total = 0.0
    for t in temps:
        if t is None:
            continue
        if t < base:
            total = total + (base - t)
    return total

print(heating_degree_days([12.5, 20.0, None, 15.0]))
`,
        alternatives: [
          src`
def heating_degree_days(temps, base=18):
    total = 0.0
    for t in temps:
        if t is not None and t < base:
            total += base - t
    return total
`,
        ],
        wrong: [
          {
            code: src`
def heating_degree_days(temps, base=18):
    total = 0.0
    for t in temps:
        if t is None:
            continue
        total = total + (base - t)
    return total
`,
            fails: ["returns"],
            why: "warm days add a negative amount instead of nothing",
          },
          {
            code: src`
def heating_degree_days(temps, base=18):
    total = 0.0
    for t in temps:
        if t is None:
            continue
        if t < 18:
            total = total + (18 - t)
    return total
`,
            fails: ["returns"],
            why: "the base is fixed at 18, so a caller's own base is ignored",
          },
          {
            code: src`
def heating_degree_days(temps, base=18):
    total = 0.0
    for t in temps:
        if t is not None and t < base:
            total = total + (t - base)
    return total
`,
            fails: ["returns"],
            why: "the subtraction is the wrong way round, so the total is negative",
          },
        ],
        hints: [
          "Skip missing readings first, as in the examples.",
          "Only days below the base contribute; the others add nothing.",
          "Each cold day adds how far it is below the base, `base - t`; start the total at `0.0` so it is always a float.",
        ],
        task: {
          checks: [
            fn("returns", "heating_degree_days", [
              example([[12.5, py.float(20), null, py.float(15)]], 8.5),
              example([[py.float(18), py.float(25)]], py.float(0)),
              example([[py.float(10), py.float(14)], 15], py.float(6)),
              hiddenCase("only missing readings", [[null, null]], py.float(0)),
              hiddenCase("a day exactly at the base", [[py.float(18), 17.5]], 0.5),
              hiddenCase("a base given by name", [[py.float(-2), py.float(4)]], py.float(22), { kwargs: { base: 12 } }),
              hiddenCase("freezing days", [[py.float(-5), py.float(-1)]], py.float(42)),
            ], { label: "heating_degree_days() adds base minus temperature for cold days" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Fill the gaps in a station record",
        prompt: "A chart can't draw a line through missing days, so the weather page fills each gap before plotting. Write `fill_gaps(readings)`: return a **new** list where every `None` is replaced by the average of the nearest real reading before it and the nearest real reading after it. A gap at the start or end of the list copies the one real neighbour it has. If there are no real readings at all, the `None`s stay. The input list must not change.",
        spec: [
          ["Function", "`fill_gaps(readings)`"],
          ["readings", "daily values in order, some `None`"],
          ["Returns", "a new list of the same length with each gap filled from the nearest **original** readings on either side"],
          ["Example", "`[None, 18.0, None, None, 21.0, None]` → `[18.0, 18.0, 19.5, 19.5, 21.0, 21.0]`"],
        ],
        starter: src`
def fill_gaps(readings):
    return readings

print(fill_gaps([None, 18.0, None, None, 21.0, None]))
`,
        answer: src`
def nearest(readings, i, step):
    """Return the first real reading from position i moving by step, or None."""
    j = i + step
    while 0 <= j < len(readings):
        if readings[j] is not None:
            return readings[j]
        j = j + step
    return None

def fill_gaps(readings):
    """Return a new list with each None replaced from its nearest real neighbours."""
    filled = []
    for i in range(len(readings)):
        if readings[i] is not None:
            filled.append(readings[i])
            continue
        before = nearest(readings, i, -1)
        after = nearest(readings, i, 1)
        if before is None:
            filled.append(after)
        elif after is None:
            filled.append(before)
        else:
            filled.append((before + after) / 2)
    return filled

print(fill_gaps([None, 18.0, None, None, 21.0, None]))
`,
        alternatives: [
          src`
def fill_gaps(readings):
    known = []
    for i in range(len(readings)):
        if readings[i] is not None:
            known.append(i)
    result = readings.copy()
    for i in range(len(readings)):
        if readings[i] is not None:
            continue
        left = None
        right = None
        for k in known:
            if k < i:
                left = readings[k]
            elif k > i and right is None:
                right = readings[k]
        if left is not None and right is not None:
            result[i] = (left + right) / 2
        elif left is not None:
            result[i] = left
        else:
            result[i] = right
    return result
`,
        ],
        wrong: [
          {
            code: src`
def fill_gaps(readings):
    filled = []
    for i in range(len(readings)):
        if readings[i] is not None:
            filled.append(readings[i])
        elif i == 0:
            filled.append(readings[i + 1])
        elif i == len(readings) - 1:
            filled.append(readings[i - 1])
        else:
            filled.append((readings[i - 1] + readings[i + 1]) / 2)
    return filled
`,
            fails: ["returns"],
            why: "only the immediate neighbours are used, so two gaps in a row add None to a number and crash",
          },
          {
            code: src`
def fill_gaps(readings):
    filled = []
    for i in range(len(readings)):
        if readings[i] is not None:
            filled.append(readings[i])
            continue
        before = None
        if len(filled) > 0:
            before = filled[-1]
        after = None
        j = i + 1
        while j < len(readings) and after is None:
            after = readings[j]
            j = j + 1
        if before is None:
            filled.append(after)
        elif after is None:
            filled.append(before)
        else:
            filled.append((before + after) / 2)
    return filled
`,
            fails: ["returns"],
            why: "the value before a gap is taken from the filled list, so the second of two gaps averages a made-up value",
          },
          {
            code: src`
def fill_gaps(readings):
    for i in range(len(readings)):
        if readings[i] is None:
            before = None
            j = i - 1
            while j >= 0 and before is None:
                before = readings[j]
                j = j - 1
            after = None
            j = i + 1
            while j < len(readings) and after is None:
                after = readings[j]
                j = j + 1
            if before is None:
                readings[i] = after
            elif after is None:
                readings[i] = before
            else:
                readings[i] = (before + after) / 2
    return readings
`,
            fails: ["keeps-input", "returns"],
            why: "it writes into the station's own list, and earlier fills then leak into later gaps",
          },
        ],
        hints: [
          "A helper that walks left or right from a position until it meets a real reading (or runs off the end) does most of the work.",
          "Look for neighbours in the original `readings`, never in the list you are building.",
          "Decide by which neighbours exist: both gives the average, one gives a copy, none leaves None.",
        ],
        task: {
          checks: [
            fn("returns", "fill_gaps", [
              example([[py.float(20), null, py.float(24)]], [py.float(20), py.float(22), py.float(24)]),
              example([[null, py.float(18), null, null, py.float(21), null]], [py.float(18), py.float(18), 19.5, 19.5, py.float(21), py.float(21)]),
              example([[]], []),
              hiddenCase("no real readings at all", [[null, null]], [null, null]),
              hiddenCase("three gaps in a row", [[py.float(10), null, null, null, py.float(20)]], [py.float(10), py.float(15), py.float(15), py.float(15), py.float(20)]),
              hiddenCase("gaps at both ends only", [[null, 5.5, 7.5, null]], [5.5, 5.5, 7.5, 7.5]),
              hiddenCase("no gaps", [[1.5, 2.5]], [1.5, 2.5]),
            ], { label: "fill_gaps() fills every gap from the nearest real readings" }),
            fn("keeps-input", "fill_gaps", [
              keepsInput([[py.float(20), null, py.float(24)]]),
              keepsInput([[null, py.float(3), null]], { label: "gaps at both ends" }),
            ], { label: "fill_gaps() leaves the station's list unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
temps = [12, 15, 11, 18]
rises = 0
for i in range(1, len(temps)):
    if temps[i] > temps[i - 1]:
        rises = rises + 1
print(rises, temps[1:3])
`,
        choices: ["2 [15, 11]", "3 [15, 11]", "2 [15, 11, 18]", "1 [12, 15]"],
        answer: 0,
        why: "Day 1 rises from 12 to 15 and day 3 from 11 to 18; day 2 falls. The slice `[1:3]` holds positions 1 and 2.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the neighbour loop starts at 0. What does this print?",
        program: src`
temps = [12, 15, 11, 18]
rises = 0
for i in range(len(temps)):
    if temps[i] > temps[i - 1]:
        rises = rises + 1
print(rises)
`,
        choices: ["2", "3", "IndexError", "1"],
        answer: 0,
        why: "At i = 0, `temps[-1]` is the last reading, 18, so day 0 is compared with the end of the list (12 > 18 is False). It happens not to change the count here, which is exactly why this bug survives testing. Start at 1.",
      },
      {
        id: "q3",
        prompt: "A month has 31 days and 4 missing readings. What should the average be divided by?",
        choices: ["27, the number of readings that exist", "31, the number of days", "4, the number of gaps", "35, readings plus gaps"],
        answer: 0,
        why: "An average is the total of the values you have divided by how many you have. Report the 4 missing days alongside it.",
      },
    ],
    review: [
      "Skip `None` readings with `is None` before comparing, and say how many were missing.",
      "Compare neighbours by position, starting at 1; look at windows with a slice.",
      "Divide by the number of readings you actually used.",
      "Next: sort free-text messages into categories by the words they contain.",
    ],
  },

  // ------------------------------------------------------------------ PY-L10-04 categorise text
  {
    id: "PY-L10-04",
    version: 2,
    slug: "categorize-text",
    title: "Sort messages into categories",
    lede: "Support teams route messages by the words in them. A function that cleans the text, checks keyword lists in priority order and returns one category turns that rule into code.",
    focus: "Return a category for a piece of text by checking cleaned text against keyword lists in priority order.",
    minutes: 20,
    objectives: [
      "Clean text with `lower` and `strip` before matching keywords",
      "Check categories in a fixed priority order and return the first match",
      "Combine several signals (keywords, a flag) into one decision",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "boolean", "none-value", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "nested-loop", "membership", "string-method", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "dict-iterate", "len-call", "spaces-in-text", "nested-condition", "conditional-expr", "truthiness", "identity", "string-slice"],
    teaches: ["text-category"],
    blocks: [
      {
        kind: "text",
        md: "The CFPB publishes consumer complaints with a free-text narrative. Before anyone reads them, a first pass routes each one to a team: fraud, billing, account access. The rule is simple: clean the text, then check each category's keywords **in priority order**; the first category with a matching keyword wins. Fraud is checked first because a message that mentions both a fee and a stolen card must go to fraud.\n\nA list of `(category, keywords)` tuples keeps that order explicit, and changing the rules means editing data, not code.",
      },
      {
        kind: "example",
        title: "Routing complaints",
        code: src`
RULES = [
    ("fraud", ["unauthorized", "stolen", "scam"]),
    ("billing", ["fee", "charge", "refund"]),
    ("access", ["locked", "password", "log in"]),
]

def categorize(message):
    """Return the first category whose keyword appears in the message, or "other"."""
    text = message.lower()
    for category, keywords in RULES:
        for word in keywords:
            if word in text:
                return category
    return "other"

print(categorize("I was charged a late FEE twice"))
print(categorize("There is an unauthorized charge on my card"))
print(categorize("Can't LOG IN since the update"))
print(categorize("Please update my mailing address"))
`,
        output: "billing\nfraud\naccess\nother\n",
        note: "The second message mentions a charge **and** an unauthorized one; fraud is checked first, so it wins. `return` inside the inner loop stops both loops at the first match.",
      },
      {
        kind: "text",
        md: "Keyword matching with `in` finds text **inside** other text: `\"fee\"` is in `\"feedback\"`. Real routers accept that trade-off for a first pass, but they add other signals so one word doesn't decide everything. Here a priority depends on both the words and whether the customer is flagged as vulnerable, and the result is a tuple so the caller gets both answers.",
      },
      {
        kind: "example",
        title: "Category and priority together",
        code: src`
URGENT = ["stolen", "unauthorized", "locked out"]

def triage(message, vulnerable=False):
    text = message.strip().lower()
    hits = 0
    for word in URGENT:
        if word in text:
            hits = hits + 1
    if hits >= 2 or (hits == 1 and vulnerable):
        priority = "high"
    elif hits == 1:
        priority = "medium"
    else:
        priority = "low"
    return priority, hits

print(triage("Card STOLEN and unauthorized withdrawals"))
print(triage("I am locked out of online banking", vulnerable=True))
print(triage("  Locked out again "))
print(triage("Question about statement dates"))
`,
        output: "('high', 2)\n('high', 1)\n('medium', 1)\n('low', 0)\n",
        note: "Counting hits rather than stopping at the first one lets the decision weigh how many signals there are. The `vulnerable` default keeps ordinary calls short.",
      },
      {
        kind: "text",
        md: "**When to use it:** first-pass routing, tagging and filtering of text. **Mistakes to avoid:**\n\n- Matching before cleaning: `\"FEE\"` is not `\"fee\"`.\n- Checking categories in the wrong order, so a low-priority category catches messages first.\n- Forgetting that `in` matches part of a word; choose keywords long enough to be specific.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Add a keyword",
      prompt: "Messages about a \"chargeback\" are being sent to billing because they contain \"charge\". They belong to fraud. Add `\"chargeback\"` to the fraud keywords and run it.",
      spec: [
        ["Function", "`categorize(message)`"],
        ["Returns", "fraud, billing or other, checking fraud first"],
      ],
      starter: src`
RULES = [
    ("fraud", ["unauthorized", "stolen"]),
    ("billing", ["fee", "charge"]),
]

def categorize(message):
    text = message.lower()
    for category, keywords in RULES:
        for word in keywords:
            if word in text:
                return category
    return "other"

print(categorize("I filed a CHARGEBACK last week"))
`,
      answer: src`
RULES = [
    ("fraud", ["unauthorized", "stolen", "chargeback"]),
    ("billing", ["fee", "charge"]),
]

def categorize(message):
    text = message.lower()
    for category, keywords in RULES:
        for word in keywords:
            if word in text:
                return category
    return "other"

print(categorize("I filed a CHARGEBACK last week"))
`,
      wrong: [
        {
          code: src`
RULES = [
    ("fraud", ["unauthorized", "stolen"]),
    ("billing", ["fee", "charge", "chargeback"]),
]

def categorize(message):
    text = message.lower()
    for category, keywords in RULES:
        for word in keywords:
            if word in text:
                return category
    return "other"
`,
          fails: ["returns"],
          why: "the keyword was added to billing, so chargebacks still go to billing",
        },
      ],
      hints: ["The rules are data: only the list of fraud keywords changes.", "Fraud is checked before billing, so a fraud keyword wins.", "Keywords are lower case, because the message is lowered before matching."],
      task: {
        checks: [
          fn("returns", "categorize", [
            example(["I filed a CHARGEBACK last week"], "fraud"),
            hiddenCase("a plain billing message", ["Why is there a fee?"], "billing"),
            hiddenCase("an unrelated message", ["Change my address"], "other"),
          ], { label: "categorize() sends chargebacks to fraud" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Positive, negative or mixed?",
        prompt: "Write `review_tone(text)` for product reviews. Count how many words from `POSITIVE` and how many from `NEGATIVE` appear in the cleaned (lower-case) text; each listed word counts once at most. Return `\"positive\"` or `\"negative\"` if only that side has hits, `\"mixed\"` if both do, and `\"neutral\"` if neither does.",
        spec: [
          ["Function", "`review_tone(text)`"],
          ["Lists", "`POSITIVE = [\"great\", \"love\", \"perfect\", \"sturdy\"]`, `NEGATIVE = [\"broke\", \"refund\", \"disappoint\", \"flimsy\"]` (given in the starter)"],
          ["Returns", "`\"positive\"`, `\"negative\"`, `\"mixed\"` or `\"neutral\"`"],
          ["Example", "`\"Love it, but the strap BROKE\"` → `'mixed'`"],
        ],
        starter: src`
POSITIVE = ["great", "love", "perfect", "sturdy"]
NEGATIVE = ["broke", "refund", "disappoint", "flimsy"]

def review_tone(text):
    return "neutral"

print(review_tone("Love it, but the strap BROKE"))
`,
        answer: src`
POSITIVE = ["great", "love", "perfect", "sturdy"]
NEGATIVE = ["broke", "refund", "disappoint", "flimsy"]

def count_hits(text, words):
    """Return how many of the words appear in the text."""
    hits = 0
    for word in words:
        if word in text:
            hits = hits + 1
    return hits

def review_tone(text):
    """Return positive, negative, mixed or neutral from keyword hits."""
    cleaned = text.lower()
    good = count_hits(cleaned, POSITIVE)
    bad = count_hits(cleaned, NEGATIVE)
    if good > 0 and bad > 0:
        return "mixed"
    if good > 0:
        return "positive"
    if bad > 0:
        return "negative"
    return "neutral"

print(review_tone("Love it, but the strap BROKE"))
`,
        alternatives: [
          src`
POSITIVE = ["great", "love", "perfect", "sturdy"]
NEGATIVE = ["broke", "refund", "disappoint", "flimsy"]

def review_tone(text):
    text = text.lower()
    good = False
    bad = False
    for word in POSITIVE:
        if word in text:
            good = True
    for word in NEGATIVE:
        if word in text:
            bad = True
    if good and bad:
        return "mixed"
    elif good:
        return "positive"
    elif bad:
        return "negative"
    else:
        return "neutral"
`,
        ],
        wrong: [
          {
            code: src`
POSITIVE = ["great", "love", "perfect", "sturdy"]
NEGATIVE = ["broke", "refund", "disappoint", "flimsy"]

def review_tone(text):
    good = 0
    bad = 0
    for word in POSITIVE:
        if word in text:
            good = good + 1
    for word in NEGATIVE:
        if word in text:
            bad = bad + 1
    if good > 0 and bad > 0:
        return "mixed"
    if good > 0:
        return "positive"
    if bad > 0:
        return "negative"
    return "neutral"
`,
            fails: ["returns"],
            why: "the text isn't lowered, so `BROKE` and `Love` are missed",
          },
          {
            code: src`
POSITIVE = ["great", "love", "perfect", "sturdy"]
NEGATIVE = ["broke", "refund", "disappoint", "flimsy"]

def review_tone(text):
    text = text.lower()
    good = 0
    bad = 0
    for word in POSITIVE:
        if word in text:
            good = good + 1
    for word in NEGATIVE:
        if word in text:
            bad = bad + 1
    if good > bad:
        return "positive"
    if bad > good:
        return "negative"
    return "neutral"
`,
            fails: ["returns"],
            why: "it compares the counts, so a review with one good and one bad word is neutral instead of mixed",
          },
        ],
        hints: [
          "Lower the text once, then count the hits for each list (a small helper does both lists).",
          "There are four outcomes; decide the \"both\" case first.",
          "`in` checks whether a keyword appears anywhere in the text.",
        ],
        task: {
          checks: [
            fn("returns", "review_tone", [
              example(["Love it, but the strap BROKE"], "mixed"),
              example(["Sturdy and perfect for camping"], "positive"),
              example(["Arrived late."], "neutral"),
              hiddenCase("only negative words, in capitals", ["FLIMSY. I want a REFUND"], "negative"),
              hiddenCase("several positive words", ["Great price, love the colour, perfect fit"], "positive"),
              hiddenCase("an empty review", [""], "neutral"),
              hiddenCase("a negative word inside a longer word", ["Disappointing battery life"], "negative"),
            ], { label: "review_tone() weighs positive and negative keywords" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Route a support ticket",
        prompt: "Write `route_ticket(subject, body, vip=False)`. The team comes from `TEAMS`, a list of `(team, keywords)` checked in order: look in the **subject** first, and only if no team matches there, in the body; if neither matches, the team is `\"general\"`. The priority is `\"high\"` when the cleaned subject starts with `\"urgent\"` or when `vip` is True, otherwise `\"normal\"`. Return `(team, priority)`. Matching ignores capitals and spaces at the ends.",
        spec: [
          ["Function", "`route_ticket(subject, body, vip=False)`"],
          ["TEAMS", "`[(\"payments\", [\"refund\", \"invoice\", \"card\"]), (\"shipping\", [\"delivery\", \"tracking\", \"parcel\"]), (\"accounts\", [\"password\", \"login\", \"email\"])]` (given)"],
          ["Returns", "`(team, priority)`"],
          ["Example", "`route_ticket(\"Urgent: parcel missing\", \"Order O104839, my card was charged\")` → `('shipping', 'high')`"],
        ],
        starter: src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def route_ticket(subject, body, vip=False):
    return ("general", "normal")

print(route_ticket("Urgent: parcel missing", "Order O104839, my card was charged"))
`,
        answer: src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def find_team(text):
    """Return the first team with a keyword in the text, or None."""
    for team, keywords in TEAMS:
        for word in keywords:
            if word in text:
                return team
    return None

def route_ticket(subject, body, vip=False):
    """Return (team, priority) for a ticket."""
    subject = subject.strip().lower()
    team = find_team(subject)
    if team is None:
        team = find_team(body.strip().lower())
    if team is None:
        team = "general"
    priority = "high" if subject.startswith("urgent") or vip else "normal"
    return team, priority

print(route_ticket("Urgent: parcel missing", "Order O104839, my card was charged"))
`,
        alternatives: [
          src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def route_ticket(subject, body, vip=False):
    team = "general"
    for text in [subject.strip().lower(), body.strip().lower()]:
        for name, keywords in TEAMS:
            for word in keywords:
                if word in text and team == "general":
                    team = name
    priority = "normal"
    if vip or subject.strip().lower()[:6] == "urgent":
        priority = "high"
    return (team, priority)
`,
        ],
        wrong: [
          {
            code: src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def route_ticket(subject, body, vip=False):
    text = (subject + " " + body).strip().lower()
    team = "general"
    for name, keywords in TEAMS:
        for word in keywords:
            if word in text and team == "general":
                team = name
    priority = "high" if text.startswith("urgent") or vip else "normal"
    return team, priority
`,
            fails: ["returns"],
            why: "subject and body are searched together, so a payments word in the body beats a shipping word in the subject",
          },
          {
            code: src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def route_ticket(subject, body, vip=False):
    team = "general"
    for text in [subject.lower(), body.lower()]:
        for name, keywords in TEAMS:
            for word in keywords:
                if word in text and team == "general":
                    team = name
    priority = "high" if subject.lower().startswith("urgent") or vip else "normal"
    return team, priority
`,
            fails: ["returns"],
            why: "the subject isn't stripped, so `\"  URGENT ...\"` doesn't start with urgent",
          },
          {
            code: src`
TEAMS = [
    ("payments", ["refund", "invoice", "card"]),
    ("shipping", ["delivery", "tracking", "parcel"]),
    ("accounts", ["password", "login", "email"]),
]

def route_ticket(subject, body, vip=False):
    team = "general"
    for text in [subject.strip().lower(), body.strip().lower()]:
        for name, keywords in TEAMS:
            for word in keywords:
                if word in text and team == "general":
                    team = name
    priority = "high" if subject.strip().lower().startswith("urgent") and vip else "normal"
    return team, priority
`,
            fails: ["returns"],
            why: "`and` makes a ticket high priority only when it is both urgent and from a VIP",
          },
        ],
        hints: [
          "A helper that returns the first matching team for one text, or None, can be called twice: subject, then body.",
          "Clean each text with `strip` and `lower` before matching.",
          "The priority is a separate decision with `or`: either reason is enough.",
        ],
        task: {
          checks: [
            fn("returns", "route_ticket", [
              example(["Urgent: parcel missing", "Order O104839, my card was charged"], tup("shipping", "high")),
              example(["Question", "I forgot my password"], tup("accounts", "normal")),
              example(["Hello", "Just saying thanks", true], tup("general", "high")),
              hiddenCase("a subject with capitals and spaces", ["   URGENT invoice copy  ", "please"], tup("payments", "high")),
              hiddenCase("teams in both subject and body", ["Tracking number?", "Also need a refund"], tup("shipping", "normal")),
              hiddenCase("a VIP flag given by name", ["login loop", ""], tup("accounts", "high"), { kwargs: { vip: true } }),
              hiddenCase("urgent in the middle of the subject", ["Not urgent: email change", ""], tup("accounts", "normal")),
            ], { label: "route_ticket() picks the team from the subject first, then the body, and sets the priority" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
RULES = [("fraud", ["stolen"]), ("billing", ["fee", "charge"])]

def categorize(message):
    text = message.lower()
    for category, keywords in RULES:
        for word in keywords:
            if word in text:
                return category
    return "other"

print(categorize("Stolen card, then a FEE"), categorize("feedback form"), categorize("hello"))
`,
        choices: ["fraud billing other", "billing billing other", "fraud other other", "fraud billing hello"],
        answer: 0,
        why: "Fraud is checked first, so the first message is fraud. `\"fee\"` is inside `\"feedback\"`, so the second is billing: the classic weakness of matching with `in`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the keywords are checked before cleaning. What does this print?",
        program: src`
def is_refund(message):
    if "refund" in message:
        return True
    return False

print(is_refund("REFUND please"), is_refund("refund please"), is_refund("Refunds"))
`,
        choices: ["False True False", "True True True", "False True True", "True True False"],
        answer: 0,
        why: "`in` compares exact characters, so capital letters never match the lower-case keyword. Lower the message first.",
      },
      {
        id: "q3",
        prompt: "Why keep the categories in a list of (category, keywords) tuples rather than a chain of if statements?",
        choices: ["The checking order and the keywords become data that can be edited without changing the code", "A list is the only way to use in", "if statements can't contain or", "Tuples make the matching faster than strings"],
        answer: 0,
        why: "The loop stays the same however many rules there are; adding a category or a keyword is a data change, and the list order is the priority order.",
      },
    ],
    review: [
      "Clean the text, then check keyword lists in priority order and return the first match.",
      "Keep rules as data: a list of (category, keywords) tuples.",
      "`in` matches inside words; combine several signals when one word shouldn't decide.",
      "Next: a complete small program built from functions that each do one step.",
    ],
  },

  // ------------------------------------------------------------------ PY-L10-05 a small program
  {
    id: "PY-L10-05",
    version: 2,
    slug: "mixed-review",
    title: "Build a small program from functions",
    lede: "A real program reads data, checks it, computes something and reports it. Giving each step its own function makes the program easy to test, change and read from the top down.",
    focus: "Split a whole job into functions for validating, computing and reporting, and connect them with return values.",
    minutes: 22,
    objectives: [
      "Plan a program as steps: validate, compute, report",
      "Write one function per step and connect them with return values",
      "Keep the input data unchanged while producing a new result",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "function-scope", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "while-loop", "membership", "string-method", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "list-sort", "list-copy", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "len-call", "spaces-in-text", "continue-statement", "nested-condition", "conditional-expr", "truthiness", "conversion"],
    teaches: ["mixed-review"],
    blocks: [
      {
        kind: "text",
        md: "Every program in this course so far has had the same skeleton, even when it wasn't written down: some data comes in, bad data is caught, something is computed, and a result goes out. Writing each of those steps as its own function makes the skeleton visible. The bottom of the program then reads like a plan, and each function can be checked on its own with a couple of inputs.",
      },
      {
        kind: "example",
        title: "A gradebook in four steps",
        code: src`
def valid_score(score):
    """Return True for a whole-number score from 0 to 100."""
    return score is not None and 0 <= score <= 100

def letter(score):
    """Return the letter grade for a valid score."""
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def grade_all(scores):
    """Return (name, letter) for valid scores and the names with invalid ones."""
    graded = []
    invalid = []
    for name, score in scores:
        if valid_score(score):
            graded.append((name, letter(score)))
        else:
            invalid.append(name)
    return graded, invalid

def report(graded, invalid):
    for name, grade in graded:
        print(f"{name:<6}{grade}")
    if invalid:
        print("check:", invalid)

scores = [("Ana", 92), ("Ben", 58), ("Chen", 104), ("Dara", 71), ("Eli", None)]
graded, invalid = grade_all(scores)
report(graded, invalid)
`,
        output: "Ana   A\nBen   F\nDara  C\ncheck: ['Chen', 'Eli']\n",
        note: "Read the last three lines first: they are the whole plan. `valid_score` uses a chained comparison, `0 <= score <= 100`, and checks for None before comparing. Each function returns its result; only `report` prints.",
      },
      {
        kind: "text",
        md: "The second program is a restock report. Its steps are: apply the day's sales to a **copy** of the stock (the original is the morning's record and must not change), find what has fallen below its reorder level, and work out how many packs to order. A `while` loop (see Loops & Iteration) rounds up to whole packs.",
      },
      {
        kind: "example",
        title: "End-of-day restock report",
        code: src`
def apply_sales(stock, sales):
    """Return a new stock dictionary after the sales; unknown products are ignored."""
    after = stock.copy()
    for product_id, units in sales:
        if product_id in after:
            after[product_id] = after[product_id] - units
    return after

def packs_needed(units, level, pack_size):
    """Return how many packs bring units back up to at least level."""
    packs = 0
    while units + packs * pack_size < level:
        packs = packs + 1
    return packs

stock = {"P0607": 30, "P0208": 8, "P0659": 12}
levels = {"P0607": 20, "P0208": 10, "P0659": 5}
sales = [("P0607", 14), ("P0208", 3), ("P0999", 1), ("P0659", 2)]
after = apply_sales(stock, sales)
for product_id, units in after.items():
    packs = packs_needed(units, levels[product_id], 6)
    if packs > 0:
        print(f"{product_id}: {units} left, order {packs} packs")
print(stock["P0607"], after["P0607"])
`,
        output: "P0607: 16 left, order 1 packs\nP0208: 5 left, order 1 packs\n30 16\n",
        note: "`stock.copy()` makes a separate dictionary, so the morning record still says 30. Without the copy, `apply_sales` would change the caller's dictionary as well as returning it.",
      },
      {
        kind: "text",
        md: "**When to use it:** for any program longer than a screen. Name the steps first, then write a function for each. **Mistakes to avoid:**\n\n- One function that validates, computes and prints at once: it can't be reused or checked.\n- Changing input data inside a step when the caller still needs the original: copy first.\n- Steps that communicate through outer names instead of parameters and return values.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A stricter pass mark",
      prompt: "The school is moving the D grade up: a D now needs 65, not 60. Change `letter` and run it. Nothing else in the program needs to change, because every other step calls `letter`.",
      spec: [
        ["Function", "`letter(score)`"],
        ["Returns", "A (90+), B (80+), C (70+), D (65+), otherwise F"],
      ],
      starter: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

print(letter(62), letter(65))
`,
      answer: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 65:
        return "D"
    return "F"

print(letter(62), letter(65))
`,
      wrong: [
        {
          code: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score > 65:
        return "D"
    return "F"
`,
          fails: ["returns"],
          why: "`> 65` fails a score of exactly 65",
        },
      ],
      hints: ["Only one number changes.", "The D test is the last one before F.", "\"Needs 65\" means 65 itself is a D."],
      task: {
        checks: [
          fn("returns", "letter", [
            example([62], "F"),
            example([65], "D"),
            hiddenCase("a C on its boundary", [70], "C"),
            hiddenCase("just below the new D", [64], "F"),
          ], { label: "letter() gives a D from 65" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Report-card lines",
        prompt: "Write a small gradebook from functions. `report_card(scores)` takes a list of `(name, score)` and returns a list of texts, one per student in the same order: `\"<name>: <score> (<letter>)\"` for a valid score, `\"<name>: invalid\"` for a score that is None or outside 0–100. Letters: A 90+, B 80+, C 70+, D 60+, F below. Write the validation and the letter as their own functions.",
        spec: [
          ["Function", "`report_card(scores)`"],
          ["scores", "a list of `(name, score)` tuples; a score may be None or out of range"],
          ["Returns", "a list of texts like `\"Ana: 92 (A)\"` or `\"Chen: invalid\"`, in the same order"],
          ["Example", "`[(\"Ana\", 92), (\"Chen\", 104)]` → `['Ana: 92 (A)', 'Chen: invalid']`"],
        ],
        starter: src`
def report_card(scores):
    return []

for text in report_card([("Ana", 92), ("Ben", 58), ("Chen", 104)]):
    print(text)
`,
        answer: src`
def valid(score):
    """Return True for a score from 0 to 100."""
    return score is not None and 0 <= score <= 100

def letter(score):
    """Return the letter for a valid score."""
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def report_card(scores):
    """Return one text per student: score and letter, or invalid."""
    lines = []
    for name, score in scores:
        if valid(score):
            lines.append(f"{name}: {score} ({letter(score)})")
        else:
            lines.append(f"{name}: invalid")
    return lines

for text in report_card([("Ana", 92), ("Ben", 58), ("Chen", 104)]):
    print(text)
`,
        alternatives: [
          src`
def letter(score):
    for cutoff, grade in [(90, "A"), (80, "B"), (70, "C"), (60, "D")]:
        if score >= cutoff:
            return grade
    return "F"

def report_card(scores):
    lines = []
    for name, score in scores:
        if score is None or score < 0 or score > 100:
            lines.append(name + ": invalid")
            continue
        lines.append(name + ": " + str(score) + " (" + letter(score) + ")")
    return lines
`,
        ],
        wrong: [
          {
            code: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def report_card(scores):
    lines = []
    for name, score in scores:
        if score is None:
            lines.append(f"{name}: invalid")
        else:
            lines.append(f"{name}: {score} ({letter(score)})")
    return lines
`,
            fails: ["returns"],
            why: "only None is treated as invalid, so 104 gets an A",
          },
          {
            code: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def report_card(scores):
    lines = []
    for name, score in scores:
        if score >= 0 and score <= 100:
            lines.append(f"{name}: {score} ({letter(score)})")
        else:
            lines.append(f"{name}: invalid")
    return lines
`,
            fails: ["returns"],
            why: "a None score is compared with 0 before anyone checks for None, which raises TypeError",
          },
          {
            code: src`
def letter(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def report_card(scores):
    lines = []
    for name, score in scores:
        if score is not None and 0 <= score <= 100:
            lines.append(f"{name}: {score} ({letter(score)})")
    return lines
`,
            fails: ["returns"],
            why: "invalid students are dropped, so the teacher never sees them",
          },
        ],
        hints: [
          "Three functions: one that says whether a score is valid, one that gives the letter, and `report_card` that uses both.",
          "Check for None before any comparison; the range check comes after.",
          "Every student produces exactly one text, valid or not.",
        ],
        task: {
          checks: [
            fn("returns", "report_card", [
              example([[tup("Ana", 92), tup("Chen", 104)]], ["Ana: 92 (A)", "Chen: invalid"]),
              example([[tup("Ben", 58), tup("Dara", 71)]], ["Ben: 58 (F)", "Dara: 71 (C)"]),
              example([[]], []),
              hiddenCase("a missing score", [[tup("Eli", null), tup("Fay", 80)]], ["Eli: invalid", "Fay: 80 (B)"]),
              hiddenCase("the edges of the valid range", [[tup("Gus", 0), tup("Hal", 100), tup("Ivy", -1)]], ["Gus: 0 (F)", "Hal: 100 (A)", "Ivy: invalid"]),
              hiddenCase("scores on each letter boundary", [[tup("J", 90), tup("K", 80), tup("L", 70), tup("M", 60), tup("N", 59)]], ["J: 90 (A)", "K: 80 (B)", "L: 70 (C)", "M: 60 (D)", "N: 59 (F)"]),
            ], { label: "report_card() gives every student a line" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A restock plan",
        prompt: "Write `restock_plan(stock, sales, levels, pack_size=6)`. Apply `sales` (a list of `(product_id, units)`, ignoring unknown products) to a copy of `stock`, then return a list of `(product_id, packs)` for every product whose units after the sales are **below** its level: the number of whole packs that brings it up to at least the level. Products appear in `stock` order. A product with no level is never reordered. The `stock` dictionary passed in must not change.",
        spec: [
          ["Function", "`restock_plan(stock, sales, levels, pack_size=6)`"],
          ["Returns", "a list of `(product_id, packs)`, in `stock` order, for products below their level after the sales"],
          ["Packs", "the smallest whole number of packs so that units + packs × pack_size ≥ level"],
          ["Must not", "change `stock`"],
          ["Example", "the starter's data → `[('P0607', 1), ('P0208', 1)]`"],
        ],
        starter: src`
def restock_plan(stock, sales, levels, pack_size=6):
    return []

stock = {"P0607": 30, "P0208": 8, "P0659": 12}
levels = {"P0607": 20, "P0208": 10, "P0659": 5}
sales = [("P0607", 14), ("P0208", 3), ("P0999", 1), ("P0659", 2)]
print(restock_plan(stock, sales, levels))
print(stock)
`,
        answer: src`
def after_sales(stock, sales):
    """Return a new stock dictionary with the sales taken off; unknown products are ignored."""
    after = stock.copy()
    for product_id, units in sales:
        if product_id in after:
            after[product_id] = after[product_id] - units
    return after

def packs_for(units, level, pack_size):
    """Return the fewest packs that bring units up to at least level."""
    packs = 0
    while units + packs * pack_size < level:
        packs = packs + 1
    return packs

def restock_plan(stock, sales, levels, pack_size=6):
    """Return (product_id, packs) for every product below its level after the sales."""
    plan = []
    after = after_sales(stock, sales)
    for product_id, units in after.items():
        if product_id not in levels:
            continue
        if units < levels[product_id]:
            plan.append((product_id, packs_for(units, levels[product_id], pack_size)))
    return plan

stock = {"P0607": 30, "P0208": 8, "P0659": 12}
levels = {"P0607": 20, "P0208": 10, "P0659": 5}
sales = [("P0607", 14), ("P0208", 3), ("P0999", 1), ("P0659", 2)]
print(restock_plan(stock, sales, levels))
print(stock)
`,
        alternatives: [
          src`
def restock_plan(stock, sales, levels, pack_size=6):
    units = {}
    for product_id in stock:
        units[product_id] = stock[product_id]
    for product_id, sold in sales:
        if product_id in units:
            units[product_id] -= sold
    plan = []
    for product_id in units:
        if product_id in levels and units[product_id] < levels[product_id]:
            short = levels[product_id] - units[product_id]
            packs = short // pack_size
            if short % pack_size != 0:
                packs += 1
            plan.append((product_id, packs))
    return plan
`,
        ],
        wrong: [
          {
            code: src`
def restock_plan(stock, sales, levels, pack_size=6):
    for product_id, units in sales:
        if product_id in stock:
            stock[product_id] = stock[product_id] - units
    plan = []
    for product_id, units in stock.items():
        if product_id in levels and units < levels[product_id]:
            packs = 0
            while units + packs * pack_size < levels[product_id]:
                packs = packs + 1
            plan.append((product_id, packs))
    return plan
`,
            fails: ["keeps-input"],
            why: "the plan is right, but the sales are taken off the caller's own stock dictionary",
          },
          {
            code: src`
def restock_plan(stock, sales, levels, pack_size=6):
    after = stock.copy()
    for product_id, units in sales:
        if product_id in after:
            after[product_id] = after[product_id] - units
    plan = []
    for product_id, units in after.items():
        if product_id in levels and units < levels[product_id]:
            plan.append((product_id, (levels[product_id] - units) // pack_size))
    return plan
`,
            fails: ["returns"],
            why: "`//` rounds down, so a shortfall of 4 units orders 0 packs",
          },
          {
            code: src`
def restock_plan(stock, sales, levels, pack_size=6):
    after = stock.copy()
    for product_id, units in sales:
        after[product_id] = after[product_id] - units
    plan = []
    for product_id, units in after.items():
        if product_id in levels and units < levels[product_id]:
            packs = 0
            while units + packs * pack_size < levels[product_id]:
                packs = packs + 1
            plan.append((product_id, packs))
    return plan
`,
            fails: ["returns"],
            why: "a sale of an unknown product raises KeyError instead of being ignored",
          },
        ],
        hints: [
          "Three steps make three small functions: apply the sales to a copy, count packs for one product, build the plan.",
          "Copy the dictionary before subtracting; skip sales of products that aren't in it.",
          "Round up to whole packs: keep adding a pack while the units are still below the level.",
        ],
        task: {
          checks: [
            fn("returns", "restock_plan", [
              example([{ P0607: 30, P0208: 8, P0659: 12 }, [tup("P0607", 14), tup("P0208", 3), tup("P0999", 1), tup("P0659", 2)], { P0607: 20, P0208: 10, P0659: 5 }], [tup("P0607", 1), tup("P0208", 1)]),
              example([{ A: 0 }, [], { A: 13 }], [tup("A", 3)]),
              example([{ A: 9 }, [], { A: 5 }], []),
              hiddenCase("a custom pack size", [{ A: 2, B: 40 }, [tup("A", 2)], { A: 25, B: 10 }], [tup("A", 3)], { kwargs: { pack_size: 10 } }),
              hiddenCase("units exactly at the level", [{ A: 10 }, [], { A: 10 }], []),
              hiddenCase("a product with no level", [{ A: 0, B: 0 }, [], { B: 1 }], [tup("B", 1)]),
              hiddenCase("only sales of unknown products", [{ A: 3 }, [tup("Z", 9)], { A: 4 }], [tup("A", 1)]),
            ], { label: "restock_plan() lists what to reorder, in whole packs" }),
            fn("keeps-input", "restock_plan", [
              keepsInput([{ P0607: 30, P0208: 8, P0659: 12 }, [tup("P0607", 14), tup("P0208", 3)], { P0607: 20, P0208: 10, P0659: 5 }]),
              keepsInput([{ A: 5 }, [tup("A", 5)], { A: 1 }], { label: "a product sold out" }),
            ], { label: "restock_plan() leaves the stock dictionary unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def clean(names):
    result = []
    for name in names:
        name = name.strip().title()
        if name and name not in result:
            result.append(name)
    return result

def describe(names):
    return f"{len(names)} names: {names}"

raw = [" ana", "BEN ", "", "Ana"]
print(describe(clean(raw)))
print(raw[0])
`,
        choices: ["2 names: ['Ana', 'Ben']\n ana", "3 names: ['Ana', 'Ben', 'Ana']\n ana", "2 names: ['Ana', 'Ben']\nAna", "3 names: ['Ana', 'Ben', '']\n ana"],
        answer: 0,
        why: "`clean` skips the empty text and the repeated Ana, and `describe` formats the result. Reassigning the loop name `name` doesn't change the list, so `raw[0]` is still ` ana`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a step changes its input. What does this print?",
        program: src`
def apply_discount(prices, rate):
    for key in prices:
        prices[key] = prices[key] * (1 - rate)
    return prices

morning = {"P0607": 10.0}
sale = apply_discount(morning, 0.5)
print(morning["P0607"], sale["P0607"])
`,
        choices: ["5.0 5.0", "10.0 5.0", "5.0 10.0", "10.0 10.0"],
        answer: 0,
        why: "`prices` is the caller's own dictionary, and the function returns that same dictionary, so `morning` and `sale` are one object. Copy first when the original must survive.",
      },
      {
        id: "q3",
        prompt: "A program validates orders, totals them and prints a report. Which split into functions is best?",
        choices: ["valid_order(), order_total() and print_report(), each doing one step", "One function that does all three steps and prints as it goes", "Three functions that each print their own part of the result", "No functions: the steps only run once"],
        answer: 0,
        why: "One step per function, connected by return values, lets each step be checked alone and reused. Only the reporting step needs to print.",
      },
    ],
    review: [
      "Plan the program as steps (validate, compute, report) and write one function per step.",
      "Connect steps with parameters and return values; only the report prints.",
      "Copy input data before changing it when the caller still needs the original.",
      "Next module: string algorithms: cleaning, splitting, searching, counting and validating text.",
    ],
  },
];
