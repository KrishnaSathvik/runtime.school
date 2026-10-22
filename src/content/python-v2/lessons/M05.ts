/**
 * M05 Loops & Iteration: five lessons (PY-L05-01 … PY-L05-05), data F00 (inline values in the style of R01 and R02).
 * for walks the characters of a text or the numbers of a range. Lists, len() and indexing come later, so every
 * loop here works on text, numbers and typed lines, and keeps its results in counters, totals and built-up text.
 *
 * Version 2: rewritten. The challenges are real loop problems (digit sums, masking a card number, compound
 * growth, a sentinel-terminated input loop, seat plans with a step, positions found with enumerate, a PIN check
 * that stops at the first bad character, an average of typed ratings, a pallet grid, repeated characters).
 * Check re-runs every program with other values or other typed lines, so a printed answer can't pass.
 */
import type { PyLesson } from "../model";
import { callsFunction, usesBreak, usesFor, usesNestedLoop, usesWhile } from "../checks";
import { rerun, retyped } from "../beginner-checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected });
const walks = usesFor("walks", "Uses for");
const repeats = usesWhile("repeats", "Uses while");
const counts = callsFunction("counts", "Uses range", "range");
const pairs = callsFunction("pairs", "Uses enumerate", "enumerate");
const leaves = usesBreak("leaves", "Uses break");
const inner = usesNestedLoop("inner", "Uses a loop inside a loop");

