/**
 * M19 practice: ten independent problems on files and folders (PY-L19-01 … PY-L19-05).
 *
 * Mix: 3 function implementations, 2 debugging (genuinely broken file readers), 2 validation, 1 data
 * transformation, 1 integration and 1 output prediction. Easy: 02, 03, 10. Medium: 06, 12, 13, 16. Hard: 19, 20, 22.
 *
 * Input files come from `task.files` (server logs, R01 order and stock exports, fixed-width payment files) or, where
 * the bytes must not be UTF-8, from a check's setup that writes them. Checks call the learner's function on the
 * public files and on hidden ones (empty files, no final newline, padded lines, existing archives, sub-folders), and
 * read back the files the function wrote. Version 2: every question was replaced; saved progress from version 1
 * does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fileText, fn, hiddenCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures

const serverLog = "08:59 store opened\n09:14 order O100043 packed\n09:40 order O101217 packed\n10:02 order O104839 packed\n";
const stockCsv = "sku,qty\nHOM-52782,4\nBOO-58412,0\n\nGRO-63674,12\n";
const ordersCsv = "order_id,total\nO100043,12.93\nO101217,71.14\nO108024,57.34\n";
const paymentsTxt = ["PAY0000045 0000012.93", "PAY0001357 0000071.14", "PAY0005417 142.77", "", "PAY0008990 0000057.34", ""].join("\n");

/** Setup that writes the supplier folder for check_encodings (some files deliberately not UTF-8). */
const supplierSetup = [
  "from pathlib import Path as _P",
  "_d = _P('supplier')",
  "_d.mkdir(exist_ok=True)",
  "(_d / 'prices.csv').write_bytes('sku,price\\nHOM-52782,47.99\\n'.encode('utf-8'))",
  "(_d / 'menu.csv').write_bytes('item,price\\nTea,2.50\\nCrème brûlée,6.50\\n'.encode('cp1252'))",
  "(_d / 'notes.txt').write_bytes('Café'.encode('cp1252'))",
].join("\n");

const fileBase = ["function-def", "function-param", "function-return", "assignment", "with-statement", "file-open", "encoding-arg", "file-lines", "for-loop", "if-statement", "print-call", "unquoted-name", "top-level-indent"] as const;

