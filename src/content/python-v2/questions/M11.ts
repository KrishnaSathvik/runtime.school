/**
 * M11 practice: ten independent string-algorithm problems (PY-L11-01 … PY-L11-05).
 *
 * Every code question is a function graded on public examples and hidden inputs: empty text, only punctuation,
 * repeated separators, capitals, multi-digit counts, wrap-around, boundaries and malformed input.
 *
 * Mix: 4 function implementations, 2 validations, 2 debugging (genuinely broken functions), 1 data transformation,
 * 1 output prediction. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 * Fixtures: Open Food Facts-style ingredient lists (D12), CFPB-style complaint text (D03), organisation names, file
 * names, colour codes, bracketed code snippets, web query strings and real ISBNs.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

export const m11Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q11-02",
    version: 2,
    slug: "ingredients-split",
    title: "An ingredient list, split and joined",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "reassignment", "string-value", "string-split", "string-method", "value-count", "list-literal", "list-mutate", "len-call", "for-loop", "if-statement", "truthiness", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "spaces-in-text", "membership"],
    prompt: "Type exactly what this program prints. Work out the pieces `split(\",\")` produces before anything is cleaned.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`split(\",\")` cuts at every comma, so two commas in a row leave an empty piece.",
      "A piece of only spaces strips to an empty text, which is false in an `if`.",
      "`join` puts `\" + \"` between the kept pieces; `count` counts the commas in the original line.",
    ],
    explanation: "The line has three commas, so `split(\",\")` gives four pieces: `' Sugar'`, `'  salt '`, `''` and `'COCOA '`. The empty piece is skipped, and the others are stripped and lowered. `join` rebuilds them with ` + ` between, and `count(\",\")` is 3.",
    predict: {
      program: src`
line = " Sugar,  salt ,,COCOA "
parts = line.split(",")
clean = []
for part in parts:
    if part.strip():
        clean.append(part.strip().lower())
print(len(parts), clean)
print(" + ".join(clean), line.count(","))
`,
      output: "4 ['sugar', 'salt', 'cocoa']\nsugar + salt + cocoa 3\n",
      wrongPredictions: ["3 ['sugar', 'salt', 'cocoa']\nsugar + salt + cocoa 3", "4 ['sugar', 'salt', '', 'cocoa']\nsugar + salt +  + cocoa 3", "4 ['Sugar', 'salt', 'COCOA']\nSugar + salt + COCOA 3", "4 ['sugar', 'salt', 'cocoa']\nsugar+salt+cocoa 3"],
    },
  },
  {
    id: "PY-Q11-03",
    version: 2,
    slug: "file-extension-bug",
    title: "The file type is wrong for some uploads",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "string-find", "string-split", "string-method", "string-slice", "string-index", "list-index", "len-call", "arithmetic", "comparison", "if-statement", "print-call", "print-several", "unquoted-name", "top-level-indent", "print-text", "reassignment", "while-loop"],
    prompt: "An upload form decides how to store a file from its extension: the text after the **last** dot, in lower case, so `report.final.PDF` is `pdf`. A name with no dot, or ending in a dot, has no extension (`\"\"`). `file_extension` gets `report.final.PDF` wrong and returns the whole name for `README`. Fix it.",
    spec: [
      ["Function", "`file_extension(name)`"],
      ["Returns", "the lower-case text after the last `.`, or `\"\"` if there is no dot or nothing after it"],
    ],
    hiddenKinds: ["several dots", "no dot at all", "a name ending in a dot", "capital letters in the extension"],
    hints: [
      "Run it on `README`: `find` returns -1, and what does the slice do with -1 + 1?",
      "`find` gives the first dot. Splitting on dots gives every piece, and the last piece is after the last dot.",
      "With no dot, `split` gives one piece; that case has no extension.",
    ],
    explanation: "`find` returns the first dot, so `report.final.PDF` gave `final.pdf`, and -1 for `README` made the slice start at 0 and return the whole name. Splitting on `.` gives all the pieces; if there is only one piece there was no dot, otherwise the last piece is the extension (empty when the name ends in a dot).",
    code: {
      starter: src`
def file_extension(name):
    dot = name.find(".")
    return name[dot + 1:].lower()

print(file_extension("report.final.PDF"), file_extension("README"))
`,
      answer: src`
def file_extension(name):
    pieces = name.split(".")
    if len(pieces) == 1:
        return ""
    return pieces[-1].lower()

print(file_extension("report.final.PDF"), file_extension("README"))
`,
      alternatives: [
        src`
def file_extension(name):
    last = -1
    start = name.find(".")
    while start != -1:
        last = start
        start = name.find(".", start + 1)
    if last == -1:
        return ""
    return name[last + 1:].lower()
`,
      ],
      wrong: [
        {
          code: src`
def file_extension(name):
    dot = name.find(".")
    if dot == -1:
        return ""
    return name[dot + 1:].lower()
`,
          fails: ["returns"],
          why: "the no-dot case is fixed, but the first dot is still used, so `report.final.PDF` gives `final.pdf`",
        },
        {
          code: src`
def file_extension(name):
    return name.split(".")[-1].lower()
`,
          fails: ["returns"],
          why: "a name with no dot is one piece, so the whole name comes back as the extension",
        },
      ],
      task: {
        checks: [
          fn("returns", "file_extension", [
            example(["report.final.PDF"], "pdf"),
            example(["README"], ""),
            example(["photo.jpg"], "jpg"),
            hiddenCase("several dots", ["archive.tar.gz"], "gz"),
            hiddenCase("a name ending in a dot", ["draft."], ""),
            hiddenCase("capital letters in the extension", ["Budget 2024.XLSX"], "xlsx"),
            hiddenCase("no dot at all", ["Makefile"], ""),
          ], { label: "file_extension() returns what follows the last dot" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-06",
    version: 2,
    slug: "acronym-from-a-name",
    title: "An acronym from an organisation's name",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "string-method", "string-split", "string-index", "list-literal", "list-mutate", "for-loop", "enumerate-call", "membership", "logical", "comparison", "if-statement", "print-call", "unquoted-name", "top-level-indent", "print-text", "arithmetic", "continue-statement", "list-index", "len-call"],
    prompt: "A report lists organisations by their acronyms: `Consumer Financial Protection Bureau` is `CFPB`. Build the acronym from the first letter of each word, in capitals. Hyphens separate words too (`Run-Length Encoding` is `RLE`). The small words `of`, `and`, `the`, `for` are skipped, except when one is the first word.",
    spec: [
      ["Function", "`acronym(name)`"],
      ["Returns", "the capital first letters of the words, small words skipped unless first; `\"\"` for a name with no words"],
      ["Words", "separated by any whitespace or by `-`; small words are matched ignoring case"],
    ],
    hiddenKinds: ["a small word first", "hyphenated words", "small words in capitals", "extra spaces", "an empty name"],
    hints: [
      "Turn hyphens into spaces, then `split()` gives the words.",
      "Keep each word's position: the first word is always used.",
      "Compare the lowered word with the small words, and take `word[0].upper()` from each word you keep.",
    ],
    explanation: "Replacing `-` with a space lets one `split()` handle both separators and any amount of whitespace. `enumerate` gives each word's position so the first word is kept even when it is a small word. Lowering before the comparison catches `OF` and `The`. Upper-casing only the taken letter keeps the rest of the name untouched.",
    code: {
      starter: src`
def acronym(name):
    return ""

print(acronym("Consumer Financial Protection Bureau"))
`,
      answer: src`
SMALL = ["of", "and", "the", "for"]

def acronym(name):
    letters = ""
    for i, word in enumerate(name.replace("-", " ").split()):
        if i > 0 and word.lower() in SMALL:
            continue
        letters = letters + word[0].upper()
    return letters

print(acronym("Consumer Financial Protection Bureau"))
`,
      alternatives: [
        src`
def acronym(name):
    words = name.replace("-", " ").split()
    result = []
    for word in words:
        small = word.lower() in ["of", "and", "the", "for"]
        if small and len(result) > 0:
            continue
        result.append(word[0].upper())
    return "".join(result)
`,
      ],
      wrong: [
        {
          code: src`
def acronym(name):
    letters = ""
    for word in name.split(" "):
        if word.lower() in ["of", "and", "the", "for"]:
            continue
        letters = letters + word[0].upper()
    return letters
`,
          fails: ["returns"],
          why: "`split(\" \")` gives empty words for double spaces (IndexError), hyphens aren't split, and a small first word is dropped",
        },
        {
          code: src`
def acronym(name):
    letters = ""
    for word in name.replace("-", " ").split():
        if word in ["of", "and", "the", "for"]:
            continue
        letters = letters + word[0].upper()
    return letters
`,
          fails: ["returns"],
          why: "small words are compared without lowering, and a small first word is skipped",
        },
      ],
      task: {
        checks: [
          fn("returns", "acronym", [
            example(["Consumer Financial Protection Bureau"], "CFPB"),
            example(["Bureau of Labor Statistics"], "BLS"),
            example(["Run-Length Encoding"], "RLE"),
            hiddenCase("a small word first", ["The Open Group"], "TOG"),
            hiddenCase("small words in capitals", ["DEPARTMENT OF TRANSPORTATION"], "DT"),
            hiddenCase("extra spaces", ["  national   park  service "], "NPS"),
            hiddenCase("an empty name", ["   "], ""),
            hiddenCase("a small word inside a longer word", ["Theory and Practice"], "TP"),
          ], { label: "acronym() takes the first letters of the main words" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-10",
    version: 2,
    slug: "valid-hex-colour",
    title: "Is this a colour code?",
    format: "validation",
    difficulty: "easy",
    minutes: 8,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "boolean", "len-call", "string-index", "string-slice", "string-method", "string-check", "membership", "logical", "comparison", "if-statement", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "print-text", "hash-in-text", "arithmetic"],
    prompt: "A theme editor accepts colours as hex codes such as `#1A2b3C`: a `#` followed by exactly six hexadecimal digits (0–9 and a–f, in either case). Spaces at the ends are allowed. Check a typed colour before saving it.",
    spec: [
      ["Function", "`valid_colour(text)`"],
      ["Returns", "True for `#` plus six characters from `0123456789abcdefABCDEF` (after stripping); otherwise False"],
    ],
    hiddenKinds: ["a letter after f", "a missing #", "three-digit shorthand", "spaces at the ends", "an empty text"],
    hints: [
      "Strip first, then check the length and the first character.",
      "Lower the six characters after `#` so only `0123456789abcdef` needs checking.",
      "`isalnum` isn't enough: `g` is a letter but not a hex digit.",
    ],
    explanation: "The structural checks (length 7 and a leading `#`) come first so slicing is safe. Each remaining character must be in the hex digits; lowering first means one set of letters covers both cases. `isalnum` would accept `#12345g`, because `g` is alphanumeric but not hexadecimal.",
    code: {
      starter: src`
def valid_colour(text):
    return text.startswith("#")

print(valid_colour("#1A2b3C"), valid_colour("#12345g"))
`,
      answer: src`
def valid_colour(text):
    text = text.strip()
    if len(text) != 7 or text[0] != "#":
        return False
    for ch in text[1:].lower():
        if ch not in "0123456789abcdef":
            return False
    return True

print(valid_colour("#1A2b3C"), valid_colour("#12345g"))
`,
      alternatives: [
        src`
def valid_colour(text):
    code = text.strip()
    if not code.startswith("#") or len(code) != 7:
        return False
    hex_digits = "0123456789abcdefABCDEF"
    count = 0
    for ch in code[1:]:
        if ch in hex_digits:
            count += 1
    return count == 6
`,
      ],
      wrong: [
        {
          code: src`
def valid_colour(text):
    text = text.strip()
    return len(text) == 7 and text[0] == "#" and text[1:].isalnum()
`,
          fails: ["returns"],
          why: "`isalnum` accepts any letter, so `#12345g` passes",
        },
        {
          code: src`
def valid_colour(text):
    if len(text) != 7 or text[0] != "#":
        return False
    for ch in text[1:].lower():
        if ch not in "0123456789abcdef":
            return False
    return True
`,
          fails: ["returns"],
          why: "without strip, a code with a space at the end is rejected (and an empty text raises IndexError)",
        },
      ],
      task: {
        checks: [
          fn("returns", "valid_colour", [
            example(["#1A2b3C"], true),
            example(["#12345g"], false),
            example(["#ffffff"], true),
            hiddenCase("a missing #", ["1a2b3c"], false),
            hiddenCase("three-digit shorthand", ["#fff"], false),
            hiddenCase("spaces at the ends", ["  #00AA00 "], true),
            hiddenCase("an empty text", [""], false),
            hiddenCase("seven hex digits", ["#1234567"], false),
          ], { label: "valid_colour() accepts # and six hex digits" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q11-12",
    version: 2,
    slug: "run-length-decode",
    title: "Decode run-length text",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "none-value", "string-check", "string-index", "len-call", "conversion", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "while-loop", "print-call", "unquoted-name", "top-level-indent", "print-text", "precedence", "truthiness", "nested-loop", "membership", "identity", "nested-condition", "list-literal", "list-mutate"],
    prompt: "Run-length encoding writes each run as a character followed by its length: `W4B3W12` means 4 W, 3 B, then 12 W. Decode an encoded text. The length can have several digits. The character itself is never a digit. If the text breaks the format (starts with a digit, or a character has no length after it), return `None`.",
    spec: [
      ["Function", "`decode(encoded)`"],
      ["Returns", "the decoded text, `\"\"` for an empty input, or `None` if the format is broken"],
      ["Format", "one or more pairs of a non-digit character and a whole number of at least one digit"],
    ],
    hiddenKinds: ["a two-digit length", "a character with no length", "text that starts with a digit", "an empty text", "a space as the repeated character", "a length of zero"],
    hints: [
      "Walk the text with a position: read one character, then read every digit that follows it.",
      "`isdigit` tells you whether a character belongs to the length.",
      "No digits after a character, or a digit where a character should be, means the format is broken.",
    ],
    explanation: "Decoding is a small parser: take the character at the current position, then advance over digits to collect the length, convert it with `int`, and repeat the character that many times. Reading only one digit breaks on `W12`. Checking that the character isn't a digit and that at least one digit followed it catches malformed input instead of producing a wrong text.",
    code: {
      starter: src`
def decode(encoded):
    return ""

print(decode("W4B3W12"))
`,
      answer: src`
def decode(encoded):
    result = ""
    i = 0
    while i < len(encoded):
        ch = encoded[i]
        if ch.isdigit():
            return None
        i = i + 1
        digits = ""
        while i < len(encoded) and encoded[i].isdigit():
            digits = digits + encoded[i]
            i = i + 1
        if digits == "":
            return None
        result = result + ch * int(digits)
    return result

print(decode("W4B3W12"))
`,
      alternatives: [
        src`
def decode(encoded):
    pieces = []
    current = None
    number = ""
    for ch in encoded:
        if ch.isdigit():
            if current is None:
                return None
            number += ch
        else:
            if current is not None:
                if number == "":
                    return None
                pieces.append(current * int(number))
            current = ch
            number = ""
    if current is not None:
        if number == "":
            return None
        pieces.append(current * int(number))
    return "".join(pieces)
`,
      ],
      wrong: [
        {
          code: src`
def decode(encoded):
    result = ""
    for i in range(0, len(encoded), 2):
        result = result + encoded[i] * int(encoded[i + 1])
    return result
`,
          fails: ["returns"],
          why: "it assumes every length is one digit, so `W12` is read as 1 W followed by a character `2`",
        },
        {
          code: src`
def decode(encoded):
    result = ""
    i = 0
    while i < len(encoded):
        ch = encoded[i]
        i = i + 1
        digits = ""
        while i < len(encoded) and encoded[i].isdigit():
            digits = digits + encoded[i]
            i = i + 1
        if digits == "":
            digits = "1"
        result = result + ch * int(digits)
    return result
`,
          fails: ["returns"],
          why: "a character with no length is quietly treated as 1, and a leading digit is decoded as a character",
        },
      ],
      task: {
        checks: [
          fn("returns", "decode", [
            example(["W4B3W12"], "WWWWBBBWWWWWWWWWWWW"),
            example(["a1b1c1"], "abc"),
            example([""], ""),
            hiddenCase("a two-digit length", ["x10"], "xxxxxxxxxx"),
            hiddenCase("a character with no length", ["a2b"], null),
            hiddenCase("text that starts with a digit", ["3a"], null),
            hiddenCase("a space as the repeated character", [" 3a1"], "   a"),
            hiddenCase("a length of zero", ["a0b2"], "bb"),
          ], { label: "decode() expands every run, or returns None for broken input" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-13",
    version: 2,
    slug: "word-frequency-bug",
    title: "The word counts are split and repeated",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "string-split", "string-method", "value-count", "list-literal", "list-mutate", "tuple-literal", "membership", "if-statement", "for-loop", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "print-text", "comparison", "logical", "truthiness", "range-call", "len-call", "string-index", "string-slice", "list-index"],
    prompt: "`word_counts(text)` should return a list of `(word, count)` pairs, one per distinct word, in the order each word first appears. Words are compared in lower case with punctuation `.,!?;:` stripped from their ends. On a complaint it reports `Fee` and `fee,` as different words, and lists `fee` once for every time it appears. Fix it.",
    spec: [
      ["Function", "`word_counts(text)`"],
      ["Returns", "a new list of `(word, count)` tuples, distinct words in first-seen order"],
      ["Words", "split on whitespace, lowered, with `.,!?;:` stripped from the ends; words that become empty are ignored"],
    ],
    hiddenKinds: ["a word with punctuation on both sides", "only punctuation", "the same word in three spellings", "an empty text"],
    hints: [
      "Clean every word the same way before counting it.",
      "Count in the list of cleaned words, not in the raw text.",
      "Before appending a pair, check whether that word has already been reported.",
    ],
    explanation: "The words were counted raw, so case and attached punctuation split one word into several, and a pair was appended for every occurrence instead of once per distinct word. Build the list of cleaned words first, then walk it and append `(word, cleaned.count(word))` only for words not yet reported. Counting in the raw text with `text.count` would also count `fee` inside `feedback`.",
    code: {
      starter: src`
def word_counts(text):
    words = text.split()
    counts = []
    for word in words:
        counts.append((word, words.count(word)))
    return counts

print(word_counts("Fee charged. Another fee, fee waived?"))
`,
      answer: src`
def word_counts(text):
    cleaned = []
    for word in text.split():
        word = word.lower().strip(".,!?;:")
        if word != "":
            cleaned.append(word)
    counts = []
    seen = []
    for word in cleaned:
        if word in seen:
            continue
        seen.append(word)
        counts.append((word, cleaned.count(word)))
    return counts

print(word_counts("Fee charged. Another fee, fee waived?"))
`,
      alternatives: [
        src`
def word_counts(text):
    words = []
    for raw in text.lower().split():
        word = raw.strip(".,!?;:")
        if word:
            words.append(word)
    result = []
    for i in range(len(words)):
        if words[i] not in words[:i]:
            result.append((words[i], words.count(words[i])))
    return result
`,
      ],
      wrong: [
        {
          code: src`
def word_counts(text):
    words = []
    for word in text.split():
        words.append(word.lower().strip(".,!?;:"))
    counts = []
    for word in words:
        counts.append((word, words.count(word)))
    return counts
`,
          fails: ["returns"],
          why: "the words are cleaned, but a pair is still appended for every occurrence",
        },
        {
          code: src`
def word_counts(text):
    words = text.split()
    counts = []
    seen = []
    for word in words:
        word = word.lower().strip(".,!?;:")
        if word == "" or word in seen:
            continue
        seen.append(word)
        counts.append((word, text.lower().count(word)))
    return counts
`,
          fails: ["returns"],
          why: "counting in the raw text also counts the word inside longer words",
        },
      ],
      task: {
        checks: [
          fn("returns", "word_counts", [
            example(["Fee charged. Another fee, fee waived?"], [tup("fee", 3), tup("charged", 1), tup("another", 1), tup("waived", 1)]),
            example(["late late LATE"], [tup("late", 3)]),
            example([""], []),
            hiddenCase("a word inside a longer word", ["fee feedback fee"], [tup("fee", 2), tup("feedback", 1)]),
            hiddenCase("only punctuation", ["... !! ?"], []),
            hiddenCase("a word with punctuation on both sides", [":refund! refund"], [tup("refund", 2)]),
            hiddenCase("words separated by newlines", ["card\nCard;\ncard"], [tup("card", 3)]),
          ], { label: "word_counts() counts each cleaned word once, in first-seen order" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-16",
    version: 2,
    slug: "parse-a-query-string",
    title: "Read a web query string",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 14,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "string-split", "string-find", "string-method", "string-slice", "dict-literal", "dict-store", "comparison", "if-statement", "else-clause", "for-loop", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "print-text", "membership", "string-index", "list-mutate", "logical", "len-call"],
    prompt: "A search page's address ends with a query string such as `q=blue+dune&page=2&sort=`. Turn it into a dictionary from name to value. Pairs are separated by `&`; each pair is split at its **first** `=` only; `+` in a value means a space; a pair with no `=` gets the value `\"\"`; empty pairs (from `&&`) are skipped; if a name appears twice, the later value wins.",
    spec: [
      ["Function", "`parse_query(query)`"],
      ["Returns", "a dictionary from name to text value"],
      ["Example", "`\"q=blue+dune&page=2&sort=\"` → `{'q': 'blue dune', 'page': '2', 'sort': ''}`"],
    ],
    hiddenKinds: ["an equals sign inside a value", "a pair with no equals sign", "empty pairs between ampersands", "a name given twice", "an empty query"],
    hints: [
      "Split on `&` first; each piece is one pair, or empty.",
      "`find(\"=\")` gives the first equals sign; slice the name before it and the value after it. With no `=`, the whole piece is the name.",
      "Replace `+` with a space in the value, then store it under the name.",
    ],
    explanation: "Splitting on `&` gives the pairs. Within a pair, `find` locates only the first `=`, so a value such as `a=b` survives intact, which `split(\"=\")` with unpacking would break. A piece without `=` becomes a name with an empty value, empty pieces are skipped, and storing into the dictionary in order makes a later duplicate replace the earlier one.",
    code: {
      starter: src`
def parse_query(query):
    return {}

print(parse_query("q=blue+dune&page=2&sort="))
`,
      answer: src`
def parse_query(query):
    params = {}
    for pair in query.split("&"):
        if pair == "":
            continue
        eq = pair.find("=")
        if eq == -1:
            name = pair
            value = ""
        else:
            name = pair[:eq]
            value = pair[eq + 1:]
        params[name] = value.replace("+", " ")
    return params

print(parse_query("q=blue+dune&page=2&sort="))
`,
      alternatives: [
        src`
def parse_query(query):
    result = {}
    pieces = query.split("&")
    for piece in pieces:
        if not piece:
            continue
        if "=" in piece:
            parts = piece.split("=")
            name = parts[0]
            value = piece[len(name) + 1:]
        else:
            name = piece
            value = ""
        result[name] = value.replace("+", " ")
    return result
`,
      ],
      wrong: [
        {
          code: src`
def parse_query(query):
    params = {}
    for pair in query.split("&"):
        if pair == "":
            continue
        pieces = pair.split("=")
        if len(pieces) == 1:
            params[pair] = ""
        else:
            params[pieces[0]] = pieces[1].replace("+", " ")
    return params
`,
          fails: ["returns"],
          why: "splitting at every `=` cuts a value like `a=b` short",
        },
        {
          code: src`
def parse_query(query):
    params = {}
    for pair in query.split("&"):
        if pair == "":
            continue
        eq = pair.find("=")
        params[pair[:eq]] = pair[eq + 1:].replace("+", " ")
    return params
`,
          fails: ["returns"],
          why: "a pair with no `=` gives -1, so the name loses its last letter and the value is the whole pair",
        },
        {
          code: src`
def parse_query(query):
    params = {}
    for pair in query.split("&"):
        if pair == "":
            continue
        eq = pair.find("=")
        if eq == -1:
            name = pair
            value = ""
        else:
            name = pair[:eq]
            value = pair[eq + 1:]
        if name not in params:
            params[name] = value.replace("+", " ")
    return params
`,
          fails: ["returns"],
          why: "the first value of a repeated name is kept, but the later one should win",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_query", [
            example(["q=blue+dune&page=2&sort="], { q: "blue dune", page: "2", sort: "" }),
            example(["genre=sci-fi"], { genre: "sci-fi" }),
            example([""], {}),
            hiddenCase("an equals sign inside a value", ["expr=a=b&x=1"], { expr: "a=b", x: "1" }),
            hiddenCase("a pair with no equals sign", ["debug&page=3"], { debug: "", page: "3" }),
            hiddenCase("empty pairs between ampersands", ["&&q=night+harbor&&"], { q: "night harbor" }),
            hiddenCase("a name given twice", ["page=1&page=4"], { page: "4" }),
          ], { label: "parse_query() turns the query string into a dictionary" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-19",
    version: 2,
    slug: "balanced-brackets",
    title: "Are the brackets balanced?",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 14,
    requires: ["function-def", "function-param", "function-return", "assignment", "string-value", "boolean", "list-literal", "list-mutate", "list-index", "len-call", "membership", "comparison", "logical", "if-statement", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "string-find", "string-index", "print-text", "else-clause", "dict-literal"],
    prompt: "A code editor underlines a line when its brackets don't match. Brackets are `()`, `[]` and `{}`: every opening bracket must be closed by the same kind, and pairs must nest, so `([)]` is wrong. All other characters are ignored.",
    spec: [
      ["Function", "`balanced(text)`"],
      ["Returns", "True if every bracket is closed by the right kind in the right order, otherwise False"],
    ],
    hiddenKinds: ["pairs closed in the wrong order", "a closing bracket first", "an unclosed bracket", "deep nesting", "no brackets at all"],
    hints: [
      "Keep a list of the opening brackets that are still waiting to be closed.",
      "A closing bracket must match the most recently opened one, which is the last item of that list.",
      "A closing bracket with nothing open is an error, and anything still open at the end is an error too.",
    ],
    explanation: "The list works as a stack: `append` an opening bracket, and for a closing bracket check that the list isn't empty and that its last item is the matching opener, then `pop` it. At the end the list must be empty. Counting each kind of bracket separately accepts `([)]`, which has the right numbers in the wrong order.",
    code: {
      starter: src`
def balanced(text):
    return True

print(balanced("[1, (2, 3)]"), balanced("([)]"))
`,
      answer: src`
OPENERS = "([{"
CLOSERS = ")]}"

def balanced(text):
    waiting = []
    for ch in text:
        if ch in OPENERS:
            waiting.append(ch)
        elif ch in CLOSERS:
            expected = OPENERS[CLOSERS.find(ch)]
            if len(waiting) == 0 or waiting[-1] != expected:
                return False
            waiting.pop()
    return len(waiting) == 0

print(balanced("[1, (2, 3)]"), balanced("([)]"))
`,
      alternatives: [
        src`
def balanced(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack:
                return False
            if stack.pop() != pairs[ch]:
                return False
    return not stack
`,
      ],
      wrong: [
        {
          code: src`
def balanced(text):
    return text.count("(") == text.count(")") and text.count("[") == text.count("]") and text.count("{") == text.count("}")
`,
          fails: ["returns"],
          why: "counting only checks the numbers, so `([)]` and `)(` pass",
        },
        {
          code: src`
def balanced(text):
    waiting = []
    for ch in text:
        if ch in "([{":
            waiting.append(ch)
        elif ch in ")]}":
            expected = "([{"["([{".find(ch)]
            if waiting[-1] != expected:
                return False
            waiting.pop()
    return True
`,
          fails: ["returns"],
          why: "it never checks that something is open before a closer, and forgets unclosed brackets at the end",
        },
      ],
      task: {
        checks: [
          fn("returns", "balanced", [
            example(["[1, (2, 3)]"], true),
            example(["([)]"], false),
            example(["{\"a\": [1, 2]}"], true),
            hiddenCase("a closing bracket first", [")("], false),
            hiddenCase("an unclosed bracket", ["total = (price * (1 + rate)"], false),
            hiddenCase("deep nesting", ["{[([{}])]}"], true),
            hiddenCase("no brackets at all", ["plain text"], true),
            hiddenCase("an empty text", [""], true),
          ], { label: "balanced() checks kind and order of every bracket" }),
        ],
      },
    },
  },
  {
    id: "PY-Q11-20",
    version: 2,
    slug: "common-prefix",
    title: "The shared start of several codes",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-value", "string-index", "string-slice", "len-call", "list-index", "range-call", "comparison", "logical", "if-statement", "for-loop", "nested-loop", "print-call", "unquoted-name", "top-level-indent", "list-literal", "print-several", "print-text", "membership", "arithmetic", "while-loop"],
    prompt: "A warehouse groups bin labels by their shared start: `A12-07`, `A12-09` and `A12-11` all start with `A12-`. Return the longest text that every label starts with. The comparison is exact (case matters).",
    spec: [
      ["Function", "`common_prefix(labels)`"],
      ["Returns", "the longest shared start of every text in the list; `\"\"` if there is none or the list is empty"],
    ],
    hiddenKinds: ["one label inside another", "a single label", "nothing in common", "labels that differ only in case", "an empty list"],
    hints: [
      "The answer can't be longer than the first label, so build it from the first label's characters.",
      "For each position, check that every label is long enough and has the same character there.",
      "Stop at the first position where any label differs, and return what was matched so far.",
    ],
    explanation: "Walk the positions of the first label; at each position, every other label must be long enough and have the same character. The first mismatch ends the prefix. Checking the length first avoids an IndexError when one label is a prefix of another, and an empty list has no shared start.",
    code: {
      starter: src`
def common_prefix(labels):
    return ""

print(common_prefix(["A12-07", "A12-09", "A12-11"]))
`,
      answer: src`
def common_prefix(labels):
    if len(labels) == 0:
        return ""
    first = labels[0]
    for i in range(len(first)):
        for label in labels:
            if i >= len(label) or label[i] != first[i]:
                return first[:i]
    return first

print(common_prefix(["A12-07", "A12-09", "A12-11"]))
`,
      alternatives: [
        src`
def common_prefix(labels):
    if not labels:
        return ""
    prefix = labels[0]
    for label in labels:
        while label[:len(prefix)] != prefix:
            prefix = prefix[:len(prefix) - 1]
    return prefix
`,
      ],
      wrong: [
        {
          code: src`
def common_prefix(labels):
    if len(labels) == 0:
        return ""
    first = labels[0]
    for i in range(len(first)):
        for label in labels:
            if label[i] != first[i]:
                return first[:i]
    return first
`,
          fails: ["returns"],
          why: "a label shorter than the first one raises IndexError",
        },
        {
          code: src`
def common_prefix(labels):
    if len(labels) == 0:
        return ""
    first = labels[0]
    prefix = ""
    for i in range(len(first)):
        same = True
        for label in labels:
            if i >= len(label) or label[i] != first[i]:
                same = False
        if same:
            prefix = prefix + first[i]
    return prefix
`,
          fails: ["returns"],
          why: "it doesn't stop at the first difference, so matching characters later in the labels are added too",
        },
      ],
      task: {
        checks: [
          fn("returns", "common_prefix", [
            example([["A12-07", "A12-09", "A12-11"]], "A12-"),
            example([["HOM-22847", "HOM-22850", "HOM-31000"]], "HOM-"),
            example([["B1", "C1"]], ""),
            hiddenCase("one label inside another", [["A12-07", "A12-0"]], "A12-0"),
            hiddenCase("a single label", [["Z9"]], "Z9"),
            hiddenCase("labels that differ only in case", [["a12", "A12"]], ""),
            hiddenCase("a match again after a difference", [["AB-1", "AC-1"]], "A"),
            hiddenCase("an empty list", [[]], ""),
          ], { label: "common_prefix() returns the longest shared start" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q11-22",
    version: 2,
    slug: "check-an-isbn",
    title: "ISBN-10 or ISBN-13?",
    format: "validation",
    difficulty: "hard",
    minutes: 18,
    requires: ["function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "string-value", "none-value", "string-method", "string-check", "string-index", "string-slice", "len-call", "conversion", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "range-call", "print-call", "print-several", "unquoted-name", "top-level-indent", "nested-condition", "print-text", "membership", "precedence", "truthiness", "conditional-expr", "boolean"],
    prompt: "A library catalogue accepts book numbers typed with or without hyphens and spaces. Decide whether a text is a valid ISBN-10, a valid ISBN-13, or neither, using the real check-digit rules.\n\n**ISBN-10:** 10 characters; the first nine are digits and the last is a digit or `X` (meaning 10). Multiply the digits by 10, 9, 8, … 1 from left to right; the sum must be divisible by 11.\n\n**ISBN-13:** 13 digits. Multiply them alternately by 1 and 3, starting with 1; the sum must be divisible by 10.",
    spec: [
      ["Function", "`isbn_kind(text)`"],
      ["Returns", "`\"ISBN-10\"`, `\"ISBN-13\"`, or `None`"],
      ["Ignored", "hyphens and spaces anywhere; a lower-case `x` counts as `X` (ISBN-10 only, last place only)"],
    ],
    hiddenKinds: ["an X check digit", "a wrong ISBN-13 check digit", "an X that isn't last", "too few digits", "letters inside", "spaces instead of hyphens"],
    hints: [
      "Remove hyphens and spaces first, then decide by length; any other length is invalid.",
      "For ISBN-10, check the first nine characters are digits, and turn a final `X` into the value 10 before computing the weighted sum.",
      "For ISBN-13, every character must be a digit; the weight is 1 at even positions and 3 at odd positions.",
    ],
    explanation: "After stripping separators, the length chooses the rule. ISBN-10 needs nine digits and a check character that is a digit or X (10); the weighted sum with weights 10 down to 1 must be a multiple of 11. ISBN-13 needs 13 digits with weights alternating 1 and 3; the sum must be a multiple of 10. Validating the characters before converting avoids ValueError, and treating X as valid only in the last place of an ISBN-10 follows the standard.",
    code: {
      starter: src`
def isbn_kind(text):
    return None

print(isbn_kind("0-306-40615-2"), isbn_kind("978-0-306-40615-7"))
`,
      answer: src`
def valid_isbn10(code):
    """Return True if code (10 characters, no separators) passes the ISBN-10 check."""
    if not code[:9].isdigit():
        return False
    last = code[9]
    if last == "X":
        check = 10
    elif last.isdigit():
        check = int(last)
    else:
        return False
    total = check
    for i in range(9):
        total = total + int(code[i]) * (10 - i)
    return total % 11 == 0

def valid_isbn13(code):
    """Return True if code (13 characters, no separators) passes the ISBN-13 check."""
    if not code.isdigit():
        return False
    total = 0
    for i in range(13):
        weight = 1 if i % 2 == 0 else 3
        total = total + int(code[i]) * weight
    return total % 10 == 0

def isbn_kind(text):
    code = text.replace("-", "").replace(" ", "").upper()
    if len(code) == 10 and valid_isbn10(code):
        return "ISBN-10"
    if len(code) == 13 and valid_isbn13(code):
        return "ISBN-13"
    return None

print(isbn_kind("0-306-40615-2"), isbn_kind("978-0-306-40615-7"))
`,
      alternatives: [
        src`
def isbn_kind(text):
    code = ""
    for ch in text:
        if ch not in "- ":
            code += ch
    if len(code) == 10:
        total = 0
        for i in range(10):
            ch = code[i]
            if ch.isdigit():
                value = int(ch)
            elif i == 9 and ch in "xX":
                value = 10
            else:
                return None
            total += value * (10 - i)
        if total % 11 == 0:
            return "ISBN-10"
        return None
    if len(code) == 13 and code.isdigit():
        total = 0
        for i in range(13):
            if i % 2 == 0:
                total += int(code[i])
            else:
                total += 3 * int(code[i])
        if total % 10 == 0:
            return "ISBN-13"
    return None
`,
      ],
      wrong: [
        {
          code: src`
def isbn_kind(text):
    code = text.replace("-", "").replace(" ", "")
    if len(code) == 10 and code[:9].isdigit():
        return "ISBN-10"
    if len(code) == 13 and code.isdigit():
        return "ISBN-13"
    return None
`,
          fails: ["returns"],
          why: "only the shape is checked, so a mistyped number with a wrong check digit is accepted",
        },
        {
          code: src`
def isbn_kind(text):
    code = text.replace("-", "").replace(" ", "")
    if len(code) == 10 and code.isdigit():
        total = 0
        for i in range(10):
            total = total + int(code[i]) * (10 - i)
        if total % 11 == 0:
            return "ISBN-10"
    if len(code) == 13 and code.isdigit():
        total = 0
        for i in range(13):
            weight = 1 if i % 2 == 0 else 3
            total = total + int(code[i]) * weight
        if total % 10 == 0:
            return "ISBN-13"
    return None
`,
          fails: ["returns"],
          why: "an ISBN-10 ending in X is rejected, because X isn't a digit",
        },
        {
          code: src`
def isbn_kind(text):
    code = text.replace("-", "").replace(" ", "").upper()
    if len(code) == 10 and code[:9].isdigit() and (code[9].isdigit() or code[9] == "X"):
        total = 0
        for i in range(10):
            value = 10 if code[i] == "X" else int(code[i])
            total = total + value * (10 - i)
        if total % 11 == 0:
            return "ISBN-10"
    if len(code) == 13 and code.isdigit():
        total = 0
        for i in range(13):
            weight = 3 if i % 2 == 0 else 1
            total = total + int(code[i]) * weight
        if total % 10 == 0:
            return "ISBN-13"
    return None
`,
          fails: ["returns"],
          why: "the ISBN-13 weights start with 3 instead of 1, so valid ISBN-13s are rejected",
        },
      ],
      task: {
        checks: [
          fn("returns", "isbn_kind", [
            example(["0-306-40615-2"], "ISBN-10"),
            example(["978-0-306-40615-7"], "ISBN-13"),
            example(["0-306-40615-3"], null),
            hiddenCase("an X check digit", ["0-8044-2957-x"], "ISBN-10"),
            hiddenCase("a wrong ISBN-13 check digit", ["978-0-306-40615-8"], null),
            hiddenCase("an X that isn't last", ["X-306-40615-2"], null),
            hiddenCase("too few digits", ["0-306-4061-2"], null),
            hiddenCase("letters inside", ["978-0-3O6-40615-7"], null),
            hiddenCase("spaces instead of hyphens", ["978 1 86197 876 9"], "ISBN-13"),
          ], { label: "isbn_kind() applies the real check-digit rules" }),
        ],
      },
    },
  },
];
