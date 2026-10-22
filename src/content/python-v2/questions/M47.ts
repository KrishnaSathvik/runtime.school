/**
 * M47 practice: ten independent problems on writing secure Python (Runtime Market data and small fixtures).
 * Allow-list validation, secrets in connection strings and signatures, SQL injection fixed against a real SQLite table,
 * data loaded without running anything, and paths kept inside their folder. Attacks in the hidden tests are real and
 * harmless: injected SQL runs against in-memory tables, and escaping paths are only resolved, never written outside.
 * Version 2: replaces ten placeholder questions about fixed SKU strings.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, learnerTests, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");
const lines = (...l: string[]) => l.join("\n");
const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, raises: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
/** Marks the learnerTests defect checks listed by number as hidden. */
const hideDefects = (checks: ReturnType<typeof learnerTests>, numbers: number[]) =>
  checks.map((c) => (numbers.some((n) => c.id === `tests-${n}`) ? { ...c, hidden: true } : c));

/** In-memory customers table `_c` with R01-style rows, one with a quote in the email. */
const customersDb = lines(
  "import sqlite3 as _sq",
  "_c = _sq.connect(':memory:')",
  "_c.execute('CREATE TABLE customers (customer_id TEXT, email TEXT, state TEXT)')",
  "_c.executemany('INSERT INTO customers VALUES (?, ?, ?)', [('C00038', 'nora_garcia@fastmail.com', 'NY'), ('C00077', 'jamal.walker62@icloud.com', 'TX'), ('C00412', \"liam.o'brien@gmail.com\", 'MA')])",
);
/** In-memory products table `_c`. */
const productsDb = lines(
  "import sqlite3 as _sq",
  "_c = _sq.connect(':memory:')",
  "_c.execute('CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL, stock INTEGER)')",
  "_c.executemany('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)', [('SPO-11681', 'Ultra Bike Light', 'sports', 7.49, 4.1, 12), ('SPO-61044', 'Travel Yoga Mat', 'sports', 50.99, 4.6, 7), ('HOM-22847', 'Deluxe Vase', 'home', 31.0, 4.4, 0), ('ELE-24781', 'Organic Speaker', 'electronics', 171.99, 3.8, 4), ('ELE-01243', 'Pocket Charger', 'electronics', 80.99, 4.6, 9)])",
);

