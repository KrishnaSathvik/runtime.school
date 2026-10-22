/**
 * M47 Secure Python: five lessons (PY-L47-01 … PY-L47-05).
 *
 * Untrusted input checked against allow-lists (L01); secrets kept out of code and logs, compared in constant time and
 * signed with HMAC (L02); SQL injection demonstrated against a real SQLite table, then prevented with placeholders and
 * allow-listed identifiers (L03); why eval and Python's object serialiser must never read untrusted data, and json
 * plus validation instead (L04); and path traversal, including a real zip-slip archive, stopped by resolving inside a
 * base folder (L05).
 *
 * Every attack here is real and harmless: the injected SQL runs against an in-memory database, the malicious payload
 * only calls print, and the escaping paths are resolved, never opened outside the run's folder. Version 2: rewritten
 * from a placeholder module that tested whether a string contained "..".
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
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

/** Python lines that build `_conn`, an in-memory products table with a few R01 rows. */
const productsDb = lines(
  "import sqlite3 as _sq",
  "_conn = _sq.connect(':memory:')",
  "_conn.execute('CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL)')",
  "_conn.executemany('INSERT INTO products VALUES (?, ?, ?, ?, ?)', [('SPO-11681', 'Ultra Bike Light', 'sports', 7.49, 4.1), ('SPO-61044', 'Travel Yoga Mat', 'sports', 50.99, 4.6), ('SPO-65611', 'Studio Tent', 'sports', 45.0, 3.9), ('HOM-22847', 'Deluxe Vase', 'home', 31.0, 4.4), (\"KID-00118\", \"Kite\", \"kids' toys\", 9.5, 4.0)])",
);

