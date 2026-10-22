/**
 * M30 Packaging & Databases: five lessons (PY-L30-01 … PY-L30-05).
 *
 * The first three lessons are about the files that describe a Python project and its environment: pyvenv.cfg
 * (what `python -m venv` writes), pyproject.toml (read for real with tomllib), and dependency specifiers plus the
 * installed-package metadata pip leaves behind (read for real with importlib.metadata from a dist-info folder the
 * example creates). The terminal commands themselves (venv, activate, pip) are explained, not run: the Python in
 * this page has no terminal and no pip, and the lessons say so instead of printing pretend results.
 *
 * The last two lessons use the real sqlite3 module: tables, parameterised queries, joins and grouping, then
 * transactions checked from a second connection to the same database file, so a missing commit really shows.
 * Fixtures are slices of Runtime Market (R01) products, customers, orders and payments, and NOAA daily weather (D07).
 * Version 2: rewritten from file-marker and print-a-word exercises; saved progress from version 1 doesn't count.
 */
import type { PyLesson } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- fixtures: pyvenv.cfg and pyproject.toml texts

const CFG_POSIX = [
  "home = /usr/local/bin",
  "include-system-site-packages = false",
  "version = 3.12.4",
  "executable = /usr/local/bin/python3.12",
  "command = /usr/local/bin/python3.12 -m venv /home/ana/market-reports/.venv",
  "",
].join("\n");
const CFG_VIRTUALENV = [
  "home = /opt/homebrew/opt/python@3.11/bin",
  "implementation = CPython",
  "version_info = 3.11.9.final.0",
  "virtualenv = 20.26.2",
  "include-system-site-packages = false",
  "base-prefix = /opt/homebrew/opt/python@3.11/Frameworks/Python.framework/Versions/3.11",
  "",
].join("\n");
const CFG_WINDOWS = [
  "home = C:\\Users\\ana\\AppData\\Local\\Programs\\Python\\Python313",
  "include-system-site-packages = true",
  "version = 3.13.0",
  "executable = C:\\Users\\ana\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
  "",
].join("\n");
const CFG_OLD = "home = /usr/bin\ninclude-system-site-packages = False\nversion = 3.9.18\n";
const CFG_NOVERSION = "home = /usr/bin\ninclude-system-site-packages = false\n";
const CFG_PRERELEASE = "home=/usr/local/bin\nversion=3.14.0rc2\n";

const PYPROJECT_FULL = [
  "[project]",
  'name = "market-reports"',
  'version = "1.4.2"',
  'description = "Daily sales reports for Runtime Market"',
  'requires-python = ">=3.11"',
  'dependencies = ["requests>=2.31", "pandas>=2.2,<3"]',
  "",
].join("\n");
const PYPROJECT_DYNAMIC = [
  "[project]",
  'name = "market-reports"',
  'dynamic = ["version"]',
  'description = "Daily sales reports"',
  "",
].join("\n");
const PYPROJECT_TOOL_ONLY = ["[tool.market-reports]", "top_n = 3", ""].join("\n");

// ---------------------------------------------------------------- SQLite check helpers

/** A Python string literal for any text (JSON string syntax is valid Python here). */
const pyLit = (s: string) => JSON.stringify(s);

/** Python lines that build `_conn`, an in-memory database with the given tables and rows. */
function memoryDb(tables: { create: string; insert?: string; rows?: unknown[][] }[], name = "_conn", file = ":memory:"): string {
  const lines = ["import sqlite3 as _sq, json as _js", `${name} = _sq.connect(${pyLit(file)})`];
  for (const t of tables) {
    lines.push(`${name}.execute(${pyLit(t.create)})`);
    if (t.insert && t.rows) lines.push(`${name}.executemany(${pyLit(t.insert)}, _js.loads(${pyLit(JSON.stringify(t.rows))}))`);
  }
  if (file !== ":memory:") lines.push(`${name}.commit()`);
  return lines.join("\n");
}

/** Rows as Python sees them from fetchall(): a list of tuples. */
const rowsOf = (rows: unknown[][]) => py.list(...rows.map((r) => py.tuple(...r.map(pv))));

function sqlCheck(id: string, label: string, setup: string, call: string, expected: unknown, o: { hidden?: boolean; show?: string; raises?: string } = {}): PyCheck {
  return {
    kind: "expr",
    id,
    label,
    ...(o.raises ? { expr: `${setup}\n${call}`, raises: o.raises } : { expr: `${setup}\nresult = ${call}`, expected: pv(expected) }),
    ...(o.show ? { show: o.show } : {}),
    ...(o.hidden ? { hidden: true } : {}),
  };
}