export const m05Lessons: PyLesson[] = [
  {
    id: "PY-L05-01",
    version: 2,
    slug: "for-loop",
    title: "Repeat for each character",
    lede: "for runs the same lines once for every character of a text, and a name kept outside the loop collects the result.",
    focus: "Use for to visit each character of a text, and keep a running result in a name set before the loop.",
    minutes: 15,
    objectives: [
      "Write for name in text: and indent the lines that repeat",
      "Keep a count, a total or a piece of text that grows on every pass",
      "Set the starting value before the loop and read the result after it",
    ],
    requires: ["assignment", "reassignment", "string-value", "whole-number", "conversion", "arithmetic", "comparison", "membership", "if-statement", "else-clause", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "conditional-expr", "logical", "nested-condition"],
    teaches: ["for-loop"],
    blocks: [
      { kind: "text", md: "A phone number, a confirmation code and a film title are all text, and text is a row of characters. Plenty of everyday jobs mean looking at **each** character: count the digits in a phone number, add up the digits of a parcel number, hide the digits of a card number.\n\nWriting one `print` per character only works for a text you know in advance. `for` repeats an indented block once for **every** character, however long the text is.\n\n`for ch in code:` reads: take the characters of `code` one at a time, store the current one in `ch`, and run the indented lines. The line ends with a colon, and the lines that repeat are indented under it, just like under an `if`. The next line back at the left edge runs once, after the last pass." },
      {
        kind: "example",
        title: "Read a code out, one character per line",
        code: src`
code = "K7Q2"
for ch in code:
    print("Character:", ch)
print("End of code")
`,
        output: "Character: K\nCharacter: 7\nCharacter: Q\nCharacter: 2\nEnd of code\n",
        note: "Four characters, four passes. ch holds K, then 7, then Q, then 2. code itself never changes. End of code is at the left edge, so it runs once, after the loop.",
      },
      { kind: "text", md: "The loop becomes useful when a name **outside** it keeps a result from pass to pass. This is called an **accumulator**. Give it a starting value **before** the loop, update it **inside**, and read it **after**. `digits = digits + 1` reads the current count and stores one more.\n\nIf the starting line is missing, the very first pass tries to read a name that holds nothing yet:" },
      {
        kind: "error-example",
        title: "Counting with no starting value",
        code: src`
phone = "555-0132"
for ch in phone:
    if ch in "0123456789":
        digits = digits + 1
print(digits)
`,
        error: "NameError",
        output: "",
        note: "On the first pass ch is 5, a digit, so Python evaluates digits + 1. Nothing was ever stored in digits, so the program stops with NameError: name 'digits' is not defined.",
      },
      {
        kind: "example",
        title: "Count the digits in a typed phone number",
        code: src`
phone = "(415) 555-0132"
digits = 0
for ch in phone:
    if ch in "0123456789":
        digits = digits + 1
print("Digits:", digits)
`,
        output: "Digits: 10\n",
        note: "`ch in \"0123456789\"` asks whether this one character is one of the ten digits. Brackets, the space and the dash fail the test and are not counted. A US phone number needs exactly 10 digits, so a form could use this count to reject a typo.",
      },
      { kind: "text", md: "**When to use it:** whenever the answer depends on every character: how many, what total, or a new text built from the old one. If you only need to know whether some piece is in the text, `in` alone answers that without a loop.\n\n**Mistakes to avoid:**\n\n- Putting the starting value **inside** the loop. Then it is reset on every pass, and only the last character counts.\n- Indenting the final `print`. Then it runs on every pass and prints a running total instead of one answer.\n- Forgetting the colon at the end of the `for` line, which is a syntax error." },
    ],
    tryIt: {
      id: "try",
      title: "Count what isn't a digit",
      prompt: "The support team also wants to know how many characters are **not** digits: brackets, spaces and dashes. Change the test so the program counts those instead, and print `Not digits:` and the count.",
      spec: [["Prints", "`Not digits: 4`"]],
      starter: src`
phone = "(415) 555-0132"
digits = 0
for ch in phone:
    if ch in "0123456789":
        digits = digits + 1
print("Digits:", digits)
`,
      answer: src`
phone = "(415) 555-0132"
others = 0
for ch in phone:
    if ch not in "0123456789":
        others = others + 1
print("Not digits:", others)
`,
      alternatives: [src`
phone = "(415) 555-0132"
digits = 0
for ch in phone:
    if ch not in "0123456789":
        digits = digits + 1
print("Not digits:", digits)
`],
      wrong: [{ code: src`
phone = "(415) 555-0132"
digits = 0
for ch in phone:
    if ch in "0123456789":
        digits = digits + 1
print("Not digits:", digits)
`, fails: ["output", "v1"], why: "the label changed, but it still counts the digits" }],
      hints: ["Only the question inside the loop has to change.", "`not in` is True when the piece is missing.", "Keep the count starting at 0 before the loop."],
      task: { checks: [out("Not digits: 4\n"), rerun("v1", { phone: "+1 212 555 0198" }, "Not digits: 4\n", { label: "another phone number" })] },
    },
    challenges: [
      {
        id: "c1",
        title: "Which belt for this parcel?",
        prompt: "A sorting machine adds up the **digits** of a parcel number and ignores the letters and dashes. An even digit sum sends the parcel to belt `A`, an odd one to belt `B`. Print the digit sum, then the belt.",
        spec: [
          ["First line", "`parcel = \"PK-40213\"`. Check runs your program again with other parcel numbers"],
          ["Prints", "`Digit sum: 10`, then `Belt: A`"],
          ["Rule", "a parcel number with no digits has a digit sum of 0, which is even"],
        ],
        starter: 'parcel = "PK-40213"\n',
        answer: src`
parcel = "PK-40213"
total = 0
for ch in parcel:
    if ch in "0123456789":
        total = total + int(ch)
print("Digit sum:", total)
if total % 2 == 0:
    print("Belt: A")
else:
    print("Belt: B")
`,
        alternatives: [src`
parcel = "PK-40213"
total = 0
for ch in parcel:
    if ch in "0123456789":
        total = total + int(ch)
print("Digit sum:", total)
print("Belt:", "A" if total % 2 == 0 else "B")
`],
        wrong: [
          { code: src`
parcel = "PK-40213"
total = 0
for ch in parcel:
    if ch in "0123456789":
        total = total + 1
print("Digit sum:", total)
if total % 2 == 0:
    print("Belt: A")
else:
    print("Belt: B")
`, fails: ["output", "v1", "v2", "v4"], why: "it counts the digits instead of adding up their values" },
          { code: src`
parcel = "PK-40213"
for ch in parcel:
    total = 0
    if ch in "0123456789":
        total = total + int(ch)
print("Digit sum:", total)
if total % 2 == 0:
    print("Belt: A")
else:
    print("Belt: B")
`, fails: ["output", "v1", "v4"], why: "the total is reset on every pass, so only the last character counts" },
          { code: src`
parcel = "PK-40213"
total = 0
for ch in parcel:
    if ch in "0123456789":
        total = total + int(ch)
print("Digit sum:", total)
if total % 2 == 1:
    print("Belt: A")
else:
    print("Belt: B")
`, fails: ["output", "v1", "v2", "v3", "v4"], why: "the belts are swapped" },
        ],
        hints: ["Start a total at 0 before the loop.", "Only digit characters change the total, and each one adds its value, not 1. A character is text until you convert it.", "After the loop, % 2 tells you whether the total is even."],
        task: {
          checks: [
            out("Digit sum: 10\nBelt: A\n"),
            walks,
            rerun("v1", { parcel: "ZX-99107" }, "Digit sum: 26\nBelt: A\n", { label: "another parcel number" }),
            rerun("v2", { parcel: "7" }, "Digit sum: 7\nBelt: B\n", { label: "a single digit" }),
            rerun("v3", { parcel: "RETURNS" }, "Digit sum: 0\nBelt: A\n", { label: "no digits at all" }),
            rerun("v4", { parcel: "00-55-1" }, "Digit sum: 11\nBelt: B\n", { label: "zeros and several dashes" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Hide all but the last four digits",
        prompt: "A receipt shows a card number with every digit replaced by `*` except the **last four digits**. Separators (dashes and spaces) stay where they are. Print `Card:` and the masked number.",
        spec: [
          ["First line", "`card = \"4111-2222-3333-4444\"`. Check runs your program again with other card numbers"],
          ["Prints", "`Card: ****-****-****-4444`"],
          ["Rule", "a number with four digits or fewer is shown unchanged"],
        ],
        starter: 'card = "4111-2222-3333-4444"\n',
        answer: src`
card = "4111-2222-3333-4444"
digits = 0
for ch in card:
    if ch in "0123456789":
        digits = digits + 1
masked = ""
seen = 0
for ch in card:
    if ch in "0123456789":
        seen = seen + 1
        if seen <= digits - 4:
            masked = masked + "*"
        else:
            masked = masked + ch
    else:
        masked = masked + ch
print("Card:", masked)
`,
        alternatives: [src`
card = "4111-2222-3333-4444"
digits = 0
for ch in card:
    if ch in "0123456789":
        digits = digits + 1
to_hide = digits - 4
masked = ""
for ch in card:
    if ch in "0123456789" and to_hide > 0:
        masked = masked + "*"
        to_hide = to_hide - 1
    else:
        masked = masked + ch
print("Card:", masked)
`],
        wrong: [
          { code: src`
card = "4111-2222-3333-4444"
masked = ""
for ch in card:
    if ch in "0123456789":
        masked = masked + "*"
    else:
        masked = masked + ch
print("Card:", masked)
`, fails: ["output", "v1", "v2", "v3", "v4"], why: "every digit is hidden, including the last four" },
          { code: src`
card = "4111-2222-3333-4444"
digits = 0
for ch in card:
    if ch in "0123456789":
        digits = digits + 1
masked = ""
seen = 0
for ch in card:
    if ch in "0123456789":
        seen = seen + 1
        if seen < digits - 4:
            masked = masked + "*"
        else:
            masked = masked + ch
    else:
        masked = masked + ch
print("Card:", masked)
`, fails: ["output", "v1", "v3"], why: "< instead of <= leaves the fifth-last digit showing" },
          { code: src`
card = "4111-2222-3333-4444"
digits = 0
for ch in card:
    if ch in "0123456789":
        digits = digits + 1
masked = ""
seen = 0
for ch in card:
    if ch in "0123456789":
        seen = seen + 1
        if seen <= digits - 4:
            masked = masked + "*"
        else:
            masked = masked + ch
print("Card:", masked)
`, fails: ["output", "v1", "v4"], why: "the dashes and spaces are dropped" },
        ],
        hints: ["You can't tell which digits are the last four until you know how many digits there are. Count them in a first loop.", "In a second loop, count the digits again as you meet them, and build the masked text one character at a time.", "A digit is hidden while it is not one of the last four: compare how many you have seen with the total minus 4."],
        task: {
          checks: [
            out("Card: ****-****-****-4444\n"),
            rerun("v1", { card: "5500 0000 0000 0004" }, "Card: **** **** **** 0004\n", { label: "spaces as separators" }),
            rerun("v2", { card: "1234" }, "Card: 1234\n", { label: "exactly four digits" }),
            rerun("v3", { card: "98765" }, "Card: *8765\n", { label: "five digits" }),
            rerun("v4", { card: "12-3" }, "Card: 12-3\n", { label: "fewer than four digits" }),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: src`
code = "ABC"
result = ""
for ch in code:
    result = ch + result
print(result)
`, choices: ["CBA", "ABC", "C", "A"], answer: 0, why: "Each pass puts the new character in front of what was built so far: A, then BA, then CBA." },
      { id: "q2", prompt: "Someone meant to count the digits. What does this print?", program: src`
phone = "555-0132"
for ch in phone:
    digits = 0
    if ch in "0123456789":
        digits = digits + 1
print(digits)
`, choices: ["1", "7", "0", "It stops with NameError"], answer: 0, why: "digits = 0 is inside the loop, so the count starts again on every pass. On the last pass ch is 2, a digit, so digits ends at 1. Move the starting value above the for line." },
      { id: "q3", prompt: "Which job needs a for loop over the text?", choices: ["Adding up the digits in an order number", "Checking whether an email contains @", "Turning the text \"12\" into the number 12", "Printing a film title once"], answer: 0, why: "A digit sum needs every character. Whether @ is there is one `in` question, and int() converts the whole text at once." },
    ],
    review: [
      "for ch in text: runs the indented lines once per character, with ch holding the current one.",
      "An accumulator starts before the loop, changes inside it, and is read after it.",
      "A reset inside the loop or an indented final print are the usual mistakes. Next: while, for repeats that don't have a fixed count.",
    ],
  },
  {
    id: "PY-L05-02",
    version: 2,
    slug: "while-loop",
    title: "Repeat while a test holds",
    lede: "while repeats as long as its test stays true. Use it when you don't know in advance how many passes it takes.",
    focus: "Repeat with while until a test becomes false, and change what the test looks at inside the loop.",
    minutes: 15,
    objectives: [
      "Write a while loop whose test is checked before every pass",
      "Change the value the test depends on, so the loop can end",
      "Read typed lines in a loop until a stop value arrives",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "input", "conversion", "comparison", "logical", "arithmetic", "precedence", "if-statement", "else-clause", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent"],
    teaches: ["while-loop"],
    blocks: [
      { kind: "text", md: "`for` repeats once per character, so the number of passes is known before it starts. Many repeats aren't like that. *How many weeks until I've saved enough? Ask again until the PIN is right. Keep reading quantities until the packer types 0.* You only know when to stop once you get there.\n\n`while test:` checks the test. If it is true, Python runs the indented lines, then goes back and checks the test **again**. The first time the test is false, the loop ends and the next line at the left edge runs.\n\nA new shorthand helps here. `weeks += 1` means `weeks = weeks + 1`, and `saved += 40` means `saved = saved + 40`. `-=` and `*=` work the same way." },
      {
        kind: "example",
        title: "Weeks to save for a bike",
        code: src`
saved = 0
weeks = 0
while saved < 250:
    saved += 40
    weeks += 1
print("Weeks:", weeks)
print("Saved:", saved)
`,
        output: "Weeks: 7\nSaved: 280\n",
        note: "After 6 weeks saved is 240, still under 250, so the loop runs once more. After week 7 saved is 280 and the test is false. The test is only checked at the top of each pass, so the last pass can go past the goal.",
      },
      { kind: "text", md: "The same shape works with typed lines: ask once before the loop, and ask again at the **end** of each pass. The test then looks at the newest answer." },
      {
        kind: "example",
        title: "Ask until the PIN is right",
        code: src`
pin = input("PIN? ")
tries = 1
while pin != "2580":
    print("Wrong PIN")
    pin = input("PIN? ")
    tries += 1
print("Unlocked after", tries, "tries")
`,
        stdin: "1111\n0000\n2580\n",
        output: "PIN? Wrong PIN\nPIN? Wrong PIN\nPIN? Unlocked after 3 tries\n",
        note: "Three lines were typed: 1111, 0000, 2580. The prompt doesn't end its line, so each message follows a prompt. If the first PIN had been right, the loop body would never run and tries would stay 1.",
      },
      { kind: "text", md: "**When to use it:** `for` when you are walking a text or counting a known number of times; `while` when the stop depends on something that happens during the loop.\n\n**Mistakes to avoid:**\n\n- Never changing what the test looks at. If `saved` never grows, `saved < 250` stays true forever and the program never finishes. (Check stops a program that runs too long.)\n- The off-by-one test: `<` and `<=` differ exactly at the goal. Decide whether reaching the goal is enough.\n- Reading input only once, before the loop. The test then keeps looking at the same old answer." },
    ],
    tryIt: {
      id: "try",
      title: "Save a bit more each week",
      prompt: "Change the weekly saving from 40 to `55`, run it, and see how many weeks it takes now.",
      spec: [["Prints", "`Weeks: 5`, then `Saved: 275`"]],
      starter: src`
saved = 0
weeks = 0
while saved < 250:
    saved += 40
    weeks += 1
print("Weeks:", weeks)
print("Saved:", saved)
`,
      answer: src`
saved = 0
weeks = 0
while saved < 250:
    saved += 55
    weeks += 1
print("Weeks:", weeks)
print("Saved:", saved)
`,
      wrong: [{ code: src`
saved = 0
weeks = 0
while saved < 250:
    saved += 40
    weeks += 1
print("Weeks:", weeks)
print("Saved:", saved)
`, fails: ["output"], why: "still saving 40 a week" }],
      hints: ["Only one number changes.", "It is the amount added on every pass.", "Five weeks of 55 is 275, the first total that reaches 250."],
      task: { checks: [out("Weeks: 5\nSaved: 275\n"), repeats] },
    },
    challenges: [
      {
        id: "c1",
        title: "Years until the savings reach a target",
        prompt: "A savings account earns `rate` percent interest once a year, on the whole balance. Count how many years it takes until the balance is **at least** `target`. If it is already there, that is 0 years.",
        spec: [
          ["First lines", "`balance = 1000`, `rate = 5` and `target = 2000`. Check runs your program again with other accounts"],
          ["Prints", "`Years: 15`"],
          ["Rule", "each year the balance grows by rate percent of itself; reaching the target exactly counts"],
        ],
        starter: "balance = 1000\nrate = 5\ntarget = 2000\n",
        answer: src`
balance = 1000
rate = 5
target = 2000
years = 0
while balance < target:
    balance = balance + balance * rate / 100
    years += 1
print("Years:", years)
`,
        alternatives: [src`
balance = 1000
rate = 5
target = 2000
years = 0
while balance < target:
    balance *= 1 + rate / 100
    years += 1
print("Years:", years)
`],
        wrong: [
          { code: src`
balance = 1000
rate = 5
target = 2000
years = 0
while balance <= target:
    balance = balance + balance * rate / 100
    years += 1
print("Years:", years)
`, fails: ["v2"], why: "a balance that lands exactly on the target gets an extra year" },
          { code: src`
balance = 1000
rate = 5
target = 2000
years = 0
while balance < target:
    balance = balance + rate
    years += 1
print("Years:", years)
`, fails: ["output", "v1", "v2", "v4"], why: "it adds the rate as an amount instead of a percentage of the balance" },
          { code: src`
balance = 1000
rate = 5
target = 2000
years = 0
if balance < target:
    balance = balance + balance * rate / 100
    years += 1
print("Years:", years)
`, fails: ["output", "repeats", "v1", "v4"], why: "an if runs at most once, so it can never count past 1 year" },
        ],
        hints: ["You don't know the number of years in advance, so the loop keeps going while the balance is short of the target.", "Each pass adds one year of interest, a percentage of the current balance, and counts one more year.", "Exactly reaching the target ends the loop, so the test is a strict less-than."],
        task: {
          checks: [
            out("Years: 15\n"),
            repeats,
            rerun("v1", { rate: 10 }, "Years: 8\n", { label: "a higher rate" }),
            rerun("v2", { rate: 100 }, "Years: 1\n", { label: "a balance that reaches the target exactly" }),
            rerun("v3", { balance: 2500 }, "Years: 0\n", { label: "a balance already over the target" }),
            rerun("v4", { balance: 500, rate: 7, target: 600 }, "Years: 3\n", { label: "a small account" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Fill the truck",
        prompt: "A packer types the quantity of each order as it is packed, one line at a time, and types `0` when the shift ends. Count the orders and the units. A truck holds 20 units: then print `Full truck` when the units reached 20 or more, otherwise `Room for` and how many more units fit.",
        spec: [
          ["Typed lines", "`3`, `5`, `2`, then `0`. Check also types other shifts, including one that ends straight away"],
          ["Prints", "`Orders: 3`, `Units: 10`, then `Room for 10 more`"],
          ["Rules", "read each line with `input()` and no prompt; the 0 is not an order"],
        ],
        starter: "",
        answer: src`
qty = int(input())
orders = 0
units = 0
while qty != 0:
    orders += 1
    units += qty
    qty = int(input())
print("Orders:", orders)
print("Units:", units)
if units >= 20:
    print("Full truck")
else:
    print("Room for", 20 - units, "more")
`,
        alternatives: [src`
orders = 0
units = 0
qty = int(input())
while qty > 0:
    orders = orders + 1
    units = units + qty
    qty = int(input())
print("Orders:", orders)
print("Units:", units)
if units < 20:
    print("Room for", 20 - units, "more")
else:
    print("Full truck")
`],
        wrong: [
          { code: src`
qty = int(input())
orders = 1
units = qty
while qty != 0:
    qty = int(input())
    orders += 1
    units += qty
print("Orders:", orders)
print("Units:", units)
if units >= 20:
    print("Full truck")
else:
    print("Room for", 20 - units, "more")
`, fails: ["output", "others", "edges"], why: "the final 0 is counted as an order" },
          { code: src`
qty = int(input())
orders = 0
units = 0
while qty != 0:
    orders += 1
    units += qty
    qty = int(input())
print("Orders:", orders)
print("Units:", units)
if units > 20:
    print("Full truck")
else:
    print("Room for", 20 - units, "more")
`, fails: ["edges"], why: "exactly 20 units fills the truck, but this says there is room for 0 more" },
          { code: src`
qty = int(input())
orders = 0
units = 0
while qty != 0:
    orders += 1
    units = qty
    qty = int(input())
print("Orders:", orders)
print("Units:", units)
if units >= 20:
    print("Full truck")
else:
    print("Room for", 20 - units, "more")
`, fails: ["output", "others", "edges"], why: "units keeps only the last order instead of adding them up" },
        ],
        hints: ["Read the first quantity before the loop, so the test has something to look at.", "Inside the loop, count the order and add its units, then read the next line last.", "The truck message is decided once, after the loop."],
        task: {
          stdin: "3\n5\n2\n0\n",
          checks: [
            out("Orders: 3\nUnits: 10\nRoom for 10 more\n"),
            repeats,
            retyped("others", [
              [["12", "4", "9", "0"], "Orders: 3\nUnits: 25\nFull truck\n"],
              [["1", "1", "1", "1", "0"], "Orders: 4\nUnits: 4\nRoom for 16 more\n"],
            ], "Works for other shifts"),
            retyped("edges", [
              [["0"], "Orders: 0\nUnits: 0\nRoom for 20 more\n"],
              [["10", "10", "0"], "Orders: 2\nUnits: 20\nFull truck\n"],
            ], "Works for an empty shift and exactly 20 units"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: src`
stock = 10
days = 0
while stock > 0:
    stock -= 4
    days += 1
print(days, stock)
`, choices: ["3 -2", "2 2", "3 0", "10 0"], answer: 0, why: "10, 6 and 2 all pass the test, so the loop runs three times: 6, 2, then -2. The test is only checked at the top of a pass, so the last pass can overshoot." },
      { id: "q2", prompt: "A countdown starts with `n = 3` and `while n > 0:`. Under the while, `print(n)` is indented, but `n -= 1` was typed at the left edge. What happens?", choices: ["It prints 3 again and again and never finishes", "It prints 3, 2, 1", "It prints 3 once", "It stops with an error"], answer: 0, why: "Only the indented lines repeat. n stays 3, so n > 0 is true forever. Indent n -= 1 under the while." },
      { id: "q3", prompt: "Which job fits while better than for?", choices: ["Keep asking for a quantity until a valid one is typed", "Print each character of a film title", "Count the digits in a phone number", "Add up the digits of a parcel number"], answer: 0, why: "How many times you have to ask depends on what gets typed. The other jobs walk a text you already have." },
    ],
    review: [
      "while test: checks the test before every pass and stops the first time it is false.",
      "Something inside the loop must change what the test looks at; with input, read again at the end of each pass.",
      "x += 1 is short for x = x + 1. Next: range for counting, and enumerate for positions.",
    ],
  },
  {
    id: "PY-L05-03",
    version: 2,
    slug: "range-and-enumerate",
    title: "Count with range, number with enumerate",
    lede: "range() hands a for loop a run of whole numbers. enumerate() hands it each character together with its position.",
    focus: "Count a known number of times with range, and pair each character with its position using enumerate.",
    minutes: 15,
    objectives: [
      "Count with range(stop), range(start, stop) and range(start, stop, step)",
      "Remember that range stops before its stop number",
      "Report where a character is with enumerate, counting positions from 0",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "arithmetic", "comparison", "membership", "if-statement", "else-clause", "for-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "conditional-expr", "hash-in-text"],
    teaches: ["range-call", "enumerate-call"],
    blocks: [
      { kind: "text", md: "Some loops don't walk a text at all: pay in 4 instalments, print a timetable every 15 minutes. `range` produces the whole numbers a `for` loop needs.\n\n- `range(4)` gives 0, 1, 2, 3. It starts at 0 and stops **before** 4, so it runs exactly 4 times.\n- `range(1, 5)` gives 1, 2, 3, 4: from the first number, stopping before the second.\n- `range(0, 60, 15)` gives 0, 15, 30, 45: the third number is the **step**. A negative step counts down: `range(3, 0, -1)` gives 3, 2, 1.\n\nTo count from 1 up to and including `n`, write `range(1, n + 1)`." },
      {
        kind: "example",
        title: "An instalment plan",
        code: src`
price = 240
months = 4
for month in range(1, months + 1):
    print("Month", month, "pay", price / months)
`,
        output: "Month 1 pay 60.0\nMonth 2 pay 60.0\nMonth 3 pay 60.0\nMonth 4 pay 60.0\n",
        note: "range(1, 5) gives 1, 2, 3 and 4, so there is one line per month. Change months and the plan follows.",
      },
      {
        kind: "error-example",
        title: "Half as many passes",
        code: src`
months = 4
for month in range(months / 2):
    print(month)
`,
        error: "TypeError",
        output: "",
        note: "/ always gives a decimal, here 2.0, and range only accepts whole numbers: TypeError: 'float' object cannot be interpreted as an integer. months // 2 gives the whole number 2.",
      },
      { kind: "text", md: "Walking a text gives you each character, but not **where** it is. `enumerate(text)` gives both on every pass: the position, then the character. Two names go before `in` to receive them: `for position, ch in enumerate(code):`.\n\nPositions start at **0**: the first character is at position 0. That matters when a form tells someone where the problem in their input is." },
      {
        kind: "example",
        title: "Point at the space in a stock code",
        code: src`
sku = "SPO 11681"
for position, ch in enumerate(sku):
    if ch == " ":
        print("Space at position", position)
print("Checked", sku)
`,
        output: "Space at position 3\nChecked SPO 11681\n",
        note: "S, P and O are at positions 0, 1 and 2, so the space is at position 3. Stock codes have a dash there, so this is the character to fix.",
      },
      { kind: "text", md: "**When to use them:** `range` when you know how many times to repeat, or you need the numbers themselves; `enumerate` when you need the position of characters in a text.\n\n**Mistakes to avoid:** `range(1, n)` stops at `n - 1`, one pass short. Positions from `enumerate` start at 0, not 1. And `range` needs whole numbers, so use `//`, not `/`, to compute its arguments." },
    ],
    tryIt: {
      id: "try",
      title: "Pay over six months",
      prompt: "Change the plan to 6 months and run it.",
      spec: [["Prints", "six lines, from `Month 1 pay 40.0` to `Month 6 pay 40.0`"]],
      starter: src`
price = 240
months = 4
for month in range(1, months + 1):
    print("Month", month, "pay", price / months)
`,
      answer: src`
price = 240
months = 6
for month in range(1, months + 1):
    print("Month", month, "pay", price / months)
`,
      wrong: [{ code: src`
price = 240
months = 4
for month in range(1, 7):
    print("Month", month, "pay", price / months)
`, fails: ["output"], why: "six lines, but each payment is still a quarter of the price" }],
      hints: ["The plan reads its length from one name.", "range and the payment both use that name.", "Store 6 in months."],
      task: { checks: [out("Month 1 pay 40.0\nMonth 2 pay 40.0\nMonth 3 pay 40.0\nMonth 4 pay 40.0\nMonth 5 pay 40.0\nMonth 6 pay 40.0\n"), counts] },
    },
    challenges: [
      {
        id: "c1",
        title: "Every other seat",
        prompt: "A cinema row has `seats` seats, numbered from 1. To leave a gap between groups, only seats 1, 3, 5 and so on are sold. Print each seat that can be sold, then how many there are.",
        spec: [
          ["First line", "`seats = 9`. Check runs your program again with other row lengths"],
          ["Prints", "`Seat 1`, `Seat 3`, `Seat 5`, `Seat 7`, `Seat 9`, then `Sellable: 5`"],
        ],
        starter: "seats = 9\n",
        answer: src`
seats = 9
sellable = 0
for seat in range(1, seats + 1, 2):
    print("Seat", seat)
    sellable += 1
print("Sellable:", sellable)
`,
        alternatives: [src`
seats = 9
sellable = 0
for seat in range(1, seats + 1):
    if seat % 2 == 1:
        print("Seat", seat)
        sellable += 1
print("Sellable:", sellable)
`],
        wrong: [
          { code: src`
seats = 9
sellable = 0
for seat in range(1, seats, 2):
    print("Seat", seat)
    sellable += 1
print("Sellable:", sellable)
`, fails: ["output", "v2", "v3"], why: "range stops before seats, so an odd last seat is never sold" },
          { code: src`
seats = 9
sellable = 0
for seat in range(0, seats, 2):
    print("Seat", seat)
    sellable += 1
print("Sellable:", sellable)
`, fails: ["output", "v1", "v2", "v3"], why: "seats are numbered from 1, so there is no seat 0" },
          { code: src`
seats = 9
sellable = seats // 2
for seat in range(1, seats + 1, 2):
    print("Seat", seat)
print("Sellable:", sellable)
`, fails: ["output", "v2", "v3"], why: "half the seats, rounded down, is one short when the row has an odd number" },
        ],
        hints: ["The seat numbers go up in twos from 1.", "range takes a start, a stop that is not included, and a step.", "Count each seat you print in a name that starts at 0."],
        task: {
          checks: [
            out("Seat 1\nSeat 3\nSeat 5\nSeat 7\nSeat 9\nSellable: 5\n"),
            counts,
            rerun("v1", { seats: 10 }, "Seat 1\nSeat 3\nSeat 5\nSeat 7\nSeat 9\nSellable: 5\n", { label: "an even number of seats" }),
            rerun("v2", { seats: 1 }, "Seat 1\nSellable: 1\n", { label: "a single seat" }),
            rerun("v3", { seats: 3 }, "Seat 1\nSeat 3\nSellable: 2\n", { label: "a short row" }),
            rerun("v4", { seats: 0 }, "Sellable: 0\n", { label: "a row with no seats" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Can a screen reader split this hashtag?",
        prompt: "Screen readers read `#SummerFilmFest` as three words because of the capitals; `#summerfilmfest` is read as one long word. Print the position of every capital letter, then `Readable` if there was at least one, otherwise `Add capitals`.",
        spec: [
          ["First line", "`tag = \"#SummerFilmFest\"`. Check runs your program again with other hashtags"],
          ["Prints", "`Capital at 1`, `Capital at 7`, `Capital at 11`, then `Readable`"],
          ["Capitals", "the letters in `\"ABCDEFGHIJKLMNOPQRSTUVWXYZ\"`; the # is at position 0"],
        ],
        starter: 'tag = "#SummerFilmFest"\n',
        answer: src`
tag = "#SummerFilmFest"
capitals = 0
for position, ch in enumerate(tag):
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        print("Capital at", position)
        capitals += 1
if capitals > 0:
    print("Readable")
else:
    print("Add capitals")
`,
        alternatives: [src`
tag = "#SummerFilmFest"
found = False
for i, ch in enumerate(tag):
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        print("Capital at", i)
        found = True
print("Readable" if found else "Add capitals")
`],
        wrong: [
          { code: src`
tag = "#SummerFilmFest"
capitals = 0
for position, ch in enumerate(tag):
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        print("Capital at", position + 1)
        capitals += 1
if capitals > 0:
    print("Readable")
else:
    print("Add capitals")
`, fails: ["output", "v1", "v3"], why: "positions start at 0, so adding 1 points one character too far" },
          { code: src`
tag = "#SummerFilmFest"
capitals = 0
for position, ch in enumerate(tag):
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        print("Capital at", position)
        capitals += 1
    else:
        print("Add capitals")
`, fails: ["output", "v1", "v2", "v3"], why: "the verdict is printed inside the loop, once for every small letter" },
          { code: src`
tag = "#SummerFilmFest"
capitals = 0
for position, ch in enumerate(tag):
    if ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        print("Capital at", position)
print("Readable")
`, fails: ["v2", "v4"], why: "it says Readable even when there are no capitals" },
        ],
        hints: ["enumerate gives you the position and the character together.", "A character is a capital when it is in the string of capital letters.", "The verdict needs to know whether any capital was seen, so keep a count or a True/False name and decide after the loop."],
        task: {
          checks: [
            out("Capital at 1\nCapital at 7\nCapital at 11\nReadable\n"),
            pairs,
            rerun("v1", { tag: "#Up2Date" }, "Capital at 1\nCapital at 4\nReadable\n", { label: "a hashtag with a digit" }),
            rerun("v2", { tag: "#movienight" }, "Add capitals\n", { label: "no capitals at all" }),
            rerun("v3", { tag: "#A" }, "Capital at 1\nReadable\n", { label: "a single capital" }),
            rerun("v4", { tag: "#" }, "Add capitals\n", { label: "just the #" }),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: src`
for n in range(10, 0, -3):
    print(n)
`, choices: ["10\n7\n4\n1", "10\n7\n4\n1\n-2", "10\n7\n4", "0\n3\n6\n9"], answer: 0, why: "The step is -3, so it counts down from 10. The next number after 1 would be -2, which is past the stop of 0, so it isn't produced." },
      { id: "q2", prompt: "A plan has 3 payments. What does this print?", program: src`
for payment in range(1, 3):
    print("Payment", payment)
`, choices: ["Payment 1\nPayment 2", "Payment 1\nPayment 2\nPayment 3", "Payment 0\nPayment 1\nPayment 2", "Payment 1\nPayment 3"], answer: 0, why: "range stops before 3, so the third payment is missing. range(1, 4), or range(1, payments + 1), includes it." },
      { id: "q3", prompt: "A form must say where the first space in a username is. Which tool gives you the position?", choices: ["enumerate", "range with a step", "while with input()", "int()"], answer: 0, why: "enumerate pairs each character with its position as it walks the text." },
    ],
    review: [
      "range(stop), range(start, stop) and range(start, stop, step) give whole numbers and stop before stop.",
      "range(1, n + 1) counts from 1 to n. Its arguments must be whole numbers.",
      "enumerate(text) gives the position, from 0, and the character. Next: leaving a loop early with break, and skipping a pass with continue.",
    ],
  },
  {
    id: "PY-L05-04",
    version: 2,
    slug: "break-and-continue",
    title: "Stop early, or skip one",
    lede: "break leaves the loop the moment you have your answer. continue skips the rest of this pass and moves on to the next.",
    focus: "Leave a loop early with break, and skip one pass with continue.",
    minutes: 15,
    objectives: [
      "Stop a loop with break as soon as the answer is known",
      "Skip values you don't want with continue",
      "Use while True with a break when the stop is decided inside the loop",
    ],
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "string-value", "input", "conversion", "none-value", "identity", "arithmetic", "comparison", "logical", "membership", "if-statement", "else-clause", "truthiness", "for-loop", "while-loop", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "boolean", "nested-condition", "range-call"],
    teaches: ["break-statement", "continue-statement"],
    blocks: [
      { kind: "text", md: "Often you can stop before the end. Looking for the first bad character in a PIN? Once you've found it, the rest doesn't matter. Other times one value should simply be skipped: a blank line in a stream of barcodes.\n\n- `break` leaves the loop **immediately**. No more passes run, and the program continues at the first line after the loop.\n- `continue` ends **this pass** only. The loop goes straight on to the next character, number or test.\n\nBoth almost always sit inside an `if`, because you only want to stop or skip in some cases." },
      {
        kind: "example",
        title: "Keep the order id, drop the parcel number",
        code: src`
ref = "O104839-2"
order = ""
for ch in ref:
    if ch == "-":
        break
    order = order + ch
print("Order:", order)
`,
        output: "Order: O104839\n",
        note: "Parcel references are an order id, a dash, then the parcel number. At the dash, break ends the loop, so neither the dash nor the 2 is added. Without break, the loop would carry on to the end of the text.",
      },
      { kind: "text", md: "`while True:` is a loop whose test can never be false. It looks endless, but a `break` inside it ends it. Use it when the decision to stop can only be made **in the middle** of a pass, after reading a line, for example." },
      {
        kind: "example",
        title: "Scan barcodes until done",
        code: src`
scanned = 0
while True:
    code = input()
    if code == "done":
        break
    if code == "":
        continue
    scanned += 1
    print("Scanned", code)
print("Total scanned:", scanned)
`,
        stdin: "SPO-11681\n\nHOM-22847\ndone\n",
        output: "Scanned SPO-11681\nScanned HOM-22847\nTotal scanned: 2\n",
        note: "The blank line skips the rest of its pass, so it isn't counted. done ends the loop. Then the total prints, once.",
      },
      { kind: "text", md: "**When to use them:** `break` when the answer is known before the end (the first match, a stop word); `continue` when some values should be ignored and the rest handled normally.\n\n**Mistakes to avoid:**\n\n- `continue` in a `while` loop before the line that moves it along (`n += 1`). The skipped pass never changes `n`, so the loop never ends.\n- Lines after `break` in the same block never run. Do what has to be done before breaking.\n- `break` is not `continue`: one stops the whole loop, the other only this pass." },
    ],
    tryIt: {
      id: "try",
      title: "A different separator",
      prompt: "The warehouse now writes parcel references with a slash, like `O104839/2`. Change the program so it still keeps only the order id.",
      spec: [["Prints", "`Order: O104839`"]],
      starter: src`
ref = "O104839/2"
order = ""
for ch in ref:
    if ch == "-":
        break
    order = order + ch
print("Order:", order)
`,
      answer: src`
ref = "O104839/2"
order = ""
for ch in ref:
    if ch == "/":
        break
    order = order + ch
print("Order:", order)
`,
      wrong: [{ code: src`
ref = "O104839/2"
order = ""
for ch in ref:
    if ch == "/":
        continue
    order = order + ch
print("Order:", order)
`, fails: ["output", "leaves"], why: "continue skips the slash but keeps the parcel number" }],
      hints: ["The loop stops at the separator.", "Only the character it compares with has to change.", "Keep break: you want to stop, not skip."],
      task: { checks: [out("Order: O104839\n"), leaves] },
    },
    challenges: [
      {
        id: "c1",
        title: "Check a PIN",
        prompt: "A PIN must be exactly 4 digits. Walk the PIN and stop at the **first** character that is not a digit; then print `Not a digit:` and that character. If every character is a digit, print `PIN OK` for exactly 4 digits, otherwise `PIN needs 4 digits, not` and the count.",
        spec: [
          ["First line", "`pin = \"40a7\"`. Check runs your program again with other PINs"],
          ["Prints", "`Not a digit: a`"],
          ["Rule", "with several bad characters, report the first one"],
        ],
        starter: 'pin = "40a7"\n',
        answer: src`
pin = "40a7"
digits = 0
bad = None
for ch in pin:
    if ch not in "0123456789":
        bad = ch
        break
    digits += 1
if bad is not None:
    print("Not a digit:", bad)
elif digits == 4:
    print("PIN OK")
else:
    print("PIN needs 4 digits, not", digits)
`,
        alternatives: [src`
pin = "40a7"
count = 0
problem = ""
for ch in pin:
    if ch in "0123456789":
        count = count + 1
    else:
        problem = ch
        break
if problem:
    print("Not a digit:", problem)
elif count != 4:
    print("PIN needs 4 digits, not", count)
else:
    print("PIN OK")
`],
        wrong: [
          { code: src`
pin = "40a7"
digits = 0
bad = None
for ch in pin:
    if ch not in "0123456789":
        bad = ch
        continue
    digits += 1
if bad is not None:
    print("Not a digit:", bad)
elif digits == 4:
    print("PIN OK")
else:
    print("PIN needs 4 digits, not", digits)
`, fails: ["leaves", "v3"], why: "without break the loop carries on, so the last bad character is reported, not the first" },
          { code: src`
pin = "40a7"
digits = 0
bad = None
for ch in pin:
    if ch not in "0123456789":
        bad = ch
        break
    digits += 1
if bad is not None:
    print("Not a digit:", bad)
elif digits >= 4:
    print("PIN OK")
else:
    print("PIN needs 4 digits, not", digits)
`, fails: ["v4"], why: "a PIN that is too long is accepted" },
          { code: src`
pin = "40a7"
digits = 0
for ch in pin:
    if ch not in "0123456789":
        print("Not a digit:", ch)
        break
    digits += 1
if digits == 4:
    print("PIN OK")
else:
    print("PIN needs 4 digits, not", digits)
`, fails: ["output", "v3"], why: "after a bad character it also prints the length message" },
        ],
        hints: ["Keep the bad character in a name that starts as None; that also tells you afterwards whether one was found.", "Count digits as you go, and leave the loop the moment a character is not a digit.", "After the loop there are three outcomes. Check the bad character first."],
        task: {
          checks: [
            out("Not a digit: a\n"),
            leaves,
            rerun("v1", { pin: "2580" }, "PIN OK\n", { label: "a good PIN" }),
            rerun("v2", { pin: "12" }, "PIN needs 4 digits, not 2\n", { label: "too few digits" }),
            rerun("v3", { pin: "9x9y" }, "Not a digit: x\n", { label: "two bad characters" }),
            rerun("v4", { pin: "12345" }, "PIN needs 4 digits, not 5\n", { label: "too many digits" }),
            rerun("v5", { pin: "" }, "PIN needs 4 digits, not 0\n", { label: "nothing typed" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Average of typed ratings",
        prompt: "After a screening, staff type each audience rating on its own line and type `done` at the end. Blank lines are typos: skip them. Ratings outside 1 to 5 are mistakes: skip them too. Print how many ratings counted and their average, or `No ratings` when none counted.",
        spec: [
          ["Typed lines", "`4`, `5`, a blank line, `3`, `done`. Check also types other sessions"],
          ["Prints", "`Ratings: 3`, then `Average: 4.0`"],
          ["Rules", "read with `input()` and no prompt; stop at `done`"],
        ],
        starter: "",
        answer: src`
total = 0
count = 0
while True:
    entry = input()
    if entry == "done":
        break
    if entry == "":
        continue
    rating = int(entry)
    if rating < 1 or rating > 5:
        continue
    total += rating
    count += 1
if count > 0:
    print("Ratings:", count)
    print("Average:", total / count)
else:
    print("No ratings")
`,
        alternatives: [src`
total = 0
count = 0
while True:
    entry = input()
    if entry == "done":
        break
    if entry:
        rating = int(entry)
        if rating >= 1 and rating <= 5:
            total = total + rating
            count = count + 1
if count:
    print("Ratings:", count)
    print("Average:", total / count)
else:
    print("No ratings")
`],
        wrong: [
          { code: src`
total = 0
count = 0
while True:
    entry = input()
    if entry == "done":
        break
    if entry == "":
        continue
    rating = int(entry)
    total += rating
    count += 1
if count > 0:
    print("Ratings:", count)
    print("Average:", total / count)
else:
    print("No ratings")
`, fails: ["edges"], why: "ratings outside 1 to 5 are counted" },
          { code: src`
total = 0
count = 0
while True:
    entry = input()
    if entry == "done":
        break
    if entry == "":
        continue
    rating = int(entry)
    if rating < 1 or rating > 5:
        continue
    total += rating
    count += 1
print("Ratings:", count)
print("Average:", total / count)
`, fails: ["edges"], why: "with no ratings it divides by zero" },
          { code: src`
total = 0
count = 0
while True:
    entry = input()
    if entry == "done":
        break
    if entry == "":
        break
    rating = int(entry)
    if rating < 1 or rating > 5:
        continue
    total += rating
    count += 1
if count > 0:
    print("Ratings:", count)
    print("Average:", total / count)
else:
    print("No ratings")
`, fails: ["output", "others"], why: "a blank line ends the session instead of being skipped" },
        ],
        hints: ["while True with a break at done lets you stop in the middle of a pass.", "continue skips a blank line, and skips a number outside 1 to 5 once it has been converted.", "Only divide when at least one rating counted."],
        task: {
          stdin: "4\n5\n\n3\ndone\n",
          checks: [
            out("Ratings: 3\nAverage: 4.0\n"),
            leaves,
            retyped("others", [
              [["2", "", "", "3", "done"], "Ratings: 2\nAverage: 2.5\n"],
              [["1", "2", "2", "done"], "Ratings: 3\nAverage: 1.6666666666666667\n"],
            ], "Works for other sessions"),
            retyped("edges", [
              [["done"], "No ratings\n"],
              [["0", "6", "4", "done"], "Ratings: 1\nAverage: 4.0\n"],
              [["9", "done"], "No ratings\n"],
            ], "Works with no ratings and with ratings out of range"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: src`
total = 0
for n in range(1, 10):
    if n % 4 == 0:
        break
    if n % 2 == 0:
        continue
    total += n
print(total)
`, choices: ["4", "1", "6", "25"], answer: 0, why: "1 is added. 2 is even, so it is skipped. 3 is added, making 4. At 4, n % 4 == 0, so break ends the loop before anything else is added." },
      { id: "q2", prompt: "n starts at 0. Inside `while n < 5:` the body is: `if n == 2: continue`, then `print(n)`, then `n += 1`. What happens?", choices: ["It prints 0 and 1, then never finishes", "It prints 0, 1, 3, 4", "It prints 0 and 1, then stops", "It prints 0 to 4"], answer: 0, why: "When n is 2, continue skips n += 1, so n stays 2 and the same pass repeats forever. Move the update above the continue, or use a for loop over a range." },
      { id: "q3", prompt: "You need to know whether a code contains any space. Once you find one, which statement fits?", choices: ["break", "continue", "else", "pass"], answer: 0, why: "The answer is known at the first space, so there is no reason to look at the rest." },
    ],
    review: [
      "break leaves the loop at once; the line after the loop runs next.",
      "continue skips the rest of this pass; in a while loop, make sure the loop still moves on.",
      "while True with a break stops in the middle of a pass. Next: a loop inside a loop.",
    ],
  },
  {
    id: "PY-L05-05",
    version: 2,
    slug: "nested-loops",
    title: "A loop inside a loop",
    lede: "For each pass of the outer loop, the inner loop runs all the way through. That gives you grids, combinations and every pair.",
    focus: "Put a loop inside a loop for rows and columns, every combination, or every pair.",
    minutes: 15,
    objectives: [
      "Indent a second loop under the first and see it restart on every outer pass",
      "Build one line of a grid per outer pass",
      "Compare every character with every other one",
    ],
    requires: ["assignment", "reassignment", "whole-number", "string-value", "conversion", "arithmetic", "comparison", "logical", "membership", "if-statement", "else-clause", "truthiness", "for-loop", "range-call", "enumerate-call", "break-statement", "print-call", "print-text", "print-several", "print-blank", "end", "unquoted-name", "top-level-indent", "boolean", "conditional-expr", "hash-in-text", "nested-condition"],
    teaches: ["nested-loop"],
    blocks: [
      { kind: "text", md: "Some results have two directions: rows **and** seats in a cinema, sizes **and** colours of a T-shirt. Put one `for` inside another. For **each** pass of the outer loop, the inner loop starts again from its beginning and runs all the way through. 3 rows with 4 seats each means the inner body runs 3 × 4 = 12 times.\n\nIndentation shows which loop a line belongs to. A line under the inner `for` runs for every seat. A line under the outer `for`, after the inner loop, runs once per row: the place to finish a row." },
      {
        kind: "example",
        title: "A seat map",
        code: src`
for row in "ABC":
    for seat in range(1, 5):
        print(row + str(seat), end=" ")
    print()
`,
        output: "A1 A2 A3 A4 \nB1 B2 B3 B4 \nC1 C2 C3 C4 \n",
        note: "end=\" \" keeps the seats of one row on one line. The empty print() is indented under the outer loop only, so it runs once per row and ends that row's line.",
      },
      {
        kind: "example",
        title: "Every size with every colour",
        code: src`
variants = 0
for size in "SML":
    for colour in "RB":
        print("TEE-" + size + "-" + colour)
        variants += 1
print(variants, "variants")
`,
        output: "TEE-S-R\nTEE-S-B\nTEE-M-R\nTEE-M-B\nTEE-L-R\nTEE-L-B\n6 variants\n",
        note: "A shop needs one stock code for each combination. S is paired with both colours before M starts. The counter is set once, before both loops, so it counts all 6.",
      },
      { kind: "text", md: "**When to use it:** grids, every combination of two things, or comparing every character with every other one.\n\n**Mistakes to avoid:**\n\n- A value that should carry over between rows (a running count) must be set **before the outer loop**. Set it inside the outer loop and it restarts for every row.\n- `break` inside the inner loop only leaves the **inner** loop. The outer loop carries on with its next pass.\n- The work grows fast: 1,000 × 1,000 is a million passes." },
    ],
    tryIt: {
      id: "try",
      title: "Add row D",
      prompt: "The cinema adds a fourth row, D. Change the seat map so it has rows A to D.",
      spec: [["Prints", "the map with a fourth line, `D1 D2 D3 D4 `"]],
      starter: src`
for row in "ABC":
    for seat in range(1, 5):
        print(row + str(seat), end=" ")
    print()
`,
      answer: src`
for row in "ABCD":
    for seat in range(1, 5):
        print(row + str(seat), end=" ")
    print()
`,
      wrong: [{ code: src`
for row in "ABC":
    for seat in range(1, 6):
        print(row + str(seat), end=" ")
    print()
`, fails: ["output"], why: "that adds a fifth seat to each row, not a fourth row" }],
      hints: ["The rows come from the outer loop.", "The outer loop walks the row letters.", "Add D to that text."],
      task: { checks: [out("A1 A2 A3 A4 \nB1 B2 B3 B4 \nC1 C2 C3 C4 \nD1 D2 D3 D4 \n"), inner] },
    },
    challenges: [
      {
        id: "c1",
        title: "Load a pallet",
        prompt: "A pallet has `rows` rows of `cols` spaces. Boxes are placed row by row from the top left. Print one line per row: `#` for a space with a box, `.` for an empty space. Then print how many boxes didn't fit.",
        spec: [
          ["First lines", "`rows = 2`, `cols = 4` and `boxes = 5`. Check runs your program again with other pallets"],
          ["Prints", "`####`, then `#...`, then `Left over: 0`"],
        ],
        starter: "rows = 2\ncols = 4\nboxes = 5\n",
        answer: src`
rows = 2
cols = 4
boxes = 5
placed = 0
for r in range(rows):
    line = ""
    for c in range(cols):
        if placed < boxes:
            line = line + "#"
            placed += 1
        else:
            line = line + "."
    print(line)
print("Left over:", boxes - placed)
`,
        alternatives: [src`
rows = 2
cols = 4
boxes = 5
left = boxes
for r in range(rows):
    line = ""
    for c in range(cols):
        if left > 0:
            line += "#"
            left -= 1
        else:
            line += "."
    print(line)
print("Left over:", left)
`],
        wrong: [
          { code: src`
rows = 2
cols = 4
boxes = 5
for r in range(rows):
    placed = 0
    line = ""
    for c in range(cols):
        if placed < boxes:
            line = line + "#"
            placed += 1
        else:
            line = line + "."
    print(line)
print("Left over:", boxes - placed)
`, fails: ["output", "v1", "v3"], why: "placed restarts for every row, so each row is filled again from the full count" },
          { code: src`
rows = 2
cols = 4
boxes = 5
placed = 0
for r in range(rows):
    line = ""
    for c in range(cols):
        if placed < boxes:
            line = line + "#"
            placed += 1
        else:
            line = line + "."
    print(line)
print("Left over:", boxes - rows * cols)
`, fails: ["output", "v2", "v3"], why: "boxes minus the number of spaces is negative when the pallet isn't full" },
          { code: src`
rows = 2
cols = 4
boxes = 5
placed = 0
for r in range(rows):
    line = ""
    for c in range(cols):
        if placed < boxes:
            line = line + "#"
            placed += 1
        else:
            line = line + "."
        print(line)
print("Left over:", boxes - placed)
`, fails: ["output", "v1", "v2", "v4"], why: "print is inside the inner loop, so every half-built row is printed" },
        ],
        hints: ["The row text starts empty for each row and grows one space at a time.", "The number of boxes placed so far must carry over from one row to the next, so it starts before both loops.", "Print a row after its inner loop has finished."],
        task: {
          checks: [
            out("####\n#...\nLeft over: 0\n"),
            inner,
            rerun("v1", { boxes: 10 }, "####\n####\nLeft over: 2\n", { label: "more boxes than spaces" }),
            rerun("v2", { boxes: 0 }, "....\n....\nLeft over: 0\n", { label: "no boxes" }),
            rerun("v3", { rows: 3, cols: 1, boxes: 2 }, "#\n#\n.\nLeft over: 0\n", { label: "a pallet one space wide" }),
            rerun("v4", { rows: 1, cols: 3, boxes: 3 }, "###\nLeft over: 0\n", { label: "exactly full" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Repeated characters in a voucher code",
        prompt: "Voucher codes must not repeat a character, because `0` and `O` repeats confuse customers on the phone. Compare every character with every **later** one. Print each repeat as `Repeat:`, the character, `at`, the first position, `and`, the second. Finish with `Code rejected` if there was any repeat, otherwise `All different`.",
        spec: [
          ["First line", "`code = \"SAVE2024\"`. Check runs your program again with other codes"],
          ["Prints", "`Repeat: 2 at 4 and 6`, then `Code rejected`"],
          ["Order", "by the first position, then the second"],
        ],
        starter: 'code = "SAVE2024"\n',
        answer: src`
code = "SAVE2024"
repeats = 0
for i, a in enumerate(code):
    for j, b in enumerate(code):
        if i < j and a == b:
            print("Repeat:", a, "at", i, "and", j)
            repeats += 1
if repeats:
    print("Code rejected")
else:
    print("All different")
`,
        alternatives: [src`
code = "SAVE2024"
found = False
for i, a in enumerate(code):
    for j, b in enumerate(code):
        if j > i:
            if a == b:
                print("Repeat:", a, "at", i, "and", j)
                found = True
print("Code rejected" if found else "All different")
`],
        wrong: [
          { code: src`
code = "SAVE2024"
repeats = 0
for i, a in enumerate(code):
    for j, b in enumerate(code):
        if i != j and a == b:
            print("Repeat:", a, "at", i, "and", j)
            repeats += 1
if repeats:
    print("Code rejected")
else:
    print("All different")
`, fails: ["output", "v1", "v4"], why: "each pair is reported twice, once in each order" },
          { code: src`
code = "SAVE2024"
repeats = 0
for i, a in enumerate(code):
    for j, b in enumerate(code):
        if a == b:
            print("Repeat:", a, "at", i, "and", j)
            repeats += 1
if repeats:
    print("Code rejected")
else:
    print("All different")
`, fails: ["output", "v1", "v2", "v4"], why: "every character is compared with itself, so every code is rejected" },
          { code: src`
code = "SAVE2024"
repeats = 0
for i, a in enumerate(code):
    for j, b in enumerate(code):
        if i < j and a == b:
            print("Repeat:", a, "at", i, "and", j)
            repeats += 1
            break
if repeats:
    print("Code rejected")
else:
    print("All different")
`, fails: ["v4"], why: "break stops after the first later match, so a character used three times misses a pair" },
        ],
        hints: ["Walk the code twice, one loop inside the other, with enumerate in both so you have positions.", "A pair counts only when the second position is after the first and the characters are the same.", "Count the repeats, and print the verdict after both loops."],
        task: {
          checks: [
            out("Repeat: 2 at 4 and 6\nCode rejected\n"),
            inner,
            rerun("v1", { code: "ABAB" }, "Repeat: A at 0 and 2\nRepeat: B at 1 and 3\nCode rejected\n", { label: "two repeated characters" }),
            rerun("v2", { code: "BFCM25" }, "All different\n", { label: "no repeats" }),
            rerun("v3", { code: "" }, "All different\n", { label: "an empty code" }),
            rerun("v4", { code: "XAXX" }, "Repeat: X at 0 and 2\nRepeat: X at 0 and 3\nRepeat: X at 2 and 3\nCode rejected\n", { label: "a character used three times" }),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: src`
for a in range(1, 4):
    for b in range(a):
        print(a, b)
`, choices: ["1 0\n2 0\n2 1\n3 0\n3 1\n3 2", "1 0\n2 1\n3 2", "1 1\n2 2\n3 3", "0 0\n1 0\n1 1\n2 0\n2 1\n2 2"], answer: 0, why: "The inner range depends on a: 1 pass when a is 1, 2 when a is 2, 3 when a is 3. Each inner loop starts at 0." },
      { id: "q2", prompt: "What does this print?", program: src`
for row in "AB":
    for seat in "123":
        if seat == "2":
            break
        print(row + seat)
print("done")
`, choices: ["A1\nB1\ndone", "A1\ndone", "A1\nA3\nB1\nB3\ndone", "A1\nB1"], answer: 0, why: "break leaves only the inner loop. The outer loop goes on to row B, which prints B1 before its own break." },
      { id: "q3", prompt: "An outer loop walks 3 rows and an inner loop walks 4 seats. How many times does a line inside the inner loop run?", choices: ["12", "7", "4", "3"], answer: 0, why: "The inner loop runs all 4 passes for each of the 3 outer passes: 3 × 4." },
    ],
    review: [
      "The inner loop restarts and runs completely on every pass of the outer loop.",
      "Indentation decides whether a line runs per inner pass, per outer pass, or once at the end.",
      "break only leaves the loop it is in. Next module: strings and text, with indexes, slices and methods.",
    ],
  },
];
