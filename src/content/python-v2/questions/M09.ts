/**
 * M09 practice: ten independent problems on functions (PY-L09-01 … PY-L09-05).
 *
 * From M09 on, code questions are graded by calling the learner's function on public examples and on hidden inputs
 * (empty lists, boundaries, keyword arguments, defaults, missing data), and by checking that inputs are not mutated
 * where that matters.
 *
 * Mix: 5 function implementations, 2 debugging (genuinely broken functions), 1 validation, 1 refactoring (behaviour
 * preserved, graded on the new function's contract and the program's unchanged output), 1 output prediction.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 * Fixtures: Runtime Market orders, SKUs, loyalty and tax rules (R01), film ratings (R02), match results, a car park
 * tariff and a till's denominations.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m09Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q09-02",
    version: 2,
    slug: "stock-after-a-sale",
    title: "Which value comes back?",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["function-def", "function-param", "function-return", "function-default", "function-scope", "assignment", "reassignment", "whole-number", "arithmetic", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent"],
    prompt: "Type exactly what this program prints. Follow each call: which arguments it gets, what it prints while it runs, and what happens to the value it returns.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "The second call passes only one argument, so `sold` takes its default.",
      "Inside the function, `units` is the parameter. Assigning to it doesn't touch the outer `units`.",
      "The second call's return value is never stored, so `left` keeps the first result.",
    ],
    explanation: "The first call prints `selling 3` and returns 7, stored in `left`. The second call uses the default `sold=1`, prints `selling 1` and returns 6, but nothing stores it. The outer `units` was never reassigned, so the last line prints `10 7`.",
    predict: {
      program: src`
def stock_after(units, sold=1):
    units = units - sold
    print("selling", sold)
    return units

units = 10
left = stock_after(units, 3)
stock_after(left)
print(units, left)
`,
      output: "selling 3\nselling 1\n10 7\n",
      wrongPredictions: ["selling 3\nselling 1\n7 6", "selling 3\nselling 1\n10 6", "selling 3\nselling 1\n6 7", "selling 3\n10 7"],
    },
  },
  {
    id: "PY-Q09-03",
    version: 2,
    slug: "average-rating-bug",
    title: "The average rating is always the first rating",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "whole-number", "decimal-number", "none-value", "list-literal", "len-call", "arithmetic", "comparison", "if-statement", "for-loop", "print-call", "unquoted-name", "top-level-indent", "print-several", "membership", "logical"],
    prompt: "`average_rating` should return the mean of a film's ratings as a float, so `[4, 5, 3, 5]` gives `4.25`, and `None` when there are no ratings. Instead it returns the first rating, and a film with no ratings crashes it. Find and fix every bug.",
    spec: [
      ["Function", "`average_rating(ratings)`"],
      ["ratings", "a list of whole-number ratings from 1 to 5"],
      ["Returns", "the mean as a float (`4.0`, not `4`), or `None` for an empty list"],
    ],
    hiddenKinds: ["an average that isn't a whole number", "a single rating", "no ratings", "the highest rating last"],
    hints: [
      "Where is the `return`? Count how many ratings have been added when it runs.",
      "`//` throws the fraction away. Which division keeps it?",
      "Dividing by `len([])` is a ZeroDivisionError; the empty case needs its own answer before the division.",
    ],
    explanation: "The `return` was indented inside the loop, so it ran after the first rating. Moving it after the loop lets every rating be added first. `//` floors the result, so `17 // 4` is 4; `/` gives 4.25. An empty list needs `return None` before dividing, because `len(ratings)` is 0.",
    code: {
      starter: src`
def average_rating(ratings):
    total = 0
    for rating in ratings:
        total = total + rating
        return total // len(ratings)

print(average_rating([4, 5, 3, 5]))
`,
      answer: src`
def average_rating(ratings):
    if len(ratings) == 0:
        return None
    total = 0
    for rating in ratings:
        total = total + rating
    return total / len(ratings)

print(average_rating([4, 5, 3, 5]))
`,
      alternatives: [
        src`
def average_rating(ratings):
    if not ratings:
        return None
    total = 0
    count = 0
    for rating in ratings:
        total += rating
        count += 1
    return total / count
`,
      ],
      wrong: [
        {
          code: src`
def average_rating(ratings):
    total = 0
    for rating in ratings:
        total = total + rating
    return total / len(ratings)
`,
          fails: ["returns"],
          why: "the average is right, but an empty list still crashes with ZeroDivisionError",
        },
        {
          code: src`
def average_rating(ratings):
    if len(ratings) == 0:
        return None
    total = 0
    for rating in ratings:
        total = total + rating
    return total // len(ratings)
`,
          fails: ["returns"],
          why: "`//` drops the fraction, so 4.25 becomes 4",
        },
        {
          code: src`
def average_rating(ratings):
    if len(ratings) == 0:
        return None
    total = 0
    for rating in ratings:
        total = total + rating
        return total / len(ratings)
`,
          fails: ["returns"],
          why: "the return is still inside the loop, so only the first rating is counted",
        },
      ],
      task: {
        checks: [
          fn("returns", "average_rating", [
            example([[4, 5, 3, 5]], 4.25),
            example([[2, 4]], py.float(3)),
            example([[]], null),
            hiddenCase("an average that isn't a whole number", [[5, 5, 4]], 14 / 3),
            hiddenCase("a single rating", [[1]], py.float(1)),
            hiddenCase("the highest rating last", [[1, 1, 1, 5]], py.float(2)),
            hiddenCase("every rating the same", [[3, 3, 3]], py.float(3)),
          ], { label: "average_rating() returns the mean of all ratings, or None" }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-06",
    version: 2,
    slug: "loyalty-points",
    title: "Loyalty points for an order",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "whole-number", "decimal-number", "boolean", "conversion", "arithmetic", "comparison", "if-statement", "print-call", "unquoted-name", "top-level-indent", "print-several", "truthiness", "precedence", "conditional-expr"],
    prompt: "Runtime Market gives loyalty points on every order: one point per whole dollar spent (cents don't count). Members earn double. Any order of 100 dollars or more earns a flat 50 bonus points on top, which is not doubled.",
    spec: [
      ["Function", "`loyalty_points(amount, member)`"],
      ["amount", "the order total in dollars, a positive number such as `64.47`"],
      ["member", "`True` or `False`"],
      ["Returns", "the points as a whole number"],
    ],
    hiddenKinds: ["an order of exactly 100", "a member order over 100", "an amount just under a whole dollar", "an order of less than a dollar"],
    hints: [
      "Start from the whole dollars: `int` drops the cents of a positive amount.",
      "Double that number for members.",
      "Add the bonus last, after the doubling, and only when the amount reaches 100.",
    ],
    explanation: "`int(amount)` keeps the whole dollars. Doubling happens before the bonus is added, so the bonus stays 50 for everyone. The bonus test is `amount >= 100` on the real amount: 99.99 earns no bonus. Doubling after adding the bonus gives members 100 bonus points.",
    code: {
      starter: src`
def loyalty_points(amount, member):
    return 0

print(loyalty_points(64.47, False))
`,
      answer: src`
def loyalty_points(amount, member):
    points = int(amount)
    if member:
        points = points * 2
    if amount >= 100:
        points = points + 50
    return points

print(loyalty_points(64.47, False))
`,
      alternatives: [
        src`
def loyalty_points(amount, member):
    dollars = int(amount)
    multiplier = 2 if member else 1
    bonus = 50 if amount >= 100 else 0
    return dollars * multiplier + bonus
`,
      ],
      wrong: [
        {
          code: src`
def loyalty_points(amount, member):
    points = int(amount)
    if amount >= 100:
        points = points + 50
    if member:
        points = points * 2
    return points
`,
          fails: ["returns"],
          why: "the bonus is added before doubling, so members get 100 bonus points",
        },
        {
          code: src`
def loyalty_points(amount, member):
    points = amount
    if member:
        points = points * 2
    if amount >= 100:
        points = points + 50
    return points
`,
          fails: ["returns"],
          why: "the cents are kept, so the points aren't a whole number",
        },
        {
          code: src`
def loyalty_points(amount, member):
    points = int(amount)
    if member:
        points = points * 2
    if amount > 100:
        points = points + 50
    return points
`,
          fails: ["returns"],
          why: "`> 100` misses the bonus on an order of exactly 100",
        },
      ],
      task: {
        checks: [
          fn("returns", "loyalty_points", [
            example([64.47, false], 64),
            example([64.47, true], 128),
            example([150, false], 200),
            hiddenCase("an order of exactly 100", [100, false], 150),
            hiddenCase("a member order over 100", [120.99, true], 290),
            hiddenCase("an amount just under a whole dollar", [99.99, true], 198),
            hiddenCase("an order of less than a dollar", [0.75, true], 0),
          ], { label: "loyalty_points() counts dollars, doubles for members, then adds the bonus" }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-10",
    version: 2,
    slug: "parking-fee",
    title: "Car park fee",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "whole-number", "decimal-number", "arithmetic", "precedence", "comparison", "if-statement", "print-call", "print-several", "unquoted-name", "top-level-indent", "conditional-expr"],
    prompt: "A shopping-centre car park charges by the length of the stay. Stays of up to 30 minutes are free. Longer stays pay 2.50 for every **started** hour of the whole stay, so 61 minutes is two hours. No stay costs more than the daily maximum of 18.00.",
    spec: [
      ["Function", "`parking_fee(minutes)`"],
      ["minutes", "a whole number, 0 or more"],
      ["Returns", "0 for up to 30 minutes; otherwise 2.50 × started hours, but never more than 18.00"],
    ],
    hiddenKinds: ["exactly 30 minutes", "one minute past a whole hour", "exactly a whole number of hours", "a stay that reaches the daily maximum", "zero minutes"],
    hints: [
      "Handle the free stays first and return 0 straight away.",
      "Started hours round up: `(minutes + 59) // 60` counts a part hour as a whole one.",
      "Compare the fee with the maximum and return whichever is smaller.",
    ],
    explanation: "`(minutes + 59) // 60` is a whole-number way to round up to started hours: 60 stays 1, 61 becomes 2. The free period is a separate rule tested first, with `<=` so 30 minutes is still free. The cap is applied last. Plain `minutes // 60` rounds down and undercharges every part hour.",
    code: {
      starter: src`
def parking_fee(minutes):
    return 0

print(parking_fee(95))
`,
      answer: src`
def parking_fee(minutes):
    if minutes <= 30:
        return 0
    hours = (minutes + 59) // 60
    fee = hours * 2.5
    if fee > 18:
        fee = 18.0
    return fee

print(parking_fee(95))
`,
      alternatives: [
        src`
def parking_fee(minutes):
    if minutes <= 30:
        return 0
    hours = minutes // 60
    if minutes % 60 != 0:
        hours = hours + 1
    return 18.0 if hours * 2.5 > 18 else hours * 2.5
`,
      ],
      wrong: [
        {
          code: src`
def parking_fee(minutes):
    if minutes <= 30:
        return 0
    fee = minutes // 60 * 2.5
    if fee > 18:
        fee = 18.0
    return fee
`,
          fails: ["returns"],
          why: "`minutes // 60` rounds down, so 95 minutes is charged as one hour",
        },
        {
          code: src`
def parking_fee(minutes):
    if minutes < 30:
        return 0
    fee = (minutes + 59) // 60 * 2.5
    if fee > 18:
        fee = 18.0
    return fee
`,
          fails: ["returns"],
          why: "`< 30` charges a stay of exactly 30 minutes, which should be free",
        },
        {
          code: src`
def parking_fee(minutes):
    if minutes <= 30:
        return 0
    return (minutes + 59) // 60 * 2.5
`,
          fails: ["returns"],
          why: "the daily maximum is never applied",
        },
      ],
      task: {
        checks: [
          fn("returns", "parking_fee", [
            example([95], py.float(5)),
            example([20], 0),
            example([45], 2.5),
            hiddenCase("exactly 30 minutes", [30], 0),
            hiddenCase("one minute past a whole hour", [121], 7.5),
            hiddenCase("exactly a whole number of hours", [180], 7.5),
            hiddenCase("a stay that reaches the daily maximum", [600], py.float(18)),
            hiddenCase("just under the maximum", [420], 17.5),
            hiddenCase("zero minutes", [0], 0),
          ], { label: "parking_fee() charges started hours after a free half hour, up to the maximum", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q09-12",
    version: 2,
    slug: "longest-winning-streak",
    title: "Longest winning streak",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 10,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "whole-number", "string-value", "list-literal", "arithmetic", "comparison", "if-statement", "else-clause", "for-loop", "print-call", "unquoted-name", "top-level-indent", "print-several", "print-text", "membership", "nested-condition"],
    prompt: "A league page shows each team's longest run of consecutive wins. Results are stored in match order as `\"W\"`, `\"D\"` or `\"L\"`. Any draw or loss ends a run.",
    spec: [
      ["Function", "`longest_streak(results)`"],
      ["results", "a list of `\"W\"`, `\"D\"` and `\"L\"`, in match order"],
      ["Returns", "the length of the longest run of `\"W\"` in a row; 0 if there are no wins"],
    ],
    hiddenKinds: ["the longest run at the very end", "no wins at all", "every match won", "a draw breaking a run", "no matches"],
    hints: [
      "Keep two counts: the current run and the best run so far.",
      "A win extends the current run; anything else resets it to 0.",
      "Compare with the best after each win, not only at the end of a run, so a run at the very end still counts.",
    ],
    explanation: "Walk the results once with a current count and a best count. A win adds one to the current run and updates the best if it is bigger; a draw or loss sets the current run back to 0. Updating the best only when a run ends forgets a run that lasts until the last match.",
    code: {
      starter: src`
def longest_streak(results):
    return 0

print(longest_streak(["W", "W", "L", "W", "W", "W", "D"]))
`,
      answer: src`
def longest_streak(results):
    best = 0
    current = 0
    for result in results:
        if result == "W":
            current = current + 1
            if current > best:
                best = current
        else:
            current = 0
    return best

print(longest_streak(["W", "W", "L", "W", "W", "W", "D"]))
`,
      alternatives: [
        src`
def longest_streak(results):
    best = 0
    current = 0
    for result in results + ["L"]:
        if result == "W":
            current += 1
        else:
            if current > best:
                best = current
            current = 0
    return best
`,
      ],
      wrong: [
        {
          code: src`
def longest_streak(results):
    best = 0
    current = 0
    for result in results:
        if result == "W":
            current = current + 1
        else:
            if current > best:
                best = current
            current = 0
    return best
`,
          fails: ["returns"],
          why: "the best is only updated when a run ends, so a run that lasts to the last match is lost",
        },
        {
          code: src`
def longest_streak(results):
    wins = 0
    for result in results:
        if result == "W":
            wins = wins + 1
    return wins
`,
          fails: ["returns"],
          why: "it counts all wins, not wins in a row",
        },
        {
          code: src`
def longest_streak(results):
    best = 0
    current = 0
    for result in results:
        if result == "W":
            current = current + 1
            if current > best:
                best = current
        elif result == "L":
            current = 0
    return best
`,
          fails: ["returns"],
          why: "a draw doesn't reset the run, so wins on either side of a draw are joined",
        },
      ],
      task: {
        checks: [
          fn("returns", "longest_streak", [
            example([["W", "W", "L", "W", "W", "W", "D"]], 3),
            example([["L", "D", "L"]], 0),
            example([["W"]], 1),
            hiddenCase("the longest run at the very end", [["W", "L", "W", "W", "W", "W"]], 4),
            hiddenCase("every match won", [["W", "W", "W", "W", "W"]], 5),
            hiddenCase("a draw breaking a run", [["W", "W", "D", "W", "W", "L"]], 2),
            hiddenCase("no matches", [[]], 0),
          ], { label: "longest_streak() finds the longest run of wins" }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-13",
    version: 2,
    slug: "coupon-checkout-crash",
    title: "Checkout crashes without a coupon",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "function-default", "function-scope", "assignment", "reassignment", "string-value", "decimal-number", "whole-number", "none-value", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "conditional-expr", "print-call", "unquoted-name", "top-level-indent", "runtime-error", "string-format", "print-text"],
    prompt: "`checkout_total(subtotal, coupon=None)` should take 10% off when the coupon is `\"SAVE10\"`, then add 5.99 shipping unless the **discounted** subtotal is 50 or more. With the coupon it returns a number, but a call without a coupon stops with `UnboundLocalError`, and some orders get free shipping they shouldn't. Fix the function.",
    spec: [
      ["Function", "`checkout_total(subtotal, coupon=None)`"],
      ["Discount", "10% off the subtotal when `coupon == \"SAVE10\"`; any other coupon (or none) gives no discount"],
      ["Shipping", "5.99, free when the subtotal **after** the discount is 50 or more"],
      ["Returns", "the discounted subtotal plus shipping"],
    ],
    hiddenKinds: ["no coupon, small order", "a coupon that takes the order below 50", "an unknown coupon code", "exactly 50 with no coupon"],
    hints: [
      "Read the error: which name does the function try to read before giving it a value in this call?",
      "Assigning `rate` anywhere in the body makes it local for every call. Give it a starting value inside the function.",
      "Work out the discounted subtotal first, then decide shipping from that number.",
    ],
    explanation: "Because the body assigns `rate`, Python treats `rate` as local throughout the function; without the coupon that assignment never runs, so reading it raises UnboundLocalError. The outer `rate = 0.0` is never used. Set `rate = 0` at the top of the function. The shipping test must use the discounted subtotal: 52 with SAVE10 is 46.80, which pays shipping.",
    code: {
      starter: src`
rate = 0.0

def checkout_total(subtotal, coupon=None):
    if coupon == "SAVE10":
        rate = 0.1
    shipping = 0 if subtotal >= 50 else 5.99
    return subtotal * (1 - rate) + shipping

print(f"{checkout_total(80, 'SAVE10'):.2f}")
print(f"{checkout_total(30):.2f}")
`,
      answer: src`
def checkout_total(subtotal, coupon=None):
    rate = 0
    if coupon == "SAVE10":
        rate = 0.1
    discounted = subtotal * (1 - rate)
    shipping = 0 if discounted >= 50 else 5.99
    return discounted + shipping

print(f"{checkout_total(80, 'SAVE10'):.2f}")
print(f"{checkout_total(30):.2f}")
`,
      alternatives: [
        src`
def checkout_total(subtotal, coupon=None):
    if coupon == "SAVE10":
        subtotal = subtotal * 0.9
    if subtotal >= 50:
        return subtotal
    return subtotal + 5.99
`,
      ],
      wrong: [
        {
          code: src`
def checkout_total(subtotal, coupon=None):
    rate = 0
    if coupon == "SAVE10":
        rate = 0.1
    shipping = 0 if subtotal >= 50 else 5.99
    return subtotal * (1 - rate) + shipping
`,
          fails: ["returns"],
          why: "the crash is fixed, but shipping is still decided on the subtotal before the discount",
        },
        {
          code: src`
def checkout_total(subtotal, coupon=None):
    rate = 0.1
    discounted = subtotal * (1 - rate)
    shipping = 0 if discounted >= 50 else 5.99
    return discounted + shipping
`,
          fails: ["returns"],
          why: "the discount is given to every order, with or without the coupon",
        },
      ],
      task: {
        checks: [
          fn("returns", "checkout_total", [
            example([80, "SAVE10"], py.float(72)),
            example([30], 35.99),
            example([120], py.float(120)),
            hiddenCase("no coupon, small order", [12.5], 18.49),
            hiddenCase("a coupon that takes the order below 50", [52, "SAVE10"], 52.79),
            hiddenCase("an unknown coupon code", [40, "SAVE50"], 45.99),
            hiddenCase("exactly 50 with no coupon", [50], py.float(50)),
          ], { label: "checkout_total() applies the coupon, then shipping on the discounted subtotal", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-16",
    version: 2,
    slug: "valid-sku-format",
    title: "Is this a valid SKU?",
    format: "validation",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "boolean", "len-call", "string-index", "string-slice", "membership", "logical", "comparison", "if-statement", "for-loop", "print-call", "unquoted-name", "top-level-indent", "print-text", "reassignment", "else-clause", "range-call"],
    prompt: "Runtime Market's SKUs look like `HOM-22847`: three capital letters for the category, a dash, then five digits. Before a SKU typed into the stock form is saved, check its format.",
    spec: [
      ["Function", "`valid_sku(sku)`"],
      ["Returns", "`True` if `sku` is exactly 3 capital letters A–Z, `-`, and 5 digits 0–9; otherwise `False`"],
      ["Rules", "nothing else is allowed: no spaces, no lower-case letters, no extra characters"],
    ],
    hiddenKinds: ["lower-case letters", "too many digits", "a digit in the letter part", "a space at the end", "an empty text", "a letter in the digit part"],
    hints: [
      "Check the length first: a valid SKU has exactly 9 characters, so you can safely index into it.",
      "Position 3 must be the dash. Slices give you the letter part and the digit part.",
      "Walk each part and test every character with `in` against `\"ABCDEFGHIJKLMNOPQRSTUVWXYZ\"` or `\"0123456789\"`; return False at the first bad one.",
    ],
    explanation: "Checking the length first means every later index exists. Then the dash must sit at position 3, every character of `sku[:3]` must be in the capital alphabet, and every character of `sku[4:]` in the digits. Returning False as soon as one test fails and True only at the end keeps the logic flat. Using `upper()` to compare would accept lower-case letters, which the form must reject.",
    code: {
      starter: src`
def valid_sku(sku):
    return False

print(valid_sku("HOM-22847"), valid_sku("hom-22847"))
`,
      answer: src`
def valid_sku(sku):
    letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    digits = "0123456789"
    if len(sku) != 9 or sku[3] != "-":
        return False
    for ch in sku[:3]:
        if ch not in letters:
            return False
    for ch in sku[4:]:
        if ch not in digits:
            return False
    return True

print(valid_sku("HOM-22847"), valid_sku("hom-22847"))
`,
      alternatives: [
        src`
def valid_sku(sku):
    if len(sku) != 9:
        return False
    ok = True
    for i in range(9):
        ch = sku[i]
        if i < 3:
            ok = ok and ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        elif i == 3:
            ok = ok and ch == "-"
        else:
            ok = ok and ch in "0123456789"
    return ok
`,
      ],
      wrong: [
        {
          code: src`
def valid_sku(sku):
    if len(sku) != 9 or sku[3] != "-":
        return False
    for ch in sku[:3]:
        if ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            return False
    return True
`,
          fails: ["returns"],
          why: "the digit part is never checked, so `HOM-2284X` passes",
        },
        {
          code: src`
def valid_sku(sku):
    if len(sku) != 9 or sku[3] != "-":
        return False
    for ch in sku[:3].upper():
        if ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            return False
    for ch in sku[4:]:
        if ch not in "0123456789":
            return False
    return True
`,
          fails: ["returns"],
          why: "upper-casing first lets a lower-case category through",
        },
        {
          code: src`
def valid_sku(sku):
    if sku[3] != "-":
        return False
    for ch in sku[:3]:
        if ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            return False
    for ch in sku[4:]:
        if ch not in "0123456789":
            return False
    return True
`,
          fails: ["returns"],
          why: "without the length check, an extra digit passes and an empty text raises IndexError",
        },
      ],
      task: {
        checks: [
          fn("returns", "valid_sku", [
            example(["HOM-22847"], true),
            example(["ELE-24781"], true),
            example(["hom-22847"], false),
            example(["HOM22847"], false),
            hiddenCase("too many digits", ["SPO-116810"], false),
            hiddenCase("a digit in the letter part", ["H0M-22847"], false),
            hiddenCase("a space at the end", ["TOY-54564 "], false),
            hiddenCase("an empty text", [""], false),
            hiddenCase("a letter in the digit part", ["BOO-5841O"], false),
            hiddenCase("mixed-case letters", ["Hom-22847"], false),
          ], { label: "valid_sku() accepts only AAA-99999" }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-19",
    version: 2,
    slug: "format-a-duration",
    title: "Format a duration",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "whole-number", "boolean", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "string-format", "print-call", "unquoted-name", "top-level-indent", "nested-condition", "print-several", "reassignment", "truthiness", "precedence"],
    prompt: "A video app stores how long each film runs in seconds and shows it as hours, minutes and seconds. Minutes and seconds always have two digits; the hours part is left out for anything under an hour. Some screens have no room for seconds, so they can be switched off.",
    spec: [
      ["Function", "`format_duration(seconds, show_seconds=True)`"],
      ["seconds", "a whole number, 0 or more"],
      ["Returns", "`\"1h 05m 09s\"`, or `\"5m 09s\"` under an hour; with `show_seconds=False`, `\"1h 05m\"` or `\"5m\"` (seconds are dropped, not rounded)"],
    ],
    hiddenKinds: ["exactly one hour", "zero seconds", "seconds switched off by name", "more than a day", "just under an hour"],
    hints: [
      "`//` and `%` split a number of seconds: `seconds // 3600` is whole hours, and what is left over gives minutes and seconds.",
      "`:02d` in an f-string pads a number to two digits.",
      "Build the minutes part first, add the seconds part only when asked, and put the hours in front only when there are any.",
    ],
    explanation: "Hours are `seconds // 3600`; the rest, `seconds % 3600`, splits into minutes (`// 60`) and seconds (`% 60`). Formatting with `:02d` gives `05` and `09`. The hours part depends on hours being above 0, not on the total being over 3600 in some other way, and the seconds part on the default parameter, which a caller can switch off by name.",
    code: {
      starter: src`
def format_duration(seconds, show_seconds=True):
    return ""

print(format_duration(3909))
print(format_duration(309, show_seconds=False))
`,
      answer: src`
def format_duration(seconds, show_seconds=True):
    hours = seconds // 3600
    minutes = seconds % 3600 // 60
    secs = seconds % 60
    if hours > 0:
        text = f"{hours}h {minutes:02d}m"
    else:
        text = f"{minutes}m"
    if show_seconds:
        text = text + f" {secs:02d}s"
    return text

print(format_duration(3909))
print(format_duration(309, show_seconds=False))
`,
      alternatives: [
        src`
def format_duration(seconds, show_seconds=True):
    hours = seconds // 3600
    rest = seconds - hours * 3600
    minutes = rest // 60
    secs = rest - minutes * 60
    if hours > 0:
        text = f"{hours}h {minutes:02d}m"
    else:
        text = f"{minutes}m"
    if show_seconds:
        text += f" {secs:02d}s"
    return text
`,
      ],
      wrong: [
        {
          code: src`
def format_duration(seconds, show_seconds=True):
    hours = seconds // 3600
    minutes = seconds // 60
    secs = seconds % 60
    if hours > 0:
        text = f"{hours}h {minutes:02d}m"
    else:
        text = f"{minutes}m"
    if show_seconds:
        text += f" {secs:02d}s"
    return text
`,
          fails: ["returns"],
          why: "the minutes count every minute since the start, so 1h 05m shows as 1h 65m",
        },
        {
          code: src`
def format_duration(seconds, show_seconds=True):
    hours = seconds // 3600
    minutes = seconds % 3600 // 60
    secs = seconds % 60
    if hours > 0:
        text = f"{hours}h {minutes}m"
    else:
        text = f"{minutes}m"
    if show_seconds:
        text += f" {secs}s"
    return text
`,
          fails: ["returns"],
          why: "without `:02d` the parts aren't padded, so you get `1h 5m 9s`",
        },
        {
          code: src`
def format_duration(seconds, show_seconds=False):
    hours = seconds // 3600
    minutes = seconds % 3600 // 60
    secs = seconds % 60
    if hours > 0:
        text = f"{hours}h {minutes:02d}m"
    else:
        text = f"{minutes}m"
    if show_seconds:
        text += f" {secs:02d}s"
    return text
`,
          fails: ["returns"],
          why: "the default hides the seconds, so a call without the argument shows too little",
        },
      ],
      task: {
        checks: [
          fn("returns", "format_duration", [
            example([3909], "1h 05m 09s"),
            example([309], "5m 09s"),
            example([309, false], "5m"),
            example([7265, false], "2h 01m"),
            hiddenCase("exactly one hour", [3600], "1h 00m 00s"),
            hiddenCase("zero seconds", [0], "0m 00s"),
            hiddenCase("seconds switched off by name", [3659], "1h 00m", { kwargs: { show_seconds: false } }),
            hiddenCase("more than a day", [90061], "25h 01m 01s"),
            hiddenCase("just under an hour", [3599], "59m 59s"),
          ], { label: "format_duration() shows hours, padded minutes and optional seconds" }),
        ],
      },
    },
  },
  {
    id: "PY-Q09-20",
    version: 2,
    slug: "refactor-order-cost",
    title: "Write the order cost once",
    format: "refactoring",
    difficulty: "medium",
    minutes: 14,
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "reassignment", "string-value", "decimal-number", "whole-number", "dict-literal", "dict-lookup", "membership", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "string-format", "print-call", "print-several", "unquoted-name", "top-level-indent", "string-index", "conditional-expr", "print-text", "for-loop"],
    prompt: "This program prices three orders by pasting the same tax and shipping steps three times, and the copies are about to drift apart. Refactor it: write `order_cost(subtotal, state, free_from=50)` that returns one order's total, and make the three prints call it. The printed lines must stay exactly the same.",
    spec: [
      ["Function", "`order_cost(subtotal, state, free_from=50)`"],
      ["Tax", "`subtotal × rate` with the state's rate from `TAX_RATES`; a state not in the table pays no tax"],
      ["Shipping", "5.99, free when the subtotal (before tax) is at least `free_from`"],
      ["Returns", "subtotal + tax + shipping"],
      ["Program", "still prints the same three lines"],
    ],
    hiddenKinds: ["a state with no tax entry", "a subtotal exactly at the free-shipping limit", "a custom free-shipping limit", "a zero subtotal"],
    hints: [
      "Copy one order's steps into the function body and replace its fixed values with the parameters.",
      "The tax table can stay outside the function; the function looks the state up in it, with `in` first.",
      "Each print then becomes one call with that order's values. Run it and compare the three lines with before.",
    ],
    explanation: "Refactoring keeps behaviour and changes structure. The three copies become one function whose parameters are the parts that differed, so a future change to the shipping rule is made once. The tax lookup must keep the copies' guard for unknown states, and the `free_from` default keeps the old limit while letting a caller change it.",
    code: {
      starter: src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

subtotal = 40.0
tax = subtotal * TAX_RATES["CA"]
shipping = 0 if subtotal >= 50 else 5.99
print(f"O104839 {subtotal + tax + shipping:.2f}")

subtotal = 120.0
tax = subtotal * TAX_RATES["TX"]
shipping = 0 if subtotal >= 50 else 5.99
print(f"O100043 {subtotal + tax + shipping:.2f}")

subtotal = 18.5
tax = 0
if "OR" in TAX_RATES:
    tax = subtotal * TAX_RATES["OR"]
shipping = 0 if subtotal >= 50 else 5.99
print(f"O101217 {subtotal + tax + shipping:.2f}")
`,
      answer: src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

def order_cost(subtotal, state, free_from=50):
    tax = 0
    if state in TAX_RATES:
        tax = subtotal * TAX_RATES[state]
    shipping = 0 if subtotal >= free_from else 5.99
    return subtotal + tax + shipping

print(f"O104839 {order_cost(40.0, 'CA'):.2f}")
print(f"O100043 {order_cost(120.0, 'TX'):.2f}")
print(f"O101217 {order_cost(18.5, 'OR'):.2f}")
`,
      alternatives: [
        src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

def order_cost(subtotal, state, free_from=50):
    rate = TAX_RATES[state] if state in TAX_RATES else 0
    if subtotal >= free_from:
        return subtotal * (1 + rate)
    return subtotal * (1 + rate) + 5.99

for order_id, subtotal, state in [("O104839", 40.0, "CA"), ("O100043", 120.0, "TX"), ("O101217", 18.5, "OR")]:
    print(order_id, f"{order_cost(subtotal, state):.2f}")
`,
      ],
      wrong: [
        {
          code: src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

def order_cost(subtotal, state, free_from=50):
    tax = subtotal * TAX_RATES[state]
    shipping = 0 if subtotal >= free_from else 5.99
    return subtotal + tax + shipping

print(f"O104839 {order_cost(40.0, 'CA'):.2f}")
print(f"O100043 {order_cost(120.0, 'TX'):.2f}")
`,
          fails: ["output", "returns"],
          why: "the guard for unknown states was lost, so an order from OR raises KeyError (and the third line was dropped)",
        },
        {
          code: src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

def order_cost(subtotal, state, free_from=50):
    tax = 0
    if state in TAX_RATES:
        tax = subtotal * TAX_RATES[state]
    shipping = 0 if subtotal >= 50 else 5.99
    return subtotal + tax + shipping

print(f"O104839 {order_cost(40.0, 'CA'):.2f}")
print(f"O100043 {order_cost(120.0, 'TX'):.2f}")
print(f"O101217 {order_cost(18.5, 'OR'):.2f}")
`,
          fails: ["returns"],
          why: "`free_from` is accepted but ignored: the limit is still a fixed 50",
        },
        {
          code: src`
TAX_RATES = {"CA": 0.0725, "TX": 0.0625, "NY": 0.04}

def order_cost(subtotal, state, free_from=50):
    tax = 0
    if state in TAX_RATES:
        tax = subtotal * TAX_RATES[state]
    shipping = 0 if subtotal >= free_from else 5.99
    print(f"{subtotal + tax + shipping:.2f}")

order_cost(40.0, "CA")
order_cost(120.0, "TX")
order_cost(18.5, "OR")
`,
          fails: ["output", "returns"],
          why: "the function prints instead of returning, so it can't be reused and the order IDs are gone",
        },
      ],
      task: {
        checks: [
          { kind: "output", id: "output", label: "The program prints the same three lines as before", expected: "O104839 48.89\nO100043 127.50\nO101217 24.49\n" },
          fn("returns", "order_cost", [
            example([40.0, "CA"], 48.89),
            example([120.0, "TX"], 127.5),
            example([18.5, "OR"], 24.49),
            hiddenCase("a state with no tax entry", [60, "WA"], py.float(60)),
            hiddenCase("a subtotal exactly at the free-shipping limit", [50, "NY"], py.float(52)),
            hiddenCase("a custom free-shipping limit", [80, "NY"], 89.19, { kwargs: { free_from: 100 } }),
            hiddenCase("a zero subtotal", [0, "CA"], 5.99),
          ], { label: "order_cost() adds tax and shipping for one order", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q09-22",
    version: 2,
    slug: "make-change",
    title: "Give change from the till",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 16,
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "whole-number", "none-value", "tuple-literal", "tuple-unpack", "list-literal", "list-mutate", "list-sort", "arithmetic", "comparison", "if-statement", "for-loop", "print-call", "unquoted-name", "top-level-indent", "print-several", "string-index", "membership", "precedence", "boolean", "while-loop", "nested-loop", "truthiness"],
    prompt: "A self-checkout pays out change in notes and coins, using as few as possible by always taking the largest denomination that still fits. Amounts are in cents, so there is no rounding. Return the change as `(denomination, count)` pairs, largest first, leaving out denominations that aren't used. If the customer paid too little, return `None`. The till can be set up with other denominations, given in any order.",
    spec: [
      ["Function", "`make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1))`"],
      ["price, paid", "whole numbers of cents"],
      ["Returns", "a list of `(denomination, count)` tuples, largest denomination first, counts above 0; `[]` for exact payment; `None` if `paid < price`"],
    ],
    hiddenKinds: ["exact payment", "too little paid", "denominations given smallest first", "several of the same note", "a custom set of denominations by name"],
    hints: [
      "Deal with the two special cases first: too little paid, and the amount of change itself.",
      "Go through the denominations from largest to smallest; `sorted(..., reverse=True)` (see Lists & Tuples) makes that true whatever order they arrive in.",
      "`//` gives how many of a denomination fit and `%` (or subtraction) what is left; only record a denomination that was used.",
    ],
    explanation: "The change is `paid - price`. Sorting the denominations largest first makes the greedy rule work for any order the till passes. For each one, `change // d` is how many fit; record the pair only when that is above 0, then reduce the change. The default is a tuple, an immutable value, which is the safe kind of default. Forgetting to sort, or recording zero counts, are the usual errors.",
    code: {
      starter: src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    return []

print(make_change(1337, 2000))
`,
      answer: src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    """Return (denomination, count) pairs for the change, largest first, or None if underpaid."""
    if paid < price:
        return None
    change = paid - price
    result = []
    for denomination in sorted(denominations, reverse=True):
        count = change // denomination
        if count > 0:
            result.append((denomination, count))
            change = change - count * denomination
    return result

print(make_change(1337, 2000))
`,
      alternatives: [
        src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    if paid < price:
        return None
    left = paid - price
    pieces = []
    ordered = sorted(denominations)
    ordered.reverse()
    for d in ordered:
        used = 0
        while left >= d:
            left -= d
            used += 1
        if used:
            pieces.append((d, used))
    return pieces
`,
      ],
      wrong: [
        {
          code: src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    if paid < price:
        return None
    change = paid - price
    result = []
    for denomination in denominations:
        count = change // denomination
        if count > 0:
            result.append((denomination, count))
            change = change - count * denomination
    return result
`,
          fails: ["returns"],
          why: "the denominations are used in the order given, so a till listing small coins first pays out hundreds of pennies",
        },
        {
          code: src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    if paid < price:
        return None
    change = paid - price
    result = []
    for denomination in sorted(denominations, reverse=True):
        count = change // denomination
        result.append((denomination, count))
        change = change - count * denomination
    return result
`,
          fails: ["returns"],
          why: "unused denominations are listed with a count of 0",
        },
        {
          code: src`
def make_change(price, paid, denominations=(2000, 1000, 500, 100, 25, 10, 5, 1)):
    change = paid - price
    result = []
    for denomination in sorted(denominations, reverse=True):
        count = change // denomination
        if count > 0:
            result.append((denomination, count))
            change = change - count * denomination
    return result
`,
          fails: ["returns"],
          why: "underpayment isn't caught, so the customer is told there is no change instead of being asked to pay more",
        },
      ],
      task: {
        checks: [
          fn("returns", "make_change", [
            example([1337, 2000], [tup(500, 1), tup(100, 1), tup(25, 2), tup(10, 1), tup(1, 3)]),
            example([499, 500], [tup(1, 1)]),
            example([800, 500], null),
            hiddenCase("exact payment", [1250, 1250], []),
            hiddenCase("several of the same note", [100, 5100], [tup(2000, 2), tup(1000, 1)]),
            hiddenCase("denominations given smallest first", [0, 130, [1, 5, 10, 25, 100]], [tup(100, 1), tup(25, 1), tup(5, 1)]),
            hiddenCase("a custom set of denominations by name", [10, 100], [tup(50, 1), tup(20, 2)], { kwargs: { denominations: [20, 50, 1] } }),
          ], { label: "make_change() pays out the fewest notes and coins, largest first" }),
        ],
      },
    },
  },
];
