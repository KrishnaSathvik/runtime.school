/**
 * M20 CSV, JSON & JSONL: five lessons (PY-L20-01 … PY-L20-05).
 *
 * Files with structure. CSV rows are read as dictionaries of text with csv.DictReader (quoted commas handled, every
 * value a string until you convert it) and written with csv.DictWriter, a header and `newline=""`. JSON documents are
 * parsed with json.load/json.loads (and their JSONDecodeError), written with json.dump/json.dumps (and what JSON
 * can't hold), and JSON Lines holds one record per line so a stream can be read and appended one record at a time.
 *
 * Fixtures are slices of course datasets: D02 (Online Retail II invoice lines), R01 (Runtime Market orders,
 * payments, products), D08 (USGS earthquake API page), D11 (repository events) and D03 (CFPB complaints, JSONL).
 * Examples create their sample file first because each run starts in an empty folder. Challenges are graded by
 * calling the learner's function on fixture files and hidden ones, and by reading back the CSV or JSON file it wrote
 * (csvRows ignores quoting style and line endings; jsonFile ignores key order and spacing).
 * Version 2: rewritten from a print-the-SKU module.
 */
import type { PyLesson } from "../model";
import { csvRows, example, fileText, fn, hiddenCase, jsonFile, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixture files

const ordersCsv = [
  "order_id,customer_id,ordered_at,channel,status,total",
  "O100043,C00164,2024-01-03 18:35:10,marketplace,delivered,12.93",
  "O101217,C00800,2024-03-13 17:16:09,web,delivered,71.14",
  "O101300,C00800,2024-03-20 09:12:44,app,returned,22.50",
  "O101355,C04248,2024-03-28 14:40:02,web,delivered,30.00",
  "O104839,C00800,2024-08-23 04:08:40,web,delivered,142.77",
  "O104900,C00164,2024-08-30 11:20:00,web,delivered,7.23",
  "O108024,C04248,2024-12-03 23:16:00,app,cancelled,57.34",
  "",
].join("\n");

const paymentsCsv = [
  "payment_id,order_id,attempt,method,status,amount,created_at",
  "PAY0000045,O100043,1,card,captured,12.93,2024-01-03 18:35:50",
  "PAY0008990,O108024,1,card,failed,57.34,2024-12-03 23:16:20",
  "PAY0008991,O108024,2,card,captured,57.34,2024-12-03 23:16:40",
  "PAY0009120,O108300,1,paypal,failed,23.10,2024-12-08 10:02:11",
  "PAY0009121,O108300,2,paypal,failed,23.10,2024-12-08 10:02:51",
  "PAY0009122,O108300,3,card,captured,23.10,2024-12-08 10:03:30",
  "PAY0001357,O101217,1,card,captured,71.14,2024-03-13 17:16:49",
  "",
].join("\n");

const invoiceCsv = [
  "Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country",
  "536374,21258,VICTORIAN SEWING BOX LARGE,32,2010-12-01 09:09:00,10.95,15100,United Kingdom",
  "536378,22386,\"JUMBO BAG, PINK POLKADOT\",10,2010-12-01 09:37:00,1.95,14688,United Kingdom",
  "C536379,D,Discount,-1,2010-12-01 09:41:00,27.50,14527,United Kingdom",
  "536380,22961,JAM MAKING SET PRINTED,twelve,2010-12-01 09:41:00,1.45,17809,France",
  "536381,22139,RETROSPOT TEA SET CERAMIC 11 PC ,4,2010-12-01 09:41:00,4.95,15311,France",
  "536382,10002,INFLATABLE POLITICAL GLOBE ,12,2010-12-01 09:45:00,,16098,Germany",
  "",
].join("\n");

const eventsJson = JSON.stringify([
  { id: "48000000581", type: "PushEvent", actor: { login: "ml-koi418" } },
  { id: "48000000582", type: "WatchEvent", actor: { login: "dev-ana" } },
  { id: "48000000583", type: "PushEvent", actor: { login: "ml-koi418" } },
  { id: "48000000584", type: "IssuesEvent", actor: { login: "sam-ops" } },
], null, 2);

const complaintsJsonl = [
  JSON.stringify({ complaint_id: "8161310", company: "TRANSUNION INTERMEDIATE HOLDINGS, INC.", state: "MI", timely: "Yes" }),
  JSON.stringify({ complaint_id: "8172405", company: "Resurgent Capital Services L.P.", state: "GA", timely: "No" }),
  "",
  JSON.stringify({ complaint_id: "8172404", company: "Experian Information Solutions Inc.", state: "NY", timely: "Yes" }),
  JSON.stringify({ complaint_id: "8172460", company: "Resurgent Capital Services L.P.", state: "TX", timely: "No" }),
  JSON.stringify({ complaint_id: "8187386", company: "CITIBANK, N.A.", state: "TX", timely: "No" }),
  "",
].join("\n");

const eventsJsonl = [
  JSON.stringify({ id: "48000000581", type: "PushEvent", actor: { login: "ml-koi418" }, repo: { name: "tidewater/smartqueue" }, created_at: "2025-03-03T00:02:37Z" }),
  JSON.stringify({ id: "48000000582", type: "WatchEvent", actor: { login: "dev-ana" }, repo: { name: "tidewater/smartqueue" }, created_at: "2025-03-03T00:05:10Z" }),
  "{\"id\": \"48000000583\", \"type\": \"PushEv",
  "",
  JSON.stringify({ id: "48000000584", type: "IssuesEvent", actor: { login: "sam-ops" }, repo: { name: "oakline/ledger" }, created_at: "2025-03-03T00:09:58Z" }),
  "",
].join("\n");

export const m20Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L20-01 DictReader
  {
    id: "PY-L20-01",
    version: 2,
    slug: "read-a-csv-row",
    title: "Read CSV rows as dictionaries",
    lede: "`csv.DictReader` reads a CSV file one row at a time as a dictionary keyed by the header. It handles quoted commas for you, and every value it gives you is text.",
    focus: "Read a CSV file with csv.DictReader and convert the text values you need.",
    minutes: 18,
    objectives: [
      "Explain why `line.split(\",\")` breaks on real CSV files and what `csv` does instead",
      "Read rows with `csv.DictReader` from a file opened with `newline=\"\"`",
      "Convert the text values you calculate with, and skip rows that can't be converted",
    ],
    requires: ["import-module", "file-open", "encoding-arg", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "dict-literal", "dict-lookup", "dict-store", "dict-get", "dict-iterate", "tuple-unpack", "string-method", "string-format", "continue-statement", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "try-except", "except-type", "list-literal", "list-mutate", "membership", "logical", "len-call", "string-split", "boolean", "identity", "list-index", "nested-index", "none-value", "precedence", "string-index", "truthiness"],
    teaches: ["csv-read"],
    blocks: [
      {
        kind: "text",
        md: "CSV looks simple: values separated by commas, one row per line. Then a product description contains a comma, and the file wraps it in quotes: `536378,22386,\"JUMBO BAG, PINK POLKADOT\",10,1.95`. Splitting that line on commas gives six pieces instead of five, and every column after the description shifts.\n\nThe `csv` module follows the quoting rules. `csv.DictReader(file)` reads the first line as the header and gives you each following row as a dictionary from column name to value, so you write `row[\"Quantity\"]` instead of remembering that quantity is column 4. Open the file with `newline=\"\"` so the csv module sees the line endings itself (a quoted value is allowed to contain a line break).\n\nCSV has no types: **every value is text**. `\"10\"` is a string until you call `int`.",
      },
      {
        kind: "example",
        title: "A quoted comma stays in its column",
        code: src`
import csv

with open("invoice_lines.csv", "w", encoding="utf-8", newline="") as out:
    out.write("Invoice,StockCode,Description,Quantity,Price\n")
    out.write('536378,22386,"JUMBO BAG, PINK POLKADOT",10,1.95\n')
    out.write("536378,21033,JUMBO BAG CHARLIE AND LOLA TOYS,10,2.95\n")

with open("invoice_lines.csv", encoding="utf-8", newline="") as source:
    for row in csv.DictReader(source):
        print(row["StockCode"], "|", row["Description"], "|", row["Quantity"])
`,
        output: "22386 | JUMBO BAG, PINK POLKADOT | 10\n21033 | JUMBO BAG CHARLIE AND LOLA TOYS | 10\n",
        note: "The header line became the keys, and the quotes around the description are gone: they were only there to protect the comma. The first block just creates a sample file.",
      },
      {
        kind: "text",
        md: "Because every value is text, arithmetic on a CSV value fails or, worse, does something else: `\"10\" * 2` is `\"1010\"`. Convert at the point of use.",
      },
      {
        kind: "error-example",
        title: "Adding up text",
        code: src`
import csv

with open("payments.csv", "w", encoding="utf-8", newline="") as out:
    out.write("payment_id,amount\nPAY0000045,12.93\nPAY0001357,71.14\n")

total = 0
with open("payments.csv", encoding="utf-8", newline="") as source:
    for row in csv.DictReader(source):
        total += row["amount"]
print(total)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for +=: 'int' and 'str'`. `float(row[\"amount\"])` fixes it.",
      },
      {
        kind: "text",
        md: "A typical job: read an export, keep the rows that matter, convert the numbers, and total them per category. This one totals delivered revenue per state from a Runtime Market orders export.",
      },
      {
        kind: "example",
        title: "Delivered revenue per state",
        code: src`
import csv

def revenue_by_state(path):
    revenue = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered":
                continue
            state = row["ship_state"]
            revenue[state] = revenue.get(state, 0) + float(row["total"])
    return revenue

with open("orders.csv", "w", encoding="utf-8", newline="") as out:
    out.write("order_id,status,total,ship_state\n")
    out.write("O100043,delivered,12.93,NY\n")
    out.write("O101217,delivered,71.14,FL\n")
    out.write("O108024,cancelled,57.34,CO\n")
    out.write("O104839,delivered,142.77,FL\n")

for state, amount in revenue_by_state("orders.csv").items():
    print(state, f"{amount:.2f}")
`,
        output: "NY 12.93\nFL 213.91\n",
        note: "The cancelled Colorado order is skipped, so CO never appears. Money is printed with `:.2f`, because float sums like 71.14 + 142.77 carry tiny rounding errors.",
      },
      {
        kind: "text",
        md: "**When to use it:** for any CSV that has a header row (most exports do). `DictReader` reads one row at a time, so it works on large files too. **Mistakes to avoid:** splitting lines on commas yourself, forgetting that every value is text, and comparing numbers as text (`\"9.99\" > \"10.00\"` is True).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count the delivered orders",
      prompt: "`delivered_count` counts every row in the orders export. Make it count only the rows whose `status` is `delivered`.",
      spec: [
        ["Function", "`delivered_count(path)`"],
        ["Returns", "how many rows have status `delivered`"],
      ],
      starter: src`
import csv

def delivered_count(path):
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            count += 1
    return count

print(delivered_count("orders.csv"))
`,
      answer: src`
import csv

def delivered_count(path):
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "delivered":
                count += 1
    return count

print(delivered_count("orders.csv"))
`,
      wrong: [
        {
          code: src`
import csv

def delivered_count(path):
    count = 0
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "cancelled":
                count += 1
    return count
`,
          fails: ["returns"],
          why: "returned orders are counted as delivered",
        },
      ],
      hints: ["Each `row` is a dictionary keyed by the header.", "Only some rows should add 1.", "Test the row's `status` value before counting."],
      task: {
        files: { "orders.csv": ordersCsv, "none.csv": "order_id,customer_id,ordered_at,channel,status,total\n" },
        checks: [
          fn("returns", "delivered_count", [
            example(["orders.csv"], 5),
            hiddenCase("an export with only the header", ["none.csv"], 0),
          ], { label: "delivered_count() counts delivered rows" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Orders whose payment needed a retry",
        prompt: "Each row of `payments.csv` is one payment attempt; `attempt` is 1 for the first try, 2 for the second and so on. Write `retried_orders(path)`: return the IDs of the orders that needed more than one attempt, each **once**, in the order their first retry appears in the file.",
        spec: [
          ["Function", "`retried_orders(path)`"],
          ["File", "columns `payment_id,order_id,attempt,method,status,amount,created_at`"],
          ["Returns", "a list of order IDs; `[]` when no order was retried"],
          ["Example", "`payments.csv` → `['O108024', 'O108300']` (O108300 took three attempts but appears once)"],
        ],
        starter: src`
import csv

def retried_orders(path):
    retried = []
    return retried

print(retried_orders("payments.csv"))
`,
        answer: src`
import csv

def retried_orders(path):
    retried = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if int(row["attempt"]) > 1 and row["order_id"] not in retried:
                retried.append(row["order_id"])
    return retried

print(retried_orders("payments.csv"))
`,
        alternatives: [
          src`
import csv

def retried_orders(path):
    seen = {}
    with open(path, encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        for payment in reader:
            if int(payment["attempt"]) >= 2:
                seen[payment["order_id"]] = True
    return list(seen)
`,
        ],
        wrong: [
          {
            code: src`
import csv

def retried_orders(path):
    retried = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if int(row["attempt"]) > 1:
                retried.append(row["order_id"])
    return retried
`,
            fails: ["returns"],
            why: "an order retried twice is listed twice",
          },
          {
            code: src`
import csv

def retried_orders(path):
    retried = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["attempt"] > 1 and row["order_id"] not in retried:
                retried.append(row["order_id"])
    return retried
`,
            fails: ["returns"],
            why: "`attempt` is text, and comparing text with a number raises TypeError",
          },
          {
            code: src`
import csv

def retried_orders(path):
    retried = []
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "failed" and row["order_id"] not in retried:
                retried.append(row["order_id"])
    return retried
`,
            fails: ["returns"],
            why: "a failed payment isn't always retried, and the question is about attempts",
          },
        ],
        hints: [
          "Read the rows with `csv.DictReader` and look at each row's `attempt`.",
          "`attempt` arrives as text; convert it before comparing it with a number.",
          "Append an order ID only if it isn't already in your list, so a third attempt doesn't add it again.",
        ],
        task: {
          files: {
            "payments.csv": paymentsCsv,
            "first_try.csv": "payment_id,order_id,attempt,method,status,amount,created_at\nPAY1,O1,1,card,captured,5.00,2024-01-01 10:00:00\nPAY2,O2,1,card,failed,7.00,2024-01-01 11:00:00\n",
            "late_retry.csv": "payment_id,order_id,attempt,method,status,amount,created_at\nPAY7,O7,1,card,failed,9.00,2024-02-01 09:00:00\nPAY3,O3,1,card,failed,4.00,2024-02-01 09:01:00\nPAY4,O3,10,card,captured,4.00,2024-02-01 09:30:00\nPAY8,O7,2,card,captured,9.00,2024-02-01 09:40:00\n",
          },
          checks: [
            fn("returns", "retried_orders", [
              example(["payments.csv"], ["O108024", "O108300"]),
              hiddenCase("no order needed a retry", ["first_try.csv"], []),
              hiddenCase("retries in a different order from the first attempts, and a tenth attempt", ["late_retry.csv"], ["O3", "O7"]),
            ], { label: "retried_orders() lists each retried order once" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Revenue per country from a messy export",
        prompt: "`invoice_lines.csv` comes from the Online Retail II dataset. Invoices starting with `C` are cancellations, and some rows have a quantity or price that isn't a number. Write `revenue_by_country(path)`: return a dictionary from each `Country` to the sum of `Quantity × Price` over its usable rows. Skip cancellations, and skip any row whose `Quantity` (`int`) or `Price` (`float`) can't be converted. A country with no usable rows doesn't appear.",
        spec: [
          ["Function", "`revenue_by_country(path)`"],
          ["Skip", "rows whose `Invoice` starts with `C`; rows where `int(Quantity)` or `float(Price)` raises ValueError"],
          ["Returns", "a dictionary `{country: revenue}`; `{}` when nothing is usable"],
          ["Example", "`invoice_lines.csv` → about `{'United Kingdom': 369.9, 'France': 19.8}`"],
        ],
        starter: src`
import csv

def revenue_by_country(path):
    revenue = {}
    return revenue

print(revenue_by_country("invoice_lines.csv"))
`,
        answer: src`
import csv

def revenue_by_country(path):
    revenue = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["Invoice"].startswith("C"):
                continue
            try:
                quantity = int(row["Quantity"])
                price = float(row["Price"])
            except ValueError:
                continue
            country = row["Country"]
            revenue[country] = revenue.get(country, 0) + quantity * price
    return revenue

print(revenue_by_country("invoice_lines.csv"))
`,
        alternatives: [
          src`
import csv

def line_value(row):
    try:
        return int(row["Quantity"]) * float(row["Price"])
    except ValueError:
        return None

def revenue_by_country(path):
    totals = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            value = line_value(row)
            if row["Invoice"][0] == "C" or value is None:
                continue
            if row["Country"] not in totals:
                totals[row["Country"]] = 0
            totals[row["Country"]] += value
    return totals
`,
        ],
        wrong: [
          {
            code: src`
import csv

def revenue_by_country(path):
    revenue = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            try:
                quantity = int(row["Quantity"])
                price = float(row["Price"])
            except ValueError:
                continue
            country = row["Country"]
            revenue[country] = revenue.get(country, 0) + quantity * price
    return revenue
`,
            fails: ["returns"],
            why: "the cancellation's negative line is added, lowering the UK total",
          },
          {
            code: src`
import csv

def revenue_by_country(path):
    revenue = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["Invoice"].startswith("C"):
                continue
            country = row["Country"]
            revenue[country] = revenue.get(country, 0) + int(row["Quantity"]) * float(row["Price"])
    return revenue
`,
            fails: ["returns"],
            why: "a quantity like `twelve` raises ValueError and stops the whole report",
          },
          {
            code: src`
import csv

def revenue_by_country(path):
    revenue = {}
    with open(path, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["Invoice"].startswith("C"):
                continue
            country = row["Country"]
            if country not in revenue:
                revenue[country] = 0
            try:
                revenue[country] += int(row["Quantity"]) * float(row["Price"])
            except ValueError:
                continue
    return revenue
`,
            fails: ["returns"],
            why: "a country is added before its row is known to be usable, so Germany appears with 0",
          },
        ],
        hints: [
          "Two reasons to skip a row: it's a cancellation, or its numbers can't be read.",
          "Convert both numbers inside one `try`; `except ValueError` means skip the row.",
          "Only after both conversions work, add `quantity * price` to the country's running total (`get(country, 0)` starts a new one).",
        ],
        task: {
          files: {
            "invoice_lines.csv": invoiceCsv,
            "cancelled.csv": "Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country\nC536391,22556,PLASTERS IN TIN CIRCUS PARADE ,-12,2010-12-01 10:24:00,1.65,17548,United Kingdom\n",
            "spaced.csv": "Invoice,StockCode,Description,Quantity,InvoiceDate,Price,Customer ID,Country\n536390,22941,CHRISTMAS LIGHTS 10 REINDEER, 6 ,2010-12-01 10:19:00, 8.50 ,17511,Netherlands\n536390,22960,JAM MAKING SET WITH JARS,4,2010-12-01 10:19:00,n/a,17511,Netherlands\n",
          },
          checks: [
            fn("returns", "revenue_by_country", [
              example(["invoice_lines.csv"], { "United Kingdom": 369.9, France: 19.8 }),
              hiddenCase("only cancellations", ["cancelled.csv"], {}),
              hiddenCase("numbers with spaces around them, and a price that isn't a number", ["spaced.csv"], { Netherlands: py.float(51) }),
            ], { label: "revenue_by_country() totals the usable lines per country" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import csv

with open("lines.csv", "w", encoding="utf-8", newline="") as out:
    out.write("StockCode,Quantity\n22386,10\n")
with open("lines.csv", encoding="utf-8", newline="") as source:
    for row in csv.DictReader(source):
        print(row["Quantity"] * 2)
`,
        choices: ["1010", "20", "10 10", "TypeError"],
        answer: 0,
        why: "`row[\"Quantity\"]` is the text `\"10\"`, and text times 2 repeats it. `int(row[\"Quantity\"]) * 2` would be 20.",
      },
      {
        id: "q2",
        prompt: "A common mistake: splitting a CSV line yourself. What does this print?",
        program: src`
line = '536378,22386,"JUMBO BAG, PINK POLKADOT",10,1.95'
pieces = line.split(",")
print(len(pieces), pieces[3])
`,
        choices: ["6  PINK POLKADOT\"", "5 10", "6 10", "5  PINK POLKADOT\""],
        answer: 0,
        why: "`split` doesn't know about quotes, so the description is cut in two and everything after it shifts by one column. `csv.DictReader` keeps it whole.",
      },
      {
        id: "q3",
        prompt: "Why open a CSV file with `newline=\"\"`?",
        choices: ["So the csv module handles line endings itself, including line breaks inside quoted values", "So empty lines are removed", "So the file is read as bytes", "So DictReader can find the header"],
        answer: 0,
        why: "The csv documentation asks for it: the module does its own line-ending handling, and a quoted field may legally contain a newline.",
      },
    ],
    review: [
      "`csv.DictReader(file)` gives each row as a dictionary keyed by the header; quoted commas stay inside their value.",
      "Open CSV files with `encoding=\"utf-8\", newline=\"\"`.",
      "Every value is text: convert with `int`/`float` where you calculate, and skip rows that can't be converted.",
      "Next: write CSV files, header first.",
    ],
  },

  // ------------------------------------------------------------------ PY-L20-02 DictWriter
  {
    id: "PY-L20-02",
    version: 2,
    slug: "write-a-csv-row",
    title: "Write CSV files with a header",
    lede: "`csv.DictWriter` writes a header and one line per dictionary, quoting values that contain commas or quotes, so any spreadsheet or CSV reader can read the file back.",
    focus: "Write rows of dictionaries to a CSV file with csv.DictWriter: fieldnames, a header, and newline=\"\".",
    minutes: 18,
    objectives: [
      "Create a `csv.DictWriter` with the column order, write the header once and then the rows",
      "Explain what `newline=\"\"` prevents and how values with commas and quotes are written",
      "Choose columns from wider rows with `extrasaction=\"ignore\"`, and read one CSV while writing another",
    ],
    requires: ["import-module", "csv-read", "file-open", "encoding-arg", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "dict-literal", "dict-lookup", "dict-store", "dict-get", "dict-iterate", "list-literal", "list-mutate", "list-sort", "string-slice", "string-format", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "len-call", "tuple-unpack", "membership", "continue-statement", "list-index", "logical", "nested-condition", "nested-index", "string-index"],
    teaches: ["csv-write"],
    blocks: [
      {
        kind: "text",
        md: "Writing CSV by gluing strings breaks the moment a value contains a comma. `csv.DictWriter(file, fieldnames=[...])` takes the column order once, `writeheader()` writes the header line, and `writerow(row)` (or `writerows(rows)`) writes each dictionary's values in that order, quoting any value that contains a comma, a quote or a line break.\n\nOpen the file with `newline=\"\"`. The csv module ends each line with `\\r\\n` itself, as the CSV standard asks; without `newline=\"\"`, Windows would turn that `\\n` into another `\\r\\n` and the file would show a blank line between rows.",
      },
      {
        kind: "example",
        title: "A header, two rows and a quoted comma",
        code: src`
import csv

rows = [
    {"sku": "HOM-52782", "name": "Deluxe Pillow", "price": 47.99},
    {"sku": "BOO-58412", "name": "Handbook, Nordic edition", "price": 15.99},
]
with open("products.csv", "w", encoding="utf-8", newline="") as out:
    writer = csv.DictWriter(out, fieldnames=["sku", "name", "price"])
    writer.writeheader()
    writer.writerows(rows)

with open("products.csv", encoding="utf-8", newline="") as source:
    print(repr(source.read()))
`,
        output: "'sku,name,price\\r\\nHOM-52782,Deluxe Pillow,47.99\\r\\nBOO-58412,\"Handbook, Nordic edition\",15.99\\r\\n'\n",
        note: "Numbers are written as text (`47.99`). Only the name with a comma is quoted. `repr` shows the `\\r\\n` line endings the csv module chose.",
      },
      {
        kind: "text",
        md: "`DictWriter` is strict about extra keys. Rows from another source often carry more fields than the export should have, and writing one raises an error rather than silently dropping data.",
      },
      {
        kind: "error-example",
        title: "A field that isn't a column",
        code: src`
import csv

with open("export.csv", "w", encoding="utf-8", newline="") as out:
    writer = csv.DictWriter(out, fieldnames=["order_id", "total"])
    writer.writeheader()
    writer.writerow({"order_id": "O100043", "total": 12.93, "status": "delivered"})
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: dict contains fields not in fieldnames: 'status'`. Pass `extrasaction=\"ignore\"` when dropping extra keys is what you want. A **missing** key is not an error: its column is left empty.",
      },
      {
        kind: "example",
        title: "Copy chosen columns into a new file",
        code: src`
import csv

def export_columns(src, dest, columns):
    count = 0
    with open(src, encoding="utf-8", newline="") as source, open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in csv.DictReader(source):
            writer.writerow(row)
            count += 1
    return count

with open("customers.csv", "w", encoding="utf-8", newline="") as out:
    out.write("customer_id,first_name,last_name,email,city,state\n")
    out.write("C00164,Isaac,Sato,isaac.sato62@gmail.com,New York,NY\n")
    out.write("C00800,Samuel,Mensah,samuel_mensah@yahoo.com,Miami,FL\n")

print(export_columns("customers.csv", "mailing.csv", ["email", "first_name"]))
with open("mailing.csv", encoding="utf-8", newline="") as source:
    for row in csv.reader(source):
        print(row)
`,
        output: "2\n['email', 'first_name']\n['isaac.sato62@gmail.com', 'Isaac']\n['samuel_mensah@yahoo.com', 'Samuel']\n",
        note: "The mailing list gets only the two columns it needs, in the order given. `csv.reader` reads rows as plain lists, which is handy for checking a file you wrote.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time you hand data to a spreadsheet, another team or another program. **Mistakes to avoid:** writing the header inside the loop (once per row), opening without `newline=\"\"`, and building lines with `\",\".join(...)`, which breaks on the first value that contains a comma.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The file has no header",
      prompt: "`save_skus` writes the rows but no header line, so a spreadsheet takes the first product as the column names. Add the header.",
      spec: [
        ["Function", "`save_skus(rows, path)`"],
        ["Writes", "a header `sku,name`, then one line per row"],
      ],
      starter: src`
import csv

def save_skus(rows, path):
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name"])
        writer.writerows(rows)

save_skus([{"sku": "HOM-52782", "name": "Deluxe Pillow"}], "skus.csv")
`,
      answer: src`
import csv

def save_skus(rows, path):
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name"])
        writer.writeheader()
        writer.writerows(rows)

save_skus([{"sku": "HOM-52782", "name": "Deluxe Pillow"}], "skus.csv")
`,
      wrong: [
        {
          code: src`
import csv

def save_skus(rows, path):
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name"])
        for row in rows:
            writer.writeheader()
            writer.writerow(row)
`,
          fails: ["file"],
          why: "the header is written before every row, not once",
        },
      ],
      hints: ["The writer knows the column names already.", "One method call writes them as the first line.", "Call `writeheader()` once, before the rows."],
      task: {
        checks: [
          csvRows("file", "the file starts with the header, then the rows", "_k.csv", [["sku", "name"], ["HOM-52782", "Deluxe Pillow"], ["BOO-58412", "Nordic Handbook"]], { setup: "save_skus([{'sku': 'HOM-52782', 'name': 'Deluxe Pillow'}, {'sku': 'BOO-58412', 'name': 'Nordic Handbook'}], '_k.csv')" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Export the products to reorder",
        prompt: "Purchasing wants a CSV of the products running low. Write `export_low_stock(products, path, limit)`: write a CSV with the header `sku,name,stock` and one line for each product whose `stock` is **below** `limit`, in the order given, and return how many products were written. The product dictionaries also carry a `price`, which must not appear in the file.",
        spec: [
          ["Function", "`export_low_stock(products, path, limit)`"],
          ["products", "a list of dictionaries with `sku`, `name`, `stock` and `price`"],
          ["Writes", "`path`: header `sku,name,stock`, then the low-stock products; replaced if it exists"],
          ["Returns", "the number of products written"],
          ["Example", "the starter's products with limit 5 → 2 (`HOM-52782` with 4 and `GRO-63674` with 0)"],
        ],
        starter: src`
import csv

def export_low_stock(products, path, limit):
    written = 0
    return written

products = [
    {"sku": "HOM-52782", "name": "Deluxe Pillow", "stock": 4, "price": 47.99},
    {"sku": "BOO-58412", "name": "Nordic Handbook", "stock": 12, "price": 15.99},
    {"sku": "GRO-63674", "name": "Pro Honey", "stock": 0, "price": 5},
]
print(export_low_stock(products, "reorder.csv", 5))
`,
        answer: src`
import csv

def export_low_stock(products, path, limit):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name", "stock"], extrasaction="ignore")
        writer.writeheader()
        for product in products:
            if product["stock"] < limit:
                writer.writerow(product)
                written += 1
    return written

products = [
    {"sku": "HOM-52782", "name": "Deluxe Pillow", "stock": 4, "price": 47.99},
    {"sku": "BOO-58412", "name": "Nordic Handbook", "stock": 12, "price": 15.99},
    {"sku": "GRO-63674", "name": "Pro Honey", "stock": 0, "price": 5},
]
print(export_low_stock(products, "reorder.csv", 5))
`,
        alternatives: [
          src`
import csv

def export_low_stock(products, path, limit):
    low = []
    for product in products:
        if product["stock"] < limit:
            low.append([product["sku"], product["name"], product["stock"]])
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["sku", "name", "stock"])
        writer.writerows(low)
    return len(low)
`,
        ],
        wrong: [
          {
            code: src`
import csv

def export_low_stock(products, path, limit):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name", "stock"])
        writer.writeheader()
        for product in products:
            if product["stock"] < limit:
                writer.writerow(product)
                written += 1
    return written
`,
            fails: ["returns", "file", "comma"],
            why: "the products carry a `price` key that isn't a column, so `writerow` raises ValueError",
          },
          {
            code: src`
def export_low_stock(products, path, limit):
    written = 0
    with open(path, "w", encoding="utf-8") as out:
        out.write("sku,name,stock\n")
        for product in products:
            if product["stock"] < limit:
                out.write(f"{product['sku']},{product['name']},{product['stock']}\n")
                written += 1
    return written
`,
            fails: ["comma"],
            why: "gluing values with commas breaks on a name that contains a comma",
          },
          {
            code: src`
import csv

def export_low_stock(products, path, limit):
    written = 0
    with open(path, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["sku", "name", "stock"], extrasaction="ignore")
        writer.writeheader()
        for product in products:
            if product["stock"] <= limit:
                writer.writerow(product)
                written += 1
    return written
`,
            fails: ["returns"],
            why: "`<=` also exports products exactly at the limit, which aren't below it",
          },
        ],
        hints: [
          "Set up a `DictWriter` with the three columns and write the header before looking at any product.",
          "The product dictionaries have an extra key; tell the writer to ignore keys that aren't columns.",
          "Write a product only when its stock is strictly below the limit, and count each one you write.",
        ],
        task: {
          checks: [
            fn("returns", "export_low_stock", [
              example([[{ sku: "HOM-52782", name: "Deluxe Pillow", stock: 4, price: 47.99 }, { sku: "BOO-58412", name: "Nordic Handbook", stock: 12, price: 15.99 }, { sku: "GRO-63674", name: "Pro Honey", stock: 0, price: 5 }], "_r1.csv", 5], 2),
              hiddenCase("stock exactly at the limit", [[{ sku: "HOM-94585", name: "Ultra Pillow", stock: 5, price: 65.99 }], "_r2.csv", 5], 0),
              hiddenCase("no products", [[], "_r3.csv", 10], 0),
            ], { label: "export_low_stock() returns how many products were written" }),
            csvRows("file", "the file holds the header and the low-stock products, without price", "_r4.csv", [["sku", "name", "stock"], ["HOM-52782", "Deluxe Pillow", "4"], ["GRO-63674", "Pro Honey", "0"]], {
              setup: "export_low_stock([{'sku': 'HOM-52782', 'name': 'Deluxe Pillow', 'stock': 4, 'price': 47.99}, {'sku': 'BOO-58412', 'name': 'Nordic Handbook', 'stock': 12, 'price': 15.99}, {'sku': 'GRO-63674', 'name': 'Pro Honey', 'stock': 0, 'price': 5}], '_r4.csv', 5)",
            }),
            csvRows("comma", "a name with a comma stays in one column", "_r5.csv", [["sku", "name", "stock"], ["HOM-67738", "Knife Set, 6 pieces", "1"]], {
              setup: "export_low_stock([{'sku': 'HOM-67738', 'name': 'Knife Set, 6 pieces', 'stock': 1, 'price': 29.99}], '_r5.csv', 3)",
              hidden: true,
            }),
          ],
        },
      },
      {
        id: "c2",
        title: "A monthly sales summary",
        prompt: "Finance wants one line per month of **delivered** orders. Write `monthly_summary(src, dest)`: read the orders CSV `src` and write `dest` with the header `month,orders,revenue` and one line per month that has delivered orders, sorted by month. `month` is the first seven characters of `ordered_at` (`2024-03`), `orders` is how many delivered orders that month had, and `revenue` is their total with exactly two decimals (`101.14`). Return the number of months written.",
        spec: [
          ["Function", "`monthly_summary(src, dest)`"],
          ["src", "columns `order_id,customer_id,ordered_at,channel,status,total`"],
          ["Writes", "`dest`: `month,orders,revenue`, months in order, revenue formatted with `:.2f`"],
          ["Returns", "the number of month lines written"],
          ["Example", "`orders.csv` → 3, and the lines `2024-01,1,12.93`, `2024-03,2,101.14`, `2024-08,2,150.00`"],
        ],
        starter: src`
import csv

def monthly_summary(src, dest):
    return 0

print(monthly_summary("orders.csv", "summary.csv"))
`,
        answer: src`
import csv

def monthly_summary(src, dest):
    counts = {}
    revenue = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered":
                continue
            month = row["ordered_at"][:7]
            counts[month] = counts.get(month, 0) + 1
            revenue[month] = revenue.get(month, 0) + float(row["total"])
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["month", "orders", "revenue"])
        writer.writeheader()
        for month in sorted(counts):
            writer.writerow({"month": month, "orders": counts[month], "revenue": f"{revenue[month]:.2f}"})
    return len(counts)

print(monthly_summary("orders.csv", "summary.csv"))
`,
        alternatives: [
          src`
import csv

def monthly_summary(src, dest):
    months = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] == "delivered":
                month = row["ordered_at"][:7]
                if month not in months:
                    months[month] = [0, 0]
                months[month][0] += 1
                months[month][1] += float(row["total"])
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["month", "orders", "revenue"])
        for month in sorted(months):
            count, total = months[month]
            writer.writerow([month, count, f"{total:.2f}"])
    return len(months)
`,
        ],
        wrong: [
          {
            code: src`
import csv

def monthly_summary(src, dest):
    counts = {}
    revenue = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered":
                continue
            month = row["ordered_at"][:7]
            counts[month] = counts.get(month, 0) + 1
            revenue[month] = revenue.get(month, 0) + float(row["total"])
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["month", "orders", "revenue"])
        writer.writeheader()
        for month in counts:
            writer.writerow({"month": month, "orders": counts[month], "revenue": f"{revenue[month]:.2f}"})
    return len(counts)
`,
            fails: ["unsorted"],
            why: "months come out in the order they first appear in the file, not in date order",
          },
          {
            code: src`
import csv

def monthly_summary(src, dest):
    counts = {}
    revenue = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            if row["status"] != "delivered":
                continue
            month = row["ordered_at"][:7]
            counts[month] = counts.get(month, 0) + 1
            revenue[month] = revenue.get(month, 0) + float(row["total"])
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["month", "orders", "revenue"])
        writer.writeheader()
        for month in sorted(counts):
            writer.writerow({"month": month, "orders": counts[month], "revenue": revenue[month]})
    return len(counts)
`,
            fails: ["file", "unsorted"],
            why: "revenue is written as a raw float, like `150.0` or `40.5`, instead of with two decimals",
          },
          {
            code: src`
import csv

def monthly_summary(src, dest):
    counts = {}
    revenue = {}
    with open(src, encoding="utf-8", newline="") as source:
        for row in csv.DictReader(source):
            month = row["ordered_at"][:7]
            counts[month] = counts.get(month, 0) + 1
            revenue[month] = revenue.get(month, 0) + float(row["total"])
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["month", "orders", "revenue"])
        writer.writeheader()
        for month in sorted(counts):
            writer.writerow({"month": month, "orders": counts[month], "revenue": f"{revenue[month]:.2f}"})
    return len(counts)
`,
            fails: ["returns", "file", "none-delivered"],
            why: "returned and cancelled orders are counted as sales",
          },
        ],
        hints: [
          "First pass: two per-month totals (a count and a revenue), keyed by `ordered_at[:7]`, for delivered rows only.",
          "Then open `dest`, write the header, and walk the months in sorted order.",
          "Format the revenue with an f-string and `:.2f` before writing it.",
        ],
        task: {
          files: {
            "orders.csv": ordersCsv,
            "shuffled.csv": "order_id,customer_id,ordered_at,channel,status,total\nO1,C1,2024-11-02 10:00:00,web,delivered,10.50\nO2,C2,2024-02-14 12:00:00,app,delivered,4.25\nO3,C1,2024-11-20 09:00:00,web,delivered,30\n",
            "nothing.csv": "order_id,customer_id,ordered_at,channel,status,total\nO9,C9,2024-05-05 05:05:05,web,cancelled,9.99\n",
          },
          checks: [
            fn("returns", "monthly_summary", [
              example(["orders.csv", "_m1.csv"], 3),
              hiddenCase("no delivered orders", ["nothing.csv", "_m2.csv"], 0),
            ], { label: "monthly_summary() returns the number of months" }),
            csvRows("file", "the summary has one line per month, revenue with two decimals", "_m3.csv", [["month", "orders", "revenue"], ["2024-01", "1", "12.93"], ["2024-03", "2", "101.14"], ["2024-08", "2", "150.00"]], { setup: "monthly_summary('orders.csv', '_m3.csv')" }),
            csvRows("unsorted", "months are sorted even when the orders aren't", "_m4.csv", [["month", "orders", "revenue"], ["2024-02", "1", "4.25"], ["2024-11", "2", "40.50"]], { setup: "monthly_summary('shuffled.csv', '_m4.csv')", hidden: true }),
            csvRows("none-delivered", "no delivered orders gives just the header", "_m5.csv", [["month", "orders", "revenue"]], { setup: "monthly_summary('nothing.csv', '_m5.csv')", hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import csv

with open("q.csv", "w", encoding="utf-8", newline="") as out:
    writer = csv.writer(out)
    writer.writerow(["O1", 'Bag, "large"', 3])
with open("q.csv", encoding="utf-8", newline="") as source:
    print(repr(source.read()))
`,
        choices: ["'O1,\"Bag, \"\"large\"\"\",3\\r\\n'", "'O1,Bag, \"large\",3\\n'", "'O1,\"Bag, large\",3\\r\\n'", "'O1,\"Bag, \\\\\"large\\\\\"\",3\\r\\n'"],
        answer: 0,
        why: "The value has a comma, so it's wrapped in quotes, and each quote inside it is doubled. That's how CSV escapes quotes; a reader turns `\"\"` back into one `\"`.",
      },
      {
        id: "q2",
        prompt: "A common surprise: a row with a missing key. What does this print?",
        program: src`
import csv

with open("out.csv", "w", encoding="utf-8", newline="") as out:
    writer = csv.DictWriter(out, fieldnames=["sku", "name", "price"])
    writer.writerow({"sku": "GRO-63674", "price": 5})
with open("out.csv", encoding="utf-8", newline="") as source:
    print(repr(source.read()))
`,
        choices: ["'GRO-63674,,5\\r\\n'", "'GRO-63674,5\\r\\n'", "ValueError", "'GRO-63674,None,5\\r\\n'"],
        answer: 0,
        why: "A missing key writes an empty value, so the columns stay lined up. Only extra keys raise ValueError (unless `extrasaction=\"ignore\"`).",
      },
      {
        id: "q3",
        prompt: "Why use `csv.DictWriter` rather than `out.write(\",\".join(values) + \"\\n\")`?",
        choices: ["It quotes values that contain commas, quotes or line breaks, so the file reads back correctly", "It is the only way to write numbers to a file", "It sorts the rows", "It makes the file smaller"],
        answer: 0,
        why: "`join` writes `Handbook, Nordic edition` as two columns. The csv module applies the quoting rules every reader expects.",
      },
    ],
    review: [
      "`csv.DictWriter(out, fieldnames=[...])`, then `writeheader()` once, then `writerow`/`writerows`.",
      "Open with `newline=\"\"`; the module writes `\\r\\n` and quotes values that need it.",
      "Extra keys raise ValueError unless `extrasaction=\"ignore\"`; missing keys become empty values.",
      "Next: JSON, for data with nesting, lists and real types.",
    ],
  },

  // ------------------------------------------------------------------ PY-L20-03 json.load / loads
  {
    id: "PY-L20-03",
    version: 2,
    slug: "read-json",
    title: "Parse JSON into Python values",
    lede: "JSON is how APIs and config files share nested data. `json.loads` (text) and `json.load` (a file) turn it into dictionaries, lists, numbers, text, booleans and None, and `JSONDecodeError` says exactly where invalid JSON goes wrong.",
    focus: "Turn JSON text and JSON files into Python values with json.loads and json.load, and handle invalid JSON with JSONDecodeError.",
    minutes: 18,
    objectives: [
      "Say which Python type each JSON value becomes (`true` → `True`, `null` → `None`, objects → dictionaries)",
      "Read a JSON file with `json.load` and reach nested values with keys and `get`",
      "Catch `json.JSONDecodeError` for text that isn't valid JSON, and read where the error is",
    ],
    requires: ["import-module", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "dict-literal", "dict-lookup", "dict-store", "dict-get", "nested-dict", "nested-lookup", "list-literal", "list-mutate", "none-value", "identity", "boolean", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "try-except", "except-type", "except-as", "continue-statement", "tuple-literal", "len-call", "membership", "string-format", "counter-call", "function-doc", "list-index", "string-index"],
    teaches: ["json-loads", "json-error"],
    blocks: [
      {
        kind: "text",
        md: "CSV is a flat table of text. Real data is often nested: an event has an actor, the actor has a login; an API page has a list of features, each with properties. **JSON** writes that structure as text, and almost every web API and many config files use it.\n\n`import json`, then `json.loads(text)` parses a string and `json.load(file)` parses an open file. JSON objects become dictionaries, arrays become lists, strings become `str`, numbers become `int` or `float`, `true`/`false` become `True`/`False`, and `null` becomes `None`.",
      },
      {
        kind: "example",
        title: "One repository event",
        code: src`
import json

text = '{"id": "48000000581", "type": "PushEvent", "public": true, "payload": {"size": 2, "ref": null}}'
event = json.loads(text)
print(event["type"], event["public"], event["payload"]["ref"])
print(event["payload"]["size"] + 1)
`,
        output: "PushEvent True None\n3\n",
        note: "`true` and `null` became Python's `True` and `None`, and `size` is a real number you can add to: JSON keeps types that CSV loses.",
      },
      {
        kind: "text",
        md: "JSON is stricter than Python. Keys and strings need **double** quotes, there are no trailing commas, and no comments. Invalid text raises `json.JSONDecodeError`, which is a kind of `ValueError`; its message gives the line and column where parsing stopped.",
      },
      {
        kind: "error-example",
        title: "Single quotes are not JSON",
        code: src`
import json

settings = json.loads("{'currency': 'USD'}")
`,
        error: "JSONDecodeError",
        output: "",
        note: "`json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)`. A dictionary printed by Python is not JSON; `json.dumps` (next lesson) writes real JSON.",
      },
      {
        kind: "text",
        md: "API responses are usually saved as files. This function reads one page of the USGS earthquake feed with `json.load` and finds the strongest quake. Some events have no magnitude yet (`null`), so they must be skipped rather than compared.",
      },
      {
        kind: "example",
        title: "The strongest earthquake on an API page",
        code: src`
import json

def strongest(path):
    with open(path, encoding="utf-8") as source:
        page = json.load(source)
    best_place = None
    best_mag = None
    for feature in page["features"]:
        props = feature["properties"]
        if props.get("mag") is None:
            continue
        if best_mag is None or props["mag"] > best_mag:
            best_place = props["place"]
            best_mag = props["mag"]
    return (best_place, best_mag)

with open("page-001.json", "w", encoding="utf-8") as out:
    out.write("""{"type": "FeatureCollection", "metadata": {"count": 3},
 "features": [
  {"id": "us6000pw77", "properties": {"mag": 4.7, "place": "Arctic Ocean"}},
  {"id": "us6000pw78", "properties": {"mag": null, "place": "Fira, Greece"}},
  {"id": "us6000pw7k", "properties": {"mag": 5.1, "place": "Kermadec Islands"}}
 ]}""")
print(strongest("page-001.json"))
`,
        output: "('Kermadec Islands', 5.1)\n",
        note: "`json.load` reads the whole file into one nested value. Comparing `None > 4.7` would raise TypeError, which is why missing magnitudes are skipped first.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever data arrives from an API, a config file or another program as JSON. **Mistakes to avoid:** treating a Python `repr` as JSON, assuming every key is present (use `get` for optional ones), and catching every exception when you mean `json.JSONDecodeError`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Who triggered the event?",
      prompt: "`event_actor` returns the whole `actor` object. Return just the actor's `login`.",
      spec: [
        ["Function", "`event_actor(text)`"],
        ["Returns", "the `login` inside the event's `actor`"],
      ],
      starter: src`
import json

def event_actor(text):
    event = json.loads(text)
    return event["actor"]

print(event_actor('{"type": "PushEvent", "actor": {"id": 10090667, "login": "ml-koi418"}}'))
`,
      answer: src`
import json

def event_actor(text):
    event = json.loads(text)
    return event["actor"]["login"]

print(event_actor('{"type": "PushEvent", "actor": {"id": 10090667, "login": "ml-koi418"}}'))
`,
      wrong: [
        {
          code: src`
import json

def event_actor(text):
    event = json.loads(text)
    return event["actor"]["id"]
`,
          fails: ["returns"],
          why: "it returns the actor's numeric id, not the login",
        },
      ],
      hints: ["`event[\"actor\"]` is itself a dictionary.", "Reach one level deeper.", "Add a second pair of brackets with the key `login`."],
      task: {
        checks: [
          fn("returns", "event_actor", [
            example(['{"type": "PushEvent", "actor": {"id": 10090667, "login": "ml-koi418"}}'], "ml-koi418"),
            hiddenCase("another event type and actor", ['{"type": "WatchEvent", "public": true, "actor": {"login": "dev-ana", "id": 5}}'], "dev-ana"),
          ], { label: "event_actor() returns the actor's login" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Count the events by type",
        prompt: "`events.json` holds a JSON array of repository events. Write `count_by_type(path)`: read the file with `json.load` and return a dictionary from each event `type` to how many events have it.",
        spec: [
          ["Function", "`count_by_type(path)`"],
          ["File", "a JSON array of objects, each with a `type`, e.g. `[{\"id\": \"48000000581\", \"type\": \"PushEvent\", …}, …]`"],
          ["Returns", "a dictionary `{type: count}`; `{}` for an empty array"],
          ["Example", "`events.json` → `{'PushEvent': 2, 'WatchEvent': 1, 'IssuesEvent': 1}`"],
        ],
        starter: src`
import json

def count_by_type(path):
    counts = {}
    return counts

print(count_by_type("events.json"))
`,
        answer: src`
import json

def count_by_type(path):
    with open(path, encoding="utf-8") as source:
        events = json.load(source)
    counts = {}
    for event in events:
        kind = event["type"]
        counts[kind] = counts.get(kind, 0) + 1
    return counts

print(count_by_type("events.json"))
`,
        alternatives: [
          src`
import json
from collections import Counter

def count_by_type(path):
    with open(path, encoding="utf-8") as source:
        text = source.read()
    return dict(Counter([event["type"] for event in json.loads(text)]))
`,
        ],
        wrong: [
          {
            code: src`
import json

def count_by_type(path):
    with open(path, encoding="utf-8") as source:
        events = json.load(source)
    counts = {}
    for event in events:
        counts[event["type"]] = 1
    return counts
`,
            fails: ["returns"],
            why: "each type is set to 1 instead of counted",
          },
          {
            code: src`
import json

def count_by_type(path):
    counts = {}
    with open(path, encoding="utf-8") as source:
        for line in source:
            if "type" in line:
                counts[line.strip()] = counts.get(line.strip(), 0) + 1
    return counts
`,
            fails: ["returns"],
            why: "it reads lines of text instead of parsing the JSON, so the keys are raw text",
          },
        ],
        hints: [
          "Open the file and let `json.load` turn it into a list of dictionaries.",
          "Then it's the per-key count pattern over that list.",
          "The key is each event's `type`; `get(kind, 0) + 1` counts it.",
        ],
        task: {
          files: { "events.json": eventsJson, "empty.json": "[]", "one_kind.json": "[{\"type\": \"ForkEvent\"}, {\"type\": \"ForkEvent\", \"id\": \"2\"}]" },
          checks: [
            fn("returns", "count_by_type", [
              example(["events.json"], { PushEvent: 2, WatchEvent: 1, IssuesEvent: 1 }),
              hiddenCase("an empty array", ["empty.json"], {}),
              hiddenCase("one type only, written on one line", ["one_kind.json"], { ForkEvent: 2 }),
            ], { label: "count_by_type() counts the events of each type" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Accept only usable webhook payloads",
        prompt: "A payment provider posts webhook payloads as JSON text, and some arrive broken. Write `accept_payloads(texts)`: return a tuple `(accepted, rejected)`, where `accepted` is a list of the parsed payloads that are JSON **objects** with an `\"id\"` key, in order, and `rejected` counts the rest: text that isn't valid JSON (catch `json.JSONDecodeError`), valid JSON that isn't an object (like `[1, 2]` or `42`), and objects without an `id`.",
        spec: [
          ["Function", "`accept_payloads(texts)`"],
          ["Returns", "`(list of dictionaries, number rejected)`"],
          ["Object test", "`isinstance(value, dict)` is True for a parsed JSON object"],
          ["Example", "`['{\"id\": \"evt_1\", \"amount\": 1293}', '{\"id\": ', '[1, 2]', '{\"amount\": 5}']` → `([{'id': 'evt_1', 'amount': 1293}], 3)`"],
        ],
        starter: src`
import json

def accept_payloads(texts):
    accepted = []
    rejected = 0
    return (accepted, rejected)

print(accept_payloads(['{"id": "evt_1", "amount": 1293}', '{"id": ', '[1, 2]', '{"amount": 5}']))
`,
        answer: src`
import json

def accept_payloads(texts):
    accepted = []
    rejected = 0
    for text in texts:
        try:
            value = json.loads(text)
        except json.JSONDecodeError:
            rejected += 1
            continue
        if isinstance(value, dict) and "id" in value:
            accepted.append(value)
        else:
            rejected += 1
    return (accepted, rejected)

print(accept_payloads(['{"id": "evt_1", "amount": 1293}', '{"id": ', '[1, 2]', '{"amount": 5}']))
`,
        alternatives: [
          src`
import json

def parse_or_none(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None

def accept_payloads(texts):
    accepted = []
    for text in texts:
        value = parse_or_none(text)
        if isinstance(value, dict) and "id" in value:
            accepted.append(value)
    return (accepted, len(texts) - len(accepted))
`,
        ],
        wrong: [
          {
            code: src`
import json

def accept_payloads(texts):
    accepted = []
    rejected = 0
    for text in texts:
        try:
            value = json.loads(text)
        except json.JSONDecodeError:
            rejected += 1
            continue
        if "id" in value:
            accepted.append(value)
        else:
            rejected += 1
    return (accepted, rejected)
`,
            fails: ["returns"],
            why: "`\"id\" in 42` raises TypeError, and `\"id\" in [\"id\"]` wrongly accepts a list",
          },
          {
            code: src`
import json

def accept_payloads(texts):
    accepted = []
    rejected = 0
    for text in texts:
        value = json.loads(text)
        if isinstance(value, dict) and "id" in value:
            accepted.append(value)
        else:
            rejected += 1
    return (accepted, rejected)
`,
            fails: ["returns"],
            why: "a broken payload raises JSONDecodeError and stops the whole batch",
          },
        ],
        hints: [
          "Two separate questions per text: does it parse at all, and is what it parses into acceptable?",
          "Wrap only the `json.loads` call in `try`, and count a JSONDecodeError as rejected.",
          "Accept the value only when `isinstance(value, dict)` and it has an `id`; everything else adds to the rejected count.",
        ],
        task: {
          checks: [
            fn("returns", "accept_payloads", [
              example([['{"id": "evt_1", "amount": 1293}', '{"id": ', "[1, 2]", '{"amount": 5}']], py.tuple(py.list(pv({ id: "evt_1", amount: 1293 })), py.int(3))),
              example([[]], py.tuple(py.list(), py.int(0))),
              hiddenCase("a number and a list that contains the text id", [["42", '["id"]', '{"id": null}']], py.tuple(py.list(pv({ id: null })), py.int(2))),
              hiddenCase("single quotes and a trailing comma", [["{'id': 'evt_2'}", '{"id": "evt_3",}', '{"id": "evt_4", "currency": "usd"}']], py.tuple(py.list(pv({ id: "evt_4", currency: "usd" })), py.int(2))),
              hiddenCase("several accepted payloads kept in order", [['{"id": "b"}', '{"id": "a", "n": [1, 2]}']], py.tuple(py.list(pv({ id: "b" }), pv({ id: "a", n: [1, 2] })), py.int(0))),
            ], { label: "accept_payloads() keeps JSON objects with an id and counts the rest" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

data = json.loads('{"felt": null, "tsunami": false, "mag": 4.0, "ids": ["us1", "us2"]}')
print(data["felt"], data["tsunami"], data["mag"], len(data["ids"]))
`,
        choices: ["None False 4.0 2", "null false 4.0 2", "None False 4 2", "None false 4.0 [us1, us2]"],
        answer: 0,
        why: "`null` becomes `None` and `false` becomes `False`. `4.0` is written with a decimal point, so it stays a float, and the JSON array is a list of two items.",
      },
      {
        id: "q2",
        prompt: "A common mistake: treating a JSON parse error as something else. What does this print?",
        program: src`
import json

try:
    json.loads('{"sku": "HOM-52782",}')
    print("parsed")
except ValueError as err:
    print("not JSON:", err.msg)
`,
        choices: ["not JSON: Illegal trailing comma before end of object", "parsed", "not JSON: Expecting value", "KeyError"],
        answer: 0,
        why: "A trailing comma is not allowed in JSON. `JSONDecodeError` is a kind of `ValueError`, so `except ValueError` catches it too, and `err.msg` is the reason without the position.",
      },
      {
        id: "q3",
        prompt: "When should you use `json.load` rather than `json.loads`?",
        choices: ["When you have an open file; `loads` takes a string", "When the JSON is nested", "When the JSON contains numbers", "When the file is CSV"],
        answer: 0,
        why: "`load` reads from a file object, `loads` (load **s**tring) parses text you already have. Both return the same Python values.",
      },
    ],
    review: [
      "`json.loads(text)` and `json.load(file)` turn JSON into dictionaries, lists, numbers, text, booleans and None.",
      "JSON needs double quotes and no trailing commas; invalid text raises `json.JSONDecodeError` (a `ValueError`).",
      "Use `get` for optional keys and `isinstance` when the shape of the data isn't guaranteed.",
      "Next: write Python values out as JSON.",
    ],
  },

  // ------------------------------------------------------------------ PY-L20-04 json.dump / dumps
  {
    id: "PY-L20-04",
    version: 2,
    slug: "write-json",
    title: "Write Python values as JSON",
    lede: "`json.dumps` turns dictionaries and lists into JSON text and `json.dump` writes it to a file. Some Python values have no JSON form, and a few change on the way through.",
    focus: "Write Python values as JSON with json.dumps and json.dump, and know what JSON can't represent.",
    minutes: 18,
    objectives: [
      "Write readable JSON with `indent` and keep accented text with `ensure_ascii=False`",
      "Save a value to a file with `json.dump` and explain what changes on a round trip (tuples, number keys)",
      "Convert values JSON can't hold, such as sets, before writing",
    ],
    requires: ["import-module", "json-loads", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "arithmetic", "dict-literal", "dict-lookup", "dict-store", "dict-get", "nested-dict", "nested-lookup", "nested-copy", "list-literal", "list-mutate", "list-sort", "list-copy", "len-call", "none-value", "boolean", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "unicode-text", "tuple-literal", "set-literal", "membership", "dict-iterate", "tuple-unpack", "list-index", "string-index"],
    teaches: ["json-dumps"],
    blocks: [
      {
        kind: "text",
        md: "Going the other way, `json.dumps(value)` returns JSON text and `json.dump(value, file)` writes it into an open file. `indent=2` spreads it over lines for people to read. By default every non-ASCII character is written as an escape like `\\u00e9`; `ensure_ascii=False` keeps `é` as it is (the file must then be written as UTF-8, as always).",
      },
      {
        kind: "example",
        title: "Compact, then readable",
        code: src`
import json

summary = {"store": "Café Lumière", "orders": 3, "late": False, "tags": ["web", "app"], "refund": None}
print(json.dumps(summary))
print(json.dumps(summary, indent=2, ensure_ascii=False))
`,
        output: "{\"store\": \"Caf\\u00e9 Lumi\\u00e8re\", \"orders\": 3, \"late\": false, \"tags\": [\"web\", \"app\"], \"refund\": null}\n{\n  \"store\": \"Café Lumière\",\n  \"orders\": 3,\n  \"late\": false,\n  \"tags\": [\n    \"web\",\n    \"app\"\n  ],\n  \"refund\": null\n}\n",
        note: "`False` and `None` became `false` and `null`, and the keys got double quotes. Both outputs are the same data; the second is for humans.",
      },
      {
        kind: "text",
        md: "JSON has objects, arrays, strings, numbers, booleans and null, and nothing else. A **set**, a date or a `Decimal` has no JSON form, so `dumps` refuses it with `TypeError` rather than guessing. Convert it yourself: a set usually becomes a sorted list.",
      },
      {
        kind: "error-example",
        title: "A set can't be written as JSON",
        code: src`
import json

product = {"sku": "HOM-52782", "tags": {"home", "decor"}}
print(json.dumps(product))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: Object of type set is not JSON serializable`. `sorted(product[\"tags\"])` gives a list JSON can hold, in a stable order.",
      },
      {
        kind: "text",
        md: "A round trip through a file doesn't always give back exactly what you wrote. JSON object keys are always strings, so the number keys of a dictionary come back as text, and tuples come back as lists.",
      },
      {
        kind: "example",
        title: "Save a report and read it back",
        code: src`
import json

def save_report(path, orders_per_year):
    report = {"orders_per_year": orders_per_year, "busiest": (2024, 58)}
    with open(path, "w", encoding="utf-8") as out:
        json.dump(report, out, indent=2)

save_report("report.json", {2023: 41, 2024: 58})
with open("report.json", encoding="utf-8") as source:
    loaded = json.load(source)
print(loaded)
print(loaded["orders_per_year"]["2024"])
`,
        output: "{'orders_per_year': {'2023': 41, '2024': 58}, 'busiest': [2024, 58]}\n58\n",
        note: "`2024` went in as a number key and came back as the text `'2024'`; the tuple came back as a list. Code that reads the file must use `\"2024\"`, or convert the keys back with `int`.",
      },
      {
        kind: "text",
        md: "**When to use it:** saving settings, caching an API response, handing nested data to another program or service. **Mistakes to avoid:** writing `str(value)` instead of JSON (that's Python syntax: single quotes, `True`, `None`), forgetting `encoding=\"utf-8\"` when you use `ensure_ascii=False`, and expecting number keys to survive.",
      },
    ],
    tryIt: {
      id: "try",
      title: "JSON a person can read",
      prompt: "`pretty` returns compact JSON on one line. Make it return the JSON indented by 2 spaces, with keys sorted (`sort_keys=True`), so two saved versions can be compared line by line.",
      spec: [
        ["Function", "`pretty(value)`"],
        ["Returns", "JSON text indented by 2 spaces, keys in sorted order"],
      ],
      starter: src`
import json

def pretty(value):
    return json.dumps(value)

print(pretty({"total": 12.93, "order_id": "O100043"}))
`,
      answer: src`
import json

def pretty(value):
    return json.dumps(value, indent=2, sort_keys=True)

print(pretty({"total": 12.93, "order_id": "O100043"}))
`,
      wrong: [
        {
          code: src`
import json

def pretty(value):
    return json.dumps(value, indent=2)
`,
          fails: ["returns"],
          why: "the keys keep their original order instead of being sorted",
        },
      ],
      hints: ["`dumps` takes extra keyword arguments that control the layout.", "One sets the indentation, another sorts the keys.", "Pass `indent=2` and `sort_keys=True`."],
      task: {
        checks: [
          fn("returns", "pretty", [
            example([{ total: 12.93, order_id: "O100043" }], "{\n  \"order_id\": \"O100043\",\n  \"total\": 12.93\n}"),
            hiddenCase("a nested object", [{ b: { d: 1, c: true }, a: [] }], "{\n  \"a\": [],\n  \"b\": {\n    \"c\": true,\n    \"d\": 1\n  }\n}"),
          ], { label: "pretty() indents by 2 and sorts the keys" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Save the catalogue for the website",
        prompt: "The website reads its catalogue from a JSON file. Write `save_catalog(products, path)`: write `{\"count\": <number of products>, \"products\": [...]}` to `path`, where each product keeps its `sku` and `name` and its `tags`, which arrive as a **set**, become a sorted list. Products stay in the order given. Use `ensure_ascii=False` so names like `Crème` stay readable, and indent by 2.",
        spec: [
          ["Function", "`save_catalog(products, path)`"],
          ["products", "a list of dictionaries with `sku`, `name` and a set of `tags`"],
          ["Writes", "`{\"count\": …, \"products\": [{\"sku\": …, \"name\": …, \"tags\": [sorted]}, …]}`"],
          ["Must not", "change the products it was given"],
        ],
        starter: src`
import json

def save_catalog(products, path):
    pass

products = [
    {"sku": "HOM-52782", "name": "Deluxe Pillow", "tags": {"home", "decor"}},
    {"sku": "GRO-63674", "name": "Pro Honey", "tags": {"grocery"}},
]
save_catalog(products, "catalog.json")
with open("catalog.json", encoding="utf-8") as source:
    print(source.read())
`,
        answer: src`
import json

def save_catalog(products, path):
    items = []
    for product in products:
        items.append({"sku": product["sku"], "name": product["name"], "tags": sorted(product["tags"])})
    with open(path, "w", encoding="utf-8") as out:
        json.dump({"count": len(items), "products": items}, out, indent=2, ensure_ascii=False)

products = [
    {"sku": "HOM-52782", "name": "Deluxe Pillow", "tags": {"home", "decor"}},
    {"sku": "GRO-63674", "name": "Pro Honey", "tags": {"grocery"}},
]
save_catalog(products, "catalog.json")
with open("catalog.json", encoding="utf-8") as source:
    print(source.read())
`,
        alternatives: [
          src`
import json

def save_catalog(products, path):
    catalog = {"count": len(products), "products": [{"sku": p["sku"], "name": p["name"], "tags": sorted(p["tags"])} for p in products]}
    text = json.dumps(catalog, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8") as out:
        out.write(text)
`,
        ],
        wrong: [
          {
            code: src`
import json

def save_catalog(products, path):
    with open(path, "w", encoding="utf-8") as out:
        json.dump({"count": len(products), "products": products}, out, indent=2, ensure_ascii=False)
`,
            fails: ["file", "accents", "empty-tags", "keeps-input"],
            why: "the sets are passed straight to `json.dump`, which raises TypeError",
          },
          {
            code: src`
import json

def save_catalog(products, path):
    for product in products:
        product["tags"] = sorted(product["tags"])
    with open(path, "w", encoding="utf-8") as out:
        json.dump({"count": len(products), "products": products}, out, indent=2, ensure_ascii=False)
`,
            fails: ["keeps-input"],
            why: "the file is right, but the caller's products had their sets replaced with lists",
          },
          {
            code: src`
import json

def save_catalog(products, path):
    items = []
    for product in products:
        items.append({"sku": product["sku"], "name": product["name"], "tags": sorted(product["tags"])})
    with open(path, "w", encoding="utf-8") as out:
        json.dump({"count": len(items), "products": items}, out, indent=2)
`,
            fails: ["accents"],
            why: "without `ensure_ascii=False`, `Crème` is written as `Cr\\u00e8me`: valid JSON, but not what the website team asked for",
          },
        ],
        hints: [
          "Build a new list of new product dictionaries; don't change the ones you were given.",
          "`sorted(a_set)` returns a sorted list, which JSON can hold.",
          "Wrap the list in the outer dictionary with its count, then `json.dump` it with `indent=2, ensure_ascii=False`.",
        ],
        task: {
          checks: [
            jsonFile("file", "the catalogue has a count and products with sorted tag lists", "_c1.json", { count: 2, products: [{ sku: "HOM-52782", name: "Deluxe Pillow", tags: ["decor", "home"] }, { sku: "GRO-63674", name: "Pro Honey", tags: ["grocery"] }] }, {
              setup: "save_catalog([{'sku': 'HOM-52782', 'name': 'Deluxe Pillow', 'tags': {'home', 'decor'}}, {'sku': 'GRO-63674', 'name': 'Pro Honey', 'tags': {'grocery'}}], '_c1.json')",
            }),
            {
              kind: "expr",
              id: "accents",
              label: "accented names are written as they are, not as \\u escapes",
              hidden: true,
              expr: "save_catalog([{'sku': 'BAK-10001', 'name': 'Crème brûlée kit', 'tags': {'bakery', 'dessert', 'baking'}}], '_c2.json')\nwith open('_c2.json', encoding='utf-8') as _f:\n    _t = _f.read()\nimport json as _json\nresult = ['Crème brûlée kit' in _t, _json.loads(_t)]",
              expected: py.list(py.bool(true), pv({ count: 1, products: [{ sku: "BAK-10001", name: "Crème brûlée kit", tags: ["bakery", "baking", "dessert"] }] })),
            },
            jsonFile("empty-tags", "a product with no tags and an empty catalogue", "_c3.json", { count: 1, products: [{ sku: "X-1", name: "Gift card", tags: [] }] }, { setup: "save_catalog([{'sku': 'X-1', 'name': 'Gift card', 'tags': set()}], '_c3.json')", hidden: true }),
            {
              kind: "expr",
              id: "keeps-input",
              label: "save_catalog() leaves the products it was given unchanged",
              hidden: true,
              expr: "_p = [{'sku': 'HOM-52782', 'name': 'Deluxe Pillow', 'tags': {'home', 'decor'}}]\nsave_catalog(_p, '_c4.json')\nresult = _p[0]['tags'] == {'home', 'decor'}",
              expected: py.bool(true),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Turn on a feature flag",
        prompt: "An app's settings live in a JSON file such as `{\"app\": \"runtime-market\", \"version\": 7, \"features\": {\"dark_mode\": false, \"gift_cards\": true}}`. Write `enable_feature(src, dest, feature)`: read `src`, set `features[feature]` to `true` (adding it if it isn't there), add 1 to `version`, and write the result to `dest` indented by 2. Return the new version number. `src` must be left exactly as it was, so a bad change can be rolled back.",
        spec: [
          ["Function", "`enable_feature(src, dest, feature)`"],
          ["Reads", "`src`: an object with `version` (a whole number) and `features` (an object of true/false flags), plus any other keys"],
          ["Writes", "`dest`: the same settings with the flag turned on and the version increased; every other key unchanged"],
          ["Returns", "the new version number"],
          ["Example", "`enable_feature(\"settings.json\", \"next.json\", \"dark_mode\")` → `8`"],
        ],
        starter: src`
import json

def enable_feature(src, dest, feature):
    return 0

print(enable_feature("settings.json", "next.json", "dark_mode"))
`,
        answer: src`
import json

def enable_feature(src, dest, feature):
    with open(src, encoding="utf-8") as source:
        settings = json.load(source)
    settings["features"][feature] = True
    settings["version"] += 1
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(settings, out, indent=2)
    return settings["version"]

print(enable_feature("settings.json", "next.json", "dark_mode"))
`,
        alternatives: [
          src`
import json

def enable_feature(src, dest, feature):
    with open(src, encoding="utf-8") as source:
        old = json.loads(source.read())
    new = old.copy()
    new["features"] = old["features"].copy()
    new["features"][feature] = True
    new["version"] = old["version"] + 1
    with open(dest, "w", encoding="utf-8") as out:
        out.write(json.dumps(new, indent=2))
    return new["version"]
`,
        ],
        wrong: [
          {
            code: src`
import json

def enable_feature(src, dest, feature):
    with open(src, encoding="utf-8") as source:
        settings = json.load(source)
    settings["features"][feature] = True
    settings["version"] += 1
    with open(src, "w", encoding="utf-8") as out:
        json.dump(settings, out, indent=2)
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(settings, out, indent=2)
    return settings["version"]
`,
            fails: ["dest", "source-kept", "new-flag"],
            why: "it also overwrites `src`, so there is nothing left to roll back to, and the next run starts from the changed file",
          },
          {
            code: src`
import json

def enable_feature(src, dest, feature):
    with open(src, encoding="utf-8") as source:
        settings = json.load(source)
    settings["features"] = {feature: True}
    settings["version"] += 1
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(settings, out, indent=2)
    return settings["version"]
`,
            fails: ["dest"],
            why: "replacing the whole `features` object throws away the other flags",
          },
          {
            code: src`
import json

def enable_feature(src, dest, feature):
    with open(src, encoding="utf-8") as source:
        settings = json.load(source)
    settings["features"][feature] = "true"
    settings["version"] += 1
    with open(dest, "w", encoding="utf-8") as out:
        json.dump(settings, out, indent=2)
    return settings["version"]
`,
            fails: ["dest", "new-flag"],
            why: "`\"true\"` is the text true, not the boolean; JSON stores it as a string",
          },
        ],
        hints: [
          "Load the settings, change the loaded dictionary, and dump it to `dest`; never open `src` for writing.",
          "The flag lives inside the nested `features` object: assign `True` there, which adds the key if it's missing.",
          "Python's `True` is written as JSON `true`. Increase `version` before writing, and return it.",
        ],
        task: {
          files: {
            "settings.json": "{\n  \"app\": \"runtime-market\",\n  \"version\": 7,\n  \"features\": {\n    \"dark_mode\": false,\n    \"gift_cards\": true\n  }\n}\n",
            "staging.json": "{\"app\": \"runtime-films\", \"region\": \"eu\", \"version\": 1, \"features\": {}}",
          },
          checks: [
            fn("returns", "enable_feature", [
              example(["settings.json", "next.json", "dark_mode"], 8),
              hiddenCase("a flag that isn't in the file yet", ["staging.json", "_s0.json", "reviews"], 2),
            ], { label: "enable_feature() returns the new version" }),
            jsonFile("dest", "the new file has the flag on, the version up, and every other key kept", "_s1.json", { app: "runtime-market", version: 8, features: { dark_mode: true, gift_cards: true } }, { setup: "enable_feature('settings.json', '_s1.json', 'dark_mode')" }),
            fileText("source-kept", "the original settings file is left exactly as it was", "settings.json", "{\n  \"app\": \"runtime-market\",\n  \"version\": 7,\n  \"features\": {\n    \"dark_mode\": false,\n    \"gift_cards\": true\n  }\n}\n", { setup: "enable_feature('settings.json', '_s2.json', 'gift_cards')" }),
            jsonFile("new-flag", "a flag that isn't there yet is added", "_s3.json", { app: "runtime-films", region: "eu", version: 2, features: { reviews: true } }, { setup: "enable_feature('staging.json', '_s3.json', 'reviews')", hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

print(json.dumps({"qty": 2, "ok": True, "note": None, "ids": (1, 2)}))
`,
        choices: ["{\"qty\": 2, \"ok\": true, \"note\": null, \"ids\": [1, 2]}", "{'qty': 2, 'ok': True, 'note': None, 'ids': (1, 2)}", "{\"qty\": 2, \"ok\": True, \"note\": None, \"ids\": [1, 2]}", "TypeError"],
        answer: 0,
        why: "JSON uses double quotes, `true` and `null`, and has arrays rather than tuples, so the tuple is written as a list.",
      },
      {
        id: "q2",
        prompt: "A common surprise: number keys on a round trip. What does this print?",
        program: src`
import json

stock = {101: 4, 102: 0}
back = json.loads(json.dumps(stock))
print(back, 101 in back)
`,
        choices: ["{'101': 4, '102': 0} False", "{101: 4, 102: 0} True", "{'101': 4, '102': 0} True", "TypeError"],
        answer: 0,
        why: "JSON object keys are always strings, so `dumps` writes `\"101\"` and `loads` gives back the text key. The number 101 is no longer a key.",
      },
      {
        id: "q3",
        prompt: "You save a customer's name `Zoë Müller` with `json.dump(..., ensure_ascii=False)`. What else must be true?",
        choices: ["The file was opened with `encoding=\"utf-8\"`", "The file was opened with mode \"a\"", "The name must be sorted", "Nothing: ensure_ascii=False removes the accents"],
        answer: 0,
        why: "With `ensure_ascii=False` the characters are written as they are, so the file's encoding has to be able to store them. Naming UTF-8 guarantees it.",
      },
    ],
    review: [
      "`json.dumps(value)` returns JSON text; `json.dump(value, file)` writes it; `indent=2` and `sort_keys=True` make it readable and stable.",
      "`ensure_ascii=False` keeps accented text as it is, in a UTF-8 file.",
      "Sets, dates and Decimals raise TypeError: convert them first. Tuples come back as lists and number keys as text.",
      "Next: JSON Lines, one JSON record per line, for logs and streams.",
    ],
  },

  // ------------------------------------------------------------------ PY-L20-05 JSONL
  {
    id: "PY-L20-05",
    version: 2,
    slug: "one-json-per-line",
    title: "JSON Lines: one record per line",
    lede: "A JSON Lines file holds one complete JSON value on each line. You can append a record without rewriting the file, read records one at a time, and a single broken line doesn't spoil the rest.",
    focus: "Write and read JSON Lines one record at a time with json.dumps and json.loads, skipping blank and broken lines.",
    minutes: 18,
    objectives: [
      "Explain why logs and data streams use JSON Lines instead of one big JSON array",
      "Append records with `json.dumps(record) + \"\\n\"` and read them back line by line",
      "Skip blank lines and report broken ones by line number instead of stopping",
    ],
    requires: ["import-module", "json-loads", "json-error", "json-dumps", "csv-write", "csv-read", "file-open", "encoding-arg", "file-append", "with-statement", "file-lines", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "logical", "dict-literal", "dict-lookup", "dict-store", "dict-get", "nested-dict", "nested-lookup", "list-literal", "list-mutate", "tuple-literal", "tuple-unpack", "string-method", "enumerate-call", "continue-statement", "try-except", "except-type", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "membership", "len-call", "none-value", "else-clause", "arithmetic", "boolean", "end", "list-index", "string-index"],
    teaches: ["jsonl-line"],
    blocks: [
      {
        kind: "text",
        md: "A JSON file holds one value. To add one event to a JSON array you have to read the whole array, append, and write the whole file again, and one broken byte makes the entire file unreadable.\n\n**JSON Lines** (`.jsonl`) puts one complete JSON value on each line. Writing a record is `out.write(json.dumps(record) + \"\\n\")` with mode `\"a\"`. Reading is `for line in file: json.loads(line)`. Logs, event streams and big dataset exports (like the repository events and complaints in this course) use it because both directions work one record at a time.",
      },
      {
        kind: "example",
        title: "Write events, then read them back one by one",
        code: src`
import json

events = [
    {"type": "PushEvent", "repo": "tidewater/smartqueue"},
    {"type": "WatchEvent", "repo": "tidewater/smartqueue"},
    {"type": "PushEvent", "repo": "oakline/ledger"},
]
with open("events.jsonl", "w", encoding="utf-8") as out:
    for event in events:
        out.write(json.dumps(event) + "\n")

with open("events.jsonl", encoding="utf-8") as source:
    print(source.read(), end="")
with open("events.jsonl", encoding="utf-8") as source:
    for line in source:
        event = json.loads(line)
        print(event["type"], "in", event["repo"])
`,
        output: "{\"type\": \"PushEvent\", \"repo\": \"tidewater/smartqueue\"}\n{\"type\": \"WatchEvent\", \"repo\": \"tidewater/smartqueue\"}\n{\"type\": \"PushEvent\", \"repo\": \"oakline/ledger\"}\nPushEvent in tidewater/smartqueue\nWatchEvent in tidewater/smartqueue\nPushEvent in oakline/ledger\n",
        note: "`json.dumps` without `indent` writes each record on one line, which is exactly what JSONL needs. `json.loads` ignores the newline at the end of each line.",
      },
      {
        kind: "text",
        md: "A JSONL file is not one JSON document, so `json.load` on the whole file fails as soon as it reaches the second record.",
      },
      {
        kind: "error-example",
        title: "Reading JSONL as if it were one JSON value",
        code: src`
import json

with open("events.jsonl", "w", encoding="utf-8") as out:
    out.write('{"type": "PushEvent"}\n{"type": "WatchEvent"}\n')
with open("events.jsonl", encoding="utf-8") as source:
    events = json.load(source)
`,
        error: "JSONDecodeError",
        output: "",
        note: "`JSONDecodeError: Extra data: line 2 column 1 (char 22)`. The first line is valid JSON on its own; the parser didn't expect anything after it.",
      },
      {
        kind: "text",
        md: "Real streams have blank lines (often a trailing one) and, now and then, a line cut off when a writer crashed. Reading one line at a time means you can skip those and keep going, and report which lines were bad so someone can look.",
      },
      {
        kind: "example",
        title: "Load what can be loaded, and report the rest",
        code: src`
import json

def load_jsonl(path):
    records = []
    bad_lines = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if line.strip() == "":
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                bad_lines.append(number)
    return (records, bad_lines)

with open("complaints.jsonl", "w", encoding="utf-8") as out:
    out.write('{"complaint_id": "8161310", "state": "MI"}\n')
    out.write("\n")
    out.write('{"complaint_id": "8172405", "sta\n')
    out.write('{"complaint_id": "8172404", "state": "NY"}\n')

records, bad_lines = load_jsonl("complaints.jsonl")
print(len(records), "records, bad lines:", bad_lines)
print(records[-1]["state"])
`,
        output: "2 records, bad lines: [3]\nNY\n",
        note: "Line 2 is blank and simply skipped. Line 3 was cut off, so `json.loads` raises JSONDecodeError for that line only; line 4 still loads.",
      },
      {
        kind: "text",
        md: "**When to use it:** logs, events, exports too big to load at once, and anything that is appended to over time. **Mistakes to avoid:** writing with `indent` (one record would span many lines), forgetting the `\\n` after each record, and calling `json.load` on the whole file.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Survive the trailing blank line",
      prompt: "`read_events` crashes when the file ends with a blank line, because `json.loads(\"\\n\")` isn't valid JSON. Skip blank lines.",
      spec: [
        ["Function", "`read_events(path)`"],
        ["Returns", "a list of the records in the file, skipping blank lines"],
      ],
      starter: src`
import json

def read_events(path):
    events = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            events.append(json.loads(line))
    return events

print(read_events("events.jsonl"))
`,
      answer: src`
import json

def read_events(path):
    events = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip() == "":
                continue
            events.append(json.loads(line))
    return events

print(read_events("events.jsonl"))
`,
      wrong: [
        {
          code: src`
import json

def read_events(path):
    events = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line != "":
                events.append(json.loads(line))
    return events
`,
          fails: ["returns"],
          why: "a blank line is `\"\\n\"`, not `\"\"`, so it still reaches `json.loads`",
        },
      ],
      hints: ["A blank line still contains its newline character.", "Strip the line before deciding whether it's empty.", "Skip the line with `continue` when the stripped text is empty."],
      task: {
        files: { "events.jsonl": "{\"type\": \"PushEvent\"}\n{\"type\": \"WatchEvent\"}\n\n", "gaps.jsonl": "\n{\"id\": 1}\n   \n{\"id\": 2}" },
        checks: [
          fn("returns", "read_events", [
            example(["events.jsonl"], [{ type: "PushEvent" }, { type: "WatchEvent" }]),
            hiddenCase("blank lines in the middle, one of spaces, and no final newline", ["gaps.jsonl"], [{ id: 1 }, { id: 2 }]),
          ], { label: "read_events() skips blank lines" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Companies that answered late",
        prompt: "`complaints.jsonl` holds consumer complaints from the CFPB, one JSON object per line, each with a `company` and a `timely` field (`\"Yes\"` or `\"No\"`). Write `late_companies(path)`: return the companies that gave at least one late answer (`timely` is `\"No\"`), each once, in the order of their first late answer. Skip blank lines.",
        spec: [
          ["Function", "`late_companies(path)`"],
          ["Returns", "a list of company names; `[]` when every answer was timely"],
          ["Example", "`complaints.jsonl` → `['Resurgent Capital Services L.P.', 'CITIBANK, N.A.']`"],
        ],
        starter: src`
import json

def late_companies(path):
    late = []
    return late

print(late_companies("complaints.jsonl"))
`,
        answer: src`
import json

def late_companies(path):
    late = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip() == "":
                continue
            complaint = json.loads(line)
            if complaint["timely"] == "No" and complaint["company"] not in late:
                late.append(complaint["company"])
    return late

print(late_companies("complaints.jsonl"))
`,
        alternatives: [
          src`
import json

def late_companies(path):
    seen = {}
    with open(path, encoding="utf-8") as source:
        for line in source:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            if record.get("timely") == "No":
                seen[record["company"]] = True
    return list(seen)
`,
        ],
        wrong: [
          {
            code: src`
import json

def late_companies(path):
    late = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip() == "":
                continue
            complaint = json.loads(line)
            if complaint["timely"] == "No":
                late.append(complaint["company"])
    return late
`,
            fails: ["returns"],
            why: "a company with two late answers is listed twice",
          },
          {
            code: src`
import json

def late_companies(path):
    late = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if "No" in line:
                complaint = json.loads(line)
                if complaint["company"] not in late:
                    late.append(complaint["company"])
    return late
`,
            fails: ["returns"],
            why: "searching the raw line for `No` also matches text like `Nordic` or `North` in other fields",
          },
        ],
        hints: [
          "Read the file line by line and parse each non-blank line with `json.loads`.",
          "Look at the parsed record's `timely` value, not at the raw text of the line.",
          "Append a company only the first time it gives a late answer.",
        ],
        task: {
          files: {
            "complaints.jsonl": complaintsJsonl,
            "on_time.jsonl": JSON.stringify({ complaint_id: "1", company: "EQUIFAX, INC.", state: "NJ", timely: "Yes" }) + "\n",
            "tricky.jsonl": [JSON.stringify({ company: "Nordic Bank", state: "MN", timely: "Yes" }), JSON.stringify({ company: "North Credit", issue: "No response", timely: "Yes" }), "", JSON.stringify({ company: "Ally Financial", timely: "No" })].join("\n"),
          },
          checks: [
            fn("returns", "late_companies", [
              example(["complaints.jsonl"], ["Resurgent Capital Services L.P.", "CITIBANK, N.A."]),
              hiddenCase("every answer on time", ["on_time.jsonl"], []),
              hiddenCase("other fields that contain the letters No", ["tricky.jsonl"], ["Ally Financial"]),
            ], { label: "late_companies() lists each late company once" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Convert an event stream to CSV",
        prompt: "The analytics team wants yesterday's repository events (JSON Lines) as a CSV. Write `events_to_csv(src, dest)`: write `dest` with the header `created_at,type,actor,repo` and one line per event, where `actor` is the event's `actor.login` and `repo` is `repo.name`. Skip blank lines, and skip lines that aren't valid JSON. Return a tuple `(written, skipped)`, where `skipped` counts only the broken lines.",
        spec: [
          ["Function", "`events_to_csv(src, dest)`"],
          ["src", "JSONL; each record like `{\"id\": …, \"type\": \"PushEvent\", \"actor\": {\"login\": …}, \"repo\": {\"name\": …}, \"created_at\": …}`"],
          ["Writes", "`dest` with columns `created_at,type,actor,repo`, in the file's order"],
          ["Returns", "`(written, skipped)`"],
          ["Example", "`events.jsonl` → `(3, 1)`"],
        ],
        starter: src`
import csv
import json

def events_to_csv(src, dest):
    written = 0
    skipped = 0
    return (written, skipped)

print(events_to_csv("events.jsonl", "events.csv"))
`,
        answer: src`
import csv
import json

def events_to_csv(src, dest):
    written = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["created_at", "type", "actor", "repo"])
        for line in source:
            if line.strip() == "":
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            writer.writerow([event["created_at"], event["type"], event["actor"]["login"], event["repo"]["name"]])
            written += 1
    return (written, skipped)

print(events_to_csv("events.jsonl", "events.csv"))
`,
        alternatives: [
          src`
import csv
import json

def events_to_csv(src, dest):
    rows = []
    skipped = 0
    with open(src, encoding="utf-8") as source:
        for line in source:
            if not line.strip():
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
            else:
                rows.append({"created_at": event["created_at"], "type": event["type"], "actor": event["actor"]["login"], "repo": event["repo"]["name"]})
    with open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=["created_at", "type", "actor", "repo"])
        writer.writeheader()
        writer.writerows(rows)
    return (len(rows), skipped)
`,
        ],
        wrong: [
          {
            code: src`
import csv
import json

def events_to_csv(src, dest):
    written = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["created_at", "type", "actor", "repo"])
        for line in source:
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            writer.writerow([event["created_at"], event["type"], event["actor"]["login"], event["repo"]["name"]])
            written += 1
    return (written, skipped)
`,
            fails: ["returns"],
            why: "blank lines also fail to parse, so they're counted as broken records",
          },
          {
            code: src`
import csv
import json

def events_to_csv(src, dest):
    written = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out)
        writer.writerow(["created_at", "type", "actor", "repo"])
        for line in source:
            if line.strip() == "":
                continue
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue
            writer.writerow([event["created_at"], event["type"], event["actor"], event["repo"]])
            written += 1
    return (written, skipped)
`,
            fails: ["file"],
            why: "the whole nested `actor` and `repo` objects are written instead of the login and the name",
          },
        ],
        hints: [
          "Open the JSONL file to read and the CSV file to write in one `with`, and write the header first.",
          "For each non-blank line, try `json.loads`; a JSONDecodeError adds to `skipped` and moves on.",
          "The actor's login and the repository's name are one level down: index into `actor` and `repo`.",
        ],
        task: {
          files: { "events.jsonl": eventsJsonl, "clean.jsonl": JSON.stringify({ id: "1", type: "ForkEvent", actor: { login: "kai" }, repo: { name: "oakline/ledger" }, created_at: "2025-03-04T10:00:00Z" }) },
          checks: [
            fn("returns", "events_to_csv", [
              example(["events.jsonl", "_e1.csv"], py.tuple(py.int(3), py.int(1))),
              hiddenCase("a single record and no final newline", ["clean.jsonl", "_e2.csv"], py.tuple(py.int(1), py.int(0))),
            ], { label: "events_to_csv() counts written and broken records" }),
            csvRows("file", "the CSV has the header and one row per event with login and repo name", "_e3.csv", [
              ["created_at", "type", "actor", "repo"],
              ["2025-03-03T00:02:37Z", "PushEvent", "ml-koi418", "tidewater/smartqueue"],
              ["2025-03-03T00:05:10Z", "WatchEvent", "dev-ana", "tidewater/smartqueue"],
              ["2025-03-03T00:09:58Z", "IssuesEvent", "sam-ops", "oakline/ledger"],
            ], { setup: "events_to_csv('events.jsonl', '_e3.csv')" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

with open("log.jsonl", "a", encoding="utf-8") as out:
    out.write(json.dumps({"event": "login", "user": "C00164"}) + "\n")
with open("log.jsonl", "a", encoding="utf-8") as out:
    out.write(json.dumps({"event": "logout", "user": "C00164"}) + "\n")
count = 0
with open("log.jsonl", encoding="utf-8") as source:
    for line in source:
        record = json.loads(line)
        count += 1
print(count, record["event"])
`,
        choices: ["2 logout", "1 logout", "2 login", "JSONDecodeError"],
        answer: 0,
        why: "Each `with` block appends one complete line, so the file grows to two records without rewriting the first. The loop ends with the last record, the logout.",
      },
      {
        id: "q2",
        prompt: "A common mistake: writing JSONL with `indent`. What does this print?",
        program: src`
import json

with open("bad.jsonl", "w", encoding="utf-8") as out:
    out.write(json.dumps({"id": 1, "type": "PushEvent"}, indent=2) + "\n")
lines = 0
with open("bad.jsonl", encoding="utf-8") as source:
    for line in source:
        lines += 1
print(lines)
`,
        choices: ["4", "1", "2", "3"],
        answer: 0,
        why: "`indent=2` spreads the record over four lines (`{`, two keys, `}`), so no single line is a complete JSON value any more. JSONL records must be written without `indent`.",
      },
      {
        id: "q3",
        prompt: "Why do event logs usually use JSON Lines rather than one JSON array?",
        choices: ["A record can be appended without rewriting the file, and one bad line doesn't make the rest unreadable", "JSON Lines files are always smaller", "JSON arrays can't hold nested objects", "JSON Lines doesn't need double quotes"],
        answer: 0,
        why: "Appending to a JSON array means rewriting the whole document, and a single corrupt byte breaks `json.load` for everything. JSONL keeps each record independent.",
      },
    ],
    review: [
      "JSON Lines: one complete JSON value per line, written with `json.dumps(record) + \"\\n\"` (no `indent`).",
      "Read it with `for line in file:` and `json.loads(line)`, skipping blank lines.",
      "Catch `json.JSONDecodeError` per line to keep going, and record which lines were broken.",
      "Next module: dates and times, exact money, and patterns in text.",
    ],
  },
];
