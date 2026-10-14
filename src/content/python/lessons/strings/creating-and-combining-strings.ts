import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const creatingAndCombiningStrings: PyLesson = {
  slug: "creating-and-combining-strings",
  ref: "python:creating-and-combining-strings",
  module: "strings",
  number: 1,
  title: "Creating and combining strings",
  level: "beginner",
  summary:
    "Write text with either kind of quote, put special characters inside it, join pieces with `+`, repeat them with `*`, measure them with `len()`, and control how `print()` separates and ends its output.",

  sections: [
    {
      label: "quotes and special characters",
      blocks: [
        {
          kind: "p",
          text: "A string can use single or double quotes: `'tea'` and `\"tea\"` are the same string. Pick the one that doesn't appear in your text, so `\"It's ready\"` needs no special treatment.",
        },
        {
          kind: "p",
          text: "A backslash starts an **escape sequence**, a way to write a character you can't type directly: `\\n` is a new line, `\\t` a tab, `\\\"` a double quote inside double quotes, and `\\\\` a backslash itself.",
        },
        { kind: "code", code: 'print("Line one\\nLine two")\nprint("Name:\\tAda")\nprint("She said \\"hi\\"")' },
        {
          kind: "p",
          text: "Text over several lines can go in triple quotes, `\"\"\"…\"\"\"`. The line breaks you type become part of the string.",
        },
      ],
    },
    {
      label: "joining, repeating and measuring",
      blocks: [
        {
          kind: "p",
          text: "`+` joins two strings into a new one: `\"Ada\" + \" \" + \"Lovelace\"` is `\"Ada Lovelace\"`. It adds nothing in between, so spaces must be part of the pieces. Both sides must be strings: to join a number, convert it with `str()` first.",
        },
        {
          kind: "p",
          text: "`*` repeats a string: `\"-\" * 10` is ten dashes. `len(text)` counts the characters in a string, spaces and punctuation included. The empty string `\"\"` has length 0.",
        },
      ],
    },
    {
      label: "sep and end in print()",
      blocks: [
        {
          kind: "p",
          text: "You already know that `print(a, b)` puts a space between values and finishes with a new line. Both can be changed: `sep=` sets what goes between the values, and `end=` what goes after the last one.",
        },
        { kind: "code", code: 'print(14, 10, 2026, sep="/")    # 14/10/2026\nprint("Loading", end="...")\nprint("done")                   # Loading...done' },
        {
          kind: "p",
          text: "`sep` and `end` must come after the values, written with their names. Unlike `+`, `print()` converts numbers for you, so `sep` is often the easiest way to lay out numbers and text together.",
        },
      ],
    },
  ],

  example: {
    caption: "Building a label from pieces. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'first = "Ada"\nlast = "Lovelace"\nfull_name = first + " " + last\n\nprint(full_name)\nprint("=" * len(full_name))\nprint("Characters:", len(full_name))\nprint("Order", 417, sep=" #")',
  },

  walkthrough: [
    {
      title: "Either kind of quote",
      text: "Both strings are equal. The second needs double quotes because the text contains an apostrophe.",
      code: "a = 'tea'\nb = \"It's tea\"\nprint(a)\nprint(b)",
    },
    {
      title: "Escape sequences",
      text: "`\\n` starts a new line inside one string, and `\\t` moves to the next tab stop. Each escape counts as one character.",
      code: 'print("Item\\tPrice\\nTea\\t2.50")\nprint(len("a\\nb"))',
    },
    {
      title: "+ joins, * repeats",
      text: "`+` needs the spaces spelled out. `*` repeats a string a whole number of times. `str(3)` turns the number into text so it can be joined.",
      code: 'first = "Ada"\nlast = "Lovelace"\nprint(first + last)\nprint(first + " " + last)\nprint("ab" * 3)\nprint("Copies: " + str(3))',
    },
    {
      title: "sep and end",
      text: "The first `print()` joins its values with `/`. The second ends with `...` instead of a new line, so the third continues on the same line.",
      code: 'print(14, 10, 2026, sep="/")\nprint("Loading", end="...")\nprint("done")',
    },
  ],

  mistakes: [
    {
      title: "Joining a number with +",
      text: "`+` only joins strings with strings, so this stops with a `TypeError` on line 2.",
      code: 'count = 3\nprint("Copies: " + count)',
      raises: "TypeError",
      fix: 'Convert first, `"Copies: " + str(count)`, or let `print()` do it: `print("Copies:", count)`.',
    },
    {
      title: "Using the same quote inside the text",
      text: "The apostrophe in `It's` ends the string early, and Python can't read what follows. Nothing runs.",
      code: "message = 'It's ready'\nprint(message)",
      raises: "SyntaxError",
      fix: "Use the other kind of quote around the text: `\"It's ready\"`, or escape it: `'It\\'s ready'`.",
    },
    {
      title: "Forgetting the space between joined words",
      text: "`+` puts nothing between the pieces, so the name prints as `AdaLovelace`.",
      code: 'first = "Ada"\nlast = "Lovelace"\nprint(first + last)',
      fix: 'Join a space too: `first + " " + last`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Build a shipping label",
      prompt:
        "Build `full_name` from `first` and `last` with one space between them, then build `label`: the full name, a comma and a space, then the `city`. Print the label, and then its length, as shown. Check answer also tries other names.",
      expectedOutput: "Ada Lovelace, London\nCharacters: 20\n",
      looksFor: [
        "`full_name` is `\"Ada Lovelace\"` and `label` is `\"Ada Lovelace, London\"`, built from the variables.",
        "The program prints the label, then `Characters:` and its length.",
        "It works for other names and cities.",
      ],
      starter: 'first = "Ada"\nlast = "Lovelace"\ncity = "London"\n\n# Build full_name and label, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "full-name", name: "full_name", expected: py.str("Ada Lovelace"), tip: 'Join with a space in the middle: first + " " + last.' },
          { kind: "variable", id: "label", name: "label", expected: py.str("Ada Lovelace, London"), tip: 'After the name comes ", " (a comma and a space), then the city.' },
          { kind: "output", id: "output", label: "Prints the label and its length", expected: "Ada Lovelace, London\nCharacters: 20\n", tip: "len(label) counts its characters." },
          { kind: "variant", id: "v-other", set: { first: py.str("Grace"), last: py.str("Hopper"), city: py.str("New York") }, output: "Grace Hopper, New York\nCharacters: 22\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { first: py.str("Al"), last: py.str("Khwarizmi"), city: py.str("Baghdad") }, output: "Al Khwarizmi, Baghdad\nCharacters: 21\n" },
        ],
      },
      hints: [
        'full_name = first + " " + last.',
        'label = full_name + ", " + city.',
        'print(label), then print("Characters:", len(label)).',
      ],
      answer: 'first = "Ada"\nlast = "Lovelace"\ncity = "London"\n\nfull_name = first + " " + last\nlabel = full_name + ", " + city\nprint(label)\nprint("Characters:", len(label))',
      alternatives: ['first = "Ada"\nlast = "Lovelace"\ncity = "London"\nfull_name = first + " " + last\nlabel = first + " " + last + ", " + city\nprint(label)\nprint("Characters: " + str(len(label)))\n'],
      wrong: [
        { code: 'first = "Ada"\nlast = "Lovelace"\ncity = "London"\nfull_name = first + last\nlabel = full_name + ", " + city\nprint(label)\nprint("Characters:", len(label))\n', fails: ["full-name", "label", "output", "v-other", "v-hidden"], why: "no space" },
        { code: 'first = "Ada"\nlast = "Lovelace"\ncity = "London"\nfull_name = first + " " + last\nlabel = full_name + "," + city\nprint(label)\nprint("Characters:", len(label))\n', fails: ["label", "output", "v-other", "v-hidden"], why: "comma without space" },
        { code: 'first = "Ada"\nlast = "Lovelace"\ncity = "London"\nfull_name = first + " " + last\nlabel = full_name + ", " + city\nprint(label)\nprint("Characters:", 20)\n', fails: ["v-other", "v-hidden"], why: "typed the length" },
      ],
    },
    {
      id: "challenge-2",
      title: "Lay out a dated heading",
      prompt:
        "Print the date from `day`, `month` and `year` with `/` between them, then a divider of dashes that is `width` characters long, stored in `divider`. Use `sep` (or convert with `str()`), and build the divider with `*`.",
      expectedOutput: "14/10/2026\n----------\n",
      looksFor: [
        "The first line is the date with `/` between the numbers, and no spaces.",
        "`divider` is `width` dashes, and it's printed on the second line.",
        "It works for other dates and widths.",
      ],
      starter: "day = 14\nmonth = 10\nyear = 2026\nwidth = 10\n\n# Print the date, then the divider.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the date and the divider", expected: "14/10/2026\n----------\n", tip: 'print(day, month, year, sep="/") puts / between the values instead of spaces.' },
          { kind: "variable", id: "divider", name: "divider", expected: py.str("----------"), tip: 'Repeat a dash: divider = "-" * width.' },
          { kind: "variant", id: "v-other", set: { day: py.int(1), month: py.int(2), year: py.int(2030), width: py.int(4) }, output: "1/2/2030\n----\n", vars: { divider: py.str("----") } },
        ],
      },
      hints: [
        'print() can separate its values with something other than a space: sep="/".',
        'A string times a number repeats it: "-" * width.',
        'print(day, month, year, sep="/"), then divider = "-" * width and print(divider).',
      ],
      answer: 'day = 14\nmonth = 10\nyear = 2026\nwidth = 10\n\nprint(day, month, year, sep="/")\ndivider = "-" * width\nprint(divider)',
      alternatives: ['day = 14\nmonth = 10\nyear = 2026\nwidth = 10\nprint(str(day) + "/" + str(month) + "/" + str(year))\ndivider = "-" * width\nprint(divider)\n'],
      wrong: [
        { code: 'day = 14\nmonth = 10\nyear = 2026\nwidth = 10\nprint(day, "/", month, "/", year)\ndivider = "-" * width\nprint(divider)\n', fails: ["output", "v-other"], why: "spaces around the slashes" },
        { code: 'day = 14\nmonth = 10\nyear = 2026\nwidth = 10\nprint(day, month, year, sep="/")\ndivider = "----------"\nprint(divider)\n', fails: ["v-other"], why: "typed the dashes" },
        { code: 'day = 14\nmonth = 10\nyear = 2026\nwidth = 10\nprint(day + "/" + month + "/" + year)\n', fails: "program", why: "joined numbers with +" },
      ],
    },
  ],

  quiz: [
    {
      id: "sep-end",
      prompt: "What does this program print?",
      code: 'print("a", "b", sep="")\nprint("c", end="-")\nprint("d")',
      options: [
        { text: "`ab`, then `c-d`", correct: true, why: "`sep=\"\"` puts nothing between `a` and `b`. `end=\"-\"` replaces the new line after `c`, so `d` follows on the same line." },
        { text: "`a b`, then `c-d`", why: "`sep=\"\"` replaces the usual space with nothing." },
        { text: "`ab`, then `c-`, then `d`", why: "`end` replaces the new line, so nothing moves the next print to a new line." },
        { text: "`a b`, then `c`, then `-d`", why: "`end=` goes after the last value of its own print, not before the next one; and `sep=\"\"` removes the space." },
      ],
    },
    {
      id: "len",
      prompt: "What is `len(\"Hi there\\n\")`?",
      options: [
        { text: "`9`", correct: true, why: "H, i, space, t, h, e, r, e: eight characters, plus `\\n`, which is a single new-line character." },
        { text: "`10`", why: "`\\n` is written with two symbols, but it is one character in the string." },
        { text: "`8`", why: "The new line counts as a character too, even though you can't see it." },
        { text: "`2`", why: "`len()` counts characters, not words." },
      ],
    },
  ],

  outcomes: [
    "Write strings with either quote, and use `\\n`, `\\t` and other escapes.",
    "Join strings with `+`, repeat them with `*`, and count characters with `len()`.",
    "Convert numbers with `str()` before joining them to text.",
    "Change what `print()` puts between and after its values with `sep` and `end`.",
  ],
};
