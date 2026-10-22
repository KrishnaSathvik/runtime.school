/**
 * M20 practice: ten independent problems on CSV, JSON and JSON Lines (PY-L20-01 … PY-L20-05).
 *
 * Mix: 2 function implementations, 2 data transformations (CSV → JSON), 2 validation (a JSON config, a JSONL
 * payment stream), 2 debugging (a text-sorted price ranking, a DictWriter export), 1 integration (an append-only
 * CSV → JSONL sync) and 1 output prediction. Easy: 02, 03, 06. Medium: 10, 12, 13, 16. Hard: 19, 20, 22.
 *
 * Fixtures are slices of D02 (Online Retail II invoice lines), R01 (Runtime Market customers, orders, payments and
 * products) and D11 (repository events). Checks call the learner's function on fixture files and hidden ones
 * (header-only files, cancellations, booleans posing as numbers, blank lines, files that don't exist yet) and read
 * back the CSV, JSON or JSONL file it wrote. Version 2: every question was replaced; saved progress from version 1
 * does not count as solved.
 */
import type { PyQuestion } from "../model";
import { csvRows, example, fn, hiddenCase, jsonFile, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures

const invoiceHeader = "Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country";
const linesCsv = [
  invoiceHeader,
  "536365,85123A,WHITE HANGING HEART T-LIGHT HOLDER,6,2010-12-01 08:26:00,2.55,17850,United Kingdom",
  "536373,85123A,WHITE HANGING HEART T-LIGHT HOLDER,6,2010-12-01 09:02:00,2.55,17850,United Kingdom",
  "536375,85123A,WHITE HANGING HEART T-LIGHT HOLDER,6,2010-12-01 09:32:00,2.95,17850,United Kingdom",
  "C536383,85123A,WHITE HANGING HEART T-LIGHT HOLDER,-1,2010-12-01 09:49:00,2.10,15311,United Kingdom",
  "536365,71053,WHITE METAL LANTERN,6,2010-12-01 08:26:00,3.39,17850,United Kingdom",
  "536378,85123a,WHITE HANGING HEART T-LIGHT HOLDER,32,2010-12-01 09:37:00,2.10,14688,United Kingdom",
  "C536391,21232,STRAWBERRY CERAMIC TRINKET BOX,-24,2010-12-01 10:24:00,1.25,17548,United Kingdom",
  "",
].join("\n");

const productsHeader = "product_id,sku,name,category,list_price,discontinued_on";
const productsCsv = [
  productsHeader,
  "P0035,HOM-52782,Deluxe Pillow,home,47.99,",
  "P0087,HOM-67738,Mini Knife Set,home,29.99,",
  "P0146,BOO-58412,Nordic Handbook,books,15.99,2025-02-01",
  "P0155,GRO-63674,Pro Honey,grocery,5,",
  "P0202,HOM-94585,Ultra Pillow,home,65.99,",
  "P0311,GRO-10442,Breakfast Tea,grocery,9.5,",
  "P0400,ELE-24781,\"Speaker, Organic\",electronics,120,",
  "P0412,TOY-54564,Puzzle Box,toys,,2024-11-30",
  "",
].join("\n");

const customersCsv = [
  "customer_id,first_name,last_name,email,city,state",
  "C00164,Isaac,Sato,isaac.sato62@gmail.com,New York,NY",
  "C00800,Samuel,Mensah,samuel_mensah@yahoo.com,Miami,FL",
  "C04248,Aisha,Silva,aisha.silva@gmail.com,Denver,CO",
  "C04564,Mei,Adams,mei.adams48@gmail.com,Seattle,WA",
  "",
].join("\n");

const ordersCsv = [
  "order_id,customer_id,status,total",
  "O100043,C00164,delivered,12.93",
  "O101217,C00800,delivered,71.14",
  "O104839,C00800,delivered,142.77",
  "O108024,C04248,cancelled,57.34",
  "O108752,C04564,delivered,58.71",
  "O108800,C09999,delivered,10.00",
  "O108811,C04564,returned,20.00",
  "",
].join("\n");

const paymentsJsonl = [
  "{\"payment_id\": \"PAY0000045\", \"order_id\": \"O100043\", \"amount\": 12.93, \"status\": \"captured\"}",
  "{\"payment_id\": \"PAY0008990\", \"order_id\": \"O108024\", \"amount\": 57.34, \"status\": \"failed\"}",
  "",
  "{\"payment_id\": \"P-0008991\", \"order_id\": \"O108024\", \"amount\": 57.34, \"status\": \"captured\"}",
  "{\"payment_id\": \"PAY0009120\", \"order_id\": \"O108300\", \"amount\": -23.10, \"status\": \"refunded\"}",
  "{\"payment_id\": \"PAY0009121\", \"order_id\": \"O108300\", \"amount\": 23.1",
  "{\"payment_id\": \"PAY0009122\", \"order_id\": \"O108300\", \"amount\": 23, \"status\": \"pending\"}",
  "{\"payment_id\": \"PAY0001357\", \"order_id\": \"O101217\", \"amount\": 71, \"status\": \"refunded\"}",
  "",
].join("\n");

/** An expr result: the records in a JSONL file, parsed, skipping blank lines. */
const jsonlRecords = (path: string) => `import json as _json\nwith open(${JSON.stringify(path)}, encoding='utf-8') as _f:\n    result = [_json.loads(_l) for _l in _f if _l.strip()]`;

export const m20Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q20-02",
    version: 2,
    slug: "average-price-of-a-stock-code",
    title: "Average selling price of a stock code",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "csv-read", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "logical", "conversion", "arithmetic", "dict-lookup", "string-method", "none-value", "print-call", "unquoted-name", "top-level-indent", "aggregate-call", "continue-statement", "len-call", "list-index", "list-literal", "list-mutate", "membership", "nested-index", "print-several", "print-text", "string-index"],
    prompt: "The same product sells at different prices over time. Pricing wants the average price a stock code actually sold for, from an Online Retail II invoice export. Cancellation lines (invoices starting with `C`) are not sales.",
    spec: [
      ["Function", "`average_price(path, stock_code)`"],
      ["File", "columns `Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country`"],
      ["Returns", "the mean `Price` (a float) over the sale lines whose `StockCode` equals `stock_code` exactly, or `None` when there are none"],
      ["Rules", "stock codes are case-sensitive (`85123a` is a different product from `85123A`); cancellations are ignored"],
    ],
    hiddenKinds: ["a code that appears only on cancellations", "a lower-case code that differs from an upper-case one", "a file with only the header"],
    hints: [
      "Read the rows with `csv.DictReader`; keep a running total and a count for the matching sale lines.",
      "Skip a row unless its `StockCode` matches exactly and its `Invoice` doesn't start with `C`.",
      "Prices are text until you convert them. With a count of 0 there is no average: return None instead of dividing.",
    ],
    explanation: "The function filters on two conditions (exact stock code, not a cancellation), adds `float(Price)` and counts the lines, then divides once at the end. Returning `None` for no sales is the honest answer: 0 would claim the product sold for nothing. Including cancellations drags the average towards the refund price, and lower-casing codes merges two different products.",
    code: {
      starter: src`
import csv

def average_price(path, stock_code):
    return None

print(average_price("lines.csv", "85123A"))
`,
      answer: src`
import csv

def average_price(path, stock_code):
    total = 0
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["StockCode"] == stock_code and not row["Invoice"].startswith("C"):
                total += float(row["Price"])
                count += 1
    if count == 0:
        return None
    return total / count

print(average_price("lines.csv", "85123A"))
`,
      alternatives: [
        src`
import csv

def average_price(path, stock_code):
    prices = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["Invoice"][0] == "C" or row["StockCode"] != stock_code:
                continue
            prices.append(float(row["Price"]))
    if not prices:
        return None
    return sum(prices) / len(prices)
`,
      ],
      wrong: [
        {
          code: src`
import csv

def average_price(path, stock_code):
    total = 0
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["StockCode"] == stock_code:
                total += float(row["Price"])
                count += 1
    if count == 0:
        return None
    return total / count
`,
          fails: ["returns"],
          why: "the cancellation line's price is averaged in as if it were a sale",
        },
        {
          code: src`
import csv

def average_price(path, stock_code):
    total = 0
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["StockCode"].upper() == stock_code.upper() and not row["Invoice"].startswith("C"):
                total += float(row["Price"])
                count += 1
    if count == 0:
        return None
    return total / count
`,
          fails: ["returns"],
          why: "`85123a` and `85123A` are different products, but upper-casing merges them",
        },
        {
          code: src`
import csv

def average_price(path, stock_code):
    total = 0
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["StockCode"] == stock_code and not row["Invoice"].startswith("C"):
                total += float(row["Price"])
                count += 1
    if count == 0:
        return 0
    return total / count
`,
          fails: ["returns"],
          why: "0 says the product sold for nothing; with no sales the answer is None",
        },
      ],
      task: {
        files: { "lines.csv": linesCsv, "header.csv": invoiceHeader + "\n" },
        checks: [
          fn("returns", "average_price", [
            example(["lines.csv", "85123A"], 8.05 / 3),
            example(["lines.csv", "71053"], 3.39),
            example(["lines.csv", "22423"], null),
            hiddenCase("a code that appears only on cancellations", ["lines.csv", "21232"], null),
            hiddenCase("a lower-case code that differs from an upper-case one", ["lines.csv", "85123a"], 2.1),
            hiddenCase("a file with only the header", ["header.csv", "85123A"], null),
          ], { label: "average_price() averages the sale prices of one stock code" }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-03",
    version: 2,
    slug: "fix-the-price-ranking",
    title: "Fix the price ranking",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "csv-read", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "dict-lookup", "list-literal", "list-mutate", "list-index", "list-sort", "sort-key", "lambda", "print-call", "unquoted-name", "top-level-indent", "boolean", "membership", "print-several", "print-text", "string-index", "string-method", "string-slice"],
    prompt: "`most_expensive` should return the names of the `n` priciest products, but on the catalogue it says the most expensive product is the £9.50 Breakfast Tea. Fix it. Products whose `list_price` is empty (no longer sold) must be left out.",
    spec: [
      ["Function", "`most_expensive(path, n)`"],
      ["File", "columns `product_id,sku,name,category,list_price,discontinued_on`; `list_price` may be empty"],
      ["Returns", "the names of the `n` products with the highest price, highest first; fewer if there aren't `n` priced products"],
      ["Ties", "products with the same price keep their file order"],
    ],
    hiddenKinds: ["n larger than the number of priced products", "n of 0", "two products with the same price"],
    hints: [
      "Print the `list_price` values the sort is comparing. What type are they?",
      "Text is compared character by character, so `\"9.5\"` comes after `\"120\"`.",
      "Sort by the price as a number, and leave out the rows whose price is empty before sorting (converting `\"\"` raises ValueError).",
    ],
    explanation: "CSV values are text, and text sorts character by character: `\"9.5\" > \"65.99\" > \"120\"`. Sorting with `key=lambda p: float(p[\"list_price\"])` compares numbers instead. That conversion fails on the discontinued product's empty price, so those rows are filtered out first. `sorted` is stable, so equal prices keep their file order.",
    code: {
      starter: src`
import csv

def most_expensive(path, n):
    with open(path, encoding="utf-8", newline="") as source:
        products = list(csv.DictReader(source))
    ranked = sorted(products, key=lambda p: p["list_price"], reverse=True)
    names = []
    for product in ranked[:n]:
        names.append(product["name"])
    return names

print(most_expensive("products.csv", 3))
`,
      answer: src`
import csv

def most_expensive(path, n):
    with open(path, encoding="utf-8", newline="") as source:
        products = []
        for row in csv.DictReader(source):
            if row["list_price"] != "":
                products.append(row)
    ranked = sorted(products, key=lambda p: float(p["list_price"]), reverse=True)
    names = []
    for product in ranked[:n]:
        names.append(product["name"])
    return names

print(most_expensive("products.csv", 3))
`,
      alternatives: [
        src`
import csv

def price_of(product):
    return float(product["list_price"])

def most_expensive(path, n):
    with open(path, encoding="utf-8", newline="") as source:
        priced = [row for row in csv.DictReader(source) if row["list_price"].strip()]
    return [p["name"] for p in sorted(priced, key=price_of, reverse=True)][:n]
`,
      ],
      wrong: [
        {
          code: src`
import csv

def most_expensive(path, n):
    with open(path, encoding="utf-8", newline="") as source:
        products = list(csv.DictReader(source))
    ranked = sorted(products, key=lambda p: float(p["list_price"]), reverse=True)
    names = []
    for product in ranked[:n]:
        names.append(product["name"])
    return names
`,
          fails: ["returns"],
          why: "the sort is numeric now, but the empty price of the discontinued product raises ValueError",
        },
        {
          code: src`
import csv

def most_expensive(path, n):
    with open(path, encoding="utf-8", newline="") as source:
        products = []
        for row in csv.DictReader(source):
            if row["list_price"] != "":
                products.append(row)
    ranked = sorted(products, key=lambda p: p["list_price"], reverse=True)
    names = []
    for product in ranked[:n]:
        names.append(product["name"])
    return names
`,
          fails: ["returns"],
          why: "the empty price is gone, but prices are still compared as text",
        },
      ],
      task: {
        files: { "products.csv": productsCsv, "ties.csv": productsHeader + "\nP1,A-1,First Mug,home,12.5,\nP2,A-2,Second Mug,home,12.50,\nP3,A-3,Lamp,home,30,\n" },
        checks: [
          fn("returns", "most_expensive", [
            example(["products.csv", 3], ["Speaker, Organic", "Ultra Pillow", "Deluxe Pillow"]),
            example(["products.csv", 1], ["Speaker, Organic"]),
            hiddenCase("n larger than the number of priced products", ["products.csv", 20], ["Speaker, Organic", "Ultra Pillow", "Deluxe Pillow", "Mini Knife Set", "Nordic Handbook", "Breakfast Tea", "Pro Honey"]),
            hiddenCase("n of 0", ["products.csv", 0], []),
            hiddenCase("two products with the same price", ["ties.csv", 3], ["Lamp", "First Mug", "Second Mug"]),
          ], { label: "most_expensive() ranks priced products by their numeric price" }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-06",
    version: 2,
    slug: "product-feed-as-json",
    title: "Turn the product CSV into a JSON feed",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 12,
    requires: ["import-module", "csv-read", "json-dumps", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "for-loop", "if-statement", "comparison", "conversion", "dict-literal", "dict-lookup", "list-literal", "list-mutate", "len-call", "none-value", "else-clause", "print-call", "unquoted-name", "top-level-indent", "boolean", "conditional-expr", "identity", "list-index", "logical", "membership", "print-several", "print-text", "reassignment", "string-index"],
    prompt: "A partner's website reads products as JSON, with real numbers and `null` for missing values, not CSV text. Convert the catalogue export.",
    spec: [
      ["Function", "`products_to_json(src, dest)`"],
      ["src", "CSV with columns `product_id,sku,name,category,list_price,discontinued_on`; empty values are possible"],
      ["Writes", "`dest`: a JSON array with one object per product, in file order: `{\"sku\": …, \"name\": …, \"price\": …, \"discontinued\": …}`"],
      ["Values", "`price` is a number (float), or `null` when `list_price` is empty; `discontinued` is the date text, or `null` when empty"],
      ["Returns", "the number of products written"],
    ],
    hiddenKinds: ["a file with only the header", "a name containing a comma and quotes"],
    hints: [
      "Read every row with `csv.DictReader` and build a new dictionary with the four output keys.",
      "An empty CSV value is `\"\"`; JSON's `null` is Python's `None`. Decide per field before building the object.",
      "Collect the objects in a list and write the whole list with one `json.dump`.",
    ],
    explanation: "Each CSV row becomes a new dictionary with converted values: `float` for prices and `None` for empty fields, which `json.dump` writes as `null`. Writing the list once produces a single JSON array. Copying the CSV text across leaves `\"47.99\"` as a string, and `float(\"\")` on the product with no price raises ValueError.",
    code: {
      starter: src`
import csv
import json

def products_to_json(src, dest):
    return 0

print(products_to_json("products.csv", "products.json"))
`,
      answer: src`
import csv
import json

def products_to_json(src, dest):
    products = []
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["list_price"] == "":
                price = None
            else:
                price = float(row["list_price"])
            discontinued = row["discontinued_on"]
            if discontinued == "":
                discontinued = None
            products.append({"sku": row["sku"], "name": row["name"], "price": price, "discontinued": discontinued})
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(products, out, indent=2)
    return len(products)

print(products_to_json("products.csv", "products.json"))
`,
      alternatives: [
        src`
import csv
import json

def or_none(text):
    return text if text else None

def products_to_json(src, dest):
    with open(src, encoding="utf-8", newline="") as source:
        rows = list(csv.DictReader(source))
    feed = []
    for row in rows:
        price = or_none(row["list_price"])
        feed.append({
            "sku": row["sku"],
            "name": row["name"],
            "price": float(price) if price is not None else None,
            "discontinued": or_none(row["discontinued_on"]),
        })
    with open(dest, "w", encoding="utf-8") as out:
        out.write(json.dumps(feed, ensure_ascii=False))
    return len(feed)
`,
      ],
      wrong: [
        {
          code: src`
import csv
import json

def products_to_json(src, dest):
    products = []
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            products.append({"sku": row["sku"], "name": row["name"], "price": row["list_price"], "discontinued": row["discontinued_on"]})
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(products, out, indent=2)
    return len(products)
`,
          fails: ["feed", "quotes"],
          why: "prices stay text like `\"47.99\"` and empty values become `\"\"` instead of null",
        },
        {
          code: src`
import csv
import json

def products_to_json(src, dest):
    count = 0
    with open(src, encoding="utf-8", newline="") as source, open(dest, "w", encoding="utf-8") as out:
        for row in csv.DictReader(source):
            price = None if row["list_price"] == "" else float(row["list_price"])
            discontinued = None if row["discontinued_on"] == "" else row["discontinued_on"]
            json.dump({"sku": row["sku"], "name": row["name"], "price": price, "discontinued": discontinued}, out)
            count += 1
    return count
`,
          fails: ["feed", "empty", "quotes"],
          why: "one object after another without an enclosing array isn't one JSON value, so it can't be loaded",
        },
      ],
      task: {
        files: {
          "products.csv": productsCsv,
          "header.csv": productsHeader + "\n",
          "quoted.csv": productsHeader + "\nP0999,KIT-00001,\"Tea set, \"\"Royal\"\" edition\",home,19,\n",
        },
        checks: [
          fn("returns", "products_to_json", [
            example(["products.csv", "_p0.json"], 8),
            hiddenCase("a file with only the header", ["header.csv", "_p00.json"], 0),
          ], { label: "products_to_json() returns how many products were written" }),
          jsonFile("feed", "the feed is an array of objects with numbers and nulls", "_p1.json", [
            { sku: "HOM-52782", name: "Deluxe Pillow", price: 47.99, discontinued: null },
            { sku: "HOM-67738", name: "Mini Knife Set", price: 29.99, discontinued: null },
            { sku: "BOO-58412", name: "Nordic Handbook", price: 15.99, discontinued: "2025-02-01" },
            { sku: "GRO-63674", name: "Pro Honey", price: py.float(5), discontinued: null },
            { sku: "HOM-94585", name: "Ultra Pillow", price: 65.99, discontinued: null },
            { sku: "GRO-10442", name: "Breakfast Tea", price: 9.5, discontinued: null },
            { sku: "ELE-24781", name: "Speaker, Organic", price: py.float(120), discontinued: null },
            { sku: "TOY-54564", name: "Puzzle Box", price: null, discontinued: "2024-11-30" },
          ], { setup: "products_to_json('products.csv', '_p1.json')" }),
          jsonFile("empty", "a header-only file gives an empty array", "_p2.json", [], { setup: "products_to_json('header.csv', '_p2.json')", hidden: true }),
          jsonFile("quotes", "a name with a comma and quotes comes through intact", "_p3.json", [{ sku: "KIT-00001", name: "Tea set, \"Royal\" edition", price: py.float(19), discontinued: null }], { setup: "products_to_json('quoted.csv', '_p3.json')", hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q20-10",
    version: 2,
    slug: "validate-a-json-config",
    title: "Validate a service's JSON settings",
    format: "validation",
    difficulty: "medium",
    minutes: 18,
    requires: ["import-module", "json-loads", "json-error", "function-def", "function-param", "function-return", "assignment", "try-except", "except-type", "except-as", "if-statement", "else-clause", "comparison", "logical", "membership", "dict-get", "dict-lookup", "list-literal", "list-mutate", "none-value", "identity", "type-call", "string-format", "string-method", "print-call", "unquoted-name", "top-level-indent", "boolean", "len-call", "arithmetic", "conversion", "list-index", "print-text", "string-index"],
    prompt: "A service refuses to start when its settings file is wrong, but the crash message is unhelpful. Write a validator that lists every problem in plain words before the service tries to start.",
    spec: [
      ["Function", "`config_errors(text)`"],
      ["Invalid JSON", "return only `[\"invalid JSON at line <lineno>: <msg>\"]`, using the JSONDecodeError's `lineno` and `msg`"],
      ["Not an object", "return only `[\"settings must be a JSON object\"]`"],
      ["name", "required; must be a non-empty string, else `\"name must be a non-empty string\"`"],
      ["port", "required; must be a whole number from 1 to 65535 (not `true`, not `8080.0`, not `\"8080\"`), else `\"port must be a whole number from 1 to 65535\"`"],
      ["debug", "optional; if present must be `true` or `false`, else `\"debug must be true or false\"`"],
      ["Returns", "the problems in the order name, port, debug; `[]` when the settings are valid"],
    ],
    hiddenKinds: ["port written as true", "port written as a decimal", "port written as text", "debug written as text", "a JSON array instead of an object", "invalid JSON on a later line", "name missing entirely"],
    hints: [
      "Parse first, in a `try`; a JSONDecodeError is the whole answer. Then check that the value is a dictionary.",
      "Use `get` so a missing key gives None instead of a KeyError, then test each rule and append its message.",
      "`True` counts as an int for `isinstance(x, int)`, because bool is a subclass of int. `type(x) is int` accepts only real whole numbers.",
    ],
    explanation: "Validation reports every problem it can, in a fixed order, but stops early when there is nothing to check: invalid JSON or a non-object. `get` turns missing keys into None, which then fails the type tests. The subtle rule is the port: `isinstance(True, int)` is True because booleans are integers in Python, so `\"port\": true` would slip through an `isinstance` check; `type(port) is int` rejects booleans and floats alike.",
    code: {
      starter: src`
import json

def config_errors(text):
    return []

print(config_errors('{"name": "orders-api", "port": 8080, "debug": false}'))
print(config_errors('{"name": "", "port": 70000}'))
`,
      answer: src`
import json

def config_errors(text):
    try:
        settings = json.loads(text)
    except json.JSONDecodeError as err:
        return [f"invalid JSON at line {err.lineno}: {err.msg}"]
    if type(settings) is not dict:
        return ["settings must be a JSON object"]
    errors = []
    name = settings.get("name")
    if type(name) is not str or name.strip() == "":
        errors.append("name must be a non-empty string")
    port = settings.get("port")
    if type(port) is not int or port < 1 or port > 65535:
        errors.append("port must be a whole number from 1 to 65535")
    if "debug" in settings and type(settings["debug"]) is not bool:
        errors.append("debug must be true or false")
    return errors

print(config_errors('{"name": "orders-api", "port": 8080, "debug": false}'))
print(config_errors('{"name": "", "port": 70000}'))
`,
      alternatives: [
        src`
import json

def valid_port(value):
    return isinstance(value, int) and not isinstance(value, bool) and 1 <= value <= 65535

def config_errors(text):
    try:
        settings = json.loads(text)
    except ValueError as err:
        return ["invalid JSON at line " + str(err.lineno) + ": " + err.msg]
    if not isinstance(settings, dict):
        return ["settings must be a JSON object"]
    errors = []
    if not (isinstance(settings.get("name"), str) and settings["name"].strip()):
        errors.append("name must be a non-empty string")
    if not valid_port(settings.get("port")):
        errors.append("port must be a whole number from 1 to 65535")
    if "debug" in settings and not isinstance(settings["debug"], bool):
        errors.append("debug must be true or false")
    return errors
`,
      ],
      wrong: [
        {
          code: src`
import json

def config_errors(text):
    try:
        settings = json.loads(text)
    except json.JSONDecodeError as err:
        return [f"invalid JSON at line {err.lineno}: {err.msg}"]
    if type(settings) is not dict:
        return ["settings must be a JSON object"]
    errors = []
    name = settings.get("name")
    if type(name) is not str or name.strip() == "":
        errors.append("name must be a non-empty string")
    port = settings.get("port")
    if not isinstance(port, int) or port < 1 or port > 65535:
        errors.append("port must be a whole number from 1 to 65535")
    if "debug" in settings and type(settings["debug"]) is not bool:
        errors.append("debug must be true or false")
    return errors
`,
          fails: ["returns"],
          why: "`isinstance(True, int)` is True, so `\"port\": true` is accepted as port 1",
        },
        {
          code: src`
import json

def config_errors(text):
    try:
        settings = json.loads(text)
    except json.JSONDecodeError as err:
        return [f"invalid JSON at line {err.lineno}: {err.msg}"]
    errors = []
    if type(settings["name"]) is not str or settings["name"].strip() == "":
        errors.append("name must be a non-empty string")
    if type(settings["port"]) is not int or settings["port"] < 1 or settings["port"] > 65535:
        errors.append("port must be a whole number from 1 to 65535")
    if "debug" in settings and type(settings["debug"]) is not bool:
        errors.append("debug must be true or false")
    return errors
`,
          fails: ["returns"],
          why: "a missing key raises KeyError and a JSON array raises TypeError, instead of being reported",
        },
        {
          code: src`
import json

def config_errors(text):
    try:
        settings = json.loads(text)
    except Exception:
        return ["invalid JSON"]
    if type(settings) is not dict:
        return ["settings must be a JSON object"]
    errors = []
    name = settings.get("name")
    if type(name) is not str or name.strip() == "":
        errors.append("name must be a non-empty string")
    port = settings.get("port")
    if type(port) is not int or port < 1 or port > 65535:
        errors.append("port must be a whole number from 1 to 65535")
    if "debug" in settings and type(settings["debug"]) is not bool:
        errors.append("debug must be true or false")
    return errors
`,
          fails: ["returns"],
          why: "catching every exception hides where the JSON is broken; the message must give the line and the reason",
        },
      ],
      task: {
        checks: [
          fn("returns", "config_errors", [
            example(['{"name": "orders-api", "port": 8080, "debug": false}'], []),
            example(['{"name": "", "port": 70000}'], ["name must be a non-empty string", "port must be a whole number from 1 to 65535"]),
            example(['{"name": "orders-api", "port": 8080,}'], ["invalid JSON at line 1: Illegal trailing comma before end of object"]),
            hiddenCase("port written as true", ['{"name": "api", "port": true}'], ["port must be a whole number from 1 to 65535"]),
            hiddenCase("port written as a decimal", ['{"name": "api", "port": 8080.0}'], ["port must be a whole number from 1 to 65535"]),
            hiddenCase("port written as text", ['{"name": "api", "port": "8080"}'], ["port must be a whole number from 1 to 65535"]),
            hiddenCase("debug written as text", ['{"name": "api", "port": 1, "debug": "yes"}'], ["debug must be true or false"]),
            hiddenCase("a JSON array instead of an object", ['["orders-api", 8080]'], ["settings must be a JSON object"]),
            hiddenCase("invalid JSON on a later line", ['{\n  "name": "api",\n  "port": 80\n  "debug": true\n}'], ["invalid JSON at line 4: Expecting ',' delimiter"]),
            hiddenCase("name missing entirely", ['{"port": 65535}'], ["name must be a non-empty string"]),
          ], { label: "config_errors() lists each problem with the settings" }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-12",
    version: 2,
    slug: "what-survives-a-round-trip",
    title: "What survives a JSON round trip?",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["import-module", "json-loads", "json-dumps", "assignment", "dict-literal", "dict-lookup", "dict-get", "tuple-literal", "boolean", "comparison", "print-call", "print-several", "unquoted-name", "print-text", "string-index"],
    prompt: "An order is saved as JSON and read back. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Write out the JSON text first: what do a tuple, `True` and a number key look like in JSON?",
      "`json.loads` turns a JSON array into a list. Is a list ever equal to a tuple?",
      "JSON keys are always text, so the number key comes back as the text `\"2024\"`.",
    ],
    explanation: "`dumps` writes the tuple as an array, `True` as `true` and the key `2024` as the string `\"2024\"`. Reading it back gives a list, which is never equal to a tuple, even with the same items, and the integer key no longer exists: `get(2024)` is None while `back[\"2024\"]` finds the value.",
    predict: {
      program: src`
import json

order = {"id": "O100043", "items": ("P0607", "P0208"), "paid": True, 2024: "year"}
text = json.dumps(order)
back = json.loads(text)
print(text)
print(back["items"] == order["items"], back.get(2024), back["2024"])
`,
      output: "{\"id\": \"O100043\", \"items\": [\"P0607\", \"P0208\"], \"paid\": true, \"2024\": \"year\"}\nFalse None year\n",
      wrongPredictions: [
        "{\"id\": \"O100043\", \"items\": [\"P0607\", \"P0208\"], \"paid\": true, \"2024\": \"year\"}\nTrue year year",
        "{'id': 'O100043', 'items': ('P0607', 'P0208'), 'paid': True, 2024: 'year'}\nTrue year year",
        "{\"id\": \"O100043\", \"items\": [\"P0607\", \"P0208\"], \"paid\": True, \"2024\": \"year\"}\nFalse None year",
      ],
    },
  },
  {
    id: "PY-Q20-13",
    version: 2,
    slug: "fix-the-payments-export",
    title: "Fix the captured-payments export",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["import-module", "csv-write", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "arithmetic", "dict-literal", "dict-lookup", "list-literal", "print-call", "unquoted-name", "top-level-indent", "continue-statement", "list-index", "membership", "print-several", "print-text", "string-index"],
    prompt: "`export_captured` should write the captured payments to a CSV for finance, but it crashes with `ValueError: dict contains fields not in fieldnames`. Fix it so it meets the contract. Look at the whole file it writes, not only the crash.",
    spec: [
      ["Function", "`export_captured(payments, path)`"],
      ["payments", "a list of dictionaries with `payment_id`, `order_id`, `method`, `status` and `amount`"],
      ["Writes", "a header `payment_id,order_id,amount` once, then one line per payment whose `status` is `captured`"],
      ["Returns", "the number of payments written"],
    ],
    hiddenKinds: ["no captured payments", "only captured payments"],
    hints: [
      "Fix the crash first: the payment dictionaries have keys that aren't columns.",
      "Then read the file you wrote. How many header lines does it have?",
      "Create the writer and write the header once, before the loop; inside the loop only write rows.",
    ],
    explanation: "Two bugs. The payments carry `method` and `status`, which aren't columns, so `writerow` raises ValueError; `extrasaction=\"ignore\"` (or building a three-key dictionary) fixes that. Once it runs, the writer and `writeheader()` inside the loop write the header before every payment, including the skipped ones. Both belong before the loop.",
    code: {
      starter: src`
import csv

def export_captured(payments, path):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        for payment in payments:
            writer = csv.DictWriter(out, fieldnames=["payment_id", "order_id", "amount"])
            writer.writeheader()
            if payment["status"] == "captured":
                writer.writerow(payment)
                written += 1
    return written

payments = [
    {"payment_id": "PAY0008990", "order_id": "O108024", "method": "card", "status": "failed", "amount": 57.34},
    {"payment_id": "PAY0008991", "order_id": "O108024", "method": "card", "status": "captured", "amount": 57.34},
]
print(export_captured(payments, "captured.csv"))
`,
      answer: src`
import csv

def export_captured(payments, path):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["payment_id", "order_id", "amount"], extrasaction="ignore")
        writer.writeheader()
        for payment in payments:
            if payment["status"] == "captured":
                writer.writerow(payment)
                written += 1
    return written

payments = [
    {"payment_id": "PAY0008990", "order_id": "O108024", "method": "card", "status": "failed", "amount": 57.34},
    {"payment_id": "PAY0008991", "order_id": "O108024", "method": "card", "status": "captured", "amount": 57.34},
]
print(export_captured(payments, "captured.csv"))
`,
      alternatives: [
        src`
import csv

def export_captured(payments, path):
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["payment_id", "order_id", "amount"])
        written = 0
        for payment in payments:
            if payment["status"] != "captured":
                continue
            writer.writerow([payment["payment_id"], payment["order_id"], payment["amount"]])
            written += 1
    return written
`,
      ],
      wrong: [
        {
          code: src`
import csv

def export_captured(payments, path):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        for payment in payments:
            writer = csv.DictWriter(out, fieldnames=["payment_id", "order_id", "amount"], extrasaction="ignore")
            writer.writeheader()
            if payment["status"] == "captured":
                writer.writerow(payment)
                written += 1
    return written
`,
          fails: ["file", "none-captured"],
          why: "the crash is gone, but a header is written for every payment",
        },
        {
          code: src`
import csv

def export_captured(payments, path):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["payment_id", "order_id", "amount"])
        writer.writeheader()
        for payment in payments:
            if payment["status"] == "captured":
                writer.writerow(payment)
                written += 1
    return written
`,
          fails: ["returns", "file"],
          why: "the header is fixed, but the extra keys still make `writerow` raise ValueError",
        },
      ],
      task: {
        checks: [
          fn("returns", "export_captured", [
            example([[{ payment_id: "PAY0008990", order_id: "O108024", method: "card", status: "failed", amount: 57.34 }, { payment_id: "PAY0008991", order_id: "O108024", method: "card", status: "captured", amount: 57.34 }], "_x1.csv"], 1),
            hiddenCase("only captured payments", [[{ payment_id: "PAY1", order_id: "O1", method: "card", status: "captured", amount: 5 }, { payment_id: "PAY2", order_id: "O2", method: "paypal", status: "captured", amount: 7.5 }], "_x2.csv"], 2),
          ], { label: "export_captured() returns how many payments were written" }),
          csvRows("file", "the file has one header and only the captured payments", "_x3.csv", [["payment_id", "order_id", "amount"], ["PAY0000045", "O100043", "12.93"], ["PAY0008991", "O108024", "57.34"]], {
            setup: "export_captured([{'payment_id': 'PAY0000045', 'order_id': 'O100043', 'method': 'card', 'status': 'captured', 'amount': 12.93}, {'payment_id': 'PAY0008990', 'order_id': 'O108024', 'method': 'card', 'status': 'failed', 'amount': 57.34}, {'payment_id': 'PAY0008991', 'order_id': 'O108024', 'method': 'card', 'status': 'captured', 'amount': 57.34}], '_x3.csv')",
          }),
          csvRows("none-captured", "no captured payments gives just the header", "_x4.csv", [["payment_id", "order_id", "amount"]], {
            setup: "export_captured([{'payment_id': 'PAY9', 'order_id': 'O9', 'method': 'card', 'status': 'failed', 'amount': 1}, {'payment_id': 'PAY8', 'order_id': 'O8', 'method': 'paypal', 'status': 'refunded', 'amount': 2}], '_x4.csv')",
            hidden: true,
          }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-16",
    version: 2,
    slug: "orders-per-customer-json",
    title: "Orders per customer, as JSON",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "csv-read", "json-dumps", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "membership", "dict-literal", "dict-lookup", "dict-store", "nested-dict", "nested-lookup", "list-literal", "list-mutate", "len-call", "print-call", "unquoted-name", "top-level-indent", "continue-statement", "defaultdict-call", "list-index", "logical", "print-several", "print-text", "string-index"],
    prompt: "The customer-service app shows each customer's orders from a JSON file. Build that file from the orders CSV.",
    spec: [
      ["Function", "`orders_by_customer(src, dest)`"],
      ["src", "CSV with columns `order_id,customer_id,status,total`"],
      ["Writes", "`dest`: a JSON object from each customer ID to `{\"orders\": [order IDs in file order], \"spent\": total of those orders}`"],
      ["Rules", "cancelled orders are left out entirely; a customer whose only orders were cancelled doesn't appear; `spent` is a number"],
      ["Returns", "the number of customers written"],
    ],
    hiddenKinds: ["a file with only the header", "a customer whose only order was cancelled", "one customer with several orders"],
    hints: [
      "Group rows by `customer_id` into a dictionary of small dictionaries.",
      "The first time a customer appears, give them `{\"orders\": [], \"spent\": 0}`; then append the order ID and add the total.",
      "Skip cancelled rows before creating anything, then `json.dump` the whole dictionary once.",
    ],
    explanation: "This is the group-by pattern with a nested value: each customer gets a dictionary holding a list and a running total. Skipping cancelled rows before a customer is created means a customer with nothing but cancellations never appears. `json.dump` writes the nested structure in one call; `str(groups)` would produce Python syntax (single quotes) that no JSON reader accepts.",
    code: {
      starter: src`
import csv
import json

def orders_by_customer(src, dest):
    return 0

print(orders_by_customer("orders.csv", "by_customer.json"))
`,
      answer: src`
import csv
import json

def orders_by_customer(src, dest):
    customers = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "cancelled":
                continue
            customer = row["customer_id"]
            if customer not in customers:
                customers[customer] = {"orders": [], "spent": 0}
            customers[customer]["orders"].append(row["order_id"])
            customers[customer]["spent"] += float(row["total"])
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(customers, out, indent=2)
    return len(customers)

print(orders_by_customer("orders.csv", "by_customer.json"))
`,
      alternatives: [
        src`
import csv
import json
from collections import defaultdict

def orders_by_customer(src, dest):
    ids = defaultdict(list)
    spent = defaultdict(float)
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "cancelled":
                ids[row["customer_id"]].append(row["order_id"])
                spent[row["customer_id"]] += float(row["total"])
    result = {}
    for customer in ids:
        result[customer] = {"orders": ids[customer], "spent": spent[customer]}
    with open(dest, "w", encoding="utf-8") as out:
        out.write(json.dumps(result))
    return len(result)
`,
      ],
      wrong: [
        {
          code: src`
import csv
import json

def orders_by_customer(src, dest):
    customers = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "cancelled":
                continue
            customers[row["customer_id"]] = {"orders": [row["order_id"]], "spent": float(row["total"])}
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(customers, out, indent=2)
    return len(customers)
`,
          fails: ["file", "several"],
          why: "each order replaces the customer's entry, so only their last order is kept",
        },
        {
          code: src`
import csv
import json

def orders_by_customer(src, dest):
    customers = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            customer = row["customer_id"]
            if customer not in customers:
                customers[customer] = {"orders": [], "spent": 0}
            if row["status"] == "cancelled":
                continue
            customers[customer]["orders"].append(row["order_id"])
            customers[customer]["spent"] += float(row["total"])
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(customers, out, indent=2)
    return len(customers)
`,
          fails: ["returns", "file"],
          why: "a customer is created before the cancelled check, so a customer with only cancellations appears with no orders",
        },
        {
          code: src`
import csv

def orders_by_customer(src, dest):
    customers = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "cancelled":
                continue
            customer = row["customer_id"]
            if customer not in customers:
                customers[customer] = {"orders": [], "spent": 0}
            customers[customer]["orders"].append(row["order_id"])
            customers[customer]["spent"] += float(row["total"])
    with open(dest, "w", encoding="utf-8") as out:
        out.write(str(customers))
    return len(customers)
`,
          fails: ["file", "several"],
          why: "`str(customers)` writes Python syntax with single quotes, which isn't JSON",
        },
      ],
      task: {
        files: {
          "orders.csv": ordersCsv,
          "header.csv": "order_id,customer_id,status,total\n",
          "repeat.csv": "order_id,customer_id,status,total\nO1,C7,delivered,10\nO2,C7,returned,2.5\nO3,C7,delivered,7.25\n",
        },
        checks: [
          fn("returns", "orders_by_customer", [
            example(["orders.csv", "_b0.json"], 4),
            hiddenCase("a file with only the header", ["header.csv", "_b00.json"], 0),
          ], { label: "orders_by_customer() returns the number of customers" }),
          jsonFile("file", "each customer has their order IDs and total, cancellations left out", "_b1.json", {
            C00164: { orders: ["O100043"], spent: 12.93 },
            C00800: { orders: ["O101217", "O104839"], spent: 213.91 },
            C04564: { orders: ["O108752", "O108811"], spent: 78.71 },
            C09999: { orders: ["O108800"], spent: py.float(10) },
          }, { setup: "orders_by_customer('orders.csv', '_b1.json')", compare: { numbers: "int-float-equal" } }),
          jsonFile("empty", "a header-only file gives an empty object", "_b2.json", {}, { setup: "orders_by_customer('header.csv', '_b2.json')", hidden: true }),
          jsonFile("several", "one customer with several orders", "_b3.json", { C7: { orders: ["O1", "O2", "O3"], spent: 19.75 } }, { setup: "orders_by_customer('repeat.csv', '_b3.json')", hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q20-19",
    version: 2,
    slug: "customer-spend-report",
    title: "A customer spend report from two CSV files",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "csv-read", "csv-write", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "logical", "conversion", "arithmetic", "membership", "dict-literal", "dict-lookup", "dict-store", "dict-index", "list-literal", "list-mutate", "list-sort", "sort-key", "lambda", "tuple-literal", "string-format", "len-call", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "boolean", "dict-get", "dict-iterate", "list-index", "precedence", "print-several", "print-text", "string-index"],
    prompt: "Marketing wants every customer with how many orders they received and how much they spent, biggest spenders first. Join the customers file with the orders file and write the report.",
    spec: [
      ["Function", "`customer_report(customers_path, orders_path, dest)`"],
      ["customers", "CSV `customer_id,first_name,last_name,email,city,state`"],
      ["orders", "CSV `order_id,customer_id,status,total`; only `delivered` orders count; orders from customers not in the customers file are ignored"],
      ["Writes", "`dest` with header `customer_id,name,orders,spent`: `name` is `\"First Last\"`, `spent` has two decimals; **every** customer appears, with `0` and `0.00` if they had no delivered orders"],
      ["Order", "by `spent`, highest first; equal amounts by `customer_id` ascending"],
      ["Returns", "the number of customers written"],
    ],
    hiddenKinds: ["two customers who spent the same amount", "a customer with no orders at all", "orders file with only a header"],
    hints: [
      "Start from the customers: build a dictionary from customer ID to a small record with the name, a count of 0 and a total of 0.",
      "Walk the orders once and add to the matching record only for delivered orders of known customers.",
      "Sort the records with a key that returns a tuple: the negated total first, then the ID. Format the total with `:.2f` when writing.",
    ],
    explanation: "Indexing customers by ID first gives every customer a row, even with no orders, and turns the join into one dictionary lookup per order. Unknown customers are skipped with a membership test. Sorting by `(-spent, customer_id)` puts the largest totals first and breaks ties by ID ascending; `reverse=True` on `(spent, customer_id)` would also reverse the IDs. Building the report from the orders instead drops customers who never ordered.",
    code: {
      starter: src`
import csv

def customer_report(customers_path, orders_path, dest):
    return 0

print(customer_report("customers.csv", "orders.csv", "report.csv"))
`,
      answer: src`
import csv

def customer_report(customers_path, orders_path, dest):
    records = {}
    with open(customers_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            name = row["first_name"] + " " + row["last_name"]
            records[row["customer_id"]] = {"customer_id": row["customer_id"], "name": name, "orders": 0, "spent": 0}
    with open(orders_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered" or row["customer_id"] not in records:
                continue
            record = records[row["customer_id"]]
            record["orders"] += 1
            record["spent"] += float(row["total"])
    ranked = sorted(records.values(), key=lambda r: (-r["spent"], r["customer_id"]))
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["customer_id", "name", "orders", "spent"])
        for record in ranked:
            writer.writerow([record["customer_id"], record["name"], record["orders"], f"{record['spent']:.2f}"])
    return len(ranked)

print(customer_report("customers.csv", "orders.csv", "report.csv"))
`,
      alternatives: [
        src`
import csv

def customer_report(customers_path, orders_path, dest):
    with open(customers_path, encoding="utf-8", newline="") as source:
        customers = list(csv.DictReader(source))
    counts = {}
    spent = {}
    with open(orders_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "delivered":
                counts[row["customer_id"]] = counts.get(row["customer_id"], 0) + 1
                spent[row["customer_id"]] = spent.get(row["customer_id"], 0) + float(row["total"])
    rows = []
    for c in customers:
        cid = c["customer_id"]
        rows.append({"customer_id": cid, "name": f"{c['first_name']} {c['last_name']}", "orders": counts.get(cid, 0), "spent": spent.get(cid, 0)})
    rows = sorted(rows, key=lambda r: r["customer_id"])
    rows = sorted(rows, key=lambda r: r["spent"], reverse=True)
    for r in rows:
        r["spent"] = f"{r['spent']:.2f}"
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["customer_id", "name", "orders", "spent"])
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)
`,
      ],
      wrong: [
        {
          code: src`
import csv

def customer_report(customers_path, orders_path, dest):
    records = {}
    with open(customers_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            records[row["customer_id"]] = {"customer_id": row["customer_id"], "name": row["first_name"] + " " + row["last_name"], "orders": 0, "spent": 0}
    with open(orders_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered" or row["customer_id"] not in records:
                continue
            records[row["customer_id"]]["orders"] += 1
            records[row["customer_id"]]["spent"] += float(row["total"])
    ranked = sorted(records.values(), key=lambda r: (r["spent"], r["customer_id"]), reverse=True)
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["customer_id", "name", "orders", "spent"])
        for record in ranked:
            writer.writerow([record["customer_id"], record["name"], record["orders"], f"{record['spent']:.2f}"])
    return len(ranked)
`,
          fails: ["ties", "no-orders"],
          why: "`reverse=True` on the tuple also reverses the tie-break, so equal spenders come out by ID descending",
        },
        {
          code: src`
import csv

def customer_report(customers_path, orders_path, dest):
    names = {}
    with open(customers_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            names[row["customer_id"]] = row["first_name"] + " " + row["last_name"]
    records = {}
    with open(orders_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            cid = row["customer_id"]
            if row["status"] != "delivered" or cid not in names:
                continue
            if cid not in records:
                records[cid] = {"customer_id": cid, "name": names[cid], "orders": 0, "spent": 0}
            records[cid]["orders"] += 1
            records[cid]["spent"] += float(row["total"])
    ranked = sorted(records.values(), key=lambda r: (-r["spent"], r["customer_id"]))
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["customer_id", "name", "orders", "spent"])
        for record in ranked:
            writer.writerow([record["customer_id"], record["name"], record["orders"], f"{record['spent']:.2f}"])
    return len(ranked)
`,
          fails: ["returns", "report", "ties", "no-orders"],
          why: "the report is built from the orders, so customers without delivered orders are missing",
        },
        {
          code: src`
import csv

def customer_report(customers_path, orders_path, dest):
    records = {}
    with open(customers_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            records[row["customer_id"]] = {"customer_id": row["customer_id"], "name": row["first_name"] + " " + row["last_name"], "orders": 0, "spent": 0}
    with open(orders_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["customer_id"] not in records:
                continue
            records[row["customer_id"]]["orders"] += 1
            records[row["customer_id"]]["spent"] += float(row["total"])
    ranked = sorted(records.values(), key=lambda r: (-r["spent"], r["customer_id"]))
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["customer_id", "name", "orders", "spent"])
        for record in ranked:
            writer.writerow([record["customer_id"], record["name"], record["orders"], f"{record['spent']:.2f}"])
    return len(ranked)
`,
          fails: ["report"],
          why: "cancelled and returned orders are counted as spending",
        },
      ],
      task: {
        files: {
          "customers.csv": customersCsv,
          "orders.csv": ordersCsv,
          "tie_customers.csv": "customer_id,first_name,last_name,email,city,state\nC2,Bo,Lee,b@x.com,Austin,TX\nC1,Al,Kim,a@x.com,Austin,TX\nC3,Cy,Ito,c@x.com,Austin,TX\n",
          "tie_orders.csv": "order_id,customer_id,status,total\nO1,C2,delivered,20\nO2,C1,delivered,20\n",
          "no_orders.csv": "order_id,customer_id,status,total\n",
          "one_customer.csv": "customer_id,first_name,last_name,email,city,state\nC05690,Diego,Scott,diegoscott@atlasstudio.com,New York,NY\n",
          "no_customers.csv": "customer_id,first_name,last_name,email,city,state\n",
        },
        checks: [
          fn("returns", "customer_report", [
            example(["customers.csv", "orders.csv", "_q0.csv"], 4),
            example(["one_customer.csv", "orders.csv", "_q01.csv"], 1),
            example(["no_customers.csv", "orders.csv", "_q02.csv"], 0),
            hiddenCase("orders file with only a header", ["customers.csv", "no_orders.csv", "_q00.csv"], 4),
          ], { label: "customer_report() returns the number of customers" }),
          csvRows("report", "every customer, biggest spenders first, with delivered orders only", "_q1.csv", [
            ["customer_id", "name", "orders", "spent"],
            ["C00800", "Samuel Mensah", "2", "213.91"],
            ["C04564", "Mei Adams", "1", "58.71"],
            ["C00164", "Isaac Sato", "1", "12.93"],
            ["C04248", "Aisha Silva", "0", "0.00"],
          ], { setup: "customer_report('customers.csv', 'orders.csv', '_q1.csv')" }),
          csvRows("ties", "equal totals are ordered by customer ID", "_q2.csv", [
            ["customer_id", "name", "orders", "spent"],
            ["C1", "Al Kim", "1", "20.00"],
            ["C2", "Bo Lee", "1", "20.00"],
            ["C3", "Cy Ito", "0", "0.00"],
          ], { setup: "customer_report('tie_customers.csv', 'tie_orders.csv', '_q2.csv')", hidden: true }),
          csvRows("no-orders", "with no orders, every customer has 0 and 0.00", "_q3.csv", [
            ["customer_id", "name", "orders", "spent"],
            ["C00164", "Isaac Sato", "0", "0.00"],
            ["C00800", "Samuel Mensah", "0", "0.00"],
            ["C04248", "Aisha Silva", "0", "0.00"],
            ["C04564", "Mei Adams", "0", "0.00"],
          ], { setup: "customer_report('customers.csv', 'no_orders.csv', '_q3.csv')", hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-20",
    version: 2,
    slug: "validate-a-payment-stream",
    title: "Validate a JSONL payment stream",
    format: "validation",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "json-loads", "json-error", "jsonl-line", "file-open", "encoding-arg", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "else-clause", "comparison", "logical", "membership", "enumerate-call", "continue-statement", "try-except", "except-type", "dict-get", "dict-lookup", "list-literal", "list-mutate", "tuple-literal", "none-value", "type-call", "string-method", "string-format", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "conversion", "identity", "len-call", "list-index", "newline-escape", "range-call", "string-index", "string-split", "tuple-unpack"],
    prompt: "A payment provider streams events as JSON Lines. Before booking them, separate the valid payments from the bad lines, and say what is wrong with each bad line so the provider can fix it.",
    spec: [
      ["Function", "`validate_payments(path)`"],
      ["Line numbers", "count every line of the file from 1, including blank lines; blank lines are skipped without an error"],
      ["Checks, in order", "1. valid JSON → else `\"line N: invalid JSON\"`; 2. `payment_id` is text starting with `PAY` → else `\"line N: bad payment_id\"`; 3. `amount` is an int or float (not `true`/`false`) and not negative → else `\"line N: bad amount\"`; 4. `status` is `captured`, `failed` or `refunded` → else `\"line N: bad status\"`"],
      ["Rules", "report only the **first** failed check for a line"],
      ["Returns", "`(valid, errors)`: the valid records as dictionaries in file order, and the error messages in file order"],
    ],
    hiddenKinds: ["an amount written as true", "an amount written as text", "a record that isn't a JSON object", "a missing status", "a file of only blank lines"],
    hints: [
      "Number the lines with `enumerate(source, start=1)` before skipping blanks, so the numbers match the file.",
      "Parse in a `try`; after that, test each rule in order and stop at the first that fails (`get` avoids KeyError for missing keys).",
      "`type(x) in (int, float)` is False for `True`, which `isinstance(x, (int, float))` would accept. A record that isn't a dictionary has no payment_id at all.",
    ],
    explanation: "Each non-blank line goes through the checks in a fixed order, and the first failure decides its message, so one bad line produces one error. Line numbers come from `enumerate` over the raw file, so blank lines still count and the provider can find the line in their own file. The amount rule has two traps: booleans are a kind of int in Python, and `\"12.93\"` is text; `type(amount) in (int, float)` rejects both. A JSON value that isn't an object (a list, a number) has no `payment_id`, so it fails check 2.",
    code: {
      starter: src`
import json

def validate_payments(path):
    valid = []
    errors = []
    return (valid, errors)

valid, errors = validate_payments("payments.jsonl")
print(len(valid), "valid")
for error in errors:
    print(error)
`,
      answer: src`
import json

def problem(record):
    if type(record) is not dict:
        return "bad payment_id"
    payment_id = record.get("payment_id")
    if type(payment_id) is not str or not payment_id.startswith("PAY"):
        return "bad payment_id"
    amount = record.get("amount")
    if type(amount) not in (int, float) or amount < 0:
        return "bad amount"
    if record.get("status") not in ("captured", "failed", "refunded"):
        return "bad status"
    return None

def validate_payments(path):
    valid = []
    errors = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if line.strip() == "":
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"line {number}: invalid JSON")
                continue
            reason = problem(record)
            if reason is None:
                valid.append(record)
            else:
                errors.append(f"line {number}: {reason}")
    return (valid, errors)

valid, errors = validate_payments("payments.jsonl")
print(len(valid), "valid")
for error in errors:
    print(error)
`,
      alternatives: [
        src`
import json

STATUSES = ["captured", "failed", "refunded"]

def validate_payments(path):
    valid = []
    errors = []
    with open(path, encoding="utf-8") as source:
        lines = source.read().split("\n")
    for i in range(len(lines)):
        text = lines[i].strip()
        if not text:
            continue
        where = "line " + str(i + 1) + ": "
        try:
            record = json.loads(text)
        except ValueError:
            errors.append(where + "invalid JSON")
            continue
        if not isinstance(record, dict) or not str(record.get("payment_id", "")).startswith("PAY") or not isinstance(record.get("payment_id"), str):
            errors.append(where + "bad payment_id")
        elif isinstance(record.get("amount"), bool) or not isinstance(record.get("amount"), (int, float)) or record["amount"] < 0:
            errors.append(where + "bad amount")
        elif record.get("status") not in STATUSES:
            errors.append(where + "bad status")
        else:
            valid.append(record)
    return (valid, errors)
`,
      ],
      wrong: [
        {
          code: src`
import json

def validate_payments(path):
    valid = []
    errors = []
    number = 0
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip() == "":
                continue
            number += 1
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"line {number}: invalid JSON")
                continue
            if type(record) is not dict or type(record.get("payment_id")) is not str or not record["payment_id"].startswith("PAY"):
                errors.append(f"line {number}: bad payment_id")
            elif type(record.get("amount")) not in (int, float) or record["amount"] < 0:
                errors.append(f"line {number}: bad amount")
            elif record.get("status") not in ("captured", "failed", "refunded"):
                errors.append(f"line {number}: bad status")
            else:
                valid.append(record)
    return (valid, errors)
`,
          fails: ["returns"],
          why: "blank lines aren't counted, so every line number after a blank line is too small",
        },
        {
          code: src`
import json

def validate_payments(path):
    valid = []
    errors = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if line.strip() == "":
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"line {number}: invalid JSON")
                continue
            if type(record) is not dict or type(record.get("payment_id")) is not str or not record["payment_id"].startswith("PAY"):
                errors.append(f"line {number}: bad payment_id")
            elif not isinstance(record.get("amount"), (int, float)) or record["amount"] < 0:
                errors.append(f"line {number}: bad amount")
            elif record.get("status") not in ("captured", "failed", "refunded"):
                errors.append(f"line {number}: bad status")
            else:
                valid.append(record)
    return (valid, errors)
`,
          fails: ["returns"],
          why: "`isinstance(True, (int, float))` is True, so an amount of `true` is accepted",
        },
        {
          code: src`
import json

def validate_payments(path):
    valid = []
    errors = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if line.strip() == "":
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                errors.append(f"line {number}: invalid JSON")
                continue
            ok = True
            if type(record.get("payment_id")) is not str or not record["payment_id"].startswith("PAY"):
                errors.append(f"line {number}: bad payment_id")
                ok = False
            if type(record.get("amount")) not in (int, float) or record["amount"] < 0:
                errors.append(f"line {number}: bad amount")
                ok = False
            if record.get("status") not in ("captured", "failed", "refunded"):
                errors.append(f"line {number}: bad status")
                ok = False
            if ok:
                valid.append(record)
    return (valid, errors)
`,
          fails: ["returns"],
          why: "it reports every failed check instead of the first, and a list record crashes on `.get`",
        },
      ],
      task: {
        files: {
          "payments.jsonl": paymentsJsonl,
          "types.jsonl": "{\"payment_id\": \"PAY1\", \"amount\": true, \"status\": \"captured\"}\n{\"payment_id\": \"PAY2\", \"amount\": \"12.93\", \"status\": \"captured\"}\n{\"payment_id\": \"PAY3\", \"amount\": 0, \"status\": \"failed\"}\n{\"payment_id\": \"X9\", \"amount\": -1, \"status\": \"captured\"}\n",
          "shapes.jsonl": "[\"PAY4\", 5, \"captured\"]\n\n\n{\"payment_id\": \"PAY5\", \"amount\": 5.5}\n42\n",
          "blank.jsonl": "\n\n  \n",
        },
        checks: [
          fn("returns", "validate_payments", [
            example(["payments.jsonl"], py.tuple(
              py.list(
                pv({ payment_id: "PAY0000045", order_id: "O100043", amount: 12.93, status: "captured" }),
                pv({ payment_id: "PAY0008990", order_id: "O108024", amount: 57.34, status: "failed" }),
                pv({ payment_id: "PAY0001357", order_id: "O101217", amount: 71, status: "refunded" }),
              ),
              pv(["line 4: bad payment_id", "line 5: bad amount", "line 6: invalid JSON", "line 7: bad status"]),
            )),
            hiddenCase("amounts written as true and as text, and a line that breaks two rules", ["types.jsonl"], py.tuple(py.list(pv({ payment_id: "PAY3", amount: 0, status: "failed" })), pv(["line 1: bad amount", "line 2: bad amount", "line 4: bad payment_id"]))),
            hiddenCase("records that aren't objects and a missing status", ["shapes.jsonl"], py.tuple(py.list(), pv(["line 1: bad payment_id", "line 4: bad status", "line 5: bad payment_id"]))),
            hiddenCase("a file of only blank lines", ["blank.jsonl"], py.tuple(py.list(), py.list())),
          ], { label: "validate_payments() separates valid payments from numbered errors" }),
        ],
      },
    },
  },
  {
    id: "PY-Q20-22",
    version: 2,
    slug: "sync-orders-to-jsonl",
    title: "Append new orders to a JSONL log",
    format: "integration",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "csv-read", "json-loads", "json-dumps", "jsonl-line", "path-call", "file-open", "file-append", "encoding-arg", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "membership", "conversion", "string-method", "dict-literal", "dict-lookup", "dict-store", "list-literal", "list-mutate", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "newline-escape", "boolean", "arithmetic", "except-type", "len-call", "list-index", "logical", "nested-condition", "print-several", "print-text", "string-index", "truthiness", "try-except"],
    prompt: "Every night the shop exports all orders as CSV. The data team keeps an append-only JSONL log of orders and must never get the same order twice. Write the sync step.",
    spec: [
      ["Function", "`sync_orders(csv_path, jsonl_path)`"],
      ["csv_path", "CSV `order_id,customer_id,status,total`; it may list an order more than once (keep the first)"],
      ["jsonl_path", "the log; it may not exist yet, and may contain blank lines"],
      ["Appends", "one line per order whose `order_id` isn't in the log yet: `{\"order_id\": …, \"status\": …, \"total\": <float>}`; existing lines are never changed"],
      ["Returns", "the number of orders appended"],
    ],
    hiddenKinds: ["a log that doesn't exist yet", "running the sync twice", "an order listed twice in the CSV", "a log with a blank line at the end"],
    hints: [
      "First collect the order IDs already in the log (if the file exists), skipping blank lines.",
      "Then read the CSV and open the log in append mode; write an order only if its ID hasn't been seen.",
      "Add each ID you write to what you've seen, so a repeated CSV row isn't appended twice in the same run.",
    ],
    explanation: "An append-only log is only safe if the writer is idempotent: running it again must add nothing. The function reads the IDs already logged, then appends with mode `\"a\"` only the orders not seen yet, recording each new ID as it goes so duplicates within one export are also skipped. Rewriting the log with `\"w\"` would destroy history, and forgetting to update the seen IDs during the run lets a repeated CSV row through.",
    code: {
      starter: src`
import csv
import json
from pathlib import Path

def sync_orders(csv_path, jsonl_path):
    return 0

print(sync_orders("orders.csv", "orders_log.jsonl"))
print(sync_orders("orders.csv", "orders_log.jsonl"))
`,
      answer: src`
import csv
import json
from pathlib import Path

def sync_orders(csv_path, jsonl_path):
    seen = {}
    if Path(jsonl_path).exists():
        with open(jsonl_path, encoding="utf-8") as log:
            for line in log:
                if line.strip() != "":
                    seen[json.loads(line)["order_id"]] = True
    added = 0
    with open(csv_path, encoding="utf-8", newline="") as source, open(jsonl_path, "a", encoding="utf-8") as log:
        for row in csv.DictReader(source):
            if row["order_id"] in seen:
                continue
            record = {"order_id": row["order_id"], "status": row["status"], "total": float(row["total"])}
            log.write(json.dumps(record) + "\n")
            seen[row["order_id"]] = True
            added += 1
    return added

print(sync_orders("orders.csv", "orders_log.jsonl"))
print(sync_orders("orders.csv", "orders_log.jsonl"))
`,
      alternatives: [
        src`
import csv
import json

def logged_ids(path):
    ids = []
    try:
        with open(path, encoding="utf-8") as log:
            for line in log:
                if line.strip():
                    ids.append(json.loads(line)["order_id"])
    except FileNotFoundError:
        pass
    return ids

def sync_orders(csv_path, jsonl_path):
    ids = logged_ids(jsonl_path)
    new_lines = []
    with open(csv_path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["order_id"] not in ids:
                ids.append(row["order_id"])
                new_lines.append(json.dumps({"order_id": row["order_id"], "status": row["status"], "total": float(row["total"])}))
    with open(jsonl_path, "a", encoding="utf-8") as log:
        for text in new_lines:
            log.write(text + "\n")
    return len(new_lines)
`,
      ],
      wrong: [
        {
          code: src`
import csv
import json
from pathlib import Path

def sync_orders(csv_path, jsonl_path):
    seen = {}
    if Path(jsonl_path).exists():
        with open(jsonl_path, encoding="utf-8") as log:
            for line in log:
                if line.strip() != "":
                    seen[json.loads(line)["order_id"]] = True
    added = 0
    with open(csv_path, encoding="utf-8", newline="") as source, open(jsonl_path, "a", encoding="utf-8") as log:
        for row in csv.DictReader(source):
            if row["order_id"] in seen:
                continue
            log.write(json.dumps({"order_id": row["order_id"], "status": row["status"], "total": float(row["total"])}) + "\n")
            added += 1
    return added
`,
          fails: ["returns", "duplicates", "kept"],
          why: "IDs written during this run aren't remembered, so an order listed twice in the CSV is appended twice",
        },
        {
          code: src`
import csv
import json

def sync_orders(csv_path, jsonl_path):
    seen = {}
    with open(jsonl_path, encoding="utf-8") as log:
        for line in log:
            if line.strip() != "":
                seen[json.loads(line)["order_id"]] = True
    added = 0
    with open(csv_path, encoding="utf-8", newline="") as source, open(jsonl_path, "a", encoding="utf-8") as log:
        for row in csv.DictReader(source):
            if row["order_id"] in seen:
                continue
            log.write(json.dumps({"order_id": row["order_id"], "status": row["status"], "total": float(row["total"])}) + "\n")
            seen[row["order_id"]] = True
            added += 1
    return added
`,
          fails: ["returns", "fresh-log", "twice", "duplicates"],
          why: "a log that doesn't exist yet raises FileNotFoundError instead of being created",
        },
        {
          code: src`
import csv
import json
from pathlib import Path

def sync_orders(csv_path, jsonl_path):
    seen = {}
    if Path(jsonl_path).exists():
        with open(jsonl_path, encoding="utf-8") as log:
            for line in log:
                seen[json.loads(line)["order_id"]] = True
    added = 0
    with open(csv_path, encoding="utf-8", newline="") as source, open(jsonl_path, "a", encoding="utf-8") as log:
        for row in csv.DictReader(source):
            if row["order_id"] in seen:
                continue
            log.write(json.dumps({"order_id": row["order_id"], "status": row["status"], "total": float(row["total"])}) + "\n")
            seen[row["order_id"]] = True
            added += 1
    return added
`,
          fails: ["returns", "kept"],
          why: "a blank line in the log reaches `json.loads` and raises JSONDecodeError",
        },
      ],
      task: {
        files: {
          "orders.csv": "order_id,customer_id,status,total\nO100043,C00164,delivered,12.93\nO101217,C00800,delivered,71.14\nO108024,C04248,cancelled,57.34\n",
          "existing.jsonl": "{\"order_id\": \"O100043\", \"status\": \"delivered\", \"total\": 12.93}\n\n",
          "dupes.csv": "order_id,customer_id,status,total\nO1,C1,delivered,5\nO1,C1,delivered,5\nO2,C2,returned,7.5\n",
          "kept.jsonl": "{\"order_id\": \"O0\", \"status\": \"delivered\", \"total\": 1.0}\n\n",
        },
        checks: [
          fn("returns", "sync_orders", [
            example(["orders.csv", "existing.jsonl"], 2),
            example(["orders.csv", "_new.jsonl"], 3),
            hiddenCase("an order listed twice in the CSV", ["dupes.csv", "_d.jsonl"], 2),
          ], { label: "sync_orders() returns how many orders were appended" }),
          {
            kind: "expr",
            id: "fresh-log",
            label: "a log that doesn't exist yet gets every order",
            expr: "sync_orders('orders.csv', '_f.jsonl')\n" + jsonlRecords("_f.jsonl"),
            expected: pv([{ order_id: "O100043", status: "delivered", total: 12.93 }, { order_id: "O101217", status: "delivered", total: 71.14 }, { order_id: "O108024", status: "cancelled", total: 57.34 }]),
          },
          { kind: "expr", id: "twice", label: "running the sync twice appends nothing the second time", hidden: true, expr: "_a = sync_orders('orders.csv', '_t.jsonl')\n_b = sync_orders('orders.csv', '_t.jsonl')\nresult = [_a, _b]", expected: pv([3, 0]) },
          { kind: "expr", id: "duplicates", label: "an order listed twice in the CSV is logged once", hidden: true, expr: "sync_orders('dupes.csv', '_d2.jsonl')\n" + jsonlRecords("_d2.jsonl"), expected: pv([{ order_id: "O1", status: "delivered", total: py.float(5) }, { order_id: "O2", status: "returned", total: 7.5 }]) },
          { kind: "expr", id: "kept", label: "existing lines are kept and new ones added after them", hidden: true, expr: "sync_orders('dupes.csv', 'kept.jsonl')\n" + jsonlRecords("kept.jsonl"), expected: pv([{ order_id: "O0", status: "delivered", total: py.float(1) }, { order_id: "O1", status: "delivered", total: py.float(5) }, { order_id: "O2", status: "returned", total: 7.5 }]) },
        ],
      },
    },
  },
];
