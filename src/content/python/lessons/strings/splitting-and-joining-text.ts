import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const splittingAndJoiningText: PyLesson = {
  slug: "splitting-and-joining-text",
  ref: "python:splitting-and-joining-text",
  module: "strings",
  number: 4,
  title: "Splitting and joining text",
  level: "beginner",
  summary:
    "Break a line of text into pieces with `split()`, pick out the pieces you need, and put pieces back together with `join()`: the everyday way to read simple records and tidy up spacing.",

  sections: [
    {
      label: "split() gives a list of pieces",
      blocks: [
        {
          kind: "p",
          text: "`text.split(\",\")` cuts a string at every comma and gives back the pieces as a **list**, written in square brackets: `\"tea,2.50,3\".split(\",\")` is `['tea', '2.50', '3']`. Lists get a whole module later; for now you need two things: `len(parts)` counts the pieces, and `parts[0]`, `parts[1]`, … pick one out, with the same indexing as strings.",
        },
        { kind: "code", code: 'parts = "tea,2.50,3".split(",")\nname = parts[0]           # "tea"\nprice = float(parts[1])   # 2.5\nquantity = int(parts[2])  # 3' },
        {
          kind: "p",
          text: "The pieces are always strings, even when they look like numbers. Convert them with `int()` or `float()`, as in Types and Type Conversion.",
        },
      ],
    },
    {
      label: "splitting on spaces",
      blocks: [
        {
          kind: "p",
          text: "With no argument, `split()` splits on **any run of whitespace** and ignores spaces at the ends, so `\"  two   words \".split()` is `['two', 'words']`. That's different from `split(\" \")`, which splits at every single space and gives empty pieces where spaces are doubled.",
        },
        {
          kind: "p",
          text: "A second argument limits the number of cuts: `\"key=a=b\".split(\"=\", 1)` is `['key', 'a=b']`, useful when the separator can appear in the value too.",
        },
      ],
    },
    {
      label: "join() puts pieces back together",
      blocks: [
        {
          kind: "p",
          text: "`join()` is the opposite of `split()`. It's called on the separator, and given the pieces: `\"-\".join(parts)` puts a dash between each piece. Every piece must already be a string.",
        },
        {
          kind: "p",
          text: "Splitting on whitespace and joining with single spaces is the standard way to collapse messy spacing: `\" \".join(text.split())`.",
        },
      ],
    },
  ],

  example: {
    caption: "Reading one line of a CSV file by hand. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'line = "SKU-104,Desk lamp,24.50,3"\nparts = line.split(",")\nprint(parts)\nprint("Fields:", len(parts))\n\nname = parts[1]\ntotal = float(parts[2]) * int(parts[3])\nprint(name, "costs", total, "in total")\nprint(" | ".join(parts))',
  },

  walkthrough: [
    {
      title: "split() returns a list of strings",
      text: "The printed list shows each piece in quotes: they're strings, including the numbers.",
      code: 'record = "Ada,36,London"\nparts = record.split(",")\nprint(parts)\nprint(len(parts))\nprint(parts[0], parts[-1])',
    },
    {
      title: "split() versus split(\" \")",
      text: "With no argument, runs of spaces count as one separator. Splitting on a single space keeps an empty piece for every extra space.",
      code: 'text = "  red   green blue "\nprint(text.split())\nprint(text.split(" "))',
    },
    {
      title: "Limit the number of cuts",
      text: "Only the first `=` splits, so the value keeps its own `=`.",
      code: 'setting = "query=a=b"\nprint(setting.split("="))\nprint(setting.split("=", 1))',
    },
    {
      title: "join() and collapsing spaces",
      text: "`join()` is called on the separator. Joining the words from `split()` with one space removes every extra space.",
      code: 'words = "  Ten   tips for   clean   data  ".split()\nprint(" ".join(words))\nprint("-".join(words).lower())',
    },
  ],

  mistakes: [
    {
      title: "Calculating with pieces that are still text",
      text: "`parts[1]` is the string `\"2.50\"`, so `*` repeats it three times instead of multiplying.",
      code: 'parts = "tea,2.50,3".split(",")\nprint(parts[1] * int(parts[2]))',
      fix: "Convert the piece first: `float(parts[1]) * int(parts[2])`.",
    },
    {
      title: "Asking for a piece that isn't there",
      text: "This line has only two fields, so there is no `parts[2]`: an `IndexError` on line 3.",
      code: 'line = "tea,2.50"\nparts = line.split(",")\nprint(parts[2])',
      raises: "IndexError",
      fix: "Check `len(parts)` against the number of fields you expect. You'll learn to handle bad lines in Conditions and Logic.",
    },
    {
      title: "Joining something that isn't text",
      text: "`join()` only joins strings. The number 3 makes it stop with a `TypeError`.",
      code: 'print("-".join(["box", 3]))',
      raises: "TypeError",
      fix: 'Convert numbers first: `"-".join(["box", str(3)])`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Read an order line",
      prompt:
        "Each order is one line: SKU, product name, unit price and quantity, separated by commas. Split `line` into its fields, store the product name in `name`, the unit price in `price` (a float), the quantity in `quantity` (an int), and the line's value in `total`. Print the summary shown.",
      expectedOutput: "Desk lamp x 3 = 73.5\n",
      looksFor: [
        "`name` is `\"Desk lamp\"`, `price` is `24.5`, `quantity` is `3` and `total` is `73.5`.",
        "The values come from splitting `line`, so other order lines work too.",
      ],
      starter: 'line = "SKU-104,Desk lamp,24.50,3"\n\n# Split line, then store name, price, quantity and total.\n',
      task: {
        checks: [
          { kind: "variable", id: "name", name: "name", expected: py.str("Desk lamp"), tip: "The name is the second field: index 1." },
          { kind: "variable", id: "price", name: "price", expected: py.float(24.5), tip: "Fields are strings: convert the price with float()." },
          { kind: "variable", id: "quantity", name: "quantity", expected: py.int(3), tip: "Convert the quantity with int()." },
          { kind: "variable", id: "total", name: "total", expected: py.float(73.5) },
          { kind: "output", id: "output", label: "Prints the summary", expected: "Desk lamp x 3 = 73.5\n", tip: 'print(name, "x", quantity, "=", total).' },
          { kind: "variant", id: "v-other", set: { line: py.str("SKU-7,Pen,1.25,4") }, output: "Pen x 4 = 5.0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { line: py.str("SKU-99,Office chair,120.0,2") }, vars: { name: py.str("Office chair"), price: py.float(120), quantity: py.int(2), total: py.float(240) } },
        ],
      },
      hints: [
        'parts = line.split(",") gives four strings.',
        "parts[1] is the name; parts[2] and parts[3] need float() and int().",
        'total = price * quantity, then print(name, "x", quantity, "=", total).',
      ],
      answer: 'line = "SKU-104,Desk lamp,24.50,3"\n\nparts = line.split(",")\nname = parts[1]\nprice = float(parts[2])\nquantity = int(parts[3])\ntotal = price * quantity\nprint(name, "x", quantity, "=", total)',
      alternatives: ['line = "SKU-104,Desk lamp,24.50,3"\nparts = line.split(",")\nname = parts[-3]\nprice = float(parts[-2])\nquantity = int(parts[-1])\ntotal = quantity * price\nprint(name + " x " + str(quantity) + " = " + str(total))\n'],
      wrong: [
        { code: 'line = "SKU-104,Desk lamp,24.50,3"\nparts = line.split()\nname = parts[1]\nprice = 24.5\nquantity = 3\ntotal = price * quantity\nprint(name, "x", quantity, "=", total)\n', fails: ["name", "output", "v-other", "v-hidden"], why: "split on spaces: the wrong pieces" },
        { code: 'line = "SKU-104,Desk lamp,24.50,3"\nparts = line.split(",")\nname = parts[0]\nprice = float(parts[1])\nquantity = int(parts[2])\ntotal = price * quantity\nprint(name, "x", quantity, "=", total)\n', fails: "program", why: "counted fields from 1: float('Desk lamp') fails" },
        { code: 'line = "SKU-104,Desk lamp,24.50,3"\nparts = line.split(",")\nname = parts[1]\nprice = float(parts[2])\nquantity = float(parts[3])\ntotal = price * quantity\nprint(name, "x", quantity, "=", total)\n', fails: ["quantity", "output", "v-other", "v-hidden"], why: "quantity as a float" },
      ],
    },
    {
      id: "challenge-2",
      title: "Tidy a title and make a web address",
      prompt:
        "An article title was typed with extra spaces. Store the tidied title in `clean_title`: the same words, separated by single spaces, nothing at the ends. Then store a web-address version in `slug`: the words in lowercase, joined with dashes. Print both.",
      expectedOutput: "Ten tips for clean data\nten-tips-for-clean-data\n",
      looksFor: [
        "`clean_title` has the words separated by exactly one space.",
        "`slug` has the words in lowercase, joined by `-`.",
        "It works for other titles too.",
      ],
      starter: 'title = "  Ten   tips for   clean   data  "\n\n# Store clean_title and slug, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "clean-title", name: "clean_title", expected: py.str("Ten tips for clean data"), tip: 'split() with no argument ignores runs of spaces; " ".join() puts single spaces back.' },
          { kind: "variable", id: "slug", name: "slug", expected: py.str("ten-tips-for-clean-data"), tip: '"-".join(words) joins with dashes; .lower() makes it lowercase.' },
          { kind: "output", id: "output", label: "Prints both", expected: "Ten tips for clean data\nten-tips-for-clean-data\n" },
          { kind: "variant", id: "v-other", set: { title: py.str("Python   ROCKS") }, output: "Python ROCKS\npython-rocks\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { title: py.str("   One") }, vars: { clean_title: py.str("One"), slug: py.str("one") } },
        ],
      },
      hints: [
        "words = title.split() gives just the words, with no empty pieces.",
        'clean_title = " ".join(words).',
        'slug = "-".join(words).lower(), or clean_title.lower().replace(" ", "-").',
      ],
      answer: 'title = "  Ten   tips for   clean   data  "\n\nwords = title.split()\nclean_title = " ".join(words)\nslug = "-".join(words).lower()\nprint(clean_title)\nprint(slug)',
      alternatives: ['title = "  Ten   tips for   clean   data  "\nclean_title = " ".join(title.split())\nslug = clean_title.lower().replace(" ", "-")\nprint(clean_title)\nprint(slug)\n'],
      wrong: [
        { code: 'title = "  Ten   tips for   clean   data  "\nclean_title = title.strip()\nslug = clean_title.lower().replace(" ", "-")\nprint(clean_title)\nprint(slug)\n', fails: ["clean-title", "slug", "output", "v-other"], why: "strip() leaves inner spaces" },
        { code: 'title = "  Ten   tips for   clean   data  "\nwords = title.split(" ")\nclean_title = " ".join(words)\nslug = "-".join(words).lower()\nprint(clean_title)\nprint(slug)\n', fails: ["clean-title", "slug", "output", "v-other", "v-hidden"], why: 'split(" ") keeps empty pieces' },
      ],
    },
  ],

  quiz: [
    {
      id: "split-count",
      prompt: "What does this program print?",
      code: 'row = "a,,b,"\nprint(len(row.split(",")))',
      options: [
        { text: "`4`", correct: true, why: "There are three commas, so four pieces: `'a'`, `''`, `'b'` and `''`. Empty pieces count." },
        { text: "`2`", why: "`split(\",\")` keeps empty pieces between neighbouring commas and after the last one. Only `split()` with no argument drops empty pieces (and it splits on whitespace)." },
        { text: "`3`", why: "The comma at the end makes one more piece: an empty string after it." },
        { text: "`5`", why: "The number of pieces is the number of separators plus one: three commas, four pieces." },
      ],
    },
    {
      id: "join",
      prompt: "Which line prints `a/b/c`?",
      options: [
        { text: '`print("/".join(["a", "b", "c"]))`', correct: true, why: "`join()` is called on the separator and given the pieces." },
        { text: '`print(["a", "b", "c"].join("/"))`', why: "Lists don't have a `join()` method. It belongs to the separator string: `\"/\".join(...)`." },
        { text: '`print("abc".split("/"))`', why: "This splits instead of joining. There's no `/` in `\"abc\"`, so it prints `['abc']`." },
        { text: '`print("a", "b", "c", sep=" / ")`', why: "That puts spaces around each slash: `a / b / c`." },
      ],
    },
  ],

  outcomes: [
    "Split a line into fields with `split()`, and pick fields out by index.",
    "Choose between `split()` (any whitespace) and `split(\",\")` (one exact separator), and limit the cuts.",
    "Convert split pieces into numbers before calculating with them.",
    "Join pieces with `join()`, and collapse messy spacing with `\" \".join(text.split())`.",
  ],
};
