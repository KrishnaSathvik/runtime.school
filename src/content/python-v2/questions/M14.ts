/**
 * M14 practice: ten independent problems on the built-ins of PY-L14-01 … PY-L14-05.
 *
 * Mix: 5 function implementations, 1 data transformation, 2 debugging (genuinely broken functions), 1 refactoring
 * (same behaviour, graded by the original's cases plus a check that zip replaced the index loop, because that is the
 * point of the exercise), 1 output prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Fixtures: NOAA readings (D07), Runtime Films (R02), Runtime Market products and orders (R01-shaped, inline),
 * leaderboards and forms. Every function question is graded by calling the learner's function on the public examples
 * and on hidden inputs (empty, single, ties, boundaries, mismatched lengths).
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { callsFunction, example, fn, hiddenCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const t = (...xs: unknown[]) => py.tuple(...xs.map((x) => (typeof x === "string" ? py.str(x) : Number.isInteger(x) ? py.int(x as number) : py.float(x as number))));

// ---------------------------------------------------------------- fixtures

const tk = (id: string, priority: string, opened: string) => ({ id, priority, opened });

/** Prerequisite tags shared by most questions. */
const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "dict-literal", "dict-lookup", "string-index", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m14Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q14-02",
    version: 2,
    slug: "reorder-the-support-queue",
    title: "Reorder the support queue in place",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "list-sort", "tuple-literal", "none-value", "print-several", "comparison", "if-statement", "print-text", "reassignment"],
    prompt: "A help desk keeps its open tickets in one list that several screens share. Reorder **that same list** so urgent work comes first: priority `\"high\"`, then `\"medium\"`, then `\"low\"` (not alphabetical!), and within a priority the oldest ticket first. Because other screens hold the same list, change it in place and return nothing.",
    spec: [
      ["Function", "`prioritise(tickets)`"],
      ["tickets", "a list of dictionaries with `id`, `priority` (`\"high\"`, `\"medium\"` or `\"low\"`) and `opened` (`\"YYYY-MM-DD HH:MM\"` text)"],
      ["Effect", "`tickets` itself is reordered: high, medium, low; oldest first within a priority"],
      ["Returns", "`None`, like `list.sort`"],
    ],
    hiddenKinds: ["priorities given low to high", "two tickets with the same priority", "a single ticket", "no tickets"],
    hints: [
      "`tickets.sort(key=…)` reorders the list itself and returns None; `sorted` would build a separate list that no other screen sees.",
      "Alphabetical order puts high, low, medium. Give each priority a number in a small dictionary and sort by that number.",
      "The key can return a tuple: the priority's number first, then the opened time, which sorts correctly as text.",
    ],
    explanation: "A dictionary `{\"high\": 0, \"medium\": 1, \"low\": 2}` turns the priority into a number that sorts the way people mean it, and the key `(rank[priority], opened)` adds the oldest-first rule. `tickets.sort(key=…)` changes the shared list in place. Sorting the priority text directly gives high, low, medium; building a new list with `sorted` and returning it leaves the shared list untouched.",
    code: {
      starter: src`
def prioritise(tickets):
    return None

queue = [
    {"id": "T-31", "priority": "low", "opened": "2025-05-02 09:10"},
    {"id": "T-29", "priority": "high", "opened": "2025-05-02 11:45"},
    {"id": "T-27", "priority": "medium", "opened": "2025-05-01 16:20"},
    {"id": "T-30", "priority": "high", "opened": "2025-05-02 08:05"},
]
prioritise(queue)
print([ticket["id"] for ticket in queue])
`,
      answer: src`
RANK = {"high": 0, "medium": 1, "low": 2}

def queue_position(ticket):
    return (RANK[ticket["priority"]], ticket["opened"])

def prioritise(tickets):
    tickets.sort(key=queue_position)

queue = [
    {"id": "T-31", "priority": "low", "opened": "2025-05-02 09:10"},
    {"id": "T-29", "priority": "high", "opened": "2025-05-02 11:45"},
    {"id": "T-27", "priority": "medium", "opened": "2025-05-01 16:20"},
    {"id": "T-30", "priority": "high", "opened": "2025-05-02 08:05"},
]
prioritise(queue)
print([ticket["id"] for ticket in queue])
`,
      alternatives: [
        src`
def opened_of(ticket):
    return ticket["opened"]

def priority_number(ticket):
    if ticket["priority"] == "high":
        return 0
    if ticket["priority"] == "medium":
        return 1
    return 2

def prioritise(tickets):
    tickets.sort(key=opened_of)
    tickets.sort(key=priority_number)
`,
      ],
      wrong: [
        {
          code: src`
def queue_position(ticket):
    return (ticket["priority"], ticket["opened"])

def prioritise(tickets):
    tickets.sort(key=queue_position)
`,
          fails: ["returns"],
          why: "priorities sort alphabetically: high, low, medium",
        },
        {
          code: src`
RANK = {"high": 0, "medium": 1, "low": 2}

def queue_position(ticket):
    return (RANK[ticket["priority"]], ticket["opened"])

def prioritise(tickets):
    return sorted(tickets, key=queue_position)
`,
          fails: ["returns"],
          why: "`sorted` builds a new list; the shared queue is left in its old order",
        },
        {
          code: src`
RANK = {"high": 0, "medium": 1, "low": 2}

def rank_of(ticket):
    return RANK[ticket["priority"]]

def prioritise(tickets):
    tickets.sort(key=rank_of)
`,
          fails: ["returns"],
          why: "within a priority the tickets stay in list order instead of oldest first",
        },
      ],
      task: {
        checks: [
          fn("returns", "prioritise", [
            example([[tk("T-31", "low", "2025-05-02 09:10"), tk("T-29", "high", "2025-05-02 11:45"), tk("T-27", "medium", "2025-05-01 16:20"), tk("T-30", "high", "2025-05-02 08:05")]], null, {
              argsAfter: [[tk("T-30", "high", "2025-05-02 08:05"), tk("T-29", "high", "2025-05-02 11:45"), tk("T-27", "medium", "2025-05-01 16:20"), tk("T-31", "low", "2025-05-02 09:10")]],
            }),
            example([[tk("T-1", "low", "2025-01-01 00:00")]], null, { argsAfter: [[tk("T-1", "low", "2025-01-01 00:00")]] }),
            example([[]], null, { argsAfter: [[]] }),
            hiddenCase("priorities given low to high", [[tk("a", "low", "2025-01-01 10:00"), tk("b", "medium", "2025-01-01 10:00"), tk("c", "high", "2025-01-01 10:00")]], null, {
              argsAfter: [[tk("c", "high", "2025-01-01 10:00"), tk("b", "medium", "2025-01-01 10:00"), tk("a", "low", "2025-01-01 10:00")]],
            }),
            hiddenCase("two tickets with the same priority, newest first in the list", [[tk("new", "medium", "2025-03-09 17:00"), tk("old", "medium", "2025-03-01 09:00")]], null, {
              argsAfter: [[tk("old", "medium", "2025-03-01 09:00"), tk("new", "medium", "2025-03-09 17:00")]],
            }),
            hiddenCase("a medium ticket older than every high one", [[tk("h", "high", "2025-06-02 12:00"), tk("m", "medium", "2024-12-31 23:59")]], null, {
              argsAfter: [[tk("h", "high", "2025-06-02 12:00"), tk("m", "medium", "2024-12-31 23:59")]],
            }),
          ], { label: "prioritise() reorders the queue in place" }),
        ],
      },
    },
  },
  {
    id: "PY-Q14-03",
    version: 2,
    slug: "a-form-that-submits-too-early",
    title: "A form that submits too early",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "any-call", "all-call", "dict-iterate", "string-method", "truthiness", "spaces-in-text", "print-text", "boolean", "comparison", "if-statement"],
    prompt: "A checkout form should only be submitted when **every** field has been filled in. Support reports orders arriving with no address. `form_complete` lets the form through as soon as one field has something in it. Fix it. A field that holds only spaces counts as empty.",
    spec: [
      ["Function", "`form_complete(fields)`"],
      ["fields", "a dictionary from field name to the text typed into it"],
      ["Returns", "True only when every value has something other than spaces in it"],
      ["Keep", "the function name and that it returns True or False"],
    ],
    hiddenKinds: ["one field holding only spaces", "every field filled", "every field empty", "a single filled field"],
    hints: [
      "Read the rule: *every* field must be filled. Which of `any` and `all` says *every*?",
      "The test for one value already handles the spaces; keep it.",
      "Make sure you walk the values, not the keys: the keys are field names and are never empty.",
    ],
    explanation: "`any` is True as soon as one field passes, which is why half-filled forms got through; the rule is `all`. The test `value.strip()` is falsy for a field of only spaces, so it must stay. `all(fields.values())` drops the strip and lets `\"  \"` count as filled, and walking `fields` itself walks the keys, which are never empty.",
    code: {
      starter: src`
def form_complete(fields):
    return any(value.strip() for value in fields.values())

form = {"name": "Nora Garcia", "email": "nora@fastmail.com", "address": "  "}
print(form_complete(form))
`,
      answer: src`
def form_complete(fields):
    return all(value.strip() for value in fields.values())

form = {"name": "Nora Garcia", "email": "nora@fastmail.com", "address": "  "}
print(form_complete(form))
`,
      alternatives: [
        src`
def form_complete(fields):
    for value in fields.values():
        if value.strip() == "":
            return False
    return True
`,
      ],
      wrong: [
        {
          code: src`
def form_complete(fields):
    return all(fields.values())
`,
          fails: ["returns"],
          why: "a field of only spaces is non-empty text, so it counts as filled",
        },
        {
          code: src`
def form_complete(fields):
    return all(name.strip() for name in fields)
`,
          fails: ["returns"],
          why: "walking the dictionary walks the field names, which are never empty",
        },
      ],
      task: {
        checks: [
          fn("returns", "form_complete", [
            example([{ name: "Nora Garcia", email: "nora@fastmail.com", address: "  " }], false),
            example([{ name: "Jamal Walker", email: "jamal.walker62@icloud.com", address: "12 Elm St" }], true),
            example([{ name: "", email: "", address: "" }], false),
            hiddenCase("one field holding only spaces", [{ a: "x", b: "   ", c: "y" }], false),
            hiddenCase("every field filled", [{ city: "Houston", zip: "77002" }], true),
            hiddenCase("a single filled field", [{ note: "gift wrap" }], true),
            hiddenCase("a single empty field", [{ note: "" }], false),
          ], { label: "form_complete() requires every field to be filled" }),
        ],
      },
    },
  },
  {
    id: "PY-Q14-06",
    version: 2,
    slug: "numbered-grade-report",
    title: "A numbered grade report",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "zip-call", "enumerate-call", "tuple-unpack", "string-format", "conditional-expr", "comparison", "len-call", "if-statement", "print-text", "list-mutate", "print-several", "range-call"],
    prompt: "A teacher keeps names and exam scores in two columns of the same length. Produce the numbered report lines for the class notice board. If the two columns have different lengths, a row was lost while copying, and no report should be produced at all.",
    spec: [
      ["Function", "`report_lines(names, scores)`"],
      ["names, scores", "two lists, matched by position"],
      ["Returns", "lines like `\"1. Ana: 72 (pass)\"`, numbered from 1; a score of 50 or more passes, otherwise `(fail)`"],
      ["Rules", "when the lists have different lengths, return `[]`"],
    ],
    hiddenKinds: ["a score of exactly 50", "lists of different lengths", "one student", "no students"],
    hints: [
      "Check the lengths before building anything.",
      "`zip` pairs names with scores and `enumerate(…, start=1)` numbers the pairs.",
      "The word in brackets is a choice between two texts, decided by the score.",
    ],
    explanation: "Compare `len(names)` and `len(scores)` first, because `zip` would silently drop the extra items and produce a report that looks complete. Then `enumerate(zip(names, scores), start=1)` gives the number and the pair together, and a conditional expression chooses pass or fail. Numbering from 0 or using `> 50` are the usual slips.",
    code: {
      starter: src`
def report_lines(names, scores):
    return []

print(report_lines(["Ana", "Ben", "Chen"], [72, 49, 91]))
`,
      answer: src`
def report_lines(names, scores):
    if len(names) != len(scores):
        return []
    lines = []
    for number, (name, score) in enumerate(zip(names, scores), start=1):
        result = "pass" if score >= 50 else "fail"
        lines.append(f"{number}. {name}: {score} ({result})")
    return lines

print(report_lines(["Ana", "Ben", "Chen"], [72, 49, 91]))
`,
      alternatives: [
        src`
def report_lines(names, scores):
    if len(names) != len(scores):
        return []
    return [f"{i + 1}. {names[i]}: {scores[i]} ({'pass' if scores[i] >= 50 else 'fail'})" for i in range(len(names))]
`,
      ],
      wrong: [
        {
          code: src`
def report_lines(names, scores):
    return [f"{n}. {name}: {score} ({'pass' if score >= 50 else 'fail'})" for n, (name, score) in enumerate(zip(names, scores), start=1)]
`,
          fails: ["returns"],
          why: "mismatched columns still produce a report, silently missing a student",
        },
        {
          code: src`
def report_lines(names, scores):
    if len(names) != len(scores):
        return []
    return [f"{n}. {name}: {score} ({'pass' if score > 50 else 'fail'})" for n, (name, score) in enumerate(zip(names, scores), start=1)]
`,
          fails: ["returns"],
          why: "`>` fails a student who scored exactly 50",
        },
        {
          code: src`
def report_lines(names, scores):
    if len(names) != len(scores):
        return []
    return [f"{n}. {name}: {score} ({'pass' if score >= 50 else 'fail'})" for n, (name, score) in enumerate(zip(names, scores))]
`,
          fails: ["returns"],
          why: "the numbering starts at 0",
        },
      ],
      task: {
        checks: [
          fn("returns", "report_lines", [
            example([["Ana", "Ben", "Chen"], [72, 49, 91]], ["1. Ana: 72 (pass)", "2. Ben: 49 (fail)", "3. Chen: 91 (pass)"]),
            example([["Dara"], [100]], ["1. Dara: 100 (pass)"]),
            example([[], []], []),
            hiddenCase("a score of exactly 50", [["Eli"], [50]], ["1. Eli: 50 (pass)"]),
            hiddenCase("more names than scores", [["A", "B"], [60]], []),
            hiddenCase("more scores than names", [["A"], [60, 70]], []),
            hiddenCase("a score of zero", [["Fay", "Gus"], [0, 51]], ["1. Fay: 0 (fail)", "2. Gus: 51 (pass)"]),
          ], { label: "report_lines() numbers every student with a verdict" }),
        ],
      },
    },
  },
  {
    id: "PY-Q14-10",
    version: 2,
    slug: "order-total-with-free-shipping",
    title: "Order total with free shipping",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "aggregate-call", "arithmetic", "comparison", "if-statement", "print-several", "conditional-expr", "precedence"],
    prompt: "Checkout adds a flat shipping charge, but orders whose goods total 50 or more ship free. Compute what the customer pays.",
    spec: [
      ["Function", "`order_total(lines, shipping)`"],
      ["lines", "dictionaries with `qty` and `price`"],
      ["Returns", "the goods total (quantity × price, added up) plus `shipping`, or just the goods total when it is 50 or more"],
      ["Rules", "an empty basket costs only the shipping"],
    ],
    hiddenKinds: ["a goods total of exactly 50", "just under the free-shipping line", "an empty basket", "free shipping charge of 0"],
    hints: [
      "First total the goods: one `sum` over the lines.",
      "Each line contributes its quantity times its price.",
      "Then decide whether shipping is added; *50 or more* includes 50.",
    ],
    explanation: "`sum(line[\"qty\"] * line[\"price\"] for line in lines)` gives the goods total; shipping is added only when that total is below 50. Summing prices without quantities undercharges multi-item lines, and testing `> 50` charges shipping on a 50.00 basket.",
    code: {
      starter: src`
def order_total(lines, shipping):
    return 0

basket = [{"qty": 2, "price": 7.5}, {"qty": 1, "price": 31.0}]
print(order_total(basket, 4.99))
`,
      answer: src`
def order_total(lines, shipping):
    goods = sum(line["qty"] * line["price"] for line in lines)
    if goods >= 50:
        return goods
    return goods + shipping

basket = [{"qty": 2, "price": 7.5}, {"qty": 1, "price": 31.0}]
print(order_total(basket, 4.99))
`,
      alternatives: [
        src`
def order_total(lines, shipping):
    goods = 0
    for line in lines:
        goods += line["qty"] * line["price"]
    return goods if goods >= 50 else goods + shipping
`,
      ],
      wrong: [
        {
          code: src`
def order_total(lines, shipping):
    return sum(line["qty"] * line["price"] for line in lines) + shipping
`,
          fails: ["returns"],
          why: "shipping is always charged, even on large orders",
        },
        {
          code: src`
def order_total(lines, shipping):
    goods = sum(line["qty"] * line["price"] for line in lines)
    if goods > 50:
        return goods
    return goods + shipping
`,
          fails: ["returns"],
          why: "a basket of exactly 50 is charged shipping",
        },
        {
          code: src`
def order_total(lines, shipping):
    goods = sum(line["price"] for line in lines)
    if goods >= 50:
        return goods
    return goods + shipping
`,
          fails: ["returns"],
          why: "quantities are ignored, so two of an item cost the same as one",
        },
      ],
      task: {
        checks: [
          fn("returns", "order_total", [
            example([[{ qty: 2, price: 7.5 }, { qty: 1, price: 31.0 }], 4.99], 50.99),
            example([[{ qty: 1, price: 171.25 }], 4.99], 171.25),
            example([[], 4.99], 4.99),
            hiddenCase("a goods total of exactly 50", [[{ qty: 2, price: 25 }], 6], 50),
            hiddenCase("just under the free-shipping line", [[{ qty: 1, price: 49.99 }], 5], 54.99),
            hiddenCase("several units of a cheap item", [[{ qty: 10, price: 6 }], 3.5], 60),
          ], { label: "order_total() charges shipping only below 50", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q14-12",
    version: 2,
    slug: "sorted-versus-sort",
    title: "sorted versus sort",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "list-sort", "sort-key", "tuple-literal", "string-index", "none-value", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "boolean", "reassignment"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`sorted` returns a new list; `sort` reorders the list in place and returns None.",
      "Hours II and Winter Lantern are both from 2022. A stable sort keeps them in their original order, also with `reverse=True`.",
      "After `films.sort(...)`, the list `films` itself is in order, oldest first.",
    ],
    explanation: "`newest` is a new list, newest first; the two 2022 films keep their input order (Hours II, then Winter Lantern) because the sort is stable even when reversed. `films.sort(...)` returns None, which `result` holds, and reorders `films` itself, so its first film is the oldest and its last the newest.",
    predict: {
      program: src`
def year_of(film):
    return film[1]

films = [("Hours II", 2022), ("Wild Archive", 2008), ("Glass Echo", 2023), ("Winter Lantern", 2022)]
newest = sorted(films, key=year_of, reverse=True)
result = films.sort(key=year_of)
oldest = films[0]
latest = films[-1]
print([film[0] for film in newest])
print(result)
print(oldest[0], latest[0])
`,
      output: "['Glass Echo', 'Hours II', 'Winter Lantern', 'Wild Archive']\nNone\nWild Archive Glass Echo\n",
      wrongPredictions: [
        "['Glass Echo', 'Winter Lantern', 'Hours II', 'Wild Archive']\nNone\nWild Archive Glass Echo",
        "['Glass Echo', 'Hours II', 'Winter Lantern', 'Wild Archive']\n[('Wild Archive', 2008), ('Hours II', 2022), ('Winter Lantern', 2022), ('Glass Echo', 2023)]\nWild Archive Glass Echo",
        "['Glass Echo', 'Hours II', 'Winter Lantern', 'Wild Archive']\nNone\nHours II Winter Lantern",
        "['Wild Archive', 'Hours II', 'Winter Lantern', 'Glass Echo']\nNone\nWild Archive Glass Echo",
      ],
    },
  },
  {
    id: "PY-Q14-13",
    version: 2,
    slug: "all-delivered-for-nobody",
    title: "All delivered, for a customer with no orders",
    format: "debugging",
    difficulty: "medium",
    minutes: 8,
    requires: [...fnBase, "all-call", "any-call", "comparison", "logical", "len-call", "if-statement", "truthiness", "print-several", "boolean", "print-text"],
    prompt: "A customer page shows a green *All orders delivered* badge. Customers who have never ordered anything are seeing the badge too, which confuses them. `all_delivered` should only be True for a customer who has at least one order and whose orders are all delivered. Fix it.",
    spec: [
      ["Function", "`all_delivered(orders)`"],
      ["orders", "a list of dictionaries with a `status` such as `\"delivered\"`, `\"shipped\"` or `\"returned\"`"],
      ["Returns", "True only when there is at least one order and every order's status is `\"delivered\"`"],
      ["Keep", "the function name and that it returns True or False"],
    ],
    hiddenKinds: ["a customer with no orders", "one order still shipping among delivered ones", "a single delivered order", "every order returned"],
    hints: [
      "What does `all` return when there is nothing to check?",
      "The empty case needs its own test before (or alongside) the `all`.",
      "Both conditions must hold, so they are joined with `and`, not `or`.",
    ],
    explanation: "`all` of an empty list is True, because no order fails the test. That is mathematically right but wrong for this badge, so the function must also require at least one order: `len(orders) > 0 and all(...)`. Swapping in `any` reports customers with one delivered order among several in transit, and joining with `or` makes every customer who has ordered pass.",
    code: {
      starter: src`
def all_delivered(orders):
    return all(order["status"] == "delivered" for order in orders)

print(all_delivered([{"status": "delivered"}, {"status": "delivered"}]))
print(all_delivered([]))
`,
      answer: src`
def all_delivered(orders):
    return len(orders) > 0 and all(order["status"] == "delivered" for order in orders)

print(all_delivered([{"status": "delivered"}, {"status": "delivered"}]))
print(all_delivered([]))
`,
      alternatives: [
        src`
def all_delivered(orders):
    if not orders:
        return False
    return all(order["status"] == "delivered" for order in orders)
`,
      ],
      wrong: [
        {
          code: src`
def all_delivered(orders):
    return any(order["status"] == "delivered" for order in orders)
`,
          fails: ["returns"],
          why: "`any` shows the badge when just one order has arrived",
        },
        {
          code: src`
def all_delivered(orders):
    return len(orders) > 0 or all(order["status"] == "delivered" for order in orders)
`,
          fails: ["returns"],
          why: "`or` makes every customer who has ordered anything pass",
        },
      ],
      task: {
        checks: [
          fn("returns", "all_delivered", [
            example([[{ status: "delivered" }, { status: "delivered" }]], true),
            example([[]], false),
            example([[{ status: "delivered" }, { status: "shipped" }]], false),
            hiddenCase("a single delivered order", [[{ status: "delivered" }]], true),
            hiddenCase("one order still shipping among delivered ones", [[{ status: "delivered" }, { status: "delivered" }, { status: "shipped" }]], false),
            hiddenCase("every order returned", [[{ status: "returned" }, { status: "returned" }]], false),
          ], { label: "all_delivered() needs orders, all delivered" }),
        ],
      },
    },
  },
  {
    id: "PY-Q14-16",
    version: 2,
    slug: "restock-without-indexes",
    title: "Restock lines without indexes",
    format: "refactoring",
    difficulty: "medium",
    minutes: 10,
    requires: [...fnBase, "zip-call", "range-call", "len-call", "tuple-literal", "tuple-unpack", "comp-if", "comparison", "arithmetic", "if-statement", "list-mutate", "print-text", "precedence", "print-several"],
    prompt: "`restock_lines` works, but it indexes three parallel lists with `range(len(...))`, and a reviewer asked for `zip`. Refactor it to walk the three lists together with `zip`. **Behaviour must not change**: one `(sku, units_to_order)` tuple for each SKU whose stock on hand is **below** its minimum, in list order.",
    spec: [
      ["Function", "`restock_lines(skus, on_hand, minimum)` (same name, same result)"],
      ["skus, on_hand, minimum", "three lists of the same length, matched by position"],
      ["Returns", "a list of tuples `(sku, minimum - on_hand)` for SKUs below their minimum"],
      ["Structure", "the lists are walked with `zip`, not by index"],
    ],
    hiddenKinds: ["stock exactly at the minimum", "every SKU below its minimum", "nothing to restock", "no SKUs"],
    hints: [
      "`zip` can walk three lists at once and hand you three values each time.",
      "Unpack the three values in the `for` line and use them instead of `skus[i]`, `on_hand[i]` and `minimum[i]`.",
      "Keep the test exactly as it is: *below* is `<`, not `<=`.",
    ],
    explanation: "`for sku, have, need in zip(skus, on_hand, minimum)` replaces the index and the three lookups; the test and the tuple stay the same. Changing `<` to `<=` would start ordering stock that is exactly at its minimum, and computing `have - need` flips the sign of every order quantity: both are behaviour changes a refactor must not make.",
    code: {
      starter: src`
def restock_lines(skus, on_hand, minimum):
    lines = []
    for i in range(len(skus)):
        if on_hand[i] < minimum[i]:
            lines.append((skus[i], minimum[i] - on_hand[i]))
    return lines

print(restock_lines(["SPO-11681", "HOM-22847", "ELE-24781"], [3, 12, 0], [10, 12, 4]))
`,
      answer: src`
def restock_lines(skus, on_hand, minimum):
    return [(sku, need - have) for sku, have, need in zip(skus, on_hand, minimum) if have < need]

print(restock_lines(["SPO-11681", "HOM-22847", "ELE-24781"], [3, 12, 0], [10, 12, 4]))
`,
      alternatives: [
        src`
def restock_lines(skus, on_hand, minimum):
    lines = []
    for sku, have, need in zip(skus, on_hand, minimum):
        if have < need:
            lines.append((sku, need - have))
    return lines
`,
      ],
      wrong: [
        {
          code: src`
def restock_lines(skus, on_hand, minimum):
    return [(sku, need - have) for sku, have, need in zip(skus, on_hand, minimum) if have <= need]
`,
          fails: ["returns"],
          why: "`<=` also orders stock that is exactly at its minimum",
        },
        {
          code: src`
def restock_lines(skus, on_hand, minimum):
    return [(sku, have - need) for sku, have, need in zip(skus, on_hand, minimum) if have < need]
`,
          fails: ["returns"],
          why: "the order quantity has its sign flipped",
        },
        {
          code: src`
def restock_lines(skus, on_hand, minimum):
    return [(skus[i], minimum[i] - on_hand[i]) for i in range(len(skus)) if on_hand[i] < minimum[i]]
`,
          fails: ["uses-zip"],
          why: "the result is right, but it still walks the lists by index",
        },
      ],
      task: {
        checks: [
          fn("returns", "restock_lines", [
            example([["SPO-11681", "HOM-22847", "ELE-24781"], [3, 12, 0], [10, 12, 4]], [t("SPO-11681", 7), t("ELE-24781", 4)]),
            example([["A"], [5], [2]], []),
            example([[], [], []], []),
            hiddenCase("stock exactly at the minimum", [["X", "Y"], [4, 3], [4, 4]], [t("Y", 1)]),
            hiddenCase("every SKU below its minimum", [["P", "Q"], [0, 1], [2, 9]], [t("P", 2), t("Q", 8)]),
            hiddenCase("nothing to restock", [["R", "S"], [10, 20], [1, 2]], []),
          ], { label: "restock_lines() still returns the same restock lines" }),
          callsFunction("uses-zip", "restock_lines() walks the three lists with zip", "zip", "Replace the index loop with `for sku, have, need in zip(...)`."),
        ],
      },
    },
  },
  {
    id: "PY-Q14-19",
    version: 2,
    slug: "readings-with-missing-markers",
    title: "Readings with missing markers",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "map-call", "string-method", "string-split", "conversion", "none-value", "if-statement", "comparison", "logical", "conditional-expr", "spaces-in-text", "print-text"],
    prompt: "A weather station's export writes one day per cell, comma-separated. Days with no reading are written in several ways: an empty cell, `NA`, `n/a` or `-`. The readings must stay lined up with their dates, so a missing day becomes `None` rather than disappearing.",
    spec: [
      ["Function", "`parse_readings(line)`"],
      ["line", "text such as `\"6.7, NA,7.2,,-,3.3\"`"],
      ["Returns", "one value per cell, in order: a float, or `None` when the cell (after removing end spaces, ignoring capitals) is empty, `na`, `n/a` or `-`"],
      ["Rules", "`-2.1` is a real (negative) reading, not a missing marker; `0` is a real reading"],
    ],
    hiddenKinds: ["a negative reading", "a zero reading", "every marker spelled in capitals", "a single cell", "every day missing"],
    hints: [
      "Write a small function that turns **one** cell into a float or None; then apply it to every cell.",
      "Clean the cell (`strip`, `lower`) before comparing it with the markers.",
      "Compare the whole cleaned cell with `-`, so a negative number like `-2.1` is not mistaken for a marker.",
    ],
    explanation: "A helper `to_reading(cell)` strips and lower-cases the cell, returns None when it is one of the markers, and `float(cell)` otherwise; `list(map(to_reading, line.split(\",\")))` applies it to every cell and keeps the positions. Dropping missing cells shifts every later reading onto the wrong date; testing `startswith(\"-\")` throws away real negative temperatures; forgetting `lower` lets `N/A` reach `float`.",
    code: {
      starter: src`
def parse_readings(line):
    return []

print(parse_readings("6.7, NA,7.2,,-,3.3"))
`,
      answer: src`
def to_reading(cell):
    clean = cell.strip().lower()
    if clean in ["", "na", "n/a", "-"]:
        return None
    return float(clean)

def parse_readings(line):
    return list(map(to_reading, line.split(",")))

print(parse_readings("6.7, NA,7.2,,-,3.3"))
`,
      alternatives: [
        src`
def parse_readings(line):
    missing = ["", "na", "n/a", "-"]
    return [None if cell.strip().lower() in missing else float(cell) for cell in line.split(",")]
`,
      ],
      wrong: [
        {
          code: src`
def to_reading(cell):
    clean = cell.strip().lower()
    if clean in ["", "na", "n/a", "-"]:
        return None
    return float(clean)

def parse_readings(line):
    return [r for r in map(to_reading, line.split(",")) if r is not None]
`,
          fails: ["returns"],
          why: "missing days are dropped, so later readings move onto the wrong dates",
        },
        {
          code: src`
def to_reading(cell):
    clean = cell.strip().lower()
    if clean == "" or clean == "na" or clean == "n/a" or clean.startswith("-"):
        return None
    return float(clean)

def parse_readings(line):
    return list(map(to_reading, line.split(",")))
`,
          fails: ["returns"],
          why: "`startswith(\"-\")` also throws away real negative readings",
        },
        {
          code: src`
def to_reading(cell):
    clean = cell.strip()
    if clean in ["", "NA", "n/a", "-"]:
        return None
    return float(clean)

def parse_readings(line):
    return list(map(to_reading, line.split(",")))
`,
          fails: ["returns"],
          why: "without `lower`, a marker typed as `N/A` reaches `float` and raises ValueError",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_readings", [
            example(["6.7, NA,7.2,,-,3.3"], [6.7, null, 7.2, null, null, 3.3]),
            example(["12.5"], [12.5]),
            example([""], [null]),
            hiddenCase("a negative reading", ["-2.1,-"], [-2.1, null]),
            hiddenCase("a zero reading", ["0, 0.0"], [py.float(0), py.float(0)]),
            hiddenCase("every marker spelled in capitals", ["N/A,NA, Na "], [null, null, null]),
            hiddenCase("readings with spaces around them", [" 4 ,  5.5"], [py.float(4), 5.5]),
          ], { label: "parse_readings() keeps one value per day, None when missing" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q14-20",
    version: 2,
    slug: "busiest-departure-hour",
    title: "The busiest departure hour",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 15,
    requires: [...fnBase, "aggregate-call", "dict-iterate", "dict-accumulate", "tuple-literal", "tuple-unpack", "string-slice", "conversion", "arithmetic", "comparison", "none-value", "if-statement", "print-several", "identity", "list-mutate", "logical", "precedence", "range-call"],
    prompt: "Airport operations staff the security lanes for the busiest hour of the day. Given the scheduled departure times, find the hour with the most departures. If two hours are equally busy, staff the earlier one first. A day with no departures has no busiest hour.",
    spec: [
      ["Function", "`busiest_hour(departures)`"],
      ["departures", "a list of 24-hour times as text, `\"HH:MM\"` (always two digits each)"],
      ["Returns", "the busiest hour as a whole number from 0 to 23, or `None` for no departures"],
      ["Ties", "equally busy hours → the earliest hour"],
    ],
    hiddenKinds: ["two hours equally busy", "the busiest hour is midnight", "departures not in time order", "a single departure", "no departures"],
    hints: [
      "Two steps: count departures per hour (see Collection Algorithms), then choose the hour with the largest count.",
      "The hour is the first two characters of the time, turned into a number.",
      "`max` over the counted pairs needs a key that prefers a bigger count and, on a tie, a smaller hour: negate the hour inside a tuple. `default` handles an empty day.",
    ],
    explanation: "Count per hour with a dictionary keyed by `int(time[:2])`, then `max(counts.items(), key=count_then_earlier, default=None)` where the key is `(count, -hour)`: the count decides, and on equal counts the smaller hour has the larger `-hour`. Returning the count instead of the hour, or relying on dictionary order for ties (which follows the order departures were listed, not the clock), are the usual mistakes.",
    code: {
      starter: src`
def busiest_hour(departures):
    return None

times = ["05:00", "06:15", "05:10", "06:40", "05:55", "17:20", "06:05"]
print(busiest_hour(times))
`,
      answer: src`
def count_then_earlier(pair):
    hour, count = pair
    return (count, -hour)

def busiest_hour(departures):
    counts = {}
    for time in departures:
        hour = int(time[:2])
        if hour not in counts:
            counts[hour] = 0
        counts[hour] += 1
    best = max(counts.items(), key=count_then_earlier, default=None)
    if best is None:
        return None
    return best[0]

times = ["05:00", "06:15", "05:10", "06:40", "05:55", "17:20", "06:05"]
print(busiest_hour(times))
`,
      alternatives: [
        src`
def busiest_hour(departures):
    counts = [0] * 24
    for time in departures:
        counts[int(time[:2])] += 1
    if not departures:
        return None
    top = max(counts)
    for hour in range(24):
        if counts[hour] == top:
            return hour
`,
      ],
      wrong: [
        {
          code: src`
def count_of(pair):
    return pair[1]

def busiest_hour(departures):
    counts = {}
    for time in departures:
        hour = int(time[:2])
        if hour not in counts:
            counts[hour] = 0
        counts[hour] += 1
    best = max(counts.items(), key=count_of, default=None)
    return None if best is None else best[0]
`,
          fails: ["returns"],
          why: "on a tie the hour listed first in the data wins, not the earlier hour on the clock",
        },
        {
          code: src`
def count_then_earlier(pair):
    hour, count = pair
    return (count, -hour)

def busiest_hour(departures):
    counts = {}
    for time in departures:
        hour = int(time[:2])
        if hour not in counts:
            counts[hour] = 0
        counts[hour] += 1
    best = max(counts.items(), key=count_then_earlier, default=None)
    return None if best is None else best[1]
`,
          fails: ["returns"],
          why: "it returns how many departures the busiest hour has, not which hour it is",
        },
        {
          code: src`
def busiest_hour(departures):
    counts = {}
    for time in departures:
        hour = int(time[:2])
        if hour not in counts:
            counts[hour] = 0
        counts[hour] += 1
    return max(counts, default=None)
`,
          fails: ["returns"],
          why: "`max` of the keys is simply the latest hour, whatever the counts",
        },
      ],
      task: {
        checks: [
          fn("returns", "busiest_hour", [
            example([["05:00", "06:15", "05:10", "06:40", "05:55", "17:20", "06:05"]], 5),
            example([["13:30"]], 13),
            example([[]], null),
            hiddenCase("two hours equally busy, the later one listed first", [["18:00", "18:30", "07:10", "07:50"]], 7),
            hiddenCase("the busiest hour is midnight", [["00:05", "00:40", "23:59"]], 0),
            hiddenCase("departures not in time order", [["21:00", "09:15", "21:30", "09:45", "21:59"]], 21),
            hiddenCase("every departure in a different hour", [["10:00", "08:00", "12:00"]], 8),
          ], { label: "busiest_hour() finds the hour with the most departures" }),
        ],
      },
    },
  },
  {
    id: "PY-Q14-22",
    version: 2,
    slug: "leaderboard-with-shared-ranks",
    title: "A leaderboard with shared ranks",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 18,
    requires: [...fnBase, "sort-key", "list-sort", "dict-iterate", "tuple-literal", "tuple-unpack", "enumerate-call", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "truthiness", "list-mutate", "print-several", "comp-if", "len-call", "nested-condition", "precedence", "reassignment"],
    prompt: "A weekly quiz league publishes a leaderboard. Players are ordered by points, highest first, and players with equal points are listed alphabetically. Equal points share a rank, and the next rank skips accordingly (the sports-style 1, 2, 2, 4).",
    spec: [
      ["Function", "`leaderboard(scores)`"],
      ["scores", "a dictionary from player name to points"],
      ["Returns", "a list of tuples `(rank, name, points)` in leaderboard order"],
      ["Ranks", "a player's rank is 1 + the number of players with **more** points; ties share a rank"],
    ],
    hiddenKinds: ["a tie for first place", "a three-way tie", "everyone on different points", "a single player", "no players"],
    hints: [
      "First get the order right: a tuple key with the points negated, then the name.",
      "Walk the sorted players with their 1-based position. A player who ties with the previous one copies that player's rank; otherwise the rank is the position.",
      "Remember the previous tuple you added; its first item is its rank and its last its points.",
    ],
    explanation: "Sort `scores.items()` by `(-points, name)`, then walk with `enumerate(…, start=1)`. A player whose points equal the previous player's takes the previous rank; anyone else takes their position, which makes the rank after a tie skip (1, 2, 2, 4). Numbering 1, 2, 3, … gives tied players different ranks, and *dense* ranking (1, 2, 2, 3) is a different convention from the one asked for.",
    code: {
      starter: src`
def leaderboard(scores):
    return []

scores = {"Nora": 40, "Theo": 55, "Grace": 40, "Jamal": 31}
for row in leaderboard(scores):
    print(row)
`,
      answer: src`
def points_then_name(item):
    name, points = item
    return (-points, name)

def leaderboard(scores):
    ordered = sorted(scores.items(), key=points_then_name)
    board = []
    for position, (name, points) in enumerate(ordered, start=1):
        rank = position
        if board:
            previous = board[-1]
            if previous[2] == points:
                rank = previous[0]
        board.append((rank, name, points))
    return board

scores = {"Nora": 40, "Theo": 55, "Grace": 40, "Jamal": 31}
for row in leaderboard(scores):
    print(row)
`,
      alternatives: [
        src`
def points_then_name(item):
    name, points = item
    return (-points, name)

def leaderboard(scores):
    board = []
    for name, points in sorted(scores.items(), key=points_then_name):
        better = len([p for p in scores.values() if p > points])
        board.append((better + 1, name, points))
    return board
`,
      ],
      wrong: [
        {
          code: src`
def points_then_name(item):
    name, points = item
    return (-points, name)

def leaderboard(scores):
    ordered = sorted(scores.items(), key=points_then_name)
    return [(position, name, points) for position, (name, points) in enumerate(ordered, start=1)]
`,
          fails: ["returns"],
          why: "tied players get different ranks",
        },
        {
          code: src`
def points_then_name(item):
    name, points = item
    return (-points, name)

def leaderboard(scores):
    ordered = sorted(scores.items(), key=points_then_name)
    board = []
    rank = 0
    for name, points in ordered:
        if board:
            previous = board[-1]
            if previous[2] != points:
                rank += 1
        else:
            rank = 1
        board.append((rank, name, points))
    return board
`,
          fails: ["returns"],
          why: "dense ranking: the rank after a tie doesn't skip, giving 1, 2, 2, 3",
        },
        {
          code: src`
def points_then_name(item):
    name, points = item
    return (points, name)

def leaderboard(scores):
    ordered = sorted(scores.items(), key=points_then_name, reverse=True)
    board = []
    for position, (name, points) in enumerate(ordered, start=1):
        rank = position
        if board:
            previous = board[-1]
            if previous[2] == points:
                rank = previous[0]
        board.append((rank, name, points))
    return board
`,
          fails: ["returns"],
          why: "`reverse=True` also reverses the names, so tied players are listed Z to A",
        },
      ],
      task: {
        checks: [
          fn("returns", "leaderboard", [
            example([{ Nora: 40, Theo: 55, Grace: 40, Jamal: 31 }], [t(1, "Theo", 55), t(2, "Grace", 40), t(2, "Nora", 40), t(4, "Jamal", 31)]),
            example([{ Solo: 12 }], [t(1, "Solo", 12)]),
            example([{}], []),
            hiddenCase("a tie for first place", [{ Bo: 9, Al: 9, Cy: 3 }], [t(1, "Al", 9), t(1, "Bo", 9), t(3, "Cy", 3)]),
            hiddenCase("a three-way tie", [{ d: 1, c: 5, b: 5, a: 5 }], [t(1, "a", 5), t(1, "b", 5), t(1, "c", 5), t(4, "d", 1)]),
            hiddenCase("everyone on different points", [{ x: 1, y: 2, z: 3 }], [t(1, "z", 3), t(2, "y", 2), t(3, "x", 1)]),
            hiddenCase("zero points", [{ p: 0, q: 0 }], [t(1, "p", 0), t(1, "q", 0)]),
          ], { label: "leaderboard() orders players and shares ranks on ties" }),
        ],
      },
    },
  },
];
