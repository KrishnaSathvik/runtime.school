import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyQuestion } from "./types";

const i = py.int;
const f = py.float;
const s = py.str;
const strs = (...xs: string[]) => py.list(...xs.map(s));
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const close = { numbers: "int-float-equal" } as const;

const SALES_CSV = "order_id,product,price,qty\n1,lamp,19.99,2\n2,desk,abc,1\n3,chair,45.00,1\n4,pen,2.50,\n5,mug,6.00,-1\n6,rug,30,3\n";
const APP_LOG =
  "2026-10-14 08:00:01 INFO service started\n2026-10-14 08:00:05 WARN cache miss rate high\n2026-10-14 08:01:10 ERROR payment timeout\ngarbage line\n2026-10-14 08:02:00 INFO request served\n\n2026-10-14 08:03:00 DEBUG noisy detail\n2026-10-14 08:04:00 info lowercase level\n";
const CONTACTS_CSV = "id,name,email\n7,  ada lovelace ,ADA@X.COM\n8,ben okafor,\n9,cai\n12, dee  ,Dee@Y.org\n";
const CLEAN_CONTACTS = "id,name,email\n7,Ada Lovelace,ada@x.com\n8,Ben Okafor,\n9,Cai,\n12,Dee,dee@y.org\n";
const INVENTORY_JSON =
  '[\n  {\n    "name": "Café lamp",\n    "sku": "L-01",\n    "stock": 4\n  },\n  {\n    "name": "Desk",\n    "sku": "D-02",\n    "stock": 0,\n    "tags": [\n      "oak",\n      "wide"\n    ]\n  }\n]\n';
const NOTES_CRLF = "Shopping list\r\n\r\n  milk  \r\n\t\r\neggs and bread\r\n";
const OLD_CSV = "id,name,price\n1,lamp,19.99\n2,desk,120\n3,chair,45\n";
const NEW_CSV = "id,name,price\n1,lamp,17.99\n3,chair,45\n4,rug,30\n4,rug,30\n";

const readText = (name: string) => `with open("${name}", encoding="utf-8") as _f:\n    result = _f.read()`;

