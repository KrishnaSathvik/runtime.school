/**
 * M36 Memory & Python Internals: five lessons (PY-L36-01 … PY-L36-05).
 *
 * What CPython actually does with your objects. Names, list slots and parameters are references, so two of them can
 * share one mutable object, and CPython frees an object the moment its last reference goes (reference counting).
 * Shallow and deep copies decide how much of a nested structure is shared. Reference cycles never reach zero, so
 * the cycle collector (gc) finds them, and weak references observe objects without keeping them alive. Memory is
 * measured with sys.getsizeof (shallow) and tracemalloc snapshots (which line allocated it), and __slots__ shrinks
 * many small objects. Finally, CPython runs bytecode (dis shows it) under the GIL, which is why `x += 1` is several
 * steps, not one.
 *
 * Everything here runs for real: the browser runs CPython 3.14 compiled to WebAssembly (Pyodide). Byte counts differ
 * between machines (this build is 32-bit, most desktops are 64-bit) and between Python versions, so examples and
 * checks compare sizes instead of printing them, and instruction names are shown with a note that they change
 * between versions. Freeing is observed with weakref and __del__, with the collector paused (gc.disable) where
 * timing must be exact.
 * Version 2: rewritten from a five-print module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);

/** Run `body` (which sets `result`) with the cycle collector paused, so only reference counting frees objects. */
const noGc = (body: string[]) => ["import gc as _gc", "import weakref as _wr", "_gc.disable()", "try:", ...body.map((l) => "    " + l), "finally:", "    _gc.enable()"].join("\n");

const route = { id: "R-7", stops: ["Depot", "Houston"], driver: { name: "Jamal" } };
const config = { app: "runtime-market", db: { host: "localhost", pool: { size: 5, timeout: 30 } }, features: ["search"] };

