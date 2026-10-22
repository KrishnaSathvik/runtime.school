/**
 * M06 Strings & Text: five lessons (PY-L06-01 … PY-L06-05).
 *
 * Text is the first collection a learner meets: a sequence of characters with positions. The module covers reading
 * one character (index, len), a run of characters (slice), building cleaned text with methods, filling a sentence
 * with an f-string, and characters beyond A–Z (code points). Fixtures are real values from the course datasets:
 * CFPB complaint timestamps, states and ZIP codes (D03), NOAA station IDs (D07), Open Food Facts names and barcodes
 * (D09), Runtime Market SKUs, orders and customers (R01).
 *
 * Lists and functions come later (M07, M09), so every exercise is a short program. It is graded on its printed
 * output and then re-run with other input values (hidden `variant` checks: other codes, dates, names), so a program
 * that prints typed-in text, or only works for the starter's value, fails.
 * Version 2: rewritten from a print-the-literal module; saved progress from version 1 does not count as mastery.
 */
import type { PyCheck } from "@/engine/python/grading";
import type { PyLesson } from "../model";
import { pv } from "../checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string): PyCheck => ({ kind: "output", id: "output", label: "Prints exactly the expected lines", expected });
/** Re-run the whole program with other values for its input lines (hidden): it must print `output`. */
const rerun = (id: string, kind: string, set: Record<string, unknown>, output: string): PyCheck => ({
  kind: "variant",
  id,
  label: `Also works for ${kind}`,
  set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, pv(v)])),
  output,
  hidden: true,
});

