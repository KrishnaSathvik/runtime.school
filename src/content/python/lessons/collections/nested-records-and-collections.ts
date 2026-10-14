import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const order = (id: number, customer: string, amount: number, status: string, region?: string): PyValue =>
  py.dict([
    [s("id"), i(id)],
    [s("customer"), s(customer)],
    [s("amount"), py.float(amount)],
    [s("status"), s(status)],
    ...(region ? ([[s("region"), s(region)]] as [PyValue, PyValue][]) : []),
  ]);

export const nestedRecordsAndCollections: PyLesson = {
  slug: "nested-records-and-collections",
  ref: "python:nested-records-and-collections",
  module: "collections",
  number: 7,
  title: "Nested records and collections",
  level: "intermediate",
  summary:
    "Work with the shapes real data comes in: a list of records (dictionaries), and dictionaries whose values are lists. Loop over them, filter and total them, group records by a field, and avoid the shared-inner-list trap when copying.",

  sections: [
    {
      label: "a list of records",
      blocks: [
        {
          kind: "p",
          text: "A table of data is usually a **list of dictionaries**: one dictionary per row, with the same keys in each. Index into it one level at a time: `orders[0]` is the first record, `orders[0][\"amount\"]` is that record's amount.",
        },
        { kind: "code", code: 'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0, "status": "completed"},\n    {"id": 102, "customer": "ben", "amount": 15.5, "status": "refunded"},\n]\nfor order in orders:\n    print(order["id"], order["amount"])' },
        {
          kind: "p",
          text: "Loop over the list and read fields from each record. Everything from the earlier lessons combines here: `if` to filter, accumulators to total, the counting pattern to summarise.",
        },
      ],
    },
    {
      label: "grouping into a dictionary of lists",
      blocks: [
        {
          kind: "p",
          text: "**Grouping** builds a dictionary whose values are lists: for each record, find its group's list (creating an empty one the first time) and append to it. `d.setdefault(key, [])` returns the list for `key`, inserting an empty list first if the key is new:",
        },
        { kind: "code", code: 'by_customer = {}\nfor order in orders:\n    by_customer.setdefault(order["customer"], []).append(order["id"])' },
        {
          kind: "p",
          text: "Real data has gaps. A record might not have a `region` field at all: `order.get(\"region\", \"unknown\")` gives a fallback instead of a `KeyError`.",
        },
      ],
    },
    {
      label: "copies of nested data",
      blocks: [
        {
          kind: "p",
          text: "`.copy()` copies only the outer container. The inner lists and dictionaries are still **shared** between the original and the copy, so changing an inner list through one shows up in both. When you need a fully independent copy of nested data, use `copy.deepcopy(data)` from the `copy` module.",
        },
      ],
    },
  ],

  example: {
    caption: "Totals and groups from a list of order records. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0, "status": "completed"},\n    {"id": 102, "customer": "ben", "amount": 15.5, "status": "refunded"},\n    {"id": 103, "customer": "ana", "amount": 22.5, "status": "completed"},\n    {"id": 104, "customer": "cai", "amount": 60.0, "status": "pending"},\n]\n\nrevenue = 0\nfor order in orders:\n    if order["status"] == "completed":\n        revenue += order["amount"]\nprint("Completed revenue:", revenue)\n\nby_customer = {}\nfor order in orders:\n    by_customer.setdefault(order["customer"], []).append(order["id"])\nprint(by_customer)',
  },

  walkthrough: [
    {
      title: "Index one level at a time",
      text: "`orders[1]` is a dictionary; `[\"customer\"]` then reads a field from it.",
      code: 'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0},\n    {"id": 102, "customer": "ben", "amount": 15.5},\n]\nprint(orders[1])\nprint(orders[1]["customer"])\nprint(len(orders), "orders")',
    },
    {
      title: "Filter and total",
      text: "An `if` inside the loop selects the records; the accumulator adds their amounts.",
      code: 'orders = [\n    {"id": 101, "amount": 40.0, "status": "completed"},\n    {"id": 102, "amount": 15.5, "status": "refunded"},\n    {"id": 103, "amount": 22.5, "status": "completed"},\n]\ntotal = 0\ncount = 0\nfor order in orders:\n    if order["status"] == "completed":\n        total += order["amount"]\n        count += 1\nprint(count, total)',
    },
    {
      title: "Group with setdefault",
      text: "The first time a customer is seen, `setdefault` inserts an empty list; every order then appends its ID to the right list.",
      code: 'orders = [("ana", 101), ("ben", 102), ("ana", 103)]\nby_customer = {}\nfor customer, order_id in orders:\n    by_customer.setdefault(customer, []).append(order_id)\nprint(by_customer)\nprint(by_customer["ana"])',
    },
    {
      title: "A shallow copy shares inner lists",
      text: "`copy` is a new dictionary, but both point at the same list for `ana`, so the append shows up in both. `deep` is fully separate.",
      code: 'import copy\ngroups = {"ana": [101]}\nshallow = groups.copy()\ndeep = copy.deepcopy(groups)\ngroups["ana"].append(103)\nprint(shallow)\nprint(deep)',
    },
  ],

  mistakes: [
    {
      title: "A record without the field you read",
      text: "The second record has no `region` key, so `order[\"region\"]` is a `KeyError` partway through the loop.",
      code: 'orders = [{"id": 1, "region": "north"}, {"id": 2}]\nfor order in orders:\n    print(order["id"], order["region"])',
      raises: "KeyError",
      fix: 'Use a fallback: `order.get("region", "unknown")`.',
    },
    {
      title: "Indexing a list with a key",
      text: "`orders` is a list, so it needs a position, not a field name: `TypeError: list indices must be integers`.",
      code: 'orders = [{"id": 1, "amount": 40.0}]\nprint(orders["amount"])',
      raises: "TypeError",
      fix: "Pick a record first: `orders[0][\"amount\"]`, or loop over the records.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Summarise orders by status",
      prompt:
        "`orders` is a list of order records. Calculate the revenue from **completed** orders in `completed_revenue`, and count the orders in each status in a dictionary `status_counts` (status → count). Print the revenue, then each status and its count in alphabetical order.",
      expectedOutput: "Completed revenue: 62.5\ncompleted: 2\npending: 1\nrefunded: 1\n",
      looksFor: [
        "`completed_revenue` adds up the amounts of orders whose status is `completed`.",
        "`status_counts` counts every status that appears.",
        "Statuses are printed alphabetically, after the revenue line.",
      ],
      starter:
        'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0, "status": "completed"},\n    {"id": 102, "customer": "ben", "amount": 15.5, "status": "refunded"},\n    {"id": 103, "customer": "ana", "amount": 22.5, "status": "completed"},\n    {"id": 104, "customer": "cai", "amount": 60.0, "status": "pending"},\n]\n\n# Calculate completed_revenue and status_counts, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "revenue", name: "completed_revenue", expected: py.float(62.5) },
          { kind: "variable", id: "counts", name: "status_counts", expected: py.dict([[s("completed"), i(2)], [s("refunded"), i(1)], [s("pending"), i(1)]]) },
          { kind: "output", id: "output", label: "Prints the summary", expected: "Completed revenue: 62.5\ncompleted: 2\npending: 1\nrefunded: 1\n" },
          { kind: "variant", id: "v-none-completed", set: { orders: py.list(order(1, "x", 9.5, "pending")) }, output: "Completed revenue: 0\npending: 1\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { orders: py.list(order(1, "a", 10, "completed"), order(2, "b", 5, "completed"), order(3, "c", 1, "cancelled")) }, vars: { completed_revenue: py.float(15), status_counts: py.dict([[s("completed"), i(2)], [s("cancelled"), i(1)]]) } },
        ],
      },
      hints: [
        "completed_revenue = 0 and status_counts = {} before one loop over the orders.",
        'In the loop: if order["status"] == "completed": completed_revenue += order["amount"]; and the counting pattern for status_counts.',
        'Print the revenue, then: for status in sorted(status_counts): print(f"{status}: {status_counts[status]}").',
      ],
      answer:
        'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0, "status": "completed"},\n    {"id": 102, "customer": "ben", "amount": 15.5, "status": "refunded"},\n    {"id": 103, "customer": "ana", "amount": 22.5, "status": "completed"},\n    {"id": 104, "customer": "cai", "amount": 60.0, "status": "pending"},\n]\n\ncompleted_revenue = 0\nstatus_counts = {}\nfor order in orders:\n    status = order["status"]\n    status_counts[status] = status_counts.get(status, 0) + 1\n    if status == "completed":\n        completed_revenue += order["amount"]\n\nprint("Completed revenue:", completed_revenue)\nfor status in sorted(status_counts):\n    print(f"{status}: {status_counts[status]}")',
      wrong: [
        { code: 'orders = [\n    {"id": 101, "customer": "ana", "amount": 40.0, "status": "completed"},\n    {"id": 102, "customer": "ben", "amount": 15.5, "status": "refunded"},\n    {"id": 103, "customer": "ana", "amount": 22.5, "status": "completed"},\n    {"id": 104, "customer": "cai", "amount": 60.0, "status": "pending"},\n]\ncompleted_revenue = 0\nstatus_counts = {}\nfor order in orders:\n    status = order["status"]\n    status_counts[status] = status_counts.get(status, 0) + 1\n    completed_revenue += order["amount"]\nprint("Completed revenue:", completed_revenue)\nfor status in sorted(status_counts):\n    print(f"{status}: {status_counts[status]}")\n', fails: ["revenue", "output", "v-none-completed", "v-hidden"], why: "adds every order" },
      ],
    },
    {
      id: "challenge-2",
      title: "Group orders by region",
      prompt:
        "Build `by_region`: a dictionary mapping each region to a list of its order IDs, in the order the orders appear. Some records have no `region` field; group those under `\"unknown\"`. Then print each region (alphabetically) with its IDs, as shown.",
      expectedOutput: "north: [1, 3]\nsouth: [2]\nunknown: [4]\n",
      looksFor: [
        "`by_region` maps each region to the IDs of its orders, in their original order.",
        "Orders without a `region` field go under `\"unknown\"`, with no `KeyError`.",
      ],
      starter: 'orders = [\n    {"id": 1, "region": "north"},\n    {"id": 2, "region": "south"},\n    {"id": 3, "region": "north"},\n    {"id": 4},\n]\n\n# Group the order IDs by region.\n',
      task: {
        checks: [
          { kind: "variable", id: "groups", name: "by_region", expected: py.dict([[s("north"), py.list(i(1), i(3))], [s("south"), py.list(i(2))], [s("unknown"), py.list(i(4))]]), tip: 'order.get("region", "unknown") gives a fallback for records without a region.' },
          { kind: "output", id: "output", label: "Prints the groups", expected: "north: [1, 3]\nsouth: [2]\nunknown: [4]\n" },
          { kind: "variant", id: "v-all-known", set: { orders: py.list(py.dict([[s("id"), i(9)], [s("region"), s("east")]]), py.dict([[s("id"), i(7)], [s("region"), s("east")]])) }, vars: { by_region: py.dict([[s("east"), py.list(i(9), i(7))]]) }, tip: "Keep the IDs in the order the orders appear; don't sort them." },
          { kind: "variant", id: "v-empty", set: { orders: py.list() }, output: "", vars: { by_region: py.dict([]) } },
        ],
      },
      hints: [
        "by_region = {} before the loop.",
        'region = order.get("region", "unknown") for each order.',
        'by_region.setdefault(region, []).append(order["id"]). Then print with for region in sorted(by_region).',
      ],
      answer: 'orders = [\n    {"id": 1, "region": "north"},\n    {"id": 2, "region": "south"},\n    {"id": 3, "region": "north"},\n    {"id": 4},\n]\n\nby_region = {}\nfor order in orders:\n    region = order.get("region", "unknown")\n    by_region.setdefault(region, []).append(order["id"])\n\nfor region in sorted(by_region):\n    print(f"{region}: {by_region[region]}")',
      alternatives: ['orders = [\n    {"id": 1, "region": "north"},\n    {"id": 2, "region": "south"},\n    {"id": 3, "region": "north"},\n    {"id": 4},\n]\nby_region = {}\nfor order in orders:\n    region = order["region"] if "region" in order else "unknown"\n    if region not in by_region:\n        by_region[region] = []\n    by_region[region].append(order["id"])\nfor region, ids in sorted(by_region.items()):\n    print(f"{region}: {ids}")\n'],
      wrong: [
        { code: 'orders = [\n    {"id": 1, "region": "north"},\n    {"id": 2, "region": "south"},\n    {"id": 3, "region": "north"},\n    {"id": 4},\n]\nby_region = {}\nfor order in orders:\n    by_region.setdefault(order["region"], []).append(order["id"])\nfor region in sorted(by_region):\n    print(f"{region}: {by_region[region]}")\n', fails: "program", why: "KeyError on the record without a region" },
        { code: 'orders = [\n    {"id": 1, "region": "north"},\n    {"id": 2, "region": "south"},\n    {"id": 3, "region": "north"},\n    {"id": 4},\n]\nby_region = {}\nfor order in orders:\n    region = order.get("region", "unknown")\n    by_region[region] = [order["id"]]\nfor region in sorted(by_region):\n    print(f"{region}: {by_region[region]}")\n', fails: ["groups", "output", "v-all-known"], why: "replaces the list instead of appending" },
      ],
    },
  ],

  quiz: [
    {
      id: "index",
      prompt: "What does this program print?",
      code: 'data = {"ana": [3, 5], "ben": [2]}\ndata["ana"].append(1)\nprint(len(data), data["ana"][-1], sum(data["ana"]))',
      options: [
        { text: "`2 1 9`", correct: true, why: "Two keys. Appending changes the inner list to `[3, 5, 1]`: its last item is 1 and its sum is 9." },
        { text: "`3 1 9`", why: "Appending to an inner list doesn't add a key to the dictionary." },
        { text: "`2 5 8`", why: "`append` really changes the inner list, so it now ends with 1." },
        { text: "A `TypeError`", why: "`data[\"ana\"]` is a list, so `.append` and `[-1]` both work on it." },
      ],
    },
    {
      id: "shallow",
      prompt: '`a = {"x": [1]}` and `b = a.copy()`. After `a["x"].append(2)`, what is `b["x"]`?',
      options: [
        { text: "`[1, 2]`", correct: true, why: "`copy()` is shallow: `b` is a new dictionary, but its `\"x\"` value is the same list object as `a`'s." },
        { text: "`[1]`", why: "That would need `copy.deepcopy(a)`. A shallow copy shares inner lists." },
        { text: "A `KeyError`", why: "The copy has the same keys as the original." },
        { text: "`[2]`", why: "The list keeps its 1; `append` adds 2 after it." },
      ],
    },
  ],

  outcomes: [
    "Read fields from a list of dictionary records, one level at a time.",
    "Filter, total and count over records.",
    "Group records into a dictionary of lists with `setdefault`.",
    "Handle missing fields with `get`, and know when a copy needs to be deep.",
  ],
};
