/**
 * M13 practice: ten independent problems on the comprehensions of PY-L13-01 … PY-L13-05.
 *
 * Mix: 3 function implementations, 2 data transformations, 2 debugging (genuinely broken functions), 1 validation,
 * 1 refactoring (same behaviour, graded by the original's cases plus a check that the loop became a comprehension,
 * because that is the point of the exercise), 2 output predictions. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19.
 * Hard: 20, 22.
 *
 * Fixtures are small slices of course datasets: Stack Exchange question tags (D12), Runtime Films users and tags
 * (R02), Runtime Market products (R01-shaped, inline) and NOAA readings (D07). Every function question is graded by
 * calling the learner's function on the public examples and on hidden inputs (empty, single, repeats, case and
 * spacing variants, boundaries); mutation is checked where it matters.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, usesListComp } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures

const priceLines = ["spo-11681, 7.49", "HOM-22847,31", " ele-24781 ,171.99"];

const signups = ["nora@fastmail.com", "Nora@Fastmail.com", "jamal.walker62@icloud.com ", "grace_walker29@yahoo.com", " jamal.walker62@icloud.com"];

const importRows = [
  { user_id: "U01", email: "nora@fastmail.com", age: "34" },
  { user_id: "U02", email: "jamal.walker62icloud.com", age: "29" },
  { user_id: "U03", email: "grace_walker29@yahoo.com", age: "" },
  { user_id: "U04", email: "theo@@gmail.com", age: "41" },
];

const tagged = [
  { question_id: 70015316, tags: "python|dataclasses" },
  { question_id: 70015420, tags: " Pandas |dataframe|" },
  { question_id: 70015577, tags: "" },
];

const expectedStock = { "SPO-11681": 14, "HOM-22847": 9, "ELE-24781": 6 };
const countedStock = { "SPO-11681": 14, "HOM-22847": 7, "TOY-54564": 2 };

/** Prerequisite tags shared by most questions: a function over a list, using a comprehension. */
const fnBase = ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "dict-literal", "dict-lookup", "string-index", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m13Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q13-02",
    version: 2,
    slug: "price-table-from-pasted-lines",
    title: "A price table from pasted lines",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "dict-comp", "string-method", "string-split", "conversion", "tuple-unpack", "spaces-in-text", "print-text", "list-mutate"],
    prompt: "A supplier emails price updates as lines of text, `SKU, price`, typed by hand. Turn them into a lookup the shop can use: SKU to price. A SKU that appears twice was updated, so its later price is the one that counts.",
    spec: [
      ["Function", "`price_table(lines)`"],
      ["lines", "a list of texts such as `\"spo-11681, 7.49\"`: a SKU, a comma, a price; spaces may surround either part"],
      ["Returns", "a dictionary from the SKU (spaces removed at the ends, in capitals) to the price as a `float`"],
      ["Rules", "a repeated SKU keeps the price from its later line; no lines gives `{}`"],
    ],
    hiddenKinds: ["a SKU updated by a later line", "the same SKU typed in different capitals", "a whole-number price", "a single line"],
    hints: [
      "One pair per line, so a dictionary comprehension (or a loop that stores one pair per pass) fits.",
      "`split(\",\")` gives the two parts of a line. Clean the SKU with `strip` and `upper`; `float` accepts spaces around the digits.",
      "A dictionary keeps one value per key, and a later assignment replaces an earlier one, which is exactly the update rule.",
    ],
    explanation: "Each line is split on its comma; the SKU part is stripped and upper-cased, and the price part goes through `float`. Building the dictionary in line order means a repeated SKU is stored twice and the later price replaces the earlier one. Leaving the price as text, or skipping a SKU that was already seen, are the usual mistakes; forgetting `upper` makes `spo-11681` and `SPO-11681` two different products.",
    code: {
      starter: src`
def price_table(lines):
    return {}

lines = ["spo-11681, 7.49", "HOM-22847,31", " ele-24781 ,171.99"]
print(price_table(lines))
`,
      answer: src`
def price_table(lines):
    return {line.split(",")[0].strip().upper(): float(line.split(",")[1]) for line in lines}

lines = ["spo-11681, 7.49", "HOM-22847,31", " ele-24781 ,171.99"]
print(price_table(lines))
`,
      alternatives: [
        src`
def price_table(lines):
    table = {}
    for line in lines:
        sku, price = line.split(",")
        table[sku.strip().upper()] = float(price.strip())
    return table
`,
      ],
      wrong: [
        {
          code: src`
def price_table(lines):
    return {line.split(",")[0].strip().upper(): line.split(",")[1].strip() for line in lines}
`,
          fails: ["returns"],
          why: "the prices stay as text, so they can't be compared or added",
        },
        {
          code: src`
def price_table(lines):
    return {line.split(",")[0].strip(): float(line.split(",")[1]) for line in lines}
`,
          fails: ["returns"],
          why: "without `upper`, a SKU typed in lower case becomes a second product",
        },
        {
          code: src`
def price_table(lines):
    table = {}
    for line in lines:
        sku, price = line.split(",")
        sku = sku.strip().upper()
        if sku not in table:
            table[sku] = float(price)
    return table
`,
          fails: ["returns"],
          why: "the first price is kept, so an update on a later line is ignored",
        },
      ],
      task: {
        checks: [
          fn("returns", "price_table", [
            example([priceLines], { "SPO-11681": 7.49, "HOM-22847": py.float(31), "ELE-24781": 171.99 }),
            example([["TOY-54564,26.99"]], { "TOY-54564": 26.99 }),
            example([[]], {}),
            hiddenCase("a SKU updated by a later line", [["HOM-22847, 31", "SPO-11681,7.49", "HOM-22847, 29.5"]], { "HOM-22847": 29.5, "SPO-11681": 7.49 }),
            hiddenCase("the same SKU typed in different capitals", [["toy-1,2", "TOY-1 ,3"]], { "TOY-1": py.float(3) }),
            hiddenCase("a whole-number price", [["ELE-5, 120"]], { "ELE-5": py.float(120) }),
            hiddenCase("a single line with spaces everywhere", [["  hom-9  ,  4.25  "]], { "HOM-9": 4.25 }),
          ], { label: "price_table() maps each cleaned SKU to its latest price" }),
        ],
      },
    },
  },
  {
    id: "PY-Q13-03",
    version: 2,
    slug: "sign-ups-counted-twice",
    title: "Sign-ups counted twice",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: [...fnBase, "set-comp", "string-method", "len-call", "spaces-in-text", "print-text", "set-literal"],
    prompt: "The launch dashboard says five people signed up, but support knows of three: some people submitted the form twice, once with different capital letters or a stray space. `unique_signups` cleans every address and then counts them. Find why it still over-counts and fix it.",
    spec: [
      ["Function", "`unique_signups(emails)`"],
      ["emails", "a list of email addresses as typed"],
      ["Returns", "how many **different** people signed up: addresses that match after removing end spaces and lower-casing count once"],
      ["Keep", "the function name and that it returns a whole number"],
    ],
    hiddenKinds: ["one person who signed up three times", "addresses that differ only in capitals", "addresses that differ only in spaces at the ends", "no sign-ups"],
    hints: [
      "Print `cleaned` for the starter's list. Are the repeated people really gone from it?",
      "A list keeps every value, repeats included. Which collection keeps each value once?",
      "Count the distinct cleaned addresses, not all of them.",
    ],
    explanation: "Cleaning makes `Nora@Fastmail.com` and `nora@fastmail.com` the same text, but a list still holds both copies, so `len` counts the repeats. Collecting the cleaned addresses in a set comprehension (or calling `set` on the list) keeps each once. Building the set from the raw addresses, or cleaning only one way, leaves near-duplicates that are counted twice.",
    code: {
      starter: src`
def unique_signups(emails):
    cleaned = [email.strip().lower() for email in emails]
    return len(cleaned)

emails = ["nora@fastmail.com", "Nora@Fastmail.com", "jamal.walker62@icloud.com ", "grace_walker29@yahoo.com", " jamal.walker62@icloud.com"]
print(unique_signups(emails))
`,
      answer: src`
def unique_signups(emails):
    cleaned = {email.strip().lower() for email in emails}
    return len(cleaned)

emails = ["nora@fastmail.com", "Nora@Fastmail.com", "jamal.walker62@icloud.com ", "grace_walker29@yahoo.com", " jamal.walker62@icloud.com"]
print(unique_signups(emails))
`,
      alternatives: [
        src`
def unique_signups(emails):
    cleaned = [email.strip().lower() for email in emails]
    return len(set(cleaned))
`,
      ],
      wrong: [
        {
          code: src`
def unique_signups(emails):
    return len({email for email in emails})
`,
          fails: ["returns"],
          why: "a set of the raw addresses still treats `Nora@` and `nora@` as two people",
        },
        {
          code: src`
def unique_signups(emails):
    return len({email.lower() for email in emails})
`,
          fails: ["returns"],
          why: "addresses with a stray space are still counted separately",
        },
      ],
      task: {
        checks: [
          fn("returns", "unique_signups", [
            example([signups], 3),
            example([["theo@gmail.com"]], 1),
            example([["a@x.com", "b@x.com"]], 2),
            hiddenCase("one person who signed up three times", [["ana@x.org", "ana@x.org", "ana@x.org"]], 1),
            hiddenCase("addresses that differ only in capitals", [["ANA@X.ORG", "ana@x.org", "Ana@X.org"]], 1),
            hiddenCase("addresses that differ only in spaces at the ends", [["  ben@y.net", "ben@y.net  "]], 1),
            hiddenCase("no sign-ups", [[]], 0),
          ], { label: "unique_signups() counts each person once" }),
        ],
      },
    },
  },
  {
    id: "PY-Q13-06",
    version: 2,
    slug: "share-of-the-vote",
    title: "Share of the vote",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "arithmetic", "comparison", "if-statement", "reassignment", "print-several", "conditional-expr"],
    prompt: "An election page shows each candidate's share of the vote as a percentage. Given the vote counts in ballot order, return the percentages in the same order.",
    spec: [
      ["Function", "`vote_shares(votes)`"],
      ["votes", "a list of whole numbers, 0 or more"],
      ["Returns", "a new list of floats: each count × 100 ÷ the total of all counts, in the same order"],
      ["Rules", "when nobody has voted yet (the total is 0) every share is `0.0`; no candidates gives `[]`"],
    ],
    hiddenKinds: ["every count zero", "a single candidate", "shares that are not whole numbers", "no candidates"],
    hints: [
      "Two passes: first work out the total, then build one share per count.",
      "Each share is the count times 100, divided by the total, with `/` so the result is a float.",
      "Dividing by a total of 0 is an error, so decide what happens in that case before dividing.",
    ],
    explanation: "Add up the counts first; then a comprehension divides each count (times 100) by that total. `/` always gives a float, so 50 votes of 100 is `50.0`. A total of 0 needs its own branch, otherwise the first division raises ZeroDivisionError. `//` would round every share down, and dividing by the number of candidates instead of the total gives the wrong percentages.",
    code: {
      starter: src`
def vote_shares(votes):
    return []

print(vote_shares([50, 30, 20]))
`,
      answer: src`
def vote_shares(votes):
    total = 0
    for count in votes:
        total += count
    if total == 0:
        return [0.0 for count in votes]
    return [count * 100 / total for count in votes]

print(vote_shares([50, 30, 20]))
`,
      alternatives: [
        src`
def vote_shares(votes):
    total = 0
    for count in votes:
        total = total + count
    return [100 * count / total if total else 0.0 for count in votes]
`,
      ],
      wrong: [
        {
          code: src`
def vote_shares(votes):
    total = 0
    for count in votes:
        total += count
    return [count * 100 / total for count in votes]
`,
          fails: ["returns"],
          why: "when nobody has voted, dividing by a total of 0 raises ZeroDivisionError",
        },
        {
          code: src`
def vote_shares(votes):
    total = 0
    for count in votes:
        total += count
    if total == 0:
        return [0.0 for count in votes]
    return [count * 100 // total for count in votes]
`,
          fails: ["returns"],
          why: "`//` rounds every share down to a whole number, so a third becomes 33",
        },
        {
          code: src`
def vote_shares(votes):
    if len(votes) == 0:
        return []
    return [count * 100 / len(votes) for count in votes]
`,
          fails: ["returns"],
          why: "it divides by the number of candidates instead of the number of votes",
        },
      ],
      task: {
        checks: [
          fn("returns", "vote_shares", [
            example([[50, 30, 20]], [py.float(50), py.float(30), py.float(20)]),
            example([[3, 1]], [py.float(75), py.float(25)]),
            example([[]], []),
            hiddenCase("every count zero", [[0, 0, 0]], [py.float(0), py.float(0), py.float(0)]),
            hiddenCase("a single candidate", [[812]], [py.float(100)]),
            hiddenCase("shares that are not whole numbers", [[1, 1, 1]], [100 / 3, 100 / 3, 100 / 3]),
            hiddenCase("a candidate with no votes", [[0, 9, 1]], [py.float(0), py.float(90), py.float(10)]),
          ], { label: "vote_shares() turns counts into percentages of the total" }),
        ],
      },
    },
  },
  {
    id: "PY-Q13-10",
    version: 2,
    slug: "rows-that-fail-the-import-check",
    title: "Rows that fail the import check",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fnBase, "comp-if", "string-method", "string-check", "value-count", "comparison", "logical", "if-statement", "print-text"],
    prompt: "Before importing a user list, report the rows that would break it, so someone can fix them by hand. A row is invalid when its email does not contain exactly one `@`, or contains a space, or when its age is not a whole number written with digits only.",
    spec: [
      ["Function", "`invalid_rows(rows)`"],
      ["rows", "a list of dictionaries with text fields `\"user_id\"`, `\"email\"` and `\"age\"`"],
      ["Returns", "the `user_id` of every invalid row, in the order the rows appear; `[]` when all rows are valid"],
      ["Rules", "an empty age is invalid; a negative age such as `\"-3\"` is invalid (the minus is not a digit)"],
    ],
    hiddenKinds: ["an email with two @ signs", "an email with a space in it", "a negative age", "a row that breaks two rules", "every row valid"],
    hints: [
      "Keep some rows and return one field from each: a comprehension with a filter.",
      "A row is invalid if **any** of the three problems is present, so join the tests with `or`.",
      "`count` (see String Algorithms) tells how many `@` signs there are, and `isdigit` is False for an empty text and for a minus sign.",
    ],
    explanation: "The filter keeps a row when `email.count(\"@\") != 1`, or a space is `in` the email, or `not age.isdigit()`. Testing `\"@\" in email` lets `theo@@gmail.com` through, and joining the tests with `and` only reports rows that break every rule at once. Each invalid row is reported once even if it breaks two rules, because the comprehension visits each row once.",
    code: {
      starter: src`
def invalid_rows(rows):
    return []

rows = [
    {"user_id": "U01", "email": "nora@fastmail.com", "age": "34"},
    {"user_id": "U02", "email": "jamal.walker62icloud.com", "age": "29"},
    {"user_id": "U03", "email": "grace_walker29@yahoo.com", "age": ""},
    {"user_id": "U04", "email": "theo@@gmail.com", "age": "41"},
]
print(invalid_rows(rows))
`,
      answer: src`
def invalid_rows(rows):
    return [
        row["user_id"]
        for row in rows
        if row["email"].count("@") != 1 or " " in row["email"] or not row["age"].isdigit()
    ]

rows = [
    {"user_id": "U01", "email": "nora@fastmail.com", "age": "34"},
    {"user_id": "U02", "email": "jamal.walker62icloud.com", "age": "29"},
    {"user_id": "U03", "email": "grace_walker29@yahoo.com", "age": ""},
    {"user_id": "U04", "email": "theo@@gmail.com", "age": "41"},
]
print(invalid_rows(rows))
`,
      alternatives: [
        src`
def is_valid(row):
    email = row["email"]
    return email.count("@") == 1 and " " not in email and row["age"].isdigit()

def invalid_rows(rows):
    return [row["user_id"] for row in rows if not is_valid(row)]
`,
      ],
      wrong: [
        {
          code: src`
def invalid_rows(rows):
    return [r["user_id"] for r in rows if "@" not in r["email"] or " " in r["email"] or not r["age"].isdigit()]
`,
          fails: ["returns"],
          why: "an email with two @ signs still passes",
        },
        {
          code: src`
def invalid_rows(rows):
    return [r["user_id"] for r in rows if r["email"].count("@") != 1 and not r["age"].isdigit()]
`,
          fails: ["returns"],
          why: "`and` only reports rows that break both rules at once",
        },
        {
          code: src`
def invalid_rows(rows):
    return [r["user_id"] for r in rows if r["email"].count("@") != 1 or not r["age"].isdigit()]
`,
          fails: ["returns"],
          why: "an email with a space in it is not reported",
        },
      ],
      task: {
        checks: [
          fn("returns", "invalid_rows", [
            example([importRows], ["U02", "U03", "U04"]),
            example([[{ user_id: "U09", email: "ana@x.org", age: "18" }]], []),
            example([[]], []),
            hiddenCase("an email with two @ signs", [[{ user_id: "A", email: "a@b@c.com", age: "20" }]], ["A"]),
            hiddenCase("an email with a space in it", [[{ user_id: "B", email: "ben smith@x.org", age: "33" }]], ["B"]),
            hiddenCase("a negative age", [[{ user_id: "C", email: "c@x.org", age: "-3" }, { user_id: "D", email: "d@x.org", age: "0" }]], ["C"]),
            hiddenCase("a row that breaks two rules", [[{ user_id: "E", email: "e x.org", age: "abc" }]], ["E"]),
            hiddenCase("every row valid", [[{ user_id: "F", email: "f@x.org", age: "7" }, { user_id: "G", email: "g@y.net", age: "102" }]], []),
          ], { label: "invalid_rows() reports every row that breaks a rule, once" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q13-12",
    version: 2,
    slug: "keys-that-collide",
    title: "Keys that collide",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "dict-literal", "dict-comp", "dict-iterate", "tuple-unpack", "string-method", "len-call", "for-loop", "membership", "print-call", "print-several", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Clean each key by hand first: what does `\"Austin \"` become? And `\"austin\"`?",
      "When two pairs produce the same key, the later value replaces the earlier one.",
      "A key keeps the position where it was first created, even when its value is replaced later.",
    ],
    explanation: "`\"Austin \"` and `\"austin\"` both become `Austin`, and `\"Dallas\"` and `\"DALLAS\"` both become `Dallas`. Each later pair replaces the value (5 and 2), but each key stays where it was first added, so Austin comes first. The original has four keys; the cleaned dictionary has two.",
    predict: {
      program: src`
raw = {"Austin ": 3, "austin": 5, "Dallas": 0, "DALLAS": 2}
clean = {city.strip().title(): n for city, n in raw.items()}
print(clean)
print(len(raw), len(clean))
`,
      output: "{'Austin': 5, 'Dallas': 2}\n4 2\n",
      wrongPredictions: [
        "{'Austin': 3, 'Dallas': 0}\n4 2",
        "{'Austin': 8, 'Dallas': 2}\n4 2",
        "{'Austin ': 3, 'Austin': 5, 'Dallas': 0, 'Dallas': 2}\n4 4",
        "{'Dallas': 2, 'Austin': 5}\n4 2",
      ],
    },
  },
  {
    id: "PY-Q13-13",
    version: 2,
    slug: "tags-in-the-order-used",
    title: "Tags in the order they were used",
    format: "debugging",
    difficulty: "medium",
    minutes: 10,
    requires: [...fnBase, "set-comp", "dict-comp", "list-sort", "list-mutate", "string-method", "if-statement", "boolean", "print-text", "logical", "print-several", "set-literal"],
    prompt: "A film page shows its tags in the order fans first used them, each tag once, ignoring capitals and spaces at the ends. `tags_in_order` does merge the repeats, but the page now lists the tags alphabetically, which buries the tag most people used first. Fix it so the first-seen order is kept.",
    spec: [
      ["Function", "`tags_in_order(tags)`"],
      ["tags", "a list of tags as typed"],
      ["Returns", "a list of cleaned tags (stripped, lower-case), each once, in the order each first appears"],
      ["Keep", "the function name and that it returns a list"],
    ],
    hiddenKinds: ["a tag repeated in different capitals", "tags already in alphabetical order", "tags in reverse alphabetical order", "no tags"],
    hints: [
      "Which line throws the order away: the set, the sorting, or both?",
      "A set never remembers order, so it can't be the collection you return from. Something that keeps insertion order has to do the de-duplicating.",
      "A list that only appends a cleaned tag when it isn't already there keeps first-seen order. So do the keys of a dictionary.",
    ],
    explanation: "The set merges repeats but forgets order, and `sorted` then imposes alphabetical order. Two order-keeping fixes: walk the tags and append each cleaned tag only if it isn't already in the result list, or build a dictionary comprehension with the cleaned tags as keys (keys keep the position where they were first added) and take `list(...)` of it. Checking for a repeat before cleaning lets `Noir` and `noir` both in.",
    code: {
      starter: src`
def tags_in_order(tags):
    return sorted({tag.strip().lower() for tag in tags})

print(tags_in_order(["time travel", "Noir", "noir ", "heist", "Time Travel"]))
`,
      answer: src`
def tags_in_order(tags):
    ordered = []
    for tag in tags:
        clean = tag.strip().lower()
        if clean not in ordered:
            ordered.append(clean)
    return ordered

print(tags_in_order(["time travel", "Noir", "noir ", "heist", "Time Travel"]))
`,
      alternatives: [
        src`
def tags_in_order(tags):
    first_seen = {tag.strip().lower(): True for tag in tags}
    return list(first_seen)
`,
      ],
      wrong: [
        {
          code: src`
def tags_in_order(tags):
    return [tag.strip().lower() for tag in tags]
`,
          fails: ["returns"],
          why: "the order is right but every repeat is kept",
        },
        {
          code: src`
def tags_in_order(tags):
    ordered = []
    for tag in tags:
        if tag not in ordered:
            ordered.append(tag.strip().lower())
    return ordered
`,
          fails: ["returns"],
          why: "it checks the raw tag but stores the cleaned one, so `Noir` and `noir` both get in",
        },
      ],
      task: {
        checks: [
          fn("returns", "tags_in_order", [
            example([["time travel", "Noir", "noir ", "heist", "Time Travel"]], ["time travel", "noir", "heist"]),
            example([["drama"]], ["drama"]),
            example([["b", "a", "b"]], ["b", "a"]),
            hiddenCase("a tag repeated in different capitals", [["SCI-FI", "sci-fi", "Sci-Fi"]], ["sci-fi"]),
            hiddenCase("tags already in alphabetical order", [["action", "comedy", "drama"]], ["action", "comedy", "drama"]),
            hiddenCase("tags in reverse alphabetical order", [["western", "noir", " heist"]], ["western", "noir", "heist"]),
            hiddenCase("no tags", [[]], []),
          ], { label: "tags_in_order() keeps each cleaned tag once, in first-seen order" }),
        ],
      },
    },
  },
  {
    id: "PY-Q13-16",
    version: 2,
    slug: "price-labels-without-the-loop",
    title: "Price labels without the loop",
    format: "refactoring",
    difficulty: "medium",
    minutes: 10,
    requires: [...fnBase, "list-mutate", "if-statement", "else-clause", "comparison", "conditional-expr", "string-format", "print-text", "print-several"],
    prompt: "The team's style guide says a function that only builds a list from another list should be a comprehension. Refactor `price_labels` into a list comprehension. **Behaviour must not change**: free items still say `Free`, every other price shows the currency sign and two decimals, and there is still one label per price, in order.",
    spec: [
      ["Function", "`price_labels(prices, currency)` (same name, same result)"],
      ["prices", "a list of prices, 0 or more"],
      ["Returns", "one label per price: `\"Free\"` for 0, otherwise like `\"$12.50\"`"],
      ["Structure", "the result is built by a list comprehension, not by `append` in a loop"],
    ],
    hiddenKinds: ["a price of 0.0", "a price with many decimals", "a different currency sign", "no prices"],
    hints: [
      "The `if`/`else` inside the loop chooses between two labels for every price. Which comprehension `if` chooses rather than filters?",
      "A conditional expression goes in front of `for`; an `if` at the end would drop the free items.",
      "Keep the f-string exactly as it is; only the shape of the code changes.",
    ],
    explanation: "Every price produces exactly one label, so the comprehension needs a conditional expression in front of `for`: `\"Free\" if price == 0 else f\"{currency}{price:.2f}\"`. Moving the test to the end (`… for price in prices if price != 0`) turns it into a filter and silently drops free items, which changes the behaviour the refactor promised to keep.",
    code: {
      starter: src`
def price_labels(prices, currency):
    labels = []
    for price in prices:
        if price == 0:
            labels.append("Free")
        else:
            labels.append(f"{currency}{price:.2f}")
    return labels

print(price_labels([12.5, 0, 7.49], "$"))
`,
      answer: src`
def price_labels(prices, currency):
    return ["Free" if price == 0 else f"{currency}{price:.2f}" for price in prices]

print(price_labels([12.5, 0, 7.49], "$"))
`,
      alternatives: [
        src`
def price_labels(prices, currency):
    return [f"{currency}{price:.2f}" if price != 0 else "Free" for price in prices]
`,
      ],
      wrong: [
        {
          code: src`
def price_labels(prices, currency):
    return [f"{currency}{price:.2f}" for price in prices if price != 0]
`,
          fails: ["returns"],
          why: "the test became a filter, so free items vanish instead of saying Free",
        },
        {
          code: src`
def price_labels(prices, currency):
    return [f"{currency}{price:.2f}" for price in prices]
`,
          fails: ["returns"],
          why: "a free item shows `$0.00` instead of `Free`",
        },
        {
          code: src`
def price_labels(prices, currency):
    labels = []
    for price in prices:
        labels.append("Free" if price == 0 else f"{currency}{price:.2f}")
    return labels
`,
          fails: ["comp"],
          why: "the labels are right, but it is still a loop with `append`",
        },
      ],
      task: {
        checks: [
          fn("returns", "price_labels", [
            example([[12.5, 0, 7.49], "$"], ["$12.50", "Free", "$7.49"]),
            example([[31], "£"], ["£31.00"]),
            example([[], "$"], []),
            hiddenCase("a price of 0.0", [[py.float(0), 5], "$"], ["Free", "$5.00"]),
            hiddenCase("a price with many decimals", [[19.999], "$"], ["$20.00"]),
            hiddenCase("a different currency sign", [[3.5, 0], "€"], ["€3.50", "Free"]),
          ], { label: "price_labels() still returns the same labels" }),
          usesListComp("comp", "price_labels() builds its result with a list comprehension", "Replace the empty list, the loop and the appends with one comprehension that returns the labels."),
        ],
      },
    },
  },
  {
    id: "PY-Q13-19",
    version: 2,
    slug: "one-row-per-tag",
    title: "One row per tag",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: [...fnBase, "nested-comp", "comp-if", "string-method", "string-split", "spaces-in-text", "print-text", "comparison", "if-statement", "list-mutate", "nested-loop"],
    prompt: "A question export stores all of a question's tags in one text, separated by `|`. A reporting database wants **one row per tag** instead, like a SQL table: `{\"question_id\": …, \"tag\": …}`. Tags are cleaned (spaces at the ends removed, lower case), and empty pieces, which come from a stray `|` or a question with no tags, are skipped.",
    spec: [
      ["Function", "`tag_rows(questions)`"],
      ["questions", "a list of dictionaries with `\"question_id\"` and `\"tags\"` (text such as `\"python|dataclasses\"`)"],
      ["Returns", "a new list of new dictionaries `{\"question_id\": …, \"tag\": …}`, questions in order and each question's tags in order"],
      ["Must not", "change the question dictionaries"],
    ],
    hiddenKinds: ["a stray separator at the end", "two separators in a row", "a question with no tags", "a tag with capitals and spaces", "no questions"],
    hints: [
      "One output row per tag of each question: two `for` clauses, questions first, then the pieces of that question's tags.",
      "A filter at the end can skip pieces that are empty once stripped.",
      "Each row is a new dictionary built in the value part of the comprehension, so the input stays untouched.",
    ],
    explanation: "Flatten with two `for` clauses (question, then each piece of `tags.split(\"|\")`), filter out pieces that are blank after `strip`, and build a fresh dictionary per remaining tag. Without the filter, `\"pandas|\"` produces a row with an empty tag; without `strip`/`lower`, `\" Pandas \"` becomes a different tag from `pandas`; returning bare tags loses which question they belong to.",
    code: {
      starter: src`
def tag_rows(questions):
    return []

questions = [
    {"question_id": 70015316, "tags": "python|dataclasses"},
    {"question_id": 70015420, "tags": " Pandas |dataframe|"},
    {"question_id": 70015577, "tags": ""},
]
for row in tag_rows(questions):
    print(row)
`,
      answer: src`
def tag_rows(questions):
    return [
        {"question_id": q["question_id"], "tag": piece.strip().lower()}
        for q in questions
        for piece in q["tags"].split("|")
        if piece.strip()
    ]

questions = [
    {"question_id": 70015316, "tags": "python|dataclasses"},
    {"question_id": 70015420, "tags": " Pandas |dataframe|"},
    {"question_id": 70015577, "tags": ""},
]
for row in tag_rows(questions):
    print(row)
`,
      alternatives: [
        src`
def tag_rows(questions):
    rows = []
    for question in questions:
        for piece in question["tags"].split("|"):
            tag = piece.strip().lower()
            if tag != "":
                rows.append({"question_id": question["question_id"], "tag": tag})
    return rows
`,
      ],
      wrong: [
        {
          code: src`
def tag_rows(questions):
    return [{"question_id": q["question_id"], "tag": p.strip().lower()} for q in questions for p in q["tags"].split("|")]
`,
          fails: ["returns"],
          why: "empty pieces become rows with an empty tag",
        },
        {
          code: src`
def tag_rows(questions):
    return [{"question_id": q["question_id"], "tag": p} for q in questions for p in q["tags"].split("|") if p]
`,
          fails: ["returns"],
          why: "the tags keep their capitals and spaces",
        },
        {
          code: src`
def tag_rows(questions):
    for q in questions:
        q["tags"] = [p.strip().lower() for p in q["tags"].split("|") if p.strip()]
    return [{"question_id": q["question_id"], "tag": t} for q in questions for t in q["tags"]]
`,
          fails: ["keeps-input"],
          why: "the rows are right, but it overwrites each question's tags text with a list",
        },
      ],
      task: {
        checks: [
          fn("returns", "tag_rows", [
            example([tagged], [
              { question_id: 70015316, tag: "python" },
              { question_id: 70015316, tag: "dataclasses" },
              { question_id: 70015420, tag: "pandas" },
              { question_id: 70015420, tag: "dataframe" },
            ]),
            example([[{ question_id: 1, tags: "sql" }]], [{ question_id: 1, tag: "sql" }]),
            example([[]], []),
            hiddenCase("two separators in a row", [[{ question_id: 2, tags: "git||bash" }]], [{ question_id: 2, tag: "git" }, { question_id: 2, tag: "bash" }]),
            hiddenCase("a question with no tags between two tagged ones", [[{ question_id: 3, tags: "a" }, { question_id: 4, tags: "  " }, { question_id: 5, tags: "b" }]], [{ question_id: 3, tag: "a" }, { question_id: 5, tag: "b" }]),
            hiddenCase("a tag with capitals and spaces", [[{ question_id: 6, tags: "  Python 3 |NumPy" }]], [{ question_id: 6, tag: "python 3" }, { question_id: 6, tag: "numpy" }]),
          ], { label: "tag_rows() gives one cleaned row per tag" }),
          fn("keeps-input", "tag_rows", [
            keepsInput([tagged]),
            keepsInput([[{ question_id: 7, tags: "x|Y" }]], { label: "a single question" }),
          ], { label: "tag_rows() leaves the questions unchanged" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q13-20",
    version: 2,
    slug: "stock-count-discrepancies",
    title: "Stock count discrepancies",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 18,
    requires: [...fnBase, "dict-comp", "comp-if", "set-op", "dict-iterate", "tuple-unpack", "conditional-expr", "arithmetic", "comparison", "precedence", "print-several", "if-statement", "list-mutate", "logical", "reassignment"],
    prompt: "After a warehouse stock-take, compare what the system expected with what was counted on the shelves. Report every SKU whose counts differ, with the difference `counted - expected`. A SKU missing from one side counts as 0 there: a SKU found on the shelf that the system never heard of is a positive difference, and one the system expected but nobody found is negative.",
    spec: [
      ["Function", "`stock_differences(expected, counted)`"],
      ["expected, counted", "dictionaries from SKU to a whole number of units"],
      ["Returns", "a dictionary `{sku: counted - expected}` for every SKU, on either side, whose two numbers differ; `{}` when everything matches"],
      ["Must not", "change either dictionary"],
    ],
    hiddenKinds: ["a SKU found that the system never expected", "a SKU expected but not found", "a SKU listed with 0 on one side and missing on the other", "everything matches", "both dictionaries empty"],
    hints: [
      "First decide which SKUs to look at: every key of either dictionary, each once. `union` combines the keys of both.",
      "For each SKU, read each side with a conditional expression that falls back to 0 when the key is missing.",
      "Compute the differences, then keep only the ones that are not zero.",
    ],
    explanation: "Collect the SKUs from both sides with `set(expected.keys()).union(counted.keys())`, so nothing found only on the shelf is missed. For each SKU, a conditional expression reads the count or 0, and a second, filtered comprehension keeps only non-zero differences. Walking only `expected` misses unexpected stock; forgetting the filter reports SKUs that match; `expected - counted` flips every sign. A SKU listed as 0 on one side and absent on the other is not a discrepancy, which the fall-back to 0 handles naturally.",
    code: {
      starter: src`
def stock_differences(expected, counted):
    return {}

expected = {"SPO-11681": 14, "HOM-22847": 9, "ELE-24781": 6}
counted = {"SPO-11681": 14, "HOM-22847": 7, "TOY-54564": 2}
print(stock_differences(expected, counted))
`,
      answer: src`
def stock_differences(expected, counted):
    skus = set(expected.keys()).union(counted.keys())
    changes = {
        sku: (counted[sku] if sku in counted else 0) - (expected[sku] if sku in expected else 0)
        for sku in skus
    }
    return {sku: change for sku, change in changes.items() if change != 0}

expected = {"SPO-11681": 14, "HOM-22847": 9, "ELE-24781": 6}
counted = {"SPO-11681": 14, "HOM-22847": 7, "TOY-54564": 2}
print(stock_differences(expected, counted))
`,
      alternatives: [
        src`
def stock_differences(expected, counted):
    differences = {}
    for sku, units in expected.items():
        found = 0
        if sku in counted:
            found = counted[sku]
        if found != units:
            differences[sku] = found - units
    for sku, units in counted.items():
        if sku not in expected and units != 0:
            differences[sku] = units
    return differences
`,
      ],
      wrong: [
        {
          code: src`
def stock_differences(expected, counted):
    return {sku: (counted[sku] if sku in counted else 0) - units for sku, units in expected.items() if (counted[sku] if sku in counted else 0) != units}
`,
          fails: ["returns"],
          why: "only expected SKUs are checked, so stock nobody expected is never reported",
        },
        {
          code: src`
def stock_differences(expected, counted):
    skus = set(expected.keys()).union(counted.keys())
    return {sku: (counted[sku] if sku in counted else 0) - (expected[sku] if sku in expected else 0) for sku in skus}
`,
          fails: ["returns"],
          why: "SKUs whose counts match are reported with a difference of 0",
        },
        {
          code: src`
def stock_differences(expected, counted):
    skus = set(expected.keys()).union(counted.keys())
    changes = {sku: (expected[sku] if sku in expected else 0) - (counted[sku] if sku in counted else 0) for sku in skus}
    return {sku: change for sku, change in changes.items() if change != 0}
`,
          fails: ["returns"],
          why: "it computes expected − counted, so every sign is backwards",
        },
      ],
      task: {
        checks: [
          fn("returns", "stock_differences", [
            example([expectedStock, countedStock], { "HOM-22847": -2, "ELE-24781": -6, "TOY-54564": 2 }),
            example([{ A: 1 }, { A: 1 }], {}),
            example([{}, {}], {}),
            hiddenCase("a SKU found that the system never expected", [{ X: 3 }, { X: 3, Y: 5 }], { Y: 5 }),
            hiddenCase("a SKU expected but not found", [{ X: 3, Z: 4 }, { X: 3 }], { Z: -4 }),
            hiddenCase("a SKU listed with 0 on one side and missing on the other", [{ Q: 0 }, { R: 0 }], {}),
            hiddenCase("every SKU off by some amount", [{ A: 10, B: 2 }, { A: 12, B: 1 }], { A: 2, B: -1 }),
          ], { label: "stock_differences() reports every SKU whose counts differ" }),
          fn("keeps-input", "stock_differences", [
            keepsInput([expectedStock, countedStock]),
            keepsInput([{ A: 1 }, { B: 2 }], { label: "SKUs that appear on only one side" }),
          ], { label: "stock_differences() leaves both dictionaries unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q13-22",
    version: 2,
    slug: "three-comprehensions-one-order-book",
    title: "Three comprehensions, one order book",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 6,
    requires: ["assignment", "list-literal", "list-index", "list-comp", "nested-comp", "comp-if", "dict-comp", "dict-literal", "dict-lookup", "string-index", "value-count", "conditional-expr", "truthiness", "boolean", "for-loop", "membership", "print-call", "unquoted-name", "top-level-indent"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "In the first comprehension the `if` sits between the two `for` clauses: it decides which orders are walked at all.",
      "The dictionary comprehension visits SKU-1 twice if it is in the list twice. Is it?",
      "In the last comprehension the `if … else` is in front of `for`, so every order produces exactly one value; an empty list is falsy.",
    ],
    explanation: "Only paid orders are walked, so O3's SKU-1 is skipped and `skus` is `['SKU-1', 'HOM-2']`, each once. The counts dictionary is built from that list, so SKU-1 counts 1. The last comprehension chooses per order: O2's empty list is falsy, so it becomes `'empty'`, while O3 (unpaid but not empty) keeps its ID.",
    predict: {
      program: src`
orders = [
    {"id": "O1", "skus": ["SKU-1", "HOM-2"], "paid": True},
    {"id": "O2", "skus": [], "paid": True},
    {"id": "O3", "skus": ["SKU-1"], "paid": False},
]
skus = [sku for o in orders if o["paid"] for sku in o["skus"]]
counts = {sku: skus.count(sku) for sku in skus}
labels = [o["id"] if o["skus"] else "empty" for o in orders]
print(skus)
print(counts)
print(labels)
`,
      output: "['SKU-1', 'HOM-2']\n{'SKU-1': 1, 'HOM-2': 1}\n['O1', 'empty', 'O3']\n",
      wrongPredictions: [
        "['SKU-1', 'HOM-2', 'SKU-1']\n{'SKU-1': 2, 'HOM-2': 1}\n['O1', 'empty', 'O3']",
        "['SKU-1', 'HOM-2']\n{'SKU-1': 1, 'HOM-2': 1}\n['O1', 'O3']",
        "['SKU-1', 'HOM-2']\n{'SKU-1': 1, 'HOM-2': 1}\n['O1', 'empty', 'empty']",
        "[['SKU-1', 'HOM-2'], []]\n{'SKU-1': 1, 'HOM-2': 1}\n['O1', 'empty', 'O3']",
      ],
    },
  },
];
