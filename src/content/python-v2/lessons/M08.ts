/**
 * M08 Dictionaries & Sets: five lessons (PY-L08-01 … PY-L08-05).
 *
 * A dictionary finds a value by a key instead of a position; a set keeps distinct values and compares groups of them.
 * The module covers making a dictionary and looking values up (KeyError and the `in` guard), adding, replacing and
 * removing pairs, walking keys and pairs with items(), set algebra (intersection, union, difference) with sorted output,
 * and nested records: a dictionary of dictionaries and an order with a list of line dictionaries. Fixtures are Runtime
 * Market customers, orders, products and stock (R01), Runtime Films languages and tags (R02), and Open Food Facts
 * allergens (D09).
 *
 * Functions arrive in M09, so exercises are short programs graded on their output and re-run with other inputs
 * (hidden `variant` checks: missing keys, empty inputs, repeats, capitals). Sets are always printed sorted, because a
 * set's own order is not something to rely on.
 * Version 2: rewritten from a print-the-literal module; saved progress from version 1 does not count as mastery.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyLesson } from "../model";
import { pv } from "../checks";
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
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m08Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L08-01 make and look up
  {
    id: "PY-L08-01",
    version: 2,
    slug: "make-a-dictionary",
    title: "Make a dictionary and look a value up",
    lede: "A dictionary stores values under keys you choose: customer[\"city\"] instead of customer[2]. Looking up a key that isn't there raises KeyError, so check with in first.",
    focus: "Store values under keys in a dictionary, and read them back by key safely.",
    minutes: 16,
    objectives: [
      "Write a dictionary literal and read a value with `d[key]`",
      "Explain that `in` checks the keys, not the values",
      "Guard a lookup with `in` instead of letting a missing key raise KeyError",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "decimal-number", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "comparison", "if-statement", "else-clause", "membership", "len-call", "string-format", "top-level-indent", "runtime-error", "list-literal", "string-index", "string-method", "logical", "precedence", "for-loop", "list-index", "continue-statement", "tuple-unpack"],
    teaches: ["dict-literal", "dict-lookup"],
    blocks: [
      {
        kind: "text",
        md: "A customer record could be a list, `[\"C00164\", \"Isaac\", \"New York\"]`, but then you have to remember that position 2 means the city. A **dictionary** stores each value under a **key** you choose, so the code says what it means: `customer[\"city\"]`.\n\nWrite a dictionary with curly braces and `key: value` pairs, separated by commas. Read a value by putting its key in square brackets. Keys are usually text, and each key appears once.",
      },
      {
        kind: "example",
        title: "A customer record",
        code: src`
customer = {"customer_id": "C00164", "first_name": "Isaac", "city": "New York", "segment": "consumer"}
print(customer["first_name"], customer["city"])
print(len(customer))
print("city" in customer, "New York" in customer, "email" in customer)
`,
        output: "Isaac New York\n4\nTrue False False\n",
        note: "`len` counts the pairs. `in` asks about the **keys**: `\"New York\"` is a value, not a key, so that test is False.",
      },
      {
        kind: "error-example",
        title: "A key that isn't there",
        code: src`
customer = {"customer_id": "C00164", "first_name": "Isaac", "city": "New York"}
print(customer["city"])
print(customer["email"])
`,
        error: "KeyError",
        output: "New York\n",
        note: "The program stops with `KeyError: 'email'`. Unlike a list, a dictionary has no positions to fall back on: a key is either stored or not.",
      },
      {
        kind: "text",
        md: "A dictionary is also a **lookup table**: give it a key, get the matching value in one step, however many pairs it holds. Shipping fees per sales channel are a typical example. Test with `in` before you look a key up when the key comes from data you don't control.",
      },
      {
        kind: "example",
        title: "Shipping fee by channel",
        code: src`
fees = {"web": 0, "app": 0, "marketplace": 5.99, "phone": 3.5}
channel = "marketplace"
subtotal = 6.49
if channel in fees:
    print(f"Shipping {fees[channel]:.2f}, total {subtotal + fees[channel]:.2f}")
else:
    print("Unknown channel:", channel)
twice = {"web": 0, "web": 4.99}
print(twice)
`,
        output: "Shipping 5.99, total 12.48\n{'web': 4.99}\n",
        note: "The key can come from a variable. Writing the same key twice keeps only the last value, because a key can hold only one value.",
      },
      {
        kind: "text",
        md: "**When to use it:** for a record whose fields have names, and for any lookup from a code to its meaning or price. **Mistakes to avoid:**\n\n- Expecting `in` to search the values.\n- Looking up a key that may be missing without checking first.\n- Mixing up the key's spelling or capitals: `\"Web\"` and `\"web\"` are different keys.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Read another field",
      prompt: "This prints the customer's first name. Change it to print the customer's **segment** instead.",
      spec: [
        ["Input", "`customer`, a dictionary with a `\"segment\"` key"],
        ["Prints", "the segment"],
      ],
      starter: src`
customer = {"customer_id": "C00164", "first_name": "Isaac", "city": "New York", "segment": "consumer"}
print(customer["first_name"])
`,
      answer: src`
customer = {"customer_id": "C00164", "first_name": "Isaac", "city": "New York", "segment": "consumer"}
print(customer["segment"])
`,
      wrong: [
        {
          code: src`
customer = {"customer_id": "C00164", "first_name": "Isaac", "city": "New York", "segment": "consumer"}
print("consumer")
`,
          fails: ["business"],
          why: "the value is typed in instead of looked up",
        },
      ],
      hints: [
        "Only the key inside the brackets changes.",
        "The key is the text before the colon.",
        "Keys are spelled exactly as stored, in quotes.",
      ],
      task: {
        checks: [
          out("consumer\n"),
          rerun("business", "another customer", { customer: { customer_id: "C01338", first_name: "Grace", city: "Houston", segment: "business" } }, "business\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A film's language",
        prompt: "Runtime Films stores each film's language as a two-letter code. The site shows a film as `Wild Archive (German)`, using the `languages` table. If the code isn't in the table, show the code in capitals instead: `Night Harbor (SV)`.",
        spec: [
          ["Inputs", "`title`, `code` (a two-letter language code) and `languages`, a dictionary from code to name"],
          ["Prints", "`<title> (<language name>)`, or `<title> (<CODE>)` for an unknown code"],
          ["Example", "`\"Wild Archive\"` with `\"de\"` prints `Wild Archive (German)`"],
        ],
        starter: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean"}
title = "Wild Archive"
code = "de"
`,
        answer: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean"}
title = "Wild Archive"
code = "de"
if code in languages:
    name = languages[code]
else:
    name = code.upper()
print(f"{title} ({name})")
`,
        alternatives: [
          src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean"}
title = "Wild Archive"
code = "de"
if code not in languages:
    print(title + " (" + code.upper() + ")")
else:
    print(title + " (" + languages[code] + ")")
`,
        ],
        wrong: [
          {
            code: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean"}
title = "Wild Archive"
code = "de"
print(f"{title} ({languages[code]})")
`,
            fails: ["unknown"],
            why: "an unknown code is looked up anyway, which raises KeyError",
          },
          {
            code: src`
languages = {"en": "English", "de": "German", "fr": "French", "ko": "Korean"}
title = "Wild Archive"
code = "de"
if code in languages:
    name = languages[code]
else:
    name = code
print(f"{title} ({name})")
`,
            fails: ["unknown"],
            why: "an unknown code is shown as typed, not in capitals",
          },
        ],
        hints: [
          "Decide which text goes in the brackets first, then print one line.",
          "`in` tells you whether the code is a key of `languages`.",
          "For an unknown code, a string method gives the capitals.",
        ],
        task: {
          checks: [
            out("Wild Archive (German)\n"),
            rerun("unknown", "a code missing from the table", { title: "Night Harbor", code: "sv" }, "Night Harbor (SV)\n"),
            rerun("korean", "another known code", { title: "Glass Echo of Glass", code: "ko" }, "Glass Echo of Glass (Korean)\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Price a basket",
        prompt: "A basket is a list of `(product_id, quantity)` tuples, and `prices` maps product IDs to prices. Add up quantity × price for every product that has a price. Count the products without a price, because the shop can't sell them. Print `total 64.47, 1 unknown`, with the total to two decimals.",
        spec: [
          ["Inputs", "`prices`, a dictionary from product ID to price; `basket`, a list of `(product_id, quantity)` tuples"],
          ["Prints", "`total <t>, <n> unknown`, the total with two decimals"],
          ["Example", "the starter's basket prints `total 64.47, 1 unknown`"],
        ],
        starter: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
basket = [("P0607", 2), ("P0999", 1), ("P0659", 1)]
`,
        answer: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
basket = [("P0607", 2), ("P0999", 1), ("P0659", 1)]
total = 0
unknown = 0
for product_id, quantity in basket:
    if product_id in prices:
        total = total + quantity * prices[product_id]
    else:
        unknown = unknown + 1
print(f"total {total:.2f}, {unknown} unknown")
`,
        alternatives: [
          src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
basket = [("P0607", 2), ("P0999", 1), ("P0659", 1)]
total = 0
missing = 0
for line in basket:
    product_id, quantity = line
    if product_id not in prices:
        missing = missing + 1
        continue
    total = total + prices[product_id] * quantity
print("total", f"{total:.2f},", missing, "unknown")
`,
        ],
        wrong: [
          {
            code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
basket = [("P0607", 2), ("P0999", 1), ("P0659", 1)]
total = 0
unknown = 0
for product_id, quantity in basket:
    if product_id in prices:
        total = total + prices[product_id]
    else:
        unknown = unknown + 1
print(f"total {total:.2f}, {unknown} unknown")
`,
            fails: ["output", "all-known"],
            why: "the quantity is ignored, so two of an item cost the same as one",
          },
          {
            code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
basket = [("P0607", 2), ("P0999", 1), ("P0659", 1)]
total = 0
unknown = 0
for product_id, quantity in basket:
    if product_id in prices:
        total = total + quantity * prices[product_id]
    else:
        unknown = unknown + quantity
print(f"total {total:.2f}, {unknown} unknown")
`,
            fails: ["many-unknown"],
            why: "it counts the units of unknown products, not how many products are unknown",
          },
        ],
        hints: [
          "Two running values: the total and the number of unknown products. Both start at 0.",
          "Unpack each basket line into its product ID and quantity.",
          "Look a price up only after `in` confirms the product has one.",
        ],
        task: {
          checks: [
            out("total 64.47, 1 unknown\n"),
            rerun("all-known", "every product known", { basket: [tup("P0208", 3)] }, "total 199.47, 0 unknown\n"),
            rerun("many-unknown", "an unknown product bought several times", { basket: [tup("X1", 4), tup("X2", 1)] }, "total 0.00, 2 unknown\n"),
            rerun("empty", "an empty basket", { basket: [] }, "total 0.00, 0 unknown\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
stock = {"P0607": 12, "P0208": 0, "P0659": 7}
print(stock["P0208"], "P0659" in stock, 12 in stock, len(stock))
`,
        choices: ["0 True False 3", "0 True True 3", "12 True False 3", "0 False False 3"],
        answer: 0,
        why: "P0208's value is 0. `in` checks keys, so the key P0659 is found and the value 12 is not.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the same key is written twice. What does this print?",
        program: src`
fees = {"web": 0, "app": 0, "web": 4.99}
print(fees["web"], len(fees))
`,
        choices: ["4.99 2", "0 3", "0 2", "4.99 3"],
        answer: 0,
        why: "A key holds one value, so the later `\"web\": 4.99` replaces the earlier one and the dictionary has two keys.",
      },
      {
        id: "q3",
        prompt: "Which job is a dictionary lookup the right tool for?",
        choices: ["Finding a product's price from its ID", "Keeping a week of temperatures in order", "Finding the longest title in a list", "Counting the characters in a name"],
        answer: 0,
        why: "A lookup goes from a key to its value. The other jobs are about items in order or characters in text.",
      },
    ],
    review: [
      "A dictionary maps keys to values: `{\"web\": 0, \"phone\": 3.5}`. Read a value with `d[key]`.",
      "`in` checks keys. A missing key raises KeyError, so test with `in` when the key comes from data.",
      "A key appears once, so writing it again replaces its value.",
      "Next: add, change and remove pairs as data changes.",
    ],
  },

  // ------------------------------------------------------------------ PY-L08-02 add, update, remove
  {
    id: "PY-L08-02",
    version: 2,
    slug: "look-up-a-value",
    title: "Add, update and remove pairs",
    lede: "d[key] = value adds a new pair or replaces the old value. del d[key] removes a pair. Updating a key that isn't there raises KeyError.",
    focus: "Keep a dictionary up to date: add, replace and remove pairs as events arrive.",
    minutes: 18,
    objectives: [
      "Add or replace a value with `d[key] = value`, and remove a pair with `del`",
      "Update a value from its old value, with `d[key] = d[key] - n` or `d[key] -= n`",
      "Apply a list of events to a dictionary, skipping keys that don't exist",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "continue-statement", "len-call", "top-level-indent", "runtime-error", "list-literal", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "list-index"],
    teaches: ["dict-store"],
    blocks: [
      {
        kind: "text",
        md: "Stock levels, latest prices and current addresses all change, and a dictionary changes with them, in place, like a list.\n\n- `stock[\"P0164\"] = 25` adds the pair if the key is new and replaces the value if it isn't. There is no separate add command.\n- `del stock[\"P0659\"]` removes a pair.\n- `stock[\"P0607\"] = stock[\"P0607\"] - 2` updates a value from its old value. The short form `stock[\"P0607\"] -= 2` does the same, and `+=` adds.",
      },
      {
        kind: "example",
        title: "Keeping stock levels current",
        code: src`
stock = {"P0607": 12, "P0208": 3, "P0659": 0}
stock["P0607"] = stock["P0607"] - 2
stock["P0164"] = 25
del stock["P0659"]
print(stock)
stock["P0208"] += 5
print(stock["P0208"], len(stock))
`,
        output: "{'P0607': 10, 'P0208': 3, 'P0164': 25}\n8 3\n",
        note: "New keys go at the end. A dictionary remembers the order its keys were added, and replacing a value doesn't move its key.",
      },
      {
        kind: "error-example",
        title: "Updating a key that isn't there",
        code: src`
stock = {"P0607": 12}
stock["P0607"] -= 1
print(stock)
stock["P0123"] -= 1
`,
        error: "KeyError",
        output: "{'P0607': 11}\n",
        note: "The program stops with `KeyError: 'P0123'`. `-=` has to read the old value first, and there isn't one. Plain `stock[\"P0123\"] = 5` would work, because it doesn't read anything.",
      },
      {
        kind: "text",
        md: "In a real system, changes arrive as a list of events, such as sales. Apply them one at a time, check that each key exists, and react when a value crosses a limit.",
      },
      {
        kind: "example",
        title: "Applying a day's sales",
        code: src`
stock = {"P0607": 12, "P0208": 3, "P0659": 7}
sales = [("P0607", 2), ("P0208", 2), ("P0123", 1), ("P0659", 5)]
for product_id, quantity in sales:
    if product_id not in stock:
        print("no such product:", product_id)
        continue
    stock[product_id] = stock[product_id] - quantity
    if stock[product_id] < 3:
        print("reorder", product_id, "only", stock[product_id], "left")
print(stock)
`,
        output: "reorder P0208 only 1 left\nno such product: P0123\nreorder P0659 only 2 left\n{'P0607': 10, 'P0208': 1, 'P0659': 2}\n",
        note: "`continue` (see Loops & Iteration) skips the rest of the pass for an unknown product, so it is reported but never stored. Without the check, `P0123` would raise KeyError and stop the whole day's update.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever values per key change over time: stock, latest status, the newest email address. **Mistakes to avoid:**\n\n- Using `+=` or `-=` on a key that may not exist yet.\n- Expecting `d[key] = value` to fail for an existing key. It silently replaces the value.\n- Deleting a key that isn't there, which also raises KeyError.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A delivery arrives",
      prompt: "A delivery of 20 units of P0208 has arrived. Add one line that increases that product's stock by `delivered`, then print the dictionary.",
      spec: [
        ["Inputs", "`stock` and `delivered`"],
        ["Prints", "the dictionary after P0208's stock goes up by `delivered`"],
      ],
      starter: src`
stock = {"P0607": 12, "P0208": 3}
delivered = 20
print(stock)
`,
      answer: src`
stock = {"P0607": 12, "P0208": 3}
delivered = 20
stock["P0208"] = stock["P0208"] + delivered
print(stock)
`,
      wrong: [
        {
          code: src`
stock = {"P0607": 12, "P0208": 3}
delivered = 20
stock["P0208"] = delivered
print(stock)
`,
          fails: ["output", "other"],
          why: "the stock is replaced by the delivery instead of increased by it",
        },
      ],
      hints: [
        "The new value is the old value plus the delivery.",
        "Read `stock[\"P0208\"]` on the right of `=` and store into it on the left.",
        "Put the update before the print.",
      ],
      task: {
        checks: [
          out("{'P0607': 12, 'P0208': 23}\n"),
          rerun("other", "a different delivery", { stock: { P0208: 4 }, delivered: 6 }, "{'P0208': 10}\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Latest email per customer",
        prompt: "Customers change their email addresses. `updates` lists `(customer_id, email)` changes in the order they happened. Build a dictionary of each customer's **latest** email, then print how many customers it holds and the dictionary itself.",
        spec: [
          ["Input", "`updates`, a list of `(customer_id, email)` tuples, oldest first"],
          ["Prints", "line 1: the number of customers; line 2: the dictionary, with keys in the order customers first appear"],
          ["Example", "the starter's updates print `2` then `{'C00164': 'isaac@sato.dev', 'C00800': 'samuel_mensah@yahoo.com'}`"],
        ],
        starter: src`
updates = [("C00164", "isaac.sato62@gmail.com"), ("C00800", "samuel_mensah@yahoo.com"), ("C00164", "isaac@sato.dev")]
emails = {}
`,
        answer: src`
updates = [("C00164", "isaac.sato62@gmail.com"), ("C00800", "samuel_mensah@yahoo.com"), ("C00164", "isaac@sato.dev")]
emails = {}
for customer_id, email in updates:
    emails[customer_id] = email
print(len(emails))
print(emails)
`,
        alternatives: [
          src`
updates = [("C00164", "isaac.sato62@gmail.com"), ("C00800", "samuel_mensah@yahoo.com"), ("C00164", "isaac@sato.dev")]
emails = {}
for update in updates:
    emails[update[0]] = update[1]
print(len(emails))
print(emails)
`,
        ],
        wrong: [
          {
            code: src`
updates = [("C00164", "isaac.sato62@gmail.com"), ("C00800", "samuel_mensah@yahoo.com"), ("C00164", "isaac@sato.dev")]
emails = {}
for customer_id, email in updates:
    if customer_id not in emails:
        emails[customer_id] = email
print(len(emails))
print(emails)
`,
            fails: ["output", "three-changes"],
            why: "only the first email is stored, so later changes are ignored",
          },
          {
            code: src`
updates = [("C00164", "isaac.sato62@gmail.com"), ("C00800", "samuel_mensah@yahoo.com"), ("C00164", "isaac@sato.dev")]
emails = {}
for customer_id, email in updates:
    emails[customer_id] = email
print(len(updates))
print(emails)
`,
            fails: ["output", "three-changes"],
            why: "it counts the updates, not the customers",
          },
        ],
        hints: [
          "Storing a value under a key that already exists replaces it, which is exactly \"latest wins\".",
          "Unpack each update into the customer ID and the email.",
          "`len` of the dictionary counts its keys, one per customer.",
        ],
        task: {
          checks: [
            out("2\n{'C00164': 'isaac@sato.dev', 'C00800': 'samuel_mensah@yahoo.com'}\n"),
            rerun("three-changes", "one customer changing three times", { updates: [tup("C1", "a@x.io"), tup("C1", "b@x.io"), tup("C1", "c@x.io")] }, "1\n{'C1': 'c@x.io'}\n"),
            rerun("empty", "no updates", { updates: [] }, "0\n{}\n"),
            rerun("distinct", "every customer once", { updates: [tup("C2", "two@x.io"), tup("C1", "one@x.io")] }, "2\n{'C2': 'two@x.io', 'C1': 'one@x.io'}\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Remove discontinued products",
        prompt: "Some products have been discontinued. Remove each ID in `discontinued` from the `prices` dictionary. The list may name products that were never in the catalogue, and those must not crash the program. Print how many products were removed, then the remaining dictionary.",
        spec: [
          ["Inputs", "`prices`, a dictionary from product ID to price; `discontinued`, a list of product IDs"],
          ["Prints", "line 1: the number of pairs removed; line 2: `prices` after the removals"],
          ["Example", "the starter's data prints `1` then `{'P0607': 6.49, 'P0659': 51.49}`"],
        ],
        starter: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
discontinued = ["P0208", "P0999"]
`,
        answer: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
discontinued = ["P0208", "P0999"]
removed = 0
for product_id in discontinued:
    if product_id in prices:
        del prices[product_id]
        removed = removed + 1
print(removed)
print(prices)
`,
        alternatives: [
          src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
discontinued = ["P0208", "P0999"]
before = len(prices)
for product_id in discontinued:
    if product_id not in prices:
        continue
    del prices[product_id]
print(before - len(prices))
print(prices)
`,
        ],
        wrong: [
          {
            code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
discontinued = ["P0208", "P0999"]
removed = 0
for product_id in discontinued:
    del prices[product_id]
    removed = removed + 1
print(removed)
print(prices)
`,
            fails: ["all", "none", "output", "repeated"],
            why: "deleting an ID that isn't in the dictionary raises KeyError, which stops the program before anything is printed",
          },
          {
            code: src`
prices = {"P0607": 6.49, "P0208": 66.49, "P0659": 51.49}
discontinued = ["P0208", "P0999"]
removed = 0
for product_id in discontinued:
    if product_id in prices:
        del prices[product_id]
    removed = removed + 1
print(removed)
print(prices)
`,
            fails: ["output", "repeated"],
            why: "the count goes up for IDs that weren't there, so it counts the list, not the removals",
          },
        ],
        hints: [
          "`del prices[key]` removes one pair, but only if the key exists.",
          "Check with `in` before deleting, and count only the deletions that happen.",
          "An ID listed twice can only be removed once.",
        ],
        task: {
          checks: [
            out("1\n{'P0607': 6.49, 'P0659': 51.49}\n"),
            rerun("repeated", "an ID listed twice", { discontinued: ["P0607", "P0607"] }, "1\n{'P0208': 66.49, 'P0659': 51.49}\n"),
            rerun("all", "every product discontinued", { discontinued: ["P0659", "P0208", "P0607"] }, "3\n{}\n"),
            rerun("none", "nothing discontinued", { discontinued: [] }, "0\n{'P0607': 6.49, 'P0208': 66.49, 'P0659': 51.49}\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
status = {"O100043": "shipped", "O101217": "packed"}
status["O101217"] = "shipped"
status["O104839"] = "packed"
del status["O100043"]
print(status)
`,
        choices: ["{'O101217': 'shipped', 'O104839': 'packed'}", "{'O104839': 'packed', 'O101217': 'shipped'}", "{'O100043': 'shipped', 'O101217': 'shipped', 'O104839': 'packed'}", "KeyError"],
        answer: 0,
        why: "Replacing O101217's value keeps its place, O104839 is added at the end, and O100043 is removed.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `+=` on a key that is new. What does this print?",
        program: src`
views = {}
views["Wild Archive"] = 0
views["Wild Archive"] += 1
print(views)
views["Up"] += 1
print(views)
`,
        choices: ["{'Wild Archive': 1}", "{'Wild Archive': 1}\n{'Wild Archive': 1, 'Up': 1}", "{'Wild Archive': 1}\n{'Wild Archive': 1, 'Up': 0}", "{'Wild Archive': 0}"],
        answer: 0,
        why: "The first update works because the key was stored first. `views[\"Up\"] += 1` raises KeyError before the second print, so only one line appears.",
      },
      {
        id: "q3",
        prompt: "An order's status changes from `packed` to `shipped`. Which line records that?",
        choices: ["status[order_id] = \"shipped\"", "del status[\"shipped\"]", "status[\"shipped\"] = order_id", "\"shipped\" in status"],
        answer: 0,
        why: "Storing under the existing key replaces the old value. The others delete a key that doesn't exist, store the wrong way round, or only ask a question.",
      },
    ],
    review: [
      "`d[key] = value` adds a new pair or replaces the value of an existing key. `del d[key]` removes a pair.",
      "`d[key] -= n` and `d[key] += n` read the old value first, so the key must exist.",
      "Apply events one at a time, check keys with `in`, and use `continue` to skip the unknown ones.",
      "Next: walk every key and value of a dictionary to answer questions about all of it.",
    ],
  },

  // ------------------------------------------------------------------ PY-L08-03 iterate
  {
    id: "PY-L08-03",
    version: 2,
    slug: "walk-a-dictionary",
    title: "Walk the pairs",
    lede: "for key in d visits the keys, and for key, value in d.items() visits the pairs, in the order they were added. You can read values in the loop, but not add or remove keys.",
    focus: "Loop over a dictionary's keys and pairs to report on, search or total all of it.",
    minutes: 16,
    objectives: [
      "Loop over keys, over `items()` pairs, and over `values()`",
      "Find the key with the smallest or largest value",
      "Explain why adding or removing keys inside the loop raises RuntimeError",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "decimal-number", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "comparison", "logical", "if-statement", "for-loop", "membership", "string-format", "top-level-indent", "runtime-error", "list-literal", "list-mutate", "tuple-unpack", "dict-literal", "dict-lookup", "dict-store", "precedence", "string-index", "list-index", "conversion", "continue-statement", "len-call", "string-method"],
    teaches: ["dict-iterate"],
    blocks: [
      {
        kind: "text",
        md: "Questions about a whole dictionary need a loop: *which product is cheapest?*, *what is all the stock worth?* `for key in d` visits each **key**, in the order the keys were added. `d.items()` gives each **pair**, which you unpack into two names: `for title, rating in averages.items()`. `d.values()` gives only the values, and `d.keys()` only the keys.",
      },
      {
        kind: "example",
        title: "Average rating per film",
        code: src`
averages = {"Wild Archive": 3.4, "Night Harbor": 4.6, "Up": 2.8}
for title in averages:
    print(title)
for title, rating in averages.items():
    print(f"{title:<14}{rating:>4}")
print(list(averages.values()))
`,
        output: "Wild Archive\nNight Harbor\nUp\nWild Archive   3.4\nNight Harbor   4.6\nUp             2.8\n[3.4, 4.6, 2.8]\n",
        note: "Looping over the dictionary itself gives the keys. `items()` gives `(key, value)` pairs, unpacked just like the tuples in the Lists & Tuples module. `list(...)` turns the values into an ordinary list for printing.",
      },
      {
        kind: "text",
        md: "Searching and totalling follow the same patterns you used on lists, now with a key for every value. To find the cheapest product, remember the best **key** so far, so you can still report both the ID and its price. To value the stock, walk one dictionary and look up the matching price in another, using the same keys.",
      },
      {
        kind: "example",
        title: "Cheapest product and stock value",
        code: src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
cheapest = None
for product_id, price in prices.items():
    if cheapest is None or price < prices[cheapest]:
        cheapest = product_id
value = 0
for product_id, quantity in stock.items():
    value = value + quantity * prices[product_id]
print(cheapest, prices[cheapest])
print(f"stock value {value:.2f}")
`,
        output: "P0146 15.99\nstock value 553.86\n",
        note: "Starting `cheapest` at None and testing `is None` first means any dictionary works. There is no need to guess a starting price.",
      },
      {
        kind: "error-example",
        title: "Changing the keys while looping",
        code: src`
stock = {"P0035": 4, "P0146": 0, "P0164": 2}
for product_id, quantity in stock.items():
    if quantity == 0:
        del stock[product_id]
print(stock)
`,
        error: "RuntimeError",
        output: "",
        note: "The program stops with `RuntimeError: dictionary changed size during iteration`. Collect the keys to remove in a list during the loop, then delete them after it. Changing values is fine; adding or removing keys is not.",
      },
      {
        kind: "text",
        md: "**When to use it:** for reports, searches and totals over every pair. **Mistakes to avoid:**\n\n- Looping over the dictionary and expecting values. You get keys.\n- Forgetting `.items()` when you unpack two names, which raises ValueError.\n- Adding or deleting keys inside the loop.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the well-rated films",
      prompt: "This prints every film with its rating. Change it to print only the films rated **4 or higher**.",
      spec: [
        ["Input", "`averages`, a dictionary from title to average rating"],
        ["Prints", "`<title> <rating>` for each film rated at least 4, in dictionary order"],
      ],
      starter: src`
averages = {"Wild Archive": 3.4, "Night Harbor": 4.6, "Up": 2.8, "Blue Dune": 4.0}
for title, rating in averages.items():
    print(title, rating)
`,
      answer: src`
averages = {"Wild Archive": 3.4, "Night Harbor": 4.6, "Up": 2.8, "Blue Dune": 4.0}
for title, rating in averages.items():
    if rating >= 4:
        print(title, rating)
`,
      wrong: [
        {
          code: src`
averages = {"Wild Archive": 3.4, "Night Harbor": 4.6, "Up": 2.8, "Blue Dune": 4.0}
for title, rating in averages.items():
    if rating > 4:
        print(title, rating)
`,
          fails: ["output", "others"],
          why: "`> 4` drops a film rated exactly 4.0",
        },
      ],
      hints: [
        "Keep the loop; put a test in front of the print.",
        "\"4 or higher\" includes 4 itself.",
        "Indent the print under the `if`.",
      ],
      task: {
        checks: [
          out("Night Harbor 4.6\nBlue Dune 4.0\n"),
          rerun("others", "other films", { averages: { A: 4, B: 3.9 } }, "A 4\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Products under a price",
        prompt: "A \"gifts under X\" page lists the **names** of products cheaper than `limit`. Prices are in `prices` and names in `names`, both keyed by product ID. Print the list of names, in the order of `prices`.",
        spec: [
          ["Inputs", "`prices` and `names`, two dictionaries with the same product IDs; `limit`, a number"],
          ["Prints", "a list of the names of products priced below `limit`"],
          ["Example", "the starter's data with limit 30 prints `['Mini Knife Set', 'Nordic Handbook']`"],
        ],
        starter: src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
names = {"P0035": "Deluxe Pillow", "P0087": "Mini Knife Set", "P0146": "Nordic Handbook", "P0164": "Studio Lamp"}
limit = 30
`,
        answer: src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
names = {"P0035": "Deluxe Pillow", "P0087": "Mini Knife Set", "P0146": "Nordic Handbook", "P0164": "Studio Lamp"}
limit = 30
cheap = []
for product_id, price in prices.items():
    if price < limit:
        cheap.append(names[product_id])
print(cheap)
`,
        alternatives: [
          src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
names = {"P0035": "Deluxe Pillow", "P0087": "Mini Knife Set", "P0146": "Nordic Handbook", "P0164": "Studio Lamp"}
limit = 30
cheap = []
for product_id in prices:
    if prices[product_id] < limit:
        cheap.append(names[product_id])
print(cheap)
`,
        ],
        wrong: [
          {
            code: src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
names = {"P0035": "Deluxe Pillow", "P0087": "Mini Knife Set", "P0146": "Nordic Handbook", "P0164": "Studio Lamp"}
limit = 30
cheap = []
for product_id, price in prices.items():
    if price < limit:
        cheap.append(product_id)
print(cheap)
`,
            fails: ["equal", "higher-limit", "output"],
            why: "it lists the product IDs, not their names",
          },
          {
            code: src`
prices = {"P0035": 47.99, "P0087": 29.99, "P0146": 15.99, "P0164": 31.0}
names = {"P0035": "Deluxe Pillow", "P0087": "Mini Knife Set", "P0146": "Nordic Handbook", "P0164": "Studio Lamp"}
limit = 30
cheap = []
for product_id, price in prices.items():
    if price <= limit:
        cheap.append(names[product_id])
print(cheap)
`,
            fails: ["equal"],
            why: "`<=` includes a product priced exactly at the limit, which is not below it",
          },
        ],
        hints: [
          "Walk the prices with `items()` so each pass has an ID and a price.",
          "The same ID is the key into `names`.",
          "Build a list with `append` and print it once at the end.",
        ],
        task: {
          checks: [
            out("['Mini Knife Set', 'Nordic Handbook']\n"),
            rerun("higher-limit", "a higher limit", { limit: 32 }, "['Mini Knife Set', 'Nordic Handbook', 'Studio Lamp']\n"),
            rerun("equal", "a price exactly at the limit", { limit: 31.0 }, "['Mini Knife Set', 'Nordic Handbook']\n"),
            rerun("none", "a limit below every price", { limit: 10 }, "[]\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "What to reorder",
        prompt: "`stock` holds the units on hand and `levels` the reorder level for each product. Some products have no level yet and must be skipped. For each product in `stock` that is **below** its level, print `<id>: <n> in stock, order <m>`, where the order brings it up to twice its level (`m = 2 × level − n`). If nothing needs ordering, print `nothing to order`.",
        spec: [
          ["Inputs", "`stock` and `levels`, dictionaries keyed by product ID (`levels` may miss some IDs)"],
          ["Prints", "one line per product below its level, in `stock` order, or `nothing to order`"],
          ["Example", "the starter's data prints lines for P0035 (order 6) and P0146 (order 2)"],
        ],
        starter: src`
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
levels = {"P0035": 5, "P0087": 5, "P0146": 1}
`,
        answer: src`
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
levels = {"P0035": 5, "P0087": 5, "P0146": 1}
ordered = 0
for product_id, on_hand in stock.items():
    if product_id in levels and on_hand < levels[product_id]:
        amount = levels[product_id] * 2 - on_hand
        print(f"{product_id}: {on_hand} in stock, order {amount}")
        ordered = ordered + 1
if ordered == 0:
    print("nothing to order")
`,
        alternatives: [
          src`
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
levels = {"P0035": 5, "P0087": 5, "P0146": 1}
lines = []
for product_id in stock:
    if product_id not in levels:
        continue
    level = levels[product_id]
    if stock[product_id] < level:
        lines.append(product_id + ": " + str(stock[product_id]) + " in stock, order " + str(2 * level - stock[product_id]))
if len(lines) == 0:
    print("nothing to order")
for line in lines:
    print(line)
`,
        ],
        wrong: [
          {
            code: src`
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
levels = {"P0035": 5, "P0087": 5, "P0146": 1}
ordered = 0
for product_id, on_hand in stock.items():
    if on_hand < levels[product_id]:
        amount = levels[product_id] * 2 - on_hand
        print(f"{product_id}: {on_hand} in stock, order {amount}")
        ordered = ordered + 1
if ordered == 0:
    print("nothing to order")
`,
            fails: ["all-fine", "at-level", "order", "output"],
            why: "a product with no level is looked up anyway, which raises KeyError before anything is printed",
          },
          {
            code: src`
stock = {"P0035": 4, "P0087": 10, "P0146": 0, "P0164": 2}
levels = {"P0035": 5, "P0087": 5, "P0146": 1}
ordered = 0
for product_id, level in levels.items():
    if stock[product_id] < level:
        amount = level * 2 - stock[product_id]
        print(f"{product_id}: {stock[product_id]} in stock, order {amount}")
        ordered = ordered + 1
if ordered == 0:
    print("nothing to order")
`,
            fails: ["order"],
            why: "walking `levels` instead of `stock` prints the lines in the wrong order",
          },
        ],
        hints: [
          "Walk `stock` with `items()`, and skip any product that has no level.",
          "`and` stops at the first False, so a test like `id in levels and ...` never reaches the lookup for a missing ID.",
          "Count the lines you print so you know whether to print the fallback.",
        ],
        task: {
          checks: [
            out("P0035: 4 in stock, order 6\nP0146: 0 in stock, order 2\n"),
            rerun("all-fine", "every product above its level", { stock: { A: 9, B: 9 }, levels: { A: 2 } }, "nothing to order\n"),
            rerun("at-level", "stock exactly at the level", { stock: { A: 5, B: 1 }, levels: { A: 5, B: 3 } }, "B: 1 in stock, order 5\n"),
            rerun("order", "levels listed in a different order", { stock: { A: 0, B: 0 }, levels: { B: 1, A: 2 } }, "A: 0 in stock, order 4\nB: 0 in stock, order 2\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
seats = {"12A": "Ana", "3C": "Ben", "7B": "Cy"}
names = []
for seat, name in seats.items():
    if seat.endswith("C") or name == "Cy":
        names.append(name)
print(names, list(seats)[0])
`,
        choices: ["['Ben', 'Cy'] 12A", "['Ben', 'Cy'] Ana", "['3C', '7B'] 12A", "['Cy', 'Ben'] 12A"],
        answer: 0,
        why: "Pairs come in insertion order. 3C ends with C and Cy matches by name. `list(seats)` lists the keys, so its first item is 12A.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `.items()` is missing. What happens?",
        program: src`
prices = {"P0035": 47.99, "P0146": 15.99}
for product_id in prices:
    print(product_id)
`,
        choices: ["P0035\nP0146", "47.99\n15.99", "P0035 47.99\nP0146 15.99", "ValueError"],
        answer: 0,
        why: "Looping over a dictionary gives its keys only. With two names and no `.items()`, Python would try to unpack each key text into two names and raise ValueError.",
      },
      {
        id: "q3",
        prompt: "You need the product ID with the highest price. What should the loop remember?",
        choices: ["The best product ID so far", "Only the highest price so far", "A list of every price", "The number of products"],
        answer: 0,
        why: "With the ID you can still look up its price, but with only the price you can't recover which product it belongs to.",
      },
    ],
    review: [
      "`for key in d` gives keys, `d.items()` gives `(key, value)` pairs, and `d.values()` gives values, all in insertion order.",
      "To find the best pair, remember the best key so far, starting from None.",
      "Change values in a loop if you need to, but never add or remove keys while looping.",
      "Next: sets, for distinct values and for comparing two groups.",
    ],
  },

  // ------------------------------------------------------------------ PY-L08-04 sets
  {
    id: "PY-L08-04",
    version: 2,
    slug: "sets",
    title: "Sets: distinct values and comparisons",
    lede: "A set holds each value once. set(items) removes repeats, and intersection, union and difference compare two groups. A set has no order, so sort it before you print it.",
    focus: "Use sets to keep distinct values and to compare two groups.",
    minutes: 18,
    objectives: [
      "Make a set from a literal or from a list with `set(...)`, and test membership",
      "Answer group questions with `intersection`, `union` and `difference`",
      "Print a set reliably with `sorted`, and remember that `{}` is an empty dictionary",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "string-method", "string-slice", "comparison", "if-statement", "else-clause", "for-loop", "membership", "len-call", "type-call", "top-level-indent", "list-literal", "list-mutate", "list-sort", "dict-literal", "arithmetic", "string-format", "list-index", "logical", "truthiness"],
    teaches: ["set-literal", "set-op"],
    blocks: [
      {
        kind: "text",
        md: "Some questions are about groups, not individual items: *which customers ordered in both months?*, *which tags do two films share?* A **set** is a collection of distinct values. A repeated value is kept once, and `in` on a set is very fast.\n\nWrite a set with curly braces and no colons: `{\"noir\", \"heist\"}`. `set(items)` builds one from a list and drops the repeats. Three methods compare two sets:\n\n- `a.intersection(b)`: the values in both.\n- `a.union(b)`: the values in either.\n- `a.difference(b)`: the values in `a` but not in `b`.",
      },
      {
        kind: "example",
        title: "Tags two films share",
        code: src`
first = {"thriller", "noir", "slow burn", "twist ending"}
second = {"noir", "twist ending", "heist"}
print(sorted(first.intersection(second)))
print(sorted(first.union(second)))
print(sorted(first.difference(second)), sorted(second.difference(first)))
print(len(first), "noir" in first)
`,
        output: "['noir', 'twist ending']\n['heist', 'noir', 'slow burn', 'thriller', 'twist ending']\n['slow burn', 'thriller'] ['heist']\n4 True\n",
        note: "A set has no positions, and the order it prints in is not something to rely on. `sorted(...)` turns it into a list in a fixed order. `difference` depends on the direction: `a.difference(b)` is not `b.difference(a)`.",
      },
      {
        kind: "text",
        md: "In data work, sets usually come from lists. An order history repeats customers, so `set(customer_ids)` gives each customer once. Comparing two months then answers retention questions directly.",
      },
      {
        kind: "example",
        title: "Returning, new and lapsed customers",
        code: src`
january = ["C00164", "C00800", "C04248", "C00800", "C00164"]
february = ["C00800", "C01338", "C00800", "C00077"]
jan = set(january)
feb = set(february)
print(len(january), "orders,", len(jan), "customers in January")
print("returning:", sorted(jan.intersection(feb)))
print("new in February:", sorted(feb.difference(jan)))
print("lapsed:", sorted(jan.difference(feb)))
print(type({}), type(set()))
`,
        output: "5 orders, 3 customers in January\nreturning: ['C00800']\nnew in February: ['C00077', 'C01338']\nlapsed: ['C00164', 'C04248']\n<class 'dict'> <class 'set'>\n",
        note: "`{}` with nothing inside is an empty **dictionary**. An empty set is written `set()`.",
      },
      {
        kind: "text",
        md: "**When to use it:** to remove repeats when order doesn't matter, to test membership in a large group, and to compare two groups. **Mistakes to avoid:**\n\n- Printing a set and expecting a fixed order.\n- Writing `{}` for an empty set.\n- Using a set when you need the first-seen order or the repeats. That is a job for a list.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Tags only the second film has",
      prompt: "This prints the tags both films share. Change it to print, sorted, the tags that only the **second** film has.",
      spec: [
        ["Inputs", "`first` and `second`, two sets of tags"],
        ["Prints", "a sorted list of the tags in `second` but not in `first`"],
      ],
      starter: src`
first = {"thriller", "noir", "slow burn"}
second = {"noir", "heist", "caper"}
print(sorted(first.intersection(second)))
`,
      answer: src`
first = {"thriller", "noir", "slow burn"}
second = {"noir", "heist", "caper"}
print(sorted(second.difference(first)))
`,
      wrong: [
        {
          code: src`
first = {"thriller", "noir", "slow burn"}
second = {"noir", "heist", "caper"}
print(sorted(first.difference(second)))
`,
          fails: ["output", "others"],
          why: "the direction is reversed: these are the tags only the first film has",
        },
      ],
      hints: [
        "Which method keeps the values of one set that are not in the other?",
        "The set you call the method on is the one whose values are kept.",
        "Keep `sorted` so the output has a fixed order.",
      ],
      task: {
        checks: [
          out("['caper', 'heist']\n"),
          rerun("others", "other tags", { first: py.set(py.str("a")), second: py.set(py.str("a"), py.str("b")) }, "['b']\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Unique visitors",
        prompt: "A shop's analytics records a customer ID for every visit. Print how many different customers visited and how many visits were repeat visits (every visit after a customer's first), then the sorted list of customer IDs.",
        spec: [
          ["Input", "`visits`, a list of customer IDs, with repeats"],
          ["Line 1", "`<u> customers, <r> repeat visits`"],
          ["Line 2", "the customer IDs, sorted, each once"],
          ["Example", "the starter's visits print `3 customers, 3 repeat visits` then `['C00164', 'C00800', 'C04248']`"],
        ],
        starter: src`
visits = ["C00164", "C00800", "C00164", "C04248", "C00800", "C00164"]
`,
        answer: src`
visits = ["C00164", "C00800", "C00164", "C04248", "C00800", "C00164"]
customers = set(visits)
print(len(customers), "customers,", len(visits) - len(customers), "repeat visits")
print(sorted(customers))
`,
        alternatives: [
          src`
visits = ["C00164", "C00800", "C00164", "C04248", "C00800", "C00164"]
seen = []
repeats = 0
for customer in visits:
    if customer in seen:
        repeats = repeats + 1
    else:
        seen.append(customer)
print(f"{len(seen)} customers, {repeats} repeat visits")
print(sorted(seen))
`,
        ],
        wrong: [
          {
            code: src`
visits = ["C00164", "C00800", "C00164", "C04248", "C00800", "C00164"]
customers = set(visits)
print(len(visits), "customers,", len(visits) - len(customers), "repeat visits")
print(sorted(customers))
`,
            fails: ["one-customer", "output"],
            why: "`len(visits)` counts visits, not different customers",
          },
          {
            code: src`
visits = ["C00164", "C00800", "C00164", "C04248", "C00800", "C00164"]
customers = set(visits)
print(len(customers), "customers,", len(visits) - len(customers), "repeat visits")
print(customers)
`,
            fails: ["empty", "no-repeats", "one-customer", "output"],
            why: "the set is printed as it is, in no reliable order and with braces, instead of as a sorted list",
          },
        ],
        hints: [
          "`set(visits)` keeps each customer once.",
          "Every visit that is not a customer's first is a repeat, so compare two lengths.",
          "`sorted` turns a set into a list in a fixed order.",
        ],
        task: {
          checks: [
            out("3 customers, 3 repeat visits\n['C00164', 'C00800', 'C04248']\n"),
            rerun("no-repeats", "no repeat visits", { visits: ["C2", "C1"] }, "2 customers, 0 repeat visits\n['C1', 'C2']\n"),
            rerun("one-customer", "one customer visiting many times", { visits: ["C9", "C9", "C9", "C9"] }, "1 customers, 3 repeat visits\n['C9']\n"),
            rerun("empty", "no visits", { visits: [] }, "0 customers, 0 repeat visits\n[]\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Allergen check",
        prompt: "Open Food Facts stores a product's allergens as tags such as `en:gluten`. A shopper types the allergens they must avoid, in any capitals and with stray spaces. Remove the `en:` prefix from the tags, clean the shopper's words with `strip` and `lower`, and compare the two groups. Print `safe` if nothing matches, otherwise `contains` and the sorted list of matches.",
        spec: [
          ["Inputs", "`tags`, a list of tags that all start with `en:`; `avoid`, a list of words as typed"],
          ["Prints", "`safe`, or `contains` followed by a sorted list of the shared allergens"],
          ["Example", "the starter's data prints `contains ['gluten', 'milk']`"],
        ],
        starter: src`
tags = ["en:gluten", "en:milk", "en:soybeans"]
avoid = ["Peanuts", " milk", "GLUTEN"]
`,
        answer: src`
tags = ["en:gluten", "en:milk", "en:soybeans"]
avoid = ["Peanuts", " milk", "GLUTEN"]
product = []
for tag in tags:
    product.append(tag[3:])
shopper = []
for word in avoid:
    shopper.append(word.strip().lower())
shared = set(product).intersection(set(shopper))
if len(shared) == 0:
    print("safe")
else:
    print("contains", sorted(shared))
`,
        alternatives: [
          src`
tags = ["en:gluten", "en:milk", "en:soybeans"]
avoid = ["Peanuts", " milk", "GLUTEN"]
cleaned = []
for word in avoid:
    cleaned.append(word.lower().strip())
shared = []
for tag in tags:
    allergen = tag.replace("en:", "")
    if allergen in cleaned and allergen not in shared:
        shared.append(allergen)
if shared:
    print("contains", sorted(shared))
else:
    print("safe")
`,
        ],
        wrong: [
          {
            code: src`
tags = ["en:gluten", "en:milk", "en:soybeans"]
avoid = ["Peanuts", " milk", "GLUTEN"]
product = []
for tag in tags:
    product.append(tag[3:])
shared = set(product).intersection(set(avoid))
if len(shared) == 0:
    print("safe")
else:
    print("contains", sorted(shared))
`,
            fails: ["output", "capitals"],
            why: "the shopper's words are compared as typed, so `GLUTEN` and ` milk` never match",
          },
          {
            code: src`
tags = ["en:gluten", "en:milk", "en:soybeans"]
avoid = ["Peanuts", " milk", "GLUTEN"]
shopper = []
for word in avoid:
    shopper.append(word.strip().lower())
shared = set(tags).intersection(set(shopper))
if len(shared) == 0:
    print("safe")
else:
    print("contains", sorted(shared))
`,
            fails: ["output", "capitals"],
            why: "the `en:` prefix is still on the tags, so no word ever matches",
          },
        ],
        hints: [
          "Make two clean lists first: allergens without the prefix, and the shopper's words tidied.",
          "Every tag starts with the same three characters, so a slice can drop them.",
          "`intersection` gives the shared values; sort them before printing.",
        ],
        task: {
          checks: [
            out("contains ['gluten', 'milk']\n"),
            rerun("safe", "nothing in common", { avoid: ["peanuts", "sesame"] }, "safe\n"),
            rerun("capitals", "words typed in capitals with spaces", { tags: ["en:nuts"], avoid: ["  NUTS  "] }, "contains ['nuts']\n"),
            rerun("no-tags", "a product with no allergens", { tags: [], avoid: ["milk"] }, "safe\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
codes = ["P0607", "P0208", "P0607", "P0659", "P0208"]
unique = set(codes)
print(len(codes), len(unique), sorted(unique))
`,
        choices: ["5 3 ['P0208', 'P0607', 'P0659']", "5 5 ['P0208', 'P0607', 'P0659']", "3 3 ['P0607', 'P0208', 'P0659']", "5 3 ['P0607', 'P0208', 'P0659']"],
        answer: 0,
        why: "The list keeps all 5 codes. The set keeps 3 distinct ones, and `sorted` puts them in order.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `{}` is used for an empty set. What does this print?",
        program: src`
tags = {}
print(type(tags), len(tags))
`,
        choices: ["<class 'dict'> 0", "<class 'set'> 0", "<class 'list'> 0", "TypeError"],
        answer: 0,
        why: "Empty braces make an empty dictionary. Write `set()` for an empty set.",
      },
      {
        id: "q3",
        prompt: "Which question does `this_month.difference(last_month)` answer, for two sets of customer IDs?",
        choices: ["Which customers are new this month", "Which customers bought in both months", "Which customers bought last month only", "How many customers there are in total"],
        answer: 0,
        why: "`a.difference(b)` keeps the values of `a` that are not in `b`: customers this month who weren't there last month.",
      },
    ],
    review: [
      "A set keeps each value once. `set(items)` removes repeats, and `in` on a set is fast.",
      "`intersection` gives both, `union` gives either, and `difference` gives one but not the other, which depends on the direction.",
      "A set has no order, so print `sorted(s)`. `{}` is an empty dictionary and `set()` is an empty set.",
      "Next: dictionaries and lists inside dictionaries, the shape of real records.",
    ],
  },

  // ------------------------------------------------------------------ PY-L08-05 nested
  {
    id: "PY-L08-05",
    version: 2,
    slug: "nested-dictionaries",
    title: "Records inside records",
    lede: "Real records nest: an order has a customer dictionary and a list of line dictionaries. Each pair of brackets goes one level deeper: order[\"customer\"][\"city\"].",
    focus: "Read, total and update values inside nested dictionaries and lists of dictionaries.",
    minutes: 18,
    objectives: [
      "Read a value two levels down, one lookup at a time",
      "Loop over a list of dictionaries stored under a key, and total it",
      "Update an inner value in place, and tell a KeyError from a TypeError when you take a wrong turn",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "conditional-expr", "for-loop", "membership", "len-call", "string-format", "top-level-indent", "runtime-error", "list-literal", "list-mutate", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "string-index", "list-index", "conversion"],
    teaches: ["nested-dict"],
    blocks: [
      {
        kind: "text",
        md: "An order from an online shop is not flat. It has a customer (a record with a city and a state) and several lines (each with a SKU, a quantity and a price). In Python that is a dictionary whose values include another dictionary and a list of dictionaries, the same shape that web APIs send as JSON.\n\nRead it one step at a time. `order[\"customer\"]` is the inner dictionary, so `order[\"customer\"][\"city\"]` is its city. `order[\"items\"]` is a list, so you loop over it.",
      },
      {
        kind: "example",
        title: "One order, two levels deep",
        code: src`
order = {
    "order_id": "O104839",
    "customer": {"customer_id": "C00800", "city": "Miami", "state": "FL"},
    "items": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49},
        {"sku": "HOM-22847", "quantity": 2, "unit_price": 31.0},
    ],
}
print(order["customer"]["city"])
print(len(order["items"]), "lines")
subtotal = 0
for line in order["items"]:
    subtotal = subtotal + line["quantity"] * line["unit_price"]
print(f"{order['order_id']} to {order['customer']['state']}: {subtotal:.2f}")
`,
        output: "Miami\n2 lines\nO104839 to FL: 113.49\n",
        note: "Brackets and braces may span several lines. Python waits for the closing one, and the trailing commas are allowed. Inside a double-quoted f-string, the keys use single quotes.",
      },
      {
        kind: "error-example",
        title: "A wrong turn at the list",
        code: src`
order = {"order_id": "O104839", "items": [{"sku": "ELE-24781", "quantity": 1}]}
print(order["items"]["sku"])
`,
        error: "TypeError",
        output: "",
        note: "The program stops with `TypeError: list indices must be integers or slices, not str`. `order[\"items\"]` is a list, which has positions, not keys. Loop over it, or pick a line first. A missing key at any level raises KeyError instead.",
      },
      {
        kind: "text",
        md: "Nested values can be changed in place. Reach the inner dictionary, then store into it. A catalogue keyed by product ID with a small record for each product is a common shape. Selling one unit changes only that product's `stock`.",
      },
      {
        kind: "example",
        title: "A catalogue of product records",
        code: src`
catalogue = {
    "P0035": {"name": "Deluxe Pillow", "price": 47.99, "stock": 4},
    "P0146": {"name": "Nordic Handbook", "price": 15.99, "stock": 0},
}
catalogue["P0035"]["stock"] = catalogue["P0035"]["stock"] - 1
catalogue["P0146"]["price"] = 12.99
for product_id, product in catalogue.items():
    status = "in stock" if product["stock"] > 0 else "sold out"
    print(product_id, product["name"], product["price"], status)
`,
        output: "P0035 Deluxe Pillow 47.99 in stock\nP0146 Nordic Handbook 12.99 sold out\n",
        note: "In the loop, `product` is the inner dictionary itself, so `product[\"name\"]` needs only one lookup.",
      },
      {
        kind: "text",
        md: "**When to use it:** for records that contain other records, such as API responses, orders with lines, or catalogues of products. **Mistakes to avoid:**\n\n- Using a key on a list. Loop over the list first.\n- Guessing the shape. Print the outer value to see whether the next level is a dictionary or a list.\n- Forgetting that a missing key at any level raises KeyError.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Where is it going?",
      prompt: "This prints the customer's city. Change it to print `city, state` (for example `Miami, FL`), both read from the nested customer record.",
      spec: [
        ["Input", "`order`, with a `\"customer\"` dictionary holding `\"city\"` and `\"state\"`"],
        ["Prints", "`<city>, <state>`"],
      ],
      starter: src`
order = {"order_id": "O104839", "customer": {"customer_id": "C00800", "city": "Miami", "state": "FL"}}
print(order["customer"]["city"])
`,
      answer: src`
order = {"order_id": "O104839", "customer": {"customer_id": "C00800", "city": "Miami", "state": "FL"}}
customer = order["customer"]
print(customer["city"] + ", " + customer["state"])
`,
      wrong: [
        {
          code: src`
order = {"order_id": "O104839", "customer": {"customer_id": "C00800", "city": "Miami", "state": "FL"}}
print(order["customer"]["city"], order["customer"]["state"])
`,
          fails: ["output", "other"],
          why: "printing two values puts a space between them but no comma",
        },
      ],
      hints: [
        "Both values live in the same inner dictionary.",
        "You can store the inner dictionary under a short name first.",
        "Join the two texts with `\", \"` between them.",
      ],
      task: {
        checks: [
          out("Miami, FL\n"),
          rerun("other", "another order", { order: { order_id: "O1", customer: { city: "Denver", state: "CO" } } }, "Denver, CO\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An order's invoice line",
        prompt: "Each line of an order has a `discount_rate` (0.15 means 15% off). Add up `quantity × unit_price × (1 − discount_rate)` over the lines. Shipping is free for items worth 50 or more, otherwise 5.99. Print `<order id>: items <i>, shipping <s>, total <t>`, all to two decimals.",
        spec: [
          ["Input", "`order`, a dictionary with `\"order_id\"` and `\"lines\"`, a list of line dictionaries"],
          ["Shipping", "0 when the discounted items total is at least 50, otherwise 5.99"],
          ["Prints", "`<id>: items <i>, shipping <s>, total <t>`"],
          ["Example", "the starter's order prints `O104839: items 75.75, shipping 0.00, total 75.75`"],
        ],
        starter: src`
order = {
    "order_id": "O104839",
    "lines": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49, "discount_rate": 0.15},
        {"sku": "BOO-58412", "quantity": 2, "unit_price": 15.99, "discount_rate": 0},
    ],
}
`,
        answer: src`
order = {
    "order_id": "O104839",
    "lines": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49, "discount_rate": 0.15},
        {"sku": "BOO-58412", "quantity": 2, "unit_price": 15.99, "discount_rate": 0},
    ],
}
items = 0
for line in order["lines"]:
    items = items + line["quantity"] * line["unit_price"] * (1 - line["discount_rate"])
if items >= 50:
    shipping = 0
else:
    shipping = 5.99
print(f"{order['order_id']}: items {items:.2f}, shipping {shipping:.2f}, total {items + shipping:.2f}")
`,
        alternatives: [
          src`
order = {
    "order_id": "O104839",
    "lines": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49, "discount_rate": 0.15},
        {"sku": "BOO-58412", "quantity": 2, "unit_price": 15.99, "discount_rate": 0},
    ],
}
items = 0
lines = order["lines"]
for line in lines:
    full = line["quantity"] * line["unit_price"]
    items = items + full - full * line["discount_rate"]
shipping = 0 if items >= 50 else 5.99
order_id = order["order_id"]
print(f"{order_id}: items {items:.2f}, shipping {shipping:.2f}, total {items + shipping:.2f}")
`,
        ],
        wrong: [
          {
            code: src`
order = {
    "order_id": "O104839",
    "lines": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49, "discount_rate": 0.15},
        {"sku": "BOO-58412", "quantity": 2, "unit_price": 15.99, "discount_rate": 0},
    ],
}
items = 0
for line in order["lines"]:
    items = items + line["quantity"] * line["unit_price"]
if items >= 50:
    shipping = 0
else:
    shipping = 5.99
print(f"{order['order_id']}: items {items:.2f}, shipping {shipping:.2f}, total {items + shipping:.2f}")
`,
            fails: ["output", "threshold"],
            why: "the discount is ignored",
          },
          {
            code: src`
order = {
    "order_id": "O104839",
    "lines": [
        {"sku": "ELE-24781", "quantity": 1, "unit_price": 51.49, "discount_rate": 0.15},
        {"sku": "BOO-58412", "quantity": 2, "unit_price": 15.99, "discount_rate": 0},
    ],
}
items = 0
for line in order["lines"]:
    items = items + line["quantity"] * line["unit_price"] * (1 - line["discount_rate"])
if items > 50:
    shipping = 0
else:
    shipping = 5.99
print(f"{order['order_id']}: items {items:.2f}, shipping {shipping:.2f}, total {items + shipping:.2f}")
`,
            fails: ["exactly-50"],
            why: "`> 50` charges shipping on an order worth exactly 50",
          },
        ],
        hints: [
          "`order[\"lines\"]` is a list, so loop over it; each line is a dictionary.",
          "Apply the discount to each line before adding it, with brackets around `1 - rate`.",
          "Decide the shipping after the loop, once the items total is known.",
        ],
        task: {
          checks: [
            out("O104839: items 75.75, shipping 0.00, total 75.75\n"),
            rerun("small", "a small order", { order: { order_id: "O100043", lines: [{ sku: "P0607", quantity: 1, unit_price: 6.49, discount_rate: 0 }] } }, "O100043: items 6.49, shipping 5.99, total 12.48\n"),
            rerun("threshold", "a discount that drops the order below 50", { order: { order_id: "O2", lines: [{ sku: "A", quantity: 1, unit_price: 55, discount_rate: 0.2 }] } }, "O2: items 44.00, shipping 5.99, total 49.99\n"),
            rerun("exactly-50", "an order worth exactly 50", { order: { order_id: "O3", lines: [{ sku: "A", quantity: 2, unit_price: 25, discount_rate: 0 }] } }, "O3: items 50.00, shipping 0.00, total 50.00\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Which warehouse can ship it?",
        prompt: "`warehouses` maps each warehouse to its own stock dictionary (product ID → units). Not every warehouse stocks every product. Print each warehouse that has **at least** `needed` units of `product_id`, with its units, in dictionary order. If none can, print `back order`.",
        spec: [
          ["Inputs", "`warehouses`, a dictionary of dictionaries; `product_id`; `needed`, a whole number"],
          ["Prints", "`<warehouse> <units>` for each warehouse with enough stock, or `back order`"],
          ["Example", "the starter's data prints `Atlanta 4` and `Denver 12`"],
        ],
        starter: src`
warehouses = {"Atlanta": {"P0035": 4, "P0146": 0}, "Denver": {"P0035": 12}, "Miami": {"P0146": 9, "P0035": 1}}
product_id = "P0035"
needed = 3
`,
        answer: src`
warehouses = {"Atlanta": {"P0035": 4, "P0146": 0}, "Denver": {"P0035": 12}, "Miami": {"P0146": 9, "P0035": 1}}
product_id = "P0035"
needed = 3
found = 0
for name, stock in warehouses.items():
    if product_id in stock and stock[product_id] >= needed:
        print(name, stock[product_id])
        found = found + 1
if found == 0:
    print("back order")
`,
        alternatives: [
          src`
warehouses = {"Atlanta": {"P0035": 4, "P0146": 0}, "Denver": {"P0035": 12}, "Miami": {"P0146": 9, "P0035": 1}}
product_id = "P0035"
needed = 3
able = []
for name in warehouses:
    units = 0
    if product_id in warehouses[name]:
        units = warehouses[name][product_id]
    if units >= needed:
        able.append(name + " " + str(units))
if len(able) == 0:
    print("back order")
for line in able:
    print(line)
`,
        ],
        wrong: [
          {
            code: src`
warehouses = {"Atlanta": {"P0035": 4, "P0146": 0}, "Denver": {"P0035": 12}, "Miami": {"P0146": 9, "P0035": 1}}
product_id = "P0035"
needed = 3
found = 0
for name, stock in warehouses.items():
    if stock[product_id] >= needed:
        print(name, stock[product_id])
        found = found + 1
if found == 0:
    print("back order")
`,
            fails: ["other-product", "none-enough"],
            why: "a warehouse that doesn't stock the product raises KeyError",
          },
          {
            code: src`
warehouses = {"Atlanta": {"P0035": 4, "P0146": 0}, "Denver": {"P0035": 12}, "Miami": {"P0146": 9, "P0035": 1}}
product_id = "P0035"
needed = 3
found = 0
for name, stock in warehouses.items():
    if product_id in stock and stock[product_id] > needed:
        print(name, stock[product_id])
        found = found + 1
if found == 0:
    print("back order")
`,
            fails: ["exact"],
            why: "`>` leaves out a warehouse with exactly the units needed",
          },
        ],
        hints: [
          "Walk the outer dictionary with `items()`: each value is that warehouse's stock dictionary.",
          "Check that the product is a key of the inner dictionary before reading it.",
          "Count the warehouses you print, so you know whether to print `back order`.",
        ],
        task: {
          checks: [
            out("Atlanta 4\nDenver 12\n"),
            rerun("other-product", "a product only some warehouses stock", { product_id: "P0146", needed: 5 }, "Miami 9\n"),
            rerun("none-enough", "no warehouse with enough", { product_id: "P0146", needed: 50 }, "back order\n"),
            rerun("exact", "a warehouse with exactly enough", { needed: 4 }, "Atlanta 4\nDenver 12\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
film = {"title": "Wild Archive", "ratings": [4, 2.5, 5], "director": {"name": "Greta Carvalho", "country": "Austria"}}
film["ratings"].append(3)
print(len(film["ratings"]), film["director"]["country"], len(film))
`,
        choices: ["4 Austria 3", "3 Austria 3", "4 Greta Carvalho 3", "4 Austria 5"],
        answer: 0,
        why: "`append` changes the list stored under `ratings`, which now has 4 items. The country is two lookups deep. The outer dictionary still has 3 keys.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the list of lines is treated as a dictionary. What does this print before it stops?",
        program: src`
order = {"order_id": "O104839", "items": [{"sku": "P0607"}, {"sku": "P0208"}]}
print(len(order["items"]))
print(order["items"]["sku"])
`,
        choices: ["2", "2\nP0607", "2\n['P0607', 'P0208']", "2\nP0607\nP0208"],
        answer: 0,
        why: "`order[\"items\"]` is a list of two lines, so the first print shows 2. A list has positions, not keys, so `[\"sku\"]` on it raises `TypeError: list indices must be integers or slices, not str` and nothing more is printed. Loop over the lines and look `sku` up in each one.",
      },
      {
        id: "q3",
        prompt: "`api = {\"data\": {\"user\": {\"name\": \"Ana\"}}}`. Which expression gives `\"Ana\"`?",
        choices: ["api[\"data\"][\"user\"][\"name\"]", "api[\"name\"]", "api[\"data\"][\"name\"]", "api[\"data\", \"user\", \"name\"]"],
        answer: 0,
        why: "Each level needs its own lookup, in order: data, then user, then name.",
      },
    ],
    review: [
      "A value in a dictionary can be another dictionary or a list. Read it one lookup at a time.",
      "Loop over a list of dictionaries, and look keys up in each one.",
      "A key used on a list raises TypeError, and a missing key at any level raises KeyError.",
      "Next module: put these steps into functions you can name, call and test.",
    ],
  },
];
