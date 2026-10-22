/**
 * M30 practice: ten independent problems on packaging metadata and SQLite (PY-L30-01 … PY-L30-05).
 *
 * Mix: 3 function implementations (reading a requirements file, expanding ~= and == .* specifiers, choosing the
 * newest allowed versions), 1 validation (package names), 1 data transformation (pinning a project's dependencies),
 * 1 integration (one parameterised IN query, counted with sqlite3's trace callback), 2 debugging (an order that is
 * half saved, a report query built with an f-string), 1 testing (tests that catch broken version checks) and 1 output
 * prediction (nested `with conn:` blocks). Easy: 02, 06, 10. Medium: 12, 13, 16, 19. Hard: 03, 20, 22.
 *
 * Packaging inputs are real formats: requirements files, PEP 508 names, PEP 440 specifiers, pyproject.toml. SQLite
 * questions run the learner's function against databases built by the check (in memory, or a file read back through a
 * second connection, so a missing commit shows). Rows are Runtime Market (R01) products, customers and orders.
 * Version 2: every question was replaced; the old set printed "ready" next to a marker file.
 */
import type { PyQuestion } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, learnerTests, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const pyLit = (s: string) => JSON.stringify(s);

/** Python lines that build a database `name` (in memory, or a committed file) with the given tables and rows. */
function db(tables: { create: string; insert?: string; rows?: unknown[][] }[], name = "_conn", file = ":memory:"): string {
  const lines = ["import sqlite3 as _sq, json as _js", `${name} = _sq.connect(${pyLit(file)})`];
  for (const t of tables) {
    lines.push(`${name}.execute(${pyLit(t.create)})`);
    if (t.insert && t.rows) lines.push(`${name}.executemany(${pyLit(t.insert)}, _js.loads(${pyLit(JSON.stringify(t.rows))}))`);
  }
  if (file !== ":memory:") lines.push(`${name}.commit()`);
  return lines.join("\n");
}
const rowsOf = (rows: unknown[][]) => py.list(...rows.map((r) => py.tuple(...r.map(pv))));
const tup = (...xs: unknown[]) => py.tuple(...xs.map(pv));

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

/** Marks the learnerTests defect checks as hidden: the learner sees only which kind of defect slipped through. */
const hideDefects = (checks: PyCheck[]) => checks.map((c) => (c.id && /-\d+$/.test(c.id) ? { ...c, hidden: true } : c));

// ---------------------------------------------------------------- fixtures

const PRODUCTS = {
  create: "CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)",
  insert: "INSERT INTO products VALUES (?, ?, ?, ?, ?)",
};
const productRows = [
  ["SPO-11681", "Ultra Bike Light", "sports", 7.49, 12],
  ["HOM-22847", "Deluxe Vase", "home", 31.5, 0],
  ["ELE-24781", "Organic Speaker", "electronics", 171.99, 4],
  ["TOY-54564", "Eco Train Set", "toys", 26.99, 9],
  ["GRO-41017", "Eco Dark Chocolate", "grocery", 7.99, 40],
  ["KID-00412", "Kids' Puzzle Cube", "kids' toys", 9.5, 3],
];

const SHOP = (file: string) =>
  db(
    [
      { create: "CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)", insert: "INSERT INTO stock VALUES (?, ?)", rows: [["SPO-11681", 12], ["TOY-54564", 2], ["GRO-41017", 40]] },
      { create: "CREATE TABLE orders (order_id TEXT PRIMARY KEY)" },
      { create: "CREATE TABLE order_lines (order_id TEXT, sku TEXT, quantity INTEGER)" },
    ],
    "_setup",
    file,
  ) + `\n_setup.close()\n_conn = _sq.connect(${pyLit(file)})`;
const shopState = (file: string) =>
  `(_sq.connect(${pyLit(file)}).execute('SELECT sku, units FROM stock ORDER BY sku').fetchall(), _sq.connect(${pyLit(file)}).execute('SELECT order_id FROM orders ORDER BY order_id').fetchall(), _sq.connect(${pyLit(file)}).execute('SELECT COUNT(*) FROM order_lines').fetchone()[0])`;

const CUSTOMERS = {
  create: "CREATE TABLE customers (customer_id TEXT PRIMARY KEY, last_name TEXT, city TEXT)",
  insert: "INSERT INTO customers VALUES (?, ?, ?)",
  rows: [
    ["C00038", "Garcia", "New York"],
    ["C00071", "Mensah", "Houston"],
    ["C00077", "Walker", "Houston"],
    ["C00412", "O'Brien", "Coeur d'Alene"],
    ["C00413", "Lund", "Coeur d'Alene"],
    ["C01338", "Walker", "New York"],
  ],
};
const ORDERS = {
  create: "CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT, total REAL)",
  insert: "INSERT INTO orders VALUES (?, ?, ?)",
  rows: [
    ["O100282", "C00077", 35.84],
    ["O101219", "C00077", 246.6],
    ["O108858", "C00077", 18.5],
    ["O100920", "C00071", 22.35],
    ["O102240", "C00071", 64.9],
    ["O101341", "C00038", 46.41],
    ["O103001", "C00412", 12.0],
    ["O103002", "C00412", 30.0],
    ["O103003", "C00413", 9.99],
  ],
};

const REQS_TEXT = "# Runtime Market reports\nrequests>=2.31\npandas>=2.2,<3  # dataframes\n\n-r base.txt\n";

const PYPROJECT = (deps: string[]) => `[project]\nname = "market-reports"\nversion = "1.4.2"\ndependencies = [${deps.map((d) => JSON.stringify(d)).join(", ")}]\n`;

const VERSIONS_PY = src`
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
`;

