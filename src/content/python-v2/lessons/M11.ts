/**
 * M11 String Algorithms: five lessons (PY-L11-01 … PY-L11-05).
 *
 * Text processing as algorithms, not just method calls: normalise text before comparing it (and test a palindrome on the
 * normalised form), split text into words and fields and join it back, find every occurrence of a piece and replace
 * or extract around it, count characters and words (frequencies, anagrams by counting, run-length encoding), and
 * validate text with character tests. Fixtures are Runtime Films titles (R02), Runtime Market SKUs, order notes and
 * customer fields (R01), CFPB-style complaint narratives (D03) and Open Food Facts-style ingredient lists (D12).
 *
 * Every challenge is a function graded on public examples and hidden inputs (empty text, only punctuation, repeated
 * separators, capitals, ties, boundaries). Version 2: rewritten from one-method exercises; saved progress from version 1
 * does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

const stopWords = ["the", "a", "an", "of", "and", "to", "my", "is"];

export const m11Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L11-01 normalise
  {
    id: "PY-L11-01",
    version: 2,
    slug: "normalize-text",
    title: "Normalise text before you compare it",
    lede: "People type the same thing many ways: capitals, extra spaces, punctuation. Normalising maps every variant to one standard form, so comparisons and searches treat them as equal.",
    focus: "Build a normalised copy of a text, character by character if needed, and compare normalised forms.",
    minutes: 18,
    objectives: [
      "Combine `strip`, `lower` and `replace`, keeping the new text each one returns",
      "Build a cleaned text one character at a time: keep allowed characters, collapse repeated spaces",
      "Reverse a text with `[::-1]` and test a palindrome on its normalised form",
    ],
    requires: ["function-def", "function-param", "function-return", "function-doc", "assignment", "reassignment", "string-value", "boolean", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-method", "string-slice", "string-index", "string-format", "len-call", "list-literal", "nested-condition", "arithmetic", "while-loop", "list-mutate", "list-index"],
    teaches: ["string-normalize"],
    blocks: [
      {
        kind: "text",
        md: "A search for `night harbor` should find the film stored as `Night Harbor!`, and a customer typing `  NORA   garcia` is the same person as `Nora Garcia`. `==` compares characters exactly, so the program has to bring both texts to one **normal form** first.\n\nThe usual steps are: `strip()` the ends, `lower()` the letters, `replace` characters that don't matter, and collapse runs of spaces into one. Strings never change in place: every method returns a new text, so keep it with `text = text.strip()`.",
      },
      {
        kind: "example",
        title: "One form for many spellings",
        code: src`
def normalize(text):
    """Return text stripped, in lower case, with runs of spaces collapsed to one."""
    text = text.strip().lower()
    result = ""
    previous_space = False
    for ch in text:
        if ch == " ":
            if not previous_space:
                result = result + ch
            previous_space = True
        else:
            result = result + ch
            previous_space = False
    return result

print(normalize("  Nordic   CANDLE "))
print(normalize("nordic candle") == normalize("NORDIC  candle"))
name = "  Nora "
name.strip()
print("[" + name + "]")
`,
        output: "nordic candle\nTrue\n[  Nora ]\n",
        note: "The loop builds a new text and adds a space only if the previous character wasn't one. The last three lines show the classic slip: `name.strip()` returns a cleaned copy, but nothing keeps it, so `name` still has its spaces.",
      },
      {
        kind: "text",
        md: "Punctuation is often noise too. Instead of listing every character to remove, list the characters to **keep** and test each one with `in`. For a title search that is letters, digits and spaces; anything else is dropped.\n\nA normalised form also makes palindromes easy to test. A slice can take a third number, the **step**: `text[::-1]` walks the whole text backwards, giving it reversed. A phrase is a palindrome if its normalised form equals its own reverse.",
      },
      {
        kind: "example",
        title: "Titles without punctuation, and a palindrome",
        code: src`
KEEP = "abcdefghijklmnopqrstuvwxyz0123456789 "

def letters_digits_spaces(text):
    """Return the lower-case text with only letters, digits and spaces kept."""
    kept = ""
    for ch in text.lower():
        if ch in KEEP:
            kept = kept + ch
    return kept

print(letters_digits_spaces("Night Harbor!") == letters_digits_spaces("night harbor"))
print(letters_digits_spaces("Wild Archive: Part 2 (Director's Cut)"))
phrase = letters_digits_spaces("Never odd, or even").replace(" ", "")
print(phrase, phrase[::-1], phrase == phrase[::-1])
`,
        output: "True\nwild archive part 2 directors cut\nneveroddoreven neveroddoreven True\n",
        note: "Dropping the apostrophe and brackets turns `Director's Cut` into `directors cut`. For the palindrome, spaces are removed too, because `never odd or even` read backwards has its spaces in other places.",
      },
      {
        kind: "text",
        md: "**When to use it:** before comparing, searching, de-duplicating or counting anything a person typed. Normalise both sides the same way. **Mistakes to avoid:**\n\n- Calling a method without keeping its result.\n- Normalising only one side of a comparison.\n- Normalising away something that matters: `C2` and `c2` may be different codes in a product catalogue.",
      },
    ],
    tryIt: {
      id: "try",
      title: "And or ampersand",
      prompt: "`Pride & Joy` and `pride and joy` should match. Make `normalize` also replace `&` with `and`, before it lowers the text.",
      spec: [
        ["Function", "`normalize(text)`"],
        ["Returns", "the text stripped, lowered, with `&` written as `and`"],
      ],
      starter: src`
def normalize(text):
    return text.strip().lower()

print(normalize(" Pride & Joy") == normalize("pride and joy"))
`,
      answer: src`
def normalize(text):
    return text.strip().replace("&", "and").lower()

print(normalize(" Pride & Joy") == normalize("pride and joy"))
`,
      wrong: [
        {
          code: src`
def normalize(text):
    return text.strip().replace("&", "").lower()
`,
          fails: ["returns"],
          why: "the ampersand is deleted instead of written as `and`",
        },
      ],
      hints: ["One more method goes into the chain.", "`replace(old, new)` swaps every `old` for `new`.", "Each method returns a new text, so the next method works on the result."],
      task: {
        checks: [
          fn("returns", "normalize", [
            example([" Pride & Joy"], "pride and joy"),
            hiddenCase("no ampersand", ["Night Harbor "], "night harbor"),
            hiddenCase("two ampersands", ["Salt & Pepper & Co"], "salt and pepper and co"),
          ], { label: "normalize() writes & as and" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Same film title?",
        prompt: "Write `same_title(a, b)`: return True if two titles match after normalising both: lower case, only letters, digits and spaces kept, spaces at the ends removed and runs of spaces collapsed to one.",
        spec: [
          ["Function", "`same_title(a, b)`"],
          ["Returns", "True or False"],
          ["Matching", "ignores capitals, punctuation, and the number of spaces; letters, digits and word breaks must match"],
          ["Example", "`same_title(\"Night  Harbor!\", \"night harbor\")` → `True`; `same_title(\"Night Harbor 2\", \"Night Harbor\")` → `False`"],
        ],
        starter: src`
def same_title(a, b):
    return a == b

print(same_title("Night  Harbor!", "night harbor"))
`,
        answer: src`
KEEP = "abcdefghijklmnopqrstuvwxyz0123456789"

def normal_form(title):
    """Return the title lowered, with punctuation dropped and single spaces between words."""
    result = ""
    for ch in title.lower():
        if ch in KEEP:
            result = result + ch
        elif ch == " " and result != "" and result[-1] != " ":
            result = result + " "
    return result.strip()

def same_title(a, b):
    return normal_form(a) == normal_form(b)

print(same_title("Night  Harbor!", "night harbor"))
`,
        alternatives: [
          src`
def clean(title):
    kept = ""
    for ch in title.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789 ":
            kept += ch
    while "  " in kept:
        kept = kept.replace("  ", " ")
    return kept.strip()

def same_title(a, b):
    return clean(a) == clean(b)
`,
        ],
        wrong: [
          {
            code: src`
def same_title(a, b):
    return a.strip().lower() == b.strip().lower()
`,
            fails: ["returns"],
            why: "punctuation and double spaces still make two forms of one title differ",
          },
          {
            code: src`
def same_title(a, b):
    first = ""
    for ch in a.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            first = first + ch
    second = ""
    for ch in b.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            second = second + ch
    return first == second
`,
            fails: ["returns"],
            why: "dropping every space joins words, so `Blue Dune` and `Bluedune` look the same",
          },
        ],
        hints: [
          "Write one helper that normalises a title, and compare the two results.",
          "Walk the lowered title character by character; keep letters and digits, and add a space only when the last kept character isn't already a space.",
          "Strip the result at the end, since a space may have been kept after the last word.",
        ],
        task: {
          checks: [
            fn("returns", "same_title", [
              example(["Night  Harbor!", "night harbor"], true),
              example(["Night Harbor 2", "Night Harbor"], false),
              example(["  Wild Archive: Director's Cut", "wild archive directors cut"], true),
              hiddenCase("words that run together", ["Blue Dune", "Bluedune"], false),
              hiddenCase("punctuation between words", ["Glass-Echo", "Glass Echo"], false),
              hiddenCase("spaces and punctuation at both ends", ["  ...Paper Moons?!  ", "paper moons"], true),
              hiddenCase("two empty titles", ["", "   "], true),
            ], { label: "same_title() compares normalised titles" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Is it a palindrome?",
        prompt: "Write `is_palindrome(text)`: return True if the text reads the same backwards once capitals, spaces and punctuation are ignored, so only letters and digits count. A text with no letters or digits at all is not a palindrome.",
        spec: [
          ["Function", "`is_palindrome(text)`"],
          ["Counts", "letters a–z (any case) and digits only"],
          ["Returns", "True or False; False when nothing countable is left"],
          ["Example", "`\"Never odd, or even\"` → `True`; `\"Night Harbor\"` → `False`"],
        ],
        starter: src`
def is_palindrome(text):
    return text == text[::-1]

print(is_palindrome("Never odd, or even"))
`,
        answer: src`
def is_palindrome(text):
    """Return True if the letters and digits of text read the same both ways."""
    kept = ""
    for ch in text.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            kept = kept + ch
    if kept == "":
        return False
    return kept == kept[::-1]

print(is_palindrome("Never odd, or even"))
`,
        alternatives: [
          src`
def is_palindrome(text):
    chars = []
    for ch in text.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            chars.append(ch)
    if len(chars) == 0:
        return False
    left = 0
    right = len(chars) - 1
    while left < right:
        if chars[left] != chars[right]:
            return False
        left += 1
        right -= 1
    return True
`,
        ],
        wrong: [
          {
            code: src`
def is_palindrome(text):
    text = text.lower().replace(" ", "")
    return text == text[::-1]
`,
            fails: ["returns"],
            why: "punctuation is kept, so the commas in `Never odd, or even` spoil the match",
          },
          {
            code: src`
def is_palindrome(text):
    kept = ""
    for ch in text.lower():
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            kept = kept + ch
    return kept == kept[::-1]
`,
            fails: ["returns"],
            why: "a text with nothing countable gives an empty string, which equals its reverse, so it returns True",
          },
          {
            code: src`
def is_palindrome(text):
    kept = ""
    for ch in text:
        if ch in "abcdefghijklmnopqrstuvwxyz0123456789":
            kept = kept + ch
    if kept == "":
        return False
    return kept == kept[::-1]
`,
            fails: ["returns"],
            why: "the text isn't lowered, so capital letters are dropped as if they were punctuation",
          },
        ],
        hints: [
          "Normalise first: keep only the lowered letters and digits, in order.",
          "Handle the case where nothing was kept before comparing.",
          "A slice with step -1 gives the reversed text to compare with.",
        ],
        task: {
          checks: [
            fn("returns", "is_palindrome", [
              example(["Never odd, or even"], true),
              example(["Night Harbor"], false),
              example(["Was it a car or a cat I saw?"], true),
              hiddenCase("only punctuation", ["?! ..."], false),
              hiddenCase("digits", ["12321"], true),
              hiddenCase("a single letter", ["A"], true),
              hiddenCase("a near miss", ["Step on no petsx"], false),
              hiddenCase("capitals in the middle", ["RaceCar"], true),
            ], { label: "is_palindrome() compares the letters and digits both ways" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
code = " Hom-22847 "
code.strip()
clean = code.strip().upper()
print("[" + code + "]", clean, clean == "HOM-22847")
`,
        choices: ["[ Hom-22847 ] HOM-22847 True", "[Hom-22847] HOM-22847 True", "[ Hom-22847 ] HOM-22847 False", "[HOM-22847] HOM-22847 True"],
        answer: 0,
        why: "The second line throws its result away, so `code` keeps its spaces. `clean` keeps the stripped, upper-case copy.",
      },
      {
        id: "q2",
        prompt: "A common mistake: only one side is normalised. What does this print?",
        program: src`
stored = "Night Harbor"
typed = "  night harbor "
print(typed.strip().lower() == stored, typed.strip().lower() == stored.lower())
`,
        choices: ["False True", "True True", "False False", "True False"],
        answer: 0,
        why: "The typed text becomes `night harbor`, but the stored title still has capitals. Normalise both sides the same way.",
      },
      {
        id: "q3",
        prompt: "Which should NOT be normalised before comparing?",
        choices: ["Product codes where capitals mean different products", "City names typed into a search box", "Email addresses' domain part (`GMAIL.com` vs `gmail.com`)", "Film titles typed by users"],
        answer: 0,
        why: "Normalising is a decision about what counts as the same. If `C2` and `c2` are different products, lowering them would merge them.",
      },
    ],
    review: [
      "Normalise both sides the same way before comparing: strip, lower, replace, collapse spaces.",
      "Strings never change in place; keep each method's result.",
      "Keep allowed characters one at a time; `text[::-1]` reverses a text.",
      "Next: split normalised text into words and fields, and join them back.",
    ],
  },

  // ------------------------------------------------------------------ PY-L11-02 split and join
  {
    id: "PY-L11-02",
    version: 2,
    slug: "split-text",
    title: "Split text into words and fields",
    lede: "split() breaks text into a list: on any run of whitespace with no argument, or on an exact separator such as a comma. join() puts a list of texts back together.",
    focus: "Turn text into a list of words or fields with split, clean each piece, and put pieces back together with join.",
    minutes: 18,
    objectives: [
      "Tell `split()` (any whitespace, no empty pieces) from `split(\",\")` (exact separator, empty pieces kept)",
      "Clean each piece after splitting, and check how many pieces there are before unpacking",
      "Rebuild text with `separator.join(pieces)`",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "none-value", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-method", "string-index", "string-slice", "string-format", "len-call", "list-literal", "list-index", "list-mutate", "tuple-literal", "tuple-unpack", "conversion", "runtime-error", "string-normalize", "dict-literal", "dict-lookup", "decimal-number", "continue-statement", "range-call"],
    teaches: ["string-split"],
    blocks: [
      {
        kind: "text",
        md: "Text often holds several values: the words of a review, the fields of a line exported from a spreadsheet. `split` cuts it into a **list of texts**.\n\n- `text.split()`, with no argument, splits on any run of spaces, tabs or newlines, and ignores spaces at the ends. It never gives empty pieces.\n- `text.split(\",\")` splits at every comma exactly. Two commas in a row give an empty piece between them, and spaces stay attached to the pieces.\n\nThe reverse is `join`: `\" \".join(words)` glues a list of texts together with a space between each pair.",
      },
      {
        kind: "example",
        title: "Words and fields",
        code: src`
review = "  Great   film,  slow start "
words = review.split()
print(words, len(words))
print(" ".join(words))
line = "C00164, Isaac ,New York,,consumer"
fields = line.split(",")
print(fields)
clean = []
for field in fields:
    clean.append(field.strip())
print(clean)
print("|".join(clean))
`,
        output: "['Great', 'film,', 'slow', 'start'] 4\nGreat film, slow start\n['C00164', ' Isaac ', 'New York', '', 'consumer']\n['C00164', 'Isaac', 'New York', '', 'consumer']\nC00164|Isaac|New York||consumer\n",
        note: "`split()` keeps punctuation attached (`film,`) and collapses the extra spaces, so `\" \".join(review.split())` is the standard way to normalise whitespace. `split(\",\")` keeps the empty field between the two commas, so the line still has five fields.",
      },
      {
        kind: "error-example",
        title: "Unpacking the wrong number of pieces",
        code: src`
entry = "HOM-22847:2:gift"
sku, quantity = entry.split(":")
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: too many values to unpack (expected 2)`: the split gave three pieces. When the data might be malformed, check `len(pieces)` before unpacking.",
      },
      {
        kind: "text",
        md: "Splitting is usually the first step of **parsing**: turning a line of text into typed values. Split, check the piece count, clean each piece, convert the numbers. Returning `None` for a bad line lets the caller skip it instead of crashing.",
      },
      {
        kind: "example",
        title: "Parse a stock line",
        code: src`
def parse_stock(line):
    """Return (sku, units, price) from "sku;units;price", or None if the line is malformed."""
    pieces = line.split(";")
    if len(pieces) != 3:
        return None
    sku = pieces[0].strip().upper()
    units = int(pieces[1])
    price = float(pieces[2])
    return sku, units, price

for line in ["hom-22847; 12 ;15.50", "ELE-24781;3;171.99", "SPO-11681;7", ""]:
    print(parse_stock(line))
`,
        output: "('HOM-22847', 12, 15.5)\n('ELE-24781', 3, 171.99)\nNone\nNone\n",
        note: "`int(\" 12 \")` and `float(\"15.50\")` accept spaces at the ends, so the numbers need no extra strip. An empty line splits into one empty piece, which fails the count check.",
      },
      {
        kind: "text",
        md: "**When to use it:** words from free text (`split()`), fields from a delimited line (`split(sep)`), and building text from a list (`join`). **Mistakes to avoid:**\n\n- Using `split(\" \")` on text with double spaces: it produces empty pieces. Use `split()`.\n- Forgetting that punctuation stays on the words.\n- Unpacking without checking the number of pieces.\n- Calling `join` on numbers: every piece must already be text.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Semicolons, not commas",
      prompt: "This supplier's file separates fields with `;`. Change `fields` so it splits on semicolons, keeping the strip on each field.",
      spec: [
        ["Function", "`fields(line)`"],
        ["Returns", "the list of stripped fields between semicolons"],
      ],
      starter: src`
def fields(line):
    pieces = []
    for piece in line.split(","):
        pieces.append(piece.strip())
    return pieces

print(fields("SPO-11681 ; Ultra Bike Light ; 14"))
`,
      answer: src`
def fields(line):
    pieces = []
    for piece in line.split(";"):
        pieces.append(piece.strip())
    return pieces

print(fields("SPO-11681 ; Ultra Bike Light ; 14"))
`,
      wrong: [
        {
          code: src`
def fields(line):
    pieces = []
    for piece in line.split():
        pieces.append(piece.strip())
    return pieces
`,
          fails: ["returns"],
          why: "`split()` splits on spaces, so `Ultra Bike Light` is broken into words",
        },
      ],
      hints: ["Only the separator changes.", "The separator goes inside `split(...)` as a text.", "The strip on each piece still removes the spaces around it."],
      task: {
        checks: [
          fn("returns", "fields", [
            example(["SPO-11681 ; Ultra Bike Light ; 14"], ["SPO-11681", "Ultra Bike Light", "14"]),
            hiddenCase("an empty field", ["A;;B"], ["A", "", "B"]),
            hiddenCase("commas inside a field", ["P1;Salt, coarse;3"], ["P1", "Salt, coarse", "3"]),
          ], { label: "fields() splits on semicolons" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Parse an order note",
        prompt: "Warehouse staff type order notes as `order_id|sku|quantity`, with stray spaces and lower-case letters. Write `parse_note(note)`: return a tuple `(order_id, sku, quantity)` with both IDs stripped and in capitals and the quantity as an int, or `None` if the note doesn't have exactly three fields or any field is empty.",
        spec: [
          ["Function", "`parse_note(note)`"],
          ["Returns", "`(ORDER_ID, SKU, quantity)` or `None`"],
          ["Example", "`\" o104839 | hom-22847 | 2 \"` → `('O104839', 'HOM-22847', 2)`; `\"O1|SKU\"` → `None`"],
        ],
        starter: src`
def parse_note(note):
    return None

print(parse_note(" o104839 | hom-22847 | 2 "))
`,
        answer: src`
def parse_note(note):
    """Return (order_id, sku, quantity) from "order|sku|qty", or None if malformed."""
    pieces = note.split("|")
    if len(pieces) != 3:
        return None
    order_id = pieces[0].strip().upper()
    sku = pieces[1].strip().upper()
    quantity = pieces[2].strip()
    if order_id == "" or sku == "" or quantity == "":
        return None
    return order_id, sku, int(quantity)

print(parse_note(" o104839 | hom-22847 | 2 "))
`,
        alternatives: [
          src`
def parse_note(note):
    parts = []
    for piece in note.split("|"):
        piece = piece.strip()
        if not piece:
            return None
        parts.append(piece)
    if len(parts) != 3:
        return None
    return (parts[0].upper(), parts[1].upper(), int(parts[2]))
`,
        ],
        wrong: [
          {
            code: src`
def parse_note(note):
    pieces = note.split("|")
    if len(pieces) != 3:
        return None
    return pieces[0].upper(), pieces[1].upper(), int(pieces[2])
`,
            fails: ["returns"],
            why: "the IDs keep their spaces, and an empty field is not rejected",
          },
          {
            code: src`
def parse_note(note):
    pieces = note.split("|")
    order_id, sku, quantity = pieces
    if order_id.strip() == "" or sku.strip() == "" or quantity.strip() == "":
        return None
    return order_id.strip().upper(), sku.strip().upper(), int(quantity)
`,
            fails: ["returns"],
            why: "unpacking without a count check raises ValueError for a note with two or four fields",
          },
        ],
        hints: [
          "Split on the bar, then check you got exactly three pieces before using them.",
          "Strip each piece; an empty piece after stripping means the note is incomplete.",
          "Upper-case the two IDs and convert the quantity with `int`.",
        ],
        task: {
          checks: [
            fn("returns", "parse_note", [
              example([" o104839 | hom-22847 | 2 "], tup("O104839", "HOM-22847", 2)),
              example(["O1|SKU"], null),
              example(["O100043|SPO-11681|10"], tup("O100043", "SPO-11681", 10)),
              hiddenCase("four fields", ["O1|A|2|gift"], null),
              hiddenCase("an empty field", ["O1| |3"], null),
              hiddenCase("an empty note", [""], null),
              hiddenCase("extra spaces everywhere", ["   o9   |   b-1   |   15   "], tup("O9", "B-1", 15)),
            ], { label: "parse_note() parses valid notes and rejects malformed ones" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Search keywords from a complaint",
        prompt: "Write `keywords(text, stop_words)` for a complaint search index: lower the text, split it into words, strip the punctuation `.,!?;:()\"` from each word's ends, drop empty words and words in `stop_words`, and return the remaining words **once each**, in the order they first appear.",
        spec: [
          ["Function", "`keywords(text, stop_words)`"],
          ["stop_words", "a list of lower-case words to leave out, e.g. `[\"the\", \"a\", \"of\", \"my\"]`"],
          ["Returns", "a new list of distinct cleaned words in first-seen order"],
          ["Example", "`keywords(\"The fee, the LATE fee!\", [\"the\"])` → `['fee', 'late']`"],
        ],
        starter: src`
def keywords(text, stop_words):
    return []

print(keywords("The fee, the LATE fee!", ["the"]))
`,
        answer: src`
def keywords(text, stop_words):
    """Return the distinct non-stop words of text, cleaned, in first-seen order."""
    result = []
    for word in text.lower().split():
        word = word.strip(".,!?;:()\"")
        if word == "" or word in stop_words:
            continue
        if word not in result:
            result.append(word)
    return result

print(keywords("The fee, the LATE fee!", ["the"]))
`,
        alternatives: [
          src`
def keywords(text, stop_words):
    found = []
    words = text.split()
    for i in range(len(words)):
        cleaned = words[i].lower().strip('.,!?;:()"')
        if cleaned and cleaned not in stop_words and cleaned not in found:
            found.append(cleaned)
    return found
`,
        ],
        wrong: [
          {
            code: src`
def keywords(text, stop_words):
    result = []
    for word in text.lower().split():
        if word in stop_words:
            continue
        if word not in result:
            result.append(word)
    return result
`,
            fails: ["returns"],
            why: "punctuation stays on the words, so `fee,` and `fee!` count as different words",
          },
          {
            code: src`
def keywords(text, stop_words):
    result = []
    for word in text.lower().split(" "):
        word = word.strip(".,!?;:()\"")
        if word == "" or word in stop_words:
            continue
        if word not in result:
            result.append(word)
    return result
`,
            fails: ["returns"],
            why: "`split(\" \")` splits on single spaces only, so a tab or newline glues two words together",
          },
          {
            code: src`
def keywords(text, stop_words):
    result = []
    for word in text.split():
        word = word.strip(".,!?;:()\"")
        if word == "" or word in stop_words:
            continue
        if word not in result:
            result.append(word)
    return result
`,
            fails: ["returns"],
            why: "the text isn't lowered, so `The` isn't recognised as a stop word and `Fee` differs from `fee`",
          },
        ],
        hints: [
          "Lower first, then `split()` with no argument so any whitespace separates words.",
          "`strip` takes the characters to remove from the ends: give it the punctuation.",
          "Skip empty words and stop words, then append a word only if it isn't in the result yet.",
        ],
        task: {
          checks: [
            fn("returns", "keywords", [
              example(["The fee, the LATE fee!", ["the"]], ["fee", "late"]),
              example(["My card was charged twice (twice!)", stopWords], ["card", "was", "charged", "twice"]),
              example(["", stopWords], []),
              hiddenCase("words separated by tabs and newlines", ["refund\tdelayed\nrefund", []], ["refund", "delayed"]),
              hiddenCase("words that are only punctuation", ["fee -- ... !!", []], ["fee", "--"]),
              hiddenCase("only stop words", ["The and of a", stopWords], []),
              hiddenCase("quotes around a word", ["\"Unauthorized\" charge; \"UNAUTHORIZED\"", []], ["unauthorized", "charge"]),
            ], { label: "keywords() returns the distinct cleaned words in order" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
line = "red,,blue , green"
print(line.split(","))
print(len("  two   words ".split()), "-".join(["a", "b", "c"]))
`,
        choices: ["['red', '', 'blue ', ' green']\n2 a-b-c", "['red', 'blue', 'green']\n2 a-b-c", "['red', '', 'blue ', ' green']\n5 a-b-c", "['red', '', 'blue', 'green']\n2 abc"],
        answer: 0,
        why: "`split(\",\")` keeps the empty piece between the two commas and the spaces around words. `split()` ignores runs of spaces, giving 2 words. `join` puts `-` between the pieces.",
      },
      {
        id: "q2",
        prompt: "A common mistake: splitting on a single space. What does this print?",
        program: src`
text = "late  delivery"
print(text.split(" "), text.split())
`,
        choices: ["['late', '', 'delivery'] ['late', 'delivery']", "['late', 'delivery'] ['late', 'delivery']", "['late  delivery'] ['late', 'delivery']", "['late', ' delivery'] ['late', 'delivery']"],
        answer: 0,
        why: "With an explicit separator every single space is a cut, so two spaces in a row leave an empty piece. `split()` with no argument treats any run of whitespace as one break.",
      },
      {
        id: "q3",
        prompt: "Which call turns `[\"O1\", \"O2\", \"O3\"]` into `\"O1, O2, O3\"`?",
        choices: ["\", \".join(ids)", "ids.join(\", \")", "\", \".split(ids)", "str(ids)"],
        answer: 0,
        why: "`join` is a method of the separator text and takes the list. `str(ids)` would give the list's own form with brackets and quotes.",
      },
    ],
    review: [
      "`split()` breaks on any whitespace and drops empty pieces; `split(sep)` cuts at every `sep` and keeps empty pieces.",
      "Clean each piece, and check the piece count before unpacking.",
      "`sep.join(pieces)` puts texts back together; `\" \".join(text.split())` normalises spaces.",
      "Next: find where a piece occurs inside a text, and replace or extract around it.",
    ],
  },

  // ------------------------------------------------------------------ PY-L11-03 find and replace
  {
    id: "PY-L11-03",
    version: 2,
    slug: "find-and-replace",
    title: "Find every match, then extract or replace",
    lede: "find() returns the position of a piece of text, or -1 when it isn't there; find(piece, start) looks again from a later position. Positions let you extract what sits between markers or rebuild the text around each match.",
    focus: "Locate one or every occurrence of a piece with find, and extract or rebuild text around the positions.",
    minutes: 18,
    objectives: [
      "Use `find` and check for -1 before slicing with the result",
      "Find every occurrence by calling `find` again from just after the last match",
      "Extract text between two markers, and rebuild text around matches",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "while-loop", "membership", "string-method", "string-index", "string-slice", "string-format", "len-call", "list-literal", "list-mutate", "string-normalize", "string-split", "break-statement", "hash-in-text", "list-index", "range-call", "end"],
    teaches: ["string-find"],
    blocks: [
      {
        kind: "text",
        md: "`in` answers *is it there?*. `find` answers *where?*: `text.find(\"@\")` is the position of the first `@`, or **-1** if there is none. Positions are what slicing needs, so `find` is how you cut a value out of a text: the domain after `@`, the order number after `#`.\n\nThe -1 is the trap. It is a valid slice position (it means *the last character*), so using it without checking silently gives a wrong piece instead of an error.",
      },
      {
        kind: "example",
        title: "Extract after a marker, safely",
        code: src`
def domain(email):
    """Return the part after @ in lower case, or None if there is no @."""
    at = email.find("@")
    if at == -1:
        return None
    return email[at + 1:].strip().lower()

print(domain("jamal.walker62@iCloud.com"))
print(domain("not an email"))
note = "Refund for order #O104839 approved"
start = note.find("#")
print(note[start + 1:start + 8])
missing = "no order number here"
print(missing[missing.find("#") + 1:])
`,
        output: "icloud.com\nNone\nO104839\nno order number here\n",
        note: "The last line is the bug in action: `find` returns -1, plus 1 is 0, and the slice quietly returns the whole text. Always test for -1 before slicing.",
      },
      {
        kind: "text",
        md: "`find` takes an optional start position: `text.find(\"fee\", 10)` searches from position 10 on. To find **every** occurrence, loop: find from 0, record the position, then find again from just after it, until `find` returns -1. With those positions you can rebuild the text: copy everything up to a match, add something new, and continue after the match. `replace` does the simplest version of this for you when the piece is exact.",
      },
      {
        kind: "example",
        title: "Every mention of a word",
        code: src`
def positions(text, piece):
    """Return every position where piece starts in text."""
    found = []
    start = text.find(piece)
    while start != -1:
        found.append(start)
        start = text.find(piece, start + len(piece))
    return found

complaint = "late fee charged, then another fee, fee waived?"
print(positions(complaint, "fee"))
print(positions(complaint, "refund"))
print(complaint.replace("fee", "FEE", 2))
`,
        output: "[5, 31, 36]\n[]\nlate FEE charged, then another FEE, fee waived?\n",
        note: "Searching again from `start + len(piece)` moves past the match just found; searching from `start` again would find the same position forever. `replace` takes an optional count: here only the first two are changed.",
      },
      {
        kind: "text",
        md: "**When to use it:** to pull a value out from between markers, to locate every match, and to change text around matches. **Mistakes to avoid:**\n\n- Slicing with a `find` result without checking for -1.\n- Restarting the search at the same position, which loops forever.\n- Forgetting that `find` and `replace` are case-sensitive; search a lowered copy when case shouldn't matter, but slice the original.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The second mention",
      prompt: "`second_position` returns where `piece` first appears. Make it return where it appears the **second** time, or -1 if there is no second time, by calling `find` again from just after the first match.",
      spec: [
        ["Function", "`second_position(text, piece)`"],
        ["Returns", "the position of the second occurrence, or -1"],
      ],
      starter: src`
def second_position(text, piece):
    first = text.find(piece)
    return first

print(second_position("fee, then fee again", "fee"))
`,
      answer: src`
def second_position(text, piece):
    first = text.find(piece)
    if first == -1:
        return -1
    return text.find(piece, first + len(piece))

print(second_position("fee, then fee again", "fee"))
`,
      wrong: [
        {
          code: src`
def second_position(text, piece):
    first = text.find(piece)
    return text.find(piece, first)
`,
          fails: ["returns"],
          why: "searching from the first match finds that same match again",
        },
      ],
      hints: ["The first search stays.", "`find` takes a second argument: where to start looking.", "Start just after the first match; if there was no first match, there is no second."],
      task: {
        checks: [
          fn("returns", "second_position", [
            example(["fee, then fee again", "fee"], 10),
            hiddenCase("only one occurrence", ["late fee", "fee"], -1),
            hiddenCase("no occurrence at all", ["refund", "fee"], -1),
          ], { label: "second_position() finds the second occurrence" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Order numbers mentioned in a note",
        prompt: "Support notes mention orders as `#` followed by the order ID, which is `O` and six digits, e.g. `#O104839`. Write `order_refs(note)`: return the list of order IDs (without the `#`) in the order they appear. A `#` that isn't followed by `O` and six characters is ignored.",
        spec: [
          ["Function", "`order_refs(note)`"],
          ["Returns", "a list like `['O104839', 'O100043']`; empty if there are none"],
          ["Rule", "an ID is the 7 characters after a `#`, and it must start with `O`"],
          ["Example", "`\"Merged #O104839 into #O100043; see #12\"` → `['O104839', 'O100043']`"],
        ],
        starter: src`
def order_refs(note):
    return []

print(order_refs("Merged #O104839 into #O100043; see #12"))
`,
        answer: src`
def order_refs(note):
    """Return the order IDs written as #O123456 in the note, in order."""
    refs = []
    start = note.find("#")
    while start != -1:
        candidate = note[start + 1:start + 8]
        if len(candidate) == 7 and candidate[0] == "O":
            refs.append(candidate)
        start = note.find("#", start + 1)
    return refs

print(order_refs("Merged #O104839 into #O100043; see #12"))
`,
        alternatives: [
          src`
def order_refs(note):
    refs = []
    for i in range(len(note)):
        if note[i] == "#" and note[i + 1:i + 2] == "O" and len(note[i + 1:i + 8]) == 7:
            refs.append(note[i + 1:i + 8])
    return refs
`,
        ],
        wrong: [
          {
            code: src`
def order_refs(note):
    refs = []
    start = note.find("#")
    if start != -1:
        refs.append(note[start + 1:start + 8])
    return refs
`,
            fails: ["returns"],
            why: "only the first `#` is looked at",
          },
          {
            code: src`
def order_refs(note):
    refs = []
    start = note.find("#")
    while start != -1:
        refs.append(note[start + 1:start + 8])
        start = note.find("#", start + 1)
    return refs
`,
            fails: ["returns"],
            why: "every `#` is treated as an order, including `#12`",
          },
        ],
        hints: [
          "Find the first `#`, then keep finding the next one from just after it until `find` gives -1.",
          "The candidate ID is a slice of 7 characters right after the `#`.",
          "Keep a candidate only if it really has 7 characters and starts with `O`.",
        ],
        task: {
          checks: [
            fn("returns", "order_refs", [
              example(["Merged #O104839 into #O100043; see #12"], ["O104839", "O100043"]),
              example(["No references here"], []),
              example(["#O101217"], ["O101217"]),
              hiddenCase("an ID cut short at the end", ["Check #O1012"], []),
              hiddenCase("the same order twice", ["#O100043 and again #O100043"], ["O100043", "O100043"]),
              hiddenCase("a hash followed by another hash", ["##O104839"], ["O104839"]),
              hiddenCase("a lower-case o", ["see #o104839"], []),
            ], { label: "order_refs() lists every order ID after a #" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Highlight a search term",
        prompt: "A search page shows each result with the search term wrapped in square brackets. Write `highlight(text, term)`: wrap **every** occurrence of `term`, ignoring capitals, in `[` and `]`, keeping the original capitals of the text. An empty term returns the text unchanged.",
        spec: [
          ["Function", "`highlight(text, term)`"],
          ["Returns", "the text with each case-insensitive match of `term` wrapped as `[match]`"],
          ["Example", "`highlight(\"Late FEE and a fee\", \"fee\")` → `'Late [FEE] and a [fee]'`"],
        ],
        starter: src`
def highlight(text, term):
    return text

print(highlight("Late FEE and a fee", "fee"))
`,
        answer: src`
def highlight(text, term):
    """Return text with every case-insensitive match of term wrapped in brackets."""
    if term == "":
        return text
    lowered = text.lower()
    wanted = term.lower()
    result = ""
    done = 0
    start = lowered.find(wanted)
    while start != -1:
        end = start + len(wanted)
        result = result + text[done:start] + "[" + text[start:end] + "]"
        done = end
        start = lowered.find(wanted, end)
    return result + text[done:]

print(highlight("Late FEE and a fee", "fee"))
`,
        alternatives: [
          src`
def highlight(text, term):
    if not term:
        return text
    size = len(term)
    result = ""
    i = 0
    while i < len(text):
        if text[i:i + size].lower() == term.lower():
            result += "[" + text[i:i + size] + "]"
            i += size
        else:
            result += text[i]
            i += 1
    return result
`,
        ],
        wrong: [
          {
            code: src`
def highlight(text, term):
    if term == "":
        return text
    return text.replace(term, "[" + term + "]")
`,
            fails: ["returns"],
            why: "`replace` is case-sensitive, so `FEE` isn't highlighted",
          },
          {
            code: src`
def highlight(text, term):
    if term == "":
        return text
    lowered = text.lower()
    return lowered.replace(term.lower(), "[" + term.lower() + "]")
`,
            fails: ["returns"],
            why: "matching works, but the whole result comes back in lower case",
          },
          {
            code: src`
def highlight(text, term):
    lowered = text.lower()
    wanted = term.lower()
    start = lowered.find(wanted)
    if start == -1:
        return text
    end = start + len(wanted)
    return text[:start] + "[" + text[start:end] + "]" + text[end:]
`,
            fails: ["returns"],
            why: "only the first match is wrapped",
          },
        ],
        hints: [
          "Search a lowered copy of the text for the lowered term, but slice pieces out of the original text.",
          "Build the result as you go: the text before the match, then the bracketed match, then search on from the end of the match.",
          "After the loop, add whatever is left after the last match.",
        ],
        task: {
          checks: [
            fn("returns", "highlight", [
              example(["Late FEE and a fee", "fee"], "Late [FEE] and a [fee]"),
              example(["Night Harbor", "harbor"], "Night [Harbor]"),
              example(["Blue Dune", "sand"], "Blue Dune"),
              hiddenCase("a term typed in capitals", ["refund refused", "REFUND"], "[refund] refused"),
              hiddenCase("matches next to each other", ["aaaa", "aa"], "[aa][aa]"),
              hiddenCase("an empty term", ["anything", ""], "anything"),
              hiddenCase("a match at the very end", ["The charge was a Fee", "fee"], "The charge was a [Fee]"),
            ], { label: "highlight() wraps every match, keeping the original capitals" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
text = "sku=HOM-22847;qty=2"
eq = text.find("=")
semi = text.find(";")
print(text[eq + 1:semi], text.find("qty"), text.find("price"))
`,
        choices: ["HOM-22847 14 -1", "=HOM-22847 14 -1", "HOM-22847; 14 -1", "HOM-22847 14 None"],
        answer: 0,
        why: "The slice starts just after `=` and stops before `;`. `qty` starts at position 14, just after the `;` at 13. A missing piece gives -1, not None.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the -1 isn't checked. What does this print?",
        program: src`
email = "nora.garcia"
print(email[email.find("@") + 1:])
`,
        choices: ["nora.garcia", "(nothing)", "None", "IndexError"],
        answer: 0,
        why: "`find` returns -1, so the slice starts at 0 and returns the whole text. No error tells you something went wrong; test for -1 first.",
      },
      {
        id: "q3",
        prompt: "To find every `fee` in a text, where should each new search start?",
        choices: ["Just after the match found last time", "At the match found last time", "At position 0 every time", "At the end of the text"],
        answer: 0,
        why: "Starting at the old match finds it again forever; starting at 0 finds the first match forever. Move past the match.",
      },
    ],
    review: [
      "`find` returns a position or -1; check for -1 before slicing.",
      "`find(piece, start)` searches from `start`; loop from just after each match to find them all.",
      "Search a lowered copy when case doesn't matter, but slice the original text.",
      "Next: count characters and words, and compare texts by their counts.",
    ],
  },

  // ------------------------------------------------------------------ PY-L11-04 counting
  {
    id: "PY-L11-04",
    version: 2,
    slug: "count-values",
    title: "Count characters and words",
    lede: "count() tells how many times a value appears in a text or a list. Counting each distinct value gives a frequency table; comparing counts tells whether two words are anagrams; counting runs compresses text.",
    focus: "Count occurrences with count, build a frequency list of distinct values, and compare or compress texts by counting.",
    minutes: 20,
    objectives: [
      "Use `count` on a text and on a list, and know it counts non-overlapping matches",
      "Build a frequency list: each distinct value once, with its count",
      "Decide whether two texts are anagrams by comparing the count of every letter",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "boolean", "none-value", "identity", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "arithmetic", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-method", "string-index", "string-slice", "string-format", "len-call", "list-literal", "list-index", "list-mutate", "list-sort", "tuple-literal", "tuple-unpack", "string-normalize", "string-split", "conversion", "range-call", "continue-statement", "nested-loop", "truthiness", "while-loop"],
    teaches: ["value-count"],
    blocks: [
      {
        kind: "text",
        md: "Counting answers a surprising number of text questions: *how many complaints mention a fee?*, *which word appears most?*, *are these two words made of the same letters?* `text.count(piece)` counts how many times `piece` occurs in a text, and `items.count(value)` counts a value in a list.\n\nA **frequency table** is a count for each distinct value. Walk the values, skip any you have already counted, and pair each new one with its count.",
      },
      {
        kind: "example",
        title: "Letters in a word, words in a review",
        code: src`
word = "mississippi"
print(word.count("s"), word.count("ss"), word.count("issi"))
letters = []
for ch in word:
    if ch not in letters:
        letters.append(ch)
for ch in letters:
    print(ch, word.count(ch))
words = "great fit great price poor box".split()
print(words.count("great"), words.count("box"), words.count("gr"))
`,
        output: "4 2 1\nm 1\ni 4\ns 4\np 2\n2 1 0\n",
        note: "`count` counts **non-overlapping** matches, scanning left to right: `issi` occurs twice if overlaps were allowed, but the second starts inside the first, so it counts once. On a list, `count` compares whole items: `\"gr\"` isn't an item, so it counts 0.",
      },
      {
        kind: "text",
        md: "Two words are **anagrams** when they use exactly the same letters the same number of times: *listen* and *silent*. Comparing counts says that directly: for every letter in either word, the counts must match. (Sorting both words' letters and comparing the lists works too, and is shorter; counting is the idea that later scales to whole documents.)\n\nCounting **runs** of the same character in a row is a different job: walk the text and keep a count that resets whenever the character changes. That is the idea behind **run-length encoding**, a simple compression.",
      },
      {
        kind: "example",
        title: "Anagrams by counting, and runs of a character",
        code: src`
def is_anagram(a, b):
    """Return True if a and b use the same letters the same number of times (case and spaces ignored)."""
    a = a.lower().replace(" ", "")
    b = b.lower().replace(" ", "")
    for ch in a + b:
        if a.count(ch) != b.count(ch):
            return False
    return True

def longest_run(text):
    """Return (character, length) of the longest run of one character, or None for empty text."""
    if text == "":
        return None
    best_ch = text[0]
    best_len = 0
    run_len = 0
    for i in range(len(text)):
        if i > 0 and text[i] == text[i - 1]:
            run_len = run_len + 1
        else:
            run_len = 1
        if run_len > best_len:
            best_ch = text[i]
            best_len = run_len
    return best_ch, best_len

print(is_anagram("Listen", "Silent"), is_anagram("Dormitory", "dirty room"), is_anagram("aab", "abb"))
print(longest_run("WWWBWWWWBB"), longest_run(""))
`,
        output: "True True False\n('W', 4) None\n",
        note: "Checking only the letters of `a` would miss a letter that `b` has and `a` doesn't, which is why the loop walks `a + b`. In `longest_run`, the count restarts at 1 whenever the character changes.",
      },
      {
        kind: "text",
        md: "**When to use it:** keyword frequency, letter statistics, anagram and permutation checks, simple compression. **Mistakes to avoid:**\n\n- Counting the same value again for every repeat: build the list of distinct values first.\n- Expecting `count` to find overlapping matches.\n- Counting words in raw text: normalise and split first, or `\"fee\"` will also be counted inside `\"feedback\"`.\n\nThis lesson calls `count` once per distinct value, which rescans the text each time. The Collection Algorithms module shows how to count everything in a single pass with a dictionary.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count the vowels",
      prompt: "`count_letter` counts one letter. Change it into `count_vowels`: add up how many of `a`, `e`, `i`, `o`, `u` the text contains, ignoring capitals.",
      spec: [
        ["Function", "`count_vowels(text)`"],
        ["Returns", "the number of vowels a, e, i, o, u in any case"],
      ],
      starter: src`
def count_vowels(text):
    return text.count("a")

print(count_vowels("Night Harbor"))
`,
      answer: src`
def count_vowels(text):
    text = text.lower()
    total = 0
    for vowel in "aeiou":
        total = total + text.count(vowel)
    return total

print(count_vowels("Night Harbor"))
`,
      wrong: [
        {
          code: src`
def count_vowels(text):
    total = 0
    for vowel in "aeiou":
        total = total + text.count(vowel)
    return total
`,
          fails: ["returns"],
          why: "capital vowels such as the `A` in `AEIOU` aren't counted",
        },
      ],
      hints: ["Loop over the five vowels.", "Add each vowel's count to a running total.", "Lower the text first so capitals count too."],
      task: {
        checks: [
          fn("returns", "count_vowels", [
            example(["Night Harbor"], 3),
            hiddenCase("capital vowels", ["AEIOU aeiou"], 10),
            hiddenCase("no vowels", ["Rhythm"], 0),
          ], { label: "count_vowels() counts vowels in any case" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The most frequent ingredient",
        prompt: "Open Food Facts stores ingredients as one comma-separated text per product. Write `most_common_ingredient(products)`: `products` is a list of such texts. Split each on commas, strip and lower each ingredient, and return a tuple `(ingredient, count)` for the ingredient that appears in the most products' lists (count each listing). On a tie, return the ingredient that appears first. Return `None` if there are no ingredients at all.",
        spec: [
          ["Function", "`most_common_ingredient(products)`"],
          ["products", "a list of texts like `\"Sugar, cocoa butter, MILK powder\"`"],
          ["Returns", "`(ingredient, count)` for the most frequent cleaned ingredient, first-seen on a tie; `None` if there are none"],
          ["Example", "`[\"Sugar, salt\", \"salt, Pepper\", \" SALT\"]` → `('salt', 3)`"],
        ],
        starter: src`
def most_common_ingredient(products):
    return None

print(most_common_ingredient(["Sugar, salt", "salt, Pepper", " SALT"]))
`,
        answer: src`
def most_common_ingredient(products):
    """Return (ingredient, count) for the most listed cleaned ingredient, or None."""
    all_items = []
    for text in products:
        for piece in text.split(","):
            item = piece.strip().lower()
            if item != "":
                all_items.append(item)
    best = None
    best_count = 0
    for item in all_items:
        n = all_items.count(item)
        if n > best_count:
            best = item
            best_count = n
    if best is None:
        return None
    return best, best_count

print(most_common_ingredient(["Sugar, salt", "salt, Pepper", " SALT"]))
`,
        alternatives: [
          src`
def most_common_ingredient(products):
    items = []
    for text in products:
        for piece in text.lower().split(","):
            if piece.strip():
                items.append(piece.strip())
    distinct = []
    for item in items:
        if item not in distinct:
            distinct.append(item)
    if not distinct:
        return None
    winner = distinct[0]
    for item in distinct:
        if items.count(item) > items.count(winner):
            winner = item
    return (winner, items.count(winner))
`,
        ],
        wrong: [
          {
            code: src`
def most_common_ingredient(products):
    all_items = []
    for text in products:
        for piece in text.split(","):
            all_items.append(piece)
    best = None
    best_count = 0
    for item in all_items:
        n = all_items.count(item)
        if n > best_count:
            best = item
            best_count = n
    if best is None:
        return None
    return best, best_count
`,
            fails: ["returns"],
            why: "the pieces aren't cleaned, so ` salt`, `salt` and ` SALT` are counted as three different ingredients",
          },
          {
            code: src`
def most_common_ingredient(products):
    all_items = []
    for text in products:
        for piece in text.split(","):
            item = piece.strip().lower()
            if item != "":
                all_items.append(item)
    best = None
    best_count = 0
    for item in all_items:
        n = all_items.count(item)
        if n >= best_count:
            best = item
            best_count = n
    if best is None:
        return None
    return best, best_count
`,
            fails: ["returns"],
            why: "`>=` hands a tie to the ingredient seen last",
          },
          {
            code: src`
def most_common_ingredient(products):
    text = ",".join(products).lower()
    best = None
    best_count = 0
    for piece in text.split(","):
        item = piece.strip()
        if item and text.count(item) > best_count:
            best = item
            best_count = text.count(item)
    if best is None:
        return None
    return best, best_count
`,
            fails: ["returns"],
            why: "counting inside the joined text also counts `salt` inside `unsalted`",
          },
        ],
        hints: [
          "First build one list of every cleaned ingredient from every product (split, strip, lower, skip empties).",
          "Then `count` each ingredient in that list and keep the best so far.",
          "Replace the best only on a strictly higher count, so the first-seen ingredient wins a tie.",
        ],
        task: {
          checks: [
            fn("returns", "most_common_ingredient", [
              example([["Sugar, salt", "salt, Pepper", " SALT"]], tup("salt", 3)),
              example([["Oats"]], tup("oats", 1)),
              example([[]], null),
              hiddenCase("a tie between two ingredients", [["milk, sugar", "milk, sugar"]], tup("milk", 2)),
              hiddenCase("an ingredient inside another one's name", [["unsalted butter, salt", "unsalted butter"]], tup("unsalted butter", 2)),
              hiddenCase("empty pieces between commas", [[",, ,", "water,,water"]], tup("water", 2)),
              hiddenCase("products with only blanks", [[" ", ""]], null),
            ], { label: "most_common_ingredient() finds the most listed ingredient" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Run-length encoding",
        prompt: "Run-length encoding stores a run of the same character as the character followed by the run's length: `\"WWWWBBBW\"` becomes `\"W4B3W1\"`. Write `encode(text)` that returns the encoded text. An empty text encodes to an empty text.",
        spec: [
          ["Function", "`encode(text)`"],
          ["Returns", "for each run of one repeated character, the character then its length, in order"],
          ["Example", "`\"WWWWBBBW\"` → `'W4B3W1'`; `\"abc\"` → `'a1b1c1'`"],
        ],
        starter: src`
def encode(text):
    return ""

print(encode("WWWWBBBW"))
`,
        answer: src`
def encode(text):
    """Return the run-length encoding of text, e.g. WWWB -> W3B1."""
    if text == "":
        return ""
    result = ""
    current = text[0]
    run = 0
    for ch in text:
        if ch == current:
            run = run + 1
        else:
            result = result + current + str(run)
            current = ch
            run = 1
    return result + current + str(run)

print(encode("WWWWBBBW"))
`,
        alternatives: [
          src`
def encode(text):
    pieces = []
    i = 0
    while i < len(text):
        j = i
        while j < len(text) and text[j] == text[i]:
            j += 1
        pieces.append(text[i] + str(j - i))
        i = j
    return "".join(pieces)
`,
        ],
        wrong: [
          {
            code: src`
def encode(text):
    result = ""
    done = []
    for ch in text:
        if ch not in done:
            result = result + ch + str(text.count(ch))
            done.append(ch)
    return result
`,
            fails: ["returns"],
            why: "it counts each character in the whole text, so separate runs of W are merged into one",
          },
          {
            code: src`
def encode(text):
    if text == "":
        return ""
    result = ""
    current = text[0]
    run = 0
    for ch in text:
        if ch == current:
            run = run + 1
        else:
            result = result + current + str(run)
            current = ch
            run = 1
    return result
`,
            fails: ["returns"],
            why: "the last run is never added after the loop",
          },
          {
            code: src`
def encode(text):
    if text == "":
        return ""
    result = ""
    current = text[0]
    run = 0
    for ch in text:
        if ch == current:
            run = run + 1
        else:
            result = result + current + str(run)
            current = ch
            run = 0
    return result + current + str(run)
`,
            fails: ["returns"],
            why: "a new run starts at 0 instead of 1, so every run after the first is one short",
          },
        ],
        hints: [
          "Walk the text keeping the current character and how long its run is so far.",
          "When the character changes, write out the finished run and start a new run at 1.",
          "After the loop the last run is still waiting to be written out.",
        ],
        task: {
          checks: [
            fn("returns", "encode", [
              example(["WWWWBBBW"], "W4B3W1"),
              example(["abc"], "a1b1c1"),
              example([""], ""),
              hiddenCase("a single run", ["zzzzzzzzzzzz"], "z12"),
              hiddenCase("one character", ["x"], "x1"),
              hiddenCase("capitals and lower case are different", ["aAAa"], "a1A2a1"),
              hiddenCase("spaces in the text", ["  ab  "], " 2a1b1 2"),
            ], { label: "encode() writes each run as character and length" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
text = "banana"
print(text.count("a"), text.count("an"), text.count("ana"))
votes = ["yes", "no", "yes", "Yes"]
print(votes.count("yes"), len(votes))
`,
        choices: ["3 2 1\n2 4", "3 2 2\n2 4", "3 2 1\n3 4", "3 1 1\n2 4"],
        answer: 0,
        why: "`ana` occurs at positions 1 and 3, but they overlap, so `count` finds only one. On the list, `\"Yes\"` with a capital is a different item.",
      },
      {
        id: "q2",
        prompt: "A common mistake: checking only one word's letters. What does this print?",
        program: src`
def same_letters(a, b):
    for ch in a:
        if a.count(ch) != b.count(ch):
            return False
    return True

print(same_letters("tea", "teak"), same_letters("teak", "tea"))
`,
        choices: ["True False", "False False", "True True", "False True"],
        answer: 0,
        why: "Every letter of `tea` has the same count in `teak`, so the first call says True, but `k` was never checked. Walk the letters of both texts.",
      },
      {
        id: "q3",
        prompt: "Which job needs counting runs rather than calling count()?",
        choices: ["Compressing WWWWBBBW to W4B3W1", "Finding how many times fee appears in a complaint", "Counting the yes votes in a list", "Checking whether two words are anagrams"],
        answer: 0,
        why: "Run-length encoding needs consecutive repeats, and `count` counts all occurrences anywhere. The other jobs are whole-text counts.",
      },
    ],
    review: [
      "`count` counts non-overlapping occurrences in a text, or equal items in a list.",
      "A frequency table pairs each distinct value with its count; anagrams have equal counts for every letter of both words.",
      "Runs need a counter that resets when the character changes.",
      "Next: check what a text is made of with isdigit, isalpha and isalnum.",
    ],
  },

  // ------------------------------------------------------------------ PY-L11-05 validate
  {
    id: "PY-L11-05",
    version: 2,
    slug: "check-text",
    title: "Validate text with character tests",
    lede: "isdigit(), isalpha() and isalnum() answer whether every character of a text is a digit, a letter, or either. Combined with length and position checks, they validate codes, usernames and numbers before the program trusts them.",
    focus: "Validate text before using it: its length, the characters at fixed positions, and what every character is made of.",
    minutes: 18,
    objectives: [
      "Use `isdigit`, `isalpha` and `isalnum`, and know they are False for an empty text",
      "Combine length, position and character checks into one validation function",
      "Collect every rule a text breaks, not just the first",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-doc", "assignment", "reassignment", "string-value", "whole-number", "boolean", "none-value", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "spaces-in-text", "comparison", "logical", "if-statement", "else-clause", "for-loop", "membership", "string-method", "string-index", "string-slice", "string-format", "len-call", "list-literal", "list-mutate", "conversion", "string-normalize", "string-split", "string-find", "truthiness", "nested-condition", "arithmetic", "continue-statement", "tuple-unpack", "value-count", "nested-loop"],
    teaches: ["string-check"],
    blocks: [
      {
        kind: "text",
        md: "Text typed into a form can't be trusted until it's checked: a ZIP code must be five digits before `int` sees it, and a username must contain only allowed characters before it's stored. Three methods test what a text is made of:\n\n- `text.isdigit()`: every character is a digit (0–9).\n- `text.isalpha()`: every character is a letter.\n- `text.isalnum()`: every character is a letter or a digit.\n\nAll three are **False for an empty text**, and they say nothing about length or position: combine them with `len` and indexing.",
      },
      {
        kind: "example",
        title: "What each test says",
        code: src`
for text in ["77002", "7700a", "", "-5", "3.5", "Nora", "Nora Garcia", "HOM22847"]:
    print("[" + text + "]", text.isdigit(), text.isalpha(), text.isalnum())
`,
        output: "[77002] True False True\n[7700a] False False True\n[] False False False\n[-5] False False False\n[3.5] False False False\n[Nora] False True True\n[Nora Garcia] False False False\n[HOM22847] False False True\n",
        note: "`isdigit` is False for `-5` and `3.5`: a minus sign and a decimal point aren't digits, so it can check a count or a code, not any number. A space makes `isalpha` False, so a full name fails it, and the empty text fails all three.",
      },
      {
        kind: "text",
        md: "Real validation is several rules. Check the cheap structural ones first (length, a separator at a fixed position), then the characters of each part. A function that returns a **list of every problem** lets a form show all its errors at once instead of one per attempt.",
      },
      {
        kind: "example",
        title: "Password rules, all at once",
        code: src`
def password_problems(password):
    """Return a list of every rule the password breaks."""
    problems = []
    if len(password) < 10:
        problems.append("at least 10 characters")
    has_digit = False
    has_letter = False
    has_symbol = False
    for ch in password:
        if ch.isdigit():
            has_digit = True
        elif ch.isalpha():
            has_letter = True
        elif ch != " ":
            has_symbol = True
    if not has_digit:
        problems.append("a digit")
    if not has_letter:
        problems.append("a letter")
    if not has_symbol:
        problems.append("a symbol")
    return problems

print(password_problems("harbor"))
print(password_problems("night-harbor-2024"))
print(password_problems("12345678901"))
`,
        output: "['at least 10 characters', 'a digit', 'a symbol']\n[]\n['a letter', 'a symbol']\n",
        note: "The methods also work on single characters, which is how the loop classifies each one. The rules are independent `if`s, so every broken rule is reported.",
      },
      {
        kind: "text",
        md: "**When to use it:** before converting or storing anything typed by a person or read from a file. **Mistakes to avoid:**\n\n- Expecting `isdigit` to accept negative or decimal numbers.\n- Forgetting that an empty text fails every test, which is usually what you want, but check it deliberately.\n- Validating after converting: `int(\"7a\")` raises ValueError before your check runs.\n- Forgetting to `strip` first when spaces at the ends are allowed.",
      },
    ],
    tryIt: {
      id: "try",
      title: "ZIP+4",
      prompt: "`valid_zip` accepts five-digit ZIP codes. US addresses may also use ZIP+4: five digits, a dash, four digits (`77002-1234`). Extend it to accept both forms.",
      spec: [
        ["Function", "`valid_zip(text)`"],
        ["Returns", "True for `ddddd` or `ddddd-dddd`, otherwise False"],
      ],
      starter: src`
def valid_zip(text):
    return len(text) == 5 and text.isdigit()

print(valid_zip("77002"), valid_zip("77002-1234"))
`,
      answer: src`
def valid_zip(text):
    if len(text) == 5:
        return text.isdigit()
    if len(text) == 10:
        return text[:5].isdigit() and text[5] == "-" and text[6:].isdigit()
    return False

print(valid_zip("77002"), valid_zip("77002-1234"))
`,
      wrong: [
        {
          code: src`
def valid_zip(text):
    return text.replace("-", "").isdigit()
`,
          fails: ["returns"],
          why: "removing the dash accepts any number of digits, and a dash anywhere",
        },
      ],
      hints: ["The two forms have different lengths.", "For the long form, check the two digit parts and the dash between them.", "Any other length is invalid."],
      task: {
        checks: [
          fn("returns", "valid_zip", [
            example(["77002"], true),
            example(["77002-1234"], true),
            hiddenCase("a dash in the wrong place", ["7700-21234"], false),
            hiddenCase("six digits", ["770021"], false),
            hiddenCase("letters in the extension", ["77002-12a4"], false),
          ], { label: "valid_zip() accepts both ZIP forms" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Normalise a flight number",
        prompt: "Travellers type flight numbers in every style: `ua 2034`, `B6 61`, ` 9w405`. A flight number is a two-character airline code followed by 1 to 4 digits. Each airline character is a letter or a digit, but the code is never two digits. Write `flight_code(text)`: ignore spaces anywhere and capitals, and return the flight number in standard form (`UA2034`), or `None` if it isn't a valid flight number.",
        spec: [
          ["Function", "`flight_code(text)`"],
          ["Valid", "2 airline characters (letters or digits, not both digits) then 1–4 digits, once spaces are removed"],
          ["Returns", "the upper-case code without spaces, or `None`"],
          ["Example", "`\"ua 2034\"` → `'UA2034'`; `\"12 345\"` → `None`"],
        ],
        starter: src`
def flight_code(text):
    return None

print(flight_code("ua 2034"), flight_code("12 345"))
`,
        answer: src`
def flight_code(text):
    """Return the flight number as AA9999 with no spaces, or None if it isn't valid."""
    code = text.replace(" ", "").upper()
    if len(code) < 3 or len(code) > 6:
        return None
    airline = code[:2]
    number = code[2:]
    if not airline.isalnum() or airline.isdigit():
        return None
    if not number.isdigit():
        return None
    return code

print(flight_code("ua 2034"), flight_code("12 345"))
`,
        alternatives: [
          src`
def flight_code(text):
    code = ""
    for ch in text:
        if ch != " ":
            code += ch.upper()
    if not 3 <= len(code) <= 6:
        return None
    first, second = code[0], code[1]
    if not (first.isalnum() and second.isalnum()):
        return None
    if first.isdigit() and second.isdigit():
        return None
    if code[2:].isdigit():
        return code
    return None
`,
        ],
        wrong: [
          {
            code: src`
def flight_code(text):
    code = text.replace(" ", "").upper()
    if len(code) < 3 or len(code) > 6:
        return None
    if not code[:2].isalpha():
        return None
    if not code[2:].isdigit():
        return None
    return code
`,
            fails: ["returns"],
            why: "`isalpha` on the airline rejects real codes that contain a digit, such as `B6` and `9W`",
          },
          {
            code: src`
def flight_code(text):
    code = text.replace(" ", "").upper()
    if len(code) < 3 or len(code) > 6:
        return None
    if not code[:2].isalnum():
        return None
    if not code[2:].isdigit():
        return None
    return code
`,
            fails: ["returns"],
            why: "an airline code of two digits is accepted, so `12345` passes",
          },
          {
            code: src`
def flight_code(text):
    code = text.strip().upper()
    if len(code) < 3 or len(code) > 6:
        return None
    airline = code[:2]
    if not airline.isalnum() or airline.isdigit():
        return None
    if not code[2:].isdigit():
        return None
    return code
`,
            fails: ["returns"],
            why: "`strip` only removes spaces at the ends, so `ua 2034` keeps its inner space and fails",
          },
        ],
        hints: [
          "Normalise first: remove every space and upper-case the text.",
          "Check the length, then split the code into the airline part and the number part with slices.",
          "The airline part must be alphanumeric but not all digits; the number part must be all digits.",
        ],
        task: {
          checks: [
            fn("returns", "flight_code", [
              example(["ua 2034"], "UA2034"),
              example(["12 345"], null),
              example(["B6 61"], "B661"),
              hiddenCase("a digit first in the airline code", [" 9w405"], "9W405"),
              hiddenCase("five digits", ["UA12345"], null),
              hiddenCase("no digits after the airline", ["UA"], null),
              hiddenCase("a dash in the code", ["UA-203"], null),
              hiddenCase("spaces between every character", ["d l 1 2"], "DL12"),
            ], { label: "flight_code() normalises valid flight numbers and rejects the rest" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A plausible email address",
        prompt: "A sign-up form wants to catch obvious typos in email addresses before sending a confirmation. Write `valid_email(text)` with these rules, after stripping spaces at the ends: exactly one `@`; the part before it is not empty and uses only letters, digits and `._+-`; the part after it splits on `.` into at least two labels, each made of letters, digits and `-` and not empty; the last label is at least two letters and letters only.",
        spec: [
          ["Function", "`valid_email(text)`"],
          ["Returns", "True if every rule holds, otherwise False"],
          ["Example", "`\"nora.garcia+orders@fastmail.com\"` → `True`; `\"nora@fastmail\"` → `False`"],
        ],
        starter: src`
def valid_email(text):
    return "@" in text

print(valid_email("nora.garcia+orders@fastmail.com"), valid_email("nora@fastmail"))
`,
        answer: src`
def valid_email(text):
    """Return True if text looks like a deliverable email address."""
    text = text.strip()
    if text.count("@") != 1:
        return False
    at = text.find("@")
    local = text[:at]
    domain = text[at + 1:]
    if local == "":
        return False
    for ch in local:
        if not (ch.isalnum() or ch in "._+-"):
            return False
    labels = domain.split(".")
    if len(labels) < 2:
        return False
    for label in labels:
        if not label.replace("-", "").isalnum():
            return False
    last = labels[-1]
    return len(last) >= 2 and last.isalpha()

print(valid_email("nora.garcia+orders@fastmail.com"), valid_email("nora@fastmail"))
`,
        alternatives: [
          src`
def valid_local(local):
    if not local:
        return False
    for ch in local:
        if not ch.isalnum() and ch not in "._+-":
            return False
    return True

def valid_domain(domain):
    labels = domain.split(".")
    if len(labels) < 2:
        return False
    for label in labels:
        if label == "":
            return False
        for ch in label:
            if not ch.isalnum() and ch != "-":
                return False
    return labels[-1].isalpha() and len(labels[-1]) >= 2

def valid_email(text):
    parts = text.strip().split("@")
    if len(parts) != 2:
        return False
    return valid_local(parts[0]) and valid_domain(parts[1])
`,
        ],
        wrong: [
          {
            code: src`
def valid_email(text):
    text = text.strip()
    at = text.find("@")
    if at <= 0:
        return False
    return "." in text[at + 1:]
`,
            fails: ["returns"],
            why: "only the `@` and a dot are checked, so spaces, a second `@` and empty labels all pass",
          },
          {
            code: src`
def valid_email(text):
    local, domain = text.strip().split("@")
    if local == "":
        return False
    for ch in local:
        if not (ch.isalnum() or ch in "._+-"):
            return False
    labels = domain.split(".")
    if len(labels) < 2:
        return False
    for label in labels:
        if not label.replace("-", "").isalnum():
            return False
    return len(labels[-1]) >= 2 and labels[-1].isalpha()
`,
            fails: ["returns"],
            why: "unpacking the split without counting the `@` signs raises ValueError for an address with two of them",
          },
          {
            code: src`
def valid_email(text):
    text = text.strip()
    if text.count("@") != 1:
        return False
    at = text.find("@")
    local = text[:at]
    domain = text[at + 1:]
    if local == "":
        return False
    for ch in local:
        if not (ch.isalnum() or ch in "._+-"):
            return False
    labels = domain.split(".")
    if len(labels) < 2:
        return False
    for label in labels:
        if not label.replace("-", "").isalnum():
            return False
    return True
`,
            fails: ["returns"],
            why: "the last label isn't checked, so `nora@shop.c` and `nora@shop.c0m` pass",
          },
        ],
        hints: [
          "Count the `@` signs first; with exactly one, `find` gives where to cut.",
          "Check every character of the part before the `@`; split the part after it on dots.",
          "Every label must be non-empty and alphanumeric once its dashes are removed; check the last label separately.",
        ],
        task: {
          checks: [
            fn("returns", "valid_email", [
              example(["nora.garcia+orders@fastmail.com"], true),
              example(["nora@fastmail"], false),
              example(["jamal walker@icloud.com"], false),
              hiddenCase("two @ signs", ["a@b@c.com"], false),
              hiddenCase("an empty label in the domain", ["grace@mail..com"], false),
              hiddenCase("a digit in the last label", ["theo@shop.c0m"], false),
              hiddenCase("a hyphenated domain with several labels", ["  iris@my-shop.co.uk "], true),
              hiddenCase("nothing before the @", ["@icloud.com"], false),
              hiddenCase("a one-letter last label", ["hugo@shop.c"], false),
            ], { label: "valid_email() applies every rule" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
print("2024".isdigit(), "B2".isalnum(), "".isalpha(), " 42".isdigit(), " 42".strip().isdigit())
`,
        choices: ["True True False False True", "True True True False True", "True False False True True", "True True False True True"],
        answer: 0,
        why: "An empty text is False for every test. The space in ` 42` isn't a digit, until `strip` removes it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: using isdigit for any number. What does this print?",
        program: src`
for amount in ["12", "-3", "4.50"]:
    if amount.isdigit():
        print(amount, "ok")
    else:
        print(amount, "rejected")
`,
        choices: ["12 ok\n-3 rejected\n4.50 rejected", "12 ok\n-3 ok\n4.50 ok", "12 ok\n-3 rejected\n4.50 ok", "12 ok\n-3 ok\n4.50 rejected"],
        answer: 0,
        why: "`-` and `.` aren't digits, so negative and decimal amounts are rejected. isdigit suits codes and counts, not general numbers.",
      },
      {
        id: "q3",
        prompt: "In what order should a validator check a product code like `HOM-22847`?",
        choices: ["Length first, then the dash position, then each part's characters", "Convert the digits with int first, then check the length", "Check the characters of each part first, then the length", "Only check that the whole code is alphanumeric"],
        answer: 0,
        why: "The length check makes every later index safe, and converting before validating raises ValueError on bad input. `isalnum` alone would reject the dash.",
      },
    ],
    review: [
      "`isdigit`, `isalpha` and `isalnum` test every character, and are False for empty text.",
      "Validate structure first (length, fixed positions), then characters, then convert.",
      "Return every problem so a form can show them all.",
      "Next module: collection algorithms: filter, transform, group, join and de-duplicate records.",
    ],
  },
];