export const m47Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L47-01 input safety
  {
    id: "PY-L47-01",
    version: 2,
    slug: "allow-list-input",
    title: "Accept only the input you expect",
    lede: "Anything that comes from outside (a form, a URL, a file, an API) may have been written by someone trying to break your program. Decide exactly what a valid value looks like and reject everything else, instead of trying to clean up what's dangerous.",
    focus: "Validate untrusted input against an allow-list: a full-match pattern, a set of choices or a range, and reject anything else.",
    minutes: 20,
    objectives: [
      "Explain why an allow-list (accept only the known good) is safer than a deny-list (block the known bad)",
      "Check text with `re.fullmatch` and `[0-9]`, not `re.search` or `\\d`, and convert numbers inside `try`",
      "Validate a whole request: known fields only, each with its rule, every problem reported",
    ],
    requires: ["all-call", "any-call", "arithmetic", "assignment", "comp-if", "comparison", "conversion", "dict-get", "dict-literal", "dict-lookup", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "regex-call", "set-literal", "spaces-in-text", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "unicode-text", "unquoted-name"],
    teaches: ["allow-list"],
    blocks: [
      {
        kind: "text",
        md: "Every value that crosses into your program from outside is **untrusted**: a query string, a form field, a row of an uploaded CSV. Most of it is honest; some of it is mistyped; a little of it is built to make your program do something you never intended.\n\nThere are two ways to defend. A **deny-list** blocks values known to be dangerous: no `<script>`, no `;`. It always misses something (`<SCRIPT>`, a look-alike character, a trick nobody thought of yet). An **allow-list** describes what a good value *is* (an order ID is `O` followed by six digits; a sort order is one of three words; a quantity is a whole number from 1 to 99) and rejects everything else. It is shorter, easier to test, and doesn't depend on guessing the attacker's ideas.\n\nTwo details matter with patterns. `re.search` finds a match *anywhere*, so `O100282; DROP TABLE orders` contains a valid ID and passes; `re.fullmatch` requires the whole text to fit. And `\\d` matches any Unicode digit (Arabic-Indic `١٢` too), so write `[0-9]` when you mean the ten ASCII digits.",
      },
      {
        kind: "example",
        title: "search finds a match; fullmatch checks the whole value",
        code: src`
import re

ORDER_ID = r"O[0-9]{6}"
for text in ["O100282", "O100282; DROP TABLE orders", "o100282", " O100282", "O١٠٠٢٨٢"]:
    found = re.search(ORDER_ID, text) is not None
    whole = re.fullmatch(ORDER_ID, text) is not None
    print(repr(text), found, whole)
`,
        output: "'O100282' True True\n'O100282; DROP TABLE orders' True False\n'o100282' False False\n' O100282' True False\n'O١٠٠٢٨٢' False False\n",
        note: "Only `fullmatch` rejects the ID with SQL glued to it and the one with a leading space. Because the pattern says `[0-9]`, the Arabic-Indic digits are rejected too; with `\\d` they would pass, and `int()` would quietly read them as 100282.",
      },
      {
        kind: "text",
        md: "Numbers need the same care. `int()` is generous: it accepts spaces around the digits, a `+` sign and other scripts' digits, and it raises `ValueError` for anything it can't read. Convert inside `try`, then check the range: a quantity of `-3` or `100000` is a valid integer and still not a valid quantity.",
      },
      {
        kind: "error-example",
        title: "Trusting a form field to be a whole number",
        code: src`
form = {"sku": "SPO-11681", "quantity": "2.5"}
quantity = int(form["quantity"])
print("adding", quantity)
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: invalid literal for int() with base 10: '2.5'`. Unhandled, a visitor's typo becomes a crash (and an error page that may show your code). Validation turns it into a clear message to the user.",
      },
      {
        kind: "text",
        md: "A real request has several fields. Validate all of them and report every problem, like a schema check (see Reliable Data Pipelines), but with the stricter attitude of security: **unknown fields are rejected** too, because a field you don't expect (`\"is_admin\": \"true\"`) is exactly how some attacks start.",
      },
      {
        kind: "example",
        title: "Validate an update-order request",
        code: src`
import re

STATUSES = {"processing", "shipped", "cancelled"}
SKU = r"[A-Z]{3}-[0-9]{5}"

def check_update(request):
    errors = []
    for field in request:
        if field not in {"sku", "quantity", "status"}:
            errors.append(f"unknown field {field}")
    if not isinstance(request.get("sku"), str) or not re.fullmatch(SKU, request["sku"]):
        errors.append("sku must look like SPO-11681")
    try:
        quantity = int(request.get("quantity", ""))
    except ValueError:
        errors.append("quantity must be a whole number")
    else:
        if not 1 <= quantity <= 99:
            errors.append("quantity must be 1 to 99")
    if request.get("status") not in STATUSES:
        errors.append("status must be one of " + ", ".join(sorted(STATUSES)))
    return errors

print(check_update({"sku": "SPO-11681", "quantity": "2", "status": "shipped"}))
print(check_update({"sku": "spo-11681", "quantity": "0", "status": "shipped"}))
print(check_update({"sku": "HOM-22847", "quantity": "1", "status": "refunded", "is_admin": "true"}))
`,
        output: "[]\n['sku must look like SPO-11681', 'quantity must be 1 to 99']\n['unknown field is_admin', 'status must be one of cancelled, processing, shipped']\n",
        note: "Every rule is an allow-list: a pattern for the SKU, a range for the quantity, a set for the status, a set of field names for the request itself. Nothing tries to *repair* a value; a bad request is rejected with reasons.",
      },
      {
        kind: "text",
        md: "**When to use it:** at every entry point: web handlers, command-line arguments (see CLI & Automation), uploaded files, messages from other services. **Mistakes to avoid:** `re.search` or `re.match` where you mean the whole value; `\\d` for ASCII digits; deny-lists of bad characters; silently \"fixing\" input (stripping `;` and carrying on) instead of rejecting it; and checking the type but not the range.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Match the whole SKU",
      prompt: "`valid_sku` uses `re.search`, so a SKU with anything glued to it passes. Change it so the whole text must be a SKU.",
      spec: [
        ["Function", "`valid_sku(text)`"],
        ["Returns", "`True` only when the whole text is three capital letters, a dash and five digits"],
      ],
      starter: src`
import re

def valid_sku(text):
    return re.search(r"[A-Z]{3}-[0-9]{5}", text) is not None

print(valid_sku("SPO-11681"), valid_sku("SPO-11681' OR '1'='1"))
`,
      answer: src`
import re

def valid_sku(text):
    return re.fullmatch(r"[A-Z]{3}-[0-9]{5}", text) is not None

print(valid_sku("SPO-11681"), valid_sku("SPO-11681' OR '1'='1"))
`,
      wrong: [
        {
          code: src`
import re

def valid_sku(text):
    return re.match(r"[A-Z]{3}-[0-9]{5}", text) is not None
`,
          fails: ["returns"],
          why: "`re.match` only anchors the start, so text after the SKU still passes",
        },
      ],
      hints: ["`search` looks for the pattern anywhere in the text.", "The `re` module has a function that requires the entire text to fit the pattern.", "Swap the function; the pattern itself is already right."],
      task: {
        checks: [
          fn("returns", "valid_sku", [
            example(["SPO-11681"], true),
            example(["SPO-11681' OR '1'='1"], false),
            hiddenCase("text before the SKU", ["x HOM-22847"], false),
            hiddenCase("a lower-case SKU", ["hom-22847"], false),
            hiddenCase("a trailing newline", ["ELE-24781\n"], false),
          ], { label: "valid_sku() accepts only a complete SKU" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Read the listing page's query parameters",
        prompt: "The product listing reads `page`, `per_page` and `sort` from the URL's query string, so all three arrive as text, typed by anyone. Write `listing_params(query)`: return `{\"page\": int, \"per_page\": int, \"sort\": str}` using the defaults for missing parameters, and raise `ValueError` naming the parameter for any value outside its allow-list, or for a parameter the listing doesn't know.",
        spec: [
          ["Function", "`listing_params(query)`; `query` is a dictionary of texts"],
          ["page", "digits only (`[0-9]+`), value ≥ 1; default `1`"],
          ["per_page", "digits only, 1 to 100; default `20`"],
          ["sort", "one of `\"newest\"`, `\"price\"`, `\"rating\"`; default `\"newest\"`"],
          ["Raises", "`ValueError` whose message contains the bad parameter's name (e.g. `\"per_page must be 1 to 100\"`)"],
          ["Example", "`{\"page\": \"3\", \"sort\": \"price\"}` → `{'page': 3, 'per_page': 20, 'sort': 'price'}`"],
        ],
        starter: src`
import re

def listing_params(query):
    return {"page": 1, "per_page": 20, "sort": "newest"}

print(listing_params({"page": "3", "sort": "price"}))
`,
        answer: src`
import re

SORTS = {"newest", "price", "rating"}

def whole_number(query, name, default):
    text = query.get(name)
    if text is None:
        return default
    if not re.fullmatch(r"[0-9]+", text):
        raise ValueError(f"{name} must be a whole number")
    return int(text)

def listing_params(query):
    for name in query:
        if name not in {"page", "per_page", "sort"}:
            raise ValueError(f"unknown parameter {name}")
    page = whole_number(query, "page", 1)
    if page < 1:
        raise ValueError("page must be 1 or more")
    per_page = whole_number(query, "per_page", 20)
    if not 1 <= per_page <= 100:
        raise ValueError("per_page must be 1 to 100")
    sort = query.get("sort", "newest")
    if sort not in SORTS:
        raise ValueError("sort must be newest, price or rating")
    return {"page": page, "per_page": per_page, "sort": sort}

print(listing_params({"page": "3", "sort": "price"}))
`,
        alternatives: [
          src`
DIGITS = "0123456789"

def number(text, name):
    if text == "" or any(ch not in DIGITS for ch in text):
        raise ValueError("bad " + name)
    return int(text)

def listing_params(query):
    unknown = set(query) - {"page", "per_page", "sort"}
    if unknown:
        raise ValueError("unknown parameter " + sorted(unknown)[0])
    page = number(query.get("page", "1"), "page")
    per_page = number(query.get("per_page", "20"), "per_page")
    sort = query.get("sort", "newest")
    if page < 1:
        raise ValueError("bad page")
    if per_page < 1 or per_page > 100:
        raise ValueError("bad per_page")
    if sort not in ("newest", "price", "rating"):
        raise ValueError("bad sort")
    return {"page": page, "per_page": per_page, "sort": sort}
`,
        ],
        wrong: [
          {
            code: src`
def listing_params(query):
    page = int(query.get("page", "1"))
    per_page = int(query.get("per_page", "20"))
    sort = query.get("sort", "newest")
    if page < 1 or not 1 <= per_page <= 100:
        raise ValueError("page or per_page out of range")
    if sort not in {"newest", "price", "rating"}:
        raise ValueError("bad sort")
    return {"page": page, "per_page": per_page, "sort": sort}
`,
            fails: ["signs", "unknown"],
            why: "`int()` accepts `\" 5\"` and `\"+5\"`, and unknown parameters are silently ignored",
          },
          {
            code: src`
import re

def listing_params(query):
    for name in query:
        if name not in {"page", "per_page", "sort"}:
            raise ValueError(f"unknown parameter {name}")
    page = int(query.get("page", "1")) if re.search(r"[0-9]+", query.get("page", "1")) else 0
    per_page = int(query.get("per_page", "20"))
    if page < 1:
        raise ValueError("page must be 1 or more")
    if not 1 <= per_page <= 100:
        raise ValueError("per_page must be 1 to 100")
    sort = query.get("sort", "newest")
    if sort not in {"newest", "price", "rating"}:
        raise ValueError("sort must be newest, price or rating")
    return {"page": page, "per_page": per_page, "sort": sort}
`,
            fails: ["signs"],
            why: "`re.search` and bare `int()` let padded and signed numbers through",
          },
        ],
        hints: [
          "Handle each parameter on its own: missing → default; present → check the text, convert, check the range.",
          "For digits-only text, a full-match pattern of the ten digit characters is the allow-list; only then convert.",
          "Check the query's keys against the three known names first, so an unexpected parameter is refused.",
        ],
        task: {
          checks: [
            fn("returns", "listing_params", [
              example([{ page: "3", sort: "price" }], { page: 3, per_page: 20, sort: "price" }),
              example([{}], { page: 1, per_page: 20, sort: "newest" }),
              example([{ per_page: "100", sort: "rating" }], { page: 1, per_page: 100, sort: "rating" }),
              raisesCase([{ per_page: "101" }], "ValueError"),
              raisesCase([{ page: "0" }], "ValueError", { label: "page zero" }),
              raisesCase([{ sort: "price; DROP TABLE products" }], "ValueError", { label: "a sort value with SQL glued on" }),
            ], { label: "listing_params() applies defaults and rejects values outside the allow-lists" }),
            fn("signs", "listing_params", [
              raisesCase([{ page: " 5" }], "ValueError", { label: "a padded number" }),
              raisesCase([{ per_page: "+10" }], "ValueError", { label: "a number with a plus sign" }),
            ], { label: "numbers must be plain digits" }),
            fn("unknown", "listing_params", [raisesCase([{ page: "2", is_admin: "1" }], "ValueError", { label: "a parameter the listing doesn't know" })], { label: "unknown parameters are refused" }),
            expr("message", "the error names the bad parameter", "try:\n    listing_params({'per_page': '500'})\n    result = False\nexcept ValueError as _e:\n    result = 'per_page' in str(_e)", true, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Check a product review before storing it",
        prompt: "Reviews are shown to every visitor, so they are checked strictly before they are stored. Write `review_errors(form)`: return a list of every problem with the form (empty when it can be stored).",
        spec: [
          ["Function", "`review_errors(form)`; `form` is a dictionary of texts"],
          ["product_id", "`P` and four digits (`P0205`) → otherwise `\"product_id is invalid\"`"],
          ["rating", "exactly one digit from 1 to 5 → otherwise `\"rating must be 1 to 5\"`"],
          ["text", "after `strip()`, 1 to 500 characters, every one printable (`str.isprintable()`, so no control characters or newlines) → otherwise `\"text must be 1-500 printable characters\"`"],
          ["Other fields", "each one is `\"unexpected field <name>\"`, in the form's order, before the field problems"],
          ["Missing", "a missing field counts as empty text"],
        ],
        starter: src`
import re

def review_errors(form):
    return []

print(review_errors({"product_id": "P0205", "rating": "5", "text": "Bright and easy to fit."}))
print(review_errors({"product_id": "P205", "rating": "6", "text": "  ", "html": "<b>"}))
`,
        answer: src`
import re

def review_errors(form):
    errors = []
    for field in form:
        if field not in {"product_id", "rating", "text"}:
            errors.append(f"unexpected field {field}")
    if not re.fullmatch(r"P[0-9]{4}", form.get("product_id", "")):
        errors.append("product_id is invalid")
    if not re.fullmatch(r"[1-5]", form.get("rating", "")):
        errors.append("rating must be 1 to 5")
    text = form.get("text", "").strip()
    if not 1 <= len(text) <= 500 or not text.isprintable():
        errors.append("text must be 1-500 printable characters")
    return errors

print(review_errors({"product_id": "P0205", "rating": "5", "text": "Bright and easy to fit."}))
print(review_errors({"product_id": "P205", "rating": "6", "text": "  ", "html": "<b>"}))
`,
        alternatives: [
          src`
def review_errors(form):
    errors = [f"unexpected field {k}" for k in form if k not in ("product_id", "rating", "text")]
    pid = form.get("product_id", "")
    if not (len(pid) == 5 and pid[0] == "P" and all(c in "0123456789" for c in pid[1:])):
        errors.append("product_id is invalid")
    if form.get("rating", "") not in ["1", "2", "3", "4", "5"]:
        errors.append("rating must be 1 to 5")
    text = form.get("text", "").strip()
    if len(text) == 0 or len(text) > 500 or not text.isprintable():
        errors.append("text must be 1-500 printable characters")
    return errors
`,
        ],
        wrong: [
          {
            code: src`
import re

def review_errors(form):
    errors = []
    if not re.fullmatch(r"P[0-9]{4}", form.get("product_id", "")):
        errors.append("product_id is invalid")
    try:
        rating = int(form.get("rating", ""))
    except ValueError:
        rating = 0
    if not 1 <= rating <= 5:
        errors.append("rating must be 1 to 5")
    text = form.get("text", "").strip()
    if not 1 <= len(text) <= 500:
        errors.append("text must be 1-500 printable characters")
    return errors
`,
            fails: ["returns", "control", "padded-rating"],
            why: "extra fields are ignored, control characters get through, and `int(\" 4\")` accepts a padded rating",
          },
          {
            code: src`
import re

def review_errors(form):
    errors = []
    for field in form:
        if field not in {"product_id", "rating", "text"}:
            errors.append(f"unexpected field {field}")
    if not re.search(r"P[0-9]{4}", form.get("product_id", "")):
        errors.append("product_id is invalid")
    if not re.fullmatch(r"[1-5]", form.get("rating", "")):
        errors.append("rating must be 1 to 5")
    text = form.get("text", "").strip()
    if not 1 <= len(text) <= 500 or not text.isprintable():
        errors.append("text must be 1-500 printable characters")
    return errors
`,
            fails: ["glued"],
            why: "`re.search` accepts a product ID with extra text around it",
          },
        ],
        hints: [
          "Four independent checks, each appending its own message; the unexpected-field check comes first.",
          "Both the product ID and the rating are short fixed shapes: a full-match pattern each.",
          "For the text, strip first, then test the length and `isprintable()` together.",
        ],
        task: {
          checks: [
            fn("returns", "review_errors", [
              example([{ product_id: "P0205", rating: "5", text: "Bright and easy to fit." }], []),
              example([{ product_id: "P205", rating: "6", text: "  ", html: "<b>" }], ["unexpected field html", "product_id is invalid", "rating must be 1 to 5", "text must be 1-500 printable characters"]),
              example([{ product_id: "P0421", rating: "3" }], ["text must be 1-500 printable characters"]),
              hiddenCase("a 500-character review", [{ product_id: "P0187", rating: "4", text: "a".repeat(500) }], []),
              hiddenCase("a 501-character review", [{ product_id: "P0187", rating: "4", text: "b".repeat(501) }], ["text must be 1-500 printable characters"]),
              hiddenCase("two extra fields", [{ user: "x", product_id: "P0001", rating: "1", text: "ok", admin: "1" }], ["unexpected field user", "unexpected field admin"]),
            ], { label: "review_errors() reports every problem with the form" }),
            fn("control", "review_errors", [hiddenCase("a review with a control character", [{ product_id: "P0001", rating: "2", text: "fine\u0007" }], ["text must be 1-500 printable characters"]), hiddenCase("a review with a newline inside", [{ product_id: "P0001", rating: "2", text: "line one\nline two" }], ["text must be 1-500 printable characters"])], { label: "control characters are refused" }),
            fn("padded-rating", "review_errors", [hiddenCase("a rating with a space", [{ product_id: "P0001", rating: " 4", text: "ok" }], ["rating must be 1 to 5"])], { label: "a rating must be exactly one digit" }),
            fn("glued", "review_errors", [hiddenCase("a product ID with text glued on", [{ product_id: "P0001<script>", rating: "2", text: "ok" }], ["product_id is invalid"])], { label: "the whole product ID must match" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import re

checks = [
    re.fullmatch(r"[0-9]{5}", "02139") is not None,
    re.fullmatch(r"[0-9]{5}", "02139-4307") is not None,
    re.search(r"[0-9]{5}", "02139-4307") is not None,
    int(" +42 ") == 42,
]
print(checks)
`,
        choices: ["[True, False, True, True]", "[True, True, True, True]", "[True, False, True, False]", "[False, False, True, True]"],
        answer: 0,
        why: "`fullmatch` needs the whole text to be five digits, so the ZIP+4 fails; `search` finds five digits inside it. `int()` is forgiving: spaces and a plus sign are accepted, which is why a digits-only pattern comes first when you need plain digits.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a deny-list. What does this print?",
        program: src`
def clean_comment(text):
    for bad in ["<script>", "</script>"]:
        text = text.replace(bad, "")
    return text

print(clean_comment("<SCRIPT>alert(1)</SCRIPT>"))
print(clean_comment("<scr<script>ipt>alert(1)</script>"))
`,
        choices: ["<SCRIPT>alert(1)</SCRIPT>\n<script>alert(1)", "alert(1)\nalert(1)", "<SCRIPT>alert(1)</SCRIPT>\nalert(1)", "alert(1)\n<script>alert(1)"],
        answer: 0,
        why: "Capital letters slip past the list, and removing `<script>` from the middle of `<scr<script>ipt>` rebuilds the very tag it removed. Describing what is allowed avoids this whole game.",
      },
      {
        id: "q3",
        prompt: "A form sends `quantity`. Which check is an allow-list?",
        choices: [
          "The text fully matches `[0-9]{1,2}` and the number is from 1 to 99",
          "The text doesn't contain `;`, `'` or `--`",
          "Any `<` and `>` are removed before converting",
          "`int()` is called and any error is ignored",
        ],
        answer: 0,
        why: "Only the first describes what a good quantity is. The others block or repair a few known bad characters and accept everything else.",
      },
    ],
    review: [
      "Untrusted input is accepted only when it matches what a good value is: a full pattern, a set of choices, a range.",
      "`re.fullmatch` and `[0-9]`, not `re.search`/`re.match` and `\\d`; convert numbers inside `try` and check the range.",
      "Reject unknown fields and bad values with reasons; never \"clean\" dangerous input and carry on.",
      "Next: some values must never appear anywhere, not even in a log. Handling secrets.",
    ],
  },
  // ------------------------------------------------------------------ PY-L47-02 secrets
  {
    id: "PY-L47-02",
    version: 2,
    slug: "keep-secrets-secret",
    title: "Keep secrets out of code and logs",
    lede: "API keys, passwords and signing secrets give whoever holds them your program's power. They come from the environment, never from source code; they never appear in a log or an error message; and they are compared in a way that leaks nothing.",
    focus: "Read secrets from the environment, keep them out of output and logs, verify signatures with HMAC and compare them with `hmac.compare_digest`.",
    minutes: 20,
    objectives: [
      "Read a required secret from `os.environ` and stop at startup when it is missing",
      "Mask secrets in `repr`, logs and error messages; redact them from data before it is written anywhere",
      "Sign and verify a message with `hmac`, comparing with `compare_digest`, and generate tokens with `secrets`",
    ],
    requires: ["any-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comment", "comment-out", "comparison", "conditional-expr", "conversion", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "env-read", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "map-call", "membership", "method-def", "nested-dict", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "repro-run", "self-name", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "tuple-literal", "tuple-unpack", "unquoted-name"],
    teaches: ["secret-handling"],
    blocks: [
      {
        kind: "text",
        md: "A **secret** is a value that grants access: the payment provider's API key, the database password, the key that signs webhooks. Three rules keep them safe.\n\n**Not in the source code.** Code is copied, committed, shared in screenshots and pasted into chats; a key in it is a key published. The deployment platform puts secrets in **environment variables** (see CLI & Automation) and the program reads them at startup. If a required one is missing, the program stops right away with a clear message, rather than running half-configured.\n\n**Not in output.** Logs are kept for months and read by many people. A secret printed once in a debug line is leaked. Objects that hold secrets show a mask in their `repr`.\n\n**Compared carefully.** To check a signature or a token, use `hmac.compare_digest`. Plain `==` stops at the first different character, so how long it takes reveals how much of a guess was right; `compare_digest` takes the same time either way.",
      },
      {
        kind: "example",
        title: "A required secret from the environment",
        code: src`
import os

def require_env(name):
    value = os.environ.get(name, "")
    if not value:
        raise RuntimeError(f"{name} is not set")
    return value

def mask(secret):
    return "****" + secret[-4:]

# On a server the platform sets this; it is set here only because this page has no deployment environment.
os.environ["PAYMENT_API_KEY"] = "sk_live_51HxQe2Kd9f2a"

key = require_env("PAYMENT_API_KEY")
print("payments configured with key", mask(key))
try:
    require_env("SHIPPING_API_KEY")
except RuntimeError as err:
    print("startup stopped:", err)
`,
        output: "payments configured with key ****9f2a\nstartup stopped: SHIPPING_API_KEY is not set\n",
        note: "The log line proves *which* key is in use (its last four characters) without revealing it. The error names the missing variable, never a value. Stopping at startup is far better than failing on the first payment an hour later.",
      },
      {
        kind: "text",
        md: "Reading with `os.environ[name]` also fails for a missing variable, but with a bare `KeyError` and no explanation, and only when that line runs:",
      },
      {
        kind: "error-example",
        title: "A missing secret discovered too late",
        code: src`
import os

def ship(order_id):
    key = os.environ["SHIPPING_API_KEY"]
    return f"label for {order_id}"

print(ship("O100282"))
`,
        error: "KeyError",
        output: "",
        note: "`KeyError: 'SHIPPING_API_KEY'`, raised in the middle of shipping a real order. Read and check every required secret once, at startup.",
      },
      {
        kind: "text",
        md: "Secrets also *verify* things. When the payment provider calls your webhook, how do you know the call is really from them? They sign the body with a shared secret using **HMAC** (a hash keyed by the secret) and send the signature in a header. You compute the same HMAC over the body you received and compare. Change one byte of the body and the signature no longer matches. For tokens you generate yourself (password-reset links, API keys for your users), use the `secrets` module, not `random`, which is predictable.",
      },
      {
        kind: "example",
        title: "Masked settings and a signed webhook",
        code: src`
import hashlib
import hmac
import secrets

class Settings:
    def __init__(self, shop, webhook_secret):
        self.shop = shop
        self.webhook_secret = webhook_secret

    def __repr__(self):
        return f"Settings(shop={self.shop!r}, webhook_secret='****')"

def sign(body, secret):
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

def verify(body, signature, secret):
    return hmac.compare_digest(sign(body, secret), signature)

settings = Settings("runtime-market", "whsec_7f3a9c2e")
print(settings)

body = b'{"payment_id": "PAY0000313", "status": "paid"}'
signature = sign(body, settings.webhook_secret)
print(verify(body, signature, settings.webhook_secret))
print(verify(b'{"payment_id": "PAY0000313", "status": "refunded"}', signature, settings.webhook_secret))

token = secrets.token_hex(16)
print(len(token), token == secrets.token_hex(16))
`,
        output: "Settings(shop='runtime-market', webhook_secret='****')\nTrue\nFalse\n32 False\n",
        note: "Printing or logging the settings object shows the mask, because `print` uses its `repr`. The tampered body fails verification. `token_hex(16)` gives 16 random bytes as 32 hex characters, different on every call.",
      },
      {
        kind: "text",
        md: "**When to use it:** for every credential and every signature check. **Mistakes to avoid:** default values for secrets in code (`os.environ.get(\"KEY\", \"sk_test_...\")`); printing a settings dictionary while debugging; putting a secret in an exception message; `==` to compare signatures; `random` for tokens; and committing a `.env` file.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Show only the end of a key",
      prompt: "`mask` returns the whole secret, so every log line that uses it leaks the key. Return four asterisks followed by the secret's last four characters instead.",
      spec: [
        ["Function", "`mask(secret)`"],
        ["Returns", "`\"****\"` plus the last four characters, whatever the secret's length"],
      ],
      starter: src`
def mask(secret):
    return secret

print("using key", mask("sk_live_51HxQe2Kd9f2a"))
`,
      answer: src`
def mask(secret):
    return "****" + secret[-4:]

print("using key", mask("sk_live_51HxQe2Kd9f2a"))
`,
      wrong: [
        {
          code: src`
def mask(secret):
    return secret[:4] + "****"
`,
          fails: ["returns"],
          why: "it shows the start of the key, which is the same prefix for every key of that kind",
        },
      ],
      hints: ["A slice can take the last few characters of a text.", "Negative positions count from the end.", "Join a fixed `\"****\"` and the slice that starts four from the end."],
      task: {
        checks: [
          fn("returns", "mask", [
            example(["sk_live_51HxQe2Kd9f2a"], "****9f2a"),
            hiddenCase("a short database password", ["hunter2!"], "****er2!"),
            hiddenCase("a webhook secret", ["whsec_7f3a9c2e"], "****9c2e"),
          ], { label: "mask() shows only the last four characters" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Verify a payment webhook",
        prompt: "The payment provider sends each webhook with a header `X-Signature: sha256=<hex>`, where `<hex>` is the HMAC-SHA256 of the raw body bytes keyed with your webhook secret. Write `verify_webhook(body, header, secret)`: return `True` only when the header has the `sha256=` prefix and the rest equals the HMAC you compute. Compare with `hmac.compare_digest`.",
        spec: [
          ["Function", "`verify_webhook(body, header, secret)`"],
          ["body", "the raw request body, as `bytes`"],
          ["header", "the `X-Signature` header text, e.g. `\"sha256=5f0c…\"`"],
          ["secret", "the webhook secret, as text"],
          ["Returns", "`True` or `False`; a header without the `sha256=` prefix is `False`"],
          ["Rule", "compare with `hmac.compare_digest`, never `==`"],
        ],
        starter: src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    return False

secret = "whsec_7f3a9c2e"
body = b'{"payment_id": "PAY0000313", "order_id": "O100282", "status": "paid"}'
header = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
print(verify_webhook(body, header, secret))
print(verify_webhook(body.replace(b"paid", b"void"), header, secret))
`,
        answer: src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    prefix = "sha256="
    if not header.startswith(prefix):
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header[len(prefix):])

secret = "whsec_7f3a9c2e"
body = b'{"payment_id": "PAY0000313", "order_id": "O100282", "status": "paid"}'
header = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
print(verify_webhook(body, header, secret))
print(verify_webhook(body.replace(b"paid", b"void"), header, secret))
`,
        alternatives: [
          src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    scheme, sep, given = header.partition("=")
    if scheme != "sha256" or sep != "=":
        return False
    mac = hmac.new(secret.encode("utf-8"), body, digestmod=hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest().encode(), given.encode())
`,
        ],
        wrong: [
          {
            code: src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return header == "sha256=" + expected
`,
            fails: ["constant-time"],
            why: "`==` stops at the first different character, so response times leak how much of a forged signature is right",
          },
          {
            code: src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    expected = hashlib.sha256(body).hexdigest()
    return hmac.compare_digest(expected, header.removeprefix("sha256="))
`,
            fails: ["returns", "forged"],
            why: "a plain hash without the secret can be computed by anyone, so a forger can sign their own body",
          },
          {
            code: src`
import hashlib
import hmac

def verify_webhook(body, header, secret):
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header[7:])
`,
            fails: ["prefix"],
            why: "it never checks the `sha256=` prefix, so a header claiming another scheme is accepted",
          },
        ],
        hints: [
          "Check the prefix first; then compute the HMAC of the body with the secret as the key.",
          "`hmac.new(key_bytes, body, hashlib.sha256).hexdigest()` gives the hex text to compare with.",
          "The comparison itself must be `hmac.compare_digest(a, b)` on the two hex texts.",
        ],
        task: {
          checks: [
            expr("returns", "a genuine webhook is accepted and a tampered one refused", lines(
              "import hashlib as _h, hmac as _m",
              "_s = 'whsec_7f3a9c2e'",
              "_b = b'{\"payment_id\": \"PAY0000313\", \"order_id\": \"O100282\", \"status\": \"paid\"}'",
              "_hd = 'sha256=' + _m.new(_s.encode(), _b, _h.sha256).hexdigest()",
              "result = (verify_webhook(_b, _hd, _s), verify_webhook(_b.replace(b'paid', b'void'), _hd, _s))",
            ), py.tuple(py.bool(true), py.bool(false)), { show: "verify_webhook(body, header, secret) for the real and a changed body" }),
            expr("forged", "a signature made without the secret", lines(
              "import hashlib as _h",
              "_b = b'{\"payment_id\": \"PAY0000999\", \"status\": \"paid\"}'",
              "result = verify_webhook(_b, 'sha256=' + _h.sha256(_b).hexdigest(), 'whsec_7f3a9c2e')",
            ), false, { hidden: true }),
            expr("wrong-secret", "a signature made with a different secret", lines(
              "import hashlib as _h, hmac as _m",
              "_b = b'{}'",
              "result = verify_webhook(_b, 'sha256=' + _m.new(b'other', _b, _h.sha256).hexdigest(), 'whsec_7f3a9c2e')",
            ), false, { hidden: true }),
            expr("prefix", "a header without the sha256= prefix", lines(
              "import hashlib as _h, hmac as _m",
              "_b = b'{\"x\": 1}'",
              "_d = _m.new(b'k3y', _b, _h.sha256).hexdigest()",
              "result = (verify_webhook(_b, 'sha512=' + _d, 'k3y'), verify_webhook(_b, _d, 'k3y'))",
            ), py.tuple(py.bool(false), py.bool(false)), { hidden: true }),
            expr("constant-time", "the signature is compared with compare_digest", lines(
              "import hashlib as _h, hmac as _m, secrets as _sc",
              "_calls = []",
              "_orig = _m.compare_digest",
              "def _spy(a, b):",
              "    _calls.append(1)",
              "    return _orig(a, b)",
              "_m.compare_digest = _spy",
              "_sc.compare_digest = _spy",
              "try:",
              "    _b = b'{}'",
              "    verify_webhook(_b, 'sha256=' + _m.new(b'k', _b, _h.sha256).hexdigest(), 'k')",
              "finally:",
              "    _m.compare_digest = _orig",
              "    _sc.compare_digest = _orig",
              "result = len(_calls) >= 1",
            ), true),
          ],
        },
      },
      {
        id: "c2",
        title: "Redact secrets before logging a request",
        prompt: "Before a failed API request is written to the error log, every secret in it must be replaced. Write `redact(data)`: return a copy of `data` (dictionaries, lists and plain values, nested to any depth) in which the value of every dictionary key whose name contains `password`, `secret`, `token` or `api_key` (ignoring case) is replaced by `\"****\"`. Everything else is copied unchanged, and the original is not modified.",
        spec: [
          ["Function", "`redact(data)`"],
          ["Secret keys", "any key containing `password`, `secret`, `token` or `api_key`, in any case (`Authorization_Token`, `DB_PASSWORD`)"],
          ["Returns", "a new structure of the same shape; a secret key's value becomes `\"****\"` whatever it held (even a dictionary)"],
          ["Example", "`{\"user\": \"ops\", \"db\": {\"PASSWORD\": \"hunter2\"}}` → `{'user': 'ops', 'db': {'PASSWORD': '****'}}`"],
        ],
        starter: src`
def redact(data):
    return data

request = {
    "url": "https://api.example.com/v1/charges",
    "headers": {"Authorization_Token": "Bearer sk_live_51HxQe2Kd9f2a", "Accept": "application/json"},
    "body": {"order_id": "O100282", "cards": [{"last4": "4242", "cvc_secret": "123"}]},
}
print(redact(request))
`,
        answer: src`
SECRET_WORDS = ("password", "secret", "token", "api_key")

def is_secret(key):
    name = str(key).lower()
    return any(word in name for word in SECRET_WORDS)

def redact(data):
    if isinstance(data, dict):
        clean = {}
        for key, value in data.items():
            clean[key] = "****" if is_secret(key) else redact(value)
        return clean
    if isinstance(data, list):
        return [redact(item) for item in data]
    return data

request = {
    "url": "https://api.example.com/v1/charges",
    "headers": {"Authorization_Token": "Bearer sk_live_51HxQe2Kd9f2a", "Accept": "application/json"},
    "body": {"order_id": "O100282", "cards": [{"last4": "4242", "cvc_secret": "123"}]},
}
print(redact(request))
`,
        alternatives: [
          src`
def redact(data):
    if isinstance(data, list):
        return list(map(redact, data))
    if not isinstance(data, dict):
        return data
    out = {}
    for key in data:
        lowered = key.lower()
        if "password" in lowered or "secret" in lowered or "token" in lowered or "api_key" in lowered:
            out[key] = "****"
        else:
            out[key] = redact(data[key])
    return out
`,
        ],
        wrong: [
          {
            code: src`
def redact(data):
    clean = {}
    for key, value in data.items():
        if any(word in key.lower() for word in ("password", "secret", "token", "api_key")):
            clean[key] = "****"
        else:
            clean[key] = value
    return clean
`,
            fails: ["returns", "lists"],
            why: "only the top level is checked, so a secret inside a nested dictionary is logged",
          },
          {
            code: src`
def redact(data):
    if isinstance(data, dict):
        for key in data:
            if any(word in key.lower() for word in ("password", "secret", "token", "api_key")):
                data[key] = "****"
            else:
                data[key] = redact(data[key])
    elif isinstance(data, list):
        for i in range(len(data)):
            data[i] = redact(data[i])
    return data
`,
            fails: ["keeps-input"],
            why: "it overwrites the secrets in the caller's request, which the retry still needs",
          },
          {
            code: src`
def redact(data):
    if isinstance(data, dict):
        return {k: ("****" if k in ("password", "secret", "token", "api_key") else redact(v)) for k, v in data.items()}
    if isinstance(data, list):
        return [redact(x) for x in data]
    return data
`,
            fails: ["returns", "lists", "case"],
            why: "only keys named exactly `password`, `token`… match, so `DB_PASSWORD` or `Authorization_Token` leak",
          },
        ],
        hints: [
          "The structure can nest to any depth, so the function calls itself on each value it keeps.",
          "Three shapes: a dictionary (check each key, then recurse into the value), a list (recurse into each item), anything else (return it).",
          "Lower-case the key before looking for the four words in it; build new containers instead of assigning into the old ones.",
        ],
        task: {
          checks: [
            fn("returns", "redact", [
              example([{ user: "ops", db: { PASSWORD: "hunter2" } }], { user: "ops", db: { PASSWORD: "****" } }),
              example([{ headers: { Authorization_Token: "Bearer x", Accept: "json" } }], { headers: { Authorization_Token: "****", Accept: "json" } }),
              example([{ order_id: "O100282", total: 35.84 }], { order_id: "O100282", total: 35.84 }),
              hiddenCase("a secret whose value is a dictionary", [{ api_key: { live: "k1", test: "k2" } }], { api_key: "****" }),
              hiddenCase("plain values at the top", [["a", 1, null]], ["a", 1, null]),
            ], { label: "redact() masks every secret key" }),
            fn("lists", "redact", [hiddenCase("secrets inside a list of dictionaries", [{ cards: [{ last4: "4242", cvc_secret: "123" }, { last4: "1881", cvc_secret: "999" }] }], { cards: [{ last4: "4242", cvc_secret: "****" }, { last4: "1881", cvc_secret: "****" }] })], { label: "secrets inside lists are masked" }),
            fn("case", "redact", [hiddenCase("secret words in mixed case inside longer names", [{ Refresh_TOKEN: "r", "x-Client-Secret": "s", note: "token count" }], { Refresh_TOKEN: "****", "x-Client-Secret": "****", note: "token count" })], { label: "key names are matched ignoring case, anywhere in the name" }),
            fn("keeps-input", "redact", [keepsInput([{ headers: { token: "t" }, items: [{ password: "p" }] }], { label: "a nested request" })], { label: "redact() leaves the original request unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class DatabaseUrl:
    def __init__(self, user, password, host):
        self.user = user
        self.password = password
        self.host = host

    def __repr__(self):
        return f"DatabaseUrl({self.user}@{self.host}, password=****)"

url = DatabaseUrl("market", "s3cr3t-Pa55", "db.internal")
print(url)
print([url])
print(len(url.password))
`,
        choices: [
          "DatabaseUrl(market@db.internal, password=****)\n[DatabaseUrl(market@db.internal, password=****)]\n11",
          "DatabaseUrl(market@db.internal, password=s3cr3t-Pa55)\n[DatabaseUrl(market@db.internal, password=****)]\n11",
          "<DatabaseUrl object>\n[DatabaseUrl(market@db.internal, password=****)]\n11",
          "DatabaseUrl(market@db.internal, password=****)\n[<DatabaseUrl object>]\n4",
        ],
        answer: 0,
        why: "Without `__str__`, `print` uses `__repr__`, and a list always shows its items' `repr`. The real password is still there for the code that needs it: 11 characters.",
      },
      {
        id: "q2",
        prompt: "A common mistake: logging the whole settings dictionary while debugging. What does this print?",
        program: src`
settings = {"shop": "runtime-market", "payment_api_key": "sk_live_51HxQe2Kd9f2a"}
print(f"starting with {settings}")
`,
        choices: [
          "starting with {'shop': 'runtime-market', 'payment_api_key': 'sk_live_51HxQe2Kd9f2a'}",
          "starting with {'shop': 'runtime-market', 'payment_api_key': '****'}",
          "starting with settings",
          "starting with {'shop': 'runtime-market'}",
        ],
        answer: 0,
        why: "A plain dictionary has no idea which values are secret. The key is now in every log that keeps this line. Log selected fields, or a settings object whose `repr` masks secrets.",
      },
      {
        id: "q3",
        prompt: "Where should a production API key live?",
        choices: [
          "In an environment variable set by the deployment platform, read once at startup",
          "In a constant at the top of `config.py`, committed with the code",
          "As the default value in `os.environ.get(\"API_KEY\", \"sk_live_...\")`",
          "In a comment next to the code that uses it",
        ],
        answer: 0,
        why: "Anything in the source code, defaults and comments included, is published with the code. The environment keeps the key out of the repository and lets each deployment have its own.",
      },
    ],
    review: [
      "Secrets come from the environment; a missing one stops the program at startup with the variable's name, never a value.",
      "Mask secrets in `repr`, logs and error messages; redact them from data before it is logged.",
      "Verify signatures with HMAC and `hmac.compare_digest`; generate tokens with `secrets`.",
      "Next: data that reaches a database query can attack it. SQL injection, and why placeholders stop it.",
    ],
  },
  // ------------------------------------------------------------------ PY-L47-03 SQL injection
  {
    id: "PY-L47-03",
    version: 2,
    slug: "stop-sql-injection",
    title: "Stop SQL injection",
    lede: "When a value is pasted into SQL text, the value can rewrite the query. Placeholders keep values out of the SQL entirely. Table and column names can't be placeholders, so they are chosen from an allow-list.",
    focus: "See SQL injection change a real query, prevent it with `?` placeholders, and choose identifiers (columns, sort order) from an allow-list.",
    minutes: 22,
    objectives: [
      "Show how a pasted value turns `WHERE email = '…'` into a condition that matches every row",
      "Pass every value through `?` placeholders, including lists of values for `IN (...)`",
      "Build `ORDER BY` and column choices from an allow-list, because placeholders only hold values",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conditional-expr", "dict-literal", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "sqlite-call", "string-format", "string-index", "string-method", "top-level-indent", "try-except", "tuple-literal", "unquoted-name"],
    teaches: ["sql-identifier"],
    blocks: [
      {
        kind: "text",
        md: "The Packaging & Databases module used `?` placeholders so that a name like `O'Brien` couldn't break a query. The same mistake is also the most famous security hole on the web. If a program builds SQL by pasting in text from a user, the user decides part of the SQL. A quote ends the string early, and whatever follows is read as SQL: an extra `OR` condition, a `UNION` that reads another table, a statement that deletes data. This is **SQL injection**.\n\nThe example runs the attack against a real (in-memory) customers table. The lookup is meant to return one customer's details for the email typed into a \"find my orders\" form.",
      },
      {
        kind: "example",
        title: "The attack, and the placeholder that stops it",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE customers (customer_id TEXT, email TEXT, city TEXT)")
conn.executemany("INSERT INTO customers VALUES (?, ?, ?)", [
    ("C00038", "nora_garcia@fastmail.com", "New York"),
    ("C00077", "jamal.walker62@icloud.com", "Houston"),
    ("C01338", "grace_walker29@yahoo.com", "Seattle"),
])

def find_unsafe(email):
    sql = f"SELECT customer_id, city FROM customers WHERE email = '{email}'"
    return conn.execute(sql).fetchall()

def find_safe(email):
    return conn.execute("SELECT customer_id, city FROM customers WHERE email = ?", (email,)).fetchall()

typed = "x' OR '1'='1"
print(find_unsafe("nora_garcia@fastmail.com"))
print(find_unsafe(typed))
print(find_safe(typed))
`,
        output: "[('C00038', 'New York')]\n[('C00038', 'New York'), ('C00077', 'Houston'), ('C01338', 'Seattle')]\n[]\n",
        note: "Pasted in, the typed text produces `WHERE email = 'x' OR '1'='1'`: a condition true for every row, so every customer's details come back. With `?`, the driver sends the text as a value, so the database looks for a customer whose email is literally `x' OR '1'='1` and finds none.",
      },
      {
        kind: "text",
        md: "Placeholders hold **values** only. Names that are part of the query's structure (a table, a column, `ASC`/`DESC`) can't be placeholders; the database must know them before it can plan the query. Trying anyway fails:",
      },
      {
        kind: "error-example",
        title: "A placeholder where a table name goes",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT, price REAL)")
table = "products"
print(conn.execute("SELECT COUNT(*) FROM ?", (table,)).fetchone())
`,
        error: "OperationalError",
        output: "",
        note: "`sqlite3.OperationalError: near \"?\": syntax error`. In `ORDER BY ?` the placeholder is even sneakier: it is accepted, but sorts by a constant value, so nothing is sorted at all.",
      },
      {
        kind: "text",
        md: "So when a request chooses a column (a sort field, a filter field), map its text through an **allow-list** to SQL you wrote yourself, and refuse anything not in the map. And when a request supplies *several* values, as in `WHERE order_id IN (...)`, generate one `?` per value: the number of placeholders comes from your code, the values still travel separately.",
      },
      {
        kind: "example",
        title: "Sorting and IN lists, safely",
        code: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT, name TEXT, price REAL, rating REAL)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", 7.49, 4.1),
    ("SPO-61044", "Travel Yoga Mat", 50.99, 4.6),
    ("HOM-22847", "Deluxe Vase", 31.0, 4.4),
])

SORT_COLUMNS = {"price": "price", "rating": "rating DESC", "name": "name"}

def products_sorted(sort):
    if sort not in SORT_COLUMNS:
        raise ValueError(f"cannot sort by {sort!r}")
    sql = "SELECT sku FROM products ORDER BY " + SORT_COLUMNS[sort]
    return [row[0] for row in conn.execute(sql)]

def prices_for(skus):
    marks = ", ".join("?" for _ in skus)
    sql = f"SELECT sku, price FROM products WHERE sku IN ({marks}) ORDER BY sku"
    return conn.execute(sql, skus).fetchall()

print(products_sorted("price"))
print(products_sorted("rating"))
print(prices_for(["SPO-61044", "HOM-22847"]))
try:
    products_sorted("price; DROP TABLE products")
except ValueError as err:
    print(err)
`,
        output: "['SPO-11681', 'HOM-22847', 'SPO-61044']\n['SPO-61044', 'HOM-22847', 'SPO-11681']\n[('HOM-22847', 31.0), ('SPO-61044', 50.99)]\ncannot sort by 'price; DROP TABLE products'\n",
        note: "The text pasted into the SQL is always one of the three strings in `SORT_COLUMNS`, written by you; the request only chooses which. In `prices_for` the f-string inserts only question marks; the SKUs go in as values.",
      },
      {
        kind: "text",
        md: "**When to use it:** every query that involves anything from outside, which is nearly every query. **Mistakes to avoid:** f-strings, `+` or `%` to put values into SQL; \"escaping\" quotes by hand (`replace(\"'\", \"''\")` misses cases); a placeholder for a column or table name; and pasting a column name from the request after checking only that it \"looks like a word\".",
      },
    ],
    tryIt: {
      id: "try",
      title: "Pass the customer ID as a value",
      prompt: "`orders_for` pastes the customer ID into the SQL. Use a `?` placeholder and pass the ID as a value, so an injected ID can't widen the query.",
      spec: [
        ["Function", "`orders_for(conn, customer_id)`"],
        ["Returns", "the `order_id`s of that customer's orders, sorted"],
      ],
      starter: src`
import sqlite3

def orders_for(conn, customer_id):
    rows = conn.execute(f"SELECT order_id FROM orders WHERE customer_id = '{customer_id}' ORDER BY order_id").fetchall()
    return [row[0] for row in rows]

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (order_id TEXT, customer_id TEXT)")
conn.executemany("INSERT INTO orders VALUES (?, ?)", [("O100282", "C00077"), ("O100918", "C01338"), ("O101219", "C00077")])
print(orders_for(conn, "C00077"))
print(orders_for(conn, "x' OR '1'='1"))
`,
      answer: src`
import sqlite3

def orders_for(conn, customer_id):
    rows = conn.execute("SELECT order_id FROM orders WHERE customer_id = ? ORDER BY order_id", (customer_id,)).fetchall()
    return [row[0] for row in rows]

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (order_id TEXT, customer_id TEXT)")
conn.executemany("INSERT INTO orders VALUES (?, ?)", [("O100282", "C00077"), ("O100918", "C01338"), ("O101219", "C00077")])
print(orders_for(conn, "C00077"))
print(orders_for(conn, "x' OR '1'='1"))
`,
      wrong: [
        {
          code: src`
def orders_for(conn, customer_id):
    safe = customer_id.replace("'", "")
    rows = conn.execute(f"SELECT order_id FROM orders WHERE customer_id = '{safe}' ORDER BY order_id").fetchall()
    return [row[0] for row in rows]
`,
          fails: ["quote"],
          why: "stripping quotes changes the value, so an ID that really contains a quote is never found",
        },
      ],
      hints: ["The value must leave the SQL text entirely.", "Write `?` where the quoted ID was.", "Give `execute` a second argument: a one-item tuple holding the ID."],
      task: {
        checks: [
          expr("returns", "orders_for() finds a customer's orders", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE orders (order_id TEXT, customer_id TEXT)')",
            "_c.executemany('INSERT INTO orders VALUES (?, ?)', [('O100282', 'C00077'), ('O100918', 'C01338'), ('O101219', 'C00077')])",
            "result = orders_for(_c, 'C00077')",
          ), ["O100282", "O101219"], { show: "orders_for(conn, 'C00077')" }),
          expr("injection", "an injected ID matches nothing", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE orders (order_id TEXT, customer_id TEXT)')",
            "_c.executemany('INSERT INTO orders VALUES (?, ?)', [('O100282', 'C00077'), ('O100918', 'C01338')])",
            "result = orders_for(_c, \"x' OR '1'='1\")",
          ), [], { show: "orders_for(conn, \"x' OR '1'='1\")" }),
          expr("quote", "an ID that really contains a quote", lines(
            "import sqlite3 as _sq",
            "_c = _sq.connect(':memory:')",
            "_c.execute('CREATE TABLE orders (order_id TEXT, customer_id TEXT)')",
            "_c.executemany('INSERT INTO orders VALUES (?, ?)', [('O7', \"C'7\"), ('O8', 'C7')])",
            "result = orders_for(_c, \"C'7\")",
          ), ["O7"], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Search products with a chosen sort",
        prompt: "The shop's search sends a `category`, a `sort` (`\"price\"`, `\"rating\"` or `\"name\"`) and a `descending` flag. Write `search_products(conn, category, sort, descending)`: return the SKUs of that category in the requested order. The category is a value; the sort column and direction are identifiers, chosen from allow-lists in your code. An unknown sort raises `ValueError` before any SQL runs.",
        spec: [
          ["Function", "`search_products(conn, category, sort, descending)`"],
          ["Table", "`products (sku, name, category, price, rating)`"],
          ["Order", "by the chosen column, ascending unless `descending` is `True`; ties broken by `sku` ascending"],
          ["Returns", "a list of SKUs; `[]` when the category has no products"],
          ["Raises", "`ValueError` for a sort that isn't one of the three"],
        ],
        starter: src`
import sqlite3

def search_products(conn, category, sort, descending):
    return []

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6),
    ("SPO-65611", "Studio Tent", "sports", 45.0, 3.9),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4),
])
print(search_products(conn, "sports", "price", True))
`,
        answer: src`
import sqlite3

COLUMNS = {"price": "price", "rating": "rating", "name": "name"}

def search_products(conn, category, sort, descending):
    if sort not in COLUMNS:
        raise ValueError(f"unknown sort {sort!r}")
    direction = "DESC" if descending else "ASC"
    sql = f"SELECT sku FROM products WHERE category = ? ORDER BY {COLUMNS[sort]} {direction}, sku"
    return [row[0] for row in conn.execute(sql, (category,))]

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price REAL, rating REAL)")
conn.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?)", [
    ("SPO-11681", "Ultra Bike Light", "sports", 7.49, 4.1),
    ("SPO-61044", "Travel Yoga Mat", "sports", 50.99, 4.6),
    ("SPO-65611", "Studio Tent", "sports", 45.0, 3.9),
    ("HOM-22847", "Deluxe Vase", "home", 31.0, 4.4),
])
print(search_products(conn, "sports", "price", True))
`,
        alternatives: [
          src`
ORDERS = {
    ("price", False): "price ASC", ("price", True): "price DESC",
    ("rating", False): "rating ASC", ("rating", True): "rating DESC",
    ("name", False): "name ASC", ("name", True): "name DESC",
}

def search_products(conn, category, sort, descending):
    key = (sort, bool(descending))
    if key not in ORDERS:
        raise ValueError("bad sort")
    rows = conn.execute("SELECT sku FROM products WHERE category = ? ORDER BY " + ORDERS[key] + ", sku ASC", [category]).fetchall()
    return [sku for (sku,) in rows]
`,
        ],
        wrong: [
          {
            code: src`
def search_products(conn, category, sort, descending):
    direction = "DESC" if descending else "ASC"
    sql = f"SELECT sku FROM products WHERE category = ? ORDER BY {sort} {direction}, sku"
    return [row[0] for row in conn.execute(sql, (category,))]
`,
            fails: ["unknown-sort", "injected-sort"],
            why: "the sort text from the request is pasted into the SQL, so any column, or any SQL, can be injected there",
          },
          {
            code: src`
def search_products(conn, category, sort, descending):
    if sort not in {"price", "rating", "name"}:
        raise ValueError("bad sort")
    direction = "DESC" if descending else "ASC"
    sql = f"SELECT sku FROM products WHERE category = ? ORDER BY ? {direction}, sku"
    return [row[0] for row in conn.execute(sql, (category, sort))]
`,
            fails: ["returns", "ascending", "ties"],
            why: "`ORDER BY ?` sorts by a constant, so the results come back in SKU order whatever was asked",
          },
          {
            code: src`
def search_products(conn, category, sort, descending):
    if sort not in {"price", "rating", "name"}:
        raise ValueError("bad sort")
    direction = "DESC" if descending else "ASC"
    sql = f"SELECT sku FROM products WHERE category = '{category}' ORDER BY {sort} {direction}, sku"
    return [row[0] for row in conn.execute(sql)]
`,
            fails: ["quote-category"],
            why: "the category is pasted in, so a category containing a quote breaks the query",
          },
        ],
        hints: [
          "Two kinds of input: the category is a value (placeholder); the sort and direction are structure (your own text, chosen from a map).",
          "Check `sort` against the allowed names first and raise before building any SQL.",
          "End the ORDER BY with `, sku` so equal prices or ratings come out in a fixed order.",
        ],
        task: {
          checks: [
            expr("returns", "search_products() sorts sports by price, highest first", lines(productsDb, "result = search_products(_conn, 'sports', 'price', True)"), ["SPO-61044", "SPO-65611", "SPO-11681"], { show: "search_products(conn, 'sports', 'price', True)" }),
            expr("ascending", "ascending by rating", lines(productsDb, "result = search_products(_conn, 'sports', 'rating', False)"), ["SPO-65611", "SPO-11681", "SPO-61044"], { show: "search_products(conn, 'sports', 'rating', False)" }),
            raisesExpr("unknown-sort", "an unknown sort is refused", lines(productsDb, "search_products(_conn, 'sports', 'stock', False)"), "ValueError", { show: "search_products(conn, 'sports', 'stock', False)" }),
            expr("injected-sort", "a sort with SQL glued on is refused and changes nothing", lines(
              productsDb,
              "try:",
              "    search_products(_conn, 'sports', 'price; DELETE FROM products', False)",
              "    _raised = False",
              "except ValueError:",
              "    _raised = True",
              "except Exception:",
              "    _raised = False",
              "result = (_raised, _conn.execute('SELECT COUNT(*) FROM products').fetchone()[0])",
            ), py.tuple(py.bool(true), py.int(5)), { hidden: true }),
            expr("ties", "products with the same price", lines(
              productsDb,
              "_conn.executemany('INSERT INTO products VALUES (?, ?, ?, ?, ?)', [('TOY-3', 'c', 'toys', 5.0, 1.0), ('TOY-1', 'a', 'toys', 5.0, 1.0), ('TOY-2', 'b', 'toys', 2.0, 1.0)])",
              "result = search_products(_conn, 'toys', 'price', False)",
            ), ["TOY-2", "TOY-1", "TOY-3"], { hidden: true }),
            expr("quote-category", "a category with a quote in its name", lines(productsDb, "result = search_products(_conn, \"kids' toys\", 'name', False)"), ["KID-00118"], { hidden: true }),
            expr("empty", "a category with no products", lines(productsDb, "result = search_products(_conn, 'garden', 'name', True)"), [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Look up a batch of orders",
        prompt: "The support tool pastes a list of order IDs from a ticket and wants each order's status. Write `statuses(conn, order_ids)`: return a dictionary from order ID to status for the IDs that exist, using one query with an `IN (...)` list of placeholders. An empty list returns `{}` without running a query.",
        spec: [
          ["Function", "`statuses(conn, order_ids)`"],
          ["Table", "`orders (order_id TEXT PRIMARY KEY, status TEXT)`"],
          ["Returns", "`{order_id: status}` for the IDs found; unknown IDs are left out; repeated IDs are fine"],
          ["Rule", "one `?` per ID; no ID is ever pasted into the SQL"],
        ],
        starter: src`
import sqlite3

def statuses(conn, order_ids):
    return {}

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)")
conn.executemany("INSERT INTO orders VALUES (?, ?)", [("O100282", "delivered"), ("O100376", "returned"), ("O101219", "delivered")])
print(statuses(conn, ["O100376", "O999999", "O100282"]))
`,
        answer: src`
import sqlite3

def statuses(conn, order_ids):
    if not order_ids:
        return {}
    marks = ", ".join(["?"] * len(order_ids))
    sql = f"SELECT order_id, status FROM orders WHERE order_id IN ({marks})"
    return dict(conn.execute(sql, list(order_ids)).fetchall())

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)")
conn.executemany("INSERT INTO orders VALUES (?, ?)", [("O100282", "delivered"), ("O100376", "returned"), ("O101219", "delivered")])
print(statuses(conn, ["O100376", "O999999", "O100282"]))
`,
        alternatives: [
          src`
def statuses(conn, order_ids):
    result = {}
    if len(order_ids) == 0:
        return result
    placeholders = ",".join("?" for _ in order_ids)
    for order_id, status in conn.execute("SELECT order_id, status FROM orders WHERE order_id IN (" + placeholders + ")", tuple(order_ids)):
        result[order_id] = status
    return result
`,
        ],
        wrong: [
          {
            code: src`
def statuses(conn, order_ids):
    if not order_ids:
        return {}
    quoted = ", ".join(f"'{order_id}'" for order_id in order_ids)
    return dict(conn.execute(f"SELECT order_id, status FROM orders WHERE order_id IN ({quoted})").fetchall())
`,
            fails: ["injection", "repeats"],
            why: "the IDs are pasted into the SQL, so an ID like `x') OR ('1'='1` returns every order and an ID containing a quote breaks the query",
          },
          {
            code: src`
def statuses(conn, order_ids):
    sql = "SELECT order_id, status FROM orders WHERE order_id IN (?)"
    return dict(conn.execute(sql, (",".join(order_ids),)).fetchall())
`,
            fails: ["returns", "repeats"],
            why: "one placeholder holds one value: the joined text `\"O100376,O999999,O100282\"` matches no order"
          },
        ],
        hints: [
          "The number of `?` marks depends on how many IDs there are; build that part of the SQL from question marks only.",
          "Pass the IDs themselves as the second argument of `execute`.",
          "Handle the empty list before building any SQL; each result row is a pair you can turn into a dictionary entry.",
        ],
        task: {
          checks: [
            expr("returns", "statuses() finds the orders that exist", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_c.execute('CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)')",
              "_c.executemany('INSERT INTO orders VALUES (?, ?)', [('O100282', 'delivered'), ('O100376', 'returned'), ('O101219', 'delivered')])",
              "result = statuses(_c, ['O100376', 'O999999', 'O100282'])",
            ), { O100376: "returned", O100282: "delivered" }, { show: "statuses(conn, ['O100376', 'O999999', 'O100282'])" }),
            expr("injection", "an ID that tries to widen the query", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_c.execute('CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)')",
              "_c.executemany('INSERT INTO orders VALUES (?, ?)', [('O1', 'delivered'), ('O2', 'returned')])",
              "result = statuses(_c, [\"x') OR ('1'='1\"])",
            ), {}, { hidden: true }),
            expr("empty", "an empty list of IDs", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_c.execute('CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)')",
              "result = statuses(_c, [])",
            ), {}, { hidden: true }),
            expr("repeats", "the same ID twice and a quote in an ID", lines(
              "import sqlite3 as _sq",
              "_c = _sq.connect(':memory:')",
              "_c.execute('CREATE TABLE orders (order_id TEXT PRIMARY KEY, status TEXT)')",
              "_c.executemany('INSERT INTO orders VALUES (?, ?)', [(\"O'9\", 'cancelled'), ('O3', 'processing')])",
              "result = statuses(_c, ['O3', 'O3', \"O'9\"])",
            ), { O3: "processing", "O'9": "cancelled" }, { hidden: true }),
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
conn.execute("CREATE TABLE products (sku TEXT, price REAL)")
conn.executemany("INSERT INTO products VALUES (?, ?)", [("B", 9.0), ("A", 30.0), ("C", 4.5)])
column = "price"
print([r[0] for r in conn.execute("SELECT sku FROM products ORDER BY ?", (column,))])
print([r[0] for r in conn.execute("SELECT sku FROM products ORDER BY " + {"price": "price"}[column])])
`,
        choices: ["['B', 'A', 'C']\n['C', 'B', 'A']", "['C', 'B', 'A']\n['C', 'B', 'A']", "['A', 'B', 'C']\n['C', 'B', 'A']", "OperationalError"],
        answer: 0,
        why: "`ORDER BY ?` is allowed but sorts by the constant text `'price'`, the same for every row, so rows come back in insertion order. The allow-listed column name actually sorts by price.",
      },
      {
        id: "q2",
        prompt: "A common mistake: escaping quotes by hand. The function doubles single quotes. What does the injected login return?",
        program: src`
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, pin INTEGER)")
conn.executemany("INSERT INTO users VALUES (?, ?)", [("nora", 4821), ("jamal", 1934)])

def check(name, pin):
    name = name.replace("'", "''")
    sql = f"SELECT name FROM users WHERE name = '{name}' AND pin = {pin}"
    return conn.execute(sql).fetchall()

print(check("nora", "0 OR 1=1"))
`,
        choices: ["[('nora',), ('jamal',)]", "[]", "[('nora',)]", "OperationalError"],
        answer: 0,
        why: "The escaping only protects the quoted name. The PIN is pasted without quotes, so `0 OR 1=1` rewrites the condition: `(name = 'nora' AND pin = 0) OR 1=1` is true for every row. Placeholders protect every value, quoted or not.",
      },
      {
        id: "q3",
        prompt: "A request chooses which column to filter on. What is the safe way to put that column into the SQL?",
        choices: [
          "Look the request's text up in a dictionary of allowed columns and use the SQL text from the dictionary",
          "Pass the column name as a `?` parameter",
          "Remove spaces and semicolons from the column name, then paste it",
          "Put the column name in single quotes",
        ],
        answer: 0,
        why: "Placeholders only hold values, cleaning is a deny-list, and quotes make it a text constant. Choosing from your own allow-list means only SQL you wrote can appear.",
      },
    ],
    review: [
      "Pasting a value into SQL lets the value rewrite the query: SQL injection.",
      "Every value goes through `?`; for `IN (...)`, build one `?` per value and pass the values separately.",
      "Columns, tables and sort directions can't be placeholders: choose them from an allow-list of your own SQL text.",
      "Next: loading data can run code too. Safe serialization.",
    ],
  },
  // ------------------------------------------------------------------ PY-L47-04 safe serialization
  {
    id: "PY-L47-04",
    version: 2,
    slug: "load-data-safely",
    title: "Load data without running it",
    lede: "Reading a saved file or a request body should only ever produce data. A loader that lets the data choose what to call or which object to build hands control to whoever wrote the data. Plain JSON can only describe data; read untrusted input with it, allow-list any types it may create, and check its shape.",
    focus: "Load untrusted data so that it can never choose code to run: plain json, an allow-list of the types it may build, a shape check, and explicit conversions.",
    minutes: 22,
    objectives: [
      "Show how a loader that looks up names from the data can be made to call a function nobody intended",
      "Build objects from JSON through an allow-list of types, and validate the shape before using it",
      "Write and read values JSON doesn't support (Decimal, datetime) by converting them explicitly",
    ],
    requires: ["all-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "conditional-expr", "conversion", "decimal-call", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "exc-name", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "nested-condition", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "set-literal", "star-kwargs", "string-format", "string-index", "strptime-call", "top-level-indent", "try-except", "tuple-unpack", "type-call", "unquoted-name"],
    teaches: ["unsafe-load"],
    blocks: [
      {
        kind: "text",
        md: "**Serialization** turns values into text or bytes to store or send, and loading turns them back. The danger is in loading. Some loaders let the data say *what to build or call*: Python's built-in `eval` runs text as code, serialisers that rebuild arbitrary Python objects store which function to call for each object, and home-made JSON decoders often look up a class by a name found in the data. With any of them, whoever wrote the data (an uploaded file, a cookie, a message from another service) chooses what your program runs.\n\nPlain JSON can only describe dictionaries, lists, strings, numbers, booleans and null, so `json.loads` on hostile text gives you plain data or raises `JSONDecodeError`. When you *do* want objects back, choose the classes from an allow-list you wrote, never by looking up whatever name the data contains. And loaded data still needs a shape check (the Reliable Data Pipelines module, L01): valid JSON is not the same as a valid cart.\n\nThe example builds the classic mistake for real: a decoder hook (`object_hook`, which `json.loads` calls for every JSON object it reads) that creates objects by looking up the `\"type\"` named in the data.",
      },
      {
        kind: "example",
        title: "A decoder that lets the data choose what to call",
        code: src`
import json

class Refund:
    def __init__(self, order_id, amount):
        self.order_id = order_id
        self.amount = amount

    def __repr__(self):
        return f"Refund({self.order_id}, {self.amount})"

def clear_payment_logs():
    print("payment logs deleted!")

def build_unsafe(data):
    if "type" in data:
        factory = globals()[data.pop("type")]
        return factory(**data)
    return data

ALLOWED = {"Refund": Refund}

def build_safe(data):
    if "type" in data:
        kind = data.pop("type")
        if kind not in ALLOWED:
            raise ValueError(f"cannot build {kind!r}")
        return ALLOWED[kind](**data)
    return data

honest = '{"type": "Refund", "order_id": "O100376", "amount": 91.47}'
hostile = '{"type": "clear_payment_logs"}'

print(json.loads(honest, object_hook=build_unsafe))
json.loads(hostile, object_hook=build_unsafe)
print(json.loads(honest, object_hook=build_safe))
try:
    json.loads(hostile, object_hook=build_safe)
except ValueError as err:
    print(err)
`,
        output: "Refund(O100376, 91.47)\npayment logs deleted!\nRefund(O100376, 91.47)\ncannot build 'clear_payment_logs'\n",
        note: "The unsafe decoder did exactly what the hostile text asked: it found `clear_payment_logs` among the program's names and called it. Here that only prints; in a real program it would run. The safe decoder can only ever create the classes in `ALLOWED`. Loaders that evaluate text or rebuild arbitrary objects have the same flaw with no allow-list possible, which is why they must never read untrusted data.",
      },
      {
        kind: "text",
        md: "The price of a data-only format is that it holds only data. JSON has no `Decimal`, `datetime` or `set`, and `json.dumps` refuses them rather than guess:",
      },
      {
        kind: "error-example",
        title: "JSON doesn't guess how to store a Decimal",
        code: src`
import json
from decimal import Decimal

order = {"order_id": "O100282", "total": Decimal("35.84")}
print(json.dumps(order))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: Object of type Decimal is not JSON serializable`. Convert it yourself (to the text `\"35.84\"`, which keeps every digit) and convert it back when loading. Being explicit is the point: nothing is rebuilt that you didn't ask for.",
      },
      {
        kind: "text",
        md: "Loaded JSON is still untrusted. A saved cart might be a list instead of an object, have a quantity of `-5` or `\"2\"`, or carry extra fields. Check the shape before anything uses it, and turn every problem into one kind of error your caller can handle.",
      },
      {
        kind: "example",
        title: "Load a saved cart and check its shape",
        code: src`
import json
import re

def load_cart(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        raise ValueError(f"cart is not valid JSON: {err.msg}")
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ValueError("cart must be an object with an items list")
    lines = []
    for item in data["items"]:
        if not isinstance(item, dict):
            raise ValueError("each item must be an object")
        sku, qty = item.get("sku"), item.get("qty")
        if not isinstance(sku, str) or not re.fullmatch(r"[A-Z]{3}-[0-9]{5}", sku):
            raise ValueError(f"bad sku {sku!r}")
        if isinstance(qty, bool) or not isinstance(qty, int) or not 1 <= qty <= 99:
            raise ValueError(f"bad qty {qty!r} for {sku}")
        lines.append((sku, qty))
    return lines

print(load_cart('{"items": [{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}]}'))
for text in ['{"items": [{"sku": "SPO-11681", "qty": "2"}]}', '["SPO-11681"]', "{'items': []}"]:
    try:
        load_cart(text)
    except ValueError as err:
        print(err)
`,
        output: "[('SPO-11681', 2), ('HOM-22847', 1)]\nbad qty '2' for SPO-11681\ncart must be an object with an items list\ncart is not valid JSON: Expecting property name enclosed in double quotes\n",
        note: "Three different kinds of bad input, one kind of error. The caller doesn't need to know about `JSONDecodeError` or about the shape rules; it gets a `ValueError` with a reason.",
      },
      {
        kind: "text",
        md: "**When to use it:** for anything that arrives from outside or is stored where others could change it: request bodies, uploads, cookies, cache files, messages. Formats that rebuild arbitrary objects are only for data your own program wrote and nobody else can touch. **Mistakes to avoid:** evaluating text to \"parse\" it; choosing a class or function by a name taken from the data; assuming loaded JSON has the shape you saved; and converting `Decimal` money to `float` to make JSON accept it (`str` keeps the exact value).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Build only the event kinds you allow",
      prompt: "`load_event` creates an event object by looking up the `kind` named in the message among all the program's names, so a message can name `shutdown` and run it. Look the kind up in the `KINDS` allow-list instead; an unknown kind raises `ValueError`.",
      spec: [
        ["Function", "`load_event(text)`"],
        ["Returns", "a `Star` or `Fork` built from the JSON message; any other kind raises `ValueError` and nothing else runs"],
      ],
      starter: src`
import json

class Star:
    def __init__(self, repo):
        self.repo = repo

class Fork:
    def __init__(self, repo):
        self.repo = repo

actions = []

def shutdown(repo):
    actions.append("shutdown")

KINDS = {"Star": Star, "Fork": Fork}

def load_event(text):
    data = json.loads(text)
    factory = globals()[data["kind"]]
    return factory(data["repo"])

event = load_event('{"kind": "Star", "repo": "lumen-labs/pyauth"}')
print(type(event).__name__, event.repo)
`,
      answer: src`
import json

class Star:
    def __init__(self, repo):
        self.repo = repo

class Fork:
    def __init__(self, repo):
        self.repo = repo

actions = []

def shutdown(repo):
    actions.append("shutdown")

KINDS = {"Star": Star, "Fork": Fork}

def load_event(text):
    data = json.loads(text)
    if data["kind"] not in KINDS:
        raise ValueError(f"unknown kind {data['kind']!r}")
    factory = KINDS[data["kind"]]
    return factory(data["repo"])

event = load_event('{"kind": "Star", "repo": "lumen-labs/pyauth"}')
print(type(event).__name__, event.repo)
`,
      wrong: [
        {
          code: src`
import json

class Star:
    def __init__(self, repo):
        self.repo = repo

class Fork:
    def __init__(self, repo):
        self.repo = repo

actions = []

def shutdown(repo):
    actions.append("shutdown")

KINDS = {"Star": Star, "Fork": Fork}

def load_event(text):
    data = json.loads(text)
    factory = globals()[data["kind"]]
    event = factory(data["repo"])
    if data["kind"] not in KINDS:
        raise ValueError("unknown kind")
    return event
`,
          fails: ["nothing-runs"],
          why: "the check comes after the call, so `shutdown` has already run when the error is raised",
        },
      ],
      hints: ["The allow-list `KINDS` already exists; the function just doesn't use it.", "Decide whether the kind is allowed before calling anything.", "Replace the lookup in `globals()` with a lookup in `KINDS`, after raising for a kind it doesn't contain."],
      task: {
        checks: [
          expr("returns", "load_event() builds an allowed kind", "_e = load_event('{\"kind\": \"Fork\", \"repo\": \"lumen-labs/tinykit\"}')\nresult = (type(_e).__name__, _e.repo)", py.tuple(py.str("Fork"), py.str("lumen-labs/tinykit")), { show: "load_event('{\"kind\": \"Fork\", \"repo\": \"lumen-labs/tinykit\"}')" }),
          raisesExpr("refused", "an unknown kind raises ValueError", "load_event('{\"kind\": \"shutdown\", \"repo\": \"x\"}')", "ValueError", { show: "load_event('{\"kind\": \"shutdown\", \"repo\": \"x\"}')" }),
          expr("nothing-runs", "a hostile kind never runs", "try:\n    load_event('{\"kind\": \"shutdown\", \"repo\": \"x\"}')\nexcept Exception:\n    pass\nresult = actions", [], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Load shop settings from an upload",
        prompt: "Shop owners can upload a settings file. Write `load_settings(text)`: parse it as JSON and return the dictionary when it has exactly the keys `currency`, `page_size` and `features` with valid values; otherwise raise `ValueError` (also for text that isn't JSON, so callers only ever handle one error).",
        spec: [
          ["Function", "`load_settings(text)`"],
          ["currency", "one of `\"USD\"`, `\"EUR\"`, `\"GBP\"`"],
          ["page_size", "a whole number from 1 to 100 (`true` doesn't count)"],
          ["features", "a list of strings (it may be empty)"],
          ["Raises", "`ValueError` for invalid JSON, a value that isn't an object, a missing or extra key, or a bad value"],
          ["Example", "`'{\"currency\": \"EUR\", \"page_size\": 24, \"features\": [\"reviews\"]}'` → that dictionary"],
        ],
        starter: src`
import json

def load_settings(text):
    return json.loads(text)

print(load_settings('{"currency": "EUR", "page_size": 24, "features": ["reviews"]}'))
`,
        answer: src`
import json

def load_settings(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        raise ValueError(f"settings are not valid JSON: {err.msg}")
    if not isinstance(data, dict) or set(data) != {"currency", "page_size", "features"}:
        raise ValueError("settings need exactly currency, page_size and features")
    if data["currency"] not in {"USD", "EUR", "GBP"}:
        raise ValueError("unknown currency")
    size = data["page_size"]
    if isinstance(size, bool) or not isinstance(size, int) or not 1 <= size <= 100:
        raise ValueError("page_size must be 1 to 100")
    features = data["features"]
    if not isinstance(features, list) or not all(isinstance(f, str) for f in features):
        raise ValueError("features must be a list of names")
    return data

print(load_settings('{"currency": "EUR", "page_size": 24, "features": ["reviews"]}'))
`,
        alternatives: [
          src`
import json

def check(ok, message):
    if not ok:
        raise ValueError(message)

def load_settings(text):
    try:
        data = json.loads(text)
    except ValueError:
        raise ValueError("not JSON")
    check(type(data) is dict, "not an object")
    check(sorted(data) == ["currency", "features", "page_size"], "wrong keys")
    check(data["currency"] in ("USD", "EUR", "GBP"), "currency")
    check(type(data["page_size"]) is int and 0 < data["page_size"] <= 100, "page_size")
    check(type(data["features"]) is list and all(type(x) is str for x in data["features"]), "features")
    return data
`,
        ],
        wrong: [
          {
            code: src`
import json

def load_settings(text):
    data = json.loads(text)
    if data.get("currency") not in {"USD", "EUR", "GBP"}:
        raise ValueError("unknown currency")
    if not 1 <= data.get("page_size", 0) <= 100:
        raise ValueError("page_size must be 1 to 100")
    return data
`,
            fails: ["returns", "not-json", "extra-key", "bool-size", "features"],
            why: "bad JSON leaks `JSONDecodeError`, extra keys and bad features pass, and `true` counts as a page size of 1",
          },
          {
            code: src`
import json

def load_settings(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        raise ValueError("not JSON")
    if not isinstance(data, dict) or set(data) != {"currency", "page_size", "features"}:
        raise ValueError("wrong keys")
    if data["currency"] not in {"USD", "EUR", "GBP"}:
        raise ValueError("unknown currency")
    if not isinstance(data["page_size"], int) or not 1 <= data["page_size"] <= 100:
        raise ValueError("page_size must be 1 to 100")
    if not isinstance(data["features"], list):
        raise ValueError("features must be a list")
    return data
`,
            fails: ["bool-size", "features"],
            why: "`true` passes as an int page size, and a features list holding numbers is accepted",
          },
        ],
        hints: [
          "Parse inside `try`, and raise `ValueError` from the JSON error so callers handle one kind of error.",
          "Comparing `set(data)` with the set of three names catches missing and extra keys in one test.",
          "Then one check per value; remember that `isinstance(True, int)` is True.",
        ],
        task: {
          checks: [
            fn("returns", "load_settings", [
              example(['{"currency": "EUR", "page_size": 24, "features": ["reviews"]}'], { currency: "EUR", page_size: 24, features: ["reviews"] }),
              example(['{"currency": "USD", "page_size": 100, "features": []}'], { currency: "USD", page_size: 100, features: [] }),
              raisesCase(['{"currency": "JPY", "page_size": 24, "features": []}'], "ValueError"),
              raisesCase(['{"currency": "GBP", "page_size": 0, "features": []}'], "ValueError", { label: "a page size of zero" }),
              raisesCase(['["USD", 24]'], "ValueError", { label: "a JSON list instead of an object" }),
            ], { label: "load_settings() returns valid settings and refuses bad ones" }),
            fn("not-json", "load_settings", [raisesCase(["{'currency': 'USD'}"], "ValueError", { label: "text that isn't JSON" })], { label: "invalid JSON becomes ValueError" }),
            fn("extra-key", "load_settings", [raisesCase(['{"currency": "USD", "page_size": 10, "features": [], "is_admin": true}'], "ValueError", { label: "an extra key" }), raisesCase(['{"currency": "USD", "page_size": 10}'], "ValueError", { label: "a missing key" })], { label: "exactly the three keys" }),
            fn("bool-size", "load_settings", [raisesCase(['{"currency": "USD", "page_size": true, "features": []}'], "ValueError", { label: "true as the page size" })], { label: "page_size must be a real number" }),
            fn("features", "load_settings", [raisesCase(['{"currency": "EUR", "page_size": 12, "features": ["reviews", 7]}'], "ValueError", { label: "a feature that isn't text" })], { label: "features must all be text" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Save an order with exact money and times",
        prompt: "Orders hold a `Decimal` total and a `datetime` for when they were placed; JSON has neither. Write `encode_order(order)`, which returns JSON text with the total as a string (`\"35.84\"`) and the time as ISO text (`\"2025-03-03T09:15:00\"`), and `decode_order(text)`, which turns that text back into a dictionary with a `Decimal` and a `datetime`. Decoding what you encoded must give back an equal order.",
        spec: [
          ["Functions", "`encode_order(order)` → JSON text; `decode_order(text)` → dictionary"],
          ["order", "`{\"order_id\": str, \"total\": Decimal, \"placed_at\": datetime, \"items\": int}`"],
          ["Encoding", "`total` → `str(total)`; `placed_at` → `placed_at.isoformat()`; other fields unchanged"],
          ["Rule", "`decode_order(encode_order(order)) == order`, and `encode_order` doesn't change the order it is given"],
        ],
        starter: src`
import json
from datetime import datetime
from decimal import Decimal

def encode_order(order):
    return json.dumps(order)

def decode_order(text):
    return json.loads(text)

order = {"order_id": "O100282", "total": Decimal("35.84"), "placed_at": datetime(2025, 3, 3, 9, 15), "items": 2}
text = encode_order(order)
print(text)
print(decode_order(text) == order)
`,
        answer: src`
import json
from datetime import datetime
from decimal import Decimal

def encode_order(order):
    plain = dict(order)
    plain["total"] = str(order["total"])
    plain["placed_at"] = order["placed_at"].isoformat()
    return json.dumps(plain)

def decode_order(text):
    data = json.loads(text)
    data["total"] = Decimal(data["total"])
    data["placed_at"] = datetime.fromisoformat(data["placed_at"])
    return data

order = {"order_id": "O100282", "total": Decimal("35.84"), "placed_at": datetime(2025, 3, 3, 9, 15), "items": 2}
text = encode_order(order)
print(text)
print(decode_order(text) == order)
`,
        alternatives: [
          src`
import json
from datetime import datetime
from decimal import Decimal

def encode_order(order):
    return json.dumps({k: (str(v) if isinstance(v, Decimal) else v.isoformat() if isinstance(v, datetime) else v) for k, v in order.items()})

def decode_order(text):
    raw = json.loads(text)
    return {**raw, "total": Decimal(raw["total"]), "placed_at": datetime.strptime(raw["placed_at"], "%Y-%m-%dT%H:%M:%S")}
`,
        ],
        wrong: [
          {
            code: src`
import json
from datetime import datetime
from decimal import Decimal

def encode_order(order):
    plain = dict(order)
    plain["total"] = float(order["total"])
    plain["placed_at"] = order["placed_at"].isoformat()
    return json.dumps(plain)

def decode_order(text):
    data = json.loads(text)
    data["total"] = Decimal(data["total"])
    data["placed_at"] = datetime.fromisoformat(data["placed_at"])
    return data
`,
            fails: ["returns", "round-trip", "exact"],
            why: "the total is written as a float, which can't hold every Decimal exactly, and is not the text the format asks for",
          },
          {
            code: src`
import json
from datetime import datetime
from decimal import Decimal

def encode_order(order):
    order["total"] = str(order["total"])
    order["placed_at"] = order["placed_at"].isoformat()
    return json.dumps(order)

def decode_order(text):
    data = json.loads(text)
    data["total"] = Decimal(data["total"])
    data["placed_at"] = datetime.fromisoformat(data["placed_at"])
    return data
`,
            fails: ["keeps-input", "round-trip"],
            why: "it converts the caller's order in place, so after saving it no longer holds a Decimal or a datetime",
          },
        ],
        hints: [
          "Encoding: make a copy of the order, replace the two special values with text, then dump the copy.",
          "`str(Decimal(\"35.84\"))` is `\"35.84\"` exactly; a datetime has `isoformat()`.",
          "Decoding reverses each step: `Decimal(text)` and `datetime.fromisoformat(text)`.",
        ],
        task: {
          checks: [
            expr("returns", "encode_order() writes the total and time as text", lines(
              "import json as _j",
              "from datetime import datetime as _dt",
              "from decimal import Decimal as _D",
              "result = _j.loads(encode_order({'order_id': 'O100282', 'total': _D('35.84'), 'placed_at': _dt(2025, 3, 3, 9, 15), 'items': 2}))",
            ), { order_id: "O100282", total: "35.84", placed_at: "2025-03-03T09:15:00", items: 2 }, { show: "encode_order(order)" }),
            expr("round-trip", "decoding gives back an equal order", lines(
              "from datetime import datetime as _dt",
              "from decimal import Decimal as _D",
              "_o = {'order_id': 'O101219', 'total': _D('246.60'), 'placed_at': _dt(2025, 1, 31, 23, 59, 59), 'items': 4}",
              "_back = decode_order(encode_order(_o))",
              "result = (_back == _o, type(_back['total']).__name__, type(_back['placed_at']).__name__, str(_back['total']))",
            ), py.tuple(py.bool(true), py.str("Decimal"), py.str("datetime"), py.str("246.60")), { show: "decode_order(encode_order(order)) == order" }),
            expr("exact", "a total with many digits survives exactly", lines(
              "from datetime import datetime as _dt",
              "from decimal import Decimal as _D",
              "_o = {'order_id': 'O9', 'total': _D('0.10000000000000000001'), 'placed_at': _dt(2025, 3, 1), 'items': 1}",
              "result = str(decode_order(encode_order(_o))['total'])",
            ), "0.10000000000000000001", { hidden: true }),
            expr("keeps-input", "encode_order() leaves the order unchanged", lines(
              "from datetime import datetime as _dt",
              "from decimal import Decimal as _D",
              "_o = {'order_id': 'O1', 'total': _D('5.00'), 'placed_at': _dt(2025, 2, 2, 2, 2), 'items': 1}",
              "encode_order(_o)",
              "result = (type(_o['total']).__name__, type(_o['placed_at']).__name__)",
            ), py.tuple(py.str("Decimal"), py.str("datetime"))),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

for text in ["{'qty': 2}", '{"qty": 2}', "[1, 2, 3][0]", '{"qty": 2, "qty": 5}']:
    try:
        print(json.loads(text))
    except json.JSONDecodeError:
        print("refused")
`,
        choices: [
          "refused\n{'qty': 2}\nrefused\n{'qty': 5}",
          "{'qty': 2}\n{'qty': 2}\n1\n{'qty': 5}",
          "refused\n{'qty': 2}\n1\n{'qty': 2}",
          "refused\n{'qty': 2}\nrefused\nrefused",
        ],
        answer: 0,
        why: "JSON requires double quotes, and `[1, 2, 3][0]` is an expression, not data, so both are refused. A repeated key is allowed by Python's parser and the last value wins: one more reason to validate what you load.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the message chooses the handler by name. What does this print?",
        program: src`
import json

refunds = []

def refund_all(message):
    refunds.append("everything")

def star(message):
    return "starred " + message["repo"]

def handle(text):
    message = json.loads(text)
    return globals()[message["action"]](message)

print(handle('{"action": "star", "repo": "lumen-labs/pyauth"}'))
handle('{"action": "refund_all"}')
print(refunds)
`,
        choices: ["starred lumen-labs/pyauth\n['everything']", "starred lumen-labs/pyauth\n[]", "KeyError: 'refund_all'", "starred lumen-labs/pyauth\nValueError"],
        answer: 0,
        why: "`globals()` holds every top-level name in the program, so the message could call any function, including `refund_all`. A dictionary of the handlers you mean to expose is the allow-list.",
      },
      {
        id: "q3",
        prompt: "A browser cookie stores the visitor's cart. Which loader is safe for it?",
        choices: [
          "`json.loads`, followed by checking the cart's shape",
          "Evaluating the cookie text as Python, because the program wrote it",
          "A serialiser that rebuilds any Python object, because it keeps the cart's classes",
          "`json.loads` alone: valid JSON is always a valid cart",
        ],
        answer: 0,
        why: "The visitor can edit their own cookie, so it is untrusted. JSON can't choose code to run, and the shape check catches valid JSON that isn't a valid cart.",
      },
    ],
    review: [
      "Loading must never run code: no evaluating outside text, no object-rebuilding loaders on untrusted bytes, no names from the data looked up in `globals()`.",
      "Read untrusted data with `json.loads`; create objects only from an allow-list of types; validate the shape.",
      "Convert values JSON lacks yourself: `Decimal` → `str`, `datetime` → `isoformat()`, and back.",
      "Next: a file name from a user can point outside the folder you meant. Path security.",
    ],
  },
  // ------------------------------------------------------------------ PY-L47-05 path security
  {
    id: "PY-L47-05",
    version: 2,
    slug: "keep-paths-inside",
    title: "Keep file paths inside their folder",
    lede: "When a file name comes from outside, `..` and absolute paths can point anywhere on the machine. Resolve the full path and refuse it unless it is still inside the folder you meant.",
    focus: "Join an untrusted file name to a base folder, resolve it, and refuse it unless the result `is_relative_to` the base; check every member before extracting an archive.",
    minutes: 22,
    objectives: [
      "Show how `..` and absolute names escape a base folder when joined with `/`",
      "Resolve the joined path and check `is_relative_to(base)` (not a text prefix) before opening it",
      "Check every member of an archive before writing any of them (zip slip)",
    ],
    requires: ["any-call", "arithmetic", "assignment", "boolean", "comp-if", "comparison", "conditional-expr", "continue-statement", "conversion", "encoding-arg", "end", "except-type", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-literal", "list-mutate", "list-sort", "logical", "membership", "module-file", "newline-escape", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "unquoted-name", "with-statement"],
    teaches: ["safe-path"],
    blocks: [
      {
        kind: "text",
        md: "Programs often take a file name from a request: *download invoice-0412.pdf*, *save this upload as march.csv*. Joining that name to a folder looks safe: `Path(\"uploads\") / name`. But a name is a path, and paths can climb. `../config/settings.json` goes up one level and into another folder; `reports/../../secret.txt` does the same in disguise; and joining an **absolute** path like `/etc/passwd` throws the base away completely. This is **path traversal**.\n\nThe defence: build the path, **resolve** it (`resolve()` turns it into an absolute path with every `..` worked out and symbolic links followed), and accept it only if it `is_relative_to` the resolved base folder. Comparing the actual resolved location is what counts, not what the text looks like.",
      },
      {
        kind: "example",
        title: "Which names stay inside the folder?",
        code: src`
from pathlib import Path

base = Path("uploads").resolve()
names = ["invoice-0412.pdf", "2025/march.csv", "../config/settings.json", "reports/../../secret.txt", "/etc/passwd"]
for name in names:
    target = (base / name).resolve()
    print(f"{name:28} inside: {target.is_relative_to(base)}")

print(Path("uploads") / "/etc/passwd")
`,
        output: "invoice-0412.pdf             inside: True\n2025/march.csv               inside: True\n../config/settings.json      inside: False\nreports/../../secret.txt     inside: False\n/etc/passwd                  inside: False\n/etc/passwd\n",
        note: "A subfolder is fine. Every name that climbs out is caught once resolved, including the disguised one. The last line shows why absolute names are dangerous: joining `/etc/passwd` onto a folder gives just `/etc/passwd`.",
      },
      {
        kind: "text",
        md: "A safe opener raises instead of returning a path outside the base, so no code path can accidentally open it:",
      },
      {
        kind: "error-example",
        title: "A download request that tries to climb out",
        code: src`
from pathlib import Path

def safe_path(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"{name!r} is outside {base}")
    return target

print(safe_path("invoices", "../app/settings.py"))
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: '../app/settings.py' is outside invoices`. The request is refused before any file is opened.",
      },
      {
        kind: "text",
        md: "Why not check the text, for example refuse names containing `..`? Because text checks miss things (an absolute path has no `..`; `....//` tricks; encoded forms that are decoded later) and wrongly refuse harmless names (`notes..txt`). And why not `str(target).startswith(str(base))`? Because `/srv/uploads_old/x` starts with `/srv/uploads`. `is_relative_to` compares whole path components.",
      },
      {
        kind: "example",
        title: "Serve a stored report by name",
        code: src`
from pathlib import Path

def read_report(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root) or not target.is_file():
        return None
    return target.read_text(encoding="utf-8")

Path("reports").mkdir(exist_ok=True)
Path("reports/march.csv").write_text("order_id,total\nO100282,35.84\n", encoding="utf-8")
Path("secret.env").write_text("PAYMENT_API_KEY=sk_live_51HxQe2Kd9f2a\n", encoding="utf-8")

print(read_report("reports", "march.csv"), end="")
print(read_report("reports", "../secret.env"))
print(read_report("reports", "april.csv"))
`,
        output: "order_id,total\nO100282,35.84\nNone\nNone\n",
        note: "The secret file really exists one level up; the resolved path proves the request points at it, so it is refused. A missing report and a refused one look the same to the requester, which gives an attacker nothing to learn.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever any part of a path comes from outside: downloads, uploads, report names, archive members, template names. **Mistakes to avoid:** joining without resolving; checking the text for `..` instead of the resolved location; `startswith` on path strings; and checking archive members one by one *while* extracting, so the first good files are already written when a bad one is found.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Refuse uploads that escape",
      prompt: "`upload_target` joins and resolves the name but never checks where it ended up. Raise `ValueError` when the resolved target is not inside the base folder.",
      spec: [
        ["Function", "`upload_target(base, name)`"],
        ["Returns", "the resolved `Path` inside `base`; raises `ValueError` for a name that escapes it"],
      ],
      starter: src`
from pathlib import Path

def upload_target(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    return target

print(upload_target("uploads", "receipt.png").name)
print(upload_target("uploads", "../../escape.png").name)
`,
      answer: src`
from pathlib import Path

def upload_target(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"{name!r} escapes {base}")
    return target

print(upload_target("uploads", "receipt.png").name)
try:
    upload_target("uploads", "../../escape.png")
except ValueError as err:
    print(err)
`,
      wrong: [
        {
          code: src`
from pathlib import Path

def upload_target(base, name):
    if ".." in name:
        raise ValueError("no climbing")
    return (Path(base).resolve() / name).resolve()
`,
          fails: ["absolute"],
          why: "an absolute name has no `..` but still escapes the folder",
        },
      ],
      hints: ["The resolved `target` is the real destination; compare it with `root`.", "`Path` has a method that says whether one path is inside another.", "Raise before returning when the target is not inside the root."],
      task: {
        checks: [
          expr("returns", "a plain name stays inside", "from pathlib import Path as _P\nresult = str(upload_target('up1', 'receipt.png').relative_to(_P('up1').resolve()))", "receipt.png", { show: "upload_target('uploads', 'receipt.png')" }),
          raisesExpr("climbs", "a name that climbs out", "upload_target('up2', '../../escape.png')", "ValueError", { show: "upload_target('uploads', '../../escape.png')" }),
          raisesExpr("absolute", "an absolute name", "upload_target('up3', '/tmp/escape.png')", "ValueError", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Name a report file from a request",
        prompt: "Analysts can save a report under a name they type. Write `report_path(base, name)`: accept the name only if it is 1 to 40 letters, digits, `_` or `-` followed by `.csv` (no folders at all), and the resolved path is inside `base`. Return the resolved `Path`; otherwise raise `ValueError`.",
        spec: [
          ["Function", "`report_path(base, name)`"],
          ["Name rule", "full match of `[A-Za-z0-9_-]{1,40}\\.csv`"],
          ["Returns", "`(Path(base) / name).resolve()` when the name is allowed and the result is inside the resolved base"],
          ["Raises", "`ValueError` otherwise"],
        ],
        starter: src`
import re
from pathlib import Path

def report_path(base, name):
    return Path(base) / name

print(report_path("reports", "march_revenue.csv").name)
`,
        answer: src`
import re
from pathlib import Path

def report_path(base, name):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}\.csv", name):
        raise ValueError(f"not an allowed report name: {name!r}")
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError(f"{name!r} is outside {base}")
    return target

print(report_path("reports", "march_revenue.csv").name)
`,
        alternatives: [
          src`
from pathlib import Path

ALLOWED = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-")

def report_path(base, name):
    stem = name[:-4] if name.endswith(".csv") else ""
    if not 1 <= len(stem) <= 40 or any(ch not in ALLOWED for ch in stem):
        raise ValueError("bad name")
    root = Path(base).resolve()
    target = (root / name).resolve()
    if root not in target.parents:
        raise ValueError("outside")
    return target
`,
        ],
        wrong: [
          {
            code: src`
from pathlib import Path

def report_path(base, name):
    root = Path(base).resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise ValueError("outside")
    return target
`,
            fails: ["subfolder", "extension", "long"],
            why: "only the location is checked, so subfolders, other file types and any length are accepted",
          },
          {
            code: src`
import re
from pathlib import Path

def report_path(base, name):
    if not re.search(r"[A-Za-z0-9_-]{1,40}\.csv", name):
        raise ValueError("bad name")
    return (Path(base).resolve() / name).resolve()
`,
            fails: ["climb", "subfolder", "long"],
            why: "`re.search` finds a valid name inside `../../x.csv`, and nothing checks the resolved location",
          },
        ],
        hints: [
          "Two independent checks, both must pass: the name's shape, then the resolved location.",
          "The shape is a full match: letters, digits, underscore and dash, 1 to 40 of them, then `\\.csv`.",
          "Resolve both the base and the joined path before comparing them with `is_relative_to`.",
        ],
        task: {
          checks: [
            expr("returns", "an allowed name gives a path inside the folder", "from pathlib import Path as _P\nresult = str(report_path('rp1', 'march_revenue.csv').relative_to(_P('rp1').resolve()))", "march_revenue.csv", { show: "report_path('reports', 'march_revenue.csv')" }),
            raisesExpr("climb", "a name that climbs out", "report_path('rp2', '../../secrets.csv')", "ValueError", { show: "report_path('reports', '../../secrets.csv')" }),
            raisesExpr("subfolder", "a name with a folder in it", "report_path('rp3', 'archive/old.csv')", "ValueError", { hidden: true }),
            raisesExpr("extension", "a name with another extension", "report_path('rp4', 'run.py')", "ValueError", { hidden: true }),
            raisesExpr("long", "a 41-character name", `report_path('rp5', '${"a".repeat(41)}.csv')`, "ValueError", { hidden: true }),
            expr("forty", "a 40-character name", `result = report_path('rp6', '${"b".repeat(40)}.csv').name`, `${"b".repeat(40)}.csv`, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Extract an archive without zip slip",
        prompt: "Suppliers upload product images as ZIP archives, and the importer writes each member to `dest/<member name>` itself. A crafted archive can contain a member named `../../app/settings.py`. Write `safe_extract(zip_path, dest)`: if **any** member's resolved target would be outside `dest`, raise `ValueError` and write nothing; otherwise write every file member (`zf.read(name)`, written as bytes, creating folders as needed) and return the sorted list of member names written. Folder entries (names ending in `/`) are skipped.",
        spec: [
          ["Function", "`safe_extract(zip_path, dest)`"],
          ["Check first", "every member's `(Path(dest) / name).resolve()` must be inside `Path(dest).resolve()`; otherwise `ValueError` and no files written"],
          ["Write", "for each file member: create its folder, write `zf.read(name)` to the target"],
          ["Returns", "the sorted list of file member names written"],
        ],
        starter: src`
import zipfile
from pathlib import Path

def safe_extract(zip_path, dest):
    return []

with zipfile.ZipFile("images.zip", "w") as zf:
    zf.writestr("SPO-11681/front.jpg", b"jpeg bytes")
    zf.writestr("SPO-11681/back.jpg", b"more jpeg bytes")
print(safe_extract("images.zip", "catalog"))
`,
        answer: src`
import zipfile
from pathlib import Path

def safe_extract(zip_path, dest):
    root = Path(dest).resolve()
    with zipfile.ZipFile(zip_path) as zf:
        names = [name for name in zf.namelist() if not name.endswith("/")]
        for name in zf.namelist():
            if not (root / name).resolve().is_relative_to(root):
                raise ValueError(f"member {name!r} would be written outside {dest}")
        for name in names:
            target = (root / name).resolve()
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(name))
    return sorted(names)

with zipfile.ZipFile("images.zip", "w") as zf:
    zf.writestr("SPO-11681/front.jpg", b"jpeg bytes")
    zf.writestr("SPO-11681/back.jpg", b"more jpeg bytes")
print(safe_extract("images.zip", "catalog"))
`,
        alternatives: [
          src`
import os
import zipfile
from pathlib import Path

def target_for(root, name):
    target = (root / name).resolve()
    if root != target and root not in target.parents:
        raise ValueError("unsafe member " + name)
    return target

def safe_extract(zip_path, dest):
    root = Path(dest).resolve()
    archive = zipfile.ZipFile(zip_path)
    with archive:
        plan = [(name, target_for(root, name)) for name in archive.namelist()]
        written = []
        for name, target in plan:
            if name.endswith("/"):
                continue
            os.makedirs(target.parent, exist_ok=True)
            with open(target, "wb") as out:
                out.write(archive.read(name))
            written.append(name)
    return sorted(written)
`,
        ],
        wrong: [
          {
            code: src`
import zipfile
from pathlib import Path

def safe_extract(zip_path, dest):
    root = Path(dest).resolve()
    written = []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            target = (root / name).resolve()
            if not target.is_relative_to(root):
                raise ValueError(f"member {name!r} is outside {dest}")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(name))
            written.append(name)
    return sorted(written)
`,
            fails: ["nothing-written"],
            why: "members are checked one at a time while extracting, so the good files before the bad member are already written",
          },
          {
            code: src`
import zipfile
from pathlib import Path

def safe_extract(zip_path, dest):
    written = []
    with zipfile.ZipFile(zip_path) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            target = Path(dest) / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(zf.read(name))
            written.append(name)
    return sorted(written)
`,
            fails: ["refused", "nothing-written", "no-escape"],
            why: "nothing is checked, so `../` members are written outside the destination",
          },
        ],
        hints: [
          "Two passes over the member names: first check every one, then write.",
          "A member is safe when `(root / name).resolve()` is relative to the resolved destination.",
          "Skip names ending in `/` when writing; make each file's parent folder before writing its bytes.",
        ],
        task: {
          checks: [
            expr("returns", "a clean archive is extracted", lines(
              "import zipfile as _z",
              "with _z.ZipFile('ok.zip', 'w') as _f:",
              "    _f.writestr('SPO-11681/front.jpg', b'jpeg bytes')",
              "    _f.writestr('SPO-11681/back.jpg', b'more jpeg bytes')",
              "_names = safe_extract('ok.zip', 'cat1')",
              "result = (_names, open('cat1/SPO-11681/back.jpg', 'rb').read() == b'more jpeg bytes')",
            ), py.tuple(pv(["SPO-11681/back.jpg", "SPO-11681/front.jpg"]), py.bool(true)), { show: "safe_extract('images.zip', 'catalog')" }),
            raisesExpr("refused", "an archive with a member that climbs out", lines(
              "import zipfile as _z",
              "with _z.ZipFile('bad1.zip', 'w') as _f:",
              "    _f.writestr('ok.jpg', b'x')",
              "    _f.writestr('../../escaped.txt', b'gotcha')",
              "safe_extract('bad1.zip', 'cat2/inner')",
            ), "ValueError", { show: "safe_extract(archive with '../../escaped.txt', 'catalog')" }),
            expr("nothing-written", "a bad member later in the archive stops everything", lines(
              "import zipfile as _z, os as _os",
              "with _z.ZipFile('bad2.zip', 'w') as _f:",
              "    _f.writestr('first.jpg', b'x')",
              "    _f.writestr('second.jpg', b'y')",
              "    _f.writestr('../outside.txt', b'z')",
              "try:",
              "    safe_extract('bad2.zip', 'cat3')",
              "except ValueError:",
              "    pass",
              "result = _os.path.exists('cat3/first.jpg') or _os.path.exists('outside.txt')",
            ), false, { hidden: true }),
            expr("no-escape", "the climbing member never reaches the disk", lines(
              "import zipfile as _z, os as _os",
              "_os.makedirs('cat4/deep', exist_ok=True)",
              "with _z.ZipFile('bad3.zip', 'w') as _f:",
              "    _f.writestr('../../planted.txt', b'z')",
              "try:",
              "    safe_extract('bad3.zip', 'cat4/deep')",
              "except ValueError:",
              "    pass",
              "result = _os.path.exists('planted.txt')",
            ), false, { hidden: true }),
            expr("folders", "an archive with folder entries", lines(
              "import zipfile as _z",
              "with _z.ZipFile('dirs.zip', 'w') as _f:",
              "    _f.writestr('HOM-22847/', b'')",
              "    _f.writestr('HOM-22847/side.jpg', b'img')",
              "result = safe_extract('dirs.zip', 'cat5')",
            ), ["HOM-22847/side.jpg"], { hidden: true }),
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

base = PurePosixPath("/srv/uploads")
print(base / "a/b.png")
print(base / "/srv/app/settings.py")
print(PurePosixPath("/srv/uploads_old/x.png").is_relative_to(base))
print(str(PurePosixPath("/srv/uploads_old/x.png")).startswith(str(base)))
`,
        choices: [
          "/srv/uploads/a/b.png\n/srv/app/settings.py\nFalse\nTrue",
          "/srv/uploads/a/b.png\n/srv/uploads/srv/app/settings.py\nFalse\nTrue",
          "/srv/uploads/a/b.png\n/srv/app/settings.py\nTrue\nTrue",
          "/srv/uploads/a/b.png\n/srv/app/settings.py\nFalse\nFalse",
        ],
        answer: 0,
        why: "Joining an absolute path discards the base. `is_relative_to` compares whole components, so `uploads_old` is not inside `uploads`, but a text `startswith` says it is.",
      },
      {
        id: "q2",
        prompt: "A common mistake: checking the text instead of the resolved path. Which names does this check let through?",
        program: src`
def allowed(name):
    return ".." not in name

for name in ["report.csv", "/etc/passwd", "notes..txt", "../secret.env"]:
    print(name, allowed(name))
`,
        choices: [
          "report.csv True\n/etc/passwd True\nnotes..txt False\n../secret.env False",
          "report.csv True\n/etc/passwd False\nnotes..txt True\n../secret.env False",
          "report.csv True\n/etc/passwd True\nnotes..txt True\n../secret.env False",
          "report.csv True\n/etc/passwd False\nnotes..txt False\n../secret.env False",
        ],
        answer: 0,
        why: "The absolute path escapes without any `..`, while a harmless name with two dots is refused. Resolving and checking the location gets both right.",
      },
      {
        id: "q3",
        prompt: "An importer extracts an uploaded archive. When should it check the member names?",
        choices: [
          "All of them, before writing any file",
          "Each one just before writing it",
          "After extracting, by looking for unexpected files",
          "Only the first member, since archives are made by one tool",
        ],
        answer: 0,
        why: "Checking while extracting leaves the earlier files written when a bad member turns up, and checking afterwards is too late: the file outside the folder already exists.",
      },
    ],
    review: [
      "A file name from outside is a path: `..` climbs and an absolute name replaces the base.",
      "Resolve the joined path and accept it only if it `is_relative_to` the resolved base; never trust text checks or `startswith`.",
      "For archives, check every member before writing anything.",
      "Next module: once code is safe, you need to see what it does in production. The Observability & Operations module: observability.",
    ],
  },
];