export const m30Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q30-02 function implementation, easy
  {
    id: "PY-Q30-02",
    version: 2,
    slug: "read-a-requirements-file",
    title: "Read a requirements file",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "continue-statement", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "print-call", "reassignment", "string-index", "string-method", "string-slice", "top-level-indent"],
    prompt: "A deploy tool needs the requirement lines from a `requirements.txt`, without the clutter people put around them. Write `read_requirements(text)`. Follow pip's rules: a line starting with `#` is a comment, and so is the rest of a line after a `#` that has whitespace before it (a `#` inside a URL, such as `#sha256=…`, is not a comment). Lines starting with `-` are pip options (`-r base.txt`, `--index-url …`), not requirements.",
    spec: [
      ["Function", "`read_requirements(text)`"],
      ["text", "the file's content: one requirement per line, with comments, blank lines and option lines mixed in"],
      ["Returns", "the requirement lines in order, each stripped of surrounding whitespace and of any trailing comment"],
      ["Skip", "blank lines, comment lines and lines starting with `-`"],
    ],
    hiddenKinds: ["a direct URL with # but no space before it", "indented lines and Windows line endings", "a file of only comments", "a comment that starts right after a space"],
    hints: [
      "Work line by line: strip each line first, then decide whether it is a requirement at all.",
      "A comment starts at a `#` that has whitespace in front of it; cut the line there. A line that is empty after that, or starts with `#` or `-`, is skipped.",
      "Don't split on every `#`: in `pkg @ https://…/pkg.zip#sha256=…` the `#` belongs to the URL because nothing separates it from the text before.",
    ],
    explanation: "Each line is stripped, an inline comment is cut at the first `#` preceded by whitespace, and what's left is kept only if it isn't empty, a comment or a pip option. The usual bugs are splitting on any `#` (which cuts a URL's hash fragment off), and forgetting option lines such as `-r base.txt`, which pip reads as instructions rather than packages.",
    code: {
      starter: src`
def read_requirements(text):
    return []

text = """# Runtime Market reports
requests>=2.31
pandas>=2.2,<3  # dataframes

-r base.txt
"""
print(read_requirements(text))
`,
      answer: src`
def read_requirements(text):
    requirements = []
    for line in text.splitlines():
        line = line.strip()
        for marker in [" #", "\t#"]:
            if marker in line:
                line = line[:line.index(marker)].strip()
        if not line or line.startswith("#") or line.startswith("-"):
            continue
        requirements.append(line)
    return requirements

text = """# Runtime Market reports
requests>=2.31
pandas>=2.2,<3  # dataframes

-r base.txt
"""
print(read_requirements(text))
`,
      alternatives: [
        src`
import re

def read_requirements(text):
    kept = []
    for raw in text.splitlines():
        line = re.sub(r"\s#.*$", "", raw).strip()
        if line and not line.startswith(("#", "-")):
            kept.append(line)
    return kept
`,
      ],
      wrong: [
        {
          code: src`
def read_requirements(text):
    requirements = []
    for line in text.splitlines():
        line = line.split("#")[0].strip()
        if not line or line.startswith("-"):
            continue
        requirements.append(line)
    return requirements
`,
          fails: ["returns"],
          why: "splitting on every `#` cuts the hash off a direct URL",
        },
        {
          code: src`
def read_requirements(text):
    requirements = []
    for line in text.splitlines():
        line = line.strip()
        if " #" in line:
            line = line[:line.index(" #")].strip()
        if not line or line.startswith("#"):
            continue
        requirements.append(line)
    return requirements
`,
          fails: ["returns"],
          why: "option lines such as `-r base.txt` are returned as if they were packages",
        },
        {
          code: src`
def read_requirements(text):
    requirements = []
    for line in text.splitlines():
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("-"):
            requirements.append(line)
    return requirements
`,
          fails: ["returns"],
          why: "an inline comment such as `# dataframes` stays on the requirement",
        },
      ],
      task: {
        checks: [
          fn("returns", "read_requirements", [
            example([REQS_TEXT], ["requests>=2.31", "pandas>=2.2,<3"]),
            example([""], []),
            example(["rich==13.7.1\n--index-url https://pypi.org/simple\n"], ["rich==13.7.1"]),
            hiddenCase("a direct URL with # but no space before it", ["market-charts @ https://files.example.com/market_charts-0.3.0.zip#sha256=9f2c\n"], ["market-charts @ https://files.example.com/market_charts-0.3.0.zip#sha256=9f2c"]),
            hiddenCase("indented lines and Windows line endings", ['  click>=8.1\r\n\ttomli ; python_version < "3.11"\r\n'], ["click>=8.1", 'tomli ; python_version < "3.11"']),
            hiddenCase("a file of only comments", ["# nothing yet\n   # still nothing\n"], []),
            hiddenCase("a comment that starts right after a space", ["numpy<2 #pinned for now\n"], ["numpy<2"]),
          ], { label: "read_requirements() returns the clean requirement lines" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-03 debugging, hard
  {
    id: "PY-Q30-03",
    version: 2,
    slug: "half-saved-orders",
    title: "Half-saved orders",
    format: "debugging",
    difficulty: "hard",
    minutes: 18,
    requires: ["assignment", "comparison", "except-type", "for-loop", "function-def", "function-param", "if-statement", "import-module", "list-literal", "membership", "print-call", "print-text", "raise-stmt", "sql-param", "sql-tx", "sqlite-call", "string-format", "top-level-indent", "try-except", "unquoted-name", "with-statement"],
    prompt: "Warehouse staff found orders in the database with only some of their lines, and stock taken for orders that the customer was told had failed. `place_order` raises `ValueError` when a line asks for more units than are in stock, but by then part of the order is already saved. Fix it so an order is saved completely or not at all, and so a failed order leaves nothing behind that a later order could commit by accident.",
    spec: [
      ["Function", "`place_order(conn, order_id, lines)`"],
      ["Tables", "`stock (sku, units)`, `orders (order_id)`, `order_lines (order_id, sku, quantity)`"],
      ["Must", "save the order row, every line and every stock change together, and commit them"],
      ["On failure", "raise `ValueError` (as now), with the database exactly as before the call"],
    ],
    hiddenKinds: ["a failed order followed by a good one on the same connection", "an order whose first line fails"],
    hints: [
      "Count the commits: where does the function make changes permanent, and what has happened by then when a later line fails?",
      "All the writes of one order belong to one transaction, committed once at the end and undone when anything fails.",
      "A `with conn:` block around the whole body commits when it finishes and rolls back when the ValueError leaves it. Rolling back matters even if you commit at the end: otherwise the failed order's writes stay pending on the connection.",
    ],
    explanation: "The original commits after every line, so when line 3 fails, the order row and lines 1–2 (and their stock changes) are already permanent. Moving the single commit to the end is only half a fix: a failed call then leaves its writes pending on the connection, and the next successful order commits them along with its own. Wrapping the whole body in `with conn:` gives both halves: one commit when everything succeeded, a rollback when the exception leaves the block.",
    code: {
      starter: src`
import sqlite3

def place_order(conn, order_id, lines):
    conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
    for sku, quantity in lines:
        sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
        changed = conn.execute(sql, (quantity, sku, quantity)).rowcount
        if changed == 0:
            raise ValueError(f"cannot take {quantity} of {sku}")
        conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
        conn.commit()

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY)")
conn.execute("CREATE TABLE order_lines (order_id TEXT, sku TEXT, quantity INTEGER)")
conn.executemany("INSERT INTO stock VALUES (?, ?)", [("SPO-11681", 12), ("TOY-54564", 2)])
conn.commit()
try:
    place_order(conn, "O200002", [("SPO-11681", 4), ("TOY-54564", 5)])
except ValueError as err:
    print(err)
print(conn.execute("SELECT * FROM stock ORDER BY sku").fetchall())
`,
      answer: src`
import sqlite3

def place_order(conn, order_id, lines):
    with conn:
        conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
        for sku, quantity in lines:
            sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
            changed = conn.execute(sql, (quantity, sku, quantity)).rowcount
            if changed == 0:
                raise ValueError(f"cannot take {quantity} of {sku}")
            conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))

conn = sqlite3.connect("shop.db")
conn.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER)")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY)")
conn.execute("CREATE TABLE order_lines (order_id TEXT, sku TEXT, quantity INTEGER)")
conn.executemany("INSERT INTO stock VALUES (?, ?)", [("SPO-11681", 12), ("TOY-54564", 2)])
conn.commit()
try:
    place_order(conn, "O200002", [("SPO-11681", 4), ("TOY-54564", 5)])
except ValueError as err:
    print(err)
print(conn.execute("SELECT * FROM stock ORDER BY sku").fetchall())
`,
      alternatives: [
        src`
import sqlite3

def place_order(conn, order_id, lines):
    try:
        conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
        for sku, quantity in lines:
            sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
            if conn.execute(sql, (quantity, sku, quantity)).rowcount == 0:
                raise ValueError(f"cannot take {quantity} of {sku}")
            conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
    except Exception:
        conn.rollback()
        raise
    conn.commit()
`,
      ],
      wrong: [
        {
          code: src`
import sqlite3

def place_order(conn, order_id, lines):
    conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
    for sku, quantity in lines:
        sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
        changed = conn.execute(sql, (quantity, sku, quantity)).rowcount
        if changed == 0:
            raise ValueError(f"cannot take {quantity} of {sku}")
        conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
    conn.commit()
`,
          fails: ["then-good"],
          why: "one commit at the end, but a failed order's writes stay pending and the next good order commits them",
        },
        {
          code: src`
import sqlite3

def place_order(conn, order_id, lines):
    conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
    for sku, quantity in lines:
        sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
        changed = conn.execute(sql, (quantity, sku, quantity)).rowcount
        if changed == 0:
            raise ValueError(f"cannot take {quantity} of {sku}")
        conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
`,
          fails: ["saved", "then-good"],
          why: "nothing is committed, so even a good order is lost",
        },
        {
          code: src`
import sqlite3

def place_order(conn, order_id, lines):
    try:
        with conn:
            conn.execute("INSERT INTO orders VALUES (?)", (order_id,))
            for sku, quantity in lines:
                sql = "UPDATE stock SET units = units - ? WHERE sku = ? AND units >= ?"
                if conn.execute(sql, (quantity, sku, quantity)).rowcount == 0:
                    raise ValueError(f"cannot take {quantity} of {sku}")
                conn.execute("INSERT INTO order_lines VALUES (?, ?, ?)", (order_id, sku, quantity))
    except ValueError:
        return None
`,
          fails: ["raises"],
          why: "the rollback is right, but the error is swallowed, so the caller thinks the order went through",
        },
      ],
      task: {
        checks: [
          sqlCheck("saved", "a good order is committed: stock, order and lines", SHOP("q1.db") + "\nplace_order(_conn, 'O200001', [('SPO-11681', 3), ('TOY-54564', 1)])", shopState("q1.db"), tup(rowsOf([["GRO-41017", 40], ["SPO-11681", 9], ["TOY-54564", 1]]), rowsOf([["O200001"]]), 2), { show: "place_order(conn, 'O200001', [('SPO-11681', 3), ('TOY-54564', 1)]), read from a second connection" }),
          sqlCheck("raises", "an order asking for too many units raises ValueError", SHOP("q2.db"), "place_order(_conn, 'O200002', [('SPO-11681', 4), ('TOY-54564', 5)])", null, { raises: "ValueError", show: "place_order(conn, 'O200002', [('SPO-11681', 4), ('TOY-54564', 5)])" }),
          sqlCheck("unchanged", "after a failed order the database is as it was", SHOP("q3.db") + "\ntry:\n    place_order(_conn, 'O200002', [('SPO-11681', 4), ('TOY-54564', 5)])\nexcept ValueError:\n    pass", shopState("q3.db"), tup(rowsOf([["GRO-41017", 40], ["SPO-11681", 12], ["TOY-54564", 2]]), rowsOf([]), 0), { show: "the tables after the failed order, read from a second connection" }),
          sqlCheck("then-good", "a failed order followed by a good one on the same connection", SHOP("q4.db") + "\ntry:\n    place_order(_conn, 'O200002', [('SPO-11681', 4), ('TOY-54564', 5)])\nexcept ValueError:\n    pass\nplace_order(_conn, 'O200003', [('GRO-41017', 10)])", shopState("q4.db"), tup(rowsOf([["GRO-41017", 30], ["SPO-11681", 12], ["TOY-54564", 2]]), rowsOf([["O200003"]]), 1), { hidden: true }),
          sqlCheck("first-line", "an order whose first line fails", SHOP("q5.db") + "\ntry:\n    place_order(_conn, 'O200004', [('TOY-54564', 3), ('SPO-11681', 1)])\nexcept ValueError:\n    pass", shopState("q5.db"), tup(rowsOf([["GRO-41017", 40], ["SPO-11681", 12], ["TOY-54564", 2]]), rowsOf([]), 0), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-06 validation, easy
  {
    id: "PY-Q30-06",
    version: 2,
    slug: "valid-package-names",
    title: "Valid package names",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "logical", "membership", "nested-condition", "print-call", "print-text", "raise-stmt", "string-check", "string-format", "string-index", "string-method", "top-level-indent"],
    prompt: "An internal package index accepts uploads only under valid names, stored in their normalised form so that `Market_Reports` and `market-reports` can't be two different packages. Write `normalize_name(name)`. A valid name is letters, digits, `.`, `_` and `-`, and it starts and ends with a letter or digit. Normalising lower-cases the name and turns every run of `.`, `_` and `-` into a single `-`.",
    spec: [
      ["Function", "`normalize_name(name)`"],
      ["Returns", "the normalised name, e.g. `\"Market_Reports\"` → `\"market-reports\"`"],
      ["Raises", "`ValueError` when the name isn't valid (empty, other characters, or a separator at either end)"],
    ],
    hiddenKinds: ["a single character", "a run of mixed separators", "a name ending with a dot", "a space inside the name", "an empty name", "a name that starts with a digit"],
    hints: [
      "Validate first, then normalise; a regular expression with `re.fullmatch` (see Dates Numbers & Regex) can say whether the whole name fits the pattern.",
      "The pattern is: one letter or digit, then optionally any mix of allowed characters ending with a letter or digit.",
      "For normalising, replace each *run* of separators at once: a `+` after the character class matches one or more.",
    ],
    explanation: "These are the rules pip and PyPI use (PEP 508 for valid names, PEP 503 for normalised ones). `re.fullmatch` with `[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?` accepts a single character and any longer name whose ends are letters or digits. `re.sub(r\"[-_.]+\", \"-\", name).lower()` collapses each run of separators into one dash. Replacing separators one at a time turns `a__b` into `a--b`, a different name from `a-b`.",
    code: {
      starter: src`
import re

def normalize_name(name):
    return name

print(normalize_name("Market_Reports"))
print(normalize_name("zope.interface"))
`,
      answer: src`
import re

def normalize_name(name):
    if not re.fullmatch(r"[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?", name):
        raise ValueError(f"not a valid package name: {name!r}")
    return re.sub(r"[-_.]+", "-", name).lower()

print(normalize_name("Market_Reports"))
print(normalize_name("zope.interface"))
`,
      alternatives: [
        src`
def normalize_name(name):
    allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-"
    if not name or not name[0].isalnum() or not name[-1].isalnum():
        raise ValueError("bad name")
    out = ""
    for ch in name:
        if ch not in allowed:
            raise ValueError("bad character")
        if ch in "._-":
            if not out.endswith("-"):
                out += "-"
        else:
            out += ch.lower()
    return out
`,
      ],
      wrong: [
        {
          code: src`
def normalize_name(name):
    if not name or name[0] in "._-" or name[-1] in "._-" or " " in name:
        raise ValueError("bad name")
    return name.lower().replace("_", "-")
`,
          fails: ["returns"],
          why: "dots are left in, so `zope.interface` isn't normalised",
        },
        {
          code: src`
import re

def normalize_name(name):
    if not re.fullmatch(r"[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?", name):
        raise ValueError("bad name")
    return re.sub(r"[-_.]", "-", name).lower()
`,
          fails: ["returns"],
          why: "each separator is replaced on its own, so `__` becomes `--`",
        },
        {
          code: src`
import re

def normalize_name(name):
    return re.sub(r"[-_.]+", "-", name).lower()
`,
          fails: ["returns"],
          why: "nothing is validated, so names like `-reports` are accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "normalize_name", [
            example(["Market_Reports"], "market-reports"),
            example(["zope.interface"], "zope-interface"),
            raisesCase(["-reports"], "ValueError"),
            hiddenCase("a single character", ["Q"], "q"),
            hiddenCase("a run of mixed separators", ["Runtime__Market.-Charts"], "runtime-market-charts"),
            raisesCase(["reports."], "ValueError", { label: "a name ending with a dot" }),
            raisesCase(["market reports"], "ValueError", { label: "a space inside the name" }),
            raisesCase([""], "ValueError", { label: "an empty name" }),
            hiddenCase("a name that starts with a digit", ["2to3"], "2to3"),
          ], { label: "normalize_name() validates and normalises package names" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-10 integration, easy
  {
    id: "PY-Q30-10",
    version: 2,
    slug: "products-by-sku-one-query",
    title: "Look up a basket's products in one query",
    format: "integration",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comparison", "dict-comp", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "sql-param", "sqlite-call", "string-format", "string-index", "top-level-indent", "tuple-literal"],
    prompt: "The checkout page needs the name and price of every product in the basket. Running one query per SKU is slow on a real database (the \"N+1 queries\" problem), so write `products_by_skus(conn, skus)` that asks for all of them in **one** SELECT with `WHERE sku IN (?, ?, …)`, one `?` per SKU.",
    spec: [
      ["Function", "`products_by_skus(conn, skus)`"],
      ["Table", "`products (sku, name, category, price, stock)`"],
      ["Returns", "a dictionary `{sku: (name, price)}` for the SKUs that exist; unknown SKUs are left out; `{}` for an empty list"],
      ["Rules", "one SELECT for the whole list; values go through placeholders, never into the SQL text"],
    ],
    hiddenKinds: ["a SKU with a quote in it", "the same SKU twice", "only unknown SKUs", "five SKUs at once"],
    hints: [
      "Build the placeholder part from the number of SKUs: as many `?` as there are SKUs, joined by commas.",
      "Only the `?` marks go into the SQL text; the list of SKUs itself is the second argument to `execute`.",
      "Turn the rows into the dictionary with a comprehension; an empty list can return `{}` without asking the database.",
    ],
    explanation: "`\", \".join([\"?\"] * len(skus))` builds `?, ?, ?`, which is safe to put into the SQL because it contains no data. The SKUs travel separately as the parameters, so a SKU with a quote can't break the statement, and the database answers in one round trip. Pasting the SKUs into the SQL breaks on quotes; looping with one query per SKU gives the right answer but makes N queries.",
    code: {
      starter: src`
import sqlite3

def products_by_skus(conn, skus):
    return {}

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("TOY-54564", "Eco Train Set", "toys", 26.99, 9),
    ("GRO-41017", "Eco Dark Chocolate", "grocery", 7.99, 40),
])
print(products_by_skus(conn, ["TOY-54564", "SPO-11681", "NOPE-0000"]))
`,
      answer: src`
import sqlite3

def products_by_skus(conn, skus):
    if not skus:
        return {}
    marks = ", ".join(["?"] * len(skus))
    sql = f"SELECT sku, name, price FROM products WHERE sku IN ({marks})"
    rows = conn.execute(sql, list(skus)).fetchall()
    return {sku: (name, price) for sku, name, price in rows}

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 12),
    ("TOY-54564", "Eco Train Set", "toys", 26.99, 9),
    ("GRO-41017", "Eco Dark Chocolate", "grocery", 7.99, 40),
])
print(products_by_skus(conn, ["TOY-54564", "SPO-11681", "NOPE-0000"]))
`,
      alternatives: [
        src`
def products_by_skus(conn, skus):
    found = {}
    if len(skus) == 0:
        return found
    placeholders = ",".join(["?" for _ in skus])
    cursor = conn.execute("SELECT sku, name, price FROM products WHERE sku IN (" + placeholders + ")", tuple(skus))
    for sku, name, price in cursor:
        found[sku] = (name, price)
    return found
`,
      ],
      wrong: [
        {
          code: src`
def products_by_skus(conn, skus):
    if not skus:
        return {}
    listed = ", ".join([f"'{sku}'" for sku in skus])
    rows = conn.execute(f"SELECT sku, name, price FROM products WHERE sku IN ({listed})").fetchall()
    return {sku: (name, price) for sku, name, price in rows}
`,
          fails: ["quote"],
          why: "the SKUs are pasted into the SQL, which breaks on a SKU with a quote in it",
        },
        {
          code: src`
def products_by_skus(conn, skus):
    found = {}
    for sku in skus:
        row = conn.execute("SELECT name, price FROM products WHERE sku = ?", (sku,)).fetchone()
        if row is not None:
            found[sku] = row
    return found
`,
          fails: ["one-query"],
          why: "the answers are right, but it runs one query per SKU",
        },
        {
          code: src`
def products_by_skus(conn, skus):
    if not skus:
        return {}
    marks = ", ".join(["?"] * len(skus))
    return conn.execute(f"SELECT sku, name, price FROM products WHERE sku IN ({marks})", skus).fetchall()
`,
          fails: ["returns", "unknown", "quote", "twice", "none-found"],
          why: "it returns the rows as a list of tuples, not a dictionary from SKU to (name, price)",
        },
      ],
      task: {
        checks: [
          sqlCheck("returns", "products_by_skus() returns name and price for each known SKU", db([{ ...PRODUCTS, rows: productRows }]), "products_by_skus(_conn, ['TOY-54564', 'SPO-11681'])", { "TOY-54564": tup("Eco Train Set", 26.99), "SPO-11681": tup("Ultra Bike Light", 7.49) }, { show: "products_by_skus(conn, ['TOY-54564', 'SPO-11681'])" }),
          sqlCheck("unknown", "unknown SKUs are left out", db([{ ...PRODUCTS, rows: productRows }]), "products_by_skus(_conn, ['GRO-41017', 'NOPE-0000'])", { "GRO-41017": tup("Eco Dark Chocolate", 7.99) }, { show: "products_by_skus(conn, ['GRO-41017', 'NOPE-0000'])" }),
          sqlCheck("empty", "an empty basket gives an empty dictionary", db([{ ...PRODUCTS, rows: productRows }]), "products_by_skus(_conn, [])", {}, { show: "products_by_skus(conn, [])" }),
          sqlCheck("quote", "a SKU with a quote in it", db([{ ...PRODUCTS, rows: [...productRows, ["KID'S-1", "Odd Code", "toys", 2.5, 1]] }]), "products_by_skus(_conn, [\"KID'S-1\", 'HOM-22847'])", { "KID'S-1": tup("Odd Code", 2.5), "HOM-22847": tup("Deluxe Vase", 31.5) }, { hidden: true }),
          sqlCheck("twice", "the same SKU twice", db([{ ...PRODUCTS, rows: productRows }]), "products_by_skus(_conn, ['ELE-24781', 'ELE-24781'])", { "ELE-24781": tup("Organic Speaker", 171.99) }, { hidden: true }),
          sqlCheck("none-found", "only unknown SKUs", db([{ ...PRODUCTS, rows: productRows }]), "products_by_skus(_conn, ['X-1', 'Y-2'])", {}, { hidden: true }),
          sqlCheck("one-query", "five SKUs are fetched with one SELECT", db([{ ...PRODUCTS, rows: productRows }]) + "\n_seen = []\n_conn.set_trace_callback(_seen.append)\nproducts_by_skus(_conn, ['SPO-11681', 'HOM-22847', 'ELE-24781', 'TOY-54564', 'GRO-41017'])\n_conn.set_trace_callback(None)", "len([_s for _s in _seen if _s.lstrip().upper().startswith('SELECT')])", 1, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-12 data transformation, medium
  {
    id: "PY-Q30-12",
    version: 2,
    slug: "pin-project-dependencies",
    title: "Pin a project's dependencies",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "break-statement", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "print-call", "print-several", "print-text", "pyproject-file", "raise-stmt", "reassignment", "string-check", "string-format", "string-index", "string-method", "top-level-indent", "while-loop"],
    prompt: "Before a release, the team turns the version ranges in `pyproject.toml` into exact pins, using the versions that passed the tests. Write `pinned_lines(pyproject_text, installed)`: one `name==version` line per dependency in `[project].dependencies`, with the name normalised (lower case, runs of `-`, `_`, `.` as one `-`), sorted by name, each package once.",
    spec: [
      ["Function", "`pinned_lines(pyproject_text, installed)`"],
      ["pyproject_text", "TOML text; dependencies look like `\"pandas[parquet]>=2.2,<3\"` or `\"tomli; python_version < '3.11'\"`"],
      ["installed", "a dictionary from package name to version, e.g. `{\"Pandas\": \"2.2.2\"}` (names may be written in any style)"],
      ["Returns", "a sorted list such as `['pandas==2.2.2', 'requests==2.32.3']`; `[]` when there are no dependencies"],
      ["Raises", "`ValueError` naming the package when a dependency isn't installed"],
    ],
    hiddenKinds: ["names written in different styles", "the same package listed twice", "a dependency that isn't installed", "a file with no dependencies key", "names that sort differently from their order in the file"],
    hints: [
      "The package name is the leading run of letters, digits, `.`, `_` and `-`: extras, specifiers and markers all start with another character.",
      "Normalise both sides the same way before looking a name up: build a normalised copy of `installed` first.",
      "Collect each line only once, then sort the list at the end.",
    ],
    explanation: "Each requirement's name is the leading run of name characters, so `pandas[parquet]>=2.2` and `tomli; python_version < '3.11'` give `pandas` and `tomli`. Normalising both the requirement names and the installed names makes `Market_Reports` and `market-reports` meet. The lines are deduplicated and sorted so the pins are stable between runs. Common bugs: comparing raw names, keeping the extras in the name, and returning the lines in file order.",
    code: {
      starter: src`
import re
import tomllib

def pinned_lines(pyproject_text, installed):
    return []

text = """
[project]
name = "market-reports"
dependencies = ["requests>=2.31", "pandas[parquet]>=2.2,<3"]
"""
print(pinned_lines(text, {"requests": "2.32.3", "pandas": "2.2.2"}))
`,
      answer: src`
import re
import tomllib

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def pinned_lines(pyproject_text, installed):
    have = {normalize(name): version for name, version in installed.items()}
    dependencies = tomllib.loads(pyproject_text).get("project", {}).get("dependencies", [])
    lines = []
    for requirement in dependencies:
        name = normalize(re.match(r"[A-Za-z0-9._-]+", requirement.strip()).group())
        if name not in have:
            raise ValueError(f"{name} is not installed")
        line = f"{name}=={have[name]}"
        if line not in lines:
            lines.append(line)
    return sorted(lines)

text = """
[project]
name = "market-reports"
dependencies = ["requests>=2.31", "pandas[parquet]>=2.2,<3"]
"""
print(pinned_lines(text, {"requests": "2.32.3", "pandas": "2.2.2"}))
`,
      alternatives: [
        src`
import tomllib

def key(name):
    out = name.lower()
    for sep in "_.":
        out = out.replace(sep, "-")
    while "--" in out:
        out = out.replace("--", "-")
    return out

def pinned_lines(pyproject_text, installed):
    data = tomllib.loads(pyproject_text)
    deps = data.get("project", {}).get("dependencies", [])
    versions = {key(n): v for n, v in installed.items()}
    pinned = {}
    for dep in deps:
        name = ""
        for ch in dep.strip():
            if ch.isalnum() or ch in "._-":
                name += ch
            else:
                break
        name = key(name)
        if name not in versions:
            raise ValueError("missing " + name)
        pinned[name] = name + "==" + versions[name]
    return sorted(pinned.values())
`,
      ],
      wrong: [
        {
          code: src`
import re
import tomllib

def pinned_lines(pyproject_text, installed):
    dependencies = tomllib.loads(pyproject_text).get("project", {}).get("dependencies", [])
    lines = []
    for requirement in dependencies:
        name = re.match(r"[A-Za-z0-9._-]+", requirement).group()
        if name not in installed:
            raise ValueError(f"{name} is not installed")
        lines.append(f"{name}=={installed[name]}")
    return sorted(lines)
`,
          fails: ["returns"],
          why: "names aren't normalised, so `Pandas` installed doesn't match `pandas` required",
        },
        {
          code: src`
import re
import tomllib

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def pinned_lines(pyproject_text, installed):
    have = {normalize(name): version for name, version in installed.items()}
    dependencies = tomllib.loads(pyproject_text).get("project", {}).get("dependencies", [])
    lines = []
    for requirement in dependencies:
        name = normalize(re.split(r"[<>=!~;]", requirement)[0].strip())
        if name not in have:
            raise ValueError(f"{name} is not installed")
        lines.append(f"{name}=={have[name]}")
    return sorted(lines)
`,
          fails: ["returns"],
          why: "the extras stay in the name, so `pandas[parquet]` is never found",
        },
        {
          code: src`
import re
import tomllib

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def pinned_lines(pyproject_text, installed):
    have = {normalize(name): version for name, version in installed.items()}
    dependencies = tomllib.loads(pyproject_text)["project"]["dependencies"]
    lines = []
    for requirement in dependencies:
        name = normalize(re.match(r"[A-Za-z0-9._-]+", requirement).group())
        if name not in have:
            raise ValueError(f"{name} is not installed")
        lines.append(f"{name}=={have[name]}")
    return lines
`,
          fails: ["returns"],
          why: "the lines come back in file order with repeats, and a project without dependencies crashes",
        },
      ],
      task: {
        checks: [
          fn("returns", "pinned_lines", [
            example([PYPROJECT(["requests>=2.31", "pandas[parquet]>=2.2,<3"]), { requests: "2.32.3", pandas: "2.2.2" }], ["pandas==2.2.2", "requests==2.32.3"]),
            example([PYPROJECT(["tomli; python_version < '3.11'"]), { Tomli: "2.0.1", rich: "13.7.1" }], ["tomli==2.0.1"]),
            example(['[project]\nname = "notes"\n', { requests: "2.32.3" }], []),
            hiddenCase("names written in different styles", [PYPROJECT(["Market_Reports==1.4.2", "zope.interface>=6"]), { "market-reports": "1.4.2", "Zope-Interface": "6.4" }], ["market-reports==1.4.2", "zope-interface==6.4"]),
            hiddenCase("the same package listed twice", [PYPROJECT(["numpy>=1.26", "numpy<2; python_version < '3.12'"]), { numpy: "1.26.4" }], ["numpy==1.26.4"]),
            raisesCase([PYPROJECT(["requests>=2.31", "httpx>=0.27"]), { requests: "2.32.3" }], "ValueError", { label: "a dependency that isn't installed" }),
            hiddenCase("a file with no project table", ["[tool.market-reports]\ntop_n = 3\n", {}], []),
            hiddenCase("names that sort differently from their order in the file", [PYPROJECT(["rich", "click>=8", "attrs"]), { rich: "13.7.1", click: "8.1.7", attrs: "23.2.0" }], ["attrs==23.2.0", "click==8.1.7", "rich==13.7.1"]),
          ], { label: "pinned_lines() pins every dependency to its installed version" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-13 debugging, medium
  {
    id: "PY-Q30-13",
    version: 2,
    slug: "repeat-customers-query",
    title: "The repeat-customers report",
    format: "debugging",
    difficulty: "medium",
    minutes: 14,
    requires: ["assignment", "dict-literal", "function-def", "function-doc", "function-param", "function-return", "import-module", "list-literal", "print-call", "print-several", "print-text", "sql-param", "sqlite-call", "string-format", "top-level-indent"],
    prompt: "`repeat_customers(conn, city, min_orders)` should list the customers in a city with **at least** `min_orders` orders. Support reports two problems: for the city Coeur d'Alene the report crashes, and customers with exactly `min_orders` orders are missing. Fix both.",
    spec: [
      ["Function", "`repeat_customers(conn, city, min_orders)`"],
      ["Tables", "`customers (customer_id, last_name, city)`, `orders (order_id, customer_id, total)`"],
      ["Returns", "`[(customer_id, order_count), …]` ordered by customer_id"],
    ],
    hiddenKinds: ["a city with a quote in its name", "a minimum of 1", "a city with no customers"],
    hints: [
      "Run the starter for both cities and read the errors and results; each problem has its own cause.",
      "The crash comes from the city's quote ending the SQL string early: values belong in `?` placeholders.",
      "\"At least\" includes the minimum itself, so the HAVING condition needs a different comparison.",
    ],
    explanation: "Pasting `city` into the SQL with an f-string breaks as soon as the value contains a quote (and lets a crafted value change the query). Passing `(city, min_orders)` as parameters fixes the crash for every value. The second bug is `>`, which drops customers who have exactly the minimum; `>=` matches \"at least\". Fixing only one of the two leaves the other report wrong.",
    code: {
      starter: src`
import sqlite3

def repeat_customers(conn, city, min_orders):
    sql = f"""
        SELECT customers.customer_id, COUNT(*)
        FROM customers JOIN orders ON orders.customer_id = customers.customer_id
        WHERE customers.city = '{city}'
        GROUP BY customers.customer_id
        HAVING COUNT(*) > {min_orders}
        ORDER BY customers.customer_id
    """
    return conn.execute(sql).fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT PRIMARY KEY, last_name TEXT, city TEXT)")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT, total REAL)")
conn.executemany("INSERT INTO customers VALUES (?, ?, ?)", [("C00071", "Mensah", "Houston"), ("C00077", "Walker", "Houston"), ("C00412", "O'Brien", "Coeur d'Alene")])
conn.executemany("INSERT INTO orders VALUES (?, ?, ?)", [("O100282", "C00077", 35.84), ("O101219", "C00077", 246.6), ("O108858", "C00077", 18.5), ("O100920", "C00071", 22.35), ("O102240", "C00071", 64.9), ("O103001", "C00412", 12.0)])
print(repeat_customers(conn, "Houston", 2))
print(repeat_customers(conn, "Coeur d'Alene", 1))
`,
      answer: src`
import sqlite3

def repeat_customers(conn, city, min_orders):
    sql = """
        SELECT customers.customer_id, COUNT(*)
        FROM customers JOIN orders ON orders.customer_id = customers.customer_id
        WHERE customers.city = ?
        GROUP BY customers.customer_id
        HAVING COUNT(*) >= ?
        ORDER BY customers.customer_id
    """
    return conn.execute(sql, (city, min_orders)).fetchall()

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT PRIMARY KEY, last_name TEXT, city TEXT)")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, customer_id TEXT, total REAL)")
conn.executemany("INSERT INTO customers VALUES (?, ?, ?)", [("C00071", "Mensah", "Houston"), ("C00077", "Walker", "Houston"), ("C00412", "O'Brien", "Coeur d'Alene")])
conn.executemany("INSERT INTO orders VALUES (?, ?, ?)", [("O100282", "C00077", 35.84), ("O101219", "C00077", 246.6), ("O108858", "C00077", 18.5), ("O100920", "C00071", 22.35), ("O102240", "C00071", 64.9), ("O103001", "C00412", 12.0)])
print(repeat_customers(conn, "Houston", 2))
print(repeat_customers(conn, "Coeur d'Alene", 1))
`,
      alternatives: [
        src`
def repeat_customers(conn, city, min_orders):
    sql = (
        "SELECT c.customer_id, COUNT(o.order_id) AS n "
        "FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id "
        "WHERE c.city = :city GROUP BY c.customer_id HAVING n >= :minimum ORDER BY c.customer_id"
    )
    return conn.execute(sql, {"city": city, "minimum": min_orders}).fetchall()
`,
      ],
      wrong: [
        {
          code: src`
def repeat_customers(conn, city, min_orders):
    sql = """
        SELECT customers.customer_id, COUNT(*)
        FROM customers JOIN orders ON orders.customer_id = customers.customer_id
        WHERE customers.city = ?
        GROUP BY customers.customer_id
        HAVING COUNT(*) > ?
        ORDER BY customers.customer_id
    """
    return conn.execute(sql, (city, min_orders)).fetchall()
`,
          fails: ["returns", "three", "quote", "minimum-one"],
          why: "the placeholders fix the crash, but `>` still drops customers with exactly the minimum",
        },
        {
          code: src`
def repeat_customers(conn, city, min_orders):
    sql = f"""
        SELECT customers.customer_id, COUNT(*)
        FROM customers JOIN orders ON orders.customer_id = customers.customer_id
        WHERE customers.city = '{city}'
        GROUP BY customers.customer_id
        HAVING COUNT(*) >= {min_orders}
        ORDER BY customers.customer_id
    """
    return conn.execute(sql).fetchall()
`,
          fails: ["quote"],
          why: "the comparison is fixed, but the city is still pasted into the SQL and the quote breaks it",
        },
        {
          code: src`
def repeat_customers(conn, city, min_orders):
    city = city.replace("'", "")
    sql = f"""
        SELECT customers.customer_id, COUNT(*)
        FROM customers JOIN orders ON orders.customer_id = customers.customer_id
        WHERE customers.city = '{city}'
        GROUP BY customers.customer_id
        HAVING COUNT(*) >= {min_orders}
        ORDER BY customers.customer_id
    """
    return conn.execute(sql).fetchall()
`,
          fails: ["quote"],
          why: "removing the quote stops the crash but searches for `Coeur dAlene`, which matches nobody",
        },
      ],
      task: {
        checks: [
          sqlCheck("returns", "Houston customers with at least 2 orders", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, 'Houston', 2)", rowsOf([["C00071", 2], ["C00077", 3]]), { show: "repeat_customers(conn, 'Houston', 2)" }),
          sqlCheck("three", "Houston customers with at least 3 orders", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, 'Houston', 3)", rowsOf([["C00077", 3]]), { show: "repeat_customers(conn, 'Houston', 3)" }),
          sqlCheck("new-york", "nobody in New York has 2 orders", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, 'New York', 2)", rowsOf([]), { show: "repeat_customers(conn, 'New York', 2)" }),
          sqlCheck("quote", "a city with a quote in its name", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, \"Coeur d'Alene\", 2)", rowsOf([["C00412", 2]]), { hidden: true }),
          sqlCheck("minimum-one", "a minimum of 1", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, 'New York', 1)", rowsOf([["C00038", 1]]), { hidden: true }),
          sqlCheck("no-city", "a city with no customers", db([CUSTOMERS, ORDERS]), "repeat_customers(_conn, 'Denver', 1)", rowsOf([]), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-16 function implementation, medium
  {
    id: "PY-Q30-16",
    version: 2,
    slug: "expand-version-specifiers",
    title: "Expand ~= and wildcard specifiers",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "conversion", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "map-call", "membership", "nested-condition", "print-call", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness"],
    prompt: "A simple version checker only understands `>=`, `<`, `==` and `!=` with plain versions. Write `expand_spec(spec)` to rewrite the two shorthand forms into conditions it understands. `~=X.Y` (compatible release) means `>=X.Y` and below the next release of the part before the last: `~=2.2` → `>=2.2,<3`, `~=1.4.5` → `>=1.4.5,<1.5`. `==X.Y.*` means any version starting `X.Y`: `>=X.Y,<X.(Y+1)`.",
    spec: [
      ["Function", "`expand_spec(spec)`"],
      ["spec", "conditions joined by commas, with or without spaces, e.g. `\"~=1.4.5, !=1.4.7\"`"],
      ["Returns", "the conditions joined by `,` with no spaces, shorthand expanded in place, others unchanged; `\"\"` for `\"\"`"],
      ["Raises", "`ValueError` for `~=` with a one-part version (`~=2`), which PEP 440 does not allow"],
    ],
    hiddenKinds: ["a spec with nothing to expand", "a zero minor version", "a one-part wildcard", "a one-part ~= version", "an empty spec", "a two-digit part that rolls over"],
    hints: [
      "Split at commas, strip each condition, expand it if it is shorthand, then join the results with `,`.",
      "For `~=`, the upper bound drops the last part and adds 1 to the part before it. For `==X.Y.*`, the upper bound adds 1 to the last part before the `*`.",
      "Do the arithmetic on ints (`9` + 1 is `10`, so `0.9.1` gives `<0.10`), then turn the parts back into text with `\".\".join`.",
    ],
    explanation: "Each condition is handled on its own. For `~=V` the lower bound is `V` itself and the upper bound comes from `V` without its last part, with the new last part increased by one. For `==V.*` the lower bound is `V` and the upper bound increases the last part of `V`. Working on ints rather than characters is what makes `0.9` roll over to `0.10`. Bumping the last part of `~=2.2` (giving `<2.3`) is the most common mistake: that would be `~=2.2.0`.",
    code: {
      starter: src`
def expand_spec(spec):
    return spec

print(expand_spec("~=2.2"))
print(expand_spec("~=1.4.5, !=1.4.7"))
print(expand_spec("==3.1.*"))
`,
      answer: src`
def bump(parts):
    numbers = [int(p) for p in parts]
    numbers[-1] += 1
    return ".".join([str(n) for n in numbers])

def expand_one(condition):
    if condition.startswith("~="):
        parts = condition[2:].strip().split(".")
        if len(parts) < 2:
            raise ValueError(f"~= needs at least two version parts: {condition}")
        return f">={'.'.join(parts)},<{bump(parts[:-1])}"
    if condition.startswith("==") and condition.endswith(".*"):
        parts = condition[2:-2].strip().split(".")
        return f">={'.'.join(parts)},<{bump(parts)}"
    return condition

def expand_spec(spec):
    expanded = []
    for condition in spec.split(","):
        condition = condition.replace(" ", "")
        if condition:
            expanded.append(expand_one(condition))
    return ",".join(expanded)

print(expand_spec("~=2.2"))
print(expand_spec("~=1.4.5, !=1.4.7"))
print(expand_spec("==3.1.*"))
`,
      alternatives: [
        src`
import re

def expand_spec(spec):
    out = []
    for raw in spec.split(","):
        cond = raw.strip().replace(" ", "")
        if not cond:
            continue
        m = re.fullmatch(r"~=([\d.]+)", cond)
        w = re.fullmatch(r"==([\d.]+)\.\*", cond)
        if m:
            nums = [int(x) for x in m.group(1).split(".")]
            if len(nums) < 2:
                raise ValueError("bad ~=")
            upper = nums[:-1]
            upper[-1] += 1
            out.append(">=" + m.group(1) + ",<" + ".".join(map(str, upper)))
        elif w:
            nums = [int(x) for x in w.group(1).split(".")]
            nums[-1] += 1
            out.append(">=" + w.group(1) + ",<" + ".".join(map(str, nums)))
        else:
            out.append(cond)
    return ",".join(out)
`,
      ],
      wrong: [
        {
          code: src`
def expand_spec(spec):
    expanded = []
    for condition in spec.split(","):
        condition = condition.strip()
        if condition.startswith("~="):
            parts = [int(p) for p in condition[2:].split(".")]
            if len(parts) < 2:
                raise ValueError("bad")
            upper = parts[:]
            upper[-1] += 1
            expanded.append(">=" + condition[2:] + ",<" + ".".join([str(p) for p in upper]))
        elif condition.startswith("==") and condition.endswith(".*"):
            parts = [int(p) for p in condition[2:-2].split(".")]
            parts[-1] += 1
            expanded.append(">=" + condition[2:-2] + ",<" + ".".join([str(p) for p in parts]))
        elif condition:
            expanded.append(condition)
    return ",".join(expanded)
`,
          fails: ["returns"],
          why: "for `~=` it bumps the last part, so `~=2.2` becomes `<2.3` instead of `<3`",
        },
        {
          code: src`
def expand_spec(spec):
    expanded = []
    for condition in spec.split(","):
        if condition.startswith("~="):
            parts = condition[2:].split(".")
            parts = parts[:-1]
            parts[-1] = str(int(parts[-1]) + 1)
            expanded.append(">=" + condition[2:] + ",<" + ".".join(parts))
        elif condition.startswith("==") and condition.endswith(".*"):
            parts = condition[2:-2].split(".")
            parts[-1] = str(int(parts[-1]) + 1)
            expanded.append(">=" + condition[2:-2] + ",<" + ".".join(parts))
        else:
            expanded.append(condition)
    return ",".join(expanded)
`,
          fails: ["returns"],
          why: "spaces after the commas stay in, so `!=1.4.7` arrives as ` !=1.4.7` and isn't expanded either",
        },
        {
          code: src`
def expand_spec(spec):
    expanded = []
    for condition in spec.split(","):
        condition = condition.strip()
        if condition.startswith("~="):
            parts = condition[2:].split(".")
            upper = [int(p) for p in parts[:-1]] or [int(parts[0])]
            upper[-1] += 1
            expanded.append(">=" + condition[2:] + ",<" + ".".join([str(p) for p in upper]))
        elif condition.startswith("==") and condition.endswith(".*"):
            parts = [int(p) for p in condition[2:-2].split(".")]
            parts[-1] += 1
            expanded.append(">=" + condition[2:-2] + ",<" + ".".join([str(p) for p in parts]))
        elif condition:
            expanded.append(condition)
    return ",".join(expanded)
`,
          fails: ["returns"],
          why: "a one-part `~=2` is quietly accepted instead of raising ValueError",
        },
      ],
      task: {
        checks: [
          fn("returns", "expand_spec", [
            example(["~=2.2"], ">=2.2,<3"),
            example(["~=1.4.5, !=1.4.7"], ">=1.4.5,<1.5,!=1.4.7"),
            example(["==3.1.*"], ">=3.1,<3.2"),
            hiddenCase("a spec with nothing to expand", [">=2.31, <3"], ">=2.31,<3"),
            hiddenCase("a zero minor version", ["~=0.9.1"], ">=0.9.1,<0.10"),
            hiddenCase("a one-part wildcard", ["==2.*"], ">=2,<3"),
            raisesCase(["~=4"], "ValueError", { label: "a one-part ~= version" }),
            hiddenCase("an empty spec", [""], ""),
            hiddenCase("a two-digit part that rolls over", ["~=1.19.3,==1.*"], ">=1.19.3,<1.20,>=1,<2"),
          ], { label: "expand_spec() rewrites ~= and == .* into plain conditions" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-19 testing, medium
  {
    id: "PY-Q30-19",
    version: 2,
    slug: "tests-for-version-checks",
    title: "Tests that catch broken version checks",
    format: "testing",
    difficulty: "medium",
    minutes: 15,
    requires: ["assert-stmt", "assignment", "boolean", "class-def", "comment", "comment-out", "comparison", "for-loop", "function-def", "import-module", "list-literal", "membership", "test-func", "top-level-indent", "unittest-case"],
    prompt: "`versions.py` holds `satisfies(version, spec)`, the deploy script's version check: every comma-separated condition must hold, versions compare as numbers, and missing parts count as zeros (`2.0` equals `2.0.0`). It is about to be refactored. Write unittest tests that pass on the current, correct version and would catch the mistakes such a rewrite typically introduces.",
    spec: [
      ["Write", "tests in a `unittest.TestCase` class (or top-level `test_` functions with `assert`) that call `satisfies`"],
      ["Rules", "operators `>=`, `<=`, `==`, `!=`, `>`, `<`; all conditions must hold; `\"\"` accepts anything"],
      ["Graded", "your tests run against the correct `satisfies` and against several broken versions; don't call the tests yourself"],
    ],
    hiddenKinds: ["a version that compares as text", "a version that doesn't pad with zeros", "a version that checks only the first condition", "a version where < also accepts the boundary"],
    hints: [
      "For each rule in the spec, ask what a broken version would get wrong, then pick an input where right and wrong give different answers.",
      "Text comparison and missing-zero padding only show up on particular versions: think of `2.10` against `2.9`, and `2.0.0` against `==2.0`.",
      "Include a case where the first condition passes and a later one fails, and one exactly on a strict `<` boundary.",
    ],
    explanation: "A test catches a defect only when the defect changes the answer for that input. `satisfies(\"2.10\", \">=2.9\")` is True for the numeric rule and False for text comparison. `satisfies(\"2.0.0\", \"==2.0\")` is True only with zero padding. `satisfies(\"3.1\", \">=2,<3\")` is False only when every condition is checked. `satisfies(\"3.0\", \"<3\")` is False only when `<` is strict. Tests that only try comfortable values in the middle of a range pass on all of the broken versions too.",
    code: {
      starter: src`
import unittest
from versions import satisfies

class SatisfiesTests(unittest.TestCase):
    def test_inside_range(self):
        self.assertTrue(satisfies("2.31.0", ">=2.28,<3"))

# Add tests that would fail on a broken satisfies(). Check runs them for you.
`,
      answer: src`
import unittest
from versions import satisfies

class SatisfiesTests(unittest.TestCase):
    def test_inside_range(self):
        self.assertTrue(satisfies("2.31.0", ">=2.28,<3"))

    def test_numbers_not_text(self):
        self.assertTrue(satisfies("2.10", ">=2.9"))

    def test_missing_parts_are_zero(self):
        self.assertTrue(satisfies("2.0.0", "==2.0"))

    def test_every_condition_must_hold(self):
        self.assertFalse(satisfies("3.1", ">=2,<3"))

    def test_less_than_is_strict(self):
        self.assertFalse(satisfies("3.0", "<3"))

    def test_empty_spec(self):
        self.assertTrue(satisfies("0.1", ""))
`,
      alternatives: [
        src`
from versions import satisfies

def test_table():
    cases = [
        ("2.10.1", ">=2.9", True),
        ("2.0", "==2.0.0", True),
        ("2.5", ">=2,<3,!=2.5", False),
        ("3", "<3.0", False),
        ("1.2.3", "", True),
    ]
    for version, spec, expected in cases:
        assert satisfies(version, spec) == expected, (version, spec)
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from versions import satisfies

class SatisfiesTests(unittest.TestCase):
    def test_inside_range(self):
        self.assertTrue(satisfies("2.31.0", ">=2.28,<3"))

    def test_below_range(self):
        self.assertFalse(satisfies("1.5.0", ">=2.28,<3"))
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "only comfortable values are tried, so every broken version passes too",
        },
        {
          code: src`
import unittest
from versions import satisfies

class SatisfiesTests(unittest.TestCase):
    def test_numbers_not_text(self):
        self.assertTrue(satisfies("2.10", ">=2.9"))

    def test_padding(self):
        self.assertFalse(satisfies("2.0.0", "==2.0"))
`,
          fails: ["tests-correct", "tests-2"],
          why: "the padding test expects the wrong answer: it fails on the correct function and passes on the version that forgets the zeros",
        },
      ],
      task: {
        files: { "versions.py": VERSIONS_PY },
        checks: hideDefects(learnerTests("tests", {
          target: "satisfies",
          correct: VERSIONS_PY,
          defects: [
            { label: "a version that compares as text", code: VERSIONS_PY.replace("result = _compare(version, condition[len(op):].strip())", "other = condition[len(op):].strip()\n        result = (version > other) - (version < other)") },
            { label: "a version that doesn't pad with zeros", code: VERSIONS_PY.replace("    x += [0] * (size - len(x))\n    y += [0] * (size - len(y))\n", "") },
            { label: "a version that checks only the first condition", code: VERSIONS_PY.replace("        if not ok:\n            return False\n    return True", "        return ok\n    return True") },
            { label: "a version where < also accepts the boundary", code: VERSIONS_PY.replace('"<": result < 0', '"<": result <= 0') },
          ],
        })),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-20 function implementation, hard
  {
    id: "PY-Q30-20",
    version: 2,
    slug: "choose-newest-allowed-versions",
    title: "Choose the newest allowed versions",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["aggregate-call", "all-call", "arithmetic", "assignment", "boolean", "comp-if", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "nested-loop", "none-value", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "A small installer must decide which version of each package to install. Write `choose_versions(requirements, available)`: for every package named in the requirements, pick the **newest** version on the index that satisfies **all** of that package's requirements. A package can be required more than once (for example `numpy>=1.26` from the project and `numpy<2` from a plugin): both must hold.",
    spec: [
      ["Function", "`choose_versions(requirements, available)`"],
      ["requirements", "strings such as `\"Requests>=2.31\"`, `\"pandas>=2.2,<3\"`, `\"rich\"`; operators `>=`, `<=`, `==`, `!=`, `>`, `<`"],
      ["available", "a dictionary from package name to the list of versions on the index, in no particular order"],
      ["Returns", "a dictionary from the normalised name (lower case, runs of `-_.` as `-`) to the chosen version text, or `None` when no version fits or the package isn't on the index"],
      ["Versions", "compare as numbers part by part, missing parts counting as zero"],
    ],
    hiddenKinds: ["a package required twice", "versions listed out of order", "equality that needs zero padding", "no version fits", "a package missing from the index", "an excluded newest version", "names written in different styles"],
    hints: [
      "Two steps: gather every spec per normalised package name (a package can have several), then pick a version for each package.",
      "Check a candidate against all of its package's specs; among the candidates that pass, keep the largest by numeric comparison.",
      "Compare versions as lists of ints padded with zeros to the same length; `max` over text would pick `2.9` over `2.10`.",
    ],
    explanation: "Grouping specs by normalised name first means a package required twice is checked against both requirements instead of the second overwriting the first. Each candidate is tested against every condition with numeric, zero-padded comparison, and the newest passing one wins, which needs a real comparison, not the order of the list and not text. Packages that have no passing version, or aren't on the index at all, map to None so the caller can report them.",
    code: {
      starter: src`
import re

def choose_versions(requirements, available):
    return {}

index = {"requests": ["2.30.0", "2.31.0", "2.32.3"], "numpy": ["1.26.4", "2.1.0", "1.25.2"]}
print(choose_versions(["requests>=2.31", "numpy>=1.26", "numpy<2"], index))
`,
      answer: src`
import re

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def as_numbers(version, size):
    numbers = [int(p) for p in version.split(".")]
    return numbers + [0] * (size - len(numbers))

def compare(a, b):
    size = max(len(a.split(".")), len(b.split(".")))
    x, y = as_numbers(a, size), as_numbers(b, size)
    return (x > y) - (x < y)

def satisfies(version, spec):
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        op = condition[:2] if condition[:2] in [">=", "<=", "==", "!="] else condition[:1]
        result = compare(version, condition[len(op):].strip())
        ok = {">=": result >= 0, "<=": result <= 0, "==": result == 0, "!=": result != 0, ">": result > 0, "<": result < 0}[op]
        if not ok:
            return False
    return True

def choose_versions(requirements, available):
    specs = {}
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement.strip()).group()
        if normalize(name) not in specs:
            specs[normalize(name)] = []
        specs[normalize(name)].append(requirement.strip()[len(name):])
    index = {normalize(name): versions for name, versions in available.items()}
    chosen = {}
    for name, package_specs in specs.items():
        best = None
        for version in index.get(name, []):
            if all([satisfies(version, spec) for spec in package_specs]):
                if best is None or compare(version, best) > 0:
                    best = version
        chosen[name] = best
    return chosen

index = {"requests": ["2.30.0", "2.31.0", "2.32.3"], "numpy": ["1.26.4", "2.1.0", "1.25.2"]}
print(choose_versions(["requests>=2.31", "numpy>=1.26", "numpy<2"], index))
`,
      alternatives: [
        src`
import re

def key(version, size=4):
    parts = [int(p) for p in version.split(".")]
    return parts + [0] * (size - len(parts))

def ok(version, condition):
    m = re.fullmatch(r"\s*(>=|<=|==|!=|>|<)\s*([\d.]+)\s*", condition)
    if m is None:
        return True
    op, other = m.groups()
    a, b = key(version), key(other)
    return {">=": a >= b, "<=": a <= b, "==": a == b, "!=": a != b, ">": a > b, "<": a < b}[op]

def choose_versions(requirements, available):
    wanted = {}
    for req in requirements:
        m = re.match(r"\s*([A-Za-z0-9._-]+)(.*)", req)
        name = re.sub(r"[-_.]+", "-", m.group(1)).lower()
        wanted[name] = wanted.get(name, []) + [c for c in m.group(2).split(",") if c.strip()]
    on_index = {re.sub(r"[-_.]+", "-", n).lower(): v for n, v in available.items()}
    result = {}
    for name, conditions in wanted.items():
        fits = [v for v in on_index.get(name, []) if all([ok(v, c) for c in conditions])]
        result[name] = max(fits, key=key) if fits else None
    return result
`,
      ],
      wrong: [
        {
          code: src`
import re

def choose_versions(requirements, available):
    chosen = {}
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement).group()
        key = re.sub(r"[-_.]+", "-", name).lower()
        spec = requirement[len(name):]
        fits = []
        for version in available.get(name, []):
            good = True
            for condition in spec.split(","):
                condition = condition.strip()
                if condition.startswith(">=") and version < condition[2:]:
                    good = False
                if condition.startswith("<") and not condition.startswith("<=") and version >= condition[1:]:
                    good = False
            if good:
                fits.append(version)
        chosen[key] = max(fits) if fits else None
    return chosen
`,
          fails: ["returns"],
          why: "versions are compared and maximised as text, and a second requirement for the same package replaces the first",
        },
        {
          code: src`
import re

def normalize(name):
    return re.sub(r"[-_.]+", "-", name).lower()

def compare(a, b):
    x = [int(p) for p in a.split(".")]
    y = [int(p) for p in b.split(".")]
    size = max(len(x), len(y))
    x += [0] * (size - len(x))
    y += [0] * (size - len(y))
    return (x > y) - (x < y)

def satisfies(version, spec):
    for condition in spec.split(","):
        condition = condition.strip()
        if not condition:
            continue
        op = condition[:2] if condition[:2] in [">=", "<=", "==", "!="] else condition[:1]
        result = compare(version, condition[len(op):].strip())
        if not {">=": result >= 0, "<=": result <= 0, "==": result == 0, "!=": result != 0, ">": result > 0, "<": result < 0}[op]:
            return False
    return True

def choose_versions(requirements, available):
    index = {normalize(name): versions for name, versions in available.items()}
    chosen = {}
    for requirement in requirements:
        name = re.match(r"[A-Za-z0-9._-]+", requirement.strip()).group()
        spec = requirement.strip()[len(name):]
        chosen[normalize(name)] = None
        for version in index.get(normalize(name), []):
            if satisfies(version, spec):
                chosen[normalize(name)] = version
                break
    return chosen
`,
          fails: ["returns"],
          why: "it takes the first version in the index's order that fits, not the newest, and a repeated package keeps only its last requirement",
        },
      ],
      task: {
        checks: [
          fn("returns", "choose_versions", [
            example([["requests>=2.31", "numpy>=1.26", "numpy<2"], { requests: ["2.30.0", "2.31.0", "2.32.3"], numpy: ["1.26.4", "2.1.0", "1.25.2"] }], { requests: "2.32.3", numpy: "1.26.4" }),
            example([["pandas>=2.2,<3"], { pandas: ["2.2.2", "3.0.1", "2.1.4", "2.10.0"] }], { pandas: "2.10.0" }),
            example([["rich"], { rich: ["13.7.1", "13.10.0", "12.6.0"] }], { rich: "13.10.0" }),
            hiddenCase("a package required twice", [["click>=8", "click<8.1"], { click: ["8.1.7", "8.0.4", "7.1.2", "8.0.10"] }], { click: "8.0.10" }),
            hiddenCase("equality that needs zero padding", [["attrs==23.2"], { attrs: ["23.2.0", "23.1.0"] }], { attrs: "23.2.0" }),
            hiddenCase("no version fits", [["numpy>=3"], { numpy: ["1.26.4", "2.1.0"] }], { numpy: null }),
            hiddenCase("a package missing from the index", [["polars>=1", "rich"], { rich: ["13.7.1"] }], { polars: null, rich: "13.7.1" }),
            hiddenCase("an excluded newest version", [["urllib3>=2,!=2.2.2"], { urllib3: ["2.2.2", "2.2.1", "2.0.7"] }], { urllib3: "2.2.1" }),
            hiddenCase("names written in different styles", [["Market_Reports>1.4", "zope.interface"], { "market-reports": ["1.4.0", "1.4.2"], "Zope-Interface": ["6.4", "5.5.2"] }], { "market-reports": "1.4.2", "zope-interface": "6.4" }),
          ], { label: "choose_versions() picks the newest version allowed by every requirement" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q30-22 output prediction, hard
  {
    id: "PY-Q30-22",
    version: 2,
    slug: "nested-with-conn",
    title: "Predict: a with conn: inside a with conn:",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 10,
    requires: ["assignment", "except-type", "function-def", "function-param", "import-module", "list-index", "list-literal", "print-call", "print-text", "sql-param", "sql-tx", "sqlite-call", "string-index", "top-level-indent", "try-except", "with-statement"],
    prompt: "`take` uses `with conn:` to make its update safe, and one caller wraps it in its own `with a:` block. Predict exactly what this program prints. Note which values the second connection, `b`, can see.",
    spec: [
      ["Watch", "the CHECK constraint, which block rolls back what, and what `b` can see before a commit"],
    ],
    hiddenKinds: [],
    hints: [
      "`take(a, \"SPO-65611\", 3)` commits on its own. Write down both stock levels after it.",
      "A connection has one transaction at a time. When the inner `with conn:` rolls back, it rolls back everything pending on that connection, including the outer block's update.",
      "`b` sees only committed data; the last UPDATE is never committed before `b` reads, and `rollback` then undoes it.",
    ],
    explanation: "After the first `take`, SPO-65611 has 2 units, committed. In the second block, `+10` makes TOY-54564 12 (pending), then `take(…, 20)` fails the CHECK. The inner `with conn:` rolls back the connection's whole transaction, so the +10 is undone too: `with conn:` blocks are not nested transactions. The error leaves both blocks and prints `refused`. The UPDATE to 1 is pending, so `b` still reads `[(2,), (2,)]` (rows ordered by sku: SPO before TOY). `rollback` undoes it, and the sum is 2 + 2 = 4.",
    predict: {
      program: src`
import sqlite3

a = sqlite3.connect("stock.db")
a.execute("CREATE TABLE stock (sku TEXT PRIMARY KEY, units INTEGER CHECK (units >= 0))")
a.executemany("INSERT INTO stock VALUES (?, ?)", [("TOY-54564", 2), ("SPO-65611", 5)])
a.commit()
b = sqlite3.connect("stock.db")

def take(conn, sku, n):
    with conn:
        conn.execute("UPDATE stock SET units = units - ? WHERE sku = ?", (n, sku))

take(a, "SPO-65611", 3)
try:
    with a:
        a.execute("UPDATE stock SET units = units + 10 WHERE sku = 'TOY-54564'")
        take(a, "TOY-54564", 20)
except sqlite3.IntegrityError:
    print("refused")
a.execute("UPDATE stock SET units = 1 WHERE sku = 'SPO-65611'")
print(b.execute("SELECT units FROM stock ORDER BY sku").fetchall())
a.rollback()
print(a.execute("SELECT SUM(units) FROM stock").fetchone()[0])
`,
      output: "refused\n[(2,), (2,)]\n4\n",
      wrongPredictions: ["refused\n[(2,), (12,)]\n14\n", "refused\n[(1,), (2,)]\n3\n", "[(2,), (2,)]\n4\n", "refused\n[(2,), (2,)]\n3\n"],
    },
  },
];
