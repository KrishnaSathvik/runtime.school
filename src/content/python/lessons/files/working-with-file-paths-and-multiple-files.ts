import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;

const FILES: Record<string, string> = {
  "sales/2026-10-01.csv": "store,amount\nleeds,120.50\nyork,80.00\n",
  "sales/2026-10-02.csv": "store,amount\nleeds,99.50\nhull,45.25\n",
  "sales/2026-10-03.csv": "store,amount\nyork,60.00\n",
  "sales/README.txt": "Daily sales exports, one CSV per day.\n",
  "sales/archive/2026-09-30.csv": "store,amount\nleeds,10.00\n",
};

export const workingWithFilePathsAndMultipleFiles: PyLesson = {
  slug: "working-with-file-paths-and-multiple-files",
  ref: "python:working-with-file-paths-and-multiple-files",
  module: "files",
  number: 6,
  title: "Working with file paths and multiple files",
  level: "intermediate",
  summary:
    "Build file paths with `pathlib` instead of gluing strings, find files by pattern, read a whole folder of daily exports, and create output folders, all in a deterministic order.",
  files: FILES,

  sections: [
    {
      label: "paths as objects",
      blocks: [
        {
          kind: "p",
          text: "`pathlib.Path` represents a file or folder path. Join parts with `/` (`Path(\"sales\") / \"2026-10-01.csv\"`) instead of adding strings and slashes by hand, so the result is correct on every operating system. A path knows its pieces: `.name` (`2026-10-01.csv`), `.stem` (`2026-10-01`), `.suffix` (`.csv`) and `.parent` (`sales`).",
        },
        { kind: "code", code: 'from pathlib import Path\n\npath = Path("sales") / "2026-10-01.csv"\nprint(path, path.name, path.stem, path.suffix, path.parent)\nprint(path.exists(), path.read_text(encoding="utf-8")[:12])' },
        {
          kind: "p",
          text: "Paths can be opened like strings (`open(path)`), and have shortcuts: `path.read_text(encoding=\"utf-8\")` reads a whole text file, `path.write_text(text, encoding=\"utf-8\")` writes one.",
        },
      ],
    },
    {
      label: "finding files",
      blocks: [
        {
          kind: "p",
          text: "`folder.glob(\"*.csv\")` finds the files in a folder whose names match a pattern (`*` means any characters); `folder.rglob(\"*.csv\")` also searches every subfolder. `folder.iterdir()` lists everything in a folder. The order these return isn't guaranteed, so wrap them in `sorted(...)` whenever order matters, which for reproducible results is always.",
        },
      ],
    },
    {
      label: "folders for output",
      blocks: [
        {
          kind: "p",
          text: "`Path(\"reports\").mkdir(parents=True, exist_ok=True)` creates a folder (and any missing parents), and does nothing if it already exists. Keep inputs and outputs in separate folders, so a program never reads its own output as input.",
        },
      ],
    },
  ],

  example: {
    caption: "Reading a folder of daily sales files (see the Files list). Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import csv\nfrom pathlib import Path\n\nfolder = Path("sales")\nfor path in sorted(folder.glob("*.csv")):\n    with open(path, newline="", encoding="utf-8") as f:\n        total = sum(float(row["amount"]) for row in csv.DictReader(f))\n    print(f"{path.stem}: {total:.2f}")\n\nprint("Everything in the folder:", sorted(p.name for p in folder.iterdir()))',
  },

  walkthrough: [
    {
      title: "Joining and taking paths apart",
      text: "`/` joins parts; the attributes split a path into its pieces.",
      code: 'from pathlib import Path\np = Path("sales") / "archive" / "2026-09-30.csv"\nprint(p)\nprint(p.name, p.stem, p.suffix)\nprint(p.parent, p.parent.parent)',
    },
    {
      title: "glob and rglob",
      text: "`glob` looks in one folder; `rglob` goes into subfolders too. Sorting makes the order dependable.",
      code: 'from pathlib import Path\nprint([p.name for p in sorted(Path("sales").glob("*.csv"))])\nprint([str(p) for p in sorted(Path("sales").rglob("*.csv"))])',
    },
    {
      title: "Checking before reading",
      text: "`exists()`, `is_file()` and `is_dir()` answer questions about a path without opening it.",
      code: 'from pathlib import Path\nfor name in ["sales", "sales/README.txt", "sales/2026-10-04.csv"]:\n    p = Path(name)\n    print(name, p.exists(), p.is_file(), p.is_dir())',
    },
    {
      title: "Writing into a new folder",
      text: "`mkdir(parents=True, exist_ok=True)` makes sure the folder exists; `write_text` creates the file.",
      code: 'from pathlib import Path\nout = Path("reports")\nout.mkdir(parents=True, exist_ok=True)\n(out / "summary.txt").write_text("3 daily files\\n", encoding="utf-8")\nprint(sorted(str(p) for p in out.iterdir()))',
    },
  ],

  mistakes: [
    {
      title: "Gluing paths with +",
      text: "Forgetting the separator gives a path to a file that doesn't exist: `salesREADME.txt`.",
      code: 'folder = "sales"\nwith open(folder + "README.txt", encoding="utf-8") as f:\n    print(f.read())',
      raises: "FileNotFoundError",
      fix: 'Join with pathlib: `Path(folder) / "README.txt"`.',
    },
    {
      title: "Writing into a folder that doesn't exist",
      text: "`open` won't create missing folders: `FileNotFoundError` for the folder, not the file.",
      code: 'with open("reports/daily.txt", "w", encoding="utf-8") as f:\n    f.write("hello\\n")',
      raises: "FileNotFoundError",
      fix: 'Create it first: `Path("reports").mkdir(parents=True, exist_ok=True)`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Total a folder of daily files",
      prompt:
        "Write `daily_totals(folder)`, which reads every `.csv` file directly inside `folder` (not in subfolders) and returns a list of `(date, total)` tuples in **date order**, where `date` is the file name without `.csv` and `total` is the sum of the `amount` column, rounded to 2 places. Other files (like `README.txt`) are ignored.",
      looksFor: [
        "One tuple per CSV file in the folder itself, sorted by date.",
        "Files in subfolders and non-CSV files are ignored.",
        "Each total is the rounded sum of the file's `amount` column.",
      ],
      starter: 'import csv\nfrom pathlib import Path\n\n\ndef daily_totals(folder):\n    # Return [(date, total), ...] in date order.\n    pass\n\n\nprint(daily_totals("sales"))\n',
      task: {
        files: { "empty_dir/.keep": "", "q4/2026-12-02.csv": "store,amount\nx,1.10\nx,2.20\n", "q4/2026-11-30.csv": "store,amount\n" },
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "daily_totals",
            compare: { numbers: "int-float-equal", float: "exact" },
            cases: [
              { args: [s("sales")], expected: py.list(py.tuple(s("2026-10-01"), f(200.5)), py.tuple(s("2026-10-02"), f(144.75)), py.tuple(s("2026-10-03"), f(60))) },
              { args: [s("empty_dir")], expected: py.list() },
              { args: [s("q4")], expected: py.list(py.tuple(s("2026-11-30"), i(0)), py.tuple(s("2026-12-02"), f(3.3))), hidden: true },
            ],
            tip: 'for path in sorted(Path(folder).glob("*.csv")): sum the amount column and append (path.stem, round(total, 2)).',
          },
        ],
      },
      hints: [
        'Path(folder).glob("*.csv") finds only CSV files in the folder itself; wrap it in sorted().',
        'For each path: open it with newline="" and add up float(row["amount"]) for row in csv.DictReader(f).',
        "Append (path.stem, round(total, 2)) and return the list.",
      ],
      answer: 'import csv\nfrom pathlib import Path\n\n\ndef daily_totals(folder):\n    """Return [(date, total of amount)] for each CSV directly in folder, in date order."""\n    totals = []\n    for path in sorted(Path(folder).glob("*.csv")):\n        with open(path, newline="", encoding="utf-8") as f:\n            total = sum(float(row["amount"]) for row in csv.DictReader(f))\n        totals.append((path.stem, round(total, 2)))\n    return totals\n\n\nprint(daily_totals("sales"))',
      wrong: [
        { code: 'import csv\nfrom pathlib import Path\n\ndef daily_totals(folder):\n    totals = []\n    for path in sorted(Path(folder).rglob("*.csv")):\n        with open(path, newline="", encoding="utf-8") as f:\n            total = sum(float(row["amount"]) for row in csv.DictReader(f))\n        totals.append((path.stem, round(total, 2)))\n    return totals\n', fails: ["fn"], why: "rglob includes the archive" },
        { code: 'import csv\nfrom pathlib import Path\n\ndef daily_totals(folder):\n    totals = []\n    for path in sorted(Path(folder).glob("*.csv")):\n        with open(path, newline="", encoding="utf-8") as f:\n            total = sum(float(row["amount"]) for row in csv.DictReader(f))\n        totals.append((path.name, round(total, 2)))\n    return totals\n', fails: ["fn"], why: "name keeps .csv" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write one report per store",
      prompt:
        "Write `write_store_reports(folder, out_folder)`: read every daily `.csv` directly in `folder`, total the amounts **per store**, and for each store write a file `<store>.txt` in `out_folder` (create it if needed) containing one line, the total with 2 decimal places and a newline, such as `220.00\\n`. Return the sorted list of file names written.",
      looksFor: [
        "`out_folder` is created if it doesn't exist.",
        "Each store gets `<store>.txt` with its total across all daily files, like `220.00\\n`.",
        "The function returns the sorted file names.",
      ],
      starter: 'import csv\nfrom pathlib import Path\n\n\ndef write_store_reports(folder, out_folder):\n    # Write <store>.txt files; return their sorted names.\n    pass\n\n\nprint(write_store_reports("sales", "reports"))\n',
      task: {
        checks: [
          { kind: "function", id: "fn", name: "write_store_reports", cases: [{ args: [s("sales"), s("out_a")], expected: py.list(s("hull.txt"), s("leeds.txt"), s("york.txt")) }] },
          {
            kind: "expr",
            id: "content",
            label: "Each report holds the store's total",
            show: 'write_store_reports("sales", "out_b"), then read the three files',
            expr: 'from pathlib import Path\nwrite_store_reports("sales", "out_b/nested")\nresult = {p.name: p.read_text(encoding="utf-8") for p in sorted(Path("out_b/nested").iterdir())}',
            expected: py.dict([[s("hull.txt"), s("45.25\n")], [s("leeds.txt"), s("220.00\n")], [s("york.txt"), s("140.00\n")]]),
            tip: 'Create the folder with Path(out_folder).mkdir(parents=True, exist_ok=True), and write f"{total:.2f}\\n".',
          },
        ],
      },
      hints: [
        "First total per store across all files: totals[row[\"store\"]] = totals.get(row[\"store\"], 0) + float(row[\"amount\"]).",
        "out = Path(out_folder); out.mkdir(parents=True, exist_ok=True).",
        '(out / f"{store}.txt").write_text(f"{total:.2f}\\n", encoding="utf-8"), then return sorted names.',
      ],
      answer: 'import csv\nfrom pathlib import Path\n\n\ndef write_store_reports(folder, out_folder):\n    """Write <store>.txt with each store\'s total; return the sorted file names."""\n    totals = {}\n    for path in sorted(Path(folder).glob("*.csv")):\n        with open(path, newline="", encoding="utf-8") as f:\n            for row in csv.DictReader(f):\n                totals[row["store"]] = totals.get(row["store"], 0) + float(row["amount"])\n    out = Path(out_folder)\n    out.mkdir(parents=True, exist_ok=True)\n    names = []\n    for store, total in totals.items():\n        name = f"{store}.txt"\n        (out / name).write_text(f"{total:.2f}\\n", encoding="utf-8")\n        names.append(name)\n    return sorted(names)\n\n\nprint(write_store_reports("sales", "reports"))',
      wrong: [
        { code: 'import csv\nfrom pathlib import Path\n\ndef write_store_reports(folder, out_folder):\n    totals = {}\n    for path in Path(folder).glob("*.csv"):\n        with open(path, newline="", encoding="utf-8") as f:\n            for row in csv.DictReader(f):\n                totals[row["store"]] = totals.get(row["store"], 0) + float(row["amount"])\n    names = []\n    for store, total in totals.items():\n        with open(out_folder + "/" + store + ".txt", "w", encoding="utf-8") as f:\n            f.write(f"{total:.2f}\\n")\n        names.append(store + ".txt")\n    return sorted(names)\n', fails: ["fn", "content"], why: "never creates the output folder" },
      ],
    },
  ],

  quiz: [
    {
      id: "parts",
      prompt: '`p = Path("data") / "2026" / "orders.csv"`. What is `p.stem`?',
      options: [
        { text: '`"orders"`', correct: true, why: "`stem` is the file name without its suffix." },
        { text: '`"orders.csv"`', why: "That's `p.name`, which keeps the suffix." },
        { text: '`".csv"`', why: "That's `p.suffix`: the dot and the extension." },
        { text: '`"data/2026"`', why: "That's `p.parent`: the folder containing the file." },
      ],
    },
    {
      id: "sorted",
      prompt: "Why wrap `folder.glob(\"*.csv\")` in `sorted(...)`?",
      options: [
        { text: "glob's order isn't guaranteed, and results should be the same on every run", correct: true, why: "Sorting makes the processing order, and anything that depends on it, reproducible." },
        { text: "glob returns nothing unless sorted", why: "It returns paths either way; just in no promised order." },
        { text: "Paths can't be opened until sorted", why: "Each path can be opened directly; sorting is about order." },
        { text: "To remove duplicates", why: "glob doesn't return duplicates; sorting doesn't deduplicate anyway." },
      ],
    },
  ],

  outcomes: [
    "Build and take apart paths with `pathlib.Path`.",
    "Find files with `glob` and `rglob`, in a sorted, reproducible order.",
    "Read many files in a folder and combine their data.",
    "Create output folders with `mkdir(parents=True, exist_ok=True)` and keep outputs separate from inputs.",
  ],
};
