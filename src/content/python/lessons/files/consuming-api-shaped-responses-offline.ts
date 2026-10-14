import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

const PAGE_1 = `{
  "status": "ok",
  "page": 1,
  "next_page": "api/orders_page2.json",
  "data": [
    {"id": "ORD-1", "customer": {"id": 7, "name": "Ada"}, "total": {"amount": 40.0, "currency": "GBP"}, "items": 2},
    {"id": "ORD-2", "customer": {"id": 9, "name": "Ben"}, "total": {"amount": 15.5, "currency": "GBP"}, "items": 1}
  ]
}
`;
const PAGE_2 = `{
  "status": "ok",
  "page": 2,
  "next_page": "api/orders_page3.json",
  "data": [
    {"id": "ORD-3", "customer": {"id": 7, "name": "Ada"}, "total": null, "items": 3},
    {"id": "ORD-4", "customer": null, "total": {"amount": 60.0, "currency": "GBP"}, "items": 1}
  ]
}
`;
const PAGE_3 = `{
  "status": "ok",
  "page": 3,
  "next_page": null,
  "data": [
    {"id": "ORD-5", "customer": {"id": 9, "name": "Ben"}, "total": {"amount": 9.99, "currency": "EUR"}, "items": 1}
  ]
}
`;
const ERROR = `{
  "status": "error",
  "error": {"code": "rate_limited", "message": "Too many requests, retry later"}
}
`;