export const m36Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L36-01 references
  {
    id: "PY-L36-01",
    version: 2,
    slug: "names-and-references",
    title: "References: names, aliases and when objects are freed",
    lede: "An assignment never copies anything: it attaches a name to an object. Two names, two list slots or a parameter can all refer to the same mutable object, and CPython frees that object only when the last reference to it is gone.",
    focus: "Predict which names share one object, and when CPython frees it.",
    minutes: 22,
    objectives: [
      "Tell mutating an object (seen through every reference) from rebinding a name (affects only that name)",
      "Spot shared objects created by `*` on a list of lists and by mutable default arguments",
      "Explain reference counting: an object is freed when nothing refers to it any more",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comparison", "continue-statement", "dict-iterate", "dict-literal", "enumerate-call", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-index", "nested-loop", "none-value", "plain-class", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "self-name", "string-index", "top-level-indent", "unquoted-name"],
    teaches: ["shared-ref", "ref-count"],
    blocks: [
      {
        kind: "text",
        md: "Python's variables are not boxes that hold values. Every value is an **object** somewhere in memory, and a name is a **reference** to it. `saved = cart` doesn't copy the cart; it gives the same list a second name. `is` asks whether two references point at the very same object, and `id()` gives the object's identity.\n\nWhat matters is the difference between **mutating** the object (`append`, `x[0] = …`, and `+=` on a list, which extends it in place) and **rebinding** a name (`cart = cart + [...]` builds a new list and moves only the name `cart` to it).",
      },
      {
        kind: "example",
        title: "One cart, two names",
        code: src`
cart = ["SPO-11681", "HOM-22847"]
saved = cart
saved.append("ELE-24781")
print(cart)
print(saved is cart, id(saved) == id(cart))
cart = cart + ["GRO-10442"]
print(saved)
print(saved is cart)
`,
        output: "['SPO-11681', 'HOM-22847', 'ELE-24781']\nTrue True\n['SPO-11681', 'HOM-22847', 'ELE-24781']\nFalse\n",
        note: "`append` through `saved` changed the one list both names refer to. `cart + [...]` created a new list and rebound `cart`, so from then on the names refer to different objects and `saved` doesn't see the fourth item.",
      },
      {
        kind: "text",
        md: "The same sharing hides inside containers. `[row] * 3` makes a list holding **three references to one row**, not three rows. Function parameters work the same way: the parameter is one more reference to the caller's object, so a function that mutates its argument changes the caller's data.",
      },
      {
        kind: "example",
        title: "Three rows that are one row",
        code: src`
seats = [["."] * 4] * 3
seats[0][1] = "X"
for row in seats:
    print("".join(row))
print(seats[0] is seats[2])
`,
        output: ".X..\n.X..\n.X..\nTrue\n",
        note: "One seat was booked, but it shows in every row, because all three slots refer to the same list. A comprehension builds a separate list per row: `[[\".\"] * 4 for _ in range(3)]`. (`[\".\"] * 4` itself is fine: strings can't be changed, so sharing them is harmless.)",
      },
      {
        kind: "text",
        md: "A default argument is evaluated **once**, when `def` runs, so a mutable default is one object shared by every call that doesn't pass its own. This is the most famous reference bug in Python; the fix is `None` as the default and a new list inside the function.",
      },
      {
        kind: "example",
        title: "The default list that remembers",
        code: src`
def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags

print(add_tag("fragile"))
print(add_tag("heavy"))

def add_tag_fixed(tag, tags=None):
    if tags is None:
        tags = []
    tags.append(tag)
    return tags

print(add_tag_fixed("fragile"))
print(add_tag_fixed("heavy"))
`,
        output: "['fragile']\n['fragile', 'heavy']\n['fragile']\n['heavy']\n",
        note: "The second call to `add_tag` got back the same list the first call filled. `add_tag_fixed` makes a fresh list on every call that doesn't supply one.",
      },
      {
        kind: "text",
        md: "References also decide when memory is released. CPython keeps a **reference count** on every object: names, list slots, dictionary values and running frames each count once. When the count drops to zero the object is freed immediately. `del name` removes a name, not the object. The example uses `__del__`, a special method CPython calls just before freeing an object, to make the moment visible (other Python implementations, such as PyPy, free objects later, so never rely on `__del__` for real cleanup).",
      },
      {
        kind: "example",
        title: "Freed when the last reference goes",
        code: src`
class Upload:
    def __init__(self, name):
        self.name = name

    def __del__(self):
        print("freed", self.name)

report = Upload("report.csv")
backup = report
del report
print("after del report")
backup = None
print("after backup = None")
`,
        output: "after del report\nfreed report.csv\nafter backup = None\n",
        note: "`del report` left one reference (`backup`), so nothing was freed. Rebinding `backup` dropped the count to zero and the object was freed on that line, before the next `print`.",
      },
      {
        kind: "text",
        md: "**When it matters:** whenever a function receives a list or dictionary (mutate it only if that is the function's documented job, otherwise build a new one), when you build nested structures, and when a big object should be released (drop every reference to it). **Mistakes to avoid:** `[[...]] * n` for a grid, mutable default arguments, and assuming `del` frees an object that something else still refers to.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Discount without touching the caller's prices",
      prompt: "`discounted` writes the new prices back into the list it was given, so the shop's price list changes too. Change it to build and return a **new** list, and run it: the second line should still show the original prices.",
      spec: [
        ["Function", "`discounted(prices, rate)`"],
        ["Returns", "a new list with each price times `1 - rate`; `prices` is left as it was"],
        ["Example", "`discounted([20, 45.5], 0.1)` → about `[18.0, 40.95]`"],
      ],
      starter: src`
def discounted(prices, rate):
    for i in range(len(prices)):
        prices[i] = prices[i] * (1 - rate)
    return prices

shop_prices = [20, 45.5]
print(discounted(shop_prices, 0.1))
print(shop_prices)
`,
      answer: src`
def discounted(prices, rate):
    new_prices = []
    for price in prices:
        new_prices.append(price * (1 - rate))
    return new_prices

shop_prices = [20, 45.5]
print(discounted(shop_prices, 0.1))
print(shop_prices)
`,
      alternatives: [
        src`
def discounted(prices, rate):
    return [price * (1 - rate) for price in prices]
`,
      ],
      wrong: [
        {
          code: src`
def discounted(prices, rate):
    result = prices
    for i in range(len(result)):
        result[i] = result[i] * (1 - rate)
    return result
`,
          fails: ["keeps-input"],
          why: "`result = prices` is a second name for the same list, so the caller's prices still change",
        },
      ],
      hints: [
        "Writing `prices[i] = …` changes the caller's list, because `prices` refers to it.",
        "Start an empty list of your own and append each discounted price to it.",
        "Return your new list; never assign into `prices`.",
      ],
      task: {
        checks: [
          fn("returns", "discounted", [
            example([[20, 45.5], 0.1], [py.float(18), 40.95]),
            hiddenCase("an empty list", [[], 0.5], []),
            hiddenCase("no discount", [[9.99], 0], [9.99]),
          ], { label: "discounted() returns the discounted prices" }),
          fn("keeps-input", "discounted", [keepsInput([[20, 45.5], 0.1])], { label: "discounted() leaves the caller's list unchanged" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A seat map with separate rows",
        prompt: "A cinema booking page needs an empty seat map: `rows` rows of `seats` seats, each `\".\"`. Write `empty_seat_map(rows, seats)`. Booking one seat must change only that seat, so every row has to be its own list.",
        spec: [
          ["Function", "`empty_seat_map(rows, seats)`"],
          ["Returns", "a list of `rows` lists, each holding `seats` strings `\".\"`; no two rows are the same list object"],
          ["Example", "`empty_seat_map(2, 3)` → `[['.', '.', '.'], ['.', '.', '.']]`"],
        ],
        starter: src`
def empty_seat_map(rows, seats):
    return []

seat_map = empty_seat_map(2, 3)
seat_map[0][1] = "X"
print(seat_map)
`,
        answer: src`
def empty_seat_map(rows, seats):
    seat_map = []
    for row in range(rows):
        seat_map.append(["."] * seats)
    return seat_map

seat_map = empty_seat_map(2, 3)
seat_map[0][1] = "X"
print(seat_map)
`,
        alternatives: [
          src`
def empty_seat_map(rows, seats):
    return [["." for _ in range(seats)] for _ in range(rows)]
`,
        ],
        wrong: [
          {
            code: src`
def empty_seat_map(rows, seats):
    return [["."] * seats] * rows
`,
            fails: ["separate"],
            why: "the map looks right, but every row is the same list, so booking one seat books it in every row",
          },
          {
            code: src`
def empty_seat_map(rows, seats):
    row = ["."] * seats
    seat_map = []
    for _ in range(rows):
        seat_map.append(row)
    return seat_map
`,
            fails: ["separate"],
            why: "the loop appends the one `row` list again and again, so the rows are still shared",
          },
          {
            code: src`
def empty_seat_map(rows, seats):
    return [["."] * rows for _ in range(seats)]
`,
            fails: ["returns", "separate"],
            why: "rows and seats are swapped: the map has `seats` rows of `rows` seats",
          },
        ],
        hints: [
          "Each row needs its own list object, created separately.",
          "`[\".\"] * seats` builds one row correctly; the problem is repeating that **same** row with `*`.",
          "Create a fresh row on every pass of a loop (or comprehension) over the row count.",
        ],
        task: {
          checks: [
            fn("returns", "empty_seat_map", [
              example([2, 3], [[".", ".", "."], [".", ".", "."]]),
              example([1, 4], [[".", ".", ".", "."]]),
              example([0, 5], []),
              hiddenCase("one seat per row", [3, 1], [["."], ["."], ["."]]),
            ], { label: "empty_seat_map() builds the right shape" }),
            {
              kind: "expr",
              id: "separate",
              label: "booking one seat changes only that seat",
              show: "m = empty_seat_map(3, 4); m[1][2] = 'X'",
              expr: "_m = empty_seat_map(3, 4)\n_m[1][2] = 'X'\nresult = [_row.count('X') for _row in _m]",
              expected: py.list(py.int(0), py.int(1), py.int(0)),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Find the slots that share an object",
        prompt: "A data import builds a list of row lists, and somewhere a bug puts the **same** list object in several slots. Write `alias_groups(items)` to find them: group the positions that hold the very same object (identity, not equality). Report only groups of two or more positions.",
        spec: [
          ["Function", "`alias_groups(items)`"],
          ["Returns", "a list of position lists, one per object that appears in two or more slots; each group in increasing order, groups ordered by their first position"],
          ["Rule", "two separate lists with equal contents are **not** the same object"],
          ["Example", "with `a = [1]`, `b = [1]`: `alias_groups([a, b, a, [2], b, a])` → `[[0, 2, 5], [1, 4]]`"],
        ],
        starter: src`
def alias_groups(items):
    return []

a = [1]
b = [1]
print(alias_groups([a, b, a, [2], b, a]))
`,
        answer: src`
def alias_groups(items):
    positions = {}
    for i, item in enumerate(items):
        key = id(item)
        if key not in positions:
            positions[key] = []
        positions[key].append(i)
    groups = []
    for group in positions.values():
        if len(group) > 1:
            groups.append(group)
    return groups

a = [1]
b = [1]
print(alias_groups([a, b, a, [2], b, a]))
`,
        alternatives: [
          src`
def alias_groups(items):
    groups = []
    used = []
    for i in range(len(items)):
        if i in used:
            continue
        group = [i]
        for j in range(i + 1, len(items)):
            if items[j] is items[i]:
                group.append(j)
                used.append(j)
        if len(group) > 1:
            groups.append(group)
    return groups
`,
        ],
        wrong: [
          {
            code: src`
def alias_groups(items):
    groups = []
    used = []
    for i in range(len(items)):
        if i in used:
            continue
        group = [i]
        for j in range(i + 1, len(items)):
            if items[j] == items[i]:
                group.append(j)
                used.append(j)
        if len(group) > 1:
            groups.append(group)
    return groups
`,
            fails: ["groups", "equal-not-same", "unshared"],
            why: "`==` compares contents, so two separate lists that happen to be equal are reported as shared",
          },
          {
            code: src`
def alias_groups(items):
    positions = {}
    for i, item in enumerate(items):
        key = id(item)
        if key not in positions:
            positions[key] = []
        positions[key].append(i)
    return list(positions.values())
`,
            fails: ["groups", "unshared", "equal-not-same"],
            why: "objects that appear only once are reported as groups of one",
          },
        ],
        hints: [
          "Identity is what `is` compares; `id(obj)` is a number that stays the same for one object while it exists, so it can be a dictionary key.",
          "Collect the positions of each identity, then keep the groups with more than one position.",
          "Dictionaries keep keys in insertion order, so groups come out ordered by their first position.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "groups",
              label: "alias_groups() groups the positions of each shared object",
              show: "a = [1]; b = [1]; alias_groups([a, b, a, [2], b, a])",
              expr: "_a = [1]\n_b = [1]\nresult = alias_groups([_a, _b, _a, [2], _b, _a])",
              expected: py.list(py.list(py.int(0), py.int(2), py.int(5)), py.list(py.int(1), py.int(4))),
            },
            {
              kind: "expr",
              id: "grid",
              label: "a grid built with * is one shared row",
              show: "alias_groups([['.'] * 2] * 3)",
              expr: "result = alias_groups([['.'] * 2] * 3)",
              expected: py.list(py.list(py.int(0), py.int(1), py.int(2))),
            },
            {
              kind: "expr",
              id: "equal-not-same",
              label: "separate lists with equal contents are not grouped",
              hidden: true,
              expr: "result = alias_groups([['C00077', 2], ['C00077', 2], {'a': 1}, {'a': 1}])",
              expected: py.list(),
            },
            {
              kind: "expr",
              id: "unshared",
              label: "an object that appears once is not reported",
              hidden: true,
              expr: "_x = {'sku': 'SPO-11681'}\nresult = alias_groups([[], _x, [], _x])",
              expected: py.list(py.list(py.int(1), py.int(3))),
            },
            {
              kind: "expr",
              id: "empty",
              label: "an empty list has no groups",
              hidden: true,
              expr: "result = alias_groups([])",
              expected: py.list(),
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
a = [1, 2]
b = a
b += [3]
a = a + [4]
print(a, b)
`,
        choices: ["[1, 2, 3, 4] [1, 2, 3]", "[1, 2, 4] [1, 2, 3]", "[1, 2, 3, 4] [1, 2, 3, 4]", "[1, 2, 4] [1, 2]"],
        answer: 0,
        why: "`b += [3]` extends the one shared list in place, so `a` sees it. `a = a + [4]` builds a new list and rebinds only `a`; `b` still refers to the old one.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a grid made with `*`. What does this print?",
        program: src`
grid = [[0] * 2] * 2
grid[0][0] = 1
print(grid)
`,
        choices: ["[[1, 0], [1, 0]]", "[[1, 0], [0, 0]]", "[[1, 1], [0, 0]]", "[[1, 1], [1, 1]]"],
        answer: 0,
        why: "Both slots of the outer list refer to the same inner list, so the change shows in both rows.",
      },
      {
        id: "q3",
        prompt: "In CPython, when is a plain object (no reference cycle) freed?",
        choices: [
          "As soon as the last reference to it disappears",
          "When `del` is used on any one of its names",
          "Only when the program ends",
          "Every few seconds, when Python scans memory",
        ],
        answer: 0,
        why: "Reference counting frees it the moment the count reaches zero. `del` removes one name; if others remain, the object stays. Cycles are the exception, handled in “Garbage collection: cycles and weak references”.",
      },
    ],
    review: [
      "Assignment, list slots and parameters create references, never copies.",
      "Mutation shows through every reference; rebinding moves one name.",
      "`[[...]] * n` and mutable default arguments share one object by accident.",
      "CPython frees an object when its reference count reaches zero. Next: copying, shallow and deep.",
    ],
  },

  // ------------------------------------------------------------------ PY-L36-02 shallow and deep copy
  {
    id: "PY-L36-02",
    version: 2,
    slug: "shallow-and-deep-copy",
    title: "Shallow and deep copies",
    lede: "A copy can be one level deep (the outer container is new, everything inside is shared) or all the way down. Choosing the wrong one leaks changes into data you meant to keep.",
    focus: "Choose between a shallow and a deep copy, and know what each one shares.",
    minutes: 20,
    objectives: [
      "Name the shallow copies (`copy.copy`, `list()`, `dict()`, slices, `.copy()`) and what they share",
      "Use `copy.deepcopy` for independent nested data, and know it preserves shared parts and cycles",
      "Decide when a shallow copy is enough and when a deep copy is needed",
    ],
    requires: ["arithmetic", "assignment", "boolean", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-index", "nested-loop", "print-call", "print-several", "print-text", "reassignment", "star-args", "string-index", "string-slice", "string-split", "top-level-indent", "unquoted-name"],
    teaches: ["shallow-copy", "deep-copy"],
    blocks: [
      {
        kind: "text",
        md: "Every common way of copying a container is **shallow**: `copy.copy(x)`, `list(x)`, `x[:]`, `x.copy()`, `dict(x)`. It creates a new outer container whose slots refer to the **same** inner objects. Changing the copy's top level (adding, removing, replacing an entry) is safe; changing an object inside it changes the original's too.\n\n`copy.deepcopy(x)` copies recursively, so nothing mutable is shared with the original.",
      },
      {
        kind: "example",
        title: "Tenant settings from a template",
        code: src`
import copy

template = {"plan": "standard", "limits": {"users": 5, "storage_gb": 10}}
shallow = copy.copy(template)
deep = copy.deepcopy(template)
shallow["plan"] = "pro"
shallow["limits"]["users"] = 50
print(template)
print(deep["limits"]["users"], shallow["limits"] is template["limits"], deep["limits"] is template["limits"])
`,
        output: "{'plan': 'standard', 'limits': {'users': 50, 'storage_gb': 10}}\n5 True False\n",
        note: "Replacing `plan` in the shallow copy didn't touch the template, but changing `limits` inside it did, because both dictionaries refer to the same `limits`. The deep copy has its own `limits`.",
      },
      {
        kind: "text",
        md: "`deepcopy` is smarter than *copy everything*: it remembers what it has already copied (a memo), so an object referenced twice in the original is copied once and referenced twice in the copy, and a structure that refers to itself (a cycle) doesn't send it round forever.",
      },
      {
        kind: "example",
        title: "Shared parts stay shared, cycles survive",
        code: src`
import copy

address = {"city": "Houston", "state": "TX"}
customer = {"id": "C00077", "billing": address, "shipping": address}
clone = copy.deepcopy(customer)
clone["shipping"]["city"] = "Austin"
print(clone["billing"]["city"], customer["billing"]["city"])
print(clone["billing"] is clone["shipping"], clone["billing"] is address)

node = {"name": "loop"}
node["next"] = node
twin = copy.deepcopy(node)
print(twin["next"] is twin, twin is node)
`,
        output: "Austin Houston\nTrue False\nTrue False\n",
        note: "In the original, billing and shipping are one address, and in the clone they are still one (new) address, so changing the shipping city changed the clone's billing city too, and not the customer's. The self-referencing node was copied into a new node that refers to itself.",
      },
      {
        kind: "text",
        md: "**When to use which:** a shallow copy when you only add, remove or replace top-level entries (sorting a copy of a list of records, filtering a dictionary). A deep copy when you will change something nested and the original must stay as it was (a template, a saved snapshot, test fixtures). Immutable values (numbers, strings, tuples of immutables) are never a problem: they can't change, so sharing them is free. **Mistakes to avoid:** using `list(rows)` or `dict(settings)` and then editing inside them; and deep-copying large data out of habit, which costs time and memory for every object.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A route copy that really is separate",
      prompt: "`with_extra_stop` returns a route with one more stop, but adding the stop also changes the original route's `stops` list. Change the kind of copy so the original stays as it was, then run it.",
      spec: [
        ["Function", "`with_extra_stop(route, stop)`"],
        ["Returns", "a new route dictionary whose `stops` list has `stop` at the end; `route` (and its lists) unchanged"],
        ["Example", "a route with stops `['Depot', 'Houston']` and `'Austin'` → stops `['Depot', 'Houston', 'Austin']`"],
      ],
      starter: src`
import copy

def with_extra_stop(route, stop):
    new_route = copy.copy(route)
    new_route["stops"].append(stop)
    return new_route

route = {"id": "R-7", "stops": ["Depot", "Houston"], "driver": {"name": "Jamal"}}
print(with_extra_stop(route, "Austin")["stops"])
print(route["stops"])
`,
      answer: src`
import copy

def with_extra_stop(route, stop):
    new_route = copy.deepcopy(route)
    new_route["stops"].append(stop)
    return new_route

route = {"id": "R-7", "stops": ["Depot", "Houston"], "driver": {"name": "Jamal"}}
print(with_extra_stop(route, "Austin")["stops"])
print(route["stops"])
`,
      alternatives: [
        src`
def with_extra_stop(route, stop):
    new_route = dict(route)
    new_route["stops"] = route["stops"] + [stop]
    return new_route
`,
      ],
      wrong: [
        {
          code: src`
def with_extra_stop(route, stop):
    new_route = dict(route)
    new_route["stops"].append(stop)
    return new_route
`,
          fails: ["keeps-input"],
          why: "`dict(route)` is another shallow copy, so `stops` is still the original's list",
        },
      ],
      hints: [
        "A shallow copy gives you a new dictionary, but its `stops` value is the original's list.",
        "The list you append to must be a new list too.",
        "The `copy` module has a function that copies every level.",
      ],
      task: {
        checks: [
          fn("returns", "with_extra_stop", [
            example([route, "Austin"], { id: "R-7", stops: ["Depot", "Houston", "Austin"], driver: { name: "Jamal" } }),
            hiddenCase("a route with no stops yet", [{ id: "R-1", stops: [], driver: { name: "Grace" } }, "Depot"], { id: "R-1", stops: ["Depot"], driver: { name: "Grace" } }),
          ], { label: "with_extra_stop() adds the stop to the new route" }),
          fn("keeps-input", "with_extra_stop", [keepsInput([route, "Austin"])], { label: "with_extra_stop() leaves the original route unchanged" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Apply dotted overrides to a config",
        prompt: "A deployment tool takes a base configuration and overrides written as dotted paths, such as `{\"db.pool.size\": 20}`. Write `apply_overrides(config, overrides)` that returns a new configuration with every override applied. The base configuration is shared by every environment, so it must not change, not even its nested dictionaries.",
        spec: [
          ["Function", "`apply_overrides(config, overrides)`"],
          ["overrides", "a dictionary from dotted path (`\"db.pool.size\"`) to the new value; a path may name keys that don't exist yet, which are created as dictionaries along the way"],
          ["Returns", "a new nested dictionary; `config` and everything inside it unchanged"],
          ["Example", "`{\"db\": {\"pool\": {\"size\": 5}}}` with `{\"db.pool.size\": 20}` → `{\"db\": {\"pool\": {\"size\": 20}}}`"],
        ],
        starter: src`
def apply_overrides(config, overrides):
    return config

config = {"app": "runtime-market", "db": {"host": "localhost", "pool": {"size": 5, "timeout": 30}}}
print(apply_overrides(config, {"db.pool.size": 20, "db.host": "db.internal"}))
print(config["db"]["pool"]["size"])
`,
        answer: src`
import copy

def apply_overrides(config, overrides):
    result = copy.deepcopy(config)
    for path, value in overrides.items():
        keys = path.split(".")
        section = result
        for key in keys[:-1]:
            if key not in section:
                section[key] = {}
            section = section[key]
        section[keys[-1]] = value
    return result

config = {"app": "runtime-market", "db": {"host": "localhost", "pool": {"size": 5, "timeout": 30}}}
print(apply_overrides(config, {"db.pool.size": 20, "db.host": "db.internal"}))
print(config["db"]["pool"]["size"])
`,
        alternatives: [
          src`
from copy import deepcopy

def apply_overrides(config, overrides):
    new_config = deepcopy(config)
    for dotted, value in overrides.items():
        *parents, last = dotted.split(".")
        target = new_config
        for name in parents:
            target = target.setdefault(name, {})
        target[last] = value
    return new_config
`,
        ],
        wrong: [
          {
            code: src`
import copy

def apply_overrides(config, overrides):
    result = copy.copy(config)
    for path, value in overrides.items():
        keys = path.split(".")
        section = result
        for key in keys[:-1]:
            if key not in section:
                section[key] = {}
            section = section[key]
        section[keys[-1]] = value
    return result
`,
            fails: ["keeps-input"],
            why: "a shallow copy shares the nested `db` dictionary, so the base configuration is changed for every environment",
          },
          {
            code: src`
import copy

def apply_overrides(config, overrides):
    result = copy.deepcopy(config)
    for path, value in overrides.items():
        keys = path.split(".")
        if len(keys) == 1:
            result[keys[0]] = value
        else:
            result[keys[0]] = {keys[1]: value}
    return result
`,
            fails: ["returns"],
            why: "it replaces the whole first-level section, losing its other settings, and ignores deeper paths",
          },
        ],
        hints: [
          "Copy every level first, so all later changes land in the copy.",
          "Split the path on dots; walk down every key except the last, creating an empty dictionary where a key is missing.",
          "Store the value under the last key of the dictionary you walked down to.",
        ],
        task: {
          checks: [
            fn("returns", "apply_overrides", [
              example([config, { "db.pool.size": 20, "db.host": "db.internal" }], { app: "runtime-market", db: { host: "db.internal", pool: { size: 20, timeout: 30 } }, features: ["search"] }),
              example([config, {}], config),
              example([{ a: 1 }, { a: 2 }], { a: 2 }),
              hiddenCase("a path with sections that don't exist yet", [{ app: "x" }, { "cache.redis.port": 6379 }], { app: "x", cache: { redis: { port: 6379 } } }),
              hiddenCase("several overrides in one section", [{ db: { pool: { size: 5, timeout: 30 } } }, { "db.pool.size": 8, "db.pool.timeout": 10 }], { db: { pool: { size: 8, timeout: 10 } } }),
              hiddenCase("replacing a list value", [{ features: ["search"] }, { features: ["search", "reviews"] }], { features: ["search", "reviews"] }),
            ], { label: "apply_overrides() applies every dotted override" }),
            fn("keeps-input", "apply_overrides", [
              keepsInput([config, { "db.pool.size": 20 }]),
              keepsInput([config, { "db.cache.ttl": 60 }], { label: "a new nested key" }),
            ], { label: "apply_overrides() leaves the base configuration unchanged at every level" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Snapshots of a warehouse after every change",
        prompt: "An audit trail keeps the warehouse's state after each stock movement. Write `snapshots(state, movements)`: apply the movements to a copy of `state` one at a time and return a list with the state **as it was after each movement**. Later movements must not change earlier snapshots, and the starting state must not change.",
        spec: [
          ["Function", "`snapshots(state, movements)`"],
          ["state", "`{\"warehouse\": name, \"stock\": {sku: quantity}}`"],
          ["movements", "a list of `[sku, change]` pairs; a SKU not yet in stock starts at 0"],
          ["Returns", "a list with one independent state dictionary per movement"],
          ["Example", "stock `{\"SPO-11681\": 4}` with `[[\"SPO-11681\", -1], [\"HOM-22847\", 6]]` → two states: `{\"SPO-11681\": 3}`, then `{\"SPO-11681\": 3, \"HOM-22847\": 6}`"],
        ],
        starter: src`
def snapshots(state, movements):
    history = []
    return history

state = {"warehouse": "Houston", "stock": {"SPO-11681": 4}}
for snap in snapshots(state, [["SPO-11681", -1], ["HOM-22847", 6]]):
    print(snap)
`,
        answer: src`
import copy

def snapshots(state, movements):
    current = copy.deepcopy(state)
    history = []
    for sku, change in movements:
        stock = current["stock"]
        if sku not in stock:
            stock[sku] = 0
        stock[sku] += change
        history.append(copy.deepcopy(current))
    return history

state = {"warehouse": "Houston", "stock": {"SPO-11681": 4}}
for snap in snapshots(state, [["SPO-11681", -1], ["HOM-22847", 6]]):
    print(snap)
`,
        alternatives: [
          src`
def snapshots(state, movements):
    stock = dict(state["stock"])
    history = []
    for sku, change in movements:
        stock[sku] = stock.get(sku, 0) + change
        history.append({"warehouse": state["warehouse"], "stock": dict(stock)})
    return history
`,
        ],
        wrong: [
          {
            code: src`
import copy

def snapshots(state, movements):
    current = copy.deepcopy(state)
    history = []
    for sku, change in movements:
        if sku not in current["stock"]:
            current["stock"][sku] = 0
        current["stock"][sku] += change
        history.append(current)
    return history
`,
            fails: ["returns"],
            why: "every snapshot is the same dictionary, so they all show the final state",
          },
          {
            code: src`
import copy

def snapshots(state, movements):
    current = copy.deepcopy(state)
    history = []
    for sku, change in movements:
        if sku not in current["stock"]:
            current["stock"][sku] = 0
        current["stock"][sku] += change
        history.append(copy.copy(current))
    return history
`,
            fails: ["returns"],
            why: "each shallow snapshot is a new outer dictionary, but they all share one `stock` dictionary",
          },
          {
            code: src`
import copy

def snapshots(state, movements):
    history = []
    for sku, change in movements:
        if sku not in state["stock"]:
            state["stock"][sku] = 0
        state["stock"][sku] += change
        history.append(copy.deepcopy(state))
    return history
`,
            fails: ["keeps-input"],
            why: "the snapshots are right, but the movements are applied to the caller's own state",
          },
        ],
        hints: [
          "Work on a deep copy of the starting state, so the caller's state never changes.",
          "A snapshot must stay frozen after you take it: appending the working dictionary itself would let later movements change it.",
          "After each movement, append a fresh deep copy of the working state.",
        ],
        task: {
          checks: [
            fn("returns", "snapshots", [
              example([{ warehouse: "Houston", stock: { "SPO-11681": 4 } }, [["SPO-11681", -1], ["HOM-22847", 6]]], [
                { warehouse: "Houston", stock: { "SPO-11681": 3 } },
                { warehouse: "Houston", stock: { "SPO-11681": 3, "HOM-22847": 6 } },
              ]),
              example([{ warehouse: "Denver", stock: {} }, []], []),
              example([{ warehouse: "Denver", stock: { "BOO-58412": 1 } }, [["BOO-58412", 2]]], [{ warehouse: "Denver", stock: { "BOO-58412": 3 } }]),
              hiddenCase("the same SKU moved three times", [{ warehouse: "W", stock: { A: 10 } }, [["A", -2], ["A", -2], ["A", 5]]], [
                { warehouse: "W", stock: { A: 8 } },
                { warehouse: "W", stock: { A: 6 } },
                { warehouse: "W", stock: { A: 11 } },
              ]),
              hiddenCase("a SKU that starts missing", [{ warehouse: "W", stock: {} }, [["NEW", 1], ["NEW", 1]]], [
                { warehouse: "W", stock: { NEW: 1 } },
                { warehouse: "W", stock: { NEW: 2 } },
              ]),
            ], { label: "snapshots() keeps the state after each movement" }),
            fn("keeps-input", "snapshots", [keepsInput([{ warehouse: "Houston", stock: { "SPO-11681": 4 } }, [["SPO-11681", -1]]])], { label: "snapshots() leaves the starting state unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
rows = [["C00077", 2], ["C01338", 1]]
copy_rows = list(rows)
copy_rows.append(["C00038", 5])
copy_rows[0][1] = 9
print(len(rows), rows[0][1])
`,
        choices: ["2 9", "3 9", "2 2", "3 2"],
        answer: 0,
        why: "`list(rows)` is a shallow copy: appending to it doesn't affect `rows` (still 2 rows), but `copy_rows[0]` is the same inner list as `rows[0]`, so the 9 shows in both.",
      },
      {
        id: "q2",
        prompt: "A common mistake: copying settings with `dict()` and then changing a nested value. What does this print?",
        program: src`
defaults = {"theme": "light", "alerts": {"email": True}}
mine = dict(defaults)
mine["alerts"]["email"] = False
print(defaults["alerts"]["email"])
`,
        choices: ["False", "True", "None", "KeyError"],
        answer: 0,
        why: "`dict(defaults)` copies one level, so `mine[\"alerts\"]` is the defaults' own dictionary and the change leaks into the defaults. `copy.deepcopy(defaults)` would keep them separate.",
      },
      {
        id: "q3",
        prompt: "When is a shallow copy of a list of order dictionaries enough?",
        choices: [
          "When you only sort or filter the copy and never change a dictionary inside it",
          "When you change each order's status in the copy",
          "When the orders contain nested lists of items you will edit",
          "Never: lists of dictionaries always need a deep copy",
        ],
        answer: 0,
        why: "Sorting and filtering rearrange the copy's own slots. Changing anything inside an order changes the shared dictionary, which needs a deep copy (or a new dictionary per changed order).",
      },
    ],
    review: [
      "`copy.copy`, `list()`, `dict()`, slices and `.copy()` are shallow: a new outer container, shared insides.",
      "`copy.deepcopy` copies every level, keeps doubly referenced parts shared once, and handles cycles.",
      "Shallow is enough for top-level changes; deep is needed before changing something nested.",
      "Next: objects that refer to each other in a cycle, which reference counting alone never frees.",
    ],
  },

  // ------------------------------------------------------------------ PY-L36-03 garbage collection
  {
    id: "PY-L36-03",
    version: 2,
    slug: "cycles-and-gc",
    title: "Garbage collection: cycles and weak references",
    lede: "Two objects that refer to each other keep each other's reference count above zero forever. CPython's cycle collector finds such islands; weak references avoid creating them.",
    focus: "Recognise reference cycles, let the cycle collector free them, and use weak references so objects aren't kept alive.",
    minutes: 22,
    objectives: [
      "Explain why a reference cycle is not freed by reference counting",
      "Run the cycle collector with `gc.collect()` and observe objects with `weakref.ref`",
      "Use weak references for back-links, listeners and caches",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comp-if", "comparison", "dict-get", "dict-literal", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "part-attr", "plain-class", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-index", "top-level-indent", "try-except"],
    teaches: ["gc-collect", "weak-ref"],
    blocks: [
      {
        kind: "text",
        md: "Reference counting frees an object when nothing refers to it. But if an order refers to its invoice and the invoice refers back to the order, each keeps the other's count at 1 even after the program has dropped both. That island of unreachable objects is a **reference cycle**. CPython has a second mechanism for it, the **cycle collector** in the `gc` module: every so often it looks for groups of objects that are only reachable from each other and frees them. `gc.collect()` runs it now and returns how many unreachable objects it found.\n\nTo watch an object without keeping it alive, use a **weak reference**: `weakref.ref(obj)` returns a callable that gives back the object while it exists and `None` once it has been freed. The example pauses the automatic collector (`gc.disable()`) so you can see exactly when the cycle is freed.",
      },
      {
        kind: "example",
        title: "A cycle survives until the collector runs",
        code: src`
import gc
import weakref

class Node:
    def __init__(self, name):
        self.name = name
        self.partner = None

gc.disable()
order = Node("order O100282")
invoice = Node("invoice INV-881")
order.partner = invoice
invoice.partner = order
watch = weakref.ref(order)
del order, invoice
print(watch() is None)
print(gc.collect() >= 2, watch() is None)
gc.enable()
`,
        output: "False\nTrue True\n",
        note: "After `del`, nothing in the program can reach the two nodes, but they still refer to each other, so they are alive (`watch()` still returns the order). `gc.collect()` found the island and freed it. With the collector enabled (the normal state) this happens automatically, just not at a predictable moment.",
      },
      {
        kind: "text",
        md: "Waiting for the collector means memory is held longer and cleanup happens at an unpredictable time. Better is not to make the cycle: when a child needs to reach its parent, store a **weak** reference to the parent. The parent keeps its children alive; the children don't keep the parent alive.",
      },
      {
        kind: "example",
        title: "Children that don't keep their parent alive",
        code: src`
import weakref

class Category:
    def __init__(self, name, parent=None):
        self.name = name
        self.children = []
        self.parent_ref = None
        if parent is not None:
            self.parent_ref = weakref.ref(parent)
            parent.children.append(self)

    def path(self):
        parent = None
        if self.parent_ref is not None:
            parent = self.parent_ref()
        if parent is None:
            return self.name
        return parent.path() + " > " + self.name

home = Category("Home")
kitchen = Category("Kitchen", home)
print(kitchen.path())
watch = weakref.ref(home)
del home
print(watch() is None, kitchen.path())
`,
        output: "Home > Kitchen\nTrue Kitchen\n",
        note: "`home` was freed by reference counting the moment its name was deleted, with no collector involved, because the only link from `kitchen` back to it is weak. The weak reference then returns `None`, and `path()` treats Kitchen as a top-level category.",
      },
      {
        kind: "text",
        md: "The `weakref` module also offers `WeakValueDictionary` (a dictionary whose values disappear when nothing else uses them, ideal for caches) and `weakref.finalize(obj, callback)` (run a cleanup when an object is freed). Not every object can be weakly referenced: instances of your own classes can, but plain `int`, `str`, `list` and `dict` objects can't (`TypeError: cannot create weak reference`).\n\n**When to use it:** back-links (child → parent, item → owner), listener lists, and caches that shouldn't keep objects alive. **Mistakes to avoid:** relying on `__del__` or the collector for important cleanup (close files with `with` instead); calling `gc.collect()` routinely to *fix* memory (find and break the cycle instead); and forgetting that a weak reference can return `None` at any time.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A folder that lets go of its parent",
      prompt: "Each `Folder` stores its parent in `self.parent`, and the parent stores the child in `children`: a cycle, so deleting the root frees nothing until the collector runs. Store a weak reference instead (`weakref.ref(parent)`) and make `parent_name()` call it. Run it: the root should be freed straight away.",
      spec: [
        ["Class", "`Folder(name, parent=None)` with `name`, `children` and `parent_name()`"],
        ["parent_name()", "the parent's name while the parent exists, otherwise `None`"],
        ["Rule", "a child must not keep its parent alive"],
      ],
      starter: src`
import gc
import weakref

class Folder:
    def __init__(self, name, parent=None):
        self.name = name
        self.children = []
        self.parent = parent
        if parent is not None:
            parent.children.append(self)

    def parent_name(self):
        if self.parent is None:
            return None
        return self.parent.name

gc.disable()
root = Folder("root")
docs = Folder("docs", root)
print(docs.parent_name())
watch = weakref.ref(root)
del root
print(watch() is None, docs.parent_name())
gc.enable()
`,
      answer: src`
import gc
import weakref

class Folder:
    def __init__(self, name, parent=None):
        self.name = name
        self.children = []
        self.parent = None
        if parent is not None:
            self.parent = weakref.ref(parent)
            parent.children.append(self)

    def parent_name(self):
        if self.parent is None:
            return None
        parent = self.parent()
        if parent is None:
            return None
        return parent.name

gc.disable()
root = Folder("root")
docs = Folder("docs", root)
print(docs.parent_name())
watch = weakref.ref(root)
del root
print(watch() is None, docs.parent_name())
gc.enable()
`,
      wrong: [
        {
          code: src`
import weakref

class Folder:
    def __init__(self, name, parent=None):
        self.name = name
        self.children = []
        self.parent = None
        if parent is not None:
            self.parent = weakref.ref(parent)
            parent.children.append(self)

    def parent_name(self):
        if self.parent is None:
            return None
        return self.parent().name
`,
          fails: ["freed"],
          why: "once the parent is gone, `self.parent()` returns None and `.name` raises AttributeError",
        },
      ],
      hints: [
        "`weakref.ref(parent)` gives you something to *call* later, not the parent itself.",
        "Calling it returns the parent while it is alive, and `None` after it has been freed.",
        "In `parent_name()`, call the weak reference first and check its result for `None` before reading `.name`.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "parent",
            label: "parent_name() returns the parent's name while the parent exists",
            show: "Folder('docs', Folder('root')).parent_name()",
            expr: "_root = Folder('root')\n_docs = Folder('docs', _root)\nresult = [_docs.parent_name(), Folder('top').parent_name(), _root.children[0].name]",
            expected: py.list(py.str("root"), py.none, py.str("docs")),
          },
          {
            kind: "expr",
            id: "freed",
            label: "deleting the root frees it at once, and the child then has no parent",
            hidden: true,
            expr: noGc(["_root = Folder('root')", "_docs = Folder('docs', _root)", "_w = _wr.ref(_root)", "del _root", "result = [_w() is None, _docs.parent_name()]"]),
            expected: py.list(yes, py.none),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "An event bus that doesn't keep listeners alive",
        prompt: "A dashboard creates and closes widgets all day, and each widget subscribes to price updates. If the bus kept strong references, closed widgets would never be freed. Write a class `EventBus` that keeps only weak references to its listeners.",
        spec: [
          ["Class", "`EventBus()`"],
          ["subscribe(listener)", "remember the listener **weakly**; `listener` is an object with a `notify(event)` method"],
          ["publish(event)", "call `notify(event)` on every listener that still exists, in subscription order; forget the ones that are gone; return how many were notified"],
          ["Example", "two widgets subscribe, one is deleted, `publish(...)` → `1`"],
        ],
        starter: src`
class EventBus:
    def __init__(self):
        self.listeners = []

    def subscribe(self, listener):
        pass

    def publish(self, event):
        return 0

class Widget:
    def __init__(self, name):
        self.name = name
        self.seen = []

    def notify(self, event):
        self.seen.append(event)

bus = EventBus()
chart = Widget("chart")
ticker = Widget("ticker")
bus.subscribe(chart)
bus.subscribe(ticker)
del ticker
print(bus.publish({"sku": "SPO-11681", "price": 7.49}), chart.seen)
`,
        answer: src`
import weakref

class EventBus:
    def __init__(self):
        self.listeners = []

    def subscribe(self, listener):
        self.listeners.append(weakref.ref(listener))

    def publish(self, event):
        alive = []
        for ref in self.listeners:
            listener = ref()
            if listener is not None:
                listener.notify(event)
                alive.append(ref)
        self.listeners = alive
        return len(alive)

class Widget:
    def __init__(self, name):
        self.name = name
        self.seen = []

    def notify(self, event):
        self.seen.append(event)

bus = EventBus()
chart = Widget("chart")
ticker = Widget("ticker")
bus.subscribe(chart)
bus.subscribe(ticker)
del ticker
print(bus.publish({"sku": "SPO-11681", "price": 7.49}), chart.seen)
`,
        alternatives: [
          src`
from weakref import ref

class EventBus:
    def __init__(self):
        self._subscribers = []

    def subscribe(self, listener):
        self._subscribers.append(ref(listener))

    def publish(self, event):
        live = [r() for r in self._subscribers]
        live = [obj for obj in live if obj is not None]
        self._subscribers = [ref(obj) for obj in live]
        for obj in live:
            obj.notify(event)
        return len(live)
`,
        ],
        wrong: [
          {
            code: src`
class EventBus:
    def __init__(self):
        self.listeners = []

    def subscribe(self, listener):
        self.listeners.append(listener)

    def publish(self, event):
        for listener in self.listeners:
            listener.notify(event)
        return len(self.listeners)
`,
            fails: ["count", "weak", "order"],
            why: "strong references keep deleted widgets alive, so they are still notified and counted",
          },
          {
            code: src`
import weakref

class EventBus:
    def __init__(self):
        self.listeners = []

    def subscribe(self, listener):
        self.listeners.append(weakref.ref(listener))

    def publish(self, event):
        for ref in self.listeners:
            ref().notify(event)
        return len(self.listeners)
`,
            fails: ["count", "order"],
            why: "a dead weak reference returns None, so publishing after a widget is gone raises AttributeError",
          },
        ],
        hints: [
          "Store `weakref.ref(listener)` instead of the listener itself.",
          "When publishing, call each stored reference; `None` means that listener has been freed.",
          "Notify the live ones, keep only their references for next time, and return how many there were.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "count",
              label: "publish() notifies only the listeners that still exist",
              show: "two listeners subscribe, one is deleted, then bus.publish('tick')",
              expr: noGc([
                "class _L:",
                "    def __init__(self):",
                "        self.got = []",
                "    def notify(self, e):",
                "        self.got.append(e)",
                "_bus = EventBus()",
                "_a = _L()",
                "_b = _L()",
                "_bus.subscribe(_a)",
                "_bus.subscribe(_b)",
                "del _b",
                "result = [_bus.publish('tick'), _a.got]",
              ]),
              expected: py.list(py.int(1), py.list(py.str("tick"))),
            },
            {
              kind: "expr",
              id: "weak",
              label: "subscribing doesn't keep a listener alive",
              hidden: true,
              expr: noGc([
                "class _L:",
                "    def notify(self, e):",
                "        pass",
                "_bus = EventBus()",
                "_x = _L()",
                "_bus.subscribe(_x)",
                "_w = _wr.ref(_x)",
                "del _x",
                "result = _w() is None",
              ]),
              expected: yes,
            },
            {
              kind: "expr",
              id: "order",
              label: "live listeners are notified in subscription order, every time",
              hidden: true,
              expr: noGc([
                "_log = []",
                "class _L:",
                "    def __init__(self, n):",
                "        self.n = n",
                "    def notify(self, e):",
                "        _log.append((self.n, e))",
                "_bus = EventBus()",
                "_ls = [_L(i) for i in range(4)]",
                "for _l in _ls:",
                "    _bus.subscribe(_l)",
                "del _ls[1]",
                "_first = _bus.publish('a')",
                "del _ls[0]",
                "_second = _bus.publish('b')",
                "result = [_first, _second, _log]",
              ]),
              expected: py.list(py.int(3), py.int(2), py.list(
                py.tuple(py.int(0), py.str("a")), py.tuple(py.int(2), py.str("a")), py.tuple(py.int(3), py.str("a")),
                py.tuple(py.int(2), py.str("b")), py.tuple(py.int(3), py.str("b")),
              )),
            },
            {
              kind: "expr",
              id: "none",
              label: "a bus with no listeners notifies nobody",
              hidden: true,
              expr: "result = EventBus().publish('tick')",
              expected: py.int(0),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "A thumbnail cache that lets go",
        prompt: "An image viewer caches thumbnails so a picture shown in two places is decoded once. But a plain dictionary would keep every thumbnail ever shown in memory. Write `ThumbnailCache(loader)`: `get(key)` returns the cached thumbnail while anything else is still using it, and calls `loader(key)` again once it has been freed. Use a `weakref.WeakValueDictionary`.",
        spec: [
          ["Class", "`ThumbnailCache(loader)`, where `loader(key)` decodes and returns a thumbnail object"],
          ["get(key)", "the same object as last time if it still exists; otherwise call `loader(key)`, remember the result weakly, and return it"],
          ["loads", "an attribute counting how many times `loader` was called"],
          ["Example", "two `get(\"P0001.jpg\")` calls while the first result is still in use → one load"],
        ],
        starter: src`
class ThumbnailCache:
    def __init__(self, loader):
        self.loader = loader
        self.loads = 0

    def get(self, key):
        self.loads += 1
        return self.loader(key)

class Thumbnail:
    def __init__(self, key):
        self.key = key

cache = ThumbnailCache(Thumbnail)
first = cache.get("P0001.jpg")
second = cache.get("P0001.jpg")
print(first is second, cache.loads)
`,
        answer: src`
import weakref

class ThumbnailCache:
    def __init__(self, loader):
        self.loader = loader
        self.loads = 0
        self.cache = weakref.WeakValueDictionary()

    def get(self, key):
        thumbnail = self.cache.get(key)
        if thumbnail is None:
            thumbnail = self.loader(key)
            self.loads += 1
            self.cache[key] = thumbnail
        return thumbnail

class Thumbnail:
    def __init__(self, key):
        self.key = key

cache = ThumbnailCache(Thumbnail)
first = cache.get("P0001.jpg")
second = cache.get("P0001.jpg")
print(first is second, cache.loads)
`,
        alternatives: [
          src`
from weakref import WeakValueDictionary

class ThumbnailCache:
    def __init__(self, loader):
        self.loader = loader
        self.loads = 0
        self._images = WeakValueDictionary()

    def get(self, key):
        try:
            return self._images[key]
        except KeyError:
            image = self.loader(key)
            self.loads += 1
            self._images[key] = image
            return image
`,
        ],
        wrong: [
          {
            code: src`
class ThumbnailCache:
    def __init__(self, loader):
        self.loader = loader
        self.loads = 0
        self.cache = {}

    def get(self, key):
        if key not in self.cache:
            self.cache[key] = self.loader(key)
            self.loads += 1
        return self.cache[key]
`,
            fails: ["released"],
            why: "a plain dictionary keeps every thumbnail alive, so nothing is ever freed",
          },
          {
            code: src`
import weakref

class ThumbnailCache:
    def __init__(self, loader):
        self.loader = loader
        self.loads = 0
        self.cache = weakref.WeakValueDictionary()

    def get(self, key):
        thumbnail = self.loader(key)
        self.loads += 1
        self.cache[key] = thumbnail
        return thumbnail
`,
            fails: ["shared"],
            why: "it remembers thumbnails but never looks them up, so every get() decodes again",
          },
        ],
        hints: [
          "A `WeakValueDictionary` works like a dictionary, except an entry vanishes when its value is freed.",
          "Look the key up first (`get` returns None for a missing or vanished entry).",
          "Only on a miss: call the loader, count it, store the result, and return it.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "shared",
              label: "two gets while the thumbnail is in use load it once",
              show: "a = cache.get('P0001.jpg'); b = cache.get('P0001.jpg')",
              expr: "class _T:\n    def __init__(self, k):\n        self.k = k\n_c = ThumbnailCache(_T)\n_a = _c.get('P0001.jpg')\n_b = _c.get('P0001.jpg')\nresult = [_a is _b, _c.loads, _a.k]",
              expected: py.list(yes, py.int(1), py.str("P0001.jpg")),
            },
            {
              kind: "expr",
              id: "keys",
              label: "different keys load different thumbnails",
              show: "cache.get('P0001.jpg'); cache.get('P0004.jpg')",
              expr: "class _T:\n    def __init__(self, k):\n        self.k = k\n_c = ThumbnailCache(_T)\n_a = _c.get('P0001.jpg')\n_b = _c.get('P0004.jpg')\nresult = [_a is _b, _c.loads, _b.k]",
              expected: py.list(py.bool(false), py.int(2), py.str("P0004.jpg")),
            },
            {
              kind: "expr",
              id: "released",
              label: "a thumbnail nobody uses is freed, and loaded again when asked for",
              hidden: true,
              expr: noGc([
                "class _T:",
                "    def __init__(self, k):",
                "        self.k = k",
                "_c = ThumbnailCache(_T)",
                "_a = _c.get('P0001.jpg')",
                "_w = _wr.ref(_a)",
                "del _a",
                "_freed = _w() is None",
                "_again = _c.get('P0001.jpg')",
                "result = [_freed, _c.loads]",
              ]),
              expected: py.list(yes, py.int(2)),
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
class Job:
    def __init__(self, name):
        self.name = name

    def __del__(self):
        print("freed", self.name)

nightly = Job("nightly-export")
queue = [nightly]
del nightly
print("deleted the name")
queue.clear()
print("cleared the queue")
`,
        choices: [
          "deleted the name\nfreed nightly-export\ncleared the queue",
          "freed nightly-export\ndeleted the name\ncleared the queue",
          "deleted the name\ncleared the queue\nfreed nightly-export",
          "deleted the name\ncleared the queue",
        ],
        answer: 0,
        why: "The list still referred to the job after `del`, so it stayed alive. Clearing the list removed the last reference, and reference counting freed it immediately, before the last print.",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting `del` to free two objects that refer to each other. What does this print?",
        program: src`
import gc
import weakref

class Part:
    pass

gc.disable()
left = Part()
right = Part()
left.other = right
right.other = left
watch = weakref.ref(left)
del left, right
print(watch() is None)
gc.enable()
`,
        choices: ["False", "True", "None", "AttributeError"],
        answer: 0,
        why: "Each part still holds a reference to the other, so neither count reaches zero. Only the cycle collector (`gc.collect()`, or its automatic runs) frees them.",
      },
      {
        id: "q3",
        prompt: "Which design avoids a reference cycle?",
        choices: [
          "Each line item stores a weak reference to its order; the order stores its items normally",
          "Each line item stores its order, and the order stores its items",
          "Calling gc.collect() after every request",
          "Writing a __del__ method on the order class",
        ],
        answer: 0,
        why: "A weak back-link doesn't count as a reference, so there is no cycle. Calling the collector cleans up cycles after the fact, and `__del__` doesn't prevent them.",
      },
    ],
    review: [
      "Objects that refer to each other form a cycle: reference counting can't free it, the cycle collector (`gc`) can.",
      "`gc.collect()` runs the collector now; normally it runs on its own, at moments you don't control.",
      "`weakref.ref`, `WeakValueDictionary` and `finalize` observe objects without keeping them alive.",
      "Next: measuring how much memory your objects take, and where it was allocated.",
    ],
  },

  // ------------------------------------------------------------------ PY-L36-04 memory profiling
  {
    id: "PY-L36-04",
    version: 2,
    slug: "measure-memory",
    title: "Measuring memory: getsizeof, tracemalloc snapshots and __slots__",
    lede: "Memory problems are found by measuring, not guessing. sys.getsizeof tells you about one object, tracemalloc tells you which lines allocated memory, and __slots__ shrinks objects you create by the million.",
    focus: "Measure memory with getsizeof and tracemalloc snapshots, and reduce it with __slots__.",
    minutes: 24,
    objectives: [
      "Explain why `sys.getsizeof` of a container excludes the objects it holds",
      "Compare two tracemalloc snapshots to find the lines that allocated the most",
      "Use `__slots__` for many small objects, and know what it gives up",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "break-statement", "class-def", "comp-if", "comparison", "continue-statement", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-dict", "nested-loop", "none-value", "plain-class", "print-call", "print-several", "print-text", "range-call", "reassignment", "self-name", "sort-key", "string-format", "string-index", "string-slice", "top-level-indent", "truthiness", "tuple-literal", "tuple-unpack", "while-loop"],
    teaches: ["sizeof-call", "mem-snapshot", "slots-attr"],
    blocks: [
      {
        kind: "text",
        md: "`sys.getsizeof(obj)` returns the bytes one object occupies. For a container it is **shallow**: a list's size is its header plus one slot (a reference) per item. The items themselves live elsewhere and are not counted, so a list of long strings and a list of short strings with the same length report the same size. Exact numbers depend on the Python version and the machine (references are 4 bytes on a 32-bit build like this browser's, 8 on most desktops), so compare sizes rather than memorising them.",
      },
      {
        kind: "example",
        title: "A list's size doesn't include its items",
        code: src`
import sys

short_names = ["Ana", "Ben", "Chen"] * 1000
long_names = ["Alexandria Konstantinopoulou-Whitfield"] * 3000
print(len(short_names) == len(long_names))
print(sys.getsizeof(short_names) == sys.getsizeof(long_names))
print(sys.getsizeof("Ana") < sys.getsizeof("Alexandria Konstantinopoulou-Whitfield"))
`,
        output: "True\nTrue\nTrue\n",
        note: "Both lists hold 3,000 references, so they are the same size. The strings themselves differ in size, but they are separate objects (and here each list repeats references to a few strings, so there are only four string objects in total).",
      },
      {
        kind: "text",
        md: "To find **where** memory goes, `tracemalloc` records every allocation together with the line that made it. Take a snapshot before and after some work; `after.compare_to(before, \"lineno\")` lists the lines whose memory grew, biggest first. Each entry has a `size_diff` (bytes) and a `traceback` whose first frame has the `lineno`.",
      },
      {
        kind: "example",
        title: "Which line allocated the memory?",
        code: src`
import tracemalloc

tracemalloc.start()
before = tracemalloc.take_snapshot()
trips = [{"trip_id": i, "fare": 12.5} for i in range(20000)]
labels = [f"trip-{i}" for i in range(20000)]
after = tracemalloc.take_snapshot()
tracemalloc.stop()
for stat in after.compare_to(before, "lineno")[:2]:
    frame = stat.traceback[0]
    print("line", frame.lineno, "grew by more than 500 KiB:", stat.size_diff > 500 * 1024)
`,
        output: "line 5 grew by more than 500 KiB: True\nline 6 grew by more than 500 KiB: True\n",
        note: "The dictionaries on line 5 are the biggest growth, then the strings on line 6. In a real program the same two snapshots point straight at the line to fix, among thousands.",
      },
      {
        kind: "text",
        md: "A common fix for *millions of small objects* is `__slots__`. Normally every instance carries its own attribute dictionary (`__dict__`). Listing the attribute names in `__slots__` gives each instance fixed slots instead, which saves memory per object, at a price: the class can't get new attributes at run time.",
      },
      {
        kind: "example",
        title: "Ten thousand taxi trips, with and without slots",
        code: src`
import tracemalloc

class Trip:
    def __init__(self, trip_id, fare):
        self.trip_id = trip_id
        self.fare = fare

class SlimTrip:
    __slots__ = ("trip_id", "fare")

    def __init__(self, trip_id, fare):
        self.trip_id = trip_id
        self.fare = fare

def traced_bytes(make):
    tracemalloc.start()
    kept = make()
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return current

plain = traced_bytes(lambda: [Trip(i, 12.5) for i in range(10000)])
slim = traced_bytes(lambda: [SlimTrip(i, 12.5) for i in range(10000)])
print(slim < plain, plain / slim > 1.2)
print(hasattr(Trip(1, 9.5), "__dict__"), hasattr(SlimTrip(1, 9.5), "__dict__"))
`,
        output: "True True\nTrue False\n",
        note: "`current` is the memory still allocated while `kept` holds the 10,000 objects. The slotted version uses about a third less here; the saving per object grows with the number of attributes.",
      },
      {
        kind: "error-example",
        title: "Slots refuse new attributes",
        code: src`
class SlimTrip:
    __slots__ = ("trip_id", "fare")

    def __init__(self, trip_id, fare):
        self.trip_id = trip_id
        self.fare = fare

trip = SlimTrip(16126, 40.8)
trip.tip = 10.7
`,
        error: "AttributeError",
        output: "",
        note: "`AttributeError: 'SlimTrip' object has no attribute 'tip' and no __dict__ for setting new attributes`. That is the trade: a fixed set of attributes in exchange for less memory.",
      },
      {
        kind: "text",
        md: "**When to use which:** `getsizeof` for a quick look at one object (remember it is shallow); tracemalloc snapshots to find which lines allocate (and `get_traced_memory()` for current and peak totals); `__slots__` only for classes with very many instances. **Mistakes to avoid:** believing a container's `getsizeof` is the memory of everything in it; measuring once on tiny data; and adding `__slots__` everywhere, which makes classes rigid for no measurable gain.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Slim down a sensor reading",
      prompt: "A weather station stores millions of `Reading` objects. Add `__slots__` naming its three attributes, and run it: the object should have no `__dict__` any more, and everything else still works.",
      spec: [
        ["Class", "`Reading(station, hour, temp_c)` with attributes `station`, `hour`, `temp_c`"],
        ["Rule", "no per-instance `__dict__`"],
      ],
      starter: src`
class Reading:
    def __init__(self, station, hour, temp_c):
        self.station = station
        self.hour = hour
        self.temp_c = temp_c

reading = Reading("USW00094728", 6, -2.8)
print(reading.station, reading.hour, reading.temp_c)
print(hasattr(reading, "__dict__"))
`,
      answer: src`
class Reading:
    __slots__ = ("station", "hour", "temp_c")

    def __init__(self, station, hour, temp_c):
        self.station = station
        self.hour = hour
        self.temp_c = temp_c

reading = Reading("USW00094728", 6, -2.8)
print(reading.station, reading.hour, reading.temp_c)
print(hasattr(reading, "__dict__"))
`,
      wrong: [
        {
          code: src`
class Reading:
    __slots__ = ("station", "hour")

    def __init__(self, station, hour, temp_c):
        self.station = station
        self.hour = hour
        self.temp_c = temp_c
`,
          fails: ["values", "slots"],
          why: "`temp_c` isn't in the slots, so setting it raises AttributeError",
        },
      ],
      hints: [
        "`__slots__` is a class attribute: a tuple of attribute names, written above `__init__`.",
        "Every attribute `__init__` sets must be listed, or setting it fails.",
        "List all three names as strings.",
      ],
      task: {
        checks: [
          { kind: "expr", id: "values", label: "Reading keeps its three values", show: "Reading('USW00094728', 6, -2.8)", expr: "_r = Reading('USW00094728', 6, -2.8)\nresult = [_r.station, _r.hour, _r.temp_c]", expected: py.list(py.str("USW00094728"), py.int(6), py.float(-2.8)) },
          { kind: "expr", id: "slots", label: "a Reading has no __dict__", hidden: true, expr: "result = hasattr(Reading('X', 0, 1.5), '__dict__')", expected: py.bool(false) },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The real size of a nested record",
        prompt: "`sys.getsizeof` is shallow, so it hides how big a parsed API response really is. Write `deep_size(obj)` that adds up `sys.getsizeof` of the object **and of everything it contains**: the items of lists, tuples and sets, and both the keys and the values of dictionaries, at any depth. Count each object once, even if it appears in several places.",
        spec: [
          ["Function", "`deep_size(obj)`"],
          ["Containers", "list, tuple, set, dict (keys and values); any other object counts only its own `getsizeof`"],
          ["Rule", "an object reached twice (same identity) is counted once"],
          ["Returns", "the total in bytes (the checker compares with `sys.getsizeof` sums on this machine)"],
        ],
        starter: src`
import sys

def deep_size(obj):
    return sys.getsizeof(obj)

record = {"order_id": "O100282", "items": [{"sku": "SPO-11681", "qty": 2}], "tags": ("gift",)}
print(deep_size(record) > sys.getsizeof(record))
`,
        answer: src`
import sys

def deep_size(obj):
    total = 0
    counted = {}
    stack = [obj]
    while stack:
        current = stack.pop()
        if id(current) in counted:
            continue
        counted[id(current)] = current
        total += sys.getsizeof(current)
        if isinstance(current, dict):
            for key, value in current.items():
                stack.append(key)
                stack.append(value)
        elif isinstance(current, (list, tuple, set)):
            for item in current:
                stack.append(item)
    return total

record = {"order_id": "O100282", "items": [{"sku": "SPO-11681", "qty": 2}], "tags": ("gift",)}
print(deep_size(record) > sys.getsizeof(record))
`,
        alternatives: [
          src`
import sys

def deep_size(obj, seen=None):
    if seen is None:
        seen = {}
    if id(obj) in seen:
        return 0
    seen[id(obj)] = obj
    size = sys.getsizeof(obj)
    if isinstance(obj, dict):
        for k, v in obj.items():
            size += deep_size(k, seen) + deep_size(v, seen)
    elif isinstance(obj, (list, tuple, set)):
        for item in obj:
            size += deep_size(item, seen)
    return size
`,
        ],
        wrong: [
          {
            code: src`
import sys

def deep_size(obj):
    total = sys.getsizeof(obj)
    if isinstance(obj, dict):
        for key, value in obj.items():
            total += deep_size(key) + deep_size(value)
    elif isinstance(obj, (list, tuple, set)):
        for item in obj:
            total += deep_size(item)
    return total
`,
            fails: ["shared"],
            why: "an object that appears in two places is counted twice",
          },
          {
            code: src`
import sys

def deep_size(obj):
    total = sys.getsizeof(obj)
    if isinstance(obj, dict):
        for value in obj.values():
            total += deep_size(value)
    elif isinstance(obj, (list, tuple, set)):
        for item in obj:
            total += deep_size(item)
    return total
`,
            fails: ["dict", "nested", "shared"],
            why: "dictionary keys are objects too, and they are left out",
          },
        ],
        hints: [
          "Walk the structure (a stack or recursion both work for normal data) and add `sys.getsizeof` of each object you reach.",
          "For a dictionary, push both keys and values; for a list, tuple or set, push its items.",
          "Remember the `id` of each object you have counted and skip it when you meet it again.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "flat",
              label: "deep_size() of a list adds its items",
              show: "deep_size([12.5, 40.8])",
              expr: "import sys as _s\n_x = [12.5, 40.8]\nresult = deep_size(_x) == _s.getsizeof(_x) + _s.getsizeof(_x[0]) + _s.getsizeof(_x[1])",
              expected: yes,
            },
            {
              kind: "expr",
              id: "dict",
              label: "deep_size() counts a dictionary's keys and values",
              show: "deep_size({'sku': 'SPO-11681'})",
              expr: "import sys as _s\n_k = 'sku'\n_v = 'SPO-11681'\n_d = {_k: _v}\nresult = deep_size(_d) == _s.getsizeof(_d) + _s.getsizeof(_k) + _s.getsizeof(_v)",
              expected: yes,
            },
            {
              kind: "expr",
              id: "nested",
              label: "deep_size() goes to any depth",
              hidden: true,
              expr: "import sys as _s\n_inner = (7, 8)\n_mid = [_inner]\n_outer = {'k': _mid}\nresult = deep_size(_outer) == sum(_s.getsizeof(_o) for _o in [_outer, 'k', _mid, _inner, 7, 8])",
              expected: yes,
            },
            {
              kind: "expr",
              id: "shared",
              label: "an object reached twice is counted once",
              hidden: true,
              expr: "import sys as _s\n_addr = {'city': 'Houston'}\n_c = [_addr, _addr]\nresult = deep_size(_c) == _s.getsizeof(_c) + _s.getsizeof(_addr) + _s.getsizeof('city') + _s.getsizeof('Houston')",
              expected: yes,
            },
            {
              kind: "expr",
              id: "plain",
              label: "a non-container counts only itself",
              hidden: true,
              expr: "import sys as _s\nresult = deep_size(3.5) == _s.getsizeof(3.5)",
              expected: yes,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Report the lines that grew the most",
        prompt: "A memory dashboard compares two tracemalloc snapshots and shows the worst lines. Write `biggest_growth(before, after, limit)`: return the line numbers of the (at most) `limit` lines whose memory grew the most between the snapshots, biggest growth first. Ignore lines that didn't grow.",
        spec: [
          ["Function", "`biggest_growth(before, after, limit)`"],
          ["before, after", "`tracemalloc` snapshots (from `take_snapshot()`)"],
          ["Returns", "a list of at most `limit` line numbers (ints), biggest `size_diff` first, only lines with `size_diff > 0`"],
        ],
        starter: src`
import tracemalloc

def biggest_growth(before, after, limit):
    return []

tracemalloc.start()
before = tracemalloc.take_snapshot()
fares = [12.5 * i for i in range(30000)]
after = tracemalloc.take_snapshot()
tracemalloc.stop()
print(biggest_growth(before, after, 1))
`,
        answer: src`
import tracemalloc

def biggest_growth(before, after, limit):
    lines = []
    for stat in after.compare_to(before, "lineno"):
        if stat.size_diff <= 0:
            continue
        lines.append(stat.traceback[0].lineno)
        if len(lines) == limit:
            break
    return lines

tracemalloc.start()
before = tracemalloc.take_snapshot()
fares = [12.5 * i for i in range(30000)]
after = tracemalloc.take_snapshot()
tracemalloc.stop()
print(biggest_growth(before, after, 1))
`,
        alternatives: [
          src`
def biggest_growth(before, after, limit):
    grown = [s for s in after.compare_to(before, "lineno") if s.size_diff > 0]
    grown = sorted(grown, key=lambda s: s.size_diff, reverse=True)
    return [s.traceback[0].lineno for s in grown[:limit]]
`,
        ],
        wrong: [
          {
            code: src`
def biggest_growth(before, after, limit):
    stats = after.statistics("lineno")
    return [stat.traceback[0].lineno for stat in stats[:limit]]
`,
            fails: ["order"],
            why: "`statistics` ranks lines by their total size in `after`, including memory that existed before, not by growth",
          },
          {
            code: src`
def biggest_growth(before, after, limit):
    stats = after.compare_to(before, "lineno")
    return [stat.traceback[0].lineno for stat in stats[:limit]]
`,
            fails: ["only-growth"],
            why: "lines whose memory shrank are reported as if they grew",
          },
        ],
        hints: [
          "`after.compare_to(before, \"lineno\")` already gives one entry per line, sorted by how much it changed.",
          "Each entry has `size_diff` (bytes gained, negative if it shrank) and `traceback[0].lineno`.",
          "Keep entries that grew, stop at `limit`, and return just their line numbers.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "order",
              label: "biggest_growth() ranks lines by how much they grew",
              show: "snapshots around a big and a small allocation, limit 2",
              expr: [
                "import tracemalloc as _tm",
                "def _work():",
                "    _tm.start()",
                "    old = [str(i) * 20 for i in range(40000)]",
                "    before = _tm.take_snapshot()",
                "    small = [i * 0.5 for i in range(3000)]",
                "    big = [{'n': i} for i in range(15000)]",
                "    after = _tm.take_snapshot()",
                "    _tm.stop()",
                "    first = _work.__code__.co_firstlineno",
                "    return [n - first for n in biggest_growth(before, after, 2)]",
                "result = _work()",
              ].join("\n"),
              expected: py.list(py.int(5), py.int(4)),
            },
            {
              kind: "expr",
              id: "limit",
              label: "biggest_growth() returns at most `limit` lines",
              hidden: true,
              expr: [
                "import tracemalloc as _tm",
                "def _work():",
                "    _tm.start()",
                "    before = _tm.take_snapshot()",
                "    a = [str(i) for i in range(20000)]",
                "    b = [i * 0.5 for i in range(20000)]",
                "    after = _tm.take_snapshot()",
                "    _tm.stop()",
                "    return len(biggest_growth(before, after, 1))",
                "result = _work()",
              ].join("\n"),
              expected: py.int(1),
            },
            {
              kind: "expr",
              id: "only-growth",
              label: "lines whose memory shrank are not reported",
              hidden: true,
              expr: [
                "import tracemalloc as _tm",
                "_tm.start()",
                "_gone = [str(i) * 10 for i in range(20000)]",
                "_before = _tm.take_snapshot()",
                "del _gone",
                "_after = _tm.take_snapshot()",
                "_tm.stop()",
                "result = [_n for _n in biggest_growth(_before, _after, 5) if _n == 3]",
              ].join("\n"),
              expected: py.list(),
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
import sys

small = [1] * 10
large = ["x" * 1000] * 10
print(sys.getsizeof(small) == sys.getsizeof(large))
`,
        choices: ["True", "False", "10", "1000"],
        answer: 0,
        why: "Both lists hold 10 references; `getsizeof` counts the slots, not the objects they point to.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a script measures `sys.getsizeof(rows)` for 100,000 parsed CSV rows (dictionaries) and gets about 800 KB. Why is the real memory use much higher?",
        choices: [
          "getsizeof counts the list's references, not the 100,000 dictionaries and their strings",
          "getsizeof rounds down to the nearest kilobyte",
          "the dictionaries are compressed until they are used",
          "getsizeof only works for numbers",
        ],
        answer: 0,
        why: "The list is just 100,000 references. Each dictionary, key and value is a separate object; tracemalloc (or a deep walk) measures them.",
      },
      {
        id: "q3",
        prompt: "Memory keeps rising during a nightly import. Which tool points at the line responsible?",
        choices: [
          "Two tracemalloc snapshots compared with compare_to(…, \"lineno\")",
          "sys.getsizeof on the main list",
          "Adding __slots__ to every class",
          "Calling gc.collect() in the loop",
        ],
        answer: 0,
        why: "Snapshots record which line allocated each block, so the comparison shows where the growth comes from. Fixes such as `__slots__` come after you know what to fix.",
      },
    ],
    review: [
      "`sys.getsizeof` is shallow: a container's own size, not its contents.",
      "tracemalloc snapshots + `compare_to(…, \"lineno\")` show which lines grew; `get_traced_memory()` gives current and peak.",
      "`__slots__` removes the per-object `__dict__`: less memory for many instances, but no new attributes.",
      "Next: what CPython does when it runs your code, bytecode and the GIL.",
    ],
  },

  // ------------------------------------------------------------------ PY-L36-05 GIL and interpreter
  {
    id: "PY-L36-05",
    version: 2,
    slug: "bytecode-and-the-gil",
    title: "The interpreter: bytecode and the GIL",
    lede: "CPython compiles your code to bytecode and executes it one instruction at a time, holding the Global Interpreter Lock. That explains why one line can be several steps, and why threads behave as they do.",
    focus: "Read a function's bytecode with dis, and explain what the GIL does and does not guarantee.",
    minutes: 22,
    objectives: [
      "Identify the interpreter and version with `sys.implementation`, `sys.version_info` and `platform`",
      "List a function's bytecode instructions with `dis.get_instructions`",
      "Explain the GIL, why `x += 1` is not atomic, and what free-threaded builds change",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "comp-if", "comparison", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "module-file", "nested-loop", "none-value", "part-attr", "print-call", "print-several", "print-text", "reassignment", "set-comp", "set-literal", "set-op", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "unquoted-name"],
    teaches: ["bytecode-dis", "gil-flag"],
    blocks: [
      {
        kind: "text",
        md: "\"Python\" is a language; the program that runs it is an **implementation**. The standard one, CPython, is written in C. Others exist (PyPy, MicroPython), and this browser runs CPython compiled to WebAssembly (Pyodide). `sys.implementation.name`, `sys.version_info` and `platform.python_implementation()` say which one you have, which matters because memory behaviour and threading differ between them.",
      },
      {
        kind: "example",
        title: "Which interpreter is this?",
        code: src`
import platform
import sys
import sysconfig

print(sys.implementation.name, sys.version_info[:2], platform.python_implementation())
print(sys.getswitchinterval())
print(sysconfig.get_config_var("Py_GIL_DISABLED"))
`,
        output: "cpython (3, 14) CPython\n0.005\n0\n",
        note: "This is CPython 3.14. The switch interval (5 ms) is how often a thread holding the GIL is asked to let another thread run. `Py_GIL_DISABLED` is `1` on a free-threaded build (such as `python3.13t`) and `0` here, a standard build with a GIL.",
      },
      {
        kind: "text",
        md: "CPython first **compiles** each function to **bytecode**: small instructions for its virtual machine, such as *load a value*, *add*, *store*. The `dis` module shows them. `dis.get_instructions(func)` yields one object per instruction with an `opname` and an `argval` (the name or constant it works on). Exact instruction names change between Python versions, so read them for their meaning, not their spelling.",
      },
      {
        kind: "example",
        title: "One line, many instructions",
        code: src`
import dis

def record_sale(totals, amount):
    totals["sales"] += amount

steps = [ins.opname for ins in dis.get_instructions(record_sale)]
print(steps)
print([ins.argval for ins in dis.get_instructions(record_sale) if ins.opname.startswith("LOAD")])
`,
        output: "['RESUME', 'LOAD_FAST_BORROW', 'LOAD_CONST', 'COPY', 'COPY', 'BINARY_OP', 'LOAD_FAST_BORROW', 'BINARY_OP', 'SWAP', 'SWAP', 'STORE_SUBSCR', 'LOAD_CONST', 'RETURN_VALUE']\n['totals', 'sales', 'amount', None]\n",
        note: "One `+=` line became a load of `totals[\"sales\"]` (the first `BINARY_OP` is the subscript), an addition (the second `BINARY_OP`), and a separate store (`STORE_SUBSCR`). These names are CPython 3.14's; 3.12 shows `BINARY_SUBSCR` for the first step, but every version has separate read, add and write steps.",
      },
      {
        kind: "text",
        md: "The **Global Interpreter Lock (GIL)** is a lock inside standard CPython: a thread must hold it to execute bytecode, so only one thread runs Python bytecode at a time. Every few milliseconds (the switch interval), and whenever a thread waits for I/O, the GIL can pass to another thread, **between** two instructions. So:\n\n- The GIL keeps CPython's own data (reference counts, lists, dictionaries) consistent, which is why a single `list.append` from two threads doesn't corrupt the list.\n- It does **not** make your read-modify-write steps atomic: another thread can run between the read and the write of `totals[\"sales\"] += amount`, and one sale is lost. That needs a lock (see Threading & Multiprocessing).\n- Threads still help with **waiting** (network, disk), because a waiting thread releases the GIL; they don't speed up **pure Python computation**, because only one thread computes at a time. Processes do (see Threading & Multiprocessing).\n\nCPython 3.13 added an optional **free-threaded** build without the GIL (PEP 703). It can run threads truly in parallel, which makes locks around shared data even more important.",
      },
      {
        kind: "text",
        md: "**When to look at bytecode:** to understand why an operation isn't atomic, to see which global names a function really touches, or to compare two ways of writing the same thing. **Mistakes to avoid:** relying on exact instruction names across versions; believing the GIL makes your own updates thread-safe; and expecting threads to make CPU-bound Python faster on a standard build.",
      },
    ],
    tryIt: {
      id: "try",
      title: "List only the stores",
      prompt: "`instruction_names` returns every instruction's name. Change it so it keeps only the instructions whose name starts with `\"STORE\"`, the steps that write somewhere, and run it.",
      spec: [
        ["Function", "`instruction_names(func)`"],
        ["Returns", "the `opname` of each instruction of `func` that starts with `\"STORE\"`, in order"],
        ["Example", "for `def f(x): y = x + 1; return y` → `['STORE_FAST']`"],
      ],
      starter: src`
import dis

def instruction_names(func):
    names = []
    for ins in dis.get_instructions(func):
        names.append(ins.opname)
    return names

def tip_total(fare, tip):
    total = fare + tip
    return total

print(instruction_names(tip_total))
`,
      answer: src`
import dis

def instruction_names(func):
    names = []
    for ins in dis.get_instructions(func):
        if ins.opname.startswith("STORE"):
            names.append(ins.opname)
    return names

def tip_total(fare, tip):
    total = fare + tip
    return total

print(instruction_names(tip_total))
`,
      wrong: [
        {
          code: src`
import dis

def instruction_names(func):
    names = []
    for ins in dis.get_instructions(func):
        if "STORE" in ins.opname:
            names.append(ins.argval)
    return names
`,
          fails: ["stores"],
          why: "it collects the stored names (`argval`), not the instruction names",
        },
      ],
      hints: [
        "Every instruction object has an `opname` text.",
        "Text has a `startswith` method.",
        "Append the name only when it starts with `\"STORE\"`.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "stores",
            label: "instruction_names() keeps the store instructions",
            show: "instruction_names(tip_total)",
            expr: "def _f(fare, tip):\n    total = fare + tip\n    return total\ndef _g(order):\n    order.status = 'shipped'\n    order['n'] = 1\nresult = [instruction_names(_f), instruction_names(_g)]",
            expected: py.list(py.list(py.str("STORE_FAST")), py.list(py.str("STORE_ATTR"), py.str("STORE_SUBSCR"))),
          },
          {
            kind: "expr",
            id: "none",
            label: "a function that stores nothing gives an empty list",
            hidden: true,
            expr: "def _h(a, b):\n    return a * b\nresult = instruction_names(_h)",
            expected: py.list(),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which shared names does a function write?",
        prompt: "Before running functions in threads, a reviewer wants to know which **shared** state each one writes: module-level globals and object attributes. Local variables are private to each call and don't matter. Write `shared_writes(func)` using `dis`.",
        spec: [
          ["Function", "`shared_writes(func)`"],
          ["Shared writes", "instructions named `STORE_GLOBAL` (a global) and `STORE_ATTR` (an attribute); their `argval` is the name"],
          ["Returns", "a sorted list of the distinct names written, e.g. `['orders_seen', 'status']`"],
        ],
        starter: src`
import dis

def shared_writes(func):
    return []

orders_seen = 0

def handle(order):
    global orders_seen
    orders_seen += 1
    order.status = "processed"
    note = "done"
    return note

print(shared_writes(handle))
`,
        answer: src`
import dis

def shared_writes(func):
    names = []
    for ins in dis.get_instructions(func):
        if ins.opname in ("STORE_GLOBAL", "STORE_ATTR") and ins.argval not in names:
            names.append(ins.argval)
    return sorted(names)

orders_seen = 0

def handle(order):
    global orders_seen
    orders_seen += 1
    order.status = "processed"
    note = "done"
    return note

print(shared_writes(handle))
`,
        alternatives: [
          src`
import dis

def shared_writes(func):
    found = {ins.argval for ins in dis.get_instructions(func) if ins.opname == "STORE_GLOBAL" or ins.opname == "STORE_ATTR"}
    return sorted(found)
`,
        ],
        wrong: [
          {
            code: src`
import dis

def shared_writes(func):
    names = []
    for ins in dis.get_instructions(func):
        if ins.opname.startswith("STORE") and ins.argval not in names:
            names.append(ins.argval)
    return sorted(names)
`,
            fails: ["returns", "locals"],
            why: "`STORE_FAST` writes a local variable, which isn't shared, but it is reported",
          },
          {
            code: src`
import dis

def shared_writes(func):
    names = []
    for ins in dis.get_instructions(func):
        if ins.opname == "STORE_GLOBAL":
            names.append(ins.argval)
    return sorted(names)
`,
            fails: ["returns", "repeat"],
            why: "attribute writes are missed, and a global written twice is listed twice",
          },
        ],
        hints: [
          "Walk `dis.get_instructions(func)` and look at each `opname`.",
          "Only two instruction names write shared state here; a local assignment is `STORE_FAST`.",
          "Collect each `argval` once and sort at the end.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "returns",
              label: "shared_writes() lists the globals and attributes a function writes",
              show: "shared_writes(handle)",
              expr: "_n = 0\ndef _handle(order):\n    global _n\n    _n += 1\n    order.status = 'processed'\n    note = 'done'\n    return note\nresult = shared_writes(_handle)",
              expected: py.list(py.str("_n"), py.str("status")),
            },
            {
              kind: "expr",
              id: "locals",
              label: "local variables are not reported",
              hidden: true,
              expr: "def _f(prices):\n    total = 0\n    for p in prices:\n        total += p\n    return total\nresult = shared_writes(_f)",
              expected: py.list(),
            },
            {
              kind: "expr",
              id: "repeat",
              label: "a name written several times is listed once",
              hidden: true,
              expr: "class _Acc:\n    pass\ndef _g(acc):\n    acc.total = 0\n    acc.count = 1\n    acc.total = 5\nresult = shared_writes(_g)",
              expected: py.list(py.str("count"), py.str("total")),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Spot read-modify-write on globals",
        prompt: "Threads lose updates when a function **reads a global and writes it back** (as `count += 1` does), because another thread can run in between. Write `race_candidates(funcs)`: given several functions that would run in threads, return the global names that some function both loads (`LOAD_GLOBAL`) and stores (`STORE_GLOBAL`).",
        spec: [
          ["Function", "`race_candidates(funcs)`"],
          ["funcs", "a list of functions"],
          ["Returns", "a sorted list of the distinct global names that at least one function both reads and writes; a global only read (like `print` or a constant) or only written doesn't count"],
        ],
        starter: src`
import dis

def race_candidates(funcs):
    return []

served = 0
last_customer = None
TAX = 0.0825

def serve(customer):
    global served, last_customer
    served += 1
    last_customer = customer
    print("served", customer, TAX)

print(race_candidates([serve]))
`,
        answer: src`
import dis

def race_candidates(funcs):
    risky = []
    for func in funcs:
        loaded = []
        stored = []
        for ins in dis.get_instructions(func):
            if ins.opname == "LOAD_GLOBAL":
                loaded.append(ins.argval)
            elif ins.opname == "STORE_GLOBAL":
                stored.append(ins.argval)
        for name in stored:
            if name in loaded and name not in risky:
                risky.append(name)
    return sorted(risky)

served = 0
last_customer = None
TAX = 0.0825

def serve(customer):
    global served, last_customer
    served += 1
    last_customer = customer
    print("served", customer, TAX)

print(race_candidates([serve]))
`,
        alternatives: [
          src`
import dis

def race_candidates(funcs):
    found = {}
    for func in funcs:
        reads = {i.argval for i in dis.get_instructions(func) if i.opname == "LOAD_GLOBAL"}
        writes = {i.argval for i in dis.get_instructions(func) if i.opname == "STORE_GLOBAL"}
        for name in reads.intersection(writes):
            found[name] = True
    return sorted(found)
`,
        ],
        wrong: [
          {
            code: src`
import dis

def race_candidates(funcs):
    loaded = []
    stored = []
    for func in funcs:
        for ins in dis.get_instructions(func):
            if ins.opname == "LOAD_GLOBAL":
                loaded.append(ins.argval)
            elif ins.opname == "STORE_GLOBAL":
                stored.append(ins.argval)
    risky = []
    for name in stored:
        if name in loaded and name not in risky:
            risky.append(name)
    return sorted(risky)
`,
            fails: ["split"],
            why: "it mixes reads and writes from different functions, so one function writing a name another only reads is flagged",
          },
          {
            code: src`
import dis

def race_candidates(funcs):
    risky = []
    for func in funcs:
        for ins in dis.get_instructions(func):
            if ins.opname == "STORE_GLOBAL" and ins.argval not in risky:
                risky.append(ins.argval)
    return sorted(risky)
`,
            fails: ["returns", "split"],
            why: "every global that is written is flagged, even one that is only assigned and never read back",
          },
        ],
        hints: [
          "Work one function at a time: collect what it loads and what it stores.",
          "A name is a candidate when the same function both loads it with `LOAD_GLOBAL` and stores it with `STORE_GLOBAL`.",
          "Gather candidates from every function without repeats, then sort.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "returns",
              label: "race_candidates() finds globals read and written by one function",
              show: "race_candidates([serve])",
              expr: "_served = 0\n_last = None\n_TAX = 0.0825\ndef _serve(c):\n    global _served, _last\n    _served += 1\n    _last = c\n    print('served', c, _TAX)\nresult = race_candidates([_serve])",
              expected: py.list(py.str("_served")),
            },
            {
              kind: "expr",
              id: "several",
              label: "candidates from several functions are combined",
              show: "race_candidates([add_sale, add_refund])",
              expr: "_sales = 0\n_refunds = 0\ndef _add_sale(x):\n    global _sales\n    _sales = _sales + x\ndef _add_refund(x):\n    global _refunds\n    _refunds -= x\nresult = race_candidates([_add_sale, _add_refund])",
              expected: py.list(py.str("_refunds"), py.str("_sales")),
            },
            {
              kind: "expr",
              id: "split",
              label: "a write in one function and a read in another is not a read-modify-write",
              hidden: true,
              expr: "_mode = 'test'\ndef _set_mode():\n    global _mode\n    _mode = 'live'\ndef _show():\n    return _mode.upper()\nresult = race_candidates([_set_mode, _show])",
              expected: py.list(),
            },
            {
              kind: "expr",
              id: "none",
              label: "no functions, no candidates",
              hidden: true,
              expr: "result = race_candidates([])",
              expected: py.list(),
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
import dis

def add_tip(total, tip):
    total += tip
    return total

names = [ins.opname for ins in dis.get_instructions(add_tip)]
print([n for n in names if n in ("BINARY_OP", "STORE_FAST")])
`,
        choices: ["['BINARY_OP', 'STORE_FAST']", "['STORE_FAST']", "['BINARY_OP']", "[]"],
        answer: 0,
        why: "`total += tip` is an addition (`BINARY_OP`) followed by a separate store into the local `total` (`STORE_FAST`): two steps, not one.",
      },
      {
        id: "q2",
        prompt: "A common mistake: \"CPython has a GIL, so `counter += 1` from several threads can't lose an update.\" What is wrong with that?",
        choices: [
          "The GIL can pass to another thread between the read and the write, which are separate instructions",
          "Nothing: the GIL makes every line atomic",
          "The GIL only exists on Windows",
          "`+=` on an int raises an error in threads",
        ],
        answer: 0,
        why: "The GIL guarantees one instruction at a time, not one line at a time. A read-modify-write spans several instructions, so it needs a lock.",
      },
      {
        id: "q3",
        prompt: "On standard CPython, which job is sped up by running it in several threads?",
        choices: [
          "Downloading 50 files, where each thread mostly waits for the network",
          "Computing 50 checksums in pure Python",
          "Sorting one large list",
          "Running a tight loop of arithmetic",
        ],
        answer: 0,
        why: "A thread waiting for I/O releases the GIL, so the waits overlap. Pure-Python computation holds the GIL, so threads take turns and don't finish sooner.",
      },
    ],
    review: [
      "`sys.implementation`, `sys.version_info` and `platform` say which interpreter runs your code.",
      "CPython runs bytecode; `dis.get_instructions` shows one line becoming several instructions.",
      "The GIL lets one thread run bytecode at a time and may switch between instructions: `x += 1` is not atomic.",
      "Next module: measuring speed (timeit, cProfile) and making programs faster.",
    ],
  },
];
