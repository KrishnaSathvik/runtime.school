import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const iteratingOverStringsAndLists: PyLesson = {
  slug: "iterating-over-strings-and-lists",
  ref: "python:iterating-over-strings-and-lists",
  module: "loops",
  number: 3,
  title: "Iterating over strings and lists",
  level: "beginner",
  summary:
    "Loop directly over the characters of a string or the items of a list, filter them with `if`, and build up a result: a count, a total, or a new string.",

  sections: [
    {
      label: "looping over the values themselves",
      blocks: [
        {
          kind: "p",
          text: "`for` works with any sequence, not just `range()`. Over a string, the loop variable is each **character** in turn; over a list, each **item**. You don't need positions at all: `for ch in word:` reads as “for each character in the word”.",
        },
        { kind: "code", code: 'for ch in "Hi!":\n    print(ch)\n\nfor price in [4.5, 12.0, 3.25]:\n    print(price)' },
        {
          kind: "p",
          text: "A **list** is written in square brackets with commas between the items. You met lists as the result of `split()`; here you can write them yourself. Collections and Records covers changing lists; looping over one needs nothing more than this.",
        },
      ],
    },
    {
      label: "filtering and building",
      blocks: [
        {
          kind: "p",
          text: "Combine the loop with the accumulator pattern and an `if` to keep only some values: count the vowels in a sentence, add up only the positive payments, or build a new string that keeps just the digits.",
        },
        { kind: "code", code: 'digits = ""\nfor ch in "(020) 7946-0018":\n    if ch.isdigit():\n        digits += ch\nprint(digits)    # 02079460018' },
        {
          kind: "p",
          text: "`+=` on a string adds characters to the end. The string isn't changed in place; each `+=` makes a new, longer string and gives it the same name.",
        },
      ],
    },
    {
      label: "naming the loop variable",
      blocks: [
        {
          kind: "p",
          text: "Name the loop variable after one item of what you're looping over: `for price in prices:`, `for name in names:`, `for ch in text:`. A plural list name and a singular loop variable make the code read like a sentence.",
        },
      ],
    },
  ],

  example: {
    caption: "Counting vowels and keeping digits. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'text = "Order 66 shipped on day 14"\nvowels = 0\ndigits = ""\nfor ch in text.lower():\n    if ch in "aeiou":\n        vowels += 1\n    elif ch.isdigit():\n        digits += ch\nprint("Vowels:", vowels)\nprint("Digits:", digits)',
  },

  walkthrough: [
    {
      title: "Each character in turn",
      text: "The loop variable holds one character per iteration, including the space.",
      code: 'for ch in "Ab c":\n    print(repr(ch))',
    },
    {
      title: "Each item of a list",
      text: "Looping over a list visits its items in order. The accumulator adds them up.",
      code: "prices = [4.5, 12.0, 3.25]\ntotal = 0\nfor price in prices:\n    total += price\nprint(total)\nprint(len(prices), \"items\")",
    },
    {
      title: "Filtering with if",
      text: "Only positive payments are added; the others are counted as rejected.",
      code: "payments = [20, -5, 0, 35]\naccepted = 0\nrejected = 0\nfor amount in payments:\n    if amount > 0:\n        accepted += amount\n    else:\n        rejected += 1\nprint(accepted, rejected)",
    },
    {
      title: "Building a new string",
      text: "Each character that passes the test is added to the end of `initials`.",
      code: 'name = "ada king lovelace"\ninitials = ""\nfor word in name.split():\n    initials += word[0].upper()\nprint(initials)',
    },
  ],

  mistakes: [
    {
      title: "Changing the loop variable to change the list",
      text: "`price` is a copy of each value, so doubling it changes nothing in `prices`.",
      code: "prices = [4, 10]\nfor price in prices:\n    price = price * 2\nprint(prices)",
      fix: "To get changed values, build a new result, such as a total, a string, or (in Collections and Records) a new list.",
    },
    {
      title: "Comparing characters without normalising case",
      text: "Only lowercase vowels are counted, so the capital `A` and `E` are missed.",
      code: 'count = 0\nfor ch in "An Example":\n    if ch in "aeiou":\n        count += 1\nprint(count)',
      fix: "Loop over `text.lower()` (or test `ch.lower()`).",
    },
    {
      title: "Looping over a number",
      text: "An int isn't a sequence: `for` needs something to step through, so this is a `TypeError`.",
      code: "count = 3\nfor n in count:\n    print(n)",
      raises: "TypeError",
      fix: "Use `range(count)` to repeat a number of times.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Count vowels",
      prompt:
        "Count the vowels (a, e, i, o, u, in either case) in `text` and store the number in `vowels`. Print it as shown. Check answer tries other text, including an empty string.",
      expectedOutput: "Vowels: 5\n",
      looksFor: [
        "`vowels` counts every a, e, i, o and u, capital or not.",
        "Other characters (spaces, digits, punctuation, y) are not counted.",
      ],
      starter: 'text = "Programming in Python"\n\n# Count the vowels, then print the count.\n',
      task: {
        checks: [
          { kind: "variable", id: "vowels", name: "vowels", expected: py.int(5) },
          { kind: "output", id: "output", label: "Prints the count", expected: "Vowels: 5\n" },
          { kind: "variant", id: "v-capitals", set: { text: py.str("AEIOU xyz") }, vars: { vowels: py.int(5) }, tip: "Lowercase each character (or the whole text) before testing it." },
          { kind: "variant", id: "v-empty", set: { text: py.str("") }, output: "Vowels: 0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { text: py.str("Rhythm & Blues 2026!") }, vars: { vowels: py.int(2) } },
        ],
      },
      hints: [
        "vowels = 0 before the loop, then for ch in text.lower():",
        'ch in "aeiou" is True for a lowercase vowel.',
        'Inside the if: vowels += 1. After the loop: print("Vowels:", vowels).',
      ],
      answer: 'text = "Programming in Python"\n\nvowels = 0\nfor ch in text.lower():\n    if ch in "aeiou":\n        vowels += 1\nprint("Vowels:", vowels)',
      alternatives: ['text = "Programming in Python"\nvowels = 0\nfor ch in text:\n    if ch in "aeiouAEIOU":\n        vowels = vowels + 1\nprint("Vowels:", vowels)\n'],
      wrong: [
        { code: 'text = "Programming in Python"\nvowels = 0\nfor ch in text:\n    if ch in "aeiou":\n        vowels += 1\nprint("Vowels:", vowels)\n', fails: ["v-capitals"], why: "misses capitals" },
        { code: 'text = "Programming in Python"\nvowels = 0\nfor ch in text.lower():\n    if ch in "aeiouy":\n        vowels += 1\nprint("Vowels:", vowels)\n', fails: ["vowels", "output", "v-capitals", "v-hidden"], why: "counts y" },
      ],
    },
    {
      id: "challenge-2",
      title: "Total the valid payments",
      prompt:
        "`payments` holds amounts from a card terminal; zero and negative amounts are errors. Add up the valid (positive) amounts into `total`, count the errors into `rejected`, and print both as shown. Check answer tries other lists, including an empty one.",
      expectedOutput: "Total: 49.75\nRejected: 2\n",
      looksFor: [
        "`total` is the sum of the amounts greater than 0.",
        "`rejected` counts the amounts that are 0 or negative.",
        "It works for other lists, including an empty list and one with no valid amounts.",
      ],
      starter: "payments = [12.5, -3.0, 30.0, 0, 7.25]\n\n# Total the valid payments and count the rejected ones.\n",
      task: {
        checks: [
          { kind: "variable", id: "total", name: "total", expected: py.float(49.75) },
          { kind: "variable", id: "rejected", name: "rejected", expected: py.int(2), tip: "0 is not a valid payment either: count amounts <= 0." },
          { kind: "output", id: "output", label: "Prints both", expected: "Total: 49.75\nRejected: 2\n" },
          { kind: "variant", id: "v-empty", set: { payments: py.list() }, output: "Total: 0\nRejected: 0\n" },
          { kind: "variant", id: "v-all-bad", set: { payments: py.list(py.int(-1), py.int(0)) }, vars: { total: py.int(0), rejected: py.int(2) } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { payments: py.list(py.int(5), py.int(10), py.int(-2)) }, vars: { total: py.int(15), rejected: py.int(1) } },
        ],
      },
      hints: [
        "Two accumulators: total = 0 and rejected = 0, before the loop.",
        "for amount in payments: then if amount > 0: total += amount.",
        "else: rejected += 1. Print both after the loop.",
      ],
      answer: 'payments = [12.5, -3.0, 30.0, 0, 7.25]\n\ntotal = 0\nrejected = 0\nfor amount in payments:\n    if amount > 0:\n        total += amount\n    else:\n        rejected += 1\nprint("Total:", total)\nprint("Rejected:", rejected)',
      wrong: [
        { code: 'payments = [12.5, -3.0, 30.0, 0, 7.25]\ntotal = 0\nrejected = 0\nfor amount in payments:\n    if amount >= 0:\n        total += amount\n    else:\n        rejected += 1\nprint("Total:", total)\nprint("Rejected:", rejected)\n', fails: ["rejected", "output", "v-all-bad"], why: "0 counted as valid" },
        { code: 'payments = [12.5, -3.0, 30.0, 0, 7.25]\ntotal = 0\nrejected = 0\nfor amount in payments:\n    total += amount\n    if amount <= 0:\n        rejected += 1\nprint("Total:", total)\nprint("Rejected:", rejected)\n', fails: ["total", "output", "v-all-bad", "v-hidden"], why: "adds the errors too" },
      ],
    },
  ],

  quiz: [
    {
      id: "chars",
      prompt: "What does this program print?",
      code: 'result = ""\nfor ch in "a1b2c3":\n    if ch.isdigit():\n        result = ch + result\nprint(result)',
      options: [
        { text: "`321`", correct: true, why: "Each digit is put **in front of** what's already there (`ch + result`), so they come out reversed." },
        { text: "`123`", why: "`ch + result` adds the new digit at the start, not the end." },
        { text: "`abc`", why: "Only characters where `isdigit()` is `True` are kept." },
        { text: "`6`", why: "The digits are joined as text, not added as numbers." },
      ],
    },
    {
      id: "list-loop",
      prompt: "How many times does the body of `for word in [\"to\", \"be\", \"or\"]:` run?",
      options: [
        { text: "3", correct: true, why: "Once per item in the list, and there are three items." },
        { text: "6", why: "The loop goes over the list's items (the words), not their characters." },
        { text: "2", why: "Every item is visited, from the first to the last." },
        { text: "It depends on the body", why: "Without `break` (next lessons), a `for` loop over a list always visits every item once." },
      ],
    },
  ],

  outcomes: [
    "Loop over the characters of a string and the items of a list.",
    "Filter items with `if` while counting or totalling.",
    "Build a new string inside a loop with `+=`.",
    "Choose loop variable names that read well, such as `for price in prices`.",
  ],
};
