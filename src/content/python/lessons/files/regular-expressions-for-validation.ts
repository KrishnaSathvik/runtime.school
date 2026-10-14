import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));

const LOG = `2026-10-14 09:00:01 INFO  ORD-10021 created by ana@example.com
2026-10-14 09:00:07 WARN  ORD-10021 payment retry (attempt 2)
2026-10-14 09:01:15 ERROR ORD-10022 card declined
2026-10-14 09:02:00 INFO  ORD-10023 created by ben@example.org
garbled line without a timestamp
2026-10-14 09:03:44 ERROR ORD-1002 malformed order id
`;

export const regularExpressionsForValidation: PyLesson = {
  slug: "regular-expressions-for-validation",
  ref: "python:regular-expressions-for-validation",
  module: "files",
  number: 5,
  title: "Regular expressions for validation",
  level: "intermediate",
  summary:
    "Describe the shape of valid text with a regular expression: check that a whole value matches (`re.fullmatch`), find pieces inside longer text (`re.search`, `re.findall`), and pull out parts with groups. Use them where string methods get awkward, and keep them readable.",
  files: { "app.log": LOG },

  sections: [
    {
      label: "patterns",
      blocks: [
        {
          kind: "p",
          text: "A **regular expression** (regex) is a small pattern language for text. Most characters match themselves; a few have special meanings. `\\d` is any digit, `\\w` any letter, digit or underscore, `\\s` any whitespace, `.` any character. `[A-Z]` is one character from a set or range. A **quantifier** after an item says how many: `{4}` exactly four, `{2,5}` two to five, `+` one or more, `*` zero or more, `?` optional.",
        },
        { kind: "code", code: 'import re\n\nORDER_ID = r"ORD-\\d{5}"          # ORD-, then exactly five digits\nprint(bool(re.fullmatch(ORDER_ID, "ORD-10021")))   # True\nprint(bool(re.fullmatch(ORDER_ID, "ORD-1002")))    # False' },
        {
          kind: "p",
          text: "Write patterns as **raw strings**, `r\"…\"`, so Python leaves the backslashes alone for the regex to read.",
        },
      ],
    },
    {
      label: "fullmatch, search, findall",
      blocks: [
        {
          kind: "p",
          text: "For **validation**, use `re.fullmatch(pattern, text)`: the whole text must match, so `ORD-100210` is rejected. `re.search` finds the **first** match anywhere in the text, `re.findall` returns **all** matches as a list, and `re.sub(pattern, replacement, text)` replaces them. `fullmatch` and `search` return a match object, or `None` when nothing matches, so test the result with `if`.",
        },
        {
          kind: "p",
          text: "When finding IDs inside longer text, `\\b` (a word boundary) stops `ORD-\\d{5}` from matching the first five digits of `ORD-543210`.",
        },
      ],
    },
    {
      label: "groups",
      blocks: [
        {
          kind: "p",
          text: "Brackets make a **group**: the part of the match you want to extract. `m.group(1)` is the first group's text, and `m.groups()` all of them. With `re.findall`, a pattern with groups returns tuples of the groups.",
        },
        {
          kind: "p",
          text: "Regexes are powerful but easy to get subtly wrong and hard to read. Use string methods when they're enough (`startswith`, `isdigit`, `split`), give patterns a name, and test them on examples that should **and** shouldn't match. Don't try to validate everything with a regex: real email addresses, for instance, are far more varied than any short pattern.",
        },
      ],
    },
  ],

  example: {
    caption: "Validating IDs and extracting fields from a log (app.log is in the Files list). Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import re\n\nLINE = re.compile(r"(\\d{4}-\\d{2}-\\d{2}) (\\d{2}:\\d{2}:\\d{2}) (INFO|WARN|ERROR)\\s+(ORD-\\d+) (.*)")\n\nwith open("app.log", encoding="utf-8") as f:\n    for line in f:\n        m = LINE.fullmatch(line.strip())\n        if m is None:\n            print("skipped:", line.strip())\n            continue\n        day, time, level, order_id, message = m.groups()\n        valid = re.fullmatch(r"ORD-\\d{5}", order_id) is not None\n        print(f"{time} {level:<5} {order_id:<10} valid={valid}")',
  },

  walkthrough: [
    {
      title: "fullmatch checks the whole text",
      text: "Only the first matches exactly: one is too short, one too long, and one has lowercase letters.",
      code: 'import re\nfor text in ["ORD-10021", "ORD-1002", "ORD-100210", "ord-10021"]:\n    print(text, bool(re.fullmatch(r"ORD-\\d{5}", text)))',
    },
    {
      title: "search finds; findall finds them all",
      text: "`search` returns a match object for the first hit; `findall` returns every match. `\\b` stops a partial match inside a longer ID.",
      code: 'import re\ntext = "Refund ORD-12345 and ORD-67890, but not ORD-543210"\nprint(re.search(r"ORD-\\d{5}", text).group())\nprint(re.findall(r"ORD-\\d{5}", text))\nprint(re.findall(r"\\bORD-\\d{5}\\b", text))',
    },
    {
      title: "Groups pull out parts",
      text: "Each bracketed part becomes a group. `findall` with two groups returns pairs.",
      code: 'import re\nm = re.fullmatch(r"(\\d{4})-(\\d{2})-(\\d{2})", "2026-10-14")\nprint(m.groups(), m.group(1))\nprint(re.findall(r"(\\w+)@([\\w.]+)", "ana@example.com, ben@site.org"))',
    },
    {
      title: "sub replaces matches",
      text: "`\\s+` matches any run of whitespace; replacing it with one space tidies the text.",
      code: 'import re\nprint(re.sub(r"\\s+", " ", "  too   many \\t spaces ").strip())\nprint(re.sub(r"\\d", "#", "Card 4111 1111 1111 1234")[:-4] + "1234")',
    },
  ],

  mistakes: [
    {
      title: "Using search for validation",
      text: "`search` is happy to find the pattern **inside** the text, so a value with extra characters passes as “valid”.",
      code: 'import re\ncode = "XXORD-10021YY"\nprint(bool(re.search(r"ORD-\\d{5}", code)))',
      fix: "Use `re.fullmatch` to require the whole value to match.",
    },
    {
      title: "Calling .group() on no match",
      text: "When nothing matches, `search` returns `None`, and `None.group()` is an `AttributeError`.",
      code: 'import re\nm = re.search(r"ORD-\\d{5}", "no order here")\nprint(m.group())',
      raises: "AttributeError",
      fix: "Check first: `if m is not None:` (or `if m:`) before using the match.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Validate product codes",
      prompt:
        "Valid product codes look like `AB-1234-X`: two capital letters, a dash, four digits, a dash, and one capital letter or digit as a check character. Write `is_valid_code(code)`, which returns `True` only for codes of exactly that shape (after stripping spaces at the ends), using `re.fullmatch`.",
      looksFor: [
        "`is_valid_code(\"AB-1234-X\")` and `is_valid_code(\"ZZ-0000-9\")` are `True`.",
        "Lowercase letters, wrong lengths and extra characters give `False`.",
        "Spaces around the code are ignored.",
      ],
      starter: "import re\n\n\ndef is_valid_code(code):\n    # Return True for codes like AB-1234-X.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "is_valid_code",
            cases: [
              { args: [s("AB-1234-X")], expected: py.bool(true) },
              { args: [s("ZZ-0000-9")], expected: py.bool(true) },
              { args: [s(" AB-1234-X ")], expected: py.bool(true) },
              { args: [s("ab-1234-X")], expected: py.bool(false) },
              { args: [s("AB-123-X")], expected: py.bool(false) },
              { args: [s("AB-1234-XY")], expected: py.bool(false) },
              { args: [s("XAB-1234-X")], expected: py.bool(false), hidden: true },
              { args: [s("AB-1234-x")], expected: py.bool(false), hidden: true },
              { args: [s("")], expected: py.bool(false), hidden: true },
            ],
            tip: 'r"[A-Z]{2}-\\d{4}-[A-Z0-9]" with re.fullmatch, and return the comparison with None as a bool.',
          },
        ],
      },
      hints: [
        "Two capitals: [A-Z]{2}. Four digits: \\d{4}. One capital or digit: [A-Z0-9].",
        "Join them with dashes in a raw string: r\"[A-Z]{2}-\\d{4}-[A-Z0-9]\".",
        "return re.fullmatch(PATTERN, code.strip()) is not None.",
      ],
      answer: 'import re\n\nCODE = r"[A-Z]{2}-\\d{4}-[A-Z0-9]"\n\n\ndef is_valid_code(code):\n    """Return True if code looks like AB-1234-X."""\n    return re.fullmatch(CODE, code.strip()) is not None',
      wrong: [
        { code: 'import re\n\ndef is_valid_code(code):\n    return re.search(r"[A-Z]{2}-\\d{4}-[A-Z0-9]", code) is not None\n', fails: ["fn"], why: "search accepts extra characters" },
        { code: 'import re\n\ndef is_valid_code(code):\n    return re.fullmatch(r"[A-Z]{2}-\\d{4}-[A-Z0-9]", code) is not None\n', fails: ["fn"], why: "doesn't strip" },
        { code: 'import re\n\ndef is_valid_code(code):\n    return re.fullmatch(r"\\w{2}-\\d{4}-\\w", code.strip()) is not None\n', fails: ["fn"], why: "\\w allows lowercase" },
      ],
    },
    {
      id: "challenge-2",
      title: "Count log levels",
      prompt:
        "Write `count_levels(path)`, which reads a log file shaped like `app.log` and returns a dictionary counting the lines at each level (`INFO`, `WARN`, `ERROR`). Only lines that start with a date and time (`YYYY-MM-DD HH:MM:SS`) followed by a level count; ignore any other lines. Use a regular expression with a group for the level.",
      looksFor: [
        "Well-formed lines are counted by their level.",
        "Garbled lines are ignored.",
        "Levels that don't appear aren't in the dictionary.",
      ],
      starter: "import re\n\n\ndef count_levels(path):\n    # Return {level: number of lines}.\n    pass\n\n\nprint(count_levels(\"app.log\"))\n",
      task: {
        files: { "small.log": "2026-01-01 00:00:00 INFO start\nINFO missing timestamp\n2026-01-01 00:00:05 DEBUG ignored level\n2026-01-01 00:00:09 INFO  done\n" },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "count_levels",
            cases: [
              { args: [s("app.log")], expected: py.dict([[s("INFO"), i(2)], [s("WARN"), i(1)], [s("ERROR"), i(2)]]) },
              { args: [s("small.log")], expected: py.dict([[s("INFO"), i(2)]]), hidden: true },
            ],
            tip: 'Something like r"\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} (INFO|WARN|ERROR)\\b" with re.match (which anchors at the start), then count group(1).',
          },
        ],
      },
      hints: [
        "re.match(pattern, line) only matches at the start of the line (fullmatch would need the whole line).",
        'Put the level in a group: (INFO|WARN|ERROR). A line with DEBUG won\'t match.',
        "For a match m: counts[m.group(1)] = counts.get(m.group(1), 0) + 1.",
      ],
      answer: 'import re\n\nLEVEL = re.compile(r"\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} (INFO|WARN|ERROR)\\b")\n\n\ndef count_levels(path):\n    """Return {level: count} for well-formed log lines."""\n    counts = {}\n    with open(path, encoding="utf-8") as f:\n        for line in f:\n            m = LEVEL.match(line)\n            if m:\n                counts[m.group(1)] = counts.get(m.group(1), 0) + 1\n    return counts\n\n\nprint(count_levels("app.log"))',
      wrong: [
        { code: 'def count_levels(path):\n    counts = {}\n    with open(path, encoding="utf-8") as f:\n        for line in f:\n            for level in ("INFO", "WARN", "ERROR"):\n                if level in line:\n                    counts[level] = counts.get(level, 0) + 1\n    return counts\n', fails: ["fn"], why: "counts the garbled line too" },
      ],
    },
  ],

  quiz: [
    {
      id: "fullmatch",
      prompt: 'Which value does `re.fullmatch(r"\\d{3}-\\d{4}", value)` accept?',
      options: [
        { text: '`"555-0199"`', correct: true, why: "Three digits, a dash, four digits: the whole value fits." },
        { text: '`"555-01999"`', why: "Five digits after the dash: `fullmatch` needs the whole text to fit exactly." },
        { text: '`"tel 555-0199"`', why: "`search` would find it inside, but `fullmatch` rejects the extra text." },
        { text: '`"555 0199"`', why: "The pattern requires a dash, not a space." },
      ],
    },
    {
      id: "none",
      prompt: "What does `re.search(r\"\\d+\", \"no digits\")` return?",
      options: [
        { text: "`None`", correct: true, why: "With no match, `search` returns `None`; check for it before calling `.group()`." },
        { text: '`""`', why: "No match is `None`, not an empty match." },
        { text: "`[]`", why: "An empty list is what `findall` returns when nothing matches." },
        { text: "It raises `ValueError`", why: "Not matching isn't an error; it's a `None` result." },
      ],
    },
  ],

  outcomes: [
    "Write patterns with character classes, sets and quantifiers, as raw strings.",
    "Validate whole values with `re.fullmatch`, and find matches with `search` and `findall`.",
    "Extract parts with groups, and replace with `re.sub`.",
    "Check for `None` before using a match, and prefer string methods when they're enough.",
  ],
};
