/**
 * M12 practice: ten independent problems on the collection algorithms of PY-L12-01 … PY-L12-05.
 *
 * Mix: 4 function implementations, 2 data transformations, 1 debugging (a genuinely broken function), 1 validation,
 * 1 refactoring (behaviour preserved, graded by the same function cases plus an operation budget), 1 output
 * prediction. Easy: 02, 06, 10. Medium: 12, 13, 16, 19. Hard: 03, 20, 22.
 *
 * Fixtures are small slices of course datasets: D02 (UCI Online Retail II invoice lines and products: cancellations
 * start with "C", descriptions carry double spaces, some lines have no customer) and R01 (Runtime Market payments
 * and products). Every function question is graded by calling the learner's function on the public examples and on
 * hidden inputs (empty, single, duplicates, ties, boundaries, missing keys); mutation is checked where it matters.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures

const invoiceLines = [
  { Invoice: "489438", StockCode: "21329", Quantity: 28 },
  { Invoice: "C489528", StockCode: "85048", Quantity: -1 },
  { Invoice: "489438", StockCode: "21252", Quantity: 30 },
  { Invoice: "C489541", StockCode: "21254", Quantity: -4 },
];

const catalogue = [
  { stock_code: "21329", description: "DINOSAURS  WRITING SET", list_price: 0.98 },
  { stock_code: "84031A", description: "CHARLIE+LOLA RED HOT WATER BOTTLE", list_price: 3.0 },
  { stock_code: "84031B", description: "CHARLIE LOLA BLUE HOT WATER BOTTLE", list_price: 3.0 },
  { stock_code: "21411", description: "GINGHAM HEART  DOORSTOP RED", list_price: 2.5 },
  { stock_code: "85132A", description: "CHARLIE + LOLA BISCUITS TINS", list_price: 6.38 },
];

const productRows = [
  { category: "sports", product: "Ultra Bike Light", units: 14 },
  { category: "home", product: "Deluxe Vase", units: 9 },
  { category: "sports", product: "Travel Yoga Mat", units: 21 },
  { category: "electronics", product: "Organic Speaker", units: 6 },
  { category: "sports", product: "Studio Tent", units: 14 },
  { category: "home", product: "Nordic Candle", units: 12 },
];

const codes = (...xs: string[]) => xs.map((c) => ({ stock_code: c, description: "ITEM " + c }));

const payments = [
  { payment_id: "PAY0000416", order_id: "O100376", method: "gift_card" },
  { payment_id: "PAY0000417", order_id: "O100376", method: "gift_card" },
  { payment_id: "PAY0001503", order_id: "O101341", method: "card" },
  { payment_id: "PAY0001504", order_id: "O101341", method: "paypal" },
];

const cityCustomers = [
  { customer_id: "C00038", city: "New York" },
  { customer_id: "C00077", city: "Houston" },
  { customer_id: "C01338", city: "New York" },
];
const cityOrders = [
  { order_id: "O101219", customer_id: "C00077" },
  { order_id: "O121005", customer_id: "C08398" },
  { order_id: "O101341", customer_id: "C00038" },
];

const oldExport = [
  { customer_id: "18102", country: "United Kingdom", version: 1 },
  { customer_id: "13085", country: "United Kingdom", version: 2 },
  { customer_id: "12682", country: "France", version: 1 },
];
const newExport = [
  { customer_id: "13085", country: "Ireland", version: 1 },
  { customer_id: "12682", country: "Belgium", version: 3 },
  { customer_id: "16329", country: "Germany", version: 1 },
];

// Prerequisite tags shared by most questions: a function that walks a list of dictionaries.
const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "if-statement", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m12Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q12-02",
    version: 2,
    slug: "letter-grades",
    title: "Letter grades for a class",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "comparison", "else-clause", "logical", "print-several", "reassignment", "nested-loop", "break-statement"],
    prompt: "A teacher exports raw scores and wants the letter grade for each student, in the same order, to paste next to the names.",
    spec: [
      ["Function", "`letter_grades(scores)`"],
      ["scores", "a list of whole-number scores from 0 to 100"],
      ["Returns", "a new list with one letter per score: `\"A\"` for 90 and up, `\"B\"` for 80–89, `\"C\"` for 70–79, `\"D\"` for 60–69, otherwise `\"F\"`"],
      ["Rules", "every score gets a letter, including failing ones; the list may be empty"],
    ],
    hiddenKinds: ["scores exactly on each boundary", "scores one below each boundary", "a perfect score and zero", "a single score"],
    hints: [
      "Every score produces exactly one letter, so this is a transform: one `append` per pass, no skipping.",
      "Test the highest band first, then work down with `elif`, so a 95 stops at A before it reaches the B test.",
      "\"90 and up\" includes 90 itself; anything that passes none of the tests is an F, which is what `else` is for.",
    ],
    explanation: "Each score goes through an `if`/`elif`/`else` chain from the highest cutoff down, and exactly one letter is appended per score. Checking from the top means each test only needs a lower bound. The usual bugs are `>` instead of `>=` (a 90 becomes a B) and checking the lowest band first, which turns every passing score into a D.",
    code: {
      starter: src`
def letter_grades(scores):
    grades = []
    return grades

print(letter_grades([95, 72, 58]))
`,
      answer: src`
def letter_grades(scores):
    grades = []
    for score in scores:
        if score >= 90:
            grades.append("A")
        elif score >= 80:
            grades.append("B")
        elif score >= 70:
            grades.append("C")
        elif score >= 60:
            grades.append("D")
        else:
            grades.append("F")
    return grades

print(letter_grades([95, 72, 58]))
`,
      alternatives: [
        src`
def grade(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"

def letter_grades(scores):
    grades = []
    for score in scores:
        grades.append(grade(score))
    return grades
`,
        src`
def letter_grades(scores):
    cutoffs = [(90, "A"), (80, "B"), (70, "C"), (60, "D")]
    grades = []
    for score in scores:
        letter = "F"
        for cutoff, grade in cutoffs:
            if score >= cutoff:
                letter = grade
                break
        grades.append(letter)
    return grades
`,
      ],
      wrong: [
        {
          code: src`
def letter_grades(scores):
    grades = []
    for score in scores:
        if score > 90:
            grades.append("A")
        elif score > 80:
            grades.append("B")
        elif score > 70:
            grades.append("C")
        elif score > 60:
            grades.append("D")
        else:
            grades.append("F")
    return grades
`,
          fails: ["returns"],
          why: "`>` moves every boundary score down a grade: 90 becomes a B",
        },
        {
          code: src`
def letter_grades(scores):
    grades = []
    for score in scores:
        if score >= 60:
            grades.append("D")
        elif score >= 70:
            grades.append("C")
        elif score >= 80:
            grades.append("B")
        elif score >= 90:
            grades.append("A")
        else:
            grades.append("F")
    return grades
`,
          fails: ["returns"],
          why: "the lowest band is tested first, so every passing score stops at D",
        },
        {
          code: src`
def letter_grades(scores):
    grades = []
    for score in scores:
        if score >= 90:
            grades.append("A")
        elif score >= 80:
            grades.append("B")
        elif score >= 70:
            grades.append("C")
        elif score >= 60:
            grades.append("D")
    return grades
`,
          fails: ["returns"],
          why: "failing scores get no letter at all, so the list is shorter than the class",
        },
      ],
      task: {
        checks: [
          fn("returns", "letter_grades", [
            example([[95, 72, 58]], ["A", "C", "F"]),
            example([[80, 89, 61]], ["B", "B", "D"]),
            example([[]], []),
            hiddenCase("scores exactly on each boundary", [[90, 80, 70, 60]], ["A", "B", "C", "D"]),
            hiddenCase("scores one below each boundary", [[89, 79, 69, 59]], ["B", "C", "D", "F"]),
            hiddenCase("a perfect score and zero", [[100, 0]], ["A", "F"]),
            hiddenCase("a single score", [[75]], ["C"]),
          ], { label: "letter_grades() gives every score its letter" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-06",
    version: 2,
    slug: "cancelled-invoice-lines",
    title: "Lines from cancelled invoices",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "string-method", "truthiness", "comparison"],
    prompt: "In the Online Retail II data, an invoice number that starts with `C` is a cancellation. The returns team wants the stock codes on cancelled invoices so they can restock them.",
    spec: [
      ["Function", "`cancelled_codes(lines)`"],
      ["lines", "a list of invoice lines: dictionaries with `\"Invoice\"`, `\"StockCode\"` and `\"Quantity\"`"],
      ["Returns", "the `StockCode` of every line whose `Invoice` starts with `\"C\"`, in the order the lines appear"],
      ["Rules", "only the invoice number decides; a stock code that starts with C (such as the carriage charge `C2`) does not make a line cancelled"],
    ],
    hiddenKinds: ["a stock code that starts with C on a normal invoice", "a negative quantity on an invoice that is not a cancellation", "every line cancelled", "no lines at all"],
    hints: [
      "Keep some lines and return one field from each: the filter pattern.",
      "`startswith` (see Strings & Text) answers whether a text begins with another text.",
      "Test the `Invoice` field, append the `StockCode` field.",
    ],
    explanation: "Walk the lines and keep the stock code when `line[\"Invoice\"].startswith(\"C\")`. The quantity is a tempting shortcut, because cancellations have negative quantities, but stock adjustments are negative too, so the invoice prefix is the rule the data defines.",
    code: {
      starter: src`
def cancelled_codes(lines):
    codes = []
    return codes

lines = [
    {"Invoice": "489438", "StockCode": "21329", "Quantity": 28},
    {"Invoice": "C489528", "StockCode": "85048", "Quantity": -1},
    {"Invoice": "489438", "StockCode": "21252", "Quantity": 30},
    {"Invoice": "C489541", "StockCode": "21254", "Quantity": -4},
]
print(cancelled_codes(lines))
`,
      answer: src`
def cancelled_codes(lines):
    codes = []
    for line in lines:
        if line["Invoice"].startswith("C"):
            codes.append(line["StockCode"])
    return codes

lines = [
    {"Invoice": "489438", "StockCode": "21329", "Quantity": 28},
    {"Invoice": "C489528", "StockCode": "85048", "Quantity": -1},
    {"Invoice": "489438", "StockCode": "21252", "Quantity": 30},
    {"Invoice": "C489541", "StockCode": "21254", "Quantity": -4},
]
print(cancelled_codes(lines))
`,
      alternatives: [
        src`
def cancelled_codes(lines):
    codes = []
    for line in lines:
        invoice = line["Invoice"]
        if invoice[0] == "C":
            codes.append(line["StockCode"])
    return codes
`,
      ],
      wrong: [
        {
          code: src`
def cancelled_codes(lines):
    codes = []
    for line in lines:
        if line["Quantity"] < 0:
            codes.append(line["StockCode"])
    return codes
`,
          fails: ["returns"],
          why: "a negative quantity also appears on stock adjustments that are not cancellations",
        },
        {
          code: src`
def cancelled_codes(lines):
    codes = []
    for line in lines:
        if line["StockCode"].startswith("C"):
            codes.append(line["StockCode"])
    return codes
`,
          fails: ["returns"],
          why: "it tests the stock code instead of the invoice number",
        },
        {
          code: src`
def cancelled_codes(lines):
    codes = []
    for line in lines:
        if line["Invoice"].startswith("C"):
            codes.append(line["Invoice"])
    return codes
`,
          fails: ["returns"],
          why: "it returns the invoice numbers, not the stock codes",
        },
      ],
      task: {
        checks: [
          fn("returns", "cancelled_codes", [
            example([invoiceLines], ["85048", "21254"]),
            example([[{ Invoice: "489439", StockCode: "22139", Quantity: 6 }]], []),
            example([[{ Invoice: "C489555", StockCode: "21260", Quantity: -6 }]], ["21260"]),
            hiddenCase("a stock code that starts with C on a normal invoice", [[{ Invoice: "489439", StockCode: "C2", Quantity: 1 }, { Invoice: "C489563", StockCode: "90088", Quantity: -24 }]], ["90088"]),
            hiddenCase("a negative quantity on an invoice that is not a cancellation", [[{ Invoice: "489900", StockCode: "22139", Quantity: -12 }]], []),
            hiddenCase("every line cancelled", [[{ Invoice: "C1", StockCode: "A", Quantity: -1 }, { Invoice: "C2", StockCode: "B", Quantity: -2 }]], ["A", "B"]),
            hiddenCase("no lines at all", [[]], []),
          ], { label: "cancelled_codes() returns the stock codes on cancelled invoices" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-10",
    version: 2,
    slug: "duplicate-stock-codes",
    title: "Duplicate stock codes in a catalogue",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "else-clause", "nested-condition", "logical", "arithmetic", "comparison"],
    prompt: "Every product in a catalogue should have its own stock code. Before importing a catalogue, report the codes that break that rule.",
    spec: [
      ["Function", "`repeated_codes(products)`"],
      ["products", "a list of dictionaries with `\"stock_code\"` and `\"description\"`"],
      ["Returns", "each stock code that appears more than once, reported **once**, in the order the repeats are found (the moment its second copy is reached)"],
      ["Rules", "codes are compared exactly: `84031a` and `84031A` are different codes; no repeats gives `[]`"],
    ],
    hiddenKinds: ["no repeated codes", "a code repeated three times", "repeats found in a different order from first appearance", "codes that differ only in capital letters", "an empty catalogue"],
    hints: [
      "You need to remember two things: which codes you have seen, and which ones you have already reported.",
      "A code is a repeat when it is already in the seen list. Report it only if it isn't already in the report.",
      "A code goes into the report at the moment its second copy is reached, not when it first appears.",
    ],
    explanation: "Keep a `seen` list and a `repeated` list. For each code: if it was seen before and isn't reported yet, report it; otherwise remember it as seen. Reporting at the second copy gives the order the problems are found in, and the extra `not in repeated` test stops a third copy from being reported twice. Counting with a dictionary and reporting when a count reaches exactly 2 is the same idea.",
    code: {
      starter: src`
def repeated_codes(products):
    repeated = []
    return repeated

catalogue = [
    {"stock_code": "21329", "description": "DINOSAURS WRITING SET"},
    {"stock_code": "84031A", "description": "CHARLIE+LOLA RED HOT WATER BOTTLE"},
    {"stock_code": "21329", "description": "DINOSAUR WRITING SET"},
    {"stock_code": "22139", "description": "RETRO SPOT TEA SET CERAMIC"},
    {"stock_code": "84031A", "description": "RED HOT WATER BOTTLE"},
]
print(repeated_codes(catalogue))
`,
      answer: src`
def repeated_codes(products):
    seen = []
    repeated = []
    for product in products:
        code = product["stock_code"]
        if code in seen:
            if code not in repeated:
                repeated.append(code)
        else:
            seen.append(code)
    return repeated

catalogue = [
    {"stock_code": "21329", "description": "DINOSAURS WRITING SET"},
    {"stock_code": "84031A", "description": "CHARLIE+LOLA RED HOT WATER BOTTLE"},
    {"stock_code": "21329", "description": "DINOSAUR WRITING SET"},
    {"stock_code": "22139", "description": "RETRO SPOT TEA SET CERAMIC"},
    {"stock_code": "84031A", "description": "RED HOT WATER BOTTLE"},
]
print(repeated_codes(catalogue))
`,
      alternatives: [
        src`
def repeated_codes(products):
    counts = {}
    repeated = []
    for product in products:
        code = product["stock_code"]
        if code not in counts:
            counts[code] = 0
        counts[code] += 1
        if counts[code] == 2:
            repeated.append(code)
    return repeated
`,
      ],
      wrong: [
        {
          code: src`
def repeated_codes(products):
    seen = []
    repeated = []
    for product in products:
        code = product["stock_code"]
        if code in seen:
            repeated.append(code)
        else:
            seen.append(code)
    return repeated
`,
          fails: ["returns"],
          why: "a code with three copies is reported twice",
        },
        {
          code: src`
def repeated_codes(products):
    counts = {}
    for product in products:
        code = product["stock_code"]
        if code not in counts:
            counts[code] = 0
        counts[code] += 1
    repeated = []
    for code, count in counts.items():
        if count > 1:
            repeated.append(code)
    return repeated
`,
          fails: ["returns"],
          why: "codes come out in first-seen order, not in the order the repeats are found",
        },
        {
          code: src`
def repeated_codes(products):
    seen = []
    repeated = []
    for product in products:
        code = product["stock_code"].upper()
        if code in seen:
            if code not in repeated:
                repeated.append(code)
        else:
            seen.append(code)
    return repeated
`,
          fails: ["returns"],
          why: "upper-casing the codes treats two different codes as the same one",
        },
      ],
      task: {
        checks: [
          fn("returns", "repeated_codes", [
            example([codes("21329", "84031A", "21329", "22139", "84031A")], ["21329", "84031A"]),
            example([codes("21329", "84031A")], []),
            example([codes("85048", "85048")], ["85048"]),
            hiddenCase("no repeated codes", [codes("A", "B", "C")], []),
            hiddenCase("a code repeated three times", [codes("X", "X", "Y", "X")], ["X"]),
            hiddenCase("repeats found in a different order from first appearance", [codes("B", "A", "A", "B")], ["A", "B"]),
            hiddenCase("codes that differ only in capital letters", [codes("84031a", "84031A")], []),
            hiddenCase("an empty catalogue", [[]], []),
          ], { label: "repeated_codes() reports each repeated code once, in the order found" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q12-12",
    version: 2,
    slug: "parse-invoice-lines",
    title: "Parse raw invoice lines",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "conversion", "none-value", "string-method", "string-split", "spaces-in-text", "comparison", "else-clause", "logical", "reassignment", "tuple-unpack", "conditional-expr", "truthiness"],
    prompt: "An export arrives as plain text lines, one invoice line each, with fields separated by commas: invoice, stock code, description, quantity, price, customer ID. Turn every line into a dictionary with proper types so the rest of the pipeline can do arithmetic on it.",
    spec: [
      ["Function", "`parse_lines(lines)`"],
      ["lines", "a list of texts like `\"489438,21329,DINOSAURS  WRITING SET,28,0.98,18102\"` (descriptions never contain commas)"],
      ["Returns", "a new list with one dictionary per line: `invoice` (text), `stock_code` (text), `description`, `quantity` (int), `price` (float), `customer_id`"],
      ["description", "spaces at the ends removed and each double space replaced by one space"],
      ["customer_id", "the text, or `None` when that field is empty (anonymous orders)"],
    ],
    hiddenKinds: ["an anonymous line with no customer ID", "a cancellation with a negative quantity", "a whole-number price", "a description with spaces at the ends", "no lines at all"],
    hints: [
      "One dictionary per line: a transform. `split(\",\")` (see String Algorithms) turns a line into its six fields.",
      "Unpack or index the six pieces, then convert: `int` for the quantity, `float` for the price.",
      "Clean the description with `strip` and `replace`, and choose between the text and `None` with an `if` on the last field.",
    ],
    explanation: "Each line is split on commas into six fields. The quantity and price are converted with `int` and `float`, the description is stripped and has its double spaces replaced, and an empty customer field becomes `None` so later code can test for anonymous orders with `is None`. Forgetting a conversion leaves text that can't be multiplied; keeping `\"\"` for the customer hides the missing value.",
    code: {
      starter: src`
def parse_lines(lines):
    rows = []
    return rows

raw = [
    "489438,21329,DINOSAURS  WRITING SET,28,0.98,18102",
    "C489528,85048,15CM CHRISTMAS GLASS BALL 20 LIGHTS,-1,7.95,16714",
    "489439,22139,RETRO SPOT TEA SET CERAMIC ,6,4.95,",
]
for row in parse_lines(raw):
    print(row)
`,
      answer: src`
def parse_lines(lines):
    rows = []
    for line in lines:
        invoice, code, description, quantity, price, customer = line.split(",")
        if customer == "":
            customer = None
        row = {"invoice": invoice, "stock_code": code}
        row["description"] = description.strip().replace("  ", " ")
        row["quantity"] = int(quantity)
        row["price"] = float(price)
        row["customer_id"] = customer
        rows.append(row)
    return rows

raw = [
    "489438,21329,DINOSAURS  WRITING SET,28,0.98,18102",
    "C489528,85048,15CM CHRISTMAS GLASS BALL 20 LIGHTS,-1,7.95,16714",
    "489439,22139,RETRO SPOT TEA SET CERAMIC ,6,4.95,",
]
for row in parse_lines(raw):
    print(row)
`,
      alternatives: [
        src`
def parse_lines(lines):
    rows = []
    for line in lines:
        fields = line.split(",")
        row = {}
        row["invoice"] = fields[0]
        row["stock_code"] = fields[1]
        row["description"] = fields[2].replace("  ", " ").strip()
        row["quantity"] = int(fields[3])
        row["price"] = float(fields[4])
        row["customer_id"] = fields[5] if fields[5] else None
        rows.append(row)
    return rows
`,
      ],
      wrong: [
        {
          code: src`
def parse_lines(lines):
    rows = []
    for line in lines:
        invoice, code, description, quantity, price, customer = line.split(",")
        if customer == "":
            customer = None
        rows.append({"invoice": invoice, "stock_code": code, "description": description.strip().replace("  ", " "), "quantity": quantity, "price": price, "customer_id": customer})
    return rows
`,
          fails: ["returns"],
          why: "the quantity and price stay as text, so `quantity * price` would fail later",
        },
        {
          code: src`
def parse_lines(lines):
    rows = []
    for line in lines:
        invoice, code, description, quantity, price, customer = line.split(",")
        rows.append({"invoice": invoice, "stock_code": code, "description": description.strip().replace("  ", " "), "quantity": int(quantity), "price": float(price), "customer_id": customer})
    return rows
`,
          fails: ["returns"],
          why: "an anonymous line keeps an empty text instead of None",
        },
        {
          code: src`
def parse_lines(lines):
    rows = []
    for line in lines:
        invoice, code, description, quantity, price, customer = line.split(",")
        if customer == "":
            customer = None
        rows.append({"invoice": invoice, "stock_code": code, "description": description, "quantity": int(quantity), "price": float(price), "customer_id": customer})
    return rows
`,
          fails: ["returns"],
          why: "the description keeps its double spaces and trailing space",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_lines", [
            example([["489438,21329,DINOSAURS  WRITING SET,28,0.98,18102"]], [{ invoice: "489438", stock_code: "21329", description: "DINOSAURS WRITING SET", quantity: 28, price: 0.98, customer_id: "18102" }]),
            example([["489438,21252,SET OF MEADOW  FLOWER STICKERS,30,1.69,18102", "489438,20711,JUMBO BAG TOYS,60,1.3,18102"]], [
              { invoice: "489438", stock_code: "21252", description: "SET OF MEADOW FLOWER STICKERS", quantity: 30, price: 1.69, customer_id: "18102" },
              { invoice: "489438", stock_code: "20711", description: "JUMBO BAG TOYS", quantity: 60, price: 1.3, customer_id: "18102" },
            ]),
            example([[]], []),
            hiddenCase("an anonymous line with no customer ID", [["489439,22139,RETRO SPOT TEA SET CERAMIC,6,4.95,"]], [{ invoice: "489439", stock_code: "22139", description: "RETRO SPOT TEA SET CERAMIC", quantity: 6, price: 4.95, customer_id: null }]),
            hiddenCase("a cancellation with a negative quantity", [["C489528,85048,15CM CHRISTMAS GLASS BALL 20 LIGHTS,-1,7.95,16714"]], [{ invoice: "C489528", stock_code: "85048", description: "15CM CHRISTMAS GLASS BALL 20 LIGHTS", quantity: -1, price: 7.95, customer_id: "16714" }]),
            hiddenCase("a whole-number price", [["489438,21033,JUMBO BAG CHARLIE AND LOLA TOYS,30,2,18102"]], [{ invoice: "489438", stock_code: "21033", description: "JUMBO BAG CHARLIE AND LOLA TOYS", quantity: 30, price: py.float(2), customer_id: "18102" }]),
            hiddenCase("a description with spaces at the ends", [["489440,21411, GINGHAM HEART  DOORSTOP RED ,32,2.5,13085"]], [{ invoice: "489440", stock_code: "21411", description: "GINGHAM HEART DOORSTOP RED", quantity: 32, price: 2.5, customer_id: "13085" }]),
          ], { label: "parse_lines() turns each text line into a typed dictionary" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-16",
    version: 2,
    slug: "search-the-catalogue",
    title: "Search the catalogue under a budget",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "comparison", "logical", "string-method", "spaces-in-text", "print-several", "print-text", "continue-statement"],
    prompt: "A shop assistant types a few words and a budget, and wants the stock codes of the matching products. Product descriptions in this catalogue are all capitals; people type however they like.",
    spec: [
      ["Function", "`search_products(products, query, max_price)`"],
      ["products", "a list of dictionaries with `stock_code`, `description` and `list_price`"],
      ["Match", "the description contains the query, ignoring capital letters and spaces at the ends of the query, **and** `list_price` is at most `max_price`"],
      ["Returns", "the matching stock codes, in catalogue order"],
      ["Rules", "a query that is empty after stripping matches every description"],
    ],
    hiddenKinds: ["a price exactly at the budget", "an empty query", "a query in mixed case with spaces at the ends", "nothing within the budget", "an empty catalogue"],
    hints: [
      "Two tests must both pass for a product to be kept.",
      "Make both texts the same case before using `in`, and strip the query once, before the loop.",
      "\"At most\" includes the budget itself. An empty text is inside every text, so the empty-query rule needs no extra code.",
    ],
    explanation: "Clean the query once (`strip`, `lower`), then keep a product when the cleaned query is `in` its lowercased description and its price is `<=` the budget. Lowercasing only one side is the classic miss: `\"hot water\"` is never inside `\"…HOT WATER BOTTLE\"`. Because `\"\" in text` is always True, the empty-query rule falls out of the same test.",
    code: {
      starter: src`
def search_products(products, query, max_price):
    found = []
    return found

catalogue = [
    {"stock_code": "21329", "description": "DINOSAURS  WRITING SET", "list_price": 0.98},
    {"stock_code": "84031A", "description": "CHARLIE+LOLA RED HOT WATER BOTTLE", "list_price": 3.0},
    {"stock_code": "84031B", "description": "CHARLIE LOLA BLUE HOT WATER BOTTLE", "list_price": 3.0},
    {"stock_code": "21411", "description": "GINGHAM HEART  DOORSTOP RED", "list_price": 2.5},
    {"stock_code": "85132A", "description": "CHARLIE + LOLA BISCUITS TINS", "list_price": 6.38},
]
print(search_products(catalogue, "hot water", 5))
`,
      answer: src`
def search_products(products, query, max_price):
    wanted = query.strip().lower()
    found = []
    for product in products:
        matches = wanted in product["description"].lower()
        if matches and product["list_price"] <= max_price:
            found.append(product["stock_code"])
    return found

catalogue = [
    {"stock_code": "21329", "description": "DINOSAURS  WRITING SET", "list_price": 0.98},
    {"stock_code": "84031A", "description": "CHARLIE+LOLA RED HOT WATER BOTTLE", "list_price": 3.0},
    {"stock_code": "84031B", "description": "CHARLIE LOLA BLUE HOT WATER BOTTLE", "list_price": 3.0},
    {"stock_code": "21411", "description": "GINGHAM HEART  DOORSTOP RED", "list_price": 2.5},
    {"stock_code": "85132A", "description": "CHARLIE + LOLA BISCUITS TINS", "list_price": 6.38},
]
print(search_products(catalogue, "hot water", 5))
`,
      alternatives: [
        src`
def search_products(products, query, max_price):
    found = []
    for product in products:
        if product["list_price"] > max_price:
            continue
        if query.strip().upper() in product["description"].upper():
            found.append(product["stock_code"])
    return found
`,
      ],
      wrong: [
        {
          code: src`
def search_products(products, query, max_price):
    found = []
    for product in products:
        if query.strip().lower() in product["description"] and product["list_price"] <= max_price:
            found.append(product["stock_code"])
    return found
`,
          fails: ["returns"],
          why: "only the query is lowercased, so it never matches the capitalised descriptions",
        },
        {
          code: src`
def search_products(products, query, max_price):
    found = []
    for product in products:
        if query.strip().lower() in product["description"].lower() and product["list_price"] < max_price:
            found.append(product["stock_code"])
    return found
`,
          fails: ["returns"],
          why: "`<` leaves out a product that costs exactly the budget",
        },
        {
          code: src`
def search_products(products, query, max_price):
    found = []
    for product in products:
        if query.lower() in product["description"].lower() and product["list_price"] <= max_price:
            found.append(product["stock_code"])
    return found
`,
          fails: ["returns"],
          why: "the spaces around a typed query are kept, so ` red ` doesn't match a description ending in RED",
        },
      ],
      task: {
        checks: [
          fn("returns", "search_products", [
            example([catalogue, "hot water", 5], ["84031A", "84031B"]),
            example([catalogue, "charlie", 4], ["84031A", "84031B"]),
            example([catalogue, "teapot", 10], []),
            hiddenCase("a price exactly at the budget", [catalogue, "doorstop", 2.5], ["21411"]),
            hiddenCase("an empty query", [catalogue, "   ", 1], ["21329"]),
            hiddenCase("a query in mixed case with spaces at the ends", [catalogue, " Red ", 3], ["84031A", "21411"]),
            hiddenCase("nothing within the budget", [catalogue, "lola", 0.5], []),
            hiddenCase("an empty catalogue", [[], "set", 100], []),
          ], { label: "search_products() matches the words and the budget" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-13",
    version: 2,
    slug: "every-order-paid-every-way",
    title: "Every order paid every way",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "logical", "list-copy", "else-clause"],
    prompt: "`methods_by_order` should list the distinct payment methods used for each order. Instead, every order in the report shows every method anyone used. Find the bug and fix it so each order has its own list.",
    spec: [
      ["Function", "`methods_by_order(payments)`"],
      ["payments", "a list of payment attempts: dictionaries with `payment_id`, `order_id` and `method`"],
      ["Returns", "`{order_id: [methods]}`, each method listed once per order, in the order it was first used for that order"],
      ["Keep", "the function name and what it returns; only the bug should change"],
    ],
    hiddenKinds: ["a single payment", "one order retried with the same method", "payments for different orders interleaved", "no payments"],
    hints: [
      "Run the starter and print the result: are the lists for two orders really different lists?",
      "`groups[key] = some_list` stores that very list, not a copy. If every new key gets the same list, appending under one key appends under all of them.",
      "Give each new order its own empty list at the moment the order is first seen.",
    ],
    explanation: "`no_methods` is one list object, and every new order was given that same object, so all keys shared one list and every `append` showed up everywhere. Creating a fresh `[]` for each new key (or a `copy()` of the empty list) gives each order its own group. The `not in` test inside the group is correct and must stay, or a retried payment lists its method twice.",
    code: {
      starter: src`
def methods_by_order(payments):
    no_methods = []
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        if order_id not in methods:
            methods[order_id] = no_methods
        if payment["method"] not in methods[order_id]:
            methods[order_id].append(payment["method"])
    return methods

payments = [
    {"payment_id": "PAY0000416", "order_id": "O100376", "method": "gift_card"},
    {"payment_id": "PAY0000417", "order_id": "O100376", "method": "gift_card"},
    {"payment_id": "PAY0001503", "order_id": "O101341", "method": "card"},
    {"payment_id": "PAY0001504", "order_id": "O101341", "method": "paypal"},
]
print(methods_by_order(payments))
`,
      answer: src`
def methods_by_order(payments):
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        if order_id not in methods:
            methods[order_id] = []
        if payment["method"] not in methods[order_id]:
            methods[order_id].append(payment["method"])
    return methods

payments = [
    {"payment_id": "PAY0000416", "order_id": "O100376", "method": "gift_card"},
    {"payment_id": "PAY0000417", "order_id": "O100376", "method": "gift_card"},
    {"payment_id": "PAY0001503", "order_id": "O101341", "method": "card"},
    {"payment_id": "PAY0001504", "order_id": "O101341", "method": "paypal"},
]
print(methods_by_order(payments))
`,
      alternatives: [
        src`
def methods_by_order(payments):
    no_methods = []
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        if order_id not in methods:
            methods[order_id] = no_methods.copy()
        if payment["method"] not in methods[order_id]:
            methods[order_id].append(payment["method"])
    return methods
`,
        src`
def methods_by_order(payments):
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        method = payment["method"]
        if order_id not in methods:
            methods[order_id] = [method]
        elif method not in methods[order_id]:
            methods[order_id].append(method)
    return methods
`,
      ],
      wrong: [
        {
          code: src`
def methods_by_order(payments):
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        if order_id not in methods:
            methods[order_id] = []
        methods[order_id].append(payment["method"])
    return methods
`,
          fails: ["returns"],
          why: "the shared list is fixed, but a retried payment now lists its method twice",
        },
        {
          code: src`
def methods_by_order(payments):
    methods = {}
    for payment in payments:
        order_id = payment["order_id"]
        methods[order_id] = []
        if payment["method"] not in methods[order_id]:
            methods[order_id].append(payment["method"])
    return methods
`,
          fails: ["returns"],
          why: "a new list on every pass throws away the methods recorded before, keeping only the last",
        },
      ],
      task: {
        checks: [
          fn("returns", "methods_by_order", [
            example([payments], { O100376: ["gift_card"], O101341: ["card", "paypal"] }),
            example([[{ payment_id: "P1", order_id: "O103199", method: "paypal" }, { payment_id: "P2", order_id: "O103302", method: "apple_pay" }]], { O103199: ["paypal"], O103302: ["apple_pay"] }),
            example([[{ payment_id: "P1", order_id: "O1", method: "card" }, { payment_id: "P2", order_id: "O1", method: "paypal" }, { payment_id: "P3", order_id: "O1", method: "card" }]], { O1: ["card", "paypal"] }),
            hiddenCase("a single payment", [[{ payment_id: "P1", order_id: "O7", method: "bank_transfer" }]], { O7: ["bank_transfer"] }),
            hiddenCase("one order retried with the same method", [[{ payment_id: "P1", order_id: "O2", method: "card" }, { payment_id: "P2", order_id: "O2", method: "card" }, { payment_id: "P3", order_id: "O2", method: "card" }]], { O2: ["card"] }),
            hiddenCase("payments for different orders interleaved", [[{ payment_id: "P1", order_id: "A", method: "card" }, { payment_id: "P2", order_id: "B", method: "paypal" }, { payment_id: "P3", order_id: "A", method: "gift_card" }, { payment_id: "P4", order_id: "B", method: "card" }]], { A: ["card", "gift_card"], B: ["paypal", "card"] }),
            hiddenCase("no payments", [[]], {}),
          ], { label: "methods_by_order() gives each order its own list of methods" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-19",
    version: 2,
    slug: "join-without-the-inner-loop",
    title: "Join without the inner loop",
    format: "refactoring",
    difficulty: "medium",
    minutes: 15,
    requires: [...fnBase, "comparison", "else-clause", "nested-loop", "print-several", "reassignment"],
    prompt: "`attach_cities` gives the right answers, but it compares every order with every customer. With 2,000 orders and 2,000 customers that is four million comparisons, and the nightly report is slow. Refactor it to build an index once and look each order up. **Behaviour must not change**, including two details of the original: an unknown customer gets the city `\"unknown\"`, and because the inner loop never stops early, when a customer ID appears twice the **last** matching record wins.",
    spec: [
      ["Function", "`attach_cities(orders, customers)` (same name, same result)"],
      ["orders", "dictionaries with `order_id` and `customer_id`"],
      ["customers", "dictionaries with `customer_id` and `city`"],
      ["Returns", "a new list with one `{\"order_id\": …, \"city\": …}` per order, in order"],
      ["Speed", "each order must be found with a lookup, not by scanning the whole customer list"],
    ],
    hiddenKinds: ["a customer ID listed twice", "an order from an unknown customer", "no orders", "no customers", "a large order book (comparison count)"],
    hints: [
      "Keep the result-building loop; replace only the inner search.",
      "Before the order loop, walk `customers` once and store each city under its customer ID. A later record with the same ID overwrites the earlier one, which is exactly what the original did.",
      "In the order loop, check the ID with `in` and use `\"unknown\"` when it is missing.",
    ],
    explanation: "Building `city_of = {customer_id: city}` costs one pass over the customers; after that, each order is one dictionary lookup, so the work grows with orders + customers instead of orders × customers. Plain assignment into the index lets a later duplicate overwrite an earlier one, which preserves the original's last-match behaviour; adding `if … not in city_of` before storing (or a `break` in the old loop) would quietly change it to first-match.",
    code: {
      starter: src`
def attach_cities(orders, customers):
    result = []
    for order in orders:
        city = "unknown"
        for customer in customers:
            if customer["customer_id"] == order["customer_id"]:
                city = customer["city"]
        result.append({"order_id": order["order_id"], "city": city})
    return result

customers = [
    {"customer_id": "C00038", "city": "New York"},
    {"customer_id": "C00077", "city": "Houston"},
    {"customer_id": "C01338", "city": "New York"},
]
orders = [
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O121005", "customer_id": "C08398"},
    {"order_id": "O101341", "customer_id": "C00038"},
]
print(attach_cities(orders, customers))
`,
      answer: src`
def attach_cities(orders, customers):
    city_of = {}
    for customer in customers:
        city_of[customer["customer_id"]] = customer["city"]
    result = []
    for order in orders:
        city = "unknown"
        if order["customer_id"] in city_of:
            city = city_of[order["customer_id"]]
        result.append({"order_id": order["order_id"], "city": city})
    return result

customers = [
    {"customer_id": "C00038", "city": "New York"},
    {"customer_id": "C00077", "city": "Houston"},
    {"customer_id": "C01338", "city": "New York"},
]
orders = [
    {"order_id": "O101219", "customer_id": "C00077"},
    {"order_id": "O121005", "customer_id": "C08398"},
    {"order_id": "O101341", "customer_id": "C00038"},
]
print(attach_cities(orders, customers))
`,
      alternatives: [
        src`
def attach_cities(orders, customers):
    by_id = {}
    for customer in customers:
        by_id[customer["customer_id"]] = customer
    result = []
    for order in orders:
        if order["customer_id"] in by_id:
            result.append({"order_id": order["order_id"], "city": by_id[order["customer_id"]]["city"]})
        else:
            result.append({"order_id": order["order_id"], "city": "unknown"})
    return result
`,
      ],
      wrong: [
        {
          code: src`
def attach_cities(orders, customers):
    city_of = {}
    for customer in customers:
        if customer["customer_id"] not in city_of:
            city_of[customer["customer_id"]] = customer["city"]
    result = []
    for order in orders:
        city = "unknown"
        if order["customer_id"] in city_of:
            city = city_of[order["customer_id"]]
        result.append({"order_id": order["order_id"], "city": city})
    return result
`,
          fails: ["returns"],
          why: "fast, but the first record for a duplicated customer wins, which changes the behaviour",
        },
        {
          code: src`
def attach_cities(orders, customers):
    result = []
    for order in orders:
        city = "unknown"
        for customer in customers:
            if customer["customer_id"] == order["customer_id"]:
                city = customer["city"]
                break
        result.append({"order_id": order["order_id"], "city": city})
    return result
`,
          fails: ["returns", "lookups"],
          why: "`break` stops at the first match (changing the result for duplicates) and it still scans the list",
        },
        {
          code: src`
def attach_cities(orders, customers):
    city_of = {}
    for customer in customers:
        city_of[customer["customer_id"]] = customer["city"]
    result = []
    for order in orders:
        result.append({"order_id": order["order_id"], "city": city_of[order["customer_id"]]})
    return result
`,
          fails: ["returns"],
          why: "an unknown customer raises KeyError instead of getting \"unknown\"",
        },
      ],
      task: {
        checks: [
          fn("returns", "attach_cities", [
            example([cityOrders, cityCustomers], [{ order_id: "O101219", city: "Houston" }, { order_id: "O121005", city: "unknown" }, { order_id: "O101341", city: "New York" }]),
            example([[{ order_id: "O1", customer_id: "C01338" }, { order_id: "O2", customer_id: "C01338" }], cityCustomers], [{ order_id: "O1", city: "New York" }, { order_id: "O2", city: "New York" }]),
            example([[], cityCustomers], []),
            hiddenCase("a customer ID listed twice", [[{ order_id: "O9", customer_id: "C5" }], [{ customer_id: "C5", city: "Austin" }, { customer_id: "C6", city: "Denver" }, { customer_id: "C5", city: "Dallas" }]], [{ order_id: "O9", city: "Dallas" }]),
            hiddenCase("an order from an unknown customer", [[{ order_id: "O3", customer_id: "C99999" }], cityCustomers], [{ order_id: "O3", city: "unknown" }]),
            hiddenCase("no customers", [[{ order_id: "O4", customer_id: "C00038" }], []], [{ order_id: "O4", city: "unknown" }]),
          ], { label: "attach_cities() still returns exactly what the original did" }),
          {
            kind: "expr",
            id: "lookups",
            label: "attach_cities() looks customers up instead of scanning the whole list for every order",
            hidden: true,
            expr: [
              "_n = [0]",
              "class _Id(str):",
              "    def __eq__(self, other):",
              "        _n[0] += 1",
              "        return str.__eq__(self, other)",
              "    __hash__ = str.__hash__",
              "_customers = [{'customer_id': _Id('C%04d' % _i), 'city': 'X'} for _i in range(300)]",
              "_orders = [{'order_id': 'O%d' % _i, 'customer_id': _Id('C%04d' % ((_i * 7) % 300))} for _i in range(300)]",
              "attach_cities(_orders, _customers)",
              "result = _n[0] <= 3000",
            ].join("\n"),
            expected: py.bool(true),
            tip: "300 orders × 300 customers is 90,000 comparisons when every order scans the list. Build a dictionary from customer ID to city first, then look each order up.",
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q12-03",
    version: 2,
    slug: "top-sellers-per-category",
    title: "Top sellers in each category",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "comparison", "logical", "else-clause", "none-value", "identity", "len-call", "range-call", "while-loop", "nested-loop", "dict-iterate", "tuple-unpack", "print-several", "reassignment", "precedence", "enumerate-call", "string-slice", "list-sort", "boolean"],
    prompt: "Merchandising wants the best sellers per category for the home page. Given one row per product with its units sold, return the names of the top `n` products in each category, best first.",
    spec: [
      ["Function", "`top_products(rows, n)`"],
      ["rows", "dictionaries with `category`, `product` and `units` (a whole number)"],
      ["n", "how many products to return per category, at least 1"],
      ["Returns", "`{category: [product names]}` with at most `n` names per category, most units first; `{}` for no rows"],
      ["Ties", "products with the same units keep the order of the rows (the earlier row ranks higher)"],
    ],
    hiddenKinds: ["a tie for the last place", "n larger than a category", "a single category", "rows listed lowest first", "n of 1"],
    hints: [
      "Split the problem: first group the rows by category (a dictionary of lists), then rank each group on its own.",
      "To rank a group without a key function, repeatedly pick the best row you haven't taken yet: walk the group, remember the position of the largest `units`, and take it.",
      "Use a strict `>` when comparing, so on a tie the earlier row stays the best. Stop after `n` picks or when the group runs out.",
    ],
    explanation: "Group first, rank second. Each category's rows go into a list; then a selection loop takes the best remaining row up to `n` times, remembering which positions were taken. A strict `>` keeps the earlier row on a tie. Another valid approach builds tuples `(-units, position, name)` and uses plain `sorted`, because tuples compare item by item: fewer units sorts later, and the position breaks ties. Ranking the whole list instead of each group, or using `>=`, are the usual mistakes.",
    code: {
      starter: src`
def top_products(rows, n):
    top = {}
    return top

rows = [
    {"category": "sports", "product": "Ultra Bike Light", "units": 14},
    {"category": "home", "product": "Deluxe Vase", "units": 9},
    {"category": "sports", "product": "Travel Yoga Mat", "units": 21},
    {"category": "electronics", "product": "Organic Speaker", "units": 6},
    {"category": "sports", "product": "Studio Tent", "units": 14},
    {"category": "home", "product": "Nordic Candle", "units": 12},
]
print(top_products(rows, 2))
`,
      answer: src`
def top_products(rows, n):
    groups = {}
    for row in rows:
        if row["category"] not in groups:
            groups[row["category"]] = []
        groups[row["category"]].append(row)
    top = {}
    for category, group in groups.items():
        taken = []
        names = []
        while len(names) < n and len(names) < len(group):
            best = None
            for i in range(len(group)):
                if i not in taken and (best is None or group[i]["units"] > group[best]["units"]):
                    best = i
            taken.append(best)
            names.append(group[best]["product"])
        top[category] = names
    return top

rows = [
    {"category": "sports", "product": "Ultra Bike Light", "units": 14},
    {"category": "home", "product": "Deluxe Vase", "units": 9},
    {"category": "sports", "product": "Travel Yoga Mat", "units": 21},
    {"category": "electronics", "product": "Organic Speaker", "units": 6},
    {"category": "sports", "product": "Studio Tent", "units": 14},
    {"category": "home", "product": "Nordic Candle", "units": 12},
]
print(top_products(rows, 2))
`,
      alternatives: [
        src`
def top_products(rows, n):
    groups = {}
    for position, row in enumerate(rows):
        if row["category"] not in groups:
            groups[row["category"]] = []
        groups[row["category"]].append((-row["units"], position, row["product"]))
    top = {}
    for category, entries in groups.items():
        names = []
        for units, position, product in sorted(entries)[:n]:
            names.append(product)
        top[category] = names
    return top
`,
        src`
def top_products(rows, n):
    ranked = {}
    for row in rows:
        current = []
        if row["category"] in ranked:
            current = ranked[row["category"]]
        new_order = []
        placed = False
        for other in current:
            if not placed and row["units"] > other["units"]:
                new_order.append(row)
                placed = True
            new_order.append(other)
        if not placed:
            new_order.append(row)
        ranked[row["category"]] = new_order
    top = {}
    for category, group in ranked.items():
        names = []
        for row in group[:n]:
            names.append(row["product"])
        top[category] = names
    return top
`,
      ],
      wrong: [
        {
          code: src`
def top_products(rows, n):
    groups = {}
    for row in rows:
        if row["category"] not in groups:
            groups[row["category"]] = []
        groups[row["category"]].append(row)
    top = {}
    for category, group in groups.items():
        taken = []
        names = []
        while len(names) < n and len(names) < len(group):
            best = None
            for i in range(len(group)):
                if i not in taken and (best is None or group[i]["units"] >= group[best]["units"]):
                    best = i
            taken.append(best)
            names.append(group[best]["product"])
        top[category] = names
    return top
`,
          fails: ["returns"],
          why: "`>=` lets a later row with the same units overtake, so ties come out backwards",
        },
        {
          code: src`
def top_products(rows, n):
    entries = []
    for position, row in enumerate(rows):
        entries.append((-row["units"], position, row["category"], row["product"]))
    top = {}
    for units, position, category, product in sorted(entries)[:n]:
        if category not in top:
            top[category] = []
        top[category].append(product)
    return top
`,
          fails: ["returns"],
          why: "it takes the top n of the whole catalogue, not the top n of each category",
        },
        {
          code: src`
def top_products(rows, n):
    groups = {}
    for position, row in enumerate(rows):
        if row["category"] not in groups:
            groups[row["category"]] = []
        groups[row["category"]].append((row["units"], position, row["product"]))
    top = {}
    for category, entries in groups.items():
        names = []
        for units, position, product in sorted(entries)[:n]:
            names.append(product)
        top[category] = names
    return top
`,
          fails: ["returns"],
          why: "sorting by units without negating them puts the slowest sellers first",
        },
      ],
      task: {
        checks: [
          fn("returns", "top_products", [
            example([productRows, 2], { sports: ["Travel Yoga Mat", "Ultra Bike Light"], home: ["Nordic Candle", "Deluxe Vase"], electronics: ["Organic Speaker"] }),
            example([productRows, 1], { sports: ["Travel Yoga Mat"], home: ["Nordic Candle"], electronics: ["Organic Speaker"] }),
            example([[], 3], {}),
            hiddenCase("a tie for the last place", [[{ category: "toys", product: "Eco Train Set", units: 5 }, { category: "toys", product: "Kite", units: 8 }, { category: "toys", product: "Puzzle", units: 5 }], 2], { toys: ["Kite", "Eco Train Set"] }),
            hiddenCase("n larger than a category", [[{ category: "home", product: "Deluxe Pillow", units: 3 }, { category: "home", product: "Nordic Candle", units: 7 }], 10], { home: ["Nordic Candle", "Deluxe Pillow"] }),
            hiddenCase("rows listed lowest first", [[{ category: "c", product: "a", units: 1 }, { category: "c", product: "b", units: 2 }, { category: "c", product: "d", units: 3 }, { category: "c", product: "e", units: 4 }], 3], { c: ["e", "d", "b"] }),
            hiddenCase("a single category with n of 1", [[{ category: "sports", product: "Studio Tent", units: 2 }, { category: "sports", product: "Organic Foam Roller", units: 2 }], 1], { sports: ["Studio Tent"] }),
          ], { label: "top_products() ranks the best sellers within each category" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-20",
    version: 2,
    slug: "merge-two-customer-exports",
    title: "Merge two customer exports",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 20,
    requires: [...fnBase, "comparison", "logical", "nested-loop", "dict-iterate", "else-clause"],
    prompt: "Two exports of the customer table overlap: a customer can appear in both, or twice in one, with a different country. Each record carries a `version` number that goes up whenever the record is edited. Merge them into one list with a single record per customer.",
    spec: [
      ["Function", "`merge_customers(old, new)`"],
      ["old, new", "lists of dictionaries with `customer_id`, `country` and `version`"],
      ["Winner", "for each customer, the record with the highest `version`; on equal versions the record that comes later (old is read before new, each top to bottom)"],
      ["Order", "customers appear in the order they are first seen (old first, then new), even when a later record wins"],
      ["Must not", "change either input list or any record in them"],
    ],
    hiddenKinds: ["equal versions in both exports", "a customer repeated inside one export", "an older record in the new export", "first-seen order when a later record wins", "both exports empty"],
    hints: [
      "Walk old and then new, keeping a dictionary from customer ID to the record that is winning so far.",
      "A record replaces the stored one when its customer is new, or when its version is greater than or equal to the stored version.",
      "Replacing the value under an existing key keeps that key's position, so the dictionary's values are already in first-seen order. Build the result list from them.",
    ],
    explanation: "A dictionary keyed by customer ID holds the current winner. Reading old then new and replacing on `>=` makes the later record win ties. Assigning to an existing key doesn't move it, so the dictionary keeps first-seen order and `values()` gives the answer in the required order. `update` or a plain overwrite would let an older record from the new export win; appending to the result list when a record wins would create duplicates.",
    code: {
      starter: src`
def merge_customers(old, new):
    merged = []
    return merged

old = [
    {"customer_id": "18102", "country": "United Kingdom", "version": 1},
    {"customer_id": "13085", "country": "United Kingdom", "version": 2},
    {"customer_id": "12682", "country": "France", "version": 1},
]
new = [
    {"customer_id": "13085", "country": "Ireland", "version": 1},
    {"customer_id": "12682", "country": "Belgium", "version": 3},
    {"customer_id": "16329", "country": "Germany", "version": 1},
]
for record in merge_customers(old, new):
    print(record)
`,
      answer: src`
def merge_customers(old, new):
    winners = {}
    for export in [old, new]:
        for record in export:
            key = record["customer_id"]
            if key not in winners or record["version"] >= winners[key]["version"]:
                winners[key] = record
    merged = []
    for record in winners.values():
        merged.append(record)
    return merged

old = [
    {"customer_id": "18102", "country": "United Kingdom", "version": 1},
    {"customer_id": "13085", "country": "United Kingdom", "version": 2},
    {"customer_id": "12682", "country": "France", "version": 1},
]
new = [
    {"customer_id": "13085", "country": "Ireland", "version": 1},
    {"customer_id": "12682", "country": "Belgium", "version": 3},
    {"customer_id": "16329", "country": "Germany", "version": 1},
]
for record in merge_customers(old, new):
    print(record)
`,
      alternatives: [
        src`
def merge_customers(old, new):
    order = []
    best = {}
    for export in [old, new]:
        for record in export:
            key = record["customer_id"]
            if key not in best:
                order.append(key)
                best[key] = record
            elif record["version"] >= best[key]["version"]:
                best[key] = record
    merged = []
    for key in order:
        merged.append(best[key])
    return merged
`,
      ],
      wrong: [
        {
          code: src`
def merge_customers(old, new):
    winners = {}
    for export in [old, new]:
        for record in export:
            winners[record["customer_id"]] = record
    merged = []
    for record in winners.values():
        merged.append(record)
    return merged
`,
          fails: ["returns"],
          why: "the last record always wins, even when its version is older",
        },
        {
          code: src`
def merge_customers(old, new):
    winners = {}
    for export in [old, new]:
        for record in export:
            key = record["customer_id"]
            if key not in winners or record["version"] > winners[key]["version"]:
                winners[key] = record
    merged = []
    for record in winners.values():
        merged.append(record)
    return merged
`,
          fails: ["returns"],
          why: "`>` keeps the earlier record on equal versions",
        },
        {
          code: src`
def merge_customers(old, new):
    winners = {}
    for export in [old, new]:
        for record in export:
            key = record["customer_id"]
            if key not in winners:
                winners[key] = record
            elif record["version"] >= winners[key]["version"]:
                winners[key]["country"] = record["country"]
                winners[key]["version"] = record["version"]
    merged = []
    for record in winners.values():
        merged.append(record)
    return merged
`,
          fails: ["keeps-input"],
          why: "the merged values are right, but the winning fields are written into the old export's records",
        },
      ],
      task: {
        checks: [
          fn("returns", "merge_customers", [
            example([oldExport, newExport], [
              { customer_id: "18102", country: "United Kingdom", version: 1 },
              { customer_id: "13085", country: "United Kingdom", version: 2 },
              { customer_id: "12682", country: "Belgium", version: 3 },
              { customer_id: "16329", country: "Germany", version: 1 },
            ]),
            example([[], newExport], newExport),
            example([oldExport, []], oldExport),
            hiddenCase("equal versions in both exports", [[{ customer_id: "1", country: "Spain", version: 2 }], [{ customer_id: "1", country: "Portugal", version: 2 }]], [{ customer_id: "1", country: "Portugal", version: 2 }]),
            hiddenCase("a customer repeated inside one export", [[{ customer_id: "7", country: "Norway", version: 1 }, { customer_id: "7", country: "Sweden", version: 4 }, { customer_id: "7", country: "Finland", version: 2 }], []], [{ customer_id: "7", country: "Sweden", version: 4 }]),
            hiddenCase("first-seen order when a later record wins", [[{ customer_id: "A", country: "x", version: 1 }, { customer_id: "B", country: "y", version: 1 }], [{ customer_id: "C", country: "z", version: 1 }, { customer_id: "A", country: "w", version: 5 }]], [{ customer_id: "A", country: "w", version: 5 }, { customer_id: "B", country: "y", version: 1 }, { customer_id: "C", country: "z", version: 1 }]),
            hiddenCase("both exports empty", [[], []], []),
          ], { label: "merge_customers() keeps the newest record per customer, in first-seen order" }),
          fn("keeps-input", "merge_customers", [
            keepsInput([oldExport, newExport]),
            keepsInput([[{ customer_id: "1", country: "Spain", version: 1 }], [{ customer_id: "1", country: "Italy", version: 2 }]], { label: "a newer record for a customer in the old export" }),
          ], { label: "merge_customers() leaves both exports unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q12-22",
    version: 2,
    slug: "index-then-update",
    title: "An index, then an update",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 5,
    requires: ["assignment", "list-literal", "list-index", "dict-literal", "dict-lookup", "dict-update", "string-index", "len-call", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Building the index stores each customer's country under their ID. What happens the second time 12682 is stored?",
      "`update` replaces the value under a key that exists and adds a key that doesn't. Count the keys afterwards.",
      "A key keeps the position where it was first added, even when its value is replaced later.",
    ],
    explanation: "12682 is stored twice, so the index has two keys and 12682 ends up with the later value, Belgium. `update` replaces 13085's value with Ireland and adds 16329 as a third key. Replacing a value never moves a key, so the loop prints 12682, 13085, then the new 16329.",
    predict: {
      program: src`
customers = [
    {"id": "12682", "country": "France"},
    {"id": "13085", "country": "United Kingdom"},
    {"id": "12682", "country": "Belgium"},
]
country_of = {}
for customer in customers:
    country_of[customer["id"]] = customer["country"]
moves = {"13085": "Ireland", "16329": "Germany"}
country_of.update(moves)
print(len(country_of), country_of["12682"], country_of["13085"])
for customer_id in country_of:
    print(customer_id)
`,
      output: "3 Belgium Ireland\n12682\n13085\n16329\n",
      wrongPredictions: [
        "4 France Ireland\n12682\n13085\n12682\n16329",
        "3 France United Kingdom\n12682\n13085\n16329",
        "3 Belgium Ireland\n13085\n12682\n16329",
        "2 Belgium Ireland\n12682\n13085",
      ],
    },
  },
];
