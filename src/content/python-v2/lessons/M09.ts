/**
 * M09 Functions: five lessons (PY-L09-01 … PY-L09-05).
 *
 * def gives a block of code a name so it can be run again (PY-L09-01), parameters make one function work on any input
 * (PY-L09-02), return hands a result back so the caller can use it (PY-L09-03), defaults and local names make
 * functions convenient and self-contained (PY-L09-04), and docstrings plus small helpers calling each other make a
 * program out of reusable parts (PY-L09-05). Fixtures are Runtime Market orders, prices and stock (R01) and NOAA-style
 * daily readings (D07).
 *
 * Functions that print are graded by calling them and capturing what they print (an `expr` check with redirected
 * stdout). From PY-L09-03 on, challenges are graded by calling the learner's function with public and hidden inputs
 * and comparing the returned values. Version 2: rewritten from a "print Hello" module; saved progress from version 1
 * does not count as mastery.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** Re-run the whole program with other values for its input lines (hidden): it must print `output`. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, pv(v)])),
  output,
  hidden: true,
});
/** Call a function that prints and compare exactly what it printed. Hidden checks show only `label`. */
const printed = (id: string, label: string, call: string, expected: string, hidden = false): PyCheck => ({
  kind: "expr",
  id,
  label,
  ...(hidden ? { hidden: true } : { show: call }),
  expr: ["import io as _io, contextlib as _cl", "_buf = _io.StringIO()", "with _cl.redirect_stdout(_buf):", `    ${call}`, "result = _buf.getvalue()"].join("\n"),
  expected: py.str(expected),
});
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m09Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L09-01 def and call
  {
    id: "PY-L09-01",
    version: 2,
    slug: "define-a-function",
    title: "Define a function and call it",
    lede: "def gives a block of code a name. Nothing in the block runs until the name is called, and each call runs the whole block again.",
    focus: "Wrap lines you need more than once in a function, and run them by calling it.",
    minutes: 15,
    objectives: [
      "Write a function with `def name():` and an indented body",
      "Explain that defining a function runs nothing, and calling it runs the body from the top",
      "Recognise the two first mistakes: calling before the def, and forgetting the parentheses",
    ],
    requires: ["print-call", "print-text", "print-several", "print-blank", "top-level-indent", "spaces-in-text", "assignment", "string-value", "whole-number", "decimal-number", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "tuple-unpack", "for-loop", "if-statement", "else-clause", "comparison", "membership", "string-index", "string-format", "runtime-error", "unquoted-name", "list-literal", "list-mutate", "list-index", "tuple-literal", "arithmetic", "conditional-expr", "reassignment"],
    teaches: ["function-def"],
    blocks: [
      {
        kind: "text",
        md: "Programs repeat themselves. A shop prints the same opening hours at the top of a page and again at the bottom of an email; a stock report runs in the morning and again after a delivery. Copying the lines works until something changes, and then every copy has to be fixed.\n\nA **function** gives a block of code a name. `def show_hours():` starts it; the indented lines under it are its **body**. Defining the function runs nothing. Writing `show_hours()`, the name with parentheses, is a **call**: the body runs from the top, then the program carries on after the call.",
      },
      {
        kind: "example",
        title: "Opening hours, written once",
        code: src`
def show_hours():
    print("Mon-Fri  09:00-18:00")
    print("Sat      10:00-16:00")
    print("Sun      closed")

print("Runtime Market, opening hours")
show_hours()
print()
print("Your order has shipped. Visit us:")
show_hours()
`,
        output: "Runtime Market, opening hours\nMon-Fri  09:00-18:00\nSat      10:00-16:00\nSun      closed\n\nYour order has shipped. Visit us:\nMon-Fri  09:00-18:00\nSat      10:00-16:00\nSun      closed\n",
        note: "The `def` block printed nothing when Python read it. The first print comes from the line after it. Each `show_hours()` runs all three lines of the body, so changing the Saturday hours later means editing one line.",
      },
      {
        kind: "error-example",
        title: "Calling before the def",
        code: src`
print("Opening hours:")
show_hours()

def show_hours():
    print("Mon-Fri  09:00-18:00")
`,
        error: "NameError",
        output: "Opening hours:\n",
        note: "Python runs from the top. When it reaches `show_hours()`, the `def` hasn't run yet, so the name doesn't exist: `NameError: name 'show_hours' is not defined`. Put every `def` above the code that calls it.",
      },
      {
        kind: "text",
        md: "A function's body can hold anything you have learned: loops, `if`, dictionaries. It can also read names defined at the top of the program. It reads their values **at the moment it is called**, not when it was defined, so the same call can report something different later in the program.",
      },
      {
        kind: "example",
        title: "A stock report run twice",
        code: src`
stock = {"P0607": 2, "P0208": 14, "P0659": 0}

def report_low_stock():
    for product_id, units in stock.items():
        if units < 3:
            print("low:", product_id, units)
    print("end of report")

report_low_stock()
stock["P0659"] = 20
report_low_stock()
`,
        output: "low: P0607 2\nlow: P0659 0\nend of report\nlow: P0607 2\nend of report\n",
        note: "The second call sees the delivery of 20 units, because it reads `stock` when it runs. The function depends on a name outside itself; the next lesson passes the data in instead, so one function can report on any stock dictionary.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the same steps are needed in more than one place, or when a block does one job you can name (`report_low_stock` says what the lines do). **Mistakes to avoid:**\n\n- Calling a function above its `def`.\n- Forgetting the parentheses: `show_hours` on its own line names the function but doesn't call it, so nothing happens.\n- Indenting the call under the `def`, which makes the call part of the body.",
      },
    ],
    tryIt: {
      id: "try",
      title: "One more line on every receipt",
      prompt: "Both receipts print the shop's header from one function. Add the line `Open daily 09:00-18:00` as the last line of the header, so **both** receipts show it. Change only the function.",
      spec: [
        ["Function", "`print_header()`"],
        ["Prints", "the shop name, the phone line, then `Open daily 09:00-18:00`"],
      ],
      starter: src`
def print_header():
    print("Runtime Market")
    print("Tel 555-0142")

print_header()
print("Order O104839  113.49")
print_header()
print("Order O100043  12.48")
`,
      answer: src`
def print_header():
    print("Runtime Market")
    print("Tel 555-0142")
    print("Open daily 09:00-18:00")

print_header()
print("Order O104839  113.49")
print_header()
print("Order O100043  12.48")
`,
      wrong: [
        {
          code: src`
def print_header():
    print("Runtime Market")
    print("Tel 555-0142")

print_header()
print("Open daily 09:00-18:00")
print("Order O104839  113.49")
print_header()
print("Order O100043  12.48")
`,
          fails: ["header", "output"],
          why: "the line is printed once outside the function, so only the first receipt shows it",
        },
      ],
      hints: ["Everything the header prints lives in the function's body.", "A new line in the body runs on every call.", "Indent the new print to the same depth as the other two."],
      task: {
        checks: [
          out("Runtime Market\nTel 555-0142\nOpen daily 09:00-18:00\nOrder O104839  113.49\nRuntime Market\nTel 555-0142\nOpen daily 09:00-18:00\nOrder O100043  12.48\n"),
          printed("header", "print_header() prints all three header lines", "print_header()", "Runtime Market\nTel 555-0142\nOpen daily 09:00-18:00\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A shipping notice",
        prompt: "Write a function `print_shipping_notice()` that prints two lines about the order stored in `order`: `Order <id> ships to <city>, <state>`, then `Free shipping` if the total is 50 or more, otherwise `Shipping 5.99`. The program then calls it once.",
        spec: [
          ["Function", "`print_shipping_notice()`, no parameters; it reads `order`"],
          ["order", "a dictionary with `order_id`, `city`, `state` and `total`"],
          ["Prints", "`Order <id> ships to <city>, <state>`, then `Free shipping` (total ≥ 50) or `Shipping 5.99`"],
          ["Example", "the starter's order prints `Order O104839 ships to Miami, FL` and `Free shipping`"],
        ],
        starter: src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}
`,
        answer: src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}

def print_shipping_notice():
    print(f"Order {order['order_id']} ships to {order['city']}, {order['state']}")
    if order["total"] >= 50:
        print("Free shipping")
    else:
        print("Shipping 5.99")

print_shipping_notice()
`,
        alternatives: [
          src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}

def print_shipping_notice():
    place = order["city"] + ", " + order["state"]
    print("Order", order["order_id"], "ships to", place)
    fee = "Free shipping" if order["total"] >= 50 else "Shipping 5.99"
    print(fee)

print_shipping_notice()
`,
        ],
        wrong: [
          {
            code: src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}
print(f"Order {order['order_id']} ships to {order['city']}, {order['state']}")
if order["total"] >= 50:
    print("Free shipping")
else:
    print("Shipping 5.99")
`,
            fails: ["function"],
            why: "the lines are printed directly, so there is no function to call again for the next order",
          },
          {
            code: src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}

def print_shipping_notice():
    print(f"Order {order['order_id']} ships to {order['city']}, {order['state']}")
    if order["total"] > 50:
        print("Free shipping")
    else:
        print("Shipping 5.99")

print_shipping_notice()
`,
            fails: ["exactly-50"],
            why: "`> 50` charges shipping on an order of exactly 50",
          },
          {
            code: src`
order = {"order_id": "O104839", "city": "Miami", "state": "FL", "total": 113.49}

def print_shipping_notice():
    print(f"Order {order['order_id']} ships to {order['city']}, {order['state']}")
    if order["total"] >= 50:
        print("Free shipping")
    else:
        print("Shipping 5.99")
`,
            fails: ["exactly-50", "output", "small"],
            why: "the function is defined but never called, so the program prints nothing",
          },
        ],
        hints: [
          "Define a function with that name and empty parentheses, and put both prints in its indented body.",
          "Inside the body, read the fields from `order` as usual; an `if`/`else` picks the second line.",
          "After the function, at the left edge, call it once so the program prints the notice.",
        ],
        task: {
          checks: [
            out("Order O104839 ships to Miami, FL\nFree shipping\n"),
            printed("function", "print_shipping_notice() prints the notice when called", "print_shipping_notice()", "Order O104839 ships to Miami, FL\nFree shipping\n"),
            rerun("small", "a small order", { order: { order_id: "O100043", city: "Denver", state: "CO", total: 12.48 } }, "Order O100043 ships to Denver, CO\nShipping 5.99\n"),
            rerun("exactly-50", "an order of exactly 50", { order: { order_id: "O1", city: "Austin", state: "TX", total: 50 } }, "Order O1 ships to Austin, TX\nFree shipping\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Print the cart, before and after",
        prompt: "A checkout page shows the cart in aligned columns and shows it again after the customer adds an item. Write `print_cart()`: for each `(name, quantity, unit_price)` in `cart`, print the name left-aligned in 18 characters, `x` and the quantity, and the line amount right-aligned in 8 characters with two decimals. Finish with `Total` and the total in the same columns. The starter already calls it, adds an item and calls it again.",
        spec: [
          ["Function", "`print_cart()`, no parameters; it reads `cart`"],
          ["Line", "`f\"{name:<18}x{quantity:<3}{amount:>8.2f}\"` where amount is quantity × unit price"],
          ["Last line", "`f\"{'Total':<22}{total:>8.2f}\"`"],
          ["Example", "the first call prints `Travel Yoga Mat   x1     24.50`, `Nordic Candle     x3     23.97`, `Total                    48.47`"],
        ],
        starter: src`
cart = [("Travel Yoga Mat", 1, 24.5), ("Nordic Candle", 3, 7.99)]

print_cart()
cart.append(("Ultra Bike Light", 2, 12.0))
print_cart()
`,
        answer: src`
cart = [("Travel Yoga Mat", 1, 24.5), ("Nordic Candle", 3, 7.99)]

def print_cart():
    total = 0
    for name, quantity, unit_price in cart:
        amount = quantity * unit_price
        total = total + amount
        print(f"{name:<18}x{quantity:<3}{amount:>8.2f}")
    print(f"{'Total':<22}{total:>8.2f}")

print_cart()
cart.append(("Ultra Bike Light", 2, 12.0))
print_cart()
`,
        alternatives: [
          src`
cart = [("Travel Yoga Mat", 1, 24.5), ("Nordic Candle", 3, 7.99)]

def print_cart():
    total = 0
    for line in cart:
        name = line[0]
        quantity = line[1]
        amount = line[1] * line[2]
        print(f"{name:<18}x{quantity:<3}{amount:>8.2f}")
        total += amount
    label = "Total"
    print(f"{label:<22}{total:>8.2f}")

print_cart()
cart.append(("Ultra Bike Light", 2, 12.0))
print_cart()
`,
        ],
        wrong: [
          {
            code: src`
cart = [("Travel Yoga Mat", 1, 24.5), ("Nordic Candle", 3, 7.99)]

def print_cart():
    total = 0
    for name, quantity, unit_price in cart:
        amount = quantity * unit_price
        print(f"{name:<18}x{quantity:<3}{amount:>8.2f}")
    print(f"{'Total':<22}{total:>8.2f}")

print_cart()
cart.append(("Ultra Bike Light", 2, 12.0))
print_cart()
`,
            fails: ["empty", "function", "output", "single"],
            why: "the total is never added up, so it always prints 0.00",
          },
          {
            code: src`
cart = [("Travel Yoga Mat", 1, 24.5), ("Nordic Candle", 3, 7.99)]

def print_cart():
    total = 0
    for name, quantity, unit_price in cart:
        amount = quantity * unit_price
        total = total + amount
        print(f"{name:<18}x{quantity:<3}{amount:>8.2f}")
        print(f"{'Total':<22}{total:>8.2f}")

print_cart()
cart.append(("Ultra Bike Light", 2, 12.0))
print_cart()
`,
            fails: ["empty", "function", "output", "single"],
            why: "the total line is indented into the loop, so a running total is printed after every item",
          },
        ],
        hints: [
          "Define `print_cart` above the first call, so the name exists when it is used.",
          "Inside, start a total at 0, loop over `cart` unpacking each tuple, print each line and add its amount.",
          "The total line comes after the loop, at the body's indentation, so it prints once per call.",
        ],
        task: {
          checks: [
            out("Travel Yoga Mat   x1     24.50\nNordic Candle     x3     23.97\nTotal                    48.47\nTravel Yoga Mat   x1     24.50\nNordic Candle     x3     23.97\nUltra Bike Light  x2     24.00\nTotal                    72.47\n"),
            printed("function", "print_cart() prints the cart as it is now", "print_cart()", "Travel Yoga Mat   x1     24.50\nNordic Candle     x3     23.97\nUltra Bike Light  x2     24.00\nTotal                    72.47\n"),
            rerun("single", "a cart with one item", { cart: [tup("Deluxe Vase", 1, 40)] }, "Deluxe Vase       x1     40.00\nTotal                    40.00\nDeluxe Vase       x1     40.00\nUltra Bike Light  x2     24.00\nTotal                    64.00\n"),
            rerun("empty", "an empty cart", { cart: [] }, "Total                     0.00\nUltra Bike Light  x2     24.00\nTotal                    24.00\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def show_banner():
    print("SALE")

print("start")
show_banner()
show_banner()
print("end")
`,
        choices: ["start\nSALE\nSALE\nend", "SALE\nstart\nSALE\nSALE\nend", "start\nSALE\nend", "start\nend"],
        answer: 0,
        why: "Defining `show_banner` prints nothing. Each call runs the body once, in the order the calls appear.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the parentheses are missing. What does this print?",
        program: src`
def show_banner():
    print("SALE")

print("start")
show_banner
print("end")
`,
        choices: ["start\nend", "start\nSALE\nend", "SALE\nstart\nend", "NameError"],
        answer: 0,
        why: "`show_banner` without parentheses only names the function, so its body never runs. Add `()` to call it.",
      },
      {
        id: "q3",
        prompt: "When is a function the right tool?",
        choices: ["The same steps are needed in several places in the program", "A value is used only once", "You want a line to run before the program starts", "You want to store several values under keys"],
        answer: 0,
        why: "A function names a block so it can be run again from anywhere after its def. Storing values under keys is a dictionary's job.",
      },
    ],
    review: [
      "`def name():` plus an indented body defines a function; nothing in the body runs yet.",
      "`name()` runs the whole body from the top, as often as you call it, after the def.",
      "A function that reads an outer name sees its value at the moment of the call.",
      "Next: parameters, so the data comes in through the call instead of from outside names.",
    ],
  },

  // ------------------------------------------------------------------ PY-L09-02 parameters
  {
    id: "PY-L09-02",
    version: 2,
    slug: "parameters",
    title: "Pass values in with parameters",
    lede: "A parameter is a name in the def's parentheses. Each call passes an argument, and the body uses it under that name, so one function works for any input.",
    focus: "Give a function parameters, and pass arguments by position or by name when you call it.",
    minutes: 16,
    objectives: [
      "Define a function with one or more parameters and call it with matching arguments",
      "Pass arguments by position and by name (`price=4.5`)",
      "Read the TypeError for a missing argument and fix the call",
    ],
    requires: ["function-def", "assignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "for-loop", "membership", "len-call", "string-format", "string-index", "list-literal", "list-index", "tuple-literal", "tuple-unpack", "runtime-error", "logical", "nested-condition", "reassignment", "unicode-text", "enumerate-call"],
    teaches: ["function-param"],
    blocks: [
      {
        kind: "text",
        md: "The stock report in the last lesson could only report on one dictionary, the one named `stock`. A **parameter** fixes that. `def print_label(product, price):` says: this function needs two values, and inside the body they are called `product` and `price`.\n\nA call supplies the **arguments**: `print_label(\"Nordic Candle\", 7.99)`. Python matches them up by position (first argument to the first parameter, and so on), then runs the body. Each call can pass different values.",
      },
      {
        kind: "example",
        title: "One label function, any product",
        code: src`
def print_label(product, price):
    print(f"{product:<20}{price:>8.2f}")

print_label("Nordic Candle", 7.99)
print_label("Travel Yoga Mat", 24.5)
print_label(price=171.99, product="Organic Speaker")
`,
        output: "Nordic Candle           7.99\nTravel Yoga Mat        24.50\nOrganic Speaker       171.99\n",
        note: "The third call passes the arguments **by name**, so their order doesn't matter. That is useful when a function has several parameters and the call should say which value is which.",
      },
      {
        kind: "error-example",
        title: "A missing argument",
        code: src`
def print_label(product, price):
    print(f"{product:<20}{price:>8.2f}")

print_label("Deluxe Vase")
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: print_label() missing 1 required positional argument: 'price'`. The message names the parameter that got no value. Too many arguments is a TypeError too.",
      },
      {
        kind: "text",
        md: "A parameter can hold any value: a number, a text, a list of readings. The body uses it like any other name. Here one function prints a daily weather summary for whichever station and readings it is given, so it can be called for every station in a loop.",
      },
      {
        kind: "example",
        title: "A daily summary for any station",
        code: src`
def print_day_summary(station, readings):
    high = readings[0]
    low = readings[0]
    for temp in readings:
        if temp > high:
            high = temp
        if temp < low:
            low = temp
    print(f"{station}: {len(readings)} readings, low {low}, high {high}")

print_day_summary("Denver", [4.1, 9.8, 15.2, 11.0])
print_day_summary("Miami", [24.3, 29.1, 27.5])
for station, temps in [("Boise", [-2.5, 3.0]), ("Austin", [18.0])]:
    print_day_summary(station, temps)
`,
        output: "Denver: 4 readings, low 4.1, high 15.2\nMiami: 3 readings, low 24.3, high 29.1\nBoise: 2 readings, low -2.5, high 3.0\nAustin: 1 readings, low 18.0, high 18.0\n",
        note: "`readings` is whatever list the caller passed. The loop variables `station` and `temps` at the bottom are separate names that happen to be passed in.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever the function's job is the same but the data changes. **Mistakes to avoid:**\n\n- Passing arguments in the wrong order: `print_label(7.99, \"Nordic Candle\")` puts the price in `product`. Pass by name when the order is easy to mix up.\n- Calling with too few or too many arguments.\n- Reading an outer name inside the body when the value should come in as a parameter.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Say which currency",
      prompt: "`print_price` always prints dollars. Give it a second parameter, `symbol`, and print the symbol in front of the price instead of `$`. The calls at the bottom already pass a symbol.",
      spec: [
        ["Function", "`print_price(price, symbol)`"],
        ["Prints", "the symbol then the price with two decimals, e.g. `€19.90`"],
      ],
      starter: src`
def print_price(price):
    print(f"${"$"}{price:.2f}")

print_price(19.9, "€")
print_price(5, "£")
`,
      answer: src`
def print_price(price, symbol):
    print(f"{symbol}{price:.2f}")

print_price(19.9, "€")
print_price(5, "£")
`,
      wrong: [
        {
          code: src`
def print_price(price, symbol):
    print(f"${"$"}{price:.2f}")

print_price(19.9, "€")
print_price(5, "£")
`,
          fails: ["output", "yen"],
          why: "the parameter is added but never used, so every price still shows `$`",
        },
      ],
      hints: ["The def line needs a second name in its parentheses.", "Inside the f-string, replace the fixed `$` with the new parameter in braces.", "Keep `:.2f` on the price so it still shows two decimals."],
      task: {
        checks: [
          out("€19.90\n£5.00\n"),
          printed("yen", "print_price() uses the symbol it is given", "print_price(1200, \"¥\")", "¥1200.00\n", true),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Stock status line",
        prompt: "Write `print_stock_status(product, units, reorder_level)`. It prints `<product>: <units> left`, and then one more line: `OUT OF STOCK` when units is 0, `reorder now` when units is at or below the reorder level, and nothing more otherwise.",
        spec: [
          ["Function", "`print_stock_status(product, units, reorder_level)`"],
          ["Prints", "`<product>: <units> left`, then `OUT OF STOCK` (0 units) or `reorder now` (units ≤ reorder level), or no second line"],
          ["Example", "`print_stock_status(\"Deluxe Vase\", 3, 5)` prints `Deluxe Vase: 3 left` and `reorder now`"],
        ],
        starter: src`
def print_stock_status(product, units, reorder_level):
    print(product)

print_stock_status("Deluxe Vase", 3, 5)
print_stock_status("Studio Tent", 0, 2)
print_stock_status("Nordic Candle", 40, 10)
`,
        answer: src`
def print_stock_status(product, units, reorder_level):
    print(f"{product}: {units} left")
    if units == 0:
        print("OUT OF STOCK")
    elif units <= reorder_level:
        print("reorder now")

print_stock_status("Deluxe Vase", 3, 5)
print_stock_status("Studio Tent", 0, 2)
print_stock_status("Nordic Candle", 40, 10)
`,
        alternatives: [
          src`
def print_stock_status(product, units, reorder_level):
    print(product + ":", units, "left")
    if units <= reorder_level:
        if units == 0:
            print("OUT OF STOCK")
        else:
            print("reorder now")

print_stock_status("Deluxe Vase", 3, 5)
print_stock_status("Studio Tent", 0, 2)
print_stock_status("Nordic Candle", 40, 10)
`,
        ],
        wrong: [
          {
            code: src`
def print_stock_status(product, units, reorder_level):
    print(f"{product}: {units} left")
    if units <= reorder_level:
        print("reorder now")
    elif units == 0:
        print("OUT OF STOCK")
`,
            fails: ["empty"],
            why: "0 is also at or below the reorder level, so the out-of-stock test is never reached",
          },
          {
            code: src`
def print_stock_status(product, units, reorder_level):
    print(f"{product}: {units} left")
    if units == 0:
        print("OUT OF STOCK")
    elif units < reorder_level:
        print("reorder now")
`,
            fails: ["at-level"],
            why: "`<` misses a product sitting exactly at its reorder level",
          },
          {
            code: src`
def print_stock_status(product, units, reorder_level):
    print(f"{product}: {units} left")
    if units == 0:
        print("OUT OF STOCK")
    elif units <= 5:
        print("reorder now")
`,
            fails: ["at-level", "high-level"],
            why: "the level is fixed at 5 instead of using the `reorder_level` argument",
          },
        ],
        hints: [
          "The first line is always printed; build it from `product` and `units`.",
          "Then decide between three cases with `if`/`elif`. Which test must come first, since 0 is also below every level?",
          "\"At or below\" includes the level itself, and the level is whatever the caller passed.",
        ],
        task: {
          checks: [
            printed("plenty", "print_stock_status() prints one line when stock is fine", "print_stock_status(\"Travel Yoga Mat\", 21, 4)", "Travel Yoga Mat: 21 left\n"),
            printed("at-level", "units exactly at the reorder level", "print_stock_status(\"Ultra Bike Light\", 14, 14)", "Ultra Bike Light: 14 left\nreorder now\n", true),
            printed("empty", "a product with no units", "print_stock_status(\"Organic Speaker\", 0, 6)", "Organic Speaker: 0 left\nOUT OF STOCK\n", true),
            printed("high-level", "a high reorder level", "print_stock_status(\"Nordic Candle\", 12, 20)", "Nordic Candle: 12 left\nreorder now\n", true),
          ],
        },
      },
      {
        id: "c2",
        title: "A temperature table in two scales",
        prompt: "Write `print_temperatures(city, readings)`. The readings are in °C. Print a heading `<city> (<n> days)`, then one line per reading: the day number from 1, the °C value and the °F value (`c * 9 / 5 + 32`), as `day 1: 18.5 C = 65.3 F` with one decimal each. If `readings` is empty, print `<city>: no readings` instead of the heading.",
        spec: [
          ["Function", "`print_temperatures(city, readings)`"],
          ["Line", "`f\"day {n}: {c:.1f} C = {f:.1f} F\"`, days numbered from 1"],
          ["Empty", "`<city>: no readings` and nothing else"],
          ["Example", "`print_temperatures(\"Denver\", [18.5, -3])` prints `Denver (2 days)`, `day 1: 18.5 C = 65.3 F`, `day 2: -3.0 C = 26.6 F`"],
        ],
        starter: src`
def print_temperatures(city, readings):
    print(city)

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
        answer: src`
def print_temperatures(city, readings):
    if len(readings) == 0:
        print(f"{city}: no readings")
    else:
        print(f"{city} ({len(readings)} days)")
        for day, c in enumerate(readings, 1):
            f = c * 9 / 5 + 32
            print(f"day {day}: {c:.1f} C = {f:.1f} F")

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
        alternatives: [
          src`
def print_temperatures(city, readings):
    if not readings:
        print(city + ": no readings")
    else:
        print(f"{city} ({len(readings)} days)")
        day = 1
        for c in readings:
            print(f"day {day}: {c:.1f} C = {c * 9 / 5 + 32:.1f} F")
            day = day + 1

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
        ],
        wrong: [
          {
            code: src`
def print_temperatures(city, readings):
    print(f"{city} ({len(readings)} days)")
    for day, c in enumerate(readings, 1):
        f = c * 9 / 5 + 32
        print(f"day {day}: {c:.1f} C = {f:.1f} F")

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
            fails: ["empty"],
            why: "an empty list prints `Boise (0 days)` instead of saying there are no readings",
          },
          {
            code: src`
def print_temperatures(city, readings):
    if len(readings) == 0:
        print(f"{city}: no readings")
    else:
        print(f"{city} ({len(readings)} days)")
        for day, c in enumerate(readings, 1):
            f = c * 9 / (5 + 32)
            print(f"day {day}: {c:.1f} C = {f:.1f} F")

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
            fails: ["freezing", "single"],
            why: "the brackets change the formula: it divides by 37 instead of adding 32",
          },
          {
            code: src`
def print_temperatures(city, readings):
    if len(readings) == 0:
        print(f"{city}: no readings")
    else:
        print(f"{city} ({len(readings)} days)")
        for day, c in enumerate(readings):
            f = c * 9 / 5 + 32
            print(f"day {day}: {c:.1f} C = {f:.1f} F")

print_temperatures("Denver", [18.5, -3])
print_temperatures("Boise", [])
`,
            fails: ["freezing", "single"],
            why: "`enumerate` counts from 0 unless told otherwise, so the first day is day 0",
          },
        ],
        hints: [
          "Check for the empty list first; the heading and the lines belong in the other branch.",
          "`enumerate(readings, 1)` (see Loops & Iteration) gives a day number starting at 1 with each reading.",
          "Convert inside the loop and let the f-string's `:.1f` do the rounding for display.",
        ],
        task: {
          checks: [
            printed("single", "print_temperatures() with one reading", "print_temperatures(\"Miami\", [29.1])", "Miami (1 days)\nday 1: 29.1 C = 84.4 F\n"),
            printed("empty", "an empty list of readings", "print_temperatures(\"Reno\", [])", "Reno: no readings\n", true),
            printed("freezing", "readings at and below freezing", "print_temperatures(\"Fargo\", [0, -40, 21])", "Fargo (3 days)\nday 1: 0.0 C = 32.0 F\nday 2: -40.0 C = -40.0 F\nday 3: 21.0 C = 69.8 F\n", true),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def describe(item, quantity):
    print(quantity, "x", item)

describe("Nordic Candle", 3)
describe(quantity=1, item="Deluxe Vase")
describe(2, "Studio Tent")
`,
        choices: ["3 x Nordic Candle\n1 x Deluxe Vase\nStudio Tent x 2", "3 x Nordic Candle\n1 x Deluxe Vase\n2 x Studio Tent", "Nordic Candle x 3\nDeluxe Vase x 1\nStudio Tent x 2", "3 x Nordic Candle\nDeluxe Vase x 1\nStudio Tent x 2"],
        answer: 0,
        why: "Positional arguments fill parameters in order, so the last call puts 2 in `item` and \"Studio Tent\" in `quantity`. The named call works whatever the order.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the function reads an outer name instead of its parameter. What does this print?",
        program: src`
city = "Denver"

def print_city(name):
    print("Shipping to", city)

print_city("Miami")
print_city("Boise")
`,
        choices: ["Shipping to Denver\nShipping to Denver", "Shipping to Miami\nShipping to Boise", "Shipping to name\nShipping to name", "TypeError"],
        answer: 0,
        why: "The body uses `city`, the outer name, not the parameter `name`. The arguments arrive but are never read. Use the parameter.",
      },
      {
        id: "q3",
        prompt: "`def ship(order_id, city, express):` is called as `ship(\"O1\", \"Miami\")`. What happens?",
        choices: ["TypeError: missing 1 required positional argument: 'express'", "express is None", "express is False", "It prints nothing"],
        answer: 0,
        why: "Every parameter without a default needs an argument. A default value, next lesson but one, is how a parameter becomes optional.",
      },
    ],
    review: [
      "Parameters are the names in the def's parentheses; arguments are the values in the call.",
      "Arguments match parameters by position, or by name with `name=value`.",
      "A missing or extra argument is a TypeError that names the problem.",
      "Next: instead of printing, hand a result back with return so the caller can use it.",
    ],
  },

  // ------------------------------------------------------------------ PY-L09-03 return
  {
    id: "PY-L09-03",
    version: 2,
    slug: "return-a-value",
    title: "Return a result",
    lede: "return hands a value back to the caller and ends the function. A function without return gives back None, which is why printing is not the same as returning.",
    focus: "Return a value from a function so the caller can store it, compare it or pass it on.",
    minutes: 18,
    objectives: [
      "Return a computed value and use the call inside an expression",
      "Return early from inside an `if` or a loop, and return None when nothing is found",
      "Explain the difference between printing a value and returning it",
    ],
    requires: ["function-def", "function-param", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-format", "string-index", "list-literal", "list-index", "tuple-literal", "tuple-unpack", "runtime-error", "print-number", "truthiness"],
    teaches: ["function-return"],
    blocks: [
      {
        kind: "text",
        md: "A function that prints shows a value to a person, but the program can't use it: it can't add it to a total or compare it. `return value` hands the value back to the code that called the function. The call itself then **is** that value, so `line_total(2, 6.49) + 5` works like any other sum.\n\n`return` also ends the function at once. A function that reaches its end without a `return` gives back `None`.",
      },
      {
        kind: "example",
        title: "Line totals the program can add up",
        code: src`
def line_total(quantity, unit_price):
    return quantity * unit_price

first = line_total(2, 6.49)
second = line_total(1, 51.49)
subtotal = first + second
print(f"{first:.2f} + {second:.2f} = {subtotal:.2f}")
print(line_total(3, 10) > 25)
`,
        output: "12.98 + 51.49 = 64.47\nTrue\n",
        note: "Each call is replaced by the value it returns. The function itself prints nothing: the caller decides what to do with the result.",
      },
      {
        kind: "error-example",
        title: "Printing instead of returning",
        code: src`
def shipping_fee(subtotal):
    if subtotal >= 50:
        print(0)
    else:
        print(5.99)

total = 12.48 + shipping_fee(12.48)
`,
        error: "TypeError",
        output: "5.99\n",
        note: "The fee is shown, but the function returns None, so the addition fails: `TypeError: unsupported operand type(s) for +: 'float' and 'NoneType'`. Replace each `print` with `return`.",
      },
      {
        kind: "text",
        md: "A function can have several `return` lines; the first one reached wins. That makes decisions read clearly: test a case, return its answer, and the code below only runs for the other cases. Inside a loop, `return` stops the search as soon as the answer is known, and a `return None` after the loop says *not found*.",
      },
      {
        kind: "example",
        title: "Shipping rules and the first late order",
        code: src`
def shipping_fee(subtotal, country):
    if country != "US":
        return 12.0
    if subtotal >= 50:
        return 0
    return 5.99

def first_late(deliveries, limit):
    for order_id, days in deliveries:
        if days > limit:
            return order_id
    return None

print(shipping_fee(64.47, "US"), shipping_fee(12.48, "US"), shipping_fee(80, "CA"))
deliveries = [("O100043", 3), ("O101217", 9), ("O108752", 12)]
print(first_late(deliveries, 7), first_late(deliveries, 20))
`,
        output: "0 5.99 12.0\nO101217 None\n",
        note: "`first_late` stops at O101217 and never looks at O108752. When no delivery is late the loop finishes and the final `return None` runs. Callers can test the result with `is None`.",
      },
      {
        kind: "text",
        md: "**When to use it:** almost always. Return the result and let the caller print it; a function that returns can be printed, stored, tested and reused, while a function that prints can only be read. **Mistakes to avoid:**\n\n- Printing inside the function when the caller needs the value.\n- Putting `return` inside a loop when every item must be checked first: it stops on the first pass.\n- Forgetting the `return None` (or a final return) for the case where nothing matches.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Return the price with tax",
      prompt: "`with_tax` prints its result, so the total at the bottom fails. Make it **return** the price times `1 + rate` instead, then run it: the program should print the total of both prices with tax.",
      spec: [
        ["Function", "`with_tax(price, rate)`"],
        ["Returns", "`price * (1 + rate)`"],
      ],
      starter: src`
def with_tax(price, rate):
    print(price * (1 + rate))

total = with_tax(20, 0.08) + with_tax(5, 0.08)
print(f"{total:.2f}")
`,
      answer: src`
def with_tax(price, rate):
    return price * (1 + rate)

total = with_tax(20, 0.08) + with_tax(5, 0.08)
print(f"{total:.2f}")
`,
      wrong: [
        {
          code: src`
def with_tax(price, rate):
    return price * rate

total = with_tax(20, 0.08) + with_tax(5, 0.08)
print(f"{total:.2f}")
`,
          fails: ["output", "returns"],
          why: "it returns only the tax, not the price with tax",
        },
      ],
      hints: ["Only the line inside the function changes.", "`return` hands the value back to the call.", "Keep the same formula; swap `print(...)` for `return ...`."],
      task: {
        checks: [
          out("27.00\n"),
          fn("returns", "with_tax", [
            example([20, 0.08], 21.6),
            hiddenCase("a zero rate", [9.5, 0], 9.5),
            hiddenCase("a 20% rate", [50, 0.2], py.float(60)),
          ], { label: "with_tax() returns the price including tax", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Cinema ticket price",
        prompt: "Write `ticket_price(age, student)`: return the price of one cinema ticket. Children under 12 pay 6.0, people aged 65 or over pay 7.5, students (of any other age) pay 9.0, and everyone else pays 12.0. `student` is True or False.",
        spec: [
          ["Function", "`ticket_price(age, student)`"],
          ["Returns", "6.0 (under 12), 7.5 (65 and over), 9.0 (student), otherwise 12.0"],
          ["Order", "the age rules come first: a 10-year-old student pays the child price"],
          ["Example", "`ticket_price(30, False)` → `12.0`; `ticket_price(20, True)` → `9.0`"],
        ],
        starter: src`
def ticket_price(age, student):
    return 0

print(ticket_price(30, False))
print(ticket_price(20, True))
`,
        answer: src`
def ticket_price(age, student):
    if age < 12:
        return 6.0
    if age >= 65:
        return 7.5
    if student:
        return 9.0
    return 12.0

print(ticket_price(30, False))
print(ticket_price(20, True))
`,
        alternatives: [
          src`
def ticket_price(age, student):
    price = 12.0
    if age < 12:
        price = 6.0
    elif age >= 65:
        price = 7.5
    elif student:
        price = 9.0
    return price
`,
        ],
        wrong: [
          {
            code: src`
def ticket_price(age, student):
    if student:
        return 9.0
    if age < 12:
        return 6.0
    if age >= 65:
        return 7.5
    return 12.0
`,
            fails: ["returns"],
            why: "the student test runs first, so a young or retired student pays more than the age price",
          },
          {
            code: src`
def ticket_price(age, student):
    if age <= 12:
        return 6.0
    if age > 65:
        return 7.5
    if student:
        return 9.0
    return 12.0
`,
            fails: ["returns"],
            why: "the boundaries are off by one: a 12-year-old gets the child price and a 65-year-old pays full price",
          },
          {
            code: src`
def ticket_price(age, student):
    if age < 12:
        print(6.0)
    elif age >= 65:
        print(7.5)
    elif student:
        print(9.0)
    else:
        print(12.0)
`,
            fails: ["returns"],
            why: "the price is printed, not returned, so the caller gets None",
          },
        ],
        hints: [
          "Four outcomes, so four `return` lines (or one variable and one return at the end).",
          "The order of the tests decides the answer for a 10-year-old student.",
          "\"Under 12\" excludes 12; \"65 or over\" includes 65.",
        ],
        task: {
          checks: [
            fn("returns", "ticket_price", [
              example([30, false], py.float(12)),
              example([20, true], py.float(9)),
              example([8, false], py.float(6)),
              hiddenCase("ages exactly 12 and 65", [12, false], py.float(12)),
              hiddenCase("a senior on the boundary", [65, false], 7.5),
              hiddenCase("a child who is also a student", [10, true], py.float(6)),
              hiddenCase("a retired student", [70, true], 7.5),
            ], { label: "ticket_price() applies the age rules before the student discount" }),
          ],
        },
      },
      {
        id: "c2",
        title: "The first frost",
        prompt: "A gardening app warns about the first frost of the season. Write `first_frost(days)`: `days` is a list of `(date, low)` tuples in date order, with `low` in °C. Return the date of the first day whose low is **below** 0, or `None` if there was no frost.",
        spec: [
          ["Function", "`first_frost(days)`"],
          ["days", "a list of `(date, low)` tuples, e.g. `(\"2024-10-18\", -1.5)`"],
          ["Returns", "the first date with a low below 0 (0 itself is not frost), or `None`"],
          ["Example", "the starter's days → `'2024-10-18'`"],
        ],
        starter: src`
def first_frost(days):
    return None

days = [("2024-10-16", 3.2), ("2024-10-17", 0.0), ("2024-10-18", -1.5), ("2024-10-19", -4.0)]
print(first_frost(days))
`,
        answer: src`
def first_frost(days):
    for date, low in days:
        if low < 0:
            return date
    return None

days = [("2024-10-16", 3.2), ("2024-10-17", 0.0), ("2024-10-18", -1.5), ("2024-10-19", -4.0)]
print(first_frost(days))
`,
        alternatives: [
          src`
def first_frost(days):
    found = None
    for day in days:
        if day[1] < 0 and found is None:
            found = day[0]
    return found
`,
        ],
        wrong: [
          {
            code: src`
def first_frost(days):
    for date, low in days:
        if low < 0:
            return date
        return None
`,
            fails: ["returns"],
            why: "`return None` sits inside the loop, so the function gives up after the first day",
          },
          {
            code: src`
def first_frost(days):
    frost = None
    for date, low in days:
        if low < 0:
            frost = date
    return frost
`,
            fails: ["returns"],
            why: "it keeps overwriting the answer, so it returns the last frost, not the first",
          },
          {
            code: src`
def first_frost(days):
    for date, low in days:
        if low <= 0:
            return date
    return None
`,
            fails: ["returns"],
            why: "`<= 0` counts a low of exactly 0 as frost",
          },
        ],
        hints: [
          "Walk the days in order, unpacking each tuple into a date and a low.",
          "As soon as a day qualifies, return its date: that stops the search.",
          "The `return None` belongs after the loop, at the function's indentation, for the case where no day qualifies.",
        ],
        task: {
          checks: [
            fn("returns", "first_frost", [
              example([[tup("2024-10-16", 3.2), tup("2024-10-17", py.float(0)), tup("2024-10-18", -1.5), tup("2024-10-19", py.float(-4))]], "2024-10-18"),
              example([[tup("2024-06-01", 18.5)]], null),
              example([[]], null),
              hiddenCase("frost on the very first day", [[tup("2024-11-02", -0.5), tup("2024-11-03", 2.1)]], "2024-11-02"),
              hiddenCase("a low of exactly 0", [[tup("2024-10-20", py.float(0)), tup("2024-10-21", 1.5)]], null),
              hiddenCase("several frosts", [[tup("a", 4.0), tup("b", -2.0), tup("c", -6.5)]], "b"),
              hiddenCase("frost only on the last day", [[tup("x", 1.0), tup("y", 0.5), tup("z", -0.1)]], "z"),
            ], { label: "first_frost() returns the first date below 0, or None" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def discount(price):
    if price > 100:
        return price - 20
    return price - 5
    print("done")

print(discount(150), discount(40))
`,
        choices: ["130 35", "130 35\ndone", "done\n130 35", "130 None"],
        answer: 0,
        why: "The first `return` reached ends the call. `print(\"done\")` comes after an unconditional return, so it never runs.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the function prints instead of returning. What does this print?",
        program: src`
def double(n):
    print(n * 2)

result = double(4)
print(result)
`,
        choices: ["8\nNone", "8\n8", "None", "8"],
        answer: 0,
        why: "The call prints 8 while it runs, then returns None, so `result` is None and the second print shows it.",
      },
      {
        id: "q3",
        prompt: "Which function should return its result instead of printing it?",
        choices: ["One whose result is added to a total by the caller", "One that writes a heading to the screen", "One that shows a menu of options", "One whose only job is to show a message"],
        answer: 0,
        why: "Whenever the caller needs to use the value, it must be returned. Printing is for showing something to a person.",
      },
    ],
    review: [
      "`return value` hands the value to the caller and ends the function; no return means None.",
      "Several returns make decisions clear; a return in a loop stops the search at the first match.",
      "Return results and let the caller print them.",
      "Next: default values for parameters, and the names that live only inside a function.",
    ],
  },

  // ------------------------------------------------------------------ PY-L09-04 defaults and scope
  {
    id: "PY-L09-04",
    version: 2,
    slug: "defaults-and-scope",
    title: "Default values and local names",
    lede: "A parameter with a default can be left out of the call. Names a function assigns are local: they exist only during the call and never change the names outside.",
    focus: "Give parameters sensible defaults, and keep a function's working names inside it by passing values in and returning results out.",
    minutes: 18,
    objectives: [
      "Write a parameter with a default (`rate=0.08`) and override it by position or by name",
      "Explain that a name assigned inside a function is local to that call",
      "Fix an UnboundLocalError by passing the value in and returning the new one",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "for-loop", "membership", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "list-copy", "runtime-error", "logical", "unicode-text", "range-call", "len-call"],
    teaches: ["function-default", "function-scope"],
    blocks: [
      {
        kind: "text",
        md: "Most calls to a tax function use the same rate. A **default** makes that rate optional: `def with_tax(price, rate=0.08):`. A call that leaves `rate` out gets 0.08; a call that passes it, by position or as `rate=0.2`, overrides it. Parameters with defaults go after the ones without.",
      },
      {
        kind: "example",
        title: "Tax with a usual rate",
        code: src`
def with_tax(price, rate=0.08):
    return price * (1 + rate)

print(f"{with_tax(50):.2f}")
print(f"{with_tax(50, 0.2):.2f}")
print(f"{with_tax(rate=0, price=50):.2f}")
`,
        output: "54.00\n60.00\n50.00\n",
        note: "The default is used only when the call leaves the parameter out. Passing by name makes an override easy to read: `rate=0` says *no tax* far more clearly than a bare `0`.",
      },
      {
        kind: "text",
        md: "Each call gets its own fresh set of **local names**: the parameters and anything the body assigns. They disappear when the call ends, and they never touch a name with the same spelling outside. That isolation is what makes a function safe to call from anywhere.\n\nThe flip side surprises everyone once. If the body **assigns** a name anywhere, that name is local for the whole body, so reading it before the assignment fails even if an outer name exists.",
      },
      {
        kind: "error-example",
        title: "Changing an outer counter",
        code: src`
visits = 0

def record_visit():
    visits = visits + 1

record_visit()
`,
        error: "UnboundLocalError",
        output: "",
        note: "`UnboundLocalError: cannot access local variable 'visits' where it is not associated with a value`. The assignment makes `visits` local, and the local one has no value yet. Pass the count in and return the new count instead.",
      },
      {
        kind: "example",
        title: "Pass in, return out",
        code: src`
def record_visit(visits, step=1):
    visits = visits + step
    return visits

total = 0
visits = 10
total = record_visit(total)
total = record_visit(total, 5)
print(total, visits)
`,
        output: "6 10\n",
        note: "Inside the function, `visits` is the parameter; the outer `visits` stays 10. The caller stores the returned count, so the state lives in the caller's name `total`, where you can see it change.",
      },
      {
        kind: "text",
        md: "**When to use it:** give a default to a parameter that has a value most callers want (a standard rate, a usual threshold, a separator). Keep every working name local, and move data in through parameters and out through `return`. **Mistakes to avoid:**\n\n- Putting a defaulted parameter before one without a default: that is a SyntaxError.\n- Expecting an assignment inside a function to change an outer name.\n- Using a list or dictionary as a default value: the same object is shared by every call. Use a number, text or None as a default.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A usual currency symbol",
      prompt: "Almost every call to `format_price` passes `\"$\"`. Give `symbol` the default `\"$\"`, then remove `\"$\"` from the first call. The second call keeps its `\"€\"`.",
      spec: [
        ["Function", "`format_price(amount, symbol=\"$\")`"],
        ["Returns", "the symbol followed by the amount with two decimals"],
      ],
      starter: src`
def format_price(amount, symbol):
    return f"{symbol}{amount:.2f}"

print(format_price(12.5, "$"))
print(format_price(8, "€"))
`,
      answer: src`
def format_price(amount, symbol="$"):
    return f"{symbol}{amount:.2f}"

print(format_price(12.5))
print(format_price(8, "€"))
`,
      wrong: [
        {
          code: src`
def format_price(amount, symbol="€"):
    return f"{symbol}{amount:.2f}"

print(format_price(12.5, "$"))
print(format_price(8))
`,
          fails: ["default"],
          why: "the default is the euro sign, so a call without a symbol shows euros",
        },
      ],
      hints: ["A default is written in the def line: `name=value`.", "The value after `=` is what a call without that argument gets.", "Calls that pass a symbol still override it."],
      task: {
        checks: [
          out("$12.50\n€8.00\n"),
          fn("default", "format_price", [
            example([12.5], "$12.50"),
            example([8, "€"], "€8.00"),
            hiddenCase("a whole amount and no symbol", [100], "$100.00"),
          ], { label: "format_price() uses $ unless told otherwise" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Split the bill",
        prompt: "Write `split_bill(total, people, tip_rate=0.15)`: add the tip to the total, then return what each person pays. Most groups tip 15%, so that is the default.",
        spec: [
          ["Function", "`split_bill(total, people, tip_rate=0.15)`"],
          ["Returns", "`total × (1 + tip_rate) ÷ people`, as a float"],
          ["Example", "`split_bill(80, 4)` → `23.0`; `split_bill(80, 4, 0.2)` → `24.0`"],
        ],
        starter: src`
def split_bill(total, people):
    return total / people

print(split_bill(80, 4))
print(split_bill(80, 4, 0.2))
`,
        answer: src`
def split_bill(total, people, tip_rate=0.15):
    return total * (1 + tip_rate) / people

print(split_bill(80, 4))
print(split_bill(80, 4, 0.2))
`,
        alternatives: [
          src`
def split_bill(total, people, tip_rate=0.15):
    with_tip = total + total * tip_rate
    share = with_tip / people
    return share
`,
        ],
        wrong: [
          {
            code: src`
def split_bill(total, people, tip_rate=0.15):
    return total / people * tip_rate
`,
            fails: ["returns"],
            why: "it returns each person's share of the tip only, not the bill plus tip",
          },
          {
            code: src`
def split_bill(total, people, tip_rate=0.15):
    return total * 1 + tip_rate / people
`,
            fails: ["returns"],
            why: "without brackets, the tip rate is divided by the number of people and added as a tiny amount",
          },
          {
            code: src`
def split_bill(total, people, tip_rate=0.1):
    return total * (1 + tip_rate) / people
`,
            fails: ["returns"],
            why: "the default tip is 10%, not 15%",
          },
        ],
        hints: [
          "The default goes in the def line, after the parameters without one.",
          "Add the tip to the total first, then share it out.",
          "Brackets make `1 + tip_rate` happen before the multiplication.",
        ],
        task: {
          checks: [
            fn("returns", "split_bill", [
              example([80, 4], py.float(23)),
              example([80, 4, 0.2], py.float(24)),
              example([45.5, 1, 0], 45.5),
              hiddenCase("the default tip for one person", [10, 1], 11.5),
              hiddenCase("a tip given by name", [120, 3], py.float(46), { kwargs: { tip_rate: 0.15 } }),
              hiddenCase("no tip", [99, 3, 0], py.float(33)),
              hiddenCase("a bill that doesn't divide evenly", [100, 3], 115 / 3),
            ], { label: "split_bill() adds the tip and divides by the number of people" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Sale prices with a floor",
        prompt: "A sale takes a percentage off every price, but no price may drop below a minimum. Write `sale_prices(prices, rate=0.1, minimum=1.0)`: return a **new** list with each price reduced by `rate`, raised back up to `minimum` if the reduction took it lower. The list passed in must not change: the shop still needs the original prices.",
        spec: [
          ["Function", "`sale_prices(prices, rate=0.1, minimum=1.0)`"],
          ["Returns", "a new list: each `price × (1 − rate)`, or `minimum` if that is lower"],
          ["Must not", "change the `prices` list it is given"],
          ["Example", "`sale_prices([20, 1.05, 50], 0.5)` → `[10.0, 1.0, 25.0]`"],
        ],
        starter: src`
def sale_prices(prices, rate=0.1, minimum=1.0):
    return prices

original = [20, 1.05, 50]
print(sale_prices(original, 0.5))
print(original)
`,
        answer: src`
def sale_prices(prices, rate=0.1, minimum=1.0):
    reduced = []
    for price in prices:
        new_price = price * (1 - rate)
        if new_price < minimum:
            new_price = minimum
        reduced.append(new_price)
    return reduced

original = [20, 1.05, 50]
print(sale_prices(original, 0.5))
print(original)
`,
        alternatives: [
          src`
def sale_prices(prices, rate=0.1, minimum=1.0):
    reduced = prices.copy()
    for i in range(len(reduced)):
        reduced[i] = reduced[i] * (1 - rate)
        if reduced[i] < minimum:
            reduced[i] = minimum
    return reduced
`,
        ],
        wrong: [
          {
            code: src`
def sale_prices(prices, rate=0.1, minimum=1.0):
    for i in range(len(prices)):
        prices[i] = prices[i] * (1 - rate)
        if prices[i] < minimum:
            prices[i] = minimum
    return prices
`,
            fails: ["keeps-input"],
            why: "the prices are right, but they are written into the caller's own list",
          },
          {
            code: src`
def sale_prices(prices, rate=0.1, minimum=1.0):
    reduced = []
    for price in prices:
        reduced.append(price * (1 - rate))
    return reduced
`,
            fails: ["returns"],
            why: "the minimum is ignored, so cheap items drop below the floor",
          },
          {
            code: src`
def sale_prices(prices, rate=0.5, minimum=1.0):
    reduced = []
    for price in prices:
        new_price = price * (1 - rate)
        if new_price < minimum:
            new_price = minimum
        reduced.append(new_price)
    return reduced
`,
            fails: ["returns"],
            why: "the default rate is 50%, not 10%",
          },
        ],
        hints: [
          "Build a new list in a loop, as in the Lists & Tuples module, instead of storing into `prices`.",
          "Work out each reduced price, then compare it with `minimum` before appending.",
          "Callers who leave out `rate` or `minimum` get the defaults from the def line.",
        ],
        task: {
          checks: [
            fn("returns", "sale_prices", [
              example([[20, 1.05, 50], 0.5], [py.float(10), py.float(1), py.float(25)]),
              example([[10, 0.5]], [py.float(9), py.float(1)]),
              example([[]], []),
              hiddenCase("the default rate and floor", [[100, 1.1]], [py.float(90), py.float(1)]),
              hiddenCase("a minimum given by name", [[5, 30]], [py.float(5), py.float(24)], { kwargs: { rate: 0.2, minimum: 5 } }),
              hiddenCase("a price that lands exactly on the minimum", [[4], 0.5, 2], [py.float(2)]),
            ], { label: "sale_prices() reduces every price, never below the minimum", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "sale_prices", [
              keepsInput([[20, 1.05, 50], 0.5]),
              keepsInput([[3, 0.2]], { label: "prices below the floor" }),
            ], { label: "sale_prices() leaves the original list unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def label(name, size="M", color="black"):
    return f"{name}-{size}-{color}"

print(label("tee"))
print(label("tee", "L"))
print(label("tee", color="red"))
`,
        choices: ["tee-M-black\ntee-L-black\ntee-M-red", "tee-M-black\ntee-L-black\ntee-red-black", "tee\ntee-L\ntee-red", "tee-M-black\ntee-M-L\ntee-M-red"],
        answer: 0,
        why: "Missing arguments take their defaults. `\"L\"` fills `size` by position, and `color=\"red\"` skips `size` by naming the parameter it sets.",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting a function to change an outer name. What does this print?",
        program: src`
total = 100

def add_fee(total):
    total = total + 5
    return total

add_fee(total)
print(total)
`,
        choices: ["100", "105", "None", "UnboundLocalError"],
        answer: 0,
        why: "Inside the function `total` is the local parameter, so the outer `total` stays 100. The returned 105 was thrown away; `total = add_fee(total)` would keep it.",
      },
      {
        id: "q3",
        prompt: "Which parameter is the best candidate for a default value?",
        choices: ["The tax rate that almost every order uses", "The order's total, which is different every time", "The customer's email address", "The list of order lines"],
        answer: 0,
        why: "A default suits a value most calls share. Values that differ on every call should stay required, so a call can't silently forget them.",
      },
    ],
    review: [
      "`def f(x, rate=0.08):` makes `rate` optional; a call can override it by position or by name.",
      "Names assigned inside a function are local to the call and never change outer names.",
      "Move data in with parameters and out with return instead of changing outer names.",
      "Next: document what a function promises, and build bigger functions from small ones.",
    ],
  },

  // ------------------------------------------------------------------ PY-L09-05 docstrings and reuse
  {
    id: "PY-L09-05",
    version: 2,
    slug: "docstrings",
    title: "Docstrings and functions that use functions",
    lede: "A docstring says what a function takes and returns. Small, documented functions can then call each other, so each rule is written once and every caller shares it.",
    focus: "Document a function's contract with a docstring, and build a bigger function by calling smaller ones.",
    minutes: 18,
    objectives: [
      "Write a docstring that states what a function takes and returns",
      "Split a job into small functions and call one from another",
      "Return several results at once as a tuple and unpack them",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "reassignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "for-loop", "membership", "string-format", "string-index", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "len-call", "none-value", "identity", "logical", "spaces-in-text"],
    teaches: ["function-doc"],
    blocks: [
      {
        kind: "text",
        md: "A function is a promise: give me these values, I'll give you back that. A **docstring** writes the promise down. It is a string on the first line of the body, usually in triple quotes. Python doesn't print it when the function runs; it stores it as the function's documentation, which editors show when you hover over a call, and `help()` prints.",
      },
      {
        kind: "example",
        title: "A documented line total",
        code: src`
def line_total(quantity, unit_price, discount_rate=0):
    """Return the price of one order line after its discount.

    discount_rate is a fraction: 0.1 means 10% off.
    """
    return quantity * unit_price * (1 - discount_rate)

print(line_total(2, 15.99))
print(line_total(1, 51.49, 0.15))
print(line_total.__doc__.splitlines()[0])
`,
        output: "31.98\n43.7665\nReturn the price of one order line after its discount.\n",
        note: "Calling the function never prints the docstring. `__doc__` is where Python keeps it; the last line reads just its first line to show it is there. A good docstring starts with one sentence that says what is returned.",
      },
      {
        kind: "text",
        md: "With small functions in place, a bigger one can **call** them instead of repeating their arithmetic. `order_total` below doesn't know how a line is priced or when shipping is free; it asks `line_total` and `shipping_fee`. If the shipping rule changes, one function changes and every caller follows.\n\nA function can also return more than one value by returning a tuple, `return subtotal, shipping`, which the caller unpacks as in the Lists & Tuples module.",
      },
      {
        kind: "example",
        title: "An order total built from helpers",
        code: src`
def line_total(quantity, unit_price, discount_rate=0):
    """Return the price of one order line after its discount."""
    return quantity * unit_price * (1 - discount_rate)

def shipping_fee(subtotal, free_from=50):
    """Return 0 for orders of free_from or more, otherwise 5.99."""
    if subtotal >= free_from:
        return 0
    return 5.99

def order_total(lines):
    """Return (subtotal, shipping) for a list of (quantity, unit_price, discount_rate)."""
    subtotal = 0
    for quantity, unit_price, discount_rate in lines:
        subtotal = subtotal + line_total(quantity, unit_price, discount_rate)
    return subtotal, shipping_fee(subtotal)

subtotal, shipping = order_total([(1, 51.49, 0.15), (2, 15.99, 0)])
print(f"items {subtotal:.2f}, shipping {shipping:.2f}, total {subtotal + shipping:.2f}")
subtotal, shipping = order_total([(1, 6.49, 0)])
print(f"items {subtotal:.2f}, shipping {shipping:.2f}, total {subtotal + shipping:.2f}")
`,
        output: "items 75.75, shipping 0.00, total 75.75\nitems 6.49, shipping 5.99, total 12.48\n",
        note: "Each function does one job and says so in its docstring. `order_total` returns two values as a tuple, and the caller unpacks them into two names.",
      },
      {
        kind: "text",
        md: "**When to use it:** split a function when it does two jobs you could name separately, or when the same calculation appears twice. Write a docstring for any function someone else (including you next month) will call. **Mistakes to avoid:**\n\n- A docstring that repeats the name (`\"\"\"Line total.\"\"\"`) instead of saying what comes in and what comes out.\n- Copying a helper's arithmetic into the bigger function instead of calling the helper, so the two drift apart.\n- Forgetting to return the helper's result: `line_total(...)` on its own line computes a value and throws it away.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Document the converter",
      prompt: "`to_fahrenheit` works but has no docstring. Add one as the first line of its body that says what it returns, for example `\"\"\"Return the temperature in Fahrenheit for a Celsius value.\"\"\"`. The function must still work.",
      spec: [
        ["Function", "`to_fahrenheit(celsius)`"],
        ["Needs", "a docstring, and the same return value as before"],
      ],
      starter: src`
def to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32

print(to_fahrenheit(21))
`,
      answer: src`
def to_fahrenheit(celsius):
    """Return the temperature in Fahrenheit for a Celsius value."""
    return celsius * 9 / 5 + 32

print(to_fahrenheit(21))
`,
      wrong: [
        {
          code: src`
def to_fahrenheit(celsius):
    # Return the temperature in Fahrenheit for a Celsius value.
    return celsius * 9 / 5 + 32

print(to_fahrenheit(21))
`,
          fails: ["docstring"],
          why: "a comment is not a docstring: Python throws comments away, so tools can't show it",
        },
      ],
      hints: ["A docstring is a string, not a comment.", "It must be the first line inside the function, indented like the body.", "Triple quotes let it span more than one line if you need to."],
      task: {
        checks: [
          out("69.8\n"),
          { kind: "expr", id: "docstring", label: "to_fahrenheit has a docstring", expr: "result = to_fahrenheit.__doc__ is not None and len(to_fahrenheit.__doc__.strip()) > 0", expected: py.bool(true) },
          fn("returns", "to_fahrenheit", [
            example([21], 69.8),
            hiddenCase("freezing point", [0], py.float(32)),
          ], { label: "to_fahrenheit() still converts correctly" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A day's range in Fahrenheit",
        prompt: "A US weather page shows each day's low and high in °F, but the station records °C. Write two functions, each with a docstring: `to_fahrenheit(celsius)` returns `celsius * 9 / 5 + 32`, and `day_range_f(readings)` returns a tuple `(low_f, high_f)` for a list of °C readings, using `to_fahrenheit`. For an empty list, `day_range_f` returns `None`.",
        spec: [
          ["Functions", "`to_fahrenheit(celsius)` and `day_range_f(readings)`, both with docstrings"],
          ["day_range_f", "returns `(lowest in °F, highest in °F)`, or `None` for no readings"],
          ["Example", "`day_range_f([4.0, 15.0, 9.5])` → `(39.2, 59.0)`"],
        ],
        starter: src`
def to_fahrenheit(celsius):
    return 0

def day_range_f(readings):
    return None

print(day_range_f([4.0, 15.0, 9.5]))
`,
        answer: src`
def to_fahrenheit(celsius):
    """Return the Fahrenheit value of a Celsius temperature."""
    return celsius * 9 / 5 + 32

def day_range_f(readings):
    """Return (low, high) in Fahrenheit for Celsius readings, or None if there are none."""
    if len(readings) == 0:
        return None
    low = readings[0]
    high = readings[0]
    for reading in readings:
        if reading < low:
            low = reading
        if reading > high:
            high = reading
    return to_fahrenheit(low), to_fahrenheit(high)

print(day_range_f([4.0, 15.0, 9.5]))
`,
        alternatives: [
          src`
def to_fahrenheit(celsius):
    """Celsius in, Fahrenheit out."""
    return celsius * 9 / 5 + 32

def day_range_f(readings):
    """Lowest and highest reading in Fahrenheit, or None for an empty list."""
    low = None
    high = None
    for reading in readings:
        f = to_fahrenheit(reading)
        if low is None or f < low:
            low = f
        if high is None or f > high:
            high = f
    if low is None:
        return None
    return (low, high)
`,
        ],
        wrong: [
          {
            code: src`
def to_fahrenheit(celsius):
    """Return the Fahrenheit value of a Celsius temperature."""
    return celsius * 9 / 5 + 32

def day_range_f(readings):
    """Return (low, high) in Fahrenheit."""
    low = 0
    high = 0
    for reading in readings:
        if reading < low:
            low = reading
        if reading > high:
            high = reading
    return to_fahrenheit(low), to_fahrenheit(high)
`,
            fails: ["range"],
            why: "starting low and high at 0 is wrong whenever every reading is above (or below) 0, and an empty list gives a range instead of None",
          },
          {
            code: src`
def to_fahrenheit(celsius):
    """Return the Fahrenheit value of a Celsius temperature."""
    return celsius * 9 / 5 + 32

def day_range_f(readings):
    """Return (low, high) in Fahrenheit, or None."""
    if len(readings) == 0:
        return None
    low = readings[0]
    high = readings[0]
    for reading in readings:
        if reading < low:
            low = reading
        if reading > high:
            high = reading
    return low, high
`,
            fails: ["range"],
            why: "the low and high are found but returned in Celsius: the helper is never called",
          },
          {
            code: src`
def to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32

def day_range_f(readings):
    if len(readings) == 0:
        return None
    low = readings[0]
    high = readings[0]
    for reading in readings:
        if reading < low:
            low = reading
        if reading > high:
            high = reading
    return to_fahrenheit(low), to_fahrenheit(high)
`,
            fails: ["docs"],
            why: "the functions work, but neither says what it promises",
          },
        ],
        hints: [
          "Write `to_fahrenheit` first; it is one line plus its docstring.",
          "In `day_range_f`, handle the empty list first, then find the lowest and highest reading starting from the first one.",
          "Convert the two results with the helper and return them together as a tuple.",
        ],
        task: {
          checks: [
            fn("convert", "to_fahrenheit", [
              example([100], py.float(212)),
              example([-40], py.float(-40)),
              hiddenCase("a decimal reading", [36.6], 97.88),
            ], { label: "to_fahrenheit() converts one value" }),
            fn("range", "day_range_f", [
              example([[py.float(4), py.float(15), 9.5]], tup(39.2, py.float(59))),
              example([[]], null),
              example([[py.float(21)]], tup(69.8, 69.8)),
              hiddenCase("every reading below freezing", [[py.float(-3), -12.5, -0.5]], tup(9.5, 31.1)),
              hiddenCase("every reading above freezing", [[py.float(18), py.float(25)]], tup(64.4, py.float(77))),
              hiddenCase("the lowest reading last", [[py.float(10), py.float(5), py.float(2)]], tup(35.6, py.float(50))),
            ], { label: "day_range_f() returns the low and high in Fahrenheit", compare: { numbers: "int-float-equal" } }),
            { kind: "expr", id: "docs", label: "Both functions have docstrings", expr: "result = bool(to_fahrenheit.__doc__) and bool(day_range_f.__doc__)", expected: py.bool(true) },
          ],
        },
      },
      {
        id: "c2",
        title: "Receipt lines from a helper",
        prompt: "Write `format_line(name, quantity, unit_price)` that returns one receipt line as text, `f\"{name:<16}{quantity:>3} x {unit_price:>6.2f} = {amount:>7.2f}\"`, and `receipt(lines)` that returns a **list** of texts: one line per `(name, quantity, unit_price)` tuple, built with `format_line`, then a last line `f\"{'TOTAL':<31}{total:>7.2f}\"`. Nothing is printed by either function.",
        spec: [
          ["format_line", "`format_line(name, quantity, unit_price)` → one formatted text"],
          ["receipt", "`receipt(lines)` → a list of texts: each line, then the TOTAL line"],
          ["Example", "`format_line(\"Nordic Candle\", 3, 7.99)` → `'Nordic Candle     3 x   7.99 =   23.97'`"],
        ],
        starter: src`
def format_line(name, quantity, unit_price):
    return ""

def receipt(lines):
    return []

for text in receipt([("Nordic Candle", 3, 7.99), ("Deluxe Vase", 1, 40)]):
    print(text)
`,
        answer: src`
def format_line(name, quantity, unit_price):
    """Return one receipt line: name, quantity, unit price and amount in columns."""
    amount = quantity * unit_price
    return f"{name:<16}{quantity:>3} x {unit_price:>6.2f} = {amount:>7.2f}"

def receipt(lines):
    """Return the receipt as a list of texts, ending with the TOTAL line."""
    texts = []
    total = 0
    for name, quantity, unit_price in lines:
        texts.append(format_line(name, quantity, unit_price))
        total = total + quantity * unit_price
    texts.append(f"{'TOTAL':<31}{total:>7.2f}")
    return texts

for text in receipt([("Nordic Candle", 3, 7.99), ("Deluxe Vase", 1, 40)]):
    print(text)
`,
        alternatives: [
          src`
def format_line(name, quantity, unit_price):
    """One receipt line."""
    return f"{name:<16}{quantity:>3} x {unit_price:>6.2f} = {quantity * unit_price:>7.2f}"

def receipt(lines):
    """All receipt lines plus the total."""
    result = []
    total = 0
    for line in lines:
        result.append(format_line(line[0], line[1], line[2]))
        total += line[1] * line[2]
    label = "TOTAL"
    result.append(f"{label:<31}{total:>7.2f}")
    return result
`,
        ],
        wrong: [
          {
            code: src`
def format_line(name, quantity, unit_price):
    amount = quantity * unit_price
    print(f"{name:<16}{quantity:>3} x {unit_price:>6.2f} = {amount:>7.2f}")

def receipt(lines):
    texts = []
    total = 0
    for name, quantity, unit_price in lines:
        texts.append(format_line(name, quantity, unit_price))
        total = total + quantity * unit_price
    texts.append(f"{'TOTAL':<31}{total:>7.2f}")
    return texts
`,
            fails: ["line", "receipt"],
            why: "`format_line` prints instead of returning, so the receipt list fills up with None",
          },
          {
            code: src`
def format_line(name, quantity, unit_price):
    amount = quantity * unit_price
    return f"{name:<16}{quantity:>3} x {unit_price:>6.2f} = {amount:>7.2f}"

def receipt(lines):
    texts = []
    total = 0
    for name, quantity, unit_price in lines:
        texts.append(format_line(name, quantity, unit_price))
        total = total + unit_price
    texts.append(f"{'TOTAL':<31}{total:>7.2f}")
    return texts
`,
            fails: ["receipt"],
            why: "the total adds unit prices, ignoring the quantity",
          },
        ],
        hints: [
          "`format_line` computes the amount and returns the f-string; it prints nothing.",
          "`receipt` starts an empty list and a total, and appends `format_line(...)` for each tuple.",
          "After the loop, append the TOTAL line, then return the list.",
        ],
        task: {
          checks: [
            fn("line", "format_line", [
              example(["Nordic Candle", 3, 7.99], "Nordic Candle     3 x   7.99 =   23.97"),
              example(["Deluxe Vase", 1, 40], "Deluxe Vase       1 x  40.00 =   40.00"),
              hiddenCase("a large quantity", ["Travel Yoga Mat", 12, 24.5], "Travel Yoga Mat  12 x  24.50 =  294.00"),
            ], { label: "format_line() returns one aligned line" }),
            fn("receipt", "receipt", [
              example([[tup("Nordic Candle", 3, 7.99), tup("Deluxe Vase", 1, 40)]], ["Nordic Candle     3 x   7.99 =   23.97", "Deluxe Vase       1 x  40.00 =   40.00", "TOTAL                            63.97"]),
              example([[]], ["TOTAL                             0.00"]),
              example([[tup("Studio Tent", 2, 89.99)]], ["Studio Tent       2 x  89.99 =  179.98", "TOTAL                           179.98"]),
              hiddenCase("several lines with quantities", [[tup("A", 2, 1.5), tup("B", 4, 0.25), tup("C", 1, 10)]], ["A                 2 x   1.50 =    3.00", "B                 4 x   0.25 =    1.00", "C                 1 x  10.00 =   10.00", "TOTAL                            14.00"]),
            ], { label: "receipt() returns every line and the total" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def area(width, height):
    """Return width times height."""
    return width * height

def paint_needed(width, height, coats=2):
    """Return litres of paint: one litre covers 10 square metres per coat."""
    return area(width, height) * coats / 10

print(paint_needed(5, 4))
print(paint_needed(5, 4, 1))
`,
        choices: ["4.0\n2.0", "Return width times height.\n4.0\n2.0", "40\n20", "4\n2"],
        answer: 0,
        why: "Docstrings are never printed by a call. `area` returns 20; times 2 coats is 40, and `/ 10` gives the float 4.0. One coat gives 2.0.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the helper's result is thrown away. What does this print?",
        program: src`
def fee(subtotal):
    if subtotal >= 50:
        return 0
    return 5.99

def total(subtotal):
    fee(subtotal)
    return subtotal

print(total(20), total(80))
`,
        choices: ["20 80", "25.99 80", "25.99 80.0", "None None"],
        answer: 0,
        why: "`fee(subtotal)` computes the fee, but nothing stores or adds it, so `total` returns the subtotal unchanged. Write `return subtotal + fee(subtotal)`.",
      },
      {
        id: "q3",
        prompt: "Which docstring is most useful?",
        choices: ["\"\"\"Return the order's total in dollars, including shipping.\"\"\"", "\"\"\"order_total\"\"\"", "\"\"\"This is a function.\"\"\"", "\"\"\"Loops over the lines.\"\"\""],
        answer: 0,
        why: "A docstring states the promise: what the function returns. Repeating the name, or describing how the code works, doesn't help a caller.",
      },
    ],
    review: [
      "A docstring, the first string in a function's body, states what it takes and returns.",
      "Small functions that call each other keep each rule in one place.",
      "`return a, b` returns a tuple the caller can unpack.",
      "Next module: put everything so far together in complete small programs.",
    ],
  },
];
