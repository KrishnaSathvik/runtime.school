import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const stringMethodsForCleaningText: PyLesson = {
  slug: "string-methods-for-cleaning-text",
  ref: "python:string-methods-for-cleaning-text",
  module: "strings",
  number: 3,
  title: "String methods for cleaning text",
  level: "beginner",
  summary:
    "Tidy messy text with string methods: trim spaces, change case, replace characters, and search inside a string. Each method gives back a new string, which you can clean further by chaining.",

  sections: [
    {
      label: "methods",
      blocks: [
        {
          kind: "p",
          text: "A **method** is a function that belongs to a value, called with a dot: `name.upper()`. String methods never change the original string (strings are immutable); they give back a **new** string. To keep the result, assign it: `name = name.upper()`.",
        },
        {
          kind: "p",
          text: "The brackets are required. `name.upper` without them is the method itself, not its result.",
        },
      ],
    },
    {
      label: "trimming and case",
      blocks: [
        {
          kind: "p",
          text: "`strip()` removes spaces, tabs and new lines from both ends (not from the middle). `lstrip()` and `rstrip()` trim only the left or right end.",
        },
        {
          kind: "p",
          text: "`lower()` and `upper()` change every letter. `title()` capitalises the first letter of each word, and `capitalize()` only the first letter of the string. Comparing text that people typed usually starts with `strip().lower()`, so `\" Ada@Example.com\"` and `\"ada@example.com\"` match.",
        },
      ],
    },
    {
      label: "replacing and searching",
      blocks: [
        {
          kind: "p",
          text: "`text.replace(old, new)` replaces every occurrence of `old`. Replacing with `\"\"` deletes it. An optional third argument limits how many are replaced.",
        },
        {
          kind: "p",
          text: "`find(part)` gives the index where `part` first appears, or `-1` if it doesn't. `count(part)` says how many times it appears. `startswith()` and `endswith()` give `True` or `False`.",
        },
        { kind: "code", code: 'email = "ada@example.com"\nprint(email.find("@"))           # 3\nprint(email[email.find("@") + 1:])  # example.com\nprint(email.endswith(".com"))    # True' },
      ],
    },
    {
      label: "chaining",
      blocks: [
        {
          kind: "p",
          text: "Because each method returns a string, you can call the next method on the result straight away: `raw.strip().lower()` trims first, then lowers the trimmed text. Chains run left to right.",
        },
      ],
    },
  ],

  example: {
    caption: "Cleaning a name and an email typed into a sign-up form. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\n\nname = raw_name.strip().title()\nemail = raw_email.strip().lower()\n\nprint(name)\nprint(email)\nprint("Domain starts at index", email.find("@") + 1)',
  },

  walkthrough: [
    {
      title: "A method returns a new string",
      text: "`city.upper()` gives a new string, but `city` itself is unchanged until you assign the result back to it.",
      code: 'city = "london"\nprint(city.upper())\nprint(city)\ncity = city.upper()\nprint(city)',
    },
    {
      title: "strip() trims only the ends",
      text: "The brackets in the output show where each string starts and ends. Spaces in the middle stay.",
      code: 'raw = "   two  words   "\nprint("[" + raw.strip() + "]")\nprint("[" + raw.lstrip() + "]")\nprint("[" + raw.rstrip() + "]")',
    },
    {
      title: "Replacing and deleting",
      text: "Replacing with an empty string deletes characters. Chained replaces run one after another.",
      code: 'phone = "(020) 7946-0018"\nprint(phone.replace("-", " "))\nprint(phone.replace("(", "").replace(")", "").replace(" ", "").replace("-", ""))',
    },
    {
      title: "Searching inside text",
      text: "`find()` gives the position of the first match, or `-1` for no match. `count()` counts non-overlapping matches.",
      code: 'text = "banana"\nprint(text.find("an"))\nprint(text.find("x"))\nprint(text.count("an"))\nprint(text.startswith("ban"), text.endswith("na"))',
    },
  ],

  mistakes: [
    {
      title: "Calling a method without keeping its result",
      text: "`code.upper()` makes an uppercase copy and throws it away. `code` is unchanged.",
      code: 'code = "ab-12"\ncode.upper()\nprint(code)',
      fix: "Assign the result: `code = code.upper()`.",
    },
    {
      title: "Expecting strip() to remove spaces in the middle",
      text: "`strip()` only trims the ends, so the double space between the words remains.",
      code: 'name = "  Ada   Lovelace "\nprint("[" + name.strip() + "]")',
      fix: "To tidy the inside too, split the text into words and join them with single spaces. That's the next lesson.",
    },
    {
      title: "Forgetting the brackets",
      text: "Without `()`, `name.upper` is the method itself, not uppercase text, so adding `\"!\"` to it is a `TypeError`.",
      code: 'name = "ada"\nshout = name.upper\nprint(shout + "!")',
      raises: "TypeError",
      fix: "Call the method: `name.upper()`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Clean a sign-up form",
      prompt:
        "A sign-up form saved a name and an email exactly as they were typed. Store a cleaned name in `name` (no spaces at either end, each word capitalised) and a cleaned email in `email` (no spaces at either end, all lowercase), then print both. Check answer also tries other messy input.",
      expectedOutput: "Ada Lovelace\nada@example.com\n",
      looksFor: [
        "`name` is `\"Ada Lovelace\"` and `email` is `\"ada@example.com\"`.",
        "Both are cleaned from the raw values with string methods, so other input is cleaned too.",
      ],
      starter: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\n\n# Clean them into name and email, then print both.\n',
      task: {
        checks: [
          { kind: "variable", id: "name", name: "name", expected: py.str("Ada Lovelace"), tip: "strip() trims the ends; title() capitalises each word." },
          { kind: "variable", id: "email", name: "email", expected: py.str("ada@example.com"), tip: "strip() removes the new line at the end too; then lower()." },
          { kind: "output", id: "output", label: "Prints both", expected: "Ada Lovelace\nada@example.com\n" },
          { kind: "variant", id: "v-other", set: { raw_name: py.str("grace HOPPER "), raw_email: py.str("\tGrace.Hopper@NAVY.mil  ") }, output: "Grace Hopper\ngrace.hopper@navy.mil\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { raw_name: py.str("ALAN turing"), raw_email: py.str("alan@bletchley.ORG") }, vars: { name: py.str("Alan Turing"), email: py.str("alan@bletchley.org") } },
        ],
      },
      hints: [
        "Methods can be chained: raw_name.strip() gives a trimmed string you can call another method on.",
        "name = raw_name.strip().title().",
        "email = raw_email.strip().lower(), then print(name) and print(email).",
      ],
      answer: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\n\nname = raw_name.strip().title()\nemail = raw_email.strip().lower()\nprint(name)\nprint(email)',
      alternatives: ['raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\nname = raw_name.title().strip()\nemail = raw_email.lower()\nemail = email.strip()\nprint(name)\nprint(email)\n'],
      wrong: [
        { code: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\nname = raw_name.title()\nemail = raw_email.lower()\nprint(name)\nprint(email)\n', fails: ["name", "email", "output", "v-other"], why: "no strip" },
        { code: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\nname = raw_name.strip().capitalize()\nemail = raw_email.strip().lower()\nprint(name)\nprint(email)\n', fails: ["name", "output", "v-other", "v-hidden"], why: "capitalize only does the first word" },
        { code: 'raw_name = "   aDa LOVELACE  "\nraw_email = " Ada@Example.COM\\n"\nraw_name.strip().title()\nraw_email.strip().lower()\nname = raw_name\nemail = raw_email\nprint(name)\nprint(email)\n', fails: ["name", "email", "output", "v-other", "v-hidden"], why: "results thrown away" },
      ],
    },
    {
      id: "challenge-2",
      title: "Normalise a phone number",
      prompt:
        "Phone numbers arrive with brackets, spaces and dashes. Store just the digits in `digits` by removing `(`, `)`, spaces and `-`. Then store whether the number is a London number (the digits start with `020`) in `is_london`, and how many digits there are in `length`. Print all three as shown.",
      expectedOutput: "Digits: 02079460018\nLondon: True\nLength: 11\n",
      looksFor: [
        "`digits` is `\"02079460018\"`, with every bracket, space and dash removed.",
        "`is_london` is `True` (from `startswith`) and `length` is `11`.",
        "It works for other numbers too.",
      ],
      starter: 'raw = "(020) 7946-0018"\n\n# Store digits, is_london and length, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "digits", name: "digits", expected: py.str("02079460018"), tip: 'Chain replace() calls, replacing each unwanted character with "".' },
          { kind: "variable", id: "is-london", name: "is_london", expected: py.bool(true), tip: 'digits.startswith("020") gives True or False.' },
          { kind: "variable", id: "length", name: "length", expected: py.int(11) },
          { kind: "output", id: "output", label: "Prints the three lines", expected: "Digits: 02079460018\nLondon: True\nLength: 11\n" },
          { kind: "variant", id: "v-other", set: { raw: py.str("0161 496-0123") }, output: "Digits: 01614960123\nLondon: False\nLength: 11\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { raw: py.str("(020)-555 01") }, vars: { digits: py.str("02055501"), is_london: py.bool(true), length: py.int(8) } },
        ],
      },
      hints: [
        'raw.replace("(", "") deletes the opening brackets. Chain one replace() per unwanted character.',
        'is_london = digits.startswith("020").',
        "length = len(digits).",
      ],
      answer: 'raw = "(020) 7946-0018"\n\ndigits = raw.replace("(", "").replace(")", "").replace(" ", "").replace("-", "")\nis_london = digits.startswith("020")\nlength = len(digits)\nprint("Digits:", digits)\nprint("London:", is_london)\nprint("Length:", length)',
      wrong: [
        { code: 'raw = "(020) 7946-0018"\ndigits = raw.replace("(", "").replace(")", "").replace("-", "")\nis_london = digits.startswith("020")\nlength = len(digits)\nprint("Digits:", digits)\nprint("London:", is_london)\nprint("Length:", length)\n', fails: ["digits", "length", "output", "v-other", "v-hidden"], why: "spaces left in" },
        { code: 'raw = "(020) 7946-0018"\ndigits = raw.replace("(", "").replace(")", "").replace(" ", "").replace("-", "")\nis_london = raw.startswith("020")\nlength = len(digits)\nprint("Digits:", digits)\nprint("London:", is_london)\nprint("Length:", length)\n', fails: ["is-london", "output", "v-hidden"], why: "checked raw, which starts with (" },
        { code: 'raw = "(020) 7946-0018"\ndigits = raw.replace("(", "").replace(")", "").replace(" ", "").replace("-", "")\nis_london = digits.startswith("020")\nlength = len(raw)\nprint("Digits:", digits)\nprint("London:", is_london)\nprint("Length:", length)\n', fails: ["length", "output", "v-other", "v-hidden"], why: "length of the raw text" },
      ],
    },
  ],

  quiz: [
    {
      id: "chain",
      prompt: "What does this program print?",
      code: 'tag = "  Sale-Item "\ntag.lower()\nprint("[" + tag.strip().replace("-", " ") + "]")',
      options: [
        { text: "`[Sale Item]`", correct: true, why: "Line 2's result is thrown away, so `tag` keeps its capitals. Line 3 trims the ends, then replaces the dash with a space." },
        { text: "`[sale item]`", why: "`tag.lower()` on line 2 isn't assigned back to `tag`, so it changes nothing." },
        { text: "`[  Sale Item ]`", why: "`strip()` removes the spaces at both ends before the brackets are added." },
        { text: "`[Sale-Item]`", why: "`replace(\"-\", \" \")` swaps the dash for a space." },
      ],
    },
    {
      id: "find",
      prompt: "`email = \"ana@mail.com\"`. What is `email.find(\"@\")`?",
      options: [
        { text: "`3`", correct: true, why: "a, n, a are at indexes 0, 1 and 2, so the `@` is at index 3." },
        { text: "`4`", why: "Indexes start at 0: the fourth character is at index 3." },
        { text: "`True`", why: "`find()` gives a position. For a yes/no answer, use `\"@\" in email` or `startswith()`." },
        { text: "`-1`", why: "`-1` means not found, but the email does contain `@`." },
      ],
    },
  ],

  outcomes: [
    "Call string methods, and keep their result by assigning it.",
    "Trim text with `strip()` and change case with `lower()`, `upper()` and `title()`.",
    "Replace or delete characters with `replace()`, and search with `find()`, `count()`, `startswith()` and `endswith()`.",
    "Chain several methods to clean a value in one expression.",
  ],
};
