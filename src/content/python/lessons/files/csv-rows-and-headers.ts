import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const i = py.int;

const ORDERS = `order_id,customer,product,quantity,unit_price,status
1001,ana,Desk lamp,2,24.50,completed
1002,ben,"Desk, oak",1,120.00,completed
1003,ana,Notebook,5,3.25,refunded
1004,cai,Desk lamp,1,24.50,completed
1005,dee,Chair,2,,pending
`;

const PRODUCTS = `sku,name,price
A1,Desk lamp,24.50
B2,"Desk, oak",120.00
C3,Notebook,3.25
`;

export const csvRowsAndHeaders: PyLesson = {
  slug: "csv-rows-and-headers",
  ref: "python:csv-rows-and-headers",
  module: "files",
  number: 2,
  title: "CSV rows and headers",
  level: "intermediate",
  summary:
    "Read comma-separated files properly with the `csv` module: rows as lists, or as dictionaries keyed by the header, with quoted commas handled for you. Convert the text fields to numbers, and decide what to do with blank values.",
  files: { "orders.csv": ORDERS, "products.csv": PRODUCTS },

  sections: [
    {
      label: "why not split(\",\")",
      blocks: [
        {
          kind: "p",
          text: "A CSV file is text: one row per line, fields separated by commas, usually with a **header** row naming the columns. But a field can itself contain a comma, as long as it's in quotes: `\"Desk, oak\"`. Splitting lines on commas breaks such rows into too many pieces. The `csv` module understands quoting, so use it for any real CSV file.",
        },
        { kind: "code", code: 'import csv\n\nwith open("orders.csv", newline="", encoding="utf-8") as f:\n    for row in csv.DictReader(f):\n        print(row["product"], row["quantity"])' },
        {
          kind: "p",
          text: "Open CSV files with `newline=\"\"`, as the `csv` documentation asks: it lets the module handle line endings itself, including line breaks inside quoted fields.",
        },
      ],
    },
    {
      label: "reader and DictReader",
      blocks: [
        {
          kind: "p",
          text: "`csv.reader(f)` gives each row as a **list** of strings, header included. `csv.DictReader(f)` reads the header for you and gives each following row as a **dictionary** from column name to value, so code says `row[\"unit_price\"]` instead of `row[4]` and keeps working if columns are reordered.",
        },
        {
          kind: "p",
          text: "Every value is a **string**. Convert as you go: `int(row[\"quantity\"])`, `float(row[\"unit_price\"])`. An empty field is the empty string `\"\"`, which `float()` rejects, so decide deliberately: skip the row, treat it as missing (`None`), or count it as an error.",
        },
      ],
    },
  ],

  example: {
    caption: "Totalling completed orders from orders.csv (see the Files list). Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import csv\n\nrevenue = 0\nwith open("orders.csv", newline="", encoding="utf-8") as f:\n    for row in csv.DictReader(f):\n        if row["status"] != "completed":\n            continue\n        line_total = int(row["quantity"]) * float(row["unit_price"])\n        revenue += line_total\n        print(f"{row[\'order_id\']}  {row[\'product\']:<10} {line_total:8.2f}")\n\nprint(f"Completed revenue: {revenue:.2f}")',
  },

  walkthrough: [
    {
      title: "split breaks quoted fields; csv doesn't",
      text: "The quoted `\"Desk, oak\"` becomes two pieces with `split`, but one field with `csv.reader`.",
      code: 'import csv\nline = \'1002,ben,"Desk, oak",1,120.00,completed\'\nprint(line.split(","))\nprint(next(csv.reader([line])))',
    },
    {
      title: "csv.reader gives lists",
      text: "The first row is the header; the rest are data, all as strings.",
      code: 'import csv\nwith open("products.csv", newline="", encoding="utf-8") as f:\n    rows = list(csv.reader(f))\nprint(rows[0])\nfor row in rows[1:]:\n    print(row)',
    },
    {
      title: "DictReader gives dictionaries",
      text: "Each row is keyed by the header, and `fieldnames` lists the columns.",
      code: 'import csv\nwith open("products.csv", newline="", encoding="utf-8") as f:\n    reader = csv.DictReader(f)\n    print(reader.fieldnames)\n    for row in reader:\n        print(row["sku"], float(row["price"]))',
    },
    {
      title: "Blank fields are empty strings",
      text: "Order 1005 has no unit price. Checking for `\"\"` before converting avoids a `ValueError`.",
      code: 'import csv\nwith open("orders.csv", newline="", encoding="utf-8") as f:\n    for row in csv.DictReader(f):\n        price = float(row["unit_price"]) if row["unit_price"] else None\n        print(row["order_id"], repr(row["unit_price"]), price)',
    },
  ],

  mistakes: [
    {
      title: "Calculating with text from a CSV",
      text: "Both values are strings, so `*` complains that it can't multiply a string by a string: `TypeError`.",
      code: 'import csv\nwith open("orders.csv", newline="", encoding="utf-8") as f:\n    row = next(csv.DictReader(f))\nprint(row["quantity"] * row["unit_price"])',
      raises: "TypeError",
      fix: 'Convert first: `int(row["quantity"]) * float(row["unit_price"])`.',
    },
    {
      title: "Converting a blank field",
      text: "The last order's price is empty, and `float(\"\")` is a `ValueError`, partway through the file.",
      code: 'import csv\nwith open("orders.csv", newline="", encoding="utf-8") as f:\n    total = sum(float(row["unit_price"]) for row in csv.DictReader(f))\nprint(total)',
      raises: "ValueError",
      fix: "Decide what a blank means and check for it before converting.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Revenue by customer",
      prompt:
        "Write `revenue_by_customer(path)`, which reads an orders CSV with the columns of `orders.csv` and returns a dictionary from customer to their revenue: the sum of `quantity × unit_price` over their **completed** orders, rounded to 2 places. Customers with no completed orders don't appear. Use `csv.DictReader`.",
      looksFor: [
        "Only rows whose `status` is `completed` count.",
        "Quoted fields like `\"Desk, oak\"` are read correctly.",
        "Each customer's total is rounded to 2 places; the result is a dictionary.",
      ],
      starter: 'import csv\n\n\ndef revenue_by_customer(path):\n    # Return {customer: revenue from completed orders}.\n    pass\n\n\nprint(revenue_by_customer("orders.csv"))\n',
      task: {
        files: {
          "more_orders.csv": 'order_id,customer,product,quantity,unit_price,status\n1,zoe,"Pens, blue",10,0.99,completed\n2,zoe,Ink,1,4.50,completed\n3,yan,Ink,2,4.50,pending\n',
          "empty_orders.csv": "order_id,customer,product,quantity,unit_price,status\n",
        },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "revenue_by_customer",
            cases: [
              { args: [s("orders.csv")], expected: py.dict([[s("ana"), f(49)], [s("ben"), f(120)], [s("cai"), f(24.5)]]) },
              { args: [s("empty_orders.csv")], expected: py.dict([]) },
              { args: [s("more_orders.csv")], expected: py.dict([[s("zoe"), f(14.4)]]), hidden: true },
            ],
            tip: "Skip rows whose status isn't completed, then totals[customer] = totals.get(customer, 0) + quantity * price. Round at the end.",
          },
        ],
      },
      hints: [
        'Open with newline="" and loop over csv.DictReader(f).',
        'if row["status"] != "completed": continue. Then add int(row["quantity"]) * float(row["unit_price"]) to that customer\'s total.',
        "Return {c: round(t, 2) for c, t in totals.items()}.",
      ],
      answer: 'import csv\n\n\ndef revenue_by_customer(path):\n    """Return {customer: revenue from completed orders, rounded to 2 places}."""\n    totals = {}\n    with open(path, newline="", encoding="utf-8") as f:\n        for row in csv.DictReader(f):\n            if row["status"] != "completed":\n                continue\n            amount = int(row["quantity"]) * float(row["unit_price"])\n            totals[row["customer"]] = totals.get(row["customer"], 0) + amount\n    return {customer: round(total, 2) for customer, total in totals.items()}\n\n\nprint(revenue_by_customer("orders.csv"))',
      wrong: [
        { code: 'def revenue_by_customer(path):\n    totals = {}\n    with open(path, encoding="utf-8") as f:\n        lines = f.read().splitlines()[1:]\n    for line in lines:\n        order_id, customer, product, quantity, price, status = line.split(",")\n        if status == "completed":\n            totals[customer] = round(totals.get(customer, 0) + int(quantity) * float(price), 2)\n    return totals\n', fails: ["fn"], why: "split breaks the quoted product" },
        { code: 'import csv\n\ndef revenue_by_customer(path):\n    totals = {}\n    with open(path, newline="", encoding="utf-8") as f:\n        for row in csv.DictReader(f):\n            if row["unit_price"]:\n                amount = int(row["quantity"]) * float(row["unit_price"])\n                totals[row["customer"]] = round(totals.get(row["customer"], 0) + amount, 2)\n    return totals\n', fails: ["fn"], why: "includes refunded and pending orders" },
      ],
    },
    {
      id: "challenge-2",
      title: "Load a product catalog",
      prompt:
        "Write `load_prices(path)`, which reads a products CSV with columns `sku,name,price` and returns a dictionary from SKU to price (a float). Rows with a blank or non-numeric price are skipped. Return a tuple: the dictionary, and the number of rows skipped.",
      looksFor: [
        "Each valid row becomes `sku: float(price)`.",
        "Rows with a blank or invalid price are skipped and counted.",
        "Quoted names with commas don't break the row.",
      ],
      starter: 'import csv\n\n\ndef load_prices(path):\n    # Return ({sku: price}, skipped_rows).\n    pass\n\n\nprint(load_prices("products.csv"))\n',
      task: {
        files: { "messy_products.csv": 'sku,name,price\nX1,"Mug, large",7.5\nX2,Cup,\nX3,Plate,n/a\nX4,"Bowl, ""deep""",12\n' },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "load_prices",
            cases: [
              { args: [s("products.csv")], expected: py.tuple(py.dict([[s("A1"), f(24.5)], [s("B2"), f(120)], [s("C3"), f(3.25)]]), i(0)) },
              { args: [s("messy_products.csv")], expected: py.tuple(py.dict([[s("X1"), f(7.5)], [s("X4"), f(12)]]), i(2)) },
            ],
            tip: "try: price = float(row[\"price\"]) / except ValueError: skipped += 1; continue. float(\"\") raises ValueError too.",
          },
        ],
      },
      hints: [
        "prices = {} and skipped = 0, then loop over csv.DictReader(f).",
        'try: prices[row["sku"]] = float(row["price"]) except ValueError: skipped += 1.',
        "return prices, skipped.",
      ],
      answer: 'import csv\n\n\ndef load_prices(path):\n    """Return ({sku: price}, number of rows skipped for a blank or invalid price)."""\n    prices = {}\n    skipped = 0\n    with open(path, newline="", encoding="utf-8") as f:\n        for row in csv.DictReader(f):\n            try:\n                prices[row["sku"]] = float(row["price"])\n            except ValueError:\n                skipped += 1\n    return prices, skipped\n\n\nprint(load_prices("products.csv"))',
      wrong: [
        { code: 'import csv\n\ndef load_prices(path):\n    prices = {}\n    skipped = 0\n    with open(path, newline="", encoding="utf-8") as f:\n        for row in csv.DictReader(f):\n            if row["price"]:\n                prices[row["sku"]] = float(row["price"])\n            else:\n                skipped += 1\n    return prices, skipped\n', fails: ["fn"], why: "n/a crashes" },
      ],
    },
  ],

  quiz: [
    {
      id: "types",
      prompt: "In a row from `csv.DictReader`, what type is `row[\"quantity\"]` when the file contains `2`?",
      options: [
        { text: "`str`", correct: true, why: "CSV is text, and the `csv` module never guesses types. Convert with `int()`." },
        { text: "`int`", why: "The module doesn't convert values; that's your decision to make." },
        { text: "`float`", why: "No conversion happens at all; every field is a string." },
        { text: "It depends on the header", why: "Headers only name the columns; they don't set types." },
      ],
    },
    {
      id: "quoted",
      prompt: 'How many fields does `csv.reader` find in the line `7,"Smith, J",42`?',
      options: [
        { text: "3", correct: true, why: "The quotes make `Smith, J` one field, so: `7`, `Smith, J`, `42`." },
        { text: "4", why: "That's what `split(\",\")` gives, splitting inside the quotes." },
        { text: "2", why: "Commas outside quotes still separate fields." },
        { text: "1", why: "Only commas inside quotes are part of a field." },
      ],
    },
  ],

  outcomes: [
    "Read CSV files with `csv.reader` and `csv.DictReader`, opened with `newline=\"\"`.",
    "Explain why `split(\",\")` fails on quoted fields.",
    "Convert CSV strings to numbers, and handle blank or invalid values deliberately.",
    "Aggregate rows into per-key totals.",
  ],
};