const PRODUCTS = {
  create: "CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)",
  insert: "INSERT INTO products VALUES (?, ?, ?, ?, ?)",
};
const productRows = [
  ["SPO-11681", "Ultra Bike Light", "sports", 7.49, 12],
  ["HOM-22847", "Deluxe Vase", "home", 31, 0],
  ["SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7],
  ["ELE-24781", "Organic Speaker", "electronics", 171.99, 4],
  ["SPO-65611", "Studio Tent", "sports", 45, 0],
  ["TOY-54564", "Eco Train Set", "toys", 26.99, 9],
  ["ELE-01243", "Nordic Cable", "electronics", 80.99, 15],
];
const tieRows = [
  ["KID-00412", "Puzzle Cube", "kids' toys", 9.5, 3],
  ["KID-00118", "Kite", "kids' toys", 9.5, 6],
  ["KID-00733", "Yo-yo", "kids' toys", 4.25, 0],
  ["KID-00950", "Chalk Set", "kids' toys", 12, 2],
];

const PAYMENTS = { create: "CREATE TABLE payments (payment_id TEXT PRIMARY KEY, order_id TEXT, method TEXT, amount REAL)" };

const STOCK_FILE = (file: string, rows: unknown[][]) =>
  memoryDb([{ create: "CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)", insert: "INSERT INTO stock VALUES (?, ?)", rows }], "_setup", file) +
  `\n_setup.close()\n_conn = _sq.connect(${pyLit(file)})`;
const readBack = (file: string, sql: string) => `_sq.connect(${pyLit(file)}).execute(${pyLit(sql)}).fetchall()`;

const PAYMENT_DB = (file: string) =>
  memoryDb(
    [
      { create: "CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL, paid REAL)", insert: "INSERT INTO orders VALUES (?, ?, ?)", rows: [["O100282", 35.84, 0], ["O101219", 246.6, 100], ["O101341", 46.41, 0]] },
      { create: "CREATE TABLE payments (order_id TEXT, amount REAL)" },
    ],
    "_setup",
    file,
  ) + `\n_setup.close()\n_conn = _sq.connect(${pyLit(file)})`;

const READINGS_DB = (file: string) =>
  memoryDb([{ create: "CREATE TABLE readings (station_id TEXT, day TEXT, tmax_c REAL CHECK (tmax_c BETWEEN -90 AND 60))" }], "_setup", file) +
  `\n_setup.close()\n_conn = _sq.connect(${pyLit(file)})`;
const reading = (day: string, t: number) => ["USW00094846", day, t];
const fiveReadings = [reading("2024-01-01", 1.1), reading("2024-01-02", -3.2), reading("2024-01-03", 0.6), reading("2024-01-04", 4.4), reading("2024-01-05", 2.8)];
const badFourth = [reading("2024-07-01", 31.7), reading("2024-07-02", 33.9), reading("2024-07-03", 30.6), reading("2024-07-04", 99.9)];

export const m30Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L30-01 virtual environments
  {
    id: "PY-L30-01",
    version: 2,
    slug: "virtual-environments",
    title: "Virtual environments: one project, its own packages",
    lede: "A virtual environment is a folder with its own site-packages, so each project installs the versions it needs without fighting the others. You create and activate it in a terminal; from Python you can inspect it.",
    focus: "Explain what a virtual environment is and how it's used, and read the files and paths that describe one.",
    minutes: 18,
    objectives: [
      "Say what `python -m venv .venv`, activation and `python -m pip install` each do, and where packages end up",
      "Read the settings in a `pyvenv.cfg` file and turn them into a dictionary",
      "Tell from `sys.prefix` and `sys.base_prefix` whether a program runs inside a virtual environment",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "continue-statement", "conversion", "dict-get", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "part-attr", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack"],
    teaches: ["venv-mark"],
    blocks: [
      {
        kind: "text",
        md: "Two projects on one computer rarely agree. The sales report needs `pandas` 2.2; an old invoice script only works with 1.5. If both install into the one Python that came with the computer, the second install replaces the first and one project breaks.\n\nA **virtual environment** solves this with a folder. It has its own `site-packages` (where installed packages live), a `bin/` folder (`Scripts\\` on Windows) with a `python` that uses that site-packages, and a small settings file, `pyvenv.cfg`, saying which Python it was made from. The commands, typed in a terminal on your own computer:\n\n- `python -m venv .venv` creates the folder `.venv` next to your project;\n- `source .venv/bin/activate` (macOS, Linux) or `.venv\\Scripts\\activate` (Windows) **activates** it: for that terminal only, `python` and `pip` now mean the ones inside `.venv`;\n- `python -m pip install pandas` installs into whichever environment that `python` belongs to;\n- `deactivate` goes back to the computer's own Python.\n\nThe Python in this page runs inside your browser, with no terminal and no pip, so these commands aren't run here. What a program *can* do anywhere is read the files an environment is made of, and ask its own interpreter where it lives. That's what the examples do.",
      },
      {
        kind: "example",
        title: "Read pyvenv.cfg",
        code: src`
cfg_text = """home = /usr/local/bin
include-system-site-packages = false
version = 3.12.4
executable = /usr/local/bin/python3.12
command = /usr/local/bin/python3.12 -m venv /home/ana/market-reports/.venv
"""

settings = {}
for line in cfg_text.splitlines():
    if "=" not in line:
        continue
    key, value = line.split("=", 1)
    settings[key.strip()] = value.strip()

print(settings["version"])
print(settings["include-system-site-packages"])
print(len(settings), "settings")
`,
        output: "3.12.4\nfalse\n5 settings\n",
        note: "This is the file `python -m venv` writes, word for word. `split(\"=\", 1)` splits at the first `=` only, so a value that contains `=` stays whole. Every value is **text**: `false` is the five letters, not the boolean.",
      },
      {
        kind: "text",
        md: "A running program can also check whether it is inside an environment. `sys.base_prefix` is the folder of the Python installation; `sys.prefix` is the environment's folder when one is active and the same folder otherwise. So `sys.prefix != sys.base_prefix` means *inside a virtual environment*.\n\nWhere pip puts a package follows a fixed layout, and `pathlib`'s **pure paths** can build it for either operating system without touching the disk: `PurePosixPath` joins with `/`, `PureWindowsPath` with `\\`.",
      },
      {
        kind: "example",
        title: "Inside an environment? Where do packages go?",
        code: src`
import sys
from pathlib import PurePosixPath, PureWindowsPath

def in_virtualenv(prefix, base_prefix):
    return prefix != base_prefix

def site_packages(env_dir, version, windows):
    if windows:
        return PureWindowsPath(env_dir) / "Lib" / "site-packages"
    major_minor = ".".join(version.split(".")[:2])
    return PurePosixPath(env_dir) / "lib" / f"python{major_minor}" / "site-packages"

print(in_virtualenv("/home/ana/market-reports/.venv", "/usr/local"))
print(in_virtualenv(sys.prefix, sys.base_prefix))
print(site_packages("/home/ana/market-reports/.venv", "3.12.4", False))
print(site_packages(r"C:\Users\ana\market-reports\.venv", "3.12.4", True))
`,
        output: "True\nFalse\n/home/ana/market-reports/.venv/lib/python3.12/site-packages\nC:\\Users\\ana\\market-reports\\.venv\\Lib\\site-packages\n",
        note: "The second line asks the interpreter running this page. It isn't in a virtual environment, so the prefixes are equal and the answer is `False`. On your computer, run the same line after activating `.venv` and it prints `True`. The `r` before the Windows path keeps each `\\` as written.",
      },
      {
        kind: "text",
        md: "**When to use one:** always, one environment per project. Make it once, activate it whenever you work on the project, and install with `python -m pip` so the pip you run belongs to the Python you mean.\n\n**Mistakes to avoid:** running `pip install` in a terminal where the environment isn't active (the package lands in another Python, and `import` in your project still fails); committing `.venv` to git (it is big and machine-specific: list your dependencies instead, next lessons); and treating the text `false` in `pyvenv.cfg` as if it were `False`. Any non-empty text is true in an `if`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The activate script on Windows",
      prompt: "`activate_script` always builds the macOS/Linux path. Add the Windows case: when `windows` is true, return the path to `Scripts\\activate.bat` inside the environment, built with `PureWindowsPath`.",
      spec: [
        ["Function", "`activate_script(env_dir, windows)`"],
        ["Returns", "the path as text: `<env>/bin/activate`, or `<env>\\Scripts\\activate.bat` when `windows` is true"],
        ["Example", "`activate_script(\"/home/ana/shop/.venv\", False)` → `'/home/ana/shop/.venv/bin/activate'`"],
      ],
      starter: src`
from pathlib import PurePosixPath, PureWindowsPath

def activate_script(env_dir, windows):
    return str(PurePosixPath(env_dir) / "bin" / "activate")

print(activate_script("/home/ana/shop/.venv", False))
print(activate_script(r"C:\Users\ana\shop\.venv", True))
`,
      answer: src`
from pathlib import PurePosixPath, PureWindowsPath

def activate_script(env_dir, windows):
    if windows:
        return str(PureWindowsPath(env_dir) / "Scripts" / "activate.bat")
    return str(PurePosixPath(env_dir) / "bin" / "activate")

print(activate_script("/home/ana/shop/.venv", False))
print(activate_script(r"C:\Users\ana\shop\.venv", True))
`,
      wrong: [
        {
          code: src`
from pathlib import PurePosixPath, PureWindowsPath

def activate_script(env_dir, windows):
    if windows:
        return str(PurePosixPath(env_dir) / "Scripts" / "activate.bat")
    return str(PurePosixPath(env_dir) / "bin" / "activate")
`,
          fails: ["returns"],
          why: "a POSIX path joins the Windows parts with `/`, which isn't the Windows path",
        },
      ],
      hints: ["Only the Windows case is missing: test `windows` first.", "On Windows the folder is `Scripts` and the file is `activate.bat`.", "Build that path with `PureWindowsPath` so the parts are joined with backslashes, and turn it into text with `str`."],
      task: {
        checks: [
          fn("returns", "activate_script", [
            example(["/home/ana/shop/.venv", false], "/home/ana/shop/.venv/bin/activate"),
            example(["C:\\Users\\ana\\shop\\.venv", true], "C:\\Users\\ana\\shop\\.venv\\Scripts\\activate.bat"),
            hiddenCase("a relative environment folder on Windows", [".venv", true], ".venv\\Scripts\\activate.bat"),
            hiddenCase("a relative environment folder on Linux", ["env", false], "env/bin/activate"),
          ], { label: "activate_script() builds the right path for each system" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which Python made this environment?",
        prompt: "A build server finds old environments lying around and needs to know which Python made each one. Two tools write `pyvenv.cfg`: the standard `venv` writes `version = 3.12.4`, and the third-party `virtualenv` writes `version_info = 3.11.9.final.0` instead. Write `env_python_version(cfg_text)`: return the major and minor version as a tuple of two ints, or `None` when the file has neither setting.",
        spec: [
          ["Function", "`env_python_version(cfg_text)`"],
          ["cfg_text", "the text of a `pyvenv.cfg` file: lines of `key = value` (spaces around `=` are optional)"],
          ["Returns", "`(major, minor)` as ints from `version`, or from `version_info` when there is no `version`; `None` when neither is present"],
          ["Example", "the starter's text → `(3, 12)`; a virtualenv file with `version_info = 3.11.9.final.0` → `(3, 11)`"],
        ],
        starter: src`
def env_python_version(cfg_text):
    return None

cfg_text = """home = /usr/local/bin
include-system-site-packages = false
version = 3.12.4
"""
print(env_python_version(cfg_text))
`,
        answer: src`
def env_python_version(cfg_text):
    found = {}
    for line in cfg_text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            found[key.strip()] = value.strip()
    text = found.get("version", found.get("version_info"))
    if text is None:
        return None
    major, minor = text.split(".")[:2]
    return (int(major), int(minor))

cfg_text = """home = /usr/local/bin
include-system-site-packages = false
version = 3.12.4
"""
print(env_python_version(cfg_text))
`,
        alternatives: [
          src`
def env_python_version(cfg_text):
    for wanted in ["version", "version_info"]:
        for line in cfg_text.splitlines():
            parts = line.split("=", 1)
            if len(parts) == 2 and parts[0].strip() == wanted:
                numbers = parts[1].strip().split(".")
                return (int(numbers[0]), int(numbers[1]))
    return None
`,
        ],
        wrong: [
          {
            code: src`
def env_python_version(cfg_text):
    for line in cfg_text.splitlines():
        if line.startswith("version ="):
            numbers = line.split("=")[1].strip().split(".")
            return (int(numbers[0]), int(numbers[1]))
    return None
`,
            fails: ["returns"],
            why: "it only knows the `venv` spelling with spaces, so virtualenv files and `version=3.14.0rc2` give None",
          },
          {
            code: src`
def env_python_version(cfg_text):
    for line in cfg_text.splitlines():
        if "version" in line:
            numbers = line.split("=")[1].strip().split(".")
            return (numbers[0], numbers[1])
    return None
`,
            fails: ["returns"],
            why: "the parts stay text, so `('3', '12')` is returned instead of `(3, 12)`",
          },
          {
            code: src`
def env_python_version(cfg_text):
    found = {}
    for line in cfg_text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            found[key.strip()] = value.strip()
    text = found.get("version_info", found.get("version"))
    if text is None:
        return None
    major, minor = text.split(".")[:2]
    return (int(major), int(minor))
`,
            fails: ["returns"],
            why: "`version_info` is preferred over `version`, the wrong way round when a file has both",
          },
        ],
        hints: [
          "Turn the lines into a dictionary first, the way the first example does.",
          "Look up `version`, and only when it is missing fall back to `version_info`; `get` can do both in one expression.",
          "Only the first two dot-separated parts matter, and they must be converted to whole numbers.",
        ],
        task: {
          checks: [
            fn("returns", "env_python_version", [
              example([CFG_POSIX], py.tuple(py.int(3), py.int(12))),
              example([CFG_VIRTUALENV], py.tuple(py.int(3), py.int(11))),
              example([CFG_NOVERSION], null),
              hiddenCase("a Windows file", [CFG_WINDOWS], py.tuple(py.int(3), py.int(13))),
              hiddenCase("no spaces around = and a pre-release version", [CFG_PRERELEASE], py.tuple(py.int(3), py.int(14))),
              hiddenCase("a file with both settings", ["version_info = 3.10.2.final.0\nversion = 3.12.1\n"], py.tuple(py.int(3), py.int(12))),
              hiddenCase("an empty file", [""], null),
            ], { label: "env_python_version() reads the version from either tool's file" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Is this environment fit for the project?",
        prompt: "Before running the nightly report, a check script inspects the environment it was given. Write `environment_problems(cfg_text, minimum)`: return a list of problems, in this order, and an empty list when there are none.",
        spec: [
          ["Function", "`environment_problems(cfg_text, minimum)`"],
          ["minimum", "the oldest Python the project supports, as text such as `\"3.11\"`"],
          ["Problem 1", "no `version` or `version_info` setting → `\"unknown Python version\"`; otherwise, if the environment's (major, minor) is older than `minimum` → `\"Python 3.9 is older than 3.11\"`"],
          ["Problem 2", "`include-system-site-packages` is true (any capitalisation of `true`) → `\"system site-packages are visible\"`"],
          ["Example", "a cfg with `version = 3.9.18` and `include-system-site-packages = true`, minimum `\"3.11\"` → `['Python 3.9 is older than 3.11', 'system site-packages are visible']`"],
        ],
        starter: src`
def environment_problems(cfg_text, minimum):
    problems = []
    return problems

cfg_text = """home = /usr/bin
include-system-site-packages = true
version = 3.9.18
"""
print(environment_problems(cfg_text, "3.11"))
`,
        answer: src`
def read_cfg(cfg_text):
    settings = {}
    for line in cfg_text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            settings[key.strip()] = value.strip()
    return settings

def as_pair(text):
    parts = text.split(".")
    return (int(parts[0]), int(parts[1]))

def environment_problems(cfg_text, minimum):
    settings = read_cfg(cfg_text)
    problems = []
    version = settings.get("version", settings.get("version_info"))
    if version is None:
        problems.append("unknown Python version")
    elif as_pair(version) < as_pair(minimum):
        major, minor = as_pair(version)
        problems.append(f"Python {major}.{minor} is older than {minimum}")
    if settings.get("include-system-site-packages", "false").lower() == "true":
        problems.append("system site-packages are visible")
    return problems

cfg_text = """home = /usr/bin
include-system-site-packages = true
version = 3.9.18
"""
print(environment_problems(cfg_text, "3.11"))
`,
        alternatives: [
          src`
def environment_problems(cfg_text, minimum):
    settings = {}
    for line in cfg_text.splitlines():
        key, sep, value = line.partition("=")
        if sep:
            settings[key.strip()] = value.strip()
    want = [int(p) for p in minimum.split(".")[:2]]
    problems = []
    text = settings.get("version") or settings.get("version_info")
    if not text:
        problems.append("unknown Python version")
    else:
        have = [int(p) for p in text.split(".")[:2]]
        if have < want:
            problems.append(f"Python {have[0]}.{have[1]} is older than {minimum}")
    if settings.get("include-system-site-packages", "").lower() == "true":
        problems.append("system site-packages are visible")
    return problems
`,
        ],
        wrong: [
          {
            code: src`
def environment_problems(cfg_text, minimum):
    settings = {}
    for line in cfg_text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            settings[key.strip()] = value.strip()
    problems = []
    version = settings.get("version", settings.get("version_info"))
    if version is None:
        problems.append("unknown Python version")
    elif version < minimum:
        problems.append(f"Python {version[:3]} is older than {minimum}")
    if settings.get("include-system-site-packages", "false").lower() == "true":
        problems.append("system site-packages are visible")
    return problems
`,
            fails: ["returns"],
            why: "versions are compared as text, so 3.10 counts as older than 3.9",
          },
          {
            code: src`
def environment_problems(cfg_text, minimum):
    settings = {}
    for line in cfg_text.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            settings[key.strip()] = value.strip()
    problems = []
    version = settings.get("version", settings.get("version_info"))
    if version is None:
        problems.append("unknown Python version")
    else:
        parts = version.split(".")
        want = minimum.split(".")
        if (int(parts[0]), int(parts[1])) < (int(want[0]), int(want[1])):
            problems.append(f"Python {parts[0]}.{parts[1]} is older than {minimum}")
    if settings.get("include-system-site-packages"):
        problems.append("system site-packages are visible")
    return problems
`,
            fails: ["returns"],
            why: "the text `false` is non-empty, so every file with the setting is reported as leaking system packages",
          },
        ],
        hints: [
          "Split the work: read the settings into a dictionary, then make each decision on its own.",
          "Compare versions as tuples of whole numbers, not as text: as text, `\"3.10\" < \"3.9\"` is true.",
          "The setting's value is text. Compare it, lower-cased, with the word `true` instead of testing it in a bare `if`.",
        ],
        task: {
          checks: [
            fn("returns", "environment_problems", [
              example([CFG_OLD.replace("False", "true"), "3.11"], ["Python 3.9 is older than 3.11", "system site-packages are visible"]),
              example([CFG_POSIX, "3.11"], []),
              example([CFG_NOVERSION, "3.11"], ["unknown Python version"]),
              hiddenCase("Python 3.10 against a 3.9 minimum", ["version = 3.10.14\n", "3.9"], []),
              hiddenCase("a capitalised False", [CFG_OLD, "3.8"], []),
              hiddenCase("a capitalised TRUE from another tool", [CFG_VIRTUALENV.replace("include-system-site-packages = false", "include-system-site-packages = TRUE"), "3.12"], ["Python 3.11 is older than 3.12", "system site-packages are visible"]),
              hiddenCase("exactly the minimum version", [CFG_WINDOWS.replace("= true", "= false"), "3.13"], []),
            ], { label: "environment_problems() reports old Pythons and visible system packages" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from pathlib import PurePosixPath

env = PurePosixPath("/home/ana/market-reports/.venv")
print(env / "bin" / "python")
print(env.name, env.parent.name)
`,
        choices: [
          "/home/ana/market-reports/.venv/bin/python\n.venv market-reports",
          "/home/ana/market-reports/.venv/bin/python\nmarket-reports .venv",
          "bin/python\n.venv market-reports",
          "/home/ana/market-reports/.venv\\bin\\python\n.venv market-reports",
        ],
        answer: 0,
        why: "`/` joins path parts with the separator of the path's own kind. `name` is the last part (`.venv`), and `parent` is the folder that holds it.",
      },
      {
        id: "q2",
        prompt: "A common mistake with values read from `pyvenv.cfg`. What does this print?",
        program: src`
settings = {"include-system-site-packages": "false"}
if settings["include-system-site-packages"]:
    print("system packages visible")
else:
    print("isolated")
`,
        choices: ["system packages visible", "isolated", "false", "KeyError"],
        answer: 0,
        why: "The value is the text `\"false\"`, and any non-empty text is true in an `if`. Compare it with `\"true\"` (after `lower()`) instead.",
      },
      {
        id: "q3",
        prompt: "In a new terminal you go to your project and run `pip install requests` without activating `.venv`. Then `python main.py` with the environment activated fails with `ModuleNotFoundError: No module named 'requests'`. Why?",
        choices: [
          "requests was installed into whichever Python that `pip` belonged to, not into `.venv`",
          "pip can only install one package per environment",
          "Activating an environment deletes the packages installed before it",
          "requests must be imported with its full path inside `.venv`",
        ],
        answer: 0,
        why: "Activation only changes which `python` and `pip` that terminal finds. Installing first, in a terminal without the environment, put the package somewhere else. `python -m pip install requests` after activating installs into `.venv`.",
      },
    ],
    review: [
      "A virtual environment is a folder with its own site-packages and a `pyvenv.cfg` saying which Python made it.",
      "`python -m venv .venv`, activate, then `python -m pip install …`: activation only affects that terminal.",
      "`sys.prefix != sys.base_prefix` is true inside an environment; values in `pyvenv.cfg` are always text.",
      "Next: `pyproject.toml`, the file that describes the project itself and the packages it needs.",
    ],
  },

  // ------------------------------------------------------------------ PY-L30-02 pyproject.toml
  {
    id: "PY-L30-02",
    version: 2,
    slug: "pyproject-toml",
    title: "pyproject.toml: describe the project",
    lede: "One file tells every tool what your project is: its name and version, the Python it needs, the packages it depends on, and the commands it installs. tomllib reads that file into ordinary dictionaries.",
    focus: "Read a project's pyproject.toml with tomllib and use the [project] and [tool] tables it contains.",
    minutes: 18,
    objectives: [
      "Recognise TOML's tables, keys, quoted strings and arrays, and what the `[project]` table holds",
      "Load TOML text with `tomllib.loads`, or a file opened in binary mode with `tomllib.load`",
      "Read optional tables safely and keep your own tool's settings under `[tool.<name>]`",
    ],
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "newline-escape", "path-call", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "set-literal", "star-kwargs", "string-format", "string-index", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "unquoted-name", "with-statement"],
    teaches: ["pyproject-file"],
    blocks: [
      {
        kind: "text",
        md: "pip, build tools, linters and test runners all need to know something about your project: what it's called, which version this is, which Python it supports and which packages it needs. Since 2021 the standard place for all of it is **`pyproject.toml`** in the project's top folder.\n\nThe file is written in **TOML**. A line `[project]` starts a **table**, a group of settings; `[project.scripts]` is a table inside `project`. Each setting is `key = value`. Text is always in quotes, numbers and `true`/`false` aren't, and `[\"a\", \"b\"]` is an array. Python's `tomllib` module (3.11 and later) turns the whole file into dictionaries, lists, strings, numbers and booleans.",
      },
      {
        kind: "example",
        title: "Read the [project] table",
        code: src`
import tomllib

pyproject = """
[project]
name = "market-reports"
version = "1.4.2"
requires-python = ">=3.11"
dependencies = [
    "requests>=2.31",
    "pandas>=2.2,<3",
]

[project.optional-dependencies]
charts = ["matplotlib>=3.8"]
"""

data = tomllib.loads(pyproject)
project = data["project"]
print(project["name"], project["version"])
print(project["requires-python"])
print(project["dependencies"])
print(project["optional-dependencies"]["charts"])
`,
        output: "market-reports 1.4.2\n>=3.11\n['requests>=2.31', 'pandas>=2.2,<3']\n['matplotlib>=3.8']\n",
        note: "`[project.optional-dependencies]` became a dictionary inside `project`. `dependencies` is what `pip install market-reports` installs; an optional group installs only when asked for, as in `pip install \"market-reports[charts]\"`.",
      },
      {
        kind: "text",
        md: "TOML is stricter than it looks. A version number is text, so it needs quotes; without them the parser stops and says where.",
      },
      {
        kind: "error-example",
        title: "An unquoted version",
        code: src`
import tomllib

text = """
[project]
name = "market-reports"
version = 1.4.2
"""
data = tomllib.loads(text)
print(data)
`,
        error: "TOMLDecodeError",
        output: "",
        note: "`tomllib.TOMLDecodeError: Expected newline or end of document after a statement (at line 4, column 12)`. TOML read `1.4` as a number and didn't expect the second dot. Writing `version = \"1.4.2\"` fixes it.",
      },
      {
        kind: "text",
        md: "Real files live on disk. `tomllib.load` reads an open file, and it needs the file opened in **binary** mode, `\"rb\"`, because TOML defines its own text encoding (UTF-8).\n\nNot every project has every table, so read optional ones with `get` and a default. Tools keep their own settings in `[tool.<name>]` tables (`[tool.pytest.ini_options]`, `[tool.ruff]`): your own scripts can do the same instead of inventing another settings file.",
      },
      {
        kind: "example",
        title: "Commands and tool settings from a file",
        code: src`
import tomllib
from pathlib import Path

Path("pyproject.toml").write_text("""
[project]
name = "market-reports"
version = "1.4.2"

[project.scripts]
market-report = "market_reports.cli:main"

[tool.market-reports]
currency = "USD"
top_n = 5
""", encoding="utf-8")

def load_pyproject(path):
    with open(path, "rb") as f:
        return tomllib.load(f)

def commands(data):
    scripts = data["project"].get("scripts", {})
    lines = []
    for command, target in scripts.items():
        module, function = target.split(":")
        lines.append(f"{command}: runs {function}() from {module}")
    return lines

data = load_pyproject("pyproject.toml")
print(commands(data))
print(data["tool"]["market-reports"])
print(commands({"project": {"name": "invoice-tools"}}))
`,
        output: "['market-report: runs main() from market_reports.cli']\n{'currency': 'USD', 'top_n': 5}\n[]\n",
        note: "`[project.scripts]` tells pip to create a `market-report` command that calls `main()` in `market_reports/cli.py`. A project without scripts gives `[]` because of the `get` default. `top_n` came back as the int 5: TOML values keep their types.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a program needs facts about the project (its version for a `--version` flag, its settings), read them from `pyproject.toml` instead of copying them into code. **Mistakes to avoid:** unquoted text values; opening the file without `\"rb\"`; and assuming an optional table such as `[project.scripts]` or `[tool.x]` exists.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Name and version together",
      prompt: "`project_label` returns only the project's name. Change it to return the name and the version separated by one space, such as `market-reports 1.4.2`.",
      spec: [
        ["Function", "`project_label(text)`"],
        ["Returns", "`\"<name> <version>\"` from the `[project]` table of the TOML text"],
      ],
      starter: src`
import tomllib

def project_label(text):
    project = tomllib.loads(text)["project"]
    return project["name"]

print(project_label('[project]\nname = "market-reports"\nversion = "1.4.2"\n'))
`,
      answer: src`
import tomllib

def project_label(text):
    project = tomllib.loads(text)["project"]
    return project["name"] + " " + project["version"]

print(project_label('[project]\nname = "market-reports"\nversion = "1.4.2"\n'))
`,
      wrong: [
        {
          code: src`
import tomllib

def project_label(text):
    project = tomllib.loads(text)["project"]
    return project["name"] + project["version"]
`,
          fails: ["returns"],
          why: "the space between name and version is missing",
        },
      ],
      hints: ["The version sits next to the name in the same table.", "Look it up with `project[\"version\"]`.", "Join the two texts with a single space between them."],
      task: {
        checks: [
          fn("returns", "project_label", [
            example(['[project]\nname = "market-reports"\nversion = "1.4.2"\n'], "market-reports 1.4.2"),
            hiddenCase("a file with more settings", [PYPROJECT_FULL], "market-reports 1.4.2"),
            hiddenCase("a pre-release version", ['[project]\nversion = "0.9.0b1"\nname = "invoice-tools"\n'], "invoice-tools 0.9.0b1"),
          ], { label: "project_label() returns the name and the version" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which metadata is missing?",
        prompt: "Your team publishes internal packages and requires four `[project]` fields: `name`, `version`, `description` and `requires-python`. A field may also be **dynamic**: listed in the `dynamic` array because the build tool fills it in (often the version, taken from git). Write `missing_metadata(text)`: return the required fields that are neither set nor listed in `dynamic`, in the order above.",
        spec: [
          ["Function", "`missing_metadata(text)`"],
          ["text", "the content of a `pyproject.toml`"],
          ["Returns", "a list of missing field names, in the order `name`, `version`, `description`, `requires-python`; `[]` when nothing is missing"],
          ["Rules", "a file with no `[project]` table is missing all four; a field named in `dynamic` counts as present"],
          ["Example", "a `[project]` with only `name` and `dynamic = [\"version\"]` → `['description', 'requires-python']`"],
        ],
        starter: src`
import tomllib

REQUIRED = ["name", "version", "description", "requires-python"]

def missing_metadata(text):
    return []

print(missing_metadata('[project]\nname = "market-reports"\ndynamic = ["version"]\n'))
`,
        answer: src`
import tomllib

REQUIRED = ["name", "version", "description", "requires-python"]

def missing_metadata(text):
    project = tomllib.loads(text).get("project", {})
    dynamic = project.get("dynamic", [])
    missing = []
    for field in REQUIRED:
        if field not in project and field not in dynamic:
            missing.append(field)
    return missing

print(missing_metadata('[project]\nname = "market-reports"\ndynamic = ["version"]\n'))
`,
        alternatives: [
          src`
import tomllib

REQUIRED = ["name", "version", "description", "requires-python"]

def missing_metadata(text):
    data = tomllib.loads(text)
    if "project" not in data:
        return list(REQUIRED)
    present = list(data["project"]) + data["project"].get("dynamic", [])
    return [field for field in REQUIRED if field not in present]
`,
        ],
        wrong: [
          {
            code: src`
import tomllib

REQUIRED = ["name", "version", "description", "requires-python"]

def missing_metadata(text):
    project = tomllib.loads(text).get("project", {})
    missing = []
    for field in REQUIRED:
        if field not in project:
            missing.append(field)
    return missing
`,
            fails: ["returns"],
            why: "a dynamic version is reported as missing although the build tool will fill it in",
          },
          {
            code: src`
import tomllib

REQUIRED = ["name", "version", "description", "requires-python"]

def missing_metadata(text):
    project = tomllib.loads(text)["project"]
    dynamic = project.get("dynamic", [])
    missing = []
    for field in REQUIRED:
        if field not in project and field not in dynamic:
            missing.append(field)
    return missing
`,
            fails: ["returns"],
            why: "a file without a `[project]` table crashes with KeyError instead of reporting all four fields",
          },
        ],
        hints: [
          "Load the text, then take the `project` table, or an empty dictionary when there isn't one.",
          "`dynamic` is a list of field names that may be missing from the table itself.",
          "Walk the required fields in order and keep each one that is in neither place.",
        ],
        task: {
          checks: [
            fn("returns", "missing_metadata", [
              example(['[project]\nname = "market-reports"\ndynamic = ["version"]\n'], ["description", "requires-python"]),
              example([PYPROJECT_FULL], []),
              example([PYPROJECT_TOOL_ONLY], ["name", "version", "description", "requires-python"]),
              hiddenCase("a dynamic version and description", [PYPROJECT_DYNAMIC], ["requires-python"]),
              hiddenCase("an empty file", [""], ["name", "version", "description", "requires-python"]),
              hiddenCase("fields in a different order in the file", ['[project]\nrequires-python = ">=3.10"\ndescription = "x"\nversion = "2.0"\n'], ["name"]),
            ], { label: "missing_metadata() lists the required fields that are neither set nor dynamic" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Settings for your own tool",
        prompt: "The report script reads its settings from `[tool.market-reports]` in `pyproject.toml`. Write `report_settings(text)`: start from the defaults, apply the values from that table, and return the result. Reject typos: an unknown key raises `ValueError`. `top_n` must be a whole number of at least 1, otherwise `ValueError`. `DEFAULTS` itself must never change.",
        spec: [
          ["Function", "`report_settings(text)`"],
          ["Defaults", "`DEFAULTS = {\"currency\": \"USD\", \"top_n\": 10, \"output_dir\": \"reports\"}` (in the starter)"],
          ["Returns", "a new dictionary: the defaults, overridden by the keys in `[tool.market-reports]`; just the defaults when the table (or the file's `[tool]` table) is missing"],
          ["Raises", "`ValueError` for a key not in `DEFAULTS`, or for a `top_n` that isn't an int of at least 1"],
          ["Example", "`top_n = 3` in the table → `{'currency': 'USD', 'top_n': 3, 'output_dir': 'reports'}`"],
        ],
        starter: src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    return DEFAULTS

print(report_settings('[tool.market-reports]\ntop_n = 3\n'))
`,
        answer: src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    table = tomllib.loads(text).get("tool", {}).get("market-reports", {})
    settings = dict(DEFAULTS)
    for key, value in table.items():
        if key not in DEFAULTS:
            raise ValueError(f"unknown setting: {key}")
        settings[key] = value
    top_n = settings["top_n"]
    if type(top_n) is not int or top_n < 1:
        raise ValueError("top_n must be a whole number of at least 1")
    return settings

print(report_settings('[tool.market-reports]\ntop_n = 3\n'))
`,
        alternatives: [
          src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    tool = tomllib.loads(text).get("tool", {})
    table = tool.get("market-reports", {})
    unknown = [key for key in table if key not in DEFAULTS]
    if unknown:
        raise ValueError("unknown settings: " + ", ".join(unknown))
    settings = {**DEFAULTS, **table}
    if not isinstance(settings["top_n"], int) or isinstance(settings["top_n"], bool) or settings["top_n"] < 1:
        raise ValueError("bad top_n")
    return settings
`,
        ],
        wrong: [
          {
            code: src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    table = tomllib.loads(text).get("tool", {}).get("market-reports", {})
    settings = DEFAULTS
    for key, value in table.items():
        if key not in DEFAULTS:
            raise ValueError(f"unknown setting: {key}")
        settings[key] = value
    if type(settings["top_n"]) is not int or settings["top_n"] < 1:
        raise ValueError("bad top_n")
    return settings
`,
            fails: ["returns", "defaults-kept"],
            why: "`settings = DEFAULTS` is the same dictionary, so one file's values leak into every later call",
          },
          {
            code: src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    table = tomllib.loads(text).get("tool", {}).get("market-reports", {})
    settings = dict(DEFAULTS)
    settings.update(table)
    if type(settings["top_n"]) is not int or settings["top_n"] < 1:
        raise ValueError("bad top_n")
    return settings
`,
            fails: ["returns"],
            why: "a misspelt key such as `top-n` is silently added instead of being rejected",
          },
          {
            code: src`
import tomllib

DEFAULTS = {"currency": "USD", "top_n": 10, "output_dir": "reports"}

def report_settings(text):
    table = tomllib.loads(text)["tool"]["market-reports"]
    settings = dict(DEFAULTS)
    for key, value in table.items():
        if key not in DEFAULTS:
            raise ValueError(f"unknown setting: {key}")
        settings[key] = value
    if type(settings["top_n"]) is not int or settings["top_n"] < 1:
        raise ValueError("bad top_n")
    return settings
`,
            fails: ["returns"],
            why: "a project without the tool table crashes with KeyError instead of using the defaults",
          },
        ],
        hints: [
          "Reach the table in two steps, each with `get` and an empty dictionary as the default, because either level may be missing.",
          "Copy the defaults into a new dictionary before changing anything, so `DEFAULTS` stays as it was for the next call.",
          "Check each key against `DEFAULTS` before storing it; check `top_n` once, after all the values are in.",
        ],
        task: {
          checks: [
            fn("returns", "report_settings", [
              example(["[tool.market-reports]\ntop_n = 3\n"], { currency: "USD", top_n: 3, output_dir: "reports" }),
              example(['[project]\nname = "market-reports"\n'], { currency: "USD", top_n: 10, output_dir: "reports" }),
              raisesCase(["[tool.market-reports]\ntop-n = 3\n"], "ValueError"),
              hiddenCase("several overrides", ['[tool.market-reports]\ncurrency = "EUR"\noutput_dir = "out/daily"\n'], { currency: "EUR", top_n: 10, output_dir: "out/daily" }),
              hiddenCase("another tool's table only", ['[tool.ruff]\nline-length = 100\n'], { currency: "USD", top_n: 10, output_dir: "reports" }),
              raisesCase(["[tool.market-reports]\ntop_n = 0\n"], "ValueError", { label: "top_n of zero" }),
              raisesCase(['[tool.market-reports]\ntop_n = "5"\n'], "ValueError", { label: "top_n written as text" }),
            ], { label: "report_settings() applies the tool table over the defaults and rejects bad settings" }),
            {
              kind: "expr",
              id: "defaults-kept",
              label: "DEFAULTS is the same after reading a file with overrides",
              expr: "report_settings('[tool.market-reports]\\ncurrency = \"GBP\"\\n')\nresult = DEFAULTS",
              expected: pv({ currency: "USD", top_n: 10, output_dir: "reports" }),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import tomllib

data = tomllib.loads('[tool.market-reports]\ntop_n = 5\nsend_email = false\n')
settings = data["tool"]["market-reports"]
print(settings["top_n"] + 1, settings["send_email"])
`,
        choices: ["6 False", "51 false", "6 false", "TypeError"],
        answer: 0,
        why: "TOML values keep their types: `5` becomes the int 5 and `false` the boolean `False`. That is the difference from `pyvenv.cfg`, where every value is text.",
      },
      {
        id: "q2",
        prompt: "A common mistake when loading the file. What does this print?",
        program: src`
import tomllib
from pathlib import Path

Path("pyproject.toml").write_text('[project]\nname = "market-reports"\n', encoding="utf-8")
try:
    with open("pyproject.toml", encoding="utf-8") as f:
        tomllib.load(f)
    print("loaded")
except TypeError as err:
    print("TypeError:", err)
`,
        choices: [
          "TypeError: File must be opened in binary mode, e.g. use `open('foo.toml', 'rb')`",
          "loaded",
          "TypeError: expected str, got bytes",
          "UnicodeDecodeError",
        ],
        answer: 0,
        why: "`tomllib.load` reads bytes and decodes them itself, so the file must be opened with `\"rb\"`. For text you already have, use `tomllib.loads`.",
      },
      {
        id: "q3",
        prompt: "Your script `market-report` has its own settings, such as the currency and how many top products to list. Where do they belong in `pyproject.toml`?",
        choices: [
          "In a `[tool.market-reports]` table",
          "As extra keys in the `[project]` table",
          "In `[project.optional-dependencies]`",
          "In `pyvenv.cfg`",
        ],
        answer: 0,
        why: "`[project]` holds only the standard metadata fields, which build tools check. `[tool.<name>]` tables are reserved for tools, including your own.",
      },
    ],
    review: [
      "`pyproject.toml` describes the project: `[project]` has name, version, requires-python, dependencies and more.",
      "`tomllib.loads(text)` or `tomllib.load(open(path, \"rb\"))` gives dictionaries whose values keep their TOML types.",
      "Read optional tables with `get` and a default; keep your own settings in `[tool.<name>]`.",
      "Next: what a dependency line like `pandas>=2.2,<3` means, and how to check what is actually installed.",
    ],
  },

  // ------------------------------------------------------------------ PY-L30-03 dependencies
  {
    id: "PY-L30-03",
    version: 2,
    slug: "dependency-versions",
    title: "Dependencies: version specifiers and installed packages",
    lede: "A dependency line such as pandas>=2.2,<3 names a package and the versions the project accepts. Checking a version means comparing numbers part by part, and importlib.metadata reports what is really installed.",
    focus: "Read requirement specifiers, compare versions as numbers, and look up installed packages with importlib.metadata.",
    minutes: 20,
    objectives: [
      "Read a requirement: name, optional extras, version specifiers joined by commas, and an optional environment marker",
      "Compare versions part by part as numbers, never as text",
      "Ask `importlib.metadata` for an installed package's version and requirements, and handle `PackageNotFoundError`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "break-statement", "comparison", "continue-statement", "conversion", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "else-clause", "encoding-arg", "enumerate-call", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "match-case", "membership", "nested-index", "nested-loop", "newline-escape", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "sort-key", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "try-except", "tuple-unpack", "while-loop"],
    teaches: ["dep-list"],
    blocks: [
      {
        kind: "text",
        md: "Each string in `dependencies` is a **requirement**. `pandas[parquet]>=2.2,<3; python_version >= \"3.10\"` has four parts: the package name `pandas`; an **extra** in square brackets (an optional feature of that package); **version specifiers**, `>=2.2,<3`, which must *all* hold; and after `;` a **marker** that says when the line applies at all.\n\nThe operators are `==`, `!=`, `<`, `<=`, `>`, `>=`, and `~=` (\"compatible release\": `~=2.2` means `>=2.2,<3`). On your computer, `python -m pip install -r requirements.txt` installs versions that satisfy every line, and `python -m pip freeze` prints exactly what is installed as `name==version` lines, which is how an environment is written down and rebuilt elsewhere.\n\nTo check a version yourself you have to compare it the way pip does. Text comparison gets it wrong:",
      },
      {
        kind: "example",
        title: "Versions compared as text",
        code: src`
print("2.10.0" > "2.9.1")
print(sorted(["2.9.1", "2.10.0", "2.2.0"]))
`,
        output: "False\n['2.10.0', '2.2.0', '2.9.1']\n",
        note: "Text is compared character by character: at the third character `1` comes before `9`, so 2.10.0 looks older than 2.9.1. It's ten minor releases newer.",
      },
      {
        kind: "text",
        md: "Split the version at the dots and turn each part into an int. Tuples of numbers compare part by part, which is exactly the rule for release versions. (Real tools use the `packaging` library, which also understands pre-releases such as `2.0rc1`; the release numbers here cover the common case.)",
      },
      {
        kind: "example",
        title: "Versions compared as numbers",
        code: src`
def version_tuple(text):
    return tuple([int(part) for part in text.split(".")])

print(version_tuple("2.10.0") > version_tuple("2.9.1"))
installed = ["2.9.1", "2.10.0", "2.2.0"]
print(sorted(installed, key=version_tuple))
print(version_tuple("2.0") == version_tuple("2.0.0"))
`,
        output: "True\n['2.2.0', '2.9.1', '2.10.0']\nFalse\n",
        note: "The last line is a trap. Versions treat `2.0` and `2.0.0` as the same release, but the tuples `(2, 0)` and `(2, 0, 0)` differ. Pad the shorter one with zeros before comparing.",
      },
      {
        kind: "text",
        md: "Which version is actually installed? When pip installs a package it writes a folder named like `market_reports-1.4.2.dist-info` into site-packages, holding a `METADATA` file. `importlib.metadata` reads those folders from every place on `sys.path`. This example writes such a folder itself, exactly as pip would, and puts it on the path.",
      },
      {
        kind: "example",
        title: "What is installed?",
        code: src`
import sys
from importlib import metadata
from pathlib import Path

info = Path("site-packages/market_reports-1.4.2.dist-info")
info.mkdir(parents=True)
(info / "METADATA").write_text(
    "Metadata-Version: 2.1\nName: market-reports\nVersion: 1.4.2\n"
    "Requires-Dist: requests>=2.31\nRequires-Dist: pandas<3,>=2.2\n",
    encoding="utf-8",
)
sys.path.insert(0, "site-packages")

print(metadata.version("market-reports"))
print(metadata.requires("market-reports"))
try:
    metadata.version("runtime-charts")
except metadata.PackageNotFoundError:
    print("runtime-charts is not installed")
`,
        output: "1.4.2\n['requests>=2.31', 'pandas<3,>=2.2']\nruntime-charts is not installed\n",
        note: "`version` and `requires` read the METADATA file pip wrote. A package that isn't installed raises `PackageNotFoundError`, which is how a program can check for an optional dependency before importing it.",
      },
      {
        kind: "text",
        md: "**When to use it:** to report versions in a bug report or a `--version` flag, to check an optional feature's package before using it, or to audit an environment against the project's requirements. **Mistakes to avoid:** comparing version text with `<`; forgetting that every specifier in a comma list must hold; and treating `Requests`, `requests` and `REQUESTS` as different packages (names are compared case-insensitively, with `-`, `_` and `.` treated alike).",
      },
    ],
    tryIt: {
      id: "try",
      title: "New enough?",
      prompt: "`is_at_least` compares the two versions as text, so it claims 2.10.0 is older than 2.9. Make it compare them as tuples of numbers.",
      spec: [
        ["Function", "`is_at_least(installed, minimum)`"],
        ["Returns", "`True` when the installed version is the minimum or newer"],
      ],
      starter: src`
def is_at_least(installed, minimum):
    return installed >= minimum

print(is_at_least("2.10.0", "2.9"))
`,
      answer: src`
def as_numbers(version):
    return tuple([int(part) for part in version.split(".")])

def is_at_least(installed, minimum):
    return as_numbers(installed) >= as_numbers(minimum)

print(is_at_least("2.10.0", "2.9"))
`,
      wrong: [
        {
          code: src`
def is_at_least(installed, minimum):
    return float(installed[:3]) >= float(minimum[:3])
`,
          fails: ["returns"],
          why: "turning the start into a float reads 2.10 as 2.1, which is less than 2.9",
        },
      ],
      hints: ["The comparison itself is fine; what it compares is not.", "Split each version at the dots and turn every part into an int.", "Tuples of ints compare part by part, so compare the two tuples."],
      task: {
        checks: [
          fn("returns", "is_at_least", [
            example(["2.10.0", "2.9"], true),
            hiddenCase("an older installed version", ["2.2.3", "2.10"], false),
            hiddenCase("exactly the minimum", ["3.1.4", "3.1.4"], true),
            hiddenCase("a newer major version", ["10.0", "9.12.1"], true),
          ], { label: "is_at_least() compares versions as numbers" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Does the version satisfy the specifier?",
        prompt: "Write `satisfies(version, spec)`: `spec` is a comma-separated list of conditions such as `>=2.2,<3` and every condition must hold. Compare versions as numbers, padding the shorter one with zeros so that `2.0` equals `2.0.0`. An empty spec accepts any version.",
        spec: [
          ["Function", "`satisfies(version, spec)`"],
          ["version", "a release version such as `\"2.31.0\"` (only digits and dots)"],
          ["spec", "conditions joined by commas, each `<op><version>` with op one of `>=`, `<=`, `==`, `!=`, `>`, `<`; spaces around them are allowed; `\"\"` means any version"],
          ["Returns", "`True` when every condition holds, else `False`"],
          ["Example", "`satisfies(\"2.31.0\", \">=2.28,<3\")` → `True`; `satisfies(\"3.0\", \">=2.28,<3\")` → `False`"],
        ],
        starter: src`
def satisfies(version, spec):
    return True

print(satisfies("2.31.0", ">=2.28,<3"))
print(satisfies("3.0", ">=2.28,<3"))
`,
        answer: src`
def parts(version):
    return [int(p) for p in version.split(".")]

def compare(a, b):
    x, y = parts(a), parts(b)
    while len(x) < len(y):
        x.append(0)
    while len(y) < len(x):
        y.append(0)
    if x < y:
        return -1
    if x > y:
        return 1
    return 0

def satisfies(version, spec):
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        if condition[:2] in [">=", "<=", "==", "!="]:
            op, other = condition[:2], condition[2:].strip()
        else:
            op, other = condition[:1], condition[1:].strip()
        result = compare(version, other)
        ok = {">=": result >= 0, "<=": result <= 0, "==": result == 0, "!=": result != 0, ">": result > 0, "<": result < 0}[op]
        if not ok:
            return False
    return True

print(satisfies("2.31.0", ">=2.28,<3"))
print(satisfies("3.0", ">=2.28,<3"))
`,
        alternatives: [
          src`
import re

def padded(a, b):
    x = [int(p) for p in a.split(".")]
    y = [int(p) for p in b.split(".")]
    size = max(len(x), len(y))
    return x + [0] * (size - len(x)), y + [0] * (size - len(y))

def satisfies(version, spec):
    for condition in spec.split(","):
        match = re.fullmatch(r"\s*(>=|<=|==|!=|>|<)\s*([\d.]+)\s*", condition)
        if match is None:
            continue
        op, other = match.groups()
        x, y = padded(version, other)
        if op == ">=" and not x >= y:
            return False
        if op == "<=" and not x <= y:
            return False
        if op == "==" and x != y:
            return False
        if op == "!=" and x == y:
            return False
        if op == ">" and not x > y:
            return False
        if op == "<" and not x < y:
            return False
    return True
`,
        ],
        wrong: [
          {
            code: src`
def satisfies(version, spec):
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        if condition[:2] in [">=", "<=", "==", "!="]:
            op, other = condition[:2], condition[2:].strip()
        else:
            op, other = condition[:1], condition[1:].strip()
        ok = {">=": version >= other, "<=": version <= other, "==": version == other, "!=": version != other, ">": version > other, "<": version < other}[op]
        if not ok:
            return False
    return True
`,
            fails: ["returns"],
            why: "versions are compared as text, so 2.10 fails `>=2.9`",
          },
          {
            code: src`
def satisfies(version, spec):
    have = [int(p) for p in version.split(".")]
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        if condition[:2] in [">=", "<=", "==", "!="]:
            op, other = condition[:2], condition[2:].strip()
        else:
            op, other = condition[:1], condition[1:].strip()
        want = [int(p) for p in other.split(".")]
        ok = {">=": have >= want, "<=": have <= want, "==": have == want, "!=": have != want, ">": have > want, "<": have < want}[op]
        if not ok:
            return False
    return True
`,
            fails: ["returns"],
            why: "without padding, `2.0.0` is not `==2.0` and `3.0` counts as newer than `3`",
          },
          {
            code: src`
def parts(version):
    numbers = [int(p) for p in version.split(".")]
    while len(numbers) < 3:
        numbers.append(0)
    return numbers

def satisfies(version, spec):
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        op, other = condition[:2], condition[2:]
        x, y = parts(version), parts(other)
        if op == ">=" and x >= y:
            return True
        if op == "<=" and x <= y:
            return True
        if op == "==" and x == y:
            return True
        if op == "!=" and x != y:
            return True
    return False
`,
            fails: ["returns"],
            why: "it returns as soon as one condition holds, so `3.0` passes `>=2.28,<3`; single-character operators aren't read either",
          },
        ],
        hints: [
          "Handle one condition at a time: split the spec at commas and strip each piece; skip empty pieces.",
          "Read a two-character operator if there is one, otherwise a one-character operator; the rest is the version to compare with.",
          "Pad both lists of numbers with zeros to the same length before comparing, and give a false answer as soon as one condition fails.",
        ],
        task: {
          checks: [
            fn("returns", "satisfies", [
              example(["2.31.0", ">=2.28,<3"], true),
              example(["3.0", ">=2.28,<3"], false),
              example(["1.5.3", ""], true),
              hiddenCase("equal after padding with zeros", ["2.0.0", "==2.0"], true),
              hiddenCase("a two-digit minor version", ["2.10", ">=2.9"], true),
              hiddenCase("an excluded version", ["2.0.1", ">=2.0,!=2.0.1"], false),
              hiddenCase("spaces around the conditions", ["1.26.4", " >= 1.26 , < 2 "], true),
              hiddenCase("strict greater-than at the boundary", ["4.0", ">4"], false),
              hiddenCase("an upper bound with fewer parts", ["2.99.99", "<3"], true),
            ], { label: "satisfies() checks every condition with numeric comparison" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Audit an environment",
        prompt: "A deploy script compares the project's requirements with what is installed (from `pip freeze`). Write `audit(requirements, installed)`: return one message per requirement that is not met, in the order of `requirements`. Package names match case-insensitively and treat `-`, `_` and `.` as the same character. `versions.py` gives you `satisfies(version, spec)` from the previous challenge.",
        spec: [
          ["Function", "`audit(requirements, installed)`"],
          ["requirements", "strings such as `\"Requests>=2.31\"`, `\"pandas>=2.2,<3\"`, `\"tomli\"` (any version)"],
          ["installed", "a dictionary from package name to version text, as pip writes them: `{\"requests\": \"2.32.3\", \"market-reports\": \"1.4.2\"}`"],
          ["Messages", "`\"requests: missing\"` or `\"pandas: 3.0.1 does not satisfy >=2.2,<3\"`, using the name as written in the requirement"],
          ["Example", "`audit([\"Requests>=2.31\", \"tomli\"], {\"requests\": \"2.30.0\"})` → `['Requests: 2.30.0 does not satisfy >=2.31', 'tomli: missing']`"],
        ],
        starter: src`
import re
from versions import satisfies

def audit(requirements, installed):
    problems = []
    return problems

print(audit(["Requests>=2.31", "tomli"], {"requests": "2.30.0"}))
`,
        answer: src`
import re
from versions import satisfies

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def audit(requirements, installed):
    have = {normalize(name): version for name, version in installed.items()}
    problems = []
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement.strip()).group()
        spec = requirement.strip()[len(name):].strip()
        version = have.get(normalize(name))
        if version is None:
            problems.append(f"{name}: missing")
        elif not satisfies(version, spec):
            problems.append(f"{name}: {version} does not satisfy {spec}")
    return problems

print(audit(["Requests>=2.31", "tomli"], {"requests": "2.30.0"}))
`,
        alternatives: [
          src`
from versions import satisfies

def audit(requirements, installed):
    def key(name):
        return name.lower().replace("_", "-").replace(".", "-")
    have = {}
    for name, version in installed.items():
        have[key(name)] = version
    problems = []
    for requirement in requirements:
        text = requirement.strip()
        cut = len(text)
        for i, ch in enumerate(text):
            if ch in "<>=!~ ":
                cut = i
                break
        name, spec = text[:cut], text[cut:].strip()
        if key(name) not in have:
            problems.append(name + ": missing")
        elif not satisfies(have[key(name)], spec):
            problems.append(name + ": " + have[key(name)] + " does not satisfy " + spec)
    return problems
`,
        ],
        wrong: [
          {
            code: src`
import re
from versions import satisfies

def audit(requirements, installed):
    problems = []
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement).group()
        spec = requirement[len(name):]
        version = installed.get(name)
        if version is None:
            problems.append(f"{name}: missing")
        elif not satisfies(version, spec):
            problems.append(f"{name}: {version} does not satisfy {spec}")
    return problems
`,
            fails: ["returns"],
            why: "names are compared exactly, so `Requests` is reported missing although `requests` is installed",
          },
          {
            code: src`
import re
from versions import satisfies

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def audit(requirements, installed):
    have = {normalize(name): version for name, version in installed.items()}
    problems = []
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement).group()
        spec = requirement[len(name):]
        version = have.get(normalize(name))
        if version is None:
            problems.append(f"{name}: missing")
        elif version < spec[2:]:
            problems.append(f"{name}: {version} does not satisfy {spec}")
    return problems
`,
            fails: ["returns"],
            why: "it compares the version text with only the first condition and ignores the upper bound",
          },
        ],
        hints: [
          "Normalise every installed name once into a new dictionary, then normalise each requirement's name the same way before looking it up.",
          "The name is the leading run of letters, digits, `.`, `_` and `-`; everything after it is the spec, which may be empty.",
          "Use `satisfies` for the version check; keep the requirement's own spelling of the name in the message.",
        ],
        task: {
          files: {
            "versions.py": src`
def _parts(version):
    return [int(p) for p in version.split(".")]

def _compare(a, b):
    x, y = _parts(a), _parts(b)
    size = max(len(x), len(y))
    x += [0] * (size - len(x))
    y += [0] * (size - len(y))
    return (x > y) - (x < y)

def satisfies(version, spec):
    """True when version meets every comma-separated condition in spec."""
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        op = condition[:2] if condition[:2] in (">=", "<=", "==", "!=") else condition[:1]
        result = _compare(version, condition[len(op):].strip())
        ok = {">=": result >= 0, "<=": result <= 0, "==": result == 0, "!=": result != 0, ">": result > 0, "<": result < 0}[op]
        if not ok:
            return False
    return True
`,
          },
          checks: [
            fn("returns", "audit", [
              example([["Requests>=2.31", "tomli"], { requests: "2.30.0" }], ["Requests: 2.30.0 does not satisfy >=2.31", "tomli: missing"]),
              example([["requests>=2.31", "pandas>=2.2,<3"], { requests: "2.32.3", pandas: "2.2.2" }], []),
              example([["pandas>=2.2,<3"], { pandas: "3.0.1" }], ["pandas: 3.0.1 does not satisfy >=2.2,<3"]),
              hiddenCase("underscores and dots in names", [["Market_Reports==1.4.2", "zope.interface>=6"], { "market-reports": "1.4.2", "zope-interface": "6.4" }], []),
              hiddenCase("an empty requirement list", [[], { requests: "2.32.3" }], []),
              hiddenCase("nothing installed", [["requests", "pandas>=2"], {}], ["requests: missing", "pandas: missing"]),
              hiddenCase("several problems kept in requirement order", [["numpy<2", "click>=8.1", "rich"], { rich: "13.7.1", click: "8.0.4", numpy: "2.1.0" }], ["numpy: 2.1.0 does not satisfy <2", "click: 8.0.4 does not satisfy >=8.1"]),
            ], { label: "audit() reports each requirement that is missing or not satisfied" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
versions = ["1.10.2", "1.9.0", "1.26.4"]
print(max(versions))
print(max(versions, key=lambda v: [int(p) for p in v.split(".")]))
`,
        choices: ["1.9.0\n1.26.4", "1.26.4\n1.26.4", "1.9.0\n1.9.0", "1.10.2\n1.26.4"],
        answer: 0,
        why: "As text, `max` compares character by character, and `9` beats `2` and `1` at the third character. With numbers as the key, 26 is the largest minor version.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a requirements file says `numpy>=1.26,<2`. Version 2.1.0 is installed. A script only checks the first condition. What does it report?",
        program: src`
def first_condition_ok(version, spec):
    minimum = spec.split(",")[0][2:]
    return [int(p) for p in version.split(".")] >= [int(p) for p in minimum.split(".")]

print(first_condition_ok("2.1.0", ">=1.26,<2"))
`,
        choices: ["True", "False", "ValueError", "None"],
        answer: 0,
        why: "2.1.0 is at least 1.26, so the first condition passes, and the `<2` that excludes it is never looked at. Every condition in the comma list must hold.",
      },
      {
        id: "q3",
        prompt: "Which tells you exactly which versions are installed in the current environment, so another machine can rebuild it?",
        choices: [
          "`python -m pip freeze`, which prints `name==version` for every installed package",
          "The `dependencies` array in `pyproject.toml`",
          "`pyvenv.cfg`",
          "`sys.base_prefix`",
        ],
        answer: 0,
        why: "`dependencies` says which versions are acceptable (`>=2.2,<3`); `pip freeze` records what was actually installed. Projects often keep both: ranges for users of the package, an exact list for deployment.",
      },
    ],
    review: [
      "A requirement is a name, optional extras, specifiers that must all hold, and an optional marker.",
      "Compare versions as numbers, part by part, padding with zeros; never as text.",
      "`importlib.metadata.version(name)` reads what pip installed and raises `PackageNotFoundError` when it isn't there.",
      "Next: storing data in a database with SQLite.",
    ],
  },

  // ------------------------------------------------------------------ PY-L30-04 SQLite
  {
    id: "PY-L30-04",
    version: 2,
    slug: "sqlite-queries",
    title: "SQLite: store and query rows",
    lede: "sqlite3 comes with Python: a whole SQL database in one file, or in memory. You create tables, insert rows and ask questions with SELECT, passing values through ? placeholders.",
    focus: "Create a table, insert rows and query them with sqlite3, always passing values through ? placeholders.",
    minutes: 22,
    objectives: [
      "Open a database with `sqlite3.connect`, create a table and insert rows with `executemany`",
      "Query with `execute(...).fetchall()` / `fetchone()`, including JOIN and GROUP BY",
      "Pass values with `?` placeholders and explain why building SQL text from data breaks",
    ],
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "continue-statement", "conversion", "csv-read", "dict-lookup", "else-clause", "exc-name", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-sort", "membership", "print-call", "print-several", "print-text", "string-format", "string-index", "string-slice", "top-level-indent", "try-except", "tuple-literal", "type-call"],
    teaches: ["sqlite-call", "sql-param"],
    blocks: [
      {
        kind: "text",
        md: "A list of dictionaries is fine for a few hundred rows that live as long as the program. When data must outlive the program, be searched in different ways, or be shared, use a **database**. SQLite is a complete SQL database in a single file, and the `sqlite3` module is part of Python.\n\n`sqlite3.connect(\"shop.db\")` opens (or creates) a database file; `\":memory:\"` makes a database that lives only while the program runs. `conn.execute(sql, values)` runs one statement and returns a **cursor**; `fetchall()` on it gives the result rows as a list of tuples, `fetchone()` the next row (or `None`). `executemany` runs the same statement once per row of data.",
      },
      {
        kind: "example",
        title: "Create, insert, select",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
rows = [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 0),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7),
    ("ELE-24781", "Organic Speaker", "electronics", 171.99, 4),
    ("SPO-65611", "Studio Tent", "sports", 45.0, 0),
]
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", rows)

cursor = conn.execute("SELECT sku, price FROM products WHERE category = ? ORDER BY price DESC", ("sports",))
print(cursor.fetchall())
print(conn.execute("SELECT COUNT(*) FROM products WHERE stock = 0").fetchone())
`,
        output: "[('SPO-61044', 50.99), ('SPO-65611', 45.0), ('SPO-11681', 7.49)]\n(2,)\n",
        note: "Each `?` is filled from the tuple of values, in order. `(\"sports\",)` is a one-item tuple: the comma makes it a tuple. `fetchone()` returns one row, and a row is always a tuple, even with one column.",
      },
      {
        kind: "text",
        md: "Why not write the value straight into the SQL with an f-string? Because data is not code. A customer's name containing a quote ends the SQL string early:",
      },
      {
        kind: "error-example",
        title: "Building SQL from data",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT, last_name TEXT)")
conn.execute("INSERT INTO customers VALUES (?, ?)", ("C00412", "O'Brien"))

last_name = "O'Brien"
query = f"SELECT customer_id FROM customers WHERE last_name = '{last_name}'"
print(conn.execute(query).fetchall())
`,
        error: "OperationalError",
        output: "",
        note: "`sqlite3.OperationalError: near \"Brien\": syntax error`. Worse, a value typed as `x' OR '1'='1` would turn the condition into one that matches every row: **SQL injection**. With `WHERE last_name = ?` and `(last_name,)` the value never becomes part of the SQL, whatever characters it holds.",
      },
      {
        kind: "text",
        md: "Queries are where a database earns its keep. A JOIN matches rows of two tables on a shared key; GROUP BY collects one result row per group, with COUNT, SUM or AVG over each group. A function that takes the connection as a parameter can run against any database: the real file, or a small one built for a test.",
      },
      {
        kind: "example",
        title: "Revenue per state, with a join",
        code: src`
import sqlite3

def revenue_by_state(conn, status):
    sql = """
        SELECT customers.state, COUNT(*), ROUND(SUM(orders.total), 2)
        FROM orders JOIN customers ON customers.customer_id = orders.customer_id
        WHERE orders.status = ?
        GROUP BY customers.state
        ORDER BY 3 DESC
    """
    return conn.execute(sql, (status,)).fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT PRIMARY KEY, state TEXT)")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT, status TEXT, total REAL)")
conn.executemany("INSERT INTO customers VALUES (?, ?)", [("C00038", "NY"), ("C00065", "CA"), ("C00077", "TX"), ("C01338", "NY")])
conn.executemany("INSERT INTO orders VALUES (?, ?, ?, ?)", [
    ("O100282", "C00077", "delivered", 35.84),
    ("O100376", "C00065", "returned", 91.47),
    ("O100918", "C01338", "returned", 55.72),
    ("O101219", "C00077", "delivered", 246.6),
    ("O101341", "C00038", "delivered", 46.41),
    ("O101723", "C01338", "delivered", 54.55),
])
print(revenue_by_state(conn, "delivered"))
print(revenue_by_state(conn, "returned"))
`,
        output: "[('TX', 2, 282.44), ('NY', 2, 100.96)]\n[('CA', 1, 91.47), ('NY', 1, 55.72)]\n",
        note: "The database does the grouping and adding that the Collection Algorithms module did with dictionaries. `ROUND(…, 2)` rounds in SQL; `ORDER BY 3` sorts by the third result column.",
      },
      {
        kind: "text",
        md: "**When to use it:** data that must be kept, searched by different fields, or joined; reports over many rows. **Mistakes to avoid:** f-strings or `+` to put values into SQL (use `?`); `(\"toys\")` instead of `(\"toys\",)` for a single value (without the comma it's just text in brackets); and forgetting that every row comes back as a tuple.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only one category",
      prompt: "`products_in` returns every product. Add a `WHERE` condition so it returns only the products in the given category, passing the category through a `?` placeholder.",
      spec: [
        ["Function", "`products_in(conn, category)`"],
        ["Returns", "`[(sku, name), …]` for that category, ordered by sku"],
      ],
      starter: src`
import sqlite3

def products_in(conn, category):
    return conn.execute("SELECT sku, name FROM products ORDER BY sku").fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 0),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7),
])
print(products_in(conn, "sports"))
`,
      answer: src`
import sqlite3

def products_in(conn, category):
    return conn.execute("SELECT sku, name FROM products WHERE category = ? ORDER BY sku", (category,)).fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 0),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7),
])
print(products_in(conn, "sports"))
`,
      wrong: [
        {
          code: src`
def products_in(conn, category):
    return conn.execute(f"SELECT sku, name FROM products WHERE category = '{category}' ORDER BY sku").fetchall()
`,
          fails: ["quote"],
          why: "the f-string works until a category contains a quote, then the SQL breaks",
        },
      ],
      hints: ["The SQL needs a condition between `FROM products` and `ORDER BY`.", "Write `category = ?` in the SQL instead of the value itself.", "Give `execute` a second argument: a one-item tuple holding the category (mind the comma)."],
      task: {
        checks: [
          sqlCheck("returns", "products_in() returns the sports products", memoryDb([{ ...PRODUCTS, rows: productRows }]), "products_in(_conn, 'sports')", rowsOf([["SPO-11681", "Ultra Bike Light"], ["SPO-61044", "Travel Yoga Mat"], ["SPO-65611", "Studio Tent"]]), { show: "products_in(conn, 'sports')" }),
          sqlCheck("quote", "products_in() works for a category with a quote in it", memoryDb([{ ...PRODUCTS, rows: tieRows }]), "products_in(_conn, \"kids' toys\")", rowsOf([["KID-00118", "Kite"], ["KID-00412", "Puzzle Cube"], ["KID-00733", "Yo-yo"], ["KID-00950", "Chalk Set"]]), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Cheapest products in stock",
        prompt: "The shop's \"budget picks\" box shows the cheapest products of a category that are actually in stock. Write `cheapest_in_stock(conn, category, limit)`: return at most `limit` products of that category with `stock > 0`, cheapest first; products with the same price are ordered by sku.",
        spec: [
          ["Function", "`cheapest_in_stock(conn, category, limit)`"],
          ["Table", "`products (sku, name, category, price, stock)`"],
          ["Returns", "a list of `(sku, price)` tuples, cheapest first, ties by sku; `[]` when nothing matches"],
          ["Example", "the starter's products, `\"sports\"`, limit 2 → `[('SPO-11681', 7.49), ('SPO-61044', 50.99)]`"],
        ],
        starter: src`
import sqlite3

def cheapest_in_stock(conn, category, limit):
    return []

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7),
    ("SPO-65611", "Studio Tent", "sports", 45.0, 0),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 0),
])
print(cheapest_in_stock(conn, "sports", 2))
`,
        answer: src`
import sqlite3

def cheapest_in_stock(conn, category, limit):
    sql = """
        SELECT sku, price FROM products
        WHERE category = ? AND stock > 0
        ORDER BY price, sku
        LIMIT ?
    """
    return conn.execute(sql, (category, limit)).fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 7),
    ("SPO-65611", "Studio Tent", "sports", 45.0, 0),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 0),
])
print(cheapest_in_stock(conn, "sports", 2))
`,
        alternatives: [
          src`
def cheapest_in_stock(conn, category, limit):
    rows = conn.execute("SELECT sku, price, stock FROM products WHERE category = ?", (category,)).fetchall()
    in_stock = [(sku, price) for sku, price, stock in rows if stock > 0]
    in_stock.sort(key=lambda row: (row[1], row[0]))
    return in_stock[:limit]
`,
        ],
        wrong: [
          {
            code: src`
def cheapest_in_stock(conn, category, limit):
    sql = f"SELECT sku, price FROM products WHERE category = '{category}' AND stock > 0 ORDER BY price, sku LIMIT {limit}"
    return conn.execute(sql).fetchall()
`,
            fails: ["quote"],
            why: "the values are pasted into the SQL, which breaks on a category with a quote in it",
          },
          {
            code: src`
def cheapest_in_stock(conn, category, limit):
    sql = "SELECT sku, price FROM products WHERE category = ? ORDER BY price, sku LIMIT ?"
    return conn.execute(sql, (category, limit)).fetchall()
`,
            fails: ["returns", "quote", "none"],
            why: "products with no stock are offered too",
          },
          {
            code: src`
def cheapest_in_stock(conn, category, limit):
    sql = "SELECT sku, price FROM products WHERE category = ? AND stock > 0 ORDER BY price DESC, sku LIMIT ?"
    return conn.execute(sql, (category, limit)).fetchall()
`,
            fails: ["returns", "electronics", "ties", "quote"],
            why: "`DESC` puts the most expensive products first",
          },
        ],
        hints: [
          "Everything can happen in one SELECT: a WHERE with two conditions, an ORDER BY and a LIMIT.",
          "ORDER BY can take two columns: the price first, then the sku, which only matters when prices are equal.",
          "The limit is a value too, so it can be a `?` placeholder like the category; pass both in one tuple.",
        ],
        task: {
          checks: [
            sqlCheck("returns", "cheapest_in_stock() returns the cheapest sports products in stock", memoryDb([{ ...PRODUCTS, rows: productRows }]), "cheapest_in_stock(_conn, 'sports', 2)", rowsOf([["SPO-11681", 7.49], ["SPO-61044", 50.99]]), { show: "cheapest_in_stock(conn, 'sports', 2)" }),
            sqlCheck("electronics", "cheapest_in_stock() with a limit larger than the matches", memoryDb([{ ...PRODUCTS, rows: productRows }]), "cheapest_in_stock(_conn, 'electronics', 5)", rowsOf([["ELE-01243", 80.99], ["ELE-24781", 171.99]]), { show: "cheapest_in_stock(conn, 'electronics', 5)" }),
            sqlCheck("ties", "products with the same price are ordered by sku", memoryDb([{ ...PRODUCTS, rows: [["B-2", "b", "toys", 5, 1], ["C-3", "c", "toys", 5, 1], ["A-1", "a", "toys", 5, 1], ["D-4", "d", "toys", 9, 1]] }]), "cheapest_in_stock(_conn, 'toys', 3)", rowsOf([["A-1", py.float(5)], ["B-2", py.float(5)], ["C-3", py.float(5)]]), { hidden: true }),
            sqlCheck("quote", "a category with a quote in its name", memoryDb([{ ...PRODUCTS, rows: tieRows }]), "cheapest_in_stock(_conn, \"kids' toys\", 2)", rowsOf([["KID-00118", 9.5], ["KID-00412", 9.5]]), { hidden: true }),
            sqlCheck("none", "a category where nothing is in stock", memoryDb([{ ...PRODUCTS, rows: productRows }]), "cheapest_in_stock(_conn, 'home', 3)", rowsOf([]), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Import a payments export",
        prompt: "Payments arrive as CSV text from the payment provider. Write `import_payments(conn, csv_text)`: insert each row into the `payments` table with `amount` as a number, and return `(inserted, skipped)`. Skip a row whose amount isn't a number, and a row whose `payment_id` is already in the table (the primary key makes `INSERT` raise `sqlite3.IntegrityError`).",
        spec: [
          ["Function", "`import_payments(conn, csv_text)`"],
          ["Table", "`payments (payment_id TEXT PRIMARY KEY, order_id TEXT, method TEXT, amount REAL)`, already created"],
          ["csv_text", "a header line `payment_id,order_id,method,amount`, then one payment per line"],
          ["Returns", "a tuple `(inserted, skipped)`"],
          ["Example", "the starter's export → `(2, 2)`: one bad amount and one repeated payment"],
        ],
        starter: src`
import csv
import io
import sqlite3

def import_payments(conn, csv_text):
    return (0, 0)

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE payments (payment_id TEXT PRIMARY KEY, order_id TEXT, method TEXT, amount REAL)")
export = """payment_id,order_id,method,amount
PAY0000313,O100282,card,35.84
PAY0000416,O100376,gift_card,n/a
PAY0001023,O100918,card,55.72
PAY0000313,O100282,card,35.84
"""
print(import_payments(conn, export))
print(conn.execute("SELECT * FROM payments ORDER BY payment_id").fetchall())
`,
        answer: src`
import csv
import io
import sqlite3

def import_payments(conn, csv_text):
    inserted = 0
    skipped = 0
    for row in csv.DictReader(io.StringIO(csv_text)):
        try:
            amount = float(row["amount"])
            conn.execute(
                "INSERT INTO payments VALUES (?, ?, ?, ?)",
                (row["payment_id"], row["order_id"], row["method"], amount),
            )
        except (ValueError, sqlite3.IntegrityError):
            skipped += 1
        else:
            inserted += 1
    return (inserted, skipped)

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE payments (payment_id TEXT PRIMARY KEY, order_id TEXT, method TEXT, amount REAL)")
export = """payment_id,order_id,method,amount
PAY0000313,O100282,card,35.84
PAY0000416,O100376,gift_card,n/a
PAY0001023,O100918,card,55.72
PAY0000313,O100282,card,35.84
"""
print(import_payments(conn, export))
print(conn.execute("SELECT * FROM payments ORDER BY payment_id").fetchall())
`,
        alternatives: [
          src`
import csv
import io
import sqlite3

def import_payments(conn, csv_text):
    counts = [0, 0]
    for row in csv.DictReader(io.StringIO(csv_text)):
        try:
            values = (row["payment_id"], row["order_id"], row["method"], float(row["amount"]))
        except ValueError:
            counts[1] += 1
            continue
        try:
            conn.execute("INSERT INTO payments (payment_id, order_id, method, amount) VALUES (?, ?, ?, ?)", values)
            counts[0] += 1
        except sqlite3.IntegrityError:
            counts[1] += 1
    return (counts[0], counts[1])
`,
        ],
        wrong: [
          {
            code: src`
import csv
import io
import sqlite3

def import_payments(conn, csv_text):
    inserted = 0
    skipped = 0
    for row in csv.DictReader(io.StringIO(csv_text)):
        try:
            conn.execute("INSERT INTO payments VALUES (?, ?, ?, ?)", (row["payment_id"], row["order_id"], row["method"], row["amount"]))
            inserted += 1
        except sqlite3.IntegrityError:
            skipped += 1
    return (inserted, skipped)
`,
            fails: ["returns", "stored", "messy"],
            why: "the amount is stored as text, so `n/a` goes into the table instead of being skipped",
          },
          {
            code: src`
import csv
import io
import sqlite3

def import_payments(conn, csv_text):
    inserted = 0
    skipped = 0
    for row in csv.DictReader(io.StringIO(csv_text)):
        try:
            amount = float(row["amount"])
        except ValueError:
            skipped += 1
            continue
        conn.execute("INSERT INTO payments VALUES (?, ?, ?, ?)", (row["payment_id"], row["order_id"], row["method"], amount))
        inserted += 1
    return (inserted, skipped)
`,
            fails: ["returns", "stored", "existing"],
            why: "a repeated payment_id raises IntegrityError, which isn't handled, so the import stops",
          },
        ],
        hints: [
          "`csv.DictReader(io.StringIO(text))` gives one dictionary per line, as in the CSV JSON & JSONL module.",
          "Two different things can go wrong with a row: `float` raises ValueError, and the INSERT raises `sqlite3.IntegrityError` for a repeated key.",
          "Count a row as inserted only when the INSERT ran without an error; `try`/`except`/`else` keeps the two counts apart.",
        ],
        task: {
          checks: [
            sqlCheck("returns", "import_payments() counts inserted and skipped rows", memoryDb([PAYMENTS]), `import_payments(_conn, ${pyLit("payment_id,order_id,method,amount\nPAY0000313,O100282,card,35.84\nPAY0000416,O100376,gift_card,n/a\nPAY0001023,O100918,card,55.72\nPAY0000313,O100282,card,35.84\n")})`, py.tuple(py.int(2), py.int(2)), { show: "import_payments(conn, export)" }),
            sqlCheck("stored", "the valid payments are in the table, amounts as numbers", memoryDb([PAYMENTS]) + `\nimport_payments(_conn, ${pyLit("payment_id,order_id,method,amount\nPAY0000313,O100282,card,35.84\nPAY0000416,O100376,gift_card,n/a\nPAY0001023,O100918,card,55.72\nPAY0000313,O100282,card,35.84\n")})`, "_conn.execute('SELECT * FROM payments ORDER BY payment_id').fetchall()", rowsOf([["PAY0000313", "O100282", "card", 35.84], ["PAY0001023", "O100918", "card", 55.72]]), { show: "SELECT * FROM payments" }),
            sqlCheck("existing", "a payment already in the table before the import", memoryDb([{ ...PAYMENTS, insert: "INSERT INTO payments VALUES (?, ?, ?, ?)", rows: [["PAY0001503", "O101341", "card", 46.41]] }]), `import_payments(_conn, ${pyLit("payment_id,order_id,method,amount\nPAY0001503,O101341,card,46.41\nPAY0001504,O101341,paypal,-46.41\n")})`, py.tuple(py.int(1), py.int(1)), { hidden: true }),
            sqlCheck("empty", "an export with only the header", memoryDb([PAYMENTS]), `import_payments(_conn, ${pyLit("payment_id,order_id,method,amount\n")})`, py.tuple(py.int(0), py.int(0)), { hidden: true }),
            sqlCheck("messy", "amounts with spaces and an empty amount", memoryDb([PAYMENTS]) + `\n_n = import_payments(_conn, ${pyLit("payment_id,order_id,method,amount\nPAY0002001,O102603,card, 12.50\nPAY0002002,O102603,card,\n")})`, "(_n, _conn.execute('SELECT amount FROM payments').fetchall())", py.tuple(py.tuple(py.int(1), py.int(1)), rowsOf([[12.5]])), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE sales (city TEXT, total REAL)")
conn.executemany("INSERT INTO sales VALUES (?, ?)", [("Houston", 35.5), ("Denver", 20.0), ("Houston", 10.25)])
print(conn.execute("SELECT city, SUM(total) FROM sales GROUP BY city ORDER BY city").fetchall())
`,
        choices: [
          "[('Denver', 20.0), ('Houston', 45.75)]",
          "[('Houston', 45.75), ('Denver', 20.0)]",
          "[('Denver', 20.0), ('Houston', 35.5), ('Houston', 10.25)]",
          "{'Denver': 20.0, 'Houston': 45.75}",
        ],
        answer: 0,
        why: "GROUP BY makes one row per city with the SUM of its totals, ORDER BY city sorts them alphabetically, and every row is a tuple inside the list.",
      },
      {
        id: "q2",
        prompt: "A common mistake with a single placeholder. What does this print?",
        program: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT, category TEXT)")
try:
    conn.execute("SELECT sku FROM products WHERE category = ?", ("toys"))
    print("ok")
except sqlite3.ProgrammingError as err:
    print(type(err).__name__)
`,
        choices: ["ProgrammingError", "ok", "OperationalError", "TypeError"],
        answer: 0,
        why: "`(\"toys\")` is just the text `\"toys\"` in brackets. sqlite3 treats a text as a sequence of 4 characters and complains: *The current statement uses 1, and there are 4 supplied.* Write `(\"toys\",)`.",
      },
      {
        id: "q3",
        prompt: "Why pass a customer's name to SQLite with `WHERE last_name = ?` instead of an f-string?",
        choices: [
          "The value never becomes part of the SQL, so quotes in it can't break the statement or change what it does",
          "Placeholders make the query run faster on every database",
          "f-strings can't contain the word SELECT",
          "SQLite only accepts text through placeholders",
        ],
        answer: 0,
        why: "With a placeholder the database receives the SQL and the value separately. That prevents both the syntax error from `O'Brien` and SQL injection.",
      },
    ],
    review: [
      "`sqlite3.connect(path or \":memory:\")`, `execute`, `executemany`, then `fetchall()` / `fetchone()`: rows are tuples.",
      "Values always go through `?` placeholders, in a tuple: `(value,)` for one.",
      "JOIN, GROUP BY, ORDER BY and LIMIT let the database answer the question instead of a Python loop.",
      "Next: what happens to your changes when the program stops, and how transactions keep related changes together.",
    ],
  },

  // ------------------------------------------------------------------ PY-L30-05 transactions
  {
    id: "PY-L30-05",
    version: 2,
    slug: "commit-or-roll-back",
    title: "Transactions: commit or roll back together",
    lede: "Changes to a database are kept only when they are committed. A transaction groups related changes so they are all kept or all undone, which is what stops half an order from being saved.",
    focus: "Group related writes into one transaction, commit them together, and roll them back when any part fails.",
    minutes: 22,
    objectives: [
      "Explain what `commit` and `rollback` do, and when other connections see a change",
      "Use `with conn:` to commit on success and roll back on an exception",
      "Decide which writes must succeed or fail together",
    ],
    requires: ["arithmetic", "assignment", "comparison", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "membership", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "sql-param", "sqlite-call", "string-format", "string-index", "string-slice", "top-level-indent", "try-except", "with-statement"],
    teaches: ["sql-tx"],
    blocks: [
      {
        kind: "text",
        md: "Placing an order means several writes: insert the order, insert each line, take each line's quantity off the stock. If the program fails after the second write, the database holds half an order: stock taken for an order that doesn't exist.\n\nA **transaction** groups writes. With the `sqlite3` module's default settings, the first INSERT, UPDATE or DELETE starts one. Until you call `conn.commit()`, the changes are visible only through your own connection; `commit()` makes them permanent and visible to everyone. `conn.rollback()` undoes every change since the last commit. Closing a connection without committing throws the changes away. `execute` returns a cursor whose `rowcount` says how many rows an UPDATE or DELETE changed.",
      },
      {
        kind: "example",
        title: "Who sees a change, and when",
        code: src`
import sqlite3

writer = sqlite3.connect("shop.db")
writer.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)")
writer.execute("INSERT INTO stock VALUES ('SPO-11681', 12)")
writer.commit()

reader = sqlite3.connect("shop.db")
changed = writer.execute("UPDATE stock SET units = units - 5 WHERE sku = 'SPO-11681'").rowcount
print("rows changed:", changed)
print("reader before commit:", reader.execute("SELECT units FROM stock").fetchone())
writer.commit()
print("reader after commit:", reader.execute("SELECT units FROM stock").fetchone())

writer.execute("UPDATE stock SET units = 0 WHERE sku = 'SPO-11681'")
writer.rollback()
print("after rollback:", writer.execute("SELECT units FROM stock").fetchone())
`,
        output: "rows changed: 1\nreader before commit: (12,)\nreader after commit: (7,)\nafter rollback: (7,)\n",
        note: "Two connections to the same file behave like two programs. The reader saw 12 until the writer committed. The rollback undid the update to 0, back to the last committed value.",
      },
      {
        kind: "text",
        md: "Writing `commit()` and `rollback()` around every group of writes is easy to get wrong. A connection is also a context manager: **`with conn:`** commits when the block finishes normally and rolls back when an exception leaves it (the exception still propagates, and the connection stays open). A `CHECK` constraint in the table lets the database itself refuse a bad value with `sqlite3.IntegrityError`.",
      },
      {
        kind: "example",
        title: "An order is saved whole or not at all",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER CHECK (units >= 0))")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY)")
conn.execute("CREATE TABLE order_lines (order_id TEXT, sku TEXT, quantity INTEGER)")
conn.executemany("INSERT INTO stock VALUES (?, ?)", [("SPO-11681", 12), ("TOY-54564", 2)])
conn.commit()

def place_order(conn, order_id, lines):
    with conn:
        conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
        for sku, quantity in lines:
            conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
            conn.execute("UPDATE stock SET units = units - ? WHERE sku = ?", (quantity, sku))

place_order(conn, "O200001", [("SPO-11681", 3), ("TOY-54564", 1)])
try:
    place_order(conn, "O200002", [("SPO-11681", 4), ("TOY-54564", 5)])
except sqlite3.IntegrityError as err:
    print("refused:", err)
print(conn.execute("SELECT * FROM stock ORDER BY sku").fetchall())
print(conn.execute("SELECT COUNT(*) FROM order_lines").fetchone()[0], "order lines saved")
`,
        output: "refused: CHECK constraint failed: units >= 0\n[('SPO-11681', 9), ('TOY-54564', 1)]\n2 order lines saved\n",
        note: "The second order failed on its last UPDATE (1 − 5 would be −4). `with conn:` rolled back everything that order had done, including its order row, its first line and the 4 bike lights. Only the first order's two lines remain.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever several writes only make sense together (an order and its stock, a payment and the order's paid amount, a transfer between two accounts). Keep a transaction short: do the slow work, such as reading files or calling an API, before it starts. **Mistakes to avoid:** forgetting to commit (another connection, or the next run, never sees the change); committing inside a loop of writes that belong together; and catching an exception inside `with conn:` and carrying on, which commits a half-finished change.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Restock that sticks",
      prompt: "`restock` adds units to the stock, but nothing it does survives: it never commits. Make it commit all the changes together, for example with a `with conn:` block. The check opens a second connection to the same file to see what was saved.",
      spec: [
        ["Function", "`restock(conn, changes)`"],
        ["changes", "a list of `(sku, units_to_add)` tuples"],
        ["Result", "the new stock levels are committed, so another connection sees them"],
      ],
      starter: src`
import sqlite3

def restock(conn, changes):
    for sku, units in changes:
        conn.execute("UPDATE stock SET units = units + ? WHERE sku = ?", (units, sku))

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)")
conn.execute("INSERT INTO stock VALUES ('SPO-65611', 0)")
conn.commit()
restock(conn, [("SPO-65611", 8)])
other = sqlite3.connect("shop.db")
print(other.execute("SELECT * FROM stock").fetchall())
`,
      answer: src`
import sqlite3

def restock(conn, changes):
    with conn:
        for sku, units in changes:
            conn.execute("UPDATE stock SET units = units + ? WHERE sku = ?", (units, sku))

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)")
conn.execute("INSERT INTO stock VALUES ('SPO-65611', 0)")
conn.commit()
restock(conn, [("SPO-65611", 8)])
other = sqlite3.connect("shop.db")
print(other.execute("SELECT * FROM stock").fetchall())
`,
      alternatives: [
        src`
import sqlite3

def restock(conn, changes):
    for sku, units in changes:
        conn.execute("UPDATE stock SET units = units + ? WHERE sku = ?", (units, sku))
    conn.commit()
`,
      ],
      wrong: [
        {
          code: src`
import sqlite3

def restock(conn, changes):
    for sku, units in changes:
        conn.execute("UPDATE stock SET units = units + ? WHERE sku = ?", (units, sku))
    conn.rollback()
`,
          fails: ["saved"],
          why: "`rollback` throws the changes away instead of keeping them",
        },
      ],
      hints: ["The updates are right; they are just never made permanent.", "One `commit` after all the updates, or a `with conn:` block around them, keeps them.", "Put the loop inside `with conn:` so the block commits when it finishes."],
      task: {
        checks: [
          sqlCheck("saved", "another connection sees the restocked units", STOCK_FILE("try.db", [["SPO-65611", 0], ["HOM-22847", 3]]) + "\nrestock(_conn, [('SPO-65611', 8), ('HOM-22847', 2)])", readBack("try.db", "SELECT * FROM stock ORDER BY sku"), rowsOf([["HOM-22847", 5], ["SPO-65611", 8]]), { show: "restock(conn, [('SPO-65611', 8), ('HOM-22847', 2)])" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Record a payment",
        prompt: "Write `record_payment(conn, order_id, amount)`: insert a row into `payments` and add the amount to that order's `paid` column, as one transaction. If no order has that ID, raise `ValueError` and leave the database exactly as it was: no payment row either. Return the order's new `paid` value.",
        spec: [
          ["Function", "`record_payment(conn, order_id, amount)`"],
          ["Tables", "`orders (order_id, total, paid)`, `payments (order_id, amount)`"],
          ["Returns", "the order's `paid` after the payment, e.g. 35.84"],
          ["Raises", "`ValueError` for an unknown order; nothing is saved"],
          ["Tip", "`execute(...).rowcount` is the number of rows an UPDATE changed"],
        ],
        starter: src`
import sqlite3

def record_payment(conn, order_id, amount):
    return 0

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL, paid REAL)")
conn.execute("CREATE TABLE payments (order_id TEXT, amount REAL)")
conn.execute("INSERT INTO orders VALUES ('O100282', 35.84, 0)")
conn.commit()
print(record_payment(conn, "O100282", 35.84))
`,
        answer: src`
import sqlite3

def record_payment(conn, order_id, amount):
    with conn:
        conn.execute("INSERT INTO payments VALUES (?, ?)", (order_id, amount))
        changed = conn.execute("UPDATE orders SET paid = paid + ? WHERE order_id = ?", (amount, order_id)).rowcount
        if changed == 0:
            raise ValueError(f"unknown order: {order_id}")
    return conn.execute("SELECT paid FROM orders WHERE order_id = ?", (order_id,)).fetchone()[0]

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, total REAL, paid REAL)")
conn.execute("CREATE TABLE payments (order_id TEXT, amount REAL)")
conn.execute("INSERT INTO orders VALUES ('O100282', 35.84, 0)")
conn.commit()
print(record_payment(conn, "O100282", 35.84))
`,
        alternatives: [
          src`
import sqlite3

def record_payment(conn, order_id, amount):
    row = conn.execute("SELECT paid FROM orders WHERE order_id = ?", (order_id,)).fetchone()
    if row is None:
        raise ValueError("no such order")
    try:
        conn.execute("UPDATE orders SET paid = ? WHERE order_id = ?", (row[0] + amount, order_id))
        conn.execute("INSERT INTO payments (order_id, amount) VALUES (?, ?)", (order_id, amount))
        conn.commit()
    except sqlite3.Error:
        conn.rollback()
        raise
    return row[0] + amount
`,
        ],
        wrong: [
          {
            code: src`
import sqlite3

def record_payment(conn, order_id, amount):
    conn.execute("INSERT INTO payments VALUES (?, ?)", (order_id, amount))
    conn.commit()
    changed = conn.execute("UPDATE orders SET paid = paid + ? WHERE order_id = ?", (amount, order_id)).rowcount
    if changed == 0:
        raise ValueError("unknown order")
    conn.commit()
    return conn.execute("SELECT paid FROM orders WHERE order_id = ?", (order_id,)).fetchone()[0]
`,
            fails: ["nothing-saved"],
            why: "the payment is committed before the order is checked, so a payment for an unknown order stays in the table",
          },
          {
            code: src`
import sqlite3

def record_payment(conn, order_id, amount):
    conn.execute("INSERT INTO payments VALUES (?, ?)", (order_id, amount))
    changed = conn.execute("UPDATE orders SET paid = paid + ? WHERE order_id = ?", (amount, order_id)).rowcount
    if changed == 0:
        raise ValueError("unknown order")
    return conn.execute("SELECT paid FROM orders WHERE order_id = ?", (order_id,)).fetchone()[0]
`,
            fails: ["committed", "nothing-saved"],
            why: "nothing is committed, so the payment disappears as soon as the connection closes, and a failed call leaves its payment pending",
          },
          {
            code: src`
import sqlite3

def record_payment(conn, order_id, amount):
    with conn:
        conn.execute("INSERT INTO payments VALUES (?, ?)", (order_id, amount))
        conn.execute("UPDATE orders SET paid = paid + ? WHERE order_id = ?", (amount, order_id))
    return conn.execute("SELECT paid FROM orders WHERE order_id = ?", (order_id,)).fetchone()[0]
`,
            fails: ["unknown", "nothing-saved"],
            why: "an unknown order changes no rows but nobody notices: the payment is saved and the lookup crashes",
          },
        ],
        hints: [
          "Both writes belong to one transaction, so put them in one `with conn:` block.",
          "An UPDATE that matches no order changes 0 rows; `rowcount` tells you that.",
          "Raise the ValueError *inside* the `with` block: the exception leaving the block is what makes it roll back the payment you inserted.",
        ],
        task: {
          checks: [
            sqlCheck("returns", "record_payment() returns the order's new paid amount", PAYMENT_DB("a.db"), "record_payment(_conn, 'O101219', 146.6)", 246.6, { show: "record_payment(conn, 'O101219', 146.6)" }),
            sqlCheck("committed", "the payment and the order's paid amount are committed", PAYMENT_DB("b.db") + "\nrecord_payment(_conn, 'O100282', 35.84)", `(${readBack("b.db", "SELECT * FROM payments")}, ${readBack("b.db", "SELECT paid FROM orders WHERE order_id = 'O100282'")})`, py.tuple(rowsOf([["O100282", 35.84]]), rowsOf([[35.84]])), { show: "record_payment(conn, 'O100282', 35.84), then a second connection reads both tables" }),
            sqlCheck("unknown", "an unknown order raises ValueError", PAYMENT_DB("c.db"), "record_payment(_conn, 'O999999', 10.0)", null, { raises: "ValueError", show: "record_payment(conn, 'O999999', 10.0)" }),
            sqlCheck("nothing-saved", "after an unknown order, no payment row was saved", PAYMENT_DB("d.db") + "\ntry:\n    record_payment(_conn, 'O999999', 10.0)\nexcept Exception:\n    pass", `(${readBack("d.db", "SELECT COUNT(*) FROM payments")}, _conn.execute('SELECT COUNT(*) FROM payments').fetchall())`, py.tuple(rowsOf([[0]]), rowsOf([[0]])), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Load readings in batches",
        prompt: "A weather import loads thousands of daily readings. One transaction for the whole file means one bad row loses everything; one commit per row is slow. Write `load_readings(conn, rows, batch_size)`: insert the rows, committing after every `batch_size` rows and once more at the end. When a row is rejected by the table (`sqlite3.IntegrityError`), roll back the current unfinished batch, stop, and return how many rows were committed.",
        spec: [
          ["Function", "`load_readings(conn, rows, batch_size)`"],
          ["Table", "`readings (station_id, day, tmax_c)` with `CHECK (tmax_c BETWEEN -90 AND 60)`"],
          ["rows", "a list of `(station_id, day, tmax_c)` tuples (lists are fine too)"],
          ["Returns", "the number of rows committed"],
          ["Example", "5 good rows, batch size 2 → 5. Rows 1–3 good, row 4 at 99.9 °C, batch size 2 → 2: rows 1–2 were committed, row 3 was in the unfinished batch and is rolled back"],
        ],
        starter: src`
import sqlite3

def load_readings(conn, rows, batch_size):
    return 0

conn = sqlite3.connect("weather.db")
conn.execute("CREATE TABLE readings (station_id TEXT, day TEXT, tmax_c REAL CHECK (tmax_c BETWEEN -90 AND 60))")
rows = [
    ("USW00094846", "2024-07-01", 31.7),
    ("USW00094846", "2024-07-02", 33.9),
    ("USW00094846", "2024-07-03", 30.6),
    ("USW00094846", "2024-07-04", 99.9),
]
print(load_readings(conn, rows, 2))
`,
        answer: src`
import sqlite3

def load_readings(conn, rows, batch_size):
    committed = 0
    pending = 0
    for row in rows:
        try:
            conn.execute("INSERT INTO readings VALUES (?, ?, ?)", tuple(row))
        except sqlite3.IntegrityError:
            conn.rollback()
            return committed
        pending += 1
        if pending == batch_size:
            conn.commit()
            committed += pending
            pending = 0
    conn.commit()
    return committed + pending

conn = sqlite3.connect("weather.db")
conn.execute("CREATE TABLE readings (station_id TEXT, day TEXT, tmax_c REAL CHECK (tmax_c BETWEEN -90 AND 60))")
rows = [
    ("USW00094846", "2024-07-01", 31.7),
    ("USW00094846", "2024-07-02", 33.9),
    ("USW00094846", "2024-07-03", 30.6),
    ("USW00094846", "2024-07-04", 99.9),
]
print(load_readings(conn, rows, 2))
`,
        alternatives: [
          src`
import sqlite3

def load_readings(conn, rows, batch_size):
    done = 0
    for start in range(0, len(rows), batch_size):
        batch = rows[start:start + batch_size]
        try:
            with conn:
                conn.executemany("INSERT INTO readings VALUES (?, ?, ?)", batch)
        except sqlite3.IntegrityError:
            return done
        done += len(batch)
    return done
`,
        ],
        wrong: [
          {
            code: src`
import sqlite3

def load_readings(conn, rows, batch_size):
    committed = 0
    for row in rows:
        try:
            conn.execute("INSERT INTO readings VALUES (?, ?, ?)", tuple(row))
        except sqlite3.IntegrityError:
            conn.rollback()
            return committed
        committed += 1
        if committed % batch_size == 0:
            conn.commit()
    conn.commit()
    return committed
`,
            fails: ["returns", "partial-last"],
            why: "it counts rows that were inserted but never committed, so after a rollback it reports rows that are gone",
          },
          {
            code: src`
import sqlite3

def load_readings(conn, rows, batch_size):
    committed = 0
    pending = 0
    for row in rows:
        try:
            conn.execute("INSERT INTO readings VALUES (?, ?, ?)", tuple(row))
        except sqlite3.IntegrityError:
            conn.commit()
            return committed + pending
        pending += 1
        if pending == batch_size:
            conn.commit()
            committed += pending
            pending = 0
    conn.commit()
    return committed + pending
`,
            fails: ["returns", "saved", "partial-last"],
            why: "on a bad row it commits the unfinished batch instead of rolling it back",
          },
          {
            code: src`
import sqlite3

def load_readings(conn, rows, batch_size):
    committed = 0
    pending = 0
    for row in rows:
        try:
            conn.execute("INSERT INTO readings VALUES (?, ?, ?)", tuple(row))
        except sqlite3.IntegrityError:
            conn.rollback()
            return committed
        pending += 1
        if pending == batch_size:
            conn.commit()
            committed += pending
            pending = 0
    return committed
`,
            fails: ["all-good"],
            why: "the last, partly filled batch is never committed",
          },
        ],
        hints: [
          "Keep two counts: rows committed so far, and rows inserted since the last commit.",
          "When the pending count reaches the batch size, commit and move the pending rows into the committed count; commit once more after the loop for the rows left over.",
          "On IntegrityError, `rollback()` undoes exactly the pending rows; return the committed count without adding them.",
        ],
        task: {
          checks: [
            sqlCheck("returns", "load_readings() stops at the bad reading and reports the committed rows", READINGS_DB("w1.db"), `load_readings(_conn, _js.loads(${pyLit(JSON.stringify(badFourth))}), 2)`, 2, { show: "load_readings(conn, rows, 2)  # row 4 is 99.9 °C" }),
            sqlCheck("saved", "another connection sees exactly the committed rows", READINGS_DB("w2.db") + `\nload_readings(_conn, _js.loads(${pyLit(JSON.stringify(badFourth))}), 2)`, readBack("w2.db", "SELECT day FROM readings ORDER BY day"), rowsOf([["2024-07-01"], ["2024-07-02"]]), { show: "a second connection after load_readings(conn, rows, 2)" }),
            sqlCheck("all-good", "five good rows with batch size 2 are all committed", READINGS_DB("w3.db") + `\n_n = load_readings(_conn, _js.loads(${pyLit(JSON.stringify(fiveReadings))}), 2)`, `(_n, ${readBack("w3.db", "SELECT COUNT(*) FROM readings")})`, py.tuple(py.int(5), rowsOf([[5]])), { hidden: true }),
            sqlCheck("partial-last", "a bad row in the second batch keeps the first batch", READINGS_DB("w4.db") + `\n_n = load_readings(_conn, _js.loads(${pyLit(JSON.stringify([...fiveReadings.slice(0, 4), reading("2024-01-05", -120)]))}), 3)`, `(_n, ${readBack("w4.db", "SELECT COUNT(*) FROM readings")})`, py.tuple(py.int(3), rowsOf([[3]])), { hidden: true }),
            sqlCheck("first-bad", "the very first row is bad", READINGS_DB("w5.db") + `\n_n = load_readings(_conn, _js.loads(${pyLit(JSON.stringify([reading("2024-02-01", 75), ...fiveReadings.slice(0, 2)]))}), 1)`, `(_n, ${readBack("w5.db", "SELECT COUNT(*) FROM readings")})`, py.tuple(py.int(0), rowsOf([[0]])), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE t (x INTEGER)")
try:
    with conn:
        conn.execute("INSERT INTO t VALUES (1)")
        conn.execute("INSERT INTO t VALUES (2)")
        raise ValueError("bad row")
except ValueError:
    pass
with conn:
    conn.execute("INSERT INTO t VALUES (3)")
print(conn.execute("SELECT COUNT(*), SUM(x) FROM t").fetchone())
`,
        choices: ["(1, 3)", "(3, 6)", "(2, 3)", "(0, None)"],
        answer: 0,
        why: "The exception left the first `with` block, so 1 and 2 were rolled back. The second block finished normally and committed 3.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the program inserts a row and closes the connection. What does the second connection print?",
        program: src`
import sqlite3

a = sqlite3.connect("notes.db")
a.execute("CREATE TABLE notes (text TEXT)")
a.execute("INSERT INTO notes VALUES ('restock tents')")
a.close()
b = sqlite3.connect("notes.db")
print(b.execute("SELECT COUNT(*) FROM notes").fetchone()[0])
`,
        choices: ["0", "1", "None", "sqlite3.OperationalError"],
        answer: 0,
        why: "The table was created (CREATE TABLE isn't part of the pending transaction here), but the INSERT was never committed, and `close()` discards uncommitted changes.",
      },
      {
        id: "q3",
        prompt: "Which pair of writes must be in one transaction?",
        choices: [
          "Taking 3 units off a product's stock and inserting the order line for those 3 units",
          "Inserting yesterday's weather and inserting today's weather from separate files",
          "Two customers updating their own email addresses",
          "Reading the product list and printing it",
        ],
        answer: 0,
        why: "Stock and order lines describe the same event: one without the other leaves the data contradicting itself. Independent changes can each be committed on their own.",
      },
    ],
    review: [
      "Changes are kept only after `commit()`; `rollback()` (or closing without a commit) undoes everything since the last one.",
      "`with conn:` commits a block that finishes and rolls back one that raises.",
      "Put writes that only make sense together in one transaction; commit independent batches separately.",
      "Next (see HTTP & API Clients): getting data from web APIs over HTTP.",
    ],
  },
];