export const m19Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q19-02",
    version: 2,
    slug: "last-lines-of-a-log",
    title: "The last lines of a log",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fileBase, "list-literal", "list-mutate", "list-index", "string-method", "comparison", "len-call", "arithmetic", "deque-call", "import-module", "membership", "newline-escape", "print-several", "print-text", "reassignment", "string-index", "string-slice"],
    prompt: "When something breaks, the first thing anyone looks at is the end of the log. Write a function that returns the last few lines of a log file.",
    spec: [
      ["Function", "`tail_lines(path, n)`"],
      ["Returns", "a list of the last `n` lines of the file, without their newlines, in file order"],
      ["Rules", "fewer lines than `n` gives all of them; `n` of 0 gives `[]`; a blank line is still a line (`\"\"`)"],
      ["server.log", "four lines: `08:59 store opened`, then three `order … packed` lines"],
    ],
    hiddenKinds: ["n of 0", "a last line with no newline", "a blank line among the last lines", "n equal to the number of lines"],
    hints: [
      "Read every line into a list first, without its newline.",
      "The answer is the end of that list. Work out where the last `n` items start from the list's length.",
      "Careful with negative slicing: `items[-0:]` is the whole list, not an empty one.",
    ],
    explanation: "Reading the lines into a list and slicing from `len(lines) - n` (never below 0) gives the last `n` lines in order. The tempting `lines[-n:]` is right for every `n` except 0, where `-0` is just 0 and the slice returns the whole file. A `deque(maxlen=n)` is the streaming alternative: it keeps only the newest `n` lines while the file is read, which matters for very large logs.",
    code: {
      starter: src`
def tail_lines(path, n):
    return []

print(tail_lines("server.log", 2))
`,
      answer: src`
def tail_lines(path, n):
    lines = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            lines.append(line.rstrip("\n"))
    start = len(lines) - n
    if start < 0:
        start = 0
    return lines[start:]

print(tail_lines("server.log", 2))
`,
      alternatives: [
        src`
from collections import deque

def tail_lines(path, n):
    recent = deque(maxlen=n)
    with open(path, encoding="utf-8") as log:
        for line in log:
            recent.append(line.rstrip("\n"))
    return list(recent)
`,
      ],
      wrong: [
        {
          code: src`
def tail_lines(path, n):
    with open(path, encoding="utf-8") as source:
        lines = source.read().splitlines()
    return lines[-n:]
`,
          fails: ["returns"],
          why: "`lines[-0:]` is the whole list, so `n` of 0 returns every line",
        },
        {
          code: src`
def tail_lines(path, n):
    lines = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            lines.append(line)
    start = len(lines) - n
    if start < 0:
        start = 0
    return lines[start:]
`,
          fails: ["returns"],
          why: "the lines still end with `\\n`",
        },
        {
          code: src`
def tail_lines(path, n):
    lines = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip() != "":
                lines.append(line.strip())
    start = len(lines) - n
    if start < 0:
        start = 0
    return lines[start:]
`,
          fails: ["returns"],
          why: "blank lines are dropped, but they are lines of the log too",
        },
      ],
      task: {
        files: { "server.log": serverLog, "empty.log": "", "short.log": "09:00 a\n09:01 b", "gap.log": "09:00 a\n\n09:02 c\n" },
        checks: [
          fn("returns", "tail_lines", [
            example(["server.log", 2], ["09:40 order O101217 packed", "10:02 order O104839 packed"]),
            example(["server.log", 10], ["08:59 store opened", "09:14 order O100043 packed", "09:40 order O101217 packed", "10:02 order O104839 packed"]),
            example(["empty.log", 3], []),
            hiddenCase("n of 0", ["server.log", 0], []),
            hiddenCase("a last line with no newline", ["short.log", 1], ["09:01 b"]),
            hiddenCase("a blank line among the last lines", ["gap.log", 2], ["", "09:02 c"]),
            hiddenCase("n equal to the number of lines", ["gap.log", 3], ["09:00 a", "", "09:02 c"]),
          ], { label: "tail_lines() returns the last n lines" }),
        ],
      },
    },
  },
  {
    id: "PY-Q19-03",
    version: 2,
    slug: "fix-the-stock-loader",
    title: "Fix the stock loader",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: [...fileBase, "dict-literal", "dict-lookup", "dict-store", "string-method", "string-split", "tuple-unpack", "conversion", "enumerate-call", "comparison", "logical", "continue-statement", "list-index", "list-mutate", "membership", "print-text", "string-index", "string-slice"],
    prompt: "`load_stock` should read a stock export into a dictionary from SKU to quantity, but it crashes on the real file with `ValueError: not enough values to unpack`. Fix it so it meets the contract below. There is more than one problem.",
    spec: [
      ["Function", "`load_stock(path)`"],
      ["File", "a header line `sku,qty`, then one `SKU,quantity` line per product; blank lines may appear"],
      ["Returns", "a dictionary `{sku: quantity}` with whole-number quantities, e.g. `{'HOM-52782': 4, 'BOO-58412': 0, 'GRO-63674': 12}` for `stock.csv`"],
      ["Rules", "the header is not a product; blank lines are skipped; spaces around either value are ignored"],
    ],
    hiddenKinds: ["a file with only the header", "spaces around the SKU and the quantity", "no blank lines at all"],
    hints: [
      "Run it and read the error, then print `repr(line)` inside the loop to see exactly what each line holds.",
      "Three things are wrong: blank lines reach the split, the header is treated as a product, and the quantity stays text (with a newline on it).",
      "Strip each line, skip it when it is the first line or empty, and convert the quantity before storing it.",
    ],
    explanation: "Every line read from a file ends with `\\n` and the first line is a header. The fixed loop strips the line, skips the header (line 0) and blank lines, splits into SKU and quantity, and stores `int(qty)` under the stripped SKU. Fixing only the crash (skipping blank lines) still returns the header as a product and quantities as text such as `'4'`, so all three changes are needed.",
    code: {
      starter: src`
def load_stock(path):
    stock = {}
    with open(path, encoding="utf-8") as source:
        for line in source:
            sku, qty = line.split(",")
            stock[sku] = qty
    return stock

print(load_stock("stock.csv"))
`,
      answer: src`
def load_stock(path):
    stock = {}
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source):
            line = line.strip()
            if number == 0 or line == "":
                continue
            sku, qty = line.split(",")
            stock[sku.strip()] = int(qty)
    return stock

print(load_stock("stock.csv"))
`,
      alternatives: [
        src`
def load_stock(path):
    with open(path, encoding="utf-8") as source:
        lines = source.read().splitlines()
    stock = {}
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split(",")
        stock[parts[0].strip()] = int(parts[1])
    return stock
`,
      ],
      wrong: [
        {
          code: src`
def load_stock(path):
    stock = {}
    with open(path, encoding="utf-8") as source:
        for line in source:
            line = line.strip()
            if line == "":
                continue
            sku, qty = line.split(",")
            stock[sku.strip()] = int(qty)
    return stock
`,
          fails: ["returns"],
          why: "the header is still read as a product, and `int(\"qty\")` raises ValueError",
        },
        {
          code: src`
def load_stock(path):
    stock = {}
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source):
            line = line.strip()
            if number == 0 or line == "":
                continue
            sku, qty = line.split(",")
            stock[sku.strip()] = qty.strip()
    return stock
`,
          fails: ["returns"],
          why: "the crash is gone but quantities are still text like `'4'`",
        },
      ],
      task: {
        files: { "stock.csv": stockCsv, "header_only.csv": "sku,qty\n", "padded.csv": "sku,qty\n HOM-94585 , 7 \nHOM-67738,15" },
        checks: [
          fn("returns", "load_stock", [
            example(["stock.csv"], { "HOM-52782": 4, "BOO-58412": 0, "GRO-63674": 12 }),
            hiddenCase("a file with only the header", ["header_only.csv"], {}),
            hiddenCase("spaces around the SKU and the quantity", ["padded.csv"], { "HOM-94585": 7, "HOM-67738": 15 }),
          ], { label: "load_stock() reads every product line into {sku: quantity}" }),
        ],
      },
    },
  },
  {
    id: "PY-Q19-10",
    version: 2,
    slug: "fixed-width-check",
    title: "Check a fixed-width payment file",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: [...fileBase, "list-literal", "list-mutate", "string-method", "comparison", "len-call", "enumerate-call", "arithmetic", "list-index", "membership", "newline-escape", "print-several", "print-text", "range-call", "reassignment", "string-index", "string-slice", "string-split"],
    prompt: "A bank accepts payment files in which every record is exactly the same width: a 10-character payment ID, a space, and a 10-character zero-padded amount. Before uploading, find the lines that would be rejected.",
    spec: [
      ["Function", "`bad_lines(path, width)`"],
      ["Returns", "the line numbers (the first line is 1) whose length, not counting the newline, is not `width`, in order"],
      ["Rules", "spaces are part of a record and count towards its length; a blank line is a bad record; an empty file gives `[]`"],
      ["payments.txt", "five lines; line 3 has an unpadded amount and line 4 is blank"],
    ],
    hiddenKinds: ["a record padded with trailing spaces", "a last line with no newline", "an empty file"],
    hints: [
      "Walk the file with a line number, and compare each line's length with `width`.",
      "Only the newline at the end is not part of the record. Remove that and nothing else.",
      "`strip()` would also remove padding spaces that belong to the record; `rstrip(\"\\n\")` removes just the newline.",
    ],
    explanation: "Each line is measured after removing only its trailing newline, so padding spaces still count and a last line without a newline is measured correctly. `strip()` is the classic mistake here: a correctly padded record ends in spaces, and stripping them makes it look too short. Line numbers come from `enumerate(source, start=1)`.",
    code: {
      starter: src`
def bad_lines(path, width):
    bad = []
    return bad

print(bad_lines("payments.txt", 21))
`,
      answer: src`
def bad_lines(path, width):
    bad = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if len(line.rstrip("\n")) != width:
                bad.append(number)
    return bad

print(bad_lines("payments.txt", 21))
`,
      alternatives: [
        src`
def bad_lines(path, width):
    with open(path, encoding="utf-8") as source:
        records = source.read().split("\n")
    if records[-1] == "":
        records = records[:-1]
    bad = []
    for i in range(len(records)):
        if len(records[i]) != width:
            bad.append(i + 1)
    return bad
`,
      ],
      wrong: [
        {
          code: src`
def bad_lines(path, width):
    bad = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if len(line.strip()) != width:
                bad.append(number)
    return bad
`,
          fails: ["returns"],
          why: "`strip()` removes padding spaces that are part of the record",
        },
        {
          code: src`
def bad_lines(path, width):
    bad = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if len(line) != width:
                bad.append(number)
    return bad
`,
          fails: ["returns"],
          why: "the newline is counted, so every line that has one looks one character too long",
        },
        {
          code: src`
def bad_lines(path, width):
    bad = []
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source):
            if len(line.rstrip("\n")) != width:
                bad.append(number)
    return bad
`,
          fails: ["returns"],
          why: "the numbering starts at 0, so every reported line is off by one",
        },
      ],
      task: {
        files: { "payments.txt": paymentsTxt, "padded.txt": "PAY0008991 57.34     \nPAY0008992 0000012.5\n", "no_end.txt": "PAY0000045 0000012.93\nPAY0001357 71.14", "empty.txt": "" },
        checks: [
          fn("returns", "bad_lines", [
            example(["payments.txt", 21], [3, 4]),
            example(["payments.txt", 17], [1, 2, 4, 5]),
            example(["empty.txt", 21], []),
            hiddenCase("a record padded with trailing spaces", ["padded.txt", 21], [2]),
            hiddenCase("a last line with no newline", ["no_end.txt", 21], [2]),
          ], { label: "bad_lines() reports the records of the wrong width" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q19-06",
    version: 2,
    slug: "add-a-subscriber-once",
    title: "Add a subscriber only once",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: [...fileBase, "import-module", "path-call", "file-append", "string-method", "comparison", "boolean", "else-clause", "arithmetic", "except-type", "list-comp", "list-literal", "membership", "nested-condition", "newline-escape", "print-several", "print-text", "reassignment", "string-format", "truthiness", "try-except"],
    prompt: "A newsletter keeps its subscribers in a text file, one email address per line. Sign-ups arrive with stray spaces and capital letters, and people sign up twice. Write a function that adds an address only if it isn't already in the file.",
    spec: [
      ["Function", "`add_subscriber(path, email)`"],
      ["Compare", "addresses are compared after `strip()` and `lower()`, on both sides"],
      ["Effect", "when new, the cleaned address (stripped, lower case) is added on its own line at the end; a missing file is created"],
      ["Returns", "`True` if the address was added, `False` if it was already there"],
      ["Rules", "every existing line ends with a newline; blank lines in the file are ignored"],
    ],
    hiddenKinds: ["an address stored with spaces and capitals", "an empty file", "the same address added twice in a row"],
    hints: [
      "Two steps: look for the address in the file (if the file exists), then append if it wasn't found.",
      "Clean both the new address and each stored line the same way before comparing them.",
      "Return as soon as you find a match; append with mode `\"a\"`, which also creates the file. `Path(path).exists()` tells you whether there's anything to search.",
    ],
    explanation: "The function first normalises the new address, then, if the file exists, scans it line by line comparing normalised lines, returning `False` on a match. Otherwise it appends the cleaned address with `\"a\"` (which creates a missing file) and returns `True`. Comparing raw text misses `SAMUEL_MENSAH@yahoo.com`; skipping the existence check crashes with `FileNotFoundError` on a brand-new list; and storing the address as typed spreads inconsistent entries through the file.",
    code: {
      starter: src`
from pathlib import Path

def add_subscriber(path, email):
    return False

print(add_subscriber("demo.txt", "Mei.Adams48@gmail.com"))
print(add_subscriber("demo.txt", " mei.adams48@GMAIL.com "))
`,
      answer: src`
from pathlib import Path

def add_subscriber(path, email):
    wanted = email.strip().lower()
    if Path(path).exists():
        with open(path, encoding="utf-8") as source:
            for line in source:
                if line.strip().lower() == wanted:
                    return False
    with open(path, "a", encoding="utf-8") as out:
        out.write(wanted + "\n")
    return True

print(add_subscriber("demo.txt", "Mei.Adams48@gmail.com"))
print(add_subscriber("demo.txt", " mei.adams48@GMAIL.com "))
`,
      alternatives: [
        src`
def add_subscriber(path, email):
    wanted = email.strip().lower()
    try:
        with open(path, encoding="utf-8") as source:
            existing = [line.strip().lower() for line in source]
    except FileNotFoundError:
        existing = []
    if wanted in existing:
        return False
    with open(path, "a", encoding="utf-8") as out:
        out.write(f"{wanted}\n")
    return True
`,
      ],
      wrong: [
        {
          code: src`
def add_subscriber(path, email):
    wanted = email.strip().lower()
    with open(path, encoding="utf-8") as source:
        for line in source:
            if line.strip().lower() == wanted:
                return False
    with open(path, "a", encoding="utf-8") as out:
        out.write(wanted + "\n")
    return True
`,
          fails: ["returns", "twice"],
          why: "a list that doesn't exist yet raises FileNotFoundError instead of being created",
        },
        {
          code: src`
from pathlib import Path

def add_subscriber(path, email):
    if Path(path).exists():
        with open(path, encoding="utf-8") as source:
            for line in source:
                if line.strip() == email.strip():
                    return False
    with open(path, "a", encoding="utf-8") as out:
        out.write(email.strip() + "\n")
    return True
`,
          fails: ["returns", "stored", "twice"],
          why: "capital letters make the same address look new, and it is stored as typed",
        },
        {
          code: src`
from pathlib import Path

def add_subscriber(path, email):
    if Path(path).exists():
        with open(path, encoding="utf-8") as source:
            for line in source:
                if line.strip().lower() == email.strip().lower():
                    return False
    with open(path, "a", encoding="utf-8") as out:
        out.write(email + "\n")
    return True
`,
          fails: ["stored"],
          why: "duplicates are caught, but the new address is stored with its stray spaces and capitals",
        },
      ],
      task: {
        files: {
          "subscribers.txt": "isaac.sato62@gmail.com\nsamuel_mensah@yahoo.com\n\n",
          "subscribers2.txt": "isaac.sato62@gmail.com\n",
          "list_a.txt": "isaac.sato62@gmail.com\n",
          "padded.txt": "  Diego@AtlasStudio.com  \n",
          "empty.txt": "",
        },
        checks: [
          fn("returns", "add_subscriber", [
            example(["subscribers.txt", "SAMUEL_MENSAH@yahoo.com"], false),
            example(["fresh.txt", "mei.adams48@gmail.com"], true),
            example(["subscribers2.txt", " Aisha.Silva@gmail.com "], true),
            hiddenCase("an address stored with spaces and capitals", ["padded.txt", "diego@atlasstudio.com"], false),
            hiddenCase("an empty file", ["empty.txt", "x@example.com"], true),
          ], { label: "add_subscriber() says whether the address was added" }),
          fileText("stored", "a new address is stored cleaned, on its own line", "list_a.txt", "isaac.sato62@gmail.com\naisha.silva@gmail.com\n", { setup: "add_subscriber('list_a.txt', ' Aisha.Silva@gmail.com ')" }),
          {
            kind: "expr",
            id: "twice",
            label: "adding the same address twice adds it once",
            hidden: true,
            expr: "_first = add_subscriber('_twice.txt', 'Mei.Adams48@gmail.com')\n_second = add_subscriber('_twice.txt', 'mei.adams48@gmail.com ')\nresult = [_first, _second]",
            expected: py.list(py.bool(true), py.bool(false)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q19-12",
    version: 2,
    slug: "append-without-a-newline",
    title: "Append without a newline",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["with-statement", "file-open", "encoding-arg", "file-append", "file-lines", "assignment", "reassignment", "arithmetic", "for-loop", "print-call", "print-several", "unquoted-name", "top-level-indent", "newline-escape", "membership"],
    prompt: "A packing queue is written, then two more orders are appended. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Write down the file's exact text after each `with` block, newlines included.",
      "The append mode keeps the first two lines. Does either appended text end with a newline?",
      "`for line in f` splits only at newline characters; `repr` shows the newline that each line keeps.",
    ],
    explanation: "After the first block the file is `O100043\\nO101217\\n`. Appending `O104839` and then `O108024\\n` adds `O104839O108024\\n`: the first appended order has no newline, so both land on one line. The loop therefore sees three lines, and the last one, as `repr` shows, still ends with `\\n`.",
    predict: {
      program: src`
with open("queue.txt", "w", encoding="utf-8") as f:
    f.write("O100043\nO101217\n")
with open("queue.txt", "a", encoding="utf-8") as f:
    f.write("O104839")
    f.write("O108024\n")
count = 0
with open("queue.txt", encoding="utf-8") as f:
    for line in f:
        count += 1
        last = line
print(count, repr(last))
`,
      output: "3 'O104839O108024\\n'\n",
      wrongPredictions: ["4 'O108024\\n'", "3 'O104839O108024'", "4 'O108024'", "2 'O101217\\n'"],
    },
  },
  {
    id: "PY-Q19-13",
    version: 2,
    slug: "total-is-always-zero",
    title: "Why is the total always zero?",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: [...fileBase, "reassignment", "arithmetic", "conversion", "string-split", "list-index", "tuple-literal", "enumerate-call", "comparison", "continue-statement", "string-method", "list-literal", "len-call", "membership", "print-text", "string-index", "string-slice"],
    prompt: "`summarize` should return how many orders an export holds and their total value. On `orders.csv` it returns `(4, 0)`: one order too many, and a total of zero. Find and fix every problem.",
    spec: [
      ["Function", "`summarize(path)`"],
      ["File", "a header line `order_id,total`, then one `order_id,total` line per order"],
      ["Returns", "`(number of orders, sum of the totals)`; `orders.csv` gives `(3, 141.41)`"],
    ],
    hiddenKinds: ["a file with only the header", "a single order"],
    hints: [
      "Print something inside the second loop. Does it ever run?",
      "A file object remembers how far it has read; after the first loop there's nothing left to read.",
      "Do the counting and the adding in one pass, and leave the header line out of both.",
    ],
    explanation: "The first loop reads the file to its end, so the second loop never runs and the total stays 0. The header is also counted as an order. One pass that skips line 0 and both counts and adds fixes both. Reopening the file for the second loop removes the zero but crashes on `float(\"total\\n\")` unless the header is skipped there too, and the count is still one too high.",
    code: {
      starter: src`
def summarize(path):
    with open(path, encoding="utf-8") as source:
        count = 0
        for line in source:
            count += 1
        total = 0
        for line in source:
            total += float(line.split(",")[1])
    return (count, total)

print(summarize("orders.csv"))
`,
      answer: src`
def summarize(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source):
            if number == 0:
                continue
            count += 1
            total += float(line.split(",")[1])
    return (count, total)

print(summarize("orders.csv"))
`,
      alternatives: [
        src`
def summarize(path):
    with open(path, encoding="utf-8") as source:
        rows = source.read().splitlines()[1:]
    total = 0
    for row in rows:
        total += float(row.split(",")[1])
    return (len(rows), total)
`,
      ],
      wrong: [
        {
          code: src`
def summarize(path):
    count = 0
    total = 0
    with open(path, encoding="utf-8") as source:
        for line in source:
            count += 1
            total += float(line.split(",")[1])
    return (count, total)
`,
          fails: ["returns"],
          why: "one pass, but the header line reaches `float(\"total\\n\")`, which raises ValueError",
        },
        {
          code: src`
def summarize(path):
    with open(path, encoding="utf-8") as source:
        count = 0
        for line in source:
            count += 1
    with open(path, encoding="utf-8") as source:
        total = 0
        for number, line in enumerate(source):
            if number > 0:
                total += float(line.split(",")[1])
    return (count, total)
`,
          fails: ["returns"],
          why: "reopening fixes the total, but the header is still counted as an order",
        },
      ],
      task: {
        files: { "orders.csv": ordersCsv, "header_only.csv": "order_id,total\n", "one.csv": "order_id,total\nO104839,142.77" },
        checks: [
          fn("returns", "summarize", [
            example(["orders.csv"], py.tuple(py.int(3), py.float(141.41))),
            hiddenCase("a file with only the header", ["header_only.csv"], py.tuple(py.int(0), py.int(0))),
            hiddenCase("a single order with no final newline", ["one.csv"], py.tuple(py.int(1), py.float(142.77))),
          ], { label: "summarize() counts the orders and adds their totals", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
  {
    id: "PY-Q19-16",
    version: 2,
    slug: "combine-daily-exports",
    title: "Combine the daily exports",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 18,
    requires: [...fileBase, "import-module", "path-call", "path-glob", "list-sort", "none-value", "identity", "string-method", "enumerate-call", "comparison", "continue-statement", "arithmetic", "reassignment", "logical", "list-literal", "list-mutate", "list-index", "len-call", "else-clause", "boolean", "end", "membership", "nested-condition", "nested-loop", "newline-escape", "print-several", "print-text", "string-index", "string-slice", "truthiness"],
    prompt: "A folder holds one CSV export per day, each starting with the same header line. Finance wants a single file. Write a function that combines them, keeping the header once.",
    spec: [
      ["Function", "`combine_exports(folder, dest)`"],
      ["Reads", "every `*.csv` file in `folder`, in sorted name order (other files are ignored)"],
      ["Writes", "`dest`: the first file's header line once, then every data line of every file, each ending with `\\n`; blank lines are dropped; `dest` is replaced if it exists"],
      ["Returns", "the number of data lines written"],
      ["Edge cases", "a file may hold only its header, and a file's last line may have no newline; with no CSV files at all, `dest` is created empty and the result is 0"],
    ],
    hiddenKinds: ["a folder whose files hold only headers", "a folder with no CSV files"],
    hints: [
      "Open `dest` once for writing, then loop over the sorted CSV paths and read each one line by line.",
      "The header is line 0 of every file: write it only the first time you see one, and skip it otherwise.",
      "Strip the newline from each line and write it back with your own `\\n`, so a file without a final newline can't run into the next file's first row.",
    ],
    explanation: "One `with` block owns the destination for the whole job. Each source file's line 0 is the header: it is written only when no header has been written yet. Every other non-blank line is written with its own newline, which fixes files whose last line had none. Copying lines as they are joins `O101300,22.50` and the next file's first order into one line; writing every file's header repeats it inside the data.",
    code: {
      starter: src`
from pathlib import Path

def combine_exports(folder, dest):
    rows = 0
    return rows

print(combine_exports("daily", "all.csv"))
with open("all.csv", encoding="utf-8") as combined:
    print(combined.read(), end="")
`,
      answer: src`
from pathlib import Path

def combine_exports(folder, dest):
    rows = 0
    header_written = False
    with open(dest, "w", encoding="utf-8") as out:
        for path in sorted(Path(folder).glob("*.csv")):
            with open(path, encoding="utf-8") as source:
                for number, line in enumerate(source):
                    line = line.rstrip("\n")
                    if number == 0:
                        if not header_written:
                            out.write(line + "\n")
                            header_written = True
                        continue
                    if line == "":
                        continue
                    out.write(line + "\n")
                    rows += 1
    return rows

print(combine_exports("daily", "all.csv"))
with open("all.csv", encoding="utf-8") as combined:
    print(combined.read(), end="")
`,
      alternatives: [
        src`
from pathlib import Path

def combine_exports(folder, dest):
    header = None
    data = []
    for path in sorted(Path(folder).glob("*.csv")):
        lines = path.read_text(encoding="utf-8").splitlines()
        if not lines:
            continue
        if header is None:
            header = lines[0]
        for line in lines[1:]:
            if line.strip():
                data.append(line)
    with open(dest, "w", encoding="utf-8") as out:
        if header is not None:
            out.write(header + "\n")
        for line in data:
            out.write(line + "\n")
    return len(data)
`,
      ],
      wrong: [
        {
          code: src`
from pathlib import Path

def combine_exports(folder, dest):
    rows = 0
    with open(dest, "w", encoding="utf-8") as out:
        for path in sorted(Path(folder).glob("*.csv")):
            with open(path, encoding="utf-8") as source:
                for line in source:
                    if line.strip() == "":
                        continue
                    out.write(line.rstrip("\n") + "\n")
                    rows += 1
    return rows
`,
          fails: ["returns", "combined", "header-once"],
          why: "every file's header is copied and counted as a data line",
        },
        {
          code: src`
from pathlib import Path

def combine_exports(folder, dest):
    rows = 0
    header_written = False
    with open(dest, "w", encoding="utf-8") as out:
        for path in sorted(Path(folder).glob("*.csv")):
            with open(path, encoding="utf-8") as source:
                for number, line in enumerate(source):
                    if number == 0:
                        if not header_written:
                            out.write(line)
                            header_written = True
                        continue
                    if line.strip() == "":
                        continue
                    out.write(line)
                    rows += 1
    return rows
`,
          fails: ["combined"],
          why: "lines are copied as they are, so a file without a final newline runs into the next file's first row",
        },
      ],
      task: {
        files: {
          "daily/2024-01-03.csv": "order_id,total\nO100043,12.93\n",
          "daily/2024-03-13.csv": "order_id,total\nO101217,71.14\nO101300,22.50",
          "daily/2024-08-23.csv": "order_id,total\n",
          "daily/2024-12-03.csv": "order_id,total\nO108024,57.34\n",
          "daily/readme.txt": "exports from the web shop\n",
          "headers/a.csv": "order_id,total\n",
          "headers/b.csv": "order_id,total\n\n",
          "nocsv/notes.txt": "nothing exported\n",
        },
        checks: [
          fn("returns", "combine_exports", [
            example(["daily", "all.csv"], 4),
            hiddenCase("a folder whose files hold only headers", ["headers", "_h.csv"], 0),
            hiddenCase("a folder with no CSV files", ["nocsv", "_n.csv"], 0),
          ], { label: "combine_exports() returns the number of data lines" }),
          fileText("combined", "the combined file has one header and every order, each on its own line", "_all.csv", "order_id,total\nO100043,12.93\nO101217,71.14\nO101300,22.50\nO108024,57.34\n", { setup: "combine_exports('daily', '_all.csv')" }),
          fileText("header-once", "files with only headers give just one header line", "_h2.csv", "order_id,total\n", { setup: "combine_exports('headers', '_h2.csv')", hidden: true }),
          fileText("nothing", "no CSV files give an empty file", "_n2.csv", "", { setup: "combine_exports('nocsv', '_n2.csv')", hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q19-19",
    version: 2,
    slug: "duplicate-uploads",
    title: "Find duplicate uploads",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["function-def", "function-param", "function-return", "assignment", "import-module", "path-call", "path-glob", "list-sort", "for-loop", "if-statement", "comparison", "len-call", "list-literal", "list-mutate", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "membership", "logical", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "comp-if", "defaultdict-call", "list-comp", "list-index", "print-text", "string-index", "truthiness"],
    prompt: "People upload the same file again and again under different names (`orders (2).csv`, `copy of orders.csv`). Find the groups of files in a folder whose contents are exactly the same, byte for byte, so the copies can be cleaned up.",
    spec: [
      ["Function", "`duplicate_groups(folder)`"],
      ["Compare", "the files' bytes: `path.read_bytes()`; two files with the same size but different bytes are not duplicates"],
      ["Returns", "a list of groups; each group is a sorted list of file names (2 or more) with identical contents; groups are sorted by their first name; `[]` when there are no duplicates"],
      ["Ignore", "sub-folders and the files inside them"],
    ],
    hiddenKinds: ["no duplicates at all", "two empty files", "files of the same size with different contents", "a copy inside a sub-folder"],
    hints: [
      "Group file names by their contents: a dictionary whose key is the bytes of a file.",
      "Walk the folder's entries in sorted order, skipping anything that isn't a file, so each group's names come out sorted.",
      "Keep only the groups with more than one name, then sort the list of groups.",
    ],
    explanation: "Bytes objects can be dictionary keys, so grouping by `read_bytes()` puts identical files together without comparing every pair. Visiting the paths in sorted order makes each group's names sorted, and `sorted(groups)` orders the groups by their first name. Grouping by size alone is a common shortcut that reports `logo.txt` and `mark.txt` as copies; forgetting `is_file()` makes `read_bytes()` fail on the sub-folder.",
    code: {
      starter: src`
from pathlib import Path

def duplicate_groups(folder):
    return []

print(duplicate_groups("uploads"))
`,
      answer: src`
from pathlib import Path

def duplicate_groups(folder):
    by_content = {}
    for path in sorted(Path(folder).glob("*")):
        if not path.is_file():
            continue
        data = path.read_bytes()
        if data not in by_content:
            by_content[data] = []
        by_content[data].append(path.name)
    groups = []
    for names in by_content.values():
        if len(names) > 1:
            groups.append(names)
    return sorted(groups)

print(duplicate_groups("uploads"))
`,
      alternatives: [
        src`
from collections import defaultdict
from pathlib import Path

def duplicate_groups(folder):
    seen = defaultdict(list)
    for path in Path(folder).glob("*"):
        if path.is_file():
            seen[path.read_bytes()].append(path.name)
    return sorted([sorted(names) for names in seen.values() if len(names) >= 2])
`,
      ],
      wrong: [
        {
          code: src`
from pathlib import Path

def duplicate_groups(folder):
    by_size = {}
    for path in sorted(Path(folder).glob("*")):
        if not path.is_file():
            continue
        size = path.stat().st_size
        if size not in by_size:
            by_size[size] = []
        by_size[size].append(path.name)
    groups = []
    for names in by_size.values():
        if len(names) > 1:
            groups.append(names)
    return sorted(groups)
`,
          fails: ["returns"],
          why: "files of the same size are grouped even when their bytes differ",
        },
        {
          code: src`
from pathlib import Path

def duplicate_groups(folder):
    by_content = {}
    for path in sorted(Path(folder).glob("*")):
        if not path.is_file():
            continue
        data = path.read_bytes()
        if data not in by_content:
            by_content[data] = []
        by_content[data].append(path.name)
    return sorted(by_content.values())
`,
          fails: ["returns"],
          why: "files with no copy are returned as groups of one",
        },
        {
          code: src`
from pathlib import Path

def duplicate_groups(folder):
    by_content = {}
    for path in sorted(Path(folder).glob("*")):
        data = path.read_bytes()
        if data not in by_content:
            by_content[data] = []
        by_content[data].append(path.name)
    groups = []
    for names in by_content.values():
        if len(names) > 1:
            groups.append(names)
    return sorted(groups)
`,
          fails: ["returns"],
          why: "`read_bytes()` on a sub-folder raises an error; folders have to be skipped",
        },
      ],
      task: {
        files: {
          "uploads/a_orders.csv": "order_id\nO1\n",
          "uploads/copy of orders.csv": "order_id\nO1\n",
          "uploads/orders (2).csv": "order_id\nO1\n",
          "uploads/logo.txt": "LOGO",
          "uploads/mark.txt": "MARK",
          "uploads/notes.txt": "call supplier\n",
          "uploads/notes-final.txt": "call supplier\n",
          "uploads/old/a_orders.csv": "order_id\nO1\n",
          "unique/a.csv": "1\n",
          "unique/b.csv": "2\n",
          "blanks/one.txt": "",
          "blanks/two.txt": "",
          "blanks/three.txt": "3",
          "nested/x.csv": "same\n",
          "sizes/a.txt": "LOGO",
          "sizes/b.txt": "MARK",
          "sizes/c.txt": "LOGO",
          "nested/inner/y.csv": "same\n",
        },
        checks: [
          fn("returns", "duplicate_groups", [
            example(["uploads"], [["a_orders.csv", "copy of orders.csv", "orders (2).csv"], ["notes-final.txt", "notes.txt"]]),
            example(["unique"], []),
            example(["blanks"], [["one.txt", "two.txt"]]),
            hiddenCase("files of the same size with different contents", ["sizes"], [["a.txt", "c.txt"]]),
            hiddenCase("a copy inside a sub-folder", ["nested"], []),
            hiddenCase("a folder of copies inside another folder", ["uploads/old"], []),
            hiddenCase("no duplicates at all", ["unique"], []),
          ], { label: "duplicate_groups() groups files with identical bytes" }),
        ],
      },
    },
  },
  {
    id: "PY-Q19-20",
    version: 2,
    slug: "which-files-are-not-utf8",
    title: "Which supplier files aren't UTF-8?",
    format: "validation",
    difficulty: "hard",
    minutes: 20,
    requires: ["function-def", "function-param", "function-return", "assignment", "import-module", "path-call", "path-glob", "text-bytes", "list-sort", "try-except", "except-type", "except-as", "for-loop", "dict-literal", "dict-store", "arithmetic", "string-slice", "value-count", "none-value", "print-call", "unquoted-name", "top-level-indent", "string-index", "list-index", "boolean", "comment", "comment-out", "comparison", "encoding-arg", "if-statement", "list-mutate", "membership", "nested-loop", "newline-escape", "precedence", "print-text", "range-call", "reassignment", "unicode-text"],
    prompt: "Suppliers send price lists as CSV files, and some of them still save in an old Windows encoding. Before importing, tell each supplier exactly which line of their file is broken.",
    spec: [
      ["Function", "`check_encodings(folder)`"],
      ["Checks", "every `*.csv` file in `folder`: can its bytes (`path.read_bytes()`) be decoded as UTF-8?"],
      ["Returns", "a dictionary from file name to `None` when it decodes, or the line number (from 1) holding the first byte that can't be decoded"],
      ["Error details", "in `except UnicodeDecodeError as err:`, `err.start` is the position of the first bad byte; the line number is how many `\\n` bytes come before it, plus 1"],
      ["Counting", "`data[:n].count(b\"\\n\")` counts the newline bytes in the first `n` bytes"],
    ],
    hiddenKinds: ["a bad byte on the very first line", "a folder with no CSV files", "a bad byte after the last newline"],
    hints: [
      "Read each CSV file's bytes and try to decode them; a file that decodes maps to None.",
      "When decoding fails, the error tells you where: keep it with `as err` and read `err.start`.",
      "Count the newline bytes before that position and add one, because lines are numbered from 1.",
    ],
    explanation: "Decoding the raw bytes, rather than opening the file in text mode, keeps the bytes available after the failure. `UnicodeDecodeError.start` is the offset of the first undecodable byte, and the number of `\\n` bytes before it, plus one, is its line. Returning the byte position instead, or forgetting the `+ 1`, points the supplier at the wrong place; using `glob(\"*\")` reports files that were never meant to be imported.",
    code: {
      starter: src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    return report

# A sample folder: prices.csv is UTF-8, menu.csv was saved as cp1252.
supplier = Path("supplier")
supplier.mkdir(exist_ok=True)
(supplier / "prices.csv").write_text("sku,price\nHOM-52782,47.99\n", encoding="utf-8")
(supplier / "menu.csv").write_text("item,price\nTea,2.50\nCrème brûlée,6.50\n", encoding="cp1252")
print(check_encodings("supplier"))
`,
      answer: src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    for path in sorted(Path(folder).glob("*.csv")):
        data = path.read_bytes()
        try:
            data.decode("utf-8")
            report[path.name] = None
        except UnicodeDecodeError as err:
            report[path.name] = data[:err.start].count(b"\n") + 1
    return report

# A sample folder: prices.csv is UTF-8, menu.csv was saved as cp1252.
supplier = Path("supplier")
supplier.mkdir(exist_ok=True)
(supplier / "prices.csv").write_text("sku,price\nHOM-52782,47.99\n", encoding="utf-8")
(supplier / "menu.csv").write_text("item,price\nTea,2.50\nCrème brûlée,6.50\n", encoding="cp1252")
print(check_encodings("supplier"))
`,
      alternatives: [
        src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    for path in Path(folder).glob("*.csv"):
        data = path.read_bytes()
        line = None
        try:
            data.decode("utf-8")
        except UnicodeDecodeError as err:
            line = 1
            for i in range(err.start):
                if data[i] == 10:
                    line += 1
        report[path.name] = line
    return report
`,
      ],
      wrong: [
        {
          code: src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    for path in sorted(Path(folder).glob("*.csv")):
        data = path.read_bytes()
        try:
            data.decode("utf-8")
            report[path.name] = None
        except UnicodeDecodeError as err:
            report[path.name] = err.start
    return report
`,
          fails: ["supplier", "first-line", "last-line"],
          why: "`err.start` is a byte position, not a line number",
        },
        {
          code: src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    for path in sorted(Path(folder).glob("*.csv")):
        data = path.read_bytes()
        try:
            data.decode("utf-8")
            report[path.name] = None
        except UnicodeDecodeError as err:
            report[path.name] = data[:err.start].count(b"\n")
    return report
`,
          fails: ["supplier", "first-line", "last-line"],
          why: "without `+ 1` the line numbers start at 0",
        },
        {
          code: src`
from pathlib import Path

def check_encodings(folder):
    report = {}
    for path in sorted(Path(folder).glob("*")):
        data = path.read_bytes()
        try:
            data.decode("utf-8")
            report[path.name] = None
        except UnicodeDecodeError as err:
            report[path.name] = data[:err.start].count(b"\n") + 1
    return report
`,
          fails: ["supplier", "no-csv"],
          why: "every file is checked, including notes that aren't CSV imports",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "supplier",
            label: "check_encodings() reports the line of the first bad byte, and None for UTF-8 files",
            show: "check_encodings('supplier')  # prices.csv UTF-8; menu.csv cp1252 with é on line 3; notes.txt not a CSV",
            expr: supplierSetup + "\nresult = check_encodings('supplier')",
            expected: py.dict([[py.str("menu.csv"), py.int(3)], [py.str("prices.csv"), py.none]]),
          },
          {
            kind: "expr",
            id: "first-line",
            label: "a bad byte on the very first line",
            hidden: true,
            expr: "from pathlib import Path as _P\n_d = _P('_v1')\n_d.mkdir(exist_ok=True)\n(_d / 'good.csv').write_bytes('name\\nZoë Müller\\n'.encode('utf-8'))\n(_d / 'bad.csv').write_bytes('été,ok\\n'.encode('cp1252'))\nresult = check_encodings('_v1')",
            expected: py.dict([[py.str("bad.csv"), py.int(1)], [py.str("good.csv"), py.none]]),
          },
          {
            kind: "expr",
            id: "no-csv",
            label: "a folder with no CSV files",
            hidden: true,
            expr: "from pathlib import Path as _P\n_d = _P('_v2')\n_d.mkdir(exist_ok=True)\n(_d / 'readme.txt').write_bytes('Café'.encode('cp1252'))\nresult = check_encodings('_v2')",
            expected: py.dict([]),
          },
          {
            kind: "expr",
            id: "last-line",
            label: "a bad byte after the last newline",
            hidden: true,
            expr: "from pathlib import Path as _P\n_d = _P('_v3')\n_d.mkdir(exist_ok=True)\n(_d / 'tail.csv').write_bytes('a\\nb\\n'.encode('utf-8') + 'ü'.encode('cp1252'))\nresult = check_encodings('_v3')",
            expected: py.dict([[py.str("tail.csv"), py.int(3)]]),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q19-22",
    version: 2,
    slug: "rotate-a-log",
    title: "Rotate a log file",
    format: "integration",
    difficulty: "hard",
    minutes: 22,
    requires: [...fileBase, "import-module", "path-call", "file-append", "list-index", "len-call", "arithmetic", "comparison", "string-method", "list-literal", "list-mutate", "end", "list-comp", "membership", "newline-escape", "print-several", "print-text", "reassignment", "string-format", "string-slice"],
    prompt: "A log that only ever grows becomes impossible to open. Write a function that **rotates** it: the newest lines stay in the log, and older lines move to an archive file next to it.",
    spec: [
      ["Function", "`rotate_log(path, keep)`"],
      ["When", "the log has more than `keep` lines; otherwise nothing changes and no archive is created"],
      ["Archive", "the older lines are added, in order, to the end of `path + \".1\"` (created if missing, never emptied)"],
      ["Log", "afterwards holds only its last `keep` lines, each ending with `\\n`; `keep` may be 0"],
      ["Returns", "how many lines were moved to the archive"],
    ],
    hiddenKinds: ["keep of 0", "an archive that already has lines", "a log with fewer lines than keep", "a log with exactly keep lines"],
    hints: [
      "Read all the lines first. If there aren't more than `keep`, return 0 straight away, before touching any file.",
      "Split the lines at position `len(lines) - keep`: everything before goes to the archive, everything after stays.",
      "Append to the archive (it may hold older rotations) and rewrite the log fresh. Avoid `lines[-keep:]`: with `keep` of 0 it is the whole list.",
    ],
    explanation: "The function decides before writing anything: with `keep` or fewer lines it returns 0 and leaves both files alone. Otherwise it splits at `len(lines) - keep`, appends the old part to the archive with `\"a\"` (earlier rotations must survive), and rewrites the log with `\"w\"`. Negative slices fail for `keep == 0`, opening the archive with `\"w\"` destroys earlier rotations, and opening it before checking creates empty archives for logs that didn't need rotating.",
    code: {
      starter: src`
from pathlib import Path

def rotate_log(path, keep):
    return 0

demo = Path("demo.log")
demo.write_text("l1\nl2\nl3\nl4\nl5\n", encoding="utf-8")
print(rotate_log("demo.log", 2))
print(demo.read_text(encoding="utf-8"), end="")
`,
      answer: src`
from pathlib import Path

def rotate_log(path, keep):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    if len(lines) <= keep:
        return 0
    split = len(lines) - keep
    with open(path + ".1", "a", encoding="utf-8") as archive:
        for line in lines[:split]:
            archive.write(line + "\n")
    with open(path, "w", encoding="utf-8") as log:
        for line in lines[split:]:
            log.write(line + "\n")
    return split

demo = Path("demo.log")
demo.write_text("l1\nl2\nl3\nl4\nl5\n", encoding="utf-8")
print(rotate_log("demo.log", 2))
print(demo.read_text(encoding="utf-8"), end="")
`,
      alternatives: [
        src`
def rotate_log(path, keep):
    with open(path, encoding="utf-8") as source:
        lines = [line.rstrip("\n") for line in source]
    old_count = len(lines) - keep
    if old_count <= 0:
        return 0
    with open(path + ".1", "a", encoding="utf-8") as archive:
        for line in lines[:old_count]:
            archive.write(f"{line}\n")
    with open(path, "w", encoding="utf-8") as log:
        for line in lines[old_count:]:
            log.write(f"{line}\n")
    return old_count
`,
      ],
      wrong: [
        {
          code: src`
from pathlib import Path

def rotate_log(path, keep):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    if len(lines) <= keep:
        return 0
    with open(path + ".1", "a", encoding="utf-8") as archive:
        for line in lines[:-keep]:
            archive.write(line + "\n")
    with open(path, "w", encoding="utf-8") as log:
        for line in lines[-keep:]:
            log.write(line + "\n")
    return len(lines[:-keep])
`,
          fails: ["returns", "zero-log"],
          why: "with `keep` of 0, `lines[:-0]` is empty and `lines[-0:]` is everything, so nothing is rotated",
        },
        {
          code: src`
from pathlib import Path

def rotate_log(path, keep):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    if len(lines) <= keep:
        return 0
    split = len(lines) - keep
    with open(path + ".1", "w", encoding="utf-8") as archive:
        for line in lines[:split]:
            archive.write(line + "\n")
    with open(path, "w", encoding="utf-8") as log:
        for line in lines[split:]:
            log.write(line + "\n")
    return split
`,
          fails: ["archive-appends"],
          why: "opening the archive with `\"w\"` wipes the lines from earlier rotations",
        },
        {
          code: src`
from pathlib import Path

def rotate_log(path, keep):
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    split = len(lines) - keep
    if split < 0:
        split = 0
    with open(path + ".1", "a", encoding="utf-8") as archive:
        for line in lines[:split]:
            archive.write(line + "\n")
    with open(path, "w", encoding="utf-8") as log:
        for line in lines[split:]:
            log.write(line + "\n")
    return split
`,
          fails: ["no-archive"],
          why: "the archive is created even when there was nothing to rotate",
        },
      ],
      task: {
        files: {
          "app.log": "l1\nl2\nl3\nl4\nl5\n",
          "short.log": "only\ntwo\n",
          "zero.log": "a\nb\nc\n",
          "exact.log": "x\ny\nz\n",
          "rot1.log": "08:59 opened\n09:14 O100043\n09:40 O101217\n10:02 O104839\n10:30 O108024\n",
          "rot2.log": "l1\nl2\nl3",
          "rot2.log.1": "older\n",
          "rot3.log": "just one\n",
          "rot4.log": "p\nq\nr\n",
        },
        checks: [
          fn("returns", "rotate_log", [
            example(["app.log", 2], 3),
            example(["short.log", 5], 0),
            hiddenCase("keep of 0", ["zero.log", 0], 3),
            hiddenCase("a log with exactly keep lines", ["exact.log", 3], 0),
          ], { label: "rotate_log() returns how many lines were archived" }),
          fileText("log-kept", "the log keeps only its newest lines", "rot1.log", "10:02 O104839\n10:30 O108024\n", { setup: "rotate_log('rot1.log', 2)" }),
          fileText("archive", "the older lines move to the archive in order", "rot1.log.1", "08:59 opened\n09:14 O100043\n09:40 O101217\n"),
          fileText("archive-appends", "an archive that already has lines keeps them", "rot2.log.1", "older\nl1\nl2\n", { setup: "rotate_log('rot2.log', 1)", hidden: true }),
          { kind: "expr", id: "no-archive", label: "a log with fewer lines than keep gets no archive", hidden: true, expr: "from pathlib import Path as _P\nrotate_log('rot3.log', 4)\nresult = _P('rot3.log.1').exists()", expected: py.bool(false) },
          fileText("zero-log", "keep of 0 leaves the log empty", "rot4.log", "", { setup: "rotate_log('rot4.log', 0)", hidden: true }),
        ],
      },
    },
  },
];
