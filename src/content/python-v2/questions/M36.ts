/**
 * M36 practice: ten independent problems on references, copies, cycles and weak references, measuring memory and
 * reading bytecode (PY-L36-01 … PY-L36-05).
 *
 * Mix: 3 function implementations, 3 debugging (a registry that never forgets, a cache that evicts the wrong entry,
 * a mutable default argument), 1 performance (a streaming aggregation graded by its tracemalloc peak), 1 data
 * transformation (a deep configuration merge with no shared parts) and 2 output predictions. Easy: 02, 03, 06, 10.
 * Medium: 12, 13, 16, 19. Hard: 20, 22.
 *
 * Freeing is checked with weakref while the cycle collector is paused, so the result doesn't depend on when it runs.
 * Bytecode questions compare names and relative counts, never instruction spellings that change between versions.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
/** Run `body` (which sets `result`) with the cycle collector paused, so only reference counting frees objects. */
const noGc = (body: string[]) => ["import gc as _gc", "import weakref as _wr", "_gc.disable()", "try:", ...body.map((l) => "    " + l), "finally:", "    _gc.enable()"].join("\n");

export const m36Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q36-02",
    version: 2,
    slug: "copy-an-order",
    title: "Predict: copying an order",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "deep-copy", "dict-literal", "dict-lookup", "identity", "import-module", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "print-call", "print-several", "print-text", "string-index"],
    prompt: "An order is copied twice, once with `.copy()` and once with `copy.deepcopy`, and both copies are changed. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`.copy()` on a dictionary is shallow: new outer dictionary, same values inside it.",
      "Replacing a key in the shallow copy doesn't affect the original; appending to a list inside it does.",
      "The deep copy has its own `items` list, so nothing done to it reaches the original.",
    ],
    explanation: "`a[\"status\"] = …` replaces a key in `a` only, so the order is still `paid`. `a[\"items\"]` is the order's own list, so the append shows in the order. `b` has its own list, so its append doesn't. Each copy ends with 2 items; `a`'s list is the original's, `b`'s isn't.",
    predict: {
      program: src`
import copy

order = {"id": "O100282", "items": ["SPO-11681"], "status": "paid"}
a = order.copy()
b = copy.deepcopy(order)
a["status"] = "shipped"
a["items"].append("HOM-22847")
b["items"].append("ELE-24781")
print(order["status"], order["items"])
print(len(a["items"]), len(b["items"]))
print(a["items"] is order["items"], b["items"] is order["items"])
`,
      output: "paid ['SPO-11681', 'HOM-22847']\n2 2\nTrue False\n",
      wrongPredictions: [
        "shipped ['SPO-11681', 'HOM-22847']\n2 2\nTrue False\n",
        "paid ['SPO-11681']\n2 2\nFalse False\n",
        "paid ['SPO-11681', 'HOM-22847', 'ELE-24781']\n2 2\nTrue False\n",
        "paid ['SPO-11681', 'HOM-22847']\n3 2\nTrue False\n",
      ],
    },
  },
  {
    id: "PY-Q36-03",
    version: 2,
    slug: "session-registry-leak",
    title: "Fix the session registry that never forgets",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "attr-assign", "boolean", "class-def", "dict-literal", "function-def", "function-param", "function-return", "init-method", "len-call", "list-mutate", "method-def", "plain-class", "print-call", "reassignment", "self-name", "string-index", "top-level-indent"],
    prompt: "A web app keeps its open sessions in a registry. After a day the server's memory is full: `open_count()` keeps growing although users log out, and closed sessions are never freed. Fix `close` so a closed session is marked closed **and** the registry lets go of it.",
    spec: [
      ["Class", "`SessionRegistry()` with `start(session_id, user)`, `close(session_id)` and `open_count()`"],
      ["close(session_id)", "set the session's `closed` to `True` and remove it from the registry; an unknown ID still raises `KeyError`"],
      ["Rule", "once closed, the registry must not keep the session object alive"],
    ],
    hiddenKinds: ["a closed session is freed once the caller drops it", "closing an unknown session", "closing one of several sessions"],
    hints: [
      "Count the references to a session after `close`: who still refers to it?",
      "The registry's dictionary is the reference that keeps every closed session alive.",
      "Delete the entry from the dictionary after marking the session closed.",
    ],
    explanation: "`close` set the flag but left the session in `self.sessions`, so the dictionary kept a reference to every session ever opened: `open_count()` grew and nothing was freed. Removing the entry (`del self.sessions[session_id]` or `pop`) drops the registry's reference; when the caller drops theirs, reference counting frees it. Setting the entry to `None` frees the session but leaves the key, so the count is still wrong.",
    code: {
      starter: src`
class Session:
    def __init__(self, session_id, user):
        self.session_id = session_id
        self.user = user
        self.closed = False

class SessionRegistry:
    def __init__(self):
        self.sessions = {}

    def start(self, session_id, user):
        session = Session(session_id, user)
        self.sessions[session_id] = session
        return session

    def close(self, session_id):
        session = self.sessions[session_id]
        session.closed = True

    def open_count(self):
        return len(self.sessions)

registry = SessionRegistry()
registry.start("s-1", "C00077")
registry.start("s-2", "C01338")
registry.close("s-1")
print(registry.open_count())
`,
      answer: src`
class Session:
    def __init__(self, session_id, user):
        self.session_id = session_id
        self.user = user
        self.closed = False

class SessionRegistry:
    def __init__(self):
        self.sessions = {}

    def start(self, session_id, user):
        session = Session(session_id, user)
        self.sessions[session_id] = session
        return session

    def close(self, session_id):
        session = self.sessions[session_id]
        session.closed = True
        del self.sessions[session_id]

    def open_count(self):
        return len(self.sessions)

registry = SessionRegistry()
registry.start("s-1", "C00077")
registry.start("s-2", "C01338")
registry.close("s-1")
print(registry.open_count())
`,
      alternatives: [
        src`
class Session:
    def __init__(self, session_id, user):
        self.session_id = session_id
        self.user = user
        self.closed = False

class SessionRegistry:
    def __init__(self):
        self.sessions = {}

    def start(self, session_id, user):
        self.sessions[session_id] = Session(session_id, user)
        return self.sessions[session_id]

    def close(self, session_id):
        self.sessions.pop(session_id).closed = True

    def open_count(self):
        return len(self.sessions)
`,
      ],
      wrong: [
        {
          code: src`
class Session:
    def __init__(self, session_id, user):
        self.session_id = session_id
        self.user = user
        self.closed = False

class SessionRegistry:
    def __init__(self):
        self.sessions = {}

    def start(self, session_id, user):
        session = Session(session_id, user)
        self.sessions[session_id] = session
        return session

    def close(self, session_id):
        self.sessions[session_id].closed = True
        self.sessions[session_id] = None

    def open_count(self):
        return len(self.sessions)
`,
          fails: ["count", "several"],
          why: "the session is freed, but its key stays in the registry, so `open_count()` still counts it",
        },
        {
          code: src`
class Session:
    def __init__(self, session_id, user):
        self.session_id = session_id
        self.user = user
        self.closed = False

class SessionRegistry:
    def __init__(self):
        self.sessions = {}

    def start(self, session_id, user):
        session = Session(session_id, user)
        self.sessions[session_id] = session
        return session

    def close(self, session_id):
        self.sessions.pop(session_id, None)

    def open_count(self):
        return len(self.sessions)
`,
          fails: ["count", "unknown"],
          why: "the session is never marked closed, and closing an unknown ID silently does nothing",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "count",
            label: "close() marks the session closed and removes it from the count",
            show: "start s-1 and s-2, close s-1",
            expr: "_r = SessionRegistry()\n_s = _r.start('s-1', 'C00077')\n_r.start('s-2', 'C01338')\n_r.close('s-1')\nresult = [_r.open_count(), _s.closed]",
            expected: py.list(py.int(1), yes),
          },
          {
            kind: "expr",
            id: "freed",
            label: "a closed session is freed once the caller drops it",
            hidden: true,
            expr: noGc(["_r = SessionRegistry()", "_s = _r.start('s-9', 'C00038')", "_w = _wr.ref(_s)", "_r.close('s-9')", "del _s", "result = _w() is None"]),
            expected: yes,
          },
          {
            kind: "expr",
            id: "unknown",
            label: "closing an unknown session raises KeyError",
            hidden: true,
            expr: "SessionRegistry().close('nope')",
            raises: "KeyError",
          },
          {
            kind: "expr",
            id: "several",
            label: "closing one of several sessions leaves the others open",
            hidden: true,
            expr: "_r = SessionRegistry()\nfor _i in range(5):\n    _r.start(f's-{_i}', 'C1')\n_r.close('s-2')\n_r.close('s-4')\nresult = [_r.open_count(), sorted(_r.sessions)]",
            expected: py.list(py.int(3), py.list(py.str("s-0"), py.str("s-1"), py.str("s-3"))),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q36-06",
    version: 2,
    slug: "move-between-carts",
    title: "Move an item between two carts in place",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["assignment", "boolean", "comparison", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-literal", "list-mutate", "logical", "membership", "print-call", "print-several", "print-text", "range-call", "string-index", "top-level-indent"],
    prompt: "A shop lets customers move an item from their cart to their wish list. The page holds references to both lists, so the function must change **those** lists in place, not build new ones. And when both arguments are the very same list, there is nothing to move.",
    spec: [
      ["Function", "`move_item(source, target, sku)`"],
      ["Effect", "remove the first `sku` from `source` and append it to `target`, changing both lists in place"],
      ["Returns", "`True` if the item was moved; `False` (and nothing changes) when `sku` isn't in `source` or when `source` and `target` are the same list object"],
    ],
    hiddenKinds: ["an SKU that appears twice in the source", "an SKU that isn't in the source", "source and target are the same list", "an empty target"],
    hints: [
      "`remove` and `append` change a list in place; assigning a new list to a parameter only changes the local name.",
      "Check `sku in source` before removing, so a missing item returns False instead of raising.",
      "Use `is` to tell whether the two parameters refer to the same list object.",
    ],
    explanation: "`source.remove(sku)` deletes the first occurrence in the caller's own list and `target.append(sku)` adds to theirs, so both changes are visible afterwards. Building `source = [...]` would only rebind the local name. `source is target` catches the case where both references point at one list; without it, the item would be removed and appended again, moving it to the end.",
    code: {
      starter: src`
def move_item(source, target, sku):
    return False

cart = ["SPO-11681", "HOM-22847"]
wish_list = ["ELE-24781"]
print(move_item(cart, wish_list, "HOM-22847"), cart, wish_list)
`,
      answer: src`
def move_item(source, target, sku):
    if source is target or sku not in source:
        return False
    source.remove(sku)
    target.append(sku)
    return True

cart = ["SPO-11681", "HOM-22847"]
wish_list = ["ELE-24781"]
print(move_item(cart, wish_list, "HOM-22847"), cart, wish_list)
`,
      alternatives: [
        src`
def move_item(source, target, sku):
    if id(source) == id(target):
        return False
    for i in range(len(source)):
        if source[i] == sku:
            target.append(source.pop(i))
            return True
    return False
`,
      ],
      wrong: [
        {
          code: src`
def move_item(source, target, sku):
    if sku not in source:
        return False
    source = [item for item in source if item != sku]
    target = target + [sku]
    return True
`,
          fails: ["returns", "same-list"],
          why: "it rebinds the parameter names to new lists, so the caller's carts never change",
        },
        {
          code: src`
def move_item(source, target, sku):
    if sku not in source:
        return False
    source.remove(sku)
    target.append(sku)
    return True
`,
          fails: ["same-list"],
          why: "when both arguments are one list, the item is removed and appended again, moving it to the end",
        },
      ],
      task: {
        checks: [
          fn("returns", "move_item", [
            example([["SPO-11681", "HOM-22847"], ["ELE-24781"], "HOM-22847"], true, { argsAfter: [["SPO-11681"], ["ELE-24781", "HOM-22847"], "HOM-22847"] }),
            example([["SPO-11681"], [], "BOO-58412"], false, { argsAfter: [["SPO-11681"], [], "BOO-58412"] }),
            example([["A", "B"], ["C"], "A"], true, { argsAfter: [["B"], ["C", "A"], "A"] }),
            hiddenCase("an SKU that appears twice in the source", [["X", "Y", "X"], [], "X"], true, { argsAfter: [["Y", "X"], ["X"], "X"] }),
            hiddenCase("an empty source", [[], ["Q"], "Q"], false, { argsAfter: [[], ["Q"], "Q"] }),
          ], { label: "move_item() moves the item between the caller's lists" }),
          {
            kind: "expr",
            id: "same-list",
            label: "moving within the same list changes nothing",
            hidden: true,
            expr: "_cart = ['SPO-11681', 'HOM-22847', 'ELE-24781']\nresult = [move_item(_cart, _cart, 'SPO-11681'), _cart]",
            expected: py.list(py.bool(false), py.list(py.str("SPO-11681"), py.str("HOM-22847"), py.str("ELE-24781"))),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q36-10",
    version: 2,
    slug: "fewer-instructions",
    title: "Which version compiles to fewer instructions?",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "bytecode-dis", "comparison", "conditional-expr", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "membership", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "A code-review bot compares two ways of writing a statement by how many bytecode instructions each compiles to. Write `fewer_instructions(first, second)`: compile each source text with `compile(text, \"<review>\", \"exec\")`, count the instructions `dis.get_instructions` yields for it, and say which is shorter.",
    spec: [
      ["Function", "`fewer_instructions(first, second)`"],
      ["first, second", "Python source texts"],
      ["Returns", "`\"first\"` or `\"second\"` (whichever compiles to fewer instructions), or `\"same\"` when the counts are equal"],
    ],
    hiddenKinds: ["the same statement with different names", "a longer first text", "one empty text"],
    hints: [
      "`compile(text, \"<review>\", \"exec\")` turns source text into a code object without running it.",
      "`dis.get_instructions` accepts that code object; count what it yields.",
      "Compare the two counts and return one of the three words.",
    ],
    explanation: "The code objects are inspected, never run. Counting instructions gives a rough, version-dependent sense of how much work each version describes: renaming variables doesn't change the count, while an extra operation or call adds instructions. (Fewer instructions doesn't always mean faster; the Profiling & Optimization module measures.)",
    code: {
      starter: src`
import dis

def fewer_instructions(first, second):
    return "same"

print(fewer_instructions("total = price * qty", "total = price * qty * (1 - rate)"))
`,
      answer: src`
import dis

def count_instructions(text):
    code = compile(text, "<review>", "exec")
    count = 0
    for ins in dis.get_instructions(code):
        count += 1
    return count

def fewer_instructions(first, second):
    a = count_instructions(first)
    b = count_instructions(second)
    if a < b:
        return "first"
    if b < a:
        return "second"
    return "same"

print(fewer_instructions("total = price * qty", "total = price * qty * (1 - rate)"))
`,
      alternatives: [
        src`
import dis

def fewer_instructions(first, second):
    sizes = [len(list(dis.get_instructions(compile(t, "<review>", "exec")))) for t in (first, second)]
    if sizes[0] == sizes[1]:
        return "same"
    return "first" if sizes[0] < sizes[1] else "second"
`,
      ],
      wrong: [
        {
          code: src`
def fewer_instructions(first, second):
    if len(first) < len(second):
        return "first"
    if len(second) < len(first):
        return "second"
    return "same"
`,
          fails: ["returns"],
          why: "it compares the length of the text, so longer names look like more work",
        },
        {
          code: src`
import dis

def fewer_instructions(first, second):
    a = len(list(dis.get_instructions(compile(first, "<review>", "exec"))))
    b = len(list(dis.get_instructions(compile(second, "<review>", "exec"))))
    if a < b:
        return "second"
    if b < a:
        return "first"
    return "same"
`,
          fails: ["returns"],
          why: "the answers are reversed: it names the version with more instructions",
        },
      ],
      task: {
        checks: [
          fn("returns", "fewer_instructions", [
            example(["total = price * qty", "total = price * qty * (1 - rate)"], "first"),
            example(["x = a + b + c", "x = a + b"], "second"),
            example(["fare = 7", "tip = 2"], "same"),
            hiddenCase("the same statement with different names", ["order_total_after_discount = order_subtotal - discount_amount", "t = s - d"], "same"),
            hiddenCase("a function call against plain arithmetic", ["n = len(items) + 1", "n = count + 1"], "second"),
            hiddenCase("one empty text", ["", "x = 1"], "first"),
          ], { label: "fewer_instructions() compares the compiled instruction counts" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q36-12",
    version: 2,
    slug: "deepcopy-shared-sizes",
    title: "Predict: a deep copy of shared size lists",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 8,
    requires: ["assignment", "deep-copy", "dict-literal", "dict-lookup", "identity", "import-module", "list-index", "list-literal", "list-mutate", "print-call", "print-several", "print-text", "string-index", "string-slice"],
    prompt: "Two products share one list of sizes. The product list is deep-copied once and shallow-copied once. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "In `products`, both dictionaries refer to the same `sizes` list. A deep copy keeps that sharing, inside the copy.",
      "`products[:]` is shallow: `backup[1]` is the original second product.",
      "Follow each append to the one list object it changes, then read what each print shows.",
    ],
    explanation: "`deepcopy` copies the shared `sizes` list once, so both cloned products share the clone's list: appending `L` through `clone[0]` shows in `clone[1]` (`['S', 'M', 'L']`), and not in the original. `backup` is a shallow copy whose items are the original dictionaries, so appending `XL` through `backup[1]` changes the original shared list, which `products[0]` sees. The last line: the clone's two size lists are one object (True), and `backup[0]` is the original first product (True).",
    predict: {
      program: src`
import copy

sizes = ["S", "M"]
products = [{"sku": "SPO-11681", "sizes": sizes}, {"sku": "SPO-20417", "sizes": sizes}]
clone = copy.deepcopy(products)
clone[0]["sizes"].append("L")
backup = products[:]
backup[1]["sizes"].append("XL")
print(clone[1]["sizes"])
print(products[0]["sizes"])
print(clone[0]["sizes"] is clone[1]["sizes"], backup[0] is products[0])
`,
      output: "['S', 'M', 'L']\n['S', 'M', 'XL']\nTrue True\n",
      wrongPredictions: [
        "['S', 'M']\n['S', 'M', 'XL']\nFalse True\n",
        "['S', 'M', 'L']\n['S', 'M']\nTrue False\n",
        "['S', 'M', 'L', 'XL']\n['S', 'M', 'L', 'XL']\nTrue True\n",
        "['S', 'M', 'L']\n['S', 'M', 'XL']\nTrue False\n",
      ],
    },
  },
  {
    id: "PY-Q36-13",
    version: 2,
    slug: "recent-orders-eviction",
    title: "Fix the recent-orders cache that keeps old orders",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "attr-assign", "class-def", "comparison", "dict-literal", "for-loop", "function-def", "function-param", "if-statement", "init-method", "len-call", "list-mutate", "membership", "method-def", "none-value", "plain-class", "print-call", "self-name", "string-index", "top-level-indent", "while-loop"],
    prompt: "A support screen keeps only the most recent `limit` orders in memory. Memory keeps growing, and agents report that the order they just opened is often missing while week-old ones are still there. Find the bug in `put` and fix it, so the cache holds the newest `limit` orders and lets the oldest ones be freed.",
    spec: [
      ["Class", "`RecentOrders(limit)` with `put(order_id, order)` and an `orders` dictionary"],
      ["put", "store the order; if more than `limit` are stored, remove the **oldest** one (the one added first)"],
      ["Rule", "adding an ID that is already stored replaces its order and counts it as newest"],
    ],
    hiddenKinds: ["the oldest order is freed after eviction", "a limit of one", "re-adding an existing order"],
    hints: [
      "Dictionaries remember insertion order. Which end of `list(self.orders)` holds the order added first?",
      "Re-adding an existing key keeps its old position unless you remove it first.",
      "Evict from the front, and make a re-added order move to the back.",
    ],
    explanation: "`list(self.orders)[-1]` is the key added **last**, so every add beyond the limit deleted the order just added and kept the oldest ones forever. The oldest key is `next(iter(self.orders))` (or `list(self.orders)[0]`). Assigning to an existing key keeps its original position, so a re-added order must be deleted before it is stored again to become the newest.",
    code: {
      starter: src`
class RecentOrders:
    def __init__(self, limit):
        self.limit = limit
        self.orders = {}

    def put(self, order_id, order):
        self.orders[order_id] = order
        if len(self.orders) > self.limit:
            oldest = list(self.orders)[-1]
            del self.orders[oldest]

recent = RecentOrders(2)
for order_id in ["O100282", "O100376", "O100918"]:
    recent.put(order_id, {"order_id": order_id})
print(list(recent.orders))
`,
      answer: src`
class RecentOrders:
    def __init__(self, limit):
        self.limit = limit
        self.orders = {}

    def put(self, order_id, order):
        if order_id in self.orders:
            del self.orders[order_id]
        self.orders[order_id] = order
        if len(self.orders) > self.limit:
            oldest = list(self.orders)[0]
            del self.orders[oldest]

recent = RecentOrders(2)
for order_id in ["O100282", "O100376", "O100918"]:
    recent.put(order_id, {"order_id": order_id})
print(list(recent.orders))
`,
      alternatives: [
        src`
class RecentOrders:
    def __init__(self, limit):
        self.limit = limit
        self.orders = {}

    def put(self, order_id, order):
        self.orders.pop(order_id, None)
        self.orders[order_id] = order
        while len(self.orders) > self.limit:
            del self.orders[next(iter(self.orders))]
`,
      ],
      wrong: [
        {
          code: src`
class RecentOrders:
    def __init__(self, limit):
        self.limit = limit
        self.orders = {}

    def put(self, order_id, order):
        self.orders[order_id] = order
        if len(self.orders) > self.limit:
            oldest = list(self.orders)[0]
            del self.orders[oldest]
`,
          fails: ["readd"],
          why: "the eviction end is fixed, but a re-added order keeps its old position and is evicted as if it were old",
        },
        {
          code: src`
class RecentOrders:
    def __init__(self, limit):
        self.limit = limit
        self.orders = {}

    def put(self, order_id, order):
        if order_id in self.orders:
            del self.orders[order_id]
        self.orders[order_id] = order
        if len(self.orders) > self.limit + 1:
            oldest = list(self.orders)[0]
            del self.orders[oldest]
`,
          fails: ["freed", "newest", "one", "readd"],
          why: "the limit check is off by one, so the cache holds one order too many",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "newest",
            label: "the cache keeps the newest `limit` orders",
            show: "limit 2, add O100282, O100376, O100918",
            expr: "_r = RecentOrders(2)\nfor _o in ['O100282', 'O100376', 'O100918']:\n    _r.put(_o, {'order_id': _o})\nresult = list(_r.orders)",
            expected: py.list(py.str("O100376"), py.str("O100918")),
          },
          {
            kind: "expr",
            id: "freed",
            label: "the evicted oldest order is freed",
            hidden: true,
            expr: noGc([
              "class _Order:",
              "    pass",
              "_r = RecentOrders(2)",
              "_first = _Order()",
              "_w = _wr.ref(_first)",
              "_r.put('a', _first)",
              "del _first",
              "_r.put('b', _Order())",
              "_r.put('c', _Order())",
              "result = _w() is None",
            ]),
            expected: yes,
          },
          {
            kind: "expr",
            id: "one",
            label: "a limit of one keeps only the latest order",
            hidden: true,
            expr: "_r = RecentOrders(1)\n_r.put('x', 1)\n_r.put('y', 2)\nresult = _r.orders",
            expected: py.dict([[py.str("y"), py.int(2)]]),
          },
          {
            kind: "expr",
            id: "readd",
            label: "re-adding an order makes it the newest",
            hidden: true,
            expr: "_r = RecentOrders(2)\n_r.put('a', 1)\n_r.put('b', 2)\n_r.put('a', 3)\n_r.put('c', 4)\nresult = _r.orders",
            expected: py.dict([[py.str("a"), py.int(3)], [py.str("c"), py.int(4)]]),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q36-16",
    version: 2,
    slug: "shared-error-list",
    title: "Fix the error list that grows across rows",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "comparison", "conditional-expr", "dict-get", "dict-literal", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "reassignment", "top-level-indent"],
    prompt: "An import job validates each row with `collect_errors`. The first bad row reports one error, but every later row reports the errors of all the rows before it, even rows that are perfectly fine. Fix the function. Callers may still pass their own list to collect into.",
    spec: [
      ["Function", "`collect_errors(row, errors=None)`"],
      ["Checks", "`\"missing order_id\"` when `order_id` is missing or empty; `\"negative total\"` when `total` is below 0"],
      ["Returns", "the list the errors were appended to: the caller's list if one was given, otherwise a new list"],
    ],
    hiddenKinds: ["a valid row after an invalid one", "a row with both problems", "the caller passes their own list"],
    hints: [
      "Where is the default list created, and how many times?",
      "A default value is evaluated once, when `def` runs, so every call without `errors` shares it.",
      "Use `None` as the default and create a new list inside the function when nothing was passed.",
    ],
    explanation: "`errors=[]` creates one list when the function is defined, and every call that doesn't pass a list appends to that same object, so errors pile up across rows. With `errors=None` and `if errors is None: errors = []`, each call gets a new list, while a caller who passes a list still collects into it.",
    code: {
      starter: src`
def collect_errors(row, errors=[]):
    if not row.get("order_id"):
        errors.append("missing order_id")
    if row.get("total", 0) < 0:
        errors.append("negative total")
    return errors

print(collect_errors({"order_id": "", "total": 12.5}))
print(collect_errors({"order_id": "O100282", "total": 35.84}))
`,
      answer: src`
def collect_errors(row, errors=None):
    if errors is None:
        errors = []
    if not row.get("order_id"):
        errors.append("missing order_id")
    if row.get("total", 0) < 0:
        errors.append("negative total")
    return errors

print(collect_errors({"order_id": "", "total": 12.5}))
print(collect_errors({"order_id": "O100282", "total": 35.84}))
`,
      alternatives: [
        src`
def collect_errors(row, errors=None):
    found = [] if errors is None else errors
    if row.get("order_id") in (None, ""):
        found.append("missing order_id")
    if row.get("total", 0) < 0:
        found.append("negative total")
    return found
`,
      ],
      wrong: [
        {
          code: src`
def collect_errors(row, errors=None):
    errors = []
    if not row.get("order_id"):
        errors.append("missing order_id")
    if row.get("total", 0) < 0:
        errors.append("negative total")
    return errors
`,
          fails: ["own-list"],
          why: "it always starts a new list, ignoring the list the caller passed in",
        },
        {
          code: src`
def collect_errors(row, errors=[]):
    errors = errors.copy()
    if not row.get("order_id"):
        errors.append("missing order_id")
    if row.get("total", 0) < 0:
        errors.append("negative total")
    return errors
`,
          fails: ["own-list"],
          why: "copying stops the leak, but the caller's own list never receives the errors",
        },
      ],
      task: {
        checks: [
          fn("returns", "collect_errors", [
            example([{ order_id: "", total: 12.5 }], ["missing order_id"]),
            example([{ order_id: "O100282", total: 35.84 }], []),
            example([{ total: -3 }], ["missing order_id", "negative total"]),
            hiddenCase("a valid row after invalid ones", [{ order_id: "O100376", total: 91.47 }], []),
            hiddenCase("a negative total only", [{ order_id: "O100918", total: -55.72 }], ["negative total"]),
          ], { label: "collect_errors() reports each row's own errors" }),
          {
            kind: "expr",
            id: "own-list",
            label: "a list passed by the caller collects the errors",
            hidden: true,
            expr: "_mine = ['row 1: missing order_id']\n_back = collect_errors({'order_id': 'O1', 'total': -1}, _mine)\nresult = [_back is _mine, _mine]",
            expected: py.list(yes, py.list(py.str("row 1: missing order_id"), py.str("negative total"))),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q36-19",
    version: 2,
    slug: "streaming-zone-totals",
    title: "Total fares per zone in constant memory",
    format: "performance",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "continue-statement", "conversion", "defaultdict-call", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "print-text", "reassignment", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack"],
    prompt: "A month of taxi trips arrives as an iterator of CSV lines (`zone,fare_cents`, header first): millions of lines, more than fit in memory. Write `zone_totals(lines)` that adds up the fares per pickup zone while holding only one line at a time. The hidden test feeds 200,000 lines and measures the peak memory with tracemalloc.",
    spec: [
      ["Function", "`zone_totals(lines)`"],
      ["lines", "an iterable of text lines; the first is the header `zone,fare_cents`, each other line is `zone,cents` (whole numbers)"],
      ["Returns", "a dictionary from zone (text) to total cents (int)"],
      ["Constraint", "peak memory below 200,000 bytes for 200,000 lines from a generator"],
    ],
    hiddenKinds: ["only a header", "a zone appearing once", "200,000 lines from a generator (memory peak)"],
    hints: [
      "Loop over `lines` directly: an iterator hands you one line at a time, as long as you don't collect them.",
      "The first line is the header; skip it once (for example with a flag, or `next` on an iterator).",
      "Split each line on the comma and add the cents into a dictionary; never build a list of all lines.",
    ],
    explanation: "Reading the iterator line by line keeps one line in memory; the dictionary only grows with the number of zones (dozens), not with the number of trips. `list(lines)`, `\"\".join(lines).splitlines()` or a list of parsed rows hold all 200,000 lines at once, megabytes instead of kilobytes, and tracemalloc's peak shows it.",
    code: {
      starter: src`
def zone_totals(lines):
    rows = list(lines)
    totals = {}
    for row in rows[1:]:
        zone, cents = row.split(",")
        if zone not in totals:
            totals[zone] = 0
        totals[zone] += int(cents)
    return totals

print(zone_totals(["zone,fare_cents", "186,4080", "264,720", "186,1720"]))
`,
      answer: src`
def zone_totals(lines):
    totals = {}
    header = True
    for line in lines:
        if header:
            header = False
            continue
        zone, cents = line.split(",")
        if zone not in totals:
            totals[zone] = 0
        totals[zone] += int(cents)
    return totals

print(zone_totals(["zone,fare_cents", "186,4080", "264,720", "186,1720"]))
`,
      alternatives: [
        src`
from collections import defaultdict

def zone_totals(lines):
    it = iter(lines)
    next(it, None)
    totals = defaultdict(int)
    for line in it:
        zone, cents = line.strip().split(",")
        totals[zone] += int(cents)
    return dict(totals)
`,
      ],
      wrong: [
        {
          code: src`
def zone_totals(lines):
    parsed = [line.split(",") for line in lines][1:]
    totals = {}
    for zone, cents in parsed:
        totals[zone] = totals.get(zone, 0) + int(cents)
    return totals
`,
          fails: ["peak"],
          why: "right totals, but every line is parsed into a list first, so all of them are in memory at once",
        },
        {
          code: src`
def zone_totals(lines):
    totals = {}
    for line in lines:
        zone, cents = line.split(",")
        totals[zone] = totals.get(zone, 0) + int(cents)
    return totals
`,
          fails: ["returns", "peak"],
          why: "the header line is treated as data, so `int(\"fare_cents\")` raises ValueError",
        },
      ],
      task: {
        checks: [
          fn("returns", "zone_totals", [
            example([["zone,fare_cents", "186,4080", "264,720", "186,1720"]], { "186": 5800, "264": 720 }),
            example([["zone,fare_cents"]], {}),
            example([["zone,fare_cents", "48,1550"]], { "48": 1550 }),
            hiddenCase("an empty file", [[]], {}),
            hiddenCase("many zones", [["zone,fare_cents", "1,100", "2,200", "1,50", "3,1", "2,2"]], { "1": 150, "2": 202, "3": 1 }),
          ], { label: "zone_totals() adds the fares per zone" }),
          {
            kind: "expr",
            id: "peak",
            label: "zone_totals() keeps its peak below 200,000 bytes for 200,000 lines",
            hidden: true,
            expr: [
              "import tracemalloc as _tm",
              "def _lines():",
              "    yield 'zone,fare_cents'",
              "    for _i in range(200000):",
              "        yield f'{_i % 50},{100 + _i % 7}'",
              "_tm.start()",
              "_res = zone_totals(_lines())",
              "_cur, _peak = _tm.get_traced_memory()",
              "_tm.stop()",
              "result = [_res['0'], _peak < 200000]",
            ].join("\n"),
            expected: py.list(py.int(411994), yes),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q36-20",
    version: 2,
    slug: "hidden-dependencies",
    title: "Find each function's hidden global dependencies",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["assignment", "bytecode-dis", "comp-if", "comparison", "continue-statement", "dict-literal", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "print-call", "reassignment", "set-comp", "set-literal", "string-index", "top-level-indent", "truthiness"],
    prompt: "Before splitting a big module into smaller ones, a team wants to know which module-level names each function secretly depends on (globals it reads, not parameters). Write `hidden_dependencies(source)`: compile the module's source without running it, find each top-level function's code object, and list the globals it reads with `LOAD_GLOBAL`, leaving out built-ins such as `len` and `print`.",
    spec: [
      ["Function", "`hidden_dependencies(source)`"],
      ["source", "the text of a module whose top-level `def`s are to be analysed"],
      ["Returns", "a dictionary from function name to a sorted list of the distinct non-built-in globals it reads"],
      ["Tools", "`compile(source, \"<module>\", \"exec\")`; a module's functions are code objects in its `co_consts` (they have `co_name`); a name is built in when `hasattr(builtins, name)`"],
    ],
    hiddenKinds: ["a function that uses only built-ins and parameters", "a global read several times", "a module attribute such as json.dumps", "a module with no functions"],
    hints: [
      "Compiling gives a module code object; the code objects of its functions sit among its constants. Check each constant with `hasattr(const, \"co_code\")`.",
      "For each function code object, walk `dis.get_instructions(code)` and keep the `argval` of every `LOAD_GLOBAL`.",
      "Drop names that `builtins` has, remove repeats, and sort.",
    ],
    explanation: "`compile` turns the module into a code object without running it. Each top-level `def` becomes a code object stored in `co_consts`, named by `co_name`. Inside a function, reading a module-level name compiles to `LOAD_GLOBAL` (parameters and locals use `LOAD_FAST`), and `json.dumps` loads the global `json` and then an attribute. Built-ins are also loaded with `LOAD_GLOBAL`, so they are filtered out with the `builtins` module.",
    code: {
      starter: src`
import builtins
import dis

def hidden_dependencies(source):
    return {}

module = """
TAX = 0.0825
def price_with_tax(price):
    return round(price * (1 + TAX), 2)
def label(order):
    return FORMAT.format(order['id'], price_with_tax(order['total']))
"""
print(hidden_dependencies(module))
`,
      answer: src`
import builtins
import dis

def hidden_dependencies(source):
    module = compile(source, "<module>", "exec")
    result = {}
    for const in module.co_consts:
        if not hasattr(const, "co_code"):
            continue
        names = []
        for ins in dis.get_instructions(const):
            if ins.opname == "LOAD_GLOBAL" and not hasattr(builtins, ins.argval) and ins.argval not in names:
                names.append(ins.argval)
        result[const.co_name] = sorted(names)
    return result

module = """
TAX = 0.0825
def price_with_tax(price):
    return round(price * (1 + TAX), 2)
def label(order):
    return FORMAT.format(order['id'], price_with_tax(order['total']))
"""
print(hidden_dependencies(module))
`,
      alternatives: [
        src`
import builtins
import dis
import types

def hidden_dependencies(source):
    code = compile(source, "<module>", "exec")
    deps = {}
    for c in code.co_consts:
        if isinstance(c, types.CodeType):
            found = {i.argval for i in dis.get_instructions(c) if i.opname == "LOAD_GLOBAL"}
            deps[c.co_name] = sorted(n for n in found if n not in dir(builtins))
    return deps
`,
      ],
      wrong: [
        {
          code: src`
import builtins
import dis

def hidden_dependencies(source):
    module = compile(source, "<module>", "exec")
    result = {}
    for const in module.co_consts:
        if hasattr(const, "co_code"):
            names = []
            for ins in dis.get_instructions(const):
                if ins.opname == "LOAD_GLOBAL" and ins.argval not in names:
                    names.append(ins.argval)
            result[const.co_name] = sorted(names)
    return result
`,
          fails: ["returns"],
          why: "built-ins such as `round` and `len` are reported as if they were the module's own globals",
        },
        {
          code: src`
import builtins

def hidden_dependencies(source):
    module = compile(source, "<module>", "exec")
    result = {}
    for const in module.co_consts:
        if hasattr(const, "co_code"):
            result[const.co_name] = sorted(n for n in const.co_names if not hasattr(builtins, n))
    return result
`,
          fails: ["returns"],
          why: "`co_names` also holds attribute names such as `format`, so attributes are reported as globals",
        },
      ],
      task: {
        checks: [
          fn("returns", "hidden_dependencies", [
            example(["TAX = 0.0825\ndef price_with_tax(price):\n    return round(price * (1 + TAX), 2)\ndef label(order):\n    return FORMAT.format(order['id'], price_with_tax(order['total']))\n"], { price_with_tax: ["TAX"], label: ["FORMAT", "price_with_tax"] }),
            example(["def total(prices):\n    return sum(prices)\n"], { total: [] }),
            example(["RATES = {}\ndef convert(amount, currency):\n    return amount * RATES[currency] * RATES[currency]\n"], { convert: ["RATES"] }),
            hiddenCase("a module attribute such as json.dumps", ["import json\ndef export(rows):\n    return json.dumps(rows, indent=INDENT)\n"], { export: ["INDENT", "json"] }),
            hiddenCase("a module with no functions", ["LIMIT = 5\nprint(LIMIT)\n"], {}),
            hiddenCase("functions using only parameters and locals", ["def area(w, h):\n    result = w * h\n    return result\ndef double(x):\n    return x * 2\n"], { area: [], double: [] }),
          ], { label: "hidden_dependencies() lists the globals each function reads" }),
        ],
      },
    },
  },
  {
    id: "PY-Q36-22",
    version: 2,
    slug: "deep-merge-config",
    title: "Merge configuration layers without sharing anything",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "deep-copy", "dict-get", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "print-call", "print-several", "set-literal", "star-kwargs", "string-index", "top-level-indent"],
    prompt: "A service builds its settings from a base layer and an environment layer. Write `merge_config(base, override)`. Nested dictionaries are merged key by key; any other value in `override` replaces the base value. The result is handed to code that edits it, so it must not share **any** mutable object (dictionary or list) with either input, and neither input may change.",
    spec: [
      ["Function", "`merge_config(base, override)`"],
      ["Merging", "for each key in `override`: if both values are dictionaries, merge them the same way; otherwise the override value replaces the base value (a list replaces a list, it isn't joined)"],
      ["Order", "keys keep the base's order, then keys only in `override` in their order"],
      ["Returns", "a new dictionary that shares no dictionary or list with `base` or `override`"],
    ],
    hiddenKinds: ["three levels of nesting", "a dictionary replaced by a plain value", "a list in the override", "an empty override", "editing the result afterwards"],
    hints: [
      "Start from a deep copy of `base`, so nothing in the result is the base's.",
      "Walk the override: when both sides are dictionaries, merge into the copied sub-dictionary (recursion is fine here, configurations are shallow).",
      "Every value taken from `override` must be copied too, or the result would share its lists and dictionaries.",
    ],
    explanation: "Deep-copying the base first means every container in the result is new. For each override key, two dictionaries are merged recursively into the copy; anything else is replaced by a **deep copy** of the override value, because taking the value itself would share the override's lists and nested dictionaries with the result. A shallow `{**base, **override}` both loses nested base keys and shares everything.",
    code: {
      starter: src`
def merge_config(base, override):
    return {**base, **override}

base = {"db": {"host": "localhost", "pool": {"size": 5}}, "features": ["search"]}
override = {"db": {"pool": {"size": 20}}, "features": ["search", "reviews"]}
print(merge_config(base, override))
`,
      answer: src`
import copy

def merge_config(base, override):
    result = copy.deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_config(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result

base = {"db": {"host": "localhost", "pool": {"size": 5}}, "features": ["search"]}
override = {"db": {"pool": {"size": 20}}, "features": ["search", "reviews"]}
print(merge_config(base, override))
`,
      alternatives: [
        src`
from copy import deepcopy

def merge_config(base, override):
    merged = {}
    for key in base:
        merged[key] = deepcopy(base[key])
    for key in override:
        old = merged.get(key)
        new = override[key]
        if isinstance(old, dict) and isinstance(new, dict):
            merged[key] = merge_config(old, new)
        else:
            merged[key] = deepcopy(new)
    return merged
`,
      ],
      wrong: [
        {
          code: src`
import copy

def merge_config(base, override):
    result = copy.deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_config(result[key], value)
        else:
            result[key] = value
    return result
`,
          fails: ["independent"],
          why: "values taken from the override are the override's own lists and dictionaries, so editing the result changes the override",
        },
        {
          code: src`
import copy

def merge_config(base, override):
    result = copy.deepcopy(base)
    for key, value in override.items():
        result[key] = copy.deepcopy(value)
    return result
`,
          fails: ["independent", "returns"],
          why: "a nested override replaces the whole base section, losing settings such as the database host",
        },
      ],
      task: {
        checks: [
          fn("returns", "merge_config", [
            example([{ db: { host: "localhost", pool: { size: 5 } }, features: ["search"] }, { db: { pool: { size: 20 } }, features: ["search", "reviews"] }], { db: { host: "localhost", pool: { size: 20 } }, features: ["search", "reviews"] }),
            example([{ a: 1 }, { b: 2 }], { a: 1, b: 2 }),
            example([{ log: { level: "INFO" } }, {}], { log: { level: "INFO" } }),
            hiddenCase("three levels of nesting", [{ x: { y: { z: 1, w: 2 } } }, { x: { y: { z: 9 }, v: 3 } }], { x: { y: { z: 9, w: 2 }, v: 3 } }),
            hiddenCase("a dictionary replaced by a plain value", [{ cache: { ttl: 60 } }, { cache: null }], { cache: null }),
            hiddenCase("a plain value replaced by a dictionary", [{ retries: 3 }, { retries: { count: 5, backoff: 2 } }], { retries: { count: 5, backoff: 2 } }),
          ], { label: "merge_config() merges nested settings" }),
          fn("keeps-input", "merge_config", [keepsInput([{ db: { pool: { size: 5 } } }, { db: { pool: { size: 20 } } }])], { label: "merge_config() leaves both layers unchanged" }),
          {
            kind: "expr",
            id: "independent",
            label: "editing the merged result changes neither layer",
            hidden: true,
            expr: "_b = {'db': {'pool': {'size': 5}}, 'tags': ['a']}\n_o = {'features': ['x'], 'db': {'opts': {'ssl': True}}}\n_m = merge_config(_b, _o)\n_m['features'].append('y')\n_m['db']['opts']['ssl'] = False\n_m['db']['pool']['size'] = 99\n_m['tags'].append('b')\nresult = [_b, _o]",
            expected: py.list(
              py.dict([[py.str("db"), py.dict([[py.str("pool"), py.dict([[py.str("size"), py.int(5)]])]])], [py.str("tags"), py.list(py.str("a"))]]),
              py.dict([[py.str("features"), py.list(py.str("x"))], [py.str("db"), py.dict([[py.str("opts"), py.dict([[py.str("ssl"), yes]])]])]]),
            ),
          },
        ],
      },
    },
  },
];

