import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const textValidationAndUnicodeBasics: PyLesson = {
  slug: "text-validation-and-unicode-basics",
  ref: "python:text-validation-and-unicode-basics",
  module: "strings",
  number: 6,
  title: "Text validation and Unicode basics",
  level: "beginner",
  summary:
    "Ask questions about text: is it all digits, all letters, a given length, does it contain something? And see what Unicode means for real-world text: accented letters, characters as numbers, and comparing text without caring about case.",

  sections: [
    {
      label: "asking questions about text",
      blocks: [
        {
          kind: "p",
          text: "Some string methods answer a yes/no question with `True` or `False`: `isdigit()` (every character is a digit), `isalpha()` (every character is a letter), `isalnum()` (letters or digits), `isupper()`, `islower()` and `isspace()`. They are all `False` for the empty string.",
        },
        {
          kind: "p",
          text: "`part in text` asks whether `part` appears anywhere in `text`: `\"@\" in \"ada@example.com\"` is `True`. `len(text) == 6` asks whether the length is exactly 6. Store the answers in variables, and you can print them or, in the next module, make decisions with them.",
        },
        {
          kind: "p",
          text: "Two answers can be combined with `and`: `a and b` is `True` only when both are `True`. Conditions and Logic covers `and`, `or` and `not` properly; here it's enough for checks like “letters, and capitals”.",
        },
        { kind: "code", code: 'code = "AB1234"\nletters_ok = code[:2].isalpha()   # True\ndigits_ok = code[2:].isdigit()    # True\nlength_ok = len(code) == 6        # True' },
      ],
    },
    {
      label: "Unicode: text is more than English letters",
      blocks: [
        {
          kind: "p",
          text: "Python strings are **Unicode**: they can hold letters from any language, accents, symbols and emoji. Each character has a number, its **code point**. `ord(\"A\")` is `65` and `chr(97)` is `\"a\"`. `len()` counts characters, so `len(\"café\")` is 4.",
        },
        {
          kind: "p",
          text: "`isdigit()` accepts more than 0 to 9: superscript `\"²\"` and digits from other scripts count too. When you need exactly the ASCII digits 0–9 (say, for a card number), check `text.isascii() and text.isdigit()`, or compare characters against `\"0123456789\"`.",
        },
      ],
    },
    {
      label: "comparing text without case",
      blocks: [
        {
          kind: "p",
          text: "`==` compares text exactly, so `\"Ada\" == \"ada\"` is `False`. For comparisons that ignore case, use `casefold()`: like `lower()`, but it also handles letters that have no simple lowercase, such as German `ß`, which casefolds to `ss`.",
        },
        { kind: "code", code: 'print("STRASSE".lower() == "straße".lower())        # False\nprint("STRASSE".casefold() == "straße".casefold())  # True' },
      ],
    },
  ],

  example: {
    caption: "Checking a product code and an email address. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'code = "AB1234"\nprint("Length OK:", len(code) == 6)\nprint("Starts with letters:", code[:2].isalpha())\nprint("Ends with digits:", code[2:].isdigit())\n\nemail = "ada@example.com"\nprint("Has @:", "@" in email)\nprint("Has a space:", " " in email)',
  },

  walkthrough: [
    {
      title: "is… methods answer True or False",
      text: "Each method checks every character. Mixed text fails all three, and the empty string is never digits.",
      code: 'print("2026".isdigit(), "Ada".isalpha(), "B12".isalnum())\nprint("B-12".isalnum(), "".isdigit())',
    },
    {
      title: "in checks for a piece of text",
      text: "`in` looks for the exact characters anywhere in the string, and it's case-sensitive.",
      code: 'email = "ada@example.com"\nprint("@" in email)\nprint("example" in email)\nprint("EXAMPLE" in email)',
    },
    {
      title: "Characters are numbers underneath",
      text: "`ord()` gives a character's code point and `chr()` goes back. The accented `é` is one character with its own number.",
      code: 'print(ord("A"), ord("a"), chr(66))\nprint(len("café"), ord("é"))',
    },
    {
      title: "casefold() for case-insensitive comparisons",
      text: "`lower()` leaves `ß` alone, so the first comparison fails. `casefold()` turns it into `ss`.",
      code: 'a = "STRASSE"\nb = "straße"\nprint(a.lower(), b.lower(), a.lower() == b.lower())\nprint(a.casefold(), b.casefold(), a.casefold() == b.casefold())',
    },
  ],

  mistakes: [
    {
      title: "Checking a whole string when only part should be digits",
      text: "`\"AB1234\"` contains letters, so `isdigit()` on the whole code is `False`, even though the number part is fine.",
      code: 'code = "AB1234"\nprint(code.isdigit())',
      fix: "Slice out the part you mean first: `code[2:].isdigit()`.",
    },
    {
      title: "Trusting isdigit() for 0–9 only",
      text: "A superscript two counts as a digit, so this “PIN” passes `isdigit()`, but `int()` can't convert it.",
      code: 'pin = "12²4"\nprint(pin.isdigit())\nprint(int(pin))',
      raises: "ValueError",
      fix: "For plain 0–9 digits, also require `pin.isascii()`.",
    },
    {
      title: "Comparing typed text exactly",
      text: "The same username with different capitals compares as different.",
      code: 'saved = "Ada.Lovelace"\ntyped = "ada.lovelace"\nprint(saved == typed)',
      fix: "Compare normalised versions: `saved.casefold() == typed.casefold()`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Check a product code",
      prompt:
        "Valid product codes are 6 characters: 2 capital letters, then 4 digits. Store the answer to each rule in a variable: `length_ok` (exactly 6 characters), `letters_ok` (the first 2 are capital letters) and `digits_ok` (the last 4 are digits). Print them as shown. Check answer also tries invalid codes.",
      expectedOutput: "Length OK: True\nLetters OK: True\nDigits OK: True\n",
      looksFor: [
        "`length_ok`, `letters_ok` and `digits_ok` are `True` for `\"AB1234\"`.",
        "Each is calculated from `code`, so an invalid code gives `False` for the rule it breaks.",
      ],
      starter: 'code = "AB1234"\n\n# Store length_ok, letters_ok and digits_ok, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "length-ok", name: "length_ok", expected: py.bool(true), tip: "len(code) == 6 gives True or False." },
          { kind: "variable", id: "letters-ok", name: "letters_ok", expected: py.bool(true) },
          { kind: "variable", id: "digits-ok", name: "digits_ok", expected: py.bool(true) },
          { kind: "output", id: "output", label: "Prints the three answers", expected: "Length OK: True\nLetters OK: True\nDigits OK: True\n" },
          { kind: "variant", id: "v-lower", set: { code: py.str("ab1234") }, vars: { length_ok: py.bool(true), letters_ok: py.bool(false), digits_ok: py.bool(true) }, tip: "Lowercase letters are letters, but not capitals: check both isalpha() and isupper()." },
          { kind: "variant", id: "v-digits", set: { code: py.str("AB12X4") }, output: "Length OK: True\nLetters OK: True\nDigits OK: False\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { code: py.str("A12345") }, vars: { length_ok: py.bool(true), letters_ok: py.bool(false), digits_ok: py.bool(true) } },
        ],
      },
      hints: [
        "length_ok = len(code) == 6.",
        "The letters are code[:2]. They must be letters (isalpha()) and capitals (isupper()): you can combine two True/False answers with and.",
        "digits_ok = code[2:].isdigit().",
      ],
      answer: 'code = "AB1234"\n\nlength_ok = len(code) == 6\nletters_ok = code[:2].isalpha() and code[:2].isupper()\ndigits_ok = code[2:].isdigit()\nprint("Length OK:", length_ok)\nprint("Letters OK:", letters_ok)\nprint("Digits OK:", digits_ok)',
      alternatives: ['code = "AB1234"\nlength_ok = len(code) == 6\nletters = code[0:2]\nletters_ok = letters.isalpha() and letters == letters.upper()\ndigits_ok = code[-4:].isdigit()\nprint("Length OK:", length_ok)\nprint("Letters OK:", letters_ok)\nprint("Digits OK:", digits_ok)\n'],
      wrong: [
        { code: 'code = "AB1234"\nlength_ok = len(code) == 6\nletters_ok = code[:2].isalpha()\ndigits_ok = code[2:].isdigit()\nprint("Length OK:", length_ok)\nprint("Letters OK:", letters_ok)\nprint("Digits OK:", digits_ok)\n', fails: ["v-lower"], why: "doesn't check capitals" },
        { code: 'code = "AB1234"\nlength_ok = len(code) == 6\nletters_ok = code[:2].isupper()\ndigits_ok = code.isdigit()\nprint("Length OK:", length_ok)\nprint("Letters OK:", letters_ok)\nprint("Digits OK:", digits_ok)\n', fails: ["digits-ok", "output", "v-lower", "v-hidden"], why: "isdigit on the whole code" },
        { code: 'code = "AB1234"\nlength_ok = True\nletters_ok = True\ndigits_ok = True\nprint("Length OK:", length_ok)\nprint("Letters OK:", letters_ok)\nprint("Digits OK:", digits_ok)\n', fails: ["v-lower", "v-digits", "v-hidden"], why: "fixed answers" },
      ],
    },
    {
      id: "challenge-2",
      title: "Match usernames regardless of case",
      prompt:
        "A login form compares the `saved` username with what was `typed`, ignoring capitals and surrounding spaces. Store the comparison in `same_user`, using `strip()` and `casefold()` on both. Also store whether the typed name contains a space in the middle in `has_space` (after stripping). Print both as shown.",
      expectedOutput: "Same user: True\nHas a space: False\n",
      looksFor: [
        "`same_user` is `True` when the names match after stripping and casefolding, and `False` otherwise.",
        "`has_space` is `True` only when the stripped typed name contains a space.",
        "It works for other names, including `ß`.",
      ],
      starter: 'saved = "Ada.Lovelace"\ntyped = "  ADA.lovelace "\n\n# Store same_user and has_space, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "same-user", name: "same_user", expected: py.bool(true), tip: "Compare saved.strip().casefold() with typed.strip().casefold()." },
          { kind: "variable", id: "has-space", name: "has_space", expected: py.bool(false), tip: 'After stripping, check " " in the result.' },
          { kind: "output", id: "output", label: "Prints both answers", expected: "Same user: True\nHas a space: False\n" },
          { kind: "variant", id: "v-different", set: { saved: py.str("ada"), typed: py.str("adam") }, output: "Same user: False\nHas a space: False\n" },
          { kind: "variant", id: "v-sharp-s", set: { saved: py.str("Strauß"), typed: py.str("STRAUSS") }, vars: { same_user: py.bool(true) }, tip: "lower() keeps ß as ß; casefold() turns it into ss." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { saved: py.str("ana maria"), typed: py.str(" Ana Maria") }, vars: { same_user: py.bool(true), has_space: py.bool(true) } },
        ],
      },
      hints: [
        "Normalise both sides the same way: .strip() and then .casefold().",
        "same_user = saved.strip().casefold() == typed.strip().casefold().",
        'has_space = " " in typed.strip().',
      ],
      answer: 'saved = "Ada.Lovelace"\ntyped = "  ADA.lovelace "\n\nsame_user = saved.strip().casefold() == typed.strip().casefold()\nhas_space = " " in typed.strip()\nprint("Same user:", same_user)\nprint("Has a space:", has_space)',
      wrong: [
        { code: 'saved = "Ada.Lovelace"\ntyped = "  ADA.lovelace "\nsame_user = saved.strip().lower() == typed.strip().lower()\nhas_space = " " in typed.strip()\nprint("Same user:", same_user)\nprint("Has a space:", has_space)\n', fails: ["v-sharp-s"], why: "lower() misses ß" },
        { code: 'saved = "Ada.Lovelace"\ntyped = "  ADA.lovelace "\nsame_user = saved.casefold() == typed.casefold()\nhas_space = " " in typed\nprint("Same user:", same_user)\nprint("Has a space:", has_space)\n', fails: ["same-user", "has-space", "output", "v-hidden"], why: "no strip" },
      ],
    },
  ],

  quiz: [
    {
      id: "methods",
      prompt: "Which expression is `True`?",
      options: [
        { text: '`"R2D2".isalnum()`', correct: true, why: "Every character is a letter or a digit." },
        { text: '`"R2-D2".isalnum()`', why: "The dash is neither a letter nor a digit, so the whole check is `False`." },
        { text: '`"".isdigit()`', why: "All the `is…` checks are `False` for the empty string: there are no digits in it." },
        { text: '`"12.5".isdigit()`', why: "The decimal point isn't a digit, so this is `False`. `isdigit()` doesn't recognise numbers, only digit characters." },
      ],
    },
    {
      id: "len-unicode",
      prompt: "What does this program print?",
      code: 'print(len("naïve"), "Ï".lower() == "ï")',
      options: [
        { text: "`5 True`", correct: true, why: "`ï` is one character, so there are five. Accented capitals have lowercase forms too." },
        { text: "`6 True`", why: "`len()` counts characters, and `ï` is a single character." },
        { text: "`5 False`", why: "`lower()` works on letters from many languages, not just A to Z." },
        { text: "A `UnicodeError`", why: "Python strings are Unicode: accented letters are ordinary characters." },
      ],
    },
  ],

  outcomes: [
    "Check text with `isdigit()`, `isalpha()`, `isalnum()`, `isupper()`, `in` and `len()`.",
    "Store the results of checks as `True`/`False` values.",
    "Explain what Unicode code points are, using `ord()` and `chr()`.",
    "Compare text regardless of case with `casefold()`, and know why it beats `lower()` for that.",
  ],
};
