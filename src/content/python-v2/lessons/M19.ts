/**
 * M19 Files & Directories: five lessons (PY-L19-01 … PY-L19-05).
 *
 * A program forgets everything when it stops; files are how data outlives a run and moves between programs. The
 * module reads and writes text files with an explicit encoding (open/read/write/close), chooses between starting a
 * file fresh and adding to its end ("w", "a", "x"), lets `with` close files and reads them one line at a time,
 * builds paths and lists folders with pathlib, and separates text from the bytes stored on disk (encode/decode,
 * the wrong-encoding errors and how to recover).
 *
 * The runner starts every run in an empty folder, so lesson examples create their own sample file first. Exercises
 * get their input files from `task.files` (shift notes, logs, D07 weather readings, R01 exports), and checks call the
 * learner's function on those files and on hidden ones (empty files, no final newline, other folders), or read
 * back the file the function wrote. Version 2: rewritten from a write-"Mug"-and-read-it-back module.
 */
import type { PyLesson } from "../model";
import { example, fileText, fn, hiddenCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixture files

const visits = "/home\n/products/P0035\n/cart\n";

const appLog = [
  "2025-03-03 08:59 INFO server started",
  "2025-03-03 09:02 ERROR payment PAY0008990 failed: card declined",
  "2025-03-03 09:02 WARNING retrying payment for O108024",
  "2025-03-03 09:03 INFO budget alert: ERROR rate above 1%",
  "2025-03-03 09:15 ERROR timeout calling inventory service",
  "",
].join("\n");

const shopCfg = [
  "# Runtime Market export settings",
  "currency = USD",
  "page_size=50",
  "",
  "timezone = America/New_York",
  "footer = Prices include tax = yes",
  "",
].join("\n");

const titles = [
  "TypeError when I inherit from a base class",
  "How do I read a CSV file without a library?",
  "Sorting a list of dicts by two keys",
  "Why does my csv reader skip the first row?",
  "",
].join("\n");

const readings = ["2024-01-01,6.7", "2024-01-02,7.2", "2024-01-03,n/a", "", "2024-01-04,-1.5", "2024-01-05,", ""].join("\n");

export const m19Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L19-01 open, read, write, close
  {
    id: "PY-L19-01",
    version: 2,
    slug: "read-a-note",
    title: "Read and write a text file",
    lede: "A program forgets everything when it stops. A file keeps text between runs: open it, write or read, and close it, always saying which encoding the text uses.",
    focus: "Open a text file with an explicit encoding, read its whole text or write to it, then close it.",
    minutes: 16,
    objectives: [
      "Write text to a file with `open(path, \"w\", encoding=\"utf-8\")`, remembering that `write` adds no newline",
      "Read a whole file into one string and split it into lines with `splitlines()`",
      "Recognise `FileNotFoundError` and why every `open` names `encoding=\"utf-8\"`",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "string-method", "string-split", "for-loop", "if-statement", "comparison", "conversion", "arithmetic", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "len-call", "runtime-error", "list-index", "list-literal", "dict-literal", "dict-lookup", "dict-store", "continue-statement", "logical", "tuple-unpack", "string-index", "membership", "none-value", "boolean", "spaces-in-text", "list-mutate", "hash-in-text"],
    teaches: ["file-open", "encoding-arg"],
    blocks: [
      {
        kind: "text",
        md: "Every value you've stored so far lives in memory and disappears when the program ends. A **file** keeps text on disk: a shift note for the next person, a log of what happened, an export another program reads.\n\n`open(path, mode, encoding=...)` connects your program to a file and gives back a file object. Mode `\"w\"` opens it for writing (creating it, or emptying it if it exists); leaving the mode out means `\"r\"`, reading. `write(text)` stores text, `read()` returns everything in the file as one string, and `close()` finishes with the file so the text is saved and the file is released.\n\n`encoding=\"utf-8\"` says how characters become bytes on disk. Without it, Python uses the computer's preferred encoding, which is not UTF-8 everywhere (many Windows machines use cp1252), so the same program could read the same file differently. Name it every time.",
      },
      {
        kind: "example",
        title: "Write a shift note, then read it back",
        code: src`
note = open("shift_note.txt", "w", encoding="utf-8")
note.write("Till 2 short by 5.00\n")
note.write("Fridge 3 at 7 C\n")
note.close()

note = open("shift_note.txt", encoding="utf-8")
text = note.read()
note.close()
print(repr(text))
print(text.splitlines())
`,
        output: "'Till 2 short by 5.00\\nFridge 3 at 7 C\\n'\n['Till 2 short by 5.00', 'Fridge 3 at 7 C']\n",
        note: "`write` stores exactly the text you give it, so each line needs its own `\\n`. `read` returns the whole file as one string, newlines included (`repr` shows them). `splitlines()` cuts it into lines and drops the newline characters.",
      },
      {
        kind: "text",
        md: "Reading a file that isn't there is the most common file error. Python stops with `FileNotFoundError` and names the path, which is usually a typo or the wrong folder.",
      },
      {
        kind: "error-example",
        title: "A file that doesn't exist",
        code: src`
handover = open("handover.txt", encoding="utf-8")
print(handover.read())
`,
        error: "FileNotFoundError",
        output: "",
        note: "`FileNotFoundError: [Errno 44] No such file or directory: 'handover.txt'` (the number depends on the system). Opening for writing with `\"w\"` would have created it instead.",
      },
      {
        kind: "text",
        md: "In a real program the path is a parameter, so the same function works on any file. This one totals the refund amounts in a file with one amount per line. The first lines of the example only create a sample file, because every run here starts in an empty folder; in practice the file comes from somewhere else.",
      },
      {
        kind: "example",
        title: "Total the refunds in a file",
        code: src`
def file_total(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    total = 0
    for line in text.splitlines():
        if line.strip() != "":
            total += float(line)
    return total

sample = open("refunds.txt", "w", encoding="utf-8")
sample.write("12.93\n71.14\n\n57.34\n")
sample.close()
print(file_total("refunds.txt"))
`,
        output: "141.41\n",
        note: "The blank line is skipped: `float(\"\")` would raise `ValueError`. The function closes the file as soon as it has the text, then works on the string.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever data has to outlive one run or come from another program. Reading the whole text with `read()` is fine for small files like notes and settings; the next lessons add a safer way to close files and a way to read big ones a line at a time. **Mistakes to avoid:** forgetting the `\\n` when writing lines, leaving out `encoding=\"utf-8\"`, and splitting with `split(\"\\n\")`, which leaves an empty string after the last newline (the concept check runs it).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count lines, not characters",
      prompt: "`visits.txt` holds three page visits, one per line. `line_count` returns how many **characters** the file has. Change it to return how many **lines** it has, then run it: it should print 3.",
      spec: [
        ["Function", "`line_count(path)`"],
        ["Returns", "the number of lines in the file; 0 for an empty file"],
      ],
      starter: src`
def line_count(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    return len(text)

print(line_count("visits.txt"))
`,
      answer: src`
def line_count(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    return len(text.splitlines())

print(line_count("visits.txt"))
`,
      wrong: [
        {
          code: src`
def line_count(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    return len(text.split("\n"))
`,
          fails: ["returns"],
          why: "`split(\"\\n\")` adds an empty piece after the last newline, so three lines count as four",
        },
      ],
      hints: ["The text is already read. Only what `len` measures has to change.", "`len(text)` counts characters. You need a list with one item per line first.", "`splitlines()` turns the text into that list and doesn't leave an empty item at the end."],
      task: {
        files: { "visits.txt": visits, "empty.txt": "", "no_end.txt": "/home\n/cart" },
        checks: [
          fn("returns", "line_count", [
            example(["visits.txt"], 3),
            hiddenCase("an empty file", ["empty.txt"], 0),
            hiddenCase("a last line with no newline after it", ["no_end.txt"], 2),
          ], { label: "line_count() counts the lines in a file" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "How many errors were logged?",
        prompt: "`app.log` is a server log with one event per line, like `2025-03-03 09:15 ERROR timeout calling inventory service`. Write `count_errors(path)`: return how many lines have the level `ERROR`. The level is the third piece of the line when you split it on spaces, and it is always in capitals; a line that merely mentions the word ERROR later does not count.",
        spec: [
          ["Function", "`count_errors(path)`"],
          ["File", "one event per line: date, time, level, then the message, separated by spaces"],
          ["Returns", "the number of lines whose level is exactly `ERROR`; 0 for an empty file"],
          ["Example", "`app.log` has five events, two of them errors → `2`"],
        ],
        starter: src`
def count_errors(path):
    errors = 0
    return errors

print(count_errors("app.log"))
`,
        answer: src`
def count_errors(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    errors = 0
    for line in text.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[2] == "ERROR":
            errors += 1
    return errors

print(count_errors("app.log"))
`,
        alternatives: [
          src`
def count_errors(path):
    log = open(path, encoding="utf-8")
    lines = log.read().splitlines()
    log.close()
    count = 0
    for line in lines:
        pieces = line.split(" ")
        if len(pieces) < 3:
            continue
        if pieces[2] == "ERROR":
            count += 1
    return count
`,
        ],
        wrong: [
          {
            code: src`
def count_errors(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    errors = 0
    for line in text.splitlines():
        if "ERROR" in line:
            errors += 1
    return errors
`,
            fails: ["returns"],
            why: "`in` also counts the INFO line that only mentions ERROR in its message",
          },
          {
            code: src`
def count_errors(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    return text.count("ERROR")
`,
            fails: ["returns"],
            why: "it counts the word anywhere in the file, not the lines whose level is ERROR",
          },
          {
            code: src`
def count_errors(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    errors = 0
    for line in text.splitlines():
        if line.split()[2].upper() == "ERROR":
            errors += 1
    return errors
`,
            fails: ["returns"],
            why: "`upper()` also counts a lower-case `error` level, and a blank line crashes with IndexError",
          },
        ],
        hints: [
          "Read the file's text first, then walk its lines.",
          "Split each line on spaces and look at the piece at position 2, which is the level.",
          "A blank line splits into an empty list, so make sure there are at least three pieces before you look at the third.",
        ],
        task: {
          files: {
            "app.log": appLog,
            "quiet.log": "",
            "mixed.log": "2025-03-04 10:00 error lower-case level\n\n2025-03-04 10:01 ERROR disk full\n2025-03-04 10:02 ERROR disk full",
            "only_info.log": "2025-03-05 07:00 INFO nightly export ok\n2025-03-05 07:01 INFO ERROR count is 0\n",
          },
          checks: [
            fn("returns", "count_errors", [
              example(["app.log"], 2),
              hiddenCase("an empty log", ["quiet.log"], 0),
              hiddenCase("a lower-case level, a blank line and no final newline", ["mixed.log"], 2),
              hiddenCase("messages that mention ERROR on INFO lines", ["only_info.log"], 0),
            ], { label: "count_errors() counts the lines whose level is ERROR" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Read a settings file",
        prompt: "The export job reads its settings from a small text file. Each setting is a line `key = value`; blank lines and lines starting with `#` (after any leading spaces) are ignored. Write `read_settings(path)`: return a dictionary of the settings, with spaces around keys and values removed. A value may itself contain `=`, so split each line at the **first** `=` only. If a key appears twice, the later line wins.",
        spec: [
          ["Function", "`read_settings(path)`"],
          ["Returns", "a dictionary from each key to its value, both as text"],
          ["Splitting", "`line.split(\"=\", 1)` splits at the first `=` only and gives two pieces"],
          ["Example", "`shop.cfg` → `{'currency': 'USD', 'page_size': '50', 'timezone': 'America/New_York', 'footer': 'Prices include tax = yes'}`"],
        ],
        starter: src`
def read_settings(path):
    settings = {}
    return settings

print(read_settings("shop.cfg"))
`,
        answer: src`
def read_settings(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    settings = {}
    for line in text.splitlines():
        line = line.strip()
        if line == "" or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        settings[key.strip()] = value.strip()
    return settings

print(read_settings("shop.cfg"))
`,
        alternatives: [
          src`
def read_settings(path):
    config = open(path, encoding="utf-8")
    lines = config.read().splitlines()
    config.close()
    settings = {}
    for raw in lines:
        cleaned = raw.strip()
        if cleaned and not cleaned.startswith("#"):
            pieces = cleaned.split("=", 1)
            settings[pieces[0].strip()] = pieces[1].strip()
    return settings
`,
        ],
        wrong: [
          {
            code: src`
def read_settings(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    settings = {}
    for line in text.splitlines():
        line = line.strip()
        if line == "" or line.startswith("#"):
            continue
        key, value = line.split("=")
        settings[key.strip()] = value.strip()
    return settings
`,
            fails: ["returns"],
            why: "splitting at every `=` gives three pieces for the footer line, so the unpacking raises ValueError",
          },
          {
            code: src`
def read_settings(path):
    source = open(path, encoding="utf-8")
    text = source.read()
    source.close()
    settings = {}
    for line in text.splitlines():
        if line == "" or line.startswith("#"):
            continue
        key, value = line.split("=", 1)
        settings[key] = value
    return settings
`,
            fails: ["returns"],
            why: "without strip, keys like `'currency '` keep their spaces and an indented comment is read as a setting",
          },
        ],
        hints: [
          "Read the text, then decide line by line: skip it, or split it into a key and a value.",
          "Strip each line before testing it, so an indented `#` comment and a line of spaces are both recognised.",
          "Split at the first `=` only, then strip both pieces before storing them; storing a key again replaces the old value.",
        ],
        task: {
          files: {
            "shop.cfg": shopCfg,
            "blank.cfg": "",
            "comments.cfg": "# nothing set yet\n   # indented comment\n\n",
            "twice.cfg": "currency=USD\n  currency =  EUR  \nretries= 3",
          },
          checks: [
            fn("returns", "read_settings", [
              example(["shop.cfg"], { currency: "USD", page_size: "50", timezone: "America/New_York", footer: "Prices include tax = yes" }),
              hiddenCase("an empty file", ["blank.cfg"], {}),
              hiddenCase("only comments, one of them indented", ["comments.cfg"], {}),
              hiddenCase("a key set twice and no final newline", ["twice.cfg"], { currency: "EUR", retries: "3" }),
            ], { label: "read_settings() reads every key = value line" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
log = open("log.txt", "w", encoding="utf-8")
log.write("start")
log.write("stop")
log.close()
log = open("log.txt", encoding="utf-8")
print(log.read().splitlines())
log.close()
`,
        choices: ["['startstop']", "['start', 'stop']", "['start\\n', 'stop\\n']", "['stop']"],
        answer: 0,
        why: "`write` adds no newline, so both texts end up on one line. Each line you want needs its own `\\n`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: splitting on `\"\\n\"` instead of using `splitlines()`. What does this print?",
        program: src`
ids = open("ids.txt", "w", encoding="utf-8")
ids.write("O100043\nO101217\n")
ids.close()
ids = open("ids.txt", encoding="utf-8")
pieces = ids.read().split("\n")
ids.close()
print(len(pieces), pieces[-1] == "")
`,
        choices: ["3 True", "2 False", "2 True", "3 False"],
        answer: 0,
        why: "The text ends with a newline, so `split` finds an empty piece after it: two IDs and `''`. `splitlines()` would give exactly two.",
      },
      {
        id: "q3",
        prompt: "Why does every `open` in this course pass `encoding=\"utf-8\"`?",
        choices: [
          "Without it Python uses the computer's preferred encoding, which differs between systems",
          "Without it the file is opened as bytes instead of text",
          "Without it `write` adds a newline after each call",
          "Without it the file can only be read, not written",
        ],
        answer: 0,
        why: "The default comes from the system, and many Windows machines don't use UTF-8. Naming it makes the program read and write the same characters everywhere.",
      },
    ],
    review: [
      "`open(path, \"w\", encoding=\"utf-8\")` creates or empties a file for writing; leave the mode out to read.",
      "`write` stores exactly what you give it, newlines included only if you write them.",
      "`read()` returns the whole file as one string; `splitlines()` cuts it into lines without the `\\n`.",
      "Next: choose between starting a file fresh and adding to its end.",
    ],
  },

  // ------------------------------------------------------------------ PY-L19-02 w, a and x
  {
    id: "PY-L19-02",
    version: 2,
    slug: "add-to-a-file",
    title: "Start fresh or add to the end",
    lede: "Mode \"w\" empties a file before writing, mode \"a\" keeps what is there and adds to the end, and mode \"x\" refuses to touch a file that already exists.",
    focus: "Choose the file mode that matches the job: a fresh report (w), a growing log (a) or a file that must not be overwritten (x).",
    minutes: 16,
    objectives: [
      "Explain what `\"w\"`, `\"a\"` and `\"x\"` do to a file that already exists",
      "Append one line per event to a log without losing earlier lines",
      "Write a report that is correct no matter how many times the program runs",
    ],
    requires: ["file-open", "encoding-arg", "function-def", "function-param", "function-return", "assignment", "reassignment", "string-format", "string-method", "for-loop", "if-statement", "comparison", "arithmetic", "len-call", "print-call", "print-several", "print-text", "end", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "list-literal", "list-mutate", "dict-literal", "dict-lookup", "dict-store", "membership", "try-except", "except-type", "none-value", "else-clause", "boolean", "logical", "dict-iterate", "list-index", "nested-loop", "string-index"],
    teaches: ["file-append"],
    blocks: [
      {
        kind: "text",
        md: "Opening a file to write always raises a question: **what happens to what's already in it?** The mode answers it.\n\n- `\"w\"` (write) creates the file, or **empties** it first if it exists.\n- `\"a\"` (append) creates the file, or **keeps** its text and writes after it.\n- `\"x\"` (exclusive) creates the file, and raises `FileExistsError` if it already exists.\n\nA log grows with every event, so it uses `\"a\"`. A daily report should describe today only, so it uses `\"w\"`. An invoice that must never be silently replaced uses `\"x\"`.",
      },
      {
        kind: "example",
        title: "An activity log that grows",
        code: src`
def log_event(path, message):
    log = open(path, "a", encoding="utf-8")
    log.write(message + "\n")
    log.close()

log_event("activity.log", "08:59 store opened")
log_event("activity.log", "09:14 order O100043 packed")
log_event("activity.log", "09:40 order O101217 packed")

log = open("activity.log", encoding="utf-8")
print(log.read(), end="")
log.close()
`,
        output: "08:59 store opened\n09:14 order O100043 packed\n09:40 order O101217 packed\n",
        note: "Each call opens the file, adds one line at the end and closes it. The first call creates the file because it doesn't exist yet. `end=\"\"` stops `print` adding a blank line after the file's own last newline.",
      },
      {
        kind: "text",
        md: "A report is the opposite job. If it appended, running the program twice would put two reports in one file. With `\"w\"` every run replaces the old contents, so the file always describes the latest run.",
      },
      {
        kind: "example",
        title: "A daily report that starts fresh",
        code: src`
def write_report(path, orders):
    delivered = 0
    for order in orders:
        if order["status"] == "delivered":
            delivered += 1
    report = open(path, "w", encoding="utf-8")
    report.write(f"orders: {len(orders)}\n")
    report.write(f"delivered: {delivered}\n")
    report.close()

orders = [
    {"order_id": "O100043", "status": "delivered"},
    {"order_id": "O108024", "status": "cancelled"},
    {"order_id": "O108752", "status": "delivered"},
]
write_report("daily.txt", orders)
write_report("daily.txt", orders)

report = open("daily.txt", encoding="utf-8")
print(report.read(), end="")
report.close()
`,
        output: "orders: 3\ndelivered: 2\n",
        note: "The second call empties the file before writing, so the report appears once. Only the writes made while the file is open in `\"w\"` survive.",
      },
      {
        kind: "error-example",
        title: "x refuses to replace a file",
        code: src`
first = open("invoice_536374.txt", "x", encoding="utf-8")
first.write("Invoice 536374: 32 x VICTORIAN SEWING BOX LARGE\n")
first.close()
second = open("invoice_536374.txt", "x", encoding="utf-8")
`,
        error: "FileExistsError",
        output: "",
        note: "`FileExistsError: ... File exists: 'invoice_536374.txt'`. The first invoice is safe; with `\"w\"` the second open would have wiped it without a word.",
      },
      {
        kind: "text",
        md: "**When to use which:** `\"a\"` for logs and records that accumulate, `\"w\"` for output that is rebuilt from scratch each time, `\"x\"` when overwriting would destroy something. **Mistakes to avoid:** opening with `\"w\"` inside a loop (each pass wipes the previous pass's line), and appending to a report, which duplicates it on every run.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Keep every visit",
      prompt: "`log_visit` is meant to add one page to a visit log, but after three calls the file holds only the last page. Change the mode so each call adds a line instead of replacing the file.",
      spec: [
        ["Function", "`log_visit(path, page)`"],
        ["Effect", "adds `page` and a newline to the end of the file, creating it if needed"],
      ],
      starter: src`
def log_visit(path, page):
    log = open(path, "w", encoding="utf-8")
    log.write(page + "\n")
    log.close()

log_visit("visits.log", "/home")
log_visit("visits.log", "/products/P0035")
log_visit("visits.log", "/cart")
log = open("visits.log", encoding="utf-8")
print(log.read(), end="")
log.close()
`,
      answer: src`
def log_visit(path, page):
    log = open(path, "a", encoding="utf-8")
    log.write(page + "\n")
    log.close()

log_visit("visits.log", "/home")
log_visit("visits.log", "/products/P0035")
log_visit("visits.log", "/cart")
log = open("visits.log", encoding="utf-8")
print(log.read(), end="")
log.close()
`,
      wrong: [
        {
          code: src`
def log_visit(path, page):
    log = open(path, "a", encoding="utf-8")
    log.write(page)
    log.close()
`,
          fails: ["three", "existing"],
          why: "the visits are appended but run together on one line",
        },
      ],
      hints: ["The write is fine. The problem is what opening the file does to its old contents.", "One mode empties the file first; another keeps it.", "Use the append mode, `\"a\"`."],
      task: {
        files: { "old.log": "/home\n" },
        checks: [
          fileText("three", "three calls leave three lines", "_t1.log", "/home\n/products/P0035\n/cart\n", { setup: "log_visit('_t1.log', '/home')\nlog_visit('_t1.log', '/products/P0035')\nlog_visit('_t1.log', '/cart')" }),
          fileText("existing", "a visit is added after the lines already in a log", "old.log", "/home\n/checkout\n", { setup: "log_visit('old.log', '/checkout')", hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Record each sale",
        prompt: "The till appends every sale to `sales.csv` as it happens. Write `record_sale(path, order_id, total)`: add one line `order_id,total` to the end of the file, with the total always shown with two decimal places (`5` → `5.00`). Lines already in the file must stay.",
        spec: [
          ["Function", "`record_sale(path, order_id, total)`"],
          ["Effect", "adds a line like `O100043,12.93` and a newline at the end of the file; creates the file if it doesn't exist"],
          ["Returns", "nothing"],
          ["Example", "two calls, `(\"O100043\", 12.93)` and `(\"O108024\", 57.3)` → the file reads `O100043,12.93\\nO108024,57.30\\n`"],
        ],
        starter: src`
def record_sale(path, order_id, total):
    pass

record_sale("sales.csv", "O100043", 12.93)
record_sale("sales.csv", "O108024", 57.3)
sales = open("sales.csv", encoding="utf-8")
print(sales.read(), end="")
sales.close()
`,
        answer: src`
def record_sale(path, order_id, total):
    sales = open(path, "a", encoding="utf-8")
    sales.write(f"{order_id},{total:.2f}\n")
    sales.close()

record_sale("sales.csv", "O100043", 12.93)
record_sale("sales.csv", "O108024", 57.3)
sales = open("sales.csv", encoding="utf-8")
print(sales.read(), end="")
sales.close()
`,
        alternatives: [
          src`
def record_sale(path, order_id, total):
    line = order_id + "," + f"{total:.2f}" + "\n"
    out = open(path, mode="a", encoding="utf-8")
    out.write(line)
    out.close()
`,
        ],
        wrong: [
          {
            code: src`
def record_sale(path, order_id, total):
    sales = open(path, "w", encoding="utf-8")
    sales.write(f"{order_id},{total:.2f}\n")
    sales.close()
`,
            fails: ["two-sales", "existing"],
            why: "`\"w\"` empties the file on every call, so only the last sale is kept",
          },
          {
            code: src`
def record_sale(path, order_id, total):
    sales = open(path, "a", encoding="utf-8")
    sales.write(f"{order_id},{total}\n")
    sales.close()
`,
            fails: ["two-sales", "whole"],
            why: "without `:.2f`, 57.3 is written as `57.3` and 5 as `5`",
          },
        ],
        hints: [
          "Each call should add to the end of the file, never replace it. Which mode does that?",
          "Build the line with an f-string; a format spec after a colon controls how many decimals a number shows.",
          "End the line with `\\n` so the next sale starts on its own line, and close the file.",
        ],
        task: {
          files: { "existing.csv": "order_id,total\nO100043,12.93\n" },
          checks: [
            fileText("two-sales", "two sales become two lines with two decimals", "_s1.csv", "O100043,12.93\nO108024,57.30\n", { setup: "record_sale('_s1.csv', 'O100043', 12.93)\nrecord_sale('_s1.csv', 'O108024', 57.3)" }),
            fileText("existing", "a sale is added after a header and earlier sales", "existing.csv", "order_id,total\nO100043,12.93\nO101217,71.14\n", { setup: "record_sale('existing.csv', 'O101217', 71.14)", hidden: true }),
            fileText("whole", "a whole-number total is written with two decimals", "_s2.csv", "O104839,5.00\n", { setup: "record_sale('_s2.csv', 'O104839', 5)", hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "One file per order status",
        prompt: "The warehouse wants the order IDs split into one file per status: `delivered.txt`, `cancelled.txt` and so on, each with one ID per line. Write `export_by_status(orders, folder)`: write the files into `folder` (an existing folder name like `\"out\"`, so a file path is `folder + \"/\" + status + \".txt\"`) and return a dictionary from each status to how many IDs went into its file. Each export must replace what an earlier export wrote: running it twice must not double the files. Decide, for each order, whether its status's file is being started in this call or added to.",
        spec: [
          ["Function", "`export_by_status(orders, folder)`"],
          ["orders", "a list of dictionaries with `order_id` and `status`"],
          ["Files", "`<folder>/<status>.txt`, one order ID per line, in the order the orders appear"],
          ["Returns", "a dictionary `{status: count}`; `{}` for no orders"],
          ["Example", "the starter's orders → `{'delivered': 2, 'cancelled': 1}`; `out/delivered.txt` reads `O100043\\nO108752\\n`"],
        ],
        starter: src`
def export_by_status(orders, folder):
    counts = {}
    return counts

orders = [
    {"order_id": "O100043", "status": "delivered"},
    {"order_id": "O108024", "status": "cancelled"},
    {"order_id": "O108752", "status": "delivered"},
]
print(export_by_status(orders, "out"))
`,
        answer: src`
def export_by_status(orders, folder):
    counts = {}
    for order in orders:
        status = order["status"]
        if status in counts:
            mode = "a"
            counts[status] += 1
        else:
            mode = "w"
            counts[status] = 1
        out = open(folder + "/" + status + ".txt", mode, encoding="utf-8")
        out.write(order["order_id"] + "\n")
        out.close()
    return counts

orders = [
    {"order_id": "O100043", "status": "delivered"},
    {"order_id": "O108024", "status": "cancelled"},
    {"order_id": "O108752", "status": "delivered"},
]
print(export_by_status(orders, "out"))
`,
        alternatives: [
          src`
def export_by_status(orders, folder):
    groups = {}
    for order in orders:
        if order["status"] not in groups:
            groups[order["status"]] = []
        groups[order["status"]].append(order["order_id"])
    counts = {}
    for status, ids in groups.items():
        out = open(f"{folder}/{status}.txt", "w", encoding="utf-8")
        for order_id in ids:
            out.write(order_id + "\n")
        out.close()
        counts[status] = len(ids)
    return counts
`,
        ],
        wrong: [
          {
            code: src`
def export_by_status(orders, folder):
    counts = {}
    for order in orders:
        status = order["status"]
        if status not in counts:
            counts[status] = 0
        counts[status] += 1
        out = open(folder + "/" + status + ".txt", "a", encoding="utf-8")
        out.write(order["order_id"] + "\n")
        out.close()
    return counts
`,
            fails: ["delivered-file", "twice"],
            why: "always appending never starts a file fresh, so a second export adds every ID again",
          },
          {
            code: src`
def export_by_status(orders, folder):
    counts = {}
    for order in orders:
        status = order["status"]
        if status not in counts:
            counts[status] = 0
        counts[status] += 1
        out = open(folder + "/" + status + ".txt", "w", encoding="utf-8")
        out.write(order["order_id"] + "\n")
        out.close()
    return counts
`,
            fails: ["delivered-file", "twice"],
            why: "`\"w\"` on every order empties the file each time, so only the last ID of each status survives",
          },
        ],
        hints: [
          "The counting is the familiar dictionary pattern. The new decision is the mode for each `open`.",
          "The first time a status appears in this call, its file should be started fresh; after that, added to.",
          "Whether a status is already a key in your counts dictionary tells you which of those two cases you're in.",
        ],
        task: {
          files: { "out/notes.txt": "export folder\n", "again/delivered.txt": "OLD1\nOLD2\n" },
          checks: [
            fn("returns", "export_by_status", [
              example([[{ order_id: "O100043", status: "delivered" }, { order_id: "O108024", status: "cancelled" }, { order_id: "O108752", status: "delivered" }], "out"], { delivered: 2, cancelled: 1 }),
              example([[], "out"], {}),
              hiddenCase("one status only", [[{ order_id: "O1", status: "returned" }, { order_id: "O2", status: "returned" }, { order_id: "O3", status: "returned" }], "out"], { returned: 3 }),
            ], { label: "export_by_status() counts the orders per status" }),
            fileText("delivered-file", "the delivered file lists both delivered orders in order", "out/delivered.txt", "O100043\nO108752\n", {
              setup: "export_by_status([{'order_id': 'O100043', 'status': 'delivered'}, {'order_id': 'O108024', 'status': 'cancelled'}, {'order_id': 'O108752', 'status': 'delivered'}], 'out')",
            }),
            fileText("twice", "an export replaces an older file instead of adding to it", "again/delivered.txt", "O9\nO7\n", {
              setup: "_o = [{'order_id': 'O9', 'status': 'delivered'}, {'order_id': 'O8', 'status': 'cancelled'}, {'order_id': 'O7', 'status': 'delivered'}]\nexport_by_status(_o, 'again')\nexport_by_status(_o, 'again')",
              hidden: true,
            }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
f = open("stock.txt", "w", encoding="utf-8")
f.write("HOM-52782 4\n")
f.close()
f = open("stock.txt", "a", encoding="utf-8")
f.write("BOO-58412 9\n")
f.close()
f = open("stock.txt", "w", encoding="utf-8")
f.write("GRO-63674 0\n")
f.close()
f = open("stock.txt", encoding="utf-8")
print(f.read().splitlines())
f.close()
`,
        choices: ["['GRO-63674 0']", "['HOM-52782 4', 'BOO-58412 9', 'GRO-63674 0']", "['BOO-58412 9', 'GRO-63674 0']", "['HOM-52782 4', 'GRO-63674 0']"],
        answer: 0,
        why: "The append added a second line, but the last open uses `\"w\"`, which empties the file before writing. Only the final line is left.",
      },
      {
        id: "q2",
        prompt: "A common mistake: opening with `\"w\"` inside the loop. What does this print?",
        program: src`
for sku in ["HOM-52782", "BOO-58412", "GRO-63674"]:
    out = open("skus.txt", "w", encoding="utf-8")
    out.write(sku + "\n")
    out.close()
out = open("skus.txt", encoding="utf-8")
print(out.read(), end="")
out.close()
`,
        choices: ["GRO-63674", "HOM-52782", "HOM-52782\nBOO-58412\nGRO-63674", "(nothing)"],
        answer: 0,
        why: "Every pass reopens the file with `\"w\"`, emptying it, so each SKU replaces the one before. Open once before the loop, or use `\"a\"`.",
      },
      {
        id: "q3",
        prompt: "A nightly job rebuilds `summary.txt` from the day's orders. Which mode should it open the file with?",
        choices: ["\"w\": the old summary should be replaced", "\"a\": every night's summary should pile up in one file", "\"x\": the file must never exist", "No mode: reading is enough"],
        answer: 0,
        why: "The summary describes the latest run only, so it should start fresh. Appending would stack old summaries on top of each other; `\"x\"` would fail from the second night on.",
      },
    ],
    review: [
      "`\"w\"` empties or creates, `\"a\"` keeps and adds, `\"x\"` creates or raises `FileExistsError`.",
      "Logs append; rebuilt reports and exports write fresh, so running twice gives the same file.",
      "Opening with `\"w\"` inside a loop keeps only the last pass.",
      "Next: let `with` close files for you, and read a file one line at a time.",
    ],
  },

  // ------------------------------------------------------------------ PY-L19-03 with, line by line
  {
    id: "PY-L19-03",
    version: 2,
    slug: "close-it-with-with",
    title: "Let with close the file, and read line by line",
    lede: "`with open(...) as f:` closes the file when the block ends, even when an error stops it. `for line in f` reads one line at a time, so a huge file never has to fit in memory.",
    focus: "Open files with `with`, and process a file one line at a time with `for line in f`.",
    minutes: 18,
    objectives: [
      "Use `with open(...) as name:` so the file is closed even if the block raises an error",
      "Loop over a file object to get one line at a time, and remove the newline each line ends with",
      "Read one file and write another in the same `with` statement",
    ],
    requires: ["file-open", "encoding-arg", "file-append", "function-def", "function-param", "function-return", "assignment", "reassignment", "string-method", "string-split", "conversion", "for-loop", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "none-value", "identity", "tuple-literal", "tuple-unpack", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "try-except", "except-type", "continue-statement", "enumerate-call", "string-format", "boolean", "list-literal", "list-index", "len-call", "membership", "break-statement", "list-mutate", "string-index"],
    teaches: ["with-statement", "file-lines"],
    blocks: [
      {
        kind: "text",
        md: "`close()` is easy to forget, and an error between `open` and `close` skips it entirely. An open file holds on to system resources, and text you wrote may not be saved until the file is closed.\n\n`with open(path, encoding=\"utf-8\") as source:` opens the file and names it `source` for the indented block. When the block ends, for any reason (the last line, a `return`, or an error), Python closes the file. From here on, every file in this course is opened this way.\n\nA file object is also something you can loop over: `for line in source:` gives you one line per pass, **including** the `\\n` at its end. Only one line is in memory at a time, so the same loop works on a three-line note and a five-gigabyte log.",
      },
      {
        kind: "example",
        title: "Each line, newline included",
        code: src`
with open("readings.txt", "w", encoding="utf-8") as out:
    out.write("2024-01-01,6.7\n2024-01-02,7.2\n2024-01-03,3.3\n")

with open("readings.txt", encoding="utf-8") as source:
    for line in source:
        print(repr(line))
print(source.closed)
`,
        output: "'2024-01-01,6.7\\n'\n'2024-01-02,7.2\\n'\n'2024-01-03,3.3\\n'\nTrue\n",
        note: "Every line keeps its `\\n`. After the block, `source.closed` is `True`: `with` closed it without a `close()` call.",
      },
      {
        kind: "error-example",
        title: "Writing after the block has closed the file",
        code: src`
with open("readings.txt", "w", encoding="utf-8") as out:
    out.write("2024-01-01,6.7\n")
out.write("2024-01-02,7.2\n")
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: I/O operation on closed file.` The name `out` still exists, but the file it refers to was closed when the indented block ended. Keep every read and write inside the block.",
      },
      {
        kind: "text",
        md: "Processing line by line usually means: strip the newline, split the line into fields, convert, and keep only what the answer needs. This function finds the warmest day in a file of daily maximum temperatures (NOAA readings for one station) without ever holding the whole file.",
      },
      {
        kind: "example",
        title: "The warmest day, one line at a time",
        code: src`
def warmest_day(path):
    best_day = None
    best_temp = None
    with open(path, encoding="utf-8") as source:
        for line in source:
            day, temp_text = line.strip().split(",")
            temp = float(temp_text)
            if best_temp is None or temp > best_temp:
                best_day = day
                best_temp = temp
    return (best_day, best_temp)

with open("tmax.csv", "w", encoding="utf-8") as out:
    out.write("2024-01-01,6.7\n2024-01-02,7.2\n2024-01-03,3.3\n2024-01-04,7.2\n")
print(warmest_day("tmax.csv"))
`,
        output: "('2024-01-02', 7.2)\n",
        note: "`return` inside the `with` block still closes the file. The tie on 2024-01-04 doesn't replace the earlier day because the test is `>`, not `>=`.",
      },
      {
        kind: "text",
        md: "**When to use it:** `with` for every file you open. `for line in file` whenever you can handle a file one line at a time (counting, filtering, finding, copying); `read()` only when you really need all the text at once. **Mistakes to avoid:** forgetting that each line ends with `\\n` (print adds a second one, and the last field of a split keeps it), and looping over the same file object twice: the second loop starts at the end and finds nothing.",
      },
    ],
    tryIt: {
      id: "try",
      title: "SKUs without the newline",
      prompt: "`sku_list` returns the SKUs in `skus.txt`, but each one still ends with `\\n`, so `'HOM-52782\\n' == 'HOM-52782'` is False. Make it append each line without its newline.",
      spec: [
        ["Function", "`sku_list(path)`"],
        ["Returns", "a list of the lines in the file, without their newlines, in order"],
      ],
      starter: src`
def sku_list(path):
    skus = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            skus.append(line)
    return skus

print(sku_list("skus.txt"))
`,
      answer: src`
def sku_list(path):
    skus = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            skus.append(line.strip())
    return skus

print(sku_list("skus.txt"))
`,
      wrong: [
        {
          code: src`
def sku_list(path):
    skus = []
    with open(path, encoding="utf-8") as source:
        for line in source:
            skus.append(line[:-1])
    return skus
`,
          fails: ["returns"],
          why: "cutting off the last character also cuts a real character from a last line that has no newline",
        },
      ],
      hints: ["The loop is right; only the value appended needs to change.", "Every line except perhaps the last ends with a newline character.", "A string method that removes whitespace from both ends gets rid of it safely."],
      task: {
        files: { "skus.txt": "HOM-52782\nBOO-58412\nGRO-63674\n", "last.txt": "HOM-94585\nHOM-67738" },
        checks: [
          fn("returns", "sku_list", [
            example(["skus.txt"], ["HOM-52782", "BOO-58412", "GRO-63674"]),
            hiddenCase("a last line with no newline", ["last.txt"], ["HOM-94585", "HOM-67738"]),
          ], { label: "sku_list() returns each SKU without its newline" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Where is it first mentioned?",
        prompt: "`titles.txt` holds one question title per line from a Q&A site. Write `first_mention(path, word)`: return the line number (the first line is 1) of the first title that contains `word`, ignoring capital letters on both sides, or `None` if no title does. Stop reading as soon as you find it.",
        spec: [
          ["Function", "`first_mention(path, word)`"],
          ["Returns", "a line number counted from 1, or `None`"],
          ["Matching", "`csv` matches `CSV` and `csv`; a part of a word counts (`sort` matches `Sorting`)"],
          ["Example", "`first_mention(\"titles.txt\", \"csv\")` → `2`"],
        ],
        starter: src`
def first_mention(path, word):
    return None

print(first_mention("titles.txt", "csv"))
print(first_mention("titles.txt", "pandas"))
`,
        answer: src`
def first_mention(path, word):
    wanted = word.lower()
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if wanted in line.lower():
                return number
    return None

print(first_mention("titles.txt", "csv"))
print(first_mention("titles.txt", "pandas"))
`,
        alternatives: [
          src`
def first_mention(path, word):
    number = 0
    found = None
    with open(path, encoding="utf-8") as titles:
        for line in titles:
            number += 1
            if word.lower() in line.lower():
                found = number
                break
    return found
`,
        ],
        wrong: [
          {
            code: src`
def first_mention(path, word):
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source):
            if word.lower() in line.lower():
                return number
    return None
`,
            fails: ["returns"],
            why: "`enumerate` counts from 0 unless you say otherwise, so every answer is one too small",
          },
          {
            code: src`
def first_mention(path, word):
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if word in line:
                return number
    return None
`,
            fails: ["returns"],
            why: "without lower-casing both sides, `csv` doesn't match the title that says `CSV`",
          },
          {
            code: src`
def first_mention(path, word):
    found = None
    with open(path, encoding="utf-8") as source:
        for number, line in enumerate(source, start=1):
            if word.lower() in line.lower():
                found = number
    return found
`,
            fails: ["returns"],
            why: "it keeps reading and returns the **last** mention, not the first",
          },
        ],
        hints: [
          "Loop over the open file and keep track of which line number you're on.",
          "Compare lower-case versions of both texts with `in`.",
          "Return from inside the loop as soon as a line matches; reaching the end of the loop means there was no match.",
        ],
        task: {
          files: { "titles.txt": titles, "none.txt": "", "top.txt": "Pandas groupby with two keys\nPANDAS merge\n" },
          checks: [
            fn("returns", "first_mention", [
              example(["titles.txt", "csv"], 2),
              example(["titles.txt", "pandas"], null),
              example(["titles.txt", "sort"], 3),
              hiddenCase("a match on the first line", ["top.txt", "pandas"], 1),
              hiddenCase("a search word in capitals", ["titles.txt", "TYPEERROR"], 1),
              hiddenCase("an empty file", ["none.txt", "csv"], null),
            ], { label: "first_mention() finds the first matching line number" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Copy only the usable readings",
        prompt: "A weather station export has gaps: some temperatures are `n/a` or empty, and there are blank lines. Write `clean_copy(src, dest)`: read `src` line by line and write each usable reading to `dest` as `date,temperature` with its own newline, in the same order. A reading is usable when its temperature converts with `float`. Blank lines are ignored completely. Return a tuple `(kept, skipped)`: how many readings were written and how many non-blank lines were left out.",
        spec: [
          ["Function", "`clean_copy(src, dest)`"],
          ["Input lines", "`2024-01-01,6.7`; the temperature may be text like `n/a` or empty"],
          ["Output file", "only the usable lines, stripped, each ending with `\\n`; `dest` is replaced if it exists"],
          ["Returns", "`(kept, skipped)`; blank lines count as neither"],
          ["Example", "`readings.csv` → `(3, 2)`"],
        ],
        starter: src`
def clean_copy(src, dest):
    kept = 0
    skipped = 0
    return (kept, skipped)

print(clean_copy("readings.csv", "clean.csv"))
`,
        answer: src`
def clean_copy(src, dest):
    kept = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8") as out:
        for line in source:
            line = line.strip()
            if line == "":
                continue
            day, temp_text = line.split(",")
            try:
                float(temp_text)
            except ValueError:
                skipped += 1
                continue
            out.write(line + "\n")
            kept += 1
    return (kept, skipped)

print(clean_copy("readings.csv", "clean.csv"))
`,
        alternatives: [
          src`
def clean_copy(src, dest):
    good = []
    skipped = 0
    with open(src, encoding="utf-8") as source:
        for raw in source:
            text = raw.strip()
            if not text:
                continue
            parts = text.split(",")
            try:
                float(parts[1])
                good.append(text)
            except ValueError:
                skipped += 1
    with open(dest, "w", encoding="utf-8") as out:
        for text in good:
            out.write(f"{text}\n")
    return (len(good), skipped)
`,
        ],
        wrong: [
          {
            code: src`
def clean_copy(src, dest):
    kept = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8") as out:
        for line in source:
            day, temp_text = line.strip().split(",")
            try:
                float(temp_text)
            except ValueError:
                skipped += 1
                continue
            out.write(line)
            kept += 1
    return (kept, skipped)
`,
            fails: ["returns", "file"],
            why: "a blank line splits into one piece, so unpacking it into two names raises ValueError",
          },
          {
            code: src`
def clean_copy(src, dest):
    kept = 0
    skipped = 0
    with open(src, encoding="utf-8") as source, open(dest, "w", encoding="utf-8") as out:
        for line in source:
            line = line.strip()
            if line == "":
                skipped += 1
                continue
            day, temp_text = line.split(",")
            try:
                float(temp_text)
            except ValueError:
                skipped += 1
                continue
            out.write(line + "\n")
            kept += 1
    return (kept, skipped)
`,
            fails: ["returns"],
            why: "blank lines are counted as skipped readings, but they aren't readings at all",
          },
          {
            code: src`
def clean_copy(src, dest):
    kept = 0
    skipped = 0
    with open(src, encoding="utf-8") as source:
        for line in source:
            line = line.strip()
            if line == "":
                continue
            day, temp_text = line.split(",")
            try:
                float(temp_text)
            except ValueError:
                skipped += 1
                continue
            with open(dest, "w", encoding="utf-8") as out:
                out.write(line + "\n")
            kept += 1
    return (kept, skipped)
`,
            fails: ["file"],
            why: "opening `dest` with `\"w\"` for every good line keeps only the last one",
          },
        ],
        hints: [
          "One `with` can open two files: the source to read and the destination to write.",
          "Strip each line first; skip it entirely when it's empty. Otherwise split it into a date and a temperature text.",
          "Try converting the temperature; a ValueError means the line is skipped and counted, and anything else is written with a newline.",
        ],
        task: {
          files: { "readings.csv": readings, "all_good.csv": "2024-02-01,-3.5\n2024-02-02,0", "gaps.csv": "\n\n2024-03-01,n/a\n\n" },
          checks: [
            fn("returns", "clean_copy", [
              example(["readings.csv", "clean.csv"], py.tuple(py.int(3), py.int(2))),
              hiddenCase("every reading usable, no final newline", ["all_good.csv", "_c1.csv"], py.tuple(py.int(2), py.int(0))),
              hiddenCase("only blank lines and one gap", ["gaps.csv", "_c2.csv"], py.tuple(py.int(0), py.int(1))),
            ], { label: "clean_copy() counts kept and skipped readings" }),
            fileText("file", "the clean file holds only the usable readings", "_c3.csv", "2024-01-01,6.7\n2024-01-02,7.2\n2024-01-04,-1.5\n", { setup: "clean_copy('readings.csv', '_c3.csv')" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
with open("two.txt", "w", encoding="utf-8") as f:
    f.write("HOM-52782\nBOO-58412\n")
with open("two.txt", encoding="utf-8") as f:
    for line in f:
        print(f"[{line}]")
`,
        choices: ["[HOM-52782\n]\n[BOO-58412\n]", "[HOM-52782]\n[BOO-58412]", "[HOM-52782\nBOO-58412\n]", "[HOM-52782]\n\n[BOO-58412]"],
        answer: 0,
        why: "Each line still ends with its newline, so the closing bracket lands on the next line. `line.strip()` would keep the brackets on one line.",
      },
      {
        id: "q2",
        prompt: "A common mistake: looping over the same open file twice. What does this print?",
        program: src`
with open("ids.txt", "w", encoding="utf-8") as f:
    f.write("O1\nO2\nO3\n")
with open("ids.txt", encoding="utf-8") as f:
    count = 0
    for line in f:
        count += 1
    again = 0
    for line in f:
        again += 1
print(count, again)
`,
        choices: ["3 0", "3 3", "0 3", "6 0"],
        answer: 0,
        why: "A file object remembers how far it has read. The first loop reads to the end, so the second loop has nothing left. Do both jobs in one loop, or open the file again.",
      },
      {
        id: "q3",
        prompt: "You need to count the lines that mention `timeout` in a 5 GB server log. Why loop with `for line in log:` instead of calling `log.read()`?",
        choices: ["Only one line is in memory at a time, so the size of the file doesn't matter", "`read()` skips lines that contain errors", "`for` closes the file and `read()` doesn't", "`read()` returns bytes, not text"],
        answer: 0,
        why: "`read()` builds one 5 GB string. Looping over the file object reads it piece by piece, and `with` closes it either way.",
      },
    ],
    review: [
      "`with open(...) as name:` closes the file when the block ends, even after an error or a `return`.",
      "`for line in file` reads one line at a time; each line keeps its `\\n` until you strip it.",
      "A file object is used up after one pass; one `with` can open a source and a destination together.",
      "Next: build paths and list folders with pathlib.",
    ],
  },

  // ------------------------------------------------------------------ PY-L19-04 pathlib
  {
    id: "PY-L19-04",
    version: 2,
    slug: "a-path",
    title: "Paths and folders with pathlib",
    lede: "`Path` objects join folder and file names with `/`, take names apart, create folders, read and write whole files, and list a folder's files with `glob`.",
    focus: "Use pathlib's Path to build file paths, inspect their parts, create folders and find files with glob.",
    minutes: 18,
    objectives: [
      "Join path pieces with `/` and read a path's `name`, `stem` and `suffix`",
      "Create folders with `mkdir(parents=True, exist_ok=True)` and check files with `exists()`",
      "List the files that match a pattern with `glob`, in a predictable order",
    ],
    requires: ["import-module", "file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "string-method", "string-split", "for-loop", "if-statement", "comparison", "logical", "arithmetic", "len-call", "list-literal", "list-index", "list-mutate", "list-sort", "dict-literal", "dict-lookup", "dict-store", "membership", "none-value", "boolean", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "string-format", "dict-get", "string-index", "else-clause", "truthiness", "identity", "aggregate-call", "list-comp", "continue-statement", "precedence"],
    teaches: ["path-call", "path-glob"],
    blocks: [
      {
        kind: "text",
        md: "So far a path has been a string like `\"out/delivered.txt\"`. Strings work until you need to take a path apart (what's the file's extension?), join pieces safely, or ask questions (does this file exist? which files are in this folder?).\n\n`from pathlib import Path` gives you `Path` objects. `/` joins pieces: `Path(\"exports\") / \"orders.csv\"`. A path knows its `name` (`orders.csv`), `stem` (`orders`) and `suffix` (`.csv`), can check `exists()`, create a folder with `mkdir`, and read or write a whole small file with `read_text` and `write_text` (each takes `encoding=` like `open`).",
      },
      {
        kind: "example",
        title: "Build a path and take it apart",
        code: src`
from pathlib import Path

report = Path("exports") / "2024-12" / "orders.csv"
print(report)
print(report.name, report.stem, report.suffix)
print(report.exists())

folder = Path("exports") / "2024-12"
folder.mkdir(parents=True, exist_ok=True)
report.write_text("order_id,total\nO108024,57.34\n", encoding="utf-8")
print(report.exists(), report.read_text(encoding="utf-8").splitlines())
`,
        output: "exports/2024-12/orders.csv\norders.csv orders .csv\nFalse\nTrue ['order_id,total', 'O108024,57.34']\n",
        note: "A path can name a file that doesn't exist yet. `parents=True` also creates `exports` itself, and `exist_ok=True` means no error if the folder is already there. `write_text` opens, writes and closes in one call.",
      },
      {
        kind: "error-example",
        title: "Writing into a folder that doesn't exist",
        code: src`
from pathlib import Path

Path("archive/2023/orders.csv").write_text("order_id,total\n", encoding="utf-8")
`,
        error: "FileNotFoundError",
        output: "",
        note: "Opening a file for writing creates the file, never the folders above it. Create them first with `mkdir(parents=True, exist_ok=True)`.",
      },
      {
        kind: "text",
        md: "`folder.glob(\"*.csv\")` finds the files in `folder` whose names match the pattern: `*` stands for any run of characters. The order it finds them in depends on the system, so wrap it in `sorted(...)` whenever order matters. This function reports how many data rows (lines after the header) each daily export has.",
      },
      {
        kind: "example",
        title: "Rows in each daily export",
        code: src`
from pathlib import Path

def rows_per_file(folder):
    counts = {}
    for path in sorted(Path(folder).glob("*.csv")):
        lines = path.read_text(encoding="utf-8").splitlines()
        counts[path.name] = len(lines) - 1
    return counts

exports = Path("exports")
exports.mkdir(exist_ok=True)
(exports / "2024-01-03.csv").write_text("order_id\nO100043\n", encoding="utf-8")
(exports / "2024-03-13.csv").write_text("order_id\nO101217\nO101300\n", encoding="utf-8")
(exports / "notes.txt").write_text("sent to finance\n", encoding="utf-8")
print(rows_per_file("exports"))
`,
        output: "{'2024-01-03.csv': 1, '2024-03-13.csv': 2}\n",
        note: "`notes.txt` doesn't match `*.csv`, so it's ignored. Date-named files sort into date order because the year comes first. `read_text` is fine for small files; a huge one would be read line by line with `open`.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever your program builds paths, checks for files, or works through a folder. `Path` objects can be passed to `open` too. **Mistakes to avoid:** gluing strings together and forgetting the `/`, assuming `glob` returns files in a useful order, and writing into a folder you haven't created.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the JSON files",
      prompt: "`json_files` lists every file in a folder. Change the pattern so it lists only the files ending in `.json`.",
      spec: [
        ["Function", "`json_files(folder)`"],
        ["Returns", "the sorted names of the `.json` files in `folder`"],
      ],
      starter: src`
from pathlib import Path

def json_files(folder):
    names = []
    for path in sorted(Path(folder).glob("*")):
        names.append(path.name)
    return names

print(json_files("inbox"))
`,
      answer: src`
from pathlib import Path

def json_files(folder):
    names = []
    for path in sorted(Path(folder).glob("*.json")):
        names.append(path.name)
    return names

print(json_files("inbox"))
`,
      wrong: [
        {
          code: src`
from pathlib import Path

def json_files(folder):
    names = []
    for path in sorted(Path(folder).glob("*json*")):
        names.append(path.name)
    return names
`,
          fails: ["returns"],
          why: "the pattern also matches `json_notes.txt`, which only has json in its name",
        },
      ],
      hints: ["Only the text inside `glob(...)` needs to change.", "`*` matches any run of characters; the rest of the pattern must match exactly.", "Put the file extension after the star."],
      task: {
        files: { "inbox/page-2.json": "{}", "inbox/page-1.json": "{}", "inbox/export.csv": "a\n", "inbox/json_notes.txt": "x\n", "empty/readme.txt": "x\n" },
        checks: [
          fn("returns", "json_files", [
            example(["inbox"], ["page-1.json", "page-2.json"]),
            hiddenCase("a folder with no JSON files", ["empty"], []),
          ], { label: "json_files() lists only .json files" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The newest export",
        prompt: "A nightly job saves one export per day as `YYYY-MM-DD.csv` in a folder, next to other files. Write `latest_export(folder)`: return the **name** (text, not a Path) of the most recent `.csv` export, or `None` if the folder has none. Names like `2024-12-21.csv` sort in date order as text.",
        spec: [
          ["Function", "`latest_export(folder)`"],
          ["Returns", "a file name like `'2024-12-21.csv'`, or `None`"],
          ["Ignore", "files that don't end in `.csv`"],
          ["Example", "`latest_export(\"exports\")` → `'2024-12-21.csv'`"],
        ],
        starter: src`
from pathlib import Path

def latest_export(folder):
    return None

print(latest_export("exports"))
`,
        answer: src`
from pathlib import Path

def latest_export(folder):
    names = []
    for path in Path(folder).glob("*.csv"):
        names.append(path.name)
    if len(names) == 0:
        return None
    return sorted(names)[-1]

print(latest_export("exports"))
`,
        alternatives: [
          src`
from pathlib import Path

def latest_export(folder):
    latest = None
    for path in Path(folder).glob("*.csv"):
        if latest is None or path.name > latest:
            latest = path.name
    return latest
`,
          src`
from pathlib import Path

def latest_export(folder):
    names = [p.name for p in Path(folder).glob("*.csv")]
    if not names:
        return None
    return max(names)
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def latest_export(folder):
    names = []
    for path in Path(folder).glob("*.csv"):
        names.append(path.name)
    if len(names) == 0:
        return None
    return sorted(names)[0]
`,
            fails: ["returns"],
            why: "position 0 of the sorted names is the oldest export, not the newest",
          },
          {
            code: src`
from pathlib import Path

def latest_export(folder):
    names = []
    for path in Path(folder).glob("*"):
        names.append(path.name)
    if len(names) == 0:
        return None
    return sorted(names)[-1]
`,
            fails: ["returns"],
            why: "without the `.csv` pattern, `notes.txt` sorts after every date and wins",
          },
          {
            code: src`
from pathlib import Path

def latest_export(folder):
    paths = sorted(Path(folder).glob("*.csv"))
    if len(paths) == 0:
        return None
    return paths[-1]
`,
            fails: ["returns"],
            why: "it returns a Path object (`exports/2024-12-21.csv`), not the file's name as text",
          },
        ],
        hints: [
          "Collect the names of the files that match `*.csv`.",
          "With year-month-day names, the largest name is the latest date.",
          "Check for the empty case before you pick from the list, and return `path.name`, not the path itself.",
        ],
        task: {
          files: {
            "exports/2024-01-03.csv": "order_id\nO100043\n",
            "exports/2024-12-21.csv": "order_id\nO108752\n",
            "exports/2024-08-23.csv": "order_id\nO104839\n",
            "exports/notes.txt": "sent\n",
            "drafts/readme.txt": "nothing exported yet\n",
            "single/2023-06-01.csv": "order_id\n",
          },
          checks: [
            fn("returns", "latest_export", [
              example(["exports"], "2024-12-21.csv"),
              hiddenCase("a folder with only a text file", ["drafts"], null),
              hiddenCase("a folder with one export", ["single"], "2023-06-01.csv"),
            ], { label: "latest_export() returns the newest export's name" }),
          ],
        },
      },
      {
        id: "c2",
        title: "What's taking up the upload folder?",
        prompt: "An upload folder fills up with CSV, JSON and image files. Write `size_by_type(folder)`: return a dictionary from each file extension (lower case, with its dot, like `\".csv\"`) to the total size in bytes of the files with that extension. `path.stat().st_size` is a file's size in bytes. Files with no extension are counted under `\"\"`. Skip sub-folders: `path.is_file()` is False for them.",
        spec: [
          ["Function", "`size_by_type(folder)`"],
          ["Returns", "a dictionary `{extension: total bytes}`; `{}` when there are no files"],
          ["Extensions", "compared in lower case, so `.CSV` and `.csv` add up together"],
          ["Example", "`size_by_type(\"uploads\")` → `{'.csv': 49, '.json': 13, '': 9}`"],
        ],
        starter: src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    return sizes

print(size_by_type("uploads"))
`,
        answer: src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    for path in Path(folder).glob("*"):
        if not path.is_file():
            continue
        kind = path.suffix.lower()
        if kind not in sizes:
            sizes[kind] = 0
        sizes[kind] += path.stat().st_size
    return sizes

print(size_by_type("uploads"))
`,
        alternatives: [
          src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    for path in sorted(Path(folder).glob("*")):
        if path.is_file():
            kind = path.suffix.lower()
            sizes[kind] = sizes.get(kind, 0) + path.stat().st_size
    return sizes
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    for path in Path(folder).glob("*"):
        if not path.is_file():
            continue
        kind = path.suffix
        if kind not in sizes:
            sizes[kind] = 0
        sizes[kind] += path.stat().st_size
    return sizes
`,
            fails: ["returns"],
            why: "`.CSV` and `.csv` end up as two different keys",
          },
          {
            code: src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    for path in Path(folder).glob("*"):
        if not path.is_file():
            continue
        kind = path.suffix.lower()
        if kind not in sizes:
            sizes[kind] = 0
        sizes[kind] += 1
    return sizes
`,
            fails: ["returns"],
            why: "it counts files instead of adding up their sizes",
          },
          {
            code: src`
from pathlib import Path

def size_by_type(folder):
    sizes = {}
    for path in Path(folder).glob("*"):
        kind = path.suffix.lower()
        if kind not in sizes:
            sizes[kind] = 0
        sizes[kind] += path.stat().st_size
    return sizes
`,
            fails: ["returns"],
            why: "sub-folders are counted too, as files with no extension",
          },
        ],
        hints: [
          "Walk everything in the folder with `glob(\"*\")` and skip what isn't a file.",
          "This is the per-key total pattern: the key is the lower-case suffix, the amount is the file's size.",
          "Start a key at 0 the first time you see it, then add each file's `stat().st_size`.",
        ],
        task: {
          files: {
            "uploads/orders.csv": "order_id,total\nO100043,12.93\n",
            "uploads/BACKUP.CSV": "order_id,total\nO1,1\n",
            "uploads/page.json": "{\"page\": 1}\n\n",
            "uploads/README": "read me\n\n",
            "uploads/archive/old.csv": "order_id,total\nO0,0\n",
            "only_folder/inner/a.csv": "x\n",
          },
          checks: [
            fn("returns", "size_by_type", [
              example(["uploads"], { ".csv": 49, ".json": 13, "": 9 }),
              hiddenCase("a folder that holds only a sub-folder", ["only_folder"], {}),
              hiddenCase("one file inside a sub-folder", ["uploads/archive"], { ".csv": 20 }),
            ], { label: "size_by_type() totals the bytes per extension" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import Path

p = Path("data") / "raw" / "orders.2024.csv"
print(p.name, p.stem, p.suffix)
`,
        choices: ["orders.2024.csv orders.2024 .csv", "orders.2024.csv orders .2024.csv", "raw/orders.2024.csv orders.2024 csv", "orders.2024.csv orders .csv"],
        answer: 0,
        why: "`suffix` is only the last extension, and `stem` is the name without it. The folders are not part of `name`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: building a path by gluing strings. What does this print?",
        program: src`
from pathlib import Path

folder = "exports"
print(folder + "orders.csv")
print(Path(folder) / "orders.csv")
`,
        choices: ["exportsorders.csv\nexports/orders.csv", "exports/orders.csv\nexports/orders.csv", "exportsorders.csv\nexportsorders.csv", "exports orders.csv\nexports/orders.csv"],
        answer: 0,
        why: "`+` joins text exactly as it is, so the separator is missing. `/` between a Path and a name adds it for you (and uses the right separator on every system).",
      },
      {
        id: "q3",
        prompt: "Why does the lesson write `sorted(folder.glob(\"*.csv\"))` instead of just `folder.glob(\"*.csv\")`?",
        choices: ["`glob` finds files in whatever order the system lists them, so sorting makes the order predictable", "`glob` returns only the first file unless it is sorted", "`sorted` removes files that don't match", "`glob` can only be used inside `sorted`"],
        answer: 0,
        why: "The order `glob` produces is up to the file system. Sorting gives the same order on every run and every machine.",
      },
    ],
    review: [
      "`Path(\"a\") / \"b.csv\"` builds a path; `name`, `stem` and `suffix` take it apart.",
      "`mkdir(parents=True, exist_ok=True)` creates folders; writing a file never creates them.",
      "`glob(\"*.csv\")` finds matching files; sort the result when order matters.",
      "Next: what text looks like on disk, as bytes, and what happens when the encoding is wrong.",
    ],
  },

  // ------------------------------------------------------------------ PY-L19-05 text and bytes
  {
    id: "PY-L19-05",
    version: 2,
    slug: "the-right-encoding",
    title: "Text, bytes and encodings",
    lede: "On disk a file is bytes. An encoding turns characters into bytes and back; the wrong one either fails with UnicodeDecodeError or quietly garbles accented names.",
    focus: "Turn text into bytes and back with encode and decode, and recognise and recover from the wrong encoding.",
    minutes: 18,
    objectives: [
      "Explain why a character can take more than one byte in UTF-8, and measure text in bytes",
      "Recognise `UnicodeDecodeError` and garbled text (`CafÃ©`) as encoding mismatches",
      "Read a file as bytes and decode it, falling back to another encoding when UTF-8 fails",
    ],
    requires: ["file-open", "encoding-arg", "with-statement", "function-def", "function-param", "function-return", "assignment", "reassignment", "unicode-text", "len-call", "comparison", "for-loop", "if-statement", "list-literal", "list-mutate", "print-call", "print-several", "print-text", "end", "unquoted-name", "top-level-indent", "newline-escape", "runtime-error", "try-except", "except-type", "except-many", "except-as", "tuple-literal", "boolean", "string-method", "logical", "membership", "list-comp", "comp-if", "arithmetic", "list-index", "string-index"],
    teaches: ["text-bytes"],
    blocks: [
      {
        kind: "text",
        md: "A file stores **bytes**, numbers from 0 to 255. Text is made of characters, and there are far more than 256 of them. An **encoding** is the rule that turns characters into bytes and back.\n\nUTF-8 uses one byte for plain English letters and digits, and two to four bytes for everything else (`ë`, `ü`, `€`, `東`, emoji). `text.encode(\"utf-8\")` gives you the bytes, and `data.decode(\"utf-8\")` turns bytes back into text. The `encoding=` you pass to `open` does exactly this for you on every read and write.",
      },
      {
        kind: "example",
        title: "Characters versus bytes",
        code: src`
name = "Zoë Müller"
data = name.encode("utf-8")
print(data)
print(len(name), "characters,", len(data), "bytes")
print(data.decode("utf-8") == name)
print(data.decode("latin-1"))
`,
        output: "b'Zo\\xc3\\xab M\\xc3\\xbcller'\n10 characters, 12 bytes\nTrue\nZoÃ« MÃ¼ller\n",
        note: "`b'...'` is how Python shows bytes; `\\xc3\\xab` is the two-byte UTF-8 form of `ë`. Decoding with the right encoding gives the name back. Decoding the same bytes as latin-1 doesn't fail, it just produces nonsense: that is what garbled names in spreadsheets are.",
      },
      {
        kind: "text",
        md: "The other way round fails loudly. Older Windows programs often save text as **cp1252**, where `é` is the single byte `\\xe9`. In UTF-8 that byte can't start a character, so decoding stops with `UnicodeDecodeError`.",
      },
      {
        kind: "error-example",
        title: "cp1252 bytes read as UTF-8",
        code: src`
data = "Café crème".encode("cp1252")
print(data)
print(data.decode("utf-8"))
`,
        error: "UnicodeDecodeError",
        output: "b'Caf\\xe9 cr\\xe8me'\n",
        note: "`UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe9 in position 3`. Opening such a file with `encoding=\"utf-8\"` raises the same error on `read()`.",
      },
      {
        kind: "text",
        md: "When files come from many places, you can't always know the encoding in advance. A practical rule: try UTF-8 first (bytes from another encoding almost never happen to be valid UTF-8), and fall back to the likely legacy encoding only when it fails. Opening with mode `\"rb\"` reads the raw bytes, so you can decide.",
      },
      {
        kind: "example",
        title: "Read a menu saved by an old program",
        code: src`
def read_text_any(path):
    with open(path, "rb") as source:
        data = source.read()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("cp1252")

with open("menu_old.txt", "w", encoding="cp1252") as out:
    out.write("Crème brûlée,6.50\n")
with open("menu_new.txt", "w", encoding="utf-8") as out:
    out.write("Crème brûlée,6.50\n")
print(read_text_any("menu_old.txt") == read_text_any("menu_new.txt"))
print(read_text_any("menu_old.txt"), end="")
`,
        output: "True\nCrème brûlée,6.50\n",
        note: "The two files hold different bytes (`\\xe8` in one, `\\xc3\\xa8` in the other) but the same text. The fallback is a reasoned guess, not magic: if a file is in a third encoding, it can still come out wrong.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever text crosses a boundary: files, network, databases. Measure bytes when a limit is in bytes (database columns, message sizes). **Mistakes to avoid:** leaving out `encoding=`, assuming one character is one byte, and \"fixing\" a `UnicodeDecodeError` with `errors=\"ignore\"`, which silently deletes characters.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Size in bytes, not characters",
      prompt: "A message queue limits each message by its size in **UTF-8 bytes**. `byte_size` returns the number of characters instead. Make it return the number of bytes.",
      spec: [
        ["Function", "`byte_size(text)`"],
        ["Returns", "how many bytes `text` takes in UTF-8"],
      ],
      starter: src`
def byte_size(text):
    return len(text)

print(byte_size("Café"))
`,
      answer: src`
def byte_size(text):
    return len(text.encode("utf-8"))

print(byte_size("Café"))
`,
      wrong: [
        {
          code: src`
def byte_size(text):
    return len(text) * 2
`,
          fails: ["returns"],
          why: "UTF-8 doesn't use a fixed number of bytes per character",
        },
      ],
      hints: ["`len` counts whatever you give it.", "Give it the bytes instead of the text.", "`encode(\"utf-8\")` turns the text into bytes."],
      task: {
        checks: [
          fn("returns", "byte_size", [
            example(["Café"], 5),
            hiddenCase("plain English text", ["order O100043"], 13),
            hiddenCase("characters that need three bytes each", ["東京"], 6),
            hiddenCase("an empty text", [""], 0),
          ], { label: "byte_size() measures UTF-8 bytes" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Names that won't fit the column",
        prompt: "A customer database stores names in a column limited to a number of **bytes**, not characters. Write `too_long(names, max_bytes)`: return the names whose UTF-8 encoding is longer than `max_bytes`, in their original order. A name exactly at the limit fits.",
        spec: [
          ["Function", "`too_long(names, max_bytes)`"],
          ["Returns", "a new list of the names that don't fit; `[]` when they all do"],
          ["Example", "`too_long([\"Zoë Müller\", \"Isaac Sato\", \"Aisha Silva\"], 10)` → `['Zoë Müller', 'Aisha Silva']`"],
        ],
        starter: src`
def too_long(names, max_bytes):
    return []

print(too_long(["Zoë Müller", "Isaac Sato", "Aisha Silva"], 10))
`,
        answer: src`
def too_long(names, max_bytes):
    result = []
    for name in names:
        if len(name.encode("utf-8")) > max_bytes:
            result.append(name)
    return result

print(too_long(["Zoë Müller", "Isaac Sato", "Aisha Silva"], 10))
`,
        alternatives: [
          src`
def too_long(names, max_bytes):
    return [name for name in names if len(name.encode("utf-8")) > max_bytes]
`,
        ],
        wrong: [
          {
            code: src`
def too_long(names, max_bytes):
    result = []
    for name in names:
        if len(name) > max_bytes:
            result.append(name)
    return result
`,
            fails: ["returns"],
            why: "it counts characters, so `Zoë Müller` (10 characters, 12 bytes) looks as if it fits",
          },
          {
            code: src`
def too_long(names, max_bytes):
    result = []
    for name in names:
        if len(name.encode("utf-8")) >= max_bytes:
            result.append(name)
    return result
`,
            fails: ["returns"],
            why: "a name of exactly `max_bytes` bytes fits, but `>=` rejects it",
          },
        ],
        hints: [
          "This is a filter: keep the names that fail the size test.",
          "Measure each name in bytes, not characters.",
          "\"Longer than the limit\" is a strict comparison: a name of exactly that many bytes is fine.",
        ],
        task: {
          checks: [
            fn("returns", "too_long", [
              example([["Zoë Müller", "Isaac Sato", "Aisha Silva"], 10], ["Zoë Müller", "Aisha Silva"]),
              example([["Mei Adams"], 20], []),
              example([[], 5], []),
              hiddenCase("a name exactly at the limit", [["Isaac Sato"], 10], []),
              hiddenCase("characters of three bytes each", [["東京商店", "Tokyo"], 10], ["東京商店"]),
              hiddenCase("an emoji, which takes four bytes", [["Diego 😀", "Diego Scott"], 9], ["Diego 😀", "Diego Scott"]),
            ], { label: "too_long() finds the names over the byte limit" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Repair garbled names",
        prompt: "An import read UTF-8 data as if it were cp1252, so names like `Café` came out as `CafÃ©`. That damage can be undone: encode the garbled text back to bytes with cp1252, then decode those bytes as UTF-8. Text that was never garbled fails one of those two steps (`UnicodeEncodeError` or `UnicodeDecodeError`), or comes back unchanged. Write `repair(text)`: return the repaired text when both steps work, and the original text when either step raises one of those two errors.",
        spec: [
          ["Function", "`repair(text)`"],
          ["Returns", "`text.encode(\"cp1252\").decode(\"utf-8\")` when that works; otherwise `text` unchanged"],
          ["Catch", "only `UnicodeEncodeError` and `UnicodeDecodeError`"],
          ["Example", "`repair(\"CafÃ©\")` → `'Café'`; `repair(\"Café\")` → `'Café'`"],
        ],
        starter: src`
def repair(text):
    return text

print(repair("CafÃ©"))
print(repair("Café"))
`,
        answer: src`
def repair(text):
    try:
        return text.encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text

print(repair("CafÃ©"))
print(repair("Café"))
`,
        alternatives: [
          src`
def repair(text):
    try:
        raw = text.encode("cp1252")
    except UnicodeEncodeError:
        return text
    try:
        return raw.decode("utf-8")
    except UnicodeDecodeError:
        return text
`,
        ],
        wrong: [
          {
            code: src`
def repair(text):
    try:
        return text.encode("cp1252").decode("utf-8")
    except UnicodeDecodeError:
        return text
`,
            fails: ["returns"],
            why: "text cp1252 can't represent, like `東京`, raises UnicodeEncodeError, which isn't caught",
          },
          {
            code: src`
def repair(text):
    try:
        return text.encode("utf-8").decode("cp1252")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text
`,
            fails: ["returns"],
            why: "the steps are reversed, so this garbles good text instead of repairing bad text",
          },
        ],
        hints: [
          "The repair is two steps chained: encode with one encoding, decode with the other.",
          "Put both steps in a `try` and return the result if they work.",
          "One `except` clause can name both error types in a tuple; in that case the original text is the answer.",
        ],
        task: {
          checks: [
            fn("returns", "repair", [
              example(["CafÃ©"], "Café"),
              example(["Café"], "Café"),
              example(["plain"], "plain"),
              hiddenCase("a garbled German word", ["Ã¼ber"], "über"),
              hiddenCase("a garbled city name", ["SÃ£o Paulo"], "São Paulo"),
              hiddenCase("characters cp1252 can't hold", ["東京"], "東京"),
              hiddenCase("an empty text", [""], ""),
            ], { label: "repair() undoes UTF-8-read-as-cp1252 damage and leaves other text alone" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
word = "naïve"
print(len(word), len(word.encode("utf-8")))
`,
        choices: ["5 6", "5 5", "6 6", "6 5"],
        answer: 0,
        why: "Five characters, but `ï` takes two bytes in UTF-8.",
      },
      {
        id: "q2",
        prompt: "A common mistake: decoding with the wrong encoding. What does this print?",
        program: src`
data = "é".encode("utf-8")
print(data.decode("latin-1"))
`,
        choices: ["Ã©", "é", "UnicodeDecodeError", "\\xc3\\xa9"],
        answer: 0,
        why: "Latin-1 accepts every byte, so nothing fails: each of the two UTF-8 bytes becomes its own character. Garbled text like this is the quiet version of an encoding mismatch.",
      },
      {
        id: "q3",
        prompt: "When does it make sense to open a file with mode `\"rb\"`?",
        choices: ["When you need the raw bytes, for example to decide the encoding yourself", "Whenever the file is large", "When the file has more than one line", "When you want Python to guess the encoding"],
        answer: 0,
        why: "`\"rb\"` skips decoding entirely. Python never guesses an encoding; with text mode it uses the one you name (or the system default).",
      },
    ],
    review: [
      "Files hold bytes; an encoding maps characters to bytes. UTF-8 uses 1–4 bytes per character.",
      "`encode` turns text into bytes and `decode` turns bytes into text; measure in bytes when a limit is in bytes.",
      "The wrong encoding raises `UnicodeDecodeError` or quietly garbles text; read bytes with `\"rb\"` to decide yourself.",
      "Next module: files with structure. CSV rows, JSON documents and JSON Lines.",
    ],
  },
];