export const consumingApiShapedResponsesOffline: PyLesson = {
  slug: "consuming-api-shaped-responses-offline",
  ref: "python:consuming-api-shaped-responses-offline",
  module: "files",
  number: 8,
  title: "Consuming API-shaped responses offline",
  level: "intermediate",
  summary:
    "Work with data shaped like a web API's responses, saved as JSON files so everything runs offline: check the status before reading data, cope with missing and null fields, follow pagination until there are no more pages, and flatten nested records into rows.",
  files: { "api/orders_page1.json": PAGE_1, "api/orders_page2.json": PAGE_2, "api/orders_page3.json": PAGE_3, "api/error.json": ERROR },

  sections: [
    {
      label: "API responses are JSON with a contract",
      blocks: [
        {
          kind: "p",
          text: "Web APIs answer with JSON that follows a documented shape: usually a **status**, the **data** (often a list of records), and sometimes an **error** object or a pointer to the **next page**. In this lesson the responses are saved files in an `api/` folder (see the Files list), so the code is exactly what you'd write after downloading them, without needing a network or keys.",
        },
        {
          kind: "p",
          text: "Check the status **first**. An error response has no `data` at all, and reading `response[\"data\"]` from it fails with a confusing `KeyError` far from the real problem. Raise a clear error that includes the API's own message instead.",
        },
      ],
    },
    {
      label: "missing, null and nested",
      blocks: [
        {
          kind: "p",
          text: "API records are uneven: an optional object may be `null` (`None`), or the key may be missing entirely. Read one level at a time, and treat `None` at each level deliberately: `customer = order.get(\"customer\") or {}` gives an empty dictionary to read from when there's no customer.",
        },
        {
          kind: "p",
          text: "Analysis is easier on **flat rows**: one dictionary per record with simple values, such as `{\"id\": \"ORD-1\", \"customer\": \"Ada\", \"amount\": 40.0, \"currency\": \"GBP\"}`. Flatten once, at the edge of your program, and the rest of the code no longer has to know the API's nesting.",
        },
      ],
    },
    {
      label: "pagination",
      blocks: [
        {
          kind: "p",
          text: "APIs return large results a **page** at a time. Each response says where the next page is (`next_page` here), and the last says `null`. Loop until there's no next page, collecting records as you go. Guard against a page pointing back to one you've already read, which would otherwise loop forever.",
        },
      ],
    },
  ],

  example: {
    caption: "Reading every page and flattening the orders. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import json\n\npath = "api/orders_page1.json"\nrows = []\nwhile path is not None:\n    with open(path, encoding="utf-8") as f:\n        response = json.load(f)\n    if response["status"] != "ok":\n        raise RuntimeError(response["error"]["message"])\n    for order in response["data"]:\n        customer = order.get("customer") or {}\n        total = order.get("total") or {}\n        rows.append({"id": order["id"], "customer": customer.get("name"), "amount": total.get("amount")})\n    print(f"page {response[\'page\']}: {len(response[\'data\'])} orders")\n    path = response.get("next_page")\n\nfor row in rows:\n    print(row)',
  },

  walkthrough: [
    {
      title: "Check the status before the data",
      text: "The error response has no `data` key. Checking `status` first turns that into a clear message.",
      code: 'import json\nwith open("api/error.json", encoding="utf-8") as f:\n    response = json.load(f)\nprint(response["status"], "data" in response)\nif response["status"] != "ok":\n    print("API error:", response["error"]["code"], "-", response["error"]["message"])',
    },
    {
      title: "null at one level",
      text: "ORD-3 has no total and ORD-4 no customer. `or {}` gives an empty dictionary to call `.get()` on.",
      code: 'import json\nwith open("api/orders_page2.json", encoding="utf-8") as f:\n    orders = json.load(f)["data"]\nfor order in orders:\n    customer = order.get("customer") or {}\n    total = order.get("total") or {}\n    print(order["id"], customer.get("name", "unknown"), total.get("amount"))',
    },
    {
      title: "Following next_page",
      text: "The loop reads pages until `next_page` is `null`. The `seen` set stops a page that points backwards from looping forever.",
      code: 'import json\npath = "api/orders_page1.json"\nseen = set()\nwhile path is not None and path not in seen:\n    seen.add(path)\n    with open(path, encoding="utf-8") as f:\n        response = json.load(f)\n    print(response["page"], [o["id"] for o in response["data"]])\n    path = response.get("next_page")',
    },
    {
      title: "Flat rows are easy to analyse",
      text: "Once flattened, ordinary tools work: here, revenue per currency, skipping orders without a total.",
      code: 'rows = [\n    {"id": "ORD-1", "amount": 40.0, "currency": "GBP"},\n    {"id": "ORD-3", "amount": None, "currency": None},\n    {"id": "ORD-5", "amount": 9.99, "currency": "EUR"},\n]\nby_currency = {}\nfor row in rows:\n    if row["amount"] is not None:\n        by_currency[row["currency"]] = by_currency.get(row["currency"], 0) + row["amount"]\nprint(by_currency)',
    },
  ],

  mistakes: [
    {
      title: "Reading data from an error response",
      text: "The status says error, but the code reads `data` anyway: `KeyError: 'data'`, which hides the API's real message.",
      code: 'import json\nwith open("api/error.json", encoding="utf-8") as f:\n    response = json.load(f)\nprint(len(response["data"]))',
      raises: "KeyError",
      fix: 'Check `response["status"]` first, and raise an error with `response["error"]["message"]`.',
    },
    {
      title: "Reading through a null object",
      text: "ORD-4's customer is `null`, so `order[\"customer\"][\"name\"]` is subscripting `None`: `TypeError`.",
      code: 'import json\nwith open("api/orders_page2.json", encoding="utf-8") as f:\n    for order in json.load(f)["data"]:\n        print(order["customer"]["name"])',
      raises: "TypeError",
      fix: 'Treat `None` at each level: `(order.get("customer") or {}).get("name")`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Flatten one response page",
      prompt:
        "Write `flatten_page(path)`, which loads one response file. If its status isn't `\"ok\"`, raise `RuntimeError` with the API's error message. Otherwise return a list of flat rows, one per order: `{\"id\", \"customer\", \"amount\", \"currency\"}`, where `customer` is the customer's name and the others come from `total`. Use `None` for any value that's missing because an object is `null`.",
      looksFor: [
        "Each order becomes `{\"id\", \"customer\", \"amount\", \"currency\"}` with simple values.",
        "A `null` customer or total gives `None` for those fields instead of an error.",
        "An error response raises `RuntimeError` with the API's message.",
      ],
      starter: 'import json\n\n\ndef flatten_page(path):\n    # Return flat rows, or raise RuntimeError for an error response.\n    pass\n\n\nprint(flatten_page("api/orders_page1.json"))\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "flatten_page",
            cases: [
              {
                args: [s("api/orders_page1.json")],
                expected: py.list(
                  py.dict([[s("id"), s("ORD-1")], [s("customer"), s("Ada")], [s("amount"), f(40)], [s("currency"), s("GBP")]]),
                  py.dict([[s("id"), s("ORD-2")], [s("customer"), s("Ben")], [s("amount"), f(15.5)], [s("currency"), s("GBP")]]),
                ),
              },
              {
                args: [s("api/orders_page2.json")],
                expected: py.list(
                  py.dict([[s("id"), s("ORD-3")], [s("customer"), s("Ada")], [s("amount"), py.none], [s("currency"), py.none]]),
                  py.dict([[s("id"), s("ORD-4")], [s("customer"), py.none], [s("amount"), f(60)], [s("currency"), s("GBP")]]),
                ),
              },
              { args: [s("api/error.json")], raises: "RuntimeError" },
            ],
            tip: 'customer = order.get("customer") or {} and total = order.get("total") or {}, then use .get() for each field.',
          },
          { kind: "expr", id: "message", label: "The RuntimeError carries the API's message", show: 'flatten_page("api/error.json")', expr: 'try:\n    flatten_page("api/error.json")\n    result = ""\nexcept RuntimeError as _e:\n    result = str(_e)', expected: s("Too many requests, retry later"), tip: 'raise RuntimeError(response["error"]["message"]).' },
        ],
      },
      hints: [
        'response = json.load(f); if response["status"] != "ok": raise RuntimeError(response["error"]["message"]).',
        'For each order: customer = order.get("customer") or {}; total = order.get("total") or {}.',
        'Append {"id": order["id"], "customer": customer.get("name"), "amount": total.get("amount"), "currency": total.get("currency")}.',
      ],
      answer: 'import json\n\n\ndef flatten_page(path):\n    """Return flat order rows from one API response file; RuntimeError for an error response."""\n    with open(path, encoding="utf-8") as f:\n        response = json.load(f)\n    if response.get("status") != "ok":\n        raise RuntimeError(response["error"]["message"])\n    rows = []\n    for order in response["data"]:\n        customer = order.get("customer") or {}\n        total = order.get("total") or {}\n        rows.append({\n            "id": order["id"],\n            "customer": customer.get("name"),\n            "amount": total.get("amount"),\n            "currency": total.get("currency"),\n        })\n    return rows\n\n\nprint(flatten_page("api/orders_page1.json"))',
      wrong: [
        { code: 'import json\n\ndef flatten_page(path):\n    with open(path, encoding="utf-8") as f:\n        response = json.load(f)\n    return [{"id": o["id"], "customer": o["customer"]["name"], "amount": o["total"]["amount"], "currency": o["total"]["currency"]} for o in response["data"]]\n', fails: ["fn", "message"], why: "no null handling or status check" },
      ],
    },
    {
      id: "challenge-2",
      title: "Collect every page",
      prompt:
        "Write `fetch_all(first_path)`, which starts at `first_path`, follows `next_page` until it's `null`, and returns a tuple: the list of all order IDs in page order, and the number of pages read. Stop (without error) if a page's `next_page` points to a page you've already read.",
      looksFor: [
        "All three pages are read, and the IDs come back in page order.",
        "The number of pages read is returned too.",
        "A cycle of pages doesn't loop forever.",
      ],
      starter: 'import json\n\n\ndef fetch_all(first_path):\n    # Return (all order ids, pages read).\n    pass\n\n\nprint(fetch_all("api/orders_page1.json"))\n',
      task: {
        files: {
          "loop/a.json": '{"status": "ok", "page": 1, "next_page": "loop/b.json", "data": [{"id": "A"}]}',
          "loop/b.json": '{"status": "ok", "page": 2, "next_page": "loop/a.json", "data": [{"id": "B"}]}',
        },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "fetch_all",
            cases: [
              { args: [s("api/orders_page1.json")], expected: py.tuple(py.list(...["ORD-1", "ORD-2", "ORD-3", "ORD-4", "ORD-5"].map(s)), i(3)) },
              { args: [s("api/orders_page3.json")], expected: py.tuple(py.list(s("ORD-5")), i(1)) },
              { args: [s("loop/a.json")], expected: py.tuple(py.list(s("A"), s("B")), i(2)), hidden: true },
            ],
            tip: "Keep a set of paths you've read, and stop when path is None or already in it.",
          },
        ],
      },
      hints: [
        "ids = [], seen = set(), path = first_path.",
        "while path is not None and path not in seen: read the page, extend ids with its order IDs, and add the path to seen.",
        'path = response["next_page"]. Return ids, len(seen).',
      ],
      answer: 'import json\n\n\ndef fetch_all(first_path):\n    """Follow next_page from first_path; return (all order ids, pages read)."""\n    ids = []\n    seen = set()\n    path = first_path\n    while path is not None and path not in seen:\n        seen.add(path)\n        with open(path, encoding="utf-8") as f:\n            response = json.load(f)\n        ids.extend(order["id"] for order in response["data"])\n        path = response.get("next_page")\n    return ids, len(seen)\n\n\nprint(fetch_all("api/orders_page1.json"))',
      wrong: [
        { code: 'import json\n\ndef fetch_all(first_path):\n    ids = []\n    pages = 0\n    path = first_path\n    while path is not None:\n        with open(path, encoding="utf-8") as f:\n            response = json.load(f)\n        ids.extend(o["id"] for o in response["data"])\n        pages += 1\n        path = response["next_page"]\n    return ids, pages\n', fails: "program", why: "loops forever on a cycle" },
        { code: 'import json\n\ndef fetch_all(first_path):\n    with open(first_path, encoding="utf-8") as f:\n        response = json.load(f)\n    return [o["id"] for o in response["data"]], 1\n', fails: ["fn"], why: "reads only the first page" },
      ],
    },
  ],

  quiz: [
    {
      id: "or-empty",
      prompt: '`order = {"id": 4, "customer": None}`. What is `(order.get("customer") or {}).get("name", "unknown")`?',
      options: [
        { text: '`"unknown"`', correct: true, why: "`None or {}` gives `{}`, and `.get` on it returns the default." },
        { text: "`None`", why: "The default `\"unknown\"` is returned when the key is missing from the empty dictionary." },
        { text: "A `TypeError`", why: "`or {}` replaces the `None` before `.get` is called, so nothing subscripts `None`." },
        { text: "A `KeyError`", why: "`.get` never raises for a missing key." },
      ],
    },
    {
      id: "status",
      prompt: "Why check `response[\"status\"]` before reading `response[\"data\"]`?",
      options: [
        { text: "An error response may have no data, and the real reason is in its error message", correct: true, why: "Checking first lets you report the API's message instead of a misleading `KeyError`." },
        { text: "Reading data is slower than reading status", why: "It's about correctness, not speed." },
        { text: "JSON requires status to be read first", why: "Keys can be read in any order; the API's contract is what matters." },
        { text: "Status is always the first key", why: "Key order doesn't matter; the content of status does." },
      ],
    },
  ],

  outcomes: [
    "Check an API response's status before reading its data, and surface the API's error message.",
    "Read nested records safely when objects may be `null` or missing.",
    "Follow pagination to the last page, guarding against cycles.",
    "Flatten nested records into simple rows for analysis.",
  ],
};
