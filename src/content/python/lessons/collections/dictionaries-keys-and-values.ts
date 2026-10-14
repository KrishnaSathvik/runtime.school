import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;

export const dictionariesKeysAndValues: PyLesson = {
  slug: "dictionaries-keys-and-values",
  ref: "python:dictionaries-keys-and-values",
  module: "collections",
  number: 5,
  title: "Dictionaries: keys and values",
  level: "beginner",
  summary:
    "Store values under names you choose with a dictionary: look a value up by its key, add and change entries, remove them, and check whether a key exists before using it.",

  sections: [
    {
      label: "a dictionary maps keys to values",
      blocks: [
        {
          kind: "p",
          text: "A **dictionary** (`dict`) stores **key: value** pairs in curly braces: `{\"tea\": 2.5, \"cake\": 3.75}`. You look a value up by its key, `prices[\"tea\"]`, rather than by position. Keys are usually strings or numbers, and each key appears at most once; values can be anything, including lists and other dictionaries.",
        },
        {
          kind: "p",
          text: "Dictionaries are the natural shape for a **record** with named fields: `{\"sku\": \"A1\", \"name\": \"Desk\", \"stock\": 5}` is clearer than a tuple where you have to remember what each position means.",
        },
      ],
    },
    {
      label: "reading, adding and changing",
      blocks: [
        { kind: "code", code: 'prices = {"tea": 2.5, "cake": 3.75}\nprices["tea"]            # 2.5\nprices["scone"] = 2.25   # add a new key\nprices["tea"] = 2.75     # replace an existing value\ndel prices["cake"]       # remove a key and its value\nlen(prices)              # 2' },
        {
          kind: "p",
          text: "Assigning to a key adds it if it's new and replaces its value if it isn't. Reading a key that doesn't exist is a `KeyError`. `\"tea\" in prices` checks the **keys** (not the values), so check before you read when a key might be missing. Dictionaries keep keys in the order they were first added.",
        },
      ],
    },
    {
      label: "updating several keys",
      blocks: [
        {
          kind: "p",
          text: "`d.update(other)` copies every key from `other` into `d`, replacing values for keys that already exist. `d.pop(key)` removes a key and returns its value. Like lists, dictionaries are mutable, and `b = a` makes two names for one dictionary; use `a.copy()` for a separate one.",
        },
      ],
    },
  ],

  example: {
    caption: "A café price list. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0}\n\nitem = "cake"\nquantity = 2\nif item in prices:\n    print(f"{quantity} x {item} = {prices[item] * quantity}")\n\nprices["scone"] = 2.25\nprices["tea"] = 2.75\ndel prices["juice"]\nprint(prices)\nprint(len(prices), "items on the menu")',
  },

  walkthrough: [
    {
      title: "Look up by key",
      text: "The key goes in square brackets. `in` checks whether a key exists.",
      code: 'stock = {"desk": 5, "lamp": 0}\nprint(stock["desk"])\nprint("lamp" in stock, "sofa" in stock)\nprint(5 in stock)',
    },
    {
      title: "Add or replace with assignment",
      text: "`chair` is new, so it's added at the end; `desk` exists, so its value is replaced.",
      code: 'stock = {"desk": 5, "lamp": 0}\nstock["chair"] = 2\nstock["desk"] = 4\nprint(stock)',
    },
    {
      title: "A record with named fields",
      text: "Each field is read by name, and a change uses the current value.",
      code: 'record = {"sku": "A1", "name": "Desk", "stock": 5}\nrecord["stock"] -= 2\nrecord["status"] = "ok"\nprint(record["name"], record["stock"])\nprint(record)',
    },
    {
      title: "Removing and merging",
      text: "`pop` removes a key and gives its value back; `update` copies keys in from another dictionary.",
      code: 'settings = {"theme": "dark", "font": 12}\nold_font = settings.pop("font")\nsettings.update({"font": 14, "lang": "en"})\nprint(old_font, settings)',
    },
  ],

  mistakes: [
    {
      title: "Reading a key that isn't there",
      text: "There's no `\"sofa\"` key, so reading it is a `KeyError`.",
      code: 'stock = {"desk": 5}\nprint(stock["sofa"])',
      raises: "KeyError",
      fix: "Check first (`if \"sofa\" in stock:`), or use `stock.get(\"sofa\", 0)`, next lesson.",
    },
    {
      title: "Expecting in to search the values",
      text: "`in` looks at the keys. `5` is a value here, not a key, so this prints `False`.",
      code: 'stock = {"desk": 5}\nprint(5 in stock)',
      fix: "Check the values explicitly: `5 in stock.values()`.",
    },
    {
      title: "Using a list as a key",
      text: "Keys must be immutable. A list can change, so it can't be a key: `TypeError: unhashable type`.",
      code: 'locations = {}\nlocations[["aisle", 3]] = "lamps"',
      raises: "TypeError",
      fix: "Use a tuple for a compound key: `locations[(\"aisle\", 3)] = \"lamps\"`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Price an order from the menu",
      prompt:
        "Look up `item` in the `prices` dictionary and store the cost of `quantity` of it in `total`. If the item isn't on the menu, set `total` to `None` instead. Print `<quantity> x <item> = <total>` or `<item> is not on the menu`.",
      expectedOutput: "2 x cake = 7.5\n",
      looksFor: [
        "`total` is `prices[item] * quantity` when the item is on the menu.",
        "For an item that isn't on the menu, `total` is `None`, there's no `KeyError`, and the message is printed.",
      ],
      starter: 'prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0}\nitem = "cake"\nquantity = 2\n\n# Look up the item, then store and print total.\n',
      task: {
        checks: [
          { kind: "variable", id: "total", name: "total", expected: py.float(7.5) },
          { kind: "output", id: "output", label: "Prints the order line", expected: "2 x cake = 7.5\n" },
          { kind: "variant", id: "v-other", set: { item: s("juice"), quantity: py.int(3) }, output: "3 x juice = 9.0\n" },
          { kind: "variant", id: "v-missing", set: { item: s("scone") }, output: "scone is not on the menu\n", vars: { total: py.none }, tip: "Check item in prices before reading prices[item]." },
        ],
      },
      hints: [
        "if item in prices: checks whether the key exists.",
        "Inside it: total = prices[item] * quantity, and print the line.",
        'else: total = None and print(f"{item} is not on the menu").',
      ],
      answer: 'prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0}\nitem = "cake"\nquantity = 2\n\nif item in prices:\n    total = prices[item] * quantity\n    print(f"{quantity} x {item} = {total}")\nelse:\n    total = None\n    print(f"{item} is not on the menu")',
      wrong: [
        { code: 'prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0}\nitem = "cake"\nquantity = 2\ntotal = prices[item] * quantity\nprint(f"{quantity} x {item} = {total}")\n', fails: ["v-missing"], why: "KeyError for a missing item" },
        { code: 'prices = {"tea": 2.5, "cake": 3.75, "juice": 3.0}\nitem = "cake"\nquantity = 2\nif item in prices.values():\n    total = prices[item] * quantity\n    print(f"{quantity} x {item} = {total}")\nelse:\n    total = None\n    print(f"{item} is not on the menu")\n', fails: ["total", "output", "v-other"], why: "searched the values" },
      ],
    },
    {
      id: "challenge-2",
      title: "Update a stock record",
      prompt:
        "`record` describes one product. Record that `sold` units were sold (reduce `stock`), then add a `status` field: `reorder` if the stock is now below 3, otherwise `ok`. If more were sold than were in stock, don't change `stock`; set `status` to `error` instead. Print the record.",
      expectedOutput: "{'sku': 'A1', 'name': 'Desk', 'stock': 2, 'status': 'reorder'}\n",
      looksFor: [
        "`record[\"stock\"]` goes down by `sold`, unless that would make it negative.",
        "`record[\"status\"]` is `reorder` (below 3), `ok`, or `error` when too many were sold.",
        "The other fields are unchanged.",
      ],
      starter: 'record = {"sku": "A1", "name": "Desk", "stock": 5}\nsold = 3\n\n# Update stock and add status, then print the record.\n',
      task: {
        checks: [
          { kind: "variable", id: "record", name: "record", expected: py.dict([[s("sku"), s("A1")], [s("name"), s("Desk")], [s("stock"), py.int(2)], [s("status"), s("reorder")]]) },
          { kind: "output", id: "output", label: "Prints the record", expected: "{'sku': 'A1', 'name': 'Desk', 'stock': 2, 'status': 'reorder'}\n" },
          { kind: "variant", id: "v-ok", set: { sold: py.int(1) }, vars: { record: py.dict([[s("sku"), s("A1")], [s("name"), s("Desk")], [s("stock"), py.int(4)], [s("status"), s("ok")]]) } },
          { kind: "variant", id: "v-boundary", set: { sold: py.int(2) }, vars: { record: py.dict([[s("sku"), s("A1")], [s("name"), s("Desk")], [s("stock"), py.int(3)], [s("status"), s("ok")]]) }, tip: "“Below 3” means stock < 3, so exactly 3 is ok." },
          { kind: "variant", id: "v-error", set: { sold: py.int(9) }, vars: { record: py.dict([[s("sku"), s("A1")], [s("name"), s("Desk")], [s("stock"), py.int(5)], [s("status"), s("error")]]) }, tip: "Check sold > record[\"stock\"] before subtracting." },
        ],
      },
      hints: [
        'First the guard: if sold > record["stock"]: record["status"] = "error".',
        'Otherwise: record["stock"] -= sold.',
        'Then record["status"] = "reorder" if record["stock"] < 3 else "ok", and print(record).',
      ],
      answer: 'record = {"sku": "A1", "name": "Desk", "stock": 5}\nsold = 3\n\nif sold > record["stock"]:\n    record["status"] = "error"\nelse:\n    record["stock"] -= sold\n    if record["stock"] < 3:\n        record["status"] = "reorder"\n    else:\n        record["status"] = "ok"\nprint(record)',
      wrong: [
        { code: 'record = {"sku": "A1", "name": "Desk", "stock": 5}\nsold = 3\nrecord["stock"] -= sold\nif record["stock"] < 3:\n    record["status"] = "reorder"\nelse:\n    record["status"] = "ok"\nprint(record)\n', fails: ["v-error"], why: "no guard for overselling" },
        { code: 'record = {"sku": "A1", "name": "Desk", "stock": 5}\nsold = 3\nif sold > record["stock"]:\n    record["status"] = "error"\nelse:\n    record["stock"] -= sold\n    record["status"] = "reorder" if record["stock"] <= 3 else "ok"\nprint(record)\n', fails: ["v-boundary"], why: "<= 3 instead of < 3" },
      ],
    },
  ],

  quiz: [
    {
      id: "assign",
      prompt: "What does this program print?",
      code: 'd = {"a": 1, "b": 2}\nd["a"] = 10\nd["c"] = d["b"] + 1\nprint(d)',
      options: [
        { text: "`{'a': 10, 'b': 2, 'c': 3}`", correct: true, why: "`a` already exists, so its value is replaced in place; `c` is new, so it's added at the end." },
        { text: "`{'a': 1, 'b': 2, 'a': 10, 'c': 3}`", why: "Keys are unique: assigning to an existing key replaces its value." },
        { text: "`{'b': 2, 'a': 10, 'c': 3}`", why: "Replacing a value keeps the key where it was; only new keys go at the end." },
        { text: "A `KeyError`", why: "Assigning to a missing key adds it. Only **reading** a missing key is an error." },
      ],
    },
    {
      id: "in",
      prompt: '`ages = {"ana": 31, "ben": 27}`. Which is `True`?',
      options: [
        { text: '`"ana" in ages`', correct: true, why: "`in` checks the keys, and `ana` is a key." },
        { text: "`31 in ages`", why: "31 is a value. `in` on a dictionary only looks at keys." },
        { text: '`"Ana" in ages`', why: "Keys are compared exactly, so the capital A doesn't match." },
        { text: '`("ana", 31) in ages`', why: "That would need `ages.items()`; the dictionary itself contains keys." },
      ],
    },
  ],

  outcomes: [
    "Create dictionaries and read values by key.",
    "Add, replace and remove entries, and merge with `update`.",
    "Check for a key with `in` before reading it, to avoid `KeyError`.",
    "Use a dictionary as a record with named fields.",
  ],
};
