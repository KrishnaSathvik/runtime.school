/**
 * M05 practice: ten questions on loops. for over text and ranges, while (with typed lines), range and enumerate,
 * break and continue, nested loops. No def yet (functions arrive in M09), so every code question is a program
 * that Check runs again with other stored values or other typed lines: boundaries, empty text, no matches.
 *
 * Version 2: rewritten. Two predictions with real reasoning, then independent problems: clean a typed amount,
 * check a barcode's check digit, validate a password, fix a reset counter and a vowel counter, a bus timetable, a star-rating
 * bar that has to work for any scale, and a delivery-streak summary.
 */
import type { PyQuestion } from "../model";
import { usesFor } from "../checks";
import { rerun, retyped } from "../beginner-checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected });
/** A public re-run: the learner sees the values it uses. */
const shown = (id: string, set: Record<string, unknown>, output: string) => rerun(id, set, output, { hidden: false });
const walks = usesFor("walks", "Uses for");

export const m05Questions: PyQuestion[] = [
  {
    id: "PY-Q05-02",
    version: 2,
    slug: "reorder-day",
    title: "When does the shelf run low?",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "reassignment", "whole-number", "arithmetic", "comparison", "while-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent"],
    prompt: "A shop sells 3 jars of honey a day and starts with 7. Work through the loop one pass at a time and type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["Write down stock and day after every pass.", "The test is checked at the top of each pass, before anything is sold.", "The last line runs once, after the loop, and adds 1 to the day the loop stopped on."],
    explanation: "Pass 1: day 1, stock 4. 4 is still at least 3, so pass 2: day 2, stock 1. 1 is less than 3, so the loop stops before a third pass. The last print uses day + 1, which is 3.",
    predict: {
      program: src`
stock = 7
day = 0
while stock >= 3:
    day += 1
    stock -= 3
    print("Day", day, "left", stock)
print("Reorder on day", day + 1)
`,
      output: "Day 1 left 4\nDay 2 left 1\nReorder on day 3\n",
      wrongPredictions: [
        "Day 1 left 4\nDay 2 left 1\nDay 3 left -2\nReorder on day 4",
        "Day 1 left 7\nDay 2 left 4\nReorder on day 3",
        "Day 1 left 4\nDay 2 left 1\nReorder on day 2",
      ],
    },
  },
  {
    id: "PY-Q05-03",
    version: 2,
    slug: "stamp-card",
    title: "The stamp card that always says 1",
    format: "debugging",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "reassignment", "whole-number", "string-value", "arithmetic", "comparison", "if-statement", "for-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "membership"],
    prompt: "A café records each visit on a stamp card as an `X`; a `-` is an empty box. Six or more stamps earn a free coffee. The program prints `Stamps: 1` for every card, and nobody ever gets a coffee. Fix it.",
    spec: [
      ["Keep", "the `card = ...` line first. Check runs your program again with other cards"],
      ["Prints", "`Stamps: 6`, then `Free coffee!` (only for 6 or more stamps)"],
    ],
    hiddenKinds: ["an empty card", "a full card of ten stamps", "exactly five stamps", "a card that ends with an empty box"],
    hints: ["Run it and follow the count by hand for the first three characters.", "Look at where the count is set to 0.", "A starting value belongs before the loop, so it is set once."],
    explanation: "stamps = 0 was inside the loop, so the count started again on every character and could never be more than 1. Moved above the for line it is set once, and every X adds to the same count. The free-coffee test then sees the real total.",
    code: {
      starter: src`
card = "XX-X--XXX"
for ch in card:
    stamps = 0
    if ch == "X":
        stamps += 1
print("Stamps:", stamps)
if stamps >= 6:
    print("Free coffee!")
`,
      answer: src`
card = "XX-X--XXX"
stamps = 0
for ch in card:
    if ch == "X":
        stamps += 1
print("Stamps:", stamps)
if stamps >= 6:
    print("Free coffee!")
`,
      alternatives: [src`
card = "XX-X--XXX"
stamps = 0
for box in card:
    if box != "-":
        stamps = stamps + 1
print("Stamps:", stamps)
if stamps >= 6:
    print("Free coffee!")
`],
      wrong: [
        { code: src`
card = "XX-X--XXX"
for ch in card:
    if ch == "X":
        stamps = 0
        stamps += 1
print("Stamps:", stamps)
if stamps >= 6:
    print("Free coffee!")
`, fails: ["output", "p1", "v1", "v2", "v3", "v4"], why: "the reset moved, but it still runs inside the loop, on every stamp" },
        { code: src`
card = "XX-X--XXX"
stamps = 0
for ch in card:
    if ch == "X":
        stamps += 1
print("Stamps:", stamps)
if stamps > 6:
    print("Free coffee!")
`, fails: ["output", "v4"], why: "exactly six stamps should earn the coffee" },
      ],
      task: {
        checks: [
          out("Stamps: 6\nFree coffee!\n"),
          shown("p1", { card: "X-X-X" }, "Stamps: 3\n"),
          rerun("v1", { card: "------" }, "Stamps: 0\n", { label: "an empty card" }),
          rerun("v2", { card: "XXXXXXXXXX" }, "Stamps: 10\nFree coffee!\n", { label: "a full card of ten stamps" }),
          rerun("v3", { card: "XXXXX" }, "Stamps: 5\n", { label: "exactly five stamps" }),
          rerun("v4", { card: "XXX-XXX-" }, "Stamps: 6\nFree coffee!\n", { label: "a card that ends with an empty box" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-06",
    version: 2,
    slug: "clean-a-typed-amount",
    title: "Clean a typed amount",
    format: "data_transformation",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "reassignment", "string-value", "decimal-number", "conversion", "membership", "if-statement", "for-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "arithmetic", "comparison", "logical"],
    prompt: "An expenses form lets people type amounts like `$1,299.50`. `float()` refuses the dollar sign and the comma. Build a cleaned text that keeps only the digits and the decimal point, convert it with `float()`, and print it.",
    spec: [
      ["First line", "`amount_text = \"$1,299.50\"`. Check runs your program again with other typed amounts"],
      ["Prints", "`Amount: 1299.5`"],
      ["Keep", "the characters `0123456789` and `.`; drop everything else"],
    ],
    hiddenKinds: ["a plain whole number", "cents under a dollar", "a thousands comma with no cents", "spaces and a currency word"],
    hints: ["Start with empty text before the loop.", "For each character, decide whether it is one of the characters to keep, and add only those.", "Convert once, after the loop, when the cleaned text is complete."],
    explanation: "The loop builds a new text from the allowed characters only: $1,299.50 becomes 1299.50, which float() reads as 1299.5. Converting inside the loop would try to convert half-built text such as 1 and then 12; converting the original text fails on the $.",
    code: {
      starter: 'amount_text = "$1,299.50"\n',
      answer: src`
amount_text = "$1,299.50"
cleaned = ""
for ch in amount_text:
    if ch in "0123456789.":
        cleaned = cleaned + ch
amount = float(cleaned)
print("Amount:", amount)
`,
      alternatives: [src`
amount_text = "$1,299.50"
cleaned = ""
for ch in amount_text:
    if ch in "0123456789" or ch == ".":
        cleaned += ch
print("Amount:", float(cleaned))
`],
      wrong: [
        { code: src`
amount_text = "$1,299.50"
cleaned = ""
for ch in amount_text:
    if ch in "0123456789":
        cleaned = cleaned + ch
amount = float(cleaned)
print("Amount:", amount)
`, fails: ["output", "p1", "v2", "v4"], why: "the decimal point is dropped, so 1,299.50 becomes 129950" },
        { code: src`
amount_text = "$1,299.50"
cleaned = ""
for ch in amount_text:
    if ch != "$":
        cleaned = cleaned + ch
amount = float(cleaned)
print("Amount:", amount)
`, fails: ["output", "walks", "p1", "v1", "v2", "v3", "v4"], why: "only the dollar sign is removed, so a comma or a space still stops float()" },
        { code: src`
amount_text = "$1,299.50"
cleaned = ""
for ch in amount_text:
    if ch in "0123456789.":
        cleaned = ch
amount = float(cleaned)
print("Amount:", amount)
`, fails: ["output", "p1", "v1", "v2", "v3", "v4"], why: "cleaned keeps only the last character instead of adding each one" },
      ],
      task: {
        checks: [
          out("Amount: 1299.5\n"),
          walks,
          shown("p1", { amount_text: "$0.99" }, "Amount: 0.99\n"),
          rerun("v1", { amount_text: "15" }, "Amount: 15.0\n", { label: "a plain whole number" }),
          rerun("v2", { amount_text: "$7.25" }, "Amount: 7.25\n", { label: "cents under ten dollars" }),
          rerun("v3", { amount_text: "2,000" }, "Amount: 2000.0\n", { label: "a thousands comma with no cents" }),
          rerun("v4", { amount_text: " 48.10 USD" }, "Amount: 48.1\n", { label: "spaces and a currency word" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-10",
    version: 2,
    slug: "barcode-check-digit",
    title: "Check a barcode's last digit",
    format: "validation",
    difficulty: "medium",
    minutes: 10,
    requires: ["assignment", "reassignment", "whole-number", "boolean", "string-value", "conversion", "arithmetic", "precedence", "comparison", "logical", "membership", "if-statement", "else-clause", "conditional-expr", "for-loop", "enumerate-call", "break-statement", "print-call", "print-text", "unquoted-name", "top-level-indent", "nested-condition"],
    prompt: "Shop barcodes (EAN-13) have 13 digits, and the last one is a check digit that catches typing mistakes. Multiply the first 12 digits alternately by 1 and 3 (the digit at position 0 by 1, position 1 by 3, and so on) and add them up. The check digit must equal `(10 - total % 10) % 10`. Print `Valid barcode`, `Wrong check digit`, or `Barcode must be 13 digits` when the text is not exactly 13 digits.",
    spec: [
      ["First line", "`barcode = \"4006381333931\"`. Check runs your program again with other barcodes"],
      ["Prints", "`Valid barcode`"],
    ],
    hiddenKinds: ["another valid barcode", "a check digit of 0", "a mistyped last digit", "12 digits", "a letter in the barcode", "14 digits"],
    hints: ["enumerate gives each digit's position, and position % 2 tells you whether its weight is 1 or 3.", "Only positions 0 to 11 go into the total; the digit at position 12 is the one to compare. Count the characters as you go, and stop at anything that is not a digit.", "The outer % 10 matters when total % 10 is 0: then the check digit is 0, not 10."],
    explanation: "One loop counts the characters, stops at a non-digit, adds digit × weight for positions 0 to 11 (weight 1 on even positions, 3 on odd ones) and keeps the last digit. For 4006381333931 the total is 89, and (10 - 9) % 10 is 1, the last digit. Without the outer % 10, a total ending in 0 would ask for a check digit of 10, which can't exist.",
    code: {
      starter: 'barcode = "4006381333931"\n',
      answer: src`
barcode = "4006381333931"
count = 0
all_digits = True
total = 0
last = 0
for position, ch in enumerate(barcode):
    count += 1
    if ch not in "0123456789":
        all_digits = False
        break
    if position < 12:
        weight = 1 if position % 2 == 0 else 3
        total += int(ch) * weight
    last = int(ch)
if not all_digits or count != 13:
    print("Barcode must be 13 digits")
elif (10 - total % 10) % 10 == last:
    print("Valid barcode")
else:
    print("Wrong check digit")
`,
      alternatives: [src`
barcode = "4006381333931"
length = 0
bad = False
total = 0
check = 0
for i, ch in enumerate(barcode):
    length = length + 1
    if ch in "0123456789":
        if i == 12:
            check = int(ch)
        elif i % 2 == 1:
            total = total + int(ch) * 3
        else:
            total = total + int(ch)
    else:
        bad = True
if bad or length != 13:
    print("Barcode must be 13 digits")
elif check == (10 - total % 10) % 10:
    print("Valid barcode")
else:
    print("Wrong check digit")
`],
      wrong: [
        { code: src`
barcode = "4006381333931"
count = 0
all_digits = True
total = 0
last = 0
for position, ch in enumerate(barcode):
    count += 1
    if ch not in "0123456789":
        all_digits = False
        break
    if position < 12:
        weight = 1 if position % 2 == 0 else 3
        total += int(ch) * weight
    last = int(ch)
if not all_digits or count != 13:
    print("Barcode must be 13 digits")
elif 10 - total % 10 == last:
    print("Valid barcode")
else:
    print("Wrong check digit")
`, fails: ["v2"], why: "without the outer % 10, a total ending in 0 asks for a check digit of 10" },
        { code: src`
barcode = "4006381333931"
count = 0
all_digits = True
total = 0
last = 0
for position, ch in enumerate(barcode):
    count += 1
    if ch not in "0123456789":
        all_digits = False
        break
    if position < 12:
        weight = 3 if position % 2 == 0 else 1
        total += int(ch) * weight
    last = int(ch)
if not all_digits or count != 13:
    print("Barcode must be 13 digits")
elif (10 - total % 10) % 10 == last:
    print("Valid barcode")
else:
    print("Wrong check digit")
`, fails: ["output", "v1"], why: "the weights are swapped: position 0 takes weight 1" },
        { code: src`
barcode = "4006381333931"
total = 0
last = 0
for position, ch in enumerate(barcode):
    if position < 12:
        weight = 1 if position % 2 == 0 else 3
        total += int(ch) * weight
    last = int(ch)
if (10 - total % 10) % 10 == last:
    print("Valid barcode")
else:
    print("Wrong check digit")
`, fails: ["v4", "v5", "v6"], why: "the length and the characters are never checked" },
      ],
      task: {
        checks: [
          out("Valid barcode\n"),
          shown("p1", { barcode: "4006381333932" }, "Wrong check digit\n"),
          rerun("v1", { barcode: "8711253001202" }, "Valid barcode\n", { label: "another valid barcode" }),
          rerun("v2", { barcode: "4006381333900" }, "Valid barcode\n", { label: "a check digit of 0" }),
          rerun("v3", { barcode: "9780306406158" }, "Wrong check digit\n", { label: "a mistyped last digit" }),
          rerun("v4", { barcode: "400638133393" }, "Barcode must be 13 digits\n", { label: "12 digits" }),
          rerun("v5", { barcode: "40063813339X1" }, "Barcode must be 13 digits\n", { label: "a letter in the barcode" }),
          rerun("v6", { barcode: "40063813339311" }, "Barcode must be 13 digits\n", { label: "14 digits" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-12",
    version: 2,
    slug: "clinic-booking-slots",
    title: "Which slots get booked?",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["assignment", "whole-number", "string-value", "comparison", "logical", "if-statement", "for-loop", "range-call", "break-statement", "continue-statement", "nested-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "membership"],
    prompt: "A clinic books appointments Monday to Wednesday (`M`, `T`, `W`), from 9 to 12 o'clock. 10 o'clock is the staff meeting, and on Tuesday the clinic closes at 11. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["range(9, 13) gives 9, 10, 11 and 12.", "continue skips one hour; the inner loop carries on with the next hour.", "break on Tuesday leaves only the inner loop. Wednesday still runs."],
    explanation: "Each day walks the hours 9 to 12. 10 is always skipped by continue. On M and W every other hour prints. On T, 9 prints, 10 is skipped, and 11 triggers break, which ends the hours for Tuesday only; the outer loop moves on to W.",
    predict: {
      program: src`
for day in "MTW":
    for hour in range(9, 13):
        if hour == 10:
            continue
        if day == "T" and hour == 11:
            break
        print(day, hour)
`,
      output: "M 9\nM 11\nM 12\nT 9\nW 9\nW 11\nW 12\n",
      wrongPredictions: [
        "M 9\nM 11\nM 12\nT 9",
        "M 9\nM 11\nM 12\nT 9\nT 12\nW 9\nW 11\nW 12",
        "M 9\nM 10\nM 11\nM 12\nT 9\nT 10\nW 9\nW 10\nW 11\nW 12",
      ],
    },
  },
  {
    id: "PY-Q05-13",
    version: 2,
    slug: "vowel-count",
    title: "The vowel counter that talks too much",
    format: "debugging",
    difficulty: "medium",
    minutes: 6,
    requires: ["assignment", "reassignment", "whole-number", "string-value", "arithmetic", "membership", "if-statement", "for-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "logical"],
    prompt: "A subtitle tool counts the vowels in a film title to estimate how long it takes to read aloud. For `The Island at Dawn` it should print one line, `Vowels: 5`. Instead it prints a line for every character, and the last one says 4. Fix both problems.",
    spec: [
      ["Keep", "the `title = ...` line first. Check runs your program again with other titles"],
      ["Prints", "`Vowels: 5`"],
      ["Vowels", "a, e, i, o and u, in small letters or capitals"],
    ],
    hiddenKinds: ["a title with no vowels", "a title in capitals", "a title that starts with a capital vowel", "an empty title"],
    hints: ["Count the vowels in The Island at Dawn by hand. Which one does the program miss?", "The text after in is the set of characters that count. Capitals are different characters.", "Which line decides how many times the result is printed? Look at its indentation."],
    explanation: "\"aeiou\" only contains small letters, so the capital I in Island was never counted; \"aeiouAEIOU\" counts both. The print was indented under the for, so it ran once per character and showed a running count; at the left edge it runs once, after the loop.",
    code: {
      starter: src`
title = "The Island at Dawn"
vowels = 0
for ch in title:
    if ch in "aeiou":
        vowels += 1
    print("Vowels:", vowels)
`,
      answer: src`
title = "The Island at Dawn"
vowels = 0
for ch in title:
    if ch in "aeiouAEIOU":
        vowels += 1
print("Vowels:", vowels)
`,
      alternatives: [src`
title = "The Island at Dawn"
vowels = 0
for ch in title:
    if ch in "aeiou" or ch in "AEIOU":
        vowels = vowels + 1
print("Vowels:", vowels)
`],
      wrong: [
        { code: src`
title = "The Island at Dawn"
vowels = 0
for ch in title:
    if ch in "aeiou":
        vowels += 1
print("Vowels:", vowels)
`, fails: ["output", "p1", "v2", "v3"], why: "it prints once now, but capital vowels are still not counted" },
        { code: src`
title = "The Island at Dawn"
vowels = 0
for ch in title:
    if ch in "aeiouAEIOU":
        vowels += 1
    print("Vowels:", vowels)
`, fails: ["output", "p1", "v1", "v2", "v3", "v4"], why: "capitals count now, but the running count is still printed for every character" },
      ],
      task: {
        checks: [
          out("Vowels: 5\n"),
          shown("p1", { title: "Quiet Orchard" }, "Vowels: 5\n"),
          rerun("v1", { title: "Rhythm" }, "Vowels: 0\n", { label: "a title with no vowels" }),
          rerun("v2", { title: "SILENT KINGDOM" }, "Vowels: 4\n", { label: "a title in capitals" }),
          rerun("v3", { title: "Under Open Skies" }, "Vowels: 6\n", { label: "a title that starts with a capital vowel" }),
          rerun("v4", { title: "" }, "Vowels: 0\n", { label: "an empty title" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-16",
    version: 2,
    slug: "bus-timetable",
    title: "Print a bus timetable",
    format: "integration",
    difficulty: "medium",
    minutes: 10,
    requires: ["assignment", "reassignment", "whole-number", "arithmetic", "precedence", "comparison", "if-statement", "else-clause", "conditional-expr", "for-loop", "range-call", "print-call", "print-text", "print-several", "sep", "unquoted-name", "top-level-indent", "membership", "while-loop"],
    prompt: "A timetable stores times as minutes after midnight: 365 is 6:05. A bus leaves at `first`, then every `gap` minutes, and the last one leaves no later than `last`. Print each departure as hours, a colon and two-digit minutes (`6:05`, `14:30`), then how many buses run.",
    spec: [
      ["First lines", "`first = 365`, `last = 420` and `gap = 20`. Check runs your program again with other timetables"],
      ["Prints", "`6:05`, `6:25`, `6:45`, then `Buses: 3`"],
      ["Format", "hours without a leading zero; minutes always two digits"],
    ],
    hiddenKinds: ["a bus exactly at the last time", "minutes that end in 0", "a single bus", "no buses at all", "times after noon"],
    hints: ["range can count from first to last in steps of gap. Make sure a bus exactly at last is included.", "// 60 gives the hour and % 60 the minutes.", "A minute value under 10 needs a 0 in front of it. Print the parts with no separator."],
    explanation: "range(first, last + 1, gap) produces every departure, including one exactly at last. Each one splits into hours (t // 60) and minutes (t % 60). Minutes under 10 get a \"0\" in front, and sep=\"\" glues the parts together. A counter gives the number of buses, 0 when first is already after last.",
    code: {
      starter: "first = 365\nlast = 420\ngap = 20\n",
      answer: src`
first = 365
last = 420
gap = 20
buses = 0
for t in range(first, last + 1, gap):
    hours = t // 60
    minutes = t % 60
    print(hours, ":", "0" if minutes < 10 else "", minutes, sep="")
    buses += 1
print("Buses:", buses)
`,
      alternatives: [src`
first = 365
last = 420
gap = 20
buses = 0
t = first
while t <= last:
    minutes = t % 60
    if minutes < 10:
        print(t // 60, ":0", minutes, sep="")
    else:
        print(t // 60, ":", minutes, sep="")
    buses = buses + 1
    t = t + gap
print("Buses:", buses)
`],
      wrong: [
        { code: src`
first = 365
last = 420
gap = 20
buses = 0
for t in range(first, last, gap):
    hours = t // 60
    minutes = t % 60
    print(hours, ":", "0" if minutes < 10 else "", minutes, sep="")
    buses += 1
print("Buses:", buses)
`, fails: ["p1", "v1", "v2", "v3"], why: "range stops before last, so a bus exactly at the last time is missing" },
        { code: src`
first = 365
last = 420
gap = 20
buses = 0
for t in range(first, last + 1, gap):
    hours = t // 60
    minutes = t % 60
    print(hours, ":", minutes, sep="")
    buses += 1
print("Buses:", buses)
`, fails: ["output", "p1", "v1", "v2", "v3", "v5"], why: "6:05 is printed as 6:5" },
        { code: src`
first = 365
last = 420
gap = 20
buses = 0
for t in range(first, last + 1, gap):
    hours = t / 60
    minutes = t % 60
    print(hours, ":", "0" if minutes < 10 else "", minutes, sep="")
    buses += 1
print("Buses:", buses)
`, fails: ["output", "p1", "v1", "v2", "v3", "v5"], why: "/ gives a decimal hour such as 6.083333333333333" },
      ],
      task: {
        checks: [
          out("6:05\n6:25\n6:45\nBuses: 3\n"),
          shown("p1", { first: 480, last: 600, gap: 30 }, "8:00\n8:30\n9:00\n9:30\n10:00\nBuses: 5\n"),
          rerun("v1", { first: 361, last: 421, gap: 30 }, "6:01\n6:31\n7:01\nBuses: 3\n", { label: "a bus exactly at the last time" }),
          rerun("v2", { first: 1210, last: 1260, gap: 25 }, "20:10\n20:35\n21:00\nBuses: 3\n", { label: "minutes that end in 0" }),
          rerun("v3", { first: 720, last: 720, gap: 15 }, "12:00\nBuses: 1\n", { label: "a single bus" }),
          rerun("v4", { first: 600, last: 540, gap: 10 }, "Buses: 0\n", { label: "no buses at all" }),
          rerun("v5", { first: 845, last: 900, gap: 50 }, "14:05\n14:55\nBuses: 2\n", { label: "times after noon" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-19",
    version: 2,
    slug: "star-rating-bar",
    title: "A rating bar for any scale",
    format: "refactoring",
    difficulty: "medium",
    minutes: 8,
    requires: ["assignment", "reassignment", "whole-number", "string-value", "arithmetic", "comparison", "if-statement", "else-clause", "for-loop", "range-call", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "membership"],
    prompt: "This program draws a film's rating as stars and dots, but only for a 5-star scale: a separate branch for every rating. The app is moving to a 10-star scale. Rewrite it with a loop so the bar has `max_stars` places, `*` for each star earned and `.` for the rest. For a 5-star scale it must print exactly what it prints now.",
    spec: [
      ["First lines", "`rating = 3` and `max_stars = 5`. Check runs your program again with other ratings and scales"],
      ["Prints", "`Rating: ***..`"],
    ],
    hiddenKinds: ["a rating of 0", "a full rating", "a 10-star scale", "a 1-star scale"],
    hints: ["The starter prints the same shape every time: some stars, then dots, max_stars characters in all.", "Loop over the places of the bar and build the text one character at a time.", "A place gets a star while its number is within the rating."],
    explanation: "The bar has max_stars places. Walking them with range(1, max_stars + 1) and adding \"*\" while the place number is at most the rating, and \".\" otherwise, reproduces every line of the old if chain and works for any scale. The old chain still printed a 5-character bar on a 10-star scale.",
    code: {
      starter: src`
rating = 3
max_stars = 5
if rating == 0:
    print("Rating: .....")
elif rating == 1:
    print("Rating: *....")
elif rating == 2:
    print("Rating: **...")
elif rating == 3:
    print("Rating: ***..")
elif rating == 4:
    print("Rating: ****.")
else:
    print("Rating: *****")
`,
      answer: src`
rating = 3
max_stars = 5
bar = ""
for place in range(1, max_stars + 1):
    if place <= rating:
        bar = bar + "*"
    else:
        bar = bar + "."
print("Rating:", bar)
`,
      alternatives: [src`
rating = 3
max_stars = 5
bar = ""
for n in range(rating):
    bar += "*"
for n in range(max_stars - rating):
    bar += "."
print("Rating:", bar)
`],
      wrong: [
        { code: src`
rating = 3
max_stars = 5
bar = ""
for place in range(max_stars):
    if place <= rating:
        bar = bar + "*"
    else:
        bar = bar + "."
print("Rating:", bar)
`, fails: ["output", "p1", "v1", "v3", "v4"], why: "range starts at 0, so every bar gets one star too many" },
        { code: src`
rating = 3
max_stars = 5
bar = ""
for place in range(1, max_stars + 1):
    if place <= rating:
        bar = bar + "*"
print("Rating:", bar)
`, fails: ["output", "p1", "v1", "v3", "v4"], why: "the dots for the stars not earned are missing" },
      ],
      task: {
        checks: [
          out("Rating: ***..\n"),
          shown("p1", { rating: 7, max_stars: 10 }, "Rating: *******...\n"),
          rerun("v1", { rating: 0 }, "Rating: .....\n", { label: "a rating of 0" }),
          rerun("v2", { rating: 5 }, "Rating: *****\n", { label: "a full rating" }),
          rerun("v3", { rating: 2, max_stars: 10 }, "Rating: **........\n", { label: "a 10-star scale" }),
          rerun("v4", { rating: 0, max_stars: 1 }, "Rating: .\n", { label: "a 1-star scale" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-20",
    version: 2,
    slug: "password-rules",
    title: "Explain why a password is weak",
    format: "validation",
    difficulty: "hard",
    minutes: 12,
    requires: ["assignment", "reassignment", "whole-number", "boolean", "string-value", "arithmetic", "comparison", "logical", "membership", "if-statement", "else-clause", "truthiness", "for-loop", "print-call", "print-text", "unquoted-name", "top-level-indent"],
    prompt: "A sign-up page lists **every** rule a password breaks, so people fix them all at once. The rules: at least 8 characters, at least one digit, at least one capital letter, and no spaces. Print one line per broken rule, in that order, or `Strong` when none is broken.",
    spec: [
      ["First line", "`password = \"sunny day7\"`. Check runs your program again with other passwords"],
      ["Prints", "`Needs a capital letter`, then `No spaces allowed`"],
      ["Messages", "`Too short`, `Needs a digit`, `Needs a capital letter`, `No spaces allowed`"],
      ["Capitals", "the letters in `\"ABCDEFGHIJKLMNOPQRSTUVWXYZ\"`"],
    ],
    hiddenKinds: ["a strong password", "a short password that breaks three rules", "exactly eight characters", "an empty password", "a digit only at the end", "a password that is only spaces"],
    hints: ["Walk the password once and gather facts: how many characters, and whether you have seen a digit, a capital and a space.", "True/False names that start as False and become True when you see something are a good fit.", "After the loop, test each rule on its own, not with elif, because more than one can fail. Keep a count of failures for the Strong line."],
    explanation: "One loop counts the characters and sets has_digit, has_capital and has_space when it meets one. After it, four separate ifs print every broken rule; an elif chain would stop at the first. `\"0123456789\" in password` would be a mistake: it asks whether all ten digits appear in a row.",
    code: {
      starter: 'password = "sunny day7"\n',
      answer: src`
password = "sunny day7"
length = 0
has_digit = False
has_capital = False
has_space = False
for ch in password:
    length += 1
    if ch in "0123456789":
        has_digit = True
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        has_capital = True
    if ch == " ":
        has_space = True
problems = 0
if length < 8:
    print("Too short")
    problems += 1
if not has_digit:
    print("Needs a digit")
    problems += 1
if not has_capital:
    print("Needs a capital letter")
    problems += 1
if has_space:
    print("No spaces allowed")
    problems += 1
if problems == 0:
    print("Strong")
`,
      alternatives: [src`
password = "sunny day7"
length = 0
digits = 0
capitals = 0
spaces = 0
for ch in password:
    length = length + 1
    if ch in "0123456789":
        digits = digits + 1
    elif ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        capitals = capitals + 1
    elif ch == " ":
        spaces = spaces + 1
strong = True
if length < 8:
    print("Too short")
    strong = False
if not digits:
    print("Needs a digit")
    strong = False
if not capitals:
    print("Needs a capital letter")
    strong = False
if spaces:
    print("No spaces allowed")
    strong = False
if strong:
    print("Strong")
`],
      wrong: [
        { code: src`
password = "sunny day7"
length = 0
has_digit = False
has_capital = False
has_space = False
for ch in password:
    length += 1
    if ch in "0123456789":
        has_digit = True
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        has_capital = True
    if ch == " ":
        has_space = True
if length < 8:
    print("Too short")
elif not has_digit:
    print("Needs a digit")
elif not has_capital:
    print("Needs a capital letter")
elif has_space:
    print("No spaces allowed")
else:
    print("Strong")
`, fails: ["output", "v2", "v4", "v6"], why: "elif reports only the first broken rule" },
        { code: src`
password = "sunny day7"
length = 0
has_digit = False
has_capital = False
has_space = False
for ch in password:
    if ch == " ":
        has_space = True
        break
    length += 1
    if ch in "0123456789":
        has_digit = True
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        has_capital = True
problems = 0
if length < 8:
    print("Too short")
    problems += 1
if not has_digit:
    print("Needs a digit")
    problems += 1
if not has_capital:
    print("Needs a capital letter")
    problems += 1
if has_space:
    print("No spaces allowed")
    problems += 1
if problems == 0:
    print("Strong")
`, fails: ["output", "p1"], why: "stopping at the first space skips the rest of the password, so its length and digits are missed" },
        { code: src`
password = "sunny day7"
length = 0
for ch in password:
    length += 1
problems = 0
if length < 8:
    print("Too short")
    problems += 1
if "0123456789" not in password:
    print("Needs a digit")
    problems += 1
if "ABCDEFGHIJKLMNOPQRSTUVWXYZ" not in password:
    print("Needs a capital letter")
    problems += 1
if " " in password:
    print("No spaces allowed")
    problems += 1
if problems == 0:
    print("Strong")
`, fails: ["output", "p1", "v1", "v3", "v5"], why: "in with all ten digits asks whether they appear together in a row, not whether any one of them does" },
      ],
      task: {
        checks: [
          out("Needs a capital letter\nNo spaces allowed\n"),
          walks,
          shown("p1", { password: "Big day 2025" }, "No spaces allowed\n"),
          rerun("v1", { password: "Sunshine7" }, "Strong\n", { label: "a strong password" }),
          rerun("v2", { password: "abc" }, "Too short\nNeeds a digit\nNeeds a capital letter\n", { label: "a short password that breaks three rules" }),
          rerun("v3", { password: "Abcdefg1" }, "Strong\n", { label: "exactly eight characters" }),
          rerun("v4", { password: "" }, "Too short\nNeeds a digit\nNeeds a capital letter\n", { label: "an empty password" }),
          rerun("v5", { password: "QUIETORCHARD9" }, "Strong\n", { label: "a digit only at the end" }),
          rerun("v6", { password: "   " }, "Too short\nNeeds a digit\nNeeds a capital letter\nNo spaces allowed\n", { label: "a password that is only spaces" }),
        ],
      },
    },
  },
  {
    id: "PY-Q05-22",
    version: 2,
    slug: "delivery-streaks",
    title: "Summarise a delivery log",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 12,
    requires: ["assignment", "reassignment", "whole-number", "string-value", "arithmetic", "comparison", "if-statement", "else-clause", "for-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "membership", "nested-condition"],
    prompt: "A courier's week is logged one character per delivery: `O` for on time, `L` for late. Turn the log into a summary: how many were on time, how many were late, and the **longest run** of on-time deliveries in a row.",
    spec: [
      ["First line", "`log = \"OOLOOOLLO\"`. Check runs your program again with other logs"],
      ["Prints", "`On time: 6`, `Late: 3`, then `Longest on-time run: 3`"],
      ["Rule", "an empty log has 0 of everything"],
    ],
    hiddenKinds: ["only late deliveries", "only on-time deliveries", "the longest run at the very end", "alternating deliveries", "an empty log"],
    hints: ["Besides the two counts, keep the length of the current run and the best run so far.", "An O makes the current run one longer; an L ends it, so it starts again from 0.", "Compare the current run with the best one every time it grows, so a run that reaches the end of the log is not lost."],
    explanation: "run grows on every O and goes back to 0 on every L. best is updated whenever run passes it. Updating best only when an L arrives would miss a run that is still going when the log ends, which is why OOOO must give 4.",
    code: {
      starter: 'log = "OOLOOOLLO"\n',
      answer: src`
log = "OOLOOOLLO"
on_time = 0
late = 0
run = 0
best = 0
for ch in log:
    if ch == "O":
        on_time += 1
        run += 1
        if run > best:
            best = run
    else:
        late += 1
        run = 0
print("On time:", on_time)
print("Late:", late)
print("Longest on-time run:", best)
`,
      alternatives: [src`
log = "OOLOOOLLO"
on_time = 0
late = 0
run = 0
best = 0
for ch in log:
    if ch == "L":
        late = late + 1
        if run > best:
            best = run
        run = 0
    else:
        on_time = on_time + 1
        run = run + 1
if run > best:
    best = run
print("On time:", on_time)
print("Late:", late)
print("Longest on-time run:", best)
`],
      wrong: [
        { code: src`
log = "OOLOOOLLO"
on_time = 0
late = 0
run = 0
best = 0
for ch in log:
    if ch == "O":
        on_time += 1
        run += 1
    else:
        late += 1
        if run > best:
            best = run
        run = 0
print("On time:", on_time)
print("Late:", late)
print("Longest on-time run:", best)
`, fails: ["v2", "v3"], why: "best is only updated when a late delivery arrives, so a run at the end of the log is lost" },
        { code: src`
log = "OOLOOOLLO"
on_time = 0
late = 0
run = 0
best = 0
for ch in log:
    if ch == "O":
        on_time += 1
        run += 1
        if run > best:
            best = run
    else:
        late += 1
print("On time:", on_time)
print("Late:", late)
print("Longest on-time run:", best)
`, fails: ["output", "p1", "v3", "v4"], why: "the run never restarts after a late delivery, so it counts all on-time deliveries" },
      ],
      task: {
        checks: [
          out("On time: 6\nLate: 3\nLongest on-time run: 3\n"),
          shown("p1", { log: "OLOOLO" }, "On time: 4\nLate: 2\nLongest on-time run: 2\n"),
          rerun("v1", { log: "LLL" }, "On time: 0\nLate: 3\nLongest on-time run: 0\n", { label: "only late deliveries" }),
          rerun("v2", { log: "OOOO" }, "On time: 4\nLate: 0\nLongest on-time run: 4\n", { label: "only on-time deliveries" }),
          rerun("v3", { log: "LOOOLOOOO" }, "On time: 7\nLate: 2\nLongest on-time run: 4\n", { label: "the longest run at the very end" }),
          rerun("v4", { log: "OLOLO" }, "On time: 3\nLate: 2\nLongest on-time run: 1\n", { label: "alternating deliveries" }),
          rerun("v5", { log: "" }, "On time: 0\nLate: 0\nLongest on-time run: 0\n", { label: "an empty log" }),
        ],
      },
    },
  },
];
