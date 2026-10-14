import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;

const NOTES = "Order 1001 shipped\n\nOrder 1002 delayed: waiting for stock\n   \nOrder 1003 shipped\nOrder 1004 cancelled by customer\n";
const STOCK = "desk,4\nlamp,0\nchair,7\nshelf,2\n";

export const workingWithTextFilesSafely: PyLesson = {
  slug: "working-with-text-files-safely",
  ref: "python:working-with-text-files-safely",
  module: "files",
  number: 1,
  title: "Working with text files safely",
  level: "intermediate",
  summary:
    "Read and write text files: open them with `with` so they're always closed, choose the right mode and encoding, go through a file line by line, and handle a file that isn't there.",
  files: { "notes.txt": NOTES, "stock.txt": STOCK },

  sections: [
    {
      label: "open, with and modes",
      blocks: [
        {
          kind: "p",
          text: "`open(path, mode, encoding=\"utf-8\")` opens a file and returns a file object. The **mode** says what you'll do: `\"r\"` to read (the default), `\"w\"` to write (it **replaces** the file's contents, creating it if needed), `\"a\"` to append to the end. Always give the encoding: `utf-8` reads and writes any language's text the same way on every computer.",
        },
        {
          kind: "p",
          text: "Open files inside a `with` block. When the block ends, the file is closed automatically, even if an error happened inside it. A file left open can lose data that hasn't been written yet, or block other programs.",
        },
        { kind: "code", code: 'with open("notes.txt", encoding="utf-8") as f:\n    text = f.read()        # the whole file as one string\n# the file is closed here' },
        {
          kind: "p",
          text: "The paths here are relative: `notes.txt` means the file next to `main.py`. In this lesson, `notes.txt` and `stock.txt` are already there (see the Files list); files your program writes appear in the list too, and can be downloaded.",
        },
      ],
    },
    {
      label: "reading line by line",
      blocks: [
        {
          kind: "p",
          text: "Looping over a file gives one line at a time, **including its `\\n`**. Strip it before using the line. This doesn't load the whole file into memory, so it works for files of any size. `f.read()` gives everything as one string, and `f.read().splitlines()` gives a list of lines without their newlines.",
        },
      ],
    },
    {
      label: "writing",
      blocks: [
        {
          kind: "p",
          text: "`f.write(text)` writes exactly what you give it: no newline is added, so end each line with `\\n` yourself. `print(..., file=f)` is an alternative that adds the newline. Because `\"w\"` replaces the file, opening the wrong file for writing destroys its contents; double-check the mode.",
        },
        {
          kind: "p",
          text: "Opening a file that doesn't exist for reading is a `FileNotFoundError`. Handle it with `try`/`except FileNotFoundError` when a missing file is a normal situation, or check first with `os.path.exists(path)`.",
        },
      ],
    },
  ],

  example: {
    caption: "Reading notes line by line, and writing a summary file. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'shipped = 0\nwith open("notes.txt", encoding="utf-8") as f:\n    for line in f:\n        line = line.strip()\n        if not line:\n            continue\n        print(line)\n        if line.endswith("shipped"):\n            shipped += 1\n\nwith open("summary.txt", "w", encoding="utf-8") as out:\n    out.write(f"Shipped orders: {shipped}\\n")\n\nwith open("summary.txt", encoding="utf-8") as f:\n    print(f.read())',
  },

  walkthrough: [
    {
      title: "read() gives one string",
      text: "`repr` shows the newlines inside the text, including the blank lines.",
      code: 'with open("stock.txt", encoding="utf-8") as f:\n    text = f.read()\nprint(repr(text))\nprint(len(text.splitlines()), "lines")',
    },
    {
      title: "Lines include their newline",
      text: "Each line ends with `\\n` until you strip it, which is why printing raw lines double-spaces them.",
      code: 'with open("stock.txt", encoding="utf-8") as f:\n    for line in f:\n        print(repr(line), "->", repr(line.strip()))',
    },
    {
      title: "Write and append",
      text: "`\"w\"` starts the file fresh; `\"a\"` adds to the end. Writing doesn't add newlines.",
      code: 'with open("log.txt", "w", encoding="utf-8") as f:\n    f.write("first\\n")\nwith open("log.txt", "a", encoding="utf-8") as f:\n    f.write("second\\n")\n    print("third", file=f)\nwith open("log.txt", encoding="utf-8") as f:\n    print(f.read().splitlines())',
    },
    {
      title: "A missing file",
      text: "Reading a file that isn't there raises `FileNotFoundError`, which you can catch when it's expected.",
      code: 'try:\n    with open("missing.txt", encoding="utf-8") as f:\n        print(f.read())\nexcept FileNotFoundError:\n    print("No missing.txt yet: starting empty")',
    },
  ],

  mistakes: [
    {
      title: "Opening for writing when you meant to read",
      text: "`\"w\"` empties the file the moment it's opened, so the read afterwards finds nothing. The stock list is gone.",
      code: 'with open("stock.txt", "w", encoding="utf-8") as f:\n    pass\nwith open("stock.txt", encoding="utf-8") as f:\n    print(repr(f.read()))',
      fix: "Read with mode `\"r\"` (or no mode at all). Use `\"w\"` only for files you mean to replace.",
    },
    {
      title: "Reading a file that isn't there",
      text: "The name has a typo, so there is no such file: `FileNotFoundError`.",
      code: 'with open("note.txt", encoding="utf-8") as f:\n    print(f.read())',
      raises: "FileNotFoundError",
      fix: "Check the exact file name (it's case-sensitive), or handle the error if the file may legitimately be missing.",
    },
    {
      title: "Writing a number",
      text: "`write()` only accepts strings: `TypeError`.",
      code: 'with open("count.txt", "w", encoding="utf-8") as f:\n    f.write(42)',
      raises: "TypeError",
      fix: 'Convert and add the newline: `f.write(f"{42}\\n")`, or use `print(42, file=f)`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Count non-blank lines",
      prompt:
        "Write `count_lines(path)`, which opens the text file at `path` (UTF-8) and returns how many lines contain something other than whitespace. Use `with`. If the file doesn't exist, return `0` instead of crashing. `notes.txt` is in the Files list to try it on.",
      looksFor: [
        "`count_lines(\"notes.txt\")` returns `4`: blank lines and lines of only spaces don't count.",
        "A missing file returns `0`.",
        "The file is opened with `with` and read as UTF-8.",
      ],
      starter: 'def count_lines(path):\n    # Return the number of non-blank lines, or 0 if the file is missing.\n    pass\n\n\nprint(count_lines("notes.txt"))\n',
      task: {
        files: { "accents.txt": "Café\n\nNaïve\n" },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "count_lines",
            cases: [
              { args: [s("notes.txt")], expected: i(4) },
              { args: [s("stock.txt")], expected: i(4) },
              { args: [s("nowhere.txt")], expected: i(0) },
              { args: [s("accents.txt")], expected: i(2), hidden: true },
            ],
            tip: "Loop over the file and count lines where line.strip() isn't empty; wrap the open in try/except FileNotFoundError.",
          },
        ],
      },
      hints: [
        'with open(path, encoding="utf-8") as f: then for line in f:',
        "if line.strip(): count += 1.",
        "Put the with block inside try:, and except FileNotFoundError: return 0.",
      ],
      answer: 'def count_lines(path):\n    """Return the number of non-blank lines in the file at path (0 if it doesn\'t exist)."""\n    try:\n        with open(path, encoding="utf-8") as f:\n            return sum(1 for line in f if line.strip())\n    except FileNotFoundError:\n        return 0\n\n\nprint(count_lines("notes.txt"))',
      alternatives: ['import os\n\ndef count_lines(path):\n    if not os.path.exists(path):\n        return 0\n    count = 0\n    with open(path, encoding="utf-8") as f:\n        for line in f.read().splitlines():\n            if line.strip() != "":\n                count += 1\n    return count\n'],
      wrong: [
        { code: 'def count_lines(path):\n    try:\n        with open(path, encoding="utf-8") as f:\n            return len(f.readlines())\n    except FileNotFoundError:\n        return 0\n', fails: ["fn"], why: "counts blank lines" },
        { code: 'def count_lines(path):\n    with open(path, encoding="utf-8") as f:\n        return sum(1 for line in f if line.strip())\n', fails: ["fn"], why: "crashes on a missing file" },
        { code: 'def count_lines(path):\n    try:\n        with open(path, encoding="utf-8") as f:\n            return sum(1 for line in f if line != "\\n")\n    except FileNotFoundError:\n        return 0\n', fails: ["fn"], why: "a line of spaces still counts" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write a reorder list",
      prompt:
        "`stock.txt` has one `item,units` pair per line. Read it and write `reorder.txt` containing the items with fewer than 3 units, one per line, in the order they appear, each line ending with a newline. Also store how many items you wrote in `reorder_count`, and print it.",
      expectedOutput: "Items to reorder: 2\n",
      looksFor: [
        "`reorder.txt` lists `lamp` and `shelf`, one per line, each followed by `\\n`.",
        "`reorder_count` is the number of items written.",
        "Both files are opened with `with` and UTF-8.",
      ],
      starter: '# Read stock.txt and write reorder.txt.\n',
      task: {
        checks: [
          { kind: "expr", id: "file", label: "reorder.txt has the items below 3 units", show: 'open("reorder.txt").read()', expr: 'with open("reorder.txt", encoding="utf-8") as _f:\n    result = _f.read()', expected: s("lamp\nshelf\n"), tip: "Write each item followed by \\n, in the order they appear in stock.txt." },
          { kind: "variable", id: "count", name: "reorder_count", expected: i(2) },
          { kind: "output", id: "output", label: "Prints the count", expected: "Items to reorder: 2\n" },
        ],
      },
      hints: [
        'with open("stock.txt", encoding="utf-8") as f: then for line in f: item, units = line.strip().split(",").',
        'Open reorder.txt with "w" (in the same with statement, or a second one) and write f"{item}\\n" when int(units) < 3.',
        'Count as you write, then print("Items to reorder:", reorder_count).',
      ],
      answer: 'reorder_count = 0\nwith open("stock.txt", encoding="utf-8") as src, open("reorder.txt", "w", encoding="utf-8") as out:\n    for line in src:\n        item, units = line.strip().split(",")\n        if int(units) < 3:\n            out.write(f"{item}\\n")\n            reorder_count += 1\nprint("Items to reorder:", reorder_count)',
      alternatives: ['with open("stock.txt", encoding="utf-8") as f:\n    rows = [line.strip().split(",") for line in f if line.strip()]\nlow = [item for item, units in rows if int(units) < 3]\nwith open("reorder.txt", "w", encoding="utf-8") as f:\n    for item in low:\n        print(item, file=f)\nreorder_count = len(low)\nprint("Items to reorder:", reorder_count)\n'],
      wrong: [
        { code: 'reorder_count = 0\nwith open("stock.txt", encoding="utf-8") as src, open("reorder.txt", "w", encoding="utf-8") as out:\n    for line in src:\n        item, units = line.strip().split(",")\n        if int(units) < 3:\n            out.write(item)\n            reorder_count += 1\nprint("Items to reorder:", reorder_count)\n', fails: ["file"], why: "no newlines" },
        { code: 'reorder_count = 0\nfor line in open("stock.txt", encoding="utf-8"):\n    item, units = line.strip().split(",")\n    if int(units) < 3:\n        with open("reorder.txt", "w", encoding="utf-8") as out:\n            out.write(f"{item}\\n")\n        reorder_count += 1\nprint("Items to reorder:", reorder_count)\n', fails: ["file"], why: "reopening with \"w\" keeps only the last item" },
      ],
    },
  ],

  quiz: [
    {
      id: "modes",
      prompt: "`report.txt` already contains two lines. What does it contain after this runs?",
      code: 'with open("report.txt", "w", encoding="utf-8") as f:\n    f.write("new")',
      options: [
        { text: "Just `new`, with no newline", correct: true, why: "`\"w\"` replaces the contents, and `write` adds nothing you didn't write." },
        { text: "The two old lines, then `new`", why: "That's what `\"a\"` (append) would do." },
        { text: "`new`, then a newline", why: "`write` writes exactly the text given; add `\\n` yourself." },
        { text: "An error, because the file exists", why: "`\"w\"` happily overwrites an existing file. (`\"x\"` is the mode that refuses.)" },
      ],
    },
    {
      id: "with",
      prompt: "Why open files in a `with` block?",
      options: [
        { text: "The file is closed automatically when the block ends, even if an error happens", correct: true, why: "That guarantees buffered writes are saved and the file isn't left open." },
        { text: "Files can't be read without it", why: "`open()` works on its own; `with` just makes closing automatic and reliable." },
        { text: "It makes reading faster", why: "It's about safety, not speed." },
        { text: "It creates the file if it's missing", why: "Whether a file is created depends on the mode, not on `with`." },
      ],
    },
  ],

  outcomes: [
    "Open files with `with`, the right mode and `encoding=\"utf-8\"`.",
    "Read a whole file or go through it line by line, stripping newlines.",
    "Write and append text, adding newlines yourself.",
    "Handle `FileNotFoundError` when a file may be missing.",
  ],
};
