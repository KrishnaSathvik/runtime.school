import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const stringIndexingAndSlicing: PyLesson = {
  slug: "string-indexing-and-slicing",
  ref: "python:string-indexing-and-slicing",
  module: "strings",
  number: 2,
  title: "String indexing and slicing",
  level: "beginner",
  summary:
    "Pick out one character by its position, count from the end with negative positions, take a piece of a string with a slice, and see why strings can't be changed in place.",

  sections: [
    {
      label: "positions start at 0",
      blocks: [
        {
          kind: "p",
          text: "Each character in a string has a position, called its **index**, and the first one is index **0**. `code[0]` is the first character, `code[1]` the second, and the last is at `len(code) - 1`.",
        },
        { kind: "code", code: 'code = "PY-314"\n#       P  Y  -  3  1  4\n#       0  1  2  3  4  5\nprint(code[0])    # P\nprint(code[3])    # 3' },
        {
          kind: "p",
          text: "Negative indexes count from the end: `code[-1]` is the last character and `code[-2]` the one before it. Asking for a position that doesn't exist, like `code[6]` here, is an `IndexError`.",
        },
      ],
    },
    {
      label: "slices",
      blocks: [
        {
          kind: "p",
          text: "A **slice** `text[start:stop]` gives the characters from `start` up to, but **not including**, `stop`. So `code[0:2]` is the first two characters, and `stop - start` is always how many you get.",
        },
        {
          kind: "p",
          text: "Leave out `start` to begin at the start, or `stop` to go to the end: `code[:2]` is the first two characters and `code[3:]` everything from index 3. Negative positions work in slices too: `code[-3:]` is the last three.",
        },
        {
          kind: "p",
          text: "Slices never raise `IndexError`: positions past the end are simply cut off, so `code[4:100]` is `\"14\"`, and a slice that selects nothing is the empty string.",
        },
        {
          kind: "p",
          text: "A third number is the **step**: `text[::2]` takes every second character, and a step of `-1` goes backwards, so `text[::-1]` is the string reversed.",
        },
      ],
    },
    {
      label: "strings can't be changed",
      blocks: [
        {
          kind: "p",
          text: "Strings are **immutable**: once created, their characters can't be replaced. `code[0] = \"J\"` is a `TypeError`. Instead, build a new string from pieces, `\"J\" + code[1:]`, and assign it to the name.",
        },
      ],
    },
  ],

  example: {
    caption: "Taking a product code apart by position. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'code = "UK-2026-00417"\nprint("First character:", code[0])\nprint("Last character:", code[-1])\nprint("Country:", code[:2])\nprint("Year:", code[3:7])\nprint("Serial:", code[-5:])\nprint("Reversed:", code[::-1])',
  },

  walkthrough: [
    {
      title: "Index from the front and from the back",
      text: "`word[0]` is the first character and `word[-1]` the last. `len(word) - 1` is the last index counting from the front.",
      code: 'word = "Python"\nprint(word[0], word[1], word[-1], word[-2])\nprint(len(word) - 1, word[len(word) - 1])',
    },
    {
      title: "A slice stops before its stop",
      text: "`[0:2]` gives characters 0 and 1. `[2:]` starts at index 2 and runs to the end. Together they rebuild the whole word.",
      code: 'word = "Python"\nprint(word[0:2])\nprint(word[2:])\nprint(word[:2] + word[2:])',
    },
    {
      title: "Slices past the end are cut off",
      text: "`word[4:100]` stops at the end of the string, and `word[10:]` selects nothing, which prints as an empty line.",
      code: 'word = "Python"\nprint(word[4:100])\nprint(word[10:])\nprint(len(word[10:]))',
    },
    {
      title: "Steps and reversing",
      text: "A step of 2 takes every other character. A step of `-1` walks backwards from the end.",
      code: 'digits = "0123456789"\nprint(digits[::2])\nprint(digits[1::2])\nprint(digits[::-1])',
    },
  ],

  mistakes: [
    {
      title: "Counting from 1",
      text: "There are 6 characters, so the last index is 5. `word[6]` is past the end: an `IndexError` on line 2.",
      code: 'word = "Python"\nprint(word[6])',
      raises: "IndexError",
      fix: "The last character is `word[-1]`, or `word[len(word) - 1]`.",
    },
    {
      title: "Trying to change one character",
      text: "Strings can't be changed in place, so assigning to an index is a `TypeError`.",
      code: 'code = "PY-314"\ncode[0] = "J"\nprint(code)',
      raises: "TypeError",
      fix: 'Build a new string and assign it: `code = "J" + code[1:]`.',
    },
    {
      title: "Expecting the stop character to be included",
      text: "The year is at positions 3 to 6, but `[3:6]` stops **before** 6, so it gives only `202`.",
      code: 'code = "UK-2026-00417"\nprint(code[3:6])',
      fix: "The stop is one past the last character you want: `code[3:7]`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Take a product code apart",
      prompt:
        "Product codes always look like `UK-2026-00417`: a two-letter country, a dash, a four-digit year, a dash, and a five-digit serial number. Store the three parts in `country`, `year` and `serial` (as strings) using slices, then print them as shown.",
      expectedOutput: "Country: UK\nYear: 2026\nSerial: 00417\n",
      looksFor: [
        "`country`, `year` and `serial` hold `\"UK\"`, `\"2026\"` and `\"00417\"`, sliced from `code`.",
        "The program prints the three lines shown.",
        "It works for any code in the same format.",
      ],
      starter: 'code = "UK-2026-00417"\n\n# Slice code into country, year and serial.\n',
      task: {
        checks: [
          { kind: "variable", id: "country", name: "country", expected: py.str("UK") },
          { kind: "variable", id: "year", name: "year", expected: py.str("2026"), tip: "The year starts at index 3 and ends at index 6, so the slice is [3:7]." },
          { kind: "variable", id: "serial", name: "serial", expected: py.str("00417"), tip: "The serial is the last five characters: [-5:] or [8:]." },
          { kind: "output", id: "output", label: "Prints the three parts", expected: "Country: UK\nYear: 2026\nSerial: 00417\n" },
          { kind: "variant", id: "v-other", set: { code: py.str("FR-1999-12345") }, output: "Country: FR\nYear: 1999\nSerial: 12345\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { code: py.str("JP-2030-90001") }, vars: { country: py.str("JP"), year: py.str("2030"), serial: py.str("90001") } },
        ],
      },
      hints: [
        "Write the positions under the code: U is 0, K is 1, the dash is 2, the year starts at 3.",
        "A slice stops before its stop: the country is code[0:2] (or code[:2]).",
        "year = code[3:7] and serial = code[8:] (or code[-5:]).",
      ],
      answer: 'code = "UK-2026-00417"\n\ncountry = code[:2]\nyear = code[3:7]\nserial = code[-5:]\nprint("Country:", country)\nprint("Year:", year)\nprint("Serial:", serial)',
      alternatives: ['code = "UK-2026-00417"\ncountry = code[0:2]\nyear = code[3:7]\nserial = code[8:13]\nprint("Country:", country)\nprint("Year:", year)\nprint("Serial:", serial)\n'],
      wrong: [
        { code: 'code = "UK-2026-00417"\ncountry = code[:2]\nyear = code[3:6]\nserial = code[-5:]\nprint("Country:", country)\nprint("Year:", year)\nprint("Serial:", serial)\n', fails: ["year", "output", "v-other", "v-hidden"], why: "stop not included" },
        { code: 'code = "UK-2026-00417"\ncountry = "UK"\nyear = "2026"\nserial = "00417"\nprint("Country:", country)\nprint("Year:", year)\nprint("Serial:", serial)\n', fails: ["v-other", "v-hidden"], why: "typed the parts" },
        { code: 'code = "UK-2026-00417"\ncountry = code[:2]\nyear = int(code[3:7])\nserial = code[-5:]\nprint("Country:", country)\nprint("Year:", year)\nprint("Serial:", serial)\n', fails: ["year", "v-hidden"], why: "year as a number" },
      ],
    },
    {
      id: "challenge-2",
      title: "Read a tracking number",
      prompt:
        "Customers read tracking numbers out over the phone, and staff confirm them backwards. From `tracking`, store the first character in `first`, the last three characters in `last_three`, and the whole number reversed in `backwards`. Print them as shown.",
      expectedOutput: "First: T\nLast three: 213\nBackwards: 31284KRT\n",
      looksFor: [
        "`first` is the first character, `last_three` the last three, and `backwards` the whole string reversed.",
        "The program prints the three lines shown, and works for any tracking number.",
      ],
      starter: 'tracking = "TRK48213"\n\n# Store first, last_three and backwards, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "first", name: "first", expected: py.str("T") },
          { kind: "variable", id: "last-three", name: "last_three", expected: py.str("213"), tip: "Negative positions count from the end: [-3:] is the last three characters." },
          { kind: "variable", id: "backwards", name: "backwards", expected: py.str("31284KRT"), tip: "A slice with a step of -1 goes backwards: tracking[::-1]." },
          { kind: "output", id: "output", label: "Prints the three lines", expected: "First: T\nLast three: 213\nBackwards: 31284KRT\n" },
          { kind: "variant", id: "v-other", set: { tracking: py.str("AB12") }, output: "First: A\nLast three: B12\nBackwards: 21BA\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { tracking: py.str("ZX9900771") }, vars: { first: py.str("Z"), last_three: py.str("771"), backwards: py.str("1770099XZ") } },
        ],
      },
      hints: [
        "The first character is at index 0.",
        "The last three characters start three from the end: tracking[-3:].",
        "Leaving out start and stop and using a step of -1 reverses a string: tracking[::-1].",
      ],
      answer: 'tracking = "TRK48213"\n\nfirst = tracking[0]\nlast_three = tracking[-3:]\nbackwards = tracking[::-1]\nprint("First:", first)\nprint("Last three:", last_three)\nprint("Backwards:", backwards)',
      alternatives: ['tracking = "TRK48213"\nfirst = tracking[:1]\nlast_three = tracking[len(tracking) - 3:]\nbackwards = tracking[::-1]\nprint("First:", first)\nprint("Last three:", last_three)\nprint("Backwards:", backwards)\n'],
      wrong: [
        { code: 'tracking = "TRK48213"\nfirst = tracking[0]\nlast_three = tracking[5:]\nbackwards = tracking[::-1]\nprint("First:", first)\nprint("Last three:", last_three)\nprint("Backwards:", backwards)\n', fails: ["v-other", "v-hidden"], why: "fixed start index only works for 8 characters" },
        { code: 'tracking = "TRK48213"\nfirst = tracking[1]\nlast_three = tracking[-3:]\nbackwards = tracking[::-1]\nprint("First:", first)\nprint("Last three:", last_three)\nprint("Backwards:", backwards)\n', fails: ["first", "output", "v-other", "v-hidden"], why: "counted from 1" },
        { code: 'tracking = "TRK48213"\nfirst = tracking[0]\nlast_three = tracking[-3:-1]\nbackwards = tracking[::-1]\nprint("First:", first)\nprint("Last three:", last_three)\nprint("Backwards:", backwards)\n', fails: ["last-three", "output", "v-other", "v-hidden"], why: "stop of -1 drops the last character" },
      ],
    },
  ],

  quiz: [
    {
      id: "slice",
      prompt: "What does this program print?",
      code: 'text = "runtime"\nprint(text[1:4], text[-2:])',
      options: [
        { text: "`unt me`", correct: true, why: "`[1:4]` takes indexes 1, 2 and 3 (u, n, t). `[-2:]` takes the last two characters." },
        { text: "`untim me`", why: "A slice stops **before** its stop index, so `[1:4]` is three characters, not four." },
        { text: "`run me`", why: "Indexes start at 0, so index 1 is the second character, `u`." },
        { text: "`unt e`", why: "`[-2:]` runs from the second-to-last character to the end: two characters." },
      ],
    },
    {
      id: "errors",
      prompt: "`word = \"abc\"`. Which expression raises an error?",
      options: [
        { text: "`word[3]`", correct: true, why: "The indexes are 0, 1 and 2. Index 3 doesn't exist, so this is an `IndexError`." },
        { text: "`word[1:10]`", why: "Slices cut off at the end of the string instead of failing: this gives `\"bc\"`." },
        { text: "`word[-3]`", why: "`-3` counts three from the end, which is the first character, `\"a\"`." },
        { text: "`word[5:]`", why: "A slice that selects nothing gives the empty string `\"\"`, not an error." },
      ],
    },
  ],

  outcomes: [
    "Pick out characters by index from the front (from 0) and from the back (negative indexes).",
    "Take part of a string with a slice, knowing that the stop is excluded.",
    "Reverse a string and take every n-th character with a step.",
    "Explain why strings can't be changed in place, and build a new one instead.",
  ],
};
