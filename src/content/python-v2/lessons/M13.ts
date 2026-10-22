/**
 * M13 Comprehensions: five lessons (PY-L13-01 … PY-L13-05).
 *
 * M12 built new lists and dictionaries with a loop, an empty result and an append. A comprehension writes the same
 * transform in one expression: a list (01), a dictionary (02), a set of distinct values (03), a flat list from nested
 * lists or every combination of two lists (04), and finally a filter `if` together with the judgement of when a plain
 * loop is clearer (05). Fixtures are small slices of course datasets: Runtime Films (R02: films, users, ratings, tags),
 * BTS flights (D13), NOAA weather readings (D07), Stack Exchange question tags (D12) and Runtime Market orders (R01).
 *
 * Challenges are graded by calling the learner's function with the public example and with hidden inputs (empty
 * lists, boundaries, repeated keys, messy text), and by checking that inputs are not mutated where that matters.
 * A plain loop that returns the right value also passes: the checks judge behaviour, not syntax.
 * Version 2: rewritten from a print-the-list module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- shared fixtures (inputs for function checks)

const flightsCap = [
  { flight: "UA2017", capacity: 166, booked: 160 },
  { flight: "MQ3443", capacity: 76, booked: 79 },
  { flight: "DL1270", capacity: 160, booked: 160 },
];

const schedule = [
  { flight: "UA2017", origin: "LAS", destination: "IAH" },
  { flight: "MQ3443", origin: "MCI", destination: "MIA" },
  { flight: "AA2929", origin: "DFW", destination: "MIA" },
];

const ledger = [
  { amount: 120, status: "cleared" },
  { amount: -45.5, status: "cleared" },
  { amount: -30, status: "pending" },
  { amount: 200, status: "cleared" },
];

export const m13Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L13-01 list comprehension
  {
    id: "PY-L13-01",
    version: 2,
    slug: "list-comprehension",
    title: "Build a list with a comprehension",
    lede: "A list comprehension says *a new value for every item* in one expression. It is the the Collection Algorithms module transform loop without the plumbing.",
    focus: "Write a transform as a list comprehension: one new value for every item, in order.",
    minutes: 16,
    objectives: [
      "Read `[expression for name in items]` as the loop it replaces",
      "Choose each new value with a conditional expression inside the comprehension",
      "Recognise when a comprehension is the wrong tool: when the point is a side effect such as printing",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "string-slice", "string-method", "string-split", "string-format", "arithmetic", "precedence", "comparison", "conversion", "conditional-expr", "truthiness", "len-call", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "syntax-error", "none-value", "list-map", "else-clause", "if-statement", "print-text"],
    teaches: ["list-comp"],
    blocks: [
      {
        kind: "text",
        md: "In the Collection Algorithms module every transform had the same three lines of plumbing: `labels = []`, then `for minutes in runtimes:`, then `labels.append(…)` inside the loop. Only one part changed from problem to problem: the value you appended.\n\nA **list comprehension** keeps only the part that matters. `[expression for name in items]` reads *the expression, for each name in items*. Python runs the same loop, collects one value per item, and gives you the finished list.",
      },
      {
        kind: "example",
        title: "Running times for a film listing",
        code: src`
runtimes = [95, 110, 128, 86]
labels = [f"{minutes // 60}h {minutes % 60}m" for minutes in runtimes]
print(labels)
print(runtimes)
`,
        output: "['1h 35m', '1h 50m', '2h 8m', '1h 26m']\n[95, 110, 128, 86]\n",
        note: "Four runtimes in, four labels out, in the same order. `runtimes` is only read, so it is unchanged.",
      },
      {
        kind: "text",
        md: "The order of the words is fixed: the value first, then `for`. Writing the loop first, the way a `for` statement starts, is a syntax error, so nothing in the program runs.",
      },
      {
        kind: "error-example",
        title: "The for written first",
        code: src`
runtimes = [95, 110]
labels = [for minutes in runtimes: minutes // 60]
print(labels)
`,
        error: "SyntaxError",
        output: "",
        note: "Inside the brackets Python expects a value before `for`. There is no colon in a comprehension either.",
      },
      {
        kind: "text",
        md: "The expression can be anything that produces a value: arithmetic on a field, a method call, or a choice. A **conditional expression** (`a if test else b`, from the Conditional Logic module) in front of the `for` picks one of two values for each item. Every item still produces exactly one value, so the result is as long as the input.",
      },
      {
        kind: "example",
        title: "Profit and a verdict for each film",
        code: src`
def profit_millions(movies):
    return [(m["revenue_usd"] - m["budget_usd"]) / 1000000 for m in movies]

def verdicts(movies):
    return ["hit" if m["revenue_usd"] > m["budget_usd"] else "flop" for m in movies]

movies = [
    {"title": "Glass Echo of Glass", "budget_usd": 33000000, "revenue_usd": 132300000},
    {"title": "Glass Horizon on Fire", "budget_usd": 23300000, "revenue_usd": 9400000},
    {"title": "Wild Archive", "budget_usd": 29600000, "revenue_usd": 46400000},
]
print(profit_millions(movies))
print(verdicts(movies))
`,
        output: "[99.3, -13.9, 16.8]\n['hit', 'flop', 'hit']\n",
        note: "Each function is one `return`. The comprehension builds the list and the function hands it back; there is no separate result variable to forget.",
      },
      {
        kind: "text",
        md: "**When to use it:** when each new value depends only on its own item: a converted reading, a field pulled out of every record, a label chosen per row. **Mistakes to avoid:** writing a comprehension only to *do* something, such as printing, instead of to *build* a list. `print` returns `None`, so `[print(t) for t in titles]` prints the titles and then leaves you a list of `None`s. A plain `for` loop says what you mean there.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Clean the airport codes",
      prompt: "`airport_codes` copies each code exactly as typed. Change the expression in front of `for` so every code has its spaces removed and is in capitals, then run it.",
      spec: [
        ["Function", "`airport_codes(codes)`"],
        ["Returns", "a new list with each code stripped and upper-cased, in order"],
      ],
      starter: src`
def airport_codes(codes):
    return [code for code in codes]

print(airport_codes([" las", "IAH ", "mci"]))
`,
      answer: src`
def airport_codes(codes):
    return [code.strip().upper() for code in codes]

print(airport_codes([" las", "IAH ", "mci"]))
`,
      wrong: [
        {
          code: src`
def airport_codes(codes):
    return ["LAS", "IAH", "MCI"]
`,
          fails: ["returns"],
          why: "the three codes are typed in, so any other list gets the wrong answer",
        },
      ],
      hints: ["Only the part before `for` decides what goes into the new list.", "`strip` (see Strings & Text) removes spaces at the ends; `upper` makes capitals.", "Call both methods on `code`, one after the other."],
      task: {
        checks: [
          fn("returns", "airport_codes", [
            example([[" las", "IAH ", "mci"]], ["LAS", "IAH", "MCI"]),
            hiddenCase("an empty list", [[]], []),
            hiddenCase("codes that are already clean", [["ATL", "BOS"]], ["ATL", "BOS"]),
          ], { label: "airport_codes() strips and capitalises every code" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Billed minutes",
        prompt: "A phone plan bills every call in whole minutes and always rounds **up**: a 61-second call costs 2 minutes, a 60-second call costs 1, and an unanswered call of 0 seconds costs nothing. Write `billed_minutes(durations)`: return the billed minutes for every call, in order.",
        spec: [
          ["Function", "`billed_minutes(durations)`"],
          ["durations", "a list of whole numbers of seconds, 0 or more"],
          ["Returns", "a new list of whole numbers of minutes, one per call"],
          ["Example", "`billed_minutes([61, 60, 0, 125])` → `[2, 1, 0, 3]`"],
        ],
        starter: src`
def billed_minutes(durations):
    return []

print(billed_minutes([61, 60, 0, 125]))
`,
        answer: src`
def billed_minutes(durations):
    return [(seconds + 59) // 60 for seconds in durations]

print(billed_minutes([61, 60, 0, 125]))
`,
        alternatives: [
          src`
def billed_minutes(durations):
    return [seconds // 60 + (1 if seconds % 60 > 0 else 0) for seconds in durations]
`,
          src`
def billed_minutes(durations):
    minutes = []
    for seconds in durations:
        whole = seconds // 60
        if seconds % 60:
            whole += 1
        minutes.append(whole)
    return minutes
`,
        ],
        wrong: [
          {
            code: src`
def billed_minutes(durations):
    return [seconds // 60 for seconds in durations]
`,
            fails: ["returns"],
            why: "`//` rounds down, so a 61-second call is billed as 1 minute",
          },
          {
            code: src`
def billed_minutes(durations):
    return [seconds // 60 + 1 for seconds in durations]
`,
            fails: ["returns"],
            why: "adding 1 to every call overcharges calls that end exactly on a minute, and charges unanswered calls",
          },
          {
            code: src`
def billed_minutes(durations):
    return [seconds / 60 for seconds in durations]
`,
            fails: ["returns"],
            why: "`/` gives fractions of a minute (1.0166…), not whole billed minutes",
          },
        ],
        hints: [
          "Every call produces exactly one number, so this is a transform: one comprehension, no filtering.",
          "`//` (see Operators & Expressions) rounds down. Rounding up is the same as rounding down, plus one more minute only when there are seconds left over.",
          "`%` gives the seconds left over. A call of exactly 60 or 0 seconds has none left over, so it gets no extra minute.",
        ],
        task: {
          checks: [
            fn("returns", "billed_minutes", [
              example([[61, 60, 0, 125]], [2, 1, 0, 3]),
              example([[3599]], [60]),
              example([[]], []),
              hiddenCase("calls that end exactly on a minute", [[120, 180, 600]], [2, 3, 10]),
              hiddenCase("a one-second call", [[1]], [1]),
              hiddenCase("one second past the hour", [[3601]], [61]),
              hiddenCase("several unanswered calls", [[0, 0]], [0, 0]),
            ], { label: "billed_minutes() rounds every call up to whole minutes" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Scores from a gradebook row",
        prompt: "A gradebook exports each student as one line of text: the name, then their test scores, separated by commas. A blank cell means the student missed that test, which counts as 0. Write `parse_scores(line)`: return the scores as whole numbers, in order, without the name.",
        spec: [
          ["Function", "`parse_scores(line)`"],
          ["line", "text such as `\"Ana,72, 58,,91\"`: a name, then zero or more cells; cells may have spaces around them"],
          ["Returns", "a list of `int` scores, one per cell after the name; a blank cell (empty or only spaces) gives `0`"],
          ["Example", "`parse_scores(\"Ana,72, 58,,91\")` → `[72, 58, 0, 91]`"],
        ],
        starter: src`
def parse_scores(line):
    return []

print(parse_scores("Ana,72, 58,,91"))
print(parse_scores("Ben,100"))
`,
        answer: src`
def parse_scores(line):
    cells = line.split(",")[1:]
    return [int(cell) if cell.strip() else 0 for cell in cells]

print(parse_scores("Ana,72, 58,,91"))
print(parse_scores("Ben,100"))
`,
        alternatives: [
          src`
def parse_scores(line):
    parts = line.split(",")
    return [0 if part.strip() == "" else int(part.strip()) for part in parts[1:]]
`,
        ],
        wrong: [
          {
            code: src`
def parse_scores(line):
    return [int(cell) for cell in line.split(",")[1:]]
`,
            fails: ["returns"],
            why: "a blank cell reaches `int`, which stops with ValueError",
          },
          {
            code: src`
def parse_scores(line):
    return [int(cell) if cell.strip() else 0 for cell in line.split(",")]
`,
            fails: ["returns"],
            why: "the name is treated as a score, so `int(\"Ana\")` stops with ValueError",
          },
          {
            code: src`
def parse_scores(line):
    return [int(cell) if cell.strip() else None for cell in line.split(",")[1:]]
`,
            fails: ["returns"],
            why: "a missed test becomes None instead of 0, so it can't be added up later",
          },
        ],
        hints: [
          "Two steps: `split` (see String Algorithms) turns the line into cells, and a slice drops the first cell, the name.",
          "Each remaining cell becomes exactly one number, so the comprehension needs a choice in front of `for`, not a filter.",
          "A cell that is empty after `strip` is falsy (see Conditional Logic). `int` accepts spaces around the digits, but not an empty text.",
        ],
        task: {
          checks: [
            fn("returns", "parse_scores", [
              example(["Ana,72, 58,,91"], [72, 58, 0, 91]),
              example(["Ben,100"], [100]),
              example(["Cara"], []),
              hiddenCase("every cell blank", ["Dev,,,"], [0, 0, 0]),
              hiddenCase("a blank cell that holds only spaces", ["Eli, ,64"], [0, 64]),
              hiddenCase("a real score of zero", ["Fay,0,5"], [0, 5]),
              hiddenCase("spaces around every score", ["Gus, 88 , 79 "], [88, 79]),
            ], { label: "parse_scores() turns every cell after the name into a score" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
prices = [4.5, 12, 7]
with_fee = [p + 1 for p in prices]
print(with_fee, len(with_fee) == len(prices))
`,
        choices: ["[5.5, 13, 8] True", "[5.5, 13, 8] False", "[4.5, 12, 7, 1] False", "[13] True"],
        answer: 0,
        why: "The expression `p + 1` runs once for every price, so there are three new values and the lengths match.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a comprehension used only to print. What does this print?",
        program: src`
titles = ["Hours II", "Winter Lantern"]
shown = [print(t) for t in titles]
print(shown)
`,
        choices: ["Hours II\nWinter Lantern\n[None, None]", "['Hours II', 'Winter Lantern']", "Hours II\nWinter Lantern\n['Hours II', 'Winter Lantern']", "[None, None]"],
        answer: 0,
        why: "Each `print(t)` prints a title and returns `None`, and the comprehension collects those `None`s. When the point is printing, use a `for` loop.",
      },
      {
        id: "q3",
        prompt: "Which job is a good fit for a list comprehension?",
        choices: ["Turning every order total into the total with tax added", "Printing one line for every late flight", "Stopping at the first cancelled order", "Keeping a running balance as each payment arrives"],
        answer: 0,
        why: "A comprehension builds one new value per item. Printing is a side effect, stopping early needs `break`, and a running balance depends on the previous result: all three are loop jobs.",
      },
    ],
    review: [
      "`[expression for name in items]` builds one new value per item, in order. It replaces the empty-list, loop, append pattern.",
      "A conditional expression in front of `for` chooses each value; every item still produces one.",
      "Use a comprehension to build a list, not to print or to change other variables.",
      "Next: the same idea with `key: value`, to build a dictionary in one expression.",
    ],
  },

  // ------------------------------------------------------------------ PY-L13-02 dict comprehension
  {
    id: "PY-L13-02",
    version: 2,
    slug: "dict-comprehension",
    title: "Build a dictionary with a comprehension",
    lede: "A dictionary comprehension builds a lookup in one expression: one `key: value` pair for every item.",
    focus: "Write a dictionary comprehension that builds one key: value pair per item, from a list or from another dictionary.",
    minutes: 16,
    objectives: [
      "Build an index from a list of records with `{key: value for item in items}`",
      "Transform a dictionary's keys or values by looping over `items()`",
      "Predict what happens when two items produce the same key",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "dict-literal", "dict-lookup", "dict-iterate", "dict-index", "tuple-unpack", "string-index", "string-method", "string-split", "comparison", "logical", "arithmetic", "conditional-expr", "value-count", "if-statement", "else-clause", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "precedence", "truthiness", "nested-dict", "list-mutate", "print-text", "reassignment"],
    teaches: ["dict-comp"],
    blocks: [
      {
        kind: "text",
        md: "The Collection Algorithms module built an **index**, a dictionary from ID to record, with a loop that stored one pair per pass. A **dictionary comprehension** writes that loop as one expression: `{key: value for item in items}`. The braces and the colon say *dictionary*; the part before `for` says which key and which value each item contributes.",
      },
      {
        kind: "example",
        title: "Film titles by ID",
        code: src`
movies = [
    {"movie_id": 12, "title": "Glass Echo of Glass", "release_year": 2023},
    {"movie_id": 917, "title": "Wild Archive", "release_year": 2008},
    {"movie_id": 940, "title": "Hidden Orchard", "release_year": 2010},
]
title_of = {movie["movie_id"]: movie["title"] for movie in movies}
print(title_of)
print(title_of[917])
`,
        output: "{12: 'Glass Echo of Glass', 917: 'Wild Archive', 940: 'Hidden Orchard'}\nWild Archive\n",
        note: "Each film contributes one pair. After that, finding a title is one lookup instead of a search through the list.",
      },
      {
        kind: "text",
        md: "A key has to be a value that can't change, such as a number, a text or a tuple. A list can change, so Python refuses to use it as a key.",
      },
      {
        kind: "error-example",
        title: "A list as a key",
        code: src`
movies = [{"title": "Wild Archive", "genres": ["Drama", "Mystery"]}]
by_genres = {movie["genres"]: movie["title"] for movie in movies}
print(by_genres)
`,
        error: "TypeError",
        output: "",
        note: "The error says the list is *unhashable*: Python can't file it under a fixed position in the dictionary because its contents could change later.",
      },
      {
        kind: "text",
        md: "The comprehension can also walk another dictionary. `for key, value in row.items()` unpacks each pair (see Dictionaries & Sets), and the expression in front decides the new pair. This is how you clean up column names that came from a spreadsheet, without changing the original row.",
      },
      {
        kind: "example",
        title: "Tidy the column names",
        code: src`
def tidy_keys(row):
    return {key.strip().lower(): value for key, value in row.items()}

raw = {" Flight ": "UA2017", "ORIGIN": "LAS", "Dest ": "IAH"}
row = tidy_keys(raw)
print(row)
print(row["origin"], raw["ORIGIN"])
`,
        output: "{'flight': 'UA2017', 'origin': 'LAS', 'dest': 'IAH'}\nLAS LAS\n",
        note: "A new dictionary comes back; `raw` still has its messy keys. The values are copied across unchanged.",
      },
      {
        kind: "text",
        md: "**When to use it:** building a lookup by ID, or reshaping the keys or values of a dictionary. **Mistakes to avoid:** forgetting that keys are unique. When two items produce the same key, the later pair replaces the earlier value, exactly as two assignments would. If `\"City\"` and `\"city \"` both tidy to `\"city\"`, only one survives, and nothing warns you.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Units in stock by SKU",
      prompt: "`stock_by_sku` stores each whole product record under its SKU. A stock report only needs the number of units: change the value so each SKU maps to its `units`.",
      spec: [
        ["Function", "`stock_by_sku(products)`"],
        ["Returns", "a dictionary from each `sku` to that product's `units`"],
      ],
      starter: src`
def stock_by_sku(products):
    return {product["sku"]: product for product in products}

products = [
    {"sku": "SPO-11681", "name": "Ultra Bike Light", "units": 14},
    {"sku": "HOM-22847", "name": "Deluxe Vase", "units": 0},
]
print(stock_by_sku(products))
`,
      answer: src`
def stock_by_sku(products):
    return {product["sku"]: product["units"] for product in products}

products = [
    {"sku": "SPO-11681", "name": "Ultra Bike Light", "units": 14},
    {"sku": "HOM-22847", "name": "Deluxe Vase", "units": 0},
]
print(stock_by_sku(products))
`,
      wrong: [
        {
          code: src`
def stock_by_sku(products):
    return {product["units"]: product["sku"] for product in products}
`,
          fails: ["returns"],
          why: "the key and the value are the wrong way round",
        },
      ],
      hints: ["The key stays the same: the product's SKU.", "Only the part after the colon changes.", "Look up the `units` field instead of using the whole record."],
      task: {
        checks: [
          fn("returns", "stock_by_sku", [
            example([[{ sku: "SPO-11681", name: "Ultra Bike Light", units: 14 }, { sku: "HOM-22847", name: "Deluxe Vase", units: 0 }]], { "SPO-11681": 14, "HOM-22847": 0 }),
            hiddenCase("an empty catalogue", [[]], {}),
            hiddenCase("a single product", [[{ sku: "ELE-24781", name: "Organic Speaker", units: 6 }]], { "ELE-24781": 6 }),
          ], { label: "stock_by_sku() maps each SKU to its units" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Seats left on each flight",
        prompt: "Airlines sell more tickets than there are seats, expecting a few passengers not to show up, so `booked` can be larger than `capacity`. Write `seats_left(flights)`: return a dictionary from each flight number to the seats still free, where an overbooked or full flight has `0`, never a negative number.",
        spec: [
          ["Function", "`seats_left(flights)`"],
          ["flights", "a list of dictionaries with `flight` (unique), `capacity` and `booked`"],
          ["Returns", "`{flight: seats_free}`; seats free is `capacity - booked`, or `0` when nothing is left"],
          ["Example", "the starter's flights → `{'UA2017': 6, 'MQ3443': 0, 'DL1270': 0}`"],
        ],
        starter: src`
def seats_left(flights):
    return {}

flights = [
    {"flight": "UA2017", "capacity": 166, "booked": 160},
    {"flight": "MQ3443", "capacity": 76, "booked": 79},
    {"flight": "DL1270", "capacity": 160, "booked": 160},
]
print(seats_left(flights))
`,
        answer: src`
def seats_left(flights):
    return {f["flight"]: (f["capacity"] - f["booked"] if f["booked"] < f["capacity"] else 0) for f in flights}

flights = [
    {"flight": "UA2017", "capacity": 166, "booked": 160},
    {"flight": "MQ3443", "capacity": 76, "booked": 79},
    {"flight": "DL1270", "capacity": 160, "booked": 160},
]
print(seats_left(flights))
`,
        alternatives: [
          src`
def seats_left(flights):
    free = {}
    for flight in flights:
        left = flight["capacity"] - flight["booked"]
        if left < 0:
            left = 0
        free[flight["flight"]] = left
    return free
`,
        ],
        wrong: [
          {
            code: src`
def seats_left(flights):
    return {f["flight"]: f["capacity"] - f["booked"] for f in flights}
`,
            fails: ["returns"],
            why: "an overbooked flight reports a negative number of free seats",
          },
          {
            code: src`
def seats_left(flights):
    return {f["flight"]: f["booked"] - f["capacity"] if f["booked"] > f["capacity"] else 0 for f in flights}
`,
            fails: ["returns"],
            why: "it reports how overbooked a flight is, and 0 for flights that still have seats",
          },
        ],
        hints: [
          "One pair per flight: the flight number is the key, the free seats are the value.",
          "The value needs a choice between two numbers, so use a conditional expression after the colon.",
          "Brackets around the conditional expression make it clear where the value starts and ends.",
        ],
        task: {
          checks: [
            fn("returns", "seats_left", [
              example([flightsCap], { UA2017: 6, MQ3443: 0, DL1270: 0 }),
              example([[{ flight: "AA1214", capacity: 172, booked: 98 }]], { AA1214: 74 }),
              example([[]], {}),
              hiddenCase("a heavily overbooked flight", [[{ flight: "NK1", capacity: 10, booked: 25 }]], { NK1: 0 }),
              hiddenCase("an empty flight", [[{ flight: "OO5", capacity: 50, booked: 0 }]], { OO5: 50 }),
              hiddenCase("one seat left", [[{ flight: "HA9", capacity: 189, booked: 188 }, { flight: "DL2", capacity: 30, booked: 31 }]], { HA9: 1, DL2: 0 }),
            ], { label: "seats_left() gives every flight its free seats, never below 0" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Tag counts for a question",
        prompt: "Each Stack Exchange question stores its tags as one text, separated by `|`, typed by different people: `\"python|Pandas| python |dataframe\"`. Write `tag_counts(tags_text)`: return how many times each tag appears, after removing spaces at the ends and lower-casing. Text with no tags at all gives `{}`.",
        spec: [
          ["Function", "`tag_counts(tags_text)`"],
          ["tags_text", "tags separated by `|`; may be empty or only spaces"],
          ["Returns", "`{tag: count}` for the cleaned tags, keys in the order each tag first appears"],
          ["Example", "`tag_counts(\"python|Pandas| python |dataframe\")` → `{'python': 2, 'pandas': 1, 'dataframe': 1}`"],
        ],
        starter: src`
def tag_counts(tags_text):
    return {}

print(tag_counts("python|Pandas| python |dataframe"))
print(tag_counts(""))
`,
        answer: src`
def tag_counts(tags_text):
    if tags_text.strip() == "":
        return {}
    tags = [tag.strip().lower() for tag in tags_text.split("|")]
    return {tag: tags.count(tag) for tag in tags}

print(tag_counts("python|Pandas| python |dataframe"))
print(tag_counts(""))
`,
        alternatives: [
          src`
def tag_counts(tags_text):
    counts = {}
    if not tags_text.strip():
        return counts
    for tag in tags_text.split("|"):
        clean = tag.strip().lower()
        if clean not in counts:
            counts[clean] = 0
        counts[clean] += 1
    return counts
`,
        ],
        wrong: [
          {
            code: src`
def tag_counts(tags_text):
    if tags_text.strip() == "":
        return {}
    tags = tags_text.split("|")
    return {tag: tags.count(tag) for tag in tags}
`,
            fails: ["returns"],
            why: "without cleaning, `Pandas` and ` python ` are counted as different tags",
          },
          {
            code: src`
def tag_counts(tags_text):
    tags = [tag.strip().lower() for tag in tags_text.split("|")]
    return {tag: tags.count(tag) for tag in tags}
`,
            fails: ["returns"],
            why: "an empty text still splits into one empty piece, so it reports `{'': 1}`",
          },
          {
            code: src`
def tag_counts(tags_text):
    if tags_text.strip() == "":
        return {}
    tags = [tag.strip().lower() for tag in tags_text.split("|")]
    return {tag: tags_text.lower().count(tag) for tag in tags}
`,
            fails: ["returns"],
            why: "counting inside the whole text also counts `py` inside `python`",
          },
        ],
        hints: [
          "Two comprehensions: first a list of cleaned tags, then a dictionary built from that list.",
          "`count` (see String Algorithms) tells how many times a value appears in a list. A repeated tag simply produces the same pair again, and the dictionary keeps one.",
          "`\"\".split(\"|\")` is `['']`, not an empty list, so text with no tags needs its own check first.",
        ],
        task: {
          checks: [
            fn("returns", "tag_counts", [
              example(["python|Pandas| python |dataframe"], { python: 2, pandas: 1, dataframe: 1 }),
              example(["sql"], { sql: 1 }),
              example([""], {}),
              hiddenCase("text that is only spaces", ["   "], {}),
              hiddenCase("one tag that contains another", ["py|python"], { py: 1, python: 1 }),
              hiddenCase("the same tag in three spellings", ["SQL|sql | Sql"], { sql: 3 }),
              hiddenCase("tags that are all different", ["git|bash|linux"], { git: 1, bash: 1, linux: 1 }),
            ], { label: "tag_counts() counts every cleaned tag" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
stock = {"P0164": 3, "P0594": 0, "P0209": 12}
low = {sku: units < 5 for sku, units in stock.items()}
print(low)
`,
        choices: ["{'P0164': True, 'P0594': True, 'P0209': False}", "{'P0164': 3, 'P0594': 0}", "['P0164', 'P0594']", "{'P0209': False}"],
        answer: 0,
        why: "Every pair is kept; only the value changes, to the result of `units < 5`. A dictionary comprehension without a filter has as many keys as the dictionary it walks.",
      },
      {
        id: "q2",
        prompt: "A common mistake: two keys clean up to the same text. What does this print?",
        program: src`
raw = {"City": "Austin", "city ": "Dallas"}
clean = {k.strip().lower(): v for k, v in raw.items()}
print(clean)
`,
        choices: ["{'city': 'Dallas'}", "{'city': 'Austin'}", "{'city': 'Austin', 'city ': 'Dallas'}", "KeyError"],
        answer: 0,
        why: "Both keys become `city`. The second pair replaces the first value, so Austin is lost without any error.",
      },
      {
        id: "q3",
        prompt: "You need to find a customer's email quickly from their customer ID, many times. What should you build?",
        choices: ["A dictionary comprehension from ID to email", "A list comprehension of emails", "A list comprehension of IDs", "A comprehension that prints each email"],
        answer: 0,
        why: "A dictionary from ID to email answers each question with one lookup. A list would have to be searched every time.",
      },
    ],
    review: [
      "`{key: value for item in items}` builds one pair per item; walk `items()` to reshape another dictionary.",
      "Keys must be unchangeable values such as text, numbers or tuples; a list as a key is a TypeError.",
      "When two items give the same key, the later value wins without warning.",
      "Next: braces without a colon keep each value only once, in a set.",
    ],
  },

  // ------------------------------------------------------------------ PY-L13-03 set comprehension
  {
    id: "PY-L13-03",
    version: 2,
    slug: "set-comprehension",
    title: "Distinct values with a set comprehension",
    lede: "A set comprehension collects the distinct values a collection contains. Repeats disappear, and so does the order.",
    focus: "Use a set comprehension to collect distinct values, then compare or sort them.",
    minutes: 15,
    objectives: [
      "Build a set of distinct values with `{expression for item in items}`",
      "Compare two sets with `difference` and `union` to answer who-is-missing questions",
      "Sort a set when you need to show it, because a set has no order and no positions",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "list-sort", "dict-literal", "dict-lookup", "string-index", "string-method", "set-literal", "set-op", "len-call", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "type-call", "list-mutate", "if-statement", "comparison", "logical", "print-text"],
    teaches: ["set-comp"],
    blocks: [
      {
        kind: "text",
        md: "*Which countries do our users come from?* is not *list every user's country*: you want each country once. In the Collection Algorithms module you skipped values already seen. A set does that by itself: it holds each value at most once.\n\nA **set comprehension** uses braces without a colon: `{expression for item in items}`. A set has no order, so when you print it for people, sort it first with `sorted`, which gives a list.",
      },
      {
        kind: "example",
        title: "Countries our users come from",
        code: src`
users = [
    {"user_id": 6078, "country": "Canada"},
    {"user_id": 7345, "country": "Brazil"},
    {"user_id": 7712, "country": "Canada"},
    {"user_id": 8020, "country": "India"},
]
countries = {user["country"] for user in users}
print(len(countries))
print(sorted(countries))
`,
        output: "3\n['Brazil', 'Canada', 'India']\n",
        note: "Canada appears twice in the users but once in the set. `sorted` turns the set into a list in alphabetical order.",
      },
      {
        kind: "text",
        md: "Because a set has no order, it has no positions either. Asking for the first item is an error, not the first country you added.",
      },
      {
        kind: "error-example",
        title: "A set has no position 0",
        code: src`
countries = {"Canada", "Brazil", "India"}
print(countries[0])
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: 'set' object is not subscriptable`. If you need positions, sort the set into a list first.",
      },
      {
        kind: "text",
        md: "Sets earn their keep when you compare two collections. Build a set from each, then let `difference` (see Dictionaries & Sets) answer *who is in the first but not the second*. Checking `in` against a set is also fast however large it gets, which matters when you check thousands of IDs.",
      },
      {
        kind: "example",
        title: "Users who never rated a film",
        code: src`
def never_rated(users, ratings):
    everyone = {user["user_id"] for user in users}
    raters = {rating["user_id"] for rating in ratings}
    return everyone.difference(raters)

users = [{"user_id": 6078}, {"user_id": 7345}, {"user_id": 7712}, {"user_id": 8020}]
ratings = [
    {"user_id": 6078, "movie_id": 2439},
    {"user_id": 6078, "movie_id": 935},
    {"user_id": 8020, "movie_id": 266},
]
print(sorted(never_rated(users, ratings)))
`,
        output: "[7345, 7712]\n",
        note: "User 6078 rated twice but is in `raters` once. The function returns a set; the caller sorts it to print it.",
      },
      {
        kind: "text",
        md: "**When to use it:** distinct values (countries, tags, airports), and *in A but not B* questions. **Mistakes to avoid:** expecting the set to keep the order you added things in; indexing a set; and writing `{}` for an empty set. Empty braces make an empty **dictionary**; an empty set is written `set()`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Each genre once",
      prompt: "`genres_used` returns every genre of every film-genre row, repeats and all. Change the brackets so it returns each genre only once, as a set.",
      spec: [
        ["Function", "`genres_used(rows)`"],
        ["Returns", "a set of the distinct `genre` values"],
      ],
      starter: src`
def genres_used(rows):
    return [row["genre"] for row in rows]

rows = [
    {"movie_id": 12, "genre": "Drama"},
    {"movie_id": 12, "genre": "Thriller"},
    {"movie_id": 917, "genre": "Drama"},
]
print(sorted(genres_used(rows)))
`,
      answer: src`
def genres_used(rows):
    return {row["genre"] for row in rows}

rows = [
    {"movie_id": 12, "genre": "Drama"},
    {"movie_id": 12, "genre": "Thriller"},
    {"movie_id": 917, "genre": "Drama"},
]
print(sorted(genres_used(rows)))
`,
      wrong: [
        {
          code: src`
def genres_used(rows):
    return {"Drama", "Thriller"}
`,
          fails: ["returns"],
          why: "the genres are typed in instead of read from the rows",
        },
      ],
      hints: ["The expression and the `for` stay as they are.", "Square brackets build a list; braces without a colon build a set.", "Swap the brackets for braces."],
      task: {
        checks: [
          fn("returns", "genres_used", [
            example([[{ movie_id: 12, genre: "Drama" }, { movie_id: 12, genre: "Thriller" }, { movie_id: 917, genre: "Drama" }]], py.set(py.str("Drama"), py.str("Thriller"))),
            hiddenCase("no rows", [[]], py.set()),
            hiddenCase("every row the same genre", [[{ movie_id: 1, genre: "Comedy" }, { movie_id: 2, genre: "Comedy" }]], py.set(py.str("Comedy"))),
          ], { label: "genres_used() returns each genre once" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Airports a schedule touches",
        prompt: "Ground staff need to know which airports today's schedule uses, whether flights leave from them or arrive at them. Write `airports_served(flights)`: return the set of every airport code that appears as an `origin` **or** a `destination`.",
        spec: [
          ["Function", "`airports_served(flights)`"],
          ["flights", "a list of dictionaries with `flight`, `origin` and `destination`"],
          ["Returns", "a set of airport codes; `set()` when there are no flights"],
          ["Example", "the starter's flights → `{'LAS', 'IAH', 'MCI', 'MIA', 'DFW'}` (printed sorted)"],
        ],
        starter: src`
def airports_served(flights):
    return set()

flights = [
    {"flight": "UA2017", "origin": "LAS", "destination": "IAH"},
    {"flight": "MQ3443", "origin": "MCI", "destination": "MIA"},
    {"flight": "AA2929", "origin": "DFW", "destination": "MIA"},
]
print(sorted(airports_served(flights)))
`,
        answer: src`
def airports_served(flights):
    origins = {f["origin"] for f in flights}
    destinations = {f["destination"] for f in flights}
    return origins.union(destinations)

flights = [
    {"flight": "UA2017", "origin": "LAS", "destination": "IAH"},
    {"flight": "MQ3443", "origin": "MCI", "destination": "MIA"},
    {"flight": "AA2929", "origin": "DFW", "destination": "MIA"},
]
print(sorted(airports_served(flights)))
`,
        alternatives: [
          src`
def airports_served(flights):
    codes = []
    for flight in flights:
        if flight["origin"] not in codes:
            codes.append(flight["origin"])
        if flight["destination"] not in codes:
            codes.append(flight["destination"])
    return set(codes)
`,
        ],
        wrong: [
          {
            code: src`
def airports_served(flights):
    return {f["origin"] for f in flights}
`,
            fails: ["returns"],
            why: "airports that only receive flights are missing",
          },
          {
            code: src`
def airports_served(flights):
    return [f["origin"] for f in flights] + [f["destination"] for f in flights]
`,
            fails: ["returns"],
            why: "it returns a list with repeats, not a set of distinct codes",
          },
        ],
        hints: [
          "Each flight names two airports, so collect two sets: one of origins and one of destinations.",
          "`union` (the same family as `difference` and `intersection` in the Dictionaries & Sets module) combines two sets, keeping each value once.",
          "Return the combined set itself; sorting is only for printing.",
        ],
        task: {
          checks: [
            fn("returns", "airports_served", [
              example([schedule], py.set(...["LAS", "IAH", "MCI", "MIA", "DFW"].map(py.str))),
              example([[{ flight: "DL1552", origin: "RDU", destination: "ATL" }]], py.set(py.str("RDU"), py.str("ATL"))),
              example([[]], py.set()),
              hiddenCase("a return flight between the same two airports", [[{ flight: "A1", origin: "BOS", destination: "CLT" }, { flight: "A2", origin: "CLT", destination: "BOS" }]], py.set(py.str("BOS"), py.str("CLT"))),
              hiddenCase("an airport that only receives flights", [[{ flight: "B1", origin: "DTW", destination: "ATL" }, { flight: "B2", origin: "DTW", destination: "CAE" }]], py.set(...["DTW", "ATL", "CAE"].map(py.str))),
              hiddenCase("many flights from one hub", [[{ flight: "C1", origin: "ATL", destination: "BOS" }, { flight: "C2", origin: "ATL", destination: "BOS" }, { flight: "C3", origin: "ATL", destination: "BPT" }]], py.set(...["ATL", "BOS", "BPT"].map(py.str))),
            ], { label: "airports_served() collects every origin and destination once" }),
          ],
        },
      },
      {
        id: "c2",
        title: "How many different tags, really?",
        prompt: "Film fans tag the same idea in different spellings: `\"sci-fi\"`, `\"Sci-Fi\"`, `\"scifi\"`, `\"sci fi\"`. Write `distinct_tags(tags)`: normalise each tag by lower-casing it and removing every hyphen and every space, then return the distinct normalised tags as a **sorted list**.",
        spec: [
          ["Function", "`distinct_tags(tags)`"],
          ["tags", "a list of tags as people typed them"],
          ["Returns", "a sorted list of distinct normalised tags; `[]` for no tags"],
          ["Example", "`distinct_tags([\"sci-fi\", \"Sci-Fi\", \"scifi\", \" Time Travel\"])` → `['scifi', 'timetravel']`"],
        ],
        starter: src`
def distinct_tags(tags):
    return []

print(distinct_tags(["sci-fi", "Sci-Fi", "scifi", " Time Travel"]))
`,
        answer: src`
def distinct_tags(tags):
    normalised = {tag.lower().replace("-", "").replace(" ", "") for tag in tags}
    return sorted(normalised)

print(distinct_tags(["sci-fi", "Sci-Fi", "scifi", " Time Travel"]))
`,
        alternatives: [
          src`
def distinct_tags(tags):
    seen = []
    for tag in tags:
        clean = tag.replace(" ", "").replace("-", "").lower()
        if clean not in seen:
            seen.append(clean)
    return sorted(seen)
`,
        ],
        wrong: [
          {
            code: src`
def distinct_tags(tags):
    return sorted({tag.lower().replace("-", "").strip() for tag in tags})
`,
            fails: ["returns"],
            why: "`strip` only removes spaces at the ends, so `sci fi` keeps its inner space",
          },
          {
            code: src`
def distinct_tags(tags):
    return {tag.lower().replace("-", "").replace(" ", "") for tag in tags}
`,
            fails: ["returns"],
            why: "it returns the set itself, not a sorted list",
          },
          {
            code: src`
def distinct_tags(tags):
    return sorted([tag.lower().replace("-", "").replace(" ", "") for tag in tags])
`,
            fails: ["returns"],
            why: "a list comprehension keeps every repeat",
          },
        ],
        hints: [
          "Normalise first, then collect: the set can only merge spellings that have already become the same text.",
          "`replace` (see Strings & Text) with an empty text removes every copy of a character, not just the ones at the ends.",
          "`sorted` accepts a set and returns a new sorted list.",
        ],
        task: {
          checks: [
            fn("returns", "distinct_tags", [
              example([["sci-fi", "Sci-Fi", "scifi", " Time Travel"]], ["scifi", "timetravel"]),
              example([["noir", "Noir"]], ["noir"]),
              example([[]], []),
              hiddenCase("a tag with a space in the middle", [["sci fi", "scifi", "SCI-FI"]], ["scifi"]),
              hiddenCase("tags that stay different", [["drama", "comedy", "action"]], ["action", "comedy", "drama"]),
              hiddenCase("hyphens and spaces in one tag", [["coming-of age", "Coming of Age"]], ["comingofage"]),
            ], { label: "distinct_tags() merges spellings and sorts the result" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
codes = ["LAS", "IAH", "LAS", "MCI", "IAH"]
unique = {c for c in codes}
print(len(codes), len(unique), "MCI" in unique)
`,
        choices: ["5 3 True", "5 5 True", "3 3 True", "5 3 False"],
        answer: 0,
        why: "Five codes, three of them different. `in` works on a set just as it does on a list.",
      },
      {
        id: "q2",
        prompt: "A common mistake: empty braces. What does this print?",
        program: src`
seen = {}
print(type(seen))
`,
        choices: ["<class 'dict'>", "<class 'set'>", "<class 'list'>", "set()"],
        answer: 0,
        why: "Empty braces have always meant an empty dictionary. An empty set is written `set()`.",
      },
      {
        id: "q3",
        prompt: "Which question does a set answer most directly?",
        choices: ["Which products were viewed but never bought?", "In what order were the products viewed?", "What was the third product viewed?", "How many times was each product viewed?"],
        answer: 0,
        why: "*In one collection but not the other* is a set difference. Order and positions are lost in a set, and counting per product needs a dictionary.",
      },
    ],
    review: [
      "`{expression for item in items}` keeps each value once. Normalise first if different spellings should count as one.",
      "A set has no order and no positions: sort it to show it, and use `difference` or `union` to compare.",
      "`{}` is an empty dictionary; an empty set is `set()`.",
      "Next: two `for` clauses in one comprehension, to flatten lists inside lists.",
    ],
  },

  // ------------------------------------------------------------------ PY-L13-04 nested comprehension
  {
    id: "PY-L13-04",
    version: 2,
    slug: "nested-comprehension",
    title: "Flatten and combine with two for clauses",
    lede: "Two `for` clauses in one comprehension work like a loop inside a loop: they flatten lists of lists, or pair every item of one list with every item of another.",
    focus: "Write a comprehension with two for clauses, in the same order as the nested loops it replaces.",
    minutes: 17,
    objectives: [
      "Flatten a list of lists with `[x for row in rows for x in row]`",
      "Put the `for` clauses in the same order as nested loops, outer first",
      "Tell a flat result (two `for` clauses) from a list of lists (a comprehension inside the expression)",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "tuple-literal", "dict-literal", "dict-lookup", "string-index", "string-format", "string-method", "string-split", "range-call", "arithmetic", "len-call", "for-loop", "nested-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "list-mutate", "comparison", "precedence", "conversion", "nested-dict", "newline-escape", "print-text", "while-loop"],
    teaches: ["nested-comp"],
    blocks: [
      {
        kind: "text",
        md: "Data often arrives in groups: readings grouped by week, order lines grouped by order, tags grouped by question. To work on every value at once you need them in one flat list. With loops that is a loop inside a loop (see Loops & Iteration): `for week in weeks:`, and inside it `for t in week:`, and inside that `temps.append(t)`.\n\nThe comprehension keeps the two `for` lines **in the same order**, outer first, and puts the value in front: `[t for week in weeks for t in week]`.",
      },
      {
        kind: "example",
        title: "Three weeks of readings, one list",
        code: src`
weeks = [
    [6.7, 7.2, 3.3],
    [7.2, 3.9],
    [-2.1, 0.5, 1.1],
]
temps = [t for week in weeks for t in week]
print(temps)
print(len(weeks), len(temps))
`,
        output: "[6.7, 7.2, 3.3, 7.2, 3.9, -2.1, 0.5, 1.1]\n3 8\n",
        note: "Three inner lists, eight readings. The values come out week by week, in the order the nested loops would visit them.",
      },
      {
        kind: "text",
        md: "Reading the clauses in the order of the sentence (*t for t in week, for week in weeks*) is tempting, but Python runs the first `for` first. Swapped, the first clause uses `week` before anything has created it.",
      },
      {
        kind: "error-example",
        title: "The for clauses swapped",
        code: src`
weeks = [[6.7, 7.2], [3.9]]
temps = [t for t in week for week in weeks]
print(temps)
`,
        error: "NameError",
        output: "",
        note: "`NameError: name 'week' is not defined`. The outer loop, the one that creates `week`, has to come first.",
      },
      {
        kind: "text",
        md: "The inner list doesn't have to be a variable of its own: it can be a field of each record. Every order below has a list of lines, and the comprehension produces one pair per line. An order with no lines contributes nothing.",
      },
      {
        kind: "example",
        title: "Every line of every order",
        code: src`
def order_lines(orders):
    return [(order["order_id"], line["sku"]) for order in orders for line in order["lines"]]

orders = [
    {"order_id": "O100282", "lines": [{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}]},
    {"order_id": "O100918", "lines": []},
    {"order_id": "O101219", "lines": [{"sku": "ELE-24781", "qty": 1}]},
]
for pair in order_lines(orders):
    print(pair)
`,
        output: "('O100282', 'SPO-11681')\n('O100282', 'HOM-22847')\n('O101219', 'ELE-24781')\n",
        note: "The outer variable `order` is still available in the inner clause and in the value, which is how each pair keeps its order ID.",
      },
      {
        kind: "text",
        md: "When the second `for` walks a list that doesn't depend on the first, you get **every combination**: every size with every colour, every row with every seat letter.\n\nA different shape is a comprehension **inside** the expression: `[[cell.strip() for cell in line.split(\",\")] for line in lines]` builds a list of lists, one inner list per line, instead of one flat list.\n\n**When to use it:** flattening one level of nesting, or listing combinations. **Mistakes to avoid:** swapping the clauses, and going deeper than two: three `for` clauses are hard to read, and a loop with names for each level is clearer.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Flatten every week",
      prompt: "`all_readings` only returns the first week's readings. Add a second `for` clause so it returns every reading from every week, in order.",
      spec: [
        ["Function", "`all_readings(weeks)`"],
        ["Returns", "one flat list of every reading, week by week"],
      ],
      starter: src`
def all_readings(weeks):
    return [t for t in weeks[0]]

print(all_readings([[6.7, 7.2], [3.9], [-2.1, 0.5]]))
`,
      answer: src`
def all_readings(weeks):
    return [t for week in weeks for t in week]

print(all_readings([[6.7, 7.2], [3.9], [-2.1, 0.5]]))
`,
      wrong: [
        {
          code: src`
def all_readings(weeks):
    return [week for week in weeks]
`,
          fails: ["returns"],
          why: "it copies the weeks themselves, so the result is still a list of lists",
        },
      ],
      hints: ["You need the loop over the weeks first, then the loop over each week's readings.", "The first clause names each week; the second walks that week.", "The value in front stays the single reading."],
      task: {
        checks: [
          fn("returns", "all_readings", [
            example([[[6.7, 7.2], [3.9], [-2.1, 0.5]]], [6.7, 7.2, 3.9, -2.1, 0.5]),
            hiddenCase("a week with no readings", [[[1.5], [], [2.5]]], [1.5, 2.5]),
            hiddenCase("no weeks at all", [[]], []),
          ], { label: "all_readings() flattens every week" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Seat labels for a cabin",
        prompt: "A seat map labels every seat with its row number and letter: `12A`, `12B`, … Write `seat_labels(first_row, last_row, letters)`: return every label for rows `first_row` to `last_row` **inclusive**, row by row, and within a row in the order of `letters`.",
        spec: [
          ["Function", "`seat_labels(first_row, last_row, letters)`"],
          ["letters", "text such as `\"ABCDEF\"`, one character per seat in a row"],
          ["Returns", "a list of labels like `\"12A\"`; `[]` when `last_row` is below `first_row` or there are no letters"],
          ["Example", "`seat_labels(12, 13, \"ABC\")` → `['12A', '12B', '12C', '13A', '13B', '13C']`"],
        ],
        starter: src`
def seat_labels(first_row, last_row, letters):
    return []

print(seat_labels(12, 13, "ABC"))
`,
        answer: src`
def seat_labels(first_row, last_row, letters):
    return [f"{row}{letter}" for row in range(first_row, last_row + 1) for letter in letters]

print(seat_labels(12, 13, "ABC"))
`,
        alternatives: [
          src`
def seat_labels(first_row, last_row, letters):
    labels = []
    row = first_row
    while row <= last_row:
        for letter in letters:
            labels.append(str(row) + letter)
        row += 1
    return labels
`,
        ],
        wrong: [
          {
            code: src`
def seat_labels(first_row, last_row, letters):
    return [f"{row}{letter}" for letter in letters for row in range(first_row, last_row + 1)]
`,
            fails: ["returns"],
            why: "the letter loop is outside, so the labels come out column by column: 12A, 13A, 12B, …",
          },
          {
            code: src`
def seat_labels(first_row, last_row, letters):
    return [f"{row}{letter}" for row in range(first_row, last_row) for letter in letters]
`,
            fails: ["returns"],
            why: "`range` stops before its end, so the last row is missing",
          },
        ],
        hints: [
          "Two independent lists: every row combined with every letter.",
          "The clause you want to change slowest goes first. Rows change slowest here.",
          "`range(start, stop)` (see Loops & Iteration) stops before `stop`, and a text can be walked letter by letter with `for`.",
        ],
        task: {
          checks: [
            fn("returns", "seat_labels", [
              example([12, 13, "ABC"], ["12A", "12B", "12C", "13A", "13B", "13C"]),
              example([1, 1, "AB"], ["1A", "1B"]),
              example([5, 4, "ABC"], []),
              hiddenCase("no seat letters", [3, 6, ""], []),
              hiddenCase("one seat per row", [7, 9, "F"], ["7F", "8F", "9F"]),
              hiddenCase("a full six-seat row", [30, 30, "ABCDEF"], ["30A", "30B", "30C", "30D", "30E", "30F"]),
            ], { label: "seat_labels() lists every row and letter, row by row" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A table from pasted text",
        prompt: "Someone pastes a small table from a spreadsheet: rows on separate lines, cells separated by commas, with stray spaces. Write `parse_table(text)`: return a **list of rows**, each row a list of its cells with the spaces at their ends removed. The result keeps the table's shape: it is not one flat list.",
        spec: [
          ["Function", "`parse_table(text)`"],
          ["text", "lines separated by `\"\\n\"`, cells by `\",\"`; no blank lines"],
          ["Returns", "a list with one inner list per line, each cell stripped"],
          ["Example", "`parse_table(\"ATL, Atlanta\\nBOS ,Boston\")` → `[['ATL', 'Atlanta'], ['BOS', 'Boston']]`"],
        ],
        starter: src`
def parse_table(text):
    return []

print(parse_table("ATL, Atlanta\nBOS ,Boston"))
`,
        answer: src`
def parse_table(text):
    return [[cell.strip() for cell in line.split(",")] for line in text.split("\n")]

print(parse_table("ATL, Atlanta\nBOS ,Boston"))
`,
        alternatives: [
          src`
def parse_table(text):
    rows = []
    for line in text.split("\n"):
        rows.append([cell.strip() for cell in line.split(",")])
    return rows
`,
        ],
        wrong: [
          {
            code: src`
def parse_table(text):
    return [cell.strip() for line in text.split("\n") for cell in line.split(",")]
`,
            fails: ["returns"],
            why: "two `for` clauses flatten the table into one list, losing the rows",
          },
          {
            code: src`
def parse_table(text):
    return [line.split(",") for line in text.split("\n")]
`,
            fails: ["returns"],
            why: "the rows are right but the cells keep their stray spaces",
          },
        ],
        hints: [
          "The result is a list of lists, so the value in front of the outer `for` is itself a list.",
          "Build each row with its own comprehension over that line's cells.",
          "`split` (see String Algorithms) breaks the text into lines with `\"\\n\"`, and each line into cells with `\",\"`.",
        ],
        task: {
          checks: [
            fn("returns", "parse_table", [
              example(["ATL, Atlanta\nBOS ,Boston"], [["ATL", "Atlanta"], ["BOS", "Boston"]]),
              example(["code,city,state"], [["code", "city", "state"]]),
              example(["DFW"], [["DFW"]]),
              hiddenCase("a single column", ["ATL\n BOS\nCLT "], [["ATL"], ["BOS"], ["CLT"]]),
              hiddenCase("an empty cell", ["MIA,,FL"], [["MIA", "", "FL"]]),
              hiddenCase("three rows with spaces everywhere", [" a , b \n c , d \n e , f "], [["a", "b"], ["c", "d"], ["e", "f"]]),
            ], { label: "parse_table() keeps one stripped row per line" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
sizes = ["S", "M"]
colours = ["red", "blue"]
skus = [f"{c}-{s}" for c in colours for s in sizes]
print(skus)
`,
        choices: ["['red-S', 'red-M', 'blue-S', 'blue-M']", "['red-S', 'blue-S', 'red-M', 'blue-M']", "['red-S', 'blue-M']", "[['red-S', 'red-M'], ['blue-S', 'blue-M']]"],
        answer: 0,
        why: "The first clause is the outer loop, so each colour stays fixed while the sizes run through. Two `for` clauses give one flat list.",
      },
      {
        id: "q2",
        prompt: "A common mistake: someone wanted one flat list of amounts. What does this print?",
        program: src`
orders = [[12, 30], [5]]
print([[amount for amount in order] for order in orders])
`,
        choices: ["[[12, 30], [5]]", "[12, 30, 5]", "[12, 30]", "NameError"],
        answer: 0,
        why: "A comprehension inside the value builds one inner list per order: the nesting is kept. For a flat list, write both `for` clauses in one comprehension.",
      },
      {
        id: "q3",
        prompt: "Which of these needs a comprehension with two `for` clauses?",
        choices: ["Every tag of every question, in one list", "The title of every film", "Each film's title looked up by ID", "The distinct countries of the users"],
        answer: 0,
        why: "Tags sit inside questions, one level down, so you need a loop over questions and a loop over each question's tags. The others walk one list once.",
      },
    ],
    review: [
      "`[x for row in rows for x in row]` flattens: the `for` clauses are in the order of nested loops, outer first.",
      "Two independent `for` clauses list every combination.",
      "A comprehension inside the value keeps the nesting: one inner list per outer item.",
      "Next: an `if` at the end that keeps only some items, and when a plain loop is the better choice.",
    ],
  },

  // ------------------------------------------------------------------ PY-L13-05 filter, and when not to use a comprehension
  {
    id: "PY-L13-05",
    version: 2,
    slug: "filter-in-a-comprehension",
    title: "Filter in a comprehension, or use a loop",
    lede: "An `if` at the end of a comprehension keeps only the items that pass. Knowing when a plain loop reads better is part of using comprehensions well.",
    focus: "Add an if clause to keep only some items, and choose a loop when a comprehension would hide what the code does.",
    minutes: 18,
    objectives: [
      "Filter with `[value for item in items if test]`, in lists, dictionaries and sets",
      "Tell the filter `if` at the end from the conditional expression in front",
      "Choose a loop for side effects, early exits and running state",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "list-comp", "dict-comp", "set-comp", "nested-comp", "dict-literal", "dict-lookup", "dict-iterate", "tuple-unpack", "string-index", "string-method", "string-check", "len-call", "comparison", "logical", "arithmetic", "conditional-expr", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "syntax-error", "if-statement", "else-clause", "continue-statement", "print-text", "truthiness"],
    teaches: ["comp-if"],
    blocks: [
      {
        kind: "text",
        md: "The the Collection Algorithms module filter loop had an `if` around the `append`. In a comprehension the same test goes **at the end**: `[value for item in items if test]`. Items that fail the test produce nothing, so the result can be shorter than the input. The same clause works in dictionary and set comprehensions.",
      },
      {
        kind: "example",
        title: "Flights that arrived late",
        code: src`
flights = [
    {"flight": "UA2017", "arrival_delay": -4},
    {"flight": "MQ3443", "arrival_delay": 12},
    {"flight": "MQ3615", "arrival_delay": 42},
    {"flight": "DL1270", "arrival_delay": -25},
    {"flight": "AA1214", "arrival_delay": 16},
]
late = [f["flight"] for f in flights if f["arrival_delay"] >= 15]
print(late)
delays = {f["flight"]: f["arrival_delay"] for f in flights if f["arrival_delay"] >= 15}
print(delays)
`,
        output: "['MQ3615', 'AA1214']\n{'MQ3615': 42, 'AA1214': 16}\n",
        note: "US airline statistics count a flight as late when it arrives 15 or more minutes after schedule. The test reads the delay; the value kept is the flight number, or a pair.",
      },
      {
        kind: "text",
        md: "Two `if`s can appear in a comprehension and they do different jobs. A conditional expression **in front** (“Build a list with a comprehension”) chooses a value, and every item still produces one. An `if` **at the end** decides whether the item produces anything at all.",
      },
      {
        kind: "example",
        title: "Choose or drop",
        code: src`
delays = [-4, 12, 42, -25, 16]
early_as_zero = [d if d > 0 else 0 for d in delays]
only_late = [d for d in delays if d > 0]
print(early_as_zero)
print(only_late)
`,
        output: "[0, 12, 42, 0, 16]\n[12, 42, 16]\n",
        note: "Five delays in: five values out when the `if` chooses, three when it filters.",
      },
      {
        kind: "error-example",
        title: "An else on the filter",
        code: src`
delays = [-4, 12, 42]
late = [d for d in delays if d > 0 else 0]
print(late)
`,
        error: "SyntaxError",
        output: "",
        note: "A filter has no `else`: an item either passes or produces nothing. If you meant *use 0 instead*, that is a conditional expression and it goes in front of `for`.",
      },
      {
        kind: "text",
        md: "An `if` may also follow the first `for` of a two-clause comprehension, to skip whole groups before the inner loop runs: `[sku for o in orders if o[\"paid\"] for sku in o[\"skus\"]]`.\n\n**When a loop is clearer.** A comprehension says *build this collection*. Use a plain `for` loop when the job is something else:\n\n- **side effects**: printing, writing a file, appending to another list;\n- **stopping early**: `break` at the first match;\n- **state that carries over**: a running balance or a previous value, because each item of a comprehension is computed on its own;\n- **several steps per item**: if the expression needs three method calls and two conditions, give the steps names in a loop.\n\nA good rule: one transform and one filter fit in a comprehension; more than that belongs in a loop or a helper function.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Totals of paid orders",
      prompt: "`paid_totals` returns the total of every order. Add a filter so it keeps only orders whose `status` is `\"paid\"`.",
      spec: [
        ["Function", "`paid_totals(orders)`"],
        ["Returns", "the `total` of each paid order, in order"],
      ],
      starter: src`
def paid_totals(orders):
    return [order["total"] for order in orders]

orders = [
    {"order_id": "O101219", "status": "paid", "total": 246.6},
    {"order_id": "O101341", "status": "refunded", "total": 35.84},
    {"order_id": "O108858", "status": "paid", "total": 91.47},
]
print(paid_totals(orders))
`,
      answer: src`
def paid_totals(orders):
    return [order["total"] for order in orders if order["status"] == "paid"]

orders = [
    {"order_id": "O101219", "status": "paid", "total": 246.6},
    {"order_id": "O101341", "status": "refunded", "total": 35.84},
    {"order_id": "O108858", "status": "paid", "total": 91.47},
]
print(paid_totals(orders))
`,
      wrong: [
        {
          code: src`
def paid_totals(orders):
    return [order["total"] if order["status"] == "paid" else 0 for order in orders]
`,
          fails: ["returns"],
          why: "the refunded order is kept as 0 instead of being dropped",
        },
      ],
      hints: ["The filter goes after the `for` clause, inside the brackets.", "It starts with `if` and tests the order's status.", "No `else`: orders that fail the test simply produce nothing."],
      task: {
        checks: [
          fn("returns", "paid_totals", [
            example([[{ order_id: "O101219", status: "paid", total: 246.6 }, { order_id: "O101341", status: "refunded", total: 35.84 }, { order_id: "O108858", status: "paid", total: 91.47 }]], [246.6, 91.47]),
            hiddenCase("no paid orders", [[{ order_id: "O1", status: "cancelled", total: 10 }]], []),
            hiddenCase("an empty list", [[]], []),
          ], { label: "paid_totals() keeps only paid orders" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Valid ZIP codes",
        prompt: "A sign-up form collects US ZIP codes as typed. Write `valid_zips(entries)`: return the entries that are valid five-digit ZIP codes, with the spaces at their ends removed, in the order they were typed. A valid code is exactly five characters long after stripping, and every one of them is a digit.",
        spec: [
          ["Function", "`valid_zips(entries)`"],
          ["entries", "a list of texts as typed"],
          ["Returns", "a new list of stripped five-digit codes; leading zeros are kept (`\"02139\"`)"],
          ["Example", "`valid_zips([\" 02139\", \"9021\", \"10001 \", \"3060A\"])` → `['02139', '10001']`"],
        ],
        starter: src`
def valid_zips(entries):
    return []

print(valid_zips([" 02139", "9021", "10001 ", "3060A"]))
`,
        answer: src`
def valid_zips(entries):
    return [e.strip() for e in entries if len(e.strip()) == 5 and e.strip().isdigit()]

print(valid_zips([" 02139", "9021", "10001 ", "3060A"]))
`,
        alternatives: [
          src`
def valid_zips(entries):
    cleaned = [entry.strip() for entry in entries]
    return [code for code in cleaned if code.isdigit() and len(code) == 5]
`,
        ],
        wrong: [
          {
            code: src`
def valid_zips(entries):
    return [e for e in entries if len(e.strip()) == 5 and e.strip().isdigit()]
`,
            fails: ["returns"],
            why: "the right entries are kept, but with their stray spaces",
          },
          {
            code: src`
def valid_zips(entries):
    return [e.strip() for e in entries if e.strip().isdigit()]
`,
            fails: ["returns"],
            why: "the length isn't checked, so a four-digit code gets through",
          },
          {
            code: src`
def valid_zips(entries):
    return [int(e.strip()) for e in entries if len(e.strip()) == 5 and e.strip().isdigit()]
`,
            fails: ["returns"],
            why: "turning codes into numbers loses the leading zero of 02139",
          },
        ],
        hints: [
          "A transform and a filter together: the value in front is the cleaned code, the `if` at the end decides.",
          "`isdigit` (see String Algorithms) is true only when every character is a digit; `len` checks there are exactly five.",
          "Test the stripped text, and keep the stripped text. ZIP codes are labels, not numbers.",
        ],
        task: {
          checks: [
            fn("returns", "valid_zips", [
              example([[" 02139", "9021", "10001 ", "3060A"]], ["02139", "10001"]),
              example([["94105"]], ["94105"]),
              example([[]], []),
              hiddenCase("a six-digit code", [["123456", "12345"]], ["12345"]),
              hiddenCase("an empty entry", [["", "   ", "60614"]], ["60614"]),
              hiddenCase("a ZIP+4 code with a hyphen", [["30301-1234"]], []),
              hiddenCase("a code with a space in the middle", [["303 01", "00501"]], ["00501"]),
            ], { label: "valid_zips() keeps cleaned five-digit codes" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Balance after each cleared payment",
        prompt: "A bank app shows the account balance after each transaction that has cleared. Pending transactions are not applied yet. Write `balance_history(opening, transactions)`: starting from `opening`, return the balance after each cleared transaction, in order. A comprehension can pick the cleared amounts, but each balance depends on the one before it, so think about which part needs a loop.",
        spec: [
          ["Function", "`balance_history(opening, transactions)`"],
          ["transactions", "dictionaries with `amount` (negative for money out) and `status` (`\"cleared\"` or `\"pending\"`)"],
          ["Returns", "a list with one balance per cleared transaction; `[]` when none have cleared"],
          ["Example", "opening 100 with the starter's transactions → `[220, 174.5, 374.5]`"],
        ],
        starter: src`
def balance_history(opening, transactions):
    return []

transactions = [
    {"amount": 120, "status": "cleared"},
    {"amount": -45.5, "status": "cleared"},
    {"amount": -30, "status": "pending"},
    {"amount": 200, "status": "cleared"},
]
print(balance_history(100, transactions))
`,
        answer: src`
def balance_history(opening, transactions):
    cleared = [t["amount"] for t in transactions if t["status"] == "cleared"]
    balances = []
    balance = opening
    for amount in cleared:
        balance += amount
        balances.append(balance)
    return balances

transactions = [
    {"amount": 120, "status": "cleared"},
    {"amount": -45.5, "status": "cleared"},
    {"amount": -30, "status": "pending"},
    {"amount": 200, "status": "cleared"},
]
print(balance_history(100, transactions))
`,
        alternatives: [
          src`
def balance_history(opening, transactions):
    history = []
    for t in transactions:
        if t["status"] != "cleared":
            continue
        if history:
            history.append(history[-1] + t["amount"])
        else:
            history.append(opening + t["amount"])
    return history
`,
        ],
        wrong: [
          {
            code: src`
def balance_history(opening, transactions):
    return [opening + t["amount"] for t in transactions if t["status"] == "cleared"]
`,
            fails: ["returns"],
            why: "each balance starts again from the opening amount, because a comprehension can't see the previous balance",
          },
          {
            code: src`
def balance_history(opening, transactions):
    balances = []
    balance = opening
    for t in transactions:
        balance += t["amount"]
        balances.append(balance)
    return balances
`,
            fails: ["returns"],
            why: "pending transactions are applied as if they had cleared",
          },
          {
            code: src`
def balance_history(opening, transactions):
    balances = []
    balance = 0
    for t in transactions:
        if t["status"] == "cleared":
            balance += t["amount"]
            balances.append(balance)
    return balances
`,
            fails: ["returns"],
            why: "the balance starts at 0 and ignores the opening amount",
          },
        ],
        hints: [
          "Split the job: picking the cleared amounts is a filter; adding them up one after another is running state.",
          "A comprehension computes each item on its own, so the running balance needs a variable that a loop updates.",
          "Start the running balance at `opening`, and record it after each cleared amount is added.",
        ],
        task: {
          checks: [
            fn("returns", "balance_history", [
              example([100, ledger], [220, 174.5, 374.5], {}),
              example([0, [{ amount: 50, status: "cleared" }]], [50]),
              example([25, []], []),
              hiddenCase("only pending transactions", [500, [{ amount: -20, status: "pending" }, { amount: 10, status: "pending" }]], []),
              hiddenCase("a balance that goes below zero", [10, [{ amount: -40, status: "cleared" }, { amount: 5, status: "cleared" }]], [-30, -25]),
              hiddenCase("a pending transaction between cleared ones", [0, [{ amount: 1, status: "cleared" }, { amount: 100, status: "pending" }, { amount: 2, status: "cleared" }]], [1, 3]),
            ], { label: "balance_history() runs the balance over cleared transactions only", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "balance_history", [
              keepsInput([100, ledger]),
            ], { label: "balance_history() leaves the transactions unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
scores = {"Ana": 72, "Ben": 58, "Chen": 91}
passed = {name: s for name, s in scores.items() if s >= 60}
print(passed)
`,
        choices: ["{'Ana': 72, 'Chen': 91}", "{'Ana': 72, 'Ben': 58, 'Chen': 91}", "['Ana', 'Chen']", "{'Ben': 58}"],
        answer: 0,
        why: "The filter drops Ben's pair; the other pairs are copied unchanged.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the `if` is in front, so it chooses instead of filtering. What does this print?",
        program: src`
temps = [3, -2, 0, -5]
print([t if t > 0 else 0 for t in temps])
`,
        choices: ["[3, 0, 0, 0]", "[3]", "[3, -2, 0, -5]", "[0, -2, 0, -5]"],
        answer: 0,
        why: "A conditional expression in front gives every item a value, so all four positions remain. To keep only 3, the `if` goes at the end.",
      },
      {
        id: "q3",
        prompt: "Which job is clearer as a plain `for` loop than as a comprehension?",
        choices: ["Printing a warning line for every overbooked flight", "Listing the IDs of the refunded orders", "Building a dictionary from SKU to price for in-stock products", "Collecting the distinct airports in a schedule"],
        answer: 0,
        why: "Printing is a side effect, not a collection being built. The other three each build a list, dictionary or set.",
      },
    ],
    review: [
      "`[value for item in items if test]` keeps only items that pass; the result can be shorter than the input.",
      "In front, `a if test else b` chooses a value; at the end, `if test` filters. A filter has no `else`.",
      "Use a loop for printing, stopping early, running totals, and anything that needs several named steps.",
      "Next module: built-in functions such as `zip`, `sorted` with a key, `any`, `all`, `sum`, `min` and `max`.",
    ],
  },
];
