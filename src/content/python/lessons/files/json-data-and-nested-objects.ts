import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const f = py.float;
const i = py.int;

const CUSTOMERS = `{
  "exported_at": "2026-10-14T09:00:00Z",
  "customers": [
    {"id": 1, "name": "Ada Lovelace", "email": "ada@example.com", "tags": ["vip", "newsletter"], "address": {"city": "London", "country": "UK"}, "orders": [{"id": 101, "total": 40.0}, {"id": 103, "total": 22.5}]},
    {"id": 2, "name": "Ben Okafor", "email": null, "tags": [], "address": {"city": "Lagos", "country": "NG"}, "orders": []},
    {"id": 3, "name": "Chen Wei", "email": "chen@example.cn", "tags": ["newsletter"], "address": {"city": "Shanghai", "country": "CN"}, "orders": [{"id": 104, "total": 60.0}]}
  ]
}
`;

export const jsonDataAndNestedObjects: PyLesson = {
  slug: "json-data-and-nested-objects",
  ref: "python:json-data-and-nested-objects",
  module: "files",
  number: 3,
  title: "JSON data and nested objects",
  level: "intermediate",
  summary:
    "Turn JSON text into Python dictionaries and lists and back again with the `json` module, read files of nested data one level at a time, and write JSON that's readable and stable.",
  files: { "customers.json": CUSTOMERS },

  sections: [
    {
      label: "JSON and Python",
      blocks: [
        {
          kind: "p",
          text: "**JSON** is the most common text format for structured data: web APIs, configuration files and exports all use it. It maps directly onto Python: a JSON **object** `{…}` becomes a `dict`, an **array** `[…]` a `list`, strings stay strings, numbers become `int` or `float`, `true`/`false` become `True`/`False`, and `null` becomes `None`.",
        },
        { kind: "code", code: 'import json\n\ndata = json.loads(\'{"name": "Ada", "tags": ["vip"], "email": null}\')\nprint(data["tags"][0], data["email"])   # vip None\ntext = json.dumps(data)                    # back to a JSON string' },
        {
          kind: "p",
          text: "`json.loads(text)` parses a string and `json.dumps(value)` produces one. For files, `json.load(f)` reads from an open file and `json.dump(value, f)` writes to one. Invalid JSON raises `json.JSONDecodeError` (a kind of `ValueError`), with the line and column of the problem.",
        },
      ],
    },
    {
      label: "navigating nested data",
      blocks: [
        {
          kind: "p",
          text: "Real JSON is nested: a list of customers, each with an address dictionary and a list of orders. Go one level at a time: `data[\"customers\"]` is a list, `[0]` is the first customer (a dict), `[\"address\"]` is a dict, `[\"city\"]` is a string. When you're lost, print `type()` or the keys at each level.",
        },
        {
          kind: "p",
          text: "Data from outside is often incomplete. Use `.get()` with a default for fields that may be missing, and remember `null` arrives as `None`, which is different from a missing key.",
        },
      ],
    },
    {
      label: "writing JSON people can read",
      blocks: [
        {
          kind: "p",
          text: "`json.dumps(value, indent=2)` puts each item on its own line. `sort_keys=True` writes dictionary keys in alphabetical order, so the same data always produces the same text, which makes files easy to compare. `ensure_ascii=False` keeps letters like `é` as they are instead of escaping them as `\\u00e9`.",
        },
      ],
    },
  ],

  example: {
    caption: "Reading customers.json (see the Files list) and summarising it. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import json\n\nwith open("customers.json", encoding="utf-8") as f:\n    data = json.load(f)\n\nprint("Exported:", data["exported_at"])\nfor customer in data["customers"]:\n    city = customer["address"]["city"]\n    spent = sum(order["total"] for order in customer["orders"])\n    email = customer["email"] or "(no email)"\n    print(f"{customer[\'name\']:<14} {city:<9} {spent:7.2f}  {email}")',
  },

  walkthrough: [
    {
      title: "JSON types become Python types",
      text: "`true` and `null` come back as `True` and `None`; the array becomes a list.",
      code: 'import json\ndata = json.loads(\'{"active": true, "score": 9.5, "tags": ["a", "b"], "note": null}\')\nfor key, value in data.items():\n    print(key, repr(value), type(value).__name__)',
    },
    {
      title: "One level at a time",
      text: "Each step goes one level deeper; printing the type confirms where you are.",
      code: 'import json\nwith open("customers.json", encoding="utf-8") as f:\n    data = json.load(f)\ncustomers = data["customers"]\nfirst = customers[0]\nprint(type(customers).__name__, len(customers))\nprint(sorted(first.keys()))\nprint(first["address"]["country"], first["orders"][1]["total"])',
    },
    {
      title: "Missing versus null",
      text: "Ben's email is `null` (present but empty); nobody has a `phone` key at all. `.get()` handles both.",
      code: 'import json\nwith open("customers.json", encoding="utf-8") as f:\n    customers = json.load(f)["customers"]\nfor c in customers:\n    print(c["name"], repr(c.get("email")), repr(c.get("phone", "none")))',
    },
    {
      title: "Writing readable, stable JSON",
      text: "`indent` and `sort_keys` make the output easy to read and identical every time; `ensure_ascii=False` keeps the é.",
      code: 'import json\nrecord = {"name": "Zoë", "city": "Montréal", "id": 7}\nprint(json.dumps(record))\nprint(json.dumps(record, indent=2, sort_keys=True, ensure_ascii=False))',
    },
  ],

  mistakes: [
    {
      title: "Single quotes aren't JSON",
      text: "JSON strings must use double quotes. Python-style single quotes make it invalid: `JSONDecodeError`.",
      code: "import json\njson.loads(\"{'name': 'Ada'}\")",
      raises: "JSONDecodeError",
      fix: 'Use double quotes in JSON: `{"name": "Ada"}`. If the text came from `str(some_dict)`, produce it with `json.dumps` instead.',
    },
    {
      title: "Indexing a level that's a list",
      text: "`data[\"customers\"]` is a list, so it needs a position, not a field name: `TypeError`.",
      code: 'import json\nwith open("customers.json", encoding="utf-8") as f:\n    data = json.load(f)\nprint(data["customers"]["name"])',
      raises: "TypeError",
      fix: 'Pick an item first, `data["customers"][0]["name"]`, or loop over the list.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Summarise customers from JSON",
      prompt:
        "Write `customer_summary(path)`, which loads a customers file shaped like `customers.json` and returns a list of `(name, city, total_spent)` tuples, one per customer, in file order. `total_spent` is the sum of the customer's order totals (0 when they have no orders), rounded to 2 places.",
      looksFor: [
        "One tuple per customer, in the order of the file.",
        "The city comes from the nested `address`; the total adds up the nested `orders`.",
        "A customer with no orders has a total of `0`.",
      ],
      starter: 'import json\n\n\ndef customer_summary(path):\n    # Return [(name, city, total_spent), ...].\n    pass\n\n\nprint(customer_summary("customers.json"))\n',
      task: {
        files: { "two.json": '{"customers": [{"name": "Zoë", "address": {"city": "Montréal"}, "orders": [{"total": 0.1}, {"total": 0.2}]}, {"name": "Yan", "address": {"city": "Oslo"}, "orders": []}]}' },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "customer_summary",
            // Exact floats: the totals must be rounded to 2 places, so 0.1 + 0.2 must come back as exactly 0.3.
            compare: { numbers: "int-float-equal", float: "exact" },
            cases: [
              { args: [s("customers.json")], expected: py.list(py.tuple(s("Ada Lovelace"), s("London"), f(62.5)), py.tuple(s("Ben Okafor"), s("Lagos"), i(0)), py.tuple(s("Chen Wei"), s("Shanghai"), f(60))) },
              { args: [s("two.json")], expected: py.list(py.tuple(s("Zoë"), s("Montréal"), f(0.3)), py.tuple(s("Yan"), s("Oslo"), i(0))), hidden: true },
            ],
            tip: 'For each customer: c["address"]["city"], and round(sum(o["total"] for o in c["orders"]), 2).',
          },
        ],
      },
      hints: [
        'data = json.load(f), then loop over data["customers"].',
        'city = customer["address"]["city"]; spent = sum(order["total"] for order in customer["orders"]).',
        "Append (customer[\"name\"], city, round(spent, 2)) to a result list and return it.",
      ],
      answer: 'import json\n\n\ndef customer_summary(path):\n    """Return [(name, city, total_spent)] for each customer in the file."""\n    with open(path, encoding="utf-8") as f:\n        data = json.load(f)\n    summary = []\n    for customer in data["customers"]:\n        spent = sum(order["total"] for order in customer["orders"])\n        summary.append((customer["name"], customer["address"]["city"], round(spent, 2)))\n    return summary\n\n\nprint(customer_summary("customers.json"))',
      wrong: [
        { code: 'import json\n\ndef customer_summary(path):\n    with open(path, encoding="utf-8") as f:\n        data = json.load(f)\n    return [(c["name"], c["address"]["city"], sum(o["total"] for o in c["orders"])) for c in data["customers"]]\n', fails: ["fn"], why: "not rounded: 0.1 + 0.2" },
        { code: 'import json\n\ndef customer_summary(path):\n    with open(path, encoding="utf-8") as f:\n        data = json.load(f)\n    return [(c["name"], c["address"]["city"], round(sum(o["total"] for o in c["orders"]), 2)) for c in data["customers"] if c["orders"]]\n', fails: ["fn"], why: "drops customers without orders" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write a stable JSON export",
      prompt:
        "Write `export_mailing_list(source, target)`: read a customers file, and write to `target` a JSON object with one key, `\"subscribers\"`, whose value is a list of `{\"email\": …, \"name\": …}` objects for customers who have the `newsletter` tag **and** an email (not `null`). Keep file order. Write it with `indent=2`, `sort_keys=True` and `ensure_ascii=False`, and return the number of subscribers.",
      looksFor: [
        "Only customers tagged `newsletter` with an email are included, in file order.",
        "The file is valid JSON with sorted keys and 2-space indentation.",
        "The function returns how many subscribers were written.",
      ],
      starter: 'import json\n\n\ndef export_mailing_list(source, target):\n    # Write {"subscribers": [...]} to target; return the count.\n    pass\n\n\nprint(export_mailing_list("customers.json", "mailing_list.json"))\n',
      task: {
        files: { "tagged.json": '{"customers": [{"name": "Kim", "email": "kim@example.com", "tags": []}, {"name": "Lee", "email": "lee@example.com", "tags": ["newsletter"]}, {"name": "Max", "email": null, "tags": ["newsletter"]}]}' },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "export_mailing_list",
            cases: [
              { args: [s("customers.json"), s("list_a.json")], expected: i(2) },
              { args: [s("tagged.json"), s("list_b.json")], expected: i(1), hidden: true },
            ],
            tip: 'Count only customers with the newsletter tag and an email that isn\'t None.',
          },
          {
            kind: "expr",
            id: "content",
            label: "The file has the right subscribers",
            show: 'json.load(open("mailing_list.json"))',
            expr: 'import json\nexport_mailing_list("customers.json", "check.json")\nwith open("check.json", encoding="utf-8") as _f:\n    result = json.load(_f)',
            expected: py.dict([[s("subscribers"), py.list(py.dict([[s("email"), s("ada@example.com")], [s("name"), s("Ada Lovelace")]]), py.dict([[s("email"), s("chen@example.cn")], [s("name"), s("Chen Wei")]]))]]),
            tip: 'Keep customers where "newsletter" in c["tags"] and c["email"] is not None.',
          },
          {
            kind: "expr",
            id: "format",
            label: "Written with indent=2 and sorted keys",
            show: 'open("mailing_list.json").read()',
            expr: 'export_mailing_list("customers.json", "check2.json")\nwith open("check2.json", encoding="utf-8") as _f:\n    result = _f.read().startswith(\'{\\n  "subscribers": [\\n    {\\n      "email": "ada@example.com",\\n      "name": "Ada Lovelace"\\n    }\')',
            expected: py.bool(true),
            tip: "json.dump(data, f, indent=2, sort_keys=True, ensure_ascii=False).",
          },
        ],
      },
      hints: [
        "Load the source, then build subscribers = [{\"email\": c[\"email\"], \"name\": c[\"name\"]} for c in customers if …].",
        'The condition: "newsletter" in c["tags"] and c["email"] is not None.',
        'with open(target, "w", encoding="utf-8") as f: json.dump({"subscribers": subscribers}, f, indent=2, sort_keys=True, ensure_ascii=False). Return len(subscribers).',
      ],
      answer: 'import json\n\n\ndef export_mailing_list(source, target):\n    """Write newsletter subscribers with an email to target as JSON; return how many."""\n    with open(source, encoding="utf-8") as f:\n        customers = json.load(f)["customers"]\n    subscribers = [\n        {"email": c["email"], "name": c["name"]}\n        for c in customers\n        if "newsletter" in c["tags"] and c["email"] is not None\n    ]\n    with open(target, "w", encoding="utf-8") as f:\n        json.dump({"subscribers": subscribers}, f, indent=2, sort_keys=True, ensure_ascii=False)\n    return len(subscribers)\n\n\nprint(export_mailing_list("customers.json", "mailing_list.json"))',
      wrong: [
        { code: 'import json\n\ndef export_mailing_list(source, target):\n    with open(source, encoding="utf-8") as f:\n        customers = json.load(f)["customers"]\n    subs = [{"name": c["name"], "email": c["email"]} for c in customers if "newsletter" in c["tags"]]\n    with open(target, "w", encoding="utf-8") as f:\n        json.dump({"subscribers": subs}, f)\n    return len(subs)\n\nprint(export_mailing_list("customers.json", "mailing_list.json"))\n', fails: ["fn", "format"], why: "no indent or sorted keys, and subscribers without an email" },
        { code: 'import json\n\ndef export_mailing_list(source, target):\n    with open(source, encoding="utf-8") as f:\n        customers = json.load(f)["customers"]\n    subs = [{"email": c["email"], "name": c["name"]} for c in customers if c["email"]]\n    with open(target, "w", encoding="utf-8") as f:\n        json.dump({"subscribers": subs}, f, indent=2, sort_keys=True, ensure_ascii=False)\n    return len(subs)\n\nprint(export_mailing_list("customers.json", "mailing_list.json"))\n', fails: ["fn"], why: "ignores the newsletter tag" },
      ],
    },
  ],

  quiz: [
    {
      id: "types",
      prompt: "What does `json.loads('{\"ok\": true, \"items\": [], \"next\": null}')` return?",
      options: [
        { text: "`{'ok': True, 'items': [], 'next': None}`", correct: true, why: "`true` → `True`, `[]` → an empty list, `null` → `None`." },
        { text: "`{'ok': 'true', 'items': '[]', 'next': 'null'}`", why: "JSON values are parsed into real Python values, not left as text." },
        { text: "A JSON string", why: "`loads` turns JSON text into Python objects; `dumps` goes the other way." },
        { text: "An error, because the list is empty", why: "Empty arrays and objects are valid JSON." },
      ],
    },
    {
      id: "sort-keys",
      prompt: "Why write exports with `sort_keys=True`?",
      options: [
        { text: "The same data always produces exactly the same text, so files can be compared", correct: true, why: "Stable output makes changes visible in diffs and tests." },
        { text: "JSON requires sorted keys", why: "JSON allows keys in any order; sorting is a choice for stability." },
        { text: "It makes the file smaller", why: "Sorting doesn't change the size; `indent` makes it larger." },
        { text: "Python can't read unsorted JSON", why: "`json.load` reads keys in any order." },
      ],
    },
  ],

  outcomes: [
    "Convert between JSON text and Python with `json.loads`, `json.dumps`, `json.load` and `json.dump`.",
    "Map JSON types onto Python types, including `null` → `None`.",
    "Navigate nested data one level at a time, using `.get()` for optional fields.",
    "Write readable, stable JSON with `indent`, `sort_keys` and `ensure_ascii=False`.",
  ],
};
