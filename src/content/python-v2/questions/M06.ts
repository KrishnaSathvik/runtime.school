/**
 * M06 practice: ten independent problems on indexes, slices, string methods, f-strings and Unicode (PY-L06-01 … 05).
 *
 * Functions arrive in M09, so every code question is a short program with its inputs on the first lines. It is graded
 * on its output for the starter's values, on two public re-runs with other values, and on hidden re-runs (`variant`
 * checks) with inputs chosen for the edge cases: boundaries, empty or one-character parts, other lengths and other
 * months. A program that prints typed-in text, or only handles the visible value, fails them.
 *
 * Mix: 4 data transformations, 2 validations, 2 debugging (genuinely broken programs), 2 output predictions.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 * Fixtures: CFPB complaint timestamps and issues (D03), Online Retail II invoice numbers (D02 style), Runtime Q&A user
 * names (D12), Open Food Facts products (D09), Runtime Market SKUs and products (R01).
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyQuestion } from "../model";
import { pv } from "../checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const values = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, pv(v)]));
const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** A public re-run: the program is run again with these input values, shown to the learner. */
const shown = (id: string, set: Record<string, unknown>, output: string): PyCheck => ({ kind: "variant", id, set: values(set), output });
/** A hidden re-run: only `kind` is shown when it fails. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: values(set),
  output,
  hidden: true,
});

export const m06Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q06-02",
    version: 2,
    slug: "pieces-of-a-sku",
    title: "Pieces of a SKU",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "string-value", "string-index", "string-slice", "len-call", "print-call", "print-several", "unquoted-name"],
    prompt: "Type exactly what this program prints. Work out each value before you look at the next one.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Write the positions under the characters: E is 0, L is 1, E is 2, the dash is 3.",
      "`[-2:]` starts two characters from the end and runs to the end.",
      "`sku[4:]` is a new text; `len` counts its characters.",
    ],
    explanation: "`sku[:3]` is positions 0–2, `ELE`. `sku[-2:]` is the last two characters, `81`. `sku[4]` is the character after the dash, `2`. `sku[4:]` is `24781`, which has 5 characters. print separates the four values with spaces.",
    predict: {
      program: src`
sku = "ELE-24781"
print(sku[:3], sku[-2:], sku[4], len(sku[4:]))
`,
      output: "ELE 81 2 5\n",
      wrongPredictions: ["ELE- 81 2 5", "ELE 81 - 5", "ELE 81 2 4", "ELE 781 2 5", "EL 81 2 5"],
    },
  },
  {
    id: "PY-Q06-03",
    version: 2,
    slug: "badge-name-not-cleaned",
    title: "The welcome badge isn't cleaned",
    format: "debugging",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "reassignment", "string-value", "string-method", "spaces-in-text", "print-call", "print-text", "unquoted-name", "arithmetic", "string-format"],
    prompt: "The sign-in screen should greet a customer with their name tidied: no spaces at the ends, and each word starting with a capital. The program below calls the right methods, but the greeting still shows the name exactly as it was typed. Find out why and fix it.",
    spec: [
      ["Input", "`name`, a customer's name as typed"],
      ["Prints", "`Welcome, ` then the name stripped and in title case, then `!`"],
      ["Examples", "`\"  isaac SATO \"` → `Welcome, Isaac Sato!`; `\"aisha silva\"` → `Welcome, Aisha Silva!`; `\"NORA\"` → `Welcome, Nora!`"],
    ],
    hiddenKinds: ["a name with spaces only at the start", "a name already tidy", "a one-letter name", "a name with three words"],
    hints: [
      "Print `name` right after the `strip` line. Has anything changed?",
      "A string method gives back a new text. It never changes the text it was called on.",
      "Keep each method's result by storing it, or chain the two calls and store that.",
    ],
    explanation: "Strings can't be changed, so `name.strip()` and `name.title()` each build a new text, and the program throws both away. Storing the result (`name = name.strip().title()`) keeps it. Fixing only one of the two lines leaves either the spaces or the capitals wrong.",
    code: {
      starter: src`
name = "  isaac SATO "
name.strip()
name.title()
print("Welcome, " + name + "!")
`,
      answer: src`
name = "  isaac SATO "
name = name.strip()
name = name.title()
print("Welcome, " + name + "!")
`,
      alternatives: [
        src`
name = "  isaac SATO "
clean = name.strip().title()
print(f"Welcome, {clean}!")
`,
      ],
      wrong: [
        {
          code: src`
name = "  isaac SATO "
name = name.strip()
name.title()
print("Welcome, " + name + "!")
`,
          fails: ["leading", "output", "plain", "single", "three", "upper"],
          why: "the spaces are gone, but the title-case result is still thrown away",
        },
        {
          code: src`
name = "  isaac SATO "
name.strip()
name = name.title()
print("Welcome, " + name + "!")
`,
          fails: ["leading", "output", "single"],
          why: "the capitals are fixed, but the end spaces are still there",
        },
        {
          code: src`
name = "  isaac SATO "
print("Welcome, Isaac Sato!")
`,
          fails: ["plain", "upper", "leading", "tidy", "single", "three"],
          why: "the greeting is typed in, so every other customer is greeted as Isaac Sato",
        },
      ],
      task: {
        checks: [
          out("Welcome, Isaac Sato!\n"),
          shown("plain", { name: "aisha silva" }, "Welcome, Aisha Silva!\n"),
          shown("upper", { name: "NORA" }, "Welcome, Nora!\n"),
          rerun("leading", "a name with spaces only at the start", { name: "   theo williams" }, "Welcome, Theo Williams!\n"),
          rerun("tidy", "a name already tidy", { name: "Grace Walker" }, "Welcome, Grace Walker!\n"),
          rerun("single", "a one-letter name", { name: " j " }, "Welcome, J!\n"),
          rerun("three", "a name with three words", { name: "mary ann  JONES" }, "Welcome, Mary Ann  Jones!\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q06-06",
    version: 2,
    slug: "readable-complaint-time",
    title: "A readable complaint time",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "string-value", "string-index", "string-slice", "conversion", "arithmetic", "precedence", "print-call", "print-text", "unquoted-name", "string-format", "comparison", "if-statement", "print-several", "reassignment", "top-level-indent"],
    prompt: "The CFPB stores when a complaint arrived as `2024-01-15T00:01:21.000Z`. A case worker's screen shows it as `15 Jan 2024, 00:01 UTC`: the day without a leading zero, a three-letter month, the year, then the hours and minutes. You have no lists yet, but you don't need one: all twelve month names fit in one text, three letters each, and a slice can pick out the right three.",
    spec: [
      ["Input", "`received`, a timestamp in the form `YYYY-MM-DDTHH:MM:SS.000Z`"],
      ["Given", "`months = \"JanFebMarAprMayJunJulAugSepOctNovDec\"`"],
      ["Prints", "`<day> <Mon> <year>, <HH:MM> UTC`, with the day as a plain number (`5`, not `05`)"],
      ["Examples", "`\"2024-01-15T00:01:21.000Z\"` → `15 Jan 2024, 00:01 UTC`; `\"2024-12-05T23:59:59.000Z\"` → `5 Dec 2024, 23:59 UTC`"],
    ],
    hiddenKinds: ["September, a month in the middle", "the first day of a month", "a two-digit day in October", "a time with leading zeros"],
    hints: [
      "Cut the timestamp into its parts first: the year, the month, the day and the time each sit at fixed positions.",
      "Month 1 is letters 0–2 of `months`, month 2 is letters 3–5. Turn the month into a number with `int` and work out where its three letters start.",
      "`int` also drops a leading zero, which is what the day needs.",
    ],
    explanation: "Slices pull out each fixed-width part. The month number `m` (1–12) picks `months[(m - 1) * 3:m * 3]`, and `int(received[8:10])` turns `05` into 5. The usual bugs are using `m * 3` as the start (one month late), and printing the day straight from the slice, which keeps its leading zero.",
    code: {
      starter: src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
`,
      answer: src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
year = received[:4]
month = int(received[5:7])
day = int(received[8:10])
time = received[11:16]
name = months[(month - 1) * 3:month * 3]
print(f"{day} {name} {year}, {time} UTC")
`,
      alternatives: [
        src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
start = (int(received[5:7]) - 1) * 3
day = received[8:10]
if day[0] == "0":
    day = day[1]
print(day, months[start:start + 3], received[0:4] + ",", received[11:13] + ":" + received[14:16], "UTC")
`,
      ],
      wrong: [
        {
          code: src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
month = int(received[5:7])
name = months[month * 3:month * 3 + 3]
print(f"{int(received[8:10])} {name} {received[:4]}, {received[11:16]} UTC")
`,
          fails: ["output", "december", "september", "first", "october", "early"],
          why: "the start is `month * 3`, which is the next month's letters (and nothing at all for December)",
        },
        {
          code: src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
month = int(received[5:7])
name = months[(month - 1) * 3:month * 3]
print(f"{received[8:10]} {name} {received[:4]}, {received[11:16]} UTC")
`,
          fails: ["december", "first"],
          why: "the day keeps its leading zero: `05 Dec` instead of `5 Dec`",
        },
        {
          code: src`
received = "2024-01-15T00:01:21.000Z"
months = "JanFebMarAprMayJunJulAugSepOctNovDec"
month = int(received[5:7])
name = months[(month - 1) * 3:month * 3]
print(f"{int(received[8:10])} {name} {received[:4]}, {received[11:19]} UTC")
`,
          fails: ["output", "december", "september", "first", "october", "early"],
          why: "the time includes the seconds; the screen shows hours and minutes only",
        },
      ],
      task: {
        checks: [
          out("15 Jan 2024, 00:01 UTC\n"),
          shown("december", { received: "2024-12-05T23:59:59.000Z" }, "5 Dec 2024, 23:59 UTC\n"),
          rerun("september", "September, a month in the middle", { received: "2024-09-30T07:05:00.000Z" }, "30 Sep 2024, 07:05 UTC\n"),
          rerun("first", "the first day of a month", { received: "2024-05-01T12:00:00.000Z" }, "1 May 2024, 12:00 UTC\n"),
          rerun("october", "a two-digit day in October", { received: "2024-10-15T18:42:10.000Z" }, "15 Oct 2024, 18:42 UTC\n"),
          rerun("early", "a time with leading zeros", { received: "2024-03-15T00:00:09.000Z" }, "15 Mar 2024, 00:00 UTC\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q06-10",
    version: 2,
    slug: "username-rules",
    title: "Is this username allowed?",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "string-value", "string-index", "len-call", "unicode-text", "comparison", "logical", "if-statement", "else-clause", "for-loop", "break-statement", "print-call", "print-text", "unquoted-name", "boolean", "reassignment", "membership", "nested-condition", "string-method", "top-level-indent"],
    prompt: "The Runtime Q&A site checks a new username before creating the account. The rules are checked in this order, and the first broken rule is reported: at least 3 characters; at most 15 characters; plain ASCII only (every code point below 128); the first character is a letter `a`–`z` or `A`–`Z`. Print `ok` if every rule holds, otherwise the message for the first broken rule.",
    spec: [
      ["Input", "`name`, the username"],
      ["Prints", "`too short`, `too long`, `plain ASCII only`, `must start with a letter`, or `ok`"],
      ["Order", "the rules are checked in the order listed, and only the first problem is printed"],
      ["Examples", "`\"codermax39\"` → `ok`; `\"jo\"` → `too short`; `\"9lives\"` → `must start with a letter`"],
    ],
    hiddenKinds: ["exactly 15 characters", "16 characters", "an accented letter", "an underscore first", "exactly 3 characters", "an accent and a digit first"],
    hints: [
      "Check the two length rules first: each is one comparison with `len`.",
      "For the ASCII rule, walk every character and remember whether any has a code point of 128 or more.",
      "A letter is between `a` and `z` or between `A` and `Z`: compare the first character with those ends.",
    ],
    explanation: "An `if`/`elif` chain reports only the first broken rule, because the later tests are skipped once one branch runs. The ASCII rule needs a loop before the chain: a flag set to False when a character's `ord` is 128 or more. Testing the first character with `>=` and `<=` on both letter ranges avoids treating `_` or a digit as a letter. A common bug is putting the ASCII test after the first-letter test, so `Zoë_dev` passes as `ok`.",
    code: {
      starter: src`
name = "codermax39"
`,
      answer: src`
name = "codermax39"
ascii_only = True
for ch in name:
    if ord(ch) > 127:
        ascii_only = False
first = name[0]
if len(name) < 3:
    print("too short")
elif len(name) > 15:
    print("too long")
elif not ascii_only:
    print("plain ASCII only")
elif not ((first >= "a" and first <= "z") or (first >= "A" and first <= "Z")):
    print("must start with a letter")
else:
    print("ok")
`,
      alternatives: [
        src`
name = "codermax39"
problem = ""
if len(name) < 3:
    problem = "too short"
elif len(name) > 15:
    problem = "too long"
else:
    for ch in name:
        if ord(ch) >= 128:
            problem = "plain ASCII only"
            break
if problem == "":
    lower = name[0].lower()
    if lower < "a" or lower > "z":
        problem = "must start with a letter"
if problem == "":
    print("ok")
else:
    print(problem)
`,
      ],
      wrong: [
        {
          code: src`
name = "codermax39"
ascii_only = True
for ch in name:
    if ord(ch) > 127:
        ascii_only = False
first = name[0]
if len(name) <= 3:
    print("too short")
elif len(name) >= 15:
    print("too long")
elif not ascii_only:
    print("plain ASCII only")
elif not ((first >= "a" and first <= "z") or (first >= "A" and first <= "Z")):
    print("must start with a letter")
else:
    print("ok")
`,
          fails: ["fifteen", "three"],
          why: "`<=` and `>=` reject names of exactly 3 and exactly 15 characters, which are allowed",
        },
        {
          code: src`
name = "codermax39"
ascii_only = True
for ch in name:
    if ord(ch) > 127:
        ascii_only = False
first = name[0]
if len(name) < 3:
    print("too short")
elif len(name) > 15:
    print("too long")
elif not ((first >= "a" and first <= "z") or (first >= "A" and first <= "Z")):
    print("must start with a letter")
elif not ascii_only:
    print("plain ASCII only")
else:
    print("ok")
`,
          fails: ["both"],
          why: "the rules are checked out of order, so a name that breaks two rules reports the wrong one",
        },
        {
          code: src`
name = "codermax39"
first = name[0]
if len(name) < 3:
    print("too short")
elif len(name) > 15:
    print("too long")
elif first < "A" or first > "z":
    print("must start with a letter")
else:
    print("ok")
`,
          fails: ["accent", "underscore", "both"],
          why: "the ASCII rule is missing, and `_` sits between `Z` and `a`, so it passes as a letter",
        },
      ],
      task: {
        checks: [
          out("ok\n"),
          shown("short", { name: "jo" }, "too short\n"),
          shown("digit", { name: "9lives" }, "must start with a letter\n"),
          rerun("fifteen", "exactly 15 characters", { name: "abcdefghijklmno" }, "ok\n"),
          rerun("sixteen", "16 characters", { name: "user2243769_temp" }, "too long\n"),
          rerun("accent", "an accented letter", { name: "Zoë_dev" }, "plain ASCII only\n"),
          rerun("underscore", "an underscore first", { name: "_hidden" }, "must start with a letter\n"),
          rerun("three", "exactly 3 characters", { name: "Ana" }, "ok\n"),
          rerun("both", "an accent and a digit first", { name: "1café" }, "plain ASCII only\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q06-12",
    version: 2,
    slug: "nutrition-label-columns",
    title: "A nutrition line in columns",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "string-value", "whole-number", "decimal-number", "string-slice", "string-format", "arithmetic", "print-call", "unquoted-name", "print-text", "string-method", "len-call"],
    prompt: "Type exactly what this program prints, spaces included. Each format spec pads its value to a width.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`:<12` pads `Bran Flakes` (11 characters) on the right to 12. `:>5` pads 362 on the left to 5.",
      "`:>6.1f` makes a 6-character column with one decimal; the `g` after the brace is ordinary text.",
      "`label` is the first four characters in capitals, padded on the left to 6 characters; `len` counts the space in the name too.",
    ],
    explanation: "`{name:<12}` adds one space after `Bran Flakes`. `{kcal:>5}` gives two spaces then `362`, and `{sugar:>6.1f}` gives two spaces then `13.2`. On line 2, `label` is `BRAN`, padded to `  BRAN`, `362 / 100` with `.2f` is `3.62`, and `Bran Flakes` has 11 characters.",
    predict: {
      program: src`
name = "Bran Flakes"
kcal = 362
sugar = 13.2
label = name[:4].upper()
print(f"{name:<12}|{kcal:>5}|{sugar:>6.1f}g")
print(f"{label:>6}|{kcal / 100:.2f}|{len(name)}")
`,
      output: "Bran Flakes |  362|  13.2g\n  BRAN|3.62|11\n",
      wrongPredictions: [
        "Bran Flakes|362|13.2g\nBRAN|3.62|11",
        "Bran Flakes |  362|  13.2g\nBRAN  |3.62|11",
        "Bran Flakes |  362|  13.20g\n  BRAN|3.62|11",
        "Bran Flakes | 362| 13.2g\n  BRAN|3.62|11",
        "Bran Flakes |  362|  13.2g\n  BRAN|3.62|12",
      ],
    },
  },
  {
    id: "PY-Q06-13",
    version: 2,
    slug: "cancelled-invoice-number",
    title: "Which invoice was cancelled?",
    format: "debugging",
    difficulty: "medium",
    minutes: 8,
    requires: ["assignment", "reassignment", "string-value", "string-index", "string-slice", "string-method", "comparison", "if-statement", "else-clause", "print-call", "print-several", "print-text", "unquoted-name", "string-format", "top-level-indent", "truthiness"],
    prompt: "In the Online Retail II data, a cancellation's invoice number is the original number with a capital `C` in front: `C489528` cancels invoice `489528`. Numbers arrive from a spreadsheet export, sometimes with spaces around them. This program should print `cancels 489528` for a cancellation and `sale 489438` for a normal invoice, but it reports every invoice as a sale. There is more than one bug.",
    spec: [
      ["Input", "`invoice`, an invoice number as exported, possibly with spaces at the ends"],
      ["Prints", "`cancels <number>` (the number without the `C`), or `sale <number>`"],
      ["Examples", "`\" C489528\"` → `cancels 489528`; `\"489438\"` → `sale 489438`; `\"C536379 \"` → `cancels 536379`"],
    ],
    hiddenKinds: ["a cancellation with no spaces", "a sale with spaces around it", "a short invoice number", "a sale whose number contains a C later on"],
    hints: [
      "Print `invoice[0]` for the starter's value. Is it the character you expect?",
      "Tidy the text first, and compare with the capital letter the data really uses.",
      "Once the `C` is at position 0, the number starts at position 1.",
    ],
    explanation: "Three bugs: the spaces are never stripped, so position 0 is a space; the test looks for a lower-case `c`; and `invoice[2:]` drops the first digit of the number. Strip once and store it, test `invoice[0] == \"C\"` (or `startswith(\"C\")`), and print `invoice[1:]`.",
    code: {
      starter: src`
invoice = " C489528"
if invoice[0] == "c":
    print("cancels", invoice[2:])
else:
    print("sale", invoice)
`,
      answer: src`
invoice = " C489528"
invoice = invoice.strip()
if invoice[0] == "C":
    print("cancels", invoice[1:])
else:
    print("sale", invoice)
`,
      alternatives: [
        src`
invoice = " C489528"
number = invoice.strip()
if number.startswith("C"):
    number = number[1:]
    print(f"cancels {number}")
else:
    print(f"sale {number}")
`,
      ],
      wrong: [
        {
          code: src`
invoice = " C489528"
invoice = invoice.strip()
if invoice[0] == "C":
    print("cancels", invoice[2:])
else:
    print("sale", invoice)
`,
          fails: ["output", "trailing", "no-spaces", "short"],
          why: "the slice still starts at position 2, so the first digit of the number is lost",
        },
        {
          code: src`
invoice = " C489528"
if invoice[0] == "C":
    print("cancels", invoice[1:])
else:
    print("sale", invoice)
`,
          fails: ["output", "trailing", "spaced-sale"],
          why: "the spaces are never stripped, so a leading space hides the `C`",
        },
        {
          code: src`
invoice = " C489528"
invoice = invoice.strip()
if "C" in invoice:
    print("cancels", invoice[1:])
else:
    print("sale", invoice)
`,
          fails: ["c-later"],
          why: "`in` finds a C anywhere in the number; only a C at the start marks a cancellation",
        },
      ],
      task: {
        checks: [
          out("cancels 489528\n"),
          shown("sale", { invoice: "489438" }, "sale 489438\n"),
          shown("trailing", { invoice: "C536379 " }, "cancels 536379\n"),
          rerun("no-spaces", "a cancellation with no spaces", { invoice: "C489541" }, "cancels 489541\n"),
          rerun("spaced-sale", "a sale with spaces around it", { invoice: "  536365  " }, "sale 536365\n"),
          rerun("short", "a short invoice number", { invoice: "C12" }, "cancels 12\n"),
          rerun("c-later", "a sale whose number contains a C later on", { invoice: "A5C63" }, "sale A5C63\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q06-16",
    version: 2,
    slug: "product-url-slug",
    title: "A web address for a product",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "reassignment", "string-value", "string-method", "string-slice", "comparison", "logical", "if-statement", "else-clause", "for-loop", "print-call", "unquoted-name", "spaces-in-text", "membership", "arithmetic", "len-call", "nested-condition", "print-text", "string-index", "top-level-indent", "truthiness"],
    prompt: "Runtime Market builds each product page's web address from the product's name, as a *slug* such as `deluxe-pillow-blue-2-pack`. Lower-case the name. Keep the letters `a`–`z` and the digits `0`–`9`. Turn each space or dash into a single `-`, but never put two `-` in a row and never start the slug with one. Drop every other character, then remove a `-` left at the end.",
    spec: [
      ["Input", "`name`, a product name"],
      ["Keep", "`a`–`z` and `0`–`9` after lower-casing"],
      ["Separators", "a space or `-` becomes `-`, unless the slug is still empty or already ends with `-`"],
      ["Prints", "the slug, with no `-` at either end"],
      ["Examples", "`\"Deluxe Pillow (Blue) 2-Pack\"` → `deluxe-pillow-blue-2-pack`; `\"  Mini Knife Set \"` → `mini-knife-set`"],
    ],
    hiddenKinds: ["punctuation between words", "accented letters", "a one-word name", "a name with a dash at the end"],
    hints: [
      "Build the slug one character at a time, starting from an empty text, after lower-casing the whole name.",
      "For a space or a dash, look at what the slug already holds before adding a `-`: `endswith` answers that.",
      "After the loop, a slug can only end with one stray `-`, which a slice or `strip(\"-\")` can remove.",
    ],
    explanation: "Each character is either kept, turned into a separator, or dropped. Checking `slug != \"\"` and `not slug.endswith(\"-\")` before adding `-` collapses runs of spaces, dashes and dropped punctuation into one separator and keeps the start clean. Only the end can still hold a `-`, which `strip(\"-\")` removes. Replacing spaces with `replace` alone leaves double dashes around dropped punctuation such as `(Blue)` or `&`.",
    code: {
      starter: src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = ""
`,
      answer: src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = ""
for ch in name.lower():
    if (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9"):
        slug = slug + ch
    elif ch == " " or ch == "-":
        if slug != "" and not slug.endswith("-"):
            slug = slug + "-"
print(slug.strip("-"))
`,
      alternatives: [
        src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = ""
letters = "abcdefghijklmnopqrstuvwxyz0123456789"
for ch in name.lower():
    if ch in " -":
        if len(slug) > 0 and slug[-1] != "-":
            slug = slug + "-"
    elif ch in letters:
        slug = slug + ch
if slug.endswith("-"):
    slug = slug[:-1]
print(slug)
`,
      ],
      wrong: [
        {
          code: src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = ""
for ch in name.lower():
    if (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9"):
        slug = slug + ch
    elif ch == " " or ch == "-":
        slug = slug + "-"
print(slug.strip("-"))
`,
          fails: ["punctuation"],
          why: "every space and dash adds a `-`, so runs of them make `--`",
        },
        {
          code: src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = name.strip().lower().replace(" ", "-")
slug = slug.replace("(", "").replace(")", "")
print(slug)
`,
          fails: ["accents", "end-dash", "punctuation"],
          why: "`replace` handles only the characters it names; other punctuation and accents get through, and a trailing dash stays",
        },
        {
          code: src`
name = "Deluxe Pillow (Blue) 2-Pack"
slug = ""
for ch in name.lower():
    if (ch >= "a" and ch <= "z") or (ch >= "0" and ch <= "9"):
        slug = slug + ch
    elif ch == " " or ch == "-":
        if slug != "" and not slug.endswith("-"):
            slug = slug + "-"
print(slug)
`,
          fails: ["spaces", "end-dash"],
          why: "a trailing space or dash leaves a `-` at the end of the slug",
        },
      ],
      task: {
        checks: [
          out("deluxe-pillow-blue-2-pack\n"),
          shown("spaces", { name: "  Mini Knife Set " }, "mini-knife-set\n"),
          rerun("punctuation", "punctuation between words", { name: "Rock & Roll -- Live!" }, "rock-roll-live\n"),
          rerun("accents", "accented letters", { name: "Café Crème" }, "caf-crme\n"),
          rerun("one-word", "a one-word name", { name: "Speaker" }, "speaker\n"),
          rerun("end-dash", "a name with a dash at the end", { name: "Nordic Candle -" }, "nordic-candle\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q06-19",
    version: 2,
    slug: "check-a-delivery-time",
    title: "Check a delivery time",
    format: "validation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "reassignment", "string-value", "string-index", "string-slice", "len-call", "conversion", "comparison", "logical", "if-statement", "else-clause", "for-loop", "print-call", "print-text", "unquoted-name", "boolean", "arithmetic", "membership", "nested-condition", "range-call", "top-level-indent", "truthiness"],
    prompt: "A delivery form asks for a time slot as `HH:MM` on a 24-hour clock, and the text box accepts anything. Before converting anything with `int`, check the format: exactly 5 characters, a `:` at position 2, and digits everywhere else. Print `invalid: format` if the format is wrong. Then check the numbers: print `invalid: hour` for an hour above 23 and `invalid: minute` for a minute above 59. Otherwise print `valid`.",
    spec: [
      ["Input", "`slot`, the text typed in the box"],
      ["Format", "5 characters, `:` at position 2, the other four characters `0`–`9`"],
      ["Prints", "`invalid: format`, `invalid: hour`, `invalid: minute` or `valid`, in that order of checking"],
      ["Examples", "`\"07:45\"` → `valid`; `\"24:00\"` → `invalid: hour`; `\"7:45\"` → `invalid: format`"],
    ],
    hiddenKinds: ["midnight", "the last minute of the day", "minute 60", "letters instead of digits", "the wrong separator"],
    hints: [
      "Order matters: `int` on text such as `ab` raises ValueError, so the format has to be confirmed first.",
      "A character is a digit when it is between `\"0\"` and `\"9\"`. Check the four digit positions, and skip position 2.",
      "Once the format is right, `int` on the two-character slices gives the hour and the minute.",
    ],
    explanation: "Check the length and the colon, then loop over the four digit characters (`slot[:2] + slot[3:]`) with a flag. Only after that is it safe to call `int`. Hours run 0–23 and minutes 0–59, so the limits are `> 23` and `> 59`. Converting first crashes on `ab:cd`, and a test such as `hour >= 23` rejects 23:59.",
    code: {
      starter: src`
slot = "07:45"
`,
      answer: src`
slot = "07:45"
digits_ok = True
for ch in slot[:2] + slot[3:]:
    if ch < "0" or ch > "9":
        digits_ok = False
if len(slot) != 5 or slot[2] != ":" or not digits_ok:
    print("invalid: format")
elif int(slot[:2]) > 23:
    print("invalid: hour")
elif int(slot[3:]) > 59:
    print("invalid: minute")
else:
    print("valid")
`,
      alternatives: [
        src`
slot = "07:45"
ok = len(slot) == 5
if ok:
    ok = slot[2] == ":"
if ok:
    for i in range(5):
        if i != 2 and (slot[i] < "0" or slot[i] > "9"):
            ok = False
if not ok:
    print("invalid: format")
else:
    hour = int(slot[0:2])
    minute = int(slot[3:5])
    if hour >= 24:
        print("invalid: hour")
    elif minute >= 60:
        print("invalid: minute")
    else:
        print("valid")
`,
      ],
      wrong: [
        {
          code: src`
slot = "07:45"
hour = int(slot[:2])
minute = int(slot[3:])
if len(slot) != 5 or slot[2] != ":":
    print("invalid: format")
elif hour > 23:
    print("invalid: hour")
elif minute > 59:
    print("invalid: minute")
else:
    print("valid")
`,
          fails: ["letters", "short"],
          why: "`int` runs before the format is checked, so letters crash the program with ValueError",
        },
        {
          code: src`
slot = "07:45"
digits_ok = True
for ch in slot[:2] + slot[3:]:
    if ch < "0" or ch > "9":
        digits_ok = False
if len(slot) != 5 or slot[2] != ":" or not digits_ok:
    print("invalid: format")
elif int(slot[:2]) >= 23:
    print("invalid: hour")
elif int(slot[3:]) >= 59:
    print("invalid: minute")
else:
    print("valid")
`,
          fails: ["last-minute"],
          why: "`>=` rejects 23 and 59, which are real hours and minutes",
        },
        {
          code: src`
slot = "07:45"
digits_ok = True
for ch in slot:
    if ch < "0" or ch > "9":
        digits_ok = False
if len(slot) != 5 or not digits_ok:
    print("invalid: format")
elif int(slot[:2]) > 23:
    print("invalid: hour")
elif int(slot[3:]) > 59:
    print("invalid: minute")
else:
    print("valid")
`,
          fails: ["output", "hour", "midnight", "last-minute", "minute-60"],
          why: "the loop checks the colon as if it had to be a digit, so every correct slot is rejected",
        },
      ],
      task: {
        checks: [
          out("valid\n"),
          shown("hour", { slot: "24:00" }, "invalid: hour\n"),
          shown("short", { slot: "7:45" }, "invalid: format\n"),
          rerun("midnight", "midnight", { slot: "00:00" }, "valid\n"),
          rerun("last-minute", "the last minute of the day", { slot: "23:59" }, "valid\n"),
          rerun("minute-60", "minute 60", { slot: "12:60" }, "invalid: minute\n"),
          rerun("letters", "letters instead of digits", { slot: "ab:cd" }, "invalid: format\n"),
          rerun("separator", "the wrong separator", { slot: "12-30" }, "invalid: format\n"),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q06-20",
    version: 2,
    slug: "column-number-to-letters",
    title: "Column number to letters",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 15,
    requires: ["assignment", "reassignment", "string-value", "whole-number", "unicode-text", "arithmetic", "precedence", "comparison", "while-loop", "print-call", "unquoted-name", "top-level-indent"],
    prompt: "A report generator knows a value belongs in column 28 and has to write it to spreadsheet column `AB`. Columns run A–Z (1–26), then AA–AZ (27–52), and so on up to `XFD` (16384). Turn `number` into its column letters. There is no zero digit in this system, which is why ordinary base-26 conversion gives wrong answers at the edges: subtract 1 before taking each remainder.",
    spec: [
      ["Input", "`number`, a whole number from 1 to 16384"],
      ["Prints", "the column letters"],
      ["Examples", "`28` → `AB`; `1` → `A`; `26` → `Z`"],
    ],
    hiddenKinds: ["the first two-letter column", "a column ending in Z", "the last two-letter column", "the first three-letter column", "the largest column"],
    hints: [
      "Build the letters from the right: the last letter comes from the remainder, then move on to what's left.",
      "With A = 0 … Z = 25, the last letter is `(number - 1) % 26`, and what's left for the other letters is `(number - 1) // 26`.",
      "`chr(ord(\"A\") + place)` turns a place 0–25 into a letter. Each new letter goes in front of the ones you already have.",
    ],
    explanation: "Columns are base 26 without a zero: A–Z mean 1–26. Subtracting 1 shifts each step into the usual 0–25 range, so `(number - 1) % 26` is the last letter and `(number - 1) // 26` is the number the earlier letters encode. Repeat while the number is above 0 and put each new letter in front. Plain `number % 26` turns 26 into an `@` or a wrong `A`, and appending instead of prepending reverses the letters.",
    code: {
      starter: src`
number = 28
letters = ""
`,
      answer: src`
number = 28
letters = ""
while number > 0:
    place = (number - 1) % 26
    letters = chr(ord("A") + place) + letters
    number = (number - 1) // 26
print(letters)
`,
      alternatives: [
        src`
number = 28
letters = ""
n = number
while n >= 1:
    n = n - 1
    letters = chr(65 + n % 26) + letters
    n = n // 26
print(letters)
`,
      ],
      wrong: [
        {
          code: src`
number = 28
letters = ""
while number > 0:
    place = number % 26
    letters = chr(ord("A") + place - 1) + letters
    number = number // 26
print(letters)
`,
          fails: ["end-z", "z", "zz"],
          why: "without subtracting 1 first, 26 becomes `A@` instead of `Z`",
        },
        {
          code: src`
number = 28
letters = ""
while number > 0:
    place = (number - 1) % 26
    letters = letters + chr(ord("A") + place)
    number = (number - 1) // 26
print(letters)
`,
          fails: ["output", "end-z", "xfd"],
          why: "each new letter is added at the end, so the letters come out reversed: `BA` for 28",
        },
        {
          code: src`
number = 28
first = (number - 1) // 26
last = (number - 1) % 26
if first == 0:
    print(chr(65 + last))
else:
    print(chr(64 + first) + chr(65 + last))
`,
          fails: ["aaa", "xfd"],
          why: "it handles at most two letters, so 703 and above come out wrong",
        },
      ],
      task: {
        checks: [
          out("AB\n"),
          shown("one", { number: 1 }, "A\n"),
          shown("z", { number: 26 }, "Z\n"),
          rerun("aa", "the first two-letter column", { number: 27 }, "AA\n"),
          rerun("end-z", "a column ending in Z", { number: 52 }, "AZ\n"),
          rerun("zz", "the last two-letter column", { number: 702 }, "ZZ\n"),
          rerun("aaa", "the first three-letter column", { number: 703 }, "AAA\n"),
          rerun("xfd", "the largest column", { number: 16384 }, "XFD\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q06-22",
    version: 2,
    slug: "wrap-text-to-a-width",
    title: "Wrap a complaint issue to fit a screen",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 18,
    requires: ["assignment", "reassignment", "string-value", "whole-number", "len-call", "arithmetic", "comparison", "if-statement", "else-clause", "for-loop", "print-call", "unquoted-name", "spaces-in-text", "logical", "membership", "nested-condition", "range-call", "string-format", "string-index", "string-slice", "top-level-indent"],
    prompt: "A narrow display shows CFPB complaint issues, such as `Company closed your account without telling you first`, on lines of at most `width` characters. Wrap the text greedily: put as many whole words on a line as fit (with one space between words), and start a new line when the next word would make it too long. Words are separated by single spaces, and no word is longer than `width`. Lists come in the next module, so build each word and each line as text while you walk the characters.",
    spec: [
      ["Inputs", "`text` (words separated by single spaces) and `width` (a whole number at least as long as the longest word)"],
      ["Prints", "each wrapped line on its own line, with no spaces at the start or end of a line"],
      ["Examples", "width 20: `Company closed your` / `account without` / `telling you first`"],
    ],
    hiddenKinds: ["a line that fits exactly", "text shorter than the width", "one word per line", "a width that splits after the first word"],
    hints: [
      "Keep two texts: the word being read, and the line being built. A space (or the end of the text) means a word is complete.",
      "When a word is complete: if the line is empty, the word starts it; if `len(line) + 1 + len(word)` still fits, add a space and the word; otherwise print the line and start a new one with the word.",
      "The last word has no space after it. Walking `text + \" \"` finishes it like the others, and the last line is printed after the loop.",
    ],
    explanation: "The program reads characters into `word` until a space, then decides where the word goes. A word fits when the line's length, one space and the word's length together are at most `width`; `<=` matters, because a line exactly `width` long is allowed. Adding a space to the end of the text finishes the last word, and the final `print(line)` after the loop prints the last line, which no space ever triggers.",
    code: {
      starter: src`
text = "Company closed your account without telling you first"
width = 20
line = ""
word = ""
`,
      answer: src`
text = "Company closed your account without telling you first"
width = 20
line = ""
word = ""
for ch in text + " ":
    if ch == " ":
        if line == "":
            line = word
        elif len(line) + 1 + len(word) <= width:
            line = line + " " + word
        else:
            print(line)
            line = word
        word = ""
    else:
        word = word + ch
print(line)
`,
      alternatives: [
        src`
text = "Company closed your account without telling you first"
width = 20
line = ""
start = 0
for i in range(len(text) + 1):
    if i == len(text) or text[i] == " ":
        word = text[start:i]
        start = i + 1
        if len(line) == 0:
            line = word
        elif len(line + " " + word) > width:
            print(line)
            line = word
        else:
            line = f"{line} {word}"
print(line)
`,
      ],
      wrong: [
        {
          code: src`
text = "Company closed your account without telling you first"
width = 20
line = ""
word = ""
for ch in text + " ":
    if ch == " ":
        if line == "":
            line = word
        elif len(line) + 1 + len(word) < width:
            line = line + " " + word
        else:
            print(line)
            line = word
        word = ""
    else:
        word = word + ch
print(line)
`,
          fails: ["exact", "split-first"],
          why: "`<` refuses a line that would be exactly `width` characters long",
        },
        {
          code: src`
text = "Company closed your account without telling you first"
width = 20
line = ""
word = ""
for ch in text:
    if ch == " ":
        if line == "":
            line = word
        elif len(line) + 1 + len(word) <= width:
            line = line + " " + word
        else:
            print(line)
            line = word
        word = ""
    else:
        word = word + ch
print(line)
`,
          fails: ["output", "report", "exact", "short", "narrow", "split-first"],
          why: "the last word is never completed, because no space follows it",
        },
        {
          code: src`
text = "Company closed your account without telling you first"
width = 20
line = ""
word = ""
for ch in text + " ":
    if ch == " ":
        if len(line) + len(word) <= width:
            line = line + word + " "
        else:
            print(line)
            line = word + " "
        word = ""
    else:
        word = word + ch
print(line)
`,
          fails: ["output", "report", "exact", "short", "narrow", "split-first"],
          why: "each line keeps a space at the end, and the length test doesn't count the space between words",
        },
      ],
      task: {
        checks: [
          out("Company closed your\naccount without\ntelling you first\n"),
          shown("report", { text: "Incorrect information on your report", width: 16 }, "Incorrect\ninformation on\nyour report\n"),
          rerun("exact", "a line that fits exactly", { text: "Improper use of your report", width: 11 }, "Improper\nuse of your\nreport\n"),
          rerun("short", "text shorter than the width", { text: "Struggling to pay your bill", width: 40 }, "Struggling to pay your bill\n"),
          rerun("narrow", "one word per line", { text: "Fraud or scam", width: 5 }, "Fraud\nor\nscam\n"),
          rerun("split-first", "a width that splits after the first word", { text: "Managing an account", width: 10 }, "Managing\nan account\n"),
        ],
      },
    },
  },
];
