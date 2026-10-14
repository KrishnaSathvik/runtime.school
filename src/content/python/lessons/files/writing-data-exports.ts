import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));

const read = (path: string) => `with open("${path}", encoding="utf-8", newline="") as _f:\n    result = _f.read()`;

export const writingDataExports: PyLesson = {
  slug: "writing-data-exports",
  ref: "python:writing-data-exports",
  module: "files",
  number: 7,
  title: "Writing data exports",
  level: "intermediate",
  summary:
    "Produce files other people and programs can rely on: CSV written with `csv.DictWriter` (header, quoting and all), and JSON written with stable formatting. Fix the column order, sort the rows, and format numbers consistently, so the same data always produces the same file.",

  sections: [
    {
      label: "writing CSV",
      blocks: [
        {
          kind: "p",
          text: "`csv.DictWriter(f, fieldnames=[...])` writes dictionaries as rows. `fieldnames` fixes the column order; `writeheader()` writes the header line; `writerow(d)` and `writerows(list_of_dicts)` write data. Fields containing commas, quotes or newlines are quoted automatically, so the file reads back correctly. As when reading, open the file with `newline=\"\"`.",
        },
        { kind: "code", code: 'import csv\n\nrows = [{"sku": "B2", "name": "Desk, oak", "units": 1}, {"sku": "A1", "name": "Lamp", "units": 4}]\nwith open("stock.csv", "w", newline="", encoding="utf-8") as f:\n    writer = csv.DictWriter(f, fieldnames=["sku", "name", "units"])\n    writer.writeheader()\n    writer.writerows(sorted(rows, key=lambda r: r["sku"]))' },
        {
          kind: "p",
          text: "The `csv` module writes rows ending with `\\r\\n`, the line ending the CSV standard specifies. Spreadsheets and other programs read it correctly; just don't be surprised to see it in `repr()`.",
        },
      ],
    },
    {
      label: "deterministic output",
      blocks: [
        {
          kind: "p",
          text: "An export is **deterministic** when the same input always produces exactly the same bytes. That makes outputs easy to compare, test and trust. Sort rows by a key (not whatever order a dictionary or set happened to have), fix the columns, format numbers the same way every time (`f\"{amount:.2f}\"`), and use `sort_keys=True` for JSON. Avoid putting the current time into the data unless the reader needs it.",
        },
      ],
    },
    {
      label: "check what you wrote",
      blocks: [
        {
          kind: "p",
          text: "After writing, read the file back and check it: row count, header, a sample row. It takes three lines and catches mistakes like a missing header or a wrong separator before anyone else sees the file. In Runtime, files your program writes appear in the Files list, where you can open and download them.",
        },
      ],
    },
  ],

  example: {
    caption: "Writing a CSV and a JSON summary, then reading the CSV back. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import csv\nimport json\n\nsales = {"york": 140.0, "leeds": 220.0, "hull": 45.25}\nrows = [{"store": store, "revenue": f"{total:.2f}"} for store, total in sorted(sales.items())]\n\nwith open("revenue.csv", "w", newline="", encoding="utf-8") as f:\n    writer = csv.DictWriter(f, fieldnames=["store", "revenue"])\n    writer.writeheader()\n    writer.writerows(rows)\n\nsummary = {"stores": len(sales), "total": round(sum(sales.values()), 2)}\nwith open("summary.json", "w", encoding="utf-8") as f:\n    json.dump(summary, f, indent=2, sort_keys=True)\n\nwith open("revenue.csv", newline="", encoding="utf-8") as f:\n    print(list(csv.DictReader(f)))',
  },

  walkthrough: [
    {
      title: "DictWriter quotes what needs quoting",
      text: "The name with a comma is quoted; plain values aren't. Reading the file back gives the original values.",
      code: 'import csv\nrows = [{"sku": "B2", "name": "Desk, oak"}, {"sku": "A1", "name": "Lamp"}]\nwith open("out.csv", "w", newline="", encoding="utf-8") as f:\n    w = csv.DictWriter(f, fieldnames=["sku", "name"])\n    w.writeheader()\n    w.writerows(rows)\nwith open("out.csv", newline="", encoding="utf-8") as f:\n    text = f.read()\nprint(repr(text))',
    },
    {
      title: "fieldnames fixes the column order",
      text: "The dictionaries list their keys in different orders, but every row comes out in the `fieldnames` order.",
      code: 'import csv, io\nbuf = io.StringIO()\nw = csv.DictWriter(buf, fieldnames=["id", "city"], lineterminator="\\n")\nw.writeheader()\nw.writerow({"city": "Leeds", "id": 1})\nw.writerow({"id": 2, "city": "York"})\nprint(buf.getvalue())',
    },
    {
      title: "Sort for the same output every time",
      text: "Sorting by key makes the row order depend only on the data, not on the order it was collected in.",
      code: 'a = {"york": 2, "hull": 1}\nb = {"hull": 1, "york": 2}\nprint(list(a.items()) == list(b.items()))\nprint(sorted(a.items()) == sorted(b.items()))',
    },
    {
      title: "Read it back to check",
      text: "Two quick checks after writing: the header and the number of data rows.",
      code: 'import csv\nwith open("check.csv", "w", newline="", encoding="utf-8") as f:\n    w = csv.writer(f)\n    w.writerow(["store", "revenue"])\n    w.writerows([["hull", "45.25"], ["leeds", "220.00"]])\nwith open("check.csv", newline="", encoding="utf-8") as f:\n    rows = list(csv.reader(f))\nprint(rows[0], len(rows) - 1, "data rows")',
    },
  ],

  mistakes: [
    {
      title: "A row with a key that isn't a column",
      text: "`DictWriter` refuses a dictionary with keys missing from `fieldnames`: `ValueError`, naming the extra key.",
      code: 'import csv\nwith open("out.csv", "w", newline="", encoding="utf-8") as f:\n    w = csv.DictWriter(f, fieldnames=["sku"])\n    w.writeheader()\n    w.writerow({"sku": "A1", "units": 4})',
      raises: "ValueError",
      fix: 'Add the column to `fieldnames`, or pass `extrasaction="ignore"` if leaving it out is intended.',
    },
    {
      title: "Writing CSV by joining strings",
      text: "Joining with commas doesn't quote the name, so the file now has three columns in one row and two in the other.",
      code: 'rows = [("B2", "Desk, oak"), ("A1", "Lamp")]\nlines = ["sku,name"] + [",".join(r) for r in rows]\nprint("\\n".join(lines))\nprint([len(line.split(",")) for line in lines])',
      fix: "Use `csv.writer` or `csv.DictWriter`, which quote fields when needed.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Export a sorted inventory CSV",
      prompt:
        "Write `export_inventory(items, path)`. `items` is a list of dictionaries with `sku`, `name`, `units` and `price`. Write a CSV to `path` with the columns `sku,name,units,value` (in that order) where `value` is `units × price` formatted with 2 decimal places, rows **sorted by sku**, and a header. Use `csv.DictWriter`. Return the number of data rows written.",
      looksFor: [
        "The header is `sku,name,units,value`, and rows are sorted by `sku`.",
        "`value` is `units × price` with exactly 2 decimal places.",
        "Names containing commas are quoted correctly (DictWriter does this).",
      ],
      starter: 'import csv\n\n\ndef export_inventory(items, path):\n    # Write the CSV; return the number of rows.\n    pass\n\n\nitems = [\n    {"sku": "B2", "name": "Desk, oak", "units": 1, "price": 120.0},\n    {"sku": "A1", "name": "Lamp", "units": 4, "price": 24.5},\n]\nprint(export_inventory(items, "inventory.csv"))\n',
      task: {
        checks: [
          { kind: "function", id: "fn", name: "export_inventory", cases: [{ args: [py.list(rec([["sku", s("C3")], ["name", s("Pen")], ["units", i(10)], ["price", f(0.5)]])), s("one.csv")], expected: i(1) }, { args: [py.list(), s("none.csv")], expected: i(0) }] },
          {
            kind: "expr",
            id: "file",
            label: "The CSV has the header, sorted rows and 2-place values",
            show: "export_inventory(items, \"check.csv\"), then the file's text",
            expr: 'export_inventory([{"sku": "B2", "name": "Desk, oak", "units": 1, "price": 120.0}, {"sku": "A1", "name": "Lamp", "units": 4, "price": 24.5}, {"sku": "A0", "name": "Mug", "units": 3, "price": 0.333}], "check.csv")\n' + read("check.csv"),
            expected: s('sku,name,units,value\r\nA0,Mug,3,1.00\r\nA1,Lamp,4,98.00\r\nB2,"Desk, oak",1,120.00\r\n'),
            tip: 'fieldnames=["sku", "name", "units", "value"], rows sorted by sku, and value as f"{units * price:.2f}".',
          },
        ],
      },
      hints: [
        'Build rows: {"sku": it["sku"], "name": it["name"], "units": it["units"], "value": f"{it[\'units\'] * it[\'price\']:.2f}"}.',
        "Sort them: sorted(rows, key=lambda r: r[\"sku\"]).",
        'Open with "w", newline="", encoding="utf-8"; DictWriter with the four fieldnames; writeheader(); writerows(rows). Return len(rows).',
      ],
      answer: 'import csv\n\n\ndef export_inventory(items, path):\n    """Write sku,name,units,value rows sorted by sku; return how many rows."""\n    rows = [\n        {"sku": it["sku"], "name": it["name"], "units": it["units"], "value": f"{it[\'units\'] * it[\'price\']:.2f}"}\n        for it in items\n    ]\n    rows.sort(key=lambda r: r["sku"])\n    with open(path, "w", newline="", encoding="utf-8") as f:\n        writer = csv.DictWriter(f, fieldnames=["sku", "name", "units", "value"])\n        writer.writeheader()\n        writer.writerows(rows)\n    return len(rows)\n\n\nitems = [\n    {"sku": "B2", "name": "Desk, oak", "units": 1, "price": 120.0},\n    {"sku": "A1", "name": "Lamp", "units": 4, "price": 24.5},\n]\nprint(export_inventory(items, "inventory.csv"))',
      wrong: [
        { code: 'import csv\n\ndef export_inventory(items, path):\n    with open(path, "w", newline="", encoding="utf-8") as f:\n        writer = csv.DictWriter(f, fieldnames=["sku", "name", "units", "value"])\n        writer.writeheader()\n        for it in items:\n            writer.writerow({"sku": it["sku"], "name": it["name"], "units": it["units"], "value": it["units"] * it["price"]})\n    return len(items)\n', fails: ["file"], why: "unsorted, unformatted values" },
        { code: 'def export_inventory(items, path):\n    rows = sorted(items, key=lambda it: it["sku"])\n    with open(path, "w", encoding="utf-8") as f:\n        f.write("sku,name,units,value\\n")\n        for it in rows:\n            f.write(f"{it[\'sku\']},{it[\'name\']},{it[\'units\']},{it[\'units\'] * it[\'price\']:.2f}\\n")\n    return len(rows)\n', fails: ["file"], why: "hand-written CSV doesn't quote the comma" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write a reproducible JSON summary",
      prompt:
        "Write `write_summary(orders, path)`. From a list of order dictionaries (`customer`, `amount`), write a JSON object to `path` with keys `order_count`, `revenue` (rounded to 2 places) and `customers` (a **sorted** list of distinct customers). Use `indent=2` and `sort_keys=True`, so that the same orders, in **any order**, produce exactly the same file. Return the dictionary you wrote.",
      looksFor: [
        "The JSON has `order_count`, `revenue` and a sorted `customers` list.",
        "It's written with `indent=2` and `sort_keys=True`.",
        "Shuffling the orders produces byte-for-byte the same file.",
      ],
      starter: 'import json\n\n\ndef write_summary(orders, path):\n    # Write the summary JSON; return the summary dict.\n    pass\n\n\norders = [{"customer": "ben", "amount": 15.5}, {"customer": "ana", "amount": 40.0}, {"customer": "ana", "amount": 22.5}]\nprint(write_summary(orders, "summary.json"))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "write_summary",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [py.list(rec([["customer", s("ben")], ["amount", f(15.5)]]), rec([["customer", s("ana")], ["amount", f(40)]]), rec([["customer", s("ana")], ["amount", f(22.5)]])), s("a.json")], expected: rec([["order_count", i(3)], ["revenue", f(78)], ["customers", py.list(s("ana"), s("ben"))]]) },
              { args: [py.list(), s("b.json")], expected: rec([["order_count", i(0)], ["revenue", i(0)], ["customers", py.list()]]) },
            ],
          },
          {
            kind: "expr",
            id: "stable",
            label: "The same orders in a different order give the same file, with sorted keys and indent=2",
            show: "write_summary(orders) and write_summary(reversed orders), then compare the files",
            expr: 'orders = [{"customer": "cai", "amount": 0.1}, {"customer": "ana", "amount": 0.2}, {"customer": "ben", "amount": 0.3}]\nwrite_summary(orders, "one.json")\nwrite_summary(list(reversed(orders)), "two.json")\nwith open("one.json", encoding="utf-8") as _a, open("two.json", encoding="utf-8") as _b:\n    _one = _a.read()\n    result = (_one == _b.read(), _one)',
            expected: py.tuple(py.bool(true), s('{\n  "customers": [\n    "ana",\n    "ben",\n    "cai"\n  ],\n  "order_count": 3,\n  "revenue": 0.6\n}')),
            tip: "Sort the customers, round the revenue, and dump with indent=2 and sort_keys=True.",
          },
        ],
      },
      hints: [
        'customers = sorted({o["customer"] for o in orders}).',
        'revenue = round(sum(o["amount"] for o in orders), 2).',
        "json.dump(summary, f, indent=2, sort_keys=True), then return summary.",
      ],
      answer: 'import json\n\n\ndef write_summary(orders, path):\n    """Write a reproducible JSON summary of orders to path, and return it."""\n    summary = {\n        "order_count": len(orders),\n        "revenue": round(sum(o["amount"] for o in orders), 2),\n        "customers": sorted({o["customer"] for o in orders}),\n    }\n    with open(path, "w", encoding="utf-8") as f:\n        json.dump(summary, f, indent=2, sort_keys=True)\n    return summary\n\n\norders = [{"customer": "ben", "amount": 15.5}, {"customer": "ana", "amount": 40.0}, {"customer": "ana", "amount": 22.5}]\nprint(write_summary(orders, "summary.json"))',
      wrong: [
        { code: 'import json\n\ndef write_summary(orders, path):\n    customers = []\n    for o in orders:\n        if o["customer"] not in customers:\n            customers.append(o["customer"])\n    summary = {"order_count": len(orders), "revenue": round(sum(o["amount"] for o in orders), 2), "customers": customers}\n    with open(path, "w", encoding="utf-8") as f:\n        json.dump(summary, f, indent=2, sort_keys=True)\n    return summary\n', fails: ["fn", "stable"], why: "customers in first-seen order" },
        { code: 'import json\n\ndef write_summary(orders, path):\n    summary = {"order_count": len(orders), "revenue": round(sum(o["amount"] for o in orders), 2), "customers": sorted({o["customer"] for o in orders})}\n    with open(path, "w", encoding="utf-8") as f:\n        json.dump(summary, f, indent=2)\n    return summary\n', fails: ["stable"], why: "no sort_keys" },
      ],
    },
  ],

  quiz: [
    {
      id: "quote",
      prompt: 'What does `csv.writer` write for the row `["A1", "Desk, oak", "4"]`?',
      options: [
        { text: '`A1,"Desk, oak",4`', correct: true, why: "The field with a comma is quoted so it stays one field; the others don't need quotes." },
        { text: "`A1,Desk, oak,4`", why: "That would read back as four fields. The writer quotes fields that contain commas." },
        { text: '`"A1","Desk, oak","4"`', why: "By default only fields that need quoting are quoted." },
        { text: "An error, because of the comma", why: "Commas in fields are normal; quoting handles them." },
      ],
    },
    {
      id: "deterministic",
      prompt: "Which change makes an export deterministic?",
      options: [
        { text: "Sorting rows by a key before writing", correct: true, why: "Then the order depends only on the data, not on how it was collected." },
        { text: "Writing the current time into every row", why: "That makes every run's output different, even for the same data." },
        { text: "Iterating over a set of customers when writing", why: "Set order isn't something to rely on; sort it." },
        { text: "Leaving numbers unformatted", why: "Unrounded floats can print differently depending on how they were summed; format them consistently." },
      ],
    },
  ],

  outcomes: [
    "Write CSV files with `csv.DictWriter`, a fixed column order and a header.",
    "Write JSON exports with `indent` and `sort_keys`.",
    "Make exports deterministic: sorted rows, fixed columns and consistent number formats.",
    "Read an export back to check it.",
  ],
};