export const m06Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L06-01 index and len
  {
    id: "PY-L06-01",
    version: 2,
    slug: "string-indexes",
    title: "Pick one character",
    lede: "Every character in a text has a position, starting at 0. text[n] reads one of them, text[-1] reads the last, and len(text) counts them.",
    focus: "Read one character of a text by its position, and count characters with len.",
    minutes: 16,
    objectives: [
      "Read a character with a position from the start (`code[0]`) or from the end (`code[-1]`)",
      "Use `len` to count characters and explain why the last position is `len(text) - 1`",
      "Make a decision from one character, remembering that a character is text, not a number",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "conversion", "print-call", "print-text", "print-several", "unquoted-name", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "for-loop", "range-call", "top-level-indent", "runtime-error", "membership", "while-loop"],
    teaches: ["string-index", "len-call"],
    blocks: [
      {
        kind: "text",
        md: "Codes and IDs in real data often carry meaning in one position. In the Online Retail data, an invoice number that starts with `C` is a cancellation. A Runtime Market SKU such as `HOM-52782` starts with its category. The first digit of a US ZIP code names a region of the country. To read one character you need its **position**, also called its **index**.\n\nPositions start at 0, so `sku[0]` is the first character and `sku[1]` the second. A negative position counts back from the end, so `sku[-1]` is the last character. `len(sku)` counts the characters, which makes the last position `len(sku) - 1`.",
      },
      {
        kind: "example",
        title: "Reading positions in a SKU",
        code: src`
sku = "HOM-52782"
print(sku[0], sku[1], sku[2])
print(sku[4])
print(sku[-1])
print(len(sku))
print(sku[len(sku) - 1])
`,
        output: "H O M\n5\n2\n9\n2\n",
        note: "Position 3 holds the dash, so the digits start at position 4. The SKU has nine characters at positions 0 to 8, which is why `sku[-1]` and `sku[len(sku) - 1]` are the same character.",
      },
      {
        kind: "text",
        md: "If you ask for a position that doesn't exist, Python stops with an error instead of giving back an empty answer. The most common slip is to use the length itself as a position.",
      },
      {
        kind: "error-example",
        title: "One past the end",
        code: src`
sku = "HOM-52782"
print(len(sku))
print(sku[len(sku)])
`,
        error: "IndexError",
        output: "9\n",
        note: "The program stops with `IndexError: string index out of range`. Nine characters means positions 0 to 8, and position 9 is past the end. Use `-1`, or `len(sku) - 1`, for the last character.",
      },
      {
        kind: "text",
        md: "An index is most useful when a decision depends on one character. Combine it with `if` (see Conditional Logic) and `len` to check a record before you trust it. A CFPB complaint has a state code and a ZIP code. A state code has 2 characters and a ZIP code has 5. A ZIP code that starts with 9 is on the West Coast.",
      },
      {
        kind: "example",
        title: "Checking a complaint's location",
        code: src`
state = "MI"
zip_code = "48301"
if len(state) == 2 and len(zip_code) == 5:
    print("Location looks complete")
else:
    print("Location needs checking")
area = zip_code[0]
if area == "9":
    print("West Coast ZIP")
else:
    print("ZIP area", area)
`,
        output: "Location looks complete\nZIP area 4\n",
        note: "`zip_code[0]` is the text `\"4\"`, not the number 4, so the test compares it with `\"9\"` in quotes. ZIP codes are stored as text because many of them start with 0.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever one position has a fixed meaning, such as a prefix letter, a check digit at the end, or a separator at a known place. **Mistakes to avoid:**\n\n- Counting positions from 1 instead of 0.\n- Using `len(text)` as the last position.\n- Comparing a character with a number. `zip_code[0] == 4` is always False, because `\"4\"` is text. The concept check below runs this one.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The last character of a station ID",
      prompt: "A NOAA station ID ends with the last digit of the station number. This program prints the first character. Change it so it prints the **last** character, in a way that still works when an ID has a different length.",
      spec: [
        ["Input", "`station`, a station ID such as `\"USW00024143\"`"],
        ["Prints", "its last character"],
      ],
      starter: src`
station = "USW00024143"
print(station[0])
`,
      answer: src`
station = "USW00024143"
print(station[-1])
`,
      wrong: [
        {
          code: src`
station = "USW00024143"
print(station[10])
`,
          fails: ["other-length"],
          why: "position 10 is the last character only when the ID has exactly 11 characters",
        },
      ],
      hints: [
        "The program reads one character. Only the position inside the brackets needs to change.",
        "A negative position counts from the end of the text.",
        "Choose the position that means \"last\" whatever the length is, rather than counting to it.",
      ],
      task: {
        checks: [
          out("3\n"),
          rerun("other-length", "an ID of another length", { station: "USW0009484" }, "4\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which network is the station in?",
        prompt: "In NOAA's daily weather data, a station ID starts with a two-letter country code, and its third character names the network. `W` is an airport weather station, `C` is a volunteer cooperative station, and anything else is another network. Print the country code on one line, then `airport`, `cooperative` or `other`.",
        spec: [
          ["Input", "`station`, an 11-character ID such as `\"USW00024143\"`"],
          ["Line 1", "the first two characters, written together: `US`"],
          ["Line 2", "`airport` when the third character is `W`, `cooperative` when it is `C`, otherwise `other`"],
          ["Example", "`\"USW00024143\"` prints `US` then `airport`"],
        ],
        starter: src`
station = "USW00024143"
`,
        answer: src`
station = "USW00024143"
print(station[0] + station[1])
network = station[2]
if network == "W":
    print("airport")
elif network == "C":
    print("cooperative")
else:
    print("other")
`,
        alternatives: [
          src`
station = "USW00024143"
country = station[0] + station[1]
print(country)
if station[2] == "W":
    print("airport")
else:
    if station[2] == "C":
        print("cooperative")
    else:
        print("other")
`,
        ],
        wrong: [
          {
            code: src`
station = "USW00024143"
print(station[0] + station[1])
if station[3] == "W":
    print("airport")
elif station[3] == "C":
    print("cooperative")
else:
    print("other")
`,
            fails: ["output", "cooperative"],
            why: "position 3 is the fourth character; the third character is at position 2",
          },
          {
            code: src`
station = "USW00024143"
print(station[0], station[1])
if station[2] == "W":
    print("airport")
elif station[2] == "C":
    print("cooperative")
else:
    print("other")
`,
            fails: ["output", "cooperative", "abroad"],
            why: "printing two values puts a space between them: `U S` instead of `US`",
          },
          {
            code: src`
station = "USW00024143"
print("US")
print("airport")
`,
            fails: ["cooperative", "abroad"],
            why: "the answer for the starter's ID is typed in, so any other station gets the same two lines",
          },
        ],
        hints: [
          "Two separate questions: which two characters make the country, and which single character decides the network.",
          "The third character is at position 2. Joining two characters with `+` gives one text with no space.",
          "Test for `W`, then for `C`, and let `else` handle every other network.",
        ],
        task: {
          checks: [
            out("US\nairport\n"),
            rerun("cooperative", "a cooperative station", { station: "USC00045123" }, "US\ncooperative\n"),
            rerun("abroad", "a station outside the US", { station: "CA001012710" }, "CA\nother\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Is the barcode genuine?",
        prompt: "The last digit of a 13-digit barcode (EAN-13), like the ones on Open Food Facts products, is a **check digit**. A scanner recomputes it to catch misread barcodes. Add up the first 12 digits, counting the digits at even positions (0, 2, 4 …) once and the digits at odd positions (1, 3, 5 …) three times. The check digit is the amount you would add to that total to reach the next multiple of 10, which is `(10 - total % 10) % 10`. Print the check digit you calculate, then `valid` if it matches the barcode's last digit or `invalid` if not.",
        spec: [
          ["Input", "`code`, a text of 13 digits such as `\"5010029000023\"`"],
          ["Line 1", "the check digit calculated from the first 12 digits"],
          ["Line 2", "`valid` or `invalid`"],
          ["Example", "`\"5010029000023\"`: the weighted total is 27, so the check digit is 3 and the code is `valid`"],
        ],
        starter: src`
code = "5010029000023"
total = 0
`,
        answer: src`
code = "5010029000023"
total = 0
for i in range(12):
    digit = int(code[i])
    if i % 2 == 0:
        total = total + digit
    else:
        total = total + digit * 3
check = (10 - total % 10) % 10
print(check)
if check == int(code[-1]):
    print("valid")
else:
    print("invalid")
`,
        alternatives: [
          src`
code = "5010029000023"
total = 0
i = 0
while i < 12:
    weight = 1
    if i % 2 == 1:
        weight = 3
    total = total + int(code[i]) * weight
    i = i + 1
check = (10 - total % 10) % 10
print(check)
if str(check) == code[12]:
    print("valid")
else:
    print("invalid")
`,
        ],
        wrong: [
          {
            code: src`
code = "5010029000023"
total = 0
for i in range(12):
    digit = int(code[i])
    if i % 2 == 0:
        total = total + digit * 3
    else:
        total = total + digit
check = (10 - total % 10) % 10
print(check)
if check == int(code[-1]):
    print("valid")
else:
    print("invalid")
`,
            fails: ["output", "other-valid", "misread"],
            why: "the weights are swapped: positions 1, 3, 5 … are the ones that count three times",
          },
          {
            code: src`
code = "5010029000023"
total = 0
for i in range(12):
    digit = int(code[i])
    if i % 2 == 0:
        total = total + digit
    else:
        total = total + digit * 3
check = 10 - total % 10
print(check)
if check == int(code[-1]):
    print("valid")
else:
    print("invalid")
`,
            fails: ["round-total"],
            why: "without the last `% 10`, a total that is already a multiple of 10 gives a check digit of 10 instead of 0",
          },
          {
            code: src`
code = "5010029000023"
total = 0
for i in range(13):
    digit = int(code[i])
    if i % 2 == 0:
        total = total + digit
    else:
        total = total + digit * 3
check = (10 - total % 10) % 10
print(check)
if check == int(code[-1]):
    print("valid")
else:
    print("invalid")
`,
            fails: ["output", "other-valid", "misread"],
            why: "the loop also adds the check digit itself; only the first 12 digits go into the total",
          },
          {
            code: src`
code = "5010029000023"
total = 0
for i in range(12):
    digit = int(code[i])
    if i % 2 == 0:
        total = total + digit
    else:
        total = total + digit * 3
check = (10 - total % 10) % 10
print(check)
if check == code[-1]:
    print("valid")
else:
    print("invalid")
`,
            fails: ["output", "other-valid", "round-total"],
            why: "`code[-1]` is the text \"3\" and `check` is the number 3, so they are never equal",
          },
        ],
        hints: [
          "Walk the positions 0 to 11 with `range`, and turn each character into a number with `int` before adding it.",
          "`i % 2` is 0 for even positions and 1 for odd ones, so it can decide whether a digit counts once or three times.",
          "Compare like with like: the barcode's last character is text, and the digit you calculated is a number.",
        ],
        task: {
          checks: [
            out("3\nvalid\n"),
            rerun("other-valid", "another genuine barcode", { code: "4008713756661" }, "1\nvalid\n"),
            rerun("misread", "a barcode with a misread last digit", { code: "5010029219495" }, "4\ninvalid\n"),
            rerun("round-total", "a barcode whose weighted total is a multiple of 10", { code: "0016000124790" }, "0\nvalid\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
code = "SPRING15"
print(code[1], code[-2], len(code))
`,
        choices: ["P 1 8", "S 1 8", "P 5 8", "P 1 7"],
        answer: 0,
        why: "Position 1 is the second character, P. Position -2 is the second from the end, 1. SPRING15 has eight characters.",
      },
      {
        id: "q2",
        prompt: "A common mistake: this compares a character with a number. What does it print?",
        program: src`
zip_code = "48301"
if zip_code[0] == 4:
    print("Michigan area")
else:
    print("somewhere else")
`,
        choices: ["somewhere else", "Michigan area", "4", "IndexError"],
        answer: 0,
        why: "`zip_code[0]` is the text \"4\". Text is never equal to the number 4, so the `else` branch runs. Compare with `\"4\"`, or convert with `int`.",
      },
      {
        id: "q3",
        prompt: "Which of these questions can you answer by reading a single character?",
        choices: [
          "Does this invoice number start with C?",
          "What are the last four digits of this card number?",
          "Does this complaint mention the word refund anywhere?",
          "How many words are in this note?",
        ],
        answer: 0,
        why: "The invoice check reads position 0 only. The last four digits are a run of characters, which is the next lesson. The other two need the whole text.",
      },
    ],
    review: [
      "Positions start at 0. A negative position counts from the end, so `text[-1]` is the last character.",
      "`len(text)` counts characters, and the last position is `len(text) - 1`. Asking for position `len(text)` raises IndexError.",
      "A character is text: compare it with `\"4\"`, not 4, or convert it with `int`.",
      "Next: read a whole run of characters at once with a slice.",
    ],
  },

  // ------------------------------------------------------------------ PY-L06-02 slices
  {
    id: "PY-L06-02",
    version: 2,
    slug: "slicing",
    title: "Take a piece",
    lede: "A slice, text[start:end], copies the characters from start up to but not including end. Dates, prefixes and the last four digits are all slices.",
    focus: "Take a run of characters with a slice.",
    minutes: 16,
    objectives: [
      "Write `text[start:end]` and predict exactly which characters it includes",
      "Leave out the start or the end, and take the last few characters with a negative start",
      "Explain why a slice past the end gives an empty text instead of an error",
    ],
    requires: ["assignment", "string-value", "whole-number", "print-call", "print-text", "print-several", "unquoted-name", "string-index", "len-call", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "enumerate-call", "top-level-indent", "membership", "reassignment", "sep", "while-loop"],
    teaches: ["string-slice"],
    blocks: [
      {
        kind: "text",
        md: "One character is often not enough. You may need the year in `2024-01-15T00:01:21.000Z`, the category letters of a SKU, or the last four digits of a card. A **slice**, `text[start:end]`, gives back a new text holding the characters from `start` up to, but not including, `end`.\n\nLeave out `start` to begin at position 0, and leave out `end` to run to the end of the text. Because the end is not included, `end - start` is always the length of the piece, and `text[:n] + text[n:]` puts the whole text back together.",
      },
      {
        kind: "example",
        title: "Pieces of a timestamp",
        code: src`
received = "2024-01-15T00:01:21.000Z"
print(received[:4])
print(received[5:7])
print(received[8:10])
print(received[:10])
print(received[11:19])
`,
        output: "2024\n01\n15\n2024-01-15\n00:01:21\n",
        note: "This timestamp is from a CFPB complaint. Each part sits in a fixed place, because the format always uses two digits for the month and the day. `received[5:7]` takes positions 5 and 6, and 7 is where it stops.",
      },
      {
        kind: "text",
        md: "A slice is forgiving where an index is not. A slice that runs past the end stops at the end, and a slice that starts past the end is empty. That makes `text[-4:]` safe even for a short text. It also means a wrong slice fails silently, so check your positions.",
      },
      {
        kind: "example",
        title: "Masking a card number",
        code: src`
card = "4111111111111111"
hidden = "*" * (len(card) - 4)
print(hidden + card[-4:])
short = "4242"
print("*" * (len(short) - 4) + short[-4:])
print(len(card[20:]))
`,
        output: "************1111\n4242\n0\n",
        note: "`\"*\" * 12` repeats the star 12 times. For a card number with only 4 digits, `len(short) - 4` is 0, and zero stars is an empty text. `card[20:]` starts past the end, so it is empty, with a length of 0 and no error.",
      },
      {
        kind: "text",
        md: "**When to use it:** for fixed-width fields such as dates and codes, for prefixes and suffixes, and for cutting a text at a position you have found. **Mistakes to avoid:**\n\n- Expecting the end position to be included. `received[5:6]` is only `0`.\n- Mixing up `text[-4:]`, the last four characters, with `text[:-4]`, everything except the last four.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The time of day",
      prompt: "This prints the date part of a complaint's timestamp. Change the slice so it prints the time instead, like `00:01:21`.",
      spec: [
        ["Input", "`received`, a timestamp such as `\"2024-01-15T00:01:21.000Z\"`"],
        ["Prints", "the hours, minutes and seconds"],
      ],
      starter: src`
received = "2024-01-15T00:01:21.000Z"
print(received[:10])
`,
      answer: src`
received = "2024-01-15T00:01:21.000Z"
print(received[11:19])
`,
      wrong: [
        {
          code: src`
received = "2024-01-15T00:01:21.000Z"
print(received[11:18])
`,
          fails: ["output", "afternoon"],
          why: "the end position is not included, so this stops one character short",
        },
      ],
      hints: [
        "Count the positions: the `T` is at position 10.",
        "The time starts right after the `T` and is eight characters long.",
        "The end of a slice is the first position you don't want.",
      ],
      task: {
        checks: [
          out("00:01:21\n"),
          rerun("afternoon", "another timestamp", { received: "2024-06-15T13:45:09.000Z" }, "13:45:09\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A date for a UK report",
        prompt: "Runtime Market stores order times as `2024-08-23 04:08:40` (year first). A report for the UK office needs the date as day/month/year. Print `23/08/2024` for that order time.",
        spec: [
          ["Input", "`ordered_at`, a text such as `\"2024-08-23 04:08:40\"`"],
          ["Prints", "the date as `DD/MM/YYYY`, keeping the leading zeros"],
          ["Example", "`\"2024-08-23 04:08:40\"` prints `23/08/2024`"],
        ],
        starter: src`
ordered_at = "2024-08-23 04:08:40"
`,
        answer: src`
ordered_at = "2024-08-23 04:08:40"
year = ordered_at[:4]
month = ordered_at[5:7]
day = ordered_at[8:10]
print(day + "/" + month + "/" + year)
`,
        alternatives: [
          src`
ordered_at = "2024-08-23 04:08:40"
print(ordered_at[8:10], ordered_at[5:7], ordered_at[0:4], sep="/")
`,
        ],
        wrong: [
          {
            code: src`
ordered_at = "2024-08-23 04:08:40"
print(ordered_at[5:7] + "/" + ordered_at[8:10] + "/" + ordered_at[:4])
`,
            fails: ["output", "january"],
            why: "this is month/day/year, the US order",
          },
          {
            code: src`
ordered_at = "2024-08-23 04:08:40"
print(ordered_at[8:9] + "/" + ordered_at[5:6] + "/" + ordered_at[:4])
`,
            fails: ["output", "january"],
            why: "the slices end one position early, so each part loses its second digit",
          },
          {
            code: src`
ordered_at = "2024-08-23 04:08:40"
print("23/08/2024")
`,
            fails: ["january"],
            why: "the date is typed in, so another order time still prints 23/08/2024",
          },
        ],
        hints: [
          "Find where each part starts: the year at 0, the month after the first dash, the day after the second.",
          "Each part has a fixed width, so `end` is `start` plus that width.",
          "Join the three pieces with `\"/\"` in the order day, month, year.",
        ],
        task: {
          checks: [
            out("23/08/2024\n"),
            rerun("january", "a date in January", { ordered_at: "2025-01-05 22:10:00" }, "05/01/2025\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Hide most of an email address",
        prompt: "A support screen shows customers' email addresses partly hidden. Keep the first character, replace every other character before the `@` with `*`, and keep the `@` and everything after it. The `@` can be anywhere, so find its position first: `enumerate` (see Loops & Iteration) gives you each position with its character.",
        spec: [
          ["Input", "`email`, a text with exactly one `@` and at least one character before it"],
          ["Prints", "the first character, one `*` for each other character before the `@`, then the `@` and the domain"],
          ["Example", "`\"isaac.sato62@gmail.com\"` prints `i***********@gmail.com`"],
        ],
        starter: src`
email = "isaac.sato62@gmail.com"
`,
        answer: src`
email = "isaac.sato62@gmail.com"
at = 0
for i, ch in enumerate(email):
    if ch == "@":
        at = i
print(email[0] + "*" * (at - 1) + email[at:])
`,
        alternatives: [
          src`
email = "isaac.sato62@gmail.com"
position = 0
while email[position] != "@":
    position = position + 1
stars = "*" * (len(email[:position]) - 1)
print(email[:1] + stars + email[position:])
`,
        ],
        wrong: [
          {
            code: src`
email = "isaac.sato62@gmail.com"
at = 0
for i, ch in enumerate(email):
    if ch == "@":
        at = i
print(email[0] + "*" * at + email[at:])
`,
            fails: ["output", "longer", "one-letter"],
            why: "`at` stars is one too many, because the first character is kept",
          },
          {
            code: src`
email = "isaac.sato62@gmail.com"
at = 0
for i, ch in enumerate(email):
    if ch == "@":
        at = i
print(email[0] + "*" * (at - 1) + email[at + 1:])
`,
            fails: ["output", "longer", "one-letter"],
            why: "`email[at + 1:]` starts after the `@`, so the `@` is lost",
          },
          {
            code: src`
email = "isaac.sato62@gmail.com"
print(email[0] + "***********" + email[12:])
`,
            fails: ["longer", "one-letter"],
            why: "the number of stars and the position of `@` are typed in for this one address",
          },
        ],
        hints: [
          "Two steps: find the position of `@`, then build the new text from three pieces.",
          "Inside the loop, remember the position whenever the character is `@`.",
          "If the `@` is at position `at`, there are `at` characters before it, and all but the first become stars.",
        ],
        task: {
          checks: [
            out("i***********@gmail.com\n"),
            rerun("longer", "a longer address", { email: "samuel_mensah@yahoo.com" }, "s************@yahoo.com\n"),
            rerun("one-letter", "an address with one character before the @", { email: "a@x.io" }, "a@x.io\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
code = "WELCOME10"
print(code[:7], code[7:], code[3:5])
`,
        choices: ["WELCOME 10 CO", "WELCOME 10 COM", "WELCOM E10 CO", "WELCOME 10 LC"],
        answer: 0,
        why: "`[:7]` is positions 0 to 6, `[7:]` is the rest, and `[3:5]` is positions 3 and 4, C and O.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the colon is on the wrong side. What does this print?",
        program: src`
card = "4111111111111111"
print(card[:-4])
`,
        choices: ["411111111111", "1111", "4111", "IndexError"],
        answer: 0,
        why: "`card[:-4]` is everything except the last four characters. The last four are `card[-4:]`.",
      },
      {
        id: "q3",
        prompt: "Which slice gives the three category letters of any SKU such as `HOM-52782` or `BOO-58412`?",
        choices: ["sku[:3]", "sku[0:2]", "sku[3:]", "sku[-3:]"],
        answer: 0,
        why: "`[:3]` takes positions 0, 1 and 2. `[0:2]` stops before position 2, `[3:]` starts at the dash, and `[-3:]` is the last three digits.",
      },
    ],
    review: [
      "`text[start:end]` includes `start` and stops before `end`. Leave either one out to run to that end.",
      "`text[-n:]` is the last n characters, and `text[:-n]` is everything else.",
      "A slice never raises IndexError. Past the end it is shorter, or empty.",
      "Next: build cleaned-up text with string methods such as strip, lower and replace.",
    ],
  },

  // ------------------------------------------------------------------ PY-L06-03 methods
  {
    id: "PY-L06-03",
    version: 2,
    slug: "string-methods",
    title: "Clean and change text with methods",
    lede: "strip, lower, upper, title and replace each build a new text. startswith and endswith answer True or False. The original text never changes.",
    focus: "Clean and test text with string methods, keeping the new text each method returns.",
    minutes: 18,
    objectives: [
      "Call a method with a dot, chain two methods, and store the new text it returns",
      "Explain why `name.strip()` on its own line changes nothing",
      "Clean both sides before comparing text that people typed",
    ],
    requires: ["assignment", "reassignment", "string-value", "boolean", "print-call", "print-text", "unquoted-name", "string-index", "string-slice", "len-call", "spaces-in-text", "arithmetic", "comparison", "if-statement", "else-clause", "top-level-indent", "runtime-error", "for-loop", "logical", "membership", "print-several", "truthiness"],
    teaches: ["string-method"],
    blocks: [
      {
        kind: "text",
        md: "Text typed by people is messy. It has extra spaces, random capitals and different separators. A **method** is a function that belongs to a value, and you call it with a dot: `city.strip()`.\n\nString methods never change the text they are called on, because a Python string can't be changed at all. Each method gives back a **new** text, and you keep it by storing it: `city = city.strip()`.",
      },
      {
        kind: "example",
        title: "Tidying a typed city",
        code: src`
city = "  new YORK "
print("[" + city + "]")
print("[" + city.strip() + "]")
print(city.strip().title())
print(city.upper().strip())
print("[" + city + "]")
`,
        output: "[  new YORK ]\n[new YORK]\nNew York\nNEW YORK\n[  new YORK ]\n",
        note: "The brackets make the spaces visible. Methods can be chained: `strip()` gives a new text, and `.title()` is called on that. The last line shows that `city` itself never changed.",
      },
      {
        kind: "error-example",
        title: "A method on the wrong kind of value",
        code: src`
zip_code = 48301
print(zip_code.startswith("4"))
`,
        error: "AttributeError",
        output: "",
        note: "The program stops with `AttributeError: 'int' object has no attribute 'startswith'`. String methods belong to text. Here the ZIP code was stored as a number, so it has none of them. Store codes as text: `zip_code = \"48301\"`.",
      },
      {
        kind: "text",
        md: "Some methods answer a question instead of building text. `startswith` and `endswith` give back True or False. `replace(old, new)` swaps every match. Together they handle checks such as *is this a CSV file?* or *is this SKU in the home category?*, as long as you clean the text first.",
      },
      {
        kind: "example",
        title: "Checking an uploaded file name",
        code: src`
filename = " Sales_Q3.CSV "
clean = filename.strip().lower()
print(clean)
print(clean.endswith(".csv"))
print(filename.endswith(".csv"))
print(clean.replace("_", " ").replace(".csv", ""))
`,
        output: "sales_q3.csv\nTrue\nFalse\nsales q3\n",
        note: "The raw name fails `endswith` twice over: it ends with a space, and `CSV` is not `csv`. Clean it once, then ask. `replace` swaps every match, and its calls can be chained too.",
      },
      {
        kind: "text",
        md: "**When to use it:** before comparing or storing anything a person typed. **Mistakes to avoid:**\n\n- Calling a method without storing the result. `name.strip()` on its own line does nothing useful.\n- Cleaning only one side of a comparison.\n- Forgetting that `replace` replaces *every* match, not only the first one.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Match the promo code",
      prompt: "A customer typed a promo code with a stray space and in lower case, so it isn't recognised. Change the test so the typed text is cleaned with `strip` and `upper` before it is compared.",
      spec: [
        ["Inputs", "`typed`, what the customer typed; `code`, the real code"],
        ["Prints", "`Code applied` when they match after cleaning, otherwise `Code not recognised`"],
      ],
      starter: src`
typed = "  spring15"
code = "SPRING15"
if typed == code:
    print("Code applied")
else:
    print("Code not recognised")
`,
      answer: src`
typed = "  spring15"
code = "SPRING15"
if typed.strip().upper() == code:
    print("Code applied")
else:
    print("Code not recognised")
`,
      wrong: [
        {
          code: src`
typed = "  spring15"
code = "SPRING15"
if typed.upper() == code:
    print("Code applied")
else:
    print("Code not recognised")
`,
          fails: ["output", "trailing-space"],
          why: "the capitals are fixed, but the spaces are still there",
        },
      ],
      hints: [
        "Only the left side of `==` needs cleaning, because `code` is already tidy.",
        "Two problems, two methods: one removes the end spaces and one makes capitals.",
        "Methods can be chained: call the second one on the result of the first.",
      ],
      task: {
        checks: [
          out("Code applied\n"),
          rerun("trailing-space", "a code typed with a space at the end", { typed: "SPRING15  " }, "Code applied\n"),
          rerun("different-code", "a different code", { typed: "summer10" }, "Code not recognised\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Category from a SKU",
        prompt: "SKUs reach the warehouse typed by hand, such as ` hom-52782 `. Print the SKU cleaned up: no spaces at the ends, in capitals. Then print its category from the prefix: `HOM` is `home`, `ELE` is `electronics`, `BOO` is `books`, and anything else is `unknown`.",
        spec: [
          ["Input", "`sku`, a SKU as typed"],
          ["Line 1", "the SKU without end spaces, in capitals"],
          ["Line 2", "`home`, `electronics`, `books` or `unknown`"],
          ["Example", "`\" hom-52782 \"` prints `HOM-52782` then `home`"],
        ],
        starter: src`
sku = " hom-52782 "
`,
        answer: src`
sku = " hom-52782 "
clean = sku.strip().upper()
print(clean)
if clean.startswith("HOM-"):
    print("home")
elif clean.startswith("ELE-"):
    print("electronics")
elif clean.startswith("BOO-"):
    print("books")
else:
    print("unknown")
`,
        alternatives: [
          src`
sku = " hom-52782 "
sku = sku.upper().strip()
print(sku)
prefix = sku[:3]
if prefix == "HOM":
    print("home")
elif prefix == "ELE":
    print("electronics")
elif prefix == "BOO":
    print("books")
else:
    print("unknown")
`,
        ],
        wrong: [
          {
            code: src`
sku = " hom-52782 "
clean = sku.upper()
print(clean)
if clean.startswith("HOM-"):
    print("home")
elif clean.startswith("ELE-"):
    print("electronics")
elif clean.startswith("BOO-"):
    print("books")
else:
    print("unknown")
`,
            fails: ["output", "unknown"],
            why: "without `strip`, the end spaces stay in the printed SKU, and a leading space means it never starts with `HOM-`",
          },
          {
            code: src`
sku = " hom-52782 "
clean = sku.strip()
print(clean.upper())
if clean.startswith("HOM-"):
    print("home")
elif clean.startswith("ELE-"):
    print("electronics")
elif clean.startswith("BOO-"):
    print("books")
else:
    print("unknown")
`,
            fails: ["output", "books"],
            why: "the capitals are printed but not stored, so the test still sees `hom-`",
          },
          {
            code: src`
sku = " hom-52782 "
print(sku.strip().upper())
print("home")
`,
            fails: ["books", "unknown"],
            why: "the category is typed in, not worked out from the prefix",
          },
        ],
        hints: [
          "Clean the SKU once and store the result, then use that stored text for everything else.",
          "`startswith` tests a prefix, and so does comparing the first three characters.",
          "Put the tests in an `if`/`elif` chain and let `else` print `unknown`.",
        ],
        task: {
          checks: [
            out("HOM-52782\nhome\n"),
            rerun("books", "a books SKU typed in lower case", { sku: "boo-58412" }, "BOO-58412\nbooks\n"),
            rerun("unknown", "a prefix that isn't a category", { sku: "  xyz-1" }, "XYZ-1\nunknown\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Standardise a phone number",
        prompt: "Customers type phone numbers in many styles, such as `(415) 555-0134` or `415.555.0134`. Remove brackets, spaces, dashes and dots. If exactly 10 digits are left, print them as `415-555-0134`. Otherwise print `invalid`.",
        spec: [
          ["Input", "`phone`, a phone number as typed"],
          ["Remove", "`(`, `)`, spaces, `-` and `.`"],
          ["Prints", "`AAA-BBB-CCCC` when 10 characters are left, otherwise `invalid`"],
          ["Example", "`\"(415) 555-0134\"` prints `415-555-0134`"],
        ],
        starter: src`
phone = "(415) 555-0134"
`,
        answer: src`
phone = "(415) 555-0134"
digits = phone.replace("(", "").replace(")", "").replace(" ", "")
digits = digits.replace("-", "").replace(".", "")
if len(digits) == 10:
    print(digits[:3] + "-" + digits[3:6] + "-" + digits[6:])
else:
    print("invalid")
`,
        alternatives: [
          src`
phone = "(415) 555-0134"
digits = ""
for ch in phone:
    if ch != "(" and ch != ")" and ch != " " and ch != "-" and ch != ".":
        digits = digits + ch
if len(digits) != 10:
    print("invalid")
else:
    print(digits[0:3] + "-" + digits[3:6] + "-" + digits[6:10])
`,
        ],
        wrong: [
          {
            code: src`
phone = "(415) 555-0134"
digits = phone.replace("(", "").replace(")", "").replace(" ", "").replace("-", "")
if len(digits) == 10:
    print(digits[:3] + "-" + digits[3:6] + "-" + digits[6:])
else:
    print("invalid")
`,
            fails: ["dots"],
            why: "the dots are not removed, so a number typed with dots is rejected",
          },
          {
            code: src`
phone = "(415) 555-0134"
digits = phone.replace("(", "").replace(")", "").replace(" ", "")
digits = digits.replace("-", "").replace(".", "")
print(digits[:3] + "-" + digits[3:6] + "-" + digits[6:])
`,
            fails: ["too-short", "country-code"],
            why: "the length is never checked, so a 7-digit number is printed as if it were complete",
          },
          {
            code: src`
phone = "(415) 555-0134"
digits = phone.replace("(", "").replace(")", "").replace(" ", "")
digits = digits.replace("-", "").replace(".", "")
if len(digits) == 10:
    print(digits[:3] + "-" + digits[3:7] + "-" + digits[7:])
else:
    print("invalid")
`,
            fails: ["output", "dots"],
            why: "the middle slice takes four digits; the groups are 3, 3 and 4",
          },
        ],
        hints: [
          "First build a text with only the digits, then decide, then format.",
          "`replace(\"-\", \"\")` swaps every dash for nothing, and calls can be chained or done one per line.",
          "After cleaning, the three groups start at positions 0, 3 and 6.",
        ],
        task: {
          checks: [
            out("415-555-0134\n"),
            rerun("dots", "a number typed with dots", { phone: "212.555.0187" }, "212-555-0187\n"),
            rerun("too-short", "a number with only 7 digits", { phone: "555-0134" }, "invalid\n"),
            rerun("country-code", "a number with a country code in front", { phone: "+1 415 555 0134" }, "invalid\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
code = "welcome10"
print(code.upper().replace("10", ""))
print(code)
`,
        choices: ["WELCOME\nwelcome10", "WELCOME\nWELCOME", "WELCOME10\nwelcome10", "welcome\nwelcome10"],
        answer: 0,
        why: "`upper` builds WELCOME10, and `replace` builds WELCOME from that. Neither changes `code`, which is still welcome10.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the result of `strip` is not stored. What does this print?",
        program: src`
note = "  Refund requested  "
note.strip()
print("[" + note.lower() + "]")
`,
        choices: ["[  refund requested  ]", "[refund requested]", "[Refund requested]", "[  Refund requested  ]"],
        answer: 0,
        why: "`note.strip()` builds a new text and throws it away. `note` still has its spaces. Write `note = note.strip()` to keep the cleaned text.",
      },
      {
        id: "q3",
        prompt: "You want to accept an uploaded file only if it is a PDF, whatever capitals the name uses. Which test does that?",
        choices: ["name.lower().endswith(\".pdf\")", "name.endswith(\".pdf\")", "name.replace(\".pdf\", \"\")", "\".pdf\" == name"],
        answer: 0,
        why: "Lowering first makes `REPORT.PDF` end with `.pdf`. Plain `endswith` misses capitals, `replace` builds text instead of answering, and `==` compares the whole name.",
      },
    ],
    review: [
      "A method is called with a dot, and string methods always return a new text. Store it to keep it.",
      "`strip`, `lower`, `upper`, `title` and `replace` build text, while `startswith` and `endswith` answer True or False.",
      "Clean both sides before comparing text that people typed.",
      "Next: put values into a sentence, with control over decimals and widths, using f-strings.",
    ],
  },

  // ------------------------------------------------------------------ PY-L06-04 f-strings
  {
    id: "PY-L06-04",
    version: 2,
    slug: "format-text",
    title: "Fill a sentence with values",
    lede: "An f-string puts values straight into text: f\"Total: {total:.2f}\". The part after the colon controls decimals, widths and separators.",
    focus: "Build output lines with f-strings and format specs.",
    minutes: 18,
    objectives: [
      "Explain why `\"Items: \" + 3` fails and what an f-string does instead",
      "Put any expression in braces, and show money with `:.2f`",
      "Line values up in columns with `:<n` and `:>n`",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "decimal-number", "print-call", "print-text", "unquoted-name", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "top-level-indent", "runtime-error", "string-method", "for-loop", "hash-in-text", "membership", "print-several", "range-call"],
    teaches: ["string-format"],
    blocks: [
      {
        kind: "text",
        md: "Receipts, reports and messages mix fixed words with values. Joining with `+` works only on text, so every number would need `str()` first, and the spaces are easy to get wrong.",
      },
      {
        kind: "error-example",
        title: "Joining text and a number",
        code: src`
qty = 3
print("Items: " + qty)
`,
        error: "TypeError",
        output: "",
        note: "The program stops with `TypeError: can only concatenate str (not \"int\") to str`. `+` joins two texts or adds two numbers, never one of each.",
      },
      {
        kind: "text",
        md: "An **f-string** has an `f` right before the opening quote. You write the sentence once and put each value in braces: `f\"Items: {qty}\"`. Any expression can go inside the braces, such as `{qty * price}`.\n\nAfter a colon, a **format spec** controls how the value looks. `{price:.2f}` always shows two decimals, which is what money needs, because a float such as `3 * 19.9` is stored as 59.699999999999996.",
      },
      {
        kind: "example",
        title: "A receipt line",
        code: src`
item = "Travel Yoga Mat"
qty = 3
price = 19.9
print(f"{qty} x {item} at {price:.2f} each")
print(f"Line total: {qty * price}")
print(f"Line total: {qty * price:.2f}")
`,
        output: "3 x Travel Yoga Mat at 19.90 each\nLine total: 59.699999999999996\nLine total: 59.70\n",
        note: "`:.2f` rounds the shown value to two decimals and keeps the trailing zero. The stored number does not change; only its display does.",
      },
      {
        kind: "text",
        md: "Widths make columns line up. `{city:<12}` pads the text to 12 characters, aligned left. `{high:>6.1f}` makes a 6-character column, aligned right, with one decimal. Headings can be padded too: put the heading text in quotes inside the braces.",
      },
      {
        kind: "example",
        title: "A weather table that lines up",
        code: src`
print(f"{'City':<12}{'High':>6}{'Low':>6}")
city = "Great Falls"
high = 6.7
low = -5.5
print(f"{city:<12}{high:>6.1f}{low:>6.1f}")
city = "Miami"
high = 27
low = 19.4
print(f"{city:<12}{high:>6.1f}{low:>6.1f}")
`,
        output: "City          High   Low\nGreat Falls    6.7  -5.5\nMiami         27.0  19.4\n",
        note: "The same f-string formats both rows, so the columns line up whatever the values are. `.1f` shows 27 as 27.0, so every number has one decimal.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever output mixes words and values. Use `:.2f` for money, `:<n` and `:>n` for columns, and `:,` for thousands separators (`f\"{1500000:,}\"` is `1,500,000`). **Mistakes to avoid:**\n\n- Forgetting the `f`. The braces are then printed as ordinary characters.\n- Using a number spec such as `.2f` on text, which raises ValueError.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Two decimals for money",
      prompt: "Order O108752 has a subtotal of 54.87 and tax of 3.84, but the total prints as 58.709999999999994. Add a format spec so the total always shows exactly two decimals.",
      spec: [
        ["Inputs", "`subtotal` and `tax`"],
        ["Prints", "`Total: ` and their sum with two decimals"],
      ],
      starter: src`
subtotal = 54.87
tax = 3.84
print(f"Total: {subtotal + tax}")
`,
      answer: src`
subtotal = 54.87
tax = 3.84
print(f"Total: {subtotal + tax:.2f}")
`,
      wrong: [
        {
          code: src`
subtotal = 54.87
tax = 3.84
print(f"Total: {subtotal + tax:.1f}")
`,
          fails: ["output", "round-number"],
          why: "`.1f` shows one decimal, so the cents are lost",
        },
      ],
      hints: [
        "The spec goes inside the braces, after the expression.",
        "A colon separates the value from its spec.",
        "`.2f` means two digits after the point, shown as a float.",
      ],
      task: {
        checks: [
          out("Total: 58.71\n"),
          rerun("round-number", "a total with no cents", { subtotal: 20, tax: 1.4 }, "Total: 21.40\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An order confirmation",
        prompt: "Write the two-line confirmation a customer sees after checkout. The first line is `Order O104839 (3 items)`, but a single item must read `(1 item)`, not `(1 items)`. The second line is the total of `subtotal` and `shipping`, with two decimals: `Total: 133.43`.",
        spec: [
          ["Inputs", "`order_id` (text), `items` (a whole number), `subtotal` and `shipping` (numbers)"],
          ["Line 1", "`Order <id> (<n> items)`, or `(1 item)` when there is one item"],
          ["Line 2", "`Total: ` and `subtotal + shipping` with two decimals"],
          ["Example", "O104839, 3 items, 133.43 and 0 prints `Order O104839 (3 items)` then `Total: 133.43`"],
        ],
        starter: src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
`,
        answer: src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
if items == 1:
    word = "item"
else:
    word = "items"
print(f"Order {order_id} ({items} {word})")
print(f"Total: {subtotal + shipping:.2f}")
`,
        alternatives: [
          src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
if items == 1:
    print(f"Order {order_id} (1 item)")
else:
    print(f"Order {order_id} ({items} items)")
total = subtotal + shipping
print("Total:", f"{total:.2f}")
`,
        ],
        wrong: [
          {
            code: src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
print(f"Order {order_id} ({items} items)")
print(f"Total: {subtotal + shipping:.2f}")
`,
            fails: ["one-item"],
            why: "a single item still says `items`",
          },
          {
            code: src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
if items == 1:
    word = "item"
else:
    word = "items"
print(f"Order {order_id} ({items} {word})")
print(f"Total: {subtotal + shipping}")
`,
            fails: ["whole-total"],
            why: "without `:.2f`, a total of 20 prints as 20 instead of 20.00",
          },
          {
            code: src`
order_id = "O104839"
items = 3
subtotal = 133.43
shipping = 0
if items == 1:
    word = "item"
else:
    word = "items"
print(f"Order {order_id} ({items} {word})")
print(f"Total: {subtotal:.2f}")
`,
            fails: ["one-item", "whole-total"],
            why: "the shipping fee is left out of the total",
          },
        ],
        hints: [
          "Decide the word first (`item` or `items`), then build the sentence with it.",
          "An expression such as `subtotal + shipping` can go straight into the braces.",
          "End the total with a spec that always shows two decimals.",
        ],
        task: {
          checks: [
            out("Order O104839 (3 items)\nTotal: 133.43\n"),
            rerun("one-item", "a one-item order with shipping", { order_id: "O100043", items: 1, subtotal: 6.49, shipping: 5.99 }, "Order O100043 (1 item)\nTotal: 12.48\n"),
            rerun("whole-total", "a total with no cents", { order_id: "O120001", items: 2, subtotal: 15, shipping: 5 }, "Order O120001 (2 items)\nTotal: 20.00\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "A progress bar",
        prompt: "A data import shows its progress as a bar 20 characters wide, like `[#######-------------] 35%`. The number of `#` is `done * 20 // total`, and the rest of the 20 places are `-`. After the bar, print the percentage `done / total * 100` with no decimals.",
        spec: [
          ["Inputs", "`done` and `total`, whole numbers with `0 <= done <= total` and `total > 0`"],
          ["Prints", "`[`, the 20-character bar, `] `, then the percentage with no decimals and a `%`"],
          ["Example", "`done = 7`, `total = 20` prints `[#######-------------] 35%`"],
        ],
        starter: src`
done = 7
total = 20
`,
        answer: src`
done = 7
total = 20
filled = done * 20 // total
bar = "#" * filled + "-" * (20 - filled)
print(f"[{bar}] {done / total * 100:.0f}%")
`,
        alternatives: [
          src`
done = 7
total = 20
filled = done * 20 // total
bar = ""
for i in range(20):
    if i < filled:
        bar = bar + "#"
    else:
        bar = bar + "-"
percent = done / total * 100
print("[" + bar + "] " + f"{percent:.0f}" + "%")
`,
        ],
        wrong: [
          {
            code: src`
done = 7
total = 20
bar = "#" * done + "-" * (20 - done)
print(f"[{bar}] {done / total * 100:.0f}%")
`,
            fails: ["thirds", "finished"],
            why: "`done` is used as the number of `#`, which only works when `total` happens to be 20",
          },
          {
            code: src`
done = 7
total = 20
filled = done * 20 // total
bar = "#" * filled + "-" * (20 - filled)
print(f"[{bar}] {done / total * 100}%")
`,
            fails: ["output", "thirds", "finished"],
            why: "without `:.0f` the percentage prints as 35.0, or 33.33333333333333 for a third",
          },
          {
            code: src`
done = 7
total = 20
filled = done * 20 // total
bar = "#" * filled
print(f"[{bar}] {done / total * 100:.0f}%")
`,
            fails: ["output", "thirds"],
            why: "the `-` padding is missing, so the bar is not always 20 characters wide",
          },
        ],
        hints: [
          "Work out the number of `#` first, then the number of `-`. Together they make 20.",
          "Repeating a text with `*` builds each part of the bar.",
          "The percentage needs a format spec with zero decimals.",
        ],
        task: {
          checks: [
            out("[#######-------------] 35%\n"),
            rerun("thirds", "a total that doesn't divide evenly", { done: 1, total: 3 }, "[######--------------] 33%\n"),
            rerun("finished", "a finished import", { done: 9, total: 9 }, "[####################] 100%\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
price = 4.5
qty = 2
print(f"{qty} x {price:.2f} = {qty * price:.2f}")
`,
        choices: ["2 x 4.50 = 9.00", "2 x 4.5 = 9.0", "2 x 4.50 = 9.0", "{qty} x {price:.2f} = {qty * price:.2f}"],
        answer: 0,
        why: "Both values use `:.2f`, so both show exactly two decimals: 4.50 and 9.00.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the `f` is missing. What does this print?",
        program: src`
total = 12.5
print("Total: {total}")
`,
        choices: ["Total: {total}", "Total: 12.5", "Total: 12.50", "NameError"],
        answer: 0,
        why: "Without the `f` before the quote, braces are ordinary characters, so the text is printed as written.",
      },
      {
        id: "q3",
        prompt: "Which f-string shows the number 1234.5 as `1,234.50`?",
        choices: ["f\"{x:,.2f}\"", "f\"{x:.2f}\"", "f\"{x:,}\"", "f\"{x:>2f}\""],
        answer: 0,
        why: "`,` adds the thousands separator and `.2f` adds two decimals. The two can be combined in one spec.",
      },
    ],
    review: [
      "`+` can't join text and a number. An f-string puts any value or expression into text with braces.",
      "A spec after a colon controls the look: `.2f` for two decimals, `<n` and `>n` for columns, `,` for thousands.",
      "A spec only changes how a value is shown, not the value itself.",
      "Next: characters beyond A to Z, and the numbers behind every character.",
    ],
  },

  // ------------------------------------------------------------------ PY-L06-05 Unicode
  {
    id: "PY-L06-05",
    version: 2,
    slug: "unicode",
    title: "Characters beyond A to Z",
    lede: "Python text is Unicode: é, ü and ☃ are one character each. ord gives a character's number, and chr turns a number back into a character.",
    focus: "Treat every character as one Unicode character with a number, and compute with ord and chr.",
    minutes: 18,
    objectives: [
      "Count and index text with accented letters correctly",
      "Convert between characters and code points with `ord` and `chr`",
      "Use letter arithmetic, such as a letter's place in the alphabet, and test for plain ASCII",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "print-call", "print-text", "print-several", "unquoted-name", "string-index", "len-call", "string-method", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "nested-condition", "for-loop", "top-level-indent", "runtime-error", "boolean", "identity", "membership", "none-value", "string-format"],
    teaches: ["unicode-text"],
    blocks: [
      {
        kind: "text",
        md: "Real data is not limited to A–Z. Open Food Facts has products such as *Weetabix produit à base de blé complet* from the brand *Brüggen*, and customer names include José and Zoë. Python text is a sequence of **Unicode characters**, so `é` is one character to `len`, to indexing and to loops, exactly like `e`.\n\nEvery character has a number, its **code point**. `ord(\"A\")` is 65, and `chr(65)` goes back to `\"A\"`. The letters A–Z are 65–90 and a–z are 97–122, and anything above 127 is outside plain ASCII.",
      },
      {
        kind: "example",
        title: "Characters and their numbers",
        code: src`
brand = "Brüggen"
print(len(brand), brand[2])
print(ord("A"), ord("a"), ord("ü"))
print(chr(233), chr(9731))
print("Zoë".upper())
`,
        output: "7 ü\n65 97 252\né ☃\nZOË\n",
        note: "Brüggen has seven characters, and `ü` sits at position 2 like any other letter. Methods such as `upper` know about accented letters too.",
      },
      {
        kind: "text",
        md: "Because characters are numbers, you can compute with them. The letters are consecutive, so `ord(letter) - ord(\"A\")` is a capital letter's place in the alphabet, counting A as 0. Spreadsheets use this to number their columns: A is column 1, Z is 26, AA is 27, and each extra letter works like a digit in base 26.",
      },
      {
        kind: "example",
        title: "Spreadsheet column letters to a number",
        code: src`
column = "AB"
number = 0
for letter in column:
    number = number * 26 + (ord(letter) - ord("A") + 1)
    print(letter, number)
print(column, "is column", number)
`,
        output: "A 1\nB 28\nAB is column 28\n",
        note: "After A the number is 1. For B, the 1 so far is worth 26, and B adds 2, which gives 28. The same loop gives 16384 for `XFD`, the last column a spreadsheet allows.",
      },
      {
        kind: "error-example",
        title: "ord takes one character",
        code: src`
print(ord("é"))
print(ord("AB"))
`,
        error: "TypeError",
        output: "233\n",
        note: "The second line stops with `TypeError: ord() expected a character, but string of length 2 found`. To get the numbers of a longer text, loop over it and call `ord` on each character.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever text might come from anywhere. Count characters rather than letters, test whether a name is plain ASCII with `ord(ch) < 128`, or compute with letters. **Mistakes to avoid:**\n\n- Assuming every character is A–Z.\n- Passing more than one character to `ord`.\n- Expecting two texts that look the same to be equal. An `é` can also be stored as `e` followed by a separate accent character, which is two characters. The concept check runs that case.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Plain ASCII or not?",
      prompt: "This prints a character and its code point. Add a second line that prints `True` when the character is plain ASCII, with a code point below 128, and `False` when it isn't.",
      spec: [
        ["Input", "`letter`, one character"],
        ["Line 2", "`True` for a code point below 128, otherwise `False`"],
      ],
      starter: src`
letter = "ü"
print(letter, ord(letter))
`,
      answer: src`
letter = "ü"
print(letter, ord(letter))
print(ord(letter) < 128)
`,
      wrong: [
        {
          code: src`
letter = "ü"
print(letter, ord(letter))
print(ord(letter) < 256)
`,
          fails: ["output"],
          why: "below 256 includes ü (252); plain ASCII stops at 127",
        },
      ],
      hints: [
        "A comparison already prints True or False.",
        "Compare the character's code point, not the character itself.",
        "Plain ASCII is every code point below 128.",
      ],
      task: {
        checks: [
          out("ü 252\nFalse\n"),
          rerun("ascii", "a plain letter", { letter: "e" }, "e 101\nTrue\n"),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A Caesar shift",
        prompt: "A Caesar cipher moves each letter a fixed number of places along the alphabet and wraps around after z, so with a shift of 3, `x` becomes `a`. Shift every lowercase letter a–z in `message` by `shift` places. Leave every other character (spaces, digits, capitals, accented letters) as it is. Print the result.",
        spec: [
          ["Inputs", "`message` (text) and `shift` (a whole number from 0 to 25)"],
          ["Shift", "only `a`–`z`, wrapping from `z` back to `a`"],
          ["Prints", "the shifted message"],
          ["Example", "`\"meet at noon\"` with shift 3 prints `phhw dw qrrq`"],
        ],
        starter: src`
message = "meet at noon"
shift = 3
result = ""
`,
        answer: src`
message = "meet at noon"
shift = 3
result = ""
for ch in message:
    if ch >= "a" and ch <= "z":
        place = (ord(ch) - ord("a") + shift) % 26
        result = result + chr(ord("a") + place)
    else:
        result = result + ch
print(result)
`,
        alternatives: [
          src`
message = "meet at noon"
shift = 3
result = ""
for ch in message:
    code = ord(ch)
    if 97 <= code and code <= 122:
        code = code + shift
        if code > 122:
            code = code - 26
    result = result + chr(code)
print(result)
`,
        ],
        wrong: [
          {
            code: src`
message = "meet at noon"
shift = 3
result = ""
for ch in message:
    if ch >= "a" and ch <= "z":
        result = result + chr(ord(ch) + shift)
    else:
        result = result + ch
print(result)
`,
            fails: ["wraps"],
            why: "letters near the end of the alphabet don't wrap: `z` + 1 is `{`",
          },
          {
            code: src`
message = "meet at noon"
shift = 3
result = ""
for ch in message:
    place = (ord(ch) - ord("a") + shift) % 26
    result = result + chr(ord("a") + place)
print(result)
`,
            fails: ["output", "mixed"],
            why: "spaces and other characters are shifted too, so the words run together",
          },
          {
            code: src`
message = "meet at noon"
shift = 3
result = ""
for ch in message:
    if ch >= "a" and ch <= "z":
        place = (ord(ch) - ord("a") + shift) % 26
        result = result + chr(ord("a") + place)
print(result)
`,
            fails: ["output", "mixed"],
            why: "characters that aren't lowercase letters are dropped instead of kept",
          },
        ],
        hints: [
          "Build the result one character at a time, starting from an empty text.",
          "For a letter, find its place counting `a` as 0, add the shift, and use `% 26` to wrap past `z`.",
          "Every character that isn't `a`–`z` is added to the result unchanged.",
        ],
        task: {
          checks: [
            out("phhw dw qrrq\n"),
            rerun("wraps", "letters that wrap past z", { message: "zoo", shift: 25 }, "ynn\n"),
            rerun("mixed", "capitals, digits and accents", { message: "Room 12b café", shift: 1 }, "Rppn 12c dbgé\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Product names that need checking",
        prompt: "An old label printer can only print plain ASCII. For a product name, count the characters with a code point above 127. Print `plain ASCII` if there are none. Otherwise print the count and the first such character with its code point, like `2 non-ASCII, first à 224`.",
        spec: [
          ["Input", "`name`, a product name"],
          ["Prints", "`plain ASCII`, or `<count> non-ASCII, first <character> <code point>`"],
          ["Example", "`\"Weetabix produit à base de blé complet\"` prints `2 non-ASCII, first à 224`"],
        ],
        starter: src`
name = "Weetabix produit à base de blé complet"
`,
        answer: src`
name = "Weetabix produit à base de blé complet"
count = 0
first = ""
for ch in name:
    if ord(ch) > 127:
        count = count + 1
        if first == "":
            first = ch
if count == 0:
    print("plain ASCII")
else:
    print(count, "non-ASCII, first", first, ord(first))
`,
        alternatives: [
          src`
name = "Weetabix produit à base de blé complet"
count = 0
first = None
for ch in name:
    if ord(ch) >= 128:
        if first is None:
            first = ch
        count = count + 1
if first is None:
    print("plain ASCII")
else:
    print(f"{count} non-ASCII, first {first} {ord(first)}")
`,
        ],
        wrong: [
          {
            code: src`
name = "Weetabix produit à base de blé complet"
count = 0
first = ""
for ch in name:
    if ord(ch) > 127:
        count = count + 1
        first = ch
if count == 0:
    print("plain ASCII")
else:
    print(count, "non-ASCII, first", first, ord(first))
`,
            fails: ["output", "brand"],
            why: "`first` is replaced every time, so it ends up holding the last non-ASCII character",
          },
          {
            code: src`
name = "Weetabix produit à base de blé complet"
count = 0
first = ""
for ch in name:
    if ch < "a" or ch > "z":
        count = count + 1
        if first == "":
            first = ch
if count == 0:
    print("plain ASCII")
else:
    print(count, "non-ASCII, first", first, ord(first))
`,
            fails: ["output", "ascii", "brand"],
            why: "testing for a–z counts capitals and spaces as well, which are plain ASCII",
          },
        ],
        hints: [
          "Keep two things while you loop: how many characters you have counted, and the first one you found.",
          "The first character is stored only when nothing has been stored yet.",
          "After the loop, choose between the two kinds of line.",
        ],
        task: {
          checks: [
            out("2 non-ASCII, first à 224\n"),
            rerun("ascii", "a plain ASCII name", { name: "Copos de avena" }, "plain ASCII\n"),
            rerun("brand", "a name whose first accent is not its last", { name: "Brüggen Müsli Crème" }, "3 non-ASCII, first ü 252\n"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
name = "José"
print(len(name), name[-1], ord(name[-1]) > 127)
`,
        choices: ["4 é True", "5 é True", "4 e False", "4 é False"],
        answer: 0,
        why: "é is one character, so José has four. Its code point is 233, which is above 127.",
      },
      {
        id: "q2",
        prompt: "A common mistake: two texts look the same on screen. What does this print?",
        program: src`
a = "é"
b = "é"
print(len(a), len(b), a == b)
`,
        choices: ["1 2 False", "1 1 True", "2 2 True", "1 2 True"],
        answer: 0,
        why: "`b` is an `e` followed by a separate combining accent, which is two characters. It looks the same as `é`, but the characters differ, so `==` is False.",
      },
      {
        id: "q3",
        prompt: "Which expression gives a lowercase letter's place in the alphabet, with a as 0 and z as 25?",
        choices: ["ord(ch) - ord(\"a\")", "ord(ch)", "chr(ch) - 97", "ord(ch) - 65"],
        answer: 0,
        why: "Letters are consecutive, so subtracting the code point of `a` leaves the offset. 65 is the code point of a capital A.",
      },
    ],
    review: [
      "Python text is Unicode. é, ü and ☃ each count as one character for len, indexing and loops.",
      "`ord(ch)` is a character's code point, and `chr(n)` turns a number back into a character. Plain ASCII is below 128.",
      "Letters are consecutive numbers, so arithmetic on `ord` can shift or number them.",
      "Next module: lists and tuples hold many values in order, not only characters.",
    ],
  },
];