export const py08: PyQuestion[] = [
  {
    ref: "python:bank:py08-01",
    slug: "py08-01",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "CSV revenue summary",
    topics: ["csv", "DictReader", "invalid rows"],
    minutes: 8,
    after: "python:csv-rows-and-headers",
    prompt:
      "Write `revenue_summary(path)` that reads a sales CSV (columns `order_id,product,price,qty`) and returns `{\"revenue\": ..., \"valid\": ..., \"skipped\": ...}`.\n\nA row is valid when `price` is a number ≥ 0 and `qty` is a whole number ≥ 1. Revenue adds `price * qty` for valid rows and is rounded to 2 places. Every other row is skipped and counted. A file with only a header gives revenue 0. Check answer also tries files you can't see.",
    expectedOutput: "{'revenue': 174.98, 'valid': 3, 'skipped': 3}\n",
    looksFor: ["Rows with a non-numeric, missing or negative value are skipped and counted, not a crash.", "Revenue is rounded to 2 places.", "A header-only file gives zeros."],
    starter: 'import csv\n\n\ndef revenue_summary(path):\n    pass\n\n\nprint(revenue_summary("sales.csv"))\n',
    files: { "sales.csv": SALES_CSV, "header_only.csv": "order_id,product,price,qty\n" },
    task: {
      checks: [
        { kind: "expr", id: "sales", label: "Summarizes sales.csv", show: 'revenue_summary("sales.csv")', expr: 'revenue_summary("sales.csv")', expected: rec([["revenue", f(174.98)], ["valid", i(3)], ["skipped", i(3)]]), compare: close },
        { kind: "expr", id: "header-only", label: "A header-only file gives zeros", show: 'revenue_summary("header_only.csv")', expr: 'revenue_summary("header_only.csv")', expected: rec([["revenue", i(0)], ["valid", i(0)], ["skipped", i(0)]]), compare: close },
        {
          kind: "expr",
          id: "hidden-file",
          label: "Another file",
          hidden: true,
          expr: 'with open("extra.csv", "w", encoding="utf-8") as _out:\n    _out.write("order_id,product,price,qty\\n1,a,1.5,2\\n2,b,-1,1\\n3,c,2,0\\n4,d,2,1.5\\n")\nresult = revenue_summary("extra.csv")',
          expected: rec([["revenue", f(3)], ["valid", i(1)], ["skipped", i(3)]]),
          compare: close,
        },
        { kind: "output", id: "output", label: "Prints the summary", expected: "{'revenue': 174.98, 'valid': 3, 'skipped': 3}\n" },
      ],
    },
    hints: ['with open(path, newline="", encoding="utf-8") as handle: for row in csv.DictReader(handle):', 'Convert inside try: price = float(row["price"]); qty = int(row["qty"]), with except ValueError: skipped += 1; continue.', "After converting, a negative price or qty below 1 is skipped too."],
    answer:
      'import csv\n\n\ndef revenue_summary(path):\n    revenue = 0\n    valid = 0\n    skipped = 0\n    with open(path, newline="", encoding="utf-8") as handle:\n        for row in csv.DictReader(handle):\n            try:\n                price = float(row["price"])\n                qty = int(row["qty"])\n            except ValueError:\n                skipped += 1\n                continue\n            if price < 0 or qty < 1:\n                skipped += 1\n                continue\n            revenue += price * qty\n            valid += 1\n    return {"revenue": round(revenue, 2), "valid": valid, "skipped": skipped}\n\n\nprint(revenue_summary("sales.csv"))',
    wrong: [
      { code: 'import csv\n\n\ndef revenue_summary(path):\n    revenue = 0\n    valid = 0\n    with open(path, newline="", encoding="utf-8") as handle:\n        for row in csv.DictReader(handle):\n            revenue += float(row["price"]) * int(row["qty"])\n            valid += 1\n    return {"revenue": round(revenue, 2), "valid": valid, "skipped": 0}\n\n\nprint(revenue_summary("sales.csv"))\n', fails: "program" },
      { code: 'import csv\n\n\ndef revenue_summary(path):\n    revenue = 0\n    valid = 0\n    skipped = 0\n    with open(path, newline="", encoding="utf-8") as handle:\n        for row in csv.DictReader(handle):\n            try:\n                revenue += float(row["price"]) * int(row["qty"])\n                valid += 1\n            except ValueError:\n                skipped += 1\n    return {"revenue": round(revenue, 2), "valid": valid, "skipped": skipped}\n\n\nprint(revenue_summary("sales.csv"))\n', fails: ["sales", "hidden-file", "output"], why: "A quantity of -1 converts fine, so the refund-like row is counted as revenue." },
    ],
  },
  {
    ref: "python:bank:py08-02",
    slug: "py08-02",
    module: "files",
    kind: "predict",
    difficulty: "medium",
    title: "Predict: totals from a JSON payload",
    topics: ["json", "nested data", "empty lists"],
    minutes: 5,
    after: "python:json-data-and-nested-objects",
    prompt: "This program totals what each customer spent across their orders. What does it print?",
    code:
      'import json\n\ntext = \'{"orders": [{"customer": "C2", "items": [{"price": 5, "qty": 2}]}, {"customer": "C1", "items": []}, {"customer": "C2", "items": [{"price": 1.5, "qty": 4}]}]}\'\ndata = json.loads(text)\n\ntotals = {}\nfor order in data["orders"]:\n    spent = sum(item["price"] * item["qty"] for item in order["items"])\n    totals[order["customer"]] = totals.get(order["customer"], 0) + spent\n\nfor customer in sorted(totals):\n    print(customer, totals[customer])\nprint(json.dumps(totals, sort_keys=True))',
    output: 'C1 0\nC2 16.0\n{"C1": 0, "C2": 16.0}\n',
    explanation:
      "C1's only order has an empty `items` list, and `sum` of nothing is the integer `0`. C2 spends `5 * 2 = 10` (an int) then `1.5 * 4 = 6.0` (a float), so the total is `16.0`. `sorted` puts C1 first whatever order the JSON used, and `json.dumps` writes Python's `0` and `16.0` as JSON numbers with double-quoted keys.",
    hints: ["What does sum() return for an empty list?", "Mixing an int and a float gives a float."],
    wrong: ['C2 16.0\nC1 0\n{"C2": 16.0, "C1": 0}', 'C1 0\nC2 16\n{"C1": 0, "C2": 16}'],
  },
  {
    ref: "python:bank:py08-03",
    slug: "py08-03",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Normalize dates to ISO 8601",
    topics: ["datetime", "strptime", "leap years"],
    minutes: 7,
    after: "python:dates-times-and-time-zones",
    prompt:
      "Write `to_iso(text)` that accepts a date as `YYYY-MM-DD` or as day-first `DD/MM/YYYY` (spaces around it are fine) and returns it as `YYYY-MM-DD`. Anything else, including dates that don't exist like 29/02/2026, raises `ValueError`.",
    expectedOutput: "2026-10-14\n2028-02-29\n",
    looksFor: ["Both formats are accepted and the result is always `YYYY-MM-DD`.", "Impossible dates are rejected, while 29 February in leap years is accepted.", "Any other format raises `ValueError`."],
    starter: 'from datetime import datetime\n\n\ndef to_iso(text):\n    pass\n\n\nprint(to_iso("14/10/2026"))\nprint(to_iso("2028-02-29"))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "converts",
          label: "Converts both formats",
          name: "to_iso",
          cases: [
            { args: [s("2026-10-14")], expected: s("2026-10-14") },
            { args: [s("14/10/2026")], expected: s("2026-10-14") },
            { args: [s("29/02/2028")], expected: s("2028-02-29") },
            { args: [s(" 01/02/2026 ")], expected: s("2026-02-01") },
            { args: [s("01/01/2000")], expected: s("2000-01-01"), hidden: true },
          ],
        },
        {
          kind: "function",
          id: "rejects",
          label: "Rejects impossible dates and other formats",
          name: "to_iso",
          cases: [
            { args: [s("29/02/2026")], raises: "ValueError" },
            { args: [s("10/14/2026")], raises: "ValueError" },
            { args: [s("2026/10/14")], raises: "ValueError" },
            { args: [s("31/04/2026")], raises: "ValueError", hidden: true },
            { args: [s("")], raises: "ValueError", hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "2026-10-14\n2028-02-29\n" },
      ],
    },
    hints: ['Try each format in turn: for fmt in ["%Y-%m-%d", "%d/%m/%Y"]:', "datetime.strptime(text.strip(), fmt) raises ValueError if the text doesn't fit, or the date doesn't exist.", "Return parsed.date().isoformat() on the first success; raise ValueError after the loop."],
    answer:
      'from datetime import datetime\n\n\ndef to_iso(text):\n    for fmt in ["%Y-%m-%d", "%d/%m/%Y"]:\n        try:\n            return datetime.strptime(text.strip(), fmt).date().isoformat()\n        except ValueError:\n            pass\n    raise ValueError(f"unrecognised date: {text!r}")\n\n\nprint(to_iso("14/10/2026"))\nprint(to_iso("2028-02-29"))',
    wrong: [
      { code: 'from datetime import datetime\n\n\ndef to_iso(text):\n    text = text.strip()\n    if "/" in text:\n        day, month, year = text.split("/")\n        return f"{year}-{month}-{day}"\n    return text\n\n\nprint(to_iso("14/10/2026"))\nprint(to_iso("2028-02-29"))\n', fails: ["rejects"] },
      { code: 'from datetime import datetime\n\n\ndef to_iso(text):\n    for fmt in ["%Y-%m-%d", "%m/%d/%Y"]:\n        try:\n            return datetime.strptime(text.strip(), fmt).date().isoformat()\n        except ValueError:\n            pass\n    raise ValueError("unrecognised date")\n\n\nprint(to_iso("14/10/2026"))\nprint(to_iso("2028-02-29"))\n', fails: "program" },
    ],
  },
  {
    ref: "python:bank:py08-04",
    slug: "py08-04",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Audit malformed log entries",
    topics: ["text files", "split", "malformed lines"],
    minutes: 7,
    after: "python:working-with-text-files-safely",
    prompt:
      "`app.log` has lines like `2026-10-14 08:00:01 INFO service started`: date, time, level, message. Write `count_levels(path)` returning a dictionary with the keys `INFO`, `WARN`, `ERROR` and `malformed`, always all four. A non-blank line whose third word is exactly one of the three levels counts for it; every other non-blank line (too short, other levels, lowercase) is `malformed`. Blank lines are ignored.",
    expectedOutput: "{'INFO': 2, 'WARN': 1, 'ERROR': 1, 'malformed': 3}\n",
    looksFor: ["All four keys are present, even with a count of 0.", "Short or unknown lines are counted as malformed instead of crashing.", "Blank lines don't count at all."],
    starter: 'def count_levels(path):\n    pass\n\n\nprint(count_levels("app.log"))\n',
    files: { "app.log": APP_LOG },
    task: {
      checks: [
        { kind: "expr", id: "app-log", label: "Counts app.log", show: 'count_levels("app.log")', expr: 'count_levels("app.log")', expected: rec([["INFO", i(2)], ["WARN", i(1)], ["ERROR", i(1)], ["malformed", i(3)]]) },
        { kind: "expr", id: "empty", label: "An empty log gives four zeros", show: 'count_levels("empty.log")', expr: 'with open("empty.log", "w") as _out:\n    _out.write("")\nresult = count_levels("empty.log")', expected: rec([["INFO", i(0)], ["WARN", i(0)], ["ERROR", i(0)], ["malformed", i(0)]]) },
        { kind: "expr", id: "hidden-log", label: "Another log", hidden: true, expr: 'with open("other.log", "w") as _out:\n    _out.write("d t ERROR x\\n\\n  \\nd t WARN\\nWARN\\n")\nresult = count_levels("other.log")', expected: rec([["INFO", i(0)], ["WARN", i(1)], ["ERROR", i(1)], ["malformed", i(1)]]) },
        { kind: "output", id: "output", label: "Prints the counts", expected: "{'INFO': 2, 'WARN': 1, 'ERROR': 1, 'malformed': 3}\n" },
      ],
    },
    hints: ['Start with counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "malformed": 0}.', "parts = line.split(); skip the line if parts is empty.", 'if len(parts) >= 3 and parts[2] in ("INFO", "WARN", "ERROR"): count it, else count malformed.'],
    answer:
      'def count_levels(path):\n    counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "malformed": 0}\n    with open(path, encoding="utf-8") as handle:\n        for line in handle:\n            parts = line.split()\n            if not parts:\n                continue\n            if len(parts) >= 3 and parts[2] in ("INFO", "WARN", "ERROR"):\n                counts[parts[2]] += 1\n            else:\n                counts["malformed"] += 1\n    return counts\n\n\nprint(count_levels("app.log"))',
    wrong: [
      { code: 'def count_levels(path):\n    counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "malformed": 0}\n    with open(path, encoding="utf-8") as handle:\n        for line in handle:\n            level = line.split()[2]\n            if level in counts:\n                counts[level] += 1\n            else:\n                counts["malformed"] += 1\n    return counts\n\n\nprint(count_levels("app.log"))\n', fails: "program" },
      { code: 'def count_levels(path):\n    counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "malformed": 0}\n    with open(path, encoding="utf-8") as handle:\n        for line in handle:\n            parts = line.split()\n            if not parts:\n                continue\n            level = parts[2].upper() if len(parts) >= 3 else ""\n            if level in ("INFO", "WARN", "ERROR"):\n                counts[level] += 1\n            else:\n                counts["malformed"] += 1\n    return counts\n\n\nprint(count_levels("app.log"))\n', fails: ["app-log", "output"] },
    ],
  },
  {
    ref: "python:bank:py08-05",
    slug: "py08-05",
    module: "files",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: clean a contacts CSV",
    topics: ["csv", "missing fields", "row identity"],
    minutes: 8,
    after: "python:writing-data-exports",
    prompt:
      "This script reads `contacts.csv` and writes `clean_contacts.csv` with names stripped and title-cased and emails stripped and lowercased. It crashes on a row with no email column at all, and the `id` column it writes isn't the contact's real id. Fix both: keep each row's own `id`, and write a missing or empty email as an empty field.",
    expectedOutput: "cleaned 4 contacts\n",
    looksFor: ["Each output row keeps the `id` from its input row.", "A row with a missing email column is written with an empty email, not dropped.", "Every row is kept, in the original order."],
    starter:
      'import csv\n\nwith open("contacts.csv", newline="", encoding="utf-8") as source:\n    rows = list(csv.DictReader(source))\n\nclean = []\nfor index, row in enumerate(rows):\n    clean.append({\n        "id": index,\n        "name": row["name"].strip().title(),\n        "email": row["email"].strip().lower(),\n    })\n\nwith open("clean_contacts.csv", "w", newline="", encoding="utf-8") as target:\n    writer = csv.DictWriter(target, fieldnames=["id", "name", "email"], lineterminator="\\n")\n    writer.writeheader()\n    writer.writerows(clean)\nprint(f"cleaned {len(clean)} contacts")\n',
    files: { "contacts.csv": CONTACTS_CSV },
    task: {
      checks: [
        { kind: "expr", id: "file", label: "clean_contacts.csv has every contact, cleaned, with its own id", show: "the text of clean_contacts.csv", expr: readText("clean_contacts.csv"), expected: s(CLEAN_CONTACTS) },
        { kind: "output", id: "output", label: "Reports the count", expected: "cleaned 4 contacts\n" },
      ],
    },
    hints: ['csv.DictReader fills a missing column with None, and None has no .strip().', '(row.get("email") or "") turns None into "" before stripping.', 'Use row["id"], not the loop position, for the id.'],
    answer:
      'import csv\n\nwith open("contacts.csv", newline="", encoding="utf-8") as source:\n    rows = list(csv.DictReader(source))\n\nclean = []\nfor row in rows:\n    clean.append({\n        "id": row["id"],\n        "name": (row.get("name") or "").strip().title(),\n        "email": (row.get("email") or "").strip().lower(),\n    })\n\nwith open("clean_contacts.csv", "w", newline="", encoding="utf-8") as target:\n    writer = csv.DictWriter(target, fieldnames=["id", "name", "email"], lineterminator="\\n")\n    writer.writeheader()\n    writer.writerows(clean)\nprint(f"cleaned {len(clean)} contacts")',
    wrong: [
      { code: 'import csv\n\nwith open("contacts.csv", newline="", encoding="utf-8") as source:\n    rows = list(csv.DictReader(source))\n\nclean = []\nfor index, row in enumerate(rows, start=1):\n    clean.append({\n        "id": index,\n        "name": row["name"].strip().title(),\n        "email": (row["email"] or "").strip().lower(),\n    })\n\nwith open("clean_contacts.csv", "w", newline="", encoding="utf-8") as target:\n    writer = csv.DictWriter(target, fieldnames=["id", "name", "email"], lineterminator="\\n")\n    writer.writeheader()\n    writer.writerows(clean)\nprint(f"cleaned {len(clean)} contacts")\n', fails: ["file"], why: "Numbering from 1 still invents ids: the real ones are 7, 8, 9 and 12." },
      { code: 'import csv\n\nwith open("contacts.csv", newline="", encoding="utf-8") as source:\n    rows = list(csv.DictReader(source))\n\nclean = []\nfor row in rows:\n    if row["email"] is None:\n        continue\n    clean.append({\n        "id": row["id"],\n        "name": row["name"].strip().title(),\n        "email": row["email"].strip().lower(),\n    })\n\nwith open("clean_contacts.csv", "w", newline="", encoding="utf-8") as target:\n    writer = csv.DictWriter(target, fieldnames=["id", "name", "email"], lineterminator="\\n")\n    writer.writeheader()\n    writer.writerows(clean)\nprint(f"cleaned {len(clean)} contacts")\n', fails: ["file", "output"] },
    ],
  },
  {
    ref: "python:bank:py08-06",
    slug: "py08-06",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Export inventory as JSON",
    topics: ["json.dump", "unicode", "deterministic output"],
    minutes: 6,
    after: "python:writing-data-exports",
    prompt:
      "Write `items` to `inventory.json` so the file is identical on every run and readable by people: UTF-8, keys sorted, indented by 2 spaces, non-English letters written as themselves (`Café`, not `Caf\\u00e9`), and ending with a newline. Then print `wrote 2 items` (using the real count).",
    expectedOutput: "wrote 2 items\n",
    looksFor: ["The file holds the same data as `items`.", "Keys are sorted and indented by 2 spaces.", "`é` appears as itself.", "The file ends with a newline."],
    starter: 'import json\n\nitems = [\n    {"sku": "L-01", "name": "Café lamp", "stock": 4},\n    {"sku": "D-02", "name": "Desk", "stock": 0, "tags": ["oak", "wide"]},\n]\n\n# Write inventory.json.\n',
    task: {
      checks: [
        { kind: "expr", id: "data", label: "inventory.json holds the items", show: 'json.load(open("inventory.json"))', expr: 'import json as _json\nwith open("inventory.json", encoding="utf-8") as _f:\n    result = _json.load(_f) == items', expected: py.bool(true) },
        { kind: "expr", id: "text", label: "The file text is sorted, indented, readable and ends with a newline", show: "the text of inventory.json", expr: readText("inventory.json"), expected: s(INVENTORY_JSON) },
        { kind: "output", id: "output", label: "Reports the count", expected: "wrote 2 items\n" },
        { kind: "variant", id: "v-count", hidden: true, set: { items: py.list(rec([["sku", s("X")]])) }, output: "wrote 1 items\n" },
      ],
    },
    hints: ["json.dump(items, handle, ...) writes to an open file.", "sort_keys=True, indent=2 and ensure_ascii=False give sorted, indented, readable text.", 'Open with encoding="utf-8", and write "\\n" after the dump.'],
    answer:
      'import json\n\nitems = [\n    {"sku": "L-01", "name": "Café lamp", "stock": 4},\n    {"sku": "D-02", "name": "Desk", "stock": 0, "tags": ["oak", "wide"]},\n]\n\nwith open("inventory.json", "w", encoding="utf-8") as handle:\n    json.dump(items, handle, sort_keys=True, indent=2, ensure_ascii=False)\n    handle.write("\\n")\nprint(f"wrote {len(items)} items")',
    alternatives: ['import json\n\nitems = [\n    {"sku": "L-01", "name": "Café lamp", "stock": 4},\n    {"sku": "D-02", "name": "Desk", "stock": 0, "tags": ["oak", "wide"]},\n]\ntext = json.dumps(items, sort_keys=True, indent=2, ensure_ascii=False) + "\\n"\nwith open("inventory.json", "w", encoding="utf-8") as handle:\n    handle.write(text)\nprint("wrote", len(items), "items")\n'],
    wrong: [
      { code: 'import json\n\nitems = [\n    {"sku": "L-01", "name": "Café lamp", "stock": 4},\n    {"sku": "D-02", "name": "Desk", "stock": 0, "tags": ["oak", "wide"]},\n]\nwith open("inventory.json", "w", encoding="utf-8") as handle:\n    json.dump(items, handle, sort_keys=True, indent=2)\n    handle.write("\\n")\nprint(f"wrote {len(items)} items")\n', fails: ["text"] },
      { code: 'import json\n\nitems = [\n    {"sku": "L-01", "name": "Café lamp", "stock": 4},\n    {"sku": "D-02", "name": "Desk", "stock": 0, "tags": ["oak", "wide"]},\n]\nwith open("inventory.json", "w", encoding="utf-8") as handle:\n    json.dump(items, handle, indent=2, ensure_ascii=False)\nprint("wrote 2 items")\n', fails: ["text", "v-count"] },
    ],
  },
  {
    ref: "python:bank:py08-07",
    slug: "py08-07",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Summarize a text file",
    topics: ["text files", "line endings", "whitespace"],
    minutes: 6,
    after: "python:working-with-text-files-safely",
    prompt:
      "`notes.txt` was saved on Windows (lines end in `\\r\\n`). Write `summarize_text(path)` returning `{\"lines\": ..., \"nonblank\": ..., \"words\": ..., \"longest\": ...}`: the number of lines, the number that aren't blank (whitespace-only counts as blank), the number of words, and the longest line with its surrounding whitespace stripped (`None` for an empty file; the first one wins a tie).",
    expectedOutput: "{'lines': 5, 'nonblank': 3, 'words': 6, 'longest': 'eggs and bread'}\n",
    looksFor: ["Lines are counted correctly whatever the line endings, with no phantom empty last line.", "Whitespace-only lines count as blank.", "An empty file gives zeros and `None`."],
    starter: 'def summarize_text(path):\n    pass\n\n\nprint(summarize_text("notes.txt"))\n',
    files: { "notes.txt": NOTES_CRLF },
    task: {
      checks: [
        { kind: "expr", id: "notes", label: "Summarizes notes.txt", show: 'summarize_text("notes.txt")', expr: 'summarize_text("notes.txt")', expected: rec([["lines", i(5)], ["nonblank", i(3)], ["words", i(6)], ["longest", s("eggs and bread")]]) },
        { kind: "expr", id: "empty", label: "An empty file", show: 'summarize_text("empty.txt")', expr: 'with open("empty.txt", "w") as _out:\n    _out.write("")\nresult = summarize_text("empty.txt")', expected: rec([["lines", i(0)], ["nonblank", i(0)], ["words", i(0)], ["longest", py.none]]) },
        { kind: "expr", id: "no-newline", label: "A last line without a newline", hidden: true, expr: 'with open("short.txt", "w") as _out:\n    _out.write("ab cd\\n   xyz   ")\nresult = summarize_text("short.txt")', expected: rec([["lines", i(2)], ["nonblank", i(2)], ["words", i(3)], ["longest", s("ab cd")]]) },
        { kind: "output", id: "output", label: "Prints the summary", expected: "{'lines': 5, 'nonblank': 3, 'words': 6, 'longest': 'eggs and bread'}\n" },
      ],
    },
    hints: ["Opening in text mode turns \\r\\n into \\n for you.", "Iterating over the file gives one line at a time; don't split the whole text on \\n (that adds an empty last item).", "Strip each line; it's blank if the result is empty. len(line.split()) counts its words."],
    answer:
      'def summarize_text(path):\n    lines = nonblank = words = 0\n    longest = None\n    with open(path, encoding="utf-8") as handle:\n        for line in handle:\n            lines += 1\n            text = line.strip()\n            if not text:\n                continue\n            nonblank += 1\n            words += len(text.split())\n            if longest is None or len(text) > len(longest):\n                longest = text\n    return {"lines": lines, "nonblank": nonblank, "words": words, "longest": longest}\n\n\nprint(summarize_text("notes.txt"))',
    wrong: [
      { code: 'def summarize_text(path):\n    with open(path, encoding="utf-8") as handle:\n        all_lines = handle.read().split("\\n")\n    texts = [line.strip() for line in all_lines if line.strip()]\n    longest = max(texts, key=len) if texts else None\n    words = sum(len(t.split()) for t in texts)\n    return {"lines": len(all_lines), "nonblank": len(texts), "words": words, "longest": longest}\n\n\nprint(summarize_text("notes.txt"))\n', fails: ["notes", "empty", "output"] },
      { code: 'def summarize_text(path):\n    lines = nonblank = words = 0\n    longest = None\n    with open(path, encoding="utf-8") as handle:\n        for line in handle:\n            lines += 1\n            if line == "\\n":\n                continue\n            nonblank += 1\n            words += len(line.split())\n            if longest is None or len(line.strip()) > len(longest):\n                longest = line.strip()\n    return {"lines": lines, "nonblank": nonblank, "words": words, "longest": longest}\n\n\nprint(summarize_text("notes.txt"))\n', fails: ["notes", "output"] },
    ],
  },
  {
    ref: "python:bank:py08-08",
    slug: "py08-08",
    module: "files",
    kind: "debug",
    difficulty: "medium",
    title: "Debug: compare two CSV files",
    topics: ["csv", "sets", "keys"],
    minutes: 8,
    after: "python:working-with-file-paths-and-multiple-files",
    prompt:
      "`compare_ids(old_path, new_path)` should report, by the `id` column, which ids were **inserted** (only in the new file) and which are **missing** (only in the old file), plus ids that appear more than once in the new file as **duplicates**. All three are lists of id strings in numeric order. It compares whole lines, so a row whose price changed shows up as both inserted and missing. Fix it.",
    expectedOutput: "{'inserted': ['4'], 'missing': ['2'], 'duplicates': ['4']}\n",
    looksFor: ["Rows are matched by `id`, so a changed price is neither inserted nor missing.", "Ids are in numeric order (`'9'` before `'11'`).", "Ids repeated in the new file are listed once in `duplicates`."],
    starter:
      'import csv\n\n\ndef compare_ids(old_path, new_path):\n    with open(old_path, encoding="utf-8") as handle:\n        old = set(handle.read().splitlines()[1:])\n    with open(new_path, encoding="utf-8") as handle:\n        new = set(handle.read().splitlines()[1:])\n    return {"inserted": sorted(new - old), "missing": sorted(old - new), "duplicates": []}\n\n\nprint(compare_ids("old.csv", "new.csv"))\n',
    files: { "old.csv": OLD_CSV, "new.csv": NEW_CSV },
    task: {
      checks: [
        { kind: "expr", id: "compare", label: "Compares old.csv and new.csv by id", show: 'compare_ids("old.csv", "new.csv")', expr: 'compare_ids("old.csv", "new.csv")', expected: rec([["inserted", strs("4")], ["missing", strs("2")], ["duplicates", strs("4")]]) },
        { kind: "expr", id: "same", label: "A file compared with itself has no differences", show: 'compare_ids("old.csv", "old.csv")', expr: 'compare_ids("old.csv", "old.csv")', expected: rec([["inserted", py.list()], ["missing", py.list()], ["duplicates", py.list()]]) },
        {
          kind: "expr",
          id: "numeric",
          label: "Ids sort as numbers",
          hidden: true,
          expr: 'with open("a.csv", "w") as _out:\n    _out.write("id,name\\n2,x\\n10,y\\n")\nwith open("b.csv", "w") as _out:\n    _out.write("id,name\\n10,y\\n11,z\\n9,w\\n11,z\\n")\nresult = compare_ids("a.csv", "b.csv")',
          expected: rec([["inserted", strs("9", "11")], ["missing", strs("2")], ["duplicates", strs("11")]]),
          tip: "sorted(ids, key=int) sorts id strings by their number.",
        },
        { kind: "output", id: "output", label: "Prints the comparison", expected: "{'inserted': ['4'], 'missing': ['2'], 'duplicates': ['4']}\n" },
      ],
    },
    hints: ['Read each file with csv.DictReader and collect row["id"] values.', "Keep the new ids in a list too, so you can count repeats: ids seen before go into a duplicates set.", "Set differences give inserted and missing; sort each with key=int."],
    answer:
      'import csv\n\n\ndef read_ids(path):\n    with open(path, newline="", encoding="utf-8") as handle:\n        return [row["id"] for row in csv.DictReader(handle)]\n\n\ndef compare_ids(old_path, new_path):\n    old = set(read_ids(old_path))\n    new_ids = read_ids(new_path)\n    seen = set()\n    duplicates = set()\n    for row_id in new_ids:\n        if row_id in seen:\n            duplicates.add(row_id)\n        seen.add(row_id)\n    return {\n        "inserted": sorted(seen - old, key=int),\n        "missing": sorted(old - seen, key=int),\n        "duplicates": sorted(duplicates, key=int),\n    }\n\n\nprint(compare_ids("old.csv", "new.csv"))',
    wrong: [
      { code: 'import csv\n\n\ndef read_ids(path):\n    with open(path, newline="", encoding="utf-8") as handle:\n        return [row["id"] for row in csv.DictReader(handle)]\n\n\ndef compare_ids(old_path, new_path):\n    old = set(read_ids(old_path))\n    new_ids = read_ids(new_path)\n    new = set(new_ids)\n    duplicates = sorted({i for i in new_ids if new_ids.count(i) > 1})\n    return {"inserted": sorted(new - old), "missing": sorted(old - new), "duplicates": duplicates}\n\n\nprint(compare_ids("old.csv", "new.csv"))\n', fails: ["numeric"], why: "Sorted as text, '11' comes before '9'." },
      { code: 'import csv\n\n\ndef compare_ids(old_path, new_path):\n    with open(old_path, newline="", encoding="utf-8") as handle:\n        old = {row["id"] for row in csv.DictReader(handle)}\n    with open(new_path, newline="", encoding="utf-8") as handle:\n        new = {row["id"] for row in csv.DictReader(handle)}\n    return {"inserted": sorted(new - old, key=int), "missing": sorted(old - new, key=int), "duplicates": []}\n\n\nprint(compare_ids("old.csv", "new.csv"))\n', fails: ["compare", "numeric", "output"] },
    ],
  },
  {
    ref: "python:bank:py08-09",
    slug: "py08-09",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Extract order IDs with a regex",
    topics: ["re", "word boundaries", "false positives"],
    minutes: 6,
    after: "python:regular-expressions-for-validation",
    prompt:
      "An order ID is `ORD-` followed by **exactly four** digits, as a whole word: not part of a longer number (`ORD-12345`), not glued to other letters (`XORD-5555`), and uppercase only. Write `extract_ids(text)` returning the IDs found, each once, in the order they first appear.",
    expectedOutput: "['ORD-1234', 'ORD-0042']\n",
    looksFor: ["Only whole `ORD-dddd` words match.", "Longer numbers and prefixed or lowercase IDs are ignored.", "Each ID appears once, in first-seen order."],
    starter: 'import re\n\n\ndef extract_ids(text):\n    pass\n\n\nprint(extract_ids("Refund ORD-1234 and ORD-0042; ignore ORD-12345, XORD-5555, ord-7777. Again ORD-1234."))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "extract_ids",
          cases: [
            { args: [s("Refund ORD-1234 and ORD-0042; ignore ORD-12345, XORD-5555, ord-7777. Again ORD-1234.")], expected: strs("ORD-1234", "ORD-0042") },
            { args: [s("")], expected: py.list() },
            { args: [s("ORD-9999")], expected: strs("ORD-9999") },
            { args: [s("(ORD-0001)\nORD-0002,ORD-0001")], expected: strs("ORD-0001", "ORD-0002"), hidden: true },
            { args: [s("ORD-123 ORD-1234567 ORDER-1234")], expected: py.list(), hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "['ORD-1234', 'ORD-0042']\n" },
      ],
    },
    hints: ['\\b marks a word boundary: r"\\bORD-\\d{4}\\b".', "re.findall(pattern, text) returns every match in order.", "Drop repeats while keeping order: append only if not already in the result."],
    answer:
      'import re\n\nORDER_ID = re.compile(r"\\bORD-\\d{4}\\b")\n\n\ndef extract_ids(text):\n    found = []\n    for match in ORDER_ID.findall(text):\n        if match not in found:\n            found.append(match)\n    return found\n\n\nprint(extract_ids("Refund ORD-1234 and ORD-0042; ignore ORD-12345, XORD-5555, ord-7777. Again ORD-1234."))',
    wrong: [
      { code: 'import re\n\n\ndef extract_ids(text):\n    found = []\n    for match in re.findall(r"ORD-\\d{4}", text):\n        if match not in found:\n            found.append(match)\n    return found\n\n\nprint(extract_ids("Refund ORD-1234 and ORD-0042; ignore ORD-12345, XORD-5555, ord-7777. Again ORD-1234."))\n', fails: ["fn", "output"] },
      { code: 'import re\n\n\ndef extract_ids(text):\n    return re.findall(r"\\bORD-\\d{4}\\b", text)\n\n\nprint(extract_ids("Refund ORD-1234 and ORD-0042; ignore ORD-12345, XORD-5555, ord-7777. Again ORD-1234."))\n', fails: ["fn", "output"] },
    ],
  },
  {
    ref: "python:bank:py08-10",
    slug: "py08-10",
    module: "files",
    kind: "write",
    difficulty: "medium",
    title: "Validate an offline API response",
    topics: ["API responses", "nested dicts", "partial results"],
    minutes: 8,
    after: "python:consuming-api-shaped-responses-offline",
    prompt:
      "Write `items_from(response)` for a saved API response shaped like `{\"status\": \"ok\", \"data\": {\"items\": [...]}, \"next\": ...}`.\n\n- If `status` isn't `\"ok\"`, raise `ValueError` (include the response's `error` text if it has one).\n- `data` or `items` may be missing or `None`: treat that as no items.\n- Keep only items that are dictionaries with an `id`; count the rest as `skipped`.\n- Return `{\"items\": [...], \"skipped\": n, \"has_more\": ...}`, where `has_more` is whether `next` is present and not `None`.",
    expectedOutput: "{'items': [{'id': 1}, {'id': 3, 'name': 'rug'}], 'skipped': 2, 'has_more': True}\n",
    looksFor: ["An error status raises `ValueError`.", "Missing or `None` data gives no items, not a crash.", "Items without an `id`, or that aren't dictionaries, are skipped and counted.", "`has_more` reflects `next`."],
    starter:
      'def items_from(response):\n    pass\n\n\nresponse = {"status": "ok", "data": {"items": [{"id": 1}, {"name": "lamp"}, {"id": 3, "name": "rug"}, "oops"]}, "next": "page=2"}\nprint(items_from(response))\n',
    task: {
      checks: [
        {
          kind: "function",
          id: "fn",
          name: "items_from",
          cases: [
            {
              args: [rec([["status", s("ok")], ["data", rec([["items", py.list(rec([["id", i(1)]]), rec([["name", s("lamp")]]), rec([["id", i(3)], ["name", s("rug")]]), s("oops"))]])], ["next", s("page=2")]])],
              expected: rec([["items", py.list(rec([["id", i(1)]]), rec([["id", i(3)], ["name", s("rug")]]))], ["skipped", i(2)], ["has_more", py.bool(true)]]),
            },
            { args: [rec([["status", s("ok")], ["data", py.none]])], expected: rec([["items", py.list()], ["skipped", i(0)], ["has_more", py.bool(false)]]) },
            { args: [rec([["status", s("ok")], ["data", rec([])], ["next", py.none]])], expected: rec([["items", py.list()], ["skipped", i(0)], ["has_more", py.bool(false)]]) },
            { args: [rec([["status", s("ok")], ["data", rec([["items", py.none]])]])], expected: rec([["items", py.list()], ["skipped", i(0)], ["has_more", py.bool(false)]]), hidden: true },
            { args: [rec([["status", s("ok")]])], expected: rec([["items", py.list()], ["skipped", i(0)], ["has_more", py.bool(false)]]), hidden: true },
          ],
        },
        {
          kind: "function",
          id: "errors",
          label: "An error response raises ValueError",
          name: "items_from",
          cases: [
            { args: [rec([["status", s("error")], ["error", s("rate limited")]])], raises: "ValueError" },
            { args: [rec([["status", s("error")]])], raises: "ValueError", hidden: true },
          ],
        },
        { kind: "output", id: "output", label: "Prints the demo", expected: "{'items': [{'id': 1}, {'id': 3, 'name': 'rug'}], 'skipped': 2, 'has_more': True}\n" },
      ],
    },
    hints: ['Check status first: if response.get("status") != "ok": raise ValueError(...).', 'data = response.get("data") or {} and items = data.get("items") or [] handle missing and None.', 'isinstance(item, dict) and "id" in item decides whether to keep an item.'],
    answer:
      'def items_from(response):\n    if response.get("status") != "ok":\n        raise ValueError(f"API error: {response.get(\'error\', \'unknown\')}")\n    data = response.get("data") or {}\n    kept = []\n    skipped = 0\n    for item in data.get("items") or []:\n        if isinstance(item, dict) and "id" in item:\n            kept.append(item)\n        else:\n            skipped += 1\n    return {"items": kept, "skipped": skipped, "has_more": response.get("next") is not None}\n\n\nresponse = {"status": "ok", "data": {"items": [{"id": 1}, {"name": "lamp"}, {"id": 3, "name": "rug"}, "oops"]}, "next": "page=2"}\nprint(items_from(response))',
    wrong: [
      { code: 'def items_from(response):\n    if response["status"] != "ok":\n        raise ValueError("API error")\n    kept = []\n    skipped = 0\n    for item in response["data"]["items"]:\n        if isinstance(item, dict) and "id" in item:\n            kept.append(item)\n        else:\n            skipped += 1\n    return {"items": kept, "skipped": skipped, "has_more": "next" in response}\n\n\nresponse = {"status": "ok", "data": {"items": [{"id": 1}, {"name": "lamp"}, {"id": 3, "name": "rug"}, "oops"]}, "next": "page=2"}\nprint(items_from(response))\n', fails: ["fn"] },
      { code: 'def items_from(response):\n    data = response.get("data") or {}\n    kept = []\n    skipped = 0\n    for item in data.get("items") or []:\n        if isinstance(item, dict) and "id" in item:\n            kept.append(item)\n        else:\n            skipped += 1\n    return {"items": kept, "skipped": skipped, "has_more": response.get("next") is not None}\n\n\nresponse = {"status": "ok", "data": {"items": [{"id": 1}, {"name": "lamp"}, {"id": 3, "name": "rug"}, "oops"]}, "next": "page=2"}\nprint(items_from(response))\n', fails: ["errors"] },
    ],
  },
];