export const m47Questions: PyQuestion[] = [
  {
    id: "PY-Q47-02",
    version: 2,
    slug: "mask-a-connection-string",
    title: "Mask the password in a connection string",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "function-def", "function-param", "function-return", "if-statement", "logical", "membership", "print-call", "print-text", "string-format", "string-index", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "Startup logs print the database URL so operators can see which database the app uses. The URL contains the password. Write a function that masks the password and keeps everything else.",
    spec: [
      ["Function", "`mask_url(url)`"],
      ["Shape", "`scheme://user:password@host...`; the part before the **last** `@` after `://` is `user:password`, split at the **first** `:`"],
      ["Returns", "the same URL with the password replaced by `****`; a URL with no `@`, or with no `:` in the user part, is returned unchanged"],
    ],
    hiddenKinds: ["a password containing @", "a password containing a colon", "a URL with a user but no password", "a URL with no credentials", "an empty password"],
    hints: [
      "Split off the scheme at `://` first, so its colon isn't mistaken for the user/password separator.",
      "Passwords may contain `@`; the host can't, so split the rest at the last `@` (`rpartition`).",
      "Only the text after the first `:` of the user part is the password; rebuild the URL around `****`.",
    ],
    explanation: "`partition(\"://\")` separates the scheme; `rpartition(\"@\")` finds the last `@`, because a password may contain `@` but a host can't; `partition(\":\")` on the user part splits at the first colon, so a password with colons stays whole. When either separator is missing there is no password to hide. Wrong answers split at the first `@` (leaking the end of such a password) or replace every `:` part.",
    code: {
      starter: src`
def mask_url(url):
    return url

print(mask_url("postgresql://market:s3cr3t-Pa55@db.internal:5432/shop"))
`,
      answer: src`
def mask_url(url):
    scheme, sep, rest = url.partition("://")
    if not sep:
        return url
    userinfo, at, host = rest.rpartition("@")
    if not at:
        return url
    user, colon, password = userinfo.partition(":")
    if not colon:
        return url
    return f"{scheme}://{user}:****@{host}"

print(mask_url("postgresql://market:s3cr3t-Pa55@db.internal:5432/shop"))
`,
      alternatives: [
        src`
def mask_url(url):
    if "://" not in url or "@" not in url.split("://", 1)[1]:
        return url
    scheme, rest = url.split("://", 1)
    at = rest.rindex("@")
    userinfo, host = rest[:at], rest[at + 1:]
    if ":" not in userinfo:
        return url
    user = userinfo[:userinfo.index(":")]
    return scheme + "://" + user + ":****@" + host
`,
      ],
      wrong: [
        {
          code: src`
def mask_url(url):
    scheme, rest = url.split("://", 1)
    if "@" not in rest:
        return url
    userinfo, host = rest.split("@", 1)
    if ":" not in userinfo:
        return url
    user = userinfo.split(":")[0]
    return f"{scheme}://{user}:****@{host}"
`,
          fails: ["returns"],
          why: "splitting at the first `@` leaves the end of a password containing `@` in the host part, so it is printed",
        },
        {
          code: src`
def mask_url(url):
    if "@" not in url:
        return url
    head, host = url.rsplit("@", 1)
    scheme_user = head.rsplit(":", 1)[0]
    return f"{scheme_user}:****@{host}"
`,
          fails: ["returns"],
          why: "it splits the password at its last colon, so part of a password containing `:` is still shown, and a user without a password gets a fake one",
        },
      ],
      task: {
        checks: [
          fn("returns", "mask_url", [
            example(["postgresql://market:s3cr3t-Pa55@db.internal:5432/shop"], "postgresql://market:****@db.internal:5432/shop"),
            example(["sqlite:///data/shop.db"], "sqlite:///data/shop.db"),
            example(["redis://cache:hunter2@10.0.0.7:6379/0"], "redis://cache:****@10.0.0.7:6379/0"),
            hiddenCase("a password containing @", ["postgresql://ops:p@ss@w0rd@db.internal/shop"], "postgresql://ops:****@db.internal/shop"),
            hiddenCase("a password containing a colon", ["mysql://app:a:b:c@db:3306/x"], "mysql://app:****@db:3306/x"),
            hiddenCase("a URL with a user but no password", ["postgresql://readonly@db.internal/shop"], "postgresql://readonly@db.internal/shop"),
            hiddenCase("a URL with no credentials", ["https://api.example.com/v1"], "https://api.example.com/v1"),
            hiddenCase("an empty password", ["ftp://anon:@files.example.com"], "ftp://anon:****@files.example.com"),
          ], { label: "mask_url() hides only the password" }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-03",
    version: 2,
    slug: "customer-lookup-injection",
    title: "Fix the customer lookup",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "conditional-expr", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-index", "list-literal", "membership", "none-value", "print-call", "print-several", "print-text", "sqlite-call", "string-format", "string-index", "top-level-indent"],
    prompt: "Support reports two problems with the \"find customer by email\" tool: it crashes for Liam O'Brien, and a tester typing `x' OR '1'='1` into the box was shown every customer. Fix `find_customer` so both stop happening and normal lookups still work.",
    spec: [
      ["Function", "`find_customer(conn, email)`"],
      ["Table", "`customers (customer_id, email, state)`"],
      ["Returns", "the `customer_id` of the customer with exactly that email, or `None`"],
    ],
    hiddenKinds: ["an email with a quote in it", "an injection attempt", "an email nobody has"],
    hints: [
      "Both symptoms have one cause: the email becomes part of the SQL text.",
      "A quote in the email ends the SQL string early; the injection uses that on purpose.",
      "Write `?` in the SQL and pass the email in a one-item tuple as the second argument.",
    ],
    explanation: "Pasting the email into the SQL lets a quote end the string: O'Brien's address produces a syntax error and the tester's text adds `OR '1'='1`, which matches every row (the first row is returned). With `email = ?` and `(email,)`, the email is a value that can't change the query. Doubling quotes by hand is a fragile half-fix.",
    code: {
      starter: src`
import sqlite3

def find_customer(conn, email):
    row = conn.execute(f"SELECT customer_id FROM customers WHERE email = '{email}'").fetchone()
    return row[0] if row else None

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT, email TEXT, state TEXT)")
conn.executemany("INSERT INTO customers VALUES (?, ?, ?)", [
    ("C00038", "nora_garcia@fastmail.com", "NY"),
    ("C00412", "liam.o'brien@gmail.com", "MA"),
])
print(find_customer(conn, "nora_garcia@fastmail.com"))
print(find_customer(conn, "x' OR '1'='1"))
`,
      answer: src`
import sqlite3

def find_customer(conn, email):
    row = conn.execute("SELECT customer_id FROM customers WHERE email = ?", (email,)).fetchone()
    return row[0] if row else None

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT, email TEXT, state TEXT)")
conn.executemany("INSERT INTO customers VALUES (?, ?, ?)", [
    ("C00038", "nora_garcia@fastmail.com", "NY"),
    ("C00412", "liam.o'brien@gmail.com", "MA"),
])
print(find_customer(conn, "nora_garcia@fastmail.com"))
print(find_customer(conn, "x' OR '1'='1"))
`,
      alternatives: [
        src`
def find_customer(conn, email):
    cursor = conn.execute("SELECT customer_id FROM customers WHERE email = :email", {"email": email})
    for (customer_id,) in cursor:
        return customer_id
    return None
`,
      ],
      wrong: [
        {
          code: src`
def find_customer(conn, email):
    cleaned = email.replace("'", "")
    row = conn.execute(f"SELECT customer_id FROM customers WHERE email = '{cleaned}'").fetchone()
    return row[0] if row else None
`,
          fails: ["quote"],
          why: "removing quotes stops the crash and the injection, but O'Brien's real address is never found",
        },
        {
          code: src`
def find_customer(conn, email):
    try:
        row = conn.execute(f"SELECT customer_id FROM customers WHERE email = '{email}'").fetchone()
    except Exception:
        return None
    return row[0] if row else None
`,
          fails: ["quote", "injection"],
          why: "hiding the error doesn't fix the query: O'Brien still isn't found and the injection still matches",
        },
      ],
      task: {
        checks: [
          expr("returns", "a normal lookup works", lines(customersDb, "result = find_customer(_c, 'jamal.walker62@icloud.com')"), "C00077", { show: "find_customer(conn, 'jamal.walker62@icloud.com')" }),
          expr("quote", "an email with a quote in it", lines(customersDb, "result = find_customer(_c, \"liam.o'brien@gmail.com\")"), "C00412", { hidden: true }),
          expr("injection", "an injection attempt", lines(customersDb, "result = find_customer(_c, \"x' OR '1'='1\")"), null, { hidden: true }),
          expr("unknown", "an email nobody has", lines(customersDb, "result = find_customer(_c, 'nobody@example.com')"), null, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-06",
    version: 2,
    slug: "five-digit-zip",
    title: "Read the five-digit ZIP from a postcode field",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["all-call", "assignment", "comparison", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "logical", "match-case", "membership", "none-value", "print-call", "print-text", "string-index", "string-slice", "top-level-indent"],
    prompt: "The checkout form accepts a US postcode typed by the customer. The shipping provider's API takes only the five-digit ZIP. Accept the two US formats exactly, return the five-digit part, and return `None` for anything else, so a malformed value never reaches the API.",
    spec: [
      ["Function", "`zip5(text)`"],
      ["Accepts", "five ASCII digits (`02139`), or five digits, a hyphen and four digits (`02139-4307`)"],
      ["Returns", "the five-digit ZIP as text (`\"02139\"` for both examples); `None` when spaces, letters, other digit scripts or anything extra make the text invalid"],
    ],
    hiddenKinds: ["four digits", "a trailing newline", "digits from another script", "a ZIP with a space instead of a hyphen", "an empty text", "letters"],
    hints: [
      "The whole text must fit, so use the function that matches the entire string.",
      "Put the five digits in their own group, and make the hyphen-and-four-digits part an optional group.",
      "Write `[0-9]` rather than `\\d`, which also matches other scripts' digits.",
    ],
    explanation: "A full match of `([0-9]{5})(-[0-9]{4})?` describes both formats and nothing else, and the first group is the ZIP to return. `re.match` or `re.search` accept extra text (or a trailing newline with `$`), and `\\d` accepts digits like `٠٢١٣٩`.",
    code: {
      starter: src`
import re

def zip5(text):
    return None

print(zip5("02139"), zip5("02139-4307"), zip5("2139"))
`,
      answer: src`
import re

def zip5(text):
    match = re.fullmatch(r"([0-9]{5})(-[0-9]{4})?", text)
    if match is None:
        return None
    return match.group(1)

print(zip5("02139"), zip5("02139-4307"), zip5("2139"))
`,
      alternatives: [
        src`
DIGITS = set("0123456789")

def all_digits(part, size):
    return len(part) == size and all(ch in DIGITS for ch in part)

def zip5(text):
    if len(text) == 5 and all_digits(text, 5):
        return text
    if len(text) == 10 and text[5] == "-" and all_digits(text[:5], 5) and all_digits(text[6:], 4):
        return text[:5]
    return None
`,
      ],
      wrong: [
        {
          code: src`
import re

def zip5(text):
    match = re.fullmatch(r"(\d{5})(-\d{4})?", text)
    return match.group(1) if match else None
`,
          fails: ["returns"],
          why: "`\\d` accepts digits from other scripts, which the shipping API can't read",
        },
        {
          code: src`
import re

def zip5(text):
    match = re.match(r"([0-9]{5})(-[0-9]{4})?$", text)
    return match.group(1) if match else None
`,
          fails: ["returns"],
          why: "`$` also matches just before a final newline, so `\"02139\\n\"` is accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "zip5", [
            example(["02139"], "02139"),
            example(["02139-4307"], "02139"),
            example(["2139"], null),
            example(["02139-43"], null),
            hiddenCase("four digits", ["1234"], null),
            hiddenCase("a trailing newline", ["02139\n"], null),
            hiddenCase("digits from another script", ["٠٢١٣٩"], null),
            hiddenCase("a ZIP with a space instead of a hyphen", ["02139 4307"], null),
            hiddenCase("an empty text", [""], null),
            hiddenCase("letters", ["SW1A 1AA"], null),
          ], { label: "zip5() returns the ZIP only for the two US formats" }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-10",
    version: 2,
    slug: "safe-upload-names",
    title: "Allow only safe upload names",
    format: "validation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "boolean", "comparison", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "logical", "membership", "none-value", "print-call", "print-several", "set-literal", "string-index", "string-method", "string-split", "top-level-indent"],
    prompt: "Sellers upload product photos and spec sheets, and the original file name is kept. Before a name is stored, check it against the shop's rules so it can never contain a path, a hidden-file name or an unexpected file type.",
    spec: [
      ["Function", "`upload_name_ok(name)`"],
      ["Rules", "1 to 64 characters; only letters `A-Z`/`a-z`, digits, `_`, `-` and `.`; must not start with `.`; exactly one `.`, followed by an extension"],
      ["Extensions", "`jpg`, `jpeg`, `png` or `pdf`, in any case (`PNG` is fine)"],
      ["Returns", "`True` when every rule holds, otherwise `False`"],
    ],
    hiddenKinds: ["a name with a folder", "a hidden-file name", "two extensions", "an extension in capitals", "a 65-character name", "a name with a space", "a name with no extension"],
    hints: [
      "Check the characters with a full-match allow-list first; a `/` or a space fails there.",
      "Split at the dot: exactly two parts, the first non-empty (that also rules out a leading dot).",
      "Compare the lower-cased extension with the allowed set, and check the overall length.",
    ],
    explanation: "A character allow-list rules out slashes, backslashes, spaces and control characters in one step. Requiring exactly one dot rules out `invoice.pdf.exe`-style double extensions, and a non-empty part before it rules out hidden files like `.htaccess`. Wrong answers usually check only `endswith` an extension (accepting `../x.png`) or forget the case-insensitive comparison.",
    code: {
      starter: src`
import re

def upload_name_ok(name):
    return True

for name in ["SPO-11681_front.jpg", "spec-sheet.PDF", "../../etc/passwd", "photo.png.exe"]:
    print(name, upload_name_ok(name))
`,
      answer: src`
import re

EXTENSIONS = {"jpg", "jpeg", "png", "pdf"}

def upload_name_ok(name):
    if not 1 <= len(name) <= 64:
        return False
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        return False
    parts = name.split(".")
    if len(parts) != 2 or not parts[0]:
        return False
    return parts[1].lower() in EXTENSIONS

for name in ["SPO-11681_front.jpg", "spec-sheet.PDF", "../../etc/passwd", "photo.png.exe"]:
    print(name, upload_name_ok(name))
`,
      alternatives: [
        src`
import re

def upload_name_ok(name):
    return len(name) <= 64 and re.fullmatch(r"[A-Za-z0-9_-]+\.(?i:jpe?g|png|pdf)", name) is not None
`,
      ],
      wrong: [
        {
          code: src`
def upload_name_ok(name):
    return len(name) <= 64 and name.lower().endswith((".jpg", ".jpeg", ".png", ".pdf"))
`,
          fails: ["returns"],
          why: "only the ending is checked, so `../../x.png` and `photo.exe.png` are accepted",
        },
        {
          code: src`
import re

def upload_name_ok(name):
    if not 1 <= len(name) <= 64 or not re.fullmatch(r"[A-Za-z0-9_.-]+", name):
        return False
    stem, dot, ext = name.rpartition(".")
    return bool(stem) and ext in {"jpg", "jpeg", "png", "pdf"}
`,
          fails: ["returns"],
          why: "upper-case extensions are refused and names with two dots are accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "upload_name_ok", [
            example(["SPO-11681_front.jpg"], true),
            example(["spec-sheet.PDF"], true),
            example(["../../etc/passwd"], false),
            example(["photo.png.exe"], false),
            hiddenCase("a name with a folder", ["images/front.png"], false),
            hiddenCase("a hidden-file name", [".htaccess.png"], false),
            hiddenCase("two extensions", ["invoice.pdf.jpg"], false),
            hiddenCase("an extension in capitals", ["BACK.JPEG"], true),
            hiddenCase("a 65-character name", [`${"a".repeat(61)}.png`], false),
            hiddenCase("a name with a space", ["my photo.png"], false),
            hiddenCase("a name with no extension", ["readme"], false),
          ], { label: "upload_name_ok() applies every rule" }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-12",
    version: 2,
    slug: "signatures-and-masks",
    title: "Signatures and masks",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "comparison", "import-module", "len-call", "print-call", "print-several", "print-text", "repro-run", "secret-handling", "string-method", "string-slice"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "A SHA-256 digest is 32 bytes; as hex text that is two characters per byte.",
      "HMAC with the same key over the same bytes always gives the same digest; one extra byte changes it completely.",
      "`compare_digest` compares exactly: hex in capitals is a different text.",
    ],
    explanation: "`hexdigest()` of SHA-256 is 64 hex characters and is deterministic, so recomputing it gives an equal text. `compare_digest` is an exact comparison (in constant time), so the upper-case copy and the digest of a body with one extra space both compare unequal. The mask keeps only the last four characters.",
    predict: {
      program: src`
import hashlib
import hmac

secret = b"whsec_7f3a9c2e"
body = b'{"order_id": "O100282", "status": "paid"}'
signature = hmac.new(secret, body, hashlib.sha256).hexdigest()

print(len(signature), signature == hmac.new(secret, body, hashlib.sha256).hexdigest())
print(hmac.compare_digest(signature, signature.upper()))
print(hmac.compare_digest(signature, hmac.new(secret, body + b" ", hashlib.sha256).hexdigest()))
print("****" + "sk_live_51HxQe2Kd9f2a"[-4:])
`,
      output: "64 True\nFalse\nFalse\n****9f2a\n",
      wrongPredictions: ["32 True\nFalse\nFalse\n****9f2a", "64 True\nTrue\nFalse\n****9f2a", "64 False\nFalse\nFalse\n****9f2a", "64 True\nFalse\nTrue\n****9f2a"],
    },
  },
  {
    id: "PY-Q47-13",
    version: 2,
    slug: "sort-that-never-sorts",
    title: "The sort that never sorts",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "dict-literal", "else-clause", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "logical", "membership", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "sqlite-call", "string-format", "string-index", "top-level-indent"],
    prompt: "A developer \"secured\" the product listing by passing the sort column as a placeholder. No injection is possible any more, but customers complain that sorting by price or rating does nothing: products always come back in the order they were added. Fix `top_products` so the chosen sort really works and stays safe.",
    spec: [
      ["Function", "`top_products(conn, sort, limit)`"],
      ["sort", "`\"price\"` (cheapest first), `\"rating\"` (best first) or `\"name\"` (A to Z); anything else raises `ValueError`"],
      ["Returns", "up to `limit` SKUs in that order; ties are broken by SKU"],
    ],
    hiddenKinds: ["sorting by rating with a tie", "sorting by name", "a sort value with SQL in it", "a limit larger than the table"],
    hints: [
      "Run the starter: what does `ORDER BY ?` sort by when the placeholder is the text `'price'`?",
      "A column name is part of the query's structure, so it can't be a placeholder value.",
      "Map each allowed sort to SQL you wrote (direction included) and refuse anything not in the map; the limit can stay a placeholder.",
    ],
    explanation: "`ORDER BY ?` binds the text `'price'` as a value: every row has the same sort key, so the original order remains. Identifiers must be written into the SQL, which is only safe when they come from your own allow-list, here a dictionary from the request's word to `price ASC`, `rating DESC` or `name ASC`. Pasting the request's text after checking it with `in` also works but couples the URL to the schema; pasting it unchecked brings the injection back.",
    code: {
      starter: src`
import sqlite3

def top_products(conn, sort, limit):
    rows = conn.execute("SELECT sku FROM products ORDER BY ?, sku LIMIT ?", (sort, limit)).fetchall()
    return [row[0] for row in rows]

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6, 7),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4, 0),
])
print(top_products(conn, "price", 3))
`,
      answer: src`
import sqlite3

ORDER = {"price": "price ASC", "rating": "rating DESC", "name": "name ASC"}

def top_products(conn, sort, limit):
    if sort not in ORDER:
        raise ValueError(f"cannot sort by {sort!r}")
    sql = f"SELECT sku FROM products ORDER BY {ORDER[sort]}, sku LIMIT ?"
    return [row[0] for row in conn.execute(sql, (limit,)).fetchall()]

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6, 7),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4, 0),
])
print(top_products(conn, "price", 3))
`,
      alternatives: [
        src`
def top_products(conn, sort, limit):
    if sort == "price":
        order = "price"
    elif sort == "rating":
        order = "rating DESC"
    elif sort == "name":
        order = "name"
    else:
        raise ValueError("unknown sort")
    rows = conn.execute("SELECT sku FROM products ORDER BY " + order + ", sku LIMIT ?", [limit])
    return [sku for (sku,) in rows]
`,
      ],
      wrong: [
        {
          code: src`
def top_products(conn, sort, limit):
    sql = f"SELECT sku FROM products ORDER BY {sort}, sku LIMIT ?"
    return [row[0] for row in conn.execute(sql, (limit,)).fetchall()]
`,
          fails: ["rating", "injection"],
          why: "pasting the request's text sorts, but rating comes out worst first and any SQL can be injected again",
        },
        {
          code: src`
ORDER = {"price": "price", "rating": "rating", "name": "name"}

def top_products(conn, sort, limit):
    if sort not in ORDER:
        raise ValueError("unknown sort")
    sql = f"SELECT sku FROM products ORDER BY {ORDER[sort]}, sku LIMIT ?"
    return [row[0] for row in conn.execute(sql, (limit,)).fetchall()]
`,
          fails: ["rating"],
          why: "rating is sorted lowest first, but \"best first\" needs `DESC`",
        },
      ],
      task: {
        checks: [
          expr("returns", "sorting by price, cheapest first", lines(productsDb, "result = top_products(_c, 'price', 3)"), ["SPO-11681", "HOM-22847", "SPO-61044"], { show: "top_products(conn, 'price', 3)" }),
          expr("rating", "sorting by rating with a tie", lines(productsDb, "result = top_products(_c, 'rating', 3)"), ["ELE-01243", "SPO-61044", "HOM-22847"], { hidden: true }),
          expr("name", "sorting by name", lines(productsDb, "result = top_products(_c, 'name', 2)"), ["HOM-22847", "ELE-24781"], { hidden: true }),
          expr("injection", "a sort value with SQL in it", lines(
            productsDb,
            "try:",
            "    top_products(_c, 'price; DROP TABLE products; --', 1)",
            "    _ok = False",
            "except ValueError:",
            "    _ok = True",
            "except Exception:",
            "    _ok = False",
            "result = (_ok, _c.execute('SELECT COUNT(*) FROM products').fetchone()[0])",
          ), py.tuple(py.bool(true), py.int(5)), { hidden: true }),
          expr("big-limit", "a limit larger than the table", lines(productsDb, "result = len(top_products(_c, 'price', 50))"), 5, { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-16",
    version: 2,
    slug: "parse-a-money-amount",
    title: "Parse a money amount from a form",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "comparison", "decimal-call", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "logical", "print-call", "print-text", "raise-stmt", "string-check", "string-format", "top-level-indent", "tuple-unpack"],
    prompt: "The refund form has an amount field. `Decimal()` and `float()` both accept far more than a refund amount (`1e3`, `NaN`, `Infinity`, `-5`, `  12`), so read the text against a strict allow-list and return an exact `Decimal`.",
    spec: [
      ["Function", "`parse_amount(text)`"],
      ["Format", "1 to 5 ASCII digits, optionally a `.` and 1 or 2 more digits: `12`, `12.5`, `12.50`"],
      ["Range", "more than 0 and at most 10000"],
      ["Returns", "the amount as a `Decimal` (`Decimal(\"12.50\")` for `\"12.50\"`)"],
      ["Raises", "`ValueError` for anything else"],
    ],
    hiddenKinds: ["NaN", "a negative amount", "zero", "the maximum amount", "just over the maximum", "a padded amount"],
    hints: [
      "Check the text's shape before converting: a full match on digits, then an optional group of a dot and one or two digits.",
      "Convert with `Decimal(text)` only after the shape is right; then check the range.",
      "`Decimal(\"0.00\")` is a valid number but not a valid refund.",
    ],
    explanation: "The pattern `[0-9]{1,5}(\\.[0-9]{1,2})?` is the allow-list for the text, so `1e3`, `NaN`, signs, spaces and a third decimal place never reach `Decimal`. The range check then rules out zero and amounts over 10000. Converting through `float` would lose exactness, and checking only the range lets `Decimal(\"1e3\")` through.",
    code: {
      starter: src`
import re
from decimal import Decimal

def parse_amount(text):
    return Decimal(text)

print(parse_amount("35.84"))
`,
      answer: src`
import re
from decimal import Decimal

def parse_amount(text):
    if not re.fullmatch(r"[0-9]{1,5}(\.[0-9]{1,2})?", text):
        raise ValueError(f"not an amount: {text!r}")
    amount = Decimal(text)
    if not Decimal("0") < amount <= Decimal("10000"):
        raise ValueError(f"amount out of range: {text}")
    return amount

print(parse_amount("35.84"))
`,
      alternatives: [
        src`
from decimal import Decimal

def parse_amount(text):
    whole, dot, cents = text.partition(".")
    if not (1 <= len(whole) <= 5 and whole.isascii() and whole.isdigit()):
        raise ValueError("bad amount")
    if dot and not (1 <= len(cents) <= 2 and cents.isascii() and cents.isdigit()):
        raise ValueError("bad amount")
    value = Decimal(text)
    if value <= 0 or value > 10000:
        raise ValueError("bad amount")
    return value
`,
      ],
      wrong: [
        {
          code: src`
from decimal import Decimal, InvalidOperation

def parse_amount(text):
    try:
        amount = Decimal(text)
    except InvalidOperation:
        raise ValueError("not a number")
    if not 0 < amount <= 10000:
        raise ValueError("out of range")
    return amount
`,
          fails: ["rejects"],
          why: "the range check alone lets `1e3`, padded text and three decimal places through",
        },
        {
          code: src`
import re
from decimal import Decimal

def parse_amount(text):
    if not re.fullmatch(r"[0-9]{1,5}(\.[0-9]{1,2})?", text):
        raise ValueError("bad amount")
    return Decimal(text)
`,
          fails: ["rejects"],
          why: "the shape is checked but not the range, so `0` and `99999` are accepted",
        },
      ],
      task: {
        checks: [
          expr("returns", "parse_amount() returns exact Decimals", "result = [(type(parse_amount(_t)).__name__, str(parse_amount(_t))) for _t in ['35.84', '12.5', '7']]", [py.tuple(py.str("Decimal"), py.str("35.84")), py.tuple(py.str("Decimal"), py.str("12.5")), py.tuple(py.str("Decimal"), py.str("7"))], { show: "parse_amount('35.84'), parse_amount('12.5'), parse_amount('7')" }),
          expr("maximum", "the maximum amount", "result = str(parse_amount('10000.00'))", "10000.00", { hidden: true }),
          fn("rejects", "parse_amount", [
            raisesCase(["abc"], "ValueError"),
            raisesCase(["1e3"], "ValueError"),
            raisesCase(["NaN"], "ValueError", { label: "NaN" }),
            raisesCase(["-5"], "ValueError", { label: "a negative amount" }),
            raisesCase(["12.505"], "ValueError"),
            raisesCase(["0.00"], "ValueError", { label: "zero" }),
            raisesCase(["10000.01"], "ValueError", { label: "just over the maximum" }),
            raisesCase([" 12"], "ValueError", { label: "a padded amount" }),
          ], { label: "parse_amount() refuses everything that isn't a valid refund amount" }),
        ],
      },
    },
  },
  {
    id: "PY-Q47-19",
    version: 2,
    slug: "test-the-path-guard",
    title: "Test the path guard",
    format: "testing",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assert-stmt", "assignment", "boolean", "class-def", "comparison", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "logical", "membership", "module-file", "path-call", "precedence", "raise-stmt", "safe-path", "string-format", "string-index", "test-func", "top-level-indent", "try-except", "unittest-case", "with-statement"],
    prompt: "`safe_join(base, name)` guards every download: it returns the resolved path of `name` inside `base`, and raises `ValueError` when the result would be outside `base`. Write unittest tests (or `test_` functions) that pass for a correct guard and catch broken ones. Leave the calls to Check: don't run the tests yourself.",
    spec: [
      ["Target", "`safe_join(base, name)` → resolved `Path` inside `base`, or `ValueError`"],
      ["Your tests", "a `unittest.TestCase` class or `test_` functions in your file; the starter's guard is correct, so your tests should pass on it"],
      ["Graded", "your tests must pass for a correct guard and fail for each of three broken guards"],
    ],
    hiddenKinds: ["a guard that only looks for `..` in the text", "a guard that compares path strings with startswith", "a guard that never resolves the path"],
    hints: [
      "Each broken guard misses a different kind of escape; think of every way a name can leave the folder.",
      "Try an absolute name, a sibling folder whose name starts like the base (`downloads_old`), and a climb hidden in the middle of a name.",
      "Also keep one test that a normal name is accepted, so a guard that refuses everything fails.",
    ],
    explanation: "Three tests catch the three defects: an absolute name (no `..` in it) catches the text check; a sibling such as `../downloads_old/x` resolves to a path whose string starts with the base's string, which catches `startswith`; and `a/../../x` stays lexically under the base until it is resolved, which catches the guard that never calls `resolve()`. A test of a normal name keeps the suite honest.",
    code: {
      starter: src`
import unittest
from pathlib import Path

def safe_join(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"{name!r} is outside {base}")
    return target

class SafeJoinTest(unittest.TestCase):
    def test_plain_name(self):
        self.assertEqual(safe_join("downloads", "invoice.pdf").name, "invoice.pdf")
`,
      answer: src`
import unittest
from pathlib import Path

def safe_join(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"{name!r} is outside {base}")
    return target

class SafeJoinTest(unittest.TestCase):
    def test_plain_name(self):
        self.assertEqual(safe_join("downloads", "invoice.pdf").name, "invoice.pdf")

    def test_absolute_name(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "/etc/passwd")

    def test_sibling_with_similar_name(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "../downloads_old/secret.txt")

    def test_climb_inside_the_name(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "reports/../../app/settings.py")
`,
      alternatives: [
        src`
from pathlib import Path

def safe_join(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError("outside")
    return target

def refused(name):
    try:
        safe_join("files", name)
    except ValueError:
        return True
    return False

def test_guard():
    assert safe_join("files", "a/b.csv").name == "b.csv"
    for name in ["/var/log/syslog", "../files2/x", "x/../../y"]:
        assert refused(name), name
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from pathlib import Path

def safe_join(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError("outside")
    return target

class SafeJoinTest(unittest.TestCase):
    def test_plain_name(self):
        self.assertEqual(safe_join("downloads", "invoice.pdf").name, "invoice.pdf")

    def test_parent(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "../secret.txt")
`,
          fails: ["tests-1", "tests-2"],
          why: "the only escape tested is a plain `../`, which the text check and the `startswith` guard also refuse",
        },
        {
          code: src`
import unittest
from pathlib import Path

def safe_join(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError("outside")
    return target

class SafeJoinTest(unittest.TestCase):
    def test_absolute_name(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "/etc/passwd")

    def test_climb_inside_the_name(self):
        with self.assertRaises(ValueError):
            safe_join("downloads", "reports/../../app/settings.py")
`,
          fails: ["tests-2"],
          why: "no test uses a sibling folder whose name starts like the base, so the `startswith` guard passes",
        },
      ],
      task: {
        checks: hideDefects(learnerTests("tests", {
          target: "safe_join",
          correct: "from pathlib import Path\ndef safe_join(base, name):\n    root = Path(base).resolve()\n    target = (root / name).resolve()\n    if not target.is_relative_to(root):\n        raise ValueError('outside')\n    return target\n",
          defects: [
            { label: "a guard that only looks for `..` in the text", code: "from pathlib import Path\ndef safe_join(base, name):\n    if '..' in name:\n        raise ValueError('outside')\n    return (Path(base).resolve() / name).resolve()\n" },
            { label: "a guard that compares path strings with startswith", code: "from pathlib import Path\ndef safe_join(base, name):\n    root = Path(base).resolve()\n    target = (root / name).resolve()\n    if not str(target).startswith(str(root)):\n        raise ValueError('outside')\n    return target\n" },
            { label: "a guard that never resolves the path", code: "from pathlib import Path\ndef safe_join(base, name):\n    root = Path(base)\n    target = root / name\n    if not target.is_relative_to(root):\n        raise ValueError('outside')\n    return target\n" },
          ],
        }), [2, 3]),
      },
    },
  },
  {
    id: "PY-Q47-20",
    version: 2,
    slug: "make-data-json-safe",
    title: "Make a record JSON-safe",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 20,
    requires: ["any-call", "arithmetic", "assignment", "conversion", "decimal-call", "dict-comp", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "json-dumps", "list-comp", "list-mutate", "list-sort", "logical", "map-call", "membership", "nested-condition", "nested-dict", "none-value", "print-call", "raise-stmt", "set-literal", "string-format", "string-index", "top-level-indent", "truthiness", "type-call"],
    prompt: "Records leave the shop as JSON: order exports, webhook payloads, cache files. Instead of letting `json.dumps` fail deep inside a request, convert each record into plain JSON values first, explicitly, and refuse anything that has no agreed form.",
    spec: [
      ["Function", "`to_json_safe(value)`, nested to any depth"],
      ["Conversions", "`Decimal` → `str`; `datetime` and `date` → `isoformat()`; `set`/`frozenset` → sorted list; `tuple` → list; dicts and lists are converted item by item"],
      ["Unchanged", "`str`, `int`, `float`, `bool` and `None`"],
      ["Raises", "`TypeError` for a dict key that isn't a `str`, and for any other type (e.g. an object of your own class)"],
      ["Rule", "the input is not changed"],
    ],
    hiddenKinds: ["a set of tags", "a date without a time", "a tuple inside a list", "a dict with a number as key", "an object of another class", "deep nesting"],
    hints: [
      "One function that looks at the type of its value and calls itself for the parts of dictionaries, lists, tuples and sets.",
      "Check `datetime` and `date` before anything generic; `bool` is fine as it is.",
      "Build new dicts and lists; raise `TypeError` at the end when no rule matched.",
    ],
    explanation: "Each type gets an explicit, reversible rule, and the recursion handles any nesting. Raising for unknown types (instead of `str()`-ing them) keeps surprises out of exported data. Typical wrong answers convert `Decimal` to `float`, losing exactness, or modify the dictionary they were given.",
    code: {
      starter: src`
import json
from datetime import date, datetime
from decimal import Decimal

def to_json_safe(value):
    return value

order = {"order_id": "O100282", "total": Decimal("35.84"), "placed": datetime(2025, 3, 3, 9, 15), "tags": {"gift", "express"}}
print(json.dumps(to_json_safe(order)))
`,
      answer: src`
import json
from datetime import date, datetime
from decimal import Decimal

def to_json_safe(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        safe = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise TypeError(f"key {key!r} is not text")
            safe[key] = to_json_safe(item)
        return safe
    if isinstance(value, (list, tuple)):
        return [to_json_safe(item) for item in value]
    if isinstance(value, (set, frozenset)):
        return sorted(to_json_safe(item) for item in value)
    raise TypeError(f"cannot convert {type(value).__name__}")

order = {"order_id": "O100282", "total": Decimal("35.84"), "placed": datetime(2025, 3, 3, 9, 15), "tags": {"gift", "express"}}
print(json.dumps(to_json_safe(order)))
`,
      alternatives: [
        src`
from datetime import date
from decimal import Decimal

def to_json_safe(value):
    kind = type(value)
    if value is None or kind in (str, int, float, bool):
        return value
    if kind is Decimal:
        return str(value)
    if isinstance(value, date):
        return value.isoformat()
    if kind is dict:
        if any(type(k) is not str for k in value):
            raise TypeError("dict keys must be text")
        return {k: to_json_safe(v) for k, v in value.items()}
    if kind in (list, tuple):
        return list(map(to_json_safe, value))
    if kind in (set, frozenset):
        return sorted(map(to_json_safe, value))
    raise TypeError("unsupported " + kind.__name__)
`,
      ],
      wrong: [
        {
          code: src`
from datetime import date, datetime
from decimal import Decimal

def to_json_safe(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: to_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [to_json_safe(v) for v in value]
    return value
`,
          fails: ["returns", "sets", "refuses", "nested"],
          why: "money becomes a float, sets come out in no fixed order, and unknown types pass through to break `json.dumps` later",
        },
        {
          code: src`
from datetime import date, datetime
from decimal import Decimal

def to_json_safe(value):
    if isinstance(value, dict):
        for key in value:
            if not isinstance(key, str):
                raise TypeError("bad key")
            value[key] = to_json_safe(value[key])
        return value
    if isinstance(value, (list, tuple)):
        return [to_json_safe(v) for v in value]
    if isinstance(value, (set, frozenset)):
        return sorted(to_json_safe(v) for v in value)
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    raise TypeError("unsupported")
`,
          fails: ["keeps-input"],
          why: "it writes the converted values back into the caller's dictionary",
        },
      ],
      task: {
        checks: [
          expr("returns", "an order with money, a time and a set", lines(
            "from datetime import datetime as _dt",
            "from decimal import Decimal as _D",
            "result = to_json_safe({'order_id': 'O100282', 'total': _D('35.84'), 'placed': _dt(2025, 3, 3, 9, 15), 'items': 2, 'gift': False, 'note': None})",
          ), { order_id: "O100282", total: "35.84", placed: "2025-03-03T09:15:00", items: 2, gift: false, note: null }, { show: "to_json_safe(order)" }),
          expr("sets", "a set of tags", "result = to_json_safe({'tags': {'gift', 'express', 'b2b'}, 'ids': {8, 1}})", { tags: ["b2b", "express", "gift"], ids: [1, 8] }, { hidden: true }),
          expr("nested", "a date and a tuple deep inside lists", lines(
            "from datetime import date as _d",
            "from decimal import Decimal as _D",
            "result = to_json_safe([{'lines': [('SPO-11681', 2, _D('7.49'))], 'ship_by': _d(2025, 3, 5)}])",
          ), [{ lines: [["SPO-11681", 2, "7.49"]], ship_by: "2025-03-05" }], { hidden: true }),
          expr("refuses", "an object of another class, and a number as a dict key", lines(
            "class _Thing:",
            "    pass",
            "_out = []",
            "for _v in [_Thing(), {1: 'a'}]:",
            "    try:",
            "        to_json_safe(_v)",
            "        _out.append('accepted')",
            "    except TypeError:",
            "        _out.append('TypeError')",
            "result = _out",
          ), ["TypeError", "TypeError"], { hidden: true }),
          expr("keeps-input", "the input is left unchanged", lines(
            "from decimal import Decimal as _D",
            "_r = {'total': _D('5.00'), 'tags': {'x'}}",
            "to_json_safe(_r)",
            "result = (type(_r['total']).__name__, type(_r['tags']).__name__)",
          ), py.tuple(py.str("Decimal"), py.str("set"))),
        ],
      },
    },
  },
  {
    id: "PY-Q47-22",
    version: 2,
    slug: "safe-filter-builder",
    title: "Build a safe product filter",
    format: "integration",
    difficulty: "hard",
    minutes: 30,
    requires: ["arithmetic", "assignment", "conditional-expr", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "set-literal", "sqlite-call", "string-format", "top-level-indent", "tuple-literal", "tuple-unpack"],
    prompt: "The admin product search lets staff stack filters like *price < 60* and *category = sports*. Each filter arrives as `(column, operator, value)` from the browser. Write `build_where(filters)` that turns them into a SQL `WHERE` clause and a list of parameters, so that columns and operators come only from allow-lists and every value travels as a parameter.",
    spec: [
      ["Function", "`build_where(filters)` → `(sql, params)`"],
      ["Columns", "`category`, `price`, `rating`, `stock`"],
      ["Operators", "`=`, `<`, `<=`, `>`, `>=`"],
      ["Result", "no filters → `(\"\", [])`; otherwise `\" WHERE \"` followed by `\"<column> <op> ?\"` parts joined with `\" AND \"`, in the filters' order, and the values in the same order"],
      ["Raises", "`ValueError` for a column or operator not in its list"],
      ["Example", "`[(\"price\", \"<\", 60), (\"category\", \"=\", \"sports\")]` → `(' WHERE price < ? AND category = ?', [60, 'sports'])`"],
    ],
    hiddenKinds: ["no filters", "a value with both kinds of quote in it", "an operator with SQL in it", "a column that isn't allowed", "three filters run against the table"],
    hints: [
      "Check each filter's column and operator against their sets before adding anything.",
      "The SQL part you build contains only your column name, your operator and a `?`; the value goes into `params`.",
      "Collect the parts in a list and join them with `\" AND \"` at the end; an empty list means no WHERE at all.",
    ],
    explanation: "The returned SQL can only contain text from two allow-lists plus `?` marks, so no request can add SQL to it; the values reach SQLite separately as parameters. Graded by running the clause against a real table, including values with quotes and operators carrying SQL. Wrong answers paste the value into the SQL or accept any operator.",
    code: {
      starter: src`
import sqlite3

def build_where(filters):
    return "", []

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6, 7),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4, 0),
])
where, params = build_where([("price", "<", 60), ("category", "=", "sports")])
print(where, params)
print(conn.execute("SELECT sku FROM products" + where + " ORDER BY sku", params).fetchall())
`,
      answer: src`
import sqlite3

COLUMNS = {"category", "price", "rating", "stock"}
OPERATORS = {"=", "<", "<=", ">", ">="}

def build_where(filters):
    parts = []
    params = []
    for column, op, value in filters:
        if column not in COLUMNS:
            raise ValueError(f"cannot filter on {column!r}")
        if op not in OPERATORS:
            raise ValueError(f"unknown operator {op!r}")
        parts.append(f"{column} {op} ?")
        params.append(value)
    if not parts:
        return "", []
    return " WHERE " + " AND ".join(parts), params

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL, stock INTEGER)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1, 12),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6, 7),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4, 0),
])
where, params = build_where([("price", "<", 60), ("category", "=", "sports")])
print(where, params)
print(conn.execute("SELECT sku FROM products" + where + " ORDER BY sku", params).fetchall())
`,
      alternatives: [
        src`
def build_where(filters):
    allowed_columns = ("category", "price", "rating", "stock")
    allowed_ops = ("=", "<", "<=", ">", ">=")
    clauses = []
    for column, op, _ in filters:
        if column not in allowed_columns or op not in allowed_ops:
            raise ValueError("filter not allowed")
        clauses.append(column + " " + op + " ?")
    sql = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    return sql, [value for _, _, value in filters]
`,
      ],
      wrong: [
        {
          code: src`
COLUMNS = {"category", "price", "rating", "stock"}
OPERATORS = {"=", "<", "<=", ">", ">="}

def build_where(filters):
    parts = []
    for column, op, value in filters:
        if column not in COLUMNS or op not in OPERATORS:
            raise ValueError("not allowed")
        parts.append(f"{column} {op} {value!r}")
    if not parts:
        return "", []
    return " WHERE " + " AND ".join(parts), []
`,
          fails: ["returns", "quote"],
          why: "the values are pasted into the SQL as Python reprs instead of passed as parameters",
        },
        {
          code: src`
COLUMNS = {"category", "price", "rating", "stock"}

def build_where(filters):
    parts = []
    params = []
    for column, op, value in filters:
        if column not in COLUMNS:
            raise ValueError("not allowed")
        parts.append(f"{column} {op} ?")
        params.append(value)
    if not parts:
        return "", []
    return " WHERE " + " AND ".join(parts), params
`,
          fails: ["operator"],
          why: "the operator isn't checked, so `= ? OR 1=1 OR price =` turns into extra SQL",
        },
      ],
      task: {
        checks: [
          expr("returns", "build_where() builds the starter's clause", "result = build_where([('price', '<', 60), ('category', '=', 'sports')])", py.tuple(py.str(" WHERE price < ? AND category = ?"), pv([60, "sports"])), { show: "build_where([('price', '<', 60), ('category', '=', 'sports')])" }),
          expr("empty", "no filters", "result = build_where([])", py.tuple(py.str(""), pv([])), { hidden: true }),
          expr("runs", "three filters run against the table", lines(
            productsDb,
            "_w, _p = build_where([('rating', '>=', 4.4), ('stock', '>', 0), ('price', '<=', 100)])",
            "result = [_r[0] for _r in _c.execute('SELECT sku FROM products' + _w + ' ORDER BY sku', _p)]",
          ), ["ELE-01243", "SPO-61044"], { hidden: true }),
          expr("quote", "a value with a quote in it", lines(
            productsDb,
            "_c.execute('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?)', ('KID-00118', 'Kite', 'kids\\' \"deluxe\" toys', 9.5, 4.0, 3))",
            "_w, _p = build_where([('category', '=', 'kids\\' \"deluxe\" toys')])",
            "result = [_r[0] for _r in _c.execute('SELECT sku FROM products' + _w, _p)]",
          ), ["KID-00118"], { hidden: true }),
          raisesExpr("operator", "an operator with SQL in it", "build_where([('price', '= 0 OR 1=1 OR price =', 5)])", "ValueError", { hidden: true }),
          raisesExpr("column", "a column that isn't allowed", "build_where([('name; DROP TABLE products', '=', 'x')])", "ValueError", { hidden: true }),
        ],
      },
    },
  },
];
